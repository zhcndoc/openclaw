---
summary: "OpenClaw 上机引导的 CLI 参考（交互式引导）"
read_when:
  - 你想先建立推理能力，然后用 Crestodian 完成设置
title: "Onboard"
---

# `openclaw onboard`

引导式设置会先建立推理能力：它会检测现有的 AI 访问方式，
要求进行一次成功的实时补全，只持久化可工作的路由，然后启动
Crestodian 来配置其余部分。`openclaw setup` 是相同的入口点；
`openclaw setup --baseline` 只会写入基础配置/工作区。

<CardGroup cols={2}>
  <Card title="CLI 引导中心" href="/start/wizard" icon="rocket">
    交互式 CLI 流程演练。
  </Card>
  <Card title="引导概览" href="/start/onboarding-overview" icon="map">
    OpenClaw 引导流程如何协同工作。
  </Card>
  <Card title="CLI 设置参考" href="/start/wizard-cli-reference" icon="book">
    输出、内部机制以及逐步行为。
  </Card>
  <Card title="CLI 自动化" href="/start/wizard-cli-automation" icon="terminal">
    非交互式标志和脚本化设置。
  </Card>
  <Card title="macOS 应用引导" href="/start/onboarding" icon="apple">
    macOS 菜单栏应用的引导流程。
  </Card>
</CardGroup>

## 示例

```bash
openclaw onboard
openclaw onboard --classic
openclaw onboard --modern
openclaw onboard --flow quickstart
openclaw onboard --flow manual
openclaw onboard --flow import
openclaw onboard --import-from hermes --import-source ~/.hermes
openclaw onboard --skip-bootstrap
openclaw onboard --mode remote --remote-url wss://gateway-host:18789
```

- `--classic`：打开完整的逐步向导。它不能与
  `--non-interactive` 组合使用；自动化设置时请省略 `--classic`。
- `--flow quickstart`：打开带最少提示的经典向导，并
  自动生成一个网关令牌。
- `--flow manual`（别名 `advanced`）：打开带完整提示的经典向导，
  用于端口、绑定和认证。
- `--flow import`：运行检测到的迁移提供程序（例如通过 `--import-from hermes` 的 Hermes），预览计划，然后在确认后应用。导入仅在全新的 OpenClaw 设置上运行——如果已存在，请先重置配置、凭据、会话和工作区状态。对于干运行计划、覆盖模式、报告和精确映射，请使用 [`openclaw migrate`](/cli/migrate)。
- `--modern` 是 Crestodian 对话式设置助手的兼容别名。
  它使用与 `openclaw crestodian` 相同的实时推理门控，并且
  仅接受 `--workspace`、`--accept-risk`、
  `--non-interactive` 和 `--json`。其他设置标志会被拒绝，而不会
  被静默忽略。

## 引导流程

直接运行 `openclaw onboard` 会启动引导流程。它会显示安全提示，
检测已通过已配置模型、API 密钥
环境变量以及受支持的本地 CLI 可用的 AI 访问，然后用一次真实补全测试
推荐的候选项。如果该候选项失败，入门流程会显示
原因并自动尝试下一个可用候选项。

如果自动检测已用尽，请选择另一个已检测到的候选项，或在
已遮蔽提示中输入提供方 API 密钥。手动输入的密钥会通过相同的
实时补全路径进行测试。引导式入门
在某个候选项通过之前，不会提供 Crestodian 或跳过 AI 的退出方式。OpenClaw
只会在测试
成功后持久化经过验证的模型路由及其凭据；失败的候选项不会替换已配置的模型，也不会保存
所尝试的凭据。在 Crestodian 启动之前，Workspace 和 Gateway 的设置保持不变。

在引导模式下，`--workspace <dir>` 会提供 Crestodian 建议的工作区
和隔离的推理上下文。只有在你批准
Crestodian 设置提案后，它才会被持久化。经典和非交互式入门会通过其
正常的设置流程持久化工作区。

推理通过后，引导式入门会立即使用已验证的模型启动 Crestodian。
随后 Crestodian 可以配置工作区、Gateway、
频道、代理、插件和其他可选功能。在 Crestodian 中，使用
`open channel wizard for <channel>` 可将频道凭据收集交给
一个已遮蔽的终端向导。若要更改模型提供方或其认证方式，
请退出 Crestodian 并运行 `openclaw onboard`；Crestodian 不会打开引导式
或经典的提供方流程。

在已配置的安装中，再次运行 `openclaw onboard` 会先验证当前
默认模型，因此同一流程也可作为验证和修复步骤。
如果该检查失败，已配置的模型绝不会被自动替换——
入门流程会停止并询问如何继续。该检查在你的
工作区之外运行，因此由工作区插件提供的模型可能在此处失败，但仍能在代理中工作。
使用 `openclaw onboard --classic` 进行特定提供方的认证、频道、技能、
远程 Gateway 设置、导入或完整 Gateway 控制。对于以对话方式进行的
非推理设置和修复，运行 `openclaw crestodian`；`openclaw onboard
--modern` 是通过相同推理门禁的兼容别名。经典
向导可以选择性地通过一次真实补全来验证默认模型，但在其自身的实时推理检查通过之前，
Crestodian 不会启动。

在交互式终端中，直接执行 `openclaw`（不带子命令）会根据配置状态进行路由：

- 如果当前配置文件缺失或没有已编写的设置（为空或
  仅含元数据），则会启动引导式入门。
- 如果配置文件存在但验证失败，则会启动经典的
  入门路径，并提供 `openclaw doctor` 指引。Crestodian 需要可用的
  推理能力，且不会用于修复这种推理前状态。
- 如果配置文件有效，则会打开正常的代理 TUI。一个可达的、已配置的 Gateway，连同代理和模型，会直接进入该界面，而无需入门或 Crestodian。在已配置的安装中，可在 TUI 内使用 `/crestodian` 或运行 `openclaw crestodian` 进入 Crestodian。

对于回环地址、私有 IP 字面量、`.local` 和 Tailnet `*.ts.net` 网关 URL，接受明文 `ws://`。对于其他受信任的私有 DNS 名称，请在入门过程的环境中设置 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`。

## 重置

```bash
openclaw onboard --reset
openclaw onboard --reset --reset-scope full
```

`--reset` 在运行设置之前清除状态。`--reset-scope` 控制清除范围：`config`（仅配置）、`config+creds+sessions`（当传入 `--reset` 但未指定范围时的默认值），或 `full`（同时重置工作区）。只有使用 `--reset-scope full` 时才会重置工作区。

## Language Environment

For fixed setup text in the interactive guide, use CLI wizard localization. Parsing order:

1. `OPENCLAW_LOCALE`
2. `LC_ALL`
3. `LC_MESSAGES`
4. `LANG`
5. English fallback

Supported wizard locales are `en`, `zh-CN`, and `zh-TW`. Locale values can use underscores or POSIX suffix forms, for example `zh_CN.UTF-8`. Product names, command names, configuration keys, URLs, provider IDs, model IDs, and plugin/channel tags remain unchanged.

```bash
OPENCLAW_LOCALE=zh-CN openclaw onboard
```

## 非交互式设置

`--non-interactive` 需要 `--accept-risk`（表示理解代理功能非常强大，且拥有完整系统访问权限存在风险）。`--mode` 默认为 `local`。

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

`--custom-api-key` 是可选的；如果省略，引导会检查环境中的 `CUSTOM_API_KEY`。OpenClaw 会自动将常见的视觉模型 ID（GPT-4o/4.1/5.x、Claude 3/4、Gemini、Qwen-VL、LLaVA、Pixtral 以及类似模型）标记为支持图像输入。对于未知的自定义视觉 ID，请传入 `--custom-image-input`；或使用 `--custom-text-input` 强制仅文本元数据。对于支持 `/v1/responses` 但不支持 `/v1/chat/completions` 的 OpenAI 兼容端点，请使用 `--custom-compatibility openai-responses`；有效值为 `openai`（默认）、`openai-responses`、`anthropic`。

LM Studio 还提供了一个供应商特定的密钥标志：

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

使用 `--secret-input-mode ref` 时，引导会写入基于环境变量的引用，而不是明文密钥值：对于基于认证配置文件的提供方，这会写入 `keyRef: { source: "env", provider: "default", id: <envVar> }`；对于自定义提供方，这会以相同方式写入 `models.providers.<id>.apiKey`（例如 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`）。约定：在引导进程环境中设置提供方环境变量（例如 `OPENAI_API_KEY`），并且不要再传入内联密钥标志，除非该环境变量已设置——如果标志值与匹配的环境变量不一致，会快速失败并给出指导。

### 网关认证（非交互式）

- `--gateway-auth token --gateway-token <token>` 会存储明文令牌。`token` 是默认认证模式。
- `--gateway-auth token --gateway-token-ref-env <name>` 会将 `gateway.auth.token` 作为环境 SecretRef 存储。要求在引导进程环境中存在同名且非空的环境变量。
- `--gateway-token` 和 `--gateway-token-ref-env` 互斥。
- 使用 `--install-daemon` 时：由 SecretRef 管理的 `gateway.auth.token` 会被验证，但不会作为已解析的明文持久化到 supervisor 服务环境元数据中；如果该引用未解析，安装会以“关闭失败”方式终止，并给出修复指导。如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`，且 `gateway.auth.mode` 未设置，则安装会阻止继续，直到显式设置模式。
- 本地引导会将 `gateway.mode="local"` 写入配置。后续若配置文件缺少 `gateway.mode`，说明配置损坏或手动编辑不完整，而不是一个有效的本地模式快捷方式。
- 本地引导会安装所选设置路径所需的可下载插件（例如针对这些认证选项的 Codex 或 Copilot 运行时插件）。远程引导只会为远程 Gateway 写入连接信息——绝不会安装本地插件包。
- `--allow-unconfigured` 是 `openclaw gateway run` 的一个独立逃生通道；它不会让引导跳过 `gateway.mode`。

```bash
export OPENAI_API_KEY="your-provider-key"
export OPENCLAW_GATEWAY_TOKEN="your-token"
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --gateway-auth token \
  --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN \
  --accept-risk
```

### 本地网关健康检查

- 除非你传入 `--skip-health`，否则引导在成功退出前会等待可访问的本地网关。
- `--install-daemon` 会先启动受管网关安装路径。若不使用该选项，本地网关必须已经在运行（例如 `openclaw gateway run`）。
- 如果你只想在自动化中写入配置/工作区/初始化内容，`--skip-health` 会跳过等待。
- `--skip-bootstrap` 会设置 `agents.defaults.skipBootstrap: true`，并跳过创建 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 和 `BOOTSTRAP.md`。
- 在原生 Windows 上，`--install-daemon` 会先尝试计划任务，若任务创建被拒绝，则回退到按用户的 Startup 文件夹登录项。

### 交互式引用模式

- 在提示时选择 **使用密钥引用**，然后选择 **环境变量** 或已配置的密钥提供方（`file` 或 `exec`）。
- 引导会在保存引用前执行快速预检验证，并允许你在失败时重试。

### Z.AI 端点选项

<Note>
`--auth-choice zai-api-key` 会为你的密钥自动检测最佳的 Z.AI 端点和模型：Coding Plan 端点优先使用 `zai/glm-5.2`（若不可用则回退到 `glm-5.1`）；通用 API 端点默认使用 `zai/glm-5.1`。若要强制使用 Coding Plan 端点，请直接选择 `zai-coding-global` 或 `zai-coding-cn`。
</Note>

```bash
# 无提示的端点选择
openclaw onboard --non-interactive \
  --auth-choice zai-coding-global \
  --zai-api-key "$ZAI_API_KEY"

# 其他 Z.AI 端点选项：zai-coding-cn、zai-global、zai-cn
```

Mistral：

```bash
openclaw onboard --non-interactive \
  --auth-choice mistral-api-key \
  --mistral-api-key "$MISTRAL_API_KEY"
```

## 其他非交互式标志

基于 Token 的模型认证（与 `--auth-choice token` 一起使用）：

| Flag                            | Description                                                                                                                 |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `--token-provider <id>`         | 颁发该 token 的 token 提供方 id                                                                                         |
| `--token <token>`               | 用于模型认证的 token 值                                                                                        |
| `--token-profile-id <id>`       | 认证配置文件 id（默认 `<provider>:manual`；某些提供方自有流程使用其自己的默认值，例如 `anthropic:default`） |
| `--token-expires-in <duration>` | 可选的 token 过期时长（例如 `365d`、`12h`）                                                                         |

Cloudflare AI Gateway：`--cloudflare-ai-gateway-account-id <id>`、`--cloudflare-ai-gateway-gateway-id <id>`。

Daemon 安装控制：`--no-install-daemon` / `--skip-daemon`（别名；跳过 gateway 服务安装）、`--daemon-runtime <node>`。

技能：`--node-manager <npm|pnpm|bun>`（默认 `npm`）、`--skip-skills`。

UI 和 hook 设置：`--skip-ui`（跳过 Control UI/TUI 提示）、`--skip-hooks`（跳过 webhook/hook 设置）、`--skip-channels`、`--skip-search`。

输出：`--suppress-gateway-token-output` 会抑制带有 token 的 Gateway/UI 输出（token 提示、包含嵌入式 token 的自动登录 URL，以及自动启动 Control UI）——在共享终端和 CI 中很有用。

<Note>
`--json` 在引导式或经典 onboarding 中并不意味着非交互模式。
使用 `--modern` 时，JSON 只会输出一次 Crestodian 概览，然后在这单个结果之后退出。
其他脚本请使用 `--non-interactive`。
</Note>

## 提供方预筛选

当某个认证选择意味着一个首选提供方时，引导流程会将默认模型和允许列表选择器预筛选为该提供方的模型。该筛选也会匹配同一插件拥有的其他提供方，这涵盖了诸如 `volcengine`/`volcengine-plan` 和 `byteplus`/`byteplus-plan` 这样的编程计划变体。如果首选提供方筛选未能找到任何已加载模型，引导流程会回退到未筛选的目录，而不是让选择器保持空白。

## Web-search 后续步骤

某些 web-search 提供商会在 onboarding 过程中触发提供商特定的后续提示：

- **Grok** 可以提供可选的 `x_search` 设置，使用相同的 xAI 认证以及 `x_search` 模型选择。
- **Kimi** 可以询问 Moonshot API 区域（`api.moonshot.ai` vs `api.moonshot.cn`）以及默认的 Kimi web-search 模型。

## 其他行为

- 本地引导 DM 作用域行为：[CLI 设置参考](/start/wizard-cli-reference#outputs-and-internals)。
- 最快的首次聊天：`openclaw dashboard`（控制 UI，无需频道设置）。
- 自定义提供商：连接任何兼容 OpenAI 或 Anthropic 的端点，包括未列出的托管提供商。使用 **Unknown** 兼容性可通过实时探测自动检测。
- 如果检测到 Hermes 状态，引导会提供迁移流程（参见上面的 `--flow import`）。

## 常见后续命令

稍后使用 `openclaw configure` 进行有针对性的非推理更改，使用 `openclaw
channels add` 进行仅通道设置。对于模型提供商或认证路径更改，请改为运行
`openclaw onboard`。

```bash
openclaw channels add
openclaw configure
openclaw agents add <name>
```
