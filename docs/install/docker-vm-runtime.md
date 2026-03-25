---
summary: "用于长时间运行的 OpenClaw Gateway 主机的共享 Docker VM 运行时步骤"
read_when:
  - 当你在云端虚拟机上使用 Docker 部署 OpenClaw 时
  - 当你需要共享的二进制文件预置、持久化和更新流程时
title: "Docker VM 运行时"
---

# Docker VM 运行时

基于虚拟机的 Docker 安装（例如 GCP、Hetzner 及类似 VPS 提供商）的共享运行时步骤。

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
The download URLs above are for x86_64 (amd64). For ARM-based VMs (e.g. Hetzner ARM, GCP Tau T2A), replace the download URLs with the appropriate ARM64 variants from each tool's release page.
</Note>

## Build and launch

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

| 组件                  | 位置                             | 持久化机制          | 说明                             |
| --------------------- | -------------------------------- | ------------------- | -------------------------------- |
| Gateway 配置          | `/home/node/.openclaw/`           | 挂载主机卷           | 包含 `openclaw.json` 和 token      |
| 模型认证配置          | `/home/node/.openclaw/`           | 挂载主机卷           | OAuth token、API key             |
| 技能配置              | `/home/node/.openclaw/skills/`    | 挂载主机卷           | 技能级别状态                     |
| 代理工作区            | `/home/node/.openclaw/workspace/` | 挂载主机卷           | 代码和代理产物                   |
| WhatsApp 会话         | `/home/node/.openclaw/`           | 挂载主机卷           | 保留二维码登录                   |
| Gmail 密钥链          | `/home/node/.openclaw/`           | 主机卷 + 密码        | 需要 `GOG_KEYRING_PASSWORD`      |
| 外部二进制文件        | `/usr/local/bin/`                 | Docker 镜像          | 必须在构建时预置                 |
| Node 运行时           | 容器文件系统                     | Docker 镜像          | 每次镜像构建都会重建             |
| 操作系统包            | 容器文件系统                     | Docker 镜像          | 运行时不要安装                   |
| Docker 容器           | 瞬时存储                         | 可重启               | 可以安全销毁                    |

## 更新

在虚拟机上更新 OpenClaw：

```bash
git pull
docker compose build
docker compose up -d
```
