---
summary: "使用 OpenClaw 的 Qwen Portal provider id"
read_when:
  - 你想配置 qwen-oauth provider id
  - 你之前使用过 Qwen Portal OAuth 凭据
  - 你需要 Qwen Portal 端点或迁移指引
title: "Qwen OAuth / Portal"
---

`qwen-oauth` 是 Qwen Portal 的 provider id。它指向 Qwen Portal 端点，并通过一个独立的 provider id 让旧的 Qwen OAuth / portal 配置仍然可用。

当你明确拥有 `https://portal.qwen.ai/v1` 的当前 Qwen Portal token，或者你正在迁移旧的 Qwen Portal / Qwen CLI 配置并希望将这些凭据与标准的 Qwen Cloud provider 分开时，请使用此 provider。对于新的 Qwen 用户，它不是首选。

对于新的 Qwen Cloud 配置，建议使用 [Qwen](/providers/qwen) 和 Standard ModelStudio 端点，除非你明确拥有当前的 Qwen Portal token。

## Setup

通过引导流程提供你的 portal token：

```bash
openclaw onboard --auth-choice qwen-oauth
```

或者设置：

```bash
export QWEN_API_KEY="<your-qwen-portal-token>" # pragma: allowlist secret
```

## Defaults

- Provider: `qwen-oauth`
- Aliases: `qwen-portal`, `qwen-cli`
- Base URL: `https://portal.qwen.ai/v1`
- Env var: `QWEN_API_KEY`
- API style: OpenAI-compatible
- Default model: `qwen-oauth/qwen3.5-plus`

## How this differs from Qwen

OpenClaw 有两个面向 Qwen 的 provider id：

| Provider     | Endpoint family                                          | Best for                                                                               |
| ------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `qwen`       | Qwen Cloud / Alibaba DashScope and Coding Plan endpoints | 新的 API key 配置、Standard 按量计费、Coding Plan、多模态 DashScope 功能 |
| `qwen-oauth` | Qwen Portal endpoint at `portal.qwen.ai/v1`              | 现有的 Qwen Portal token 和旧版 Qwen OAuth / CLI 配置                         |

两个 provider 都使用兼容 OpenAI 的请求结构，但它们是彼此独立的认证面。为 `qwen-oauth` 存储的 token 不应被当作 DashScope 或 ModelStudio key；新的 DashScope key 应改用标准的 `qwen` provider。

## When to choose Qwen OAuth / Portal

- 你已经有可用的 Qwen Portal token。
- 你在迁移到 OpenClaw 的 provider model 时，希望保留旧的 Qwen OAuth 或 Qwen CLI 工作流。
- 你需要专门测试与 Qwen Portal 端点的兼容性。

对于新的 setup、更广泛的端点选择、Standard ModelStudio、Coding Plan，以及完整打包的 Qwen 目录，请选择 [Qwen](/providers/qwen)。

## Models

内置目录会为 Qwen Portal 默认值提供种子：

- `qwen-oauth/qwen3.5-plus`

可用性取决于当前的 Qwen Portal 账户和 token。如果你的账户改用 ModelStudio / DashScope API key，请配置标准的 `qwen` provider：

```bash
openclaw onboard --auth-choice qwen-standard-api-key
openclaw models set qwen/qwen3-coder-plus
```

## Migration

旧版 Qwen Portal OAuth profile 可能无法刷新。如果某个 portal profile 停止工作，请使用当前 token 重新认证，或者切换到标准的 Qwen provider：

```bash
openclaw onboard --auth-choice qwen-standard-api-key
```

Standard global ModelStudio 使用：

```text
https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

## Troubleshooting

- Portal OAuth 刷新失败：旧版 Qwen Portal OAuth profile 可能无法刷新。请使用当前 token 重新运行引导流程。
- 端点错误：在使用 portal token 时，请确认 model ref 以 `qwen-oauth/` 开头。仅在使用标准 Qwen provider 时才使用 `qwen/` refs。
- `QWEN_API_KEY` 混淆：两个 Qwen 页面都提到了这个 env var，但引导流程会将凭据存储在所选的 provider id 下。当你希望在同一台机器上同时保留 `qwen` 和 `qwen-oauth` 时，优先使用引导流程。

## Related

- [Qwen](/providers/qwen)
- [Alibaba Model Studio](/providers/alibaba)
- [Model providers](/concepts/model-providers)
- [All providers](/providers/index)
