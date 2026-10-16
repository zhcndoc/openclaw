---
summary: "使用 vLLM 运行 OpenClaw（OpenAI- 兼容本地服务器）"
read_when:
  - "你想让 OpenClaw 连接到本地 vLLM 服务器"
  - "您希望 OpenAI- 兼容 /v1 端点与您自己的模型"
title: "法学硕士"
---

vLLM 通过 **OpenAI- 兼容的** HTTP API 提供开源（和一些自定义）模型。 OpenClaw 使用 `openai-completions` API 进行连接，并且当您选择使用 `VLLM_API_KEY` 时，**可以自动发现** 模型。

| 属性         | 值                                      |
| ---------------- | ------------------------------------------ |
| 提供商 ID      | `vllm`                                     |
| API              | `openai-completions` （OpenAI-兼容的）   |
| 认证             | `VLLM_API_KEY` 环境变量        |
| 默认基础 URL | `http://127.0.0.1:8000/v1`                 |
| 流式传输用量  | 支持（`stream_options.include_usage`） |

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="start-vllm-with-an-openai-compatible-server" title="使用 OpenAI- 兼容服务器启动 vLLM">
    您的基础 URL 必须公开 `/v1` 端点（`/v1/models`、`/v1/chat/completions`）。使用您想要服务的模型启动服务器：

    ```bash
    vllm serve <model-id>
    ```

    有关标志，请参阅 [vLLM 在线服务文档](https://docs.vllm.ai/en/latest/serving/online_serving/)。 vLLM 通常运行于：

    ```text
    http://127.0.0.1:8000/v1
    ```

  </Step>
  <Step id="set-the-api-key-environment-variable" title="设置API关键环境变量">
    如果你的服务器不强制认证，任何非空值都可以：

    ```bash
    export VLLM_API_KEY="vllm-local"
    ```

  </Step>
  <Step id="select-a-model" title="选择模型">
    替换为您的 vLLM 模型 ID 之一：

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
  <Step id="verify-the-model-is-available" title="验证模型是否可用">
    ```bash
    openclaw models list --provider vllm
    ```
  </Step>
</Steps>

<Tip>
对于非交互式设置（CI、脚本），直接传入基础 URL、密钥和模型：

```bash
openclaw onboard --non-interactive --accept-risk --skip-health \
  --mode local \
  --auth-choice vllm \
  --custom-base-url "http://127.0.0.1:8000/v1" \
  --custom-api-key "vllm-local" \
  --custom-model-id "your-model-id"
```

</Tip>

## <a id="model-discovery-(implicit-provider)"></a><a id="model-discovery-implicit-provider"></a> 模型发现（隐式提供方）

当设置了 `VLLM_API_KEY`（或存在身份验证配置文件）并且 `models.providers.vllm` 是 **而不是** 时，OpenClaw 查询 `GET http://127.0.0.1:8000/v1/models` 并将返回的 ID 转换为模型条目。

Discovery 可识别 DeepSeek、V4 和 Nemotron 3 Nano、Super 和 Ultra 推理模型，包括 `yk_deepseek_v4` 和 `yk_nemotron-3-super` 等服务名称别名。显式配置的 `reasoning: false` 仍会禁用推理功能。

<Note>
如果你显式设置了 `models.providers.vllm`，OpenClaw 只会使用你声明的模型。将 `"vllm/*": {}` 添加到 `agents.defaults.models`，以让 OpenClaw 也查询该已配置提供方的 `/models` 端点，并包含所有已公布的 vLLM 模型。
</Note>

### <a id="serving-context-limits"></a> 服务上下文限制

当发现返回正整数 `max_model_len` 时，OpenClaw 将其保留为该服务器和模型的观察到的上下文上限。即使显式模型 `contextWindow` 或 `contextTokens` 更大，推理预算也不能超过该上限。较小的配置限制仍然适用。静态模型默认值和丢失或无效的服务器元数据不会成为观察到的上限。

该观测属于已发现的API和基地URL。模型级端点覆盖不会继承另一个路径的上限。没有 `"vllm/*"` 的显式提供程序配置仍然是手动的，并且不会探测服务器。

更改 vLLM 的服务限制后，显式刷新模型目录。新的回合使用刷新的观察；已经准备好的轮次保留其当前预算。 OpenClaw 不会针对每个推理请求轮询服务器。

## <a id="explicit-configuration"></a> 显式配置

当 vLLM 在不同的主机或端口上运行、您想要固定 `contextWindow`/`maxTokens`、您的服务器需要真正的 API 密钥或者您连接到受信任的环回、LAN 或 Tailscale 端点时，显式配置：

```json5
{
  models: {
    providers: {
      vllm: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "${VLLM_API_KEY}",
        api: "openai-completions",
        timeoutSeconds: 300, // Optional: extend request timeout for slow local models
        models: [
          {
            id: "your-model-id",
            name: "Local vLLM Model",
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

## <a id="advanced-configuration"></a> 高级配置

### <a id="prioritize-interactive-requests"></a> 优先考虑交互请求

当交互和后台工作共享一个vLLM引擎时，在服务器上启用本机优先级调度：

```bash
vllm serve <model-id> --scheduling-policy priority
```

然后在 OpenClaw 中选择该模型：

```json5
{
  agents: {
    defaults: {
      models: {
        "vllm/your-model-id": { params: { priorityScheduling: true } },
      },
    },
  },
}
```

`priorityScheduling` 是一个可选布尔值，默认情况下禁用。仅适用于所选`vllm/*`模型的参数；特定于代理的模型参数可以覆盖它。全局或代理范围的参数不会启用它。其他提供商和后备模型不会继承选择加入。

| 要求                                              | 本机 `priority` |
| ---------------------------------------------------- | ----------------: |
| 交互式用户转或手册 `/compact`           |            `-100` |
| 委派或非机密工作                       |               `0` |
| Cron、心跳、内存或简单的辅助完成 |             `100` |

运行触发的压缩继承了最初的紧迫性。独立自动压缩使用后台优先级。简单的帮助器完成包括实用程序摘要和工具端模型调用，即使用户正在等待结果。

在争用中，较小的数字首先被安排；到达顺序打破了联系。 OpenClaw 发送本机字段，并且不维护另一个队列、保留容量或隔离模型内存。请参阅 [vLLM 调度程序参考 ](https://docs.vllm.ai/en/stable/api/vllm/config/scheduler/)。

启用后，动态优先级优先于显式 `extraBody.priority` 或 `extra_body.priority`。禁用时，OpenClaw 不添加调度字段并保留现有的文字优先级覆盖，包括零。数字 `priority: 0` 从不启用调度。

vLLM 请求契约要求非零优先级的优先级调度。在将服务器切换回 FCFS 之前，禁用 `priorityScheduling` 并删除任何显式非零优先级覆盖。这个新的可选字段不需要医生迁移。

<AccordionGroup>
  <Accordion id="proxy-style-behavior" title="代理式行为">
    vLLM 被视为代理样式 OpenAI- 兼容的 `/v1` 后端，而不是本机 OpenAI 端点：

    | 行为                                | 是否应用？                         |
    | --------------------------------------- | -------------------------------- |
    | 原生 OpenAI 请求整形           | No                               |
    | `service_tier`                          | 不发送                         |
    | 回复 `store`                       | 不发送                         |
    | Prompt-cache 提示                      | 不发送                         |
    | OpenAI reasoning-compat 载荷整形 | 未应用                      |
    | 隐藏的 OpenClaw 归因标头     | 未注入自定义基本 URL |

  </Accordion>

  <Accordion id="qwen-thinking-controls" title="Qwen思维控制">
    对于 Qwen 模型，当服务器需要 Qwen 聊天模板 kwargs 时，请在模型行上设置 `compat.thinkingFormat: "qwen-chat-template"`。这些模型公开了二进制 `/think` 配置文件（`off`、`on`），因为 Qwen 聊天模板思维是 on/off 标志，而不是 OpenAI- 风格的努力阶梯。

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

    如果您提供的模板接受工作量级别，请在 `compat.supportedReasoningEfforts` 中声明它们，例如 `["low", "medium", "xhigh"]`。然后，OpenClaw 公开这些 `/think` 选择以及 `off`。共享推理解析器将选定的级别映射到声明的连线值。对于 `qwen-chat-template`，该值位于 `chat_template_kwargs.reasoning_effort` 中；对于 `qwen`，它位于根 `reasoning_effort` 中。

    提供者本机值区分大小写。使用 `compat.reasoningEffortMap`（例如 `{ low: "LOW", high: "HIGH" }`）将逻辑选择映射到已声明的本机列表（例如 `["LOW", "HIGH"]`）。未映射的本机标签不会作为努力选择进行宣传。缺失、空或不可用的列表会保持二元思维，`compat.supportsReasoningEffort: false` 也是如此。

    该插件在会话设置之前将这些映射准备为模型功能，因此当 `xhigh` 和 `max` 等高级选择在其本机线标签不同时也能承受会话级钳位。

    默认值仍为 `off`，包括在升级现有配置模型后。显式启用的级别现在发送其声明的工作，而不是默默地使用模板的默认值。普通二进制 Qwen 模型保持其现有的请求形状。每个模型 `params.extra_body` 仍然是最终的请求正文覆盖。

  </Accordion>

  <Accordion id="deepseek-v4-thinking-controls" title="DeepSeek V4 思维控制">
    对于包含 `deepseek-v4` 或 `deepseek_v4` 的 vLLM 模型 ID，配置 `reasoning: true`。 OpenClaw 通过 `chat_template_kwargs.reasoning_effort` 发送选定的工作，其中 `thinking` 和 `enable_thinking` 均设置为 `true`。声明的努力和 `reasoningEffortMap` 使用与其他 OpenAI- 兼容模型相同的共享解析器。

    `/think off` 将两个模板标志都发送为 `false`，因为当任一标志为 true 时，vLLM 都会启用 DeepSeek 思考。托管 DeepSeek 的根 `thinking` 对象和根 `reasoning_effort` 被删除。现有的显式模板 kwargs 和最终的 `params.extra_body` 覆盖仍然具有权威性。显式 Qwen 思维格式优先于模型名称匹配。

    此请求调整不会启用对标记为 `reasoning: false` 的目录行的推理。如果发现无法识别其推理能力，则显式配置模型。

  </Accordion>

  <Accordion id="nemotron-3-thinking-controls" title="Nemotron 3 思维控制">
    对于 Nemotron 3 模型（包括 `vllm/yk_nemotron-3-super` 等服务名称别名），捆绑的插件会发送：

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

  <Accordion id="qwen-tool-calls-appear-as-text" title="Qwen 工具调用显示为文本">
    首先确认 vLLM 是否使用了与模型匹配的正确 tool-call 解析器和 chat template 启动。vLLM 文档中，Qwen2.5 模型使用 `hermes`，Qwen3-Coder 模型使用 `qwen3_xml`。

    症状：skills/tools 从未运行，助手打印原始 JSON/XML，例如 `{"name":"read","arguments":...}`，或者当 OpenClaw 发送 `tool_choice: "auto"` 时，vLLM 返回空的 `tool_calls` 数组。

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

  <Accordion id="custom-base-url" title="定制底座 URL">
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
                name: "Remote vLLM Model",
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

## <a id="troubleshooting"></a> 故障排查

<AccordionGroup>
  <Accordion id="slow-first-response-or-remote-server-timeout" title="首次响应缓慢或远程服务器超时">
    对于大型本地模型、远程 LAN 主机或 tailnet 链接，设置提供者范围内的请求超时：

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

    `timeoutSeconds` 仅适用于 vLLM 模型 HTTP 请求：连接设置、响应标头、正文流和总保护获取中止。它还将 LLM idle/stream 看门狗上限提高到该提供商隐式约 120 秒的默认值之上。优于增加 `agents.defaults.timeoutSeconds`，后者控制每个模型尝试的执行预算。较低的代理或特定于运行的超时仍然会限制尝试；每个配置的后备都会获得新的预算。

  </Accordion>

  <Accordion id="server-not-reachable" title="服务器无法访问">
    检查 vLLM 服务器是否正在运行并可访问：

    ```bash
    curl http://127.0.0.1:8000/v1/models
    ```

    如果您看到连接错误，请验证主机、端口以及 vLLM 是否在 OpenAI- 兼容服务器模式下启动。 OpenClaw 信任环回、LAN 和 Tailscale 端点上受保护模型请求的确切配置的 `models.providers.vllm.baseUrl` 源。元数据、链接本地和本地使用 NAT64 （`64:ff9b:1::/48`） 来源在没有明确选择加入的情况下仍会被阻止。仅当 vLLM 请求必须到达另一个私有源时才设置 `models.providers.vllm.request.allowPrivateNetwork: true`，或者设置 `false` 以选择退出确切源信任。

  </Accordion>

  <Accordion id="auth-errors-on-requests" title="请求的身份验证错误">
    如果请求因认证错误失败，请设置一个与服务器配置匹配的真实 `VLLM_API_KEY`，或者在 `models.providers.vllm` 下显式配置提供方。

    <Tip>
    如果你的 vLLM 服务器不强制认证，那么 `VLLM_API_KEY` 的任何非空值都可作为 OpenClaw 的可选启用信号。
    </Tip>

  </Accordion>

  <Accordion id="no-models-discovered" title="没有发现模型">
    自动发现需要设置 `VLLM_API_KEY`。如果你已经定义了 `models.providers.vllm`，除非 `agents.defaults.models` 包含 `"vllm/*": {}`，否则 OpenClaw 只会使用你声明的模型。
  </Accordion>

  <Accordion id="tools-render-as-raw-text" title="工具呈现为原始文本">
    如果某个 Qwen 模型输出 JSON/XML 工具语法而不是执行 skill：

    - 使用与该模型匹配的正确 parser/template 启动 vLLM。
    - 通过 `openclaw models list --provider vllm` 确认精确的模型 id。
    - 仅当 `tool_choice: "auto"` 仍返回空或纯文本工具调用时，才添加专用的每模型 `params.extra_body.tool_choice: "required"` 覆盖。

  </Accordion>
</AccordionGroup>

<Warning>
更多帮助：[故障排除](/help/troubleshooting)和[FAQ](/help/faq)。
</Warning>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="OpenAI" href="/providers/openai" icon="bolt">
    本机 OpenAI 提供程序和 OpenAI- 兼容的路由行为。
  </Card>
  <Card title="OAuth 并授权" href="/gateway/authentication" icon="key">
    身份验证详细信息和凭证重用规则。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    常见问题及其解决方法。
  </Card>
</CardGroup>
