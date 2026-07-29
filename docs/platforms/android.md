---
summary: "Android 应用（node）：连接运行手册 + Connect/Chat/OpenClaw/Voice/Canvas 命令面"
read_when:
  - 配对或重新连接 Android 节点
  - 排查 Android 网关发现或认证问题
  - 从远程 Mac 镜像或控制 Android 设备
  - 验证跨客户端的聊天历史一致性
title: "Android 应用"
---

<Note>
官方 Android 应用可在 [Google Play](https://play.google.com/store/apps/details?id=ai.openclaw.app&hl=en_IN) 获取，也可作为已签名的独立 APK 在受支持的 [GitHub Releases](https://github.com/openclaw/openclaw/releases) 中下载。它是一个配套节点，需要运行中的 OpenClaw Gateway。来源：[apps/android](https://github.com/openclaw/openclaw/tree/main/apps/android)（[构建说明](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md)）。
</Note>

## 支持概览

- 角色：伴随节点应用（Android 不托管 Gateway）。
- 需要 Gateway：是（在 macOS、Linux 或通过 WSL2 的 Windows 上运行它）。
- 安装：[Google Play](https://play.google.com/store/apps/details?id=ai.openclaw.app&hl=en_IN) 或从受支持的 [GitHub Release](https://github.com/openclaw/openclaw/releases) 获取 `OpenClaw-Android.apk`，[Gateway 的入门指南](/start/getting-started)，然后进行[配对](/channels/pairing)。
- Gateway：[运行手册](/gateway) + [配置](/gateway/configuration)。
  - 协议：[Gateway 协议](/gateway/protocol)（节点 + 控制平面）。
- **设置 → OpenClaw** 会在操作员连接具备 `operator.admin` 且 Gateway 支持 `openclaw.chat` 时打开一个专用的 Gateway 设置助手。其设置对话与普通 Chat 保持分离，在本地会对机密回复进行脱敏，并且只有在你点击 **Open Chat** 后才会切换到 Chat。

系统控制（launchd/systemd）位于 Gateway 主机上——请参见 [Gateway](/gateway)。

## 同时网关会话

先将每个 Gateway 配对一次，然后打开 **Settings → Gateway**。勾选标记表示当前聚焦的 Gateway，每个开关控制未聚焦的 Gateway 的操作员会话是否保持连接。启用的 Gateways 在应用处于前台时会独立重新连接，因此切换焦点不会断开其他连接。只有聚焦的 Gateway 拥有 Android 节点会话和设备能力；这可防止多个 Gateway 向同一部手机发出相机、位置、屏幕或通知命令。当应用离开前台后，Android 可能会挂起次级连接。

## Wear OS 伴侣应用

Wear OS 伴侣应用使用已配对 Android 手机上的已认证 Gateway 连接；手表不会接收或存储 Gateway 凭据。它可以选择代理和会话，读取有限的对话记录，发送文本或口述回复，中止正在进行的运行，在所选会话中启动实时 Talk，并连接或断开已配对手机的 Gateway。它还提供本地回复通知、深色或浅色外观，以及可选的回复自动语音播放。代理和 Gateway 控制通过能力协商来支持手机/手表分阶段更新。实时 Talk 会通过临时的 Wear OS Data Layer 通道传输麦克风和播放音频，并在所选手机、Gateway 连接或音频通道丢失时停止。

## 安装到 Google Play 之外

正式版和修正版的 GitHub Releases 都包含一个通用的 `OpenClaw-Android.apk` 和 `OpenClaw-Android-SHA256SUMS.txt`。APK 由发布标签构建，使用 OpenClaw Android 发布密钥签名，并带有 GitHub Actions 溯源信息。

请选择一个同时列出这两个资源的 [release](https://github.com/openclaw/openclaw/releases)，然后在侧载前下载并验证该确切标签：

```bash
release_tag=vYYYY.M.PATCH
gh release download "$release_tag" \
  --repo openclaw/openclaw \
  --pattern OpenClaw-Android.apk \
  --pattern OpenClaw-Android-SHA256SUMS.txt
sha256sum --check OpenClaw-Android-SHA256SUMS.txt
gh attestation verify OpenClaw-Android.apk \
  --repo openclaw/openclaw \
  --signer-workflow openclaw/openclaw/.github/workflows/android-release.yml \
  --source-ref "refs/tags/${release_tag}" \
  --deny-self-hosted-runners
```

<Warning>
Google Play 和独立 APK 安装使用不同的更新渠道，且可能具有不同的签名标识。Android 可能要求在切换渠道之前卸载现有应用，这会删除其本地应用数据。正常更新请保持在同一渠道。
</Warning>

## 从远程 Mac 镜像并控制 Android

[scrcpy](https://github.com/Genymobile/scrcpy) 会在 macOS 窗口中镜像 Android 屏幕，并通过 Android 调试桥接（ADB）转发键盘和指针输入。这是一种操作端工作流，独立于 OpenClaw 节点连接。当 Android 设备和 Mac 处于不同地点，但共享一个私有 Tailscale 网络时，它非常有用。

### 开始之前

- 在 Android 设备和 Mac 上安装 Tailscale，并将两者连接到同一个 tailnet。
- 在 Android 上，启用 **开发者选项** 和 **USB 调试**。Android 16 将 **无线调试** 放在 **设置 > 系统 > 开发者选项** 下。参见 [Android 开发者选项](https://developer.android.com/studio/debug/dev-options)。
- 在 Mac 上安装 scrcpy 和 ADB：

  ```bash
  brew install scrcpy
  brew install --cask android-platform-tools
  ```

- 在首次连接时保持 Android 设备可用。Android 必须先批准每台 Mac 的 ADB 密钥，然后该 Mac 才能控制设备。

### 启用通过 TCP 的 ADB

首次设置时，将 Android 设备通过 USB 连接到一台可信电脑，并批准其调试提示。然后运行：

```bash
adb devices
adb tcpip 5555
```

现在你可以断开 USB 连接。如果设备重启或调试重置后 5555 端口停止监听，请重复此本地设置步骤。Android 11 及更高版本也可以通过 **无线调试 > 使用配对码配对设备** 和 `adb pair` 来建立初始信任。

### 仅允许控制端 Mac

具有严格授权规则的 tailnet 必须显式允许控制端 Mac 访问 Android 设备上的 TCP 5555 端口。向 tailnet 策略中添加一条窄范围规则，并用两台设备的稳定 Tailscale IP 替换示例地址：

```json5
{
  grants: [
    {
      src: ["<远程 Mac 的 tailnet IP>"],
      dst: ["<Android 的 tailnet IP>"],
      ip: ["tcp:5555"],
    },
  ],
}
```

有关主机别名和其他选择器，请参阅 [Tailscale 授权规则](https://tailscale.com/docs/reference/syntax/grants)。不要将此端口授予公网，也不要通过 Funnel 暴露它：授权的 ADB 客户端对设备拥有广泛控制权限。

### 连接并开始镜像

在远程 Mac 上：

```bash
adb connect <android-tailnet-ip>:5555
adb devices
scrcpy --serial <android-tailnet-ip>:5555
```

此 Mac 首次执行 `adb connect` 时，Android 上会显示授权对话框。解锁设备，确认密钥指纹，并且只有在该 Mac 值得信任时才选择 **始终允许此计算机**。成功的 `adb devices` 条目以 `device` 结尾；`unauthorized` 表示设备上的提示尚未获批。

一旦 scrcpy 窗口打开，你可以直接使用它，或者将其作为目标交给 macOS 屏幕自动化工具，例如 [Peekaboo](https://peekaboo.sh/)。scrcpy 负责传输显示和输入；Tailscale 仅提供私有网络路径。

### 故障排除

- `Connection timed out`：验证 TCP 5555 的 tailnet 授权规则。成功的 `tailscale ping` 只能证明对等端可达，并不能证明策略允许此 TCP 端口。请在 Mac 上使用 `nc -vz <android-tailnet-ip> 5555` 测试。
- `unauthorized`：解锁 Android 并批准远程 Mac 的 ADB 密钥，或者在 **无线调试 > 已配对的设备** 下移除过期的工作站，然后重新配对。
- `Connection refused`：重新本地连接并再次运行 `adb tcpip 5555`。
- 列出了多个设备：保留明确的 `--serial <android-tailnet-ip>:5555` 参数。

完成后，关闭 scrcpy 并断开 ADB：

```bash
adb disconnect <android-tailnet-ip>:5555
```

## 连接运行手册

Android 节点应用 ⇄（mDNS/NSD + WebSocket）⇄ **Gateway**

Android 直接连接到 Gateway WebSocket，并使用设备配对（`role: node`）。

对于 Tailscale 或公共主机，Android 需要一个安全端点：

- 优先：使用 Tailscale Serve / Funnel，并通过 `https://<magicdns>` / `wss://<magicdns>`
- 也支持：任何其他带真实 TLS 端点的 `wss://` Gateway URL
- 仍支持明文 `ws://`：适用于私有 LAN 地址 / `.local` 主机，以及 `localhost`、`127.0.0.1` 和 Android 模拟器桥接地址 (`10.0.2.2`)；非回环地址的设置会自动使用受限操作者权限

### 前提条件

- Gateway 在另一台机器上运行（或可通过 SSH 访问）。
- Android 设备/模拟器可以连接到 gateway WebSocket：
  - 同一局域网内，使用 mDNS/NSD，**或**
  - 同一 Tailscale tailnet，使用广域 Bonjour / 单播 DNS-SD（见下文），**或**
  - 手动指定 gateway 主机/端口（回退方案）
- tailnet/公网移动端配对 **不** 使用原始 tailnet IP `ws://` 端点。请改用 Tailscale Serve 或其他 `wss://` URL。
- gateway 机器上可用 `openclaw` CLI（或通过 SSH），用于批准配对请求。

### 1. 启动 Gateway

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

### 2. 验证发现（可选）

在 gateway 机器上：

```bash
dns-sd -B _openclaw-gw._tcp local.
```

更多调试说明：[Bonjour](/gateway/bonjour)。

如果你还配置了广域发现域，请与以下命令结果进行比较：

```bash
openclaw gateway discover --json
```

这会在一次执行中显示 `local.` 以及已配置的广域域名，并使用解析后的服务端点，而不是仅依赖 TXT 提示。

#### 通过单播 DNS-SD 跨网络发现

Android NSD/mDNS 发现不会跨网络。如果 Android 节点和 gateway 处于不同网络，但通过 Tailscale 连接，请改用广域 Bonjour / 单播 DNS-SD。仅有发现还不足以完成 tailnet/公网 Android 配对——发现到的路由仍然需要一个安全端点（`wss://` 或 Tailscale Serve）：

1. 在 gateway 主机上设置一个 DNS-SD 区域（示例 `openclaw.internal.`），并发布 `_openclaw-gw._tcp` 记录。
2. 为你选择的域名配置 Tailscale split DNS，使其指向该 DNS 服务器。

详细信息和 CoreDNS 配置示例：[Bonjour](/gateway/bonjour)。

### 3. 从 Android 连接

在 Android 应用中：

- 应用通过**前台服务**（常驻通知）保持与 gateway 的连接。
- 打开 **Connect** 选项卡。
- 使用 **Setup Code** 或 **Manual** 模式。
- 如果发现被阻止，请在 **Advanced controls** 中手动填写 host/port。对于私有局域网主机，`ws://` 仍然可用。对于 Tailscale/公网主机，请开启 TLS 并使用 `wss://` / Tailscale Serve 端点。

首次成功配对后，Android 会在启动时自动重新连接到当前已配对的 gateway（对已发现的 gateway 尽力而为，前提是它们在网络中可见）。

官方设置码会将 Android 作为节点连接，并默认通过 `wss://` 授予完整的 Gateway 操作员访问权限。明文的非回环 `ws://` 设置会自动使用受限权限，以保证 bearer token 安全。**Settings → Gateway** 会显示 **Full** 或 **Limited** 访问。若要使用受限连接，请配置 `wss://` 或 Tailscale Serve，在 Control UI 中或使用 `openclaw qr` 生成新的完整访问代码，然后在该页面扫描或粘贴并重新连接。希望使用降级配置的操作者可以在 Control UI 中选择 **Limited access**，或运行 `openclaw qr --limited`。

### 管理已配对的 gateway

应用会为每一个已配对的 gateway 维护注册表，因此你可以保持操作者会话连接，并在不重新配对的情况下切换焦点：

- **Settings → Gateway** 会列出已配对的 gateway，并标记当前聚焦的那个。点击某项即可切换焦点；其他已启用的操作者会话仍保持连接。
- 每个开关控制的是：当应用处于前台时，该非聚焦的 Gateway 是否保持连接。当前聚焦的 Gateway 始终保持启用，并拥有手机的节点连接和设备能力。
- **Connect** 选项卡在配对了多个 gateway 时会显示一个快速切换器。
- 凭据、设备 token、TLS 信任、聊天历史以及离线排队消息都按每个 Gateway 单独存储。切换焦点不会混合不同 Gateway 的状态，而离线期间排队的消息只会发送到其写入时对应的 Gateway。
- **Forget** 会删除某个 gateway 的注册表项，以及其凭据、设备 token、TLS pin 和缓存的聊天内容。

### 存活信标

在已认证的节点会话连接后，当应用进入后台但前台服务仍保持连接时，Android 会调用 `node.event`，并带上 `event: "node.presence.alive"`。gateway 只有在已知已认证的节点设备身份后，才会将其记录为配对节点/设备元数据中的 `lastSeenAtMs`/`lastSeenReason`。

应用只有在 gateway 响应包含 `handled: true` 时，才会将该信标计为已成功记录。较旧的 gateway 可能会用 `{ "ok": true }` 确认 `node.event`；该响应是兼容的，但不计为持久化的最近在线更新。

### 4. 批准配对（CLI）

在 gateway 机器上：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

配对详情：[配对](/channels/pairing)。

可选：如果 Android 节点始终从严格受控的子网连接，你可以通过显式 CIDR 或精确 IP 启用首次节点自动批准：

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

默认情况下此功能是禁用的。它仅适用于没有请求任何 scope 的全新 `role: node` 配对。操作者/浏览器配对以及任何角色、scope、metadata 或公钥变更，仍然需要手动批准。

### 5. 验证节点已连接

```bash
openclaw nodes status
openclaw gateway call node.list --params "{}"
```

### 6. 聊天 + 历史记录

Android 的 Chat 选项卡支持会话选择（默认 `main`，以及其他已存在的会话）：

- History: `chat.history`（显示规范化——内联指令标签、纯文本工具调用 XML 负载（`<tool_call>`、`<function_call>`、`<tool_calls>`、`<function_calls>` 及其截断变体），以及泄露的 ASCII/全角模型控制 token 会被清除；像精确 `NO_REPLY` / `no_reply` 这样的静默 token 助手行会被省略；超大的行可替换为占位符）
- Send: `chat.send`
- Durable sending: every send (text, picked images, and voice notes) is journaled to a per-gateway on-device outbox before any network attempt, so app termination cannot lose submitted input. Sends queued while offline deliver in order on reconnect with stable idempotency keys, and a send is retired only after the turn is visible in canonical `chat.history` — an acknowledgement alone is not treated as proof of delivery. Ambiguous outcomes (lost acknowledgement, app killed mid-send, gateway restart before the transcript write) surface as visible rows with explicit **Retry**/**Delete** instead of auto-resending. Slash commands never auto-replay across a reconnect; they park for explicit retry. The queue is bounded (50 messages and 48 MB of attachment bytes per gateway) and unsent rows expire after 48 hours. Composer drafts that were never submitted are not process-durable.
- Image input works through the picker and Android Sharesheet. Assistant-generated images resolve through the paired Gateway connection, render inline with a full-screen preview, and retain only their small artifact references in the offline transcript cache. Downloads are capped at 12 MiB and decoded to bounded display bitmaps.
- Push updates (best-effort): `chat.subscribe` -> `event:"chat"`
- Listen: 长按某条助手消息并选择 **Listen** 即可收听；音频通过 gateway `tts.speak` 和已配置的 TTS provider chain 渲染，当 gateway 无法渲染音频时会使用设备上的系统 TTS。切换会话、开始新聊天、应用进入后台或关闭聊天时，播放都会停止。

### 7. Canvas + camera

#### Gateway Canvas Host（推荐用于网页内容）

要让节点显示代理可以在磁盘上编辑的真实 HTML/CSS/JS，请将节点指向 Gateway canvas 主机。

<Note>
节点从 Gateway HTTP 服务器加载 canvas（端口与 `gateway.port` 相同，默认 `18789`）。
</Note>

1. 在 gateway 主机上创建 `~/.openclaw/workspace/canvas/index.html`。
2. 将节点导航到它（局域网）：

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18789/__openclaw__/canvas/"}'
```

Tailscale（可选）：如果两台设备都在 Tailscale 上，请使用 MagicDNS 名称或 tailnet IP 替代 `.local`，例如 `http://<gateway-magicdns>:18789/__openclaw__/canvas/`。

此服务器会向 HTML 注入一个实时重载客户端，并在文件变更时重新加载。Gateway 还提供 `/__openclaw__/a2ui/`，但 Android 应用会将远程 A2UI 页面视为仅用于渲染。具备动作能力的 A2UI 命令使用内置的、由应用拥有的 A2UI 页面。

Canvas 命令（仅前台）：

- `canvas.eval`, `canvas.snapshot`, `canvas.navigate`（使用 `{"url":""}` 或 `{"url":"/"}` 返回默认骨架）。`canvas.snapshot` 返回 `{ format, base64 }`（默认 `format="jpeg"`）。
- A2UI: `canvas.a2ui.push`, `canvas.a2ui.reset`（`canvas.a2ui.pushJSONL` 为旧别名）。这些命令使用内置的、由应用拥有的 A2UI 页面进行可执行动作的渲染。

Camera 命令（仅前台；受权限限制）：`camera.snap`（jpg）、`camera.clip`（mp4）。参数和 CLI 辅助工具请参见 [Camera node](/nodes/camera)。

### 8. 语音 + 扩展的 Android 命令面

- Android 的 shell 导航包括 **Home**、**Chat** 和 **Settings**。语音输入属于 Chat 编辑器；没有单独的 Voice 选项卡。
- 点按编辑器麦克风可使用设备上的语音识别，并将转写内容插入草稿。长按麦克风可录制语音笔记附件。UI 会报告无法识别、权限缺失、繁忙/网络失败以及无语音等结果，而不是静默丢弃尝试。
- 从 Chat 波形开始持续 **Talk**。听写、语音笔记录制和 Talk 是互斥的麦克风路径。
- Talk Mode 会在捕获开始前将现有前台服务从 `connectedDevice` 提升为 `connectedDevice|microphone`，在 Talk Mode 停止时再降级。节点服务声明 `FOREGROUND_SERVICE_CONNECTED_DEVICE` 以及 `CHANGE_NETWORK_STATE`；Android 14+ 还需要 `FOREGROUND_SERVICE_MICROPHONE` 声明、`RECORD_AUDIO` 运行时授权，以及运行时的 microphone service type。
- 默认情况下，Android Talk 使用原生语音识别、Gateway chat，以及通过已配置的 gateway Talk provider 的 `talk.speak`。仅当 `talk.speak` 不可用时才使用本地系统 TTS。
- 只有当 `talk.realtime.mode` 为 `realtime` 且 `talk.realtime.transport` 为 `gateway-relay` 时，Android Talk 才使用实时 Gateway relay。
- Android 不会声明 `voiceWake` 能力。请使用 Chat 听写、语音笔记或 Talk 进行语音输入。
- 其他 Android 命令族（可用性取决于设备、权限和用户设置）：
  - `device.status`, `device.info`, `device.permissions`, `device.health`
  - 仅当启用 **Settings > Phone Capabilities > Installed Apps** 时，`device.apps` 才可用；默认列出启动器可见的应用（传入 `includeNonLaunchable` 可获取完整列表）。
  - `notifications.list`, `notifications.actions`（见下文 [通知转发](#notification-forwarding)）
  - `photos.latest`
  - `contacts.search`、`contacts.add`
  - `calendar.events`、`calendar.add`
  - `callLog.search`
  - `sms.search`
  - `motion.activity`、`motion.pedometer`

### 9. Workspace files（只读）

Home 概览中包含一个 **Files** 卡片，它通过只读的 `agents.workspace.list` / `agents.workspace.get` gateway RPC 浏览当前代理的工作区：支持目录下钻、文本和图片预览，以及通过 Android 分享面板导出。不提供任何写入操作，且预览大小受 gateway 限制。

## 审核命令批准

具有 `operator.admin` 的操作员连接，或由 Gateway 明确定位的配对 `operator.approvals` 连接，可以在 **Settings -> Approvals** 下审核待处理的 exec 请求。应用会在启用其按钮之前加载 Gateway 经过清理的批准记录，显示任何安全警告以及该请求提供的确切决策，并将批准 ID 和所有者类型回传给 Gateway。

批准状态与 Control UI 和受支持的聊天界面共享。第一个提交的答案获胜；即使另一个界面先回答，Android 也会显示该规范结果。如果 resolve 响应丢失或 Gateway 断开连接，应用会保持该操作锁定，并在提供另一个决策之前再次读取批准。

早于统一批准方法的 Gateway 会回退到随附的 exec 专用方法。待审查流程仍然可用，但保留的终端状态以及更丰富的跨界面结果需要更新的 Gateway。

## 回答代理问题

聊天会将待处理的 Gateway 问题显示为原生卡片，供带有 `operator.questions`（或 `operator.admin`）的操作员连接使用。卡片支持单选和多选选项、选项描述、自由文本的 **其他** 回答，以及过期倒计时。重新连接时会从 Gateway 重新加载待处理问题。当此设备回答某张卡片、其他界面先一步回答了它，或问题过期或被取消时，该卡片会被锁定。

## 助手入口

Android 支持从系统助手触发器（Google Assistant）启动 OpenClaw。按住主页按钮（或其他 `ACTION_ASSIST` 触发器）会打开应用；说出“Hey Google, ask OpenClaw `<prompt>`”会匹配应用声明的 App Actions 查询模式，并将提示词传入聊天编辑器中，而不会自动发送。

这使用的是在应用清单中声明的 Android **App Actions**（`shortcuts.xml` 功能）。无需进行网关侧配置——助手 intent 完全由 Android 应用处理。

<Note>
App Actions 的可用性取决于设备、Google Play 服务版本，以及用户是否已将 OpenClaw 设置为默认助手应用。
</Note>

## 通知转发

Android 可以将设备通知作为 `node.event` 项转发到网关。这是在**设备端**配置的，位于应用的 Settings sheet 中——而不是在 gateway/`openclaw.json` 配置中。

| 设置                     | 说明                                                                                                                                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 转发通知事件             | 主开关。默认关闭；需要先授予 Notification Listener Access。                                                                                                              |
| 包过滤器                 | **允许列表**（仅转发列出的 package IDs）或 **阻止列表**（默认：除列出的 IDs 外，转发所有 packages）。OpenClaw 自身的 package 在 Blocklist 模式下始终被排除，以防止转发循环。 |
| 安静时段                 | 本地 HH:mm 的开始/结束时间窗口，用于抑制转发。默认禁用；启用后默认为 `22:00`-`07:00`。                                                                                |
| 每分钟最大事件数         | 每台设备的通知转发速率限制。默认 20。                                                                                                                                          |
| 路由会话密钥             | 可选。将转发的通知事件固定路由到某个特定 session，而不是设备的默认 notification route。                                                                               |

<Note>
通知转发需要 Android Notification Listener 权限。应用会在设置过程中提示你授予此权限。
</Note>

WhatsApp、WhatsApp Business、Telegram、Telegram X、Discord 和 Signal 通知始终被排除。它们的消息已经由原生 OpenClaw channel sessions 所拥有；将 Android 通知作为单独的 node event 转发，可能会把回复路由到错误的对话中。

## 相关

- [iOS 应用](/platforms/ios)
- [节点](/nodes)
- [Android 节点故障排除](/nodes/troubleshooting)
