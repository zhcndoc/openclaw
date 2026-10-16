---
summary: "论坛主题会话密钥、主题配置继承、每个主题代理和 ACP 绑定"
read_when:
  - "将论坛主题路由到其自己的代理"
  - "计算主题的 Telegram 会话密钥"
  - "将 ACP harness会话绑定到主题"
title: "Telegram 线程和会话"
sidebarTitle: "话题和会话"
---

论坛主题如何映射到会话、代理和 ACP 绑定。

## <a id="forum-topics-and-sessions"></a> 论坛主题和会话

<AccordionGroup>
  <Accordion id="forum-topics-and-thread-behavior" title="论坛主题和线程行为">
    论坛超级群组：话题会话键会追加 `:topic:<threadId>`；回复和输入状态会定位到对应的话题线程；话题配置路径为 `channels.telegram.groups.<chatId>.topics.<threadId>`。

    主题 ID 必须是正整数。 OpenClaw 在发出 Telegram 请求之前拒绝传递目标中的主题 `0` 和显式线程选项。

    通用话题（`threadId=1`）是个特殊情况：发送消息时会省略 `message_thread_id`（Telegram 会以 "thread not found" 拒绝 `sendMessage(...thread_id=1)`），但输入状态动作仍会包含 `message_thread_id`（经验证这是让输入指示器显示所必需的）。

    主题条目继承组设置，除非被覆盖（`requireMention`、`requireMentionInBotThreads`、`allowFrom`、`skills`、`systemPrompt`、`enabled`、`groupPolicy`）。 `agentId` 仅是主题，不会从组默认值继承。 `topics."*"` 为该组中的每个主题设置默认值；确切的主题 ID 仍然胜过 `"*"`。

    **按话题代理路由**：每个话题都可以通过话题配置中的 `agentId` 路由到不同的代理，为其提供自己的工作区、记忆和会话：

    ```json5
    {
      channels: {
        telegram: {
          groups: {
            "-1001234567890": {
              topics: {
                "1": { agentId: "main" },      // General topic -> main agent
                "3": { agentId: "zu" },        // Dev topic -> zu agent
                "5": { agentId: "coder" }      // Code review -> coder agent
              }
            }
          }
        }
      }
    }
    ```

    然后每个话题都会有自己的会话键，例如 `agent:zu:telegram:group:-1001234567890:topic:3`。

    **持久 ACP 主题绑定**：论坛主题可以通过顶级类型化绑定固定 ACP harness会话（`bindings[]` 与 `type: "acp"`、`match.channel: "telegram"`、`peer.kind: "group"` 和主题限定 ID，例如 `-1001234567890:topic:42`）。当前范围为 groups/supergroups. 中的论坛主题请参阅 [ACP Agents](/tools/acp-agents)。

    **从聊天中进行线程绑定的 ACP spawn**：`/acp spawn <agent> --thread here|auto` 会将当前话题绑定到一个新的 ACP 会话；后续消息会直接路由到那里，OpenClaw 会将 spawn 确认固定在该话题中。由 `session.threadBindings.spawnSessions` 控制（默认：`true`）。

    启动在接受更新之前等待存储的线程绑定。在替换机器人重新加载之前，关闭会耗尽已接受的绑定更改。捆绑的 Telegram 处理程序通过共享 SQLite 工作线程保留绑定，因此存储不会阻止消息处理。已弃用的同步插件 SDK 触摸和生命周期设置器将其直接行为保留在同一绑定所有者上，直到下一个 SDK 主要版本为止。

    全局禁用 `threadBindings.enabled`、Telegram 或一个帐户将使普通 Telegram 消息正常工作。

    模板上下文暴露 `MessageThreadId` 和 `IsForum`。带有 `message_thread_id` 的 DM 聊天会保留回复元数据，但只有当 Telegram `getMe` 报告 `has_topics_enabled: true` 时才会使用线程感知的会话键。 已弃用的 `dm.threadReplies` 和 `direct.*.threadReplies` 覆盖项已移除；BotFather 的 threaded mode 是唯一的真实来源。运行 `openclaw doctor --fix` 可移除过期的配置键。

  </Accordion>
</AccordionGroup>

## <a id="bot-created-forum-topics"></a> Bot 创建的论坛主题

在组或主题上设置 `requireMentionInBotThreads` 以覆盖仅在接收机器人创建的论坛主题中的提及门控。 `false` 允许未提及的消息在那里开始轮流； `true` 需要提及，包括对机器人的回复。省略保留了现有的行为。主题设置胜过所选组设置。 `channels.telegram.accounts.<accountId>.groups` 下也提供相同的路径。

OpenClaw 通过观察到的 `forum_topic_created` 服务消息或机器人成功创建主题来记录创建者。所有权特定于该机器人：另一个机器人的主题或人工创建的主题保留其普通提及政策。在主题中回复并不会使机器人成为其创建者。

主题所有权与主题名称一起保留在现有缓存​​中，最多保留 2,048 个最近使用的主题。在 OpenClaw 观察它们之前创建的主题和被逐出的条目保留普通提及策略。 Telegram 不提供主题所有者查找来恢复这些事实。此设置不会更改 DM 主题、授权、组静默策略或可见回复策略。请参阅 [ 提及行为 ](/channels/telegram/access-control#access-control-and-activation) 了解配置和 Telegram 可见性要求。
