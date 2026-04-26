---
summary: "Gateway 服务的运行手册、生命周期和操作指南"
read_when:
  - Running or debugging the gateway process
title: "Gateway 运行手册"
---

使用此页面进行 Gateway 服务的 day-1 启动和 day-2 运维。

<CardGroup cols={2}>
  <Card title="深度故障排查" icon="siren" href="/gateway/troubleshooting">
    以症状为先的诊断，包含精确的命令流程和日志特征。
  </Card>
  <Card title="配置" icon="sliders" href="/gateway/configuration">
    任务导向的设置指南 + 完整配置参考。
  </Card>
  <Card title="密钥管理" icon="key-round" href="/gateway/secrets">
    SecretRef 合约、运行时快照行为及迁移/重载操作。
  </Card>
  <Card title="密钥计划合约" icon="shield-check" href="/gateway/secrets-plan-contract">
    精确的 `secrets apply` 目标/路径规则及仅引用的 auth-profile 行为。
  </Card>
</CardGroup>

## 5 分钟本地启动

<Steps>
  <Step title="启动 Gateway">

```bash
openclaw gateway --port 18789
# debug/trace 日志镜像到标准输出
openclaw gateway --port 18789 --verbose
# 强制终止所选端口的监听进程后启动
openclaw gateway --force
```

  </Step>

  <Step title="验证服务健康状态">

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
```

健康基线：`Runtime: running`、`Connectivity probe: ok`，以及符合你预期的 `Capability: ...`。在需要读取范围内 RPC 证明而不仅仅是可达性时，使用 `openclaw gateway status --require-rpc`。

  </Step>

  <Step title="验证通道准备情况">

```bash
openclaw channels status --probe
```

对于可到达的 Gateway，这会运行实时的每账户通道探测和可选审计。
如果 Gateway 不可到达，CLI 将回退到仅配置的通道摘要，
而不是实时探测输出。

  </Step>
</Steps>

<Note>
Gateway 配置重载会监视活动的配置文件路径（从 profile/state 默认值解析，或在设置 `OPENCLAW_CONFIG_PATH` 时使用该值）。
默认模式为 `gateway.reload.mode="hybrid"`。
首次成功加载后，运行中的进程提供活动的内存配置快照；成功重载会原子性地替换该快照。
</Note>

## 运行时模型

- 一个用于路由、控制平面和通道连接的常启进程。
- 单个多路复用端口用于：
  - WebSocket 控制/RPC
  - HTTP API、OpenAI 兼容 (`/v1/models`, `/v1/embeddings`, `/v1/chat/completions`, `/v1/responses`, `/tools/invoke`)
  - 控制 UI 和钩子
- 默认绑定模式：`loopback`。
- 默认需要认证。共享密钥设置使用
  `gateway.auth.token` / `gateway.auth.password` (或
  `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`)，非环回
  反向代理设置可以使用 `gateway.auth.mode: "trusted-proxy"`。

## OpenAI 兼容端点

OpenClaw 目前最具效益的兼容层包括：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`
- `POST /v1/responses`

此组端点的重要性：

- 大多数 Open WebUI、LobeChat 和 LibreChat 集成首先探测 `/v1/models`。
- 许多 RAG 和记忆流水线依赖 `/v1/embeddings`。
- Agent 原生客户端越来越倾向于使用 `/v1/responses`。

规划说明：

- `/v1/models` 以 Agent 优先：它返回 `openclaw`、`openclaw/default` 和 `openclaw/<agentId>`。
- `openclaw/default` 是一个稳定的别名，始终映射到配置的默认 Agent。
- 当你需要覆盖后端提供商/模型时使用 `x-openclaw-model`；否则所选 Agent 的正常模型和嵌入设置将保持控制。

所有这些都在主 Gateway 端口上运行，并使用与其余 Gateway HTTP API 相同的可信操作员认证边界。

### 端口和绑定优先级

| 设置           | 解析顺序                                                     |
| -------------- | ------------------------------------------------------------ |
| Gateway 端口    | `--port` → `OPENCLAW_GATEWAY_PORT` → `gateway.port` → `18789` |
| 绑定模式       | 命令行/覆盖 → `gateway.bind` → `loopback`                      |

### 热重载模式

| `gateway.reload.mode` | 行为                                     |
| --------------------- | ---------------------------------------- |
| `off`                 | 不重载配置                              |
| `hot`                 | 仅应用安全的实时变更                     |
| `restart`             | 变更需重启时重启                         |
| `hybrid`（默认）      | 安全时热应用，需时重启                   |

## 操作命令集

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

`gateway status --deep` 用于额外的服务发现（LaunchDaemons/systemd 系统
单元/schtasks），而不是更深层的 RPC 健康探测。

## 同一主机上的多个 Gateway

大多数安装应在每台机器上运行一个 Gateway。单个 Gateway 可以托管多个
Agent 和通道。

仅当您有意想要隔离或救援机器人时才需要多个 Gateway。

有用的检查：

```bash
openclaw gateway status --deep
openclaw gateway probe
```

预期情况：

- `gateway status --deep` 可以报告 `Other gateway-like services detected (best effort)`
  并在陈旧的 launchd/systemd/schtasks 安装仍然存在时打印清理提示。
- 当多个目标响应时，`gateway probe` 可以警告 `multiple reachable gateways`。
- 如果是有意为之，请为每个 Gateway 隔离端口、配置/状态和工作区根目录。

Checklist per instance:

- Unique `gateway.port`
- Unique `OPENCLAW_CONFIG_PATH`
- Unique `OPENCLAW_STATE_DIR`
- Unique `agents.defaults.workspace`

Example:

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json OPENCLAW_STATE_DIR=~/.openclaw-a openclaw gateway --port 19001
OPENCLAW_CONFIG_PATH=~/.openclaw/b.json OPENCLAW_STATE_DIR=~/.openclaw-b openclaw gateway --port 19002
```

Detailed setup: [/gateway/multiple-gateways](/gateway/multiple-gateways).

## VoiceClaw 实时大脑端点

OpenClaw 在 `/voiceclaw/realtime` 暴露了一个与 VoiceClaw 兼容的实时 WebSocket 端点。
当 VoiceClaw 桌面客户端应直接与实时 OpenClaw 大脑通信，而不是通过单独的中继
进程时，请使用它。

该端点使用 Gemini Live 处理实时音频，并通过直接向 Gemini Live 暴露 OpenClaw 工具来将 OpenClaw 作为
大脑使用。工具调用会立即返回 `working` 结果，以保持语音轮次响应及时，然后 OpenClaw
异步执行实际工具并将结果注入回实时会话。请在 gateway 进程环境中设置 `GEMINI_API_KEY`。如果
启用了 gateway 认证，桌面客户端会在其第一条 `session.config` 消息中发送 gateway token 或 password。

实时大脑访问会运行由所有者授权的 OpenClaw agent 命令。请将
`gateway.auth.mode: "none"` 限制在仅环回的测试实例中。非本地
实时大脑连接需要 gateway 认证。

对于隔离的测试 gateway，请使用其自身的端口、配置和状态运行一个单独实例：

```bash
OPENCLAW_CONFIG_PATH=/path/to/openclaw-realtime/openclaw.json \
OPENCLAW_STATE_DIR=/path/to/openclaw-realtime/state \
OPENCLAW_SKIP_CHANNELS=1 \
GEMINI_API_KEY=... \
openclaw gateway --port 19789
```

然后将 VoiceClaw 配置为使用：

```text
ws://127.0.0.1:19789/voiceclaw/realtime
```

## 远程访问

首选方案：Tailscale/VPN。
备用方案：SSH 隧道。

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

然后在本地将客户端连接至 ws://127.0.0.1:18789。

<Warning>
SSH 隧道不会绕过 Gateway 认证。对于共享密钥认证，客户端即使通过隧道也必须
发送 `token`/`password`。对于携带身份的模式，请求仍必须满足该认证路径。
</Warning>

参见：[远程 Gateway](/gateway/remote)、[认证](/gateway/authentication)、[Tailscale](/gateway/tailscale)。

## 监督与服务生命周期

生产环境建议使用托管运行以保证稳定可靠。

<Tabs>
  <Tab title="macOS (launchd)">

```bash
openclaw gateway install
openclaw gateway status
openclaw gateway restart
openclaw gateway stop
```

LaunchAgent 标签为 `ai.openclaw.gateway`（默认）或 `ai.openclaw.<profile>`（命名配置）。`openclaw doctor` 用于检测并修复服务配置漂移。

  </Tab>
  <Tab title="Linux (systemd 用户级)">

```bash
openclaw gateway install
systemctl --user enable --now openclaw-gateway[-<profile>].service
openclaw gateway status
```

若需登出后依然运行，启用 lingering：

```bash
sudo loginctl enable-linger <user>
```

当需要自定义安装路径时的手动用户单元示例：

```ini
[Unit]
Description=OpenClaw Gateway
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/openclaw gateway --port 18789
Restart=always
RestartSec=5
TimeoutStopSec=30
TimeoutStartSec=30
SuccessExitStatus=0 143
KillMode=control-group

[Install]
WantedBy=default.target
```

  </Tab>

  <Tab title="Windows (原生)">

```powershell
openclaw gateway install
openclaw gateway status --json
openclaw gateway restart
openclaw gateway stop
```

原生 Windows 托管启动使用名为 `OpenClaw Gateway` 的计划任务
（对于命名配置文件则为 `OpenClaw Gateway (<profile>)`）。如果计划任务
创建被拒绝，OpenClaw 将回退到指向状态目录内 `gateway.cmd` 的每用户启动文件夹启动器。

  </Tab>
  <Tab title="Linux (系统级服务)">

适用于多用户/常启主机，使用系统服务单元。

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway[-<profile>].service
```

使用与用户单元相同的服务主体，但将其安装在
`/etc/systemd/system/openclaw-gateway[-<profile>].service` 下，
如果您的 `openclaw` 二进制文件位于其他位置，请调整 `ExecStart=`。

  </Tab>
</Tabs>

## Dev profile 快速路径

```bash
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status
```

默认包含隔离的状态和配置，基础 Gateway 端口为 `19001`。

## 协议快速参考（运维视角）

- 第一个客户端帧必须是 `connect`。
- Gateway 返回 `hello-ok` 快照（`presence`, `health`, `stateVersion`, `uptimeMs`, 限制/策略）。
- `hello-ok.features.methods` / `events` 是保守的发现列表，而非
  每个可调用辅助路由的生成转储。
- 请求：`req(method, params)` → `res(ok/payload|error)`。
- 常见事件包括 `connect.challenge`, `agent`, `chat`,
  `session.message`, `session.tool`, `sessions.changed`, `presence`, `tick`,
  `health`, `heartbeat`, 配对/批准生命周期事件，以及 `shutdown`。

代理执行为两阶段：

1. 立即接受确认（`status:"accepted"`）
2. 最终完成响应（`status:"ok"` 或 `status:"error"`），中间有持续的 `agent` 事件流。

完整协议文档请见：[Gateway 协议](/gateway/protocol)。

## 运营检查

### 存活性

- 打开 WebSocket，发送 `connect`。
- 期望收到带状态快照的 `hello-ok`。

### 就绪性

```bash
openclaw gateway status
openclaw channels status --probe
openclaw health
```

### 缺口恢复

事件不重放。遇到序列号跳跃时，先刷新状态（`health`，`system-presence`）后再继续。

## 常见故障特征

| 特征签名                                                      | 可能问题                                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `refusing to bind gateway ... without auth`                    | 非环回绑定且无有效的 Gateway 认证路径                             |
| `another gateway instance is already listening` / `EADDRINUSE` | 端口冲突                                                                   |
| `Gateway start blocked: set gateway.mode=local`                | 配置设置为远程模式，或损坏的配置中缺失本地模式标记 |
| `unauthorized` during connect                                  | 客户端与 Gateway 之间的认证不匹配                                        |

完整诊断流程请使用 [Gateway 故障排查](/gateway/troubleshooting)。

## 安全保障

- Gateway 协议客户端在 Gateway 不可用时快速失败（无隐式直连通道回退）。
- 非法或非连接首帧被拒绝并断开。
- 优雅关闭时在关闭套接字前发送 `shutdown` 事件。

---

相关内容：

- [Troubleshooting](/gateway/troubleshooting)
- [Background Process](/gateway/background-process)
- [Configuration](/gateway/configuration)
- [Health](/gateway/health)
- [Doctor](/gateway/doctor)
- [Authentication](/gateway/authentication)

## Related

- [Configuration](/gateway/configuration)
- [Gateway troubleshooting](/gateway/troubleshooting)
- [Remote access](/gateway/remote)
- [Secrets management](/gateway/secrets)
