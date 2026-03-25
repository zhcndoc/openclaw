---
summary: "上下文窗口 + 压缩：OpenClaw 如何保持会话在模型限制内"
read_when:
  - 你想了解自动压缩和 /compact
  - 你正在调试长会话触及上下文限制的问题
title: "压缩"
---

# 上下文窗口与压缩

每个模型都有一个**上下文窗口**（最大可见 token 数）。长时间运行的聊天会积累消息和工具结果；一旦窗口达到上限，OpenClaw 会**压缩**较早的历史记录，以保持在限制内。

## 什么是压缩

压缩**将较早的对话内容总结成简洁的摘要条目**，同时保持近期消息不变。该摘要存储于会话历史中，未来请求使用：

- 压缩摘要
- 压缩点之后的近期消息

压缩会**持续保存在会话的 JSONL 历史中**。

## 配置

在你的 `openclaw.json` 中使用 `agents.defaults.compaction` 设置来配置压缩行为（模式、目标 token 数等）。  
压缩摘要默认会保留不透明标识符（`identifierPolicy: "strict"`）。你可以用 `identifierPolicy: "off"` 来关闭，或者用 `identifierPolicy: "custom"` 并配合 `identifierInstructions` 提供自定义文本覆盖。

你也可以通过 `agents.defaults.compaction.model` 可选地指定一个不同的模型来执行压缩总结。这对于你的主模型是本地或较小模型，而你希望用更强大的模型来生成压缩摘要非常有用。覆盖项接受任何 `provider/model-id` 字符串：

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

这也适用于本地模型，例如一个专用于总结的第二 Ollama 模型或经过微调的压缩专家：

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

如果未设置，压缩将使用代理的主要模型。

## 自动压缩（默认开启）

当会话接近或超出模型上下文窗口时，OpenClaw 会触发自动压缩，并可能使用压缩后的上下文重试原始请求。

你将看到：

- 在详细模式中显示 `🧹 Auto-compaction complete`
- `/status` 显示 `🧹 Compactions: <次数>`

压缩前，OpenClaw 会执行一次**静默内存刷新**，将持久笔记存储到磁盘。详见 [内存](/concepts/memory) 的相关配置和说明。

## 手动压缩

使用 `/compact` 命令（可附带指令）强制进行一次压缩：

```
/compact 关注决策和未解决的问题
```

## 上下文窗口来源

上下文窗口大小与模型相关。OpenClaw 从配置的提供商目录中获取模型定义以确定限制。

## 压缩与修剪的区别

- **压缩**：进行总结并**持久化**保存于 JSONL。
- **会话修剪**：仅**内存中**修剪老旧的**工具结果**，按请求执行。

关于修剪详情见 [/concepts/session-pruning](/concepts/session-pruning)。

## OpenAI 服务器端压缩

OpenClaw 也支持兼容的 OpenAI 直连模型的 OpenAI 响应服务器端压缩提示。这与本地 OpenClaw 压缩分开，可并行运行。

- 本地压缩：OpenClaw 自行总结并持久化至会话 JSONL。
- 服务器端压缩：当启用 `store` + `context_management` 时，OpenAI 在提供端压缩上下文。

详细参数和覆盖请见 [OpenAI 提供商](/providers/openai)。

## 自定义上下文引擎

压缩行为由当前活动的
[上下文引擎](/concepts/context-engine) 管理。旧版引擎使用上述内置
总结功能。插件引擎（通过
`plugins.slots.contextEngine` 选择）可以实现任何压缩策略——DAG
摘要、向量检索、增量压缩等。

当插件引擎设置 `ownsCompaction: true` 时，OpenClaw 将所有
压缩决策委托给该引擎，不运行内置自动压缩。

当 `ownsCompaction` 为 `false` 或未设置时，OpenClaw 可能仍会使用 Pi 的
内置尝试内自动压缩，但活动引擎的 `compact()` 方法仍处理 `/compact` 和溢出恢复。不存在自动回退
到旧版引擎的压缩路径。

如果你正在构建一个不拥有压缩权的上下文引擎，请通过调用 `openclaw/plugin-sdk/core` 中的 `delegateCompactionToRuntime(...)` 来实现 `compact()`。

## Tips

- 当会话感觉陈旧或上下文臃肿时，使用 `/compact`。
- 大型工具输出已经被截断；修剪能进一步减少工具结果积累。
- 若需要全新开始，请使用 `/new` 或 `/reset` 开启新的会话 ID。
