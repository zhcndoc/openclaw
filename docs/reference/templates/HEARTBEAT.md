---
summary: "已弃用的 HEARTBEAT.md 工作区文件迁移指南"
title: "已弃用的 HEARTBEAT.md 工作区文件"
read_when:
  - 迁移仍包含 HEARTBEAT.md 的较旧工作区
---

# HEARTBEAT.md 已弃用

OpenClaw 不再在新的工作区中创建 `HEARTBEAT.md`，也不会在运行时读取它。现在的心跳说明存放在共享状态数据库中、由系统管理的监视器 cron scratch 里。

使用 `openclaw cron list --all` 中的监视器作业 ID 来管理当前 scratch：

```bash
openclaw cron scratch <jobId>
openclaw cron scratch <jobId> --set "..."
openclaw cron scratch <jobId> --file notes.md
openclaw cron scratch <jobId> --unset
```

如果较旧的工作区仍然包含 `HEARTBEAT.md`，请运行 `openclaw doctor --fix`。doctor 会将其说明导入监视器 scratch，把有效的旧版 `tasks:` 条目转换为 cron 作业，将原文件归档到状态目录下，并移除工作区文件。

## 相关内容

- [Heartbeat](/gateway/heartbeat)
- [Cron CLI](/cli/cron)
- [Doctor](/cli/doctor)
- [Heartbeat 配置](/gateway/config-agents)
