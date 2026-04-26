---
summary: "`openclaw uninstall` 的命令行参考（移除网关服务 + 本地数据）"
read_when:
  - 你想移除网关服务和/或本地状态
  - 你想先进行一次 dry-run
title: "卸载"
---

# `openclaw uninstall`

卸载网关服务 + 本地数据（命令行工具本身保持不变）。

选项：

- `--service`: 移除网关服务
- `--state`: 移除状态和配置
- `--workspace`: 移除工作区目录
- `--app`: 移除 macOS 应用
- `--all`: 移除服务、状态、工作区和应用
- `--yes`: 跳过确认提示
- `--non-interactive`: 禁用提示；需要 `--yes`
- `--dry-run`: 打印操作而不删除文件

示例：

```bash
openclaw backup create
openclaw uninstall
openclaw uninstall --service --yes --non-interactive
openclaw uninstall --state --workspace --yes --non-interactive
openclaw uninstall --all --yes
openclaw uninstall --dry-run
```

注意：

- 如果你想在移除状态或工作区之前保留可恢复的快照，请先运行 `openclaw backup create`。
- `--all` 是一次性移除服务、状态、工作区和应用的简写。
- `--non-interactive` 需要 `--yes`。

## Related

- [CLI reference](/cli)
- [Uninstall](/install/uninstall)
