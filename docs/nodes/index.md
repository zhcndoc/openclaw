---
summary: "节点：配对、能力、权限，以及用于 canvas/camera/screen/device/notifications/system 的 CLI 辅助工具"
read_when:
  - 将 iOS/Android 节点与网关配对时
  - 将 node canvas/camera 用作 agent 上下文时
  - 添加新的节点命令或 CLI 辅助工具时
title: "节点"
---

**node** 是一个伴随设备（macOS/iOS/Android/headless），它以 `role: "node"` 连接到 Gateway 的 **WebSocket**（与 operators 使用同一端口），并通过 `node.invoke` 暴露一组命令接口（例如 `canvas.*`、`camera.*`、`device.*`、`notifications.*`、`system.*`）。协议细节：[Gateway 协议](/gateway/protocol)。

Legacy transport: [Bridge 协议](/gateway/bridge-protocol)（TCP JSONL；仅适用于当前节点的历史实现）。

macOS 也可以以 **node 模式** 运行：菜单栏应用连接到 Gateway 的 WS 服务器，并将其本地 canvas/camera 命令作为一个 node 暴露出来（因此 `openclaw nodes …` 可以针对这台 Mac 工作）。在远程 gateway 模式下，浏览器自动化由 CLI node 主机（`openclaw node run` 或已安装的 node 服务）处理，而不是由原生应用节点处理。

Nodes 是**外设**，不是 gateways：它们不运行 gateway 服务，且频道消息（Telegram、WhatsApp 等）会到达 gateway，而不是 nodes。

故障排查运行手册：[/nodes/troubleshooting](/nodes/troubleshooting)

## 配对 + 状态

WS 节点使用 **设备配对**。节点在 `connect` 时会出示设备身份；Gateway 会为 `role: node` 创建一个设备配对请求。可通过 devices CLI（或 UI）进行批准。

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
```

待处理的配对请求会在 5 分钟后过期；有关完整的请求/批准/token 生命周期，请参见 [Gateway-owned pairing](/gateway/pairing)。如果节点在重试时更改了认证细节（role/scopes/public key），之前的待处理请求会被新的请求取代，并创建新的 `requestId`——在批准前请重新运行 `openclaw devices list`。

- 当节点的设备配对角色包含 `node` 时，`nodes status` 会将其标记为 **paired**。
- 设备配对记录是持久化的已批准角色契约。token 轮换仍然发生在该契约内部；它不能将已配对节点升级为配对批准从未授予的角色。
- `node.pair.*`（CLI：`openclaw nodes pending/approve/reject/remove/rename`）是一个独立的、由 gateway 管理的节点配对存储，用于跟踪节点在重连过程中已批准的命令/能力范围。它不会控制 WS `connect` 握手——设备配对会负责这一点。
- `openclaw nodes remove --node <id|name|ip>` 会移除一个节点配对。对于基于设备的节点，它会撤销 `devices/paired.json` 中该设备的 `node` 角色，并断开该设备的 node-role 会话：混合角色设备会保留其记录行并仅失去 `node` 角色，而仅有 node 的设备记录会被删除。它还会清除独立节点配对存储中的任何匹配项。`operator.pairing` 可以移除其他设备上的非 operator 节点记录；如果是设备 token 调用者在混合角色设备上撤销自己的 node 角色，则还需要 `operator.admin`。
- 批准范围遵循待处理请求声明的命令：
  - 无命令请求：`operator.pairing`
  - 非 exec 节点命令：`operator.pairing` + `operator.write`
  - `system.run` / `system.run.prepare` / `system.which`：`operator.pairing` + `operator.admin`

## 远程节点主机（system.run）

当你的 Gateway 运行在一台机器上，而你希望命令在另一台机器上执行时，请使用 **node 主机**。模型仍然与 **gateway** 对话；当选择 `host=node` 时，gateway 会将 `exec` 调用转发到 **node 主机**。

| 角色         | 职责                                                             |
| ------------ | ---------------------------------------------------------------- |
| Gateway host | 接收消息、运行模型、路由工具调用。                                |
| Node host    | 在 node 机器上执行 `system.run`/`system.which`。                 |
| Approvals    | 通过 `~/.openclaw/exec-approvals.json` 在 node 主机上强制执行。 |

批准说明：

- 基于批准的 node 运行会绑定精确的请求上下文。exec 路径会在批准前准备一个规范化的 `systemRunPlan`；一旦获批，gateway 会转发该已存储的计划，而不是后续调用者编辑过的命令/cwd/session 字段，并且会在运行前重新验证工作目录。
- 对于直接的 shell/运行时文件执行，OpenClaw 还会尽最大努力绑定一个具体的本地文件操作数，并在执行前如果该文件发生变化则拒绝运行。
- 如果 OpenClaw 无法为解释器/运行时命令精确识别出一个具体的本地文件，则会拒绝基于批准的执行，而不是假装覆盖了完整的运行时语义。对于更广泛的解释器语义，请使用沙箱、独立主机，或显式受信任的允许列表/完整工作流。

### 启动 node 主机（前台）

在 node 机器上：

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name "Build Node"
```

`node run` 也接受 `--context-path`（Gateway WS 上下文路径）、`--tls`、`--tls-fingerprint <sha256>` 和 `--node-id`（覆盖它会清除配对令牌）。

### 通过 SSH 隧道连接远程 gateway（回环绑定）

如果 Gateway 绑定到回环地址（`gateway.bind=loopback`，本地模式下默认如此），远程 node 主机将无法直接连接。请创建 SSH 隧道，并将 node 主机指向隧道的本地端。

示例（node 主机 -> gateway 主机）：

```bash
# 终端 A（保持运行）：将本地 18790 转发到 gateway 127.0.0.1:18789
ssh -N -L 18790:127.0.0.1:18789 user@gateway-host

# 终端 B：导出 gateway 令牌并通过隧道连接
export OPENCLAW_GATEWAY_TOKEN="<gateway-token>"
openclaw node run --host 127.0.0.1 --port 18790 --display-name "Build Node"
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

`node install` 也接受 `--context-path`、`--tls`、`--tls-fingerprint`、`--node-id`、`--runtime <node|bun>`（默认：node），以及用于重新安装的 `--force`。此外还提供 `node status`、`node stop` 和 `node uninstall`。

### 配对 + 命名

在 gateway 主机上：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

如果 node 使用更改后的认证详细信息重试，请重新运行 `openclaw devices list` 并批准当前的 `requestId`。

命名选项：

- 在 `openclaw node run` / `openclaw node install` 上使用 `--display-name`（会与 node id、令牌和 gateway 连接信息一起持久化保存到 node 上的 `~/.openclaw/node.json`）。
- `openclaw nodes rename --node <id|name|ip> --name "Build Node"`（gateway 覆盖）。

### 将命令加入允许列表

exec 批准是**按 node 主机**进行的。通过 gateway 添加允许列表条目：

```bash
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/uname"
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/sw_vers"
```

批准保存在 node 主机上的 `~/.openclaw/exec-approvals.json`。

### 将 exec 指向 node

配置默认值（gateway 配置）：

```bash
openclaw config set tools.exec.host node
openclaw config set tools.exec.security allowlist
openclaw config set tools.exec.node "<id-or-name>"
```

或者在每个会话中：

```text
/exec host=node security=allowlist node=<id-or-name>
```

一旦设置，任何 `host=node` 的 `exec` 调用都会在 node 主机上运行（受 node 允许列表/批准限制）。

`host=auto` 不会自动选择 node，但可以从 `auto` 中发出明确的单次 `host=node` 请求。如果你希望 node exec 成为该会话的默认值，请显式设置 `tools.exec.host=node` 或 `/exec host=node ...`。

相关：

- [Node host CLI](/cli/node)
- [Exec 工具](/tools/exec)
- [Exec 批准](/tools/exec-approvals)

### 本地模型推理

桌面或服务器 node 可以从运行在该 node 上的 Ollama 服务器暴露支持聊天的模型。代理使用 Ollama 插件的 `node_inference` 工具来发现已安装的模型，并远程运行一个有边界的提示；Gateway 无需直接访问 Ollama 网络。有关设置、模型过滤和直接验证命令，请参见 [Ollama node-local inference](/providers/ollama#node-local-inference)。

## 调用命令

低层级（原始 RPC）：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command canvas.eval --params '{"javaScript":"location.href"}'
```

`nodes invoke` 会阻止 `system.run` 和 `system.run.prepare`；这些命令只能通过带有 `host=node` 的 `exec` 工具运行（见上文）。对于常见的“给代理一个 MEDIA 附件”工作流（画布、相机、屏幕、位置，见下文），也存在更高级的辅助工具。

## 命令策略

在可以调用节点命令之前，必须通过两个门槛：

1. 节点必须在其 WebSocket `connect.commands` 列表中声明该命令。
2. 网关基于平台和审批得出的允许列表必须包含该声明的命令。

按平台划分的默认允许列表（在插件默认值以及 `allowCommands`/`denyCommands` 覆盖之前）：

| 平台 | 默认允许的命令                                                                                                                                                                                                                                                                                           |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS      | `camera.list`, `location.get`, `device.info`, `device.status`, `contacts.search`, `calendar.events`, `reminders.list`, `photos.latest`, `motion.activity`, `motion.pedometer`, `system.notify`                                                                                                                        |
| Android  | `camera.list`, `location.get`, `notifications.list`, `notifications.actions`, `system.notify`, `device.info`, `device.status`, `device.permissions`, `device.health`, `device.apps`, `contacts.search`, `calendar.events`, `callLog.search`, `reminders.list`, `photos.latest`, `motion.activity`, `motion.pedometer` |
| macOS    | `camera.list`, `location.get`, `device.info`, `device.status`, `contacts.search`, `calendar.events`, `reminders.list`, `photos.latest`, `motion.activity`, `motion.pedometer`, `system.notify`                                                                                                                        |
| Windows  | `camera.list`, `location.get`, `device.info`, `device.status`, `system.notify`                                                                                                                                                                                                                                        |
| Linux    | `system.notify`（如 `system.run` 之类的节点主机命令需要审批门控，见下文）                                                                                                                                                                                                                                  |

`canvas.*` 命令（`canvas.present`、`canvas.hide`、`canvas.navigate`、`canvas.eval`、`canvas.snapshot`、`canvas.a2ui.*`）在 iOS、Android、macOS、Windows 以及未知平台（不包括 Linux）上都是插件默认命令；其中在 iOS 上全部都受前台限制。

`talk.ptt.start`、`talk.ptt.stop`、`talk.ptt.cancel` 和 `talk.ptt.once` 对于任何声明了 `talk` 能力或声明了 `talk.*` 命令的节点，都会默认允许，与平台标记无关。

桌面主机命令（macOS/Windows 上的 `system.run`、`system.run.prepare`、`system.which`、`browser.proxy`、`screen.snapshot`）不属于上面的静态平台默认表。它们会在操作员批准了一个声明这些命令的配对请求后变为可用，此后节点在重新连接时会携带已批准的命令集合。

即使节点声明了以下危险或隐私敏感命令，也仍然需要通过 `gateway.nodes.allowCommands` 显式选择加入：`camera.snap`、`camera.clip`、`screen.record`、`contacts.add`、`calendar.add`、`reminders.add`、`sms.send`、`sms.search`。`gateway.nodes.denyCommands` 始终优先于默认值和额外的允许列表条目。

插件拥有的节点命令可以添加 Gateway 节点调用策略。该策略会在允许列表检查之后、转发到节点之前运行，因此原始的 `node.invoke`、CLI 辅助工具以及专用代理工具共享同一插件权限边界。危险的插件节点命令仍然需要通过 `gateway.nodes.allowCommands` 显式选择加入。

当节点更改其声明的命令列表后，拒绝旧的设备配对并批准新的请求，这样网关才会存储更新后的命令快照。

## 配置（`openclaw.json`）

Node 相关设置位于 `gateway.nodes` 和 `tools.exec` 下：

```json5
{
  gateway: {
    nodes: {
      // 从受信任网络（CIDR 列表）自动批准首次节点配对。
      // 未设置时禁用。仅适用于无请求 scopes 的首次 role:node 请求；
      // 不会自动批准升级。
      pairing: {
        autoApproveCidrs: ["192.168.1.0/24"],
      },
      // 允许危险/高隐私开销的节点命令（camera.snap 等）。
      allowCommands: ["camera.snap", "screen.record"],
      // 即使默认值或 allowCommands 包含，也阻止精确命令名。
      denyCommands: ["camera.clip"],
    },
  },
  tools: {
    exec: {
      // 默认 exec host："node" 将所有 exec 调用路由到已配对的节点。
      host: "node",
      // 节点 exec 的安全模式：仅允许已批准/已加入允许列表的命令。
      security: "allowlist",
      // 将 exec 固定到特定节点（id 或 name）。省略则允许任意节点。
      node: "build-node",
    },
  },
}
```

请使用精确的节点命令名称。即使平台默认值或 `allowCommands` 条目原本会允许某个命令，`denyCommands` 也会将其移除。有关网关节点配对和命令策略字段的详细信息，请参阅 [Gateway configuration reference](/gateway/configuration-reference#gateway)。

按 agent 覆盖 exec 节点：

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

- `canvas present` 接受 URL 或本地文件路径（`--target`），并可选提供 `--x/--y/--width/--height` 用于定位。
- `canvas eval` 接受内联 JS（`--js`）或位置参数。

### A2UI（Canvas）

```bash
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --text "Hello"
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --jsonl ./payload.jsonl
openclaw nodes canvas a2ui reset --node <idOrNameOrIp>
```

注意：

- 移动节点使用捆绑的应用自有 A2UI 页面来进行可执行操作的渲染。
- 仅支持 A2UI v0.8 JSONL（v0.9/createSurface 会被拒绝）。
- iOS 和 Android 会渲染远程 Gateway Canvas 页面，但 A2UI 按钮操作只会从捆绑的应用自有 A2UI 页面发出。在这些移动客户端上，Gateway 托管的 HTTP/HTTPS A2UI 页面仅用于渲染。

## 照片 + 视频（node camera）

照片（`jpg`）：

```bash
openclaw nodes camera list --node <idOrNameOrIp>
openclaw nodes camera snap --node <idOrNameOrIp>            # 默认：两个朝向都拍摄（2 条 MEDIA 行）
openclaw nodes camera snap --node <idOrNameOrIp> --facing front
openclaw nodes camera snap --node <idOrNameOrIp> --device-id <id> --max-width 1200 --quality 0.9 --delay-ms 2000
```

视频片段（`mp4`）：

```bash
openclaw nodes camera clip --node <idOrNameOrIp> --duration 10s
openclaw nodes camera clip --node <idOrNameOrIp> --duration 3000 --no-audio
```

注意：

- 节点必须处于**前台**才能使用 `canvas.*` 和 `camera.*`（后台调用会返回 `NODE_BACKGROUND_UNAVAILABLE`）。
- 节点会对片段时长进行限制，以保持 base64 载荷可管理（各平台的精确限制请参见 [Camera capture](/nodes/camera)）。`nodes` 代理工具还会在转发调用前将请求的 `durationMs` 上限设为 300000（5 分钟）；节点本身会执行更严格的限制。
- 在可能的情况下，Android 会提示授予 `CAMERA`/`RECORD_AUDIO` 权限；若权限被拒绝，则会失败并返回 `*_PERMISSION_REQUIRED`。

## 屏幕录制（nodes）

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

当在设置中启用 Location 时，节点会公开 `location.get`。

CLI 辅助命令：

```bash
openclaw nodes location get --node <idOrNameOrIp>
openclaw nodes location get --node <idOrNameOrIp> --accuracy precise --max-age 15000 --location-timeout 10000
```

注意：

- Location 默认处于**关闭**状态。
- “始终”需要系统权限；后台获取尽力而为。
- 响应包含纬度/经度、精度（米）和时间戳。
- 完整的参数/响应结构和错误代码： [位置命令](/nodes/location-command)。

## SMS（Android 节点）

当用户授予 **SMS** 权限且设备支持电话功能时，Android 节点可以暴露 `sms.send` 和 `sms.search`。这两个命令默认是危险的：网关操作员还必须将它们添加到 `gateway.nodes.allowCommands`，之后才能调用它们（参见 [命令策略](#command-policy)）。

底层调用：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command sms.send --params '{"to":"+15555550123","message":"Hello from OpenClaw"}'
```

注意：

- 必须先在 Android 设备上接受权限提示，随后才会公布该能力。
- 没有电话功能的仅 Wi-Fi 设备不会公布 `sms.send`。

## 设备和个人数据命令

iOS、Android 和 macOS 节点默认公开若干只读数据命令（见 [命令策略](#command-policy) 表）；Android 另外还通过其自身的应用内设置开放了更多命令族。

可用族：

- `device.status`, `device.info` — iOS、Android、macOS、Windows。
- `device.permissions`, `device.health`, `device.apps` — 仅 Android；`device.apps` 需要在 Android 设置中启用“已安装应用共享”，并默认返回启动器可见的应用。
- `notifications.list`, `notifications.actions` — 仅 Android。
- `photos.latest` — iOS、Android、macOS。
- `contacts.search` — iOS、Android、macOS（默认只读）；`contacts.add` 属于危险操作，需要 `gateway.nodes.allowCommands`。
- `calendar.events` — iOS、Android、macOS（默认只读）；`calendar.add` 属于危险操作，需要 `gateway.nodes.allowCommands`。
- `reminders.list` — iOS、Android、macOS（默认只读）；`reminders.add` 属于危险操作，需要 `gateway.nodes.allowCommands`。
- `callLog.search` — 仅 Android。
- `motion.activity`, `motion.pedometer` — iOS、Android、macOS；按可用传感器能力进行限制。

示例调用：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command device.status --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command device.apps --params '{"limit":10}'
openclaw nodes invoke --node <idOrNameOrIp> --command notifications.list --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command photos.latest --params '{"limit":1}'
```

## 系统命令（node host / mac node）

macOS 节点公开 `system.run`、`system.notify` 和 `system.execApprovals.get/set`。无头节点主机公开 `system.run`、`system.which` 和 `system.execApprovals.get/set`。

示例：

```bash
openclaw nodes notify --node <idOrNameOrIp> --title "Ping" --body "网关已就绪"
openclaw nodes invoke --node <idOrNameOrIp> --command system.which --params '{"name":"git"}'
```

注意：

- `system.run` 在载荷中返回 stdout/stderr/退出码。
- Shell 执行现在通过带有 `host=node` 的 `exec` 工具进行；`nodes` 仍然是显式节点命令的直接 RPC 接口。
- `nodes invoke` 不暴露 `system.run` 或 `system.run.prepare`；这些只保留在 exec 路径上。
- exec 路径会在审批前准备一个规范化的 `systemRunPlan`。一旦审批被授予，网关会转发该已存储的计划，而不是随后调用方编辑过的 command/cwd/session 字段。
- `system.notify` 会遵循 macOS 应用中的通知权限状态；支持 `--priority <passive|active|timeSensitive>` 和 `--delivery <system|overlay|auto>`。
- 未识别的节点 `platform` / `deviceFamily` 元数据会使用保守的默认允许列表，并排除 `system.run` 和 `system.which`。如果你有意需要这些命令用于未知平台，请通过 `gateway.nodes.allowCommands` 显式添加它们。
- `system.run` 支持 `--cwd`、`--env KEY=VAL`、`--command-timeout` 和 `--needs-screen-recording`。
- 对于 shell 包装器（`bash|sh|zsh ... -c/-lc`），请求作用域内的 `--env` 值会被缩减为显式允许列表（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。
- 对于允许始终（allow-always）决策，在允许列表模式下，已知的分发包装器（`env`、`flock`、`nice`、`nohup`、`stdbuf`、`timeout`）会保留内部可执行文件路径，而不是包装器路径。如果无法安全解包，则不会自动持久化任何允许列表条目。
- 在允许列表模式下的 Windows 节点主机上，通过 `cmd.exe /c` 运行的 shell 包装器需要审批（仅有允许列表条目不会自动允许该包装器形式）。
- 节点主机会在 `--env` 中忽略 `PATH` 覆盖，并在运行命令前剥离一大组维护中的解释器/shell 启动变量（例如 `NODE_OPTIONS`、`PYTHONPATH`、`BASH_ENV`、`DYLD_*`、`LD_*`）。如果你需要额外的 PATH 条目，请配置节点主机服务环境（或将工具安装到标准位置），而不是通过 `--env` 传递 `PATH`。
- 在 macOS 节点模式下，`system.run` 受 macOS 应用中的执行审批（Settings → Exec approvals）控制。ask/allowlist/full 的行为与无头节点主机相同；被拒绝的提示会返回 `SYSTEM_RUN_DENIED`。
- 在无头节点主机上，`system.run` 受执行审批（`~/.openclaw/exec-approvals.json`）控制；在 macOS 上，尤其请参见下面 [Headless node host](#headless-node-host-cross-platform) 中的 exec-host 路由环境变量。

## Exec 节点绑定

当有多个节点可用时，你可以将 exec 绑定到特定节点。这会为 `exec host=node` 设置默认节点（并且可按 agent 覆盖）。

全局默认值：

```bash
openclaw config set tools.exec.node "node-id-or-name"
```

按 agent 覆盖：

```bash
openclaw config get agents.list
openclaw config set 'agents.list[0].tools.exec.node' "node-id-or-name"
```

取消设置以允许任意节点：

```bash
openclaw config unset tools.exec.node
openclaw config unset 'agents.list[0].tools.exec.node'
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

- 仍然需要配对（Gateway 会显示设备配对提示）。
- 节点宿主会将其节点 ID、令牌、显示名称以及 gateway 连接信息存储在 `~/.openclaw/node.json` 中。
- Exec 批准通过 `~/.openclaw/exec-approvals.json` 在本地强制执行（参见 [Exec approvals](/tools/exec-approvals)）。
- 在 macOS 上，无界面节点宿主默认在本地执行 `system.run`。设置 `OPENCLAW_NODE_EXEC_HOST=app` 可将 `system.run` 通过配套应用的 exec 宿主路由；再添加 `OPENCLAW_NODE_EXEC_FALLBACK=0` 可要求使用应用宿主，并在其不可用时直接失败。
- 当 Gateway WS 使用 TLS 时，请添加 `--tls` / `--tls-fingerprint`。

## Mac 节点模式

- macOS 菜单栏应用作为节点连接到 Gateway WS 服务器（因此 `openclaw nodes …` 可以作用于这台 Mac）。
- 在远程模式下，应用会为 Gateway 端口打开 SSH 隧道并连接到 `localhost`。
