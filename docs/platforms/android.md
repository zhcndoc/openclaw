---
summary: "Android 应用（node）：连接运行手册 + Connect/Chat/Voice/Canvas 命令面"
read_when:
  - 配对或重新连接 Android 节点
  - 调试 Android 网关发现或身份验证
  - 验证各客户端之间的聊天历史一致性
title: "Android 应用"
---

<Note>
官方 Android 应用可在 [Google Play](https://play.google.com/store/apps/details?id=ai.openclaw.app&hl=en_IN) 获取。它是一个伴生节点，需要一个正在运行的 OpenClaw Gateway。源代码也可在 [OpenClaw 仓库](https://github.com/openclaw/openclaw) 的 `apps/android` 中找到；构建说明请参见 [apps/android/README.md](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md)。
</Note>

## 支持概览

- 角色：伴生节点应用（Android 不承载 Gateway）。
- 需要 Gateway：是（在 macOS、Linux 或通过 WSL2 的 Windows 上运行）。
- 安装：应用请见 [Google Play](https://play.google.com/store/apps/details?id=ai.openclaw.app&hl=en_IN)，Gateway 请见 [Getting Started](/start/getting-started)，然后进行 [配对](/channels/pairing)。
- Gateway：[运行手册](/gateway) + [配置](/gateway/configuration)。
  - 协议：[Gateway 协议](/gateway/protocol)（节点 + 控制平面）。

## 系统控制

系统控制（launchd/systemd）位于 Gateway 主机上。参见 [Gateway](/gateway)。

## 连接运行手册

Android 节点应用 ⇄（mDNS/NSD + WebSocket）⇄ **Gateway**

Android 直接连接到 Gateway WebSocket，并使用设备配对（`role: node`）。

对于 Tailscale 或公共主机，Android 需要一个安全端点：

- 首选：Tailscale Serve / Funnel，使用 `https://<magicdns>` / `wss://<magicdns>`
- 也支持：任何其他带真实 TLS 端点的 `wss://` Gateway URL
- 明文 `ws://` 仍支持私有局域网地址 / `.local` 主机，以及 `localhost`、`127.0.0.1` 和 Android 模拟器桥接地址（`10.0.2.2`）

### 前提条件

- 你可以在“主”机器上运行 Gateway。
- Android 设备/模拟器可以访问 gateway WebSocket：
  - 同一局域网，使用 mDNS/NSD，**或**
  - 位于同一 Tailscale tailnet，并使用广域 Bonjour / 单播 DNS-SD（见下文），**或**
  - 手动指定 gateway 主机/端口（回退方案）
- tailnet/公网移动端配对**不**使用原始 tailnet IP 的 `ws://` 端点。请改用 Tailscale Serve 或其他 `wss://` URL。
- 你可以在 gateway 机器上运行 CLI（`openclaw`）（或通过 SSH 运行）。

### 1) 启动 Gateway

```bash
openclaw gateway --port 18789 --verbose
```

确认日志中看到类似内容：

- `listening on ws://0.0.0.0:18789`

对于通过 Tailscale 进行的远程 Android 访问，优先使用 Serve/Funnel，而不是直接绑定到原始 tailnet：

```bash
openclaw gateway --tailscale serve
```

这会为 Android 提供一个安全的 `wss://` / `https://` 端点。仅仅设置 `gateway.bind: "tailnet"` 对首次远程 Android 配对来说还不够，除非你另外单独终止 TLS。

### 2) 验证发现（可选）

在 gateway 机器上：

```bash
dns-sd -B _openclaw-gw._tcp local.
```

更多调试说明：[Bonjour](/gateway/bonjour)。

如果你还配置了广域发现域，请与以下命令结果进行比较：

```bash
openclaw gateway discover --json
```

该命令会一次性显示 `local.` 以及配置的广域域，并使用解析后的
服务端点，而不是仅依赖 TXT 提示。

#### 通过单播 DNS-SD 在 tailnet（Vienna ⇄ London）中发现

Android NSD/mDNS 发现不会跨网络。如果你的 Android 节点和 gateway 位于不同网络，但通过 Tailscale 连接，请改用广域 Bonjour / 单播 DNS-SD。

仅靠发现不足以完成 tailnet/公网 Android 配对。发现到的路由仍需要一个安全端点（`wss://` 或 Tailscale Serve）：

1. 在 gateway 主机上设置一个 DNS-SD 区域（示例 `openclaw.internal.`），并发布 `_openclaw-gw._tcp` 记录。
2. 为你选择的域名配置 Tailscale split DNS，使其指向该 DNS 服务器。

详细信息和 CoreDNS 配置示例：[Bonjour](/gateway/bonjour)。

### 3) 从 Android 连接

在 Android 应用中：

- 应用通过**前台服务**（常驻通知）保持与 gateway 的连接。
- 打开 **Connect** 选项卡。
- 使用 **Setup Code** 或 **Manual** 模式。
- 如果发现被阻止，请在 **Advanced controls** 中手动填写 host/port。对于私有局域网主机，`ws://` 仍然可用。对于 Tailscale/公网主机，请开启 TLS 并使用 `wss://` / Tailscale Serve 端点。

首次成功配对后，Android 会在启动时自动重连：

- 首先使用手动端点（如果已启用），否则使用
- 上次发现的 gateway（尽力而为）。

### 存活信标

在经过身份验证的节点会话连接后，以及当应用切换到后台而前台服务仍保持连接时，Android 会调用 `node.event`，并带上
`event: "node.presence.alive"`。网关会在已配对节点/设备元数据上记录为 `lastSeenAtMs`/`lastSeenReason`，但仅在已知经过身份验证的节点设备身份之后才会记录。

只有当 gateway 响应包含
`handled: true` 时，应用才会将该信标视为成功记录。较旧的 gateway 可能会以 `{ "ok": true }` 确认 `node.event`；该响应是兼容的，但不计为持久的 last-seen 更新。

### 4) 批准配对（CLI）

在 gateway 机器上：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

配对详情：[配对](/channels/pairing)。

可选：如果 Android 节点始终从严格受控的子网连接，
你可以通过显式 CIDR 或精确 IP 启用首次节点自动批准：

```json5
{
  gateway: {
    nodes: {
      pairing: {
        autoApproveCidrs: ["192.168.1.0/24"],
      },
    },
  },
}
```

默认情况下此功能是禁用的。它仅适用于没有请求 scopes 的全新 `role: node` 配对。操作员/浏览器配对，以及任何角色、scope、元数据或公钥变更，仍然需要手动批准。

### 5) 验证节点已连接

- 通过 nodes 状态：

  ```bash
  openclaw nodes status
  ```

- 通过 Gateway：

  ```bash
  openclaw gateway call node.list --params "{}"
  ```

### 6) 聊天 + 历史记录

Android 的 Chat 选项卡支持会话选择（默认 `main`，以及其他已存在的会话）：

- 历史记录：`chat.history`（显示已归一化；内联指令标签会从可见文本中移除，纯文本工具调用 XML 载荷（包括
  `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、
  `<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>`，以及
  被截断的工具调用块）和泄露的 ASCII/全角模型控制 token 会被移除，纯静默 token 的 assistant 行（例如精确的 `NO_REPLY` /
  `no_reply`）会被省略，超大行可能会被占位符替换）
- 发送：`chat.send`
- 推送更新（尽力而为）：`chat.subscribe` → `event:"chat"`

### 7) Canvas + 摄像头

#### Gateway Canvas Host（推荐用于网页内容）

如果你希望节点展示代理可以在磁盘上编辑的真实 HTML/CSS/JS，请将节点指向 Gateway canvas host。

<Note>
节点从 Gateway HTTP 服务器加载 canvas（端口与 `gateway.port` 相同，默认 `18789`）。
</Note>

1. 在 gateway 主机上创建 `~/.openclaw/workspace/canvas/index.html`。

2. 将节点导航到该页面（局域网）：

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18789/__openclaw__/canvas/"}'
```

Tailscale（可选）：如果两台设备都在 Tailscale 上，请使用 MagicDNS 名称或 tailnet IP 替代 `.local`，例如 `http://<gateway-magicdns>:18789/__openclaw__/canvas/`。

该服务器会向 HTML 注入一个 live-reload 客户端，并在文件变更时重新加载。
A2UI 主机位于 `http://<gateway-host>:18789/__openclaw__/a2ui/`。

Canvas 命令（仅前台）：

- `canvas.eval`、`canvas.snapshot`、`canvas.navigate`（使用 `{"url":""}` 或 `{"url":"/"}` 返回默认骨架）。`canvas.snapshot` 返回 `{ format, base64 }`（默认 `format="jpeg"`）。
- A2UI：`canvas.a2ui.push`、`canvas.a2ui.reset`（`canvas.a2ui.pushJSONL` 为旧版别名）

摄像头命令（仅前台；受权限控制）：

- `camera.snap`（jpg）
- `camera.clip`（mp4）

参数和 CLI 辅助工具请参见 [Camera node](/nodes/camera)。

### 8) Voice + 扩展 Android 命令面

- Voice 选项卡：Android 有两种显式捕获模式。**Mic** 是一个手动的 Voice 选项卡会话，会将每次停顿作为一次聊天回合发送，并在应用离开前台或用户离开 Voice 选项卡时停止。**Talk** 是连续的 Talk Mode，会持续监听，直到被切换关闭或节点断开连接。
- Talk Mode 会在捕获开始前将现有前台服务从 `dataSync` 提升为 `dataSync|microphone`，然后在 Talk Mode 停止时降级。Android 14+ 需要 `FOREGROUND_SERVICE_MICROPHONE` 声明、`RECORD_AUDIO` 运行时授权，以及运行时的 microphone 服务类型。
- 默认情况下，Android Talk 使用本地语音识别、Gateway chat，以及通过已配置的 gateway Talk 提供方的 `talk.speak`。仅当 `talk.speak` 不可用时，才使用本地系统 TTS。
- 仅当 `talk.realtime.mode` 为 `realtime` 且 `talk.realtime.transport` 为 `gateway-relay` 时，Android Talk 才使用实时 Gateway relay。
- 在 Android 的 UX/runtime 中，Voice wake 仍然是禁用的。
- 其他 Android 命令族（可用性取决于设备 + 权限）：
  - `device.status`、`device.info`、`device.permissions`、`device.health`
  - `notifications.list`、`notifications.actions`（见下文 [通知转发](#notification-forwarding)）
  - `photos.latest`
  - `contacts.search`、`contacts.add`
  - `calendar.events`、`calendar.add`
  - `callLog.search`
  - `sms.search`
  - `motion.activity`、`motion.pedometer`

## 助手入口点

Android 支持通过系统助手触发器（Google
Assistant）启动 OpenClaw。配置完成后，长按 Home 键或说“Hey Google, ask
OpenClaw...” 会打开应用并将提示词送入聊天输入框。

这使用的是在应用清单中声明的 Android **App Actions** 元数据。网关端不需要
额外配置——助手意图完全由 Android 应用处理，并作为普通聊天消息转发。

<Note>
App Actions 的可用性取决于设备、Google Play Services 版本，
以及用户是否已将 OpenClaw 设置为默认助手应用。
</Note>

## 通知转发

Android 可以将设备通知作为事件转发到网关。若干控制项允许你限定哪些通知会被转发以及何时转发。

| 键                               | 类型           | 描述                                                                                       |
| -------------------------------- | -------------- | ------------------------------------------------------------------------------------------ |
| `notifications.allowPackages`    | string[]       | 仅转发来自这些包名的通知。如果设置了该项，则会忽略所有其他包。      |
| `notifications.denyPackages`     | string[]       | 永不转发来自这些包名的通知。在 `allowPackages` 之后应用。              |
| `notifications.quietHours.start` | string (HH:mm) | 静默时段开始时间（设备本地时间）。在此时间窗口内会抑制通知。 |
| `notifications.quietHours.end`   | string (HH:mm) | 静默时段结束时间。                                                                        |
| `notifications.rateLimit`        | number         | 每个包每分钟最多可转发的通知数量。超出的通知会被丢弃。         |

通知选择器还会对转发的通知事件使用更安全的行为，防止意外转发敏感的系统通知。

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
通知转发需要 Android Notification Listener 权限。应用会在设置过程中提示你授予此权限。
</Note>

## 相关内容

- [iOS app](/platforms/ios)
- [Nodes](/nodes)
- [Android node troubleshooting](/nodes/troubleshooting)
