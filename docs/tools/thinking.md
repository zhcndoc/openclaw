---
summary: "/think、/fast、/verbose、/trace 指令语法及推理可见性"
read_when:
  - 调整思考、快速模式或详细指令的解析或默认值
title: "思考等级"
---

## 它的作用

- 任意传入正文中的内联指令：`/t <level>`、`/think:<level>` 或 `/thinking <level>`。
- 等级（别名）：`off | minimal | low | medium | high | xhigh | adaptive | max`
  - minimal → “think”
  - low → “think hard”
  - medium → “think harder”
  - high → “ultrathink”（最大预算）
  - xhigh → “ultrathink+”（GPT-5.2+ 和 Codex 模型，以及 Anthropic Claude Opus 4.7 的 effort）
  - adaptive → 提供方管理的自适应思考（支持 Anthropic/Bedrock 上的 Claude 4.6、Anthropic Claude Opus 4.7，以及 Google Gemini 动态思考）
  - max → 提供方最大推理（Anthropic Claude Opus 4.7；Ollama 会将其映射到其最高的原生 `think` effort）
  - `x-high`、`x_high`、`extra-high`、`extra high` 和 `extra_high` 映射到 `xhigh`。
  - `highest` 映射到 `high`。
- 提供方说明：
  - 思考菜单和选择器由提供方配置文件驱动。提供方插件会为所选模型声明确切的等级集合，包括如二元 `on` 这样的标签。
  - 仅对支持它们的提供方/模型配置文件公开 `adaptive`、`xhigh` 和 `max`。对不支持等级的输入指令会被拒绝，并给出该模型可用的选项。
  - 现有已存储的不支持等级会按提供方配置文件的等级重新映射。`adaptive` 在非自适应模型上回退到 `medium`，而 `xhigh` 和 `max` 会回退到所选模型支持的最大非 `off` 等级。
  - Anthropic Claude 4.6 模型在未显式设置思考等级时，默认使用 `adaptive`。
  - Anthropic Claude Opus 4.7 不会默认使用自适应思考。其 API effort 默认值仍由提供方维护，除非你显式设置思考等级。
  - Anthropic Claude Opus 4.7 会将 `/think xhigh` 映射为自适应思考加上 `output_config.effort: "xhigh"`，因为 `/think` 是思考指令，而 `xhigh` 是 Opus 4.7 的 effort 设置。
  - Anthropic Claude Opus 4.7 也提供 `/think max`；它会映射到相同的由提供方维护的最大 effort 路径。
  - Ollama 支持思考的模型公开 `/think low|medium|high|max`；`max` 映射到原生 `think: "high"`，因为 Ollama 的原生 API 接受 `low`、`medium` 和 `high` 这三种 effort 字符串。
  - OpenAI GPT 模型通过模型特定的 Responses API effort 支持来映射 `/think`。仅当目标模型支持时，`/think off` 才会发送 `reasoning.effort: "none"`；否则 OpenClaw 会省略被禁用的推理负载，而不是发送不受支持的值。
  - 过期配置的 OpenRouter Hunter Alpha 引用会跳过代理推理注入，因为该已退役路由可能通过推理字段返回最终答案文本。
  - Google Gemini 将 `/think adaptive` 映射为 Gemini 由提供方维护的动态思考。Gemini 3 请求省略固定的 `thinkingLevel`，而 Gemini 2.5 请求发送 `thinkingBudget: -1`；固定等级仍会映射到该模型家族中最接近的 Gemini `thinkingLevel` 或预算。
  - 兼容 Anthropic 的流式路径上的 MiniMax（`minimax/*`）默认使用 `thinking: { type: "disabled" }`，除非你在模型参数或请求参数中显式设置思考。这可避免来自 MiniMax 非原生 Anthropic 流格式的泄漏 `reasoning_content` 增量。
  - Z.AI（`zai/*`）只支持二元思考（`on`/`off`）。任何非 `off` 等级都会被视为 `on`（映射到 `low`）。
  - Moonshot（`moonshot/*`）会将 `/think off` 映射为 `thinking: { type: "disabled" }`，将任何非 `off` 等级映射为 `thinking: { type: "enabled" }`。启用思考时，Moonshot 只接受 `tool_choice` 为 `auto|none`；OpenClaw 会将不兼容的值归一化为 `auto`。

## 解析优先级顺序

1. 消息中的内联指令（仅应用于该消息）。
2. 会话覆盖（通过发送仅含指令的消息设置）。
3. 每个代理的默认值（配置中的 `agents.list[].thinkingDefault`）。
4. 全局默认值（配置中的 `agents.defaults.thinkingDefault`）。
5. 回退：在可用时采用提供方声明的默认值；否则，具备推理能力的模型会解析为 `medium` 或该模型支持的最接近的非 `off` 等级，而不具备推理能力的模型保持 `off`。

## 设置会话默认值

- 发送一条仅包含指令的消息（允许包含空白），例如 `/think:medium` 或 `/t high`。
- 该设置在当前会话中生效（默认按发送者区分）；可通过发送 `/think:off` 或会话空闲重置来清除。
- 会收到确认回复（如 `思考等级设置为 high.` / `思考已禁用.`）。如果等级无效（例如 `/thinking big`），指令会被拒绝并提示，且会话状态保持不变。
- 发送 `/think`（或 `/think:`）且不带参数时，可查看当前思考等级。

## 代理应用

- **嵌入式 Pi**：解析后的等级会传递给进程内的 Pi 代理运行时。

## 快速模式 (/fast)

- 等级：`on|off`。
- 仅含指令的消息会切换会话快速模式覆盖，并回复 `Fast mode enabled.` / `Fast mode disabled.`。
- 发送不带模式的 `/fast`（或 `/fast status`）可查看当前生效的快速模式状态。
- OpenClaw 按以下顺序解析快速模式：
  1. 内联/仅指令 `/fast on|off`
  2. 会话覆盖
  3. 每个代理的默认值（`agents.list[].fastModeDefault`）
  4. 每个模型配置：`agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. 回退：`off`
- 对于 `openai/*`，快速模式通过在受支持的 Responses 请求中发送 `service_tier=priority` 映射到 OpenAI 优先处理。
- 对于 `openai-codex/*`，快速模式在 Codex Responses 中发送相同的 `service_tier=priority` 标志。OpenClaw 在这两条认证路径之间保留一个共享的 `/fast` 开关。
- 对于直接公共的 `anthropic/*` 请求，包括发送到 `api.anthropic.com` 的 OAuth 认证流量，快速模式映射到 Anthropic service tiers：`/fast on` 设置 `service_tier=auto`，`/fast off` 设置 `service_tier=standard_only`。
- 对于 `minimax/*` 在兼容 Anthropic 的路径上，`/fast on`（或 `params.fastMode: true`）会将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。
- 当二者都设置时，显式的 Anthropic `serviceTier` / `service_tier` 模型参数会覆盖快速模式默认值。OpenClaw 仍会对非 Anthropic 代理基础 URL 跳过 Anthropic service tier 注入。
- 仅当快速模式启用时，`/status` 才会显示 `Fast`。

## 详细日志指令 (/verbose 或 /v)

- 等级：`on`（最小详细） | `full` | `off`（默认）。
- 仅含指令的消息会切换会话详细日志状态，并回复 `详细日志已启用。` / `详细日志已禁用。`；无效等级会返回提示且不改变状态。
- `/verbose off` 会存储显式的会话覆盖；可通过 Sessions UI 选择 `inherit` 来清除。
- 内联指令仅影响当前消息；否则应用会话/全局默认。
- 发送 `/verbose`（或 `/verbose:`）且不带参数时查看当前详细等级。
- 详细日志开启时，发出结构化工具结果的代理（Pi 及其他 JSON 代理）会将每个工具调用作为单独仅元数据消息发送，带有前缀 `<emoji> <tool-name>: <arg>`（如果可用，显示路径/命令）。这些工具摘要在工具启动时即发送（单独气泡），非流式增量。
- 工具失败摘要在常规模式下可见，但原始错误详细信息后缀仅在详细等级为 `on` 或 `full` 时显示。
- 详细等级为 `full` 时，工具输出完成后也会转发（单独气泡，截断至安全长度）。如果在运行中切换 `/verbose on|full|off`，后续工具气泡将遵循新的设置。

## 插件跟踪指令 (/trace)

- 等级：`on` | `off`（默认）。
- 仅含指令的消息会切换会话插件跟踪输出并回复 `插件跟踪已启用.` / `插件跟踪已禁用.`。
- 内联指令仅影响该消息；否则应用会话/全局默认。
- 发送 `/trace`（或 `/trace:`）且不带参数可查看当前跟踪等级。
- `/trace` 比 `/verbose` 范围更窄：它仅公开插件拥有的跟踪/调试行，例如主动内存调试摘要。
- 跟踪行可出现在 `/status` 中，以及正常助手回复后的后续诊断消息中。

## 推理可见性 (/reasoning)

- 等级：`on|off|stream`。
- 仅包含指令的消息会切换是否在回复中显示思考块。
- 启用时，推理内容作为**单独的消息**发送，前缀为 `推理：`。
- `stream`（仅限 Telegram）：在生成回复时将推理内容流式传输到 Telegram 草稿气泡，然后发送不含推理的最终答案。
- 别名：`/reason`。
- 发送不带参数的 `/reasoning`（或 `/reasoning:`）以查看当前推理等级。
- 解析顺序：内联指令，然后是会话覆盖，然后是每个代理的默认值 (`agents.list[].reasoningDefault`)，最后是回退 (`off`)。

格式不正确的本地模型推理标签会被保守处理。已闭合的 `<think>...</think>` 块在普通回复中保持隐藏；而在已可见文本之后出现的未闭合推理也会被隐藏。如果某个回复完全被单个未闭合的起始标签包裹，并且否则会以空文本返回，OpenClaw 会移除这个格式错误的起始标签并发送剩余文本。

## 相关

- 提升模式文档存放于 [提升模式](/tools/elevated) 。

## 心跳

- 心跳探测消息正文为配置的心跳提示（默认：`如果存在则阅读 HEARTBEAT.md（工作区上下文）。严格遵守。不要推断或重复先前聊天中的旧任务。如果没有需要注意的事项，回复 HEARTBEAT_OK.`）。心跳消息中的内联指令正常生效（但避免通过心跳更改会话默认）。
- 心跳默认只发送最终负载。若需同时发送独立的 `推理：` 消息（如果存在），可设置 `agents.defaults.heartbeat.includeReasoning: true` 或特定代理的 `agents.list[].heartbeat.includeReasoning: true`。

## Web 聊天界面

- Web 聊天的思考选择器在页面加载时会镜像传入会话存储/配置中的会话存储等级。
- 选择其他等级会通过 `sessions.patch` 立即写入会话覆盖；它不会等到下一次发送，也不是一次性的 `thinkingOnce` 覆盖。
- 第一个选项始终是 `Default (<resolved level>)`，其中解析后的默认值来自活动会话模型的提供方思考配置文件，以及 `/status` 和 `session_status` 使用的相同回退逻辑。
- 选择器使用网关会话行/默认值返回的 `thinkingLevels`，而 `thinkingOptions` 仅保留为旧版标签列表。浏览器 UI 不维护自己的提供方正则列表；插件负责模型特定的等级集合。
- `/think:<level>` 仍然有效，并会更新同一个已存储的会话等级，因此聊天指令和选择器会保持同步。

## 提供方配置文件

- 提供方插件可以暴露 `resolveThinkingProfile(ctx)` 来定义模型支持的等级和默认值。
- 代理 Claude 模型的提供方插件应复用 `openclaw/plugin-sdk/provider-model-shared` 中的 `resolveClaudeThinkingProfile(modelId)`，以便直接 Anthropic 和代理目录保持一致。
- 每个配置文件等级都有一个存储的规范 `id`（`off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`adaptive` 或 `max`），并且可能包含显示用 `label`。二元提供方使用 `{ id: "low", label: "on" }`。
- 需要验证显式思考覆盖的工具插件应使用 `api.runtime.agent.resolveThinkingPolicy({ provider, model })` 以及 `api.runtime.agent.normalizeThinkingLevel(...)`；它们不应自行维护提供方/模型等级列表。
- 已发布的旧版钩子（`supportsXHighThinking`、`isBinaryThinking` 和 `resolveDefaultThinkingLevel`）仍作为兼容适配器保留，但新的自定义等级集合应使用 `resolveThinkingProfile`。
- 网关行/默认值会暴露 `thinkingLevels`、`thinkingOptions` 和 `thinkingDefault`，以便 ACP/聊天客户端呈现运行时验证所使用的相同配置文件 id 和标签。
