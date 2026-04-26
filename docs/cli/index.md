---
summary: "OpenClaw CLI 索引：命令列表、全局标志以及各命令页面链接"
read_when:
  - 查找合适的 `openclaw` 子命令
  - 查询全局标志或输出样式规则
title: "CLI 参考"
---

`openclaw` 是主 CLI 入口。每个核心命令要么有一个
专门的参考页面，要么在其别名所对应的命令文档中说明；此
索引列出了命令、全局标志以及适用于整个 CLI 的输出样式规则。

## 命令页面

| Area                 | Commands                                                                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Setup and onboarding | [`setup`](/cli/setup) · [`onboard`](/cli/onboard) · [`configure`](/cli/configure) · [`config`](/cli/config) · [`completion`](/cli/completion) · [`doctor`](/cli/doctor) · [`dashboard`](/cli/dashboard)                   |
| Reset and uninstall  | [`backup`](/cli/backup) · [`reset`](/cli/reset) · [`uninstall`](/cli/uninstall) · [`update`](/cli/update)                                                                                                                 |
| Messaging and agents | [`message`](/cli/message) · [`agent`](/cli/agent) · [`agents`](/cli/agents) · [`acp`](/cli/acp) · [`mcp`](/cli/mcp)                                                                                                       |
| Health and sessions  | [`status`](/cli/status) · [`health`](/cli/health) · [`sessions`](/cli/sessions)                                                                                                                                           |
| Gateway and logs     | [`gateway`](/cli/gateway) · [`logs`](/cli/logs) · [`system`](/cli/system)                                                                                                                                                 |
| Models and inference | [`models`](/cli/models) · [`infer`](/cli/infer) · `capability` (alias for [`infer`](/cli/infer)) · [`memory`](/cli/memory) · [`wiki`](/cli/wiki)                                                                          |
| Network and nodes    | [`directory`](/cli/directory) · [`nodes`](/cli/nodes) · [`devices`](/cli/devices) · [`node`](/cli/node)                                                                                                                   |
| Runtime and sandbox  | [`approvals`](/cli/approvals) · `exec-policy` (see [`approvals`](/cli/approvals)) · [`sandbox`](/cli/sandbox) · [`tui`](/cli/tui) · `chat`/`terminal` (aliases for [`tui --local`](/cli/tui)) · [`browser`](/cli/browser) |
| Automation           | [`cron`](/cli/cron) · [`tasks`](/cli/tasks) · [`hooks`](/cli/hooks) · [`webhooks`](/cli/webhooks)                                                                                                                         |
| Discovery and docs   | [`dns`](/cli/dns) · [`docs`](/cli/docs)                                                                                                                                                                                   |
| Pairing and channels | [`pairing`](/cli/pairing) · [`qr`](/cli/qr) · [`channels`](/cli/channels)                                                                                                                                                 |
| Security and plugins | [`security`](/cli/security) · [`secrets`](/cli/secrets) · [`skills`](/cli/skills) · [`plugins`](/cli/plugins) · [`proxy`](/cli/proxy)                                                                                     |
| Legacy aliases       | [`daemon`](/cli/daemon) (gateway service) · [`clawbot`](/cli/clawbot) (namespace)                                                                                                                                         |
| Plugins (optional)   | [`voicecall`](/cli/voicecall) (if installed)                                                                                                                                                                              |

## 全局标志

| Flag                    | Purpose                                                               |
| ----------------------- | --------------------------------------------------------------------- |
| `--dev`                 | 将状态隔离到 `~/.openclaw-dev` 下，并调整默认端口                       |
| `--profile <name>`      | 将状态隔离到 `~/.openclaw-<name>` 下                                   |
| `--container <name>`    | 指定一个命名容器用于执行                                               |
| `--no-color`            | 禁用 ANSI 颜色（也会遵循 `NO_COLOR=1`）                                |
| `--update`              | [`openclaw update`](/cli/update) 的快捷方式（仅适用于源码安装）         |
| `-V`, `--version`, `-v` | 输出版本并退出                                                         |

## 输出模式

- ANSI 颜色和进度指示器仅在 TTY 会话中渲染。
- OSC-8 超链接在支持的地方渲染为可点击链接；否则
  CLI 会回退为纯文本 URL。
- `--json`（以及支持时的 `--plain`）会禁用样式，以获得干净输出。
- 长时间运行的命令会显示进度指示器（支持时使用 OSC 9;4）。

调色板的唯一事实来源：`src/terminal/palette.ts`。

## 命令树

<Accordion title="完整命令树">

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

重点：

- `/status` — 快速诊断。
- `/trace` — 会话作用域内的插件跟踪/调试行。
- `/config` — 持久化配置更改。
- `/debug` — 仅运行时的配置覆盖（内存中，不落盘；需要 `commands.debug: true`）。

## 使用情况跟踪

当 OAuth/API 凭据可用时，`openclaw status --usage` 和 Control UI 会展示提供方的使用量/配额。
数据直接来自提供方的使用量端点，并规范化为 `X% left`。
当前具有使用窗口的提供方：Anthropic、GitHub Copilot、Gemini CLI、OpenAI Codex、MiniMax、
Xiaomi 和 z.ai。

详情请参见 [使用情况跟踪](/concepts/usage-tracking)。

## 相关内容

- [斜杠命令](/tools/slash-commands)
- [配置](/gateway/configuration)
- [环境](/help/environment)
