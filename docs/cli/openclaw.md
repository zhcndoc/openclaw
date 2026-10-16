---
summary: "用于推理支持的 OpenClaw 设置和修复助手的 CLI 参考和安全模型"
read_when:
  - "你已完成推理设置，并希望 OpenClaw 配置其余部分"
  - "你需要使用本地设置代理检查或修复 OpenClaw"
  - "你正在设计或启用消息通道救援模式"
title: "OpenClaw 设置代理"
---

# `openclaw setup`

OpenClaw 自带一个内置系统代理——它以“OpenClaw”的身份发言——用于本地设置、修复和配置（前称 Crestodian）。它仅会在有效默认模型完成一次真实轮次后启动。 全新安装会先建立推理；格式错误的配置会保留在经典 doctor 路径上。

## <a id="when-it-starts"></a> 它开始时

在没有子命令的情况下运行 `openclaw` 会根据配置状态进行路由：

- 配置缺失，或存在但没有已编写的设置（为空，或仅包含 `$schema`/`meta` 键）：启动带有实时 AI 验证的引导式入门流程。
- 配置存在但验证失败：启动经典入门流程，它会报告问题并引导你运行 `openclaw doctor`。
- 配置存在且有效：打开正常的代理 TUI。一个可达的、已配置的 Gateway，且其默认代理拥有模型时，会直接进入该 UI，而不会经过入门流程或 OpenClaw。你可以在 TUI 中使用 `/openclaw`，或直接运行 `openclaw setup`，稍后进入 OpenClaw。

运行 `openclaw setup` 首先实时测试配置的默认模型。过弯从 OpenClaw 开始。交互式失败会打开引导推理设置，并在候选人通过后将其移交给 OpenClaw。一次性、JSON 和其他非交互式请求失败，并指示在推理不可用时运行 [`openclaw onboard`](/cli/onboard)。 `openclaw --help`和`openclaw --version`保持正常的快速路径。

如果推理插件加载或所有者验证失败，则应用 OpenClaw 的错误编辑后，错误将包含根本原因。一次性文本和 JSON 输出保留了该详细信息以及入门指南。

非交互式的裸 `openclaw`（无 TTY）会直接退出并给出简短消息，而不是打印根级帮助：在全新安装或无效安装时，它会指向非交互式入门；在配置有效时，则会指向 `openclaw agent --local ...`。

`openclaw onboard --modern` 仍然是 OpenClaw 的兼容别名，但使用相同的推理门控：可用的推理会打开聊天界面，交互式失败会启动引导式推理设置，非交互式失败则会带着入门指引退出。`openclaw onboard --classic` 会打开完整的逐步向导。

## <a id="what-openclaw-shows"></a> OpenClaw 显示什么

交互式 OpenClaw 会打开与 `openclaw tui` 相同的 TUI shell，但使用 OpenClaw 聊天后端。启动问候会涵盖：

- 配置有效性和默认 agent
- OpenClaw 正在使用的已验证模型
- 首次启动检查网关可达性
- 下一步推荐的调试操作

它不会在启动时转储密钥，也不会为了启动而加载插件 CLI 命令。

使用 `status` 获取详细清单：配置路径、docs/source 路径、本地 CLI 检查、key/token 状态、代理、模型和网关详细信息。

OpenClaw 使用与常规代理相同的引用发现：在 Git 签出中，它指向本地 `docs/` 和源代码树；在 npm 安装中，它使用捆绑的文档和指向 [https://github.com/openclaw/openclaw](https://github.com/openclaw/openclaw), 的链接，并在文档不够时提供检查源的指导。

## <a id="examples"></a> 示例

```bash
openclaw
openclaw setup
openclaw setup --json
openclaw setup --message "models"
openclaw setup --message "validate config"
openclaw setup --message "setup workspace ~/path/to/work" --yes
openclaw setup --message "set default model openai/gpt-5.6" --yes
openclaw onboard --modern
```

在 OpenClaw TUI 中：

```text
status
health
doctor
validate config
setup
setup workspace ~/path/to/work
config set gateway.port 19001
config unset agents.defaults.fastModeDefault
config set-ref gateway.auth.token env OPENCLAW_GATEWAY_TOKEN
gateway status
configure gateway
open gateway wizard
restart gateway
agents
create agent work workspace ~/path/to/work
models
configure model provider
set default model openai/gpt-5.6
channels
channel info slack
connect slack
open channel wizard for slack
configure skills
configure web search
open search wizard
import memory
plugins list
plugins search slack
plugin install clawhub:openclaw-codex-app-server
talk to work agent
talk to agent for ~/path/to/work
audit
quit
```

## <a id="operations-and-approval"></a> 操作和审批

OpenClaw 使用类型化操作，而不是临时编辑配置。

对于 `config get`，引用包含点或括号的记录键，例如 `config get channels.modelByChannel.telegram["team.ops[west]"]`。在选择请求的路径之前，Config 会读取编辑敏感值。

只读操作立即运行：显示概述、列出代理、列出已安装的插件、搜索 ClawHub 插件、显示 model/backend 状态、运行 status/health 检查、检查网关可达性、在没有交互式修复的情况下运行 doctor、验证配置、显示审核日志路径。

启动引导式设置流程也会立即运行：通道设置（`connect telegram`）、工作区技能设置（`configure skills`）、网页搜索 provider 设置（`configure web search`）以及本地 Gateway 设置（`configure gateway`）。每个由配置支持的托管向导都会收集明确的回答并负责后续写入；完成后会追加审计条目并重新验证配置。需要安装插件的网页搜索 provider 只有在安装成功后才会写入配置——安装失败或超时会停止设置并报告错误，而不是声称 provider 已配置。

`configure gateway` 会引导你设置本地 Gateway 的端口、绑定地址、令牌或密码认证，以及 Tailscale 暴露。它会保存配置，但不会将其应用到正在运行的 Gateway，因为更改活动地址或凭据可能会断开设置聊天。聊天设置完成后说 `restart gateway`，或者在终端向导交接后运行 `openclaw gateway restart`。远程模式仅提供指导：若要进行全新设置，请使用 `openclaw onboard`；若要更改模式，请使用 `openclaw configure`。

`import memory` 是仅复制而不是配置写入。它会检测受支持的本地代理主目录，让您选择可用的源，并将新的内存文件复制到现有的默认代理工作区，而无需导入配置、凭据或技能。它需要完成入门引导并报告已确认的导入、无需导入的结果、提供程序故障以及某些文件可能已被复制的故障。无需重新启动网关。当您需要定位另一个代理或替换现有导入时，请使用 Control UI 的 [ 导入内存页面](/web/control-ui/settings#import-assistant-memory)。

在直接 OpenClaw 聊天中，持久性操作需要会话批准（或 `--yes` 用于一次性命令）：写入配置、`config set`、`config unset`、`config set-ref`、setup/onboarding 引导程序、更改默认模型、start/stop/restart 网关、创建代理并安装插件。

由常规代理委派的更改（包括来自消息传递通道的请求）遵循请求运行的有效 [ 会话权限策略 ](/gateway/permission-modes)。完全访问权限会自动应用确切的建议操作，包括当完全访问权限来自配置的默认值而不是显式会话模式时。来自消息传递通道的受限运行要求在发出请求的聊天中获得批准：具有本机批准卡的通道显示 **允许一次** 和 **Deny** 按钮，其他消息传递聊天会收到带有 `/approve <id> allow-once|deny` 回复的更改摘要。网络聊天和终端运行在 Control UI 或 OpenClaw 应用程序中决定，这也可以决定任何聊天的批准。在委托聊天中回复“是”不能授权更改；按钮或 `/approve` 命令执行此操作。拥有自己审批者设置的渠道决定谁可以审批；在其他地方，只有当前所有者 （`commands.ownerAllowFrom`） 才能批准 OpenClaw 更改。独立的文件系统和沙箱边界、工具策略以及以下操作限制仍然适用。主机还检查请求的运行和验证的推理路由是否仍然有效。交互式设置和座席切换仍然需要直接操作员会话；即使模型建议启动向导，委托聊天也无法启动向导。

当有人审查提案时，请求工具保持打开状态。 **允许一次**应用确切的提案并返回其应用结果； **Deny** 或到期返回未应用的结果，而不是让代理报告待处理的更改。如果没有决定，批准请求将在 10 分钟后过期。过期的请求无法获得批准：如果仍需要更改，请提交新的请求并通过上述控件之一进行批准。仅重试请求不会获得批准。

停止请求运行将取消其批准。延迟批准无法重新启动已关闭的运行。如果批准的更改无法完成，请在重试之前检查当前设置和 OpenClaw 状态；仅获得批准并不能确认更改已应用。

配置的代理可以要求 OpenClaw 通过其 `openclaw` 工具创建另一个代理。请求进入相同类型的创建代理操作和主机授权流程；任何批准摘要都会列出请求代理的名称。 OpenClaw仍然是执行者，并且授权创建记录请求代理作为新代理的创建者。

委托创建仍然与请求运行相关联。如果该运行在准备期间结束或失去权限，则 OpenClaw 在开始下一个持久写入之前停止。已经在进行的写入可能会完成，并且之前创建的工作区文件不会自动删除。从活动运行重试之前检查 `openclaw agents list`；当请求运行结束时，已完成创建的代理不会被删除。

doctor 修复在 OpenClaw 内不可用，因为它们可能会重写为当前会话提供支持的 provider、认证或默认代理推断路由。请退出 OpenClaw，并在终端中运行 `openclaw doctor --fix`。只读的 `doctor` 在 OpenClaw 内仍然可用。

新代理会继承已实时验证的默认推断路由。代理 id `openclaw` 和 `crestodian` 为系统代理保留，不能作为普通代理创建。已退役的 id 仍然被阻止，因此旧配置无法占用它。

`config set`、`config unset` 和 `config set-ref` 提出配置更改以供批准。使用 `config unset <path>` 删除创作的设置并应用其继承或运行时默认设置。设置代理使用 `config_unset` 与 `path` 进行相同的操作；将值设置为 `null` 不会将其删除。批准的写入使用现有的配置验证器和编写器。验证或写入错误将返回给助理以提出一项纠正建议，该建议需要重新批准。保存后报告失败。配置写入不会测试模型路由或 API 密钥是否有效。屏蔽的设置流程使密钥远离模型的上下文。如果您在聊天中粘贴 API 密钥或令牌，OpenClaw 会将其保存在 [ 共享秘密存储 ](/gateway/secrets/secret-store-and-egress#shared-secret-store) 中，使用 `store` SecretRef 将配置密钥指向它，并且不会回显它。粘贴的消息本身已经到达模型提供者和转录本； OpenClaw 屏蔽了稍后日志中的值以及从该点开始的输出。每次保存都会创建一个以配置密钥加上随机后缀命名的新条目（例如 `GATEWAY_REMOTE_TOKEN_3F9A0C1B7D2E4A68`），因此它永远不会接管另一个配置密钥、身份验证配置文件或对已删除条目的过时引用仍在使用的名称。 OpenClaw 永远不会覆盖或删除现有条目：替换密钥会在存储中留下其先前的条目。如果保存密钥后配置写入失败，则错误会命名保存的条目并说明配置密钥是否指向它。无论哪种方式都保留该条目，因为另一个配置密钥或身份验证配置文件可能已经使用它：修复错误并重用该条目，而不是再次粘贴该密钥，并且仅在没有任何内容使用它时才使用 `openclaw secrets store rm <NAME>` 删除该条目。对于环境存储，请使用 `config set-ref <path> env <ENV_VAR>`。 `set default model <provider/model>` 在保存之前仍会对路线进行实时测试。

插件安装保留其源限制。插件卸载拒绝支持主动推理路由的插件；退出 OpenClaw 并从终端运行 `openclaw plugins uninstall <id>`。

批准是用您自己的话给出的：明确的答复（“是”、“当然”、“继续”、“现在不”）从固定列表中解决。当配置的路由支持单独的完成调用时，其他回复只能根据您的消息和待处理的提案进行分类，而不能根据对话模型本身进行分类，因为对话模型无法自我批准。未保密或模棱两可的答复会使提案悬而未决，对话会再次询问。

### <a id="change-history"></a> 更改历史

“询问 OpenClaw”页面可以显示最近应用的系统代理操作、Doctor 迁移、设置和 CLI 配置写入以及对 `openclaw.json` 的手动编辑。配置日志会在网关监视时、OpenClaw-owned 写入期间或脱机编辑后下次启动时检测外部编辑。

历史记录存储在共享 `~/.openclaw/state/openclaw.sqlite` 数据库的 `diagnostic_events` 表中，位于 `system-agent-audit` 和 `config-audit` 范围下。每个范围都保留其最新的 50,000 条记录。不包括发现和只读操作。秘密永远不会出现在变革历史中；配置日志记录包含更改的路径而不是配置值，并且值比较使用受保护的指纹。

配置写入记录在提供时保留写入者的原始标签。即使控制台输出和运行时快照刷新被抑制，自动启动配置修复也会记录 `origin: "doctor"`。现有的未标记记录不会回填。

通道、网页搜索和本地 Gateway 设置可以作为托管对话运行，直到需要输入密钥为止。本地 OpenClaw TUI 不接受敏感的向导回答，因为终端聊天输入是可见的。它会立即提供 `open channel wizard`（携带所选通道）、`open search wizard` 或 `open gateway wizard`，将操作交接给受遮罩的终端向导；你也可以稍后运行 `openclaw channels add --channel <channel>` 或 `openclaw configure --section web` 或 `openclaw configure --section gateway`。

### <a id="switching-to-a-masked-terminal-wizard"></a> 切换到受遮罩的终端向导

本地聊天可以将控制权交给受遮罩的终端向导：

```text
open channel wizard for slack
channel info slack
open search wizard
open gateway wizard
```

`open channel wizard for <channel>` 会在聊天 TUI 关闭后打开受遮罩的通道设置。先使用 `channel info <channel>` 查看通道标签、设置状态、先决条件摘要和文档链接。`open search wizard` 的工作方式相同，用于网页搜索 provider 设置，会在聊天 TUI 关闭后打开受遮罩的搜索向导。`open gateway wizard` 会打开受遮罩的本地 Gateway 设置；完成后，运行 `openclaw gateway restart` 以应用已保存的设置。

`configure model provider` 会将您引导至 **设置 → 模型 → 连接提供商**，无需启动向导或更改配置。登录前检查连接的网关并在“设置”中选择“**System**”或代理范围，然后使用其中的控件登录。连接另一个提供商不会将其选择为活动模型或需要停止主机。模型选择是分开的；替换已在使用的提供商的凭据可能会影响工作。

## <a id="setup-bootstrap"></a> 设置引导

`setup` 在引导式入门已经建立推理之后，配置剩余的工作区和 Gateway 状态。它仅通过类型化的配置操作写入，并会先请求批准。

```text
setup
setup workspace ~/path/to/work
```

`setup` 会保留已验证的有效模型。它不会配置或替换推理。

委派设置仍然与通过配置、工作区和会话准备进行的请求运行相关联。如果该运行结束或失去权限，OpenClaw 将在开始下一个持续效果之前停止。早期完成的效果仍然存在，包括已完成创建的特工；设置可能仍不完整。检查 `openclaw agents list` 和 `status`，然后从活动运行中再次请求设置并批准新请求，或者直接在网关主机上使用 `openclaw setup` 完成。如果取消推迟了新命名代理的旧历史记录迁移，则下次网关启动时会重试；在同一个 state/config 上使用 `openclaw doctor --fix` 可以更快地完成它。

如果推理丢失或其实时检查失败，请保留 OpenClaw 并运行 `openclaw onboard`。引导式入门首先尝试配置的模型，然后尝试经过身份验证的订阅 CLI、API 密钥以及其余受支持的 CLI；它要求每个候选人提供真实的答复，并且仅保留一条经过的路线。 OpenClaw 在该边界之后立即启动，然后可以配置工作区、网关、通道、代理、插件和其他可选功能。

当 macOS 应用程序到达默认代理已配置模型的已配置网关时，它完全跳过此阶梯；它打开普通代理UI。对于新的或不完整的网关，该应用程序通过 `openclaw.setup.detect` 和 `openclaw.setup.activate` 网关方法驱动推理阶梯：检测列出它找到的每个候选后端，激活对一个候选者进行实时测试（真正的“用 OK 回复”完成），并且仅在测试通过后保留该路由所需的模型、凭证和 provider/runtime 状态。 OpenClaw 保留工作区和网关默认值。失败的候选人永远不会改变配置；该应用程序会自动沿着梯子走下去，最后提供一个手动 key/token 步骤，该步骤由网关的活动文本推理提供程序插件填充。所选提供者拥有其启动器模型和配置，并且在保存凭证之前以相同的方式验证凭证。

Codex 监督和其他可选插件功能仍然置于此推理激活事务之外。只有在推理正常工作且 OpenClaw 已启动之后，才配置它们；在推理设置期间，现有的插件策略和显式的监督退出选项都会保持不变。

## <a id="ai-conversation"></a> AI 对话

OpenClaw 的自由形式对话与常规 OpenClaw 代理运行在同一个代理循环中，仅受一个零环 OpenClaw 权威工具 `openclaw` 的限制，该工具封装了类型化操作。读取操作可自由执行，修改操作则需要你对该确切操作进行会话批准（参见“操作与批准”），而且每一次已应用的写入都会被审计并重新验证。代理会话会持续存在，因此 OpenClaw 具备真正的多轮记忆。如果已验证的推理路径之后停止工作，请返回 `openclaw onboard` 并先修复它，再继续。

失败或超时会导致设置对话结束并出现可见错误。重试会启动新的对话并再次实时检查推理路线。

系统代理轮次使用`agents.defaults.timeoutSeconds`，包括`0`来禁用截止时间，就像普通代理轮次一样。默认为48小时；设置和维修没有单独的两分钟上限。

当常规代理调用其 `openclaw` 工具时，它会通过正在运行的网关委托给该系统代理，而不是启动 CLI。这增加了一个单独的模型转向，因此例行会话和工作区检查应直接使用代理的可用工具。嵌入式系统助手不会加载工作区技能目录，因为它只能通过其内置系统工具进行操作。

主机不会将自然语言请求解析为操作。自由格式的消息 - 包括看起来像命令的文本和问题，例如“为什么我的网关停止了？” — 转到 AI，它可以通过 `openclaw` 工具将请求映射到类型化操作。

当突变待决时，仅解决来自封闭列表的明确批准或拒绝短语，而无需推理。不明确的同意会转到单独配置的完成调用；如果该调用无法解决该问题，则该突变仍未获得批准。结构化向导字段和精确的主机导航是 UI 控件，而不是自然语言操作解析。一个秘密卫生例外尤其重要：敏感路径（令牌、密钥、密码）上的精确 `config set` 永远不会到达模型。主机创建一个经过编辑的提案，并且该值在 AI- 可见历史记录中被屏蔽。优选 `config set-ref <path> env <ENV_VAR>` 作为秘密。

消息通道救援模式从不使用模型辅助规划器。远程救援使用固定规则，因此损坏或受损的正常代理路径不能用作配置编辑器。

### <a id="cli-harness-trust-model"></a> CLI 运行时信任模型

嵌入式运行时和 Codex 应用程序服务器harness直接强制实施零环限制：运行时携带 OpenClaw 工具允许列表，仅包含 `openclaw` 工具。对于 Codex，OpenClaw 还禁用环境、本机执行、多代理、目标、app/plugin、skill/MCP、网络搜索、`request_user_input` 及其针对该运行的本机规划实用程序。 CLI 工具不消耗 OpenClaw 的允许列表，因此 OpenClaw 仅承认其自己的工具选择合约可以证明相同限制的后端：

- 可选择的后端，包括 Claude Code，以空的本机工具选择和一个 MCP 工具 `openclaw` 启动。Claude 生成的 MCP 配置通过 `--strict-mcp-config` 应用，因此不会加载其他 MCP 服务器。
- 声明没有本机工具的后端会接收同一个专用的 OpenClaw MCP 服务器。
- 在推理之前拒绝始终开启或未知的本机工具后端；他们无法主持 OpenClaw 会话。

只有 OpenClaw 会话才能获取 openclaw MCP 服务器；正常的代理运行永远不会看到这个工具。因此，Selectable/no-native CLI 后端和 API-key 模型强制执行字面上的单工具循环。 Codex 应用程序服务器模型强制执行单个 OpenClaw 权威工具以及惰性本机规划实用程序。在所有三种情况下，设置写入仍然仅限于 OpenClaw 的审核批准合同。

Gemini CLI 仍可用作普通代理的显式配置运行时，但 Gemini CLI 和反重力不是推理门设置路由。使用 AI Studio API-key 或 Vertex AI 作为推理门。可选的 Gemini CLI 运行时特别需要 AI Studio API-key 配置文件。

## <a id="switching-to-an-agent"></a> 切换到代理

使用自然语言选择器离开 OpenClaw 并打开普通 TUI：

```text
talk to agent
talk to work agent
switch to main agent
```

`openclaw tui`、`openclaw chat` 和 `openclaw terminal` 会直接打开普通代理 TUI；它们不会启动 OpenClaw。切换到普通 TUI 后，`/openclaw` 会返回 OpenClaw，并且可以附带一个后续请求：

```text
/openclaw
/openclaw restart gateway
```

## <a id="message-rescue-mode"></a> 消息救援模式

消息救援模式是 OpenClaw 的消息通道入口点：当你的正常代理已死机，但受信任的通道（例如 WhatsApp）仍然能接收命令时，请使用它。

这是一个基于固定规则的紧急命令处理程序，而不是会话式 OpenClaw 代理。它不会引导新的设置或放宽 OpenClaw 聊天的推理门。

支持的命令：`/openclaw <request>`。救援模式只接受你精确输入的命令语法——自然语言会被拒绝并给出提示，绝不会被猜测成某个操作，也绝不会调用任何模型。

```text
You, in a trusted owner DM: /openclaw status
OpenClaw: OpenClaw rescue mode. Gateway reachable: no. Config valid: no.
You: /openclaw restart gateway
OpenClaw: Plan: restart the Gateway. Reply /openclaw yes to apply.
You: /openclaw yes
OpenClaw: Applied. Audit entry written.
```

代理创建也可以通过本地排队或通过救援模式进行：

```text
create agent work workspace ~/path/to/work model openai/gpt-6-astra
/openclaw create agent work workspace ~/path/to/work
```

代理创建只能指定当前经过实时验证的默认模型。省略模型则继承该路由。

救援批准保留可选的代理详细信息，例如 `create agent work purpose "Write release notes" workspace ~/path/to/work`。对于 `set default model <provider/model> for agent work`，批准会保留选定的代理，而不是将更改应用于全局默认值。

远程救援是一个管理员界面，必须被视为远程配置修复，而不是正常聊天。

远程救援的安全约束：

- 当 agent/session 的沙箱处于活动状态时禁用； OpenClaw拒绝远程救援，指向本地CLI修复。
- 默认有效状态是 `auto`：仅在受信任的 YOLO 运行模式下允许远程救援，此时运行时已经拥有未沙盒化的本地权限（`tools.exec.security` 解析为 `full` 且 `tools.exec.ask` 解析为 `off`，并且沙盒模式为 `off`）。
- 需要明确的所有者身份；不接受通配发送者规则、开放群组策略、未经验证的 Webhook 或匿名通道。
- 救援仅限于所有者私聊。
- 插件搜索和列表是只读的。插件安装始终仅限本地（在救援中会被阻止，即使在其他情况下已启用），因为它会下载可执行代码。插件卸载在本地 OpenClaw 和救援中都会被拒绝；请在终端中运行 `openclaw plugins uninstall <id>`。
- 远程救援不能打开本地 TUI 或切换到交互式代理会话；请使用本地 `openclaw` 进行代理交接。
- `config unset` 在远​​程救援中不可用，因为该路径无法在最终写入时重新验证所有者策略。请您的常规代理通过设置帮助程序删除该设置，或在本地运行 `openclaw config unset <path>`。
- 持久化写入即使在救援模式下也仍然需要批准。
- 待处理批准仅可使用一次。针对同一账户、通道和发送者的任何更新的救援命令都会撤销较早的计划；失败执行也会消耗批准，因此需要重新发送命令重试。
- 每次已应用的救援操作都会被审计。消息通道救援会记录通道、账户、发送者和源地址元数据；会修改配置的操作还会记录修改前后的配置哈希。
- 绝不回显密钥。SecretRef 检查只报告可用性，不报告值。
- 如果 Gateway 仍然存活，救援会优先使用 Gateway 的类型化操作；如果它已死机，则仅使用不依赖正常代理循环的最小本地修复范围。

内置救援策略：仅当有效运行时为 YOLO、沙箱关闭且请求为所有者 DM 时才可用。等待写入批准将在 15 分钟后过期。 `openclaw doctor --fix` 删除了已停用的 `systemAgent` 和 `crestodian` 配置块。

远程救援由 Docker 线路覆盖：

```bash
pnpm test:docker:system-agent-rescue
```

一个可选启用的实时通道命令烟雾检查会通过救援处理器对 `/openclaw status` 以及一次持久化批准往返进行验证：

```bash
pnpm test:live:system-agent-rescue-channel
```

受推理门控的打包单次设置由以下测试覆盖：

```bash
pnpm test:docker:system-agent-first-run
```

该打包的 CLI 通道以空状态目录开始，并证明 OpenClaw 拒绝在没有推理的情况下运行安装程序。然后它通过打包的激活模块测试并激活假Claude。只有在此之后，模糊请求才会到达规划器并解析为键入的设置，然后是创建附加代理的一次性命令，通过插件启用和令牌 SecretRef 配置 Discord，验证配置并检查审核日志。该通道支持 gate/operation 证据；它不执行交互式入门引导或 OpenClaw agent/tool/approval 对话。下面的 QA 实验室场景重定向到相同的 Docker 通道：

```bash
pnpm openclaw qa suite --scenario system-agent-ring-zero-setup
```

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [设置 CLI](/cli/setup)
- [入门](/cli/onboard)
- [医生](/cli/doctor)
- [TUI](/cli/tui)
- [沙盒](/cli/sandbox)
- [安全性](/cli/security)
