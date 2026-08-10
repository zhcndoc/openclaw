---
summary: "支持状态、能力和配置的 Telegram 机器人"
read_when:
  - 处理 Telegram 功能或 webhooks 时
title: "Telegram"
---

适用于通过 grammY 的 bot 私聊和群组的生产就绪方案。长轮询是默认传输方式；webhook 模式是可选的。

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
  <Step title="在 BotFather 中创建 bot token">
    这两种流程最终都会得到一个你可以粘贴到 OpenClaw 中的 token——任选其一：

    - **聊天流程**：打开 Telegram，与 **@BotFather** 聊天（确认用户名确实是 `@BotFather`），运行 `/newbot`，按提示操作，然后保存 token。
    - **网页流程**：打开 [BotFather 的网页应用](https://t.me/BotFather?startapp)——它可在所有 Telegram 客户端中运行，包括 [web.telegram.org](https://web.telegram.org)——在 UI 中创建 bot，并复制其 token。

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

    环境变量回退：`TELEGRAM_BOT_TOKEN`（仅适用于默认账号；命名账号必须使用 `botToken` 或 `tokenFile`）。
    Telegram 不使用 `openclaw channels login telegram`；请在 config/env 中设置 token，然后启动 gateway。

  </Step>

  <Step title="启动 gateway 并批准首次 DM">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    配对码会在 1 小时后过期。

  </Step>

  <Step title="将 bot 添加到群组">
    将 bot 添加到你的群组，然后获取群组访问所需的两个 ID：

    - 你的 Telegram 用户 ID，用于 `allowFrom` / `groupAllowFrom`
    - Telegram 群聊 ID，作为 `channels.telegram.groups` 下的键

    可通过 `openclaw logs --follow`、转发 ID bot，或 Bot API `getUpdates` 获取群聊 ID。群组获准后，`/whoami@<bot_username>` 会确认用户和群组 ID。

    以 `-100` 开头的负 supergroup ID 就是群聊 ID。它们应放在 `channels.telegram.groups` 下，而不是 `groupAllowFrom`。

  </Step>
</Steps>

<Note>
token 的解析与账号相关：`tokenFile` 优先于 `botToken`，再优先于 env，而 config 总是优先于 `TELEGRAM_BOT_TOKEN`（后者仅对默认账号生效）。成功启动后，OpenClaw 会缓存 bot 身份最长 24 小时，因此重启时会跳过额外的 `getMe` 调用；更改或移除 token 会清除此缓存。
</Note>

## Telegram 侧设置

<AccordionGroup>
  <Accordion title="隐私模式和群组可见性">
    Telegram 机器人的默认设置是 **隐私模式**，这会限制它们接收哪些群消息。

    要查看所有群消息，可以：

    - 通过 `/setprivacy` 禁用隐私模式，或
    - 将机器人设为群管理员。

    切换隐私模式后，请在每个群中移除并重新添加机器人，以便 Telegram 应用该更改。

  </Accordion>

  <Accordion title="群组权限">
    管理员状态在 Telegram 群设置中控制。管理员机器人会接收所有群消息，这对于需要始终在线的群组行为很有用。
  </Accordion>

  <Accordion title="有用的 BotFather 开关">

    - `/setjoingroups` — 允许/禁止被添加到群组
    - `/setprivacy` — 群可见性行为

    如果你更喜欢通过界面而不是聊天命令进行操作，[BotFather 的网页应用](https://t.me/BotFather?startapp) 也提供相同的设置。
  </Accordion>
</AccordionGroup>

## 仪表盘迷你应用

仪表盘迷你应用会以 Telegram WebApp 的形式打开完整的 [OpenClaw 控制界面](/web/control-ui)。在与机器人进行私聊时运行 `/dashboard`，然后点击 **打开仪表盘**。Telegram 插件激活后，该命令会自动注册；无需单独启用迷你应用标志。

要求：

- `gateway.tailscale.mode: "serve"` 或 `"funnel"`，用于发布 HTTPS 迷你应用 URL。
- 您的数字 Telegram 用户 ID 必须位于所选账户的有效 `allowFrom` 中，或位于 `commands.ownerAllowFrom` 中。通配符和用户名不会授予迷你应用所有者访问权限。
- 请使用私聊。在群组中，`/dashboard` 会回复 `open this in a DM with the bot`，且不会发送按钮。
- Docker 安装：Serve/Funnel 模式要求网关与 `tailscaled` 旁路绑定到回环地址，而使用已发布端口的桥接网络无法满足这一要求。请使用 `network_mode: host` 运行网关容器，并将主机的 `tailscaled` 套接字（`/var/run/tailscale`）以及 `tailscale` CLI 挂载到容器中。

配置以下受支持的 Tailscale 发布模式之一：

```json5
{
  gateway: {
    tailscale: {
      mode: "serve", // 或 "funnel"
    },
  },
}
```

OpenClaw 会在选择已发布主机时自动使用 `gateway.tailscale.serviceName`，并在构建控制界面和 WebSocket URL 时使用 `gateway.controlUi.basePath`。

迷你应用打开时，Telegram 会提供经过签名的 WebApp `initData`。OpenClaw 会使用所选机器人账户的令牌验证其签名，拒绝缺失、无效、过期或重放的数据，提取数字 Telegram 用户 ID，并在交由控制界面处理前再次检查所有者访问权限。

如果 `/dashboard` 无法解析已发布的 HTTPS URL，它会回复：

```text
迷你应用需要 HTTPS 网关 URL。请设置 `gateway.tailscale.mode: serve` 或 `funnel`，然后重试。
```

设置上述模式之一，确保 Tailscale 正在网关主机上运行，然后重试该命令。

迷你应用是仅支持 Tailscale 的 v1 路径，不支持 Telegram Web iframe。

## 访问控制和激活

### 群组机器人身份

在群组和论坛主题中，对已配置机器人 handle 的显式提及（例如 `@my_bot`）会指向所选的 OpenClaw 代理，即使该代理的人格名称与 Telegram 用户名不同。群组静默策略仍适用于无关消息，但机器人 handle 本身绝不会是“别人”。

<Tabs>
  <Tab title="DM 策略">
    `channels.telegram.dmPolicy` 控制直接消息访问：

    - `pairing`（默认）
    - `allowlist`（至少需要在 `allowFrom` 中包含一个发送者 ID）
    - `open`（要求 `allowFrom` 包含 `"*"`)
    - `disabled`

    `dmPolicy: "open"` 且 `allowFrom: ["*"]` 会让任何发现或猜到机器人用户名的 Telegram 账号都能向机器人发起命令。仅应将其用于有意公开且工具权限严格受限的机器人；单所有者机器人应使用带数字用户 ID 的 `allowlist`。

    `channels.telegram.allowFrom` 接受数字 Telegram 用户 ID。`telegram:` / `tg:` 前缀也被接受并会被规范化。
    在多账号配置中，限制性更强的顶层 `channels.telegram.allowFrom` 是一个安全边界：账户级别的 `allowFrom: ["*"]` 不会让该账户公开，除非合并后的有效 allowlist 仍然包含显式通配符。
    `dmPolicy: "allowlist"` 且 `allowFrom` 为空会阻止所有 DM，并会被配置校验拒绝。
    设置时只要求填写数字用户 ID。如果你的配置中有来自旧版设置的 `@username` allowlist 条目，请运行 `openclaw doctor --fix` 将它们解析为数字 ID（尽力而为；需要 Telegram bot token）。
    如果你之前依赖 pairing-store allowlist 文件，`openclaw doctor --fix` 可以将条目恢复到 `channels.telegram.allowFrom`，用于 allowlist 流程（例如当 `dmPolicy: "allowlist"` 还没有显式 ID 时）。

    对于单所有者机器人，建议使用带显式数字 `allowFrom` ID 的 `dmPolicy: "allowlist"`，而不是依赖之前的 pairing 批准。

    常见误解：DM pairing 批准并不意味着“该发送者在任何地方都被授权”。pairing 只授予 DM 访问权限。如果当前还没有命令所有者，第一个被批准的 pairing 也会设置 `commands.ownerAllowFrom`，从而为仅所有者命令和 exec 批准提供一个明确的操作员账户。群组发送者授权仍然来自显式配置的 allowlist。
    要让同一个身份同时获得 DM 和群组命令授权：把你的数字 Telegram 用户 ID 放入 `channels.telegram.allowFrom`，并且对于仅所有者命令，确保 `commands.ownerAllowFrom` 包含 `telegram:<your user id>`。

    Use `channels.telegram.direct.<chatId>.tools` to set the built-in tool policy for one DM. `toolsBySender` selects a sender-specific policy by typed sender key such as `channel:telegram:<userId>` or `id:<userId>`:

```json5
{
  channels: {
    telegram: {
      direct: {
        "*": { tools: { deny: ["write", "edit"] } },
        "603767951": { tools: {} },
      },
    },
  },
}
```

    A matching `toolsBySender` entry replaces `tools` for that DM. An exact chat entry replaces the whole `"*"` entry; it does not inherit wildcard fields. Account-level `direct` replaces the root `direct` map when present and inherits it only when omitted. The selected direct policy, global policy, per-agent policy, `tools.toolsBySender`, and `agents.<id>.tools.toolsBySender` apply as intersecting layers; a deny in any layer still blocks the tool. Codex uses policy-filtered OpenClaw tools for explicitly restricted turns and keeps its native tool surface for default profile narrowing. ACP-bound sessions reject a restrictive direct policy when their runtime cannot enforce it.

    ### Finding your Telegram user ID

    更安全（无需第三方机器人）：给你的机器人发 DM，运行 `openclaw logs --follow`，读取 `from.id`。

    官方 Bot API 方法：

```bash
curl "https://api.telegram.org/bot<bot_token>/getUpdates"
```

    第三方（隐私性较差）：`@userinfobot` 或 `@getidsbot`。

  </Tab>

  <Tab title="群组策略和 allowlist">
    两项控制共同生效：

    1. **允许哪些群组**（`channels.telegram.groups`）
       - 未配置 `groups`，`groupPolicy: "open"`：任何群组都可通过 group ID 检查
       - 未配置 `groups`，`groupPolicy: "allowlist"`（默认）：在你添加 `groups` 条目（或 `"*"`）之前，所有群组都被阻止
       - 已配置 `groups`：作为 allowlist 生效（显式 ID 或 `"*"`）

    2. **群组中允许哪些发送者**（`channels.telegram.groupPolicy`）
       - `open` / `allowlist`（默认）/ `disabled`

    `groupAllowFrom` filters group senders; if unset, Telegram falls back to `allowFrom` (not the pairing store — group sender auth never inherits DM pairing-store approvals, a security boundary since `2026.2.25`).
    `groupAllowFrom` entries should be numeric Telegram user IDs (`telegram:` / `tg:` prefixes are normalized); non-numeric entries are ignored. Do not put group or supergroup chat IDs here — negative chat IDs belong under `channels.telegram.groups`.
    In multi-account configs, root `channels.telegram.groups` is the shared default for accounts that omit `groups`. An account-level `groups` map replaces the root map for that account; it is not deep-merged. An explicit empty account map (`groups: {}`) keeps that account isolated from the shared groups.
    Practical pattern for one-owner bots: set your user ID in `channels.telegram.allowFrom`, leave `groupAllowFrom` unset, and allow the target groups under `channels.telegram.groups`.
    If `channels.telegram` is entirely missing from config, runtime defaults to fail-closed `groupPolicy="allowlist"` unless `channels.defaults.groupPolicy` is explicitly set.

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

    在群组中使用 `@<bot_username> ping` 进行测试。启用 `requireMention: true` 时，普通群组消息不会触发机器人。

    允许某一个特定群组中的任何成员：

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

    只允许某一个特定群组中的特定用户：

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
      常见错误：`groupAllowFrom` 不是群组 allowlist。

      - 负的 Telegram 群组/超级群组 chat ID（`-1001234567890`）应放在 `channels.telegram.groups` 下。
      - Telegram 用户 ID（`8734062810`）应放在 `groupAllowFrom` 中，用于限制允许的群组内哪些人可以触发机器人。
      - 只有在想让允许的群组中的任意成员都能与机器人对话时，才使用 `groupAllowFrom: ["*"]`。

    </Warning>

  </Tab>

  <Tab title="提及行为">
    默认情况下，群组回复需要提及。提及可以来自：

    - 原生的 `@botusername` 提及，或
    - `agents.entries.*.groupChat.mentionPatterns` 或 `messages.groupChat.mentionPatterns` 中的提及模式

    会话级切换（仅状态，不持久化）：`/activation always`、`/activation mention`。如需持久化，请使用配置：

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

    群组历史上下文始终开启，并受 `historyLimit` 限制。将 `channels.telegram.historyLimit: 0` 可禁用群组历史窗口。`openclaw doctor --fix` 会移除已废弃的 `includeGroupHistoryContext` 键。

    获取群组 chat ID：将群组消息转发到 `@userinfobot` / `@getidsbot`，在 `openclaw logs --follow` 中读取 `chat.id`，检查 Bot API 的 `getUpdates`，或者（群组已允许后）运行 `/whoami@<bot_username>`。

  </Tab>
</Tabs>

## 运行时行为

- Telegram 运行在网关进程内。
- 路由是确定性的：Telegram 入站消息会回到 Telegram（模型不会选择频道）。
- 入站消息会规范化为共享的 channel envelope，其中包含回复元数据、媒体占位符，以及网关已观察到的回复所对应的已持久化回复链上下文。
- 群组会话按 group ID 隔离。论坛主题会追加 `:topic:<threadId>`。
- DM 消息可以携带 `message_thread_id`；OpenClaw 会为回复保留它。只有当 Telegram `getMe` 为机器人报告 `has_topics_enabled: true` 时，DM 主题会话才会拆分；否则 DM 保持在扁平会话中。
- 长轮询使用带有按聊天/按线程排序的 grammY runner。Runner sink 并发数使用 `agents.defaults.maxConcurrent`。
- 多账号启动会限制并发的 `getMe` 探测，因此大型机器人集群不会一次性对所有账号发起探测。
- 每个网关进程都会保护长轮询，因此同一时刻只能有一个活动轮询器使用某个 bot token。持久性的 `getUpdates` 409 冲突表明有另一个 OpenClaw 网关、脚本或外部轮询器正在使用相同的 token。
- 轮询 watchdog 会在 120 秒内没有完成的 `getUpdates` 活跃信号后重启。
- Telegram Bot API 不支持已读回执（`sendReadReceipts` 不适用）。

<Note>
  **升级说明：Telegram 的默认预览已更改。** 当未设置 `channels.telegram.streaming` 时，Telegram 现在会在本轮处理期间保留一个可编辑的状态草稿（代理的当前状态及其工具行），并将最终答案作为普通消息发送。此前，Telegram 会将答案文本本身流式传输到预览中。不会有任何配置失效，也不需要运行 `doctor --fix`；如需保留之前的行为，请设置：

```json5
{ channels: { telegram: { streaming: { mode: "partial" } } } }
```

</Note>

<Note>
  `channels.telegram.dm.threadReplies` 和 `channels.telegram.direct.<chatId>.threadReplies` 已被移除。如果升级后配置中仍包含这些键，请运行 `openclaw doctor --fix`。DM 主题路由现在遵循 Telegram `getMe.has_topics_enabled`（由 BotFather 的主题模式控制）：启用主题的机器人在 Telegram 发送 `message_thread_id` 时使用按主题线程划分的 DM 会话；其他 DM 则保持在扁平会话中。
</Note>

## 功能参考

<AccordionGroup>
  <Accordion title="直播预览（消息编辑）">
    OpenClaw 会在私聊、群组和话题中实时流式发送部分回复：先发送一条预览消息，然后反复执行 `editMessageText`，在原处完成最终回复。

    - `channels.telegram.streaming` 是 `off | partial | block | progress`（默认：`progress`）；设置 `mode: "partial"` 可将答案文本流式传输到预览中，而不是状态草稿
    - 较短的初始答案预览会进行防抖处理；如果运行仍处于活动状态，则会在有界延迟后生成
    - `progress` 会为工具进度保留一条可编辑的状态草稿；如果答案活动先于工具进度到达，则显示稳定的状态标签；完成时清除该草稿，并将最终答案作为普通消息发送
    - `streaming.preview.toolProgress` 控制工具/进度更新是否复用同一条已编辑的预览消息（默认：预览流式传输处于活动状态时为 `true`）
    - `streaming.preview.commandText` 控制这些行中的命令/执行详情：`raw`（默认）或 `status`（仅工具标签）
    - `streaming.progress.commentary`（默认：`false`）用于选择是否将助手评论/前言文本加入临时进度草稿
    - 系统会检测旧版 `channels.telegram.streamMode`、布尔值 `streaming` 以及已弃用的原生草稿预览键；运行 `openclaw doctor --fix` 可进行迁移

    工具进度行是在工具运行时显示的简短状态更新（命令执行、文件读取、规划更新、补丁摘要、app-server 模式下的 Codex 前言/评论）。Telegram 默认保留这些内容显示（与 `v2026.4.22` 及以后版本的已发布行为一致）。

    保留答案预览编辑，但隐藏工具进度行：

    ```json
    {
      "channels": {
        "telegram": {
          "streaming": {
            "mode": "partial",
            "preview": { "toolProgress": false }
          }
        }
      }
    }
    ```

    保留工具进度可见，但隐藏命令/执行文本：

    ```json
    {
      "channels": {
        "telegram": {
          "streaming": {
            "mode": "partial",
            "preview": { "commandText": "status" }
          }
        }
      }
    }
  }
}
```

    `progress` 模式会显示工具进度，但不会把最终答案编辑进那条消息里。将命令文本策略放在 `streaming.progress` 下：

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

    `streaming.mode: "off"` 会禁用预览编辑，并抑制通用的工具/进度闲聊，而不是把它们作为独立状态消息发送；审批提示、媒体和错误仍会通过正常的最终发送流程处理。`streaming.preview.toolProgress: false` 只保留答案预览编辑。

    <Note>
      选中的引用回复是个例外。当 `replyToMode` 为 `first`、`all` 或 `batched`，且传入消息包含已选中的引用文本时，OpenClaw 会通过 Telegram 的原生引用回复路径发送最终答案，而不是编辑答案预览，因此 `streaming.preview.toolProgress` 无法在那次显示状态行。没有选中文本的当前消息回复仍会流式发送。当工具进度可见性比原生引用回复更重要时，请将 `replyToMode` 设为 `"off"`；或者将 `streaming.preview.toolProgress` 设为 `false` 来接受这种权衡。
    </Note>

    对于仅文本回复：短预览会就地完成最终编辑；拆分为多条消息的长最终内容会复用预览作为第一块，然后只发送剩余部分；进度模式下的最终内容会清除状态草稿并使用正常的最终发送；如果在确认完成之前最终编辑失败，OpenClaw 会回退到正常的最终发送，并清理过期的预览。对于复杂回复（媒体载荷），OpenClaw 始终回退到正常的最终发送，并清理预览。

    Preview streaming and block streaming are mutually exclusive. An explicit non-`off` preview mode overrides inherited `agents.defaults.blockStreamingDefault: "on"`; explicit `streaming.block.enabled: true` overrides the preview. If a turn cannot use previews, inherited block delivery still applies.

    原因说明：`/reasoning stream` 会在生成时把推理过程流式发送到实时预览中，然后在最终发送后删除推理预览（使用 `/reasoning on` 可使其保持可见）。最终答案发送时不包含推理文本。

  </Accordion>

  <Accordion title="富消息格式化">
    默认情况下，外发文本使用标准 Telegram HTML 消息，在当前客户端中都可读：粗体、斜体、链接、代码、剧透、引用——而不是 Bot API 10.2 的仅富文本块（原生表格、details、富媒体、公式）。

    启用 Bot API 10.2 富消息：

```json5
{
  channels: {
    telegram: {
      richMessages: true,
    },
  },
}
```

    启用后：系统会告知代理该 bot/account 可用富消息（并采用受支持的 Markdown + HTML-island 编写契约）；Markdown 文本会通过 OpenClaw 的 Markdown IR 渲染为原生 Bot API 10.2 富块（标题、表格、details、清单、富媒体、公式、地图、拼贴）；媒体说明文字仍然使用 Telegram HTML caption（富消息不会取代 caption，且 caption 上限为 1024 个字符）。

    这会让模型文本远离 Telegram 的富 Markdown 标记，因此像 `$400-600K` 这样的货币表达不会被解析为数学公式。较长的富文本会自动按 Telegram 的限制拆分。超过 20 列限制的表格会回退为代码块。

    默认：关闭，以兼容客户端——某些当前的 Desktop、Web、Android 及第三方客户端会将已接受的富消息渲染为不支持。除非与该 bot 一起使用的所有客户端都能渲染它们，否则请保持关闭。`/status` 会显示当前会话的富消息是开启还是关闭。

    链接预览默认开启。`channels.telegram.linkPreview: false` 会为富文本禁用自动实体检测。

  </Accordion>

  <Accordion title="原生命令和自定义命令">
    Telegram 的命令菜单会在启动时通过 `setMyCommands` 注册。`commands.native: "auto"` 会为 Telegram 启用原生命令。

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

    规则：名称会被规范化（去掉前导 `/`、转为小写）；有效模式为 `a-z`、`0-9`、`_`，长度 1-32；自定义命令不能覆盖原生命令；冲突/重复项会被跳过并记录日志。

    When Telegram menu limits require trimming, configured custom commands come first unless omitted per-skill entries are replaced by a leading `/skill` fallback.

    Custom commands are menu entries only — they do not auto-implement behavior. Plugin/skill commands can still work when typed even if not shown in the Telegram menu. If native commands are disabled, built-ins are removed; custom/plugin commands may still register if configured.

    常见设置失败：

    - `setMyCommands failed` 且在 trim 重试后出现 `BOT_COMMANDS_TOO_MUCH`，表示菜单仍然超限；减少插件/技能/自定义命令，或禁用 `channels.telegram.commands.native`。
    - `deleteWebhook`、`deleteMyCommands` 或 `setMyCommands` 在直接使用 Bot API curl 命令可工作时却返回 `404: Not Found`，通常意味着 `channels.telegram.apiRoot` 被设置成了完整的 `/bot<TOKEN>` 端点。`apiRoot` 只能是 Bot API 根地址；`openclaw doctor --fix` 会移除意外附加的 `/bot<TOKEN>`。
    - `getMe returned 401` 表示 Telegram 拒绝了已配置的 bot token。请使用当前 BotFather token 更新 `botToken`、`tokenFile` 或 `TELEGRAM_BOT_TOKEN`（默认账号）；OpenClaw 会在轮询前停止，因此这不会被报告为 webhook 清理失败。
    - `setMyCommands failed` 且伴随网络/fetch 错误，通常表示到 `api.telegram.org` 的出站 DNS/HTTPS 被阻止。

    ### 设备配对命令（`device-pair` 插件）

    安装后：

    1. `/pair` 生成一个设置代码
    2. 将该代码粘贴到 iOS 应用中
    3. `/pair pending` 列出待处理请求（包括角色/作用域）
    4. 通过以下方式批准：`/pair approve <requestId>`、`/pair approve`（仅当只有一个待处理请求时），或 `/pair approve latest`

    如果某个设备在重试时更改了认证信息（角色、作用域、公钥），之前的待处理请求会被一个新的 `requestId` 取代；批准前请重新运行 `/pair pending`。

    更多详情： [配对](/channels/pairing#pair-via-telegram)。

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

    作用域：`off`、`dm`、`group`、`all`、`allowlist`（默认）。旧版 `capabilities: ["inlineButtons"]` 映射为 `"all"`。

    消息动作示例：

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  message: "Choose an option:",
  presentation: {
    blocks: [
      {
        type: "buttons",
        buttons: [
          { label: "Yes", action: { type: "callback", value: "yes" }, style: "success" },
          { label: "No", action: { type: "callback", value: "no" }, style: "danger" },
          { label: "Cancel", action: { type: "callback", value: "cancel" } },
        ],
      },
    ],
  },
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
        buttons: [
          {
            label: "Launch",
            action: { type: "web-app", url: "https://example.com/app" },
          },
        ],
      },
    ],
  },
}
```

    Mini App buttons only work in private chats between a user and the bot.

    Callback action values not claimed by a registered plugin interactive handler are passed to the agent as text: `callback_data: <value>`.

  </Accordion>

  <Accordion title="面向代理和自动化的 Telegram 消息动作">
    动作：

    - `sendMessage`（`to`、`content`、可选 `mediaUrl`、`replyToMessageId`、`messageThreadId`）
    - `react`（`chatId`、`messageId`、`emoji`）
    - `deleteMessage`（`chatId`、`messageId`）
    - `editMessage`（`chatId`、`messageId`、`content` 或 `caption`，可选 `presentation` 内联按钮；仅按钮编辑会更新 reply markup）
    - `createForumTopic`（`chatId`、`name`、可选 `iconColor`、`iconCustomEmojiId`）

    便捷别名：`send`、`react`、`delete`、`edit`、`sticker`、`sticker-search`、`topic-create`。

    开关控制：`channels.telegram.actions.sendMessage`、`deleteMessage`、`reactions`、`sticker`（默认：禁用）。`edit`、`createForumTopic` 和 `editForumTopic` 默认启用，没有单独的切换开关。
    运行时发送会使用启动/重载时的活动配置/密钥快照，因此动作路径不会在每次发送时重新解析 `SecretRef` 值。

    反应移除语义：[/tools/reactions](/tools/reactions)。

  </Accordion>

  <Accordion title="回复线程标签">
    生成输出中的显式回复线程标签：

    - `[[reply_to_current]]` — 回复触发消息
    - `[[reply_to:<id>]]` — 回复特定消息 ID

    `channels.telegram.replyToMode`：`off`（默认）、`first`、`all`。

    当启用回复线程且原始文本/caption 可用时，OpenClaw 会自动添加原生引用摘录。Telegram 将原生引用文本上限限制为 1024 个 UTF-16 码元；更长的消息会从开头截取引用，并在 Telegram 拒绝该引用时回退为普通回复。

    `off` 只会禁用隐式回复线程；显式的 `[[reply_to_*]]` 标签仍会被遵守。

  </Accordion>

  <Accordion title="论坛话题和线程行为">
    论坛超级群组：话题会话键会追加 `:topic:<threadId>`；回复和输入状态会定位到对应的话题线程；话题配置路径为 `channels.telegram.groups.<chatId>.topics.<threadId>`。

    通用话题（`threadId=1`）是个特殊情况：发送消息时会省略 `message_thread_id`（Telegram 会以 "thread not found" 拒绝 `sendMessage(...thread_id=1)`），但输入状态动作仍会包含 `message_thread_id`（经验证这是让输入指示器显示所必需的）。

    话题条目会继承群组设置，除非被覆盖（`requireMention`、`allowFrom`、`skills`、`systemPrompt`、`enabled`、`groupPolicy`）。`agentId` 只适用于话题，不会从群组默认值继承。`topics."*"` 会为该群组中的每个话题设置默认值；精确的话题 ID 仍优先于 `"*"`。

    **按话题代理路由**：每个话题都可以通过话题配置中的 `agentId` 路由到不同的代理，为其提供自己的工作区、记忆和会话：

    ```json5
    {
      channels: {
        telegram: {
          groups: {
            "-1001234567890": {
              topics: {
                "1": { agentId: "main" },      // 通用话题 -> 主代理
                "3": { agentId: "zu" },        // 开发话题 -> zu 代理
                "5": { agentId: "coder" }      // 代码审查 -> coder 代理
              }
            }
          }
        }
      }
    }
    ```

    然后每个话题都会有自己的会话键，例如 `agent:zu:telegram:group:-1001234567890:topic:3`。

    **持久化 ACP 话题绑定**：论坛话题可以通过顶层的类型绑定（`bindings[]`，其中 `type: "acp"`、`match.channel: "telegram"`、`peer.kind: "group"`，以及类似 `-1001234567890:topic:42` 的带话题限定的 id）来固定 ACP harness 会话。目前仅适用于群组/超级群组中的论坛话题。参见 [ACP Agents](/tools/acp-agents)。

    **从聊天中进行线程绑定的 ACP spawn**：`/acp spawn <agent> --thread here|auto` 会将当前话题绑定到一个新的 ACP 会话；后续消息会直接路由到那里，OpenClaw 会将 spawn 确认固定在该话题中。由 `session.threadBindings.spawnSessions` 控制（默认：`true`）。

    模板上下文暴露 `MessageThreadId` 和 `IsForum`。带有 `message_thread_id` 的 DM 聊天会保留回复元数据，但只有当 Telegram `getMe` 报告 `has_topics_enabled: true` 时才会使用线程感知的会话键。
    已弃用的 `dm.threadReplies` 和 `direct.*.threadReplies` 覆盖项已移除；BotFather 的 threaded mode 是唯一的真实来源。运行 `openclaw doctor --fix` 可移除过期的配置键。

  </Accordion>

  <Accordion title="音频、视频和贴纸">
    ### 音频消息

    Telegram 区分语音消息和音频文件。默认：音频文件行为；在代理回复中添加标签 `[[audio_as_voice]]` 可强制按语音消息发送。传入的语音消息转写在代理上下文中会被视为机器生成的、不可信的文本，但实体检测仍会使用原始转写，因此基于 mention 的语音消息仍然可以正常工作。

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

    Telegram 区分视频文件和视频消息（video note）。视频消息不支持 caption；提供的消息文本会单独发送。

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  media: "https://example.com/video.mp4",
  asVideoNote: true,
}
```

    ### 位置和场所

    使用现有的 `send` 动作，并提供一个独立的 `location` 对象。坐标会发送原生位置标记；同时添加 `name` 和 `address` 会发送原生场所卡片。位置发送不能与消息文本或媒体组合使用。

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  location: {
    latitude: 48.858844,
    longitude: 2.294351,
    accuracy: 12,
    name: "埃菲尔铁塔",
    address: "战神广场，巴黎",
  },
}
```

    ### 贴纸

    传入：会下载并处理静态 WEBP（占位符 `<media:sticker>`）；动画 TGS 和视频 WEBM 会被跳过。

    贴纸上下文字段：`Sticker.emoji`、`Sticker.setName`、`Sticker.fileId`、`Sticker.fileUniqueId`、`Sticker.cachedDescription`。描述会缓存在 OpenClaw SQLite 插件状态中，以减少重复的视觉调用。

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

    发送：

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
    Telegram 的反应会作为 `message_reaction` 更新到达，独立于消息载荷。当启用时，OpenClaw 会将其排入系统事件，例如 `Telegram reaction added: 👍 by Alice (@alice) on msg 42`。

    - `channels.telegram.reactionNotifications`：`off | own | all`（默认：`own`）
    - `channels.telegram.reactionLevel`：`off | ack | minimal | extensive`（默认：`minimal`）

    `own` 表示仅用户对 bot 发送消息的反应（通过已发送消息缓存尽力实现）。反应事件仍会遵守 Telegram 访问控制（`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`）；未授权发送者会被丢弃。

    Telegram does not provide topic metadata in reaction updates. Ordinary non-forum groups remain chat-scoped. Forum and channel Direct Messages reactions recover the originating topic from OpenClaw's bounded message cache (keyed by account, chat, and message ID), so topic config, topic agents, and conversation bindings still apply. If the cached topic is missing or belongs to the wrong scope, OpenClaw skips the reaction notification and logs a warning instead of falling back to General or the base chat.

    轮询/webhook 的 `allowed_updates` 会自动包含 `message_reaction`。

  </Accordion>

  <Accordion title="确认反应">
    `ackReaction` 会在 OpenClaw 处理传入消息时发送一个确认表情。`messages.ackReactionScope` 决定它*何时*发送。

    **表情解析顺序：**

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - 代理身份表情兜底（`agents.entries.*.identity.emoji`，否则为 "👀"）

    Telegram 期望的是 Unicode 表情（例如 "👀"）；使用 `""` 可为某个频道或账号禁用该反应。

    **作用域（`messages.ackReactionScope`，默认 `"group-mentions"`；目前没有 Telegram 账号或 Telegram 频道级覆盖）：**

    `all`（DM + 群组，包括环境房间事件）、`direct`（仅 DM）、`group-all`（除环境房间事件外的所有群消息，不含 DM）、`group-mentions`（bot 被提及的群组；**不含 DM** — 默认）、`off` / `none`（禁用）。

    <Note>
    默认作用域（`group-mentions`）不会在 DM 或环境房间事件中触发 ack reactions。DM 使用 `direct` 或 `all`；只有 `all` 会确认环境房间事件。该值在 Telegram provider 启动时读取，因此需要重启网关才能使更改生效。
    </Note>

  </Accordion>

  <Accordion title="来自 Telegram 事件和命令的配置写入">
    默认启用频道配置写入（`configWrites !== false`）。Telegram 触发的写入包括群组迁移事件（`migrate_to_chat_id`、更新 `channels.telegram.groups`）以及 `/config set` / `/config unset`（需要启用命令）。

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

  <Accordion title="长轮询 vs webhook">
    默认是长轮询。对于 webhook 模式，请设置 `channels.telegram.webhookUrl` 和 `channels.telegram.webhookSecret`；可选的还有 `webhookPath`（默认 `/telegram-webhook`）、`webhookHost`（默认 `127.0.0.1`）、`webhookPort`（默认 `8787`）、`webhookCertPath`（自签名证书 PEM，适用于直连 IP 或无域名设置）。

    在长轮询模式下，OpenClaw 只有在某个更新成功分发之后才会持久化其重启水位线；如果处理器失败，该更新会在同一进程中保持可重试，而不会被标记为已完成。

    本地监听器默认绑定到 `127.0.0.1:8787`。对于公网接入，请在本地端口前面放置反向代理，或有意设置 `webhookHost: "0.0.0.0"`。

    webhook 模式会先验证请求守卫、Telegram secret token 和 JSON body，然后在返回空的 `200` 之前将更新提交到其持久化入口队列。成功的持久化接纳会包含 `x-openclaw-delivery-accepted: durable`；健康检查、路由、认证、验证以及存储错误响应不会包含该头。反向代理和主机控制器可以要求该头，以区分 OpenClaw 的接纳与普通空 `200`，而不必通过响应时间推断是否被接纳。

    在持久化写入之后，OpenClaw 会通过核心通道入口 drain（按聊天/按话题通道，在 turn 接纳时完成，接纳前具有 stall 超时）来认领并处理更新。缓慢的代理轮次不会占用 Telegram 的投递 ACK。

  </Accordion>

  <Accordion title="限制和 CLI 目标">
    - `channels.telegram.textChunkLimit` 默认 4000；`streaming.chunkMode="newline"` 优先按段落边界（空行）再按长度拆分。
    - `channels.telegram.mediaMaxMb`（默认 100）限制传入和传出媒体大小。
    - 群组上下文历史使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit`（默认 50）；`0` 表示禁用。
    - 回复/引用/转发的补充上下文会在网关观察到父消息后，规范化到一个已选定的会话上下文窗口中；被观察到的消息缓存保存在 OpenClaw SQLite 插件状态里，`openclaw doctor --fix` 会导入旧版 sidecar。Telegram 每次更新只包含一个浅层 `reply_to_message`，因此比缓存更早的链路只能受限于该载荷。
    - Telegram allowlist 主要用于限制谁可以触发代理，而不是一个完整的补充上下文脱敏边界。
    - DM 历史：`channels.telegram.dmHistoryLimit`、`channels.telegram.dms["<user_id>"].historyLimit`。

    CLI 和 message-tool 的发送目标可接受数字聊天 ID、用户名或论坛话题目标：

```bash
openclaw message send --channel telegram --target 123456789 --message "hi"
openclaw message send --channel telegram --target @name --message "hi"
openclaw message send --channel telegram --target -1001234567890:topic:42 --message "hi topic"
```

    投票使用 `openclaw message poll`，并支持论坛话题：

```bash
openclaw message poll --channel telegram --target 123456789 \
  --poll-question "Ship it?" --poll-option "Yes" --poll-option "No"
openclaw message poll --channel telegram --target -1001234567890:topic:42 \
  --poll-question "Pick a time" --poll-option "10am" --poll-option "2pm" \
  --poll-duration-seconds 300 --poll-public
```

    仅 Telegram 的投票标志：`--poll-duration-seconds`（5-600）、`--poll-anonymous`、`--poll-public`、`--thread-id`（或 `:topic:` 目标）。`--poll-option` 可重复 2-12 次（Telegram 的选项上限）。

    Telegram 发送还支持 `--presentation` 搭配 `buttons` 块用于内联键盘（当 `channels.telegram.capabilities.inlineButtons` 允许时）、`--pin` 或 `--delivery '{"pin":true}'` 用于在 bot 可以在该聊天中置顶时请求置顶发送，以及 `--force-document` 用于将外发图片、GIF 和视频作为文档发送，而不是压缩/动画/视频上传。

    动作开关：`channels.telegram.actions.sendMessage=false` 会禁用所有外发消息，包括投票；`channels.telegram.actions.poll=false` 会禁用投票创建，但保留普通发送启用。

  </Accordion>

  <Accordion title="Telegram 中的执行审批">
    Telegram 支持在审批者私聊中进行执行审批，并可选地在发起聊天或话题中发布提示。审批者必须是数字形式的 Telegram 用户 ID。

    - `channels.telegram.execApprovals.enabled`（`"auto"` 在至少有一个审批者可解析时启用）
    - `channels.telegram.execApprovals.approvers`（回退到来自 `commands.ownerAllowFrom` 的数字 owner ID）
    - `channels.telegram.execApprovals.target`：`dm`（默认）| `channel` | `both`
    - `agentFilter`、`sessionFilter`

    `channels.telegram.allowFrom`、`groupAllowFrom` 和 `defaultTo` 控制谁可以与 bot 对话，以及它向哪里发送普通回复——它们不会让某人成为执行审批者。当不存在命令 owner 时，首次批准的 DM 配对会引导生成 `commands.ownerAllowFrom`，因此单 owner 配置无需在 `execApprovals.approvers` 下重复 ID 也能工作。

    频道投递会在聊天中显示命令文本；只有在受信任的群组/话题中才启用 `channel` 或 `both`。当提示落到论坛话题中时，OpenClaw 会为审批提示和后续跟进保留该话题。执行审批默认 30 分钟后过期。

    内联审批按钮还需要 `channels.telegram.capabilities.inlineButtons` 允许目标界面（`dm`、`group` 或 `all`）。以 `plugin:` 为前缀的审批 ID 通过插件审批解析；其他则先通过执行审批解析。

    参见 [执行审批](/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>

## 错误回复控制

当代理遇到投递或提供方错误时，错误策略会控制错误消息是否会发送到 Telegram 聊天中：

| 键                              | 值                        | 默认值    | 描述                                                                                                                                                                |
| ------------------------------- | -------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `channels.telegram.errorPolicy` | `always`, `once`, `silent` | `always`  | `always` 会将每条错误消息都发送到聊天中。`once` 会在内置冷却窗口内，每个唯一的错误消息只发送一次。`silent` 则永远不会将错误消息发送到聊天中。 |

支持按账号、按群组和按主题覆盖配置（继承规则与其他 Telegram 配置键相同）。

```json5
{
  channels: {
    telegram: {
      errorPolicy: "always",
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

    - 如果 `requireMention=false`，Telegram 隐私模式必须允许完全可见：BotFather `/setprivacy` -> Disable，然后将机器人从群组中移除并重新添加。
    - 当配置期望接收未提及的群组消息时，`openclaw channels status` 会发出警告。
    - `openclaw channels status --probe` 会检查显式的数字群组 ID；通配符 `"*"` 无法进行成员资格探测。
    - 快速会话测试：`/activation always`。

  </Accordion>

  <Accordion title="机器人完全看不到群组消息">

    - 当 `channels.telegram.groups` 存在时，必须将该群组列出（或包含 `"*"`）。
    - 验证机器人是否已加入该群组。
    - 查看 `openclaw logs --follow` 中的跳过原因。

  </Accordion>

  <Accordion title="命令部分可用或完全不可用">

    - 授权你的发送者身份（配对和/或数字 `allowFrom`）；即使群组策略为 `open`，命令授权仍然适用。
    - `setMyCommands failed` 且返回 `BOT_COMMANDS_TOO_MUCH` 表示原生菜单条目过多；减少插件/技能/自定义命令，或禁用原生菜单。
    - `deleteMyCommands` / `setMyCommands` 启动调用以及 `sendChatAction` 输入状态调用都有上限，并会在请求超时时通过 Telegram 的传输回退机制重试一次。持续性的网络/fetch 错误通常意味着到 `api.telegram.org` 的 DNS/HTTPS 不可达。

  </Accordion>

  <Accordion title="启动时报告未授权令牌">

    - `getMe returned 401` 是针对所配置机器人令牌的 Telegram 身份验证失败。请在 BotFather 中重新复制或重新生成令牌，然后更新 `channels.telegram.botToken`、`tokenFile`、`accounts.<id>.botToken` 或 `TELEGRAM_BOT_TOKEN`（默认账户）。
    - 启动期间出现的 `deleteWebhook 401 Unauthorized` 也属于身份验证失败；将其视为“没有 webhook”只会把同样的坏令牌失败推迟到后续的 API 调用。

  </Accordion>

  <Accordion title="轮询或网络不稳定">

    - 带有自定义 fetch/proxy 的 Node 22+ 如果 `AbortSignal` 类型不匹配，可能会触发立即中止行为。
    - 某些主机会先将 `api.telegram.org` 解析到 IPv6；损坏的 IPv6 出站会导致间歇性的 API 失败。
    - 带有 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!` 的日志会作为可恢复的网络错误重试。
    - 在轮询启动期间，OpenClaw 会复用成功的启动期 `getMe` 探测结果给 grammY，因此运行器在第一次 `getUpdates` 之前不需要第二次 `getMe`。
    - 如果在轮询启动期间 `deleteWebhook` 因瞬时网络错误而失败，OpenClaw 会继续进入长轮询，而不是再进行一次轮询前的控制平面调用。若 webhook 仍然处于活动状态，随后会在 `getUpdates` 中表现为冲突；OpenClaw 会重建传输并重试 webhook 清理。
    - 日志中的 `Polling stall detected` 表示 OpenClaw 会在默认 120 秒内没有完成的长轮询存活信号后重启轮询并重建传输。
    - `openclaw channels status --probe` 和 `openclaw doctor` 会在以下情况发出警告：运行中的轮询账户在启动宽限期后尚未完成 `getUpdates`、运行中的 webhook 账户在启动宽限期后尚未完成 `setWebhook`，或者最近一次成功的轮询传输活动已过期。
    - Telegram 会尊重进程代理环境变量用于 Bot API 传输：`HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY` 及其小写变体。`NO_PROXY` / `no_proxy` 仍可绕过 `api.telegram.org`。
    - 如果在服务环境中设置了 `OPENCLAW_PROXY_URL` 且未存在标准代理环境变量，Telegram 也会使用该 URL 进行 Bot API 传输。
    - 在直连出站/TLS 不稳定的 VPS 主机上，请通过代理路由 Telegram API 调用：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ 默认 `autoSelectFamily=true`（WSL2 除外）。Telegram 的 DNS 结果顺序会优先遵循 `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER`，然后是 `channels.telegram.network.dnsResultOrder`，再然后是进程默认值（例如 `NODE_OPTIONS=--dns-result-order=ipv4first`），如果都不适用，则在 Node 22+ 上回退为 `ipv4first`。
    - 在 WSL2 上，或者当 IPv4-only 行为更有效时，强制选择地址族：

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - RFC 2544 基准范围答案（`198.18.0.0/15`）默认已经允许用于 Telegram 媒体下载。如果可信的 fake-IP 或透明代理在媒体下载期间将 `api.telegram.org` 重写为其他私有/内部/特殊用途地址，则可为仅 Telegram 的绕过显式启用：

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - 该选项也可在账户级别通过 `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork` 单独启用。
    - 如果你的代理将 Telegram 媒体主机解析到 `198.18.x.x`，请先保持危险标志关闭——该范围默认已允许。

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` 会削弱 Telegram 媒体 SSRF 防护。仅应在可信的、由操作者控制的代理环境（Clash、Mihomo、Surge fake-IP 路由）中使用，这些环境会在 RFC 2544 基准范围之外合成私有或特殊用途答案。普通的公网 Telegram 访问请保持关闭。
    </Warning>

    - 临时环境变量覆盖：`OPENCLAW_TELEGRAM_DISABLE_AUTO_SELECT_FAMILY=1`、`OPENCLAW_TELEGRAM_ENABLE_AUTO_SELECT_FAMILY=1`、`OPENCLAW_TELEGRAM_DNS_RESULT_ORDER=ipv4first`。
    - 验证 DNS 解析结果：

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

- startup/auth: `enabled`, `botToken`, `tokenFile` (must be a regular file; symlinks are rejected), `accounts.*`
- access control: `dmPolicy`, `allowFrom`, `direct.*.tools`, `direct.*.toolsBySender`, `groupPolicy`, `groupAllowFrom`, `groups`, `groups.*.topics.*`, top-level `bindings[]` (`type: "acp"`)
- topic defaults: `groups.<chatId>.topics."*"` applies to unmatched forum topics; exact topic IDs override it
- exec approvals: `execApprovals`, `accounts.*.execApprovals`
- command/menu: `commands.native`, `commands.nativeSkills`, `customCommands`
- threading/replies: `replyToMode`, `threadBindings`
- streaming: `streaming` (modes `off | partial | block | progress`), `streaming.preview.toolProgress`
- formatting/delivery: `textChunkLimit`, `streaming.chunkMode`, `richMessages`, `markdown.tables` (`off | bullets | code | block`), `linkPreview`, `responsePrefix`
- media/network: `mediaMaxMb`, `network.autoSelectFamily`, `network.dangerouslyAllowPrivateNetwork`, `proxy`
- custom API root: `apiRoot` (Bot API root only; do not include `/bot<TOKEN>`), `trustedLocalFileRoots` (self-hosted Bot API absolute `file_path` roots)
- webhook: `webhookUrl`, `webhookSecret`, `webhookPath`, `webhookHost`, `webhookPort`, `webhookCertPath`
- actions/capabilities: `capabilities.inlineButtons`, `actions.sendMessage|editMessage|deleteMessage|reactions|sticker|createForumTopic|editForumTopic`
- reactions: `reactionNotifications`, `reactionLevel`
- errors: `errorPolicy`, `silentErrorReplies`
- writes/history: `configWrites`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`

</Accordion>

<Note>
多账户优先级：如果配置了两个或更多账户 ID，请设置 `channels.telegram.defaultAccount`（或包含 `channels.telegram.accounts.default`），以明确默认路由。否则 OpenClaw 会回退到第一个规范化后的账户 ID，且 `openclaw doctor` 会发出警告。命名账户会继承 `channels.telegram.allowFrom` / `groupAllowFrom`，但不会继承 `accounts.default.*` 的值。
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
