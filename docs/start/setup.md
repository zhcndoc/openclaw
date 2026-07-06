---
summary: "OpenClaw 的高级设置和开发工作流"
read_when:
  - 设置新机器
  - 你想要“最新 + 最强大”而不破坏你个人设置
title: "设置"
---

<Note>
如果你是第一次设置，请先从 [快速开始](/start/getting-started) 开始。
有关入门详情，请参阅 [入门（CLI）](/start/wizard)。
</Note>

## TL;DR

根据你希望更新的频率以及是否想自己运行 Gateway，选择一种设置工作流：

- **定制化存在于仓库之外：** 将你的配置和工作区保存在 `~/.openclaw/openclaw.json` 和 `~/.openclaw/workspace/` 中，这样仓库更新就不会影响它们。
- **稳定工作流（推荐给大多数人）：** 安装 macOS 应用并让它运行内置的 Gateway。
- **前沿工作流（开发）：** 通过 `pnpm gateway:watch` 自己运行 Gateway，然后让 macOS 应用以本地模式连接。

## 前置条件（从源码）

- 推荐使用 Node 24（仍支持 Node 22 LTS，目前为 `22.19+`）
- 从源码检出时需要 `pnpm`。OpenClaw 在开发模式下会从 `extensions/*` pnpm workspace 包中加载捆绑插件，因此根目录的 `npm install` 不会准备完整的源码树。
- Docker（可选；仅用于容器化设置/e2e - 见 [Docker](/install/docker)）

## 定制化策略（让更新不会伤到你）

如果你想要“完全按我的需求定制”，同时又希望轻松更新，请将你的定制内容保存在：

- **配置：** `~/.openclaw/openclaw.json`（JSON/JSON5 风格）
- **工作区：** `~/.openclaw/workspace`（技能、提示词、记忆；建议将其设为私有 git 仓库）

首次初始化 config/workspace 文件夹，而不运行完整的 onboarding 向导：

```bash
openclaw setup --baseline
```

还没有全局安装？那就从这个仓库中运行：

```bash
pnpm openclaw setup --baseline
```

（不带 `--baseline` 的 `openclaw setup` 是 `openclaw onboard` 的别名，会运行完整的交互式向导。）

## 从本仓库运行 Gateway

在 `pnpm build` 之后，你可以直接运行打包好的 CLI：

```bash
node openclaw.mjs gateway --port 18789 --verbose
```

## 稳定工作流（优先使用 macOS 应用）

1. 安装并启动 **OpenClaw.app**（菜单栏应用）。
2. 完成入门/权限检查清单（TCC 提示）。
3. 确保 Gateway 处于 **本地** 且正在运行（由应用管理它）。
4. 连接各个渠道（示例：WhatsApp）：

```bash
openclaw channels login
```

5. 健康检查：

```bash
openclaw health
```

如果你的构建版本中没有入门流程：

- 运行 `openclaw setup`，然后运行 `openclaw channels login`，最后手动启动 Gateway（`openclaw gateway`）。

## 前沿工作流（在终端中运行 Gateway）

目标：开发 TypeScript Gateway，获得热重载，同时保持 macOS 应用 UI 连接。

### 0)（可选）也从源码运行 macOS 应用

如果你也想让 macOS 应用走前沿版本：

```bash
./scripts/restart-mac.sh
```

### 1) 启动开发版 Gateway

```bash
pnpm install
# 仅首次运行（或在重置本地 OpenClaw 配置/工作区之后）
pnpm openclaw setup
pnpm gateway:watch
```

`gateway:watch` 会在一个命名的 tmux 会话（`openclaw-gateway-watch-main`）中启动或重启 Gateway 监视进程，并在交互式终端中自动附加。非交互式 shell 会保持分离状态，并输出
`tmux attach -t openclaw-gateway-watch-main`；使用
`OPENCLAW_GATEWAY_WATCH_ATTACH=0 pnpm gateway:watch` 可让交互式运行保持分离，或使用 `pnpm gateway:watch:raw` 进入前台监视模式。监视器会在相关源码、配置和捆绑插件元数据变更时重新加载。如果被监视的 Gateway 在启动期间退出，`gateway:watch` 会先运行一次
`openclaw doctor --fix --non-interactive`，然后重试；设置
`OPENCLAW_GATEWAY_WATCH_AUTO_DOCTOR=0` 可禁用这一步仅用于开发的修复流程。
`pnpm gateway:watch` 不会重建 `dist/control-ui`，因此在 `ui/` 变更后请重新运行 `pnpm ui:build`，或者在开发 Control UI 时使用 `pnpm ui:dev`。

### 2) 将 macOS 应用指向你正在运行的 Gateway

在 **OpenClaw.app** 中：

- Connection Mode: **本地**
  应用将连接到已在配置端口上运行的 gateway。

### 3) 验证

- 应用内的 Gateway 状态应显示 **"使用现有 gateway …"**
- 或通过 CLI：

```bash
openclaw health
```

### 常见坑

- **端口错误：** Gateway WS 默认是 `ws://127.0.0.1:18789`；让应用和 CLI 使用相同端口。
- **状态存放位置：**
  - 渠道/提供者状态：`~/.openclaw/credentials/`
  - 模型认证配置文件：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
  - 会话：`~/.openclaw/agents/<agentId>/sessions/`
  - 日志：`/tmp/openclaw/`

## 凭据存储映射

调试认证或决定要备份哪些内容时可参考这里：

- **WhatsApp**：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram bot token**：配置/env 或 `channels.telegram.tokenFile`（仅支持普通文件；拒绝符号链接）
- **Discord bot token**：配置/env 或 SecretRef（env/file/exec 提供器）
- **Slack tokens**：配置/env（`channels.slack.*`）
- **配对允许名单：**
  - `~/.openclaw/credentials/<channel>-allowFrom.json`（默认账户）
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json`（非默认账户）
- **模型认证配置文件**：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **文件后备的密钥载荷（可选）**：`~/.openclaw/secrets.json`
- **旧版 OAuth 导入**：`~/.openclaw/credentials/oauth.json`
  更多细节：[安全](/gateway/security#credential-storage-map)。

## 更新（不破坏你的设置）

- 将 `~/.openclaw/workspace` 和 `~/.openclaw/` 视为“你的内容”；不要把个人提示词/配置放进 `openclaw` 仓库。
- 更新源码：`git pull` + `pnpm install` + 继续使用 `pnpm gateway:watch`。

## Linux（systemd 用户服务）

Linux 安装使用 systemd **用户** 服务。默认情况下，systemd 会在注销/空闲时停止用户服务，这会杀死 Gateway。入门流程会尝试为你启用 lingering（可能会提示输入 sudo）。如果仍然未启用，请运行：

```bash
sudo loginctl enable-linger $USER
```

对于始终在线或多用户服务器，考虑使用 **系统** 服务而不是
用户服务（无需 lingering）。有关 systemd 说明，请参见 [Gateway 操作手册](/gateway)。

## 相关文档

- [Gateway 操作手册](/gateway)（标志、监管、端口）
- [Gateway 配置](/gateway/configuration)（配置 schema + 示例）
- [Discord](/channels/discord) 和 [Telegram](/channels/telegram)（回复标签 + replyToMode 设置）
- [OpenClaw 助手设置](/start/openclaw)
- [macOS 应用](/platforms/macos)（gateway 生命周期）
