---
summary: "Microsoft Teams 会话路由、回复样式、附件和文件发送"
read_when:
  - "在线索回复和顶级回复之间进行选择"
  - "附件没有内容"
  - "将文件发送到群聊或频道"
title: "Microsoft Teams 消息行为"
sidebarTitle: "消息行为"
---

如何路由和串联回复，以及如何将附件和文件移入和移出 Teams。

## <a id="routing-and-sessions"></a> 路由与会话

- 会话键遵循标准代理格式（参见 [/concepts/session](/concepts/session)）：
  - Direct 消息默认共享主会话 （`agent:<agentId>:main`）。
  - Channel/group 消息使用会话 ID：
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## <a id="channel-metadata"></a> 频道元数据

消息工具的 `channel-list` 操作需要 `teamId`。 `channel-info` 操作需要 `teamId` 和 `channelId`。使用 Microsoft Teams 团队 ID，包括同时配置 Slack 时；共享 `teamId` 字段接受每个提供商的 ID 格式。这些操作保留配置的 Teams 访问规则。

## <a id="graph-actions"></a> 图形操作

Teams 操作处理程序启动后，固定、取消固定、添加或删除反应、更改参与者以及重命名对话会在每个图形请求之前重新检查其调用者。在处理程序的令牌准备、目标授权或参与者查找期间取消会停止其下一个请求。取消不会撤消 Microsoft 已接受的突变。现有账户、目标和 owner/admin 规则仍然适用；固定和取消固定仍然仅限于聊天。

## <a id="reply-style%3A-threads-vs-posts"></a><a id="reply-style-threads-vs-posts"></a> 回复样式：Threads 与 Posts

Teams 在同一底层数据模型上有两种频道 UI 样式：

| 样式                    | 描述                                               | 推荐的 `replyStyle` |
| ------------------------ | --------------------------------------------------------- | ------------------------ |
| **Posts**（经典）      | 消息以卡片形式显示，下面带有线程回复 | `thread`（默认）       |
| **Threads**（Slack-类似） | 消息线性流动，更像是 Slack                   | `top-level`              |

**问题在于：** Teams API 不会暴露某个频道使用的是哪种 UI 样式。如果你使用了错误的 `replyStyle`：

- 在 Threads 风格的频道中使用 `thread` → 回复会以嵌套方式出现，显得别扭。
- 在 Posts 风格的频道中使用 `top-level` → 回复会作为独立的顶层帖子出现，而不是线程内回复。

**解决方案：** 根据频道的配置方式，按频道设置 `replyStyle`：

```json5
{
  channels: {
    msteams: {
      replyStyle: "thread",
      teams: {
        "19:abc...@thread.tacv2": {
          channels: {
            "19:xyz...@thread.tacv2": {
              replyStyle: "top-level",
            },
          },
        },
      },
    },
  },
}
```

### <a id="resolution-precedence"></a> 优先级顺序

当机器人向频道发送回复时，`replyStyle` 会从最具体的覆盖项逐级回退到默认值。第一个非 `undefined` 的值生效：

1. **按频道** - `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`
2. **按团队** - `channels.msteams.teams.<teamId>.replyStyle`
3. **全局** - `channels.msteams.replyStyle`
4. **隐式默认值** - 由 `requireMention` 推导：
   - `requireMention: true` → `thread`
   - `requireMention: false` → `top-level`

如果你在全局将 `requireMention: false` 设为默认，而没有显式设置 `replyStyle`，那么在 Posts 风格频道中的提及消息会以顶层帖子形式出现，即使入站消息原本是一个线程回复。请在全局、团队或频道级别固定设置 `replyStyle: "thread"`，以避免意外行为。

对于主动发送到存储的通道对话（排队的工具调用回复、长时间运行的代理），适用相同的 team/channel 分辨率；群聊和个人 ​​（DM） 对话始终解析为 `top-level` 进行主动发送，无论 `replyStyle` 是什么。

### <a id="thread-context-preservation"></a> 线程上下文保留

当 `replyStyle: "thread"` 生效并且机器人是来自通道线程内部的 @mentioned 时，OpenClaw 会将原始线程根重新附加到出站对话引用 （`19:...@thread.tacv2;messageid=<root>`），以便回复位于同一线程内。这适用于实时（依次）发送和 Bot Framework 轮次上下文过期后进行的主动发送（e.g.、长时间运行的代理、通过 `mcp__openclaw__message` 排队的工具调用回复）。

线程根会从存储在会话引用中的 `threadId` 取出。旧版引用如果还不包含 `threadId`，则回退使用 `activityId`（即最近一次提供会话上下文的入站活动），因此现有部署无需重新播种也能继续工作。

当 `replyStyle: "top-level"` 生效时，来自频道线程的入站消息会被刻意作为新的顶层帖子回复；不会附加线程后缀。这对于 Threads 风格频道是正确的；如果你期望的是线程回复却看到顶层帖子，说明该频道的 `replyStyle` 设置不正确。

## <a id="delivery-cancellation-and-retries"></a> 配送取消和重试

文本、图像、文件和演示卡的任务和队列传送在每个 Teams 请求之前检查其当前的传送权限，包括在令牌获取和速率限制等待之后。取消会停止尚未开始的请求。 Teams已接受的消息和文件卡保留其送达回执；部分完成的文本和媒体发送保留其已接受的部分。

所需的 SharePoint 上传、成员查找、共享链接和重定向在继续之前检查相同的权限。上传的SharePoint文件正在准备Teams文件卡；仅上传并不能确认发送到聊天室。

## <a id="outbound-mentions"></a> 出站提及

在传出文本中使用 `@[Name](id)`，将 `id` 替换为 Teams user/bot ID 或 Microsoft Entra 对象 ID。显示名称内的转义括号为 `\[` 和 `\]`：`Alice \[Ops\]` 在本机提及中变为 `Alice [Ops]`。使用 `\\` 来转义反斜杠。相同的格式适用于消息编辑和文件标题。

## <a id="attachments-and-images"></a> 附件和图片

**当前限制：**

- **DMs：** 图像和文件附件通过 Teams 机器人文件 API 工作。
- **Channels/groups：** 附件位于 M365 存储 （SharePoint/OneDrive） 中。 Webhook 负载仅包含 HTML 存根，而不包含实际的文件字节。 **图表 API 需要** 权限才能下载频道附件。
- 对于显式文件优先发送，请使用 `action=upload-file` 和 `media` / `filePath` / `path`；可选的 `message` 成为随附的 text/comment，并且 `filename`（或 `title`）覆盖上传的名称。

如果没有 Graph 权限，包含图片的频道消息将以纯文本形式到达（机器人无法访问图片内容）。 默认情况下，OpenClaw 仅从 Microsoft/Teams 主机名下载媒体。你可以使用 `channels.msteams.mediaAllowHosts` 覆盖此设置（使用 `["*"]` 可允许任何主机）。 Authorization 标头仅会附加到 `channels.msteams.mediaAuthAllowHosts` 中的主机（默认为 Graph + Bot Framework 主机）。请保持此列表严格（避免使用多租户后缀）。

## <a id="sending-files-in-group-chats"></a> 在群聊中发送文件

机器人可以使用内置的 FileConsentCard 流在 DM 中发送文件。 **在 chats/channels** 组中发送文件需要额外的设置：

| 上下文                  | 文件发送方式                           | 所需配置                                    |
| ------------------------ | -------------------------------------------- | ----------------------------------------------- |
| **私聊**                  | FileConsentCard → 用户接受 → 机器人上传 | 开箱即用                            |
| **集团 chats/channels** | 上传至SharePoint→本机文件卡      | 需要 `sharePointSiteId` + 图形权限 |
| **图像（任何上下文）** | 内联 Base64 编码                        | 开箱即用                            |

### <a id="why-group-chats-need-sharepoint"></a> 为什么群聊需要 SharePoint

机器人使用应用程序身份，而 Microsoft Graph 的 `/me` 资源 [ 需要登录用户 ](https://learn.microsoft.com/en-us/graph/api/user-get?view=graph-rest-1.0)。为了在 chats/channels 组中发送文件，机器人会上传到 **SharePoint 站点** 并创建共享链接。

### <a id="setup"></a> 设置

1. **在 Entra ID（Azure AD）→ 应用注册中添加 Graph API 权限**：
   - `Sites.ReadWrite.All`（应用程序）- 将文件上传到 SharePoint。
   - `ChatMember.Read.All`（应用程序）- 用于群聊文件发送的租户范围最小权限。`Chat.Read.All` 也可用，并且在启用群聊历史记录时已包含此权限。作为按聊天的替代方案，可使用 `ChatMember.Read.Chat` [特定于资源的同意权限](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)。
2. **向租户授予管理员同意**。
3. **获取你的 SharePoint 站点 ID：**

   ```bash
   # Via Graph Explorer or curl with a valid token:
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/{hostname}:/{site-path}"

   # Example: for a site at "contoso.sharepoint.com/sites/BotFiles"
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com:/sites/BotFiles"

   # Response includes: "id": "contoso.sharepoint.com,guid1,guid2"
   ```

4. **配置 OpenClaw：**

   ```json5
   {
     channels: {
       msteams: {
         // ... other config ...
         sharePointSiteId: "contoso.sharepoint.com,guid1,guid2",
       },
     },
   }
   ```

### <a id="sharing-behavior"></a> 共享行为

| 上下文和权限                                                  | 共享行为                                          |
| ----------------------------------------------------------------------- | --------------------------------------------------------- |
| 频道 + `Sites.ReadWrite.All`                                         | 组织范围共享链接（组织中的任何人都可以访问） |
| 群聊 + `Sites.ReadWrite.All` + 受支持的群聊成员读取授权 | 按用户共享链接（只有群聊成员可以访问）      |
| 群聊，但没有受支持的群聊成员读取授权                   | 发送被阻止                                           |

按用户共享更安全，因为只有聊天参与者才能访问该文件。OpenClaw 要求群聊成员查询成功；超时、传输失败、空结果以及 Graph API 拒绝都会导致发送失败，而不是将访问范围扩大到整个组织。

### <a id="fallback-behavior"></a> 回退行为

| 场景                                                         | 结果                                           |
| ---------------------------------------------------------------- | ------------------------------------------------ |
| 群聊 + 文件 + 已配置 SharePoint 和成员权限 | 上传到 SharePoint，发送原生文件卡片    |
| 群聊 + 文件 + 缺少 SharePoint 或成员权限     | 失败，并显示可执行的配置错误      |
| 频道 + 文件 + 已配置 `sharePointSiteId`                   | 上传到 SharePoint，发送原生文件卡片    |
| 私聊 + 文件                                             | FileConsentCard 流程（无需 SharePoint 即可工作）  |
| 任何上下文 + 图像                                              | 内联 Base64 编码（无需 SharePoint 即可工作） |

### <a id="files-stored-location"></a> 文件存储位置

上传的文件会存储在所配置 SharePoint 站点默认文档库中的 `/OpenClawShared/` 文件夹里。
