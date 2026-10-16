---
summary: "Ollama 的上下文窗口、思维控制、成本、嵌入和流式传输"
read_when:
  - "您正在调整上下文窗口，num_ctx，或思维控制"
  - "您需要 Ollama 内存嵌入或流配置"
  - "您正在使用旧版 OpenAI- 兼容模式"
title: "Ollama高级配置"
sidebarTitle: "高级"
---

## <a id="advanced-configuration"></a> 高级配置

本机 Ollama 请求在共享系统和工具前缀之后的第一条用户消息中保留准确的会话身份和运行时事实。这允许本地提示缓存在等效的子代理生成中重用该前缀，同时在后续轮次中保留较早的消息字节。缓存重用仍然取决于模型模板、可用缓存槽和不变的 instructions/tools.

### <a id="cloud-quota-in-%2Fstatus"></a><a id="cloud-quota-in-/status"></a> `/status` 中的云配额

Ollama 0.40.1 及更高版本可以通过登录的本地服务器代理 `GET /api/balance`。当 `ollama` 提供者配置了本地 `apiKey: "ollama-local"` 时，OpenClaw 将其余额包含在聊天 `/status` 和 `openclaw status --usage` 中。旧计划显示会话和每周使用情况以及重置时间；当前计划显示包含的余额及其期间​​重置。购买的积分单独显示。

本地服务器必须登录Ollama Cloud。仅本地模型没有云配额。未登录的服务器和没有余额端点的服务器会从使用报告中悄悄忽略。 OpenClaw 仅在现有使用刷新期间获取余额；它不会单独轮询或需要您的 Ollama Web 会话 cookie。如果设置了 `plugins.allow`，请包含 `ollama`，以便可以加载其使用挂钩。其他平衡失败包括检查服务器或其访问权限的指导。

<AccordionGroup>
  <Accordion id="legacy-openai-compatible-mode" title="旧版 OpenAI- 兼容模式">
    <Warning>
    **此模式下工具调用不可靠。** 仅当代理需要 OpenAI 格式且你不依赖原生工具调用时才使用。
    </Warning>

    为 `/v1/chat/completions` 后面的代理显式设置 `api: "openai-completions"`：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://ollama-host:11434/v1",
            api: "openai-completions",
            injectNumCtxForOpenAICompat: true, // default: true
            apiKey: "ollama-local",
            models: [...]
          }
        }
      }
    }
    ```

    该模式可能不支持同时直播和工具调用；您可能需要 `models.providers.ollama.models` 中的模型上的 `params: { streaming: false }`。也可以在`agents.defaults.models["ollama/<model>"].params`下设置。对于 `openai-completions`，这会将 `stream: false` 发送到上游，并传递完整的回复及其用法、推理和工具调用。未设置时流媒体保持启用状态；此设置不会更改本机 Ollama `/api/chat` 请求。

    OpenClaw 会在此模式下默认注入 `options.num_ctx`，以免 Ollama 悄悄回退到 4096 token 的上下文。如果你的代理会拒绝未知的 `options` 字段，请将其禁用：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://ollama-host:11434/v1",
            api: "openai-completions",
            injectNumCtxForOpenAICompat: false,
            apiKey: "ollama-local",
            models: [...]
          }
        }
      }
    }
    ```

  </Accordion>

  <Accordion id="context-windows" title="上下文窗口">
    对于自动发现的模型，OpenClaw 会使用 `/api/show` 报告的上下文窗口，包括来自自定义 Modelfiles 的更大 `PARAMETER num_ctx` 值；否则会回退到 OpenClaw 的默认 Ollama 上下文窗口。

    每个模型`contextWindow`声明本机窗口元数据和每个模型`contextTokens`限制有效输入。提供商级`maxTokens`保留输出令牌默认值；模型条目可以覆盖它。本国的`/api/chat`请求集`options.num_ctx`从积极的`params.num_ctx`首先，然后从有效模型`contextTokens`当存在时。本地发现通常会受到限制`contextTokens` at 32,768（或模型较小的本机窗口），所以OpenClaw即使没有显式的情况下也可以覆盖较小的模型文件上下文`params.num_ctx`。无效、零、负数或非有限`params.num_ctx`值被忽略。仅当两个值都不可用时才Ollama选择自己的模型，Modelfile，`OLLAMA_CONTEXT_LENGTH`， or VRAM-基于默认；本机适配器不会直接回退到广告的适配器`contextWindow`。升级旧配置后，运行`openclaw doctor --fix`。医生保留电流`contextTokens`不创建更强大的模型或提供商的上限`num_ctx`别针；无上限的遗留本机条目仍然会迁移其旧的上下文预算。现有显式`params.num_ctx`价值观仍然具有权威性，包括老医生已经写过的图钉。检查或删除现有的过大的引脚，让`contextTokens`再次驱动请求。使用`params.num_ctx`显式覆盖本机请求上下文。这OpenAI-兼容适配器仍然注入`options.num_ctx`默认情况下从`params.num_ctx`，然后匹配模型条目的`contextTokens` or `contextWindow`；禁用与`injectNumCtxForOpenAICompat: false`如果上游拒绝`options`。

    本机模型条目还接受 `params` 下的常见 Ollama 运行时选项，作为本机 `/api/chat` `options` 转发：`num_keep`、`seed`、`num_predict`、`top_k`、 `top_p`、`min_p`、`typical_p`、`repeat_last_n`、`temperature`、`repeat_penalty`、`presence_penalty`、`frequency_penalty`、`stop`、 `num_batch`、`num_gpu`、`main_gpu`、`use_mmap` 和 `num_thread`。运行时采样控件（`temperature`、`topP`、`frequencyPenalty`、`presencePenalty` 和 `seed`）会覆盖匹配模型默认值，包括显式零值。网关的聊天完成 API 将 `top_p`、`frequency_penalty` 和 `presence_penalty` 映射到这些控件。对于 `temperature: 0`，OpenClaw 仍将 `top_p` 归一化为 `1`，以便在应用覆盖后进行贪婪采样。一些键（`format`、`keep_alive`、`truncate`、`shift`）作为顶级请求字段转发，而不是嵌套的 `options`。本地本机聊天请求默认为 `truncate: false` 和 `shift: false`，因此支持服务器拒绝溢出输入，而不是默默地删除历史记录。 OpenClaw 然后尝试压缩并重试。如果恢复无法满足请求，则重放安全回合可以使用配置的模型回退链，优先选择具有已知上下文空间的候选者；否则报告失败。填充窗口的生成仍然可以生成带标签的部分回复。此行为已通过 Ollama 0.33.3 进行验证；较旧的服务器可能会忽略这些字段。每个模型的显式值会覆盖这些默认值。托管模型和 OpenAI- 兼容端点保持其现有行为。 OpenClaw 仅转发这些 Ollama 请求密钥，因此仅运行时参数（例如 `streaming`）永远不会发送到 Ollama。使用`params.think`（或`params.thinking`）设置顶层`think`； `false` 禁用 Qwen-style 思维模型的 API- 级别思维。

    ```json5
    {
      models: {
        providers: {
          ollama: {
            models: [
              {
                id: "llama3.3",
                contextWindow: 131072,
                contextTokens: 32768,
                maxTokens: 65536,
                params: {
                  num_ctx: 32768,
                  temperature: 0.7,
                  top_p: 0.9,
                  thinking: false,
                },
              }
            ]
          }
        }
      }
    }
    ```

    每个模型的 `agents.defaults.models["ollama/<model>"].params.num_ctx` 也同样可用；如果两者都设置了，则显式的提供方模型条目优先生效。

  </Accordion>

  <Accordion id="thinking-control" title="思维控制">
    本机本地 Ollama 压缩摘要默认为“thinking off”。这可以防止摘要使用其默认的三分钟请求窗口进行推理； Qwen3.5 将 `low` 视为启用思维而不是减少思维预算。显式的 `agents.defaults.compaction.thinkingLevel` 会覆盖此首选项。现有的每个模型 `params.think`/`params.thinking` 设置保持其正常优先级。托管路由保留其压缩默认值。

    OpenClaw 按照 Ollama 的预期转发思维：顶级 `think`，而不是 `options.think`。自动发现的 `/api/show` 报告 `thinking` 功能的模型会暴露 `/think low`、`/think medium`、`/think high` 和 `/think max`；非思考模型仅公开 `/think off`。当 `/api/show` 还报告 `thinking.values` 时，发现会缓存特定于模型的映射。布尔模型发送`false`或`true`；分级模型发送其支持的工作量字符串。广告中的 `xhigh` 也可通过 `/think xhigh` 和 `--thinking xhigh` 获得。

    使用 OpenClaw 的共享思维阶梯将现有选择映射到最近的支持层。例如，广告 `low`、`medium` 和 `xhigh` 的模型收到 `xhigh` 表示高和最大值。如果模型无法禁用思维，Off 将使用其支持的最低层。 OpenClaw 保留其现有的关闭默认值，而不是采用 `thinking.default`。 Discovery 使用模型元数据缓存这些映射；轮流不再获取它们。

    重播助理消息时，本机请求将其可用推理保留在 Ollama 的单独 `thinking` 字段中，以及文本和工具调用，包括稍后的工具步骤和重新打开的会话。早期的推理保持不变，因此本地提示缓存可以重用该前缀。它不会混入可见的答案文本中；压缩仍然可以取代旧的历史。

    ```bash
    openclaw agent --model ollama/gemma4 --thinking off
    openclaw agent --model ollama/gemma4 --thinking low
    ```

    或者设置模型默认值：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "ollama/gemma4": {
              params: { thinking: "low" },
            },
          },
        },
      },
    }
    ```

    每个模型 `params.think`/`params.thinking` 可以禁用或强制 API 针对特定模型的思考。当活动运行仅具有隐式 `off` 默认值时，OpenClaw 会保留该显式配置；非关闭运行时命令（例如 `/think medium`）仍会覆盖它。标记为 `reasoning: false` 的模型会抑制启用的运行时选择。然而，强制思维模型仍然使用其支持的最低层 Off 或配置的 `false`，即使在其可见性被禁用的情况下，也无法将推理排除在答案之外。

  </Accordion>

  <Accordion id="reasoning-models" title="推理模型">
    名为 `deepseek-r1`、`reasoning`、`reason` 或 `think` 的模型默认会被视为支持 reasoning——无需额外配置：

    ```bash
    ollama pull deepseek-r1:32b
    ```

  </Accordion>

  <Accordion id="model-costs" title="模型成本">
    Ollama 在本地运行且免费，因此自动发现和手动定义的模型的所有成本都为 `0`。
  </Accordion>

  <Accordion id="memory-embeddings" title="记忆嵌入">
    内置的 Ollama 插件会为 [记忆搜索](/concepts/memory) 注册一个记忆嵌入提供方。它使用已配置的 Ollama base URL 和 API key，调用 `/api/embed`，并在可能时将多个记忆块批量合并为一次 `input` 请求。

    对于无根 Podman，`http://host.containers.internal:11434` 处配置的 Ollama 提供程序可以解析为规范的 IPv4 链路本地主机网关，例如 `169.254.1.2`。内存嵌入允许这种精确的提供者来源，包括与其匹配的远程覆盖。其他主机名、云元数据地址和 IPv6-encoded 链接本地地址保留其现有限制。这些请求拒绝跨源重定向，包括对方案或端口的更改。

    当 `proxy.enabled=true` 时，嵌入从配置的 `baseUrl` 派生的确切主机本地环回源的请求使用 OpenClaw 的受保护直接路径而不是托管转发代理。配置的主机名本身必须是 `localhost` 或环回 IP 文字 — 仅解析为环回的 DNS 名称仍使用托管代理路径。 LAN、尾网、专用网络和公共 Ollama 主机始终保留在托管代理路径上，并且重定向到另一个 host/port 不会继承信任。 `proxy.loopbackMode: "proxy"` 无论如何都会通过代理路由环回流量； `proxy.loopbackMode: "block"` 在连接之前拒绝它 — 请参阅 [ 托管代理](/security/network-proxy#gateway-loopback-mode)。

    | 属性 | 值 |
    | --- | --- |
    | 默认模型 | `nomic-embed-text` |
    | 自动拉取 | 不；先拉取Ollama主机上的模型 |
    | 嵌入并发 | 由提供方负责；无需记忆搜索调优键 |

    在索引内存之前，请在配置的 Ollama 主机上运行 `ollama pull nomic-embed-text`（或拉取 `memory.search.model` 选择的模型）。缺失模型返回 HTTP 404； OpenClaw 不会自动下载。

    查询时的 embeddings 会对需要或推荐前缀的模型使用检索前缀：`nomic-embed-text`、`qwen3-embedding` 和 `mxbai-embed-large`。文档批次保持原始格式，因此现有索引无需格式迁移。

    嵌入并发和批处理行为由 Ollama 记忆提供方负责。对于远程嵌入主机，请使用受支持的 `remote.baseUrl` 和 `remote.apiKey` 字段，以便将身份验证限定在该主机：

    ```json5
    {
      memory: {
        search: {
          provider: "ollama",
          model: "nomic-embed-text",
          remote: {
            baseUrl: "http://gpu-box.local:11434",
            apiKey: "ollama-local",
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion id="streaming-configuration" title="流媒体配置">
    Ollama 默认使用 **原生 API**（`/api/chat`），它支持流式传输与工具调用同时进行——无需特殊配置。

    本机 Ollama 和普通聊天完成在流式传输时保留可见的模型文本。稍后的工具调用或推理不会对早期的文本进行重新分类。持久回复块遵循配置的流边界。块流关闭后，最终通道回复将使用上次工具调用后的辅助文本，而实时表面保留已显示的文本。推理可见性和私有标签过滤仍然适用。请参阅 [ 文本阶段和最终答复 ](/concepts/streaming#pending-text-phases)。

    对于本机请求，`/think off`、`openclaw agent --thinking off` 和插件 `api.runtime.llm.complete({ reasoning: "off" })` 调用会发送顶级 `think: false`，除非配置了显式 `params.think`/`params.thinking` 或发现报告了无法禁用思考的模型。省略 `reasoning` 的直接完成将保留模型默认值。如果没有发现思维描述符，`/think low|medium|high` 会发送匹配的努力字符串。经过验证的全功能 Ollama Cloud 系列，例如 GLM 5.2、GLM 5.3、GLM 5.3 闪存、Kimi K3、 DeepSeek V4和DeepSeek V4.1 Flash还为`/think max`发送原生`think: "max"`；其他模型和本地服务器保留兼容的 `think: "high"` 映射。本机 `max` 适用于 `ollama-cloud` 提供程序以及基础 URL 为 `https://ollama.com` 的任何 `ollama` 提供程序。通过本地 Ollama 服务器到达的 `:cloud` 模型保留 `high`，因为 Ollama、0.21.2 和更早版本拒绝 `max`。

    GLM 5.3 和 GLM 5.3 Ollama Cloud 上的 Flash 无法关闭思维：它们的 `/api/show` 思维值没有 `false`，而 `think: false` 使它们用内联推理来回答。对于这些模型，`/think off` 和配置的 `false` 会在代理轮次和一次性完成（例如 `openclaw infer model run`）中发送最低级别 `think: "low"`。

    <Tip>
    对于 OpenAI- 兼容端点，请参阅上面的“旧版 OpenAI- 兼容模式”——流式传输和工具调用可能无法在此处协同工作。
    </Tip>

  </Accordion>
</AccordionGroup>
