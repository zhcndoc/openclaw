---
summary: "Gateway 服务的运行手册、生命周期和操作指南"
read_when:
  - 运行或调试 Gateway 进程时
title: "Gateway 运行手册"
---

# Gateway 运行手册

本页用于 Gateway 服务的第 1 天启动及第 2 天运维操作。

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

健康基线：`Runtime: running` 和 `RPC probe: ok`。

  </Step>

  <Step title="验证通道准备情况">

```bash
openclaw channels status --probe
```

  </Step>
</Steps>

<Note>
Gateway 配置重载会监听当前活动配置文件路径（从 profile/state 默认值解析，或在设置了 `OPENCLAW_CONFIG_PATH` 时使用该路径）。
默认模式为 `gateway.reload.mode="hybrid"`。
</Note>

## 运行时模型

- 一个始终运行的进程，用于路由、控制平面和通道连接。
- 单一多路复用端口用于：
  - WebSocket 控制/RPC
  - HTTP API，OpenAI 兼容（`/v1/models`、`/v1/embeddings`、`/v1/chat/completions`、`/v1/responses`、`/tools/invoke`）
  - 控制 UI 和钩子
- 默认绑定模式：`loopback`。
- 默认需要认证（`gateway.auth.token` / `gateway.auth.password`，或 `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`）。

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
openclaw gateway status --deep
openclaw gateway status --json
openclaw gateway install
openclaw gateway restart
openclaw gateway stop
openclaw secrets reload
openclaw logs --follow
openclaw doctor
```

## 远程访问

首选方案：Tailscale/VPN。
备用方案：SSH 隧道。

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

然后本地客户端连接 `ws://127.0.0.1:18789`。

<Warning>
如果配置了 Gateway 身份验证，客户端即使通过 SSH 隧道连接，仍需发送身份验证信息（`token`/`password`）。
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

  </Tab>

  <Tab title="Linux (system 级服务)">

适用于多用户/常启主机，使用系统服务单元。

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway[-<profile>].service
```

  </Tab>
</Tabs>

## 同一主机上的多个 Gateway 实例

大多数场景建议只运行 **一个** Gateway。
仅在需要严格隔离或冗余时使用多个（例如紧急配置）。

单实例检查项：

- 唯一的 `gateway.port`
- 唯一的 `OPENCLAW_CONFIG_PATH`
- 唯一的 `OPENCLAW_STATE_DIR`
- 唯一的 `agents.defaults.workspace`

示例：

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json OPENCLAW_STATE_DIR=~/.openclaw-a openclaw gateway --port 19001
OPENCLAW_CONFIG_PATH=~/.openclaw/b.json OPENCLAW_STATE_DIR=~/.openclaw-b openclaw gateway --port 19002
```

参见：[多个 Gateway](/gateway/multiple-gateways)。

### 开发配置快速路径

```bash
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status
```

默认包含隔离的状态和配置，基础 Gateway 端口为 `19001`。

## 协议快速参考（运维视角）

- 首帧必须是 `connect`。
- Gateway 返回 `hello-ok` 快照（包含 `presence`、`health`、`stateVersion`、`uptimeMs`、限制和策略）。
- 请求格式：`req(method, params)` → 响应 `res(ok/payload|error)`。
- 常见事件：`connect.challenge`、`agent`、`chat`、`presence`、`tick`、`health`、`heartbeat`、`shutdown`。

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

| 特征                                                         | 可能问题                                |
| ------------------------------------------------------------ | ------------------------------------- |
| `refusing to bind gateway ... without auth`                  | 非回环绑定但未提供 token/password     |
| `another gateway instance is already listening` / `EADDRINUSE` | 端口冲突                              |
| `Gateway start blocked: set gateway.mode=local`              | 配置设为远程模式                      |
| 连接时出现 `unauthorized`                                   | 客户端和 Gateway 认证信息不匹配      |

完整诊断流程请使用 [Gateway 故障排查](/gateway/troubleshooting)。

## 安全保障

- Gateway 协议客户端在 Gateway 不可用时快速失败（无隐式直连通道回退）。
- 非法或非连接首帧被拒绝并断开。
- 优雅关闭时在关闭套接字前发送 `shutdown` 事件。

---

相关内容：

- [故障排查](/gateway/troubleshooting)
- [后台进程](/gateway/background-process)
- [配置](/gateway/configuration)
- [健康](/gateway/health)
- [诊断工具](/gateway/doctor)
- [认证](/gateway/authentication)
