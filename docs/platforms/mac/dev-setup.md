---
summary: "为正在开发 OpenClaw macOS 应用的开发者提供的设置指南"
read_when:
  - 配置 macOS 开发环境时
title: "macOS 开发设置"
---

# macOS 开发者设置

从源代码构建并运行 OpenClaw macOS 应用。

## 先决条件

在构建应用之前，请确保已安装以下内容：

1. **Xcode 26.2+**: Swift 开发所必需。
2. **Node.js 24 & pnpm**: 推荐用于 gateway、CLI 和打包脚本。当前仍支持 Node 22 LTS，即 `22.16+`，以保证兼容性。

## 1. 安装依赖

安装项目范围内的依赖：

```bash
pnpm install
```

## 2. 构建并打包应用

要构建 macOS 应用并将其打包到 `dist/OpenClaw.app`，请运行：

```bash
./scripts/package-mac-app.sh
```

如果你没有 Apple Developer ID 证书，脚本将自动使用 **ad-hoc 签名**（`-`）。

有关开发运行模式、签名标志和 Team ID 排查，请参阅 macOS 应用 README：
[https://github.com/openclaw/openclaw/blob/main/apps/macos/README.md](https://github.com/openclaw/openclaw/blob/main/apps/macos/README.md)

> **注意**：ad-hoc 签名的应用可能会触发安全提示。如果应用立即崩溃并显示“Abort trap 6”，请参阅 [故障排查](#troubleshooting) 部分。

## 3. 安装 CLI

macOS 应用需要全局安装 `openclaw` CLI 来管理后台任务。

**安装方法（推荐）：**

1. 打开 OpenClaw 应用。
2. 进入 **General** 设置选项卡。
3. 点击 **"Install CLI"**。

也可以手动安装：

```bash
npm install -g openclaw@<version>
```

`pnpm add -g openclaw@<version>` 和 `bun add -g openclaw@<version>` 也可以。
对于 Gateway 运行时，Node 仍然是推荐路径。

## 故障排查

### 构建失败：工具链或 SDK 不匹配

macOS 应用构建需要最新的 macOS SDK 和 Swift 6.2 工具链。

**系统依赖（必需）：**

- **软件更新中可用的最新 macOS 版本**（Xcode 26.2 SDK 需要）
- **Xcode 26.2**（Swift 6.2 工具链）

**检查：**

```bash
xcodebuild -version
xcrun swift --version
```

如果版本不匹配，请更新 macOS/Xcode 后重新运行构建。

### 授权后应用崩溃

如果你在允许 **Speech Recognition** 或 **Microphone** 访问时应用崩溃，可能是由于损坏的 TCC 缓存或签名不匹配导致的。

**修复：**

1. 重置 TCC 权限：

   ```bash
   tccutil reset All ai.openclaw.mac.debug
   ```

2. 如果仍然失败，请在 [`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) 中临时更改 `BUNDLE_ID`，以强制 macOS 重新创建“干净状态”。

### Gateway 一直显示“Starting...”

如果 gateway 状态一直停留在“Starting...”，请检查是否有僵尸进程占用了端口：

```bash
openclaw gateway status
openclaw gateway stop

# 如果你没有使用 LaunchAgent（开发模式 / 手动运行），请查找监听进程：
lsof -nP -iTCP:18789 -sTCP:LISTEN
```

如果是手动运行占用了端口，请停止该进程（Ctrl+C）。作为最后手段，杀掉上面找到的 PID。

## 相关内容

- [macOS app](/platforms/macos)
- [安装概览](/install)
