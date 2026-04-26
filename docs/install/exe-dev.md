---
summary: "在 exe.dev（虚拟机 + HTTPS 代理）上运行 OpenClaw Gateway 以实现远程访问"
read_when:
  - 你想要一个廉价的常驻 Linux 主机用于 Gateway
  - 你想要远程控制界面访问而不运行自己的 VPS
title: "exe.dev"
---

目标：在 exe.dev VM 上运行 OpenClaw Gateway，可通过以下地址从你的笔记本电脑访问：`https://<vm-name>.exe.xyz`

本页假设使用 exe.dev 默认的 **exeuntu** 镜像。如果你选择了不同的发行版，请相应映射软件包。

## 初学者快速路径

1. [https://exe.new/openclaw](https://exe.new/openclaw)
2. 根据需要填写你的 auth key/token
3. 点击你的 VM 旁边的 “Agent”，等待 Shelley 完成预配
4. 打开 `https://<vm-name>.exe.xyz/`，并使用已配置的共享密钥进行认证（本指南默认使用 token 认证，但如果你切换到 `gateway.auth.mode`，密码认证也可以）
5. 使用 `openclaw devices approve <requestId>` 批准任何待处理的设备配对请求

## 所需条件

- exe.dev 账号
- 访问 [exe.dev](https://exe.dev) 虚拟机的 `ssh exe.dev` 权限（可选）

## 使用 Shelley 自动安装

Shelley，[exe.dev](https://exe.dev) 的代理，可以通过我们的提示即时安装 OpenClaw。
下面是所使用的提示内容：

```
在此虚拟机上设置 OpenClaw (https://docs.openclaw.ai/install)。使用非交互模式和接受风险标志来进行 OpenClaw 入门。按需添加提供的认证或令牌。配置 nginx 将默认端口 18789 转发到默认启用站点配置的根路径，确保启用 Websocket 支持。配对通过 "openclaw devices list" 和 "openclaw devices approve <request id>" 完成。确保仪表盘显示 OpenClaw 状态正常。exe.dev 处理从端口 8000 到 80/443 的转发和 HTTPS，因此最终“可访问地址”应为 <vm-name>.exe.xyz，无需指定端口。
```

## 手动安装

## 1) 创建虚拟机

在你的设备上运行：

```bash
ssh exe.dev new
```

然后连接：

```bash
ssh <vm-name>.exe.xyz
```

提示：请保持此 VM 为**有状态**。OpenClaw 会将 `openclaw.json`、每个 agent 的
`auth-profiles.json`、会话以及 channel/provider 状态存储在
`~/.openclaw/` 下，同时工作区存储在 `~/.openclaw/workspace/` 下。

## 2) 安装先决条件（在虚拟机上）

```bash
sudo apt-get update
sudo apt-get install -y git curl jq ca-certificates openssl
```

## 3) 安装 OpenClaw

运行 OpenClaw 安装脚本：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

## 4) 配置 nginx 代理 OpenClaw 至端口 8000

编辑 `/etc/nginx/sites-enabled/default`，内容如下：

```
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    listen 8000;
    listen [::]:8000;

    server_name _;

    location / {
        proxy_pass http://127.0.0.1:18789;
        proxy_http_version 1.1;

        # WebSocket 支持
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 标准代理请求头
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 长连接的超时设置
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

覆盖转发头，而不是保留客户端提供的链式头。
OpenClaw 仅信任来自显式配置代理的转发 IP 元数据，
并且追加式 `X-Forwarded-For` 链会被视为加固风险。

## 5) 访问 OpenClaw 并授予权限

访问 `https://<vm-name>.exe.xyz/`（请参见引导时控制界面的输出）。如果提示进行认证，请粘贴
VM 中配置的共享密钥。本指南使用 token 认证，因此请通过 `openclaw config get gateway.auth.token`
获取 `gateway.auth.token`（或者使用 `openclaw doctor --generate-gateway-token` 生成一个）。
如果你将 gateway 改为密码认证，则改用 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`。
使用 `openclaw devices list` 和 `openclaw devices approve <requestId>` 批准设备。若有疑问，请从浏览器中使用 Shelley！

## 远程访问

远程访问由 [exe.dev](https://exe.dev) 的认证处理。默认情况下，端口 8000 的 HTTP 流量会被转发到 `https://<vm-name>.exe.xyz`，并且要求邮箱认证。

## 更新

```bash
npm i -g openclaw@latest
openclaw doctor
openclaw gateway restart
openclaw health
```

指南：[更新](/install/updating)

## 相关内容

- [远程 gateway](/gateway/remote)
- [安装概览](/install)
