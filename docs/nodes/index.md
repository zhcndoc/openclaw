---
summary: "节点：配对、能力、权限，以及用于 canvas/camera/screen/device/notifications/system 的 CLI 辅助工具"
read_when:
  - 将 iOS/Android 节点与网关配对时
  - 将 node canvas/camera 用作 agent 上下文时
  - 添加新的节点命令或 CLI 辅助工具时
title: "节点"
---

**node** 是一个伴随设备（macOS/iOS/Android/headless），它以 `role: "node"` 连接到 Gateway 的 **WebSocket**（与 operators 使用同一端口），并通过 `node.invoke` 暴露一组命令接口（例如 `canvas.*`、`camera.*`、`device.*`、`notifications.*`、`system.*`）。协议细节：[Gateway protocol](/gateway/protocol)。

旧版传输：[Bridge protocol](/gateway/bridge-protocol)（TCP JSONL；
仅适用于历史上的当前节点）。

macOS 也可以运行在 **node 模式**：菜单栏应用连接到 Gateway 的
WS 服务器，并将其本地 canvas/camera 命令作为节点暴露出来（因此
`openclaw nodes …` 可以针对这台 Mac 生效）。在远程 gateway 模式下，浏览器
自动化由 CLI node 主机（`openclaw node run` 或
已安装的 node 服务）处理，而不是由原生应用节点处理。

注意：

- 节点是**外设**，不是 gateway。它们不运行 gateway 服务。
- Telegram/WhatsApp 等消息会进入**gateway**，不会进入节点。
- 故障排查手册：[/nodes/troubleshooting](/nodes/troubleshooting)

## 配对 + 状态

**WS 节点使用设备配对。** 节点在 `connect` 期间提供设备身份。Gateway
会为 `role: node` 创建设备配对请求。通过 devices CLI（或 UI）批准。

快速 CLI：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
```

如果节点在重试时更改了认证细节（role/scopes/public key），之前的
待处理请求会被新请求取代，并创建新的 `requestId`。在批准前请重新运行
`openclaw devices list`。

注意：

- 当设备配对角色包含 `node` 时，`nodes status` 会将节点标记为**已配对**。
- 设备配对记录是持久化的已批准角色契约。令牌
  轮换仍在该契约内部；它不能将已配对节点升级为
  配对批准从未授予的其他角色。
- `node.pair.*`（CLI：`openclaw nodes pending/approve/reject/remove/rename`）是一个独立的、由 gateway 持有的
  节点配对存储；它不会约束 WS 的 `connect` 握手。
- `openclaw nodes remove --node <id|name|ip>` 会从该
  独立的、由 gateway 持有的节点配对存储中删除过期条目。
- 批准范围遵循待处理请求声明的命令：
  - 无命令请求：`operator.pairing`
  - 非 exec 节点命令：`operator.pairing` + `operator.write`
  - `system.run` / `system.run.prepare` / `system.which`：`operator.pairing` + `operator.admin`

## 远程节点主机（system.run）

当你的 Gateway 运行在一台机器上，而你希望命令
在另一台机器上执行时，请使用 **node 主机**。模型仍然与**gateway**对话；当选择 `host=node` 时，gateway 会将 `exec` 调用转发到 **node 主机**。

### 运行位置说明

- **Gateway 主机**：接收消息、运行模型、路由工具调用。
- **Node 主机**：在节点机器上执行 `system.run`/`system.which`。
- **批准**：通过 node 主机上的 `~/.openclaw/exec-approvals.json` 强制执行。

批准说明：

- 基于批准的 node 运行会绑定精确的请求上下文。
- 对于直接的 shell/运行时文件执行，OpenClaw 还会尽最大努力绑定一个具体的本地
  文件操作数，并在该文件在执行前发生变化时拒绝运行。
- 如果 OpenClaw 无法为解释器/运行时命令精确识别出唯一一个具体的本地文件，则
  会拒绝基于批准的执行，而不是假装涵盖全部运行时语义。对于更广泛的解释器语义，请使用沙箱、
  独立主机，或显式受信任的允许列表/完整工作流。

### 启动 node 主机（前台）

在 node 机器上：

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name "Build Node"
```

### 通过 SSH 隧道连接远程 gateway（回环绑定）

如果 Gateway 绑定到回环地址（`gateway.bind=loopback`，本地模式默认值），
远程 node 主机将无法直接连接。请创建 SSH 隧道，并将
node 主机指向隧道的本地端。

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

### 配对 + 命名

在 gateway 主机上：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

如果节点在重试时更改了认证细节，请重新运行 `openclaw devices list`
并批准当前的 `requestId`。

命名选项：

- `--display-name` 用于 `openclaw node run` / `openclaw node install`（保存在节点上的 `~/.openclaw/node.json` 中）。
- `openclaw nodes rename --node <id|name|ip> --name "Build Node"`（gateway 覆盖项）。

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

或在每个会话中：

```
/exec host=node security=allowlist node=<id-or-name>
```

一旦设置，任何 `host=node` 的 `exec` 调用都会在 node 主机上运行（受
node 允许列表/批准约束）。

`host=auto` 不会自动选择 node，但明确的单次调用 `host=node` 请求可以从 `auto` 中发出。如果你希望 node exec 成为该会话的默认值，请显式设置 `tools.exec.host=node` 或 `/exec host=node ...`。

相关：

- [Node host CLI](/cli/node)
- [Exec tool](/tools/exec)
- [Exec approvals](/tools/exec-approvals)

## 调用命令

低层级（原始 RPC）：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command canvas.eval --params '{"javaScript":"location.href"}'
```

对于常见的“给 agent 一个 MEDIA 附件”的工作流，也有更高层级的辅助工具。

## 命令策略

在可以调用节点命令之前，必须通过两个门槛：

1. 节点必须在其 WebSocket `connect.commands` 列表中声明该命令。
2. gateway 的平台策略必须允许所声明的命令。

Windows 和 macOS 伴随节点默认允许诸如
`canvas.*`、`camera.list`、`location.get` 和 `screen.snapshot` 之类的安全声明命令。像
`camera.snap`、`camera.clip` 和
`screen.record` 这类危险或高度涉及隐私的命令仍然需要通过
`gateway.nodes.allowCommands` 显式启用。`gateway.nodes.denyCommands` 始终优先于
默认值和额外的允许列表条目。

在节点更改其声明的命令列表后，请拒绝旧的设备配对
并批准新的请求，以便 gateway 存储更新后的命令快照。

## 截图（canvas 快照）

如果节点正在显示 Canvas（WebView），`canvas.snapshot` 会返回 `{ format, base64 }`。

CLI 辅助工具（写入临时文件并打印 `MEDIA:<path>`）：

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

- 仅支持 A2UI v0.8 JSONL（v0.9/createSurface 会被拒绝）。

## 照片 + 视频（node camera）

照片（`jpg`）：

```bash
openclaw nodes camera list --node <idOrNameOrIp>
openclaw nodes camera snap --node <idOrNameOrIp>            # 默认：两个朝向都拍摄（2 条 MEDIA 行）
openclaw nodes camera snap --node <idOrNameOrIp> --facing front
```

视频片段（`mp4`）：

```bash
openclaw nodes camera clip --node <idOrNameOrIp> --duration 10s
openclaw nodes camera clip --node <idOrNameOrIp> --duration 3000 --no-audio
```

注意：

- 节点必须处于**前台**才能使用 `canvas.*` 和 `camera.*`（后台调用会返回 `NODE_BACKGROUND_UNAVAILABLE`）。
- 片段时长会被限制（当前 `<= 60s`），以避免过大的 base64 载荷。
- Android 会在可能的情况下提示 `CAMERA`/`RECORD_AUDIO` 权限；权限被拒绝时会以 `*_PERMISSION_REQUIRED` 失败。

## 屏幕录制（nodes）

受支持的节点会暴露 `screen.record`（mp4）。示例：

```bash
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10 --no-audio
```

注意：

- `screen.record` 的可用性取决于节点平台。
- 屏幕录制会被限制为 `<= 60s`。
- `--no-audio` 会在受支持的平台上禁用麦克风采集。
- 当有多个屏幕可用时，使用 `--screen <index>` 选择显示器。

## 位置（节点）

当在设置中启用 Location 时，节点会公开 `location.get`。

CLI 辅助命令：

```bash
openclaw nodes location get --node <idOrNameOrIp>
openclaw nodes location get --node <idOrNameOrIp> --accuracy precise --max-age 15000 --location-timeout 10000
```

注意：

- Location 默认**关闭**。
- “Always” 需要系统权限；后台获取尽力而为。
- 响应包含经纬度、精度（米）和时间戳。

## SMS（Android 节点）

当用户授予 **SMS** 权限且设备支持电话功能时，Android 节点可以公开 `sms.send`。

底层调用：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command sms.send --params '{"to":"+15555550123","message":"Hello from OpenClaw"}'
```

注意：

- 必须先在 Android 设备上接受权限提示，随后才会公布该能力。
- 没有电话功能的仅 Wi-Fi 设备不会公布 `sms.send`。

## Android 设备 + 个人数据命令

当相应能力启用时，Android 节点可以公开额外的命令族。

可用族：

- `device.status`, `device.info`, `device.permissions`, `device.health`
- `notifications.list`, `notifications.actions`
- `photos.latest`
- `contacts.search`, `contacts.add`
- `calendar.events`, `calendar.add`
- `callLog.search`
- `sms.search`
- `motion.activity`, `motion.pedometer`

示例调用：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command device.status --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command notifications.list --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command photos.latest --params '{"limit":1}'
```

注意：

- 运动相关命令由可用传感器能力限制。

## 系统命令（节点宿主 / mac 节点）

macOS 节点公开 `system.run`、`system.notify` 和 `system.execApprovals.get/set`。
无界面节点宿主公开 `system.run`、`system.which` 和 `system.execApprovals.get/set`。

示例：

```bash
openclaw nodes notify --node <idOrNameOrIp> --title "Ping" --body "Gateway ready"
openclaw nodes invoke --node <idOrNameOrIp> --command system.which --params '{"name":"git"}'
```

注意：

- `system.run` 会在负载中返回 stdout/stderr/退出代码。
- Shell 执行现在通过带有 `host=node` 的 `exec` 工具进行；`nodes` 仍然是显式节点命令的直接 RPC 入口。
- `nodes invoke` 不公开 `system.run` 或 `system.run.prepare`；它们仍然只走 exec 路径。
- exec 路径会在审批前准备一个规范化的 `systemRunPlan`。一旦获得审批，网关会转发该已存储的计划，而不是任何后续由调用方编辑过的 command/cwd/session 字段。
- `system.notify` 会尊重 macOS 应用中的通知权限状态。
- 未识别的节点 `platform` / `deviceFamily` 元数据会使用保守的默认允许列表，其中不包含 `system.run` 和 `system.which`。如果你确实需要在未知平台上使用这些命令，请通过 `gateway.nodes.allowCommands` 显式添加。
- `system.run` 支持 `--cwd`、`--env KEY=VAL`、`--command-timeout` 和 `--needs-screen-recording`。
- 对于 shell 包装器（`bash|sh|zsh ... -c/-lc`），请求作用域内的 `--env` 值会被缩减到一个显式允许列表（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。
- 对于 allow-always 决策，在 allowlist 模式下，已知的分发包装器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）会持久化内部可执行文件路径，而不是包装器路径。如果展开不安全，则不会自动持久化 allowlist 条目。
- 在 allowlist 模式下的 Windows 节点宿主中，经由 `cmd.exe /c` 的 shell 包装器运行需要审批（仅有 allowlist 条目不会自动允许该包装器形式）。
- `system.notify` 支持 `--priority <passive|active|timeSensitive>` 和 `--delivery <system|overlay|auto>`。
- 节点宿主会忽略 `PATH` 覆盖，并剥离危险的启动/ shell 键（`DYLD_*`、`LD_*`、`NODE_OPTIONS`、`PYTHON*`、`PERL*`、`RUBYOPT`、`SHELLOPTS`、`PS4`）。如果你需要额外的 PATH 条目，请配置节点宿主服务环境（或将工具安装到标准位置），不要通过 `--env` 传入 `PATH`。
- 在 macOS 节点模式下，`system.run` 由 macOS 应用中的 exec 审批进行限制（设置 → Exec approvals）。
  ask/allowlist/full 的行为与无界面节点宿主相同；被拒绝的提示会返回 `SYSTEM_RUN_DENIED`。
- 在无界面节点宿主上，`system.run` 由 exec 审批（`~/.openclaw/exec-approvals.json`）进行限制。

## Exec 节点绑定

当可用节点不止一个时，你可以将 exec 绑定到特定节点。
这会将 `exec host=node` 的默认节点设为某个节点（也可以按 agent 覆盖）。

全局默认值：

```bash
openclaw config set tools.exec.node "node-id-or-name"
```

按 agent 覆盖：

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

取消设置以允许任意节点：

```bash
openclaw config unset tools.exec.node
openclaw config unset agents.list[0].tools.exec.node
```

## 权限映射

节点可能会在 `node.list` / `node.describe` 中包含一个 `permissions` 映射，以权限名称为键（例如 `screenRecording`、`accessibility`），布尔值（`true` = 已授予）。

## 无界面节点宿主（跨平台）

OpenClaw 可以运行一个**无界面节点宿主**（没有 UI），它连接到 Gateway WebSocket 并公开 `system.run` / `system.which`。这在 Linux/Windows 上，或在服务器旁运行一个轻量节点时很有用。

启动它：

```bash
openclaw node run --host <gateway-host> --port 18789
```

注意：

- 仍然需要配对（Gateway 会显示设备配对提示）。
- 节点宿主会将其节点 ID、token、显示名称和网关连接信息存储在 `~/.openclaw/node.json` 中。
- Exec 审批通过 `~/.openclaw/exec-approvals.json` 在本地强制执行
  （参见 [Exec approvals](/tools/exec-approvals)）。
- 在 macOS 上，无界面节点宿主默认在本地执行 `system.run`。设置
  `OPENCLAW_NODE_EXEC_HOST=app` 可将 `system.run` 路由到配套应用的 exec 宿主；添加
  `OPENCLAW_NODE_EXEC_FALLBACK=0` 可要求必须使用应用宿主，并在其不可用时关闭失败。
- 当 Gateway WS 使用 TLS 时，添加 `--tls` / `--tls-fingerprint`。

## Mac 节点模式

- macOS 菜单栏应用作为节点连接到 Gateway WS 服务器（因此 `openclaw nodes …` 可以作用于这台 Mac）。
- 在远程模式下，应用会为 Gateway 端口打开 SSH 隧道并连接到 `localhost`。
