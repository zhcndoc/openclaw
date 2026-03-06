---
summary: "使用 Nix 以声明式方式安装 OpenClaw"
read_when:
  - 你想要可复现、可回滚的安装
  - 你已经在使用 Nix/NixOS/Home Manager
  - 你想让所有内容都被固定并声明式管理
title: "Nix"
---

# Nix 安装

使用 Nix 运行 OpenClaw 的推荐方式是通过 **[nix-openclaw](https://github.com/openclaw/nix-openclaw)** —— 一个开箱即用的 Home Manager 模块。

## 快速开始

将以下内容粘贴给你的 AI 代理（Claude、Cursor 等）：

```text
我想在我的 Mac 上设置 nix-openclaw。
仓库地址：github:openclaw/nix-openclaw

我需要你做以下事情：
1. 检查是否安装了 Determinate Nix（如果没有，请安装）
2. 使用 templates/agent-first/flake.nix 在 ~/code/openclaw-local 创建本地 flake
3. 帮助我创建一个 Telegram 机器人（@BotFather）并获取我的聊天 ID（@userinfobot）
4. 设置密钥（机器人令牌，模型提供商 API 密钥）——保存在 ~/.secrets/ 的明文文件即可
5. 填写模板占位符并执行 home-manager switch
6. 验证：launchd 运行中，机器人能响应消息

参考 nix-openclaw README 查看模块选项。
```

> **📦 完整指南：[github.com/openclaw/nix-openclaw](https://github.com/openclaw/nix-openclaw)**
>
> nix-openclaw 仓库是 Nix 安装的权威来源，此页面仅为简要概览。

## 你将获得

- 网关 + macOS 应用 + 工具（whisper、spotify、摄像头）——全部已固定版本
- 支持重启后持续运行的 launchd 服务
- 支持声明式配置的插件系统
- 即时回滚：`home-manager switch --rollback`

---

## Nix 模式运行时行为

当设置了 `OPENCLAW_NIX_MODE=1`（nix-openclaw 自动设置）时：

OpenClaw 支持一种 **Nix 模式**，使配置变为确定性，并禁用自动安装流程。
你可以通过导出变量启用它：

```bash
OPENCLAW_NIX_MODE=1
```

在 macOS 上，GUI 应用不会自动继承 shell 环境变量。你也可以通过 defaults 启用 Nix 模式：

```bash
defaults write ai.openclaw.mac openclaw.nixMode -bool true
```

### 配置与状态路径

OpenClaw 从 `OPENCLAW_CONFIG_PATH` 读取 JSON5 配置，并在 `OPENCLAW_STATE_DIR` 存储可变数据。
必要时，你也可以设置 `OPENCLAW_HOME` 来控制用于内部路径解析的基础 home 目录。

- `OPENCLAW_HOME`（默认优先级：`HOME` / `USERPROFILE` / `os.homedir()`）
- `OPENCLAW_STATE_DIR`（默认：`~/.openclaw`）
- `OPENCLAW_CONFIG_PATH`（默认：`$OPENCLAW_STATE_DIR/openclaw.json`）

在 Nix 环境下运行时，请将它们显式设置为由 Nix 管理的位置，以确保运行时状态和配置
不会进入不可变存储区。

### Nix 模式下的运行时行为

- 禁用自动安装和自我变更流程
- 缺失依赖时显示与 Nix 相关的修复提示
- 界面显示只读的 Nix 模式横幅标识

## 打包说明（macOS）

macOS 的打包流程期望稳定的 Info.plist 模板文件位于：

```
apps/macos/Sources/OpenClaw/Resources/Info.plist
```

[`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) 会将此模板复制到应用包并替换动态字段
（包 ID、版本/构建号、Git SHA、Sparkle 密钥）。这样能保证 plist 对 SwiftPM
打包和 Nix 构建保持确定性（无需完整的 Xcode 工具链）。

## 相关资源

- [nix-openclaw](https://github.com/openclaw/nix-openclaw) — 完整安装指南
- [向导](/start/wizard) — 非 Nix 的命令行安装方式
- [Docker](/install/docker) — 容器化安装方案
