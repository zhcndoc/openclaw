---
doc-schema-version: 1
summary: "完全卸载 OpenClaw（CLI、服务、状态、工作区）"
read_when:
  - "你想从一台机器上移除 OpenClaw"
  - "卸载后 gateway 服务仍在运行"
title: "卸载"
---

先删除服务并选择本地数据，然后[any剩余的CLI安装](#remove-the-cli)。状态删除还可以删除嵌套在该目录中的安装文件。选择：

- **简单路径**：如果 `openclaw` 仍然安装着。
- **手动移除服务**：如果 CLI 已经没了，但服务仍在运行。

## <a id="easy-path-(cli-still-installed)"></a><a id="easy-path-cli-still-installed"></a> 简单路径（CLI 仍已安装）

该命令尝试独立请求的清理范围，如果任何范围失败或被阻止，则返回非零状态。服务拆卸仍然是状态和工作区删除的安全门；如果该门失败，则会保留这些数据范围，同时仍尝试进行应用程序清理。部分清理是明确报告的，并且永远不会有无条件完成结果。

```bash
openclaw uninstall
```

交互式提示仅预先选择网关服务。要完全本地删除，还可以在提示中选择状态、工作区和应用程序，或运行 `openclaw uninstall --all`。状态删除会保留配置的工作区目录，除非您还选择 `--workspace`。

预览将要移除的内容（安全）：

```bash
openclaw uninstall --dry-run --all
```

非交互式（自动化 / npx）。请谨慎使用，并且仅在确认作用域之后使用：

```bash
openclaw uninstall --all --yes --non-interactive
npx -y openclaw uninstall --all --yes --non-interactive
```

标志：`--service`、`--state`、`--workspace`、`--app` 选择单个作用域；`--all` 选择全部四项。

与 `openclaw uninstall --state` 不同，手动状态删除不会保留工作区。在删除文件之前，请成功停止并卸载该服务。在手动状态或前缀删除之前，请将您想要保留在该目录之外的任何配置移至该目录之外。

1. 停止 gateway 服务：

```bash
openclaw gateway stop
```

2. 卸载 gateway 服务（launchd/systemd/schtasks）：

```bash
openclaw gateway uninstall
```

3. 决定是否保留工作空间。

在手动删除之前，将要保留的每个已配置工作区（包括 `~/.openclaw/workspace`）移至状态目录之外。否则该目录内的工作空间将随之删除；它们不需要单独删除。

4. 删除状态+配置：

```bash
rm -rf "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"
```

如果将 `OPENCLAW_CONFIG_PATH` 设置为状态目录之外的自定义位置，也请删除该文件。重新创建其父工作区后恢复保留的工作区，或在重新安装时配置其新路径。

5. 仅当您还想删除外部工作区的代理文件时才删除该工作区：

```bash
rm -rf /path/to/external/workspace
```

6. [ 使用下面的安装所有者删除 CLI](#remove-the-cli)。

7. 如果您安装了 macOS 应用程序：

```bash
rm -rf /Applications/OpenClaw.app
```

- 如果您使用配置文件 （`--profile` / `OPENCLAW_PROFILE`），请对每个状态目录重复步骤 3-4（默认为 `~/.openclaw-<profile>`）。
- 在远程模式下，状态目录位于**gateway 主机**上，所以也要在那里执行步骤 1-4。

## <a id="manual-service-removal-(cli-not-installed)"></a><a id="manual-service-removal-cli-not-installed"></a> 手动移除服务（CLI 未安装）

当 gateway 服务还在运行，但 `openclaw` 已经不存在时使用此方法。

### macOS (launchd)

默认标签是 `ai.openclaw.gateway`（如果使用了 profile，则为 `ai.openclaw.<profile>`）：

```bash
launchctl bootout gui/$UID/ai.openclaw.gateway
rm -f ~/Library/LaunchAgents/ai.openclaw.gateway.plist
```

如果你使用了 profile，请将标签和 plist 名称替换为 `ai.openclaw.<profile>`。

### <a id="linux-(systemd-user-unit)"></a><a id="linux-systemd-user-unit"></a> Linux（systemd 用户单元）

默认单元名称是 `openclaw-gateway.service`（或 `openclaw-gateway-<profile>.service`）。在从非常旧的安装升级的机器上，旧名称 `clawdbot-gateway.service` 的单元可能仍然存在；`openclaw uninstall` / `openclaw gateway uninstall` 会自动检测并移除它。

```bash
systemctl --user disable --now openclaw-gateway.service
rm -f ~/.config/systemd/user/openclaw-gateway.service{,.bak}
systemctl --user daemon-reload
```

### <a id="windows-(scheduled-task)"></a><a id="windows-scheduled-task"></a> Windows（计划任务）

默认任务名称是 `OpenClaw Gateway`（或 `OpenClaw Gateway (<profile>)`）。 该任务会在你的状态目录下启动一个无窗口的 `gateway.vbs` 脚本，随后运行 `gateway.cmd`；请将两者都删除。

```powershell
schtasks /Delete /F /TN "OpenClaw Gateway"
Remove-Item -Force "$env:USERPROFILE\.openclaw\gateway.cmd" -ErrorAction SilentlyContinue
Remove-Item -Force "$env:USERPROFILE\.openclaw\gateway.vbs" -ErrorAction SilentlyContinue
```

如果您使用配置文件，请删除匹配的任务名称以及 `~\.openclaw-<profile>` 下的 `gateway.cmd` / `gateway.vbs` 文件。

<a id="normal-install-vs-source-checkout" />
<a id="normal-install-(install.sh-%2F-npm-%2F-pnpm-%2F-bun)" />
<a id="normal-install-install-sh-/-npm-/-pnpm-/-bun" />
<a id="source-checkout-(git-clone)" />
<a id="source-checkout-git-clone" />

## <a id="remove-the-cli"></a> 删除CLI

在 **删除签出、启动器或前缀之前删除网关服务**。首先检查已解析的命令及其目标；如果所有权不明确，请将其保留在原处。检查 [Installer 内部 ](/install/installer) 的自定义结帐和前缀选项。

| 安装方法                               | CLI 所有者和删除                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 全局 npm（默认为 `install.sh` / `install.ps1`） | 使用拥有此安装的 npm/prefix 运行 `npm rm -g openclaw`。                                                                                                                                                                                                                                                                |
| 全局 pnpm 或 Bun                                | 仅运行匹配的命令：`pnpm remove -g openclaw` 或 `bun remove -g openclaw`。对于 Bun-only shell 启动器，首先检查 `$(bun pm bin -g)/openclaw` 的 `OpenClaw Bun launcher` 标头和预期的包路径，然后在删除包后删除该启动器； Bun 可以留下常规启动器文件。 |
| `install.sh --install-method git`                 | 检查`~/.local/bin/openclaw`；仅当该启动器指向预期的结帐时才删除该启动器，然后删除该结帐。                                                                                                                                                                                                        |
| `install.ps1 -InstallMethod git`                  | 检查`%USERPROFILE%\.local\bin\openclaw.cmd`；仅当该启动器指向预期的结帐时才删除该启动器，然后删除该结帐。                                                                                                                                                                                        |
| `install-cli.sh`（npm 或 Git）                     | 检查 `<prefix>/bin/openclaw`。前缀默认为`~/.openclaw`； `--prefix` / `OPENCLAW_PREFIX` 覆盖它。仅在保留数据后删除专用前缀； Git 模式还需要删除其单独的签出。                                                                                                        |
| 直接来源结帐                            | 只取出你自己的wrapper/symlink，然后结帐。保留其他安装所拥有的垫片。                                                                                                                                                                                                                                   |

Git 签出默认为 `~/openclaw`（Windows 上为 `%USERPROFILE%\openclaw`）；使用启动器的实际目标，包括自定义 `--git-dir` / `-GitDir` 或 `OPENCLAW_GIT_DIR`。在POSIX上，`OPENCLAW_HOME`可以更改默认结账。仅删除上面选择的 state/workspaces。

在删除前缀之前，请将您想要保留的任何状态、配置和工作区移至其外部。 **切勿删除共享前缀批发**：仅删除经过验证的OpenClaw文件，保留共享的Node运行时、包和工具。

如果安装了完成，则仅从 [selected shell profile](/cli/completion#install-flow) 中删除其 `# OpenClaw Completion` 块和 OpenClaw 源代码行。仅当旧的 `openclaw completion` source/eval 行不包含其他命令时才删除它；保留周围的内容。

仅当没有其他命令使用安装程序添加的 PATH 条目时，才删除该条目。保留共享 bin 目录，例如 `~/.local/bin`。在 Windows 上，相同的规则适用于便携式 Node/MinGit 及其 `%LOCALAPPDATA%\OpenClaw\deps` 下的 PATH 条目。

打开一个新的shell并检查`command -v openclaw`（PowerShell：`Get-Command openclaw -ErrorAction SilentlyContinue`）。如果命令仍然可以解析，请检查它：可能仍然存在第二个安装或外部包装程序。

## <a id="related"></a> 相关内容

- [安装概览](/install)
- [迁移指南](/install/migrating)
- [`openclaw uninstall`](/cli/uninstall) — 命令参考和标志
