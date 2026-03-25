---
title: Fly.io
summary: "Step-by-step Fly.io deployment for OpenClaw with persistent storage and HTTPS"
read_when:
  - 在 Fly.io 上部署 OpenClaw
  - 设置 Fly 卷、秘密和首次运行配置
---

# Fly.io 部署

**目标:** 让 OpenClaw 网关运行在 [Fly.io](https://fly.io) 机器上，具备持久存储、自动 HTTPS 以及 Discord/频道访问功能。

## 所需条件

- 安装 [flyctl CLI](https://fly.io/docs/hands-on/install-flyctl/)
- Fly.io 账号（免费套餐可用）
- 模型授权：所选模型提供商的 API 密钥
- 频道凭证：Discord 机器人令牌、Telegram 令牌等

## 新手快速路径

1. 克隆仓库 → 定制 `fly.toml`
2. 创建应用 + 卷 → 设置秘密
3. 使用 `fly deploy` 部署
4. SSH 登录创建配置或使用控制界面

<Steps>
  <Step title="Create the Fly app">
    ```bash
    # Clone the repo
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw

    # Create a new Fly app (pick your own name)
    fly apps create my-openclaw

    # Create a persistent volume (1GB is usually enough)
    fly volumes create openclaw_data --size 1 --region iad
    ```

    **Tip:** Choose a region close to you. Common options: `lhr` (London), `iad` (Virginia), `sjc` (San Jose).

  </Step>

  <Step title="Configure fly.toml">
    Edit `fly.toml` to match your app name and requirements.

    **Security note:** The default config exposes a public URL. For a hardened deployment with no public IP, see [Private Deployment](#private-deployment-hardened) or use `fly.private.toml`.

    ```toml
    app = "my-openclaw"  # Your app name
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

    **Key settings:**

    | Setting                        | Why                                                                         |
    | ------------------------------ | --------------------------------------------------------------------------- |
    | `--bind lan`                   | Binds to `0.0.0.0` so Fly's proxy can reach the gateway                     |
    | `--allow-unconfigured`         | Starts without a config file (you'll create one after)                      |
    | `internal_port = 3000`         | Must match `--port 3000` (or `OPENCLAW_GATEWAY_PORT`) for Fly health checks |
    | `memory = "2048mb"`            | 512MB is too small; 2GB recommended                                         |
    | `OPENCLAW_STATE_DIR = "/data"` | Persists state on the volume                                                |

  </Step>

  <Step title="Set secrets">
    ```bash
    # Required: Gateway token (for non-loopback binding)
    fly secrets set OPENCLAW_GATEWAY_TOKEN=$(openssl rand -hex 32)

    # Model provider API keys
    fly secrets set ANTHROPIC_API_KEY=sk-ant-...

    # Optional: Other providers
    fly secrets set OPENAI_API_KEY=sk-...
    fly secrets set GOOGLE_API_KEY=...

    # Channel tokens
    fly secrets set DISCORD_BOT_TOKEN=MTQ...
    ```

    **Notes:**

    - Non-loopback binds (`--bind lan`) require `OPENCLAW_GATEWAY_TOKEN` for security.
    - Treat these tokens like passwords.
    - **Prefer env vars over config file** for all API keys and tokens. This keeps secrets out of `openclaw.json` where they could be accidentally exposed or logged.

  </Step>

  <Step title="Deploy">
    ```bash
    fly deploy
    ```

    First deploy builds the Docker image (~2-3 minutes). Subsequent deploys are faster.

    After deployment, verify:

    ```bash
    fly status
    fly logs
    ```

    You should see:

    ```
    [gateway] listening on ws://0.0.0.0:3000 (PID xxx)
    [discord] logged in to discord as xxx
    ```

  </Step>

  <Step title="Create config file">
    SSH into the machine to create a proper config:

    ```bash
    fly ssh console
    ```

    Create the config directory and file:

    ```bash
    mkdir -p /data
    cat > /data/openclaw.json << 'EOF'
    {
      "agents": {
        "defaults": {
          "model": {
            "primary": "anthropic/claude-opus-4-6",
            "fallbacks": ["anthropic/claude-sonnet-4-6", "openai/gpt-4o"]
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
        "bind": "auto"
      },
      "meta": {}
    }
    EOF
    ```

    **Note:** With `OPENCLAW_STATE_DIR=/data`, the config path is `/data/openclaw.json`.

    **Note:** The Discord token can come from either:

    - Environment variable: `DISCORD_BOT_TOKEN` (recommended for secrets)
    - Config file: `channels.discord.token`

    If using env var, no need to add token to config. The gateway reads `DISCORD_BOT_TOKEN` automatically.

    Restart to apply:

    ```bash
    exit
    fly machine restart <machine-id>
    ```

  </Step>

  <Step title="Access the Gateway">
    ### Control UI

    Open in browser:

    ```bash
    fly open
    ```

    Or visit `https://my-openclaw.fly.dev/`

    Paste your gateway token (the one from `OPENCLAW_GATEWAY_TOKEN`) to authenticate.

    ### Logs

    ```bash
    fly logs              # Live logs
    fly logs --no-tail    # Recent logs
    ```

    ### SSH Console

    ```bash
    fly ssh console
    ```

  </Step>
</Steps>

## 故障排查

### “App 未监听预期地址”

网关绑定到 `127.0.0.1`，而非 `0.0.0.0`。

**修复:** 在 `fly.toml` 里的进程命令加上 `--bind lan`。

### 健康检查失败 / 连接被拒绝

Fly 无法访问网关配置的端口。

**修复:** 确认 `internal_port` 与网关端口一致（设置 `--port 3000` 或 `OPENCLAW_GATEWAY_PORT=3000`）。

### 内存不足 / OOM 问题

容器不断重启或被杀，表现为 `SIGABRT`、`v8::internal::Runtime_AllocateInYoungGeneration` 错误或无故重启。

**修复:** 在 `fly.toml` 增加内存配置：

```toml
[[vm]]
  memory = "2048mb"
```

或更新现有机器：

```bash
fly machine update <machine-id> --vm-memory 2048 -y
```

**说明:** 512MB 过小，1GB 可能勉强可用，但高负载或详细日志可能导致 OOM。**推荐使用 2GB。**

### 网关锁文件问题

网关启动报“已运行”错误。

原因：容器重启时 PID 锁文件仍存在卷上。

**修复:** 删除锁文件：

```bash
fly ssh console --command "rm -f /data/gateway.*.lock"
fly machine restart <machine-id>
```

锁文件位置为 `/data/gateway.*.lock`（非子目录）。

### 配置未被读取

启用 `--allow-unconfigured` 时，网关生成最简配置。自定义配置应位于 `/data/openclaw.json`，重启后读取。

确认配置文件存在：

```bash
fly ssh console --command "cat /data/openclaw.json"
```

### 通过 SSH 写入配置

`fly ssh console -C` 不支持 shell 重定向。写配置文件的方法：

```bash
# 本地 echo + 远程 tee（管道写入）
echo '{"your":"config"}' | fly ssh console -C "tee /data/openclaw.json"

# 或使用 sftp
fly sftp shell
> put /local/path/config.json /data/openclaw.json
```

**注意:** 如果文件已存在，`fly sftp` 可能失败，先删掉：

```bash
fly ssh console --command "rm /data/openclaw.json"
```

### 状态未持久化

重启后丢失凭证或会话，可能是状态目录写入了容器文件系统。

**修复:** 确保在 `fly.toml` 中设置 `OPENCLAW_STATE_DIR=/data` 并重新部署。

## 更新

```bash
# 拉取最新代码
git pull

# 重新部署
fly deploy

# 查看状态
fly status
fly logs
```

### 更新机器命令

如需修改启动命令，无需完整重部署：

```bash
# 获取机器 ID
fly machines list

# 更新命令
fly machine update <machine-id> --command "node dist/index.js gateway --port 3000 --bind lan" -y

# 或同时增加内存
fly machine update <machine-id> --vm-memory 2048 --command "node dist/index.js gateway --port 3000 --bind lan" -y
```

**注意:** `fly deploy` 会重置机器命令为 `fly.toml` 内定义。若手动修改，请部署后重新应用。

## 私有部署（加固版）

默认情况下，Fly 会分配公网 IP，使网关通过 `https://your-app.fly.dev` 访问。这方便但导致部署可被互联网扫描器（Shodan、Censys 等）发现。

如需加固且**无公网暴露**，请使用私有配置模板。

### 何时使用私有部署

- 仅进行**出站**呼叫/消息（无入站 webhook）
- 使用 **ngrok 或 Tailscale** 隧道处理 webhook 回调
- 通过 **SSH、代理或 WireGuard** 访问网关，而非浏览器直连
- 希望部署**隐藏于互联网扫描器外**

### 设置方法

使用 `fly.private.toml` 替代标准配置：

```bash
# 使用私有配置部署
fly deploy -c fly.private.toml
```

或将现有部署转为私有：

```bash
# 查看当前 IP
fly ips list -a my-openclaw

# 释放公网 IP
fly ips release <public-ipv4> -a my-openclaw
fly ips release <public-ipv6> -a my-openclaw

# 切换为私有配置，避免未来部署重新分配公网 IP
# （移除 [http_service] 或使用私有模板部署）
fly deploy -c fly.private.toml

# 分配仅私有 IPv6
fly ips allocate-v6 --private -a my-openclaw
```

完成后，`fly ips list` 显示仅`private`类型 IP：

```
VERSION  IP                   TYPE             REGION
v6       fdaa:x:x:x:x::x      private          global
```

### 访问私有部署

因无公网 URL，使用以下方式：

**选项 1：本地代理（最简单）**

```bash
# 转发本地 3000 端口到应用
fly proxy 3000:3000 -a my-openclaw

# 然后浏览器访问 http://localhost:3000
```

**选项 2：WireGuard VPN**

```bash
# 创建 WireGuard 配置（只需一次）
fly wireguard create

# 导入到 WireGuard 客户端，然后通过内部 IPv6 访问
# 示例：http://[fdaa:x:x:x:x::x]:3000
```

**选项 3：仅 SSH 访问**

```bash
fly ssh console -a my-openclaw
```

### 私有部署下的 Webhook

若需使用 webhook 回调（如 Twilio、Telnyx 等），且不暴露公网：

1. **ngrok 隧道** - 在容器内或作为 sidecar 运行 ngrok
2. **Tailscale Funnel** - 通过 Tailscale 暴露特定路径
3. **仅出站调用** - 某些服务（如 Twilio）支持无 webhook 的出站呼叫

示例使用 ngrok 的语音通话配置：

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

ngrok 隧道在容器内部运行，提供了公共 webhook URL，但不暴露 Fly 应用本身。将 `webhookSecurity.allowedHosts` 设置为公用隧道主机名，确保转发的 Host 头被接受。

### 安全优势

| 方面            | 公开部署      | 私有部署       |
| --------------- | ----------- | ------------- |
| 互联网扫描器    | 可被发现     | 隐藏           |
| 直接攻击        | 可能        | 阻止           |
| 控制界面访问    | 浏览器      | 代理/VPN      |
| Webhook 传递   | 直接        | 通过隧道      |

## 说明

- Fly.io 使用 **x86 架构**（非 ARM）
- Dockerfile 支持两种架构
- WhatsApp/Telegram 初始化时可用 `fly ssh console`
- 持久数据存放于卷的 `/data`
- Signal 需 Java 和 signal-cli，使用自定义镜像并保持 2GB 及以上内存

## 费用

推荐配置（`shared-cpu-2x`，2GB 内存）：

- 约 10-15 美元/月，依使用情况而定
- 免费套餐含部分额度

See [Fly.io pricing](https://fly.io/docs/about/pricing/) for details.

## Next steps

- Set up messaging channels: [Channels](/channels)
- Configure the Gateway: [Gateway configuration](/gateway/configuration)
- Keep OpenClaw up to date: [Updating](/install/updating)
