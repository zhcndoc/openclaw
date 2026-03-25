---
summary: "OpenClaw macOS 应用开发者的设置指南"
read_when:
  - 配置 macOS 开发环境时
title: "macOS 开发环境配置"
---

# macOS 开发者设置

本指南涵盖从源码构建和运行 OpenClaw macOS 应用所需的步骤。

## 前置条件

在构建应用之前，请确保已安装以下内容：

1. **Xcode 26.2+**：用于 Swift 开发。  
2. **Node.js 24+ 和 pnpm**：推荐用于网关、CLI 以及打包脚本。目前的 LTS 版本是 22（即 `22.16+`），仍然支持以保持兼容性。  

## 1. 安装依赖

安装项目依赖：

```bash
pnpm install
```

## 2. 构建并打包应用

运行以下命令以构建 macOS 应用并将其打包至 `dist/OpenClaw.app`：

```bash
./scripts/package-mac-app.sh
```

如果您没有 Apple Developer ID 证书，脚本会自动使用 **ad-hoc 签名**（`-`）。

有关开发运行模式、签名标志以及团队 ID 故障排查，请参阅 macOS 应用的 README：
[https://github.com/openclaw/openclaw/blob/main/apps/macos/README.md](https://github.com/openclaw/openclaw/blob/main/apps/macos/README.md)

> **注意**：ad-hoc 签名的应用可能会触发安全提示。如果应用启动后立即崩溃并显示“Abort trap 6”，请参阅[故障排查](#troubleshooting)部分。

## 3. 安装 CLI

macOS 应用需要全局安装 `openclaw` CLI 来管理后台任务。

**推荐安装步骤：**

1. 打开 OpenClaw 应用。
2. 进入 **General（常规）** 设置标签。
3. 点击 **“Install CLI（安装 CLI）”**。

您也可以手动安装：

```bash
npm install -g openclaw@<version>
```

## 故障排查

### 构建失败：工具链或 SDK 不匹配

macOS 应用构建期望使用最新的 macOS SDK 和 Swift 6.2 工具链。

**系统依赖（必需）：**

- **软件更新中提供的最新 macOS 版本**（Xcode 26.2 SDK 所需）
- **Xcode 26.2**（Swift 6.2 工具链）

**检查版本：**

```bash
xcodebuild -version
xcrun swift --version
```

如果版本不匹配，请更新 macOS 或 Xcode 后重新构建。

### 应用在授权权限时崩溃

如果尝试允许 **语音识别** 或 **麦克风** 权限时应用崩溃，可能是由于 TCC 缓存损坏或签名不匹配。

**解决方法：**

1. 重置 TCC 权限：

   ```bash
   tccutil reset All ai.openclaw.mac.debug
   ```

2. 若无效，可暂时修改 [`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) 中的 `BUNDLE_ID`，强制 macOS 清理权限缓存。

### 网关状态停留在“Starting...”

如果网关状态一直显示“Starting...”，请检查是否有僵尸进程占用端口：

```bash
openclaw gateway status
openclaw gateway stop

# If you're not using a LaunchAgent (dev mode / manual runs), find the listener:
lsof -nP -iTCP:18789 -sTCP:LISTEN
```

若是手动运行的进程占用该端口，请停止此进程（Ctrl+C）。最后手段可杀掉对应 PID。
