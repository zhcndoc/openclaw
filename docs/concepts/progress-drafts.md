---
summary: "进度草稿：一个可见的进行中消息，会在代理运行时持续更新"
read_when:
  - 配置长时间聊天轮次的可见进度更新
  - 在部分流式、分块和进度流式模式之间做选择
  - 解释 OpenClaw 如何在工作进行时更新一条频道消息
  - 排查进度草稿、独立进度消息或最终化回退问题
title: "进度草稿"
---

进度草稿会在代理工作时，将一条频道消息变成一条实时状态行，而不是堆积一串临时的“仍在工作中”回复。设置
`channels.<channel>.streaming.mode: "progress"` 后，OpenClaw 会在真正开始工作时创建这条
消息，在代理读取、规划、调用工具或等待批准时对其进行编辑，然后将其转换为最终答案。

```text
Working...
📖 来自 docs/concepts/progress-drafts.md
🔎 Web Search: for "discord edit message"
🛠️ Bash: run tests
```

<Note>
  Discord 已在 `channels.discord.streaming` 未设置时默认使用 `streaming.mode: "progress"`，
  因此无需任何配置，进度草稿就会在那里显示。其他所有频道默认使用 `partial`
  或 `off`；完整的按频道默认值表请参见 [流式传输与分块处理](/concepts/streaming#channel-mapping)。
</Note>

## 快速开始

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

默认情况下：开始延迟为 5 秒，在有实际工作进行时使用紧凑的进度行，并且在该轮次中抑制较旧的独立进度消息。原始工具行草稿使用一个自动生成的单词标签；状态标题会省略这个冗余标题，除非你显式配置一个。

本页介绍进度草稿体验及其配置选项。有关完整的流式模式矩阵、按通道的运行时说明，以及旧键迁移，请参见 [流式传输和分块](/concepts/streaming)。

## 用户会看到什么

| Part            | Purpose                                                                           |
| --------------- | --------------------------------------------------------------------------------- |
| 状态标题       | 在 Discord 和 Telegram 上显示模型前言；Discord 会额外添加一个实用填充文本。       |
| 标签           | 可选的起始/状态行，例如 `Working`。                                               |
| 进度行         | 使用与 `/verbose` 相同的工具图标和详细格式化器的简洁运行更新。                     |

对于原始工具进度，标签会在代理开始进行有意义的工作时出现
并在初始延迟期间保持忙碌。
它位于滚动进度行列表的顶部，因此一旦
出现足够多的具体工作行，它就会滚动离开。状态标题仅显示代理的
自然语言状态，除非显式配置了标签。纯文本回复
从不显示进度草稿；只有在真正的工作更新时才会出现一行，
例如 `🛠️ Bash: run tests`、`🔎 Web Search: for "discord edit message"`，
或 `✍️ Write: to /tmp/file`。

当通道可以安全地这样做时，最终答案会直接替换草稿；否则 OpenClaw 会通过正常传递发送最终答案，并清理或停止更新草稿（参见 [Finalization](#finalization)）。

## 选择一种模式

`channels.<channel>.streaming.mode` 控制可见的进行中行为：

| 模式       | 适用场景                       | 聊天中会出现什么                                      |
| ---------- | ------------------------------ | ----------------------------------------------------- |
| `off`      | 安静的频道                     | 只有最终答案。                                        |
| `partial`  | 观察答案文本逐步出现           | 一个草稿被编辑为最新的答案文本。                      |
| `block`    | 较大的答案预览块               | 一个预览以较大的块更新或追加。                        |
| `progress` | 工具较多或耗时较长的轮次       | 一条状态草稿，然后是最终答案。                        |

当用户更关心“正在发生什么”，而不是看答案文本逐个 token 逐步输出时，选择 `progress`；当答案文本本身就是进度信号时，选择 `partial`；对于更大的预览块，选择 `block`。在 Discord 和 Telegram 上，`streaming.mode: "block"` 仍然是预览流式输出，而不是普通的块回复发送——若要实现后者，请使用 `streaming.block.enabled`。

## 配置标签

进度标签位于 `channels.<channel>.streaming.progress` 下。默认的
原始工具行标签是 `"auto"`，它使用内置的普通 `Working`
标签。状态标题会隐藏这个隐式标签；如果你也想在其上方显示标签，请显式设置
`label: "auto"`：

```text
Working
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

使用你自己的标签池（当 `label: "auto"` 时，仍会按随机/种子选择）：

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

## 控制进度行

进度行来自真实的运行事件：工具启动、条目更新、任务计划、审批、命令输出、补丁摘要，以及类似的代理活动。它们默认启用（`progress.toolProgress`，默认 `true`）。

工具在单次调用仍在运行时，也可以发出类型化进度。这就是慢速获取或搜索在工具返回最终结果之前，如何更新可见草稿的方式。进度更新是一个部分工具结果，模型内容为空，并带有显式的公共通道元数据：

```json
{
  "content": [],
  "progress": {
    "text": "正在获取页面内容...",
    "visibility": "channel",
    "privacy": "public",
    "id": "web_fetch:fetching"
  }
}
```

OpenClaw 仅在通道进度 UI 中渲染 `progress.text`。正常的工具结果仍会在之后以 `content`/`details` 的形式到达，并且是唯一返回给模型的部分。

为工具添加进度时，应发出简短、通用的消息，并且只在操作已挂起足够长时间、足以体现价值时再发送。`web_fetch` 正是这样做的，延迟 5 秒：

```typescript
const clearProgressTimer = scheduleToolProgress(
  onUpdate,
  { text: "正在获取页面内容...", id: "web_fetch:fetching" },
  5_000,
  { signal },
);

try {
  return await runToolWork();
} finally {
  clearProgressTimer();
}
```

快速调用不会显示进度行；长时间调用会在仍处于挂起状态时显示一条；被取消的调用会在过时进度出现之前清除计时器。进度文本是公共 UI 侧通道，因此绝不能包含密钥、原始参数、获取到的内容、命令输出或页面文本。

### 细节模式

OpenClaw 为进度草稿和 `/verbose` 使用相同的格式化器：

```json5
{
  agents: {
    defaults: {
      toolProgressDetail: "explain", // 说明 | 原始
    },
  },
}
```

`"explain"` 是默认值，会使用简洁标签保持草稿稳定。`"raw"` 会在可用时附加底层命令，这在调试时很有用，但在聊天中会更嘈杂。例如，`node --check /tmp/app.js` 调用在不同模式下的渲染方式如下：

| 模式        | 进度行                                                         |
| ----------- | -------------------------------------------------------------- |
| `explain`   | `🛠️ check js syntax for /tmp/app.js`                          |
| `raw`       | `🛠️ check js syntax for /tmp/app.js · node --check /tmp/app.js` |

### 命令/exec 文本

`streaming.progress.commandText`（默认 `"raw"`）控制 exec/bash 进度行旁显示多少命令细节，与上面的细节模式无关。将其设为 `"status"` 可在保留工具进度行可见的同时，完全隐藏命令文本：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          commandText: "status",
        },
      },
    },
  },
}
```

### 评论通道

`streaming.progress.commentary`（默认 `false`）会将模型的工具前评论/前导叙述（💬，例如“我会先检查……然后……”）与草稿中的工具行交错显示。有关跨通道共享的配置形状，请参见
[流式传输与分块](/concepts/streaming#commentary-progress-lane)。

启用评论通道后，前导语只会渲染为这些交错的
💬 行；下面的状态标题会避开显示，从而让该通道保持其
文档中定义的形状。

### 状态标题

在 Discord 和 Telegram 的进度模式下，只要可用，模型的类型化工具前前导语
就会成为草稿的状态标题。其他
进度模式通道会保留其现有的状态行为。状态标题默认开启，并且不会绕过短轮次的正常活动门槛；
启用 `streaming.progress.commentary` 会将前导语交给交错的
评论通道处理。

在 Discord 上，当有一个实用模型为代理解析时——无论是显式的
[`utilityModel`](/gateway/config-agents#utilitymodel)，还是主
提供方声明的小模型默认值（OpenAI → `gpt-5.6-luna`，
Anthropic → `claude-haiku-4-5`）——如果模型没有输出前导语，或已安静约 20 秒，
它会提供一段简短、通俗的填充文本
（Telegram 的标题目前仍仅使用前导语）：

```text
正在更新配置中的默认模型，然后重启网关以使其生效。一次代理列表调用失败，正在重试。
```

实用叙述默认开启（`streaming.progress.narration`，默认
`true`），并且永远不会回退到主模型：它只在显式
`utilityModel` 或提供方为代理的主
提供方声明默认值时运行。设置 `utilityModel: ""` 可完全禁用实用路由。工具行会继续在下方累积，并在两个状态来源都停止时返回。如果配置了状态文本，草稿编辑仍会等待正常的活动门槛和实际
文本变更，这可避免在快速轮次中闪烁，并减少繁忙
通道中的编辑抖动。设置 `narration: false` 可仅禁用实用模型填充；模型
前导语标题仍保持启用：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          narration: false,
        },
      },
    },
  },
}
```

叙述输入是有边界且经过脱敏的：实用模型接收传入的请求文本，以及草稿本会渲染的同样精简、脱敏后的工具摘要——绝不会接收原始命令输出或工具结果。使用 `commandText: "status"` 时，叙述输入也会省略 exec/bash 命令文本，与草稿所显示的内容保持一致。

### 行数限制

限制可见行数（默认 8）：

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

进度行会自动压缩，以减少草稿编辑时聊天气泡的重新排版，而 OpenClaw 会截断过长的行，避免重复的草稿编辑在每次更新时都产生不同的换行。默认的每行预算为 120 个字符；普通文本会在词边界处截断，而像路径或原始命令这样的长细节会使用中间省略号缩短，以便后缀仍然可见。

调整每行预算：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          maxLineChars: 160,
        },
      },
    },
  },
}
```

### 富渲染（Slack）

Slack 可以将进度行渲染为结构化的 Block Kit 字段，而不是纯文本：

```json5
{
  channels: {
    slack: {
      streaming: {
        mode: "progress",
        progress: {
          render: "rich",
        },
      },
    },
  },
}
```

富渲染始终会在 Block Kit 字段旁同时发送相同的纯文本正文，因此无法渲染更丰富结构的客户端仍会显示精简的进度文本。

### 隐藏工具/任务行

保留单一进度草稿，但隐藏工具和任务行：

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

使用 `toolProgress: false` 时，OpenClaw 仍会抑制该轮次中较旧的独立工具进度消息——通道会保持视觉上安静，直到最终答案；如果配置了标签，则标签除外。

## 频道行为

| 频道            | 进度传输方式                               | 说明                                                                                                                                                     |
| --------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discord         | 发送一条消息，然后编辑它。        | 默认为 `progress` 模式；最终答案会带有 `-#` 活动回执，并且状态草稿会在答案送达后被删除。                     |
| Matrix          | 发送一个事件，然后编辑它。          | 账号级流式配置控制账号级草稿。                                                                                             |
| Microsoft Teams | 原生 Teams 流式传输，用于私人聊天。 | `streaming.mode: "block"` 会映射为 Teams 的块式传递。                                                                                           |
| Slack           | 原生流式传输或可编辑的草稿帖子。  | 需要一个回复线程目标；没有目标的顶级私信仍会获得草稿预览帖子和编辑。                                                           |
| Telegram        | 发送一条消息，然后编辑它。        | 如果一条消息在进度草稿和答案之间到达，草稿会重新发布到它下面（先发新内容再删除旧内容），而不是让客户端滚动跳转。 |
| Mattermost      | 可编辑的草稿帖子。                   | `block` 模式会在完成文本和工具活动帖子之间轮换；其他模式会将工具活动折叠到同一个草稿式帖子中。                       |

不支持安全编辑的频道会回退到输入指示器或仅最终内容传递。有关每个频道完整运行时行为分解，请参见 [Streaming and chunking](/concepts/streaming)。

## 最终化

当最终答案准备好时，OpenClaw 会尽量保持聊天整洁：

- 在 Discord 的 `progress` 模式下，最终答案会作为一条新的消息发送，并在末尾附加一个很小的 `-#` 活动回执（例如
  `-# 🧠 2 thoughts · 🛠️ 5 tool calls · ⏱️ 12s`），并且在该答案送达后会删除状态草稿。繁忙的频道不会在回复上方留下孤立的工具日志；出错的最终结果会保留草稿，作为失败轮次的可见记录。
- 如果草稿可以安全地直接成为最终答案（`partial`/`block` 模式），OpenClaw 会就地编辑它。
- 如果频道使用原生进度流，OpenClaw 会在原生传输接受最终文本时结束该流。
- 否则（媒体、审批提示、显式回复目标、分块过多，或编辑/发送失败），OpenClaw 会通过正常的频道投递路径发送最终答案，而不是覆盖草稿。

这种回退是有意为之：发送一份新的最终答案，比丢失文本、错线程回复，或用通道无法安全表示的载荷覆盖草稿要好。

## 故障排查

**我只看到了最终答案。**

检查 `channels.<channel>.streaming.mode` 对于处理该消息的账号
或频道是否为 `progress`。某些群组或引用回复路径会在频道无法安全编辑正确
消息时，为该轮禁用草稿预览。

**我看到了标签，但没有工具行。**

检查 `streaming.progress.toolProgress`。如果它是 `false`，OpenClaw 会保留单一草稿行为，但会隐藏工具和任务进度行。

**我看到的是一条新的最终消息，而不是编辑后的草稿。**

这是 [最终化](#finalization) 中描述的安全回退。它
可能发生在媒体回复、长答案、显式回复目标、旧的 Telegram
草稿、缺失的 Slack 线程目标、已删除的预览消息，或本地流最终化失败时。

**我仍然看到了独立的进度消息。**

只要草稿处于激活状态，进度模式就会抑制默认的独立工具进度消息。如果独立消息仍然出现，请确认该轮实际上使用的是 `progress` 模式，而不是 `streaming.mode: "off"`，或者是某个无法为该消息创建草稿的频道路径。

**Teams 的行为与 Discord 或 Telegram 不同。**

Microsoft Teams 在个人聊天中使用原生流，而不是通用的发送并编辑预览传输，并且将 `streaming.mode: "block"` 映射为 Teams 的块式投递，因为它没有像 Discord 和 Telegram 那样的草稿预览块模式。

## 相关内容

- [流式与分块](/concepts/streaming)
- [消息](/concepts/messages)
- [频道配置](/gateway/config-channels)
- [Discord](/channels/discord)
- [Matrix](/channels/matrix)
- [Microsoft Teams](/channels/msteams)
- [Slack](/channels/slack)
- [Telegram](/channels/telegram)
- [Mattermost](/channels/mattermost)
