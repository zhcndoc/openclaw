---
summary: "创建 Discord 应用程序、邀请机器人并设置公会工作区"
read_when:
  - "首次为 OpenClaw 设置 Discord 机器人"
  - "将 Discord 服务器添加到公会白名单"
title: "Discord 设置"
sidebarTitle: "设置"
---

让 Discord 机器人运行所需的一切：创建应用程序、授予意图、邀请它到服务器、配对并准备公会工作区。

## <a id="quick-setup"></a> 快速设置

创建一个带有机器人的 Discord 应用，将机器人添加到你的服务器，并将其与 OpenClaw 配对。如果可以，请使用私有服务器；如有需要，先[创建一个](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server)（**创建我自己的 > 供我和我的朋友使用**）。

<Steps>
  <Step id="create-a-discord-application-and-bot" title="创建 Discord 应用程序和机器人">
    在 [Discord 开发人员 Portal](https://discord.com/developers/applications) 中，单击 **新建应用程序** 并将其命名（例如“OpenClaw”）。

    在侧边栏中打开 **机器人**，并将 **用户名** 设置为你的代理名称。

  </Step>

  <Step id="enable-privileged-intents" title="启用特权意图">
    仍在 **机器人** 页面，在 **特权网关意图** 下启用：

    - **消息内容意图**（普通服务器消息所必需）
    - **服务器成员意图**（推荐；角色允许列表、名称到 ID 的匹配以及频道受众访问组所必需）
    - **在线状态意图**（可选；仅用于状态更新）

  </Step>

  <Step id="copy-your-bot-token" title="复制您的机器人令牌">
    在 **机器人** 页面，点击 **重置令牌** 并复制该令牌。

    <Note>
    尽管名称如此，这会生成你的第一个令牌——并没有真正进行“重置”。
    </Note>

  </Step>

  <Step id="generate-an-invite-url-and-add-the-bot-to-your-server" title="生成邀请 URL 并将机器人添加到您的服务器">
    在侧边栏中打开 **OAuth2**。在 **OAuth2 URL 生成器** 中，启用以下作用域：

    - `bot`
    - `applications.commands`

    在出现的 **机器人权限** 部分，至少启用：

    **常规权限**
      - 查看频道

    **文本权限**
      - 发送消息
      - 阅读消息历史记录
      - 嵌入链接
      - 附加文件
      - 添加反应（可选）

    这就是普通文本频道的基础权限。如果机器人还会在线程中发消息——包括会创建或继续线程的论坛或媒体频道工作流——也请启用 **在线程中发送消息**。

    复制生成的 URL，在浏览器中打开，选择你的服务器，然后点击 **继续**。此时机器人应该会出现在你的服务器中。

  </Step>

  <Step id="enable-developer-mode-and-collect-your-ids" title="启用开发者模式并收集您的 ID">
    在 Discord 应用程序中，启用开发者模式，以便您可以复制 ID：

    1. **用户设置**（齿轮图标）→ **开发者** → 打开 **开发者模式** *（在移动端：**应用设置** → **高级**）*
    2. 右键单击你的 **服务器图标** → **复制服务器 ID**
    3. 右键单击你自己的 **头像** → **复制用户 ID**

    将服务器 ID 和用户 ID 与你的机器人令牌一起保存；下一步你会需要这三者。

  </Step>

  <Step id="allow-dms-from-server-members" title="允许来自服务器成员的 DM">
    为了使配对正常工作，Discord 必须让机器人 DM 进行操作。右键单击您的 **服务器图标** → **隐私设置** → 打开 **直接消息**。

    如果你使用 Discord 私信和 OpenClaw，请保持开启。如果你只使用服务器频道，配对完成后可以将其关闭。

  </Step>

  <Step id="set-your-bot-token-securely-do-not-send-it-in-chat" title="安全地设置您的机器人令牌（不要在聊天中发送）">
    机器人令牌是机密信息。在向你的代理发送消息之前，先在运行 OpenClaw 的机器上设置它：

```bash
export DISCORD_BOT_TOKEN="YOUR_BOT_TOKEN"
cat > discord.patch.json5 <<'JSON5'
{
  channels: {
    discord: {
      enabled: true,
      token: { source: "env", provider: "default", id: "DISCORD_BOT_TOKEN" },
    },
  },
}
JSON5
openclaw config patch --file ./discord.patch.json5 --dry-run
openclaw config patch --file ./discord.patch.json5
openclaw gateway
```

    如果 OpenClaw 已作为后台服务运行，请通过 OpenClaw Mac 应用程序或停止并重新启动 `openclaw gateway run` 进程来重新启动它。对于托管服务安装，请从设置了 `DISCORD_BOT_TOKEN` 的 shell 运行 `openclaw gateway install`，或将变量存储在 `~/.openclaw/.env` 中，以便服务在重新启动后可以解析环境 SecretRef。如果您的主机被 Discord 的启动应用程序查找阻止或速率限制，请从开发人员门户设置 application/client ID，以便启动可以跳过该 REST 调用：默认帐户为 `channels.discord.applicationId`，或每个机器人为 `channels.discord.accounts.<accountId>.applicationId`。

  </Step>

  <Step id="configure-openclaw-and-pair" title="配置 OpenClaw 并配对">

    <Tabs>
      <Tab id="ask-your-agent" title="询问您的智能体">
        在现有频道（例如 Telegram）上与您的 OpenClaw 代理聊天并告诉它。如果 Discord 是您的第一个通道，请改用 CLI / 配置选项卡。

        > “我已经把 Discord 机器人令牌设置到配置中了。请使用用户 ID `<user_id>` 和服务器 ID `<server_id>` 完成 Discord 设置。”
      </Tab>
      <Tab id="cli-%2F-config" title="CLI / 配置">
        基于文件的配置：

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: {
        source: "env",
        provider: "default",
        id: "DISCORD_BOT_TOKEN",
      },
    },
  },
}
```

        默认账户的 env 回退值：

```bash
DISCORD_BOT_TOKEN=...
```

        对于脚本化或远程设置，请使用 `openclaw config patch --file ./discord.patch.json5 --dry-run` 写入相同的 JSON5 块，然后在不使用 `--dry-run` 的情况下重新运行。明文 `token` 字符串也可以工作，并且跨 env/file/exec/store 提供程序的 `channels.discord.token` 支持 SecretRef 值。请参阅 [ 秘密 Management](/gateway/secrets)。

        对于多个 Discord 机器人，将每个机器人令牌和应用程序 ID 保持在各自的账户下。顶层的 `channels.discord.applicationId` 会被账户继承，因此只有当所有账户都使用相同的应用程序 ID 时才应在这里设置。

```json5
{
  channels: {
    discord: {
      enabled: true,
      accounts: {
        personal: {
          token: { source: "env", provider: "default", id: "DISCORD_PERSONAL_TOKEN" },
          applicationId: "111111111111111111",
        },
        work: {
          token: { source: "env", provider: "default", id: "DISCORD_WORK_TOKEN" },
          applicationId: "222222222222222222",
        },
      },
    },
  },
}
```

      </Tab>
    </Tabs>

  </Step>

  <Step id="approve-first-dm-pairing" title="批准第一个 DM 配对">
    网关运行后，DM 您的机器人将位于 Discord 中。它会回复一个配对码。

    <Tabs>
      <Tab id="ask-your-agent-2" title="询问您的智能体">
        在你现有的频道中把配对码发送给你的代理：

        > “批准这个 Discord 配对码：`<CODE>`”
      </Tab>
      <Tab title="CLI">

```bash
openclaw pairing list discord
openclaw pairing approve discord <CODE>
```

      </Tab>
    </Tabs>

    配对代码将在 1 小时后过期。批准后，在 Discord DM 中与您的代理聊天。

  </Step>
</Steps>

如果 Discord 无法授予消息内容意图，OpenClaw 仍然可以在用户明确提及机器人的 DM 和行会频道中运行。设置 `channels.discord.intents.messageContent: false`，以便网关不会请求不可用的特权意图，并在每个配置的行会通道上保留 `requireMention: true`。 Discord 在此模式下省略其他公会消息中用户创作的内容。

<Note>
令牌解析是帐户感知的。配置令牌值胜过 env 后备，并且 `DISCORD_BOT_TOKEN` 仅用于默认帐户。如果两个已启用的 Discord 帐户解析为同一个机器人令牌，则 OpenClaw 仅为该令牌启动一个网关监视器：配置来源的令牌胜过 env 回退；否则，第一个启用的帐户将获胜，并且重复的帐户将被报告为禁用，原因为 `duplicate bot token`。对于高级出站呼叫（消息 tool/channel 操作），显式每次呼叫 `token` 用于该呼叫。这适用于发送和 read/check-style 操作 （read/search/fetch/thread/pins/permissions）。帐户 policy/retry 设置仍然来自活动运行时快照中选定的帐户。
</Note>

## <a id="recommended%3A-set-up-a-guild-workspace"></a><a id="recommended-set-up-a-guild-workspace"></a> 推荐：设置 guild 工作区

一旦私信正常工作，你就可以把服务器变成一个完整的工作区，让每个频道都有自己独立的代理会话和上下文。推荐用于只有你和机器人在的私有服务器。

<Steps>
  <Step id="add-your-server-to-the-guild-allowlist" title="将您的服务器添加到公会白名单中">
    这样可以让你的代理在服务器上的任何频道响应，而不只是私信。

    <Tabs>
      <Tab id="ask-your-agent-3" title="询问您的智能体">
        > “把我的 Discord Server ID `<server_id>` 添加到 guild 白名单”
      </Tab>
      <Tab id="config" title="配置">

```json5
{
  channels: {
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        YOUR_SERVER_ID: {
          requireMention: true,
          users: ["YOUR_USER_ID"],
        },
      },
    },
  },
}
```

      </Tab>
    </Tabs>

  </Step>

  <Step id="allow-responses-without-%40mention" title="允许不带 @mention 的响应">
    默认情况下，代理仅在 @mentioned. 时在公会频道中响应。在私人服务器上，您可能希望它响应每条消息。

    在公会频道中，普通回复默认会自动发布。对于始终在线的共享房间，请选择 `messages.groupChat.visibleReplies: "message_tool"`，以便代理可以潜伏并仅在认为频道回复有用时才发布。这最适合最新一代、工具可靠的模型，例如 GPT-6 Astra。除非工具发送，否则环境房间事件将保持安静。请参阅 [ 环境房间事件 ](/channels/ambient-room-events) 了解完整的潜伏模式配置。

    如果 Discord 显示正在输入，而且日志显示 token 使用量但没有实际发出消息，请检查该轮次是否被配置为环境房间事件，或者是否启用了消息工具可见回复。

    会话繁忙通知也遵循此回复策略。对于环境事件和消息工具回复，Discord 在网关日志中记录故障和抑制通知，而不发布到房间。

    <Tabs>
      <Tab id="ask-your-agent-4" title="询问您的智能体">
        > “允许我的代理在此服务器上响应，而不必是 @mentioned”
      </Tab>
      <Tab id="config-2" title="配置">
        在你的公会配置中设置 `requireMention: false`：

```json5
{
  channels: {
    discord: {
      guilds: {
        YOUR_SERVER_ID: {
          requireMention: false,
        },
      },
    },
  },
}
```

        要要求消息工具发送可见的 group/channel 回复，请设置 `messages.groupChat.visibleReplies: "message_tool"`。

      </Tab>
    </Tabs>

  </Step>

  <Step id="plan-for-memory-in-guild-channels" title="公会频道内存规划">
    长期记忆 （MEMORY.md） 仅在 DM 会话中自动加载；公会频道不加载它。

    <Tabs>
      <Tab id="ask-your-agent-5" title="询问您的智能体">
        > “当我在 Discord 频道中提问时，如果您需要来自 MEMORY.md. 的长期上下文，请使用 memory_search 或 memory_get”
      </Tab>
      <Tab id="manual" title="手动的">
        如果要为每个频道共享上下文，请把稳定的指令放在 `AGENTS.md` 或 `USER.md` 中（每个会话都会注入）。把长期笔记保存在 `MEMORY.md` 中，并在需要时使用 memory 工具访问它们。
      </Tab>
    </Tabs>

  </Step>
</Steps>

现在创建频道并开始聊天。代理会看到频道名称，而且每个频道都是一个独立会话——可以设置 `#coding`、`#home`、`#research`，或者任何适合你工作流的频道。
