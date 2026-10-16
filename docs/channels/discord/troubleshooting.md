---
summary: "修复了公会消息被阻止、意图错误、网关超时、机器人循环和语音 STT 丢失的问题"
read_when:
  - "Discord 机器人不在公会频道或 DM 中回复"
  - "出现 Discord 网关超时、重复回复或机器人到机器人循环"
  - "语音语音转文本因解密失败而丢失"
title: "Discord 故障排除"
sidebarTitle: "故障排查"
---

症状优先检查是否存在不正常行为的 Discord 帐户。

每个帐户开始在信息级别记录 `[account] starting account (reason: ...)`。原因是区分启动、手动启动、自动重试、运行状况恢复、config/plugin/secret 重新加载和主机解冻恢复。 Discord 套接字重新连接或恢复保留在现有帐户生命周期内，并且不会生成此行。事件循环停顿标签在其指定操作处于活动状态时标识工作；它本身并不确定帐户已重新启动。

## <a id="troubleshooting"></a> 故障排查

<AccordionGroup>
  <Accordion id="used-disallowed-intents-or-bot-sees-no-guild-messages" title="使用了不允许的意图或机器人看不到公会消息">

    - 启用 Message Content Intent
    - 当您依赖 user/member 分辨率时的 enable 服务器成员意图
    - 更改 intents 后重启 gateway

  </Accordion>

  <Accordion id="guild-messages-blocked-unexpectedly" title="公会消息意外被屏蔽">

    - 验证 `groupPolicy`
    - 验证 `channels.discord.guilds` 下的服务器 allowlist
    - 如果存在某个服务器的 `channels` map，则只允许列表中的 channels
    - 验证 `requireMention` 行为和 mention 模式

    当有效策略为 `allowlist` 但未配置行会时，Control UI 通道详细信息和 `openclaw channels status` 会发出警告。在 `channels.discord.guilds` 下添加您的服务器，或在覆盖时在帐户的 `guilds` 映射下添加您的服务器。即使帐户映射为空，显式 `channels.discord.accounts.default.guilds` 映射也会覆盖顶级映射。

    如果状态报告延迟配置重新加载，请等待活动工作完成并刷新。成功的通道 stop/start 不会应用未发布的配置。该警告将等待发布配置与发布后推迟的通道工作区分开来；仅连接运行状况并不能确认策略更改已应用。

    有用的检查：

```bash
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

  </Accordion>

  <Accordion id="require-mention-false-but-still-blocked" title="要求提及错误但仍被阻止">
    常见原因：

    - `groupPolicy="allowlist"` 不匹配 guild/channel 白名单
    - `requireMention` 配置在错误的位置（必须位于 `channels.discord.guilds` 下，或某个 channel 条目中）
    - 发件人被 guild/channel `users` 白名单阻止

  </Accordion>

  <Accordion id="long-running-discord-turns-or-duplicate-replies" title="长时间运行的 Discord 轮流或重复回复">

    典型日志：

    - `Slow listener detected ...`
    - `stuck session: sessionKey=agent:...:discord:... state=processing ...`

    Discord 不会对排队中的 agent 轮次应用由 channel 所有的超时。消息监听器会立即移交处理，排队中的 Discord 运行会保持每个 session 的顺序，直到 session/tool/runtime 生命周期完成或工作被中止。

  </Accordion>

  <Accordion id="gateway-metadata-lookup-timeout-warnings" title="网关元数据查找超时警告">
    OpenClaw 在连接前会获取 Discord 的 `/gateway/bot` 元数据。临时性失败会回退到 Discord 的默认 gateway URL，并在日志中限流。

    元数据超时默认为 30 秒。对于特殊的主机环境，可以通过 `OPENCLAW_DISCORD_GATEWAY_INFO_TIMEOUT_MS` 覆盖该值。

  </Accordion>

  <Accordion id="gateway-ready-timeout-restarts" title="网关READY超时重启">
    OpenClaw 在启动期间以及运行时重连后，会等待 Discord gateway 的 `READY` 事件。带有启动错峰的多账号设置，可能需要比默认值更长的启动 READY 窗口。

    启动时等待 15 秒，运行时重连等待 30 秒。对于特殊的主机环境，仍可使用 `OPENCLAW_DISCORD_READY_TIMEOUT_MS` 和 `OPENCLAW_DISCORD_RUNTIME_READY_TIMEOUT_MS`。

  </Accordion>

  <Accordion id="permissions-audit-mismatches" title="权限审核不匹配">
    `channels status --probe` 权限检查仅适用于数字通道 ID。

    如果您使用 slug 键，运行时匹配仍然可以工作，但检查无法完全验证权限。

  </Accordion>

  <Accordion id="dm-and-pairing-issues" title="DM 和配对问题">

    - DM 已禁用：`channels.discord.dm.enabled=false`
    - DM 策略已禁用：`channels.discord.dmPolicy="disabled"`（旧版：`channels.discord.dm.policy`）
    - 在 `pairing` 模式下等待配对审批

  </Accordion>

  <Accordion id="bot-to-bot-loops" title="机器人到机器人循环">
    根据正常提及和访问规则，默认情况下接受机器人编写的消息。

    保留适合房间的提及和许可名单规则。设置 `channels.discord.allowBots=false` 以禁用机器人触发的轮次，或设置 `channels.discord.allowBots="mentions"` 以仅接受提及该机器人的机器人消息。这些设置不会隐藏可访问的机器人编写的历史记录或人工选择的回复上下文。在 `"mentions"` 模式下，仅回复 ping 元数据不算在内。机器人回复需要活跃的本机提及或在 Markdown 代码之外配置的 text/transcript 提及。

    OpenClaw 还提供共享的 [bot 回路保护 ](/channels/bot-loop-protection)。每当 `allowBots` 让机器人编写的消息到达调度时，Discord 会将入站事件映射到 `(account, channel, bot pair)` 事实，并且通用对防护会在该对超过配置的事件预算后抑制该对。守卫限制了两个机器人的快速循环；低于预算的交换可以继续。它不会影响低于预算的人工消息或一次性机器人回复。

    默认设置（每当机器人编写的消息被允许时就处于活动状态）：

    - `maxEventsPerWindow: 20` -- bot pair 可在滑动窗口内交换 20 条消息
    - `windowSeconds: 60` -- 滑动窗口长度
    - `cooldownSeconds: 60` -- 一旦预算触发，任何方向上的后续 bot-to-bot 消息都会在一分钟内被丢弃

    先在 `channels.defaults.botLoopProtection` 下配置共享默认值，然后在合法工作流需要更大余量时覆盖 Discord。优先级如下：

    - `channels.discord.accounts.<account>.botLoopProtection`
    - `channels.discord.botLoopProtection`
    - `channels.defaults.botLoopProtection`
    - 内置默认值

    Discord 使用通用的 `maxEventsPerWindow`、`windowSeconds` 和 `cooldownSeconds` 键。

```json5
{
  channels: {
    defaults: {
      botLoopProtection: {
        maxEventsPerWindow: 20,
        windowSeconds: 60,
        cooldownSeconds: 60,
      },
    },
    discord: {
      // Optional Discord-wide override. Account blocks override individual
      // fields and inherit omitted fields from here.
      botLoopProtection: {
        maxEventsPerWindow: 4,
      },
      accounts: {
        alpha: {
          // Alpha listens to other bots only when they mention it.
          allowBots: "mentions",
        },
        bravo: {
          // Bravo listens to all bot-authored Discord messages.
          allowBots: true,
          mentionAliases: {
            // Lets Bravo write an Alpha Discord mention with the configured user id.
            Alpha: "ALPHA_DISCORD_USER_ID",
          },
          botLoopProtection: {
            // Allow up to five messages per minute before suppressing the pair.
            maxEventsPerWindow: 5,
            windowSeconds: 60,
            cooldownSeconds: 90,
          },
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion id="voice-stt-drops-with-decryptionfailed" title="语音 STT 随 DecryptionFailed（...） 一起掉落">

    - run OpenClaw 2026.2.24 或更新版本 （`openclaw update`），添加了 Discord 语音接收恢复逻辑的版本 （[#25861](https://github.com/openclaw/openclaw/pull/25861)）
    - 确认 `channels.discord.voice.daveEncryption=true`（默认值）
    - 从 `channels.discord.voice.decryptionFailureTolerance=24`（上游默认值）开始，仅在需要时调整
    - 关注日志：
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - 如果自动重新加入后失败仍然持续，收集日志并与上游 DAVE receive 历史对照：[discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) 和 [discord.js #11449](https://github.com/discordjs/discord.js/pull/11449)

  </Accordion>
</AccordionGroup>
