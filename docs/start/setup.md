---
summary: "OpenClaw 的高级设置和开发工作流"
read_when:
  - 配置新机器时
  - 想要“最新最强”且不破坏个人设置时
title: "设置"
---

<Note>
如果你是第一次设置，请从 [入门指南](/start/getting-started) 开始。
有关入职详情，请参阅 [入职引导（CLI）](/start/wizard)。
</Note>

## TL;DR

根据你希望更新的频率，以及是否想自己运行 Gateway，选择一种设置工作流：

- **定制内容存放在仓库外：** 将你的配置和工作区保存在 `~/.openclaw/openclaw.json` 和 `~/.openclaw/workspace/` 中，这样仓库更新不会影响它们。
- **稳定工作流（推荐大多数人使用）：** 安装 macOS 应用，并让它运行内置的 Gateway。
- **前沿工作流（开发）：** 通过 `pnpm gateway:watch` 自己运行 Gateway，然后让 macOS 应用以本地模式连接。

## 前置条件（从源码）

- 推荐 Node 24（Node 22 LTS，目前为 `22.14+`，仍受支持）
- 优先使用 `pnpm`（如果你有意使用 [Bun 工作流](/install/bun)，也可用 Bun）
- Docker（可选；仅用于容器化设置/端到端 — 参见 [Docker](/install/docker)）

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

如果你还没有全局安装，运行 `pnpm openclaw setup`（如果你使用 Bun 工作流，则运行 `bun run openclaw setup`）。

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

目标：开发 TypeScript Gateway，支持热重载，并让 macOS 应用 UI 保持连接。

### 0）【可选】也从源码运行 macOS 应用

如果你也想运行前沿版本的 macOS 应用：

```bash
./scripts/restart-mac.sh
```

### 1）启动开发模式 Gateway

```bash
pnpm install
# First run only (or after resetting local OpenClaw config/workspace)
pnpm openclaw setup
pnpm gateway:watch
```

`gateway:watch` 会以监听模式运行网关，并在相关源代码、配置和已打包插件元数据发生变化时重新加载。
`pnpm openclaw setup` 是一次性的本地配置/工作区初始化步骤，用于全新检出后的配置初始化。
`pnpm gateway:watch` 不会重建 `dist/control-ui`；因此在 `ui/` 发生更改后需重新运行 `pnpm ui:build`，或在开发 Control UI 时使用 `pnpm ui:dev`。

如果你有意使用 Bun 工作流，那么对应命令为：

```bash
bun install
# First run only (or after resetting local OpenClaw config/workspace)
bun run openclaw setup
bun run gateway:watch
```

### 2）让 macOS 应用指向你正在运行的 Gateway

在 **OpenClaw.app** 中：

- 连接模式：**本地**  
  应用将自动连接到配置端口上正在运行的 Gateway。

### 3）验证

- 应用内 Gateway 状态应显示 **“正在使用已有的网关...”**
- 或通过 CLI 验证：

```bash
openclaw health
```

### 常见踩坑

- **端口错误（Wrong port）：** Gateway WS 默认是 `ws://127.0.0.1:18789`；确保应用和 CLI 使用同一端口。
- **状态存放位置：**
  - 渠道/提供商状态：`~/.openclaw/credentials/`
  - 模型认证配置文件（auth profiles）：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
  - 会话：`~/.openclaw/agents/<agentId>/sessions/`
  - 日志：`/tmp/openclaw/`

## 凭证存储映射

调试认证问题，或决定要备份什么时可参考此处：

- **WhatsApp**：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram 机器人 token**：配置/环境变量或 `channels.telegram.tokenFile`（仅支持普通文件；拒绝符号链接）
- **Discord 机器人 token**：配置/环境变量或 SecretRef（env/file/exec 提供器）
- **Slack tokens**：配置/环境变量（`channels.slack.*`）
- **配对允许名单**：
  - `~/.openclaw/credentials/<channel>-allowFrom.json`（默认账号）
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json`（非默认账号）
- **模型认证配置文件**：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **文件后端密钥载荷（可选）**：`~/.openclaw/secrets.json`
- **旧版 OAuth 导入**：`~/.openclaw/credentials/oauth.json`
  更多细节： [安全](/gateway/security#credential-storage-map)。

## 更新（不破坏现有设置）

- 将 `~/.openclaw/workspace` 和 `~/.openclaw/` 视为“你的东西”；不要把个人提示/配置放入 `openclaw` 仓库。
- 更新源码：`git pull` + 你选择的包管理器安装步骤（默认是 `pnpm install`；Bun 工作流用 `bun install`）+ 继续使用对应的 `gateway:watch` 命令。

## Linux（systemd 用户服务）

Linux 安装使用 systemd **用户**服务。默认情况下，systemd 会在注销/空闲时停止用户服务，导致 Gateway 被终止。入职流程会尝试为你启用 lingering（可能会提示你输入 sudo 密码）。如果仍未启用，请执行：

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
