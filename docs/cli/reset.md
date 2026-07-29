---
summary: "CLI 参考：`openclaw reset`（重置本地状态/配置）"
read_when:
  - 你想清除本地状态，同时保留已安装的 CLI
  - 你想先进行一次将被移除内容的 dry-run
title: "重置"
---

# `openclaw reset`

重置本地配置/状态（保留 CLI 安装）。

```bash
openclaw reset
openclaw reset --dry-run
openclaw reset --scope config --yes --non-interactive
openclaw reset --scope config+creds+sessions --yes --non-interactive
openclaw reset --scope full --yes --non-interactive
```

## 选项

- `--scope <scope>`：`config`、`config+creds+sessions` 或 `full`
- `--yes`：跳过确认提示
- `--non-interactive`：禁用提示；需要 `--scope` 和 `--yes`
- `--dry-run`：打印操作而不删除文件

## 范围

| 范围                   | 删除内容                                                                     | 先停止网关 |
| ---------------------- | --------------------------------------------------------------------------- | ---------- |
| `config`                | 仅配置文件                                                            | 否                  |
| `config+creds+sessions` | 配置文件、OAuth/凭据目录、每个代理的会话目录           | 是                 |
| `full`                  | 状态目录（包括共享的 SQLite 数据库）以及工作区目录 | 是                 |

`config+creds+sessions` 和 `full` 会在删除状态之前停止正在运行的受管网关服务。

## 说明

- 先运行 `openclaw backup create`，以便在移除本地状态之前创建一个可恢复的快照。
- 工作区设置状态和证明记录位于共享的 SQLite 数据库中的行，因此 `full` 会随状态目录一起将它们移除；目前没有需要单独移除的证明旁路文件。
- 如果不指定 `--scope`，`openclaw reset` 会以交互方式提示选择要移除的范围。
- 仅当同时设置了 `--scope` 和 `--yes` 时，`--non-interactive` 才有效。
- 完成后，`config+creds+sessions` 和 `full` 会输出 `Next: openclaw onboard --install-daemon`。

## 相关

- [CLI 参考](/cli)
