---
summary: "Crestodian 的 CLI 参考与安全模型，适用于无配置安全的设置和修复助手"
read_when:
  - 你在设置后运行 openclaw 且不带命令，并希望了解 Crestodian
  - 你需要一种无配置且安全的方式来检查或修复 OpenClaw
  - 你正在设计或启用消息通道救援模式
title: "Crestodian"
---

# `openclaw crestodian`

Crestodian 是 OpenClaw 的本地设置、修复和配置助手。即使正常的代理路径已损坏，它仍然可以保持可达：当 `openclaw.json` 缺失或无效、Gateway 宕机、插件命令注册不可用，或者尚未配置任何代理时，它都可以运行。

## 何时开始

不带子命令运行 `openclaw` 会根据配置状态进行路由：

- 配置缺失，或存在但没有已编写的设置（为空，或仅包含 `$schema`/`meta` 键）：启动经典引导。
- 配置存在但验证失败：启动 Crestodian。
- 配置存在且有效：打开正常的 agent TUI（如果可达，则连接到已配置的 Gateway；如果没有可达的，则本地运行）。在 TUI 中使用 `/crestodian`，或者直接运行 `openclaw crestodian`，即可进入 Crestodian。

运行 `openclaw crestodian` 时，无论配置状态如何，都会始终显式启动 Crestodian。`openclaw --help` 和 `openclaw --version` 仍保持其正常的快速路径。

非交互式的裸 `openclaw`（无 TTY）不会打印根帮助，而是退出并显示一条简短消息：在全新安装时会提示非交互式引导；当配置无效时会提示使用 `openclaw crestodian --message "status"`；当配置有效时会提示使用 `openclaw agent --local ...`。

`openclaw onboard --modern` 会以现代引导预览的形式启动 Crestodian。普通的 `openclaw onboard` 仍保持经典引导。

## Crestodian 显示什么

交互式 Crestodian 会打开与 `openclaw tui` 相同的 TUI shell，但使用 Crestodian 聊天后端。启动时的问候信息涵盖：

- 配置有效性和默认代理
- Crestodian 正在使用的模型或确定性规划器路径
- 首次启动探测时的 Gateway 可达性
- 下一步建议的调试操作

它不会泄露密钥，也不会为了启动而加载插件 CLI 命令。

使用 `status` 查看详细清单：配置路径、docs/source 路径、本地 CLI 探测、API 密钥存在性、代理、模型以及 Gateway 详细信息。

Crestodian 使用与常规代理相同的参考发现方式：在 Git checkout 中，它会指向本地 `docs/` 和源码树；在 npm 安装中，它会使用内置文档，并链接到 [https://github.com/openclaw/openclaw](https://github.com/openclaw/openclaw)，同时建议在文档不足时查看源码。

## 示例

```bash
openclaw
openclaw crestodian
openclaw crestodian --json
openclaw crestodian --message "models"
openclaw crestodian --message "validate config"
openclaw crestodian --message "setup workspace ~/Projects/work model openai/gpt-5.5" --yes
openclaw crestodian --message "set default model openai/gpt-5.5" --yes
openclaw onboard --modern
```

在 Crestodian TUI 内：

```text
status
health
doctor
doctor fix
validate config
setup
setup workspace ~/Projects/work model openai/gpt-5.5
config set gateway.port 19001
config set-ref gateway.auth.token env OPENCLAW_GATEWAY_TOKEN
gateway status
restart gateway
agents
create agent work workspace ~/Projects/work
models
set default model openai/gpt-5.5
plugins list
plugins search slack
plugin install clawhub:openclaw-codex-app-server
plugin uninstall openclaw-codex-app-server
talk to work agent
talk to agent for ~/Projects/work
audit
quit
```

## 操作与审批

Crestodian 使用类型化操作，而不是临时编辑配置。

只读，立即执行：显示概览、列出代理、列出已安装的插件、搜索 ClawHub 插件、显示模型/后端状态、运行状态/健康检查、检查 Gateway 可达性、在不进行交互式修复的情况下运行 doctor、验证配置、显示审计日志路径。

持久化操作，需要会话式批准（或在直接命令中使用 `--yes`）：写入配置、`config set`、`config set-ref`、设置/引导 bootstrap、更改默认模型、启动/停止/重启 Gateway、创建代理、安装或卸载插件、运行会重写配置或状态的 doctor 修复。

已应用的写入会记录在 `~/.openclaw/audit/crestodian.jsonl` 中。发现类操作不会被审计；只有已应用的操作和写入会被审计。

当主机支持掩码输入时，通道设置可以作为托管会话运行。本地 Crestodian TUI 不接受敏感的向导回答；它会改为引导你执行 `openclaw channels add --channel <channel>`，其交互式提示会对凭据进行掩码处理。

## 设置引导

`setup` 是面向聊天优先的初始化引导程序。它只通过类型化的配置操作写入，并会先请求批准。

```text
setup
setup workspace ~/Projects/work
setup workspace ~/Projects/work model openai/gpt-5.5
```

当未配置模型时，setup 会按以下顺序选择第一个可用的后端，并告诉你它选择了什么：

1. 已存在的显式模型（如果已经配置）。
2. `OPENAI_API_KEY` -> `openai/gpt-5.5`
3. `ANTHROPIC_API_KEY` -> `anthropic/claude-opus-4-8`
4. Claude Code CLI -> `claude-cli/claude-opus-4-8`
5. Codex -> 通过 Codex 应用服务器宿主使用 `openai/gpt-5.5`
6. Gemini CLI -> `google-gemini-cli/gemini-3.1-pro-preview`

如果这些都不可用，setup 仍会写入默认工作区并保持模型未设置。请安装或登录 Codex/Claude Code/Gemini CLI，或提供 `OPENAI_API_KEY`/`ANTHROPIC_API_KEY`，然后再次运行 setup。

macOS 应用通过 `crestodian.setup.detect` 和 `crestodian.setup.activate` 网关方法驱动同样的选择流程：detect 会列出它找到的每个可复用后端，activate 会对一个候选项进行实时测试（一次真实的“回复 OK”补全），并且只有在测试通过后才会持久化模型、工作区和网关默认值。失败的候选项绝不会改变配置；应用会自动沿着这个顺序向下尝试，最后提供一个手动 API 密钥步骤（Anthropic、OpenAI 或 Google），并在保存前以同样方式进行验证。

## 模型辅助的规划器

Interactive Crestodian 以 AI 为先。精确输入的命令会即时且确定性地运行。其他所有消息都会通过与常规 OpenClaw agent 相同的内嵌 agent 循环运行，并且仅受限于一个 ring-zero `crestodian` 工具，该工具封装了这些输入操作：读取操作可自由执行，变更操作则需要你就该具体操作在对话中明确同意，而且每一次已应用的写入都会被审计并重新验证。agent 会话会持续存在，因此 custodian 具有真正的多轮记忆。它首先使用已配置的 OpenClaw 模型；如果没有可用模型，则回退到机器上已存在的本地运行时：

- Claude Code CLI：`claude-cli/claude-opus-4-8`（agent 循环；ring-zero 工具通过 MCP 提供，见下方信任模型）
- Codex app-server harness：`openai/gpt-5.5`（带强制单工具允许列表的 agent 循环）

当 agent 循环不可用时，Crestodian 会降级为有界的单轮规划器；如果没有任何模型，则降级为确定性的输入命令。该规划器不能直接修改配置；它必须将请求翻译为 Crestodian 的某个输入命令，并遵循正常的审批/审计规则。Crestodian 会在执行任何操作前打印它所使用的模型以及解析后的命令。回退规划器的轮次是临时性的，在运行时支持的情况下会禁用工具，并使用临时工作区/会话。

消息通道救援模式从不使用模型辅助规划器。远程救援保持确定性，因此损坏或被入侵的正常 agent 路径不能被用作配置编辑器。

### CLI harness 信任模型

内嵌运行时和 Codex app-server harness 直接强制执行 ring-zero
限制：运行时携带的工具允许列表中只有
`crestodian` 工具。CLI harness（Claude Code、Gemini CLI）无法强制执行
OpenClaw 工具允许列表——CLI 拥有其原生工具及其自身的权限
策略，因此如果要求限制其中一个，OpenClaw 会以失败关闭。对于 CLI-harness
模型，Crestodian 会改为：

- 注入一个专用的 MCP 服务器，仅提供 `crestodian` 工具，并
  替换该运行中 OpenClaw 的正常 MCP 工具面；对于 Claude Code，
  生成的配置会使用 `--strict-mcp-config` 应用，因此不会加载其他
  MCP 服务器，
- 将所有配置变更都置于该工具的审批与审计契约之内——
  读取可自由执行，写入需要你在对话中明确同意，且每一次已应用的
  写入都会被审计并重新验证，
- 将原生工具（文件读取、shell）留给 harness。它们遵循与本机上正常 OpenClaw agent 运行相同的
  权限状态：在 OpenClaw 的默认 exec 设置下，Claude Code 以绕过权限的方式运行，
  而受限的 `tools.exec` 配置会回退到 CLI 自身的权限
  策略。

只有 Crestodian 会话才会获得 crestodian MCP 服务器；正常 agent 运行
永远看不到这个工具。把 CLI-harness 模型上的 Crestodian 会话视为
同一主机上的普通本地 agent 运行：ring-zero 工具增加了一条有审计、需审批的
配置修复路径，但它并不会阻止 harness 的原生工具直接触碰文件。Codex app-server 回退和
API key 模型强制执行严格的单工具循环；当你想要
硬性限制时，应优先选择这些。

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

## Message rescue mode

Message rescue mode is the message-channel entrypoint for Crestodian: use it when your normal agent is dead but a trusted channel (for example WhatsApp) still receives commands.

支持的命令：`/crestodian <request>`。

```text
You, in a trusted owner DM: /crestodian status
OpenClaw: Crestodian 救援模式。Gateway 可达：否。配置有效：否。
You: /crestodian restart gateway
OpenClaw: 计划：重启 Gateway。回复 /crestodian yes 以应用。
You: /crestodian yes
OpenClaw: 已应用。已写入审计条目。
```

Agent creation can also be queued locally or via rescue:

```text
create agent work workspace ~/Projects/work model openai/gpt-5.5
/crestodian create agent work workspace ~/Projects/work
```

Remote rescue is an admin surface and must be treated like remote config repair, not normal chat.

远程救援的安全契约：

- 当该 agent/session 启用了 sandboxing 时会被禁用；Crestodian 会拒绝远程救援，并提示使用本地 CLI 修复。
- 默认有效状态为 `auto`：仅在受信任的 YOLO 运行中允许远程救援，此时运行时已经拥有未沙箱化的本地权限（`tools.exec.security` 解析为 `full` 且 `tools.exec.ask` 解析为 `off`，并且 sandbox mode 为 `off`）。
- 需要显式的 owner 身份；不支持通配发送者规则、开放群组策略、未认证 webhook 或匿名频道。
- 默认仅允许 owner 的 DM；群组/频道救援需要显式 opt-in。
- 插件搜索和列表为只读。插件安装始终仅限本地（即使其他情况下已启用，在救援中也会被阻止），因为它会下载可执行代码。插件卸载可以作为持久化救援操作获得批准。
- 远程救援不能打开本地 TUI 或切换到交互式 agent 会话；请使用本地 `openclaw` 进行 agent 交接。
- 持久化写入在救援模式下仍需要批准。
- 每个已应用的救援操作都会被审计。消息频道救援会记录 channel、account、sender 和 source-address 元数据；修改配置的操作还会记录修改前后的 config hash。
- 永不回显 secrets。SecretRef 检查只报告可用性，不报告值。
- 如果 Gateway 仍然存活，救援会优先使用 Gateway 的 typed 操作；如果它已死亡，救援只会使用不依赖正常 agent 循环的最小本地修复 surface。

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

- `enabled`：`"auto"`（默认）仅在有效运行时为 YOLO 且 sandboxing 关闭时允许救援；`false` 永不允许消息频道救援；`true` 在 owner/channel 检查通过时显式允许救援（但仍受 sandboxing 拒绝约束）。
- `ownerDmOnly`：将救援限制为 owner 的直接消息。默认 `true`。
- `pendingTtlMinutes`：在 `/crestodian yes` 批准之前，一个待处理的救援写入保持打开的时长，过期后失效。默认 `15`。

远程救援由 Docker 流水线覆盖：

```bash
pnpm test:docker:crestodian-rescue
```

无配置的本地规划器回退由以下测试覆盖：

```bash
pnpm test:docker:crestodian-planner
```

一个可选启用的 live channel 命令面检查会对 `/crestodian status` 以及通过救援处理器的持久化批准往返进行 smoke check：

```bash
pnpm test:live:crestodian-rescue-channel
```

通过显式 Crestodian 命令进行的无配置设置由以下内容覆盖：

```bash
pnpm test:docker:crestodian-first-run
```

该通道从一个空状态目录开始，验证现代的 onboard Crestodian entrypoint，设置默认模型，创建额外 agent，通过插件启用加上 token SecretRef 配置 Discord，验证配置，并检查审计日志。QA Lab 还有一个由仓库支持的场景覆盖同样的 Ring 0 流程：

```bash
pnpm openclaw qa suite --scenario crestodian-ring-zero-setup
```

## 相关内容

- [CLI 参考](/cli)
- [Doctor](/cli/doctor)
- [TUI](/cli/tui)
- [沙箱](/cli/sandbox)
- [安全](/cli/security)
