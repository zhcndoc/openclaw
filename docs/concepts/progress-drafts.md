---
summary: "进度草稿：一个可见的进行中消息，会在代理运行时持续更新"
read_when:
  - 配置长时间聊天轮次的可见进度更新
  - 在部分流式、分块和进度流式模式之间做选择
  - 解释 OpenClaw 如何在工作进行时更新一条频道消息
  - 排查进度草稿、独立进度消息或最终化回退问题
title: "进度草稿"
---

进度草稿让耗时较长的代理轮次在聊天中显得“活着”，而不会把对话变成一堆临时状态回复。

启用进度草稿后，OpenClaw 会创建一条可见的进行中消息，在代理读取、规划、调用工具或等待批准时更新它，然后在频道能够安全处理时把这条草稿转成最终答案。

```text
Shelling
- 正在读取最近的频道上下文
- 正在检查匹配的问题
- 正在准备回复
```

当你希望在大量工具工作期间只显示一条整洁的状态消息，并在轮次结束后显示最终答案时，使用进度草稿。

## 快速开始

通过 `streaming.mode: "progress"` 为每个频道启用进度草稿：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
      },
    },
  },
}
```

通常这样就足够了。OpenClaw 会自动选择一个单词标签，在有用的工作发生时添加简洁的进度行，并在该轮次中抑制重复的独立进度消息。

## 用户会看到什么

进度草稿由两部分组成：

| 部分           | 目的                                                             |
| -------------- | ---------------------------------------------------------------- |
| 标签           | 简短标题，例如 `Thinking` 或 `Shelling`。                       |
| 进度行         | 简洁的运行更新，例如工具调用、任务步骤或批准。                  |

代理开始回复时，标签会立即出现。只有当代理发出有用的工作更新时，才会添加进度行。最终答案会在可能时替换草稿；否则，OpenClaw 会正常发送最终答案，并根据频道的传输方式清理或停止更新草稿。

## 选择一种模式

`channels.<channel>.streaming.mode` 控制可见的进行中行为：

| 模式       | 适用场景                       | 聊天中会出现什么                                      |
| ---------- | ------------------------------ | ----------------------------------------------------- |
| `off`      | 安静的频道                     | 只有最终答案。                                        |
| `partial`  | 观察答案文本逐步出现           | 一个草稿被编辑为最新的答案文本。                      |
| `block`    | 较大的答案预览块               | 一个预览以较大的块更新或追加。                        |
| `progress` | 工具较多或耗时较长的轮次       | 一条状态草稿，然后是最终答案。                        |

当用户更关心“正在发生什么”，而不是逐 token 观看答案文本流时，选择 `progress`。

当答案本身就是进度信号时，选择 `partial`。

当你希望用较大的文本块更新草稿预览时，选择 `block`。在 Discord 和 Telegram 上，`streaming.mode: "block"` 仍然是预览流式，而不是普通分块发送。若你想要普通的分块回复，请使用 `streaming.block.enabled` 或旧版 `blockStreaming`。

## 配置标签

进度标签位于 `channels.<channel>.streaming.progress` 下。

默认标签是 `auto`，它会从 OpenClaw 内置的单词标签池中选择：

```text
Thinking
Shelling
Scuttling
Clawing
Pinching
Molting
Bubbling
Tiding
Reefing
Cracking
Sifting
Brining
Nautiling
Krilling
Barnacling
Lobstering
Tidepooling
Pearling
Snapping
Surfacing
```

使用固定标签：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          label: "Investigating",
        },
      },
    },
  },
}
```

使用你自己的自动标签池：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          label: "auto",
          labels: ["Checking", "Reading", "Testing", "Finishing"],
        },
      },
    },
  },
}
```

隐藏标签，只显示进度行：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          label: false,
        },
      },
    },
  },
}
```

## 控制进度行

在进度模式下，进度行默认启用。它们来自真实的运行事件：工具开始、项目更新、任务计划、批准、命令输出、补丁摘要以及类似的代理活动。

限制可见行数：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          maxLines: 4,
        },
      },
    },
  },
}
```

保留单个进度草稿，但隐藏工具和任务行：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          toolProgress: false,
        },
      },
    },
  },
}
```

当 `toolProgress: false` 时，OpenClaw 仍然会抑制该轮次中较旧的独立工具进度消息。除非配置了标签，否则频道会保持视觉上安静，直到最终答案出现。

## 频道行为

每个频道都会使用其支持的最简洁传输方式：

| 频道            | 进度传输方式                          | 说明                                                               |
| --------------- | ------------------------------------- | ------------------------------------------------------------------ |
| Discord         | 先发送一条消息，再编辑它。            | 如果最终文本能安全地放入一个预览消息中，就会原地编辑。            |
| Matrix          | 先发送一个事件，再编辑它。            | 账户级流式配置控制账户级草稿。                                      |
| Microsoft Teams | 在个人聊天中使用原生 Teams 流。      | `streaming.mode: "block"` 映射为 Teams 分块发送。                 |
| Slack           | 原生流或可编辑草稿发布。               | 线程可用性会影响是否能使用原生流式。                               |
| Telegram       | 先发送一条消息，再编辑它。             | 较旧的可见草稿可能会被替换，以便最终时间戳仍然有用。              |
| Mattermost     | 可编辑草稿发布。                        | 工具活动会折叠进同一条草稿式发布。                                  |

不支持安全编辑的频道通常会回退为输入指示器或仅最终发送。

## 最终化

当最终答案准备好时，OpenClaw 会尽量保持聊天整洁：

- 如果草稿可以安全地变成最终答案，OpenClaw 会原地编辑它。
- 如果频道使用原生进度流式，OpenClaw 会在原生传输接受最终文本时完成该流。
- 如果最终答案包含媒体、批准提示、显式回复目标、过多分块，或者编辑/发送失败，OpenClaw 会通过正常的频道发送路径发送最终答案。

这种回退路径是有意为之的。与其丢失文本、错置回复线程或用频道无法安全表示的载荷覆盖草稿，不如发送一条新的最终答案。

## 故障排查

**我只看到了最终答案。**

检查 `channels.<channel>.streaming.mode` 是否针对处理该消息的账户或频道设置为 `progress`。某些群聊或引用回复路径在频道无法安全编辑正确消息时，可能会为该轮次禁用草稿预览。

**我看到了标签，但没有工具行。**

检查 `streaming.progress.toolProgress`。如果它是 `false`，OpenClaw 会保留单一草稿行为，但会隐藏工具和任务进度行。

**我看到的是一条新的最终消息，而不是编辑后的草稿。**

这是安全回退。它可能发生在媒体回复、长答案、显式回复目标、旧的 Telegram 草稿、缺失的 Slack 线程目标、已删除的预览消息，或原生流最终化失败时。

**我仍然看到了独立的进度消息。**

当草稿处于活动状态时，进度模式会抑制默认的独立工具进度消息。如果独立消息仍然出现，请确认该轮次确实在使用进度模式，而不是 `streaming.mode: "off"`，或者是一个无法为该消息创建草稿的频道路径。

**Teams 的行为与 Discord 或 Telegram 不同。**

Microsoft Teams 在个人聊天中使用原生流，而不是通用的“发送并编辑”预览传输。Teams 也将 `streaming.mode: "block"` 视为 Teams 分块发送，因为它没有与 Discord 和 Telegram 相同的草稿预览分块模式。

## 相关内容

- [流式与分块](/concepts/streaming)
- [消息](/concepts/messages)
- [频道配置](/gateway/config-channels)
- [Discord](/channels/discord)
- [Matrix](/channels/matrix)
- [Microsoft Teams](/channels/msteams)
- [Slack](/channels/slack)
- [Telegram](/channels/telegram)
