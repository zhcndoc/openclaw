---
summary: "节点：用于 canvas/camera/screen/device/notifications/system 的配对、功能、权限及 CLI 辅助工具"
read_when:
  - 给 iOS/Android 节点配对到网关时
  - 使用节点的 canvas/camera 作为代理上下文时
  - 添加新的节点命令或 CLI 辅助工具时
title: "节点"
---

# 节点

**节点** 是一台伴随设备（macOS/iOS/Android/无界面）以 `role: "node"` 连接到网关的 **WebSocket**（与操作员使用同一端口），并通过 `node.invoke` 暴露命令接口（例如 `canvas.*`、`camera.*`、`device.*`、`notifications.*`、`system.*`）。协议详情见：[网关协议](/gateway/protocol)。

旧版传输： [Bridge 协议](/gateway/bridge-protocol)（TCP JSONL；已弃用/当前节点已移除）。

macOS 也可以运行在 **节点模式**：菜单栏应用连接到网关的 WS 服务器，并将其本地的 canvas/camera 命令作为节点暴露（因此 `openclaw nodes …` 可以针对这台 Mac 工作）。

备注：

- 节点属于**外设**，不是网关。它们不运行网关服务。
- Telegram/WhatsApp 等消息都通过 **网关** 到达，而非节点。
- 故障排除运行手册：[/nodes/troubleshooting](/nodes/troubleshooting)

## 配对 + 状态

**WebSocket 节点使用设备配对。** 节点在 `connect` 时提供设备身份；网关会为 `role: node` 创建设备配对请求。通过设备 CLI（或 UI）批准。

快速 CLI：

```bash
openclaw devices list
openclaw devices approve <请求ID>
openclaw devices reject <请求ID>
openclaw nodes status
openclaw nodes describe --node <节点ID或名称或IP>
```

If a node retries with changed auth details (role/scopes/public key), the prior
pending request is superseded and a new `requestId` is created. Re-run
`openclaw devices list` before approving.

Notes:

- `nodes status` 当设备配对角色包含 `node` 时，会标记节点为 **已配对**。
- `node.pair.*`（CLI：`openclaw nodes pending/approve/reject`）是网关拥有的独立节点配对存储；它**不**是 WebSocket `connect` 握手的关卡。

## 远程节点主机（system.run）

当网关运行在一台机器上，而希望命令在另一台机器执行时，使用**节点主机**。模型仍连接到**网关**；当选择 `host=node` 时，网关会将 `exec` 调用转发到**节点主机**。

### 运行分布

- **网关主机**：接收消息，运行模型，路由工具调用。
- **节点主机**：在节点机器上执行 `system.run`/`system.which`。
- **审批**：在节点主机通过 `~/.openclaw/exec-approvals.json` 强制执行。

### 启动节点主机（前台）

审批说明：

- 具审批支持的节点执行绑定精确的请求上下文。
- 对于直接的 shell/运行时文件执行，OpenClaw 也会尽最大努力绑定一个具体的本地文件操作数，并在该文件执行前发生变化时拒绝运行。
- 如果 OpenClaw 无法为解释器/运行时命令准确定位一个具体的本地文件，则会拒绝审批支持的执行，而不是假装完全覆盖运行时。对于更广泛的解释器语义，请使用沙箱、独立主机或明确的可信白名单/完整工作流。

### 启动节点主机（前台）

在节点机器上：

```bash
openclaw node run --host <网关主机> --port 18789 --display-name "构建节点"
```

### 通过 SSH 隧道访问远程网关（回环接口绑定）

如果网关绑定的是回环地址（`gateway.bind=loopback`，本地模式默认值），远程节点主机无法直接连接。请建立 SSH 隧道，并将节点主机指向隧道的本地端。

示例（节点主机 -> 网关主机）：

```bash
# 终端 A（保持运行）：转发本地 18790 端口到网关的 127.0.0.1:18789
ssh -N -L 18790:127.0.0.1:18789 user@gateway-host

# 终端 B：导出网关令牌，通过隧道连接
export OPENCLAW_GATEWAY_TOKEN="<网关令牌>"
openclaw node run --host 127.0.0.1 --port 18790 --display-name "构建节点"
```

备注：

- `openclaw node run` supports token or password auth.
- Env vars are preferred: `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`.
- Config fallback is `gateway.auth.token` / `gateway.auth.password`.
- In local mode, node host intentionally ignores `gateway.remote.token` / `gateway.remote.password`.
- In remote mode, `gateway.remote.token` / `gateway.remote.password` are eligible per remote precedence rules.
- If active local `gateway.auth.*` SecretRefs are configured but unresolved, node-host auth fails closed.
- Node-host auth resolution only honors `OPENCLAW_GATEWAY_*` env vars.

### 启动节点主机（服务）

```bash
openclaw node install --host <网关主机> --port 18789 --display-name "构建节点"
openclaw node restart
```

### 配对 + 命名

在网关主机上操作：

```bash
openclaw devices list
openclaw devices approve <请求ID>
openclaw nodes status
```

If the node retries with changed auth details, re-run `openclaw devices list`
and approve the current `requestId`.

Naming options:

- 在 `openclaw node run` / `openclaw node install` 使用 `--display-name`（保存在节点的 `~/.openclaw/node.json` 中）。
- 使用 `openclaw nodes rename --node <id|name|ip> --name "构建节点"`（网关覆盖）。

### 允许列表命令

执行审批是**每个节点主机独立**的。在网关添加允许列表项：

```bash
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/uname"
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/sw_vers"
```

审批文件保存在节点主机的 `~/.openclaw/exec-approvals.json`。

### 指定 exec 运行节点

配置默认（网关配置）：

```bash
openclaw config set tools.exec.host node
openclaw config set tools.exec.security allowlist
openclaw config set tools.exec.node "<id-or-name>"
```

或针对单次会话：

```
/exec host=node security=allowlist node=<id-or-name>
```

设置完成后，任何带 `host=node` 的 `exec` 调用都会在节点主机上执行（受节点允许列表/审批限制）。

相关链接：

- [节点主机 CLI](/cli/node)
- [Exec 工具](/tools/exec)
- [Exec 审批](/tools/exec-approvals)

## 调用命令

底层（原始 RPC）调用示例：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command canvas.eval --params '{"javaScript":"location.href"}'
```

有更高级的辅助工具用于常用的“给代理发送 MEDIA 附件”工作流。

## 屏幕快照（canvas 截图）

如果节点显示 Canvas（WebView），`canvas.snapshot` 返回 `{ format, base64 }`。

CLI 辅助（写入临时文件并打印 `MEDIA:<路径>`）：

```bash
openclaw nodes canvas snapshot --node <idOrNameOrIp> --format png
openclaw nodes canvas snapshot --node <idOrNameOrIp> --format jpg --max-width 1200 --quality 0.9
```

### Canvas 控制命令

```bash
openclaw nodes canvas present --node <idOrNameOrIp> --target https://example.com
openclaw nodes canvas hide --node <idOrNameOrIp>
openclaw nodes canvas navigate https://example.com --node <idOrNameOrIp>
openclaw nodes canvas eval --node <idOrNameOrIp> --js "document.title"
```

备注：

- `canvas present` 接受 URL 或本地文件路径（通过 `--target`），并可选用 `--x/--y/--width/--height` 定位。
- `canvas eval` 接收内联 JS（`--js`）或位置参数。

### A2UI（Canvas）

```bash
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --text "Hello"
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --jsonl ./payload.jsonl
openclaw nodes canvas a2ui reset --node <idOrNameOrIp>
```

备注：

- 仅支持 A2UI v0.8 JSONL 格式（v0.9/createSurface 请求被拒绝）。

## 照片 + 视频（节点相机）

照片（`jpg`）：

```bash
openclaw nodes camera list --node <idOrNameOrIp>
openclaw nodes camera snap --node <idOrNameOrIp>            # 默认：双摄（2 条 MEDIA 行）
openclaw nodes camera snap --node <idOrNameOrIp> --facing front
```

视频片段（`mp4`）：

```bash
openclaw nodes camera clip --node <idOrNameOrIp> --duration 10s
openclaw nodes camera clip --node <idOrNameOrIp> --duration 3000 --no-audio
```

备注：

- 节点必须处于**前台**状态，`canvas.*` 和 `camera.*` 调用才生效（后台调用返回 `NODE_BACKGROUND_UNAVAILABLE`）。
- 视频时长有限制（当前 `<= 60s`），以避免超大 base64 载荷。
- Android 会在可能时请求 `CAMERA`/`RECORD_AUDIO` 权限；权限拒绝时返回 `*_PERMISSION_REQUIRED`。

## 屏幕录制（节点）

支持的节点公开 `screen.record`（mp4）。示例：

```bash
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10 --no-audio
```

注意事项：

- `screen.record` 的可用性取决于节点平台。
- 屏幕录制时间限制为 `<= 60秒`。
- `--no-audio` 在支持的平台上禁用麦克风采集。
- 当有多个屏幕可用时，使用 `--screen <index>` 选择显示器。

## 位置（节点）

当设置中启用位置时，节点会暴露 `location.get`。

CLI 助手：

```bash
openclaw nodes location get --node <idOrNameOrIp>
openclaw nodes location get --node <idOrNameOrIp> --accuracy precise --max-age 15000 --location-timeout 10000
```

备注：

- 定位默认关闭。
- “始终允许”需要系统权限；后台获取为尽力而为。
- 返回包含经纬度、精度（米）和时间戳。

## 短信（Android 节点）

Android 节点在用户授权**短信权限**且设备支持电话功能时，支持 `sms.send`。

底层调用示例：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command sms.send --params '{"to":"+15555550123","message":"Hello from OpenClaw"}'
```

备注：

- 权限提示需在 Android 设备上接受后才会公开该能力。
- 没电话功能的 Wi-Fi 设备不会公开 `sms.send`。

## Android 设备与个人数据命令

Android 节点启用相应权限后，可以提供更多命令分组：

可用分组：

- `device.status`、`device.info`、`device.permissions`、`device.health`
- `notifications.list`、`notifications.actions`
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

备注：

- 运动指令受可用传感器的能力限制。

## 系统命令（节点主机 / Mac 节点）

macOS 节点暴露 `system.run`、`system.notify` 和 `system.execApprovals.get/set`。
无界面节点主机暴露 `system.run`、`system.which` 和 `system.execApprovals.get/set`。

示例：

```bash
openclaw nodes run --node <idOrNameOrIp> -- echo "Hello from mac node"
openclaw nodes notify --node <idOrNameOrIp> --title "Ping" --body "Gateway ready"
```

备注：

- `system.run` 返回 stdout、stderr 和退出码。
- `system.notify` 遵守 macOS 应用的通知权限状态。
- 未识别的节点 `platform` / `deviceFamily` 元数据使用保守默认允许列表，排除 `system.run` 和 `system.which`。若需为未知平台启用这些命令，请通过 `gateway.nodes.allowCommands` 明确添加。
- `system.run` 支持 `--cwd`、`--env KEY=VAL`、`--command-timeout` 和 `--needs-screen-recording`。
- 对于 shell 包装器（`bash|sh|zsh ... -c/-lc`），请求作用域的 `--env` 变量仅保留明确允许的变量（`TERM`, `LANG`, `LC_*`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`）。
- 允许列表模式下，对已知的包装器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`），会保持内部可执行路径，而非包装器路径。如果拆包不安全，则不自动保存允许列表条目。
- Windows 节点主机允许列表模式，shell 包装执行（通过 `cmd.exe /c`）需要显式批准（仅允许条目不能自动批准包装器形式）。
- `system.notify` 支持 `--priority <passive|active|timeSensitive>` 和 `--delivery <system|overlay|auto>`。
- 节点主机会忽略 `PATH` 覆盖，并剥离危险的启动/shell 变量（`DYLD_*`、`LD_*`、`NODE_OPTIONS`、`PYTHON*`、`PERL*`、`RUBYOPT`、`SHELLOPTS`、`PS4`）。如果需要额外的 PATH 项，请配置节点主机服务环境，或将工具安装到标准路径，而非通过 `--env` 传递 `PATH`。
- macOS 节点模式下，`system.run` 受 macOS 应用中的执行审批控制（设置 → 执行审批）。
  询问/允许列表/完全模式与无界面节点主机一致；拒绝时返回 `SYSTEM_RUN_DENIED`。
- 无界面节点主机中，`system.run` 受 `~/.openclaw/exec-approvals.json` 执行审批管理。

## Exec 节点绑定

当可用多个节点时，您可以将 exec 绑定到特定节点。
这会设置 `exec host=node` 的默认节点（可针对具体代理覆写）。

全局默认：

```bash
openclaw config set tools.exec.node "节点ID或名称"
```

针对代理覆写：

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "节点ID或名称"
```

取消绑定以允许任意节点：

```bash
openclaw config unset tools.exec.node
openclaw config unset agents.list[0].tools.exec.node
```

## 权限映射

节点可在 `node.list` / `node.describe` 中包含 `permissions` 映射，键名为权限名称（如 `screenRecording`、`accessibility`），值为布尔（`true` 表示已授权）。

## 无界面节点主机（跨平台）

OpenClaw 可运行一个**无界面节点主机**（无 UI）连接网关 WebSocket，
暴露 `system.run` / `system.which`。适用于 Linux/Windows，或在服务器旁运行简易节点。

启动方式：

```bash
openclaw node run --host <网关主机> --port 18789
```

备注：

- 依然需要配对（网关会显示设备配对提示）。
- 节点主机将在 `~/.openclaw/node.json` 中存储节点 ID、令牌、显示名称和网关连接信息。
- 执行审批通过本地的 `~/.openclaw/exec-approvals.json` 强制执行
  （详见 [执行审批](/tools/exec-approvals)）。
- macOS 中无界面节点主机默认本地执行 `system.run`。设置环境变量 `OPENCLAW_NODE_EXEC_HOST=app` 可通过伴随应用的执行主机执行；
  添加 `OPENCLAW_NODE_EXEC_FALLBACK=0` 可强制使用应用主机，如不可用则失败。
- 当网关 WS 启用 TLS，需加上 `--tls` / `--tls-fingerprint`。

## Mac 节点模式

- macOS 菜单栏应用以节点身份连接网关 WS 服务器（使 `openclaw nodes …` 可操作该 Mac）。
- 远程模式下，应用开启 SSH 隧道连接到网关端口的本地地址。
