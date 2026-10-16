---
summary: "通过 Twilio、Telnyx 或 Plivo 发起外呼并接听来电，可选支持实时语音和流式转录"
read_when:
  - "你想从 OpenClaw 发起外呼语音通话"
  - "你正在配置或开发语音通话插件"
  - "你需要在电话系统上使用实时语音或流式转录"
title: "语音通话插件"
sidebarTitle: "语音通话"
---

通过插件为 OpenClaw 提供语音通话：外呼通知、多轮对话、全双工实时语音、流式转录，以及带有允许列表策略的来电。

**提供商：** `mock`（开发环境，无网络）、`plivo`（语音 API + XML 转接 + GetInput 语音）、`telnyx`（Call Control v2）、`twilio`（可编程语音 + Media Streams）。

<Note>
语音呼叫插件在网关进程 **内运行**。如果您使用远程网关，请在运行网关的计算机上安装并配置插件。安装自动应用于正在运行的网关；如果离线，配置完成后启动。
</Note>

## <a id="quick-start"></a> 快速开始

<Steps>
  <Step id="install-the-plugin" title="安装插件">
    <Tabs>
      <Tab id="from-npm" title="来自 npm">
        ```bash
        openclaw plugins install @openclaw/voice-call
        ```
      </Tab>
      <Tab id="from-a-local-folder-dev" title="从本地文件夹 （dev）">
        ```bash
        PLUGIN_SRC=./path/to/local/voice-call-plugin
        openclaw plugins install "$PLUGIN_SRC"
        cd "$PLUGIN_SRC" && pnpm install
        ```
      </Tab>
    </Tabs>

    使用裸包遵循当前版本标签。仅当您需要可重复安装时才固定确切版本。检查安装的应用结果；请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

  </Step>
  <Step id="configure-provider-and-webhook" title="配置提供者和 webhook">
    在 `plugins.entries.voice-call.config` 下设置配置（参见 [Configuration](/plugins/voice-call/configuration)）。至少：`provider`、提供商凭据、`fromNumber` 和可公开访问的 Webhook URL。对于多个座席，还要将 `agentId` 设置为应拥有呼叫的座席。

    对于入站 Twilio 号码，使用方法 `POST` 将其 **Voice webhook** 设置为公共语音呼叫 webhook URL。将号码级别的**Status Callback**设置为与`?type=status`相同的URL，同样使用`POST`，以便终端呼入呼叫状态到达插件。

  </Step>
  <Step id="verify-setup" title="验证设置">
    ```bash
    openclaw voicecall setup
    openclaw voicecall setup --json
    ```

    检查插件启用、提供商凭据、Webhook 暴露、代理所有权，以及是否只有一种音频模式（`streaming` 或 `realtime`）处于活动状态。

  </Step>
  <Step id="smoke-test" title="冒烟测试">
    ```bash
    openclaw voicecall smoke
    openclaw voicecall smoke --to "+15555550123"
    ```

    默认情况下两者都是试运行。添加 `--yes` 可发起一通简短的外呼通知电话：

    ```bash
    openclaw voicecall smoke --to "+15555550123" --yes
    ```

  </Step>
</Steps>

<Warning>
对于 Twilio、Telnyx 和 Plivo，设置必须解析为一个 **可公开访问的 webhook URL**。 如果 `publicUrl`、隧道 URL、Tailscale URL 或 serve 回退解析到回环地址或私有网络空间，设置将失败，而不会启动一个无法接收运营商 webhook 的提供商。
</Warning>

## <a id="where-each-section-moved"></a> 各部分移动的地方

单页版本的每个部分现在都位于此页面或下面的五个子页面之一上。单页版本中的锚点仍然在这里解析。

### <a id="voice-call-configuration"></a> 语音通话配置

[语音呼叫配置](/plugins/voice-call/configuration) — 插件配置键、呼叫所有者、完整配置参考表和会话范围。

- <a id="configuration"></a>[配置](/plugins/voice-call/configuration#configuration)
- <a id="choose-the-call-owner"></a>[选择呼叫所有者](/plugins/voice-call/configuration#choose-the-call-owner)
- <a id="config-reference"></a>[配置参考](/plugins/voice-call/configuration#config-reference)
- <a id="provider-exposure-and-security-notes"></a>[提供商暴露和安全说明](/plugins/voice-call/configuration#provider-exposure-and-security-notes)
- <a id="streaming-connection-caps"></a>[流媒体连接帽](/plugins/voice-call/configuration#streaming-connection-caps)
- <a id="legacy-config-migrations"></a>[旧配置迁移](/plugins/voice-call/configuration#legacy-config-migrations)
- <a id="session-scope"></a>[会话范围](/plugins/voice-call/configuration#session-scope)

### <a id="voice-call-realtime-and-streaming"></a> 语音通话实时和流媒体

[语音呼叫实时和流媒体](/plugins/voice-call/realtime-and-streaming) — 全双工实时语音、挂机检测、工具和咨询策略、座席语音上下文和 Twilio 媒体流转录。

- <a id="realtime-voice-conversations"></a>[实时语音对话](/plugins/voice-call/realtime-and-streaming#realtime-voice-conversations)
- <a id="hangup-detection"></a>[挂机检测](/plugins/voice-call/realtime-and-streaming#hangup-detection)
- <a id="tool-policy"></a>[刀具政策](/plugins/voice-call/realtime-and-streaming#tool-policy)
- <a id="agent-voice-context"></a>[座席语音上下文](/plugins/voice-call/realtime-and-streaming#agent-voice-context)
- <a id="realtime-provider-examples"></a>[实时提供商示例](/plugins/voice-call/realtime-and-streaming#realtime-provider-examples)
- <a id="google-gemini-live"></a>[Google Gemini Live](/plugins/voice-call/realtime-and-streaming#google-gemini-live)
- <a id="openai"></a>[OpenAI实时示例](/plugins/voice-call/realtime-and-streaming#openai)
- <a id="streaming-transcription"></a>[流式转录](/plugins/voice-call/realtime-and-streaming#streaming-transcription)
- <a id="streaming-provider-examples"></a>[流媒体提供商示例](/plugins/voice-call/realtime-and-streaming#streaming-provider-examples)
- <a id="openai-2"></a>[OpenAI流示例](/plugins/voice-call/realtime-and-streaming#openai-2)
- <a id="xai"></a>[xAI](/plugins/voice-call/realtime-and-streaming#xai)

### <a id="voice-call-tts-and-inbound-calls"></a> 语音呼叫 TTS 和呼入呼叫

[语音呼叫 TTS 和入站呼叫](/plugins/voice-call/tts-and-inbound-calls) — 电话文本转语音、入站策略和按号码路由、语音输出合同、对话启动和过时呼叫收割机。

- <a id="tts-for-calls"></a>[TTS 用于通话](/plugins/voice-call/tts-and-inbound-calls#tts-for-calls)
- <a id="tts-examples"></a>[TTS 示例](/plugins/voice-call/tts-and-inbound-calls#tts-examples)
- <a id="core-tts-only"></a>[仅核心TTS](/plugins/voice-call/tts-and-inbound-calls#core-tts-only)
- <a id="override-to-elevenlabs-calls-only"></a>[覆盖至 ElevenLabs（仅调用）](/plugins/voice-call/tts-and-inbound-calls#override-to-elevenlabs-calls-only)
- <a id="openai-model-override-deep-merge"></a>[OpenAI模型覆盖（深度合并）](/plugins/voice-call/tts-and-inbound-calls#openai-model-override-deep-merge)
- <a id="inbound-calls"></a>[呼入电话](/plugins/voice-call/tts-and-inbound-calls#inbound-calls)
- <a id="per-number-routing"></a>[按号码路由](/plugins/voice-call/tts-and-inbound-calls#per-number-routing)
- <a id="spoken-output-contract"></a>[语音输出合约](/plugins/voice-call/tts-and-inbound-calls#spoken-output-contract)
- <a id="conversation-startup-behavior"></a>[会话启动行为](/plugins/voice-call/tts-and-inbound-calls#conversation-startup-behavior)
- <a id="twilio-stream-disconnect-grace"></a>[Twilio 流断开宽限](/plugins/voice-call/tts-and-inbound-calls#twilio-stream-disconnect-grace)
- <a id="stale-call-reaper"></a>[陈旧呼叫收割者](/plugins/voice-call/tts-and-inbound-calls#stale-call-reaper)

### <a id="voice-call-security-and-interfaces"></a> 语音通话安全和接口

[语音呼叫安全性和接口](/plugins/voice-call/security-and-interfaces) — Webhook 签名和转发标头安全性，以及 CLI、代理工具和网关 RPC 表面。

- <a id="webhook-security"></a>[Webhook 安全](/plugins/voice-call/security-and-interfaces#webhook-security)
- <a id="param-webhook-security-allowed-hosts"></a>[webhookSecurity.allowedHosts](/plugins/voice-call/security-and-interfaces#param-webhook-security-allowed-hosts)
- <a id="param-webhook-security-trust-forwarding-headers"></a>[webhookSecurity.trustForwardingHeaders](/plugins/voice-call/security-and-interfaces#param-webhook-security-trust-forwarding-headers)
- <a id="param-webhook-security-trusted-proxy-ips"></a>[webhookSecurity.trustedProxyIPs](/plugins/voice-call/security-and-interfaces#param-webhook-security-trusted-proxy-ips)
- <a id="cli"></a>[CLI](/plugins/voice-call/security-and-interfaces#cli)
- <a id="agent-tool"></a>[代理工具](/plugins/voice-call/security-and-interfaces#agent-tool)
- <a id="gateway-rpc"></a>[网关 RPC](/plugins/voice-call/security-and-interfaces#gateway-rpc)

### <a id="voice-call-troubleshooting"></a> 语音通话故障排除

[语音呼叫故障排除](/plugins/voice-call/troubleshooting) — 修复了设置、Webhook 暴露、凭据、签名验证、Google Meet 拨入和静默实时呼叫。

- <a id="troubleshooting"></a>[故障排除](/plugins/voice-call/troubleshooting#troubleshooting)
- <a id="call-placement-fails-to-save-its-initial-record"></a>[呼叫放置无法保存其初始记录](/plugins/voice-call/troubleshooting#call-placement-fails-to-save-its-initial-record)
- <a id="setup-fails-webhook-exposure"></a>[安装失败 webhook 暴露](/plugins/voice-call/troubleshooting#setup-fails-webhook-exposure)
- <a id="provider-credentials-fail"></a>[提供者凭据失败](/plugins/voice-call/troubleshooting#provider-credentials-fail)
- <a id="calls-start-but-provider-webhooks-do-not-arrive"></a>[呼叫开始但提供商 Webhooks 未到达](/plugins/voice-call/troubleshooting#calls-start-but-provider-webhooks-do-not-arrive)
- <a id="signature-verification-fails"></a>[签名验证失败](/plugins/voice-call/troubleshooting#signature-verification-fails)
- <a id="google-meet-twilio-joins-fail"></a>[Google Meet Twilio 加入失败](/plugins/voice-call/troubleshooting#google-meet-twilio-joins-fail)
- <a id="realtime-call-has-no-speech"></a>[实时通话无语音](/plugins/voice-call/troubleshooting#realtime-call-has-no-speech)

## <a id="related"></a> 相关内容

- [对话模式](/nodes/talk)
- [文本转语音](/tools/tts)
- [语音唤醒](/nodes/voicewake)
- [Google Meet 插件](/plugins/google-meet) - Meet 通话，包括通过语音通话委托的 Twilio 会话
- [`openclaw voicecall`](/cli/voicecall) - 插件提供的CLI命令，仅在安装此插件时出现
