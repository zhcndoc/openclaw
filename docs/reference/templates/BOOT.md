---
summary: "BOOT.md 的工作区模板"
title: "BOOT.md 模板"
read_when:
  - "添加 BOOT.md 清单"
---

# BOOT.md

在这里添加简短、明确的启动说明。内置的 `boot-md` 钩子会在每次网关启动时，为每个代理工作区运行一次此文件，前提是该文件存在且包含非空白内容。共享同一工作区的多个代理只会触发一次运行。

该钩子默认是禁用的。请先启用它：

```bash
openclaw hooks enable boot-md
```

该钩子会关闭正常的最终响应传递。如果清单项目发送消息，请使用消息工具。在每个调用中命名一个通道和一个目标。然后准确地回复 `NO_REPLY` 作为整个最终答案，无需标点符号或格式。

## <a id="related"></a> 相关内容

- [Agent 工作区](/concepts/agent-workspace)
- [H挂钩](/automation/hooks/bundled-hooks#boot-md)
