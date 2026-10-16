---
summary: "CLI `openclaw completion` 参考（generate/install shell 完成脚本）"
read_when:
  - "你希望为 zsh/bash/fish/PowerShell 提供 shell 补全"
  - "你需要将补全脚本缓存到 OpenClaw 状态目录下"
title: "补全"
---

# `openclaw completion`

生成 shell 补全脚本，将它们缓存到 OpenClaw 状态目录下，并可选地将其安装到你的 shell 配置文件中。

## <a id="usage"></a> 用法

```bash
openclaw completion                          # print the detected shell's script
openclaw completion --shell fish             # print fish script
openclaw completion --write-state            # cache scripts for all shells
openclaw completion --write-state --install  # cache, then install in one step
openclaw completion --shell bash --write-state
```

## <a id="options"></a> 选项

- `-s, --shell <shell>`：shell 目标，`zsh`、`bash`、`powershell` 或 `fish` 之一。从`$SHELL`检测到，否则在Windows上检测到PowerShell，在其他地方检测到zsh。
- `-i, --install`: 通过向你的 shell 配置文件添加一行用于缓存脚本的 source 语句来安装补全
- `--write-state`：将完成脚本写入 `$OPENCLAW_STATE_DIR/completions`（默认 `~/.openclaw/completions`），而不打印到标准输出。对于 `--shell`，它只编写该 shell，否则所有四个 shell。
- `-y, --yes`: 跳过安装确认提示（非交互式）

## <a id="install-flow"></a> 安装流程

`--install` 将您的配置文件指向缓存的脚本，因此缓存必须首先存在。如果缓存丢失，该命令将失败并告诉您运行 `openclaw completion --write-state`。结合 `--write-state --install` 一步完成这两项操作。如果没有 `--shell`，该命令将保留已识别的 `$SHELL`。当 `$SHELL` 丢失或无法识别时，Windows 上默认为 PowerShell，其他地方默认为 zsh。

安装会在你的 shell 配置文件中写入一个小的 `# OpenClaw Completion` 块，并将任何较旧、较慢的 `source <(openclaw completion ...)` 行替换为缓存的 source 行：

| 壳      | 配置文件                                                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 巴什       | `~/.bashrc`（当 `~/.bashrc` 缺失时回落到 `~/.bash_profile`）                                                                                                                  |
| 鱼       | `~/.config/fish/config.fish`                                                                                                                                                               |
| 电源外壳 | `~/.config/powershell/Microsoft.PowerShell_profile.ps1`（在 Windows 上：`Documents/PowerShell/Microsoft.PowerShell_profile.ps1`，或 `Documents/WindowsPowerShell/...` 用于 Windows PowerShell） |
| 桀骜        | 当定义了 `ZDOTDIR` 时，为 `$ZDOTDIR/.zshrc`；否则 `~/.zshrc` （空的 `ZDOTDIR` 解析为 `/.zshrc`）                                                                               |

配置文件的更改会暂存于目标文件旁边，并且仅在完整、持久化写入完成后以原子方式替换目标文件。安装失败时，现有配置文件将保持不变。

安装的源代码行保留文字缓存路径，包括空格、引号、美元符号和反斜杠。状态目录更改后重新安装会替换 OpenClaw 之前的源代码行。

同一缓存脚本的用户管理的可移植挂钩（例如 `[[ -f "${HOME}/.openclaw/completions/openclaw.bash" ]] && source "${HOME}/.openclaw/completions/openclaw.bash"`，如点文件管理器所写）被识别为正在配置的完成。 Doctor 和 `completion --install` 使此类托管行逐字节保持不变，而不是附加重复的文字路径块。

## <a id="permission-failures"></a> 权限失败

如果 Doctor 或 onboarding 无法更新您的 shell 配置文件，则完成仍然是可选的并继续安装。当缓存可用时，警告会包含一条在当前匹配的 shell 会话中加载该缓存的命令。运行打印的完整命令。这不会为将来的 shell 会话安装完成功能。

对于持久安装，请在重试 `openclaw completion --install` 之前解决报告的权限或只读错误。失败位置可能是暂存目录或符号链接目标，而不是配置文件本身。原子替换还需要对目标目录的写访问权限。安装程序使用上表中选择的配置文件。它没有配置文件目标选项。

## <a id="notes"></a> 说明

- 如果没有 `--install` 或 `--write-state`，该命令会将脚本打印到 stdout。
- 补全生成会预先加载完整的命令树，包括插件 CLI 命令，因此会包含嵌套子命令。
- 如果无效配置阻止插件发现，则生成警告并仍然包含核心命令。修复配置并重新生成以包含插件命令。
- Bash 补全支持 `--flag value` 和 `--flag=value`，包括嵌套命令之前的命名配置文件以及单引号、双引号或反斜杠转义值前缀。
- 在选项终止符 （`--`） 之后，Bash 补全命令名称，但不建议选项或选项值。
- PowerShell 完成光标处的命令和选项值，包括当后面的参数已经存在时。
- `openclaw update` 自动刷新核心完成缓存，无需加载插件 CLI 命令。运行 `openclaw completion --write-state` 以包含插件命令。 `openclaw doctor` 可以修复丢失或陈旧的完成设置。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
