---
summary: "使用 Nix 声明式安装 OpenClaw"
read_when:
  - 你希望安装过程可复现、可回滚
  - 你已经在使用 Nix/NixOS/Home Manager
  - 你希望所有内容都被固定版本并以声明式方式管理
title: "Nix"
---

使用 **[nix-openclaw](https://github.com/openclaw/nix-openclaw)** 声明式安装 OpenClaw —— 一个开箱即用的 Home Manager 模块。

<Info>
[nix-openclaw](https://github.com/openclaw/nix-openclaw) 仓库是 Nix 安装的唯一事实来源。本页仅作快速概览。
</Info>

## 你将获得什么

- Gateway + macOS 应用 + 工具（whisper、spotify、cameras）——全部已固定版本
- 可在重启后继续运行的 launchd 服务
- 具有声明式配置的插件系统
- 立即回滚：`home-manager switch --rollback`

## 快速开始

<Steps>
  <Step title="安装 Determinate Nix">
    如果尚未安装 Nix，请按照 [Determinate Nix installer](https://github.com/DeterminateSystems/nix-installer) 的说明进行操作。
  </Step>
  <Step title="创建本地 flake">
    使用 nix-openclaw 仓库中的 agent-first 模板：
    ```bash
    mkdir -p ~/code/openclaw-local
    # 从 nix-openclaw 仓库复制 templates/agent-first/flake.nix
    ```
  </Step>
  <Step title="配置密钥">
    配置你的消息机器人令牌和模型提供商 API 密钥。放在 `~/.secrets/` 下的普通文件也可以正常使用。
  </Step>
  <Step title="填入模板占位符并切换">
    ```bash
    home-manager switch
    ```
  </Step>
  <Step title="验证">
    确认 launchd 服务正在运行，并且你的机器人可以响应消息。
  </Step>
</Steps>

有关完整的模块选项和示例，请参阅 [nix-openclaw README](https://github.com/openclaw/nix-openclaw)。

## Nix 模式运行时行为

当设置 `OPENCLAW_NIX_MODE=1` 时（nix-openclaw 会自动设置），OpenClaw 会进入一种确定性模式，从而禁用自动安装流程。

你也可以手动设置：

```bash
export OPENCLAW_NIX_MODE=1
```

在 macOS 上，GUI 应用不会自动继承 shell 环境变量。请改为通过 defaults 启用 Nix 模式：

```bash
defaults write ai.openclaw.mac openclaw.nixMode -bool true
```

### Nix 模式下会有什么变化

- 自动安装和自我修改流程被禁用
- 缺失的依赖会显示 Nix 专用的修复消息
- UI 会显示只读的 Nix 模式横幅

### 配置和状态路径

OpenClaw 会从 `OPENCLAW_CONFIG_PATH` 读取 JSON5 配置，并将可变数据存储在 `OPENCLAW_STATE_DIR` 中。在 Nix 下运行时，请将这些路径显式设置为由 Nix 管理的位置，以便运行时状态和配置都不会进入不可变的 store。

| Variable               | Default                                 |
| ---------------------- | --------------------------------------- |
| `OPENCLAW_HOME`        | `HOME` / `USERPROFILE` / `os.homedir()` |
| `OPENCLAW_STATE_DIR`   | `~/.openclaw`                           |
| `OPENCLAW_CONFIG_PATH` | `$OPENCLAW_STATE_DIR/openclaw.json`     |

### 服务 PATH 发现

launchd/systemd 网关服务会自动发现 Nix-profile 二进制文件，因此通过 shell 调用 `nix` 安装的可执行文件的插件和工具无需手动设置 PATH：

- 当设置了 `NIX_PROFILES` 时，其中的每个条目都会按从右到左的优先级添加到服务 PATH 中（与 Nix shell 的优先级一致——最右侧优先）。
- 当未设置 `NIX_PROFILES` 时，会添加 `~/.nix-profile/bin` 作为后备。

这同时适用于 macOS 的 launchd 和 Linux 的 systemd 服务环境。

## 相关内容

- [nix-openclaw](https://github.com/openclaw/nix-openclaw) —— 完整设置指南
- [Wizard](/start/wizard) —— 非 Nix 的 CLI 设置
- [Docker](/install/docker) —— 容器化设置
