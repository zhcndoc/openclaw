---
summary: "即时贡献、传输、快速模式、压缩和路线兼容性"
read_when:
  - "您正在调整 openai/* 的传输、快速模式或服务层"
  - "你需要更严格的 GPT-5 代理执行行为"
  - "您正在调试服务器端压缩或 OpenAI- 兼容代理行为"
title: "OpenAI高级配置"
sidebarTitle: "高级配置"
---

## <a id="gpt-5-prompt-contribution"></a> GPT-5 提示词贡献

OpenClaw 添加了共享的 GPT-5 提示贡献来匹配 GPT-5 和 GPT-6 OpenClaw- 组装提示（`gpt-5*` 和 `gpt-6*`，例如默认的 `gpt-6-astra`）。下面的 OpenAI 插件设置控制 OpenAI-family 路线上的友好风格。旧版 GPT-4.x、`gpt-oss`、o 系列和 `codex-mini` 模型 ID 不匹配。

本机 Codex 应用程序服务器harness不会通过开发人员指令接收 persona/tool- 纪律行为契约或友好交互样式覆盖；本机 Codex 保留 Codex- 拥有的基础、模型和项目文档行为，而 OpenClaw 禁用 Codex 的本机线程内置个性，以便代理工作区个性文件保持权威。 OpenClaw 仅向本机 Codex 线程贡献运行时上下文：通道传递、OpenClaw 动态工具、ACP 委派、工作区上下文和 OpenClaw 技能。来自同一贡献的心跳指导文本是一个例外：本地 Codex 心跳轮流确实得到了它，作为专用协作指令注入，而不是通过共享提示贡献挂钩。

GPT-5 贡献添加了一个标记行为契约，用于角色持久性、执行安全性、工具规则、输出形状、完成检查以及匹配 OpenClaw- 组装提示的验证。通道特定回复和静默消息行为保留在共享 OpenClaw 系统提示和出站传递策略中。友好的交互风格层是独立且可配置的。

| 值                  | 作用                                      |
| ---------------------- | ------------------------------------------- |
| `"friendly"`（默认） | 启用友好交互风格层 |
| `"on"`                 | `"friendly"` 的别名                      |
| `"off"`                | 仅禁用友好风格层       |

<Tabs>
  <Tab id="config" title="配置">
    ```json5
    {
      plugins: {
        entries: {
          openai: {
            config: { personality: "friendly" },
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="CLI">
    ```bash
    openclaw config set plugins.entries.openai.config.personality off
    ```
  </Tab>
</Tabs>

<Tip>
运行时值不区分大小写，因此 `"Off"` 和 `"off"` 都会禁用友好风格层。
</Tip>

<Note>
退役的`agents.defaults.promptOverlays`密钥不再被读取；配置验证会拒绝它，并且当该密钥未设置时，`openclaw doctor --fix` 会将其个性值迁移到 `plugins.entries.openai.config.personality` 中。
</Note>

## <a id="advanced-configuration"></a> 高级配置

下面的 `transport` 和 `serviceTier` 示例是编写的嵌入式提供程序请求设置，因此符合条件的 `auto` 路由保留在 OpenClaw 上，而不是隐式选择 Codex。有效的 `fastMode` / `fast_mode` 值和有效的截止键是键入的代理运行时控件，并且不选择运行时。因此，特定于运行时的示例明确固定 `agentRuntime.id`。本机 Codex 应用程序服务器harness拥有其传输和请求设置。因此，即使使用显式的 `agentRuntime.id: "codex"`，创作的嵌入式提供程序设置也可以选择声明的 OpenClaw 后备；参见[运行时选择](/concepts/agent-runtimes#runtime-selection)。

<AccordionGroup>
  <Accordion id="transport-websocket-vs-sse" title="运输（WebSocket 与 SSE）">
    直接 API-key 请求默认使用 SSE。当您希望在符合条件的官方 OpenAI 端点上响应 WebSocket 模式时，请设置 `params.transport`。

    | 值                 | 行为 |
    | --------------------- | -------- |
    | `"sse"`（默认）     | 通过 SSE 流式传输每个请求 |
    | `"auto"`              | 优先使用会话缓存的 WebSocket，并在请求分发前回退到 SSE |
    | `"websocket-cached"`  | 显式使用会话缓存的 WebSocket 路径，并在请求分发前以相同方式回退到 SSE |
    | `"websocket"`         | 为请求使用临时 WebSocket，并在请求分发前回退到 SSE |

    缓存模式会为每个会话保留一个符合条件的连接。当之前的请求和响应仍与当前历史记录匹配时，OpenClaw 只发送新的输入，并通过 `previous_response_id` 引用之前的响应。否则，它会在不包含该引用的情况下发送完整历史记录。

    请求发送之前的设置或握手失败回退到 SSE；它不会首先重试或重新连接。分派后，结果未知的故障将停止，而不会重播请求。显式服务器拒绝 `previous_response_not_found`、`websocket_connection_limit_reached` 和 `previous_response_id` 的零数据保留 `unsupported_parameter` 拒绝是安全例外：OpenClaw 关闭失败的套接字并重试，以完整历史记录且没有拒绝的 `previous_response_id` 翻转 SSE 一次。

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": {
              agentRuntime: { id: "openclaw" },
              params: { transport: "auto" },
            },
          },
        },
      },
    }
    ```

    ChatGPT 响应 SSE 圈数总计可能超过 16 MiB。解析器在解码或解析每个缓冲事件之前将其限制为 16 MiB 字节，并取消超大事件，包括没有结束分隔符的事件。

    对于缓存的 ChatGPT 响应 WebSocket 请求，在任何响应事件触发一次重试新连接（而不是缓存的响应引用）之前，明确的“Rustponses 无法重播”拒绝。重试保留推理、压缩和完成的工具结果；它不会重新运行工具。响应事件后拒绝完整输入和失败仍然是终端。

    相关的 OpenAI 文档：
    - [Responses API WebSocket 模式](https://developers.openai.com/api/docs/guides/websocket-mode)
    - [流式 API 响应（SSE）](https://platform.openai.com/docs/guides/streaming-responses)

  </Accordion>

  <Accordion id="fast-mode" title="快速模式">
    OpenClaw 为 `openai/*` 提供一个共享的快速模式开关：

    - **Chat/UI:** `/fast status|auto|on|off|ultrafast|default`
    - **配置：** `agents.defaults.models["<provider>/<model>"].params.fastMode`

    有效的 `params.fastMode` / `params.fast_mode` 值以及有效的截止时间键属于类型化的运行时控制项。它们不计入作者编写的提供程序请求参数， 也不会选择 OpenClaw 或 Codex。下面的示例固定使用嵌入式 OpenClaw，因为它描述的是直接的提供程序请求。

    在嵌入式运行时上启用时，OpenClaw 将快速模式映射到 OpenAI API 快速模式（以前​​称为优先级处理）并发送 `service_tier = "priority"`。显式 `/fast ultrafast` 或 `params.fastMode: "ultrafast"` 会发送 `service_tier = "ultrafast"`。当请求超快时，OpenClaw 将嵌入式运行时的上下文预算和响应服务器压缩阈值限制在 **260,000 个令牌**。这为输出和工具回合留下了低于该层服务边界的空间。较小的配置预算或 `responsesCompactThreshold` 值仍然获胜；超快的阈值更大。快速、标准和其他显式服务层保持其配置的预算。即使在 `responsesServerCompaction: false` 时，客户端压缩也使用相同的上限预算；它的储备可以让它运行得更早。尽管提供商仍然选择服务层，但这有助于长时间对话保持在超快状态。

    所选账户和模型必须支持该级别；提供商可以拒绝它或返回不同的有效等级。快速模式不会重写 `reasoning` 或 `text.verbosity`。 `fastMode: "auto"` 快速启动新模型调用，直到自动截止，然后开始稍后重试、回退、工具结果或无快速模式的连续调用。截止时间默认为60秒；在活动模型上设置 `params.fastAutoOnSeconds` 来更改它。

    对于嵌入式 OpenClaw 运行时，Control UI 在提供标准、快速和超快时使用提供商模型和路由限制。这适用于身份验证配置文件、环境密钥和提供程序配置（包括 SecretRefs）。仅限于标准或快速的模型保留这些限制。自定义端点和 ChatGPT 帐户目录保留其自己的层策略。

    如果对超快请求的响应回显不同的 `service_tier`，则 OpenClaw 会记录该凭证、模型和路由的临时观察结果。超快保持可选择，并且作曲家的速度工具提示显示请求和服务的层。后续调用将继续请求选定的层，除非重复的显式拒绝触发下面的运行本地冷却时间。尊重它的回应会立即清除提示；否则，观察将在最近一次发生后五分钟到期。

    如果本机 OpenAI API 在输出、工具活动或主动响应转向之前明确拒绝 `service_tier`，则 OpenClaw 会自动以较慢的层重试该请求：超快 → 快速 → 标准。该提示记录了在不更改已保存首选项的情况下进行的恢复。在同一运行和 account/model 路线中连续两次 Ultrafast 拒绝后，后续模型请求直接使用 Fast 十分钟或二十个模型请求，以先结束者为准。下一个超快请求再次探测该层：拒绝会更新冷却时间，而成功的超快请求会重置拒绝计数。新的征程重新开始。在不同层提供的成功响应本身不会触发冷却时间。

    冷却时间也适用于显式超快请求覆盖；其他层保持配置不变。 OpenClaw 在取消或不明确的连接失败后不会重试层错误。

    凭证替换、配置文件发现刷新或已准备运行时的停用的观察结果也很清晰，并且在重新启动后不会持续存在。 ChatGPT- 帐户可用性仍然基于经过身份验证的帐户目录发现。

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": {
              agentRuntime: { id: "openclaw" },
              params: { fastMode: "auto", fastAutoOnSeconds: 30 },
            },
          },
        },
      },
    }
    ```

    <Note>
    完全优先级是内联消息、存储会话、每个代理默认值、全局默认值、每个模型 `params.fastMode`，然后是关闭。 `/fast default` 仅清除会话层。 `/status` 报告已解析的 OpenClaw 策略和运行时，而不是实际兑现或返回的上游服务层。请参阅 [ 思维水平 ](/tools/thinking#fast-mode-%2Ffast) 和 [ Codex harness ](/plugins/codex-harness/commands#shared-fast-mode-and-codex-fast-mode)。
    </Note>

    快速模式价格昂贵且特定于模型。 GPT-5.6 Sol API 快速模式目前的成本是标准代币定价的 2 倍，具有长上下文乘数堆叠，如 [ 上下文窗口默认值和长上下文选择加入 ](/providers/openai/setup#context-window-defaults-and-long-context-opt-in) 中所述。 ChatGPT/Codex-credit快速模式是一个单独的计费系统：GPT-5.6和GPT-5.5当前消耗2.5×标准积分，而API-key Codex运行使用API代币定价。请参阅 [ 快速模式](https://openai.com/api-priority-processing/)、[API 定价](https://developers.openai.com/api/docs/pricing) 和[Codex 速度](https://learn.chatgpt.com/docs/agent-configuration/speed)。

  </Accordion>

  <Accordion id="openai-api-fast-mode-with-service-tier" title="OpenAI API 使用 service_tier 的快速模式">
    OpenAI 现在将此 API 产品称为快速模式；它以前是优先处理。 OpenClaw 发送线值 `service_tier = "priority"`。在嵌入式 OpenClaw 运行时上为每个模型设置显式层：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": {
              agentRuntime: { id: "openclaw" },
              params: { serviceTier: "priority" },
            },
          },
        },
      },
    }
    ```

    支持的值：`auto`、`default`、`flex`、`priority`、`ultrafast`。可用性取决于所选的提供商路线、帐户和模型。 `serviceTier` 和 `service_tier` 设置继承的默认值，而不是锁。会话或每条消息的速度选择优先：标准发送 `default`，快速发送 `priority`，超快发送 `ultrafast`（如果支持）。如果没有速度覆盖，配置的层（例如 `flex` 和 `auto`）将保持不变。 `/fast default` 清除会话覆盖。

    响应运行时，速度控件保持可编辑状态。更改适用于以后的请求；它们不会中断或重写已经在进行中的请求。

    <Warning>
    `params.serviceTier` 是编写的嵌入式提供程序设置，而不是本机 Codex 应用程序服务器配置。它仅由 OpenAI 响应路由上的嵌入式运行时转发，包括兼容的基本 URL 和本机 ChatGPT 端点 （`chatgpt.com/backend-api`）。兼容的端点必须遵守所请求的等级；保存的首选项并不能保证满足。用`plugins.entries.codex.config.appServer.serviceTier`单独配置原生harness；共享的快速模式运行控制可以取代该值。
    </Warning>

  </Accordion>

  <Accordion id="server-side-compaction-responses-api" title="服务器端压缩（响应 API）">
    对于支持存储的直接 OpenAI 响应模型（`openai/*` 解析为 `api.openai.com`），OpenAI 插件的 OpenClaw 流包装器自动启用服务器端压缩：

    - 强制 `store: true`（除非模型兼容性设置了 `supportsStore: false`）
    - 注入 `context_management: [{ type: "compaction", compact_threshold: ... }]`
    - 默认 `compact_threshold`：`contextWindow` 的 70%（如果不可用则为 `80000`）

    相同的解析路由和有效阈值控制客户端预检，因此 OpenClaw 不会延迟本地压缩，除非传输将注入 `context_management`。此自动内联策略不包括 ChatGPT、OAuth、自定义代理和包含 `compat.supportsStore: false` 的路由。它适用于内置 OpenClaw 运行时和嵌入式 OpenAI 提供程序挂钩。本机 Codex 应用程序服务器工具继续拥有自己的压缩。

    在本机 ChatGPT 登录路径上，内置运行时默认使用 **Codex V2 压缩** 在模型请求之前（包括已完成的工具轮次之间）实现上下文预算压力。它使用与 `store: false` 相同的指令、工具、有效负载挂钩和缓存密钥发送带有尾部 `compaction_trigger` 的正常请求。只有具有一个不透明检查点的成功完成的流才能替换所覆盖的上下文。保留的人类消息在后续压缩中仍然有效。保存的检查点在以后的工具轮次和用户轮次中保持活动状态，包括在会话恢复之后。

    当已知或预计请求占用率达到 `min(context window - effective reserve, floor(0.9 × context window))` 时，V2 启动。有了 500,000 个代币的窗口和 20,000 个代币的储备，这就是 450,000 个代币。它在可用时使用已完成的请求使用情况，并在下一个正常请求边界对待处理内容进行定价。这种较早的触发为工具输出留下了更多空间；它不会降低模型的物理上下文限制或更改公共 API-key 路由的 70% 内联阈值。

    整个传出请求必须仍然适合该物理窗口。如果在 V2 运行之前一条待处理消息或工具结果与其交叉，则 OpenClaw 会回退到客户端压缩。它不会仅检查旧前缀并默默地丢弃待处理的后缀。

    `params.responsesServerCompaction: false` 或 `params.responsesCompactEndpoint: false` 禁用此 V2 路径。禁用自动压缩也会禁用 V2。在此路线上，手动 `/compact`（带或不带焦点指令）和提供商确认的溢出使用客户端压缩，而不是 V2。如果 V2 不可用或在持久化之前失败，而请求仍然符合基于保留的预算，则 OpenClaw 会发送正常请求而不进行压缩，并且不会在同一运行中重试失败的 V2 尝试。一旦超出预算，现有的客户端压缩器就会处理回退并记录其原因；明确的紧凑端点选择仍然适用于那里。取消不会启动回退，并且已提交的检查点不会再次压缩，因为稍后的观察者失败。拥有压缩功能的上下文引擎保留其现有行为，就像显式配置的压缩模型或摘要提供程序一样。

    OpenAI 会将压缩后的状态作为加密的 `compaction` 输出项发出。 请将该项视为不透明数据。对于无状态续接，请向前传递最新的项，并丢弃它所替代的较早输入前缀。OpenClaw 会自动执行此操作：仅针对匹配的路由、 会话和身份验证身份持久化并重放该项，在 worker 提交会话记录期间保留该项， 并将其从用户可见历史记录和诊断信息中过滤掉。绝不要显示或记录加密内容。

    对于向 `/responses/compact` 发出的 API-key 请求，OpenClaw 保存完整的返回窗口：保留的用户、开发人员、系统或助理消息，后跟一个加密检查点。端点保留的用户消息可能少于其收到的用户消息。保留的内容（包括助手 `output_text`）在重新启动后会重播，而无需修剪消息或重写内容。保留的辅助项目 ID 在重放时会被省略，因为它们的原始推理项目已被检查点吸收。无效的窗口、需要抄本编辑的窗口以及超出下一个请求预算的窗口将回退到客户端压缩。

    下一个前台回合在读取检查点之前等待任何挂起的本地转录投影重建。请求令牌计数不需要低于压缩阈值：再次发送指令和工具，并且在检查点之后产生的工具结果或推理保留在上下文中。要检查重播，请检查项目类型而不是令牌总数：最新的 `compaction` 项目替换覆盖的前缀，后面仅包含后面的项目。

    <Tabs>
      <Tab id="enable-explicitly" title="显式启用">
        对于支持存储的端点（例如 Azure OpenAI 响应）很有用。将此设置为 `true` 不会覆盖端点或 `supportsStore` 功能：

        ```json5
        {
          agents: {
            defaults: {
              models: {
                "azure-openai-responses/gpt-5.5": {
                  params: { responsesServerCompaction: true },
                },
              },
            },
          },
        }
        ```
      </Tab>
      <Tab id="custom-threshold" title="自定义阈值">
        ```json5
        {
          agents: {
            defaults: {
              models: {
                "openai/gpt-5.5": {
                  params: {
                    responsesServerCompaction: true,
                    responsesCompactThreshold: 120000,
                  },
                },
              },
            },
          },
        }
        ```
      </Tab>
      <Tab id="disable" title="禁用">
        ```json5
        {
          agents: {
            defaults: {
              models: {
                "openai/gpt-5.5": {
                  params: { responsesServerCompaction: false },
                },
              },
            },
          },
        }
        ```
      </Tab>
    </Tabs>

    <Note>
    在公共OpenAI Responses路由上，`responsesServerCompaction`仅控制`context_management`注入；在本机 ChatGPT 登录路由上，将其设置为 `false` 也会禁用 V2 压缩，如上所述。公共 OpenAI 响应 API 默认情况下也使用 `/responses/compact` 进行预算触发的压缩以及没有焦点指令的 `/compact`。设置 `params.responsesCompactEndpoint: false` 以禁用此单独端点。 `/compact <focus>`、提供商确认的溢出和端点故障使用客户端汇总。

    除非兼容设置 `supportsStore: false`，否则直接 OpenAI 响应模型仍会强制使用 `store: true`。
    </Note>

  </Accordion>

  <Accordion id="strict-agentic-gpt-mode" title="严格代理GPT模式">
    对于通过 OpenClaw 的嵌入式运行时运行的 `openai` 提供者 GPT-5- 系列模型，OpenClaw 已经默认为名为 `strict-agentic` 的更严格的执行合约。只要解析的提供程序是 `openai` 并且模型 ID 与 GPT-5 系列匹配，它就会自动激活，除非配置明确选择退出：

    ```json5
    {
      agents: {
        defaults: {
          embeddedAgent: { executionContract: "default" },
        },
      },
    }
    ```

    显式设置 `"strict-agentic"` 在支持的通道上是无操作（它已经是默认值），并且在不支持的 provider/model 对上是惰性的。

    启用 `strict-agentic` 后，OpenClaw：
    - 使 `progress_card` 可用于大量工作，除非 `tools.updatePlan` 禁用它
    - 使用可见答案续写来重试结构上为空或仅含推理的轮次
    - 在所选 harness 提供明确的计划事件时使用这些事件

    OpenClaw 不会根据 assistant 的 prose 来判断某一轮是计划、进度更新还是最终答案。

    <Note>
    该契约完全存在于 OpenClaw 的嵌入式 agent runner 中。它不适用于原生 Codex app-server harness；后者会自行管理轮次与计划行为。对于原生 Codex 运行，harness 选择比 execution-contract 设置更重要。
    </Note>

  </Accordion>

  <Accordion id="native-vs-openai-compatible-routes" title="本机与 OpenAI- 兼容路由">
    OpenClaw 对待直接 OpenAI、Codex 和 Azure OpenAI 端点的方式与通用 OpenAI- 兼容的 `/v1` 代理不同：

    **原生路由**（`openai/*`、Azure OpenAI）：
    - 仅针对支持 OpenAI `none` 工作的模型保留 `reasoning: { effort: "none" }`
    - 对于模型或代理不接受 `reasoning.effort: "none"` 的情况，省略禁用的 reasoning
    - 默认将工具 schema 设为严格模式
    - 仅在已验证的原生主机上附加隐藏归因标头（Azure OpenAI 不会获得这些标头，即使它是原生路由）
    - Keep OpenAI-only 请求整形（`service_tier`、`store`、推理兼容、提示缓存提示）
    - 将 `api.openai.com` 上配置有 `openai-completions` 的推理模型的工具轴承轮次发送到 `/v1/responses`，因为聊天完成拒绝对当前 GPT 模型进行推理的功能工具。凭证、端点主机和代理路由保持不变。

    **Proxy/compatible 航线：**
    - 使用更宽松的兼容行为
    - 从非本机 `openai-completions` 有效负载中剥离完成 `store`
    - 接受 OpenAI- 兼容完成代理的高级 `params.extra_body`/`params.extraBody` 直通 JSON
    - 接受 `params.chat_template_kwargs` 用于 OpenAI- 兼容的完成代理，例如 vLLM
    - 不强制严格工具 schema 或仅原生可用的标头

    如果可用工具架构与请求的严格模式不兼容，则请求使用 `strict: false`。调试日志报告 `openai-transport` 下的降级，并包含有限的不兼容工具样本。内置和托管响应请求共享相同模型和模式的重复抑制。兼容性检查检查模式约束，而不是模式映射中的文字名称或注释数据（例如示例和默认值）。

  </Accordion>
</AccordionGroup>
