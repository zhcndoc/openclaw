---
summary: "在网关上注册插件 HTTP 路由及其身份验证、范围和生命周期规则"
read_when:
  - "您正在从插件公开 HTTP 端点或 Webhook"
  - "您需要插件路由的身份验证和运行时范围规则"
  - "您正在注册或替换通道生命周期代码中的路由"
title: "网关路由"
sidebarTitle: "网关路由"
---

插件如何在网关上注册 HTTP 端点，以及这些路由遵循的身份验证、范围、替换和准入规则。 [插件架构内部](/plugins/architecture-internals)指南的一部分。

## <a id="gateway-http-routes"></a> Gateway HTTP 路由

插件可以使用 `api.registerHttpRoute(...)` 暴露 HTTP 端点。

```ts
api.registerHttpRoute({
  path: "/acme/webhook",
  auth: "plugin",
  match: "exact",
  handler: async (_req, res) => {
    res.statusCode = 200;
    res.end("ok");
    return true;
  },
});
```

路由字段：

- `path`: Gateway HTTP 服务器下的路由路径。
- `auth`：必填，`"gateway"` 或 `"plugin"`。使用 `"gateway"` 要求正常网关身份验证，或使用 `"plugin"` 进行插件管理的 auth/webhook 验证。
- `match`: 可选。`"exact"`（默认）或 `"prefix"`。
- `handleUpgrade`: 可选，用于处理同一路由上的 WebSocket 升级请求。
- `replaceExisting`: 可选。仅动态生命周期注册要替换自身现有路由时必需。
- `handler`: 路由处理请求时返回 `true`。

注意：

- `api.registerHttpHandler(...)` 已被移除，使用它会导致插件加载错误。请改用 `api.registerHttpRoute(...)`。
- 插件路由必须显式声明 `auth`。
- 归一化为具有相同 `match` 模式的相同值的路径占用一条路由。来自同一插件的静态 `api.registerHttpRoute(...)` 调用替换该路由；其他插件无法替代它。
- 不同 `auth` 级别的重叠路由会被拒绝。仅在相同的身份验证级别上保留 `exact`/`prefix` 回退链。
- 使用 `openclaw/plugin-sdk/webhook-ingress` 中的 `registerPluginHttpRoute(...)` 的动态生命周期代码必须设置 `replaceExisting: true` 来刷新其自己的注册路由。命名注册只能替换相同的非空`pluginId`；当任何一方设置路由 `source` 时，双方必须设置相同的非空源。对于已发布的 SDK 调用方，仍支持相同插件无源到无源刷新和匿名到匿名刷新，但命名和匿名路由不能相互替换。
- 设置`reuseExistingSameOwner: true`与相同的非空`pluginId`和`source`共享注册路由。动态创建的路线将一直保留，直到最后一个持有者释放它为止；重用静态 `api.registerHttpRoute(...)` 路由会将其生命周期留给插件注册表。
- Channel 生命周期回调使用其网关的路由注册表。当任务解决或恢复放弃它时，启动路线就会过期；当该停止尝试解决或超时时，`stopAccount` 路由到期。即使启动失败，恢复也会在替换启动之前撤销废弃的任务路由。过期的回调无法动态注册或替换路由。
- 将路由 `source` 视为稳定的同插件子所有者标识，而不是诊断标签。现有的无 source 调用方可以继续省略它；使用 source 的调用方必须在刷新期间保持其不变。
- 动态生命周期注册在被拒绝时默认记录日志并返回一个空操作注销回调。当就绪状态依赖该路由时，请设置 `throwOnFailure: true`；必需的内置 Webhook 传输使用严格注册，因此不会在没有有效入口的情况下报告就绪。
- `auth: "plugin"` 路由 **not** 自动接收运算符运行时范围。它们用于插件管理的 webhooks/signature 验证，而不是特权网关帮助程序调用。
- `auth: "gateway"` 路由在 Gateway 请求运行时作用域中运行。默认界面（`gatewayRuntimeScopeSurface: "write-default"`）有意保持保守：
  - 共享秘密承载身份验证 （`gateway.auth.mode = "token"` / `"password"`） 和任何非可信代理身份验证方法都会获得单个 `operator.write` 范围，即使调用者发送 `x-openclaw-scopes`
  - 没有显式 `x-openclaw-scopes` 标头的 `trusted-proxy` 调用者也保留旧版 `operator.write`-only 表面
  - 发送 `x-openclaw-scopes` 的 `trusted-proxy` 调用者将获得声明的范围
  - 路由可以选择 `gatewayRuntimeScopeSurface: "trusted-operator"`，以便对携带身份的身份验证模式始终遵循 `x-openclaw-scopes`（如果未提供该标头，则回退到完整的 CLI 默认作用域集合）
- 由 `auth: "gateway"` 路由支持的沙盒外部 Control UI 选项卡使用仅由经过身份验证的引导程序创建的短期签名 cookie 授权；插件身份验证选项卡保留其直接 iframe 路径。在安装之前，父级在同一不透明沙箱内运行路由拥有的检查，并在浏览器隐私策略阻止 cookie 时拒绝安装选项卡。授权绑定到所属插件、匹配的路由根和当前的身份验证生成；它的进程随机 cookie 名称可防止受信任的同一主机网关相互覆盖，但 cookie 永远不会隔离 TCP 端口。因此，网关主机名是一种凭证边界：不要在该主机名（包括其他端口）上共同托管相互不信任的服务。路由调度拒绝重用另一个插件拥有的嵌套路由。由于出于 cookie 目的，沙箱后代是跨站点的，因此该授权仅接受 `GET` 和 `HEAD` 以及 `operator.read`；突变和 WebSocket 升级保留在显式网关验证的表面上。 cookie 故意不能使用 CHIPS：当前浏览器在分区键中包含跨站点祖先位，因此嵌套的不透明沙箱框架将无法访问同一路由资产。该 cookie 需要安全上下文和跨站点 cookie 的浏览器权限，因此网关身份验证外部选项卡在纯 HTTP LAN 来源或完全第三方 cookie 阻止下不可用；使用 HTTPS/Tailscale 服务或具有兼容 cookie 策略的浏览器信任环回。
- 该授权可防止网关承载令牌泄露和意外 route/scope 重用；它不会在本机插件之间创建安全边界。本机插件代码及其服务的 UI 内容仍然是同一可信进程内插件边界的一部分。
- 实际规则：不要假设 Gateway 身份验证的插件路由隐含具备管理员界面。如果你的路由需要仅限管理员的行为，请选择 `trusted-operator` 作用域界面，要求使用携带身份的身份验证模式，并记录明确的 `x-openclaw-scopes` 标头约定。
- 启动插件会在 Gateway 开始监听后，使用其完整运行时注册 HTTP 路由。在启动侧车就绪之前，未被其他路由声明的 HTTP 请求会返回 `503` 以及 `Retry-After: 1`；核心路由仍会正常分发。此通用回退机制覆盖了运行时注册表尚无法识别其所有者之前的插件路由。
- 路由匹配和身份验证后，普通处理程序会参与 Gateway 根级工作准入。Gateway 已准备就绪或正在重启时，会在调用处理程序之前返回 `503`。唯一的狭义例外是：一个拥有清单授权的 `auth: "gateway"` 路由，同时选择了路由专属的 `trusted-operator` 界面；该路由仍可访问，从而避免暂停控制分发被阻塞，而同一插件的普通兄弟路由仍处于准入边界之后。WebSocket `handleUpgrade` 的所有权使用相同的原子准入边界；一旦处理程序接受套接字，该套接字后续的生命周期便由插件所有，并不受此边界跟踪。
