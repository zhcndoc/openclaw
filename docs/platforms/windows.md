---
summary: "Windows support: native and WSL2 install paths, daemon, and current caveats"
read_when:
  - Installing OpenClaw on Windows
  - Choosing between native Windows and WSL2
  - Looking for Windows companion app status
title: "Windows"
---

# Windows

OpenClaw supports both **native Windows** and **WSL2**. WSL2 is the more
stable path and recommended for the full experience — the CLI, Gateway, and
tooling run inside Linux with full compatibility. Native Windows works for
core CLI and Gateway use, with some caveats noted below.

计划推出原生 Windows 伴侣应用。

## WSL2 (recommended)

- [快速入门](/start/getting-started)（在 WSL 内使用）
- [安装与更新](/install/updating)
- 官方 WSL2 指南（微软）：[https://learn.microsoft.com/windows/wsl/install](https://learn.microsoft.com/windows/wsl/install)

## Native Windows status

Native Windows CLI flows are improving, but WSL2 is still the recommended path.

What works well on native Windows today:

- website installer via `install.ps1`
- local CLI use such as `openclaw --version`, `openclaw doctor`, and `openclaw plugins list --json`
- embedded local-agent/provider smoke such as:

```powershell
openclaw agent --local --agent main --thinking low -m "Reply with exactly WINDOWS-HATCH-OK."
```

Current caveats:

- `openclaw onboard --non-interactive` still expects a reachable local gateway unless you pass `--skip-health`
- `openclaw onboard --non-interactive --install-daemon` and `openclaw gateway install` try Windows Scheduled Tasks first
- if Scheduled Task creation is denied, OpenClaw falls back to a per-user Startup-folder login item and starts the gateway immediately
- if `schtasks` itself wedges or stops responding, OpenClaw now aborts that path quickly and falls back instead of hanging forever
- Scheduled Tasks are still preferred when available because they provide better supervisor status

If you want the native CLI only, without gateway service install, use one of these:

```powershell
openclaw onboard --non-interactive --skip-health
openclaw gateway run
```

If you do want managed startup on native Windows:

```powershell
openclaw gateway install
openclaw gateway status --json
```

If Scheduled Task creation is blocked, the fallback service mode still auto-starts after login through the current user's Startup folder.

## Gateway

- [网关运行手册](/gateway)
- [配置](/gateway/configuration)

## 网关服务安装（CLI）

在 WSL2 内执行：

```
openclaw onboard --install-daemon
```

或者：

```
openclaw gateway install
```

或者：

```
openclaw configure
```

出现提示时，选择 **网关服务**。

修复/迁移：

```
openclaw doctor
```

## 网关开机自动启动（Windows 登录前）

针对无头配置，确保即使无人登录 Windows，整个启动链也能正常运行。

### 1) 无登录时保持用户服务运行

在 WSL 内执行：

```bash
sudo loginctl enable-linger "$(whoami)"
```

### 2) 安装 OpenClaw 网关用户服务

在 WSL 内执行：

```bash
openclaw gateway install
```

### 3) 在 Windows 启动时自动开始 WSL

以管理员身份打开 PowerShell 执行：

```powershell
schtasks /create /tn "WSL Boot" /tr "wsl.exe -d Ubuntu --exec /bin/true" /sc onstart /ru SYSTEM
```

将 `Ubuntu` 替换成你的发行版名，可通过以下命令查看：

```powershell
wsl --list --verbose
```

### 验证启动链

重启后（Windows 登录前），在 WSL 中检查：

```bash
systemctl --user is-enabled openclaw-gateway
systemctl --user status openclaw-gateway --no-pager
```

## 高级：通过局域网暴露 WSL 服务（端口代理）

WSL 有自己的虚拟网络。如果其他机器需要访问 **WSL 内运行的服务**（如 SSH、本地 TTS 服务器或网关），需将 Windows 端口转发到当前 WSL IP。WSL IP 会在重启后变化，因此可能需要刷新转发规则。

示例（以管理员身份运行 PowerShell）：

```powershell
$Distro = "Ubuntu-24.04"
$ListenPort = 2222
$TargetPort = 22

$WslIp = (wsl -d $Distro -- hostname -I).Trim().Split(" ")[0]
if (-not $WslIp) { throw "WSL IP 未找到。" }

netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$ListenPort `
  connectaddress=$WslIp connectport=$TargetPort
```

允许此端口通过 Windows 防火墙（一次性操作）：

```powershell
New-NetFirewallRule -DisplayName "WSL SSH $ListenPort" -Direction Inbound `
  -Protocol TCP -LocalPort $ListenPort -Action Allow
```

WSL 重启后刷新端口代理规则：

```powershell
netsh interface portproxy delete v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 | Out-Null
netsh interface portproxy add v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 `
  connectaddress=$WslIp connectport=$TargetPort | Out-Null
```

注意事项：

- 其他机器的 SSH 连接目标为 **Windows 主机 IP** （示例：`ssh user@windows-host -p 2222`）。
- 远程节点必须指向**可访问的**网关 URL（不能是 `127.0.0.1`）；可用 `openclaw status --all` 确认。
- 使用 `listenaddress=0.0.0.0` 以允许局域网访问；`127.0.0.1` 则只允许本地访问。
- 如果需要自动化，注册一个计划任务，在登录时运行刷新步骤。

## WSL2 安装分步指南

### 1) 安装 WSL2 + Ubuntu

以管理员身份打开 PowerShell：

```powershell
wsl --install
# 或显式选择发行版：
wsl --list --online
wsl --install -d Ubuntu-24.04
```

如果 Windows 提示，请重启。

### 2) 启用 systemd（安装网关所需）

在 WSL 终端执行：

```bash
sudo tee /etc/wsl.conf >/dev/null <<'EOF'
[boot]
systemd=true
EOF
```

然后在 PowerShell 中执行：

```powershell
wsl --shutdown
```

重新打开 Ubuntu，验证：

```bash
systemctl --user status
```

### 3) 安装 OpenClaw（WSL 内）

按照 Linux 快速入门流程在 WSL 中执行：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm ui:build # 首次运行时自动安装 UI 依赖
pnpm build
openclaw onboard
```

完整指南见：[快速入门](/start/getting-started)

## Windows 伴侣应用

目前尚无 Windows 伴侣应用。如果你有兴趣贡献代码，欢迎参与开发。
