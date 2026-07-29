---
summary: "Webhooks 插件：面向受信任外部自动化的已认证 TaskFlow 入口"
read_when:
  - 你想从外部系统触发或驱动 TaskFlow
  - 你正在配置随附的 webhooks 插件
title: "Webhooks 插件"
---

Webhooks 插件会添加经过身份验证的 HTTP 路由，使受信任的外部
系统（Zapier、n8n、CI 作业、内部服务）能够通过 HTTP 创建并驱动
受管理的 OpenClaw TaskFlow，而无需编写自定义插件。

该插件运行在 Gateway 进程中。对于远程 Gateway，请在该主机上安装并
配置它，然后重启 Gateway。它默认不配置任何路由，因此在你至少添加一条路由之前，它不会执行任何操作。

## 配置路由

在 `plugins.entries.webhooks.config` 下设置配置：

```json5
{
  plugins: {
    entries: {
      webhooks: {
        enabled: true,
        config: {
          routes: {
            zapier: {
              path: "/plugins/webhooks/zapier",
              sessionKey: "agent:main:main",
              secret: {
                source: "env",
                provider: "default",
                id: "OPENCLAW_WEBHOOK_SECRET",
              },
              controllerId: "webhooks/zapier",
              description: "Zapier TaskFlow 桥接器",
            },
          },
        },
      },
    },
  },
}
```

路由字段：

| 字段           | 必需 | 默认                          | 说明                                          |
| -------------- | ---- | ----------------------------- | --------------------------------------------- |
| `enabled`      | 否   | `true`                        |                                               |
| `path`         | 否   | `/plugins/webhooks/<routeId>` | 必须在所有路由中保持唯一。                    |
| `sessionKey`   | 是   | -                             | 拥有绑定 TaskFlows 的会话。                   |
| `secret`       | 是   | -                             | 纯字符串或 SecretRef（见下文）。              |
| `controllerId` | 否   | `webhooks/<routeId>`          | 用作默认的 `create_flow` 控制器。             |
| `description`  | 否   | -                             | 仅供操作人员备注。                             |

`secret` 可以接受纯字符串或 SecretRef：`{ source: "env" | "file" | "exec", provider: "default", id: "..." }`。

SecretRefs resolve into the Gateway's startup config snapshot. When one route's
secret cannot resolve, the Gateway keeps running and that exact route stays
registered but cold: requests receive a generic authentication failure (`401`).
Other routes remain available. Fix the SecretRef source, then reload or restart
the Gateway to activate the new snapshot. SecretRef values are never resolved
on the public request path.

## 安全模型

每个路由都会以其配置的 `sessionKey` 的 TaskFlow 权限执行：它
可以检查和修改该会话拥有的任何 TaskFlow。TaskFlow 访问
始终通过 `api.runtime.tasks.managedFlows.bindSession(...)` 进行，因此
路由永远不能在其绑定会话之外执行操作。为了限制影响范围：

- 为每个路由使用强且唯一的密钥。
- 优先使用 `SecretRef`，而不是内联明文密钥。
- 将路由绑定到满足工作流所需的最小范围会话。
- 只暴露你需要的特定 webhook 路径。

每个路径的请求处理顺序为：先检查 HTTP 方法（仅 `POST`）和
`Content-Type: application/json`，然后进行固定窗口限流（每个路径+客户端 IP 键在 60 秒窗口内最多 120
个请求，最多跟踪 4,096 个键），再进行进行中请求限制（每个键最多 8 个并发请求，最多跟踪 4,096 个键），然后是共享密钥认证，最后是 256 KB /
15 秒的 JSON 请求体读取。未通过前面检查的请求绝不会进入后面的步骤。

## 请求格式

发送 `POST` 请求，使用 `Content-Type: application/json`，并提供以下任一认证方式：
`Authorization: Bearer <secret>` 或 `x-openclaw-webhook-secret: <secret>`：

```bash
curl -X POST https://gateway.example.com/plugins/webhooks/zapier \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_SHARED_SECRET' \
  -d '{"action":"create_flow","goal":"Review inbound queue"}'
```

## 支持的动作

| 动作               | 目的                                                               |
| ------------------ | ------------------------------------------------------------------ |
| `create_flow`      | 为该路由的会话创建一个托管的 TaskFlow。                              |
| `get_flow`         | 通过 id 获取一个 TaskFlow。                                          |
| `list_flows`       | 列出该路由会话的 TaskFlow。                                          |
| `find_latest_flow` | 获取最近更新的 TaskFlow。                                            |
| `resolve_flow`     | 通过不透明 token 解析 TaskFlow。                                     |
| `get_task_summary` | 获取 TaskFlow 的任务摘要。                                           |
| `set_waiting`      | 将 TaskFlow 标记为等待中，可附带可选的状态/等待数据。                 |
| `resume_flow`      | 恢复一个等待中/被阻塞的 TaskFlow。                                   |
| `finish_flow`      | 将 TaskFlow 标记为已完成。                                           |
| `fail_flow`        | 将 TaskFlow 标记为失败。                                             |
| `request_cancel`   | 请求协作式取消。                                                     |
| `cancel_flow`      | 取消一个 TaskFlow（如果子任务仍在活动，可能返回 `202`）。            |
| `run_task`         | 在现有 TaskFlow 中创建一个托管的子任务。                             |

会修改状态的动作（`set_waiting`、`resume_flow`、`finish_flow`、`fail_flow`、
`request_cancel`）需要 `flowId` 和 `expectedRevision` 以进行乐观
并发控制；过期的修订版本会返回 `409 revision_conflict`。

### `create_flow`

```json
{
  "action": "create_flow",
  "goal": "审查传入队列",
  "status": "queued",
  "notifyPolicy": "done_only"
}
```

### `run_task`

允许的 `runtime` 值：`subagent`、`acp`。`startedAt`、`lastEventAt` 和
`progressSummary` 仅在 `status` 为 `"running"` 时有效；在其他任何状态下
发送这些字段会返回 `400 invalid_request`。

```json
{
  "action": "run_task",
  "flowId": "flow_123",
  "runtime": "acp",
  "childSessionKey": "agent:main:acp:worker",
  "task": "检查下一批消息"
}
```

## 响应格式

```json
{
  "ok": true,
  "routeId": "zapier",
  "result": {}
}
```

```json
{
  "ok": false,
  "routeId": "zapier",
  "code": "not_found",
  "error": "未找到 TaskFlow。",
  "result": {}
}
```

Flow 和 task 视图绝不会包含 owner/session 元数据，因此响应不能泄露路由绑定的 `sessionKey`。`code` 值包括 `not_found`、
`not_managed`、`revision_conflict`、`persist_failed`、`cancel_requested`、
`cancel_pending`、`terminal`、`invalid_request`、`request_rejected`，以及
当某个 mutation 因上面列出的代码未涵盖的原因被拒绝时使用的特定于 action 的回退代码（`mutation_rejected`、`create_rejected`、
`task_not_created`、`cancel_rejected`）。

## 相关

- [Hooks](/automation/hooks) - 内部事件驱动的 hooks vs. 此基于 HTTP 的 TaskFlow 桥接
- [Gateway webhooks (`hooks.*` config)](/automation/cron-jobs#webhooks) - 独立的通用 Gateway HTTP 端点功能；与此插件的路由不同
- [Plugin runtime SDK](/plugins/sdk-runtime)
- [CLI webhooks](/cli/webhooks)
