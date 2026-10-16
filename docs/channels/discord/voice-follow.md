---
summary: "让机器人与选定的用户加入、移动和离开 Discord 语音通道"
read_when:
  - "配置 voice.followUsers 以便机器人在语音通道之间跟踪人员"
  - "调试跟随模式连接、插入或回显处理"
title: "使用 Discord 语音关注用户"
sidebarTitle: "通过语音关注用户"
---

跟随模式使机器人在 Discord 语音通道之间移动时跟踪选定的用户。

## <a id="follow-users-in-voice"></a> 语音关注用户

当您希望 Discord 语音机器人与一个或多个已知的 Discord 用户在一起，而不是在启动时加入固定频道或等待 `/vc join` 时，请使用 `voice.followUsers`。

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        followUsersEnabled: true,
        followUsers: ["discord:123456789012345678"],
        allowedChannels: [
          {
            guildId: "123456789012345678",
            channelId: "234567890123456789",
          },
        ],
      },
    },
  },
}
```

行为：

- `followUsers` 接受原始 Discord 用户 ID 和 `discord:<id>` 值。 OpenClaw 在匹配语音状态事件之前对两种形式进行标准化。
- 配置 `followUsers` 时，`followUsersEnabled` 默认为 `true`。设置为`false`，保留已保存的列表，但停止自动语音跟随。
- `followUsers` 只控制语音驻留。它不会授予发言者权限或所有者权限；请分别配置 `commands.ownerAllowFrom` 以及公会或频道的用户和角色。
- 当被跟随用户加入一个允许的语音频道时，OpenClaw 会加入该频道。当用户移动时，OpenClaw 也会随之移动。当当前被跟随用户断开连接时，OpenClaw 会离开。
- 如果同一公会中有多个被跟随用户，而当前活跃的被跟随用户离开，OpenClaw 会在离开公会前先移动到另一个被跟踪用户所在的频道。如果多个被跟随用户同时移动，则以最新观察到的语音状态事件为准。
- `allowedChannels` 仍然生效。位于不允许频道中的被跟随用户会被忽略，而一个跟随拥有的会话会移动到另一个被跟随用户那里，或者离开。
- OpenClaw 会在启动时以及以受限间隔校正遗漏的语音状态事件。校正会采样已配置的公会，并对每次运行的 REST 查询数量设上限，因此非常大的 `followUsers` 列表可能需要超过一个间隔才能收敛。
- 如果 Discord 或管理员在机器人跟随用户时移动了机器人，OpenClaw 会重建语音会话，并在目标位置允许时保留跟随所有权。如果机器人被移动到 `allowedChannels` 之外，OpenClaw 会离开，并在存在已配置目标时重新加入该目标。
- DAVE 接收恢复在连续解密失败后可能会离开并重新加入同一频道。跟随拥有的会话会在该恢复路径中保留其跟随所有权，因此稍后被跟随用户断开时仍会离开频道。

在加入模式之间选择：

- 对于个人或 operator 设置，如果希望机器人在你进入语音时自动跟随，就使用 `followUsers`。
- `autoJoin`用于固定房间。当机器人仅在人类位于该房间时才应出现时，请添加 `whenOccupied: true`；省略它以获得始终在线的语音状态。
- 对于一次性加入，或自动语音存在会让人意外的房间，就使用 `/vc join`。

Discord 语音编解码器：

- 语音接收日志会显示 `discord voice: opus decoder: libopus-wasm`。
- 实时播放使用相同的捆绑 `libopus-wasm` 包将原始 48 kHz 立体声 PCM 编码为 Opus，然后将数据包传递给 `@discordjs/voice`。
- File 和提供程序流播放使用 ffmpeg 转码为原始 48 kHz 立体声 PCM，然后使用 `libopus-wasm` 将 Opus 数据包流发送到 Discord。

STT 加 TTS 流水线：

- Discord PCM 捕获会转换为一个 WAV 临时文件。
- `tools.media.audio` 负责 STT，例如 `openai/gpt-4o-mini-transcribe`。
- 批量捕获遵循最大的适用[音频输入限制](/nodes/audio)，包括配置的模型和CLI回退。过大的捕获会停止并警告说较短的片段；部分音频未转录。此限制不会缓冲或截断直接实时流。
- 转写会通过 Discord ingress 和 routing 发送，而响应 LLM 会使用一个语音输出策略：隐藏 agent 的 `tts` 工具并要求返回文本，因为 Discord 语音负责最终的 TTS 播放。
- `voice.model` 在设置时，只会覆盖此语音频道轮次的响应 LLM。
- `voice.tts` 会覆盖合并到 `tts` 之上；支持流式的 provider 会直接把音频送给播放器，否则生成的音频文件会在已加入的频道中播放。

默认 agent-proxy 语音频道会话示例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        model: "openai/gpt-6-astra",
        followUsersEnabled: true,
        followUsers: ["123456789012345678"],
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2.1",
          speakerVoice: "cedar",
        },
      },
    },
  },
}
```

在没有 `voice.agentSession` 块时，每个语音频道都有自己的路由后 OpenClaw 会话。例如，`/vc join channel:234567890123456789` 会与该 Discord 语音频道对应的会话通信。实时模型只是语音前端；实质请求会交给配置好的 OpenClaw agent。如果实时模型在没有调用 consult 工具的情况下生成了最终转写，OpenClaw 会强制 consult 作为回退，因此默认行为仍然像是在与 agent 对话。

旧版 STT 加 TTS 示例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        mode: "stt-tts",
        model: "openai/gpt-5.4-mini",
        tts: {
          provider: "openai",
          providers: {
            openai: {
              model: "gpt-4o-mini-tts",
              speakerVoice: "cedar",
            },
          },
        },
      },
    },
  },
}
```

实时 bidi 示例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        mode: "bidi",
        model: "openai/gpt-6-astra",
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2.1",
          speakerVoice: "cedar",
          toolPolicy: "safe-read-only",
          consultPolicy: "always",
        },
      },
    },
  },
}
```

将语音作为现有 Discord 频道会话的扩展：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        mode: "agent-proxy",
        model: "openai/gpt-6-astra",
        agentSession: {
          mode: "target",
          target: "channel:123456789012345678",
        },
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2.1",
          speakerVoice: "cedar",
        },
      },
    },
  },
}
```

在 `agent-proxy` 模式下，机器人会加入配置的语音频道，但 OpenClaw agent 的轮次会使用目标频道的正常路由会话和 agent。实时语音会话会把返回结果重新播回语音频道。监督 agent 仍可根据其 tool policy 使用正常消息工具，包括在合适时发送单独的 Discord 消息。

在实时语音通话期间，要求客服人员列出可用的语音或切换到一种语音。 `talk_voice` 工具更改当前房间的语音并重新连接其实时提供商连接，同时保留 Discord 连接、对话和正在进行的座席工作。更换准备就绪后，代理确认变更。如果切换失败，OpenClaw 保留或恢复之前的语音。如果恢复也失败，会要求您重新加入语音；已接受的代理工作仍可完成。该选择适用于该房间中的后续扬声器，并持续到房间断开连接为止； `voice.realtime.speakerVoice` 仍然是未来调用的默认值。这需要所有者授权的语音转向、代理委派以及对 `talk_voice` 工具的访问。

通话中的更改需要提供商语音目录。 Google Live 支持相同的 `talk_voice` 流程：OpenClaw 打开与所选语音的新连接，并通过 Discord 呼叫保持未完成的座席工作。替换后等待发送的答案。已经提交到先前连接的响应可能会被交换机中断并且不会重播，从而避免重复语音。

当委派的 OpenClaw 运行处于活动状态时，命令授权的 Discord 对话记录在开始另一个座席轮流之前将被视为实时运行控制。诸如“状态”、“取消该”、“使用较小的修复”或“完成后还检查测试”之类的短语被分类为活动会话的状态、取消、转向或后续输入。状态、取消、接受的转向和后续结果都会通过语音通道讲回，以便呼叫者知道 OpenClaw 是否处理了请求。

当 OpenClaw 取消委托咨询时，Discord 记录取消而不是失败，并且不播放通用错误回退。匹配较晚的提供程序工具调用会收到相同的终端取消，而不是重新启动工作。语音会话仍可用于下一个请求；超时和真正的故障保持正常的错误处理。

有用的 target 形式：

- `target: "channel:123456789012345678"` 通过 Discord 文本频道会话路由。
- `target: "123456789012345678"` 会被视为频道目标。
- `target: "dm:123456789012345678"` 或 `target: "user:123456789012345678"` 通过该私信会话路由。

回声较重的 OpenAI Realtime 示例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        mode: "bidi",
        model: "openai/gpt-6-astra",
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2.1",
          speakerVoice: "cedar",
          bargeIn: true,
          minBargeInAudioEndMs: 500,
          consultPolicy: "always",
          providers: {
            openai: {
              interruptResponseOnInputAudio: false,
            },
          },
        },
      },
    },
  },
}
```

当模型通过打开的麦克风听到自己的 Discord 播放，但您仍然想通过说话来打断它时，请使用此功能。 OpenClaw 防止 OpenAI 在原始输入音频上自动中断，而 `bargeIn: true` 允许 Discord 扬声器启动事件和已经活动的扬声器音频在下一个捕获的回合到达 OpenAI 之前取消活动的实时响应。 `audioEndMs` 低于 `minBargeInAudioEndMs` 的非常早期的插入信号被视为可能的 echo/noise 并被忽略，因此模型不会在第一个播放帧处中断。

预期的语音日志：

- 加入时：`discord voice: joining ... voiceSession=... supervisorSession=... agentSessionMode=... voiceModel=... realtimeModel=...`
- realtime 开始时：`discord voice: realtime bridge starting ... autoRespond=false interruptResponse=false bargeIn=false minBargeInAudioEndMs=...`
- 有说话者音频时：`discord voice: realtime speaker turn opened ...`、`discord voice: realtime input audio started ... outputAudioMs=... outputActive=...`，以及 `discord voice: realtime speaker turn closed ... chunks=... discordBytes=... realtimeBytes=... interruptedPlayback=...`
- 跳过陈旧语音时：`discord voice: realtime forced agent consult skipped reason=incomplete-transcript ...` 或 `reason=non-actionable-closing ...`
- 实时响应完成时：`discord voice: realtime audio playback finishing reason=completed ... audioMs=... chunks=...`；在此行之后仍然可以播放缓冲的音频。
- 普通播放反压上：`discord voice: realtime audio playback buffering ... bufferedBytes=...`；当 Discord 耗尽缓冲音频时，播放继续。
- Discord 在使用 PCM 后确认范围内的提供者播放标记。 xAI 在开始以下响应之前等待这些确认；清除丢弃的音频不会将其报告为已播放。
- 播放 stop/reset： `discord voice: realtime audio playback stopped reason=... audioMs=... elapsedMs=... chunks=...`
- realtime consult 时：`discord voice: realtime consult requested ... voiceSession=... supervisorSession=... question=...`
- agent 答复时：`discord voice: agent turn answer ...`
- 排队的精确语音时：`discord voice: realtime exact speech queued ... queued=... outputAudioMs=... outputActive=...`，随后是 `discord voice: realtime exact speech dequeued reason=player-idle ...`
- 检测到 barge-in 时：`discord voice: realtime barge-in detected source=speaker-start ...` 或 `discord voice: realtime barge-in detected source=active-speaker-audio ...`，随后是 `discord voice: realtime barge-in requested reason=... outputAudioMs=... outputActive=...`
- realtime 中断时：`discord voice: realtime model interrupt requested client:response.cancel reason=barge-in`，随后会出现 `discord voice: realtime model audio truncated client:conversation.item.truncate reason=barge-in audioEndMs=...` 或 `discord voice: realtime model interrupt confirmed server:response.done status=cancelled ...`
- On 忽略 echo/noise： `discord voice: realtime model interrupt ignored client:conversation.item.truncate.skipped reason=barge-in audioEndMs=0 minAudioEndMs=250`
- 禁用打断：`discord voice: capture ignored: ... reason=protected playback`
- 空闲播放时：`discord voice: realtime barge-in ignored reason=... outputActive=false ... playbackChunks=0`

若要调试音频被截断，请按时间线阅读 realtime 语音日志：

1. `realtime audio playback started` 表示 Discord 已开始播放 assistant 音频。从此时起，bridge 开始统计 assistant 输出 chunk、Discord PCM 字节、provider realtime 字节以及合成音频时长。
2. `realtime speaker turn opened` 标记 Discord 中某个说话者变为活跃状态。如果播放已在进行且启用了 `bargeIn`，这之后可能会出现 `barge-in detected source=speaker-start`。
3. `realtime input audio started` 标记该说话者轮次收到的第一帧实际音频。这里若 `outputActive=true` 或 `outputAudioMs` 非零，表示麦克风在 assistant 播放仍然活跃时正在输入。
4. `barge-in detected source=active-speaker-audio` 表示 OpenClaw 在 assistant 播放活跃时看到实时说话者音频。这有助于区分真正的中断和只是 Discord 说话开始事件但没有有效音频的情况。
5. `barge-in requested reason=...` 表示 OpenClaw 要求实时提供者取消或截断主动响应。 `outputAudioMs`和`playbackChunks`描述生成的音频；随后的 `audioEndMs` 截断字段记录每个本机项目消耗的音频。 Discord 测量 AudioPlayer 准备的 Opus 数据包的本地消耗，粒度为 20 ms；它无法测量远程监听器的播放。
6. `realtime audio playback stopped reason=...` 是本地 Discord 播放复位点。 `player-idle`表示Discord已完成音频消费；仅提供者 `response.done` 和编码器完成并不意味着播放已完成。其他原因包括 `barge-in`、`provider-clear-audio`、`forced-agent-consult`、`stream-close`、`output-audio-overflow` 和 `session-close`。
7. `realtime speaker turn closed` 会总结捕获到的输入轮次。`chunks=0` 或 `hasAudio=false` 表示说话者轮次已打开，但没有可用音频到达 realtime bridge。`interruptedPlayback=true` 表示该输入轮次与 assistant 输出重叠并触发了 barge-in 逻辑。

有用字段：

- `outputAudioMs`：realtime provider 在该日志行之前生成的 assistant 音频时长。
- `audioMs`：OpenClaw 在播放停止前统计的 assistant 音频时长。
- `elapsedMs`：打开和关闭播放流或说话者轮次之间的墙钟时间。
- `discordBytes`：发送到或从 Discord voice 接收的 48 kHz 立体声 PCM 字节数。
- `realtimeBytes`：发送到或从 realtime provider 接收的 provider 格式 PCM 字节数。
- `playbackChunks`：当前响应转发到 Discord 的 assistant 音频 chunk 数。
- `sinceLastAudioMs`：最后一帧捕获到的说话者音频与说话者轮次关闭之间的间隔。

常见模式：

- 立即截断，且 `source=active-speaker-audio`、`outputAudioMs` 很小，并且附近是同一用户，通常说明扬声器回声进入了麦克风。可提高 `voice.realtime.minBargeInAudioEndMs`、降低扬声器音量、使用耳机，或设置 `voice.realtime.providers.openai.interruptResponseOnInputAudio: false`。
- `source=speaker-start` 后接 `speaker turn closed ... hasAudio=false`，表示 Discord 报告了说话开始，但没有音频到达 OpenClaw。这可能是临时的 Discord voice 事件、噪声门行为，或客户端短暂触发麦克风。
- `audio playback stopped reason=output-audio-overflow` 表示持续交付问题超出了有界的待处理音频队列。检查关联的 `Discord realtime audio playback overflow` 错误和前面的提供程序或 Discord 连接诊断；普通播放背压不应产生此错误。
- `Discord voice receive backlog exceeded` 表示身份查找、解码或本地磁盘无法跟上传入的音频。 OpenClaw 将每个接收流限制为 1,000 个待处理数据包和 1 MiB 编码音频；等瓶颈消除后再说话。其他发言者和任何已注册的捕获保持活动状态，不完整的语音不能成为新的对话命令。
- `conversation audio backlog exceeded`、`conversation is busy` 或 `conversation transcript limit exceeded` 表示已达到会话限制。录音继续；等待待处理的请求完成或重复较短的完整请求。
- `Discord voice recording backlog exceeded` 表示待处理的 WAV 文件已达到记录队列的块或字节限制。受影响的话语停止，并且在待处理的音频处理赶上后，注册的捕获仍然可用。
- `audio playback stopped reason=stream-close` 且附近没有 barge-in 或 `provider-clear-audio`，表示本地 Discord 播放流意外结束。请检查前面的 provider 和 Discord 播放器日志。
- `capture ignored: ... reason=protected playback` 表示 OpenClaw 在助理音频处于活动状态时故意保留对话输入。明确开始的捕获仍然记录该演讲。如果您希望语音中断播放，请启用 `voice.realtime.bargeIn`。
- `barge-in ignored ... outputActive=false` 表示 Discord 或 provider VAD 报告了语音，但 OpenClaw 没有可中断的活动播放。这不应导致音频被截断。

凭据按组件进行解析：`voice.model` 的 LLM 路由身份验证、`tools.media.audio` 的 STT 身份验证、`tts`/`voice.tts` 的 TTS 身份验证以及 `voice.realtime.providers` 或提供商的正常身份验证的实时提供商身份验证身份验证配置。
