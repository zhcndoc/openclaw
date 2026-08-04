---
summary: "OpenClaw 上机引导的 CLI 参考（交互式引导）"
read_when:
  - 你想先建立推理，再使用 OpenClaw 完成设置
title: "引导"
---

# `openclaw onboard`

引导式设置会先建立推理：它会检测现有的 AI 访问权限，
要求一次有效的完成结果，只持久化可用的路径，然后启动
OpenClaw 以配置其余部分。`openclaw setup` 会在全新
系统上或存在引导选项时进入此流程；已配置的系统则使用
不带参数的 `openclaw setup` 进行系统代理聊天。`openclaw setup --baseline` 只会
写入基础配置/工作区。

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
openclaw onboard --tui
openclaw onboard --classic
openclaw onboard --modern
openclaw onboard --flow quickstart
openclaw onboard --flow manual
openclaw onboard --flow import
openclaw onboard --import-from hermes --import-source ~/.hermes
openclaw onboard --skip-bootstrap
openclaw onboard recommendations --json
openclaw onboard recommendations acknowledge
openclaw onboard recommendations acknowledge --retry "<failed-id>"
openclaw onboard recommendations refresh
openclaw onboard --mode remote --remote-url wss://gateway-host:18789
```

`openclaw onboard recommendations` 会读取在引导过程中存储的待处理应用推荐匹配项。添加 `--json` 可输出供首次启动引导使用的机器可读列表。该命令不会重新扫描已安装的应用，也不会调用模型。其输出仅包含已验证的安装 ID、来源和等级；它会刻意省略不受信任的市场文案、模型原因以及本地应用标签。推荐提议被答复后，该命令会返回空列表，后续的 onboarding 运行将完全跳过这一步。
`openclaw onboard recommendations refresh` 会清除已存储的提议，因此下一次 onboarding 运行会重新扫描已安装的应用并生成新的提议。

新的工作区会将推荐选择延后到引导对话中。
在该对话处理完用户选择后，
`openclaw onboard recommendations acknowledge` 会将已存储的提议标记为已答复。
该确认操作是幂等的。如果所选安装失败，请将每个失败的透明 ID 与 `--retry <id...>` 一起传入；成功和已拒绝的匹配会被消耗，而失败的匹配会保留待以后一次 onboarding 运行处理。未知 ID 会失败且不会更改已存储的提议。在一次中断的 ClawHub 技能安装之后，现有目标仅在
`openclaw skills verify "@owner/slug"` 对相同的
带发布者限定的推荐 ID 成功，并且其 JSON 输出报告
`openclaw.resolution.source: "installed"` 时，才算成功。仅有注册表验证并不能证明本地安装。否则请使用 `--retry` 保留该 ID 为待处理状态，不要覆盖现有技能。

- `--classic`：打开完整的逐步向导。它不能与 `--non-interactive` 组合使用；自动化设置时请省略 `--classic`。
- `--flow quickstart`：打开带最少提示的经典向导，默认使用令牌认证，并在没有已存储或显式凭据适用时生成令牌。显式的本地 Gateway 标志，例如 `--gateway-port`、`--gateway-bind`、`--gateway-auth` 和 `--tailscale`，会覆盖相应的已存储或默认 quickstart 值；省略的选项将保留其当前值。
- `--flow manual`（别名 `advanced`）：打开具有端口、绑定和认证完整提示的经典向导。
- `--flow import`：在全新设置上运行检测到的迁移提供程序（例如通过 `--import-from hermes` 使用 Hermes）。确认后，引导会将配置、凭据、工作区文件、内存和技能阶段性放入私有临时目标；导入后的推理必须先通过一次实时完成，工作区和代理状态才会提升并提交配置。如果在提升之前失败或取消，则不会触及当前实时目标。无法回滚的外部激活步骤（例如 Codex 插件安装）会在之后运行，并可在迁移报告中重试。如果已存在任何内容，请先重置配置、凭据、会话和工作区状态。使用 [`openclaw migrate`](/cli/migrate) 可进行 dry-run 计划、覆盖模式、已验证备份、报告以及精确映射。
- `--remote-url` 和 `--remote-token`：预填经典远程 Gateway 步骤并覆盖本次运行的已存储远程值。更改 URL 不会复用已存储凭据，除非你同时传入令牌。令牌在提示中保持遮罩，并遵循向导现有的明文或 SecretRef 存储选择。
- `--tailscale-reset-on-exit` 和 `--no-tailscale-reset-on-exit`：显式控制 Gateway 退出时是否重置 Tailscale Serve 或 Funnel 配置。两者都不提供时，在非交互式重复运行期间会保留当前设置。
- `--modern` 是 OpenClaw 对话式设置助手的兼容别名。它使用与 `openclaw setup` 相同的实时推理门控，并且仅接受 `--workspace`、`--accept-risk`、`--non-interactive` 和 `--json`。其他设置标志会被拒绝，而不会被静默忽略。

## 引导流程

直接运行 `openclaw onboard` 会启动引导式流程。它会显示安全提示，
然后先询问一个问题：**完全访问权限**（推荐 — 安装程序会自动查找
AI 应用、密钥和本地运行时）或 **先询问**（安装程序会先询问，
然后再查看，或者让你手动配置）。该选择会以 `wizard.accessMode` 持久保存。
在允许发现的情况下，引导会检测已通过已配置模型、API 密钥环境变量
和受支持的本地 CLI 可用的 AI 访问，然后使用真实补全测试推荐的候选项。
如果某个候选项失败，引导会静默尝试下一个可用项，并用一行文字概括
所有未响应的项；正在工作的路径会被宣布，并提供一个单键选项以改为查看
其他所有项。

如果自动检测已用尽，提供商选择器会首先显示 OpenAI、
Anthropic、xAI（Grok）、Google 和 OpenRouter。为所有其他受支持的提供商选择 **更多…**，
它们会按提供商分组；然后区域、计划和认证方式会
出现在第二个菜单中。受支持的浏览器或设备登录以及掩码
API 密钥或令牌方式使用相同的实时补全路径。OpenClaw 只会在测试成功后持久化
已验证的模型路由及其凭据；失败的候选项不会替换已配置的模型，也不会保存
尝试过的凭据。选择 **暂时跳过** 可在不启动 OpenClaw 的情况下退出，
并在准备好后重新运行 `openclaw onboard`。在 OpenClaw 启动之前，Workspace 和 Gateway 的设置保持
不变。

在引导模式下，`--workspace <dir>` 会提供 OpenClaw 建议的工作区
和隔离的推理上下文。在你批准 OpenClaw 安装提案之前，它不会被持久化。
经典和非交互式 onboarding 会通过其正常安装流程持久化工作区。
在已有 agent 编排重新运行时，onboarding 会保留已配置的 fleet 工作区：经典
向导会展示两条路径，并要求在移动它之前明确确认，
而非交互式安装会发出警告并保留当前值。

在推理通过后，onboarding 会检查受支持本地 AI 工具中的记忆：
Claude Code 自动记忆、Codex 合并记忆和 Hermes 记忆
文件。找到任何内容时，会提供一个页面，将它们复制到 agent 工作区中的
`memory/imports/` 以便索引回忆。未经确认不会导入任何内容，先前已导入的文件会被跳过，
并且你始终可以稍后从 Control UI 的[记忆导入页面](/web/control-ui)导入，
它提供相同的仅记忆范围。（完整的 [`openclaw migrate`](/cli/migrate) 运行范围更广：
它还可以导入配置、技能和凭据。）经典向导在准备好工作区后也会显示相同的页面。

在推理通过后（以及记忆导入提议之后），引导式 onboarding 会自动应用标准设置——
workspace、Gateway 和 sessions，这与对话式 `openclaw setup` 聊天在回答“yes”时应用的方案相同——
然后从已安装的应用中提供插件和技能推荐；应用名称会通过你配置的模型和 ClawHub 搜索进行匹配，
并且该步骤可以通过 [`wizard.appRecommendations`](/gateway/configuration-reference#wizard) 禁用。
在 macOS、Linux 或 Windows 桌面会话中，它随后会打开已认证的
Control UI 仪表盘，并等待最多 60 秒让浏览器客户端连接。
在无头 Linux 或通过 SSH 的情况下，它会打印一个醒目的、可复制粘贴的
仪表盘 URL，包括用于 loopback Gateway 的 SSH 端口转发命令，
并等待最多五分钟。连接成功后会在浏览器中继续；如果 Gateway 无法访问或超时，
则会回退到与之前相同的终端出口。传入 `--tui` 可跳过浏览器交接并强制使用该终端出口。
如果应用设置失败，引导会回退到对话式 OpenClaw
聊天以交互完成。频道、代理、
插件和其他可选功能仍属于 OpenClaw 聊天的范围：运行 `openclaw`
并使用 `open channel wizard for <channel>` 将频道凭据收集交给一个带掩码的终端向导。
要更改模型提供商或其认证方式，请退出 OpenClaw 并运行 `openclaw onboard`；
OpenClaw 不会打开引导式或经典的提供商流程。

在已配置的安装中，再次运行 `openclaw onboard` 会先验证当前
默认模型，因此同一流程也可作为验证和修复步骤——
它不会重新应用设置、重新安装或重启 Gateway 服务。
如果该检查失败，已配置的模型绝不会被自动替换——
onboarding 会停止并询问如何继续。该检查在你的
工作区之外运行，因此由工作区插件提供的模型可能在这里失败，但在 agent 中仍然可用。
对 provider-specific auth、channels、skills、
remote Gateway setup、imports 或完整 Gateway 控制，请使用 `openclaw onboard --classic`。对于对话式
非推理安装和修复，请运行 `openclaw setup`；`openclaw onboard
--modern` 是通过同一推理门的兼容别名。经典
向导可以选择用实时补全验证默认模型，但
OpenClaw 直到其自身的实时推理检查通过之前都不会启动。

在交互式终端中，直接执行 `openclaw`（不带子命令）会根据配置状态进行路由：

- 如果当前配置文件缺失或没有已编写的设置（为空或
  仅含元数据），则会启动引导式 onboarding。
- 如果配置文件存在但验证失败，则会启动经典
  onboarding 路径，并提供 `openclaw doctor` 指引。OpenClaw 需要可工作的
  推理能力，不会用于修复这一推理前状态。
- 如果配置文件有效，则会打开正常的 agent TUI。可访问且已配置的 Gateway
  与 agent 和 model 会直接进入该界面，无需 onboarding 或 OpenClaw。在已配置的安装中，通过
  TUI 内的 `/openclaw` 或 `openclaw setup` 进入 OpenClaw。

对于回环地址、私有 IP 字面量、`.local` 和 Tailnet `*.ts.net` 网关 URL，接受明文 `ws://`。对于其他受信任的私有 DNS 名称，请在入门过程的环境中设置 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`。

## 重置

```bash
openclaw onboard --reset
openclaw onboard --reset --reset-scope full
```

`--reset` 在运行设置之前清除状态。`--reset-scope` 控制清除范围：`config`（仅配置）、`config+creds+sessions`（当传入 `--reset` 但未指定范围时的默认值），或 `full`（同时重置工作区）。只有使用 `--reset-scope full` 时才会重置工作区。

## 语言环境

交互式引导会使用 CLI 向导语言环境来显示固定的设置文案。它按以下顺序使用第一个非空值：

1. `OPENCLAW_LOCALE`
2. `LC_ALL`
3. `LC_MESSAGES`
4. `LANG`
5. 英文回退

支持的向导语言环境为 `en`、`zh-CN` 和 `zh-TW`。语言环境值可以使用下划线或 POSIX 后缀形式，例如 `zh_CN.UTF-8`。产品名称、命令名称、配置键、URL、提供商 ID、模型 ID 以及插件/频道标签保持不变。

```bash
OPENCLAW_LOCALE=zh-CN openclaw onboard
OPENCLAW_LOCALE=en openclaw onboard # 明确覆盖为英文
```

## 非交互式设置

`--non-interactive` 需要 `--accept-risk`（表示理解代理功能非常强大，且拥有完整系统访问权限存在风险）。`--mode` 默认为 `local`。

```bash
openclaw onboard --non-interactive --accept-risk \
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

使用 `--secret-input-mode ref` 时，引导会将新凭据存储为由环境变量支持的引用，而不是明文：认证配置文件使用 `keyRef: { source: "env", provider: "default", id: <envVar> }`，自定义提供方使用 `models.providers.<id>.apiKey`（例如 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`）。添加新凭据时设置提供方环境变量；如果没有与内联密钥标志匹配的环境变量，操作会立即失败。现有的、可解析的命名认证配置文件及其 `env`、`file` 或 `exec` 引用会原样复用，不会写入新的 `apiKey` 或 `keyRef`，也不会添加额外的提供方环境变量。现有的明文配置文件凭据不会被迁移；请运行 `openclaw secrets configure --apply`，然后运行 `openclaw secrets audit --check`。请参阅[密钥管理](/gateway/secrets)。

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

- 除非你传入 `--skip-health`，否则引导在成功退出前会等待本地网关可达。
- `--install-daemon` 会先启动受管理的网关安装流程。若不使用它，本地网关必须已经在运行（例如 `openclaw gateway run`）。
- `--skip-health` 会跳过等待，适用于你在自动化中只想进行配置/工作区/引导写入。
- `--skip-bootstrap` 会设置 `agents.defaults.skipBootstrap: true`，并跳过创建 `AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md` 和 `BOOTSTRAP.md`。
- 在原生 Windows 上，`--install-daemon` 会先尝试计划任务；如果创建任务被拒绝，则回退到按用户的 Startup 文件夹登录项。

### 交互式引用模式

- 在提示时选择 **使用密钥引用**，然后选择 **环境变量** 或已配置的密钥提供方（`file` 或 `exec`）。
- 引导会在保存引用前执行快速预检验证，并允许你在失败时重试。

### Z.AI 端点选项

<Note>
`--auth-choice zai-api-key` 会为你的密钥自动检测最佳的 Z.AI 端点和模型：Coding Plan 端点优先使用 `zai/glm-5.2`（若不可用则回退到 `glm-5.1`）；通用 API 端点默认使用 `zai/glm-5.1`。若要强制使用 Coding Plan 端点，请直接选择 `zai-coding-global` 或 `zai-coding-cn`。
</Note>

```bash
# 无提示端点选择
openclaw onboard --non-interactive --accept-risk \
  --auth-choice zai-coding-global \
  --zai-api-key "$ZAI_API_KEY"

# 其他 Z.AI 端点选项：zai-coding-cn、zai-global、zai-cn
```

Mistral：

```bash
openclaw onboard --non-interactive --accept-risk \
  --auth-choice mistral-api-key \
  --mistral-api-key "$MISTRAL_API_KEY"
```

## 其他非交互式标志

基于 Token 的模型认证（与 `--auth-choice token` 一起使用）：

| Flag                            | Description                                                                                                                 |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `--token-provider <id>`         | 颁发该 token 的 token 提供方 ID                                                                                         |
| `--token <token>`               | 用于模型认证的 token 值                                                                                        |
| `--token-profile-id <id>`       | 认证配置文件 ID（默认 `<provider>:manual`；某些提供方自有流程使用其自己的默认值，例如 `anthropic:default`） |
| `--token-expires-in <duration>` | 可选的 token 过期时长（例如 `365d`、`12h`）                                                                         |

Cloudflare AI Gateway：`--cloudflare-ai-gateway-account-id <id>`、`--cloudflare-ai-gateway-gateway-id <id>`。

Daemon 安装控制：`--no-install-daemon` / `--skip-daemon`（别名；跳过 gateway 服务安装）、`--daemon-runtime <node>`。

技能：`--node-manager <npm|pnpm|bun>`（默认 `npm`）、`--skip-skills`。

UI 和 hook 设置：`--skip-ui`（跳过 Control UI/TUI 提示）、`--skip-hooks`（跳过 webhook/hook 设置）、`--skip-channels`、`--skip-search`。

输出：`--suppress-gateway-token-output` 会抑制带有 token 的 Gateway/UI 输出（token 提示、包含嵌入式 token 的自动登录 URL，以及自动启动 Control UI）——在共享终端和 CI 中很有用。

<Note>
`--json` 并不意味着在引导式或经典安装流程中进入非交互模式。
使用 `--modern` 时，JSON 只是一次性的 OpenClaw 概览，并会在该单一结果后退出。
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
