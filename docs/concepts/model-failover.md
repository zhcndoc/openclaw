---
summary: "OpenClaw 如何轮换认证配置文件及在模型间回退"
read_when:
  - 诊断认证配置文件轮换、冷却时间或模型回退行为时
  - 更新认证配置文件或模型的故障切换规则时
title: "模型故障切换"
---

# 模型故障切换

OpenClaw 处理失败分为两个阶段：

1. 当前提供商内的**认证配置文件轮换**。
2. 向 `agents.defaults.model.fallbacks` 中的下一个模型进行**模型回退**。

本文档解释了运行时规则及其支持的数据。

## 认证存储（密钥 + OAuth）

OpenClaw 使用**认证配置文件**管理 API 密钥和 OAuth 令牌。

- 密钥存储在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（旧版路径：`~/.openclaw/agent/auth-profiles.json`）。
- 配置中的 `auth.profiles` / `auth.order` 仅包含**元数据和路由信息**（不含密钥）。
- 旧版仅导入的 OAuth 文件路径：`~/.openclaw/credentials/oauth.json`（首次使用时导入到 `auth-profiles.json`）。

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

当配置文件因认证失败、速率限制错误（或看似速率限制的超时）失败时，
OpenClaw 会将其标记为冷却状态，并切换到下一个配置文件。
格式错误/无效请求错误（例如 Cloud Code Assist 的调用 ID 验证失败）也视为可切换失败，
使用相同冷却规则。
OpenAI 兼容的停止原因错误如 `Unhandled stop reason: error`、
`stop reason: error` 和 `reason: error` 被分类为超时/切换信号。

冷却时间采用指数退避：

- 1 分钟
- 5 分钟
- 25 分钟
- 1 小时（上限）

状态存储在 `auth-profiles.json` 的 `usageStats` 下：

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

状态存储在 `auth-profiles.json` 中：

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

- 计费退避起始为**5 小时**，每次计费失败翻倍，最高到**24 小时**。
- 若配置文件 24 小时内未失败，退避计数重置（可配置）。

## 模型回退

如果某提供商的所有配置文件均失败，OpenClaw 会切换到
`agents.defaults.model.fallbacks` 中的下一个模型。
此规则适用于认证失败、速率限制和使用尽所有配置文件后的超时（其他错误不触发模型回退）。

若以模型覆盖方式启动（hooks 或 CLI），
回退仍会在尝试配置的回退模型后结束于 `agents.defaults.model.primary`。

## 相关配置

请参阅 [Gateway 配置](/gateway/configuration) 了解：

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel` 路由相关配置

请参阅 [模型](/concepts/models) 了解更广泛的模型选择与回退概览。
