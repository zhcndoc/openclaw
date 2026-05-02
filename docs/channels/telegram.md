---
summary: "支持状态、能力和配置的 Telegram 机器人"
read_when:
  - 处理 Telegram 功能或 webhooks 时
title: "Telegram"
---

通过 grammY，适用于机器人私聊和群组，且可直接投入生产。长轮询是默认模式；webhook 模式为可选。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/channels/pairing">
    Telegram 的默认 DM 策略是配对。
  </Card>
  <Card title="故障排查" icon="wrench" href="/channels/troubleshooting">
    跨渠道诊断与修复操作手册。
  </Card>
  <Card title="网关配置" icon="settings" href="/gateway/configuration">
    完整的渠道配置模式和示例。
  </Card>
</CardGroup>

## 快速设置

<Steps>
  <Step title="在 BotFather 中创建机器人 token">
    打开 Telegram 并与 **@BotFather** 聊天（确认该用户名必须正好是 `@BotFather`）。

    运行 `/newbot`，按提示操作，并保存 token。

  </Step>

  <Step title="配置 token 和 DM 策略">

```json5
{
  channels: {
    telegram: {
      enabled: true,
      botToken: "123:abc",
      dmPolicy: "pairing",
      groups: { "*": { requireMention: true } },
    },
  },
}
```

    环境变量回退：`TELEGRAM_BOT_TOKEN=...`（仅默认账号可用）。
    Telegram **不会**使用 `openclaw channels login telegram`；请在 config/env 中配置 token，然后启动 gateway。

  </Step>

  <Step title="启动 gateway 并批准首次 DM">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    配对码会在 1 小时后过期。

  </Step>

  <Step title="将机器人添加到群组">
    将机器人添加到你的群组，然后设置 `channels.telegram.groups` 和 `groupPolicy` 以匹配你的访问模型。
  </Step>
</Steps>

<Note>
Token 的解析顺序会感知账号。实际使用中，config 值优先于 env 回退，并且 `TELEGRAM_BOT_TOKEN` 只适用于默认账号。
</Note>

## Telegram 侧设置

<AccordionGroup>
  <Accordion title="隐私模式和群组可见性">
    Telegram 机器人的默认设置是 **隐私模式**，这会限制它能接收到哪些群消息。

    如果机器人必须看到所有群消息，可以：

    - 通过 `/setprivacy` 禁用隐私模式，或
    - 将机器人设为群管理员。

    切换隐私模式后，请在每个群组中移除并重新添加机器人，以便 Telegram 应用该更改。

  </Accordion>

  <Accordion title="群组权限">
    管理员状态由 Telegram 群组设置控制。

    管理员机器人会收到所有群消息，这对于始终在线的群行为很有用。

  </Accordion>

  <Accordion title="有用的 BotFather 开关">

    - `/setjoingroups` 用于允许/拒绝加入群组
    - `/setprivacy` 用于群可见性行为

  </Accordion>
</AccordionGroup>

## 访问控制与激活

<Tabs>
  <Tab title="DM 策略">
    `channels.telegram.dmPolicy` 控制直接消息访问：

    - `pairing`（默认）
    - `allowlist`（至少需要在 `allowFrom` 中包含一个发送者 ID）
    - `open`（要求 `allowFrom` 包含 `"*"`)
    - `disabled`

    `dmPolicy: "open"` 且 `allowFrom: ["*"]` 会让任何发现或猜到机器人用户名的 Telegram 账号都能向机器人发起命令。仅应将其用于有意公开且工具权限严格受限的机器人；单所有者机器人应使用带数字用户 ID 的 `allowlist`。

    `channels.telegram.allowFrom` 接受数字 Telegram 用户 ID。`telegram:` / `tg:` 前缀也被接受并会被规范化。
    在多账号配置中，限制性的顶层 `channels.telegram.allowFrom` 会被视为安全边界：账号级的 `allowFrom: ["*"]` 条目不会让该账号变成公开，除非合并后的有效账号 allowlist 仍然包含显式通配符。
    `dmPolicy: "allowlist"` 且 `allowFrom` 为空会阻止所有 DM，并会被配置校验拒绝。
    设置只接受数字用户 ID。
    如果你是升级后，配置里仍包含 `@username` allowlist 条目，请运行 `openclaw doctor --fix` 来解析它们（尽力而为；需要 Telegram bot token）。
    如果你之前依赖 pairing-store allowlist 文件，`openclaw doctor --fix` 可以在 allowlist 流程中把条目恢复到 `channels.telegram.allowFrom`（例如 `dmPolicy: "allowlist"` 还没有显式 ID 时）。

    对于单所有者机器人，建议使用带显式数字 `allowFrom` ID 的 `dmPolicy: "allowlist"`，以便在 config 中保持持久的访问策略（而不是依赖之前的配对批准）。

    常见误解：DM 配对批准并不意味着“这个发送者在任何地方都被授权”。
    配对只授予 DM 访问权限。如果此时还没有命令所有者，第一个被批准的配对也会设置 `commands.ownerAllowFrom`，使仅所有者命令和 exec 批准拥有明确的操作员账号。
    群发送者授权仍然来自显式配置 allowlist。
    如果你想要“我只授权一次，DM 和群命令都能用”，请把你的数字 Telegram 用户 ID 放入 `channels.telegram.allowFrom`；对于仅所有者命令，请确保 `commands.ownerAllowFrom` 包含 `telegram:<你的 user id>`。

    ### 查找你的 Telegram 用户 ID

    更安全的方法（不需要第三方机器人）：

    1. 给你的机器人发 DM。
    2. 运行 `openclaw logs --follow`。
    3. 读取 `from.id`。

    官方 Bot API 方法：

```bash
curl "https://api.telegram.org/bot<bot_token>/getUpdates"
```

    第三方方法（隐私性较低）：`@userinfobot` 或 `@getidsbot`。

  </Tab>

  <Tab title="群组策略和 allowlist">
    两项控制共同生效：

    1. **允许哪些群组**（`channels.telegram.groups`）
       - 没有 `groups` 配置：
         - 当 `groupPolicy: "open"` 时：任何群组都可以通过 group-ID 检查
         - 当 `groupPolicy: "allowlist"`（默认）时：在添加 `groups` 条目（或 `"*"`）之前，群组都会被阻止
       - 已配置 `groups`：按 allowlist 处理（显式 ID 或 `"*"`）

    2. **群组中允许哪些发送者**（`channels.telegram.groupPolicy`）
       - `open`
       - `allowlist`（默认）
       - `disabled`

    `groupAllowFrom` 用于群发送者过滤。如果未设置，Telegram 会回退到 `allowFrom`。
    `groupAllowFrom` 条目应为数字 Telegram 用户 ID（`telegram:` / `tg:` 前缀会被规范化）。
    不要在 `groupAllowFrom` 中放 Telegram 群或超级群的 chat ID。负数 chat ID 应放在 `channels.telegram.groups` 下。
    非数字条目会被忽略，不用于发送者授权。
    安全边界（`2026.2.25+`）：群发送者授权**不会**继承 DM 配对存储中的批准。
    配对仍然只用于 DM。对于群组，请设置 `groupAllowFrom` 或按群/按话题的 `allowFrom`。
    如果未设置 `groupAllowFrom`，Telegram 会回退到配置中的 `allowFrom`，而不是配对存储。
    单所有者机器人的实用模式：在 `channels.telegram.allowFrom` 中设置你的用户 ID，保持 `groupAllowFrom` 不设置，并在 `channels.telegram.groups` 下允许目标群组。
    运行时说明：如果 `channels.telegram` 完全缺失，运行时默认使用 fail-closed 的 `groupPolicy="allowlist"`，除非显式设置了 `channels.defaults.groupPolicy`。

    示例：允许某个特定群组中的任何成员：

```json5
{
  channels: {
    telegram: {
      groups: {
        "-1001234567890": {
          groupPolicy: "open",
          requireMention: false,
        },
      },
    },
  },
}
```

    示例：仅允许某个特定群组中的特定用户：

```json5
{
  channels: {
    telegram: {
      groups: {
        "-1001234567890": {
          requireMention: true,
          allowFrom: ["8734062810", "745123456"],
        },
      },
    },
  },
}
```

    <Warning>
      常见错误：`groupAllowFrom` 不是 Telegram 群组 allowlist。

      - 把像 `-1001234567890` 这样的负 Telegram 群或超级群 chat ID 放在 `channels.telegram.groups` 下。
      - 当你想限制允许群组中的哪些人可以触发机器人时，把像 `8734062810` 这样的 Telegram 用户 ID 放在 `groupAllowFrom` 下。
      - 仅当你希望允许群组中的任意成员都能与机器人对话时，才使用 `groupAllowFrom: ["*"]`。

    </Warning>

  </Tab>

  <Tab title="提及行为">
    默认情况下，群回复需要提及。

    提及可以来自：

    - 原生的 `@botusername` 提及，或
    - 以下位置中的提及模式：
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    会话级命令切换：

    - `/activation always`
    - `/activation mention`

    这些只会更新会话状态。若要持久化，请使用 config。

    持久化配置示例：

```json5
{
  channels: {
    telegram: {
      groups: {
        "*": { requireMention: false },
      },
    },
  },
}
```

    获取群聊 ID：

    - 将群消息转发给 `@userinfobot` / `@getidsbot`
    - 或从 `openclaw logs --follow` 中读取 `chat.id`
    - 或检查 Bot API 的 `getUpdates`

  </Tab>
</Tabs>

## 运行时行为

- Telegram 由 gateway 进程负责。
- 路由是确定性的：Telegram 的入站消息会原路回复到 Telegram（模型不会选择渠道）。
- 入站消息会归一化为共享的 channel envelope，并带有回复元数据和媒体占位符。
- 群会话按群 ID 隔离。论坛主题会追加 `:topic:<threadId>` 以保持主题隔离。
- DM 消息可以携带 `message_thread_id`；OpenClaw 会使用感知线程的会话键进行路由，并在回复中保留 thread ID。
- 长轮询使用 grammY runner，并按 chat / thread 串行处理。整体 runner sink 并发度使用 `agents.defaults.maxConcurrent`。
- 长轮询在每个 gateway 进程内受保护，因此同一时间只有一个活动轮询器可以使用同一个 bot token。如果你仍然看到 `getUpdates` 409 冲突，很可能是另一个 OpenClaw gateway、脚本或外部轮询器正在使用同一个 token。
- 默认情况下，如果 120 秒内没有完成的 `getUpdates` 存活检查，长轮询看门狗会触发重启。只有在你的部署在长时间任务期间仍然出现误判的 polling-stall 重启时，才增加 `channels.telegram.pollingStallThresholdMs`。该值以毫秒为单位，允许范围为 `30000` 到 `600000`；支持按账号覆盖。
- Telegram Bot API 不支持已读回执（`sendReadReceipts` 不适用）。

## 功能参考

<AccordionGroup>
  <Accordion title="实时流预览（消息编辑）">
    OpenClaw 可以实时流式发送部分回复：

    - 直接聊天：预览消息 + `editMessageText`
    - 群组/话题：预览消息 + `editMessageText`

    要求：

    - `channels.telegram.streaming` 为 `off | partial | block | progress`（默认：`partial`）
    - `progress` 在 Telegram 上映射为 `partial`（以兼容跨渠道命名）
    - `streaming.preview.toolProgress` 控制工具/进度更新是否复用同一条已编辑的预览消息（预览流启用时默认：`true`）
    - 会自动检测旧版 `channels.telegram.streamMode` 和布尔值 `streaming`；运行 `openclaw doctor --fix` 可将它们迁移到 `channels.telegram.streaming.mode`

    工具进度预览更新是工具运行时显示的简短“Working...”行，例如命令执行、文件读取、规划更新或补丁摘要。Telegram 默认保持启用这些内容，以匹配 `v2026.4.22` 及之后发布的 OpenClaw 行为。若要保留回答文本的已编辑预览，但隐藏工具进度行，请设置：

    ```json
    {
      "channels": {
        "telegram": {
          "streaming": {
            "mode": "partial",
            "preview": {
              "toolProgress": false
            }
          }
        }
      }
    }
    ```

    仅当你希望只发送最终结果时才使用 `streaming.mode: "off"`：Telegram 预览编辑会被禁用，通用的工具/进度杂项内容会被抑制，而不是作为独立的“Working...”消息发送。审批提示、媒体载荷和错误仍然会通过正常的最终发送流程。若你只想保留答案预览编辑，同时隐藏工具进度状态行，请使用 `streaming.preview.toolProgress: false`。

    对于纯文本回复：

    - 简短的私聊/群组/话题预览：OpenClaw 会保持同一条预览消息，并在原地进行最终编辑
    - 大约一分钟以上的预览：OpenClaw 会先将完整回复作为新的最终消息发送，然后清理预览，因此 Telegram 可见时间戳会反映完成时间，而不是预览创建时间

    对于复杂回复（例如媒体载荷），OpenClaw 会回退到正常的最终发送流程，然后清理预览消息。

    预览流与块流是分开的。当 Telegram 显式启用了块流时，OpenClaw 会跳过预览流，以避免双重流式发送。

    Telegram-only reasoning stream:

    - `/reasoning stream` 会在生成过程中将推理发送到实时预览
    - 最终答案发送时不包含推理文本

  </Accordion>

  <Accordion title="格式化和 HTML 回退">
    发出的文本使用 Telegram `parse_mode: "HTML"`。

    - 类 Markdown 文本会被渲染为 Telegram 安全的 HTML。
    - 原始模型 HTML 会被转义，以减少 Telegram 解析失败。
    - 如果 Telegram 拒绝解析后的 HTML，OpenClaw 会重试为纯文本。

    链接预览默认启用，可通过 `channels.telegram.linkPreview: false` 禁用。

  </Accordion>

  <Accordion title="原生命令和自定义命令">
    Telegram 命令菜单注册在启动时通过 `setMyCommands` 处理。

    原生命令默认值：

    - `commands.native: "auto"` 为 Telegram 启用原生命令

    添加自定义命令菜单项：

```json5
{
  channels: {
    telegram: {
      customCommands: [
        { command: "backup", description: "Git 备份" },
        { command: "generate", description: "创建图像" },
      ],
    },
  },
}
```

    规则：

    - 名称会被规范化（去除前导 `/`，转为小写）
    - 有效模式：`a-z`、`0-9`、`_`，长度 `1..32`
    - 自定义命令不能覆盖原生命令
    - 冲突/重复项会被跳过并记录日志

    注意：

    - 自定义命令只会出现在菜单中；它们不会自动实现行为
    - 即使 Telegram 菜单中未显示，插件/技能命令在输入时仍可工作

    如果原生命令被禁用，内置命令会被移除。自定义/插件命令在配置后仍可能注册。

    常见设置失败：

    - `setMyCommands failed` 且提示 `BOT_COMMANDS_TOO_MUCH`，表示在裁剪后 Telegram 菜单仍然溢出；请减少插件/技能/自定义命令，或禁用 `channels.telegram.commands.native`。
    - `deleteWebhook`、`deleteMyCommands` 或 `setMyCommands` 失败并提示 `404: Not Found`，而直接使用 Bot API curl 命令却正常，可能意味着 `channels.telegram.apiRoot` 被设置成了完整的 `/bot<TOKEN>` 端点。`apiRoot` 必须只包含 Bot API 根地址，`openclaw doctor --fix` 会移除意外附加的 `/bot<TOKEN>`。
    - `getMe returned 401` 表示 Telegram 拒绝了配置的 bot token。请使用当前的 BotFather token 更新 `botToken`、`tokenFile` 或 `TELEGRAM_BOT_TOKEN`；OpenClaw 会在轮询前停止，因此这不会被报告为 webhook 清理失败。
    - `setMyCommands failed` 且出现网络/fetch 错误，通常表示到 `api.telegram.org` 的出站 DNS/HTTPS 被阻止。

    ### 设备配对命令（`device-pair` 插件）

    安装了 `device-pair` 插件时：

    1. `/pair` 生成设置代码
    2. 在 iOS 应用中粘贴代码
    3. `/pair pending` 列出待处理请求（包括角色/范围）
    4. 批准请求：
       - `/pair approve <requestId>` 用于显式批准
       - 当只有一个待处理请求时使用 `/pair approve`
       - `/pair approve latest` 用于最近的请求

    设置代码包含一个短期有效的启动令牌。内置的启动接管会将主节点令牌保持在 `scopes: []`；任何接管的操作员令牌都仅限于 `operator.approvals`、`operator.read`、`operator.talk.secrets` 和 `operator.write`。启动范围检查带有角色前缀，因此操作员允许列表只满足操作员请求；非操作员角色仍然需要其各自角色前缀下的 scopes。

    如果设备使用更改后的认证信息重试（例如角色/scopes/公钥），之前待处理的请求会被新请求取代，而新请求会使用不同的 `requestId`。批准前请重新运行 `/pair pending`。

    更多详情：[配对](/channels/pairing#pair-via-telegram-recommended-for-ios)。

  </Accordion>

  <Accordion title="内联按钮">
    配置内联键盘范围：

```json5
{
  channels: {
    telegram: {
      capabilities: {
        inlineButtons: "allowlist",
      },
    },
  },
}
```

    按账号覆盖：

```json5
{
  channels: {
    telegram: {
      accounts: {
        main: {
          capabilities: {
            inlineButtons: "allowlist",
          },
        },
      },
    },
  },
}
```

    范围：

    - `off`
    - `dm`
    - `group`
    - `all`
    - `allowlist`（默认）

    旧版 `capabilities: ["inlineButtons"]` 映射为 `inlineButtons: "all"`。

    消息动作示例：

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  message: "请选择一个选项：",
  buttons: [
    [
      { text: "是", callback_data: "yes" },
      { text: "否", callback_data: "no" },
    ],
    [{ text: "取消", callback_data: "cancel" }],
  ],
}
```

    回调点击会作为文本传给代理：
    `callback_data: <value>`

  </Accordion>

  <Accordion title="面向代理和自动化的 Telegram 消息动作">
    Telegram 工具动作包括：

    - `sendMessage`（`to`、`content`、可选 `mediaUrl`、`replyToMessageId`、`messageThreadId`）
    - `react`（`chatId`、`messageId`、`emoji`）
    - `deleteMessage`（`chatId`、`messageId`）
    - `editMessage`（`chatId`、`messageId`、`content`）
    - `createForumTopic`（`chatId`、`name`、可选 `iconColor`、`iconCustomEmojiId`）

    渠道消息动作提供更易用的别名（`send`、`react`、`delete`、`edit`、`sticker`、`sticker-search`、`topic-create`）。

    控制开关：

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker`（默认：禁用）

    注意：`edit` 和 `topic-create` 目前默认启用，并且没有单独的 `channels.telegram.actions.*` 开关。
    运行时发送使用的是当前生效的配置/密钥快照（启动/重载），因此动作路径不会对每次发送临时重新解析 SecretRef。

    反应移除语义：[/tools/reactions](/tools/reactions)

  </Accordion>

  <Accordion title="回复线程标签">
    Telegram 支持在生成输出中使用显式回复线程标签：

    - `[[reply_to_current]]` 回复触发消息
    - `[[reply_to:<id>]]` 回复特定的 Telegram 消息 ID

    `channels.telegram.replyToMode` 控制处理方式：

    - `off`（默认）
    - `first`
    - `all`

    当启用回复线程且原始 Telegram 文本或标题可用时，OpenClaw 会自动包含原生 Telegram 引用摘录。Telegram 对原生引用文本的上限是 1024 个 UTF-16 代码单元，因此更长的消息会从开头截取引用；如果 Telegram 拒绝该引用，则回退为普通回复。

    注意：`off` 会禁用隐式回复线程。显式的 `[[reply_to_*]]` 标签仍会被遵循。

  </Accordion>

  <Accordion title="论坛话题和线程行为">
    论坛超级群组：

    - 话题会话键追加 `:topic:<threadId>`
    - 回复和输入状态会定位到该话题线程
    - 话题配置路径：
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    普通话题（`threadId=1`）特殊处理：

    - 消息发送时省略 `message_thread_id`（Telegram 会拒绝 `sendMessage(...thread_id=1)`）
    - 输入状态操作仍会包含 `message_thread_id`

    话题继承：话题条目会继承群组设置，除非被覆盖（`requireMention`、`allowFrom`、`skills`、`systemPrompt`、`enabled`、`groupPolicy`）。
    `agentId` 仅适用于话题，不会从群组默认值继承。

    **按话题的代理路由**：每个话题都可以通过在话题配置中设置 `agentId` 路由到不同的代理。这样每个话题都有自己独立的工作区、记忆和会话。示例：

    ```json5
    {
      channels: {
        telegram: {
          groups: {
            "-1001234567890": {
              topics: {
                "1": { agentId: "main" },      // 普通话题 → main 代理
                "3": { agentId: "zu" },        // 开发话题 → zu 代理
                "5": { agentId: "coder" }      // 代码审查 → coder 代理
              }
            }
          }
        }
      }
    }
    ```

    然后每个话题都有自己的会话键：`agent:zu:telegram:group:-1001234567890:topic:3`

    **持久化 ACP 话题绑定**：论坛话题可以通过顶层的类型化 ACP 绑定来固定 ACP harness 会话（`bindings[]`，`type: "acp"`，`match.channel: "telegram"`，`peer.kind: "group"`，以及类似 `-1001234567890:topic:42` 的带话题限定 ID）。当前仅适用于群组/超级群组中的论坛话题。参见 [ACP 代理](/tools/acp-agents)。

    **从聊天中按线程启动 ACP**：`/acp spawn <agent> --thread here|auto` 会将当前话题绑定到一个新的 ACP 会话；后续消息会直接路由到那里。OpenClaw 会将启动确认固定在该话题中。需要 `channels.telegram.threadBindings.spawnAcpSessions=true`。

    模板上下文暴露 `MessageThreadId` 和 `IsForum`。带有 `message_thread_id` 的私聊仍保持私聊路由，但会使用感知线程的会话键。

  </Accordion>

  <Accordion title="音频、视频和贴纸">
    ### 音频消息

    Telegram 区分语音消息与音频文件。

    - 默认：音频文件行为
    - 在代理回复中使用标签 `[[audio_as_voice]]` 强制按语音消息发送
    - 入站语音消息转写会在代理上下文中被标记为机器生成的、未受信任的文本；提及检测仍使用原始转写，因此带提及门控的语音消息仍可正常工作。

    消息动作示例：

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  media: "https://example.com/voice.ogg",
  asVoice: true,
}
```

    ### 视频消息

    Telegram 区分视频文件与视频消息。

    消息动作示例：

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  media: "https://example.com/video.mp4",
  asVideoNote: true,
}
```

    视频消息不支持标题；提供的消息文本会单独发送。

    ### 贴纸

    入站贴纸处理：

    - 静态 WEBP：下载并处理（占位符 `<media:sticker>`）
    - 动画 TGS：跳过
    - 视频 WEBM：跳过

    贴纸上下文字段：

    - `Sticker.emoji`
    - `Sticker.setName`
    - `Sticker.fileId`
    - `Sticker.fileUniqueId`
    - `Sticker.cachedDescription`

    贴纸缓存文件：

    - `~/.openclaw/telegram/sticker-cache.json`

    贴纸会在可能的情况下只描述一次，并进行缓存，以减少重复的视觉调用。

    启用贴纸动作：

```json5
{
  channels: {
    telegram: {
      actions: {
        sticker: true,
      },
    },
  },
}
```

    发送贴纸动作：

```json5
{
  action: "sticker",
  channel: "telegram",
  to: "123456789",
  fileId: "CAACAgIAAxkBAAI...",
}
```

    搜索缓存贴纸：

```json5
{
  action: "sticker-search",
  channel: "telegram",
  query: "cat waving",
  limit: 5,
}
```

  </Accordion>

  <Accordion title="反应通知">
    Telegram 反应会作为 `message_reaction` 更新到达（与消息载荷分离）。

    启用后，OpenClaw 会将其排入系统事件，例如：

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    配置：

    - `channels.telegram.reactionNotifications`: `off | own | all`（默认：`own`）
    - `channels.telegram.reactionLevel`: `off | ack | minimal | extensive`（默认：`minimal`）

    注意：

    - `own` 表示仅用户对机器人发送消息的反应（通过已发送消息缓存尽力判断）。
    - 反应事件仍会遵守 Telegram 访问控制（`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`）；未授权发送者会被丢弃。
    - Telegram 不会在反应更新中提供线程 ID。
      - 非论坛群组路由到群组聊天会话
      - 论坛群组路由到群组普通话题会话（`:topic:1`），而不是精确的原始话题

    轮询/webhook 的 `allowed_updates` 会自动包含 `message_reaction`。

  </Accordion>

  <Accordion title="确认反应">
    `ackReaction` 会在 OpenClaw 处理入站消息时发送一个确认表情。

    解析顺序：

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - 代理身份表情回退（`agents.list[].identity.emoji`，否则为 "👀"）

    注意：

    - Telegram 期望使用 Unicode 表情符号（例如 "👀"）。
    - 使用 `""` 可为某个渠道或账号禁用该反应。

  </Accordion>

  <Accordion title="来自 Telegram 事件和命令的配置写入">
    渠道配置写入默认启用（`configWrites !== false`）。

    Telegram 触发的写入包括：

    - 群组迁移事件（`migrate_to_chat_id`），用于更新 `channels.telegram.groups`
    - `/config set` 和 `/config unset`（需要启用命令）

    禁用：

```json5
{
  channels: {
    telegram: {
      configWrites: false,
    },
  },
}
```

  </Accordion>

  <Accordion title="长轮询与 webhook">
    默认使用长轮询。若使用 webhook 模式，请设置 `channels.telegram.webhookUrl` 和 `channels.telegram.webhookSecret`；可选项包括 `webhookPath`、`webhookHost`、`webhookPort`（默认分别为 `/telegram-webhook`、`127.0.0.1`、`8787`）。

    本地监听器绑定到 `127.0.0.1:8787`。若要公开接入，请在本地端口前放置反向代理，或有意将 `webhookHost` 设置为 `"0.0.0.0"`。

    webhook 模式会在向 Telegram 返回 `200` 之前验证请求守卫、Telegram secret token 和 JSON 主体。
    然后 OpenClaw 会通过与长轮询相同的按聊天/按话题 bot 通道异步处理更新，因此缓慢的代理轮次不会阻塞 Telegram 的投递确认。

  </Accordion>

  <Accordion title="限制、重试和 CLI 目标">
    - `channels.telegram.textChunkLimit` 默认值为 4000。
    - `channels.telegram.chunkMode="newline"` 在按长度拆分前优先按段落边界（空行）拆分。
    - `channels.telegram.mediaMaxMb`（默认 100）限制入站和出站 Telegram 媒体大小。
    - `channels.telegram.timeoutSeconds` 覆盖 Telegram API 客户端超时（若未设置，则使用 grammY 默认值）。长轮询 bot 客户端会将配置值下限钳制到 45 秒 `getUpdates` 请求守卫以下，以免在 30 秒轮询窗口完成前中止空闲轮询。
    - `channels.telegram.pollingStallThresholdMs` 默认值为 `120000`；仅在轮询停滞误报导致重启时，在 `30000` 到 `600000` 之间调整。
    - 群上下文历史使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit`（默认 50）；`0` 表示禁用。
    - 回复/引用/转发补充上下文目前按接收到的内容传递。
    - Telegram allowlist 主要用于限制谁可以触发代理，而不是完整的补充上下文脱敏边界。
    - DM 历史控制：
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - `channels.telegram.retry` 配置适用于 Telegram 发送辅助工具（CLI/工具/动作）在处理可恢复的出站 API 错误时使用。入站最终回复投递也会对 Telegram 预连接失败使用有界的安全发送重试，但不会重试可能导致可见消息重复的歧义性发送后网络封包。

    CLI 发送目标可以是数字聊天 ID 或用户名：

```bash
openclaw message send --channel telegram --target 123456789 --message "hi"
openclaw message send --channel telegram --target @name --message "hi"
```

    Telegram 轮询使用 `openclaw message poll`，并支持论坛话题：

```bash
openclaw message poll --channel telegram --target 123456789 \
  --poll-question "Ship it?" --poll-option "Yes" --poll-option "No"
openclaw message poll --channel telegram --target -1001234567890:topic:42 \
  --poll-question "Pick a time" --poll-option "10am" --poll-option "2pm" \
  --poll-duration-seconds 300 --poll-public
```

    Telegram 专用投票标志：

    - `--poll-duration-seconds`（5-600）
    - `--poll-anonymous`
    - `--poll-public`
    - 用于论坛话题的 `--thread-id`（或使用 `:topic:` 目标）

    Telegram 发送还支持：

    - 当 `channels.telegram.capabilities.inlineButtons` 允许时，使用带 `buttons` 块的 `--presentation` 进行内联键盘
    - 在机器人可以对该聊天进行置顶时，使用 `--pin` 或 `--delivery '{"pin":true}'` 请求置顶发送
    - 使用 `--force-document` 将出站图片和 GIF 作为文档发送，而不是压缩照片或动图上传

    动作开关：

    - `channels.telegram.actions.sendMessage=false` 会禁用出站 Telegram 消息，包括投票
    - `channels.telegram.actions.poll=false` 会禁用 Telegram 投票创建，但保留普通发送可用

  </Accordion>

  <Accordion title="Telegram 中的执行审批">
    Telegram 支持在审批者私聊中进行执行审批，并可选地在发起聊天或话题中发布提示。审批者必须是数字形式的 Telegram 用户 ID。

    配置路径：

    - `channels.telegram.execApprovals.enabled`（当至少有一个审批者可解析时自动启用）
    - `channels.telegram.execApprovals.approvers`（回退到 `commands.ownerAllowFrom` 中的数字所有者 ID）
    - `channels.telegram.execApprovals.target`: `dm`（默认）| `channel` | `both`
    - `agentFilter`、`sessionFilter`

    `channels.telegram.allowFrom`、`groupAllowFrom` 和 `defaultTo` 控制谁可以与机器人对话以及它发送普通回复的位置。它们不会让某人成为执行审批者。当没有命令所有者时，首次批准的私聊配对会引导生成 `commands.ownerAllowFrom`，因此单所有者设置仍可工作，而无需在 `execApprovals.approvers` 中重复 ID。

    渠道投递会在聊天中显示命令文本；仅在受信任的群组/话题中启用 `channel` 或 `both`。当提示落在论坛话题中时，OpenClaw 会保留该话题用于审批提示和后续流程。执行审批默认在 30 分钟后过期。

    内联审批按钮还需要 `channels.telegram.capabilities.inlineButtons` 允许目标界面（`dm`、`group` 或 `all`）。以 `plugin:` 为前缀的审批 ID 通过插件审批解析；其他则先通过执行审批解析。

    参见 [执行审批](/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>

## 错误回复控制

当代理遇到投递或提供方错误时，Telegram 可以选择回复错误文本，或者将其静默处理。以下两个配置键控制此行为：

| 键                                  | 取值              | 默认值   | 描述                                                                                           |
| ----------------------------------- | ----------------- | ------- | ---------------------------------------------------------------------------------------------- |
| `channels.telegram.errorPolicy`     | `reply`, `silent` | `reply` | `reply` 会向聊天发送一条友好的错误消息。`silent` 则完全抑制错误回复。 |
| `channels.telegram.errorCooldownMs` | number (ms)       | `60000` | 同一聊天两次错误回复之间的最小时间间隔。可防止故障期间错误消息刷屏。        |

支持按账号、按群组和按主题覆盖配置（继承规则与其他 Telegram 配置键相同）。

```json5
{
  channels: {
    telegram: {
      errorPolicy: "reply",
      errorCooldownMs: 120000,
      groups: {
        "-1001234567890": {
          errorPolicy: "silent", // 在此群组中抑制错误
        },
      },
    },
  },
}
```

## 故障排查

<AccordionGroup>
  <Accordion title="机器人不响应未提及的群组消息">

    - 如果 `requireMention=false`，Telegram 隐私模式必须允许完整可见性。
      - BotFather: `/setprivacy` -> Disable
      - 然后从群组中移除机器人并重新添加
    - 当配置期望接收未提及的群组消息时，`openclaw channels status` 会发出警告。
    - `openclaw channels status --probe` 可以检查显式的数字群组 ID；通配符 `"*"` 不能进行成员探测。
    - 快速会话测试：`/activation always`。

  </Accordion>

  <Accordion title="机器人完全看不到群组消息">

    - 当存在 `channels.telegram.groups` 时，群组必须被列出（或包含 `"*"`）
    - 验证机器人是否已加入该群组
    - 查看日志：`openclaw logs --follow` 获取跳过原因

  </Accordion>

  <Accordion title="命令部分可用或完全不可用">

    - 授权你的发送者身份（配对和/或数字 `allowFrom`）
    - 即使群组策略为 `open`，命令授权仍然适用
    - `setMyCommands failed` 并带有 `BOT_COMMANDS_TOO_MUCH` 表示原生菜单条目过多；减少插件/技能/自定义命令，或禁用原生菜单
    - 启动时的 `deleteMyCommands` / `setMyCommands` 调用有边界限制，并会在请求超时后通过 Telegram 的传输回退重试一次。持续的网络/fetch 错误通常表示到 `api.telegram.org` 的 DNS/HTTPS 可达性问题

  </Accordion>

  <Accordion title="启动时报告未授权令牌">

    - `getMe returned 401` 是 Telegram 对所配置机器人令牌的身份验证失败。
    - 在 BotFather 中重新复制或重新生成机器人令牌，然后更新 `channels.telegram.botToken`、`channels.telegram.tokenFile`、`channels.telegram.accounts.<id>.botToken`，或默认账号的 `TELEGRAM_BOT_TOKEN`。
    - 启动期间的 `deleteWebhook 401 Unauthorized` 也是认证失败；把它视为“没有 webhook 存在”只会把同样的坏令牌失败延后到后续 API 调用。
    - 如果在轮询启动期间 `deleteWebhook` 因临时网络错误失败，OpenClaw 会检查 `getWebhookInfo`；当 Telegram 报告 webhook URL 为空时，轮询会继续，因为清理已经满足。

  </Accordion>

  <Accordion title="轮询或网络不稳定">

    - Node 22+ + 自定义 fetch/proxy 在 AbortSignal 类型不匹配时可能触发立即中止行为。
    - 某些主机会优先将 `api.telegram.org` 解析为 IPv6；损坏的 IPv6 出站可能导致 Telegram API 间歇性失败。
    - 如果日志中包含 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!`，OpenClaw 现在会将这些错误作为可恢复的网络错误重试。
    - 如果 Telegram 套接字按固定的短周期回收，请检查较低的 `channels.telegram.timeoutSeconds`；长轮询机器人客户端会把低于 `getUpdates` 请求保护值的配置值向上钳制，但较旧版本在该值低于长轮询超时时可能会在每次轮询时都中止。
    - 如果日志中包含 `Polling stall detected`，OpenClaw 会在默认情况下于 120 秒内未完成长轮询存活检测后重启轮询并重建 Telegram 传输层。
    - 当运行中的轮询账号在启动宽限期后尚未完成 `getUpdates`、运行中的 webhook 账号在启动宽限期后尚未完成 `setWebhook`，或者最近一次成功的轮询传输活动已过期时，`openclaw channels status --probe` 和 `openclaw doctor` 会发出警告。
    - 只有当长时间运行的 `getUpdates` 调用是健康的，但你的主机仍然报告错误的轮询停滞重启时，才应增加 `channels.telegram.pollingStallThresholdMs`。持续的停滞通常表明主机与 `api.telegram.org` 之间存在代理、DNS、IPv6 或 TLS 出站问题。
    - Telegram 也会为 Bot API 传输遵循进程代理环境变量，包括 `HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY` 及其小写变体。`NO_PROXY` / `no_proxy` 仍可绕过 `api.telegram.org`。
    - 如果 OpenClaw 为服务环境通过 `OPENCLAW_PROXY_URL` 配置了托管代理，且未设置标准代理环境变量，Telegram 也会将该 URL 用于 Bot API 传输。
    - 在直连出站或 TLS 不稳定的 VPS 主机上，可通过 `channels.telegram.proxy` 让 Telegram API 调用走代理：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ 默认使用 `autoSelectFamily=true`（WSL2 除外）以及 `dnsResultOrder=ipv4first`。
    - 如果你的主机是 WSL2，或者显式在仅 IPv4 行为下工作更好，可强制选择地址族：

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - RFC 2544 基准测试范围的地址（`198.18.0.0/15`）默认已经允许用于 Telegram 媒体下载。如果可信的 fake-IP 或透明代理在媒体下载期间将 `api.telegram.org` 重写为其他私有/内部/特殊用途地址，则可以选择启用仅 Telegram 绕过：

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - 该按需启用选项也可在账号级别使用：
      `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork`。
    - 如果你的代理将 Telegram 媒体主机解析到 `198.18.x.x`，请先保持危险标志关闭。Telegram 媒体默认已允许 RFC 2544 基准范围。

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` 会削弱 Telegram
      媒体 SSRF 防护。仅在受信任、由操作者控制的代理环境中使用，例如 Clash、Mihomo 或 Surge 的 fake-IP 路由，
      当它们在 RFC 2544 基准范围之外合成私有或特殊用途响应时。正常的公网 Telegram 访问请保持关闭。
    </Warning>

    - 环境变量覆盖（临时）：
      - `OPENCLAW_TELEGRAM_DISABLE_AUTO_SELECT_FAMILY=1`
      - `OPENCLAW_TELEGRAM_ENABLE_AUTO_SELECT_FAMILY=1`
      - `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER=ipv4first`
    - 验证 DNS 结果：

```bash
dig +short api.telegram.org A
dig +short api.telegram.org AAAA
```

  </Accordion>
</AccordionGroup>

更多帮助：[Channel troubleshooting](/channels/troubleshooting)。

## 配置参考

主要参考：[Configuration reference - Telegram](/gateway/config-channels#telegram)。

<Accordion title="高信号 Telegram 字段">

- 启动/认证：`enabled`、`botToken`、`tokenFile`、`accounts.*`（`tokenFile` 必须指向普通文件；符号链接会被拒绝）
- 访问控制：`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`、`groups`、`groups.*.topics.*`、顶层 `bindings[]`（`type: "acp"`）
- 执行审批：`execApprovals`、`accounts.*.execApprovals`
- 命令/菜单：`commands.native`、`commands.nativeSkills`、`customCommands`
- 线程/回复：`replyToMode`
- 流式传输：`streaming`（预览）、`streaming.preview.toolProgress`、`blockStreaming`
- 格式化/投递：`textChunkLimit`、`chunkMode`、`linkPreview`、`responsePrefix`
- 媒体/网络：`mediaMaxMb`、`timeoutSeconds`、`pollingStallThresholdMs`、`retry`、`network.autoSelectFamily`、`network.dangerouslyAllowPrivateNetwork`、`proxy`
- 自定义 API 根地址：`apiRoot`（仅 Bot API 根地址；不要包含 `/bot<TOKEN>`）
- webhook：`webhookUrl`、`webhookSecret`、`webhookPath`、`webhookHost`
- 动作/能力：`capabilities.inlineButtons`、`actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- 反应：`reactionNotifications`、`reactionLevel`
- 错误：`errorPolicy`、`errorCooldownMs`
- 写入/历史：`configWrites`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`

</Accordion>

<Note>
多账号优先级：当配置了两个或更多账号 ID 时，请设置 `channels.telegram.defaultAccount`（或包含 `channels.telegram.accounts.default`）以显式指定默认路由。否则 OpenClaw 会回退到第一个归一化后的账号 ID，并且 `openclaw doctor` 会发出警告。命名账号会继承 `channels.telegram.allowFrom` / `groupAllowFrom`，但不会继承 `accounts.default.*` 的值。
</Note>

## 相关内容

<CardGroup cols={2}>
  <Card title="配对" icon="link" href="/channels/pairing">
    将 Telegram 用户与网关配对。
  </Card>
  <Card title="群组" icon="users" href="/channels/groups">
    群组和主题白名单行为。
  </Card>
  <Card title="渠道路由" icon="route" href="/channels/channel-routing">
    将入站消息路由到代理。
  </Card>
  <Card title="安全" icon="shield" href="/gateway/security">
    威胁模型与加固。
  </Card>
  <Card title="多代理路由" icon="sitemap" href="/concepts/multi-agent">
    将群组和主题映射到代理。
  </Card>
  <Card title="故障排查" icon="wrench" href="/channels/troubleshooting">
    跨渠道诊断。
  </Card>
</CardGroup>
