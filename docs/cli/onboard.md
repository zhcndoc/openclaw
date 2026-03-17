---
summary: "关于 `openclaw onboard`（交互式引导）的 CLI 参考"
read_when:
  - 希望获得关于网关、工作区、认证、频道和技能的引导设置
title: "onboard"
---

# `openclaw onboard`

本地或远程网关设置的交互式引导。

## 相关指南

- CLI 引导中心: [引导 (CLI)](/start/wizard)
- 引导概览: [引导概览](/start/onboarding-overview)
- CLI 引导参考: [CLI 设置参考](/start/wizard-cli-reference)
- CLI 自动化: [CLI 自动化](/start/wizard-cli-automation)
- macOS 引导: [引导 (macOS 应用)](/start/onboarding)

## 示例

```bash
openclaw onboard
openclaw onboard --flow quickstart
openclaw onboard --flow manual
openclaw onboard --mode remote --remote-url wss://gateway-host:18789
```

对于纯文本的私有网络 `ws://` 目标（仅限可信网络），请在引导过程环境中设置
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

`--custom-api-key` 在非交互模式下是可选的，若省略，引导程序会检查环境变量 `CUSTOM_API_KEY`。

非交互式 Ollama:

```bash
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --custom-base-url "http://ollama-host:11434" \
  --custom-model-id "qwen3.5:27b" \
  --accept-risk
```

`--custom-base-url` 默认为 `http://127.0.0.1:11434`。`--custom-model-id` 是可选的；如果省略，引导程序将使用 Ollama 推荐的默认值。像 `kimi-k2.5:cloud` 这样的云端模型 ID 也适用。

以引用形式存储提供商密钥而非纯文本：

```bash
openclaw onboard --non-interactive \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

使用 `--secret-input-mode ref` 时，引导向导会写入环境支持的引用而不是纯文本密钥。
对于认证配置文件支持的提供商，会写入 `keyRef` 条目；对于自定义提供商，则会写入 `models.providers.<id>.apiKey` 作为环境引用（例如 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`）。

非交互式 `ref` 模式约定：

- 在引导过程环境中设置提供商所需的环境变量（例如 `OPENAI_API_KEY`）。
- 不要传递内联密钥标志（例如 `--openai-api-key`），除非该环境变量也已设置。
- 如果传递了内联密钥标志但缺少必需的环境变量，引导程序会快速失败并提供指导。

非交互式模式下的网关令牌选项：

- `--gateway-auth token --gateway-token <token>` 存储纯文本令牌。
- `--gateway-auth token --gateway-token-ref-env <name>` 将 `gateway.auth.token` 存储为环境变量的 SecretRef。
- `--gateway-token` 与 `--gateway-token-ref-env` 互斥。
- `--gateway-token-ref-env` 需要引导过程环境中存在非空的环境变量。
- 使用 `--install-daemon` 时，当令牌认证需要令牌，SecretRef 管理的网关令牌会被验证，但不会以纯文本方式在 supervisor 服务环境元数据中持久化。
- 使用 `--install-daemon`，如果令牌模式需要令牌且配置的令牌 SecretRef 无法解析，则引导会关闭失败并提供修复指导。
- 使用 `--install-daemon`，如果同时配置了 `gateway.auth.token` 与 `gateway.auth.password` 且未设置 `gateway.auth.mode`，引导会阻止安装，直到明确设置模式。

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

非交互式本地网关健康检查：

- 除非传入 `--skip-health`，引导程序会等待可访问的本地网关后才成功退出。
- `--install-daemon` 会优先启动受管的网关安装路径。没有它时，必须已经有本地网关在运行，例如 `openclaw gateway run`。
- 如果只想在自动化中写入配置/工作区/启动文件，可以使用 `--skip-health`。
- 在原生 Windows 上，`--install-daemon` 会先尝试使用计划任务，如果任务创建失败，则回退到每用户启动文件夹登录项。

交互式引导中引用模式的行为：

- 当出现提示时选择 **使用密钥引用**。
- 之后选择以下其中之一：
  - 环境变量
  - 已配置的密钥提供者（`file` 或 `exec`）
- 引导会在保存引用前做快速的预校验。
  - 如果校验失败，引导会显示错误并允许重试。

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

- `quickstart`: 最少提示，自动生成网关令牌。
- `manual`: 完全提示端口/绑定/认证（别名为 `advanced`）。
- 本地引导 DM 范围行为：[CLI 设置参考](/start/wizard-cli-reference#outputs-and-internals)。
- 最快的首聊：`openclaw dashboard`（控制 UI，无频道设置）。
- 自定义提供商：连接任何兼容 OpenAI 或 Anthropic 的端点，
  包括未列出的托管提供商。使用 Unknown 自动检测。

## 常用后续命令

```bash
openclaw configure
openclaw agents add <name>
```

<Note>
`--json` 并不表示非交互模式。脚本执行请使用 `--non-interactive`。
</Note>
