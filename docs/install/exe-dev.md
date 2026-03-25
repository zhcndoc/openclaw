---
summary: "在 exe.dev（虚拟机 + HTTPS 代理）上运行 OpenClaw Gateway 以实现远程访问"
read_when:
  - 你想要一个廉价的常驻 Linux 主机用于 Gateway
  - 你想要远程控制界面访问而不运行自己的 VPS
title: "exe.dev"
---

# exe.dev

目标：在 exe.dev 虚拟机上运行 OpenClaw Gateway，通过 `https://<vm-name>.exe.xyz` 从你的笔记本电脑访问。

本页假设使用 exe.dev 默认的 **exeuntu** 镜像。如果你选择了不同的发行版，请相应映射软件包。

## 初学者快速路径

1. [https://exe.new/openclaw](https://exe.new/openclaw)
2. Fill in your auth key/token as needed
3. Click on "Agent" next to your VM and wait for Shelley to finish provisioning
4. Open `https://<vm-name>.exe.xyz/` and paste your gateway token to authenticate
5. Approve any pending device pairing requests with `openclaw devices approve <requestId>`

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

小贴士：保持此虚拟机为**有状态**。OpenClaw 的状态数据存储在 `~/.openclaw/` 和 `~/.openclaw/workspace/`。

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
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 长连接的超时设置
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

## 5) 访问 OpenClaw 并授权

访问 `https://<vm-name>.exe.xyz/`（见入门时的控制界面输出）。如果提示认证，请粘贴 VM 上的令牌（通过 `openclaw config get gateway.auth.token` 获取，或使用 `openclaw doctor --generate-gateway-token` 生成）。使用 `openclaw devices list` 和 `openclaw devices approve <requestId>` 授权设备。如有疑问，在浏览器中使用 Shelley！

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
