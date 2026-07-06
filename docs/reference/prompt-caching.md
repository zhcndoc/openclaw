---
summary: "提示缓存的控制项、合并顺序、提供方行为和调优模式"
title: "提示缓存"
read_when:
  - 你想通过缓存保留来降低提示 token 成本
  - 你在多智能体场景中需要按智能体设置缓存行为
  - 你正在一起调优心跳和 cache-ttl 清理
---

提示缓存使模型提供方能够在多轮交互中复用未更改的提示前缀（系统/开发者指令、工具定义以及其他稳定上下文），而不是在每次请求时都重新处理它。这可以降低长时间会话中重复上下文带来的 token 成本和延迟。

OpenClaw 会在上游 API 暴露这些计数器的地方，将提供方使用情况统一规范为 `cacheRead` 和 `cacheWrite`。如果实时会话快照缺少缓存计数器，使用摘要（`/status` 及类似接口）会回退到上一条转录使用记录；非零的实时值始终优先于回退值。

提供方参考：

- [Anthropic prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [OpenAI prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching)

## 主要控制项

### `cacheRetention`

取值：`"none" | "short" | "long"`。可作为全局默认值、按模型配置，以及按代理配置。

```yaml
agents:
  defaults:
    params:
      cacheRetention: "long" # none | short | long
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "short" # 覆盖此模型的全局默认值
  list:
    - id: "alerts"
      params:
        cacheRetention: "none" # 覆盖此代理的两个默认值
```

合并顺序（后者覆盖前者）：

1. `agents.defaults.params` - 所有模型的全局默认值
2. `agents.defaults.models["provider/model"].params` - 按模型覆盖
3. `agents.list[].params` - 按代理覆盖，按代理 id 匹配

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

完整行为请参见 [Session pruning](/concepts/session-pruning)。

### 心跳保温

Heartbeat 可以保持缓存窗口“保温”，并减少空闲间隔后重复的缓存写入。可全局配置（`agents.defaults.heartbeat`）或按代理配置（`agents.list[].heartbeat`）。

```yaml
agents:
  defaults:
    heartbeat:
      every: "55m"
```

## 提供方行为

### Anthropic（直接 API 和 Vertex AI）

- `cacheRetention` 支持 `anthropic` 和 `anthropic-vertex` 提供方，以及在 `cacheRetention` 明确设置时，支持 `amazon-bedrock` 上的 Claude 模型和自定义 `anthropic-messages` 兼容端点。
- 当未设置时，OpenClaw 会为直接 Anthropic（仅 `anthropic` 和 `anthropic-vertex` 提供方）默认填充 `cacheRetention: "short"`；其他 Anthropic 系路由需要显式指定值。
- 原生 Anthropic Messages 响应会暴露 `cache_read_input_tokens` 和 `cache_creation_input_tokens`，分别映射为 `cacheRead` 和 `cacheWrite`。
- `cacheRetention: "short"` 映射到默认的 5 分钟临时缓存。`cacheRetention: "long"` 在显式设置时会请求 1 小时 TTL（`cache_control: { type: "ephemeral", ttl: "1h" }`）。隐式/由环境驱动的长保留（`OPENCLAW_CACHE_RETENTION=long` 且未显式设置 `cacheRetention`）仅在 `api.anthropic.com` 或 Vertex AI（`aiplatform.googleapis.com` / `*-aiplatform.googleapis.com`）主机上升级为 1 小时 TTL；其他主机仍保持 5 分钟缓存。

来源：`src/agents/anthropic-payload-policy.ts`（`resolveAnthropicEphemeralCacheControl`、`isLongTtlEligibleEndpoint`）。

### OpenAI（直接 API）

- 支持的较新模型会自动启用提示缓存；OpenClaw 不会注入块级缓存标记。
- OpenClaw 会发送 `prompt_cache_key` 以保持跨轮次的缓存路由稳定。直接的 `api.openai.com` 主机会自动获得该设置。OpenAI 兼容代理（oMLX、llama.cpp、自定义端点）需要在模型配置中设置 `compat.supportsPromptCacheKey: true` 才会启用——对代理来说这不会被自动检测。
- 仅当选择 `cacheRetention: "long"`，且解析后的端点同时支持缓存键和长保留（`compat.supportsLongCacheRetention`，默认 `true`；Together AI 和 Cloudflare 兼容配置文件会禁用它）时，才会添加 `prompt_cache_retention: "24h"`。`cacheRetention: "none"` 会抑制这两个字段。
- 缓存命中会通过 `usage.prompt_tokens_details.cached_tokens`（Chat Completions）或 `input_tokens_details.cached_tokens`（Responses API）体现，并映射为 `cacheRead`。
- Responses API 的负载还可能暴露 `input_tokens_details.cache_write_tokens`，映射为 `cacheWrite`，并按模型的缓存写入费率计费；省略该字段的 Responses 负载会将 `cacheWrite` 保持为 `0`。OpenAI 的 Chat Completions API 并未文档化或输出 `cache_write_tokens` 计数器，但 OpenClaw 仍会在此读取 `prompt_tokens_details.cache_write_tokens`，以支持报告单独写入计数的 OpenRouter 兼容代理和 DeepSeek 风格代理。
- 实际上，OpenAI 更像是一个初始前缀缓存，而不是 Anthropic 那种会随完整历史记录移动复用的缓存——参见下方的 [OpenAI 实时预期](#openai-live-expectations)。

### Amazon Bedrock

- Anthropic Claude 模型引用（`amazon-bedrock/*anthropic.claude*`，以及 AWS 系统推理配置文件前缀 `us.`/`eu.`/`global.anthropic.claude*`）支持显式 `cacheRetention` 透传。
- 非 Anthropic 的 Bedrock 模型（例如 `amazon.nova-*`）在运行时会解析为不保留缓存，无论配置了什么 `cacheRetention` 值。
- 模糊的 Bedrock 应用推理配置文件 ARN（不包含 `claude` 的配置文件 ID）也会在未显式设置 `cacheRetention` 时解析为不保留缓存，因为仅凭 ARN 无法推断模型家族。

### OpenRouter

对于 `openrouter/anthropic/*` 模型引用，OpenClaw 会在 system/developer 提示块上注入 Anthropic 的 `cache_control` 标记，但前提是请求仍然指向一个已验证的 OpenRouter 路由（默认端点上的 `openrouter`，或任何解析到 `openrouter.ai` 的 provider/base URL）。如果把模型改指向任意 OpenAI 兼容代理 URL，则会停止注入。

`contextPruning.mode: "cache-ttl"` 允许用于 `openrouter/anthropic/*`、`openrouter/deepseek/*`、`openrouter/moonshot/*`、`openrouter/moonshotai/*` 和 `openrouter/zai/*` 模型引用，因为这些路由会在提供方侧处理提示缓存，而不需要 OpenClaw 注入标记。

来源：`extensions/openrouter/index.ts`（`OPENROUTER_CACHE_TTL_MODEL_PREFIXES`）。

OpenRouter 上的 DeepSeek 缓存构建尽力而为，可能需要几秒钟；立即紧接着的后续请求仍可能显示 `cached_tokens: 0`。请在短暂延迟后使用相同前缀再次请求，并以 `usage.prompt_tokens_details.cached_tokens` 作为缓存命中信号进行验证。

### Google Gemini（直接 API）

- 直接 Gemini 传输（`api: "google-generative-ai"`）通过上游 `cachedContentTokenCount` 报告缓存命中，并映射为 `cacheRead`。
- 适用的模型家族：`gemini-2.5*` 和 `gemini-3*`（不包括该前缀匹配之外的 Live/preview 变体，例如 `gemini-live-2.5-flash-preview`）。
- 当在适用模型上设置了 `cacheRetention` 时，OpenClaw 会自动为 system prompt 创建、复用并刷新一个 `cachedContents` 资源——无需手动提供 cached-content 句柄。TTL 在 `cacheRetention: "short"` 时为 `300s`，在 `"long"` 时为 `3600s`。
- 你仍然可以通过 `params.cachedContent`（或旧版 `params.cached_content`）传入一个已存在的 Gemini cached-content 句柄；显式句柄会完全跳过自动缓存管理路径。
- 这与 Anthropic/OpenAI 的提示前缀缓存不同：OpenClaw 为 Gemini 管理的是提供方原生的 `cachedContents` 资源，而不是注入内联缓存标记。

来源：`src/agents/embedded-agent-runner/google-prompt-cache.ts`。

### CLI-harness 提供方（Claude Code、Gemini CLI）

输出 JSONL usage 事件的 CLI 后端（`jsonlDialect: "claude-stream-json"` 或 `"gemini-stream-json"`）会经过一个共享的 usage 解析器，该解析器识别多种字段名变体，包括一个普通的 `cached` 计数器并将其映射为 `cacheRead`。当 CLI 的 JSON 负载省略直接的输入 token 字段时，OpenClaw 会将其推导为 `input_tokens - cached`。这仅仅是 usage 规范化——不会为这些由 CLI 驱动的模型创建 Anthropic/OpenAI 风格的提示缓存标记。

来源：`src/agents/cli-output.ts`（`toCliUsage`）。

### 其他提供方

如果某个提供方不支持上述任何一种缓存模式，`cacheRetention` 将不起作用。

## 系统提示缓存边界

OpenClaw 将系统提示拆分为一个 **稳定前缀** 和一个 **易变后缀**，分隔点位于内部缓存前缀边界处。边界上方的内容（工具定义、技能元数据、工作区文件）会被安排为在各轮之间保持字节级完全一致。边界下方的内容（例如 `HEARTBEAT.md`、运行时时间戳、其他每轮元数据）可以变化，而不会使已缓存的前缀失效。

关键设计选择：

- 稳定的工作区项目上下文文件会被排在 `HEARTBEAT.md` 之前，这样心跳波动就不会破坏稳定前缀。
- 该边界适用于 Anthropic 系列、OpenAI 系列、Google 以及 CLI 的传输整形，因此所有受支持的提供方都能从相同的前缀稳定性中受益。
- Codex Responses 和 Anthropic Vertex 请求会通过感知边界的缓存整形进行路由，从而使缓存复用与提供方实际接收到的内容保持一致。
- 系统提示指纹会进行归一化处理（空白字符、行尾、hook 添加的上下文、运行时能力排序），因此语义上未变化的提示可以在各轮之间共享缓存。

如果在配置或工作区变更后看到意外的 `cacheWrite` 激增，请检查该变更是落在缓存边界之上还是之下。将易变内容移到边界下方（或使其稳定）通常可以解决该问题。

## OpenClaw 缓存稳定性防护

- 打包的 MCP 工具目录在工具注册之前会按确定性顺序排序（先按服务器名称，再按工具名称），因此 `listTools()` 顺序变化不会导致 tools 区块频繁变动并破坏提示缓存前缀。
- 具有持久化图片块的旧会话会保留**最近 3 个已完成轮次**的完整内容（统计所有已完成轮次，而不只是包含图片的轮次）。较早且已处理过的图片块会被文本标记替换，这样包含大量图片的后续跟进就不会持续重新发送过期的大型负载。

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

## 实时回归测试

OpenClaw 运行一个组合式实时缓存回归门，覆盖重复前缀、工具轮次、图像轮次、MCP 风格工具转写，以及一个 Anthropic 无缓存对照。

- `src/agents/live-cache-regression.live.test.ts`
- `src/agents/live-cache-regression-runner.ts`
- `src/agents/live-cache-regression-baseline.ts`

使用以下命令运行：

```sh
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache
```

基线文件保存最近一次观测到的实时数值，以及测试所检查的、各提供方特定的回归下限。每次运行都会使用新的按运行分配的 session ID 和 prompt 命名空间，因此之前的缓存状态不会污染当前样本。Anthropic 和 OpenAI 的约束方式不同：Anthropic 的下限未达标会被视为硬回归（测试失败），而 OpenAI 的下限未达标则只会被监控（记录为警告，不会使运行失败）。它们不共享单一的跨提供方阈值。

### Anthropic 实时预期

- 预期通过 `cacheWrite` 明确写入预热。
- 在重复轮次中预期几乎完整的历史复用，因为 Anthropic 的缓存控制会随着对话推进缓存断点。
- 稳定、工具、图像和 MCP 风格通道的基线下限属于硬回归门槛。

### OpenAI 实时预期

- 预期仅有 `cacheRead`；在 Chat Completions 上 `cacheWrite` 保持为 `0`。
- 将重复轮次的缓存复用视为提供方特定的平台期，而不是 Anthropic 风格的完整历史复用。
- 下限仅作监控（未达标会记录为警告，不会导致测试失败），这些数值依据 `gpt-5.4-mini` 的实时观测行为得出：

| 场景                 | `cacheRead` 下限 | 命中率下限 |
| -------------------- | ----------------: | ---------: |
| 稳定前缀             |             4,608 |       0.90 |
| 工具转写             |             4,096 |       0.85 |
| 图像转写             |             3,840 |       0.82 |
| MCP 风格转写         |             4,096 |       0.85 |

最近观测到的基线数值（来自 `live-cache-regression-baseline.ts`）为：稳定前缀 `cacheRead=4864`，命中率 `0.966`；工具转写 `cacheRead=4608`，命中率 `0.896`；图像转写 `cacheRead=4864`，命中率 `0.954`；MCP 风格转写 `cacheRead=4608`，命中率 `0.891`。

为什么断言不同：Anthropic 暴露了明确的缓存断点以及会随着对话推进的历史复用，而 OpenAI 在实时流量中的有效可复用前缀可能会早于完整提示词进入平台期。将两家提供方都对齐到同一个跨提供方百分比阈值会产生误报回归。

## `diagnostics.cacheTrace` 配置

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

| 键                | 默认值                                       |
| ----------------- | -------------------------------------------- |
| `filePath`        | `$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl` |
| `includeMessages` | `true`                                       |
| `includePrompt`   | `true`                                       |
| `includeSystem`   | `true`                                       |

### 环境变量开关（一次性调试）

| 变量                                 | 作用                                 |
| ------------------------------------ | ------------------------------------ |
| `OPENCLAW_CACHE_TRACE=1`             | 启用缓存跟踪                           |
| `OPENCLAW_CACHE_TRACE_FILE=path`     | 覆盖输出路径                           |
| `OPENCLAW_CACHE_TRACE_MESSAGES=0\|1` | 切换完整消息负载采集                   |
| `OPENCLAW_CACHE_TRACE_PROMPT=0\|1`   | 切换提示词文本采集                     |
| `OPENCLAW_CACHE_TRACE_SYSTEM=0\|1`   | 切换系统提示词采集                     |

### 需要检查什么

- Cache trace 事件是 JSONL 格式，包含分阶段快照，例如 `session:loaded`、`prompt:before`、`stream:context` 和 `session:after`。
- 每轮的缓存 token 影响会在常规使用界面中显示：`cacheRead` 和 `cacheWrite` 会出现在 `/usage tokens`、`/status`、会话使用摘要以及自定义的 `messages.usageTemplate` 布局中。
- 对于 Anthropic，在缓存启用时，预期会同时出现 `cacheRead` 和 `cacheWrite`。
- 对于 OpenAI，在缓存命中时预期会出现 `cacheRead`；`cacheWrite` 仅会在包含它的 Responses API 负载中填充（见上方的 [OpenAI](#openai-direct-api)）。
- OpenAI 还会返回诸如 `x-request-id`、`openai-processing-ms` 和 `x-ratelimit-*` 之类的跟踪与速率限制头；可使用它们进行请求跟踪，但缓存命中统计仍应来自 usage 负载，而不是来自头部。

## 快速故障排查

- **大多数轮次中 `cacheWrite` 很高**：检查是否存在易变的 system prompt 输入；确认模型/提供商支持你的缓存设置。
- **Anthropic 中 `cacheWrite` 很高**：通常表示缓存断点落在每次请求都会变化的内容上。
- **OpenAI `cacheRead` 很低**：确认稳定前缀位于最前面，重复前缀至少有 1024 个 token，并且在应共享缓存的轮次中复用了相同的 `prompt_cache_key`。
- **`cacheRetention` 没有效果**：确认模型键与 `agents.defaults.models["provider/model"]` 匹配。
- **带有缓存设置的 Bedrock Nova 请求**：这是预期行为——它们在运行时会解析为无缓存保留。

相关文档：

- [Anthropic](/providers/anthropic)
- [Token 使用与成本](/reference/token-use)
- [会话修剪](/concepts/session-pruning)
- [网关配置参考](/gateway/configuration-reference)

## 相关

- [Token 使用与成本](/reference/token-use)
- [API 使用与成本](/reference/api-usage-costs)
