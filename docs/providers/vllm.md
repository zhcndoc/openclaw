---
summary: "使用 vLLM（兼容 OpenAI 的本地服务器）运行 OpenClaw"
read_when:
  - 你想对本地的 vLLM 服务器运行 OpenClaw
  - 你想用自己的模型实现兼容 OpenAI 的 /v1 端点
title: "vLLM"
---

vLLM 可通过 **兼容 OpenAI** 的 HTTP API 提供开源（以及某些自定义）模型。OpenClaw 使用 `openai-completions` API 连接到 vLLM。

当您通过 `VLLM_API_KEY` 选择加入（如果服务器不强制认证，任何值均可）且未定义显式的 `models.providers.vllm` 条目时，OpenClaw 还可以从 vLLM **自动发现**可用模型。

OpenClaw 将 `vllm` 视为本地兼容 OpenAI 的提供者，支持流式用量统计，因此状态/上下文令牌计数可以根据 `stream_options.include_usage` 响应更新。

| Property         | Value                                    |
| ---------------- | ---------------------------------------- |
| Provider ID      | `vllm`                                   |
| API              | `openai-completions` (兼容 OpenAI) |
| Auth             | `VLLM_API_KEY` 环境变量      |
| Default base URL | `http://127.0.0.1:8000/v1`               |

## 入门指南

<Steps>
  <Step title="启动带有兼容 OpenAI 服务器的 vLLM">
    您的基础 URL 应暴露 `/v1` 端点（例如 `/v1/models`、`/v1/chat/completions`）。vLLM 通常运行在：

    ```
    http://127.0.0.1:8000/v1
    ```

  </Step>
  <Step title="设置 API 密钥环境变量">
    如果服务器不强制认证，任何值均可：

    ```bash
    export VLLM_API_KEY="vllm-local"
    ```

  </Step>
  <Step title="选择模型">
    替换为您的某个 vLLM 模型 ID：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "vllm/your-model-id" },
        },
      },
    }
    ```

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider vllm
    ```
  </Step>
</Steps>

## 模型发现（隐式提供者）

当设置了 `VLLM_API_KEY`（或存在认证配置文件）且您**未**定义 `models.providers.vllm` 时，OpenClaw 会查询：

```
GET http://127.0.0.1:8000/v1/models
```

并将返回的 ID 转换为模型条目。

<Note>
如果您显式设置了 `models.providers.vllm`，将跳过自动发现，您必须手动定义模型。
</Note>

## 显式配置（手动模型）

显式配置适用于：

- vLLM 运行在不同的主机或端口上
- 您想固定 `contextWindow` 或 `maxTokens` 值
- 您的服务器需要真实的 API 密钥（或者您想控制 headers）

```json5
{
  models: {
    providers: {
      vllm: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "${VLLM_API_KEY}",
        api: "openai-completions",
        request: { allowPrivateNetwork: true },
        timeoutSeconds: 300, // 可选：为较慢的本地模型延长连接/头部/主体/请求超时时间
        models: [
          {
            id: "your-model-id",
            name: "本地 vLLM 模型",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## 高级配置

<AccordionGroup>
  <Accordion title="代理式行为">
    vLLM 被视为代理式的兼容 OpenAI `/v1` 后端，而不是原生 OpenAI 端点。这意味着：

    | 行为 | 是否应用？ |
    |----------|----------|
    | 原生 OpenAI 请求塑造 | 否 |
    | `service_tier` | 不发送 |
    | 响应 `store` | 不发送 |
    | 提示词缓存提示 | 不发送 |
    | OpenAI 推理兼容负载塑造 | 不应用 |
    | 隐藏的 OpenClaw 归属 headers | 不在自定义基础 URL 上注入 |

  </Accordion>

  <Accordion title="Qwen thinking 控制">
    对于通过 vLLM 提供的 Qwen 模型，当服务器期望 Qwen chat-template kwargs 时，请在模型条目上设置
    `params.qwenThinkingFormat: "chat-template"`。OpenClaw 会将 `/think off` 映射为：

    ```json
    {
      "chat_template_kwargs": {
        "enable_thinking": false,
        "preserve_thinking": true
      }
    }
    ```

    非 `off` 的 thinking 级别会发送 `enable_thinking: true`。如果您的端点
     अपे期的是 DashScope 风格的顶层标志，请改用
    `params.qwenThinkingFormat: "top-level"`，以在请求根部发送 `enable_thinking`。
    也支持蛇形命名的 `params.qwen_thinking_format`。

  </Accordion>

  <Accordion title="Nemotron 3 thinking 控制">
    vLLM/Nemotron 3 可以使用 chat-template kwargs 控制推理内容是作为隐藏推理还是可见答案文本返回。当 OpenClaw 会话
    使用 `vllm/nemotron-3-*` 且 thinking 关闭时，随附的 vLLM 插件会发送：

    ```json
    {
      "chat_template_kwargs": {
        "enable_thinking": false,
        "force_nonempty_content": true
      }
    }
    ```

    如需自定义这些值，请在模型参数下设置 `chat_template_kwargs`。
    如果您还设置了 `params.extra_body.chat_template_kwargs`，则该值具有
    最终优先级，因为 `extra_body` 是请求体中的最后一个覆盖项。

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "vllm/nemotron-3-super": {
              params: {
                chat_template_kwargs: {
                  enable_thinking: false,
                  force_nonempty_content: true,
                },
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Qwen 工具调用显示为文本">
    首先确保 vLLM 是使用适合该模型的正确工具调用解析器和 chat template 启动的。例如，vLLM 文档中为 Qwen2.5
    模型使用 `hermes`，为 Qwen3-Coder 模型使用 `qwen3_xml`。

    症状：

    - skills 或 tools 从不运行
    - 助手输出原始 JSON/XML，例如 `{"name":"read","arguments":...}`
    - 当 OpenClaw 发送 `tool_choice: "auto"` 时，vLLM 返回空的 `tool_calls` 数组

    某些 Qwen/vLLM 组合仅在请求使用 `tool_choice: "required"` 时才返回结构化工具调用。对于这些模型条目，请通过
    `params.extra_body` 强制使用与 OpenAI 兼容的请求字段：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "vllm/Qwen-Qwen2.5-Coder-32B-Instruct": {
              params: {
                extra_body: {
                  tool_choice: "required",
                },
              },
            },
          },
        },
      },
    }
    ```

    将 `Qwen-Qwen2.5-Coder-32B-Instruct` 替换为以下命令返回的精确 id：

    ```bash
    openclaw models list --provider vllm
    ```

    您也可以通过 CLI 应用相同的覆盖：

    ```bash
    openclaw config set agents.defaults.models '{"vllm/Qwen-Qwen2.5-Coder-32B-Instruct":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
    ```

    这是一种可选的兼容性变通方案。它会让每次带工具的模型轮次都要求一次工具调用，因此仅应在可接受该行为的专用本地模型条目上使用。
    不要将其作为所有 vLLM 模型的全局默认值，也不要使用会把任意助手文本盲目转换为可执行工具调用的代理。
  </Accordion>

  <Accordion title="自定义基础 URL">
    如果您的 vLLM 服务器运行在非默认主机或端口上，请在显式提供者配置中设置 `baseUrl`：

    ```json5
    {
      models: {
        providers: {
          vllm: {
            baseUrl: "http://192.168.1.50:9000/v1",
            apiKey: "${VLLM_API_KEY}",
            api: "openai-completions",
            request: { allowPrivateNetwork: true },
            timeoutSeconds: 300,
            models: [
              {
                id: "my-custom-model",
                name: "远程 vLLM 模型",
                reasoning: false,
                input: ["text"],
                contextWindow: 64000,
                maxTokens: 4096,
              },
            ],
          },
        },
      },
    }
    ```

  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="首个响应缓慢或远程服务器超时">
    对于大型本地模型、远程 LAN 主机或 tailnet 链路，请设置
    仅针对提供者的请求超时：

    ```json5
    {
      models: {
        providers: {
          vllm: {
            baseUrl: "http://192.168.1.50:8000/v1",
            apiKey: "${VLLM_API_KEY}",
            api: "openai-completions",
            request: { allowPrivateNetwork: true },
            timeoutSeconds: 300,
            models: [{ id: "your-model-id", name: "本地 vLLM 模型" }],
          },
        },
      },
    }
    ```

    `timeoutSeconds` 仅适用于 vLLM 模型的 HTTP 请求，包括
    连接建立、响应头、主体流式传输以及总的
    guarded-fetch 中止。优先使用此设置，而不是增加
    `agents.defaults.timeoutSeconds`，后者控制整个 agent 运行。

  </Accordion>

  <Accordion title="服务器不可达">
    检查 vLLM 服务器是否正在运行且可访问：

    ```bash
    curl http://127.0.0.1:8000/v1/models
    ```

    如果看到连接错误，请验证主机、端口，以及 vLLM 是否以兼容 OpenAI 的服务器模式启动。

  </Accordion>

  <Accordion title="请求上的认证错误">
    如果请求因认证错误而失败，设置一个与服务器配置匹配的真实 `VLLM_API_KEY`，或在 `models.providers.vllm` 下显式配置提供者。

    <Tip>
    如果您的 vLLM 服务器不强制认证，`VLLM_API_KEY` 的任何非空值均可作为 OpenClaw 的选择加入信号。
    </Tip>

  </Accordion>

  <Accordion title="未发现模型">
    自动发现需要设置 `VLLM_API_KEY` **且**没有显式的 `models.providers.vllm` 配置条目。如果您手动定义了提供者，OpenClaw 将跳过发现并仅使用您声明的模型。
  </Accordion>

  <Accordion title="Tools 显示为原始文本">
    如果某个 Qwen 模型输出 JSON/XML 工具语法而不是执行 skill，
    请查看上方高级配置中的 Qwen 指引。通常的修复方式是：

    - 使用该模型正确的解析器/template 启动 vLLM
    - 通过 `openclaw models list --provider vllm` 确认精确的模型 id
    - 仅在 `tool_choice: "auto"` 仍然返回空的或仅文本的
      tool calls 时，为该模型单独添加 `params.extra_body.tool_choice: "required"`
      覆盖

  </Accordion>
</AccordionGroup>

<Warning>
更多帮助：[故障排除](/help/troubleshooting) 和 [FAQ](/help/faq)。
</Warning>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供者、模型引用和故障转移行为。
  </Card>
  <Card title="OpenAI" href="/providers/openai" icon="bolt">
    原生 OpenAI 提供者和兼容 OpenAI 的路由行为。
  </Card>
  <Card title="OAuth 和认证" href="/gateway/authentication" icon="key">
    认证详情和凭据重用规则。
  </Card>
  <Card title="故障排除" href="/help/troubleshooting" icon="wrench">
    常见问题及其解决方法。
  </Card>
</CardGroup>