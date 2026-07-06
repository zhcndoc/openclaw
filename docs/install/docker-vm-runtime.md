---
summary: "适用于长期运行的 OpenClaw Gateway 主机的共享 Docker VM 运行时步骤"
read_when:
  - 你正在带 Docker 的云 VM 上部署 OpenClaw
  - 你需要共享二进制烘焙、持久化和更新流程
title: "Docker VM 运行时"
---

适用于基于 VM 的 Docker 安装的共享运行时步骤，例如 GCP、Hetzner 以及类似的 VPS 提供商。

## 将所需二进制文件烘焙进镜像

在运行中的容器里安装二进制文件是个陷阱：任何在运行时安装的内容都会在重启后丢失。请在构建时把技能所需的每个外部二进制文件都烘焙进镜像中。

下面的示例只涵盖三个二进制文件，按字母顺序排列：

- `gog`（来自 `gogcli`），用于访问 Gmail
- `goplaces`，用于 Google Places
- `wacli`，用于 WhatsApp

这些只是示例，不是完整列表。请使用相同模式，按需安装尽可能多的二进制文件。以后当你添加一个需要新二进制文件的技能时：

1. 更新 Dockerfile。
2. 重新构建镜像。
3. 重启容器。

**示例 Dockerfile**

```dockerfile
FROM node:24-bookworm

RUN apt-get update && apt-get install -y socat && rm -rf /var/lib/apt/lists/*

# 示例二进制文件 1：Gmail CLI（gogcli — 安装后名为 `gog`）
# 从 https://github.com/steipete/gogcli/releases 复制当前 Linux 资源 URL
RUN curl -L https://github.com/steipete/gogcli/releases/latest/download/gogcli_linux_amd64.tar.gz \
  | tar -xzO gog > /usr/local/bin/gog; \
  chmod +x /usr/local/bin/gog

# 示例二进制文件 2：Google Places CLI
# 从 https://github.com/steipete/goplaces/releases 复制当前 Linux 资源 URL
RUN curl -L https://github.com/steipete/goplaces/releases/latest/download/goplaces_linux_amd64.tar.gz \
  | tar -xzO goplaces > /usr/local/bin/goplaces; \
  chmod +x /usr/local/bin/goplaces

# 示例二进制文件 3：WhatsApp CLI
# 从 https://github.com/steipete/wacli/releases 复制当前 Linux 资源 URL
RUN curl -L https://github.com/steipete/wacli/releases/latest/download/wacli-linux-amd64.tar.gz \
  | tar -xzO wacli > /usr/local/bin/wacli; \
  chmod +x /usr/local/bin/wacli

# 在下面使用相同模式添加更多二进制文件

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
上面的 URL 只是示例。对于基于 ARM 的 VM，请选择 `arm64` 资源。为了可复现构建，请固定到带版本号的发布 URL。
</Note>

## 构建和启动

```bash
docker compose build
docker compose up -d openclaw-gateway
```

如果在 `pnpm install --frozen-lockfile` 期间构建失败并出现 `Killed` 或退出码 137，说明虚拟机内存不足。请先使用更大的机器规格，再重试。

验证二进制文件：

```bash
docker compose exec openclaw-gateway which gog
docker compose exec openclaw-gateway which goplaces
docker compose exec openclaw-gateway which wacli
```

预期输出：

```text
/usr/local/bin/gog
/usr/local/bin/goplaces
/usr/local/bin/wacli
```

验证网关已启动：

```bash
docker compose logs -f openclaw-gateway
curl -fsS http://127.0.0.1:18789/healthz
```

`/healthz` 返回 200 响应表示网关进程正在监听且运行正常；内置镜像的 `HEALTHCHECK` 也会轮询同一个端点。

## 哪些内容存放在哪里

OpenClaw 运行在 Docker 中，但 Docker 不是事实来源。所有长期存在的状态都必须能够在重启、重建和重新启动后继续保留。

| 组件                   | 位置                                                   | 持久化机制             | 备注                                                                                                               |
| ---------------------- | ------------------------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 网关配置               | `/home/node/.openclaw/`                                | 主机卷挂载             | 包含 `openclaw.json`                                                                                                |
| 通道/提供商凭据        | `/home/node/.openclaw/credentials/`                    | 主机卷挂载             | 通道和提供商的凭据材料                                                                                              |
| 模型认证配置文件       | `/home/node/.openclaw/agents/`                         | 主机卷挂载             | `agents/<agentId>/agent/auth-profiles.json`（OAuth、API 密钥）                                                     |
| 旧版 OAuth 密钥文件    | `/home/node/.config/openclaw/`                         | 主机卷挂载             | 迁移前 OAuth sidecar 的只读兼容；`openclaw doctor --fix` 会将这些迁移到 `auth-profiles.json` 中                    |
| 技能配置               | `/home/node/.openclaw/skills/`                         | 主机卷挂载             | 技能级状态                                                                                                          |
| 代理工作区             | `/home/node/.openclaw/workspace/`                      | 主机卷挂载             | 代码和代理工件                                                                                                      |
| WhatsApp 会话          | `/home/node/.openclaw/`                                | 主机卷挂载             | 保留二维码登录                                                                                                      |
| Gmail 密钥环           | `/home/node/.openclaw/`                                | 主机卷 + 密码          | 需要 `GOG_KEYRING_PASSWORD`                                                                                         |
| 插件包                 | `/home/node/.openclaw/npm`, `/home/node/.openclaw/git` | 主机卷挂载             | 可下载的插件包根目录                                                                                                |
| 外部二进制文件         | `/usr/local/bin/`                                      | Docker 镜像            | 必须在构建时打包进去                                                                                                |
| Node 运行时            | 容器文件系统                                           | Docker 镜像            | 每次镜像构建都会重新生成                                                                                            |
| OS 软件包              | 容器文件系统                                           | Docker 镜像            | 不要在运行时安装                                                                                                    |
| Docker 容器            | 短暂存在                                               | 可重启                 | 可安全销毁                                                                                                          |

## 更新

要在 VM 上更新 OpenClaw：

```bash
git pull
docker compose build
docker compose up -d
```

## 相关

- [Docker](/install/docker)
- [Podman](/install/podman)
- [ClawDock](/install/clawdock)
