---
summary: "Google Chat 应用支持状态、功能和配置"
read_when:
  - "正在处理 Google Chat 渠道功能"
title: "Google Chat"
---

Google Chat 通过官方 `@openclaw/googlechat` 插件运行：通过 Google Chat API webhooks 处理私信和空间（仅 HTTP 端点，不支持 Pub/Sub）。

## <a id="install"></a> 安装

```bash
openclaw plugins install @openclaw/googlechat
```

本地检出（当从 git 仓库运行时）：

```bash
openclaw plugins install ./path/to/local/googlechat-plugin
```

## <a id="quick-setup-(beginner)"></a><a id="quick-setup-beginner"></a> 快速设置（初级）

1. 创建一个 Google Cloud 项目并启用 **Google Chat API**。
   - Go 发送至： [Google 聊天 API Credentials](https://console.cloud.google.com/apis/api/chat.googleapis.com/credentials)
   - 如果尚未启用，请启用此 API。
2. 创建一个 **服务账号**：
   - 点击 **创建凭据** > **服务账号**。
   - 将其命名为任意名称（e.g.、`openclaw-chat`）。
   - 将权限和主体留空（点击 **继续**，然后点击 **完成**）。
3. 创建并下载一个 **JSON 密钥**：
   - 点击新创建的服务账号 > **密钥** 标签页 > **添加密钥** > **创建新密钥** > **JSON** > **创建**。
4. 将下载的 JSON 文件存储在网关主机上（e.g.、`~/.openclaw/googlechat-service-account.json`）。
5. 在 [Google Cloud Console 聊天 Configuration](https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat) 中创建 Google Chat 应用：
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

## <a id="add-to-google-chat"></a> 添加到 Google Chat

当网关运行并且你的邮箱已在可见性列表中时：

1. Go 至 [Google Chat](https://chat.google.com/)。
2. 点击 **私信** 旁边的 **+**（加号）图标。
3. 搜索你在 Google Cloud Console 中配置的 **应用名称**。
   - 该机器人_不会_出现在市场浏览列表中，因为它是一个私人应用程序。按名称搜索它。
4. 选择该机器人，点击 **添加** 或 **聊天**，然后发送一条消息。

## <a id="public-url-(webhook-only)"></a><a id="public-url-webhook-only"></a> 公开 URL（仅 Webhook）

Google Chat Webhook 需要公共 HTTPS 端点。为了安全起见，仅向 Internet 公开 **`/googlechat` 路径**，并将 OpenClaw 仪表板和其他端点保持私有。

### <a id="option-a%3A-tailscale-funnel-(recommended)"></a><a id="option-a-tailscale-funnel-recommended"></a> 方案 A：Tailscale Funnel（推荐）

使用 Tailscale Serve 提供私有仪表板，使用 Funnel 提供公开的 Webhook 路径。

1. 检查你的网关绑定到了哪个地址：

   ```bash
   # Linux (iproute2):
   ss -tlnp | grep 18789

   # macOS (no ss):
   lsof -iTCP:18789 -sTCP:LISTEN
   ```

   记下 IP（e.g.、`127.0.0.1`、`0.0.0.0` 或 Tailscale `100.x.x.x` 地址）。

2. 将仪表板仅暴露给 tailnet（端口 8443）：

   ```bash
   # If bound to localhost (127.0.0.1 or 0.0.0.0):
   tailscale serve --bg --https 8443 http://127.0.0.1:18789

   # If bound to a Tailscale IP only:
   tailscale serve --bg --https 8443 http://100.x.x.x:18789
   ```

3. 仅公开暴露 Webhook 路径：

   ```bash
   # If bound to localhost (127.0.0.1 or 0.0.0.0):
   tailscale funnel --bg --set-path /googlechat http://127.0.0.1:18789/googlechat

   # If bound to a Tailscale IP only:
   tailscale funnel --bg --set-path /googlechat http://100.x.x.x:18789/googlechat
   ```

4. 如果出现提示，请访问输出中显示的授权 URL，以为此节点启用 Funnel。

5. 验证：

   ```bash
   tailscale serve status
   tailscale funnel status
   ```

您的公共 Webhook URL 是 `https://<node-name>.<tailnet>.ts.net/googlechat`。仪表板仅在 `https://<node-name>.<tailnet>.ts.net:8443/` 处保持尾网状态。在 Google Chat 应用程序配置中使用公共 URL（不含 `:8443`）。

> 注意：此配置会在重启后持续生效。之后可使用 `tailscale funnel reset` 和 `tailscale serve reset` 将其移除。

### <a id="option-b%3A-reverse-proxy-(caddy)"></a><a id="option-b-reverse-proxy-caddy"></a> 方案 B：反向代理（Caddy）

仅代理 Webhook 路径：

```caddy
your-domain.com {
    reverse_proxy /googlechat* localhost:18789
}
```

对 `your-domain.com/` 的请求将被忽略或返回 404，而 `your-domain.com/googlechat` 会路由到 OpenClaw。

### <a id="option-c%3A-cloudflare-tunnel"></a><a id="option-c-cloudflare-tunnel"></a> 方案 C：Cloudflare 隧道

配置隧道的 ingress 规则，仅路由 Webhook 路径：

- **路径**：`/googlechat` -> `http://localhost:18789/googlechat`
- **默认规则**：HTTP 404（未找到）。

## <a id="how-it-works"></a> 工作原理

1. Google Chat 将 JSON POST 到网关 Webhook 路径（仅限 POST，需要 JSON 内容类型，每个 IP 速率受到限制）。
2. OpenClaw 在分发前对每个请求进行身份验证：
   - Chat 应用程序事件携带 `Authorization: Bearer <token>`。在解析完整正文之前会验证令牌。
   - Google 工作区附加事件在正文中携带令牌 （`authorizationEventObject.systemIdToken`）。 OpenClaw 在验证之前在更严格的预授权预算（16 KB，3 秒）下读取它们。
3. 令牌会根据 `audienceType` + `audience` 进行检查：
   - `audienceType: "app-url"` → 受众是你的 HTTPS webhook URL。
   - `audienceType: "project-number"` → 受众是 Cloud 项目编号。
   - `app-url` 下的附加令牌还需要将 `appPrincipal` 设置为应用程序的数字 OAuth 2.0 客户端 ID（21 位数字，而不是电子邮件）。否则验证将失败并记录警告。
4. 消息按空间路由：
   - Spaces 获取每个空间的会话 `agent:<agentId>:googlechat:group:<spaceId>`。使用 `replyToMode: "first"` 或 `"all"`，自动回复保留在入站线程中。默认和显式的 `"off"` 模式将回复保留在顶层，无论键入指示器是启用还是禁用。
   - 默认情况下，DM 会折叠到代理的主会话中。为每个对等点 DM 会话设置 `session.dmScope`（请参阅 [Session](/concepts/session)）。
5. DM 访问默认是配对的。未知发件人会收到配对码。批准：
   - `openclaw pairing approve googlechat <code>`
6. 组空间默认需要@-提及。从针对该应用程序的聊天 `USER_MENTION` 注释中检测到提及。如果检测需要应用程序的用户资源名称，请设置 `botUser`（e.g.、`users/1234567890`）。
7. 当执行或插件审批从 Google Chat 开始并且配置了稳定的 `users/<id>` 审批者时，OpenClaw 在原始空间或线程中发布本机审批卡 （`cardsV2`）。卡片按钮带有不透明的回调标记。仅当原生下发不可用时，才会出现手动提示“`/approve <id> <decision>`”。

### <a id="inbound-durability"></a> 入站持久性

请求身份验证后，OpenClaw 从存储中删除附加授权对象，并在返回 `200` 之前对 Google Chat `MESSAGE` 事件进行持久排队。持久性失败返回 `503`，允许 Google Chat 重试而不是确认可能丢失的事件。持久排队的 `200` 携带 `x-openclaw-delivery-accepted: durable`。非消息操作确认和错误响应省略了标记，因此反向代理可以要求它区分持久接受和通用 `200`。

待处理或可重试的消息在 Gateway 重启后仍会保留，按空间序列化，并使用 Google Chat 消息资源名称在活跃或保留的完成记录存在时抑制重复队列条目。非消息操作会保留其现有的分离式 webhook 路径，不会获得这种持久队列保证。队列到 agent 边界的投递仍然是至少一次，因此在交接过程中发生崩溃时可能会重放一次对话轮次。

## <a id="targets"></a> 目标

使用以下标识符进行投递和允许列表匹配：

- 直接消息：`users/<userId>`（推荐）。
- 空格：`spaces/<spaceId>`。
- 原始邮箱 `name@example.com` 是可变的，并且仅在 `channels.googlechat.dangerouslyAllowNameMatching: true` 时用于允许列表匹配。
- 已弃用：`users/<email>` 被视为用户 ID，而不是电子邮件白名单条目。
- 前缀 `googlechat:`、`google-chat:` 和 `gchat:` 都被接受并会被去除。

## <a id="config-highlights"></a> 配置要点

```json5
{
  channels: {
    googlechat: {
      enabled: true,
      serviceAccountFile: "/path/to/service-account.json",
      // or serviceAccount: { source: "file", provider: "filemain", id: "/channels/googlechat/serviceAccount" }
      audienceType: "app-url",
      audience: "https://gateway.example.com/googlechat",
      appPrincipal: "123456789012345678901", // add-on verification only; numeric OAuth client ID
      webhookPath: "/googlechat",
      botUser: "users/1234567890", // optional; helps mention detection
      allowBots: false,
      dmPolicy: "pairing",
      allowFrom: ["users/1234567890"],
      groupPolicy: "allowlist",
      groups: {
        "spaces/AAAA": {
          enabled: true,
          requireMention: true,
          users: ["users/1234567890"],
          systemPrompt: "Short answers only.",
        },
      },
      typingIndicator: "message",
      mediaMaxMb: 20,
    },
  },
}
```

注意：

- 服务帐户凭据：`serviceAccountFile`（路径）或`serviceAccount`（内联JSON字符串、对象或env/file/exec/store SecretRef）。环境变量 `GOOGLE_CHAT_SERVICE_ACCOUNT`（内联 JSON）和 `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE`（路径）仅适用于默认帐户。多账户设置使用具有相同密钥的 `channels.googlechat.accounts.<id>`，包括每个账户 `serviceAccount` SecretRefs。
- Omited 账户 `dmPolicy` 和 `groupPolicy` 继承通道根。明确的账户政策获胜。根默认分别为 `pairing` 和 `allowlist`。 `accounts.default` 中的共享设置的优先级低于根设置。其凭据 `enabled` 和 `dangerouslyAllowNameMatching` 不会由命名帐户继承。
- 未设置 `webhookPath` 时，默认 Webhook 路径为 `/googlechat`。 `webhookUrl` 可以改为提供路径。
- Group 键必须是稳定的空间 ID （`spaces/<spaceId>`）。显示名称键已被弃用并按原样记录。
- `dangerouslyAllowNameMatching` 重新启用白名单的可变电子邮件主体匹配（打破玻璃兼容性模式）。医生对电子邮件条目发出警告。
- Google Chat 不会公开 reaction 操作。该插件使用服务账户身份验证，而 Google Chat reaction 端点要求用户身份验证。请使用 `openclaw doctor --fix` 移除不受支持的旧版 reaction 设置。
- 原生审批卡片使用 Google Chat `cardsV2` 按钮点击，而不是 reaction 事件。审批者来自 `allowFrom` 或 `defaultTo`，并且必须是稳定的数字型 `users/<id>` 值。
- 消息操作仅公开文本 `send`。Google Chat 附件上传要求用户身份验证，而此插件使用服务账户身份验证，因此不会公开出站文件上传功能。
- `typingIndicator`：`message`（默认）发布 `_<Bot> is typing..._` 占位符并将其编辑到第一个回复中。 `none` 禁用它。 `reaction` 需要用户 OAuth，目前回退到 `message`，并在服务帐户身份验证下记录错误。
- OpenClaw 通过聊天 API 将每条消息的第一个入站附件下载到媒体管道中。 `mediaMaxMb` 下载上限（默认 20）。 Google 未下载驱动器文件。代理收到不可用附件通知，要求直接上传文件。其他不受支持的附件源会收到相同的上传指南。带有多个附件的邮件包含未处理的附加附件的计数通知。超大附件保留其大小限制通知。
- 默认情况下会忽略机器人发送的消息。启用 `allowBots: true` 后，接受的机器人消息会使用共享的[机器人循环保护](/channels/bot-loop-protection)：配置 `channels.defaults.botLoopProtection`，然后使用 `channels.googlechat.botLoopProtection` 或 `channels.googlechat.groups.<space>.botLoopProtection` 覆盖。

自定义表情符号列表不可用，因为 Google Chat 的 `customEmojis.list` 端点需要使用 `chat.customemojis` 或 `chat.customemojis.readonly` 范围进行用户身份验证。该插件仅作为具有 `chat.bot` 范围的服务帐户进行身份验证，该帐户无法访问该端点。

秘密参考详细信息：[Secrets Management](/gateway/secrets)。

## <a id="troubleshooting"></a> 故障排查

### <a id="405-method-not-allowed"></a> 405 方法不允许

如果 Google Cloud Logs Explorer 显示如下错误：

```text
status code: 405, reason phrase: HTTP error response: HTTP/1.1 405 Method Not Allowed
```

未注册 webhook 处理程序。常见原因：

1. **未配置频道**：缺少 `channels.googlechat` 部分。请通过以下命令验证：

   ```bash
   openclaw config get channels.googlechat
   ```

   如果返回“找不到配置路径”，请添加配置（参见[配置亮点](#config-highlights)）。

2. **插件未启用**：检查插件状态：

   ```bash
   openclaw plugins list | grep googlechat
   ```

   如果显示“disabled”，则运行`openclaw plugins enable googlechat`，查看[应用结果](/plugins/manage-plugins#apply-changes-and-inspect)。

3. **配置未应用**：检查[热重载](/gateway/configuration/hot-reload)状态和网关日志。如果网关离线，请启动网关。如果您更改了服务环境，请重新启动网关以加载它。

验证该渠道正在运行：

```bash
openclaw channels status
# Should show: Google Chat default: enabled, configured, ...
```

### <a id="other-issues"></a> 其他问题

- `openclaw channels status --probe` 会显示身份验证错误以及缺失的受众配置（`audience` 和 `audienceType` 都是必需的）。
- 如果没有收到消息，请确认 Chat 应用的 webhook URL 和触发器配置。
- 如果提及门控阻止了回复，请将 `botUser` 设置为该应用的用户资源名称，并检查 `requireMention`。
- 发送测试消息时运行 `openclaw logs --follow`，可以查看请求是否到达网关。

## <a id="related"></a> 相关内容

- [Channels Overview](/channels) — 所有支持的通道
- [通道路由](/channels/channel-routing) — 消息的会话路由
- [网关配置](/gateway/configuration)
- [Groups](/channels/groups) — 群聊行为和提及门控
- [配对](/channels/pairing) — DM 身份验证和配对流程
- [Security](/gateway/security) — 访问模型和强化
