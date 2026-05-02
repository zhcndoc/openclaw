---
summary: "Groq 设置（认证 + 模型选择）"
title: "Groq"
read_when:
  - 你想在 OpenClaw 中使用 Groq
  - 你需要 API 密钥环境变量或 CLI 认证方式的选择
---

[Groq](https://groq.com) 提供使用自定义 LPU 硬件的开源模型超高速推理
（Llama、Gemma、Mistral 等）。OpenClaw 通过其兼容 OpenAI 的 API 连接
到 Groq。

| Property | Value             |
| -------- | ----------------- |
| Provider | `groq`            |
| Auth     | `GROQ_API_KEY`    |
| API      | OpenAI-compatible |

## 开始使用

<Steps>
  <Step title="获取 API 密钥">
    在 [console.groq.com/keys](https://console.groq.com/keys) 创建 API 密钥。
  </Step>
  <Step title="设置 API 密钥">
    ```bash
    export GROQ_API_KEY="gsk_..."
    ```
  </Step>
  <Step title="设置默认模型">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "groq/llama-3.3-70b-versatile" },
        },
      },
    }
    ```
  </Step>
</Steps>

### 配置文件示例

```json5
{
  env: { GROQ_API_KEY: "gsk_..." },
  agents: {
    defaults: {
      model: { primary: "groq/llama-3.3-70b-versatile" },
    },
  },
}
```

## 内置目录

OpenClaw 自带一个基于 manifest 的 Groq 目录，用于快速按提供商筛选模型
列表。运行 `openclaw models list --all --provider groq` 查看内置
条目，或查看
[console.groq.com/docs/models](https://console.groq.com/docs/models)。

| Model                       | Notes                              |
| --------------------------- | ---------------------------------- |
| **Llama 3.3 70B Versatile** | 通用用途，大上下文     |
| **Llama 3.1 8B Instant**    | 快速、轻量                  |
| **Gemma 2 9B**              | 紧凑、高效                 |
| **Mixtral 8x7B**            | MoE 架构，推理能力强               |

<Tip>
使用 `openclaw models list --all --provider groq` 查看当前 OpenClaw 版本已知的、
基于 manifest 的 Groq 条目。
</Tip>

## 推理模型

OpenClaw 将其共享的 `/think` 等级映射到 Groq 特定模型的
`reasoning_effort` 值。对于 `qwen/qwen3-32b`，禁用思考会发送
`none`，启用思考会发送 `default`。对于 Groq GPT-OSS 推理模型，
OpenClaw 会发送 `low`、`medium` 或 `high`；禁用思考时会省略
`reasoning_effort`，因为这些模型不支持禁用值。

## 音频转录

Groq 也提供快速的基于 Whisper 的音频转录。作为一个
媒体理解提供商进行配置时，OpenClaw 使用 Groq 的 `whisper-large-v3-turbo`
模型，通过共享的 `tools.media.audio`
接口来转录语音消息。

```json5
{
  tools: {
    media: {
      audio: {
        models: [{ provider: "groq" }],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="音频转录详情">
    | Property | Value |
    |----------|-------|
    | Shared config path | `tools.media.audio` |
    | Default base URL   | `https://api.groq.com/openai/v1` |
    | Default model      | `whisper-large-v3-turbo` |
    | API endpoint       | OpenAI-compatible `/audio/transcriptions` |
  </Accordion>

  <Accordion title="环境说明">
    如果 Gateway 作为守护进程运行（launchd/systemd），请确保 `GROQ_API_KEY` 对
    该进程可用（例如，在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。

    <Warning>
    仅在交互式 shell 中设置的密钥对守护进程管理的 gateway 进程不可见。请使用
    `~/.openclaw/.env` 或 `env.shellEnv` 配置以确保持久可用。
    </Warning>

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    完整配置模式，包括提供商和音频设置。
  </Card>
  <Card title="Groq 控制台" href="https://console.groq.com" icon="arrow-up-right-from-square">
    Groq 仪表板、API 文档和定价。
  </Card>
  <Card title="Groq 模型列表" href="https://console.groq.com/docs/models" icon="list">
    官方 Groq 模型目录。
  </Card>
</CardGroup>
