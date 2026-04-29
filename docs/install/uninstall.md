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

非交互式（自动化 / npx）：

```bash
openclaw uninstall --all --yes --non-interactive
npx -y openclaw uninstall --all --yes --non-interactive
```

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

如果你把 `OPENCLAW_CONFIG_PATH` 设置到了状态目录之外的自定义位置，也要删除那个文件。

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

默认标签是 `ai.openclaw.gateway`（或 `ai.openclaw.<profile>`；旧版 `com.openclaw.*` 可能仍然存在）：

```bash
launchctl bootout gui/$UID/ai.openclaw.gateway
rm -f ~/Library/LaunchAgents/ai.openclaw.gateway.plist
```

如果你使用了 profile，请将标签和 plist 名称替换为 `ai.openclaw.<profile>`。如果存在任何旧版 `com.openclaw.*` 的 plist，也一并移除。

### Linux（systemd 用户单元）

默认单元名称是 `openclaw-gateway.service`（或 `openclaw-gateway-<profile>.service`）：

```bash
systemctl --user disable --now openclaw-gateway.service
rm -f ~/.config/systemd/user/openclaw-gateway.service
systemctl --user daemon-reload
```

### Windows（计划任务）

默认任务名称是 `OpenClaw Gateway`（或 `OpenClaw Gateway (<profile>)`）。
任务脚本位于你的状态目录下。

```powershell
schtasks /Delete /F /TN "OpenClaw Gateway"
Remove-Item -Force "$env:USERPROFILE\.openclaw\gateway.cmd"
```

如果你使用了 profile，请删除对应的任务名称和 `~\.openclaw-<profile>\gateway.cmd`。

## 正常安装 vs 源码检出

### 正常安装（install.sh / npm / pnpm / bun）

如果你使用了 `https://openclaw.ai/install.sh` 或 `install.ps1`，CLI 是通过 `npm install -g openclaw@latest` 安装的。
使用 `npm rm -g openclaw` 移除它（如果你是用 `pnpm remove -g` / `bun remove -g` 安装的，则使用相应命令）。

### 源码检出（git clone）

如果你是从仓库检出中运行的（`git clone` + `openclaw ...` / `bun run openclaw ...`）：

1. 在删除仓库之前先卸载 gateway 服务（使用上面的简单路径或手动移除服务）。
2. 删除仓库目录。
3. 按上面所示删除状态 + 工作区。

## 相关

- [安装概览](/install)
- [迁移指南](/install/migrating)
