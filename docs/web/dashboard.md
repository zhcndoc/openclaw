---
summary: "网关仪表板（控制 UI）访问与认证"
read_when:
  - 更改仪表板认证或暴露模式时
title: "仪表板"
---

网关仪表板是默认由 `/` 提供的浏览器控制 UI（可通过 `gateway.controlUi.basePath` 覆盖）。

快速打开（本地 Gateway）：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/)（或 [http://localhost:18789/](http://localhost:18789/)）
- 启用 `gateway.tls.enabled: true` 时，WebSocket 端点请使用 `https://127.0.0.1:18789/` 和 `wss://127.0.0.1:18789`。

关键参考：

- [控制 UI](/web/control-ui) 了解用法和 UI 功能。
- [Tailscale](/gateway/tailscale) 了解 Serve/Funnel 自动化。
- [Web 表面](/web) 了解绑定模式和安全说明。

认证在 WebSocket 握手阶段通过配置的 gateway auth 路径强制执行：

- `connect.params.auth.token`
- `connect.params.auth.password`
- 当 `gateway.auth.allowTailscale: true` 时使用 Tailscale Serve 身份头
- 当 `gateway.auth.mode: "trusted-proxy"` 时使用受信任代理身份头

参见 [Gateway 配置](/gateway/configuration) 中的 `gateway.auth`。

<Warning>
控制 UI 是一个**管理界面**（聊天、配置、执行审批）。不要公开暴露它。UI 会将仪表板 URL token 存储在当前浏览器标签页和所选 gateway URL 的 sessionStorage 中，并在加载后将其从 URL 中移除。优先使用 localhost、Tailscale Serve 或 SSH 隧道。
</Warning>

## 快速路径（推荐）

- After onboarding, the CLI auto-opens the dashboard and prints a clean (non-tokenized) link.
- Re-open anytime: `openclaw dashboard` (copies the link, opens a browser if possible, prints an SSH hint if headless).
- If clipboard and browser delivery both fail, `openclaw dashboard` still prints the clean URL and tells you to append your token (from `OPENCLAW_GATEWAY_TOKEN` or `gateway.auth.token`) as the URL fragment key `token`; it never prints the token value in logs.
- If the UI prompts for shared-secret auth, paste the configured token or password into Control UI settings.

## 认证基础（本地 vs 远程）

- **本地主机**：打开 `http://127.0.0.1:18789/`。
- **网关 TLS**：当 `gateway.tls.enabled: true` 时，仪表盘/状态链接使用 `https://`，Control UI WebSocket 链接使用 `wss://`。
- **共享密钥令牌来源**：`gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。`openclaw dashboard` 可以通过 URL fragment 一次性传递它用于初始引导；Control UI 会将其保存在当前标签页和所选网关 URL 的 sessionStorage 中，而不是 localStorage。
- 如果 `gateway.auth.token` 由 SecretRef 管理，`openclaw dashboard` 出于设计会打印/复制/打开一个不含令牌的 URL，以避免在 shell 日志、剪贴板历史或浏览器启动参数中暴露外部管理的令牌。如果在当前 shell 中该引用未解析，它仍会打印不含令牌的 URL，并附带可执行的认证设置指导。
- **共享密钥密码**：使用已配置的 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。仪表盘不会在重载之间持久化密码。
- **带身份模式**：当 `gateway.auth.allowTailscale: true` 时，Tailscale Serve 通过身份头满足 Control UI/WebSocket 认证；非回环的具身份感知反向代理通过 `gateway.auth.mode: "trusted-proxy"` 满足认证。这两种情况下，WebSocket 都不需要粘贴共享密钥。
- **非本地主机**：使用 Tailscale Serve、非回环的共享密钥绑定、带身份感知的非回环反向代理并设置 `gateway.auth.mode: "trusted-proxy"`，或 SSH 隧道。HTTP API 仍然使用共享密钥认证，除非你有意运行私有入口的 `gateway.auth.mode: "none"` 或 trusted-proxy HTTP 认证。参见 [Web surfaces](/web)。

<a id="if-you-see-unauthorized-1008"></a>

## 如果你看到 "unauthorized" / 1008

- 确认网关可达：本地运行 `openclaw status`；远程则通过 SSH 隧道 `ssh -N -L 18789:127.0.0.1:18789 user@gateway-host`，然后打开 `http://127.0.0.1:18789/`。
- 对于 `AUTH_TOKEN_MISMATCH`，当网关返回重试提示时，客户端可以使用缓存的设备令牌进行一次受信任的重试；该重试会复用令牌缓存的已批准作用域（显式传入 `deviceToken`/`scopes` 的调用方会保留其请求的作用域集合）。如果在该重试后认证仍然失败，请手动解决令牌漂移。
- 对于 `AUTH_SCOPE_MISMATCH`，设备令牌已被识别，但不包含所请求的作用域；请重新配对或批准新的作用域集合，而不是轮换共享的网关令牌。
- 在该重试路径之外，连接认证的优先级为：显式共享令牌/密码，其次是显式 `deviceToken`，然后是已存储的设备令牌，最后是引导令牌。
- 在异步 Tailscale Serve 路径上，对同一 `{scope, ip}` 的失败尝试会在失败认证限流器记录之前被串行化，因此第二个并发的错误重试可能已经显示 `retry later`。
- 有关令牌漂移修复步骤，请参见 [令牌漂移恢复清单](/cli/devices#token-drift-recovery-checklist)。
- 从网关主机获取或提供共享密钥：
  - 令牌：`openclaw config get gateway.auth.token`
  - 密码：解析已配置的 `gateway.auth.password` 或 `OPENCLAW_GATEWAY_PASSWORD`
  - SecretRef 管理的令牌：解析外部密钥提供方，或在此 shell 中导出 `OPENCLAW_GATEWAY_TOKEN` 并重新运行 `openclaw dashboard`
  - 未配置共享密钥：`openclaw doctor --generate-gateway-token`
- 在仪表板设置中，将令牌或密码粘贴到认证字段，然后连接。
- UI 语言选择器位于 **概览 -> 网关访问 -> 语言**，不在外观下。

## 相关内容

- [控制 UI](/web/control-ui)
- [WebChat](/web/webchat)
