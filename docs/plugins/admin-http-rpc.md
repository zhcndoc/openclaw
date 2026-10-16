---
summary: "通过捆绑的、可选择启用的 admin-http-rpc 插件公开部分 Gateway 控制平面方法"
read_when:
  - "构建无法使用 Gateway WebSocket RPC 客户端的主机端工具时"
  - "在私有且受信任的入口后暴露 Gateway 管理自动化时"
  - "审计 Gateway 方法的 HTTP 访问安全模型时"
title: "Admin HTTP RPC 插件"
---

捆绑的 `admin-http-rpc` 插件通过 HTTP 公开一组允许列表中的 Gateway 控制平面方法，供无法保持 Gateway WebSocket 连接持续打开的受信任主机自动化使用。

它随 OpenClaw 一起提供，但默认禁用；禁用时，不会注册该路由。启用后，它会在与 Gateway 相同的监听器上添加 `POST /api/v1/admin/rpc`（`http://<gateway-host>:<port>/api/v1/admin/rpc`）。

仅为私有主机工具、tailnet 自动化或受信任的内部入口启用它。切勿将此路由直接暴露到公共互联网。

## <a id="before-you-enable-it"></a> 在启用之前

Admin HTTP RPC 是一个完整的 operator 控制平面接口：任何通过 Gateway HTTP 认证的调用方都可以调用下面列入允许列表的方法。只有在以下所有条件都为真时才启用它：

- 调用方被信任，可以操作 Gateway。
- 调用方无法使用 WebSocket RPC 客户端。
- 该路由只能在本地回环、tailnet 或私有且经过认证的入口上访问。
- 你已经审查过允许的方法，并且它们与计划运行的自动化相匹配。

对于可以保持网关 WebSocket 连接打开的 OpenClaw 客户端和交互工具，请改用 WebSocket RPC。

## <a id="enable"></a> 启用

启用捆绑的插件：

<Tabs>
  <Tab title="CLI">
    ```bash
    openclaw plugins enable admin-http-rpc
    ```
  </Tab>
  <Tab id="config" title="配置">
    ```json5
    {
      plugins: {
        entries: {
          "admin-http-rpc": { enabled: true },
        },
      },
    }
    ```
  </Tab>
</Tabs>

启用自动应用于正在运行的网关。如果离线，则启动它来注册路线。使用默认的混合重新加载模式，插件配置和加载路径更改也会自动应用。源或清单编辑后，运行 `openclaw plugins reload admin-http-rpc`。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

当你不再需要该 HTTP 接口时，请将其禁用：

```bash
openclaw plugins disable admin-http-rpc
```

## <a id="verify-the-route"></a> 验证路由

使用 `health` 作为最小且安全的请求：

```bash
curl -sS http://<gateway-host>:<port>/api/v1/admin/rpc \
  -H 'Authorization: Bearer <gateway-token>' \
  -H 'Content-Type: application/json' \
  -d '{"method":"health","params":{}}'
```

成功响应包含 `ok: true`：

```json
{
  "id": "generated-request-id",
  "ok": true,
  "payload": {
    "status": "ok"
  }
}
```

当插件被禁用时，该路由会返回 `404`，因为它未被注册。

## <a id="authentication"></a> 身份验证

该插件路由使用 Gateway HTTP 身份验证。

常见的身份验证路径：

- 共享密钥认证（`gateway.auth.mode="token"` 或 `"password"`）：`Authorization: Bearer <token-or-password>`
- 可信身份承载HTTP身份验证（`gateway.auth.mode="trusted-proxy"`）：通过配置的身份感知代理进行路由并让它注入所需的身份标头
- private-ingress 开放身份验证 （`gateway.auth.mode="none"`）：不需要身份验证标头

## <a id="security-model"></a> 安全模型

请将此插件视为完整的 Gateway 运维接口。

- 启用该插件会有意向 `/api/v1/admin/rpc` 中允许名单内的 admin RPC 方法提供访问。
- 该插件声明了保留的 `contracts.gatewayMethodDispatch: ["authenticated-request"]` 清单契约，这使其经 Gateway 认证的 HTTP 路由能够在进程内调度控制平面方法。这并不是沙箱：该契约可防止意外使用保留的 SDK 辅助函数，但受信任的插件仍然运行在 Gateway 进程中。
- 共享密钥 bearer 认证（`token`/`password` 模式）可证明持有 gateway 操作员密钥；此路径会忽略更细粒度的 `x-openclaw-scopes` 标头，并恢复为正常的完整操作员默认权限。
- 受信任、携带身份的 HTTP 认证（`trusted-proxy` 模式）在存在 `x-openclaw-scopes` 时会予以尊重。
- `gateway.auth.mode="none"` 表示如果插件已启用，则此路由不需要认证。仅在你完全信任的私有入口后面使用。
- 在插件路由认证通过后，请求会通过与 WebSocket RPC 相同的 Gateway 方法处理程序和作用域检查进行调度。
- 在准备好的暂停租赁期间，路线仍然可达。有界请求验证和本地 `commands.list` 发现响应仍然可用。在调度到网关的方法中，`gateway.suspend.prepare`、`gateway.suspend.status`、`gateway.suspend.resume` 和精确目标非安全 `gateway.restart.request` 可以在准入关闭时运行；安全、非目标和其他允许列表方法返回正常的可重试网关 `UNAVAILABLE` 响应。
- 请将此路由保持在 loopback、tailnet 或私有且受信任的入口之后。不要直接暴露到公共互联网。若调用方跨越信任边界，请使用独立的 gateways。

## <a id="request"></a> 请求

```http
POST /api/v1/admin/rpc
Authorization: Bearer <gateway-token>
Content-Type: application/json
```

```json
{
  "id": "optional-request-id",
  "method": "health",
  "params": {}
}
```

字段：

- `id`（string，可选）：会被复制到响应中。若省略，将生成一个 UUID。
- `method`（string，必需）：允许的 Gateway 方法名。
- `params`（any，可选）：方法特定参数。

默认最大请求体大小为 1 MB。

## <a id="response"></a> 回复

成功响应使用网关 RPC 形状：

```json
{
  "id": "optional-request-id",
  "ok": true,
  "payload": {}
}
```

网关方法错误使用：

```json
{
  "id": "optional-request-id",
  "ok": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "bad params"
  }
}
```

HTTP 状态遵循错误代码：

| 错误代码                 | HTTP 状态 |
| -------------------------- | ----------- |
| `INVALID_REQUEST`          | 400         |
| `APPROVAL_NOT_FOUND`       | 404         |
| `NOT_LINKED`, `NOT_PAIRED` | 409         |
| `UNAVAILABLE`              | 503         |
| `AGENT_TIMEOUT`            | 504         |
| 任何其他代码             | 500         |

## <a id="allowed-methods"></a> 允许的方法

- discovery: `commands.list` 返回此插件允许的 HTTP RPC 方法名称。
- 网关：`health`、`status`、`logs.tail`、`usage.status`、`usage.cost`、`gateway.restart.request`、`gateway.suspend.prepare`、`gateway.suspend.status`、 `gateway.suspend.resume`
- 配置：`config.get`、`config.schema`、`config.schema.lookup`、`config.set`、`config.patch`、`config.apply`
- 通道：`channels.status`、`channels.start`、`channels.stop`、`channels.logout`
- web：`web.login.start`，`web.login.wait`
- 模型：`models.list`、`models.authStatus`
- 代理：`agents.list`、`agents.create`、`agents.update`、`agents.delete`
- 认证：`exec.approvals.get`、`exec.approvals.set`、`exec.approvals.node.get`、`exec.approvals.node.set`
- cron：`cron.status`、`cron.list`、`cron.get`、`cron.runs`、`cron.add`、`cron.update`、`cron.remove`、`cron.run`
- 设备：`device.pair.list`、`device.pair.approve`、`device.pair.reject`、`device.pair.remove`
- 节点：`node.list`、`node.describe`、`node.pair.list`、`node.pair.approve`、`node.pair.reject`、`node.pair.remove`、`node.rename`
- 诊断：`doctor.memory.status`、`update.status`

其他 Gateway 方法会被阻止，直到它们被有意添加为止。

## <a id="websocket-comparison"></a> WebSocket 对比

普通网关 WebSocket RPC 路径仍然是 OpenClaw 客户端的首选控制平面 API。仅对需要 request/response HTTP 表面的主机工具使用 admin HTTP RPC。

没有受信任设备身份的共享令牌 WebSocket 客户端，无法在连接时自我声明 admin 作用域。Admin HTTP RPC 有意遵循现有的受信任 HTTP 运维模型：当插件启用时，共享密钥 Bearer 认证会被视为对此管理接口的完整运维访问权限。

## <a id="troubleshooting"></a> 故障排查

**`404 Not Found`** 插件已禁用、运行时应用程序失败或请求将发送至不同的网关进程。检查启用结果并[检查插件](/plugins/manage-plugins#apply-changes-and-inspect)。

**`401 Unauthorized`** 该请求不满足网关 HTTP 身份验证。检查承载令牌或可信代理身份标头。

**`405 Method Not Allowed`** 该请求使用了 `POST` 之外的其他内容。

**`413 Payload Too Large`** 请求正文超出 1 MB 限制。

**`400 INVALID_REQUEST`** 请求正文无效 JSON、缺少 `method` 字段、该方法不在插件允许列表中或暂停恢复 ID 与活动租约不匹配。

**`503 UNAVAILABLE`** 网关方法正在启动、速率限制、暂停或等待竞争的 suspension/resume 操作。在场时检查 `error.details`，并在重试之前尊重 `error.retryAfterMs`。

## <a id="related"></a> 相关内容

- [操作员范围](/gateway/operator-scopes)
- [网关安全](/gateway/security)
- [远程访问](/gateway/remote)
- [插件清单](/plugins/manifest/capabilities#contracts-reference)
- [SDK 子路径](/plugins/sdk-subpaths)
