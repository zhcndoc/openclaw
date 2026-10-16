---
summary: "创建 Telegram 机器人令牌，配置通道并批准第一个 DM"
read_when:
  - "首次将 Telegram 机器人连接到 OpenClaw"
  - "将机器人添加到群组并找到群聊 ID"
  - "设置BotFather隐私模式和组权限"
title: "Telegram 设置"
sidebarTitle: "设置"
---

在 BotFather 中创建机器人，为 OpenClaw 提供其代币，批准第一个 DM，并将机器人添加到组中。

## <a id="quick-setup"></a> 快速设置

<Steps>
  <Step id="create-the-bot-token-in-botfather" title="在 BotFather 中创建机器人令牌">
    这两种流程最终都会得到一个你可以粘贴到 OpenClaw 中的 token——任选其一：

    - **聊天流程**：打开Telegram并与**@BotFather**聊天。确认该句柄正是`@BotFather`。运行 `/newbot`，按照提示操作，然后保存令牌。
    - **网页流**：打开[Bot父亲的网页应用程序](https://t.me/BotFather?startapp)。它在每个 Telegram 客户端中运行，包括 [web.telegram.org](https://web.telegram.org). 在 UI 中创建机器人，然后复制其令牌。

  </Step>

  <Step id="configure-token-and-dm-policy" title="配置令牌和 DM 策略">
    最快的选项是 CLI。它会为您将令牌写入您的配置中：

```bash
openclaw channels add --channel telegram --token <bot-token>
```

    要手动编辑配置，请将其放入 `~/.openclaw/openclaw.json` 中：

```json5
{
  channels: {
    telegram: {
      enabled: true,
      botToken: "123:abc",
      dmPolicy: "pairing",
      groups: { "*": { requireMention: true } },
    },
  },
}
```

    Env 后备：`TELEGRAM_BOT_TOKEN`（仅限默认帐户）。指定帐户必须使用 `botToken` 或 `tokenFile`。 Telegram **不** 使用 `openclaw channels login telegram`。在 config 或 env 中设置令牌，然后启动网关。

  </Step>

  <Step id="verify-the-channel" title="验证通道">
    <a id="restart-the-gateway" />
    使用默认的 [hot reload](/gateway/configuration/hot-reload)，正在运行的网关将应用新的通道配置。检查 Telegram 是否准备就绪：

```bash
openclaw channels status --probe
```

    如果网关离线，请使用 `openclaw gateway start` 启动它以获取托管服务，或使用 `openclaw gateway` 在此终端中运行它。如果您更改了服务环境，请重新启动网关以加载它。

  </Step>

  <Step id="approve-your-first-dm" title="批准您的第一个 DM">
    打开 Telegram 并向您的机器人发送任何消息。该消息创建下一个命令列出的配对请求：

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    配对代码将在 1 小时后过期。

  </Step>

  <Step id="add-the-bot-to-a-group" title="将机器人添加到组中">
    将机器人添加到您的组中，然后获取组访问需要的两个 ID：

    - 你的 Telegram 用户 ID，用于 `allowFrom` / `groupAllowFrom`
    - Telegram 群聊 ID，作为 `channels.telegram.groups` 下的键

    从 `openclaw logs --follow`、转发的 ID 机器人或机器人 API `getUpdates` 获取群聊 ID。允许组后，`/whoami@<bot_username>` 确认用户和组 ID。

    以`-100`开头的负超群ID是群聊ID。它们属于 `channels.telegram.groups`，而不是 `groupAllowFrom`。

  </Step>
</Steps>

<Note>
令牌解析是帐户感知的。 `tokenFile` 击败 `botToken`，`botToken` 击败 env。 Config 始终胜过 `TELEGRAM_BOT_TOKEN`，它仅解析默认帐户。成功启动后，OpenClaw 会将机器人身份缓存长达 24 小时，因此重新启动时会跳过额外的 `getMe` 调用。更改或删除令牌会清除该缓存。
</Note>

## <a id="telegram-side-settings"></a> Telegram 侧设置

<AccordionGroup>
  <Accordion id="privacy-mode-and-group-visibility" title="隐私模式和群组可见性">
    Telegram 机器人的默认设置是 **隐私模式**，这会限制它们接收哪些群消息。

    要查看所有群消息，可以：

    - 通过 `/setprivacy` 禁用隐私模式，或
    - 将机器人设为群管理员。

    切换隐私模式后，请在每个群中移除并重新添加机器人，以便 Telegram 应用该更改。

  </Accordion>

  <Accordion id="group-permissions" title="组权限">
    管理员状态在 Telegram 群设置中控制。管理员机器人会接收所有群消息，这对于需要始终在线的群组行为很有用。
  </Accordion>

  <Accordion id="helpful-botfather-toggles" title="有用的 BotFather 切换">

    - `/setjoingroups` — allow/deny 组添加
    - `/setprivacy` — 群可见性行为

    如果您更喜欢 UI 而不是聊天命令，则可以在 [BotFather 的网络应用程序 ](https://t.me/BotFather?startapp) 中使用相同的设置。

  </Accordion>
</AccordionGroup>
