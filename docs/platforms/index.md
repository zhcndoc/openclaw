---
summary: "平台支持概览（网关 + 伴侣应用）"
read_when:
  - 查找操作系统支持或安装路径
  - 决定网关运行位置
title: "平台"
---

# 平台

OpenClaw 核心由 TypeScript 编写。**推荐使用 Node 作为运行时**。
不建议在网关中使用 Bun（WhatsApp/Telegram 存在 BUG）。

伴侣应用存在于 macOS（菜单栏应用）和移动节点（iOS/Android）。计划发布 Windows 和 Linux 伴侣应用，但网关目前已完全支持。
Windows 的原生伴侣应用也在规划中；通过 WSL2 推荐使用网关。

## 选择你的操作系统

- macOS: [macOS](/platforms/macos)
- iOS: [iOS](/platforms/ios)
- Android: [Android](/platforms/android)
- Windows: [Windows](/platforms/windows)
- Linux: [Linux](/platforms/linux)

## VPS 与托管

- VPS 集线器: [VPS 托管](/vps)
- Fly.io: [Fly.io](/install/fly)
- Hetzner (Docker): [Hetzner](/install/hetzner)
- GCP (Compute Engine): [GCP](/install/gcp)
- Azure (Linux VM): [Azure](/install/azure)
- exe.dev (VM + HTTPS proxy): [exe.dev](/install/exe-dev)

## 常用链接

- 安装指南: [入门指南](/start/getting-started)
- 网关操作手册: [网关](/gateway)
- 网关配置: [配置](/gateway/configuration)
- 服务状态: `openclaw gateway status`

## 网关服务安装（命令行）

使用以下任意一种方式（均支持）：

- 向导（推荐）：`openclaw onboard --install-daemon`
- 直接安装：`openclaw gateway install`
- 配置流程：`openclaw configure` → 选择 **网关服务**
- 修复/迁移：`openclaw doctor`（提供安装或修复服务选项）

服务目标根据操作系统不同：

- macOS: LaunchAgent（`ai.openclaw.gateway` 或 `ai.openclaw.<profile>`；旧版为 `com.openclaw.*`）
- Linux/WSL2: systemd 用户服务（`openclaw-gateway[-<profile>].service`）
