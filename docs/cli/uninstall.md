---
summary: "CLI 参考：`openclaw uninstall`（移除网关服务 + 本地数据）"
read_when:
  - 你想移除网关服务和/或本地状态
  - 你想先进行一次 dry-run
title: "卸载"
---

# `openclaw uninstall`

卸载网关服务和/或本地数据。CLI 本身不会被移除；请通过 npm/pnpm 单独卸载它。

## 选项

| 标志                | 默认值 | 描述                                             |
| ------------------- | ------ | ------------------------------------------------ |
| `--service`         | `false` | 移除 Gateway 服务。                             |
| `--state`            | `false` | 移除状态和配置。                                 |
| `--workspace`        | `false` | 移除工作区目录。                                 |
| `--app`              | `false` | 移除 macOS 应用。                                |
| `--all`              | `false` | `--service --state --workspace --app` 的简写。  |
| `--yes`              | `false` | 跳过确认提示。                                   |
| `--non-interactive`  | `false` | 禁用提示；需要 `--yes`。                         |
| `--dry-run`          | `false` | 打印计划中的操作，但不删除文件。                 |

如果不指定范围标志，将通过交互式多选提示选择要移除的组件
（默认预选服务、状态、工作区）。

## 示例

```bash
openclaw backup create
openclaw uninstall
openclaw uninstall --service --yes --non-interactive
openclaw uninstall --state --workspace --yes --non-interactive
openclaw uninstall --all --yes
openclaw uninstall --dry-run
```

## 说明

- 在移除状态或工作区之前，先运行 `openclaw backup create` 以创建可恢复的快照。
- `--state` 会保留已配置的工作区目录，除非同时选择了 `--workspace`。

## 相关

- [CLI 参考](/cli)
- [卸载](/install/uninstall)
