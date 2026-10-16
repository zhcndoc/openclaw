---
summary: "打开文本转语音、选择提供商并发送第一个音频回复"
title: "文本转语音快速入门"
read_when:
  - "您是第一次启用文本转语音"
  - "您需要支持的语音提供商及其身份验证环境变量的列表"
  - "您想通过聊天确认 TTS 是否有效"
---

## <a id="quick-start"></a> 快速开始

<Steps>
  <Step id="pick-a-provider" title="选择提供商">
    OpenAI 和 ElevenLabs 是最可靠的托管选项。Microsoft 和 Local CLI 无需 API 密钥。请查看 [提供商矩阵](#supported-providers) 获取完整列表。
  </Step>
  <Step id="set-the-api-key" title="设置API密钥">
    为你的提供商导出环境变量（例如 `OPENAI_API_KEY`、 `ELEVENLABS_API_KEY`）。Microsoft 和 Local CLI 不需要密钥。
  </Step>
  <Step id="enable-in-config" title="在配置中启用">
    设置 `tts.auto: "always"` 和 `tts.provider`：

    ```json5
    {
      tts: {
        auto: "always",
        provider: "elevenlabs",
      },
    }
    ```

  </Step>
  <Step id="try-it-in-chat" title="在聊天中尝试一下">
    `/tts status` 会显示当前状态。`/tts audio Hello from OpenClaw` 会发送一次性的音频回复。
  </Step>
</Steps>

<Note>
默认情况下，自动 TTS 为 **off**。当 `tts.provider` 未设置时，OpenClaw 将选择注册表自动选择顺序中第一个配置的提供程序。内置 `tts` 代理工具仅具有明确意图：除非用户请求音频、使用 `/tts` 或启用 Auto-TTS/directive 语音，否则普通聊天将保持文本状态。

当通道必须将提供商的音频转换为 Ogg/Opus. 时，Feishu 和 WhatsApp 语音注释需要网关主机上的 `ffmpeg` 已兼容的音频会跳过此转换。如果转换失败，Feishu 将原始音频作为文件附件发送； WhatsApp 发送失败。转码规则参见[TTS输出](/tools/tts/output)。
</Note>

## <a id="supported-providers"></a> 支持的提供商

| 提供者          | 认证                                                                                                             | 笔记                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Azure Speech**  | `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION`（也支持 `AZURE_SPEECH_API_KEY`、`SPEECH_KEY`、`SPEECH_REGION`）          | 原生 Ogg/Opus 语音消息输出和电话功能。                                         |
| **DeepInfra**     | `DEEPINFRA_API_KEY`                                                                                              | OpenAI-兼容TTS。默认为 `hexgrad/Kokoro-82M`。                                 |
| **ElevenLabs**    | `ELEVENLABS_API_KEY` 或 `XI_API_KEY`                                                                             | 语音克隆，多语言，可通过 `seed` 重复；用于 Discord 语音播放的流式传输。 |
| **Fish Audio**    | `FISH_API_KEY` 或 `FISH_AUDIO_API_KEY`                                                                           | 托管式 S2.1 TTS、表现力标签、语音发现、流式传输和电话功能。             |
| **Google Gemini** | `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`                                                                             | Gemini API TTS；选择加入 Gemini 3.8，其中角色风格是元数据，而不是语音文本。  |
| **Gradium**       | `GRADIUM_API_KEY`                                                                                                | 语音消息和电话输出。                                                         |
| **Inworld**       | `INWORLD_API_KEY`                                                                                                | 流式 TTS API。原生 Opus 语音消息和 PCM 电话功能。                             |
| **本地 CLI**     | 无                                                                                                             | 运行配置的本地 TTS 命令。                                                     |
| **Microsoft**     | 无                                                                                                             | 通过 `node-edge-tts` 提供公开的 Edge 神经网络 TTS。尽力而为，不提供 SLA。                         |
| **MiniMax**       | `MINIMAX_API_KEY`（或 Token 方案：`MINIMAX_OAUTH_TOKEN`、`MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY`）      | T2A v2 API。默认为 `speech-2.8-hd`。                                                 |
| **OpenAI**        | `OPENAI_API_KEY`                                                                                                 | 也用于自动摘要；支持 persona `instructions`。                             |
| **OpenRouter**    | `OPENROUTER_API_KEY`（可复用 `models.providers.openrouter.apiKey`）                                            | 默认模型为 `hexgrad/kokoro-82m`。                                                      |
| **Volcengine**    | `VOLCENGINE_TTS_API_KEY` 或 `BYTEPLUS_SEED_SPEECH_API_KEY`（旧版 AppID/token：`VOLCENGINE_TTS_APPID`/`_TOKEN`） | BytePlus 种子演讲 HTTP API。                                                           |
| **Vydra**         | `VYDRA_API_KEY`                                                                                                  | 共享的图像、视频和语音提供商。                                                |
| **xAI**           | `XAI_API_KEY`                                                                                                    | xAI 批次 TTS。本机 Opus 语音注释是 **不支持**。                              |
| **Xiaomi MiMo**   | `XIAOMI_API_KEY`                                                                                                 | 通过小米聊天补全使用 MiMo TTS。                                                |

如果配置了多个提供商，将首先使用当前选中的那个，其余作为回退选项。自动摘要使用 `summaryModel`（或 `agents.defaults.model.primary`），因此如果你保持摘要功能开启，该提供商也必须已完成认证。

<Warning>
捆绑的 **Microsoft** 提供程序通过 `node-edge-tts` 使用 Microsoft Edge 的在线神经 TTS 服务。它是一个公共 Web 服务，没有发布的 SLA 或配额 - 将其视为尽力而为。旧提供程序 ID `edge` 标准化为 `microsoft`，并且 `openclaw doctor --fix` 重写持久配置；新配置应始终使用 `microsoft`。语音合成连接`api.msedgeservices.com`，语音发现使用`speech.platform.bing.com`；具有出站主机名白名单的部署必须允许两者。
</Warning>
