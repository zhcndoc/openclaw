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

- 在完成 onboarding 后，CLI 会自动打开 dashboard 并打印一个干净的（非 tokenized）链接。
- 随时重新打开：`openclaw dashboard`（会复制链接，若可能则打开浏览器，如果是 headless 环境则打印 SSH 提示）。
- 如果 clipboard 和 browser 传递都失败了，`openclaw dashboard` 仍然会打印干净的 URL，并告诉你将你的 token（来自 `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.token`）追加为 URL 片段键 `token`；它绝不会在日志中打印 token 值。
- 如果 UI 提示 shared-secret auth，请将配置的 token 或密码粘贴到 Control UI settings 中。

## 认证基础（本地 vs 远程）

- **Localhost**: 打开 `http://127.0.0.1:18789/`。
- **Gateway TLS**: 当 `gateway.tls.enabled: true` 时，dashboard/status 链接使用 `https://`，Control UI WebSocket 链接使用 `wss://`。
- **Shared-secret token source**: `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。`openclaw dashboard` 可以通过 URL fragment 传递它用于一次性引导；Control UI 会将其保存在当前标签页和所选 gateway URL 的 sessionStorage 中，而不是 localStorage。
- **Missing-config runtime token**: 如果启动时提示已生成 runtime token，则该 token 是临时的，无法通过 `openclaw config get gateway.auth.token` 获取。回环访问仍然需要认证。运行 `openclaw doctor --generate-gateway-token`，重启 Gateway，然后将已配置的 token 粘贴到 Control UI 设置中。
- 如果 `gateway.auth.token` 由 SecretRef 管理，`openclaw dashboard` 会按设计打印/复制/打开一个不含 token 的 URL，以避免外部管理的 token 暴露在 shell 日志、剪贴板历史或浏览器启动参数中。如果在当前 shell 中该引用未解析，它仍会打印不含 token 的 URL，并附带可执行的认证设置指导。
- **Shared-secret password**: 使用已配置的 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。dashboard 不会在刷新后持久保存密码。
- **Identity-bearing modes**: 当 `gateway.auth.allowTailscale: true` 时，Tailscale Serve 通过身份头满足 Control UI/WebSocket 认证；非 localhost 的具备身份感知能力的反向代理通过 `gateway.auth.mode: "trusted-proxy"` 满足认证。两者都不需要为 WebSocket 粘贴 shared secret。
- **Not localhost**: 使用 Tailscale Serve、非 localhost 的 shared-secret 绑定、设置了 `gateway.auth.mode: "trusted-proxy"` 的非 localhost 身份感知反向代理，或 SSH 隧道。HTTP APIs 仍然使用 shared-secret 认证，除非你有意运行 private-ingress 的 `gateway.auth.mode: "none"` 或 trusted-proxy HTTP auth。参见 [Web surfaces](/web)。

## 在 Telegram 中打开

Telegram bots 可以使用 `/dashboard` 将控制台作为 Telegram Mini App 打开。

要求：

- `gateway.tailscale.mode: "serve"` 或 `"funnel"`，这样 Telegram 才能获得一个 HTTPS Mini App URL。
- Telegram 发送者必须是 bot 的所有者：`commands.ownerAllowFrom` 中的一个数字 Telegram 用户 ID，或者所选账号的有效 `channels.telegram.allowFrom`。
- 在与 bot 的私聊（DM）中运行 `/dashboard`。在群聊中调用时，只会提示你在 DM 中打开该命令，不会包含按钮。
- Docker 安装：Serve/Funnel 模式要求 gateway 在 `tailscaled` 旁边绑定 loopback，这与发布端口的 bridge 网络无法满足。请使用 `network_mode: host` 运行 gateway 容器，并将宿主机的 `tailscaled` socket（`/var/run/tailscale`）以及 `tailscale` CLI 挂载到容器中。

Mini App 会执行一次性的所有者交接，并使用一个短期有效的 bootstrap token 重定向到 Control UI。它不会在 URL 中暴露共享的 gateway token。

v1 的非目标：

- 不支持 Telegram Web iframe。
- 仅支持 Tailscale Serve/Funnel 作为已发布 URL 的路径。

<a id="if-you-see-unauthorized-1008"></a>

## 如果你看到 "unauthorized" / 1008

- 确认网关可达：本地使用 `openclaw status`；远程则建立 SSH 隧道 `ssh -N -L 18789:127.0.0.1:18789 user@gateway-host`，然后打开 `http://127.0.0.1:18789/`。
- 对于 `AUTH_TOKEN_MISMATCH`，当网关返回重试提示时，客户端可以使用缓存的设备令牌进行一次受信任的重试；该重试会重用令牌缓存的已批准范围（显式传入 `deviceToken`/`scopes` 的调用方会保留其请求的范围集合）。如果该重试后认证仍然失败，请手动解决令牌漂移。
- 对于 `AUTH_SCOPE_MISMATCH`，设备令牌已被识别，但不包含请求的范围；请重新配对或批准新的范围集合，而不是轮换共享的网关令牌。
- 在该重试路径之外，连接认证优先级为：显式共享令牌/密码，然后是显式 `deviceToken`，然后是已存储的设备令牌，最后是引导令牌。
- 在异步 Tailscale Serve 路径上，同一 `{scope, ip}` 的失败尝试会在失败认证限流器记录它们之前被串行化，因此第二个并发的错误重试可能已经显示 `retry later`。
- 有关令牌漂移修复步骤，请参见 [令牌漂移恢复检查清单](/cli/devices#token-drift-recovery-checklist)。
- 从网关主机检索或提供共享密钥：
  - 令牌：`openclaw config get gateway.auth.token`
  - 密码：解析已配置的 `gateway.auth.password` 或 `OPENCLAW_GATEWAY_PASSWORD`
  - SecretRef 管理的令牌：解析外部密钥提供方，或在此 shell 中导出 `OPENCLAW_GATEWAY_TOKEN` 并重新运行 `openclaw dashboard`
  - 因未配置共享密钥而生成的运行时令牌：运行 `openclaw doctor --generate-gateway-token`，重启 Gateway，然后使用已配置的令牌
- 在 dashboard 设置中，将令牌或密码粘贴到认证字段，然后连接。
- UI 语言选择器位于 **Settings -> General -> Language**，不在 Appearance 下。

## 相关内容

- [控制 UI](/web/control-ui)
- [WebChat](/web/webchat)
