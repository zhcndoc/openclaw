---
summary: "推理支持的 OpenClaw 设置与修复助手的 CLI 参考和安全模型"
read_when:
  - 你已完成推理设置，并希望 OpenClaw 配置其余部分
  - 你需要使用本地设置代理检查或修复 OpenClaw
  - 你正在设计或启用消息通道救援模式
title: "OpenClaw 设置代理"
---

# `openclaw setup`

OpenClaw 自带一个内置系统代理——它以“OpenClaw”的身份发言——用于
本地设置、修复和配置（前称 Crestodian）。它仅会在有效默认模型完成一次真实轮次后启动。
全新安装会先建立推理；格式错误的配置会保留在
经典 doctor 路径上。

## 它开始时

在没有子命令的情况下运行 `openclaw` 会根据配置状态进行路由：

- 配置缺失，或存在但没有已编写的设置（为空，或仅包含 `$schema`/`meta` 键）：启动带有实时 AI 验证的引导式入门流程。
- 配置存在但验证失败：启动经典入门流程，它会报告问题并引导你运行 `openclaw doctor`。
- 配置存在且有效：打开正常的代理 TUI。一个可达的、已配置的 Gateway，且其默认代理拥有模型时，会直接进入该 UI，而不会经过入门流程或 OpenClaw。你可以在 TUI 中使用 `/openclaw`，或直接运行 `openclaw setup`，稍后进入 OpenClaw。

运行 `openclaw setup` 时，会先对已配置的默认模型进行一次实时测试。若通过，则启动 OpenClaw。若交互式失败，则打开引导式推理设置，并在某个候选项通过后移交给 OpenClaw。一次性、JSON 以及其他非交互式请求在推理不可用时会失败，并提示运行 `openclaw onboard`。`openclaw --help` 和 `openclaw --version` 仍保持其正常的快速路径。

非交互式的裸 `openclaw`（无 TTY）会直接退出并给出简短消息，而不是打印根级帮助：在全新安装或无效安装时，它会指向非交互式入门；在配置有效时，则会指向 `openclaw agent --local ...`。

`openclaw onboard --modern` 仍然是 OpenClaw 的兼容别名，但使用相同的推理门控：可用的推理会打开聊天界面，交互式失败会启动引导式推理设置，非交互式失败则会带着入门指引退出。`openclaw onboard --classic` 会打开完整的逐步向导。

## OpenClaw 显示什么

交互式 OpenClaw 会打开与 `openclaw tui` 相同的 TUI shell，但使用 OpenClaw 聊天后端。启动问候会涵盖：

- 配置有效性和默认 agent
- OpenClaw 正在使用的已验证模型
- 来自首次启动探测的 Gateway 可达性
- 下一步推荐的调试操作

它不会在启动时转储密钥，也不会为了启动而加载插件 CLI 命令。

使用 `status` 查看详细清单：配置路径、docs/source 路径、本地 CLI 探测、密钥/令牌存在性、agents、模型以及 Gateway 详情。

OpenClaw 使用与常规 agent 相同的参考发现方式：在 Git 检出版本中，它指向本地 `docs/` 和源码树；在 npm 安装中，它使用随附文档并链接到 [https://github.com/openclaw/openclaw](https://github.com/openclaw/openclaw)，并提示在文档不足时查看源码。

## 示例

```bash
openclaw
openclaw setup
openclaw setup --json
openclaw setup --message "models"
openclaw setup --message "validate config"
openclaw setup --message "setup workspace ~/Projects/work" --yes
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
setup workspace ~/Projects/work
config set gateway.port 19001
config set-ref gateway.auth.token env OPENCLAW_GATEWAY_TOKEN
gateway status
restart gateway
agents
create agent work workspace ~/Projects/work
models
configure model provider
set default model openai/gpt-5.6
channels
channel info slack
connect slack
open channel wizard for slack
plugins list
plugins search slack
plugin install clawhub:openclaw-codex-app-server
talk to work agent
talk to agent for ~/Projects/work
audit
quit
```

## 操作和审批

OpenClaw 使用类型化操作，而不是临时编辑配置。

只读操作会立即运行：显示概览、列出代理、列出已安装插件、搜索 ClawHub 插件、显示模型/后端状态、运行状态/健康检查、检查 Gateway 可达性、在不进行交互式修复的情况下运行 doctor、验证配置、显示审计日志路径。

启动引导式频道设置（`connect telegram`）也会立即运行。其向导会收集明确答案，并负责后续写入。

持久化操作需要对话式审批（或对直接命令使用 `--yes`）：写入配置、`config set`、`config set-ref`、setup/onboarding 启动引导、更改默认模型、启动/停止/重启 Gateway、创建代理，以及安装插件。

doctor 修复在 OpenClaw 内不可用，因为它们可能会重写为当前会话提供支持的 provider、认证或默认代理推断路由。请退出 OpenClaw，并在终端中运行 `openclaw doctor --fix`。只读的 `doctor` 在 OpenClaw 内仍然可用。

新代理会继承已实时验证的默认推断路由。代理 id `openclaw` 和 `crestodian` 为系统代理保留，不能作为普通代理创建。已退役的 id 仍然被阻止，因此旧配置无法占用它。

`config set` 和 `config set-ref` 不能更改推断路由状态，
包括推断 provider 凭据、顶层 `auth.*`、模型目录、
CLI backends、默认/按代理模型路由、代理参数/工具，或根级
`tools.*`。对 `env.*`、`secrets.*`、`plugins.*` 和 `$include`
下的原始写入也会被拒绝，因为它们可能替换凭据解析或 provider
激活。Gateway 和 channel auth 仍然是普通配置入口。请使用类型化的插件/频道工作流以及
`set default model <provider/model>` 来配置
已存在的路由；它会在保存前对该路由进行实时测试。若要配置或
修复 provider/auth 访问，请退出 OpenClaw 并运行 `openclaw onboard`。

在 OpenClaw 内卸载插件会被拒绝，因为移除 provider
插件可能会禁用支撑当前会话的推断路由。请退出 OpenClaw，
并在终端中运行 `openclaw plugins uninstall <id>`。

审批通过要用你自己的话来表示：明确无歧义的回复（"yes"、"sure"、"go ahead"、"not now"）会从一个封闭的确定性列表中解析。若已配置的路由支持单独的 completion 调用，则其他回复可以仅根据你的消息和待定提案进行分类——绝不会由对话模型本身分类，因为它无法自我审批。未分类或有歧义的回复会使提案保持待定，系统会再次询问。

已应用的写入会记录在 `~/.openclaw/audit/system-agent.jsonl` 中。发现操作不会被审计；只有已应用的操作和写入会被审计。

频道设置可以作为托管对话运行，直到它到达一个 secret。由于终端聊天输入是可见的，本地 OpenClaw TUI 不接受敏感的向导答案。它会立即提供 `open channel wizard`，将所选频道带入带掩码的终端向导；你也可以稍后运行 `openclaw channels add --channel <channel>`。

### 切换到带掩码的频道设置

本地聊天可以将控制权交给带掩码的频道向导：

```text
open channel wizard for slack
channel info slack
```

`open channel wizard for <channel>` 会在聊天 TUI 关闭后打开带掩码的频道设置。请先使用 `channel info <channel>` 查看频道标签、设置状态、前置条件摘要以及文档链接。

OpenClaw 从不在自身会话内更改 provider/auth 访问：该会话本身就依赖于那条推断路由。对于模型 provider 的设置或修复，`configure model provider` 会返回退出/引导说明，而不会启动向导或写入配置。请退出 OpenClaw 并运行 `openclaw onboard`；onboarding 会暂存凭据，并且只保存一条能够完成真实实时回合的路由。在 onboarding 成功后，请重新启动 OpenClaw。

## 设置引导

`setup` 在引导式入门已经建立推理之后，配置剩余的工作区和 Gateway 状态。它仅通过类型化的配置操作写入，并会先请求批准。

```text
setup
setup workspace ~/Projects/work
```

`setup` 会保留已验证的有效模型。它不会配置或
替换推理。

如果推理缺失，或者其实时检查失败，请离开 OpenClaw 并运行 `openclaw onboard`。引导式入门会检测已配置的模型、API 密钥以及已认证的本地 CLI，向每个候选项请求真实回复，并且只持久化通过验证的路径。OpenClaw 会在该边界之后立即启动，然后即可配置工作区、Gateway、通道、代理、插件以及其他可选功能。

当 macOS 应用程序到达一个已配置的 Gateway，且其默认代理已经配置了模型时，会完全跳过这一流程；它会打开普通的代理 UI。
对于全新或不完整的 Gateway，应用程序会通过 `openclaw.setup.detect` 和 `openclaw.setup.activate` Gateway 方法驱动推理流程：detect 会列出它找到的每个候选后端，activate 会对一个候选进行实时测试（一次真实的“回复 OK”完成），并且只在测试通过后才持久化该路由所需的模型、凭据以及提供方/运行时状态。工作区和 Gateway 默认值会保留给 OpenClaw。失败的候选永远不会更改配置；应用程序会自动沿着该流程继续向下，并最终提供一个手动密钥/令牌步骤，该步骤会从 Gateway 当前可用的文本推理提供方插件中填充。所选提供方拥有其启动模型和配置，并且凭据会以相同方式在保存前进行验证。

Codex 监督和其他可选插件功能仍然置于此推理激活事务之外。只有在推理正常工作且 OpenClaw 已启动之后，才配置它们；在推理设置期间，现有的插件策略和显式的监督退出选项都会保持不变。

## AI 对话

OpenClaw 的自由形式对话与常规 OpenClaw 代理运行在同一个代理循环中，仅受一个零环 OpenClaw 权威工具 `openclaw` 的限制，该工具封装了类型化操作。读取操作可自由执行，修改操作则需要你对该确切操作进行会话批准（参见“操作与批准”），而且每一次已应用的写入都会被审计并重新验证。代理会话会持续存在，因此 OpenClaw 具备真正的多轮记忆。如果已验证的推理路径之后停止工作，请返回 `openclaw onboard` 并先修复它，再继续。

主机不会将自然语言请求解析为操作。自由形式消息——包括看起来像命令的文本以及诸如“为什么我的网关停了？”之类的问题——都会交给 AI，由 AI 通过 `openclaw` 工具将请求映射到某个类型化操作。

当有修改等待处理时，只有来自固定列表中明确无歧义的批准或拒绝短语才会在不进行推理的情况下被解析。含糊的同意会进入另一个已配置的完成调用，否则会失败并保持关闭。结构化向导字段和精确的主机导航是 UI 控件，而不是自然语言操作解析。一个秘密卫生方面的例外尤其重要：对敏感路径（令牌、密钥、密码）执行精确的 `config set` 永远不会到达模型。主机会创建一条脱敏后的提案，并且该值会在 AI 可见历史中被遮蔽。对于密钥，请优先使用 `config set-ref <path> env <ENV_VAR>`。

消息通道的救援模式从不使用模型辅助规划器。远程救援保持确定性，因此损坏或被破坏的正常代理路径不能被用作配置编辑器。

### CLI 运行时信任模型

嵌入式运行时和 Codex app-server 运行时直接强制执行零环限制：本次运行只携带一个 OpenClaw 工具允许列表，其中仅包含 `openclaw` 工具。对于 Codex，OpenClaw 还会禁用该运行中的环境、本机执行、多代理、目标、app/plugin、skill/MCP、web-search 以及 `request_user_input` 接口。Codex 仍会注入其无作用的本机 `update_plan`
实用工具；它可以更新模型的临时清单，但不能写入文件或 OpenClaw 配置。CLI 运行时不会消耗 OpenClaw 的允许列表，因此 OpenClaw 只接受那些自身工具选择契约能够证明相同限制的后端：

- 可选择的后端，包括 Claude Code，以空的本机工具
  选择和一个 MCP 工具 `openclaw` 启动。Claude 生成的 MCP 配置通过 `--strict-mcp-config` 应用，因此不会加载其他 MCP 服务器。
- 声明没有本机工具的后端会接收同一个专用的 OpenClaw
  MCP 服务器。
- 始终开启或未知的本机工具后端会在推理前失败并保持关闭；它们
  不能承载 OpenClaw 会话。

只有 OpenClaw 会话会获得 openclaw MCP 服务器；普通代理运行
永远看不到这个工具。因此，可选择/无本机工具的 CLI 后端和 API 密钥模型
都强制执行字面意义上的单工具循环。Codex app-server 模型强制执行单个 OpenClaw 权威工具加上无作用的本机规划实用工具。在这三种情况下，设置写入仍然被限制在 OpenClaw 的审计批准契约之内。

Gemini CLI 对普通代理仍然可用，但它无法强制执行推理门所要求的无工具探测，因此不能承载 OpenClaw。

## 切换到代理

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

## 消息救援模式

消息救援模式是 OpenClaw 的消息通道入口点：当你的正常代理已死机，但受信任的通道（例如 WhatsApp）仍然能接收命令时，请使用它。

这是一个确定性的紧急命令处理器，而不是对话式的 OpenClaw 代理。它不会引导全新的设置，也不会放宽 OpenClaw 聊天的推理门控。

支持的命令：`/openclaw <request>`。救援模式只接受你精确输入的命令语法——自然语言会被拒绝并给出提示，绝不会被猜测成某个操作，也绝不会调用任何模型。

```text
你，在受信任的所有者私聊中：/openclaw status
OpenClaw：OpenClaw 救援模式。网关可达：否。配置有效：否。
你：/openclaw restart gateway
OpenClaw：计划：重启 Gateway。回复 /openclaw yes 以应用。
你：/openclaw yes
OpenClaw：已应用。审计条目已写入。
```

代理创建也可以通过本地排队或通过救援模式进行：

```text
create agent work workspace ~/Projects/work model openai/gpt-5.6-sol
/openclaw create agent work workspace ~/Projects/work
```

代理创建只能指定当前经过实时验证的默认模型。省略模型则继承该路由。

远程救援是一个管理员界面，必须被视为远程配置修复，而不是正常聊天。

远程救援的安全约束：

- 当代理/会话启用了沙箱时会被禁用；OpenClaw 会拒绝远程救援，并提示使用本地 CLI 修复。
- 默认有效状态为 `auto`：仅在受信任的 YOLO 运行模式下允许远程救援，此时运行时已经拥有未沙箱化的本地权限（`tools.exec.security` 解析为 `full` 且 `tools.exec.ask` 解析为 `off`，并且沙箱模式为 `off`）。
- 需要显式的所有者身份；不接受通配发送者规则、开放群组策略、未认证 webhook 或匿名通道。
- 默认仅允许所有者私聊；群组/频道救援需要显式启用。
- 插件搜索和列表是只读的。插件安装始终仅限本地（在救援模式中会被阻止，即使其他情况下已启用），因为它会下载可执行代码。插件卸载在本地 OpenClaw 和救援模式中都会被拒绝；请在终端中运行 `openclaw plugins uninstall <id>`。
- 远程救援不能打开本地 TUI，也不能切换到交互式代理会话；请使用本地 `openclaw` 进行代理交接。
- 持久化写入在救援模式下仍然需要批准。
- 每个已应用的救援操作都会被审计。消息通道救援会记录通道、账户、发送者以及来源地址元数据；会修改配置的操作还会记录修改前后的配置哈希。
- 绝不会回显密钥。SecretRef 检查只报告可用性，不报告值。
- 如果 Gateway 仍然存活，救援模式会优先使用 Gateway 的类型化操作；如果它已死机，救援模式只使用不依赖正常代理循环的最小本地修复界面。

配置结构：

```jsonc
{
  "systemAgent": {
    "rescue": {
      "enabled": "auto",
      "ownerDmOnly": true,
      "pendingTtlMinutes": 15,
    },
  },
}
```

- `enabled`：`"auto"`（默认）仅在运行时有效状态为 YOLO 且沙箱已关闭时允许救援；`false` 从不允许消息通道救援；`true` 在所有者/通道检查通过时显式允许救援（但仍受沙箱拒绝约束）。
- `ownerDmOnly`：将救援限制为所有者直接消息。默认 `true`。
- `pendingTtlMinutes`：一个待处理的救援写入在因 `/openclaw yes` 批准前保持开启的时长，超时后失效。默认 `15`。

`openclaw doctor --fix` 会将旧的 `crestodian` 配置块迁移到 `systemAgent`。运行时只读取规范块。

远程救援由 Docker 线路覆盖：

```bash
pnpm test:docker:system-agent-rescue
```

一个可选启用的实时通道命令面烟雾检查会通过救援处理器对 `/openclaw status` 以及一次持久化批准往返进行验证：

```bash
pnpm test:live:system-agent-rescue-channel
```

受推理门控的打包单次设置由以下测试覆盖：

```bash
pnpm test:docker:system-agent-first-run
```

该打包 CLI 线路从空的状态目录开始，证明 OpenClaw 在没有推理时会安全失败。随后它通过打包的激活模块测试并激活虚拟 Claude。之后，模糊请求才会到达规划器并解析为类型化设置，接着通过一次性命令创建额外代理、通过插件启用加 SecretRef 令牌来配置 Discord、验证配置并检查审计日志。此线路用于支持门控/操作证据；它不涵盖交互式入门，也不涵盖 OpenClaw 代理/工具/批准对话。下面的 QA Lab 场景会重定向到同一个 Docker 线路：

```bash
pnpm openclaw qa suite --scenario system-agent-ring-zero-setup
```

## 相关

- [CLI 参考](/cli)
- [Doctor](/cli/doctor)
- [TUI](/cli/tui)
- [沙盒](/cli/sandbox)
- [安全性](/cli/security)
