---
summary: "全新会话、上下文截断、完全重置、组和多代理设置"
title: "会话和多个聊天"
read_when:
  - "您正在管理会话、重置或上下文限制"
  - "您运行多个聊天、群组或机器人"
---

## <a id="sessions-and-multiple-chats"></a> 会话和多个聊天

<AccordionGroup>
  <Accordion id="how-do-i-start-a-fresh-conversation" title="如何开始新的对话？">
    发送 `/new` 或 `/reset` 作为独立消息。参见 [会话管理](/concepts/session)。
  </Accordion>

  <Accordion id="do-sessions-reset-automatically-if-i-never-send-new" title="如果我从不发送/new，会话会自动重置吗？">
    不会，默认不会。会话会保持相同的 `sessionId`，随着对话增长，压缩会限制活动模型上下文的大小。你仍然可以使用 `/new` 和 `/reset`，也可以选择通过 `mode: "daily"` 或 `mode: "idle"` 启用自动重置。每日模式会在网关主机的 `session.reset.atHour`（默认为 `4`，范围为 0-23）时滚动重置；空闲模式则根据上次真实交互后的 `session.reset.idleMinutes` 计算，不包含 heartbeat/cron/exec 系统事件。

    ```json5
    {
      session: {
        reset: { mode: "daily", atHour: 4 },
        resetByType: {
          group: { mode: "idle", idleMinutes: 120 },
          thread: { mode: "daily", atHour: 6 },
        },
        resetByChannel: {
          discord: { mode: "idle", idleMinutes: 10080 },
        },
      },
    }
    ```

    `resetByType` 支持 `direct`、`group` 和 `thread`。 Doctor 将旧版 `dm` 条目迁移到 `direct`；该架构拒绝 `dm`。当未设置 `session.reset`/`resetByType` 块时，旧版顶级 `session.idleMinutes` 仍可用作空闲模式默认值的兼容性别名。有关完整生命周期，请参阅 [ 会话管理](/concepts/session)。

  </Accordion>

  <Accordion id="is-there-a-way-to-make-a-team-of-openclaw-instances-one-ceo-and-many-agents" title="有没有办法让 OpenClaw 实例组成一个团队（一个 CEO 和许多代理）？">
    有，通过 **多代理路由**（multi-agent routing）和 **子代理**（sub-agents）：一个协调代理，加上多个拥有各自工作区和模型的工作代理。

    最好把它看作一个有趣的实验——它很耗 token，通常也不如一个带多个独立会话的 bot 高效。典型模式是：你只和一个 bot 交互，用不同会话并行处理工作，需要时再生成子代理。

    文档：[多代理路由](/concepts/multi-agent)、[子代理](/tools/subagents)、[代理 CLI](/cli/agents)。

  </Accordion>

  <Accordion id="why-did-context-get-truncated-mid-task-how-do-i-prevent-it" title="为什么上下文在任务中被截断？我该如何预防？">
    会话上下文受模型窗口限制。长对话、大量工具输出或许多文件都可能触发压缩或截断。

    - 让 bot 总结当前状态并写入文件。
    - 长任务前使用 `/compact`，切换主题时使用 `/new`。
    - 将重要上下文保存在工作区中，并让 bot 重新读取。
    - 对于长时间或并行工作使用子代理，让主聊天保持更小。
    - 如果经常发生，选择上下文窗口更大的模型。

  </Accordion>

  <Accordion id="how-do-i-completely-reset-openclaw-but-keep-it-installed" title="如何完全重置 OpenClaw 但保持安装状态？">
    ```bash
    openclaw reset
    ```

    非交互式完整重置：

    ```bash
    openclaw reset --scope full --yes --non-interactive
    ```

    然后重新运行设置：

    ```bash
    openclaw onboard --install-daemon
    ```

    要重置并立即重新运行登录，请传递 `openclaw onboard --reset`；重置是一个命令标志，而不是 **设置模式** 菜单选择。请参阅 [ 入门 （CLI）](/start/wizard)。如果您使用配置文件 （`--profile` / `OPENCLAW_PROFILE`），请重置每个状态目录（默认 `~/.openclaw-<profile>`）。仅开发重置：`openclaw gateway --dev --reset` 擦除开发配置、凭据、会话和工作区。

  </Accordion>

  <Accordion id="i-am-getting-context-too-large-errors-how-do-i-reset-or-compact" title='我收到“上下文太大”错误 - 如何重置或压缩？'>
    - **压缩**（保留对话，概括较早轮次）：使用 `/compact` 或 `/compact <instructions>` 来引导摘要。
    - **重置**（为同一聊天键创建新的会话 ID）：使用 `/new` 或 `/reset`。

    如果问题持续发生，请调整 **会话裁剪**（`agents.defaults.contextPruning`）以裁剪旧的工具输出，或者使用上下文窗口更大的模型。

    文档：[压缩](/concepts/compaction)、[会话裁剪](/concepts/session-pruning)、[会话管理](/concepts/session)。

  </Accordion>

  <Accordion id="why-am-i-seeing-llm-request-rejected-messages-content-tool-use-input-field-required" title='为什么我会看到“LLM 请求被拒绝：messages.content.tool_use.input 字段需要”？'>
    提供者验证错误：模型发出了 `tool_use` 块，但没有所需的 `input`。通常意味着会话历史记录已过时或已损坏（通常在长线程或 tool/schema 更改之后）。

    修复：使用 `/new`（独立消息）开启一个新会话。

  </Accordion>

  <Accordion id="why-am-i-getting-heartbeat-messages-every-30-minutes" title="为什么我每 30 分钟就会收到一次心跳消息？">
    Heartbeat 默认每 **30m** 运行一次；如果解析出的认证模式是 Anthropic OAuth/token auth（包括 Claude CLI 复用）且未设置 `heartbeat.every`，则为 **1h**。可按需调整或禁用：

    ```json5
    {
      agents: {
        defaults: {
          heartbeat: {
            every: "2h", // or "0m" to disable recurring cadence
          },
        },
      },
    }
    ```

    心跳指令存在于监视器的 cron 暂存中。有效清空暂存跳过心跳运行以保存API调用；没有划痕，心跳仍然运行，模型决定做什么。 `0m` 不会阻止目标事件驱动的唤醒，例如后台执行完成后续操作；这些仍然可以运行一个代理轮，而无需启用重复节奏。

    每个代理的覆盖配置使用 `agents.entries.*.heartbeat`。文档：[Heartbeat](/gateway/heartbeat)。

  </Accordion>

  <Accordion id="do-i-need-to-add-a-bot-account-to-a-whatsapp-group" title='我需要向 WhatsApp 组添加“机器人帐户”吗？'>
    不需要。OpenClaw 运行在**你自己的账号**上——如果你在群里，OpenClaw 就能看到。默认情况下，群组回复会被阻止，直到你允许发送者（`groupPolicy: "allowlist"`）。

    若只允许你自己在群组中触发回复：

    ```json5
    {
      channels: {
        whatsapp: {
          groupPolicy: "allowlist",
          groupAllowFrom: ["+15551234567"],
        },
      },
    }
    ```

  </Accordion>

  <Accordion id="how-do-i-get-the-jid-of-a-whatsapp-group" title="如何获取WhatsApp组的JID？">
    最快的方法：跟踪日志，并在群里发送一条测试消息。

    ```bash
    openclaw logs --follow --json
    ```

    查找以 `@g.us` 结尾的 `chatId`（或 `from`），例如 `1234567890-1234567890@g.us`。

    如果已经是 configured/allowlisted，则列出配置中的组：

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    文档：[WhatsApp](/channels/whatsapp)、[目录](/cli/directory)、[日志](/cli/logs)。

  </Accordion>

  <Accordion id="why-does-openclaw-not-reply-in-a-group" title="为什么OpenClaw在群里不回复？">
    两个常见原因：默认启用了提及门控（你必须 @mention bot，或匹配 `mentionPatterns`），或者你配置了 `channels.whatsapp.groups` 但没有包含 `"*"`，而该群不在允许列表中。

    参见 [群组](/channels/groups) 和 [群组消息](/channels/group-messages)。

  </Accordion>

  <Accordion id="do-groups-threads-share-context-with-dms" title="groups/threads 是否与 DM 共享上下文？">
    默认情况下，直接聊天会折叠到主会话。 Groups/channels 获得自己的会话密钥，除非路由绑定设置 `session.groupScope: "main"` 将该房间合并到主会话中； Telegram 主题/Discord 线程是单独的会话。请参阅 [Groups](/channels/groups) 和 [Group messages](/channels/group-messages)。
  </Accordion>

  <Accordion id="how-many-workspaces-and-agents-can-i-create" title="我可以创建多少个工作区和代理？">
    没有硬性限制——几十个甚至几百个都可以，但要注意：

    - **磁盘增长**：活动会话和记录位于每个代理 SQLite 数据库中； legacy/archive 工件仍然可以在 `~/.openclaw/agents/<agentId>/sessions/` 下累积。
    - **Token 成本**：代理越多，并发模型使用越多。
    - **运维开销**：每个代理的认证 profile、工作区和频道路由。

    每个代理只保留一个**活跃**工作区（`agents.defaults.workspace`），如果磁盘增长，使用 `openclaw sessions cleanup` 清理旧会话（不要手动编辑活跃的 SQLite 状态），并使用 `openclaw doctor` 找出多余的工作区和 profile 不匹配。

  </Accordion>

  <Accordion id="can-i-run-multiple-bots-or-chats-at-the-same-time-slack-and-how-should-i-set-that-up" title="我可以同时运行多个机器人或聊天 （Slack），我应该如何设置？">
    是的，通过 **多代理路由**：运行多个隔离代理并通过 channel/account/peer. 路由入站消息 Slack 支持作为通道，并且可以绑定到特定代理。

    浏览器访问功能强大，但无法“做人类能做的任何事情”——反机器人、验证码和 MFA 仍然可以阻止自动化。为了获得最可靠的控制，请在主机上使用本地 Chrome MCP，或在实际运行浏览器的计算机上使用 CDP。

    最佳实践配置：始终在线的 Gateway 主机（VPS/Mac mini）、每个角色一个代理（bindings）、绑定到这些代理的 Slack channel，以及在需要时通过 Chrome MCP 或 node 使用本地浏览器。

    文档：[多代理Routing](/concepts/multi-agent)、[Slack](/channels/slack)、[浏览器](/tools/browser)、[节点](/nodes)。

  </Accordion>
</AccordionGroup>
