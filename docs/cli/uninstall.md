---
summary: "CLI 参考：`openclaw uninstall`（移除网关服务 + 本地数据）"
read_when:
  - "您想要删除网关服务 and/or 本地状态"
  - "你想先进行一次 dry-run"
title: "卸载CLI"
---

# `openclaw uninstall`

卸载网关服务and/or本地数据。没有单独的 CLI- 删除范围。通过 [ 安装特定步骤 ](/install/uninstall#remove-the-cli) 删除任何剩余的 CLI。

## <a id="options"></a> 选项

| 标志                | 默认值 | 描述                                          |
| ------------------- | ------- | ---------------------------------------------------- |
| `--service`         | `false` | 移除 Gateway 服务。                          |
| `--state`           | `false` | 移除状态和配置。                             |
| `--workspace`       | `false` | 移除工作区目录。                        |
| `--app`             | `false` | 移除 macOS 应用。                                |
| `--all`             | `false` | `--service --state --workspace --app` 的简写。 |
| `--yes`             | `false` | 跳过确认提示。                           |
| `--non-interactive` | `false` | 禁用提示；需要 `--yes`。                   |
| `--dry-run`         | `false` | 打印计划中的操作，但不删除文件。        |

如果没有范围标志，交互式多选会提示要删除的组件（默认仅适用于网关服务）。如果您想要恢复状态，请先使用 [`openclaw backup`](/cli/backup) 进行存档。

## <a id="examples"></a> 示例

```bash
openclaw backup create
openclaw uninstall
openclaw uninstall --service --yes --non-interactive
openclaw uninstall --state --workspace --yes --non-interactive
openclaw uninstall --all --yes
openclaw uninstall --dry-run
```

## <a id="notes"></a> 说明

如果任何请求的清理失败或被阻止，卸载会报告每个请求的范围并以非零值退出。失败的网关服务检查、停止或卸载会阻止状态和工作区突变，但仍会尝试独立的 macOS 应用程序清理。服务拆卸安全后，其他允许的范围将继续，因此可以一起报告故障。在非 macOS 系统上，`--app` 报告范围不适用。

- 在移除状态或工作区之前，先运行 `openclaw backup create` 以创建可恢复的快照。
- 在删除状态之前，`--state` 需要独占状态所有权。如果非托管或外部监督的网关仍在运行，卸载会拒绝并要求您先停止它。
- `--state` 会保留已配置的工作区目录，除非同时选择了 `--workspace`。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [卸载](/install/uninstall)
