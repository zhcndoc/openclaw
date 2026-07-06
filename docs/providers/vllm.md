---
summary: "使用 vLLM 运行 OpenClaw（兼容 OpenAI 的本地服务器）"
read_when:
  - 你想让 OpenClaw 连接到本地 vLLM 服务器
  - 你想使用自己的模型并提供 OpenAI 兼容的 /v1 端点
title: "vLLM"
---

vLLM 通过 **OpenAI 兼容** 的 HTTP API 提供开源（以及一些自定义）模型。OpenClaw 使用 `openai-completions` API 进行连接，并且当你使用 `VLLM_API_KEY` 选择启用时，可以**自动发现**模型。

| Property         | Value                                      |
| ---------------- | ------------------------------------------ |
| Provider ID      | `vllm`                                     |
| API              | `openai-completions` (OpenAI-compatible)   |
| Auth             | `VLLM_API_KEY` environment variable        |
| Default base URL | `http://127.0.0.1:8000/v1`                 |
| Streaming usage  | Supported (`stream_options.include_usage`) |

## 入门

<Steps>
  <Step title="使用 OpenAI 兼容服务器启动 vLLM">
    你的基础 URL 必须暴露 `/v1` 端点（`/v1/models`、`/v1/chat/completions`）。vLLM 通常运行在：

    ```text
    http://127.0.0.1:8000/v1
    ```

  </Step>
  <Step title="设置 API 密钥环境变量">
    如果你的服务器不强制认证，任何非空值都可以：

    ```bash
    export VLLM_API_KEY="vllm-local"
    ```

  </Step>
  <Step title="选择一个模型">
    替换为你 vLLM 中的某个模型 ID：

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

<Tip>
对于非交互式设置（CI、脚本），直接传入基础 URL、密钥和模型：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice vllm \
  --custom-base-url "http://127.0.0.1:8000/v1" \
  --custom-api-key "vllm-local" \
  --custom-model-id "your-model-id"
```

</Tip>

## 模型发现（隐式提供方）

当设置了 `VLLM_API_KEY`（或存在认证配置文件）且未定义 `models.providers.vllm` 时，OpenClaw 会查询 `GET http://127.0.0.1:8000/v1/models`，并将返回的 ID 转换为模型条目。

<Note>
如果你显式设置了 `models.providers.vllm`，OpenClaw 只会使用你声明的模型。将 `"vllm/*": {}` 添加到 `agents.defaults.models`，以让 OpenClaw 也查询该已配置提供方的 `/models` 端点，并包含所有已公布的 vLLM 模型。
</Note>

## 显式配置

当 vLLM 运行在不同的主机或端口上、你想固定 `contextWindow`/`maxTokens`、你的服务器需要真实的 API 密钥，或者你连接到受信任的回环、局域网或 Tailscale 端点时，请显式配置：

```json5
{
  models: {
    providers: {
      vllm: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "${VLLM_API_KEY}",
        api: "openai-completions",
        timeoutSeconds: 300, // 可选：为较慢的本地模型延长请求超时时间
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

为了让提供方保持动态而无需列出每个模型，请在可见模型目录中添加一个通配符：

```json5
{
  agents: {
    defaults: {
      models: {
        "vllm/*": {},
      },
    },
  },
}
```

## 高级配置

<AccordionGroup>
  <Accordion title="Proxy-style behavior">
    vLLM 被视为一种代理式、兼容 OpenAI 的 `/v1` 后端，而不是原生 OpenAI 端点：

    | 行为                                    | 是否应用？                       |
    | --------------------------------------- | -------------------------------- |
    | 原生 OpenAI 请求整形                   | 否                               |
    | `service_tier`                          | 不发送                           |
    | Responses `store`                      | 不发送                           |
    | Prompt-cache 提示                       | 不发送                           |
    | OpenAI reasoning-compat 载荷整形       | 不应用                           |
    | 隐藏的 OpenClaw 归属请求头              | 对自定义 base URL 不注入         |

  </Accordion>

  <Accordion title="Qwen thinking controls">
    对于 Qwen 模型，当服务器期望 Qwen chat-template kwargs 时，请在模型行上设置 `compat.thinkingFormat: "qwen-chat-template"`。这些模型提供一个二元 `/think` 配置文件（`off`、`on`），因为 Qwen chat-template 的 thinking 是一个开关，而不是 OpenAI 风格的 effort 级别。

    ```json5
    {
      models: {
        providers: {
          vllm: {
            models: [
              {
                id: "Qwen/Qwen3-8B",
                name: "Qwen3 8B",
                reasoning: true,
                compat: { thinkingFormat: "qwen-chat-template" },
              },
            ],
          },
        },
      },
    }
    ```

    OpenClaw 将 `/think off` 映射为：

    ```json
    {
      "chat_template_kwargs": {
        "enable_thinking": false,
        "preserve_thinking": true
      }
    }
    ```

    非 `off` 的 thinking 级别会发送 `enable_thinking: true`。如果你的端点期望的是 DashScope 风格的顶层标志，请使用 `compat.thinkingFormat: "qwen"`，以便在请求根部发送 `enable_thinking`。

  </Accordion>

  <Accordion title="Nemotron 3 thinking controls">
    对于启用 thinking 的 `vllm/nemotron-3-*` 模型，当 thinking 关闭时，内置插件会发送：

    ```json
    {
      "chat_template_kwargs": {
        "enable_thinking": false,
        "force_nonempty_content": true
      }
    }
    ```

    若要自定义这些值，请在模型参数下设置 `chat_template_kwargs`。如果你还设置了 `params.extra_body.chat_template_kwargs`，则该值会生效，因为 `extra_body` 是请求体中最后的覆盖项。

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

  <Accordion title="Qwen tool calls appear as text">
    首先确认 vLLM 是否使用了与模型匹配的正确 tool-call 解析器和 chat template 启动。vLLM 文档中，Qwen2.5 模型使用 `hermes`，Qwen3-Coder 模型使用 `qwen3_xml`。

    症状：skills/tools 从不执行，assistant 输出原始 JSON/XML，例如 `{"name":"read","arguments":...}`，或者当 OpenClaw 发送 `tool_choice: "auto"` 时，vLLM 返回空的 `tool_calls` 数组。

    某些 Qwen/vLLM 组合只有在请求使用 `tool_choice: "required"` 时才会返回结构化 tool call。可以通过 `params.extra_body` 为单个模型强制设置：

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

    将模型 id 替换为 `openclaw models list --provider vllm` 中的精确 id，或者通过 CLI 应用同样的覆盖：

    ```bash
    openclaw config set agents.defaults.models '{"vllm/Qwen-Qwen2.5-Coder-32B-Instruct":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
    ```

    这是一个可选的变通方案：它会强制每一轮带工具的交互都发起一次 tool call，所以只应在专用模型条目中使用，并且你能接受这种行为。不要将它设为所有 vLLM 模型的全局默认，也不要把它与会将任意 assistant 文本转换为可执行 tool call 的代理一起使用。

  </Accordion>

  <Accordion title="自定义 base URL">
    如果你的 vLLM 服务器运行在非默认主机或端口上，请在显式提供方配置中设置 `baseUrl`：

    ```json5
    {
      models: {
        providers: {
          vllm: {
            baseUrl: "http://192.168.1.50:9000/v1",
            apiKey: "${VLLM_API_KEY}",
            api: "openai-completions",
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

## 故障排查

<AccordionGroup>
  <Accordion title="Slow first response or remote server timeout">
    对于大型本地模型、远程局域网主机或 tailnet 链路，请设置提供方级别的请求超时：

    ```json5
    {
      models: {
        providers: {
          vllm: {
            baseUrl: "http://192.168.1.50:8000/v1",
            apiKey: "${VLLM_API_KEY}",
            api: "openai-completions",
            timeoutSeconds: 300,
            models: [{ id: "your-model-id", name: "Local vLLM Model" }],
          },
        },
      },
    }
    ```

    `timeoutSeconds` 仅适用于 vLLM 模型的 HTTP 请求：连接建立、响应头、正文流式传输，以及受保护的 fetch 总中止时间。它还会将该提供方的 LLM 空闲/流式看门狗上限提高到隐式约 120 秒默认值之上。优先使用此项，而不是增加 `agents.defaults.timeoutSeconds`，后者控制的是整个 agent 运行过程。

  </Accordion>

  <Accordion title="服务器不可达">
    检查 vLLM 服务器是否正在运行并可访问：

    ```bash
    curl http://127.0.0.1:8000/v1/models
    ```

    如果你看到连接错误，请验证主机、端口，以及 vLLM 是否以 OpenAI 兼容的服务器模式启动。OpenClaw 会信任在 loopback、局域网和 Tailscale 端点上，针对受保护模型请求所配置的精确 `models.providers.vllm.baseUrl` 源。元数据/链路本地来源在未显式选择加入时仍会被阻止。仅当 vLLM 请求必须到达另一个私有源时，才将 `models.providers.vllm.request.allowPrivateNetwork: true` 设为允许；若要退出对精确来源的信任，则设为 `false`。

  </Accordion>

  <Accordion title="请求出现认证错误">
    如果请求因认证错误失败，请设置一个与服务器配置匹配的真实 `VLLM_API_KEY`，或者在 `models.providers.vllm` 下显式配置提供方。

    <Tip>
    如果你的 vLLM 服务器不强制认证，那么 `VLLM_API_KEY` 的任何非空值都可作为 OpenClaw 的可选启用信号。
    </Tip>

  </Accordion>

  <Accordion title="未发现模型">
    自动发现需要设置 `VLLM_API_KEY`。如果你已经定义了 `models.providers.vllm`，除非 `agents.defaults.models` 包含 `"vllm/*": {}`，否则 OpenClaw 只会使用你声明的模型。
  </Accordion>

  <Accordion title="Tools render as raw text">
    如果某个 Qwen 模型输出 JSON/XML 工具语法而不是执行 skill：

    - 使用与该模型匹配的正确 parser/template 启动 vLLM。
    - 通过 `openclaw models list --provider vllm` 确认精确的模型 id。
    - 只有在 `tool_choice: "auto"` 仍然返回空的或仅文本的 tool call 时，才为该模型单独添加 `params.extra_body.tool_choice: "required"` 覆盖。

  </Accordion>
</AccordionGroup>

<Warning>
更多帮助：[故障排查](/help/troubleshooting) 和 [FAQ](/help/faq)。
</Warning>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用和故障切换行为。
  </Card>
  <Card title="OpenAI" href="/providers/openai" icon="bolt">
    原生 OpenAI 提供方和 OpenAI 兼容路由行为。
  </Card>
  <Card title="OAuth 和认证" href="/gateway/authentication" icon="key">
    认证细节和凭据复用规则。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    常见问题及其解决方法。
  </Card>
</CardGroup>