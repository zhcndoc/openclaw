---
summary: "实时 Discord 语音通道、自动加入、实时模式和语音消息附件"
read_when:
  - "在Discord语音通道中建立实时语音对话"
  - "处理入站 Discord 语音邮件附件"
title: "Discord 语音通道"
sidebarTitle: "语音频道"
---

Discord 语音通道中的实时语音对话，以及单独的语音消息附件格式。

## <a id="voice"></a> 语音

Discord 有两个不同的语音界面：实时 **语音频道**（连续对话）和 **语音消息附件**（波形预览格式）。gateway 同时支持两者。

## <a id="voice-channels"></a> 语音通道

设置清单：

1. 在 Discord Developer Portal 中启用 Message Content Intent。
2. 当使用 role/user allowlist 时，启用 Server Members Intent。
3. 使用 `bot` 和 `applications.commands` scopes 邀请机器人。
4. 在目标 voice channel 中授予 Connect、Speak、Send Messages 和 Read Message History 权限。
5. 启用原生命令（`commands.native` 或 `channels.discord.commands.native`）。
6. 配置 `channels.discord.voice`。

使用 `/vc join|leave|status` 控制会话。该命令使用帐户默认代理，并遵循与其他 Discord 命令相同的白名单和组策略规则。在 Discord 消息框中（而不是在 shell 中）键入这些斜线命令：

```text
/vc join channel:<voice-channel-id>
/vc status
/vc leave
```

在加入前检查机器人有效权限：

```bash
openclaw channels capabilities --channel discord --target channel:<voice-channel-id>
```

自动加入示例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        model: "openai/gpt-6-astra",
        autoJoin: [
          {
            guildId: "123456789012345678",
            channelId: "234567890123456789",
            whenOccupied: true,
          },
        ],
        allowedChannels: [
          {
            guildId: "123456789012345678",
            channelId: "234567890123456789",
          },
        ],
        daveEncryption: true,
        decryptionFailureTolerance: 24,
        connectTimeoutMs: 30000,
        reconnectGraceMs: 15000,
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

### <a id="gpt-live-in-discord"></a> GPT-居住在Discord

Discord 可以使用与 Talk、[Google Meet](/plugins/google-meet) 和 [Voice Call](/plugins/voice-call) 相同的 GPT-Live 模型和语音。这些表面共享提供者分辨率、本机委托和中断策略，同时保留自己的音频传输。未固定的 Discord 配置保留提供程序的现有默认值；明确选择 GPT-Live。对于包含 `cove` 的 Codex GPT-Live 路由，请使用 `openclaw models auth login --provider openai` 登录，然后配置：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        realtime: {
          provider: "openai",
          model: "gpt-live-1-codex",
          speakerVoice: "cove",
        },
      },
    },
  },
}
```

该路由重用了 Talk 的 Gateway 拥有的 WebRTC 桥，首先使用 ChatGPT OAuth，然后使用 Platform API-key 进行后备。对于公共API，选择`gpt-live-1`以及支持的公共语音，例如`marin`； Discord 使用网关的直接平台密钥 WebSocket 桥。模型和语音必须属于同一路由：`cove` 是 Codex GPT-Live 语音，使用 `gpt-live-1` 选择它会回退到 `marin`。请参阅 [OpenAI 语音和语音](/providers/openai/voice-and-speech)。

GPT-Live拥有响应定时和中断。 Discord 播放连续音频而不等待完成响应事件，并且不添加本地扬声器启动中断。播放期间麦克风音频仍保持允许状态，因此 GPT-Live 可以自行听到并处理中断。委派任务使用路由的 OpenClaw 代理以及原始发言者的 Discord 身份和工具权限。房间控制在请求语音结果之前清除缓冲的本地播放；他们保持持续的提供者流开放，以便它可以提供结果。网关连续调节麦克风输入，包括扬声器捕获之间的静音。播放可在活动流中保留安静的 PCM，包括在先前的语音已播放后发出的暂停。当玩家的两秒空闲宽限内没有未听到的语音时，已接受的音频会在房间玩家被释放之前耗尽。在该退休期间到达的语音会在新资源下排队，因此不会与旧流一起丢弃。连续播放会构建​​ 120 毫秒的启动缓冲区，以吸收短暂的传输间隙。 120 毫秒的启动截止时间可防止简短回复等待已完成的响应事件。

GPT-Live 不支持主机强制唤醒名称门控或每次回复前的强制咨询。它的默认设置使这些政策无效。显式 `requireWakeName: true` 或 `consultPolicy: "always"` 在启动时失败并出现配置错误；当您需要在共享会议中由主持人控制轮流时，请删除这些设置或选择 `gpt-realtime-2.1`。每个扬声器仍然具有单独的语音模型连接； OpenClaw 代理对话提供共享房间上下文。

注意：

- 下面的 OpenAI `agent-proxy` 响应和唤醒名称策略需要 GA 实时模型，例如 `gpt-realtime-2.1`。 GPT-Live 遵循上述提供商拥有的响应和委托流程。
- 对于仅文本配置，Discord voice 默认是可选启用的；设置 `channels.discord.voice.enabled=true`（或保留现有的 `channels.discord.voice` 块）即可启用 `/vc` 命令、语音运行时以及 `GuildVoiceStates` 网关 intent。`channels.discord.intents.voiceStates` 可以显式覆盖 intent 订阅；若留空，则跟随实际生效的语音启用状态。
- `voice.mode` 控制对话路径。默认值是 `agent-proxy`：一个实时语音前端负责处理轮次时机、中断和播放，通过 `openclaw_agent_consult` 将实质性工作委派给路由后的 OpenClaw agent，并将结果视为来自该说话者的 Discord 文字提示。`stt-tts` 保留旧的批处理 STT + TTS 流程。`bidi` 让实时模型直接对话，同时通过 `openclaw_agent_consult` 暴露 OpenClaw 大脑。
- 实时语音将每个发言者的音频保持在单独的提供商连接中，因此延迟的转录和工具调用保留该发言者的 Discord 身份。每个人仍然使用相同的路由 OpenClaw 座席对话和一个房间播放队列。直接`bidi`通话记录属于每个发言者的实时连接；使用 OpenClaw 代理咨询共享房间历史记录。多个发言者可能会消耗更多的提供商连接，并且提供商帐户限制仍然适用。房间最多保留八个扬声器连接，并在捕获、请求和播放完成后回收空闲连接。
- `voice.agentSession` 控制 OpenClaw 会话接收语音轮流。对于语音通道自己的会话，将其保留为未设置，或者设置 `{ mode: "target", target: "channel:<text-channel-id>" }` 以使语音通道充当现有 Discord 文本通道会话（例如 `#maintainers`）的 microphone/speaker 扩展。
- 当实时语音呼叫结束且客服回复仍在运行时，回复将在该语音通道的内置文本聊天中完成。 `voice.agentSession.target` 不会更改此目标。显式取消任务不会带来任何结果。如果语音文本不可用或机器人缺乏发帖权限，OpenClaw 会记录警告并删除回复；它永远不会将其重定向到另一个频道。
- 从 Discord 语音控制正在运行的代理需要一个可以在调度时重新检查发言者权限的后端。 Copilot 目前缺少此 [ 保护输入能力 ](/plugins/sdk-agent-harness/attempt-runtime#guarded-active-run-injection)；状态和取消仍然可用，您可以发起新的请求。
- `voice.model` 覆盖 OpenClaw 代理大脑以进行 Discord 语音响应和实时咨询。保留其未设置以继承路由代理模型。它与 `voice.realtime.model` 是分开的。
- `voice.followUsers` 允许机器人加入、移动 Discord 语音以及与选定的用户留下语音。请参阅 [ 以语音方式关注用户 ](/channels/discord/voice-follow#follow-users-in-voice)。
- `agent-proxy` 通过 `discord-voice` 路由语音，这保留了对发言者和目标会话的正常 owner/tool 授权，但隐藏代理 `tts` 工具，因为 Discord 语音拥有播放功能。默认情况下，`agent-proxy` 为咨询者提供所有者扬声器 （`voice.realtime.toolPolicy: "owner"`） 的完整所有者等效工具访问权限。具有主机控制转弯的模型强烈更喜欢在得到实质性答案之前咨询 OpenClaw 代理 （`voice.realtime.consultPolicy: "always"`）； GPT-Live 使用提供商拥有的委托与 `consultPolicy: "auto"`。 `always`模式下，实时层在查询答案之前不会自动说出填充词；它捕获并转录语音，然后说出路由的 OpenClaw 答案。如果在 Discord 仍在播放第一个答案时完成多个强制咨询答案，则稍后的精确语音答案将排队直到播放空闲，而不是替换句子中间的语音。
- 当 Discord 播放暂时落后并容忍短暂的提供商或网络间隙时， 实时语音缓冲生成的音频。每个提供者响应都保留自己的缓冲音频，包括本机工具延续。正常的背压不会取消响应，排队的答案会等到 Discord 完成播放前一个答案，即使其提供者响应或音频编码器已经完成。
- GA OpenAI 实时和 xAI 中断会按消耗的 Discord 量截断每个保留的本机音频项目。排队的项目将被丢弃为零，而已完成播放的完整回复将保持不变。在同一响应中，播放进度会出现暂时的间隙； GA OpenAI Realtime 的回声防护使用保留项目的组合消耗持续时间。 GPT-Live 本机处理中断，不使用项目截断。
- 如果某个扬声器的实时连接失败，其他扬声器仍保持连接。检查 `realtime speaker failed` 日志并尝试再次说话以打开新连接。如果在 `/vc join` 期间初始提供商连接失败，则加入失败，而已连接的录像机继续录制；检查 `realtime session failed terminally` 日志并重试 `/vc join`。临时提供商重新连接不会结束 Discord 语音会话。
- 在 `stt-tts` 模式下，STT 使用 `tools.media.audio`；`voice.model` 不影响转录。
- `stt-tts` 回复保持有效，直到 Discord 播放完毕为止；长响应不会因固定的一分钟播放期限而中断。
- 在实时模式下，`voice.realtime.provider`、`voice.realtime.model` 和 `voice.realtime.speakerVoice` 配置实时音频会话。对于 OpenAI 实时 2.1 加上 Codex 大脑，请使用 `voice.realtime.model: "gpt-realtime-2.1"` 和 `voice.model: "openai/gpt-6-astra"`。
- 实时语音模式使用主机的共享代理上下文解析器（如果可用）。它告诉模型，它代表具有多个会话的 OpenClaw 代理，并且默认情况下包含小型 `IDENTITY.md`、`USER.md` 和 `SOUL.md` 配置文件，因此快速直接转向可保持与路由代理相同的身份、用户基础和角色。将 `voice.realtime.bootstrapContextFiles` 设置为子集以自定义配置文件，或设置 `[]` 以忽略它们，同时保留代理上下文段落。在 OpenClaw 2026.9.6 上，插件保留该主机的仅配置文件上下文行为； `[]` 省略了上下文，并且较新的多会话段落不可用。两个路径都使用主机的引导挂钩和工作区访问。此设置仅支持那些配置文件； `AGENTS.md` 保留在正常代理上下文中。注入的配置文件上下文不会取代 `openclaw_agent_consult` 的工作区工作、当前事实、内存查找或工具支持的操作。
- 在 OpenAI `agent-proxy` 实时模式下，唤醒名称选通默认情况下会适应房间：一个人可以在没有唤醒名称的情况下自然地说话，而两个或更多人必须以一个名称开始或结束一轮。其他机器人不算人。将 `voice.realtime.requireWakeName: true` 设置为始终需要唤醒名称，或将 `false` 设置为从不需要唤醒名称。配置的唤醒名称必须是一两个单词。如果未设置 `voice.realtime.wakeNames`，则 OpenClaw 使用路由代理 `name` 加 `OpenClaw`，回退到代理 ID 加 `OpenClaw`。活动的唤醒名称门会禁用实时提供商自动响应，通过 OpenClaw 代理咨询路径路由接受的轮流，并在最终转录到达之前从部分转录中识别出确切的前导唤醒名称时给出简短的口头确认。模糊名称匹配会等待最终的文字记录，因此未完成的普通单词不会触发确认。该策略遵循实时加入和离开，无需重新连接语音。
- OpenAI 实时提供程序接受当前 Realtime 2 事件名称和旧版 Codex- 兼容别名用于输出音频和转录事件，因此兼容的提供程序快照可以漂移而不会丢失助理音频。
- 对于基于响应的模型，`voice.realtime.bargeIn` 控制可听麦克风输入是否中断活动实时播放。仅静默数据包和扬声器启动通知不会中断它。如果未设置，它将遵循实时提供商的输入音频中断设置。 GPT-Live 忽略此设置，因为它拥有中断。
- `voice.realtime.minBargeInAudioEndMs` 控制 GA OpenAI 实时插入截断音频之前的最短助理播放持续时间。默认值：`250`。设置 `0` 以在低回声房间中立即中断，或将其调高以进行回声较重的扬声器设置。不适用于 GPT-Live。
- `voice.tts` 覆盖 `tts` 仅适用于 `stt-tts` 语音播放；实时模式使用 `voice.realtime.speakerVoice` 代替。对于 Discord 播放中的 OpenAI 语音，请设置 `voice.tts.provider: "openai"` 并在 `voice.tts.providers.openai.speakerVoice` 下选择文本转语音语音。 `cedar` 是当前 OpenAI TTS 模型的一个听起来阳刚的好选择。
- 按频道的 Discord `systemPrompt` 覆盖会应用于该语音频道的语音转录轮次。
- 当 OpenClaw 加入语音频道时，路由后的 agent 会话会收到一个带有当前参与者名单的静默系统事件。之后参与者的加入和离开会更新该会话，但不会触发非请求式的口头回复；Discord 显示名称被视为不可信标签。授权的语音轮次也会接收到新的参与者名单快照。
- 语音转录轮次和 `/vc` 命令使用 `commands.ownerAllowFrom` 中的 Discord 条目来判断 owner 状态。当未配置 Discord 命令 owner 时，所选 Discord 账号的 `allowFrom`（或旧的 `dm.allowFrom`）仍可授权语音访问，但不会授予 owner 状态。Agent 工具可见性遵循所路由会话配置的工具策略。
- 授权发言者可以使用 `talk_voice` 要求座席列出或更改当前实时呼叫的语音，无需命令所有者配置。此更改适用于共享房间，并保持保存的语音默认值不变。语音控制仍然与允许的回合绑定，并在呼叫结束、回合完成或取消或其访问策略更改时停止；其他仅供所有者使用的工具保留其通常的权限。
- 取消或撤销的语音轮次不会作为新的座席请求重试。离开可防止待处理的批次轮流开始代理工作或语音合成。已经运行的工作可以完成；转录记录是单独管理的。
- 如果 `voice.autoJoin` 中同一个 guild 有多个条目，OpenClaw 会加入该 guild 最后配置的频道。
- 其他成员的语音状态更新不会覆盖机器人的语音通道、静音或聋哑设置。这些更新仍然会推动参与者名册、基于占用情况的自动加入和关注用户行为。
- `voice.autoJoin[].whenOccupied` 默认为 `false`。对于自动管理的房间，将其设置为 `true`，该房间应仅在至少有一个人在场时才包含机器人。 OpenClaw 在第一个人到达时加入，并在最后一个人离开后离开； OpenClaw 机器人和其他机器人不计算在内。启动、新的网关会话和恢复的网关会话与 Discord 的语音状态名册进行协调。
- 占用管理仅拥有其加入的会话。当配置的房间清空时，手动 `/vc join`、独立的仅转录会话、跟随用户会话、另一个频道中的活动会话或其他临时加入不会移动或断开连接。将转录捕获附加到占用管理的会话可以保留该所有权。
- `voice.allowedChannels` 是可选的驻留 allowlist。保持未设置可允许 `/vc join` 加入任意已授权的 Discord 语音频道。设置后，`/vc join`、启动时自动加入以及机器人语音状态移动都将限制为列表中的 `{ guildId, channelId }` 条目。将其设为空数组可拒绝所有 Discord 语音加入。如果 Discord 将机器人移动到 allowlist 之外，OpenClaw 会离开该频道，并在可用时重新加入配置的自动加入目标。
- `voice.daveEncryption` 和 `voice.decryptionFailureTolerance` 会透传给 `@discordjs/voice` 的 join 选项；上游默认值为 `daveEncryption=true` 和 `decryptionFailureTolerance=24`。
- OpenClaw 使用捆绑的 `libopus-wasm` 编解码器进行 Discord 语音接收和实时原始 PCM 播放。它提供了固定的 libopus WebAssembly 版本，不需要本机 opus 插件。 Discord 语音套接字、编解码器、播放转换和数据包定速在工作线程中运行。 GPT-Live 连续输出直接从其媒体工作器传输到 Discord 播放工作器，而不是通过网关事件循环中继每个音频块。演讲者准入、代理工作和成绩单保留在网关上；繁忙的网关仍然会延迟这些控制操作。
- DAVE 的本机加密池在第一次成员身份重新生成密钥时为每个 CPU 初始化一个 Rayon 线程，并且在 JavaScript 工作线程计数之外。运营商可以通过在网关服务环境中设置`RAYON_NUM_THREADS`进行绑定； OpenClaw 未设置此变量。该限制也适用于继承该环境的子进程。
- `voice.connectTimeoutMs` 控制初始 `@discordjs/voice` 就绪等待 `/vc join` 和自动加入尝试。默认值：`30000`。
- `voice.reconnectGraceMs` 控制 OpenClaw 在销毁断开连接的语音会话前，会等待其开始重连的时长。默认值：`15000`。
- 在 `stt-tts` 模式下，语音播放不会因为另一个用户开始说话而停止。为了避免反馈循环，OpenClaw 在 TTS 播放时不允许新的对话轮次；明确开始的捕获仍然记录该演讲。下一个对话轮次播放结束后讲话。当启用中断时，基于响应的实时模型接收可听授权麦克风输入作为打断信号； GPT-Live 自行处理传入的音频。
- 在 GA OpenAI 实时中，从扬声器到打开的麦克风的回声看起来像是插入并中断播放。对于回声较多的 Discord 房间，设置 `voice.realtime.providers.openai.interruptResponseOnInputAudio: false` 以防止提供商自动中断输入音频。如果您仍希望听到 Discord 麦克风输入来中断活动播放，请添加 `voice.realtime.bargeIn: true`。 GA OpenAI 实时桥会忽略比 `voice.realtime.minBargeInAudioEndMs` 短的播放截断，就像 echo/noise 一样，并将它们记录为已跳过，而不是清除 Discord 播放。这些控件不会覆盖 GPT-Live 的本机中断。
- `voice.captureSilenceGraceMs` 控制 OpenClaw 在 Discord 报告说话者停止后，等待多久再为 STT 完成该音频片段。默认值：`2000`；如果 Discord 将正常停顿切分成碎片化的部分转录，可适当调高。
- 当 ElevenLabs 是所选的 TTS provider 时，Discord 语音播放会使用流式 TTS，并从 provider 的响应流开始播放。不支持流式的 provider 会回退到合成的临时文件路径。
- OpenClaw手表接收解密失败并在短窗口内重复失败后由leaving/rejoining自动恢复语音通道。
- 如果接收日志在更新后持续出现 `DecryptionFailed(UnencryptedWhenPassthroughDisabled)`，请收集依赖报告和日志。捆绑的 `@discordjs/voice` 版本包含 discord.js PR #11449 中的上游 padding 修复，该修复关闭了 discord.js issue #11419。
- 出现 `The operation was aborted` 的接收事件是 OpenClaw 完成某个已捕获的说话者片段时的预期行为；它们是详细诊断信息，不是警告。
- 详细的 Discord 语音日志会为每个被接受的说话者片段提供一个有边界的单行 STT 转录预览，因此调试时可以同时看到用户端和 agent 回复端，而不会倾倒无限制的转录文本。
- 在 `agent-proxy` 模式下，强制咨询回退会跳过可能不完整的转录片段，例如以 `...` 结尾的文本或“and”等尾随连接器，以及完整的不可操作的结束语，如“我马上回来”或“再见”。提及结束的请求，例如“写一封告别电子邮件”，仍然会到达代理。关闭检测使用有界英语启发式；无法识别的措辞继续向代理发送。当这可以防止过时的排队答案时，日志会显示 `forced agent consult skipped reason=...`。

## <a id="voice-messages"></a> 语音消息

Discord 语音消息会显示波形预览，并要求 OGG/Opus 音频。OpenClaw 会自动生成波形，但需要 gateway 主机上的 `ffmpeg` 和 `ffprobe` 来检查和转换。

- 提供**本地文件路径**（URL被拒绝）。
- 省略文本内容（Discord 会拒绝同一 payload 中同时包含文本和语音消息）。
- 接受任意音频格式；OpenClaw 会按需转换为 OGG/Opus。

代理使用 `message` 工具而不是从 shell 发送语音消息：

```text
message(action="send", channel="discord", target="channel:123", path="/path/to/audio.mp3", asVoice=true)
```
