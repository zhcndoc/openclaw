---
summary: "使用 vLLM 运行 OpenClaw（兼容 OpenAI 的本地服务器）"
read_when:
  - 你想让 OpenClaw 连接到本地 vLLM 服务器
  - 你想使用自己的模型并提供 OpenAI 兼容的 /v1 端点
title: "vLLM"
---

vLLM 可以通过 **OpenAI 兼容** 的 HTTP API 提供开源（以及某些自定义）模型。OpenClaw 使用 `openai-completions` API 连接到 vLLM。

OpenClaw 也可以在你启用 `VLLM_API_KEY` 时从 vLLM **自动发现** 可用模型（如果你的服务器不强制认证，任何值都可以）。当你还配置了自定义 vLLM base URL 时，在 `agents.defaults.models` 中使用 `vllm/*` 可以让发现保持动态。

OpenClaw 将 `vllm` 视为一个支持流式使用量统计的本地 OpenAI 兼容提供方，因此状态/上下文 token 计数可以从 `stream_options.include_usage` 响应中更新。

| 属性             | 值                                       |
| ---------------- | ---------------------------------------- |
| Provider ID      | `vllm`                                   |
| API              | `openai-completions`（OpenAI 兼容）       |
| Auth             | `VLLM_API_KEY` 环境变量                  |
| 默认 base URL    | `http://127.0.0.1:8000/v1`               |

## 入门

<Steps>
  <Step title="使用 OpenAI 兼容服务器启动 vLLM">
    你的 base URL 应该暴露 `/v1` 端点（例如 `/v1/models`、`/v1/chat/completions`）。vLLM 通常运行在：

    ```
    http://127.0.0.1:8000/v1
    ```

  </Step>
  <Step title="设置 API key 环境变量">
    如果你的服务器不强制认证，任何值都可以：

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

## 模型发现（隐式提供方）

当设置了 `VLLM_API_KEY`（或存在认证配置文件）并且你**没有**定义 `models.providers.vllm` 时，OpenClaw 会查询：

```
GET http://127.0.0.1:8000/v1/models
```

并将返回的 ID 转换为模型条目。

<Note>
如果你显式设置了 `models.providers.vllm`，OpenClaw 默认会使用你声明的模型。当你希望 OpenClaw 查询该已配置提供方的 `/models` 端点并包含所有已发布的 vLLM 模型时，请在 `agents.defaults.models` 中添加 `"vllm/*": {}`。
</Note>

## 显式配置（手动模型）

在以下情况使用显式配置：

- vLLM 运行在不同的主机或端口上
- 你想固定 `contextWindow` 或 `maxTokens` 的值
- 你的服务器需要真实的 API key（或你想控制请求头）
- 你连接到受信任的 loopback、LAN 或 Tailscale vLLM 端点

```json5
{
  models: {
    providers: {
      vllm: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "${VLLM_API_KEY}",
        api: "openai-completions",
        timeoutSeconds: 300, // 可选：为速度较慢的本地模型延长连接/响应头/正文/请求超时
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

如果你想在不手动列出每个模型的情况下保持该提供方的动态性，请将提供方通配符添加到可见模型目录中：

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
  <Accordion title="代理式行为">
    vLLM 被视为一个代理式的 OpenAI 兼容 `/v1` 后端，而不是原生
    OpenAI 端点。这意味着：

    | 行为 | 是否应用？ |
    |----------|----------|
    | 原生 OpenAI 请求整形 | 否 |
    | `service_tier` | 不发送 |
    | Responses `store` | 不发送 |
    | 提示缓存提示 | 不发送 |
    | OpenAI reasoning 兼容有效载荷整形 | 不应用 |
    | 隐藏的 OpenClaw 归因请求头 | 不会在自定义 base URL 上注入 |

  </Accordion>

  <Accordion title="Qwen thinking controls">
    对于通过 vLLM 提供的 Qwen 模型，当服务器期望 Qwen chat-template kwargs 时，请在已配置的提供方模型行上设置 `compat.thinkingFormat: "qwen-chat-template"`。按这种方式配置的模型会暴露二元 `/think` 配置文件（`off`、`on`），因为 Qwen 模板思考是一个开/关请求标志，而不是类似 OpenAI 的 effort 档位。

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

    非 `off` 的思考级别会发送 `enable_thinking: true`。如果你的端点
    期望的是 DashScope 风格的顶层标志，请改用
    `compat.thinkingFormat: "qwen"` 在请求根部发送 `enable_thinking`。

  </Accordion>

  <Accordion title="Nemotron 3 思考控制">
    vLLM/Nemotron 3 可以使用 chat-template kwargs 控制推理是以隐藏推理还是可见答案文本返回。当 OpenClaw 会话
    使用带思考关闭的 `vllm/nemotron-3-*` 时，内置的 vLLM 插件会发送：

    ```json
    {
      "chat_template_kwargs": {
        "enable_thinking": false,
        "force_nonempty_content": true
      }
    }
    ```

    如需自定义这些值，请在模型参数下设置 `chat_template_kwargs`。
    如果你还设置了 `params.extra_body.chat_template_kwargs`，那么该值将拥有
    最终优先级，因为 `extra_body` 是最后一个请求体覆盖项。

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
    先确保 vLLM 使用了适合该模型的正确工具调用解析器和 chat
    template。例如，vLLM 文档中为 Qwen2.5
    模型使用 `hermes`，为 Qwen3-Coder 模型使用 `qwen3_xml`。

    症状：

    - skills 或 tools 从不运行
    - 助手打印原始 JSON/XML，例如 `{"name":"read","arguments":...}`
    - 当 OpenClaw 发送 `tool_choice: "auto"` 时，vLLM 返回空的 `tool_calls` 数组

    某些 Qwen/vLLM 组合只有在
    请求使用 `tool_choice: "required"` 时才会返回结构化工具调用。对于这些模型条目，请用
    `params.extra_body` 强制设置 OpenAI 兼容请求字段：

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

    你也可以通过 CLI 应用同样的覆盖：

    ```bash
    openclaw config set agents.defaults.models '{"vllm/Qwen-Qwen2.5-Coder-32B-Instruct":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
    ```

    这是一个可选的兼容性解决方案。它会让使用工具的每一轮模型交互都要求工具调用，因此仅应在可接受该行为的专用本地模型条目中使用。不要将其作为所有 vLLM 模型的全局默认值，也不要使用会把任意助手文本盲目转换为可执行工具调用的代理。

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
  <Accordion title="首次响应很慢或远程服务器超时">
    对于大型本地模型、远程 LAN 主机或 tailnet 链接，请设置
    提供方范围的请求超时：

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

    `timeoutSeconds` 仅适用于 vLLM 模型的 HTTP 请求，包括
    连接建立、响应头、正文流式传输，以及整个
    guarded-fetch 中止。优先使用这个设置，然后再考虑增加
    `agents.defaults.timeoutSeconds`，后者控制整个代理运行。

  </Accordion>

  <Accordion title="服务器不可达">
    检查 vLLM 服务器是否正在运行并可访问：

    ```bash
    curl http://127.0.0.1:8000/v1/models
    ```

    如果你看到连接错误，请确认主机、端口，以及 vLLM 是否以 OpenAI 兼容服务器模式启动。
    对于显式的 loopback、LAN 或 Tailscale 端点，OpenClaw 会信任
    已配置的 `models.providers.vllm.baseUrl` 源作为受保护模型
    请求的精确来源。metadata/link-local 源在未显式
    启用前仍会被阻止。仅当 vLLM 请求必须访问另一个私有源时，
    才设置 `models.providers.vllm.request.allowPrivateNetwork: true`，
    并将其设为 `false` 以取消精确来源信任。

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

  <Accordion title="工具显示为原始文本">
    如果某个 Qwen 模型打印的是 JSON/XML 工具语法而不是执行技能，
    请检查上方高级配置中的 Qwen 指引。通常的修复方法是：

    - 使用该模型正确的解析器/template 启动 vLLM
    - 使用 `openclaw models list --provider vllm` 确认精确的模型 id
    - 仅当 `tool_choice: "auto"` 仍然返回空的或仅文本的
      工具调用时，才为该模型添加专用的 `params.extra_body.tool_choice: "required"`
      覆盖

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