---
summary: "`openclaw reset` 的 CLI 参考（重置本地状态/配置）"
read_when:
  - 您想要清除本地状态但保留已安装的 CLI
  - 您想要查看将被删除内容的模拟运行结果
title: "reset"
---

# `openclaw reset`

重置本地配置/状态（保留已安装的 CLI）。

```bash
openclaw backup create
openclaw reset
openclaw reset --dry-run
openclaw reset --scope config+creds+sessions --yes --non-interactive
```

如果您想在删除本地状态之前创建一个可恢复的快照，先运行 `openclaw backup create`。
