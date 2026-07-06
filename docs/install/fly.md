---
summary: "为 OpenClaw 提供带持久化存储和 HTTPS 的 Fly.io 分步部署"
title: Fly.io
read_when:
  - 在 Fly.io 上部署 OpenClaw
  - 设置 Fly 卷、密钥以及首次运行配置
---

**目标：** 在 [Fly.io](https://fly.io) 的机器上运行 OpenClaw Gateway，具备持久化存储、自动 HTTPS 以及 Discord/频道访问能力。

## 你需要准备什么

- 已安装 [flyctl CLI](https://fly.io/docs/hands-on/install-flyctl/)
- Fly.io 账号（免费套餐即可）
- 模型认证：你所选模型提供商的 API key
- 频道凭证：Discord bot token、Telegram token 等

## 新手快速路径

1. 克隆仓库，自定义 `fly.toml`
2. 创建应用 + 卷，设置密钥
3. 使用 `fly deploy` 部署
4. 通过 SSH 登录创建配置，或使用 Control UI

<Steps>
  <Step title="创建 Fly 应用">
    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw

    # 选择你自己的名称
    fly apps create my-openclaw

    # 1GB 通常就足够
    fly volumes create openclaw_data --size 1 --region iad
    ```

    选择一个离你较近的区域。常见选项：`lhr`（伦敦）、`iad`（弗吉尼亚）、`sjc`（圣何塞）。

  </Step>

  <Step title="配置 fly.toml">
    编辑 `fly.toml` 以匹配你的应用名称和需求。仓库中跟踪的 `fly.toml` 是下面展示的公开模板；`deploy/fly.private.toml` 是加固过的、无公网 IP 的变体（参见 [Private deployment](#private-deployment-hardened)）。

    ```toml
    app = "my-openclaw"  # 你的应用名称
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

    [[vm]]
      size = "shared-cpu-2x"
      memory = "2048mb"

    [mounts]
      source = "openclaw_data"
      destination = "/data"
    ```

    OpenClaw Docker 镜像的 entrypoint 是 `tini`，默认运行 `node openclaw.mjs gateway`。Fly 的 `[processes]` 会替换 Docker 的 `CMD`（这里它直接运行 `node dist/index.js gateway ...`，即相同的编译后入口），而不会影响 `ENTRYPOINT`，因此进程仍然运行在 `tini` 之下。

    **关键设置：**

    | Setting                        | Why                                                                         |
    | ------------------------------ | --------------------------------------------------------------------------- |
    | `--bind lan`                   | 绑定到 `0.0.0.0`，这样 Fly 的代理才能访问 gateway                         |
    | `--allow-unconfigured`         | 无需配置文件即可启动（之后你再创建）                                        |
    | `internal_port = 3000`         | 必须与 `--port 3000`（或 `OPENCLAW_GATEWAY_PORT`）匹配，供 Fly 健康检查使用 |
    | `memory = "2048mb"`            | 512MB 太小；推荐 2GB                                                        |
    | `OPENCLAW_STATE_DIR = "/data"` | 将状态持久化到卷中                                                          |

  </Step>

  <Step title="设置密钥">
    ```bash
    # 必需：用于非 loopback 绑定的 gateway 认证令牌
    fly secrets set OPENCLAW_GATEWAY_TOKEN=$(openssl rand -hex 32)

    # 模型提供商 API 密钥
    fly secrets set ANTHROPIC_API_KEY=example-anthropic-key-not-real

    # 可选：其他提供商
    fly secrets set OPENAI_API_KEY=example-openai-key-not-real
    fly secrets set GOOGLE_API_KEY=...

    # channel 令牌
    fly secrets set DISCORD_BOT_TOKEN=example-discord-bot-token
    ```

    非 loopback 绑定（`--bind lan`）需要有效的 gateway 认证路径。此示例使用 `OPENCLAW_GATEWAY_TOKEN`，但 `gateway.auth.password` 或配置正确的 non-loopback trusted-proxy 部署也同样满足要求。有关 SecretRef 合同，请参见 [Secrets management](/gateway/secrets)。

    把这些令牌当作密码处理。API 密钥和令牌应优先使用环境变量/`fly secrets`，而不是配置文件，这样机密信息就不会出现在 `openclaw.json` 中。

  </Step>

  <Step title="部署">
    ```bash
    fly deploy
    ```

    首次部署会构建 Docker 镜像。部署后验证：

    ```bash
    fly status
    fly logs
    ```

    当 HTTP/WebSocket 监听器启动后，gateway 会输出 `gateway ready`。Fly 自身的健康检查会按照 `fly.toml` 监视 `internal_port = 3000`；镜像的 Docker `HEALTHCHECK` 指令还会轮询默认端口 18789 上的 `/healthz`，但由于此部署将 gateway 覆盖为 `--port 3000`，该端口在这里未被使用。

  </Step>

  <Step title="创建配置文件">
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
        "list": [
          {
            "id": "main",
            "default": true
          }
        ]
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
              "channels": { "general": { "allow": true } },
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

    将 `https://my-openclaw.fly.dev` 替换为你真实的 Fly 应用来源。gateway 启动时会根据运行时的 `--bind` 和 `--port` 值为本地 Control UI 的 origin 设定初始值，因此首次启动即使配置尚不存在也可以继续，但通过 Fly 进行浏览器访问仍然需要在 `gateway.controlUi.allowedOrigins` 中列出准确的 HTTPS origin。

    Discord 令牌可以来自以下任一方式：

    - 环境变量 `DISCORD_BOT_TOKEN`（推荐用于密钥）；无需将其添加到配置中，gateway 会自动读取
    - 配置文件 `channels.discord.token`

    重启以应用更改：

    ```bash
    exit
    fly machine restart <machine-id>
    ```

  </Step>

  <Step title="访问 Gateway">
    ### Control UI

    ```bash
    fly open
    ```

    或访问 `https://my-openclaw.fly.dev/`。

    使用已配置的共享密钥进行认证：即 `OPENCLAW_GATEWAY_TOKEN` 中的 gateway 令牌；如果你切换到了密码认证，则使用你的密码。

    ### 日志

    ```bash
    fly logs              # 实时日志
    fly logs --no-tail    # 最近日志
    ```

    ### SSH 控制台

    ```bash
    fly ssh console
    ```

  </Step>
</Steps>

## 故障排查

### “App is not listening on expected address”

gateway 绑定到了 `127.0.0.1`，而不是 `0.0.0.0`。

**Fix:** 在 `fly.toml` 的进程命令中添加 `--bind lan`。

### 健康检查失败 / connection refused

Fly 无法通过配置的端口访问 gateway。

**Fix:** 确保 `internal_port` 与 gateway 端口一致（`--port 3000` 或 `OPENCLAW_GATEWAY_PORT=3000`）。

### OOM / memory issues

容器一直重启或被杀死。表现：`SIGABRT`、`v8::internal::Runtime_AllocateInYoungGeneration`，或者静默重启。

**Fix:** 增加 `fly.toml` 中的内存：

```toml
[[vm]]
  memory = "2048mb"
```

或者更新已有机器：

```bash
fly machine update <machine-id> --vm-memory 2048 -y
```

512MB 太小。1GB 可能可用，但在高负载或详细日志下可能会 OOM。推荐 2GB。

### Gateway 锁问题

在容器重启后，Gateway 因“already running”错误而拒绝启动。

单实例锁文件位于 `<tmpdir>/openclaw-<uid>/gateway.<hash>.lock`（Linux: `/tmp/openclaw-<uid>/gateway.<hash>.lock`），而不在持久化的 `/data` 卷上，所以完整的容器重启通常会连同容器文件系统的其余部分一起清除它。如果锁仍然存在（例如保留容器文件系统的 `fly machine restart`）并阻止启动，请手动删除：

```bash
fly ssh console --command "rm -f /tmp/openclaw-*/gateway.*.lock"
fly machine restart <machine-id>
```

### 未读取配置

`--allow-unconfigured` 只会绕过启动保护。它不会创建或修复 `/data/openclaw.json`，因此请确保你的真实配置存在，并且在正常的本地 gateway 启动中包含 `"gateway": { "mode": "local" }`。

验证配置是否存在：

```bash
fly ssh console --command "cat /data/openclaw.json"
```

### 通过 SSH 写入配置

`fly ssh console -C` 不支持 shell 重定向。要写入配置文件：

```bash
# echo + tee（从本地通过管道传到远程）
echo '{"your":"config"}' | fly ssh console -C "tee /data/openclaw.json"

# 或者使用 sftp
fly sftp shell
> put /local/path/config.json /data/openclaw.json
```

如果文件已经存在，`fly sftp` 可能会失败；请先删除：

```bash
fly ssh console --command "rm /data/openclaw.json"
```

### 状态未持久化

如果在重启后丢失了 auth profiles、channel/provider 状态或会话，则说明 state dir 正在写入容器文件系统，而不是卷。

**Fix:** 确保在 `fly.toml` 中设置了 `OPENCLAW_STATE_DIR=/data` 并重新部署。

## 更新

```bash
git pull
fly deploy
fly status
fly logs
```

`git pull` + `fly deploy` 是这里受监督的更新路径：它会根据 Dockerfile 重新构建镜像，因此 CLI/gateway 版本、基础 OS 镜像以及任何 Dockerfile 的更改都会一起更新。运行中容器内的 `openclaw update` 不是同一种操作，因为该镜像以 Docker 构建的 `dist/` 目录树形式提供，没有 `.git` 检出，也没有 npm 管理的全局安装可供其检测；有关 VM 风格安装的该流程，请参见 [Updating](/install/updating)。

### 更新机器命令

要在不完整重新部署的情况下更改启动命令：

```bash
fly machines list
fly machine update <machine-id> --command "node dist/index.js gateway --port 3000 --bind lan" -y

# 或者增加内存
fly machine update <machine-id> --vm-memory 2048 --command "node dist/index.js gateway --port 3000 --bind lan" -y
```

后续的 `fly deploy` 会将机器命令重置回 `fly.toml` 中的内容；在重新部署后需要重新应用手动更改。

## 私有部署（加固）

默认情况下，Fly 会分配公共 IP，因此你的网关可通过 `https://your-app.fly.dev` 访问，并且可被互联网扫描器（Shodan、Censys 等）发现。

使用 `deploy/fly.private.toml` 进行加固部署，不分配 **公共 IP**：它省略了 `[http_service]`，因此不会分配公共入口流量。

### 何时使用私有部署

- 仅发出外呼/消息（不接收入站 webhook）
- 使用 ngrok 或 Tailscale 隧道处理任何 webhook 回调
- 通过 SSH、代理或 WireGuard 访问网关，而不是通过浏览器
- 需要让部署对互联网扫描器隐藏

### 设置

```bash
fly deploy -c deploy/fly.private.toml
```

或者转换现有部署：

```bash
# 列出当前 IP
fly ips list -a my-openclaw

# 释放公共 IP
fly ips release <public-ipv4> -a my-openclaw
fly ips release <public-ipv6> -a my-openclaw

# 切换到私有配置，以便后续部署不会重新分配公共 IP
fly deploy -c deploy/fly.private.toml

# 分配仅私有的 IPv6
fly ips allocate-v6 --private -a my-openclaw
```

完成后，`fly ips list` 应只显示一个 `private` 类型的 IP：

```text
VERSION  IP                   TYPE             REGION
v6       fdaa:x:x:x:x::x      private          global
```

### 访问私有部署

**选项 1：本地代理（最简单）**

```bash
fly proxy 3000:3000 -a my-openclaw
# 在浏览器中打开 http://localhost:3000
```

**选项 2：WireGuard VPN**

```bash
fly wireguard create
# 导入到 WireGuard 客户端，然后通过内部 IPv6 访问
# 示例：http://[fdaa:x:x:x:x::x]:3000
```

**选项 3：仅 SSH**

```bash
fly ssh console -a my-openclaw
```

### 通过私有部署使用 Webhook

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

### 安全权衡

| 方面             | 公共         | 私有       |
| ---------------- | ------------ | ---------- |
| 互联网扫描器     | 可被发现     | 已隐藏     |
| 直接攻击         | 可能         | 已阻止     |
| 控制 UI 访问     | 浏览器       | 代理/VPN   |
| Webhook 交付     | 直接         | 通过隧道   |

## 注意

- Fly.io 使用 x86 架构；该 Dockerfile 同时兼容 x86 和 ARM。
- 对于 WhatsApp/Telegram 入门，请使用 `fly ssh console`。
- 持久化数据存储在 `/data` 挂载的卷上。
- Signal 需要镜像中包含 signal-cli（基于 Java 的 CLI）；请使用自定义镜像，并将内存保持在 2GB 以上。

## 成本

使用推荐配置（`shared-cpu-2x`，2GB RAM）时，预计每月约 $10-15，具体取决于使用情况；免费套餐覆盖一些基础额度。有关当前费率，请参见 [Fly.io 定价](https://fly.io/docs/about/pricing/)。

## 下一步

- 设置消息通道：[Channels](/channels)
- 配置网关：[网关配置](/gateway/configuration)
- 保持 OpenClaw 为最新版本：[更新](/install/updating)

## 相关

- [安装概览](/install)
- [Hetzner](/install/hetzner)
- [Docker](/install/docker)
- [VPS 托管](/vps)
