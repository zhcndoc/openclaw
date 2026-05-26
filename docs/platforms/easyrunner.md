---
summary: "在 EasyRunner 上使用 Podman 和 Caddy 运行 OpenClaw Gateway"
read_when:
  - 在 EasyRunner 上部署 OpenClaw
  - 在 EasyRunner 的 Caddy 代理后运行 Gateway
  - 为托管的 Gateway 选择持久化卷和认证方式
title: "EasyRunner"
---

EasyRunner 可以将 OpenClaw Gateway 作为一个小型容器化应用，运行在其
Caddy 代理之后。本指南假设 EasyRunner 主机运行的是兼容 Podman 的
Compose 应用，并通过 Caddy 暴露 HTTPS。

## 开始之前

- 一台已配置域名解析到它的 EasyRunner 服务器。
- 一个已构建或已发布的 OpenClaw 容器镜像。
- 一个用于 `/home/node/.openclaw` 的持久化配置卷。
- 一个用于 `/workspace` 的持久化工作区卷。
- 一个强壮的 Gateway 令牌或密码。

在可能的情况下保持启用设备认证。如果你的反向代理部署无法
正确传递设备身份，请先修复受信任代理设置；只有在完全私有、
由操作员控制的网络中才使用危险的认证绕过。

## Compose 应用

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
      OPENCLAW_WORKSPACE_DIR: /workspace
    volumes:
      - openclaw-config:/home/node/.openclaw
      - openclaw-workspace:/workspace
    labels:
      caddy: openclaw.example.com
      caddy.reverse_proxy: "{{upstreams 1455}}"
    command: ["openclaw", "gateway", "--bind", "lan", "--port", "1455"]

volumes:
  openclaw-config:
  openclaw-workspace:
```

将 `openclaw.example.com` 替换为你的 Gateway 主机名。将
`OPENCLAW_GATEWAY_TOKEN` 存放在 EasyRunner 的 secret/环境变量管理器中，而不要
将其提交到应用定义里。

## 配置 OpenClaw

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

如果 Caddy 为 Gateway 终止 TLS，请为精确的代理路径配置受信任代理设置，
而不是全局禁用认证检查。参见
[Trusted proxy auth](/gateway/trusted-proxy-auth)。

## 验证

在你的工作站上：

```bash
openclaw gateway probe --url https://openclaw.example.com --token <token>
openclaw gateway status --url https://openclaw.example.com --token <token>
```

在 EasyRunner 主机上，检查应用日志，确认 Gateway 正在监听，并且没有
启动时的 SecretRef、插件或 channel 认证失败。

## 更新与备份

- 拉取或构建新的 OpenClaw 镜像，然后重新部署 EasyRunner 应用。
- 在更新之前备份 `openclaw-config` 卷。
- 如果 agent 会在 `openclaw-workspace` 中写入持久化项目数据，也要备份它。
- 在重大更新后运行 `openclaw doctor`，以发现配置迁移和
  服务警告。

## 故障排查

- `gateway probe` 无法连接：确认 Caddy 主机名指向该应用，
  并且容器监听的是 `0.0.0.0:1455`。
- 认证失败：在 EasyRunner secrets 和本地客户端命令中一起轮换令牌。
- 恢复后文件归属为 root：修复挂载卷，使
  容器用户可以写入 `/home/node/.openclaw` 和 `/workspace`。
- 浏览器或 channel 插件失败：检查容器内是否可用所需的外部
  二进制文件、网络出站访问以及已挂载的凭据。
