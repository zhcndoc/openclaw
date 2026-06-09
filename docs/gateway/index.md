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

健康基线：`Runtime: running`、`Connectivity probe: ok`，以及符合预期的 `Capability: ...`。当你需要读范围 RPC 证明，而不只是可达性时，请使用 `openclaw gateway status --require-rpc`。

  </Step>

  <Step title="验证通道就绪状态">

```bash
openclaw channels status --probe
```

在 gateway 可达时，这会针对每个账号运行实时通道探测和可选审计。
如果 gateway 不可达，CLI 会回退为仅配置的通道摘要，
而不是实时探测输出。

  </Step>
</Steps>

<Note>
Gateway 配置重载会监视当前活动配置文件路径（从 profile/state 默认值解析而来，或在设置时使用 `OPENCLAW_CONFIG_PATH`）。
默认模式是 `gateway.reload.mode="hybrid"`。
首次成功加载后，运行中的进程会提供当前内存中的活动配置快照；成功重载会原子性地切换该快照。
</Note>

## 运行模型

- 仅有一个始终在线的进程，负责路由、控制平面和通道连接。
- 单一复用端口用于：
  - WebSocket 控制/RPC
  - HTTP API（`/v1/models`、`/v1/embeddings`、`/v1/chat/completions`、`/v1/responses`、`/tools/invoke`）
  - 插件 HTTP 路由，例如可选的 `/api/v1/admin/rpc`
  - 控制界面和钩子
- 默认绑定模式：`loopback`。
- 默认要求认证。共享密钥方案使用
  `gateway.auth.token` / `gateway.auth.password`（或
  `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`），而非 loopback 的
  反向代理方案可以使用 `gateway.auth.mode: "trusted-proxy"`。

## OpenAI 兼容端点

OpenClaw 最高价值的兼容性接口现在是：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`
- `POST /v1/responses`

这个集合的重要性在于：

- 大多数 Open WebUI、LobeChat 和 LibreChat 集成会首先探测 `/v1/models`。
- 许多 RAG 和 memory 流水线期望有 `/v1/embeddings`。
- 原生 agent 客户端越来越倾向于 `/v1/responses`。

规划说明：

- `/v1/models` 以 agent 为先：它返回 `openclaw`、`openclaw/default` 和 `openclaw/<agentId>`。
- `openclaw/default` 是稳定别名，始终映射到已配置的默认 agent。
- 当你想使用后端 provider/model 覆盖时，请使用 `x-openclaw-model`；否则所选 agent 的常规模型和 embedding 设置会继续生效。

所有这些端点都运行在主 Gateway 端口上，并使用与 Gateway 其余 HTTP API 相同的受信操作员认证边界。

Admin HTTP RPC (`POST /api/v1/admin/rpc`) 是一个独立的、默认关闭的插件路由，供无法使用 WebSocket RPC 的主机工具使用。请参见 [Admin HTTP RPC](/plugins/admin-http-rpc)。

### 端口和绑定优先级

| 设置         | 解析顺序                                                      |
| ------------ | ------------------------------------------------------------- |
| Gateway 端口 | `--port` → `OPENCLAW_GATEWAY_PORT` → `gateway.port` → `18789` |
| 绑定模式     | CLI/override → `gateway.bind` → `loopback`                    |

已安装的 gateway 服务会在 supervisor 元数据中记录解析后的 `--port`。更改 `gateway.port` 后，请运行 `openclaw doctor --fix` 或 `openclaw gateway install --force`，以便 launchd/systemd/schtasks 在新端口上启动进程。

Gateway 启动时会使用相同的有效端口和绑定方式来为非 loopback 绑定播种本地控制界面来源。例如，`--bind lan --port 3000` 会在运行时验证之前播种 `http://localhost:3000` 和 `http://127.0.0.1:3000`。请显式添加任何远程浏览器来源，例如 HTTPS 代理 URL，到 `gateway.controlUi.allowedOrigins` 中。

### 热重载模式

| `gateway.reload.mode` | 行为                                      |
| --------------------- | ----------------------------------------- |
| `off`                 | 不进行配置重载                            |
| `hot`                 | 仅应用热安全变更                          |
| `restart`             | 在需要重载的变更上重启                    |
| `hybrid`（默认）      | 安全时热应用，必要时重启                  |

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

`gateway status --deep` 用于额外的服务发现（LaunchDaemons/systemd system units/schtasks），而不是更深的 RPC 健康探测。

## 多个 gateway（同一主机）

大多数安装场景应在每台机器上运行一个 gateway。单个 gateway 可以承载多个 agent 和通道。

只有在你有意需要隔离或救援 bot 时，才需要多个 gateway。

有用的检查：

```bash
openclaw gateway status --deep
openclaw gateway probe
```

预期结果：

- `gateway status --deep` can report `Other gateway-like services detected (best effort)`
  and print cleanup hints when stale launchd/systemd/schtasks installs are still around.
- `gateway probe` can warn about `multiple reachable gateway identities` when distinct
  gateways answer, or when OpenClaw cannot prove reachable targets are the same gateway.
  An SSH tunnel, proxy URL, or configured remote URL to the same gateway is one
  gateway with multiple transports, even when transport ports differ.
- If that is intentional, isolate ports, config/state, and workspace roots per gateway.

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
ssh -N -L 18789:127.0.0.1:18789 user@host
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

在 macOS 上，`gateway stop` 默认使用 `launchctl bootout`——这会把 LaunchAgent 从当前启动会话中移除，而不会持久化禁用，因此在意外崩溃后 KeepAlive 自动恢复仍然有效，并且 `gateway start` 会干净地重新启用。若要在重启之间持久抑制自动重启，请传入 `--disable`：`openclaw gateway stop --disable`。

LaunchAgent 标签为 `ai.openclaw.gateway`（默认）或 `ai.openclaw.<profile>`（命名 profile）。`openclaw doctor` 会审计并修复服务配置漂移。

  </Tab>

  <Tab title="Linux（systemd 用户级）">

```bash
openclaw gateway install
systemctl --user enable --now openclaw-gateway[-<profile>].service
openclaw gateway status
```

若要在注销后仍保持运行，请启用 lingering：

```bash
sudo loginctl enable-linger <user>
```

当你需要自定义安装路径时，可使用手动 user-unit 示例：

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

## 开发者配置快速路径

```bash
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status
```

默认包含隔离的状态/配置以及基础 gateway 端口 `19001`。

## 协议快速参考（操作员视图）

- 首个客户端帧必须是 `connect`。
- Gateway 返回 `hello-ok` 快照（`presence`、`health`、`stateVersion`、`uptimeMs`、限制/策略）。
- `hello-ok.features.methods` / `events` 是保守的发现列表，不是所有可调用辅助路由的生成式转储。
- 请求：`req(method, params)` → `res(ok/payload|error)`。
- 常见事件包括 `connect.challenge`、`agent`、`chat`、
  `session.message`、`session.operation`、`session.tool`、`sessions.changed`、
  `presence`、`tick`、`health`、`heartbeat`、配对/审批生命周期事件，
  以及 `shutdown`。

Agent 运行分为两个阶段：

1. 立即返回已接受确认（`status:"accepted"`）
2. 最终完成响应（`status:"ok"|"error"`），中间会有流式的 `agent` 事件。

查看完整协议文档：[Gateway 协议](/gateway/protocol)。

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

| 特征                                                     | 可能问题                                                                    |
| -------------------------------------------------------- | --------------------------------------------------------------------------- |
| `拒绝在没有认证的情况下绑定 gateway ...`                | 在非回环地址绑定，但缺少有效的 gateway 认证路径                              |
| `另一个 gateway 实例已经在监听` / `EADDRINUSE`          | 端口冲突                                                                   |
| `Gateway 启动被阻止：请将 gateway.mode 设为 local`      | 配置被设为远程模式，或损坏的配置中缺少本地模式标记                          |
| 在 connect 期间出现 `unauthorized`                       | 客户端与 gateway 之间的认证不匹配                                            |

如需完整诊断阶梯，请使用 [Gateway Troubleshooting](/gateway/troubleshooting)。

## 安全保障

- 当 Gateway 不可用时，Gateway 协议客户端会快速失败（不隐式回退到 direct-channel）。
- 非法/非 `connect` 的首帧会被拒绝并关闭。
- 优雅关闭会在 socket 关闭前发出 `shutdown` 事件。

---

相关：

- [故障排查](/gateway/troubleshooting)
- [后台进程](/gateway/background-process)
- [配置](/gateway/configuration)
- [健康状态](/gateway/health)
- [Doctor](/gateway/doctor)
- [认证](/gateway/authentication)

## 相关内容

- [配置](/gateway/configuration)
- [Gateway 故障排查](/gateway/troubleshooting)
- [远程访问](/gateway/remote)
- [密钥管理](/gateway/secrets)
