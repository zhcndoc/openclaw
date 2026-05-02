---
summary: "用于 /think、/fast、/verbose、/trace 以及推理可见性的指令语法"
read_when:
  - 调整 thinking、fast 模式，或 verbose 指令解析/默认值时
title: "思考级别"
---

## 它的作用

- 任何传入正文中的内联指令：`/t <level>`、`/think:<level>`，或 `/thinking <level>`。
- 级别（别名）：`off | minimal | low | medium | high | xhigh | adaptive | max`
  - minimal → “think”
  - low → “think hard”
  - medium → “think harder”
  - high → “ultrathink” (max budget)
  - xhigh → “ultrathink+” (GPT-5.2+ 和 Codex 模型，以及 Anthropic Claude Opus 4.7 的 effort)
  - adaptive → 由提供方管理的自适应思考（支持 Anthropic/Bedrock 上的 Claude 4.6、Anthropic Claude Opus 4.7，以及 Google Gemini 动态思考）
  - max → 提供方最大推理（Anthropic Claude Opus 4.7；Ollama 会将其映射为最高的原生 `think` effort）
  - `x-high`、`x_high`、`extra-high`、`extra high` 和 `extra_high` 映射为 `xhigh`。
  - `highest` 映射为 `high`。
- 提供方说明：
  - Thinking 菜单和选择器由 provider-profile 驱动。Provider 插件会为所选模型声明确切的级别集合，包括诸如二进制 `on` 之类的标签。
  - `adaptive`、`xhigh` 和 `max` 仅在支持它们的 provider/model profile 中公开。对不支持级别的输入指令会被拒绝，并给出该模型有效的选项。
  - 现有已存储的不支持级别会按 provider profile 排名重映射。`adaptive` 在非自适应模型上回退到 `medium`，而 `xhigh` 和 `max` 则回退到所选模型支持的最大非 `off` 级别。
  - Anthropic Claude 4.6 模型在未显式设置 thinking 级别时默认使用 `adaptive`。
  - Anthropic Claude Opus 4.7 不默认使用自适应思考。其 API effort 默认值仍由提供方掌控，除非你显式设置 thinking 级别。
  - Anthropic Claude Opus 4.7 会将 `/think xhigh` 映射为自适应思考加上 `output_config.effort: "xhigh"`，因为 `/think` 是一个思考指令，而 `xhigh` 是 Opus 4.7 的 effort 设置。
  - Anthropic Claude Opus 4.7 还暴露 `/think max`；它会映射到同一条由提供方掌控的最大 effort 路径。
  - DeepSeek V4 模型暴露 `/think xhigh|max`；两者都映射到 DeepSeek `reasoning_effort: "max"`，而较低的非 `off` 级别映射到 `high`。
  - Ollama 支持思考的模型暴露 `/think low|medium|high|max`；`max` 映射为原生 `think: "high"`，因为 Ollama 的原生 API 接受 `low`、`medium` 和 `high` effort 字符串。
  - OpenAI GPT 模型通过模型特定的 Responses API effort 支持来映射 `/think`。只有在目标模型支持时，`/think off` 才会发送 `reasoning.effort: "none"`；否则 OpenClaw 会省略被禁用的 reasoning 负载，而不是发送不支持的值。
  - 自定义的 OpenAI 兼容目录条目可以通过将 `models.providers.<provider>.models[].compat.supportedReasoningEfforts` 设置为包含 `"xhigh"` 来启用 `/think xhigh`。这使用了相同的兼容元数据来映射出站 OpenAI reasoning effort 负载，因此菜单、会话验证、agent CLI 和 `llm-task` 会与传输行为保持一致。
  - 过期配置的 OpenRouter Hunter Alpha refs 会跳过代理 reasoning 注入，因为该已下线路由可能会通过 reasoning 字段返回最终答案文本。
  - Google Gemini 会将 `/think adaptive` 映射为 Gemini 由提供方掌控的动态思考。Gemini 3 请求会省略固定的 `thinkingLevel`，而 Gemini 2.5 请求会发送 `thinkingBudget: -1`；固定级别仍然会映射到该模型系列最接近的 Gemini `thinkingLevel` 或 budget。
  - 通过 Anthropic 兼容流路径的 MiniMax（`minimax/*`）默认使用 `thinking: { type: "disabled" }`，除非你在模型参数或请求参数中显式设置 thinking。这样可以避免 MiniMax 非原生 Anthropic 流格式中泄漏的 `reasoning_content` 增量。
  - Z.AI（`zai/*`）仅支持二进制 thinking（`on`/`off`）。任何非 `off` 级别都视为 `on`（映射为 `low`）。
  - Moonshot（`moonshot/*`）会将 `/think off` 映射为 `thinking: { type: "disabled" }`，并将任何非 `off` 级别映射为 `thinking: { type: "enabled" }`。当 thinking 启用时，Moonshot 只接受 `tool_choice` `auto|none`；OpenClaw 会将不兼容的值规范化为 `auto`。

## 解析顺序

1. 消息中的内联指令（仅作用于该消息）。
2. 会话覆盖（通过发送仅包含指令的消息设置）。
3. 每个 agent 的默认值（配置中的 `agents.list[].thinkingDefault`）。
4. 全局默认值（配置中的 `agents.defaults.thinkingDefault`）。
5. 回退：如果可用，则使用提供方声明的默认值；否则，支持推理的模型会解析为 `medium` 或该模型支持的最接近的非 `off` 级别，而不支持推理的模型保持 `off`。

## 设置会话默认值

- 发送一条**只包含**指令的消息（允许空白），例如 `/think:medium` 或 `/t high`。
- 这会在当前会话中生效（默认按发送者区分）；可通过 `/think:off` 或会话空闲重置清除。
- 会发送确认回复（`Thinking level set to high.` / `Thinking disabled.`）。如果级别无效（例如 `/thinking big`），命令会被拒绝并给出提示，且会话状态保持不变。
- 发送 `/think`（或 `/think:`）且不带参数，可查看当前思考级别。

## 按 agent 应用

- **Embedded Pi**：解析后的级别会传递给进程内 Pi agent 运行时。

## 快速模式（/fast）

- 级别：`on|off`。
- 仅包含指令的消息会切换会话 fast-mode 覆盖并回复 `Fast mode enabled.` / `Fast mode disabled.`。
- 发送不带模式的 `/fast`（或 `/fast status`）可查看当前生效的 fast-mode 状态。
- OpenClaw 按以下顺序解析 fast mode：
  1. 内联/仅指令的 `/fast on|off`
  2. 会话覆盖
  3. 每个 agent 的默认值（`agents.list[].fastModeDefault`）
  4. 每个模型的配置：`agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. 回退：`off`
- 对于 `openai/*`，fast mode 通过在受支持的 Responses 请求上发送 `service_tier=priority` 映射为 OpenAI 优先处理。
- 对于 `openai-codex/*`，fast mode 会在 Codex Responses 上发送相同的 `service_tier=priority` 标志。OpenClaw 在这两条认证路径之间保持一个共享的 `/fast` 开关。
- 对于直接的公开 `anthropic/*` 请求，包括发送到 `api.anthropic.com` 的 OAuth 认证流量，fast mode 会映射为 Anthropic 服务层级：`/fast on` 设置 `service_tier=auto`，`/fast off` 设置 `service_tier=standard_only`。
- 对于 Anthropic 兼容路径上的 `minimax/*`，`/fast on`（或 `params.fastMode: true`）会将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。
- 当两者都设置时，显式的 Anthropic `serviceTier` / `service_tier` 模型参数会覆盖 fast-mode 默认值。OpenClaw 对非 Anthropic 代理基础 URL 仍会跳过 Anthropic 服务层级注入。
- 只有在启用 fast mode 时，`/status` 才会显示 `Fast`。

## 详细日志指令（/verbose 或 /v）

- 级别：`on`（最小） | `full` | `off`（默认）。
- 仅包含指令的消息会切换会话 verbose 并回复 `Verbose logging enabled.` / `Verbose logging disabled.`；无效级别会返回提示且不改变状态。
- `/verbose off` 会存储一个显式的会话覆盖；可在 Sessions UI 中通过选择 `inherit` 清除。
- 内联指令仅影响该消息；否则会应用会话/全局默认值。
- 发送不带参数的 `/verbose`（或 `/verbose:`）可查看当前 verbose 级别。
- 当 verbose 打开时，输出结构化工具结果的 agent（Pi、其他 JSON agents）会将每次工具调用作为各自独立的仅元数据消息返回，并在可用时以前缀 `<emoji> <tool-name>: <arg>`（path/command）显示。这些工具摘要会在每个工具启动时立即发送（分开的气泡），而不是作为流式增量发送。
- 工具失败摘要在正常模式下仍然可见，但原始错误详情后缀会被隐藏，除非 verbose 为 `on` 或 `full`。
- 当 verbose 为 `full` 时，工具输出也会在完成后转发（单独气泡，截断到安全长度）。如果你在运行进行中切换 `/verbose on|full|off`，后续的工具气泡会遵循新的设置。

## 插件追踪指令（/trace）

- 级别：`on` | `off`（默认）。
- 仅包含指令的消息会切换会话插件追踪输出并回复 `Plugin trace enabled.` / `Plugin trace disabled.`。
- 内联指令仅影响该消息；否则会应用会话/全局默认值。
- 发送不带参数的 `/trace`（或 `/trace:`）可查看当前追踪级别。
- `/trace` 比 `/verbose` 更窄：它只暴露插件拥有的追踪/调试行，例如 Active Memory 调试摘要。
- 追踪行可以出现在 `/status` 中，也可以作为正常 assistant 回复后的后续诊断消息出现。

## 推理可见性（/reasoning）

- 级别：`on|off|stream`。
- 仅包含指令的消息会切换回复中是否显示思考块。
- 启用后，reasoning 会作为一条**单独的消息**发送，并以前缀 `Reasoning:` 标识。
- `stream`（仅 Telegram）：在回复生成期间将 reasoning 流式写入 Telegram 草稿气泡，然后在不包含 reasoning 的情况下发送最终答案。
- 别名：`/reason`。
- 发送不带参数的 `/reasoning`（或 `/reasoning:`）可查看当前 reasoning 级别。
- 解析顺序：内联指令，然后是会话覆盖，然后是每个 agent 的默认值（`agents.list[].reasoningDefault`），最后是回退（`off`）。

对格式错误的本地模型 reasoning 标签会采取保守处理。已闭合的 `<think>...</think>` 块在正常回复中会保持隐藏，而在已显示文本之后出现的未闭合 reasoning 也会被隐藏。如果一条回复完全包裹在一个未闭合的起始标签中，并且否则会以空文本交付，OpenClaw 会移除格式错误的起始标签并交付剩余文本。

## 相关

- 提升模式文档位于 [Elevated mode](/tools/elevated)。

## 心跳

- 心跳探测正文是已配置的心跳提示词（默认：`如果存在，请读取 HEARTBEAT.md（工作区上下文）。严格遵循它。不要从之前的聊天中推断或重复旧任务。如果没有需要处理的内容，请回复 HEARTBEAT_OK。`）。心跳消息中的内联指令会像往常一样生效（但避免在心跳中更改会话默认值）。
- 心跳投递默认只发送最终载荷。若还要发送单独的 `Reasoning:` 消息（若可用），请设置 `agents.defaults.heartbeat.includeReasoning: true` 或针对单个 agent 设置 `agents.list[].heartbeat.includeReasoning: true`。

## Web chat UI

- Web 聊天思考选择器在页面加载时，会镜像入站 session store/config 中该会话已存储的级别。
- 选择其他级别会立即通过 `sessions.patch` 写入会话覆盖；它不会等到下一次发送，也不是一次性的 `thinkingOnce` 覆盖。
- 第一个选项始终是 `Default (<resolved level>)`，其中已解析的默认值来自当前会话模型的 provider thinking profile，以及 `/status` 和 `session_status` 使用的相同回退逻辑。
- 该选择器使用网关 session 行/defaults 返回的 `thinkingLevels`，并将 `thinkingOptions` 保留为旧版标签列表。浏览器 UI 不再维护自己的 provider 正则列表；插件负责模型特定的级别集合。
- `/think:<level>` 仍然可用，并会更新相同的已存储会话级别，因此聊天指令和选择器会保持同步。

## Provider profiles

- Provider 插件可以暴露 `resolveThinkingProfile(ctx)` 来定义模型支持的级别和默认值。
- 代理 Claude 模型的 Provider 插件应复用 `openclaw/plugin-sdk/provider-model-shared` 中的 `resolveClaudeThinkingProfile(modelId)`，以便直连 Anthropic 和代理目录保持一致。
- 每个 profile 级别都有一个已存储的规范 `id`（`off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`adaptive` 或 `max`），并且可以包含一个显示用 `label`。二进制 provider 使用 `{ id: "low", label: "on" }`。
- 需要验证显式 thinking 覆盖的工具插件，应使用 `api.runtime.agent.resolveThinkingPolicy({ provider, model })` 加上 `api.runtime.agent.normalizeThinkingLevel(...)`；它们不应保留自己的 provider/model 级别列表。
- 可访问已配置自定义模型元数据的工具插件，可以将 `catalog` 传入 `resolveThinkingPolicy`，这样 `compat.supportedReasoningEfforts` 的显式启用会反映到插件侧验证中。
- 已发布的旧版 hooks（`supportsXHighThinking`、`isBinaryThinking` 和 `resolveDefaultThinkingLevel`）仍然保留为兼容适配器，但新的自定义级别集合应使用 `resolveThinkingProfile`。
- 网关行/defaults 暴露 `thinkingLevels`、`thinkingOptions` 和 `thinkingDefault`，因此 ACP/chat 客户端呈现的 profile ids 和 labels 与运行时验证使用的保持一致。
