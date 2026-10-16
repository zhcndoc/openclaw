---
summary: "CLI 小部件面板、相机、屏幕、位置、SMS 和设备数据的帮助程序"
read_when:
  - "从节点捕获照片、剪辑或屏幕录制"
  - "从节点读取位置、SMS 或设备数据"
  - "在 Mac 上呈现托管小部件"
title: "Node 设备命令"
sidebarTitle: "设备命令"
---

## <a id="macos-widget-panel"></a> macOS 小部件面板

```bash
openclaw nodes canvas present --node <idOrNameOrIp>
openclaw nodes canvas hide --node <idOrNameOrIp>
openclaw nodes canvas navigate "/__openclaw__/canvas/documents/<document-id>/index.html" --node <idOrNameOrIp>
```

注意：

- `canvas present` 接受现有的可选目标加上 `--x/--y/--width/--height` 放置参数。
- `canvas navigate` 接受托管小部件文档路径或应用程序本地画布 URL。 macOS 应用程序通过其当前范围的 Canvas 功能 URL 解析托管路径。
- 面向代理的路径是 [`show_widget`](/tools/show-widget) 和 `presentation.target: "node_panel"`；使用 CLI 帮助程序进行直接操作员控制。
- A2UI 在 [ 会话仪表板 ](/web/dashboards) 上呈现，而不是通过节点 Canvas 命令。

## <a id="photos-%2B-videos-(node-camera)"></a><a id="photos-+-videos-node-camera"></a> 照片 + 视频（节点摄像头）

照片（`jpg`）：

```bash
openclaw nodes camera list --node <idOrNameOrIp>
openclaw nodes camera snap --node <idOrNameOrIp>            # default: one node-selected photo
openclaw nodes camera snap --node <idOrNameOrIp> --facing front
openclaw nodes camera snap --node <idOrNameOrIp> --facing both # front then back (2 saved paths)
openclaw nodes camera snap --node <idOrNameOrIp> --device-id <id> --max-width 1200 --quality 0.9 --delay-ms 2000
```

视频片段（`mp4`）：

```bash
openclaw nodes camera clip --node <idOrNameOrIp> --duration 10s
openclaw nodes camera clip --node <idOrNameOrIp> --duration 3000 --no-audio
```

注意：

- 对于`camera.*`，该节点必须是**前台**（后台调用返回`NODE_BACKGROUND_UNAVAILABLE`）。
- 节点会限制片段时长，以保持 base64 负载可管理（关于各平台的具体限制，请参见 [摄像头捕获](/nodes/camera)）。`nodes` 代理工具在转发调用前也会将请求的 `durationMs` 上限设为 300000（5 分钟）；节点本身会应用更严格的限制。
- 在可能的情况下，Android 会提示请求 `CAMERA`/`RECORD_AUDIO` 权限；如果权限被拒绝，将失败并返回 `*_PERMISSION_REQUIRED`。

## <a id="screen-recordings-(nodes)"></a><a id="screen-recordings-nodes"></a> 屏幕录制（节点）

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

## <a id="location-(nodes)"></a><a id="location-nodes"></a> 位置（节点）

当在设置中启用位置时，节点会公开 `location.get`。

CLI 辅助命令：

```bash
openclaw nodes location get --node <idOrNameOrIp>
openclaw nodes location get --node <idOrNameOrIp> --accuracy precise --max-age 15000 --location-timeout 10000
```

注意：

- 位置默认处于**关闭**状态。
- “始终”需要系统权限；后台获取尽力而为。
- 响应包括lat/lon、精度（米）和时间戳。
- 完整parameter/response形状和错误代码：[定位命令](/nodes/location-command)。

## <a id="sms-(android-nodes)"></a><a id="sms-android-nodes"></a> SMS（Android 节点）

当用户授予 **SMS** 权限并且设备支持电话时，Android 节点可以公开 `sms.send` 和 `sms.search`。默认情况下，这两个命令都是危险的：网关操作员还必须将它们添加到 `gateway.nodes.commands.allow` 才能调用（请参阅 [ 命令策略 ](/nodes/command-policy#command-policy)）。

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
openclaw nodes invoke --node <idOrNameOrIp> --command sms.send --params '{"to":"+15555550123","message":"Hello from OpenClaw"}'
```

注意：

- `sms.search` 可以在授予 `READ_SMS` 之前声明，因此一次调用可能会返回权限诊断；读取消息仍然需要该 Android 权限。
- 仅支持 Wi-Fi、没有电话功能的设备不会公布 `sms.send`。
- `requires explicit gateway.nodes.commands.allow opt-in` 错误表示手机已经声明了该命令，但 Gateway 操作员尚未授权。

## <a id="device-and-personal-data-commands"></a> 设备和个人数据命令

iOS和Android节点默认通告多个只读数据命令（参见[命令策略](/nodes/command-policy#command-policy)表）； Android还暴露了一个由自己的应用内设置控制的更大的家庭。仅在操作员启用与 `--share-installed-apps` 的已安装应用程序共享后，macOS 或无头 mac TypeScript 节点主机才会通告 `device.apps`。

可用族：

- `device.status`, `device.info` — iOS, Android, Windows.
- `device.permissions`、`device.health` — 仅 Android。
- `device.apps` — Android、macOS 和无头 mac 节点。Android 需要在设置中启用已安装应用共享，并默认返回启动器可见的应用。TypeScript 节点宿主默认关闭共享，并接受 `query`、`limit` 和 `includeSystem`；macOS 结果包含 `label`、`bundleId`、`path` 和 `system`。
- `notifications.list`、`notifications.actions` — 仅 Android。
- `photos.latest` — iOS, Android.
- `contacts.search` — iOS、Android（默认只读）；`contacts.add` 是危险操作，需要 `gateway.nodes.commands.allow`。
- `calendar.events` — iOS、Android（默认只读）；`calendar.add` 是危险操作，需要 `gateway.nodes.commands.allow`。
- `reminders.list` — iOS、Android（默认只读）；`reminders.add` 是危险操作，需要 `gateway.nodes.commands.allow`。
- `callLog.search` — 仅 Android。
- `motion.activity`、`motion.pedometer` — iOS、Android；由可用传感器能力控制。

`nodes` 代理工具的 `invoke` 操作接受 `invokeTimeoutMs` 进行节点调用。除非明确设置 `timeoutMs`，否则网关传输会收到该预算加上 30 秒的转发和响应时间。

示例调用：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command device.status --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command device.apps --params '{"limit":10}'
openclaw nodes invoke --node <idOrNameOrIp> --command notifications.list --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command photos.latest --params '{"limit":1}'
```
