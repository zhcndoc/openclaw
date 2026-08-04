---
summary: "在 exe.dev 上运行 OpenClaw Gateway（VM + HTTPS 代理），用于远程访问"
read_when:
  - 你想要一个便宜、始终在线的 Linux 主机来运行 Gateway
  - 你想要无需运行自己的 VPS 即可进行远程 Control UI 访问
title: "exe.dev"
---

**目标：** 在 [exe.dev](https://exe.dev) 的 VM 上运行 OpenClaw Gateway，可通过 `https://<vm-name>.exe.xyz` 访问。

本指南假设使用 exe.dev 的默认 **exeuntu** 镜像。若使用其他发行版，请相应调整软件包。

## 你需要准备什么

- exe.dev 账户
- `ssh exe.dev` 访问 exe.dev 虚拟机（可选，用于手动设置）

## 新手快速路径

1. 打开 [https://exe.new/openclaw](https://exe.new/openclaw)
2. 根据需要填写你的认证密钥/令牌
3. 点击你的 VM 旁边的 “Agent”，等待 Shelley 完成配置
4. 打开 `https://<vm-name>.exe.xyz/`，并使用已配置的共享密钥进行身份验证（默认使用令牌身份验证；如果你切换 `gateway.auth.mode`，也可以使用密码身份验证）
5. 使用 `openclaw devices approve <requestId>` 批准待处理的设备配对请求。

## 使用 Shelley 自动安装

Shelley，exe.dev 的代理，可以通过提示安装 OpenClaw：

```text
在这台 VM 上设置 OpenClaw (https://docs.openclaw.ai/install)。对 openclaw onboarding 使用 non-interactive 和 accept-risk 标志。根据需要添加提供的认证信息或令牌。将 nginx 配置为在默认启用的站点配置上，将默认端口 18789 转发到根路径，并确保启用 WebSocket 支持。配对通过 "openclaw devices list" 和 "openclaw devices approve <request id>" 完成。确保仪表板显示 OpenClaw 的健康状态为 OK。exe.dev 会为我们处理从端口 8000 到 80/443 的转发以及 HTTPS，因此最终的 "reachable" 应该是 <vm-name>.exe.xyz，不需要指定端口。
```

## 手动安装

<Steps>
  <Step title="创建虚拟机">
    从你的设备：

    ```bash
    ssh exe.dev new
    ```

    然后连接：

    ```bash
    ssh <vm-name>.exe.xyz
    ```

    <Tip>
    保持这个虚拟机**有状态**。OpenClaw 会将 `openclaw.json`、每个代理的 `auth-profiles.json`、会话以及通道/提供方状态存储在 `~/.openclaw/` 下，并将工作区存储在 `~/.openclaw/workspace/` 下。
    </Tip>

  </Step>

  <Step title="安装先决条件（在虚拟机上）">
    ```bash
    sudo apt-get update
    sudo apt-get install -y git curl jq ca-certificates openssl
    ```
  </Step>

  <Step title="安装 OpenClaw">
    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    ```
  </Step>

  <Step title="配置 nginx 代理到 8000 端口">
    编辑 `/etc/nginx/sites-enabled/default`：

    ```nginx
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

    覆盖转发头，而不是保留客户端提供的链。OpenClaw 仅信任来自显式配置代理的转发 IP 元数据，而追加式 `X-Forwarded-For` 链被视为加固风险。

  </Step>

  <Step title="访问 OpenClaw 并批准设备">
    打开 `https://<vm-name>.exe.xyz/`（请参见引导中的 Control UI 输出）。如果提示认证，请粘贴 VM 中配置的共享密钥。

    本指南默认使用令牌认证，因此请在交互式终端中运行 `openclaw gateway auth-token --show` 以获取已配置的令牌。如果未配置令牌，请使用 `openclaw doctor --generate-gateway-token` 生成一个，然后重启 Gateway。如果你已将网关切换为密码认证，请改用 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`。

    使用 `openclaw devices list` 和 `openclaw devices approve <requestId>` 批准设备。不确定时，请在浏览器中使用 Shelley。

  </Step>
</Steps>

## 远程通道设置

对于远程主机，优先使用一次 `config patch` 调用，而不是多次通过 SSH 调用 `config set`。将真实令牌保留在 VM 环境变量或 `~/.openclaw/.env` 中，只在 `openclaw.json` 里放置 SecretRef。有关完整的 SecretRef 约定，请参见 [Secrets management](/gateway/secrets)。

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
      model: { primary: "openai/gpt-5.6-sol" },
      models: {
        "openai/gpt-5.6-sol": { params: { fastMode: true } },
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

当嵌套 allowlist 应精确变为补丁值时，请使用 `--replace-path`，例如替换 Discord 通道 allowlist：

```bash
ssh <vm-name>.exe.xyz 'openclaw config patch --stdin --replace-path "channels.discord.guilds[\"123\"].channels"' < ./discord.patch.json5
```

有关完整的通道配置参考，请参见 [Discord](/channels/discord) 和 [Slack](/channels/slack)。

## 远程访问

exe.dev 处理远程访问的身份验证。默认情况下，来自端口 8000 的 HTTP 流量会通过邮箱认证转发到 `https://<vm-name>.exe.xyz`。

## 更新

```bash
openclaw update
```

有关频道切换和手动恢复，请参见[更新](/install/updating)。

## 相关内容

- [远程 gateway](/gateway/remote)
- [安装概览](/install)
