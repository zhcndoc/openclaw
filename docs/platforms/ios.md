---
summary: "iOS 节点应用：连接到 Gateway、配对、画布和故障排查"
read_when:
  - 配对或重新连接 iOS 节点
  - 从源代码运行 iOS 应用
  - 调试网关发现或画布命令
title: "iOS 应用"
---

可用性：内部预览。iOS 应用尚未公开分发。

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

1. 启动 Gateway：

```bash
openclaw gateway --port 18789
```

2. 在 iOS 应用中打开设置，并选择一个已发现的 gateway（或启用手动主机并输入主机/端口）。

3. 在 gateway 主机上批准配对请求：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

如果应用使用变更后的认证信息（角色/范围/公钥）重试配对，
之前处于待处理状态的请求会被替换，并创建新的 `requestId`。
在批准之前请再次运行 `openclaw devices list`。

可选：如果 iOS 节点始终从严格受控的子网连接，
你可以通过显式 CIDR 或精确 IP 选择首次节点自动批准：

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

默认情况下这是禁用的。它仅适用于没有请求范围的全新 `role: node` 配对。
操作员/浏览器配对，以及任何角色、范围、元数据或公钥变更，仍然需要手动批准。

4. 验证连接：

```bash
openclaw nodes status
openclaw gateway call node.list --params "{}"
```

## 官方构建的 relay 支持推送

官方分发的 iOS 构建使用外部推送 relay，而不是将原始 APNs
token 发布给 gateway。

Gateway 端要求：

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

- iOS 应用使用 App Attest 和 StoreKit 应用交易 JWS 向 relay 注册。
- relay 返回一个不透明的 relay handle，以及一个作用域为该注册的发送授权。
- iOS 应用获取已配对的 gateway 身份，并将其包含在 relay 注册中，因此该 relay-backed 注册会被委派给特定的 gateway。
- 应用通过 `push.apns.register` 将该 relay-backed 注册转发给已配对的 gateway。
- gateway 在 `push.test`、后台唤醒和唤醒提示中使用存储的 relay handle。
- gateway 的 relay base URL 必须与官方/TestFlight iOS 构建中写入的 relay URL 匹配。
- 如果应用之后连接到另一个 gateway，或连接到具有不同 relay base URL 的构建，它会刷新 relay 注册，而不是复用旧绑定。

此路径下 gateway **不需要**：

- 不需要全局部署级的 relay token。
- 不需要官方/TestFlight relay-backed 发送的直接 APNs key。

预期的操作流程：

1. 安装官方/TestFlight iOS 构建。
2. 在 gateway 上设置 `gateway.push.apns.relay.baseUrl`。
3. 将应用与 gateway 配对并让其完成连接。
4. 应用在获得 APNs token、操作员会话连接成功且 relay 注册成功后，会自动发布 `push.apns.register`。
5. 之后，`push.test`、重连唤醒和唤醒提示都可以使用存储的 relay-backed 注册。

## 后台存活信标

当 iOS 因静默推送、后台刷新或显著位置事件唤醒应用时，应用会尝试一次短暂的节点重连，然后调用带有 `event: "node.presence.alive"` 的 `node.event`。
gateway 只有在已知经过认证的节点设备身份后，才会将此记录为已配对节点/设备元数据上的 `lastSeenAtMs`/`lastSeenReason`。

应用只有在 gateway 响应包含 `handled: true` 时，才将一次后台唤醒视为已成功记录。较旧的 gateway 可能会用 `{ "ok": true }` 确认 `node.event`；该响应是兼容的，但不计为持久的最近在线状态更新。

兼容性说明：

- `OPENCLAW_APNS_RELAY_BASE_URL` 仍可作为 gateway 的临时环境变量覆盖。

## 认证与信任流程

relay 的存在是为了强制执行两个约束，而直接在 gateway 上使用 APNs 无法为
官方 iOS 构建提供这些约束：

- 只有通过 Apple 分发的真实 OpenClaw iOS 构建才能使用托管 relay。
- gateway 只能为与该特定 gateway 配对的 iOS 设备发送 relay-backed 推送。

逐跳说明：

1. `iOS app -> gateway`
   - 应用首先通过正常的 Gateway 认证流程与 gateway 配对。
   - 这会给应用一个已认证的节点会话，以及一个已认证的操作员会话。
   - 操作员会话用于调用 `gateway.identity.get`。

2. `iOS app -> relay`
   - 应用通过 HTTPS 调用 relay 注册端点。
   - 注册内容包括 App Attest 证明以及 StoreKit 应用交易 JWS。
   - relay 会验证 bundle ID、App Attest 证明以及 Apple 分发证明，并要求
     官方/生产分发路径。
   - 这就是阻止本地 Xcode/开发构建使用托管 relay 的原因。本地构建可能已
     签名，但它不满足 relay 所期望的 Apple 官方分发证明。

3. `gateway identity delegation`
   - 在 relay 注册之前，应用会从 `gateway.identity.get` 获取已配对的 gateway 身份。
   - 应用会将该 gateway 身份包含在 relay 注册负载中。
   - relay 会返回一个 relay handle 和一个作用域为该注册的发送授权，这些权限会被委派给
     该 gateway 身份。

4. `gateway -> relay`
   - gateway 会保存来自 `push.apns.register` 的 relay handle 和发送授权。
   - 在 `push.test`、重连唤醒和唤醒提示期间，gateway 会使用其
     自身设备身份签名发送请求。
   - relay 会将存储的发送授权和 gateway 签名，与注册时委派的
     gateway 身份进行验证。
   - 其他 gateway 无法复用该已存储的注册，即使它以某种方式获得了这个 handle。

5. `relay -> APNs`
   - relay 持有官方构建所需的生产 APNs 凭据和原始 APNs token。
   - 对于 relay-backed 官方构建，gateway 从不存储原始 APNs token。
   - relay 代表已配对的 gateway 将最终推送发送到 APNs。

创建此设计的原因：

- 将生产 APNs 凭据保留在用户 gateway 之外。
- 避免在 gateway 上存储官方构建的原始 APNs token。
- 仅允许官方/TestFlight OpenClaw 构建使用托管 relay。
- 防止一个 gateway 向属于另一个 gateway 的 iOS 设备发送唤醒推送。

本地/手动构建仍然使用直接 APNs。如果你在不使用 relay 的情况下测试这些构建，
gateway 仍然需要直接 APNs 凭据：

```bash
export OPENCLAW_APNS_TEAM_ID="TEAMID"
export OPENCLAW_APNS_KEY_ID="KEYID"
export OPENCLAW_APNS_PRIVATE_KEY_P8="$(cat /path/to/AuthKey_KEYID.p8)"
```

这些是 gateway 主机的运行时环境变量，不是 Fastlane 设置。`apps/ios/fastlane/.env` 只存储
App Store Connect / TestFlight 认证信息，例如 `ASC_KEY_ID` 和 `ASC_ISSUER_ID`；
它不为本地 iOS 构建配置直接 APNs 投递。

推荐的 gateway 主机存储方式：

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

iOS 应用会浏览 `local.` 上的 `_openclaw-gw._tcp`，并且在配置后浏览同一个
广域 DNS-SD 发现域。处于同一局域网的 gateway 会从 `local.` 自动显示；
跨网络发现可以使用已配置的广域域，而无需更改信标类型。

### Tailnet（跨网络）

如果 mDNS 被阻止，请使用单播 DNS-SD 区域（选择一个域名；示例：
`openclaw.internal.`）以及 Tailscale 分流 DNS。
CoreDNS 示例请参见 [Bonjour](/gateway/bonjour)。

### 手动主机/端口

在设置中启用 **Manual Host**，然后输入 gateway 主机 + 端口（默认 `18789`）。

## Canvas + A2UI

iOS 节点渲染一个 WKWebView 画布。使用 `node.invoke` 来驱动它：

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.navigate --params '{"url":"http://<gateway-host>:18789/__openclaw__/canvas/"}'
```

说明：

- Gateway canvas 主机提供 `/__openclaw__/canvas/` 和 `/__openclaw__/a2ui/`。
- 它由 Gateway HTTP 服务器提供（与 `gateway.port` 相同的端口，默认 `18789`）。
- 当广告了 canvas 主机 URL 时，iOS 节点在连接时会自动导航到 A2UI。
- 使用 `canvas.navigate` 和 `{"url":""}` 可返回内置脚手架。

## 与 Computer Use 的关系

iOS 应用是一个移动节点表面，而不是 Codex Computer Use 后端。Codex
Computer Use 和 `cua-driver mcp` 通过 MCP
工具控制本地 macOS 桌面；iOS 应用通过 OpenClaw 节点命令暴露 iPhone 能力，
例如 `canvas.*`、`camera.*`、`screen.*`、`location.*` 和 `talk.*`。

代理仍然可以通过 OpenClaw 调用节点命令来操作 iOS 应用，但这些调用会经过
gateway 节点协议，并遵循 iOS 前台/后台限制。请使用 [Codex Computer Use](/plugins/codex-computer-use)
进行本地桌面控制，并使用此页面了解 iOS 节点能力。

### Canvas 评估 / 快照

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.eval --params '{"javaScript":"(() => { const {ctx} = window.__openclaw; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.lineWidth=6; ctx.strokeStyle=\"#ff2d55\"; ctx.beginPath(); ctx.moveTo(40,40); ctx.lineTo(innerWidth-40, innerHeight-40); ctx.stroke(); return \"ok\"; })()"}'
```

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.snapshot --params '{"maxWidth":900,"format":"jpeg"}'
```

## 语音唤醒 + 对话模式

- 语音唤醒和对话模式可在设置中使用。
- 支持对话的 iOS 节点会声明 `talk` 能力，并可以声明
  `talk.ptt.start`、`talk.ptt.stop`、`talk.ptt.cancel` 和 `talk.ptt.once`；
  对于受信任、支持对话的节点，Gateway 默认允许这些按键通话命令。
- iOS 可能会挂起后台音频；当应用未处于活动状态时，请将语音功能视为尽力而为。

## 常见错误

- `NODE_BACKGROUND_UNAVAILABLE`：将 iOS 应用切到前台（画布/摄像头/屏幕命令需要它）。
- `A2UI_HOST_NOT_CONFIGURED`：Gateway 未公布 Canvas 插件表面 URL；请检查 [Gateway configuration](/gateway/configuration) 中的 `plugins.entries.canvas.config.host`。
- 配对提示始终不出现：运行 `openclaw devices list` 并手动批准。
- 重新安装后重连失败：Keychain 配对令牌已被清除；请重新为该节点配对。

## 相关文档

- [配对](/channels/pairing)
- [发现](/gateway/discovery)
- [Bonjour](/gateway/bonjour)
