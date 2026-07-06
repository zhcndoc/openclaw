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

| 范围                    | 删除内容                                                                                               | 先停止网关 |
| ----------------------- | ----------------------------------------------------------------------------------------------------- | ---------- |
| `config`                | 仅配置文件                                                                                              | 否         |
| `config+creds+sessions` | 配置文件、OAuth/凭据目录、每个代理的会话目录                                                             | 是         |
| `full`                  | 状态目录（包括嵌套其中的 config/creds，如果有的话），以及工作区目录和工作区证明                         | 是         |

`config+creds+sessions` 和 `full` 会在删除状态之前停止正在运行的受管网关服务。

## 说明

- 在移除本地状态之前，先运行 `openclaw backup create` 以创建可恢复的快照。
- 不使用 `--scope` 时，`openclaw reset` 会以交互方式提示选择要移除的作用域。
- 只有同时设置了 `--scope` 和 `--yes` 时，`--non-interactive` 才有效。
- `config+creds+sessions` 和 `full` 完成后会输出 `Next: openclaw onboard --install-daemon`。

## 相关

- [CLI 参考](/cli)
