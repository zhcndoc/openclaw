---
summary: "用于 /think、/fast、/verbose、/trace 以及推理可见性的指令语法"
read_when:
  - "调整 thinking、fast 模式，或 verbose 指令解析/默认值时"
title: "思考级别"
---

## <a id="what-it-does"></a> 它的作用

- 任意传入正文中的内联指令：`/t <level>`、`/think:<level>` 或 `/thinking <level>`。
- 级别（别名）：`off | minimal | low | medium | high | xhigh | adaptive | max | ultra`，大致对应 Anthropic 经典 “think” < “think hard” < “think harder” < “ultrathink” 的魔法词阶梯：
  - 最小~“思考”
  - low ~“努力思考”
  - medium ~“认真思考”
  - high ~ “ultrathink”（最大预算）
  - xhigh ~ “ultrathink+”（GPT-5.2+ 和 Codex models，以及 Anthropic Claude Opus 4.7+ effort）
  - adaptive → 提供商管理的自适应思维（支持 Anthropic/Bedrock、Anthropic Claude Opus 4.7+ 和 Google 上的 Claude 4.6 Gemini动态思维）
  - max → provider max reasoning（Anthropic Claude Opus 4.7+；Ollama 将其映射为其最高原生 `think` effort）
  - ultra → harness级规划、执行、验证和主动子代理编排；适用于 OpenClaw 和 Claude Code 运行时上的每个模型，并支持 Codex 上的本机推理模型
  - `x-high`、`x_high`、`extra-high`、`extra high` 和 `extra_high` 映射到 `xhigh`。
  - `highest` 映射到 `high`； `maximum` 映射到 `max`。
- Provider 说明：
  - Thinking 菜单和选择器由 provider profile 驱动。Provider plugins 会为所选 model 声明确切的级别集合，包括二元 `on` 等标签。
  - `adaptive`、`xhigh`、`max`仅在provider/model支持时才会发布。 Ultra 是一种单独的harness模式，而不是额外的提供商 API 的努力。不支持的本机级别的类型化指令将被该模型的有效选项拒绝。
  - Agent 轮流使用为其所选模型和运行时保留的已发布功能事实，而无需在轮次期间获取模型列表。明确配置的思维层次图和工作列表仍然优先。单独的 `reasoning: true` 声明不会冻结提供程序的支持级别。再次登录 xAI 以删除旧登录复制的工作列表；未来的关卡来自实时目录。
  - 模型和运行时开关保留您保存的思维偏好。每次运行都会按提供商配置文件等级限制不受支持的继承级别，并报告有效级别，而不替换已保存的请求。切换回支持模型可恢复所请求的级别。当两个级别不同时，`/status` 会显示它们。当 `adaptive` 不可选时，执行使用提供者声明的非关闭默认值；否则，其排名后备保留启用思维，通常为 `medium`。 `xhigh` 和 `max` 回退到所选模型支持的最大非关闭级别。
  - 未显式设置 thinking 级别时，Anthropic Claude 4.6 models 默认使用 `adaptive`。
  - Anthropic Claude Opus 4.8 和 Opus 4.7 在未显式设置 thinking 级别时保持关闭。启用自适应思考后，Opus 4.8 的 provider-owned effort 默认值为 `high`。
  - Anthropic Claude Opus 4.7+ 会将 `/think xhigh` 映射为自适应思考加上 `output_config.effort: "xhigh"`，因为 `/think` 是 thinking directive，而 `xhigh` 是 Opus 的 effort 设置。
  - Anthropic Claude Opus 4.7+ 还支持 `/think max`；它会映射到相同的 provider-owned max effort 路径。
  - Direct DeepSeek V4 models 支持 `/think xhigh|max`；两者都会映射到 DeepSeek 的 `reasoning_effort: "max"`，而较低的非 off 级别会映射到 `high`。
  - OpenRouter-routed DeepSeek V4 模型公开 `/think xhigh` 并发送 OpenRouter- 支持的 `reasoning.effort` 值，而不是 DeepSeek-native 顶级 `reasoning_effort`。较低的非关闭级别映射到 `high`，并且存储的 `max` 覆盖回落到 `xhigh`。
  - Ollama 具有思考能力的模型公开了 `/think low|medium|high|max`。经过验证的全功能 Ollama Cloud 系列，例如 GLM 5.2、GLM 5.3、GLM 5.3 闪存、Kimi K3、 DeepSeek V4 和 DeepSeek V4.1 Flash 发送本机 `think: "max"` 为 `/think max`；其他模型和本地Ollama保持兼容的`high`映射。
  - OpenAI GPT 模型通过所选模型和认证路线的努力支持来映射 `/think`。在支持的 OpenAI Platform/API-key 路由上，`/think off` 发送显式 `reasoning.effort: "none"`，包括使用 Codex 运行时时。不支持 `none` 的订阅路由保留提供者或本机运行时的默认推理行为； `off` 不保证那里的零推理。受监督的本机 Codex 线程保留自己的思维设置。
  - GPT-6 Astra 和 GPT-5.6 Sol 和 Terra 通过 Codex 运行时以及平台 API-key 或 ChatGPT 订阅身份验证公开本机 `/think ultra`。 OpenClaw 保留 Ultra 用于普通转弯； `/btw` 有意以 `off` 运行。 Codex 拥有主动委托和特定于模型的推理工作（Astra 使用 `xhigh`）。 Ultra 不会作为原始响应 API 推理工作发送。其他具有本机推理工作的 Codex 模型也可以使用 Ultra：Codex 选择其支持的推理工作，同时保留其本机委托策略。没有本机工作选择的模型可以通过 OpenClaw 运行时使用主机引导的 Ultra。
  - OpenClaw 和 Claude Code 运行时公开所有模型的逻辑 `/think ultra`。他们选择最高支持的本机工作，并添加运行范围的规划和验证指南。仅当 `sessions_spawn` 可用时才会出现委派指导； Ultra 不会授予工具或绕过他们的政策。非推理模型仍然是非推理，没有努力控制的模型保留提供者默认值。
  - 缓存的 OpenAI 会话中的更改工作可以附加 `configuration_update`，同时保留原始请求级别的工作以便及时重用。最新更新决定有效努力；顶级字段不变并不是降级。
  - 自定义 OpenAI- 兼容商品可以通过将 `models.providers.<provider>.models[].compat.supportedReasoningEfforts` 设置为包含 `"xhigh"` 来选择加入 `/think xhigh`。这使用映射出站 OpenAI 推理工作负载的相同兼容元数据，因此菜单、会话验证、代理 CLI 和 `llm-task` 与传输行为一致。
  - 自 2026.4.26 起，陈旧配置的 OpenRouter Hunter Alpha 引用会跳过代理推理注入，因为该退休路由可以通过推理字段返回最终答案文本。
  - Google Gemini 会将 `/think adaptive` 映射为 Gemini 的 provider-owned dynamic thinking。Gemini 3 requests 会省略固定的 `thinkingLevel`，而 Gemini 2.5 requests 会发送 `thinkingBudget: -1`；固定级别仍会映射到对应 model family 最接近的 Gemini `thinkingLevel` 或 budget。
  - Anthropic- 兼容流路径上的 MiniMax M2.x （`minimax/MiniMax-M2*`） 默认为 `thinking: { type: "disabled" }`，除非您在模型参数或请求参数中显式设置思考。这避免了 `reasoning_content` 增量从 M2.x 的非本机 Anthropic 流格式泄漏。 MiniMax-M3（和M3.x）是豁免的：M3发出适当的Anthropic思维块，并在思维被禁用时返回空内容，因此OpenClaw将M3保留在提供者的omitted/adaptive思维路径上。
  - 对于大多数 GLM 模型，Z.AI （`zai/*`） 是二进制 （`on`/`off`）。 GLM-5.2 和 GLM-5.3 是例外。 GLM-5.2 使用 `off` 默认值公开 `/think off|low|high|max`，将 `low` 和 `high` 映射到 Z.AI `reasoning_effort: "high"`，并将 `max` 映射到 `reasoning_effort: "max"`。 GLM-5.3 使用 `max` 默认值公开 `/think low|high|max`，将 `off`、`minimal` 和 `low` 映射到 `reasoning_effort: "low"`，将 `medium` 和 `high` 映射到`"high"`、`xhigh`、`adaptive` 和 `max` 至 `"max"`。
  - Moonshot API Kimi K3 （`moonshot/kimi-k3`） 始终认为是 `max`，发送 `reasoning_effort: "max"`，忽略 K2 `thinking` 字段和固定采样覆盖，并保留 K3- 支持的工具选择。 Kimi 代码 K3（`kimi/k3` 和 `kimi/k3-256k`）公开了完整的 `/think` 梯形图，默认为 `high`：`off` 发送 `thinking.type: "disabled"`、`minimal`/`low` 映射到低努力，`medium`/`high`/`adaptive` 为高努力，`xhigh`/`max` 为最大努力。 Kimi 代码参考还包括 `kimi/kimi-for-coding` 和 `kimi/kimi-for-coding-highspeed`。 Kimi K2.7 代码（`moonshot/kimi-k2.7-code` 和 `moonshot/kimi-k2.7-code-highspeed`）始终认为，仅公开 `on`，并忽略出站 `thinking` 和 `reasoning_effort`。其他 `moonshot/*` 模型将 `/think off` 映射到 `thinking: { type: "disabled" }`，并将任何非 `off` 级别映射到 `thinking: { type: "enabled" }`。当K2思维开启时，Moonshot只接受`tool_choice` `auto|none`； OpenClaw 将不兼容的值标准化为 `auto`。

## <a id="custom-openai-compatible-endpoints"></a> 自定义 OpenAI- 兼容端点

对于使用 `api: "openai-completions"` 的自定义提供程序，标记为 `reasoning: true` 的模型在启用思考时发送 `reasoning_effort`，而不需要 `compat.supportsReasoningEffort: true`。模型上的显式 `compat.supportsReasoningEffort: false` 将禁用此控制。此默认值也适用于升级后的现有自定义配置。如果端点拒绝 `reasoning_effort`，则请求错误指向该选择退出。

`xhigh` 和 `max` 等高级级别需要模型声明或映射，然后 CLI 接受它们。使用 `compat.supportedReasoningEfforts` 声明端点的接受值，并使用 `compat.reasoningEffortMap` 或 `thinkingLevelMap` 将思维级别映射到这些值。请求的启用工作被限制在已声明的阶梯上。发送级别并不能保证服务器或模型将其与其他级别区分开来：某些模型仅提供二进制思维，而某些服务器则忽略该字段。

默认情况下，`/think off` 在自定义路由上省略 `reasoning_effort`，因为许多服务器仅接受 `low`、`medium` 和 `high`。遗漏会使服务器自己的默认值生效，并且不保证零推理。如果端点接受 `none` 来禁用思考，请在模型上显式声明：

```json5 validate=false
{
  reasoning: true,
  compat: {
    supportedReasoningEfforts: ["none", "low", "medium", "high"],
    reasoningEffortMap: { off: "none" },
  },
}
```

这些默认值适用于自定义路由。捆绑的提供商插件保留其特定于提供商的思维契约，包括本机 Ollama 的 `think` 控件。

## <a id="resolution-order"></a> 解析顺序

1. 消息上的行内指令（仅适用于该消息）。
2. 会话覆盖（通过发送仅包含指令的消息进行设置）。
3. 每个代理的默认值（配置中的 `agents.entries.*.thinkingDefault`）。
4. Per-agent 模型默认值（配置中的 `agents.entries.*.models["<provider>/<model>"].params.thinking`）。
5. 共享模型默认值（配置中的`agents.defaults.models["<provider>/<model>"].params.thinking`）。
6. 全局默认值（配置中的`agents.defaults.thinkingDefault`）。
7. Fallback：提供商声明的默认值（可用时）；否则，具有推理能力的模型将解析为 `medium` 或该模型最接近的受支持的非 `off` 级别，而非推理模型则保留为 `off`。对于声明的 Qwen 聊天模板模型，此回退不会发送嵌套工作：服务器保持其模板默认值，直到回合、会话或配置选择级别。

## <a id="setting-a-model-default"></a> 设置模型默认值

使用 `params.thinking` 设置一种已配置模型的默认值，而不更改其他模型的默认值。密钥必须与您实际选择的提供程序和模型相匹配，包括自定义提供程序公开的任何模型路径。

将 `<provider>/<model>` 替换为已配置模型的完整 ID，然后将此条目合并到现有模型配置中：

```json5
{
  agents: {
    defaults: {
      models: {
        "<provider>/<model>": {
          params: { thinking: "high" },
        },
      },
    },
  },
}
```

提供者必须已配置，并且模型必须支持所选的思维水平。

要更改一个代理的该模型的默认值，请将相同的条目放在 `agents.entries.<agent>.models` 下。这会覆盖共享模型设置。模型 `params.thinking` 接受与 `/think` 相同的别名； `false`和`"disabled"`也选择`off`。

内联指令、保存的会话覆盖或每个代理 `thinkingDefault` 仍然优先。发送 `/think default` 清除已保存的会话覆盖；如果模型默认值仍然没有生效，请检查每个代理的设置。

## <a id="setting-a-session-default"></a> 设置会话默认值

- 发送一条消息，该消息是**only**指令（允许空格）、e.g.、`/think:medium`或`/t high`。
- 这会持续到当前会话（默认情况下针对每个发送者）。使用`/think default`清除会话覆盖并继承configured/provider默认值；别名包括 `inherit`、`clear`、`reset` 和 `unpin`。
- `/think off` 存储显式关闭覆盖，直到您更改或清除它。上游模型是否可以禁用思维取决于所选择的提供商和认证路由。
- 确认回复已发送（`Thinking level set to high.` / `Thinking disabled.`）。如果级别无效 （e.g. `/thinking big`），则该命令将被拒绝并带有提示，并且会话状态保持不变。
- 发送不带参数的 `/think`（或 `/think:`）即可查看当前 thinking 级别。

## <a id="application-by-agent"></a> 按 agent 应用

- **嵌入式 OpenClaw**：解析后的等级会传递给进程内的 OpenClaw agent 运行时。
- **Claude CLI后端**：具体级别映射到Claude Code `--effort`；允许固定预算的模型也会获得匹配的 `MAX_THINKING_TOKENS` 启动价值。 `adaptive` 删除了配置的工作量标记和固定预算覆盖，将有效的思维委托给 Claude Code 的环境、设置和模型默认值。请参阅 [CLI 后端](/gateway/cli-backends)。

## <a id="fast-mode-(%2Ffast)"></a><a id="fast-mode-/fast"></a> 快速模式（/fast）

- 级别：`auto|on|off|ultrafast|default`。
- 仅包含指令的消息会切换会话快速模式覆盖设置，并回复 `Fast mode set to auto.`、`Fast mode enabled.` 或 `Fast mode disabled.`。使用 `/fast default` 可清除会话覆盖设置并继承已配置的默认值；别名包括 `inherit`、`clear`、`reset` 和 `unpin`。
- 在不指定模式的情况下发送 `/fast`（或 `/fast status`），可查看当前生效的快速模式状态。
- OpenClaw 按以下顺序解析快速模式：
  1. Inline `/fast auto|on|off|ultrafast` 覆盖当前消息
  2. 仅包含指令的消息中存储的会话覆盖设置（`/fast default` 会清除这一层）
  3. Agent 级默认值（`agents.entries.*.fastModeDefault`）
  4. 全局默认值（`agents.defaults.fastModeDefault`）
  5. 按模型配置（`agents.defaults.models["<provider>/<model>"].params.fastMode`）
  6. 回退值：`off`
- 有效的模型范围 `params.fastMode` / `params.fast_mode` 值和有效的截止时间键属于类型化的 Agent 运行时控制项。它们不计入作者编写的 provider 请求参数，也不会自行选择 OpenClaw 或 Codex。当配方依赖某个运行时时，请固定设置 `agentRuntime.id: "openclaw"` 或 `agentRuntime.id: "codex"`。
- `auto` 将 session/config 模式保持为自动，但独立解析每个新模型调用。在自动切断之前开始的呼叫已启用快速模式；稍后重试、回退、工具结果或继续调用会在禁用快速模式的情况下开始。截止时间默认为60秒；在活动模型上设置 `agents.defaults.models["<provider>/<model>"].params.fastAutoOnSeconds` 来更改它。
- 对于 `openai/*`，快速模式映射到 OpenAI API 快速模式（以前​​称为优先级处理）。 OpenClaw 针对受支持的响应请求（包括 OpenClaw 运行时）发送 `service_tier=priority`（对于普通快速）和 `service_tier=ultrafast`（对于显式超快）。提供商决定所选帐户和模型是否可以使用该层；发送它并不能保证更快的服务。
- 配置的 OpenAI `serviceTier` / `service_tier` 值是继承默认值，而不是速度锁定。明确的标准、快速或超快选择会覆盖它们；如果没有速度选择，`flex` 和 `auto` 保持不变。您可以在响应期间编辑速度；更改会影响以后的请求，而不是已经在进行中的请求。提供商、路由、帐户和会话写入限制仍然适用。
- Control UI 在同一会话首选项中将标准存储为 `fastMode: false`，将快速存储为 `true`，将超快速存储为 `"ultrafast"`。在嵌入式 OpenClaw 运行时上，超快可用性来自选定的可用 API-key OpenAI 响应路由，无论密钥来自身份验证配置文件、环境还是提供程序配置（包括 SecretRefs），而无需目录元数据。与不同层相呼应的响应会抑制所选凭证、模型和路线的 Ultrafast，同时记录的观察结果保持最新状态。更改直接凭证的配置绑定会清除其观察结果。 ChatGPT 帐户仍然需要经过身份验证的目录支持。对于未设置 `appServer.enableUltrafast` 或 `true` 的显式 Ultrafast 选择，Codex 会在每次轮次请求时重新检查其本机目录，并在支持不可用时回退到快速；保存的首选项永远不会授予访问权限。
- 在 Codex harness转动时，共享运行时控件取代配置的本机应用程序服务器层：快速打开从 `priority` 开始，快速关闭发送 `null` 以清除 OpenClaw- 拥有的层​​，并自动决定每个模型调用。仅当未提供共享快速模式运行控制时，才使用配置的 Codex 层。超快需要有效的共享 `"ultrafast"` 选择，包括编写的 `fastModeDefault: "ultrafast"` 以及为所选本机模型宣传它的经过身份验证的应用程序服务器目录。快速、主动的自动和未指定的控件永远不会自动升级或请求超快目录。本机 `serviceTier: "ultrafast"` 从 `priority` 开始，直到共享选择请求它为止。未设置的 `appServer.enableUltrafast` 或 `true` 允许显式选择； `false` 在选择器中隐藏 Codex 运行时的 Ultrafast，即使对于显式 Ultrafast 也发送普通 Fast （`priority`），并跳过目录检查。标准和非活动自动仍然清除该层。请参阅 [Codex harness](/plugins/codex-harness/commands#shared-fast-mode-and-codex-fast-mode)。
- 对于直接 API-key `anthropic/*` 请求，Opus 5 和 Opus 4.8 使用本机 `speed=fast`。其他支持的模型使用优先级：上集 `service_tier=auto`，外集 `service_tier=standard_only`。 Sonnet 5 均不支持映射； OAuth 请求未收到任何字段。
- 对于 Anthropic- 兼容路径上的 `minimax/*`，`/fast on`（或 `params.fastMode: true`）将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。
- 显式 Anthropic `serviceTier` / `service_tier` 模型参数在两者均设置时覆盖快速模式默认值。 OpenClaw 仍会跳过非 Anthropic 代理基本 URL 的 Anthropic 服务层注入。
- `/status` 报告已解析的 OpenClaw 策略（`on`、`off` 或 `auto`）和选定的运行时。它不会报告已完成的请求实际兑现或返回的上游服务层。有关提供商详细信息，请参阅 [OpenAI 快速模式](/providers/openai/advanced#advanced-configuration)。
- Control UI 禁用已确认对所选请求没有影响的快速选择。现有保存的首选项仍然可见且可清除。当适用性未知时，控件将保留其现有行为；可用性并不保证供应商的权利或更快的响应。

## <a id="verbose-directives-(%2Fverbose-or-%2Fv)"></a><a id="verbose-directives-/verbose-or-/v"></a> 详细日志指令（/verbose 或 /v）

- 级别：`on`（最简）| `full` | `off`（默认）。
- 仅包含指令的消息会切换会话详细日志，并回复 `Verbose logging enabled.` / `Verbose logging disabled.`；无效级别会返回提示，但不会更改状态。
- `/verbose off` 会存储显式的会话覆盖设置；通过 Sessions UI 选择 `inherit` 可清除该设置。
- 授权的外部频道发送者可以持久化会话详细日志覆盖设置。Internal gateway/webchat clients 需要 `operator.admin` 才能持久化该设置。
- Inline 指令仅影响该消息；否则，session/global 默认值适用。
- 发送不带参数的 `/verbose`（或 `/verbose:`）以查看当前详细日志级别。
- 当详细日志开启时，发送结构化工具结果的 agents 会将每次工具调用作为单独的、仅包含安全元数据的消息发回。Shell 工具会显示其标签，但不会显示命令文本。这些工具摘要会在每个工具启动后立即发送（作为单独的气泡），而不是作为流式增量发送。
- 工具失败摘要在普通模式下仍然可见，但原始错误详细信息后缀只有在详细日志为 `full` 时才会显示。
- 当详细日志为 `full` 时，工具输出也会在完成后转发（作为单独的气泡，并截断至安全长度）。如果在运行进行中切换 `/verbose on|full|off`，后续工具气泡会遵循新的设置。
- `agents.defaults.toolProgressDetail` 控制 `/verbose` 工具摘要和进度草稿工具行的格式。使用 `"explain"`（默认）获取简洁的人类可读标签，使用 `"raw"` 获取未删节的非 Shell 详细信息。独立 Shell 摘要需要 `/verbose full` 才能显示命令文本；进度草稿需要频道显式选择加入 `streaming.*.commandText: "raw"`。每个 agent 的 `agents.entries.*.toolProgressDetail` 会覆盖默认设置。
  - `/verbose on`: `Exec`
  - `/verbose full` + `explain`: `check JS syntax for /tmp/app.js`
  - `/verbose full` + `raw`: `check JS syntax for /tmp/app.js, node --check /tmp/app.js`

## <a id="plugin-trace-directives-(%2Ftrace)"></a><a id="plugin-trace-directives-/trace"></a> 插件追踪指令（/trace）

- 级别：`on` | `off`（默认）。
- 仅指令消息切换会话插件跟踪输出并回复 `Plugin trace enabled.` / `Plugin trace disabled.`。
- Inline 指令仅影响该消息；否则，session/global 默认值适用。
- 发送不带参数的 `/trace`（或 `/trace:`）可查看当前追踪级别。
- `/trace` 比 `/verbose` 更窄：它仅公开插件拥有的 trace/debug 行，例如 Active Memory 调试摘要。
- 追踪行可以出现在 `/status` 中，也可以作为正常 assistant 回复后的后续诊断消息出现。

## <a id="reasoning-visibility-(%2Freasoning)"></a><a id="reasoning-visibility-/reasoning"></a> 推理可见性（/reasoning）

- 层级：`on|off|stream`。
- 仅指令消息会切换回复中是否显示思考块。
- 启用后，推理会作为一条**单独的消息**发送，并以前缀 `Thinking` 开头。
- `stream`：当活动通道支持推理预览时，在生成回复时流式传输推理，然后发送最终答案而不进行推理。通道预览在交付之前删除已识别的内部运行时上下文；对于模型回放，原始推理保持不变。
- Control UI 在 `on` 和 `stream` 的生成过程中显示本机提供者推理，并启用 **View → Reasoning**。每个工具步骤都会在运行后续步骤时保留其之前的推理。在`on`中，每个预览都会交给其保存的推理，而不会重复；在 `stream` 中，运行结束时所有预览都会消失。
- Control UI 历史记录仅显示 `on` 的已保存推理，且启用了 **View → Reasoning**。 `off` 和 `stream` 将其隐藏，包括重新加载后。
- Visible Control UI 推理保留 Markdown 段落和围栏代码块，包括代码内的空行。
- 别名：`/reason`。
- 发送不带参数的 `/reasoning`（或 `/reasoning:`）可查看当前推理级别。
- 解析顺序：行内指令，其次会话覆盖，然后每个 agent 的默认值（`agents.entries.*.reasoningDefault`），再然后全局默认值（`agents.defaults.reasoningDefault`），最后回退到（`off`）。

格式错误的本地模型推理标签会被保守地处理。封闭的 `<think>...</think>` 块在正常回复中保持隐藏，并且在已经可见的文本之后未封闭的推理也被隐藏。如果回复正常结束并完全包装在单个未闭合的开始标记中，否则将作为空文本传递，OpenClaw 会删除格式错误的开始标记并传递剩余的文本。达到其输出令牌限制或报告错误的聊天完成流不会将未完成的推理恢复为答案文本。如果令牌限制没有留下可见的答案，OpenClaw 会报告模型在生成答案之前已达到其输出令牌限制。

## <a id="related"></a> 相关内容

- 提升模式文档位于 [提升模式](/tools/elevated)。
- [斜线命令](/tools/slash-commands) — 在会话中改变思维水平
- [配置参考](/gateway/configuration-reference) — 配置思维默认值的位置

## <a id="heartbeats"></a> 心跳

- Heartbeat 检查体为配置的心跳提示（默认：`Follow the heartbeat monitor scratch context when provided. Recurring tasks are automations; create or change their schedules with the automations tool, not heartbeat scratch. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply NO_REPLY.`）。心跳消息中的内联指令照常应用（但避免从心跳更改会话默认值）。
- 心跳传递使用最近一次具备出站能力的非推理载荷。单独的推理或 `Thinking` 载荷仍保留在内部，而仅包含推理的心跳结果不会产生提醒。

## <a id="web-chat-ui"></a> Web 聊天 UI

- 可以在现有会话中使用 `operator.write` 更改模型、思维级别和快速模式覆盖；这三个控件不需要管理员访问权限。只读客户端无法更改它们。
- 在发送、准备或流式传输消息时，模型、思考和速度控制仍然可用。它们显示所选的会话首选项；保存更改不会中断或更改已经执行的回合。尚未开始的普通排队消息使用最新保存的首选项，而显式的每消息覆盖则保留其现有优先级。
- 应用模型更改时，模型和工作量控制保持禁用状态，直到新模型的支持设置到达。在主动回复期间，速度控制仍然可用；保存的速度更改适用于以后的请求，而不是飞行中的请求。
- 网络聊天思维选择器显示显式会话覆盖，或在未存储覆盖时继承的configured/provider默认值。
- 刷新、重新加载或压缩对话会保留继承的选择；它不会将解析的级别存储为覆盖。加载模型元数据时，刷新会保留相同模型和运行时的已知思维概况。
- 在工作量滑块上选择一个级别会立即通过 `sessions.patch` 写入显式会话覆盖；它不会等待下一次发送，也不是一次性 `thinkingOnce` 覆盖。
- 当模型、推理或速度选择器的更改仍在应用中时进行发送，会等待所有待处理的选择器补丁；如果某个更改失败，消息将保持未发送状态以供查看。
- 工作量控件显示已解决的级别，例如 `Medium` 或 `Off`。要清除覆盖并返回继承，请发送 `/think default`。
- 显式选择器选择使用其直接级别标签，同时保留提供者标签（例如，`Maximum` 用于提供者标记的 `max` 选项）。
- 选择器使用网关会话 row/defaults 返回的 `thinkingLevels`，并将 `thinkingOptions` 保留为旧标签列表。浏览器 UI 不保留自己的提供者正则表达式列表；插件拥有特定于模型的级别集。
- `/think:<level>` 仍然可用，并会更新相同的已存储会话级别，因此聊天指令和选择器会保持同步。

## <a id="provider-profiles"></a> 提供商配置文件

- 提供商插件可以暴露 `resolveThinkingProfile(ctx)`，用于定义模型支持的等级及默认值。
- 代理 Claude 模型的 Provider 插件应重用 `openclaw/plugin-sdk/provider-model-shared` 中的 `resolveClaudeThinkingProfile(modelId)`，以便直接 Anthropic 和代理目录保持一致。
- 每个配置文件级别都有一个存储的`id`（`off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`adaptive`、 `max` 或 `ultra`），并且可能包括显示器 `label`。二进制提供程序使用 `{ id: "low", label: "on" }`。
- Profile 挂钩接收可用的合并目录事实，包括 `reasoning`、`thinkingLevelMap`、`compat.thinkingFormat`、`compat.supportsReasoningEffort` 和 `compat.supportedReasoningEfforts`。仅当配置的请求协定支持匹配的负载时，才使用这些事实来公开二进制或自定义配置文件。 `thinkingLevelMap` 中的 `null` 条目会在选择默认值之前删除该级别。
- 需要验证显式思维覆盖的 Tool 插件应使用 `api.runtime.agent.resolveThinkingPolicy({ provider, model, agentRuntime })` 加上 `api.runtime.agent.normalizeThinkingLevel(...)`；他们不应该保留自己的 provider/model 级别列表。当工具拥有执行路径（例如始终嵌入的运行）时，传递 `agentRuntime`。
- 可访问已配置自定义模型元数据的工具插件可以将 `catalog` 传入 `resolveThinkingPolicy`，以便反映 `compat.supportedReasoningEfforts` 的显式启用在插件侧校验中得到体现。
- 已发布的旧版钩子（`supportsXHighThinking`、`isBinaryThinking` 和 `resolveDefaultThinkingLevel`）仍然作为兼容性适配器保留，但新的自定义等级集合应使用 `resolveThinkingProfile`。
- Gateway rows/defaults 公开 `thinkingLevels`、`thinkingOptions` 和 `thinkingDefault`，以便 ACP/chat 客户端呈现运行时验证使用的相同配置文件 ID 和标签。
