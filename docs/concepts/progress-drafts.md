---
summary: "进度草稿：一条可见的进行中消息，会在代理运行时持续更新"
read_when:
  - "配置长时间聊天轮次的可见进度更新"
  - "在部分流式、分块和进度流式模式之间进行选择"
  - "解释 OpenClaw 如何在工作进行时更新一条频道消息"
  - "排查进度草稿、独立进度消息或最终化回退问题"
title: "进度草稿"
---

当客服人员工作时，进度草稿将一条通道消息转变为实时状态行，而不是一堆临时的“仍在工作”回复。设置 `channels.<channel>.streaming.mode: "progress"` 和 OpenClaw 在实际工作开始后创建消息，在代理读取、计划、调用工具或等待批准时对其进行编辑，然后提供最终答案。

```text
Checking the streaming behavior and running the focused tests.
✅ Read the channel docs
▸ Run the focused tests
▢ Summarize the result
```

默认草稿显示状态标题、编写的计划步骤和批准请求。在Discord和Telegram上，它还可以保持当前操作和委派任务状态可见，而无需详细的工具日志或实用程序模型。中间工具故障和非零命令退出不在草案范围内。设置 `streaming.progress.toolProgress: true` 以添加滚动工具日志，包括工具故障，行如 `Bash: run tests`。 Discord 和 Telegram 在每个工具行前面加上其工具的文本字形，例如 `📖 Read: from docs/index.md`；其他通道保持普通行。通道插件通过 `createChannelProgressDraftCompositor` 的 `toolIcons` 选项选择加入。

<Note>
  Discord 和 Telegram 默认为 `progress`，无需额外配置。将 `mode: "partial"` 设置为流式传输答案文本，或设置 `mode: "off"` 以禁用预览。现有的显式模式将被保留。有关完整的每通道默认表，请参阅 [Streaming 和 chunking](/concepts/streaming#channel-mapping)。
</Note>

## <a id="quick-start"></a> 快速开始

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

此处的默认值：1.5 秒的启动延迟，在发生有用工作时的安静状态草稿，以及抑制该回合较旧的独立进度消息。原始工具线草稿使用自动单字标签；除非您明确配置，否则状态标题会忽略该冗余标题。

本页介绍进度草稿体验及其配置选项。有关完整的流式模式矩阵、按通道的运行时说明，以及旧键迁移，请参见 [流式传输和分块](/concepts/streaming)。

## <a id="what-users-see"></a> 用户会看到什么

| 部分            | 用途                                                                     |
| --------------- | --------------------------------------------------------------------------- |
| 状态标题 | 在 Discord 和 Telegram 上显示模型前言；Discord 会额外添加一个实用填充文本。 |
| 标签           | 可选starter/status线如`Working`。                             |
| 进度行  | 规划里程碑、启用 commentary/reasoning 和批准请求。       |
| 工具日志        | 使用与 `/verbose` 相同的详细信息格式化程序的可选工具行。           |

状态标题位于进度线上方。对于 `progress.toolProgress: true`，工具行在其下方仍然可见。

对于原始工具进度，一旦代理开始有意义的工作并在初始延迟期间保持忙碌，标签就会出现。它位于滚动进度线列表的顶部，因此一旦出现足够的具体工作线，它就会滚动走开。除非您显式配置，否则当状态标题存在时，隐式标签将被隐藏。纯文本回复永远不会显示进度草稿；仅当实际工作更新时才会出现一条线，例如 `Bash: run tests`、`Web Search: for "discord edit message"` 或 `Write: to /tmp/file`。

最终交付取决于渠道和运输。 OpenClaw 要么完成草稿，要么发送单独的答案并清理或停止更新草稿（请参阅 [Finalization](#finalization)）。

## <a id="choose-a-mode"></a> 选择模式

`channels.<channel>.streaming.mode` 控制可见的进行中行为：

| 模式       | 最适合                         | 聊天中会出现什么                              |
| ---------- | -------------------------------- | ------------------------------------------------- |
| `off`      | 安静的频道                   | 只有最终答案。                            |
| `partial`  | 观察答案文本逐步出现      | 一个草稿被编辑为最新的答案文本。     |
| `block`    | 较大的答案预览块     | 一个预览以较大的块更新或追加。 |
| `progress` | 工具较多或耗时较长的轮次 | 一条状态草稿，然后是最终答案。          |

当用户更关心“正在发生什么”，而不是看答案文本逐个 token 逐步输出时，选择 `progress`；当答案文本本身就是进度信号时，选择 `partial`；对于更大的预览块，选择 `block`。在 Discord 和 Telegram 上，`streaming.mode: "block"` 仍然是预览流式输出，而不是普通的块回复发送——若要实现后者，请使用 `streaming.block.enabled`。

## <a id="configure-labels"></a> 配置标签

进度标签位于 `channels.<channel>.streaming.progress` 下。默认的原始工具行标签是 `"auto"`，它使用内置的普通 `Working` 标签。状态标题会隐藏这个隐式标签；如果你也想在其上方显示标签，请显式设置 `label: "auto"`：

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

使用您自己的标签池（当 `label: "auto"` 时仍然在 random/by 种子处挑选）：

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

## <a id="control-progress-lines"></a> Control 进度线

进度线来自真实的运行事件：工具启动、项目更新、任务计划、批准、命令输出、补丁摘要和类似的代理活动。 `progress.toolProgress` 决定普通工具调用是否成为状态标题下方的滚动行。它在每个频道上默认为 `false`，这使草稿保持安静：标题、启用的评论和推理、计划里程碑和批准请求仍然出现。中间工具故障和非零命令退出与其他工具行一起隐藏；通过正常的错误传递，仍然会出现阻止轮流完成的故障。将滚动工具日志设置为 `true`。成功的后台进程轮询和内部等待不会添加例行行。失败的调用仍然遵循所选的工具进度策略； `/verbose` 保留其诊断摘要。

在Discord和Telegram上，安静草稿保留一个当前操作状态和有限的委派任务状态行。它们使用公共操作名称和任务标签，从不使用命令文本、参数、子散文或结果。较旧操作的延迟完成无法替代当前显示的操作。其他进度频道保留其现有的演示文稿。启用工具日志后，生命周期更新会为每个工作人员重用一行。发送给工作人员的消息会获得单独的条目，因为发送消息并不能证明工作人员已开始运行。这些进度行中不包含委派提示。

工具在单次调用仍在运行时，也可以发出类型化进度。这就是慢速获取或搜索在工具返回最终结果之前，如何更新可见草稿的方式。进度更新是一个部分工具结果，模型内容为空，并带有显式的公共通道元数据：

```json
{
  "content": [],
  "progress": {
    "text": "Fetching page content...",
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
  { text: "Fetching page content...", id: "web_fetch:fetching" },
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

### <a id="detail-mode"></a> 细节模式

OpenClaw 为进度草稿和 `/verbose` 使用相同的格式化器：

```json5
{
  agents: {
    defaults: {
      toolProgressDetail: "explain", // explain | raw
    },
  },
}
```

`"explain"` 是默认值，并通过简洁的标签保持草稿稳定。 `"raw"` 会在可用时附加底层工具详细信息。命令文本还需要在下方显式选择加入 `streaming.progress.commandText: "raw"`。启用该选项后，`node --check /tmp/app.js` 调用在不同模式下的渲染如下：

| 模式      | 进度行                                                |
| --------- | ------------------------------------------------------------ |
| `explain` | `check js syntax for /tmp/app.js`                            |
| `raw`     | `check js syntax for /tmp/app.js · node --check /tmp/app.js` |

### <a id="command%2Fexec-text"></a><a id="command/exec-text"></a> Command/exec 文字

`streaming.progress.commandText`（默认 `"status"`）控制 exec/bash 进度行旁显示多少命令详细信息，与上述详细模式相互独立。将其设置为 `"raw"` 可选择显示命令文本；保持为 `"status"` 则仅显示工具进度状态：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          toolProgress: true,
          commandText: "raw",
        },
      },
    },
  },
}
```

### <a id="commentary-lane"></a> 评论通道

`streaming.progress.commentary`（默认 `false`）将模型的预工具 commentary/preamble 旁白（💬，例如“I'll check... then ...”）与草稿中的工具线交错。有关跨通道的共享配置形状，请参阅 [Streaming 和 chunking](/concepts/streaming#commentary-progress-lane)。

启用评论通道后，前导语只会渲染为这些交错的 💬 行；下面的状态标题会避开显示，从而让该通道保持其文档中定义的形状。

### <a id="status-headline"></a> 状态标题

在 Discord 和 Telegram 的进度模式下，只要可用，模型的类型化工具前前导语就会成为草稿的状态标题。其他进度模式通道会保留其现有的状态行为。状态标题默认开启，并且不会绕过短轮次的正常活动门槛； 启用 `streaming.progress.commentary` 会将前导语交给交错的评论通道处理。

在 Telegram、`/verbose on` 和 `/verbose full` 上，在单独发送工具诊断信息时保留此临时序言标题。序言不会复制到最终答案中。

在 Discord 上，当实用新型解析为代理时 — 显式 [`utilityModel`](/gateway/config-agents/models#agents-defaults-model)，或主要提供者声明的小模型默认值（OpenAI → `gpt-5.6-luna`、Anthropic → `claude-haiku-4-5`） — 当模型不发出前导码或有前导码时，它会提供一个简短的简单语言填充符安静了大约 20 秒（Telegram 今天的标题仅是序言）：

```text
Updating the default model in your config, then restarting the gateway to pick
it up. One agent listing call failed and is being retried.
```

实用程序旁白默认启用（`streaming.progress.narration`、默认 `true`），并且永远不会回退到主要模型：它仅在显式 `utilityModel` 或代理的主要提供者的提供者声明的默认值的情况下运行。设置 `utilityModel: ""` 以完全禁用实用程序路由。当启用 `progress.toolProgress` 时，工具线会在下方不断累积。草稿编辑仍然等待正常的活动门和实际的文本更改，这避免了快速转弯时的闪烁并减少了繁忙通道中的编辑流失。设置`narration: false`仅禁用实用新型填充器；模型序言标题保持启用状态：

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

叙述输入是有限的：实用程序模型接收入站请求文本以及草稿将呈现的相同紧凑工具摘要，而不是原始命令输出或工具结果。对于 `commandText: "status"`，旁白输入还会省略 exec/bash 命令文本，与草稿显示的内容相匹配。

叙述属于当前回合。结束或替换该回合会取消其待决的实用新型请求，并防止更新草稿的最新结果。当请求完成时，会重新考虑在旁白请求期间累积的工具活动，因此符合条件的状态更新不需要其他事件。

### <a id="line-limits"></a> 行数限制

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

对于 `toolProgress: true`，任何指定工具的命令退出行和失败项目行都使用普通工具日志容量。这包括内置、插件和自定义工具，无需维护名称列表。一个滚动活动时段与计划一起保持可见，因此失败的行在发生时出现，然后在新活动到达时滚动出去。 blocked/error 指出，批准请求和未命名的失败仍然优先。隐藏工具日志后，工具故障和非零退出也被隐藏；批准请求仍然可见。

进度行会自动压缩，以减少编辑草稿时的聊天气泡回流，并且 OpenClaw 会截断长行，因此重复的草稿编辑不会在每次更新时以不同的方式换行。默认每行预算为 120 个字符；散文在单词边界处进行剪切，而诸如路径或原始命令之类的长细节则用中间的省略号缩短，以便后缀保持可见。相同的预算适用于准备好的工具标题，包括嵌入在阅读标题中的路径，而不仅仅是单独的工具详细信息。在 Telegram 上，预算包括工具图标、标签和状态以及命令或详细文本。

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

<a id="hide-tooltask-lines" />

### <a id="show-the-tool-log"></a> 显示工具日志

将滚动工具日志添加到单个进度草稿中：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          toolProgress: true,
        },
      },
    },
  },
}
```

使用默认的 `toolProgress: false`，OpenClaw 仍然会抑制该回合较旧的独立工具进度消息；该草案显示了标题、撰写的文本、计划里程碑和批准请求。 Discord 和 Telegram 还显示安全当前操作和委派任务状态。工具诊断在会话记录中仍然可用。

## <a id="channel-behavior"></a> 频道行为

| 渠道         | 进度传输方式                     | 笔记                                                                                                                                                     |
| --------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discord         | 发送一条消息，然后编辑该消息。        | 默认为`progress`；最终答案落地后，状态草稿将被删除。                                                                      |
| Matrix          | 发送一个事件，然后编辑该事件。          | 账户级流式传输配置控制账户级草稿。                                                                                             |
| Microsoft Teams | 个人聊天中使用原生 Teams 流。 | `streaming.mode: "block"` 则改为使用 Teams 分块传递。                                                                                           |
| Slack           | 原生流或可编辑的草稿帖子。  | 卡片样式为默认； `progress.style: "compact"` 使用临时文本草稿，在最终答案交付后删除。                          |
| Telegram        | 发送一条消息，然后编辑该消息。        | 如果在进度草稿和答案之间有消息到达，草稿会重新发布到该消息下方（先发布新消息，再删除旧消息），而不是导致客户端滚动跳跃。 |
| Mattermost      | 可编辑的草稿帖子。                   | `block` 模式会在已完成文本和工具活动帖子之间轮换；其他模式会将工具活动折叠到同一个草稿样式的帖子中。                       |

不支持安全编辑的频道会回退到输入指示器或仅最终内容传递。有关每个频道完整运行时行为分解，请参见 [流式传输和分块](/concepts/streaming)。

## <a id="finalization"></a> 最终化

当最终答案准备好时，OpenClaw 会尽量保持聊天整洁：

- A Telegram 或 Discord 进度草稿移交给已接受的宣布子代理，在父代理屈服后保持可见，并继续显示子状态和准备好的操作名称；最终的答案是分开的。请参阅 [ 子代理产量切换 ](/concepts/subagent-yield-handoff#progress-after-yield)。

- 否则，在 Discord 上的 `progress` 模式下，最终答案将作为新消息发送，并且一旦传递答案，状态草稿就会被删除。繁忙的频道不会在回复上方保留孤立的工具日志；错误决赛将草稿保留为失败回合的可见记录。
- 如果草稿可以安全地成为最终答案（`partial`/`block`模式），OpenClaw将对其进行就地编辑。
- Slack 紧凑的进度风格将最终答案作为新消息发布，并在确认发送后删除其临时草稿。交付失败会使草稿可见。
- 如果频道使用原生进度流，OpenClaw 会在原生传输接受最终文本时结束该流。
- 其他（媒体、批准提示、明确的回复目标、太多块或失败的 edit/send） OpenClaw 通过正常渠道传送路径发送最终答案，而不是覆盖草稿。

这种回退是有意为之：发送一份新的最终答案，比丢失文本、错线程回复，或用通道无法安全表示的载荷覆盖草稿要好。

## <a id="troubleshooting"></a> 故障排查

**我只看到了最终答案。**

检查 `channels.<channel>.streaming.mode` 对于处理该消息的账号或频道是否为 `progress`。某些群组或引用回复路径会在频道无法安全编辑正确消息时，为该轮禁用草稿预览。

**我看到了标签，但没有工具行。**

检查 `streaming.progress.toolProgress`。默认为`false`，保留单个草稿但隐藏滚动工具行；将其设置为 `true` 以获取完整的工具日志。

**我看到的是一条新的最终消息，而不是编辑后的草稿。**

这是 [最终化](#finalization) 中描述的安全回退。它可能发生在媒体回复、长答案、显式回复目标、旧的 Telegram 草稿、缺失的 Slack 线程目标、已删除的预览消息，或本地流最终化失败时。

**我仍然看到了独立的进度消息。**

只要草稿处于激活状态，进度模式就会抑制默认的独立工具进度消息。如果独立消息仍然出现，请确认该轮实际上使用的是 `progress` 模式，而不是 `streaming.mode: "off"`，或者是某个无法为该消息创建草稿的频道路径。

**Teams 的行为与 Discord 或 Telegram 不同。**

Microsoft Teams 在个人聊天中使用原生流，而不是通用的发送并编辑预览传输，并且将 `streaming.mode: "block"` 映射为 Teams 的块式投递，因为它没有像 Discord 和 Telegram 那样的草稿预览块模式。

## <a id="related"></a> 相关内容

- [流式与分块](/concepts/streaming)
- [消息](/concepts/messages)
- [频道配置](/gateway/config-channels)
- [Discord](/channels/discord)
- [矩阵](/channels/matrix)
- [微软 Teams](/channels/msteams)
- [Slack](/channels/slack)
- [电报](/channels/telegram)
- [Mattermost](/channels/mattermost)
