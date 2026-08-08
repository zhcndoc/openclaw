---
summary: "OpenClaw 网关 CLI（`openclaw gateway`）——运行、查询和发现网关"
read_when:
  - 从 CLI 运行网关（开发或服务器）
  - 调试网关身份验证、绑定模式和连接性
  - 通过 Bonjour 发现网关（本地 + 广域 DNS-SD）
  - 集成外部网关进程监督器
title: "网关"
sidebarTitle: "网关"
---

网关是 OpenClaw 的 WebSocket 服务器（频道、节点、会话、钩子）。以下所有子命令都位于 `openclaw gateway ...` 下。

<CardGroup cols={3}>
  <Card title="Bonjour 发现" href="/gateway/bonjour">
    本地 mDNS + 广域 DNS-SD 设置。
  </Card>
  <Card title="发现概览" href="/gateway/discovery">
    OpenClaw 如何发布和查找网关。
  </Card>
  <Card title="配置" href="/gateway/configuration">
    顶层网关配置键。
  </Card>
</CardGroup>

## 运行 Gateway

```bash
openclaw gateway
openclaw gateway run   # 等价，显式形式
```

<AccordionGroup>
  <Accordion title="启动行为">
    - 除非在 `~/.openclaw/openclaw.json` 中设置了 `gateway.mode=local`，否则拒绝启动。临时/开发运行可使用 `--allow-unconfigured`；它会绕过此保护，但不会写入或修复配置。
    - 当启动时发现可修复的无效配置，交互式终端会提示运行 `openclaw doctor --fix`，并在获得同意后重新尝试启动一次。非交互式运行不会自动修复；它们只会打印该命令。如果修复后的配置仍然无效，启动仍会停止。
    - `openclaw onboard --mode local` 和 `openclaw setup` 会写入 `gateway.mode=local`。如果配置文件存在但缺少 `gateway.mode`，会被视为损坏/被清空的配置，Gateway 不会替你猜测 `local`——请重新运行 onboarding、手动设置该键，或传入 `--allow-unconfigured`。
    - 未经认证而绑定到 loopback 之外的地址会被阻止。
    - `--bind` 的 `lan`、`tailnet` 和 `custom` 目前只会通过仅 IPv4 的路径解析；仅 IPv6 的自带主机场景需要在 Gateway 前放置一个 IPv4 sidecar 或代理。
    - 在获得授权时，`SIGUSR1` 会触发进程内重启。`commands.restart`（默认：启用）控制外部发送的 `SIGUSR1`；将其设为 `false` 可阻止手动 OS 信号重启。面向代理的 `gateway` 工具是只读的；代理需要通过经人工批准的 `openclaw` 委托工具来请求重启。
    - `SIGINT`/`SIGTERM` 会停止进程，但不会恢复自定义终端状态——如果你把 CLI 包装在 TUI 或原始模式输入中，请在退出前自行恢复终端。

  </Accordion>
</AccordionGroup>

### 选项

<ParamField path="--port <port>" type="number">
  WebSocket 端口（默认来自 config/env；通常为 `18789`）。
</ParamField>
<ParamField path="--bind <mode>" type="string">
  绑定模式：`loopback`（默认）、`lan`、`tailnet`、`auto`、`custom`。
</ParamField>
<ParamField path="--token <token>" type="string">
  `connect.params.auth.token` 的共享令牌。若已设置，默认为 `OPENCLAW_GATEWAY_TOKEN`。
</ParamField>
<ParamField path="--auth <mode>" type="string">
  认证模式：`none`、`token`、`password`、`trusted-proxy`。
</ParamField>
<ParamField path="--password <password>" type="string">
  `--auth password` 的密码。
</ParamField>
<ParamField path="--password-file <path>" type="string">
  从文件中读取 Gateway 密码。
</ParamField>
<ParamField path="--tailscale <mode>" type="string">
  Tailscale 暴露方式：`off`、`serve`、`funnel`。
</ParamField>
<ParamField path="--tailscale-reset-on-exit" type="boolean">
  在退出时重置 Tailscale serve/funnel 配置。
</ParamField>
<ParamField path="--allow-unconfigured" type="boolean">
  在不强制 `gateway.mode=local` 的情况下启动。仅用于临时/开发引导；不会持久化或修复配置。
</ParamField>
<ParamField path="--dev" type="boolean">
  如果缺失，则创建开发配置和工作区（跳过 `BOOTSTRAP.md`）。
</ParamField>
<ParamField path="--dev-ambient-channels" type="boolean">
  允许开发版 Gateway 从环境变量自动配置通道。需要 `--dev`。
</ParamField>
<ParamField path="--reset" type="boolean">
  重置开发配置、凭据、会话和工作区。需要 `--dev`。
</ParamField>
<ParamField path="--force" type="boolean">
  在启动前终止目标端口上任何已存在的监听。在非交互式 shell 中，这会拒绝终止已验证的 Gateway 监听；请改用 `--dev` 或使用空闲端口的隔离 `--profile`。
</ParamField>
<ParamField path="--verbose" type="boolean">
  向 stdout/stderr 输出详细日志。
</ParamField>
<ParamField path="--cli-backend-logs" type="boolean">
  仅在控制台显示 CLI 后端日志（同时也会启用 stdout/stderr）。
</ParamField>
<ParamField path="--ws-log <style>" type="string" default="auto">
  WebSocket 日志样式：`auto`、`full`、`compact`。
</ParamField>
<ParamField path="--compact" type="boolean">
  `--ws-log compact` 的别名。
</ParamField>
<ParamField path="--raw-stream" type="boolean">
  将原始模型流事件记录为 JSONL。
</ParamField>
<ParamField path="--raw-stream-path <path>" type="string">
  原始流 JSONL 路径。
</ParamField>

`--claude-cli-logs` 是 `--cli-backend-logs` 的已弃用别名。

对于 `--bind custom`，请将 `gateway.customBindHost` 设置为一个 IPv4 地址。除 `127.0.0.1` 或 `0.0.0.0` 之外的任何地址，还要求同一端口上的 `127.0.0.1` 供同主机客户端使用；如果任一监听无法绑定，启动都会失败。通配符 `0.0.0.0` 不会额外添加一个必需别名。仅 IPv6 的自带主机部署需要在 Gateway 前面放置一个 IPv4 sidecar 或代理。

## 显示已配置的令牌

当客户端需要已配置的共享令牌时，在 Gateway 主机上运行：

```bash
openclaw gateway auth-token --show
```

该命令会解析 `gateway.auth.token`、`OPENCLAW_GATEWAY_TOKEN` 和已配置的 SecretRefs，然后仅输出令牌。它要求使用交互式终端，并拒绝重定向或管道输出，以避免凭据无意中进入命令日志。请将终端输出视为机密信息。

如果未配置持久令牌，请运行 `openclaw doctor --generate-gateway-token`，重启 Gateway，然后重新运行该命令。通用的 `openclaw config get` 输出仍会被脱敏，包括使用 `--json` 时也是如此。

## 重启 Gateway

```bash
openclaw gateway restart
openclaw gateway restart --safe
openclaw gateway restart --safe --skip-deferral
openclaw gateway restart --force
openclaw gateway restart --wait 30s
```

`--safe` 会要求正在运行的 Gateway 预检活跃工作，并在这些工作排空后安排一次合并重启。等待时间上限为 5 分钟；当预算耗尽时，重启会被强制执行。`--safe` 不能与 `--force` 或 `--wait` 组合使用。

`--skip-deferral` 会在安全重启时绕过活跃工作延迟门，因此即使存在已报告的阻塞项，Gateway 也会立即重启。它必须与 `--safe` 一起使用——当某个延迟被失控任务卡住时，可使用它。

`--wait <duration>` 会覆盖普通（非安全）重启的排空预算。它接受纯毫秒数或带单位后缀 `ms`、`s`、`m`、`h`、`d`（例如 `30s`、`5m`、`1h30m`）；`--wait 0` 表示无限等待。它不能与 `--force` 或 `--safe` 同时使用。

`--force` 会跳过活跃工作排空并立即重启。普通 `restart`（不带标志）将保持现有的服务管理器重启行为。

<Warning>
行内 `--password` 可能会暴露在本地进程列表中。建议使用 `--password-file`、环境变量或由 SecretRef 支持的 `gateway.auth.password`。
</Warning>

### 安装身份

服务管理（`install`、`start`、`stop`、`restart`、`uninstall`、Doctor 服务修复以及自更新服务处理）归属于拥有主机服务的安装。该安装是操作系统账户主目录下规范的 `.openclaw` 目录，或命名配置文件映射到该位置的 `.openclaw-<profile>` 目录。命名配置文件使用彼此独立的原生服务身份。

`OPENCLAW_HOME`，或指向其他位置的 `OPENCLAW_STATE_DIR` 或 `OPENCLAW_CONFIG_PATH`，会被视为隔离状态并跳过。重定位或复制的状态树无法接管并重写账户的主机服务。

在 macOS 和 Windows 上，由原生服务管理的配置文件名称必须为小写。仅运行时使用的配置文件仍可使用大写，但在普通不区分大小写的文件系统上，`Main` 和 `main` 等仅大小写不同的名称会共享路径，因此无法安全地拥有彼此独立的原生服务。在 macOS 上，小写名称 `gateway` 和 `node` 也无法用于原生服务管理，因为其历史 LaunchAgent 标签会与默认的 Gateway 和 node-host 服务发生冲突。

命名配置文件还必须使用从 `OPENCLAW_PROFILE` 派生的原生服务身份。在进行服务管理前，需取消设置 `OPENCLAW_LAUNCHD_LABEL`、`OPENCLAW_SYSTEMD_UNIT` 或 `OPENCLAW_WINDOWS_TASK_NAME`；自定义身份仍可用于默认配置文件，或仅运行时/外部监督器设置。

### 外部监督器

仅当另一个进程管理器负责 Gateway 生命周期时，才设置 `OPENCLAW_SUPERVISOR_MODE=external`。在此模式下：

- `openclaw gateway restart` 会保留现有的安全、强制和有界等待行为，但目标会转向已验证正在运行的 Gateway，而不是 launchd、systemd 或 Task Scheduler。
- 原生的服务安装、启动、停止和卸载操作会被拒绝，并提示使用外部监督器。
- OpenClaw 自更新会被拒绝，以便由监督器停止 Gateway、替换并完成运行时，然后安全地重新启动它。
- 从新进程发起的重启会在干净退出前写入一个有界的 SQLite 交接记录。若持久化失败，Gateway 会回退到进程内重启，而不是在没有可消费交接记录的情况下退出。

`OPENCLAW_SERVICE_REPAIR_POLICY=external` 仍然是一个独立的 Doctor 修复策略。它并不声明运行时所有权；需要同时具备这两种行为的监督器应同时设置这两个变量。

外部监督器可以通过隐藏的机器契约协商并消费重启交接：

```bash
openclaw gateway restart-handoff capabilities --json
openclaw gateway restart-handoff consume --expected-pid <pid> --json
```

协议版本 `1` 支持 `consume` 操作。消费会在一次立即的 SQLite 事务中验证预期 PID 和有界交接字段。被接受的交接会在返回成功之前被删除，因此并发或重放的消费者不能同时接受它。PID 不匹配会保留给匹配的所有者；缺失、过期和无效的记录都不会授权重启。

有效的机器请求会返回 JSON，退出码为 `0`，包括非重启结果。无效参数会返回 `reason: "invalid-expected-pid"`，退出码为 `2`；状态存储失败会返回 `reason: "store-unavailable"`，退出码为 `1`。监督器应在其将要使用的确切运行时或启动器上探测 `capabilities`，而不是从 OpenClaw 版本字符串推断支持情况，或直接读取私有的 SQLite schema。

### Gateway 性能分析

- `OPENCLAW_GATEWAY_STARTUP_TRACE=1` 在启动期间记录各阶段耗时，包括每个阶段的 `eventLoopMax` 延迟以及插件查找表耗时（已安装索引、清单注册表、启动规划、所有者映射工作）。
- `OPENCLAW_GATEWAY_RESTART_TRACE=1` 记录重启范围内的 `restart trace:` 行：信号处理、活跃工作排空、关闭阶段、下次启动、就绪时间以及内存指标。
- `OPENCLAW_DIAGNOSTICS=timeline` 配合 `OPENCLAW_DIAGNOSTICS_TIMELINE_PATH=<path>` 会为外部 QA harness 写出尽力而为的 JSONL 启动诊断时间线（等同于配置 `diagnostics.flags: ["timeline"]`；该路径仍然只能通过环境变量设置）。再添加 `OPENCLAW_DIAGNOSTICS_EVENT_LOOP=1` 可包含事件循环样本。
- `pnpm build` 然后执行 `pnpm test:startup:gateway -- --runs 5 --warmup 1`，将 Gateway 启动与已构建的 CLI 入口进行基准测试：首次进程输出、`/healthz`、`/readyz`、启动 trace 时序、事件循环延迟以及插件查找表耗时。
- `pnpm build` 然后执行 `pnpm test:restart:gateway -- --case skipChannels --runs 1 --restarts 5`，在 macOS 或 Linux 上对进程内重启进行基准测试（Windows 不支持；重启需要 `SIGUSR1`）。它使用 `SIGUSR1`，在子进程中启用两种 trace，并记录下一次 `/healthz`、下一次 `/readyz`、停机时间、就绪时间、CPU、RSS 以及重启 trace 指标。
- `/healthz` 表示存活状态；`/readyz` 表示可用就绪状态。请将 trace 行和基准输出视为归因信号，而不是从单次时间跨度或样本得出的完整性能结论。

## 查询正在运行的 Gateway

所有查询命令都使用 WebSocket RPC。

<Tabs>
  <Tab title="输出模式">
    - 默认：人类可读（TTY 中带颜色）。
    - `--json`：机器可读 JSON（无样式/无 spinner）。
    - `--no-color`（或 `NO_COLOR=1`）：禁用 ANSI，同时保留人类布局。

  </Tab>
  <Tab title="共享选项">
    - `--url <url>`: Gateway WebSocket URL。
    - `--token <token>`: Gateway 令牌。
    - `--password <password>`: Gateway 密码。
    - `--timeout <ms>`: 超时时间/预算（默认值因命令而异；请参见下面的各个命令）。
    - `--expect-final`: 等待“final”响应（agent 调用）。

  </Tab>
</Tabs>

<Note>
当你设置 `--url` 时，CLI 不会回退到配置或环境凭据。请显式传入 `--token` 或 `--password`。缺少显式凭据会报错。
</Note>

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
openclaw gateway health --port 18789
```

`/healthz` 是一个存活探针：只要服务器能够响应 HTTP，它就会立即返回。`/readyz` 更严格，在启动插件 sidecar、通道或已配置的钩子仍在初始化时，它会保持红色。本地或经过认证的详细 `/readyz` 响应包含一个 `eventLoop` 诊断块（延迟、利用率、CPU 核心比率、`degraded` 标志）。

<ParamField path="--port <port>" type="number">
  目标是此端口上的本地回环网关。此调用会覆盖 `OPENCLAW_GATEWAY_URL` 和 `OPENCLAW_GATEWAY_PORT`。
</ParamField>

### `gateway usage-cost`

从会话日志中获取使用成本摘要。

```bash
openclaw gateway usage-cost
openclaw gateway usage-cost --days 7
openclaw gateway usage-cost --agent work --json
openclaw gateway usage-cost --all-agents
openclaw gateway usage-cost --json
```

<ParamField path="--days <days>" type="number" default="30">
  要包含的天数。
</ParamField>
<ParamField path="--agent <id>" type="string">
  将摘要限定到某个已配置的代理 id。
</ParamField>
<ParamField path="--all-agents" type="boolean">
  汇总所有已配置的代理。不能与 `--agent` 同时使用。
</ParamField>

### `网关稳定性`

从正在运行的网关获取最近的诊断稳定性记录器。

```bash
openclaw gateway stability
openclaw gateway stability --type payload.large
openclaw gateway stability --bundle latest
openclaw gateway stability --bundle latest --export
openclaw gateway stability --json
```

<ParamField path="--limit <limit>" type="number" default="25">
  包含的最近事件最大数量（最大 `1000`）。
</ParamField>
<ParamField path="--type <type>" type="string">
  按诊断事件类型过滤，例如 `payload.large` 或 `diagnostic.memory.pressure`。
</ParamField>
<ParamField path="--since-seq <seq>" type="number">
  仅包含某个诊断序号之后的事件。
</ParamField>
<ParamField path="--bundle [path]" type="string">
  读取已持久化的稳定性 bundle，而不是调用正在运行的网关。`--bundle latest`（或直接使用裸 `--bundle`）会选择状态目录下最新的 bundle；你也可以直接传入 bundle JSON 路径。
</ParamField>
<ParamField path="--export" type="boolean">
  写出一个可共享的支持诊断 zip，而不是打印稳定性细节。
</ParamField>
<ParamField path="--output <path>" type="string">
  `--export` 的输出路径。
</ParamField>

<AccordionGroup>
  <Accordion title="隐私和 bundle 行为">
    - 记录会保留运行元数据：事件名称、计数、字节大小、内存读数、队列/会话状态、审批 id、通道/插件名称，以及已脱敏的会话摘要。它们不包含聊天文本、webhook 正文、工具输出、原始请求/响应正文、令牌、cookie、密钥值、主机名以及原始会话 id。设置 `diagnostics.enabled: false` 可完全禁用记录器。
    - 当记录器已有事件时，严重的网关退出、关闭超时以及重启启动失败会将相同的诊断快照写入 `~/.openclaw/logs/stability/openclaw-stability-*.json`。使用 `openclaw gateway stability --bundle latest` 检查最新的 bundle；`--limit`、`--type` 和 `--since-seq` 也同样适用于 bundle 输出。

  </Accordion>
</AccordionGroup>

### `gateway diagnostics export`

写入一个用于错误报告的本地诊断 zip 文件。有关隐私模型和捆绑包内容，请参阅[诊断导出](/gateway/diagnostics)。

```bash
openclaw gateway diagnostics export
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
openclaw gateway diagnostics export --json
```

<ParamField path="--output <path>" type="string">
  输出 zip 路径。默认为状态目录中的支持导出文件。
</ParamField>
<ParamField path="--log-lines <count>" type="number" default="5000">
  要包含的已清理日志行的最大数量。
</ParamField>
<ParamField path="--log-bytes <bytes>" type="number" default="1000000">
  要检查的日志字节数上限。
</ParamField>
<ParamField path="--url <url>" type="string">
  用于健康状态快照的网关 WebSocket URL。
</ParamField>
<ParamField path="--token <token>" type="string">
  用于健康状态快照的网关令牌。
</ParamField>
<ParamField path="--password <password>" type="string">
  用于健康状态快照的网关密码。
</ParamField>
<ParamField path="--timeout <ms>" type="number" default="3000">
  状态/健康状态快照超时时间。
</ParamField>
<ParamField path="--no-stability-bundle" type="boolean">
  跳过对持久化稳定性捆绑包的搜索。
</ParamField>
<ParamField path="--json" type="boolean">
  以 JSON 格式输出写入路径、大小和清单。
</ParamField>

导出内容包括：`manifest.json`（文件清单）、`summary.md`（Markdown 摘要）、`diagnostics.json`（顶层配置/日志/发现项/稳定性/状态/健康状态摘要）、`config/sanitized.json`、`status/gateway-status.json`、`health/gateway-health.json`、`logs/openclaw-sanitized.jsonl`，以及在存在时的 `stability/latest.json`。

该导出旨在用于共享。它会保留对调试有用的运行时详细信息——安全的日志字段、子系统名称、状态码、持续时间、已配置的模式、端口、插件/提供商 ID、非敏感的功能设置，以及经过清理的运行时日志消息——并省略或删除聊天文本、webhook 正文、工具输出、凭据、Cookie、账户/消息标识符、提示词/指令文本、主机名和机密值。当日志消息看起来像用户/聊天/工具负载文本时（例如“用户说”“聊天文本”“工具输出”“webhook 正文”），导出内容只会保留该消息已被省略及其字节数的信息。

### `gateway status`

显示 Gateway 服务（launchd/systemd/schtasks）以及一个可选的连通性/认证探测。

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
  将连通性探测升级为读取探测；如果失败则以非零状态退出。不能与 `--no-probe` 组合使用。
</ParamField>

<AccordionGroup>
  <Accordion title="状态语义">
    - 即使本地 CLI 配置缺失或无效，也仍可用于诊断。
    - 默认输出证明服务状态、WebSocket 连接，以及握手时可见的认证能力——而不是读/写/管理操作。
    - 对于首次设备认证，探测不会产生变更：如果已存在缓存的设备令牌就复用它，但绝不会为了检查状态而新建 CLI 设备身份或只读配对记录。
    - 在可能的情况下，会为探测认证解析已配置的 SecretRef。若必需的 SecretRef 未解析，且探测连通性/认证失败，则 `--json` 会报告 `rpc.authWarning`；请显式传入 `--token`/`--password`，或修复 secret 来源。一旦探测成功，未解析认证警告将被抑制。
    - 当运行中的 Gateway 报告 `gateway.version` 时，JSON 输出会包含它；如果握手探测无法提供版本元数据，`--require-rpc` 可以回退到 `status.runtimeVersion` RPC 载荷。
    - 当监听服务不足以满足需求、你还需要读取作用域的 RPC 也正常时，请在脚本/自动化中使用 `--require-rpc`。
    - `--deep` 会扫描额外的 launchd/systemd/schtasks 安装；当发现多个类似 gateway 的服务时，人工输出会打印清理提示（通常建议每台机器只运行一个 gateway），并在相关时报告最近一次 supervisor 重启接力。
    - `--deep` 还会以插件感知模式运行配置校验（`pluginValidation: "full"`），并显示插件清单警告（例如缺少 channel 配置元数据）。默认的 `gateway status` 保持快速的只读路径，会跳过插件校验。
    - 人工输出会包含已解析的文件日志路径，以及 CLI 与服务的配置路径/有效性，帮助诊断 profile 或 state-dir 漂移。
    - 人工输出会包含 `Gateway heap:`，其中显示应用的限制及其自适应推导方式。JSON 输出会将相同报告暴露为 `service.gatewayHeap`。

  </Accordion>
  <Accordion title="Linux systemd 认证漂移检查">
    - 服务认证漂移检查会同时读取单元中的 `Environment=` 和 `EnvironmentFile=`（包括 `%h`、带引号的路径、多个文件以及可选的 `-` 文件）。
    - 使用合并后的运行时环境（先取服务命令环境，再回退到进程环境）解析 `gateway.auth.token` 的 SecretRef。
    - 当令牌认证并未实际启用时，令牌漂移检查会跳过配置中的令牌解析（`gateway.auth.mode` 明确为 `password`/`none`/`trusted-proxy`，或模式未设置且密码可能生效、同时没有可生效的令牌候选）。

  </Accordion>
</AccordionGroup>

### `gateway probe`

“调试一切”命令。它始终探测：

- 你配置的远程网关（如果已设置），以及
- localhost（回环），**即使已配置远程网关**。

传入 `--url` 会在这两者之前添加该显式目标。人类可读输出会将目标标记为 `URL (explicit)`、`Remote (configured)` / `Remote (configured, inactive)`，以及 `Local loopback`。

<Note>
如果多个探测目标都可达，都会被打印出来。SSH 隧道、TLS/proxy URL，以及已配置的远程 URL 可能会指向同一个网关，即使传输端口不同；`multiple_gateways` 仅保留给可达但彼此不同、或身份无法明确区分的网关。支持运行多个网关以用于隔离配置文件（例如救援机器人），但大多数安装只运行单个网关。
</Note>

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --port 18789
```

<ParamField path="--port <port>" type="number">
  将此端口用于本地回环探测目标以及 SSH 隧道远端端口。若未指定 `--url`，这将仅选择本地回环目标，而不是已配置的网关环境 URL、环境端口或远程目标。
</ParamField>

<AccordionGroup>
  <Accordion title="解释">
    - `Reachable: yes` 表示至少有一个目标接受了 WebSocket 连接。
    - `Capability: read-only|write-capable|admin-capable|pairing-pending|connect-only` 报告探测能够证明的认证能力，与可达性分开。
    - `Read probe: ok` 表示读取范围内的详细 RPC 调用（`health`/`status`/`system-presence`/`config.get`）也成功了。
    - `Read probe: limited - missing scope: operator.read` 表示连接成功，但读取范围内的 RPC 受限。会报告为**降级**可达性，而不是完全失败。
    - `Read probe: failed` 且在 `Connect: ok` 之后出现，表示 WebSocket 已连接，但后续读取诊断超时或失败——这同样是**降级**，而不是不可达。
    - 与 `gateway status` 一样，probe 会复用现有缓存的设备认证，但不会创建首次设备身份或配对状态。
    - 只有在没有任何被探测目标可达时，退出码才为非零。

  </Accordion>
  <Accordion title="JSON 输出">
    顶层：

    - `ok`: 至少有一个目标可达。
    - `degraded`: 至少有一个目标接受了连接，但未完成完整的详细 RPC 诊断。
    - `capability`: 在所有可达目标中看到的最佳能力（`read_only`、`write_capable`、`admin_capable`、`pairing_pending`、`connected_no_operator_scope` 或 `unknown`）。
    - `primaryTargetId`: 应视为活动胜者的最佳目标，优先级顺序：显式 URL、SSH 隧道、已配置远程、本地回环。
    - `warnings[]`: 尽力而为的警告记录，包含 `code`、`message`，以及可选的 `targetIds`。
    - `network`: 根据当前配置和主机网络推导出的本地回环/tailnet URL 提示。
    - `discovery.timeoutMs` / `discovery.count`: 本次 probe 使用的实际发现预算/结果数量。

    每个目标（`targets[].connect`）：`ok`（可达性 + 降级分类）、`rpcOk`（完整详细 RPC 成功）、`scopeLimited`（详细 RPC 因缺少 operator scope 而失败）。

    每个目标（`targets[].auth`）：在可用时，`hello-ok` 中报告的 `role` 和 `scopes`，以及展示出的 `capability` 分类。

  </Accordion>
  <Accordion title="常见警告代码">
    - `ssh_tunnel_failed`: SSH 隧道设置失败；命令回退到直接探测。
    - `multiple_gateways`: 探测到了不同的网关身份，或者 OpenClaw 无法证明可达目标是同一个网关。指向同一网关的 SSH 隧道、代理 URL 或已配置远程 URL 不会触发此项。
    - `auth_secretref_unresolved`: 无法为失败目标解析已配置的 auth SecretRef。
    - `probe_scope_limited`: WebSocket 连接成功，但由于缺少 `operator.read`，读取探测受限。
    - `local_tls_runtime_unavailable`: 本地 Gateway TLS 已启用，但 OpenClaw 无法加载本地证书指纹。

  </Accordion>
</AccordionGroup>

#### 通过 SSH 的远程（macOS 应用一致性）

macOS 应用的“通过 SSH 远程”模式会使用本地端口转发，因此仅能通过回环访问的远程网关会变为可通过 `ws://127.0.0.1:<port>` 访问。

CLI 等价命令：

```bash
openclaw gateway probe --ssh user@gateway-host
```

<ParamField path="--ssh <target>" type="string">
  `user@host` 或 `user@host:port`（端口默认为 `22`）。
</ParamField>

OpenClaw 仅启动在操作系统管理的系统目录中找到的 SSH 客户端。在原生 Windows 上，
请安装 **OpenSSH Client** 可选功能；Windows 会将其放在
`%SystemRoot%\System32\OpenSSH`。

<ParamField path="--ssh-identity <path>" type="string">
  身份文件。
</ParamField>
<ParamField path="--ssh-auto" type="boolean">
  从解析出的发现端点（`local.` 加上已配置的广域域名，如有）中选择发现到的第一个 gateway 主机作为 SSH 目标。TXT-only 提示会被忽略。
</ParamField>

配置默认值（可选）：`gateway.remote.sshTarget`、`gateway.remote.sshIdentity`。

### `gateway call <method>`

底层 RPC 帮助工具。

```bash
openclaw gateway call status
openclaw gateway call health --port 18999
openclaw gateway call logs.tail --params '{"limit": 200}'
```

<ParamField path="--params <json>" type="string" default="{}">
  用于参数的 JSON 对象字符串。
</ParamField>
<ParamField path="--url <url>" type="string">
  Gateway WebSocket URL。
</ParamField>
<ParamField path="--port <port>" type="number">
  以此端口定位本地回环 Gateway。对于本次调用，它会覆盖 `OPENCLAW_GATEWAY_URL` 和 `OPENCLAW_GATEWAY_PORT`。不能与 `--url` 组合使用。
</ParamField>
<ParamField path="--token <token>" type="string">
  Gateway 令牌。
</ParamField>
<ParamField path="--password <password>" type="string">
  Gateway 密码。
</ParamField>
<ParamField path="--timeout <ms>" type="number" default="10000">
  超时时间预算。
</ParamField>
<ParamField path="--expect-final" type="boolean">
  主要用于会在最终载荷前流式传输中间事件的 agent 风格 RPC。
</ParamField>
<ParamField path="--json" type="boolean">
  机器可读 JSON 输出。
</ParamField>

<Note>
`--params` 必须是有效的 JSON，并且每个方法都会验证其自身的参数结构（多余字段或字段名错误会被拒绝）。对于自定义端口的本地 Gateway，请使用 `--port`；显式指定的 `--url` 仍然需要显式凭据。
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

当托管服务必须通过另一个可执行文件启动时，请使用 `--wrapper`，例如 secrets manager shim 或 run-as helper。包装器会接收正常的 Gateway 参数，并负责最终使用这些参数 exec 执行 `openclaw` 或 Node。

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

你也可以通过环境变量设置包装器。`gateway install` 会验证该路径是否为可执行文件，将包装器写入服务的 `ProgramArguments`，并将 `OPENCLAW_WRAPPER` 持久化到服务环境中，以便后续强制重新安装、更新和 doctor 修复时使用。

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
    - `gateway install`: `--port`, `--runtime <node>` (默认: `node`), `--token`, `--wrapper <path>`, `--force`, `--json`
    - `gateway restart`: `--safe`, `--skip-deferral`, `--force`, `--wait <duration>`, `--json`
    - `gateway uninstall|start`: `--json`
    - `gateway stop`: `--disable`, `--force`, `--json`

  </Accordion>
  <Accordion title="生命周期行为">
    - `gateway start` 具有幂等性：当受管服务已经运行时，它会报告正在运行的进程并保持其不变。已加载但已停止的服务则会像之前一样启动。
    - 如果 `gateway start` 或 `gateway restart` 需要修复过时的服务定义，而调用该命令的 shell 所解析出的状态目录、配置路径或端口与已安装的服务不一致，则命令会拒绝执行。请匹配这些环境覆盖项，或取消设置冲突的环境覆盖项；也可以使用 `openclaw gateway install --force` 有意地重新定位服务。
    - 使用 `gateway restart` 重启受管服务。不要通过串联 `gateway stop` 和 `gateway start` 来替代重启。
    - 在非交互式 shell 中，`gateway stop` 需要使用 `--force`。交互式终端仍保持现有的无提示行为。对于自动化和测试，优先使用 `gateway run --dev`，或使用带有空闲端口的隔离 `--profile`。
    - 在 macOS 上，`gateway stop` 默认使用 `launchctl bootout`，这会从当前启动会话中移除 LaunchAgent，但不会持久化禁用状态——KeepAlive 自动恢复功能会继续对未来的崩溃保持活跃，而 `gateway start` 可以干净地重新启用服务，无需手动执行 `launchctl enable`。传入 `--disable` 可持久化抑制 KeepAlive 和 RunAtLoad，使 Gateway 在下一次显式执行 `gateway start` 之前不会重新生成；当手动停止应在重启后继续生效时，请使用此选项。
    - Gateway 生命周期变更会以尽力而为的方式，将键值审计记录追加到 `<state-dir>/logs/gateway-restart.log`，其中包括 CLI 启动、停止和重启操作、安全重启请求、supervisor 重启以及脱离式交接。
    - 生命周期命令支持使用 `--json` 进行脚本处理。

  </Accordion>
  <Accordion title="受管 Gateway 堆大小设置">
    - `gateway install` 会为受管 Gateway 服务写入仅堆使用的 `NODE_OPTIONS` 值。当 Node 报告容器或服务限制时，它会以受限内存的 50% 为目标；否则以物理内存的 50% 为目标。
    - 标称目标范围为 2048–8192 MiB，并额外设置 75% 的 native-headroom 上限。在小型主机上，该 headroom 上限可能会使实际应用的限制低于标称的 2048 MiB 下限。
    - 已安装服务中已存储的有效显式 `--max-old-space-size` 会在强制重新安装和 doctor 修复期间保留。其他 `NODE_OPTIONS` 标志不会带入受管服务。
    - 环境中的 shell `NODE_OPTIONS` 不会覆盖此策略。使用 `gateway status` 或 `doctor` 检查已安装的值；运行 `openclaw gateway install --force` 可为缺少受管堆设置的旧服务元数据重新生成配置。
    - 该策略仅适用于受管 Gateway 服务。前台运行的 `gateway run`、node 服务以及手写的 supervisor 单元仍保留各自的运行时配置。

  </Accordion>
  <Accordion title="安装时的身份验证和 SecretRef">
    - 当令牌认证需要令牌且 `gateway.auth.token` 由 SecretRef 管理时，`gateway install` 会验证该 SecretRef 是否可解析，但不会将解析后的令牌持久化到服务环境元数据中。
    - 如果令牌认证需要令牌而配置的令牌 SecretRef 未解析，安装会直接失败，而不会持久化回退的明文内容。
    - 对于 `gateway run` 的密码认证，优先使用 `OPENCLAW_GATEWAY_PASSWORD`、`--password-file` 或由 SecretRef 支持的 `gateway.auth.password`，而不是内联 `--password`。
    - 在推断认证模式下，仅 shell 变量 `OPENCLAW_GATEWAY_PASSWORD` 不会放宽安装时的令牌要求；在安装受管服务时，请使用持久配置（`gateway.auth.password` 或配置中的 `env`）。
    - 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`，且未设置 `gateway.auth.mode`，则在显式设置模式之前会阻止安装。

  </Accordion>
</AccordionGroup>

## 发现 gateways（Bonjour）

`gateway discover` 扫描 Gateway 信标（`_openclaw-gw._tcp`）。

- 多播 DNS-SD: `local.`
- 单播 DNS-SD（广域 Bonjour）：选择一个域（例如 `openclaw.internal.`），并设置分割 DNS + DNS 服务器；参见 [Bonjour](/gateway/bonjour)。

只有启用了 Bonjour 发现的 gateway（默认）才会广播该信标。

每个信标上的 TXT 提示：`role`（gateway 角色提示）、`transport`（传输提示，例如 `gateway`）、`gatewayPort`（WebSocket 端口，通常为 `18789`）、`tailnetDns`（MagicDNS 主机名，若可用）、`gatewayTls` / `gatewayTlsSha256`（TLS 已启用 + 证书指纹）。`sshPort` 和 `cliPath` 仅在完整发现模式（`discovery.mdns.mode: "full"`；默认值为 `"minimal"`，会省略它们）中发布——此时客户端会将 SSH 目标默认设为端口 `22`。

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
- 扫描 `local.`，以及在启用时扫描已配置的广域域。
- JSON 输出中的 `wsUrl` 基于解析后的服务端点生成，而不是基于仅 TXT 提示（例如 `lanHost` 或 `tailnetDns`）。
- `discovery.mdns.mode` 控制在 `local.` mDNS 和广域 DNS-SD 上是否发布 `sshPort`/`cliPath`（见上文）。

</Note>

## 相关内容

- [CLI 参考](/cli)
- [Gateway 运行手册](/gateway)
