---
summary: "Google Chat 应用支持状态、功能和配置"
read_when:
  - 正在处理 Google Chat 渠道功能
title: "Google Chat"
---

Google Chat 通过官方 `@openclaw/googlechat` 插件运行：通过 Google Chat API webhooks 处理私信和空间（仅 HTTP 端点，不支持 Pub/Sub）。

## 安装

```bash
openclaw plugins install @openclaw/googlechat
```

本地检出（当从 git 仓库运行时）：

```bash
openclaw plugins install ./path/to/local/googlechat-plugin
```

## 快速设置（初学者）

1. 创建一个 Google Cloud 项目并启用 **Google Chat API**。
   - 前往：[Google Chat API 凭据](https://console.cloud.google.com/apis/api/chat.googleapis.com/credentials)
   - 如果尚未启用，请启用此 API。
2. 创建一个 **服务账号**：
   - 点击 **创建凭据** > **服务账号**。
   - 可以输入任意名称（例如 `openclaw-chat`）。
   - 将权限和主体留空（点击 **继续**，然后点击 **完成**）。
3. 创建并下载一个 **JSON 密钥**：
   - 点击新创建的服务账号 > **密钥** 标签页 > **添加密钥** > **创建新密钥** > **JSON** > **创建**。
4. 将下载的 JSON 文件放置在网关主机上（例如 `~/.openclaw/googlechat-service-account.json`）。
5. 在 [Google Cloud Console Chat 配置](https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat) 中创建一个 Google Chat 应用：
   - 填写 **应用信息**（应用名称、头像 URL、描述）。
   - 启用 **互动功能**。
   - 在 **功能** 下，勾选 **加入聊天室和群组对话**。
   - 在 **连接设置** 下，选择 **HTTP 端点 URL**。
   - 在 **触发器** 下，选择 **为所有触发器使用通用 HTTP 端点 URL**，并将其设置为你的公开网关 URL 后跟 `/googlechat`（参见[公开 URL](#public-url-webhook-only)）。
   - 在 **可见性** 下，勾选 **让此 Chat 应用对 `<Your Domain>` 中的特定人员和群组可用**，并输入你的电子邮件地址。
   - 点击 **保存**。
6. 启用应用状态：刷新页面，找到 **应用状态**，将其设置为 **在线 - 对用户可用**，然后再次点击 **保存**。
7. 使用服务账号和 Webhook 受众配置 OpenClaw（必须与 Chat 应用配置匹配）：
   - 环境变量：`GOOGLE_CHAT_SERVICE_ACCOUNT_FILE=/path/to/service-account.json`（仅限默认账号），或
   - 配置：参见[配置要点](#config-highlights)。`openclaw channels add --channel googlechat` 还接受 `--audience-type`、`--audience`、`--webhook-path` 和 `--webhook-url`。
8. 启动网关。Google Chat 会向你的 Webhook 路径发送 POST 请求（默认为 `/googlechat`）。

## 添加到 Google Chat

当网关运行并且你的邮箱已在可见性列表中时：

1. 前往 [Google Chat](https://chat.google.com/)。
2. 点击 **私信** 旁边的 **+**（加号）图标。
3. 搜索你在 Google Cloud Console 中配置的 **应用名称**。
   - 由于该机器人是私有应用，它不会出现在 Marketplace 的浏览列表中；请按名称搜索。
4. 选择该机器人，点击 **添加** 或 **聊天**，然后发送一条消息。

## 公开 URL（仅 Webhook）

Google Chat Webhook 需要一个公开的 HTTPS 端点。出于安全考虑，仅将 **`/googlechat 路径`** 暴露到互联网，并将 OpenClaw 仪表板及其他端点保持私有。

### 方案 A：Tailscale Funnel（推荐）

使用 Tailscale Serve 提供私有仪表板，使用 Funnel 提供公开的 Webhook 路径。

1. 检查你的网关绑定到了哪个地址：

   ```bash
   ss -tlnp | grep 18789
   ```

   记录下 IP（例如 `127.0.0.1`、`0.0.0.0` 或 Tailscale 的 `100.x.x.x` 地址）。

2. 将仪表板仅暴露给 tailnet（端口 8443）：

   ```bash
   # 如果绑定到 localhost（127.0.0.1 或 0.0.0.0）：
   tailscale serve --bg --https 8443 http://127.0.0.1:18789

   # 如果仅绑定到 Tailscale IP：
   tailscale serve --bg --https 8443 http://100.x.x.x:18789
   ```

3. 仅公开暴露 Webhook 路径：

   ```bash
   # 如果绑定到 localhost（127.0.0.1 或 0.0.0.0）：
   tailscale funnel --bg --set-path /googlechat http://127.0.0.1:18789/googlechat

   # 如果仅绑定到 Tailscale IP：
   tailscale funnel --bg --set-path /googlechat http://100.x.x.x:18789/googlechat
   ```

4. 如果出现提示，请访问输出中显示的授权 URL，以为此节点启用 Funnel。

5. 验证：

   ```bash
   tailscale serve status
   tailscale funnel status
   ```

你的公开 Webhook URL 是 `https://<node-name>.<tailnet>.ts.net/googlechat`；仪表板则保持仅限 tailnet 访问，地址为 `https://<node-name>.<tailnet>.ts.net:8443/`。在 Google Chat 应用配置中使用公开 URL（不带 `:8443`）。

> 注意：此配置会在重启后持续生效。之后可使用 `tailscale funnel reset` 和 `tailscale serve reset` 将其移除。

### 方案 B：反向代理（Caddy）

仅代理 Webhook 路径：

```caddy
your-domain.com {
    reverse_proxy /googlechat* localhost:18789
}
```

对 `your-domain.com/` 的请求将被忽略或返回 404，而 `your-domain.com/googlechat` 会路由到 OpenClaw。

### 方案 C：Cloudflare 隧道

配置隧道的 ingress 规则，仅路由 Webhook 路径：

- **路径**：`/googlechat` -> `http://localhost:18789/googlechat`
- **默认规则**：HTTP 404（未找到）

## 工作原理

1. Google Chat 将 JSON POST 到网关 webhook 路径（仅支持 POST，要求 JSON content type，并按 IP 进行速率限制）。
2. OpenClaw 在分发前对每个请求进行身份验证：
   - Chat 应用事件通过 `Authorization: Bearer <token>` 携带令牌；在解析完整请求体之前会先验证该令牌。
   - Google Workspace 插件事件将令牌放在请求体中（`authorizationEventObject.systemIdToken`），并在更严格的预认证预算下（16 KB，3 s）读取后再进行验证。
3. 令牌会根据 `audienceType` + `audience` 进行检查：
   - `audienceType: "app-url"` → 受众是你的 HTTPS webhook URL。
   - `audienceType: "project-number"` → 受众是 Cloud 项目编号。
   - `app-url` 下的插件令牌还要求 `appPrincipal` 设置为应用的数字 OAuth 2.0 client ID（21 位数字，不是邮箱）；否则验证失败，并会记录警告。
4. 消息按空间路由：
   - 空间会获得按空间划分的会话 `agent:<agentId>:googlechat:group:<spaceId>`；回复会发送到消息线程。
   - 私信默认会合并到 agent 的主会话中；设置 `session.dmScope` 可为每个对端创建独立的私信会话（参见 [Session](/concepts/session)）。
5. 私信访问默认采用配对机制。未知发送者会收到配对码；使用以下命令批准：
   - `openclaw pairing approve googlechat <code>`
6. 群组空间默认需要 @ 提及。提及会通过指向应用的 Google Chat `USER_MENTION` 注解来检测；如果检测需要应用的用户资源名称，请设置 `botUser`（例如 `users/1234567890`）。
7. 当 exec 或插件审批从 Google Chat 发起，并且配置了稳定的 `users/<id>` 审批人时，OpenClaw 会在原始空间或线程中发布原生审批卡片（`cardsV2`）。卡片按钮携带不可见的回调令牌；只有在原生投递不可用时，才会显示手动 `/approve <id> <decision>` 提示。

### 入站持久性

请求通过身份验证后，OpenClaw 会从存储中移除插件授权对象，并在返回 `200` 之前将 Google Chat `MESSAGE` 事件持久化排队。持久化失败时会返回 `503`，让 Google Chat 可以重试，而不是确认一个可能丢失的事件。持久化排队成功的 `200` 响应会携带 `x-openclaw-delivery-accepted: durable`；非消息操作的确认响应和错误响应会省略该标记，因此反向代理可以要求此标记，以区分持久化接受与普通的 `200` 响应。

待处理或可重试的消息在 Gateway 重启后仍会保留，按空间序列化，并使用 Google Chat 消息资源名称在活跃或保留的完成记录存在时抑制重复队列条目。非消息操作会保留其现有的分离式 webhook 路径，不会获得这种持久队列保证。队列到 agent 边界的投递仍然是至少一次，因此在交接过程中发生崩溃时可能会重放一次对话轮次。

## 目标

使用以下标识符进行投递和允许列表匹配：

- 直接消息：`users/<userId>`（推荐）。
- Spaces：`spaces/<spaceId>`。
- 原始邮箱 `name@example.com` 是可变的，并且仅在 `channels.googlechat.dangerouslyAllowNameMatching: true` 时用于允许列表匹配。
- 已弃用：`users/<email>` 会被视为用户 ID，而不是邮箱允许列表条目。
- 前缀 `googlechat:`、`google-chat:` 和 `gchat:` 都被接受并会被去除。

## 配置要点

```json5
{
  channels: {
    googlechat: {
      enabled: true,
      serviceAccountFile: "/path/to/service-account.json",
      // 或 serviceAccount: { source: "file", provider: "filemain", id: "/channels/googlechat/serviceAccount" }
      audienceType: "app-url",
      audience: "https://gateway.example.com/googlechat",
      appPrincipal: "123456789012345678901", // 仅用于 add-on 验证；数字 OAuth 客户端 ID
      webhookPath: "/googlechat",
      botUser: "users/1234567890", // 可选；有助于提及检测
      allowBots: false,
      dmPolicy: "pairing",
      allowFrom: ["users/1234567890"],
      groupPolicy: "allowlist",
      groups: {
        "spaces/AAAA": {
          enabled: true,
          requireMention: true,
          users: ["users/1234567890"],
          systemPrompt: "仅简短回答。",
        },
      },
      typingIndicator: "message",
      mediaMaxMb: 20,
    },
  },
}
```

说明：

- 服务账号凭据：`serviceAccountFile`（路径）或 `serviceAccount`（内联 JSON 字符串、对象，或 env/file/exec SecretRef）。环境变量 `GOOGLE_CHAT_SERVICE_ACCOUNT`（内联 JSON）和 `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE`（路径）仅适用于默认账号。多账号配置使用 `channels.googlechat.accounts.<id>`，并使用相同的键，包括每个账号的 `serviceAccount` SecretRef。
- 当未设置 `webhookPath` 时，默认 Webhook 路径为 `/googlechat`；也可以通过 `webhookUrl` 提供路径。
- 群组键必须是稳定的空间 ID（`spaces/<spaceId>`）。显示名称键已弃用，日志中也会标记这一点。
- `dangerouslyAllowNameMatching` 会重新启用用于允许列表的可变电子邮件主体匹配（紧急兼容模式）；doctor 会针对电子邮件条目发出警告。
- Google Chat 的反应操作不会公开。该插件使用服务账号身份验证，而 Google Chat 的反应端点要求用户身份验证。请使用 `openclaw doctor --fix` 移除不受支持的旧版反应设置。
- 原生审批卡片使用 Google Chat 的 `cardsV2` 按钮点击，而不是反应事件。审批人来自 `allowFrom` 或 `defaultTo`，并且必须是稳定的数字型 `users/<id>` 值。
- 消息操作仅公开文本 `send`。Google Chat 的附件上传要求用户身份验证，而此插件使用服务账号身份验证，因此不公开出站文件上传功能。
- `typingIndicator`：`message`（默认）会发布一个 `_<Bot> is typing..._` 占位消息，并在第一条回复时将其编辑为回复内容；`none` 会禁用该功能；`reaction` 需要用户 OAuth，目前在服务账号身份验证下会回退到 `message`，并记录错误日志。
- 入站附件（每条消息的第一个附件）会通过 Chat API 下载到媒体处理管线中，并受 `mediaMaxMb` 限制（默认为 20）。
- 默认会忽略由机器人撰写的消息。设置 `allowBots: true` 后，接受的机器人消息会使用共享的[机器人循环保护](/channels/bot-loop-protection)：配置 `channels.defaults.botLoopProtection`，然后使用 `channels.googlechat.botLoopProtection` 或 `channels.googlechat.groups.<space>.botLoopProtection` 覆盖。

密钥引用详情：[密钥管理](/gateway/secrets)。

## 故障排查

### 405 方法不允许

如果 Google Cloud Logs Explorer 显示如下错误：

```text
status code: 405, reason phrase: HTTP error response: HTTP/1.1 405 Method Not Allowed
```

未注册 webhook 处理程序。常见原因：

1. **未配置频道**：缺少 `channels.googlechat` 部分。请通过以下命令验证：

   ```bash
   openclaw config get channels.googlechat
   ```

   如果返回 “Config path not found”，请添加该配置（参见 [配置要点](#配置要点)）。

2. **插件未启用**：检查插件状态：

   ```bash
   openclaw plugins list | grep googlechat
   ```

   如果显示 “disabled”，请在配置中添加 `plugins.entries.googlechat.enabled: true`。

3. **配置更改后未重启网关**：

   ```bash
   openclaw gateway restart
   ```

验证该渠道正在运行：

```bash
openclaw channels status
# 应显示：Google Chat default: enabled, configured, ...
```

### 其他问题

- `openclaw channels status --probe` 会显示身份验证错误以及缺失的受众配置（`audience` 和 `audienceType` 都是必需的）。
- 如果没有收到消息，请确认 Chat 应用的 webhook URL 和触发器配置。
- 如果提及门控阻止了回复，请将 `botUser` 设置为该应用的用户资源名称，并检查 `requireMention`。
- 发送测试消息时运行 `openclaw logs --follow`，可以查看请求是否到达网关。

## 相关内容

- [渠道概览](/channels) — 所有支持的渠道
- [渠道路由](/channels/channel-routing) — 消息的会话路由
- [网关配置](/gateway/configuration)
- [群组](/channels/groups) — 群聊行为和提及门控
- [配对](/channels/pairing) — 私信身份验证和配对流程
- [安全性](/gateway/security) — 访问模型和加固
