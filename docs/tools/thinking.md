---
summary: "用于 /think、/fast、/verbose、/trace 以及推理可见性的指令语法"
read_when:
  - 调整 thinking、fast 模式，或 verbose 指令解析/默认值时
title: "思考级别"
---

## 它的作用

- 任意入站正文中的内联指令：`/t <level>`、`/think:<level>` 或 `/thinking <level>`。
- 级别（别名）：`off | minimal | low | medium | high | xhigh | adaptive | max`
  - minimal → "think"
  - low → "think hard"
  - medium → "think harder"
  - high → "ultrathink"（最大预算）
  - xhigh → "ultrathink+"（GPT-5.2+ 和 Codex 模型，以及 Anthropic Claude Opus 4.7 effort）
  - adaptive → 提供方管理的自适应思考（支持 Anthropic/Bedrock 上的 Claude 4.6、Anthropic Claude Opus 4.7，以及 Google Gemini dynamic thinking）
  - max → 提供方最大推理（Anthropic Claude Opus 4.7；Ollama 会将其映射为其最高原生的 `think` effort）
  - `x-high`、`x_high`、`extra-high`、`extra high` 和 `extra_high` 都映射到 `xhigh`。
  - `highest` 映射到 `high`。
- 提供方说明：
  - 思考菜单和选择器由提供方配置文件驱动。提供方插件会为所选模型声明精确的级别集合，包括诸如二元 `on` 之类的标签。
  - `adaptive`、`xhigh` 和 `max` 仅在支持它们的提供方/模型配置文件中公开。对不受支持级别的输入指令会被拒绝，并返回该模型的有效选项。
  - 现有已存储但不受支持的级别会按提供方配置文件排名重新映射。`adaptive` 在非自适应模型上回退到 `medium`，而 `xhigh` 和 `max` 则回退到所选模型支持的最高非 `off` 级别。
  - Anthropic Claude 4.6 模型在未显式设置思考级别时默认使用 `adaptive`。
  - Anthropic Claude Opus 4.7 不会默认使用自适应思考。其 API effort 默认值保持由提供方管理，除非你显式设置了思考级别。
  - Anthropic Claude Opus 4.7 会将 `/think xhigh` 映射为自适应思考加上 `output_config.effort: "xhigh"`，因为 `/think` 是思考指令，而 `xhigh` 是 Opus 4.7 的 effort 设置。
  - Anthropic Claude Opus 4.7 也公开 `/think max`；它会映射到相同的由提供方管理的最大 effort 路径。
  - 直接的 DeepSeek V4 模型公开 `/think xhigh|max`；二者都会映射到 DeepSeek `reasoning_effort: "max"`，而更低的非 `off` 级别则映射为 `high`。
  - 通过 OpenRouter 路由的 DeepSeek V4 模型公开 `/think xhigh`，并发送 OpenRouter 支持的 `reasoning_effort` 值。已存储的 `max` 覆盖会回退到 `xhigh`。
  - 支持思考的 Ollama 模型公开 `/think low|medium|high|max`；`max` 映射为原生 `think: "high"`，因为 Ollama 的原生 API 接受 `low`、`medium` 和 `high` 这几种 effort 字符串。
  - OpenAI GPT 模型通过特定于模型的 Responses API effort 支持来映射 `/think`。仅当目标模型支持时，`/think off` 才会发送 `reasoning.effort: "none"`；否则 OpenClaw 会省略已禁用的推理负载，而不是发送不受支持的值。
  - 自定义 OpenAI 兼容目录条目可以通过将 `models.providers.<provider>.models[].compat.supportedReasoningEfforts` 设置为包含 `"xhigh"` 来启用 `/think xhigh`。这使用与映射出站 OpenAI reasoning effort 负载相同的兼容元数据，因此菜单、会话校验、agent CLI 和 `llm-task` 会与传输行为保持一致。
  - 已失效配置的 OpenRouter Hunter Alpha 引用会跳过代理推理注入，因为该已下线路由可能会通过 reasoning 字段返回最终答案文本。
  - Google Gemini 将 `/think adaptive` 映射为 Gemini 由提供方管理的 dynamic thinking。Gemini 3 请求会省略固定的 `thinkingLevel`，而 Gemini 2.5 请求会发送 `thinkingBudget: -1`；固定级别仍会映射为该模型家族中最接近的 Gemini `thinkingLevel` 或 budget。
  - MiniMax（`minimax/*`）在 Anthropic 兼容流式路径上，默认 `thinking: { type: "disabled" }`，除非你在模型参数或请求参数中显式设置了 thinking。这可以避免 MiniMax 非原生 Anthropic 流格式中泄漏的 `reasoning_content` 增量。
  - Z.AI（`zai/*`）仅支持二元 thinking（`on`/`off`）。任何非 `off` 级别都被视为 `on`（映射为 `low`）。
  - Moonshot（`moonshot/*`）会将 `/think off` 映射为 `thinking: { type: "disabled" }`，并将任何非 `off` 级别映射为 `thinking: { type: "enabled" }`。启用 thinking 时，Moonshot 只接受 `tool_choice` 为 `auto|none`；OpenClaw 会将不兼容的值规范化为 `auto`。

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

- **Embedded Pi**：解析后的级别会传递给进程内 Pi agent 运行时。
- **Claude CLI backend**：在使用 `claude-cli` 时，非 `off` 级别会作为 `--effort` 传递给 Claude Code；参见 [CLI backends](/gateway/cli-backends)。

## 快速模式（/fast）

- 级别：`on|off|default`。
- 仅包含指令的消息会切换会话 fast-mode 覆盖并回复 `Fast mode enabled.` / `Fast mode disabled.`。使用 `/fast default` 可清除会话覆盖并继承已配置默认值；别名包括 `inherit`、`clear`、`reset` 和 `unpin`。
- 发送不带模式参数的 `/fast`（或 `/fast status`）即可查看当前生效的 fast-mode 状态。
- OpenClaw 按以下顺序解析 fast mode：
  1. 内联/仅指令的 `/fast on|off` 覆盖（`/fast default` 清除此层）
  2. 会话覆盖
  3. 每个 agent 的默认值（`agents.list[].fastModeDefault`）
  4. 每个模型的配置：`agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. 回退：`off`
- 对于 `openai/*`，fast mode 通过在受支持的 Responses 请求中发送 `service_tier=priority` 映射到 OpenAI priority processing。
- 对于 `openai-codex/*`，fast mode 会在 Codex Responses 上发送相同的 `service_tier=priority` 标志。OpenClaw 在这两条认证路径之间保持一个共享的 `/fast` 开关。
- 对于直接的公共 `anthropic/*` 请求，包括发送到 `api.anthropic.com` 的 OAuth 认证流量，fast mode 会映射到 Anthropic service tiers：`/fast on` 设置 `service_tier=auto`，`/fast off` 设置 `service_tier=standard_only`。
- 对于 Anthropic 兼容路径上的 `minimax/*`，`/fast on`（或 `params.fastMode: true`）会将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。
- 当两者都设置时，显式的 Anthropic `serviceTier` / `service_tier` 模型参数会覆盖 fast-mode 默认值。对于非 Anthropic 代理 base URL，OpenClaw 仍会跳过 Anthropic service-tier 注入。
- 仅当 fast mode 启用时，`/status` 才会显示 `Fast`。

## 详细日志指令（/verbose 或 /v）

- 级别：`on`（minimal）| `full` | `off`（默认）。
- 仅包含指令的消息会切换会话 verbose 并回复 `Verbose logging enabled.` / `Verbose logging disabled.`；无效级别会返回提示而不会更改状态。
- `/verbose off` 会存储一个显式会话覆盖；可在 Sessions UI 中选择 `inherit` 来清除它。
- 内联指令仅影响该消息；否则会应用会话/全局默认值。
- 发送不带参数的 `/verbose`（或 `/verbose:`）可查看当前 verbose 级别。
- 启用 verbose 时，会产出结构化工具结果的 agent（Pi、其他 JSON agents）会将每次工具调用作为各自的仅元数据消息回传，若可用则以前缀 `<emoji> <tool-name>: <arg>` 标记。这些工具摘要会在每个工具启动时立即发送（独立气泡），而不是作为流式增量发送。
- 工具失败摘要在正常模式下仍可见，但原始错误详情后缀会被隐藏，除非 verbose 为 `on` 或 `full`。
- 当 verbose 为 `full` 时，工具输出也会在完成后转发（独立气泡，截断到安全长度）。如果你在运行进行中切换 `/verbose on|full|off`，后续的工具气泡会遵循新设置。
- `agents.defaults.toolProgressDetail` 控制 `/verbose` 工具摘要和 progress-draft 工具行的形式。使用 `"explain"`（默认）可获得简洁的人类标签，例如 `🛠️ Exec: checking JS syntax`；使用 `"raw"` 则会同时附加原始命令/详情以便调试。每个 agent 可通过 `agents.list[].toolProgressDetail` 覆盖默认值。
  - `explain`：`🛠️ Exec: check JS syntax for /tmp/app.js`
  - `raw`：`🛠️ Exec: check JS syntax for /tmp/app.js, node --check /tmp/app.js`

## 插件追踪指令（/trace）

- 级别：`on` | `off`（默认）。
- 仅包含指令的消息会切换会话插件追踪输出并回复 `Plugin trace enabled.` / `Plugin trace disabled.`。
- 内联指令仅影响该消息；否则会应用会话/全局默认值。
- 发送不带参数的 `/trace`（或 `/trace:`）可查看当前追踪级别。
- `/trace` 比 `/verbose` 更窄：它只暴露插件拥有的追踪/调试行，例如 Active Memory 调试摘要。
- 追踪行可以出现在 `/status` 中，也可以作为正常 assistant 回复后的后续诊断消息出现。

## 推理可见性（/reasoning）

- 级别：`on|off|stream`。
- 仅包含指令的消息会切换是否在回复中显示 thinking 块。
- 启用后，reasoning 会作为一条**单独消息**发送，并以前缀 `Reasoning:` 标识。
- `stream`（仅 Telegram）：在回复生成时将 reasoning 流式写入 Telegram 草稿气泡，然后在最终答案中不包含 reasoning。
- 别名：`/reason`。
- 发送不带参数的 `/reasoning`（或 `/reasoning:`）可查看当前 reasoning 级别。
- 解析顺序：内联指令，其次是会话覆盖，然后是每个 agent 的默认值（`agents.list[].reasoningDefault`），再然后是全局默认值（`agents.defaults.reasoningDefault`），最后回退（`off`）。

对格式错误的本地模型 reasoning 标签会采取保守处理。已闭合的 `<think>...</think>` 块在正常回复中会保持隐藏，而在已显示文本之后出现的未闭合 reasoning 也会被隐藏。如果一条回复完全包裹在一个未闭合的起始标签中，并且否则会以空文本交付，OpenClaw 会移除格式错误的起始标签并交付剩余文本。

## 相关

- 提升模式文档位于 [Elevated mode](/tools/elevated)。

## 心跳

- 心跳探测正文是已配置的心跳提示词（默认：`如果存在，请读取 HEARTBEAT.md（工作区上下文）。严格遵循它。不要从之前的聊天中推断或重复旧任务。如果没有需要处理的内容，请回复 HEARTBEAT_OK。`）。心跳消息中的内联指令会像往常一样生效（但避免在心跳中更改会话默认值）。
- 心跳投递默认只发送最终载荷。若还要发送单独的 `Reasoning:` 消息（若可用），请设置 `agents.defaults.heartbeat.includeReasoning: true` 或针对单个 agent 设置 `agents.list[].heartbeat.includeReasoning: true`。

## Web chat UI

- 网页聊天的思考选择器在页面加载时会镜像入站会话存储/配置中的会话已存储级别。
- 选择其他级别会立即通过 `sessions.patch` 写入会话覆盖；它不会等到下一次发送，也不是一次性的 `thinkingOnce` 覆盖。
- 第一个选项始终是清除覆盖的选项。当会话继承了一个非 `off` 的有效默认值时，它会显示 `Inherited: <resolved level>`；当继承的 thinking 被禁用时，则显示 `Off`。
- 显式的选择器选项会标记为覆盖，同时在有提供方标签时保留它们（例如，对带有提供方标签的 `max` 选项显示 `Override: maximum`）。
- 选择器使用 gateway session 行/defaults 返回的 `thinkingLevels`，而 `thinkingOptions` 仅作为旧版标签列表保留。浏览器 UI 不维护自己的提供方正则列表；各插件负责具体模型的级别集合。
- `/think:<level>` 仍然可用，并会更新相同的已存储会话级别，因此聊天指令和选择器会保持同步。

## Provider profiles

- Provider 插件可以暴露 `resolveThinkingProfile(ctx)` 来定义模型支持的级别和默认值。
- 代理 Claude 模型的 Provider 插件应复用 `openclaw/plugin-sdk/provider-model-shared` 中的 `resolveClaudeThinkingProfile(modelId)`，以便直连 Anthropic 和代理目录保持一致。
- 每个 profile 级别都有一个已存储的规范 `id`（`off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`adaptive` 或 `max`），并且可以包含一个显示用 `label`。二进制 provider 使用 `{ id: "low", label: "on" }`。
- 需要验证显式 thinking 覆盖的工具插件，应使用 `api.runtime.agent.resolveThinkingPolicy({ provider, model })` 加上 `api.runtime.agent.normalizeThinkingLevel(...)`；它们不应保留自己的 provider/model 级别列表。
- 可访问已配置自定义模型元数据的工具插件，可以将 `catalog` 传入 `resolveThinkingPolicy`，这样 `compat.supportedReasoningEfforts` 的显式启用会反映到插件侧验证中。
- 已发布的旧版 hooks（`supportsXHighThinking`、`isBinaryThinking` 和 `resolveDefaultThinkingLevel`）仍然保留为兼容适配器，但新的自定义级别集合应使用 `resolveThinkingProfile`。
- 网关行/defaults 暴露 `thinkingLevels`、`thinkingOptions` 和 `thinkingDefault`，因此 ACP/chat 客户端呈现的 profile ids 和 labels 与运行时验证使用的保持一致。
