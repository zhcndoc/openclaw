---
summary: "OpenClaw Gateway CLI (`openclaw gateway`) — 运行、查询和发现网关"
read_when:
  - 从 CLI 运行 Gateway（开发或服务器）
  - 调试 Gateway 认证、绑定模式和连通性
  - 通过 Bonjour 发现网关（本地 + 广域 DNS-SD）
title: "Gateway"
sidebarTitle: "Gateway"
---

Gateway 是 OpenClaw 的 WebSocket 服务器（channels、nodes、sessions、hooks）。本页中的子命令位于 `openclaw gateway …` 下。

<CardGroup cols={3}>
  <Card title="Bonjour discovery" href="/gateway/bonjour">
    本地 mDNS + 广域 DNS-SD 设置。
  </Card>
  <Card title="Discovery overview" href="/gateway/discovery">
    OpenClaw 如何发布和查找网关。
  </Card>
  <Card title="Configuration" href="/gateway/configuration">
    顶层 gateway 配置键。
  </Card>
</CardGroup>

## 运行 Gateway

运行一个本地 Gateway 进程：

```bash
openclaw gateway
```

前台别名：

```bash
openclaw gateway run
```

<AccordionGroup>
  <Accordion title="Startup behavior">
    - 默认情况下，除非在 `~/.openclaw/openclaw.json` 中设置了 `gateway.mode=local`，否则 Gateway 会拒绝启动。临时/开发运行请使用 `--allow-unconfigured`。
    - `openclaw onboard --mode local` 和 `openclaw setup` 预计会写入 `gateway.mode=local`。如果文件存在但缺少 `gateway.mode`，应将其视为损坏或被覆盖的配置，并进行修复，而不是隐式地假定为本地模式。
    - 如果文件存在且缺少 `gateway.mode`，Gateway 会将其视为可疑的配置损坏，并拒绝为你“猜测为本地模式”。
    - 未经认证而绑定到 loopback 之外会被阻止（安全护栏）。
    - 在获得授权时，`SIGUSR1` 会触发进程内重启（`commands.restart` 默认启用；将 `commands.restart: false` 可阻止手动重启，而 gateway 工具/配置 apply/update 仍然允许）。
    - `SIGINT`/`SIGTERM` 处理器会停止 gateway 进程，但不会恢复任何自定义终端状态。如果你用 TUI 或 raw-mode 输入包装 CLI，请在退出前恢复终端。

  </Accordion>
</AccordionGroup>

### 选项

<ParamField path="--port <port>" type="number">
  WebSocket 端口（默认来自配置/环境；通常为 `18789`）。
</ParamField>
<ParamField path="--bind <loopback|lan|tailnet|auto|custom>" type="string">
  监听绑定模式。
</ParamField>
<ParamField path="--auth <token|password>" type="string">
  认证模式覆盖。
</ParamField>
<ParamField path="--token <token>" type="string">
  令牌覆盖（同时为该进程设置 `OPENCLAW_GATEWAY_TOKEN`）。
</ParamField>
<ParamField path="--password <password>" type="string">
  密码覆盖。
</ParamField>
<ParamField path="--password-file <path>" type="string">
  从文件读取 gateway 密码。
</ParamField>
<ParamField path="--tailscale <off|serve|funnel>" type="string">
  通过 Tailscale 暴露 Gateway。
</ParamField>
<ParamField path="--tailscale-reset-on-exit" type="boolean">
  在关闭时重置 Tailscale serve/funnel 配置。
</ParamField>
<ParamField path="--allow-unconfigured" type="boolean">
  允许在配置中没有 `gateway.mode=local` 的情况下启动 gateway。仅绕过临时/开发引导的启动保护；不会写入或修复配置文件。
</ParamField>
<ParamField path="--dev" type="boolean">
  如果缺失则创建开发配置 + 工作区（跳过 BOOTSTRAP.md）。
</ParamField>
<ParamField path="--reset" type="boolean">
  重置开发配置 + 凭据 + 会话 + 工作区（需要 `--dev`）。
</ParamField>
<ParamField path="--force" type="boolean">
  启动前杀掉所选端口上的任何现有监听器。
</ParamField>
<ParamField path="--verbose" type="boolean">
  详细日志。
</ParamField>
<ParamField path="--cli-backend-logs" type="boolean">
  仅在控制台显示 CLI 后端日志（并启用 stdout/stderr）。
</ParamField>
<ParamField path="--ws-log <auto|full|compact>" type="string" default="auto">
  WebSocket 日志样式。
</ParamField>
<ParamField path="--compact" type="boolean">
  `--ws-log compact` 的别名。
</ParamField>
<ParamField path="--raw-stream" type="boolean">
  将原始模型流事件记录为 jsonl。
</ParamField>
<ParamField path="--raw-stream-path <path>" type="string">
  原始流 jsonl 路径。
</ParamField>

<Warning>
行内 `--password` 可能会暴露在本地进程列表中。建议使用 `--password-file`、环境变量或由 SecretRef 支持的 `gateway.auth.password`。
</Warning>

### 启动性能分析

- 设置 `OPENCLAW_GATEWAY_STARTUP_TRACE=1` 可在 Gateway 启动期间记录各阶段耗时，包括每个阶段的 `eventLoopMax` 延迟，以及已安装索引、清单注册表、启动规划和 owner-map 工作的插件查找表耗时。
- 运行 `pnpm test:startup:gateway -- --runs 5 --warmup 1` 可对 Gateway 启动进行基准测试。该基准会记录首次进程输出、`/healthz`、`/readyz`、启动跟踪耗时、事件循环延迟以及插件查找表耗时细节。

## 查询正在运行的 Gateway

所有查询命令都使用 WebSocket RPC。

<Tabs>
  <Tab title="Output modes">
    - 默认：人类可读（TTY 中带颜色）。
    - `--json`：机器可读 JSON（无样式/无 spinner）。
    - `--no-color`（或 `NO_COLOR=1`）：禁用 ANSI，同时保留人类布局。

  </Tab>
  <Tab title="Shared options">
    - `--url <url>`：Gateway WebSocket URL。
    - `--token <token>`：Gateway 令牌。
    - `--password <password>`：Gateway 密码。
    - `--timeout <ms>`：超时/预算（因命令而异）。
    - `--expect-final`：等待“final”响应（agent 调用）。

  </Tab>
</Tabs>

<Note>
当你设置 `--url` 时，CLI 不会回退到配置或环境凭据。请显式传入 `--token` 或 `--password`。缺少显式凭据会报错。
</Note>

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

HTTP `/healthz` 端点是存活探针：只要服务器能响应 HTTP，就会返回。HTTP `/readyz` 端点更严格，在启动 sidecar、channels 或已配置 hooks 仍在就绪过程中时会保持红色。本地或已认证的详细就绪响应会包含一个 `eventLoop` 诊断块，其中包括事件循环延迟、事件循环利用率、CPU 核心比率以及 `degraded` 标志。

### `gateway usage-cost`

从会话日志中获取使用成本摘要。

```bash
openclaw gateway usage-cost
openclaw gateway usage-cost --days 7
openclaw gateway usage-cost --json
```

<ParamField path="--days <days>" type="number" default="30">
  要包含的天数。
</ParamField>

### `gateway stability`

从正在运行的 Gateway 获取最近的诊断稳定性记录器。

```bash
openclaw gateway stability
openclaw gateway stability --type payload.large
openclaw gateway stability --bundle latest
openclaw gateway stability --bundle latest --export
openclaw gateway stability --json
```

<ParamField path="--limit <limit>" type="number" default="25">
  要包含的最近事件最大数量（最多 `1000`）。
</ParamField>
<ParamField path="--type <type>" type="string">
  按诊断事件类型过滤，例如 `payload.large` 或 `diagnostic.memory.pressure`。
</ParamField>
<ParamField path="--since-seq <seq>" type="number">
  仅包含某个诊断序号之后的事件。
</ParamField>
<ParamField path="--bundle [path]" type="string">
  读取已持久化的稳定性 bundle，而不是调用正在运行的 Gateway。使用 `--bundle latest`（或仅 `--bundle`）获取状态目录下最新的 bundle，或者直接传入 bundle JSON 路径。
</ParamField>
<ParamField path="--export" type="boolean">
  写出一个可共享的支持诊断 zip，而不是打印稳定性细节。
</ParamField>
<ParamField path="--output <path>" type="string">
  `--export` 的输出路径。
</ParamField>

<AccordionGroup>
  <Accordion title="Privacy and bundle behavior">
    - 记录保留运行时元数据：事件名称、计数、字节大小、内存读数、队列/会话状态、channel/plugin 名称，以及已脱敏的会话摘要。它们不会保留聊天文本、webhook 正文、工具输出、原始请求或响应正文、令牌、cookie、密钥值、主机名或原始会话 id。设置 `diagnostics.enabled: false` 可完全禁用记录器。
    - 在 Gateway 致命退出、关闭超时以及重启启动失败时，如果记录器有事件，OpenClaw 会将相同的诊断快照写入 `~/.openclaw/logs/stability/openclaw-stability-*.json`。使用 `openclaw gateway stability --bundle latest` 检查最新 bundle；`--limit`、`--type` 和 `--since-seq` 也适用于 bundle 输出。

  </Accordion>
</AccordionGroup>

### `gateway diagnostics export`

写出一个本地诊断 zip，设计用于附加到 bug 报告中。关于隐私模型和 bundle 内容，请参见 [Diagnostics Export](/gateway/diagnostics)。

```bash
openclaw gateway diagnostics export
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
openclaw gateway diagnostics export --json
```

<ParamField path="--output <path>" type="string">
  输出 zip 路径。默认为状态目录下的支持导出。
</ParamField>
<ParamField path="--log-lines <count>" type="number" default="5000">
  要包含的最大已净化日志行数。
</ParamField>
<ParamField path="--log-bytes <bytes>" type="number" default="1000000">
  要检查的最大日志字节数。
</ParamField>
<ParamField path="--url <url>" type="string">
  用于健康快照的 Gateway WebSocket URL。
</ParamField>
<ParamField path="--token <token>" type="string">
  用于健康快照的 Gateway 令牌。
</ParamField>
<ParamField path="--password <password>" type="string">
  用于健康快照的 Gateway 密码。
</ParamField>
<ParamField path="--timeout <ms>" type="number" default="3000">
  状态/健康快照超时。
</ParamField>
<ParamField path="--no-stability-bundle" type="boolean">
  跳过已持久化稳定性 bundle 的查找。
</ParamField>
<ParamField path="--json" type="boolean">
  以 JSON 形式打印写入路径、大小和清单。
</ParamField>

导出内容包含清单、Markdown 摘要、配置形状、已净化的配置细节、已净化的日志摘要、已净化的 Gateway 状态/健康快照，以及（如果存在）最新的稳定性 bundle。

它 предназначается 用于共享。它保留有助于调试的运行细节，例如安全的 OpenClaw 日志字段、子系统名称、状态码、持续时间、已配置模式、端口、插件 id、provider id、非密钥功能设置以及已脱敏的运行日志消息。它会省略或脱敏聊天文本、webhook 正文、工具输出、凭据、cookie、账户/消息标识符、提示/指令文本、主机名和密钥值。当一条类似 LogTape 风格的消息看起来像用户/聊天/工具载荷文本时，导出只保留“已省略该消息”以及其字节数。

### `gateway status`

`gateway status` 会显示 Gateway 服务（launchd/systemd/schtasks），以及一个可选的连通性/认证能力探测。

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

<ParamField path="--url <url>" type="string">
  添加一个显式探测目标。已配置的远程和 localhost 仍会被探测。
</ParamField>
<ParamField path="--token <token>" type="string">
  用于探测的令牌认证。
</ParamField>
<ParamField path="--password <password>" type="string">
  用于探测的密码认证。
</ParamField>
<ParamField path="--timeout <ms>" type="number" default="10000">
  探测超时。
</ParamField>
<ParamField path="--no-probe" type="boolean">
  跳过连通性探测（仅服务视图）。
</ParamField>
<ParamField path="--deep" type="boolean">
  也扫描系统级服务。
</ParamField>
<ParamField path="--require-rpc" type="boolean">
  将默认连通性探测升级为读探测，并在该读探测失败时以非零退出。不能与 `--no-probe` 组合使用。
</ParamField>

<AccordionGroup>
  <Accordion title="Status semantics">
    - 即使本地 CLI 配置缺失或无效，`gateway status` 仍可用于诊断。
    - 默认的 `gateway status` 会证明服务状态、WebSocket 连接以及握手时可见的认证能力。它不能证明读/写/管理操作。
    - 诊断探针对首次设备认证是非变更性的：如果存在现有的缓存设备令牌，它们会复用该令牌，但不会仅为了检查状态而创建新的 CLI 设备身份或只读设备配对记录。
    - `gateway status` 会在可能的情况下解析已配置的认证 SecretRef 以供探测认证使用。
    - 如果在此命令路径中必需的认证 SecretRef 无法解析，当探测连通性/认证失败时，`gateway status --json` 会报告 `rpc.authWarning`；请显式传入 `--token`/`--password`，或先解析密钥来源。
    - 如果探测成功，为避免误报，将抑制未解析认证引用的警告。
    - 当监听服务本身不足以满足需求，而你还需要读范围 RPC 调用也正常时，请在脚本和自动化中使用 `--require-rpc`。
    - `--deep` 会尽力扫描额外的 launchd/systemd/schtasks 安装。当检测到多个类似 gateway 的服务时，人类可读输出会打印清理提示，并警告大多数设置应当在每台机器上只运行一个 gateway。
    - 人类可读输出会包含解析后的文件日志路径，以及 CLI 与服务的配置路径/有效性快照，以帮助诊断 profile 或 state-dir 漂移。

  </Accordion>
  <Accordion title="Linux systemd auth-drift checks">
    - 在 Linux systemd 安装中，服务认证漂移检查会从 unit 中读取 `Environment=` 和 `EnvironmentFile=` 两种值（包括 `%h`、带引号的路径、多个文件以及可选的 `-` 文件）。
    - 漂移检查会使用合并后的运行时环境解析 `gateway.auth.token` SecretRef（先使用服务命令环境，再回退到进程环境）。
    - 如果令牌认证实际上未启用（显式的 `gateway.auth.mode` 为 `password`/`none`/`trusted-proxy`，或者模式未设置且密码可能生效而没有令牌候选可以生效），则 token 漂移检查会跳过配置令牌解析。

  </Accordion>
</AccordionGroup>

### `gateway probe`

`gateway probe` 是“调试一切”的命令。它总会探测：

- 你已配置的远程 gateway（如果已设置），以及
- localhost（loopback）**即使已配置远程**。

如果你传入 `--url`，该显式目标会被添加到两者之前。人类可读输出将目标标记为：

- `URL (explicit)`
- `Remote (configured)` 或 `Remote (configured, inactive)`
- `Local loopback`

<Note>
如果可以到达多个 gateway，它会全部打印出来。当你使用隔离的 profile/端口（例如 rescue bot）时，支持多个 gateway，但大多数安装仍然只运行一个 gateway。
</Note>

```bash
openclaw gateway probe
openclaw gateway probe --json
```

<AccordionGroup>
  <Accordion title="Interpretation">
    - `Reachable: yes` 表示至少有一个目标接受了 WebSocket 连接。
    - `Capability: read-only|write-capable|admin-capable|pairing-pending|connect-only` 报告探针能够证明的认证能力。这与可达性是分开的。
    - `Read probe: ok` 表示读范围详细 RPC 调用（`health`/`status`/`system-presence`/`config.get`）也成功了。
    - `Read probe: limited - missing scope: operator.read` 表示连接成功，但读范围 RPC 受限。这被报告为**降级**可达性，而不是完全失败。
    - 在 `Connect: ok` 之后出现的 `Read probe: failed` 表示 Gateway 接受了 WebSocket 连接，但后续读诊断超时或失败。这同样是**降级**可达性，而不是不可达的 Gateway。
    - 与 `gateway status` 一样，probe 会复用现有缓存的设备认证，但不会创建首次设备身份或配对状态。
    - 只有当所有被探测的目标都不可达时，退出码才为非零。

  </Accordion>
  <Accordion title="JSON output">
    顶层：

    - `ok`：至少有一个目标可达。
    - `degraded`：至少有一个目标接受了连接，但未完成完整的详细 RPC 诊断。
    - `capability`：在可达目标中看到的最佳能力（`read_only`、`write_capable`、`admin_capable`、`pairing_pending`、`connected_no_operator_scope` 或 `unknown`）。
    - `primaryTargetId`：按以下优先级作为活动胜者的最佳目标：显式 URL、SSH 隧道、已配置远程，然后是本地 loopback。
    - `warnings[]`：尽力而为的警告记录，包含 `code`、`message` 和可选的 `targetIds`。
    - `network`：从当前配置和主机网络派生的本地 loopback/tailnet URL 提示。
    - `discovery.timeoutMs` 和 `discovery.count`：本次探测实际使用的发现预算/结果数量。

    每个目标（`targets[].connect`）：

    - `ok`：连接后的可达性 + 降级分类。
    - `rpcOk`：完整详细 RPC 成功。
    - `scopeLimited`：由于缺少 operator 范围，详细 RPC 失败。

    每个目标（`targets[].auth`）：

    - `role`：可用时在 `hello-ok` 中报告的认证角色。
    - `scopes`：可用时在 `hello-ok` 中报告的已授予范围。
    - `capability`：该目标显示出的认证能力分类。

  </Accordion>
  <Accordion title="Common warning codes">
    - `ssh_tunnel_failed`：SSH 隧道设置失败；命令回退到直接探测。
    - `multiple_gateways`：有多个目标可达；除非你有意运行隔离 profile（例如 rescue bot），这通常不寻常。
    - `auth_secretref_unresolved`：已配置的认证 SecretRef 无法为失败的目标解析。
    - `probe_scope_limited`：WebSocket 连接成功，但读探测因缺少 `operator.read` 而受限。

  </Accordion>
</AccordionGroup>

#### 通过 SSH 的远程（Mac app parity）

macOS 应用的“通过 SSH 的远程”模式使用本地端口转发，因此远程 gateway（可能仅绑定到 loopback）会变为可通过 `ws://127.0.0.1:<port>` 访问。

CLI 等价命令：

```bash
openclaw gateway probe --ssh user@gateway-host
```

<ParamField path="--ssh <target>" type="string">
  `user@host` 或 `user@host:port`（端口默认为 `22`）。
</ParamField>
<ParamField path="--ssh-identity <path>" type="string">
  身份文件。
</ParamField>
<ParamField path="--ssh-auto" type="boolean">
  从解析出的发现端点（`local.` 加上已配置的广域域名，如有）中选择发现到的第一个 gateway 主机作为 SSH 目标。TXT-only 提示会被忽略。
</ParamField>

配置（可选，作为默认值使用）：

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

底层 RPC 帮助工具。

```bash
openclaw gateway call status
openclaw gateway call logs.tail --params '{"sinceMs": 60000}'
```

<ParamField path="--params <json>" type="string" default="{}">
  用于参数的 JSON 对象字符串。
</ParamField>
<ParamField path="--url <url>" type="string">
  Gateway WebSocket URL。
</ParamField>
<ParamField path="--token <token>" type="string">
  Gateway 令牌。
</ParamField>
<ParamField path="--password <password>" type="string">
  Gateway 密码。
</ParamField>
<ParamField path="--timeout <ms>" type="number">
  超时预算。
</ParamField>
<ParamField path="--expect-final" type="boolean">
  主要用于会在最终载荷前流式传输中间事件的 agent 风格 RPC。
</ParamField>
<ParamField path="--json" type="boolean">
  机器可读 JSON 输出。
</ParamField>

<Note>
`--params` 必须是有效的 JSON。
</Note>

## 管理 Gateway 服务

```bash
openclaw gateway install
openclaw gateway start
openclaw gateway stop
openclaw gateway restart
openclaw gateway uninstall
```

### 使用包装器安装

当托管服务必须通过另一个可执行文件启动时，请使用 `--wrapper`，例如
秘密管理器 shim 或 run-as 帮助程序。包装器会接收普通的 Gateway 参数，并负责最终以这些参数 exec `openclaw` 或 Node。

```bash
cat > ~/.local/bin/openclaw-doppler <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
exec doppler run --project my-project --config production -- openclaw "$@"
EOF
chmod +x ~/.local/bin/openclaw-doppler

openclaw gateway install --wrapper ~/.local/bin/openclaw-doppler --force
openclaw gateway restart
```

你也可以通过环境变量设置包装器。`gateway install` 会验证该路径是
一个可执行文件，将包装器写入服务的 `ProgramArguments`，并将
`OPENCLAW_WRAPPER` 持久化到服务环境中，以便后续强制重装、更新和 doctor
修复。

```bash
OPENCLAW_WRAPPER="$HOME/.local/bin/openclaw-doppler" openclaw gateway install --force
openclaw doctor
```

要移除已持久化的包装器，请在重新安装时清空 `OPENCLAW_WRAPPER`：

```bash
OPENCLAW_WRAPPER= openclaw gateway install --force
openclaw gateway restart
```

<AccordionGroup>
  <Accordion title="命令选项">
    - `gateway status`: `--url`, `--token`, `--password`, `--timeout`, `--no-probe`, `--require-rpc`, `--deep`, `--json`
    - `gateway install`: `--port`, `--runtime <node|bun>`, `--token`, `--wrapper <path>`, `--force`, `--json`
    - `gateway uninstall|start|stop|restart`: `--json`

  </Accordion>
  <Accordion title="生命周期行为">
    - 使用 `gateway restart` 来重启托管服务。不要将 `gateway stop` 和 `gateway start` 串联起来作为重启的替代；在 macOS 上，`gateway stop` 会在停止前故意禁用 LaunchAgent。
    - 生命周期命令接受 `--json`，便于脚本化。

  </Accordion>
  <Accordion title="安装时的认证和 SecretRef">
    - 当令牌认证需要 token 且 `gateway.auth.token` 由 SecretRef 管理时，`gateway install` 会验证该 SecretRef 是否可解析，但不会将解析出的 token 持久化到服务环境元数据中。
    - 如果令牌认证需要 token，而已配置的 token SecretRef 未解析，则安装会闭合失败，而不是持久化回退的明文值。
    - 对于 `gateway run` 的密码认证，优先使用 `OPENCLAW_GATEWAY_PASSWORD`、`--password-file`，或由 SecretRef 支持的 `gateway.auth.password`，而不是内联 `--password`。
    - 在推断认证模式下，仅在 shell 中设置的 `OPENCLAW_GATEWAY_PASSWORD` 不会降低安装所需的 token 要求；安装托管服务时请使用持久配置（`gateway.auth.password` 或配置中的 `env`）。
    - 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`，且 `gateway.auth.mode` 未设置，则在显式设置模式之前会阻止安装。

  </Accordion>
</AccordionGroup>

## 发现 gateways（Bonjour）

`gateway discover` 扫描 Gateway 信标（`_openclaw-gw._tcp`）。

- 多播 DNS-SD：`local.`
- 单播 DNS-SD（广域 Bonjour）：选择一个域（例如：`openclaw.internal.`），并配置分割 DNS + DNS 服务器；参见 [Bonjour](/gateway/bonjour)。

只有启用了 Bonjour 发现的 gateway（默认）才会广播该信标。

广域发现记录包含（TXT）：

- `role`（gateway 角色提示）
- `transport`（传输提示，例如 `gateway`）
- `gatewayPort`（WebSocket 端口，通常为 `18789`）
- `sshPort`（可选；当不存在时，客户端默认将 SSH 目标设为 `22`）
- `tailnetDns`（MagicDNS 主机名，如可用）
- `gatewayTls` / `gatewayTlsSha256`（TLS 已启用 + 证书指纹）
- `cliPath`（写入广域区域的远程安装提示）

### `gateway discover`

```bash
openclaw gateway discover
```

<ParamField path="--timeout <ms>" type="number" default="2000">
  每个命令的超时时间（浏览/解析）。
</ParamField>
<ParamField path="--json" type="boolean">
  可供机器读取的输出（也会禁用样式/转轮）。
</ParamField>

示例：

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

<Note>
- CLI 会扫描 `local.`，以及在启用时配置的广域域名。
- JSON 输出中的 `wsUrl` 源自解析后的服务端点，而不是仅来自 TXT 的提示，例如 `lanHost` 或 `tailnetDns`。
- 在 `local.` mDNS 上，只有当 `discovery.mdns.mode` 为 `full` 时才会广播 `sshPort` 和 `cliPath`。广域 DNS-SD 仍会写入 `cliPath`；在那里 `sshPort` 也仍然是可选的。

</Note>

## 相关内容

- [CLI 参考](/cli)
- [Gateway 运行手册](/gateway)
