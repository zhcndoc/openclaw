---
summary: "OpenClaw 如何总结长对话以保持在模型限制内"
read_when:
  - 你想了解自动压缩和 /compact
  - 你正在调试长会话触及上下文限制的问题
title: "压缩"
---

每个模型都有一个上下文窗口：它可以处理的最大 token 数。当对话接近该限制时，OpenClaw 会将较早的消息**压缩**成摘要，以便聊天可以继续。

## 工作原理

1. 旧的对话回合被总结为一个紧凑的条目。
2. 摘要保存在会话记录中。
3. 最近的消息保持完整。

当 OpenClaw 将历史拆分为压缩块时，它会将助手工具调用与其匹配的 `toolResult` 条目配对保留。如果分割点落在工具块内部，OpenClaw 会移动边界，使这对内容保持在一起，并保留当前尚未总结的尾部。

完整的对话历史仍保存在磁盘上。压缩只会改变模型在下一轮看到的内容。

## 自动压缩

自动压缩默认开启。当会话接近上下文限制时，或者模型返回上下文溢出错误时（在这种情况下 OpenClaw 会执行压缩并重试），它就会运行。

你会看到：

- `🧹 Auto-compaction complete` 出现在详细模式中。
- `/status` 显示 `🧹 Compactions: <count>`。

<Info>
在压缩之前，OpenClaw 会自动提醒代理将重要笔记保存到 [memory](/concepts/memory) 文件中。这可以防止上下文丢失。
</Info>

<AccordionGroup>
  <Accordion title="Recognized overflow signatures">
    OpenClaw detects context overflow from these provider error patterns:

    - `request_too_large`
    - `context length exceeded`
    - `input exceeds the maximum number of tokens`
    - `input token count exceeds the maximum number of input tokens`
    - `input is too long for the model`
    - `ollama error: context length exceeded`

  </Accordion>
</AccordionGroup>

## 手动压缩

在任意聊天中输入 `/compact` 可强制执行一次压缩。可添加指令来引导摘要内容：

```
/compact Focus on the API design decisions
```

当设置了 `agents.defaults.compaction.keepRecentTokens` 时，手动压缩会遵循该 Pi 截断点，并在重建的上下文中保留最近的尾部内容。如果没有显式的保留预算，手动压缩会表现为一个硬性检查点，并仅从新的摘要继续。

## 配置

在你的 `openclaw.json` 中的 `agents.defaults.compaction` 下配置压缩。下面列出了最常见的选项；完整参考请见 [Session management deep dive](/reference/session-management-compaction)。

### 使用不同的模型

默认情况下，压缩使用代理的主模型。设置 `agents.defaults.compaction.model` 可将摘要任务委托给更强大或更专用的模型。该覆盖项接受任意 `provider/model-id` 字符串：

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "model": "openrouter/anthropic/claude-sonnet-4-6"
      }
    }
  }
}
```

这同样适用于本地模型，例如专门用于摘要的第二个 Ollama 模型：

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "model": "ollama/llama3.1:8b"
      }
    }
  }
}
```

如果未设置，则压缩使用代理的主模型。

### 标识符保留

默认情况下，压缩摘要会保留不透明标识符（`identifierPolicy: "strict"`）。可通过 `identifierPolicy: "off"` 覆盖以禁用，或使用 `identifierPolicy: "custom"` 加上 `identifierInstructions` 来提供自定义指导。

### 活跃转录字节守卫

当设置了 `agents.defaults.compaction.maxActiveTranscriptBytes` 时，如果活跃的 JSONL 达到该大小，OpenClaw 会在运行前触发正常的本地压缩。这对于长时间运行的会话很有用：即使提供方侧的上下文管理能保持模型上下文健康，本地转录仍在不断增长。它不会拆分原始 JSONL 字节；它会请求正常的压缩管线生成语义摘要。

<Warning>
字节守卫要求 `truncateAfterCompaction: true`。如果没有转录轮转，活跃文件不会缩小，守卫也会保持不活动状态。
</Warning>

### 后继转录

当启用 `agents.defaults.compaction.truncateAfterCompaction` 时，OpenClaw 不会就地重写现有转录。它会根据压缩摘要、保留状态和未总结的尾部创建一个新的活跃后继转录，然后将之前的 JSONL 保留为已归档的检查点来源。
后继转录还会删除在短暂重试窗口内到达的完全重复的长用户回合，因此通道重试风暴不会在压缩后被带入下一个活跃转录。

预压缩检查点仅在其大小低于 OpenClaw 的检查点大小上限时才会保留；超大的活跃转录仍会压缩，但 OpenClaw 会跳过大型调试快照，而不是让磁盘使用量翻倍。

### 压缩通知

默认情况下，压缩会静默运行。设置 `notifyUser` 可在压缩开始和完成时显示简短状态消息：

```json5
{
  agents: {
    defaults: {
      compaction: {
        notifyUser: true,
      },
    },
  },
}
```

### 内存刷新

在压缩之前，OpenClaw 可以运行一次**静默内存刷新**轮次，将持久化笔记存储到磁盘。详情和配置请参见 [Memory](/concepts/memory)。

## 可插拔的压缩提供方

插件可以通过插件 API 上的 `registerCompactionProvider()` 注册自定义压缩提供方。当提供方被注册并配置后，OpenClaw 会将摘要任务委托给它，而不是内置的 LLM 管线。

要使用已注册的提供方，请在配置中设置其 id：

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "provider": "my-provider"
      }
    }
  }
}
```

设置 `provider` 会自动强制 `mode: "safeguard"`。提供方会接收与内置路径相同的压缩指令和标识符保留策略，并且在提供方输出后，OpenClaw 仍会保留最近回合和分割回合的后缀上下文。

<Note>
如果提供方失败或返回空结果，OpenClaw 会回退到内置的 LLM 摘要。
</Note>

## 压缩与修剪

|                  | 压缩                    | 修剪                          |
| ---------------- | ----------------------------- | -------------------------------- |
| **作用** | 总结旧对话 | 修剪旧工具结果           |
| **已保存？**       | 是（在会话记录中）   | 否（仅在内存中，每个请求） |
| **范围**        | 整个对话           | 仅工具结果                |

[Session pruning](/concepts/session-pruning) 是一种更轻量级的补充，它会裁剪工具输出而不进行总结。

## 故障排除

**压缩太频繁？** 可能是模型的上下文窗口较小，或者工具输出过大。尝试启用 [session pruning](/concepts/session-pruning)。

**压缩后上下文感觉过时？** 使用 `/compact Focus on <topic>` 来引导摘要，或者启用 [memory flush](/concepts/memory) 以便笔记得以保留。

**需要重新开始？** `/new` 开始一个新会话而不进行压缩。

有关高级配置（保留 token、标识符保留、自定义上下文引擎、OpenAI 服务端压缩），请参见 [Session management deep dive](/reference/session-management-compaction)。

## 相关内容

- [Session](/concepts/session): 会话管理和生命周期。
- [Session pruning](/concepts/session-pruning): 裁剪工具结果。
- [Context](/concepts/context): 代理回合的上下文是如何构建的。
- [Hooks](/automation/hooks): 压缩生命周期钩子（`before_compaction`, `after_compaction`）。
