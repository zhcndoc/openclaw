---
summary: "OpenClaw 的高级设置和开发工作流"
read_when:
  - 配置新机器时
  - 想要“最新最强”且不破坏个人设置时
title: "设置"
---

# 设置

<Note>
如果你是第一次设置，请从 [Getting Started](/start/getting-started) 开始。
有关入职详情，请参阅 [Onboarding (CLI)](/start/wizard)。
</Note>

## TL;DR

- **个性化内容放在仓库外：** `~/.openclaw/workspace`（工作区）+ `~/.openclaw/openclaw.json`（配置）。
- **稳定工作流：** 安装 macOS 应用；让它运行捆绑的 Gateway。
- **前沿工作流：** 自行通过 `pnpm gateway:watch` 运行 Gateway，然后让 macOS 应用以本地模式连接。

## 前置条件（从源码）

- Node 24 推荐（当前仍支持 Node 22 LTS，`22.14+`）
- `pnpm`
- Docker（可选，仅用于容器化设置/端到端测试 — 参见 [Docker](/install/docker)）

## 定制策略（避免更新影响）

如果你想要“100% 量身定制”且便于更新，请将你的定制内容保存在：

- **配置：** `~/.openclaw/openclaw.json`（JSON/JSON5 格式）
- **工作区：** `~/.openclaw/workspace`（技能、提示、记忆；建议作为私有 git 仓库管理）

初始化一次：

```bash
openclaw setup
```

在此仓库内使用本地 CLI 入口：

```bash
openclaw setup
```

如果还没有全局安装，则通过 `pnpm openclaw setup` 运行。

## 从此仓库运行 Gateway

运行 `pnpm build` 后，可以直接运行打包的 CLI：

```bash
node openclaw.mjs gateway --port 18789 --verbose
```

## 稳定工作流（先安装 macOS 应用）

1. 安装并启动 **OpenClaw.app**（菜单栏）。
2. 完成入职流程/权限检查（TCC 提示）。
3. 确保 Gateway 处于 **本地** 模式并正在运行（由应用管理）。
4. 连接渠道（示例：WhatsApp）：

```bash
openclaw channels login
```

5. 健康检查：

```bash
openclaw health
```

如果你的构建版本中没有入职流程：

- 运行 `openclaw setup`，接着执行 `openclaw channels login`，然后手动启动 Gateway（`openclaw gateway`）。

## 前沿工作流（在终端运行 Gateway）

目标：开发 TypeScript Gateway，支持热重载，并让 macOS 应用UI保持连接。

### 0）【可选】也从源码运行 macOS 应用

如果你也想运行前沿版本的 macOS 应用：

```bash
./scripts/restart-mac.sh
```

### 1）启动开发模式 Gateway

```bash
pnpm install
pnpm gateway:watch
```

`gateway:watch` 会在相关源码、配置和打包插件元数据更改时，运行 gateway 的监听模式并重载。

### 2）让 macOS 应用连接到你运行的 Gateway

在 **OpenClaw.app** 中：

- 连接模式：**本地**  
  应用将自动连接到配置端口上的运行中 Gateway。

### 3）验证

- 应用内 Gateway 状态应显示 **“正在使用已有的网关...”**
- 或通过 CLI 验证：

```bash
openclaw health
```

### 常见踩坑

- **端口错误：** Gateway 的 WS 默认地址为 `ws://127.0.0.1:18789`；请确保应用和 CLI 端口一致。
- **状态存储位置：**
  - 凭证：`~/.openclaw/credentials/`
  - 会话：`~/.openclaw/agents/<agentId>/sessions/`
  - 日志：`/tmp/openclaw/`

## 凭证存储映射

调试认证问题，或决定要备份什么时可参考此处：

- **WhatsApp**：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram bot token**：配置/环境变量或 `channels.telegram.tokenFile`（仅支持普通文件；拒绝符号链接）
- **Discord bot token**：配置/环境变量或 SecretRef（env/file/exec 提供器）
- **Slack tokens**：配置/环境变量（`channels.slack.*`）
- **配对允许名单**：
  - `~/.openclaw/credentials/<channel>-allowFrom.json`（默认账号）
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json`（非默认账号）
- **模型认证配置文件**：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **文件后端密钥载荷（可选）**：`~/.openclaw/secrets.json`
- **旧版 OAuth 导入**：`~/.openclaw/credentials/oauth.json`
  更多细节： [安全](/gateway/security#credential-storage-map)。

## 更新（不破坏现有设置）

- 保持 `~/.openclaw/workspace` 和 `~/.openclaw/` 为“你的内容”；不要将个人提示或配置放入 `openclaw` 仓库中。
- 更新源码执行 `git pull` + `pnpm install`（当锁文件变更时），然后继续使用 `pnpm gateway:watch`。

## Linux（systemd 用户服务）

Linux 安装使用 systemd **用户**服务。默认情况下，systemd 会在注销/空闲时停止用户服务，导致 Gateway 被终止。入职流程会尝试为你启用 lingering（可能会提示输入 sudo 密码）。如果仍未启用，请执行：

```bash
sudo loginctl enable-linger $USER
```

对于需要常驻或多用户的服务器，建议使用 **系统**服务而不是用户服务（无需启用 lingering）。详见 [Gateway 运行手册](/gateway) 中的 systemd 说明。

## 相关文档

- [Gateway 运行手册](/gateway)（标志、监控、端口）
- [Gateway 配置](/gateway/configuration)（配置模式及示例）
- [Discord](/channels/discord) 与 [Telegram](/channels/telegram)（回复标签与 replyToMode 设置）
- [OpenClaw 助手设置](/start/openclaw)
- [macOS 应用](/platforms/macos)（Gateway 生命周期）
