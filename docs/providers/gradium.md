---
summary: "在 OpenClaw 中使用 Gradium 文本转语音"
read_when:
  - 你想使用 Gradium 进行文本转语音
  - 你需要 Gradium API 密钥或语音配置
title: "Gradium"
---

Gradium 是 OpenClaw 的一个内置文本转语音提供商。它可以生成普通音频回复、兼容语音消息的 Opus 输出，以及用于电话场景的 8 kHz u-law 音频。

## 设置

创建一个 Gradium API 密钥，然后将其暴露给 OpenClaw：

```bash
export GRADIUM_API_KEY="gsk_..."
```

你也可以在配置中将密钥存储到 `messages.tts.providers.gradium.apiKey` 下。

## 配置

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "gradium",
      providers: {
        gradium: {
          voiceId: "YTpq7expH9539ERJ",
          // apiKey: "${GRADIUM_API_KEY}",
          // baseUrl: "https://api.gradium.ai",
        },
      },
    },
  },
}
```

## 语音

| 名称      | 语音 ID            |
| --------- | ------------------ |
| Emma      | `YTpq7expH9539ERJ` |
| Kent      | `LFZvm12tW_z0xfGo` |
| Tiffany   | `Eu9iL_CYe8N-Gkx_` |
| Christina | `2H4HY2CBNyJHBCrP` |
| Sydney    | `jtEKaLYNn6iif5PR` |
| John      | `KWJiFWu2O9nMPYcR` |
| Arthur    | `3jUdJyOi9pgbxBTK` |

默认语音：Emma。

## 输出

- 音频文件回复使用 WAV。
- 语音消息回复使用 Opus，并标记为兼容语音。
- 电话合成使用 8 kHz 的 `ulaw_8000`。

## 相关内容

- [文本转语音](/tools/tts)
- [媒体概览](/tools/media-overview)
