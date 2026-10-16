---
summary: "修复了语音通话设置、网络钩子、签名、Meet 拨入和静默通话"
read_when:
  - "语音呼叫无法拨打或网络钩子永远不会到达"
  - "Webhook签名验证失败"
  - "实时通话接通但没人说话"
title: "语音通话故障排除"
sidebarTitle: "故障排查"
---

修复了设置、Webhook 暴露、凭据、签名验证、Google Meet 拨入和静默实时通话。 [语音通话插件](/plugins/voice-call)指南的一部分。

## <a id="troubleshooting"></a> 故障排查

### <a id="call-placement-fails-to-save-its-initial-record"></a> 呼叫放置未能保存其初始记录

语音呼叫在保存初始记录的同时保留待处理容量，然后仅在写入成功后发布活动呼叫并联系运营商。如果写入失败，placement会报告存储错误，无需拨号，并释放预留。恢复对状态目录的访问，然后重试；失败的放置不会消耗 `maxConcurrentCalls` 容量。

Webhook 确认和转录驱动的回复等待通话记录持久化。令牌绑定的实时流在匹配运营商 ID 之前等待挂起的呼叫更新。失败的事件写入仍然可以重试，并且关闭 webhook 和流生成器后会耗尽已承认的调用工作。

如果另一个实时流在准入期间变为活动状态，则创建新桥失败会导致该活动呼叫保持连接状态。

### <a id="setup-fails-webhook-exposure"></a> Setup webhook 暴露失败

从运行 Gateway 的相同环境中运行 setup：

```bash
openclaw voicecall setup
openclaw voicecall setup --json
```

对于 `twilio`、`telnyx` 和 `plivo`，`webhook-exposure` 必须为绿色。即使配置了 `publicUrl`，当它指向本地或私有网络地址时仍然会失败，因为运营商无法回拨到这些地址。不要将 `localhost`、`127.0.0.1`、`0.0.0.0`、`10.x`、`172.16.x`-`172.31.x`、`192.168.x`、`169.254.x`、`fc00::/7`、`fd00::/8`，或其他 carrier-grade-NAT 地址段用作 `publicUrl`。

Twilio notify-mode outbound calls 会在 create-call 请求中直接发送其初始 `<Say>` TwiML，因此第一条播报消息不依赖于 Twilio 获取 webhook TwiML。即便如此，状态回调、会话通话、预连接 DTMF、实时流以及连接后通话控制仍然需要一个公共 webhook。

使用一种公共暴露路径：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          publicUrl: "https://voice.example.com/voice/webhook",
          // or
          tunnel: { provider: "ngrok" },
          // or
          tailscale: { mode: "funnel", port: 8443, path: "/voice/webhook" },
        },
      },
    },
  },
}
```

配置更改会自动应用默认的混合重新加载模式（请参阅 [HHot reload](/gateway/configuration/hot-reload)）。应用后，运行：

```bash
openclaw voicecall setup
openclaw voicecall smoke
```

`voicecall smoke` 是一次演练，除非您通过了 `--yes`。

### <a id="provider-credentials-fail"></a> 提供商凭据失败

检查所选提供商以及所需的凭据字段：

- Twilio: `twilio.accountSid`、`twilio.authToken` 和 `fromNumber`，或 `TWILIO_ACCOUNT_SID`、`TWILIO_AUTH_TOKEN` 和 `TWILIO_FROM_NUMBER`。
- Telnyx: `telnyx.apiKey`、`telnyx.connectionId`、`telnyx.publicKey` 和 `fromNumber`，或 `TELNYX_API_KEY`、`TELNYX_CONNECTION_ID` 和 `TELNYX_PUBLIC_KEY`。
- Plivo: `plivo.authId`、`plivo.authToken` 和 `fromNumber`，或 `PLIVO_AUTH_ID` 和 `PLIVO_AUTH_TOKEN`。

凭证必须存在于网关主机上。编辑本地 shell 配置文件不会更改网关的运行环境。更改基于环境的凭据时，更新其服务环境并重新启动网关。

### <a id="calls-start-but-provider-webhooks-do-not-arrive"></a> 呼叫开始但提供商 webhook 未到达

确认提供商控制台指向的是精确的公共 webhook URL：

```text
https://voice.example.com/voice/webhook
```

对于Twilio呼入号码，在Twilio控制台中配置两个号码级回调：

- **Voice webhook：** `https://voice.example.com/voice/webhook` 使用 `POST`。
- **状态回调：** `https://voice.example.com/voice/webhook?type=status`使用`POST`。

媒体流 `stop`/WebSocket 关闭处理是主要自动结束路径，不依赖于 HTTP 状态回调。 Twilio 的可选 `<Stream statusCallback>` 是一个单独的流诊断信号，拆卸时不需要。 `openclaw voicecall setup` 验证本地配置和 webhook 暴露；它无法检查或更改 Twilio 控制台设置。

然后检查运行时状态：

```bash
openclaw voicecall status --call-id <id>
openclaw voicecall tail
openclaw logs --follow
```

常见原因：

- `publicUrl` 与提供商配置的公共 webhook URL 不匹配。反向代理可以将该公共路径映射到不同的 `serve.path`，但 `publicUrl` 必须保持为面向提供商的 URL。
- Gateway 启动后隧道 URL 发生了变化。
- 代理转发了请求，但移除或重写了 host/proto 头。
- 防火墙或 DNS 将公共主机名路由到了 Gateway 以外的位置。
- Gateway 重启时未启用 Voice Call 插件。

当反向代理或隧道位于 Gateway 前方时，将 `webhookSecurity.allowedHosts` 设置为公共主机名，或者对已知代理地址使用 `webhookSecurity.trustedProxyIPs`。仅当代理边界由你控制时，才使用 `webhookSecurity.trustForwardingHeaders`。

### <a id="signature-verification-fails"></a> 签名验证失败

Twilio 和 Plivo URL 签名在配置时使用 `publicUrl`：在应用请求查询时，保留其方案、主机和路径。如果没有 `publicUrl`，OpenClaw 将根据请求重建 URL。 Telnyx 签名不包括请求 URL。如果签名失败：

- 确认提供商 webhook URL 与 `publicUrl` 完全一致，包括 scheme、host 和 path。
- 对于 ngrok 免费层 URL，当隧道主机名更改时更新 `publicUrl`。
- 检查代理是否保留原始主机和原始标头，或配置 `webhookSecurity.allowedHosts`。
- 不要在本地测试之外启用 `skipSignatureVerification`。

### <a id="google-meet-twilio-joins-fail"></a> Google Meet Twilio 加入失败

Google Meet 使用此插件来完成 Twilio 拨入加入。首先验证 Voice Call：

```bash
openclaw voicecall setup
openclaw voicecall smoke --to "+15555550123"
```

然后显式验证 Google Meet 传输：

```bash
openclaw googlemeet setup --transport twilio
```

如果 Voice Call 是绿色的，但参会者始终未加入，请检查 Meet 的拨入号码、PIN 以及 `--dtmf-sequence`。电话呼叫本身可能是正常的，但会议会拒绝或忽略错误的 DTMF 序列。

Google Meet 通过 `voicecall.start` 使用预连接 DTMF 序列启动 Twilio 电话线路。 PIN- 派生序列包括 Google Meet 插件的 `voiceCall.dtmfDelayMs`（默认 **12000 ms**）作为前导 Twilio 等待数字，因为 Meet 拨入提示可能会延迟到达。然后，在请求介绍问候语之前，语音呼叫将重定向回实时处理。

使用 `openclaw logs --follow` 查看实时阶段追踪。健康的 Twilio Meet 加入日志顺序如下：

- Google Meet 将 Twilio 加入委托给 Voice Call。
- Voice Call 存储预连接 DTMF TwiML。
- 在实时处理之前，Twilio 初始 TwiML 被消耗并提供。
- Voice Call 为 Twilio 呼叫提供实时 TwiML。
- Google Meet 在 post-DTMF 延迟后使用 `voicecall.speak` 请求介绍语音。

`openclaw voicecall tail` 仍显示持续通话记录；对于呼叫状态和转录很有用，但并非每个 webhook/realtime 转换都会出现在那里。

### <a id="realtime-call-has-no-speech"></a> 实时呼叫没有语音

确认只启用了一个音频模式：`realtime.enabled` 和 `streaming.enabled` 不能同时为 true。

对于实时 Twilio/Telnyx 呼叫，还要验证：

- 已加载并注册实时提供商插件。
- `realtime.provider` 未设置，或指定了一个已注册的提供商。
- 提供商 API key 对 Gateway 进程可用。
- `openclaw logs --follow` 显示已提供实时 TwiML、实时桥接已启动，并且初始问候语已排队。
