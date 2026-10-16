---
summary: "网络中心：网关暴露面、配对、发现与安全"
read_when:
  - "你需要网络架构 + 安全概览"
  - "你在排查本地访问与 tailnet 访问或配对问题"
  - "您想要网络文档的主要列表"
title: "网络"
---

此中心链接了 OpenClaw 如何在 localhost、LAN 和 tailnet 之间连接、配对并保护设备的核心文档。

## <a id="core-model"></a> 核心模型

大多数操作都通过 Gateway（`openclaw gateway`）进行，这是一个单独的长期运行进程，负责通道连接和 WebSocket 控制平面。

- **优先使用回环地址**：Gateway 的 WS 默认是 `ws://127.0.0.1:18789`。 非回环绑定在没有有效的 gateway 身份验证路径时会拒绝启动： 共享密钥 token/password 认证，或正确配置的非回环 `trusted-proxy` 部署。
- **建议每个主机一个网关**。为了实现隔离，请运行具有隔离配置文件和端口的多个网关 （[Multiple Gateways](/gateway/multiple-gateways)）。
- **托管小部件文档和 A2UI 渲染器资产** 在与网关相同的端口上提供服务（`/__openclaw__/canvas/`、`/__openclaw__/a2ui/`），当绑定超出环回时受到网关身份验证的保护。
- **远程访问**通常是SSH隧道或Tailscale VPN（[远程Access](/gateway/remote)）。

关键参考：

- [Gateway 架构](/concepts/architecture)
- [网关协议](/gateway/protocol)
- [Gateway 运行手册](/gateway)
- [Web 暴露面 + 绑定模式](/web)

## <a id="pairing-%2B-identity"></a><a id="pairing-+-identity"></a> 配对 + 身份

- [配对概览（DM + 节点）](/channels/pairing)
- [Gateway 所属节点配对](/gateway/pairing)
- [Devices CLI（配对 + 令牌轮换）](/cli/devices)
- [Pairing CLI（DM 审批）](/cli/pairing)

本地信任：

- 直接本地环回连接（无 forwarded/proxy 标头）可以自动批准配对，以保持同一主机 UX 顺利进行。
- OpenClaw 还具有用于可信共享秘密帮助程序流的狭窄 backend/container-local 自连接路径。
- Tailnet 和 LAN 客户端，包括同主机 tailnet 绑定，仍然需要显式的配对批准。

## <a id="discovery-%2B-transports"></a><a id="discovery-+-transports"></a> 发现 + 传输

- [发现与传输](/gateway/discovery)
- [Bonjour / mDNS](/gateway/bonjour)
- [远程访问（SSH）](/gateway/remote)
- [尾盘](/gateway/tailscale)

## <a id="nodes-%2B-transports"></a><a id="nodes-+-transports"></a> 节点 + 传输

- [节点概览](/nodes)
- [节点运行手册：iOS](/platforms/ios)
- [节点运行手册：Android](/platforms/android)

## <a id="security"></a> 安全

- [安全概览](/gateway/security)
- [网关配置参考](/gateway/configuration-reference)
- [故障排查](/gateway/troubleshooting)
- [诊断工具](/gateway/doctor)

## <a id="related"></a> 相关内容

- [Gateway 运行手册](/gateway)
- [远程访问](/gateway/remote)
