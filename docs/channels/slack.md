---
summary: "Slack 设置及运行时行为（Socket 模式 + HTTP 事件 API）"
read_when:
  - 设置 Slack 或调试 Slack 套接字/HTTP 模式
title: "Slack"
---

# Slack

状态：适用于 Slack 应用集成中的私信和频道，已具备生产就绪能力。默认模式为 Socket 模式；同时支持 HTTP 事件 API 模式。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/channels/pairing">
    Slack 私信默认使用配对模式。
  </Card>
  <Card title="斜线命令" icon="terminal" href="/tools/slash-commands">
    原生命令行为及命令目录。
  </Card>
  <Card title="频道故障排除" icon="wrench" href="/channels/troubleshooting">
    跨频道诊断与修复操作手册。
  </Card>
</CardGroup>

## 快速设置

<Tabs>
  <Tab title="Socket 模式（默认）">
    <Steps>
      <Step title="创建 Slack 应用和令牌">
        在 Slack 应用设置中：

        - 启用 **Socket 模式**
        - 创建带有 `connections:write` 权限的 **应用令牌** (`xapp-...`)
        - 安装应用并复制 **机器人令牌** (`xoxb-...`)
      </Step>

      <Step title="配置 OpenClaw">

```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "socket",
      appToken: "xapp-...",
      botToken: "xoxb-...",
    },
  },
}
```

        环境变量回退（仅默认账户）：

```bash
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_TOKEN=xoxb-...
```

      </Step>

      <Step title="订阅应用事件">
        订阅机器人事件：

        - `app_mention`
        - `message.channels`, `message.groups`, `message.im`, `message.mpim`
        - `reaction_added`, `reaction_removed`
        - `member_joined_channel`, `member_left_channel`
        - `channel_rename`
        - `pin_added`, `pin_removed`

        并启用应用首页的 **消息标签页**，以支持私信。
      </Step>

      <Step title="启动网关">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>

  <Tab title="HTTP 事件 API 模式">
    <Steps>
      <Step title="为 HTTP 配置 Slack 应用">

        - 将模式设置为 HTTP (`channels.slack.mode="http"`)
        - 复制 Slack **签名密钥**
        - 将事件订阅、交互和斜线命令的请求 URL 统一设置为相同的 webhook 路径（默认 `/slack/events`）

      </Step>

      <Step title="配置 OpenClaw HTTP 模式">

```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "http",
      botToken: "xoxb-...",
      signingSecret: "your-signing-secret",
      webhookPath: "/slack/events",
    },
  },
}
```

      </Step>

      <Step title="多账户 HTTP 使用唯一 webhook 路径">
        支持按账户区分的 HTTP 模式。

        每个账户应配置不同的 `webhookPath`，避免注册冲突。
      </Step>
    </Steps>

  </Tab>
</Tabs>

## 令牌模型

- Socket 模式需要 `botToken` + `appToken`。
- HTTP 模式需要 `botToken` + `signingSecret`。
- 配置中的令牌优先于环境变量回退。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` 环境变量仅对默认账户生效。
- `userToken` (`xoxp-...`) 仅支持配置，且没有环境变量回退，默认只读行为 (`userTokenReadOnly: true`)。
- 可选：如需让外发消息使用当前代理身份（自定义 `username` 和头像），可额外添加 `chat:write.customize` 权限。`icon_emoji` 采用 `:emoji_name:` 格式。

<Tip>
对于操作和目录读取，可优先使用用户令牌（若配置）。写入时，仍以机器人令牌优先；仅当 `userTokenReadOnly: false` 且无机器人令牌时，允许使用用户令牌写入。
</Tip>

## 访问控制与路由

<Tabs>
  <Tab title="私信策略">
    `channels.slack.dmPolicy` 控制私信访问策略（旧版：`channels.slack.dm.policy`）：

    - `pairing`（默认）
    - `allowlist`
    - `open`（需 `channels.slack.allowFrom` 包含 `"*"`；旧版：`channels.slack.dm.allowFrom`）
    - `disabled`

    私信相关标志：

    - `dm.enabled`（默认 `true`）
    - `channels.slack.allowFrom`（推荐使用）
    - `dm.allowFrom`（旧版）
    - `dm.groupEnabled`（群组私信默认 `false`）
    - `dm.groupChannels`（可选 MPIM 白名单）

    多账户优先级规则：

    - `channels.slack.accounts.default.allowFrom` 只对默认账户生效。
    - 命名账户若未设置 `allowFrom`，会继承 `channels.slack.allowFrom`。
    - 命名账户不会继承 `channels.slack.accounts.default.allowFrom`。

    私信配对使用命令：`openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="频道策略">
    `channels.slack.groupPolicy` 控制频道处理策略：

    - `open`
    - `allowlist`
    - `disabled`

    频道白名单配置在 `channels.slack.channels` 下。

    运行时提示：若完全缺少 `channels.slack` 配置（仅环境变量设置），运行时默认使用 `groupPolicy="allowlist"` 并发出警告（即使设置了 `channels.defaults.groupPolicy`）。

    名称/ID 解析：

    - 各频道和私信白名单条目在启动时基于令牌权限解析
    - 未能解析的条目保持原配置
    - 默认的入站授权匹配以 ID 优先；若需要直接按用户名/别名匹配，需设置 `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="提及及频道用户">
    频道消息默认需要提及触发。

    提及来源：

    - 显式 @应用（`<@botId>`）
    - 正则提及模式（`agents.list[].groupChat.mentionPatterns`；回退到 `messages.groupChat.mentionPatterns`）
    - 隐式回复给机器人线程行为

    每频道控制项（`channels.slack.channels.<id|name>`）：

    - `requireMention`
    - `users`（白名单）
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`、`toolsBySender`
    - `toolsBySender` 键格式：`id:`、`e164:`、`username:`、`name:` 或通配符 `"*"`
      （旧版无前缀键仅映射为 `id:`）

  </Tab>
</Tabs>

## 命令和斜线命令行为

- Slack 默认关闭原生命令自动模式（`commands.native: "auto"` 不启用 Slack 原生命令）。
- 通过 `channels.slack.commands.native: true`（或全局 `commands.native: true`）启用 Slack 原生命令处理。
- 开启原生命令后，需在 Slack 注册对应斜线命令(`/<command>`)；仅有一例外：
  - 状态命令注册为 `/agentstatus`（Slack 保留 `/status`）
- 未启用原生命令时，可通过 `channels.slack.slashCommand` 配置单一斜线命令。
- 原生参数菜单的渲染方式动态调整：
  - 不超过 5 选项时使用按钮块
  - 6~100 选项时使用静态选择菜单
  - 超过 100 选项时启用外部选择，具备异步选项过滤（当交互选项处理器可用）
  - 若编码后选项超出 Slack 限制，回退至按钮模式
- 斜线命令的长选项参数菜单，在提交前采用确认对话框。

斜线命令默认配置：

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

斜线命令会话使用隔离键：

- `agent:<agentId>:slack:slash:<userId>`

且仍依据目标会话 (`CommandTargetSessionKey`) 路由命令执行。

## 线程、会话和回复标签

- 私信路由为 `direct`；频道为 `channel`；多方私信（MPIM）为 `group`。
- 默认 `session.dmScope=main` 时，Slack 私信会合并到代理主会话。
- 频道会话格式：`agent:<agentId>:slack:channel:<channelId>`。
- 线程回复可附加线程会话后缀（`:thread:<threadTs>`），如果适用。
- `channels.slack.thread.historyScope` 默认值为 `thread`；`thread.inheritParent` 默认 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制新线程会话启动时预抓取的线程消息数（默认 `20`；设置为 `0` 禁用）。

回复线程控制：

- `channels.slack.replyToMode`：`off|first|all`（默认 `off`）
- `channels.slack.replyToModeByChatType`：针对 `direct|group|channel` 分别设置
- 私信的旧版回退字段：`channels.slack.dm.replyToMode`

支持手动回复标签：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

注意：`replyToMode="off"` 会禁用 Slack 内 **所有** 回复线程行为，包含显式 `[[reply_to_*]]` 标签。此行为不同于 Telegram，在 Telegram 中即使禁用，显式标签仍会生效。差异因平台的线程模型不同：Slack 线程会隐藏对应消息；而 Telegram 回复依然显示在主聊天流。

## 媒体、分块及发送

<AccordionGroup>
  <Accordion title="入站附件">
    Slack 文件附件从 Slack 托管的私有 URL 下载（需要令牌认证请求流程），如下载成功且大小许可，则写入媒体存储。

    默认入站大小上限为 `20MB`，可通过 `channels.slack.mediaMaxMb` 覆盖。

  </Accordion>

  <Accordion title="出站文本和文件">
    - 文本分块依据 `channels.slack.textChunkLimit`（默认 4000 字符）
    - `channels.slack.chunkMode="newline"` 启用优先按段落分割
    - 文件发送调用 Slack 上传 API，可包含线程回复参数（`thread_ts`）
    - 出站媒体大小上限遵循 `channels.slack.mediaMaxMb`（若配置）；否则使用媒体管道默认 MIME 类型限制
  </Accordion>

  <Accordion title="发送目标">
    优选显式目标：

    - 私信用 `user:<id>`
    - 频道用 `channel:<id>`

    发送至用户目标时，客户端通过 Slack 会话 API 打开私信窗口。

  </Accordion>
</AccordionGroup>

## 操作与门控

Slack 操作由 `channels.slack.actions.*` 控制。

当前 Slack 工具中可用的操作组：

| 组名       | 默认状态 |
| ---------- | -------- |
| messages   | 启用     |
| reactions  | 启用     |
| pins       | 启用     |
| memberInfo | 启用     |
| emojiList  | 启用     |

## 事件与运行行为

- 消息编辑/删除/线程广播映射为系统事件。
- 表情添加/删除事件映射为系统事件。
- 成员加入/离开、频道创建/重命名、固定消息添加/删除事件映射为系统事件。
- 助理线程状态更新（线程中“正在输入...”指示），使用 `assistant.threads.setStatus`，需机器人权限 `assistant:write`。
- `channel_id_changed` 事件可在启用配置写入时迁移频道配置键。
- 频道话题/目的元数据视为不可信上下文，可注入路由上下文。
- 块操作及模态交互产生结构化的 `Slack interaction: ...` 系统事件，含丰富负载字段：
  - 块操作：选中的值、标签、选择器值及 `workflow_*` 元数据
  - 模态的 `view_submission` 和 `view_closed` 事件携带路由频道元数据和表单输入

## 确认表情

`ackReaction` 在 OpenClaw 处理入站消息时发送确认表情。

解析优先级：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- 代理身份表情回退（`agents.list[].identity.emoji`，否则为 "👀"）

注意：

- Slack 期望使用表情简码（例如 `"eyes"`）。
- 设为空字符串 `""` 可禁用对应 Slack 账户或全局的确认表情。

## 输入状态表情回退

`typingReaction` 在 OpenClaw 处理中，为入站 Slack 消息添加临时表情，处理完成后移除。该功能是 Slack 本地助理输入态不可用时的有效替代，尤其适用于私信。

解析优先级：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

注意：

- Slack 期望使用表情简码（如 `"hourglass_flowing_sand"`）。
- 该表情为尽力添加且自动清理，发送回复或异常路径完成后尝试移除。

## 清单与权限范围核对清单

<AccordionGroup>
  <Accordion title="Slack 应用清单示例">

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "OpenClaw 的 Slack 连接器"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw",
      "always_online": false
    },
    "app_home": {
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "发送消息给 OpenClaw",
        "should_escape": false
      }
    ]
  },
  "oauth_config": {
    "scopes": {
      "bot": [
        "chat:write",
        "channels:history",
        "channels:read",
        "groups:history",
        "im:history",
        "im:read",
        "im:write",
        "mpim:history",
        "mpim:read",
        "mpim:write",
        "users:read",
        "app_mentions:read",
        "assistant:write",
        "reactions:read",
        "reactions:write",
        "pins:read",
        "pins:write",
        "emoji:read",
        "commands",
        "files:read",
        "files:write"
      ]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": [
        "app_mention",
        "message.channels",
        "message.groups",
        "message.im",
        "message.mpim",
        "reaction_added",
        "reaction_removed",
        "member_joined_channel",
        "member_left_channel",
        "channel_rename",
        "pin_added",
        "pin_removed"
      ]
    }
  }
}
```

  </Accordion>

  <Accordion title="可选的用户令牌权限范围（读取操作）">
    若配置了 `channels.slack.userToken`，常见读取权限包括：

    - `channels:history`、`groups:history`、`im:history`、`mpim:history`
    - `channels:read`、`groups:read`、`im:read`、`mpim:read`
    - `users:read`
    - `reactions:read`
    - `pins:read`
    - `emoji:read`
    - `search:read`（如果依赖 Slack 搜索读取）

  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="频道内无回复">
    按顺序检查：

    - `groupPolicy`
    - 频道白名单 (`channels.slack.channels`)
    - `requireMention`
    - 每频道的 `users` 白名单

    有用命令：

```bash
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

  </Accordion>

  <Accordion title="私信消息被忽略">
    检查：

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy`（或旧版 `channels.slack.dm.policy`）
    - 配对授权 / 白名单条目

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket 模式无法连接">
    验证机器人令牌、应用令牌及 Slack 应用设置中的 Socket 模式启用情况。
  </Accordion>

  <Accordion title="HTTP 模式未收到事件">
    验证：

    - 签名密钥
    - webhook 路径
    - Slack 请求 URL（事件订阅 + 交互 + 斜线命令）
    - HTTP 模式下每个账户的唯一 `webhookPath`

  </Accordion>

  <Accordion title="原生/斜线命令未触发">
    核实是否：

    - 开启了原生命令模式（`channels.slack.commands.native: true`）并在 Slack 注册了相应斜线命令
    - 或启用了单一斜线命令模式（`channels.slack.slashCommand.enabled: true`）

    同时检查 `commands.useAccessGroups` 及频道/用户白名单设置。

  </Accordion>
</AccordionGroup>

## 文本流式传输

OpenClaw 支持通过 Slack 代理和 AI 应用 API 的原生文本流式传输。

`channels.slack.streaming` 控制实时预览行为：

- `off`：禁用实时预览流式传输。
- `partial`（默认）：用最新部分输出替换预览文本。
- `block`：追加分块预览更新。
- `progress`：生成过程中显示进度状态文本，结束后发送最终文本。

`channels.slack.nativeStreaming` 控制 Slack 的原生流式 API（`chat.startStream` / `chat.appendStream` / `chat.stopStream`），仅当 `streaming` 为 `partial` 时生效（默认 `true`）。

禁用 Slack 原生流式（保留草稿预览行为）示例：

```yaml
channels:
  slack:
    streaming: partial
    nativeStreaming: false
```

旧版字段说明：

- `channels.slack.streamMode`（`replace | status_final | append`）会自动迁移到 `channels.slack.streaming`。
- 布尔类型的 `channels.slack.streaming` 会自动迁移到 `channels.slack.nativeStreaming`。

### 要求

1. 在 Slack 应用设置中启用 **代理和 AI 应用** 功能。
2. 确保应用具备 `assistant:write` 权限。
3. 回复消息必须处于线程中。线程选择依然遵循 `replyToMode`。

### 行为

- 首个文本块启动流式接口（`chat.startStream`）。
- 后续文本块追加到同一流（`chat.appendStream`）。
- 回复结束时终止流（`chat.stopStream`）。
- 媒体和非文本负载回落为普通发送方式。
- 若流式过程中失败，OpenClaw 对剩余负载改用默认发送。

## 配置参考指引

主要参考：

- [配置参考 - Slack](/gateway/configuration-reference#slack)

  关键 Slack 字段：
  - 模式/身份认证：`mode`，`botToken`，`appToken`，`signingSecret`，`webhookPath`，`accounts.*`
  - 私信访问权限：`dm.enabled`，`dmPolicy`，`allowFrom`（旧版：`dm.policy`，`dm.allowFrom`），`dm.groupEnabled`，`dm.groupChannels`
  - 兼容性开关：`dangerouslyAllowNameMatching`（危险开关，非必需时保持关闭）
  - 频道访问：`groupPolicy`，`channels.*`，`channels.*.users`，`channels.*.requireMention`
  - 线程/历史：`replyToMode`，`replyToModeByChatType`，`thread.*`，`historyLimit`，`dmHistoryLimit`，`dms.*.historyLimit`
  - 发送能力：`textChunkLimit`，`chunkMode`，`mediaMaxMb`，`streaming`，`nativeStreaming`
  - 运营/功能：`configWrites`，`commands.native`，`slashCommand.*`，`actions.*`，`userToken`，`userTokenReadOnly`

## 相关内容

- [配对](/channels/pairing)
- [频道路由](/channels/channel-routing)
- [故障排除](/channels/troubleshooting)
- [配置](/gateway/configuration)
- [斜线命令](/tools/slash-commands)
