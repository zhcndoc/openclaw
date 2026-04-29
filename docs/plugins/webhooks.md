---
summary: "Webhooks 插件：面向受信任外部自动化的已认证 TaskFlow 入口"
read_when:
  - 你想从外部系统触发或驱动 TaskFlow
  - 你正在配置随附的 webhooks 插件
title: "Webhooks 插件"
---

# Webhooks（插件）

Webhooks 插件添加了已认证的 HTTP 路由，用于将外部
自动化与 OpenClaw TaskFlow 绑定。

当你希望像 Zapier、n8n、CI 任务或内部服务这样的受信任系统，
在不先编写自定义插件的情况下创建并驱动受管 TaskFlow 时，
请使用它。

## 运行位置

Webhooks 插件运行在 Gateway 进程中。

如果你的 Gateway 运行在另一台机器上，请在该 Gateway 主机上安装并配置此插件，
然后重启 Gateway。

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

- `enabled`：可选，默认为 `true`
- `path`：可选，默认为 `/plugins/webhooks/<routeId>`
- `sessionKey`：必需，拥有所绑定 TaskFlow 的会话
- `secret`：必需，共享密钥或 SecretRef
- `controllerId`：可选，创建的受管流程的 controller id
- `description`：可选，运维备注

支持的 `secret` 输入：

- 纯字符串
- SecretRef，`source: "env" | "file" | "exec"`

如果基于 secret 的路由在启动时无法解析其 secret，插件会跳过
该路由并记录警告，而不是暴露一个损坏的端点。

## 安全模型

每个路由都被信任，可使用其配置的 `sessionKey` 所拥有的
TaskFlow 权限执行操作。

这意味着该路由可以检查和修改属于该会话的 TaskFlow，因此你应该：

- 为每个路由使用强且唯一的 secret
- 优先使用 secret 引用，而不是内联明文 secret
- 将路由绑定到满足工作流需求的最小范围会话
- 仅暴露你需要的特定 webhook 路径

插件会应用：

- 共享密钥认证
- 请求体大小和超时保护
- 固定窗口速率限制
- 请求并发中的限制
- 通过 `api.runtime.tasks.managedFlows.bindSession(...)` 进行所有者绑定的 TaskFlow 访问

## 请求格式

发送 `POST` 请求，并包含：

- `Content-Type: application/json`
- `Authorization: Bearer <secret>` 或 `x-openclaw-webhook-secret: <secret>`

示例：

```bash
curl -X POST https://gateway.example.com/plugins/webhooks/zapier \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_SHARED_SECRET' \
  -d '{"action":"create_flow","goal":"Review inbound queue"}'
```

## 支持的动作

插件目前接受以下 JSON `action` 值：

- `create_flow`
- `get_flow`
- `list_flows`
- `find_latest_flow`
- `resolve_flow`
- `get_task_summary`
- `set_waiting`
- `resume_flow`
- `finish_flow`
- `fail_flow`
- `request_cancel`
- `cancel_flow`
- `run_task`

### `create_flow`

为该路由绑定的会话创建一个受管 TaskFlow。

示例：

```json
{
  "action": "create_flow",
  "goal": "Review inbound queue",
  "status": "queued",
  "notifyPolicy": "done_only"
}
```

### `run_task`

在现有的受管 TaskFlow 内创建一个受管子任务。

允许的运行时类型为：

- `subagent`
- `acp`

示例：

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

成功响应返回：

```json
{
  "ok": true,
  "routeId": "zapier",
  "result": {}
}
```

被拒绝的请求返回：

```json
{
  "ok": false,
  "routeId": "zapier",
  "code": "not_found",
  "error": "未找到 TaskFlow。",
  "result": {}
}
```

该插件会刻意从 webhook 响应中清除所有者/会话元数据。

## 相关文档

- [插件运行时 SDK](/plugins/sdk-runtime)
- [Hooks 和 webhooks 概览](/automation/hooks)
- [CLI webhooks](/cli/webhooks)
