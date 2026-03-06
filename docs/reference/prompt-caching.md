---
title: "提示缓存"
summary: "提示缓存设置、合并顺序、提供者行为及调优模式"
read_when:
  - 你想通过缓存保留减少提示令牌成本
  - 你需要在多代理设置中实现每个代理的缓存行为
  - 你正在同时调整心跳和缓存 TTL 修剪
---

# 提示缓存

提示缓存意味着模型提供者可以在多轮对话中复用未改变的提示前缀（通常是系统/开发者指令及其他稳定的上下文），而不是每次都重新处理它们。首次匹配请求会写入缓存令牌（`cacheWrite`），后续匹配请求可以读取它们（`cacheRead`）。

重要性：降低令牌成本，加快响应速度，并为长时间会话提供更可预测的性能。没有缓存时，即使大部分输入未改动，重复提示每次都会支付完整提示成本。

本页涵盖所有影响提示重用和令牌成本的缓存相关设置。

关于 Anthropic 价格详情，参见：
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

## 主要设置

### `cacheRetention`（模型参数和每个代理）

在模型参数中设置缓存保留：

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

1. `agents.defaults.models["provider/model"].params`
2. `agents.list[].params`（匹配代理 id，基于键覆盖）

### 旧版 `cacheControlTtl`

旧值仍然被接受并映射：

- `5m` -> `short`
- `1h` -> `long`

新配置建议使用 `cacheRetention`。

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
- 在未设置时，使用 Anthropic API 密钥认证的配置文件，OpenClaw 会为 Anthropic 模型引用默认注入 `cacheRetention: "short"`。

### Amazon Bedrock

- Anthropic Claude 模型引用（`amazon-bedrock/*anthropic.claude*`）支持显式传递 `cacheRetention`。
- 非 Anthropic Bedrock 模型在运行时被强制设为 `cacheRetention: "none"`。

### OpenRouter Anthropic 模型

对于 `openrouter/anthropic/*` 模型引用，OpenClaw 会在系统/开发者提示块中注入 Anthropic 的 `cache_control`，以提升提示缓存复用。

### 其他提供者

若提供者不支持此缓存模式，`cacheRetention` 将无效果。

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

- 缓存跟踪事件为 JSONL 格式，包含分阶段快照，如 `session:loaded`、`prompt:before`、`stream:context` 及 `session:after`。
- 在正常使用面板中，单轮缓存令牌影响通过 `cacheRead` 和 `cacheWrite` 可见（例如 `/usage full` 和会话使用摘要）。

## 快速故障排查

- 大部分轮次出现高 `cacheWrite`：检查系统提示输入是否易变，并验证模型/提供者是否支持你的缓存设置。
- `cacheRetention` 无效：确认模型键名匹配 `agents.defaults.models["provider/model"]`。
- Bedrock Nova/Mistral 请求带缓存设置时：运行时强制设为 `none` 属预期行为。

相关文档：

- [Anthropic](/providers/anthropic)
- [令牌使用和成本](/reference/token-use)
- [会话修剪](/concepts/session-pruning)
- [网关配置参考](/gateway/configuration-reference)
