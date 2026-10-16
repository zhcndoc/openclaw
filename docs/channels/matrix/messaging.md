---
summary: "Streaming previews， voice-note transcription， and reactions"
read_when:
  - "在 Matrix 中打开实时回复预览"
  - "配置Matrix确认反应和自定义表情"
title: "Matrix 消息行为"
sidebarTitle: "消息传递"
---

如何OpenClaw将回复传递到Matrix房间：流媒体预览、入站语音注释和反应。

## <a id="streaming-previews"></a> 流式预览

Matrix 回复流式传输是可选启用的。`streaming.mode` 控制 OpenClaw 如何传递进行中的助手回复；`streaming.block.enabled` 控制每个已完成的块是否作为独立的 Matrix 消息保留。

```json5
{
  channels: {
    matrix: {
      streaming: { mode: "partial" },
    },
  },
}
```

保留实时答案预览但隐藏临时答案tool/progress线路：

```json5
{
  channels: {
    matrix: {
      streaming: {
        mode: "partial",
        preview: {
          toolProgress: false,
        },
      },
    },
  },
}
```

完整配置接受 `{ mode, chunkMode, block, preview, progress }`：

```json5
{
  channels: {
    matrix: {
      streaming: {
        mode: "progress",
        progress: {
          label: "auto", // pick from configured or built-in labels (false to hide)
          labels: ["Thinking", "Writing", "Searching"], // candidates for label: "auto"
          maxLines: 8, // max rolling progress lines (default: 8)
          maxLineChars: 120, // max chars per line before truncation (default: 120)
          toolProgress: true, // rolling tool log in the progress draft (default: false)
        },
      },
    },
  },
}
```

- `progress.label`：自定义标签，`"auto"`/unset选择一个配置的或内置的标签，或者`false`隐藏它。
- `progress.labels`：仅当 `label` 为 `"auto"` 或未设置时使用的候选项。
- `progress.maxLines`：草稿中保留的最大滚动进度行数；更早的行会被裁剪。
- `progress.maxLineChars`：每条紧凑进度行在截断前的最大字符数。
- `progress.toolProgress`：当 `true` 时，实时 tool/progress 活动（包括工具故障）出现在草稿中。默认的 `false` 保留草稿的标题、评论、计划里程碑和批准请求。中间工具故障和非零命令退出被隐藏；终端任务错误仍然使用正常的错误传递。

| `streaming.mode`  | 行为                                                                                                                                                                                                                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"off"`（默认） | 等待完整回复，一次发送。                                                                                                                                                                                                                                                          |
| `"partial"`       | 当模型写入当前块时，就地编辑一条普通文本消息。原生客户端可能会在第一次预览时通知，而不是在最终编辑时通知。                                                                                                                                              |
| `"quiet"`         | 与 `"partial"` 相同，但该消息是非通知通知。一旦每用户推送规则与最终编辑匹配，收件人就会收到通知（请参阅 [ 自托管推送规则以获取安静的最终预览 ](/channels/matrix/rich-messages#self-hosted-push-rules-for-quiet-finalized-previews)）。 |
| `"progress"`      | 使用进度草稿发送单独的紧凑进度行。                                                                                                                                                                                                                              |

`streaming.block.enabled`（默认 `false`）独立于 `streaming.mode`：

| `streaming.mode`        | `block.enabled: true`                                               | `block.enabled: false`（默认）                     |
| ----------------------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
| `"partial"` / `"quiet"` | 当前块的实时草稿，已完成的块作为消息保留 | 当前块的实时草稿，就地最终化 |
| `"off"`                 | 每个已完成块发送一条会通知的 Matrix 消息                     | 整个回复发送一条会通知的 Matrix 消息      |

注意：

- 如果预览超过了 Matrix 的单事件大小限制，OpenClaw 会停止预览流式传输，并回退为仅最终结果的传递。
- 媒体回复总是正常发送附件。如果可见预览无​​法安全地重复使用，OpenClaw 会保留它，直到确认完全替换，然后对其进行编辑。如果替换传送失败、部分传送或未产生可见事件，则预览仍然可见。
- 当预览流式传输处于活动状态时，工具进度预览更新默认开启。将 `streaming.preview.toolProgress: false` 设为仅保留答案文本的预览编辑，而让工具进度走正常传递路径。
- 预览编辑会额外消耗 Matrix API 调用。若要获得最保守的速率限制配置，请保持 `streaming.mode: "off"`。
- 遗产scalar/boolean `streaming`价值观和平坦`blockStreaming` / `chunkMode`键被重写为这个嵌套形状`openclaw doctor --fix`。

## <a id="voice-messages"></a> 语音消息

传入的 Matrix 语音消息会在房间提及门控之前进行转写，因此，在 `requireMention: true` 的房间中，一条提到机器人名称的语音消息可以触发代理，而代理接收到的是转写文本，而不是仅仅一个音频附件占位符。

Matrix 使用位于 `tools.media.audio` 下的共享音频媒体提供商，例如 OpenAI `gpt-4o-mini-transcribe`。有关提供商设置和限制，请参见[媒体工具概览](/tools/media-overview)。

- `m.audio`事件和`m.file`事件与`audio/*` MIME类型均符合资格。
- 在加密房间中，OpenClaw 会在转写之前通过现有的 Matrix 媒体路径解密附件。
- 转写文本会在代理提示中被标记为机器生成且不可信。
- 该附件会被标记为已转写，因此下游媒体工具不会再次对其进行转写。
- 将 `tools.media.audio.enabled: false` 设为禁用全局音频转写。

## <a id="reactions"></a> 反应

Matrix 支持外发反应、入站反应通知和确认反应。

外发反应工具受 `channels.matrix.actions.reactions` 控制：

- `react` 向某个 Matrix 事件添加反应。
- `reactions` 列出某个 Matrix 事件当前的反应摘要。
- `emoji-list` 从当前对话的房间包和您的个人包中发现自定义表情符号。
- `emoji=""` 移除机器人在该事件上的自身反应。
- `remove: true` 仅移除机器人指定的表情反应。

`emoji-list`从授权的当前房间和`im.ponies.user_emotes`帐户数据中读取MSC2545 `im.ponies.room_emotes`包。它最多返回 100 个排序条目，例如 `{ "name": "party", "identifier": "party", "url": "mxc://example.org/party" }`；仅限贴纸的参赛作品被排除在外。将 `identifier` 传递给 `react`：它是直接存储为 Matrix 反应的 `m.relates_to.key` 的纯简码，而不是 `mxc://` 媒体 URL。自定义反应渲染取决于 Matrix 客户端，因此为需要图像的客户端或代理单独包含 `url`。

**解析顺序**（先定义的值优先）：

| 设置                 | 顺序                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `ackReaction`           | 每个帐户 -> 通道 -> `messages.ackReaction` -> 代理身份表情符号后备   |
| `ackReactionScope`      | 每个账户 -> 通道 -> `messages.ackReactionScope` -> 默认 `"group-mentions"` |
| `reactionNotifications` | 每个账户 -> 通道 -> 默认 `"own"`                                           |

`reactionNotifications: "own"` 会在反应指向机器人发出的 Matrix 消息时，转发新增的 `m.reaction` 事件；`"off"` 会禁用反应系统事件。反应移除不会被合成为系统事件——Matrix 会将其表现为 redactions，而不是作为独立的 `m.reaction` 移除事件。
