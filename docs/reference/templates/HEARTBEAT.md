---
summary: "已弃用的 HEARTBEAT.md 工作区文件迁移指南"
title: "已弃用的 HEARTBEAT.md 工作区文件"
read_when:
  - "迁移仍包含 HEARTBEAT.md 的较旧工作区"
---

# <a id="heartbeat.md-is-retired"></a><a id="heartbeat-md-is-retired"></a> HEARTBEAT.md 已弃用

OpenClaw 不再在新工作区中创建 `HEARTBEAT.md` 或在运行时读取它。心跳指令现在位于共享状态数据库中系统拥有的监视器暂存中。

使用 `openclaw automations list --all` 中的监视器作业 ID 管理当前监视器暂存：

```bash
openclaw automations scratch <jobId>
openclaw automations scratch <jobId> --set "..."
openclaw automations scratch <jobId> --file notes.md
openclaw automations scratch <jobId> --unset
```

如果较旧的工作区仍然包含 `HEARTBEAT.md`，请运行 `openclaw doctor --fix`。doctor 会将其说明导入监视器 scratch，把有效的旧版 `tasks:` 条目转换为 cron 作业，将原文件归档到状态目录下，并移除工作区文件。

## <a id="related"></a> 相关内容

- [心跳](/gateway/heartbeat)
- [Cron CLI](/cli/cron)
- [医生](/cli/doctor)
- [Heartbeat 配置](/gateway/config-agents)
