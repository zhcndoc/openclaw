---
summary: "iOS 节点应用：连接到 Gateway、配对、画布和故障排查"
read_when:
  - 配对或重新连接 iOS 节点
  - 从源代码运行 iOS 应用
  - 调试网关发现或画布命令
title: "iOS 应用"
---

可用性：启用发布时，iPhone 应用构建会通过 Apple 渠道分发。也可以从源码运行本地开发构建。

## 它的作用

- 通过 WebSocket 连接到 Gateway（局域网或 tailnet）。
- 暴露节点能力：Canvas、屏幕快照、摄像头捕获、位置、Talk 模式、语音唤醒。
- 接收 `node.invoke` 命令并报告节点状态事件。

## 要求

- Gateway 运行在另一台设备上（macOS、Linux，或通过 WSL2 的 Windows）。
- 网络路径：
  - 通过 Bonjour 的同一局域网，**或**
  - 通过单播 DNS-SD 的 tailnet（示例域名：`openclaw.internal.`），**或**
  - 手动主机/端口（备用方案）。

## 快速开始（配对 + 连接）

1. 启动一个已认证的 Gateway，并使用手机能够访问的路由。Tailscale
   Serve 是推荐的远程路径：

```bash
openclaw gateway --port 18789 --tailscale serve
```

对于可信的同一局域网（same-LAN）设置，也可以改用已认证的 `gateway.bind: "lan"`
。默认的 loopback 绑定无法被手机访问。如果 Gateway 还没有完成配置，请先运行 `openclaw onboard`，这样在创建 setup-code 时会有 token 或 password 认证路径。

2. 打开 [控制界面](/web/control-ui)，选择 **Nodes**，然后在 **Devices** 卡片中点击
   **Pair mobile device**。

3. 在 iOS 应用中，打开 **Settings** -> **Gateway**，扫描二维码（或粘贴
   setup code），然后连接。

   如果 setup code 同时包含 LAN 和 Tailscale Serve 路由，应用会按顺序探测这些路由，并保存第一个可达的端点。

4. 官方应用会自动连接。如果 **Devices** 显示为待处理请求，请在批准之前先检查其角色和权限范围。

控制界面按钮要求已经配对过一个具有 `operator.admin` 的会话。
作为终端备用方案，可以在 iOS 应用中选择一个已发现的 gateway（或启用
Manual Host 并输入主机/端口），然后在 Gateway 主机上批准该请求：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

如果应用在重新配对时更改了认证细节（角色/权限范围/公钥），之前挂起的请求会被新的请求取代，并创建一个新的 `requestId`。请在批准前再次运行 `openclaw devices list`。

可选：如果 iOS 节点始终从一个严格受控的子网连接，你可以通过显式 CIDR 或精确 IP，选择启用首次节点自动批准：

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

此功能默认关闭。它仅适用于没有请求任何权限范围的全新 `role: node` 配对。operator/browser 配对以及任何角色、权限范围、元数据或公钥的变更仍然需要手动批准。

5. 验证连接：

```bash
openclaw nodes status
openclaw gateway call node.list --params "{}"
```

## 官方构建的 relay 支持推送

官方分发的 iOS 构建会使用外部推送 relay，而不是将原始 APNs token 发布到网关。公开发布通道中的官方 App Store 构建使用托管的 relay，地址为 `https://ios-push-relay.openclaw.ai`；这个基础 URL 对 App Store 分发是硬编码的，不会读取任何覆盖配置。

自定义 relay 部署需要刻意使用一条独立的 iOS 构建/部署路径，其 relay URL 必须与网关的 relay URL 匹配。App Store 发布通道绝不会接受自定义 relay URL。如果你使用的是自定义 relay 构建，请设置匹配的网关 relay URL：

```json5
{
  gateway: {
    push: {
      apns: {
        relay: {
          baseUrl: "https://relay.example.com",
        },
      },
    },
  },
}
```

流程如下：

- iOS 应用使用 App Attest 和 StoreKit 应用事务 JWS 向 relay 注册。
- relay 返回一个不透明的 relay handle 以及一个注册范围内的发送授权。
- iOS 应用获取配对的网关身份（`gateway.identity.get`）并将其包含在 relay 注册中，因此由 relay 支持的注册会被委托给该特定网关。
- 应用将该 relay 支持的注册转发给配对的网关，调用 `push.apns.register`。
- 网关对 `push.test`、后台唤醒和唤醒提醒使用该已存储的 relay handle。
- 如果应用之后连接到不同的网关，或者连接到具有不同 relay base URL 的构建，它会刷新 relay 注册，而不是复用旧绑定。

网关在这一路径中**不需要**什么：不需要部署范围内的 relay token，也不需要用于官方 App Store relay 支持发送的直接 APNs key。

预期的操作流程：

1. 安装官方 iOS 应用。
2. 可选：仅在使用刻意分离的自定义 relay 构建时，在网关上设置 `gateway.push.apns.relay.baseUrl`。
3. 将应用与网关配对，并让其完成连接。
4. 当应用获得 APNs token、操作者会话已连接且 relay 注册成功后，应用会发布 `push.apns.register`。
5. 之后，`push.test`、重新连接唤醒以及唤醒提醒都可以使用已存储的 relay 支持注册。

## 后台存活信标

当 iOS 因静默推送、后台刷新或显著位置事件唤醒应用时，应用会尝试进行一次简短的 node 重新连接，然后以 `event: "node.presence.alive"` 调用 `node.event`。网关仅在已知经过身份验证的 node 设备身份后，才会将其记录为配对的 node/device 元数据上的 `lastSeenAtMs`/`lastSeenReason`。

应用仅在网关响应中包含 `handled: true` 时，才将一次后台唤醒视为已成功记录。较旧的网关可能会以 `{ "ok": true }` 确认 `node.event`；该响应是兼容的，但不计为持久的 last-seen 更新。

兼容性说明：

- `OPENCLAW_APNS_RELAY_BASE_URL` 仍可作为网关的临时环境变量覆盖（`gateway.push.apns.relay.baseUrl` 是优先使用配置的路径）。
- App Store 发布构建的 push 模式会硬编码托管 relay 主机，并且不会读取 relay URL 覆盖——`OPENCLAW_PUSH_RELAY_BASE_URL` 构建时环境变量仅影响本地/沙箱 iOS 构建模式。

## 认证与信任流程

relay 的存在是为了强制执行两个约束，这是直接在网关上使用 APNs 无法为官方 iOS 构建提供的：

- 只有通过 Apple 分发的真正 OpenClaw iOS 构建才能使用托管 relay。
- 网关只能向与该特定网关配对的 iOS 设备发送基于 relay 的推送。

逐跳说明：

1. `iOS app -> gateway`: 应用通过正常的 Gateway 认证流程与网关配对，从而获得一个已认证的 node session 以及一个已认证的 operator session。operator session 调用 `gateway.identity.get`。
2. `iOS app -> relay`: 应用通过 HTTPS 调用 relay 注册端点，并附带 App Attest 证明以及 StoreKit app transaction JWS。relay 会验证 bundle ID、App Attest 证明和 Apple 分发证明，并且要求使用官方/生产分发路径——这就是阻止本地 Xcode/dev 构建使用托管 relay 的原因，因为本地构建无法满足官方 Apple 分发证明。
3. `gateway identity delegation`: 在 relay 注册之前，应用从 `gateway.identity.get` 获取已配对的网关身份，并将其包含在 relay 注册负载中。relay 返回一个 relay handle，以及一个按注册范围授予、委托给该网关身份的 send grant。
4. `gateway -> relay`: 网关将 `push.apns.register` 中返回的 relay handle 和 send grant 存储起来。在 `push.test`、reconnect wakes 和 wake nudges 场景下，网关使用自己的设备身份对发送请求签名；relay 会根据注册时委托的网关身份，验证存储的 send grant 和网关签名。即使另一台网关设法获取了该 handle，也不能重用这条已存储的注册。
5. `relay -> APNs`: relay 持有生产环境 APNs 凭据以及官方构建对应的原始 APNs token。网关不会为基于 relay 的官方构建存储原始 APNs token；relay 代表已配对的网关将最终推送发送到 APNs。

创建此设计的原因：将生产 APNs 凭据保留在用户网关之外，避免在网关上存储官方构建的原始 APNs token，只允许官方 OpenClaw iOS 构建使用托管 relay，并防止某个网关向属于另一网关的 iOS 设备发送唤醒推送。

本地/手动构建仍然使用直接 APNs。如果你在不使用 relay 的情况下测试这些构建，网关仍然需要直接 APNs 凭据：

```bash
export OPENCLAW_APNS_TEAM_ID="TEAMID"
export OPENCLAW_APNS_KEY_ID="KEYID"
export OPENCLAW_APNS_PRIVATE_KEY_P8="$(cat /path/to/AuthKey_KEYID.p8)"
```

这些是网关主机运行时环境变量，不是 Fastlane 设置。`apps/ios/fastlane/.env` 只存储 App Store Connect 认证信息，例如 `APP_STORE_CONNECT_KEY_ID` 和 `APP_STORE_CONNECT_ISSUER_ID`；它不会为本地 iOS 构建配置直接 APNs 投递。

建议在网关主机上按 `~/.openclaw/credentials/` 下其他提供方凭据的方式进行存储：

```bash
mkdir -p ~/.openclaw/credentials/apns
chmod 700 ~/.openclaw/credentials/apns
mv /path/to/AuthKey_KEYID.p8 ~/.openclaw/credentials/apns/AuthKey_KEYID.p8
chmod 600 ~/.openclaw/credentials/apns/AuthKey_KEYID.p8
export OPENCLAW_APNS_PRIVATE_KEY_PATH="$HOME/.openclaw/credentials/apns/AuthKey_KEYID.p8"
```

不要提交 `.p8` 文件，也不要将其放在仓库检出目录下。

## 发现路径

### Bonjour（局域网）

iOS 应用在 `local.` 上浏览 `_openclaw-gw._tcp`，并且在配置后，也会浏览相同的广域 DNS-SD 发现域。同一局域网中的网关会从 `local.` 自动出现；跨网络发现可以使用已配置的广域域，而无需更改 beacon 类型。

### Tailnet（跨网络）

如果 mDNS 被阻止，请使用单播 DNS-SD 区域（选择一个域名；示例：`openclaw.internal.`）和 Tailscale 分割 DNS。有关 CoreDNS 示例，请参见 [Bonjour](/gateway/bonjour)。

### 手动主机/端口

在设置中启用 **手动主机**，然后输入 gateway 主机 + 端口（默认 `18789`）。

## Canvas + A2UI

iOS 节点渲染一个 WKWebView 画布。使用 `node.invoke` 来驱动它：

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.navigate --params '{"url":"http://<gateway-host>:18789/__openclaw__/canvas/"}'
```

说明：

- Gateway 画布主机通过 Gateway HTTP 服务器提供 `/__openclaw__/canvas/` 和 `/__openclaw__/a2ui/`，端口与 `gateway.port` 相同，默认是 `18789`。
- iOS 节点会将内置脚手架保持为已连接的默认视图。`canvas.a2ui.push` 和 `canvas.a2ui.reset` 使用随附的、应用自有的 A2UI 页面。
- 远程 Gateway A2UI 页面在 iOS 上仅可渲染；原生 A2UI 按钮操作只接受来自随附的应用自有页面。
- 使用 `canvas.navigate` 和 `{"url":""}` 返回内置脚手架。

## 与 Computer Use 的关系

iOS 应用是一个移动节点表面，而不是 Codex Computer Use 后端。Codex Computer Use 和 `cua-driver mcp` 通过 MCP 工具控制本地 macOS 桌面；iOS 应用通过诸如 `canvas.*`、`camera.*`、`screen.*`、`location.*` 和 `talk.*` 之类的 OpenClaw 节点命令公开 iPhone 功能。

代理仍然可以通过调用节点命令来操作 iOS 应用，但这些调用会经过网关节点协议，并遵循 iOS 前台/后台限制。使用 [Codex Computer Use](/plugins/codex-computer-use) 进行本地桌面控制，使用本页了解 iOS 节点功能。

### Canvas 评估 / 快照

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.eval --params '{"javaScript":"(() => { const {ctx} = window.__openclaw; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.lineWidth=6; ctx.strokeStyle=\"#ff2d55\"; ctx.beginPath(); ctx.moveTo(40,40); ctx.lineTo(innerWidth-40, innerHeight-40); ctx.stroke(); return \"ok\"; })()"}'
```

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.snapshot --params '{"maxWidth":900,"format":"jpeg"}'
```

## 语音唤醒 + 对话模式

- 设置中提供语音唤醒和对话模式。
- 当 `talk.realtime.transport` 为 `webrtc` 时，OpenAI 实时对话使用由客户端拥有的 WebRTC；明确配置的 `gateway-relay` 仍然属于 Gateway 拥有。参见 [对话模式](/nodes/talk)。
- 支持对话的 iOS 节点会声明 `talk` 能力，并且可以声明 `talk.ptt.start`、`talk.ptt.stop`、`talk.ptt.cancel` 和 `talk.ptt.once`；对于受信任的、支持对话的节点，Gateway 默认允许这些按住说话命令。
- iOS 可能会暂停后台音频；当应用未处于活动状态时，请将语音功能视为尽力而为。

## 常见错误

- `NODE_BACKGROUND_UNAVAILABLE`：将 iOS 应用切换到前台（canvas/camera/screen 命令需要它）。
- `A2UI_HOST_UNAVAILABLE`：随应用捆绑的 A2UI 页面在应用 WebView 中不可达；请保持应用位于前台并停留在 Screen 标签页，然后重试。
- 配对提示始终不出现：运行 `openclaw devices list` 并手动批准。
- 重装后重新连接失败：Keychain 中的配对令牌已清除；请重新为节点配对。

## 相关文档

- [配对](/channels/pairing)
- [发现](/gateway/discovery)
- [Bonjour](/gateway/bonjour)
