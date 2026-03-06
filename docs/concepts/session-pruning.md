---
title: "会话修剪"
summary: "会话修剪：工具结果修剪以减少上下文膨胀"
read_when:
  - 你想减少大语言模型（LLM）上下文中因工具输出增长的问题
  - 你正在调整 agents.defaults.contextPruning
---

# 会话修剪

会话修剪会在每次调用大语言模型（LLM）之前，从内存中的上下文中修剪**旧的工具结果**。它**不会**重写磁盘上的会话历史文件（`*.jsonl`）。

## 运行时机

- 当启用 `mode: "cache-ttl"` 且该会话最后一次 Anthropic 调用时间距离现在超过 `ttl` 时。
- 仅影响该请求发送到模型的消息。
- 仅对 Anthropic API 调用（以及 OpenRouter Anthropic 模型）生效。
- 为获得最佳效果，请将 `ttl` 设置为与模型的 `cacheRetention` 策略匹配（`short` = 5分钟，`long` = 1小时）。
- 修剪后，TTL 窗口会重置，因此后续请求会一直使用缓存，直到 TTL 再次过期。

## 智能默认（Anthropic）

- **OAuth 或 setup-token** 配置文件：启用 `cache-ttl` 修剪，心跳间隔设置为 `1小时`。
- **API key** 配置文件：启用 `cache-ttl` 修剪，心跳间隔设为 `30分钟`，Anthropic 模型默认 `cacheRetention` 为 `"short"`。
- 如果你显式设置了这些值，OpenClaw 不会覆盖它们。

## 改善点（成本 + 缓存行为）

- **为何修剪：** Anthropic 的提示缓存仅在 TTL 期内有效。如果一个会话闲置超出 TTL，下一次请求会重新缓存整个提示，除非先进行修剪。
- **节省成本：** 修剪减少了 TTL 过期后第一个请求的**缓存写入**大小。
- **TTL 重置重要性：** 一旦修剪执行，缓存窗口重置，后续请求可以重用新缓存的提示，而无需再次缓存完整历史。
- **修剪不会做的事：** 不会增加任何 tokens 或“重复”计费；只改变 TTL 过期后第一次请求时缓存的内容。

## 可被修剪内容

- 仅限 `toolResult` 消息。
- 用户和助手消息**绝不会**被修改。
- 最近的 `keepLastAssistants` 条助手消息受到保护；该截止点之后的工具结果不会被修剪。
- 若助手消息数量不足以确定截止点，则跳过修剪。
- 包含**图片块**的工具结果不会被修剪。

## 上下文窗口估算

修剪使用估算的上下文窗口（字符数 ≈ tokens × 4）。基础窗口按以下顺序确定：

1. `models.providers.*.models[].contextWindow` 覆盖值。
2. 模型定义中 `contextWindow`（来自模型注册表）。
3. 默认 `200000` tokens。

如果设置了 `agents.defaults.contextTokens`，则视为对解析窗口的上限（最小值）。

## 模式

### cache-ttl

- 仅当最后的 Anthropic 调用时间超过 `ttl`（默认 `5分钟`）时才运行修剪。
- 运行时行为：与以前相同的软修剪 + 硬清理。

## 软修剪 vs 硬清理

- **软修剪**：针对超大工具结果。
  - 保留头尾内容，中间插入 `...`，并附加原始大小说明。
  - 跳过包含图片块的结果。
- **硬清理**：用 `hardClear.placeholder` 替换整个工具结果。

## 工具选择

- `tools.allow` / `tools.deny` 支持 `*` 通配符。
- 拒绝规则优先。
- 匹配时不区分大小写。
- 允许列表为空 => 允许所有工具。

## 与其他限制的交互

- 内置工具已会截断自身输出；会话修剪是额外一层，用于防止长期会话中工具输出在模型上下文中过多累积。
- 压缩是独立操作：压缩会摘要并持久化，修剪仅针对每次请求的临时处理。详见 [/concepts/compaction](/concepts/compaction) 。

## 默认值（启用时）

- `ttl`: `"5m"`
- `keepLastAssistants`: `3`
- `softTrimRatio`: `0.3`
- `hardClearRatio`: `0.5`
- `minPrunableToolChars`: `50000`
- `softTrim`: `{ maxChars: 4000, headChars: 1500, tailChars: 1500 }`
- `hardClear`: `{ enabled: true, placeholder: "[旧工具结果内容已清除]" }`

## 示例

默认（关闭）：

```json5
{
  agents: { defaults: { contextPruning: { mode: "off" } } },
}
```

启用基于 TTL 的修剪：

```json5
{
  agents: { defaults: { contextPruning: { mode: "cache-ttl", ttl: "5m" } } },
}
```

限制修剪特定工具：

```json5
{
  agents: {
    defaults: {
      contextPruning: {
        mode: "cache-ttl",
        tools: { allow: ["exec", "read"], deny: ["*image*"] },
      },
    },
  },
}
```

查看配置参考：[Gateway 配置](/gateway/configuration)
