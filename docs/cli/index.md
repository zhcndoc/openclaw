---
summary: "OpenClaw CLI 索引：命令列表、全局标志以及各命令页面链接"
read_when:
  - 查找合适的 `openclaw` 子命令时
  - 查看全局标志或输出样式规则时
title: "CLI 参考"
---

`openclaw` 是主 CLI 入口。每个核心命令要么有专门的参考页面，要么与其别名对应的命令一起文档化；此索引列出了命令、全局标志以及适用于整个 CLI 的输出样式规则。

按用途使用以下 setup 命令：

- `openclaw setup` 会创建基础配置和工作区，而不会走完整的引导式入门流程。
- `openclaw onboard` 是面向 gateway、模型认证、工作区、频道、技能和健康检查的完整首次运行引导流程。
- `openclaw configure` 会修改现有设置中的指定部分，例如模型认证、gateway、频道、插件或技能。
- `openclaw channels add` 在基础配置存在后配置频道账户；不带标志运行时会进入引导式频道设置，带有频道特定标志时可用于脚本。

## Command pages

| 区域                 | 命令                                                                                                                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Setup and onboarding | [`crestodian`](/cli/crestodian) · [`setup`](/cli/setup) · [`onboard`](/cli/onboard) · [`configure`](/cli/configure) · [`config`](/cli/config) · [`completion`](/cli/completion) · [`doctor`](/cli/doctor) · [`dashboard`](/cli/dashboard) |
| Reset and uninstall  | [`backup`](/cli/backup) · [`reset`](/cli/reset) · [`uninstall`](/cli/uninstall) · [`update`](/cli/update)                                                                                                                                 |
| Messaging and agents | [`message`](/cli/message) · [`agent`](/cli/agent) · [`agents`](/cli/agents) · [`acp`](/cli/acp) · [`mcp`](/cli/mcp)                                                                                                                       |
| Health and sessions  | [`status`](/cli/status) · [`health`](/cli/health) · [`sessions`](/cli/sessions)                                                                                                                                                           |
| Gateway and logs     | [`gateway`](/cli/gateway) · [`logs`](/cli/logs) · [`system`](/cli/system)                                                                                                                                                                 |
| Models and inference | [`models`](/cli/models) · [`infer`](/cli/infer) · `capability`（[`infer`](/cli/infer) 的别名）· [`memory`](/cli/memory) · [`commitments`](/cli/commitments) · [`wiki`](/cli/wiki)                                                      |
| Network and nodes    | [`directory`](/cli/directory) · [`nodes`](/cli/nodes) · [`devices`](/cli/devices) · [`node`](/cli/node)                                                                                                                                   |
| Runtime and sandbox  | [`approvals`](/cli/approvals) · `exec-policy`（参见 [`approvals`](/cli/approvals)）· [`sandbox`](/cli/sandbox) · [`tui`](/cli/tui) · `chat`/`terminal`（[`tui --local`](/cli/tui) 的别名）· [`browser`](/cli/browser)                 |
| Automation           | [`cron`](/cli/cron) · [`tasks`](/cli/tasks) · [`hooks`](/cli/hooks) · [`webhooks`](/cli/webhooks)                                                                                                                                         |
| Discovery and docs   | [`dns`](/cli/dns) · [`docs`](/cli/docs)                                                                                                                                                                                                   |
| Pairing and channels | [`pairing`](/cli/pairing) · [`qr`](/cli/qr) · [`channels`](/cli/channels)                                                                                                                                                                 |
| Security and plugins | [`security`](/cli/security) · [`secrets`](/cli/secrets) · [`skills`](/cli/skills) · [`plugins`](/cli/plugins) · [`proxy`](/cli/proxy)                                                                                                     |
| Legacy aliases       | [`daemon`](/cli/daemon)（gateway 服务）· [`clawbot`](/cli/clawbot)（命名空间）                                                                                                                                                         |
| Plugins (optional)   | [`path`](/cli/path) · [`voicecall`](/cli/voicecall)（如果已安装）                                                                                                                                                                        |

## 全局标志

| 标志                    | 作用                                                               |
| ----------------------- | ------------------------------------------------------------------ |
| `--dev`                 | 将状态隔离到 `~/.openclaw-dev` 下，并调整默认端口                   |
| `--profile <name>`      | 将状态隔离到 `~/.openclaw-<name>` 下                               |
| `--container <name>`    | 目标执行到指定名称的容器                                           |
| `--no-color`            | 禁用 ANSI 颜色（也会遵循 `NO_COLOR=1`）                             |
| `--update`              | [`openclaw update`](/cli/update) 的简写（仅适用于源码安装）         |
| `-V`, `--version`, `-v` | 打印版本并退出                                                     |

## 输出模式

- ANSI 颜色和进度指示器仅在 TTY 会话中渲染。
- OSC-8 超链接会在支持的情况下渲染为可点击链接；否则 CLI 会回退为纯 URL。
- `--json`（以及受支持时的 `--plain`）会禁用样式以获得干净输出。
- 长时间运行的命令会显示进度指示器（支持时使用 OSC 9;4）。

调色板的唯一来源：`src/terminal/palette.ts`。

## 命令树

<Accordion title="完整命令树">

```
openclaw [--dev] [--profile <name>] <command>
  crestodian
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
  path
    resolve
    find
    set
    validate
    emit
  commitments
    list
    dismiss
  wiki
    status
    doctor
    init
    ingest
    compile
    lint
    search
    get
    apply
    bridge import
    unsafe-local import
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
  infer (alias: capability)
    list
    inspect
    model run|list|inspect|providers|auth login|logout|status
    image generate|edit|describe|describe-many|providers
    audio transcribe|providers
    tts convert|voices|providers|status|enable|disable|set-provider
    video generate|describe|providers
    web search|fetch|providers
    embedding create|providers
    auth add|login|login-github-copilot|setup-token|paste-token
    auth order get|set|clear
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
  tui
  chat (alias: tui --local)
  terminal (alias: tui --local)
```

插件可以添加额外的顶级命令（例如 `openclaw voicecall`）。

</Accordion>

## 聊天斜杠命令

聊天消息支持 `/...` 命令。参见 [斜杠命令](/tools/slash-commands)。

要点：

- `/status` — 快速诊断。
- `/trace` — 会话范围的插件跟踪/调试行。
- `/config` — 持久化的配置更改。
- `/debug` — 仅运行时配置覆盖（仅驻留内存，不写入磁盘；需要 `commands.debug: true`）。

## 使用情况跟踪

当 OAuth/API 凭据可用时，`openclaw status --usage` 和 Control UI 会展示提供商的使用量/额度。数据直接来自提供商的使用情况
端点，并归一化为 `X% left`。具有当前使用
窗口的提供商：Anthropic、GitHub Copilot、Gemini CLI、OpenAI Codex、MiniMax、
Xiaomi 和 z.ai。

有关详细信息，请参见 [使用情况跟踪](/concepts/usage-tracking)。

## 相关内容

- [斜杠命令](/tools/slash-commands)
- [配置](/gateway/configuration)
- [环境](/help/environment)
