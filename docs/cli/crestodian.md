---
summary: "推理支持的 Crestodian 设置和修复助手的 CLI 参考与安全模型"
read_when:
  - 你已经完成推理设置，并希望 Crestodian 配置其余部分
  - 你需要使用本地设置代理检查或修复 OpenClaw
  - 你正在设计或启用消息通道救援模式
title: "Crestodian"
---

# `openclaw crestodian`

对话式 Crestodian 是 OpenClaw 的本地设置、修复和配置代理。它仅在有效默认模型完成一次真实交互后启动。全新安装会先建立推理；有问题的配置仍会走传统的 doctor 路径。

## 何时开始

不带子命令运行 `openclaw` 会根据配置状态进行路由：

- 配置缺失，或存在但没有已编写的设置（为空，或仅包含 `$schema`/`meta` 键）：会启动带有实时 AI 验证的引导式入门流程。
- 配置存在但验证失败：会启动经典入门流程，报告问题并引导你使用 `openclaw doctor`。
- 配置存在且有效：会打开正常的 agent TUI。可访问的
  已配置 Gateway 且其默认 agent 配有模型时，会直接进入该 UI，
  不经过入门流程或 Crestodian。可在 TUI 内使用 `/crestodian`，或直接运行
  `openclaw crestodian`，之后再进入 Crestodian。

首先运行 `openclaw crestodian` 会先对已配置的默认模型进行实时测试。通过一次交互后会启动 Crestodian。交互式失败会打开引导式推理设置，并在某个候选项通过后转交给 Crestodian。一次性、JSON 以及其他非交互式请求在推理不可用时会失败，并提示运行 `openclaw onboard`。`openclaw --help` 和 `openclaw --version` 仍保持其正常的快速路径。

非交互式的裸 `openclaw`（没有 TTY）会退出并显示一条简短消息，而不是打印根帮助：它会在全新或无效安装时指向非交互式入门，或者在配置有效时指向 `openclaw agent --local ...`。

`openclaw onboard --modern` 仍然是 Crestodian 的兼容别名，但使用相同的推理门禁：可用的推理会打开聊天界面，交互式失败会启动引导式推理设置，非交互式失败则会带着入门提示退出。`openclaw onboard --classic` 会打开完整的逐步向导。

## Crestodian 显示什么

交互式 Crestodian 会打开与 `openclaw tui` 相同的 TUI shell，但使用 Crestodian 聊天后端。启动时的问候信息涵盖：

- 配置有效性和默认代理
- Crestodian 正在使用的已验证模型
- 来自首次启动探测的 Gateway 可达性
- 下一步推荐的调试操作

它不会泄露密钥，也不会为了启动而加载插件 CLI 命令。

使用 `status` 获取详细清单：配置路径、文档/源码路径、本地 CLI 探测、密钥/令牌存在情况、代理、模型以及 Gateway 详情。

Crestodian 使用与常规代理相同的参考发现方式：在 Git checkout 中，它会指向本地 `docs/` 和源码树；在 npm 安装中，它会使用内置文档，并链接到 [https://github.com/openclaw/openclaw](https://github.com/openclaw/openclaw)，同时建议在文档不足时查看源码。

## 示例

```bash
openclaw
openclaw crestodian
openclaw crestodian --json
openclaw crestodian --message "models"
openclaw crestodian --message "validate config"
openclaw crestodian --message "setup workspace ~/Projects/work" --yes
openclaw crestodian --message "set default model openai/gpt-5.6" --yes
openclaw onboard --modern
```

在 Crestodian TUI 内：

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
与 work agent 对话
与 ~/Projects/work 的 agent 对话
audit
quit
```

## 操作与审批

Crestodian 使用类型化操作，而不是临时编辑配置。

只读操作会立即运行：显示概览、列出代理、列出已安装插件、搜索 ClawHub 插件、显示模型/后端状态、运行状态/健康检查、检查 Gateway 可达性、在不进行交互式修复的情况下运行 doctor、验证配置、显示审计日志路径。

启动引导式 channel 设置（`connect telegram`）也会立即运行。其向导会收集明确答案，并负责相应的写入。

持久性操作需要对话式审批（或者使用 `--yes` 直接执行）：写入配置、`config set`、`config set-ref`、设置/初始化引导、修改默认模型、启动/停止/重启 Gateway、创建代理，以及安装插件。

Doctor 修复在 Crestodian 内不可用，因为它们可能会重写提供者、认证或驱动本会话的默认代理推断路径。请退出 Crestodian，并在终端中运行 `openclaw doctor --fix`。只读的 `doctor` 在 Crestodian 内仍然可用。

新代理会继承当前已验证的默认推断路径。代理 id `crestodian` 保留给特权虚拟 custodian，不能作为普通代理创建。

`config set` 和 `config set-ref` 不能更改推断路径状态，
包括推断提供者凭据、顶层 `auth.*`、模型目录、
CLI 后端、默认/按代理模型路径、代理参数/工具，或根级
`tools.*`。对 `env.*`、`secrets.*`、`plugins.*` 和 `$include` 的原始写入也会被拒绝，因为它们可能替换凭据解析或提供者
激活。Gateway 和 channel 认证仍然是正常的配置区域。请使用类型化的插件/channel 工作流以及
`set default model <provider/model>` 来配置
已设置好的路径；它会在保存前实时测试该路径。若要配置或
修复提供者/认证访问，请退出 Crestodian 并运行 `openclaw onboard`。

插件卸载在 Crestodian 内会被拒绝，因为移除提供者
插件可能会禁用驱动本会话的推断路径。请退出 Crestodian
并在终端中运行 `openclaw plugins uninstall <id>`。

审批通过使用你自己的话表达：明确无歧义的回复（"yes"、"sure"、"go ahead"、"not now"）会从一个封闭的确定性列表中解析。当前配置的路径若支持单独的 completion 调用，其他回复也可以仅根据你的消息和待处理提案进行分类——绝不会由对话模型本身进行自我审批，因为它无法自我批准。无法分类或含糊的回复会使提案保持待定，随后对话会再次询问。

已应用的写入会记录在 `~/.openclaw/audit/crestodian.jsonl` 中。发现类操作不会被审计；只有已应用的操作和写入会被审计。

Channel 设置可以作为托管对话运行，直到它到达 secret。由于终端聊天输入是可见的，本地 Crestodian TUI 不接受敏感的向导答案。它会立即提供 `open channel wizard`，将所选 channel 交给受遮蔽的终端向导；你也可以稍后运行 `openclaw channels add --channel <channel>`。

### 切换到受遮蔽的 channel 设置

本地聊天可以将控制权交给受遮蔽的 channel 向导：

```text
open channel wizard for slack
channel info slack
```

`open channel wizard for <channel>` 会在聊天 TUI 关闭后打开受遮蔽的 channel 设置。请先使用 `channel info <channel>` 查看 channel 标签、设置状态、前置条件摘要和文档链接。

Crestodian 从不在其自身会话内部更改提供者/认证访问：该会话本身已经依赖于那条推断路径。对于模型提供者的设置或修复，`configure model provider` 会返回退出/引导说明，而不会启动向导或写入配置。请退出 Crestodian 并运行 `openclaw onboard`；onboarding 会暂存凭据，并且只保存一条能够完成真实有效交互轮次的路径。onboarding 成功后，再次启动 Crestodian。

## 设置引导

`setup` 在引导式入门已经建立推理之后，配置剩余的工作区和 Gateway 状态。它只通过类型化的配置操作写入，并且会先请求批准。

```text
setup
setup workspace ~/Projects/work
```

`setup` 会保留已验证的有效模型。它不会配置或
替换推理。

如果推理缺失，或者其实时检查失败，请离开 Crestodian 并运行 `openclaw onboard`。引导式入门会检测已配置的模型、API 密钥和已认证的本地 CLI，向每个候选项请求一次真实回复，并且只持久化通过验证的路径。Crestodian 会在该边界之后立即启动，然后可以配置工作区、Gateway、频道、代理、插件以及其他可选功能。

当 macOS 应用到达一个已配置的 Gateway，且其默认代理已经配置了模型时，它会完全跳过这一级流程；它会打开正常的代理
UI。
对于全新或不完整的 Gateway，应用会通过
`crestodian.setup.detect` 和 `crestodian.setup.activate` Gateway 方法驱动推理流程：
detect 会列出它找到的每一个候选后端，activate 会对一个候选项进行实时测试（一次真正的“回复 OK”完成），并且仅在测试通过后才持久化该路由所需的模型、凭据以及提供方/运行时状态。工作区和 Gateway 默认值会保留给 Crestodian。失败的候选项
不会更改配置；应用会自动沿着这一级流程继续向下，并最终
提供一个手动密钥/token 步骤，该步骤会填充来自 Gateway 活跃的
文本推理提供方插件。所选提供方拥有其启动模型
和配置，而凭据也会以相同方式在保存前进行验证。

Codex 监督和其他可选插件功能会留在这一
推理激活事务之外。只有在推理
正常工作且 Crestodian 已启动之后再配置它们；现有的插件策略和显式的监督退出选择在推理设置期间保持不变。

## AI 对话

Interactive Crestodian 的自由形式对话通过与常规 OpenClaw 代理相同的 agent 循环运行，仅受限于一个 ring-zero OpenClaw authority tool：`crestodian`，它封装了类型化操作。读取操作自由运行，变更需要你针对该确切操作进行对话式批准（参见 Operations and approval），并且每一次已应用的写入都会被审计和重新验证。agent 会话会持续存在，因此 Crestodian 具备真正的多轮记忆。如果已验证的推理路径之后停止工作，请返回 `openclaw onboard` 并在继续之前修复它。

主机不会将自然语言请求解析为操作。自由形式
消息——包括看起来像命令的文本以及诸如“why did my
gateway stop?”之类的问题——都会发送给 AI，由 AI 通过 `crestodian` 工具将请求映射到一个类型化操作。

当某个变更处于待处理状态时，只有来自
封闭列表中的、明确无歧义的批准或拒绝短语才会在不进行推理的情况下被解析。含糊的同意会进入
单独配置的完成调用，否则将以 fail closed 方式失败。结构化
向导字段和精确的主机导航是 UI 控件，不是自然语言
操作解析。有一条秘密卫生例外尤其重要：对敏感路径（tokens、keys、passwords）的精确 `config set` 永远不会进入模型。主机会创建一个已脱敏的提案，并且该值会在 AI 可见历史中被掩码。秘密请优先使用 `config set-ref <path> env <ENV_VAR>`。

消息通道救援模式从不使用模型辅助规划器。远程救援保持确定性，因此损坏或被入侵的正常 agent 路径不能被用作配置编辑器。

### CLI harness 信任模型

嵌入式运行时和 Codex app-server harness 直接强制执行 ring-zero
限制：该次运行携带的 OpenClaw tool allow-list 中只有
`crestodian` 工具。对于 Codex，OpenClaw 还会为该次运行禁用 environments、native
execution、multi-agent、goal、app/plugin、skill/MCP、web-search 和
`request_user_input` 表面。Codex 仍会注入其无作用的原生 `update_plan`
utility；它可以更新模型的临时清单，但不能写入文件
或 OpenClaw 配置。CLI harness 不消费 OpenClaw 的 allow-list，
因此 Crestodian 只接受那些其自身工具选择契约能够证明
相同限制的后端：

- 可选后端，包括 Claude Code，以空的原生工具
  选择和一个 MCP 工具 `crestodian` 启动。Claude 生成的 MCP 配置会通过
  `--strict-mcp-config` 应用，因此不会加载其他 MCP 服务器。
- 声明没有原生工具的后端会收到相同的专用 Crestodian
  MCP 服务器。
- 始终开启或未知的原生工具后端会在推理前以 fail closed
  方式失败；它们不能承载 Crestodian 会话。

只有 Crestodian 会话会获得 crestodian MCP 服务器；正常 agent 运行
永远看不到此工具。因此，可选/无原生的 CLI 后端和 API key 模型
都会强制执行字面意义上的单工具循环。Codex app-server 模型会强制执行
单个 OpenClaw authority tool 加上无作用的原生规划 utility。三种情况中，设置写入都仍然局限于 Crestodian 的审计批准契约。

Gemini CLI 仍可用于正常 agent，但它无法强制执行推理门所需的
无工具探测，因此它不能承载 Crestodian。

## 切换到代理

使用自然语言选择器离开 Crestodian 并打开正常 TUI：

```text
talk to agent
talk to work agent
switch to main agent
```

`openclaw tui`、`openclaw chat` 和 `openclaw terminal` 会直接打开正常的代理 TUI；它们不会启动 Crestodian。切换到正常 TUI 后，`/crestodian` 会返回到 Crestodian，并且可以附带一个后续请求：

```text
/crestodian
/crestodian restart gateway
```

## 消息救援模式

消息救援模式是 Crestodian 的消息频道入口点：当你的正常代理已死亡，但受信任的频道（例如 WhatsApp）仍在接收命令时使用它。

这是一个确定性的紧急命令处理器，而不是对话式的 Crestodian 代理。它不会引导全新的设置，也不会放宽 Crestodian 聊天的推理门控。

支持的命令：`/crestodian <request>`。救援仅接受精确输入的命令语法——自然语言会被拒绝并给出提示，绝不会被猜测为某个操作，也不会咨询任何模型。

```text
You, in a trusted owner DM: /crestodian status
OpenClaw: Crestodian 救援模式。Gateway 可达：否。配置有效：否。
You: /crestodian restart gateway
OpenClaw: 计划：重启 Gateway。回复 /crestodian yes 以应用。
You: /crestodian yes
OpenClaw: 已应用。已写入审计条目。
```

代理创建也可以通过本地排队或通过救援来完成：

```text
create agent work workspace ~/Projects/work model openai/gpt-5.6-sol
/crestodian create agent work workspace ~/Projects/work
```

代理创建只能指定当前已实时验证的默认模型。省略模型即可继承该路由。

远程救援是一个管理员界面，应被视为远程配置修复，而不是正常聊天。

远程救援的安全契约：

- 当代理/会话处于 sandboxing 状态时禁用；Crestodian 会拒绝远程救援并提示使用本地 CLI 修复。
- 默认有效状态为 `auto`：仅在受信任的 YOLO 运行中允许远程救援，也就是运行时已经拥有非沙箱的本地权限（`tools.exec.security` 解析为 `full` 且 `tools.exec.ask` 解析为 `off`，同时 sandbox 模式为 `off`）。
- 需要明确的 owner 身份；不允许通配发送者规则、开放群组策略、未认证 webhook 或匿名频道。
- 默认仅限 owner 的私信；群组/频道救援需要显式 opt-in。
- 插件搜索和列表是只读的。插件安装始终只能在本地进行（即使其他情况下已启用，也会在救援中被阻止），因为它会下载可执行代码。插件卸载在本地 Crestodian 和救援中都会被拒绝；请在终端中运行 `openclaw plugins uninstall <id>`。
- 远程救援不能打开本地 TUI 或切换到交互式代理会话；请使用本地 `openclaw` 进行代理交接。
- 持久化写入即使在救援模式下仍然需要批准。
- 每个已应用的救援操作都会被审计。消息频道救援会记录频道、账户、发送者和源地址元数据；会修改配置的操作还会记录前后的配置哈希。
- 秘密信息绝不会被回显。SecretRef 检查只报告可用性，不报告具体值。
- 如果 Gateway 仍然存活，救援会优先使用 Gateway 的类型化操作；如果它已死亡，救援只使用不依赖正常代理循环的最小本地修复界面。

配置形状：

```jsonc
{
  "crestodian": {
    "rescue": {
      "enabled": "auto",
      "ownerDmOnly": true,
      "pendingTtlMinutes": 15,
    },
  },
}
```

- `enabled`：`"auto"`（默认）仅在有效运行时为 YOLO 且 sandboxing 关闭时允许救援；`false` 表示永不允许消息频道救援；`true` 在 owner/channel 检查通过时显式允许救援（但仍受 sandboxing 拒绝约束）。
- `ownerDmOnly`：将救援限制为 owner 的直接消息。默认 `true`。
- `pendingTtlMinutes`：在 `/crestodian yes` 批准之前，一个待处理的救援写入保持打开的时长，过期后失效。默认 `15`。

远程救援由 Docker 流水线覆盖：

```bash
pnpm test:docker:crestodian-rescue
```

一个可选加入的实时频道命令表面 smoke 检查 `/crestodian status`，以及通过救援处理器进行一次持久化批准往返：

```bash
pnpm test:live:crestodian-rescue-channel
```

受推理门控的打包单次设置由以下覆盖：

```bash
pnpm test:docker:crestodian-first-run
```

该打包 CLI 线路从一个空状态目录开始，并证明 Crestodian 在没有推理的情况下会失败并关闭。随后它通过打包激活模块测试并激活 fake Claude。之后，只有模糊请求才会到达规划器并解析为类型化设置，接着是一次性命令：创建一个额外代理、通过插件启用加 token SecretRef 配置 Discord、验证配置并检查审计日志。该线路支持门控/操作证据；它不会执行交互式上手流程，也不会执行 Crestodian 的代理/工具/批准对话。下面的 QA Lab 场景会重定向到同一条 Docker 线路：

```bash
pnpm openclaw qa suite --scenario crestodian-ring-zero-setup
```

## 相关内容

- [CLI 参考](/cli)
- [Doctor](/cli/doctor)
- [TUI](/cli/tui)
- [沙箱](/cli/sandbox)
- [安全](/cli/security)
