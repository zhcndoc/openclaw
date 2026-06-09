---
summary: "HEARTBEAT.md 的工作区模板"
title: "HEARTBEAT.md 模板"
read_when:
  - 手动引导工作区
---

# HEARTBEAT.md 模板

`HEARTBEAT.md` 位于代理工作区中。当你希望 OpenClaw 跳过 heartbeat 模型调用时，请保持该文件为空，或者只包含 Markdown 注释和标题。

默认运行时模板如下：

```markdown
# 保持此文件为空（或仅包含注释），以跳过 heartbeat API 调用。

# 当你希望代理定期检查某些内容时，请在下方添加任务。
```

只有在你希望代理定期检查某些内容时，才在注释下方添加简短任务。请保持 heartbeat 指令简短，因为它们会在周期性唤醒时被读取。

## 相关内容

- [Heartbeat 配置](/gateway/config-agents)
