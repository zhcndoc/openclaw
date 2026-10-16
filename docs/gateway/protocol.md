---
summary: "网关 WebSocket 协议：握手、帧、版本管理"
read_when:
  - "实现或更新网关 WS 客户端时"
  - "调试协议不匹配或连接失败时"
  - "重新生成协议 schema/models 时"
title: "网关协议"
doc-schema-version: 1
---

网关 WS 协议是 OpenClaw 的单一控制平面和节点传输层。操作员和节点客户端（CLI、Web UI、macOS app、iOS/Android nodes、无头节点）通过 WebSocket 连接，并在握手时声明一个**角色**和**作用域**。

网关内运行的代理工具直接通过该网关的路由器调度请求。他们保留方法范围、代理和批准权限、请求截止日期和取消，而无需打开另一个 WebSocket。显式网关 URL 或令牌覆盖、独立代理和单独的客户端进程继续使用 WebSocket 传输。

## <a id="scope"></a> 范围

此协议公开了完整的 gateway API：状态、频道、模型、聊天、代理、会话、节点、审批等。其确切接口由从 `packages/gateway-protocol/src/schema.ts` 重新导出的 TypeBox schemas 定义。

## <a id="what-each-page-covers"></a> 每页涵盖的内容

- [传输和成帧](/gateway/protocol/transport) — 网关 WS 传输：包、帧形状、限制和 WebRTC 通话控制。
- [握手和角色](/gateway/protocol/handshake) — 连接帧、hello-ok 有效负载、客户端功能、角色和范围。
- [存在和事件](/gateway/protocol/presence) — 存在快照、节点主机统计数据和广播事件范围。
- [RPC 方法](/gateway/protocol/rpc-methods) — RPC 方法系列、发现、会话列表引导和事件系列。
- [Ledger RPC](/gateway/protocol/ledgers) — 审核账本 RPC、其范围、游标和有效负载。
- [操作员方法](/gateway/protocol/operator-methods) — 操作员辅助方法、执行批准和代理交付回退。
- [Versioning](/gateway/protocol/versioning) — 协议版本常量、N-1 节点窗口和客户端默认值。
- [Auth 和设备身份](/gateway/protocol/auth) — 握手身份验证路径、设备身份、配对签名和 TLS 固定。

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本中的每个部分标题都保留其锚点，因此带有片段的指向此页面的现有链接仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="npm-packages" />[npm 封装](/gateway/protocol/transport#npm-packages)
- <a id="transport-and-framing" />[运输和装框](/gateway/protocol/transport#transport-and-framing)
- <a id="gateway-controlled-webrtc-talk" />[网关控制 WebRTC Talk](/gateway/protocol/transport#gateway-controlled-webrtc-talk)
- <a id="handshake" />[握手](/gateway/protocol/handshake#handshake)
- <a id="worker-role-and-closed-protocol" />[Worker角色和封闭协议](/gateway/protocol/handshake#worker-role-and-closed-protocol)
- <a id="client-capabilities" />[客户端功能](/gateway/protocol/handshake#client-capabilities)
- <a id="node-connect-example" />[节点连接示例](/gateway/protocol/handshake#node-connect-example)
- <a id="roles-and-scopes" />[角色和范围](/gateway/protocol/handshake#roles-and-scopes)
- <a id="caps%2Fcommands%2Fpermissions-(node)" />[Caps/commands/permissions（节点）](</gateway/protocol/handshake#caps%2Fcommands%2Fpermissions-(node)>）
- <a id="caps/commands/permissions-node" />[Caps/commands/permissions（节点）](/gateway/protocol/handshake#caps/commands/permissions-node)
- <a id="presence" />[存在](/gateway/protocol/presence#presence)
- <a id="node-host-stats" />[节点主机统计](/gateway/protocol/presence#node-host-stats)
- <a id="node-background-alive-event" />[节点后台活动事件](/gateway/protocol/presence#node-background-alive-event)
- <a id="broadcast-event-scoping" />[广播事件范围](/gateway/protocol/presence#broadcast-event-scoping)
- <a id="rpc-method-families" />[RPC 方法系列](/gateway/protocol/rpc-methods#rpc-method-families)
- <a id="system-and-identity" />[系统和身份](/gateway/protocol/rpc-methods#system-and-identity)
- <a id="models-and-usage" />[模型及用途](/gateway/protocol/rpc-methods#models-and-usage)
- <a id="channels-and-login-helpers" />[频道和登录助手](/gateway/protocol/rpc-methods#channels-and-login-helpers)
- <a id="plugin-management" />[插件管理](/gateway/protocol/rpc-methods#plugin-management)
- <a id="messaging-and-logs" />[消息和日志](/gateway/protocol/rpc-methods#messaging-and-logs)
- <a id="operator-terminal" />[操作员终端](/gateway/protocol/rpc-methods#operator-terminal)
- <a id="talk-and-tts" />[Talk 和 TTS](/gateway/protocol/rpc-methods#talk-and-tts)
- <a id="secrets-config-update-and-wizard" />[机密、配置、更新和向导](/gateway/protocol/rpc-methods#secrets-config-update-and-wizard)
- <a id="agent-and-workspace-helpers" />[代理和工作区助手](/gateway/protocol/rpc-methods#agent-and-workspace-helpers)
- <a id="session-control" />[会话控制](/gateway/protocol/rpc-methods#session-control)
- <a id="device-pairing-and-device-tokens" />[设备配对和设备令牌](/gateway/protocol/rpc-methods#device-pairing-and-device-tokens)
- <a id="node-pairing-invoke-and-pending-work" />[节点配对、调用和挂起工作](/gateway/protocol/rpc-methods#node-pairing-invoke-and-pending-work)
- <a id="approval-families" />[批准系列](/gateway/protocol/rpc-methods#approval-families)
- <a id="control-ui-commands" />[控制UI命令](/gateway/protocol/rpc-methods#control-ui-commands)
- <a id="automation-skills-and-tools" />[自动化、技能和工具](/gateway/protocol/rpc-methods#automation-skills-and-tools)
- <a id="session-list-bootstrap" />[会话列表引导](/gateway/protocol/rpc-methods#session-list-bootstrap)
- <a id="common-event-families" />[常见事件系列](/gateway/protocol/rpc-methods#common-event-families)
- <a id="node-helper-methods" />[节点辅助方法](/gateway/protocol/rpc-methods#node-helper-methods)
- <a id="node-exec-lifecycle-events" />[节点执行生命周期事件](/gateway/protocol/rpc-methods#node-exec-lifecycle-events)
- <a id="audit-ledger-rpc" />[审计账本 RPC](/gateway/protocol/ledgers#audit-ledger-rpc)
- <a id="operator-helper-methods" />[操作员帮助方法](/gateway/protocol/operator-methods#operator-helper-methods)
- <a id="models.list-views" />[`models.list` 浏览次数](/gateway/protocol/operator-methods#models.list-views)
- <a id="models-list-views" />[`models.list` 浏览次数](/gateway/protocol/operator-methods#models-list-views)
- <a id="exec-approvals" />[执行批准](/gateway/protocol/operator-methods#exec-approvals)
- <a id="agent-delivery-fallback" />[代理发货回退](/gateway/protocol/operator-methods#agent-delivery-fallback)
- <a id="versioning" />[版本控制](/gateway/protocol/versioning#versioning)
- <a id="client-constants" />[客户端常量](/gateway/protocol/versioning#client-constants)
- <a id="auth" />[Auth](/gateway/protocol/auth#auth)
- <a id="device-identity-and-pairing" />[设备身份和配对](/gateway/protocol/auth#device-identity-and-pairing)
- <a id="device-auth-migration-diagnostics" />[设备身份验证迁移诊断](/gateway/protocol/auth#device-auth-migration-diagnostics)
- <a id="tls-and-pinning" />[TLS 并固定](/gateway/protocol/auth#tls-and-pinning)

## <a id="related"></a> 相关内容

- [构建网关客户端](/gateway/clients)
- [嵌入 OpenClaw](/gateway/embedding)
- [Gateway 运行手册](/gateway)
- [操作员范围](/gateway/operator-scopes) — 范围协议方法被授权
- [审核历史记录](/gateway/audit) — 仅元数据活动历史记录和决策收据
- [Pairing](/channels/pairing) — 批准谁可以 DM 您以及哪些节点可以加入
- [Cloud Workers](/gateway/cloud-workers) — 通过此协议驱动的工作会话
- [Tools 调用 API](/gateway/tools-invoke-http-api) — 通过网关 HTTP 端点直接调用单个工具
