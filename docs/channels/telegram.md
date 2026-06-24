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
    将机器人添加到你的群组，然后获取该群组访问所需的两个 ID：

    - 你的 Telegram 用户 ID，用于 `allowFrom` / `groupAllowFrom`
    - Telegram 群聊 ID，用作 `channels.telegram.groups` 下的键

    首次设置时，可从 `openclaw logs --follow`、转发 ID 机器人或 Bot API `getUpdates` 获取群聊 ID。群组被允许后，`/whoami@<bot_username>` 可以确认用户和群组 ID。

    以 `-100` 开头的 Telegram supergroup 负 ID 就是群聊 ID。请把它们放在 `channels.telegram.groups` 下，而不是 `groupAllowFrom` 下。

  </Step>
</Steps>

<Note>
Token 的解析顺序会考虑账号。实际上，config 值会优先于 env 回退，而 `TELEGRAM_BOT_TOKEN` 只适用于默认账号。
成功启动后，OpenClaw 会在状态目录中缓存机器人身份，最长可达 24 小时，因此重启时可以避免额外的 Telegram `getMe` 调用；更改或移除 token 会清除该缓存。
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

### Group bot identity

在 Telegram 群组和论坛话题中，对已配置机器人句柄（例如 `@my_bot`）的显式提及，会被视为在直接对选定的 OpenClaw agent 说话，即使该 agent 的 persona 名称与 Telegram 用户名不同。群组静默策略仍然适用于无关的群消息，但机器人句柄本身不被视为“别人”。

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

    仅所有者的群组设置：

```json5
{
  channels: {
    telegram: {
      enabled: true,
      dmPolicy: "pairing",
      allowFrom: ["<YOUR_TELEGRAM_USER_ID>"],
      groupPolicy: "allowlist",
      groups: {
        "<GROUP_CHAT_ID>": {
          requireMention: true,
        },
      },
    },
  },
}
```

    从群组中使用 `@<bot_username> ping` 进行测试。启用 `requireMention: true` 时，普通群消息不会触发机器人。

    示例：允许某个特定群组中的任意成员：

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

    群历史上下文默认是 `mention-only`：仅当先前群消息是发给机器人的、回复机器人消息的，或是机器人自己的消息时，才会被包含。将 `includeGroupHistoryContext: "recent"` 可在受信任的群组中包含最近的房间历史。将 `includeGroupHistoryContext: "none"` 可在下一轮中不发送任何先前的 Telegram 群历史。

```json5
{
  channels: {
    telegram: {
      includeGroupHistoryContext: "recent",
    },
  },
}
```

    获取群聊 ID：

    - 将群消息转发到 `@userinfobot` / `@getidsbot`
    - 或从 `openclaw logs --follow` 中读取 `chat.id`
    - 或检查 Bot API `getUpdates`
    - 群组被允许后，若启用了原生命令，运行 `/whoami@<bot_username>`

  </Tab>
</Tabs>

## 运行时行为

- Telegram 由 gateway 进程所有。
- 路由是确定性的：Telegram 入站会按原路回复到 Telegram（模型不会选择渠道）。
- 入站消息会规范化为共享的渠道信封，包含回复元数据、媒体占位符，以及 gateway 已观察到的 Telegram 回复所对应的持久化回复链上下文。
- 群会话按群 ID 隔离。论坛话题会追加 `:topic:<threadId>` 以保持话题隔离。
- DM 消息可以携带 `message_thread_id`；OpenClaw 会保留它用于回复。仅当 Telegram `getMe` 为机器人报告 `has_topics_enabled: true` 时，DM 话题会话才会拆分；否则 DM 会保持在平面会话中。
- 长轮询使用 grammY runner，并按聊天/按线程顺序处理。整体 runner sink 并发使用 `agents.defaults.maxConcurrent`。
- 多账号启动会限制并发的 Telegram `getMe` 探测，因此大型机器人集群不会一次性展开每个账号探测。
- 长轮询在每个 gateway 进程内部都有保护，因此同一时间只有一个活动轮询器可以使用某个 bot token。如果你仍然看到 `getUpdates` 409 冲突，可能是另一个 OpenClaw gateway、脚本或外部轮询器正在使用同一个 token。
- 默认情况下，长轮询 watchdog 会在 120 秒内没有完成的 `getUpdates` 活性时重启。仅当你的部署在长时间运行任务期间仍出现误报轮询停滞重启时，才增加 `channels.telegram.pollingStallThresholdMs`。该值以毫秒为单位，允许范围为 `30000` 到 `600000`；支持按账号覆盖。
- Telegram Bot API 不支持已读回执（`sendReadReceipts` 不适用）。

<Note>
  `channels.telegram.dm.threadReplies` 和 `channels.telegram.direct.<chatId>.threadReplies` 已被移除。升级后如果你的 config 里仍有这些键，请运行 `openclaw doctor --fix`。DM 话题路由现在遵循 Telegram `getMe.has_topics_enabled` 返回的机器人能力，这由 BotFather 的 threaded 模式控制：启用话题的机器人在 Telegram 发送 `message_thread_id` 时会使用按线程划分的 DM 会话；其他 DM 仍保持在平面会话中。
</Note>

## 功能参考

<AccordionGroup>
  <Accordion title="实时流预览（消息编辑）">
    OpenClaw 可以实时流式发送部分回复：

    - direct chats: preview message + `editMessageText`
    - groups/topics: preview message + `editMessageText`

    要求：

    - `channels.telegram.streaming` is `off | partial | block | progress` (default: `partial`)
    - short initial answer previews are debounced, then materialized after a bounded delay if the run is still active
    - `progress` keeps one editable status draft for tool progress, shows the stable status label when answer activity arrives before tool progress, clears it at completion, and sends the final answer as a normal message
    - `streaming.preview.toolProgress` controls whether tool/progress updates reuse the same edited preview message (default: `true` when preview streaming is active)
    - `streaming.preview.commandText` controls command/exec detail inside those tool-progress lines: `raw` (default, preserves released behavior) or `status` (tool label only)
    - `streaming.progress.commentary` (default: `false`) opts into assistant commentary/preamble text in the temporary progress draft
    - legacy `channels.telegram.streamMode`, boolean `streaming` values, and retired native draft preview keys are detected; run `openclaw doctor --fix` to migrate them to current streaming config

    工具进度预览更新是在工具运行时显示的短状态行，例如命令执行、文件读取、计划更新、补丁摘要，或 Codex app-server 模式中的 Codex 前言/注释文本。Telegram 默认保持这些功能启用，以匹配 `v2026.4.22` 及之后发布的 OpenClaw 行为。

    为了保留答案文本的已编辑预览但隐藏工具进度行，请设置：

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

    要保留工具进度可见，但隐藏命令/执行文本，请设置：

```json
{
  "channels": {
    "telegram": {
      "streaming": {
        "mode": "partial",
        "preview": {
          "commandText": "status"
        }
      }
    }
  }
}
```

    当你想要可见的工具进度，但不希望把最终答案编辑到同一条消息中时，请使用 `progress` 模式。将命令文本策略放在 `streaming.progress` 下：

```json
{
  "channels": {
    "telegram": {
      "streaming": {
        "mode": "progress",
        "progress": {
          "toolProgress": true,
          "commandText": "status"
        }
      }
    }
  }
}
```

    仅当你希望只发送最终结果时使用 `streaming.mode: "off"`：Telegram 预览编辑会被禁用，通用工具/进度输出会被抑制，而不是作为独立状态消息发送。审批提示、媒体载荷和错误仍会通过正常的最终投递流程发送。当你只想保留答案预览编辑、同时隐藏工具进度状态行时，请使用 `streaming.preview.toolProgress: false`。

    <Note>
      Telegram 选中文本引用回复是一个例外。当 `replyToMode` 为 `"first"`、`"all"` 或 `"batched"`，且入站消息包含选中的引用文本时，OpenClaw 会通过 Telegram 原生的引用回复路径发送最终答案，而不是编辑答案预览，因此 `streaming.preview.toolProgress` 无法在该轮展示简短状态行。没有选中文本引用的当前消息回复仍会保留预览流。若工具进度可见性比原生引用回复更重要，请将 `replyToMode` 设为 `"off"`；或者将 `streaming.preview.toolProgress` 设为 `false` 以接受这一权衡。
    </Note>

    对于纯文本回复：

    - 短 DM/群组/话题预览：OpenClaw 会保留同一条预览消息，并在原位完成最终编辑
    - 分成多条 Telegram 消息的长文本最终回复会尽量复用现有预览作为第一个最终片段，然后只发送剩余片段
    - progress 模式下，最终回复会清除状态草稿，并使用普通最终投递，而不是把草稿编辑成答案
    - 如果最终编辑在完成文本确认前失败，OpenClaw 会改用普通最终投递并清理过期预览

    对于复杂回复（例如媒体载荷），OpenClaw 会回退到正常的最终发送流程，然后清理预览消息。

    预览流与块流是分开的。当 Telegram 显式启用了块流时，OpenClaw 会跳过预览流，以避免双重流式发送。

    推理流行为：

    - `/reasoning stream` 使用受支持渠道的推理预览路径；在 Telegram 上，它会在生成时将推理流式输出到实时预览中
    - 推理预览会在最终投递后删除；当推理需要保持可见时，请使用 `/reasoning on`
    - 最终答案发送时不包含推理文本

  </Accordion>

  <Accordion title="丰富消息格式">
    默认情况下，出站文本使用标准 Telegram HTML 消息，因此回复在当前 Telegram 客户端中都能保持可读。此兼容模式支持常规的加粗、斜体、链接、代码、剧透和引用块，但不支持 Bot API 10.1 的富文本专有块，例如原生表格、details、富媒体和公式。

    将 `channels.telegram.richMessages: true` 可启用 Bot API 10.1 富消息：

```json5
{
  channels: {
    telegram: {
      richMessages: true,
    },
  },
}
```

    启用后：

    - agent 会被告知该 bot/account 可用 Telegram 富消息。
    - Markdown 文本会通过 OpenClaw 的 Markdown IR 渲染，并作为 Telegram 富 HTML 发送。
    - 显式富 HTML 载荷会保留受支持的 Bot API 10.1 标签，例如标题、表格、details、富媒体和公式。
    - 媒体 caption 仍然使用 Telegram HTML caption，因为富消息不会替代 caption。

    这会让模型文本避开 Telegram Rich Markdown 符号，因此像 `$400-600K` 这样的货币不会被解析成数学表达式。长富文本会自动按 Telegram 的富文本和富块限制拆分。超出 Telegram 列限制的表格会作为代码块发送。

    默认：为兼容客户端而关闭。富消息需要兼容的 Telegram 客户端；当前一些 Desktop、Web、Android 以及第三方客户端会将已接受的富消息显示为不受支持。除非机器人所用的每个客户端都能渲染它们，否则请保持此选项禁用。`/status` 会显示当前 Telegram 会话是否开启了富消息。

    链接预览默认启用。`channels.telegram.linkPreview: false` 可跳过富文本的自动实体检测。

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

    设置代码会携带一个短期有效的引导 token。内置的设置代码引导仅适用于 node：首次连接会创建一个待处理的 node 请求，批准后 Gateway 会返回一个持久化的 node token，`scopes: []`。它不会返回交接后的操作员 token；操作员访问需要单独的、已批准的操作员配对或 token 流程。

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

    Mini App 按钮示例：

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  message: "打开应用：",
  presentation: {
    blocks: [
      {
        type: "buttons",
        buttons: [{ label: "启动", web_app: { url: "https://example.com/app" } }],
      },
    ],
  },
}
```

    Telegram `web_app` 按钮仅能在用户与机器人之间的私聊中使用。

    回调点击会作为文本传递给代理：
    `callback_data: <value>`

  </Accordion>

  <Accordion title="面向代理和自动化的 Telegram 消息动作">
    Telegram 工具动作包括：

    - `sendMessage` (`to`, `content`, optional `mediaUrl`, `replyToMessageId`, `messageThreadId`)
    - `react` (`chatId`, `messageId`, `emoji`)
    - `deleteMessage` (`chatId`, `messageId`)
    - `editMessage` (`chatId`, `messageId`, `content` or `caption`, optional `presentation` inline buttons; button-only edits update reply markup)
    - `createForumTopic` (`chatId`, `name`, optional `iconColor`, `iconCustomEmojiId`)

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

    注意：`off` 会禁用隐式回复线程。显式的 `[[reply_to_*]]` 标签仍然会被遵循。

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
    `topics."*"` 会为该群组中的每个话题设置默认值；精确话题 ID 仍优先于 `"*"`。

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

    **从聊天中按话题绑定的 ACP spawn**：`/acp spawn <agent> --thread here|auto` 会将当前话题绑定到一个新的 ACP 会话；后续消息会直接路由到那里。OpenClaw 会将 spawn 确认钉在话题中。需要保持 `channels.telegram.threadBindings.spawnSessions` 启用（默认：`true`）。

    模板上下文会暴露 `MessageThreadId` 和 `IsForum`。带有 `message_thread_id` 的 DM 聊天会保留回复元数据；只有当 Telegram `getMe` 为机器人报告 `has_topics_enabled: true` 时，它们才会使用按线程感知的会话键。
    先前的 `dm.threadReplies` 和 `direct.*.threadReplies` 覆盖项已被正式移除；请使用 BotFather 的 threaded 模式作为唯一事实来源，并运行 `openclaw doctor --fix` 删除过时的配置键。

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

    贴纸描述会缓存在 OpenClaw SQLite 插件状态中，以减少重复的视觉调用。

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

  <Accordion title="Ack reactions">
    `ackReaction` 会在 OpenClaw 处理入站消息时发送一个确认表情。`ackReactionScope` 决定何时真正发送该表情。

    **Emoji（`ackReaction`）解析顺序：**

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - 代理身份表情回退（`agents.list[].identity.emoji`，否则为 "👀"）

    注意：

    - Telegram 期望使用 Unicode 表情符号（例如 "👀"）。
    - 使用 `""` 可为某个渠道或账号禁用该反应。

    **Scope（`messages.ackReactionScope`）：**

    Telegram provider 会从 `messages.ackReactionScope` 读取范围（默认 `"group-mentions"`）。当前没有 Telegram 账号级或渠道级覆盖。

    取值：`"all"`（DM + 群组）、`"direct"`（仅 DM）、`"group-all"`（所有群消息，不含 DM）、`"group-mentions"`（机器人被提及时的群消息；**不含 DM** —— 这是默认值）、`"off"` / `"none"`（禁用）。

    <Note>
    默认范围（`"group-mentions"`）不会在直接消息中触发 ack reactions。若要在入站 Telegram DM 中获得 ack reaction，请将 `messages.ackReactionScope` 设为 `"direct"` 或 `"all"`。该值在 Telegram provider 启动时读取，因此需要重启 gateway 才会生效。
    </Note>

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

    在长轮询模式下，OpenClaw 只会在某个更新成功分发后持久化其重启水位线。如果某个处理器失败，该更新在同一进程内仍可重试，并且不会被写为已完成以用于重启去重。

    本地监听器绑定到 `127.0.0.1:8787`。若需要公网入口，请在本地端口前放置反向代理，或有意设置 `webhookHost: "0.0.0.0"`。

    webhook 模式会在向 Telegram 返回 `200` 之前验证请求守卫、Telegram secret token 和 JSON 主体。
    然后 OpenClaw 会通过与长轮询相同的按聊天/按话题 bot 通道异步处理更新，因此缓慢的代理轮次不会阻塞 Telegram 的投递确认。

  </Accordion>

  <Accordion title="限制、重试和 CLI 目标">
    - `channels.telegram.textChunkLimit` 默认值为 4000。
    - `channels.telegram.chunkMode="newline"` 会优先按段落边界（空行）拆分，然后再按长度拆分。
    - `channels.telegram.mediaMaxMb`（默认 100）限制入站和出站 Telegram 媒体大小。
    - `channels.telegram.mediaGroupFlushMs`（默认 500）控制 Telegram album/media group 在 OpenClaw 作为一条入站消息分发前会缓冲多长时间。如果 album 部件到达较晚可增大此值；若要降低 album 回复延迟可减小此值。
    - `channels.telegram.timeoutSeconds` 会覆盖 Telegram API 客户端超时时间（若未设置则使用 grammY 默认值）。Bot 客户端会将低于 60 秒的出站文本/typing 请求保护值配置进行截断，以免 grammY 在 OpenClaw 的传输保护和回退运行前中止可见回复投递。长轮询仍使用 45 秒的 `getUpdates` 请求保护，因此空闲轮询不会被无限期放弃。
    - `channels.telegram.pollingStallThresholdMs` 默认值为 `120000`；仅在轮询停滞误报重启时，将其调到 `30000` 到 `600000` 之间。
    - 群上下文历史使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit`（默认 50）；`0` 表示禁用。
    - reply/quote/forward 的补充上下文会在 gateway 已观察到父消息时，规范化为一个选定的对话上下文窗口；已观察消息缓存位于 OpenClaw SQLite 插件状态中，`openclaw doctor --fix` 会导入旧版 sidecar。Telegram 在更新中只包含一个浅层的 `reply_to_message`，因此超出缓存的更旧链路会受限于 Telegram 当前的更新载荷。
    - Telegram allowlist 主要用于限制谁可以触发 agent，而不是完整的补充上下文脱敏边界。
    - DM 历史控制：
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - `channels.telegram.retry` 配置适用于 Telegram 发送辅助工具（CLI/工具/动作）在处理可恢复的出站 API 错误时使用。入站最终回复投递也会对 Telegram 预连接失败使用有界的安全发送重试，但不会重试可能导致可见消息重复的歧义性发送后网络封包。

    CLI 和消息工具发送目标可以是数字 chat ID、用户名，或论坛话题目标：

```bash
openclaw message send --channel telegram --target 123456789 --message "hi"
openclaw message send --channel telegram --target @name --message "hi"
openclaw message send --channel telegram --target -1001234567890:topic:42 --message "hi topic"
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

    - `--presentation` 配合 `buttons` blocks，用于内联键盘，当 `channels.telegram.capabilities.inlineButtons` 允许时可用
    - `--pin` 或 `--delivery '{"pin":true}'`，在机器人可以在该聊天中置顶时请求置顶投递
    - `--force-document` 将出站图片、GIF 和视频作为文档发送，而不是压缩后的照片、动图媒体或视频上传

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
| `channels.telegram.errorCooldownMs` | 数字（毫秒）      | `60000` | 同一聊天两次错误回复之间的最小时间间隔。可防止故障期间错误消息刷屏。        |

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
      - BotFather：`/setprivacy` -> 禁用
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
    - `setMyCommands failed` 且返回 `BOT_COMMANDS_TOO_MUCH` 表示原生菜单条目过多；请减少插件/技能/自定义命令，或禁用原生菜单
    - `deleteMyCommands` / `setMyCommands` 启动调用以及 `sendChatAction` 输入状态调用都有上限，并会在请求超时后通过 Telegram 的传输回退重试一次。持续的网络/fetch 错误通常表示到 `api.telegram.org` 的 DNS/HTTPS 可达性有问题

  </Accordion>

  <Accordion title="启动时报告未授权令牌">

    - `getMe returned 401` 表示所配置的机器人令牌发生了 Telegram 身份验证失败。
    - 在 BotFather 中重新复制或重新生成机器人令牌，然后更新 `channels.telegram.botToken`、`channels.telegram.tokenFile`、`channels.telegram.accounts.<id>.botToken`，或默认账号的 `TELEGRAM_BOT_TOKEN`。
    - 启动期间的 `deleteWebhook 401 Unauthorized` 也属于身份验证失败；把它当作“不存在 webhook”只会把同样的坏令牌失败推迟到后续 API 调用。

  </Accordion>

  <Accordion title="轮询或网络不稳定">

    - Node 22+ + 自定义 fetch/proxy 在 AbortSignal 类型不匹配时可能触发立即中止行为。
    - 某些主机会优先将 `api.telegram.org` 解析到 IPv6；损坏的 IPv6 出站可能导致间歇性的 Telegram API 失败。
    - 如果日志包含 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!`，OpenClaw 现在会把这些错误作为可恢复的网络错误重试。
    - 在轮询启动期间，OpenClaw 会为 grammY 复用成功的启动 `getMe` 探测，因此运行器在第一次 `getUpdates` 之前不需要第二次 `getMe`。
    - 如果在轮询启动期间 `deleteWebhook` 因瞬态网络错误失败，OpenClaw 会继续进入长轮询，而不是再次发起一次轮询前控制面调用。若 webhook 仍然处于活动状态，则会以 `getUpdates` 冲突的形式显现；随后 OpenClaw 会重建 Telegram 传输并重试 webhook 清理。
    - 如果 Telegram 套接字按一个较短的固定周期回收，请检查是否设置了较低的 `channels.telegram.timeoutSeconds`；机器人客户端会将低于出站和 `getUpdates` 请求保护阈值的配置值进行钳制，但旧版本在该值低于这些阈值时，可能会让每次轮询或回复都中止。
    - 如果日志包含 `Polling stall detected`，OpenClaw 会默认在 120 秒内没有完成长轮询存活信号时重启轮询并重建 Telegram 传输。
    - 当正在运行的轮询账号在启动宽限期后尚未完成 `getUpdates`、正在运行的 webhook 账号在启动宽限期后尚未完成 `setWebhook`，或者最近一次成功的轮询传输活动已过期时，`openclaw channels status --probe` 和 `openclaw doctor` 会发出警告。
    - 仅当长时间运行的 `getUpdates` 调用是健康的，但你的主机仍然报告了错误的轮询停滞重启时，才增加 `channels.telegram.pollingStallThresholdMs`。持续性的停滞通常表明主机与 `api.telegram.org` 之间存在代理、DNS、IPv6 或 TLS 出站问题。
    - Telegram 也会尊重 Bot API 传输的进程代理环境变量，包括 `HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY` 及其小写变体。`NO_PROXY` / `no_proxy` 仍可绕过 `api.telegram.org`。
    - 如果 OpenClaw 在服务环境中通过 `OPENCLAW_PROXY_URL` 配置了托管代理，且未设置标准代理环境变量，Telegram 也会使用该 URL 进行 Bot API 传输。
    - 在直连出站/TLS 不稳定的 VPS 主机上，请通过 `channels.telegram.proxy` 路由 Telegram API 调用：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ 默认 `autoSelectFamily=true`（WSL2 例外）。Telegram 的 DNS 结果顺序会优先遵循 `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER`，然后是 `channels.telegram.network.dnsResultOrder`，再然后是进程默认值（例如 `NODE_OPTIONS=--dns-result-order=ipv4first`）；如果都不适用，Node 22+ 会回退到 `ipv4first`。
    - 如果你的主机是 WSL2，或者明确在仅 IPv4 的行为下表现更好，请强制选择地址族：

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

更多帮助：[渠道故障排查](/channels/troubleshooting)。

## 配置参考

主要参考：[Telegram 配置参考](/gateway/config-channels#telegram)。

<Accordion title="高信号 Telegram 字段">

- startup/auth: `enabled`, `botToken`, `tokenFile`, `accounts.*`（`tokenFile` 必须指向一个普通文件；拒绝符号链接）
- access control: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`, `groups.*.topics.*`, top-level `bindings[]` (`type: "acp"`)
- topic defaults: `groups.<chatId>.topics."*"` 适用于未匹配的论坛主题；精确的主题 ID 会覆盖它
- exec approvals: `execApprovals`, `accounts.*.execApprovals`
- command/menu: `commands.native`, `commands.nativeSkills`, `customCommands`
- threading/replies: `replyToMode`
- streaming: `streaming` (preview), `streaming.preview.toolProgress`, `blockStreaming`
- formatting/delivery: `textChunkLimit`, `chunkMode`, `richMessages`, `linkPreview`, `responsePrefix`
- media/network: `mediaMaxMb`, `mediaGroupFlushMs`, `timeoutSeconds`, `pollingStallThresholdMs`, `retry`, `network.autoSelectFamily`, `network.dangerouslyAllowPrivateNetwork`, `proxy`
- custom API root: `apiRoot`（仅 Bot API 根地址；不要包含 `/bot<TOKEN>`）
- webhook: `webhookUrl`, `webhookSecret`, `webhookPath`, `webhookHost`
- 动作/能力: `capabilities.inlineButtons`, `actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- 反应: `reactionNotifications`, `reactionLevel`
- 错误: `errorPolicy`, `errorCooldownMs`
- 写入/历史: `configWrites`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`

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
