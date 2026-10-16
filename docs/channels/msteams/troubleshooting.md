---
summary: "Microsoft Teams 已知限制、常见故障和参考链接"
read_when:
  - "Teams 机器人无声，或图像未到达"
  - "清单上传或 RSC 权限被拒绝"
  - "检查Teams路径不支持什么"
title: "Microsoft Teams 故障排除"
sidebarTitle: "故障排查"
---

Teams 路径不支持什么、操作员最常遇到的故障以及在哪里可以阅读更多内容。

## <a id="known-limitations"></a> 已知限制

### <a id="webhook-timeouts"></a> Webhook 超时

Teams 通过网关 HTTP Webhook 路由传递消息。有界 Express 解析器保留 1 MiB 解码的 JSON 限制，包括 gzip、deflate 和 Brotli 回调。网关 HTTP 生命周期限制适用于主侦听器；兼容性侦听器保留以前的 Teams 限制：30 秒不活动、30 秒总请求和 15 秒接收标头。在通道停止期间，新回调会接收可重试的 HTTP 503，同时主动响应会稳定下来，最多持续 30 秒，然后才会释放路由。入站附件下载最多需要 120 秒，因为经过身份验证的 Teams 图像视图可能需要数十秒；未达到该预算的附件将被视为不可用而到达代理。可选的上下文丰富（团队身份、引用的消息、线程历史记录）然后获得其自己的 10 秒预算。 SDK 在原始活动持久附加后返回；代理轮独立排水并主动回复。如果请求处理或持久准入错过了传输窗口，Teams 可能会重试该活​​动，并且入口逻辑删除会拒绝重复事件 ID。

如果删除 `legacyWebhook` 引脚或将其设置为 `false` 后 Teams 变得静默，请检查 Azure Bot 或反向代理是否仍指向端口 `3978`。按照 [ 端点迁移说明 ](/channels/msteams/configuration#migrating-an-existing-webhook-endpoint) 使用网关端口或完成显式旧侦听器的迁移。

### <a id="teams-cloud-and-service-url-support"></a> Teams 云环境和 service URL 支持

此 SDK- 支持的 Teams 路径针对 Microsoft Teams 公共云进行了实时验证。

入站回复使用传入的 Teams SDK turn context。上下文外的主动操作——发送、编辑、删除、卡片、投票、文件同意消息，以及排队的长时间运行回复——使用已存储的会话引用 `serviceUrl`。公有云默认使用 Teams SDK 公有云环境，并允许在公有 Teams Connector 主机上存储引用：`https://smba.trafficmanager.net/`。

公有云是默认配置。对于正常的公有云机器人，你无需设置 `channels.msteams.cloud` 或 `channels.msteams.serviceUrl`。

对于非公有 Teams 云环境，请在 Microsoft 发布后设置 `cloud` 以及相应的主动边界：

- `channels.msteams.cloud` 选择 Teams SDK 云预设进行身份验证、JWT 验证、令牌服务和图形范围。
- `channels.msteams.serviceUrl` 选择 Bot 连接器端点边界，用于在主动发送、编辑、删除、卡片、轮询、文件同意消息和排队的长时间运行回复之前验证存储的对话引用。 USGov 和 DoD SDK 云需要它。对于 China/21Vianet，OpenClaw 使用 SDK `China` 预设，并仅在 Azure China Bot Framework 通道主机上接受 stored/configured 服务 URL。

Microsoft 在 Teams 主动消息文档的 [创建会话](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages?tabs=dotnet#create-the-conversation) 部分发布了全局主动 Bot Connector 端点。优先使用传入活动的 `serviceUrl`（如果可用）；否则使用下表中的 Microsoft 值。

| Teams 环境 | OpenClaw 配置                                             | 主动 `serviceUrl`                             |
| ----------------- | ----------------------------------------------------------- | -------------------------------------------------- |
| 民众            | 无需 cloud/serviceUrl 配置                           | `https://smba.trafficmanager.net/teams`            |
| GCC               | 设置 `serviceUrl`；不存在单独的 Teams SDK 云预设 | `https://smba.infra.gcc.teams.microsoft.com/teams` |
| GCC 高          | `cloud: "USGov"` + `serviceUrl`                             | `https://smba.infra.gov.teams.microsoft.us/teams`  |
| DoD               | `cloud: "USGovDoD"` + `serviceUrl`                          | `https://smba.infra.dod.teams.microsoft.us/teams`  |
| China/21Vianet    | `cloud: "China"`                                            | 使用传入活动的 `serviceUrl`           |

GCC 的示例，其中 Microsoft 文档提供了单独的主动 service URL，但 Teams SDK 不暴露单独的 GCC 云预设：

```json
{
  "channels": {
    "msteams": {
      "serviceUrl": "https://smba.infra.gcc.teams.microsoft.com/teams"
    }
  }
}
```

GCC High 的示例：

```json
{
  "channels": {
    "msteams": {
      "cloud": "USGov",
      "serviceUrl": "https://smba.infra.gov.teams.microsoft.us/teams"
    }
  }
}
```

`channels.msteams.serviceUrl` 仅限于受支持的 Microsoft Teams Bot Connector 主机。配置服务 URL 时，OpenClaw 会在主动发送、编辑、删除、卡片、轮询或排队的长时间运行回复运行之前检查存储的对话 `serviceUrl` 是否使用同一主机。使用默认的公共云配置，如果存储的对话指向公共 Teams 连接器主机之外，OpenClaw 将拒绝这些操作。更改 cloud/service URL 设置后，从对话中接收新消息，以便存储的对话参考是最新的。

China/21Vianet 在 Microsoft 的 Teams 主动端点表中没有单独的全局主动 `smba` URL。配置 `cloud: "China"`，以便 Teams SDK 使用 Azure China 的身份验证、令牌和 JWT 端点。随后，主动发送需要来自传入 China Teams 活动的已存储会话引用，或者在 Azure China Bot Framework channel 边界（`*.botframework.azure.cn`）上显式配置的 service URL。对于 `cloud: "China"`，基于 Graph 的 Teams 辅助功能会被禁用，直到 OpenClaw 将 Graph 请求路由到 Azure China Graph 端点为止。

### <a id="formatting"></a> 格式

Teams 的 markdown 比 Slack 或 Discord 更受限制：

- 基本格式设置：**bold**、_斜体_、`code`、链接。
- 文本编辑、文件标题和最终的流式回复使用与普通消息相同的 Markdown 转换和用户提及格式。流媒体预览可能会显示未完成的 Markdown，直到最终答复取代它们。
- 复杂 markdown（表格、嵌套列表）可能无法正确渲染。
- 自适应卡支持批准提示、投票和语义表示发送（请参阅 [ 卡片和操作](/channels/msteams/cards-and-actions)）。

## <a id="troubleshooting"></a> 故障排查

### <a id="common-issues"></a> 常见问题

- **图像未在频道中显示：** 缺少图形权限或管理员同意。重新安装 Teams 应用程序并完全安装 quit/reopen Teams。
- **频道内无回复：默认需要提及**；设置 `channels.msteams.requireMention=false` 或按 team/channel. 配置
- **版本不匹配（Teams 仍显示旧的 manifest）：** 移除并重新添加应用，然后完全退出 Teams 以刷新。
- **来自 webhook 的 401 未授权：** 在没有 Azure JWT 的情况下手动测试时属于预期现象；这表示端点可达，但认证失败。请使用 Azure Web Chat 进行正确测试。

### <a id="manifest-upload-errors"></a> manifest 上传错误

- **“Icon file cannot be empty”：** manifest 引用了 0 字节的图标文件。请创建有效的 PNG 图标（`outline.png` 为 32x32，`color.png` 为 192x192）。
- **“webApplicationInfo.Id已在使用”：**该应用程序仍然安装在另一个team/chat.中先找到并卸载它，或者等待5-10分钟传播。
- **上传时“出现问题”：** 通过 [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com) 上传，打开浏览器 DevTools （F12） → 网络选项卡，然后检查响应正文以了解实际错误。
- **侧载失败：** 尝试使用“Upload an app to your org's app catalog”而不是“Upload a custom app”；这通常可以绕过侧载限制。

### <a id="rsc-permissions-not-working"></a> RSC 权限不生效

1. 确认 `webApplicationInfo.id` 与你的 bot App ID 完全一致。
2. 重新上传应用程序并重新安装在team/chat.中
3. 检查你的组织管理员是否已阻止 RSC 权限。
4. 确认你使用的是正确的作用域：团队使用 `ChannelMessage.Read.Group`，群聊使用 `ChatMessage.Read.Chat`。

## <a id="references"></a> 参考资料

- [创建 Azure Bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Azure Bot 设置指南
- [Teams 开发人员 Portal](https://dev.teams.microsoft.com/apps) - create/manage Teams 应用程序
- [Teams 应用清单架构](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [ 使用 RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc) 接收通道消息
- [RSC 权限参考](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Teams bot 文件处理](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4)（channel/group 需要图表）
- [主动消息发送](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
- [@microsoft/teams.cli](https://www.npmjs.com/package/@microsoft/teams.cli) - 用于 bot 管理的 Teams CLI

## <a id="related"></a> 相关内容

- [Channels Overview](/channels) - 所有支持的渠道
- [Pairing](/channels/pairing) - DM 身份验证和配对流程
- [群组](/channels/groups) - 群聊行为和提及门控
- [通道路由](/channels/channel-routing) - 消息的会话路由
- [Security](/gateway/security) - 访问模型和强化
