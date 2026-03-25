---
summary: "OpenClaw Gateway CLI (`openclaw gateway`) — 运行、查询和发现网关"
read_when:
  - 从 CLI 运行网关（开发或服务器环境）
  - 调试网关认证、绑定模式和连接性
  - 通过 Bonjour（局域网 + tailnet）发现网关
title: "gateway"
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

- 默认情况下，除非在 `~/.openclaw/openclaw.json` 中设置了 `gateway.mode=local`，否则网关拒绝启动。可使用 `--allow-unconfigured` 进行临时/开发运行。
- 禁止在未经认证的情况下绑定非环回地址（安全防护措施）。
- 授权情况下（默认启用 `commands.restart`），发送 `SIGUSR1` 信号会触发进程内重启；设置 `commands.restart: false` 可阻止手动重启，但仍允许网关工具/配置应用和更新。
- `SIGINT`/`SIGTERM` 处理器会停止网关进程，但不会恢复任何自定义终端状态。如果以 TUI 或原始模式输入包裹 CLI，退出前请恢复终端状态。

### 参数选项

- `--port <port>`：WebSocket 端口（默认取自配置或环境变量，通常为 `18789`）。
- `--bind <loopback|lan|tailnet|auto|custom>`：监听绑定模式。
- `--auth <token|password>`：认证模式覆盖。
- `--token <token>`：token 覆盖（同时设置进程环境变量 `OPENCLAW_GATEWAY_TOKEN`）。
- `--password <password>`：密码覆盖。警告：内联密码可能会暴露于本地进程列表中。
- `--password-file <path>`：从文件读取网关密码。
- `--tailscale <off|serve|funnel>`：通过 Tailscale 曝露网关。
- `--tailscale-reset-on-exit`：关闭时重置 Tailscale 服务/漏斗配置。
- `--allow-unconfigured`：允许无 `gateway.mode=local` 配置启动网关。
- `--dev`：若缺失则创建开发配置+工作区（跳过 BOOTSTRAP.md）。
- `--reset`：重置开发配置、凭据、会话和工作区（需配合 `--dev` 使用）。
- `--force`：启动前杀死指定端口上已有监听进程。
- `--verbose`：启用详细日志。
- `--claude-cli-logs`：仅在控制台显示 claude-cli 日志（并启用其 stdout/stderr）。
- `--ws-log <auto|full|compact>`：WebSocket 日志风格（默认 `auto`）。
- `--compact`：`--ws-log compact` 的别名。
- `--raw-stream`：将原始模型流事件记录为 jsonl。
- `--raw-stream-path <path>`：原始流 jsonl 文件路径。

## 查询运行中的网关

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

注意：当指定了 `--url` 后，CLI 不会 fallback 至配置或环境变量中的凭据。  
必须显式传入 `--token` 或 `--password`。缺少显式凭据会导致错误。

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

### `gateway status`

`gateway status` 显示网关服务状态（launchd/systemd/schtasks），并可选择进行 RPC 探测。

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

参数：

- `--url <url>`: 覆盖探测 URL。
- `--token <token>`: 探测的令牌认证。
- `--password <password>`: 探测的密码认证。
- `--timeout <ms>`: 探测超时（默认 `10000`）。
- `--no-probe`: 跳过 RPC 探测（仅查看服务状态）。
- `--deep`: 也扫描系统级服务。
- `--require-rpc`: RPC 探测失败时返回非零退出状态。不可与 `--no-probe` 同时使用。

说明：

- `gateway status` 会在可能的情况下解析配置的认证 SecretRefs 以进行探测认证。
- 若命令路径中必需的认证 SecretRef 未解析，`gateway status --json` 在探测连接或认证失败时报告 `rpc.authWarning`；可显式传入 `--token`/`--password` 或先解析秘密源。
- 探测成功时，未解析的认证引用警告会被抑制以避免误报。
- 在脚本和自动化中使用 `--require-rpc`，当单纯监听服务不足以确认状态时，需要确保 Gateway RPC 本身正常。
- 在 Linux systemd 安装中，服务认证漂移检查会读取单元中的 `Environment=` 和 `EnvironmentFile=` 值（包括 `%h`、带引号路径、多文件及可选的 `-` 文件）。

### `gateway probe`

`gateway probe` 是“调试一切”命令。它总是探测：

- 配置的远程网关（如果设置），以及
- 本地主机（环回接口）**即使远程网关配置存在**。

如果发现多个网关，会全部打印。多网关支持用于隔离的配置/端口（比如救援机器人），但大多数安装仍只运行单一网关。

```bash
openclaw gateway probe
openclaw gateway probe --json
```

解释：

- `Reachable: yes` 表示至少一个目标接受了 WebSocket 连接。
- `RPC: ok` 表示详细的 RPC 调用（`health`/`status`/`system-presence`/`config.get`）也成功。
- `RPC: limited - missing scope: operator.read` 表示连接成功但详细 RPC 受限于作用域。此状态被报告为 **降级** 的可达性，而非完全失败。
- 仅当所有探测目标均不可达时，退出码非零。

JSON 说明 (`--json`)：

- 顶层：
  - `ok`：至少有一个目标可达。
  - `degraded`：至少一个目标详细 RPC 受限。
- 按目标（`targets[].connect`）：
  - `ok`：连接后可达性及降级分类。
  - `rpcOk`：详细 RPC 调用成功。
  - `scopeLimited`：由于缺少 operator 作用域导致详细 RPC 失败。

#### 通过 SSH 远程（与 Mac 应用一致）

macOS 应用中的“远程 SSH”模式使用本地端口转发，使得远程网关（可能只绑定环回地址）可通过 `ws://127.0.0.1:<端口>` 访问。

CLI 等价命令：

```bash
openclaw gateway probe --ssh user@gateway-host
```

参数：

- `--ssh <target>`：格式为 `user@host` 或 `user@host:port`（端口默认 22）。
- `--ssh-identity <path>`：SSH 身份文件路径。
- `--ssh-auto`：自动选择第一个发现的网关主机作为 SSH 目标（仅限 LAN/WAB）。

配置（可选，作为默认值）：

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

低级 RPC 辅助命令。

```bash
openclaw gateway call status
openclaw gateway call logs.tail --params '{"sinceMs": 60000}'
```

## 管理网关服务

```bash
openclaw gateway install
openclaw gateway start
openclaw gateway stop
openclaw gateway restart
openclaw gateway uninstall
```

说明：

- `gateway install` supports `--port`, `--runtime`, `--token`, `--force`, `--json`.
- When token auth requires a token and `gateway.auth.token` is SecretRef-managed, `gateway install` validates that the SecretRef is resolvable but does not persist the resolved token into service environment metadata.
- If token auth requires a token and the configured token SecretRef is unresolved, install fails closed instead of persisting fallback plaintext.
- For password auth on `gateway run`, prefer `OPENCLAW_GATEWAY_PASSWORD`, `--password-file`, or a SecretRef-backed `gateway.auth.password` over inline `--password`.
- In inferred auth mode, shell-only `OPENCLAW_GATEWAY_PASSWORD` does not relax install token requirements; use durable config (`gateway.auth.password` or config `env`) when installing a managed service.
- If both `gateway.auth.token` and `gateway.auth.password` are configured and `gateway.auth.mode` is unset, install is blocked until mode is set explicitly.
- Lifecycle commands accept `--json` for scripting.

## 发现网关（Bonjour）

`gateway discover` 扫描网关信标（`_openclaw-gw._tcp`）。

- 多播 DNS-SD：`local.` 域。
- 单播 DNS-SD（广域 Bonjour）：选择域（例如 `openclaw.internal.`），并设置分割 DNS + DNS 服务器；详见 [/gateway/bonjour](/gateway/bonjour)。

只有启用了 Bonjour 发现（默认开启）的网关才会广播信标。

广域发现记录包括（TXT）：

- `role`（网关角色提示）
- `transport`（传输提示，如 `gateway`）
- `gatewayPort`（WebSocket 端口，通常为 `18789`）
- `sshPort`（SSH 端口，不存在时默认为 `22`）
- `tailnetDns`（MagicDNS 主机名，如可用）
- `gatewayTls` / `gatewayTlsSha256`（TLS 启用状态及证书指纹）
- `cliPath`（远程安装的可选提示）

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
