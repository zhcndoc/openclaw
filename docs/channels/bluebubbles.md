---
summary: "通过 BlueBubbles macOS 服务器使用 iMessage（REST 发送/接收、输入状态、表情反应、配对、高级操作）。"
read_when:
  - 设置 BlueBubbles 通道
  - 处理 webhook 配对问题
  - 在 macOS 上配置 iMessage
title: "BlueBubbles"
---

# BlueBubbles（macOS REST）

状态：一个通过 HTTP 与 BlueBubbles macOS 服务器通信的内置插件。**推荐用于 iMessage 集成**，因其比传统 imsg 通道提供更丰富的 API 且设置更简便。

## 概览

- 运行于 macOS，通过 BlueBubbles 辅助应用程序（[bluebubbles.app](https://bluebubbles.app)）。
- 推荐/测试环境：macOS Sequoia (15)。macOS Tahoe (26) 可用；但在 Tahoe 上编辑功能目前失效，群组图标更新可能显示成功但无法同步。
- OpenClaw 通过其 REST API 交互（`GET /api/v1/ping`，`POST /message/text`，`POST /chat/:id/*`）。
- 收到的消息通过 webhook 到达；发出回复、输入指示、已读回执和表情反应均通过 REST 调用完成。
- 附件与贴纸作为入站媒体处理（并在可能时向代理展示）。
- 配对/允许运行与其他通道相同机制（例如 `/channels/pairing`），通过 `channels.bluebubbles.allowFrom` + 配对码控制。
- 表情反应被作为系统事件展示，类似 Slack/Telegram，便于代理“提及”后再回复。
- 高级功能：编辑、撤回、回复线程、消息特效、群组管理。

## 快速开始

1. 在 Mac 上安装 BlueBubbles 服务器（按照 [bluebubbles.app/install](https://bluebubbles.app/install) 说明操作）。
2. 在 BlueBubbles 配置中启用 Web API 并设置密码。
3. 运行 `openclaw onboard` 选择 BlueBubbles，或手动配置：

   ```json5
   {
     channels: {
       bluebubbles: {
         enabled: true,
         serverUrl: "http://192.168.1.100:1234",
         password: "example-password",
         webhookPath: "/bluebubbles-webhook",
       },
     },
   }
   ```

4. 将 BlueBubbles 的 webhook 指向你的网关（示例：`https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`）。
5. 启动网关，网关会注册 webhook 处理程序并开始配对。

安全提示：

- 始终设置 webhook 密码。
- webhook 始终需要身份验证。OpenClaw 会拒绝未包含匹配 `channels.bluebubbles.password` 的密码或 GUID 的 BlueBubbles webhook 请求（例如 `?password=<password>` 或 `x-password`），无论是否是回环/代理拓扑。
- 密码身份验证在读取/解析完整 webhook 正文前完成。

## 保持 Messages.app 常驻（虚拟机 / 无头环境）

某些 macOS 虚拟机或常开环境可能导致 Messages.app 进入“空闲”状态（入站事件停止，直到应用被打开或前置）。简单解决方法是通过 AppleScript + LaunchAgent 每 5 分钟**唤醒 Messages**。

### 1) 保存 AppleScript

保存为：

- `~/Scripts/poke-messages.scpt`

示例脚本（无交互，不会抢焦点）：

```applescript
try
  tell application "Messages"
    if not running then
      launch
    end if

    -- 触发脚本接口，保持进程活跃。
    set _chatCount to (count of chats)
  end tell
on error
  -- 忽略临时性失败（首次运行提示、锁定会话等）。
end try
```

### 2) 安装 LaunchAgent

保存为：

- `~/Library/LaunchAgents/com.user.poke-messages.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>com.user.poke-messages</string>

    <key>ProgramArguments</key>
    <array>
      <string>/bin/bash</string>
      <string>-lc</string>
      <string>/usr/bin/osascript &quot;$HOME/Scripts/poke-messages.scpt&quot;</string>
    </array>

    <key>RunAtLoad</key>
    <true/>

    <key>StartInterval</key>
    <integer>300</integer>

    <key>StandardOutPath</key>
    <string>/tmp/poke-messages.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/poke-messages.err</string>
  </dict>
</plist>
```

注意事项：

- 该程序**每 300 秒运行一次**，且**登录时自动启动**。
- 第一次运行可能会触发 macOS **自动化**权限提示（`osascript` → Messages）。请在运行 LaunchAgent 的同一用户会话中批准。

加载它：

```bash
launchctl unload ~/Library/LaunchAgents/com.user.poke-messages.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/com.user.poke-messages.plist
```

## 引导配置

BlueBubbles 可在交互式引导中使用：

```
openclaw onboard
```

向导会提示输入：

- **服务器 URL**（必填）：BlueBubbles 服务器地址（例如 `http://192.168.1.100:1234`）
- **密码**（必填）：BlueBubbles 服务器设置中的 API 密码
- **Webhook 路径**（可选）：默认 `/bluebubbles-webhook`
- **私信策略**：配对、允许列表、开放或禁用
- **允许列表**：电话号码、邮箱或聊天目标

你也可以用 CLI 添加 BlueBubbles：

```
openclaw channels add bluebubbles --http-url http://192.168.1.100:1234 --password <password>
```

## 访问控制（私信 + 群聊）

私信：

- 默认：`channels.bluebubbles.dmPolicy = "pairing"`。
- 未知发送者会收到配对码；消息在批准前被忽略（码一小时后过期）。
- 通过以下方式批准：
  - `openclaw pairing list bluebubbles`
  - `openclaw pairing approve bluebubbles <CODE>`
- 配对是默认的令牌交换机制。详情见：[配对](/channels/pairing)

群组：

- `channels.bluebubbles.groupPolicy = open | allowlist | disabled`（默认：`allowlist`）。
- `channels.bluebubbles.groupAllowFrom` 控制设置为允许列表时谁可在群组中触发。

### 提及门控（群聊）

BlueBubbles 支持群聊的提及门控，符合 iMessage/WhatsApp 行为：

- 利用 `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）检测提及。
- 在群组启用 `requireMention` 时，代理仅在被提及时响应。
- 授权发送者的控制命令会绕过提及门控。

群组配置示例：

```json5
{
  channels: {
    bluebubbles: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15555550123"],
      groups: {
        "*": { requireMention: true }, // 所有群组默认开启
        "iMessage;-;chat123": { requireMention: false }, // 针对指定群组的覆盖
      },
    },
  },
}
```

### 命令门控

- 控制命令（如 `/config`、`/model`）需授权。
- 使用 `allowFrom` 和 `groupAllowFrom` 判定命令授权。
- 授权发送者即使未被提及，也可在群组中执行控制命令。

## 输入状态 + 已读回执

- **输入指示**：在回复生成前及期间自动发送。
- **已读回执**：受 `channels.bluebubbles.sendReadReceipts` 控制（默认：`true`）。
- **输入指示**：OpenClaw 发送输入开始事件；BlueBubbles 会在发送消息或超时后自动清除输入状态（手动通过 DELETE 停止不可靠）。

```json5
{
  channels: {
    bluebubbles: {
      sendReadReceipts: false, // 禁用已读回执
    },
  },
}
```

## 高级操作

启用此配置后，BlueBubbles 支持高级消息操作：

```json5
{
  channels: {
    bluebubbles: {
      actions: {
        reactions: true, // 表情反应（默认开启）
        edit: true, // 编辑发送的消息（macOS 13+，macOS 26 Tahoe 上坏了）
        unsend: true, // 撤回消息（macOS 13+）
        reply: true, // 通过消息 GUID 回复（线程）
        sendWithEffect: true, // iMessage 消息特效（撞击、大声等）
        renameGroup: true, // 重命名群聊
        setGroupIcon: true, // 设置群聊图标/头像（macOS 26 Tahoe 不稳定）
        addParticipant: true, // 添加群组成员
        removeParticipant: true, // 移除群组成员
        leaveGroup: true, // 离开群聊
        sendAttachment: true, // 发送附件/媒体
      },
    },
  },
}
```

可用操作：

- **react**：添加/移除表情反应（`messageId`、`emoji`、`remove`）
- **edit**：编辑已发送消息（`messageId`、`text`）
- **unsend**：撤回消息（`messageId`）
- **reply**：回复指定消息（`messageId`、`text`、`to`）
- **sendWithEffect**：发送带特效消息（`text`、`to`、`effectId`）
- **renameGroup**：重命名群聊（`chatGuid`、`displayName`）
- **setGroupIcon**：设置群聊图标/头像（`chatGuid`、`media`） — macOS 26 Tahoe 可能返回成功但实际不生效。
- **addParticipant**：添加群成员（`chatGuid`、`address`）
- **removeParticipant**：移除群成员（`chatGuid`、`address`）
- **leaveGroup**：离开群聊（`chatGuid`）
- **sendAttachment**：发送媒体/文件（`to`、`buffer`、`filename`、`asVoice`）
  - 语音备忘录：设置 `asVoice: true`，并以 **MP3** 或 **CAF** 格式音频发送为 iMessage 语音消息。BlueBubbles 发送前会将 MP3 转换为 CAF 格式。

### 消息 ID（短 ID 与完整 ID）

OpenClaw 可能展示_短_消息 ID（例如 `1`、`2`）以节省 token。

- `MessageSid` / `ReplyToId` 可能是短 ID。
- `MessageSidFull` / `ReplyToIdFull` 包含完整提供者 ID。
- 短 ID 仅内存有效，重启或缓存清除后失效。
- 操作接口支持短 ID 或完整 ID，但短 ID 失效时会报错。

建议对持久自动化和存储使用完整 ID：

- 模板中使用 `{{MessageSidFull}}`、`{{ReplyToIdFull}}`
- 上下文中入站负载含有 `MessageSidFull` / `ReplyToIdFull`

详情见 [配置](/gateway/configuration) 的模板变量。

## 分块流控制

控制回复是作为单条消息发送还是分块流式发送：

```json5
{
  channels: {
    bluebubbles: {
      blockStreaming: true, // 启用分块流（默认关闭）
    },
  },
}
```

## 媒体与限制

- 入站附件会被下载并存储在媒体缓存。
- 媒体大小限制通过 `channels.bluebubbles.mediaMaxMb` 控制（默认 8 MB）。
- 出站文本将被分块，块大小由 `channels.bluebubbles.textChunkLimit` 控制（默认 4000 字符）。

## 配置参考

完整配置见：[配置](/gateway/configuration)

提供者选项：

- `channels.bluebubbles.enabled`：启用/禁用该通道。
- `channels.bluebubbles.serverUrl`：BlueBubbles REST API 基础 URL。
- `channels.bluebubbles.password`：API 密码。
- `channels.bluebubbles.webhookPath`：Webhook 端点路径（默认 `/bluebubbles-webhook`）。
- `channels.bluebubbles.dmPolicy`：`pairing | allowlist | open | disabled`（默认：`pairing`）。
- `channels.bluebubbles.allowFrom`：私信允许列表（句柄、邮箱、E.164 号码、`chat_id:*`、`chat_guid:*`）。
- `channels.bluebubbles.groupPolicy`：`open | allowlist | disabled`（默认：`allowlist`）。
- `channels.bluebubbles.groupAllowFrom`：群组发送者允许列表。
- `channels.bluebubbles.groups`：按群组配置（`requireMention` 等）。
- `channels.bluebubbles.sendReadReceipts`：是否发送已读回执（默认：`true`）。
- `channels.bluebubbles.blockStreaming`：启用分块流（默认：`false`，流式回复时必需）。
- `channels.bluebubbles.textChunkLimit`：出站分块大小（字符数，默认 4000）。
- `channels.bluebubbles.chunkMode`：`length`（默认）仅当超限时分块；`newline` 在空行（段落边界）处分块，随后再按长度限制。
- `channels.bluebubbles.mediaMaxMb`：入站媒体大小限制（MB，默认 8）。
- `channels.bluebubbles.mediaLocalRoots`：明确允许的本地绝对目录列表，限制出站本地媒体路径。默认拒绝未配置的本地路径传送。可针对账号覆盖：`channels.bluebubbles.accounts.<accountId>.mediaLocalRoots`。
- `channels.bluebubbles.historyLimit`：群聊上下文最大消息数（0 表示禁用）。
- `channels.bluebubbles.dmHistoryLimit`：私信历史限制。
- `channels.bluebubbles.actions`：启用/禁用具体操作。
- `channels.bluebubbles.accounts`：多账号配置。

相关全局选项：

- `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）。
- `messages.responsePrefix`。

## 地址与投递目标

优先使用 `chat_guid` 以实现稳定路由：

- `chat_guid:iMessage;-;+15555550123`（群组推荐）
- `chat_id:123`
- `chat_identifier:...`
- 直接句柄：`+15555550123`、`user@example.com`
  - 如果直接句柄尚无 DM 聊天，OpenClaw 会通过 `POST /api/v1/chat/new` 创建（需启用 BlueBubbles 私有 API）。

## 安全性

- webhook 请求通过比对请求中的 `guid`/`password` 查询参数或头部 与 `channels.bluebubbles.password` 认证。来自 `localhost` 的请求也被接受。
- 请妥善保管 API 密码和 webhook 端点，视为凭证。
- localhost 信任意味着同主机的反向代理可能无意间绕过密码验证。若使用代理网关，请在代理端启用认证，并配置 `gateway.trustedProxies`。详见 [网关安全](/gateway/security#reverse-proxy-configuration)。
- 如需将 BlueBubbles 服务暴露于局域网外，请在服务器上启用 HTTPS 和防火墙策略。

## 故障排查

- 输入/已读事件停止工作时，检查 BlueBubbles webhook 日志，确认网关路径与 `channels.bluebubbles.webhookPath` 相符。
- 配对码一小时后过期；执行 `openclaw pairing list bluebubbles` 和 `openclaw pairing approve bluebubbles <code>`。
- 表情反应依赖 BlueBubbles 私有 API (`POST /api/v1/message/react`)，确保服务器版本支持。
- 编辑/撤回需 macOS 13 及以上，且兼容 BlueBubbles 版本。macOS 26（Tahoe）由于私有 API 变更导致编辑功能失效。
- macOS 26（Tahoe）群组头像更新不稳定：API 可能返回成功，但新图标不同步。
- OpenClaw 根据 BlueBubbles 服务器 macOS 版本自动隐藏已知失效的操作。如 macOS 26 (Tahoe) 仍显示编辑，请通过配置禁用：`channels.bluebubbles.actions.edit=false`。
- 查看状态/健康信息使用：`openclaw status --all` 或 `openclaw status --deep`。

更多通道工作流参考，见 [通道](/channels) 和 [插件](/tools/plugin) 指南。
