---
summary: "OpenClaw CLI 参考，涵盖 `openclaw` 命令、子命令及选项"
read_when:
  - 添加或修改 CLI 命令或选项时
  - 记录新命令界面时
title: "CLI 参考"
---

# CLI 参考

本页描述当前 CLI 行为。如命令有所变更，请更新本文档。

## 命令页面

- [`setup`](/cli/setup)
- [`onboard`](/cli/onboard)
- [`configure`](/cli/configure)
- [`config`](/cli/config)
- [`completion`](/cli/completion)
- [`doctor`](/cli/doctor)
- [`dashboard`](/cli/dashboard)
- [`backup`](/cli/backup)
- [`reset`](/cli/reset)
- [`uninstall`](/cli/uninstall)
- [`update`](/cli/update)
- [`message`](/cli/message)
- [`agent`](/cli/agent)
- [`agents`](/cli/agents)
- [`acp`](/cli/acp)
- [`status`](/cli/status)
- [`health`](/cli/health)
- [`sessions`](/cli/sessions)
- [`gateway`](/cli/gateway)
- [`logs`](/cli/logs)
- [`system`](/cli/system)
- [`models`](/cli/models)
- [`memory`](/cli/memory)
- [`directory`](/cli/directory)
- [`nodes`](/cli/nodes)
- [`devices`](/cli/devices)
- [`node`](/cli/node)
- [`approvals`](/cli/approvals)
- [`sandbox`](/cli/sandbox)
- [`tui`](/cli/tui)
- [`browser`](/cli/browser)
- [`cron`](/cli/cron)
- [`dns`](/cli/dns)
- [`docs`](/cli/docs)
- [`hooks`](/cli/hooks)
- [`webhooks`](/cli/webhooks)
- [`pairing`](/cli/pairing)
- [`qr`](/cli/qr)
- [`plugins`](/cli/plugins)（插件命令）
- [`channels`](/cli/channels)
- [`security`](/cli/security)
- [`secrets`](/cli/secrets)
- [`skills`](/cli/skills)
- [`daemon`](/cli/daemon)（老旧网关服务命令别名）
- [`clawbot`](/cli/clawbot)（老旧别名空间）
- [`voicecall`](/cli/voicecall)（插件；如果已安装）

## 全局标志

- `--dev`：隔离状态于 `~/.openclaw-dev` 目录，并偏移默认端口。
- `--profile <name>`：隔离状态于 `~/.openclaw-<name>` 目录。
- `--no-color`：禁用 ANSI 颜色。
- `--update`：`openclaw update` 的简写（仅限源安装）。
- `-V`, `--version`, `-v`：打印版本并退出。

## 输出样式

- ANSI 颜色和进度指示器仅在 TTY 会话中渲染。
- OSC-8 超链接在支持的终端中渲染为可点击链接；否则回退为普通 URL。
- `--json`（及支持时的 `--plain`）禁用所有样式，以输出纯净内容。
- `--no-color` 禁用 ANSI 样式；同样支持环境变量 `NO_COLOR=1`。
- 长时间运行的命令显示进度指示器（支持时使用 OSC 9;4）。

## 颜色调色板

OpenClaw CLI 输出使用龙虾色调板。

- `accent` (#FF5A2D)：标题、标签、主要高亮。
- `accentBright` (#FF7A3D)：命令名称、强调。
- `accentDim` (#D14A22)：次要高亮文本。
- `info` (#FF8A5B)：信息性数值。
- `success` (#2FBF71)：成功状态。
- `warn` (#FFB020)：警告、回退、关注。
- `error` (#E23D2D)：错误、失败。
- `muted` (#8B7F77)：弱化、元数据。

调色板唯一真实来源：`src/terminal/palette.ts`（即"龙虾调色板"）。

## 命令树

```
openclaw [--dev] [--profile <name>] <command>
  setup
  onboard
  configure
  config
    get
    set
    unset
    file
    validate
  completion
  doctor
  dashboard
  backup
    create
    verify
  security
    audit
  secrets
    reload
    audit
    configure
    apply
  reset
  uninstall
  update
  channels
    list
    status
    logs
    add
    remove
    login
    logout
  directory
  skills
    list
    info
    check
  plugins
    list
    inspect
    install
    uninstall
    update
    enable
    disable
    doctor
    marketplace list
  memory
    status
    index
    search
  message
    send
    broadcast
  agent
  agents
    list
    add
    delete
  acp
  status
  health
  sessions
  gateway
    call
    health
    status
    probe
    discover
    install
    uninstall
    start
    stop
    restart
    run
  daemon
    status
    install
    uninstall
    start
    stop
    restart
  logs
  system
    event
    heartbeat last|enable|disable
    presence
  models
    list
    status
    set
    set-image
    aliases list|add|remove
    fallbacks list|add|remove|clear
    image-fallbacks list|add|remove|clear
    scan
    auth add|setup-token|paste-token
    auth order get|set|clear
  sandbox
    list
    recreate
    explain
  cron
    status
    list
    add
    edit
    rm
    enable
    disable
    runs
    run
  nodes
  devices
  node
    run
    status
    install
    uninstall
    start
    stop
    restart
  approvals
    get
    set
    allowlist add|remove
  browser
    status
    start
    stop
    reset-profile
    tabs
    open
    focus
    close
    profiles
    create-profile
    delete-profile
    screenshot
    snapshot
    navigate
    resize
    click
    type
    press
    hover
    drag
    select
    upload
    fill
    dialog
    wait
    evaluate
    console
    pdf
  hooks
    list
    info
    check
    enable
    disable
    install
    update
  webhooks
    gmail setup|run
  pairing
    list
    approve
  qr
  clawbot
    qr
  docs
  dns
    setup
  tui
```

注意：插件可以添加额外的顶级命令（例如 `openclaw voicecall`）。

## 安全

- `openclaw security audit` — 审计配置和本地状态中的常见安全误操作。
- `openclaw security audit --deep` — 尽力实时探测 Gateway。
- `openclaw security audit --fix` — 收紧安全默认设置并调整状态/配置权限。

## 秘密管理

- `openclaw secrets reload` — 重新解析引用并原子性地交换运行时快照。
- `openclaw secrets audit` — 扫描明文残留、未解析引用和优先级漂移（`--allow-exec` 可在审计期间执行 exec 提供者）。
- `openclaw secrets configure` — 提供者设置 + SecretRef 映射 + 预检/应用的交互式助手（`--allow-exec` 可在预检和包含 exec 的应用流程中执行 exec 提供者）。
- `openclaw secrets apply --from <plan.json>` — 应用先前生成的计划（支持 `--dry-run`；使用 `--allow-exec` 允许在 dry-run 和包含 exec 的写入计划中执行 exec 提供者）。

## 插件

管理扩展及其配置：

- `openclaw plugins list` — 发现插件（使用 `--json` 输出机器可读格式）。
- `openclaw plugins inspect <id>` — 显示插件详情（`info` 是别名）。
- `openclaw plugins install <path|.tgz|npm-spec|plugin@marketplace>` — 安装插件（或将插件路径添加到 `plugins.load.paths`）。
- `openclaw plugins marketplace list <marketplace>` — 安装前列出应用市场条目。
- `openclaw plugins enable <id>` / `disable <id>` — 切换 `plugins.entries.<id>.enabled`。
- `openclaw plugins doctor` — 报告插件加载错误。

大多数插件更改需要重启网关。详见 [/plugin](/tools/plugin)。

## 记忆存储

针对 `MEMORY.md` 和 `memory/*.md` 的向量搜索：

- `openclaw memory status` — 显示索引统计。
- `openclaw memory index` — 重新索引记忆文件。
- `openclaw memory search "<query>"`（或 `--query "<query>"`） — 记忆的语义搜索。

## 聊天斜杠命令

聊天消息支持 `/...` 命令（文本和原生）。详见 [/tools/slash-commands](/tools/slash-commands)。

重点：

- `/status` 用于快速诊断。
- `/config` 用于持久化配置更改。
- `/debug` 用于运行时配置覆写（仅内存，不写入磁盘；需要 `commands.debug: true`）。

## 设置与引导

### `setup`

初始化配置和工作空间。

选项：

- `--workspace <dir>`: agent 工作空间路径（默认为 `~/.openclaw/workspace`）。
- `--wizard`: 运行引导向导。
- `--non-interactive`: 无提示运行引导。
- `--mode <local|remote>`: 引导模式。
- `--remote-url <url>`: 远程 Gateway URL。
- `--remote-token <token>`: 远程 Gateway 令牌。

当存在任何引导相关标志（`--non-interactive`、`--mode`、`--remote-url`、`--remote-token`）时，引导自动运行。

### `onboard`

用于网关、工作空间及技能的交互式引导。

选项：

- `--workspace <dir>`
- `--reset` (引导前重置配置 + 凭据 + 会话)
- `--reset-scope <config|config+creds+sessions|full>` (默认 `config+creds+sessions`；`full` 还会删除工作空间)
- `--non-interactive`
- `--mode <local|remote>`
- `--flow <quickstart|advanced|manual>` (`manual` 是 `advanced` 的别名)
- `--auth-choice <setup-token|token|chutes|openai-codex|openai-api-key|openrouter-api-key|ollama|ai-gateway-api-key|moonshot-api-key|moonshot-api-key-cn|kimi-code-api-key|synthetic-api-key|venice-api-key|gemini-api-key|zai-api-key|mistral-api-key|apiKey|minimax-api|minimax-api-lightning|opencode-zen|opencode-go|custom-api-key|skip>`
- `--token-provider <id>` (非交互模式；与 `--auth-choice token` 一起使用)
- `--token <token>` (非交互模式；与 `--auth-choice token` 一起使用)
- `--token-profile-id <id>` (非交互模式；默认：`<provider>:manual`)
- `--token-expires-in <duration>` (非交互模式；例如 `365d`, `12h`)
- `--secret-input-mode <plaintext|ref>` (默认 `plaintext`；使用 `ref` 来存储提供者默认的环境变量引用而非明文密钥)
- `--anthropic-api-key <key>`
- `--openai-api-key <key>`
- `--mistral-api-key <key>`
- `--openrouter-api-key <key>`
- `--ai-gateway-api-key <key>`
- `--moonshot-api-key <key>`
- `--kimi-code-api-key <key>`
- `--gemini-api-key <key>`
- `--zai-api-key <key>`
- `--minimax-api-key <key>`
- `--opencode-zen-api-key <key>`
- `--opencode-go-api-key <key>`
- `--custom-base-url <url>` (非交互模式；与 `--auth-choice custom-api-key` 或 `--auth-choice ollama` 一起使用)
- `--custom-model-id <id>` (非交互模式；与 `--auth-choice custom-api-key` 或 `--auth-choice ollama` 一起使用)
- `--custom-api-key <key>` (非交互模式；可选；与 `--auth-choice custom-api-key` 一起使用；省略时回退到 `CUSTOM_API_KEY`)
- `--custom-provider-id <id>` (非交互模式；可选的自定义提供者 ID)
- `--custom-compatibility <openai|anthropic>` (非交互模式；可选；默认 `openai`)
- `--gateway-port <port>`
- `--gateway-bind <loopback|lan|tailnet|auto|custom>`
- `--gateway-auth <token|password>`
- `--gateway-token <token>`
- `--gateway-token-ref-env <name>`（非交互模式，将 `gateway.auth.token` 存为环境变量 SecretRef；需确保该环境变量已设置；不可与 `--gateway-token` 同时使用）
- `--gateway-password <password>`
- `--remote-url <url>`
- `--remote-token <token>`
- `--tailscale <off|serve|funnel>`
- `--tailscale-reset-on-exit`
- `--install-daemon`
- `--no-install-daemon`（别名：`--skip-daemon`）
- `--daemon-runtime <node|bun>`
- `--skip-channels`
- `--skip-skills`
- `--skip-health`
- `--skip-ui`
- `--node-manager <npm|pnpm|bun>`（推荐 pnpm；bun 不推荐用于 Gateway 运行时）
- `--json`

### `configure`

交互式配置向导（模型、频道、技能、网关）。

### `config`

非交互式配置工具（get/set/unset/file/validate）。无子命令时运行 `openclaw config` 将启动向导。

子命令：

- `config get <path>`: 打印配置值（点/括号路径）。
- `config set`: 支持四种赋值模式：
  - 值模式: `config set <path> <value>`（JSON5 或字符串解析）
  - SecretRef 构建器模式: `config set <path> --ref-provider <provider> --ref-source <source> --ref-id <id>`
  - 提供者构建器模式: `config set secrets.providers.<alias> --provider-source <env|file|exec> ...`
  - 批量模式: `config set --batch-json '<json>'` 或 `config set --batch-file <path>`
- `config set --dry-run`: 验证赋值而不写入 `openclaw.json`（默认跳过 exec SecretRef 检查）。
- `config set --allow-exec --dry-run`: 选择执行 exec SecretRef dry-run 检查（可能执行提供者命令）。
- `config set --dry-run --json`: 输出机器可读的 dry-run 结果（检查 + 完整性信号、操作、已检查/跳过的引用、错误）。
- `config set --strict-json`: 要求对路径/值输入进行 JSON5 解析。在 dry-run 输出模式之外，`--json` 仍是严格解析的传统别名。
- `config unset <path>`: 移除值。
- `config file`: 打印活动配置文件路径。
- `config validate`: 在不启动网关的情况下根据模式验证当前配置。
- `config validate --json`: 输出机器可读的 JSON 结果。

### `doctor`

健康检查与快速修复（配置、网关、遗留服务）。

选项：

- `--no-workspace-suggestions`：禁用工作空间内存提示。
- `--yes`：默认接受，无需提示（无头模式）。
- `--non-interactive`：跳过提示，仅应用安全迁移。
- `--deep`：扫描系统服务以发现更多网关安装。

## 频道辅助

### `channels`

管理聊天频道账户（WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage/Microsoft Teams）。

子命令：

- `channels list`：显示已配置的频道及认证配置文件。
- `channels status`：检查网关可达性和频道健康状况（`--probe` 执行额外检查；使用 `openclaw health` 或 `openclaw status --deep` 进行网关健康探测）。
- 提示：`channels status` 会打印警告并给出建议修复措施，当它能检测常见误配置时（并指引你使用 `openclaw doctor`）。
- `channels logs`：显示来自网关日志文件的频道最近日志。
- `channels add`：无标志时以向导模式添加；带标志时切换为非交互模式。
  - 当为仍使用单账户顶级配置的频道添加非默认账户时，OpenClaw 会在写入新账户前，将账户范围值转移至 `channels.<channel>.accounts.default`。
  - 非交互模式下的 `channels add` 不会自动创建或升级绑定；频道绑定仍匹配默认账户。
- `channels remove`：默认禁用；使用 `--delete` 可删除配置项且无提示。
- `channels login`：交互式频道登录（仅 WhatsApp Web）。
- `channels logout`：退出频道会话（如支持）。

常用选项：

- `--channel <name>`：`whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams`
- `--account <id>`：频道账户 ID（默认 `default`）
- `--name <label>`：账户显示名

`channels login` 选项：

- `--channel <channel>`（默认 `whatsapp`；支持 `whatsapp` / `web`）
- `--account <id>`
- `--verbose`

`channels logout` 选项：

- `--channel <channel>`（默认 `whatsapp`）
- `--account <id>`

`channels list` 选项：

- `--no-usage`：跳过模型提供者使用/配额快照（仅 OAuth/API 支持）。
- `--json`：输出 JSON（含使用信息，除非加 `--no-usage`）。

`channels logs` 选项：

- `--channel <name|all>`（默认 `all`）
- `--lines <n>`（默认 200）
- `--json`

更多详情：[/concepts/oauth](/concepts/oauth)

示例：

```bash
openclaw channels add --channel telegram --account alerts --name "Alerts Bot" --token $TELEGRAM_BOT_TOKEN
openclaw channels add --channel discord --account work --name "Work Bot" --token $DISCORD_BOT_TOKEN
openclaw channels remove --channel discord --account work --delete
openclaw channels status --probe
openclaw status --deep
```

### `skills`

列举和查看可用技能及其准备状态。

子命令：

- `skills search [query...]`：搜索 ClawHub 技能。
- `skills install <slug>`：将技能从 ClawHub 安装到当前工作空间。
- `skills update <slug|--all>`：更新已跟踪的 ClawHub 技能。
- `skills list`：列出技能（无子命令时默认）。
- `skills info <name>`：显示单个技能的详细信息。
- `skills check`：就绪与缺失要求的摘要。

选项：

- `--eligible`：仅显示已准备技能。
- `--json`：输出 JSON（无样式）。
- `-v`, `--verbose`：包含缺失要求详情。

提示：使用 `openclaw skills search`、`openclaw skills install` 和 `openclaw skills update` 管理 ClawHub 支持技能。

### `pairing`

跨频道批准私信配对请求。

子命令：

- `pairing list [channel] [--channel <channel>] [--account <id>] [--json]`
- `pairing approve <channel> <code> [--account <id>] [--notify]`
- `pairing approve --channel <channel> [--account <id>] <code> [--notify]`

### `devices`

管理网关设备配对及角色设备令牌。

子命令：

- `devices list [--json]`
- `devices approve [requestId] [--latest]`
- `devices reject <requestId>`
- `devices remove <deviceId>`
- `devices clear --yes [--pending]`
- `devices rotate --device <id> --role <role> [--scope <scope...>]`
- `devices revoke --device <id> --role <role>`

### `webhooks gmail`

Gmail Pub/Sub 钩子设置及运行器。详见 [/automation/gmail-pubsub](/automation/gmail-pubsub)。

子命令：

- `webhooks gmail setup`（需要 `--account <email>`；支持多种参数包括 `--project`、`--topic`、`--subscription`、`--label`、`--hook-url`、`--hook-token`、`--push-token`、`--bind`、`--port`、`--path`、`--include-body`、`--max-bytes`、`--renew-minutes`、`--tailscale`、`--tailscale-path`、`--tailscale-target`、`--push-endpoint`、`--json`）
- `webhooks gmail run`（支持同样参数的运行时覆写）

### `dns setup`

广域发现 DNS 辅助（CoreDNS + Tailscale）。详见 [/gateway/discovery](/gateway/discovery)。

选项：

- `--apply`：安装或更新 CoreDNS 配置（需要 sudo，仅限 macOS）。

## 消息与代理

### `message`

统一的出站消息及频道操作。

详见：[/cli/message](/cli/message)

子命令：

- `message send|poll|react|reactions|read|edit|delete|pin|unpin|pins|permissions|search|timeout|kick|ban`
- `message thread <create|list|reply>`
- `message emoji <list|upload>`
- `message sticker <send|upload>`
- `message role <info|add|remove>`
- `message channel <info|list>`
- `message member info`
- `message voice status`
- `message event <list|create>`

示例：

- `openclaw message send --target +15555550123 --message "Hi"`
- `openclaw message poll --channel discord --target channel:123 --poll-question "Snack?" --poll-option Pizza --poll-option Sushi`

### `agent`

通过网关运行单次代理交互（或带 `--local` 内嵌模式）。

必需参数：

- `--message <text>`

选项：

- `--to <dest>`（会话密钥及可选投递目的地）
- `--session-id <id>`
- `--thinking <off|minimal|low|medium|high|xhigh>`（仅 GPT-5.2 + Codex 模型支持）
- `--verbose <on|full|off>`
- `--channel <whatsapp|telegram|discord|slack|mattermost|signal|imessage|msteams>`
- `--local`
- `--deliver`
- `--json`
- `--timeout <seconds>`

### `agents`

管理独立代理（工作空间 + 鉴权 + 路由）。

#### `agents list`

列出配置的代理。

选项：

- `--json`
- `--bindings`

#### `agents add [name]`

添加新独立代理。除非带参数或 `--non-interactive`，否则运行向导；非交互模式下必须指定 `--workspace`。

选项：

- `--workspace <dir>`
- `--model <id>`
- `--agent-dir <dir>`
- `--bind <channel[:accountId]>`（可重复）
- `--non-interactive`
- `--json`

绑定格式为 `channel[:accountId]`。若省略 `accountId`，OpenClaw 会尝试通过频道默认或插件钩子推断账户范围，否则视为频道绑定但无明确账户范围。

#### `agents bindings`

列出路由绑定。

选项：

- `--agent <id>`
- `--json`

#### `agents bind`

为代理添加路由绑定。

选项：

- `--agent <id>`
- `--bind <channel[:accountId]>`（可重复）
- `--json`

#### `agents unbind`

移除代理路由绑定。

选项：

- `--agent <id>`
- `--bind <channel[:accountId]>`（可重复）
- `--all`
- `--json`

#### `agents delete <id>`

删除代理并清理其工作空间和状态。

选项：

- `--force`
- `--json`

### `acp`

运行连接 IDE 与网关的 ACP 桥接。

详见 [`acp`](/cli/acp) 了解完整选项和示例。

### `status`

显示关联会话健康状况及近期接收者。

选项：

- `--json`
- `--all`（完整诊断；只读，可粘贴）
- `--deep`（探测频道）
- `--usage`（展示模型提供者使用配额）
- `--timeout <ms>`
- `--verbose`
- `--debug`（`--verbose` 别名）

备注：

- 概览含网关及节点主机服务状态（如可用）。

### 使用跟踪

当 OAuth/API 凭证可用时，OpenClaw 可以显示提供者使用配额。

显示位置：

- `/status`（提供简短使用信息）
- `openclaw status --usage`（打印完整提供商详情）
- macOS 菜单栏（上下文中的“使用”小节）

备注：

- 数据直接来自提供商使用端点（无估算）。
- 提供商包括：Anthropic、GitHub Copilot、OpenAI Codex OAuth，以及通过内置 `google` 插件和 Antigravity 配置的 Gemini CLI。
- 若无匹配凭证，则使用信息隐藏。
- 详情见 [使用跟踪](/concepts/usage-tracking)。

### `health`

获取正在运行的网关健康状况。

选项：

- `--json`
- `--timeout <ms>`
- `--verbose`

### `sessions`

列出保存的会话记录。

选项：

- `--json`
- `--verbose`
- `--store <path>`
- `--active <minutes>`

## 重置 / 卸载

### `reset`

重置本地配置和状态（保留 CLI 安装）。

选项：

- `--scope <config|config+creds+sessions|full>`
- `--yes`
- `--non-interactive`
- `--dry-run`

备注：

- `--non-interactive` 需指定 `--scope` 和 `--yes`。

### `uninstall`

卸载网关服务和本地数据（保留 CLI）。

选项：

- `--service`
- `--state`
- `--workspace`
- `--app`
- `--all`
- `--yes`
- `--non-interactive`
- `--dry-run`

备注：

- `--non-interactive` 需加 `--yes`，并显式指定范围或 `--all`。

## 网关

### `gateway`

运行 WebSocket 网关。

选项：

- `--port <port>`
- `--bind <loopback|tailnet|lan|auto|custom>`
- `--token <token>`
- `--auth <token|password>`
- `--password <password>`
- `--password-file <path>`
- `--tailscale <off|serve|funnel>`
- `--tailscale-reset-on-exit`
- `--allow-unconfigured`
- `--dev`
- `--reset`（重置开发配置、凭据、会话和工作空间）
- `--force`（杀掉占用端口的现有监听）
- `--verbose`
- `--claude-cli-logs`
- `--ws-log <auto|full|compact>`
- `--compact`（等价于 `--ws-log compact`）
- `--raw-stream`
- `--raw-stream-path <path>`

### `gateway service`

管理网关服务（launchd/systemd/schtasks）。

子命令：

- `gateway status`（默认探测 Gateway RPC）
- `gateway install`（服务安装）
- `gateway uninstall`
- `gateway start`
- `gateway stop`
- `gateway restart`

备注：

- `gateway status` 默认使用服务解析的端口/配置探测 Gateway RPC（可通过 `--url/--token/--password` 覆盖）。
- `gateway status` 支持 `--no-probe`、`--deep`、`--require-rpc` 和 `--json`，适合脚本使用。
- `gateway status` 能检测并显示旧版或额外的网关服务（`--deep` 添加系统级扫描）。以配置文件命名的 OpenClaw 服务被视为正式，不会标记为“额外”。
- `gateway status` 显示 CLI 使用的配置路径与服务可能使用的配置路径（服务环境），以及解析后的探测目标 URL。
- 若当前命令路径中网关认证的 SecretRefs 解析失败，`gateway status --json` 仅在探测连接/认证失败时报告 `rpc.authWarning`（探测成功时隐藏警告）。
- Linux systemd 安装的状态令牌漂移检查涵盖 `Environment=` 和 `EnvironmentFile=` 单元来源。
- `gateway install|uninstall|start|stop|restart` 支持 `--json` 以便脚本操作（默认输出对人友好）。
- `gateway install` 默认使用 Node 运行时；不推荐使用 bun（WhatsApp/Telegram 存在问题）。
- `gateway install` 选项包括：`--port`、`--runtime`、`--token`、`--force`、`--json`。

### `logs`

通过 RPC 监听网关文件日志。

备注：

- TTY 会话显示彩色结构化视图；非 TTY 则回退为纯文本输出。
- `--json` 产生按行分割的 JSON（每行为一个日志事件）。

示例：

```bash
openclaw logs --follow
openclaw logs --limit 200
openclaw logs --plain
openclaw logs --json
openclaw logs --no-color
```

### `gateway <subcommand>`

网关 CLI 辅助工具（RPC 子命令可使用 `--url`、`--token`、`--password`、`--timeout`、`--expect-final`）。

若传入 `--url`，CLI 不自动读取配置或环境凭证。

必须显式包含 `--token` 或 `--password`，否则报错。

子命令：

- `gateway call <method> [--params <json>]`
- `gateway health`
- `gateway status`
- `gateway probe`
- `gateway discover`
- `gateway install|uninstall|start|stop|restart`
- `gateway run`

常用 RPC：

- `config.apply`（验证、写入配置、重启并唤醒）
- `config.patch`（合并部分更新、重启并唤醒）
- `update.run`（运行更新、重启并唤醒）

提示：直接调用 `config.set`/`config.apply`/`config.patch` 时，若已有配置，建议传入 `baseHash`（来自 `config.get`）。

## 模型

查看 [/concepts/models](/concepts/models) 获取回退机制及扫描策略。

Anthropic setup-token（支持）：

```bash
claude setup-token
openclaw models auth setup-token --provider anthropic
openclaw models status
```

政策提示：此为技术兼容。Anthropic 以前限制 Claude Code 以外的部分订阅使用；在生产环境使用 setup-token 前，请确认 Anthropic 当前条款。

### `models`（根命令）

`openclaw models` 相当于 `models status`。

根选项：

- `--status-json`（等同于 `models status --json`）
- `--status-plain`（等同于 `models status --plain`）

### `models list`

选项：

- `--all`
- `--local`
- `--provider <name>`
- `--json`
- `--plain`

### `models status`

选项：

- `--json`
- `--plain`
- `--check`（退出码：1 = 过期/缺失，2 = 将过期）
- `--probe`（实时探测已配置认证配置文件）
- `--probe-provider <name>`
- `--probe-profile <id>`（可重复或逗号分隔）
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`

始终包含认证总览及认证存储中配置文件的 OAuth 到期状态。

`--probe` 会发起实时请求（可能消耗令牌并遭遇限流）。

### `models set <model>`

设置 `agents.defaults.model.primary`。

### `models set-image <model>`

设置 `agents.defaults.imageModel.primary`。

### `models aliases list|add|remove`

选项：

- `list`：`--json`，`--plain`
- `add <alias> <model>`
- `remove <alias>`

### `models fallbacks list|add|remove|clear`

选项：

- `list`：`--json`，`--plain`
- `add <model>`
- `remove <model>`
- `clear`

### `models image-fallbacks list|add|remove|clear`

选项：

- `list`：`--json`，`--plain`
- `add <model>`
- `remove <model>`
- `clear`

### `models scan`

选项：

- `--min-params <b>`
- `--max-age-days <days>`
- `--provider <name>`
- `--max-candidates <n>`
- `--timeout <ms>`
- `--concurrency <n>`
- `--no-probe`
- `--yes`
- `--no-input`
- `--set-default`
- `--set-image`
- `--json`

### `models auth add|setup-token|paste-token`

选项：

- `add`：交互式鉴权辅助
- `setup-token`：`--provider <name>`（默认 `anthropic`）、`--yes`
- `paste-token`：`--provider <name>`，`--profile-id <id>`，`--expires-in <duration>`

### `models auth order get|set|clear`

选项：

- `get`：`--provider <name>`，`--agent <id>`，`--json`
- `set`：`--provider <name>`，`--agent <id>`，`<profileIds...>`
- `clear`：`--provider <name>`，`--agent <id>`

## 系统

### `system event`

入队系统事件，并可选触发心跳（Gateway RPC）。

必需：

- `--text <text>`

选项：

- `--mode <now|next-heartbeat>`
- `--json`
- `--url`、`--token`、`--timeout`、`--expect-final`

### `system heartbeat last|enable|disable`

心跳控制（Gateway RPC）。

选项：

- `--json`
- `--url`、`--token`、`--timeout`、`--expect-final`

### `system presence`

列出系统在线状态条目（Gateway RPC）。

选项：

- `--json`
- `--url`、`--token`、`--timeout`、`--expect-final`

## 定时任务（Cron）

管理计划任务（Gateway RPC）。详见 [/automation/cron-jobs](/automation/cron-jobs)。

子命令：

- `cron status [--json]`
- `cron list [--all] [--json]`（默认表格输出；使用 `--json` 获取原始数据）
- `cron add`（别名：`create`；需带 `--name` 且仅能带一个 `--at` | `--every` | `--cron`，以及一个负载 `--system-event` | `--message`）
- `cron edit <id>`（补丁修改字段）
- `cron rm <id>`（别名：`remove`、`delete`）
- `cron enable <id>`
- `cron disable <id>`
- `cron runs --id <id> [--limit <n>]`
- `cron run <id> [--force]`

所有 `cron` 命令均接受 `--url`、`--token`、`--timeout`、`--expect-final`。

## 节点主机

`node` 运行**无头节点主机**或管理其后台服务。详见 [`openclaw node`](/cli/node)。

子命令：

- `node run --host <gateway-host> --port 18789`
- `node status`
- `node install [--host <gateway-host>] [--port <port>] [--tls] [--tls-fingerprint <sha256>] [--node-id <id>] [--display-name <name>] [--runtime <node|bun>] [--force]`
- `node uninstall`
- `node stop`
- `node restart`

认证说明：

- `node` 从环境变量或配置中解析网关认证（无 `--token`/`--password` 标志）：`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`，然后是 `gateway.auth.*`。在本地模式下，节点主机有意忽略 `gateway.remote.*`；在 `gateway.mode=remote` 模式下，`gateway.remote.*` 按照远程优先级规则参与。
- 节点主机认证解析仅识别 `OPENCLAW_GATEWAY_*` 环境变量。

## 节点集群

`nodes` 通过网关管理已配对节点。详见 [/nodes](/nodes)。

常用选项：

- `--url`、`--token`、`--timeout`、`--json`

子命令：

- `nodes status [--connected] [--last-connected <duration>]`
- `nodes describe --node <id|name|ip>`
- `nodes list [--connected] [--last-connected <duration>]`
- `nodes pending`
- `nodes approve <requestId>`
- `nodes reject <requestId>`
- `nodes rename --node <id|name|ip> --name <displayName>`
- `nodes invoke --node <id|name|ip> --command <command> [--params <json>] [--invoke-timeout <ms>] [--idempotency-key <key>]`
- `nodes run --node <id|name|ip> [--cwd <path>] [--env KEY=VAL] [--command-timeout <ms>] [--needs-screen-recording] [--invoke-timeout <ms>] <command...>`（mac 节点或无头节点主机）
- `nodes notify --node <id|name|ip> [--title <text>] [--body <text>] [--sound <name>] [--priority <passive|active|timeSensitive>] [--delivery <system|overlay|auto>] [--invoke-timeout <ms>]`（仅限 mac）

摄像头：

- `nodes camera list --node <id|name|ip>`
- `nodes camera snap --node <id|name|ip> [--facing front|back|both] [--device-id <id>] [--max-width <px>] [--quality <0-1>] [--delay-ms <ms>] [--invoke-timeout <ms>]`
- `nodes camera clip --node <id|name|ip> [--facing front|back] [--device-id <id>] [--duration <ms|10s|1m>] [--no-audio] [--invoke-timeout <ms>]`

画布与屏幕：

- `nodes canvas snapshot --node <id|name|ip> [--format png|jpg|jpeg] [--max-width <px>] [--quality <0-1>] [--invoke-timeout <ms>]`
- `nodes canvas present --node <id|name|ip> [--target <urlOrPath>] [--x <px>] [--y <px>] [--width <px>] [--height <px>] [--invoke-timeout <ms>]`
- `nodes canvas hide --node <id|name|ip> [--invoke-timeout <ms>]`
- `nodes canvas navigate <url> --node <id|name|ip> [--invoke-timeout <ms>]`
- `nodes canvas eval [<js>] --node <id|name|ip> [--js <code>] [--invoke-timeout <ms>]`
- `nodes canvas a2ui push --node <id|name|ip> (--jsonl <path> | --text <text>) [--invoke-timeout <ms>]`
- `nodes canvas a2ui reset --node <id|name|ip> [--invoke-timeout <ms>]`
- `nodes screen record --node <id|name|ip> [--screen <index>] [--duration <ms|10s>] [--fps <n>] [--no-audio] [--out <path>] [--invoke-timeout <ms>]`

定位：

- `nodes location get --node <id|name|ip> [--max-age <ms>] [--accuracy <coarse|balanced|precise>] [--location-timeout <ms>] [--invoke-timeout <ms>]`

## 浏览器

浏览器控制 CLI（专用 Chrome/Brave/Edge/Chromium）。详见 [`openclaw browser`](/cli/browser) 和 [Browser 工具](/tools/browser)。

常用选项：

- `--url`、`--token`、`--timeout`、`--json`
- `--browser-profile <name>`

管理命令：

- `browser status`
- `browser start`
- `browser stop`
- `browser reset-profile`
- `browser tabs`
- `browser open <url>`
- `browser focus <targetId>`
- `browser close [targetId]`
- `browser profiles`
- `browser create-profile --name <name> [--color <hex>] [--cdp-url <url>]`
- `browser delete-profile --name <name>`

查看：

- `browser screenshot [targetId] [--full-page] [--ref <ref>] [--element <selector>] [--type png|jpeg]`
- `browser snapshot [--format aria|ai] [--target-id <id>] [--limit <n>] [--interactive] [--compact] [--depth <n>] [--selector <sel>] [--out <path>]`

操作：

- `browser navigate <url> [--target-id <id>]`
- `browser resize <width> <height> [--target-id <id>]`
- `browser click <ref> [--double] [--button <left|right|middle>] [--modifiers <csv>] [--target-id <id>]`
- `browser type <ref> <text> [--submit] [--slowly] [--target-id <id>]`
- `browser press <key> [--target-id <id>]`
- `browser hover <ref> [--target-id <id>]`
- `browser drag <startRef> <endRef> [--target-id <id>]`
- `browser select <ref> <values...> [--target-id <id>]`
- `browser upload <paths...> [--ref <ref>] [--input-ref <ref>] [--element <selector>] [--target-id <id>] [--timeout-ms <ms>]`
- `browser fill [--fields <json>] [--fields-file <path>] [--target-id <id>]`
- `browser dialog --accept|--dismiss [--prompt <text>] [--target-id <id>] [--timeout-ms <ms>]`
- `browser wait [--time <ms>] [--text <value>] [--text-gone <value>] [--target-id <id>]`
- `browser evaluate --fn <code> [--ref <ref>] [--target-id <id>]`
- `browser console [--level <error|warn|info>] [--target-id <id>]`
- `browser pdf [--target-id <id>]`

## 文档搜索

### `docs [query...]`

搜索实时文档索引。

## 终端用户界面（TUI）

### `tui`

打开连接网关的终端 UI。

选项：

- `--url <url>`
- `--token <token>`
- `--password <password>`
- `--session <key>`
- `--deliver`
- `--thinking <level>`
- `--message <text>`
- `--timeout-ms <ms>`（默认 `agents.defaults.timeoutSeconds`）
- `--history-limit <n>`
