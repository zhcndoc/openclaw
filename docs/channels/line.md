---
summary: "LINE 消息 API 插件的设置、配置和使用"
read_when:
  - "你想将 OpenClaw 连接到 LINE"
  - "你需要 LINE webhook + 凭证设置"
  - "您想要 LINE- 特定消息选项"
title: "LINE"
---

LINE 通过 LINE 消息传送 API 连接到 OpenClaw。该插件作为网关上的 Webhook 接收器运行，并使用您的通道访问令牌 + 通道密钥进行身份验证。

状态：官方插件，需单独安装。支持直接消息、群聊、媒体、 位置、Flex 消息、模板消息和快速回复。不支持反应和线程。

## <a id="install"></a> 安装

安装 LINE 之前：

```bash
openclaw plugins install @openclaw/line
```

本地检出（当从 git 仓库运行时）：

```bash
openclaw plugins install ./path/to/local/line-plugin
```

## <a id="setup"></a> 设置

1. 创建一个 LINE Developers 账户并打开控制台： [https://developers.line.biz/console/](https://developers.line.biz/console/)
2. 创建（或选择）一个 Provider，并添加一个 **Messaging API** channel。
3. 从 channel 设置中复制 **Channel access token** 和 **Channel secret**。
4. 在 Messaging API 设置中启用 **Use webhook**。
5. 将 Webhook URL 设置到您的网关端点（需要 HTTPS）：

```text
https://gateway-host/line/webhook
```

网关应答 LINE 的签名 Webhook 验证请求：带有空 `events` 列表的 `POST`。 LINE 的 `standby` 模式中的签名事件无需排队或回复即可确认，因为另一个通道拥有聊天控制权。其他已签名的入站事件在 `200` 之前进入持久入口队列。代理处理继续异步进行。失败的传递将从队列中重试，包括在网关重新启动后，并且有害事件在有限重试后成为失败的队列记录。如果持久性失败，请求将返回 `500`，而不是确认可能丢失的事件。传送至少一次跨越队列到代理边界：在主动传送期间网关关闭或崩溃可以重放该回合。消息事件通过 LINE 消息 ID 进行重复数据删除。其他事件类型使用 `webhookEventId`。保留的完成记录会抑制普通的重复 Webhook，但执行外部副作用的处理程序仍应避免在重试时重复其效果。如果需要自定义路径，请设置 `channels.line.webhookPath` 或 `channels.line.accounts.<id>.webhookPath` 并相应更新 URL。

安全说明：

- LINE 的签名验证依赖于请求体（对原始 body 进行 HMAC），因此 OpenClaw 在验证前会施加严格的预认证 body 限制（64 KB）和读取超时。
- OpenClaw 从已验证的原始请求字节中处理 webhook 事件。为确保签名完整性，上游中间件转换后的 `req.body` 值将被忽略。

## <a id="inbound-durability"></a> 入站持久性

[Setup](#setup) webhook 合约仅在事件持久排队后才会确认该事件。耐用的 `200` 搭载 `x-openclaw-delivery-accepted: durable`。签名验证 ping（空事件列表）、仅备用批次和错误响应省略了标记，因此反向代理可能需要它来区分持久接受和通用 `200`。从那里，交付通过具有 LINE- 特定设置的核心通道入口排水管运行：

- **按会话排序。** 事件按源通道进行序列化 — `group:<groupId>`、`room:<roomId>` 或 `user:<userId>`。没有对话源的事件使用自己的事件范围通道。在通道内，事件按收到的顺序调度，因此重试事件会延迟同一聊天中的后续事件。一个聊天的积压永远不会阻塞另一个聊天的通道，但所有通道共享 8 个并发传送的上限：其他聊天在空闲时独立进行，第 9 个通道等待一个通道打开。
- **Retries.** 失败的传递重试，指数退避从 1 秒开始，每次尝试加倍，整个窗口内的累积退避大约为两分钟。在第 8 次失败尝试后，立即出现事件死信 （`retry-limit-exceeded`）：LINE 选择退出通用 24 小时死信年龄下限，因此有毒事件无法阻止其对话通道一天。
- **不可重试的失败。** 这些死信立即出现，无论尝试次数如何，都不再重试：不再解析的存储有效负载 （`invalid-event`）、已产生副作用的交付 （`delivery-side-effects-committed`） 和 LINE API 身份验证失败（`authentication-failed`、HTTP 401/403）。
- **Stall watchdog.** 既没有达到代理轮流采用也没有报告持续延迟进度 5 分钟的已声明交付将被中止并通过与任何其他失败相同的重试策略释放回其通道：事件返回到待处理状态，其尝试计数增加，并且 `handler-timeout` 记录为最后一个错误，并且将其位置保持在头部其车道。停顿本身并不是死信——只有高于重试限制才会结束事件，如 `retry-limit-exceeded`。看门狗只覆盖声明和采用之间的窗口：延迟的进度会重新武装它，采用会清除它，因此长时间的代理轮流永远不会被它打断。看门狗开火后到达的收养被隔离，因此较晚的回合不能要求已经交还的事件。
- **崩溃恢复。** 每个排出通道都以恢复扫描打开，该恢复扫描回收其所属网关进程不再运行的任何声明，因此因硬崩溃而丢失的传递将在下一次扫描时重试，而不是在超时后重试。 30 分钟的声明租约是相反情况的后备方案：如果没有成功的租约刷新，它会限制声明受保护的时间，仅仅是因为其所有者 PID 看起来仍然活着，包括重复使用的 PID，其进程身份无法验证。网关停止时接受的事件仍会持续存在，并在下次启动后耗尽。
- **重复抑制窗口。** 每次入场时，LINE 都会删除超过 30 天的已完成和失败的队列记录，然后保留每个帐户每种类型的最新更新的 4096 条记录。由于修剪在新事件排队之前运行，而不是在计时器上运行，因此记录可以在空闲帐户上保留超过 30 天，并且新完成的记录可以将计数置于 4096 以上，直到下一次准入。当记录存在时，同一事件的重新传递的 Webhook 会被确认，而无需进行第二次调度。一旦它消失（按年龄或上限），就会再次接受并再次发送，因此具有外部副作用的处理程序不应将此窗口视为其自己的重复预防的替代品。

这`500`-持久性失败合约仅在以下情况下有帮助：LINE重新发送事件。LINE重新传递 webhook 时**Webhook 重新传递**已为通道启用LINE开发者控制台（消息传递API设置，旁边**使用网络钩子**）并且机器人服务器没有应答`2xx`。如果没有该设置，事件将被拒绝`500`不重新发送。即使启用，重新交付也是尽力而为，而不是保证：LINE记录它不可靠，重试计数和间隔未公开，并且重新传递的事件可能无序到达或多次到达（上面的重复抑制窗口吸收了重复）。看[重新传送未能接收的 Webhook](https://developers.line.biz/en/docs/messaging-api/receiving-messages/#webhook-redelivery)。

死信事件保持可检查状态，并且根据故障原因可恢复。请参阅下面的 [ 入站死信 ](/cli/channels#inbound-dead-letters) 和 [ 故障排除 ](#troubleshooting)。

## <a id="configure"></a> 配置

最小配置：

```json5
{
  channels: {
    line: {
      enabled: true,
      channelAccessToken: "LINE_CHANNEL_ACCESS_TOKEN",
      channelSecret: "LINE_CHANNEL_SECRET",
      dmPolicy: "pairing",
    },
  },
}
```

公共 DM 配置：

```json5
{
  channels: {
    line: {
      enabled: true,
      channelAccessToken: "LINE_CHANNEL_ACCESS_TOKEN",
      channelSecret: "LINE_CHANNEL_SECRET",
      dmPolicy: "open",
      allowFrom: ["*"],
    },
  },
}
```

环境变量（仅默认账户）：

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`

Token/secret 文件：

```json5
{
  channels: {
    line: {
      tokenFile: "/path/to/line-token.txt",
      secretFile: "/path/to/line-secret.txt",
    },
  },
}
```

`tokenFile` 和 `secretFile` 必须指向常规文件。符号链接被拒绝。内联配置值胜过文件。环境变量是默认帐户的最后后备。

多个账户：

```json5
{
  channels: {
    line: {
      accounts: {
        marketing: {
          channelAccessToken: "...",
          channelSecret: "...",
          webhookPath: "/line/marketing",
        },
      },
    },
  },
}
```

## <a id="access-control"></a> 访问控制

直接消息默认采用配对模式。未知发送者会获得配对码，并且其消息会被忽略，直到获得批准：

```bash
openclaw pairing list line
openclaw pairing approve line <CODE>
```

允许列表和策略：

- `channels.line.dmPolicy`: `pairing | allowlist | open | disabled` (默认 `pairing`)
- `channels.line.allowFrom`：列入白名单的 DM LINE 用户 ID。 `dmPolicy: "open"` 需要 `["*"]`
- `channels.line.groupPolicy`: `allowlist | open | disabled` (默认 `allowlist`)
- `channels.line.groupAllowFrom`：列入许可名单的组 LINE 用户 ID。 DM `allowFrom` 条目不允许群组发件人
- 每组覆盖：`channels.line.groups.<groupId>.allowFrom`（加上 `enabled`、`requireMention`、`systemPrompt`、`skills`）。对于 `groupPolicy: "allowlist"`，设置 `groupAllowFrom` 或每组 `allowFrom`。即使 DM 打开，空组白名单也会阻止组消息。
- `channels.line.groups."*"` 是每个组和房间的默认条目，而不是命名条目替换的后备条目。命名条目逐个字段覆盖 `"*"`，因此命名条目省略的每个字段均取自 `"*"`。这与 `requireMention` 已通过共享组范围树解析的方式匹配。请参阅 [Groups](/channels/groups)。
- 升级检查：如果您仅在 `channels.line.groups."*"` 上设置 `enabled` 或 `allowFrom`，同时还列出命名组或房间，那么这些通配符值现在也适用于该命名条目。早期版本仅返回指定条目，因此仅通配符字段永远不会到达它。升级之前，请检查设置 `enabled: false` 或缩小 `allowFrom` 的任何 `"*"` 条目，并在应保留其当前访问权限的命名条目上重复该值。
- 引用机器人自己的消息之一算作对其进行寻址，因此使用 LINE 的引用手势做出的群组回复会在没有明确提及的情况下到达代理。设置 `channels.defaults.implicitMentions.quotedBot: false` 以阻止其绕过提及要求。 LINE 读取共享默认值，并且没有自己的通道范围 `implicitMentions` 块。请参阅 [Groups](/channels/groups)。机器人会从它记得的最近发送的消息中识别出自己的消息的引用（每个帐户数百条），因此引用较旧的消息或上次网关重新启动之前发送的消息仍然需要提及。
- 静态发送方访问组可以从 `allowFrom`、`groupAllowFrom` 以及每组 `allowFrom` 和 `accessGroup:<name>` 进行引用。请参见 [ 访问组](/channels/access-groups)。
- 运行时说明：如果 `channels.line` 完全缺失，运行时会对群组检查回退到 `groupPolicy="allowlist"`（即使设置了 `channels.defaults.groupPolicy`）。

LINE ID 区分大小写。有效 ID 如下所示：

- 用户：`U` + 32 个十六进制字符
- 群组：`C` + 32 个十六进制字符
- 房间：`R` + 32 个十六进制字符

## <a id="directory"></a> 目录

`openclaw directory peers list --channel line` 列出所选账户的 `allowFrom`、`groupAllowFrom` 和每组 `allowFrom` 条目中的用户 ID。 `openclaw directory groups list --channel line` 列出配置的组和房间 ID。前缀标准化为可发送 ID，重复出现一次，并且 `*` 和 `accessGroup:<name>` 条目被省略。使用 `--account`、`--query`、`--limit` 和 `--json`，如 [Directory](/cli/directory) 中所述。

这些列表读取配置。它们不会获取实时 LINE 联系人名册，也不会包含通过配对存储的批准。

## <a id="group-join-introductions"></a> 集团加盟介绍

当机器人加入允许的群组或多人房间时，它会在那里发布一个介绍。 LINE 通过其群组摘要 API 公开群组名称，但没有多人房间的房间名称或主题。消息传递 API 无法读取之前的消息，因此介绍仅使用可用的元数据并询问房间希望机器人执行什么操作，而不是发明活动。

默认情况下启用介绍。设置 `channels.line.joinIntro: false` 以禁用它们，或使用 `channels.line.accounts.<accountId>.joinIntro` 覆盖一个帐户。它们从不在一对一的用户聊天中或在其他成员加入时运行。请参阅 [ 群组加入介绍 ](/channels#group-join-introductions) 了解房间准入、每个房间一次的行为以及将房间内容视为不可信的无工具转向。

## <a id="message-behavior"></a> 消息行为

- 文本会被分割成 5000 个字符的块。
- Markdown 格式被删除。如果可能，代码块和表会转换为 Flex 卡。
- 流响应被缓冲。 LINE 接收完整块。加载动画仅在一对一聊天中运行 - LINE 的加载 API 接受用户 ID 并拒绝组和房间 ID - 因此组回复到达时没有回复。生成回复时，心跳轮流还会显示加载动画。
- 媒体下载受 `channels.line.mediaMaxMb` 限制（默认 10）。
- 入站媒体在传递给代理之前，会先保存到 `~/.openclaw/media/inbound/`，以保持与其他频道插件使用的共享媒体存储一致。
- LINE webhook 带有 id，但没有名称，因此发件人的显示名称和组名称将被提取一次并缓存五分钟。群组和房间成员的对话会被阅读，这是查看未将机器人添加为好友的成员的唯一方式。如果任一查找失败，则使用原始 ID 并且消息仍会传递。多人房间没有名称 API，因此保留房间 ID。
- LINE 描述带有元数据和替代文本的内联表情符号。空的 `()` 替代品以 `[emoji]` 的形式到达智能体。有意义的替代项（例如 `(hello)` 和发送者键入的括号）将被保留。
- LINE 将在一次操作中选取的多张图像作为每个图像的一个 Webhook 事件发送，无序。它们被短暂持有，并作为携带每个图像的单轮应答，按索引 LINE 报告排序；客户端忽略该索引的发件人 - LINE 11.15 以及更早的 Android - 保持图像传送的顺序。从未完成的集合将与到达的任何内容一起传送，而不是无限期地保留，在其最近部分之后几秒钟 - 或者在聊天队列到达它之后，如果它仍在等待轮流。同时到达的任何其他内容（一条消息或另一组图像）都会在其后面等待，因此回复会保持聊天发送的顺序；在群组中，队列是整个房间，因为 LINE 对话是按聊天而不是按成员排序的。没有原生视觉的模型仅读取第一张图像，除非 `tools.media.image.attachments` 同时设置了 `mode: "all"` 和 `maxAttachments`；单独使用任一键都会将限制保留为 1。一套零件没有公布总数的零件会随到达的零件一起交付，而不会透露其余零件，因为没有说明有多少零件。

## <a id="reply-quoting"></a> 回复引用

`channels.line.replyToMode` 控制本机引用回复（出站回复明显引用其回复的消息，这就是群组告诉机器人正在与谁交谈的方式）：

| 值             | 行为                             |
| ----------------- | ------------------------------------ |
| `"off"`（默认） | 不自动引用           |
| `"first"`         | 仅引用一轮中的第一个回复 |
| `"all"`           | 引用每轮回复          |

其他通道接受的 `"batched"` 在这里被拒绝：它将对合并转弯的答复与对立即转弯的答复区分开来，并且 LINE 路径上没有任何内容将转弯标记为合并，因此永远不会出现这种区别。

每个帐户覆盖：`channels.line.accounts.<id>.replyToMode`。没有每聊天类型的覆盖：`replyToModeByChatType`（Slack、Signal 和 Mattermost 接受）在此处被拒绝，因此一个帐户在直接聊天和群组中以相同的方式引用。

```json5
{ channels: { line: { replyToMode: "all" } } }
```

与 Telegram 一样，`"off"` 仅关闭自动引用：代理写入的显式回复标记仍然受到尊重。回复内联引用并在对话中保持可见，因此通过线程化回复不会隐藏任何内容。

LINE 通过与每个入站消息一起发出的令牌而不是消息 ID 来引用，并且 OpenClaw 只能引用它保留该令牌的消息。因此，引用具有设置无法解除的限制：

- LINE 仅针对文本、图像、视频和贴纸消息发出报价令牌。回答任何其他类型的回复将不带引号发送。
- LINE 拒绝 Flex 卡、介质和位置图钉上的报价，因此在可以携带该报价的第一条消息上回复一次报价。仅由这些内容组成的回复将不加引号地发送。
- A回复只能引用OpenClaw收到的消息。 LINE 还会为机器人本身发送的每条消息返回一个引用标记，但这些标记不会保留，因此回答机器人自己的较早消息之一的回复将不加引号地发送。
- 仅记住轮到代理时传递给代理的消息 OpenClaw。在启用 `requireMention` 的组中，跳过的消息仍会作为组历史记录的一行到达代理，但该行不携带回复可以命名的 id，因此无法引用它。
- A 通过点击按钮启动的转人不携带自己的消息，因此其回复不加引号地发送。
- Tokens 存在于正在运行的网关中，是其所有聊天中每个帐户最近的 500 个。回复上次重新启动之前的消息、同一帐户上较繁忙的聊天已推出的回复，或者由单独进程（例如 `openclaw message send`）发送的回复，均不带引号发送。
- 如果 LINE 拒绝携带带有 HTTP 400 的报价令牌的请求，则 OpenClaw 会重试相同的回复（不带报价）。删除或取消发送引用的消息本身不会使其令牌失效； LINE 可能会将引用的内容显示为不可用。请参阅 [LINE 报价消息 ](https://developers.line.biz/en/docs/messaging-api/sending-messages/#send-quote-messages)。

## <a id="block-streaming"></a> 块流

块流将每个已完成的辅助块作为其自己的 LINE 消息发送，而不是等待整个回复。默认关闭，`channels.line.streaming`单独为LINE决定：

```json5
{ channels: { line: { streaming: { block: { enabled: true } } } } }
```

| 设置                          | 作用                                                               |
| -------------------------------- | -------------------------------------------------------------------- |
| `streaming.block.enabled: true`  | 无论代理默认值是什么，在完成时发送已完成的块  |
| `streaming.block.enabled: false` | 即使代理默认值是 `on`，仍将 LINE 保留在整个回复中       |
| 未设置（默认）                  | 关注 `agents.defaults.blockStreamingDefault`                       |
| `streaming.block.coalesce`       | 发送前合并小块（`minChars`、`maxChars`、`idleMs`） |
| `streaming.chunkMode`            | `length`（默认）或 `newline` 在段落边界上分割     |

每个帐户覆盖：`channels.line.accounts.<id>.streaming`。这些是跨通道共享的块模式流控制；请参阅 [Streaming](/concepts/streaming)。

LINE 接收的每个块都是一条单独的消息，并且 LINE 根据通道的每月配额对消息进行计数，因此将其关闭会保留对最少消息的长回复。如果您希望块提前到达但不想一次到达一个段落，`coalesce.minChars` 就是一个杠杆 - OpenClaw 自己的默认值为 800 个字符。

LINE 无法编辑已发送的消息，因此它没有预览流模式：这里没有 `streaming.mode` 或 `streaming.preview`，并且回复永远不会就地修改。

## <a id="structured-rich-messages"></a> 结构化丰富消息

使用共享消息表示字段进行便携式选择。 LINE 将 `buttons` 块渲染为 Flex 控件，将 `select` 块渲染为快速回复。两个按钮块是便携式确认式表单。

`buttons` 块呈现带有演示文稿标题和文本的 Flex 卡。唯一控件为 `select` 的演示文稿不会呈现任何卡片，因为快速回复会附加到回复自己的文本消息中。它的标题和文本块会附加到该文本上。 LINE 对一条消息最多绘制 13 个快速回复，按回复中的每个 `select` 块而不是每个块进行计数。每个选择都将其提示和任何溢出选项保留在该文本中。提示和溢出选项名称保持完整。仅本机快速回复按钮标签被缩短至 LINE 的 20 个字符限制。

在直接聊天中，`ask_user` 问题提供的选项成为同一张 Flex 卡上的可点击控件，点击即可直接回答问题。 LINE 携带网关分配的选项索引而不是标签，因此网关不再列出其选项的回复会退回到可读文本，而不是绘制回答错误选项的点击。符合条件的形状是一个单选、非秘密问题，提供两到四个不同的选项 - 使用相同的绑定 Telegram、Discord 和 Slack；其他任何内容都保持可读文本，键入的回复仍然可以回答。群组、多人聊天和无法识别的目标也使用这种可读的后备。 LINE的群组和房间回发不包含承认问题答案所需的发送者身份；请使用选项文本进行回复。

未绘制 **Other…** 自由文本控件。点击它本身不会解决任何问题，并且 LINE 无法从已交付的卡片上收回控制权，因此该按钮将添加一个点击，该点击不会改变问题本身的文本尚未提供的任何内容。 Discord 和 Slack 出于同样的原因将该路由保留在文本中。在符合条件的直接聊天中，每个声明的选项都保留本机控件，并且 **Other…** 在 `Actions:` 下的卡片文本中保持命名，无论选项数量如何。

LINE 无法编辑已发送的消息，因此问题结束后控件仍保留在屏幕上。随后到达的点击会以 `That question is no longer waiting for an answer.` 进行应答。初始点击遵循通道的正常准入和配对规则。如果在阅读问题时撤销配对，则答案将被忽略，并且不会出现答案通知或新的配对挑战。网关会针对已回答、已取消和已过期的问题报告一种最终状态，因此通知不会声明具体是哪一种状态。

```json5
{
  action: "send",
  message: "Choose an action",
  presentation: {
    title: "Menu",
    blocks: [
      {
        type: "buttons",
        buttons: [
          { label: "Status", action: { type: "command", command: "/status" } },
          { label: "Website", action: { type: "url", url: "https://example.com" } },
        ],
      },
      {
        type: "select",
        placeholder: "Pick one",
        options: [
          { label: "Alpha", action: { type: "callback", value: "alpha" } },
          { label: "Help", action: { type: "command", command: "/help" } },
        ],
      },
    ],
  },
}
```

LINE-only 输出使用 `message(action="send")` 上经过架构验证的 `channelData.line` 字段。发送一个位置 and/or 一个 `card`。支持的卡类型为`media_player`、`event`、`agenda`、`device`、`appletv_remote`。

```json5
{
  action: "send",
  message: "Here you go",
  channelData: {
    line: {
      location: {
        title: "Office",
        address: "123 Main St",
        latitude: 35.681236,
        longitude: 139.767125,
      },
      card: {
        type: "event",
        title: "Team meeting",
        date: "2026-08-18",
        time: "10:00",
        location: "Conference room",
        description: "Weekly planning",
      },
    },
  },
}
```

其他卡片形状：

```json5 validate=false
{ type: "media_player", title: "Song", artist: "Artist", source: "Living Room", status: "playing", imageUrl: "https://example.com/cover.jpg" }
{ type: "agenda", title: "Today", events: [{ title: "Standup", time: "09:00", location: "Online" }] }
{ type: "device", name: "TV", deviceType: "Streaming box", status: "Playing", controls: [{ label: "Pause", action: "pause" }] }
{ type: "appletv_remote", name: "Living Room", status: "Playing" }
```

双括号字符串（例如 `[[buttons: ...]]`）是纯文本，不会解释为丰富消息指令。

LINE 插件还提供了一个用于 Flex 消息预设的 `/card` 命令：

```text
/card info "Welcome" "Thanks for joining!"
```

卡片图像和图标必须使用 HTTPS。 OpenClaw 会删除格式错误或非 HTTPS URL 的图像，并在符合 LINE 的 30 个 KB 气泡和 50 个 KB 轮播限制时添加“图像不可用”注释。视频英雄保留其所需的替代内容：不可用的视频或预览 URL 会回退到该内容，而不可用的替代图像将变成文本框。无效的模板缩略图将被删除。轮播缩略图会一起删除，因此每列都保持相同的图像布局。文本和操作按钮保持不变。

## <a id="acp-support"></a> ACP 支持

LINE 支持 ACP（Agent Communication Protocol）会话绑定：

- `/acp spawn <agent> --bind here` 会将当前 LINE 聊天绑定到一个 ACP 会话，而不会创建子线程。
- 已配置的 ACP 绑定和活动的会话绑定 ACP 会话在 LINE 上的工作方式与其他会话频道相同。

详情请参见 [ACP 代理](/tools/acp-agents)。

## <a id="outbound-media"></a> 出站媒体

LINE 插件通过代理消息工具发送图片、视频和音频：

- **Images**：作为 LINE 图像消息发送。预览图像默认为媒体 URL。
- **Videos**：需要预览图像。将 `channelData.line.previewImageUrl` 设置为图像 URL。
- **Audio**：作为 LINE 音频消息发送。持续时间默认为 60 秒，除非设置了 `channelData.line.durationMs`。

当省略 `mediaKind` 时，LINE 将从 LINE- 特定选项或 URL 后缀推断出来。本机后缀推断支持 JPEG/PNG、MP4 和 MP3/M4A. 无后缀 URL 保留图像回退。其他带后缀的 URL 和推断出的没有预览的 MP4 都成为文本链接。露骨视频仍需要 `previewImageUrl`。

出站媒体 URL 必须是公共 HTTPS URL，最多 2000 个字符。 OpenClaw 在将 URL 交给 LINE 之前验证目标主机名，并拒绝环回、链路本地和专用网络目标。

## <a id="troubleshooting"></a> 故障排查

- **Webhook 验证失败：** 检查 Webhook URL 是否为 HTTPS 并且 `channelSecret` 与 LINE 控制台匹配。
- **无入站事件：**运行`openclaw channels status --probe`。 LINE 仅在通道的 Webhook URL 已注册且 **Use webhook** 在 LINE 开发人员控制台的消息传递 API 选项卡中打开时传递事件，并且检查报告两者 — Webhook 关闭或未注册的通道以要更改的设置命名。 OpenClaw 不会为您设置：URL 有一个 API 但依赖于 OpenClaw 不知道的公共地址，而 **Use webhook** 交换机根本没有 API。 webhook 状态来自检查，因此没有 `--probe` 的 `openclaw channels status` 不会报告它。如果检查报告 Webhook 已打开，请确认 Webhook 路径与 `channels.line.webhookPath` 匹配，并且可以从 LINE 访问网关。
- **媒体下载错误：** 如果媒体超过默认限制，请提高 `channels.line.mediaMaxMb`。
- **推送被拒绝，HTTP 429：** 运行 `openclaw channels status --channel line --probe --json`。对于有限限额，账户的 `quota` 包含 `used` 和 `limit`。缺少的配额是未知的，不是无限的。健康的机器人身份可以与耗尽的推送限额共存。重试前请在 LINE 公众号管理器中检查账户限额或计划。 429 还可以反映速率限制或临时消息保留。与推送不同，普通的回复令牌消息不会消耗每月的津贴。参见[LINE消息定价](https://developers.line.biz/en/docs/messaging-api/pricing/)。
- **Bot 默默地跳过消息（死信事件）：** `openclaw logs` 显示带有失败原因的 `line: spooled update <id> ... dead-lettered` 行。使用 `openclaw channels dead-letters list --channel line --account default` 检查并在恢复之前检查失败原因：`resubmit` 按事件 id 重新排队，而不检查事件失败的原因。修复故障原因且没有产生任何副作用后（例如，提供程序中断后的 `retry-limit-exceeded`），使用 `openclaw channels dead-letters resubmit <event-id> --channel line --account default` 重新排队一个事件。切勿重新提交 `delivery-side-effects-committed` 事件：该原因意味着交付已经采用了代理轮流或消耗了其回复令牌，因此重新排队会重复已提交的工作 - 例如第二个可见回复。 `openclaw health` 报告死信计数，`openclaw doctor` 命名受影响的帐户。
- **`handler-timeout` 重试：** 已声明交付，但既没有达到代理轮流采用，也没有报告延迟进度 5 分钟。这是回合开始之前的一个停顿——采用会清除看门狗，因此已经运行的回合永远不是原因，也永远不会被它切断。相反，请查看调度路径：在声明和采用之间运行的交付准备，例如入站媒体下载或不接受新作品的网关。这不会使事件成为死信。 `openclaw logs` 显示 `applying retry policy (handler-timeout)`，并且事件等待其退避，并将 `handler-timeout` 作为其最后一个错误。不断重复的停顿最终会耗尽重试限制，因此停顿导致死信的事件会落在 `retry-limit-exceeded` 下，而不是超时原因下。检查受影响事件 ID 周围的 `openclaw logs --follow`。

## <a id="related"></a> 相关内容

- [Channels Overview](/channels) — 所有支持的通道
- [配对](/channels/pairing) — DM 身份验证和配对流程
- [Groups](/channels/groups) — 群聊行为和提及门控
- [通道路由](/channels/channel-routing) — 消息的会话路由
- [Security](/gateway/security) — 访问模型和强化
