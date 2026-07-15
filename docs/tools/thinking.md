---
summary: "用于 /think、/fast、/verbose、/trace 以及推理可见性的指令语法"
read_when:
  - 调整 thinking、fast 模式，或 verbose 指令解析/默认值时
title: "思考级别"
---

## 它的作用

- 任意传入正文中的内联指令：`/t <level>`、`/think:<level>` 或 `/thinking <level>`。
- 级别（别名）：`off | minimal | low | medium | high | xhigh | adaptive | max | ultra`，大致对应 Anthropic 经典 “think” < “think hard” < “think harder” < “ultrathink” 的魔法词阶梯：
  - minimal ~ "think"
  - low ~ "think hard"
  - medium ~ "think harder"
  - high ~ "ultrathink"（最大预算）
  - xhigh ~ "ultrathink+"（GPT-5.2+ 和 Codex 模型，以及 Anthropic Claude Opus 4.7+ 的 effort）
  - adaptive → 由提供方管理的自适应思考（支持 Anthropic/Bedrock 上的 Claude 4.6、Anthropic Claude Opus 4.7+，以及 Google Gemini 动态思考）
  - max → 提供方最大推理（Anthropic Claude Opus 4.7+；Ollama 会将其映射为自身最高的原生 `think` effort）
  - ultra → 提供方最大推理，并在所选模型/运行时支持时进行主动式子代理编排
  - `x-high`、`x_high`、`extra-high`、`extra high` 和 `extra_high` 会映射到 `xhigh`。
  - `highest` 会映射到 `high`。
- 提供方说明：
  - 思考菜单和选择器由提供方配置驱动。提供方插件会为所选模型声明精确的级别集合，包括像二元 `on` 这样的标签。
  - `adaptive`、`xhigh`、`max` 和 `ultra` 仅会对支持它们的提供方/模型/运行时配置公开。对不支持级别输入的指令会被拒绝，并返回该模型的有效选项。
  - 已存在的、配置中的不支持级别会按提供方配置文件等级重新映射。`adaptive` 在非自适应模型上回退到 `medium`，而 `xhigh` 和 `max` 会回退到所选模型支持的最大非关闭级别。
  - Anthropic Claude 4.6 模型在未显式设置思考级别时，默认使用 `adaptive`。
  - Anthropic Claude Opus 4.8 和 Opus 4.7 会保持思考关闭，除非你显式设置思考级别。启用自适应思考后，Opus 4.8 的由提供方控制的 effort 默认值为 `high`。
  - Anthropic Claude Opus 4.7+ 会将 `/think xhigh` 映射为自适应思考加上 `output_config.effort: "xhigh"`，因为 `/think` 是思考指令，而 `xhigh` 是 Opus 的 effort 设置。
  - Anthropic Claude Opus 4.7+ 还公开 `/think max`；它会映射到相同的由提供方控制的最大 effort 路径。
  - 直接的 DeepSeek V4 模型公开 `/think xhigh|max`；两者都会映射到 DeepSeek `reasoning_effort: "max"`，而更低的非关闭级别会映射到 `high`。
  - 经由 OpenRouter 路由的 DeepSeek V4 模型公开 `/think xhigh`，并发送 OpenRouter 支持的 `reasoning.effort` 值，而不是 DeepSeek 原生顶层的 `reasoning_effort`。更低的非关闭级别会映射到 `high`，而已存储的 `max` 覆盖值会回退到 `xhigh`。
  - 支持思考的 Ollama 模型公开 `/think low|medium|high|max`；`max` 会映射到原生 `think: "high"`，因为 Ollama 的原生 API 接受 `low`、`medium` 和 `high` effort 字符串。
  - OpenAI GPT 模型通过模型特定的 Responses API effort 支持来映射 `/think`。仅当目标模型支持时，`/think off` 才会发送 `reasoning.effort: "none"`；否则 OpenClaw 会省略已禁用的 reasoning 载荷，而不是发送不支持的值。
  - GPT-5.6 Sol 和 Terra 通过 Codex 运行时公开原生 `/think ultra`。GPT-5.6 Luna 通过 `max` 公开级别，因为其 Codex 目录未公开 Ultra。
  - 内嵌的 OpenClaw 运行时会为 GPT-5.6 Sol、Terra 和 Luna 公开逻辑上的 `/think ultra`。它会发送提供方最大 effort，并添加运行级别的主动式子代理编排指导。
  - 自定义的 OpenAI 兼容目录条目可以通过设置 `models.providers.<provider>.models[].compat.supportedReasoningEfforts` 并包含 `"xhigh"` 来启用 `/think xhigh`。这使用了映射出站 OpenAI reasoning effort 载荷的同一 compat 元数据，因此菜单、会话校验、agent CLI 和 `llm-task` 会与传输行为保持一致。
  - 过时的已配置 OpenRouter Hunter Alpha 引用会跳过代理推理注入，因为该已退役路由可能会通过 reasoning 字段返回最终答案文本。
  - Google Gemini 将 `/think adaptive` 映射为 Gemini 由提供方控制的动态思考。Gemini 3 请求会省略固定的 `thinkingLevel`，而 Gemini 2.5 请求会发送 `thinkingBudget: -1`；固定级别仍会映射到该模型系列中最接近的 Gemini `thinkingLevel` 或预算。
  - 通过 Anthropic 兼容流式路径的 MiniMax M2.x（`minimax/MiniMax-M2*`）默认使用 `thinking: { type: "disabled" }`，除非你在模型参数或请求参数中显式设置思考。这可以避免从 M2.x 非原生 Anthropic 流式格式中泄漏出的 `reasoning_content` 增量。MiniMax-M3（以及 M3.x）是例外：M3 会输出正确的 Anthropic 思考块，并在思考被禁用时返回空内容，因此 OpenClaw 会让 M3 走提供方省略/自适应思考路径。
  - Z.AI（`zai/*`）对大多数 GLM 模型是二元的（`on`/`off`）。GLM-5.2 是例外：它公开 `/think off|low|high|max`，将 `low` 和 `high` 映射到 Z.AI `reasoning_effort: "high"`，并将 `max` 映射到 `reasoning_effort: "max"`。
  - Moonshot Kimi K2.7 Code（`moonshot/kimi-k2.7-code`）始终会思考。其配置文件仅公开 `on`，而 OpenClaw 会按 Moonshot 要求省略出站 `thinking` 字段。其他 `moonshot/*` 模型会将 `/think off` 映射为 `thinking: { type: "disabled" }`，并将任何非 `off` 级别映射为 `thinking: { type: "enabled" }`。启用思考时，Moonshot 仅接受 `tool_choice` 为 `auto|none`；OpenClaw 会将不兼容的值规范化为 `auto`。

## 解析顺序

1. 消息中的内联指令（仅作用于该消息）。
2. 会话覆盖（通过发送仅包含指令的消息设置）。
3. 每个 agent 的默认值（配置中的 `agents.list[].thinkingDefault`）。
4. 全局默认值（配置中的 `agents.defaults.thinkingDefault`）。
5. 回退：如果可用，则使用提供方声明的默认值；否则，支持推理的模型会解析为 `medium` 或该模型支持的最接近的非 `off` 级别，而不支持推理的模型保持 `off`。

## 设置会话默认值

- 发送一条**仅包含**该指令的消息（允许空白），例如 `/think:medium` 或 `/t high`。
- 这会在当前会话中生效（默认按发送者区分）。使用 `/think default` 可清除会话覆盖并继承已配置/提供方默认值；别名包括 `inherit`、`clear`、`reset` 和 `unpin`。
- `/think off` 会存储一个显式的 off 覆盖。它会禁用 thinking，直到你更改或清除该会话覆盖。
- 会发送确认回复（`Thinking level set to high.` / `Thinking disabled.`）。如果级别无效（例如 `/thinking big`），命令会被拒绝并给出提示，同时会话状态保持不变。
- 发送不带参数的 `/think`（或 `/think:`）即可查看当前 thinking 级别。

## 按 agent 应用

- **嵌入式 OpenClaw**：解析后的等级会传递给进程内的 OpenClaw agent 运行时。
- **Claude CLI 后端**：具体的非 off 等级在使用 `claude-cli` 时会作为 `--effort` 传递给 Claude Code；`adaptive` 会移除已配置的 effort 标志，并将实际 effort 交由 Claude Code 的环境、设置和模型默认值决定。参见 [CLI 后端](/gateway/cli-backends)。

## 快速模式（/fast）

- 级别：`auto|on|off|default`。
- 仅包含指令的消息会切换会话 fast-mode 覆盖，并回复 `Fast mode set to auto.`、`Fast mode enabled.` 或 `Fast mode disabled.`。使用 `/fast default` 可清除会话覆盖并继承已配置的默认值；别名包括 `inherit`、`clear`、`reset` 和 `unpin`。
- 发送不带模式的 `/fast`（或 `/fast status`）可查看当前生效的 fast-mode 状态。
- OpenClaw 按以下顺序解析 fast mode：
  1. 内联/仅指令的 `/fast auto|on|off` 覆盖（`/fast default` 会清除此层）
  2. 会话覆盖
  3. 每个 agent 的默认值（`agents.list[].fastModeDefault`）
  4. 每模型配置：`agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. 回退：`off`
- `auto` 会保持会话/配置模式为 auto，但会独立解析每次新的模型调用。那些在 auto 截止时间之前开始的调用会启用 fast mode；稍后的重试、回退、工具结果或续接调用会以关闭 fast mode 的状态开始。截止时间默认是 60 秒；在活动模型上设置 `agents.defaults.models["<provider>/<model>"].params.fastAutoOnSeconds` 可更改它。
- 对于 `openai/*`，fast mode 会在受支持的 Responses 请求上发送 `service_tier=priority`，从而映射到 OpenAI 的优先级处理。
- 对于基于 Codex 的 `openai/*` / `openai-codex/*` 模型，fast mode 会在 Codex Responses 上发送相同的 `service_tier=priority` 标志。原生 Codex app-server 轮次只会在 `turn/start` 或线程开始/恢复时接收该 tier，因此 `auto` 无法给一个已经运行中的 app-server 轮次重新分层；它会应用于 OpenClaw 启动的下一个模型轮次。
- 对于直接的公开 `anthropic/*` 请求，包括发送到 `api.anthropic.com` 的 OAuth 认证流量，fast mode 会映射到 Anthropic 服务层：`/fast on` 设置 `service_tier=auto`，`/fast off` 设置 `service_tier=standard_only`。
- 对于 Anthropic 兼容路径上的 `minimax/*`，`/fast on`（或 `params.fastMode: true`）会将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。
- 当两者都设置时，显式的 Anthropic `serviceTier` / `service_tier` 模型参数会覆盖 fast-mode 默认值。OpenClaw 仍会对非 Anthropic 代理基础 URL 跳过 Anthropic 服务层注入。
- `/status` 会在 fast mode 启用时显示 `Fast`，在配置模式为 auto 时显示 `Fast:auto`。

## 详细日志指令（/verbose 或 /v）

- 级别：`on`（最少）| `full` | `off`（默认）。
- 仅包含指令的消息会切换会话 verbose 并回复 `Verbose logging enabled.` / `Verbose logging disabled.`；无效级别会返回提示而不改变状态。
- `/verbose off` 会存储一个显式的会话覆盖；可通过在 Sessions UI 中选择 `inherit` 来清除它。
- 获授权的外部通道发送者可以持久化会话 verbose 覆盖。内部 gateway/webchat 客户端需要 `operator.admin` 才能持久化。
- 内联指令只影响该条消息；否则会应用会话/全局默认值。
- 发送不带参数的 `/verbose`（或 `/verbose:`）可查看当前 verbose 级别。
- 当 verbose 打开时，发出结构化工具结果的 agent 会将每个工具调用作为各自独立的仅元数据消息回传，若可用则以前缀 `<emoji> <tool-name>: <arg>` 标记。这些工具摘要会在每个工具启动时立即发送（作为独立气泡），而不是以流式增量形式发送。
- 工具失败摘要在普通模式下仍可见，但原始错误细节后缀仅在 verbose 为 `full` 时显示。
- 当 verbose 为 `full` 时，工具输出也会在完成后转发（独立气泡，截断为安全长度）。如果你在运行过程中切换 `/verbose on|full|off`，后续的工具气泡会遵循新设置。
- `agents.defaults.toolProgressDetail` 控制 `/verbose` 工具摘要和 progress-draft 工具行的形式。使用 `"explain"`（默认）可获得简洁的人类可读标签，例如 `🛠️ Exec: checking JS syntax`；当你还想附加原始命令/详情用于调试时，使用 `"raw"`。每个 agent 的 `agents.list[].toolProgressDetail` 会覆盖默认值。
  - `explain`：`🛠️ Exec: check JS syntax for /tmp/app.js`
  - `raw`：`🛠️ Exec: check JS syntax for /tmp/app.js, node --check /tmp/app.js`

## 插件追踪指令（/trace）

- 级别：`on` | `off`（默认）。
- 仅包含指令的消息会切换会话插件追踪输出并回复 `Plugin trace enabled.` / `Plugin trace disabled.`。
- 内联指令只影响该消息；否则会应用会话/全局默认值。
- 发送不带参数的 `/trace`（或 `/trace:`）可查看当前追踪级别。
- `/trace` 比 `/verbose` 更窄：它只暴露插件拥有的追踪/调试行，例如 Active Memory 调试摘要。
- 追踪行可以出现在 `/status` 中，也可以作为正常 assistant 回复后的后续诊断消息出现。

## 推理可见性（/reasoning）

- 级别：`on|off|stream`。
- 仅包含指令的消息会切换回复中是否显示 thinking blocks。
- 启用后，reasoning 会作为一条以 `Thinking` 为前缀的**单独消息**发送。
- `stream`：当活动通道支持 reasoning 预览时，在回复生成过程中流式发送 reasoning，然后在最终答案中不包含 reasoning。
- 别名：`/reason`。
- 发送不带参数的 `/reasoning`（或 `/reasoning:`）可查看当前 reasoning 级别。
- 解析顺序：内联指令，然后是会话覆盖，再然后是每个 agent 的默认值（`agents.list[].reasoningDefault`），接着是全局默认值（`agents.defaults.reasoningDefault`），最后是回退（`off`）。

对格式错误的本地模型 reasoning 标签会采取保守处理。已闭合的 `<think>...</think>` 块在正常回复中会保持隐藏，而在已显示文本之后出现的未闭合 reasoning 也会被隐藏。如果一条回复完全包裹在一个未闭合的起始标签中，并且否则会以空文本交付，OpenClaw 会移除格式错误的起始标签并交付剩余文本。

## 相关

- 提升模式文档位于 [提升模式](/tools/elevated)。

## 心跳

- Heartbeat 探测正文使用已配置的 heartbeat 提示词（默认：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`）。heartbeat 消息中的行内指令照常生效（但请避免通过 heartbeat 更改会话默认值）。
- Heartbeat 传递默认只发送最终 payload。若还要发送单独的 `Thinking` 消息（如可用），请将 `agents.defaults.heartbeat.includeReasoning: true` 设为开启，或对单个 agent 设置 `agents.list[].heartbeat.includeReasoning: true`。

## Web chat UI

- Web 聊天的思考级别选择器会在页面加载时，镜像入站会话存储/配置中的会话已存储级别。
- 选择其他级别会通过 `sessions.patch` 立即写入会话覆盖；它不会等到下一次发送，也不是一次性的 `thinkingOnce` 覆盖。
- 当模型、推理或速度选择器的更改仍在应用中时进行发送，会等待所有待处理的选择器补丁；如果某个更改失败，消息将保持未发送状态以供查看。
- 第一个选项始终是清除覆盖的选择。它显示 `Inherited: <resolved level>`，包括在继承的思考已禁用时显示 `Inherited: Off`。
- 显式的选择器选项使用其直接级别标签，同时在有提供方标签时保留这些标签（例如，带有提供方标签的 `max` 选项显示为 `Maximum`）。
- 选择器使用网关会话行/默认值返回的 `thinkingLevels`，而 `thinkingOptions` 仅保留为旧版标签列表。浏览器 UI 不再维护自己的提供方正则列表；插件负责模型特定的级别集合。
- `/think:<level>` 仍然可用，并会更新相同的已存储会话级别，因此聊天指令和选择器会保持同步。

## 提供方配置文件

- 提供方插件可以暴露 `resolveThinkingProfile(ctx)`，用于定义模型支持的等级及默认值。
- 代理 Claude 模型的提供方插件应复用 `openclaw/plugin-sdk/provider-model-shared` 中的 `resolveClaudeThinkingProfile(modelId)`，以保持直接 Anthropic 和代理目录的一致性。
- 每个配置文件等级都有一个存储的规范 `id`（`off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`adaptive`、`max` 或 `ultra`），并且可以包含显示用的 `label`。二元提供方使用 `{ id: "low", label: "on" }`。
- 配置文件钩子在可用时会接收合并后的目录事实，包括 `reasoning`、`compat.thinkingFormat` 和 `compat.supportedReasoningEfforts`。仅当已配置的请求契约支持匹配的载荷时，才使用这些事实暴露二元或自定义配置文件。
- 需要验证显式思考覆盖的工具插件应使用 `api.runtime.agent.resolveThinkingPolicy({ provider, model, agentRuntime })` 以及 `api.runtime.agent.normalizeThinkingLevel(...)`；它们不应维护自己的提供方/模型等级列表。当工具拥有执行路径时，例如始终内嵌运行，应传入 `agentRuntime`。
- 可访问已配置自定义模型元数据的工具插件可以将 `catalog` 传入 `resolveThinkingPolicy`，以便反映 `compat.supportedReasoningEfforts` 的显式启用在插件侧校验中得到体现。
- 已发布的旧版钩子（`supportsXHighThinking`、`isBinaryThinking` 和 `resolveDefaultThinkingLevel`）仍然作为兼容性适配器保留，但新的自定义等级集合应使用 `resolveThinkingProfile`。
- 网关行/默认值会暴露 `thinkingLevels`、`thinkingOptions` 和 `thinkingDefault`，以便 ACP/chat 客户端渲染与运行时校验相同的配置文件 id 和标签。
