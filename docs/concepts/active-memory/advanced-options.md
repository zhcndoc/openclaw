---
summary: "用于思考、快速模式和子代理提示的逃生舱口，以及导出阻塞子代理转录本以进行调试。"
read_when:
  - "您需要覆盖子代理提示或思考级别"
  - "您想要阻止磁盘上的子代理记录"
title: "高级覆盖和成绩单"
---

## <a id="advanced-escape-hatches"></a> 高级逃生通道

不属于推荐的配置。

`config.thinking` 会覆盖子代理的思考级别（默认值为 `"off"`， 因为主动记忆运行在回复路径中，额外的思考时间会直接增加用户可感知的延迟）：

```json5
thinking: "medium" // default: "off"
```

`config.fastMode` 只会覆盖阻塞式记忆子代理的快速模式。 可使用 `true`、`false` 或 `"auto"`；保持未设置以继承正常代理、会话和模型默认值。`"auto"` 使用召回模型配置的 `fastAutoOnSeconds` 截止值：

```json5
fastMode: true
```

`config.promptAppend` 会在默认提示之后、对话上下文之前添加操作员指令—— 当非核心记忆插件需要特定的工具顺序或查询形状时，可将其与自定义的 `toolsAllow` 配对使用：

```json5
promptAppend: "Prefer stable long-term preferences over one-off events."
```

`config.promptOverride` 会完全替换默认提示（之后仍会附加对话上下文）。除非你有意测试不同的召回契约，否则不建议这样做——默认提示经过调优，旨在返回 `NONE` 或供主模型使用的简洁用户事实上下文：

```json5
promptOverride: "You are a memory search agent. Return NONE or one compact user fact."
```

## <a id="transcript-persistence"></a> 转录持久化

阻塞式子代理运行会将其运行时转录保存在代理的 SQLite 存储中。默认情况下，OpenClaw 会在运行结束后删除临时的子代理会话行，并且不会创建 JSONL 文件。

隐身对话的召回助手保留在同一个私人会话存储中，并在运行后被删除。即使启用了 `persistTranscripts`，它们也从不导出转录工件。

如果清理超过了召回期限，则清理结束后，基于内存结果的完整摘要仍可恢复为 `timeout_partial`。这适用于临时成绩单； `persistTranscripts` 仅控制调试导出。失败的运行、失败的清理和不可用的内存结果仍然没有资格进行超时恢复。恢复的摘要不会缓存或存储在会话调试行中。

要将这些转录导出为用于调试的 JSONL 产物：

```json5
{
  plugins: {
    entries: {
      "active-memory": {
        enabled: true,
        config: {
          agents: ["main"],
          persistTranscripts: true,
          transcriptDir: "active-memory",
        },
      },
    },
  },
}
```

导出的转录工件位于 OpenClaw 状态目录下，位于插件拥有的、与活动运行时状态分开的每个代理目录中：

```text
<state-dir>/plugins/active-memory/transcripts/agents/<encoded-agent>/active-memory/<blocking-memory-sub-agent-session-id>.jsonl
```

代理 ID 在此路径中编码为 URI-：例如，`support/agent` 变为 `support%2Fagent`。将最终工件子目录更改为 `config.transcriptDir`。请小心使用：导出可以在繁忙的会话中快速累积，`full` 查询模式会复制大量对话上下文，并且这些工件包含隐藏的提示上下文和回忆。
