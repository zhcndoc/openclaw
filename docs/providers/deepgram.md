---
summary: "Deepgram 用于来访语音笔记的转录"
read_when:
  - 你想要对音频附件使用 Deepgram 语音转文本
  - 你需要一个简便的 Deepgram 配置示例
title: "Deepgram"
---

# Deepgram（音频转录）

Deepgram 是一个语音转文本 API。在 OpenClaw 中，它用于通过 `tools.media.audio` 进行**来访音频/语音笔记转录**。

启用后，OpenClaw 会将音频文件上传到 Deepgram，并将转录文本注入回复流程（`{{Transcript}}` + `[Audio]` 块）。这**不是流式处理**，而是使用预录音转录接口。

官网：[https://deepgram.com](https://deepgram.com)  
文档：[https://developers.deepgram.com](https://developers.deepgram.com)

## 快速开始

1. 设置你的 API 密钥：

```
DEEPGRAM_API_KEY=dg_...
```

2. 启用该服务提供者：

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "deepgram", model: "nova-3" }],
      },
    },
  },
}
```

## 选项

- `model`：Deepgram 模型 ID（默认：`nova-3`）
- `language`：语言提示（可选）
- `tools.media.audio.providerOptions.deepgram.detect_language`：启用语言检测（可选）
- `tools.media.audio.providerOptions.deepgram.punctuate`：启用标点添加（可选）
- `tools.media.audio.providerOptions.deepgram.smart_format`：启用智能格式化（可选）

带语言设置的示例：

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "deepgram", model: "nova-3", language: "en" }],
      },
    },
  },
}
```

带 Deepgram 选项的示例：

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        providerOptions: {
          deepgram: {
            detect_language: true,
            punctuate: true,
            smart_format: true,
          },
        },
        models: [{ provider: "deepgram", model: "nova-3" }],
      },
    },
  },
}
```

## 备注

- 认证遵循标准服务提供者认证顺序；`DEEPGRAM_API_KEY` 是最简单的方式。
- 使用代理时，可以通过 `tools.media.audio.baseUrl` 和 `tools.media.audio.headers` 来覆盖端点或请求头。
- 输出遵循与其他提供者相同的音频规则（大小限制、超时、转录文本注入）。
