---
summary: "每通道音频格式、转码以及 Auto-TTS 发送的内容"
title: "文本转语音输出和 Auto-TTS 行为"
read_when:
  - "您需要通道接收的音频格式"
  - "您正在调试语音注释传送或转码"
  - "您想知道 Auto-TTS 何时总结或截断回复"
---

## <a id="output-formats"></a> 输出格式

TTS 语音投递由通道能力驱动。通道插件会声明语音风格的 TTS 是否应向提供方请求原生 `voice-note` 目标，还是保持普通 `audio-file` 合成，以及通道在发送前是否会对非原生输出进行转码。

来自代理工具和 `/tts` 命令的一次性语音请求使用与自动回复相同的通道传送规则。

Telegram 还宣传标题为 TTS 的最终作品。将 `tts.mode: "final"` 和 Auto-TTS 设置为 `always`（或符合条件的 `inbound` 模式）时，流式文本将保留到合成完成并作为语音注释字幕发送。超出 Telegram 字幕限制的文本将作为普通文本消息跟随语音注释。如果合成或经过验证的预发送传递步骤失败，OpenClaw 将改为发送可见文本。当回退发生在立即交付结果之后时，它会在同一回合的后续回复之前发生。缓冲发送直至轮次稳定的通道可能会在其缓冲回复后发送回退。 `tagged` 模式保持其正常的流媒体行为，并且 `[[tts:text]]` 块内的文本仍然仅是音频。

可见的标题及其文本后备保留代码块内的空白。

合成后，OpenClaw 会将批量 TTS 输出持久化到媒体存储中的 `tool-speech-synthesis` 下。回复使用该稳定的媒体路径，而不是提供方的临时文件，并且常规媒体维护会清理过期输出。 本地 CLI 提供方仍可能在 OpenClaw 导入已完成的字节数据之前，将 `{{OutputPath}}` 用作临时空间。参见[媒体播放](/nodes/media-playback)，了解内联播放器格式和限制。

| 目标                                | 格式                                                                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Feishu / Matrix / Telegram / WhatsApp | 语音注释回复优先选择 **Opus**（`opus_48000_64` 来自 ElevenLabs，`opus` 来自 OpenAI）。 48 kHz / 64 kbps 平衡清晰度和尺寸。 |
| 其他通道                        | **MP3**（ElevenLabs 使用 `mp3_44100_128`，OpenAI 使用 `mp3`）。44.1 kHz / 128 kbps 是语音的默认平衡。                  |
| Talk / 电话系统                      | 提供方原生 **PCM**（Inworld 22050 Hz，Google 24 kHz），或用于电话系统的 Gradium `ulaw_8000`。                                 |

按提供方说明：

- **Feishu / WhatsApp 转码：** 当语音注释回复为 MP3/WebM/WAV/M4A 或其他可能的音频文件时，通道插件将其转码为 48 kHz Ogg/Opus `ffmpeg`（`libopus`，64 kbps）在发送本机语音消息之前。 WhatsApp 通过 Baileys `audio` 有效负载与 `ptt: true` 和 `audio/ogg; codecs=opus` 发送结果。转码失败时：Feishu 捕获错误并退回到以普通附件形式发送原始文件； WhatsApp 没有回退功能，因此发送本身会失败，而不是发布不兼容的 PTT 有效负载。
- **MiniMax：**普通音频附件使用 MP3（`speech-2.8-hd` 模型，32 kHz 采样率）；对于通道声明的语音笔记目标，会使用 `ffmpeg` 转码为 48 kHz Opus。
- 默认为 **Xiaomi MiMo：** MP3，配置后为 WAV；使用 `ffmpeg` 转码为 48 kHz Opus，用于频道通告的语音注释目标。
- **本地 CLI：**使用配置的 `outputFormat`。语音笔记目标会转换为 Ogg/Opus，电话系统输出会使用 `ffmpeg` 转换为原始 16 kHz 单声道 PCM。
- **Google Gemini：** 返回原始 24 kHz PCM。对于音频附件，OpenClaw 将其包装为 WAV，对于语音注释目标，将其转码为 48 kHz Opus，并针对 Talk/telephony. 直接返回 PCM
- **Gradium：**音频附件使用 WAV，语音笔记目标使用 Opus，电话系统使用 8 kHz 的 `ulaw_8000`。
- **Inworld：** MP3 用于普通音频附件，本机 `OGG_OPUS` 用于语音注释目标，原始 `PCM`（22050 Hz）用于 Talk/telephony.
- **xAI：**默认使用 MP3；音频文件合成可对缓冲和流式输出使用 `mp3`、`wav`、`pcm`、`mulaw` 或 `alaw`。语音笔记目标对流式和缓冲回退都使用 MP3，因为 xAI 的 `pcm`、`mulaw` 和 `alaw` 输出是无头的原始音频。缓冲合成使用 xAI 的批量 REST `/v1/tts` 端点；`textToSpeechStream` 使用原生 `wss://api.x.ai/v1/tts`。这不是实时语音契约。不支持原生 Opus 语音笔记格式。
- **Microsoft：**使用 `microsoft.outputFormat`（默认 `audio-24khz-48kbitrate-mono-mp3`）。
  - 绑定的传输层接受 `outputFormat`，但并非所有格式都能从服务端获取。
  - 输出格式值遵循 Microsoft Speech 输出格式（包括 Ogg/WebM Opus）。
  - Telegram `sendVoice` 接受 OGG/MP3/M4A；如果您需要有保证的 Opus 语音消息，请使用 OpenAI/ElevenLabs。
  - 如果配置的 Microsoft 输出格式失败，OpenClaw 会重试 MP3。
  - 当未设置显式语音覆盖并使用默认英语语音时，如果回复文本为 CJK- 为主，OpenClaw 会自动切换到中文神经语音（`zh-CN-XiaoxiaoNeural`、`zh-CN` 语言环境）。

OpenAI 和 ElevenLabs 会按上表为各通道选择输出格式。显式的 OpenAI `responseFormat` 会覆盖该选择；不兼容语音笔记的格式可能会作为音频文件发送，或者由支持转换的通道进行转码。

## <a id="auto-tts-behavior"></a> Auto-TTS 行为

当启用 `tts.auto` 时，OpenClaw：

- 将终端斜杠和插件命令回复保留为纯文本，包括 `auto: "always"`。 `/tts audio` 和 `/tts latest` 等显式语音请求仍然发送音频。继续进入助理运行的命令将保留助理答案的正常自动 TTS 行为。
- 如果回复已经包含结构化媒体，则跳过 TTS。
- 跳过非常简短的回复（少于 10 个字符）。
- 跳过由隔离代码控制的回复；内联代码和周围的散文仍然有资格进行演讲。
- 在启用摘要时使用 `summaryModel`（或 `agents.defaults.model.primary`）总结长回复。摘要模型访问使用回复代理的凭据和所有权。
- 将生成的音频附加到回复中。
- 在 `mode: "final"` 下，流式文本完成后发送 TTS。没有带字幕最终消息支持的频道会收到一个仅包含音频的补充消息；Telegram 会将不超过其字幕限制的文本放入语音消息的字幕中，并将超出部分作为后续文本发送。生成的媒体会经过与普通回复附件相同的频道媒体规范化处理。

在 Control UI 中，延迟语音会附加到其原始答案，包括在重新加载之后。发布答案文本不会消耗其待处理的语音补充；最终消息工具回复保留其单独的传递保管。

如果回复超过 `maxLength`，OpenClaw 绝不会直接跳过音频：

- **开启摘要**（默认）且有可用的摘要模型：将文本摘要到大约 `maxLength` 个字符，然后合成该摘要。
- **关闭摘要**、摘要失败，或摘要模型没有可用的 API key：将文本截断为 `maxLength` 个字符，并合成截断后的文本。

```text
Reply -> TTS enabled?
  no  -> send text
  yes -> has media / short?
          yes -> send text
          no  -> length > limit?
                   no  -> TTS -> attach audio
                   yes -> summary enabled and available?
                            no  -> truncate -> TTS -> attach audio
                            yes -> summarize -> TTS -> attach audio
```
