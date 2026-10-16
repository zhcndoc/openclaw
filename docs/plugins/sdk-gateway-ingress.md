---
summary: "用于受信任插件授权的委托人绑定远程 Control UI 传输和网关 RPC"
title: "远程 Control UI 入口"
read_when:
  - "您正在为 Control UI 实现可信插件传输"
  - "您需要远程入口安全和生命周期合同"
  - "您需要将网关 RPC 绑定到同一个人并授予远程 UI"
---

`openclaw/plugin-sdk/gateway-ingress` 导出本金绑定 Control UI 传输、网关 RPC 和 `GatewayControlUiIngressError`。主机在插件的服务上下文中提供可选的 `controlUiIngress` 工厂，仅适用于捆绑插件和插件加载程序认可的经过验证的官方安装。它不是 `api.runtime.gateway` 或工具调用的一部分。

插件在调用 `open()` 或 `bindPrincipal()` 之前必须检查 `capabilityVersion === 2`。否则，较旧的主机可能会忽略个人选项并打开所有者连接。如果该功能不存在或较旧，则报告 OpenClaw 需要更新并保持委派访问禁用；不要替换环回连接或合成网关客户端。工厂需要明确的 `principal`。工厂功能版本与网关有线协议是分开的。

## <a id="open-a-handle"></a> 打开手柄

```typescript
import type {
  GatewayControlUiIngressFactoryV2,
  GatewayIngressPrincipal,
} from "openclaw/plugin-sdk/gateway-ingress";

async function openRemoteUi(
  factory: GatewayControlUiIngressFactoryV2 | undefined,
  principal: GatewayIngressPrincipal,
  signal: AbortSignal,
  assertCurrent: () => void,
) {
  if (!factory || factory.capabilityVersion !== 2) {
    throw new Error("Update OpenClaw to enable principal-bound remote ingress.");
  }
  return factory.open({
    audienceId: "example-grant-id",
    principal,
    publicOrigin: "https://ui.example.com",
    sandboxOrigin: "https://sandbox.example.com",
    operatorScopeCeiling: ["operator.read", "operator.write"],
    frameAncestors: [
      "codex-sandbox:",
      "https://*.web-sandbox.oaiusercontent.com",
      "https://chatgpt.com",
    ],
    signal,
    assertCurrent,
  });
}
```

公共和沙箱来源必须是准确、不同的 HTTPS 来源，没有路径或凭据。 WebSocket `origin` 是实际的浏览器源，必须与该句柄的 `publicOrigin` 完全相同。上下文允许不会更改 `gateway.publicOrigin`、全局允许的来源或主机回退策略。多个实时句柄可以共享两个起源； `audienceId` 标识每个插件拥有的授权。中继必须选择并验证两个源上每个请求的授权，例如使用其自己的浏览器会话 cookie。路径保持不变：配置的 Control UI 挂载和现有根拥有的资源路由仍然具有权威性。没有每个句柄的基本路径选项。发布更改后的网关源策略会停用现有句柄；在当前策略下打开一个新的句柄。主机验证整个请求的帧祖先链，包括需要时的显式 `codex-sandbox:` 祖先、确切的 HTTPS 起源以及 `https://*.<domain>` 形式的 CSP 通配符主机源。其他通配符形式将被拒绝。该策略仅适用于由此句柄提供的响应。沙箱文档还允许句柄的公共起源作为祖先，因此嵌套的 Control UI 框架可以加载它们。

## <a id="principal%2C-consent%2C-and-lifetime"></a><a id="principal-consent-and-lifetime"></a> 原则、同意和终生

`principal` 为必填项，选择现有网关身份：

- `{ kind: "owner" }` 使用共享所有者。它需要令牌或密码身份验证，无需 `gateway.roles`。
- `{ kind: "person", profileId }` 使用网关自己经过身份验证的 Control UI 中批准授予的人员。它需要使用经过验证的 Cloudflare 访问配置文件和 `gateway.roles` 进行可信代理身份验证。代理必须使用 `cf-access-authenticated-user-email` 并需要 `cf-access-jwt-assertion`。丢失、删除、合并和共享所有者配置文件将被拒绝。

不支持的身份验证组合将返回 `unsupported-auth` 以及配置指南。团队授权绝不能使用共享所有者或环回维护密码。该插件从批准 Control UI 呼叫者的认可配置文件中派生 `profileId`，而不是中继参数或声明的电子邮件。这是现有已验证配置文件的委托，而不是新的身份源。

该插件拥有同意 UI 和持久的授权记录。默认提供**读+写**，带`operatorScopeCeiling: ["operator.read", "operator.write"]`。 **Full** 使用 `["operator.admin"]`，它允许每个操作员范围仅在委托人当前权限内。管理员只能获得完全的管理员奇偶校验；即使使用 Full，受限制的人仍然受到限制。这些是集成要求，而不是 SDK 提供的同意屏幕。

上限接受任何已知的 [ 操作符范围 ](/gateway/operator-scopes)，包括 `operator.admin` 或空列表。核心使用与人员当前角色的暗示感知交集：对只读角色的完全授予会产生读取访问权限；空的上限或角色不会产生任何操作员范围。所有者权限是充分的，因此其有效范围是所选择的上限。身份范围授予和插件调用者的管理权限不会扩大此委派。

`audienceId` 标识插件拥有的授权；它不是 OAuth 令牌或浏览器凭据。在转发 HTTP、打开套接字或调用 RPC 之前，插件必须将调用者验证为该确切授权的持有者。插件和中继拥有授权到期、OAuth 刷新限制、持久性和撤销。不要将旧业主补助金重新解释为个人补助金；当其存储的主体丢失或不适合网关时，需要新的批准。

`assertCurrent` 必须同步检查确切授权的实时权限，并在其过时时抛出。核心将其与服务、插件、网关、配置文件、角色以及准入、每个请求和保留效果（包括异步工作之后和披露或发布之前）的附加访问策略权限组合在一起。当授权被撤销时中止 `signal`，以便立即取消开放运输和保留的工作。单独签名或未过期的令牌并不能证明当前的权限。

配置文件删除、身份重新绑定或合并、角色更改以及访问策略撤销隔离现有权限。插件验证其授权仍然有效后，在当前权限下重新打开；关闭的业务不会恢复。这不会持续针对 Cloudflare 重新进行身份验证：仅在外部身份提供商处删除访问权限本身不会撤销插件授权。

## <a id="grant-bound-gateway-rpc"></a> 授权网关 RPC

对于 MCP 工具调用或另一个插件拥有的 RPC 传输，请在相同的功能版本检查后使用 `factory.bindPrincipal({ audienceId, principal, operatorScopeCeiling, signal, assertCurrent })`。它不需要 UI 原点并返回 `GatewayIngressPrincipalBindingV1`：

- `request<T>(method, params, { signal }?)` 通过正常的网关方法、会话、角色和访问策略授权运行，并精确授权的有效范围。它无法从调用插件请求继承额外的管理权限。
- `openControlUi({ publicOrigin, sandboxOrigin, frameAncestors })` 打开 UI 传输共享此绑定的主体解析和授予生命周期。
- `close()` 隔离绑定并中止其 UI 传输，而无需等待正在进行的工作。实时权限检查拒绝以后的效果和发布。

为 UI 和 RPC 共享的授权创建一个绑定。不要为 MCP 调用单独构建所有者客户端。 `factory.open()` 是 UI-first 便利形式：其返回的句柄为相同的授权绑定 RPC 添加了 `requestGateway(method, params, { signal }?)`，而 `request()` 仍然是 HTTP 传输操作。关闭由 `factory.open()` 直接打开的句柄也会关闭其绑定。关闭使用 `binding.openControlUi()` 创建的 UI 句柄会使绑定可用于 RPC 和其他 UI 句柄；致电 `binding.close()` 将其全部撤销。

## <a id="http-and-sockets"></a> HTTP 和插座

返回的 `GatewayControlUiIngressV2` 暴露：

- `presentation`：配置的`basePath`、确切的公共和沙箱来源以及允许的操作员范围上限。
- `request({ surface, method, pathAndQuery, headers, body?, signal })`：流式传输的 `Response` 和 `pluginReadCookies`。 `surface` 为 `control-ui` 或 `sandbox`；路径保留配置的 Control UI 基本路径。
- `openWebSocket({ pathAndQuery, origin, protocols, signal })`：所选协议和`GatewayIngressSocketV1`。主套接字位于基本路径，没有 `/ws` 后缀。现有的 Control UI 辅助插座保留其所属票据和范围检查。
- `close()`：隔离新的准入并中止读取和套接字，而无需等待正在进行的工作。保留的方法在关闭或服务退休后拒绝工作。
- `requestGateway(method, params, { signal }?)`：授权绑定网关 RPC 如上所述。

套接字通过 `send()` 接受文本或二进制 `GatewayIngressMessage` 值，通过 `messages` 异步迭代公开接收到的值，并通过 `closed` 报告其最终关闭代码和原因。当本机 WebSocket 接受写入时，`send()` 进行解析。 Node流提供背压；主机限制请求主体、帧大小、并发 HTTP 流和套接字。

每个句柄允许 16 个 HTTP 流、两个主套接字和两个辅助套接字。 HTTP 请求和响应正文上限为 100 MiB； WebSocket 消息保留网关的 25 MiB 最大值及其预身份验证下限。端点本机限制仍然适用。压缩请求体被拒绝；发送解码后的字节。

消耗或取消HTTP响应体，并读取或关闭套接字。当连接关闭时，套接字槽被释放。失败的准入会立即中止传输；它不会等待处理程序解决。超出限制会产生显式错误。

`pluginReadCookies` 仅描述核心颁发的签名、只读本机资产或 iframe 授权。它不授权转发任意 `Set-Cookie` 标头或网关凭据。运输必须保持这种区别。

错误 `code` 是 `invalid-options`、`unsupported-auth`、`unavailable`、`closed`、`limit-exceeded` 或 `forbidden` 之一。将 `closed` 视为该句柄的终端；不要通过其他身份验证路径重试。

## <a id="browser-device-approval"></a> 浏览器设备审批

每个入口浏览器都以 `operator` 的身份进行连接，对正常的设备质询进行签名，并忽略凭据。实时授权对所有者和人员连接进行身份验证。 Core 保留普通的配对设备行以进行可见性和密钥检查，但从不在任何上限的入口 `hello` 中发出可重用设备令牌。重新连接使用相同的签名密钥和当前授权。具有不同公钥的现有设备 ID 会被拒绝，并且永远不会自动批准。

Ingress 提供的文档带有 `data-openclaw-remote-ingress="true"`。嵌入式 UI 保持与服务文档的网关的连接，请求句柄的有效范围上限，并忽略存储的设备令牌以及共享、引导和本机凭据。它永远不会使用先前访问者的凭据存储入口设备令牌或热承认缓存状态。共享凭证登录门、网关 URL 和秘密控制以及服务工作者注册被禁用；连接错误和重试仍然可用。

人员入口保留该人员的会话可见性、存在和资源访问权限。所有者入口保留共享所有者归属，这不会扩展句柄的范围。问题需要单独的 `operator.questions` 范围或经过验证的具有合格会话访问权限的个人身份；共享所有者不是个人身份。因此，嵌入的 UI 会跳过 read/write 上限下的所有者问题请求，而符合资格的人或明确的 questions/admin-scoped 拨款可以使用它们。

Hello 公布该句柄的公共来源，并且 board、Canvas 和 MCP App 沙箱响应使用其沙箱来源。内部插件选项卡路径仍然相对于所选网关，因此它们的读取 cookie 路径和注册路由保持不变；显式外部选项卡 URL 保留其目标。

批准的范围是在有效授权和角色上限内请求的范围；省略范围或发送空范围请求会选择有效上限。高于此要求的请求将被拒绝。设备范围升级不能扩大插件授权；通过插件的授权所有者更改同意。

这些浏览器出现在正常的 **Devices** 列表、`openclaw devices list` 和设备配对 RPC 中。撤销插件授权以结束委托访问。关闭或撤销它会隔离其入口路径并保留工作，而无需删除配对设备可见性行。 Ingress 不会创建可在网关的直接侦听器上重复使用的承载凭证。通过其他身份验证路径获取的现有凭据保留其自己的撤销所有者。

## <a id="security-boundary"></a> 安全边界

在策略运行之前，核心将每个虚拟请求和连接标记为 `remote-forwarded`。本地客户端信任、静默本地配对、浏览器所有者恢复、引导凭据、Tailscale 身份、可信代理标头、无设备访问和非操作员角色不可用。实时句柄提供远程身份验证和批准边界。正常的设备质询、签名、密钥、范围、会话和撤销检查仍然具有权威性。转发的身份标头无法更改绑定主体。

HTTP 表面允许 Control UI 文档、资产、配置和媒体资源、声明的插件面板以及有限的活动响应。启动配置和只读 UI 资源可以使用实时插件授权，无需浏览器设备令牌。头像、工作区图标和私有所有者后台读取保留其现有的资源处理程序。仅限所有者的资源例外仍然仅限所有者；个人授予永远不会冒充共享所有者来加载资源。签名的资源 cookie 必须与所选人员匹配，并受实时授权的约束。当直接听众需要时，仍然需要媒体票证和特定于资源的策略。 Surface 拒绝通用 API、Webhook、`/v1`、独立 MCP、工作节点和节点传输以及未声明的插件路由。 Service Worker 和本地浏览器引导恢复被阻止。沙箱表面仅提供其专用外壳和声明的公共渲染器资源，而不提供网关数据。

HTTP 传输不是任意转发或专用网络代理。 MCP 集成使用单独的授权绑定 RPC 操作，而不是 HTTP 路由限额。中继可以读取和修改其转发的活动内容并行使授权的允许功能；该连接未针对该中继进行端到端加密。

成绩单图像门票由 message/media 所有者独立于入口补助金发行。它们现有的直接监听者承载生命周期没有改变；入口兑换还会检查所选主体和会话。

中继拥有浏览器会话路由和托管；仅此传输并不是完整的远程 UI 部署。
