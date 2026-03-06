---
summary: "`openclaw onboard` 命令行参考（交互式入门向导）"
read_when:
  - 希望获得关于网关、工作区、认证、频道和技能的引导设置
title: "onboard"
---

# `openclaw onboard`

交互式入门向导（本地或远程网关设置）。

## 相关指南

- CLI 入门中心：[入门向导（CLI）](/start/wizard)
- 入门概览：[入门总览](/start/onboarding-overview)
- CLI 入门参考：[CLI 入门参考](/start/wizard-cli-reference)
- CLI 自动化：[CLI 自动化](/start/wizard-cli-automation)
- macOS 入门：[入门（macOS 应用）](/start/onboarding)

## 示例

```bash
openclaw onboard
openclaw onboard --flow quickstart
openclaw onboard --flow manual
openclaw onboard --mode remote --remote-url wss://gateway-host:18789
```

对于纯文本的私有网络 `ws://` 目标（仅可信网络），请在入门过程环境中设置
`OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`。

非交互式自定义提供商示例：

```bash
openclaw onboard --non-interactive \
  --auth-choice custom-api-key \
  --custom-base-url "https://llm.example.com/v1" \
  --custom-model-id "foo-large" \
  --custom-api-key "$CUSTOM_API_KEY" \
  --secret-input-mode plaintext \
  --custom-compatibility openai
```

`--custom-api-key` 在非交互模式下是可选的，若省略，入门程序会检查环境变量 `CUSTOM_API_KEY`。

将提供商密钥作为引用存储，而非纯文本：

```bash
openclaw onboard --non-interactive \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

使用 `--secret-input-mode ref` 时，入门向导会写入环境支持的引用而不是纯文本密钥。
对于认证配置文件支持的提供商，写入 `keyRef` 条目；对于自定义提供商，则写入 `models.providers.<id>.apiKey` 作为环境引用（例如 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`）。

非交互式 `ref` 模式约定：

- 在入门过程环境中设置提供商所需的环境变量（例如 `OPENAI_API_KEY`）。
- 不要传递内联密钥标志（例如 `--openai-api-key`），除非该环境变量也已设置。
- 如果传递内联密钥标志但缺少必需的环境变量，入门会快速失败并提供指导。

非交互式模式下的网关令牌选项：

- `--gateway-auth token --gateway-token <token>` 存储纯文本令牌。
- `--gateway-auth token --gateway-token-ref-env <name>` 将 `gateway.auth.token` 存储为环境变量的 SecretRef。
- `--gateway-token` 与 `--gateway-token-ref-env` 互斥。
- `--gateway-token-ref-env` 需要入门过程环境中存在非空的环境变量。
- 使用 `--install-daemon` 时，当令牌认证需要令牌，SecretRef 管理的网关令牌会被验证，但不会以纯文本方式在 supervisor 服务环境元数据中持久化。
- 使用 `--install-daemon`，如果令牌模式需要令牌且配置的令牌 SecretRef 无法解析，则入门会关闭失败并提供修复指导。
- 使用 `--install-daemon`，如果同时配置了 `gateway.auth.token` 与 `gateway.auth.password` 且未设置 `gateway.auth.mode`，入门会阻止安装，直到明确设置模式。

示例：

```bash
export OPENCLAW_GATEWAY_TOKEN="your-token"
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice skip \
  --gateway-auth token \
  --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN \
  --accept-risk
```

交互式入门引用模式行为：

- 当出现提示时选择 **使用密钥引用**。
- 之后选择以下其中之一：
  - 环境变量
  - 已配置的密钥提供者（`file` 或 `exec`）
- 入门会在保存引用前做快速的预校验。
  - 若校验失败，入门会显示错误并允许重试。

非交互式 Z.AI 端点选择：

备注：`--auth-choice zai-api-key` 现会自动检测适合的 Z.AI 端点（优先通用 API 中的 `zai/glm-5`）。
如果需要指定 GLM 编程计划端点，可选择 `zai-coding-global` 或 `zai-coding-cn`。

```bash
# 无提示端点选择
openclaw onboard --non-interactive \
  --auth-choice zai-coding-global \
  --zai-api-key "$ZAI_API_KEY"

# 其他 Z.AI 端点选择：
# --auth-choice zai-coding-cn
# --auth-choice zai-global
# --auth-choice zai-cn
```

非交互式 Mistral 示例：

```bash
openclaw onboard --non-interactive \
  --auth-choice mistral-api-key \
  --mistral-api-key "$MISTRAL_API_KEY"
```

流程说明：

- `quickstart`：最少提示，自动生成网关令牌。
- `manual`：完全提示，配置端口/绑定/认证（`advanced` 的别名）。
- 本地入门 DM 范围行为详见：[CLI 入门参考](/start/wizard-cli-reference#outputs-and-internals)。
- 最快启动聊天：`openclaw dashboard`（控制界面，无需频道设置）。
- 自定义提供商：连接任意 OpenAI 或 Anthropic 兼容的端点，
  包括列表外的托管服务。使用 Unknown 自动检测。

## 常用后续命令

```bash
openclaw configure
openclaw agents add <name>
```

<Note>
`--json` 并不表示非交互模式。脚本执行请使用 `--non-interactive`。
</Note>
