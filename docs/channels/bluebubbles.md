---
summary: "通过 BlueBubbles macOS 服务器发送/接收 iMessage（REST 发送/接收、输入指示、表情反应、配对、高级操作）。"
read_when:
  - 设置 BlueBubbles 渠道
  - 排查 webhook 配对问题
  - 在 macOS 上配置 iMessage
title: "BlueBubbles"
sidebarTitle: "BlueBubbles"
---

状态：已捆绑的插件，通过 HTTP 与 BlueBubbles macOS 服务器通信。由于其 API 更丰富、设置比旧版 imsg 渠道更简单，**推荐用于 iMessage 集成**。

<Note>
当前 OpenClaw 版本已捆绑 BlueBubbles，因此常规打包构建不需要单独执行 `openclaw plugins install` 步骤。
</Note>

## 概览

- 通过 BlueBubbles 辅助应用在 macOS 上运行（[bluebubbles.app](https://bluebubbles.app)）。
- 推荐/已测试：macOS Sequoia（15）。macOS Tahoe（26）可用；但当前在 Tahoe 上编辑功能失效，且群组图标更新可能会显示成功但不会同步。
- OpenClaw 通过其 REST API 与之通信（`GET /api/v1/ping`、`POST /message/text`、`POST /chat/:id/*`）。
- 收到的消息通过 webhook 传入；发出的回复、输入指示、已读回执和 tapback 都是 REST 调用。
- 附件和贴纸会作为入站媒体被接收（并在可能时展示给代理）。
- 自动 TTS 回复生成的 MP3 或 CAF 音频会以 iMessage 语音备忘气泡的形式发送，而不是普通文件附件。
- 配对/允许名单与其他渠道（`/channels/pairing` 等）一致，使用 `channels.bluebubbles.allowFrom` + 配对代码。
- 反应会像 Slack/Telegram 一样作为系统事件呈现，因此代理可以在回复前“提及”它们。
- 高级功能：编辑、撤回、回复线程、消息效果、群组管理。

## 快速开始

<Steps>
  <Step title="安装 BlueBubbles">
    在你的 Mac 上安装 BlueBubbles 服务器（按照 [bluebubbles.app/install](https://bluebubbles.app/install) 上的说明进行）。
  </Step>
  <Step title="启用 Web API">
    在 BlueBubbles 配置中启用 Web API 并设置密码。
  </Step>
  <Step title="配置 OpenClaw">
    运行 `openclaw onboard` 并选择 BlueBubbles，或者手动配置：

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

  </Step>
  <Step title="将 webhooks 指向网关">
    将 BlueBubbles webhooks 指向你的网关（示例：`https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`）。
  </Step>
  <Step title="启动网关">
    启动网关；它会注册 webhook 处理程序并开始配对。
  </Step>
</Steps>

<Warning>
**安全**

- 始终设置 webhook 密码。
- 始终需要 webhook 身份验证。无论 loopback/proxy 拓扑如何，OpenClaw 都会拒绝 BlueBubbles webhook 请求，除非它们包含与 `channels.bluebubbles.password` 匹配的密码/guid（例如 `?password=<password>` 或 `x-password`）。
- 在读取/解析完整 webhook 主体之前，会先检查密码身份验证。

</Warning>

## 保持 Messages.app 存活（VM / 无头部署）

某些 macOS 虚拟机 / 常驻运行环境可能会导致 Messages.app 进入“空闲”状态（传入事件会停止，直到应用被打开/切到前台）。一个简单的解决办法是使用 AppleScript + LaunchAgent **每 5 分钟唤醒一次 Messages**。

<Steps>
  <Step title="保存 AppleScript">
    将以下内容保存为 `~/Scripts/poke-messages.scpt`：

    ```applescript
    try
      tell application "Messages"
        if not running then
          launch
        end if

        -- 触碰脚本接口以保持进程响应。
        set _chatCount to (count of chats)
      end tell
    on error
      -- 忽略临时性失败（首次运行提示、锁定会话等）。
    end try
    ```

  </Step>
  <Step title="安装 LaunchAgent">
    将以下内容保存为 `~/Library/LaunchAgents/com.user.poke-messages.plist`：

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

    这会**每 300 秒**以及**登录时**运行。首次运行可能会触发 macOS 的**自动化**提示（`osascript` → Messages）。请在运行该 LaunchAgent 的同一用户会话中批准它们。

  </Step>
  <Step title="加载它">
    ```bash
    launchctl unload ~/Library/LaunchAgents/com.user.poke-messages.plist 2>/dev/null || true
    launchctl load ~/Library/LaunchAgents/com.user.poke-messages.plist
    ```
  </Step>
</Steps>

## 入门配置

BlueBubbles 可在交互式 onboarding 中使用：

```
openclaw onboard
```

向导会提示填写：

<ParamField path="Server URL" type="string" required>
  BlueBubbles 服务器地址（例如 `http://192.168.1.100:1234`）。
</ParamField>
<ParamField path="Password" type="string" required>
  来自 BlueBubbles Server 设置的 API 密码。
</ParamField>
<ParamField path="Webhook path" type="string" default="/bluebubbles-webhook">
  Webhook 端点路径。
</ParamField>
<ParamField path="DM policy" type="string">
  `pairing`、`allowlist`、`open` 或 `disabled`。
</ParamField>
<ParamField path="Allow list" type="string[]">
  电话号码、电子邮件或聊天目标。
</ParamField>

你也可以通过 CLI 添加 BlueBubbles：

```
openclaw channels add bluebubbles --http-url http://192.168.1.100:1234 --password <password>
```

## 访问控制（DM + 群组）

<Tabs>
  <Tab title="DM">
    - 默认：`channels.bluebubbles.dmPolicy = "pairing"`。
    - 未知发送者会收到配对代码；在获得批准前消息会被忽略（代码 1 小时后过期）。
    - 通过以下方式批准：
      - `openclaw pairing list bluebubbles`
      - `openclaw pairing approve bluebubbles <CODE>`
    - 配对是默认的令牌交换方式。详情：[Pairing](/channels/pairing)

  </Tab>
  <Tab title="Groups">
    - `channels.bluebubbles.groupPolicy = open | allowlist | disabled`（默认：`allowlist`）。
    - 当设置为 `allowlist` 时，`channels.bluebubbles.groupAllowFrom` 控制谁可以在群组中触发。

  </Tab>
</Tabs>

### 联系人姓名增强（macOS，可选）

BlueBubbles 群组 webhooks 通常只包含原始参与者地址。如果你希望 `GroupMembers` 上下文显示本地联系人姓名，可以选择在 macOS 上启用本地通讯录增强：

- `channels.bluebubbles.enrichGroupParticipantsFromContacts = true` 启用查找。默认：`false`。
- 只有在群组访问、命令授权和提及门控都允许消息通过之后，才会运行查找。
- 仅增强未命名的电话参与者。
- 如果未找到本地匹配，原始电话号码仍会作为回退。

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

BlueBubbles 支持群聊的提及门控，行为与 iMessage/WhatsApp 一致：

- 使用 `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）来检测提及。
- 当群组启用 `requireMention` 时，代理仅在被提及时才会响应。
- 来自已授权发送者的控制命令会绕过提及门控。

按群组配置：

```json5
{
  channels: {
    bluebubbles: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15555550123"],
      groups: {
        "*": { requireMention: true }, // 所有群组的默认值
        "iMessage;-;chat123": { requireMention: false }, // 针对特定群组的覆盖
      },
    },
  },
}
```

### 命令门控

- 控制命令（例如 `/config`、`/model`）需要授权。
- 使用 `allowFrom` 和 `groupAllowFrom` 来确定命令授权。
- 已授权发送者即使在群组中未提及也可以运行控制命令。

### 每群组系统提示词

`channels.bluebubbles.groups.*` 下的每个条目都接受一个可选的 `systemPrompt` 字符串。该值会在处理该群组中的消息时注入到代理每一轮的系统提示词中，因此你可以为每个群组设置人格或行为规则，而无需编辑代理提示词：

```json5
{
  channels: {
    bluebubbles: {
      groups: {
        "iMessage;-;chat123": {
          systemPrompt: "保持回复不超过 3 句话。模仿群组的随意语气。",
        },
      },
    },
  },
}
```

该键会匹配 BlueBubbles 为群组报告的 `chatGuid` / `chatIdentifier` / 数字 `chatId`，而 `"*"` 通配符条目会为每个没有精确匹配的群组提供默认值（与 `requireMention` 和每群组工具策略使用相同模式）。精确匹配始终优先于通配符。DM 会忽略此字段；请改用代理级别或账户级别的提示词自定义。

#### 详细示例：线程回复和 tapback 反应（Private API）

启用 BlueBubbles Private API 后，入站消息会带有短消息 ID（例如 `[[reply_to:5]]`），代理可以调用 `action=reply` 将消息线程回复到特定消息，或者调用 `action=react` 发出 tapback。每群组的 `systemPrompt` 是一种可靠方式，可帮助代理始终选择正确的工具：

```json5
{
  channels: {
    bluebubbles: {
      groups: {
        "iMessage;+;chat-family": {
          systemPrompt: [
            "在这个群组中回复时，始终调用 action=reply，并使用",
            "上下文中的 [[reply_to:N]] messageId，这样你的回复会线程化",
            "到触发消息下方。不要发送新的未关联消息。",
            "",
            "对于简短确认（'ok'、'got it'、'on it'），请使用",
            "带有合适 tapback 表情的 action=react（❤️、👍、😂、‼️、❓）",
            "而不是发送文本回复。",
          ].join(" "),
        },
      },
    },
  },
}
```

Tapback 反应和线程回复都需要 BlueBubbles Private API；有关底层机制，请参阅[高级操作](#advanced-actions)和[消息 ID](#message-ids-short-vs-full)。

## ACP 对话绑定

BlueBubbles 聊天可以在不更改传输层的情况下转换为持久的 ACP 工作区。

快速操作流程：

- 在 DM 或允许的群聊中运行 `/acp spawn codex --bind here`。
- 同一 BlueBubbles 会话中的后续消息会路由到已生成的 ACP 会话。
- `/new` 和 `/reset` 会就地重置同一个已绑定的 ACP 会话。
- `/acp close` 会关闭 ACP 会话并移除绑定。

也支持通过顶层 `bindings[]` 条目配置持久绑定，使用 `type: "acp"` 和 `match.channel: "bluebubbles"`。

`match.peer.id` 可以使用任何受支持的 BlueBubbles 目标形式：

- 规范化的 DM 句柄，例如 `+15555550123` 或 `user@example.com`
- `chat_id:<id>`
- `chat_guid:<guid>`
- `chat_identifier:<identifier>`

对于稳定的群组绑定，优先使用 `chat_id:*` 或 `chat_identifier:*`。

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

请参阅 [ACP Agents](/tools/acp-agents) 了解共享的 ACP 绑定行为。

## 输入中提示 + 已读回执

- **输入中指示**：在生成回复前和生成过程中会自动发送。
- **已读回执**：由 `channels.bluebubbles.sendReadReceipts` 控制（默认：`true`）。
- **输入中指示**：OpenClaw 会发送输入开始事件；BlueBubbles 会在发送或超时后自动清除输入状态（通过 DELETE 手动停止并不可靠）。

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

在配置中启用后，BlueBubbles 支持高级消息操作：

```json5
{
  channels: {
    bluebubbles: {
      actions: {
        reactions: true, // tapback（默认：true）
        edit: true, // 编辑已发送消息（macOS 13+，在 macOS 26 Tahoe 上有问题）
        unsend: true, // 撤回消息（macOS 13+）
        reply: true, // 按消息 GUID 进行回复线程
        sendWithEffect: true, // 消息特效（slam、loud 等）
        renameGroup: true, // 重命名群聊
        setGroupIcon: true, // 设置群聊图标/照片（在 macOS 26 Tahoe 上不稳定）
        addParticipant: true, // 向群组添加参与者
        removeParticipant: true, // 从群组中移除参与者
        leaveGroup: true, // 离开群聊
        sendAttachment: true, // 发送附件/媒体
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="可用操作">
    - **react**：添加/移除 tapback 反应（`messageId`、`emoji`、`remove`）。iMessage 原生 tapback 集合是 `love`、`like`、`dislike`、`laugh`、`emphasize` 和 `question`。当代理选择了该集合之外的 emoji（例如 `👀`）时，reaction 工具会回退为 `love`，这样 tapback 仍然会显示，而不会导致整个请求失败。已配置的 ack reactions 仍会严格校验，并在未知值上报错。
    - **edit**：编辑已发送消息（`messageId`、`text`）。
    - **unsend**：撤回消息（`messageId`）。
    - **reply**：回复特定消息（`messageId`、`text`、`to`）。
    - **sendWithEffect**：以 iMessage 特效发送（`text`、`to`、`effectId`）。
    - **renameGroup**：重命名群聊（`chatGuid`、`displayName`）。
    - **setGroupIcon**：设置群聊图标/照片（`chatGuid`、`media`）——在 macOS 26 Tahoe 上不稳定（API 可能返回成功，但图标不会同步）。
    - **addParticipant**：向群组添加某人（`chatGuid`、`address`）。
    - **removeParticipant**：从群组中移除某人（`chatGuid`、`address`）。
    - **leaveGroup**：离开群聊（`chatGuid`）。
    - **upload-file**：发送媒体/文件（`to`、`buffer`、`filename`、`asVoice`）。
      - 语音备忘录：将 `asVoice: true` 与 **MP3** 或 **CAF** 音频一起使用，可作为 iMessage 语音消息发送。BlueBubbles 在发送语音备忘录时会将 MP3 转换为 CAF。
    - 旧别名：`sendAttachment` 仍然可用，但 `upload-file` 是规范的操作名称。

  </Accordion>
</AccordionGroup>

### 消息 ID（短 ID 与完整 ID）

OpenClaw 可能会暴露 _短_ 消息 ID（例如 `1`、`2`）以节省 token。

- `MessageSid` / `ReplyToId` 可以是短 ID。
- `MessageSidFull` / `ReplyToIdFull` 包含提供方的完整 ID。
- 短 ID 只存在于内存中；重启或缓存回收后可能过期。
- 操作接受短或完整的 `messageId`，但如果短 ID 不再可用则会报错。

请在需要持久自动化和存储时使用完整 ID：

- 模板：`{{MessageSidFull}}`、`{{ReplyToIdFull}}`
- 上下文：入站载荷中的 `MessageSidFull` / `ReplyToIdFull`

请参阅 [Configuration](/gateway/configuration) 了解模板变量。

<a id="coalescing-split-send-dms-command--url-in-one-composition"></a>

## 合并拆分发送的 DM（命令 + URL 在同一条消息中）

当用户在 iMessage 中同时输入命令和 URL——例如 `Dump https://example.com/article`——Apple 会把发送拆成 **两个独立的 webhook 投递**：

1. 一条文本消息（`"Dump"`）。
2. 一个 URL 预览气泡（`"https://..."`），并附带 OG 预览图片作为附件。

在大多数环境中，这两个 webhook 会相隔约 0.8-2.0 秒到达 OpenClaw。若不进行合并，代理会在第 1 轮只收到命令，回复（通常是“把 URL 发给我”），然后在第 2 轮才看到 URL——此时命令上下文已经丢失。

`channels.bluebubbles.coalesceSameSenderDms` 会将 DM 中连续来自同一发送者的 webhook 合并为一次代理回合。群聊仍然按每条消息进行标记，因此多用户回合结构会被保留。

<Tabs>
  <Tab title="何时启用">
    在以下情况启用：

    - 你提供的技能期望在一条消息里同时包含 `command + payload`（dump、paste、save、queue 等）。
    - 用户会在命令旁边粘贴 URL、图片或长内容。
    - 你可以接受额外的 DM 回合延迟（见下文）。

    在以下情况保持禁用：

    - 你需要单词 DM 触发器的最低命令延迟。
    - 你的所有流程都是没有后续 payload 的一次性命令。

  </Tab>
  <Tab title="启用方式">
    ```json5
    {
      channels: {
        bluebubbles: {
          coalesceSameSenderDms: true, // 启用（默认：false）
        },
      },
    }
    ```

    启用该标志且没有显式设置 `messages.inbound.byChannel.bluebubbles` 时，去抖窗口会扩大到 **2500 ms**（非合并场景的默认值是 500 ms）。需要更大的窗口——Apple 的拆分发送节奏 0.8-2.0 秒无法适配更小的默认值。

    若要自行调整窗口：

    ```json5
    {
      messages: {
        inbound: {
          byChannel: {
            // 2500 ms 适用于大多数环境；如果你的 Mac 较慢
            // 或处于内存压力下，可提高到 4000 ms（此时观测到的间隔可能会超过 2 秒）。
            bluebubbles: 2500,
          },
        },
      },
    }
    ```

  </Tab>
  <Tab title="权衡">
    - **DM 控制命令的延迟增加。** 启用该标志后，DM 控制命令消息（如 `Dump`、`Save` 等）会在分发前最多等待去抖窗口，以防后续 payload webhook 即将到达。群聊命令仍会立即分发。
    - **合并输出有上限**——合并后的文本最多 4000 个字符，并带有显式的 `…[truncated]` 标记；附件最多 20 个；来源条目最多 10 个（超过后保留最早和最新的）。每个来源 `messageId` 仍会进入入站去重，因此之后 MessagePoller 对任意单个事件的重放都会被识别为重复。
    - **按通道启用。** 其他通道（Telegram、WhatsApp、Slack、…）不受影响。

  </Tab>
</Tabs>

### 场景以及代理会看到什么

| 用户输入                                                        | Apple 投递            | 关闭标志（默认）                        | 开启标志 + 2500 ms 窗口                                             |
| ---------------------------------------------------------------- | --------------------- | --------------------------------------- | ------------------------------------------------------------------- |
| `Dump https://example.com`（一次发送）                           | 2 个 webhook，相隔约 1 秒 | 两个代理回合：“Dump” 单独一条，然后是 URL | 一个回合：合并后的文本 `Dump https://example.com`                  |
| `Save this 📎image.jpg caption`（附件 + 文本）                    | 2 个 webhook          | 两个回合                               | 一个回合：文本 + 图片                                                |
| `/status`（独立命令）                                             | 1 个 webhook          | 立即分发                                | **最多等待窗口，然后分发**                                           |
| 单独粘贴 URL                                                     | 1 个 webhook          | 立即分发                                | 立即分发（桶中只有一项）                                              |
| 文本 + URL 作为两个刻意分开的消息发送，间隔几分钟                 | 2 个 webhook，超出窗口 | 两个回合                               | 两个回合（窗口之间已过期）                                           |
| 快速洪泛（窗口内超过 10 条小 DM）                                  | N 个 webhook          | N 个回合                                | 一个回合，输出受限（应用最早 + 最新、文本/附件上限）                |

### 拆分发送合并排查

如果标志已开启但拆分发送仍然作为两个回合到达，请检查各层：

<AccordionGroup>
  <Accordion title="配置确实已加载">
    ```
    grep coalesceSameSenderDms ~/.openclaw/openclaw.json
    ```

    然后执行 `openclaw gateway restart` —— 该标志是在 debouncer-registry 创建时读取的。

  </Accordion>
  <Accordion title="去抖窗口对你的环境足够大">
    查看 `~/Library/Logs/bluebubbles-server/main.log` 下的 BlueBubbles 服务器日志：

    ```
    grep -E "Dispatching event to webhook" main.log | tail -20
    ```

    测量 `"Dump"` 风格文本分发与随后 `"https://..."; Attachments:` 分发之间的间隔。将 `messages.inbound.byChannel.bluebubbles` 调大到足以覆盖该间隔。

  </Accordion>
  <Accordion title="Session JSONL 时间戳 ≠ webhook 到达时间">
    Session 事件时间戳（`~/.openclaw/agents/<id>/sessions/*.jsonl`）反映的是网关把消息交给代理的时间，**不是** webhook 到达的时间。若出现标记为 `[Queued messages while agent was busy]` 的排队第二条消息，说明第一轮仍在运行时第二个 webhook 就已到达——此时合并桶已经刷新。请根据 BB 服务器日志调整窗口，而不是会话日志。
  </Accordion>
  <Accordion title="内存压力导致回复分发变慢">
    在较小的机器（8 GB）上，代理回合可能耗时足够长，以至于合并桶会在回复完成前刷新，而 URL 会作为排队的第二轮到达。检查 `memory_pressure` 和 `ps -o rss -p $(pgrep openclaw-gateway)`；如果网关的 RSS 超过约 500 MB 且压缩器处于活动状态，请关闭其他高负载进程或升级到更大的主机。
  </Accordion>
  <Accordion title="回复引用发送走的是不同路径">
    如果用户将 `Dump` 作为对现有 URL 气泡的**回复**而点击发送（iMessage 会在 Dump 气泡上显示 `"1 Reply"` 徽标），那么 URL 存在于 `replyToBody` 中，而不是第二个 webhook 里。合并不适用——这属于技能/提示词问题，而不是去抖器问题。
  </Accordion>
</AccordionGroup>

## 块流式输出

控制回复是作为单条消息发送，还是按块流式输出：

```json5
{
  channels: {
    bluebubbles: {
      blockStreaming: true, // 启用块流式输出（默认关闭）
    },
  },
}
```

## Media + 限制

- 入站附件会被下载并存储到媒体缓存中。
- 通过 `channels.bluebubbles.mediaMaxMb` 限制入站和出站媒体大小（默认：8 MB）。
- 出站文本会按 `channels.bluebubbles.textChunkLimit` 分块（默认：4000 个字符）。

## 配置参考

完整配置：[Configuration](/gateway/configuration)

<AccordionGroup>
  <Accordion title="连接和 webhook">
    - `channels.bluebubbles.enabled`: 启用/禁用该通道。
    - `channels.bluebubbles.serverUrl`: BlueBubbles REST API 基础 URL。
    - `channels.bluebubbles.password`: API 密码。
    - `channels.bluebubbles.webhookPath`: Webhook 端点路径（默认：`/bluebubbles-webhook`）。

  </Accordion>
  <Accordion title="访问策略">
    - `channels.bluebubbles.dmPolicy`: `pairing | allowlist | open | disabled`（默认：`pairing`）。
    - `channels.bluebubbles.allowFrom`: DM 允许列表（handles、emails、E.164 numbers、`chat_id:*`、`chat_guid:*`）。
    - `channels.bluebubbles.groupPolicy`: `open | allowlist | disabled`（默认：`allowlist`）。
    - `channels.bluebubbles.groupAllowFrom`: 群组发送者允许列表。
    - `channels.bluebubbles.enrichGroupParticipantsFromContacts`: 在 macOS 上，在通过门禁后可选地从本地通讯录中补充未命名的群组参与者。默认：`false`。
    - `channels.bluebubbles.groups`: 按群组配置（`requireMention` 等）。

  </Accordion>
  <Accordion title="发送与分块">
    - `channels.bluebubbles.sendReadReceipts`: 发送已读回执（默认：`true`）。
    - `channels.bluebubbles.blockStreaming`: 启用 block streaming（默认：`false`；流式回复所必需）。
    - `channels.bluebubbles.textChunkLimit`: 出站分块大小（字符数，默认：4000）。
    - `channels.bluebubbles.sendTimeoutMs`: 通过 `/api/v1/message/text` 发送出站文本时的单请求超时（毫秒，默认：30000）。在 macOS 26 环境中，如果使用 Private API 发送 iMessage 可能会在 iMessage 框架内卡住 60 秒以上，可将此值调高，例如 `45000` 或 `60000`。当前探测、聊天查找、反应、编辑和健康检查仍保持较短的 10 秒默认值；后续计划将覆盖范围扩展到反应和编辑。按账户覆盖：`channels.bluebubbles.accounts.<accountId>.sendTimeoutMs`。
    - `channels.bluebubbles.chunkMode`: `length`（默认）仅在超过 `textChunkLimit` 时分块；`newline` 会先按空行（段落边界）分割，再进行长度分块。

  </Accordion>
  <Accordion title="媒体和历史记录">
    - `channels.bluebubbles.mediaMaxMb`: 入站/出站媒体大小上限（MB，默认：8）。
    - `channels.bluebubbles.mediaLocalRoots`: 允许用于出站本地媒体路径的绝对本地目录显式允许列表。默认情况下，本地路径发送会被拒绝，除非配置了此项。按账户覆盖：`channels.bluebubbles.accounts.<accountId>.mediaLocalRoots`。
    - `channels.bluebubbles.coalesceSameSenderDms`: 将连续来自同一发送者的 DM webhook 合并为一次 agent 回合，使 Apple 的文本+URL 拆分发送以单条消息到达（默认：`false`）。有关场景、窗口调优和权衡，请参见 [合并拆分发送的 DM](#coalescing-split-send-dms-command--url-in-one-composition)。启用后，如果未显式设置 `messages.inbound.byChannel.bluebubbles`，会将默认入站去抖窗口从 500 ms 扩大到 2500 ms。
    - `channels.bluebubbles.historyLimit`: 上下文可用的群消息最大数量（0 表示禁用）。
    - `channels.bluebubbles.dmHistoryLimit`: DM 历史记录限制。

  </Accordion>
  <Accordion title="操作和账户">
    - `channels.bluebubbles.actions`: 启用/禁用特定操作。
    - `channels.bluebubbles.accounts`: 多账户配置。

  </Accordion>
</AccordionGroup>

相关的全局选项：

- `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）。
- `messages.responsePrefix`。

## 寻址 / 送达目标

优先使用 `chat_guid` 进行稳定路由：

- `chat_guid:iMessage;-;+15555550123`（群组首选）
- `chat_id:123`
- `chat_identifier:...`
- 直接 handles：`+15555550123`、`user@example.com`
  - 如果直接 handle 没有现有的 DM 聊天，OpenClaw 会通过 `POST /api/v1/chat/new` 创建一个。这需要启用 BlueBubbles Private API。

### iMessage 与 SMS 路由

当同一个 handle 在 Mac 上同时拥有 iMessage 和 SMS 聊天记录时（例如某个电话号码既已注册 iMessage，但也收到了绿色气泡回退消息），OpenClaw 会优先选择 iMessage 聊天，并且绝不会悄悄降级到 SMS。若要强制使用 SMS 聊天，请使用显式的 `sms:` 目标前缀（例如 `sms:+15555550123`）。没有匹配 iMessage 聊天的 handle 仍会通过 BlueBubbles 报告的任意聊天发送。

## 安全

- Webhook 请求通过将 `guid`/`password` 查询参数或请求头与 `channels.bluebubbles.password` 比对来认证。
- 保持 API 密码和 webhook 端点的机密性（将它们视为凭据）。
- BlueBubbles webhook 认证没有 localhost 绕过。如果你代理 webhook 流量，请确保在请求端到端保留 BlueBubbles 密码。这里的 `gateway.trustedProxies` 不能替代 `channels.bluebubbles.password`。参见 [Gateway security](/gateway/security#reverse-proxy-configuration)。
- 如果将 BlueBubbles 服务器暴露到 LAN 之外，请启用 HTTPS + 防火墙规则。

## 故障排查

- 如果输入/已读事件停止工作，请检查 BlueBubbles webhook 日志并验证网关路径是否与 `channels.bluebubbles.webhookPath` 匹配。
- 配对码一小时后过期；使用 `openclaw pairing list bluebubbles` 和 `openclaw pairing approve bluebubbles <code>`。
- 反应需要 BlueBubbles private API（`POST /api/v1/message/react`）；请确保服务器版本已暴露该接口。
- 编辑/撤回需要 macOS 13+ 以及兼容的 BlueBubbles 服务器版本。在 macOS 26（Tahoe）上，由于私有 API 变更，编辑功能当前不可用。
- 群组图标更新在 macOS 26（Tahoe）上可能不稳定：API 可能返回成功，但新图标不会同步。
- OpenClaw 会根据 BlueBubbles 服务器的 macOS 版本自动隐藏已知失效的操作。如果在 macOS 26（Tahoe）上编辑仍然显示，请使用 `channels.bluebubbles.actions.edit=false` 手动禁用。
- 已启用 `coalesceSameSenderDms` 但拆分发送（例如 `Dump` + URL）仍然作为两个回合到达：请参见 [拆分发送合并故障排查](#split-send-coalescing-troubleshooting) 清单——常见原因是去抖窗口过紧、会话日志时间戳被误读为 webhook 到达时间，或者是回复引用发送（它使用 `replyToBody`，而不是第二个 webhook）。
- 状态/健康信息：`openclaw status --all` 或 `openclaw status --deep`。

关于通道工作流的一般参考，请参见 [Channels](/channels) 和 [Plugins](/tools/plugin) 指南。

## 相关内容

- [Channel Routing](/channels/channel-routing) — 消息的会话路由
- [Channels Overview](/channels) — 所有支持的通道
- [Groups](/channels/groups) — 群聊行为和 mention 门禁
- [Pairing](/channels/pairing) — DM 认证和配对流程
- [Security](/gateway/security) — 访问模型和加固
