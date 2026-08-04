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
  - adaptive → 提供方管理的自适应思考（Anthropic/Bedrock 上的 Claude 4.6、Anthropic Claude Opus 4.7+ 以及 Google Gemini 动态思考支持）
  - max → 提供方最大推理（Anthropic Claude Opus 4.7+；Ollama 将其映射为原生 `think` 的最高 effort）
  - ultra → 提供方最大推理，并在所选模型/运行时支持时主动编排子代理
  - `x-high`、`x_high`、`extra-high`、`extra high` 和 `extra_high` 都映射为 `xhigh`。
  - `highest` 映射为 `high`。
- 提供方说明：
  - 思考菜单和选择器由 provider profile 驱动。提供方插件会为所选模型声明精确的级别集合，包括诸如二元 `on` 之类的标签。
  - `adaptive`、`xhigh`、`max` 和 `ultra` 仅在支持它们的 provider/model/runtime profile 中展示。对不支持级别输入的指令会被拒绝，并返回该模型有效的选项。
  - 现有已存储但不受支持的级别会按 provider profile 的等级重新映射。`adaptive` 在非自适应模型上回退到 `medium`，而 `xhigh` 和 `max` 则回退到所选模型支持的最高非关闭级别。
  - Anthropic Claude 4.6 模型在未显式设置 thinking 级别时默认使用 `adaptive`。
  - Anthropic Claude Opus 4.8 和 Opus 4.7 会保持 thinking 关闭，除非你显式设置 thinking 级别。启用自适应 thinking 后，Opus 4.8 的 provider-owned effort 默认值为 `high`。
  - Anthropic Claude Opus 4.7+ 会将 `/think xhigh` 映射为自适应 thinking 加上 `output_config.effort: "xhigh"`，因为 `/think` 是 thinking 指令，而 `xhigh` 是 Opus 的 effort 设置。
  - Anthropic Claude Opus 4.7+ 也暴露 `/think max`；它会映射到相同的 provider-owned max effort 路径。
  - 直接的 DeepSeek V4 模型暴露 `/think xhigh|max`；两者都映射到 DeepSeek `reasoning_effort: "max"`，而较低的非关闭级别映射到 `high`。
  - 通过 OpenRouter 路由的 DeepSeek V4 模型暴露 `/think xhigh`，并发送 OpenRouter 支持的 `reasoning.effort` 值，而不是 DeepSeek 原生的顶层 `reasoning_effort`。较低的非关闭级别映射到 `high`，而已存储的 `max` 覆盖会回退到 `xhigh`。
  - 支持 thinking 的 Ollama 模型暴露 `/think low|medium|high|max`；`max` 映射到原生 `think: "high"`，因为 Ollama 的原生 API 接受 `low`、`medium` 和 `high` effort 字符串。
  - OpenAI GPT 模型通过模型特定的 Responses API effort 支持来映射 `/think`。仅当目标模型支持时，`/think off` 才发送 `reasoning.effort: "none"`；否则 OpenClaw 会省略被禁用的 reasoning 负载，而不是发送不受支持的值。
  - GPT-5.6 Sol 和 Terra 通过 Codex runtime 暴露原生 `/think ultra`。GPT-5.6 Luna 通过 `max` 暴露级别，因为其 Codex 目录不声明 Ultra。
  - 内嵌的 OpenClaw runtime 为 GPT-5.6 Sol、Terra 和 Luna 暴露逻辑上的 `/think ultra`。它会发送 provider max effort，并添加运行范围内的主动式子代理编排指引。
  - 自定义的 OpenAI 兼容目录条目可以通过设置 `models.providers.<provider>.models[].compat.supportedReasoningEfforts` 包含 `"xhigh"` 来接入 `/think xhigh`。这使用了同一套 compat 元数据来映射发出的 OpenAI reasoning effort 负载，因此菜单、会话验证、agent CLI 和 `llm-task` 都会与传输行为保持一致。
  - 过期配置的 OpenRouter Hunter Alpha 引用会跳过代理 reasoning 注入，因为该已退役路由可能会通过 reasoning 字段返回最终答案文本。
  - Google Gemini 将 `/think adaptive` 映射为 Gemini 的 provider-owned dynamic thinking。Gemini 3 请求会省略固定的 `thinkingLevel`，而 Gemini 2.5 请求会发送 `thinkingBudget: -1`；固定级别仍会映射到该模型家族中最接近的 Gemini `thinkingLevel` 或 budget。
  - MiniMax M2.x（`minimax/MiniMax-M2*`）在 Anthropic 兼容流式路径上，默认 `thinking: { type: "disabled" }`，除非你在模型参数或请求参数中显式设置 thinking。这样可以避免从 M2.x 非原生 Anthropic 流格式中泄漏出的 `reasoning_content` 增量。MiniMax-M3（以及 M3.x）不受此限制：M3 会发出正确的 Anthropic thinking blocks，并在 thinking 被禁用时返回空内容，因此 OpenClaw 会让 M3 走 provider 的省略/adaptive thinking 路径。
  - Z.AI（`zai/*`）对大多数 GLM 模型是二元（`on`/`off`）。GLM-5.2 是例外：它暴露 `/think off|low|high|max`，将 `low` 和 `high` 映射到 Z.AI `reasoning_effort: "high"`，并将 `max` 映射到 `reasoning_effort: "max"`。
  - Moonshot API Kimi K3（`moonshot/kimi-k3`）始终以 `max` 思考，发送 `reasoning_effort: "max"`，省略 K2 的 `thinking` 字段和固定采样覆盖，并保留 K3 支持的工具选择。Kimi Code K3（`kimi/k3` 和 `kimi/k3-256k`）暴露完整的 `/think` 阶梯，默认值为 `high`：`off` 发送 `thinking.type: "disabled"`，`minimal`/`low` 映射为 low effort，`medium`/`high`/`adaptive` 映射为 high effort，而 `xhigh`/`max` 映射为 max effort。当前的 Kimi Code 引用还包括 `kimi/kimi-for-coding` 和 `kimi/kimi-for-coding-highspeed`。Kimi K2.7 Code（`moonshot/kimi-k2.7-code` 和 `moonshot/kimi-k2.7-code-highspeed`）始终思考，只暴露 `on`，并省略出站的 `thinking` 和 `reasoning_effort`。其他 `moonshot/*` 模型将 `/think off` 映射为 `thinking: { type: "disabled" }`，并将任何非 `off` 级别映射为 `thinking: { type: "enabled" }`。当启用 K2 thinking 时，Moonshot 仅接受 `tool_choice` `auto|none`；OpenClaw 会将不兼容的值标准化为 `auto`】【。

## 解析顺序

1. 消息上的行内指令（仅适用于该消息）。
2. 会话覆盖（通过发送仅包含指令的消息进行设置）。
3. 每个代理的默认值（配置中的 `agents.entries.*.thinkingDefault`）。
4. 全局默认值（配置中的 `agents.defaults.thinkingDefault`）。
5. 回退：如果可用，则使用提供方声明的默认值；否则，具备推理能力的模型解析为 `medium` 或该模型支持的最接近的非 `off` 级别，而不具备推理能力的模型保持 `off`。

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
- 仅指令消息会切换会话级快速模式覆盖，并回复 `Fast mode set to auto.`, `Fast mode enabled.`, 或 `Fast mode disabled.`。使用 `/fast default` 可清除此会话覆盖并继承已配置的默认值；别名包括 `inherit`, `clear`, `reset`, 和 `unpin`。
- 发送不带模式的 `/fast`（或 `/fast status`）以查看当前生效的快速模式状态。
- OpenClaw 按以下顺序解析快速模式：
  1. 行内/仅指令的 `/fast auto|on|off` 覆盖（`/fast default` 清除此层）
  2. 会话覆盖
  3. 每个代理的默认值（`agents.entries.*.fastModeDefault`）
  4. 每个模型的配置：`agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. 回退：`off`
- `auto` 会保持会话/配置模式为 auto，但会独立解析每次新的模型调用。开始时间早于 auto 截止时间的调用会启用快速模式；之后的重试、回退、工具结果或续接调用会以关闭快速模式启动。截止时间默认是 60 秒；可在当前激活模型上设置 `agents.defaults.models["<provider>/<model>"].params.fastAutoOnSeconds` 来更改。
- 对于 `openai/*`，快速模式通过在受支持的 Responses 请求中发送 `service_tier=priority` 映射为 OpenAI priority processing。
- 对于基于 Codex 的 `openai/*` / `openai-codex/*` 模型，快速模式会在 Codex Responses 上发送相同的 `service_tier=priority` 标志。原生 Codex app-server 回合只会在 `turn/start` 或线程开始/恢复时接收该层级，因此 `auto` 不能将某个已经运行中的 app-server 回合重新分层；它会应用于 OpenClaw 发起的下一次模型回合。
- 对于直接的公共 `anthropic/*` 请求，包括发送到 `api.anthropic.com` 的 OAuth 认证流量，快速模式会映射为 Anthropic service tiers：`/fast on` 设置 `service_tier=auto`，`/fast off` 设置 `service_tier=standard_only`。
- 对于 Anthropic 兼容路径上的 `minimax/*`，`/fast on`（或 `params.fastMode: true`）会将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。
- 当同时设置时，显式的 Anthropic `serviceTier` / `service_tier` 模型参数会覆盖快速模式默认值。OpenClaw 对非 Anthropic 代理 base URL 仍会跳过 Anthropic service-tier 注入。
- `/status` 在快速模式启用时显示 `Fast`，在配置模式为 auto 时显示 `Fast:auto`。

## 详细日志指令（/verbose 或 /v）

- 级别：`on`（最小） | `full` | `off`（默认）。
- 仅指令消息会切换会话详细日志，并回复 `Verbose logging enabled.` / `Verbose logging disabled.`；无效级别会返回提示而不更改状态。
- `/verbose off` 会保存显式的会话覆盖；可通过会话 UI 选择 `inherit` 来清除它。
- 经授权的外部通道发送者可以持久化会话详细日志覆盖。内部网关/webchat 客户端需要 `operator.admin` 才能持久化它。
- 行内指令只影响该条消息；否则适用会话/全局默认值。
- 发送 `/verbose`（或 `/verbose:`）且不带参数，可查看当前详细日志级别。
- 当详细日志处于开启状态时，输出结构化工具结果的 agents 会将每次工具调用作为单独的仅元数据消息返回，并在可用时以前缀 `<emoji> <tool-name>: <arg>` 形式显示。此类工具摘要会在每个工具启动时立即发送（独立气泡），而不是以流式增量发送。
- 工具失败摘要在普通模式下仍可见，但除非详细日志为 `full`，否则会隐藏原始错误详情后缀。
- 当详细日志为 `full` 时，工具输出也会在完成后转发（独立气泡，截断到安全长度）。如果你在运行过程中切换 `/verbose on|full|off`，后续的工具气泡会遵循新设置。
- `agents.defaults.toolProgressDetail` 控制 `/verbose` 工具摘要和进度草稿工具行的形式。使用 `"explain"`（默认）可获得紧凑的人类可读标签，例如 `🛠️ Exec: 检查 JS 语法`；使用 `"raw"` 则会在调试时追加原始命令/详情。
  - `explain`：`🛠️ Exec: 检查 /tmp/app.js 的 JS 语法`
  - `raw`：`🛠️ Exec: 检查 /tmp/app.js 的 JS 语法，node --check /tmp/app.js`

## 插件追踪指令（/trace）

- 级别：`on` | `off`（默认）。
- 仅包含指令的消息会切换会话插件追踪输出并回复 `插件追踪已启用。` / `插件追踪已禁用。`。
- 内联指令只影响该消息；否则会应用会话/全局默认值。
- 发送不带参数的 `/trace`（或 `/trace:`）可查看当前追踪级别。
- `/trace` 比 `/verbose` 更窄：它只暴露插件拥有的追踪/调试行，例如 Active Memory 调试摘要。
- 追踪行可以出现在 `/status` 中，也可以作为正常 assistant 回复后的后续诊断消息出现。

## 推理可见性（/reasoning）

- 层级：`on|off|stream`。
- 仅指令消息会切换回复中是否显示思考块。
- 启用后，推理会作为一条**单独的消息**发送，并以前缀 `Thinking` 开头。
- `stream`：当当前通道支持推理预览时，会在回复生成过程中流式传输推理，然后发送不包含推理的最终答案。
- 别名：`/reason`。
- 发送不带参数的 `/reasoning`（或 `/reasoning:`）可查看当前推理级别。
- 解析顺序：行内指令，其次会话覆盖，然后每个 agent 的默认值（`agents.entries.*.reasoningDefault`），再然后全局默认值（`agents.defaults.reasoningDefault`），最后回退到（`off`）。

对格式错误的本地模型 reasoning 标签会采取保守处理。已闭合的 `<think>...</think>` 块在正常回复中会保持隐藏，而在已显示文本之后出现的未闭合 reasoning 也会被隐藏。如果一条回复完全包裹在一个未闭合的起始标签中，并且否则会以空文本交付，OpenClaw 会移除格式错误的起始标签并交付剩余文本。

## 相关

- 提升模式文档位于 [提升模式](/tools/elevated)。

## 心跳

- 心跳探测正文是已配置的心跳提示词（默认值：`在提供心跳监控暂存上下文时，遵循该上下文。重复性任务属于自动化任务；请使用自动化工具创建或更改其计划，而不是使用心跳暂存。不要从之前的聊天中推断或重复旧任务。如果没有需要处理的事项，请回复 HEARTBEAT_OK。`）。心跳消息中的内联指令照常适用（但应避免通过心跳更改会话默认设置）。
- 心跳传递使用最近一次具备出站能力的非推理载荷。单独的推理或 `Thinking` 载荷仍保留在内部，而仅包含推理的心跳结果不会产生提醒。

## Web 聊天 UI

- Web 聊天的思考级别选择器会在页面加载时，镜像入站会话存储/配置中的会话已存储级别。
- 选择其他级别会通过 `sessions.patch` 立即写入会话覆盖；它不会等到下一次发送，也不是一次性的 `thinkingOnce` 覆盖。
- 当模型、推理或速度选择器的更改仍在应用中时进行发送，会等待所有待处理的选择器补丁；如果某个更改失败，消息将保持未发送状态以供查看。
- 第一个选项始终是清除覆盖的选择。它显示 `Inherited: <resolved level>`，包括在继承的思考已禁用时显示 `Inherited: Off`。
- 显式的选择器选项使用其直接级别标签，同时在有提供方标签时保留这些标签（例如，带有提供方标签的 `max` 选项显示为 `Maximum`）。
- 选择器使用网关会话行/默认值返回的 `thinkingLevels`，而 `thinkingOptions` 仅保留为旧版标签列表。浏览器 UI 不再维护自己的提供方正则列表；插件负责模型特定的级别集合。
- `/think:<level>` 仍然可用，并会更新相同的已存储会话级别，因此聊天指令和选择器会保持同步。

## 提供商配置文件

- 提供商插件可以暴露 `resolveThinkingProfile(ctx)`，用于定义模型支持的等级及默认值。
- 代理 Claude 模型的提供商插件应复用 `openclaw/plugin-sdk/provider-model-shared` 中的 `resolveClaudeThinkingProfile(modelId)`，以保持直接 Anthropic 和代理目录的一致性。
- 每个配置文件等级都有一个存储用的规范 `id`（`off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`adaptive`、`max` 或 `ultra`），并且可以包含显示用的 `label`。二元提供商使用 `{ id: "low", label: "on" }`。
- 配置文件钩子在可用时会接收合并后的目录事实，包括 `reasoning`、`compat.thinkingFormat` 和 `compat.supportedReasoningEfforts`。仅当已配置的请求契约支持匹配的载荷时，才使用这些事实暴露二元或自定义配置文件。
- 需要验证显式思考覆盖的工具插件应使用 `api.runtime.agent.resolveThinkingPolicy({ provider, model, agentRuntime })` 以及 `api.runtime.agent.normalizeThinkingLevel(...)`；它们不应维护自己的提供商/模型等级列表。当工具拥有执行路径时，例如始终内嵌运行，应传入 `agentRuntime`。
- 可访问已配置自定义模型元数据的工具插件可以将 `catalog` 传入 `resolveThinkingPolicy`，以便反映 `compat.supportedReasoningEfforts` 的显式启用在插件侧校验中得到体现。
- 已发布的旧版钩子（`supportsXHighThinking`、`isBinaryThinking` 和 `resolveDefaultThinkingLevel`）仍然作为兼容性适配器保留，但新的自定义等级集合应使用 `resolveThinkingProfile`。
- 网关行/默认值会暴露 `thinkingLevels`、`thinkingOptions` 和 `thinkingDefault`，以便 ACP/chat 客户端渲染与运行时校验相同的配置文件 id 和 label。
