---
summary: "在 Fly.io 上分步部署 OpenClaw，包含持久化存储和 HTTPS"
title: Fly.io
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
  <Step title="创建 Fly 应用">
    ```bash
    # 克隆仓库
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw

    # 创建新的 Fly 应用（自行选择名称）
    fly apps create my-openclaw

    # 创建持久卷（通常 1GB 就足够）
    fly volumes create openclaw_data --size 1 --region iad
    ```

    **提示:** 选择一个离你较近的区域。常见选项：`lhr`（伦敦）、`iad`（弗吉尼亚）、`sjc`（圣何塞）。

  </Step>

  <Step title="配置 fly.toml">
    编辑 `fly.toml` 以匹配你的应用名称和需求。

    **安全提示:** 默认配置会暴露一个公共 URL。若要进行无公共 IP 的加固部署，请参阅 [私有部署](#private-deployment-hardened) 或使用 `fly.private.toml`。

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

    **关键设置：**

    | Setting                        | 为什么                                                                         |
    | ------------------------------ | --------------------------------------------------------------------------- |
    | `--bind lan`                   | 绑定到 `0.0.0.0`，以便 Fly 的代理可以访问网关                     |
    | `--allow-unconfigured`         | 在没有配置文件的情况下启动（你之后会创建一个）                      |
    | `internal_port = 3000`         | 必须与 `--port 3000`（或 `OPENCLAW_GATEWAY_PORT`）一致，供 Fly 健康检查使用 |
    | `memory = "2048mb"`            | 512MB 太小；建议 2GB                                         |
    | `OPENCLAW_STATE_DIR = "/data"` | 将状态持久化到卷上                                                |

  </Step>

  <Step title="设置秘密">
    ```bash
    # 必需：网关令牌（用于非 loopback 绑定）
    fly secrets set OPENCLAW_GATEWAY_TOKEN=$(openssl rand -hex 32)

    # 模型提供商 API 密钥
    fly secrets set ANTHROPIC_API_KEY=sk-ant-...

    # 可选：其他提供商
    fly secrets set OPENAI_API_KEY=sk-...
    fly secrets set GOOGLE_API_KEY=...

    # 频道令牌
    fly secrets set DISCORD_BOT_TOKEN=MTQ...
    ```

    **说明：**

    - 非 loopback 绑定（`--bind lan`）需要有效的网关认证路径。这个 Fly.io 示例使用 `OPENCLAW_GATEWAY_TOKEN`，但 `gateway.auth.password` 或正确配置的非 loopback `trusted-proxy` 部署也同样满足要求。
    - 将这些令牌视为密码。
    - 对于所有 API 密钥和令牌，**优先使用环境变量而不是配置文件**。这样可以避免将秘密放入 `openclaw.json` 中，防止意外暴露或记录到日志里。

  </Step>

  <Step title="部署">
    ```bash
    fly deploy
    ```

    首次部署会构建 Docker 镜像（约 2-3 分钟）。后续部署会更快。

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
    SSH 登录机器以创建正确的配置：

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
        "bind": "auto"
      },
      "meta": {}
    }
    EOF
    ```

    **注意:** 使用 `OPENCLAW_STATE_DIR=/data` 时，配置路径为 `/data/openclaw.json`。

    **注意:** Discord 令牌可以来自以下任一方式：

    - 环境变量：`DISCORD_BOT_TOKEN`（建议用于秘密）
    - 配置文件：`channels.discord.token`

    如果使用环境变量，则无需将令牌添加到配置中。网关会自动读取 `DISCORD_BOT_TOKEN`。

    重启以应用更改：

    ```bash
    exit
    fly machine restart <machine-id>
    ```

  </Step>

  <Step title="访问网关">
    ### 控制界面

    在浏览器中打开：

    ```bash
    fly open
    ```

    或访问 `https://my-openclaw.fly.dev/`

    使用已配置的共享密钥进行身份验证。本指南使用来自 `OPENCLAW_GATEWAY_TOKEN` 的网关令牌；如果你改用了密码认证，请改用那个密码。

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

### Gateway lock issues

网关启动报“已运行”错误。

原因：容器重启时 PID 锁文件仍存在卷上。

**修复:** 删除锁文件：

```bash
fly ssh console --command "rm -f /data/gateway.*.lock"
fly machine restart <machine-id>
```

锁文件位置为 `/data/gateway.*.lock`（非子目录）。

### Config not being read

`--allow-unconfigured` 只是绕过启动保护。它不会创建或修复 `/data/openclaw.json`，因此请确保真实配置存在，并且在你希望正常本地网关启动时包含 `gateway.mode="local"`。

确认配置文件存在：

```bash
fly ssh console --command "cat /data/openclaw.json"
```

### Writing config via SSH

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

### State not persisting

如果你在重启后丢失了认证配置文件、频道/提供商状态或会话，
说明状态目录正在写入容器文件系统。

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

### Updating machine command

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

## Private deployment (hardened)

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

有关详细信息，请参阅 [Fly.io 定价](https://fly.io/docs/about/pricing/)。

## 下一步

- 设置消息渠道：[Channels](/channels)
- 配置网关：[Gateway configuration](/gateway/configuration)
- 保持 OpenClaw 为最新版本：[Updating](/install/updating)

## 相关

- [安装概览](/install)
- [Hetzner](/install/hetzner)
- [Docker](/install/docker)
- [VPS 托管](/vps)
