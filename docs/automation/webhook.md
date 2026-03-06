---
summary: "用于唤醒和独立代理运行的Webhook入口"
read_when:
  - 添加或更改Webhook端点时
  - 将外部系统连接到OpenClaw时
title: "Webhooks"
---

# Webhooks

Gateway可以为外部触发器暴露一个小型HTTP webhook端点。

## 启用

```json5
{
  hooks: {
    enabled: true,
    token: "shared-secret",
    path: "/hooks",
    // 可选：限制显式的`agentId`路由到此白名单。
    // 省略或包含"*"以允许任何代理。
    // 设置[]表示拒绝所有显式的`agentId`路由。
    allowedAgentIds: ["hooks", "main"],
  },
}
```

说明：

- 当`hooks.enabled=true`时，`hooks.token`是必需的。
- `hooks.path`默认为`/hooks`。

## 认证

每个请求必须包含hook令牌。优先使用请求头：

- `Authorization: Bearer <token>`（推荐）
- `x-openclaw-token: <token>`
- 不接受查询字符串中的令牌（`?token=...`会返回`400`错误）。

## 端点

### `POST /hooks/wake`

请求体：

```json
{ "text": "System line", "mode": "now" }
```

- `text` **必填**（字符串）：事件描述（例如，“收到新邮件”）。
- `mode` 可选（`now` | `next-heartbeat`）：是立即触发心跳（默认`now`），还是等待下一次周期性检查。

效果：

- 将系统事件入队到**主**会话
- 如果`mode=now`，则触发立即心跳

### `POST /hooks/agent`

请求体：

```json
{
  "message": "Run this",
  "name": "Email",
  "agentId": "hooks",
  "sessionKey": "hook:email:msg-123",
  "wakeMode": "now",
  "deliver": true,
  "channel": "last",
  "to": "+15551234567",
  "model": "openai/gpt-5.2-mini",
  "thinking": "low",
  "timeoutSeconds": 120
}
```

- `message` **必填**（字符串）：代理需要处理的提示或消息。
- `name` 可选（字符串）：hook的人类可读名称（例如，“GitHub”），用于会话摘要的前缀。
- `agentId` 可选（字符串）：将此hook路由到指定代理。未知ID将回退到默认代理。设置后，hook将在解析出的代理的工作空间和配置下运行。
- `sessionKey` 可选（字符串）：用于识别代理会话的键。默认情况下此字段会被拒绝，除非设置`hooks.allowRequestSessionKey=true`。
- `wakeMode` 可选（`now` | `next-heartbeat`）：是立即触发心跳（默认`now`），还是等待下一次周期性检查。
- `deliver` 可选（布尔）：如果为`true`，代理的响应将发送到消息通道。默认为`true`。只有心跳确认的响应会被自动跳过。
- `channel` 可选（字符串）：消息投递通道。选项包括：`last`、`whatsapp`、`telegram`、`discord`、`slack`、`mattermost`（插件）、`signal`、`imessage`、`msteams`。默认为`last`。
- `to` 可选（字符串）：通道的接收者标识（例如，WhatsApp/Signal的电话号码，Telegram的聊天ID，Discord/Slack/Mattermost（插件）的频道ID，MS Teams的会话ID）。默认为主会话中的最后一个接收者。
- `model` 可选（字符串）：模型覆盖（例如`anthropic/claude-3-5-sonnet`或别名）。如果有限制，必须包含在允许模型列表中。
- `thinking` 可选（字符串）：思考级别覆盖（例如`low`、`medium`、`high`）。
- `timeoutSeconds` 可选（数字）：代理运行的最大持续时间（秒）。

效果：

- 运行一个**独立**代理行动（独立会话键）
- 始终将摘要发布到**主**会话
- 如果`wakeMode=now`，触发立即心跳

## 会话键策略（破坏性变更）

`/hooks/agent`请求体中的`sessionKey`覆盖默认禁用。

- 推荐做法：设置固定的`hooks.defaultSessionKey`并禁用请求覆盖。
- 可选：仅在必要时允许请求覆盖，并限制前缀。

推荐配置：

```json5
{
  hooks: {
    enabled: true,
    token: "${OPENCLAW_HOOKS_TOKEN}",
    defaultSessionKey: "hook:ingress",
    allowRequestSessionKey: false,
    allowedSessionKeyPrefixes: ["hook:"],
  },
}
```

兼容性配置（旧行为）：

```json5
{
  hooks: {
    enabled: true,
    token: "${OPENCLAW_HOOKS_TOKEN}",
    allowRequestSessionKey: true,
    allowedSessionKeyPrefixes: ["hook:"], // 强烈推荐
  },
}
```

### `POST /hooks/<name>`（映射）

自定义hook名称通过`hooks.mappings`解析（查看配置）。映射可以将任意请求体转换为`wake`或`agent`动作，支持可选的模板或代码转换。

映射选项摘要：

- `hooks.presets: ["gmail"]`启用内置的Gmail映射。
- `hooks.mappings`允许在配置中定义`match`、`action`和模板。
- `hooks.transformsDir` + `transform.module`加载JS/TS模块用于自定义逻辑。
  - `hooks.transformsDir`（如果设置）必须位于OpenClaw配置目录下的转换根目录内（通常是`~/.openclaw/hooks/transforms`）。
  - `transform.module`必须能在有效的转换目录中解析（禁止路径逃逸）。
- 使用`match.source`保持通用摄取端点（基于负载的路由）。
- TS转换需要TS加载器（如`bun`或`tsx`）或运行时预编译的`.js`文件。
- 在映射上设置`deliver: true` + `channel`/`to`以将回复路由到聊天界面
  （`channel`默认`last`，备选WhatsApp）。
- `agentId`将hook路由到指定代理；未知ID回退默认代理。
- `hooks.allowedAgentIds`限制显式的`agentId`路由。省略（或包含`*`）则允许任何代理。设置`[]`拒绝显式`agentId`路由。
- `hooks.defaultSessionKey`为未提供显式键时，设置hook代理运行的默认会话键。
- `hooks.allowRequestSessionKey`控制`/hooks/agent`请求体是否可设置`sessionKey`（默认：`false`）。
- `hooks.allowedSessionKeyPrefixes`可选限制请求体和映射中的显式`sessionKey`值。
- `allowUnsafeExternalContent: true`禁用该hook的外部内容安全包装器
  （危险，仅限受信任的内部来源）。
- `openclaw webhooks gmail setup`为`openclaw webhooks gmail run`写入`hooks.gmail`配置。
  详见 [Gmail Pub/Sub](/automation/gmail-pubsub) 获取完整的Gmail监听流程。

## 响应

- `/hooks/wake`返回`200`
- `/hooks/agent`返回`200`（异步运行已接受）
- 认证失败时返回`401`
- 同一客户端多次认证失败后返回`429`（查看`Retry-After`）
- 请求体无效时返回`400`
- 请求体过大时返回`413`

## 示例

```bash
curl -X POST http://127.0.0.1:18789/hooks/wake \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"text":"New email received","mode":"now"}'
```

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'x-openclaw-token: SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Summarize inbox","name":"Email","wakeMode":"next-heartbeat"}'
```

### 使用不同的模型

在代理请求体（或映射）中添加`model`，以覆盖该运行的模型：

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'x-openclaw-token: SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.2-mini"}'
```

如果您启用了`agents.defaults.models`限制，请确保覆盖模型包含在其中。

```bash
curl -X POST http://127.0.0.1:18789/hooks/gmail \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"source":"gmail","messages":[{"from":"Ada","subject":"Hello","snippet":"Hi"}]}'
```

## 安全性

- 将hook端点放置于回环地址、tailnet或受信任的反向代理之后。
- 使用专用hook令牌；不要重用gateway的认证令牌。
- 针对同一客户端地址的多次认证失败会进行速率限制，以阻止暴力破解尝试。
- 若使用多代理路由，设置`hooks.allowedAgentIds`以限制显式的`agentId`选择。
- 除非需要调用方自行选择会话，保持`hooks.allowRequestSessionKey=false`。
- 如果启用了请求中的`sessionKey`，请限制`hooks.allowedSessionKeyPrefixes`（例如`["hook:"]`）。
- 避免在webhook日志中包含敏感的原始请求体。
- 默认情况下，hook请求体被视为不受信任，并加以安全边界包装。
  如果必须为特定hook禁用此功能，设置该hook映射中的`allowUnsafeExternalContent: true`
  （危险操作）。
