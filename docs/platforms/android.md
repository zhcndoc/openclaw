---
summary: "Android 应用（节点）：连接运行手册 + Connect/Chat/Voice/Canvas 命令界面"
read_when:
  - 配对或重新连接 Android 节点
  - 调试 Android 网关发现或身份认证
  - 验证跨客户端的聊天历史一致性
title: "Android 应用"
---

# Android 应用（节点）

> **Note:** The Android app has not been publicly released yet. The source code is available in the [OpenClaw repository](https://github.com/openclaw/openclaw) under `apps/android`. You can build it yourself using Java 17 and the Android SDK (`./gradlew :app:assemblePlayDebug`). See [apps/android/README.md](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md) for build instructions.

## 支持快照

- 角色：伴随节点应用（Android 不承载网关）。
- 需要网关：是（运行在 macOS、Linux 或通过 WSL2 的 Windows 上）。
- 安装：[快速开始](/start/getting-started) + [配对](/channels/pairing)。
- 网关：[运行手册](/gateway) + [配置](/gateway/configuration)。
  - 协议：[网关协议](/gateway/protocol)（节点 + 控制面）。

## 系统控制

系统控制（launchd/systemd）运行在网关主机上。请参见 [网关](/gateway)。

## 连接运行手册

Android 节点应用 ⇄ (mDNS/NSD + WebSocket) ⇄ **网关**

Android 直接连接至网关 WebSocket（默认 `ws://<host>:18789`），使用设备配对（`role: node`）。

### 前提条件

- 你可以在“主控”机器上运行网关。
- Android 设备/模拟器能够访问网关 WebSocket：
  - 在同一局域网且支持 mDNS/NSD，**或者**
  - 在同一 Tailscale tailnet，使用宽域 Bonjour / 单播 DNS-SD（见下文），**或者**
  - 手动设置网关主机/端口（备选）
- 你可以在网关机器上（或通过 SSH）运行 CLI（`openclaw`）。

### 1) 启动网关

```bash
openclaw gateway --port 18789 --verbose
```

在日志中确认看到类似：

- `listening on ws://0.0.0.0:18789`

对于仅 tailnet 的配置（推荐用于 Vienna ⇄ London），请绑定网关到 tailnet IP：

- 在网关主机的 `~/.openclaw/openclaw.json` 设置 `gateway.bind: "tailnet"`。
- 重启网关 / macOS 菜单栏应用。

### 2) 验证发现（可选）

从网关机器执行：

```bash
dns-sd -B _openclaw-gw._tcp local.
```

更多调试说明请参阅：[Bonjour](/gateway/bonjour)。

#### 通过单播 DNS-SD 实现 Tailnet（Vienna ⇄ London）发现

Android 的 NSD/mDNS 发现不能跨网络。如果你的 Android 节点和网关在不同网络，但通过 Tailscale 连接，请使用宽域 Bonjour / 单播 DNS-SD：

1. 在网关主机上设置一个 DNS-SD 区域（示例为 `openclaw.internal.`），并发布 `_openclaw-gw._tcp` 记录。
2. 配置 Tailscale 分割 DNS，针对你选择的域名指向该 DNS 服务器。

详情和 CoreDNS 配置示例请见：[Bonjour](/gateway/bonjour)。

### 3) 从 Android 连接

在 Android 应用中：

- 应用通过 **前台服务**（持续通知）保持网关连接活跃。
- 打开 **连接** 标签。
- 使用 **设置码** 或 **手动** 模式。
- 若发现被阻止，使用 **高级控制** 中的手动主机/端口（及需要时的 TLS/token/密码）。

首次配对成功后，Android 会在启动时自动重连：

- 手动端点（若启用），否则
- 上一次发现的网关（尽力而为）。

### 4) 批准配对（CLI）

在网关机器上：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

配对详情：[配对](/channels/pairing)。

### 5) 验证节点已连接

- 通过节点状态：

  ```bash
  openclaw nodes status
  ```

- 通过网关：

  ```bash
  openclaw gateway call node.list --params "{}"
  ```

### 6) 聊天 + 历史

Android 聊天标签支持会话选择（默认 `main`，还有其他存在的会话）：

- 历史：`chat.history`
- 发送：`chat.send`
- 推送更新（尽力而为）：`chat.subscribe` → `event:"chat"`

### 7) Canvas + 相机

#### Gateway Canvas Host (推荐用于网页内容)

如果你希望节点显示真实的 HTML/CSS/JS，且代理可以在磁盘上编辑，指向节点至网关的 Canvas 主机。

注意：节点从网关的 HTTP 服务器加载 Canvas（端口与 `gateway.port` 相同，默认 `18789`）。

1. 在网关主机上创建 `~/.openclaw/workspace/canvas/index.html`。

2. 让节点导航至该地址（局域网）：

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18789/__openclaw__/canvas/"}'
```

Tailnet（可选）：如果两台设备都在 Tailscale 网络上，使用 MagicDNS 名称或 tailnet IP 替代 `.local`，如 `http://<gateway-magicdns>:18789/__openclaw__/canvas/`。

此服务器会在 HTML 中注入实时重载客户端，并在文件更改时自动刷新。
A2UI 主机位于 `http://<gateway-host>:18789/__openclaw__/a2ui/`。

Canvas 命令（仅前台）：

- `canvas.eval`、`canvas.snapshot`、`canvas.navigate`（使用 `{"url":""}` 或 `{"url":"/"}` 返回默认框架）。`canvas.snapshot` 返回 `{ format, base64 }`（默认 `format="jpeg"`）。
- A2UI：`canvas.a2ui.push`，`canvas.a2ui.reset`（`canvas.a2ui.pushJSONL` 旧别名）

相机命令（仅前台；需权限）：

- `camera.snap`（jpg）
- `camera.clip`（mp4）

详情及 CLI 辅助见 [Camera node](/nodes/camera)。

### 8) 语音 + 扩展的 Android 命令集

- 语音：Android 在语音标签使用单一的麦克风开/关流程，支持转录捕获和 TTS 播放（配置时使用 ElevenLabs，否则系统 TTS 备选）。应用离开前台时语音停止。
- 语音唤醒/对话模式切换目前已移除 Android 界面/运行时。
- 其他 Android 命令类别（可用性依设备及权限）：
  - `device.status`，`device.info`，`device.permissions`，`device.health`
  - `notifications.list`，`notifications.actions`
  - `photos.latest`
  - `contacts.search`, `contacts.add`
  - `calendar.events`, `calendar.add`
  - `callLog.search`
  - `sms.search`
  - `motion.activity`, `motion.pedometer`
