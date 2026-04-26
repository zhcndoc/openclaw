---
summary: "网关仪表盘（控制界面）访问与认证"
read_when:
  - 更改仪表盘认证或暴露模式时
title: "仪表盘"
---

网关仪表盘是默认由 `/` 提供的浏览器控制界面
（可通过 `gateway.controlUi.basePath` 覆盖）。

快速打开（本地网关）：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) （或 [http://localhost:18789/](http://localhost:18789/)）

主要参考：

- [控制界面](/web/control-ui) 了解使用方法和界面功能。
- [Tailscale](/gateway/tailscale) 用于 Serve/Funnel 自动化。
- [Web 界面](/web) 了解绑定模式和安全注意事项。

认证在 WebSocket 握手时通过配置的网关认证路径强制执行：

- `connect.params.auth.token`
- `connect.params.auth.password`
- 当 `gateway.auth.allowTailscale: true` 时，Tailscale Serve 身份头
- 当 `gateway.auth.mode: "trusted-proxy"` 时，受信任代理身份头

请参阅 [网关配置](/gateway/configuration) 中的 `gateway.auth`。

安全提醒：控制界面是一个 **管理员界面** （包含聊天、配置、执行审批等功能）。请勿公开暴露。界面将仪表盘 URL 中的令牌存储在 sessionStorage 中，针对当前浏览器标签页会话和选中的网关 URL，并在加载后移除 URL 中的令牌。优先使用 localhost、Tailscale Serve 或 SSH 隧道方式访问。

## 快速路径（推荐）

- 完成引导后，CLI 会自动打开仪表盘并打印一个干净的（不含令牌的）链接。
- 随时重新打开：`openclaw dashboard`（会复制链接、在可能时打开浏览器，并在无头模式下显示 SSH 提示）。
- 如果 UI 提示共享密钥认证，请将配置的令牌或
  密码粘贴到控制界面设置中。

## 认证基础（本地 vs 远程）

- **本地主机**：打开 `http://127.0.0.1:18789/`。
- **共享密钥令牌来源**：`gateway.auth.token`（或
  `OPENCLAW_GATEWAY_TOKEN`）；`openclaw dashboard` 可以通过 URL 片段
  一次性传递它用于引导，控制界面会将其保存在当前浏览器标签页会话和所选网关 URL 对应的 sessionStorage 中，而不是 localStorage。
- 如果 `gateway.auth.token` 由 SecretRef 管理，`openclaw dashboard`
  会按设计打印/复制/打开一个不含令牌的 URL。这可以避免在 shell 日志、剪贴板历史或浏览器启动
  参数中暴露外部管理的令牌。
- 如果 `gateway.auth.token` 配置为 SecretRef，且在当前 shell 中未解析，
  `openclaw dashboard` 仍会打印一个不含令牌的 URL，并附带可操作的认证设置指导。
- **共享密钥密码**：使用配置的 `gateway.auth.password`（或
  `OPENCLAW_GATEWAY_PASSWORD`）。仪表盘不会在
  重新加载之间持久保存密码。
- **带身份的模式**：当 `gateway.auth.allowTailscale: true` 时，Tailscale Serve 可通过身份头满足控制界面/WebSocket
  认证；而非 loopback 的具身份感知反向代理可以满足
  `gateway.auth.mode: "trusted-proxy"`。在这些模式下，仪表盘无需粘贴共享密钥即可用于 WebSocket。
- **非本地主机**：使用 Tailscale Serve、非 loopback 的共享密钥绑定、
  配置为 `gateway.auth.mode: "trusted-proxy"` 的非 loopback 具身份感知反向代理，或 SSH 隧道。HTTP API 仍使用共享密钥认证，除非您有意运行私有入口的
  `gateway.auth.mode: "none"` 或 trusted-proxy HTTP 认证。请参阅
  [Web 界面](/web)。

<a id="if-you-see-unauthorized-1008"></a>

## 如果您看到 "unauthorized" / 1008

- 确保网关可达（本地：`openclaw status`；远程：SSH 隧道 `ssh -N -L 18789:127.0.0.1:18789 user@host`，然后打开 `http://127.0.0.1:18789/`）。
- 对于 `AUTH_TOKEN_MISMATCH`，当网关返回重试提示时，客户端可能会使用缓存的设备令牌进行一次受信任的重试。该缓存令牌重试会重用令牌中缓存的已批准作用域；显式的 `deviceToken` / 显式的 `scopes` 调用者会保留其请求的作用域集合。若在该重试后认证仍失败，请手动修复令牌漂移。
- 在该重试路径之外，连接认证优先级为：显式共享令牌/密码优先，然后是显式 `deviceToken`，然后是存储的设备令牌，最后是引导令牌。
- 在异步的 Tailscale Serve 控制界面路径上，相同 `{scope, ip}` 的失败尝试会在失败认证限流器记录之前被串行化，因此第二个并发的错误重试可能已经显示 `retry later`。
- 有关令牌漂移修复步骤，请参阅 [令牌漂移恢复清单](/cli/devices#token-drift-recovery-checklist)。
- 从网关主机检索或提供共享密钥：
  - 令牌：`openclaw config get gateway.auth.token`
  - 密码：解析已配置的 `gateway.auth.password` 或
    `OPENCLAW_GATEWAY_PASSWORD`
  - 由 SecretRef 管理的令牌：解析外部密钥提供方，或在此 shell 中导出
    `OPENCLAW_GATEWAY_TOKEN`，然后重新运行 `openclaw dashboard`
  - 未配置共享密钥：`openclaw doctor --generate-gateway-token`
- 在仪表盘设置中，将令牌或密码粘贴到认证字段中，
  然后连接。
- UI 语言选择器位于 **Overview -> Gateway Access -> Language**。
  它属于访问卡片，而不是外观部分。

## 相关内容

- [控制界面](/web/control-ui)
- [WebChat](/web/webchat)
