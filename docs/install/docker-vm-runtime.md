---
summary: "用于长时间运行的 OpenClaw Gateway 主机的共享 Docker VM 运行时步骤"
read_when:
  - 你正在带有 Docker 的云 VM 上部署 OpenClaw
  - 你需要共享二进制文件打包、持久化和更新流程
title: "Docker VM runtime"
---

适用于基于 VM 的 Docker 安装的共享运行时步骤，例如 GCP、Hetzner 和类似的 VPS 提供商。

## 将必要的二进制文件打包进镜像

在运行中的容器内部安装二进制文件是一个陷阱。  
任何在运行时安装的内容都会在重启时丢失。

所有技能所需的外部二进制文件必须在镜像构建时安装。

下面的示例仅展示了三个常见二进制文件：

- `gog` 用于访问 Gmail
- `goplaces` 用于 Google Places
- `wacli` 用于 WhatsApp

这些只是示例，而非完整列表。  
你可以使用相同的模式安装任意多个所需二进制文件。

如果以后添加依赖额外二进制文件的新技能时，必须：

1. 更新 Dockerfile  
2. 重新构建镜像  
3. 重启容器  

**示例 Dockerfile**

```dockerfile
FROM node:24-bookworm

RUN apt-get update && apt-get install -y socat && rm -rf /var/lib/apt/lists/*

# 示例二进制文件 1：Gmail CLI
RUN curl -L https://github.com/steipete/gog/releases/latest/download/gog_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/gog

# 示例二进制文件 2：Google Places CLI
RUN curl -L https://github.com/steipete/goplaces/releases/latest/download/goplaces_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/goplaces

# 示例二进制文件 3：WhatsApp CLI
RUN curl -L https://github.com/steipete/wacli/releases/latest/download/wacli_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/wacli

# 按照相同的模式添加更多二进制文件

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY scripts ./scripts

RUN corepack enable
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build
RUN pnpm ui:install
RUN pnpm ui:build

ENV NODE_ENV=production

CMD ["node","dist/index.js"]
```

<Note>
上面的下载 URL 适用于 x86_64（amd64）。对于基于 ARM 的虚拟机（例如 Hetzner ARM、GCP Tau T2A），请将下载 URL 替换为各工具发布页面上相应的 ARM64 版本。
</Note>

## 构建并启动

```bash
docker compose build
docker compose up -d openclaw-gateway
```

如果构建过程中 `pnpm install --frozen-lockfile` 阶段出现 `Killed` 或者 `exit code 137`，说明虚拟机内存不足。  
请使用更大规格的机器后重试。

验证二进制文件：

```bash
docker compose exec openclaw-gateway which gog
docker compose exec openclaw-gateway which goplaces
docker compose exec openclaw-gateway which wacli
```

预期输出：

```
/usr/local/bin/gog
/usr/local/bin/goplaces
/usr/local/bin/wacli
```

验证 Gateway：

```bash
docker compose logs -f openclaw-gateway
```

预期输出：

```
[gateway] listening on ws://0.0.0.0:18789
```

## 各组件的持久化位置

OpenClaw 运行在 Docker 中，但 Docker 并非数据的真实来源。  
所有长期保存的状态必须能在重启、重建和重启系统后依然保留。

| 组件                | 位置                             | 持久化机制              | 说明                                                          |
| ------------------- | --------------------------------- | ----------------------- | ------------------------------------------------------------- |
| Gateway config      | `/home/node/.openclaw/`           | Host volume mount      | 包含 `openclaw.json`、`.env`                                  |
| Model auth profiles | `/home/node/.openclaw/agents/`    | Host volume mount      | `agents/<agentId>/agent/auth-profiles.json`（OAuth、API keys） |
| Skill configs       | `/home/node/.openclaw/skills/`    | Host volume mount      | 技能级状态                                                    |
| Agent workspace     | `/home/node/.openclaw/workspace/` | Host volume mount      | 代码和 agent 产物                                             |
| WhatsApp session    | `/home/node/.openclaw/`           | Host volume mount      | 保留 QR 登录                                                  |
| Gmail keyring       | `/home/node/.openclaw/`           | Host volume + password | 需要 `GOG_KEYRING_PASSWORD`                                   |
| External binaries   | `/usr/local/bin/`                 | Docker image           | 必须在构建时打包                                             |
| Node runtime        | Container filesystem              | Docker image           | 每次镜像构建都会重新构建                                      |
| OS packages         | Container filesystem              | Docker image           | 不要在运行时安装                                              |
| Docker container    | Ephemeral                         | Restartable            | 可以安全销毁                                                  |

## 更新

在虚拟机上更新 OpenClaw：

```bash
git pull
docker compose build
docker compose up -d
```

## 相关内容

- [Docker](/install/docker)
- [Podman](/install/podman)
- [ClawDock](/install/clawdock)
