---
summary: "iOS 节点应用：连接网关、配对、画布及故障排查"
read_when:
  - 配对或重新连接 iOS 节点时
  - 从源码运行 iOS 应用时
  - 调试网关发现或画布命令时
title: "iOS 应用"
---

# iOS 应用（节点）

可用性：内部预览。iOS 应用尚未公开发布。

## 功能介绍

- 通过 WebSocket（局域网或 tailnet）连接网关。
- 暴露节点能力：画布、屏幕快照、相机捕捉、定位、对讲模式、语音唤醒。
- 接收 `node.invoke` 命令并报告节点状态事件。

## 要求

- 网关运行在另一设备上（macOS、Linux，或者通过 WSL2 的 Windows）。
- 网络路径：
  - 通过 Bonjour 在同一局域网内，**或者**
  - 通过单播 DNS-SD 使用 tailnet（示例域名：`openclaw.internal.`），**或者**
  - 手动输入主机/端口（回退方案）。

## 快速开始（配对 + 连接）

1. 启动网关：

```bash
openclaw gateway --port 18789
```

2. 在 iOS 应用中打开设置，选择发现的网关（或者启用手动主机并输入主机/端口）。

3. 在网关主机上批准配对请求：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

If the app retries pairing with changed auth details (role/scopes/public key),
the previous pending request is superseded and a new `requestId` is created.
Run `openclaw devices list` again before approval.

4. Verify connection:

```bash
openclaw nodes status
openclaw gateway call node.list --params "{}"
```

## Relay-backed push for official builds

官方分发的 iOS 版本使用外部推送中继，而不是将原始 APNs 令牌发布到网关。

网关端要求：

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

工作流程：

- iOS 应用使用 App Attest 和应用收据向中继注册。
- 中继返回一个不透明的中继句柄和一个注册范围的发送授权。
- iOS 应用获取配对的网关身份并将其包含在中继注册中，因此基于中继的注册被委派到该特定网关。
- 应用将该基于中继的注册通过 `push.apns.register` 转发给配对的网关。
- 网关使用该保存的中继句柄进行 `push.test`，后台唤醒和唤醒提醒。
- 网关中继基础 URL 必须与官方/TestFlight iOS 版本内嵌的中继 URL 匹配。
- 如果应用稍后连接到不同的网关或具有不同中继基础 URL 的构建，它会刷新中继注册，而不是重用旧的绑定。

网关对于该路径**不需要**：

- 部署范围的中继令牌。
- 官方/TestFlight 基于中继发送所需的直接 APNs 密钥。

预期的操作流程：

1. 安装官方/TestFlight iOS 版本。
2. 在网关上设置 `gateway.push.apns.relay.baseUrl`。
3. 将应用与网关配对，并让其完成连接。
4. 在应用获得 APNs 令牌、操作员会话连接成功且中继注册成功后，应用自动发布 `push.apns.register`。
5. 此后，`push.test`、重新连接唤醒和唤醒提醒可使用保存的基于中继的注册。

兼容性说明：

- `OPENCLAW_APNS_RELAY_BASE_URL` 仍可作为网关的临时环境变量覆盖使用。

## Authentication and trust flow

该中继的存在是为了执行官方 iOS 版本中直接在网关 APNs 无法提供的两个约束：

- 只有通过苹果官方分发的真正 OpenClaw iOS 版本才能使用托管中继。
- 网关只能为与该特定网关配对的 iOS 设备发送基于中继的推送。

逐步流程：

1. `iOS 应用 -> 网关`
   - 应用首先通过正常的网关认证流程与网关配对。
   - 该过程为应用提供经过认证的节点会话和经过认证的操作员会话。
   - 操作员会话用于调用 `gateway.identity.get`。

2. `iOS 应用 -> 中继`
   - 应用通过 HTTPS 调用中继注册端点。
   - 注册包括 App Attest 证明和应用收据。
   - 中继验证包标识符、App Attest 证明和苹果收据，要求官方/生产分发路径。
   - 这就阻止了本地 Xcode/开发版本使用托管中继。尽管本地构建可能经过签名，但不满足中继所需的官方苹果分发证明。

3. `网关身份委派`
   - 在中继注册前，应用从 `gateway.identity.get` 获取配对的网关身份。
   - 应用将该网关身份包含在中继注册负载中。
   - 中继返回一个中继句柄和一个注册范围的发送授权，该授权被委派到该网关身份。

4. `网关 -> 中继`
   - 网关保存从 `push.apns.register` 获取的中继句柄和发送授权。
   - 在执行 `push.test`、重新连接唤醒和唤醒提醒时，网关使用自己的设备身份为发送请求签名。
   - 中继验证所保存的发送授权和网关签名，确认与注册时委派的网关身份匹配。
   - 其他网关即使获得该句柄，也无法重用该注册。

5. `中继 -> APNs`
   - 中继拥有官方版生产环境的 APNs 凭据和原始 APNs 令牌。
   - 网关从不保存基于中继的官方构建的原始 APNs 令牌。
   - 中继代表已配对的网关向 APNs 发送最终推送。

设计缘由：

- 保持生产环境 APNs 凭据远离用户网关。
- 避免在网关存储原始官方构建的 APNs 令牌。
- 只允许官方/TestFlight OpenClaw 构建使用托管中继。
- 防止一个网关向属于另一个网关的 iOS 设备发送唤醒推送。

本地/手动构建仍使用直接 APNs。如果你测试这些版本没有中继，网关仍需直接提供 APNs 凭据：

```bash
export OPENCLAW_APNS_TEAM_ID="TEAMID"
export OPENCLAW_APNS_KEY_ID="KEYID"
export OPENCLAW_APNS_PRIVATE_KEY_P8="$(cat /path/to/AuthKey_KEYID.p8)"
```

## 发现路径

### Bonjour（局域网）

网关会在 `local.` 广播 `_openclaw-gw._tcp`。iOS 应用会自动列出这些网关。

### Tailnet（跨网络）

如果 mDNS 被阻止，使用单播 DNS-SD 区域（选择一个域名，示例：`openclaw.internal.`）和 Tailscale 分割 DNS。  
具体请参阅 [Bonjour](/gateway/bonjour) 中的 CoreDNS 示例。

### 手动主机/端口

在设置中启用 **手动主机**，输入网关的主机和端口（默认 `18789`）。

## 画布 + A2UI

iOS 节点渲染一个 WKWebView 画布。使用 `node.invoke` 控制它：

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.navigate --params '{"url":"http://<gateway-host>:18789/__openclaw__/canvas/"}'
```

备注：

- 网关画布主机提供 `/__openclaw__/canvas/` 和 `/__openclaw__/a2ui/` 页面。
- 这些由网关的 HTTP 服务提供（端口与 `gateway.port` 相同，默认 `18789`）。
- iOS 节点在连接时如果收到画布主机 URL 会自动导航至 A2UI。
- 通过 `canvas.navigate` 和 `{"url":""}` 可返回内置脚手架。

### 画布执行脚本 / 快照

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.eval --params '{"javaScript":"(() => { const {ctx} = window.__openclaw; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.lineWidth=6; ctx.strokeStyle=\"#ff2d55\"; ctx.beginPath(); ctx.moveTo(40,40); ctx.lineTo(innerWidth-40, innerHeight-40); ctx.stroke(); return \"ok\"; })()"}'
```

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.snapshot --params '{"maxWidth":900,"format":"jpeg"}'
```

## 语音唤醒 + 对讲模式

- 语音唤醒和对讲模式可在设置中启用。
- iOS 可能会挂起后台音频，应用不活跃时语音功能视为尽力而为。

## 常见错误

- `NODE_BACKGROUND_UNAVAILABLE`：请将 iOS 应用置于前台（画布/相机/屏幕命令需要应用前台运行）。
- `A2UI_HOST_NOT_CONFIGURED`：网关未广播画布主机 URL；检查 [网关配置](/gateway/configuration) 中的 `canvasHost`。
- 配对提示未弹出：执行 `openclaw devices list` 并手动批准。
- 重装后重新连接失败：钥匙串 pairing token 被清除；请重新配对节点。

## 相关文档

- [配对](/channels/pairing)
- [发现](/gateway/discovery)
- [Bonjour](/gateway/bonjour)
