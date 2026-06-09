---
summary: "提示缓存的控制项、合并顺序、提供方行为和调优模式"
title: "提示缓存"
read_when:
  - 你想通过缓存保留来降低提示 token 成本
  - 你在多智能体场景中需要按智能体设置缓存行为
  - 你正在一起调优心跳和 cache-ttl 清理
---

提示缓存意味着模型提供方可以在不同轮次之间复用未变化的提示前缀（通常是 system/developer 指令和其他稳定上下文），而不是每次都重新处理它们。OpenClaw 将提供方的使用情况归一化为 `cacheRead` 和 `cacheWrite`，其中上游 API 会直接暴露这些计数器。

当实时会话快照缺少它们时，状态界面也可以从最近的转录使用日志中恢复缓存计数器，因此 `/status` 在部分会话元数据丢失后仍能继续显示缓存行。现有的非零实时缓存值仍然优先于转录回退值。

这很重要的原因在于：更低的 token 成本、更快的响应，以及更可预测的长会话性能。没有缓存时，即使大部分输入没有变化，重复的提示也会在每一轮都支付完整的提示成本。

下面各节涵盖所有会影响提示复用和 token 成本的缓存相关控制项。

提供方参考：

- Anthropic 提示缓存：[https://platform.claude.com/docs/en/build-with-claude/prompt-caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- OpenAI 提示缓存：[https://developers.openai.com/api/docs/guides/prompt-caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- OpenAI API 标头和请求 ID：[https://developers.openai.com/api/reference/overview](https://developers.openai.com/api/reference/overview)
- Anthropic 请求 ID 和错误：[https://platform.claude.com/docs/en/api/errors](https://platform.claude.com/docs/en/api/errors)

## 主要控制项

### `cacheRetention`（全局默认值、模型级和按智能体）

将缓存保留设置为所有模型的全局默认值：

```yaml
agents:
  defaults:
    params:
      cacheRetention: "long" # none | short | long
```

按模型覆盖：

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "short" # none | short | long
```

按智能体覆盖：

```yaml
agents:
  list:
    - id: "alerts"
      params:
        cacheRetention: "none"
```

配置合并顺序：

1. `agents.defaults.params`（全局默认值 — 适用于所有模型）
2. `agents.defaults.models["provider/model"].params`（按模型覆盖）
3. `agents.list[].params`（匹配的智能体 id；按键覆盖）

### `contextPruning.mode: "cache-ttl"`

在缓存 TTL 窗口过后清理旧的工具结果上下文，这样空闲后的请求就不会重新缓存过大的历史记录。

```yaml
agents:
  defaults:
    contextPruning:
      mode: "cache-ttl"
      ttl: "1h"
```

完整行为请参见 [会话修剪](/concepts/session-pruning)。

### 心跳保温

心跳可以保持缓存窗口处于温热状态，并减少空闲间隔后重复的缓存写入。

```yaml
agents:
  defaults:
    heartbeat:
      every: "55m"
```

按智能体设置的心跳支持 `agents.list[].heartbeat`。

## 提供方行为

### Anthropic（直接 API）

- 支持 `cacheRetention`。
- 对于使用 Anthropic API key 认证配置的 Anthropic 模型引用，OpenClaw 在未设置时会为其预设 `cacheRetention: "short"`。
- Anthropic 原生 Messages 响应同时暴露 `cache_read_input_tokens` 和 `cache_creation_input_tokens`，因此 OpenClaw 可以同时显示 `cacheRead` 和 `cacheWrite`。
- 对于原生 Anthropic 请求，`cacheRetention: "short"` 映射到默认的 5 分钟临时缓存，而 `cacheRetention: "long"` 仅在直接 `api.anthropic.com` 主机上升级为 1 小时 TTL。

### OpenAI（直接 API）

- 在受支持的较新模型上，提示缓存是自动的。OpenClaw 不需要注入块级缓存标记。
- OpenClaw 使用 `prompt_cache_key` 让跨轮次的缓存路由保持稳定。直接 OpenAI 主机在选择 `cacheRetention: "long"` 时会使用 `prompt_cache_retention: "24h"`。
- OpenAI 兼容的 Completions 提供方只有在其模型配置显式设置 `compat.supportsPromptCacheKey: true` 时才会接收 `prompt_cache_key`。长保留转发是另一项能力：显式 `cacheRetention: "long"` 仅在该 compat 条目也支持长缓存保留时发送 `prompt_cache_retention: "24h"`。诸如 Mistral 之类的提供方可以选择支持缓存键，同时将 `compat.supportsLongCacheRetention: false` 设为禁止长保留字段。`cacheRetention: "none"` 会同时抑制这两个字段。
- OpenAI 响应通过 `usage.prompt_tokens_details.cached_tokens`（或 Responses API 事件中的 `input_tokens_details.cached_tokens`）暴露缓存的提示 token。OpenClaw 会将其映射为 `cacheRead`。
- OpenAI 不会暴露单独的缓存写入 token 计数器，因此即使提供方正在预热缓存，OpenAI 路径中的 `cacheWrite` 也保持为 `0`。
- OpenAI 会返回有用的跟踪和限流标头，例如 `x-request-id`、`openai-processing-ms` 和 `x-ratelimit-*`，但缓存命中统计应来自 usage 负载，而不是标头。
- 实际上，OpenAI 的行为常常更像初始前缀缓存，而不是 Anthropic 风格的可移动全历史复用。稳定的长前缀文本轮次在当前实时探测中可能接近 `4864` 的缓存 token 平台期，而工具繁重或 MCP 风格的转录即使在完全重复时也常常接近 `4608` 个缓存 token。

### Anthropic Vertex

- Vertex AI 上的 Anthropic 模型（`anthropic-vertex/*`）支持 `cacheRetention`，方式与直接 Anthropic 相同。
- `cacheRetention: "long"` 会映射到 Vertex AI 端点上真实的 1 小时提示缓存 TTL。
- `anthropic-vertex` 的默认缓存保留与直接 Anthropic 的默认值一致。
- Vertex 请求通过感知边界的缓存整形进行路由，因此缓存复用会与提供方实际接收到的内容保持一致。

### Amazon Bedrock

- Anthropic Claude 模型引用（`amazon-bedrock/*anthropic.claude*`）支持显式的 `cacheRetention` 透传。
- 非 Anthropic 的 Bedrock 模型在运行时会被强制为 `cacheRetention: "none"`。

### OpenRouter 模型

对于 `openrouter/anthropic/*` 模型引用，OpenClaw 会在系统/开发者提示块上注入 Anthropic
`cache_control`，以改善提示缓存复用，但仅在请求仍然指向一个已验证的 OpenRouter 路由时才这样做
（`openrouter` 使用其默认端点，或者任何解析为 `openrouter.ai` 的 provider/base URL）。

对于 `openrouter/deepseek/*`、`openrouter/moonshot*/*` 和 `openrouter/zai/*`
模型引用，允许使用 `contextPruning.mode: "cache-ttl"`，因为 OpenRouter 会自动处理提供方侧的提示缓存。OpenClaw 不会在这些请求中注入
Anthropic `cache_control` 标记。

DeepSeek 的缓存构建尽力而为，可能需要几秒钟。立即的后续请求仍可能显示 `cached_tokens: 0`；请在短暂延迟后用重复的相同前缀请求进行验证，并将 `usage.prompt_tokens_details.cached_tokens`
作为缓存命中信号。

如果你把模型重定向到任意 OpenAI 兼容代理 URL，OpenClaw 将停止注入这些 OpenRouter 特定的 Anthropic 缓存标记。

### 其他提供方

如果提供方不支持此缓存模式，`cacheRetention` 不会产生作用。

### Google Gemini 直接 API

- 直接 Gemini 传输（`api: "google-generative-ai"`）通过上游的 `cachedContentTokenCount` 报告缓存命中；OpenClaw 将其映射为 `cacheRead`。
- 当在直接 Gemini 模型上设置了 `cacheRetention` 时，OpenClaw 会在 Google AI Studio 运行中自动为系统提示创建、复用和刷新 `cachedContents` 资源。这意味着你不再需要手动预先创建一个 cached-content 句柄。
- 你仍然可以在已配置的模型上通过 `params.cachedContent`（或旧版的 `params.cached_content`）传入现有的 Gemini cached-content 句柄。
- 这与 Anthropic/OpenAI 的提示前缀缓存是分开的。对于 Gemini，OpenClaw 管理的是提供方原生的 `cachedContents` 资源，而不是向请求中注入缓存标记。

### Gemini CLI JSON 使用情况

- Gemini CLI 的 JSON 输出也可以通过 `stats.cached` 显示缓存命中；OpenClaw 将其映射为 `cacheRead`。
- 如果 CLI 省略了直接的 `stats.input` 值，OpenClaw 会根据 `stats.input_tokens - stats.cached` 推导输入 token。
- 这只是使用情况归一化。它并不意味着 OpenClaw 正在为 Gemini CLI 创建 Anthropic/OpenAI 风格的提示缓存标记。

## 系统提示缓存边界

OpenClaw 会将系统提示拆分为一个 **稳定前缀** 和一个 **易变后缀**，二者之间由内部缓存前缀边界分隔。边界上方的内容（工具定义、技能元数据、工作区文件以及其他相对静态的上下文）会被排序，以确保它在不同轮次之间保持字节级一致。边界下方的内容（例如 `HEARTBEAT.md`、运行时时间戳以及其他每轮元数据）可以变化，而不会使已缓存前缀失效。

关键设计选择：

- 稳定的工作区项目上下文文件会排在 `HEARTBEAT.md` 之前，因此心跳抖动不会破坏稳定前缀。
- 该边界会应用于 Anthropic 家族、OpenAI 家族、Google 和 CLI 传输整形，因此所有受支持的提供方都能受益于相同的前缀稳定性。
- Codex Responses 和 Anthropic Vertex 请求通过感知边界的缓存整形进行路由，因此缓存复用会与提供方实际接收到的内容保持一致。
- 系统提示指纹会被归一化（空白字符、行尾、钩子添加的上下文、运行时能力排序），因此语义上未变化的提示会在不同轮次之间共享 KV/缓存。

如果你在配置或工作区变更后看到意外的 `cacheWrite` 激增，请检查该变更落在缓存边界之上还是之下。将易变内容移到边界下方（或使其稳定）通常可以解决问题。

## OpenClaw 缓存稳定性防护

OpenClaw 还会在请求到达提供方之前，保持若干对缓存敏感的负载形状确定性：

- Bundle MCP 工具目录会在工具注册前按确定性方式排序，因此 `listTools()` 的顺序变化不会扰动工具块并破坏提示缓存前缀。
- 带有持久化图片块的旧会话会保留 **最近 3 个已完成轮次**；更早且已处理过的图片块可能会被替换为标记，这样图片较多的后续跟进就不会持续重新发送大量过时负载。

## 调优模式

### 混合流量（推荐默认）

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

### 以成本优先的基线

- 将基线 `cacheRetention` 设为 `short`。
- 启用 `contextPruning.mode: "cache-ttl"`。
- 仅对能从预热缓存中受益的代理，将 heartbeat 保持在你的 TTL 以下。

## 缓存诊断

OpenClaw 为嵌入式代理运行提供专用的缓存跟踪诊断。

对于普通面向用户的诊断，`/status` 和其他使用情况摘要可以在实时会话条目没有这些计数器时，使用最新的转录使用条目作为 `cacheRead` /
`cacheWrite` 的回退来源。

## 实时回归测试

OpenClaw 为重复前缀、工具轮次、图像轮次、MCP 风格工具转录以及 Anthropic 无缓存控制保留了一个统一的实时缓存回归门禁。

- `src/agents/live-cache-regression.live.test.ts`
- `src/agents/live-cache-regression-baseline.ts`

使用以下命令运行窄范围的实时门禁：

```sh
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache
```

基线文件保存最近观测到的实时数值，以及测试使用的各提供方特定回归下限。
运行器还会为每次运行使用新的会话 ID 和提示命名空间，以免之前的缓存状态污染当前的回归样本。

这些测试有意不对不同提供方使用完全相同的成功标准。

### Anthropic 实时预期

- 预期通过 `cacheWrite` 显式写入预热。
- 预期在重复轮次中几乎完整复用历史，因为 Anthropic 缓存控制会推动缓存断点在对话中前移。
- 当前实时断言仍对稳定、工具和图像路径使用较高的命中率阈值。

### OpenAI 实时预期

- 仅预期 `cacheRead`。`cacheWrite` 保持为 `0`。
- 将重复轮次的缓存复用视为提供方特定的平台期，而不是 Anthropic 风格的移动式全历史复用。
- 当前实时断言使用基于 `gpt-5.4-mini` 观测到的实时行为得出的保守下限检查：
  - 稳定前缀：`cacheRead >= 4608`，命中率 `>= 0.90`
  - 工具转录：`cacheRead >= 4096`，命中率 `>= 0.85`
  - 图像转录：`cacheRead >= 3840`，命中率 `>= 0.82`
  - MCP 风格转录：`cacheRead >= 4096`，命中率 `>= 0.85`

在 2026-04-04 的最新联合实时验证结果为：

- 稳定前缀：`cacheRead=4864`，命中率 `0.966`
- 工具转录：`cacheRead=4608`，命中率 `0.896`
- 图像转录：`cacheRead=4864`，命中率 `0.954`
- MCP 风格转录：`cacheRead=4608`，命中率 `0.891`

最近一次本地运行该联合门禁的墙钟时间约为 `88s`。

断言不同的原因：

- Anthropic 暴露了显式的缓存断点以及会移动的对话历史复用。
- OpenAI 的提示缓存仍然对精确前缀敏感，但在实际 Responses 流量中，可复用前缀的有效长度可能比完整提示更早进入平台期。
- 因此，如果用单一的跨提供方百分比阈值来比较 Anthropic 和 OpenAI，会产生误报回归。

### `diagnostics.cacheTrace` 配置

```yaml
diagnostics:
  cacheTrace:
    enabled: true
    filePath: "~/.openclaw/logs/cache-trace.jsonl" # 可选
    includeMessages: false # 默认 true
    includePrompt: false # 默认 true
    includeSystem: false # 默认 true
```

默认值：

- `filePath`: `$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`
- `includeMessages`: `true`
- `includePrompt`: `true`
- `includeSystem`: `true`

### 环境变量开关（一次性调试）

- `OPENCLAW_CACHE_TRACE=1` 启用缓存跟踪。
- `OPENCLAW_CACHE_TRACE_FILE=/path/to/cache-trace.jsonl` 覆盖输出路径。
- `OPENCLAW_CACHE_TRACE_MESSAGES=0|1` 切换是否捕获完整消息载荷。
- `OPENCLAW_CACHE_TRACE_PROMPT=0|1` 切换是否捕获提示文本。
- `OPENCLAW_CACHE_TRACE_SYSTEM=0|1` 切换是否捕获系统提示。

### 需要检查什么

- 缓存跟踪事件是 JSONL，并包含分阶段快照，例如 `session:loaded`、`prompt:before`、`stream:context` 和 `session:after`。
- 每轮缓存令牌影响可通过正常使用界面中的 `cacheRead` 和 `cacheWrite` 看到（例如 `/usage full` 和会话使用摘要）。
- 对于 Anthropic，在缓存启用时，预期同时存在 `cacheRead` 和 `cacheWrite`。
- 对于 OpenAI，在缓存命中时预期有 `cacheRead`，而 `cacheWrite` 保持为 `0`；OpenAI 不会公开单独的缓存写入令牌字段。
- 如果你需要请求跟踪，请将请求 ID 和限流头单独记录，不要与缓存指标混在一起。OpenClaw 当前的缓存跟踪输出重点关注提示/会话形态和归一化后的令牌使用，而不是原始提供方响应头。

## 快速故障排查

- 大多数轮次 `cacheWrite` 很高：检查系统提示输入是否有波动，并确认模型/提供方支持你的缓存设置。
- Anthropic 上 `cacheWrite` 很高：通常意味着缓存断点落在每次请求都会变化的内容上。
- OpenAI `cacheRead` 很低：确认稳定前缀位于开头、重复前缀至少有 1024 个 token，并且对应该共享缓存的轮次复用了相同的 `prompt_cache_key`。
- `cacheRetention` 没有效果：确认模型键匹配 `agents.defaults.models["provider/model"]`。
- 带缓存设置的 Bedrock Nova/Mistral 请求：运行时预期会强制为 `none`。

相关文档：

- [Anthropic](/providers/anthropic)
- [Token 使用与成本](/reference/token-use)
- [会话修剪](/concepts/session-pruning)
- [网关配置参考](/gateway/configuration-reference)

## 相关

- [Token 使用与成本](/reference/token-use)
- [API 使用与成本](/reference/api-usage-costs)
