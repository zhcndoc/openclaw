---
summary: "历史桥接协议（旧版节点）：TCP JSONL，配对，作用域 RPC"
read_when:
  - 构建或调试节点客户端（iOS/Android/macOS 节点模式）
  - 调查配对或桥接认证失败
  - 审计网关暴露的节点表面
title: "桥接协议"
---

<Warning>
TCP 桥接已被**移除**。当前的 OpenClaw 构建版本不再附带桥接监听器，且 `bridge.*` 配置键也不再存在于 schema 中。本页面仅保留供历史参考。所有节点/操作员客户端请使用 [网关协议](/gateway/protocol)。
</Warning>

## 存在原因

- **安全边界**：桥接暴露一个小的白名单，而非完整的网关 API 面。
- **配对 + 节点身份**：节点的准入由网关负责，并绑定到每个节点的令牌。
- **发现体验**：节点可以通过局域网 Bonjour 发现网关，或直接通过 tailnet 连接。
- **回环 WS**：完整的 WebSocket 控制面保持本地，除非通过 SSH 隧道转发。

## 传输

- TCP，每行一个 JSON 对象 (JSONL)。
- 可选 TLS（当 `bridge.tls.enabled` 为 true 时）。
- 历史默认监听端口为 `18790`（当前构建版本不启动 TCP 桥接）。

启用 TLS 时，发现的 TXT 记录中会包含 `bridgeTls=1` 及 `bridgeTlsSha256` 作为非秘密提示。
注意 Bonjour/mDNS 的 TXT 记录是未认证的；客户端不得在未获得用户明确意图或其他带外验证的情况下，将广告的指纹视为权威绑定。

## 握手与配对

1. 客户端发送包含节点元数据和令牌（若已配对）的 `hello`。
2. 若未配对，网关回复 `error`（`NOT_PAIRED`/`UNAUTHORIZED`）。
3. 客户端发送 `pair-request`。
4. 网关等待审批，然后发送 `pair-ok` 和 `hello-ok`。

历史上，`hello-ok` 返回 `serverName` 并可能包含 `canvasHostUrl`。

## 帧格式

客户端 → 网关：

- `req` / `res`：作用域网关 RPC（聊天、会话、配置、健康、语音唤醒、技能二进制）
- `event`：节点信号（语音转录、代理请求、聊天订阅、执行生命周期）

网关 → 客户端：

- `invoke` / `invoke-res`：节点命令（`canvas.*`、`camera.*`、`screen.record`、
  `location.get`、`sms.send`）
- `event`：订阅会话的聊天更新
- `ping` / `pong`：保持连接活跃

旧版白名单强制实现位于 `src/gateway/server-bridge.ts`（现已移除）。

## 执行生命周期事件

节点可以发出 `exec.finished` 或 `exec.denied` 事件，以反馈 system.run 活动。
这些事件会被映射到网关系统事件。（旧版节点仍可能发出 `exec.started`。）

负载字段（除非标注，均为可选）：

- `sessionKey`（必需）：接收系统事件的代理会话。
- `runId`：执行唯一标识，用于分组。
- `command`：原始或格式化的命令字符串。
- `exitCode`、`timedOut`、`success`、`output`：完成详情（仅 finished）。
- `reason`：拒绝原因（仅 denied）。

## 历史 tailnet 用法

- 将桥接绑定到 tailnet IP：在 `~/.openclaw/openclaw.json` 中配置 `bridge.bind: "tailnet"`（仅限历史版本；`bridge.*` 不再有效）。
- 客户端通过 MagicDNS 名称或 tailnet IP 连接。
- Bonjour **不**跨网络；需要时使用手动主机/端口或广域 DNS-SD。

## 版本控制

桥接是**隐式 v1**（无最小/最大协商）。本节仅供
历史参考；当前节点/操作员客户端使用 WebSocket
[网关协议](/gateway/protocol)。

## 相关内容

- [网关协议](/gateway/protocol)
- [节点](/nodes)
