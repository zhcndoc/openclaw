---
summary: "已退役的推断后续承诺的状态与清理指南"
title: "推断承诺"
sidebarTitle: "承诺"
read_when:
  - 当你正在升级一个使用了推断承诺的配置时
  - 当你想检查或清除之前存储的后续记录时
---

推断承诺实验已退役。OpenClaw 不再提取新的
对话后续内容，也不再通过 heartbeat 传递它们，之前的
`commitments` 配置块会被 `openclaw doctor --fix` 移除。

精确提醒和计划任务仍然使用
[计划任务](/automation/cron-jobs)。持久的对话事实应存放在
[memory](/concepts/memory) 中。

## 现有记录

之前存储的承诺会保留在共享的 SQLite 状态数据库中，因此升级不会破坏运维人员可见的历史记录。使用旧版维护 CLI 来查看或忽略这些行：

```bash
openclaw commitments --all
openclaw commitments dismiss cm_abc123
```

有关维护命令参考，请参见 [`openclaw commitments`](/cli/commitments)。

## 相关内容

- [计划任务](/automation/cron-jobs)
- [内存概览](/concepts/memory)
- [心跳](/gateway/heartbeat)
