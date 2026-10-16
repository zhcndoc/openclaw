---
summary: "OpenClaw 的高级设置和开发工作流"
read_when:
  - "设置新机器"
  - "你想要“最新 + 最强大”而不破坏你个人设置"
title: "设置"
---

<Note>
如果您是第一次设置，请从 [ 开始获取 Started](/start/getting-started)。有关入门引导详细信息，请参阅 [ 入门引导 （CLI）](/start/wizard)。
</Note>

## TL;DR

根据你希望更新的频率以及是否想自己运行 Gateway，选择一种设置工作流：

- **定制化存在于仓库之外：** 将你的配置和工作区保存在 `~/.openclaw/openclaw.json` 和 `~/.openclaw/workspace/` 中，这样仓库更新就不会影响它们。
- **稳定工作流（推荐给大多数人）：** 安装 macOS 应用并让它运行内置的 Gateway。
- **前沿工作流（开发）：** 通过 `pnpm gateway:watch` 自己运行 Gateway，然后让 macOS 应用以本地模式连接。

## <a id="prereqs-(from-source)"></a><a id="prereqs-from-source"></a> 前置条件（从源码）

- Node 24.16+ LTS 或 Node 26.1+（推荐）
- 源码检出需要 `pnpm`。OpenClaw 在开发模式下会从 `extensions/*` pnpm workspace 包中加载捆绑插件，因此根目录下的 `npm install` 不会准备完整的源码树。
- Docker（可选；仅适用于容器化 setup/e2e - 请参阅 [Docker](/install/docker)）

使用固定在 `package.json` 中的 pnpm 版本。工作区对 npm 依赖项应用 7 天的发布冷却时间，受信任的 `@openai/codex` 和 `@openai/codex-*` 软件包除外。独立的 pnpm 工具链是单独管理的。

对于读取项目 `.npmrc` 的 npm 工具，请使用 npm **11.19 或更新的** 进行安装，并使用 `npm pack` 冷却时间和 Codex 排除。 Node 运行时支持并不意味着支持其捆绑的 npm 作为源解析器。 [Published/global 安装](/install) 不会继承存储库的`.npmrc`。源安装继续使用 pnpm。

pnpm 拥有根和插件本地依赖项，包括工作区链接和包之间不同的版本。安装后和构建准备保留这些树。如果较旧的签出删除了插件本地依赖项，请在更新后运行 `pnpm install --frozen-lockfile` 以在测试之前恢复它们。

## <a id="tailoring-strategy-(so-updates-do-not-hurt)"></a><a id="tailoring-strategy-so-updates-do-not-hurt"></a> 定制化策略（让更新不会伤到你）

如果您想要“100% 为我量身定制”并轻松更新，请将您的自定义保留在：

- **配置：** `~/.openclaw/openclaw.json` （JSON/JSON5-ish）
- **工作区：** `~/.openclaw/workspace`（技能、提示词、记忆；建议将其设为私有 git 仓库）

首次初始化 config/workspace 文件夹，而不运行完整的 onboarding 向导：

```bash
openclaw setup --baseline
```

还没有全局安装？那就从这个仓库中运行：

```bash
pnpm openclaw setup --baseline
```

（裸 `openclaw setup`，没有 `--baseline`，会在已配置的系统上打开交互式 OpenClaw 聊天，然后在新的系统上进行引导引导。请参阅 [Setup CLI](/cli/setup) 了解完整的路由顺序。）

## <a id="run-the-gateway-from-this-repo"></a> 从本仓库运行 Gateway

在 `pnpm build` 之后，你可以直接运行打包好的 CLI：

```bash
node openclaw.mjs gateway --port 18789 --verbose
```

## <a id="stable-workflow-(macos-app-first)"></a><a id="stable-workflow-macos-app-first"></a> 稳定工作流（优先使用 macOS 应用）

1. 安装并启动 **OpenClaw.app**（菜单栏应用）。
2. 完成 onboarding/permissions 检查表（TCC 提示）。
3. 检查网关是否为 **Local** 并正在运行（应用程序对其进行管理）。
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

## <a id="bleeding-edge-workflow-(gateway-in-a-terminal)"></a><a id="bleeding-edge-workflow-gateway-in-a-terminal"></a> 前沿工作流（在终端中运行 Gateway）

目标：开发 TypeScript Gateway，获得热重载，同时保持 macOS 应用 UI 连接。

### <a id="0)-(optional)-run-the-macos-app-from-source-too"></a><a id="0-optional-run-the-macos-app-from-source-too"></a> 0）（可选）也从源码运行 macOS 应用

如果你也想让 macOS 应用走前沿版本：

```bash
./scripts/restart-mac.sh
```

### <a id="1)-start-the-dev-gateway"></a><a id="1-start-the-dev-gateway"></a> 1）启动开发版 Gateway

```bash
pnpm install
# First run only (or after resetting local OpenClaw config/workspace)
pnpm openclaw setup
pnpm gateway:watch
```

`gateway:watch` 的作用：

- 它在命名的tmux会话`openclaw-gateway-watch-main`中启动或重新启动网关监视进程，并从交互式终端自动附加。
- 非交互式外壳保持分离并打印 `tmux attach -t openclaw-gateway-watch-main`。运行 `OPENCLAW_GATEWAY_WATCH_ATTACH=0 pnpm gateway:watch` 来保持交互式运行分离，或运行 `pnpm gateway:watch:raw` 来实现前台监视模式。
- 它会在接管该服务的配置或默认端口之前停止活动配置文件的已安装网关服务。这可以防止服务主管替换源进程。该服务保持安装状态。看完后运行`pnpm openclaw gateway start`。
- tmux 窗格在启动失败后仍然可用，因此另一个终端或代理可以连接到它或捕获其日志。
- 它会在相关源、配置和捆绑插件元数据更改时重新加载。
- 如果监视的网关在启动过程中退出，则`gateway:watch`运行`openclaw doctor --fix --non-interactive`一次并重试。设置 `OPENCLAW_GATEWAY_WATCH_AUTO_DOCTOR=0` 以禁用仅开发修复通道。

由 `pnpm openclaw ...` 或 `pnpm gateway:watch` 触发的 TypeScript 重建保留现有的 `dist/control-ui` 资产。当网关启动时，它会在提供服务之前重建丢失、不完整或过时的捆绑 UI 资产。仅在完整的捆绑包通过验证后，UI 构建才会替换 `dist/control-ui`，因此失败的构建会将先前的捆绑包保留在原处。如果某个构建在交换其输出时被终止，则下一个构建将首先恢复前一个包。无头命令不会重建 UI。在 `ui/` 更改后运行 `pnpm ui:build`，或者在开发 Control UI 时使用 `pnpm ui:dev`。

### <a id="2)-point-the-macos-app-at-your-running-gateway"></a><a id="2-point-the-macos-app-at-your-running-gateway"></a> 2）将 macOS 应用指向你正在运行的 Gateway

在 **OpenClaw.app** 中：

- 连接模式：**本地** 应用将连接到已在配置端口上运行的 gateway。

### <a id="3)-verify"></a><a id="3-verify"></a> 3）验证

- 应用内的 Gateway 状态应显示 **“使用现有 gateway …”**
- 或通过 CLI：

```bash
openclaw health
```

### <a id="common-footguns"></a> 常见坑

- **端口错误：** Gateway WS 默认为 `ws://127.0.0.1:18789`；请让应用 + CLI 使用同一个端口。
- **错误的开发人员 CLI：** 当 `PATH` 包含 `node_modules/.bin` 时，`codex` 可以解析为工作区固定的 CLI，而不是独立安装。对于开发人员工作人员，请使用 `--version` 和 `exec` 的预期可执行文件的绝对路径，并确认工作人员的启动版本。另一个 shell 中的包清单或版本检查无法识别正在运行的工作线程。 OpenClaw 的 [ 管理的 Codex 应用服务器](/plugins/codex-harness-reference#app-server-transport) 有单独的固定版本合约；不要更改该引脚或您的 model/auth 设置来修复开发人员 CLI 选择。如果安装的工作区包和本机可执行文件与锁定文件不一致，请使用 `pnpm install` 修复安装，而不是编辑 `node_modules`。
- **状态存储位置：**
  - Channel/provider 状态：`~/.openclaw/credentials/`
  - 模型身份验证配置文件：SQLite 身份验证存储（共享：`~/.openclaw/state/openclaw.sqlite`；代理本地：`~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`）
  - 会话和记录：`~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`
  - Legacy/archive 会话工件：`~/.openclaw/agents/<agentId>/sessions/`
  - 日志：`/tmp/openclaw/`

## <a id="credential-storage-map"></a> 凭据存储映射

调试认证或决定要备份哪些内容时可参考这里：

- **WhatsApp**: `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram 机器人令牌**：config/env 或 `channels.telegram.tokenFile`（仅限常规文件；拒绝符号链接）
- **Discord 机器人令牌**：config/env 或 SecretRef（env/file/exec/store 提供程序）
- **Slack 令牌**：config/env（`channels.slack.*`）
- **配对允许列表**：
  - `~/.openclaw/credentials/<channel>-allowFrom.json`（默认账户）
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json`（非默认账户）
- **模型身份验证配置文件**：共享和代理本地SQLite身份验证存储；有关继承和遗留共享存储重定位，请参阅 [Auth 凭证语义](/auth-credential-semantics#agent-copy-portability)
- **文件支持的 secrets 负载（可选）**：`~/.openclaw/secrets.json`
- **旧版 OAuth 导入**：`~/.openclaw/credentials/oauth.json` 更多详细信息：[Security](/gateway/security/secrets-and-storage#credential-storage-map)。

## <a id="updating-(without-wrecking-your-setup)"></a><a id="updating-without-wrecking-your-setup"></a> 更新（不破坏你的设置）

- 将`~/.openclaw/workspace`和`~/.openclaw/`保留为“你的东西”；不要将个人 prompts/config 放入 `openclaw` 存储库中。
- 更新源码：`git pull` + `pnpm install` + 继续使用 `pnpm gateway:watch`。

## <a id="linux-(systemd-user-service)"></a><a id="linux-systemd-user-service"></a> Linux（systemd 用户服务）

Linux 安装使用 systemd **user** 服务。默认情况下，systemd 停止 logout/idle 上的用户服务，从而杀死网关。 Onboarding 尝试为您启用延迟（可能会提示输入 sudo）。如果它仍然关闭，请运行：

```bash
sudo loginctl enable-linger $USER
```

对于始终在线或多用户服务器，考虑使用 **系统** 服务而不是用户服务（无需 lingering）。有关 systemd 说明，请参见 [Gateway 操作手册](/gateway)。

## <a id="related-docs"></a> 相关文档

- [Gateway 操作手册](/gateway)（标志、监管、端口）
- [Gateway 配置](/gateway/configuration)（配置 schema + 示例）
- [Discord](/channels/discord) 和 [Telegram](/channels/telegram)（回复标签 + replyToMode 设置）
- [OpenClaw 助手设置](/start/openclaw)
- [macOS 应用](/platforms/macos)（gateway 生命周期）。
