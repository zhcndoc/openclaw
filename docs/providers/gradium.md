---
summary: "在 OpenClaw 中使用 Gradium 文本转语音"
read_when:
  - "你想在文本转语音中使用 Gradium"
  - "你需要 Gradium API 密钥、语音或指令令牌配置"
title: "Gradium"
---

[Gradium](https://gradium.ai) 是 OpenClaw 的文本转语音提供商。它可生成标准音频回复（WAV）、兼容语音备注的 Opus 输出，以及用于电话场景的 8 kHz u-law 音频。

| 属性      | 值                                |
| ------------- | ------------------------------------ |
| 提供方 id   | `gradium`                            |
| 认证          | `GRADIUM_API_KEY` 或配置 `apiKey` |
| 基础 URL      | `https://api.gradium.ai`（默认）   |
| 默认语音 | `Emma` (`YTpq7expH9539ERJ`)          |

## <a id="install-plugin"></a> 安装插件

Gradium 是官方的外部插件。安装它：

```bash
openclaw plugins install @openclaw/gradium-speech
```

安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

## <a id="setup"></a> 设置

创建一个 Gradium API 密钥，然后通过环境变量或配置键将其暴露。配置优先于环境变量。

<Tabs>
  <Tab id="env-var" title="环境变量">
    ```bash
    export GRADIUM_API_KEY="<your-gradium-api-key>"
    ```
  </Tab>

  <Tab id="config-key" title="配置键">
    ```json5
    {
      tts: {
        auto: "always",
        provider: "gradium",
        providers: {
          gradium: {
            apiKey: "${GRADIUM_API_KEY}",
          },
        },
      },
    }
    ```
  </Tab>
</Tabs>

## <a id="config"></a> 配置

```json5
{
  tts: {
    auto: "always",
    provider: "gradium",
    providers: {
      gradium: {
        speakerVoiceId: "YTpq7expH9539ERJ",
        // apiKey: "${GRADIUM_API_KEY}",
        // baseUrl: "https://api.gradium.ai",
      },
    },
  },
}
```

| 键                                    | 类型   | 描述                                                                                             |
| -------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| `tts.providers.gradium.apiKey`         | 字符串 | 已解决 API 密钥。支持 `${ENV}` 和秘密引用。                                                    |
| `tts.providers.gradium.baseUrl`        | 字符串 | HTTPS Gradium API URL 在 `api.gradium.ai` 上。尾部斜杠被删除。默认`https://api.gradium.ai`。 |
| `tts.providers.gradium.speakerVoiceId` | 字符串 | 当不存在指令覆盖时使用默认语音 ID。                                            |

输出格式会根据目标平台自动选择（见 [输出](#output)），并且不能在 `openclaw.json` 中配置。

## <a id="voices"></a> 语音

| 名称               | 语音 ID           |
| ------------------ | ------------------ |
| 亚瑟             | `3jUdJyOi9pgbxBTK` |
| 克里斯蒂娜          | `2H4HY2CBNyJHBCrP` |
| Emma **(默认)** | `YTpq7expH9539ERJ` |
| 约翰               | `KWJiFWu2O9nMPYcR` |
| 肯特               | `LFZvm12tW_z0xfGo` |
| Sydney             | `jtEKaLYNn6iif5PR` |
| 蒂芙尼            | `Eu9iL_CYe8N-Gkx_` |

### <a id="per-message-voice-override"></a> 每条消息的语音覆盖

当活动语音策略允许语音覆盖时，使用指令令牌内联切换语音（其中任何一个都是等效的，都采用提供商本机语音 ID）：

```text
/voice:LFZvm12tW_z0xfGo
/voice_id:LFZvm12tW_z0xfGo
/voiceid:LFZvm12tW_z0xfGo
/gradium_voice:LFZvm12tW_z0xfGo
/gradiumvoice:LFZvm12tW_z0xfGo
```

如果语音策略禁用了语音覆盖，则该指令会被消费但忽略。

## <a id="output"></a> 输出

输出格式由目标端选择；提供方不会合成其他格式。

| 目标         | 格式      | 文件扩展名 | 采样率 | 语音兼容标志 |
| -------------- | ----------- | -------- | ----------- | --------------------- |
| 标准音频 | `wav`       | `.wav`   | 提供方    | no                    |
| 语音笔记     | `opus`      | `.opus`  | 提供方    | 是                   |
| 电话通信      | `ulaw_8000` | n/a      | 8千赫       | n/a                   |

## <a id="auto-select-order"></a> 自动选择顺序

在配置的TTS提供商中，Gradium的自动选择顺序是`30`。请参阅 [Text-to-Speech](/tools/tts)，了解 `tts.provider` 未固定时 OpenClaw 如何选择活动提供者。

## <a id="related"></a> 相关内容

- [文本到Speech](/tools/tts)
- [媒体 Overview](/tools/media-overview)
