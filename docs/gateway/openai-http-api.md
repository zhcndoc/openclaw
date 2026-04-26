---
summary: "从 Gateway 暴露一个兼容 OpenAI 的 /v1/chat/completions HTTP 端点"
read_when:
  - 集成期望 OpenAI Chat Completions 的工具
title: "OpenAI 聊天补全"
---

OpenClaw’s Gateway 可以提供一个小型的 OpenAI 兼容 Chat Completions 端点。

该端点**默认是禁用的**，请先在配置中启用。

- `POST /v1/chat/completions`
- 与 Gateway 使用相同端口（WS + HTTP 复用）：`http://<gateway-host>:<port>/v1/chat/completions`

当 Gateway 的 OpenAI 兼容 HTTP 接口启用时，它还会提供：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/responses`

在底层，请求作为正常的 Gateway 代理运行执行（与 `openclaw agent` 使用相同的代码路径），因此路由/权限/配置与您的 Gateway 保持一致。

## 身份验证

使用 Gateway 认证配置。

常见 HTTP 认证路径：

- 共享密钥认证（`gateway.auth.mode="token"` 或 `"password"`）：
  `Authorization: Bearer <token-or-password>`
- 受信任的携带身份 HTTP 认证（`gateway.auth.mode="trusted-proxy"`）：
  通过配置的身份感知代理进行路由，并让其注入
  所需的身份请求头
- 私有入口开放认证（`gateway.auth.mode="none"`）：
  无需认证请求头

注意事项：

- 当 `gateway.auth.mode="token"` 时，使用 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- 当 `gateway.auth.mode="password"` 时，使用 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
- 当 `gateway.auth.mode="trusted-proxy"` 时，HTTP 请求必须来自
  配置的非回环受信任代理源；同主机回环代理不
  满足此模式。
- 如果配置了 `gateway.auth.rateLimit` 且发生过多认证失败，端点将返回 `429` 并带有 `Retry-After`。

## 安全边界（重要）

请将此端点视为 Gateway 实例的**完全操作员访问**接口。

- 此处的 HTTP bearer 认证并非狭窄的每用户范围模型。
- 此端点的有效 Gateway token/password 应被视为所有者/操作员凭证。
- 请求通过与受信任操作员操作相同的控制平面代理路径运行。
- 此端点上没有单独的非所有者/每用户工具边界；一旦调用者通过此处的 Gateway 认证，OpenClaw 即将该调用者视为此 gateway 的受信任操作员。
- 对于共享密钥认证模式（`token` 和 `password`），即使调用者发送了较窄的 `x-openclaw-scopes` 请求头，端点也会恢复正常的完整操作员默认值。
- 受信任的携带身份 HTTP 模式（例如受信任代理认证或 `gateway.auth.mode="none"`）在存在时尊重 `x-openclaw-scopes`，否则回退到正常的操作员默认范围集。
- 如果目标代理策略允许敏感工具，此端点可以使用它们。
- 仅将此端点保留在回环/tailnet/私有入口上；不要将其直接暴露给公共互联网。

认证矩阵：

- `gateway.auth.mode="token"` 或 `"password"` + `Authorization: Bearer ...`
  - 证明拥有共享 gateway 操作员密钥
  - 忽略较窄的 `x-openclaw-scopes`
  - 恢复完整的默认操作员范围集：
    `operator.admin`, `operator.approvals`, `operator.pairing`,
    `operator.read`, `operator.talk.secrets`, `operator.write`
  - 将此端点上的聊天回合视为所有者发送者回合
- 受信任的携带身份 HTTP 模式（例如受信任代理认证，或私有入口上的 `gateway.auth.mode="none"`）
  - 认证某些外部受信任身份或部署边界
  - 当该请求头存在时尊重 `x-openclaw-scopes`
  - 当该请求头缺失时回退到正常的操作员默认范围集
  - 仅当调用者明确缩小范围并省略 `operator.admin` 时才失去所有者语义

参见 [安全](/gateway/security) 和 [远程访问](/gateway/remote)。

## 以代理为先的模型约定

OpenClaw 将 OpenAI 的 `model` 字段视为**代理目标**，而不是原始的提供商模型 ID。

- `model: "openclaw"` 路由到配置的默认代理。
- `model: "openclaw/default"` 也路由到配置的默认代理。
- `model: "openclaw/<agentId>"` 路由到特定代理。

可选请求头：

- `x-openclaw-model: <provider/model-or-bare-id>` 覆盖所选代理的后端模型。
- `x-openclaw-agent-id: <agentId>` 仍作为兼容性覆盖保留支持。
- `x-openclaw-session-key: <sessionKey>` 完全控制会话路由。
- `x-openclaw-message-channel: <channel>` 为通道感知的提示和策略设置合成入口通道上下文。

仍接受的兼容性别名：

- `model: "openclaw:<agentId>"`
- `model: "agent:<agentId>"`

## 启用端点

设置 `gateway.http.endpoints.chatCompletions.enabled` 为 `true`：

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: true },
      },
    },
  },
}
```

## 禁用端点

设置 `gateway.http.endpoints.chatCompletions.enabled` 为 `false`：

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: false },
      },
    },
  },
}
```

## 会话行为

默认情况下，该端点**每次请求无状态**（每次调用生成新的会话密钥）。

如果请求中包含 OpenAI 的 `user` 字符串，Gateway 会派生一个稳定的会话密钥，从而使重复调用可以共享代理会话。

## 为什么此接口很重要

这是自托管前端和工具的最高杠杆兼容性集合：

- 大多数 Open WebUI、LobeChat 和 LibreChat 设置都期望 `/v1/models`。
- 许多 RAG 系统期望 `/v1/embeddings`。
- 现有的 OpenAI 聊天客户端通常可以从 `/v1/chat/completions` 开始。
- 越来越多的原生代理客户端更倾向于 `/v1/responses`。

## 模型列表与代理路由

<AccordionGroup>
  <Accordion title="`/v1/models` 返回什么？">
    一个 OpenClaw 代理目标列表。

    返回的 ID 是 `openclaw`、`openclaw/default` 和 `openclaw/<agentId>` 条目。
    直接将它们用作 OpenAI `model` 的值。

  </Accordion>
  <Accordion title="`/v1/models` 列出的是代理还是子代理？">
    它列出的是顶级代理目标，而不是后端提供商模型，也不是子代理。

    子代理保持内部执行拓扑。它们不会作为伪模型出现。

  </Accordion>
  <Accordion title="为什么包含 `openclaw/default`？">
    `openclaw/default` 是配置默认代理的稳定别名。

    这意味着即使实际默认代理 ID 在不同环境之间发生变化，客户端也可以继续使用一个可预测的 ID。

  </Accordion>
  <Accordion title="如何覆盖后端模型？">
    使用 `x-openclaw-model`。

    示例：
    `x-openclaw-model: openai/gpt-5.4`
    `x-openclaw-model: gpt-5.5`

    如果省略，所选代理将使用其正常配置的模型选择运行。

  </Accordion>
  <Accordion title="嵌入如何适应此约定？">
    `/v1/embeddings` 使用相同的代理目标 `model` ID。

    使用 `model: "openclaw/default"` 或 `model: "openclaw/<agentId>"`。
    当您需要特定的嵌入模型时，在 `x-openclaw-model` 中发送。
    如果没有该请求头，请求将通过到所选代理的正常嵌入设置。

  </Accordion>
</AccordionGroup>

## 流式传输（SSE）

设置 `stream: true` 以接收服务器发送事件（SSE）：

- `Content-Type: text/event-stream`
- 每条事件行格式为 `data: <json>`
- 流结束时发送 `data: [DONE]`

## Open WebUI 快速设置

对于基本的 Open WebUI 连接：

- 基础 URL: `http://127.0.0.1:18789/v1`
- macOS 上的 Docker 基础 URL: `http://host.docker.internal:18789/v1`
- API 密钥：您的 Gateway bearer token
- 模型：`openclaw/default`

预期行为：

- `GET /v1/models` 应列出 `openclaw/default`
- Open WebUI 应将 `openclaw/default` 作为聊天模型 ID 使用
- 如果您希望该代理使用特定的后端提供商/模型，请设置该代理的正常默认模型，或发送 `x-openclaw-model`

快速探测：

```bash
curl -sS http://127.0.0.1:18789/v1/models \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

如果返回 `openclaw/default`，那么大多数 Open WebUI 设置都可以使用相同的基础 URL 和 token 连接。

## 示例

非流式：

```bash
curl -sS http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "openclaw/default",
    "messages": [{"role":"user","content":"hi"}]
  }'
```

流式：

```bash
curl -N http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-model: openai/gpt-5.4' \
  -d '{
    "model": "openclaw/research",
    "stream": true,
    "messages": [{"role":"user","content":"hi"}]
  }'
```

列出模型：

```bash
curl -sS http://127.0.0.1:18789/v1/models \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

获取单个模型：

```bash
curl -sS http://127.0.0.1:18789/v1/models/openclaw%2Fdefault \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

创建嵌入：

```bash
curl -sS http://127.0.0.1:18789/v1/embeddings \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-model: openai/text-embedding-3-small' \
  -d '{
    "model": "openclaw/default",
    "input": ["alpha", "beta"]
  }'
```

注意事项：

- `/v1/models` 返回 OpenClaw 代理目标，而不是原始提供商目录。
- `openclaw/default` 始终存在，因此同一个稳定 id 可以在不同环境中通用。
- 后端提供商/模型覆盖应放在 `x-openclaw-model` 中，而不是 OpenAI 的 `model` 字段里。
- `/v1/embeddings` 支持 `input` 为字符串或字符串数组。

## 相关内容

- [配置参考](/gateway/configuration-reference)
- [OpenAI](/providers/openai)
