---
summary: "彻底卸载 OpenClaw（CLI、服务、状态、工作区）"
read_when:
  - 你想要从一台机器上移除 OpenClaw
  - 卸载后网关服务仍在运行
title: "卸载"
---

# 卸载

有两种路径：

- **简易路径**，如果 `openclaw` 命令仍然安装。
- **手动移除服务**，如果 CLI 已消失但服务仍在运行。

## 简易路径（CLI 仍安装）

推荐：使用内置卸载程序：

```bash
openclaw uninstall
```

非交互模式（自动化 / npx）：

```bash
openclaw uninstall --all --yes --non-interactive
npx -y openclaw uninstall --all --yes --non-interactive
```

手动步骤（结果相同）：

1. 停止网关服务：

```bash
openclaw gateway stop
```

2. 卸载网关服务（launchd/systemd/schtasks）：

```bash
openclaw gateway uninstall
```

3. 删除状态和配置：

```bash
rm -rf "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"
```

如果你将 `OPENCLAW_CONFIG_PATH` 设置到状态目录外的自定义位置，也请删除该文件。

4. 删除你的工作区（可选，移除代理文件）：

```bash
rm -rf ~/.openclaw/workspace
```

5. 移除 CLI 安装（选择你使用的命令）：

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

- 如果你使用了配置文件（`--profile` / `OPENCLAW_PROFILE`），请对每个状态目录重复步骤 3（默认是 `~/.openclaw-<profile>`）。
- 在远程模式下，状态目录位于**网关主机**上，因此也需在那里执行步骤 1-4。

## 手动移除服务（CLI 未安装）

如果网关服务仍在运行但找不到 `openclaw` 命令，请用此方法。

### macOS（launchd）

默认标签为 `ai.openclaw.gateway`（或 `ai.openclaw.<profile>`；遗留的 `com.openclaw.*` 可能仍存在）：

```bash
launchctl bootout gui/$UID/ai.openclaw.gateway
rm -f ~/Library/LaunchAgents/ai.openclaw.gateway.plist
```

如果使用了配置文件，请将标签和 plist 名称替换为 `ai.openclaw.<profile>`。如存在遗留的 `com.openclaw.*` plist 文件，请一并删除。

### Linux（systemd 用户单元）

默认单元名称是 `openclaw-gateway.service`（或 `openclaw-gateway-<profile>.service`）：

```bash
systemctl --user disable --now openclaw-gateway.service
rm -f ~/.config/systemd/user/openclaw-gateway.service
systemctl --user daemon-reload
```

### Windows（计划任务）

默认任务名称是 `OpenClaw Gateway`（或 `OpenClaw Gateway (<profile>)`）。
任务脚本位于你的状态目录中。

```powershell
schtasks /Delete /F /TN "OpenClaw Gateway"
Remove-Item -Force "$env:USERPROFILE\.openclaw\gateway.cmd"
```

如果使用了配置文件，请删除对应名称的任务以及 `~\.openclaw-<profile>\gateway.cmd` 文件。

## 普通安装与源码检出对比

### 普通安装（install.sh / npm / pnpm / bun）

如果你使用了 `https://openclaw.ai/install.sh` 或 `install.ps1`，CLI 是通过 `npm install -g openclaw@latest` 安装的。
请用 `npm rm -g openclaw`（或使用你安装时的包管理器，如 `pnpm remove -g` / `bun remove -g`）来移除。

### 源码检出（git clone）

如果你是从源码仓库运行（`git clone` + `openclaw ...` / `bun run openclaw ...`）：

1. 在删除源码仓库之前先卸载网关服务（使用上面简易路径或手动移除服务）。
2. 删除源码目录。
3. 按上文所示移除状态和工作区。
