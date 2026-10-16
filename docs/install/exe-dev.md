---
summary: "在 exe.dev 上运行 OpenClaw Gateway（VM + HTTPS 代理），用于远程访问"
read_when:
  - "你想要一个便宜、始终在线的 Linux 主机来运行 Gateway"
  - "您希望远程访问 Control UI 而不运行自己的 VPS"
title: "exe.dev"
---

**目标：** 在 [exe.dev](https://exe.dev) 的 VM 上运行 OpenClaw Gateway，可通过 `https://<vm-name>.exe.xyz` 访问。

本指南假设使用 exe.dev 的默认 **exeuntu** 镜像。若使用其他发行版，请相应调整软件包。

## <a id="what-you-need"></a> 准备工作

- exe.dev 账户
- `ssh exe.dev` 访问 exe.dev 虚拟机（可选，用于手动设置）

## <a id="beginner-quick-path"></a> 新手快速路径

1. 打开 [https://exe.new/openclaw](https://exe.new/openclaw)
2. 根据需要填写您的授权 key/token
3. 点击你的 VM 旁边的 “Agent”，等待 Shelley 完成配置
4. 打开 `https://<vm-name>.exe.xyz/`，并使用已配置的共享密钥进行身份验证（默认使用令牌身份验证；如果你切换 `gateway.auth.mode`，也可以使用密码身份验证）
5. 使用 `openclaw devices approve <requestId>` 批准待处理的设备配对请求。

## <a id="automated-install-with-shelley"></a> 使用 Shelley 自动安装

Shelley，exe.dev 的代理，可以通过提示安装 OpenClaw：

```text
Set up OpenClaw (https://docs.openclaw.ai/install) on this VM. Use the non-interactive and accept-risk flags for openclaw onboarding. Add the supplied auth or token as needed. Configure nginx to forward from the default port 18789 to the root location on the default enabled site config, making sure to enable Websocket support. Set gateway.controlUi.allowedOrigins to the exact https://<vm-name>.exe.xyz origin, and set gateway.trustedProxies to ["127.0.0.1"] because nginx connects to the Gateway over loopback and overwrites X-Forwarded-For. Pairing is done by "openclaw devices list" and "openclaw devices approve <request id>". Make sure the dashboard shows that OpenClaw's health is OK. exe.dev handles forwarding from port 8000 to port 80/443 and HTTPS for us, so the final "reachable" should be <vm-name>.exe.xyz, without port specification.
```

## <a id="manual-installation"></a> 手动安装

<Steps>
  <Step id="create-the-vm" title="创建 VM">
    从你的设备：

    ```bash
    ssh exe.dev new
    ```

    然后连接：

    ```bash
    ssh <vm-name>.exe.xyz
    ```

    <Tip>
    保留此 VM **stateful**。 OpenClaw 在 `~/.openclaw/` 下存储 `openclaw.json`、共享和每个代理 SQLite 身份验证存储、会话和 channel/provider 状态，以及 `~/.openclaw/workspace/` 下的工作区。
    </Tip>

  </Step>

  <Step id="install-prerequisites-on-the-vm" title="安装先决条件（在 VM 上）">
    ```bash
    sudo apt-get update
    sudo apt-get install -y git curl jq ca-certificates openssl
    ```
  </Step>

  <Step id="install-openclaw" title="安装 OpenClaw">
    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    ```
  </Step>

  <Step id="configure-nginx-to-proxy-to-port-8000" title="配置nginx代理8000端口">
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

            # WebSocket support
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";

            # Standard proxy headers
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $remote_addr;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Timeout settings for long-lived connections
            proxy_read_timeout 86400s;
            proxy_send_timeout 86400s;
        }
    }
    ```

    覆盖转发头，而不是保留客户端提供的链。OpenClaw 仅信任来自显式配置代理的转发 IP 元数据，而追加式 `X-Forwarded-For` 链被视为加固风险。

  </Step>

  <Step id="trust-nginx-and-allow-the-public-browser-origin" title="信任 nginx 并允许公共浏览器源">
    配置确切的公共源并仅信任环回 nginx 跃点：

    ```bash
    openclaw config set gateway.controlUi.allowedOrigins '["https://<vm-name>.exe.xyz"]' --strict-json
    openclaw config set gateway.trustedProxies '["127.0.0.1"]' --strict-json
    openclaw gateway restart
    ```

    浏览器源检查会拒绝不允许的公共主机名。代理白名单允许 OpenClaw 使用 nginx 覆盖的 `X-Forwarded-For` 值，而不是将每个请求视为源自环回代理。将此列表限制为您控制的代理。

  </Step>

  <Step id="access-openclaw-and-approve-devices" title="访问 OpenClaw 并批准设备">
    打开 `https://<vm-name>.exe.xyz/`（请参见引导中的 Control UI 输出）。如果提示认证，请粘贴 VM 中配置的共享密钥。

    本指南默认使用令牌认证，因此请在交互式终端中运行 `openclaw gateway auth-token --show` 以获取已配置的令牌。如果未配置令牌，请使用 `openclaw doctor --generate-gateway-token` 生成一个，然后重启 Gateway。如果你已将网关切换为密码认证，请改用 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`。

    使用 `openclaw devices list` 和 `openclaw devices approve <requestId>` 批准设备。不确定时，请在浏览器中使用 Shelley。

  </Step>
</Steps>

## <a id="remote-channel-setup"></a> 远程通道设置

对于远程主机，优先选择一次 `config patch` 调用，而不是对 `config set` 的多次 SSH 调用。将真实代币保留在VM环境或`~/.openclaw/.env`中，并在`openclaw.json`中仅放置SecretRefs。有关完整的 SecretRef 合约，请参阅 [ 秘密管理](/gateway/secrets)。

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
      model: { primary: "openai/gpt-6-astra" },
      models: {
        "openai/gpt-6-astra": { params: { fastMode: true } },
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

## <a id="remote-access"></a> 远程访问

exe.dev 处理远程访问的身份验证。默认情况下，来自端口 8000 的 HTTP 流量会通过邮箱认证转发到 `https://<vm-name>.exe.xyz`。

## <a id="updating"></a> 更新

```bash
openclaw update
```

有关频道切换和手动恢复，请参见[更新](/install/updating)。

## <a id="related"></a> 相关内容

- [远程 gateway](/gateway/remote)
- [安装概览](/install)
