---
summary: "将实时语音、电话和会议代码迁移到统一的 Talk 会话 API"
read_when:
  - "您维护实时语音、电话或会议插件"
  - "您正在移走已删除的 talk.realtime.*、talk.transcription.* 或 talk.handoff.* 方法"
title: "通话和实时语音迁移"
sidebarTitle: "说话和声音"
---

统一的 Talk 会话控制器、其支持的会话组合以及已删除的 Talk 系列的方法映射。 [Plugin SDK 迁移](/plugins/sdk-migration) 指南的一部分。

## <a id="talk-and-realtime-voice-migration"></a> Talk 与实时语音迁移

实时语音、电话、会议和浏览器Talk代码共享一个由`openclaw/plugin-sdk/realtime-voice`导出的Talk会话控制器。控制器拥有公共通话事件包络、活动轮次状态、捕获状态、输出音频状态、最近事件历史记录和陈旧轮次拒绝。提供商插件拥有特定于供应商的实时会话。浏览器会议插件使用 `openclaw/plugin-sdk/meeting-runtime` 进行会话、浏览器、音频、节点主机、代理咨询和语音呼叫机制，然后为 URL 规则、DOM 脚本、手动操作映射、字幕、创建和拨入计划实现 `MeetingPlatformAdapter`。平台 REST API、OAuth、工件、选择器和连线名称保留在插件中。浏览器权限计划接收请求的会议 URL，因此每个平台只能授予其确切支持的来源。在确认浏览器离开后，会话运行时还必须规范特定于平台的实时运行状况；历史记录字段可以保留，但字幕和音频准备状态在离开后不得保持活动状态。

所有内置界面都运行在共享控制器上：浏览器中继、托管房间交接、语音通话实时功能、语音通话流式 STT、Google Meet 实时功能以及原生按键通话。Gateway 在 `hello-ok.features.events` 中公布一个实时 Talk 事件通道：`talk.event`。

新代码不应直接调用 `createTalkEventSequencer(...)`，除非实现低级适配器或测试装置。使用共享控制器，以便在没有轮次 ID 的情况下无法发出轮次范围事件，陈旧的 `turnEnd` / `turnCancel` 呼叫无法清除较新的活动轮次，并且输出音频生命周期事件在电话、会议、浏览器中继、托管房间切换和本机 Talk 客户端之间保持一致。

公共 API 形式：

```typescript
// Gateway-owned Talk session API.
await gateway.request("talk.session.create", {
  mode: "realtime",
  transport: "gateway-relay",
  brain: "agent-consult",
  sessionKey: "main",
});
await gateway.request("talk.session.appendAudio", { sessionId, audioBase64 });
// Capture this before stopping playback from the active output `talk.event`.
const turnId = activeOutputTalkEvent.talkEvent.turnId;
await gateway.request("talk.session.cancelOutput", { sessionId, turnId, reason: "barge-in" });
await gateway.request("talk.session.submitToolResult", {
  sessionId,
  callId,
  result: { status: "working" },
  options: { willContinue: true },
});
await gateway.request("talk.session.submitToolResult", {
  sessionId,
  callId,
  result: { status: "already_delivered" },
  options: { suppressResponse: true },
});
await gateway.request("talk.session.submitToolResult", { sessionId, callId, result });
await gateway.request("talk.session.close", { sessionId });

// Client-owned provider session API.
await gateway.request("talk.client.create", {
  mode: "realtime",
  transport: "webrtc",
  brain: "agent-consult",
  sessionKey: "main",
});
await gateway.request("talk.client.toolCall", { sessionKey, callId, name, args });
await gateway.request("talk.client.steer", { sessionKey, text, mode: "steer" });
```

浏览器拥有的 WebRTC/provider-websocket 会话使用 `talk.client.create`，因为浏览器拥有提供商协商和媒体传输，而网关拥有凭证、指令和工具策略。 `talk.session.*` 是网关中继实时、网关中继转录和托管房间本机 STT/TTS 会话的通用网关管理表面。

将实时选择器放置在 `talk.provider` / `talk.providers` 旁边的旧配置应使用 `openclaw doctor --fix` 进行修复；运行时 Talk 不会将 speech/TTS 提供程序配置重新解释为实时提供程序配置。

受支持的 `talk.session.create` 组合刻意保持精简：

| 模式            | 传输方式       | 大脑           | 所有者              | 笔记                                                                                                              |
| --------------- | --------------- | --------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `realtime`      | `gateway-relay` | `agent-consult` | 网关            | 通过 Gateway 中继的全双工提供商音频；工具调用通过 agent-consult 工具路由。           |
| `transcription` | `gateway-relay` | `none`          | 网关            | 仅流式 STT；调用方发送输入音频并接收转录事件。                                        |
| `stt-tts`       | `managed-room`  | `agent-consult` | Native/client室 | 一键通和对讲机风格的房间，其中客户端拥有 capture/playback，网关拥有转弯状态。 |
| `stt-tts`       | `managed-room`  | `direct-tools`  | Native/client室 | 仅限管理员房间模式，适用于直接执行网关工具操作的受信任的第一方界面。                  |

供从旧版 `talk.realtime.*` / `talk.transcription.*` / `talk.handoff.*` 系列（现已全部移除）迁移的读者参考的方法映射：

| 老的                              | 新的                                                  |
| -------------------------------- | ---------------------------------------------------- |
| `talk.realtime.session`          | `talk.client.create`                                 |
| `talk.realtime.toolCall`         | `talk.client.toolCall`                               |
| `talk.realtime.relayAudio`       | `talk.session.appendAudio`                           |
| `talk.realtime.relayCancel`      | `talk.session.cancelOutput`                          |
| `talk.realtime.relayToolResult`  | `talk.session.submitToolResult`                      |
| `talk.realtime.relayStop`        | `talk.session.close`                                 |
| `talk.transcription.session`     | `talk.session.create({ mode: "transcription" })`     |
| `talk.transcription.relayAudio`  | `talk.session.appendAudio`                           |
| `talk.transcription.relayCancel` | `talk.session.close`                                 |
| `talk.transcription.relayStop`   | `talk.session.close`                                 |
| `talk.handoff.create`            | `talk.session.create({ transport: "managed-room" })` |
| `talk.handoff.revoke`            | `talk.session.close`                                 |

统一的控制词汇同样刻意保持精简：

| 方法                          | 适用于                                              | 契约                                                                                                                                                                                                                  |
| ------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `talk.session.appendAudio`      | `realtime/gateway-relay`, `transcription/gateway-relay` | 将一个 base64 PCM 音频块追加到由同一 Gateway 连接拥有的提供商会话中。                                                                                                                             |
| `talk.session.cancelOutput`     | `realtime/gateway-relay`                                | 停止助手音频输出，但不一定结束用户轮次。                                                                                                                                                     |
| `talk.session.submitToolResult` | `realtime/gateway-relay`                                | 在其桥接公开的任何异步完成之后完成提供商工具调用；传递 `options.willContinue` 以获取中间输出，或者在受支持时传递 `options.suppressResponse` 以避免另一个助手响应。 |
| `talk.session.steer`            | 由代理支持的 Talk 会话                              | 向从 Talk 会话解析的活动嵌入式运行发送语音 `status`、`steer`、`cancel` 或 `followup` 控制。                                                                                                 |
| `talk.session.close`            | 所有统一会话                                    | 停止中继会话或撤销托管房间状态，然后忘记统一会话 ID。                                                                                                                                     |

不要在核心中引入提供商或平台特殊情况来实现此目的。 Core 拥有 Talk 会话语义。提供商插件拥有自己的供应商会话设置。语音通话和 Google 认识自己的 telephony/meeting 适配器。浏览器和本机应用程序拥有设备 capture/playback UX。
