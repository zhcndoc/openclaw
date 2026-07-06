---
summary: "Windows 支持：Windows Hub、原生 CLI 和 Gateway、WSL2 Gateway 设置、节点模式以及故障排查"
read_when:
  - 在 Windows 上安装 OpenClaw
  - 在 Windows Hub、原生 Windows 和 WSL2 之间选择
  - 设置 Windows 配套应用或 Windows 节点模式
title: "Windows"
---

OpenClaw 提供原生的 **Windows Hub** 配套应用以及 Windows CLI 支持。
使用 Windows Hub 可获得带有安装、托盘状态、聊天、Command
Center 诊断以及 Windows 节点功能的桌面应用。直接使用 PowerShell
安装程序来安装 CLI/Gateway。使用 WSL2 可获得最
兼容 Linux 的 Gateway 运行时。

## 推荐：Windows Hub

Windows Hub 是适用于 Windows 10 20H2+ 和
Windows 11 的原生 WinUI 配套应用。它无需管理员权限即可安装，并作为经过签名的
x64 和 ARM64 安装程序随 OpenClaw 版本发布。

从
[OpenClaw 发布页面](https://github.com/openclaw/openclaw/releases) 下载最新稳定版安装程序，或者
直接通过 `releases/latest/download` 获取：

- [OpenClawCompanion-Setup-x64.exe](https://github.com/openclaw/openclaw/releases/latest/download/OpenClawCompanion-Setup-x64.exe)
- [OpenClawCompanion-Setup-arm64.exe](https://github.com/openclaw/openclaw/releases/latest/download/OpenClawCompanion-Setup-arm64.exe)
- [校验和](https://github.com/openclaw/openclaw/releases/latest/download/OpenClawCompanion-SHA256SUMS.txt)

如果上面的链接返回 404，请访问 [发布页面](https://github.com/openclaw/openclaw/releases)
并在最新版本中查找 `OpenClawCompanion-Setup-*` 资源。

安装完成后，从开始菜单或系统
托盘启动 **OpenClaw Companion**。安装程序还会添加 Gateway Setup、Chat、Settings、
Check for Updates 和卸载的快捷方式。

### Windows Hub 包含内容

- 系统托盘状态和登录时启动。
- 首次运行时为本地、由应用拥有的 WSL Gateway 进行设置。
- 针对本地、远程和通过 SSH 隧道连接的 Gateways 的连接设置。
- 原生聊天窗口，以及访问浏览器 Control UI 的入口。
- Command Center 提供会话、使用情况、通道、节点、配对以及修复命令的诊断功能。
- Windows 节点模式，用于由代理控制的画布、屏幕、摄像头、
  通知、设备状态、语音，以及受控的 `system.run`。
- 本地 MCP 服务器模式，供 Claude Desktop、Claude Code 和 Cursor 等
  MCP 客户端使用。

### 首次启动

首次启动时，如果没有可用的已保存
Gateway，Windows Hub 会打开设置。最快的方式是 **Set up locally**，它会配置一个
由应用拥有的 `OpenClawGateway` WSL 发行版，在其中安装 Gateway，并与应用配对。
这不会导出或修改你现有的 Ubuntu 发行版。

当你已经有 Gateway 时，选择 **Advanced setup** 或打开 Connections 选项卡。
你可以连接到：

- 这台电脑上的本地 Gateway
- 这台电脑上的 WSL Gateway
- 通过 URL 和 token 或设置代码连接的远程 Gateway
- 通过 SSH 隧道到达的 Gateway

当设置完成后，托盘图标会变为绿色。从
托盘中打开 **Command Center**，以确认连接、配对、节点状态和通道健康状况。

## Windows 节点模式

Windows Hub 可以注册为一个 OpenClaw 节点，这样代理就可以通过 Gateway 使用已声明的
Windows 原生能力。节点命令必须由节点声明，并在 Gateway 策略允许后才能运行；有关完整的允许/拒绝模型，请参见
[节点](/nodes#command-policy)。

常见命令：

| Family | Commands                                                                             |
| ------ | ------------------------------------------------------------------------------------ |
| Canvas | `canvas.present`, `canvas.hide`, `canvas.navigate`, `canvas.eval`, `canvas.snapshot` |
| Screen | `screen.snapshot`；`screen.record` 需要显式选择加入                          |
| Camera | `camera.list`；`camera.snap`, `camera.clip` 需要显式选择加入                  |
| System | `system.notify`, `system.run`, `system.run.prepare`, `system.which`                  |
| Device | `location.get`, `device.info`, `device.status`                                       |
| Talk   | `talk.ptt.start`, `talk.ptt.stop`, `talk.ptt.cancel`, `talk.ptt.once`, `talk.speak`  |

节点模式需要 Gateway 配对。如果应用显示配对请求，请在 Gateway 主机上批准它：

```powershell
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

Gateway 只会转发节点声明且服务器策略允许的命令。`screen.record`、`camera.snap`
和 `camera.clip` 等隐私敏感命令需要显式启用 `gateway.nodes.allowCommands`。

## 本地 MCP 模式

Windows Hub 可以通过回环地址（loopback）将相同的 Windows 原生能力注册表作为本地
MCP 服务器暴露出来，因此本地 MCP 客户端无需运行 OpenClaw Gateway 也能驱动 Windows 能力。

请在 Windows Hub 设置中的开发者/高级部分启用它。启用服务器后，应用会显示回环端点和 bearer token。

模式矩阵：

| Node mode | MCP server | 行为                               |
| --------- | ---------- | ---------------------------------- |
| off       | off        | 仅供操作者使用的桌面应用          |
| on        | off        | 连接到 Gateway 的 Windows 节点     |
| off       | on         | 仅本地 MCP 服务器              |
| on        | on         | Gateway 节点加本地 MCP 服务器 |

## 原生 Windows CLI 和 Gateway

如果偏好终端优先使用方式，请通过 PowerShell 安装 OpenClaw：

```powershell
iwr -useb https://openclaw.ai/install.ps1 | iex
```

验证：

```powershell
openclaw --version
openclaw doctor
openclaw gateway status --json
```

受管启动会在可用时使用 Windows 计划任务。该任务会将可读的 `gateway.cmd` 脚本保留在 OpenClaw 状态目录中，但会通过生成的 `gateway.vbs` WScript 包装器来启动它，因此后台 Gateway 不会打开可见的控制台窗口。如果任务创建被拒绝，OpenClaw 会回退为按用户配置的 Startup 文件夹登录项。

安装 Gateway 服务：

```powershell
openclaw gateway install
openclaw gateway status --json
```

仅使用 CLI、而不使用受管 Gateway 服务：

```powershell
openclaw onboard --non-interactive --skip-health
openclaw gateway run
```

## WSL2 网关

WSL2 仍然是 Windows 上与 Linux 最兼容的网关运行时。Windows
Hub 可以为你设置一个应用专属的 WSL 网关，或者在你自己的发行版中手动安装。

手动设置：

```powershell
wsl --install
# 或者显式选择一个发行版：
wsl --list --online
wsl --install -d Ubuntu-24.04
```

在 WSL 中启用 systemd：

```bash
sudo tee /etc/wsl.conf >/dev/null <<'EOF'
[boot]
systemd=true
EOF
```

从 PowerShell 重启 WSL：

```powershell
wsl --shutdown
```

然后使用 Linux 快速开始在 WSL 中安装 OpenClaw：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw gateway status
```

## 在 Windows 登录前自动启动 Gateway

对于无头的 WSL 设置，请确保即使没有人登录 Windows，完整的启动链也会运行。

在 WSL 中：

```bash
sudo apt-get install -y dbus-x11
sudo loginctl enable-linger "$(whoami)"
openclaw gateway install
```

在 PowerShell 中以管理员身份：

```powershell
schtasks /create /tn "WSL Boot" /tr "wsl.exe -d Ubuntu --exec dbus-launch true" /sc onstart /ru "$env:USERNAME"
```

将 `Ubuntu` 替换为你的发行版名称，可通过以下命令查看：

```powershell
wsl --list --verbose
```

<Note>
与旧方案相比有两个变化：

- **使用 `dbus-launch true` 而不是 `/bin/true`**：在 WSL >= 2.6.1.0 上存在一个回归问题（[microsoft/WSL #13416](https://github.com/microsoft/WSL/issues/13416)），即使启用了 linger，最后一个客户端退出后，发行版也会在 15-20 秒后因空闲而终止。`dbus-launch true` 通过保留一个 init 的子进程作为变通方案来维持存活（社区讨论见 [microsoft/WSL #9245](https://github.com/microsoft/WSL/discussions/9245)）。
- **使用 `/ru "$env:USERNAME"` 而不是 `/ru SYSTEM`**：按用户安装的 WSL 发行版（默认设置）对 SYSTEM 账户不可见，因此任务看似运行了，但发行版实际上从未启动。使用你自己的账户运行可以避免这个问题；Windows 会在创建任务时提示你输入密码。

</Note>

重启后，从 WSL 中验证：

```bash
systemctl --user is-enabled openclaw-gateway.service
systemctl --user status openclaw-gateway.service --no-pager
```

## 通过 LAN 暴露 WSL 服务

WSL 有自己的虚拟网络。如果另一台机器必须访问 WSL 内的某个服务，请将 Windows 端口转发到当前的 WSL IP。WSL 的 IP 在重启后可能会改变，因此需要时请刷新转发规则。

PowerShell 管理员示例：

```powershell
$Distro = "Ubuntu-24.04"
$ListenPort = 2222
$TargetPort = 22

$WslIp = (wsl -d $Distro -- hostname -I).Trim().Split(" ")[0]
if (-not $WslIp) { throw "未找到 WSL IP。" }

netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$ListenPort `
  connectaddress=$WslIp connectport=$TargetPort

New-NetFirewallRule -DisplayName "WSL SSH $ListenPort" -Direction Inbound `
  -Protocol TCP -LocalPort $ListenPort -Action Allow
```

注意：

- 来自另一台机器的 SSH 目标应为 Windows 主机 IP，例如 `ssh user@windows-host -p 2222`。
- 远程节点必须指向可访问的 Gateway URL，而不是 `127.0.0.1`。
- LAN 访问使用 `listenaddress=0.0.0.0`，仅本机访问使用 `127.0.0.1`。

## 故障排查

### 托盘图标未出现

检查任务管理器中是否有 `OpenClaw.Tray.WinUI.exe`。如果它正在运行，请打开
隐藏的托盘图标区域并将其固定。如果没有运行，请从开始菜单启动 **OpenClaw Companion**。

### 本地设置失败

从 Windows Hub 打开设置日志，或查看：

```powershell
notepad "$env:LOCALAPPDATA\OpenClawTray\Logs\Setup\easy-setup-latest.txt"
```

常见原因：已禁用 WSL、虚拟化被阻止、应用拥有的 WSL 状态残留，或在安装 Gateway 包时发生网络故障。

### 应用提示需要配对

从 Gateway 批准操作者或节点请求：

```powershell
openclaw devices list
openclaw devices approve <requestId>
```

如果设备已经有 token，请在批准后从 Connections 选项卡重新连接。

### Web chat 无法连接到远程 Gateway

远程 web chat 需要 HTTPS 或 localhost。对于自签名证书，请在 Windows 中信任该证书，或者使用 SSH 隧道连接到 localhost URL。

### `screen.snapshot`、摄像头或音频命令失败

确认 Windows 对摄像头、麦克风、屏幕捕获和通知的权限。打包安装会声明这些受保护的能力，但 Windows 在命令首次使用它们时仍可能提示。

### Git 或 GitHub 连接失败

某些网络会阻止或限制到 GitHub 的 HTTPS 连接。如果 `git clone` 或
`gh auth login` 失败，请尝试其他网络、VPN，或 HTTP/HTTPS 代理。

当前会话中基于 token 的 `gh` 认证：

```powershell
$env:GH_TOKEN="<your-token>"
gh auth status
gh auth setup-git
```

切勿提交 token，也不要将其粘贴到 issue 或 pull request 中。

## 相关

- [安装概览](/install)
- [Node.js 设置](/install/node)
- [节点](/nodes)
- [控制 UI](/web/control-ui)
- [网关配置](/gateway/configuration)
