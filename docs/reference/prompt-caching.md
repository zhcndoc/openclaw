---
summary: "提示缓存的控制项、合并顺序、提供方行为和调优模式"
title: "提示缓存"
read_when:
  - "你想通过缓存保留来降低提示 token 成本"
  - "你在多智能体场景中需要按智能体设置缓存行为"
  - "你正在一起调优心跳和 cache-ttl 清理"
---

提示缓存允许模型提供者跨轮重复使用未更改的提示前缀（system/developer 指令、工具定义、其他稳定上下文），而不是在每个请求时重新处理它。这降低了具有重复上下文的长时间运行会话的令牌成本和延迟。

OpenClaw 会在上游 API 暴露这些计数器的地方，将提供方使用情况统一规范为 `cacheRead` 和 `cacheWrite`。如果实时会话快照缺少缓存计数器，使用摘要（`/status` 及类似接口）会回退到上一条转录使用记录；非零的实时值始终优先于回退值。

OpenAI- 兼容路由接受嵌套 `prompt_tokens_details.cached_tokens` 和顶级 `cached_tokens` 计数器，包括 Together 和 StepFun 记录的形式。当提供者省略缓存计数器时，其缓存命中率是未知的；缺乏遥测并不意味着提供商再次处理每个令牌。

提供方参考：

- [Anthropic 提示缓存](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [OpenAI 提示缓存](https://developers.openai.com/api/docs/guides/prompt-caching)。

## <a id="keep-model-settings-stable"></a> 保持模型设置稳定

提示缓存重用取决于提供程序请求配置以及提示文本。更改模型总是会启动不同的缓存沿袭。即使提示和模型保持不变，改变思维或推理水平也会使重用失效。支持的本机 OpenAI 响应请求保留原始工作并附加回合范围的配置控制，包括在传输到期后或网关重新启动后（当保存的重放元数据和历史记录仍然匹配时）。请参阅 [OpenAI 推理更改 ](/providers/openai)。其他 OpenAI 模型或不兼容的模式仍然可以重新处理完整前缀。 Anthropic 同样记录了当其思维预算、工作量或模式发生变化时缓存失效的情况。

如果缓存连续性很重要，请在创建会话时选择模型和思维级别，并保持两者稳定。为计划的更改启动新的会话。使重用无效意味着下一个请求会错过该缓存状态；它不一定会在正常到期之前删除提供者的旧缓存条目。

## <a id="stable-tools-between-turns"></a> 匝间刀具稳定

WebChat 使 `message` 反应描述和模式在同一对话中的运行之间保持稳定，包括没有当前提示反应授予的运行。当启用的目录发生更改时，代码模式会保持其 `exec` 和 `wait` 架构稳定。目前的可调用索引和能力指导遵循稳定的提示前缀；支持的历史提示更新会将更改附加到对话中。反应执行仍需要当前提示的实时权限；公布的操作不授予执行它的权限。

## <a id="keep-replayed-tool-results-stable"></a> 保持重放工具结果稳定

OpenClaw 在第一个模型请求之前以及保留结果时应用相同的工具结果文本上限。因此，后续轮次会重播相同的有界文本，而不是引入不同的截断通知。工具文本在没有秘密屏蔽的情况下被保留。当减少大批次会重写已发送的历史记录时，大批次可能会超出总体结果预算；会话修剪和压缩仍然是有意历史更改的所有者。

OpenAI 聊天完成还在重播期间保留有效的本机工具调用 ID，并确定性地消除重复 ID 的歧义。在轮次之间更改结果文本或 ID 可能会使原本可重用的提供程序前缀失效。稳定的请求输入支持缓存复用；实际点击量仍然取决于提供商。

响应重放从记录的源轮标识（如果可用）中派生出合成辅助消息 ID。因此，淘汰较早的历史记录会保留保留的失败转弯标记的 ID。错误诊断保留转录元数据并且不输入提供者请求。

内部浏览器对话重用其不透明会话缓存密钥来实现私有子代理完成，因此完成不会在聊天轮次之间切换到不同的关联密钥。密钥的范围仍然是代理、提供者、模型和对话，并且不会公开对话标识符。

## <a id="primary-knobs"></a> 主要控制项

### <a id="worker-turns"></a> 工人轮流

网关代理的工作线程推理使用与本地轮流相同的 OpenAI 缓存密钥派生：显式网关密钥优先；否则，密钥将会话 ID 与权威转录本的重置和压缩边界计数相结合。网关在承认的回合中保留这些事实，而不是接受工作人员提供的缓存密钥或从修剪的重播历史中派生密钥。

提供的工作人员技能使用稳定的会话范围、内容寻址路径和固定的目录顺序。因此，技能不变可以使系统提示前缀在回合之间保持稳定。技能刷新仍然提供当前已验证的字节；内容的改变有意地改变了该技能的路径。工作人员和本地提示在范围上仍然不同：工作人员加载有界工作区 `AGENTS.md` 以及网关提供的指令及其受限工具集。在运行时或工作区之间移动会话仍可能使其缓存的前缀无效。

### `cacheRetention`

值：`"none" | "short" | "long"`。可配置为全局默认值、按模型配置以及按代理配置。 `"standard"` 不是别名；请使用 `"short"` 作为提供方的默认缓存窗口。无效值会被忽略并给出警告。

```yaml
agents:
  defaults:
    params:
      cacheRetention: "long" # none | short | long
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "short" # overrides the global default for this model
  list:
    - id: "alerts"
      params:
        cacheRetention: "none" # overrides both defaults for this agent
```

合并顺序（后者覆盖前者）：

1. `agents.defaults.params` - 所有模型的全局默认值
2. `agents.defaults.models["provider/model"].params` - 按模型覆盖
3. `agents.entries.*.models["provider/model"].params` - 特定于代理的每个模型覆盖
4. `agents.entries.*.params` - 代理范围覆盖，由代理 ID 匹配

来源：`src/agents/embedded-agent-runner/extra-params.ts`（`resolveExtraParams`）。

### `contextPruning.mode: "cache-ttl"`

在缓存 TTL 窗口过期后，修剪旧的工具结果上下文，这样在空闲后发起的请求就不会重新缓存过大的历史记录。

```yaml
agents:
  defaults:
    contextPruning:
      mode: "cache-ttl"
      ttl: "1h"
```

完整行为请参见 [会话修剪](/concepts/session-pruning)。

### <a id="heartbeat-keep-warm"></a> 心跳保温

Heartbeat 可保持缓存窗口处于温热状态，并减少空闲间隔后重复的缓存写入。可全局配置（`agents.defaults.heartbeat`）或按代理配置（`agents.entries.*.heartbeat`）。

```yaml
agents:
  defaults:
    heartbeat:
      every: "55m"
```

## <a id="provider-behavior"></a> 提供方行为

### <a id="anthropic-(direct-api-and-vertex-ai)"></a><a id="anthropic-direct-api-and-vertex-ai"></a> Anthropic（直接 API 和 Vertex AI）

- 当启用缓存并且路线支持工具缓存控制时，工具前缀将与系统提示分开检查点。
- 最多两个对话检查点涵盖最近的用户消息或工具结果。当新一轮添加的内容超过提供者的 20 块查找窗口时，保持前一个检查点可达可避免缓存未命中。瞬态运行时上下文保留较早的稳定检查点。
- 当显式设置 `cacheRetention` 时，`anthropic` 和 `anthropic-vertex` 提供程序以及 `amazon-bedrock` 和自定义 `anthropic-messages`- 兼容端点上的 Claude 模型支持 `cacheRetention`。
- 未设置时，OpenClaw 为直接 Anthropic 播种 `cacheRetention: "short"`（仅限 `anthropic` 和 `anthropic-vertex` 提供商；其他 Anthropic- 系列路由需要显式值）。
- 原生 Anthropic Messages 响应会暴露 `cache_read_input_tokens` 和 `cache_creation_input_tokens`，分别映射为 `cacheRead` 和 `cacheWrite`。
- `cacheRetention: "short"` 映射到默认的 5 分钟临时缓存。当明确设置时，`cacheRetention: "long"` 请求 1 小时 TTL （`cache_control: { type: "ephemeral", ttl: "1h" }`）。 implicit/env-driven 长期保留（`OPENCLAW_CACHE_RETENTION=long`，无显式 `cacheRetention`）仅升级到 `api.anthropic.com` 或 Vertex AI （`aiplatform.googleapis.com` / `*-aiplatform.googleapis.com`） 主机上的 1 小时 TTL；其他主机保留 5 分钟缓存。

对于间隔不超过五分钟的请求，请保留 `short`。对于间隙较长的会话，请选择 `long`：对于五分钟缓存，缓存写入的成本是普通输入速率的两倍，而不是 1.25 倍，而读取的成本通常是输入速率的 0.1 倍。 TTL 在请求开始时启动，因此生成时间计入到期时间。 TTL 都不能重用其指令、工具、图像或早期消息发生更改的前缀，并且每个模型都有最小可缓存令牌计数。

来源：`packages/ai/src/transports/anthropic-payload-policy.ts`（`resolveAnthropicEphemeralCacheControl`、`isLongTtlEligibleEndpoint`）。

### DeepInfra

对于 `anthropic/*` 模型，托管和 SDK 聊天完成路径使用 [ 共享标记布局](#chat-completions-cache-markers)。 `cacheRetention: "none"` 禁用这些标记。默认情况下，`"short"` 和 `"long"` 都使用临时标记，而无需 TTL 覆盖； OpenClaw 不承担对此路由的一小时支持。

### <a id="model-studio-%2F-dashscope-(qwen)"></a><a id="model-studio-/-dashscope-qwen"></a> 模型工作室 / DashScope （Qwen）

两个聊天完成构建器都在本机或默认 Model Studio / DashScope 通过 `compat.cacheControlFormat: "anthropic"` 的路线上启用 [ 共享标记布局](#chat-completions-cache-markers)。显式模型兼容性设置优先于检测到的默认值。自定义代理端点不接收默认的自动格式；仅当代理支持这些标记时才显式设置 `compat.cacheControlFormat: "anthropic"`。

Model Studio 在系统缓存中包含工具定义，并忽略工具本身的标记，因此 OpenClaw 会忽略检测到的本机路由上的标记。 Qwen3.5及更高版本仅支持消息级检查点：将稳定和易失的系统内容拆分为块并不能保证稳定块的独立重用。请参阅 [Model Studio 显式缓存指南](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/explicit-cache-guide)。

显式 `cacheRetention` 值在不启用 `compat.supportsPromptCacheKey` 的情况下到达此传输；保留该标志未设置，因为该路由不需要 OpenAI 的 `prompt_cache_key` 或 `prompt_cache_retention` 字段。如果没有显式保留，传输将保留其 `"short"` 默认值。 Model Studio 使用五分钟的显式缓存窗口，因此 `"long"` 保留临时标记，而无需请求一小时的 TTL。

要禁用 OpenClaw 的显式标记，请设置 `cacheRetention: "none"`。当前的 `compat.cacheControlFormat` 架构仅接受 `"anthropic"`，而不接受禁用值；省略它使用检测到的默认值。阿里巴巴的自动隐式缓存是单独的，无法禁用。支持的模型、最小提示长度和缓存计费在 [Model Studio 上下文缓存](https://www.alibabacloud.com/help/en/model-studio/context-cache) 中进行了描述。

### <a id="openai-(direct-api)"></a><a id="openai-direct-api"></a> OpenAI（直接 API）

- 支持的较新模型会自动启用提示缓存；OpenClaw 不会注入块级缓存标记。
- OpenClaw 跨回合发送稳定的 `prompt_cache_key`。在 GPT-5.6 之前的模型上，这有助于缓存路由；在 GPT-5.6 及更高版本上，它分离缓存核算，而 OpenAI 自动处理路由。当会话或显式缓存密钥可用时，对直接 `api.openai.com` 主机的响应和聊天完成请求会自动获取此信息； `compat.supportsPromptCacheKey: false` 禁用它。 OpenAI- 兼容代理（oMLX、llama.cpp、自定义端点）需要模型配置中的 `compat.supportsPromptCacheKey: true` 才能选择加入 - 这对于代理来说永远不会自动检测到。
- `cacheRetention: "long"` 在两个 API 上请求 `prompt_cache_options: { ttl: "30m" }` 以获取 GPT-5.6 及更高版本。早期的原生模型仅针对 OpenAI 记录的延长保留模型接收 `prompt_cache_retention: "24h"`：GPT-5.5 / GPT-5.5 Pro、GPT-5.4、GPT-5.2、GPT-5.1 / Codex / Codex Max / Codex Mini / 聊天最新、GPT-5 / Codex 和 GPT-4.1（包括日期快照）。其他早期的本地模型没有生命周期字段。请参阅 [OpenAI 缓存寿命](https://developers.openai.com/api/docs/guides/prompt-caching#cache-lifetime)。
- Lifetime 字段需要缓存密钥支持和 `compat.supportsLongCacheRetention`（默认情况下为 true；Together AI 和 Cloudflare 配置文件禁用它）。选择加入的代理使用相同的 GPT-5.6+ TTL 映射，否则接收 `"24h"`；如果代理拒绝生命周期字段，则禁用长期保留支持。
- `cacheRetention: "short"` 发送不带生命周期字段的密钥，使提供程序的默认生命周期保持有效。 `cacheRetention: "none"` 抑制密钥和两个生命周期字段；它不会禁用 OpenAI 的自动提示缓存。
- Native ChatGPT-backed 响应路由保留会话缓存密钥，遵循 `none`，并省略 OpenAI 生命周期字段。
- 缓存命中会通过 `usage.prompt_tokens_details.cached_tokens`（Chat Completions）或 `input_tokens_details.cached_tokens`（Responses API）体现，并映射为 `cacheRead`。
- Responses API 有效负载还可以公开 `input_tokens_details.cache_write_tokens`，映射到 `cacheWrite` 并按模型的缓存写入速率定价；省略该字段的响应有效负载将 `cacheWrite` 保留为 `0`。包含 `prompt_tokens_details.cache_write_tokens` 的聊天完成有效负载也会填充 `cacheWrite`；可用性取决于模型和路线。
- Captured 连续响应请求主体保留字节相同的历史前缀，因此历史重写不能解释观察到的缺陷。提供程序断点放置可能会影响报告的 `cacheRead`：OpenAI 在平台 API 上记录 GPT-5.6 及更高版本的消息结束断点，而观察到 ChatGPT-backed Responses 路由以 1,024 个令牌步骤报告命中。请参阅下面的 [OpenAI 实时预期](#openai-live-expectations)。
- On 响应路由整个系统提示符，包括缓存边界以下的易失性后缀，以 `instructions` 形式发送。后缀更改（日期翻转、时区、提升的级别、观看的会话、模型标识、项目内存事实）会在下一个请求时从更改点重新缓存；稳定前缀和工具不会像 Anthropic 检查点那样分成单独的缓存块。缓存观察将此报告为 `systemPromptSuffix` 更改。

### Amazon Bedrock

- Anthropic Claude 模型参考（`amazon-bedrock/*anthropic.claude*`，加上 AWS 系统推理配置文件前缀 `us.`/`eu.`/`global.anthropic.claude*`）支持显式 `cacheRetention` 直通。
- 仅针对 AWS 记录为支持它的 Claude 模型世代请求保留一小时，包括 Haiku 5.5. 较旧的具有缓存功能的模型在选择 `cacheRetention: "long"` 时保留五分钟检查点，而不发送不支持的检查点TTL 字段。应用程序推理配置文件使用其解析支持模型的支持窗口。
- 稳定系统前缀的检查点与动态运行时添加分开。对话检查点通过保留的历史记录前进，包括工具结果；瞬态运行时上下文载体保留在缓存前缀之外。 Bedrock Mantle 的 Anthropic 消息传输还保留了单独的稳定系统边界。
- Nova Micro、Lite、Pro、Premier （`amazon.nova-{micro,lite,pro,premier}-v1:0`） 和 Nova 2 Lite （`amazon.nova-2-lite-v1:0`） 支持 `system` 和 `messages` 中的显式检查点，包括其 AWS 地理推理配置文件和基础模型 ARN。 `short`和`long`均采用Nova的五分钟TTL； `none` 禁用显式检查点。 OpenClaw 没有为 Nova 添加工具检查点。
- 其他非Claude基岩模型仍为`cacheRetention: "none"`。
- Nova 显式缓存是可选的：将 `cacheRetention` 显式设置为 `short` 或 `long`。在未设置保留的情况下，Nova 请求将保留其现有的有效负载布局，没有检查点；默认的 `short` 窗口和 `OPENCLAW_CACHE_RETENTION` 都不会启用 Nova 检查点。
- Opaque Bedrock 应用程序推理配置文件 ARN（不包含 `claude` 的配置文件 ID）也解析为无缓存保留，除非显式设置 `cacheRetention`，因为无法单独从 ARN 推断模型系列。

AWS的[提示缓存指南](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html)和[Micro](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-micro.html)、[Lite](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-lite.html)的模型卡， [Pro](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-pro.html)、[Premier](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-premier.html) 和 [Nova 2 Lite](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-2-lite.html) 列出了这些限制：最少 1K 令牌、四个检查点以及最多 20K Nova 缓存令牌。提供者令牌限制仍然决定是否缓存检查点。

Nova 显式缓存尚未由 OpenClaw 维护者针对 AWS 进行实时验证。实时 AWS 验收证明在具有 Bedrock 访问权限的维护人员运行之前仍然存在差距。

### OpenRouter

对于 `openrouter/anthropic/*` 模型引用（包括 `openrouter/~anthropic/*-latest` 别名），两个聊天完成构建器都会应用 [ 共享标记布局](#chat-completions-cache-markers)，但仅当请求仍然针对已验证的 OpenRouter 路由（其默认端点上的 `openrouter` 或任何provider/base URL 解析为 `openrouter.ai`）。将模型重新指向任意 OpenAI- 兼容代理 URL 会停止自动标记注入。 `cacheRetention: "long"` 在这些已验证的路由上请求 `ttl: "1h"`； `"none"` 禁用标记。参见[OpenRouter提示缓存](https://openrouter.ai/docs/guides/best-practices/prompt-caching)。

`contextPruning.mode: "cache-ttl"` 允许用于 `openrouter/anthropic/*`、`openrouter/deepseek/*`、`openrouter/moonshot/*`、`openrouter/moonshotai/*`、`openrouter/x-ai/*`、`openrouter/zai/*`、`openrouter/google/gemini-2.5*` 和 `openrouter/google/gemini-3*` 模型参考，因为这些路由处理提供者端提示缓存，而不需要 OpenClaw 的注入标记。较旧的 Gemini 模型和其他 `google/*` 模型（例如 Gemma）被排除，因为 OpenRouter 仅使用显式 `cache_control` 标记（如果有的话）缓存它们。

来源：`extensions/openrouter/index.ts` （`OPENROUTER_CACHE_TTL_MODEL_FAMILY`）。

OpenRouter 上的 DeepSeek 缓存构建是尽力而为的，可能需要几秒钟；立即跟进请求可能仍会显示 `cached_tokens: 0`。使用 `usage.prompt_tokens_details.cached_tokens` 作为缓存命中信号，在短暂延迟后通过重复的相同前缀请求进行验证。

### <a id="google-gemini-(direct-api)"></a><a id="google-gemini-direct-api"></a> Google Gemini（直接 API）

- 直接 Gemini 传输（`api: "google-generative-ai"`）通过上游 `cachedContentTokenCount` 报告缓存命中，并映射为 `cacheRead`。
- E 合格模型系列：`gemini-2.5*` 和 `gemini-3*`（不包括该前缀匹配之外的 Live/preview 变体，例如 `gemini-live-2.5-flash-preview`）。
- 当在符合条件的模型上设置 `cacheRetention` 时，OpenClaw 会自动创建、重用和刷新 `cachedContents` 资源，其中包含缓存边界上方的稳定系统前缀以及工具和工具配置 - 无需手动缓存内容句柄。 TTL 对于 `cacheRetention: "short"` 来说是 `300s`，对于 `"long"` 来说是 `3600s`。
- 易失性系统后缀首先在当前回合的隐藏运行时上下文载体内移动，然后再移动其他运行时事实。该载体是暂时的，因此后缀更改会重用相同的资源，而不会累积历史记录。稳定前缀或工具更改会创建新资源。如果创建失败或提示没有缓存边界，则完整的系统提示将保持内联。
- 自动资源也属于有效请求凭据和标头。更改凭据、项目标头或其他请求标头覆盖会创建新资源。缓存推理使用与资源创建相同的凭据； OAuth 令牌刷新保守地重建资源。为同一凭证重新颁发秘密占位符可以保留其身份。
- 你仍然可以通过 `params.cachedContent`（或旧版 `params.cached_content`）传入一个已存在的 Gemini cached-content 句柄；显式句柄会完全跳过自动缓存管理路径。
- 这与 Anthropic/OpenAI 提示前缀缓存分开：OpenClaw 管理 Gemini 的提供者本机 `cachedContents` 资源，而不是注入内联缓存标记。

来源：`src/agents/embedded-agent-runner/google-prompt-cache.ts`。

### <a id="cli-harness-providers-(claude-code%2C-gemini-cli)"></a><a id="cli-harness-providers-claude-code-gemini-cli"></a> CLI-harness 提供方（Claude Code、Gemini CLI）

发出 JSONL 使用事件（`jsonlDialect: "claude-stream-json"` 或 `"gemini-stream-json"`）的 CLI 后端会通过一个共享使用解析器，该解析器可识别多个字段名称变体，包括映射到 `cacheRead` 的普通 `cached` 计数器。当 CLI 的 JSON 有效负载省略直接输入令牌字段时，OpenClaw 将其派生为 `input_tokens - cached`。这只是使用规范化 - 它不会为这些 CLI- 驱动的模型创建 Anthropic/OpenAI-style 提示缓存标记。

Claude Code 在 `--append-system-prompt-file` 上没有 OpenClaw- 控制的 `cache_control` 断点，因此 OpenClaw 在该传输中保持其完整的系统提示。当有界版本检查发现 Claude Code 2.1.98 或更新版本时，捆绑的 `claude-cli` 也会通过 `--exclude-dynamic-system-prompt-sections`。第一次执行CLI或者直接Anthropic OAuth请求开始共享检查；并发执行重用它，并且 API 目录发现不会启动它。 Claude Code 标志仅将 Claude 自己的每台机器 cwd、环境、内存路径和 Git 状态部分移出其本机系统提示符；旧的、未知的或失败的检查会保留已建立的 argv。 `cacheRetention` 对该路径仍然没有影响。

通过 CLI 后端调度的一次性帮助程序运行，例如 `claude-cli` 上的 Active Memory 调用，在每次运行时获取新的会话密钥。这些运行在其唯一的用户回合中携带运行时事实行（代理、会话、模型、通道）而不是系统提示，因此重复调用一个代理会发送字节相同的系统提示，并且可以重用 Claude 的提示缓存。正常情况下CLI会在系统提示符中保留Runtime行。

来源：`src/agents/cli-output.ts`（`toCliUsage`）。

### <a id="other-providers"></a> 其他提供方

如果某个提供方不支持上述任何一种缓存模式，`cacheRetention` 将不起作用。

## <a id="chat-completions-cache-markers"></a> Chat 完成缓存标记

OpenAI- 与 `compat.cacheControlFormat: "anthropic"` 兼容的路由在托管传输、SDK 构建器和提供者包装器中共享一个标记策略：

- 当路径支持工具标记时，标记最后一个工具定义；工具仍然按名称排序。
- 稳定的system/developer块被标记，易失性后缀位于单独的未标记块中。
- 标记最新的合格用户文本或工具结果，通过工具循环和新转弯前进，同时跳过瞬态运行时上下文载体。

布局通常使用三个标记并保持在四个断点预算之内。 `cacheRetention: "none"` 不发出任何信号。会话检查点涵盖了所有先前的工具、系统内容和消息，因此更改易失性系统后缀仍然会使后面的检查点失效；早期的稳定系统检查点在后端支持块级缓存的情况下仍然可重用。后端令牌最小值和缓存生命周期仍然适用。

使用 `compat.requiresStringContent: true`，托管请求将消息内容保留为字符串并省略消息块标记，包括通过提供程序包装器。工具定义标记保留在受支持的位置。

检测到的默认值仅在经过验证的 OpenRouter 路由上请求 `ttl: "1h"`。对于支持一小时 Anthropic 缓存的自定义终端节点，显式设置 `compat.cacheControlFormat: "anthropic"`、`compat.supportsLongCacheRetention: true` 和 `cacheRetention: "long"` 以发送该 TTL。省略功能覆盖会保留没有 TTL 的自定义端点标记；将其设置为 `false` 会禁用一小时 TTL，即使在 OpenRouter 上也是如此。

## <a id="system-prompt-cache-boundary"></a> 系统提示缓存边界

OpenClaw 将系统提示拆分为一个**稳定前缀**和一个**易变后缀**，并在内部缓存前缀边界处进行划分。边界之上的内容（工具定义、技能元数据、工作区文件）会被安排为在各轮之间保持字节级完全一致。边界之下的内容（例如运行时时间戳和其他每轮元数据）可以变化，而不会使已缓存的前缀失效。

关键设计选择：

- 稳定的工作区项目上下文文件会被排在易变的每轮元数据之前，因此常规变动不会破坏稳定前缀。
- 该边界适用于 Anthropic- 系列、OpenAI- 系列、Google 和 CLI 传输整形，因此所有支持的提供商都受益于相同的前缀稳定性。
- Codex Responses 和 Anthropic Vertex 请求会通过感知边界的缓存形状进行路由，以便缓存复用与提供方实际接收到的内容保持一致。
- 系统提示指纹会被规范化（空白字符、换行符、hook 添加的上下文、运行时能力顺序），因此语义上未变化的提示在各轮之间可以共享缓存。

如果在配置或工作区变更后看到意外的 `cacheWrite` 激增，请检查该变更是落在缓存边界之上还是之下。将易变内容移到边界下方（或使其稳定）通常可以解决该问题。

没有显式消息缓存断点的聊天完成路由将有界运行时事实行移动到第一个发出的用户消息。这会将会话标识符保留在兼容本地服务器上的系统和工具前缀后面。在后续行动中，该线路将停留在第一条消息上。行为指令（包括挂钩添加、权限通知和 Git 共同作者指南）保留其 system/developer 角色。具有显式消息断点的路由保留其现有的系统布局。当前运行时上下文快照仍然使用其单独的瞬态载体；它们不会成为永久的第一条消息上下文。

## <a id="openclaw-cache-stability-guards"></a> OpenClaw 缓存稳定性防护

- 活动执行会话、子代理状态和媒体生成进度在当前用户消息之后在紧凑的运行时上下文载体中传输，因此更改不会重写对话历史记录之前的系统提示。项目内存事实、通道特定的 ACP 提示、delegation/orchestration 模式以及当前提升的级别保持在系统提示缓存边界以下；静态召回、安全性和能力指导位于其之上。
- 传送指令在系统提示高速缓存边界之后有效。 Native Codex 在后期上下文中携带当前的传递和目标策略，因此当可用功能保持不变时，交替传递模式不会重建其静态提示或消息工具目录。实际功能更改仍会更新目录。
- Subagent 完成轮次重用会话的通用对话元数据和 direct/group 指导，因此本机 Ollama 不会仅仅因为轮次通过公告到达而丢失工具和历史前缀。通道格式化遵循已解析的传递帐户，并且对于没有通道传递的轮次将被省略。自定义通道提供的组指令、更改的传递策略和显式轻量级引导上下文仍然可以产生不同的提示。
- 当活动回合成为历史记录时，用户消息元数据保持完整，包括对话上下文和回复目标。时间戳使用消息的记录时间，以便后续请求重播相同的文本。
- Prompt-hook prepend/append 上下文和模型提示替换在调度之前在其原始用户记录记录中捕获。稍后的请求和重新打开的会话会重播这些字节，而用户可见的历史记录会保留原始文本。没有记录投影的旧行保留其之前的重放行为；请参阅 [ 存储的投影兼容性 ](/reference/database-schemas/layout#user-turn-model-prompt-projections)。
- Bundled MCP 工具目录按服务器名称排序，然后在工具注册之前按工具名称排序，因此 `listTools()` 顺序更改不会搅动工具块并破坏提示缓存前缀。
- 消息工具操作枚举在策略过滤后进行排序，从而在通道发现顺序变化时保持相同的功能稳定。
- Native Ollama 请求按名称对工具进行排序，以便发现顺序更改不会扰乱工具前缀。
- 具有持久化图片块的旧会话会保留**最近 3 个已完成轮次**的完整内容（统计所有已完成轮次，而不只是包含图片的轮次）。较早且已处理过的图片块会被文本标记替换，这样包含大量图片的后续跟进就不会持续重新发送过期的大型负载。

## <a id="tuning-patterns"></a> 调优模式

### <a id="mixed-traffic-(recommended-default)"></a><a id="mixed-traffic-recommended-default"></a> 混合流量（推荐默认）

在主代理上保留长生命周期基线，在突发通知代理上禁用缓存：

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long"
  list:
    - id: "research"
      default: true
      heartbeat:
        every: "55m"
    - id: "alerts"
      params:
        cacheRetention: "none"
```

### <a id="cost-first-baseline"></a> 以成本优先的基线

- 设置基线`cacheRetention: "short"`。
- 启用 `contextPruning.mode: "cache-ttl"`。
- 仅对能从预热缓存中受益的代理，将 heartbeat 保持在你的 TTL 以下。

## <a id="live-regression-tests"></a> 实时回归测试

OpenClaw 运行一个组合的实时缓存回归门，涵盖重复前缀、工具轮转、图像轮转、MCP-style 工具脚本和 Anthropic 无缓存控件。

完整版本验证的 `live-cache` 套件还检查序列化传输前缀和真实代理跨指令刷新、提示挂钩和持久会话重新打开的情况。离线覆盖范围包括围绕生成的子进程的私有完成和进程内服务器 stop/start 进行经过身份验证的网关聊天，而无需重新启动 OS 进程。有关确切的边界、命令和估计成本，请参阅 [ 提示缓存回归覆盖率 ](/help/testing/suites#prompt-cache-regression-coverage)。

- `src/agents/live-cache-regression.live.test.ts`
- `src/agents/test-helpers/live-cache-regression-runner.ts`
- `src/agents/live-cache-regression-baseline.ts`

运行它：

```sh
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache
```

此命令通过共享实时运行器选择现有的缓存回归测试。设置 `OPENCLAW_VITEST_RUNTIME=bun` 在 Bun 上运行其提供者调用；默认为 Node。提供商使用摘要和咨询警告仍然可见，硬回归底线未通过测试。

基线文件存储最近观察到的实时数据以及测试检查所依据的特定于提供商的回归底线。每次运行都使用新的每次运行会话 ID 和提示命名空间，因此先前的缓存状态不会污染当前示例。 Anthropic 和 OpenAI 使用不同的强制执行：Anthropic 楼层未命中是硬回归（测试失败），而 OpenAI 楼层未命中是仅监视（记录为警告，不会使运行失败）。他们不共享单一的跨提供商门槛。

Claude CLI 提示重用具有单独的 Docker 通道，因为它执行 Claude Code 的本机会话传输，而不是直接的 Anthropic API。在新的转动和工具轴承预热恢复之后，它允许无工具解决恢复运行热或冷，弄脏工作空间，并且需要在下一个恢复中至少 90% 的重用，而不需要轮换已解决的实时会话生成。它还验证了思维层面的变化会轮换一代，并且下一个稳定的恢复会恢复至少 90% 的重用：

```sh
pnpm test:docker:live-cli-backend:claude:cache
```

### <a id="anthropic-live-expectations"></a> Anthropic 实时预期

- 预期通过 `cacheWrite` 明确写入预热。
- 在重复轮次中预期几乎完整的历史复用，因为 Anthropic 的缓存控制会随着对话推进缓存断点。
- 马厩、工具、图像和 MCP- 风格通道的基线楼层是硬回归门。

### <a id="openai-live-expectations"></a> OpenAI 实时预期

- 预期仅有 `cacheRead`；在 Chat Completions 上 `cacheWrite` 保持为 `0`。
- `cacheRead` 可以滞后于完整提示并以提供商大小的步骤前进。下面观察到的间隔不是未缓存输入的保证界限；路由、缓存可用性和更改的提示内容也可以减少重用。
- Floors 是仅监视的（未命中被记录为警告，而不是测试失败），源自在 `gpt-5.4-mini` 上观察到的实时行为，并且自 2026.4.5 以来没有变化：

| 场景             | `cacheRead` 下限 | 命中率下限 |
| -------------------- | ----------------: | -------------: |
| 稳定前缀        |             4,608 |           0.90 |
| 工具转写      |             4,096 |           0.85 |
| 图像转写     |             3,840 |           0.82 |
| MCP-风格成绩单 |             4,096 |           0.85 |

最近观察到的基线数字（来自`live-cache-regression-baseline.ts`，记录于2026年4月4日）落在：稳定前缀`cacheRead=4864`，命中率`0.966`；工具成绩单`cacheRead=4608`，命中率`0.896`；图像文字记录`cacheRead=4864`，命中率`0.954`； MCP-风格成绩单`cacheRead=4608`，命中率`0.891`。

为什么断言不同：Anthropic 公开显式缓存断点，而 OpenAI 报告的重用取决于可用的匹配缓存前缀。下面注明日期的测量结果显示逐步增长，而不是普遍的命中率保证。将两个提供商与单个跨提供商百分比阈值进行比较会产生错误的回归。

于 2026 年 9 月 16 日通过 ChatGPT- 支持的响应路由（`transport: auto`，默认 `cacheRetention`）使用 `openai/gpt-5.6-luna` 观察到，同时使用 `openclaw agent --local` 和隔离网关：

- 每个报告的 `cacheRead` 与 512 模 1,024 一致（`32256`、`33280`、`34304`、`35328`），与本示例中的 1,024 个令牌重用增量一致，而不是固定的证明提供者范围的断点策略。提示从 `32658` 变为 `33098` 代币跨越四轮的会话不断报告 `32256`，直到提示跨越下一个间隔；回合之间 60 秒的暂停并没有改变这一点。
- 连续的请求主体直到新附加的项目都是字节相同的，包括重放的运行时上下文载体，排除了这些捕获中的历史重写，而没有确定为什么每个令牌没有被重用。
- 在会话中更改主机时区（重写 `instructions` 内的 `## Temporal Context` 行）会在 `32974`-token 提示上从 `32256` 下降到 `22016` 缓存令牌；下一个转弯回到`32256`。
- A 新会话有时会在其第一个请求中重用共享指令和工具前缀，有时会冷启动，无论是否有共享 `prompt_cache_key`；路由看起来是会话粘性的，而不是密钥驱动的，这与 OpenAI 的注释相匹配，即在 GPT-5.6 及更高版本上优化缓存不需要密钥。

## <a id="diagnostics.cachetrace-config"></a><a id="diagnostics-cachetrace-config"></a> `diagnostics.cacheTrace` 配置

```yaml
diagnostics:
  cacheTrace:
    enabled: true
```

`enabled` 默认为 `false`。否则，缓存跟踪会写入 `$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`，并默认包含消息、提示词文本和系统提示词。输出路径和负载包含内容的覆盖设置仅可通过环境变量控制，用于一次性调试。

### <a id="env-toggles-(one-off-debugging)"></a><a id="env-toggles-one-off-debugging"></a> 环境变量开关（一次性调试）

| 变量                             | 作用                               |
| ------------------------------------ | ------------------------------------ |
| `OPENCLAW_CACHE_TRACE=1`             | 启用缓存跟踪                |
| `OPENCLAW_CACHE_TRACE_FILE=path`     | 覆盖输出路径                |
| `OPENCLAW_CACHE_TRACE_MESSAGES=0\|1` | 切换完整消息负载采集 |
| `OPENCLAW_CACHE_TRACE_PROMPT=0\|1`   | 切换提示词文本采集          |
| `OPENCLAW_CACHE_TRACE_SYSTEM=0\|1`   | 切换系统提示词采集        |

### <a id="what-to-inspect"></a> 需要检查什么

提示缓存观察记录每个已完成的前台模型请求的 `input`、`cacheRead` 和 `cacheWrite` 以及其稳定的系统前缀、易失性后缀和工具指纹，并标记来自先前请求的缓存读取丢弃，包括报告的零读取；账单总额保持独立。带标记的放置会列出自上次请求以来跟踪的更改（`model`、`cacheRetention`、`transport`、`streamStrategy`、`systemPrompt`、`systemPromptSuffix`、`tools`、`aggregateToolResultTruncation`）。跟踪结果需要缓存跟踪（`diagnostics.cacheTrace.enabled` 或 `OPENCLAW_CACHE_TRACE=1`）并识别其尝试中的每个请求。

当适配器将缓存遥测标记为不可用时，观察会忽略其缓存 read/write 计数并保留最后测量的比较基线。后来报告的零仍然算作测量失误。这种区别适用于具有可选缓存指标以及兼容云 API 的本地引擎。

当会话 ID 更改时，比较基线会重置，即使隔离的 cron 作业重用其提供程序缓存密钥也是如此。新的副本可以合法地重用比上次运行的最终请求更少的令牌。在一次会话内，`no tracked cache input change`表示跟踪到的指纹保持稳定；它不能证明相同的最终提供者有效负载或诊断缓存到期。在将下降归因于提供者缓存之前，比较请求时间和最终有效负载。

对于编码的提供者请求，`providerPrefix` 会比较序列化指令、工具和最多 512 个输入项。它命名第一个更改的项目，并带有前 32 个项目的有界协议字段（例如 `message:3.encrypted_content`），以及更改的请求参数（例如 `parameters:prompt_cache_key`）。值和未知字段名称永远不会被记录。 `order` 表示对象键顺序已更改，但未跟踪字段值更改；它是电讯证据，而不是提供者提供不同令牌的证据。超出项目限制后，尾部摘要可以检测更改，但无法找到第一个不同的项目。

`continuation:` 前缀表示任一请求使用 `previous_response_id`。它的 `wire-input` 项目是增量，因此它们之间的差异不会建立重写的对话历史记录。在归因缓存未命中之前，比较单独的 `historyRewrite` 信号和更改的请求参数。匹配的完整历史线路前缀也不能保证命中：OpenAI 必须找到可用的匹配缓存边界。

OpenClaw 还检查每个转换的请求历史记录是否扩展了同一会话中的先前请求。未声明的编辑、删除或重新排序记录 `historyRewrite` 并针对会话发出一次警告。诊断名称限制更改字段（例如 `timestamp`、`__openclaw` 或 `content[0]`），而不记录其值；超出诊断限制的字段将被分组。设置 `OPENCLAW_PROMPT_CACHE_ASSERT=1` 以在开发或测试期间抛出第一个不同的消息。压缩、修剪和瞬态运行时上下文删除将其重写声明为 `compaction`、`pruning` 和 `runtimeContextCarrier`；模型、运输或保留的变化开启了新的历史系列。图像块和附件引用保留在保留的历史记录中，而不是被基于年龄的清理标记替换。仅当每个原始属性仍然匹配时，内容块指纹才会重用哈希值；未更改的大文本和图像数据不会再次进行哈希处理。每次观察时都会检查嵌套块值和消息信封，因此即使重用包装器或内容数组，也能检测到就地编辑。字符串内容哈希与有界历史基线一起存在。提供者拥有的工具模式声明针对每个对象身份进行一次指纹识别。

- 缓存跟踪事件采用 JSONL 格式，包含分阶段快照，例如 `session:loaded`、`prompt:before`、`stream:context` 和 `session:after`。
- 每轮的缓存 token 影响会在常规使用界面中显示：`cacheRead` 和 `cacheWrite` 会出现在 `/usage tokens`、`/status`、会话使用摘要以及自定义的 `messages.usageTemplate` 布局中。
- 对于 Anthropic，在缓存启用时，预期会同时出现 `cacheRead` 和 `cacheWrite`。
- 对于 OpenAI，在缓存命中时预期会出现 `cacheRead`；`cacheWrite` 仅会在包含它的 Responses API 负载中填充（见上方的 [OpenAI](#openai-direct-api)）。
- OpenAI 还会返回诸如 `x-request-id`、`openai-processing-ms` 和 `x-ratelimit-*` 之类的跟踪与速率限制标头；可使用它们进行请求跟踪，但缓存命中统计仍应来自 usage 负载，而不是来自标头。

## <a id="quick-troubleshooting"></a> 快速故障排除

- **在大多数匝数上为高 `cacheWrite`**：检查易失性系统提示输入；验证 model/provider 支持您的缓存设置。
- **High Anthropic** 上的 `cacheWrite`：通常意味着缓存断点落在更改每个请求的内容上。易失性系统后缀更改可以保留稳定的系统前缀检查点，同时使以后的会话检查点无效；针对该更改的缓存观察报告 `systemPromptSuffix`。
- **Low OpenAI `cacheRead`**：验证稳定前缀在前面，重复前缀至少为 1024 个令牌，并且相同的 `prompt_cache_key` 被重用于应共享缓存的回合。不稳定的系统后缀更改可能会导致单轮下降，该下降会在下一个请求时恢复；启用缓存跟踪并在 `[prompt-cache]` 警告中查找 `systemPromptSuffix`。小的或逐步的短缺可以反映提供者的粒度，但不排除及时更改或缓存可用性。警告的 `requests` 字段将最后测量的缓存命中与丢弃的请求配对。对于编码的 HTTP 请求，它包括缓存键存在和哈希、延续 ID 存在、确切的请求字节、前 4096 字节的 SHA-256 哈希（如果较小，则为整个请求）、模型和路由哈希以及该模型调用中的编码尝试次数。可用的响应元数据包括 HTTP 状态、数字 `openai-processing-ms` 以及列入白名单的请求 ID、模型、帐户和区域标头的哈希值。原始密钥、ID、标头和提示内容永远不会包含在内。缺少字段意味着运输工具没有提供该证据；跨模型调用的重试和未观察到的传输重试不计算在内。
- **`cacheRetention` 没有效果**：确认模型键与 `agents.defaults.models["provider/model"]` 匹配。
- **Bedrock Nova 请求没有缓存命中**：将 `cacheRetention` 显式设置为 `short` 或 `long`，验证模型是否是上述支持的变体之一，并检查前缀是否满足 AWS 的令牌限制； `long`仍然使用五分钟的TTL。

## <a id="related"></a> 相关内容

- [代币使用和费用](/reference/token-use)
- [API 用途和费用](/reference/api-usage-costs)
- [使用情况跟踪](/concepts/usage-tracking)
- [人类](/providers/anthropic)
- [会话修剪](/concepts/session-pruning)
- [网关配置参考](/gateway/configuration-reference)。
