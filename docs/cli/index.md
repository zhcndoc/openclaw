---
summary: "OpenClaw CLI 索引：命令列表、全局标志以及各命令页面链接"
read_when:
  - "查找合适的 `openclaw` 子命令时"
  - "查看全局标志或输出样式规则时"
title: "CLI 参考"
---

`openclaw` 是主要的 CLI 入口点。每个核心命令都有一个专用的参考页或与其别名的命令一起记录。该索引列出了适用于 CLI 的命令、全局标志和输出样式规则。

按用途设置命令：

- `openclaw setup` 和 `openclaw onboard` 会先验证推理，然后为 Gateway、工作区、频道、技能和健康检查设置启动 OpenClaw。
- `openclaw setup --baseline` 会创建基线配置和工作区，而不会进入引导式入门流程。
- `openclaw configure` 会更改现有设置的指定部分：模型认证、gateway、频道、插件或技能。
- `openclaw channels add` 在基线存在后配置通道帐户。仅通道选择就使用引导设置。帐户、凭据或通道配置标志使用脚本的直接路径。

<a id="status" />

## <a id="command-pages"></a> 命令页面

| 区域                         | 命令                                                                                                                                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 设置与引导         | [`openclaw`](/cli/openclaw) · [`setup`](/cli/setup) · [`onboard`](/cli/onboard) · [`configure`](/cli/configure) · [`config`](/cli/config) · [`completion`](/cli/completion) · [`doctor`](/cli/doctor) · [`dashboard`](/cli/dashboard) |
| 重置、备份与迁移 | [`backup`](/cli/backup) · [`database`](/cli#database) · [`migrate`](/cli/migrate) · [`reset`](/cli/reset) · [`uninstall`](/cli/uninstall) · [`update`](/cli/update)                                                                   |
| 消息与代理         | [`message`](/cli/message) · [`agent`](/cli/agent) · [`agents`](/cli/agents) · [`claws`](/cli/claws) · [`attach`](/cli/attach) · [`acp`](/cli/acp) · [`mcp`](/cli/mcp)                                                                 |
| 健康状态与会话          | [`status`](/cli/status) · [`health`](/cli/health) · [`triage`](/cli/triage) · [`sessions`](/cli/sessions) · [`resume`](/cli/resume) · [`audit`](/cli/audit)                                                                           |
| Gateway 与日志             | [`gateway`](/cli/gateway) · [`logs`](/cli/logs) · [`system`](/cli/system)                                                                                                                                                             |
| 模型与推理         | [`models`](/cli/models) · [`promos`](/cli/promos) · [`infer`](/cli/infer) · `capability`（[`infer`](/cli/infer) 的别名） · [`memory`](/cli/memory) · [`wiki`](/cli/wiki)                                                            |
| 网络与节点            | [`connect`](/cli/connect) · [`directory`](/cli/directory) · [`nodes`](/cli/nodes) · [`node`](/cli/node) · [`worker`](/cli/worker)                                                                                                     |
| 运行时与沙箱          | [`approvals`](/cli/approvals) · `exec-policy`（参见 [`approvals`](/cli/approvals)） · [`sandbox`](/cli/sandbox) · [`tui`](/cli/tui) · `chat`/`terminal`（[`tui --local`](/cli/tui) 的别名） · [`browser`](/cli/browser)             |
| 工作树                    | [`worktrees`](/concepts/managed-worktrees)                                                                                                                                                                                            |
| 自动化                   | [`cron`](/cli/cron)（别名 `automations`）·[`hooks`](/cli/hooks)·[`webhooks`](/cli/webhooks)·[`transcripts`](/cli/transcripts)                                                                                                   |
| 发现与文档           | [`dns`](/cli/dns) · [`docs`](/cli/docs)                                                                                                                                                                                               |
| 配对与渠道         | [`pairing`](/cli/pairing) · [`qr`](/cli/qr) · [`devices`](/cli/devices) · [`channels`](/cli/channels) · [`users`](/cli/users)                                                                                                         |
| 安全与插件         | [`security`](/cli/security) · [`secrets`](/cli/secrets) · [`skills`](/cli/skills) · [`plugins`](/cli/plugins) · [`proxy`](/cli/proxy)                                                                                                 |
| 旧版别名               | [`daemon`](/cli/daemon)（Gateway 服务） · [`clawbot`](/cli/clawbot)（命名空间）                                                                                                                                                     |
| 插件（可选）           | [`file-transfer`](/cli/file-transfer) · [`path`](/cli/path) · [`policy`](/cli/policy) · [`voicecall`](/cli/voicecall) · [`workboard`](/cli/workboard)（如果已安装）                                                                  |

## <a id="global-flags"></a> 全局标志

| 标志                    | 用途                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `--dev`                 | 将状态隔离到 `~/.openclaw-dev` 下，默认网关端口为 19001，并调整派生端口              |
| `--profile <name>`      | 将状态隔离到 `~/.openclaw-<name>` 下（`OPENCLAW_STATE_DIR`/`OPENCLAW_CONFIG_PATH`）                  |
| `--container <name>`    | 在名为 `<name>` 的正在运行的 Podman/Docker 容器中运行 CLI（默认值：env `OPENCLAW_CONTAINER`） |
| `--log-level <level>`   | 覆盖文件和控制台输出的全局日志级别                                                 |
| `--no-color`            | 禁用 ANSI 颜色（也会尊重 `NO_COLOR=1`）                                                    |
| `--update`              | [`openclaw update`](/cli/update) 的简写；适用于源码检出和包安装    |
| `-V`, `--version`, `-v` | 输出版本并退出                                                                                  |

将命令特定选项放在命令名称后面，例如 `openclaw status --json`。全局选项（例如 `--profile`）可以位于该命令之前。

未知的根选项失败，并出现选项错误和帮助提示，而不是启动载入或 TUI。

名为 `--profile` 替换从另一个配置文件继承的标准状态和配置路径，包括正在运行的网关服务。显式定制的状态目录和配置路径保持不变。

使用 `--` 停止选项解析。命令字仍会在其后发送：例如，`openclaw -- config get gateway.port` 读取配置的端口。 `--` 之后的标记（例如 `--help`）是位置参数。

## <a id="output-modes"></a> 输出模式

- ANSI 颜色和进度指示器仅在 TTY 会话中渲染。
- OSC-8 超链接在支持的情况下呈现为可单击链接。否则，CLI 将打印纯 URL。
- 在有界​​报告命令上，`--json` 为一个 JSON 文档保留标准输出。 CLI 抑制样式和进度输出。警告和诊断保留在 stderr 上。
- 交互式 UI 和向导、长时间运行的服务器和流、shell 集成以及纯副作用命令在没有要返回的有意义的报告时可能会忽略 `--json`。
- 长时间运行的命令会显示进度指示器（如果支持，则为 `OSC 9;4`）。
- 连接失败给出简短的解释和状态检查命令。如果请求可能已完成，请在重试之前检查其结果。意外故障指向恢复命令；重新运行时使用 `OPENCLAW_DEBUG=1` 以包含诊断。 JSON 故障保留其诊断字段。
- 更新失败将其原因保留在stderr上，包括在JSON模式下。
- 在 stderr 上报告资源清理失败，但不替换命令的结果。超过报告截止日期的清理工作仍将被跟踪并报告任何以后的失败。

### <a id="json-failures"></a> JSON 故障

成功的 JSON 有效负载仍然是特定于命令的。当 JSON 输出模式下的命令失败时，它会以非零值退出，并使用以下信封将一个 JSON 文档写入 stdout：

```json
{
  "ok": false,
  "error": {
    "type": "cli_error",
    "message": "Description of the failure"
  }
}
```

命令可以在此信封旁边添加特定于域的字段，例如每个项目的结果。在网关接受运行后失败的网关支持的代理轮流还会在信封旁边记录接受的 `runId` 和 `origin: "gateway"`，以便脚本可以报告正在进行的运行。失败消息已被清理。人类可读的诊断也可以写入 stderr，因此脚本应该解析 stdout 并仍然检查退出状态。

载入和设置失败将 `phase` 和顶层 `message` 保留在信封旁边。使用 `error.message` 进行共享故障描述，使用 `phase` 进行特定于入门引导的恢复。

## <a id="color-palette"></a> 颜色调色板

OpenClaw 为 CLI 输出使用龙虾调色板：

| 令牌          | 十六进制       | 用于                             |
| -------------- | --------- | ------------------------------------ |
| `accent`       | `#FF5A2D` | 标题、标签、主要高亮 |
| `accentBright` | `#FF7A3D` | 命令名称、强调              |
| `accentDim`    | `#D14A22` | 次级高亮文本             |
| `info`         | `#FF8A5B` | 信息性数值                 |
| `success`      | `#2FBF71` | 成功状态                       |
| `warn`         | `#FFB020` | 警告、选项标志、回退    |
| `error`        | `#E23D2D` | 错误、失败                     |
| `muted`        | `#8B7F77` | 弱化显示、元数据                |

调色板的唯一事实来源：`packages/terminal-core/src/palette.ts`。

## <a id="command-tree"></a> 命令树

<Accordion id="full-command-tree" title="完整的命令树">

该映射涵盖了核心命令及其主要子命令。添加插件的子命令（例如在 `skills`、`plugins` 和 `wiki` 下）独立发展。运行 `<command> --help` 以获得权​​威的最新列表。

```
openclaw [--dev] [--profile <name>] <command>
  openclaw
  setup
  onboard
  configure
  config
    get
    set
    patch
    unset
    file
    schema
    validate
  database
    port
    preflight
    preflight-agent
    verify-preservation
    ownership
      status
      claim
  completion
  doctor
  triage
  dashboard
  backup
    create
    verify
    restore
    sqlite
      create
      list
      verify
      restore
    git
      init
      create
      log
      verify
      restore
    enable
    disable
  migrate
    list
    plan <provider>
    apply <provider>
  security
    audit
  secrets
    reload
    store
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
    dead-letters list|resubmit
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
    workshop list|changes|show|archive|restore
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
    pack
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
  worktrees
    list
    create
    remove
    restore
    gc
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
  infer (alias: capability)
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
    show
    add
    edit
    rm
    enable
    disable
    runs
    run
    scratch
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
    canvas present|hide|navigate
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
  users
    list
    link-email <email> --to <profileId>
    merge <sourceProfileId> --into <targetProfileId>
  node
    run
    status
    install
    uninstall
    stop
    restart
  connect
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
  chat (alias: tui --local)
  terminal (alias: tui --local)
```

插件可以添加额外的顶层命令，例如 [`openclaw workboard`](/cli/workboard) 或 `openclaw voicecall`。

</Accordion>

## <a id="database"></a> 数据库

`openclaw database` 提供模式预检、保存验证、共享状态所有权和离线工作板引擎移植。有关兼容性契约，请参阅 [ 数据库架构](/reference/database-schemas)。

```bash
openclaw database port --to <postgres|sqlite> [--dry-run] [--json]
openclaw database port --resume <manifest> [--json]
openclaw database port --rollback <manifest> [--json]
```

首先停止网关和嵌入式代理。 `--to` 选择所有现有已注册工作板存储的目标；共享状态和代理数据库保留在 SQLite 上。 `--dry-run` 检查只读先决条件，而不创建迁移工件。恢复需要 `<stateDir>/recovery/database-port/manifest.json` 处的活动清单； `--resume` 和 `--rollback` 是互斥的，不能与 `--to` 或 `--dry-run` 组合。

完成的移植保留了准确的原始捕获和 `<stateDir>/recovery/database-port/<operation-id>/` 下的存档清单。要在返回 SQLite 时保留稍后的写入，请运行新的 `--to sqlite` 端口；已完成的清单不是撤消机制。在原始包管理器降级之前进行反向移植。有关备份内容、中断恢复和重新启动指南，请参阅 [port runbook](/reference/database-engines#port-existing-workboard-stores)。

## <a id="chat-slash-commands"></a> 聊天斜杠命令

聊天消息支持 `/...` 命令。参见 [斜杠命令](/tools/slash-commands)。

要点：

- `/status` - 快速诊断。
- `/trace` - 会话范围的插件 trace/debug 行。
- `/config` - 持久化配置更改。
- `/debug` - 仅运行时配置覆盖内存中，而不是磁盘上。需要 `commands.debug: true`。

## <a id="usage-tracking"></a> 使用情况跟踪

当 OAuth/API 凭证可用时，`openclaw status --usage` 和 Control UI 表面提供程序 usage/quota。数据直接来自提供商使用端点，并标准化为 `X% left`。当前使用窗口的提供商：Anthropic、Gemini、CLI、GitHub Copilot、MiniMax、OpenAI Codex、小米和z.ai.

有关详细信息，请参见 [使用情况跟踪](/concepts/usage-tracking)。

## <a id="related"></a> 相关内容

- [斜杠命令](/tools/slash-commands)
- [配置](/gateway/configuration)
- [环境](/help/environment)
