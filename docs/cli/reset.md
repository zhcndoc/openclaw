---
summary: "CLI 参考：`openclaw reset`（重置本地状态/配置）"
read_when:
  - 你想清除本地状态，同时保留已安装的 CLI
  - 你想先进行一次将被移除内容的 dry-run
title: "重置"
---

# `openclaw reset`

重置本地配置/状态（保留 CLI 安装）。

选项：

- `--scope <scope>`：`config`、`config+creds+sessions` 或 `full`
- `--yes`：跳过确认提示
- `--non-interactive`：禁用提示；需要同时指定 `--scope` 和 `--yes`
- `--dry-run`：打印将执行的操作，但不删除文件

示例：

```bash
openclaw backup create
openclaw reset
openclaw reset --dry-run
openclaw reset --scope config --yes --non-interactive
openclaw reset --scope config+creds+sessions --yes --non-interactive
openclaw reset --scope full --yes --non-interactive
```

说明：

- 如果你希望在删除本地状态前保留一个可恢复的快照，请先运行 `openclaw backup create`。
- 如果省略 `--scope`，`openclaw reset` 会使用交互式提示来选择要删除的内容。
- 只有在同时设置了 `--scope` 和 `--yes` 时，`--non-interactive` 才有效。

## 相关

- [CLI 参考](/cli)
