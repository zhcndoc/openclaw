---
summary: "运行时模型、回复标签、链接预览、实时流预览、确认反应和提及别名"
read_when:
  - "了解 Discord 消息如何流经网关"
  - "调整回复线程、确认或出站提及"
title: "Discord 消息行为"
sidebarTitle: "消息行为"
---

如何路由、格式化、确认和预览入站和出站 Discord 消息。

## <a id="runtime-model"></a> 运行时模型

- Gateway 拥有 Discord 连接。
- 对 Discord 消息的回复将返回到 Discord。
- Bot 回复和线程绑定角色回复共享 Markdown 格式，包括 CommonMark 粗体和配置的表格转换。
- 两个传送路径在格式化和提及扩展后都会重新应用调用者提供的字符限制。
- 转发的消息快照连同任何附带的标题一起到达代理。转发的文本不被视为键入的命令；命令分类仅使用发送者自己的消息文本。
- Discord guild/channel 元数据作为不受信任的上下文添加到模型提示中，而不是作为用户可见的回复前缀。如果模型将该信封复制回来，OpenClaw 将从出站回复和未来重播上下文中删除复制的元数据。
- 默认情况下（`session.dmScope=main`），直接聊天共享代理主会话（`agent:main:main`）。
- Guild 频道使用隔离的会话键（`agent:<agentId>:discord:channel:<channelId>`）。
- 默认情况下会忽略 Group DM （`channels.discord.dm.groupEnabled=false`）。
- 原生斜杠命令在隔离的命令会话中运行（`agent:<agentId>:discord:slash:<userId>`），同时仍然携带 `CommandTargetSessionKey` 到路由后的对话会话。
- 仅文本 cron/heartbeat 宣布向 Discord 的交付折叠为最终助手可见的答案，发送一次。当代理发出多个可交付有效负载时，媒体和结构化组件有效负载仍保持多消息状态。
- A 发送响应而不发送 Discord 消息 ID 保持未确认状态。排队传送记录丢失的身份以便恢复，而不是报告成功或立即发送副本；检查带有 `openclaw health --verbose` 的交货警告。

同一通道中的消息继续到达 [ 回复队列 ](/concepts/queue)，而较早的消息则等待轮到。 Discord 消息使用持久入口准入，因此 `collect` 将排队消息保留为单独的后续轮次，就像 `followup` 一样。这可以防止一条消息在另一条消息拒绝组合轮次之前提交。推迟消息可以保留其持久恢复状态。

## <a id="message-behavior"></a> 消息行为

<AccordionGroup>
  <Accordion id="introductions-when-joining-a-server" title="加入服务器时的介绍">
    当机器人加入允许的 Discord 服务器时，OpenClaw 会发布一个特定于房间的介绍。当机器人可以在服务器系统通道查看和发送消息时，它会优先选择服务器的系统通道；否则，它使用具有 **View Channel** 和 **Send Messages** 权限的第一个文本通道。如果不存在符合条件的频道，则不会发送介绍。

    简介使用频道名称和主题，以及最近的消息（如果有）。读取较早的消息还需要**读取消息历史记录**；当缺少该权限时，OpenClaw 仍然使用通道元数据介绍自己，而不是失败。

    默认情况下启用介绍，仅适用于新加入的服务器，并且永远不会在直接消息中运行。设置 `channels.discord.joinIntro: false` 以禁用它们，或设置 `channels.discord.accounts.<accountId>.joinIntro` 以覆盖一个帐户。有关历史限制、目标通道选择、每个房间一次的行为和不可信内容处理，请参阅 [ 群组加入介绍](/channels#group-join-introductions)。

  </Accordion>

  <Accordion id="reply-tags-and-native-replies" title="回复标签和原生回复">
    Discord 支持代理输出中的回复标签：

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    由 `channels.discord.replyToMode` 控制：

    - `off`（默认）：不进行隐式回复串联；显式的 `[[reply_to_*]]` 标签仍然会被遵守
    - `first`：将隐式原生回复引用附加到本轮中第一条发出的 Discord 消息
    - `all`：将其附加到每一条发出的消息
    - `batched`：仅当传入事件是由多条消息去抖后合并成的批次时才附加——当你希望原生回复主要用于歧义较大的突发聊天，而不是每一次单消息轮次时，这会很有用

    消息 ID 显示在 context/history 中，因此代理可以针对特定消息。当上下文可见性允许时，对机器人消息（包括自动化警报）的回复会将引用的文本保留为不受信任的上下文。机器人自己的入站事件仍会被忽略，并且不会再次下载引用的自创作媒体。分块的角色传送收据保留为每个块选择的回复目标。

  </Accordion>

  <Accordion id="link-previews" title="链接预览">
    Discord 默认为 URL 生成丰富的链接嵌入。默认情况下，OpenClaw 会抑制出站 Discord 消息中生成的嵌入，因此代理发送的 URL 会保留普通链接，除非您选择加入：

```json5
{
  channels: {
    discord: {
      suppressEmbeds: false,
    },
  },
}
```

    将 `channels.discord.accounts.<id>.suppressEmbeds` 设为可以覆盖单个账户。代理消息工具发送时也可以为单条消息传入 `suppressEmbeds: false`。显式的 Discord `embeds` 载荷不会被默认链接预览设置所抑制。

  </Accordion>

  <Accordion id="live-stream-preview" title="直播预览">
    OpenClaw 可以通过发送临时消息并在文本到达时对其进行编辑来流式传输草稿回复。 Discord 预览流默认为`off`；将 `channels.discord.streaming.mode` 设置为 `partial`、`block` 或 `progress` 以选择加入。`streamMode` 是旧别名；运行 `openclaw doctor --fix` 将持久配置重写为当前嵌套的 `streaming` 格式。

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          maxLines: 8,
          maxLineChars: 120,
          toolProgress: false,
          commentary: false,
        },
      },
    },
  },
}
```

    - `off` 会禁用 Discord 预览编辑。
    - `partial` 会在令牌到达时编辑单条预览消息。
    - `block` 会发出草稿大小的分块；使用 `streaming.preview.chunk`（`minChars`、`maxChars`、`breakPreference`）调整大小和断点，并限制在 `textChunkLimit` 以内。显式的非 `off` 预览模式会覆盖继承的 `agents.defaults.blockStreamingDefault: "on"`；显式的 `streaming.block.enabled: true` 会覆盖预览。如果某一轮无法使用预览，继承的分块发送仍然适用。
    - `progress` 保留一份可编辑状态草稿直至最终交付。默认情况下，它是安静的：代理的最新序言或旁白作为状态标题，流式传输时的💬评论和🧠推理，✅ / ▸ / ▢ 计划步骤，以及任何批准请求或失败的命令。普通工具调用不会添加行。
    - 媒体、错误和显式回复的最终消息会取消待处理的预览编辑。
    - `streaming.progress.toolProgress: true` 在标题下方添加滚动工具日志：`🛠️ Exec: running` 或 `📖 Read from notes.txt` 等行（默认 `false`）。每个工具行都以其工具的文本字形开头。 `streaming.preview.toolProgress` 控制 `partial` 和 `block` 模式下的工具行，默认为 `true`。
    - `streaming.progress.commentary`（默认`false`）选择在临时进度草案中加入原始助理评论。默认的 preamble/narration 状态行与此选项无关。评论在显示前被清理，保持短暂状态，并且不会改变最终答案的传递。
    - `streaming.progress.maxLineChars` 控制每行进度预览的字符预算。普通文本会在单词边界处缩短；命令和路径详情会保留有用的后缀。
    - `streaming.preview.commandText` / `streaming.progress.commandText` 控制紧凑进度线中的 command/exec 细节：`status`（默认，仅工具标签）或 `raw`（显式命令文本）。

    显示滚动工具日志，同时隐藏原始 command/exec 文本：

    ```json
    {
      "channels": {
        "discord": {
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

    预览流式传输仅支持文本；媒体回复会回退到正常发送。

  </Accordion>

  <Accordion id="ack-reactions" title="确认回应">
    状态反应使确认在整个工作过程中保持稳定。他们不会添加每个工具的表情符号、不活动警告或成功提示。实际故障保留错误反应生命周期。

    `ackReaction` 会在 OpenClaw 处理传入消息时发送一个确认表情。

    解析顺序：

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - 代理身份表情符号后备（`agents.entries.*.identity.emoji`，其他“👀”）

    注意：

    - Discord 接受 Unicode 表情或自定义表情名称。
    - 使用 `""` 可为频道或账户禁用该反应。

    **范围（`messages.ackReactionScope`）：**

    值：`"all"`（DM + 群组，包括环境房间事件）、`"direct"`（仅限 DM）、`"group-all"`（除环境房间事件外的每个群组消息，无 DM）、`"group-mentions"`（提及机器人时的群组；**no DMs**，默认），`"off"` / `"none"`（禁用）。

    <Note>
    默认范围 （`"group-mentions"`） 不会在直接消息或环境房间事件中触发 ack 反应。要获得对入站 Discord DM 和静室事件的确认反应，请将 `messages.ackReactionScope` 设置为 `"all"`。
    </Note>

  </Accordion>

  <Accordion id="outbound-mention-aliases" title="出站提及别名">
    当客服人员需要通过句柄提及已知的 Discord 用户时，请使用 `mentionAliases`。按键为不带前导的手柄`@`；值为 Discord 用户 ID。未知句柄、`@everyone`、`@here` 以及 URL 内部提及、电子邮件地址或 Markdown 反引号代码范围和栅栏保持不变。

    已知提及后保留尾随标点符号（`.`、`,`、`!`、`?`、`:`、`;`、`)`），包括点句柄，例如`@alice.dev.`。最长的已知句柄优先于将其尾随句点视为标点符号。

```json5
{
  channels: {
    discord: {
      mentionAliases: {
        SupportLead: "123456789012345678",
      },
      accounts: {
        ops: {
          mentionAliases: {
            OpsLead: "234567890123456789",
          },
        },
      },
    },
  },
}
```

  </Accordion>
</AccordionGroup>
