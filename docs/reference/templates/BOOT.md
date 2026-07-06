---
summary: "BOOT.md 的工作区模板"
title: "BOOT.md 模板"
read_when:
  - 添加 BOOT.md 清单
---

# BOOT.md

在这里添加简短、明确的启动说明。内置的 `boot-md` 钩子会在每次网关启动时，为每个代理工作区运行一次此文件，前提是该文件存在且包含非空白内容。共享同一工作区的多个代理只会触发一次运行。

该钩子默认是禁用的。请先启用它：

```bash
openclaw hooks enable boot-md
```

如果某个清单项需要发送消息，请使用消息工具，然后回复精确的静默令牌 `NO_REPLY`（不区分大小写）。

## 相关内容

- [Agent 工作区](/concepts/agent-workspace)
- [Hooks](/automation/hooks#boot-md)
