---
summary: "修剪旧工具结果以保持上下文精简并提高缓存效率"
title: "会话修剪"
read_when:
  - 你希望减少工具输出导致的上下文增长
  - 你想了解 Anthropic 提示缓存优化
---

会话修剪会在每次 LLM 调用前，从上下文中修剪掉**旧的工具结果**。它可以减少因累积的工具输出（执行结果、文件读取、搜索结果）而导致的上下文膨胀，而不会重写正常的对话文本。

<Info>
修剪仅在内存中进行——它不会修改磁盘上的会话记录。你的完整历史始终会被保留。
</Info>

## 为什么它很重要

长时间会话会累积工具输出，从而膨胀上下文窗口。这会增加成本，并可能比必要时更早地强制进行[压缩](/concepts/compaction)。

修剪对于 **Anthropic 提示缓存** 尤其有价值。缓存 TTL 过期后，下一次请求会重新缓存完整提示。修剪会减少缓存写入大小，从而直接降低成本。

## 工作原理

Pruning 在 `cache-ttl` 模式下运行，同时受时间检查和上下文大小检查的约束：

1. 等待缓存 TTL 过期（手动设置时默认为 5 分钟；有关 Anthropic 的自动默认值，请参阅[智能默认值](#smart-defaults)）。在 TTL 结束前，将完全跳过清理，以保留相邻轮次的提示缓存复用。
2. TTL 结束后，根据模型的上下文窗口估算总上下文大小。使用率低于约 30% 时，将跳过清理，并让 TTL 时钟继续运行。
3. **软裁剪**过大的工具结果：超过 4,000 个字符的结果将保留开头和结尾各 1,500 个字符，并在中间添加 `...`。
4. 如果上下文使用率仍处于约 50% 或更高，且至少还剩 50,000 个字符的可清理工具内容，则对这些结果执行**硬清除**：将其内容替换为占位符（默认为 `[Old tool result content cleared]`，可通过 `agents.defaults.contextPruning.hardClear.placeholder` 配置；设置 `hardClear.enabled: false` 可跳过此步骤）。
5. 仅当清理实际改变了上下文时，才会重置 TTL 时钟，以便后续请求复用新鲜缓存。

无论阈值如何，都适用两条安全规则：最近三轮 assistant 消息永远不会被清理，并且会话第一条用户消息之前的任何内容都不会被清理（用于保护 `SOUL.md`／`USER.md` 等引导读取）。上述大小阈值和裁剪窗口属于内置行为，而不是配置项；可配置的部分是 `agents.defaults.contextPruning`（`mode`、`ttl`、`tools`、`hardClear`）。

只有 `toolResult` 消息符合条件；普通对话文本不会被处理。使用 `agents.defaults.contextPruning.tools.{allow,deny}` 来限定哪些工具名称可被清理。

## 旧版图像清理

OpenClaw 还会为那些在历史记录中保留原始图像块或提示水合媒体标记的会话，单独构建一个幂等的回放视图。

- 它会逐字节保留最近的 **3 个已完成回合**，以便最近后续请求的提示缓存前缀保持稳定。这个计数包括所有已完成回合，不仅仅是包含图像的回合，因此纯文本回合也会占用这个窗口。
- 在回放视图中，来自 `user` 或 `toolResult` 历史记录中较早、已经处理过的图像块会被替换为 `[image data removed - already processed by model]`。
- 较早的文本媒体引用，例如 `[media attached: ...]`、`[Image: source: ...]` 和 `media://inbound/...`，会被替换为 `[media reference removed - already processed by model]`。当前回合的附件标记会保持不变，因此视觉模型仍然可以水合新的图像。
- 原始会话转录不会被重写，因此历史查看器仍然可以渲染原始消息条目及其图像。
- 这与上面的常规缓存 TTL 清理是分开的。它的存在是为了防止重复的图像载荷或过时的媒体引用在后续回合中破坏提示缓存。

## 智能默认值

捆绑的 Anthropic 插件在首次解析 Anthropic（或 Claude CLI）认证配置文件时，会自动配置剪枝和心跳频率，但仅针对你尚未明确设置的字段：

| 认证模式                                | `contextPruning.mode` | `contextPruning.ttl` | `heartbeat.every` |
| ---------------------------------------- | --------------------- | -------------------- | ----------------- |
| OAuth/令牌（包括 Claude CLI 复用）       | `cache-ttl`           | `1h`                 | `1h`              |
| API 密钥                                 | `cache-ttl`           | `1h`                 | `30m`             |

如果你自己设置了 `agents.defaults.contextPruning.mode` 或 `agents.defaults.heartbeat.every`，OpenClaw 不会覆盖它们。这个自动默认值仅对 Anthropic 系列认证生效；其他提供商默认使用 `off` 剪枝，除非你进行配置。

## 启用或禁用

对于非 Anthropic 提供商，修剪默认关闭。要启用：

```json5
{
  agents: {
    defaults: {
      contextPruning: { mode: "cache-ttl", ttl: "5m" },
    },
  },
}
```

要禁用：设置 `mode: "off"`。

## 修剪 vs 压缩

|            | 修剪               | 压缩                 |
| ---------- | ------------------ | -------------------- |
| **是什么** | 修剪工具结果       | 总结对话             |
| **保存？** | 否（按请求）       | 是（写入转录记录）   |
| **范围**   | 仅工具结果         | 整个对话             |

它们相辅相成——修剪在每次压缩周期之间保持工具输出精简。

## 延伸阅读

- [压缩](/concepts/compaction)：基于摘要的上下文减少
- [网关配置](/gateway/configuration)：所有修剪配置选项（`contextPruning.*`）。

## 相关内容

- [会话管理](/concepts/session)
- [会话工具](/concepts/session-tool)
- [上下文引擎](/concepts/context-engine)
