---
summary: "通过 API 密钥或 OpenClaw 中的 setup-token 使用 Anthropic Claude"
read_when:
  - 您想在 OpenClaw 中使用 Anthropic 模型
  - 您想使用 setup-token 而非 API 密钥
title: "Anthropic"
---

# Anthropic（Claude）

Anthropic 构建了 **Claude** 模型家族，并通过 API 提供访问。
在 OpenClaw 中，您可以使用 API 密钥或 **setup-token** 进行身份验证。

## 选项 A：Anthropic API 密钥

**适用场景：** 标准 API 访问和基于使用计费。
请在 Anthropic 控制台创建您的 API 密钥。

### 命令行配置

```bash
openclaw onboard
# 选择：Anthropic API key

# 或非交互式方式
openclaw onboard --anthropic-api-key "$ANTHROPIC_API_KEY"
```

### 配置示例

```json5
{
  env: { ANTHROPIC_API_KEY: "sk-ant-..." },
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 思维默认值（Claude 4.6）

- 当未显式设置思考等级时，Anthropic Claude 4.6 模型在 OpenClaw 中默认采用 `adaptive`（自适应）思考。
- 您可以在每条消息中覆盖 (`/think:<level>`) 或在模型参数中设置：
  `agents.defaults.models["anthropic/<model>"].params.thinking`。
- 相关 Anthropic 文档：
  - [自适应思考](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
  - [扩展思考](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

## Fast 模式（Anthropic API）

OpenClaw 共享的 `/fast` 切换也支持直接使用 Anthropic API 密钥的流量。

- `/fast on` 映射为 `service_tier: "auto"`
- `/fast off` 映射为 `service_tier: "standard_only"`
- 配置默认值：

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-sonnet-4-6": {
          params: { fastMode: true },
        },
      },
    },
  },
}
```

重要限制：

- 仅限 **API 密钥**。Anthropic 的 setup-token / OAuth 认证不支持 OpenClaw 快速模式的层级注入。
- OpenClaw 仅对直接请求 `api.anthropic.com` 注入 Anthropic 服务层级。如果你通过代理或网关路由 `anthropic/*`，则 `/fast` 不会修改 `service_tier`。
- Anthropic 会在响应的 `usage.service_tier` 中报告实际使用的层级。对于没有优先层级容量的账户，即使设置了 `service_tier: "auto"`，也可能默认使用 `standard`。

## 提示缓存（Anthropic API）

OpenClaw 支持 Anthropic 的提示缓存功能。此功能**仅限 API**；订阅授权不支持缓存设置。

### 配置

在模型配置中使用 `cacheRetention` 参数：

| 值       | 缓存时长       | 说明                         |
| -------- | -------------- | ---------------------------- |
| `none`   | 不缓存         | 禁用提示缓存                 |
| `short`  | 5 分钟         | API 密钥认证默认值           |
| `long`   | 1 小时         | 延长缓存（需要 beta 标志）   |

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": {
          params: { cacheRetention: "long" },
        },
      },
    },
  },
}
```

### 默认值

使用 Anthropic API 密钥认证时，OpenClaw 会自动为所有 Anthropic 模型应用 `cacheRetention: "short"`（5 分钟缓存）。您可以通过在配置中显式设置 `cacheRetention` 来覆盖该默认值。

### 每个 agent 的 cacheRetention 覆盖

以模型级参数作为基础，然后通过 `agents.list[].params` 覆盖特定 agent。

```json5
{
  agents: {
    defaults: {
      model: { primary: "anthropic/claude-opus-4-6" },
      models: {
        "anthropic/claude-opus-4-6": {
          params: { cacheRetention: "long" }, // 大多数 agent 的基础配置
        },
      },
    },
    list: [
      { id: "research", default: true },
      { id: "alerts", params: { cacheRetention: "none" } }, // 仅此 agent 覆盖
    ],
  },
}
```

缓存相关参数的配置合并顺序：

1. `agents.defaults.models["provider/model"].params`
2. `agents.list[].params`（匹配 `id`，按键覆盖）

这样一个 agent 可以保持长时间缓存，另一个使用相同模型的 agent 可以禁用缓存，以避免高峰/低复用流量时的写入成本。

### Bedrock Claude 说明

- Bedrock 上的 Anthropic Claude 模型（如 `amazon-bedrock/*anthropic.claude*`）在配置时支持传递 `cacheRetention`。
- 非 Anthropic 的 Bedrock 模型在运行时强制设置为 `cacheRetention: "none"`。
- Anthropic API 密钥的智能默认也会为在 Bedrock 上的 Claude 模型引用种子设置 `cacheRetention: "short"`，当未显式设置值时适用。

### 旧参数

为了向后兼容，仍然支持旧的 `cacheControlTtl` 参数：

- `"5m"` 映射为 `short`
- `"1h"` 映射为 `long`

推荐迁移到新的 `cacheRetention` 参数。

OpenClaw 包含 Anthropic API 请求的 `extended-cache-ttl-2025-04-11` beta 标志；如果您覆盖了提供商头部（详见 [/gateway/configuration](/gateway/configuration)），请保留该标志。

## 1M 上下文窗口（Anthropic 测试版）

Anthropic 的 1M 上下文窗口处于测试版阶段。在 OpenClaw 中，可针对支持的 Opus/Sonnet 模型通过设置模型参数 `params.context1m: true` 来启用。

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": {
          params: { context1m: true },
        },
      },
    },
  },
}
```

OpenClaw 会将其映射为 Anthropic 请求中的 `anthropic-beta: context-1m-2025-08-07`。

此功能仅在模型显式设置 `params.context1m` 为 `true` 时激活。

要求：Anthropic 必须允许该凭证使用长上下文（通常是 API 密钥计费，或开启额外使用的订阅账户）。否则 Anthropic 将返回：
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`。

注意：当使用 OAuth/订阅令牌（`sk-ant-oat-*`）时，Anthropic 当前会拒绝带有 `context-1m-*` beta 的请求。OpenClaw 会自动跳过 OAuth 认证时的 context1m beta 头部，但保持所需的 OAuth beta。

## 选项 B：Claude setup-token

**适用场景：** 使用您的 Claude 订阅。

### 从何处获取 setup-token

Setup-token 由 **Claude Code CLI** 创建，而非 Anthropic 控制台。您可以在**任意机器**上运行：

```bash
claude setup-token
```

将生成的 token 粘贴到 OpenClaw（向导中选择：**Anthropic token（粘贴 setup-token）**），或者在网关主机上运行：

```bash
openclaw models auth setup-token --provider anthropic
```

如果您在另一台机器生成了 token，可以粘贴：

```bash
openclaw models auth paste-token --provider anthropic
```

### 命令行配置（setup-token）

```bash
# Paste a setup-token during setup
openclaw onboard --auth-choice setup-token
```

### 配置示例（setup-token）

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 备注

- Generate the setup-token with `claude setup-token` and paste it, or run `openclaw models auth setup-token` on the gateway host.
- If you see “OAuth token refresh failed …” on a Claude subscription, re-auth with a setup-token. See [/gateway/troubleshooting](/gateway/troubleshooting).
- Auth details + reuse rules are in [/concepts/oauth](/concepts/oauth).

## 故障排除

**401 错误 / 令牌突然无效**

- Claude 订阅认证可能过期或被吊销。请重新运行 `claude setup-token` 并粘贴至**网关主机**。
- 如果 Claude CLI 登录保存在另一台机器上，请在网关主机运行
  `openclaw models auth paste-token --provider anthropic`。

**找不到提供商 "anthropic" 的 API 密钥**

- 认证是**按 agent 分配**的。新建 agent 不会继承主 agent 的密钥。
- 重新执行该 agent 的引导配置，或在网关主机粘贴 setup-token/API 密钥，然后用 `openclaw models status` 验证。

**找不到配置文件 `anthropic:default` 的凭证**

- 运行 `openclaw models status` 查看当前激活的认证配置文件。
- 重新引导配置，或为该配置文件粘贴 setup-token/API 密钥。

**无可用认证配置文件（均处于冷却/不可用状态）**

- 使用 `openclaw models status --json` 查看 `auth.unusableProfiles`。
- 新增另一个 Anthropic 配置文件或等待冷却时间结束。

更多信息请见：[/gateway/troubleshooting](/gateway/troubleshooting) 和 [/help/faq](/help/faq)。
