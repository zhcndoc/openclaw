---
summary: "CLI 参考：`openclaw completion`（生成/安装 shell 补全脚本）"
read_when:
  - 你希望为 zsh/bash/fish/PowerShell 提供 shell 补全
  - 你需要将补全脚本缓存到 OpenClaw 状态目录下
title: "补全"
---

# `openclaw completion`

生成 shell 补全脚本，将它们缓存到 OpenClaw 状态目录下，并可选地将其安装到你的 shell 配置文件中。

## 用法

```bash
openclaw completion                          # 将 zsh 脚本输出到 stdout
openclaw completion --shell fish             # 输出 fish 脚本
openclaw completion --write-state            # 为所有 shell 缓存脚本
openclaw completion --write-state --install  # 先缓存，然后一步完成安装
openclaw completion --shell bash --write-state
```

## 选项

- `-s, --shell <shell>`: shell 目标（`zsh`、`bash`、`powershell`、`fish`；默认：`zsh`）
- `-i, --install`: 通过向你的 shell 配置文件添加一行用于缓存脚本的 source 语句来安装补全
- `--write-state`: 将补全脚本写入 `$OPENCLAW_STATE_DIR/completions`（默认 `~/.openclaw/completions`），而不输出到 stdout；配合 `--shell` 时只写入该 shell，否则写入全部四种
- `-y, --yes`: 跳过安装确认提示（非交互式）

## 安装流程

`--install` 会将你的配置文件指向缓存脚本，因此缓存必须先存在：如果缓存缺失，命令会失败，并提示你运行 `openclaw completion --write-state`。将 `--write-state --install` 组合使用，可以一步完成这两件事。若不指定 `--shell`，`--install` 会从 `$SHELL` 检测当前 shell（若检测失败则回退到 zsh）。

安装会在你的 shell 配置文件中写入一个小的 `# OpenClaw Completion` 块，并将任何较旧、较慢的 `source <(openclaw completion ...)` 行替换为缓存的 source 行：

| Shell      | 配置文件                                                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| bash       | `~/.bashrc`（当 `~/.bashrc` 缺失时，回退到 `~/.bash_profile`）                                                                                                                               |
| fish       | `~/.config/fish/config.fish`                                                                                                                                                               |
| powershell | `~/.config/powershell/Microsoft.PowerShell_profile.ps1`（在 Windows 上：`Documents/PowerShell/Microsoft.PowerShell_profile.ps1`，或 `Documents/WindowsPowerShell/...` 用于 Windows PowerShell） |
| zsh        | `~/.zshrc`                                                                                                                                                                                 |

## 说明

- 如果没有 `--install` 或 `--write-state`，该命令会将脚本打印到 stdout。
- 补全生成会预先加载完整的命令树，包括插件 CLI 命令，因此会包含嵌套子命令。
- `openclaw update` 会在成功更新后自动刷新补全缓存；`openclaw doctor` 可以修复缺失或过期的补全配置。

## 相关

- [CLI 参考](/cli)
