---
summary: "节点：配对、能力、权限，以及用于 canvas/camera/screen/device/notifications/system 的 CLI 辅助工具"
read_when:
  - 将 iOS/watchOS/Android 节点配对到网关
  - 使用 node canvas/camera 获取代理上下文
  - 添加新的节点命令或 CLI 辅助工具
title: "节点"
---

**节点**是一个伴随设备（macOS/iOS/watchOS/Android/无头设备），它通过 `role: "node"` 连接到网关，并通过 `node.invoke` 暴露一组命令接口（例如 `canvas.*`、`camera.*`、`device.*`、`notifications.*`、`system.*`）。大多数节点使用操作员端口上的网关 WebSocket。可选的直接 Apple Watch 节点则在同一端口上使用已签名的 HTTPS 轮询，因为 watchOS 会阻止普通应用进行通用的底层网络通信。协议详情：[网关协议](/gateway/protocol)。

旧版传输方式：[Bridge 协议](/gateway/bridge-protocol)（TCP JSONL；仅适用于当前节点的历史实现）。

macOS 也可以运行在**节点模式**中：菜单栏应用作为一个节点连接到网关的
WS 服务器（因此 `openclaw nodes …` 可针对这台 Mac 工作）。该应用将原生 Canvas、摄像头、屏幕、通知和计算机控制命令
添加到与 `openclaw node run` 相同的节点主机命令接口中。不要在那台 Mac 上启动
第二个 CLI 节点；该应用会将匹配的 CLI 节点主机运行时作为内部工作进程运行，并保持为唯一的网关连接和节点身份。

节点是**外设**，不是网关：它们不运行网关服务，且频道消息（Telegram、WhatsApp 等）会到达网关，而不是节点。

故障排查运行手册：[/nodes/troubleshooting](/nodes/troubleshooting)。

## 配对 + 状态

节点使用 **设备配对**。节点在连接时会展示经过签名的设备身份；网关会为 `role: node` 创建一个设备配对请求。可通过 devices CLI（或 UI）进行批准。直接的 Apple Watch 设置使用由管理员签发、短期有效的仅节点设置代码来批准其固定的低风险命令范围；之后如需扩展能力，仍需正常批准。

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
```

待处理的配对请求会在设备最后一次重试后的 5 分钟过期——持续重连的设备会让其唯一的待处理请求（以及 `requestId`）保持有效，而不是每隔几分钟生成一个新的提示；完整的请求/批准生命周期请参见 [节点配对](/gateway/pairing)。如果节点在重试时认证细节发生变化（角色/范围/公钥），先前的待处理请求会被替换，并创建一个新的 `requestId`——客户端会收到该被替换请求的 `device.pair.resolved` 事件，你应在批准前重新运行 `openclaw devices list`。

- `nodes status` 会在节点的设备配对角色包含 `node` 时将其标记为 **paired**。
- 已连接的原生 Mac 可以选择接收来自 **设置 -> 权限 -> 活跃电脑检测** 的合并物理输入活动。还需要启用辅助功能权限。网关会将最新的、符合条件的 Mac 标记为 `active`，为代理提供稳定的 node-id 提示，并在延迟回退之前将节点连接提醒路由到那里。有关设置、隐私、时序和故障排查，请参见 [活跃电脑状态](/nodes/presence)。
- 设备配对记录是持久化的已批准角色契约。令牌轮换始终发生在该契约之内；它不能将已配对节点升级为配对批准未曾授予的角色。
- `node.pair.*`（CLI：`openclaw nodes pending/approve/reject/remove/rename`）是一个独立的、由网关拥有的节点配对存储，用于跟踪节点在重新连接期间已批准的命令/能力范围。它**不会**控制传输认证——设备配对才会控制。
- `openclaw nodes remove --node <id|name|ip>` 会移除一个节点配对。对于由设备支持的节点，它会撤销已配对设备存储中的该设备 `node` 角色，并断开该设备的 node-role 会话：混合角色设备会保留其记录行，只会失去 `node` 角色，而仅节点设备的记录行会被删除。它还会清除独立节点配对存储中的任何匹配条目。`operator.pairing` 可以移除其他设备上的非 operator 节点记录；设备令牌调用方若要撤销其在混合角色设备上的自身 node 角色，则还需要 `operator.admin`。
- 批准范围遵循待处理请求中声明的命令：
  - 无命令请求：`operator.pairing`
  - 非 exec 节点命令：`operator.pairing` + `operator.write`
  - `system.run` / `system.run.prepare` / `system.which`：`operator.pairing` + `operator.admin`

## 版本偏移与升级顺序

Gateway WebSocket 在 N-1 协议窗口内接受已认证的节点客户端。
因此，当前的 v4 Gateway 在连接声明
`role: "node"` 和 `client.mode: "node"` 时会接受 v3 节点。Operator 和 UI 会话必须
仍然使用当前协议。

对于分阶段的集群升级，请先升级 Gateway，然后再升级每个节点。
N-1 节点在升级期间仍然可见且可管理；Gateway
会记录 `legacy node protocol accepted` 并给出升级建议。配对、
设备认证、命令允许列表和 exec 审批仍然适用。
由插件拥有的能力和命令会保持隐藏，直到该节点升级到
当前协议。早于 N-1 的节点需要先进行带外升级，然后才能
重新连接。

直接的 watchOS HTTPS 传输要求使用当前协议版本；在启用直连模式之前，
请先随 Gateway 一起更新手表应用。

## 远程节点主机（system.run）

当你的 Gateway 运行在一台机器上，而你希望命令在另一台机器上执行时，请使用 **node host**。模型仍然与 **gateway** 通信；当选择 `host=node` 时，gateway 会将 `exec` 调用转发到 **node host**。

| Role         | Responsibility                                                                           |
| ------------ | ---------------------------------------------------------------------------------------- |
| Gateway host | 接收消息、运行模型、路由工具调用。                                    |
| Node host    | 在 node 机器上执行 `system.run`/`system.which`。                                |
| Approvals    | 通过 node host 上的 `~/.openclaw/state/openclaw.sqlite#exec_approvals_config` 强制执行。 |

批准说明：

- 基于批准的 node 运行会绑定精确的请求上下文。exec 路径会在批准前准备一个规范化的 `systemRunPlan`；一旦获批，gateway 会转发该已存储的计划，而不是后续调用者编辑过的命令/cwd/session 字段，并且会在运行前重新验证工作目录。
- 对于直接的 shell/运行时文件执行，OpenClaw 还会尽最大努力绑定一个具体的本地文件操作数，并在执行前如果该文件发生变化则拒绝运行。
- 如果 OpenClaw 无法为解释器/运行时命令精确识别出一个具体的本地文件，则会拒绝基于批准的执行，而不是假装覆盖了完整的运行时语义。对于更广泛的解释器语义，请使用沙箱、独立主机，或显式受信任的允许列表/完整工作流。

### 启动 node 主机（前台）

在 node 机器上：

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name "Build Node"
```

`node run` 还接受 `--context-path`（Gateway WS 上下文路径）、`--tls`、`--tls-fingerprint <sha256>` 和 `--node-id`（覆盖旧版客户端实例 ID；这不会重置配对）。在 macOS 上，传入 `--share-installed-apps` 以发布 `device.apps`；默认情况下共享是关闭的。使用 `--no-share-installed-apps` 可禁用先前保存的可选共享设置。

### 通过 SSH 隧道连接远程 gateway（回环绑定）

如果 Gateway 绑定到回环地址（`gateway.bind=loopback`，本地模式下默认如此），远程 node 主机将无法直接连接。请创建 SSH 隧道，并将 node 主机指向隧道的本地端。

示例（node 主机 -> gateway 主机）：

```bash
# 终端 A（保持运行）：将本地 18790 转发到 gateway 127.0.0.1:18789
ssh -N -L 18790:127.0.0.1:18789 user@gateway-host

# 终端 B：导出 gateway 令牌并通过隧道连接
export OPENCLAW_GATEWAY_TOKEN="<gateway-token>"
openclaw node run --host 127.0.0.1 --port 18790 --display-name "构建节点"
```

注意：

- `openclaw node run` 支持令牌或密码认证。
- 优先使用环境变量：`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`。
- 配置回退项是 `gateway.auth.token` / `gateway.auth.password`。
- 在本地模式下，node 主机会刻意忽略 `gateway.remote.token` / `gateway.remote.password`。
- 在远程模式下，`gateway.remote.token` / `gateway.remote.password` 按远程优先级规则可用。
- 如果已配置但未解析的活动本地 `gateway.auth.*` SecretRefs，node 主机认证会失败关闭。
- node 主机认证解析只接受 `OPENCLAW_GATEWAY_*` 环境变量。

### 启动 node 主机（服务）

```bash
openclaw node install --host <gateway-host> --port 18789 --display-name "Build Node"
openclaw node start
openclaw node restart
```

`node install` 还支持 `--context-path`、`--tls`、`--tls-fingerprint`、`--node-id`（仅限旧版客户端实例 ID）、`--share-installed-apps` / `--no-share-installed-apps`、`--runtime <node>`（默认：node）以及用于重新安装的 `--force`。此外，还提供 `node status`、`node stop` 和 `node uninstall`。

### 配对 + 命名

在网关主机上：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

如果节点使用更改后的认证详细信息重试，请重新运行 `openclaw devices list` 并批准当前的 `requestId`。

命名选项：

- `--display-name` on `openclaw node run` / `openclaw node install`（会与客户端实例 ID 和网关连接元数据一起持久保存到共享的 `node_host_config` SQLite 行中）。
- `openclaw nodes rename --node <id|name|ip> --name "构建节点"`（网关覆盖）。

### 节点托管的 MCP 服务器

请在节点机器上的 `openclaw.json` 中配置 MCP 服务器，而不是在
Gateway 上配置：

```json5
{
  nodeHost: {
    mcp: {
      servers: {
        localDocs: {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-filesystem", "/srv/docs"],
          toolFilter: {
            include: ["read_*", "search"],
          },
        },
        internalApi: {
          url: "https://mcp.internal.example/mcp",
          transport: "streamable-http",
          headers: {
            Authorization: "Bearer ${INTERNAL_MCP_TOKEN}",
          },
        },
      },
    },
  },
}
```

无头节点主机会启动这些服务器，列出它们的工具，并在连接后发布
描述信息。工具调用会通过 `mcp.tools.call.v1` 返回到该节点；Gateway
不需要匹配的 MCP 配置或 JS
插件。不支持在此节点托管的 v1 路径中使用 OAuth MCP 服务器。

当前的节点主机在初始配对期间会声明内置的 `mcp.tools.call.v1` 命令家族，
即使没有配置任何 MCP 服务器也是如此。使用较旧 OpenClaw 版本配对的节点在
节点主机更新后，可能会请求一次性的命令面升级。之后添加、移除或过滤服务器
都不需要重新配对，因为已批准的命令家族没有变化。要应用节点 MCP 配置更改，
请重启 `openclaw node run` 或 `openclaw node restart`；节点主机不会监视此配置。

Gateway 运营者可以通过 `gateway.nodes.pluginTools.enabled: false` 忽略所有由已配对节点发布、对代理可见的工具，包括节点托管的 MCP 工具。像 `gateway.nodes.commands.deny: ["mcp.tools.call.v1"]` 这样的精确命令拒绝也会阻止执行。

### 节点托管技能

将技能安装在节点机器当前激活的 OpenClaw 技能目录下，默认是
`~/.openclaw/skills`。`OPENCLAW_HOME`、`OPENCLAW_STATE_DIR` 和
`OPENCLAW_CONFIG_PATH` 会移动该活动配置文件。对于技能而言，`OPENCLAW_STATE_DIR` 具有优先级；否则，`skills/` 位于
`openclaw config file` 打印出的路径旁边。无头节点主机在连接后会发布有效的 `SKILL.md` 文件，而 Gateway 仅在该节点保持连接期间将它们添加到代理技能快照中。每个技能目录名称必须与 `name`
frontmatter 字段匹配，这样抽象节点定位器就能映射到一个条目，而无需再添加另一个协议字段。

初始的节点角色配对会批准技能发布。添加、移除或
更改技能不需要再次配对或修改 Gateway 配置。
更改节点技能文件后，请重启 `openclaw node run` 或 `openclaw node restart`；节点主机不会监视技能目录。

节点托管的技能条目会标识它们的节点并携带其执行
位置。技能文件、引用的相对路径以及二进制文件都保留在
该节点上。代理使用普通的 `read` 工具读取所公布的
`node://.../SKILL.md` 位置。`file_fetch` 接受经操作员批准的节点绝对路径，而不是节点技能定位符；没有普通读取工具的运行时可以改为通过
`exec host=node node=<node-id>` 运行 `cat SKILL.md`，并将公布的
`node://.../skills/<name>` 目录作为 `workdir`。引用的文件和二进制文件使用相同的 exec 目标和 `workdir`。节点主机会根据其活动的 OpenClaw 状态目录解析该定位符，因此相对路径是在节点上解析，而不是在 Gateway 机器上解析。发布该技能的节点必须已批准 `system.run`，并且代理的 exec 策略必须允许 `host=node`；否则该技能会留在该代理的快照之外。

将节点上的 `nodeHost.skills.enabled` 设为 `false` 可停止发布。Gateway
操作员可以通过 `gateway.nodes.allowSkills: false` 忽略来自所有已配对节点的技能。

### 无头身份状态

无头节点在共享 SQLite 中保留三条独立的状态记录：

- `~/.openclaw/state/openclaw.sqlite`（`node_host_config`）：客户端实例 ID、显示名称以及 Gateway 连接元数据。
- `~/.openclaw/state/openclaw.sqlite`（`device_identities`，键 `primary`）：已签名的设备密钥对以及派生出的加密设备 ID。
- `~/.openclaw/state/openclaw.sqlite`（`device_auth_tokens`）：按加密设备 ID 和角色键控的已配对设备认证令牌。

对于已签名节点，Gateway 使用加密设备 ID 进行配对和节点路由。客户端实例 ID 仅是连接元数据。因此，更改 `--node-id` 或迁移已退役的 `node.json` 不会重置配对。有关受支持的撤销并重新配对流程以及升级说明，请参见[身份和配对状态](/cli/node#identity-and-pairing-state)。

已退役的 `identity/device.json` 和 `identity/device-auth.json` 文件是由 Doctor 管理的迁移输入。停止节点主机并运行 `openclaw doctor --fix`；Doctor 会在删除旧文件之前，将它们的行导入并验证到 SQLite 中。

### 允许命令加入白名单

exec 批准是**按 node 主机**进行的。通过 gateway 添加允许列表条目：

```bash
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/uname"
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/sw_vers"
```

批准信息保存在 node 主机上的
`~/.openclaw/state/openclaw.sqlite#exec_approvals_config` 中。

### 将 exec 指向 node

配置默认值（网关配置）：

```bash
openclaw config set tools.exec.host node
openclaw config set tools.exec.mode allowlist
openclaw config set tools.exec.node "<id-or-name>"
```

或者在每个会话中：

```text
/exec host=node security=allowlist node=<id-or-name>
```

一旦设置，任何 `host=node` 的 `exec` 调用都会在 node 主机上运行（受 node 允许列表/批准限制）。

`host=auto` 不会自动选择 node，但可以从 `auto` 中发出明确的单次 `host=node` 请求。如果你希望 node exec 成为该会话的默认值，请显式设置 `tools.exec.host=node` 或 `/exec host=node ...`。

相关：

- [Node 主机 CLI](/cli/node)
- [Exec 工具](/tools/exec)
- [Exec 审批](/tools/exec-approvals)

### 本地模型推理

桌面或服务器 node 可以从运行在该 node 上的 Ollama 服务器暴露支持聊天的模型。代理使用 Ollama 插件的 `node_inference` 工具来发现已安装的模型，并远程运行一个有边界的提示；Gateway 无需直接访问 Ollama 网络。有关设置、模型过滤和直接验证命令，请参见 [Ollama 节点本地推理](/providers/ollama#node-local-inference)。

### Codex 会话和转录

官方 `codex` 插件可以在无头节点主机或原生 macOS 节点上公开未归档的 Codex 会话。目录注册不再依赖于 `supervision.enabled`；该选项用于控制面向代理的监督工具。将 Codex 插件配置中的 `sessionCatalog.enabled: false` 设置为 false，可在不禁用提供程序或 harness 的情况下，禁用操作员目录和配对节点目录命令。

该插件仍必须在两台计算机上处于活动状态，并且节点设置仍然是本地同意：仅启用 Gateway 无法读取另一台计算机的 Codex 状态。

节点会公布带版本的只读
`codex.appServer.threads.list.v1` 和
`codex.appServer.thread.turns.list.v1` 命令。可使用 Codex CLI 的原生节点主机还会公布 `codex.terminal.resume.v1`。当这些命令首次出现时，请批准节点配对升级。Gateway 会通过正常的插件节点策略调用它们，并按主机隔离故障。

配对节点行会在常规会话侧边栏中显示为一个 **Codex** 组。
在每个主机内，行默认按项目文件夹分组；位于 `.claude/worktrees/<name>` 下的工作目录会折叠到其源仓库中，并且项目组的折叠方式与其他侧边栏部分相同。使用目录标题中的文件夹图标可展开或恢复项目组。相同的分组规则也适用于 Claude 会话目录。

默认情况下，选择一行会打开常规 Chat 面板，并通过带边界、游标分页的
`thread/turns/list` 调用读取其持久化转录，且返回完整项目投影。可使用行菜单、查看器标题，或 **在以下位置打开 Codex/Claude 会话** 首选项，在拥有该会话的计算机上的操作员终端中启动 `codex resume <thread-id>`。配对节点终端路径是由 Codex 插件拥有的白名单 PTY 中继，而不是任意节点命令执行。

该中继不提供完整的 OpenClaw harness 续接和归档所有权契约。因此，远程行不提供 **继续** 和 **归档**。在 Gateway 计算机上，已存储和空闲的行可以启动一个独立的、模型锁定的 Chat 分支。只有在操作员确认没有其他 Codex 客户端正在使用它之后，任一项才能归档；已存储行的实时活动仍然未知。活动行不能分支或归档。

有关设置、分页、本地续接以及元数据安全边界，请参阅 [监督 Codex 会话](/plugins/codex-supervision)。

### Claude 会话和转录

捆绑的 `anthropic` 插件默认会在 Gateway 和已配对节点上发现未归档的 Claude CLI 和 Claude Desktop 会话。将 `plugins.entries.anthropic.config.sessionCatalog.enabled: false` 设为 false，即可在不禁用 Anthropic 模型或 Claude CLI 后端的情况下，关闭操作员目录和已配对节点目录命令。
当启用 Anthropic 插件且 `~/.claude/projects/` 存在时，远程 macOS 应用节点会声明 `anthropic.claude.sessions.list.v1` 和 `anthropic.claude.sessions.read.v1`。当这些命令首次出现时，批准节点配对升级。

如果可用 Claude CLI，本机节点主机还会声明 `anthropic.claude.terminal.resume.v1`。符合条件的 CLI 和 Desktop 行可以在其所属主机上的操作员终端中打开 `claude --resume <session-id>`。这会接管本地会话；与 OpenClaw 采用不同，它不会先分叉 Claude 会话。

目录会将有效的 Claude CLI 项目索引记录与针对未索引 JSONL 转录的有界元数据回退相结合。该回退会识别并发的非 sidechain 交互式（`cli`）会话以及无头 Agent SDK CLI（`sdk-cli`）会话。Claude Desktop 的本地元数据会提供 Desktop 标题和归档状态。当两种来源指向同一个 Claude Code 会话 ID 时，以 Desktop 元数据为准；仅限 CLI 的转录仍然可见，因为 CLI 没有归档标志。转录读取使用不透明的字节偏移游标和有界的向后文件读取，因此选择大型会话或加载较旧页面时，不会将整个 JSONL 历史一次性读入单个 Gateway 响应中。

列表和读取命令是只读的。它们仅通过通用的 `sessions.catalog.list` 和 `sessions.catalog.read` 方法，将目录元数据和转录内容暴露给具有 `operator.write` 的已认证操作员连接。Gateway 本地的 Claude CLI 行可以从常规 Chat composer 中接管：OpenClaw 导入受限的可见历史，在第一轮使用 `--fork-session` 恢复，并保持源转录不变。

无头节点主机可以选择接入相同的续接流程：

```json5
{
  nodeHost: {
    agentRuns: {
      claude: { enabled: true },
    },
  },
}
```

只有当该节点本地设置启用且 `claude` 可执行文件在该节点上可解析时，节点才会声明 `agent.cli.claude.run.v1`。Gateway 不能远程启用它。该命令还会沿用节点现有的 exec 审批策略。当这三个 Claude 命令都被 Gateway 的节点命令策略声明且允许时，该节点上的 Claude CLI 行就变得可续接：OpenClaw 导入受限历史，将接管的会话绑定到该节点及其目录报告的工作目录，并在那里运行每个一次性的 `claude -p` 轮次。第一轮仍然使用 `--fork-session`，从而保留源转录。

在节点上执行的轮次使用该节点的 Claude 默认配置。在 v1 中，它们不会接收 Gateway 回环 MCP 配置或 Gateway skills 插件，不能从 Gateway 转录重新播种，并且会拒绝附件和图像。Claude Desktop 行以及未声明运行命令的节点仍然只能查看。macOS 应用节点目前还不声明此命令，因此其行仍然是只读的。

有关控制 UI 行为和存储来源，请参见 [Anthropic: 跨计算机的 Claude 会话](/providers/anthropic#claude-sessions-across-computers)。

### OpenCode 和 Pi 会话

捆绑的 OpenCode 和 ACPX 插件也会在 Gateway 和已配对节点上发现只读的原生会话
目录。当安装了 `opencode`
CLI 时，节点会声明 `opencode.sessions.list.v1` / `opencode.sessions.read.v1`，当存在 Pi 的会话目录时，会声明 `acpx.pi.sessions.list.v1` / `acpx.pi.sessions.read.v1`。
当首次出现新命令时，请批准节点配对升级。当匹配的 CLI 也可用时，节点会添加
`opencode.terminal.resume.v1` 或 `acpx.pi.terminal.resume.v1`；此时，现有的行
菜单和查看器标题栏就可以使用 `opencode --session <id>` 或 `pi --session <id>`
在其所属终端中重新打开所选会话。

OpenCode 通过其官方 CLI JSON/export 接口读取。Pi 读取其
文档化的 JSONL 会话存储，包括项目和全局 `settings.json`
会话目录，以及 `PI_CODING_AGENT_DIR` 和
`PI_CODING_AGENT_SESSION_DIR` 覆盖项。两个目录默认都启用；
可在 Web UI 的 **Config > Plugins** 下将其关闭。

终端恢复使用存储的会话工作目录，以及与 Codex 和 Claude 相同的
允许列表双工 PTY 中继。它不会暴露任意
节点命令执行。

### 终端文件上传

控制界面可以将文件拖入已打开的配对节点终端。原生节点主机会公开仅限管理员使用的 `terminal.upload` 命令；当首次出现配对升级提示时，请予以批准。每个文件的大小限制为 16 MiB，会先暂存到该节点上的私有临时目录中，并以经过 shell 转义的路径返回到终端，而不会执行该路径。

路径插入支持 PowerShell、`cmd.exe` 以及可识别的 POSIX shell（`sh`、Bash、Dash、Ash、Ksh、Zsh 和 Fish），包括 Windows 上的 Git Bash。其他 shell 覆盖会被拒绝，因为无法安全推断其引用规则；若要使用原生 WSL 路径，请在 WSL 内运行节点主机。包含 `%` 或 `!` 的 `cmd.exe` 路径也会被拒绝，因为即使在双引号内，该 shell 也会展开这些字符。

## 调用命令

低层级（原始 RPC）：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command canvas.eval --params '{"javaScript":"location.href"}'
```

`nodes invoke` 会阻止 `system.run` 和 `system.run.prepare`；这些命令只能通过带有 `host=node` 的 `exec` 工具运行（见上文）。对于常见的“给代理一个媒体附件”工作流（画布、相机、屏幕、位置，见下文），也存在更高级的辅助工具。

长时间运行的流式节点命令使用增量式的 `node.invoke.progress`
事件。每个事件都包含调用 ID、从零开始的序列号，以及一个
有界的 UTF-8 文本块；Gateway 会在将这些块交付给
调用方之前先进行排序。现有的 `node.invoke.result` 仍然是唯一的终态
响应。流式调用方可以设置一个非活动截止时间，它从
第一个 progress 事件开始，并在后续 progress 到来时重置，同时在审批和执行期间保留该调用的独立硬超时。结果、硬
超时、非活动超时以及节点断开连接都会丢弃待处理的流状态。调用方取消会发出 `node.invoke.cancel`；随后节点主机将终止匹配的进程树。现有的请求/响应命令保持不变。

## 命令策略

在可以调用节点命令之前，必须通过两个门槛：

1. 该节点必须在其经过身份验证的连接元数据（`connect.commands`）中声明该命令。
2. 网关基于平台和审批得出的允许列表必须包含该已声明的命令。

按平台划分的默认允许列表（在插件默认值以及 `commands.allow`/`commands.deny` 覆盖之前）：

| 平台 | 默认允许的命令                                                                                                                                                                                                                                                                                                                                 |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS      | `camera.list`, `location.get`, `device.info`, `device.status`, `contacts.search`, `calendar.events`, `reminders.list`, `photos.latest`, `motion.activity`, `motion.pedometer`, `system.notify`                                                                                                                                                              |
| watchOS  | `device.info`, `device.status`, `system.notify`                                                                                                                                                                                                                                                                                                             |
| Android  | `camera.list`, `location.get`, `notifications.list`, `notifications.actions`, `system.notify`, `device.info`, `device.status`, `device.permissions`, `device.health`, `device.apps`, `contacts.search`, `calendar.events`, `callLog.search`, `reminders.list`, `photos.latest`, `motion.activity`, `motion.pedometer`, `mobile.ui.observe`, `mobile.ui.act` |
| macOS    | `camera.list`, `camera.ptz.status`, `location.get`, `device.info`, `device.status`, `device.apps`, `contacts.search`, `calendar.events`, `reminders.list`, `photos.latest`, `motion.activity`, `motion.pedometer`, `system.notify`, `computer.act`                                                                                                          |
| Windows  | `camera.list`, `location.get`, `device.info`, `device.status`, `system.notify`, `computer.act`                                                                                                                                                                                                                                                              |
| Linux    | `system.notify`, `computer.act`（像 `system.run` 这样的节点主机命令需要审批门控，见下文）                                                                                                                                                                                                                                                        |

这些行描述的是网关策略上限，而不是每个节点应用实现的命令。只有当已连接节点也声明了该命令时，该命令才可用。特别是，Android 仅在启用辅助功能控制时才会公开移动端 UI 命令，而桌面节点仅在其本地 Computer Control 实现器启用时才会公开 `computer.act`。当前 macOS 应用并不声明 macOS 策略行中列出的设备与个人数据相关命令族。

`canvas.*` 命令（`canvas.present`、`canvas.hide`、`canvas.navigate`、`canvas.eval`、`canvas.snapshot`、`canvas.a2ui.*`）是 iOS、Android、macOS、Windows、Linux 以及未知平台上的插件默认命令。Linux 节点仅在桌面应用的本地 Canvas 套接字存在时才会声明它们。所有 Canvas 命令在 iOS 上都受前台限制。

`talk.ptt.start`、`talk.ptt.stop`、`talk.ptt.cancel` 和 `talk.ptt.once` 对于任何声明了 `talk` 能力或声明了 `talk.*` 命令的节点，都会默认允许，与平台标记无关。

桌面主机命令（`system.run`、`system.run.prepare`、`system.which`、`browser.proxy`、`browser.proxy.upload.v1`、`mcp.tools.call.v1`，以及 macOS/Windows/Linux 上的 `screen.snapshot`）不属于上述静态平台默认表的一部分。在操作员批准声明了这些命令的配对请求后，它们才会变为可用；此后，节点的已批准命令集会在重新连接时继续保留这些命令。

危险或高度涉及隐私的命令需要通过 `gateway.nodes.commands.allow` 进行一次性持久选择加入，即使节点声明了这些命令也是如此：`camera.snap`、`camera.clip`、`camera.ptz.control`、`screen.record`、`contacts.add`、`calendar.add`、`reminders.add`、`health.summary`、`sms.send`、`sms.search`。`gateway.nodes.commands.deny` 始终优先于默认值和额外的允许列表条目。有关 iPhone 同意门槛，请参阅 [HealthKit 摘要](/platforms/ios-healthkit)；有关桌面输入相关的本地启用、配对、能力和工具策略门槛，请参阅 [计算机使用](/nodes/computer-use)。

插件拥有的节点命令可以添加网关节点调用策略。该策略会在允许列表检查之后、转发到节点之前执行，因此原始 `node.invoke`、CLI 帮助工具和专用代理工具共享相同的插件权限边界。危险的插件节点命令仍然需要显式的 `gateway.nodes.commands.allow` 同意。

节点更改其声明的命令列表后，请重新连接该节点，检查 `openclaw nodes pending`，并使用 `openclaw nodes approve <requestId>` 批准扩展后的命令范围，以便网关存储更新后的命令快照。

## 配置（`openclaw.json`）

节点相关设置位于 `gateway.nodes` 和 `tools.exec` 下：

```json5
{
  gateway: {
    nodes: {
      // 从受信任网络（CIDR 列表）自动批准首次节点配对。
      // 未设置时禁用。仅适用于无请求 scopes 的首次 role:node 请求；
      // 不会自动批准升级。
      pairing: {
        autoApproveCidrs: ["192.168.1.0/24"],
        // SSH 验证的自动批准（默认：启用）。
        // 通过 SSH 读回的设备密钥精确匹配，批准首次节点配对。
        sshVerify: true,
      },
      // 信任由已配对节点发布、代理可见的插件工具（默认：true）。
      pluginTools: {
        enabled: true,
      },
      // 持久化启用高风险/隐私敏感的节点命令（camera.snap 等）。
      commands: {
        allow: ["camera.snap", "screen.record"],
        // 即使默认配置或 commands.allow 中包含，也会阻止精确命令名。
        deny: ["camera.clip"],
      },
    },
  },
  tools: {
    exec: {
      // 默认 exec 主机："node" 将所有 exec 调用路由到已配对的节点。
      host: "node",
      // 节点 exec 的安全模式：仅允许已批准/已加入允许列表的命令。
      security: "allowlist",
      // 将 exec 固定到特定节点（id 或 name）。省略则允许任意节点。
      node: "build-node",
    },
  },
}
```

使用精确的节点命令名称。`commands.deny` 会移除某个命令，即使平台默认值或 `commands.allow` 条目本来会允许它。已配对节点默认可以发布代理可见的插件工具描述，但每个描述中的命令仍必须位于节点已批准的命令范围内。将 `gateway.nodes.pluginTools.enabled` 设为 `false` 可忽略所有此类描述。有关 gateway 节点配对和命令策略字段的详细信息，请参阅 [Gateway 配置参考](/gateway/configuration-reference#gateway)。

按代理覆盖 exec 节点：

```json5
{
  agents: {
    list: [
      {
        id: "main",
        tools: { exec: { node: "build-node" } },
      },
    ],
  },
}
```

## 截图（canvas 快照）

如果节点正在显示 Canvas（WebView），`canvas.snapshot` 会返回 `{ format, base64 }`。

CLI 辅助工具（写入临时文件并打印保存路径）：

```bash
openclaw nodes canvas snapshot --node <idOrNameOrIp> --format png
openclaw nodes canvas snapshot --node <idOrNameOrIp> --format jpg --max-width 1200 --quality 0.9
```

### Canvas 控件

```bash
openclaw nodes canvas present --node <idOrNameOrIp> --target https://example.com
openclaw nodes canvas hide --node <idOrNameOrIp>
openclaw nodes canvas navigate https://example.com --node <idOrNameOrIp>
openclaw nodes canvas eval --node <idOrNameOrIp> --js "document.title"
```

注意：

- `canvas present` 接受 URL 或本地文件路径（`--target`），适用于支持本地路径的节点，并支持可选的 `--x/--y/--width/--height` 进行定位。Linux Canvas 接受 HTTP(S) URL 或其内置的 A2UI 渲染器。
- `canvas eval` 接受内联 JS（`--js`）或位置参数。

### A2UI（Canvas）

```bash
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --text "Hello"
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --jsonl ./payload.jsonl
openclaw nodes canvas a2ui reset --node <idOrNameOrIp>
```

注意：

- 移动端和 Linux 桌面节点使用一个内置的、由应用拥有的 A2UI 页面来进行支持操作的渲染。
- 仅支持 A2UI v0.8 JSONL（v0.9/createSurface 会被拒绝）。
- iOS 和 Android 渲染远程 Gateway Canvas 页面，但 A2UI 按钮操作只会从内置的、由应用拥有的 A2UI 页面分发。在这些移动客户端上，Gateway 托管的 HTTP/HTTPS A2UI 页面仅用于渲染。
- macOS 可以从应用选择的、精确按能力范围隔离的 Gateway A2UI 页面分发操作。其他 HTTP/HTTPS 页面仍然仅用于渲染。
- Linux 仅从内置的 A2UI 页面分发操作。其他 HTTP/HTTPS 页面仍然仅用于渲染，而且没有桌面应用的无头 Linux 节点不会公开 Canvas。

## 照片 + 视频（节点摄像头）

照片（`jpg`）：

```bash
openclaw nodes camera list --node <idOrNameOrIp>
openclaw nodes camera snap --node <idOrNameOrIp>            # 默认：一张由节点选择的照片
openclaw nodes camera snap --node <idOrNameOrIp> --facing front
openclaw nodes camera snap --node <idOrNameOrIp> --facing both # 先前置再后置（保存 2 个路径）
openclaw nodes camera snap --node <idOrNameOrIp> --device-id <id> --max-width 1200 --quality 0.9 --delay-ms 2000
```

视频片段（`mp4`）：

```bash
openclaw nodes camera clip --node <idOrNameOrIp> --duration 10s
openclaw nodes camera clip --node <idOrNameOrIp> --duration 3000 --no-audio
```

注意：

- 节点必须处于**前台**才能使用 `canvas.*` 和 `camera.*`（后台调用将返回 `NODE_BACKGROUND_UNAVAILABLE`）。
- 节点会限制片段时长，以保持 base64 负载可管理（关于各平台的具体限制，请参见 [摄像头捕获](/nodes/camera)）。`nodes` 代理工具在转发调用前也会将请求的 `durationMs` 上限设为 300000（5 分钟）；节点本身会应用更严格的限制。
- 在可能的情况下，Android 会提示请求 `CAMERA`/`RECORD_AUDIO` 权限；如果权限被拒绝，将失败并返回 `*_PERMISSION_REQUIRED`。

## 屏幕录制（节点）

受支持的节点会暴露 `screen.record`（mp4）。示例：

```bash
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10 --no-audio
```

注意：

- `screen.record` 的可用性取决于节点平台。
- `nodes` 代理工具会将请求的 `durationMs` 上限限制为 300000（5 分钟）；节点可能会施加更严格的限制，以约束返回的负载大小。
- `--no-audio` 会在受支持的平台上禁用麦克风采集。
- 当可用多个屏幕时，使用 `--screen <index>` 选择显示器（0 = 主屏幕）。

## 位置（节点）

当在设置中启用位置时，节点会公开 `location.get`。

CLI 辅助命令：

```bash
openclaw nodes location get --node <idOrNameOrIp>
openclaw nodes location get --node <idOrNameOrIp> --accuracy precise --max-age 15000 --location-timeout 10000
```

注意：

- 位置默认处于**关闭**状态。
- “始终”需要系统权限；后台获取尽力而为。
- 响应包含纬度/经度、精度（米）和时间戳。
- 完整的参数/响应结构和错误代码： [位置命令](/nodes/location-command)。

## SMS（Android 节点）

当用户授予 **SMS** 权限且设备支持电话功能时，Android 节点可以提供 `sms.send` 和 `sms.search`。这两个命令默认都是危险的：网关操作员还必须将它们添加到 `gateway.nodes.commands.allow`，之后才能调用（请参见 [命令策略](#command-policy)）。

对于只读的 SMS 搜索，请在 `openclaw.json` 中显式启用：

```json5
{
  gateway: {
    nodes: {
      commands: { allow: ["sms.search"] },
    },
  },
}
```

仅在节点也应能够发送消息时，单独添加 `sms.send`。Android 权限和 Gateway 命令授权是相互独立的；授予电话权限不会修改 Gateway 策略。

低级调用：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command sms.send --params '{"to":"+15555550123","message":"来自 OpenClaw 的问候"}'
```

注意：

- `sms.search` 可以在授予 `READ_SMS` 之前声明，因此一次调用可能会返回权限诊断；读取消息仍然需要该 Android 权限。
- 仅支持 Wi-Fi、没有电话功能的设备不会公布 `sms.send`。
- `requires explicit gateway.nodes.commands.allow opt-in` 错误表示手机已经声明了该命令，但 Gateway 操作员尚未授权。

## 设备和个人数据命令

iOS 和 Android 节点默认会公开若干只读数据命令（参见 [命令策略](#command-policy) 表）；Android 还会额外公开一组受其应用内设置控制的命令。macOS 或无头 mac 的 TypeScript 节点宿主只有在操作员通过 `--share-installed-apps` 启用已安装应用共享后，才会公开 `device.apps`。

可用族：

- `device.status`, `device.info` — iOS, Android, Windows.
- `device.permissions`, `device.health` — 仅 Android。
- `device.apps` — Android、macOS 和无头 mac 节点。Android 需要在设置中启用已安装应用共享，并默认返回启动器可见的应用。TypeScript 节点宿主默认关闭共享，并接受 `query`、`limit` 和 `includeSystem`；macOS 结果包含 `label`、`bundleId`、`path` 和 `system`。
- `notifications.list`, `notifications.actions` — 仅 Android。
- `photos.latest` — iOS, Android.
- `contacts.search` — iOS、Android（默认只读）；`contacts.add` 是危险操作，需要 `gateway.nodes.commands.allow`。
- `calendar.events` — iOS、Android（默认只读）；`calendar.add` 是危险操作，需要 `gateway.nodes.commands.allow`。
- `reminders.list` — iOS、Android（默认只读）；`reminders.add` 是危险操作，需要 `gateway.nodes.commands.allow`。
- `callLog.search` — 仅 Android。
- `motion.activity`, `motion.pedometer` — iOS, Android；由可用传感器能力控制。

示例调用：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command device.status --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command device.apps --params '{"limit":10}'
openclaw nodes invoke --node <idOrNameOrIp> --command notifications.list --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command photos.latest --params '{"limit":1}'
```

## 系统命令（node host / mac node）

macOS 节点公开了 `system.run`、`system.which`、`system.notify` 和 `system.execApprovals.get/set`。无头节点主机公开了 `system.run.prepare`、`system.run`、`system.which` 和 `system.execApprovals.get/set`。

示例：

```bash
openclaw nodes notify --node <idOrNameOrIp> --title "Ping" --body "网关已就绪"
openclaw nodes invoke --node <idOrNameOrIp> --command system.which --params '{"bins":["git"]}'
```

注意：

- `system.run` 会在负载中返回 stdout/stderr/退出代码。
- Shell 执行现在通过带有 `host=node` 的 `exec` 工具进行；对于显式节点命令，`nodes` 仍然是直接 RPC 接口。
- `nodes invoke` 不会公开 `system.run` 或 `system.run.prepare`；它们仅保留在 exec 路径上。
- exec 路径会在审批前准备规范化的 `systemRunPlan`。审批获准后，网关会转发已存储的计划，而不是调用方之后编辑的 command/cwd/session 字段。
- `system.notify` 会遵循 macOS 应用中的通知权限状态；支持 `--priority <passive|active|timeSensitive>` 和 `--delivery <system|overlay|auto>`。
- 未识别的节点 `platform` / `deviceFamily` 元数据会使用保守的默认允许列表，其中排除 `system.run` 和 `system.which`。如果确实需要在未知平台上使用这些命令，请通过 `gateway.nodes.commands.allow` 显式添加。
- `system.run` 请求支持 `cwd`、`env` 映射、`timeoutMs` 和 `needsScreenRecording` —— 这些是由 exec 路径传递的请求负载字段（见上文），而不是 `nodes invoke` CLI 标志。
- 对于 Shell 包装器（`bash|sh|zsh ... -c/-lc`），请求作用域内的 `env` 值会被缩减为显式允许列表（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。
- 对于允许列表模式下的始终允许决策，已知的分发包装器（`env`、`flock`、`nice`、`nohup`、`stdbuf`、`timeout`）会持久化内部可执行文件路径，而不是包装器路径。如果解除包装不安全，则不会自动持久化允许列表条目。
- 在处于允许列表模式的 Windows 节点主机上，通过 `cmd.exe /c` 运行 Shell 包装器需要审批（仅允许列表条目不会自动允许该包装器形式）。
- 节点主机会忽略 `env` 对象中的 `PATH` 覆盖，并在运行命令前移除一组规模较大且经过维护的解释器/Shell 启动变量（例如 `NODE_OPTIONS`、`PYTHONPATH`、`BASH_ENV`、`DYLD_*`、`LD_*`）。如果需要额外的 PATH 条目，请配置节点主机服务环境（或将工具安装到标准位置），而不要通过 `env` 传递 `PATH`。
- 在 macOS 节点模式下，`system.run` 受 macOS 应用中的 exec 审批控制（设置 → Exec approvals）。Ask/allowlist/full 的行为与无头节点主机相同；被拒绝的提示会返回 `SYSTEM_RUN_DENIED`。
- 在无头节点主机上，`system.run` 受本地 SQLite exec approvals 行控制；具体 macOS 情况请参阅下方[无头节点主机](#headless-node-host-cross-platform)中的 exec 主机路由环境变量。

## Exec 节点绑定

当有多个节点可用时，你可以将 exec 绑定到特定节点。这会为 `exec host=node` 设置默认节点（并且可按 agent 覆盖）。

全局默认值：

```bash
openclaw config set tools.exec.node "node-id-or-name"
```

按 agent 覆盖：

```bash
openclaw config get agents.entries
openclaw config set 'agents.entries.main.tools.exec.node' "node-id-or-name"
```

取消设置以允许任意节点：

```bash
openclaw config unset tools.exec.node
openclaw config unset 'agents.entries.main.tools.exec.node'
```

## 权限映射

节点可以在 `node.list` / `node.describe` 中包含一个 `permissions` 映射，以权限名称为键（例如 `screenRecording`、`accessibility`、`location`），其值为布尔值（`true` = 已授予）。

## 无界面节点宿主（跨平台）

OpenClaw 可以运行一个 **无界面节点宿主**（无 UI），它连接到 Gateway WebSocket 并暴露 `system.run` / `system.which`。这在 Linux/Windows 上很有用，或者可用于在服务器旁运行一个最小节点。

启动它：

```bash
openclaw node run --host <gateway-host> --port 18789
```

注意：

- 仍然需要配对（Gateway 将显示设备配对提示）。
- 客户端实例元数据、已签名的设备身份以及配对认证使用独立的状态记录；请参见 [无界面身份状态](#headless-identity-state)。
- 执行审批会在本地强制执行，位于
  `~/.openclaw/state/openclaw.sqlite#exec_approvals_config`（参见 [执行审批](/tools/exec-approvals)）。
- 在 macOS 上，无界面节点宿主默认会在本地执行 `system.run`。设置 `OPENCLAW_NODE_EXEC_HOST=app` 可将 `system.run` 路由到配套应用的执行宿主；再添加 `OPENCLAW_NODE_EXEC_FALLBACK=0` 可要求必须使用应用宿主，并在其不可用时直接失败。
- 当 Gateway WS 使用 TLS 时，添加 `--tls` / `--tls-fingerprint`。

## Mac 节点模式

- macOS 菜单栏应用作为节点连接到 Gateway WS 服务器（因此 `openclaw nodes …` 可以作用于这台 Mac）。
- 在远程模式下，应用会为 Gateway 端口打开 SSH 隧道并连接到 `localhost`。
