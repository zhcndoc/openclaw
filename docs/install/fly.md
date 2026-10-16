---
summary: "具有持久存储和 HTTPS 的 OpenClaw 的逐步 Fly.io 部署"
title: "Fly.io"
read_when:
  - "在 Fly.io 上部署 OpenClaw"
  - "设置 Fly 卷、密钥以及首次运行配置"
---

**目标：** OpenClaw 在具有持久存储、自动 HTTPS 和 Discord/channel 访问的 [Fly.io](https://fly.io) 计算机上运行的网关。

## <a id="what-you-need"></a> 准备工作

- 已安装 [flyctl CLI](https://fly.io/docs/hands-on/install-flyctl/)
- Fly.io 账户（免费套餐即可）
- 模型认证：你所选模型提供商的 API key
- 频道凭证：Discord bot token、Telegram token 等。

## <a id="beginner-quick-path"></a> 新手快速路径

1. 克隆仓库，自定义 `fly.toml`
2. 创建应用 + 卷，设置密钥
3. 使用 `fly deploy` 部署
4. SSH 来创建配置，或使用 Control UI

<Steps>
  <Step id="create-the-fly-app" title="创建飞行应用程序">
    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw

    # pick your own name
    fly apps create my-openclaw

    # 1GB is usually enough
    fly volumes create openclaw_data --size 1 --region iad
    ```

    Choose a region close to you.常用选项：`lhr` （London）、`iad` （Virginia）、`sjc`（圣何塞）。

  </Step>

  <Step id="configure-fly-toml" title="配置fly.toml">
    编辑 `fly.toml` 以匹配你的应用名称和需求。仓库中跟踪的 `fly.toml` 是下面展示的公开模板；`deploy/fly.private.toml` 是加固过的、无公网 IP 的变体（参见 [私有部署（加固版）](#private-deployment-hardened)）。

    ```toml
    app = "my-openclaw"  # your app name
    primary_region = "iad"

    [build]
      dockerfile = "Dockerfile"

    [env]
      NODE_ENV = "production"
      OPENCLAW_PREFER_PNPM = "1"
      OPENCLAW_STATE_DIR = "/data"
      NODE_OPTIONS = "--max-old-space-size=1536"

    [processes]
      app = "node dist/index.js gateway --allow-unconfigured --port 3000 --bind lan"

    [http_service]
      internal_port = 3000
      force_https = true
      auto_stop_machines = false
      auto_start_machines = true
      min_machines_running = 1
      processes = ["app"]

    [[http_service.checks]]
      grace_period = "2m"
      interval = "15s"
      method = "GET"
      timeout = "5s"
      path = "/startupz"

    [[vm]]
      size = "shared-cpu-2x"
      memory = "2048mb"

    [mounts]
      source = "openclaw_data"
      destination = "/data"
    ```

    OpenClaw Docker 镜像的入口点是 `tini`，默认运行 `node openclaw.mjs gateway`。Fly 的 `[processes]` 会替换 Docker 的 `CMD`（这里它直接运行 `node dist/index.js gateway ...`，即相同的编译后入口），而不会影响 `ENTRYPOINT`，因此进程仍然运行在 `tini` 之下。

    **关键设置：**

    | 设置                        | 原因                                                                         |
    | ------------------------------ | --------------------------------------------------------------------------- |
    | `--bind lan`                   | 绑定到 `0.0.0.0`，以便 Fly 的代理能够访问 gateway                     |
    | `--allow-unconfigured`         | 在没有配置文件的情况下启动（之后创建配置文件）                        |
    | `internal_port = 3000`         | 必须与 `--port 3000`（或 `OPENCLAW_GATEWAY_PORT`）匹配，供 Fly 健康检查使用 |
    | `path = "/startupz"`          | Gateway 启动完成后允许流量进入，与频道健康状况无关 |
    | `memory = "2048mb"`            | 512MB 太小；推荐 2GB                                         |
    | `OPENCLAW_STATE_DIR = "/data"` | 在卷上持久化状态                                                |

  </Step>

  <Step id="set-secrets" title="设定秘密">
    ```bash
    # required: gateway auth token for non-loopback binding
    fly secrets set OPENCLAW_GATEWAY_TOKEN=$(openssl rand -hex 32)

    # model provider API keys
    fly secrets set ANTHROPIC_API_KEY=example-anthropic-key-not-real

    # optional: other providers
    fly secrets set OPENAI_API_KEY=example-openai-key-not-real
    fly secrets set GOOGLE_API_KEY=...

    # channel tokens
    fly secrets set DISCORD_BOT_TOKEN=example-discord-bot-token
    ```

    非 loopback 绑定（`--bind lan`）需要有效的 gateway 认证路径。此示例使用 `OPENCLAW_GATEWAY_TOKEN`，但 `gateway.auth.password` 或配置正确的非 loopback trusted-proxy 部署也同样满足要求。有关 SecretRef 合同，请参见 [密钥管理](/gateway/secrets)。

    将这些令牌视为密码。对于 API 密钥和令牌，优先选择 env vars/`fly secrets` 而不是配置文件，这样秘密就不会进入 `openclaw.json` 中。

  </Step>

  <Step id="deploy" title="部署">
    ```bash
    fly deploy
    ```

    首次部署会构建 Docker 镜像。部署后验证：

    ```bash
    fly status
    fly logs
    ```

    HTTP/WebSocket 侦听器启动后，网关启动会记录 `gateway ready`。 Fly 在 `internal_port = 3000` 上检查 `/startupz` 并在启动工作完成后接纳流量。该映像的 Docker `HEALTHCHECK` 解析活动网关锁定端口，因此其 `/healthz` 活动检查也遵循此部署的 `--port 3000` 覆盖。

  </Step>

  <Step id="create-config-file" title="创建配置文件">
    通过 SSH 登录到机器以创建正确的配置：

    ```bash
    fly ssh console
    ```

    ```bash
    mkdir -p /data
    cat > /data/openclaw.json << 'EOF'
    {
      "agents": {
        "defaults": {
          "model": {
            "primary": "anthropic/claude-opus-4-6",
            "fallbacks": ["anthropic/claude-sonnet-4-6", "openai/gpt-5.4"]
          },
          "maxConcurrent": 4
        },
        "entries": {
          "main": {
            "default": true
          }
        }
      },
      "auth": {
        "profiles": {
          "anthropic:default": { "mode": "token", "provider": "anthropic" },
          "openai:default": { "mode": "token", "provider": "openai" }
        }
      },
      "bindings": [
        {
          "agentId": "main",
          "match": { "channel": "discord" }
        }
      ],
      "channels": {
        "discord": {
          "enabled": true,
          "groupPolicy": "allowlist",
          "guilds": {
            "YOUR_GUILD_ID": {
              "channels": { "general": { "enabled": true } },
              "requireMention": false
            }
          }
        }
      },
      "gateway": {
        "mode": "local",
        "bind": "auto",
        "controlUi": {
          "allowedOrigins": [
            "https://my-openclaw.fly.dev",
            "http://localhost:3000",
            "http://127.0.0.1:3000"
          ]
        }
      },
      "meta": {}
    }
    EOF
    ```

    通过 `OPENCLAW_STATE_DIR=/data`，配置路径为 `/data/openclaw.json`。

    将 `https://my-openclaw.fly.dev` 替换为您真正的 Fly 应用程序来源。网关启动从运行时 `--bind` 和 `--port` 值中播种本地 Control UI 源，因此首次启动可以在配置存在之前继续，但通过 Fly 进行浏览器访问仍然需要 `gateway.controlUi.allowedOrigins` 中列出的确切 HTTPS 源。

    上面的 `channels.discord` 块启用 Discord。它的令牌可以来自：

    - 环境变量`DISCORD_BOT_TOKEN`（推荐用于秘密）；配置的默认帐户会自动读取
    - 配置文件 `channels.discord.token`

    重启以应用更改：

    ```bash
    exit
    fly machine restart <machine-id>
    ```

  </Step>

  <Step id="access-the-gateway" title="访问网关">
    ### Control UI

    ```bash
    fly open
    ```

    或访问 `https://my-openclaw.fly.dev/`。

    使用已配置的共享密钥进行认证：即 `OPENCLAW_GATEWAY_TOKEN` 中的 gateway 令牌；如果你切换到了密码认证，则使用你的密码。

    ### <a id="logs"></a> 日志

    ```bash
    fly logs              # live logs
    fly logs --no-tail    # recent logs
    ```

    ### <a id="ssh-console"></a> SSH 控制台

    ```bash
    fly ssh console
    ```

  </Step>
</Steps>

## <a id="troubleshooting"></a> 故障排查

### <a id="%22app-is-not-listening-on-expected-address%22"></a><a id="app-is-not-listening-on-expected-address"></a> “应用未监听预期地址”

gateway 绑定到了 `127.0.0.1`，而不是 `0.0.0.0`。

**修复：** 将 `--bind lan` 添加到 `fly.toml` 中的进程命令中。

### <a id="health-checks-failing-%2F-connection-refused"></a><a id="health-checks-failing-/-connection-refused"></a> 健康检查失败 / connection refused

Fly 无法通过配置的端口访问 gateway，或者 `/startupz` 仍在报告启动工作。

**Fix：** 检查 `internal_port` 是否与网关端口（`--port 3000` 或 `OPENCLAW_GATEWAY_PORT=3000`）匹配，然后检查 `fly logs` 中是否有挂起的启动步骤。

### <a id="oom-%2F-memory-issues"></a><a id="oom-/-memory-issues"></a> OOM / 内存问题

容器一直重启或被杀死。表现：`SIGABRT`、`v8::internal::Runtime_AllocateInYoungGeneration`，或者静默重启。

**修复：** 增加 `fly.toml` 中的内存：

```toml
[[vm]]
  memory = "2048mb"
```

或者更新已有机器：

```bash
fly machine update <machine-id> --vm-memory 2048 -y
```

512MB 太小。1GB 可能可用，但在高负载或详细日志下可能会 OOM。推荐 2GB。

### <a id="gateway-lock-issues"></a> Gateway 锁问题

在容器重启后，Gateway 因“already running”错误而拒绝启动。

当设置了 `OPENCLAW_STATE_DIR=/data` 时，锁目录位于 `/data/tmp/openclaw-<uid>` 下，并会随卷持久化。OpenClaw 通常会自动回收已失效的所有者。如果启动时仍然报告存在所有者，请先使用 `fly status` 和 `fly logs` 验证是否有其他机器或 Gateway 进程正在使用该卷。当所有者可能仍在运行时，不要删除锁目录；有关所有权和失效恢复约定，请参阅[网关锁](/gateway/gateway-lock)。

### <a id="config-not-being-read"></a> 未读取配置

`--allow-unconfigured` 只会绕过启动保护。它不会创建或修复 `/data/openclaw.json`，因此请确保你的真实配置存在，并且在正常的本地 gateway 启动中包含 `"gateway": { "mode": "local" }`。

验证配置是否存在：

```bash
fly ssh console --command "cat /data/openclaw.json"
```

### <a id="writing-config-via-ssh"></a> 通过 SSH 写入配置

`fly ssh console -C` 不支持 shell 重定向。要写入配置文件：

```bash
# echo + tee (pipe from local to remote)
echo '{"your":"config"}' | fly ssh console -C "tee /data/openclaw.json"

# or sftp
fly sftp shell
> put /local/path/config.json /data/openclaw.json
```

如果文件已经存在，`fly sftp` 可能会失败；请先删除：

```bash
fly ssh console --command "rm /data/openclaw.json"
```

### <a id="state-not-persisting"></a> 状态未持久化

如果在重启后丢失了 auth profiles、channel/provider 状态或会话，则说明 state dir 正在写入容器文件系统，而不是卷。

**修复：** 在 `fly.toml` 中设置 `OPENCLAW_STATE_DIR=/data` 并重新部署。

## <a id="updating"></a> 更新

```bash
git pull
fly deploy
fly status
fly logs
```

`git pull` + `fly deploy`这里是受监督的路径：它从 Dockerfile 重建镜像，所以CLI/gateway版本、基础OS镜像和任何 Dockerfile 更改都会一起更新。`openclaw update`在运行的容器内不是相同的操作，因为图像作为Docker-建成`dist/`树没有`.git`结帐并没有npm-托管全局安装以供其检测；看[更新中](/install/updating)对于那个流动VM-风格安装。

### <a id="updating-the-machine-command"></a> 更新机器命令

要在不完整重新部署的情况下更改启动命令：

```bash
fly machines list
fly machine update <machine-id> --command "node dist/index.js gateway --port 3000 --bind lan" -y

# or with a memory increase
fly machine update <machine-id> --vm-memory 2048 --command "node dist/index.js gateway --port 3000 --bind lan" -y
```

后续的 `fly deploy` 会将机器命令重置回 `fly.toml` 中的内容；在重新部署后需要重新应用手动更改。

## <a id="private-deployment-(hardened)"></a><a id="private-deployment-hardened"></a> 私有部署（加固）

默认情况下，Fly 分配公共 IP，因此您的网关可以通过 `https://your-app.fly.dev` 访问，并且可以被互联网扫描仪（Shodan、Censys 等）发现。

使用 `deploy/fly.private.toml` 进行加固部署，不分配 **公共 IP**：它省略了 `[http_service]`，因此不会分配公共入口流量。

### <a id="when-to-use-private-deployment"></a> 何时使用私有部署

- 仅出站 calls/messages（无入站 webhook）
- 使用 ngrok 或 Tailscale 隧道处理任何 webhook 回调
- 通过 SSH、代理或 WireGuard 访问网关，而不是通过浏览器
- 需要让部署对互联网扫描器隐藏

### <a id="setup"></a> 设置

```bash
fly deploy -c deploy/fly.private.toml
```

或者转换现有部署：

```bash
# list current IPs
fly ips list -a my-openclaw

# release public IPs
fly ips release <public-ipv4> -a my-openclaw
fly ips release <public-ipv6> -a my-openclaw

# switch to the private config so future deploys do not re-allocate public IPs
fly deploy -c deploy/fly.private.toml

# allocate private-only IPv6
fly ips allocate-v6 --private -a my-openclaw
```

完成后，`fly ips list` 应只显示一个 `private` 类型的 IP：

```text
VERSION  IP                   TYPE             REGION
v6       fdaa:x:x:x:x::x      private          global
```

### <a id="accessing-a-private-deployment"></a> 访问私有部署

**选项 1：本地代理（最简单）**

```bash
fly proxy 3000:3000 -a my-openclaw
# open http://localhost:3000 in a browser
```

**选项 2：WireGuard VPN**

```bash
fly wireguard create
# import to a WireGuard client, then access via internal IPv6
# example: http://[fdaa:x:x:x:x::x]:3000
```

**选项 3：仅 SSH**

```bash
fly ssh console -a my-openclaw
```

### <a id="webhooks-with-private-deployment"></a> 通过私有部署使用 Webhook

对于不公开暴露的 webhook 回调（Twilio、Telnyx 等）：

1. **ngrok 隧道**：在容器内运行 ngrok，或作为 sidecar 运行
2. **Tailscale Funnel**：通过 Tailscale 暴露特定路径
3. **仅外呼**：某些提供商（如 Twilio）在无需 webhook 的情况下也可用于外呼

带有 ngrok 的语音通话配置示例，位于 `plugins.entries.voice-call.config` 下：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio",
          tunnel: { provider: "ngrok" },
          webhookSecurity: {
            allowedHosts: ["example.ngrok.app"],
          },
        },
      },
    },
  },
}
```

ngrok 隧道在容器内运行，并提供公共 webhook URL，而不会暴露 Fly 应用本身。将 `webhookSecurity.allowedHosts` 设置为隧道主机名，以便接受转发的 host 头。

### <a id="security-tradeoffs"></a> 安全权衡

| 方面            | 民众       | 私有    |
| ----------------- | ------------ | ---------- |
| 互联网扫描器 | 可被发现 | 已隐藏     |
| 直接攻击    | 可能     | 已阻止    |
| Control UI 访问 | 浏览器      | Proxy/VPN  |
| Webhook 交付  | 直接       | 通过隧道 |

## <a id="notes"></a> 说明

- Fly.io 使用 x86 架构；该 Dockerfile 同时兼容 x86 和 ARM。
- 对于 WhatsApp/Telegram 入门，请使用 `fly ssh console`。
- 持久化数据存储在 `/data` 挂载的卷上。
- Signal 需要镜像中包含 signal-cli（基于 Java 的 CLI）；请使用自定义镜像，并将内存保持在 2GB 以上。

## <a id="cost"></a> 成本

使用推荐配置（`shared-cpu-2x`，2GB RAM）时，预计每月约 $10-15，具体取决于使用情况；免费套餐覆盖一些基础额度。有关当前费率，请参见 [Fly.io 定价](https://fly.io/docs/about/pricing/)。

## <a id="next-steps"></a> 下一步

- 设置消息通道：[Channels](/channels)
- 配置网关：[网关配置](/gateway/configuration)
- 使 OpenClaw 保持最新状态：[Updating](/install/updating)

## <a id="related"></a> 相关内容

- [安装概览](/install)
- [Hetzner](/install/hetzner)
- [Docker](/install/docker)
- [VPS 托管](/vps)
