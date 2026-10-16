---
summary: "Google Meet 实时测试清单以及针对加入、语音、创建和 Twilio 故障的修复"
read_when:
  - "您正在无人值守客服人员加入之前检查 Google Meet 设置"
  - "客服人员加入了 Meet 通话，但无法看到、听到或说话"
  - "Twilio 拨入支路永远不会进入会议室"
title: "Google 遇到故障排除"
sidebarTitle: "故障排查"
---

飞行前实时测试清单以及针对连接、语音、创建和 Twilio 故障的修复。 [Google Meet 插件](/plugins/google-meet) 指南的一部分。

## <a id="live-test-checklist"></a> 实时测试清单

在将会议交给无人值守代理之前：

```bash
openclaw googlemeet setup
openclaw nodes status
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij \
  --transport chrome-node \
  --message "Say exactly: Google Meet speech test complete."
```

预期 Chrome-node 状态：

- `googlemeet setup` 全部为绿色，并且当 Chrome-node 是默认传输方式或已固定某个节点时，会包含 `chrome-node-connected`。
- `nodes status` 显示所选节点已连接，并同时广播 `googlemeet.chrome` 和 `browser.proxy`。
- Meet 标签页加入会议，并且 `test-speech` 返回带有 `inCall: true` 的 Chrome 健康状态。

对于远程 Chrome 主机（例如 Parallels macOS VM），更新网关或 VM 后最短的安全检查：

```bash
openclaw googlemeet setup
openclaw nodes status --connected
openclaw nodes invoke \
  --node parallels-macos \
  --command googlemeet.chrome \
  --params '{"action":"setup"}'
```

这证明网关插件已加载，VM 节点已与当前令牌连接，并且在客服人员打开真正的会议选项卡之前，会议音频桥可用。

对于 Twilio 试运行，请使用一个提供电话拨入详情的会议：

```bash
openclaw googlemeet setup
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --pin 123456
```

预期 Twilio 状态：

- `googlemeet setup` 包含绿色的 `twilio-voice-call-plugin`、`twilio-voice-call-credentials` 和 `twilio-voice-call-webhook` 检查项。
- 安装并启用语音通话插件后，`voicecall` 在 CLI 中可用。
- 返回的会话具有 `transport: "twilio"` 和 `twilio.voiceCallId`。
- `openclaw logs --follow` 显示先提供 DTMF TwiML，再提供 realtime TwiML，随后是带有已排队初始问候语的实时桥接。
- `googlemeet leave <sessionId>` 挂断委托的语音通话。

## <a id="troubleshooting"></a> 故障排查

### <a id="agent-cannot-see-the-google-meet-tool"></a> Agent 无法看到 Google Meet 工具

确认插件已启用且其运行时应用成功；请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。然后检查设置：

```bash
openclaw plugins list | grep google-meet
openclaw googlemeet setup
```

在 Linux 上，本地 Chrome 回传音频需要 Chrome 桌面用户会话中的 PipeWire-Pulse，以及 `pactl`、`pacat` 和 `parec`。在不受支持的操作系统上，请使用 `mode: "transcribe"`、Twilio 拨入，或受支持的 macOS/Linux `chrome-node` 主机。

### <a id="no-connected-google-meet-capable-node"></a> 没有已连接的支持 Google Meet 的节点

在节点主机上：

```bash
openclaw plugins install @openclaw/google-meet
openclaw plugins enable browser
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node run --host <gateway-lan-ip> --port 18789 --display-name parallels-macos
```

在 Gateway 主机上：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

节点必须已连接，并列出 `googlemeet.chrome` 和 `browser.proxy`；Gateway 配置也必须允许这两项：

```json5
{
  gateway: {
    nodes: {
      commands: { allow: ["browser.proxy", "googlemeet.chrome"] },
    },
  },
}
```

如果 `googlemeet setup` 失败并提示 `chrome-node-connected`，或者 Gateway 日志报告 `gateway token mismatch`，请使用当前 Gateway token 重新安装或重启节点：

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node install \
  --host <gateway-lan-ip> \
  --port 18789 \
  --display-name parallels-macos \
  --force
```

然后重新加载节点服务并再次运行：

```bash
openclaw googlemeet setup
openclaw nodes status --connected
```

### <a id="browser-opens-but-agent-cannot-join"></a> 浏览器打开了，但 agent 无法加入

运行 `googlemeet test-listen` 进行仅观察式加入，或运行 `googlemeet test-speech` 进行实时加入，然后检查返回的 Chrome 健康状态。如果任一命令的结果包含 `manualAction`，请向操作员显示 `manualAction.message`，并在浏览器操作完成前停止重试。

常见手动操作：登录 Chrome 个人资料；从 Meet 主持人帐户接纳来宾；出现本机提示时授予 Chrome microphone/camera 权限；关闭或修复卡住的 Meet 权限对话框。

不要因为 Meet 提示“您希望会议中的其他人听到您的声音吗？”就报告“未登录”；那是 Meet 的音频选择中间页。OpenClaw 会在可用时通过浏览器自动化点击 **使用麦克风**，并继续等待真正的会议状态；对于仅创建的浏览器回退路径，它可能会改为点击 **不使用麦克风继续**，因为生成 URL 不需要实时音频路径。

### <a id="meeting-creation-fails"></a> 会议创建失败

配置 OAuth 时，`googlemeet create` 使用 Meet API `spaces.create`，否则使用固定的 Chrome 节点浏览器。确认：

- **API 创建**：存在 `oauth.clientId` 和 `oauth.refreshToken`（或对应的 `OPENCLAW_GOOGLE_MEET_*` 环境变量），并且刷新令牌是在添加创建支持后生成的；较旧的令牌可能缺少 `meetings.space.created` 权限，因此请重新运行 `openclaw googlemeet auth login --json`。
- **浏览器回退**：`defaultTransport: "chrome-node"` 且 `chromeNode.node` 指向一个已连接的节点，该节点具有 `browser.proxy` 和 `googlemeet.chrome`；该节点上的 OpenClaw Chrome 配置文件已登录，并且可以打开 `https://meet.google.com/new`。
- **浏览器回退重试**：在打开新标签页之前，先复用现有的 `.../new` 标签页或 Google 账户提示标签页；应重试工具调用，而不是手动打开另一个标签页。
- **人工操作**：如果工具返回 `manualAction`，请使用 `browser.nodeId`、`browser.targetId`、`browserUrl` 和 `manualAction.message` 引导操作员；不要循环重试。
- **音频选择中间页**：如果 Meet 显示“您希望会议中的其他人听到您的声音吗？”，请保持标签页打开。OpenClaw 应点击 **使用麦克风**，或（仅创建场景）点击 **不使用麦克风继续**，并继续等待生成的 URL；如果无法完成，错误应提及 `meet-audio-choice-required`，而不是 `google-login-required`。

### <a id="agent-joins-but-does-not-talk"></a> Agent 加入了，但没有说话

```bash
openclaw googlemeet setup
openclaw googlemeet doctor
```

对 STT -> OpenClaw 代理 -> TTS 路径使用 `mode: "agent"`，或对实时语音使用 `mode: "bidi"`，包括 GPT-Live。 `mode: "transcribe"` 故意启动无对讲桥。对于仅观察调试，请在参与者发言后运行 `openclaw googlemeet status --json <session-id>` 并检查 `captioning`、`transcriptLines`、`lastCaptionText`。如果 `inCall` 为 true，但 `transcriptLines` 仍为 `0`，则 Meet 字幕可能被禁用、自安装观察员以来无人发言、Meet UI 已更改，或者会议 language/account. 的实时字幕不可用

`googlemeet test-speech` 检查所选的对讲路径，并需要虚拟麦克风捕获路径上的新助理输出波形。如果 `speechOutputVerified` 为 false 并且 `speechOutputTimedOut` 为 true，则检查提供程序输出和本机 injection/loopback 字段；仅接受的输出字节并不能证明语音已到达 Meet 的麦克风。

还要验证网关主机上的提供商身份验证、Chrome 主机上的本机音频后端以及 `doctor` 中的两个音频路由。通过生成的输入命令，浏览器会话使用虚拟麦克风进行助理注入，并报告 `Isolated browser playback` 供参与者输入。显式输入命令保留其配置的捕获路径。 GPT-Live with Cove 使用配置的 OpenAI 帐户；请参阅 [Live 配置](/plugins/google-meet/config#gpt-live-with-cove)。

`googlemeet doctor [session-id]` 打印会话、节点、通话状态、手动操作原因、实时提供商连接、`realtimeReady`、音频 input/output 活动、最后音频时间戳、字节计数器和浏览器 URL。使用 `googlemeet status [session-id] --json` 作为原始 JSON 和 `googlemeet doctor --oauth`（添加 `--meeting` 或 `--create-space`）来验证 OAuth 刷新而不暴露令牌。

如果 agent 超时且已经打开了一个 Meet 标签页，请在不再打开新标签页的情况下检查它：

```bash
openclaw googlemeet recover-tab
openclaw googlemeet recover-tab https://meet.google.com/abc-defg-hij
```

对应的工具操作是 `recover_current_tab`：它会聚焦并检查所选传输方式的现有 Meet 标签页（`chrome` 使用本地浏览器控制，`chrome-node` 使用已配置的节点），而不会打开新标签页或新会话，并报告当前阻塞原因（登录、准入、权限、音频选择状态）。CLI 命令会连接到已配置的 Gateway，而 Gateway 必须正在运行；`chrome-node` 还要求节点已连接。

### <a id="live-cannot-hear-interruptions-or-browser-capture-fails"></a> Live 听不到中断或浏览器捕获失败

将 `bidi` 模式与显式 Live 模型结合使用。在保持 `agent` 模式的情况下设置语音模型仍然使用常规 TTS。 GPT-Live 自行处理中断，因此 `chrome.bargeInInputCommand` 不是必需的，也不会为 Live 启动。

对于直播，参与者输入必须来自独立的浏览器播放。删除显式 `chrome.audioInputCommand` 以选择该托管路径；自定义命令仍然是其他模型的提供者输入，并且不会被默默地替换。如果桥报告它需要隔离会议音频或无法捕获浏览器播放，请检查跟踪的“会议”选项卡及其报告的浏览器错误。使用 `chrome-node` 时更新网关和配对节点，然后在浏览器播放可用后重试。桥接器在捕获失败时停止，而不是将辅助输出反馈回 Live。没有远程媒体的空房间仍然可以保持连接和空闲。

请勿将参与者回放路由回虚拟麦克风以解决捕获错误。要验证双工行为，请使用受控的第二个参与者来确认可以听到响应并在响应期间讲话；仅本地`test-speech`验证不能证明往返。

### <a id="twilio-setup-checks-fail"></a> Twilio 设置检查失败

当不允许或未启用 `voice-call` 时，`twilio-voice-call-plugin` 会失败：将其添加到 `plugins.allow`，启用 `plugins.entries.voice-call`，并在应用更改后重新运行安装程序。

当 Twilio 后端缺少 account SID、auth token 或呼叫号码时，`twilio-voice-call-credentials` 会失败：

```bash
export TWILIO_ACCOUNT_SID=AC...
export TWILIO_AUTH_TOKEN=...
export TWILIO_FROM_NUMBER=+15550001234
```

当 `voice-call` 没有公共 webhook 暴露或 `publicUrl` 指向 loopback/private 网络空间时，`twilio-voice-call-webhook` 失败。请勿将 `localhost`、`127.0.0.1`、`0.0.0.0`、`10.x`、`172.16.x`-`172.31.x`、`192.168.x`、`169.254.x`、`fc00::/7` 或 `fd00::/8` 用作`publicUrl`；运营商回调无法到达这些。将 `plugins.entries.voice-call.config.publicUrl` 设置为公共 URL，或者配置 tunnel/Tailscale 曝光：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio",
          fromNumber: "+15550001234",
          publicUrl: "https://voice.example.com/voice/webhook",
        },
      },
    },
  },
}
```

对于本地开发，请使用隧道或 Tailscale 暴露，而不是私有主机 URL：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          tunnel: { provider: "ngrok" },
          // or
          tailscale: { mode: "funnel", path: "/voice/webhook" },
        },
      },
    },
  },
}
```

插件配置更改会自动应用默认的混合重新加载模式（请参阅 [Hot reload](/gateway/configuration/hot-reload)）。如果您更改了基于环境的凭据，请使用更新后的环境重新启动网关。然后验证：

```bash
openclaw googlemeet setup --transport twilio
openclaw voicecall setup
openclaw voicecall smoke
```

默认情况下，`voicecall smoke` 仅进行就绪性检查。对指定号码做干运行：

```bash
openclaw voicecall smoke --to "+15555550123"
```

只有在明确要发起一次真实的外呼时才添加 `--yes`：

```bash
openclaw voicecall smoke --to "+15555550123" --yes
```

### <a id="twilio-call-starts-but-never-enters-the-meeting"></a> Twilio 呼叫开始了，但从未进入会议

确认 Meet 事件公开了电话拨入详情，并传入准确的拨入号码以及 PIN，或自定义 DTMF 序列：

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --dtmf-sequence ww123456#
```

在 PIN 之前使用前导 `w` 或 `--dtmf-sequence` 中的逗号作为暂停。

如果呼叫已创建但 Meet 名单中始终没有显示拨入参与者：

- `openclaw googlemeet doctor <session-id>`：确认委派的 Twilio 呼叫 ID、是否已排队 DTMF，以及是否请求了开场问候。
- `openclaw voicecall status --call-id <id>`：确认呼叫仍处于活动状态。
- `openclaw voicecall tail`：确认 Twilio webhook 正在到达 Gateway。
- `openclaw logs --follow`：查找 Twilio Meet 序列：Google Meet 委派加入，Voice Call 存储并提供预连接 DTMF TwiML，Voice Call 为 Twilio 呼叫提供实时 TwiML，然后 Google Meet 通过 `voicecall.speak` 请求开场语音。
- 重新运行 `openclaw googlemeet setup --transport twilio`；绿色的 setup 检查是必需的，但并不能证明会议 PIN 序列正确。
- 确认拨入号码与 PIN 属于同一个 Meet 邀请和地区。
- 如果 Meet 应答缓慢或发送预连接 DTMF 后通话记录仍显示 PIN 提示，则从 12 秒默认值增加 `voiceCall.dtmfDelayMs`。
- 如果参与者已加入但你听不到问候语，请检查 `openclaw logs --follow` 中 DTMF 之后的 `voicecall.speak` 请求，以及媒体流 TTS 播放或 Twilio `<Say>` 回退。如果转录仍显示“请输入会议 PIN”，说明电话线路还未加入 Meet 房间，因此参与者不会听到语音。

如果 webhook 没有到达，请先调试 Voice Call 插件：提供方必须能够访问 `plugins.entries.voice-call.config.publicUrl` 或已配置的隧道。参见 [语音呼叫故障排查](/plugins/voice-call#troubleshooting)。
