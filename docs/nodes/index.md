---
summary: "节点：用于 canvas/camera/screen/device/notifications/system 的配对、功能、权限及 CLI 辅助工具"
read_when:
  - 给 iOS/Android 节点配对到网关时
  - 使用节点的 canvas/camera 作为代理上下文时
  - 添加新的节点命令或 CLI 辅助工具时
title: "节点"
---

**节点** 是一种伴随设备（macOS/iOS/Android/headless），它以 `role: "node"` 连接到网关的 **WebSocket**（与操作者使用相同端口），并通过 `node.invoke` 暴露命令接口（例如 `canvas.*`、`camera.*`、`device.*`、`notifications.*`、`system.*`）。协议细节：[网关协议](/gateway/protocol)。

旧版传输：[Bridge 协议](/gateway/bridge-protocol)（TCP JSONL；
仅对当前节点保留历史用途）。

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
openclaw devices approve <请求 ID>
openclaw devices reject <请求 ID>
openclaw nodes status
openclaw nodes describe --node <节点 ID 或名称或 IP>
```

如果节点使用更改后的认证详情（角色/范围/公钥）重试，先前的挂起请求将被取代，并创建一个新的 `requestId`。在批准前重新运行 `openclaw devices list`。

备注：

- 当节点的设备配对角色包含 `node` 时，`nodes status` 会将其标记为 **paired**。
- 设备配对记录是持久化的已批准角色契约。令牌轮换仍保留在该契约内；它不能将已配对节点升级为配对批准未授予的其他角色。
- `node.pair.*`（CLI：`openclaw nodes pending/approve/reject/remove/rename`）是一个独立的、由网关拥有的节点配对存储；它并**不**控制 WS `connect` 握手。
- `openclaw nodes remove --node <id|name|ip>` 会从那个独立的、由网关拥有的节点配对存储中删除过期条目。
- 批准范围遵循挂起请求声明的命令：
  - 无命令请求：`operator.pairing`
  - 非 exec 节点命令：`operator.pairing` + `operator.write`
  - `system.run` / `system.run.prepare` / `system.which`：`operator.pairing` + `operator.admin`

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
# 终端 A（保持运行）：将本地 18790 端口转发到网关的 127.0.0.1:18789
ssh -N -L 18790:127.0.0.1:18789 user@gateway-host

# 终端 B：导出网关令牌，通过隧道连接
export OPENCLAW_GATEWAY_TOKEN="<网关令牌>"
openclaw node run --host 127.0.0.1 --port 18790 --display-name "构建节点"
```

备注：

- `openclaw node run` 支持令牌或密码认证。
- 推荐使用环境变量：`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`。
- 配置回退项为 `gateway.auth.token` / `gateway.auth.password`。
- 在本地模式下，节点主机故意忽略 `gateway.remote.token` / `gateway.remote.password`。
- 在远程模式下，`gateway.remote.token` / `gateway.remote.password` 根据远程优先级规则有效。
- 如果配置了活动的本地 `gateway.auth.*` SecretRefs 但未解析，节点主机认证将失败（失败关闭）。
- 节点主机认证解析仅认可 `OPENCLAW_GATEWAY_*` 环境变量。

### 启动节点主机（服务）

```bash
openclaw node install --host <网关主机> --port 18789 --display-name "构建节点"
openclaw node restart
```

### 配对 + 命名

在网关主机上操作：

```bash
openclaw devices list
openclaw devices approve <请求 ID>
openclaw nodes status
```

如果节点使用更改后的认证详情重试，请重新运行 `openclaw devices list` 并批准当前的 `requestId`。

命名选项：

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

`host=auto` 不会自动自行选择节点，但从 `auto` 显式发起的逐次调用 `host=node` 请求是允许的。如果你希望节点 exec 成为会话默认值，请显式设置 `tools.exec.host=node` 或 `/exec host=node ...`。

Related:

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
- 屏幕录制时间限制为 `<= 60 秒`。
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
openclaw nodes notify --node <idOrNameOrIp> --title "Ping" --body "Gateway ready"
openclaw nodes invoke --node <idOrNameOrIp> --command system.which --params '{"name":"git"}'
```

备注：

- `system.run` 会在负载中返回 stdout/stderr/退出代码。
- Shell 执行现在通过带有 `host=node` 的 `exec` 工具进行；`nodes` 仍然是显式节点命令的直接 RPC 表面。
- `nodes invoke` 不公开 `system.run` 或 `system.run.prepare`；它们仅保留在 exec 路径中。
- exec 路径会在批准前准备一个规范的 `systemRunPlan`。一旦授予批准，网关会转发该存储的计划，而不是任何之后被调用方编辑过的命令/cwd/session 字段。
- `system.notify` 会遵守 macOS 应用中的通知权限状态。
- 未识别的节点 `platform` / `deviceFamily` 元数据会使用保守的默认允许列表，其中不包括 `system.run` 和 `system.which`。如果你确实需要这些命令用于未知平台，请通过 `gateway.nodes.allowCommands` 显式添加。
- `system.run` 支持 `--cwd`、`--env KEY=VAL`、`--command-timeout` 和 `--needs-screen-recording`。
- 对于 shell 包装器（`bash|sh|zsh ... -c/-lc`），请求范围内的 `--env` 值会缩减为显式允许列表（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。
- 在 allowlist 模式下，对于允许始终的决策，已知的分发包装器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）会保留内部可执行文件路径而不是包装器路径。如果展开不安全，则不会自动持久化任何 allowlist 条目。
- 在 Windows 节点主机的 allowlist 模式下，通过 `cmd.exe /c` 运行的 shell 包装器需要审批（仅有 allowlist 条目不会自动允许该包装器形式）。
- `system.notify` 支持 `--priority <passive|active|timeSensitive>` 和 `--delivery <system|overlay|auto>`。
- 节点主机会忽略 `PATH` 覆盖，并剥离危险的启动/ shell 键（`DYLD_*`、`LD_*`、`NODE_OPTIONS`、`PYTHON*`、`PERL*`、`RUBYOPT`、`SHELLOPTS`、`PS4`）。如果你需要额外的 PATH 条目，请配置节点主机服务环境（或将工具安装到标准位置），而不要通过 `--env` 传递 `PATH`。
- 在 macOS 节点模式下，`system.run` 受 macOS 应用中的 exec 审批限制（设置 → Exec approvals）。
  Ask/allowlist/full 的行为与无界面节点主机相同；被拒绝的提示返回 `SYSTEM_RUN_DENIED`。
- 在无界面节点主机上，`system.run` 受 exec 审批（`~/.openclaw/exec-approvals.json`）限制。

## Exec 节点绑定

当可用多个节点时，您可以将 exec 绑定到特定节点。
这会设置 `exec host=node` 的默认节点（可针对具体代理覆写）。

全局默认：

```bash
openclaw config set tools.exec.node "节点 ID 或名称"
```

针对代理覆写：

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "节点 ID 或名称"
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
