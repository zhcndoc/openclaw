---
summary: "OpenClaw 网关 CLI (`openclaw gateway`) — 运行、查询和发现网关"
read_when:
  - 从 CLI 运行网关（开发或服务器）
  - 调试网关认证、绑定模式和连通性
  - 通过 Bonjour 发现网关（本地 + 广域 DNS-SD）
title: "网关"
---

# 网关 CLI

网关是 OpenClaw 的 WebSocket 服务器（支持频道、节点、会话、钩子）。

本页中的子命令均属于 `openclaw gateway …` 命令空间。

相关文档：

- [/gateway/bonjour](/gateway/bonjour)
- [/gateway/discovery](/gateway/discovery)
- [/gateway/configuration](/gateway/configuration)

## 运行网关

运行本地网关进程：

```bash
openclaw gateway
```

前台别名：

```bash
openclaw gateway run
```

说明：

- 默认情况下，除非 `~/.openclaw/openclaw.json` 中设置了 `gateway.mode=local`，否则网关拒绝启动。使用 `--allow-unconfigured` 进行临时/开发运行。
- `openclaw onboard --mode local` 和 `openclaw setup` 应该会写入 `gateway.mode=local`。如果文件存在但缺少 `gateway.mode`，请将其视为损坏或被覆盖的配置并进行修复，而不是隐式假设为本地模式。
- 如果文件存在且缺少 `gateway.mode`，网关会将此视为可疑的配置损坏，并拒绝为您“猜测本地模式”。
- 未经认证绑定到环回地址之外是被阻止的（安全护栏）。
- `SIGUSR1` 在授权时触发进程内重启（默认启用 `commands.restart`；设置 `commands.restart: false` 可阻止手动重启，同时允许网关工具/配置应用/更新）。
- `SIGINT`/`SIGTERM` 处理程序会停止网关进程，但它们不会恢复任何自定义终端状态。如果您使用 TUI 或原始模式输入包装 CLI，请在退出前恢复终端。

### 参数选项

- `--port <port>`: WebSocket 端口（默认来自配置/环境变量；通常为 `18789`）。
- `--bind <loopback|lan|tailnet|auto|custom>`: 监听器绑定模式。
- `--auth <token|password>`: 认证模式覆盖。
- `--token <token>`: 令牌覆盖（同时为进程设置 `OPENCLAW_GATEWAY_TOKEN`）。
- `--password <password>`: 密码覆盖。警告：内联密码可能会在本地进程列表中暴露。
- `--password-file <path>`: 从文件读取网关密码。
- `--tailscale <off|serve|funnel>`: 通过 Tailscale 暴露网关。
- `--tailscale-reset-on-exit`: 关闭时重置 Tailscale serve/funnel 配置。
- `--allow-unconfigured`: 允许网关在配置中缺少 `gateway.mode=local` 的情况下启动。这仅用于临时/开发引导绕过启动保护；它不会写入或修复配置文件。
- `--dev`: 如果缺少则创建开发配置 + 工作区（跳过 BOOTSTRAP.md）。
- `--reset`: 重置开发配置 + 凭据 + 会话 + 工作区（需要 `--dev`）。
- `--force`: 启动前终止选定端口上的任何现有监听器。
- `--verbose`: 详细日志。
- `--cli-backend-logs`: 仅在控制台中显示 CLI 后端日志（并启用 stdout/stderr）。
- `--ws-log <auto|full|compact>`: WebSocket 日志样式（默认 `auto`）。
- `--compact`: `--ws-log compact` 的别名。
- `--raw-stream`: 将原始模型流事件记录到 jsonl。
- `--raw-stream-path <path>`: 原始流 jsonl 路径。

启动性能分析：

- 设置 `OPENCLAW_GATEWAY_STARTUP_TRACE=1` 可在 Gateway 启动期间记录各阶段耗时，包括每个阶段的 `eventLoopMax` 延迟，以及已安装索引、清单注册表、启动规划和 owner-map 工作的插件查找表计时。
- 运行 `pnpm test:startup:gateway -- --runs 5 --warmup 1` 可对 Gateway 启动进行基准测试。该基准会记录首次进程输出、`/healthz`、`/readyz`、启动追踪计时、事件循环延迟和插件查找表计时细节。

## 查询正在运行的网关

所有查询命令均使用 WebSocket RPC。

输出模式：

- 默认：人类可读（TTY 中带颜色）。
- `--json`：机器可读 JSON（无样式/无加载动画）。
- `--no-color`（或设置环境变量 `NO_COLOR=1`）：禁用 ANSI 颜色，但保留人类布局。

通用选项（支持时）：

- `--url <url>`：网关 WebSocket URL。
- `--token <token>`：网关令牌。
- `--password <password>`：网关密码。
- `--timeout <ms>`：超时/预算时间（各命令可能不同）。
- `--expect-final`：等待“最终”响应（用于代理调用）。

注意：当指定了 `--url` 后，CLI 不会回退至配置或环境变量中的凭据。  
必须显式传入 `--token` 或 `--password`。缺少显式凭据会导致错误。

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

HTTP `/healthz` 端点是存活探针：一旦服务器能够响应 HTTP，它就会返回。HTTP `/readyz` 端点更严格，在启动 sidecar、频道或已配置钩子仍在就绪过程中时会保持红色。

### `gateway usage-cost`

从会话日志中获取使用成本摘要。

```bash
openclaw gateway usage-cost
openclaw gateway usage-cost --days 7
openclaw gateway usage-cost --json
```

选项：

- `--days <days>`: 包含的天数（默认 `30`）。

### `gateway stability`

从正在运行的 Gateway 中获取最近的诊断稳定性记录器。

```bash
openclaw gateway stability
openclaw gateway stability --type payload.large
openclaw gateway stability --bundle latest
openclaw gateway stability --bundle latest --export
openclaw gateway stability --json
```

选项：

- `--limit <limit>`: 要包含的最近事件最大数量（默认 `25`，最大 `1000`）。
- `--type <type>`: 按诊断事件类型筛选，例如 `payload.large` 或 `diagnostic.memory.pressure`。
- `--since-seq <seq>`: 仅包含某个诊断序列号之后的事件。
- `--bundle [path]`: 读取持久化的稳定性包，而不是调用正在运行的 Gateway。使用 `--bundle latest`（或直接使用 `--bundle`）获取状态目录下最新的包，或直接传入 bundle JSON 路径。
- `--export`: 写出一个可共享的支持诊断 zip，而不是打印稳定性详情。
- `--output <path>`: `--export` 的输出路径。

说明：

- 记录会保留运行元数据：事件名称、计数、字节大小、内存读数、队列/会话状态、频道/插件名称以及已脱敏的会话摘要。它们不会保留聊天文本、webhook 正文、工具输出、原始请求或响应正文、令牌、cookie、密钥值、主机名或原始会话 ID。设置 `diagnostics.enabled: false` 可完全禁用记录器。
- 在 Gateway 致命退出、关闭超时和重启启动失败时，如果记录器中有事件，OpenClaw 会将相同的诊断快照写入 `~/.openclaw/logs/stability/openclaw-stability-*.json`。使用 `openclaw gateway stability --bundle latest` 检查最新的 bundle；`--limit`、`--type` 和 `--since-seq` 也适用于 bundle 输出。

### `gateway diagnostics export`

写出一个设计用于附加到 bug 报告中的本地诊断 zip。  
关于隐私模型和 bundle 内容，请参见 [Diagnostics Export](/gateway/diagnostics)。

```bash
openclaw gateway diagnostics export
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
openclaw gateway diagnostics export --json
```

选项：

- `--output <path>`: 输出 zip 路径。默认位于状态目录下的支持导出文件。
- `--log-lines <count>`: 要包含的经过清理的最大日志行数（默认 `5000`）。
- `--log-bytes <bytes>`: 要检查的最大日志字节数（默认 `1000000`）。
- `--url <url>`: 用于健康快照的 Gateway WebSocket URL。
- `--token <token>`: 用于健康快照的 Gateway 令牌。
- `--password <password>`: 用于健康快照的 Gateway 密码。
- `--timeout <ms>`: 状态/健康快照超时（默认 `3000`）。
- `--no-stability-bundle`: 跳过持久化稳定性包查找。
- `--json`: 以 JSON 打印写入的路径、大小和清单。

导出内容包含清单、Markdown 摘要、配置形状、经过清理的配置详情、经过清理的日志摘要、经过清理的 Gateway 状态/健康快照，以及（如果存在）最新的稳定性包。

它 предназнач于共享。它保留有助于调试的运行细节，例如安全的 OpenClaw 日志字段、子系统名称、状态码、持续时间、已配置模式、端口、插件 ID、提供者 ID、非敏感功能设置以及已脱敏的运行日志消息。它会省略或脱敏聊天文本、webhook 正文、工具输出、凭据、cookie、账户/消息标识符、提示/指令文本、主机名和密钥值。当某条类似 LogTape 的消息看起来像用户/聊天/工具负载文本时，导出只保留该消息已被省略这一事实及其字节数。

### `gateway status`

`gateway status` 显示 Gateway 服务（launchd/systemd/schtasks）以及一个可选的连通性/认证能力探测。

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

参数：

- `--url <url>`: 添加一个显式探测目标。已配置的远程地址和 localhost 仍会被探测。
- `--token <token>`: 该探测的令牌认证。
- `--password <password>`: 该探测的密码认证。
- `--timeout <ms>`: 探测超时（默认 `10000`）。
- `--no-probe`: 跳过连通性探测（仅查看服务）。
- `--deep`: 也扫描系统级服务。
- `--require-rpc`: 将默认连通性探测升级为读取探测，并在该读取探测失败时以非零状态退出。不能与 `--no-probe` 组合使用。

说明：

- 即使本地 CLI 配置缺失或无效，`gateway status` 仍可用于诊断。
- 默认的 `gateway status` 可证明服务状态、WebSocket 连接，以及在握手时可见的认证能力。它不能证明读/写/管理员操作可用。
- `gateway status` 会在可能时为探测认证解析已配置的 auth SecretRef。
- 如果在此命令路径中必需的 auth SecretRef 无法解析，而探测认证失败，`gateway status --json` 会报告 `rpc.authWarning`；请显式传入 `--token`/`--password`，或先解析密钥来源。
- 如果探测成功，为避免误报，将抑制未解析 auth-ref 的警告。
- 当“监听服务存在”还不够、而您还需要读取范围的 RPC 调用也正常时，请在脚本和自动化中使用 `--require-rpc`。
- `--deep` 会尽力额外扫描 launchd/systemd/schtasks 的安装项。检测到多个类似网关的服务时，人类输出会打印清理建议，并提示大多数环境每台机器只应运行一个网关。
- 人类输出会包含解析后的文件日志路径，以及 CLI 与服务配置路径/有效性快照，以帮助诊断 profile 或状态目录漂移。
- 在 Linux systemd 安装中，服务认证漂移检查会从单元中读取 `Environment=` 和 `EnvironmentFile=` 的值（包括 `%h`、带引号路径、多个文件以及可选的 `-` 文件）。
- 漂移检查使用合并后的运行时环境解析 `gateway.auth.token` SecretRef（优先使用服务命令环境，然后回退到进程环境）。
- 如果令牌认证并未有效启用（显式的 `gateway.auth.mode` 为 `password`/`none`/`trusted-proxy`，或者模式未设置且密码可生效而令牌候选无法生效），则令牌漂移检查会跳过配置令牌解析。

### `gateway probe`

`gateway probe` 是“调试一切”命令。它总是探测：

- 已配置的远程网关（如果设置），以及
- 本地主机（环回接口）**即使远程网关配置存在**。

如果传递 `--url`，该明确目标将添加在上述两者之前。人类输出将目标标记为：

- `URL（明确）`
- `远程（已配置）` 或 `远程（已配置，未激活）`
- `本地环回`

如果可达多个网关，将打印所有网关。当使用隔离的配置文件/端口（例如救援机器人）时支持多个网关，但大多数安装仍运行单个网关。

```bash
openclaw gateway probe
openclaw gateway probe --json
```

解释：

- `Reachable: yes` 表示至少有一个目标接受了 WebSocket 连接。
- `Capability: read-only|write-capable|admin-capable|pairing-pending|connect-only` 报告探测能够证明的认证能力。它与可达性是分开的。
- `Read probe: ok` 表示读取范围的详细 RPC 调用（`health`/`status`/`system-presence`/`config.get`）也成功了。
- `Read probe: limited - missing scope: operator.read` 表示连接成功，但读取范围 RPC 受限。这被报告为**降级**可达性，而不是完全失败。
- 仅当没有任何被探测的目标可达时，退出码才为非零。

JSON 说明（`--json`）：

- 顶层：
  - `ok`：至少有一个目标可达。
  - `degraded`：至少有一个目标存在范围受限的详细 RPC。
  - `capability`：在可达目标中看到的最佳能力（`read_only`、`write_capable`、`admin_capable`、`pairing_pending`、`connected_no_operator_scope` 或 `unknown`）。
  - `primaryTargetId`：应视为活动胜者的最佳目标，优先顺序为：明确 URL、SSH 隧道、已配置的远程地址，然后是本地环回。
  - `warnings[]`：尽力而为的警告记录，包含 `code`、`message`，以及可选的 `targetIds`。
  - `network`：根据当前配置和主机网络推导出的本地环回/tailnet URL 提示。
  - `discovery.timeoutMs` 和 `discovery.count`：此探测轮次实际使用的发现预算/结果数量。
- 每个目标（`targets[].connect`）：
  - `ok`：连接后的可达性 + 降级分类。
  - `rpcOk`：完整详细 RPC 成功。
  - `scopeLimited`：详细 RPC 因缺少 operator 范围而失败。
- 每个目标（`targets[].auth`）：
  - `role`：在可用时，由 `hello-ok` 报告的认证角色。
  - `scopes`：在可用时，由 `hello-ok` 报告的已授予范围。
  - `capability`：该目标表面呈现的认证能力分类。

常见警告代码：

- `ssh_tunnel_failed`：SSH 隧道建立失败；命令回退到直接探测。
- `multiple_gateways`：可达目标多于一个；除非您有意运行隔离配置文件（例如救援机器人），否则这不常见。
- `auth_secretref_unresolved`：某个已配置的 auth SecretRef 无法为失败的目标解析。
- `probe_scope_limited`：WebSocket 连接成功，但读取探针因缺少 `operator.read` 而受限。

#### 通过 SSH 远程（与 Mac 应用一致）

macOS 应用中的“远程 SSH”模式使用本地端口转发，使得远程网关（可能只绑定环回地址）可通过 `ws://127.0.0.1:<端口>` 访问。

CLI 等价命令：

```bash
openclaw gateway probe --ssh user@gateway-host
```

参数：

- `--ssh <target>`: `user@host` 或 `user@host:port`（端口默认为 `22`）。
- `--ssh-identity <path>`: 身份文件。
- `--ssh-auto`: 从解析的发现端点（`local.` 加上配置的广域域名，如果有）中选择第一个发现的网关主机作为 SSH 目标。仅 TXT 提示将被忽略。

配置（可选，作为默认值）：

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

低级 RPC 辅助命令。

```bash
openclaw gateway call status
openclaw gateway call logs.tail --params '{"sinceMs": 60000}'
```

选项：

- `--params <json>`: 参数的 JSON 对象字符串（默认 `{}`）
- `--url <url>`
- `--token <token>`
- `--password <password>`
- `--timeout <ms>`
- `--expect-final`
- `--json`

注意：

- `--params` 必须是有效的 JSON。
- `--expect-final` 主要用于代理式 RPC，即在最终负载之前流式传输中间事件。

## 管理网关服务

```bash
openclaw gateway install
openclaw gateway start
openclaw gateway stop
openclaw gateway restart
openclaw gateway uninstall
```

### 使用包装器安装

当受管服务必须通过另一个可执行文件启动时，请使用 `--wrapper`，例如机密管理器封装器或 run-as 辅助程序。包装器接收正常的 Gateway 参数，并负责最终使用这些参数 exec `openclaw` 或 Node。

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

您也可以通过环境变量设置包装器。`gateway install` 会验证该路径是一个可执行文件，将包装器写入服务 `ProgramArguments`，并在服务环境中持久化 `OPENCLAW_WRAPPER`，以便后续强制重装、更新和 doctor 修复继续使用该包装器。

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
    - `gateway status`: `--url`、`--token`、`--password`、`--timeout`、`--no-probe`、`--require-rpc`、`--deep`、`--json`
    - `gateway install`: `--port`、`--runtime <node|bun>`、`--token`、`--wrapper <path>`、`--force`、`--json`
    - `gateway uninstall|start|stop|restart`: `--json`
  </Accordion>
  <Accordion title="生命周期行为">
    - 使用 `gateway restart` 重启受管服务。不要把 `gateway stop` 和 `gateway start` 串联起来替代重启；在 macOS 上，`gateway stop` 在停止之前会有意禁用 LaunchAgent。
    - 生命周期命令接受 `--json` 以便脚本使用。
  </Accordion>
  <Accordion title="安装时的认证与 SecretRef">
    - 当令牌认证需要令牌且 `gateway.auth.token` 由 SecretRef 管理时，`gateway install` 会验证该 SecretRef 是否可解析，但不会将解析出的令牌持久化到服务环境元数据中。
    - 如果令牌认证需要令牌且配置的令牌 SecretRef 未解析，安装将失败关闭，而不是持久化回退明文。
    - 对于 `gateway run` 的密码认证，优先使用 `OPENCLAW_GATEWAY_PASSWORD`、`--password-file` 或由 SecretRef 支持的 `gateway.auth.password`，而不是内联 `--password`。
    - 在推断认证模式下，仅 shell 环境中的 `OPENCLAW_GATEWAY_PASSWORD` 不会放宽安装令牌要求；安装受管服务时请使用持久配置（`gateway.auth.password` 或配置 `env`）。
    - 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未设置 `gateway.auth.mode`，安装将被阻止，直到显式设置模式。
  </Accordion>
</AccordionGroup>

- `gateway status`: `--url`、`--token`、`--password`、`--timeout`、`--no-probe`、`--require-rpc`、`--deep`、`--json`
- `gateway install`: `--port`、`--runtime <node|bun>`、`--token`、`--force`、`--json`
- `gateway uninstall|start|stop|restart`: `--json`

注意：

- `gateway install` 支持 `--port`、`--runtime`、`--token`、`--force`、`--json`。
- 当令牌认证需要令牌且 `gateway.auth.token` 由 SecretRef 管理时，`gateway install` 会验证 SecretRef 是否可解析，但不会将解析后的令牌持久化到服务环境元数据中。
- 如果令牌认证需要令牌且配置的令牌 SecretRef 未解析，安装将直接失败，而不是持久化备用明文。
- 对于 `gateway run` 的密码认证，优先使用 `OPENCLAW_GATEWAY_PASSWORD`、`--password-file` 或由 SecretRef 支持的 `gateway.auth.password`，而不是内联 `--password`。
- 在推断认证模式下，仅 shell 环境的 `OPENCLAW_GATEWAY_PASSWORD` 不会放宽安装令牌要求；安装托管服务时使用持久配置（`gateway.auth.password` 或配置 `env`）。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未设置 `gateway.auth.mode`，安装将被阻止，直到显式设置模式。
- 生命周期命令接受 `--json` 用于脚本编写。

## 发现网关（Bonjour）

`gateway discover` 扫描网关信标（`_openclaw-gw._tcp`）。

- 多播 DNS-SD：`local.` 域。
- 单播 DNS-SD（广域 Bonjour）：选择域（例如 `openclaw.internal.`），并设置分割 DNS + DNS 服务器；详见 [/gateway/bonjour](/gateway/bonjour)。

只有启用了 Bonjour 发现（默认开启）的网关才会广播信标。

广域发现记录包括（TXT）：

- `role`（网关角色提示）
- `transport`（传输提示，例如 `gateway`）
- `gatewayPort`（WebSocket 端口，通常为 `18789`）
- `sshPort`（可选；缺失时客户端默认 SSH 目标为 `22`）
- `tailnetDns`（MagicDNS 主机名，如果可用）
- `gatewayTls` / `gatewayTlsSha256`（启用 TLS + 证书指纹）
- `cliPath`（写入广域区域的远程安装提示）

### `gateway discover`

```bash
openclaw gateway discover
```

参数：

- `--timeout <ms>`：单次命令超时（浏览/解析）；默认 `2000` 毫秒。
- `--json`：机器可读输出（同时禁用样式/加载动画）。

示例：

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

注意：

- CLI 会扫描 `local.`，以及在启用时扫描已配置的广域域名。
- JSON 输出中的 `wsUrl` 是根据解析后的服务端点派生的，而不是来自仅包含 TXT 的
  提示信息，例如 `lanHost` 或 `tailnetDns`。
- 在 `local.` mDNS 中，只有当 `discovery.mdns.mode` 为 `full` 时才会广播 `sshPort` 和 `cliPath`。
  广域 DNS-SD 仍会写入 `cliPath`；`sshPort` 在那里也仍然是可选的。

## 相关内容

- [CLI 参考](/cli)
- [网关运行手册](/gateway)
