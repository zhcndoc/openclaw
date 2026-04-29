---
summary: "网络中心：网关暴露面、配对、发现与安全"
read_when:
  - 你需要网络架构 + 安全概览
  - 你在排查本地访问与 tailnet 访问或配对问题
  - 你想查看网络文档的权威列表
title: "网络"
---

# 网络中心

这个中心链接了 OpenClaw 如何连接、配对，以及如何在 localhost、LAN 和 tailnet 之间保护设备的核心文档。

## 核心模型

大多数操作都通过 Gateway（`openclaw gateway`）进行，这是一个单独的长期运行进程，负责通道连接和 WebSocket 控制平面。

- **优先使用回环地址**：Gateway WS 默认是 `ws://127.0.0.1:18789`。
  非回环绑定需要有效的 gateway 身份验证路径：共享密钥
  token/password 认证，或者正确配置的非回环
  `trusted-proxy` 部署。
- **每台主机一个 Gateway** 是推荐做法。为了隔离，可以使用独立的 profile 和端口运行多个 gateway（[多个 Gateway](/gateway/multiple-gateways)）。
- **Canvas 主机** 与 Gateway 运行在同一端口（`/__openclaw__/canvas/`、`/__openclaw__/a2ui/`），当绑定超出回环地址时，会受到 Gateway 认证保护。
- **远程访问** 通常通过 SSH 隧道或 Tailscale VPN 实现（[远程访问](/gateway/remote)）。

关键参考：

- [Gateway 架构](/concepts/architecture)
- [Gateway 协议](/gateway/protocol)
- [Gateway 运行手册](/gateway)
- [Web 暴露面 + 绑定模式](/web)

## 配对 + 身份

- [配对概览（DM + 节点）](/channels/pairing)
- [Gateway 所属节点配对](/gateway/pairing)
- [Devices CLI（配对 + 令牌轮换）](/cli/devices)
- [Pairing CLI（DM 审批）](/cli/pairing)

本地信任：

- 直接的本地回环连接可以在配对时自动批准，以保持
  同主机的用户体验流畅。
- OpenClaw 还提供一条窄范围的后端/容器本地自连接路径，用于
  受信任的共享密钥助手流程。
- tailnet 和 LAN 客户端，包括同主机的 tailnet 绑定，仍然需要
  显式的配对批准。

## 发现 + 传输

- [发现与传输](/gateway/discovery)
- [Bonjour / mDNS](/gateway/bonjour)
- [远程访问（SSH）](/gateway/remote)
- [Tailscale](/gateway/tailscale)

## 节点 + 传输

- [节点概览](/nodes)
- [桥接协议（旧版节点，历史）](/gateway/bridge-protocol)
- [节点运行手册：iOS](/platforms/ios)
- [节点运行手册：Android](/platforms/android)

## 安全

- [安全概览](/gateway/security)
- [Gateway 配置参考](/gateway/configuration)
- [故障排查](/gateway/troubleshooting)
- [Doctor](/gateway/doctor)

## 相关

- [Gateway 网络模型](/gateway/network-model)
- [远程访问](/gateway/remote)
