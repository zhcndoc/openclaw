---
summary: "OpenClaw 如何压缩长对话以保持在模型限制内"
read_when:
  - 你想了解自动压缩和 /compact
  - 你正在排查因上下文限制而变长的会话
title: "压缩"
---

每个模型都有一个上下文窗口：它能处理的最大 token 数量。当对话接近该限制时，OpenClaw 会将较早的消息**压缩**成摘要，以便聊天可以继续。

## 工作原理

1. 较早的对话轮次会被总结为一个压缩条目。
2. 该摘要会保存在会话转录中。
3. 最近的消息会保持完整。

OpenClaw 在选择压缩分割点时，会将助手的工具调用与其对应的 `toolResult` 条目配对保留。如果分割点落在工具块内部，OpenClaw 会移动边界，确保这对内容保持在一起，并保留当前尚未总结的尾部。

完整的对话历史仍保存在磁盘上。压缩只会改变模型在下一轮看到的内容。

<Note>
新配置会将 `agents.defaults.compaction.mode` 默认设为 `"safeguard"`（更严格的保护措施、摘要质量审计）。如需退出，请显式设置 `mode: "default"`。
</Note>

## 自动压缩

默认开启自动压缩。当会话接近上下文限制时，或者模型返回上下文溢出错误时（在这种情况下 OpenClaw 会先压缩再重试），它就会运行。

你会看到：

- `embedded run auto-compaction start` / `complete` 在普通 Gateway 日志中。
- `🧹 Auto-compaction complete` 在详细模式中。
- `/status` 显示 `🧹 Compactions: <count>`。

<Info>
在压缩之前，OpenClaw 会自动提醒代理将重要笔记保存到 [memory](/concepts/memory) 文件中。这可以防止上下文丢失。
</Info>

<AccordionGroup>
  <Accordion title="OpenClaw 识别的溢出错误模式">
    OpenClaw 会匹配数十种特定于不同提供商的溢出错误字符串（Anthropic、OpenAI、Bedrock、Gemini、Ollama、OpenRouter 等）。常见示例：

    - `request_too_large`
    - `context length exceeded`
    - `input exceeds the maximum number of tokens`
    - `input token count exceeds the maximum number of input tokens` (Bedrock)
    - `input is too long for the model`
    - `ollama error: context length exceeded`

  </Accordion>
</AccordionGroup>

## 手动压缩

在任何聊天中输入 `/compact` 可强制执行一次压缩。你也可以附加指令来指导摘要内容：

```text
/compact 重点关注 API 设计决策
```

当设置了 `agents.defaults.compaction.keepRecentTokens`（默认值：20,000）时，手动压缩会遵守该截断点，并在重建的上下文中保留最近的尾部内容。如果没有显式的保留预算，手动压缩将作为一个硬性检查点，并仅从新的摘要继续。

## 配置

在你的 `openclaw.json` 中，在 `agents.defaults.compaction` 下配置压缩。最常见的选项如下所列；完整参考请见 [会话管理深入解析](/reference/session-management-compaction)。

### 使用不同的模型

默认情况下，压缩使用代理的主模型。将 `agents.defaults.compaction.model` 设置为不同的值，可将总结任务委托给更强大或更专门的模型。此覆盖项接受 `provider/model-id` 字符串，或在 `agents.defaults.models` 下配置的裸别名：

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

在压缩开始之前，裸配置别名会被解析为其规范的提供方和模型。如果一个裸值同时匹配别名和已配置的字面模型 ID，则以字面模型 ID 为准。不匹配的裸值会保留为当前活跃提供方上的模型 ID。

这同样适用于本地模型，例如专用于总结的第二个 Ollama 模型：

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

如果未设置，压缩将从当前活跃的会话模型开始。如果由于适合回退的提供方错误导致总结失败，OpenClaw 会使用该会话现有的模型回退链重试该压缩。回退选择是临时的，不会写回会话状态。显式的 `agents.defaults.compaction.model` 覆盖项保持精确，不会继承会话回退链。

### 标识符保留

压缩摘要默认保留不透明标识符（`identifierPolicy: "strict"`）。你可以通过 `identifierPolicy: "off"` 禁用此行为，或通过 `identifierPolicy: "custom"` 和 `identifierInstructions` 提供自定义指导。

### 活跃转录字节守卫

当设置了 `agents.defaults.compaction.maxActiveTranscriptBytes` 时，OpenClaw 会在运行前于转录历史达到该大小时触发正常的本地压缩。这对于长时间运行的会话很有用，因为提供方侧的上下文管理可以保持模型上下文健康，而持久化的转录历史却持续增长。它不会按原始字节切分；它会请求正常的压缩流水线创建语义摘要。

<Warning>
字节守卫适用于活跃的 SQLite 转录历史。旧版 JSONL 检查点工件不是当前活跃的压缩目标。
</Warning>

### 后继转录

当启用 `agents.defaults.compaction.truncateAfterCompaction` 时，OpenClaw 不会就地重写现有转录。相反，它会基于压缩摘要、保留状态以及未摘要的尾部创建一个新的活跃后继转录，然后记录指向该压缩后继的分支/恢复检查点元数据。
后继转录还会丢弃在短重试窗口内到达的完全重复的长用户轮次，因此通道重试风暴不会在压缩后被带入下一个活跃转录。

OpenClaw 不再为新的压缩写入单独的 `.checkpoint.*.jsonl` 副本。现有的旧版检查点文件在仍被引用时仍可使用，并会在正常的会话清理过程中被清除。

### 压缩通知

默认情况下，压缩会静默运行。将 `notifyUser` 设置为在压缩开始和完成时显示简短状态消息，并在预压缩内存刷新耗尽但回复仍继续时显示降级通知：

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

在压缩之前，OpenClaw 可以运行一个**静默内存刷新**轮次，将笔记持久化到磁盘。如果这个维护轮次应使用本地模型而不是当前对话模型，请设置 `agents.defaults.compaction.memoryFlush.model`：

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "memoryFlush": {
          "model": "ollama/qwen3:8b"
        }
      }
    }
  }
}
```

内存刷新模型覆盖是精确的，不会继承活跃会话的回退链。详情和配置请参见 [内存](/concepts/memory)。

## 可插拔的压缩提供方

插件可以通过插件 API 上的 `registerCompactionProvider()` 注册自定义压缩提供方。注册并配置后，OpenClaw 会将摘要生成委托给该提供方，而不是内置的 LLM 流水线。

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

设置 `provider` 会自动强制 `mode: "safeguard"`。提供方会接收与内置路径相同的压缩指令和标识符保留策略，而 OpenClaw 在提供方输出后仍会保留最近轮次和拆分轮次后缀上下文。

<Note>
如果提供方失败或返回空结果，OpenClaw 会回退到内置的 LLM 摘要生成。
</Note>

## 压缩与修剪

|                  | 压缩                          | 修剪                             |
| ---------------- | ----------------------------- | -------------------------------- |
| **它做什么**    | 总结较早的对话                | 截断旧的工具结果                |
| **已保存？**    | 是（在会话转录中）            | 否（仅内存中，每次请求）        |
| **范围**        | 整个对话                      | 仅工具结果                      |

[会话修剪](/concepts/session-pruning) 是一个更轻量的补充，它会截断工具输出而不进行摘要。

## 故障排除

**压缩过于频繁？** 模型的上下文窗口可能较小，或者工具输出可能较大。尝试启用 [会话修剪](/concepts/session-pruning)。

**压缩后上下文感觉陈旧？** 使用 `/compact Focus on <topic>` 来引导摘要，或者启用 [内存刷新](/concepts/memory) 以便笔记得以保留。

**需要一个全新开始？** `/new` 会在不压缩的情况下开启一个新会话。

有关高级配置（保留 token、标识符保留、自定义上下文引擎、OpenAI 服务器端压缩），请参见 [Session management deep dive](/reference/session-management-compaction)。

## 相关内容

- [Session](/concepts/session)：会话管理和生命周期。
- [Session pruning](/concepts/session-pruning)：截断工具结果。
- [Context](/concepts/context)：代理轮次的上下文如何构建。
- [Hooks](/automation/hooks)：压缩生命周期钩子（`before_compaction`、`after_compaction`）。
