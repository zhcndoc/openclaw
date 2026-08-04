---
summary: "Gateway 服务、生命周期和运维手册"
read_when:
  - 运行或调试 gateway 进程时
title: "Gateway 手册"
---

在 Gateway 服务的首日启动和次日运维中使用本页。

<CardGroup cols={2}>
  <Card title="深度故障排查" icon="siren" href="/gateway/troubleshooting">
    以症状为先的诊断，包含精确的命令梯子和日志特征。
  </Card>
  <Card title="配置" icon="sliders" href="/gateway/configuration">
    面向任务的设置指南 + 完整配置参考。
  </Card>
  <Card title="密钥管理" icon="key-round" href="/gateway/secrets">
    SecretRef 契约、运行时快照行为，以及迁移/重载操作。
  </Card>
  <Card title="密钥计划契约" icon="shield-check" href="/gateway/secrets-plan-contract">
    `secrets apply` 的精确目标/路径规则，以及仅引用 auth-profile 的行为。
  </Card>
</CardGroup>

## 5 分钟本地启动

<Steps>
  <Step title="启动 Gateway">

```bash
openclaw gateway --port 18789
# 调试/跟踪输出镜像到 stdio
openclaw gateway --port 18789 --verbose
# 先强制杀掉所选端口上的监听器，然后启动
openclaw gateway --force
```

  </Step>

  <Step title="验证服务健康状态">

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
```

健康基线：`Runtime: running`、`Connectivity probe: ok`，以及一行符合预期的 `Capability`。如果要证明读权限范围内的 RPC，而不只是连通性，请使用 `openclaw gateway status --require-rpc`。

  </Step>

  <Step title="验证通道就绪状态">

```bash
openclaw channels status --probe
```

在网关可达时，这会针对每个账户运行实时通道探测以及可选审计。如果网关不可达，CLI 会回退为仅基于配置的通道摘要。

  </Step>
</Steps>

<Note>
网关配置重载会监视当前活动配置文件路径（从 profile/state 默认值解析而来，或在设置了 `OPENCLAW_CONFIG_PATH` 时使用该路径）。默认模式是 `gateway.reload.mode="hybrid"`。在首次成功加载后，运行中的进程会提供当前的内存中配置快照；一次成功的重载会原子性地替换该快照。
</Note>

## 运行模型

- 一个始终运行的进程，用于路由、控制平面和通道连接。
- 单一复用端口用于：
  - WebSocket 控制/RPC
  - HTTP API（`/v1/models`、`/v1/embeddings`、`/v1/chat/completions`、`/v1/responses`、`/tools/invoke`）
  - 插件 HTTP 路由，例如可选的 `/api/v1/admin/rpc`
  - 控制界面和 hooks
- 默认绑定模式：`loopback`。在检测到容器环境时，实际默认值为 `auto`（会解析为 `0.0.0.0`，用于端口转发），除非 Tailscale serve/funnel 处于活动状态，此时始终强制为 `loopback`。
- 默认需要认证。共享密钥配置使用 `gateway.auth.token` / `gateway.auth.password`（或 `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`），非 loopback 的反向代理配置可以使用 `gateway.auth.mode: "trusted-proxy"`。

## OpenAI 兼容端点

OpenClaw 的最高杠杆兼容性接触面：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`
- `POST /v1/responses`

这个集合的重要性在于：

- 大多数 Open WebUI、LobeChat 和 LibreChat 集成会首先探测 `/v1/models`。
- 许多 RAG 和 memory 流水线期望有 `/v1/embeddings`。
- 原生 agent 客户端越来越倾向于 `/v1/responses`。

`/v1/models` 采用 agent 优先模式：它会为每个已配置的 agent 返回 `openclaw`、`openclaw/default` 和 `openclaw/<agentId>`。`openclaw/default` 是稳定别名，始终映射到已配置的默认 agent。需要后端 provider/model 覆盖时，请发送 `x-openclaw-model`；否则，所选 agent 的常规模型和 embedding 配置将保持控制权。

所有这些端点都运行在主 Gateway 端口上，并使用与 Gateway 其余 HTTP API 相同的受信操作员认证边界。

Admin HTTP RPC (`POST /api/v1/admin/rpc`) 是一个独立的、默认关闭的插件路由，供无法使用 WebSocket RPC 的主机工具使用。请参见 [Admin HTTP RPC](/plugins/admin-http-rpc)。

### 端口和绑定优先级

| 设置         | 解析顺序                                                         |
| ------------ | ---------------------------------------------------------------- |
| Gateway 端口 | `--port` → `OPENCLAW_GATEWAY_PORT` → `gateway.port` → `18789`    |
| 绑定模式     | CLI/override → `gateway.bind` → `loopback`（容器中为 `auto`） |

已安装的 gateway 服务会在 supervisor 元数据中记录解析后的 `--port`。更改 `gateway.port` 后，请运行 `openclaw doctor --fix` 或 `openclaw gateway install --force`，以便 launchd/systemd/schtasks 在新端口上启动进程。

Gateway 启动时使用相同的实际端口和绑定方式，并在为非 loopback 绑定播种本地 Control UI origins 时采用这些设置。例如，`--bind lan --port 3000` 会在运行时验证之前先播种 `http://localhost:3000` 和 `http://127.0.0.1:3000`。请将任何远程浏览器 origins，例如 HTTPS 代理 URL，显式添加到 `gateway.controlUi.allowedOrigins`。

### 热重载模式

| `gateway.reload.mode` | 行为                                   |
| --------------------- | -------------------------------------- |
| `off`                 | 不重新加载配置                         |
| `hybrid` (默认)       | 安全时热应用，需要时重启               |

早期的 `hot` 和 `restart` 模式已弃用；[`openclaw doctor --fix`](/cli/doctor) 会将两者都映射为 `hybrid`。

## 操作员命令集

```bash
openclaw gateway status
openclaw gateway status --deep   # 添加系统级服务扫描
openclaw gateway status --json
openclaw gateway install
openclaw gateway restart
openclaw gateway stop
openclaw secrets reload
openclaw logs --follow
openclaw doctor
```

`gateway status --deep` 用于额外的服务发现（LaunchDaemons/systemd 系统单元/schtasks），而不是更深入的 RPC 健康探测。

## 多个 gateway（同一主机）

大多数安装应当每台机器只运行一个 gateway。单个 gateway 可以承载多个 agent 和 channel。只有在你有意需要隔离，或者需要一个救援 bot 时，才需要多个 gateway。

有用的检查：

```bash
openclaw gateway status --deep
openclaw gateway probe
```

预期结果：

- `gateway status --deep` 可以报告 `Other gateway-like services detected (best effort)`，并在仍存在陈旧的 launchd/systemd/schtasks 安装时打印清理提示。
- `gateway probe` 在检测到不同的 gateway 响应，或者 OpenClaw 无法证明可达目标是同一个 gateway 时，可能会警告 `multiple reachable gateway identities`。SSH 隧道、代理 URL，或指向同一个 gateway 的已配置远程 URL，即使传输端口不同，也仍然算作一个 gateway 的多种传输方式。
- 如果这是有意为之，请为每个 gateway 分别隔离端口、配置/状态以及工作区根目录。

每个实例的检查清单：

- 唯一的 `gateway.port`
- 唯一的 `OPENCLAW_CONFIG_PATH`
- 唯一的 `OPENCLAW_STATE_DIR`
- 唯一的 `agents.defaults.workspace`

示例：

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json OPENCLAW_STATE_DIR=~/.openclaw-a openclaw gateway --port 19001
OPENCLAW_CONFIG_PATH=~/.openclaw/b.json OPENCLAW_STATE_DIR=~/.openclaw-b openclaw gateway --port 19002
```

详细设置：[/gateway/multiple-gateways](/gateway/multiple-gateways)。

## 远程访问

首选：Tailscale/VPN。  
备选：SSH 隧道。

```bash
ssh -N -L 18789:127.0.0.1:18789 user@gateway-host
```

然后在本地将客户端连接到 `ws://127.0.0.1:18789`。

<Warning>
SSH 隧道不会绕过 gateway 认证。对于共享密钥认证，即使通过隧道，客户端仍然必须发送 `token`/`password`。对于带身份的模式，请求仍然必须满足该认证路径。
</Warning>

参见：[远程 Gateway](/gateway/remote)、[认证](/gateway/authentication)、[Tailscale](/gateway/tailscale)。

## 监督与服务生命周期

生产级可靠性请使用受监督运行。

<Tabs>
  <Tab title="macOS（launchd）">

```bash
openclaw gateway install
openclaw gateway status
openclaw gateway restart
openclaw gateway stop
```

使用 `openclaw gateway restart` 进行重启。不要将 `openclaw gateway stop` 和 `openclaw gateway start` 串联起来代替重启。

在 macOS 上，`gateway stop` 默认使用 `launchctl bootout`。这会将 LaunchAgent 从当前启动会话中移除，但不会持久化禁用，因此在意外崩溃后仍可通过 KeepAlive 自动恢复，并且 `gateway start` 会干净地重新启用。若要在重启后持续抑制自动重启，请传入 `--disable`：`openclaw gateway stop --disable`。

LaunchAgent 标签为 `ai.openclaw.gateway`（默认）或 `ai.openclaw.<profile>`（命名 profile）。`openclaw doctor` 会审计并修复服务配置漂移。

### 已存在的系统 LaunchDaemon

OpenClaw 会安装并管理每用户的 LaunchAgent，但不会安装或管理系统 LaunchDaemon。如果自定义 LaunchDaemon 已经使用相同的网关标签，OpenClaw 将拒绝写入、启动、重启或修复用户 LaunchAgent，因为两个 `KeepAlive` 管理器可能会反复重启同一个网关。

所有权检查会读取 `launchctl print system/<label>`，同时检查 `/Library/LaunchDaemons` 下已安装的 plist。当无法验证系统所有权时，检查将采取默认拒绝策略，并且 `--force` 也无法绕过。`openclaw gateway status` 会报告已加载的同标签系统任务；添加 `--deep` 可扫描已安装的系统服务文件。

在重试前，请选择一个生命周期所有者：

- 若要保留自定义系统 LaunchDaemon，请移除任何冲突的用户 LaunchAgent，并在运行 Doctor 时设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`，使其在服务生命周期方面仅执行诊断。
- 若要恢复到受支持的用户 LaunchAgent，请使用 `sudo launchctl bootout system/<label>` 卸载系统任务，移除或迁移其实际 plist，以目标用户身份登录 macOS 桌面，然后运行 `openclaw gateway install`。

对于默认 profile，`<label>` 为 `ai.openclaw.gateway`。命名 profile 使用 `ai.openclaw.<profile>`。

  </Tab>

  <Tab title="Linux（systemd 用户级）">

```bash
openclaw gateway install
systemctl --user enable --now openclaw-gateway[-<profile>].service
openclaw gateway status
```

若要在注销后仍保持运行，请启用 lingering：

```bash
sudo loginctl enable-linger $(whoami)
```

在没有桌面会话的无头服务器上，在重试 `systemctl --user` 命令之前，也要确保已设置 `XDG_RUNTIME_DIR`（`export XDG_RUNTIME_DIR=/run/user/$(id -u)`）。

需要自定义安装路径时，可参考手动 user-unit 示例：

```ini
[Unit]
Description=OpenClaw 网关
After=network-online.target
Wants=network-online.target
StartLimitBurst=5
StartLimitIntervalSec=60

[Service]
ExecStart=/usr/local/bin/openclaw gateway --port 18789
Restart=always
RestartSec=5
RestartPreventExitStatus=78
TimeoutStopSec=30
TimeoutStartSec=30
SuccessExitStatus=0 143
OOMPolicy=continue
KillMode=control-group

[Install]
WantedBy=default.target
```

  </Tab>

  <Tab title="Windows（原生）">

```powershell
openclaw gateway install
openclaw gateway status --json
openclaw gateway restart
openclaw gateway stop
```

Windows 原生托管启动使用名为 `OpenClaw Gateway` 的计划任务
（命名 profile 则为 `OpenClaw Gateway (<profile>)`）。如果拒绝创建计划任务，
OpenClaw 会回退到每用户 Startup 文件夹启动器，
该启动器指向状态目录中的 `gateway.cmd`。

  </Tab>

  <Tab title="Linux（系统服务）">

对于多用户/始终在线的主机，请使用 system unit。

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway[-<profile>].service
```

使用与 user unit 相同的服务主体，但将其安装到
`/etc/systemd/system/openclaw-gateway[-<profile>].service`，并在
`openclaw` 二进制文件位于其他位置时调整 `ExecStart=`。

也不要让 `openclaw doctor --fix` 为同一 profile/端口安装用户级 gateway 服务。当它发现 system 级 OpenClaw gateway 服务时，doctor 会拒绝该自动安装；当系统 unit 拥有生命周期时，请使用 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。

  </Tab>
</Tabs>

无效配置错误会以代码 `78` 退出。Linux systemd unit 使用 `RestartPreventExitStatus=78`，在配置修复之前停止重新启动。launchd 和 Windows 任务计划程序没有按退出代码停止的等效规则，因此 Gateway 还会持久化快速且不干净的启动历史，并在多次启动失败后抑制渠道/提供商账户的自动启动。在该安全模式下，控制平面仍会启动，以便进行检查和修复；配置热重载和 `secrets.reload` 会拒绝自动重启渠道，而操作员明确发起的 `channels.start` 请求可以覆盖这一抑制。分步恢复说明请参阅[重启恢复](/gateway/restart-recovery#safety-valves-and-observability)。

## 开发者配置快速路径

```bash
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status
```

默认包含隔离的状态/配置以及基础 gateway 端口 `19001`。

## 协议快速参考（操作员视图）

- 首个客户端帧必须是 `connect`。
- 网关返回一个带有 `snapshot`（`presence`、`health`、`stateVersion`、`uptimeMs`）以及 `policy` 限制（`maxPayload`、`maxBufferedBytes`、`tickIntervalMs`）的 `hello-ok` 帧。
- `hello-ok.features.methods` / `events` 是保守的发现列表，不是
  所有可调用辅助路由的生成式转储。
- 请求：`req(method, params)` → `res(ok/payload|error)`。
- 常见事件包括 `connect.challenge`、`agent`、`chat`、
  `session.message`、`session.operation`、`session.tool`、可选的
  `session.approval`、`sessions.changed`、`presence`、`tick`、`health`、
  `heartbeat`、配对/审批生命周期事件，以及 `shutdown`。

代理运行分为两个阶段：

1. 立即返回已接受确认（`status:"accepted"`）
2. 最终完成响应（`status:"ok"|"error"`），中间会有流式的 `agent` 事件。

查看完整协议文档：[网关协议](/gateway/protocol)。

## 运行检查

### 存活性

- 打开 WS 并发送 `connect`。
- 期望返回带快照的 `hello-ok` 响应。

### 就绪性

```bash
openclaw gateway status
openclaw channels status --probe
openclaw health
```

### 间隙恢复

事件不会重放。出现序列间隙时，在继续之前先刷新状态（`health`、`system-presence`）。

## 常见失败特征

| 特征                                                           | 可能的问题                                                                  |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `refusing to bind gateway ... without auth`                    | 非回环地址绑定，但没有有效的网关认证路径                           |
| `another gateway instance is already listening` / `EADDRINUSE` | 端口冲突                                                                 |
| `Gateway start blocked: set gateway.mode=local`                | 配置被设为远程模式，或损坏的配置中缺少 `gateway.mode` |
| `unauthorized` during connect                                  | 客户端与网关之间的认证不匹配                                      |

如需完整诊断阶梯，请使用 [网关故障排除](/gateway/troubleshooting)。

## 安全保障

- 当 Gateway 不可用时，Gateway 协议客户端会快速失败（不隐式回退到 direct-channel）。
- 非法/非 `connect` 的首帧会被拒绝并关闭。
- 优雅关闭会在 socket 关闭前发出 `shutdown` 事件。

## 相关

- [配置](/gateway/configuration)
- [网关故障排除](/gateway/troubleshooting)
- [后台进程](/gateway/background-process)
- [健康状态](/gateway/health)
- [诊断工具](/gateway/doctor)
- [身份验证](/gateway/authentication)
- [远程访问](/gateway/remote)
- [密钥管理](/gateway/secrets)
