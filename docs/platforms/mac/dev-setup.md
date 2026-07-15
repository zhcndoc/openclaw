---
summary: "为正在开发 OpenClaw macOS 应用的开发者提供的设置指南"
read_when:
  - 配置 macOS 开发环境时
title: "macOS 开发设置"
---

# macOS 开发者设置

从源代码构建并运行 OpenClaw macOS 应用。

## 先决条件

- **Xcode 26.2+**（Swift 6.2 工具链），在 Software Update 中可用的最新 macOS 上。
- **Node.js 24.15+ 和 pnpm**，用于网关、CLI 和打包脚本。Node 22.22.3+ 也可以。

## 1. 安装依赖

```bash
pnpm install
```

## 2. 构建并打包应用

```bash
./scripts/package-mac-app.sh
```

输出 `dist/OpenClaw.app`。如果没有 Apple Developer ID 证书，
脚本会回退到临时签名。

有关开发运行模式、签名标志以及 Team ID 故障排查，请参见
[apps/macos/README.md](https://github.com/openclaw/openclaw/blob/main/apps/macos/README.md)。
从仓库根目录快速进行开发循环：`scripts/restart-mac.sh`（添加 `--no-sign` 可进行
临时签名；使用 `--no-sign` 时，TCC 权限不会保留）。

<Note>
临时签名的应用可能会触发安全提示。如果应用
立即崩溃并显示“Abort trap 6”，请参见[故障排查](#troubleshooting)。
</Note>

## 3. 安装 CLI 和 Gateway

打包后的应用内置了权威的 `scripts/install-cli.sh` 安装程序。在一个
全新的配置文件中，在引导过程中选择 **This Mac**；应用会先安装
匹配的用户空间 CLI 和运行时，然后再启动 Gateway 向导。

对于手动开发恢复，请自行安装匹配的 CLI：

```bash
npm install -g openclaw@<version>
```

`pnpm add -g openclaw@<version>` 和 `bun add -g openclaw@<version>` 也
可以使用。对于 Gateway 本身，仍然推荐使用 Node 运行时。

## 故障排查

### 构建失败：工具链或 SDK 不匹配

macOS 应用构建需要最新的 macOS SDK 和 Swift 6.2 工具链
（Xcode 26.2+）。

```bash
xcodebuild -version
xcrun swift --version
```

如果版本不匹配，请更新 macOS/Xcode 后重新运行构建。

### 授权后应用崩溃

如果你在尝试允许 **Speech Recognition** 或
**Microphone** 访问时应用崩溃，可能是 TCC 缓存损坏或签名不匹配。

1. 为调试 bundle id 重置 TCC 权限：

   ```bash
   tccutil reset All ai.openclaw.mac.debug
   ```

2. 如果仍然失败，临时修改
   [`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh)
   中的 `BUNDLE_ID`，以强制 macOS 创建一个全新的状态。

### Gateway 一直显示“Starting...”

检查是否有僵尸进程占用了该端口：

```bash
openclaw gateway status
openclaw gateway stop

# 如果你没有使用 LaunchAgent（开发模式 / 手动运行），请查找监听进程：
lsof -nP -iTCP:18789 -sTCP:LISTEN
```

如果是手动运行占用了端口，请停止它（Ctrl+C），或者最后手段是杀掉上面找到的 PID。

## 相关内容

- [macOS 应用](/platforms/macos)
- [安装概览](/install)
