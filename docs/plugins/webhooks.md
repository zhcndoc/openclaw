---
summary: "Webhooks 插件：用于受信任外部自动化经过身份验证的 TaskFlow 入口"
read_when:
  - 您想从外部系统触发或驱动 TaskFlow
  - 您正在配置随附的 webhooks 插件
title: "Webhooks 插件"
---

# Webhooks（插件）

Webhooks 插件添加了经过身份验证的 HTTP 路由，将外部自动化绑定到 OpenClaw TaskFlow。

当您希望受信任的系统（如 Zapier、n8n、CI 作业或内部服务）创建和驱动受管理的 TaskFlow 而无需先编写自定义插件时，请使用它。

## 运行位置

Webhooks 插件在 Gateway 进程内部运行。

如果您的 Gateway 运行在另一台机器上，请在该 Gateway 主机上安装并配置插件，然后重启 Gateway。

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
- `sessionKey`：拥有绑定 TaskFlow 的必需会话
- `secret`：必需的共享密钥或 SecretRef
- `controllerId`：用于创建受管流程的可选控制器 id
- `description`：可选的操作员备注

支持的 `secret` 输入：

- 纯字符串
- 带有 `source: "env" | "file" | "exec"` 的 SecretRef

如果基于密钥的路由在启动时无法解析其密钥，插件将跳过该路由并记录警告，而不是暴露一个损坏的端点。

## 安全模型

每个路由都受信任，可以以其配置的 `sessionKey` 的 TaskFlow 权限行事。

这意味着该路由可以检查和突变该会话拥有的 TaskFlow，因此您应该：

- 每个路由使用一个强大的唯一密钥
- 优先使用密钥引用而不是内联明文密钥
- 将路由绑定到最适合工作流的最窄会话
- 仅暴露您需要的特定 webhook 路径

插件应用：

- 共享密钥身份验证
- 请求体大小和超时保护
- 固定窗口速率限制
- 进行中请求限制
- 通过 `api.runtime.taskFlow.bindSession(...)` 进行所有者绑定的 TaskFlow 访问

## 请求格式

发送 `POST` 请求，包含：

- `Content-Type: application/json`
- `Authorization: Bearer <secret>` 或 `x-openclaw-webhook-secret: <secret>`

示例：

```bash
curl -X POST https://gateway.example.com/plugins/webhooks/zapier \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_SHARED_SECRET' \
  -d '{"action":"create_flow","goal":"Review inbound queue"}'
```

## 支持的操作

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

为路由的绑定会话创建一个受管理的 TaskFlow。

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

在现有的受管理 TaskFlow 内部创建一个受管理的子任务。

允许的运行时包括：

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

## 响应结构

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

插件故意从 webhook 响应中清除所有者/会话元数据。

## 相关文档

- [插件运行时 SDK](/plugins/sdk-runtime)
- [Hooks 和 webhooks 概览](/automation/hooks)
- [CLI webhooks](/cli/webhooks)
