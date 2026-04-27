---
summary: "OpenClaw 如何轮换认证配置文件及在模型间回退"
read_when:
  - 诊断认证配置文件轮换、冷却时间或模型回退行为
  - 更新认证配置文件或模型的故障切换规则
  - 了解会话模型覆盖如何与回退重试交互
title: "模型故障切换"
---

OpenClaw 分两个阶段处理失败：

1. 当前提供商内的**认证配置文件轮换**。
2. 向 `agents.defaults.model.fallbacks` 中的下一个模型进行**模型回退**。

本文档解释了运行时规则及其支持的数据。

## 运行时流程

对于正常的文本运行，OpenClaw 按以下顺序评估候选项：

1. 当前选定的会话模型。
2. 按顺序配置 `agents.defaults.model.fallbacks`。
3. 当运行从覆盖开始时，最后配置的主模型。

在每个候选项内部，OpenClaw 在前进到下一个模型候选项之前尝试认证配置文件故障切换。

高层序列：

1. 解析活动会话模型和认证配置文件偏好。
2. 构建模型候选链。
3. 使用认证配置文件轮换/冷却规则尝试当前提供商。
4. 如果该提供商因值得故障切换的错误而耗尽，移动到下一个模型候选项。
5. 在重试开始前持久化选定的回退覆盖，以便其他会话读取者看到运行器即将使用的相同提供商/模型。
6. 如果回退候选项失败，仅回滚仍匹配该失败候选项的回退拥有会话覆盖字段。
7. 如果每个候选项都失败，抛出 `FallbackSummaryError`，包含每次尝试的详情以及已知的最早冷却过期时间。

这故意比“保存并恢复整个会话”更窄。回复运行器仅持久化它拥有的模型选择字段用于回退：

- `providerOverride`
- `modelOverride`
- `authProfileOverride`
- `authProfileOverrideSource`
- `authProfileOverrideCompactionCount`

这防止失败的回退重试覆盖更新的无关会话变更，例如手动 `/model` 更改或在尝试运行期间发生的会话轮换更新。

## 认证存储（密钥 + OAuth）

OpenClaw 使用**认证配置文件**管理 API 密钥和 OAuth 令牌。

- 密钥存储在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（旧版：`~/.openclaw/agent/auth-profiles.json`）。
- 运行时认证路由状态存储在 `~/.openclaw/agents/<agentId>/agent/auth-state.json`。
- 配置 `auth.profiles` / `auth.order` 仅用于**元数据 + 路由**（不含密钥）。
- 仅用于导入的旧版 OAuth 文件：`~/.openclaw/credentials/oauth.json`（首次使用时导入到 `auth-profiles.json`）。

更多详情见：[/concepts/oauth](/concepts/oauth)

凭证类型：

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }`（部分提供商还包含 `projectId`/`enterpriseUrl`）

## 配置文件 ID

OAuth 登录会创建不同的配置文件，允许多个账户共存。

- 默认情况：无邮箱时为 `provider:default`。
- 有邮箱的 OAuth：`provider:<email>`（例如 `google-antigravity:user@gmail.com`）。

配置文件存储在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 的 `profiles` 下。

## 轮换顺序

当一个提供商有多个配置文件时，OpenClaw 按如下顺序选择：

1. **显式配置**：`auth.order[provider]`（如果设置了）。
2. **配置文件列表**：过滤 `auth.profiles` 中该提供商的配置文件。
3. **存储配置文件**：`auth-profiles.json` 中该提供商的条目。

如果没有显式顺序配置，OpenClaw 使用轮询顺序：

- **主键**：配置文件类型（**OAuth 优先于 API 密钥**）。
- **次键**：`usageStats.lastUsed`（每类型内最久未使用优先）。
- **冷却/禁用配置文件** 会被移动到末尾，按最早过期排序。

### 会话粘性（缓存友好）

OpenClaw **在每个会话内固定选择的认证配置文件**，以保持提供商缓存活跃。
不会在每次请求时轮换。固定的配置文件会一直被复用，直到：

- 会话被重置（`/new` / `/reset`）
- 压缩完成（压缩计数加一）
- 配置文件处于冷却或禁用状态

通过 `/model …@<profileId>` 手动选择可为该会话设置**用户覆盖**，
在新会话启动前不会自动轮换。

自动固定的配置文件（由会话路由器选择）被视作**偏好**：
它们优先尝试，但在遇到速率限制或超时时，OpenClaw 会切换到其他配置文件。
用户固定的配置文件保持锁定；若失败且配置了模型回退，
OpenClaw 会转向下一个模型，而非切换配置文件。

### 为何 OAuth 可能"看似丢失"

如果对同一提供商既有 OAuth 配置文件又有 API 密钥配置文件，轮询会在消息间切换，除非固定。要强制使用单个配置文件：

- 通过 `auth.order[provider] = ["provider:profileId"]` 固定，或
- 通过支持的 UI/聊天界面使用 `/model …` 的会话覆盖设置配置文件。

## 冷却时间

当配置文件因认证/速率限制错误（或看起来像速率限制的超时）失败时，OpenClaw 将其标记为冷却并移动到下一个配置文件。该速率限制桶比单纯的 `429` 更宽泛：它还包括提供商消息，如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded`、`throttled`、`resource exhausted`，以及周期性使用窗口限制，如 `weekly/monthly limit reached`。
格式/无效请求错误（例如 Cloud Code Assist 工具调用 ID 验证失败）被视为值得故障切换并使用相同的冷却。
OpenAI 兼容的停止原因错误，如 `Unhandled stop reason: error`、`stop reason: error` 和 `reason: error` 被分类为超时/故障切换信号。
提供商范围的通用服务器文本在源匹配已知瞬态模式时也可能落入该超时桶。例如，Anthropic bare `An unknown error occurred` 和 JSON `api_error` 负载，带有瞬态服务器文本如 `internal server error`、`unknown error, 520`、`upstream error` 或 `backend error` 被视为值得故障切换的超时。OpenRouter 特定的通用上游文本，如 bare `Provider returned error` 仅在提供商上下文实际上是 OpenRouter 时才被视为超时。通用内部回退文本如 `LLM request failed with an unknown error.` 保持保守，本身不触发故障切换。

某些提供商 SDK 否则可能会在将控制权交还给 OpenClaw 之前，长时间睡眠于 `Retry-After` 窗口。对于基于 Stainless 的 SDK，例如 Anthropic 和 OpenAI，OpenClaw 默认会将 SDK 内部的 `retry-after-ms` / `retry-after` 等待时间上限设为 60 秒，并立即暴露更长的可重试响应，以便此故障切换路径可以运行。可通过 `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS` 调整或禁用该上限；参见 [/concepts/retry](/concepts/retry)。

速率限制冷却也可以限定于模型范围：

- OpenClaw 在已知失败模型 id 时为速率限制失败记录 `cooldownModel`。
- 当冷却范围限定于不同模型时，同一提供商上的兄弟模型仍可被尝试。
- 计费/禁用窗口仍然跨模型阻止整个配置文件。

冷却时间采用指数退避：

- 1 分钟
- 5 分钟
- 25 分钟
- 1 小时（上限）

状态存储在 `auth-state.json` 的 `usageStats` 下：

```json
{
  "usageStats": {
    "provider:profile": {
      "lastUsed": 1736160000000,
      "cooldownUntil": 1736160600000,
      "errorCount": 2
    }
  }
}
```

## 计费禁用

计费/余额失败（如"余额不足"/"余额太低"）视为可切换失败，但通常非暂时性。
OpenClaw 不进行短暂冷却，而是将配置文件标记为**禁用**（长时间退避），并切换到下一个配置文件或提供商。

并非每个计费形状的响应都是 `402`，并非每个 HTTP `402` 都落在此处。即使提供商返回 `401` 或 `403`，OpenClaw 也将显式计费文本保留在计费通道中，但提供商特定的匹配器仍限定于拥有它们的提供商（例如 OpenRouter `403 Key limit exceeded`）。同时，临时 `402` 使用窗口和组织/工作区支出限制错误在消息看起来可重试时被分类为 `rate_limit`（例如 `weekly usage limit exhausted`、`daily limit reached, resets tomorrow` 或 `organization spending limit exceeded`）。这些保持在短冷却/故障切换路径上，而不是长计费禁用路径。

状态存储在 `auth-state.json` 中：

```json
{
  "usageStats": {
    "provider:profile": {
      "disabledUntil": 1736178000000,
      "disabledReason": "billing"
    }
  }
}
```

默认规则：

- 计费退避起始时间为 **5 小时**，每次计费失败翻倍，上限为 **24 小时**。
- 如果配置文件在 **24 小时** 内未失败，则退避计数器重置（可配置）。
- 过载重试允许在模型回退前进行 **1 次同一提供商的配置文件轮换**。
- 过载重试默认使用 **0 毫秒退避**。

## 模型回退

如果某提供商的所有配置文件均失败，OpenClaw 会切换到
`agents.defaults.model.fallbacks` 中的下一个模型。
此规则适用于认证失败、速率限制和使用尽所有配置文件后的超时（其他错误不触发模型回退）。

过载和速率限制错误比计费冷却处理得更积极。默认情况下，OpenClaw 允许一次同一提供商认证配置文件重试，然后切换到下一个配置模型回退而不等待。提供商繁忙信号如 `ModelNotReadyException` 落入该过载桶。使用 `auth.cooldowns.overloadedProfileRotations`、`auth.cooldowns.overloadedBackoffMs` 和 `auth.cooldowns.rateLimitedProfileRotations` 调整此行为。

当运行以模型覆盖开始时（hooks 或 CLI），回退在尝试任何配置的回退后仍结束于
`agents.defaults.model.primary`。

### 候选链规则

OpenClaw 从当前请求的 `provider/model` 加上配置的回退构建候选列表。

规则：

- 请求的模型始终排在第一位。
- 显式配置的回退被去重但不按模型允许列表过滤。它们被视作显式操作员意图。
- 如果当前运行已经在同一提供商家族中的配置回退上，OpenClaw 继续使用完整的配置链。
- 如果当前运行在与配置不同的提供商上，且该当前模型尚未成为配置回退链的一部分，OpenClaw 不会附加来自另一提供商的无关配置回退。
- 当运行从覆盖开始时，配置的主模型附加在末尾，以便一旦早期候选项耗尽，链可以稳定回正常默认值。

### 哪些错误推进回退

模型回退继续在以下情况发生：

- 认证失败
- 速率限制和冷却耗尽
- 过载/提供商繁忙错误
- 超时形状的故障切换错误
- 计费禁用
- `LiveSessionModelSwitchError`，被标准化为故障切换路径，以便过时的持久化模型不会创建外部重试循环
- 当仍有剩余候选项时的其他未识别错误

模型回退不在以下情况继续：

- 非超时/故障切换形状的显式中止
- 应保持在压缩/重试逻辑内的上下文溢出错误（例如 `request_too_large`、`INVALID_ARGUMENT: input exceeds the maximum number of tokens`、`input token count exceeds the maximum number of input tokens`、`The input is too long for the model` 或 `ollama error: context length exceeded`）
- 当没有剩余候选项时的最终未知错误

### 冷却跳过与探测行为

当提供商的每个认证配置文件都已处于冷却状态时，OpenClaw 不会自动永远跳过该提供商。它做出每个候选项的决定：

- 只有明确的用户驱动模型更改才会标记待处理的实时切换。这包括 `/model`、`session_status(model=...)` 和 `sessions.patch`。
- 系统驱动的模型更改，例如回退轮换、心跳覆盖或压缩，绝不会自行标记待处理的实时切换。
- 在回退重试开始之前，回复运行器会将选定的回退覆盖字段持久化到会话条目中。
- 实时会话协调优先使用持久化的会话覆盖，而不是过时的运行时模型字段。
- 如果实时切换错误指向活动回退链中的后续候选项，OpenClaw 会直接跳转到该选定模型，而不是先遍历无关候选项。
- 如果回退尝试失败，运行器仅回滚它写入的覆盖字段，且仅当它们仍与该失败的候选项匹配时。

## 会话覆盖和实时模型切换

会话模型更改是共享状态。活动运行器、`/model` 命令、压缩/会话更新和实时会话协调都会读取或写入同一会话条目的部分内容。

这意味着回退重试必须与实时模型切换协调：

- 只有明确的用户驱动模型更改才会标记待处理的实时切换。这包括 `/model`、`session_status(model=...)` 和 `sessions.patch`。
- 系统驱动的模型更改（例如回退轮换、心跳覆盖或压缩）永远不会自行标记待处理的实时切换。
- 在回退重试开始之前，回复运行器会将选定的回退覆盖字段持久化到会话条目中。
- 实时会话协调优先使用持久化的会话覆盖，而不是过时的运行时模型字段。
- 如果回退尝试失败，运行器仅回滚它写入的覆盖字段，且仅当它们仍与该失败的候选项匹配时。

这防止了经典的竞态条件：

1. 主模型失败。
2. 在内存中选择回退候选项。
3. 会话存储仍显示旧的主模型。
4. 实时会话协调读取过时的会话状态。
5. 重试在回退尝试开始之前被弹回旧模型。

持久化的回退覆盖关闭了该窗口，而窄范围回滚保持较新的手动或运行时会话更改完好无损。

## 可观察性和故障摘要

`runWithModelFallback(...)` 记录每次尝试的详细信息，用于提供日志和面向用户的冷却消息：

- 尝试的提供商/模型
- 原因（`rate_limit`、`overloaded`、`billing`、`auth`、`model_not_found` 以及类似的故障转移原因）
- 可选的状态/代码
- 人类可读的错误摘要

当每个候选项都失败时，OpenClaw 抛出 `FallbackSummaryError`。外部回复运行器可以使用它来构建更具体的消息，例如“所有模型暂时受到速率限制”，并在已知时包含最早的冷却过期时间。

该冷却摘要是模型感知的：

- 对于尝试的提供商/模型链，不相关的模型范围速率限制将被忽略
- 如果剩余的阻断是匹配的模型范围速率限制，OpenClaw 报告仍阻止该模型的最后一个匹配过期时间

## 相关配置

请参阅 [Gateway 配置](/gateway/configuration) 了解：

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel` 路由相关配置

请参阅 [模型](/concepts/models) 了解更广泛的模型选择与回退概览。
