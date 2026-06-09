---
summary: "Google Chat 应用支持状态、功能和配置"
read_when:
  - 正在处理 Google Chat 渠道功能
title: "Google Chat"
---

状态：可下载插件，通过 Google Chat API webhook 支持 DM + 空间（仅 HTTP）。

## 安装

在配置该频道之前，请先安装 Google Chat：

```bash
openclaw plugins install @openclaw/googlechat
```

本地检出（当从 git 仓库运行时）：

```bash
openclaw plugins install ./path/to/local/googlechat-plugin
```

## 快速设置（新手）

1. 创建一个 Google Cloud 项目并启用 **Google Chat API**。
   - 前往：[Google Chat API Credentials](https://console.cloud.google.com/apis/api/chat.googleapis.com/credentials)
   - 如果 API 尚未启用，请启用它。
2. 创建一个 **Service Account**：
   - 点击 **Create Credentials** > **Service Account**。
   - 随便起一个名字（例如 `openclaw-chat`）。
   - 权限留空（点击 **Continue**）。
   - 拥有访问权限的主体留空（点击 **Done**）。
3. 创建并下载 **JSON Key**：
   - 在服务账号列表中，点击你刚创建的那个。
   - 进入 **Keys** 选项卡。
   - 点击 **Add Key** > **Create new key**。
   - 选择 **JSON** 并点击 **Create**。
4. 将下载的 JSON 文件存放在你的网关主机上（例如 `~/.openclaw/googlechat-service-account.json`）。
5. 在 [Google Cloud Console Chat Configuration](https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat) 中创建一个 Google Chat 应用：
   - 填写 **Application info**：
     - **App name**： （例如 `OpenClaw`）
     - **Avatar URL**： （例如 `https://openclaw.ai/logo.png`）
     - **Description**： （例如 `Personal AI Assistant`）
   - 启用 **Interactive features**。
   - 在 **Functionality** 下，勾选 **Join spaces and group conversations**。
   - 在 **Connection settings** 下，选择 **HTTP endpoint URL**。
   - 在 **Triggers** 下，选择 **Use a common HTTP endpoint URL for all triggers**，并将其设置为你的网关公网 URL 后接 `/googlechat`。
     - _提示：运行 `openclaw status` 查看你的网关公网 URL。_
   - 在 **Visibility** 下，勾选 **Make this Chat app available to specific people and groups in `<Your Domain>`**。
   - 在文本框中输入你的邮箱地址（例如 `user@example.com`）。
   - 点击底部的 **Save**。
6. **启用应用状态**：
   - 保存后，**刷新页面**。
   - 找到 **App status** 区域（通常在保存后靠近顶部或底部）。
   - 将状态改为 **Live - available to users**。
   - 再次点击 **Save**。
7. 使用服务账号路径 + webhook 受众配置 OpenClaw：
   - 环境变量：`GOOGLE_CHAT_SERVICE_ACCOUNT_FILE=/path/to/service-account.json`
   - 或配置：`channels.googlechat.serviceAccountFile: "/path/to/service-account.json"`。
8. 设置 webhook audience 类型 + 值（与 Chat 应用配置一致）。
9. 启动网关。Google Chat 会向你的 webhook 路径发送 POST 请求。

## 添加到 Google Chat

当网关运行起来并且你的邮箱已添加到可见性列表后：

1. 前往 [Google Chat](https://chat.google.com/)。
2. 点击 **Direct Messages** 旁边的 **+**（加号）图标。
3. 在搜索栏中（你通常添加联系人的位置），输入你在 Google Cloud Console 中配置的 **App name**。
   - **注意**：该机器人不会出现在 “Marketplace” 浏览列表中，因为它是一个私有应用。你必须通过名称搜索它。
4. 从结果中选择你的机器人。
5. 点击 **Add** 或 **Chat**，开始 1:1 对话。
6. 发送 “Hello” 以触发助手！

## 公网 URL（仅 Webhook）

Google Chat webhook 需要一个公网 HTTPS 端点。出于安全考虑，**仅将 `/googlechat` 路径** 暴露到互联网。将 OpenClaw 仪表板和其他敏感端点保留在你的私有网络中。

### 方案 A：Tailscale Funnel（推荐）

使用 Tailscale Serve 提供私有仪表板，使用 Funnel 提供公网 webhook 路径。这样可以保持 `/` 私有，同时只暴露 `/googlechat`。

1. **检查你的网关绑定到哪个地址：**

   ```bash
   ss -tlnp | grep 18789
   ```

   记下 IP 地址（例如 `127.0.0.1`、`0.0.0.0`，或者你的 Tailscale IP，如 `100.x.x.x`）。

2. **仅向 tailnet 暴露仪表板（端口 8443）：**

   ```bash
   # 如果绑定到 localhost（127.0.0.1 或 0.0.0.0）：
   tailscale serve --bg --https 8443 http://127.0.0.1:18789

   # 如果仅绑定到 Tailscale IP（例如 100.106.161.80）：
   tailscale serve --bg --https 8443 http://100.106.161.80:18789
   ```

3. **仅公开 webhook 路径：**

   ```bash
   # 如果绑定到 localhost（127.0.0.1 或 0.0.0.0）：
   tailscale funnel --bg --set-path /googlechat http://127.0.0.1:18789/googlechat

   # 如果仅绑定到 Tailscale IP（例如 100.106.161.80）：
   tailscale funnel --bg --set-path /googlechat http://100.106.161.80:18789/googlechat
   ```

4. **为 Funnel 访问授权该节点：**
   如果出现提示，请访问输出中显示的授权 URL，以在你的 tailnet 策略中为此节点启用 Funnel。

5. **验证配置：**

   ```bash
   tailscale serve status
   tailscale funnel status
   ```

你的公网 webhook URL 将是：
`https://<node-name>.<tailnet>.ts.net/googlechat`

你的私有仪表板仍然只对 tailnet 可见：
`https://<node-name>.<tailnet>.ts.net:8443/`

在 Google Chat 应用配置中使用公网 URL（不带 `:8443`）。

> 注意：此配置会在重启后持续保留。若要以后移除，请运行 `tailscale funnel reset` 和 `tailscale serve reset`。

### 方案 B：反向代理（Caddy）

如果你使用像 Caddy 这样的反向代理，只代理特定路径：

```caddy
your-domain.com {
    reverse_proxy /googlechat* localhost:18789
}
```

使用此配置时，任何对 `your-domain.com/` 的请求都会被忽略或返回 404，而 `your-domain.com/googlechat` 会安全地路由到 OpenClaw。

### 方案 C：Cloudflare Tunnel

将你的隧道入口规则配置为仅路由 webhook 路径：

- **Path**：`/googlechat` -> `http://localhost:18789/googlechat`
- **Default Rule**：HTTP 404（Not Found）

## 工作原理

1. Google Chat 向网关发送 webhook POST 请求。每个请求都包含一个 `Authorization: Bearer <token>` 头。
   - 当该头存在时，OpenClaw 会在读取/解析完整 webhook 正文之前验证 bearer 认证。
   - 支持在正文中携带 `authorizationEventObject.systemIdToken` 的 Google Workspace Add-on 请求，这类请求通过更严格的预认证正文预算来处理。
2. OpenClaw 使用配置的 `audienceType` + `audience` 验证令牌：
   - `audienceType: "app-url"` → audience 是你的 HTTPS webhook URL。
   - `audienceType: "project-number"` → audience 是 Cloud 项目编号。
3. 消息按空间路由：
   - 私信使用会话键 `agent:<agentId>:googlechat:direct:<spaceId>`。
   - 空间使用会话键 `agent:<agentId>:googlechat:group:<spaceId>`。
4. 默认私信访问采用配对机制。未知发送者会收到一个配对码；使用以下命令批准：
   - `openclaw pairing approve googlechat <code>`
5. 群聊空间默认需要 @ 提及。若提及检测需要应用的用户名，请使用 `botUser`。
6. 当来自 Google Chat 的 exec 或插件审批请求启动，并且配置了稳定的 `users/<id>` 审批者时，OpenClaw 会在发起空间或线程中发布原生的 Google Chat 审批卡。卡片按钮使用不透明的回调令牌；仅当无法投递原生审批时，才会显示手动的 `/approve <id> <decision>` 提示。

## 目标对象

使用以下标识符进行投递和 allowlist：

- 私信：`users/<userId>`（推荐）。
- 原始邮箱 `name@example.com` 是可变的，仅在 `channels.googlechat.dangerouslyAllowNameMatching: true` 时用于直接 allowlist 匹配。
- 已弃用：`users/<email>` 会被视为用户 id，而不是邮箱 allowlist。
- 空间：`spaces/<spaceId>`。

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
      webhookPath: "/googlechat",
      botUser: "users/1234567890", // 可选；有助于提及检测
      allowBots: false,
      dm: {
        policy: "pairing",
        allowFrom: ["users/1234567890"],
      },
      groupPolicy: "allowlist",
      groups: {
        "spaces/AAAA": {
          enabled: true,
          requireMention: true,
          users: ["users/1234567890"],
          systemPrompt: "仅简短回答。",
        },
      },
      actions: { reactions: true },
      typingIndicator: "message",
      mediaMaxMb: 20,
    },
  },
}
```

说明：

- 服务账号凭据也可以以内联方式通过 `serviceAccount` 传入（JSON 字符串）。
- 也支持 `serviceAccountRef`（环境变量/文件 SecretRef），包括 `channels.googlechat.accounts.<id>.serviceAccountRef` 下的按账号引用。
- 如果未设置 `webhookPath`，默认 webhook 路径为 `/googlechat`。
- `dangerouslyAllowNameMatching` 会重新启用可变邮箱主体的 allowlist 匹配（应急兼容模式）。
- 启用 `actions.reactions` 后，可通过 `reactions` 工具和 `channels action` 使用 reactions。
- 原生审批卡使用 Google Chat 的 `cardsV2` 按钮点击，而不是 reaction 事件。审批人来自 `dm.allowFrom` 或 `defaultTo`，并且必须是稳定的数值型 `users/<id>` 值。
- 消息动作提供用于文本的 `send` 和用于显式附件发送的 `upload-file`。`upload-file` 接受 `media` / `filePath` / `path`，以及可选的 `message`、`filename` 和线程目标。
- `typingIndicator` 支持 `message`（默认）、`none` 和 `reaction`（reaction 需要用户 OAuth）。
- 附件会通过 Chat API 下载，并存储在媒体管道中（大小上限由 `mediaMaxMb` 限制）。
- 默认会忽略由机器人发送的 Google Chat 消息。如果你有意设置 `allowBots: true`，被接受的机器人消息会使用共享的 [bot loop protection](/channels/bot-loop-protection)。请先配置 `channels.defaults.botLoopProtection`，然后在某个空间需要不同预算时，用 `channels.googlechat.botLoopProtection` 或 `channels.googlechat.groups.<space>.botLoopProtection` 覆盖。

密钥引用详情：[Secrets Management](/gateway/secrets)。

## 故障排查

### 405 Method Not Allowed

如果 Google Cloud Logs Explorer 显示如下错误：

```
status code: 405, reason phrase: HTTP error response: HTTP/1.1 405 Method Not Allowed
```

这意味着 webhook handler 没有注册。常见原因：

1. **渠道未配置**：你的配置中缺少 `channels.googlechat` 部分。使用以下命令验证：

   ```bash
   openclaw config get channels.googlechat
   ```

   如果返回 “Config path not found”，请添加该配置（参见 [配置要点](#配置要点)）。

2. **插件未启用**：检查插件状态：

   ```bash
   openclaw plugins list | grep googlechat
   ```

   如果显示 “disabled”，请在配置中添加 `plugins.entries.googlechat.enabled: true`。

3. **网关未重启**：添加配置后，请重启网关：

   ```bash
   openclaw gateway restart
   ```

验证该渠道正在运行：

```bash
openclaw channels status
# 应显示：Google Chat default: enabled, configured, ...
```

### 其他问题

- 使用 `openclaw channels status --probe` 检查认证错误或缺少 audience 配置。
- 如果没有消息到达，请确认 Chat 应用的 webhook URL + 事件订阅。
- 如果 mention gating 阻止回复，请将 `botUser` 设置为应用的用户资源名称，并验证 `requireMention`。
- 发送测试消息时使用 `openclaw logs --follow`，查看请求是否到达网关。

相关文档：

- [Gateway configuration](/gateway/configuration)
- [Security](/gateway/security)
- [Reactions](/tools/reactions)

## 相关内容

- [频道概览](/channels) — 所有支持的频道
- [配对](/channels/pairing) — DM 身份验证和配对流程
- [群组](/channels/groups) — 群聊行为和提及限制
- [频道路由](/channels/channel-routing) — 消息的会话路由
- [安全性](/gateway/security) — 访问模型和加固
