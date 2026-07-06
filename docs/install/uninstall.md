---
summary: "完全卸载 OpenClaw（CLI、服务、状态、工作区）"
read_when:
  - 你想从一台机器上移除 OpenClaw
  - 卸载后 gateway 服务仍在运行
title: "卸载"
---

有两条路径：

- **简单路径**：如果 `openclaw` 仍然安装着。
- **手动移除服务**：如果 CLI 已经没了，但服务仍在运行。

## 简单路径（CLI 仍已安装）

推荐：使用内置卸载程序：

```bash
openclaw uninstall
```

状态删除会保留已配置的工作区目录，除非你也选择 `--workspace`。

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

手动步骤（结果相同）：

1. 停止 gateway 服务：

```bash
openclaw gateway stop
```

2. 卸载 gateway 服务（launchd/systemd/schtasks）：

```bash
openclaw gateway uninstall
```

3. 删除状态 + 配置：

```bash
rm -rf "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"
```

如果你将 `OPENCLAW_CONFIG_PATH` 设置为状态目录之外的自定义位置，也请删除该文件。
如果你想保留位于状态目录内的工作区，例如 `~/.openclaw/workspace`，请在运行 `rm -rf` 之前将其移走，或选择性删除状态内容。

4. 删除你的工作区（可选，会移除 agent 文件）：

```bash
rm -rf ~/.openclaw/workspace
```

5. 移除 CLI 安装（选择你使用的方式）：

```bash
npm rm -g openclaw
pnpm remove -g openclaw
bun remove -g openclaw
```

6. 如果你安装了 macOS 应用：

```bash
rm -rf /Applications/OpenClaw.app
```

注意：

- 如果你使用了 profiles（`--profile` / `OPENCLAW_PROFILE`），请为每个状态目录重复步骤 3（默认值是 `~/.openclaw-<profile>`）。
- 在远程模式下，状态目录位于**gateway 主机**上，所以也要在那里执行步骤 1-4。

## 手动移除服务（CLI 未安装）

当 gateway 服务还在运行，但 `openclaw` 已经不存在时使用此方法。

### macOS（launchd）

默认标签是 `ai.openclaw.gateway`（如果使用了 profile，则为 `ai.openclaw.<profile>`）：

```bash
launchctl bootout gui/$UID/ai.openclaw.gateway
rm -f ~/Library/LaunchAgents/ai.openclaw.gateway.plist
```

如果你使用了 profile，请将标签和 plist 名称替换为 `ai.openclaw.<profile>`。

### Linux（systemd 用户单元）

默认单元名称是 `openclaw-gateway.service`（或 `openclaw-gateway-<profile>.service`）。在从非常旧的安装升级的机器上，旧名称 `clawdbot-gateway.service` 的单元可能仍然存在；`openclaw uninstall` / `openclaw gateway uninstall` 会自动检测并移除它。

```bash
systemctl --user disable --now openclaw-gateway.service
rm -f ~/.config/systemd/user/openclaw-gateway.service
systemctl --user daemon-reload
```

### Windows（计划任务）

默认任务名称是 `OpenClaw Gateway`（或 `OpenClaw Gateway (<profile>)`）。
该任务会在你的状态目录下启动一个无窗口的 `gateway.vbs` 脚本，随后
运行 `gateway.cmd`；请将两者都删除。

```powershell
schtasks /Delete /F /TN "OpenClaw Gateway"
Remove-Item -Force "$env:USERPROFILE\.openclaw\gateway.cmd" -ErrorAction SilentlyContinue
Remove-Item -Force "$env:USERPROFILE\.openclaw\gateway.vbs" -ErrorAction SilentlyContinue
```

如果你使用了 profile，请删除匹配的任务名称，以及位于 `~\.openclaw-<profile>` 下的 `gateway.cmd` /
`gateway.vbs` 文件。

## Normal Installation vs Source Checkout

### Normal Installation (install.sh / npm / pnpm / bun)

If you used `https://openclaw.ai/install.sh` or `install.ps1`, the CLI was installed via `npm install -g openclaw@latest`.
Remove it with `npm rm -g openclaw` (if you installed it with `pnpm remove -g` / `bun remove -g`, use the corresponding command).

### Source Checkout (git clone)

If you’re running from a repository checkout (`git clone` + `openclaw ...` / `bun run openclaw ...`):

1. Uninstall the gateway service before deleting the repository (using the simple path above or manually removing the service).
2. Delete the repository directory.
3. Delete state + workspace as shown above.

## 相关

- [安装概览](/install)
- [迁移指南](/install/migrating)
