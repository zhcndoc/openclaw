---
summary: "`openclaw uninstall` 的命令行参考（移除网关服务 + 本地数据）"
read_when:
  - 您想要移除网关服务和/或本地状态
  - 您想先进行模拟执行（dry-run）
title: "卸载"
---

# `openclaw uninstall`

卸载网关服务 + 本地数据（命令行工具本身保持不变）。

```bash
openclaw backup create
openclaw uninstall
openclaw uninstall --all --yes
openclaw uninstall --dry-run
```

如果您想在移除状态或工作区之前保存一个可恢复的快照，请先运行 `openclaw backup create`。
