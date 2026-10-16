---
summary: "macOS 通话覆盖行为和流式实时网关中继路径"
read_when:
  - "在 macOS 上使用 Talk"
  - "在 Mac 上启用实时网关中继"
  - "诊断无法启动的实时会话"
title: "谈macOS和网关继电器"
sidebarTitle: "macOS 和网关继电器"
---

## <a id="behavior-(macos)"></a><a id="behavior-macos"></a> 行为（macOS）

- 在 Talk 模式启用时始终显示覆盖层。
- **倾听 &rarr; 思考 &rarr; 说话** 阶段转换。
- 阶段通知是尽力而为的：失败的更新不会启动本地网关或重新启动其隧道。开始通话会保留正常的连接恢复。
- 在短暂停顿（静默窗口）时，当前转录内容会被发送。
- 回复会写入 WebChat（与输入相同）。
- Talk 观察接受的代理运行，直到网关报告完成，然后说出该运行的完整答复。缓慢的本地模型不会使单独的应用程序端响应窗口过期。停止仍然可以防止延迟播放。
- **语音打断**（默认开启）：如果用户在助手说话时开口，播放会停止，并记录打断时间戳供下一个提示使用。

## <a id="realtime-talk-over-the-gateway-relay-(macos)"></a><a id="realtime-talk-over-the-gateway-relay-macos"></a> 通过网关中继进行实时通话 （macOS）

macOS 默认为上面的本机路径：Apple 语音识别、网关聊天和 `talk.speak` 播放。仅当 `talk.realtime` 同时选择所有这三个时，它才会切换到流式实时会话：

| 键         | 所需值  |
| ----------- | --------------- |
| `mode`      | `realtime`      |
| `transport` | `gateway-relay` |
| `brain`     | `agent-consult` |

任何其他组合（包括部分设置的组合）都会保留本机路径。

```json5
{
  talk: {
    realtime: {
      provider: "openai",
      providers: {
        openai: {
          model: "gpt-realtime-2.1",
          speakerVoice: "cedar",
        },
      },
      mode: "realtime",
      transport: "gateway-relay",
      brain: "agent-consult",
    },
  },
}
```

Mac 还必须通过 **设置 > 语音和通话 > 使用实时网关中继** 在本地选择加入。此首选项默认关闭并保留在该 Mac 上；单独的网关配置永远不会激活流路径。保留 `transport: "webrtc"` 用于浏览器或 iOS 客户端拥有的会话；仅当配置明确选择 `gateway-relay` 时，macOS 才使用继电器。

网关还必须为 `talk.catalog` 中选定的提供商通告 `gateway-relay` 和 `agent-consult`。实时需要macOS 26或更高版本，匹配语音唤醒；在旧版本上，通话和语音唤醒控件不可用。

在 Apple 客户端上，中继播放将保持活动状态，直到设备完成排队的音频，而不是估计持续时间到期。完成后会出现播放确认。回合制提供商保留设备路由麦克风回声抑制和本地语音中断。在 iPhone 上，当内置扬声器或接收器上开始会话时，麦克风和中继播放与语音处理共享一个音频引擎，因此回声消除功能也会使扬声器上的麦克风保持打开状态，并且本地语音中断会在那里工作。在耳机上启动的会话保留单独的引擎，无需语音处理。如果语音处理不可用，内置扬声器会在播放期间回退到抑制麦克风输入。 GPT Live 等连续提供者在播放期间保持麦克风输入打开，并自行处理语音中断。 Apple 客户端使用所选提供商的 `talk.catalog` 功能；如果目录访问不可用，他们会将语音中断留给提供商。

显式停止 GPT 实时输出会结束语音会话。 Apple 客户端保留该停止而不是自动重新连接。在 macOS 上，暂停会使 Talk 暂停；如果提供者关闭了暂停的会话，则恢复将启动一个新的会话。普通连接失败仍然使用下面的恢复路径。使用耳机以避免扬声器音频反馈到开放的麦克风中。

### <a id="when-realtime-cannot-start"></a> 实时无法启动时

说话永远不会闲着。如果中继无法启动（无网关路由、拒绝的凭据或不受支持的模型），则会记录失败，覆盖层会显示原因，并且 Talk 会回退到该会话的本机语音路径。

一旦会话运行，断开的中继就会按照有限重试计划重新连接（大约 0.5 秒，然后 2 秒）。如果这些尝试都用尽，覆盖层会报告 `Realtime disconnected repeatedly — using native speech`，并且下一次启动会绕过实时。如果在会话中丢失麦克风，则会关闭中继并采取相同的路线。

继电器输出取消是回合范围的。客户端从 `talk.event` 音频包络复制当前的 `turnId`。匹配的 ID 返回 `applied`，过时的 ID 返回 `stale`，没有活动回合的会话返回 `idle`。省略 `turnId` 的旧客户端仍会取消当前回合：

```json
{
  "method": "talk.session.cancelOutput",
  "params": {
    "sessionId": "relay-session-id",
    "turnId": "turn-7",
    "reason": "barge-in"
  }
}
```
