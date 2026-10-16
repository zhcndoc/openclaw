---
summary: "隐藏系统消息、取消运行、跨上下文消息传递和转向队列"
title: "聊天命令、中止任务和停止运行"
read_when:
  - "任务不会停止，或者机器人会忽略快速消息"
  - "您正在调整斜杠命令或队列"
---

## <a id="chat-commands%2C-aborting-tasks%2C-and-%22it-will-not-stop%22"></a><a id="chat-commands-aborting-tasks-and-it-will-not-stop"></a> 聊天命令、中止任务和“它不会停止”

<AccordionGroup>
  <Accordion id="how-do-i-stop-internal-system-messages-from-showing-in-chat" title="如何阻止内部系统消息在聊天中显示？">
    大多数 internal/tool 消息仅在为该会话启用 **verbose**、**trace** 或 **reasoning** 时才会出现。

    在你看到它的聊天中修复：

    ```text
    /verbose off
    /trace off
    /reasoning off
    ```

    如果仍然很吵：检查 Control UI 中的会话设置，将 verbose 设为 **继承**；确认你没有在配置中使用带有 `verboseDefault: "on"` 的 bot profile。

    文档：[思考与详细输出](/tools/thinking)，[安全](/gateway/security/index#reasoning-and-verbose-output-in-groups)。

  </Accordion>

  <Accordion id="how-do-i-stop-cancel-a-running-task" title="我如何 stop/cancel 运行任务？">
    以**独立消息**（不带斜杠）发送以下任意内容即可触发中止：`stop`、`stop action`、`stop current action`、`stop run`、`stop current run`、`stop agent`、`stop the agent`、`stop openclaw`、`openclaw stop`、`stop don't do anything`、`stop do not do anything`、`stop doing anything`、`do not do that`、`please stop`、`stop please`、`abort`、`esc`、`exit`、`interrupt`、`halt`。常见的非英语触发词（法语、德语、西班牙语、中文、日语、印地语、阿拉伯语、俄语）也同样有效。

    对于由 exec 工具启动的后台进程，让 agent 运行：

    ```text
    process action:kill sessionId:<sessionId>
    ```

    大多数斜杠命令必须作为以 `/` 开头的**独立**消息发送，但少数快捷方式（例如 `/status`）也可以由允许名单中的发送者以内联方式使用。请参阅 [斜杠命令](/tools/slash-commands)。

  </Accordion>

  <Accordion id="how-do-i-send-a-discord-message-from-telegram-cross-context-messaging-denied" title='如何从 Telegram 发送 Discord 消息？ （“跨上下文消息传递被拒绝”）'>
    OpenClaw 默认允许 **跨提供商** 消息传递。当配置了目标并且其工具和通道策略允许时，Telegram 或 WebChat 中的代理可以发送到 Discord。

    如果您看到“跨上下文消息传递被拒绝”，请在全局或代理的配置中检查 `tools.message.crossContext.allowAcrossProviders: false`。删除该限制或明确允许跨提供商消息传递；这无需重新启动网关即可生效：

    ```json5
    {
      tools: {
        message: {
          crossContext: {
            allowAcrossProviders: true,
            marker: { enabled: true, prefix: "[from {channel}] " },
          },
        },
      },
    }
    ```

    要阻止跨提供商消息传递，请设置 `allowAcrossProviders: false`。 `agents.entries.<id>.tools.message.crossContext` 下的每个代理值会覆盖全局设置。升级后，省略此设置的配置将使用新的默认值；现有的明确价值观仍然有效。无需配置迁移。

    当当前会话目标不可用时，包括重新启动恢复或子代理继续之后，显式限制仍然适用。源提供者足以强制执行它。

  </Accordion>

  <Accordion id="why-does-it-feel-like-the-bot-ignores-rapid-fire-messages" title='为什么感觉机器人“忽略”了连发的消息？'>
    运行中的提示默认会被转入当前活动运行。使用 `/queue` 来选择活动运行行为：

    - `steer`（默认）- 在下一个模型边界引导当前活动运行。
    - `followup` - 将消息排队，并在当前运行结束后一次处理一个。
    - `collect` - 在当前运行结束后将兼容的排队消息合并到一轮中。具有单独持久入口准入的消息（包括 Discord 和 Telegram）仍然一次运行一个。
    - `interrupt` - 中止当前运行并重新开始。

    可为排队模式添加选项，例如 `debounce:0.5s cap:25 drop:summarize`。请参阅 [命令队列](/concepts/queue) 和 [引导队列](/concepts/queue-steering)。

  </Accordion>
</AccordionGroup>
