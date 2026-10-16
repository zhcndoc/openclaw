---
summary: "OpenClaw 附带的挂钩以及每个挂钩的行为和选项"
read_when:
  - "您想启用一个钩子而不编写一个钩子"
  - "您需要 `boot-md`、`bootstrap-extra-files`、`command-logger`、`compaction-notifier` 或 `session-memory` 行为"
  - "您正在配置捆绑钩子的每个条目选项"
title: "捆绑挂钩"
---

OpenClaw 附带的挂钩以及每个挂钩的行为和选项。 [Hooks](/automation/hooks) 指南的一部分。

## <a id="bundled-hooks"></a> 捆绑挂钩

| 钩子                    | 事件                                               | 用途                                                    |
| ----------------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| `boot-md`               | `gateway:startup`                                    | 启动时运行工作区 `BOOT.md` 指令。           |
| `bootstrap-extra-files` | `agent:bootstrap`                                    | 将匹配的工作区引导文件添加到上下文中。         |
| `command-logger`        | `command`                                            | 将发出的命令事件附加到 JSONL 日志。              |
| `compaction-notifier`   | `session:compact:before`, `session:compact:after`    | 在支持的传送路径上添加压缩状态通知。 |
| `session-memory`        | `command:new`, `command:reset`, `session:auto-reset` | 将最近的对话摘录保存到工作区内存中。     |

使用 `openclaw hooks enable <hook-name>` 启用一个并验证其副作用。仅启动挂钩（例如 `boot-md`）等待下一次网关启动。

<a id="boot-md"></a>

### <a id="boot-md-details"></a> boot-md 详情

从每个已配置代理的已解析工作区运行非空 `BOOT.md`。由多个代理共享的工作区仅在为该工作区选择的第一个代理下运行一次。启动任务按顺序运行；失败的任务会被记录下来，并且不会阻止以后的任务。

它通过代理运行来执行指令，而不是作为 shell 脚本或引导文件注入。每次运行都使用新的临时 `agent:<id>:boot:<run-id>` 会话，在成功或失败后进行清理。现有会话及其历史记录将被保留。正常的最终响应传送被禁用；如果指令需要通知某人，则必须指定消息工具的渠道和目标。丢失或空的文件将被跳过。

保持启动指令简短且安全，以便在每次重新启动时重复。他们可以使用模型和工具功能，因此启用此挂钩可能会导致模型调用和出站副作用。

<a id="bootstrap-extra-files"></a>

### <a id="bootstrap-extra-files-config"></a> bootstrap-extra-files 配置

```json
{
  "hooks": {
    "internal": {
      "entries": {
        "bootstrap-extra-files": {
          "enabled": true,
          "paths": ["packages/*/AGENTS.md"]
        }
      }
    }
  }
}
```

优选`paths`。如果为空，则处理程序尝试 `patterns`，然后是 `files`；这些是替代方案，而不是合并列表。没有模式，钩子什么也不做。

路径相对于事件的工作空间进行解析，并且必须保留在其中，包括在符号链接解析之后。仅加载以下基本名称：`AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、`BOOTSTRAP.md` 和 `MEMORY.md`。

额外的文件会经过正常的引导过滤和注入限制。每个文件的读取次数上限为 2 MiB。注入默认为每个文件 20,000 个字符，总共 60,000 个字符，由代理默认或覆盖中的 `bootstrapMaxChars` 和 `bootstrapTotalMaxChars` 控制； `USER.md` 有单独的 4,000 个字符上限。重复的路径被删除。子智能体仅保留`AGENTS.md`； cron 和非私人对话有额外的 context/privacy 过滤器。用`/context detail`检查实际注入结果；请参阅 [Context](/concepts/context)。

`TOOLS.md` 不是可识别的运行时引导程序基本名称。 `openclaw doctor --fix` 归档工作区根 `TOOLS.md` 并将自定义内容合并到 `AGENTS.md` 的 `## Tools` 部分。其他以模式命名的`TOOLS.md`文件不迁移；将这些模式指向 `AGENTS.md`。

<a id="command-logger"></a>

### <a id="command-logger-details"></a> command-logger 详情

将每个发出的命令事件附加一行 JSON 到 `<stateDir>/logs/commands.log`。字段为 `timestamp`、`action`、`sessionKey`、`senderId` 和 `source`；缺少 sender/source 值将变为 `unknown`。核心发出 `/new`、`/reset` 和 `/stop`，而不是每个斜杠命令。

该处理程序等待追加，记录写入错误，并且不发送聊天确认。它不旋转日志。为其记录的会话和发件人标识符设置适当的访问和保留。参见[日志检查](/cli/hooks#command-logger-log-file)。

<a id="compaction-notifier"></a>

### <a id="compaction-notifier-details"></a> compaction-notifier 详情

添加压缩前的简短通知和成功压缩后的完成通知。通知可以包括消息计数和 before/after 令牌计数（如果可用）。它们遍历压缩调用者的通知回调；如果没有传递它们的回调，启用挂钩并不能保证消息可见。没有事后通知的事前通知可以指示跳过、失败或中断的压缩，而不是卡住的钩子。手册`/compact`不提供此钩子消息传递回调，因此它不是测试通知的可靠方法。

<a id="session-memory"></a>

### <a id="session-memory-details"></a> session-memory 详情

将结束会话的最近 user/assistant 文本保存在 `/new`、`/reset`（包括软重置）或自动 daily/idle 翻转上。自动翻转发出 `session:auto-reset`，而不是合成命令事件。当允许后续回合时检查到期时间；这不是一个在会话空闲时在每日边界写入内存的计时器。

默认情况下，工件为 `<workspace>/memory/YYYY-MM-DD-HHMM.md`，如果该文件名已存在，则带有数字后缀。日期使用 `agents.defaults.userTimezone`，然后在未设置用户时区时处理 `TZ`，并以主机时区作为后备。该文件记录会话身份和命令来源或自动重置原因。

| 参赛选项 | 默认值       | 行为                                                                                                        |
| ------------ | ------------- | --------------------------------------------------------------------------------------------------------------- |
| `messages`   | `15`          | 最近要包含的 user/assistant 消息；使用正整数。                                              |
| `llmSlug`    | `false`       | 向模型询问描述性文件名段。                                                                    |
| `model`      | 代理默认 | 可选配置的别名、默认提供程序上的裸模型 ID 或用于 slug 生成的 `provider/model`。 |

该钩子在重置关闭其活动窗口之前捕获离开的对话，然后在后台写入快照。捕获仅限于 4,096 条扫描消息和 8 MiB。隐身会话不会创建内存伪影，包括手动或自动重置时。手动重置不会等待文件写入或可选的 slug-model 调用；自动重置调度也独立于后继回合运行。在等待文件之前，请等待日志中的 `Session context saved to ...`。

这是经过过滤的摘录，而不是完整的文字记录或模型编写的摘要。它省略了斜杠命令文本、工具消息、会话间用户输入、静默回复标记和重复的传递镜像文本。如果抄本读取失败，该工件可以记录内容不可用。工作区是从 event/agent 配置解析的；您不需要添加 `workspace.dir` 密钥。

使用 `llmSlug: true`，对话文本将发送到配置的模型以命名文件。失败会退回到时间戳段。如果您不想进行额外的模型调用命名，请将其关闭。

<Note>
保存的摘录是工作区内存工件。如果还启用了 [ 会话记录索引 ](/reference/memory-config#session-memory-search)，则一次对话可以同时由 `memory` 和 `sessions` 表示，从而添加重叠结果和嵌入工作。对于仅钩调用，设置`memory.search.sources: ["memory"]`和`memory.search.rememberAcrossConversations: false`；仅 `sources` 并不能阻止交叉对话召回添加 `sessions`。对于完整转录本回忆，请禁用 `session-memory`。这些搜索设置不会禁用挂钩的文件写入或普通记录持久性。
</Note>
