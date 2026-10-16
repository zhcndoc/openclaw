---
summary: "通过 Cloudflare 隧道发布环回网关，并通过 Cloudflare 访问对每个客户端进行身份验证"
read_when:
  - "您想要一个公共 HTTPS 网关 URL 而不打开端口"
  - "您希望 Cloudflare 访问 （SSO） 来验证 Control UI"
  - "您的 CLI、TUI 或节点从 Cloudflare-fronted 网关获取 HTTP 302"
title: "Cloudflare 隧道及通道"
---

在环回上运行网关，通过 Cloudflare 隧道发布它，并让 Cloudflare Access 在每个请求到达 OpenClaw 之前对其进行身份验证。网关保留`gateway.bind: "loopback"`，因此没有端口暴露，不需要入站防火墙规则； `cloudflared` 从主机拨出。

这是一种与 [Tailscale](/gateway/tailscale) 和 [SSH 隧道 ](/gateway/remote) 一起支持的远程访问拓扑。当您需要稳定的公共 HTTPS URL 和 Control UI 前面的身份提供者 SSO 时，请选择它。

## <a id="before-you-begin"></a> 开始之前

- A Cloudflare 帐户，其区域为您的主机名，并且启用了 Cloudflare 零信任。
- `cloudflared` 安装在网关主机以及将使用 CLI 的任何计算机上。
- A 在 `127.0.0.1:18789` 上与 `gateway.bind: "loopback"` 一起运行网关。
- 熟悉此拓扑使用的 [ 可信代理身份验证](/gateway/trusted-proxy-auth)。

## <a id="how-the-pieces-fit"></a> 各部件如何配合

```text
browser / CLI / node  ->  Cloudflare Access (identity)  ->  Tunnel  ->  127.0.0.1:18789
```

Access 对请求进行身份验证并注入身份标头。网关不会重新验证人员身份或验证 Access JWT 签名；它检查受信任的代理源和配置的标头是否存在，然后信任用户标头。由于 `allowLoopback` 还允许其他本地进程呈现这些标头，因此请将网关端口保持为主机专用，并仅在那里运行受信任的工作负载。

## <a id="step-1%3A-route-the-tunnel-to-loopback"></a><a id="step-1-route-the-tunnel-to-loopback"></a> 步骤 1：将隧道路由至环回

添加将主机名映射到网关端口的入口规则，然后将 `cloudflared` 作为网关主机上的服务运行：

```yaml
tunnel: <tunnel-id>
credentials-file: /root/.cloudflared/<tunnel-id>.json
ingress:
  - hostname: gateway.example
    service: http://localhost:18789
  - service: http_status:404
```

请参阅 Cloudflare 自己的文档来创建隧道和 DNS 记录。

## <a id="step-2%3A-protect-the-hostname-with-access"></a><a id="step-2-protect-the-hostname-with-access"></a> 第 2 步：使用 Access 保护主机名

使用允许您的用户的策略为 `gateway.example` 创建 Access 应用程序。请注意 Access 添加到经过身份验证的请求的两个标头，因为网关会在下一步中使用它们：

- `cf-access-authenticated-user-email` — 经过身份验证的身份。
- `cf-access-jwt-assertion` — Access 的签名断言。 OpenClaw 仅检查此标头是否存在且非空白；它不验证 JWT 签名。

### <a id="oidc-sign-in-and-existing-people"></a> OIDC 登录和现有人员

对于 OIDC 登录，请配置通过该身份提供程序允许目标用户的访问策略。例如，使用由提供者维护的签名角色声明。 GitHub 组织策略适用于 GitHub 身份提供商；它不通过单独的 OIDC 提供商授予访问权限。

OpenClaw 通过 Cloudflare Access 的身份端点验证 OIDC 身份，并要求其电子邮件与经过身份验证的用户标头匹配。然后，它通过现有人员配置文件解析该电子邮件。使用同一电子邮件保留该人的个人资料和角色；不同的电子邮件需要现有的链接别名才能解析为该人。 GitHub登录继续验证不可变的GitHub帐户ID。失败的身份验证不会回退到电子邮件匹配。

让身份提供商负责验证电子邮件所有权。创建 OpenClaw 人员配置文件不会通过 Cloudflare 访问授予访问权限。

### <a id="verified-github-credit-through-oidc"></a> 通过OIDC验证GitHub信用

OIDC 提供商可以提供经过验证的 GitHub 帐户，而无需更改登录电子邮件或用于发布拉取请求的帐户。这是可选的并且被禁用，直到您明确信任一个访问颁发者、身份提供者 ID 和声明名称：

```json5
{
  gateway: {
    auth: {
      mode: "trusted-proxy",
      trustedProxy: {
        userHeader: "cf-access-authenticated-user-email",
        requiredHeaders: ["cf-access-jwt-assertion"],
        cloudflareAccessOidc: {
          issuer: "https://example.cloudflareaccess.com",
          providerId: "your-access-identity-provider-id",
          githubAccountIdClaim: "https://openclaw.ai/github-account-id",
        },
      },
    },
  },
}
```

发行者是访问团队来源，不带尾部斜杠。 `providerId` 是 Access 中所选集成的 ID，而不是其名称或 OIDC 用户主题。提供商必须验证 GitHub 帐户的所有权并将其绑定到经过验证的登录电子邮件。其 ID 令牌必须包含不带前导零的正十进制字符串帐户 ID，例如 `"12345"`，在 JavaScript 的安全整数范围内。配置访问权限以转发确切的 [ 自定义 OIDC 声明 ](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/generic-oidc/#custom-oidc-claims)。 OpenClaw 在已认证的 `/cdn-cgi/access/get-identity` 响应中从 `oidc_fields` 中读取，或者在 `oidc_fields` 不存在时从 `custom` 中读取，然后通过 GitHub 验证数字帐户以获取其当前的公共登录信息。当前的 `oidc_fields` 容器优先：如果首选容器缺少声明或其值无效，OpenClaw 不会重试 `custom`。身份提供者 **Test** 预览使用 `oidc_fields`；重新登录后检查经过身份验证的身份端点，以验证 OpenClaw 使用的响应。

缺失或格式错误的可选声明，或未选择的 issuer/provider，将保留普通的仅电子邮件解决方案。格式错误的索赔绝不会发送至 GitHub 或用于创建协会或公共信用。如果可选的 GitHub 帐户查找失败，OpenClaw 将通过正常配置文件和访问策略检查解析经过身份验证的电子邮件。现有的授权配置文件或有效的电子邮件邀请仍然可以登录。电子邮件后备无法满足 GitHub-only 访问要求。

查找失败不会创建 GitHub 身份或公共信用。现有的经过验证的匹配关联和保存的共同作者偏好保持不变；稍后成功的查找可以完成或刷新链接。此行为适用于 `oidc_fields` 和 `custom`。无效的访问身份验证、主体不匹配、有效帐户声明的配置文件绑定冲突以及过期或撤销的访问权限仍然无法正常检查。

现有电子邮件配置文件保留其身份、角色和保存的共同作者首选项。有冲突的 GitHub 帐户不会自动合并配置文件或移动电子邮件；管理员必须通过现有的 `users.linkEmail` 操作来解决该问题。这也适用于首次电子邮件声明已属于另一个配置文件的帐户：在继承该配置文件的角色之前明确链接该电子邮件。显式链接的辅助帐户保留配置文件的主要帐户的公共信用。请参阅 [Gateway 配置文件和 GitHub 信用值 ](/concepts/user-model#gateway-profile-and-github-credit)。

## <a id="step-3%3A-trust-those-headers-in-the-gateway"></a><a id="step-3-trust-those-headers-in-the-gateway"></a> 第 3 步：信任网关中的这些标头

将 `gateway.auth.mode` 设置为 `trusted-proxy` 并命名访问标头。这里需要 `allowLoopback`：`cloudflared` 从 `127.0.0.1` 连接，并且可信代理身份验证否则需要非环回代理。

```json5
{
  gateway: {
    bind: "loopback",
    publicOrigin: "https://gateway.example",
    trustedProxies: ["127.0.0.1", "::1"],
    auth: {
      mode: "trusted-proxy",
      trustedProxy: {
        userHeader: "cf-access-authenticated-user-email",
        requiredHeaders: ["cf-access-jwt-assertion"],
        allowLoopback: true,
      },
    },
  },
}
```

要求 `cf-access-jwt-assertion` 添加第二次存在检查，而不是加密验证。可以连接到网关的本地进程可以提交两个标头，因此不要将此设置视为针对不受信任的本地代码的防御。安全边界是锁定的环回端口加上 Cloudflare 访问，隧道是外部流量的唯一路径。

当省略 `controlUi.allowedOrigins` 时，`publicOrigin` 提供外部会话链接、代理链接指令和浏览器源默认值。您只需要针对不同浏览器策略的显式允许列表；该列表会替换默认值，而不是添加到默认值。有关配置文件、角色、GitHub 和操作设置，请参阅 [ 部署团队服务器](/gateway/team-server)。

## <a id="step-4%3A-decide-how-nodes-and-workers-get-in"></a><a id="step-4-decide-how-nodes-and-workers-get-in"></a> 第4步：决定节点和工作人员如何进入

访问保护主机名上的每条路由，包括节点使用的路由。节点可以在其需要的每个分支上（加入请求、主网关 WebSocket、工作套接字和工作传输）对 Access 进行身份验证，因此推荐的路径不会公开任何内容。

**推荐：为节点提供访问服务令牌。** 将服务身份验证策略添加到应用程序，然后在节点主机上：

```bash
export CF_ACCESS_CLIENT_ID="<client-id>"
export CF_ACCESS_CLIENT_SECRET="<client-secret>"
openclaw connect https://gateway.example/j/<code> --service
```

`openclaw connect` 将这些保留为 `gateway.cloudflareAccess.clientId` / `clientSecret` 下的 env SecretRefs；请参阅 [ 节点 CLI](/cli/node)。唯一的成本是节点在连接命令之前需要这两个值，因此连接链接不再是单独粘贴即可。

**替代：免除自认证路由。** 允许没有 Access 身份的 `/j/*` 和 `/__openclaw__/worker`，保持在工作路由上启用 WebSocket 升级。两者都强制执行自己的短期凭证 - 加入代码对于 TTL 是一次性使用的，每个 IP 受到速率限制，并使用不透明的 404 应答失败；工人准入带有其自己的过期凭证。这使得连接链接可以粘贴即用，但代价是使这两条路由可公开访问。首选服务令牌，除非您需要该入门流程。请参阅 [Nodes](/nodes/node-host#gateway-deployments-that-cannot-host-nodes)。

如果两者都不执行，则即使浏览器正常工作，`openclaw connect` 也会在隧道上失败，因为加入请求将重定向到 Access 登录页面。

## <a id="step-5%3A-connect-each-client"></a><a id="step-5-connect-each-client"></a> 第5步：连接每个客户端

**Control UI.** 打开`https://gateway.example`并通过Access登录。通过可信代理身份验证，网关将您的访问身份映射到操作员会话。

如果在聊天打开时访问权限过期，则聊天连接可以保持活动状态，而新图像和文件请求需要更新网站访问权限。 Control UI 首先尝试通过隐藏的沙盒浏览器导航进行自动更新。如果您的全局 Cloudflare Access 会话仍然有效并且您的浏览器允许其 cookie，则 Access 可以发出新的应用程序 cookie，而无需再次登录。 OpenClaw 在重试失败的附件之前验证访问权限，使您的对话和未发送的草稿保持打开状态。

如果续订仍需要登录，则 Control UI 会打开一个 **登录以继续加载内容** 对话框。过期的全局会话、身份提供商质询或被阻止的第三方 cookie 可能需要此手动步骤。自动续订不会延长 Cloudflare Access 中配置的会话持续时间。选择**登录**，在新选项卡中完成身份验证，然后返回对话。可见失败的附件在验证访问后重试；原始对话和未发送的草稿保持打开状态。 **再次检查**重复访问检查，而**现在不**在不中断聊天的情况下消除提示。普通的网络故障和丢失文件不会触发此对话框。

**CLI 和 TUI.** 这些不携带浏览器 cookie，因此它们在 WebSocket 升级时提供访问令牌。按照 [ 远程访问 ](/gateway/remote#gateway-behind-an-identity-aware-proxy) 中的说明配置 `gateway.remote.edgeAuth`，然后运行 ​​`cloudflared access login https://gateway.example` 一次以缓存令牌。

**Nodes.** 按照步骤 4 中的选择进行操作。

## <a id="verify"></a> 验证

```bash
openclaw tui
```

期望 TUI 达到 `wss://gateway.example` 并显示 `connected`。第一个连接可能会报告 `device pairing required`；在“设置”→“设备”下的 Control UI 中批准它，或在网关主机上运行 `openclaw devices approve --latest` 来预览请求，然后重新运行它打印的批准命令。

达到网关自己的配对提示本身就是 Access 得到满足的证明 - 未经身份验证的请求永远不会达到这种程度。

## <a id="production-readiness"></a> 生产准备就绪

- 保留`gateway.bind: "loopback"`。更宽的绑定会重新暴露隧道旁边的网关并完全绕过访问。
- 将 `trustedProxies` 限制为环回。它是网关将相信其身份标头的地址列表。
- `trustedProxy.deviceAutoApprove`可以自动配对设备以获得Access认证的身份。它删除了手动审批步骤；仅当您同意任何通过 Access 的人都会获得与您列出的范围配对的设备时才启用它。
- 访问令牌在应用程序的会话持续时间内过期。期望 CLI 用户在其令牌失效时重新运行 `cloudflared access login`。

## <a id="troubleshooting"></a> 故障排查

| 症状                                                             | 原因和修复                                                                                                                                     |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gateway rejected websocket upgrade (HTTP 302)` 来自 CLI 或 TUI | Access 拦截了升级。配置`gateway.remote.edgeAuth`；参见[远程访问](/gateway/remote#gateway-behind-an-identity-aware-proxy)。 |
| 浏览器正常，`openclaw connect` 失败                             | Node 路由仍落后于 Access。应用步骤 4 中的选项之一。                                                                          |
| `Exec provider ... exited with code 1`                              | exec 秘密提供程序在经过清理的环境中运行； `cloudflared` 需要 `passEnv: ["HOME"]` 读取其缓存的令牌。                      |
| `secrets.providers.*.command must not be a symlink`                 | 将 `command` 指向已解析的二进制文件，而不是包管理器符号链接。                                                                            |
| 网关启动但每个请求都是匿名的                       | `allowLoopback` 未设置，因此来自本地 `cloudflared` 的标头将被忽略。                                                                    |

## <a id="related"></a> 相关内容

- [远程访问](/gateway/remote)
- [可信代理授权](/gateway/trusted-proxy-auth)
- [节点](/nodes)
- [尾盘](/gateway/tailscale)
- [认证](/gateway/authentication)
