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

- 完成引导后，CLI 会自动打开仪表板并打印一个简洁的链接。
- 随时重新打开或修复浏览器：`openclaw dashboard`。它会复制/打开一个一次性配对链接，
  用于替换过期的浏览器凭据，而不会授予远程操作的全面自动批准权限。
- 如果剪贴板和浏览器传递都失败，`openclaw dashboard` 会提供安全的手动令牌提示，
  或提示你运行 `openclaw dashboard --json` 并打开其中的短期有效 `browserUrl`；它绝不会
  在交互式日志中打印共享令牌值。
- 如果界面提示使用共享密钥进行身份验证，请将已配置的令牌或密码粘贴到控制界面设置中。

## 认证基础（本地 vs 远程）

- **本地主机**：打开 `http://127.0.0.1:18789/`。
- **网关 TLS**：当 `gateway.tls.enabled: true` 时，仪表板/状态链接使用 `https://`，控制界面 WebSocket 链接使用 `wss://`。
- **共享密钥令牌来源**：`gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。手动输入的令牌
  会保存在当前标签页和所选网关 URL 的 sessionStorage 中，而不是 localStorage。
- **主机授权的浏览器交接**：`openclaw dashboard` 会签发一个短期、单次使用的引导令牌，
  而不是将共享网关令牌放入浏览器启动 URL。该引导令牌与该浏览器的签名设备身份绑定，并会交换为持久的设备专属凭据。
- **缺少配置时的运行时令牌**：如果启动时提示生成了运行时令牌，该令牌是临时的，无法恢复。请运行 `openclaw doctor --generate-gateway-token`，重启网关，然后在交互式终端中运行 `openclaw gateway auth-token --show`，并将输出粘贴到控制界面的设置中。
- 如果 `gateway.auth.token` 由 SecretRef 管理，交互式仪表板交接仍然有效，因为它只携带短期浏览器引导令牌；外部共享令牌不会出现在
  终端输出、剪贴板历史记录或浏览器启动参数中。
- **共享密钥密码**：使用已配置的 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。仪表板不会在重新加载后保留密码。
- **携带身份的模式**：当 `gateway.auth.allowTailscale: true` 时，Tailscale Serve 会通过身份标头满足控制界面/WebSocket 身份验证；非环回、支持身份识别的反向代理则满足 `gateway.auth.mode: "trusted-proxy"`。WebSocket 无需粘贴共享密钥。
- **非本地主机**：使用 Tailscale Serve、非环回共享密钥绑定、`gateway.auth.mode: "trusted-proxy"` 的非环回支持身份识别的反向代理，或 SSH 隧道。HTTP API 仍使用共享密钥身份验证，除非你有意运行私有入口的 `gateway.auth.mode: "none"` 或受信任代理 HTTP 身份验证。请参阅[Web 界面](/web)。

## 在 Telegram 中打开

Telegram 机器人可以使用 `/dashboard` 将控制台作为 Telegram Mini App 打开。

要求：

- `gateway.tailscale.mode: "serve"` 或 `"funnel"`，这样 Telegram 才能获得一个 HTTPS Mini App URL。
- Telegram 发送者必须是机器人的所有者：`commands.ownerAllowFrom` 中的一个数字 Telegram 用户 ID，或者所选账号的有效 `channels.telegram.allowFrom`。
- 在与机器人的私聊（DM）中运行 `/dashboard`。在群聊中调用时，只会提示你在 DM 中打开该命令，不会包含按钮。
- Docker 安装：Serve/Funnel 模式要求 gateway 在 `tailscaled` 旁边绑定 loopback，这与发布端口的 bridge 网络无法满足。请使用 `network_mode: host` 运行 gateway 容器，并将宿主机的 `tailscaled` socket（`/var/run/tailscale`）以及 `tailscale` CLI 挂载到容器中。

Mini App 会执行一次性的所有者交接，并使用一个短期有效的 bootstrap token 重定向到 Control UI。它不会在 URL 中暴露共享的 gateway token。

v1 的非目标：

- 不支持 Telegram Web iframe。
- 仅支持 Tailscale Serve/Funnel 作为已发布 URL 的路径。

<a id="if-you-see-unauthorized-1008"></a>

## 如果你看到 "unauthorized" / 1008

- 确认网关可访问：本地运行 `openclaw status`；远程则建立 SSH 隧道 `ssh -N -L 18789:127.0.0.1:18789 user@gateway-host`，然后打开 `http://127.0.0.1:18789/`。
- 对于 `AUTH_TOKEN_MISMATCH`，当网关返回重试提示时，客户端可以使用缓存的设备令牌进行一次受信任的重试；该重试会复用令牌缓存的已批准作用域（显式提供 `deviceToken`/`scopes` 的调用方会保留其请求的作用域集合）。如果重试后认证仍然失败，请手动解决令牌漂移问题。
- 对于 `AUTH_SCOPE_MISMATCH`，设备令牌已被识别，但不包含所请求的作用域；请重新配对或批准新的作用域集合，而不是轮换共享网关令牌。
- 除上述重试路径外，连接认证的优先级为：显式共享令牌/密码，然后是显式 `deviceToken`，接着是已存储的设备令牌，最后是引导令牌。
- 在异步 Tailscale Serve 路径上，同一 `{scope, ip}` 的失败尝试会在失败认证限制器记录之前进行串行处理，因此第二次并发的错误重试可能已经显示 `retry later`。
- 有关令牌漂移修复步骤，请参阅[令牌漂移恢复检查清单](/cli/devices#token-drift-recovery-checklist)。
- 从网关主机获取或提供共享密钥：
  - 令牌：在网关主机的交互式终端中运行 `openclaw gateway auth-token --show`
  - 密码：解析已配置的 `gateway.auth.password` 或 `OPENCLAW_GATEWAY_PASSWORD`
  - 由 SecretRef 管理的令牌：运行 `openclaw gateway auth-token --show`；如果解析失败，请修复外部密钥提供程序后重新运行
  - 因未配置共享密钥而生成的运行时令牌：运行 `openclaw doctor --generate-gateway-token`，重启网关，然后使用已配置的令牌
- 在控制面板设置中，将令牌或密码粘贴到认证字段，然后连接。
- UI 语言选择器位于 **设置 → 外观 → 语言**。

## 相关内容

- [控制 UI](/web/control-ui)
- [WebChat](/web/webchat)
