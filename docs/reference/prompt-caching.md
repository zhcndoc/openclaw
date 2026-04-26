---
summary: "提示缓存开关、合并顺序、提供者行为以及调优模式"
title: "提示缓存"
read_when:
  - 你想通过缓存保留减少提示令牌成本
  - 你需要在多代理设置中实现每个代理的缓存行为
  - 你正在同时调整心跳和缓存 TTL 修剪
---

提示缓存意味着模型提供者可以在不同轮次中重用未更改的提示前缀（通常是系统/开发者指令和其他稳定上下文），而不是每次都重新处理它们。OpenClaw 会将提供者的用法规范化为 `cacheRead` 和 `cacheWrite`，其中上游 API 直接暴露这些计数器。

当实时会话快照缺少这些计数器时，状态界面还可以从最近的 transcript
usage 日志中恢复缓存计数，因此即使部分会话元数据丢失，`/status` 也能继续
显示缓存行。现有的非零实时
缓存值仍然优先于 transcript 回退值。

重要性：降低令牌成本，加快响应速度，并为长时间会话提供更可预测的性能。没有缓存时，即使大部分输入未改动，重复提示每次都会支付完整提示成本。

本页涵盖所有影响提示重用和令牌成本的缓存相关设置。

Provider references:

- Anthropic 提示缓存: [https://platform.claude.com/docs/en/build-with-claude/prompt-caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- OpenAI 提示缓存: [https://developers.openai.com/api/docs/guides/prompt-caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- OpenAI API 标头和请求 ID: [https://developers.openai.com/api/reference/overview](https://developers.openai.com/api/reference/overview)
- Anthropic 请求 ID 和错误: [https://platform.claude.com/docs/en/api/errors](https://platform.claude.com/docs/en/api/errors)

## 主要设置

### `cacheRetention`（全局默认、模型及每代理）

将所有模型的缓存保留设置为全局默认值：

```yaml
agents:
  defaults:
    params:
      cacheRetention: "long" # 无 | 短 | 长
```

按模型覆盖：

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "short" # 可选值：none | short | long
```

每个代理覆盖示例：

```yaml
agents:
  list:
    - id: "alerts"
      params:
        cacheRetention: "none"
```

配置合并顺序：

1. `agents.defaults.params`（全局默认 — 适用于所有模型）
2. `agents.defaults.models["provider/model"].params`（按模型覆盖）
3. `agents.list[].params`（匹配的代理 ID；按键覆盖）

### `contextPruning.mode: "cache-ttl"`

在缓存 TTL 窗口后修剪旧的工具结果上下文，避免空闲后请求重新缓存过大历史。

```yaml
agents:
  defaults:
    contextPruning:
      mode: "cache-ttl"
      ttl: "1h"
```

完整行为请见 [会话修剪](/concepts/session-pruning)。

### 心跳保活

心跳可以保持缓存窗口活跃，减少空闲间隙后重复缓存写入。

```yaml
agents:
  defaults:
    heartbeat:
      every: "55m"
```

每个代理的心跳支持配置于 `agents.list[].heartbeat`。

## 提供者行为

### Anthropic（直接 API）

- 支持 `cacheRetention`。
- 使用 Anthropic API key 认证配置时，OpenClaw 会在未设置时为 Anthropic 模型引用预设 `cacheRetention: "short"`。
- Anthropic 原生 Messages 响应同时暴露 `cache_read_input_tokens` 和 `cache_creation_input_tokens`，因此 OpenClaw 可以同时显示 `cacheRead` 和 `cacheWrite`。
- 对于原生 Anthropic 请求，`cacheRetention: "short"` 映射到默认的 5 分钟临时缓存，而 `cacheRetention: "long"` 仅在直接 `api.anthropic.com` 主机上升级为 1 小时 TTL。

### OpenAI（直接 API）

- 支持模型上的最近版本时，提示缓存是自动的。OpenClaw 不需要注入块级缓存标记。
- OpenClaw 使用 `prompt_cache_key` 来保持跨轮次的缓存路由稳定，并且仅在直接 OpenAI 主机上选择 `cacheRetention: "long"` 时使用 `prompt_cache_retention: "24h"`。
- OpenAI 响应通过 `usage.prompt_tokens_details.cached_tokens`（或 Responses API 事件中的 `input_tokens_details.cached_tokens`）暴露已缓存的提示令牌。OpenClaw 将其映射为 `cacheRead`。
- OpenAI 不暴露单独的缓存写入令牌计数器，因此即使提供者正在预热缓存，`cacheWrite` 在 OpenAI 路径上仍保持 `0`。
- OpenAI 会返回有用的跟踪和限流标头，例如 `x-request-id`、`openai-processing-ms` 和 `x-ratelimit-*`，但缓存命中统计应来自 usage 载荷，而不是标头。
- 实际上，OpenAI 的行为通常更像初始前缀缓存，而不是 Anthropic 风格的移动式整段历史复用。当前实时探测中，稳定的长前缀文本轮次在当前 live 探测中可能接近 `4864` 的已缓存令牌平台，而工具密集或 MCP 风格的 transcript 即使在完全重复时也常在 `4608` 个已缓存令牌附近趋于平台化。

### Anthropic Vertex

- Vertex AI 上的 Anthropic 模型（`anthropic-vertex/*`）以与直接 Anthropic 相同的方式支持 `cacheRetention`。
- `cacheRetention: "long"` 映射到 Vertex AI 端点上真实的 1 小时提示缓存 TTL。
- `anthropic-vertex` 的默认缓存保留行为与直接 Anthropic 默认值一致。
- Vertex 请求通过感知边界的缓存形状进行路由，因此缓存复用会与提供者实际接收到的内容保持一致。

### Amazon Bedrock

- Anthropic Claude 模型引用（`amazon-bedrock/*anthropic.claude*`）支持显式传递 `cacheRetention`。
- 非 Anthropic Bedrock 模型在运行时被强制设为 `cacheRetention: "none"`。

### OpenRouter Anthropic 模型

对于 `openrouter/anthropic/*` 模型引用，OpenClaw 仅在请求仍然指向已验证的 OpenRouter 路由时，才会在 system/developer 提示块上注入 Anthropic 的
`cache_control`，以提升提示缓存复用（即 `openrouter` 使用其默认端点，或任何解析
到 `openrouter.ai` 的 provider/base URL）。

如果你将模型重定向到任意 OpenAI 兼容代理 URL，OpenClaw
会停止注入这些 OpenRouter 特定的 Anthropic 缓存标记。

### 其他提供者

若提供者不支持此缓存模式，`cacheRetention` 将无效果。

### Google Gemini direct API

- 直接 Gemini 传输（`api: "google-generative-ai"`）通过上游的 `cachedContentTokenCount` 报告缓存命中；OpenClaw 将其映射到 `cacheRead`。
- 当在直接 Gemini 模型上设置 `cacheRetention` 时，OpenClaw 会在 Google AI Studio 运行中自动为 system prompt 创建、复用并刷新 `cachedContents` 资源。这意味着你不再需要手动预先创建 cached-content 句柄。
- 你仍然可以通过配置好的模型传入现有的 Gemini cached-content 句柄，使用 `params.cachedContent`（或旧版 `params.cached_content`）。
- 这与 Anthropic/OpenAI 的提示前缀缓存不同。对于 Gemini，OpenClaw 管理的是提供者原生的 `cachedContents` 资源，而不是在请求中注入缓存标记。

### Gemini CLI JSON usage

- Gemini CLI JSON 输出也可以通过 `stats.cached` 暴露缓存命中；
  OpenClaw 将其映射到 `cacheRead`。
- 如果 CLI 省略了直接的 `stats.input` 值，OpenClaw 会根据
  `stats.input_tokens - stats.cached` 推导输入令牌。
- 这只是 usage 规范化，并不意味着 OpenClaw 正在为 Gemini CLI 创建
  Anthropic/OpenAI 风格的提示缓存标记。

## System-prompt 缓存边界

OpenClaw 将 system prompt 分割为由内部缓存前缀边界分隔的**稳定前缀**和**易变后缀**。边界上方的内容（工具定义、技能元数据、工作区文件以及其他相对静态的上下文）会被排序，以保持跨轮次字节级一致。边界下方的内容（例如 `HEARTBEAT.md`、运行时时间戳以及其他每轮元数据）允许变化，而不会使已缓存前缀失效。

关键设计选择：

- 稳定的工作区项目上下文文件会排在 `HEARTBEAT.md` 之前，因此
  心跳波动不会破坏稳定前缀。
- 该边界应用于 Anthropic 系列、OpenAI 系列、Google 以及 CLI 传输形状，
  以便所有受支持的提供者都能从相同的前缀稳定性中受益。
- Codex Responses 和 Anthropic Vertex 请求通过感知边界的缓存形状进行路由，因此缓存复用会与提供者实际接收到的内容保持一致。
- system-prompt 指纹会被规范化（空白、换行、hook 添加的上下文、运行时能力排序），因此语义未变的提示可以在不同轮次间共享 KV/缓存。

如果你在配置或工作区变更后看到意外的 `cacheWrite` 激增，
请检查该变更位于缓存边界之上还是之下。将易变内容移到边界下方（或使其稳定）
通常可以解决问题。

## OpenClaw 缓存稳定性保护

OpenClaw 还会在请求到达提供者之前，保持若干对缓存敏感的载荷形状具有确定性：

- Bundle MCP 工具目录会在工具注册前以确定性方式排序，因此
  `listTools()` 的顺序变化不会扰乱工具块并破坏提示缓存前缀。
- 带有持久化图像块的旧会话会保留**最近 3 个已完成轮次**不变；更早的、已处理过的图像块可能会被替换为标记，以避免图像密集的后续请求持续重新发送大量过时载荷。

## 调优模式

### 混合流量（推荐默认）

在主代理保持长时间缓存基线，关闭爆发式通知代理的缓存：

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

### 优先节省成本基线

- 设置基线 `cacheRetention: "short"`。
- 启用 `contextPruning.mode: "cache-ttl"`。
- 只为受益于保温缓存的代理保持心跳频率低于 TTL。

## 缓存诊断

OpenClaw 为内嵌代理运行提供专门的缓存跟踪诊断。

For normal user-facing diagnostics, `/status` and other usage summaries can use
the latest transcript usage entry as a fallback source for `cacheRead` /
`cacheWrite` when the live session entry does not have those counters.

## Live regression tests

OpenClaw keeps one combined live cache regression gate for repeated prefixes, tool turns, image turns, MCP-style tool transcripts, and an Anthropic no-cache control.

- `src/agents/live-cache-regression.live.test.ts`
- `src/agents/live-cache-regression-baseline.ts`

Run the narrow live gate with:

```sh
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache
```

The baseline file stores the most recent observed live numbers plus the provider-specific regression floors used by the test.
The runner also uses fresh per-run session IDs and prompt namespaces so previous cache state does not pollute the current regression sample.

These tests intentionally do not use identical success criteria across providers.

### Anthropic live expectations

- Expect explicit warmup writes via `cacheWrite`.
- Expect near-full history reuse on repeated turns because Anthropic cache control advances the cache breakpoint through the conversation.
- Current live assertions still use high hit-rate thresholds for stable, tool, and image paths.

### OpenAI live expectations

- Expect `cacheRead` only. `cacheWrite` remains `0`.
- Treat repeated-turn cache reuse as a provider-specific plateau, not as Anthropic-style moving full-history reuse.
- Current live assertions use conservative floor checks derived from observed live behavior on `gpt-5.4-mini`:
  - stable prefix: `cacheRead >= 4608`, hit rate `>= 0.90`
  - tool transcript: `cacheRead >= 4096`, hit rate `>= 0.85`
  - image transcript: `cacheRead >= 3840`, hit rate `>= 0.82`
  - MCP-style transcript: `cacheRead >= 4096`, hit rate `>= 0.85`

Fresh combined live verification on 2026-04-04 landed at:

- stable prefix: `cacheRead=4864`, hit rate `0.966`
- tool transcript: `cacheRead=4608`, hit rate `0.896`
- image transcript: `cacheRead=4864`, hit rate `0.954`
- MCP-style transcript: `cacheRead=4608`, hit rate `0.891`

Recent local wall-clock time for the combined gate was about `88s`.

Why the assertions differ:

- Anthropic exposes explicit cache breakpoints and moving conversation-history reuse.
- OpenAI 提示缓存仍然对精确前缀敏感，但 live Responses 流量中可复用的有效前缀可能比完整提示更早趋于平台。
- 因此，用单一跨提供者百分比阈值来比较 Anthropic 和 OpenAI 会产生误报回归。

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
- `OPENCLAW_CACHE_TRACE_FILE=/path/to/cache-trace.jsonl` 重写输出路径。
- `OPENCLAW_CACHE_TRACE_MESSAGES=0|1` 切换完整消息载荷捕获。
- `OPENCLAW_CACHE_TRACE_PROMPT=0|1` 切换提示文本捕获。
- `OPENCLAW_CACHE_TRACE_SYSTEM=0|1` 切换系统提示捕获。

### 检查内容

- Cache trace events are JSONL and include staged snapshots like `session:loaded`, `prompt:before`, `stream:context`, and `session:after`.
- Per-turn cache token impact is visible in normal usage surfaces via `cacheRead` and `cacheWrite` (for example `/usage full` and session usage summaries).
- For Anthropic, expect both `cacheRead` and `cacheWrite` when caching is active.
- For OpenAI, expect `cacheRead` on cache hits and `cacheWrite` to remain `0`; OpenAI does not publish a separate cache-write token field.
- If you need request tracing, log request IDs and rate-limit headers separately from cache metrics. OpenClaw's current cache-trace output is focused on prompt/session shape and normalized token usage rather than raw provider response headers.

## 快速故障排查

- 大多数轮次 `cacheWrite` 偏高：检查是否存在易变的系统提示输入，并确认模型/提供商支持你的缓存设置。
- Anthropic 上 `cacheWrite` 偏高：通常表示缓存断点落在每次请求都会变化的内容上。
- OpenAI `cacheRead` 偏低：确认稳定前缀位于开头，重复前缀至少有 1024 个 token，并且需要共享缓存的轮次复用相同的 `prompt_cache_key`。
- `cacheRetention` 没有效果：确认模型键是否与 `agents.defaults.models["provider/model"]` 匹配。
- 启用了缓存设置的 Bedrock Nova/Mistral 请求：预期运行时会强制为 `none`。

相关文档：

- [Anthropic](/providers/anthropic)
- [Token Use and Costs](/reference/token-use)
- [Session Pruning](/concepts/session-pruning)
- [Gateway Configuration Reference](/gateway/configuration-reference)

## 相关内容

- [Token use and costs](/reference/token-use)
- [API usage and costs](/reference/api-usage-costs)
