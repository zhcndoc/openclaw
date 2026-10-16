---
summary: "修复了静默通道、忽略 DM 和无效传输的问题"
read_when:
  - "机器人不会在 Slack 频道或 DM 中回复"
  - "Socket模式或HTTP模式不接收事件"
  - "斜线命令不会触发"
title: "Slack 故障排除"
sidebarTitle: "故障排查"
---

症状优先检查是否存在不正常行为的 Slack 帐户。

## <a id="troubleshooting"></a> 故障排查

<AccordionGroup>
  <Accordion title="No replies in channels">
    按以下顺序检查：

    - `groupPolicy`
    - 通道白名单 （`channels.slack.channels`） — **密钥必须是通道 ID** （`C12345678`） 或工作区限定的通道目标 （`team:<team-id>:channel:<channel-id>`），而不是名称 （`#channel-name`）。基于名称的密钥在 `groupPolicy: "allowlist"` 下会静默失败，因为默认情况下通道路由是 ID-first。要查找 ID：右键单击 Slack → **复制链接** — URL 末尾的 `C...` 值是通道 ID。
    - `requireMention`
    - 每个频道的 `users` 允许列表
    - `messages.groupChat.visibleReplies`：普通 group/channel 请求默认是 `"automatic"`。如果你选择了 `"message_tool"`，并且日志显示有 assistant 文本但没有 `message(action=send)` 调用，则说明模型没有走到可见的 message-tool 路径。在这种模式下，最终文本会保持私密；请检查 gateway 的详细日志以查看被抑制的 payload 元数据，或者如果你希望每个普通 assistant 最终回复都通过旧路径发布，请将其设置为 `"automatic"`。
    - `messages.groupChat.unmentionedInbound`：如果它是 `"room_event"`，那么允许的频道内未提及聊天会作为环境上下文存在，并且保持静默，除非 agent 调用 `message` 工具。参见 [环境房间事件](/channels/ambient-room-events)。

```json5
{
  messages: {
    groupChat: {
      visibleReplies: "automatic",
    },
  },
}
```

    有用的命令：

```bash
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

    当准备拒绝入站事件时，信息级日志会记录 `Slack inbound event rejected during preparation` 以及原因和路由 ID。记录描述了尝试：对于同一帖子，被拒绝的 `message` 事件之后仍可能会发生成功的 `app_mention` 事件。自我消息循环预防保持安静。

  </Accordion>

  <Accordion id="dm-messages-ignored" title="DM 消息被忽略">
    检查：

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy`（或旧版 `channels.slack.dm.policy`）
    - 配对审批 / allowlist 条目（`dmPolicy: "open"` 仍然需要 `channels.slack.allowFrom: ["*"]`）
    - group DM 使用 MPIM 处理；启用 `channels.slack.dm.groupEnabled`，如果已配置，则将 MPIM 包含在 `channels.slack.dm.groupChannels` 中
    - Slack Assistant DM 事件：提到 `drop message_changed` 的详细日志通常意味着 Slack 发送了一个编辑后的 Assistant 线程事件，但在消息元数据中没有可恢复的人类发送者

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion id="agent-view-dms-share-one-session" title="Agent View DM 共享一个会话">
    症状：应用程序的 **Messages** 选项卡中的每条顶级消息都会落在同一会话（主会话或一个 `slack:direct:<userId>` 会话）上，而不是其自己的 `:thread:<rootTs>` 会话上，即使 Slack 将每条消息显示为其自己的线程也是如此。

    按以下顺序检查：

    - 清单使用 `features.agent_view` 和 `assistant:write` 并订阅 `app_context_changed`。仍在 `features.assistant_view` 上的应用程序改为获取助理视图线程，并且 Slack 一旦切换到代理视图就无法将应用程序移回。
    - 自安装应用程序以来，OpenClaw 已看到代理视图信号：打开应用程序的 **Messages** 选项卡一次，或从代理视图编辑器发送 DM。在详细日志中，代理视图应用程序预计打开的消息选项卡上的 `slack suggested prompts update failed for channel D...: internal_error` 会被视为证据。
    - 在HTTP模式下，网关自启动以来至少收到1个签名事件；日志中的 `slack app id <id> learned from signed event` 确认可以读取耐用标记。套接字模式在启动时从应用程序令牌读取应用程序 ID，因此不需要任何事件。
    - `Slack Agent View state failed to open`、`persist` 或 `load` 警告表示无法存储或读取耐用标记。在运行过程中已检测到的信号仍然适用。重新启动后，当 OpenClaw 成功读取存储的标记或检测到新信号时，代理视图将恢复。

    请参阅 [Agent 查看 DM](/channels/slack/threads-and-sessions#agent-view-dms)。

  </Accordion>

  <Accordion id="session-status-could-not-return-to-active" title="会话状态无法恢复为活动状态">
    此正常级别诊断意味着 Slack 接受了 `processing` 但拒绝了终端 `active` 更新。启用 [ 详细日志记录 ](/logging) 以检查 Slack API 故障。诊断不会更改现有的重试或清理行为。

    被拒绝或不受支持的 `processing` 写入不会触发此诊断。接受的 `active` 写入并不保证 Slack Desktop 已刷新其工作指示器。

  </Accordion>

  <Accordion id="socket-mode-not-connecting" title="Socket模式无法连接">
    验证 Slack 应用设置中的 bot + app tokens 和 Socket Mode 启用状态。 App-Level Token 需要 `connections:write`，并且 Bot User OAuth Token 必须属于与 app token 相同的 Slack app/workspace。

    如果 `openclaw channels status --probe --json` 显示 `botTokenStatus` 或 `appTokenStatus: "configured_unavailable"`，说明 Slack 账号已配置，但当前运行时无法解析基于 SecretRef 的值。

    类似 `slack socket mode failed to start; retry ...` 的日志表示可恢复的启动失败。缺少 scope、令牌被撤销以及无效认证则会立即失败。 `slack token mismatch ...` 日志意味着 bot token 和 app token 看起来属于不同的 Slack app；请修正 Slack app 凭据。

  </Accordion>

  <Accordion id="http-mode-not-receiving-events" title="HTTP模式不接收事件">
    验证：

    - 签名秘密
    - webhook 路径
    - Slack 请求 URL（事件 + 交互 + 斜线命令）
    - 每个 HTTP 账号唯一的 `webhookPath`
    - 公共 URL 终止 TLS 并将请求转发到 Gateway path
    - Slack app 的 `request_url` 路径必须与 `channels.slack.webhookPath` 完全匹配（默认 `/slack/events`）

    如果账号快照中出现 `signingSecretStatus: "configured_unavailable"`， 说明 HTTP 账号已配置，但当前运行时无法解析基于 SecretRef 的 signing secret。

    重复出现的 `slack: webhook path ... already registered` 日志意味着两个 HTTP 账号使用了相同的 `webhookPath`；请为每个账号分配不同的路径。

  </Accordion>

  <Accordion id="native-slash-commands-not-firing" title="Native/slash 命令未触发">
    确认你期望的是以下哪种模式：

    - 原生命令模式（`channels.slack.commands.native: true`），并且 Slack 中注册了匹配的 slash 命令
    - 或单一 slash 命令模式（`channels.slack.slashCommand.enabled: true`）

    Slack 不会自动创建或删除斜杠命令。 `commands.native: "auto"` 不启用 Slack 本机命令；使用 `true` 并在 Slack 应用程序中创建匹配命令。在 HTTP 模式下，每个 Slack 斜杠命令必须包含网关 URL。在套接字模式下，命令有效负载通过 websocket 到达，并且 Slack 忽略 `slash_commands[].url`。

    另外检查 `commands.allowFrom`（如果已配置）、DM 授权、 频道 allowlist 以及每个频道的 `users` 允许列表。频道 allowlist 中的 access-group 条目会自动解析。对于被阻止的 slash 命令发送者，Slack 会返回以下临时错误：

    - `This channel is not allowed.`
    - `You are not authorized to use this command here.`

  </Accordion>
</AccordionGroup>
