---
summary: "Android 应用（节点）：连接运行手册 + Connect/Chat/Voice/Canvas 命令界面"
read_when:
  - 配对或重新连接 Android 节点
  - 调试 Android 网关发现或认证
  - 验证不同客户端之间的聊天历史一致性
title: "Android 应用"
---

<Note>
Android 应用目前尚未公开发布。源代码可在 [OpenClaw 仓库](https://github.com/openclaw/openclaw) 的 `apps/android` 下找到。你可以使用 Java 17 和 Android SDK 自行构建它（`./gradlew :app:assemblePlayDebug`）。构建说明请参见 [apps/android/README.md](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md)。
</Note>

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

Android 直接连接到网关 WebSocket，并使用设备配对（`role: node`）。

对于 Tailscale 或公开主机，Android 需要一个安全端点：

- 首选：Tailscale Serve / Funnel，使用 `https://<magicdns>` / `wss://<magicdns>`
- 也支持：任何其他带有真实 TLS 端点的 `wss://` 网关 URL
- 明文 `ws://` 仍支持私有 LAN 地址 / `.local` 主机，以及 `localhost`、`127.0.0.1` 和 Android 模拟器桥接（`10.0.2.2`）

### 前提条件

- 你可以在“主”机器上运行网关。
- Android 设备/模拟器可以访问网关 WebSocket：
  - 同一 LAN，使用 mDNS/NSD，**或**
  - 同一 Tailscale tailnet，使用 Wide-Area Bonjour / 单播 DNS-SD（见下文），**或**
  - 手动网关主机/端口（回退方案）
- tailnet/公开移动配对 **不** 使用原始 tailnet IP `ws://` 端点。请改用 Tailscale Serve 或其他 `wss://` URL。
- 你可以在网关机器上（或通过 SSH）运行 CLI（`openclaw`）。

### 1) 启动网关

```bash
openclaw gateway --port 18789 --verbose
```

在日志中确认看到类似：

- `listening on ws://0.0.0.0:18789`

对于通过 Tailscale 的远程 Android 访问，优先使用 Serve/Funnel，而不是原始 tailnet 绑定：

```bash
openclaw gateway --tailscale serve
```

这会为 Android 提供一个安全的 `wss://` / `https://` 端点。仅配置 `gateway.bind: "tailnet"` 对首次远程 Android 配对来说还不够，除非你另外单独终止 TLS。

### 2) 验证发现（可选）

从网关机器执行：

```bash
dns-sd -B _openclaw-gw._tcp local.
```

更多调试说明请参阅：[Bonjour](/gateway/bonjour)。

如果你还配置了广域发现域，请对照检查：

```bash
openclaw gateway discover --json
```

这会一次性显示 `local.` 以及已配置的广域域名，并使用解析后的服务端点，而不是仅基于 TXT 的提示。

#### 通过单播 DNS-SD 进行 tailnet（Vienna ⇄ London）发现

Android NSD/mDNS 发现不会跨网络。如果你的 Android 节点和网关位于不同网络，但通过 Tailscale 连接，请改用 Wide-Area Bonjour / 单播 DNS-SD。

仅有发现并不足以完成 tailnet/公开 Android 配对。发现到的路由仍然需要一个安全端点（`wss://` 或 Tailscale Serve）：

1. 在网关主机上设置一个 DNS-SD 区域（示例为 `openclaw.internal.`），并发布 `_openclaw-gw._tcp` 记录。
2. 配置 Tailscale 分割 DNS，使你选择的域名指向该 DNS 服务器。

详情和 CoreDNS 配置示例请见：[Bonjour](/gateway/bonjour)。

### 3) 从 Android 连接

在 Android 应用中：

- 应用通过 **前台服务**（持久通知）保持与网关的连接。
- 打开 **Connect** 选项卡。
- 使用 **Setup Code** 或 **Manual** 模式。
- 如果发现被阻止，请在 **Advanced controls** 中使用手动主机/端口。对于私有 LAN 主机，`ws://` 仍然可用。对于 Tailscale/公开主机，请开启 TLS 并使用 `wss://` / Tailscale Serve 端点。

首次配对成功后，Android 会在启动时自动重连：

- 手动端点（如果启用），否则
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

- 历史：`chat.history`（显示标准化；内联指令标签会从可见文本中移除，纯文本工具调用 XML 载荷（包括
  `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、
  `<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>`，以及
  被截断的工具调用块）和泄漏的 ASCII/全角模型控制令牌会被移除，纯静默令牌的 assistant 行（如精确的 `NO_REPLY` /
  `no_reply`）会被省略，过大的行可被占位符替代）
- 发送：`chat.send`
- 推送更新（尽力而为）：`chat.subscribe` → `event:"chat"`

### 7) Canvas + 相机

#### 网关 Canvas 主机（推荐用于网页内容）

如果你希望节点显示真实的 HTML/CSS/JS，且代理可以在磁盘上编辑，请将节点指向网关的 Canvas 主机。

<Note>
节点从网关 HTTP 服务器加载 canvas（与 `gateway.port` 相同的端口，默认 `18789`）。
</Note>

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

- 语音：Android 在 Voice 选项卡中使用单一的麦克风开/关流程，支持转录捕获和 `talk.speak` 播放。仅当 `talk.speak` 不可用时才使用本地系统 TTS。应用离开前台时语音会停止。
- 语音唤醒/对话模式切换目前已从 Android UX/runtime 中移除。
- 额外的 Android 命令族（可用性取决于设备 + 权限）：
  - `device.status`、`device.info`、`device.permissions`、`device.health`
  - `notifications.list`、`notifications.actions`（见下方 [Notification forwarding](#notification-forwarding)）
  - `photos.latest`
  - `contacts.search`、`contacts.add`
  - `calendar.events`、`calendar.add`
  - `callLog.search`
  - `sms.search`
  - `motion.activity`、`motion.pedometer`

## Assistant 入口点

Android 支持从系统助手触发器（Google Assistant）启动 OpenClaw。配置后，长按主页按钮或说“Hey Google, ask OpenClaw...” 会打开应用，并将提示词输入聊天编写器。

这使用的是在应用清单中声明的 Android **App Actions** 元数据。网关侧不需要额外配置——助手意图完全由 Android 应用处理，并作为普通聊天消息转发。

<Note>
App Actions 的可用性取决于设备、Google Play 服务版本，以及用户是否将 OpenClaw 设为默认助手应用。
</Note>

## 通知转发

Android 可以将设备通知作为事件转发到网关。若干控制项可让你限定转发哪些通知以及在何时转发。

| Key                              | Type           | Description                                                                                       |
| -------------------------------- | -------------- | ------------------------------------------------------------------------------------------------- |
| `notifications.allowPackages`    | string[]       | 只转发来自这些包名的通知。如果设置了，则会忽略所有其他包。      |
| `notifications.denyPackages`     | string[]       | 永不转发来自这些包名的通知。在 `allowPackages` 之后应用。              |
| `notifications.quietHours.start` | string (HH:mm) | 勿扰时段开始时间（设备本地时间）。在此窗口内会静默通知。 |
| `notifications.quietHours.end`   | string (HH:mm) | 勿扰时段结束时间。                                                                        |
| `notifications.rateLimit`        | number         | 每个包每分钟最多转发的通知数。超出的通知会被丢弃。         |

通知选择器还会对转发的通知事件采用更安全的行为，防止无意转发敏感系统通知。

示例配置：

```json5
{
  notifications: {
    allowPackages: ["com.slack", "com.whatsapp"],
    denyPackages: ["com.android.systemui"],
    quietHours: {
      start: "22:00",
      end: "07:00",
    },
    rateLimit: 5,
  },
}
```

<Note>
通知转发需要 Android Notification Listener 权限。应用会在设置过程中提示你授予该权限。
</Note>

## 相关内容

- [iOS app](/platforms/ios)
- [节点](/nodes)
- [Android 节点故障排查](/nodes/troubleshooting)
