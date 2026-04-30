---
summary: "在 exe.dev 上运行 OpenClaw Gateway（VM + HTTPS 代理），用于远程访问"
read_when:
  - 你想要一个便宜、始终在线的 Linux 主机来运行 Gateway
  - 你想要无需运行自己的 VPS 即可进行远程 Control UI 访问
title: "exe.dev"
---

目标：在 exe.dev 的 VM 上运行 OpenClaw Gateway，并可从你的笔记本通过以下地址访问：`https://<vm-name>.exe.xyz`

本页面假设使用 exe.dev 的默认 **exeuntu** 镜像。如果你选择了不同的发行版，请相应地映射软件包。

## 初学者快速路径

1. [https://exe.new/openclaw](https://exe.new/openclaw)
2. 按需填写你的 auth key/token
3. 点击你的 VM 旁边的“Agent”，等待 Shelley 完成配置
4. 打开 `https://<vm-name>.exe.xyz/`，并使用已配置的共享密钥进行身份验证（本指南默认使用 token auth，但如果你切换 `gateway.auth.mode`，password auth 也可以使用）
5. 使用 `openclaw devices approve <requestId>` 批准任何待处理的设备配对请求

## 你需要准备什么

- exe.dev 账户
- 访问 [exe.dev](https://exe.dev) 虚拟机的 `ssh exe.dev` 权限（可选）

## 使用 Shelley 自动安装

Shelley，[exe.dev](https://exe.dev) 的 agent，可以通过我们的提示词立即安装 OpenClaw。所使用的提示词如下：

```
在这台 VM 上设置 OpenClaw (https://docs.openclaw.ai/install)。为 openclaw onboarding 使用非交互式和 accept-risk 标志。按需添加提供的 auth 或 token。配置 nginx，将默认启用站点配置上的默认端口 18789 转发到根路径，确保启用 Websocket 支持。配对通过 "openclaw devices list" 和 "openclaw devices approve <request id>" 完成。确保仪表盘显示 OpenClaw 的健康状态为 OK。exe.dev 会为我们处理从端口 8000 到 80/443 的转发以及 HTTPS，因此最终的“可访问地址”应为 <vm-name>.exe.xyz，不要指定端口。
```

## 手动安装

## 1）创建 VM

在你的设备上：

```bash
ssh exe.dev new
```

然后连接：

```bash
ssh <vm-name>.exe.xyz
```

<Tip>
保持此 VM 为**有状态**。OpenClaw 会将 `openclaw.json`、按 agent 区分的 `auth-profiles.json`、会话以及 channel/provider 状态存储在 `~/.openclaw/` 下，同时将工作区存储在 `~/.openclaw/workspace/`。
</Tip>

## 2）安装前置依赖（在 VM 上）

```bash
sudo apt-get update
sudo apt-get install -y git curl jq ca-certificates openssl
```

## 3）安装 OpenClaw

运行 OpenClaw 安装脚本：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

## 4）设置 nginx，将 OpenClaw 代理到端口 8000

使用以下内容编辑 `/etc/nginx/sites-enabled/default`

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

        # 标准代理头
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

请覆盖转发头，而不是保留客户端提供的链路。
OpenClaw 仅信任来自显式配置代理的转发 IP 元数据，
而追加式 `X-Forwarded-For` 链路会被视为加固风险。

## 5）访问 OpenClaw 并授予权限

访问 `https://<vm-name>.exe.xyz/`（参见 onboarding 输出中的 Control UI）。如果它提示进行身份验证，请粘贴
VM 中配置的共享密钥。本指南使用 token auth，因此请通过 `openclaw config get gateway.auth.token`
获取 `gateway.auth.token`（或者使用 `openclaw doctor --generate-gateway-token` 生成一个）。
如果你将 gateway 改为 password auth，请改用 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`。
使用 `openclaw devices list` 和 `openclaw devices approve <requestId>` 批准设备。如有疑问，请从浏览器中使用 Shelley！

## 远程通道设置

对于远程主机，建议一次使用一个 `config patch` 调用，而不是多次 SSH 调用 `config set`。将真实 token 保留在 VM 环境或 `~/.openclaw/.env` 中，并且只在 `openclaw.json` 中放置 SecretRef。

在 VM 上，让服务环境包含它所需的密钥：

```bash
cat >> ~/.openclaw/.env <<'EOF'
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
DISCORD_BOT_TOKEN=...
OPENAI_API_KEY=sk-...
EOF
```

在本地机器上，创建一个补丁文件并将其传到 VM：

```json5
// openclaw.remote.patch.json5
{
  secrets: {
    providers: {
      default: { source: "env" },
    },
  },
  channels: {
    slack: {
      enabled: true,
      mode: "socket",
      botToken: { source: "env", provider: "default", id: "SLACK_BOT_TOKEN" },
      appToken: { source: "env", provider: "default", id: "SLACK_APP_TOKEN" },
      groupPolicy: "open",
      requireMention: false,
    },
    discord: {
      enabled: true,
      token: { source: "env", provider: "default", id: "DISCORD_BOT_TOKEN" },
      dmPolicy: "disabled",
      dm: { enabled: false },
      groupPolicy: "allowlist",
    },
  },
  agents: {
    defaults: {
      model: { primary: "openai/gpt-5.5" },
      models: {
        "openai/gpt-5.5": { params: { fastMode: true } },
      },
    },
  },
}
```

```bash
ssh <vm-name>.exe.xyz 'openclaw config patch --stdin --dry-run' < ./openclaw.remote.patch.json5
ssh <vm-name>.exe.xyz 'openclaw config patch --stdin' < ./openclaw.remote.patch.json5
ssh <vm-name>.exe.xyz 'openclaw gateway restart && openclaw health'
```

当嵌套 allowlist 应该精确变成补丁值时，请使用 `--replace-path`，例如在替换 Discord 通道 allowlist 时：

```bash
ssh <vm-name>.exe.xyz 'openclaw config patch --stdin --replace-path "channels.discord.guilds[\"123\"].channels"' < ./discord.patch.json5
```

## 远程访问

远程访问由 [exe.dev](https://exe.dev) 的身份验证处理。默认情况下，从端口 8000 发出的 HTTP 流量会通过 email auth 转发到
`https://<vm-name>.exe.xyz`。

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
