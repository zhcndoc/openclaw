---
summary: "平台支持概览（Gateway + 配套应用）"
read_when:
  - 查找操作系统支持或安装路径
  - 决定在哪里运行 Gateway
title: "平台"
---

OpenClaw 核心采用 TypeScript 编写。**推荐使用 Node 作为运行时**。
不建议在 Gateway 中使用 Bun——WhatsApp 和 Telegram 通道存在已知问题；详情请参见 [Bun（实验性）](/install/bun)。

配套应用适用于 macOS（菜单栏应用）和移动节点（iOS/Android）。Windows 和
Linux 的配套应用正在规划中，但 Gateway 目前已完全支持。
Windows 的原生配套应用也在规划中；推荐通过 WSL2 使用 Gateway。

## 选择你的操作系统

- macOS: [macOS](/platforms/macos)
- iOS: [iOS](/platforms/ios)
- Android: [Android](/platforms/android)
- Windows: [Windows](/platforms/windows)
- Linux: [Linux](/platforms/linux)

## VPS 和托管

- VPS 中心: [VPS 托管](/vps)
- Fly.io: [Fly.io](/install/fly)
- Hetzner (Docker): [Hetzner](/install/hetzner)
- GCP (Compute Engine): [GCP](/install/gcp)
- Azure (Linux VM): [Azure](/install/azure)
- exe.dev (VM + HTTPS proxy): [exe.dev](/install/exe-dev)
- EasyRunner (Podman + Caddy): [EasyRunner](/platforms/easyrunner)

## 常用链接

- 安装指南: [快速开始](/start/getting-started)
- Gateway 运行手册: [Gateway](/gateway)
- Gateway 配置: [配置](/gateway/configuration)
- 服务状态: `openclaw gateway status`

## Gateway 服务安装（CLI）

使用以下任一方式（均受支持）：

- 向导（推荐）: `openclaw onboard --install-daemon`
- 直接安装: `openclaw gateway install`
- 配置流程: `openclaw configure` → 选择 **Gateway service**
- 修复/迁移: `openclaw doctor`（会提示安装或修复该服务）

服务目标取决于操作系统：

- macOS: LaunchAgent (`ai.openclaw.gateway` or `ai.openclaw.<profile>`; legacy `com.openclaw.*`)
- Linux/WSL2: systemd 用户服务 (`openclaw-gateway[-<profile>].service`)
- 原生 Windows: 计划任务 (`OpenClaw Gateway` or `OpenClaw Gateway (<profile>)`)，如果任务创建被拒绝，则回退为每用户 Startup-folder 登录项

## 相关内容

- [安装概览](/install)
- [macOS 应用](/platforms/macos)
- [iOS 应用](/platforms/ios)
