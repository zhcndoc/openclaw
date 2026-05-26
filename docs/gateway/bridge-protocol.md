---
summary: "历史桥接协议（旧版节点）：TCP JSONL、配对、作用域 RPC"
read_when:
  - 构建或调试节点客户端（iOS/Android/macOS 节点模式）
  - 调查配对或桥接认证失败
  - 审计网关暴露的节点接口面
title: "桥接协议"
---

<Warning>
TCP 桥接已被**移除**。当前 OpenClaw 构建版本不再包含桥接监听器，`bridge.*` 配置键也不再存在于 schema 中。此页面仅保留作历史参考。所有节点/操作员客户端请使用 [网关协议](/gateway/protocol)。
</Warning>

## 它为何存在

- **安全边界**：桥接暴露的是一个小型 allowlist，而不是完整的网关 API 面。
- **配对 + 节点身份**：节点接入由网关负责，并绑定到每个节点的令牌。
- **发现体验**：节点可以通过 LAN 上的 Bonjour 发现网关，或通过 tailnet 直接连接。
- **回环 WS**：完整的 WS 控制平面保持本地，除非通过 SSH 隧道转发。

## 传输

- TCP，每行一个 JSON 对象（JSONL）。
- 可选 TLS（当 `bridge.tls.enabled` 为 true 时）。
- 历史默认监听端口为 `18790`（当前构建不会启动 TCP 桥接）。

启用 TLS 时，发现 TXT 记录会包含 `bridgeTls=1`，以及作为非机密提示的 `bridgeTlsSha256`。请注意，Bonjour/mDNS TXT 记录是未经认证的；客户端不能在没有明确用户意图或其他带外验证的情况下，将所公布的指纹视为权威 pin。

## 握手 + 配对

1. 客户端发送带有节点元数据 + 令牌的 `hello`（如果已经配对）。
2. 如果尚未配对，网关回复 `error`（`NOT_PAIRED`/`UNAUTHORIZED`）。
3. 客户端发送 `pair-request`。
4. 网关等待批准，然后发送 `pair-ok` 和 `hello-ok`。

历史上，`hello-ok` 会返回 `serverName`；托管的插件界面现在通过 `pluginSurfaceUrls` 进行公告。Canvas/A2UI 使用 `pluginSurfaceUrls.canvas`；已弃用的 `canvasHostUrl` 别名不属于重构后的协议。

## 帧

客户端 → 网关：

- `req` / `res`：作用域网关 RPC（chat、sessions、config、health、voicewake、skills.bins）
- `event`：节点信号（语音转写、代理请求、聊天订阅、执行生命周期）

网关 → 客户端：

- `invoke` / `invoke-res`：节点命令（`canvas.*`、`camera.*`、`screen.record`、`location.get`、`sms.send`）
- `event`：订阅会话的聊天更新
- `ping` / `pong`：保活

旧版 allowlist 强制校验位于 `src/gateway/server-bridge.ts`（已移除）。

## 执行生命周期事件

Nodes can emit `exec.finished` events to surface completed `system.run` activity.
These are mapped to system events in the gateway. (Legacy nodes may still emit `exec.started`.)
Nodes may emit `exec.denied` for denied `system.run` attempts; the gateway accepts
the event as a terminal denial and does not enqueue a system event or wake agent work.

载荷字段（除非注明，否则全部可选）：

- `sessionKey` (required): agent session for event correlation and, for
  `exec.finished`, system event delivery.
- `runId`: unique exec id for grouping.
- `command`: raw or formatted command string.
- `exitCode`, `timedOut`, `success`, `output`: completion details (finished only).
- `reason`: denial reason (denied only).

## 历史上的 tailnet 用法

- 将桥接绑定到 tailnet IP：在 `~/.openclaw/openclaw.json` 中设置 `bridge.bind: "tailnet"`（仅历史用途；`bridge.*` 不再有效）。
- 客户端通过 MagicDNS 名称或 tailnet IP 连接。
- Bonjour **不会**跨网络传播；必要时请使用手动主机/端口或广域 DNS-SD。

## 版本

该桥接是**隐式 v1**（没有最小/最大版本协商）。此部分仅为历史参考；当前节点/操作员客户端使用 WebSocket [网关协议](/gateway/protocol)。

## 相关

- [网关协议](/gateway/protocol)
- [节点](/nodes)
