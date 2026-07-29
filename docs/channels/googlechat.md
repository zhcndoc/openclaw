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

## Quick Setup (Beginner)

1. Create a Google Cloud project and enable **Google Chat API**.
   - Go to: [Google Chat API Credentials](https://console.cloud.google.com/apis/api/chat.googleapis.com/credentials)
   - If it is not enabled yet, enable this API.
2. Create a **service account**:
   - Click **Create Credentials** > **Service Account**.
   - You can enter any name (for example, `openclaw-chat`).
   - Leave permissions and principals empty (click **Continue**, then click **Done**).
3. Create and download a **JSON key**:
   - Click the newly created service account > **Keys** tab > **Add Key** > **Create new key** > **JSON** > **Create**.
4. Place the downloaded JSON file on the gateway host (for example, `~/.openclaw/googlechat-service-account.json`).
5. Create a Google Chat app in [Google Cloud Console Chat Configuration](https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat):
   - Fill in **Application info** (app name, avatar URL, description).
   - Enable **Interactive features**.
   - Under **Functionality**, check **Join spaces and group conversations**.
   - Under **Connection settings**, select **HTTP endpoint URL**.
   - Under **Triggers**, select **Use a common HTTP endpoint URL for all triggers**, and set it to your public gateway URL followed by `/googlechat` (see [Public URL](#public-url-webhook-only)).
   - Under **Visibility**, check **Make this Chat app available to specific people and groups in `<Your Domain>`**, and enter your email address.
   - Click **Save**.
6. Enable app status: refresh the page, find **App status**, set it to **Live - available to users**, then click **Save** again.
7. Configure OpenClaw with the service account and webhook audience (must match the Chat app configuration):
   - Environment variable: `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE=/path/to/service-account.json` (default account only), or
   - Configuration: see [Config highlights](#config-highlights). `openclaw channels add --channel googlechat` also accepts `--audience-type`, `--audience`, `--webhook-path`, and `--webhook-url`.
8. Start the gateway. Google Chat will send POST requests to your webhook path (default `/googlechat`).

## 添加到 Google Chat

当网关运行并且你的邮箱已在可见性列表中时：

1. 前往 [Google Chat](https://chat.google.com/)。
2. 点击 **Direct Messages** 旁边的 **+**（加号）图标。
3. 搜索你在 Google Cloud Console 中配置的 **应用名称**。
   - 由于该机器人是私有应用，它不会出现在 Marketplace 的浏览列表中；请按名称搜索。
4. 选择该机器人，点击 **Add** 或 **Chat**，然后发送一条消息。

## Public URL（仅 Webhook）

Google Chat webhooks 需要一个公开的 HTTPS 端点。出于安全考虑，仅将 **`/googlechat 路径`** 暴露到互联网，并将 OpenClaw 仪表板及其他端点保持私有。

### 方案 A：Tailscale Funnel（推荐）

使用 Tailscale Serve 提供私有仪表板，使用 Funnel 提供公开的 webhook 路径。

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

3. 仅公开暴露 webhook 路径：

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

你的公开 webhook URL 是 `https://<node-name>.<tailnet>.ts.net/googlechat`；仪表板则保持仅限 tailnet 访问，地址为 `https://<node-name>.<tailnet>.ts.net:8443/`。在 Google Chat 应用配置中使用公开 URL（不带 `:8443`）。

> 注意：此配置会在重启后持续生效。之后可使用 `tailscale funnel reset` 和 `tailscale serve reset` 将其移除。

### 方案 B：反向代理（Caddy）

仅代理 webhook 路径：

```caddy
your-domain.com {
    reverse_proxy /googlechat* localhost:18789
}
```

对 `your-domain.com/` 的请求将被忽略或返回 404，而 `your-domain.com/googlechat` 会路由到 OpenClaw。

### 方案 C：Cloudflare Tunnel

配置隧道的 ingress 规则，仅路由 webhook 路径：

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

在请求完成身份验证后，OpenClaw 会从存储中移除附加组件授权对象，并在返回 `200` 之前将 Google Chat `MESSAGE` 事件持久化入队。若持久化失败，则返回 `503`，以便 Google Chat 重试，而不是确认一个可能丢失的事件。

待处理或可重试的消息在 Gateway 重启后仍会保留，按空间序列化，并使用 Google Chat 消息资源名称在活跃或保留的完成记录存在时抑制重复队列条目。非消息操作会保留其现有的分离式 webhook 路径，不会获得这种持久队列保证。队列到 agent 边界的投递仍然是至少一次，因此在交接过程中发生崩溃时可能会重放一次对话轮次。

## 目标

使用以下标识符进行投递和 allowlist：

- 直接消息：`users/<userId>`（推荐）。
- Spaces：`spaces/<spaceId>`。
- 原始邮箱 `name@example.com` 是可变的，并且仅在 `channels.googlechat.dangerouslyAllowNameMatching: true` 时用于 allowlist 匹配。
- 已弃用：`users/<email>` 会被视为用户 id，而不是邮箱 allowlist 条目。
- 前缀 `googlechat:`、`google-chat:` 和 `gchat:` 都被接受并会被去除。

## 配置要点

```json5
{
  channels: {
    googlechat: {
      enabled: true,
      serviceAccountFile: "/path/to/service-account.json",
      // 或 serviceAccountRef: { source: "file", provider: "filemain", id: "/channels/googlechat/serviceAccount" }
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

- 服务账号凭据：`serviceAccountFile`（路径）、`serviceAccount`（内联 JSON 字符串或对象），或 `serviceAccountRef`（env/file SecretRef）。环境变量 `GOOGLE_CHAT_SERVICE_ACCOUNT`（内联 JSON）和 `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE`（路径）仅适用于默认账号。多账号设置使用 `channels.googlechat.accounts.<id>`，并使用相同的键，包括按账号配置的 `serviceAccountRef`。
- 当未设置 `webhookPath` 时，默认 webhook 路径为 `/googlechat`；也可以通过 `webhookUrl` 提供路径。
- 群组键必须是稳定的 space id（`spaces/<spaceId>`）。显示名称键已弃用，并会被记录为此状态。
- `dangerouslyAllowNameMatching` 会为允许列表重新启用可变的电子邮件主体匹配（紧急兼容模式）；doctor 会提醒包含电子邮件条目。
- Google Chat 反应操作不对外暴露。该插件使用服务账号认证，而 Google Chat 反应端点需要用户认证。现有的 `actions.reactions` 配置会被接受以保持兼容，但不会生效。
- 原生审批卡使用 Google Chat `cardsV2` 按钮点击，而不是 reaction 事件。审批者来自 `allowFrom` 或 `defaultTo`，并且必须是稳定的数字 `users/<id>` 值。
- 消息操作仅暴露文本 `send`。Google Chat 附件上传需要用户认证，而此插件使用服务账号认证，因此不对外暴露出站文件上传。
- `typingIndicator`：`message`（默认）会发送一个 `_<Bot> is typing..._` 占位符，并将其编辑为第一条回复；`none` 会禁用它；`reaction` 需要用户 OAuth，在当前服务账号认证下会记录错误并回退为 `message`。
- 入站附件（每条消息的第一个附件）会通过 Chat API 下载到媒体管线中，并受 `mediaMaxMb` 限制（默认 20）。
- 默认忽略机器人作者发送的消息。启用 `allowBots: true` 后，接受到的机器人消息将使用共享的 [bot loop protection](/channels/bot-loop-protection)：先配置 `channels.defaults.botLoopProtection`，然后通过 `channels.googlechat.botLoopProtection` 或 `channels.googlechat.groups.<space>.botLoopProtection` 进行覆盖。

密钥引用详情：[Secrets Management](/gateway/secrets)。

## 故障排查

### 405 Method Not Allowed

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

3. **配置更改后未重启 Gateway**：

   ```bash
   openclaw gateway restart
   ```

验证该渠道正在运行：

```bash
openclaw channels status
# 应显示：Google Chat default: enabled, configured, ...
```

### 其他问题

- `openclaw channels status --probe` 会显示身份验证错误以及缺失的 audience 配置（`audience` 和 `audienceType` 都是必需的）。
- 如果没有收到消息，请确认 Chat 应用的 webhook URL 和触发器配置。
- 如果 mention gating 阻止了回复，请将 `botUser` 设置为该应用的用户资源名称，并检查 `requireMention`。
- 发送测试消息时运行 `openclaw logs --follow`，可以查看请求是否到达 gateway。

## 相关内容

- [Channels 概览](/channels) — 所有支持的渠道
- [Channel 路由](/channels/channel-routing) — 消息的会话路由
- [Gateway 配置](/gateway/configuration)
- [Groups](/channels/groups) — 群聊行为和提及门控
- [Pairing](/channels/pairing) — DM 身份验证和配对流程
- [Security](/gateway/security) — 访问模型和加固
