---
summary: "论坛线程、历史记录和上下文限制、子代理线程会话和 ACP 通道绑定"
read_when:
  - "发布到 Discord 论坛或媒体频道"
  - "确定 Discord 线程映射到哪个会话"
  - "将 Discord 通道绑定到子代理或 ACP 代理"
title: "Discord 线程和会话"
sidebarTitle: "话题和会话"
---

Discord 线程、论坛和频道如何映射到 OpenClaw 会话。

## <a id="forum-channels"></a> 论坛频道

Discord 论坛频道和媒体频道只接受线程帖子。OpenClaw 支持两种创建方式：

- 向论坛父频道（`channel:<forumId>`）发送消息以自动创建线程。线程标题为消息的第一行非空内容（会截断为 Discord 100 个字符的线程名称限制）。
- 使用 `openclaw message thread create` 直接创建线程。对于论坛频道，不要传递 `--message-id`。

发送到论坛父频道以创建线程：

```bash
openclaw message send --channel discord --target channel:<forumId> \
  --message "Topic title\nBody of the post"
```

显式创建论坛线程：

```bash
openclaw message thread create --channel discord --target channel:<forumId> \
  --thread-name "Topic title" --message "Body of the post"
```

论坛父频道不接受 Discord 组件。如果你需要组件，请发送到线程本身（`channel:<threadId>`）。

当`thread-create`成功发送所有初始内容时，其结果报告`initialMessageDelivery`和`status: "delivered"`中确认的消息ID和块计数。 `threadSnapshot: "creation"`表示返回的`thread`字段描述了创建时间；请勿重试基于 `message_count` 或 `last_message_id` 的内容。空的独立线程没有初始交付收据。部分失败分别报告已接受的块； `failedChunkDelivery: "unknown"` 表示失败的块可能已交付，因此在重试之前检查线程。

## <a id="session-and-thread-behavior"></a> 会话和线程行为

<AccordionGroup>
  <Accordion id="history-context-and-thread-behavior" title="历史、上下文和线程行为">
    服务器组历史上下文：

    - `channels.discord.historyLimit` 默认 `20`
    - 回退：`messages.groupChat.historyLimit`
    - `0` 禁用自动 guild/thread 历史读取，而不是显式消息读取或回复上下文。

    承认的公会轮流从 Discord 获取他们最近的窗口，包括在网关重新启动后。线程轮次使用确切的线程通道，而不是其父通道。提及门控房间中未提及的消息仍然保持安静。排除当前和批处理的源消息、后续消息以及活动会话边界之前的行。发件人可见性仍然适用；过滤产生的消息少于配置的限制。即使 `allowBots: false` 禁用其触发回合的能力，其他机器人的消息仍可作为上下文使用。接收机器人自己的输出被排除在自动历史记录之外。

    人工回复携带独立于 `allowBots` 的所选父消息。缺失或空的嵌套回复有效负载是从 Discord 获取的。如果父级被删除或不可用，其回复 ID 仍保留在上下文中，而不是默默地将消息变成不相关的顶级问题。 `contextVisibility` 仍然控制包含哪些补充回复内容。

    Discord 拥有历史记录：新读取反映其当前消息内容、删除、权限和可用性。不会创建单独的持久消息存档。如果自动恢复失败，OpenClaw 会记录遗漏并继续所处理的轮次。没有可重用本地媒体的历史附件将被标记为不可用，而不是恢复过时的媒体。恢复不会重写之前的代理记录。

    现有的 `message(action="read")` 工具保留本机分页和精确的消息查找。重新启动或 `/new` 后，旧的读取仍然可用，但须遵守 Discord 的 **读取消息历史记录** 权限和当前访问规则。

    DM 历史控制：

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`

    线程行为：

    - Discord 线程会作为频道会话路由，并继承父频道配置，除非被覆盖。
    - 线程会话会继承父频道的会话级 `/model` 选择，作为仅模型的回退；线程本地的 `/model` 选择优先，且除非启用了转录继承，否则不会复制父转录历史。
    - `channels.discord.thread.inheritParent`（默认 `false`）会让新自动线程从父转录中进行种子初始化。按账户覆盖：`channels.discord.accounts.<id>.thread.inheritParent`。
    - 消息工具反应可以解析 `user:<id>` DM 目标。
    - `guilds.<guild>.channels.<channel>.requireMention: false` 会在回复阶段激活回退时保留。

    频道主题会作为**不受信任**的上下文注入。允许列表限制的是谁可以触发代理，而不是完整的补充上下文删减边界。

  </Accordion>

  <Accordion id="thread-bound-sessions-for-subagents" title="子代理的线程绑定会话">
    Discord 可以将线程绑定到某个会话目标，这样该线程中的后续消息会继续路由到同一个会话（包括子代理会话）。

    命令：

    - `/session unbind` 删除当前线程绑定而不关闭其代理会话
    - `/agents` 显示当前运行和绑定状态
    - `/session idle <duration|off>` inspect/update 当前绑定不活动到期
    - `/session max-age <duration|off>` inspect/update 当前绑定的硬最大年龄

    配置：

```json5
{
  session: {
    threadBindings: {
      enabled: true,
      idleHours: 24,
      maxAgeHours: 0,
      spawnSessions: true,
      defaultSpawnContext: "fork",
    },
  },
}
```

    注意：

    - `session.threadBindings.*` 是 Discord 和 Telegram 的共享策略。
    - `spawnSessions` 控制 `sessions_spawn({ thread: true })` 和 ACP 线程生成的自动 create/bind 线程。默认值：`true`。
    - `defaultSpawnContext` 控制线程绑定生成的原生子代理上下文。默认值：`"fork"`。
    - 已弃用的 `spawnSubagentSessions`/`spawnAcpSessions` 键会由 `openclaw doctor --fix` 迁移。
    - 如果禁用线程绑定，则线程绑定生成不可用。

    请参阅 [ 子代理 ](/tools/subagents)、[ACP Agents](/tools/acp-agents) 和 [ 配置 Reference](/gateway/configuration-reference)。

  </Accordion>

  <Accordion id="persistent-acp-channel-bindings" title="持久 ACP 通道绑定">
    对于稳定的“始终在线”ACP 工作区，请配置针对 Discord 对话的顶级类型化 ACP 绑定。

    配置路径：`bindings[]`，其中 `type: "acp"` 且 `match.channel: "discord"`。

```json5
{
  agents: {
    entries: {
      codex: {
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
      },
    },
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "discord",
        accountId: "default",
        peer: { kind: "channel", id: "222222222222222222" },
      },
      acp: { label: "codex-main" },
    },
  ],
  channels: {
    discord: {
      guilds: {
        "111111111111111111": {
          channels: {
            "222222222222222222": {
              requireMention: false,
            },
          },
        },
      },
    },
  },
}
```

    注意：

    - `/acp spawn codex --bind here` 会就地绑定当前频道或线程，并让未来的消息保持在同一个 ACP 会话上。线程消息会继承父频道绑定。
    - 在已绑定的频道或线程中，`/new` 和 `/reset` 会就地重置同一个 ACP 会话。临时线程绑定在启用时可以覆盖目标解析。
    - `spawnSessions` 通过 `--thread auto|here` 门子线程 creation/binding。

    有关绑定行为的详细信息，请参阅 [ACP Agents](/tools/acp-agents)。

  </Accordion>
</AccordionGroup>
