---
summary: "Groq 设置（认证 + 模型选择 + Whisper 转录）"
title: "Groq"
read_when:
  - 你想在 OpenClaw 中使用 Groq
  - 你需要 API 密钥环境变量或 CLI 认证选项
  - 你正在配置 Groq 上的 Whisper 音频转录
---

[Groq](https://groq.com) 基于定制的 LPU 硬件，为开权重模型（Llama、Gemma、Kimi、Qwen、GPT OSS 等）提供超高速推理。Groq 插件同时注册了一个兼容 OpenAI 的聊天提供方和一个音频媒体理解提供方。

| Property               | Value                                    |
| ---------------------- | ---------------------------------------- |
| Provider id            | `groq`                                   |
| Plugin                 | 官方外部包                               |
| Auth env var           | `GROQ_API_KEY`                           |
| API                    | 兼容 OpenAI（`openai-completions`）       |
| Base URL               | `https://api.groq.com/openai/v1`         |
| Audio transcription    | `whisper-large-v3-turbo`（默认）          |
| Suggested chat default | `groq/llama-3.3-70b-versatile`           |

## 安装插件

安装官方插件，然后重启 Gateway：

```bash
openclaw plugins install @openclaw/groq-provider
openclaw gateway restart
```

## 入门

<Steps>
  <Step title="获取 API 密钥">
    在 [console.groq.com/keys](https://console.groq.com/keys) 创建 API 密钥。
  </Step>
  <Step title="设置 API 密钥">
    ```bash
export GROQ_API_KEY=gsk_...
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
  <Step title="验证目录是否可访问">
    ```bash
    openclaw models list --provider groq
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

OpenClaw 会随附一个由清单支持的 Groq 目录，其中既包含推理模型，也包含非推理模型。运行 `openclaw models list --provider groq` 可查看你已安装版本的静态条目，或查看 [console.groq.com/docs/models](https://console.groq.com/docs/models) 获取 Groq 的权威列表。

| 模型引用                                        | 名称                    | 推理      | 输入         | 上下文  |
| ------------------------------------------------ | ----------------------- | --------- | ------------ | ------- |
| `groq/llama-3.3-70b-versatile`                   | Llama 3.3 70B Versatile | 否        | 文本         | 131,072 |
| `groq/llama-3.1-8b-instant`                      | Llama 3.1 8B Instant    | 否        | 文本         | 131,072 |
| `groq/meta-llama/llama-4-scout-17b-16e-instruct` | Llama 4 Scout 17B       | 否        | 文本 + 图像 | 131,072 |
| `groq/openai/gpt-oss-120b`                       | GPT OSS 120B            | 是        | 文本         | 131,072 |
| `groq/openai/gpt-oss-20b`                        | GPT OSS 20B             | 是        | 文本         | 131,072 |
| `groq/openai/gpt-oss-safeguard-20b`              | Safety GPT OSS 20B      | 是        | 文本         | 131,072 |
| `groq/qwen/qwen3-32b`                            | Qwen3 32B               | 是        | 文本         | 131,072 |
| `groq/groq/compound`                             | Compound                | 是        | 文本         | 131,072 |
| `groq/groq/compound-mini`                        | Compound Mini           | 是        | 文本         | 131,072 |

<Tip>
  目录会随着每个 OpenClaw 版本演进。`openclaw models list --provider groq` 会显示你已安装版本已知的条目；请与 [console.groq.com/docs/models](https://console.groq.com/docs/models) 交叉核对新添加或已弃用的模型。
</Tip>

## 推理模型

Groq 推理模型（上表中的 `reasoning: true`）将 OpenClaw 共享的 `/think` 等级映射为 `reasoning_effort` 的 `low`、`medium` 或 `high` 值。`/think off` 或 `/think none` 会从请求中省略 `reasoning_effort`，而不是发送一个禁用值。

有关共享的 `/think` 等级以及 OpenClaw 如何针对每个提供方进行转换，请参阅 [思考模式](/tools/thinking)。

## 音频转录

Groq 插件还会注册一个 **音频媒体理解提供方**，因此语音消息可以通过共享的 `tools.media.audio` 接口进行转录。

| 属性             | 值                                        |
| ---------------- | ----------------------------------------- |
| 共享配置路径     | `tools.media.audio`                       |
| 默认基础 URL     | `https://api.groq.com/openai/v1`          |
| 默认模型         | `whisper-large-v3-turbo`                 |
| 自动优先级       | 20                                        |
| API 端点         | 兼容 OpenAI 的 `/audio/transcriptions`    |

要将 Groq 设为默认音频后端：

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
  <Accordion title="守护进程的环境可用性">
    如果 Gateway 作为受管服务运行（launchd、systemd、Docker），`GROQ_API_KEY` 必须对该进程可见——而不只是对你的交互式 shell 可见。

    <Warning>
      仅在交互式 shell 中导出的密钥对 launchd 或 systemd 守护进程没有帮助，除非该环境也被导入到那里。将密钥设置在 `~/.openclaw/.env` 中或通过 `env.shellEnv` 设置，以便网关进程可以读取。
    </Warning>

  </Accordion>

  <Accordion title="自定义 Groq 模型 id">
    OpenClaw 在运行时接受任意 Groq 模型 id。请使用 Groq 显示的精确 id，并在前面加上 `groq/`。静态目录覆盖常见情况；未收录的 id 会回退到默认的兼容 OpenAI 模板。

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "groq/<your-model-id>" },
        },
      },
    }
    ```

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型提供方" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用和故障转移行为。
  </Card>
  <Card title="思考模式" href="/tools/thinking" icon="brain">
    推理努力级别和提供方策略交互。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    完整配置架构，包括提供方和音频设置。
  </Card>
  <Card title="Groq 控制台" href="https://console.groq.com" icon="arrow-up-right-from-square">
    Groq 仪表板、API 文档和定价。
  </Card>
</CardGroup>