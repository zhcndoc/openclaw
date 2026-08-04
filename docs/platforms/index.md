---
summary: "平台支持概览（Gateway + 配套应用）"
read_when:
  - 查找操作系统支持或安装路径
  - 决定在哪里运行 Gateway
title: "平台"
---

OpenClaw 核心使用 TypeScript 编写。**Node 是必需的运行时**，因为
规范状态存储使用 `node:sqlite`。Bun 仍可用于
依赖安装和包脚本；请参见 [Bun](/install/bun)。

Windows Hub、macOS（菜单栏应用）和移动节点（iOS/Android）都有配套应用。
Linux 配套应用在计划中，但 Gateway 目前已完全支持。在 Windows 上，桌面应用请选择 Windows Hub；若偏向终端优先，可使用原生 PowerShell 安装；或者使用 WSL2 以获得最兼容 Linux 的 Gateway 运行时。

## 选择你的操作系统

- macOS: [macOS](/platforms/macos)
- iOS: [iOS](/platforms/ios)
- Android: [Android](/platforms/android)
- Windows: [Windows](/platforms/windows)
- Linux: [Linux](/platforms/linux)

## VPS 和托管

- VPS 中心：[VPS 托管](/vps)
- Azure（Linux 虚拟机）：[Azure](/install/azure)
- Daytona（云沙箱）：[Daytona](/install/daytona)
- EasyRunner（Podman + Caddy）：[EasyRunner](/platforms/easyrunner)
- exe.dev（虚拟机 + HTTPS 代理）：[exe.dev](/install/exe-dev)
- Fly.io：[Fly.io](/install/fly)
- GCP（Compute Engine）：[GCP](/install/gcp)
- Hetzner（Docker）：[Hetzner](/install/hetzner)

## 常用链接

- 安装指南: [开始使用](/start/getting-started)
- Windows 中心: [Windows](/platforms/windows)
- Gateway 运行手册: [Gateway](/gateway)
- Gateway 配置: [配置](/gateway/configuration)
- 服务状态: `openclaw gateway status`

## Gateway 服务安装（CLI）

使用以下任一方式（均受支持）：

- 向导（推荐）: `openclaw onboard --install-daemon`
- 直接安装: `openclaw gateway install`
- 配置流程: `openclaw configure` → 选择 **Gateway 服务**
- 修复/迁移: `openclaw doctor`（会提示安装或修复该服务）

服务目标取决于操作系统：

- macOS: LaunchAgent (`ai.openclaw.gateway`，或命名配置文件使用 `ai.openclaw.<profile>`)
- Linux/WSL2: systemd 用户服务 (`openclaw-gateway[-<profile>].service`)
- 原生 Windows: 计划任务 (`OpenClaw Gateway` 或 `OpenClaw Gateway (<profile>)`)，如果任务创建被拒绝，则回退为按用户的 Startup-folder 登录项。

## 相关内容

- [安装概览](/install)
- [Windows Hub](/platforms/windows)
- [macOS 应用](/platforms/macos)
- [iOS 应用](/platforms/ios)
