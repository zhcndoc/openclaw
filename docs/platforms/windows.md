---
summary: "Windows 集线器（推荐）、Tauri 桌面备份、本机 CLI 和网关、WSL2 和故障排除"
read_when:
  - "在 Windows 上安装 OpenClaw"
  - "在 Windows Hub、Tauri 桌面应用程序、本机 Windows 和 WSL2 之间进行选择"
  - "设置 Windows 配套应用或 Windows 节点模式"
title: "Windows"
---

本机 **Windows Hub** 是推荐的 Windows 桌面应用程序。它包括设置、托盘状态、聊天、命令中心诊断和 Windows 节点功能，以及用于本地设置的应用程序拥有的 WSL 网关。跨平台 **Tauri 桌面应用程序** 是备份选项，通过捆绑的 Bun 或与远程网关的连接在 Windows 上提供本地网关。终端用户可以使用PowerShell安装程序或WSL2。

<a id="alternative-windows-hub" />

## <a id="recommended%3A-windows-hub"></a><a id="recommended-windows-hub"></a> 推荐：Windows Hub

Windows Hub 是 Windows 10 20H2+ 和 Windows 11 的本机 WinUI 配套应用程序，在 [openclaw/openclaw-windows-node](https://github.com/openclaw/openclaw-windows-node). 中维护。它无需管理员权限即可安装，并从其自己的发布页面提供签名的 x64 和 ARM64 安装程序。

Windows Hub 的发布与 OpenClaw CLI 和 Gateway 独立。请从 [Windows Hub 发布页面](https://github.com/openclaw/openclaw-windows-node/releases/latest) 下载最新的稳定版 Hub 安装程序，或者直接通过 `releases/latest/download` 下载：

- [OpenClawCompanion-设置-x64.exe](https://github.com/openclaw/openclaw-windows-node/releases/latest/download/OpenClawCompanion-Setup-x64.exe)
- [OpenClawCompanion-设置-arm64.exe](https://github.com/openclaw/openclaw-windows-node/releases/latest/download/OpenClawCompanion-Setup-arm64.exe)

如果链接高于 404，请访问 [Windows Hub 版本页面](https://github.com/openclaw/openclaw-windows-node/releases) 并打开最新的稳定 Windows Hub 版本。常规 OpenClaw 稳定版本还反映了固定的、经过版本验证的 Windows Hub 版本；该镜像可能会落后于较新的独立 Hub 版本。

安装完成后，从开始菜单或系统托盘启动 **OpenClaw Companion**。安装程序还会添加 Gateway Setup、Chat、Settings、 Check for Updates 和卸载的快捷方式。

### <a id="what-windows-hub-includes"></a> Windows Hub 包含内容

- 系统托盘状态和登录时启动。
- 首次运行时为本地、由应用拥有的 WSL Gateway 进行设置。
- 本地、远程和 SSH- 隧道网关的连接设置。
- 原生聊天窗口，以及访问浏览器 Control UI 的入口。
- Command Center 提供会话、使用情况、通道、节点、配对以及修复命令的诊断功能。
- Windows 节点模式，用于屏幕、摄像头、通知、设备状态、通话和受控 `system.run`。
- MCP 客户端（例如 Claude Desktop、Claude Code 和 Cursor）的本地 MCP 服务器模式。

### <a id="first-launch"></a> 首次启动

首次启动时，如果没有可用的已保存 Gateway，Windows Hub 会打开设置。最快的方式是 **Set up locally**，它会配置一个由应用拥有的 `OpenClawGateway` WSL 发行版，在其中安装 Gateway，并与应用配对。 这不会导出或修改你现有的 Ubuntu 发行版。

当你已经有 Gateway 时，选择 **Advanced setup** 或打开 Connections 选项卡。 你可以连接到：

- a 此 PC 上的本地网关
- a WSL 此 PC 上的网关
- 通过 URL 和 token 或设置代码连接的远程 Gateway
- 通过 SSH 隧道到达的 Gateway

当设置完成后，托盘图标会变为绿色。从托盘中打开 **Command Center**，以确认连接、配对、节点状态和通道健康状况。

## <a id="windows-node-mode"></a> Windows 节点模式

Windows 集线器可以注册为 OpenClaw 节点，以便代理可以通过网关使用声明的 Windows-native 功能。 Node 命令必须由节点声明，包含在其批准的表面中，并在运行之前得到网关策略的允许；有关完整的 allow/deny 模型，请参阅 [Nodes](/nodes/command-policy#command-policy)。

常见命令：

| 家族 | 命令                                                                            |
| ------ | ----------------------------------------------------------------------------------- |
| 屏幕 | `screen.snapshot`；`screen.record` 需要显式选择加入                         |
| 相机 | `camera.list`；`camera.snap`, `camera.clip` 需要显式选择加入                 |
| 系统 | `system.notify`, `system.run`, `system.run.prepare`, `system.which`                 |
| 设备 | `location.get`, `device.info`, `device.status`                                      |
| 讲话   | `talk.ptt.start`, `talk.ptt.stop`, `talk.ptt.cancel`, `talk.ptt.once`, `talk.speak` |

Node 模式需要网关配对。如果应用程序显示配对请求，请从网关主机批准它：

```powershell
openclaw devices list
openclaw devices approve <deviceRequestId>
```

设备批准仅允许连接。如果节点模式已暂停以进行手动配对，请重新启动节点模式或应用程序，以便其重新连接。此重新连接会创建一个单独的命令面请求。在网关上：

```powershell
openclaw nodes pending
openclaw nodes approve <nodeRequestId>
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
```

这两个请求 ID 不同。初始未经批准的表面没有有效命令。在待扩展期间，仍然声明和允许的已批准命令仍然可以运行。 SSH-verified和bootstrap注册可以自动批准第一个表面；仅受信任网络设备批准并不能。以后的命令、能力或权限扩展仍然需要批准。

Gateway 只会转发节点声明且服务器策略允许的命令。诸如 `screen.record`、`camera.snap` 和 `camera.clip` 等涉及隐私的命令需要在 `gateway.nodes.commands.allow` 中显式选择加入。

## <a id="local-mcp-mode"></a> 本地 MCP 模式

Windows 集线器可以将相同的 Windows-native 功能注册表公开为环回上的本地 MCP 服务器，因此本地 MCP 客户端可以在不运行 OpenClaw 网关的情况下驱动 Windows 功能。

在 developer/advanced 部分下的 Windows 集线器设置中启用它。启用服务器后，应用程序会显示环回端点和承载令牌。

模式矩阵：

| Node模式 | MCP 服务器 | 行为                           |
| --------- | ---------- | ---------------------------------- |
| 关闭       | 关闭        | 仅供操作者使用的桌面应用          |
| on        | 关闭        | 连接到 Gateway 的 Windows 节点     |
| 关闭       | on         | 仅本地 MCP 服务器              |
| on        | on         | Gateway 节点加本地 MCP 服务器 |

<a id="recommended-desktop-app-openclaw" />

## <a id="backup%3A-tauri-desktop-app"></a><a id="backup-tauri-desktop-app"></a> Backup：Tauri 桌面应用程序

Tauri 应用程序支持 **Windows 和 Linux** 并托管网关的 Control UI。它作为常规 OpenClaw 发布资产提供。从 [OpenClaw 发布页面 ](https://github.com/openclaw/openclaw/releases) 下载名为 `OpenClaw-<version>-windows-x86_64.exe` 的 **Windows x64 NSIS 安装程序**。运行它，然后从“开始”菜单启动 **OpenClaw**。 Windows 使用 WebView2 来显示 Control UI；安装程序在必要时提供 WebView2。

### <a id="first-launch-and-local-gateway"></a> 首次启动和本地网关

选择本地安装来安装匹配的 OpenClaw CLI 并启动其网关。该应用程序使用其私有 Bun 运行时和包管理器；不需要系统 Node.js 和 npm。网关安装、启动、状态和恢复仍归 `openclaw gateway` 所有，包括计划任务和启动文件夹支持。关闭窗口会将应用程序保留在托盘中；本地网关有自己的服务生命周期。

**本地设置需要应用程序固定版本中的签名 Windows Bun 运行时。** 如果较旧的应用程序报告“此应用程序不包含签名的 Windows 网关运行时”，请更新到具有签名的 Windows 运行时的应用程序版本或连接到远程网关。安装系统 Node.js 不会更改捆绑运行时的准入策略。远程连接继续工作。

当您已有网关时使用连接设置。输入其 URL 和令牌或密码，或选择 SSH 连接。该应用程序打开该网关的 Control UI。桌面更新程序独立于 Windows Authenticode 来验证 Tauri 签名。安装程序验证码签名由版本所有者单独启用； Windows 可能会针对未签名的安装程序显示未知发布者警告。

### <a id="desktop-app-troubleshooting"></a> 桌面应用程序故障排除

- **Signed 运行时不可用：** 在 Windows-enabled 运行时版本后更新桌面应用程序，或使用远程网关。 Linux、macOS 和未签名的测试二进制文件永远不会替代 Windows 发布运行时。
- **下载或安装失败：** 检查您的互联网连接和代理，然后重试本地设置。错误面板保留安装程序诊断信息。
- **Gateway 将无法启动：** 使用托盘的网关控件并检查 `openclaw gateway status --json`。应用程序管理的 CLI 启动器是 `%USERPROFILE%\.openclaw\bin\openclaw.cmd`；如果该目录不在终端的 `PATH` 上，则通过其完整路径调用它。
- **启动任务被拒绝：** 请参阅下面的本机 Windows 服务说明。服务所有者报告它是否注册了任务或登录回退。

## <a id="native-windows-cli-and-gateway"></a> 原生 Windows CLI 和 Gateway

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

**新工作区** 还可以与本机 Windows 网关配合使用。为 Windows 安装 Git 并使其在 `PATH` 上可用。每个空工作区都从一个单独的 Git 存储库开始，该存储库在没有全局 Git 配置的情况下进行了初始化。对于深度嵌套的源存储库，工作区创建还可以避免 Git 出现 Windows' `'$GIT_DIR' too big` 错误。 Worker 结果暂存、读取和清理启用了 Git 对每个命令的 Windows 长路径支持。访问同一深层嵌套存储库的其他 Git 客户端可能需要在其自己的配置中使用 `core.longpaths=true`，例如使用 `git -C "<repository>" config core.longpaths true`。

托管网关启动使用带有当前用户的 S4U 主体、启动和登录触发器的计划任务，以及可读 `gateway.cmd` 脚本的直接 `cmd.exe` 操作。它可以在登录前运行，无需存储密码。 S4U 不提供 Windows 网络凭证或对加密文件的访问；需要这些功能的安装可以保留操作员配置的密码任务。重新安装会刷新其启动器文件，而不替换其帐户、凭据、操作或触发器。

安装程序报告所选的启动模式。 Node 主机保留每用户交互式任务以进行桌面访问。如果无法识别帐户或任务创建被拒绝，则桌面任务或启动文件夹后备需要交互式登录；它无法提供无人值守的引导启动。作为预期服务用户从提升的终端运行安装以注册引导任务。 `openclaw doctor --fix` 将已识别的旧网关定义从交互式登录迁移到无人值守启动，并在修复之前备份定义和启动器。自定义定义仍归运营商所有。

如果将输出重定向附加到 `gateway.cmd` 启动行，请引用整个目标，例如 `>> "%USERPROFILE%\.openclaw\logs\gateway-stdout.log" 2>&1`。完整的尾随重定向被排除在进程所有权检查之外。不带引号的环境扩展可能会在网关的参数中留下文件名片段； OpenClaw 保留不明确的启动器命令，并拒绝终止其所有权无法验证的侦听器。在重试之前引用目标。

任务启动器拥有受监督的网关进程树。使用 `schtasks /end /tn "OpenClaw Gateway"`、`Stop-ScheduledTask` 或任务计划程序的 **End** 操作结束任务会终止网关及其后代。更新较旧的安装后，如果更新未刷新启动器，请运行 `openclaw gateway install --force` 以重新生成启动器。

对于 pnpm 全局安装，新启动器使用经过验证的稳定 `node_modules/openclaw` 链接，因此包替换不会使它们失效。如果较旧的启动程序已指向已删除的软件包生成，请从当前安装运行 `openclaw gateway install --force` 以重写 `gateway.cmd`。如果没有 `--force`，注册的任务可以保持不变。

重新安装托管计划任务会在发布和开始替换之前停止并解决其先前的进程。当两个安装都使用 Node 或仅服务参数更改时，这也适用。状态根据注册的命令验证正在运行的进程；具有相同任务名称和端口的旧进程并不能证明替换进程正在运行。

安装保留现有的服务锁和运行时引脚检查。更改的任务或启动器会阻止替换。普通安装失败会在仍然可以验证所有权的情况下使用服务所有者的现有恢复来恢复以前的定义和运行策略。在更新期间，更新程序保留恢复所有权。如果无法确认恢复，请在重试之前检查报告的任务计划程序状态。

状态报告有效任务工作目录，同时根据生成的启动器检查运行时意图。标准无人值守任务目录不会使未更改的运行时引脚失效。检查不会重新安装服务或重写其引脚；自定义任务目录仍然是操作员拥有的覆盖。

网关状态和 Doctor 读取计划任务的数字当前状态，与 Windows 显示语言或控制台代码页无关。之前的任务退出结果并不能证明它现在是否正在运行。排队或未知的任务不算作 Doctor 维护的安全停止。通过其服务所有者停止排队任务；如果无法访问检查，请在重试之前恢复任务计划程序检查权限。

严格的维护检查遵循任务的注册 CMD 或 VBS 启动程序，或使用文字参数直接注册的可执行文件，并在使用结果之前重新检查其捕获的定义。运行时检查使用注册的命令而不是默认启动器。直接可执行文件检查不会授予重写可执行文件或其任务定义的所有权。自动更新服务管理仍然将这些自定义操作报告为不可用，并保持它们不变，因为它无法恢复托管启动器；环境扩张和模棱两可的论点引用仍然无法检查。深度发现从可执行文件或启动器证据中识别 OpenClaw 和遗留帮助程序；不相关任务的显示名称本身并不能识别服务。仅当注册操作是现代网关时，标准和选定的任务名称才会抑制额外服务结果；旧版和 Node 操作仍然可见。医生报告不完整的检查与符合现有清理条件的服务分开。

`openclaw gateway status --deep` 和 `openclaw doctor --deep` 报告当前帐户的启动文件夹中的同级配置文件。如果其计划任务不存在，则选定的现代网关回退将从额外服务列表中省略。即使任务具有相同的名称，每个启动文件仍然是单独的服务定义。检查遵循该确切文件及其捕获的网关脚本。完整的清单保留了无法读取或格式错误的网关启动器的错误；医生和状态列表仅成功检查了额外服务。启动检查提示使用确切的文件路径，并且不授予任务计划程序对其的控制权。本地构建还会使用该安装的 `dist` 检查正在运行的网关的这些定义。在重建其文件之前停止匹配的网关。

Doctor 和深层状态为额外计划任务（包括 Node 主机）提供只读 `schtasks /Query` 提示。 Discovery 在库存查询、启动目录扫描和启动器检查方面共享一个 60 秒的预算。如果过期，已完成的发现仍然可用，并且医生报告无法检查某些服务。在通过服务所有者选择删除之前，请检查注册的命令和用途。

Doctor 在自有服务刷新期间识别出 2026.9.3 附带的正在等待的 VBS 启动器。自定义启动器行为仍然保留现有定义。

Doctor 使用任务计划程序的默认值来比较任务定义。省略的 `Enabled` 元素意味着任务及其登录触发器都是 `true`，因此 XML 导出差异不会导致漂移警告或刷新验证失败。仍会报告显式禁用的任务和触发器。

任务检查允许 Windows PowerShell 继承或创建控制台，因为某些 PowerShell 5.1 主机在禁用控制台创建时无法检查。从没有控制台的应用程序调用它可以短暂显示控制台窗口。如果没有明确的调用者截止时间，则每次检查最多允许 PowerShell 的冷启动时间为 60 秒。注册检查使用相同的本机检查，并与任何启动文件夹检查共享其预算。明确的检查预算取代了默认津贴。直接生命周期命令保留其现有限制。拒绝访问和超时结果仍然是检查失败，而不是任务不存在的证据。如果检查失败，医生和更新拒绝包括基础检查详细信息；空响应标识退出代码并报告 PowerShell 未产生输出。

在先前的网关准备情况验证期间，每个计划任务运行时检查最多允许五秒，或更短的剩余预算。其他服务检查会保留调用者的预算，包括用于验证运行时重建是否安全的较长余量。

在更新预检期间，计划任务检查使用更新的 `--timeout` 预算。注册或运行时超时会重试一次完整的严格检查。如果检查仍然不可用，更新会报告强制预算和检查详细信息，保留记录的服务定义，并跳过自动服务重启。使用 `openclaw gateway status --deep` 检查服务，然后在更新后手动重新启动它。准入后失去经过验证的所有权会阻止服务突变。

网关启动通过 Windows API 创建私有 SQLite 暂存目录，无需编译 C# 或启动 PowerShell 以获得其权限。所有者 SYSTEM 和管理员保留完全访问权限；其他继承的访问权限在创建时被删除。更新重启帮助程序还可以避免运行时 C# 编译和 `Invoke-Expression`。如果防病毒软件仍然中断启动，请在报告中包含其检测名称和 `openclaw gateway status --json` 的输出。

安装 Gateway 服务：

```powershell
openclaw gateway install
openclaw gateway status --json
```

对于 CLI- 仅在没有托管网关服务的情况下使用：

```powershell
openclaw onboard --non-interactive --accept-risk --skip-health
openclaw gateway run
```

### <a id="updating-from-2026.9.4"></a><a id="updating-from-2026-9-4"></a> 从 2026.9.4 更新

已发布的 2026.9.4 Windows 更新程序在其服务切换中保留了旧的数据库读取器。将共享状态迁移到架构 17 之外的目标可能会导致回调在激活后失败。在运行 9.4 更新期间，候选程序包生命周期会要求 Doctor 的只读预检拒绝此迁移，而更新程序驱动程序尚未确认停止。在旧更新程序进入修复之前，失败的 npm 阶段会将原始包和网关保留在原位。当跳过包脚本时，CLI 预检也会保留此检查；稍后的拒绝可以通过旧修复路径中的清理错误来掩盖。此遏制不会完成自动更新。

等待更新程序退出并查看其结果。要升级，请创建 [ 已验证的备份 ](/install/updating/rollback-and-recovery#before-updating-create-a-verified-backup) 并从独立 shell 使用现有的 [ 手动包管理器过程 ](/install/updating/update-methods#alternative-manual-npm-pnpm-or-bun)。保留原始服务帐户、包前缀、配置文件和 state/config 覆盖。在替换软件包之前通过其所有者停止网关，运行新安装的Doctor，然后启动并验证网关。不要降低架构标记或针对迁移的数据运行旧版本。

## <a id="wsl2-gateway"></a> WSL2 网关

WSL2 仍然是 Windows 上最兼容 Linux- 的网关运行时。 Windows Hub 可以为您设置应用程序拥有的 WSL 网关，或在您自己的发行版中手动安装。

手动设置：

```powershell
wsl --install
# Or pick a distro explicitly:
wsl --list --online
wsl --install -d Ubuntu-24.04
```

在WSL内部启用systemd：

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

然后使用 Linux 快速入门在 WSL 中安装 OpenClaw：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw gateway status
```

## <a id="gateway-auto-start-before-windows-login"></a> 在 Windows 登录前自动启动 Gateway

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

## <a id="expose-wsl-services-over-lan"></a> 通过 LAN 暴露 WSL 服务

WSL 拥有自己的虚拟网络。如果另一台机器需要访问 WSL 内的服务，请将 Windows 的端口转发到 WSL 的当前 IP。WSL 的 IP 可能会在重启后发生变化，因此请在必要时更新端口转发规则。

以管理员身份运行的 PowerShell 示例：

```powershell
$Distro = "Ubuntu-24.04"
$ListenPort = 2222
$TargetPort = 22

$WslIp = (wsl -d $Distro -- hostname -I).Trim().Split(" ")[0]
if (-not $WslIp) { throw "WSL IP not found." }

netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$ListenPort `
  connectaddress=$WslIp connectport=$TargetPort

New-NetFirewallRule -DisplayName "WSL SSH $ListenPort" -Direction Inbound `
  -Protocol TCP -LocalPort $ListenPort -Action Allow
```

注意：

- 来自另一台计算机的 SSH 目标为 Windows 主机 IP、e.g. `ssh user@windows-host -p 2222`。
- 远程节点必须指向可访问的 Gateway URL，而不是 `127.0.0.1`。
- 通过 LAN 访问时使用 `listenaddress=0.0.0.0`；仅本地访问时使用 `127.0.0.1`。

## <a id="troubleshooting"></a> 故障排查

### <a id="the-gateway-scheduled-task-is-disabled"></a> 网关定时任务被禁用

`openclaw gateway status` 和 Doctor 命名已注册但 **DISABLED** 任务并显示恢复命令。运行 `openclaw gateway start` 或 `openclaw doctor --fix` 以重新启用并启动受管网关。使用与安装相同的配置文件和 state/config 覆盖。 Recovery 在启用之前会验证已注册的启动器和任务所有权；外来的或无法验证的任务保持不变并附有解释。禁用的任务在登录或重新启动后无法自动启动，直到重新启用为止。

### <a id="the-scheduled-task-stops-before-the-gateway-is-ready"></a> 计划任务在网关准备好之前停止

运行`openclaw gateway status --json`，然后检查本地[Gateway日志](/gateway/logging)。 `gateway/task-supervisor` 中的条目记录了子退出代码、信号和 stderr 的最后 8,192 个字符，包括网关日志记录开始之前的故障。子标准输出被丢弃。失败的孩子或主管退出非零；有意的干净停止仍为零。仅成功的任务结果并不能证明网关是健康的。

任务计划程序的 [`RestartOnFailure` 策略](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-tsch/2ff4aa5a-7bc4-449f-bbb1-27475645867f) 重试失败的启动条件或操作启动。不要依赖它来重新启动成功启动然后因错误（例如端口被占用）而退出的网关。修复记录的原因，然后运行 ​​`openclaw gateway start`。

### <a id="the-tray-icon-does-not-appear"></a> 托盘图标未出现

检查任务管理器中是否有 `OpenClaw.Tray.WinUI.exe`。如果它正在运行，请打开隐藏的托盘图标区域并将其固定。如果没有运行，请从开始菜单启动 **OpenClaw Companion**。

### <a id="local-setup-fails"></a> 本地设置失败

从 Windows Hub 打开设置日志，或查看：

```powershell
notepad "$env:LOCALAPPDATA\OpenClawTray\Logs\Setup\easy-setup-latest.txt"
```

常见原因：已禁用 WSL、虚拟化被阻止、应用拥有的 WSL 状态残留，或在安装 Gateway 包时发生网络故障。

### <a id="the-app-says-pairing-is-required"></a> 应用提示需要配对

从 Gateway 批准操作者或节点请求：

```powershell
openclaw devices list
openclaw devices approve <requestId>
```

如果设备已经有 token，请在批准后从 Connections 选项卡重新连接。

对于节点请求，请在 [Windows 节点模式 ](#windows-node-mode) 中完成单独的命令面批准：重新启动暂停的节点模式，然后运行 ​​`openclaw nodes pending` 并批准其独特的节点请求 ID。仅运营商设备批准并不能完成该节点流程。

### <a id="web-chat-cannot-reach-a-remote-gateway"></a> Web chat 无法连接到远程 Gateway

远程 web chat 需要 HTTPS 或 localhost。对于自签名证书，请在 Windows 中信任该证书，或者使用 SSH 隧道连接到 localhost URL。

### <a id="screen.snapshot%2C-camera%2C-or-audio-commands-fail"></a><a id="screen-snapshot-camera-or-audio-commands-fail"></a> `screen.snapshot`、摄像头或音频命令失败

确认 Windows 对摄像头、麦克风、屏幕捕获和通知的权限。打包安装会声明这些受保护的能力，但 Windows 在命令首次使用它们时仍可能提示。

### <a id="git-or-github-connectivity-fails"></a> Git 或 GitHub 连接失败

某些网络会阻止或限制 HTTPS 至 GitHub。如果 `git clone` 或 `gh auth login` 失败，请尝试另一个网络、VPN 或 HTTP/HTTPS 代理。

当前会话中基于 token 的 `gh` 认证：

```powershell
$env:GH_TOKEN="<your-token>"
gh auth status
gh auth setup-git
```

切勿提交 token，也不要将其粘贴到 issue 或 pull request 中。

## <a id="related"></a> 相关内容

- [安装概览](/install)
- [Node.js 设置](/install/node)
- [节点](/nodes)
- [控制 UI](/web/control-ui)
- [网关配置](/gateway/configuration)
