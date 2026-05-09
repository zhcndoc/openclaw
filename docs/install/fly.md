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

1. 克隆仓库 → 自定义 `fly.toml`
2. 创建应用 + 卷 → 设置密钥
3. 使用 `fly deploy` 部署
4. 通过 SSH 登录创建配置，或使用 Control UI

<Steps>
  <Step title="创建 Fly 应用">
    ```bash
    # 克隆仓库
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw

    # 创建一个新的 Fly 应用（自行选择名称）
    fly apps create my-openclaw

    # 创建一个持久化卷（1GB 通常就足够）
    fly volumes create openclaw_data --size 1 --region iad
    ```

    **提示：** 选择一个离你较近的区域。常见选项：`lhr`（伦敦）、`iad`（弗吉尼亚）、`sjc`（圣何塞）。

  </Step>

  <Step title="配置 fly.toml">
    编辑 `fly.toml` 以匹配你的应用名称和需求。

    **安全说明：** 默认配置会暴露一个公共 URL。若要进行无公网 IP 的加固部署，请参见 [Private Deployment](#private-deployment-hardened) 或使用 `deploy/fly.private.toml`。

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

    OpenClaw Docker 镜像使用 `tini` 作为 entrypoint。Fly 的进程命令会替换 Docker 的 `CMD`，但不会替换 `ENTRYPOINT`，因此进程仍然会在 `tini` 下运行。

    **关键设置：**

    | 设置                           | 为什么                                                                        |
    | ------------------------------ | ----------------------------------------------------------------------------- |
    | `--bind lan`                   | 绑定到 `0.0.0.0`，这样 Fly 的代理才能访问该 gateway                          |
    | `--allow-unconfigured`         | 在没有配置文件的情况下启动（你之后会创建一个）                                 |
    | `internal_port = 3000`         | 必须与 `--port 3000`（或 `OPENCLAW_GATEWAY_PORT`）一致，供 Fly 健康检查使用 |
    | `memory = "2048mb"`            | 512MB 太小；推荐 2GB                                                          |
    | `OPENCLAW_STATE_DIR = "/data"` | 将状态持久化到卷上                                                             |

  </Step>

  <Step title="设置密钥">
    ```bash
    # 必需：Gateway token（用于非 loopback 绑定）
    fly secrets set OPENCLAW_GATEWAY_TOKEN=$(openssl rand -hex 32)

    # 模型提供商 API keys
    fly secrets set ANTHROPIC_API_KEY=sk-ant-...

    # 可选：其他提供商
    fly secrets set OPENAI_API_KEY=sk-...
    fly secrets set GOOGLE_API_KEY=...

    # 频道 token
    fly secrets set DISCORD_BOT_TOKEN=MTQ...
    ```

    **说明：**

    - 非 loopback 绑定（`--bind lan`）需要有效的 gateway 认证路径。此 Fly.io 示例使用 `OPENCLAW_GATEWAY_TOKEN`，但 `gateway.auth.password` 或一个正确配置的非 loopback `trusted-proxy` 部署同样可以满足要求。
    - 将这些 token 当作密码一样对待。
    - **所有 API key 和 token 都优先使用环境变量，而不是配置文件。** 这样可以避免 secret 出现在 `openclaw.json` 中，从而被意外暴露或记录。

  </Step>

  <Step title="部署">
    ```bash
    fly deploy
    ```

    第一次部署会构建 Docker 镜像（约 2-3 分钟）。后续部署会更快。

    部署完成后，验证：

    ```bash
    fly status
    fly logs
    ```

    你应该会看到：

    ```
    [gateway] listening on ws://0.0.0.0:3000 (PID xxx)
    [discord] logged in to discord as xxx
    ```

  </Step>

  <Step title="创建配置文件">
    通过 SSH 登录到机器以创建正确的配置：

    ```bash
    fly ssh console
    ```

    创建配置目录和文件：

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

    **注意：** 使用 `OPENCLAW_STATE_DIR=/data` 时，配置路径为 `/data/openclaw.json`。

    **注意：** 将 `https://my-openclaw.fly.dev` 替换为你真实的 Fly 应用
    origin。Gateway 启动时会根据运行时的
    `--bind` 和 `--port` 值预置本地 Control UI 的 origin，因此首次启动
    可以在配置文件尚不存在时继续进行，但通过 Fly 的浏览器访问仍然需要
    在 `gateway.controlUi.allowedOrigins` 中列出准确的 HTTPS origin。

    **注意：** Discord token 可以来自以下任一方式：

    - 环境变量：`DISCORD_BOT_TOKEN`（推荐用于 secret）
    - 配置文件：`channels.discord.token`

    如果使用环境变量，就无需把 token 加入配置文件。gateway 会自动读取 `DISCORD_BOT_TOKEN`。

    重启以应用更改：

    ```bash
    exit
    fly machine restart <machine-id>
    ```

  </Step>

  <Step title="访问 Gateway">
    ### Control UI

    在浏览器中打开：

    ```bash
    fly open
    ```

    或访问 `https://my-openclaw.fly.dev/`

    使用已配置的共享密钥进行认证。本指南使用来自 `OPENCLAW_GATEWAY_TOKEN` 的 gateway
    token；如果你改用密码认证，则使用
    该密码。

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

**解决：** 在 `fly.toml` 的进程命令中添加 `--bind lan`。

### 健康检查失败 / connection refused

Fly 无法通过配置的端口连接到 gateway。

**解决：** 确保 `internal_port` 与 gateway 端口一致（设置 `--port 3000` 或 `OPENCLAW_GATEWAY_PORT=3000`）。

### OOM / 内存问题

容器一直重启或被杀死。表现：`SIGABRT`、`v8::internal::Runtime_AllocateInYoungGeneration`，或者静默重启。

**解决：** 在 `fly.toml` 中增加内存：

```toml
[[vm]]
  memory = "2048mb"
```

或者更新已有机器：

```bash
fly machine update <machine-id> --vm-memory 2048 -y
```

**注意：** 512MB 太小。1GB 可能可以运行，但在负载较高或日志较详细时可能会 OOM。**推荐 2GB。**

### Gateway 锁问题

gateway 因 “already running” 错误拒绝启动。

当容器重启但 PID 锁文件仍保留在卷上时，就会发生这种情况。

**解决：** 删除锁文件：

```bash
fly ssh console --command "rm -f /data/gateway.*.lock"
fly machine restart <machine-id>
```

锁文件位于 `/data/gateway.*.lock`（不在子目录中）。

### 配置未被读取

`--allow-unconfigured` 只会绕过启动保护检查。它不会创建或修复 `/data/openclaw.json`，因此请确保你的真实配置存在，并且在你希望正常以本地 gateway 启动时包含 `gateway.mode="local"`。

验证配置是否存在：

```bash
fly ssh console --command "cat /data/openclaw.json"
```

### 通过 SSH 写入配置

`fly ssh console -C` 命令不支持 shell 重定向。要写入配置文件：

```bash
# 使用 echo + tee（从本地通过管道传到远端）
echo '{"your":"config"}' | fly ssh console -C "tee /data/openclaw.json"

# 或使用 sftp
fly sftp shell
> put /local/path/config.json /data/openclaw.json
```

**注意：** 如果文件已存在，`fly sftp` 可能会失败。请先删除：

```bash
fly ssh console --command "rm /data/openclaw.json"
```

### 状态未持久化

如果重启后丢失 auth profiles、频道/提供商状态或会话，
说明 state dir 正在写入容器文件系统。

**解决：** 确保在 `fly.toml` 中设置了 `OPENCLAW_STATE_DIR=/data` 并重新部署。

## 更新

```bash
# 拉取最新更改
git pull

# 重新部署
fly deploy

# 检查健康状态
fly status
fly logs
```

### 更新机器命令

如果你需要在不完整重新部署的情况下更改启动命令：

```bash
# 获取机器 ID
fly machines list

# 更新命令
fly machine update <machine-id> --command "node dist/index.js gateway --port 3000 --bind lan" -y

# 或同时增加内存
fly machine update <machine-id> --vm-memory 2048 --command "node dist/index.js gateway --port 3000 --bind lan" -y
```

**注意：** 在 `fly deploy` 之后，机器命令可能会重置为 `fly.toml` 中的内容。如果你做过手动修改，请在部署后重新应用。

## 私有部署（加固）

默认情况下，Fly 会分配公共 IP，使你的网关可通过 `https://your-app.fly.dev` 访问。这很方便，但也意味着你的部署会被互联网扫描器（Shodan、Censys 等）发现。

若要进行**无公网暴露**的加固部署，请使用私有模板。

### 何时使用私有部署

- 你只进行**出站**调用/消息发送（不接收入站 webhook）
- 你使用 **ngrok 或 Tailscale** 隧道来处理任何 webhook 回调
- 你通过 **SSH、代理或 WireGuard** 访问网关，而不是浏览器
- 你希望部署对互联网扫描器**隐藏**

### 设置

使用 `deploy/fly.private.toml` 替代标准配置：

```bash
# 使用私有配置部署
fly deploy -c deploy/fly.private.toml
```

或者转换现有部署：

```bash
# 列出当前 IP
fly ips list -a my-openclaw

# 释放公共 IP
fly ips release <public-ipv4> -a my-openclaw
fly ips release <public-ipv6> -a my-openclaw

# 切换到私有配置，使后续部署不再重新分配公共 IP
# （移除 [http_service] 或使用私有模板部署）
fly deploy -c deploy/fly.private.toml

# 分配仅私有的 IPv6
fly ips allocate-v6 --private -a my-openclaw
```

完成后，`fly ips list` 应只显示一个 `private` 类型的 IP：

```
VERSION  IP                   TYPE             REGION
v6       fdaa:x:x:x:x::x      private          global
```

### 访问私有部署

由于没有公共 URL，请使用以下方法之一：

**选项 1：本地代理（最简单）**

```bash
# 将本地 3000 端口转发到应用
fly proxy 3000:3000 -a my-openclaw

# 然后在浏览器中打开 http://localhost:3000
```

**选项 2：WireGuard VPN**

```bash
# 创建 WireGuard 配置（一次性）
fly wireguard create

# 导入到 WireGuard 客户端，然后通过内部 IPv6 访问
# 示例：http://[fdaa:x:x:x:x::x]:3000
```

**选项 3：仅 SSH**

```bash
fly ssh console -a my-openclaw
```

### 通过私有部署使用 Webhook

如果你需要 webhook 回调（Twilio、Telnyx 等）但又不想公开暴露：

1. **ngrok 隧道** - 在容器内或作为 sidecar 运行 ngrok
2. **Tailscale Funnel** - 通过 Tailscale 暴露特定路径
3. **仅出站** - 某些提供商（如 Twilio）在不使用 webhook 的情况下也可以正常进行出站调用

使用 ngrok 的语音通话配置示例：

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

ngrok 隧道在容器内运行，并提供一个公共 webhook URL，而不会暴露 Fly 应用本身。将 `webhookSecurity.allowedHosts` 设置为公共隧道主机名，以便接受转发的 host 头。

### 安全优势

| 方面             | 公共         | 私有       |
| ---------------- | ------------ | ---------- |
| 互联网扫描器     | 可被发现     | 已隐藏     |
| 直接攻击         | 可能         | 已阻止     |
| 控制 UI 访问     | 浏览器       | 代理/VPN   |
| Webhook 交付     | 直接         | 通过隧道   |

## 注意

- Fly.io 使用 **x86 架构**（不是 ARM）
- Dockerfile 与两种架构都兼容
- 对于 WhatsApp/Telegram 入门设置，请使用 `fly ssh console`
- 持久化数据保存在 `/data` 的卷中
- Signal 需要 Java + signal-cli；请使用自定义镜像，并将内存保持在 2GB 以上。

## 成本

使用推荐配置（`shared-cpu-2x`，2GB RAM）：

- 每月约 ~$10-15，具体取决于使用情况
- 免费套餐包含一定额度

详情请参阅 [Fly.io 定价](https://fly.io/docs/about/pricing/)。

## 下一步

- 设置消息通道：[Channels](/channels)
- 配置网关：[Gateway configuration](/gateway/configuration)
- 保持 OpenClaw 为最新版本：[Updating](/install/updating)

## 相关

- [安装概览](/install)
- [Hetzner](/install/hetzner)
- [Docker](/install/docker)
- [VPS 托管](/vps)
