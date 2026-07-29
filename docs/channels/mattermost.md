---
summary: "Mattermost 机器人设置和 OpenClaw 配置"
read_when:
  - 设置 Mattermost
  - 调试 Mattermost 路由
title: "Mattermost"
sidebarTitle: "Mattermost"
---

状态：可下载插件（bot token + WebSocket 事件）。支持频道、私密频道、群组 DM 和 DM。Mattermost 是一个可自托管的团队消息平台（[mattermost.com](https://mattermost.com)）。

## 安装

<Tabs>
  <Tab title="npm 注册表">
    ```bash
    openclaw plugins install @openclaw/mattermost
    ```
  </Tab>
  <Tab title="本地检出">
    ```bash
    openclaw plugins install ./path/to/local/mattermost-plugin
    ```
  </Tab>
</Tabs>

详细信息： [插件](/tools/plugin)

## 快速设置

<Steps>
  <Step title="确保插件可用">
    使用上面的命令安装 `@openclaw/mattermost`，然后如果 Gateway 已在运行，请重启它。
  </Step>
  <Step title="创建 Mattermost bot">
    创建一个 Mattermost bot 账号，复制 **bot token**，并将 bot 添加到它应该读取的团队和频道中。
  </Step>
  <Step title="复制 base URL">
    复制 Mattermost 的 **base URL**（例如 `https://chat.example.com`）。末尾的 `/api/v4` 会自动去除。
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

    非交互式替代方案：

    ```bash
    openclaw channels add --channel mattermost --bot-token <token> --http-url https://chat.example.com
    ```

  </Step>
</Steps>

<Note>
自托管的 Mattermost 使用私有/LAN/tailnet 地址时：对外发出的 Mattermost API 请求会经过 SSRF 防护，默认会阻止私有和内部 IP。可通过 `channels.mattermost.network.dangerouslyAllowPrivateNetwork: true` 显式启用（按账号则为：`channels.mattermost.accounts.<id>.network.dangerouslyAllowPrivateNetwork`）。
</Note>

## 原生 slash 命令

原生 slash 命令默认不启用。启用后，OpenClaw 会在 bot 所属的每个团队上注册 `oc_*` slash 命令，并在网关 HTTP 服务器上接收回调 POST 请求。

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

已注册的命令：`/oc_status`、`/oc_model`、`/oc_models`、`/oc_new`、`/oc_help`、`/oc_think`、`/oc_reasoning`、`/oc_verbose`、`/oc_queue`。启用 `nativeSkills: true` 后，技能命令也会注册为 `/oc_<skill>`。

<AccordionGroup>
  <Accordion title="行为说明">
    - `native` 和 `nativeSkills` 的默认值为 `"auto"`，对 Mattermost 会解析为禁用。请显式将其设为 `true`。
    - `callbackPath` 默认值为 `/api/channels/mattermost/command`。
    - 如果省略 `callbackUrl`，OpenClaw 会推导为 `http://<gateway.customBindHost or localhost>:<gateway.port, default 18789><callbackPath>`。通配绑定主机（`0.0.0.0`、`::`）会回退到 `localhost`。
    - 对于多账号配置，`commands` 可以设置在顶层，或设置在 `channels.mattermost.accounts.<id>.commands` 下（账号级配置会覆盖顶层字段）。
    - 由其他集成创建、且触发词相同的现有 slash 命令不会被修改（注册时会跳过它们）；bot 创建的命令在回调 URL 发生变化时会更新或重新创建。
    - 命令回调会使用 Mattermost 在 OpenClaw 注册 `oc_*` 命令时返回的每个命令令牌进行校验。
    - OpenClaw 会在接受每次回调前刷新当前的 Mattermost 命令注册信息，因此来自已删除或已重新生成的 slash 命令的过期令牌将不再被接受，无需重启网关。
    - 如果 Mattermost API 无法确认该命令仍然是当前命令，回调校验将失败并关闭；失败结果会短暂缓存，并发查询会合并，每个命令的新鲜查询会限流，以限制重放压力。
    - 当注册失败、启动未完整完成，或回调令牌与解析出的命令已注册令牌不匹配时，slash 回调会失败并关闭（对一个命令有效的令牌无法通过上游校验用于另一个命令）。
    - 被接受的回调会以一个临时的 “Processing...” 回复确认；真正的答案会作为普通消息发送。

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

`MATTERMOST_URL` 不能从工作区 `.env` 中设置；请参见 [Workspace .env files](/gateway/security)。
</Note>

## 聊天模式

Mattermost 会自动回复私信。频道行为由 `chatmode` 控制：

<Tabs>
  <Tab title="oncall（默认）">
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
      oncharPrefixes: [">", "!"], // 默认
    },
  },
}
```

说明：

- `onchar` 仍会响应显式的 @ 提及。
- `channels.mattermost.requireMention` 仍会生效，但优先推荐使用 `chatmode`。按频道配置的 `groups.<channelId>.requireMention` 会优先于这两者。
- 当机器人在频道线程中发送可见回复后，同一线程里的后续消息会在不需要新的 @ 提及或 `onchar` 前缀的情况下得到回复，因此多轮线程对话可以持续进行。参与状态会在机器人最后一次回复该线程后的 7 天内被记住，并且会在网关重启后继续保留。机器人仅观察过的线程不受影响；要再次要求显式提及，请发起一个新的顶层消息。
- 设置 `channels.mattermost.implicitMentions.threadParticipation: false` 可阻止已参与线程的后续消息绕过提及门控。账户覆盖使用 `channels.mattermost.accounts.<id>.implicitMentions`。Mattermost 目前不会产生 `replyToBot` 或 `quotedBot` facts，因此这些标志在这里没有作用。

## 线程和会话

使用 `channels.mattermost.replyToMode` 来控制频道和群组回复是保持在主频道中，还是在触发消息下方开启一个线程。

- `off` (默认)：仅当传入的帖子已经位于线程中时，才在线程中回复。
- `first`：对于顶级频道/群组帖子，在该帖子下方发起一个线程，并将对话路由到线程作用域的会话中。
- `all` 和 `batched`：在当前 Mattermost 中与 `first` 的行为相同，因为一旦 Mattermost 有了线程根消息，后续的分块和媒体就会继续留在同一个线程中。
- 即使设置了 `replyToMode`，直接消息默认仍为 `off`。

使用 `channels.mattermost.replyToModeByChatType` 来覆盖 `direct`、`group` 或 `channel` 聊天的模式。将 `direct` 设置为可让直接消息使用线程：

- `off` (默认)：直接消息保持为非线程式，处于单个滚动会话中。
- `first`、`all` 或 `batched`：每条顶级直接消息都会启动一个 Mattermost 线程，并由一个全新、独立的会话来支持。

```json5
{
  channels: {
    mattermost: {
      replyToMode: "all",
      replyToModeByChatType: {
        direct: "first",
      },
    },
  },
}
```

注意：

- 线程作用域的会话使用触发该消息的帖子 id 作为线程根。
- `first` 和 `all` 目前等价，因为一旦 Mattermost 有了线程根，后续的分块和媒体就会继续留在同一个线程中。
- 按聊天类型的覆盖设置优先于 `replyToMode`。如果没有 `direct` 覆盖，现有部署将继续保持扁平、非线程式的 DM。

## 访问控制（私信）

- 默认：`channels.mattermost.dmPolicy = "pairing"`（未知发送者会获得一个配对码）。其他值：`allowlist`、`open`、`disabled`。
- 通过以下方式批准：
  - `openclaw pairing list mattermost`
  - `openclaw pairing approve mattermost <CODE>`
- 公开私信：`channels.mattermost.dmPolicy="open"` 加上 `channels.mattermost.allowFrom=["*"]`（配置 schema 会强制使用通配符）。
- `channels.mattermost.allowFrom` 接受用户 ID（推荐）和 `accessGroup:<name>` 条目。参见 [访问组](/channels/access-groups)。

## 频道（群组）

- 默认：`channels.mattermost.groupPolicy = "allowlist"`（需要提及才可发送）。
- 使用 `channels.mattermost.groupAllowFrom` 允许列表中的发送者（推荐使用用户 ID）。
- `channels.mattermost.groupAllowFrom` 接受 `accessGroup:<name>` 条目。请参见 [访问组](/channels/access-groups)。
- 按频道的提及覆盖位于 `channels.mattermost.groups.<channelId>.requireMention`，或使用 `channels.mattermost.groups["*"].requireMention` 作为默认值。
- `@username` 匹配是可变的，并且仅在 `channels.mattermost.dangerouslyAllowNameMatching: true` 时启用。
- 开放频道：`channels.mattermost.groupPolicy="open"`（需要提及才可发送）。
- 解析顺序：先 `channels.mattermost.groupPolicy`，再 `channels.defaults.groupPolicy`，最后 `"allowlist"`。
- 运行时说明：如果 `channels.mattermost` 部分完全缺失，运行时会对群组检查安全降级为 `groupPolicy="allowlist"`（即使设置了 `channels.defaults.groupPolicy` 也是如此），并记录一次性警告。

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

## 外发投递目标

在 `openclaw message send` 或 cron/webhook 中使用以下目标格式：

| Target                              | Delivers to                                                   |
| ----------------------------------- | ------------------------------------------------------------- |
| `channel:<id>`                      | 按 id 发送到频道                                           |
| `channel:<name>` or `#channel-name` | 按名称发送到频道，在机器人所属团队内搜索 |
| `user:<id>` or `mattermost:<id>`    | 与该用户私信                                                  |
| `@username`                         | 私信（通过 Mattermost API 解析用户名）                 |

外发发送每条消息最多支持一个附件；请将多个文件拆分为多次发送。

<Warning>
裸露的歧义 ID（例如 `64ifufp...`）在 Mattermost 中是**歧义的**（用户 ID 或频道 ID）。

OpenClaw 会按**先用户后频道**的顺序解析它们：

- 如果该 ID 作为用户存在（`GET /api/v4/users/<id>` 成功），OpenClaw 将通过 `/api/v4/channels/direct` 解析直接频道并发送**私信**。
- 否则，该 ID 将被视为**频道 ID**。

如果你需要确定性的行为，请始终使用显式前缀（`user:<id>` / `channel:<id>`）。
</Warning>

## 私信频道重试

当 OpenClaw 向 Mattermost 私信目标发送消息并需要先解析直接频道时，默认会重试瞬时的直接频道创建失败。

使用 `channels.mattermost.dmChannelRetry` 可全局调整 Mattermost 插件的该行为，或使用 `channels.mattermost.accounts.<id>.dmChannelRetry` 为单个账号进行调整。默认值：

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
- 重试使用带抖动的指数退避，并适用于限流、5xx 响应以及网络或超时错误等瞬时故障。
- 除 `429` 之外的 4xx 客户端错误都被视为永久性错误，不会重试。

## 预览流式输出

Mattermost 会将思考过程、工具活动和部分回复文本流式写入一个**草稿预览帖子**，当最终答案可安全发送时，会在原地完成。 在 `partial` 模式下，预览会在同一个帖子 ID 上更新，而不是通过每个分块消息刷屏频道。 在 `block` 模式下，预览会在已完成文本和工具活动块之间轮换，因此较早的块会作为各自的帖子保持可见，而不会被下一个块覆盖。 媒体/错误类最终结果会取消待处理的预览编辑，并使用正常投递，而不是刷新一个一次性的预览帖子。

预览流式输出默认在 `partial` 模式下**开启**。 可通过 `channels.mattermost.streaming.mode` 配置（旧的标量/布尔 `streaming` 值会由 `openclaw doctor --fix` 迁移）：

```json5
{
  channels: {
    mattermost: {
      streaming: { mode: "partial" }, // 关闭 | partial | block | progress
    },
  },
}
```

<AccordionGroup>
  <Accordion title="流式模式">
    - `partial`（默认）：一个预览帖子会随着回复增长而被编辑，最后以完整答案完成。
    - `block` 会在已完成文本和工具活动块之间轮换预览，因此每个块都会作为自己的帖子保持可见，而不是就地被覆盖。并行和连续的工具更新会共享当前的工具活动帖子。
    - `progress` 在生成过程中显示状态预览，并且只在完成时发布最终答案。
    - `off` 禁用预览流式输出。使用 `streaming.block.enabled: true` 时，已完成的助手块仍会作为正常的块回复（独立帖子）发送，而不是合并成单个最终帖子。

  </Accordion>
  <Accordion title="流式行为说明">
    - 如果流无法就地完成（例如帖子在流式过程中被删除），OpenClaw 会回退并发送一个新的最终帖子，以确保回复不会丢失。
    - 仅思考内容的负载会被从频道帖子中抑制，包括作为 `> Thinking` 块引用到达的文本。设置 `/reasoning on` 可在其他界面中查看思考内容；Mattermost 最终帖子只保留答案。
    - 请参见 [流式输出](/concepts/streaming#preview-streaming-modes) 了解通道映射矩阵。

  </Accordion>
</AccordionGroup>

## 反应（message 工具）

- 使用 `message action=react` 并设置 `channel=mattermost`。
- `messageId` 是 Mattermost 帖子 ID。
- `emoji` 接受诸如 `thumbsup` 或 `:+1:` 这样的名称（冒号可选）。
- 设置 `remove=true`（布尔值）可移除反应。
- 反应的添加/移除事件会作为系统事件转发到路由后的 agent 会话，并且受与消息相同的 DM/群组策略检查约束。

示例：

```text
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup remove=true
```

配置：

- `channels.mattermost.actions.reactions`：启用/禁用反应动作（默认 true）。
- 按账号覆盖：`channels.mattermost.accounts.<id>.actions.reactions`】【。

## 交互式按钮（message 工具）

发送带有可点击按钮的消息。当用户点击按钮时，agent 会收到所选内容并可以响应。

按钮来自语义 `presentation` 负载（在普通 agent 回复和 `message action=send` 中）。OpenClaw 将值按钮渲染为 Mattermost 交互式按钮，将 URL 按钮保留在消息文本中，并将选择菜单降级为可读文本。

```text
message action=send channel=mattermost target=channel:<channelId> presentation={"blocks":[{"type":"buttons","buttons":[{"label":"是","value":"yes"},{"label":"否","value":"no"}]}]}
```

Presentation button fields:

<ParamField path="label" type="string" required>
  显示标签（别名：`text`）。
</ParamField>
<ParamField path="value" type="string">
  点击后返回的值，用作 action ID（别名：`callback_data`、`callbackData`）。除非设置了 `url`，否则可点击按钮必须提供该字段。
</ParamField>
<ParamField path="url" type="string">
  链接按钮；在消息正文中渲染为 `label: url` 文本，而不是交互式按钮。
</ParamField>
<ParamField path="style" type='"primary" | "secondary" | "success" | "danger"'>
  按钮样式。Mattermost 会对其不支持的值应用默认样式。
</ParamField>

要在 agent 系统提示中声明按钮支持，请将 `inlineButtons` 添加到 channel capabilities：

```json5
{
  channels: {
    mattermost: {
      capabilities: ["inlineButtons"],
    },
  },
}
```

当用户点击按钮时：

<Steps>
  <Step title="访问检查">
    点击者必须通过与消息发送者相同的 DM/群组策略检查；未经授权的点击会收到临时通知并被忽略。
  </Step>
  <Step title="按钮替换为确认信息">
    所有按钮都会被一条确认行替换（例如，“✓ **是** 已由 @user 选择”）。
  </Step>
  <Step title="Agent 接收所选内容">
    agent 会将所选内容作为入站消息（外加一个系统事件）接收并作出响应。
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="实现说明">
    - 按钮回调使用 HMAC-SHA256 验证（自动完成，无需配置）。
    - 点击时会替换整个附件块，因此所有按钮会一起被移除 - 不支持部分移除。
    - 含有连字符或下划线的 action ID 会被自动清理（Mattermost 路由限制）。
    - `action_id` 与原始帖子上的某个 action 不匹配的点击会被以 `403`（"未知操作"）拒绝。

  </Accordion>
  <Accordion title="配置与可达性">
    - `channels.mattermost.capabilities`：能力字符串数组。添加 `"inlineButtons"` 以在 agent 系统提示中启用按钮工具描述。
    - `channels.mattermost.interactions.callbackBaseUrl`：按钮回调的可选外部基础 URL（例如 `https://gateway.example.com`）。当 Mattermost 无法直接到达其绑定主机上的 gateway 时使用此项。
    - 在多账号设置中，你也可以在 `channels.mattermost.accounts.<id>.interactions.callbackBaseUrl` 下设置相同字段。
    - 如果省略 `interactions.callbackBaseUrl`，OpenClaw 会根据 `gateway.customBindHost` + `gateway.port`（默认 18789）推导回调 URL，然后回退到 `http://localhost:<port>`。回调路径为 `/mattermost/interactions/<accountId>`。
    - 可达性规则：按钮回调 URL 必须能从 Mattermost 服务器访问到。`localhost` 仅在 Mattermost 和 OpenClaw 运行在同一主机/网络命名空间时有效。
    - `channels.mattermost.interactions.allowedSourceIps`：按钮回调的来源 IP 白名单。若未设置，则仅接受回环地址来源（`127.0.0.1`、`::1`），因此远程 Mattermost 服务器必须被加入白名单，否则其点击会被以 `403` 拒绝。若位于反向代理之后，还需设置 `gateway.trustedProxies`，以便从转发头中推导真实客户端 IP。
    - 如果你的回调目标是私有网络/tailnet/内部地址，请将其 host/domain 添加到 Mattermost 的 `ServiceSettings.AllowedUntrustedInternalConnections`。

  </Accordion>
</AccordionGroup>

### 直接 API 集成（外部脚本）

外部脚本和 webhook 可以直接通过 Mattermost REST API 发布按钮，而无需经过 agent 的 `message` 工具。优先使用 OpenClaw 的 `message` 工具。对于直接集成，请从 `@openclaw/mattermost/api.js` 导入 `buildButtonAttachments`；如果直接发送原始 JSON，请遵循以下规则：

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
            id: "mybutton01", // 仅限字母数字 - 见下文
            type: "button", // 必需，否则点击会被静默忽略
            name: "批准", // 显示标签
            style: "primary", // 可选："default"、"primary"、"danger"
            integration: {
              url: "https://gateway.example.com/mattermost/interactions/default",
              context: {
                action_id: "mybutton01", // must match button id
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

1. Attachments 放在 `props.attachments` 中，而不是顶层 `attachments`（会被静默忽略）。
2. 每个 action 都需要 `type: "button"` - 否则点击会被静默吞掉。
3. 每个 action 都需要 `id` 字段 - Mattermost 会忽略没有 ID 的 action。
4. Action `id` 必须**仅包含字母数字**（`[a-zA-Z0-9]`）。连字符和下划线会破坏 Mattermost 的服务端 action 路由（返回 404）。在使用前请去掉它们。
5. `context.action_id` 必须与按钮的 `id` 匹配；gateway 会拒绝 `action_id` 在帖子中不存在的点击。
6. `context.action_id` 是必需的 - 交互处理器在没有它时会返回 400。
7. 必须允许回调来源 IP（见上方 `interactions.allowedSourceIps`）。

</Warning>

**HMAC 令牌生成**

gateway 使用 HMAC-SHA256 验证按钮点击。外部脚本必须生成与 gateway 验证逻辑匹配的令牌：

<Steps>
  <Step title="从 bot token 派生 secret">
    `HMAC-SHA256(key="openclaw-mattermost-interactions", data=botToken)`, 十六进制编码。
  </Step>
  <Step title="构建上下文对象">
    构建包含除 `_token` 之外所有字段的上下文对象。
  </Step>
  <Step title="按排序键序列化">
    使用**递归排序的键**并且**不带空格**进行序列化（gateway 也会对嵌套对象做规范化，并生成紧凑 JSON）。
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
    - Python 的 `json.dumps` 默认会添加空格（`{"key": "val"}`）。使用 `separators=(",", ":")` 以匹配 JavaScript 的紧凑输出（`{"key":"val"}`）。
    - 始终对**所有**上下文字段（减去 `_token`）签名。gateway 会删除 `_token` 后对剩余所有内容签名。只签名子集会导致静默验证失败。
    - 使用 `sort_keys=True` - gateway 在签名前会对键排序，而 Mattermost 在存储负载时可能会重新排序上下文字段。
    - 从 bot token 派生密钥（确定性），不要使用随机字节。创建按钮的进程与验证按钮的 gateway 必须使用相同的密钥。

  </Accordion>
</AccordionGroup>

## 目录适配器

Mattermost 插件包含一个目录适配器，可通过 Mattermost API 解析频道和用户名称。这使得 `openclaw message send` 以及 cron/webhook 投递可以使用 `#channel-name` 和 `@username` 目标。

无需配置 - 该适配器使用账号配置中的 bot token。

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

账号值会覆盖顶层字段；`channels.mattermost.defaultAccount` 用于在未指定账号时选择所使用的账号。

## 故障排查

<AccordionGroup>
  <Accordion title="频道中没有回复">
    确保 bot 在该频道中，并对其进行 mention（oncall），使用触发前缀（onchar），或设置 `chatmode: "onmessage"`。
  </Accordion>
  <Accordion title="Auth or multi-account errors">
    - 检查 bot token、base URL，以及该账户是否已启用。
    - 多账户问题：环境变量只适用于 `default` 账户。
    - 私有/LAN Mattermost 主机需要 `network.dangerouslyAllowPrivateNetwork: true`（SSRF 防护默认会阻止私有 IP）。

  </Accordion>
  <Accordion title="Native slash commands fail">
    - `Unauthorized: invalid command token.`：OpenClaw 未接受回调 token。典型原因：
      - slash command 注册失败，或仅在启动时部分完成
      - 回调指向了错误的 gateway/account
      - Mattermost 仍然有指向先前回调目标的旧命令
      - gateway 重启后没有重新激活 slash commands
    - 如果 native slash commands 停止工作，检查日志中是否有 `mattermost: failed to register slash commands` 或 `mattermost: native slash commands enabled but no commands could be registered`。
    - 如果省略了 `callbackUrl`，且日志警告回调解析为类似 `http://localhost:18789/...` 的 loopback URL，那么该 URL 很可能只有在 Mattermost 与 OpenClaw 运行在同一主机/网络命名空间时才可访问。请改为设置一个明确的、可从外部访问的 `commands.callbackUrl`。

  </Accordion>
  <Accordion title="按钮问题">
    - 按钮显示为白色方框或根本不显示：按钮数据格式错误。每个展示按钮都需要 `label` 和 `value`（缺少任一项的按钮会被丢弃）。
    - 按钮能渲染但点击无反应：确认 Mattermost 服务器可以访问 gateway，Mattermost 服务器 IP 已包含在 `channels.mattermost.interactions.allowedSourceIps` 中（否则只接受 loopback），并且 `ServiceSettings.AllowedUntrustedInternalConnections` 包含私有目标的回调主机。
    - 按钮点击返回 404：按钮 `id` 很可能包含连字符或下划线。Mattermost 的 action router 在非字母数字 ID 上会出问题。请仅使用 `[a-zA-Z0-9]`。
    - gateway 日志 `rejected callback source`：点击来自 `interactions.allowedSourceIps` 之外的 IP。请将 Mattermost 服务器或你的入口网关加入允许列表，并在反向代理后设置 `gateway.trustedProxies`。
    - gateway 日志 `invalid _token`：HMAC 不匹配。检查你是否对所有上下文字段进行签名（而不是子集）、使用排序后的键，以及紧凑 JSON（无空格）。参见上面的 HMAC 章节。
    - gateway 日志 `missing _token in context`：按钮上下文中没有 `_token` 字段。构建集成负载时请确保包含它。
    - gateway 拒绝点击并报 `Unknown action`：`context.action_id` 与帖子上的任何动作 `id` 都不匹配。请将二者设置为相同的已清理值。
    - agent 不提供按钮：在 Mattermost 频道配置中添加 `capabilities: ["inlineButtons"]`。

  </Accordion>
</AccordionGroup>

## 相关内容

- [频道路由](/channels/channel-routing) - 消息的会话路由
- [频道概览](/channels) - 所有支持的频道
- [群组](/channels/groups) - 群聊行为和 mention gating
- [配对](/channels/pairing) - DM 认证和配对流程
- [安全性](/gateway/security) - 访问模型和加固
