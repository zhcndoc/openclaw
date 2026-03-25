---
summary: "网关、节点和画布主机如何连接。"
read_when:
  - 你想要简明了解网关的网络模型
title: "网络模型"
---

# 网络模型

大多数操作都流经网关（`openclaw gateway`），这是一个长期运行的单一进程，拥有通道连接和 WebSocket 控制平面。

## 核心规则

- 推荐每台主机运行一个网关。它是唯一被允许拥有 WhatsApp Web 会话的进程。对于救援机器人或严格隔离的情况，运行多个具有独立配置和端口的网关。参见[多个网关](/gateway/multiple-gateways)。
- 优先使用回环地址：网关 WS 默认绑定到 `ws://127.0.0.1:18789`。向导默认生成一个网关令牌，即使是回环绑定。对于 Tailnet 访问，需运行 `openclaw gateway --bind tailnet --token ...`，因为非回环绑定需要令牌。
- 节点根据需要通过局域网、Tailnet 或 SSH 连接到网关 WS。传统的 TCP 桥已被弃用。
- 画布主机由网关 HTTP 服务器提供服务，使用与网关相同的**端口**（默认 `18789`）：
  - `/__openclaw__/canvas/`
  - `/__openclaw__/a2ui/`
    当配置了 `gateway.auth` 并且网关绑定地址不止回环时，这些路由受网关认证保护。节点客户端使用与其活动 WS 会话绑定的节点范围能力 URL。参见[网关配置](/gateway/configuration)（`canvasHost`、`gateway`）。
- 远程使用通常通过 SSH 隧道或 Tailnet VPN。参见[远程访问](/gateway/remote)和[发现](/gateway/discovery)。
