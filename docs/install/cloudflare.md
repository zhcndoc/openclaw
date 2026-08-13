---
summary: "使用 Litestream 备份到 R2 的实验性 Cloudflare Worker 和 Container 部署"
title: "Cloudflare Containers"
read_when:
  - 你想在 Cloudflare Containers 上运行 OpenClaw
  - 你正在评估由 R2 支持的临时 Container SQLite 恢复
  - 你需要在 webhook 缩容至零和始终运行的频道之间进行选择
---

在一个 Cloudflare Worker 和一个命名的 Durable Object 后运行一个 OpenClaw 安装实例，使用官方 OpenClaw 镜像，并通过 Litestream 将数据复制到 R2。

<Warning>
  此部署目标为实验性功能。Litestream 保护的是 SQLite 数据库，而不是完整的 OpenClaw 状态目录。在使用生产凭据前，请阅读[限制和恢复](#limits-and-recovery)。
</Warning>

## 你需要什么

- 一个可使用 Workers、Containers 和 R2 的 Cloudflare 账户
- 支持 `linux/amd64` 的 Docker Buildx
- 一个公开的 Docker Hub 派生镜像仓库
- Node.js 和 npm
- OpenClaw 设置所需的 Provider 和频道凭据

模板位于 [`scripts/cloudflare`](https://github.com/openclaw/openclaw/tree/main/scripts/cloudflare)。它会部署一个 `standard-2` Container，并设置 `max_instances: 1`。

## 工作原理

Worker 将每个 HTTP 和 WebSocket 请求转发到一个稳定的 Durable Object 名称。该 Durable Object 拥有一个 Container 实例，并作为 Litestream 副本周围的单写入隔离屏障。Container 在端口 `8080` 上公开 OpenClaw；`/startupz` 是其流量就绪检查端点。

Litestream 会监视两个 SQLite 根目录：

- `/home/node/.openclaw/state/*.sqlite`
- `/home/node/.openclaw/agents/**/*.sqlite`

启动时，入口点使用 R2 的 S3 `ListObjectsV2` API 作为恢复清单，拒绝位于这些根目录之外的路径，恢复每个发现的数据库，然后才启动 Gateway。

## 部署

<Steps>
  <Step title="准备模板">
    克隆 OpenClaw 并进入模板目录：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw/scripts/cloudflare
    npm install
    npx wrangler login
    npx wrangler whoami
    ```

    在创建资源前，确认 Wrangler 选择的是目标 Cloudflare 账户。

  </Step>

  <Step title="创建 R2 存储">
    创建存储桶：

    ```bash
    npx wrangler r2 bucket create openclaw-backups
    ```

    在 Cloudflare 控制面板中，创建一个具有对象读写权限且仅限于该存储桶的 R2 API 令牌。不要将访问密钥 ID 和秘密访问密钥保存在 checkout 中。

    在 `wrangler.jsonc` 中，将 endpoint 里的 `<account-id>` 替换为实际值。如果使用其他存储桶名称，请同时更新 `LITESTREAM_BUCKET` 和 `r2_buckets[].bucket_name`。

    R2 binding 用于 Worker 侧访问和文档完整性。Litestream 无法在 Container 内使用 Worker binding；它使用 R2 的 S3 endpoint，以及通过 Worker secrets 传入的凭据。

  </Step>

  <Step title="发布 Container 镜像">
    将 `Dockerfile` 中的 `<official-openclaw-image-digest>` 替换为官方 [`openclaw/openclaw`](https://hub.docker.com/r/openclaw/openclaw) Docker Hub 仓库中的不可变 digest。

    为 Cloudflare 所需的架构构建派生镜像，并将其推送到公开的 Docker Hub 仓库：

    ```bash
    docker buildx build \
      --platform linux/amd64 \
      --tag docker.io/<docker-hub-user>/openclaw-cloudflare:<version> \
      --push \
      .
    docker buildx imagetools inspect \
      docker.io/<docker-hub-user>/openclaw-cloudflare:<version>
    ```

    将 `wrangler.jsonc` 中 `containers[].image` 的占位符替换为生成的不可变 `docker.io/...@sha256:...` 引用。Cloudflare Containers 可以直接拉取公开的 Docker Hub 镜像；GHCR 不是此模板支持的来源。

  </Step>

  <Step title="部署 Worker 和 Container">
    编译 Worker 并进行部署：

    ```bash
    npm run check
    npm run deploy
    ```

    首次部署会创建 Worker、由 SQLite 支持的 Durable Object 类、Container 应用和 R2 binding。

  </Step>

  <Step title="设置运行时 secrets">
    通过 Wrangler 的 secret 提示添加 R2 和 Gateway 凭据：

    ```bash
    npx wrangler secret put LITESTREAM_ACCESS_KEY_ID
    npx wrangler secret put LITESTREAM_SECRET_ACCESS_KEY
    npx wrangler secret put OPENCLAW_GATEWAY_TOKEN
    ```

    根据需要添加 Provider 和频道变量。例如：

    ```bash
    npx wrangler secret put OPENAI_API_KEY
    npx wrangler secret put TELEGRAM_BOT_TOKEN
    ```

    `src/container.ts` 会将一个明确的环境变量 allowlist 传递给 Container。在使用其他由环境变量提供的凭据前，请先在那里添加对应名称。

  </Step>

  <Step title="引导 OpenClaw">
    首次启动需要在 Container 内进行一次交互式会话。SSH 访问默认禁用；将以下内容添加到 `wrangler.jsonc` 中的 Container 条目，以临时启用 SSH，然后重新部署：

    ```jsonc
    "ssh": { "enabled": true }
    ```

    打开已部署的 Worker URL 一次以启动实例。然后找到应用和实例 ID 并进行连接：

    ```bash
    npx wrangler containers list
    npx wrangler containers instances <application-id> --json
    npx wrangler containers ssh <instance-id>
    ```

    SSH 由 wrangler 介导，仅限拥有 Container 写入权限的账户使用。引导完成后，可以移除 `ssh` 区块并重新部署；恢复的状态会通过 Litestream 在替换后继续保留。

    在 Container 内，运行基于 SecretRef 的设置。此示例使用 OpenAI 和 Telegram：

    ```bash
    cd /app
    node openclaw.mjs onboard --non-interactive --accept-risk --skip-health \
      --mode local \
      --auth-choice openai-api-key \
      --secret-input-mode ref \
      --gateway-auth token \
      --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN \
      --skip-channels \
      --no-install-daemon
    node openclaw.mjs channels add --channel telegram --use-env
    node openclaw.mjs doctor --json
    ```

    将确切的引导步骤保存在私有且可复现的运行手册中。全新的 Container 磁盘不会保留生成的配置。

  </Step>
</Steps>

## 选择生命周期模式

`OPENCLAW_WEBHOOK_ONLY` 默认为 `false`，这会使 Container 在空闲期间保持运行。对于维护 socket 或长期运行进程的频道，请保留此默认值，包括：

- Discord
- Slack Socket Mode
- WhatsApp

仅当所有启用的频道都通过 HTTP webhook 接收流量时，才将 `OPENCLAW_WEBHOOK_ONLY` 设置为 `true`。在此模式下，Container 会在空闲十分钟后停止，并在下一个请求到达时冷启动。

<Warning>
  缩容至零会从全新的磁盘启动。只有在外部进程能够重新应用声明式引导时才启用此功能。Litestream 可以恢复 SQLite，但无法重新创建 `openclaw.json`、凭据文件、已安装的插件或工作区。
</Warning>

## 限制和恢复

- **单写入者：**每个请求都会解析到同一个 Durable Object 名称，Cloudflare 会为该名称运行一个活动的 Durable Object 实例。不要增加 `max_instances`，也不要引入绕过此隔离屏障的备用路由。在平台替换或发布期间短暂出现新旧 Container 重叠，是可接受的实验性权衡。
- **恢复点：**一秒的 Litestream 同步间隔通常会产生秒级 RPO。这不是同步复制，突然终止可能会导致尚未到达 R2 的写入丢失。
- **临时磁盘：**每次休眠、替换或主机重启都会从镜像以及已恢复的 SQLite 数据库开始。对于配置、凭据文件、插件文件和工作区，请使用[完整 OpenClaw 归档](/install/backups#full-archives)。
- **回滚：**较旧的数据库字节相当于时间旅行。递增更新的频道凭据，尤其是 WhatsApp 的凭据，可能会导致不同步；审批以及投递／去重状态也会回滚。重新关联受影响的频道，并在恢复之前检查待处理的审批。请参阅[恢复](/install/backups#restore)。
- **WebSockets：**Worker 和 Container 代理支持 WebSockets。Cloudflare 将每条接收的 WebSocket 消息限制为 32 MiB。
- **出口流量：**出站请求使用共享的 Cloudflare IP 地址空间。此目标不提供固定的出口地址。
- **Provider 边界：**这是一个部署模板，而不是 OpenClaw 的 `cloudWorkers` Provider。其操作员 SSH 访问并未实现该 Provider 的 SSH 执行契约。

## 更新

从新的不可变官方 OpenClaw digest 构建新的派生镜像，将其推送，然后更新 `wrangler.jsonc` 中的派生 digest 并进行部署：

```bash
npm run check
npm run deploy
```

先针对单独的 R2 存储桶测试更新和回滚。在激活较旧字节前，保留当前状态。

## 相关内容

- [备份](/install/backups)
- [Docker](/install/docker)
- [Gateway 安全](/gateway/security)
- [Secrets 管理](/gateway/secrets)
