---
summary: "Mattermost 机器人设置和 OpenClaw 配置"
read_when:
  - 设置 Mattermost
  - 调试 Mattermost 路由
title: "Mattermost"
sidebarTitle: "Mattermost"
---

状态：捆绑插件（bot token + WebSocket 事件）。支持频道、群组和私信。Mattermost 是一个可自托管的团队消息平台；产品详情和下载请参见官方网站 [mattermost.com](https://mattermost.com)。

## 捆绑插件

<Note>
Mattermost 已作为当前 OpenClaw 版本中的捆绑插件提供，因此常规打包构建不需要单独安装。
</Note>

如果你使用的是较旧的构建版本，或者是排除了 Mattermost 的自定义安装，请在发布新 npm 包后安装当前版本：

<Tabs>
  <Tab title="npm registry">
    ```bash
    openclaw plugins install @openclaw/mattermost
    ```
  </Tab>
  <Tab title="Local checkout">
    ```bash
    openclaw plugins install ./path/to/local/mattermost-plugin
    ```
  </Tab>
</Tabs>

如果 npm 报告 OpenClaw 维护的包已弃用，请使用当前的打包版
OpenClaw 构建，或使用本地检出路径，直到发布更新的 npm 包。

详情：[插件](/tools/plugin)

## 快速设置

<Steps>
  <Step title="确保插件可用">
    当前打包版 OpenClaw 版本已经内置它。较旧/自定义安装可以使用上面的命令手动添加。
  </Step>
  <Step title="创建 Mattermost bot">
    创建一个 Mattermost bot 账号并复制 **bot token**。
  </Step>
  <Step title="复制基础 URL">
    复制 Mattermost 的 **base URL**（例如 `https://chat.example.com`）。
  </Step>
  <Step title="配置 OpenClaw 并启动网关">
    最小配置：

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

  </Step>
</Steps>

## 原生斜杠命令

原生斜杠命令是可选启用的。启用后，OpenClaw 会通过 Mattermost API 注册 `oc_*` 斜杠命令，并在网关 HTTP 服务器上接收回调 POST 请求。

```json5
{
  channels: {
    mattermost: {
      commands: {
        native: true,
        nativeSkills: true,
        callbackPath: "/api/channels/mattermost/command",
        // 当 Mattermost 无法直接访问网关时使用（反向代理/公网 URL）。
        callbackUrl: "https://gateway.example.com/api/channels/mattermost/command",
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="行为说明">
    - `native: "auto"` 对 Mattermost 默认是禁用的。设置 `native: true` 以启用。
    - 如果省略 `callbackUrl`，OpenClaw 会根据网关 host/port + `callbackPath` 推导出一个。
    - 对于多账号配置，`commands` 可以设置在顶层，或设置在 `channels.mattermost.accounts.<id>.commands` 下（账号值会覆盖顶层字段）。
    - 命令回调会使用 Mattermost 在 OpenClaw 注册 `oc_*` 命令时返回的每个命令令牌进行校验。
    - 当注册失败、启动不完整，或者回调令牌与已注册命令之一不匹配时，斜杠回调会失败并关闭。

  </Accordion>
  <Accordion title="可达性要求">
    回调端点必须能够被 Mattermost 服务器访问。

    - 不要将 `callbackUrl` 设置为 `localhost`，除非 Mattermost 与 OpenClaw 运行在同一主机/网络命名空间中。
    - 不要将 `callbackUrl` 设置为你的 Mattermost base URL，除非该 URL 会通过反向代理将 `/api/channels/mattermost/command` 转发到 OpenClaw。
    - 一个快速检查方式是执行 `curl https://<gateway-host>/api/channels/mattermost/command`；GET 请求应返回来自 OpenClaw 的 `405 Method Not Allowed`，而不是 `404`。

  </Accordion>
  <Accordion title="Mattermost 出站允许列表">
    如果你的回调目标指向私有/tailnet/内部地址，请将 Mattermost 的 `ServiceSettings.AllowedUntrustedInternalConnections` 设置为包含回调主机/域名。

    请使用主机/域名条目，不要使用完整 URL。

    - 正确：`gateway.tailnet-name.ts.net`
    - 错误：`https://gateway.tailnet-name.ts.net`

  </Accordion>
</AccordionGroup>

## 环境变量（默认账号）

如果你更喜欢使用环境变量，请在网关主机上设置这些值：

- `MATTERMOST_BOT_TOKEN=...`
- `MATTERMOST_URL=https://chat.example.com`

<Note>
环境变量只适用于**默认**账号（`default`）。其他账号必须使用配置值。

`MATTERMOST_URL` 不能从 workspace `.env` 中设置；参见 [Workspace `.env` files](/gateway/security)。
</Note>

## 聊天模式

Mattermost 会自动回复私信。频道行为由 `chatmode` 控制：

<Tabs>
  <Tab title="oncall (default)">
    仅在频道中被 @ 提及时回复。
  </Tab>
  <Tab title="onmessage">
    对每条频道消息都回复。
  </Tab>
  <Tab title="onchar">
    当消息以触发前缀开头时回复。
  </Tab>
</Tabs>

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

说明：

- `onchar` 仍然会响应显式的 @ 提及。
- `channels.mattermost.requireMention` 对旧版配置仍然有效，但更推荐使用 `chatmode`。

## 线程和会话

使用 `channels.mattermost.replyToMode` 来控制频道和群组回复是保持在主频道中，还是在触发消息下方开启一个线程。

- `off`（默认）：仅当传入消息本身已经在某个线程中时，才在线程中回复。
- `first`：对于顶层频道/群组消息，在该消息下方开启一个线程，并将对话路由到线程作用域会话。
- `all`：目前对 Mattermost 的行为与 `first` 相同。
- 私信会忽略此设置并保持非线程化。

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

说明：

- 线程作用域会话会使用触发消息 id 作为线程根。
- `first` 和 `all` 目前等价，因为一旦 Mattermost 已有线程根，后续分段和媒体会继续留在同一线程中。

## 访问控制（私信）

- 默认：`channels.mattermost.dmPolicy = "pairing"`（未知发送者会收到配对码）。
- 通过以下命令批准：
  - `openclaw pairing list mattermost`
  - `openclaw pairing approve mattermost <CODE>`
- 公开私信：`channels.mattermost.dmPolicy="open"` 再加上 `channels.mattermost.allowFrom=["*"]`。

## 频道（群组）

- 默认：`channels.mattermost.groupPolicy = "allowlist"`（需要 @ 提及）。
- 使用 `channels.mattermost.groupAllowFrom` 将发送者加入允许列表（推荐使用用户 ID）。
- 按频道的提及覆盖配置位于 `channels.mattermost.groups.<channelId>.requireMention`，或者通过 `channels.mattermost.groups["*"].requireMention` 作为默认值。
- `@username` 匹配是可变的，只有在 `channels.mattermost.dangerouslyAllowNameMatching: true` 时才启用。
- 公开频道：`channels.mattermost.groupPolicy="open"`（需要 @ 提及）。
- 运行时说明：如果 `channels.mattermost` 完全缺失，运行时在群组检查中会回退到 `groupPolicy="allowlist"`（即使设置了 `channels.defaults.groupPolicy` 也是如此）。

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

在 `openclaw message send` 或 cron/webhook 中使用以下目标格式：

- `channel:<id>` 表示频道
- `user:<id>` 表示私信
- `@username` 表示私信（通过 Mattermost API 解析）

<Warning>
裸的模糊 ID（如 `64ifufp...`）在 Mattermost 中是**有歧义的**（用户 ID 还是频道 ID）。

OpenClaw 会按**先用户后频道**的顺序解析它们：

- 如果该 ID 作为用户存在（`GET /api/v4/users/<id>` 成功），OpenClaw 会通过 `/api/v4/channels/direct` 解析直接频道并发送 **私信**。
- 否则，该 ID 会被视为 **频道 ID**。

如果你需要确定性的行为，请始终使用显式前缀（`user:<id>` / `channel:<id>`）。
</Warning>

## 私信频道重试

当 OpenClaw 向 Mattermost 私信目标发送消息并需要先解析直接频道时，默认会重试瞬时的直接频道创建失败。

使用 `channels.mattermost.dmChannelRetry` 可全局调整 Mattermost 插件的该行为，或使用 `channels.mattermost.accounts.<id>.dmChannelRetry` 为单个账号配置。

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

说明：

- 这只适用于 DM 频道创建（`/api/v4/channels/direct`），不适用于每一次 Mattermost API 调用。
- 重试适用于瞬时失败，例如限流、5xx 响应以及网络或超时错误。
- 除了 `429` 之外的 4xx 客户端错误都被视为永久性错误，不会重试。

## 预览流式输出

Mattermost 会将思考、工具活动和部分回复文本流式汇入单个**草稿预览消息**中，并在最终答案安全可发送时就地完成。预览会在同一个消息 id 上更新，而不是通过每个分块消息刷屏频道。媒体/错误的最终结果会取消待处理的预览编辑，并使用正常投递，而不是刷新一个会被丢弃的预览消息。

通过 `channels.mattermost.streaming` 启用：

```json5
{
  channels: {
    mattermost: {
      streaming: "partial", // off | partial | block | progress
    },
  },
}
```

<AccordionGroup>
  <Accordion title="流式模式">
    - `partial` 是常见选择：先发送一条预览消息，随着回复增长不断编辑，最后用完整答案完成提交。
    - `block` 在预览消息内使用追加式草稿分块。
    - `progress` 在生成过程中显示状态预览，并且只在完成时发送最终答案。
    - `off` 会禁用预览流式输出。

  </Accordion>
  <Accordion title="流式行为说明">
    - 如果流无法就地完成（例如消息在流式过程中被删除），OpenClaw 会回退为发送一条新的最终消息，以确保回复不会丢失。
    - 仅推理内容的载荷不会显示在频道消息中，包括以 `> Reasoning:` 引用块形式到达的文本。设置 `/reasoning on` 可在其他界面查看思考过程；Mattermost 最终消息只保留答案。
    - 参见 [Streaming](/concepts/streaming#preview-streaming-modes) 了解频道映射矩阵。

  </Accordion>
</AccordionGroup>

## 反应（message 工具）

- 使用 `message action=react` 并设置 `channel=mattermost`。
- `messageId` 是 Mattermost 帖子的 id。
- `emoji` 接受诸如 `thumbsup` 或 `:+1:` 之类的名称（冒号可选）。
- 设置 `remove=true`（布尔值）以移除反应。
- 反应的添加/移除事件会作为系统事件转发到路由后的 agent 会话。

示例：

```
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup remove=true
```

配置：

- `channels.mattermost.actions.reactions`：启用/禁用反应动作（默认 true）。
- 按账号覆盖：`channels.mattermost.accounts.<id>.actions.reactions`。

## 交互式按钮（message 工具）

发送带有可点击按钮的消息。当用户点击按钮时，agent 会收到所选内容并可以响应。

通过向 channel capabilities 中添加 `inlineButtons` 来启用按钮：

```json5
{
  channels: {
    mattermost: {
      capabilities: ["inlineButtons"],
    },
  },
}
```

使用带有 `buttons` 参数的 `message action=send`。按钮是一个二维数组（按钮行）：

```
message action=send channel=mattermost target=channel:<channelId> buttons=[[{"text":"是","callback_data":"yes"},{"text":"否","callback_data":"no"}]]
```

按钮字段：

<ParamField path="text" type="string" required>
  显示标签。
</ParamField>
<ParamField path="callback_data" type="string" required>
  点击后返回的值（用作 action ID）。
</ParamField>
<ParamField path="style" type='"default" | "primary" | "danger"'>
  按钮样式。
</ParamField>

当用户点击按钮时：

<Steps>
  <Step title="按钮替换为确认信息">
    所有按钮都会被替换为一行确认信息（例如，“✓ **是** 已被 @user 选择”）。
  </Step>
  <Step title="Agent 接收所选内容">
    agent 会将所选内容作为传入消息接收并作出响应。
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="实现说明">
    - 按钮回调使用 HMAC-SHA256 验证（自动完成，无需配置）。
    - Mattermost 会从其 API 响应中剥离 callback data（安全特性），因此点击后所有按钮都会被移除——无法部分移除。
    - 包含连字符或下划线的 action ID 会被自动清理（Mattermost 路由限制）。

  </Accordion>
  <Accordion title="配置与可达性">
    - `channels.mattermost.capabilities`：能力字符串数组。添加 `"inlineButtons"` 以在 agent 系统提示中启用按钮工具说明。
    - `channels.mattermost.interactions.callbackBaseUrl`：用于按钮回调的可选外部基础 URL（例如 `https://gateway.example.com`）。当 Mattermost 无法通过其绑定主机直接访问 gateway 时使用。
    - 在多账号设置中，也可以在 `channels.mattermost.accounts.<id>.interactions.callbackBaseUrl` 下设置同一字段。
    - 如果省略 `interactions.callbackBaseUrl`，OpenClaw 会根据 `gateway.customBindHost` + `gateway.port` 推导回调 URL，然后回退到 `http://localhost:<port>`。
    - 可达性规则：按钮回调 URL 必须能被 Mattermost 服务器访问。只有当 Mattermost 和 OpenClaw 运行在同一主机/网络命名空间时，`localhost` 才有效。
    - 如果你的回调目标是 private/tailnet/internal，请将其主机/域名添加到 Mattermost 的 `ServiceSettings.AllowedUntrustedInternalConnections` 中。

  </Accordion>
</AccordionGroup>

### 直接 API 集成（外部脚本）

外部脚本和 webhook 可以直接通过 Mattermost REST API 发布按钮，而不是通过 agent 的 `message` 工具。尽可能使用插件中的 `buildButtonAttachments()`；如果直接发布原始 JSON，请遵循以下规则：

**负载结构：**

```json5
{
  channel_id: "<channelId>",
  message: "请选择一个选项：",
  props: {
    attachments: [
      {
        actions: [
          {
            id: "mybutton01", // 仅限字母数字 — 见下文
            type: "button", // 必填，否则点击会被静默忽略
            name: "批准", // 显示标签
            style: "primary", // 可选："default"、"primary"、"danger"
            integration: {
              url: "https://gateway.example.com/mattermost/interactions/default",
              context: {
                action_id: "mybutton01", // 必须与按钮 id 匹配（用于名称查找）
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

<Warning>
**关键规则**

1. 附件必须放在 `props.attachments` 中，而不是顶层 `attachments`（会被静默忽略）。
2. 每个 action 都需要 `type: "button"` — 没有它，点击会被静默吞掉。
3. 每个 action 都需要 `id` 字段 — 没有 ID 的 action 会被 Mattermost 忽略。
4. action 的 `id` 必须**仅限字母数字**（`[a-zA-Z0-9]`）。连字符和下划线会破坏 Mattermost 的服务端 action 路由（返回 404）。使用前请将其去除。
5. `context.action_id` 必须与按钮的 `id` 匹配，这样确认消息才会显示按钮名称（例如“批准”），而不是原始 ID。
6. `context.action_id` 是必需的 — 交互处理器没有它会返回 400。

</Warning>

**HMAC 令牌生成**

gateway 使用 HMAC-SHA256 验证按钮点击。外部脚本必须生成与 gateway 验证逻辑匹配的令牌：

<Steps>
  <Step title="从 bot token 派生密钥">
    `HMAC-SHA256(key="openclaw-mattermost-interactions", data=botToken)`
  </Step>
  <Step title="构建上下文对象">
    构建包含除 `_token` 之外所有字段的上下文对象。
  </Step>
  <Step title="按排序键序列化">
    使用**排序后的键**和**无空格**进行序列化（gateway 使用带排序键的 `JSON.stringify`，会产生紧凑输出）。
  </Step>
  <Step title="签名负载">
    `HMAC-SHA256(key=secret, data=serializedContext)`
  </Step>
  <Step title="添加令牌">
    将得到的十六进制摘要作为 `_token` 添加到上下文中。
  </Step>
</Steps>

Python 示例：

```python
import hmac, hashlib, json

secret = hmac.new(
    b"openclaw-mattermost-interactions",
    bot_token.encode(), hashlib.sha256
).hexdigest()

ctx = {"action_id": "mybutton01", "action": "approve"}
payload = json.dumps(ctx, sort_keys=True, separators=(",", ":"))
token = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()

context = {**ctx, "_token": token}
```

<AccordionGroup>
  <Accordion title="常见 HMAC 陷阱">
    - Python 的 `json.dumps` 默认会添加空格（`{"key": "val"}`）。请使用 `separators=(",", ":")` 以匹配 JavaScript 的紧凑输出（`{"key":"val"}`）。
    - 始终签名**所有**上下文字段（减去 `_token`）。gateway 会先去掉 `_token`，然后对剩余全部内容签名。只签名子集会导致静默验证失败。
    - 使用 `sort_keys=True` — gateway 会在签名前对键排序，而 Mattermost 在存储负载时可能会重新排列上下文字段。
    - 从 bot token 派生密钥（确定性），而不是随机字节。创建按钮的进程与验证的 gateway 必须使用相同的密钥。

  </Accordion>
</AccordionGroup>

## 目录适配器

Mattermost 插件包含一个目录适配器，可通过 Mattermost API 解析频道和用户名称。这使得 `openclaw message send` 以及 cron/webhook 投递可以使用 `#channel-name` 和 `@username` 目标。

无需配置——适配器使用账号配置中的 bot token。

## 多账号

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

<AccordionGroup>
  <Accordion title="频道中没有回复">
    确保 bot 在该频道中，并对其进行 mention（oncall），使用触发前缀（onchar），或设置 `chatmode: "onmessage"`。
  </Accordion>
  <Accordion title="认证或多账号错误">
    - 检查 bot token、base URL，以及账号是否已启用。
    - 多账号问题：环境变量仅适用于 `default` 账号。

  </Accordion>
  <Accordion title="原生 slash 命令失败">
    - `Unauthorized: invalid command token.`：OpenClaw 未接受回调 token。典型原因：
      - slash 命令注册在启动时失败或只部分完成
      - 回调命中了错误的 gateway/账号
      - Mattermost 仍保留指向先前回调目标的旧命令
      - gateway 重启后未重新激活 slash 命令
    - 如果原生 slash 命令停止工作，请检查日志中是否有 `mattermost: failed to register slash commands` 或 `mattermost: native slash commands enabled but no commands could be registered`。
    - 如果省略了 `callbackUrl`，且日志警告回调解析为 `http://127.0.0.1:18789/...`，那么该 URL 可能只在 Mattermost 与 OpenClaw 运行在同一主机/网络命名空间时可访问。请改为显式设置一个外部可达的 `commands.callbackUrl`。

  </Accordion>
  <Accordion title="按钮问题">
    - 按钮显示为白色方框：agent 可能发送了格式错误的按钮数据。检查每个按钮是否同时具有 `text` 和 `callback_data` 字段。
    - 按钮渲染正常但点击无反应：验证 Mattermost 服务器配置中的 `AllowedUntrustedInternalConnections` 是否包含 `127.0.0.1 localhost`，并且 `ServiceSettings` 中的 `EnablePostActionIntegration` 为 `true`。
    - 点击按钮返回 404：按钮 `id` 可能包含连字符或下划线。Mattermost 的 action 路由在非字母数字 ID 上会失效。仅使用 `[a-zA-Z0-9]`。
    - gateway 日志显示 `invalid _token`：HMAC 不匹配。检查你是否签名了所有上下文字段（而不是子集）、是否使用了排序后的键，以及是否使用了紧凑 JSON（无空格）。参见上方 HMAC 部分。
    - gateway 日志显示 `missing _token in context`：按钮上下文中没有 `_token` 字段。构建集成负载时请确保包含它。
    - 确认信息显示原始 ID 而不是按钮名称：`context.action_id` 与按钮的 `id` 不匹配。将两者设置为相同的已清理值。
    - agent 不知道按钮：在 Mattermost 频道配置中添加 `capabilities: ["inlineButtons"]`。

  </Accordion>
</AccordionGroup>

## 相关内容

- [频道路由](/channels/channel-routing) — 消息的会话路由
- [频道概览](/channels) — 所有受支持的频道
- [群组](/channels/groups) — 群聊行为和提及门控
- [配对](/channels/pairing) — DM 认证和配对流程
- [安全性](/gateway/security) — 访问模型和加固
