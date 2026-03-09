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

- [网关架构](/concepts/architecture)
- [网关协议](/gateway/protocol)
- [网关操作手册](/gateway)
- [网页界面 + 绑定模式](/web)

## 配对与身份识别

- [配对概述（DM + 节点）](/channels/pairing)
- [网关拥有的节点配对](/gateway/pairing)
- [设备 CLI（配对 + 令牌轮换）](/cli/devices)
- [配对 CLI（DM 审批）](/cli/pairing)

本地信任：

- 本地连接（环回或网关主机自身的尾网地址）可以自动批准配对，以保持同机操作体验顺畅。
- 非本地尾网/局域网客户端仍然需要明确的配对批准。

## 发现与传输

- [发现与传输](/gateway/discovery)
- [Bonjour / mDNS](/gateway/bonjour)
- [远程访问（SSH）](/gateway/remote)
- [Tailscale](/gateway/tailscale)

## 节点与传输

- [节点概览](/nodes)
- [桥接协议（旧版节点）](/gateway/bridge-protocol)
- [节点操作手册：iOS](/platforms/ios)
- [节点操作手册：Android](/platforms/android)

## 安全

- [安全概览](/gateway/security)
- [网关配置参考](/gateway/configuration)
- [故障排除](/gateway/troubleshooting)
- [诊断工具](/gateway/doctor)
