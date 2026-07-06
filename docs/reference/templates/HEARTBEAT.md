---
summary: "HEARTBEAT.md 的工作区模板"
title: "HEARTBEAT.md 模板"
read_when:
  - 手动引导工作区
---

# HEARTBEAT.md 模板

`HEARTBEAT.md` 位于代理工作区中，并保存周期性的心跳检查清单。请保持其为空，或仅包含空白、Markdown 注释、ATX 标题、空列表占位符（`- `、`* [ ]`）或围栏标记，以便 OpenClaw 完全跳过心跳模型调用（`reason=empty-heartbeat-file`）。

默认随附内容：

```markdown
<!-- Heartbeat template; comments-only content prevents scheduled heartbeat API calls. -->

# 保持此文件为空（或仅包含注释），以跳过心跳 API 调用。

# 当你希望代理定期检查某些内容时，请在下方添加任务。
```

只有在你希望进行周期性检查时，才在注释行下方添加简短任务。请保持内容精简：心跳运行会在每个 tick（默认每 30 分钟）读取此文件，因此冗长的说明会在每次唤醒时消耗 token。

如果你需要按到期时间进行检查，而不是普通清单，请使用带有每个任务的 `interval` 和 `prompt` 字段的结构化 `tasks:` 块；格式和行为请参见 [HEARTBEAT.md](/gateway/heartbeat#heartbeatmd-optional)。

## 相关内容

- [心跳](/gateway/heartbeat)
- [心跳配置](/gateway/config-agents)
