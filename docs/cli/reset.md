---
summary: "`openclaw reset` 的 CLI 参考（重置本地状态/配置）"
read_when:
  - 你想在保留 CLI 已安装的情况下清除本地状态
  - 你想预览将要删除的内容
title: "重置"
---

# `openclaw reset`

重置本地配置/状态（保留已安装的 CLI）。

选项：

- `--scope <scope>`：`config`、`config+creds+sessions` 或 `full`
- `--yes`：跳过确认提示
- `--non-interactive`：禁用提示；需要 `--scope` 和 `--yes`
- `--dry-run`：打印操作但不删除文件

示例：

```bash
openclaw backup create
openclaw reset
openclaw reset --dry-run
openclaw reset --scope config --yes --non-interactive
openclaw reset --scope config+creds+sessions --yes --non-interactive
openclaw reset --scope full --yes --non-interactive
```

注意：

- 如果你想在删除本地状态前保留可恢复的快照，请先运行 `openclaw backup create`。
- 如果你省略 `--scope`，`openclaw reset` 会使用交互式提示来选择要删除的内容。
- 仅当同时设置了 `--scope` 和 `--yes` 时，`--non-interactive` 才有效。

## 相关

- [CLI 参考](/cli)
