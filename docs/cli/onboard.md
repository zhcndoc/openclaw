---
summary: "openclaw onboard 的 CLI 参考（交互式引导）"
read_when:
  - 你需要关于 gateway、workspace、auth、channels 和 skills 的引导式设置
title: "Onboard"
---

# `openclaw onboard`

用于本地或远程 Gateway 设置的交互式引导。

## 相关指南

<CardGroup cols={2}>
  <Card title="CLI onboarding hub" href="/start/wizard" icon="rocket">
    交互式 CLI 流程的演练。
  </Card>
  <Card title="Onboarding overview" href="/start/onboarding-overview" icon="map">
    OpenClaw 引导流程如何协同工作。
  </Card>
  <Card title="CLI setup reference" href="/start/wizard-cli-reference" icon="book">
    输出、内部机制以及逐步行为。
  </Card>
  <Card title="CLI automation" href="/start/wizard-cli-automation" icon="terminal">
    非交互式标志和脚本化设置。
  </Card>
  <Card title="macOS app onboarding" href="/start/onboarding" icon="apple">
    macOS 菜单栏应用的引导流程。
  </Card>
</CardGroup>

## 示例

```bash
openclaw onboard
openclaw onboard --modern
openclaw onboard --flow quickstart
openclaw onboard --flow manual
openclaw onboard --flow import
openclaw onboard --import-from hermes --import-source ~/.hermes
openclaw onboard --skip-bootstrap
openclaw onboard --mode remote --remote-url wss://gateway-host:18789
```

`--flow import` 使用插件拥有的迁移提供方，例如 Hermes。它只会在全新的 OpenClaw 设置上运行；如果存在现有配置、凭据、会话，或者 workspace memory/identity 文件，请先重置，或选择一个全新的设置后再导入。

`--modern` 会启动 Crestodian 的对话式引导预览。不使用
`--modern` 时，`openclaw onboard` 保持经典引导流程。

对于明文的私有网络 `ws://` 目标（仅限受信任网络），请在引导进程环境中设置
`OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`。这里没有对应的 `openclaw.json` 形式用于这种客户端传输
break-glass。

非交互式自定义提供方：

```bash
openclaw onboard --non-interactive \
  --auth-choice custom-api-key \
  --custom-base-url "https://llm.example.com/v1" \
  --custom-model-id "foo-large" \
  --custom-api-key "$CUSTOM_API_KEY" \
  --secret-input-mode plaintext \
  --custom-compatibility openai \
  --custom-image-input
```

`--custom-api-key` 在非交互式模式下是可选的。如果省略，引导会检查 `CUSTOM_API_KEY`。
OpenClaw 会自动将常见的视觉模型 ID 标记为支持图像输入。对于未知的自定义视觉 ID，请传入 `--custom-image-input`；或者使用 `--custom-text-input` 强制仅文本元数据。

LM Studio 在非交互式模式下也支持特定于提供方的 key 标志：

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

`--custom-base-url` 的默认值为 `http://127.0.0.1:11434`。`--custom-model-id` 是可选的；如果省略，引导会使用 Ollama 建议的默认值。像 `kimi-k2.5:cloud` 这样的云端模型 ID 在这里也适用。

将提供方密钥存储为引用而不是明文：

```bash
openclaw onboard --non-interactive \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

使用 `--secret-input-mode ref` 时，引导会写入基于环境变量的引用，而不是明文密钥值。
对于基于 auth-profile 的提供方，这会写入 `keyRef` 条目；对于自定义提供方，这会将 `models.providers.<id>.apiKey` 写为一个环境引用（例如 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`）。

非交互式 `ref` 模式契约：

- 在引导进程环境中设置提供方环境变量（例如 `OPENAI_API_KEY`）。
- 不要传入行内密钥标志（例如 `--openai-api-key`），除非该环境变量也已设置。
- 如果在未设置所需环境变量的情况下传入了行内密钥标志，引导会快速失败并给出指导。

非交互式模式下的 Gateway token 选项：

- `--gateway-auth token --gateway-token <token>` 会存储一个明文 token。
- `--gateway-auth token --gateway-token-ref-env <name>` 会将 `gateway.auth.token` 存储为一个环境 SecretRef。
- `--gateway-token` 与 `--gateway-token-ref-env` 互斥。
- `--gateway-token-ref-env` 需要在引导进程环境中存在一个非空环境变量。
- 使用 `--install-daemon` 时，当 token 认证需要 token，SecretRef 管理的 gateway token 会被验证，但不会作为解析后的明文持久化到 supervisor 服务环境元数据中。
- 使用 `--install-daemon` 时，如果 token 模式需要 token 且已配置的 token SecretRef 未解析，引导会以失败关闭的方式终止，并给出修复建议。
- 使用 `--install-daemon` 时，如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`，且 `gateway.auth.mode` 未设置，引导会阻止安装，直到显式设置 mode。
- 本地引导会将 `gateway.mode="local"` 写入配置。如果后续配置文件缺少 `gateway.mode`，应将其视为配置损坏或不完整的手动编辑，而不是有效的 local 模式快捷方式。
- `--allow-unconfigured` 是一个独立的 gateway 运行时逃生阀。它并不意味着引导可以省略 `gateway.mode`。

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

非交互式本地 gateway 健康检查：

- 除非你传入 `--skip-health`，否则引导在成功退出前会等待一个可达的本地 gateway。
- `--install-daemon` 会先启动受管理的 gateway 安装路径。不使用它时，你必须已经有一个本地 gateway 在运行，例如 `openclaw gateway run`。
- 如果你在自动化中只想写入配置/workspace/bootstrap，请使用 `--skip-health`。
- 如果你自己管理 workspace 文件，请传入 `--skip-bootstrap` 以设置 `agents.defaults.skipBootstrap: true`，并跳过创建 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 和 `BOOTSTRAP.md`。
- 在原生 Windows 上，`--install-daemon` 会先尝试计划任务（Scheduled Tasks），如果任务创建被拒绝，则回退到按用户级别的 Startup 文件夹登录项。

使用引用模式的交互式引导行为：

- 在提示时选择 **Use secret reference**。
- 然后选择以下任一项：
  - Environment variable
  - Configured secret provider (`file` or `exec`)
- 引导会在保存引用之前执行快速预检验证。
  - 如果验证失败，引导会显示错误并允许你重试。

### 非交互式 Z.AI 端点选择

<Note>
`--auth-choice zai-api-key` 会为你的 key 自动检测最佳的 Z.AI 端点（优先使用带 `zai/glm-5.1` 的通用 API）。如果你明确想使用 GLM Coding Plan 端点，请选择 `zai-coding-global` 或 `zai-coding-cn`。
</Note>

```bash
# 无提示的端点选择
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

## 流程说明

<AccordionGroup>
  <Accordion title="流程类型">
    - `quickstart`：最少提示，自动生成 gateway token。
    - `manual`：针对端口、绑定和认证的完整提示（`advanced` 的别名）。
    - `import`：运行检测到的迁移提供方，预览计划，然后在确认后应用。

  </Accordion>
  <Accordion title="提供方预过滤">
    当某个认证选择暗示了首选提供方时，引导会将默认模型和 allowlist 选择器预过滤到该提供方。对于 Volcengine 和 BytePlus，这也会匹配 coding-plan 变体（`volcengine-plan/*`、`byteplus-plan/*`）。

    如果首选提供方过滤结果目前没有已加载模型，引导会回退到未过滤的目录，而不是让选择器为空。

  </Accordion>
  <Accordion title="Web 搜索后续步骤">
    某些 web-search 提供方会触发特定于提供方的后续提示：

    - **Grok** 可以提供可选的 `x_search` 设置，使用相同的 `XAI_API_KEY` 和一个 `x_search` 模型选择。
    - **Kimi** 会询问 Moonshot API 区域（`api.moonshot.ai` vs `api.moonshot.cn`）以及默认的 Kimi web-search 模型。

  </Accordion>
  <Accordion title="其他行为">
    - 本地引导 DM 范围行为：[CLI setup reference](/start/wizard-cli-reference#outputs-and-internals)。
    - 最快的第一次聊天：`openclaw dashboard`（Control UI，无需 channel 设置）。
    - 自定义提供方：连接任何与 OpenAI 或 Anthropic 兼容的端点，包括未列出的托管提供方。使用 Unknown 可自动检测。
    - 如果检测到 Hermes 状态，引导会提供迁移流程。使用 [Migrate](/cli/migrate) 可进行 dry-run 计划、覆盖模式、报告以及精确映射。

  </Accordion>
</AccordionGroup>

## 常见后续命令

```bash
openclaw configure
openclaw agents add <name>
```

<Note>
`--json` 并不意味着非交互式模式。脚本请使用 `--non-interactive`。
</Note>
