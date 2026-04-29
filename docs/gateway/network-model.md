---
summary: "网关、节点和画布主机如何连接。"
read_when:
  - 你想快速了解 Gateway 网络模型
title: "网络模型"
---

> 此内容已合并到 [Network](/network#core-model)。请查看该页面以获取当前指南。

大多数操作都通过 Gateway（`openclaw gateway`）进行，这是一个单独的长运行进程，负责通道连接和 WebSocket 控制平面。

## 核心规则

- 建议每台主机只运行一个 Gateway。它是唯一被允许拥有 WhatsApp Web 会话的进程。对于救援机器人或严格隔离场景，可使用隔离的配置文件和端口运行多个 Gateway。参见 [多个 Gateway](/gateway/multiple-gateways)。
- 优先使用回环地址：Gateway WS 默认是 `ws://127.0.0.1:18789`。向导默认会创建共享密钥认证，并且通常会生成令牌，即使是回环地址也是如此。对于非回环访问，请使用有效的 Gateway 认证路径：共享密钥令牌/密码认证，或正确配置的非回环 `trusted-proxy` 部署。尾网/移动设备设置通常最好通过 Tailscale Serve 或其他 `wss://` 端点，而不是原始的尾网 `ws://`。
- 节点按需通过局域网、尾网或 SSH 连接到 Gateway WS。  
  旧的 TCP 桥接已被移除。
- Canvas 主机由 Gateway HTTP 服务器在与 Gateway **相同的端口**上提供服务（默认 `18789`）：
  - `/__openclaw__/canvas/`
  - `/__openclaw__/a2ui/`
    当配置了 `gateway.auth` 且 Gateway 绑定到回环地址之外时，这些路由受 Gateway 认证保护。节点客户端使用与其活动 WS 会话绑定的节点作用域能力 URL。参见 [Gateway 配置](/gateway/configuration)（`canvasHost`、`gateway`）。
- 远程使用通常通过 SSH 隧道或尾网 VPN 实现。参见 [远程访问](/gateway/remote) 和 [发现](/gateway/discovery)。

## 相关内容

- [远程访问](/gateway/remote)
- [受信任代理认证](/gateway/trusted-proxy-auth)
- [Gateway 协议](/gateway/protocol)
