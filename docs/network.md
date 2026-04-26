---
summary: "网络中心：网关界面、配对、发现与安全"
read_when:
  - 您需要网络架构和安全概览
  - 您正在调试本地访问与尾网访问或配对问题
  - 您想要权威的网络文档列表
title: "网络"
---

# 网络中心

本中心链接了关于 OpenClaw 如何连接、配对及保护
本地主机、局域网和尾网设备的核心文档。

## 核心模型

大多数操作都通过网关（`openclaw gateway`）进行，这是一个长期运行的单一进程，拥有通道连接和 WebSocket 控制平面。

- **Loopback first**: 网关 WS 默认是 `ws://127.0.0.1:18789`。
  非 loopback 绑定需要有效的网关身份验证路径：共享密钥
  token/password 认证，或正确配置的非 loopback
  `trusted-proxy` 部署。
- **每台主机一个网关** 是推荐做法。为了隔离，可使用隔离的配置文件和端口运行多个网关（[Multiple Gateways](/gateway/multiple-gateways)）。
- **Canvas host** 与网关共用同一端口提供服务（`/__openclaw__/canvas/`, `/__openclaw__/a2ui/`），当绑定范围超出 loopback 时，会受网关认证保护。
- **远程访问** 通常通过 SSH 隧道或 Tailscale VPN 实现（[Remote Access](/gateway/remote)）。

关键参考：

- [网关架构](/concepts/architecture)
- [网关协议](/gateway/protocol)
- [网关操作手册](/gateway)
- [Web 界面 + 绑定模式](/web)

## 配对与身份识别

- [配对概述（DM + 节点）](/channels/pairing)
- [网关拥有的节点配对](/gateway/pairing)
- [设备 CLI（配对 + 令牌轮换）](/cli/devices)
- [配对 CLI（DM 审批）](/cli/pairing)

本地信任：

- 直接的本地 loopback 连接可以在配对时自动批准，以保持
  同主机 UX 顺畅。
- OpenClaw 还为受信任的共享密钥辅助流程提供了一条狭窄的后端/容器本地自连接路径。
- 尾网和局域网客户端，包括同主机尾网绑定，仍然需要
  显式的配对批准。

## 发现与传输

- [发现与传输](/gateway/discovery)
- [Bonjour / mDNS](/gateway/bonjour)
- [远程访问（SSH）](/gateway/remote)
- [Tailscale](/gateway/tailscale)

## 节点与传输

- [节点概览](/nodes)
- [桥接协议（旧节点，历史）](/gateway/bridge-protocol)
- [节点运行手册：iOS](/platforms/ios)
- [节点运行手册：Android](/platforms/android)

## 安全

- [安全概览](/gateway/security)
- [网关配置参考](/gateway/configuration)
- [故障排除](/gateway/troubleshooting)
- [诊断工具](/gateway/doctor)

## 相关内容

- [网关网络模型](/gateway/network-model)
- [远程访问](/gateway/remote)
