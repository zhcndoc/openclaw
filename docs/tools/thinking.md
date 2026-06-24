---
summary: "用于 /think、/fast、/verbose、/trace 以及推理可见性的指令语法"
read_when:
  - 调整 thinking、fast 模式，或 verbose 指令解析/默认值时
title: "思考级别"
---

## 它的作用

- 任意传入正文中的内联指令：`/t <level>`、`/think:<level>` 或 `/thinking <level>`。
- 级别（别名）：`off | minimal | low | medium | high | xhigh | adaptive | max`
  - minimal → "think"
  - low → "think hard"
  - medium → "think harder"
  - high → "ultrathink"（最大预算）
  - xhigh → "ultrathink+"（GPT-5.2+ 和 Codex 模型，以及 Anthropic Claude Opus 4.7+ 的 effort）
  - adaptive → 由提供方管理的自适应思考（Anthropic/Bedrock 上支持 Claude 4.6、Anthropic Claude Opus 4.7+，以及 Google Gemini 动态思考）
  - max → 提供方最大推理（Anthropic Claude Opus 4.7+；Ollama 会将其映射为其最高的原生 `think` effort）
  - `x-high`、`x_high`、`extra-high`、`extra high` 和 `extra_high` 都映射到 `xhigh`。
  - `highest` 映射到 `high`。
- 提供方说明：
  - Thinking 菜单和选择器由提供方配置文件驱动。提供方插件会为所选模型声明精确的级别集合，包括诸如二元 `on` 之类的标签。
  - `adaptive`、`xhigh` 和 `max` 仅在支持它们的提供方/模型配置中展示。对不支持级别输入的指令会被拒绝，并返回该模型的有效选项。
  - 已存储的不受支持级别会按提供方配置文件等级重新映射。`adaptive` 在非自适应模型上回退为 `medium`，而 `xhigh` 和 `max` 会回退到所选模型支持的最大非 `off` 级别。
  - Anthropic Claude 4.6 模型在未设置明确 thinking 级别时，默认使用 `adaptive`。
  - Anthropic Claude Opus 4.8 和 Opus 4.7 在你未显式设置 thinking 级别时保持关闭。启用自适应 thinking 后，Opus 4.8 由提供方控制的 effort 默认值为 `high`。
  - Anthropic Claude Opus 4.7+ 会将 `/think xhigh` 映射为自适应 thinking 加上 `output_config.effort: "xhigh"`，因为 `/think` 是 thinking 指令，而 `xhigh` 是 Opus 的 effort 设置。
  - Anthropic Claude Opus 4.7+ 也暴露 `/think max`；它会映射到同一条由提供方控制的 max effort 路径。
  - 直接的 DeepSeek V4 模型暴露 `/think xhigh|max`；二者都映射到 DeepSeek `reasoning_effort: "max"`，而较低的非 `off` 级别映射到 `high`。
  - 通过 OpenRouter 路由的 DeepSeek V4 模型暴露 `/think xhigh`，并发送 OpenRouter 支持的 `reasoning_effort` 值。已存储的 `max` 覆盖会回退到 `xhigh`。
  - 支持 thinking 的 Ollama 模型暴露 `/think low|medium|high|max`；`max` 会映射为原生 `think: "high"`，因为 Ollama 的原生 API 接受 `low`、`medium` 和 `high` effort 字符串。
  - OpenAI GPT 模型通过模型特定的 Responses API effort 支持来映射 `/think`。只有当目标模型支持时，`/think off` 才会发送 `reasoning.effort: "none"`；否则 OpenClaw 会省略已禁用的 reasoning 负载，而不是发送不受支持的值。
  - 自定义 OpenAI 兼容目录项可以通过将 `models.providers.<provider>.models[].compat.supportedReasoningEfforts` 设置为包含 `"xhigh"` 来启用 `/think xhigh`。这使用了相同的兼容元数据来映射出站 OpenAI reasoning effort 负载，因此菜单、会话验证、agent CLI 和 `llm-task` 会与传输行为保持一致。
  - 过期的已配置 OpenRouter Hunter Alpha 引用会跳过代理推理注入，因为该已退役路由可能会通过 reasoning 字段返回最终答案文本。
  - Google Gemini 将 `/think adaptive` 映射为 Gemini 由提供方控制的动态思考。Gemini 3 请求会省略固定的 `thinkingLevel`，而 Gemini 2.5 请求会发送 `thinkingBudget: -1`；固定级别仍会映射到该模型系列中最接近的 Gemini `thinkingLevel` 或 budget。
  - MiniMax M2.x（`minimax/MiniMax-M2*`）在 Anthropic 兼容流式路径上，默认 `thinking: { type: "disabled" }`，除非你在模型参数或请求参数中显式设置 thinking。这样可避免从 M2.x 的非原生 Anthropic 流格式中泄漏 `reasoning_content` 增量。MiniMax-M3（以及 M3.x）是例外：M3 会发出正确的 Anthropic thinking 块，并在 thinking 关闭时返回空内容，因此 OpenClaw 会让 M3 走提供方省略/adaptive thinking 路径。
  - Z.AI（`zai/*`）对于大多数 GLM 模型是二元（`on`/`off`）的。GLM-5.2 是例外：它暴露 `/think off|low|high|max`，将 `low` 和 `high` 映射为 Z.AI `reasoning_effort: "high"`，并将 `max` 映射为 `reasoning_effort: "max"`。
  - Moonshot Kimi K2.7 Code（`moonshot/kimi-k2.7-code`）始终会思考。其配置文件只暴露 `on`，并且 OpenClaw 会按 Moonshot 要求省略出站 `thinking` 字段。其他 `moonshot/*` 模型会将 `/think off` 映射为 `thinking: { type: "disabled" }`，将任何非 `off` 级别映射为 `thinking: { type: "enabled" }`。当 thinking 启用时，Moonshot 只接受 `tool_choice` 为 `auto|none`；OpenClaw 会将不兼容值规范化为 `auto`。

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

- **Embedded OpenClaw**：解析后的级别会传递给进程内 OpenClaw agent 运行时。
- **Claude CLI backend**：在使用 `claude-cli` 时，非 `off` 级别会作为 `--effort` 传递给 Claude Code；参见 [CLI backends](/gateway/cli-backends)。

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

- 级别：`on`（minimal）| `full` | `off`（默认）。
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

- 提升模式文档位于 [Elevated mode](/tools/elevated)。

## 心跳

- Heartbeat 探测正文使用已配置的 heartbeat 提示词（默认：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`）。heartbeat 消息中的行内指令照常生效（但请避免通过 heartbeat 更改会话默认值）。
- Heartbeat 传递默认只发送最终 payload。若还要发送单独的 `Thinking` 消息（如可用），请将 `agents.defaults.heartbeat.includeReasoning: true` 设为开启，或对单个 agent 设置 `agents.list[].heartbeat.includeReasoning: true`。

## Web chat UI

- Web chat 的 thinking 选择器在页面加载时，会镜像入站会话存储/配置中的已存级别。
- 选择其他级别会立即通过 `sessions.patch` 写入会话覆盖值；它不会等待下一次发送，也不是一次性的 `thinkingOnce` 覆盖。
- 第一个选项始终是清除覆盖值的选项。它会显示 `Inherited: <resolved level>`，包括继承的 thinking 被禁用时显示 `Inherited: Off`。
- 显式选择器选项使用其直接级别标签，同时在存在提供方标签时保留它们（例如，提供方标记的 `max` 选项显示为 `Maximum`）。
- 选择器使用的是网关会话行/默认值返回的 `thinkingLevels`，而 `thinkingOptions` 仅保留为旧版标签列表。浏览器 UI 不维护自己的提供方正则列表；插件负责各模型特定的级别集合。
- `/think:<level>` 仍然有效，并会更新同一个已存会话级别，因此聊天指令和选择器会保持同步。

## Provider profiles

- Provider 插件可以暴露 `resolveThinkingProfile(ctx)`，用于定义模型支持的级别及其默认值。
- 代理 Claude 模型的 Provider 插件应复用 `openclaw/plugin-sdk/provider-model-shared` 中的 `resolveClaudeThinkingProfile(modelId)`，以便直接 Anthropic 和代理目录保持一致。
- 每个 profile 级别都有一个已存的规范 `id`（`off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`adaptive` 或 `max`），并且可以包含显示用 `label`。二元 provider 使用 `{ id: "low", label: "on" }`。
- Profile 钩子在可用时会接收合并后的目录事实，包括 `reasoning`、`compat.thinkingFormat` 和 `compat.supportedReasoningEfforts`。只有当已配置的请求契约支持匹配的 payload 时，才应使用这些事实暴露二元或自定义 profile。
- 需要校验显式 thinking 覆盖值的工具插件，应使用 `api.runtime.agent.resolveThinkingPolicy({ provider, model })` 加上 `api.runtime.agent.normalizeThinkingLevel(...)`；它们不应维护自己的 provider/model 级别列表。
- 若工具插件能访问已配置的自定义模型元数据，可以将 `catalog` 传入 `resolveThinkingPolicy`，以反映 `compat.supportedReasoningEfforts` 的 opt-in 在插件侧校验中的体现。
- 已发布的旧版钩子（`supportsXHighThinking`、`isBinaryThinking` 和 `resolveDefaultThinkingLevel`）仍作为兼容适配器保留，但新的自定义级别集合应使用 `resolveThinkingProfile`。
- 网关行/默认值会暴露 `thinkingLevels`、`thinkingOptions` 和 `thinkingDefault`，使 ACP/chat 客户端渲染出与运行时校验使用的相同 profile id 和标签。
