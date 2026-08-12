---
summary: "OpenClaw CLI 索引：命令列表、全局标志以及各命令页面链接"
read_when:
  - 查找合适的 `openclaw` 子命令时
  - 查看全局标志或输出样式规则时
title: "CLI 参考"
---

`openclaw` 是主要的 CLI 入口点。每个核心命令都有专门的参考页面，或者与其别名的命令一起文档化；此索引列出了适用于整个 CLI 的命令、全局标志和输出样式规则。

按用途设置命令：

- `openclaw setup` 和 `openclaw onboard` 会先验证推理，然后为 Gateway、工作区、频道、技能和健康检查设置启动 OpenClaw。
- `openclaw setup --baseline` 会创建基线配置和工作区，而不会进入引导式入门流程。
- `openclaw configure` 会更改现有设置的指定部分：模型认证、gateway、频道、插件或技能。
- `openclaw channels add` 会在基线存在后配置频道账户；仅选择频道会使用引导式设置，而账户、凭据或 channel-config 标志会为脚本使用直接路径。

## 命令页面

| 区域                         | 命令                                                                                                                                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 设置与引导                   | [`openclaw`](/cli/openclaw) · [`setup`](/cli/setup) · [`onboard`](/cli/onboard) · [`configure`](/cli/configure) · [`config`](/cli/config) · [`completion`](/cli/completion) · [`doctor`](/cli/doctor) · [`dashboard`](/cli/dashboard) |
| 重置、备份与迁移             | [`backup`](/cli/backup) · [`migrate`](/cli/migrate) · [`reset`](/cli/reset) · [`uninstall`](/cli/uninstall) · [`update`](/cli/update)                                                                                                 |
| 消息与代理                   | [`message`](/cli/message) · [`agent`](/cli/agent) · [`agents`](/cli/agents) · [`attach`](/cli/attach) · [`acp`](/cli/acp) · [`mcp`](/cli/mcp)                                                                                         |
| 健康状态与会话               | [`status`](/cli/status) · [`health`](/cli/health) · [`sessions`](/cli/sessions) · [`resume`](/cli/resume) · [`audit`](/cli/audit)                                                                                                     |
| Gateway 与日志               | [`gateway`](/cli/gateway) · [`logs`](/cli/logs) · [`system`](/cli/system)                                                                                                                                                             |
| 模型与推理                   | [`models`](/cli/models) · [`promos`](/cli/promos) · [`infer`](/cli/infer) · `capability`（[`infer`](/cli/infer) 的别名） · [`memory`](/cli/memory) · [`wiki`](/cli/wiki)                                                            |
| 网络与节点                   | [`directory`](/cli/directory) · [`nodes`](/cli/nodes) · [`devices`](/cli/devices) · [`node`](/cli/node) · [`worker`](/cli/worker)                                                                                                     |
| 运行时与沙箱                 | [`approvals`](/cli/approvals) · `exec-policy`（参见 [`approvals`](/cli/approvals)） · [`sandbox`](/cli/sandbox) · [`tui`](/cli/tui) · `chat`/`terminal`（[`tui --local`](/cli/tui) 的别名） · [`browser`](/cli/browser)             |
| 自动化                       | [`cron`](/cli/cron) · [`tasks`](/cli/tasks) · [`hooks`](/cli/hooks) · [`webhooks`](/cli/webhooks) · [`transcripts`](/cli/transcripts)                                                                                                 |
| 发现与文档                   | [`dns`](/cli/dns) · [`docs`](/cli/docs)                                                                                                                                                                                               |
| 配对与渠道                   | [`pairing`](/cli/pairing) · [`qr`](/cli/qr) · [`channels`](/cli/channels)                                                                                                                                                             |
| 安全与插件                   | [`security`](/cli/security) · [`secrets`](/cli/secrets) · [`skills`](/cli/skills) · [`plugins`](/cli/plugins) · [`proxy`](/cli/proxy)                                                                                                 |
| 旧版别名                     | [`daemon`](/cli/daemon)（Gateway 服务） · [`clawbot`](/cli/clawbot)（命名空间）                                                                                                                                                     |
| 插件（可选）                 | [`path`](/cli/path) · [`policy`](/cli/policy) · [`voicecall`](/cli/voicecall) · [`workboard`](/cli/workboard)（如果已安装）                                                                                                          |

## 全局标志

| 标志                    | 用途                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `--dev`                 | 将状态隔离到 `~/.openclaw-dev` 下，默认网关端口为 19001，并调整派生端口              |
| `--profile <name>`      | 将状态隔离到 `~/.openclaw-<name>` 下（`OPENCLAW_STATE_DIR`/`OPENCLAW_CONFIG_PATH`）                  |
| `--container <name>`    | 在名为 `<name>` 的正在运行的 Podman/Docker 容器中运行 CLI（默认：环境变量 `OPENCLAW_CONTAINER`） |
| `--log-level <level>`   | 覆盖文件和控制台输出的全局日志级别                                                 |
| `--no-color`            | 禁用 ANSI 颜色（也会尊重 `NO_COLOR=1`）                                                    |
| `--update`              | [`openclaw update`](/cli/update) 的简写；适用于源码检出和包安装    |
| `-V`, `--version`, `-v` | 输出版本并退出                                                                                  |

命名的 `--profile` 会替换从另一个配置文件继承而来的规范状态和配置路径，包括正在运行的 Gateway 服务。显式自定义的状态目录和配置路径保持不变。

## 输出模式

- ANSI 颜色和进度指示器仅在 TTY 会话中渲染。
- OSC-8 超链接在支持的环境中会渲染为可点击链接；否则 CLI 会回退为纯 URL。
- 对于有界报告命令，`--json` 会为一个 JSON 文档保留 stdout；样式和进度输出会被抑制，警告和诊断信息则保留在 stderr。
- 交互式 UI 和向导、长时间运行的服务器和流、Shell 集成以及纯副作用命令，在没有有意义的报告可返回时可以省略 `--json`。
- 长时间运行的命令会显示进度指示器（在支持时使用 OSC 9;4）。

## 颜色调色板

OpenClaw 为 CLI 输出使用龙虾调色板：

| Token          | Hex       | 用于                                 |
| -------------- | --------- | ------------------------------------ |
| `accent`       | `#FF5A2D` | 标题、标签、主要高亮                 |
| `accentBright` | `#FF7A3D` | 命令名称、强调                       |
| `accentDim`    | `#D14A22` | 次级高亮文本                         |
| `info`         | `#FF8A5B` | 信息性数值                           |
| `success`      | `#2FBF71` | 成功状态                             |
| `warn`         | `#FFB020` | 警告、选项标志、回退                 |
| `error`        | `#E23D2D` | 错误、失败                           |
| `muted`        | `#8B7F77` | 弱化显示、元数据                     |

调色板的唯一事实来源：`packages/terminal-core/src/palette.ts`。

## 命令树

<Accordion title="完整命令树">

此映射涵盖核心命令及其主要子命令。由插件添加的
子命令（例如在 `skills`、`plugins` 和 `wiki` 下）会独立演进；
请运行 `<command> --help` 获取权威的当前列表。

```
openclaw [--dev] [--profile <name>] <command>
  openclaw
  setup
  onboard
  configure
  config
    get
    set
    unset
    file
    schema
    validate
  completion
  doctor
  dashboard
  backup
    create
    verify
  migrate
    list
    plan <provider>
    apply <provider>
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
    wizard
    status
    repair
  channels
    list
    status
    capabilities
    resolve
    logs
    add
    remove
    login
    logout
  directory
    self
    peers list
    groups list|members
  skills
    search
    install
    update
    verify
    workshop list|inspect|propose-create|propose-update|revise|apply|reject|quarantine
    list
    info
    check
  plugins
    list
    search
    inspect
    install
    uninstall
    update
    enable
    disable
    doctor
    build
    validate
    init
    registry
    marketplace list|entries|refresh
  workboard
    list
    create
    show
    dispatch
  memory
    status
    index
    search
  transcripts
    list
    show
    path
  path
    resolve
    find
    set
    validate
    emit
  wiki
    status
    doctor
    init
    compile
    lint
    ingest
    okf import
    search
    get
    apply synthesis|metadata
    bridge import
    unsafe-local import
    chatgpt import|rollback
    obsidian status|search|open|command|daily
  message
    send
    broadcast
    poll
    react
    reactions
    read
    edit
    delete
    pin
    unpin
    pins
    permissions
    search
    thread create|list|reply
    emoji list|upload
    sticker send|upload
    role info|add|remove
    channel info|list
    member info
    voice status
    event list|create
    timeout
    kick
    ban
  agent
  agents
    list
    add
    delete
    bindings
    bind
    unbind
    set-identity
  attach
  acp
  mcp
    serve
    list
    show
    set
    unset
  status
  health
  sessions
    cleanup
  audit
  tasks
    list
    audit
    maintenance
    show
    notify
    cancel
    flow list|show|cancel
  gateway
    call
    usage-cost
    health
    stability
    diagnostics export
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
    auth list|add|login|setup-token|paste-token|paste-api-key|login-github-copilot
    auth order get|set|clear
  promos
    list
    claim <slug>
  infer (别名: capability)
    list
    inspect
    model run|list|inspect|providers|auth login|logout|status
    image generate|edit|describe|describe-many|providers
    audio transcribe|providers
    tts convert|voices|personas|providers|status|enable|disable|set-provider|set-persona
    video generate|describe|providers
    web search|fetch|providers
    embedding create|providers
  sandbox
    list
    recreate
    explain
  cron
    status
    list
    get
    add
    edit
    rm
    enable
    disable
    runs
    run
  nodes
    status
    describe
    list
    pending
    approve
    reject
    rename
    invoke
    notify
    push
    canvas snapshot|present|hide|navigate|eval
    canvas a2ui push|reset
    camera list|snap|clip
    screen record
    location get
  devices
    list
    remove
    clear
    approve
    reject
    rotate
    revoke
  node
    run
    status
    install
    uninstall
    stop
    restart
  worker
  approvals
    get
    set
    allowlist add|remove
  exec-policy
    show
    preset
    set
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
  proxy
    start
    run
    coverage
    sessions
    query
    blob
    purge
  pairing
    list
    approve
  qr
  clawbot
    qr
  docs
  dns
    setup
  resume
  tui
  chat (别名: tui --local)
  terminal (别名: tui --local)
```

插件可以添加额外的顶层命令，例如
[`openclaw workboard`](/cli/workboard) 或 `openclaw voicecall`。

</Accordion>

## 聊天斜杠命令

聊天消息支持 `/...` 命令。参见 [斜杠命令](/tools/slash-commands)。

要点：

- `/status` - 快速诊断。
- `/trace` - 会话范围的插件跟踪/调试行。
- `/config` - 持久化配置更改。
- `/debug` - 仅运行时的配置覆盖（内存中，不写入磁盘；需要 `commands.debug: true`）。

## 使用情况跟踪

`openclaw status --usage` 和 Control UI 会在可用 OAuth/API 凭据时显示提供商的使用情况/配额。数据直接来自提供商的使用情况端点，并被规范化为 `X% left`。当前具有使用窗口的提供商：Anthropic、Gemini CLI、GitHub Copilot、MiniMax、OpenAI Codex、Xiaomi 和 z.ai。

有关详细信息，请参见 [使用情况跟踪](/concepts/usage-tracking)。

## 相关内容

- [斜杠命令](/tools/slash-commands)
- [配置](/gateway/configuration)
- [环境](/help/environment)
