---
summary: "使用 Podman 和 Caddy 在 EasyRunner 上运行 OpenClaw 网关"
read_when:
  - "在 EasyRunner 上部署 OpenClaw"
  - "在 EasyRunner 的 Caddy 代理后运行 Gateway"
  - "为托管的 Gateway 选择持久化卷和认证方式"
title: "EasyRunner"
---

EasyRunner 将 OpenClaw 网关作为其 Caddy 代理背后的小型容器化应用程序托管。本指南假设 EasyRunner 主机运行 Podman- 兼容的 Compose 应用程序并通过 Caddy 终止 HTTPS。

## <a id="before-you-begin"></a> 开始之前

- 一个已绑定域名的 EasyRunner 服务器。
- 官方 OpenClaw 镜像（`ghcr.io/openclaw/openclaw`）或你自己的构建版本。
- 一个用于 `/home/node/.openclaw` 的持久化配置卷。
- 一个用于 `/home/node/.openclaw/workspace` 的持久化工作区卷。
- 一个强密码的 Gateway token 或密码。

尽可能保持设备认证启用。如果你的反向代理无法正确传递设备身份，请先修复 trusted-proxy 设置（参见 [Trusted proxy auth](/gateway/trusted-proxy-auth)）；只有在完全私有、由运维人员控制的网络中，才使用危险的认证绕过方式。

## <a id="compose-app"></a> Compose 应用

使用如下结构的 Compose 文件创建一个 EasyRunner 应用：

```yaml
services:
  openclaw:
    image: ghcr.io/openclaw/openclaw:latest
    restart: unless-stopped
    environment:
      OPENCLAW_GATEWAY_TOKEN: ${OPENCLAW_GATEWAY_TOKEN}
      OPENCLAW_HOME: /home/node
      OPENCLAW_STATE_DIR: /home/node/.openclaw
      OPENCLAW_CONFIG_PATH: /home/node/.openclaw/openclaw.json
      OPENCLAW_WORKSPACE_DIR: /home/node/.openclaw/workspace
    volumes:
      - openclaw-config:/home/node/.openclaw
      - openclaw-workspace:/home/node/.openclaw/workspace
    labels:
      caddy: openclaw.example.com
      caddy.reverse_proxy: "{{upstreams 1455}}"
    command: ["node", "openclaw.mjs", "gateway", "--bind", "lan", "--port", "1455"]

volumes:
  openclaw-config:
  openclaw-workspace:
```

将 `openclaw.example.com` 替换为您的网关主机名。将 `OPENCLAW_GATEWAY_TOKEN` 存储在 EasyRunner 的 secret/environment 管理器中，而不是将其提交到应用程序定义中。镜像默认绑定到环回，因此 Caddy 需要 `command` 中的显式 `--bind lan --port 1455` 才能到达容器。

## <a id="configure-openclaw"></a> 配置 OpenClaw

在持久化配置卷中，确保 Gateway 仅能通过代理访问，并要求认证：

```json5
{
  gateway: {
    bind: "lan",
    port: 1455,
    auth: {
      token: "${OPENCLAW_GATEWAY_TOKEN}",
    },
  },
}
```

如果 Caddy 为 Gateway 终止 TLS，请为精确的代理路径配置受信任代理设置，而不是全局禁用认证检查。请参阅 [受信任代理认证](/gateway/trusted-proxy-auth)。

## <a id="verify"></a> 验证

在你的工作站上：

```bash
openclaw gateway probe --url https://openclaw.example.com --token <token>
openclaw gateway status --url https://openclaw.example.com --token <token>
```

从 EasyRunner 主机上，`GET /healthz`（存活检查）和 `GET /readyz` （就绪检查）不需要认证，并支持镜像内置的容器健康检查。还要查看应用日志，确认 Gateway 正在监听，并且没有启动 SecretRef、插件或通道认证失败。

## <a id="updates-and-backups"></a> 更新与备份

- 拉取或构建新的 OpenClaw 镜像，然后重新部署 EasyRunner 应用。
- 在更新之前备份 `openclaw-config` 卷。它保存 `openclaw.json`、`state/openclaw.sqlite` 中的共享身份验证、`agents/<agentId>/agent/openclaw-agent.sqlite` 中的代理本地配置文件以及已安装的插件包状态。
- 如果代理会在 `openclaw-workspace` 中写入持久化项目数据，请备份该卷。
- 在重大更新后运行 `openclaw doctor`，以捕获配置迁移和服务警告。

## <a id="troubleshooting"></a> 故障排查

- `gateway probe` 无法连接：确认 Caddy 主机名指向应用，并且容器监听 `0.0.0.0:1455`。
- 认证失败：同时轮换 EasyRunner secrets 中的 token 和本地客户端命令。
- 恢复后文件归 root 所有：镜像以 `node`（uid 1000）身份运行；修复已挂载的卷，以便该用户可以写入 `/home/node/.openclaw` 和 `/home/node/.openclaw/workspace`。
- 浏览器或通道插件失败：检查所需的外部二进制文件、网络外连能力以及已挂载的凭据是否在容器内可用。

## <a id="related"></a> 相关内容

- [Platforms](/platforms) — 该页面所在的 VPS 和托管索引
- [Docker](/install/docker) — 此 Compose 文件使用的容器映像和环境变量
- [可信代理身份验证](/gateway/trusted-proxy-auth) — Caddy 背后使用的身份验证模式
- [Gateway runbook](/gateway) — 在网关启动后对其进行操作
