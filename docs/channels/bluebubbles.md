---
summary: "通过 BlueBubbles macOS 服务器使用 iMessage（REST 发送/接收、输入状态、表情反应、配对、高级操作）。"
read_when:
  - 设置 BlueBubbles 通道
  - 处理 webhook 配对问题
  - 在 macOS 上配置 iMessage
title: "BlueBubbles"
---

Status: 捆绑的插件，通过 HTTP 与 BlueBubbles macOS 服务器通信。由于其更丰富的 API 和更易的设置，相比旧版 imsg 通道，**推荐用于 iMessage 集成**。

## 内置插件

当前的 OpenClaw 发布版本已捆绑 BlueBubbles，因此正常的打包构建不需要单独的 `openclaw plugins install` 步骤。

## 概述

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
- **私信政策**：配对、允许列表、开放或禁用
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

### 联系人名称补充（macOS，可选）

BlueBubbles 群组 webhook 通常只包含原始的参与者地址。如果你希望 `GroupMembers` 上下文显示本地联系人名称而不是原始地址，可以在 macOS 上选择启用本地联系人补充：

- `channels.bluebubbles.enrichGroupParticipantsFromContacts = true` 启用查找。默认：`false`。
- 查找仅在群组访问、命令授权和提及门控允许消息通过后运行。
- 仅补充未命名的电话参与者。
- 当未找到本地匹配项时，原始电话号码将作为回退保留。

```json5
{
  channels: {
    bluebubbles: {
      enrichGroupParticipantsFromContacts: true,
    },
  },
}
```

### 提及门控（群组）

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

### 每个群组的 system prompt

`channels.bluebubbles.groups.*` 下的每个条目都可接受一个可选的 `systemPrompt` 字符串。该值会在处理该群组消息的每一轮中注入到代理的系统提示词中，因此你可以为不同群组设置独立的人设或行为规则，而无需编辑代理提示词：

```json5
{
  channels: {
    bluebubbles: {
      groups: {
        "iMessage;-;chat123": {
          systemPrompt: "将回复控制在 3 句以内。模仿群组的轻松语气。",
        },
      },
    },
  },
}
```

该键会匹配 BlueBubbles 对该群组报告的 `chatGuid` / `chatIdentifier` / 数字 `chatId`；而 `"*"` 通配符条目会为没有精确匹配的每个群组提供默认值（与 `requireMention` 和按群组工具策略使用的模式相同）。精确匹配始终优先于通配符。私信会忽略此字段；请改用代理级或账户级的提示词定制。

#### 实际示例：线程回复与 tapback 反应（私有 API）

启用 BlueBubbles Private API 后，入站消息会带有短消息 ID（例如 `[[reply_to:5]]`），代理可以调用 `action=reply` 将回复线程化到特定消息，或调用 `action=react` 添加 tapback。按群组设置的 `systemPrompt` 是一种可靠方式，可帮助代理选择正确工具：

```json5
{
  channels: {
    bluebubbles: {
      groups: {
        "iMessage;+;chat-family": {
          systemPrompt: [
            "在这个群组中回复时，始终使用",
            "上下文中的 [[reply_to:N]] messageId 调用 action=reply，",
            "这样你的回复会线程化到触发消息下方。",
            "不要发送新的未关联消息。",
            "",
            "对于简短确认（'ok'、'收到'、'在做了'），请使用",
            "action=react 并选择合适的 tapback 表情（❤️、👍、😂、‼️、❓），",
            "而不是发送文本回复。",
          ].join(" "),
        },
      },
    },
  },
}
```

tapback 反应和线程回复都需要 BlueBubbles Private API；底层机制见 [高级操作](#高级操作) 和 [消息 ID（短 ID 与完整 ID）](#消息-id短-id-与完整-id)。

## ACP 会话绑定

BlueBubbles 聊天可以转换为持久的 ACP 工作区，无需更改传输层。

快速操作员流程：

- 在私信或允许的群聊中运行 `/acp spawn codex --bind here`。
- 该 BlueBubbles 对话中的未来消息将路由到生成的 ACP 会话。
- `/new` 和 `/reset` 就地重置同一个绑定的 ACP 会话。
- `/acp close` 关闭 ACP 会话并移除绑定。

也可以通过顶层 `bindings[]` 条目配置持久绑定，设置 `type: "acp"` 和 `match.channel: "bluebubbles"`。

`match.peer.id` 可以使用任何支持的 BlueBubbles 目标形式：

- 标准化的私信句柄，例如 `+15555550123` 或 `user@example.com`
- `chat_id:<id>`
- `chat_guid:<guid>`
- `chat_identifier:<identifier>`

对于稳定的群组绑定，建议使用 `chat_id:*` 或 `chat_identifier:*`。

示例：

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: { agent: "codex", backend: "acpx", mode: "persistent" },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "bluebubbles",
        accountId: "default",
        peer: { kind: "dm", id: "+15555550123" },
      },
      acp: { label: "codex-imessage" },
    },
  ],
}
```

参见 [ACP 代理](/tools/acp-agents) 了解共享 ACP 绑定行为。

## 输入指示 + 已读回执

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

- **react**: 添加/移除 tapback 反应（`messageId`、`emoji`、`remove`）。iMessage 原生 tapback 集合为 `love`、`like`、`dislike`、`laugh`、`emphasize` 和 `question`。当代理选择了该集合之外的 emoji（例如 `👀`）时，反应工具会回退为 `love`，以便 tapback 仍能正常显示，而不会导致整个请求失败。已配置的确认反应仍会严格校验，且对未知值报错。
- **edit**: 编辑已发送的消息（`messageId`、`text`）
- **unsend**: 撤回消息（`messageId`）
- **reply**: 回复特定消息（`messageId`、`text`、`to`）
- **sendWithEffect**: 以 iMessage 特效发送（`text`、`to`、`effectId`）
- **renameGroup**: 重命名群聊（`chatGuid`、`displayName`）
- **setGroupIcon**: 设置群聊图标/头像（`chatGuid`、`media`）—— 在 macOS 26 Tahoe 上不稳定（API 可能返回成功，但图标不会同步）。
- **addParticipant**: 向群组中添加成员（`chatGuid`、`address`）
- **removeParticipant**: 从群组中移除成员（`chatGuid`、`address`）
- **leaveGroup**: 离开群聊（`chatGuid`）
- **upload-file**: 发送媒体/文件（`to`、`buffer`、`filename`、`asVoice`）
  - 语音备忘录：将 `asVoice: true` 与 **MP3** 或 **CAF** 音频一起使用，可作为 iMessage 语音消息发送。BlueBubbles 在发送语音备忘录时会将 MP3 转换为 CAF。
- 旧别名：`sendAttachment` 仍然可用，但 `upload-file` 是规范的操作名称。

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

<a id="coalescing-split-send-dms-command--url-in-one-composition"></a>

## 合并同一发送者拆分发送的 DM（命令 + URL 同一条输入）

当用户在 iMessage 中同时输入命令和 URL——例如 `Dump https://example.com/article`——Apple 会把发送拆分为**两个独立的 webhook 投递**：

1. 一条文本消息（`"Dump"`）。
2. 一条 URL 预览气泡（`"https://..."`），并附带 OG 预览图片作为附件。

在大多数配置下，这两个 webhook 会在 OpenClaw 中相隔约 0.8-2.0 秒到达。若不进行合并，agent 会在第 1 轮只收到命令本身并作出回复（通常是“把 URL 发给我”），随后才在第 2 轮看到 URL——此时命令上下文已经丢失。

`channels.bluebubbles.coalesceSameSenderDms` 会让某个 DM 启用将同一发送者连续发出的 webhook 合并为一次 agent 回合。群聊则继续按单条消息作为键，因此可以保留多用户的回合结构。

### 何时启用

在以下情况启用：

- 你的技能期望 `command + payload` 以一条消息的形式出现（dump、paste、save、queue 等）。
- 用户会在命令旁边粘贴 URL、图片或长内容。
- 你可以接受额外的 DM 回合延迟（见下文）。

在以下情况保持禁用：

- 你需要单词级 DM 触发器的最低命令延迟。
- 你的所有流程都是不带后续 payload 的一次性命令。

### 启用

```json5
{
  channels: {
    bluebubbles: {
      coalesceSameSenderDms: true, // 选择启用（默认：false）
    },
  },
}
```

开启该标志且未显式设置 `messages.inbound.byChannel.bluebubbles` 时，去抖窗口会扩大到 **2500 ms**（非合并模式下的默认值为 500 ms）。这个更大的窗口是必需的——Apple 的拆分发送节奏为 0.8-2.0 秒，无法容纳在更紧的默认值内。

如需自行调整窗口：

```json5
{
  messages: {
    inbound: {
      byChannel: {
        // 2500 ms 适用于大多数配置；如果你的 Mac 很慢
        // 或者内存压力较大，可提高到 4000 ms（此时观察到的间隔可能会超过 2 s）。
        bluebubbles: 2500,
      },
    },
  },
}
```

### 权衡

- **DM 控制命令的延迟增加。** 开启该标志后，DM 控制命令消息（如 `Dump`、`Save` 等）会在派发前最多等待去抖窗口，以防后续还有 payload webhook 到来。群聊命令仍会立即派发。
- **合并后的输出有上限**——合并文本最多 4000 字符，并带有明确的 `…[truncated]` 标记；附件最多 20 个；源条目最多 10 个（超过后保留第一个和最新的）。每个源 `messageId` 仍会进入 inbound-dedupe，因此稍后 MessagePoller 重放任一单独事件时会被识别为重复。
- **按通道单独启用。** 其他通道（Telegram、WhatsApp、Slack 等）不受影响。

### 场景与 agent 看到的内容

| 用户输入                                                     | Apple 投递                   | 关闭标志（默认）                           | 开启标志 + 2500 ms 窗口                                           |
| ------------------------------------------------------------ | ---------------------------- | ------------------------------------------ | ------------------------------------------------------------------ |
| `Dump https://example.com`（一次发送）                        | 2 个 webhook，相隔约 1 s     | 两个 agent 回合：“Dump” 单独出现，然后是 URL | 一次回合：合并后的文本 `Dump https://example.com`                 |
| `Save this 📎image.jpg caption`（附件 + 文本）                 | 2 个 webhook                 | 两个回合                                   | 一次回合：文本 + 图片                                               |
| `/status`（独立命令）                                        | 1 个 webhook                 | 立即派发                                   | **最多等待一个窗口，然后派发**                                      |
| 单独粘贴 URL                                                 | 1 个 webhook                 | 立即派发                                   | 立即派发（桶里只有一条记录）                                       |
| 文本 + URL 被故意分成两条独立消息发送，间隔几分钟            | 2 个窗口外的 webhook         | 两个回合                                   | 两个回合（窗口之间已过期）                                         |
| 短时间内快速洪泛（窗口内超过 10 条小 DM）                     | N 个 webhook                 | N 个回合                                   | 一次回合，输出受限（保留首条 + 最新条，并应用文本/附件上限）        |

### 拆分发送合并排障

如果标志已开启但拆分发送仍然分成两个回合，请逐层检查：

1. **配置是否 वास्तव载入。**

   ```
   grep coalesceSameSenderDms ~/.openclaw/openclaw.json
   ```

   然后执行 `openclaw gateway restart` —— 该标志是在 debouncer-registry 创建时读取的。

2. **去抖窗口是否足够大，能覆盖你的环境。** 查看 BlueBubbles 服务器日志 `~/Library/Logs/bluebubbles-server/main.log`：

   ```
   grep -E "Dispatching event to webhook" main.log | tail -20
   ```

   测量 `"Dump"` 这类文本派发与其后出现的 `"https://..."; Attachments:` 派发之间的间隔。将 `messages.inbound.byChannel.bluebubbles` 调大到足以稳定覆盖该间隔。

3. **Session JSONL 时间戳 ≠ webhook 到达时间。** Session 事件时间戳（`~/.openclaw/agents/<id>/sessions/*.jsonl`）反映的是 gateway 把消息交给 agent 的时间，**不是** webhook 到达的时间。若队列中的第二条消息带有 `[Queued messages while agent was busy]` 标记，说明第一轮仍在运行时第二个 webhook 就已到达——此时合并桶已经刷新。应以 BB 服务器日志而不是 session 日志来调整窗口。

4. **内存压力会拖慢回复派发。** 在较小的机器（8 GB）上，agent 回合可能耗时足够长，导致合并桶在回复完成前就已刷新，而 URL 以排队的第二轮形式到达。检查 `memory_pressure` 和 `ps -o rss -p $(pgrep openclaw-gateway)`；如果 gateway 的 RSS 超过约 500 MB 且压缩器处于活动状态，请关闭其他重型进程或升级到更大的主机。

5. **回复引用发送是另一条路径。** 如果用户把 `Dump` 作为对现有 URL 气泡的**回复**来发送（iMessage 会在 Dump 气泡上显示 “1 Reply” 徽标），URL 位于 `replyToBody` 中，而不是第二个 webhook 里。此时不会应用合并处理——这是技能/提示词层面的事，而不是去抖器层面的事。

## 块流式输出

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

- 入站附件会被下载并存储在媒体缓存中。
- 媒体大小限制通过 `channels.bluebubbles.mediaMaxMb` 控制（默认 8 MB）。
- 出站文本会被分块，块大小由 `channels.bluebubbles.textChunkLimit` 控制（默认 4000 字符）。

## 配置参考

完整配置见：[配置](/gateway/configuration)

提供者选项：

- `channels.bluebubbles.enabled`: 启用/禁用该通道。
- `channels.bluebubbles.serverUrl`: BlueBubbles REST API 基础 URL。
- `channels.bluebubbles.password`: API 密码。
- `channels.bluebubbles.webhookPath`: Webhook 端点路径（默认：`/bluebubbles-webhook`）。
- `channels.bluebubbles.dmPolicy`: `pairing | allowlist | open | disabled`（默认：`pairing`）。
- `channels.bluebubbles.allowFrom`: DM 白名单（handles、emails、E.164 numbers、`chat_id:*`、`chat_guid:*`）。
- `channels.bluebubbles.groupPolicy`: `open | allowlist | disabled`（默认：`allowlist`）。
- `channels.bluebubbles.groupAllowFrom`: 群聊发送者白名单。
- `channels.bluebubbles.enrichGroupParticipantsFromContacts`: 在 macOS 上，可在通过 gating 后，使用本地通讯录补全未命名的群成员。默认：`false`。
- `channels.bluebubbles.groups`: 每个群的配置（`requireMention` 等）。
- `channels.bluebubbles.sendReadReceipts`: 发送已读回执（默认：`true`）。
- `channels.bluebubbles.blockStreaming`: 启用块流式输出（默认：`false`；流式回复需要此项）。
- `channels.bluebubbles.textChunkLimit`: 出站分块大小，单位字符（默认：4000）。
- `channels.bluebubbles.sendTimeoutMs`: 通过 `/api/v1/message/text` 发送出站文本时的每请求超时，单位 ms（默认：30000）。在 macOS 26 配置中，Private API iMessage 发送可能会在 iMessage 框架内卡住 60 秒以上，此时可提高该值；例如 `45000` 或 `60000`。探测、聊天查询、反应、编辑和健康检查目前仍保持较短的 10 秒默认值；后续计划扩大到反应和编辑。按账号覆盖：`channels.bluebubbles.accounts.<accountId>.sendTimeoutMs`。
- `channels.bluebubbles.chunkMode`: `length`（默认）仅在超过 `textChunkLimit` 时分块；`newline` 会先按空行（段落边界）分块，再进行长度分块。
- `channels.bluebubbles.mediaMaxMb`: 入站/出站媒体上限，单位 MB（默认：8）。
- `channels.bluebubbles.mediaLocalRoots`: 允许用于出站本地媒体路径的绝对本地目录白名单。默认拒绝本地路径发送，除非配置此项。按账号覆盖：`channels.bluebubbles.accounts.<accountId>.mediaLocalRoots`。
- `channels.bluebubbles.coalesceSameSenderDms`: 将同一发送者连续发出的 DM webhook 合并为一次 agent 回合，使 Apple 的文本 + URL 拆分发送以单条消息形式到达（默认：`false`）。有关场景、窗口调优和权衡，请参见[组合发送 DM 的合并处理](#coalescing-split-send-dms-command--url-in-one-composition)。启用后，在未显式设置 `messages.inbound.byChannel.bluebubbles` 时，会把默认入站去抖窗口从 500 ms 扩大到 2500 ms。
- `channels.bluebubbles.historyLimit`: 用于上下文的群消息最大数量（0 表示禁用）。
- `channels.bluebubbles.dmHistoryLimit`: DM 历史限制。
- `channels.bluebubbles.actions`: 启用/禁用特定动作。
- `channels.bluebubbles.accounts`: 多账号配置。

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

### iMessage 与 SMS 路由

当同一个句柄在 Mac 上既有 iMessage 聊天又有 SMS 聊天时（例如某个电话号码已注册为 iMessage，但也收到过绿色气泡回退），OpenClaw 会优先使用 iMessage 聊天，并且绝不会悄悄降级到 SMS。若要强制使用 SMS 聊天，请使用显式的 `sms:` 目标前缀（例如 `sms:+15555550123`）。没有匹配 iMessage 聊天的句柄仍会通过 BlueBubbles 报告的任何聊天进行发送。

## 安全性

- Webhook 请求通过将 `guid`/`password` 查询参数或头与 `channels.bluebubbles.password` 进行比较来验证身份。
- 保密 API 密码和 webhook 端点（将它们视为凭证）。
- BlueBubbles webhook 身份验证没有 localhost 绕过。如果您代理 webhook 流量，请在请求中端到端保留 BlueBubbles 密码。`gateway.trustedProxies` 在此处不替代 `channels.bluebubbles.password`。请参阅 [网关安全性](/gateway/security#reverse-proxy-configuration)。
- 如果将 BlueBubbles 服务器暴露在局域网之外，请在服务器上启用 HTTPS + 防火墙规则。

## 故障排查

- 如果 typing/read 事件停止工作，请检查 BlueBubbles webhook 日志并验证 gateway 路径是否与 `channels.bluebubbles.webhookPath` 匹配。
- 配对码在一小时后过期；使用 `openclaw pairing list bluebubbles` 和 `openclaw pairing approve bluebubbles <code>`。
- Reactions 需要 BlueBubbles 私有 API（`POST /api/v1/message/react`）；请确保服务器版本已暴露该接口。
- Edit/unsend 需要 macOS 13+ 和兼容的 BlueBubbles 服务器版本。在 macOS 26（Tahoe）上，由于私有 API 变更，edit 目前不可用。
- 群组图标更新在 macOS 26（Tahoe）上可能不稳定：API 可能返回成功，但新图标不会同步。
- OpenClaw 会根据 BlueBubbles 服务器的 macOS 版本自动隐藏已知损坏的操作。如果 edit 在 macOS 26（Tahoe）上仍然显示，请使用 `channels.bluebubbles.actions.edit=false` 手动禁用它。
- `coalesceSameSenderDms` 已启用，但拆分发送（例如 `Dump` + URL）仍然会作为两个轮次到达：请参阅 [拆分发送合并排查](#split-send-coalescing-troubleshooting) 检查清单——常见原因包括防抖窗口过短、session-log 时间戳被误读为 webhook 到达时间，或回复引用发送（其使用的是 `replyToBody`，而不是第二个 webhook）。
- 关于状态/健康信息：`openclaw status --all` 或 `openclaw status --deep`。

有关通用频道工作流程参考，请参阅 [频道](/channels) 和 [插件](/tools/plugin) 指南。

## 相关内容

- [频道概览](/channels) — 所有支持的频道
- [配对](/channels/pairing) — 私聊认证与配对流程
- [群组](/channels/groups) — 群聊行为与提及控制
- [频道路由](/channels/channel-routing) — 消息会话路由
- [安全性](/gateway/security) — 访问模型与加固
