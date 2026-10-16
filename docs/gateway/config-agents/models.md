---
summary: "默认模型、后备链、按用途的模型槽和模型选择范围"
read_when:
  - "设置默认模型或其后备链"
  - "指向图像，TTS，或不同模型的总结工作"
  - "选择模型更改的应用范围"
title: "配置——代理模型"
---

`agents.defaults.model` 和 `agents.defaults.modelSelectionScope`：代理使用哪个模型、它回退到什么以及模型更改应用的程度。

## `agents.defaults.model`

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": { alias: "opus" },
        "minimax/MiniMax-M2.7": { alias: "minimax" },
      },
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["minimax/MiniMax-M2.7"],
      },
      utilityModel: "openai/gpt-5.4-mini",
      imageModel: {
        primary: "openrouter/qwen/qwen-2.5-vl-72b-instruct:free",
        fallbacks: ["openrouter/google/gemini-2.0-flash-vision:free"],
      },
      mediaModels: {
        image: {
          primary: "openai/gpt-image-2",
          fallbacks: ["google/gemini-3.1-flash-image"],
        },
        video: {
          primary: "qwen/wan2.6-t2v",
          fallbacks: ["qwen/wan2.6-i2v"],
        },
      },
      pdfModel: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["openai/gpt-5.4-mini"],
      },
      params: { cacheRetention: "long" }, // global default provider params
      pdfMaxMb: 10,
      pdfMaxPages: 20,
      thinkingDefault: "low",
      fastModeDefault: false,
      verboseDefault: "off",
      toolProgressDetail: "explain",
      reasoningDefault: "off",
      elevatedDefault: "on",
      mediaMaxMb: 5,
      maxConcurrent: 4,
    },
  },
}
```

如果不设置 `agents.defaults.timeoutSeconds`，则每个模型尝试的默认时间为 48 小时。每个配置的回退都会收到新的预算，因此使用回退的运行可能需要比此设置更长的时间。设置`0`为无限制执行；用户取消仍然会停止整个运行。请参阅 [Agent 运行时](/concepts/agent-loop#timeouts)。

- `model`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 字符串形式仅设置主模型。
  - 对象形式设置主模型以及按顺序排列的故障转移模型。
- `utilityModel`：可选的 `provider/model` 引用或简短内部任务的别名。它目前支持生成的 Control UI 会话标题、Telegram DM 主题标题、Discord 自动线程标题、滚动 [Activity recaps](/web/control-ui/settings#activity-tab) 和 [progress-draft旁白](/concepts/progress-drafts#status-headline)。未设置时，OpenClaw 在存在时派生主提供者声明的小模型默认值（OpenAI → `gpt-5.6-luna`、Anthropic → `claude-haiku-4-5`）；否则，标题任务将使用特工的主要模型，并且旁白将被关闭。如果不同的实用新型无法准备或完成生成的标题，OpenClaw 会使用主模型重试该标题一次。对于仪表板标题，自动实用程序派生和定期回退使用有效的会话提供程序和身份验证配置文件；显式实用新型保留其配置的 provider/auth. 设置 `utilityModel: ""` 以跳过备用实用路线；仪表板标题生成仍然直接进行到常规会话模型。 `agents.entries.*.utilityModel` 覆盖默认值，并且特定于操作的模型覆盖优于两者。实用程序任务进行单独的模型调用并将特定于任务的内容发送到选定的模型提供程序。仪表板标题生成最多发送第一条非命令消息的前 1,000 个字符； narration 发送入站请求以及紧凑的工具摘要，无需秘密屏蔽。活动回顾发送先前的回顾和新记录消息的有限摘录。回顾保留在公共设施路线上，在缓存文本不​​可用时保留缓存文本，并在禁用公共设施路线时停止生成。选择符合您的成本和数据处理要求的提供商。在全新设置期间，显式非空 `utilityModel` 可以在配置常规主模型之前为 OpenClaw 设置助手供电。选择实用程序角色会使常规代理聊天保持未配置状态。自动提供程序派生的实用程序模型不用于引导设置。一旦配置了主要模型，系统助手就会使用它，而短期实用程序任务则保留其实用程序路线。较旧的配置保留其先前的隐式主要配置，即使它与实用程序模型或别名匹配。在记录实用程序分离迁移之前，医生和正常配置写入会将该路由保留为显式主路由。安装程序使用提供程序准备之前的配置，因此新添加的实用程序提供程序无法成为保留的主要提供程序。迁移后，隐式回退到已配置的提供程序会跳过显式实用程序模型；明确的主要或后备选择仍然具有权威性。动态目录 ID 和不明确的身份验证配置文件后缀将保留其旧路由，直到您选择显式主路由；迁移不会冻结这些值。如果实用程序安装程序遇到未转换的旧主数据库，它会要求您运行 `openclaw doctor --fix` 或在对实用程序提供程序进行身份验证之前选择显式主数据库。现有模型布线在修复期间保持可用。

- `imageModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 当活动模型无法接受图像时，`view_image` 刀具路径用作其视觉模型配置。本机视觉模型直接接收加载的图像字节。
  - 当selected/default模型无法接受图像输入时也用作后备路由。
  - 更喜欢明确的 `provider/model` 参考。为了兼容性，接受裸 ID；如果裸 ID 唯一匹配 `models.providers.*.models` 中配置的支持图像的条目，则 OpenClaw 将其限定为该提供者。不明确的配置匹配需要显式的提供商前缀。
- `mediaModels.image`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由共享图像生成功能和任何未来生成图像的 tool/plugin 表面使用。
  - 典型值包括：用于原生 Gemini 图像生成的 `google/gemini-3.1-flash-image`，用于 fal 的 `fal/fal-ai/flux/dev`，用于 OpenAI Images 的 `openai/gpt-image-2`，或用于透明背景 OpenAI PNG/WebP 输出的 `openai/gpt-image-1.5`。
  - 如果直接选择 provider/model，也请配置匹配的提供商身份验证（例如 `google/*` 的 `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`、`OPENAI_API_KEY` 或 OpenAI Codex OAuth `openai/gpt-image-2` / `openai/gpt-image-1.5`、`FAL_KEY` 为 `fal/*`）。
  - 如果省略，`image_generate` 仍然可以推断出支持身份验证的提供程序默认值。它首先尝试当前的默认提供程序，然后按照提供程序 ID 的顺序尝试其余已注册的图像生成提供程序。
- `mediaModels.music`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由共享的音乐生成能力和内置的 `music_generate` 工具使用。
  - 典型值包括：`google/lyria-3-clip-preview`、`google/lyria-3-pro-preview` 或 `minimax/music-2.6`。
  - 如果省略，`music_generate` 仍然可以推断出支持身份验证的提供程序默认值。它首先尝试当前的默认提供程序，然后按照提供程序 ID 的顺序尝试其余已注册的音乐生成提供程序。
  - 如果直接选择provider/model，则还要配置匹配的提供商auth/API密钥。
- `mediaModels.video`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由共享的视频生成能力和内置的 `video_generate` 工具使用。
  - 典型值包括：`qwen/wan2.6-t2v`、`qwen/wan2.6-i2v`、`qwen/wan2.6-r2v`、`qwen/wan2.6-r2v-flash` 或 `qwen/wan2.7-r2v`。
  - 如果省略，`video_generate` 仍然可以推断出支持身份验证的提供程序默认值。它首先尝试当前的默认提供程序，然后按照提供程序 ID 的顺序尝试其余已注册的视频生成提供程序。
  - 如果直接选择provider/model，则还要配置匹配的提供商auth/API密钥。
  - 官方 Qwen 视频生成插件支持最多 1 个输出视频、1 张输入图像、4 个输入视频、10 秒时长，以及提供商级别的 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark` 选项。
- `pdfModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由 `pdf` 工具用于模型路由。
  - 如果省略，PDF 工具将回退到 `imageModel`，然后回退到已解析的 session/default 模型。
- `pdfMaxMb`：当调用时未传递 `maxBytesMb` 时，`pdf` 工具的默认 PDF 大小限制。
- `pdfMaxPages`：`pdf` 工具在提取回退模式下考虑的默认最大页数。
- `fastModeDefault`：代理的默认快速模式。取值：`"auto"`、`true`、`false`。当未设置每条消息或会话级快速模式覆盖项时，每个代理的 `agents.entries.*.fastModeDefault` 会覆盖此设置。
- `verboseDefault`：代理的默认详细程度。取值：`"off"`、`"on"`、`"full"`。默认值：`"off"`。
- `toolProgressDetail`：`/verbose` 工具摘要和进度草稿工具行的详细模式。值：`"explain"`（默认、紧凑的人类标签）或 `"raw"`（附加原始 command/detail（如果可用））。每个代理 `agents.entries.*.toolProgressDetail` 会覆盖此默认值。
- `reasoningDefault`：代理的默认推理可见性。取值：`"off"`、`"on"`、`"stream"`。每个代理的 `agents.entries.*.reasoningDefault` 会覆盖此默认值。当未设置每条消息或会话级推理覆盖项时，配置的推理默认值仅会应用于所有者、已授权发送者或操作员管理员网关上下文。
- `elevatedDefault`：代理的默认提升输出级别。取值：`"off"`、`"on"`、`"ask"`、`"full"`。默认值：`"on"`。
- `model.primary`：格式`provider/model`（e.g. `openai/gpt-6-astra`用于Codex OAuth访问）。如果省略提供程序，OpenClaw 首先尝试别名，然后尝试与该确切模型 ID 匹配的唯一配置提供程序，然后才回退到配置的默认提供程序（已弃用的兼容性行为，因此更喜欢显式 `provider/model`）。如果该提供程序不再公开配置的默认模型，则 OpenClaw 将回退到第一个配置的 provider/model，而不是显示陈旧的已删除提供程序默认值。
- 为限制某一模型的有源输入，设置 `models.providers.<provider>.models[].contextTokens`；在其本机窗口的同一条目上使用 `contextWindow`。请参阅 [OpenAI 上下文窗口默认值 ](/providers/openai/setup#context-window-defaults-and-long-context-opt-in)。
- `models`：配置的别名和每个模型的设置。每个条目可以包含 `alias`（快捷方式）和 `params`（特定于提供商，例如 `temperature`、`maxTokens`、`cacheRetention`、`context1m`、`anthropicServerCompaction`、`anthropicCompactThreshold`、 `responsesServerCompaction`、`responsesCompactThreshold`、OpenRouter、`provider` 路由、`chat_template_kwargs`、`extra_body`/`extraBody`）。添加条目不会限制模型覆盖。
  - 使用 `provider/*` 条目（例如 `"openai/*": {}` 或 `"vllm/*": {}`）显示所选提供商的所有已发现模型，而无需手动列出每个模型 ID。
  - 如果某提供商动态发现的每个模型都应使用相同的运行时，请将 `agentRuntime` 添加到 `provider/*` 条目。确切的 `provider/model` 运行时策略仍优先于通配符。
  - 将 `codeMode: true` 或 `codeMode: false` 添加到确切的 `provider/model` 条目以覆盖 OpenClaw 代码模式激活。省略则继承全局`tools.codeMode`默认值，包括`"auto"`；代理特定的激活设置优先。这既不会改变运行时选择，也不会改变 Codex 本机代码模式。 Control UI 模型编辑器提供 **Default**、**On** 和 **Off** 以及运行时设置。请参阅 [ 每模型代码 Mode](/tools/code-mode/quickstart#override-one-model) 了解优先级和示例。
  - 安全元数据编辑：使用`openclaw config set agents.defaults.models '<json>' --strict-json --merge`添加条目。 `config set` 拒绝会删除现有条目的替换，除非您通过 `--replace`。
- `modelPolicy.allow`：显式覆盖允许列表。接受别名、确切的 `provider/model` 引用，以及尾部前缀通配符，例如 `openai/*` 或 `clawrouter/anthropic/*`。省略它或使用 `[]` 可允许任何模型。`agents.entries.*.modelPolicy.allow` 会替换该代理的默认策略；显式的空列表会让该代理允许任何模型。
  - Provider 范围的 configure/onboarding 流将选定的提供程序模型合并到此映射中，并保留已配置的不相关提供程序。
  - 对于使用 API-key 身份验证的直接 Anthropic 模型，会在模型 Anthropic 文档上自动启用服务器端压缩以进行阈值压缩。它的默认触发器位于本地预检压缩之下，因此 Anthropic 首先压缩；显式的 `params.anthropicServerCompaction: true` 也会延迟对其触发的外部预运行压缩检查，尽管检查点安全防护仍然可以首先进行本地压缩。设置 `params.anthropicServerCompaction: false` 以禁用它，或设置 `true` 以选择另一个直接 Claude 模型。使用 `params.anthropicCompactThreshold` 覆盖输入令牌触发；默认值为 `max(50000, floor(budget * 0.7))`，其中设置时预算为 `contextTokens`，否则为 `contextWindow`，较低的配置值限制为 `50000`。 OAuth/subscription 和非直接端点被排除。请参阅 [ 人工服务器端压缩 ](/providers/anthropic#advanced-configuration)。
  - 对于具有存储功能的直接 OpenAI 响应模型，服务器端压缩会自动启用，并且相同的有效阈值会延迟本地预检压缩。使用 `params.responsesServerCompaction: false` 停止注入 `context_management`，或使用 `params.responsesCompactThreshold` 覆盖已解析上下文窗口的默认值 70%（不可用时为 80,000）。 ChatGPT OAuth、自定义代理和带有 `compat.supportsStore: false` 的路由不启用此路径。请参阅 [OpenAI 服务器端压缩](/providers/openai/advanced#advanced-configuration)。
- `params`：应用于所有模型的全局默认提供程序参数。设置为 `agents.defaults.params` （e.g. `{ cacheRetention: "long" }`）。
- `params` 合并优先级（配置）：`agents.defaults.params`（全局基础），然后 `agents.defaults.models["provider/model"].params`（每个模型共享），然后 `agents.entries.*.models["provider/model"].params`（特定于代理的每个模型），然后 `agents.entries.*.params`（代理范围）。后面的层通过键覆盖。详细信息请参见 [ 提示 Caching](/reference/prompt-caching)。
- 核采样接受`params.topP`或`params.top_p`。如果配置合并后两者都存在，则 `topP` 获胜；每个请求的 `topP` 会覆盖任一拼写。特定于提供商的抽样限制仍然适用。
- Model `params.thinking` 设置该模型的思维默认值；特定于代理的模型条目会覆盖共享条目。每条消息和会话的选择（后跟代理的 `thinkingDefault`）优先于任一模型设置。参见[思维解析顺序](/tools/thinking#resolution-order)。
- `models.providers.openrouter.params.provider`：OpenRouter- 范围内的默认提供商路由策略。 OpenClaw将此转发给OpenRouter的请求`provider`对象；每个模型 `agents.defaults.models["openrouter/<model>"].params.provider` 和代理参数通过密钥覆盖。请参阅 [OpenRouter 提供者路由](/providers/openrouter#advanced-configuration)。
- `params.extra_body`/`params.extraBody`：高级直通 JSON 合并到 `api: "openai-completions"` 请求主体中，以实现 OpenAI- 兼容代理。如果它与生成的请求密钥发生冲突，则额外的主体获胜；非本地完成路线之后仍会剥离 OpenAI-，仅 `store`。
- `params.chat_template_kwargs`：vLLM/OpenAI-compatible 聊天模板参数合并到顶级 `api: "openai-completions"` 请求正文中。对于 `vllm/nemotron-3-*` withthinking off，捆绑的 vLLM 插件会自动发送 `enable_thinking: false` 和 `force_nonempty_content: true`；显式 `chat_template_kwargs` 覆盖生成的默认值，并且 `extra_body.chat_template_kwargs` 仍然具有最终优先级。配置的 vLLM Qwen 和 Nemotron 思维模型公开二进制 `/think` 选择（`off`、`on`），而不是多级工作阶梯。
- `compat.thinkingFormat`：OpenAI-兼容的思维有效负载风格。在 Qwen- 系列后端上，使用 `"together"` 表示 Together-style `reasoning.enabled`、`"qwen"` 表示 Qwen-style 顶级 `enable_thinking` 或 `"qwen-chat-template"` 表示 `chat_template_kwargs.enable_thinking`支持请求级聊天模板 kwargs，例如 vLLM。 OpenClaw 将禁用思维映射到 `false`，将启用思维映射到 `true`。对于 `"qwen-chat-template"`，当模型声明 `compat.supportedReasoningEfforts` 时，选定的启用级别也会发送 `chat_template_kwargs.reasoning_effort`。该级别根据该列表和 `compat.reasoningEffortMap` 进行解析。回合、会话、配置和继承的显式选择计数；如果没有选择，嵌套工作将被省略，因此模板保留其自己的默认值。逻辑回退仍然是 `medium`。配置的 vLLM Qwen 模型公开其插件拥有的思维控制。
- `compat.supportedReasoningEfforts`：每个模型OpenAI-兼容的推理工作列表。包括`"xhigh"`对于真正接受它的自定义端点；OpenClaw然后暴露`/think xhigh`在命令菜单、网关会话行、会话补丁验证、代理中CLI验证，以及`llm-task`验证配置的provider/model.使用`compat.reasoningEffortMap`当后端想要一个特定于提供者的值时OpenClaw等级。
- `params.preserveThinking`：Z.AI-仅选择保留思维。当启用且思考开启时，OpenClaw 发送 `thinking.clear_thinking: false` 并重放之前的 `reasoning_content`；参见[Z.AI思维和保留思维](/providers/zai#advanced-configuration)。
- `localService`：local/self-hosted 模型服务器的可选提供商级流程管理器。当所选模型属于该提供商时，OpenClaw 检查 `healthUrl`（或 `baseUrl + "/models"`），如果端点已关闭，则启动 `command` 和 `args`，等待 `readyTimeoutMs`，然后发送模型请求。 `command` 必须是绝对路径。 `idleStopMs: 0` 使进程保持活动状态，直到 OpenClaw 退出；正值会在空闲毫秒后停止 OpenClaw-spawned 进程。请参阅 [ 本地模型服务](/gateway/local-model-services)。
- 运行时策略属于提供者或模型，而不是`agents.defaults`。使用 `models.providers.<provider>.agentRuntime` 表示提供商范围的规则，或使用 `agents.defaults.models["provider/model"].agentRuntime` / `agents.entries.*.models["provider/model"].agentRuntime` 表示特定于模型的规则。仅 provider/model 前缀永远不会选择harness。在未设置运行时或 `auto` 的情况下，OpenAI 可能仅针对确切的官方 HTTPS 平台响应或 ChatGPT 响应路由隐式选择 Codex，而无需编写请求覆盖。请参阅 [OpenAI 隐式代理运行时](/providers/openai/runtimes#implicit-agent-runtime)。
- 改变这些字段的 Config 编写器（例如 `/models set`、`/models set-image` 和后备 add/remove 命令）会保存当前对象形式并在可能时保留现有后备列表。
- `maxConcurrent`：最大并行代理跨会话运行（每个会话仍串行化）。默认情况下，OpenClaw 使用 `max(8, available CPU parallelism * 4)`，基于 `os.availableParallelism()`，并以 `os.cpus().length` 作为后备。这允许在 8 个可用 CPU 上运行 32 个，在 48 个可用 CPU 上运行 192 个。显式值会覆盖 CPU- 派生的默认值，包括升级后。

<a id="agentsdefaultsmodelselectionscope" />

## `agents.defaults.modelSelectionScope`

没有明确范围的聊天命令和网关会话模型更新的范围。默认值为 `"session"`：在一个聊天中更改模型不会更改其他聊天或配置的默认值，包括当呼叫者是 owner/admin. 时

```json5
{
  agents: { defaults: { modelSelectionScope: "session" } },
}
```

| 值       | 作用                                                                                                                                                          |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"session"` | 仅更改当前会话的模型选择。                                                                                                              |
| `"agent"`   | 还要更新当前代理在 `agents.entries.<agent>.model` 的显式主节点，并在需要时创建该主节点。永远不要改变共享的全局后备。 |
| `"global"`  | 同时更新共享的 `agents.defaults.model` 后备。请勿替换其他代理的显式初选或其他会话的 pin。                               |
| 取消设置       | 仅更改当前会话，与`"session"`相同。                                                                                                       |

Agent/global 写入需要显式范围标志或配置选择。显式 `/model` 标志 `-s`/`--session`、`-a`/`--agent` 和 `-g`/`--global` 优先于设置。如果没有 owner/admin 权限，裸命令将保持仅会话状态，并且显式 `-a` 或 `-g` 请求将被拒绝。即使配置了此设置，Telegram 回调选择器和嵌入式本地 TUI 仍保持仅会话状态。没有针对每个代理或每个通道的此设置覆盖。

代理和全局更新可能会影响新的和现有的未固定会话以及在下次运行时继承更改后的默认值的 cron 作业。他们不会重写其他会话的显式模型选择。 `/model default -s` 仅清除当前会话的选择，因此它继承当前配置的默认值。选择有效的配置默认值会清除会话模型引脚，但 agent/global 范围仍请求写入配置的目标。请参阅 chat](/concepts/models#model-in-chat) 中的 [ 模型选择，了解持久性、权限和选择器行为。
