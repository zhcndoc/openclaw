---
summary: "OpenClaw 如何总结长对话以保持在模型限制内"
read_when:
  - 你想了解自动压缩和 /compact
  - 你正在调试长会话触及上下文限制的问题
title: "压缩"
---

每个模型都有一个上下文窗口——它可以处理的最大 token 数量。
当对话接近该限制时，OpenClaw 会将较早的消息**压缩**成一个摘要，
这样聊天就可以继续进行。

## 工作原理

1. 旧的对话回合被总结为一个紧凑的条目。
2. 摘要保存在会话记录中。
3. 最近的消息保持完整。

当 OpenClaw 将会话历史分割为压缩块时，它会将助手工具调用与其匹配的 `toolResult` 条目保持配对。如果分割点落在工具块内部，OpenClaw 会移动边界以使配对保持在一起，并保留当前未总结的尾部。

完整的对话历史保留在磁盘上。压缩仅更改模型在下一轮中看到的内容。

## 自动压缩

自动压缩默认开启。当会话接近上下文限制时，或者当模型返回上下文溢出错误时（此时 OpenClaw 会压缩并重试），它会运行。典型的溢出签名包括 `request_too_large`、`context length exceeded`、`input exceeds the maximum number of tokens`、`input token count exceeds the maximum number of input tokens`、`input is too long for the model` 和 `ollama error: context length exceeded`。

<Info>
在压缩之前，OpenClaw 会自动提醒代理将重要笔记保存到 [内存](/concepts/memory) 文件中。这可以防止上下文丢失。
</Info>

在 `openclaw.json` 中使用 `agents.defaults.compaction` 设置来配置压缩行为（模式、目标令牌数等）。
压缩摘要默认保留不透明标识符（`identifierPolicy: "strict"`）。您可以使用 `identifierPolicy: "off"` 覆盖此设置，或使用 `identifierPolicy: "custom"` 和 `identifierInstructions` 提供自定义文本。

您可以选择通过 `agents.defaults.compaction.model` 为压缩摘要指定不同的模型。当您的主模型是本地或小型模型，并且您希望由更强大的模型生成压缩摘要时，这非常有用。覆盖接受任何 `provider/model-id` 字符串：

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

这也适用于本地模型，例如专门用于摘要的第二个 Ollama 模型或经过微调的压缩专家：

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

如果未设置，压缩将使用代理的主模型。

## 可插拔压缩提供程序

插件可以通过插件 API 上的 `registerCompactionProvider()` 注册自定义压缩提供程序。当注册并配置了提供程序时，OpenClaw 会将摘要委托给它，而不是使用内置的 LLM 管道。

要使用已注册的提供程序，请在配置中设置提供程序 ID：

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

设置 `provider` 会自动强制 `mode: "safeguard"`。提供程序接收与内置路径相同的压缩指令和标识符保留策略，OpenClaw 仍会在提供程序输出后保留最近回合和分割回合后缀上下文。如果提供程序失败或返回空结果，OpenClaw 将回退到内置 LLM 摘要。

## 自动压缩（默认开启）

当会话接近或超过模型的上下文窗口时，OpenClaw 会触发自动压缩，并可能使用压缩后的上下文重试原始请求。

您将看到：
- 详细模式中的 `🧹 Auto-compaction complete`
- `/status` 显示 `🧹 Compactions: <count>`

在压缩之前，OpenClaw 可以运行一个**静默内存刷新**回合，将持久笔记存储到磁盘。有关详细信息和配置，请参阅 [内存](/concepts/memory)。

## 手动压缩

在任何聊天中输入 `/compact` 以强制压缩。添加指令以指导摘要：

```
/compact Focus on the API design decisions
```

## 使用不同的模型

当启用 `agents.defaults.compaction.truncateAfterCompaction` 时，
OpenClaw 不会就地重写现有的对话记录。它会根据压缩摘要、保留的状态和
未总结的尾部创建一个新的活动后继对话记录，然后将之前的 JSONL 保留为归档的检查点
来源。

当设置了 `agents.defaults.compaction.maxActiveTranscriptBytes` 时，OpenClaw 可以在运行前
如果活动 JSONL 达到该大小，就触发正常的本地压缩。这对于长期运行的会话很有用，在这些会话中，
提供方侧的上下文管理可能会保持模型上下文健康，而本地对话记录却在持续增长。
它不会拆分原始 JSONL 字节；它只是请求正常的压缩
管道来创建语义摘要。将其与
`truncateAfterCompaction: true` 结合使用，以便将未来回合迁移到更小的后继
对话记录；如果不进行对话记录轮换，由于活动文件不会缩小，字节守卫将保持不活跃。

## 使用不同的模型

默认情况下，压缩使用代理的主模型。您可以使用更强
大的模型来获得更好的摘要：

```json5
{
  agents: {
    defaults: {
      compaction: {
        model: "openrouter/anthropic/claude-sonnet-4-6",
      },
    },
  },
}
```

## 压缩通知

默认情况下，压缩会静默运行。要在压缩开始和完成时显示简短通知，请启用 `notifyUser`：

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

启用后，用户会在每次压缩运行前后看到简短状态消息（例如，“正在压缩上下文...” 和 “压缩完成”）。

## 压缩与修剪

|                  | 压缩                    | 修剪                          |
| ---------------- | ----------------------------- | -------------------------------- |
| **作用** | 总结旧对话 | 修剪旧工具结果           |
| **已保存？**       | 是（在会话记录中）   | 否（仅在内存中，每个请求） |
| **范围**        | 整个对话           | 仅工具结果                |

[会话修剪](/concepts/session-pruning) 是一个更轻量级的补充，它修剪工具输出而不进行总结。

## 故障排除

**压缩太频繁？** 模型的上下文窗口可能较小，或者工具输出可能较大。尝试启用 [会话修剪](/concepts/session-pruning)。

**压缩后上下文感觉过时？** 使用 `/compact Focus on <topic>` 来指导摘要，或者启用 [内存刷新](/concepts/memory) 以便笔记保留。

**需要重新开始？** `/new` 开始一个新会话而不进行压缩。

对于高级配置（保留令牌、标识符保留、自定义上下文引擎、OpenAI 服务器端压缩），请参阅 [会话管理深入探讨](/reference/session-management-compaction)。

## 相关内容

- [会话](/concepts/session) — 会话管理和生命周期
- [会话修剪](/concepts/session-pruning) — 修剪工具结果
- [上下文](/concepts/context) — 如何为代理回合构建上下文
- [钩子](/automation/hooks) — 压缩生命周期钩子 (before_compaction, after_compaction)
