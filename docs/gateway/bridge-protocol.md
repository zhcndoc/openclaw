---
summary: "历史桥接协议（旧版节点）：TCP JSONL、配对、作用域 RPC"
read_when:
  - 调查旧节点客户端代码或归档的配对日志
  - 审计旧版节点接口曾暴露的内容
title: "桥接协议"
---

<Warning>
TCP 桥接已被**移除**。当前的 OpenClaw 构建不再包含桥接监听器，且 `bridge.*` 配置键也不再出现在 schema 中。此页面仅作历史参考。对于所有节点/操作员客户端，请使用 [Gateway 协议](/gateway/protocol)。
</Warning>

## 它为何存在

- **安全边界**：暴露一个小型允许列表，而不是完整的 gateway API 表面。
- **配对 + 节点身份**：节点接入由网关负责，并与每个节点的 token 绑定。
- **发现体验**：节点可以通过 LAN 上的 Bonjour 发现网关，或者通过 tailnet 直接连接。
- **回环 WS**：完整的 WS 控制平面保持本地，除非通过 SSH 隧道转发。

## 传输

- TCP，每行一个 JSON 对象（JSONL）。
- 可选 TLS（`bridge.tls.enabled: true`）。
- 默认监听端口为 `18790`。

当启用 TLS 时，发现 TXT 记录会包含 `bridgeTls=1`，并附带 `bridgeTlsSha256` 作为非机密提示。Bonjour/mDNS TXT 记录未经认证；客户端不能在没有其他带外验证的情况下，将公布的指纹视为权威固定值。

## 握手与配对

1. 客户端发送带有节点元数据和令牌（如果已配对）的 `hello`。
2. 如果未配对，网关返回 `error`（`NOT_PAIRED` / `UNAUTHORIZED`）。
3. 客户端发送 `pair-request`。
4. 网关等待批准，然后发送 `pair-ok` 和 `hello-ok`。

`hello-ok` 曾用于返回 `serverName`；托管的插件界面现在通过当前 Gateway 协议中的 `pluginSurfaceUrls` 进行通告（Canvas/A2UI 使用 `pluginSurfaceUrls.canvas`）。

## 帧

客户端到网关：

- `req` / `res`：作用域网关 RPC（chat、sessions、config、health、voicewake、skills.bins）。
- `event`：节点信号（语音转写、代理请求、聊天订阅、执行生命周期）。

网关到客户端：

- `invoke` / `invoke-res`：节点命令（`canvas.*`、`camera.*`、`screen.record`、`location.get`、`sms.send`）。
- `event`：已订阅会话的聊天更新。
- `ping` / `pong`：保活。

Allowlist 强制执行曾位于 `src/gateway/server-bridge.ts`（已移除）。

## 执行生命周期事件

节点会发出 `exec.finished` 来暴露已完成的 `system.run` 活动，由网关映射为系统事件（旧版节点也可能发出 `exec.started`）。`exec.denied` 会将被拒绝的 `system.run` 尝试标记为终止性拒绝，而不会入队系统事件或唤醒 agent 工作。

载荷字段（除非注明，否则全部可选）：

| 字段                               | 说明                                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------------- |
| `sessionKey`                     | 必需。用于事件关联的 Agent 会话，以及在 `exec.finished` 时用于系统事件投递。 |
| `runId`                         | 用于分组的唯一 exec id。                                                                   |
| `command`                       | 原始或格式化后的命令字符串。                                                               |
| `exitCode`, `timedOut`, `output` | 完成详情（仅限 finished）。                                                            |
| `reason`                         | 拒绝原因（仅限 denied）。                                                                   |

## 历史上的 tailnet 用法

- 将桥接绑定到 tailnet IP：在 `~/.openclaw/openclaw.json` 中设置 `bridge.bind: "tailnet"`（仅历史用途；`bridge.*` 不再是有效配置）。
- 客户端通过 MagicDNS 名称或 tailnet IP 连接。
- Bonjour 不会跨网络传播；否则需要使用广域 DNS-SD 或手动指定主机/端口。

## 版本

该桥接是隐式 v1，不进行最小/最大版本协商。当前的节点/操作员客户端使用 WebSocket [网关协议](/gateway/protocol)，该协议会协商一个协议版本范围。

## 相关

- [网关协议](/gateway/protocol)
- [节点](/nodes)
