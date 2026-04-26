---
summary: "关于 `openclaw onboard`（交互式引导）的 CLI 参考"
read_when:
  - 你需要为网关、工作区、认证、频道和技能进行引导式设置
title: "Onboard"
---

# `openclaw onboard`

本地或远程网关设置的交互式引导。

## 相关指南

- CLI 引导中心：[引导 (CLI)](/start/wizard)
- 引导概览：[引导概览](/start/onboarding-overview)
- CLI 引导参考：[CLI 设置参考](/start/wizard-cli-reference)
- CLI 自动化：[CLI 自动化](/start/wizard-cli-automation)
- macOS 引导：[引导 (macOS 应用)](/start/onboarding)

## 示例

```bash
openclaw onboard
openclaw onboard --flow quickstart
openclaw onboard --flow manual
openclaw onboard --skip-bootstrap
openclaw onboard --mode remote --remote-url wss://gateway-host:18789
```

对于明文私有网络 `ws://` 目标（仅限受信任网络），请在引导进程环境中设置
`OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`。
此客户端传输的紧急开关没有对应的 `openclaw.json` 配置项。

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

LM Studio 在非交互模式下也支持特定于提供商的密钥标志：

```bash
openclaw onboard --non-interactive \
  --auth-choice lmstudio \
  --custom-base-url "http://localhost:1234/v1" \
  --custom-model-id "qwen/qwen3.5-9b" \
  --lmstudio-api-key "$LM_API_TOKEN" \
  --accept-risk
```

非交互式 Ollama：

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

- `--gateway-auth token --gateway-token <token>` 存储明文令牌。
- `--gateway-auth token --gateway-token-ref-env <name>` 将 `gateway.auth.token` 存储为环境变量 SecretRef。
- `--gateway-token` 和 `--gateway-token-ref-env` 互斥。
- `--gateway-token-ref-env` 要求在引导过程环境中存在非空的环境变量。
- 使用 `--install-daemon` 时，当令牌认证需要令牌时，由 SecretRef 管理的网关令牌会被验证，但不会作为解析后的明文持久化在监督服务环境元数据中。
- 使用 `--install-daemon` 时，如果令牌模式需要令牌且配置的令牌 SecretRef 未解析，引导将失败并关闭，并提供修复指导。
- 使用 `--install-daemon` 时，如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未设置 `gateway.auth.mode`，引导将阻止安装，直到显式设置模式。
- 本地引导会将 `gateway.mode="local"` 写入配置。如果后续配置文件缺少 `gateway.mode`，应视为配置损坏或不完整的手动编辑，而不是有效的本地模式快捷方式。
- `--allow-unconfigured` 是一个独立的网关运行时逃生通道。这并不意味着引导可以省略 `gateway.mode`。

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

- 除非你传递 `--skip-health`，否则引导在成功退出前会等待一个可达的本地网关。
- `--install-daemon` 会先启动受管网关安装流程。若不使用它，你必须已经有一个本地网关在运行，例如 `openclaw gateway run`。
- 如果你只想在自动化中写入配置/工作区/启动信息，请使用 `--skip-health`。
- 如果你自己管理工作区文件，请传递 `--skip-bootstrap` 来设置 `agents.defaults.skipBootstrap: true`，并跳过创建 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 和 `BOOTSTRAP.md`。
- 在原生 Windows 上，`--install-daemon` 会先尝试计划任务，如果任务创建被拒绝，则回退到按用户级别的 Startup 文件夹登录项。

交互式引导中引用模式的行为：

- 当出现提示时选择 **使用密钥引用**。
- 之后选择以下其中之一：
  - 环境变量
  - 已配置的密钥提供者（`file` 或 `exec`）
- 引导会在保存引用前做快速的预校验。
  - 如果校验失败，引导会显示错误并允许重试。

非交互式 Z.AI 端点选择：

注意：`--auth-choice zai-api-key` 现在会自动检测最适合你密钥的 Z.AI 端点（优先使用通用 API 和 `zai/glm-5.1`）。
如果你特别想使用 GLM Coding Plan 端点，请选择 `zai-coding-global` 或 `zai-coding-cn`。

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

- `quickstart`：最少的提示，自动生成网关令牌。
- `manual`：关于端口/绑定/认证的完整提示（`advanced` 的别名）。
- 当认证选择暗示了首选提供商时，引导会将默认模型和允许列表选择器预过滤为该提供商。对于火山引擎和 BytePlus，这也匹配编程计划变体（`volcengine-plan/*`, `byteplus-plan/*`）。
- 如果首选提供商过滤器尚未产生任何加载的模型，引导将回退到未过滤的目录，而不是让选择器为空。
- 在网页搜索步骤中，某些提供商可能会触发特定于提供商的后续提示：
  - **Grok** 可以提供可选的 `x_search` 设置，使用相同的 `XAI_API_KEY` 和 `x_search` 模型选择。
  - **Kimi** 可能会询问 Moonshot API 区域（`api.moonshot.ai` 对比 `api.moonshot.cn`）以及默认的 Kimi 网页搜索模型。
- 本地引导 DM 范围行为：[CLI 设置参考](/start/wizard-cli-reference#outputs-and-internals)。
- 最快的首次聊天：`openclaw dashboard`（控制 UI，无需频道设置）。
- 自定义提供商：连接任何 OpenAI 或 Anthropic 兼容的端点，包括未列出的托管提供商。使用 Unknown 自动检测。

## 常用后续命令

```bash
openclaw configure
openclaw agents add <name>
```

<Note>
`--json` 并不表示非交互模式。脚本执行请使用 `--non-interactive`。
</Note>
