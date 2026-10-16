---
summary: "Groq 设置（认证 + 模型选择 + Whisper 转录）"
title: "Groq"
read_when:
  - "您想要将 Groq 与 OpenClaw 一起使用"
  - "你需要 API 密钥环境变量或 CLI 认证选项"
  - "您正在 Groq 上配置 Whisper 音频转录"
---

[Groq](https://groq.com) 使用自定义功能对开放权重模型（Llama、Gemma、Kimi、Qwen、GPT OSS 等）提供超快速推理LPU 硬件。 Groq 插件注册了 OpenAI- 兼容的聊天提供程序和音频媒体理解提供程序。

| 属性               | 值                                    |
| ---------------------- | ---------------------------------------- |
| 提供方 id            | `groq`                                   |
| 插件                 | 官方外部包                |
| 认证环境变量           | `GROQ_API_KEY`                           |
| API                    | OpenAI-兼容（`openai-completions`） |
| 基础 URL               | `https://api.groq.com/openai/v1`         |
| 音频转录    | `whisper-large-v3-turbo`（默认）       |
| 建议的聊天默认模型 | `groq/openai/gpt-oss-120b`               |

## <a id="install-plugin"></a> 安装插件

安装官方插件：

```bash
openclaw plugins install @openclaw/groq-provider
```

安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="get-an-api-key" title="获取 API 密钥">
    在 [console.groq.com/keys](https://console.groq.com/keys). 创建 API 密钥
  </Step>
  <Step id="set-the-api-key" title="设置API密钥">
    ```bash
    export GROQ_API_KEY=gsk_...
    ```
  </Step>
  <Step id="set-a-default-model" title="设置默认模型">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "groq/openai/gpt-oss-120b" },
        },
      },
    }
    ```
  </Step>
  <Step id="verify-the-catalog-is-reachable" title="验证目录是否可达">
    ```bash
    openclaw models list --provider groq
    ```
  </Step>
</Steps>

### <a id="config-file-example"></a> 配置文件示例

```json5
{
  env: { vars: { GROQ_API_KEY: "gsk_..." } },
  agents: {
    defaults: {
      model: { primary: "groq/openai/gpt-oss-120b" },
    },
  },
}
```

## <a id="built-in-catalog"></a> 内置目录

OpenClaw 提供了清单支持的 Groq 推理模型目录。运行 `openclaw models list --provider groq` 查看您安装的版本的静态行，或检查 [console.groq.com/docs/models](https://console.groq.com/docs/models) 以获取 Groq 的权威列表。

| 模型引用                           | 名称               | 推理 | 输入 | 上下文 |
| ----------------------------------- | ------------------ | --------- | ----- | ------- |
| `groq/openai/gpt-oss-120b`          | GPT OSS 120B       | 是       | 文本  | 131,072 |
| `groq/openai/gpt-oss-20b`           | GPT OSS 20B        | 是       | 文本  | 131,072 |
| `groq/openai/gpt-oss-safeguard-20b` | 安全 GPT OSS 20B | 是       | 文本  | 131,072 |
| `groq/qwen/qwen3.6-27b`             | Qwen 3.6 27B       | 是       | 文本  | 131,072 |

<Tip>
  目录会随着每个 OpenClaw 版本演进。`openclaw models list --provider groq` 会显示你已安装版本已知的条目；请与 [console.groq.com/docs/models](https://console.groq.com/docs/models) 交叉核对新添加或已弃用的模型。
</Tip>

## <a id="reasoning-models"></a> 推理模型

Groq 的 GPT OSS 推理模型将 OpenClaw 的共享 `/think` 级别映射到 `low`、`medium` 或 `high` 的 `reasoning_effort` 值。 `/think off` 或 `/think none` 从这些请求中省略 `reasoning_effort`，而不是发送禁用值。

Qwen 3.6 27B 在 Groq 上仅是文本，并支持两种线推理模式。 `/think off` 或 `/think none` 发送 `reasoning_effort: "none"`；每个启用的级别都会发送 `"default"`。当在 Groq Qwen 模型上启用推理时，OpenClaw 会请求 `reasoning_format: "parsed"`，以便推理保留在思维块中，而不是可见的答案文本。此格式挂钩保持禁用推理和 GPT OSS 请求不变。

有关共享的 `/think` 等级以及 OpenClaw 如何针对每个提供方进行转换，请参阅 [思考模式](/tools/thinking)。

## <a id="audio-transcription"></a> 音频转录

Groq 插件还会注册一个 **音频媒体理解提供方**，因此语音消息可以通过共享的 `tools.media.audio` 接口进行转录。

| 属性          | 值                                     |
| ----------------- | ----------------------------------------- |
| 共享模型路径 | `tools.media.models`                      |
| 默认基础 URL  | `https://api.groq.com/openai/v1`          |
| 默认模型     | `whisper-large-v3-turbo`                  |
| 自动优先级     | 20                                        |
| API 端点      | OpenAI-兼容`/audio/transcriptions` |

要将 Groq 设为默认音频后端：

```json5
{
  tools: {
    media: {
      models: [{ provider: "groq", capabilities: ["audio"] }],
    },
  },
}
```

<AccordionGroup>
  <Accordion id="environment-availability-for-the-daemon" title="守护进程的环境可用性">
    如果网关作为受管服务运行（launchd、systemd、Docker），`GROQ_API_KEY` 必须对该进程可见——而不只是对你的交互式 shell 可见。

    <Warning>
      仅在交互式 shell 中导出的密钥不会对 launchd 或 systemd 守护进程有帮助，除非该环境也在那里导入。在 `~/.openclaw/.env` 中或通过 `env.shellEnv` 设置密钥，使其可从网关进程中读取。
    </Warning>

  </Accordion>

  <Accordion id="custom-groq-model-ids" title="自定义 Groq 模型 ID">
    OpenClaw 在运行时接受任何 Groq 模型 ID。使用 Groq 显示的确切 ID 并添加 `groq/` 前缀。静态目录涵盖了常见情况；未编目的 ID 会进入默认的 OpenAI- 兼容模板。

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

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="模型提供商" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="思维模式" href="/tools/thinking" icon="brain">
    推理努力水平和提供商-策略交互。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    完整配置架构，包括提供方和音频设置。
  </Card>
  <Card title="Groq 控制台" href="https://console.groq.com" icon="arrow-up-right-from-square">
    Groq 仪表板、API 文档和定价。
  </Card>
</CardGroup>
