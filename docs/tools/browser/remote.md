---
summary: "本地与远程控制、节点浏览器代理和托管 CDP 提供程序"
title: "远程和托管浏览器"
read_when:
  - "浏览器与网关运行在不同的机器上"
  - "您正在附加到 Browserless、Browserbase 或 Notte"
  - "您需要接受的 CDP URL 形状"
---

## <a id="local-vs-remote-control"></a> 本地控制与远程控制

- **本地控制（默认）：**网关启动环回控制服务并可以启动本地浏览器。无目标操作可以启动它（例如，`open`、`navigate` 或 `openclaw browser start`）。通过 `targetId`、选项卡 ID 或标签命名选项卡的操作永远不会启动已停止的浏览器，因为新浏览器无法包含该选项卡；启动浏览器或打开新选项卡，然后选择当前目标。
- **远程控制（节点主机）：**运行节点主机（参见[节点](/nodes)用于配对和[节点主机CLI](/cli/node)为了`openclaw node run`）在有浏览器的机器上；网关将浏览器操作代理给它。
- **Remote CDP：** 设置 `browser.profiles.<name>.cdpUrl`（或 `browser.cdpUrl`）以附加到基于 Chromium- 的远程浏览器。在这种情况下，OpenClaw 将不会启动本地浏览器。
- 对于环回上外部管理的 CDP 服务（例如发布到 `127.0.0.1` 的 Docker 中的无浏览器），还设置 `attachOnly: true`。没有 `attachOnly` 的环回 CDP 被视为本地 OpenClaw- 托管浏览器配置文件。
- `headless` 只影响 OpenClaw 启动的本地托管配置文件。它不会重启或更改现有会话或远程 CDP 浏览器。
- `executablePath` 遵循相同的本地托管配置文件规则。在正在运行的本地托管配置文件上更改它会将该配置文件标记为 restart/reconcile，以便下次启动时使用新的二进制文件。

停止行为会因配置文件模式而不同：

- 本地托管配置文件：`openclaw browser stop` 会停止 OpenClaw 启动的浏览器进程
- 仅 attach 和远程 CDP 配置文件：`openclaw browser stop` 关闭活动控制会话并释放 Playwright/CDP 模拟覆盖（视口、配色方案、区域设置、时区、离线模式和类似状态），即使 OpenClaw 没有启动浏览器进程

远程 CDP URL 可以包含身份验证：

- 查询令牌（e.g.、`https://provider.example?token=<token>`）
- HTTP 基本身份验证（e.g.、`https://user:pass@provider.example`）

OpenClaw 在调用 `/json/*` 端点以及连接 CDP WebSocket 时都会保留认证信息。请优先使用环境变量或机密管理器来管理令牌，而不是将其提交到配置文件中。

## <a id="node-browser-proxy-(zero-config-default)"></a><a id="node-browser-proxy-zero-config-default"></a> Node 浏览器代理（零配置默认）

如果您在具有浏览器的计算机上运行 **node 主机**，则当网关主机没有本地浏览器功能时，OpenClaw 可以自动将浏览器工具调用路由到该节点。自动路由更喜欢主机，包括已安装可执行文件的已停止的托管浏览器。显式 `target="node"`、`node` 选择器或 `gateway.nodes.browser.node` 会覆盖该首选项； `target="host"` 始终保留在主机上。

即使未安装托管浏览器可执行文件，所选主机配置文件也拥有现有会话、扩展、仅附加和远程 CDP 连接。启动失败、无效的可执行设置、权限错误和页面操作失败均保留在该所有者身上； OpenClaw 不会在另一台机器上重播它们。仅在所选节点处理请求之前，才允许从所选节点自动进行主机回退。一旦操作到达节点，其后续快照或设置将保留在该节点上，而不是切换浏览器。

当未选择网关或节点路由时，独立运行（例如 `openclaw agent exec`）使用主机浏览器。他们不需要网关凭据来进行本地浏览器控制。沙箱路由和主机控制限制仍然适用。要从独立运行中通过本地网关发现浏览器节点，请设置 `gateway.nodes.browser.mode="auto"`；仅当本地功能不可用时才运行发现。显式节点目标或引脚、远程网关配置或 `OPENCLAW_GATEWAY_URL` 也使节点发现保持启用状态。显式节点目标和引脚保留连接和身份验证错误。

注意：

- 节点主机通过一个 **代理命令** 暴露其本地浏览器控制服务器。
- 配置文件来自节点自身的 `browser.profiles` 配置（与本地相同）。
- 代理命令从不允许持久配置文件突变（`create-profile`、`delete-profile`、`reset-profile`），无论`allowProfiles`如何；直接在节点上进行这些更改。
- `nodeHost.browserProxy.allowProfiles` 是可选的。对于 legacy/default 行为，将其留空：所有配置的配置文件仍然可以通过代理访问。
- 如果你设置了 `nodeHost.browserProxy.allowProfiles`，OpenClaw 会将其视为最小权限边界，仅限制代理可目标指向的配置文件名称。
- Requests 在准备工作时保留其选择的配置文件。节点在浏览器操作之前（包括启动或上传准备之后）重新检查代理和配置文件访问。
- 如果你不想启用它，可以禁用：
  - 在节点上：`nodeHost.browserProxy.enabled=false`
  - 在网关上：`gateway.nodes.browser.mode="off"`（也接受 `"auto"` 以首选主机并回退到单个连接的浏览器节点，或 `"manual"` 以要求显式节点选择或配置的引脚）

## <a id="browserless-(hosted-remote-cdp)"></a><a id="browserless-hosted-remote-cdp"></a> Browserless（托管远程 CDP）

[Browserless](https://browserless.io) 是托管的 Chromium 服务，它通过 HTTPS 和 WebSocket 公开 CDP 连接 URL。 OpenClaw 可以使用任一形式，但对于远程浏览器配置文件，最简单的选项是来自 Browserless 连接文档的直接 WebSocket URL。

示例：

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "browserless",
    profiles: {
      browserless: {
        cdpUrl: "wss://production-sfo.browserless.io?token=<BROWSERLESS_API_KEY>",
      },
    },
  },
}
```

注意：

- 将 `<BROWSERLESS_API_KEY>` 替换为你真实的 Browserless 令牌。
- 选择与你的 Browserless 账户匹配的区域端点（参见其文档）。
- 如果 Browserless 提供的是 HTTPS 基础 URL，你可以将其转换为 `wss://` 以进行直接 CDP 连接，或者保留 HTTPS URL 并让 OpenClaw 发现 `/json/version`。

### <a id="browserless-docker-on-the-same-host"></a> 同一主机上的 Browserless Docker

当 Browserless 由 Docker 自托管且 OpenClaw 运行在主机上时，将 Browserless 视为外部托管的 CDP 服务：

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "browserless",
    profiles: {
      browserless: {
        cdpUrl: "ws://127.0.0.1:3000",
        attachOnly: true,
      },
    },
  },
}
```

`browser.profiles.browserless.cdpUrl` 中的地址必须能够从 OpenClaw 进程访问。Browserless 也必须声明一个可访问的匹配端点； 将 Browserless 的 `EXTERNAL` 设置为与 OpenClaw 可访问的相同 WebSocket 基础地址，例如 `ws://127.0.0.1:3000`、`ws://browserless:3000`，或稳定的私有 Docker 网络地址。如果 `/json/version` 返回的 `webSocketDebuggerUrl` 指向一个 OpenClaw 无法访问的地址，那么 CDP 的 HTTP 部分看起来可能正常，而 WebSocket 附加仍然会失败。

对于回环上的 Browserless 配置文件，不要让 `attachOnly` 处于未设置状态。没有 `attachOnly` 时，OpenClaw 会将回环端口视为本地托管浏览器配置文件，并可能报告该端口正在使用但并非由 OpenClaw 拥有。

## <a id="direct-websocket-cdp-providers"></a> 直接 WebSocket CDP 提供商

某些托管浏览器服务公开 **direct WebSocket** 端点，而不是基于标准 HTTP- 的 CDP 发现 （`/json/version`）。 OpenClaw 接受三个 CDP URL 形状并自动选择正确的连接策略：

- **HTTP(S) 发现** - `http://host[:port]` 或 `https://host[:port]`。 OpenClaw 调用 `/json/version` 以发现 WebSocket 调试器 URL，然后连接。无 WebSocket 回退。
- **直接 WebSocket 端点** - `ws://host[:port]/devtools/<kind>/<id>` 或 `wss://...`，路径为 `/devtools/browser|page|worker|shared_worker|service_worker/<id>`。 OpenClaw 通过 WebSocket 握手直接连接，并完全跳过 `/json/version`。
- **裸 WebSocket 根** - `ws://host[:port]` 或 `wss://host[:port]`，无 `/devtools/...` 路径（e.g.） [无浏览器](https://browserless.io)、[浏览器库](https://www.browserbase.com)）。 OpenClaw 首先尝试 HTTP `/json/version` 发现（将方案标准化为 `http`/`https`）；如果发现返回 `webSocketDebuggerUrl`，则使用它，否则 OpenClaw 会退回到裸根处的直接 WebSocket 握手。如果通告的 WebSocket 端点拒绝 CDP 握手，但配置的裸根接受它，则 OpenClaw 也会回退到该根。这使得指向本地 Chrome 的裸 `ws://` 仍然可以连接，因为 Chrome 只接受来自 `/json/version` 的特定每个目标路径上的 WebSocket 升级，而托管提供程序在其发现端点通告短期的时仍然可以使用其根 WebSocket 端点URL 不适用于 Playwright CDP。

`openclaw browser doctor` 使用相同的发现优先、WebSocket- 回退逻辑作为运行时附加，因此连接成功的裸根 URL 不会被诊断报告为无法访问。

### <a id="browserbase"></a> 浏览器库

[Browserbase](https://www.browserbase.com) 是一个用于运行无头浏览器的云平台，内置 CAPTCHA 解决、隐身模式和住宅代理。

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "browserbase",
    profiles: {
      browserbase: {
        cdpUrl: "wss://connect.browserbase.com?apiKey=<BROWSERBASE_API_KEY>",
      },
    },
  },
}
```

注意：

- [注册](https://www.browserbase.com/sign-up)并从 [概览面板](https://www.browserbase.com/overview)复制你的 **API 密钥**。
- 将 `<BROWSERBASE_API_KEY>` 替换为你真实的 Browserbase API 密钥。
- Browserbase 会在 WebSocket 连接时自动创建浏览器会话，因此无需手动创建会话步骤。
- 查看 [定价](https://www.browserbase.com/pricing) 以了解当前免费套餐限制和付费方案。
- 查看 [Browserbase 文档](https://docs.browserbase.com) 获取完整的 API 参考、SDK 指南和集成示例。

### <a id="browser-use"></a> 浏览器使用

[Browser Use](https://browser-use.com) 通过其 CDP WebSocket 端点提供托管云浏览器。

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "browser-use",
    profiles: {
      "browser-use": {
        cdpUrl: "wss://connect.browser-use.com?apiKey=<BROWSER_USE_API_KEY>&proxyCountryCode=us",
      },
    },
  },
}
```

注意：

- [注册](https://cloud.browser-use.com)并从[设置-> API Keys](https://cloud.browser-use.com/settings?tab=api-keys)复制您的API密钥。
- 将 `<BROWSER_USE_API_KEY>` 替换为您的真实浏览器使用 API 密钥。
- 可选查询参数包括用于持久浏览器配置文件的 `profileId`、用于特定于国家/地区的路由的 `proxyCountryCode` 以及用于以分钟为单位的会话持续时间（最多 240）的 `timeout`。
- 请参阅 [ 浏览器使用 OpenClaw 指南 ](https://docs.browser-use.com/cloud/tutorials/integrations/openclaw) 了解更多示例和提供程序选项。

### <a id="notte"></a> 注释

[Notte](https://www.notte.cc) 是一个用于运行无头浏览器的云平台，具有内置隐形、住宅代理和 CDP-native WebSocket 网关。

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "notte",
    profiles: {
      notte: {
        cdpUrl: "wss://us-prod.notte.cc/sessions/connect?token=<NOTTE_API_KEY>",
      },
    },
  },
}
```

注意：

- [注册](https://console.notte.cc)并从控制台设置页面复制你的 **API 密钥**。
- 将 `<NOTTE_API_KEY>` 替换为你真实的 Notte API 密钥。
- Notte 会在 WebSocket 连接时自动创建浏览器会话，因此无需手动创建会话步骤。会话会在 WebSocket 断开时销毁。
- 查看 [定价](https://www.notte.cc/#pricing) 以了解当前免费套餐限制和付费方案。
- 查看 [Notte 文档](https://docs.notte.cc) 获取完整的 API 参考、SDK 指南和集成示例。
