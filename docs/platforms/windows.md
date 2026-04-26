---
summary: "Windows 支持：原生与 WSL2 的安装路径、守护进程，以及当前注意事项"
read_when:
  - 在 Windows 上安装 OpenClaw
  - 在原生 Windows 与 WSL2 之间做选择
  - 了解 Windows 伴侣应用的状态
title: "Windows"
---

OpenClaw 同时支持 **原生 Windows** 和 **WSL2**。WSL2 是更
稳定的路径，也是获得完整体验的推荐方案——CLI、Gateway 和
工具链都运行在 Linux 中，并具有完全兼容性。原生 Windows 可用于
核心 CLI 和 Gateway，但有一些注意事项如下。

计划推出原生 Windows 伴侣应用。

## WSL2（推荐）

- [快速入门](/start/getting-started)（在 WSL 内使用）
- [安装与更新](/install/updating)
- 官方 WSL2 指南（微软）：[https://learn.microsoft.com/windows/wsl/install](https://learn.microsoft.com/windows/wsl/install)

## 原生 Windows 状态

原生 Windows 的 CLI 流程正在改进中，但 WSL2 仍然是推荐路径。

目前原生 Windows 上做得比较好的部分：

- 通过 `install.ps1` 的网站安装程序
- 本地 CLI 使用，例如 `openclaw --version`、`openclaw doctor` 和 `openclaw plugins list --json`
- 内嵌的本地 agent/provider 健康性测试，例如：

```powershell
openclaw agent --local --agent main --thinking low -m "Reply with exactly WINDOWS-HATCH-OK."
```

当前注意事项：

- `openclaw onboard --non-interactive` 仍然会期望能访问到可达的本地网关，除非你传入 `--skip-health`
- `openclaw onboard --non-interactive --install-daemon` 与 `openclaw gateway install` 首先尝试使用 Windows 计划任务
- 如果创建计划任务被拒绝，OpenClaw 会退回到“按用户”的启动文件夹登录项，并立刻启动网关
- 如果 `schtasks` 本身卡住或停止响应，OpenClaw 现在会快速中止该路径并改为回退，而不是永远挂起
- 当计划任务可用时仍会优先使用它们，因为它们提供更好的守护进程状态

如果你只想使用原生 CLI（不安装网关服务），可以使用以下任一命令：

```powershell
openclaw onboard --non-interactive --skip-health
openclaw gateway run
```

如果你确实想在原生 Windows 上进行托管式开机启动：

```powershell
openclaw gateway install
openclaw gateway status --json
```

如果计划任务创建被阻止，回退的服务模式仍会在登录后通过当前用户的启动文件夹自动启动。

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

将 `Ubuntu` 替换为你的发行版名称，可通过以下命令查看：

```powershell
wsl --list --verbose
```

### 验证启动链

重启后（Windows 登录前），在 WSL 中检查：

```bash
systemctl --user is-enabled openclaw-gateway.service
systemctl --user status openclaw-gateway.service --no-pager
```

## 高级：通过局域网暴露 WSL 服务（端口代理）

WSL 有自己的虚拟网络。如果其他机器需要访问 **在 WSL 内运行的服务**（例如 SSH、本地 TTS 服务器或网关），需要将 Windows 端口转发到当前 WSL IP。WSL IP 会在重启后变化，因此你可能需要刷新转发规则。

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

- 其他机器的 SSH 连接目标应为 **Windows 主机 IP**（示例：`ssh user@windows-host -p 2222`）。
- 远程节点必须指向**可访问的**网关 URL（不能是 `127.0.0.1`）；可用 `openclaw status --all` 确认。
- 使用 `listenaddress=0.0.0.0` 以允许局域网访问；`127.0.0.1` 只允许本地访问。
- 如果需要自动化，请注册计划任务，在登录时运行刷新步骤。

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

对于在 WSL 内进行正常的首次设置，请遵循 Linux 的快速入门流程：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
pnpm ui:build
pnpm openclaw onboard --install-daemon
```

如果你是从源码开发，而不是进行首次引导（onboarding），请使用来自 [Setup](/start/setup) 的源码开发循环：

```bash
pnpm install
# 仅首次运行（或在重置本地 OpenClaw 配置/工作区之后）
pnpm openclaw setup
pnpm gateway:watch
```

完整指南见：[快速入门](/start/getting-started)

## Windows 伴侣应用

我们目前还没有 Windows 伴侣应用。如果你希望
把它做出来，欢迎贡献。

## Related

- [Install overview](/install)
- [Platforms](/platforms)
