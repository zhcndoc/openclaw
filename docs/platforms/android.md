---
summary: "Android 应用程序（节点）：配对、连接恢复、聊天、语音和设备命令"
read_when:
  - "配对或重新连接 Android 节点"
  - "调试 Android 网关发现或身份验证"
  - "从远程 Mac 镜像或控制 Android 设备"
  - "验证跨客户端的聊天历史一致性"
title: "Android 应用"
---

<Note>
官方 Android 应用程序可在 [Google Play](https://play.google.com/store/apps/details?id=ai.openclaw.app&hl=en_IN) 上获取，并且对于侧面加载，可在选定的 [GitHub Releases](https://github.com/openclaw/openclaw/releases) 上作为已签名的独立 APK 提供。并非每个版本都包含 APK 和校验和。请参阅 [在 Google Play](/platforms/android#install-outside-google-play) 外部安装以查找并验证这两个文件。它是一个伴随节点，需要一个正在运行的 OpenClaw 网关。来源：[apps/android](https://github.com/openclaw/openclaw/tree/main/apps/android)（[构建说明](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md)）。
</Note>

## <a id="support-snapshot"></a> 支持概览

- 角色：伴随节点应用（Android 不托管 Gateway）。
- 需要 Gateway：是（通过 WSL2 在 macOS、Linux 或 Windows 上运行）。
- Install：来自 [GitHub Release](https://github.com/openclaw/openclaw/releases) 的 [Google Play](https://play.google.com/store/apps/details?id=ai.openclaw.app&hl=en_IN) 或 `OpenClaw-Android.apk`，列出了所需的资产（请参阅 [Install 外部 Google Play](/platforms/android#install-outside-google-play)）， [获取网关的 Started](/start/getting-started)，然后 [ 配对 ](/channels/pairing)。
- Gateway：[运行手册](/gateway) + [配置](/gateway/configuration)。
  - 协议：[Gateway 协议](/gateway/protocol)（节点 + 控制平面）。
- 在侧栏中选择一个代理，以在 **设置 → 提供商和模型** 中查看其凭证状态。当网关发布模型、凭证或配置更改时，页面会更新。使用 **Refresh** 重新检查模型可用性。
- 侧边栏标记等待答复或批准的会话，包括非活动会话和折叠组。点击关注图标，将鼠标悬停在其上，或使用键盘将其聚焦，以读取最早的待处理请求以及同类其他请求的计数。当请求得到解决、取消或过期时，该指示器会清除。问题预览从不包含答案草稿。
- 侧边栏和最近的线程视图将 cron 会话和系统创建的检查保留在普通聊天列表之外，而无需更改已保存的 pin。所选对话保持可达；命名的作品和人为创建的背景对话仍然可见。打开 **Threads → Automations** 以查找并重新打开自动化和系统对话，包括之前固定的聊天。这是一个视图过滤器，而不是保存的设置。 **侧边栏 → 页面铅笔 → 自动化** 显示计划作业及其最近的运行摘要。其他没有创建元数据的会话仍然可见，而不是根据其标题进行分类。
- 长按符合条件的线程并选择**Snooze**：**1小时内**，**3小时内**，**这个晚上**（当地时间18：00，当距离超过一小时时）、**明天**（当地时间09：00）或**下周**（当地时间下周一09：00，周日省略）。延后的会话隐藏在最近、当前和侧边栏最近会话中。 **Snoozed** 药丸显示他们的唤醒时间； **唤醒会话** 提早回来。时间到期、真正的入站消息或已完成的运行会唤醒会话；固定或存档也可以清除贪睡。 Snooze 通过网关同步，并且永远不会停止运行、消息或自动化。无法暂停已存档、子会话和受保护会话。
- **设置 → OpenClaw** 会在操作员连接具备 `operator.admin` 且 Gateway 支持 `openclaw.chat` 时打开一个专用的 Gateway 设置助手。其设置对话与普通 Chat 保持分离，在本地会对机密回复进行脱敏，并且只有在你点击 **Open Chat** 后才会切换到 Chat。

它的回复字段切换到隐藏输入以获取秘密提示。如果提示更改关闭键盘，请再次点击它。 Android 发送敏感回复而不进行修剪，并在您离开此页面或将应用程序置于后台时清除未发送的草稿。

当您结束设置对话时，新回复仍会显示在视图中。向上滚动以阅读前面的步骤而不被拉开，然后点击 **跳转到最新的** 以继续以下操作。如果调整窗口大小使整个对话可见，则以下也会继续。 **Restart**，当在错误后提供时，会在其最新回复中打开一个新对话。

系统控制（launchd/systemd）位于 Gateway 主机上——请参见 [Gateway](/gateway)。

## <a id="simultaneous-gateway-sessions"></a> 同步网关会话

先将每个 Gateway 配对一次，然后打开 **Settings → Gateway**。勾选标记表示当前聚焦的 Gateway，每个开关控制未聚焦的 Gateway 的操作员会话是否保持连接。启用的 Gateways 在应用处于前台时会独立重新连接，因此切换焦点不会断开其他连接。只有聚焦的 Gateway 拥有 Android 节点会话和设备能力；这可防止多个 Gateway 向同一部手机发出相机、位置、屏幕或通知命令。当应用离开前台后，Android 可能会挂起次级连接。

侧边栏默认为**首页→话题→技能→概述**。保留现有的个性化订单和固定的工作页面； **页面铅笔 → 编辑固定项目 → 重置固定项目** 恢复这些默认值。网关选择器旁边的 **Settings** 齿轮可打开所有设置，包括离线时的设置。设置保留在页脚中，而不是页面菜单或图钉编辑器中。

使用 Pages**旁边的**pencil 打开代理、自动化、使用、技能、技能工坊、梦想、终端或桌面（如果可用）。使用 **编辑固定项目** 固定您经常使用的页面。这些工作页面仍然可以通过搜索访问；设置重点关注此电话、连接、配置和诊断。设置、侧边栏、搜索和详细信息标题共享 Web UI 的图标含义。连接和批准状态是写出来的，而不是用未标记的绿色或灰色点表示。

侧边栏页脚的网关选择器在未保存任何内容时打开 **Add Gateway**，在保存时打开网关设置。通过多个已保存的网关，它会打开一个本机快速选择器，其中带有针对重点路由的复选标记，**添加网关**和**管理网关**。

**添加网关** 打开 QR 扫描仪，无需断开当前网关或重新启动载入。您还可以输入设置代码、选择 QR 映像或手动输入网关 URL。有效的代码打开确认；仅 **Connect** 启动切换。 **取消** 返回上一屏幕，而不更改当前对话、草稿、附件或已保存的网关。添加已保存的网关使用其现有的连接设置；使用 **Manage Gateways** 替换其设置。保存的离线条目仍然列出；连接状态与选择是分开的。

在 **管理网关** 中，点击 **重命名** 选择仅在此电话上使用的名称。该名称显示在侧边栏和选择器中，并且在切换网关、重新连接、应用程序重新启动和发现更新后仍然有效。辅助地址仍然可以区分具有相同名称的网关。清除名称以恢复默认值。重命名不会更改网关的地址、身份或保存的凭据。降级到较旧的 Android 版本可能会在该版本启动并重写注册表时丢弃这些本地名称。网关地址和凭据不受影响；再次升级后，如果需要，请再次选择本地名称。

当您切换回来时，未发送的文本和已完成的附件仍保留在其网关、代理和会话中。在使用快速选择器之前，完成录制、停止听写或谈话，并让媒体导入或待发送许可完成。创作者在切换期间保持受保护，但提交的离线网关仍然可用，无需等待网络连接。

## <a id="dictation-and-attachments"></a> 听写及附件

点击作曲家麦克风进行口述。作曲家会在您说话时显示识别开始、聆听或转录的时间，并提供临时记录。仅最终成绩单会添加到您的草稿中。点击停止以完成收听，或在开始或转录时点击取消以放弃该尝试。识别错误会使您现有的草稿保持不变，并解释如何重试。

选择或共享照片和文件后，**正在准备附件...** 保持可见，直到准备好为止。准备期间发送保持禁用状态。 **正在排队消息…**涵盖本地发送准入；邮件的发件箱状态将显示已送达或任何失败。离线消息仍然使用持久队列。

## <a id="wear-os-companion"></a> Wear OS 伴侣应用

Wear OS 伴侣使用配对的 Android 手机的经过身份验证的网关连接；手表从不接收或存储网关凭据。它可以选择代理和会话、读取有界记录、发送文本或口述回复、中止活动运行、在选定会话内启动实时通话，以及连接或断开配对手机的网关。它还提供本地回复通知、深色或浅色外观以及可选的自动语音回复。代理和网关控制针对交错 phone/watch 更新进行功能协商。 Realtime Talk 通过临时 Wear OS 数据层通道传输麦克风和播放音频，并在选定的电话、网关连接或音频通道丢失时停止。

## <a id="install-outside-google-play"></a> 安装到 Google Play 之外

选定的 GitHub 版本包括通用 `OpenClaw-Android.apk` 和 `OpenClaw-Android-SHA256SUMS.txt`。 APK 是根据发布标签构建的，使用 OpenClaw Android 发布密钥进行签名，并带有 GitHub Actions 出处。 Android 资产可能会在发布公开后被附加。按列出的资产选择版本，而不是按最新的 Gateway 版本标签。

列出包含这两个必需资产的已发布版本：

```bash
gh api --paginate "repos/openclaw/openclaw/releases?per_page=50" \
  --jq '.[] | select(.draft | not) | {
    tag: .tag_name,
    apk: ([.assets[].name] | any(. == "OpenClaw-Android.apk")),
    checksum: ([.assets[].name] | any(. == "OpenClaw-Android-SHA256SUMS.txt"))
  } | select(.apk and .checksum)'
```

选择列出这两个资产的版本，然后在侧载之前下载并验证确切的标签：

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

如果没有版本列出这两个文件，请使用 Google Play 或使用您自己的签名身份从源代码构建。

<Warning>
Google Play 和独立 APK 安装使用不同的更新渠道，且可能具有不同的签名标识。Android 可能要求在切换渠道之前卸载现有应用，这会删除其本地应用数据。正常更新请保持在同一渠道。
</Warning>

<Note>
从源或分支构建发布工件（APK 或应用程序包）需要您自己的 Android 签名身份。调试版本使用自动生成的调试签名密钥。官方 OpenClaw 发行密钥不包含在存储库中。请参阅 [ 对您的应用进行签名 ](https://developer.android.com/studio/publish/app-signing) 了解如何生成和配置发布版本的签名密钥。
</Note>

## <a id="app-and-gateway-compatibility"></a> App 和网关兼容性

Android 应用程序和网关不需要匹配的发行版本号。连接兼容性取决于它们支持的网关协议版本，而不是包含 APK 的版本标签。

Android 使用单独的连接进行聊天和 UI 操作（操作员连接）和设备功能（节点连接）。运营商连接必须支持网关的当前协议。经过身份验证的节点连接可以使用记录的兼容性窗口内的先前协议；该例外不会扩展到聊天或 UI 操作。有关当前版本和节点能力限制，请参阅 [ 网关协议版本控制](/gateway/protocol/versioning)。

成功配对并不能保证每个功能都适用于任意 app/Gateway 版本组合。新功能可能需要双方更新。如果连接报告 `protocol mismatch`，请检查应用程序和网关的协议要求和可用更新。对于旁加载应用程序，请使用上面的 APK 选择和验证步骤，而不是假设最新的网关版本包含较新的应用程序。

## <a id="mirror-and-control-android-from-a-remote-mac"></a> 从远程 Mac 镜像并控制 Android

[scrcpy](https://github.com/Genymobile/scrcpy) 在 macOS 窗口中镜像 Android 屏幕，并通过 Android 调试桥 （ADB） 转发键盘和指针输入。这是操作员端工作流程，与 OpenClaw 节点连接分开。当 Android 设备和 Mac 位于不同位置但共享专用 Tailscale 网络时，此功能非常有用。

### <a id="before-you-begin"></a> 开始之前

- 在 Android 设备和 Mac 上安装 Tailscale，并将两者连接到同一尾网。
- 在Android上，启用**开发者选项**和**USB调试**。 Android 16处**无线调试**下**设置→系统→开发者选项**。请参阅 [Android 开发者选项](https://developer.android.com/studio/debug/dev-options)。
- 在 Mac 上安装 scrcpy 和 ADB：

  ```bash
  brew install scrcpy
  brew install --cask android-platform-tools
  ```

- 在首次连接时保持 Android 设备可用。Android 必须先批准每台 Mac 的 ADB 密钥，然后该 Mac 才能控制设备。

### <a id="enable-adb-over-tcp"></a> 启用通过 TCP 的 ADB

首次设置时，将 Android 设备通过 USB 连接到一台可信电脑，并批准其调试提示。然后运行：

```bash
adb devices
adb tcpip 5555
```

您现在可以断开 USB 的连接。如果端口 5555 在设备重新启动或调试重置后停止侦听，请重复此本地设置步骤。 Android 11及更高版本也可以与**建立初始信任无线调试→使用配对码**和`adb pair`对设备进行配对。

### <a id="allow-only-the-controller-mac"></a> 仅允许控制端 Mac

具有限制性授权的 Tailnet 必须明确允许控制器 Mac 访问 Android 设备上的 TCP 端口 5555。向 tailnet 策略添加窄规则，将示例地址替换为两个设备的稳定 Tailscale IP：

```json5
{
  grants: [
    {
      src: ["<remote-mac-tailnet-ip>"],
      dst: ["<android-tailnet-ip>"],
      ip: ["tcp:5555"],
    },
  ],
}
```

有关主机别名和其他选择器，请参阅 [Tailscale 授权规则](https://tailscale.com/docs/reference/syntax/grants)。不要将此端口授予公网，也不要通过 Funnel 暴露它：授权的 ADB 客户端对设备拥有广泛控制权限。

### <a id="connect-and-start-mirroring"></a> 连接并开始镜像

在远程 Mac 上：

```bash
adb connect <android-tailnet-ip>:5555
adb devices
scrcpy --serial <android-tailnet-ip>:5555
```

此 Mac 首次执行 `adb connect` 时，Android 上会显示授权对话框。解锁设备，确认密钥指纹，并且只有在该 Mac 值得信任时才选择 **始终允许此计算机**。成功的 `adb devices` 条目以 `device` 结尾；`unauthorized` 表示设备上的提示尚未获批。

一旦 scrcpy 窗口打开，你可以直接使用它，或者将其作为目标交给 macOS 屏幕自动化工具，例如 [Peekaboo](https://peekaboo.sh/)。scrcpy 负责传输显示和输入；Tailscale 仅提供私有网络路径。

### <a id="troubleshooting"></a> 故障排除

- `Connection timed out`：验证 TCP 5555 的 tailnet 授权规则。成功的 `tailscale ping` 只能证明对等端可达，并不能证明策略允许此 TCP 端口。请在 Mac 上使用 `nc -vz <android-tailnet-ip> 5555` 测试。
- `unauthorized`：解锁Android并批准远程Mac的ADB密钥，或删除**无线调试→配对设备**下的陈旧工作站并再次配对。
- `Connection refused`：重新本地连接并再次运行 `adb tcpip 5555`。
- 列出了多个设备：保留明确的 `--serial <android-tailnet-ip>:5555` 参数。

完成后，关闭 scrcpy 并断开 ADB：

```bash
adb disconnect <android-tailnet-ip>:5555
```

## <a id="connection-runbook"></a> 连接运行手册

Android 节点应用 ⇄（mDNS/NSD + WebSocket）⇄ **Gateway**

Android 直接连接到 Gateway WebSocket，并使用设备配对（`role: node`）。

对于 Tailscale 或公共主机，Android 需要一个安全端点：

- 优先：使用 Tailscale Serve / Funnel，并通过 `https://<magicdns>` / `wss://<magicdns>`
- 也支持：任何其他带真实 TLS 端点的 `wss://` Gateway URL
- 仍支持明文 `ws://`：适用于私有 LAN 地址 / `.local` 主机，以及 `localhost`、`127.0.0.1` 和 Android 模拟器桥接地址 (`10.0.2.2`)；非回环地址的设置会自动使用受限操作者权限

### <a id="prerequisites"></a> 前提条件

- Gateway 在另一台机器上运行（或可通过 SSH 访问）。
- Android device/emulator 可以到达网关 WebSocket：
  - 与mDNS/NSD、**或**相同的LAN
  - 同一 Tailscale tailnet，使用广域 Bonjour / 单播 DNS-SD（见下文），**或**
  - 手动网关 host/port（后备）
- Tailnet/public 移动配对 **not** 使用原始尾网 IP `ws://` 端点。使用 Tailscale 服务或另一个 `wss://` URL 代替。
- `openclaw` CLI 可在网关计算机上使用（或通过 SSH），以批准配对请求。

### <a id="1.-start-the-gateway"></a><a id="1-start-the-gateway"></a> 1. 启动 Gateway

使用经过身份验证的网关。如果尚未配置，请先运行 `openclaw onboard` 配置令牌或密码。

对于受信任的 Same-LAN 设置，请在开始之前保留 LAN 绑定：

```bash
openclaw config set gateway.bind lan
openclaw gateway --port 18789
```

裸机和虚拟机主机默认为环回，电话无法到达。检测到的容器可以默认为 `auto`。为此设置显式设置绑定。

使用 config 命令而不是单独使用 `--bind lan`：仅启动标志不会更改单独的 `openclaw qr` 命令读取的配置。如果没有另一个配置的 URL 路由，设置代码创建仍然会看到环回并拒绝创建代码。

运行 `openclaw gateway status`。其 `Gateway:` 行应显示 `bind=lan (0.0.0.0)` 和 `port=18789`。

对于远程 Android 访问，请选择托管 Tailscale 作为 LAN 绑定的替代方案。将其设置保留在配置中，以便设置代码创建可以使用相同的路由：

```bash
openclaw config set gateway.bind loopback
openclaw config set gateway.tailscale.mode serve
openclaw gateway --port 18789
```

必须安装并登录 Tailscale。 Managed Serve 和 Funnel 需要环回绑定；切换到它们时不要保留 `gateway.bind=lan` 的设置。有关服务和密码验证漏斗设置，请参阅 [Tailscale](/gateway/tailscale)。

这会为 Android 提供一个安全的 `wss://` / `https://` 端点。仅仅设置 `gateway.bind: "tailnet"` 对首次远程 Android 配对来说还不够，除非你另外单独终止 TLS。

### <a id="2.-verify-discovery-(optional)"></a><a id="2-verify-discovery-optional"></a> 2. 验证发现（可选）

从网关机器：

```bash
dns-sd -B _openclaw-gw._tcp local.
```

更多调试说明：[Bonjour](/gateway/bonjour)。

如果你还配置了广域发现域，请与以下命令结果进行比较：

```bash
openclaw gateway discover --json
```

这显示了 `local.` 以及配置的广域域，使用解析的服务端点而不是 TXT-only 提示。

#### <a id="cross-network-discovery-via-unicast-dns-sd"></a> 通过单播 DNS-SD 跨网络发现

Android NSD/mDNS 发现不跨网络。如果 Android 节点和网关位于不同网络但通过 Tailscale 连接，请改用广域 Bonjour / 单播 DNS-SD。仅发现不足以实现 tailnet/public Android 配对 - 发现的路由仍然需要安全端点（`wss://` 或 Tailscale 服务）：

1. 在网关主机上设置 DNS-SD 区域（示例 `openclaw.internal.`）并发布 `_openclaw-gw._tcp` 记录。
2. 为你选择的域名配置 Tailscale split DNS，使其指向该 DNS 服务器。

详细信息和 CoreDNS 配置示例：[Bonjour](/gateway/bonjour)。

### <a id="3.-connect-from-android"></a><a id="3-connect-from-android"></a> 3. 从 Android 连接

在 [Control UI](/web/control-ui)（**Devices → 配对设备**）中或使用 `openclaw qr` 创建设置代码。

该手机**设置码**（及其QR）就是Android **扫描QR或设置码** / **进入设置代码** 接受。它与 [`openclaw devices join-code`](/cli/devices#openclaw-devices-join-code) （`https://…/j/<code>`） 铸造的网关 **join URL** 不同，后者通过 [`openclaw connect`](/cli/connect) 注册无头节点主机。将连接 URL 或裸连接代码粘贴到 Android 设置中会被拒绝 - 使用 [`openclaw qr`](/cli/qr) 生成新的移动 QR/setup 代码。

显式的 `--url` 或 `--public-url` 覆盖获胜。否则，设置代码 URL 选择使用以下顺序：

1. `plugins.entries.device-pair.config.publicUrl`，除非请求远程首选项。
2. `gateway.remote.url` 明确首选时。
3. 托管 Tailscale 服务或漏斗。
4. 普通`gateway.remote.url`设置。
5. A 可用的配置绑定，例如步骤 1 中的 LAN 绑定。

`openclaw qr --remote` 选择远程凭据，忽略已配置的设备对 `publicUrl`，并在托管 Tailscale 之前优先选择 `gateway.remote.url`。参见 [QR](/cli/qr)。

URL 选择不测试网络可达性。解析错误会停止设置代码创建，而不是触发较低优先级的路由。未配置 URL 或托管 Tailscale 路由的仅环回网关拒绝创建代码。

在 Android 应用中：

- 该应用程序通过 **前台服务**（持久通知）保持其网关连接处于活动状态。
- 在首次运行设置期间，选择**扫描QR或设置代码**或**手动设置**。
- 配对后，选择手机权限启用。如果网关需要节点批准，请查看请求的功能并点击 **批准访问并在提供时继续**。应用程序验证批准后，设置完成。否则，请按照显示的网关批准命令进行操作，然后点击 **I 已批准**。
- 设置完成后，打开**设置→网关**。 **添加网关** 允许您扫描或粘贴设置代码，或连接到已发现的网关。
- 如果发现被阻止，请使用**手动网关**在该页面上：输入主机和端口，选择**连接安全**，然后点击**保存并连接**。私人的LAN主办方支持`ws://`；为了Tailscale/public主机，使用**安全的 （TLS）**与一个`wss://` / Tailscale服务端点。

网关令牌、引导令牌、密码和设置代码均被屏蔽并接受粘贴。该应用程序在禁用自动更正的情况下请求密码输入，但无法保证第三方键盘如何存储或从输入中学习。

第一次成功配对后，Android 在启动时自动重新连接到活动的配对网关（尽力发现网关，该网关必须在网络上可见）。

Android 自动重试临时连接丢失。要重新尝试保存的端点，请打开 **Settings → Gateway** 并点击 **Reconnect**。 **Disconnect** 停止连接并禁止当前应用程序会话的自动重新连接；它不会忘记配对。身份验证或配对错误可能会暂停重试，直到您解决报告的问题。

网关摘要行包含长标签和值。在 **设置 → 网关** 中点击 **实例 ID** 复制此手机的完整标识符。

官方设置码会将 Android 作为节点连接，并默认通过 `wss://` 授予完整的 Gateway 操作员访问权限。明文的非回环 `ws://` 设置会自动使用受限权限，以保证 bearer token 安全。**Settings → Gateway** 会显示 **Full** 或 **Limited** 访问。若要使用受限连接，请配置 `wss://` 或 Tailscale Serve，在 Control UI 中或使用 `openclaw qr` 生成新的完整访问代码，然后在该页面扫描或粘贴并重新连接。希望使用降级配置的操作者可以在 Control UI 中选择 **Limited access**，或运行 `openclaw qr --limited`。

### <a id="manage-paired-gateways"></a> 管理配对网关

该应用程序会保留与其配对的每个网关的注册表，因此您可以保持操作员会话连接并更改焦点，而无需再次配对：

- **设置 → 网关** 在 **Gateways** 部分中列出配对网关，在焦点旁边有一个复选标记。点击另一个条目以将其聚焦；其他启用的操作员会话保持连接。
- 每个开关控制的是：当应用处于前台时，该非聚焦的 Gateway 是否保持连接。当前聚焦的 Gateway 始终保持启用，并拥有手机的节点连接和设备能力。
- 凭据、设备 token、TLS 信任、聊天历史以及离线排队消息都按每个 Gateway 单独存储。切换焦点不会混合不同 Gateway 的状态，而离线期间排队的消息只会发送到其写入时对应的 Gateway。
- **Forget** 删除网关的注册表项及其凭据、设备令牌、TLS 引脚和缓存的聊天记录。

打开或回复对话通知会在需要时重新连接其保存的网关。已连接或已连接的目标将被保留。回复等待目标连接准备就绪，包括所需的 TLS 批准。如果目标不再可用，打开通知会显示 **Gateway unavailable** 并打开网关设置，而无需断开另一个网关的连接。在通知回复进入持久发送队列之前再次检查断开连接；已经排队的输入保持其正常的恢复行为。

**回复排队**确认回复已进入持久发送队列，而不是已传递。该通知保留所提交文本的私人预览，并提供 **开放对话**。如果回复状态未知，请打开对话查看后再重新发送；该通知不提供其他回复操作。反馈仅更新该对话的最新通知，因此较旧的结果无法替代较新的通知。应用程序更新之前发布的通知仍然可以发送回复。其结果不会重写或忽略该通知，因此请打开对话以检查其状态。

**Channels**、**Dreaming**、**Health** 日志、**Skills** 和**Usage** 页面在刷新时保留上次加载的数据。首次加载失败会显示错误，而不是空计数或默认运行状况值。当刷新重叠时，只有最新的请求会更新页面的数据、错误和进度。断开连接会清除显示的摘要。

在**Health**、**Chat上：未就绪**表示聊天健康状况未确认或检查失败；网关仍然可以是 **Online**。聊天标题的辅助功能状态使用相同的就绪措辞。在聊天操作中使用**刷新聊天**再次检查； **刷新日志** 仅重新加载日志。概述的网关卡报告连接状态并突出显示已知问题，而不是整体系统运行状况。

### <a id="presence-alive-beacons"></a> 存活信标

经过身份验证的节点会话连接后，当应用程序移至后台而前台服务仍处于连接状态时，Android 会使用 `event: "node.presence.alive"` 调用 `node.event`。仅当已知经过身份验证的节点设备身份后，网关才会在配对的 node/device 元数据上将此记录为 `lastSeenAtMs`/`lastSeenReason`。

仅当网关响应包含 `handled: true` 时，应用程序才将信标计为成功记录。确认具有 `{ "ok": true }` 且没有 `handled` 字段的 `node.event` 的网关是兼容的，但该响应不算作持久的上次看到的更新。

### <a id="4.-approve-pairing-(cli)"></a><a id="4-approve-pairing-cli"></a> 4. 批准配对（CLI）

在网关机器上：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

配对详情：[配对](/channels/pairing)。

可选：如果 Android 节点始终从严格控制的子网连接，您可以选择使用显式 CIDR 或确切 IP 进行首次节点自动批准：

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

默认情况下禁用此功能。它仅适用于没有要求范围的新 `role: node` 配对。 Operator/browser 配对以及任何角色、范围、元数据或公钥更改仍然需要手动批准。

### <a id="5.-verify-the-node-is-connected"></a><a id="5-verify-the-node-is-connected"></a> 5. 验证节点已连接

```bash
openclaw nodes status
openclaw gateway call node.list --params "{}"
```

### <a id="6.-chat-%2B-history"></a><a id="6-chat-+-history"></a> 6. 聊天 + 历史记录

草稿在附件和 voice/send 控件上方有自己的全宽行，因此较大的文本和较窄的屏幕不会将其挤压在按钮之间。空提示保留在一行；草稿最多显示六行，并在空间有限时滚动。作曲家的侧边沟比抄本窄。 **+**，模型和推理一起放在左边；麦克风和 Talk/send 位于右侧一排。控件高度仍为 48dp；非常短的视图使用较窄的图标按钮为 **Details** 腾出空间，同时保留可编辑行。占位符和键入的文本具有相同的对齐方式。

打开 **+** 以获得包含相机、图库、文件、位置和权限的紧凑图标列表。权限行显示当前的访问模式。打开右上角的 **Chat actions** （⋮） 菜单以查看实时上下文使用环。选择 **Context** 打开上下文使用情况、最新运行的令牌和成本细分。查看使用情况不需要更改会话设置的权限。当没有可用的成本细目时，报告的模型调用总数仍然可见。缺少的用法显示为未知。点击模型名称可打开编辑器上方的紧凑菜单，按模型名称、ID 或提供商进行搜索，然后展开提供商组。搜索接受多个术语和至少四个字母的单词中的小拼写错误，包括交换的相邻字母。每个术语必须匹配；短期术语和版本号未进行拼写错误更正。精确匹配在每个提供商中排名第一，提供商组遵循其最佳匹配。清除搜索将恢复通常的排序，而不更改您的选择。选择器没有设置按钮。网关的默认配置标记在其模型行上。选择一个命名模型，将该模型固定到会话中； **默认模型**单独重置覆盖以遵循网关的当前默认值。固定模型和最新模型仍然可用。长模型名称使用中间省略号，全名可在选择器中找到。努力拨盘打开其滑块和快速模式，而无需扩展作曲家。拖动滑块可以预览表盘上的力度；释放它会应用选择。

如果草稿为空且没有活动运行，则尾随按钮将启动 Talk。输入文本将其更改为“发送”；没有草稿的活动运行显示停止。在通话期间，实时波形会取代麦克风并保持可点击状态以结束通话。如果运行也处于活动状态，则单独的浅色“停止”按钮会停留在后缘以中止该运行。

从侧边栏的 **Pages** 菜单打开 **Home** 进行聊天，或从侧边栏选择现有会话：

- H 历史记录：`chat.history` 由网关进行显示标准化。内联指令标签、纯文本工具调用 XML 有效负载（`<tool_call>`、`<function_call>`、`<tool_calls>`、`<function_calls>` 和截断变体）以及泄露的 ASCII/full-width 模型控制令牌被剥离。存储的助手可见性首先尊重显示、相位和最终源事实，然后省略修剪为大写 `NO_REPLY` 的原始助手文本；小写和换行形式仍然可见。用户文本永远不会被归类为静音。过大的行可以用占位符替换。
- 长回复：在带上限的助理回复上点击 **查看全部** 以加载完整的内嵌格式文本。附件保留在对话中，消息操作使用扩展文本。点击 **显示较少** 或按返回恢复预览；重新打开会重用加载的回复。加载、可重试失败、不可用消息以及所需的重新连接或网关更新显示在消息中，而不是警报中。 Synthetic 消息工具和评论预览保留其现有的显示和操作，但不提供 **查看全部**，因为其复制的文字记录 ID 无法检索该合成文本。这还可以识别已发布网关中较旧的上限预览格式，例如 v2026.7.1-2. Android 请求每个文本字段最多 1,000,000 个字符，与网关的默认检索限制相匹配；超大或仍然上限的结果显示 **完整的消息太大而无法显示。** 而不是不完整的回复。
- 大型代码块在有界视口内滚动，并带有**代码开始**、**代码结束**和**复制代码**控件。开始和结束还揭示了对话中块的结尾。选择停留在显示的文本段内； **复制代码**复制整个块。单独的消息 **Select text** 操作打开纯文本选择阅读器；长答案使用有界页面，并且选择适用于显示的页面。
- 阅读：向上滚动或使用**查看全部**、**代码开头**或**代码结尾**暂停自动跟随。传入的内容和窗口大小的变化可以保留您的阅读位置，当空间缩小时将文本或图像移动到视图中。调整空闲对话的大小，以便所有内容适合接下来的恢复。 **跳转到聊天标题恢复中最新的**；它仅在较新的内容位于可见历史记录下方时才会出现，并且从不覆盖消息。
- Mermaid 代码块在关闭围栏到达或回复完成后呈现为图表。点击图表可打开全屏视图，并可进行捏合缩放和平移。小角控件复制源或打开菜单以在图表和源之间切换。使用捆绑资源离线进行渲染。失败的图表保留其可读源，临时失败提供重试。其他代码块语言仍然是代码。
- Thread 活动：搜索结果和侧边栏行使用每个线程自己报告的活动。非活动运行不会仅因为其最后状态为正在运行或已排队而保留工作或排队指示器。
- 会话选择：应用程序运行时，每个网关和代理都会记住您明确选择的最后一次聊天。返回客服人员会直接检查较旧的聊天记录（如果该聊天记录不在最近的页面内）；临时查找失败会显示错误，但不会忘记该选择。
- 仅当仍选择同一会话时，存档打开的会话才会返回到应用程序的主聊天。存档完成后切换会话、代理或网关会保留您的新选择。即使错过了推送通知，成功的存档也会取消存档聊天所记住的选择。
- 侧栏中的 **New** 为所选座席创建并选择独立聊天，而无需清除之前的会话。它保留了现有的 model/provider、思维和快速模式继承行为，同时单独出现在线程中，而不是出现在之前的聊天或主页下方。即使较旧的应用程序将先前的聊天记录为父聊天，现有的普通新聊天也会独立出现；它们的历史记录和存储的设置不会更改。分叉、子代理、显式工作树启动以及没有创建元数据的会话保持其嵌套。侧边栏和聊天标题显示创建和初始加载期间的进度，并且禁用重复的新操作。历史记录刷新不会取消创建；在完成时选择另一个会话、代理或网关将保留较新的选择。
- 离线历史记录：缓存的记录按照接受实时历史记录的顺序更新，因此延迟的重新连接运行状况检查无法恢复较旧的快照。切换会话会保留您离开的会话的排队缓存更新。
- **刷新聊天聊天操作中的**会重新加载历史记录并重新检查网关运行状况，而不清除待处理的消息。聊天准备情况与网关连接分开：空的连接线程显示 **Chat 未准备好**，同时运行状况未确认或检查失败。使用**刷新聊天**再次查看； **网关离线**表示网关已断开连接。历史故障不会停止后续的健康检查。一旦 Android 观察到恢复的运行完成，延迟的历史响应不会带回该运行的“停止”按钮或部分回复。
- 发送：`chat.send`。在活动的 Talk 会话之外，您可以在客服人员工作时发送文本或临时附件。新草稿带回 **Send**；清除它会恢复 **Stop**。网关采用现有的[队列模式](/concepts/queue)，因此转向不需要停止当前运行。当其他提交、附件暂存或麦克风捕获拥有草稿时，发送仍处于禁用状态。
- Queued 消息控制：**Delete** 删除本地排队副本，包括重新连接刷新仍在完成时。它不会撤消网关已接受的消息；使用 **Stop** 取消活动转弯。
- 持久发送：每次发送（文本、选取的图像和语音注释）在任何网络尝试之前都会记录到每个网关设备上的发件箱，因此应用程序终止不会丢失提交的输入。离线发送时排队发送，以便在使用稳定的请求密钥重新连接时按顺序发送，以防止重复发送，并且只有在保存的 `chat.history` 中可见轮次后才会退出发送 — 单独的确认不被视为发送证明。已确认的重新连接发送显示与在线发送相同的流处理进度；从未到达套接字队列的请求将保留在下一个连接的队列中。不明确的结果（丢失确认、应用程序在发送中被终止、网关在记录写入之前重新启动）表现为具有显式 **Retry**/**Delete** 的可见行，而不是自动重新发送。如果刷新的历史记录更改了分支，则较早排队的输入将保留其文本和附件，但需要显式重试；显示历史记录后接受的输入在重新连接到同一分支时可以正常发送。斜杠命令永远不会在重新连接时自动重播；他们停车以进行明确的重试。队列是有限的（每个网关 50 条消息和 48 MB 附件字节），未发送的行将在 48 小时后过期。从未提交的作曲家草稿是不耐用的。
- Completed 答案显示最多八个紧凑源卡，用于在该运行的成功网络搜索和获取中找到的引用页面。点击卡片即可读取其记录的搜索片段或页面摘录并打开源。卡片不获取页面内容；网站图标通过网关并遵循 `gateway.controlUi.automaticallyFetchFavicons`，在禁用或不可用时显示地球仪。
- 图像输入通过选择器和Android共享表进行。发送的照片位于文本气泡上方；相邻的照片排列成紧凑的行。助理照片按消息顺序保留在相关文本旁边。点击照片即可进行全屏预览。消息同时最多显示四个图像预览； **下一个图像**和**上一个图像**到达其余图像，而不将每个解码图像保留在内存中。助理生成的图像通过配对的网关连接进行解析，并仅在脱机脚本缓存中保留其小工件引用。下载上限为 12 MiB 并解码为有界显示位图。
- 推送更新（尽力）：`chat.subscribe` -> `event:"chat"`
- Listen：长按助理消息，选择**Listen**收听；音频通过具有配置的 TTS 提供程序链的网关 `tts.speak` 进行渲染，并且当网关无法渲染音频时，使用设备上系统 TTS。会话切换、新聊天、应用程序后台或聊天关闭时播放停止。

#### <a id="reactions"></a> 反应

保存的提示和助理回复会显示带有计数和反应器名称的表情符号反应芯片，突出显示您自己的反应。点击芯片即可切换您的反应，或长按一条消息（包括纯媒体消息）并选择 **添加反应**。快速调色板匹配Control UI； **更多…** 接受一种表情符号，包括连接的表情符号和旗帜。控制遵循网关的操作员和会话共享权限；只读观众仍然可以看到反应。当对话打开时，更新会实时显示，并且不会创建通知。请参阅 [Reactions](/concepts/multi-user#reactions)。

#### <a id="agent-browser-in-chat"></a> 聊天中的代理浏览器

当浏览器插件返回可识别选项卡时，聊天会在 **Agent browser** 下显示会话最新浏览器选项卡的预览。点击向上的 V 形即可进行交互，而无需离开对话或替换草稿。向下的 V 形或 Android 返回返回预览。折叠会关闭浏览器的键盘，而不更改您的聊天草稿。 **在浏览器中打开** 是一个单独的显式操作。普通网站链接和 **Desktop** 保留其现有行为。

关闭图标会从聊天中删除卡片，而无需关闭客服人员的远程选项卡。要恢复它，请选择 **Chat 操作 > 代理浏览器**。刷新同一浏览器结果不会重新打开已关闭的卡；新的浏览器工具演示可以再次显示它。当浏览器离线或不可用时也可以关闭。

预览使用连接的网关和确切的浏览器配置文件、主机或节点以及工具结果中的选项卡。它永远不会启动另一个浏览器或替换不同的选项卡。切换会话或网关取代了查看器；脱机后会删除其控制权，直到连接恢复为止。停止或关闭的远程选项卡保持不可用，而不是创建替换选项卡。

这使用网关现有的浏览器面板和 `operator.admin` 浏览器权限。连接的网关必须通告以浏览器为中心的支持并使用其捆绑的 Control UI。较旧的网关、禁用的 Control UI 和自定义 UI 根显示不可用的通知，而不是加载不受支持的页面；更新网关并使用其捆绑的 UI 来启用嵌入式控制。该卡仍可关闭。不会创建额外的浏览器服务或会话共享权限。

### <a id="7.-camera"></a><a id="7-camera"></a> 7。相机

Camera 命令（仅前台；受权限限制）：`camera.snap`（jpg）、`camera.clip`（mp4）。参数和 CLI 辅助工具请参见 [Camera node](/nodes/camera)。

### <a id="8.-voice-%2B-expanded-android-command-surface"></a><a id="8-voice-+-expanded-android-command-surface"></a> 8. 语音 + 扩展的 Android 命令面

- 浏览侧边栏的 **Pages** 菜单。语音输入属于聊天编辑器；没有单独的语音选项卡。
- 点击作曲家麦克风进行设备上语音识别，将转录内容插入草稿中。收听时，“停止”图标会取代麦克风；点击它即可完成收听。开始或转录时，关闭图标会取消该尝试。长按麦克风打开**语音选项**，然后选择**录制语音笔记**以创建附件。 UI 报告无法识别、缺少权限、busy/network 失败和无语音结果，而不是默默地放弃尝试。如果听写不可用并且选择了网关，则 **录音语音笔记** 会在保留草稿的同时提供新的录音。它不会从失败的听写尝试中恢复语音或自动发送任何内容。
- 要启动连续的 **Talk**，请在空草稿且没有活动运行的情况下点击尾随的“对话”按钮。麦克风菜单仅包含听写和语音注释。听写、语音记录和谈话是互斥的麦克风路径。
- 当同一网关重新连接时，包括在其代理列表刷新时，您选择的代理将保持与 Talk 和主聊天的绑定。删除该代理将恢复为默认网关。切换网关或重新启动应用程序会清除此内存中的选择。
- Talk Mode 会在捕获开始前将现有前台服务从 `connectedDevice` 提升为 `connectedDevice|microphone`，在 Talk Mode 停止时再降级。节点服务声明 `FOREGROUND_SERVICE_CONNECTED_DEVICE` 以及 `CHANGE_NETWORK_STATE`；Android 14+ 还需要 `FOREGROUND_SERVICE_MICROPHONE` 声明、`RECORD_AUDIO` 运行时授权，以及运行时的 microphone service type。
- 默认情况下，Android Talk 通过配置的 Gateway Talk 提供程序使用本机语音识别、网关聊天和 `talk.speak`。它继承了会话的思维设置。仅当 `talk.speak` 不可用时，才使用本地系统 TTS。
- Gateway 配置更改会在下次使用时刷新 Android 缓存的 Talk 设置，而无需重新连接或中断活动捕获。
- 只有当 `talk.realtime.mode` 为 `realtime` 且 `talk.realtime.transport` 为 `gateway-relay` 时，Android Talk 才使用实时 Gateway relay。
- 电话中继 Talk 在 Talk 失败、应用程序离开前台或语音模式更改时保留接受的座席工作。答案仍然出现在聊天中；显式 Stop 会取消它。这需要一个网关通告 `talk-session-close-disposition`；较旧的 Gateway 和 Wear Talk 保留了中止关闭行为。
- 启用 **设置 → 语音 → 监听唤醒词** 用于前台设备上语音唤醒。 Android 仅在启用、设备上识别和麦克风权限可用且唤醒词与当前网关同步时通告 `voiceWake`。
- 其他 Android 命令族（可用性取决于设备、权限和用户设置）：
  - `device.status`, `device.info`, `device.permissions`, `device.health`
  - `device.apps` 仅当 **设置 → 电话功能 → 安装的应用程序** 启用时；它默认列出启动器可见的应用程序（通过 `includeNonLaunchable` 获取完整列表）。
  - `notifications.list`, `notifications.actions`（见下文 [通知转发](#notification-forwarding)）
  - `photos.latest`
  - `contacts.search`, `contacts.add`
  - `calendar.events`, `calendar.add`
  - `callLog.search`
  - `sms.search`
  - `motion.activity`, `motion.pedometer`

### <a id="9.-workspace-files-(read-only)"></a><a id="9-workspace-files-read-only"></a> 9. Workspace files（只读）

从侧边栏的 **Overview** 菜单中打开 **Pages** 找到 **Files** 卡。它通过只读 `agents.workspace.list` / `agents.workspace.get` 网关 RPC 浏览活动代理的工作区：目录深入、文本和图像预览以及通过 Android 共享表导出。没有写入操作，预览的大小受到网关的限制。

如果应用程序无法准备文件或打开共享表，则会显示 **无法共享文件** 并保持预览打开状态，以便您可以重试或返回。

## <a id="review-command-approvals"></a> 审查命令批准

具有 `operator.admin` 的操作员连接，或由 Gateway 明确定位的配对 `operator.approvals` 连接，可以在 **Settings -> Approvals** 下审核待处理的 exec 请求。应用会在启用其按钮之前加载 Gateway 经过清理的批准记录，显示任何安全警告以及该请求提供的确切决策，并将批准 ID 和所有者类型回传给 Gateway。

批准状态与 Control UI 和支持的聊天界面共享。第一个提交的答案获胜；即使另一个表面先应答，Android 也会显示已保存的结果。如果解决响应丢失或网关断开连接，应用程序会保持操作锁定并在提供另一个决定之前再次读取批准。

早于统一批准方法的 Gateway 会回退到随附的 exec 专用方法。待审查流程仍然可用，但保留的终端状态以及更丰富的跨界面结果需要更新的 Gateway。

## <a id="answer-agent-questions"></a> 回答代理问题

聊天将待处理的网关问题显示为与 `operator.questions`（或 `operator.admin`）的操作员连接的本机卡。卡片支持单选和多选选项、选项说明、自由文本 **Other** 答案以及到期倒计时。重新连接从网关重新加载待处理的问题。当此设备应答、另一个表面首先应答或者问题过期或被取消时，卡将锁定。

秘密答案字段会屏蔽键入或粘贴的值，并在禁用自动更正的情况下请求输入密码。 Android 提交秘密答案而不修剪前导或尾随空格。

## <a id="assistant-entrypoints"></a> 助手入口

Android 支持从系统助手触发器（Google 助手）启动 OpenClaw。按住主页按钮（或另一个 `ACTION_ASSIST` 触发器）打开应用程序；说“嘿 Google，询问 OpenClaw `<prompt>`”与应用程序声明的应用程序操作查询模式相匹配，并将提示传递给聊天编辑器而不自动发送。

这使用的是在应用清单中声明的 Android **App Actions**（`shortcuts.xml` 功能）。无需进行网关侧配置——助手 intent 完全由 Android 应用处理。

<Note>
App Actions 的可用性取决于设备、Google Play 服务版本，以及用户是否已将 OpenClaw 设置为默认助手应用。
</Note>

## <a id="notification-forwarding"></a> 通知转发

Android 可以将设备通知作为 `node.event` 项目转发到网关。这是在设备 **上的应用程序设置表中配置的** — 而不是在 Gateway/`openclaw.json` 配置中。

| 设置                     | 描述                                                                                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 转发通知事件 | 主开关。默认关闭；需要先授予 Notification Listener Access。                                                                                                              |
| 包过滤器              | **允许列表**（仅转发列出的 package IDs）或 **阻止列表**（默认：除列出的 IDs 外，转发所有 packages）。OpenClaw 自身的 package 在 Blocklist 模式下始终被排除，以防止转发循环。 |
| 安静时间                 | 本地 HH：mm start/end 抑制转发的窗口。默认禁用；启用后默认为 `22:00`-`07:00`。                                                                                |
| 每分钟最大事件数         | 每台设备的通知转发速率限制。默认 20。                                                                                                                                          |
| 路由会话密钥           | 可选。将转发的通知事件固定路由到某个特定 session，而不是设备的默认 notification route。                                                                               |

<Note>
通知转发需要 Android Notification Listener 权限。应用会在设置过程中提示你授予此权限。
</Note>

WhatsApp、WhatsApp Business、Telegram、Telegram X、Discord 和 Signal 通知始终被排除。它们的消息已经由原生 OpenClaw channel sessions 所拥有；将 Android 通知作为单独的 node event 转发，可能会把回复路由到错误的对话中。

## <a id="related"></a> 相关内容

- [iOS 应用](/platforms/ios)
- [节点](/nodes)
- [Android 节点故障排除](/nodes/troubleshooting)
- [Stable HTTPS URL](/gateway/stable-https-url) — 为仅环回网关提供稳定的、仅尾网的 HTTPS URL 和 Tailscale 服务
