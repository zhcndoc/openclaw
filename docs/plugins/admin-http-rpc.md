---
summary: "通过捆绑的、可选择启用的 admin-http-rpc 插件公开部分 Gateway 控制平面方法"
read_when:
  - 构建无法使用 Gateway WebSocket RPC 客户端的主机端工具时
  - 在私有且受信任的入口后暴露 Gateway 管理自动化时
  - 审计 Gateway 方法的 HTTP 访问安全模型时
title: "Admin HTTP RPC 插件"
---

捆绑的 `admin-http-rpc` 插件通过 HTTP 公开一组允许列表中的 Gateway 控制平面方法，供无法保持 Gateway WebSocket 连接持续打开的受信任主机自动化使用。

它随 OpenClaw 一起提供，但默认禁用；禁用时，不会注册该路由。启用后，它会在与 Gateway 相同的监听器上添加 `POST /api/v1/admin/rpc`（`http://<gateway-host>:<port>/api/v1/admin/rpc`）。

仅为私有主机工具、tailnet 自动化或受信任的内部入口启用它。切勿将此路由直接暴露到公共互联网。

## 在启用之前

Admin HTTP RPC 是一个完整的 operator 控制平面接口：任何通过 Gateway HTTP 认证的调用方都可以调用下面列入允许列表的方法。只有在以下所有条件都为真时才启用它：

- 调用方被信任，可以操作 Gateway。
- 调用方无法使用 WebSocket RPC 客户端。
- 该路由只能在本地回环、tailnet 或私有且经过认证的入口上访问。
- 你已经审查过允许的方法，并且它们与计划运行的自动化相匹配。

对于可以保持 Gateway WebSocket 连接打开的 OpenClaw 客户端和交互式工具，请改用 WebSocket RPC。

## 启用

启用捆绑插件：

<Tabs>
  <Tab title="CLI">
    ```bash
    openclaw plugins enable admin-http-rpc
    openclaw gateway restart
    ```
  </Tab>
  <Tab title="Config">
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

该路由会在插件启动期间注册，因此在更改插件配置后请重启 Gateway。

当你不再需要该 HTTP 接口时，请将其禁用：

```bash
openclaw plugins disable admin-http-rpc
openclaw gateway restart
```

## 验证路由

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

## 身份验证

该插件路由使用 Gateway HTTP 身份验证。

常见的身份验证路径：

- 共享密钥认证（`gateway.auth.mode="token"` 或 `"password"`）：`Authorization: Bearer <token-or-password>`
- 受信任、携带身份的 HTTP 认证（`gateway.auth.mode="trusted-proxy"`）：通过配置的、具备身份感知能力的代理，并让其注入所需的身份头
- 私有入口开放认证（`gateway.auth.mode="none"`）：不需要认证头

## 安全模型

请将此插件视为完整的 Gateway 运维接口。

- 启用该插件会有意向 `/api/v1/admin/rpc` 中允许名单内的 admin RPC 方法提供访问。
- 该插件声明了保留的 `contracts.gatewayMethodDispatch: ["authenticated-request"]` 清单契约，这使其经 Gateway 认证的 HTTP 路由能够在进程内调度控制平面方法。这并不是沙箱：该契约可防止意外使用保留的 SDK 辅助函数，但受信任的插件仍然运行在 Gateway 进程中。
- 共享密钥 bearer 认证（`token`/`password` 模式）可证明持有 gateway 操作员密钥；此路径会忽略更细粒度的 `x-openclaw-scopes` 标头，并恢复为正常的完整操作员默认权限。
- 受信任、携带身份的 HTTP 认证（`trusted-proxy` 模式）在存在 `x-openclaw-scopes` 时会予以尊重。
- `gateway.auth.mode="none"` 表示如果插件已启用，则此路由不需要认证。仅在你完全信任的私有入口后面使用。
- 在插件路由认证通过后，请求会通过与 WebSocket RPC 相同的 Gateway 方法处理程序和作用域检查进行调度。
- 在已准备好的挂起租约期间，该路由仍然可访问。受限的请求验证以及本地 `commands.list` 发现响应仍然可用。在被调度到 Gateway 的方法中，只有 `gateway.suspend.prepare`、`gateway.suspend.status` 和 `gateway.suspend.resume` 可以在 admission 关闭时运行；其他允许名单内的方法会返回正常、可重试的 Gateway `UNAVAILABLE` 响应。
- 请将此路由保持在 loopback、tailnet 或私有且受信任的入口之后。不要直接暴露到公共互联网。若调用方跨越信任边界，请使用独立的 gateways。

## 请求

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

## Responses

Successful responses use the Gateway RPC structure:

```json
{
  "id": "optional-request-id",
  "ok": true,
  "payload": {}
}
```

Gateway method errors use:

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

HTTP status follows the error code:

| Error Code                 | HTTP Status |
| -------------------------- | ----------- |
| `INVALID_REQUEST`         | 400         |
| `APPROVAL_NOT_FOUND`      | 404         |
| `NOT_LINKED`, `NOT_PAIRED` | 409       |
| `UNAVAILABLE`             | 503         |
| `AGENT_TIMEOUT`           | 504         |
| any other code            | 500         |

## 允许的方法

- discovery: `commands.list`
  返回此插件允许的 HTTP RPC 方法名称。
- gateway: `health`, `status`, `logs.tail`, `usage.status`, `usage.cost`, `gateway.restart.request`, `gateway.suspend.prepare`, `gateway.suspend.status`, `gateway.suspend.resume`
- config: `config.get`, `config.schema`, `config.schema.lookup`, `config.set`, `config.patch`, `config.apply`
- channels: `channels.status`, `channels.start`, `channels.stop`, `channels.logout`
- web: `web.login.start`, `web.login.wait`
- models: `models.list`, `models.authStatus`
- agents: `agents.list`, `agents.create`, `agents.update`, `agents.delete`
- approvals: `exec.approvals.get`, `exec.approvals.set`, `exec.approvals.node.get`, `exec.approvals.node.set`
- cron: `cron.status`, `cron.list`, `cron.get`, `cron.runs`, `cron.add`, `cron.update`, `cron.remove`, `cron.run`
- devices: `device.pair.list`, `device.pair.approve`, `device.pair.reject`, `device.pair.remove`
- nodes: `node.list`, `node.describe`, `node.pair.list`, `node.pair.approve`, `node.pair.reject`, `node.pair.remove`, `node.rename`
- tasks: `tasks.list`, `tasks.get`, `tasks.cancel`
- diagnostics: `doctor.memory.status`, `update.status`

其他 Gateway 方法会被阻止，直到它们被有意添加为止。

## WebSocket 对比

常规的 Gateway WebSocket RPC 路径仍然是 OpenClaw 客户端首选的控制平面 API。仅在需要请求/响应式 HTTP 接口的主机工具中使用 admin HTTP RPC。

没有受信任设备身份的共享令牌 WebSocket 客户端，无法在连接时自我声明 admin 作用域。Admin HTTP RPC 有意遵循现有的受信任 HTTP 运维模型：当插件启用时，共享密钥 Bearer 认证会被视为对此管理接口的完整运维访问权限。

## 故障排查

`404 Not Found`

: 插件已禁用、启用后 Gateway 尚未重启，或者请求发往了不同的 Gateway 进程。

`401 Unauthorized`

: 请求未通过 Gateway HTTP 身份验证。请检查 Bearer token 或 trusted-proxy 身份头。

`405 Method Not Allowed`

: 请求使用了除 `POST` 之外的方法。

`413 Payload Too Large`

: 请求体超过了 1 MB 限制。

`400 INVALID_REQUEST`

: 请求体不是有效的 JSON，缺少 `method` 字段，方法不在插件允许列表中，或者暂停恢复 ID 与活动租约不匹配。

`503 UNAVAILABLE`

: Gateway 方法正在启动、受到速率限制、已暂停，或正在等待一个竞争中的暂停/恢复操作。若存在，请检查 `error.details`，并在重试前遵守 `error.retryAfterMs`。

## 相关内容

- [操作符范围](/gateway/operator-scopes)
- [网关安全](/gateway/security)
- [远程访问](/gateway/remote)
- [插件清单](/plugins/manifest#contracts-reference)
- [SDK 子路径](/plugins/sdk-subpaths)
