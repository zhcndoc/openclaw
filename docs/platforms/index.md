---
summary: "平台支持概览（Gateway + 配套应用）"
read_when:
  - "寻找 OS 支持或安装路径"
  - "决定在哪里运行 Gateway"
title: "平台"
---

OpenClaw内核是用TypeScript编写的。 **Node 是主要的、默认的和推荐的运行时**。 Bun 1.4.3+ 使用 WAL- 重置安全构建 `node:sqlite` 可以作为显式选择运行 CLI、网关和受管节点主机；参见 [Bun](/install/bun)。

Linux、Windows Hub、macOS（菜单栏应用程序）和移动节点 （iOS/Android） 都有配套应用程序。在 Windows 上，推荐使用本机 [Windows Hub](/platforms/windows#recommended-windows-hub) 桌面应用程序；跨平台 [Tauri 应用程序 ](/platforms/windows#backup-tauri-desktop-app) 是备份。选择本机 PowerShell 安装以供终端优先使用，或选择 WSL2 以实现与 Linux- 最兼容的网关运行时。

## <a id="choose-your-os"></a> 选择您的OS

- Android：[Android](/platforms/android)
- ChromeOS：[ChromeOS （Crostini）](/platforms/chromeos)
- iOS：[iOS](/platforms/ios)
- Linux：[Linux](/platforms/linux)
- macOS： [macOS](/platforms/macos)
- Omarchy：[Omarchy](/platforms/omarchy)
- Windows：[Windows](/platforms/windows)

## <a id="vps-and-hosting"></a> VPS 和托管

- VPS 中心：[VPS 托管](/vps)
- Azure （Linux VM）： [Azure](/install/azure)
- Daytona（云沙箱）：[Daytona](/install/daytona)
- EasyRunner（Podman + 球童）：[EasyRunner](/platforms/easyrunner)
- exe.dev（VM + HTTPS 代理）：[exe.dev](/install/exe-dev)
- Fly.io: [Fly.io](/install/fly)
- GCP（计算引擎）：[GCP](/install/gcp)
- Hetzner （Docker）： [Hetzner](/install/hetzner)

## <a id="common-links"></a> 常用链接

- 安装指南：[获取Started](/start/getting-started)
- Windows 集线器：[Windows](/platforms/windows)
- Gateway 运行手册: [Gateway](/gateway)
- 网关配置：[配置](/gateway/configuration)
- 服务状态: `openclaw gateway status`

## <a id="gateway-service-install-(cli)"></a><a id="gateway-service-install-cli"></a> Gateway 服务安装（CLI）

使用以下任一方式（均受支持）：

- 向导（推荐）: `openclaw onboard --install-daemon`
- 直接安装: `openclaw gateway install`
- 配置流程: `openclaw configure` → 选择 **Gateway 服务**
- Repair/migrate：`openclaw doctor`（提供安装或修复服务）

服务目标取决于OS：

- macOS: LaunchAgent (`ai.openclaw.gateway`，或命名配置文件使用 `ai.openclaw.<profile>`)
- Linux/WSL2: systemd 用户服务 (`openclaw-gateway[-<profile>].service`)
- 原生 Windows: 计划任务 (`OpenClaw Gateway` 或 `OpenClaw Gateway (<profile>)`)，如果任务创建被拒绝，则回退为按用户的 Startup-folder 登录项。

## <a id="related"></a> 相关内容

- [安装概览](/install)
- [Windows Hub](/platforms/windows)
- [macOS 应用](/platforms/macos)
- [iOS 应用](/platforms/ios)
