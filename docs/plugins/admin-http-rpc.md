---
summary: "通过捆绑的、可选择启用的 admin-http-rpc 插件公开部分 Gateway 控制平面方法"
read_when:
  - 构建无法使用 Gateway WebSocket RPC 客户端的主机端工具时
  - 在私有且受信任的入口后暴露 Gateway 管理自动化时
  - 审计 Gateway 方法的 HTTP 访问安全模型时
title: "Admin HTTP RPC 插件"
---

捆绑的 `admin-http-rpc` 插件会通过 HTTP 公开部分 Gateway 控制平面方法，供无法使用常规 Gateway WebSocket RPC 客户端的受信任主机自动化使用。

该插件随 OpenClaw 一起提供，但默认关闭。未启用时，不会注册该路由。启用后，它会增加：

- `POST /api/v1/admin/rpc`
- 与 Gateway 相同的监听器：`http://<gateway-host>:<port>/api/v1/admin/rpc`

仅将其用于私有主机工具、tailnet 自动化或受信任的内部入口。不要将此路由直接暴露到公共互联网。

## 在启用之前

Admin HTTP RPC 是完整的运维控制平面接口。任何通过 Gateway HTTP 身份验证的调用方，都可以调用本页中列入允许列表的方法。

当满足以下所有条件时使用它：

- 调用方被信任，可以操作 Gateway。
- 调用方无法使用 WebSocket RPC 客户端。
- 该路由只能在本地回环、tailnet 或私有且经过认证的入口上访问。
- 你已经审查过允许的方法，并且它们与计划运行的自动化相匹配。

对于可以保持 Gateway WebSocket 连接打开的 OpenClaw 客户端和交互式工具，请使用 WebSocket RPC 路径。

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

该路由会在插件启动期间注册。更改插件配置后，请重启 Gateway。

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

- 启用该插件会有意地在 `/api/v1/admin/rpc` 提供对允许列表中 admin RPC 方法的访问。
- 该插件声明了保留的 `contracts.gatewayMethodDispatch: ["authenticated-request"]` 清单契约，因此其经过 Gateway 身份验证的 HTTP 路由可以在进程内分发控制平面方法。
- 共享密钥 Bearer 认证证明持有 gateway 运维密钥。
- 对于 `token` 和 `password` 认证，更窄的 `x-openclaw-scopes` 头会被忽略，并恢复为正常的完整运维默认值。
- 带有受信任身份的 HTTP 模式会在存在时遵守 `x-openclaw-scopes`。
- `gateway.auth.mode="none"` 表示如果插件启用，该路由就是未认证的。仅应在你完全信任的私有入口后使用。
- 在插件路由认证通过后，请求会像 WebSocket RPC 一样，通过相同的 Gateway 方法处理程序和作用域检查进行分发。
- 请将此路由保留在本地回环、tailnet 或私有受信任入口上。不要直接暴露到公共互联网。
- 插件清单契约不是沙箱。它们只会阻止误用受限的 SDK 辅助方法；受信任的插件仍然运行在 Gateway 进程中。

当调用方跨越信任边界时，请使用不同的 gateway。

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

## 响应

成功响应使用 Gateway RPC 结构：

```json
{
  "id": "optional-request-id",
  "ok": true,
  "payload": {}
}
```

Gateway 方法错误使用：

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

HTTP 状态会尽可能跟随 Gateway 错误。例如，`INVALID_REQUEST` 返回 `400`，`UNAVAILABLE` 返回 `503`。

## 允许的方法

- discovery: `commands.list`
  返回此插件允许的 HTTP RPC 方法名。
- gateway: `health`, `status`, `logs.tail`, `usage.status`, `usage.cost`, `gateway.restart.request`
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

`400 INVALID_REQUEST`

: 请求体不是有效的 JSON，`method` 字段缺失，或者该方法不在插件允许列表中。

`503 UNAVAILABLE`

: Gateway 方法处理程序不可用。请检查 Gateway 日志，并在 Gateway 完成启动后重试。

## 相关内容

- [Operator scopes](/gateway/operator-scopes)
- [Gateway security](/gateway/security)
- [Remote access](/gateway/remote)
- [Plugin manifest](/plugins/manifest#contracts)
- [SDK subpaths](/plugins/sdk-subpaths)
