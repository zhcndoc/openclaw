---
summary: "运行时模型、流预览、本机命令、回复标签、确认反应和发送限制"
read_when:
  - "了解 Telegram 消息如何流经网关"
  - "调整实时预览、工具进度线或回复线程"
  - "更改块限制或从 CLI 发送"
title: "Telegram 消息行为"
sidebarTitle: "消息行为"
---

如何路由、预览、确认和传送入站和出站 Telegram 消息。

## <a id="runtime-behavior"></a> 运行时行为

- Telegram 消息处理在网关进程内运行。
- 对 Telegram 消息的回复将返回到 Telegram（该模型不选择频道）。
- 入站消息会规范化为共享的 channel envelope，其中包含回复元数据、媒体占位符，以及网关已观察到的回复所对应的已持久化回复链上下文。
- 骰子既不包含文本也不包含可下载文件。它们作为单行标记 （`[Dice 🎲 = 4]`） 折叠到消息正文中，而不是标准化为空正文并被删除；信封为发件人提供信息，就像为任何其他消息提供信息一样。群组提及政策不变。骰子消息没有提及机器人的文本，因此在需要提及的组中，裸露的骰子遵循通常未提及的路径，并在配置时保留在组历史记录窗口中（`historyLimit: 0` 禁用该窗口）。作为回复发送给机器人的滚动被视为隐式提及，并像任何其他回复一样开始一轮。
- 群组会话按 group ID 隔离。论坛主题会追加 `:topic:<threadId>`。
- 当机器人加入允许的组或超级组时，它会发布基于可用房间元数据的介绍：组标题、描述和固定消息。 Telegram 机器人 API 无法读取机器人加入之前的群组消息，因此介绍从未声称使用之前的聊天历史记录。默认情况下启用介绍，永远不会在私人聊天中运行，并且可以使用 `channels.telegram.joinIntro: false` 禁用或使用 `channels.telegram.accounts.<accountId>.joinIntro` 覆盖每个帐户。请参阅 [ 群组加入介绍](/channels#group-join-introductions)，了解每个房间一次的行为和不受信任的内容处理。
- DM消息可以携带`message_thread_id`； OpenClaw 保留它以供回复。仅当 Telegram `getMe` 报告机器人的 `has_topics_enabled: true` 时，DM 主题会话才会拆分；否则 DM 会留在平坦的会话上。
- 长轮询在隔离的工作线程中运行。更新将保存到持久队列中，并按每个聊天和主题的顺序进行处理。
- 多帐户启动限制并发 `getMe` 检查，因此大型机器人队列不会立即分散每个帐户检查。
- 每个网关进程都会保护长轮询，因此同一时刻只能有一个活动轮询器使用某个 bot token。持久性的 `getUpdates` 409 冲突表明有另一个 OpenClaw 网关、脚本或外部轮询器正在使用相同的 token。
- 轮询 watchdog 会在 120 秒内没有完成的 `getUpdates` 活跃信号后重启。
- Telegram Bot API 不支持已读回执（`sendReadReceipts` 不适用）。

升级后，旧的未版本化回复缓存条目将被视为缓存未命中。在再次观察到这些消息之前，它们的回复链上下文可能不可用。版本 1 缓存条目、保留的组历史记录和会话记录仍然受支持。转录重复数据删除使用记录的消息身份；无标记助理回复可能会同时出现在回复上下文和文字记录中。

<Note>
  **升级说明：Telegram的默认预览在2026.8.1.**中更改。在取消设置`channels.telegram.streaming`的情况下，Telegram在回合期间保留一份可编辑的状态草稿（代理的当前状态加上其工具行），并将最终答案作为普通消息发送。它之前将答案文本本身流式传输到预览中。没有配置失效，不需要`doctor --fix`；要保持以前的行为，请设置：

```json5
{ channels: { telegram: { streaming: { mode: "partial" } } } }
```

</Note>

<Note>
  `channels.telegram.dm.threadReplies` 和 `channels.telegram.direct.<chatId>.threadReplies` 已删除。如果您的配置仍然具有这些密钥，请在升级后运行 `openclaw doctor --fix`。 DM 主题路由现在遵循 Telegram `getMe.has_topics_enabled`（由 BotFather 线程模式控制）：当 Telegram 发送 `message_thread_id` 时，启用主题的机器人使用线程范围的 DM 会话；其他 DM 则留在平坦会话中。
</Note>

对 `replyToMode`、`streaming` 和 `textChunkLimit` 的更改适用于下一个组装回合，无需重新连接 Telegram，包括帐户覆盖。活动轮次保留其捕获的传递设置。

## <a id="inbound-text-batching"></a> 入站文本批处理

Telegram 默认将来自同一发件人的快速短信批量发送到一个座席轮次。普通文本等待300ms静默窗口；至少 4000 个字符的未转发消息最多允许 1500 毫秒用于可能的长粘贴延续。

- 短文本和长文本共享一批，因此短介绍、长粘贴和短后续可以轮流到达。消息 ID 不需要是连续的。
- 批次通过机器人帐户、发件人、聊天和主题保持隔离。回复元数据和源消息 ID 会被保留。
- `messages.inbound.byChannel.telegram` 会覆盖 `messages.inbound.debounceMs`，后者会覆盖 300ms 普通文本默认值。显式 `0` 禁用普通突发批处理，但保留自动长粘贴装配。
- Control 命令绕过批处理并立即调度。 Stop/abort 命令取消其目标对话的待处理文本。
- Forwarded 消息使用单独的 1 秒收集窗口，但共享发送者的调度队列，因此它们无法覆盖较早的文本。 Telegram 通常在稍后的轮询中将多消息转发的每条消息作为其自己的更新进行传递，因此窗口等待足够长的时间以等待突发的其余部分到达。因此，单个前锋在到达后大约一秒开始轮流。如果来自同一发件人的另一个转发已在对话的入口通道上排队，则收集会等待它，并以现有的 5 秒批处理截止时间为限。

入站相册使用 500 毫秒的安静窗口。当同一专辑的另一个成员已在对话的入口通道上排队时，OpenClaw 会在刷新之前等待它，并从第一个缓冲的成员开始保留 20 秒。这些窗口弥补了 Telegram 交付缺口；本地处理延迟不会分割专辑或转发突发，同时匹配的成员在这些范围内保持排队。

普通文本批次仅限于 12 条消息和 50,000 个字符。他们的收集截止时间是从第一条消息开始的 7.5 秒，或者配置的安静窗口（如果更长）。批量刷新后到达的消息无法加入其中。此启发式方法不能保证 Telegram 将每个粘贴片段一起交付。有关热重载行为，请参阅 [Inbound debouncing](/concepts/messages#inbound-debouncing)。

## <a id="message-behavior"></a> 消息行为

<AccordionGroup>
  <Accordion id="live-stream-preview-message-edits" title="直播预览（消息编辑）">
    OpenClaw 在直接聊天、群组和主题中实时传输部分回复：发送预览消息，然后重复 `editMessageText`，最终完成。预览带有编写器权限的编辑（例如最终确定），在每个排队的 Telegram 请求之前重新检查活动编写器，因此替换的轮次无法从该路径发送过时的编辑。

    - `channels.telegram.streaming` 为 `off | partial | block | progress`（默认：`progress`）；设置 `mode: "partial"` 将答案文本流式传输到预览而不是状态草稿中
    - short 初始答案预览将被去抖，然后在运行仍处于活动状态时在有限的延迟后具体化
    - `progress` 保留一份可编辑状态草稿，当答案活动在工具进度之前到达时显示稳定状态标签，完成时清除它，并以普通消息发送最终答案。默认情况下，草稿是安静的：状态标题、评论、计划里程碑和批准请求。中间工具故障和非零命令退出被隐藏；终端任务错误仍然使用正常的错误传递。 `streaming.progress.toolProgress: true` 添加滚动工具日志，包括工具故障。
    - `streaming.preview.toolProgress` 控制 tool/progress 更新是否在 `partial` 和 `block` 模式中重复使用相同的已编辑预览消息（默认值：当预览流处于活动状态时为 `true`）
    - `streaming.preview.commandText` 控制这些行内的 command/exec 详细信息：`status`（默认，仅工具标签）或 `raw`（显式命令文本）
    - 已完成的辅助序言默认更新状态标题；新的前导码将保持先前的可读状态直到完成
    - `streaming.progress.commentary`（默认值：`false`）将这些序言显示为交错的评论行而不是标题；评论在计划步骤旁边仍然可见
    - 成功的后台进程轮询和内部等待不会出现在进度日志中；故障仍然遵循所选的工具进度策略，并且 `/verbose` 保留诊断摘要
    - 检测到 legacy `channels.telegram.streamMode`、布尔 `streaming` 值和已停用的本机草稿预览键；运行 `openclaw doctor --fix` 来迁移它们

    工具进度线是工具运行时显示的简短状态更新（命令执行、文件读取、计划更新、补丁摘要、应用程序服务器模式下的 Codex preamble/commentary）。 `partial` 和 `block` 预览默认显示它们； `progress` 草案只显示了 `streaming.progress.toolProgress: true`。压缩状态遵循相同的设置，并在压缩开始后立即显示，包括在第一个模型输出之前。

    在默认 `progress` 模式下，`/verbose on` 发送单独的工具摘要，`/verbose full` 还发送完整的工具输出。显式 `toolProgress: false` 胜于 `/verbose`； `streaming.mode: "off"` 也会抑制这些诊断。

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

    保持工具进度可见，但隐藏 command/exec 文本：

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
    ```

    `progress` 模式可以显示工具日志，而无需将最终答案编辑到该消息中。选择使用 `toolProgress: true` 并将命令文本策略置于 `streaming.progress` 下：

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

    `streaming.mode: "off"` 禁用预览编辑并抑制通用 tool/progress 聊天，而不是将其作为独立状态消息发送；批准提示、媒体和错误仍然通过正常的最终交付。 `streaming.preview.toolProgress: false` 仅保留答案预览编辑。

    <Note>
      选定的引用回复是例外。当 `replyToMode` 是 `first`、`all` 或 `batched` 并且入站消息已选择引用文本时，OpenClaw 通过 Telegram 的本机引用回复路径发送最终答案，并跳过该回合的草稿预览。没有选定的引用文本的当前消息回复仍会流式传输。启用回复线索后，他们的预览会自动引用摘录，并在最终确定后保留它们。当工具进度可见性比本机报价回复更重要时，设置 `replyToMode: "off"`。要保留本机报价回复并隐藏工具进度行，请在 `progress` 模式下使用 `streaming.progress.toolProgress: false` 或在 `partial` 和 `block` 模式下使用 `streaming.preview.toolProgress: false`。
    </Note>

    对于仅文本回复：短预览会就地完成最终编辑；拆分为多条消息的长最终内容会复用预览作为第一块，然后只发送剩余部分；进度模式下的最终内容会清除状态草稿并使用正常的最终发送；如果在确认完成之前最终编辑失败，OpenClaw 会回退到正常的最终发送，并清理过期的预览。对于复杂回复（媒体载荷），OpenClaw 始终回退到正常的最终发送，并清理预览。

    预览流和块流是互斥的。显式非 `off` 预览模式会覆盖继承的 `agents.defaults.blockStreamingDefault: "on"`；显式 `streaming.block.enabled: true` 会覆盖预览。对于普通的单代理轮流，当回复修改插件挂钩阻止预览时，完成的答案块将使用正常的挂钩交付，除非使用 `agents.defaults.blockStreamingDefault: "off"` 全局显式禁用块流，或使用 `streaming.block.enabled: false` 全局禁用 Telegram。配置的多代理组线程轮流不使用此强制回退；与其他无法使用预览的回合一样，它们保留配置的块传送策略。

    原因说明：`/reasoning stream` 会在生成时把推理过程流式发送到实时预览中，然后在最终发送后删除推理预览（使用 `/reasoning on` 可使其保持可见）。最终答案发送时不包含推理文本。

  </Accordion>

  <Accordion id="native-commands-and-custom-commands" title="本机命令和自定义命令">
    Telegram 的命令菜单会在启动时通过 `setMyCommands` 注册。`commands.native: "auto"` 会为 Telegram 启用原生命令。

    添加自定义命令菜单项：

```json5
{
  channels: {
    telegram: {
      customCommands: [
        { command: "backup", description: "Git backup" },
        { command: "generate", description: "Create an image" },
      ],
    },
  },
}
```

    规则：名称标准化（去掉前导`/`，小写）；有效码型`a-z`、`0-9`、`_`，长度1-32；自定义命令不能覆盖原生命令； conflicts/duplicates 被跳过并记录。

    当 Telegram 菜单限制需要修剪时，配置的自定义命令首先出现，除非省略的每个技能条目被前导 `/skill` 后备替换。

    自定义命令只是菜单项——它们不会自动实现行为。即使未显示在 Telegram 菜单中，Plugin/skill 命令在键入时仍然可以工作。如果禁用本机命令，则内置命令将被删除；如果配置的话，custom/plugin 命令仍可能注册。

    常见设置失败：

    - 修剪重试后，`setMyCommands failed` 和 `BOT_COMMANDS_TOO_MUCH` 意味着菜单仍然溢出；减少 plugin/skill/custom 命令或禁用 `channels.telegram.commands.native`。
    - `apiRoot must be the Bot API root` 表示 `channels.telegram.apiRoot` 包含完整的 `/bot<TOKEN>` 端点。在启动 Telegram 之前运行 `openclaw doctor --fix` 以删除该后缀。运行时请求使用修复后的根；自定义代理路径仍然受支持。
    - `getMe returned 401` 表示 Telegram 拒绝了已配置的 bot token。请使用当前 BotFather token 更新 `botToken`、`tokenFile` 或 `TELEGRAM_BOT_TOKEN`（默认账号）；OpenClaw 会在轮询前停止，因此这不会被报告为 webhook 清理失败。
    - `setMyCommands failed` 和 network/fetch 错误通常意味着出站 DNS/HTTPS 到 `api.telegram.org` 被阻止。

    ### <a id="device-pairing-commands-(device-pair-plugin)"></a><a id="device-pairing-commands-device-pair-plugin"></a> 设备配对命令（`device-pair` 插件）

    安装后：

    1. `/pair` 生成一个设置代码
    2. 将该代码粘贴到 iOS 应用中
    3. `/pair pending` 列出待处理请求（包括 role/scopes）
    4. 通过以下方式批准：`/pair approve <requestId>`、`/pair approve`（仅当只有一个待处理请求时），或 `/pair approve latest`

    如果某个设备在重试时更改了认证信息（角色、作用域、公钥），之前的待处理请求会被一个新的 `requestId` 取代；批准前请重新运行 `/pair pending`。

    更多详情： [配对](/channels/pairing#pair-via-telegram)。

  </Accordion>

  <Accordion id="reply-threading-tags" title="回复线程标签">
    生成输出中的显式回复线程标签：

    - `[[reply_to_current]]` — 回复触发消息
    - `[[reply_to:<id>]]` — 回复特定消息 ID

    `channels.telegram.replyToMode`：`off`（默认）、`first`、`all`。

    对于 `first`，消息工具每回合发送共享一个隐式回复目标；每个承认的排队后续行动都从一个新的目标开始。明确的答复仍然受到尊重。最终答案和流媒体预览保留自己的回复目标跟踪。

    当启用回复线程并且原始 text/caption 可用时，OpenClaw 会自动添加本机报价摘录。 Telegram 将本机报价文本限制为 1024 个 UTF-16 代码单元；较长的消息从一开始就被引用，如果 Telegram 拒绝引用，则返回到简单的回复。

    `off` 只会禁用隐式回复线程；显式的 `[[reply_to_*]]` 标签仍会被遵守。

    在部分流模式下，针对不同消息的最终回复将替换预览，而不是就地编辑它。 Telegram 不允许编辑更改消息的回复目标。

  </Accordion>

  <Accordion id="ack-reactions" title="确认回应">
    `ackReaction` 在 OpenClaw 处理入站消息时发送确认表情符号。当 * 发送时，`messages.ackReactionScope` 决定 *。

    **表情解析顺序：**

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - 代理身份表情符号后备（`agents.entries.*.identity.emoji`，其他“👀”）

    Telegram 期望的是 Unicode 表情（例如 "👀"）；使用 `""` 可为某个频道或账号禁用该反应。

    **范围（`messages.ackReactionScope`，默认`"group-mentions"`；无Telegram-帐户或Telegram-通道覆盖）：**

    `all`（DM + 群组，包括环境房间事件）、`direct`（仅限 DM）、`group-all`（除环境房间事件外的每个群组消息，无 DM）、`group-mentions`（提及机器人时的群组；**no DMs** —默认），`off` / `none`（禁用）。

    <Note>
    默认范围 （`group-mentions`） 不会在 DM 或环境房间事件中触发 ack 反应。 DM 使用 `direct` 或 `all`；仅 `all` 确认环境房间事件。更改遵循 [hot reload](/gateway/configuration/hot-reload) 并应用于后续消息。每个组装的回合都保留其捕获的值。
    </Note>

  </Accordion>

  <a id="retained-group-history" />

  <Accordion id="retained-group-history-1" title="保留组历史记录">
    Telegram 群组和论坛主题使用最近的自动上下文窗口以及显式历史读取。使用 `requireMention: true`，允许未提及的消息在不启动代理轮流的情况下被记录。稍后处理的轮次接收最近的上下文，并且代理可以在需要早期讨论时使用 `message(action="read")`。

    - `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit` 限制自动观察消息窗口（默认 50，硬上限 200）。 `0` 禁用自动历史注入，不记录或显式读取。 JSON 整数最大值 （`9007199254740991`） 选择 50 条消息默认值。
    - 自动上下文在应用主题和发件人权限之前检查有界的最近切片。当其他主题或排除的发件人主导该切片时，繁忙组可以提供少于配置数量的消息。代理可以通过明确的历史读取来进一步回页。
    - H历史记录读取授权帐户、聊天和主题内的内容。他们使用 Telegram 消息 ID 进行引用和寻呼；省略主题不得将主题范围的阅读扩展到整个组。
    - Agent 默认每页读取 50 条消息，最多 100 条。使用 `before` 和返回的 `oldestMessageId` 来读取较旧的消息，使用 `after` 来读取较新的消息，或使用 `messageId` 来获取准确的参考。这些读取需要代理经过身份验证的当前 group/topic；他们不获取 Telegram 服务器历史记录。
    - `/new` 和 `/reset` 重置自动会话上下文，而不是保留的会话。显式历史读取可以检索允许的早期讨论。
    - 现有的SQLite插件状态表拥有保留的组消息。成功保留的记录在网关重新启动后仍然存在，并且不会被消息计数驱逐。直接消息缓存行为仍然受到限制。
    - 首次使用时，现有组缓存记录会自动移至保留存储中。没有历史准入来源的遗留记录（包括嵌入的回复祖先）在现有深度和可见性限制内仍然可用作显式回复上下文；它们不被视为经过验证的对话档案。
    - History 仅包含收到并允许记录的消息 OpenClaw。它无法恢复在此功能之前逐出的消息、Telegram 未传递的消息或机器人加入之前的消息。媒体引用不保证附件字节无限期可用。

    不需要单独的观察设置。保持 Telegram [ 组可见性 ](/channels/telegram/setup#privacy-mode-and-group-visibility) 启用，以便机器人接收普通消息。启用历史记录不会更改显式 `requireMention: false` 激活。

    <Warning>
    较旧的 OpenClaw 版本应用不同的缓存和插件配额规则。不要针对扩展的保留历史记录运行它们。降级需要兼容的更新前备份；此功能不会添加数据库版本围栏。
    </Warning>

  </Accordion>

  <Accordion id="limits-and-cli-targets" title="限制和 CLI 目标">
    - `channels.telegram.textChunkLimit` 默认 4000；`streaming.chunkMode="newline"` 优先按段落边界（空行）再按长度拆分。
    - `channels.telegram.mediaMaxMb`（默认 100）限制传入和传出媒体大小。
    - 一个聊天或主题中的入站相册按到达顺序到达代理，并且在较早相册后面等待的相册在较早相册仍在处理时保持其递送声明有效。
    - 当无法下载入站附件且邮件继续发送至代理时，其正文包含 `[media unavailable: ...]` 通知。超大尺寸通知包含有效尺寸限制；部分相册包括失败的附件计数和总附件计数。这也适用于承认的频道帖子，即使它们单独的聊天警告被抑制。
    - 自动组上下文使用`channels.telegram.historyLimit`或`messages.groupChat.historyLimit`（默认50）； `0` 禁用自动窗口，不保留历史记录。
    - 当网关观察到父消息时，reply/quote/forward 补充上下文标准化为一个选定的对话上下文窗口；观察到的消息缓存位于 OpenClaw SQLite 插件状态。要导入 6 月之前的缓存 sidecar，请通过 `2026.9.5`](/install/updating#upgrading-very-old-versions) 升级 [ 并首先运行其 Doctor。 Telegram 每次更新仅包含一个浅 `reply_to_message`，因此早于缓存的链仅限于该有效负载。
    - Telegram allowlist 主要用于限制谁可以触发代理，而不是一个完整的补充上下文脱敏边界。
    - DM 历史记录：`channels.telegram.dmHistoryLimit`、`channels.telegram.dms["<user_id>"].historyLimit`。自动观察-DM 上下文默认为 10 条消息，上限为 200 条； `0` 禁用该额外上下文，并且 JSON 整数最大值选择默认值。
    - 这些 channel/account/DM 字段还控制 **用户轮流** 中嵌入的会话记录修剪，而不是观察到的消息。该单独的限制器将 `0` 视为无修剪，并保留其现有的驱逐缓冲。 Doctor 保留有效的已保存限制，包括 JSON 整数最大值，因此它不会默默地更改转录文本上下文。

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

    Telegram-only 轮询标志：`--poll-duration-seconds`（5-604800；最多 7 天）、`--poll-anonymous`、`--poll-public`、`--thread-id`（或 `:topic:` 目标）。 `--poll-option` 重复 2-12 次（Telegram 的选项上限）。

    Telegram发送还支持`--presentation`，其中`buttons`块用于内联键盘（当`channels.telegram.capabilities.inlineButtons`允许时），`--pin`或`--delivery '{"pin":true}'`用于在机器人可以固定该聊天时请求固定传送，以及`--force-document`用于发送出站图像， GIF 和视频作为文档而不是 compressed/animated/video 上传。

    动作开关：`channels.telegram.actions.sendMessage=false` 会禁用所有外发消息，包括投票；`channels.telegram.actions.poll=false` 会禁用投票创建，但保留普通发送启用。

  </Accordion>
</AccordionGroup>
