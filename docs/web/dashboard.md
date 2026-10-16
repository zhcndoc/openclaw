---
summary: "网关仪表板 （Control UI） 访问和身份验证"
read_when:
  - "更改仪表板认证或暴露模式时"
title: "仪表板"
---

网关仪表板是默认在 `/` 上提供服务的浏览器 Control UI（用 `gateway.controlUi.basePath` 覆盖）。

快速打开（本地 Gateway）：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) (or [http://localhost:18789/](http://localhost:18789/))
- 启用 `gateway.tls.enabled: true` 时，WebSocket 端点请使用 `https://127.0.0.1:18789/` 和 `wss://127.0.0.1:18789`。

关键参考：

- [控制 UI](/web/control-ui) 了解用法和 UI 功能。
- [Tailscale](/gateway/tailscale) 了解 Serve/Funnel 自动化。
- [Web 表面](/web) 了解绑定模式和安全说明。

认证在 WebSocket 握手阶段通过配置的 gateway auth 路径强制执行：

- `connect.params.auth.token` 或 `connect.params.auth.password` 中配置的共享密钥； `gateway.auth.mode` 选择配置的值
- 当 `gateway.auth.allowTailscale: true` 时使用 Tailscale Serve 身份头
- 当 `gateway.auth.mode: "trusted-proxy"` 时使用受信任代理身份头

参见 [Gateway 配置](/gateway/configuration) 中的 `gateway.auth`。

<Warning>
Control UI 是 **管理界面**（聊天、配置、执行批准）。不要公开暴露它。加载后，UI 从 URL 中删除凭证。成功的令牌模式连接后，它将在当前浏览器选项卡和网关源的 sessionStorage 中保留共享密钥；密码仅保留在内存中。首选本地主机、Tailscale 服务或 SSH 隧道。
</Warning>

## <a id="fast-path-(recommended)"></a><a id="fast-path-recommended"></a> 快速路径（推荐）

- 完成引导后，CLI 会自动打开仪表板并输出一个简洁的链接。
- 随时重新打开或修复浏览器：`openclaw dashboard`。 copies/opens 是一个一次性配对链接，允许管理员访问该确切签名的浏览器，包括从之前受限的凭据中恢复，而无需授予全面的远程自动批准。
- 如果剪贴板和浏览器传递都失败，`openclaw dashboard` 会提供安全的手动令牌提示，或告知你运行 `openclaw dashboard --json` 并打开其短期有效的 `browserUrl`；它绝不会在交互式日志中打印共享令牌值。
- 如果 UI 提示进行共享秘密身份验证，请将配置的令牌粘贴到登录屏幕上或 **设置 → Gateway** 中的 **Gateway Secret** 中。

## <a id="auth-basics-(local-vs-remote)"></a><a id="auth-basics-local-vs-remote"></a> 认证基础（本地主机 vs 远程）

- **本地主机**：打开 `http://127.0.0.1:18789/`。
- **Gateway TLS**：当`gateway.tls.enabled: true`、dashboard/status链路使用`https://`和Control UI WebSocket链路时`wss://`。
- **共享秘密令牌源**：`gateway.auth.token`（或`OPENCLAW_GATEWAY_TOKEN`）。成功的令牌模式连接后，当前选项卡和所选网关 URL 的手动输入将保留在 sessionStorage 中，而不是 localStorage。
- **主机授权的浏览器交接**：`openclaw dashboard` 会签发一个短时有效、只能使用一次的引导凭据，而不是将共享网关令牌放入浏览器启动 URL。该引导凭据与该浏览器的已签名设备身份绑定，并会被兑换为持久的管理员凭据。不同的浏览器配置文件无法兑换同一个交接凭据，也无法继承由此获得的访问权限。
- **Missing-config 运行时令牌**：如果启动表示它生成了运行时令牌，则该令牌是短暂的且无法恢复。环回仍然需要身份验证。运行 `openclaw doctor --generate-gateway-token`，重新启动网关，然后在交互式终端中运行 `openclaw gateway auth-token --show` 并将输出粘贴到 Control UI 设置中。
- 如果 `gateway.auth.token` 由 SecretRef 管理，交互式仪表板交接仍然有效，因为它只携带短时有效的浏览器引导凭据；外部共享令牌不会出现在终端输出、剪贴板历史记录或浏览器启动参数中。
- **共享密钥密码**：使用已配置的 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。仪表板不会在重新加载后保留密码。
- **身份承载模式**：Tailscale 当 `gateway.auth.allowTailscale: true` 时，服务通过身份标头满足 Control UI/WebSocket 身份验证；非环回身份感知反向代理满足 `gateway.auth.mode: "trusted-proxy"`。两者都不需要粘贴 WebSocket 的共享密钥。
- **Not localhost**：使用 Tailscale Serve、非环回共享秘密绑定、带有 `gateway.auth.mode: "trusted-proxy"` 的非环回身份感知反向代理或 SSH 隧道。 HTTP API 仍然使用共享秘密身份验证，除非您有意运行私有入口 `gateway.auth.mode: "none"` 或可信代理 HTTP 身份验证。请参见 [Web 表面](/web)。

## <a id="automatic-browser-handoff"></a> 自动浏览器切换

身份识别 HTTPS 主机可以为直接仪表板链接提供自动登录，同时保留网关的现有令牌和设备身份验证。由于缺少身份验证而导致初始连接失败后，Control UI 会向 `GET /.well-known/openclaw/browser-bootstrap` 发出一个同源请求（在 Control UI 基本路径下，如果已配置）。首先尝试现有凭据。显式凭据、远程网关选择、配对失败和拒绝的凭据不会触发此恢复。

此端点属于部署的经过身份验证的代理或切换服务。 OpenClaw 不会暴露未经身份验证的凭证颁发者。在使用主机的 `openclaw dashboard --json` 切换之前，服务必须独立验证浏览器的身份和授权。仅返回其一次性浏览器凭据：

```json
{ "bootstrapToken": "<single-use-browser-bootstrap>", "bootstrapProfile": "owner" }
```

使用`Content-Type: application/json`和`Cache-Control: no-store`，拒绝跨域请求，并且永远不会返回共享网关令牌。 UI 拒绝重定向、大于 8 KiB 的响应以及长度超过 4096 个可打印 ASCII 字符的令牌。该请求有 45 秒的截止时间，如果连接发生变化或页面停止，该请求就会被取消。成功恢复会保留当前仪表板路线。如果未配置端点或主机拒绝请求，则现有登录指令仍然可用。

## <a id="open-in-telegram"></a> 在 Telegram 中打开

Telegram 机器人可以使用 `/controlui` 将 Control UI 作为 Telegram 迷你应用程序打开。单独的 `/dashboard` 聊天命令创建或更新会话仪表板。如果您在早期版本中使用 `/dashboard` 作为迷你应用程序，请参阅 [ 迁移指南](/channels/telegram/mini-app#upgrading-from-dashboard)。

要求：

- `gateway.tailscale.mode: "serve"` 或 `"funnel"`，这样 Telegram 才能获得一个 HTTPS Mini App URL。
- Telegram 发送者必须是机器人的所有者：`commands.ownerAllowFrom` 中的一个数字 Telegram 用户 ID，或者所选账号的有效 `channels.telegram.allowFrom`。
- 使用机器人在 DM 中运行 `/controlui`。组调用仅告诉您打开 DM 中的命令，不包含按钮。
- Docker安装：Serve/Funnel模式要求网关在`tailscaled`旁边绑定环回，而使用已发布端口的桥接网络无法满足。使用 `network_mode: host` 运行网关容器，并将主机 `tailscaled` 套接字 （`/var/run/tailscale`） 以及 `tailscale` CLI 挂载到容器中。

该 Mini App 会执行一次有范围限制的控制台交接，并使用短期 bootstrap token 重定向到 Control UI。它不会在 URL 中暴露共享的 gateway token，也不会获得保留给由 Gateway 主机直接发起的交接流程的管理员授权。

v1 的非目标：

- 不支持 Telegram Web iframe。
- 仅支持 Tailscale Serve/Funnel 作为已发布 URL 的路径。

<a id="if-you-see-unauthorized-1008"></a>

## <a id="if-you-see-%22unauthorized%22-%2F-1008"></a><a id="if-you-see-unauthorized-/-1008"></a> 如果你看到“未授权”/ 1008

- 确认网关可访问：本地运行 `openclaw status`；远程则建立 SSH 隧道 `ssh -N -L 18789:127.0.0.1:18789 user@gateway-host`，然后打开 `http://127.0.0.1:18789/`。
- 对于 `AUTH_TOKEN_MISMATCH`，当网关返回重试提示时，客户端可以使用缓存的设备令牌进行一次可信重试；该重试会复用令牌缓存中已批准的作用域（显式传入 `deviceToken`/`scopes` 的调用方会保留其请求的作用域集合）。如果重试后认证仍然失败，请手动解决令牌漂移问题。
- 对于 `AUTH_SCOPE_MISMATCH`，系统已识别设备令牌，但该令牌不包含所请求的作用域；请重新配对或批准新的作用域集合，而不是轮换共享网关令牌。
- 对于 **需要代理身份验证** 或 `AUTH_IDENTITY_HEADER_REQUIRED`，打开配置的 proxy/SSO 仪表板 URL 并在那里登录。请网关管理员检查 WebSocket 升级和帐户访问的身份标头转发。网关令牌不能覆盖可信代理模式；请参阅 [ 受信任代理故障排除](/gateway/trusted-proxy-auth#control-ui-says-proxy-authentication-required)。
- 在该重试路径之外，Control UI 更喜欢挂起的引导令牌，因此主机发出的新切换可以创建或升级浏览器凭据。如果没有挂起的引导程序，显式共享 token/password 优先于存储的设备令牌。
- 在异步 Tailscale 服务路径上，同一 `{scope, ip}` 的失败尝试在失败的身份验证限制器记录它们之前被序列化，因此第二个并发错误重试可能已经显示 `retry later`。
- 有关令牌漂移修复步骤，请参阅[令牌漂移恢复检查清单](/cli/devices#token-drift-recovery-checklist)。
- 对于共享秘密身份验证，从网关主机检索或提供配置的秘密：
  - 令牌：在网关主机上的交互式终端中运行 `openclaw gateway auth-token --show`
  - 密码：解析已配置的 `gateway.auth.password` 或 `OPENCLAW_GATEWAY_PASSWORD`
  - 由 SecretRef 管理的令牌：运行 `openclaw gateway auth-token --show`；如果解析失败，请修复外部密钥提供程序后重新运行
  - 因未配置共享密钥而生成的运行时令牌：运行 `openclaw doctor --generate-gateway-token`，重启网关，然后使用已配置的令牌
- 在仪表板设置中，将令牌或密码粘贴到**Gateway Secret**中，然后连接。
- UI 语言选择器位于 **设置 → 外观 → 语言** 中。

## <a id="related"></a> 相关内容

- [控制 UI](/web/control-ui)
- [WebChat](/web/webchat)
- [`openclaw dashboard`](/cli/dashboard) — 从 CLI 安全地打开 Control UI
