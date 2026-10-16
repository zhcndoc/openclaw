---
summary: "用于浏览器控制 API 和远程 CDP 凭证处理的环回身份验证"
title: "浏览器安全"
read_when:
  - "您正在查看浏览器控件 API 如何进行身份验证"
  - "您正在处理远程 CDP 令牌"
---

核心要点：

- 浏览器控制仅限本地回环访问；访问通过 Gateway 的认证或节点配对来完成。
- 独立的回环浏览器 HTTP API 仅使用 **共享密钥认证**： Gateway token bearer auth、`x-openclaw-password`，或使用已配置的 Gateway 密码进行 HTTP Basic auth。
- Tailscale Serve 身份头和 `gateway.auth.mode: "trusted-proxy"` **不会**对这个独立的回环浏览器 API 进行认证。
- 如果启用了浏览器控制且未配置共享密钥认证，OpenClaw 会在启动时自动生成并持久化一个浏览器控制凭据： 当 `gateway.auth.mode` 为 `none` 时生成 token；当其为 `trusted-proxy` 时生成密码（通过 `gateway.auth.password` 持久化，因此进程外的回环客户端可以解析到它）。如果该模式下已经显式配置了字符串凭据，或者 `gateway.auth.mode` 为 `password`，则会跳过自动生成。
- 如果你想使用自己控制的稳定密钥，而不是自动生成的密钥，请显式配置 `gateway.auth.token`、`gateway.auth.password`、`OPENCLAW_GATEWAY_TOKEN` 或 `OPENCLAW_GATEWAY_PASSWORD`。

远程 CDP 提示：

- 尽量优先使用加密端点（HTTPS 或 WSS）和短期令牌。
- 避免在配置文件中直接嵌入长期有效的令牌。
- 将 Gateway 和任何节点主机放在私有网络（Tailscale）中；避免公开暴露。
- 将远程CDP URLs/tokens视为秘密；更喜欢环境变量或秘密管理器。
