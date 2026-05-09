---
summary: "网关仪表板（控制 UI）访问与认证"
read_when:
  - 更改仪表板认证或暴露模式时
title: "仪表板"
---

Gateway 仪表板是浏览器控制 UI，默认由 `/` 提供服务
（可通过 `gateway.controlUi.basePath` 覆盖）。

快速打开（本地 Gateway）：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/)（或 [http://localhost:18789/](http://localhost:18789/)）
- 启用 `gateway.tls.enabled: true` 时，使用 `https://127.0.0.1:18789/` 和
  `wss://127.0.0.1:18789` 作为 WebSocket 端点。

关键参考：

- [控制 UI](/web/control-ui) 了解用法和 UI 功能。
- [Tailscale](/gateway/tailscale) 了解 Serve/Funnel 自动化。
- [Web 表面](/web) 了解绑定模式和安全说明。

认证在 WebSocket 握手阶段通过配置的 gateway
认证路径强制执行：

- `connect.params.auth.token`
- `connect.params.auth.password`
- 当 `gateway.auth.allowTailscale: true` 时使用 Tailscale Serve 身份头
- 当 `gateway.auth.mode: "trusted-proxy"` 时使用受信任代理身份头

参见 [Gateway 配置](/gateway/configuration) 中的 `gateway.auth`。

安全提示：Control UI 是一个**管理界面**（聊天、配置、执行审批）。
不要公开暴露它。UI 会将仪表板 URL token 保存在当前浏览器标签页会话和所选 gateway URL 的 sessionStorage 中，并在加载后从 URL 中移除它们。
优先使用 localhost、Tailscale Serve 或 SSH 隧道。

## 快速路径（推荐）

- 在完成入门设置后，CLI 会自动打开仪表板并打印一个干净的（未带 token 的）链接。
- 随时重新打开：`openclaw dashboard`（会复制链接，若可能会打开浏览器，若是无头环境则显示 SSH 提示）。
- 如果剪贴板和浏览器传递都失败，`openclaw dashboard` 仍会打印
  干净的 URL，并告诉你使用 `OPENCLAW_GATEWAY_TOKEN` 中的 token 或
  `gateway.auth.token` 作为 URL fragment 键 `token`；它不会在日志中打印 token
  值。
- 如果 UI 提示共享密钥认证，请将配置的 token 或
  密码粘贴到 Control UI 设置中。

## 认证基础（本地 vs 远程）

- **localhost**：打开 `http://127.0.0.1:18789/`。
- **Gateway TLS**：当 `gateway.tls.enabled: true` 时，仪表板/状态链接使用
  `https://`，Control UI WebSocket 链接使用 `wss://`。
- **共享密钥 token 来源**：`gateway.auth.token`（或
  `OPENCLAW_GATEWAY_TOKEN`）；`openclaw dashboard` 可以通过 URL fragment
  进行一次性引导传递，而 Control UI 会将其保存在当前浏览器标签页会话和所选 gateway URL 的 sessionStorage 中，而不是 localStorage。
- 如果 `gateway.auth.token` 由 SecretRef 管理，`openclaw dashboard`
  会按设计打印/复制/打开一个不含 token 的 URL。这样可以避免在 shell 日志、剪贴板历史或浏览器启动
  参数中暴露外部管理的 token。
- 如果 `gateway.auth.token` 配置为 SecretRef 且在你当前的 shell 中未解析，
  `openclaw dashboard` 仍会打印一个不含 token 的 URL，并附带可执行的认证设置指导。
- **共享密钥密码**：使用已配置的 `gateway.auth.password`（或
  `OPENCLAW_GATEWAY_PASSWORD`）。仪表板不会在
  刷新之间持久化密码。
- **带身份的模式**：当 `gateway.auth.allowTailscale: true` 时，Tailscale Serve 可以通过身份头满足 Control UI/WebSocket
  认证；而非回环的、具备身份感知能力的反向代理可以满足
  `gateway.auth.mode: "trusted-proxy"`。在这些模式下，仪表板不需要为 WebSocket 手动粘贴共享密钥。
- **非 localhost**：使用 Tailscale Serve、非回环共享密钥绑定、
  配置了 `gateway.auth.mode: "trusted-proxy"` 的非回环身份感知反向代理，或 SSH 隧道。HTTP API 仍然使用共享密钥认证，除非你有意运行私有入口
  `gateway.auth.mode: "none"` 或 trusted-proxy HTTP 认证。参见
  [Web 表面](/web)。

<a id="if-you-see-unauthorized-1008"></a>

## 如果你看到 "unauthorized" / 1008

- 确保 gateway 可达（本地：`openclaw status`；远程：SSH 隧道 `ssh -N -L 18789:127.0.0.1:18789 user@host`，然后打开 `http://127.0.0.1:18789/`）。
- 对于 `AUTH_TOKEN_MISMATCH`，当 gateway 返回重试提示时，客户端可以使用缓存的设备 token 进行一次受信任的重试。该缓存 token 的重试会复用该 token 的缓存已批准作用域；显式 `deviceToken` / 显式 `scopes` 调用方会保留其请求的作用域集合。如果在该重试后认证仍然失败，请手动修复 token 漂移。
- 在该重试路径之外，连接认证优先级依次为：显式共享 token/password，然后是显式 `deviceToken`，然后是存储的设备 token，最后是引导 token。
- 在异步的 Tailscale Serve Control UI 路径中，在失败认证限流器记录之前，同一
  `{scope, ip}` 的失败尝试会被串行化，因此第二个并发的错误重试可能已经显示 `retry later`。
- 有关 token 漂移修复步骤，请遵循 [Token 漂移恢复清单](/cli/devices#token-drift-recovery-checklist)。
- 从 gateway 主机检索或提供共享密钥：
  - Token：`openclaw config get gateway.auth.token`
  - 密码：解析已配置的 `gateway.auth.password` 或
    `OPENCLAW_GATEWAY_PASSWORD`
  - SecretRef 管理的 token：解析外部密钥提供方，或在此 shell 中导出
    `OPENCLAW_GATEWAY_TOKEN`，然后重新运行 `openclaw dashboard`
  - 未配置共享密钥：`openclaw doctor --generate-gateway-token`
- 在仪表板设置中，将 token 或密码粘贴到认证字段，
  然后连接。
- UI 语言选择器位于 **Overview -> Gateway Access -> Language**。
  它属于访问卡片的一部分，不在 Appearance 部分。

## 相关内容

- [控制 UI](/web/control-ui)
- [WebChat](/web/webchat)
