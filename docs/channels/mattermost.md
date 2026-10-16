---
summary: "Mattermost 机器人设置和 OpenClaw 配置"
read_when:
  - "设置 Mattermost"
  - "调试 Mattermost 路由"
title: "Mattermost"
sidebarTitle: "Mattermost"
---

状态：可下载插件（机器人令牌 + WebSocket 事件）。支持频道、私人频道、群组 DM 和 DM。 Mattermost 是一个自托管团队消息平台 （[mattermost.com](https://mattermost.com)）。

## <a id="install"></a> 安装

<Tabs>
  <Tab id="npm-registry" title="npm 注册表">
    ```bash
    openclaw plugins install @openclaw/mattermost
    ```
  </Tab>
  <Tab id="local-checkout" title="本地结账">
    ```bash
    openclaw plugins install ./path/to/local/mattermost-plugin
    ```
  </Tab>
</Tabs>

详细信息：[插件](/tools/plugin)

## <a id="quick-setup"></a> 快速设置

<Steps>
  <Step id="check-plugin-availability" title="检查插件可用性">
    <a id="ensure-plugin-is-available" />
    使用上面的命令安装 `@openclaw/mattermost`。在继续之前检查 [ 申请结果 ](/plugins/manage-plugins#apply-changes-and-inspect)。
  </Step>
  <Step id="create-a-mattermost-bot" title="创建 Mattermost 机器人">
    创建一个 Mattermost bot 账号，复制 **bot token**，并将 bot 添加到它应该读取的团队和频道中。
  </Step>
  <Step id="copy-the-base-url" title="复制底座URL">
    复制 Mattermost **库 URL**（e.g.、`https://chat.example.com`）。尾随的 `/api/v4` 会被自动删除。
  </Step>
  <Step id="configure-openclaw-and-start-the-gateway" title="配置OpenClaw并启动网关">
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
private/LAN/tailnet 地址上的自托管 Mattermost：出站 Mattermost API 请求通过默认阻止私有和内部 IP 的 SSRF 防护。选择使用 `channels.mattermost.network.dangerouslyAllowPrivateNetwork: true`（每个帐户：`channels.mattermost.accounts.<id>.network.dangerouslyAllowPrivateNetwork`）。
</Note>

## <a id="native-slash-commands"></a> 原生 slash 命令

本机斜杠命令是可选的。启用后，OpenClaw 会在机器人所属的每个团队上注册 `oc_*` 斜杠命令，并在网关 HTTP 服务器上接收回调 POST。

```json5
{
  channels: {
    mattermost: {
      commands: {
        native: true,
        nativeSkills: true,
        callbackPath: "/api/channels/mattermost/command",
        // Use when Mattermost cannot reach the gateway directly (reverse proxy/public URL).
        callbackUrl: "https://gateway.example.com/api/channels/mattermost/command",
      },
    },
  },
}
```

已注册的命令：`/oc_status`、`/oc_model`、`/oc_models`、`/oc_new`、`/oc_help`、`/oc_think`、`/oc_reasoning`、`/oc_verbose`、`/oc_queue`。启用 `nativeSkills: true` 后，技能命令也会注册为 `/oc_<skill>`。

<AccordionGroup>
  <Accordion id="behavior-notes" title="行为笔记">
    - `native` 和 `nativeSkills` 的默认值为 `"auto"`，对 Mattermost 会解析为禁用。请显式将其设为 `true`。
    - `callbackPath` 默认值为 `/api/channels/mattermost/command`。
    - 如果省略 `callbackUrl`，OpenClaw 会推导为 `http://<gateway.customBindHost or localhost>:<gateway.port, default 18789><callbackPath>`。通配绑定主机（`0.0.0.0`、`::`）会回退到 `localhost`。
    - 对于多账号配置，`commands` 可以设置在顶层，或设置在 `channels.mattermost.accounts.<id>.commands` 下（账号级配置会覆盖顶层字段）。
    - 由其他集成创建、且触发词相同的现有 slash 命令不会被修改（注册时会跳过它们）；bot 创建的命令在回调 URL 发生变化时会更新或重新创建。
    - 命令回调会使用 Mattermost 在 OpenClaw 注册 `oc_*` 命令时返回的每个命令令牌进行校验。
    - OpenClaw 会在接受每次回调前刷新当前的 Mattermost 命令注册信息，因此来自已删除或已重新生成的 slash 命令的过期令牌将不再被接受，无需重启网关。
    - 如果出现以下情况，回调将被拒绝Mattermost API无法确认该命令仍然是最新的；失败的验证会被短暂缓存，并发查找会被合并，并且每个命令的新查找启动都会受到速率限制，以限制重播压力。
    - 当注册失败、启动不完整或回调令牌与已解析命令的注册令牌不匹配（对一个命令有效的令牌无法到达另一命令的上游验证）时，Slash 回调将被拒绝。
    - 接受的回调通过短暂的“Processing...”回复进行确认；真正的答案以普通消息的形式到达。

  </Accordion>
  <Accordion id="reachability-requirement" title="可达性要求">
    回调端点必须能够被 Mattermost 服务器访问。

    - 请勿将 `callbackUrl` 设置为 `localhost`，除非 Mattermost 与 OpenClaw 运行在同一 host/network 命名空间上。
    - 不要将 `callbackUrl` 设置为你的 Mattermost base URL，除非该 URL 会通过反向代理将 `/api/channels/mattermost/command` 转发到 OpenClaw。
    - 一个快速检查方式是执行 `curl https://<gateway-host>/api/channels/mattermost/command`；GET 请求应返回来自 OpenClaw 的 `405 Method Not Allowed`，而不是 `404`。

  </Accordion>
  <Accordion id="mattermost-egress-allowlist" title="Mattermost 出口允许列表">
    如果您的回调目标为 private/tailnet/internal 地址，请将 Mattermost `ServiceSettings.AllowedUntrustedInternalConnections` 设置为包含回调 host/domain.

    使用 host/domain 条目，而不是完整的 URL。

    - 正确：`gateway.tailnet-name.ts.net`
    - 错误：`https://gateway.tailnet-name.ts.net`

  </Accordion>
</AccordionGroup>

## <a id="environment-variables-(default-account)"></a><a id="environment-variables-default-account"></a> 环境变量（默认账号）

如果你更喜欢使用环境变量，请在网关主机上设置这些值：

- `MATTERMOST_BOT_TOKEN=...`
- `MATTERMOST_URL=https://chat.example.com`

<Note>
环境变量只适用于**默认**账号（`default`）。其他账号必须使用配置值。

`MATTERMOST_URL` 不能从工作区 `.env` 中设置；请参见 [工作区 .env 文件](/gateway/security)。
</Note>

## <a id="chat-modes"></a> 聊天模式

Mattermost 会自动回复私信。频道行为由 `chatmode` 控制：

<Tabs>
  <Tab id="oncall-default" title="待命（默认）">
    仅当 @mentioned 在通道中时才响应。
  </Tab>
  <Tab id="onmessage" title="留言">
    对每条频道消息都回复。
  </Tab>
  <Tab id="onchar" title="昂查尔">
    当消息以触发前缀开头时回复。
  </Tab>
</Tabs>

配置示例：

```json5
{
  channels: {
    mattermost: {
      chatmode: "onchar",
      oncharPrefixes: [">", "!"], // default
    },
  },
}
```

注意：

- `onchar` 仍响应显式 @mentions.
- `channels.mattermost.requireMention` 仍会生效，但优先推荐使用 `chatmode`。按频道配置的 `groups.<channelId>.requireMention` 会优先于这两者。
- 在机器人在通道线程中发送可见回复后，同一线程中的后续消息将得到应答，而无需新的 @mention 或 `onchar` 前缀，因此多轮线程对话保持流动。机器人在该线程中最后一次回复后，参与会被记住 7 天，并且在网关重新启动后仍然存在。机器人仅观察到的线程不受影响；开始一条新的顶级消息以要求再次明确提及。
- 设置 `channels.mattermost.implicitMentions.threadParticipation: false` 以阻止参与线程后续绕过提及门控。帐户覆盖使用 `channels.mattermost.accounts.<id>.implicitMentions`。 Mattermost 不会生成 `replyToBot` 或 `quotedBot` 事实，因此这些标志在这里不起作用。

将 `channels.mattermost.requireMentionInBotThreads: false` 设置为在根帖子由接收机器人发送的线程中接受不带 @mention 或 `onchar` 前缀的后续内容。将其设置为 `true`，即使在机器人参与之后也需要在那里显式激活。省略它会保留上述行为。

帐户设置会覆盖通道范围的值。对于单个通道，`groups.<channelId>.requireMentionInBotThreads` 优先于 `groups["*"].requireMentionInBotThreads`，然后是账户值。 OpenClaw通过Mattermost验证根帖子的作者和渠道；不可用或删除的根保留现有的提及行为。发件人和渠道限制仍然适用，并且源于其他人帖子的顶级消息和线程保持不变。

## <a id="threading-and-sessions"></a> 线程和会话

使用 `channels.mattermost.replyToMode` 来控制频道和群组回复是保持在主频道中，还是在触发消息下方开启一个线程。

- `off` (默认)：仅当传入的帖子已经位于线程中时，才在线程中回复。
- `first`：对于顶级 channel/group 帖子，在该帖子下启动一个线程并将对话路由到线程范围的会话。
- `all` 和 `batched`：Mattermost 的行为与 `first` 相同，因为一旦 Mattermost 具有线程根，后续块和媒体将继续在同一线程中。
- 即使设置了 `replyToMode`，Direct 消息也默认为 `off`。

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
- `first` 和 `all` 是等效的，因为一旦 Mattermost 具有线程根，后续块和媒体将在同一线程中继续。
- 每聊天类型覆盖优先于 `replyToMode`。如果没有 `direct` 覆盖，现有部署将保持扁平、非线程 DM。
- 重新启动或会话重置后，线程范围的对话会在其待处理历史记录处于冷状态时从 Mattermost 恢复最近的消息。这包括启用了线程的 DM；扁平 DM 未改变。恢复尊重发送者访问和上下文可见性，排除触发消息，并受 `historyLimit`、200 个帖子服务器窗口和 5 秒截止时间的限制。临时服务器故障不会无限期地阻止新消息。

## <a id="access-control-(dms)"></a><a id="access-control-dms"></a> 访问控制（私信）

- 默认：`channels.mattermost.dmPolicy = "pairing"`（未知发送者会获得一个配对码）。其他值：`allowlist`、`open`、`disabled`。
- 批准方式：
  - `openclaw pairing list mattermost`
  - `openclaw pairing approve mattermost <CODE>`
- 公开私信：`channels.mattermost.dmPolicy="open"` 加上 `channels.mattermost.allowFrom=["*"]`（配置 schema 会强制使用通配符）。
- `channels.mattermost.allowFrom` 接受用户 ID（推荐）和 `accessGroup:<name>` 条目。请参见 [ 访问组](/channels/access-groups)。

## <a id="channels-(groups)"></a><a id="channels-groups"></a> 频道（群组）

- 默认：`channels.mattermost.groupPolicy = "allowlist"`（需要提及才可发送）。
- 将带有 `channels.mattermost.groupAllowFrom` 的发件人列入白名单（建议使用用户 ID）。
- `channels.mattermost.groupAllowFrom` 接受 `accessGroup:<name>` 条目。请参见 [访问组](/channels/access-groups)。
- 按频道的提及覆盖位于 `channels.mattermost.groups.<channelId>.requireMention`，或使用 `channels.mattermost.groups["*"].requireMention` 作为默认值。
- Text 命令可以遵循以下说明：`@<bot-username> /new` 运行 `/new`，同时启用 `commands.text`（默认）。 Mattermost 本身将裸 `/new` 作为 Mattermost 斜杠命令执行，而不是发布它。
- `@username` 匹配是可变的，并且仅在 `channels.mattermost.dangerouslyAllowNameMatching: true` 时启用。
- 开放频道：`channels.mattermost.groupPolicy="open"`（需要提及才可发送）。
- 解析顺序：先 `channels.mattermost.groupPolicy`，再 `channels.defaults.groupPolicy`，最后 `"allowlist"`。
- Runtime 注意：如果 `channels.mattermost` 部分完全缺失，则运行时默认为 `groupPolicy="allowlist"` 进行组检查（即使设置了 `channels.defaults.groupPolicy`）并记录一次性警告。

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

## <a id="targets-for-outbound-delivery"></a> 外发投递目标

将这些目标格式与 `openclaw message send` 或 cron/webhooks 结合使用：

| 目标                              | 投递至                                                   |
| ----------------------------------- | ------------------------------------------------------------- |
| `channel:<id>`                      | 按 id 发送到频道                                                 |
| `channel:<name>` 或 `#channel-name` | 按名称发送到频道，在机器人所属团队内搜索 |
| `user:<id>` or `mattermost:<id>`    | DM 与该用户                                             |
| `@username`                         | DM（通过 Mattermost API 解析的用户名）                 |

外发发送每条消息最多支持一个附件；请将多个文件拆分为多次发送。

设置 `channels.mattermost.mediaMaxMb` 以限制 MiB 中的每个入站下载和出站附件。 `accounts.<id>.mediaMaxMb` 覆盖通道根，然后 `agents.defaults.mediaMaxMb` 提供后备。如果没有任何配置的上限，入站下载将保留其 8 MiB 默认值，出站媒体将保留共享加载程序默认值。出站图像可能会被优化。通过配置上限，下载或上传失败会导致发送失败，而不是发布未经检查的原始 URL。如果没有配置上限，现有的 URL 后备仍然可用。

<Warning>
裸露的不透明 ID（如 `64ifufp...`）是 Mattermost 中的 **ambiguous**（用户 ID 与通道 ID）。

OpenClaw 会按**先用户后频道**的顺序解析它们：

- 如果ID作为用户存在（`GET /api/v4/users/<id>`成功），则OpenClaw通过`/api/v4/channels/direct`解析直接通道发送**DM**。
- 否则，该 ID 将被视为**频道 ID**。

为了避免目标不明确，请始终使用显式前缀 （`user:<id>` / `channel:<id>`）。
</Warning>

## <a id="dm-channel-retry"></a> DM 通道重试

当 OpenClaw 发送到 Mattermost DM 目标并需要首先解析直接通道时，默认情况下会重试暂时的直接通道创建失败。

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

注意：

- 这只适用于 DM 频道创建（`/api/v4/channels/direct`），不适用于每一次 Mattermost API 调用。
- 重试使用带抖动的指数退避，并适用于限流、5xx 响应以及网络或超时错误等瞬时故障。
- 4xx 客户端错误，除了`429`被视为永久的并且不会重试，即使读取错误响应正文失败也是如此。诊断保留HTTP响应正文不可用时的状态。

## <a id="preview-streaming"></a> 预览流式输出

Mattermost 将思考、工具活动和部分回复文本传输到 **草稿预览帖子** 中，当最终答案可以安全发送时，该草稿预览帖子将最终确定。在 `partial` 模式下，预览会在同一帖子 ID 上更新，而不是使用每个块的消息向频道发送垃圾邮件。在 `block` 模式下，预览会在已完成的文本和工具活动块之间轮换，因此较早的块会以其自己的帖子形式保持可见，而不会被下一个块覆盖。 Media/error 决赛取消待定的预览编辑并使用正常交付而不是刷新一次性预览帖子。

在 `partial` 模式下，预览流默认为 **on**。通过 `channels.mattermost.streaming.mode` 配置（旧版 scalar/boolean `streaming` 值由 `openclaw doctor --fix` 迁移）：

```json5
{
  channels: {
    mattermost: {
      streaming: { mode: "partial" }, // off | partial | block | progress
    },
  },
}
```

<AccordionGroup>
  <Accordion id="streaming-modes" title="流媒体模式">
    - `partial`（默认）：一个预览帖子会随着回复增长而被编辑，最后以完整答案完成。
    - `block` 会在已完成文本和工具活动块之间轮换预览，因此每个块都会作为自己的帖子保持可见，而不是就地被覆盖。并行和连续的工具更新会共享当前的工具活动帖子。
    - `progress` 在生成过程中显示状态预览，并且只在完成时发布最终答案。
    - `off` 禁用预览流式输出。使用 `streaming.block.enabled: true` 时，已完成的助手块仍会作为正常的块回复（独立帖子）发送，而不是合并成单个最终帖子。

  </Accordion>
  <Accordion title="Streaming behavior notes">
    - 如果流无法就地完成（例如帖子在流式过程中被删除），OpenClaw 会回退并发送一个新的最终帖子，以确保回复不会丢失。
    - 清除计划会删除原本空的预览；即使文本未更改，替换计划也会获得全新的预览。在轮次完成时，将再次尝试删除失败的旧预览，而不删除最终的回复。如果删除仍然失败，旧的预览可能会保留；详细日志包括清理失败。
    - 仅思考内容的负载会被从频道帖子中抑制，包括作为 `> Thinking` 块引用到达的文本。设置 `/reasoning on` 可在其他界面中查看思考内容；Mattermost 最终帖子只保留答案。
    - 请参见 [流式输出](/concepts/streaming#preview-streaming-modes) 了解通道映射矩阵。

  </Accordion>
</AccordionGroup>

## <a id="read-channel-history-(message-tool)"></a><a id="read-channel-history-message-tool"></a> 读取频道历史记录（消息工具）

使用 `message action=read` 或 CLI 读取已配置的 Mattermost 机器人可以访问的频道中的帖子：

```bash
openclaw message read --channel mattermost --target channel:<channelId> --limit 5 --json
```

- 结果遵循 Mattermost 的有序帖子列表，并包含规范化的 `timestampMs` 和 `timestampUtc` 字段。
- `limit` 默认为 60，且上限为 Mattermost 的最大值 200。使用 `before=<postId>` 或 `after=<postId>` 进行分页；不能同时使用这两个游标。
- 直接操作员调用依赖 Mattermost 的频道成员资格和 `read_channel` 权限。提供商返回的 403 会作为正常的、可见的工具错误。
- 当前的委托读取Mattermost当前帐户允许对话。跨通道委托读取还需要目标通道ID在下面`channels.mattermost.groups`， a `"*"`组条目，或`groupPolicy: "open"`。跨账户、跨渠道DM读取被拒绝。
- H默认情况下禁用历史读取。设置 `channels.mattermost.actions.messages: true` 来启用它们。使用 `channels.mattermost.accounts.<id>.actions.messages` 覆盖每个帐户的设置。
- 这些访问规则适用于捆绑插件和通过 npm 或 ClawHub 安装的官方插件。委托读取需要调用运行和插件注册才能保持活动状态。

## <a id="reactions-(message-tool)"></a><a id="reactions-message-tool"></a> Reactions（消息工具）

- 使用 `message action=react` 并设置 `channel=mattermost`。
- `messageId` 是 Mattermost 帖子 ID。
- `emoji` 接受诸如 `thumbsup` 或 `:+1:` 这样的名称（冒号可选）。
- 设置 `remove=true`（布尔值）可移除反应。
- Reaction add/remove 事件作为系统事件转发到路由代理会话，并受到与消息相同的 DM/group 策略检查。

示例：

```text
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup remove=true
```

配置：

- `channels.mattermost.actions.reactions`：enable/disable 反应动作（默认 true）。
- 按账号覆盖：`channels.mattermost.accounts.<id>.actions.reactions`。

## <a id="interactive-buttons-(message-tool)"></a><a id="interactive-buttons-message-tool"></a> 交互式按钮（message 工具）

发送带有可点击按钮的消息。当用户点击按钮时，agent 会收到所选内容并可以响应。

按钮来自语义 `presentation` 负载（在普通 agent 回复和 `message action=send` 中）。OpenClaw 将值按钮渲染为 Mattermost 交互式按钮，将 URL 按钮保留在消息文本中，并将选择菜单降级为可读文本。

`ask_user` 问题提供的选项也呈现为按钮，点击一个即可直接回答该问题。问题可以通过键入来回答，而网关未索引的选项则保留在散文中：“其他...”选项，以及询问多个问题或问题是多选、秘密或不提供两到四个不同选项的任何提示。每个其他键入的演示操作（`command`、`callback`、`approval`）在 Mattermost 上保留可读文本，而不是成为按钮：单击此处作为消息到达代理而不是运行操作，因此控件会执行除其所说之外的操作。

```text
message action=send channel=mattermost target=channel:<channelId> presentation={"blocks":[{"type":"buttons","buttons":[{"label":"Yes","value":"yes"},{"label":"No","value":"no"}]}]}
```

按钮字段：

<ParamField path="label" type="string" required>
  显示标签（别名：`text`）。
</ParamField>
<ParamField path="value" type="string">
  点击后返回的值，用作操作 ID（别名：`callback_data`、`callbackData`）。除非设置了 `url`，否则可点击按钮必须提供该字段。
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
  <Step id="access-check" title="访问检查">
    点击者必须通过与消息发送者相同的 DM/group 策略检查；未经授权的点击会收到短暂的通知并被忽略。
  </Step>
  <Step id="buttons-replaced-with-confirmation" title="按钮被替换为确认">
    所有按钮均替换为确认行（e.g.，“✓ **Yes** 由 @user 选择”）。
  </Step>
  <Step id="agent-receives-the-selection" title="代理收到选择">
    agent 会将所选内容作为入站消息（外加一个系统事件）接收并作出响应。
  </Step>
</Steps>

<AccordionGroup>
  <Accordion id="implementation-notes" title="实施说明">
    - 按钮回调使用 HMAC-SHA256 验证（自动完成，无需配置）。
    - 点击时会替换整个附件块，因此所有按钮会一起被移除 - 不支持部分移除。
    - 包含连字符或下划线的 Action ID 会自动清理（Mattermost 路由限制）。
    - 与原始帖子上的任何操作都不匹配的 `action_id` 点击会被以 `403`（“未知操作”）拒绝。

  </Accordion>
  <Accordion id="config-and-reachability" title="配置和可达性">
    - `channels.mattermost.capabilities`：能力字符串数组。添加 `"inlineButtons"` 以在 agent 系统提示中启用按钮工具描述。
    - `channels.mattermost.interactions.callbackBaseUrl`：按钮回调的可选外部基础 URL（例如 `https://gateway.example.com`）。当 Mattermost 无法直接到达其绑定主机上的 gateway 时使用此项。
    - 在多账号设置中，你也可以在 `channels.mattermost.accounts.<id>.interactions.callbackBaseUrl` 下设置相同字段。
    - 如果省略 `interactions.callbackBaseUrl`，OpenClaw 会根据 `gateway.customBindHost` + `gateway.port`（默认 18789）推导回调 URL，然后回退到 `http://localhost:<port>`。回调路径为 `/mattermost/interactions/<accountId>`。
    - Reachability 规则：按钮回调 URL 必须可从 Mattermost 服务器访问。 `localhost` 仅当 Mattermost 和 OpenClaw 在同一 host/network 命名空间上运行时才有效。
    - `channels.mattermost.interactions.allowedSourceIps`：按钮回调的来源 IP 白名单。若未设置，则仅接受回环地址来源（`127.0.0.1`、`::1`），因此远程 Mattermost 服务器必须被加入白名单，否则其点击会被以 `403` 拒绝。若位于反向代理之后，还需设置 `gateway.trustedProxies`，以便从转发头中推导真实客户端 IP。
    - 如果您的回调目标是private/tailnet/internal，请将其host/domain添加到Mattermost `ServiceSettings.AllowedUntrustedInternalConnections`。

  </Accordion>
</AccordionGroup>

### <a id="direct-api-integration-(external-scripts)"></a><a id="direct-api-integration-external-scripts"></a> 直接 API 集成（外部脚本）

外部脚本和 Webhook 可以直接通过 Mattermost REST API 发布按钮，而无需通过代理的 `message` 工具。更喜欢 OpenClaw 的 `message` 工具。对于直接集成，从 `@openclaw/mattermost/api.js` 导入 `buildButtonAttachments`；如果发布原始 JSON，请遵循以下规则：

**负载结构：**

```json5
{
  channel_id: "<channelId>",
  message: "Choose an option:",
  props: {
    attachments: [
      {
        actions: [
          {
            id: "mybutton01", // alphanumeric only - see below
            type: "button", // required, or clicks are silently ignored
            name: "Approve", // display label
            style: "primary", // optional: "default", "primary", "danger"
            integration: {
              url: "https://gateway.example.com/mattermost/interactions/default",
              context: {
                action_id: "mybutton01", // must match button id
                action: "approve",
                // ... any custom fields ...
                _token: "<hmac>", // see HMAC section below
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
3. 每个操作都需要一个 `id` 字段 - Mattermost 会忽略没有 ID 的操作。
4. Action `id` 必须**仅包含字母数字**（`[a-zA-Z0-9]`）。连字符和下划线会破坏 Mattermost 的服务端 action 路由（返回 404）。在使用前请去掉它们。
5. `context.action_id` 必须与按钮的 `id` 匹配；gateway 会拒绝 `action_id` 在帖子中不存在的点击。
6. `context.action_id` 是必需的 - 交互处理器在没有它时会返回 400。
7. 必须允许回调来源 IP（见上方 `interactions.allowedSourceIps`）。

</Warning>

**HMAC 令牌生成**

gateway 使用 HMAC-SHA256 验证按钮点击。外部脚本必须生成与 gateway 验证逻辑匹配的令牌：

<Steps>
  <Step id="derive-the-secret-from-the-bot-token" title="从机器人令牌中获取秘密">
    `HMAC-SHA256(key="openclaw-mattermost-interactions", data=botToken)`，十六进制编码。
  </Step>
  <Step id="build-the-context-object" title="构建上下文对象">
    使用 **（** `_token` 除外）的所有字段构建上下文对象。
  </Step>
  <Step id="serialize-with-sorted-keys" title="使用排序键进行序列化">
    使用**递归排序的键**和**进行序列化，无空格**（网关也对嵌套对象中的键进行排序并生成紧凑的JSON）。
  </Step>
  <Step id="sign-the-payload" title="签署有效负载">
    `HMAC-SHA256(key=secret, data=serializedContext)`
  </Step>
  <Step id="add-the-token" title="添加令牌">
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
  <Accordion id="common-hmac-pitfalls" title="常见的 HMAC 陷阱">
    - Python 的 `json.dumps` 默认会添加空格（`{"key": "val"}`）。使用 `separators=(",", ":")` 以匹配 JavaScript 的紧凑输出（`{"key":"val"}`）。
    - 始终对**所有**上下文字段（减去 `_token`）签名。gateway 会删除 `_token` 后对剩余所有内容签名。只签名子集会导致静默验证失败。
    - 使用 `sort_keys=True` - gateway 在签名前会对键排序，而 Mattermost 在存储负载时可能会重新排序上下文字段。
    - 从机器人令牌中获取秘密，而不是随机字节。在创建按钮的过程和验证的网关中，秘密必须相同。

  </Accordion>
</AccordionGroup>

## <a id="directory-adapter"></a> 目录适配器

Mattermost 插件包括一个目录适配器，可通过 Mattermost API 解析频道和用户名。这使得 `openclaw message send` 和 cron/webhook 交付中的 `#channel-name` 和 `@username` 目标成为可能。

无需配置 - 该适配器使用账号配置中的 bot token。

## <a id="multi-account"></a> 多账户

Mattermost 支持在 `channels.mattermost.accounts` 下配置多个账号：

```json5
{
  channels: {
    mattermost: {
      accounts: {
        default: { name: "Primary", botToken: "mm-token", baseUrl: "https://chat.example.com" },
        alerts: { name: "Alerts", botToken: "mm-token-2", baseUrl: "https://alerts.example.com" },
      },
    },
  },
}
```

账号值会覆盖顶层字段；`channels.mattermost.defaultAccount` 用于在未指定账号时选择所使用的账号。

## <a id="troubleshooting"></a> 故障排查

<AccordionGroup>
  <Accordion title="No replies in channels">
    将机器人添加到频道并提及它（oncall），使用触发器前缀（onchar），或设置`chatmode: "onmessage"`。
  </Accordion>
  <Accordion id="auth-or-multi-account-errors" title="身份验证或多帐户错误">
    - 检查 bot token、base URL，以及该账户是否已启用。
    - 多账户问题：环境变量只适用于 `default` 账户。
    - Private/LAN Mattermost 主机需要 `network.dangerouslyAllowPrivateNetwork: true`（SSRF 防护默认情况下会阻止私有 IP）。

  </Accordion>
  <Accordion id="native-slash-commands-fail" title="本机斜杠命令失败">
    - `Unauthorized: invalid command token.`：OpenClaw 未接受回调 token。典型原因：
      - slash command 注册失败，或仅在启动时部分完成
      - 回调指向了错误的 gateway/account
      - Mattermost 仍然有指向先前回调目标的旧命令
      - gateway 重启后没有重新激活 slash commands
    - HTTP 429 负载下：使用传出 OAuth 连接或剥离 `Authorization` 标头的代理的回调仅在正文中携带命令令牌。它们共享有界的匿名请求池，并且在饱和时可以受到限制。通过代理保留 Mattermost 的原始 `Authorization: Token` 标头，以便识别的命令凭据接收单独的容量。
    - 如果原生斜杠命令停止工作，检查日志中是否有 `mattermost: failed to register slash commands` 或 `mattermost: native slash commands enabled but no commands could be registered`。
    - 如果省略 `callbackUrl` 并且日志警告回调解析为类似 `http://localhost:18789/...` 的环回 URL，则只有当 Mattermost 在与以下相同的 host/network 命名空间上运行时，URL 可能才可访问 OpenClaw.设置一个显式的外部可访问的 `commands.callbackUrl`。

  </Accordion>
  <Accordion title="Buttons issues">
    - 按钮显示为白色方框或根本不显示：按钮数据格式错误。每个展示按钮都需要 `label` 和 `value`（缺少任一项的按钮会被丢弃）。
    - 按钮能渲染但点击无反应：确认 Mattermost 服务器可以访问 gateway，Mattermost 服务器 IP 已包含在 `channels.mattermost.interactions.allowedSourceIps` 中（否则只接受 loopback），并且 `ServiceSettings.AllowedUntrustedInternalConnections` 包含私有目标的回调主机。
    - Buttons 在单击时返回 404：按钮 `id` 可能包含连字符或下划线。 Mattermost 的操作路由器在非字母数字 ID 上中断。 Use `[a-zA-Z0-9]` only。
    - gateway 日志 `rejected callback source`：点击来自 `interactions.allowedSourceIps` 之外的 IP。请将 Mattermost 服务器或你的入口网关加入允许列表，并在反向代理后设置 `gateway.trustedProxies`。
    - gateway 日志 `invalid _token`：HMAC 不匹配。检查你是否对所有上下文字段进行签名（而不是子集）、使用排序后的键，以及紧凑 JSON（无空格）。参见上面的 HMAC 章节。
    - 网关日志`missing _token in context`： 这`_token`字段不在按钮的上下文中。在构建集成有效负载时包含它。
    - gateway 拒绝点击并报 `Unknown action`：`context.action_id` 与帖子上的任何动作 `id` 都不匹配。请将二者设置为相同的已清理值。
    - agent 不提供按钮：在 Mattermost 频道配置中添加 `capabilities: ["inlineButtons"]`。

  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

- [通道路由](/channels/channel-routing) - 消息的会话路由
- [Channels Overview](/channels) - 所有支持的渠道
- [群组](/channels/groups) - 群聊行为和提及门控
- [Pairing](/channels/pairing) - DM 身份验证和配对流程
- [Security](/gateway/security) - 访问模型和强化
