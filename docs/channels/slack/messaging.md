---
summary: "确认反应、实时流媒体预览和斜杠命令"
read_when:
  - "更改 OpenClaw 确认入站 Slack 消息的方式"
  - "配置实时进度卡或草稿预览"
  - "在单斜杠命令和本机命令之间进行选择"
title: "Slack 消息行为"
sidebarTitle: "消息行为"
---

真是个Slack对话看起来像OpenClaw工作原理，以及命令如何到达它。

## <a id="ack-reactions"></a> 确认反应

`ackReaction` 会在 OpenClaw 处理入站消息期间发送一个确认表情，而 `ackReactionScope` 决定该表情实际何时发送。

确认在工作期间保持静态。对于 `messages.statusReactions.enabled: true`，实际故障在恢复确认之前会短暂显示错误反应。工具调用、思考、压实和长时间运行的工具不会循环或累积反应，成功完成也不会闪现单独的成功表情符号。

### <a id="emoji-(ackreaction)"></a><a id="emoji-ackreaction"></a> Emoji （`ackReaction`）

解析顺序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- agent 身份 emoji 回退（`agents.entries.*.identity.emoji`，否则为 `"eyes"` / 👀）

注意：

- Slack 期望使用简写名（例如 `"eyes"`）。
- 可使用 `""` 来禁用该 Slack 账号或全局的反应。

### <a id="scope-(messages.ackreactionscope)"></a><a id="scope-messages-ackreactionscope"></a> 范围（`messages.ackReactionScope`）

Slack 提供程序从 `messages.ackReactionScope`（默认 `"group-mentions"`）读取范围。没有 Slack- 帐户或 Slack- 通道级别覆盖；该值对于网关来说是全局的。

价值观：

- `"all"`：在私聊和群组中添加反应，包括环境房间事件。
- `"direct"`：仅在私聊中添加反应。
- `"group-all"`：对所有群组消息添加反应，但不包括环境房间事件（不含私聊）。
- `"group-mentions"`（默认）：在群组中添加反应，但仅限于提及机器人时（或在已选择加入的群组可提及对象中）。**不包括私聊。**
- `"off"` / `"none"`：从不添加反应。

<Note>
默认范围 （`"group-mentions"`） 不会在直接消息或环境房间事件中触发 ack 反应。要查看入站 Slack DM 和静室事件上配置的 `ackReaction`（例如 `"eyes"`），请将 `messages.ackReactionScope` 设置为 `"all"`。范围更改适用于下一条消息，无需重新连接 Slack。
</Note>

```json5
{
  messages: {
    ackReaction: "eyes",
    ackReactionScope: "all", // react in DMs and groups
  },
}
```

回复线程、历史记录限制、文本块限制、流式传输、打字反应和展开设置适用于下一条承认的消息，而无需重新连接 Slack。主动回复会保留其开始时的设置。同样的行为也适用于帐户覆盖。

## <a id="text-streaming"></a> 文本流式传输

`channels.slack.streaming` 控制实时预览行为：

- `off`：禁用实时预览流式传输
- `partial`：用​​最新的部分输出替换预览文本。设置此项可恢复 2026.8.1 之前的默认值，即 `progress` 成为默认值之前 （[#122552](https://github.com/openclaw/openclaw/pull/122552)）。
- `block`：追加分块的预览更新
- `progress`（默认）：当 Slack 支持时，使用本机任务卡在回复线程中显示结构化进度，并带有 Block Kit 会话卡回退。在回复线程之外，默认只保留最终答案。
- `streaming.progress.toolProgress`：`progress` 模式默认安静（`false`）。设置 `true` 以在本机卡上的每个工具调用或工具活动、计划清单以及块套件卡上的 tool/file/time 总计添加一个任务行。完成的 Block Kit 卡仅保留文件差异总计。 `streaming.preview.toolProgress` 控制 `partial` 和 `block` 模式下的工具预览（默认值：`true`）。
- `streaming.preview.commandText` / `streaming.progress.commandText`：`status` 会保留紧凑的工具进度行，同时隐藏原始 command/exec 文本（默认）；设置为 `raw` 可选择显示命令文本

显示工具日志，同时隐藏原始 command/exec 文本：

```json
{
  "channels": {
    "slack": {
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

当 `channels.slack.streaming.mode` 为 `partial`（默认值：`true`）时，`channels.slack.streaming.nativeTransport` 控制 Slack 本机文本流。

在 `progress` 模式下，除非您明确选择演示文稿，否则在没有回复线程目标的情况下不会发布预览或进度消息。这包括使用有效的 `replyToMode: "off"` 和普通顶级 DM 进行的渠道回复。这些回合使用临时的打字反应并一次性给出最终答案；失败仍然使用正常的错误传递。任何显式的 `streaming.progress` 设置都会选择顶级变为预览，包括 `commentary: true` 或自定义 `label`。唯一的例外是 `nativeTaskCards: true`，它只影响线程。空的 `streaming.progress` 对象或仅设置 `streaming.mode: "progress"` 保持安静的顶级默认值。此规则适用于合并根和帐户覆盖后的有效设置。模式 `off`、`partial` 和 `block` 保留其现有行为。

对于线程轮次，包括座席视图、助理视图和 Slack- 托管线程，Slack 的本机座席卡保持默认设置：整个轮次是一条流式消息，将旁白与实时 plan/task 卡交错，并以同一消息中助理的回答结束。当代理发布计划时，该卡显示编写的计划步骤，否则显示一个稳定的工作摘要行；批准请求有自己的行。默认情况下，中间工具失败和非零命令退出是隐藏的，因此成功的答案不会累积失败或 `Recovered: …` 行。通过 `progress.toolProgress: true`，它还可以显示每个工具的任务行，包括工具故障以及任何编写的计划。例行更新以一秒的间隔合并；批准、可见的失败和完成绕过了这种延迟。该卡片仅在轮次真正起作用时才会出现（工具或计划活动在短暂延迟后仍在运行），因此一个简单的问题无需回答即可。

如果没有编写或明确的标题，本机摘要行将以 **Completed** 或 **Failed** 结尾。

将 `channels.slack.streaming.progress.nativeTaskCards` 设置为 `false` 以回退到 Block Kit 会话卡。默认情况下，这条单独的消息显示评论和文本，包括斜体叙述和推理，以及可操作的批准请求。仅显式配置的进度 `label` 显示为普通标题。成品卡将 **Open 保留在 OpenClaw** 或 **Open 工作会话** 链接（如果可用）中。该卡在任何一种模式下都不会添加表情符号、粗体文本或状态标题，但转弯失败时会显示一条简单的“失败”行。只有在卡片有要显示的内容时才会发布卡片，因此只有工具活动而没有评论的回合默认不显示卡片。最后一个可见行消失的工作卡或成功卡（例如已解决的批准）将被删除，而不是保留陈旧的行。即使没有错误回复，失败的回合也会将其卡片标记为“失败”；没有回复的失败回合会张贴一张普通的失败卡，即使在工作时没有出现。

为详细的块套件卡设置 `progress.toolProgress: true`：它添加最近的工具活动、包含已完成步骤计数的计划清单、中间错误和恢复行以及工作时的 tool/file/time 总计。完成的详细卡仅在页脚中保留文件差异总计。

将 `channels.slack.streaming.progress.style` 设置为 `"compact"` 以获取纯文本进度草稿，而不是任一卡片表面。当 `style` 未设置时，显式设置 `progress.toolProgress: false` 也会选择紧凑型。设置 `style: "card"` 以保留带有 `toolProgress: false` 的卡，或选择用于顶级回合的 Block Kit 卡。评论显示为斜体文本，撰写的推理和批准请求仍然可见。终端任务错误仍然使用正常的错误传递。最终回复作为新消息发布，然后在 Slack 确认发送后删除临时预览。被人工回复取代的旧预览将被清理；持久的消息和视频留在对话中。

对于流式前导码，Slack 在创建消息之前等待第一个完整的前导码，因此其通知包含完整的想法而不是单个令牌。一旦该消息存在，后面的前导码就可以作为编辑进行流式传输，而无需另行通知。

```json5
{
  channels: {
    slack: {
      streaming: {
        mode: "progress",
        progress: {
          style: "compact",
          label: false,
          commentary: true,
          toolProgress: false,
        },
      },
    },
  },
}
```

紧凑进度始终使用正常的最终交付，包括媒体和错误。当回复无法安全地替换草稿时（包括超大文本、分割块有效负载、自定义出站身份或编辑失败），其他草稿模式将使用正常传送。

两个表面都将会话与 OpenClaw**中的**Open 链接，但仅当该链接可以工作时：必须设置 `gateway.publicOrigin`（外部可到达的网关源），并且不得通过 `gateway.controlUi.enabled: false` 禁用 Control UI。如果安装未设置 `publicOrigin`（无法从 Slack 到达 OpenClaw），则不会获得任何链接，而是死链接。如果在路径前缀下提供 Control UI，则还要设置 `gateway.controlUi.basePath`。

当回合产生可见的工作会话时，完成的卡片会通过 **打开工作会话** 链接到该子卡。对于多个可见工作会话，它按接受顺序显示最多五个链接，使用其标签或编号为 **打开工作会话** 链接；隐藏的子代理不会替换对话链接。

- A 回复线程必须可用于本机文本流，并且 Slack 会话状态才会显示。线程选择仍然遵循`replyToMode`。
- Channel、群聊和顶级 DM 根在明确选择时使用草稿预览。默认 `progress` 没有回复线程，仅使用临时打字反应。
- 顶级 Slack DM 默认保持线程外状态；代理视图和助理视图保留其基于线程的本机进度。
- 自定义出站 username/icon 设置保持启用便携式预览。 OpenClaw 保留预览或会话卡应用程序编写的内容，并单独提供定制的最终版本。 Slack 不允许删除冒充的消息。
- 媒体和非文本负载会回退到普通投递
- 外部紧凑进度，media/error决赛取消待预览编辑；符合条件的 text/block 决赛只有在可以就地编辑预览时才会同花。
- Native 流式回复等待 Slack 的确认，然后才将传递标记为成功。每个完整的回复块单独刷新，包括短块；例行进度更新仍然合并。稍后的进度卡最终确定失败不会丢弃已确认的回复。
- 显式 HTTP 429 速率限制拒绝默认在 Slack 的 `Retry-After` 延迟之后重试最多两次。这也适用于普通消息和上传完成；丢失的响应和服务器错误不会重播。
- 明确的收件人或范围拒绝会退回到缓冲文本的正常传送。不明确的流式传输失败（例如丢失响应）会报告失败，而不重播未确认的文本，因为 Slack 可能已经接受了它。稍后的有效负载使用正常传送。

使用草稿预览而不是 Slack 原生文本流式传输：

```json5
{
  channels: {
    slack: {
      streaming: {
        mode: "partial",
        nativeTransport: false,
      },
    },
  },
}
```

保持 Slack 本机进度任务卡启用以进行线程转动：

```json5
{
  channels: {
    slack: {
      streaming: {
        mode: "progress",
        progress: {
          nativeTaskCards: true,
        },
      },
    },
  },
}
```

旧版键：

- `channels.slack.streamMode`（`replace | status_final | append`）是 `channels.slack.streaming.mode` 的旧版别名。
- 布尔值 `channels.slack.streaming` 是 `channels.slack.streaming.mode` 和 `channels.slack.streaming.nativeTransport` 的旧版别名。
- 顶层 `channels.slack.chunkMode` 和 `channels.slack.nativeStreaming` 是 `channels.slack.streaming.chunkMode` 和 `channels.slack.streaming.nativeTransport` 的旧版别名。
- 运行时不会读取旧版别名；运行 `openclaw doctor --fix` 将持久的 Slack 流配置重写为当前密钥。

## <a id="typing-reaction-fallback"></a> 输入中 typing 反应回退

当 OpenClaw 正在处理回复时，`typingReaction` 向入站 Slack 消息添加临时反应，然后在运行完成时将其删除。这在线程回复之外最有用，线程回复使用 Slack 的 `processing` 会话状态。

解析顺序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`
- `"hourglass_flowing_sand"` 为默认 `progress` 转弯，无需回复线程或明确选择的进度呈现；否则没有打字反应。

注意：

- Slack 期望使用简写名（例如 `"hourglass_flowing_sand"`）。
- 使用 `""` 禁用打字反应，包括默认的安静顶级转弯。
- 该反应尽力而为，回复或失败路径完成后会自动尝试清理。

## <a id="commands-and-slash-behavior"></a> 命令与斜杠行为

Slack 中的 Slash 命令表现为单个已配置命令或多个原生命令。配置 `channels.slack.slashCommand` 可更改命令默认值：

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

```txt
/openclaw /help
```

本机命令需要 Slack 应用程序中的 [ 附加清单设置 ](/channels/slack/manifest-and-scopes#additional-manifest-settings)，并在全局配置中使用 `channels.slack.commands.native: true` 或 `commands.native: true` 启用。

- 对于 Slack，原生命令自动模式是 **关闭** 的，因此 `commands.native: "auto"` 不会启用 Slack 原生命令。

```txt
/help
```

原生命令参数菜单会按以下优先级之一渲染：

- 3-5 足够短的选项：溢出（“...”）菜单
- 超过 100 个选项，且可用异步选项过滤：外部选择
- 1-2 个选项，或任何其编码值对于选择器来说过长的选项：按钮块
- 否则（6-100 个选项，或超过 100 个但没有异步过滤）：静态选择菜单，每个菜单最多分块显示 100 个选项

```txt
/think
```

Slash 会话使用类似 `agent:<agentId>:slack:slash:<userId>` 的隔离键，并仍然通过 `CommandTargetSessionKey` 将命令执行路由到目标对话会话。
