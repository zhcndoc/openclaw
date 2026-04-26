---
summary: "网关、节点和画布主机如何连接。"
read_when:
  - 你想要简明了解网关的网络模型
title: "网络模型"
---

> 此内容已合并到 [网络](/network#core-model)。请参阅该页面获取当前指南。

大多数操作都通过网关（`openclaw gateway`）流转，这是一个拥有通道连接和 WebSocket 控制平面的单一长期运行进程。

## 核心规则

- 建议每台主机运行一个网关。它是唯一允许拥有 WhatsApp Web 会话的进程。对于救援机器人或严格隔离的情况，请使用隔离的配置文件和端口运行多个网关。参见 [多个网关](/gateway/multiple-gateways)。
- 优先回环：网关 WS 默认为 `ws://127.0.0.1:18789`。向导默认创建共享密钥认证，即使对于回环地址通常也会生成令牌。对于非回环访问，请使用有效的网关认证路径：共享密钥令牌/密码认证，或正确配置的非回环 `trusted-proxy` 部署。Tailnet/移动设置通常通过 Tailscale Serve 或其他 `wss://` 端点效果最佳，而不是原始 tailnet `ws://`。
- 节点根据需要通过局域网、tailnet 或 SSH 连接到网关 WS。遗留的 TCP 桥接已被移除。
- 画布主机由网关 HTTP 服务器在**与网关相同的端口**（默认 `18789`）上提供服务：
  - `/__openclaw__/canvas/`
  - `/__openclaw__/a2ui/`
    当配置了 `gateway.auth` 且网关绑定到回环地址之外时，这些路由会受到网关认证保护。节点客户端使用与其活动 WS 会话绑定的、按节点范围限定的能力 URL。参见 [网关配置](/gateway/configuration)（`canvasHost`、`gateway`）。
- 远程使用通常通过 SSH 隧道或 tailnet VPN。参见 [远程访问](/gateway/remote) 和 [发现](/gateway/discovery)。

## 相关内容

- [远程访问](/gateway/remote)
- [受信任代理认证](/gateway/trusted-proxy-auth)
- [网关协议](/gateway/protocol)
