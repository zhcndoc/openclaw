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

## Configuration

In your `openclaw.json`, configure compaction under `agents.defaults.compaction`. The most common options are listed below; for full reference, see [Session management deep dive](/reference/session-management-compaction).

### Using a different model

By default, compaction uses the agent’s primary model. Set `agents.defaults.compaction.model` to a different value to delegate summarization to a more powerful or specialized model. This override accepts a `provider/model-id` string, or a bare alias configured under `agents.defaults.models`:

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

A bare configuration alias is resolved to its canonical provider and model before compaction starts. If a bare value matches both an alias and a configured literal model ID, the literal model ID takes precedence. Unmatched bare values are kept as the model ID on the currently active provider.

This also applies to local models, for example a second Ollama model dedicated to summarization:

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

If unset, compaction starts with the currently active session model. If summarization fails due to a provider error suitable for fallback, OpenClaw retries that compaction using the session’s existing model fallback chain. The fallback selection is temporary and is not written back to session state. An explicit `agents.defaults.compaction.model` override remains exact and does not inherit the session fallback chain.

### Identifier retention

Compaction summaries retain opaque identifiers by default (`identifierPolicy: "strict"`). You can disable this with `identifierPolicy: "off"`, or provide custom guidance with `identifierPolicy: "custom"` and `identifierInstructions`.

### Active transcript byte guard

When `agents.defaults.compaction.maxActiveTranscriptBytes` is set, OpenClaw triggers a normal local compaction run before execution if the active JSONL reaches that size. This is useful for long-running sessions: provider-side context management may keep the model context healthy, while the local transcript continues growing. It does not split the raw JSONL bytes; it simply asks the normal compaction pipeline to create a semantic summary.

<Warning>
The byte guard requires `truncateAfterCompaction: true`. If the transcript is not rotated, the active file will not shrink, and the guard will remain inactive.
</Warning>

### Successor transcript

When `agents.defaults.compaction.truncateAfterCompaction` is enabled, OpenClaw does not rewrite the existing transcript in place. Instead, it creates a new active successor transcript based on the compaction summary, preserved state, and the unsummarized tail, then records branch/resume checkpoint metadata pointing to that compacted successor.
The successor transcript also discards exact duplicate long user turns that arrive inside the short retry window, so channel retry storms are not carried into the next active transcript after compaction.

OpenClaw no longer writes a separate `.checkpoint.*.jsonl` copy for new compactions. Existing legacy checkpoint files remain usable while still referenced, and are pruned during normal session cleanup.

### Compaction notifications

By default, compaction runs silently. Set `notifyUser` to show brief status messages when compaction starts and completes:

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

### Memory flush

Before compaction, OpenClaw can run a **silent memory flush** turn to persist notes to disk. If this maintenance turn should use a local model instead of the current conversation model, set `agents.defaults.compaction.memoryFlush.model`:

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

The memory flush model override is exact and does not inherit the active session’s fallback chain. See [Memory](/concepts/memory) for details and configuration.

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
