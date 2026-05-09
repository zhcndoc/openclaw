---
summary: "Windows 支持：原生和 WSL2 安装路径、守护进程以及当前注意事项"
read_when:
  - 在 Windows 上安装 OpenClaw
  - 在原生 Windows 和 WSL2 之间选择
  - 查找 Windows 配套应用状态
title: "Windows"
---

OpenClaw 同时支持 **原生 Windows** 和 **WSL2**。WSL2 是更
稳定的路径，也是获得完整体验的推荐方案——CLI、Gateway 和
工具都在 Linux 中运行，并具有完全兼容性。原生 Windows 可用于
核心 CLI 和 Gateway，但有一些下面提到的注意事项。

原生 Windows 配套应用正在规划中。

## WSL2（推荐）

- [入门](/start/getting-started)（在 WSL 中使用）
- [安装与更新](/install/updating)
- 官方 WSL2 指南（Microsoft）：[https://learn.microsoft.com/windows/wsl/install](https://learn.microsoft.com/windows/wsl/install)

## 原生 Windows 状态

原生 Windows 的 CLI 流程正在改进中，但 WSL2 仍然是推荐路径。

目前在原生 Windows 上运行良好的功能：

- 通过 `install.ps1` 的网站安装程序
- 本地 CLI 使用，例如 `openclaw --version`、`openclaw doctor` 和 `openclaw plugins list --json`
- 内置本地 agent/provider 试运行，例如：

```powershell
openclaw agent --local --agent main --thinking low -m "回复时必须且只能输出 WINDOWS-HATCH-OK。"
```

当前注意事项：

- `openclaw onboard --non-interactive` 仍然会期望有一个可访问的本地网关，除非你传入 `--skip-health`
- `openclaw onboard --non-interactive --install-daemon` 和 `openclaw gateway install` 会优先尝试 Windows 计划任务
- 如果计划任务创建被拒绝，OpenClaw 会回退到每用户的 Startup 文件夹登录项，并立即启动网关
- 如果 `schtasks` 本身卡住或停止响应，OpenClaw 现在会快速中止该路径并回退，而不会无限挂起
- 计划任务在可用时仍然是首选，因为它们提供更好的监督状态

如果你只想要原生 CLI，而不安装网关服务，请使用以下之一：

```powershell
openclaw onboard --non-interactive --skip-health
openclaw gateway run
```

如果你确实希望在原生 Windows 上进行受管理的启动：

```powershell
openclaw gateway install
openclaw gateway status --json
```

如果计划任务创建被阻止，回退的服务模式仍会在登录后通过当前用户的 Startup 文件夹自动启动。

## Gateway

- [Gateway 运行手册](/gateway)
- [配置](/gateway/configuration)

## Gateway 服务安装（CLI）

在 WSL2 中：

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

在提示时选择 **Gateway service**。

修复/迁移：

```
openclaw doctor
```

## 在 Windows 登录前自动启动 Gateway

对于无头环境，请确保即使没有人登录 Windows，完整的启动链也能运行。

### 1）在未登录时保持用户服务运行

在 WSL 中：

```bash
sudo loginctl enable-linger "$(whoami)"
```

### 2）安装 OpenClaw gateway 用户服务

在 WSL 中：

```bash
openclaw gateway install
```

### 3）在 Windows 启动时自动启动 WSL

以管理员身份在 PowerShell 中：

```powershell
schtasks /create /tn "WSL Boot" /tr "wsl.exe -d Ubuntu --exec /bin/true" /sc onstart /ru SYSTEM
```

将 `Ubuntu` 替换为你的发行版名称，可通过以下命令查看：

```powershell
wsl --list --verbose
```

### 验证启动链

重启后（在 Windows 登录之前），从 WSL 中检查：

```bash
systemctl --user is-enabled openclaw-gateway.service
systemctl --user status openclaw-gateway.service --no-pager
```

## 高级：通过 LAN 暴露 WSL 服务（portproxy）

WSL 有自己的虚拟网络。如果另一台机器需要访问运行在 **WSL 内部** 的服务
（SSH、本地 TTS 服务器或 Gateway），你必须把一个 Windows 端口
转发到当前 WSL IP。WSL IP 在重启后会变化，
因此你可能需要刷新转发规则。

示例（以 **管理员身份** 运行 PowerShell）：

```powershell
$Distro = "Ubuntu-24.04"
$ListenPort = 2222
$TargetPort = 22

$WslIp = (wsl -d $Distro -- hostname -I).Trim().Split(" ")[0]
if (-not $WslIp) { throw "未找到 WSL IP。" }

netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$ListenPort `
  connectaddress=$WslIp connectport=$TargetPort
```

允许该端口通过 Windows 防火墙（一次性）：

```powershell
New-NetFirewallRule -DisplayName "WSL SSH $ListenPort" -Direction Inbound `
  -Protocol TCP -LocalPort $ListenPort -Action Allow
```

在 WSL 重启后刷新 portproxy：

```powershell
netsh interface portproxy delete v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 | Out-Null
netsh interface portproxy add v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 `
  connectaddress=$WslIp connectport=$TargetPort | Out-Null
```

注意：

- 来自另一台机器的 SSH 目标是 **Windows 主机 IP**（示例：`ssh user@windows-host -p 2222`）。
- 远程节点必须指向一个**可访问的** Gateway URL（不能是 `127.0.0.1`）；请使用
  `openclaw status --all` 进行确认。
- 使用 `listenaddress=0.0.0.0` 以便 LAN 访问；`127.0.0.1` 只会保持本地可访问。
- 如果你希望自动化此过程，可以注册一个计划任务，在登录时运行刷新
  步骤。

## WSL2 分步安装

### 1）安装 WSL2 + Ubuntu

打开 PowerShell（管理员）：

```powershell
wsl --install
# 或明确选择一个发行版：
wsl --list --online
wsl --install -d Ubuntu-24.04
```

如果 Windows 提示，请重启。

### 2）启用 systemd（Gateway 安装所必需）

在你的 WSL 终端中：

```bash
sudo tee /etc/wsl.conf >/dev/null <<'EOF'
[boot]
systemd=true
EOF
```

然后在 PowerShell 中：

```powershell
wsl --shutdown
```

重新打开 Ubuntu，然后验证：

```bash
systemctl --user status
```

### 3）安装 OpenClaw（在 WSL 内）

对于在 WSL 中进行的正常首次设置，请遵循 Linux 入门流程：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
pnpm ui:build
pnpm openclaw onboard --install-daemon
```

如果你是从源码开发，而不是进行首次 onboarding，请使用
[设置](/start/setup) 中的源码开发循环：

```bash
pnpm install
# 仅首次运行（或在重置本地 OpenClaw 配置/工作区之后）
pnpm openclaw setup
pnpm gateway:watch
```

完整指南：[入门](/start/getting-started)

## Windows 配套应用

我们目前还没有 Windows 配套应用。如果你愿意帮助实现它，欢迎贡献。

## Git 和 GitHub 连通性（贡献者）

有些网络会阻止或限制到 GitHub 的 HTTPS 访问。如果 `git clone` 因超时
或连接重置而失败，请尝试其他网络、VPN，或使用你所在组织提供的
HTTP/HTTPS 代理。

如果在浏览器设备流程中 `gh auth login` 失败（例如无法在规定时间内访问
`github.com:443`），请改用个人访问令牌进行认证：

1. 创建一个至少包含 `repo` 范围（classic PAT）或等效细粒度访问权限的令牌。
2. 在 PowerShell 中为当前会话设置：

```powershell
$env:GH_TOKEN="<your-token>"
gh auth status
gh auth setup-git
```

3. 如果 `gh auth status` 提示缺少 `read:org`，请生成一个包含
   该范围的令牌并重新赋值变量：

```powershell
$env:GH_TOKEN="<your-token-with-repo-and-read:org>"
gh auth status
```

`gh auth refresh -s read:org` 仅在你通过 `gh auth login`
进行认证并且已经保存了可刷新的凭据时才适用（使用 `GH_TOKEN` 时不适用）。

绝不要提交令牌，也不要把它们粘贴到 issue 或 pull request 中。

## 相关

- [安装总览](/install)
- [平台](/platforms)
