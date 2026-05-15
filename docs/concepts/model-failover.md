---
summary: "OpenClaw 如何轮换认证配置文件并在不同模型之间回退"
read_when:
  - 诊断认证配置文件轮换、冷却或模型回退行为
  - 更新认证配置文件或模型的故障转移规则
  - 了解会话模型覆盖如何与回退重试交互
title: "模型故障转移"
sidebarTitle: "模型故障转移"
---

OpenClaw 分两个阶段处理失败：

1. **当前提供方内的认证配置文件轮换**。
2. **模型回退**到 `agents.defaults.model.fallbacks` 中的下一个模型。

本文档解释了运行时规则以及支撑这些规则的数据。

## 运行流程

对于一次普通文本运行，OpenClaw 按以下顺序评估候选项：

<Steps>
  <Step title="解析会话状态">
    解析当前会话模型和认证配置文件偏好。
  </Step>
  <Step title="构建候选链">
    根据当前模型选择以及该选择来源的回退策略构建模型候选链。已配置的默认值、cron 任务主模型以及自动选择的回退模型可以使用已配置的回退；显式的用户会话选择是严格的。
  </Step>
  <Step title="尝试当前提供方">
    使用认证配置文件轮换/冷却规则尝试当前提供方。
  </Step>
  <Step title="在可故障转移错误时推进">
    如果该提供方因可故障转移错误而用尽，移动到下一个模型候选项。
  </Step>
  <Step title="持久化回退覆盖">
    在重试开始前持久化所选的回退覆盖，以便其他会话读取者看到运行器即将使用的相同提供方/模型。持久化的模型覆盖会标记为 `modelOverrideSource: "auto"`。
  </Step>
  <Step title="在失败时窄范围回滚">
    如果回退候选失败，则仅回滚仍与该失败候选匹配的、由回退持有的会话覆盖字段。
  </Step>
  <Step title="在用尽时抛出 FallbackSummaryError">
    如果每个候选都失败，则抛出带有每次尝试细节以及已知情况下最早冷却到期时间的 `FallbackSummaryError`。
  </Step>
</Steps>

这比“保存并恢复整个会话”要更窄。回复运行器只会持久化它为回退所拥有的模型选择字段：

- `providerOverride`
- `modelOverride`
- `modelOverrideSource`
- `authProfileOverride`
- `authProfileOverrideSource`
- `authProfileOverrideCompactionCount`

这可以防止一次失败的回退重试覆盖更新更晚的、无关的会话变更，例如运行尝试期间发生的手动 `/model` 变更或会话轮换更新。

## 选择来源策略

OpenClaw 将所选的提供方/模型与其被选择的原因分开。该来源决定是否允许回退链：

- **已配置的默认值**: `agents.defaults.model.primary` 使用 `agents.defaults.model.fallbacks`。
- **Agent 主项**: `agents.list[].model` 默认是严格的，除非该 agent 的 model 对象包含自己的 `fallbacks`。使用 `fallbacks: []` 可显式表明严格行为，或者提供一个非空列表，让该 agent 使用模型回退。
- **自动回退覆盖**: 运行时回退会在重试前写入 `providerOverride`、`modelOverride`、`modelOverrideSource: "auto"` 和所选的来源模型。该自动覆盖可以继续沿着已配置的回退链向下遍历，并会在 `/new`、`/reset` 和 `sessions.reset` 中清除。若未显式提供 `heartbeat.model`，心跳运行也会在其来源不再匹配当前已配置默认值时清除直接的自动覆盖。
- **用户会话覆盖**: `/model`、模型选择器、`session_status(model=...)` 和 `sessions.patch` 会写入 `modelOverrideSource: "user"`。这表示精确的会话选择。如果所选提供方/模型在返回回复前失败，OpenClaw 会报告失败，而不是从无关的已配置回退中作答。
- **旧版会话覆盖**: 较旧的会话条目可能只有 `modelOverride` 而没有 `modelOverrideSource`。OpenClaw 会将这些视为用户覆盖，因此显式的旧选择不会被静默转换为回退行为。
- **Cron 负载模型**: cron 作业的 `payload.model` / `--model` 是作业主项，而不是用户会话覆盖。它会使用已配置回退，除非作业提供了 `payload.fallbacks`；`payload.fallbacks: []` 会使 cron 运行保持严格。

## 认证存储（密钥 + OAuth）

OpenClaw 对 API 密钥和 OAuth 令牌都使用**认证配置文件**。

- 密钥存储在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（旧版：`~/.openclaw/agent/auth-profiles.json`）。
- 运行时认证路由状态存储在 `~/.openclaw/agents/<agentId>/agent/auth-state.json`。
- 配置 `auth.profiles` / `auth.order` 只是**元数据 + 路由**（不含密钥）。
- 仅用于旧版导入的 OAuth 文件：`~/.openclaw/credentials/oauth.json`（首次使用时会导入到 `auth-profiles.json` 中）。

更多详情：[OAuth](/concepts/oauth)

凭据类型：

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }`（某些提供方还会带有 `projectId`/`enterpriseUrl`）

## 配置文件 ID

OAuth 登录会创建不同的配置文件，以便多个账户可以共存。

- 默认：当没有可用邮箱时为 `provider:default`。
- 带邮箱的 OAuth：`provider:<email>`（例如 `google-antigravity:user@gmail.com`）。

配置文件位于 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 的 `profiles` 下。

## 轮换顺序

当一个提供方有多个配置文件时，OpenClaw 会按如下顺序选择：

<Steps>
  <Step title="显式配置">
    `auth.order[provider]`（如果已设置）。
  </Step>
  <Step title="已配置的配置文件">
    按 provider 过滤后的 `auth.profiles`。
  </Step>
  <Step title="已存储的配置文件">
    `auth-profiles.json` 中该 provider 的条目。
  </Step>
</Steps>

如果没有配置显式顺序，OpenClaw 会使用轮询顺序：

- **主键：** 配置文件类型（**OAuth 在 API 密钥之前**）。
- **次键：** `usageStats.lastUsed`（在每种类型内部，最早使用的优先）。
- **冷却/禁用的配置文件** 会被移到末尾，并按最早到期时间排序。

### 会话粘性（缓存友好）

OpenClaw 会**按会话锁定所选认证配置文件**，以保持提供方缓存处于热状态。它**不会**在每次请求时轮换。锁定的配置文件会被重复使用，直到：

- 会话被重置（`/new` / `reset`）
- 完成一次压缩（压缩计数递增）
- 该配置文件处于冷却/禁用状态

通过 `/model …@<profileId>` 进行的手动选择会为该会话设置一个**用户覆盖**，并且在新会话开始之前不会自动轮换。

<Note>
自动固定的配置文件（由会话路由器选中）被视为一种**偏好**：它们会先被尝试，但在速率限制/超时时，OpenClaw 可能会轮换到另一个配置文件。当原始配置文件再次可用时，新运行可以再次优先使用它，而无需更改所选模型或运行时。用户固定的配置文件会保持锁定到该配置文件；如果它失败且配置了模型回退，OpenClaw 会移动到下一个模型，而不是切换配置文件。
</Note>

### OpenAI Codex 订阅加 API 密钥备用

对于 OpenAI agent 模型，认证与运行时是分开的。`openai/gpt-*` 仍运行在
Codex harness 上，而认证可以在 Codex 订阅配置文件与
OpenAI API 密钥备用之间轮换。

为面向用户的顺序使用 `auth.order.openai`：

```json5
{
  auth: {
    order: {
      openai: ["openai-codex:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

现有的 Codex 订阅配置文件仍可能使用旧版
`openai-codex:*` 配置文件 ID。按顺序排列的 API 密钥备用可以是普通的
`openai:*` API 密钥配置文件。当订阅达到 Codex 使用限制时，
OpenClaw 会记录 Codex 提供的确切重置时间，尝试下一个
按顺序排列的认证配置文件，并继续保持运行在 Codex harness 中。等重置
时间过去后，订阅配置文件会再次变为可用，下一次自动
选择可以回到它。

仅当你希望为该会话强制使用某个账户/密钥时，才使用用户固定的配置文件。
用户固定的配置文件是故意设计为严格的，不会静默切换到
另一个配置文件。

## 冷却

当一个配置文件由于认证/速率限制错误（或看起来像速率限制的超时）而失败时，OpenClaw 会将其标记为冷却并移动到下一个配置文件。

<AccordionGroup>
  <Accordion title="进入速率限制 / 超时桶的内容">
    这个速率限制桶比单纯的 `429` 更宽：它还包括诸如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded`、`throttled`、`resource exhausted` 以及周期性的使用窗口限制（如 `weekly/monthly limit reached`）等提供方消息。

    格式/无效请求错误通常是终止性的，因为重试相同载荷会以同样方式失败，所以 OpenClaw 会直接呈现这些错误，而不是轮换认证配置文件。已知的重试修复路径可以显式启用：例如，Cloud Code Assist 工具调用 ID 验证失败会被清理并通过 `allowFormatRetry` 策略重试一次。类似 `Unhandled stop reason: error`、`stop reason: error` 和 `reason: error` 这样的 OpenAI 兼容 stop-reason 错误会被归类为超时/故障转移信号。

    当来源匹配已知的瞬态模式时，通用服务器文本也可能进入该超时桶。例如，裸的 pi-ai stream-wrapper 消息 `An unknown error occurred` 会被视为所有提供方都可故障转移，因为当提供方流在没有具体细节的情况下以 `stopReason: "aborted"` 或 `stopReason: "error"` 结束时，pi-ai 会输出它。带有瞬态服务器文本的 JSON `api_error` 负载，例如 `internal server error`、`unknown error, 520`、`upstream error` 或 `backend error`，也会被视为可故障转移的超时。

    仅在提供方上下文确实是 OpenRouter 时，像裸的 `Provider returned error` 这样的 OpenRouter 特定通用上游文本才会被视为超时。像 `LLM request failed with an unknown error.` 这样的通用内部回退文本会保持保守，不会自行触发故障转移。

  </Accordion>
  <Accordion title="SDK 重试后等待上限">
    某些提供方 SDK 可能会在把控制权交还给 OpenClaw 之前，先长时间休眠一个 `Retry-After` 窗口。对于基于 Stainless 的 SDK，例如 Anthropic 和 OpenAI，OpenClaw 默认会将 SDK 内部的 `retry-after-ms` / `retry-after` 等待上限设为 60 秒，并立即呈现更长的可重试响应，以便该故障转移路径可以运行。可使用 `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS` 调整或禁用该上限；参见[重试行为](/concepts/retry)。
  </Accordion>
  <Accordion title="按模型范围的冷却">
    速率限制冷却也可以按模型范围生效：

    - 当已知失败的模型 ID 时，OpenClaw 会为速率限制失败记录 `cooldownModel`。
    - 当冷却范围限定在不同模型上时，同一提供方上的兄弟模型仍可尝试。
    - 计费/禁用窗口仍会阻止整个配置文件在所有模型上的使用。

  </Accordion>
</AccordionGroup>

冷却使用指数退避：

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

## Billing 禁用

计费/信用失败（例如“credits 不足”/“信用余额过低”）会被视为值得故障转移的情况，但它们通常不是瞬时性的。OpenClaw 不会使用短暂冷却，而是将该配置文件标记为 **disabled**（采用更长的退避时间），然后轮换到下一个配置文件/提供商。

<Note>
并非所有看起来像计费问题的响应都是 `402`，也并非所有 HTTP `402` 都会进入这里。即使提供商返回的是 `401` 或 `403`，OpenClaw 也会将明确的计费文本保留在计费通道中，但提供商特定的匹配器仍然只作用于其所属的提供商（例如 OpenRouter `403 Key limit exceeded`）。

与此同时，临时性的 `402` 使用窗口和组织/工作区支出上限错误，如果消息看起来可重试，则会被归类为 `rate_limit`（例如 `weekly usage limit exhausted`、`daily limit reached, resets tomorrow`，或 `organization spending limit exceeded`）。这些情况会走短冷却/故障转移路径，而不是长计费禁用路径。
</Note>

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

默认值：

- 计费退避从 **5 小时** 开始，每次计费失败翻倍，最高 **24 小时**。
- 如果配置文件在 **24 小时** 内没有失败，退避计数会重置（可配置）。
- 过载重试在进入模型回退前，允许 **1 次同提供商配置文件轮换**。
- 过载重试默认使用 **0 ms** 退避。

## 模型回退

如果某个提供方的所有配置文件都失败了，OpenClaw 会切换到 `agents.defaults.model.fallbacks` 中的下一个模型。这适用于认证失败、速率限制以及耗尽配置文件轮换后的超时（其他错误不会推进回退）。没有暴露足够细节的提供商错误在回退状态中仍会被精确标记：`empty_response` 表示提供商没有返回可用消息或状态，`no_error_details` 表示提供商明确返回了 `Unknown error (no error details in response)`，而 `unclassified` 表示 OpenClaw 保留了原始预览，但当前还没有分类器匹配到它。

过载和速率限制错误的处理比计费冷却更激进。默认情况下，OpenClaw 允许一次同提供商认证配置文件重试，然后在不等待的情况下切换到下一个已配置的模型回退。诸如 `ModelNotReadyException` 之类的提供商繁忙信号会落入该过载桶。可通过 `auth.cooldowns.overloadedProfileRotations`、`auth.cooldowns.overloadedBackoffMs` 和 `auth.cooldowns.rateLimitedProfileRotations` 来调整。

当一次运行从已配置的默认主项、cron 作业主项、带有显式回退的 agent 主项，或自动选择的回退覆盖开始时，OpenClaw 可以沿着匹配的已配置回退链向下遍历。没有显式回退的 agent 主项，以及显式用户选择（例如 `/model ollama/qwen3.5:27b`、模型选择器、`sessions.patch`，或一次性的 CLI 提供商/模型覆盖）是严格的：如果该提供商/模型无法访问，或在生成回复前失败，OpenClaw 会报告失败，而不是从无关的回退中作答。

### 候选链规则

OpenClaw 会根据当前请求的 `provider/model` 以及已配置的回退构建候选列表。

<AccordionGroup>
  <Accordion title="规则">
    - 请求的模型始终排在第一位。
    - 显式配置的回退会去重，但不会按模型允许列表过滤。它们被视为明确的操作员意图。
    - 如果当前运行已经在同一提供商家族中的某个已配置回退上，OpenClaw 会继续使用完整的已配置链。
    - 当未提供显式回退覆盖时，即使请求的模型使用的是不同提供商，已配置的回退也会在已配置主项之前尝试。
    - 当回退运行器未收到显式回退覆盖时，已配置主项会被追加到末尾，这样在更早的候选项耗尽后，链可以回到正常默认项。
    - 当调用方提供 `fallbacksOverride` 时，运行器会精确使用请求的模型加上该覆盖列表。空列表会禁用模型回退，并阻止将已配置主项作为隐藏重试目标追加。

  </Accordion>
</AccordionGroup>

### 哪些错误会推进回退

<Tabs>
  <Tab title="继续执行">
    - 认证失败
    - 速率限制和冷却耗尽
    - 过载/提供商繁忙错误
    - 超时形态的故障转移错误
    - 计费禁用
    - `LiveSessionModelSwitchError`，它会被规范化为故障转移路径，这样过时的持久化模型就不会创建外层重试循环
    - 当仍有剩余候选项时，其他无法识别的错误

  </Tab>
  <Tab title="不继续执行">
    - 不是超时/故障转移形态的显式中止
    - 应保留在压缩/重试逻辑内部的上下文溢出错误（例如 `request_too_large`、`INVALID_ARGUMENT: input exceeds the maximum number of tokens`、`input token count exceeds the maximum number of input tokens`、`The input is too long for the model`，或 `ollama error: context length exceeded`）
    - 没有候选项时的最终未知错误

  </Tab>
</Tabs>

### 冷却跳过 vs 探测行为

当某个提供方的所有认证配置文件都已经处于冷却中时，OpenClaw 不会自动永远跳过该提供方。它会按每个候选项做决策：

<AccordionGroup>
  <Accordion title="逐候选项决策">
    - 持久性认证失败会立即跳过整个提供商。
    - 计费禁用通常会跳过，但主候选项仍可能在节流条件下被探测，以便无需重启也能恢复。
    - 主候选项可能会在接近冷却到期时被探测，并带有按提供商节流。
    - 即使处于冷却中，只要失败看起来是瞬时性的（`rate_limit`、`overloaded` 或未知），仍可尝试同提供商的回退兄弟项。这在速率限制是模型范围、而兄弟模型可能仍可立即恢复时尤其相关。
    - 瞬时冷却探测在每次回退运行中每个提供商最多一次，以免单个提供商拖慢跨提供商回退。

  </Accordion>
</AccordionGroup>

## 会话覆盖与实时模型切换

会话模型变更属于共享状态。活动运行器、`/model` 命令、压缩/会话更新，以及实时会话协调，都会读写同一个会话条目的部分内容。

这意味着回退重试必须与实时模型切换协同：

- 只有显式的用户驱动模型更改才会标记一个待处理的实时切换。这包括 `/model`、`session_status(model=...)` 和 `sessions.patch`。
- 系统驱动的模型更改，例如回退轮换、心跳覆盖或压缩，绝不会自行标记待处理的实时切换。
- 用户驱动的模型覆盖被视为回退策略中的精确选择，因此不可访问的所选提供商会直接暴露为失败，而不会被 `agents.defaults.model.fallbacks` 掩盖。
- 在回退重试开始之前，回复运行器会将所选回退覆盖字段持久化到会话条目中。
- 自动回退覆盖在后续轮次中会继续保持选中状态，这样 OpenClaw 就不会在每条消息上都探测一个已知有问题的主项。`/new`、`/reset` 和 `sessions.reset` 会清除自动来源的覆盖，并将会话恢复到已配置的默认值。
- `/status` 会显示所选模型，以及当回退状态不同时，当前活跃的回退模型和原因。
- 实时会话协调优先使用持久化的会话覆盖，而不是过时的运行时模型字段。
- 如果实时切换错误指向当前活跃回退链中的更晚候选项，OpenClaw 会直接跳到该所选模型，而不是先遍历无关候选项。
- 如果回退尝试失败，运行器只会回滚它写入的覆盖字段，并且仅在这些字段仍然与失败的候选项匹配时才回滚。

这可以避免经典竞态：

<Steps>
  <Step title="主项失败">
    所选主模型失败。
  </Step>
  <Step title="内存中选择了回退">
    回退候选项在内存中被选中。
  </Step>
  <Step title="会话存储仍然显示旧主项">
    会话存储仍然反映旧的主项。
  </Step>
  <Step title="实时协调读取到过时状态">
    实时会话协调读取了过时的会话状态。
  </Step>
  <Step title="重试被弹回">
    在回退尝试开始前，重试被弹回到旧模型。
  </Step>
</Steps>

持久化的回退覆盖关闭了这个窗口，而窄范围的回滚则保留了更新的手动或运行时会话变更。

## 可观测性与失败摘要

`runWithModelFallback(...)` 会记录每次尝试的详细信息，这些信息会进入日志以及面向用户的冷却消息中：

- 尝试的提供商/模型
- 原因（`rate_limit`、`overloaded`、`billing`、`auth`、`model_not_found`，以及类似的故障转移原因）
- 可选的状态/代码
- 人类可读的错误摘要

结构化的 `model_fallback_decision` 日志在候选项失败、被跳过或后续回退成功时，也会包含扁平的 `fallbackStep*` 字段。这些字段会明确记录尝试过渡（`fallbackStepFromModel`、`fallbackStepToModel`、`fallbackStepFromFailureReason`、`fallbackStepFromFailureDetail`、`fallbackStepFinalOutcome`），因此即使最终回退也失败，日志和诊断导出器仍然可以重建主失败信息。

当所有候选项都失败时，OpenClaw 会抛出 `FallbackSummaryError`。外层回复运行器可以利用它构建更具体的消息，例如“所有模型目前都被速率限制”，并在已知时包含最早的冷却到期时间。

该冷却摘要是模型感知的：

- 与尝试的提供商/模型链无关的模型范围速率限制会被忽略
- 如果剩余阻塞是一个匹配的模型范围速率限制，OpenClaw 会报告仍在阻塞该模型的最后一个匹配到期时间

## 相关配置

有关以下内容，请参见[网关配置](/gateway/configuration)：

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel` 路由

有关更广泛的模型选择和回退概览，请参见[模型](/concepts/models)。
