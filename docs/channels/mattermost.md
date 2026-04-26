---
summary: "Mattermost 机器人设置和 OpenClaw 配置"
read_when:
  - 设置 Mattermost
  - 调试 Mattermost 路由
title: "Mattermost"
---

状态：捆绑插件（机器人令牌 + WebSocket 事件）。支持频道、群组和私聊。
Mattermost 是一个可自托管的团队消息平台；产品详情和下载请参见
[mattermost.com](https://mattermost.com) 官方网站。

## 捆绑插件

Mattermost 作为捆绑插件随当前的 OpenClaw 版本发布，因此正常的
打包构建不需要单独安装。

如果您使用的是较旧的版本或排除了 Mattermost 的自定义安装，
请手动安装：

通过 CLI（npm 注册表）安装：

```bash
openclaw plugins install @openclaw/mattermost
```

本地代码库安装（从 git 仓库运行时）：

```bash
openclaw plugins install ./path/to/local/mattermost-plugin
```

详情：[插件](/tools/plugin)

## 快速设置

1. 确保 Mattermost 插件可用。
   - 当前打包的 OpenClaw 版本已捆绑它。
   - 较旧/自定义安装可以使用上述命令手动添加。
2. 创建一个 Mattermost 机器人账户并复制 **机器人令牌**。
3. 复制 Mattermost **基础 URL**（例如，`https://chat.example.com`）。
4. 配置 OpenClaw 并启动网关。

最小配置示例：

```json5
{
  channels: {
    mattermost: {
      enabled: true,
      botToken: "mm-token",
      baseUrl: "https://chat.example.com",
      dmPolicy: "pairing",
    },
  },
}
```

## 原生斜杠命令

原生斜杠命令是可选功能。启用后，OpenClaw 通过 Mattermost API 注册以 `oc_*` 开头的斜杠命令，并在网关 HTTP 服务器接收回调 POST 请求。

```json5
{
  channels: {
    mattermost: {
      commands: {
        native: true,
        nativeSkills: true,
        callbackPath: "/api/channels/mattermost/command",
        // 当 Mattermost 无法直接访问网关时（反向代理/公网 URL）使用。
        callbackUrl: "https://gateway.example.com/api/channels/mattermost/command",
      },
    },
  },
}
```

注意：

- `native: "auto"` 默认为 Mattermost 禁用。设置 `native: true` 以启用。
- 如果省略 `callbackUrl`，OpenClaw 会根据网关主机/端口 + `callbackPath` 推导出一个。
- 对于多账户设置，`commands` 可以在顶层设置，也可以在
  `channels.mattermost.accounts.<id>.commands` 下设置（账户值覆盖顶层字段）。
- 命令回调使用 OpenClaw 注册 `oc_*` 命令时 Mattermost 返回的每命令令牌进行验证。
- 当注册失败、启动部分完成或回调令牌与注册的命令不匹配时，斜杠回调会失败关闭。
- 可达性要求：回调端点必须能从 Mattermost 服务器访问。
  - 除非 Mattermost 与 OpenClaw 运行在同一主机/网络命名空间，否则不要将 `callbackUrl` 设置为 `localhost`。
  - 除非该 URL 将 `/api/channels/mattermost/command` 反向代理到 OpenClaw，否则不要将 `callbackUrl` 设置为您的 Mattermost 基础 URL。
  - 快速检查方法是 `curl https://<gateway-host>/api/channels/mattermost/command`；GET 请求应返回 OpenClaw 的 `405 Method Not Allowed`，而不是 `404`。
- Mattermost 出站允许列表要求：
  - 如果您的回调目标是私有/尾网/内部地址，请将 Mattermost
    `ServiceSettings.AllowedUntrustedInternalConnections` 设置为包含回调主机/域名。
  - 使用主机/域名条目，而不是完整 URL。
    - 好：`gateway.tailnet-name.ts.net`
    - 坏：`https://gateway.tailnet-name.ts.net`

## 环境变量（默认账号）

若偏好使用环境变量，可在网关主机设置：

- `MATTERMOST_BOT_TOKEN=...`  
- `MATTERMOST_URL=https://chat.example.com`

环境变量仅作用于 **默认** 账号 (`default`)。其他账号需使用配置文件设定。

`MATTERMOST_URL` 不能从工作区 `.env` 中设置；请参见 [Workspace `.env` files](/gateway/security)。

## 聊天模式

Mattermost 自动响应私聊消息。频道行为由 `chatmode` 控制：

- `oncall`（默认）：仅当频道中被 @提及时回复。  
- `onmessage`：对频道中的每条消息都回复。  
- `onchar`：当消息以触发前缀开头时回复。

配置示例：

```json5
{
  channels: {
    mattermost: {
      chatmode: "onchar",
      oncharPrefixes: [">", "!"],
    },
  },
}
```

注意：

- `onchar` 模式仍然响应明确的 @提及。  
- 旧配置中仍可使用 `channels.mattermost.requireMention`，但推荐使用 `chatmode`。

## 线程和会话

使用 `channels.mattermost.replyToMode` 来控制频道和群组回复是否保留在主频道，或者在触发的帖子下开始一个线程。

- `off`（默认）：只有当入站帖子已经在一个线程中时才回复线程。
- `first`：对于顶级频道/群组帖子，在该帖子下启动一个线程，并将对话路由到线程范围的会话中。
- `all`：目前在 Mattermost 中与 `first` 的行为相同。
- 直接消息忽略此设置，保持非线程式。

配置示例：

```json5
{
  channels: {
    mattermost: {
      replyToMode: "all",
    },
  },
}
```

注意：

- 线程范围的会话使用触发帖子的 ID 作为线程根。
- 由于一旦 Mattermost 有了线程根，后续的消息块和媒体都会继续在同一个线程中，所以 `first` 和 `all` 目前是等价的。

## 访问控制（私聊）

- 默认值：`channels.mattermost.dmPolicy = "pairing"`（未知发送者会收到配对码）。  
- 批准方法：  
  - `openclaw pairing list mattermost`
  - `openclaw pairing approve mattermost <CODE>`  
- 公开私聊：设 `channels.mattermost.dmPolicy="open"` 并配置 `channels.mattermost.allowFrom=["*"]`。

## 频道（群组）

- 默认值：`channels.mattermost.groupPolicy = "allowlist"`（提及限制）。
- 使用 `channels.mattermost.groupAllowFrom` 将发送者加入允许列表（推荐使用用户 ID）。
- 每频道提及覆盖位于 `channels.mattermost.groups.<channelId>.requireMention`
  或 `channels.mattermost.groups["*"].requireMention` 作为默认值。
- `@username` 匹配是可变的，仅当 `channels.mattermost.dangerouslyAllowNameMatching: true` 时启用。
- 开放频道：`channels.mattermost.groupPolicy="open"`（提及限制）。
- 运行时注意：如果完全缺少 `channels.mattermost`，运行时将回退到 `groupPolicy="allowlist"` 进行群组检查（即使设置了 `channels.defaults.groupPolicy`）。

示例：

```json5
{
  channels: {
    mattermost: {
      groupPolicy: "open",
      groups: {
        "*": { requireMention: true },
        "team-channel-id": { requireMention: false },
      },
    },
  },
}
```

## 出站投递目标

`openclaw message send` 或定时任务/Webhook 发送时，使用以下目标格式：

- `channel:<id>` 表示频道  
- `user:<id>` 表示私聊  
- `@username` 表示私聊（通过 Mattermost API 解析）

裸 ID（如 `64ifufp...`）在 Mattermost 是**模糊不清**的（用户 ID 与频道 ID 不易区分）。

OpenClaw 采用**用户优先**的解析方式：

- 若存在该 ID 的用户（`GET /api/v4/users/<id>` 成功），OpenClaw 会通过 `/api/v4/channels/direct` 解析并发送**私聊**。  
- 否则，该 ID 被当作**频道 ID**处理。

若需要确定的行为，请始终使用明确前缀（`user:<id>` / `channel:<id>`）。

## 私聊频道重试

当 OpenClaw 向 Mattermost 私聊目标发送消息且需要先解析直聊频道时，默认会重试短暂的直聊频道创建失败。

使用 `channels.mattermost.dmChannelRetry` 在全局调整 Mattermost 插件的该行为，或在 `channels.mattermost.accounts.<id>.dmChannelRetry` 下为单个账号设置。

```json5
{
  channels: {
    mattermost: {
      dmChannelRetry: {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        timeoutMs: 30000,
      },
    },
  },
}
```

注意：

- 仅适用于私聊频道创建（`/api/v4/channels/direct`），不适用于所有 Mattermost API 调用。
- 重试适用于短暂故障，如速率限制、5xx 响应以及网络或超时错误。
- 除 `429` 外的 4xx 客户端错误被视为永久性错误，不会重试。

## 预览流式输出

Mattermost 会将思考过程、工具活动和部分回复文本流式写入一个单一的**草稿预览帖子**，当最终答案可以安全发送时会在原处完成。预览会在同一帖子 ID 上更新，而不是用每个块都向频道刷屏。媒体/错误类最终结果会取消挂起的预览编辑，并使用正常投递而不是刷新一个一次性的预览帖子。

通过 `channels.mattermost.streaming` 启用：

```json5
{
  channels: {
    mattermost: {
      streaming: "partial", // 关闭 | 部分 | 块 | 进度
    },
  },
}
```

注意：

- `partial` is the usual choice: one preview post that is edited as the reply grows, then finalized with the complete answer.
- `block` uses append-style draft chunks inside the preview post.
- `progress` shows a status preview while generating and only posts the final answer at completion.
- `off` disables preview streaming.
- If the stream cannot be finalized in place (for example the post was deleted mid-stream), OpenClaw falls back to sending a fresh final post so the reply is never lost.
- Reasoning-only payloads are suppressed from channel posts, including text that arrives as a `> Reasoning:` blockquote. Set `/reasoning on` to see thinking in other surfaces; the Mattermost final post keeps the answer only.
- See [Streaming](/concepts/streaming#preview-streaming-modes) for the channel-mapping matrix.

## 反应（消息工具）

- 使用 `message action=react` 且 `channel=mattermost`。  
- `messageId` 是 Mattermost 消息帖 ID。  
- `emoji` 支持名称如 `thumbsup` 或 `:+1:`（冒号可选）。  
- 设 `remove=true`（布尔值）时移除反应表情。  
- 反应添加/移除事件会作为系统事件转发给路由的代理会话。

示例：

```
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup remove=true
```

配置：

- `channels.mattermost.actions.reactions`：启用/禁用反应表情操作（默认启用）。  
- 每账号覆盖：`channels.mattermost.accounts.<id>.actions.reactions`。

## 交互式按钮（消息工具）

发送带有可点击按钮的消息。用户点击按钮时，代理接收选择内容并可做出响应。

通过为频道能力添加 `inlineButtons` 启用按钮：

```json5
{
  channels: {
    mattermost: {
      capabilities: ["inlineButtons"],
    },
  },
}
```

使用 `message action=send` 并带 `buttons` 参数。按钮为二维数组（行的按钮）：

```
message action=send channel=mattermost target=channel:<channelId> buttons=[[{"text":"是","callback_data":"yes"},{"text":"否","callback_data":"no"}]]
```

按钮字段：

- `text`（必填）：显示标签。  
- `callback_data`（必填）：点击后返回的值（作为动作 ID）。  
- `style`（可选）："default"、"primary" 或 "danger"。

用户点击按钮时：

1. 所有按钮会被替换为确认行（例如 "✓ **是** 被 @user 选择"）。  
2. 代理接收到该选择作为入站消息并响应。

注意：

- 按钮回调使用 HMAC-SHA256 验证（自动完成，无需配置）。  
- Mattermost 会从 API 响应中剥离回调数据（安全特性），点击后所有按钮均会被清除，无法局部移除。  
- 含有连字符或下划线的动作 ID 会被自动清理（Mattermost 路由限制）。

配置：

- `channels.mattermost.capabilities`：能力字符串数组。添加 `"inlineButtons"` 会在代理系统提示中启用按钮工具描述。  
- `channels.mattermost.interactions.callbackBaseUrl`：按钮回调的外部基础 URL（例如 `https://gateway.example.com`），适用于 Mattermost 无法直接访问绑定主机时。  
- 多账号时，也可在 `channels.mattermost.accounts.<id>.interactions.callbackBaseUrl` 下设置。  
- 省略 `interactions.callbackBaseUrl` 时，OpenClaw 会根据 `gateway.customBindHost` + `gateway.port` 生成回调 URL，最后回退到 `http://localhost:<port>`。  
- 可达性规则：按钮回调 URL 必须可被 Mattermost 服务器访问。仅当 Mattermost 与 OpenClaw 共用主机或网络命名空间时，localhost 才可用。  
- 若回调目标为私有/尾网/内部地址，请将其主机/域名添加至 Mattermost 配置 `ServiceSettings.AllowedUntrustedInternalConnections`。

### 直接 API 集成（外部脚本）

外部脚本和 Webhook 可以直接通过 Mattermost REST API 发送按钮，
而不是通过代理的 `message` 工具。尽可能使用插件中的 `buildButtonAttachments()`；
如果直接发送原始 JSON，请遵循以下规则：

**消息结构：**

```json5
{
  channel_id: "<channelId>",
  message: "请选择一项：",
  props: {
    attachments: [
      {
        actions: [
          {
            id: "mybutton01", // 仅允许字母数字，见下文
            type: "button", // 必填，否则点击将被忽略
            name: "批准", // 显示标签
            style: "primary", // 可选："default"、"primary"、"danger"
            integration: {
              url: "https://gateway.example.com/mattermost/interactions/default",
              context: {
                action_id: "mybutton01", // 必须与按钮 id 匹配（用于名称显示）
                action: "approve",
                // ... 任何自定义字段 ...
                _token: "<hmac>", // 见下方 HMAC 部分
              },
            },
          },
        ],
      },
    ],
  },
}
```

**关键规则：**

1. 附件必须放在 `props.attachments` 中，不能放在顶层 `attachments`（顶层字段会被忽略）。  
2. 每个动作必须有 `type: "button"`，否则点击会被无声忽略。  
3. 每个动作必须有 `id` 字段，Mattermost 会忽略无 ID 的动作。  
4. `id` 中只允许字母和数字 (`[a-zA-Z0-9]`)。连字符和下划线会导致 Mattermost 服务器端动作路由失败（返回 404），使用前请剥离。  
5. `context.action_id` 要与按钮 `id` 匹配，以便确认消息显示按钮名称（如“批准”），而非原始 ID。  
6. 必须提供 `context.action_id`，否则交互处理器将返回 400。

**HMAC 令牌生成：**

网关用 HMAC-SHA256 验证按钮点击。外部脚本需生成与网关验证逻辑匹配的令牌：

1. 从机器人令牌派生密钥：  
   `HMAC-SHA256(key="openclaw-mattermost-interactions", data=botToken)`  
2. 构造除 `_token` 外的所有上下文字段对象。  
3. 使用**排序键**且**无空格**序列化（OpenClaw 使用带排序键的 `JSON.stringify`，生成紧凑字符串）。  
4. 签名：`HMAC-SHA256(key=secret, data=serializedContext)`  
5. 将生成的十六进制摘要作为 `_token` 加入上下文。

Python 示例：

```python
import hmac, hashlib, json

# 从机器人令牌派生密钥：
secret = hmac.new(
    b"openclaw-mattermost-interactions",
    bot_token.encode(), hashlib.sha256
).hexdigest()

# 构造上下文（不含 _token）：
ctx = {"action_id": "mybutton01", "action": "approve"}
# 使用排序键和无空格序列化：
payload = json.dumps(ctx, sort_keys=True, separators=(",", ":"))
# 生成令牌：
token = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()

# 将令牌加入上下文：
context = {**ctx, "_token": token}
```

常见 HMAC 误区：

- Python 默认 `json.dumps` 会添加空格（`{"key": "val"}`），须用 `separators=(",", ":")` 来匹配 JavaScript 紧凑格式（`{"key":"val"}`）。  
- 必须签名 **全部** 上下文字段（除 `_token` 外），否则验证会静默失败。  
- 指定 `sort_keys=True`，因为网关签名前会排序字段，Mattermost 存储时也可能变更字段顺序。  
- 密钥应由机器人令牌确定（确定性），而非随机字节。该密钥在生成按钮和网关验证之间必须一致。

## 目录适配器

Mattermost 插件包含目录适配器，通过 Mattermost API 解析频道名和用户名。这样可在 `openclaw message send` 及定时/Webhook 发送时使用 `#channel-name` 和 `@username` 目标。

无需额外配置，适配器自动使用账号配置中的机器人令牌。

## 多账号支持

Mattermost 支持在 `channels.mattermost.accounts` 下配置多个账号：

```json5
{
  channels: {
    mattermost: {
      accounts: {
        default: { name: "主账号", botToken: "mm-token", baseUrl: "https://chat.example.com" },
        alerts: { name: "告警", botToken: "mm-token-2", baseUrl: "https://alerts.example.com" },
      },
    },
  },
}
```

## 故障排查

- 频道中无回复：确保机器人在频道中并提及它 (oncall)，使用触发前缀 (onchar)，或设置 `chatmode: "onmessage"`。
- 认证错误：检查机器人令牌、基础 URL 以及账号是否已启用。
- 多账号问题：环境变量仅适用于 `default` 账号。
- 原生斜杠命令返回 `Unauthorized: invalid command token.`：OpenClaw
  未接受回调令牌。典型原因：
  - 斜杠命令注册失败或在启动时仅部分完成
  - 回调请求到达了错误的网关/账号
  - Mattermost 中仍有旧命令指向之前的回调目标
  - 网关重启后未重新激活斜杠命令
- 如果原生斜杠命令停止工作，检查日志中是否有
  `mattermost: failed to register slash commands` 或
  `mattermost: native slash commands enabled but no commands could be registered`。
- 如果 `callbackUrl` 被省略且日志警告回调解析为
  `http://127.0.0.1:18789/...`，则该 URL 可能仅在
  Mattermost 与 OpenClaw 运行在同一主机/网络命名空间时才可访问。请设置一个
  明确的外部可访问 `commands.callbackUrl` 代替。
- 按钮显示为白框：代理可能发送了格式错误的按钮数据。检查每个按钮是否同时具有 `text` 和 `callback_data` 字段。
- 按钮渲染但点击无反应：验证 Mattermost 服务器配置中的 `AllowedUntrustedInternalConnections` 是否包含 `127.0.0.1 localhost`，以及 ServiceSettings 中的 `EnablePostActionIntegration` 是否为 `true`。
- 点击按钮返回 404：按钮 `id` 可能包含连字符或下划线。Mattermost 的操作路由器在非字母数字 ID 上会出错。仅使用 `[a-zA-Z0-9]`。
- 网关日志显示 `invalid _token`：HMAC 不匹配。检查是否对所有上下文字段进行了签名（而非子集），使用排序后的键，并使用紧凑 JSON（无空格）。参见上方的 HMAC 部分。
- 网关日志显示 `missing _token in context`：`_token` 字段不在按钮的上下文中。确保在构建集成负载时包含它。
- 确认显示原始 ID 而非按钮名称：`context.action_id` 与按钮的 `id` 不匹配。将两者设置为相同的清洗值。
- 代理不知道按钮的存在：在 Mattermost 频道配置中添加 `capabilities: ["inlineButtons"]`。

## 相关

- [频道概览](/channels) — 所有支持的频道
- [配对](/channels/pairing) — 私信认证和配对流程
- [群组](/channels/groups) — 群聊行为和提及管控
- [频道路由](/channels/channel-routing) — 消息的会话路由
- [安全性](/gateway/security) — 访问模型和加固
