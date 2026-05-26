---
summary: "在 Upstash Box 上托管 OpenClaw，支持保活和 SSH 隧道访问"
read_when:
  - 将 OpenClaw 部署到 Upstash Box
  - 你希望在受管理的 Linux 环境中运行 OpenClaw，并通过 SSH 隧道访问仪表盘
title: "Upstash Box"
---

在 Upstash Box 上运行一个持久的 OpenClaw Gateway，这是一个支持保活生命周期的受管理 Linux 环境。

使用 SSH 隧道访问仪表盘。不要将 Gateway 端口直接暴露给公共互联网。

## 先决条件

- Upstash 账户
- 支持保活的 Upstash Box
- 本地机器上的 SSH 客户端

## 创建 Box

在 Upstash 控制台中创建一个保活 Box。记下 Box ID，例如
`right-flamingo-14486`，以及你的 Box API 密钥。

Upstash 目前维护的 OpenClaw Box 操作指南位于
[OpenClaw 设置](https://upstash.com/docs/box/guides/openclaw-setup)。

## 使用 SSH 隧道连接

将 OpenClaw 仪表盘端口转发到本地机器。出现提示时，将你的 Box API 密钥
作为 SSH 密码：

```bash
ssh -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -L 18789:127.0.0.1:18789 <box-id>@us-east-1.box.upstash.com
```

keepalive 选项可减少在引导过程中因空闲而导致的隧道断开。

## 安装 OpenClaw

在 Box 内部：

```bash
sudo npm install -g openclaw
```

## 运行引导流程

```bash
openclaw onboard --install-daemon
```

按照提示操作。引导完成后，复制仪表盘 URL 和 token。

## 启动 Gateway

为 Box 网络配置 Gateway，并在后台启动它：

```bash
openclaw config set gateway.bind lan
nohup openclaw gateway > gateway.log 2>&1 &
```

在 SSH 隧道处于活动状态时，在本地打开仪表盘 URL：

```text
http://127.0.0.1:18789/#token=<your-token>
```

## 自动重启

将此命令设置为 Box 初始化脚本，以便在 Box 启动时重新启动 Gateway：

```bash
nohup openclaw gateway > gateway.log 2>&1 &
```

## 故障排查

如果 SSH 在引导过程中卡住，请使用干净的 SSH 配置和 keepalive 重新连接：

```bash
ssh -F /dev/null -o ControlMaster=no -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -L 18789:127.0.0.1:18789 <box-id>@us-east-1.box.upstash.com
```

这会绕过本地过时的 `~/.ssh/config` 设置，并在网络空闲期间保持隧道活动。

## 相关内容

- [远程访问](/gateway/remote)
- [Gateway 安全性](/gateway/security)
- [更新 OpenClaw](/install/updating)
