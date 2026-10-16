---
summary: "将浏览器和电话与网关配对，并通过 Tailscale 到达 Control UI"
read_when:
  - "首次连接新浏览器或手机"
  - "从网关主机外部到达 Control UI"
  - "仪表板加载空白或报告协议不匹配"
title: "连接并配对"
sidebarTitle: "连接并配对"
---

从新的浏览器、手机或网络访问 Control UI，并在连接失败时修复连接。

## <a id="device-pairing-(first-connection)"></a><a id="device-pairing-first-connection"></a> 设备配对（首次连接）

网关认证成功后，从新浏览器或设备进行连接通常需要**一次性配对批准**，此时会显示 `disconnected (1008): pairing required`。在网关主机上，`openclaw dashboard` 是推荐的所有者操作路径：它会打开一个短期有效、仅可使用一次的配对链接，并为该确切的已签名浏览器保留持久的管理员凭据。在同一浏览器中打开新的链接，也可以修复之前受限的凭据；其他浏览器配置文件无法继承或重放此授权。

<Steps>
  <Step id="list-pending-requests" title="列出待处理的请求">
    ```bash
    openclaw devices list
    ```
  </Step>
  <Step id="approve-by-request-id" title="按要求批准 ID">
    ```bash
    openclaw devices approve <requestId>
    ```
  </Step>
</Steps>

在等待批准期间保持页面打开。它等待决定并在请求获得批准后自行连接； **立即检查** 让您立即重试。

如果操作员拒绝来自 CLI 或 **Devices** 的浏览器请求，等待页面将显示 **Access request returned** 并停止自动重试。选择 **再次请求** 以提交另一个请求。未答复的请求显示 **访问请求已过期**，未拒绝。这些结果属于实时连接，而不是存储的拒绝历史记录：重新加载页面可能会再次请求批准。拒绝一个浏览器不会影响另一浏览器的待处理请求。

如果登录屏幕显示 **配对链接不再有效**，则一次性仪表板链接可能已过期或已被使用。在网关主机上运行 `openclaw dashboard` 并打开它打开或复制的新链接。如果该主机上没有浏览器或剪贴板访问权限，请运行 `openclaw dashboard --json` 并在十分钟内打开其 `browserUrl`。此错误并不意味着共享网关令牌或密码需要更改。

如果浏览器重试与更改后的身份验证详细信息（role/scopes/public 密钥）配对，则先前的待处理请求将被取代并创建新的 `requestId`；在批准之前重新运行 `openclaw devices list`。

通过普通存储或共享凭据将已配对的浏览器从读取访问权限切换到 write/admin 访问权限被视为批准升级，而不是静默重新连接：OpenClaw 保持旧批准处于活动状态，阻止更广泛的重新连接，并要求您明确批准新范围集。少数例外是通过 `openclaw dashboard` 或图形登录在网关主机上发出新的所有者切换；它只能升级同一签名浏览器来赎回一次性交接。

当连接的Control UI报告访问受限时，打开**收件箱>系统>受限访问**，然后单击**请求管理**。在移动设备上，打开侧边栏即可到达收件箱。浏览器通过其现有连接提交待处理的设备范围升级请求；在网关主机上运行显示的 `openclaw devices approve <requestId>` 命令，或在另一个也具有 `operator.pairing` 的具有管理功能的浏览器中从 **Devices** 进行批准。在批准完成时保持请求选项卡连接，以便它可以在重新连接之前接收并存储新旋转的设备令牌。 **Retry** 重新附加到挂起的请求。 **Cancel** 停止本地等待但不拒绝设备请求；如果您在批准之前取消或断开连接，请在下次连接时使用正常的配对修复路径。

如果设备之前已获准进行管理员访问，但其令牌后来被缩小，则批准请求将保留该令牌限制。 UI 解释说，配对已获得批准，但未恢复请求的访问权限，而不是报告拒绝或提供无法解除限制的重试。在网关主机上运行 `openclaw dashboard --json` 并在同一浏览器中打开其新的一次性 `browserUrl`，以通过所有者切换恢复管理员访问权限。

对于 LAN 或远程浏览器，请保留相同的 Control UI 源和网关 URL，以便切换修复现有的浏览器标识。如果`browserUrl`使用环回，则将其基地址替换为当前Control UI地址，并将其`gatewayUrl`片段参数替换为当前网关WebSocket URL。保留剩余的一次性配对片段值，并在十分钟内打开链接。仅使用同一网关的地址；不要将配对链接发送到另一台主机。

一旦批准，设备就会被记住，除非你使用 `openclaw devices revoke --device <id> --role <role>` 撤销它，否则不会再次要求重新批准。有关令牌轮换、撤销，以及 Paperclip / `openclaw_gateway` 首次运行批准流程，请参阅 [设备 CLI](/cli/devices)。

如果网关因超出分配的操作员角色而拒绝升级，则访问详细信息将显示管理员更改指南，而不会显示 **Retry**。管理员必须更改角色，请求才能成功；设备批准不能超越该上限。 **Retry** 仍可用于待处理、拒绝或过期的批准请求以及可重试的失败。 **Cancel** 会清除本地请求状态，以便您可以在解决根本问题后发出新请求。

<Note>
- 来自环回 TCP 对等方的直接本地 Control UI 连接（`127.0.0.1` 或 `::1`，通常以 `localhost` 的形式到达），不带 forwarded/proxy 标头，仅在网关身份验证成功并且浏览器显示后才能自动批准设备配对设备身份。 token/password模式下，第一次连接仍然需要配置的共享密钥；这种自动批准不是令牌绕过。
- 只有在明确配置 `gateway.auth.mode: "none"` 时，直接回环连接才不需要共享密钥。这会禁用网关认证，并不是推荐的 Control UI 设置。只有在各自的身份检查成功时，Tailscale Serve 和受信任代理模式才能避免粘贴共享密钥。
- 当 `gateway.auth.allowTailscale: true`、Tailscale 身份验证并且浏览器显示其设备身份时，Tailscale Serve 可以跳过 Control UI 操作员会话的配对往返。无设备浏览器和节点角色连接仍然遵循正常的设备检查。
- Direct Tailnet 绑定和 LAN 浏览器连接仍然需要明确批准。没有设备标识的浏览器配置文件无法使用环回自动批准。
- 每个浏览器配置文件都会生成唯一的设备 ID，因此切换浏览器或清除浏览器数据都需要重新配对。
- 隐私窗口以及退出时会丢弃网站数据的浏览器配置文件（包括 Firefox 的“从不记住历史记录”模式）也会丢弃存储的设备身份和按设备区分的令牌。它们每次重启后都会显示为新浏览器；请使用持久化的浏览器配置文件以保持配对，并在已配对设备列表变得过长时，使用 `openclaw devices remove <deviceId>` 删除过时条目。

</Note>

## <a id="pair-a-mobile-device"></a> 配对移动设备

已配对的管理员无需打开终端即可创建 iOS/Android 连接 QR：

<Steps>
  <Step id="open-mobile-pairing" title="打开手机配对">
    选择 **设备**，然后在 **设备** 卡片中点击 **配对设备**。
  </Step>
  <Step id="connect-the-phone" title="连接手机">
    在OpenClaw手机应用程序中，打开**Settings**→**Gateway**并扫描QR代码。您可以复制并粘贴设置代码。
  </Step>
  <Step id="confirm-the-connection" title="确认连接">
    官方 iOS/Android 应用会自动连接。如果 **待批准** 显示有请求，请在批准前检查其角色和权限范围。
  </Step>
</Steps>

创建设置代码需要`operator.admin`； **配对设备** 在侧边栏身份菜单和没有它的会话设置中被禁用。具有 `operator.pairing` 的操作员仍可以审核和批准来自 **Devices** 的合格操作员设备请求。设置代码包含短期引导凭据，因此在 QR 和复制的代码有效时将其视为密码。对于远程配对，网关必须解析为 `wss://`（例如，通过 Tailscale Serve/Funnel）；普通 `ws://` 仅限于环回和私有 LAN 地址。有关完整的安全性和后备详细信息，请参阅 [Pairing](/channels/pairing#pair-from-the-control-ui-recommended)。

## <a id="runtime-config-endpoint"></a> 运行时配置端点

Control UI 从 `/control-ui-config.json` 获取其运行时设置，相对于网关的 Control UI 基本路径进行解析（例如基本路径 `/__openclaw__/` 下的 `/__openclaw__/control-ui-config.json`）。该端点由网关 HTTP 身份验证进行控制：未经身份验证的浏览器无法获取它，并且成功获取需要有效的网关 token/password 或可信代理身份。 Tailscale 标头身份验证适用于 Control UI WebSocket，而不是此 HTTP 端点。

本地和数据 URL 代理化身在此响应和浏览器身份 RPC 中使用 [ 经过身份验证的化身 URL](/web/control-ui/security-model#avatar-route-auth)，从而使启动 JSON 保持较小。本机和 CLI RPC 客户端保留其内联头像表示。

## <a id="pwa-install-and-web-push"></a> PWA 安装与 Web Push

Control UI 提供了 `manifest.webmanifest` 和 service worker，因此现代浏览器可以将其安装为独立的 PWA。即使标签页或浏览器窗口未打开，Web Push 也能让 Gateway 通过通知唤醒已安装的 PWA。

在手机上，聊天和新会话共享设备安全区域内的普通侧边沟。安装的应用程序使用完整的独立画布；浏览器选项卡遵循动态视口。当浏览器报告键盘大小的视觉视口缩小时，外壳会将编辑器保留在其上方，并在键盘关闭时恢复底部安全区域，即使编辑器仍然具有焦点。捏合缩放仍然由浏览器控制。没有 VisualViewport 的浏览器保留 CSS 布局。

在 macOS 应用中，“通知”设置页面显示的是应用原生通知权限，而不是浏览器推送权限，因为该应用以原生方式发送通知。

请参阅[通知](/web/notifications)了解浏览器和 macOS 的设置步骤。

如果 OpenClaw 更新后页面立即显示 **协议不匹配**，请先使用 `openclaw dashboard` 重新打开控制面板并执行硬刷新。如果仍然失败，请清除控制面板来源的网站数据，或在浏览器隐私窗口中测试；旧标签页或浏览器 service worker 缓存可能会继续运行更新前的 Control UI bundle，并与较新的 Gateway 配合运行。

| 表面                                                                | 它的作用                                                                |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `ui/public/manifest.webmanifest`                                       | PWA 清单。浏览器在其可访问后会提供“安装应用”选项。            |
| `ui/public/sw.js`                                                      | 处理 `push` 事件和通知点击的 service worker。          |
| `state/openclaw.sqlite` → `config_machine_state` (`webPush.vapidKeys`) | 用于签署 Web Push 负载的自动生成 VAPID 密钥对。                |
| `state/openclaw.sqlite` → `web_push_subscriptions`                     | 持久化浏览器端点、密钥、device/profile 绑定和时间戳。 |

从已停用的 `push/vapid-keys.json` 和 `push/web-push-subscriptions.json` 存储中升级时，`openclaw doctor --fix` 会导入相关数据。运行该修复操作前请停止 Gateway，以免旧进程在导入过程中重新创建已停用的状态。升级后使用 Web Push 前请先运行修复操作；当任一已停用的数据源仍存在，或 Doctor 的声明操作被中断时，注册、发送、删除和密钥解析都会拒绝继续执行。Gateway 运行时仅读写 SQLite。

如果你希望固定密钥（用于多主机部署、密钥轮换或测试），可以通过 Gateway 进程的环境变量覆盖 VAPID 密钥对：

- `OPENCLAW_VAPID_PUBLIC_KEY`
- `OPENCLAW_VAPID_PRIVATE_KEY`
- `OPENCLAW_VAPID_SUBJECT`（默认为 `https://openclaw.ai`）

一个服务工作人员注册范围具有一个浏览器推送订阅，因此具有一个应用程序服务器密钥。如果安装的PWA在多个逻辑网关之间切换，则在每个网关上配置相同的public/private VAPID对，并设置每个网关的`gateway.publicOrigin`；否则，注册将被拒绝，并显示 VAPID- 身份不匹配。共享私有 VAPID 密钥和浏览器端点会创建一个推送签名信任域，因此仅在相互信任的网关之间执行此操作。从单独的 HTTPS 源或基本路径范围安装的 PWA 具有单独的注册，不需要共享密钥。

Control UI 使用这些作用域受限的 Gateway 方法来注册和测试浏览器订阅：

- `push.web.vapidPublicKey` 获取当前的 VAPID 公钥。
- `push.web.subscribe` 注册一个 `endpoint` 加上 `keys.p256dh`/`keys.auth`；网关将其绑定到经过身份验证的浏览器设备和当前用户配置文件。
- `push.web.unsubscribe` 删除已注册的端点。
- `push.web.test` 向已注册的浏览器订阅发送测试通知。

等待执行和插件批准也会触发 Web 推送。批准交付范围比 `push.web.test` 更窄：网关仅针对其配对设备、当前运营商令牌、配置文件角色和批准可见性仍授权请求的绑定订阅。旧版未绑定订阅仅处于测试状态，直到 Control UI 重新连接并协调它们。推送有效负载包含通用文本和经过身份验证的 `/approve/<approvalId>` 链接，而不是批准详细信息。

<Note>
Web Push 独立于 iOS APNS 中继路径（有关中继支持的推送，请参见 [配置](/gateway/configuration)）以及 `push.test` 方法，后者面向原生移动端配对。
</Note>

## <a id="tailnet-access-(recommended)"></a><a id="tailnet-access-recommended"></a> Tailnet 访问（推荐）

让 Gateway 保持在 loopback 上运行，并让 Tailscale Serve 通过 HTTPS 代理它：

```bash
openclaw gateway --tailscale serve
```

打开 `https://<magicdns>/`（或你配置的 `gateway.controlUi.basePath`）。

默认情况下，当 `gateway.auth.allowTailscale` 为 `true` 时，Control UI/WebSocket 服务请求可以通过 Tailscale 身份标头 （`tailscale-user-login`） 进行身份验证。 OpenClaw 通过使用 `tailscale whois` 解析 `x-forwarded-for` 地址并将其与标头匹配来验证身份，并且仅在其专用托管 Tailscale 侦听器上接受具有 Tailscale 的 `x-forwarded-*` 标头的这些内容。对于具有浏览器设备身份的 Control UI 操作员会话，此经过验证的服务路径还会跳过设备配对往返；无设备浏览器和节点角色连接仍然遵循正常的设备检查。如果您希望即使对于服务流量也需要显式共享秘密凭据，请设置 `gateway.auth.allowTailscale: false`，然后使用 `gateway.auth.mode: "token"` 或 `"password"`。

对于该异步 Serve 身份验证路径，同一客户端 IP 和身份验证范围的失败身份验证尝试会在写入速率限制之前进行串行处理。因此，来自同一浏览器的并发错误重试可能会在第二个请求中显示 `retry later`，而不是让两个普通的不匹配请求并行竞争。

<Warning>
无令牌服务身份验证假定网关主机是可信的。如果不受信任的本地代码可能在该主机上运行，​​则需要 token/password 身份验证。
</Warning>

## <a id="insecure-http"></a> 不安全 HTTP

通过普通 HTTP（`http://<lan-ip>` 或 `http://<tailscale-ip>`）打开仪表板可以正常工作：生成设备身份并使用纯 JS Ed25519 进行签名，因此配对不依赖于 WebCrypto 或安全上下文。签名密钥永远不会离开浏览器，这使其成为明文传输无法泄漏的唯一凭证 - 与共享令牌不同，HTTP 连接的任何路径观察者都可以读取共享令牌。

普通 HTTP 仍然是降级传输：路径上的主动攻击者可以修改页面并捕获其中的任何内容。尽可能选择 HTTPS — Tailscale Serve 为您提供无需配置的真实证书 — 并将 HTTP 视为 LAN- 的唯一便利。浏览器还保留 HTTP 上的安全上下文功能（例如密钥），并且 Chrome 的本地网络访问规则越来越多地限制纯文本本地请求。

支持的无设备例外是通过 `gateway.auth.mode: "trusted-proxy"` 成功进行操作员 Control UI 认证。没有一个可持久化的配置开关可以禁用设备身份。

**推荐设置：** HTTPS通过`https://<magicdns>/`（Tailscale服务）或UI本地`http://127.0.0.1:18789/`（在网关主机上）。

<AccordionGroup>
  <Accordion id="trusted-proxy-note" title="可信代理注释">
    - 成功的可信代理认证可以允许**操作员** Control UI 会话在没有设备身份的情况下接入。
    - **不将** 扩展到节点角色 Control UI 会话。
    - 同主机回环反向代理要求同时在 `gateway.trustedProxies` 中配置回环地址，并将 `gateway.auth.trustedProxy.allowLoopback: true`；请参见[可信代理认证](/gateway/trusted-proxy-auth)。

  </Accordion>
</AccordionGroup>

有关 HTTPS 设置指南，请参见 [Tailscale](/gateway/tailscale)。

## <a id="blank-control-ui-page"></a> 空白 Control UI 页

如果浏览器加载空白仪表板并且 DevTools 没有显示有用的错误，则扩展或早期内容脚本可能会阻止 JavaScript 模块应用程序进行评估。静态页面包括一个普通的 HTML 恢复面板，当 `<openclaw-app>` 启动后未完成其第一次渲染时，会出现该面板。当浏览器仍在下载初始应用程序模块时，面板显示 **Control UI 仍在加载** 并保持这些下载运行。一旦模块加载完成但没有渲染，自动恢复可以请求新页面。 **继续等待**取消一个挂起的恢复请求，并给当前页面更多的时间； **再试一次**显式地重新加载它。

在更改浏览器环境后，使用面板中的 **重试** 操作，或在完成以下检查后手动重新加载：

- 禁用会注入到所有页面的扩展，尤其是带有 `<all_urls>` 内容脚本的扩展。
- 尝试无痕窗口、干净的浏览器配置文件，或其他浏览器。
- 保持网关运行，并在更改浏览器后验证同一个仪表盘 URL。
