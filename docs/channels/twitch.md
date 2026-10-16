---
summary: "Twitch 聊天机器人：安装、凭据、访问控制、令牌刷新"
read_when:
  - "为 OpenClaw 设置 Twitch 聊天集成"
title: "Twitch"
sidebarTitle: "Twitch"
---

通过 Twurple 客户端通过 Twitch 的聊天 （IRC） 界面支持 Twitch 聊天。 OpenClaw 以 Twitch 机器人帐户登录，为每个配置的帐户加入一个频道，并在该频道中回复。

## <a id="install"></a> 安装

Twitch 作为官方插件提供；它不属于核心安装的一部分。

<Tabs>
  <Tab id="npm-registry" title="npm 注册表">
    ```bash
    openclaw plugins install @openclaw/twitch
    ```
  </Tab>
  <Tab id="local-checkout" title="本地结账">
    ```bash
    openclaw plugins install ./path/to/local/twitch-plugin
    ```
  </Tab>
</Tabs>

`plugins install` 会注册并启用该插件。在 `openclaw onboard` 或 `openclaw channels add` 期间选择 Twitch 会按需安装它。使用不带版本号的软件包名称可跟随当前发布版本；仅在需要可复现安装时才固定到精确版本。需要 OpenClaw 2026.4.10 或更新版本。

详细信息：[插件](/tools/plugin)

## <a id="quick-setup"></a> 快速设置

<Steps>
  <Step id="install-the-plugin" title="安装插件">
    见上面的 [安装](#install)。
  </Step>
  <Step id="create-a-twitch-bot-account" title="创建 Twitch 机器人帐户">
    为机器人创建一个专用的 Twitch 账户（或者使用现有账户）。
  </Step>
  <Step id="generate-credentials" title="生成凭证">
    使用 [Twitch Token Generator](https://twitchtokengenerator.com/)：

    - 选择 **Bot Token**
    - 确认已选择 `chat:read` 和 `chat:write` 作用域
    - 复制 **Client ID** 和 **Access Token**

  </Step>
  <Step id="find-your-twitch-user-id" title="查找您的 Twitch 用户 ID">
    使用 [https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/) 将用户名转换为 Twitch 用户 ID。
  </Step>
  <Step id="configure-the-token" title="配置令牌">
    - 环境变量：`OPENCLAW_TWITCH_ACCESS_TOKEN=...`（仅默认账户）
    - 或配置：`channels.twitch.accessToken`

    如果两者都设置了，则以配置为准（环境变量仅作为默认账户的备用项）。

  </Step>
  <Step id="start-the-gateway" title="启动网关">
    ```bash
    openclaw gateway run
    ```
  </Step>
</Steps>

<Warning>
添加访问控制（`allowFrom` 或 `allowedRoles`）以防止未授权用户触发机器人。`requireMention` 默认值为 `true`。
</Warning>

最小配置：

```json5
{
  channels: {
    twitch: {
      enabled: true,
      username: "openclaw", // Bot's Twitch account (authenticates)
      accessToken: "oauth:abc123...", // OAuth access token (or use OPENCLAW_TWITCH_ACCESS_TOKEN env var)
      clientId: "xyz789...", // Client ID from Token Generator
      channel: "yourchannel", // Which Twitch channel's chat to join (required)
      allowFrom: ["123456789"], // (recommended) Your Twitch user ID only
    },
  },
}
```

## <a id="what-it-is"></a> 它是什么

- 由 Gateway 拥有的 Twitch 频道。
- 回复始终返回到消息来源的 Twitch 通道。
- 每个已加入的频道都会映射到一个隔离的组会话密钥 `agent:<agentId>:twitch:group:<channel>`。
- `username` 是机器人的账号（进行身份验证），`channel` 是要加入的聊天房间。一个账号条目只加入一个频道。
- Token 带或不带 `oauth:` 前缀都可以；OpenClaw 会按两种方式进行规范化（设置向导期望的是 `oauth:` 格式）。

## <a id="inbound-durability"></a> 入站持久性

OpenClaw 会在正常分发之前，将每条已接受的 Twitch 聊天消息持久化入队。待处理或可重试的消息在 Gateway 重启后仍会保留，保持为已配置频道的序列化状态，并使用 Twitch 的消息 ID 来抑制重复的队列条目，只要活动的或保留的完成记录存在即可。

Twitch 聊天在客户端接受 `PRIVMSG` 后不会重放该消息。这可以保护本地“接受到分发”之间的崩溃窗口，但无法恢复在持久化接纳之前遗漏的消息。如果队列追加本身失败，OpenClaw 会记录该失败；重新连接不会要求 Twitch 重新发送该消息。

## <a id="token-refresh-(optional)"></a><a id="token-refresh-optional"></a> 令牌刷新（可选）

来自 [Twitch Token Generator](https://twitchtokengenerator.com/) 的令牌无法被 OpenClaw 刷新 - 过期时请重新生成（它们通常只会持续几个小时；无需应用注册）。

对于自动刷新，请在 [Twitch 开发人员 Console](https://dev.twitch.tv/console) 创建您自己的应用程序并添加：

```json5
{
  channels: {
    twitch: {
      username: "openclaw",
      accessToken: "oauth:abc123...",
      clientId: "xyz789...",
      channel: "yourchannel",
      clientSecret: "your_client_secret",
      refreshToken: "your_refresh_token",
    },
  },
}
```

当两者都设置后，插件会使用可刷新的认证提供者，在令牌过期前自动续期，并记录每次刷新。若没有 `refreshToken`，它会记录 `token refresh disabled (no refresh token)`；若没有 `clientSecret`，则会回退到静态（不可刷新的）令牌。

## <a id="multi-account-support"></a> 多账户支持

使用 `channels.twitch.accounts` 配合每个账户各自的凭据。请参阅 [配置](/gateway/configuration) 了解通用模式。

示例（一个机器人账户在两个频道中）：

```json5
{
  channels: {
    twitch: {
      accounts: {
        channel1: {
          username: "openclaw",
          accessToken: "oauth:abc123...",
          clientId: "xyz789...",
          channel: "yourchannel",
        },
        channel2: {
          username: "openclaw",
          accessToken: "oauth:def456...",
          clientId: "uvw012...",
          channel: "secondchannel",
        },
      },
    },
  },
}
```

<Note>
每个账户条目都需要自己的 `accessToken`（环境变量只覆盖默认账户）。一个账户只会加入一个频道，因此加入两个频道就需要两个账户。`channels.twitch.defaultAccount` 用于选择哪个账户作为默认账户。
</Note>

## <a id="access-control"></a> 访问控制

`allowFrom` 是 Twitch 用户 ID 的硬允许列表。设置时，`allowedRoles` 被忽略；保留 `allowFrom` 未设置以使用基于角色的访问。

在设置向导中，**Disabled** 通过写入空的 `allowFrom` 列表来阻止所有聊天。 **Open** 删除用户 ID 白名单并允许所有角色。 **Allowlist** 保留一个非空用户 ID 列表；否则，它会删除空覆盖并允许版主和 VIP。所有三个选择都需要 @mention.

选择 **Open** 或 **Disabled** 将丢弃任何以前的用户 ID。切换回 **Allowlist** 不会恢复它们；再次配置`allowFrom`，限制特定ID的访问。

没有 `allowFrom` 且 `allowedRoles` 为空或不存在的现有配置保持打开状态。没有自动迁移，因为这些值不记录是否有意禁用。在设置中重新选择 **Disabled** 或配置 `allowFrom: []` 以阻止聊天。

**可用角色：** `"moderator"`、`"owner"`、`"vip"`、`"subscriber"`、`"all"`。

<Tabs>
  <Tab id="user-id-allowlist-most-secure" title="用户 ID 许可名单（最安全）">
    ```json5
    {
      channels: {
        twitch: {
          accounts: {
            default: {
              username: "openclaw",
              accessToken: "oauth:abc123...",
              channel: "yourchannel",
              allowFrom: ["123456789", "987654321"],
            },
          },
        },
      },
    }
    ```
  </Tab>
  <Tab id="role-based" title="基于角色">
    ```json5
    {
      channels: {
        twitch: {
          accounts: {
            default: {
              username: "openclaw",
              accessToken: "oauth:abc123...",
              channel: "yourchannel",
              allowedRoles: ["moderator", "vip"],
            },
          },
        },
      },
    }
    ```
  </Tab>
  <Tab id="disable-%40mention-requirement" title="禁用 @mention 要求">
    默认情况下，`requireMention` 为 `true`。若要响应所有允许的消息：

    ```json5
    {
      channels: {
        twitch: {
          accounts: {
            default: {
              username: "openclaw",
              accessToken: "oauth:abc123...",
              channel: "yourchannel",
              requireMention: false,
            },
          },
        },
      },
    }
    ```

  </Tab>
</Tabs>

<Note>
**为什么是用户ID？** 用户名可以更改，允许冒充。用户 ID 是永久的。

使用 [ 用户名到 ID 转换器 ](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/) 找到您的。
</Note>

## <a id="troubleshooting"></a> 故障排查

### <a id="execution-identity-audit"></a> 执行身份审核

启用 [ 执行身份收集 ](/gateway/audit#run-identity-inspection) 后，受信任的本机 Twitch 插件将运行归因于本机 Twitch 发送者，范围为配置的帐户。审计存储不透明身份，而不是原始 Twitch 用户 ID。主持人等角色授权访问；它们不会取代发件人的身份。即使角色或开放策略允许回复，丢失的本机用户 ID 仍然未知。外部插件安装不会通过此路径获得可信参与者证据。审计收集永远不会改变这些访问决策。

### <a id="connection-and-replies"></a> 连接和回复

首先，运行诊断命令：

```bash
openclaw doctor
openclaw channels status --probe
```

<AccordionGroup>
  <Accordion id="bot-does-not-respond-to-messages" title="机器人不回复消息">
    - **检查访问控制：** 检查您的用户ID是否在`allowFrom`中，或者暂时删除`allowFrom`并设置`allowedRoles: ["all"]`进行测试。
    - **检查提及门槛：** 在 `requireMention: true`（默认）时，消息必须 @mention 机器人用户名。
    - **检查机器人是否在频道中：** 机器人只会加入 `channel` 中指定的频道。

  </Accordion>
  <Accordion id="token-issues" title="代币问题">
    “连接失败”或身份验证错误：

    - 验证 `accessToken` 是否为 OAuth 访问令牌值（`oauth:` 前缀可选）
    - 检查令牌是否具有 `chat:read` 和 `chat:write` 权限范围
    - 如果使用令牌刷新，请验证已设置 `clientSecret` 和 `refreshToken`

  </Accordion>
  <Accordion id="token-refresh-not-working" title="令牌刷新不起作用">
    检查日志中的刷新事件：

    ```text
    Using env token source for mybot
    Access token refreshed for user 123456 (expires in 14400s)
    ```

    如果你看到 `token refresh disabled (no refresh token)`：

    - 提供`clientSecret`
    - 提供`refreshToken`

  </Accordion>
</AccordionGroup>

## <a id="config"></a> 配置

### <a id="account-config"></a> 账户配置

<ParamField path="username" type="string" required>
  机器人用户名（用于认证的账户）。
</ParamField>
<ParamField path="accessToken" type="string" required>
  具有 `chat:read` 和 `chat:write` 权限的 OAuth 访问令牌（默认账户的配置项或环境变量）。
</ParamField>
<ParamField path="clientId" type="string" required>
  Twitch 客户端 ID（来自 Token Generator 或你的应用）。在 schema 中是可选项，但连接时必需。
</ParamField>
<ParamField path="channel" type="string" required>
  要加入的频道。
</ParamField>
<ParamField path="enabled" type="boolean" default="true">
  启用此账户。
</ParamField>
<ParamField path="clientSecret" type="string">
  可选：用于自动刷新令牌。
</ParamField>
<ParamField path="refreshToken" type="string">
  可选：用于自动刷新令牌。
</ParamField>
<ParamField path="expiresIn" type="number">
  令牌过期时间（秒）（刷新跟踪）。
</ParamField>
<ParamField path="obtainmentTimestamp" type="number">
  获取令牌时的时间戳（刷新跟踪）。
</ParamField>
<ParamField path="allowFrom" type="string[]">
  用户 ID 允许列表。设置后将忽略角色。
</ParamField>
<ParamField path="allowedRoles" type='Array<"moderator" | "owner" | "vip" | "subscriber" | "all">'>
  基于角色的访问控制。
</ParamField>
<ParamField path="requireMention" type="boolean" default="true">
  需要 @mention 才会触发机器人。
</ParamField>
<ParamField path="responsePrefix" type="string">
  此账户的外发响应前缀覆盖值。
</ParamField>

### <a id="provider-options"></a> 提供者选项

- `channels.twitch.enabled` - Enable/disable 通道启动
- `channels.twitch.username` / `accessToken` / `clientId` / `channel` - 使用隐式 `default` 账户的简化单账户配置
- `channels.twitch.accounts.<accountName>` - 多账户配置（包含上述所有账户字段）；不要与顶层账户凭据结合使用
- `channels.twitch.defaultAccount` - 默认账户的名称
- `channels.twitch.markdown.tables` - Markdown 表格渲染模式（`off` | `bullets` | `code` | `block`）

完整示例：

```json5
{
  channels: {
    twitch: {
      enabled: true,
      defaultAccount: "default",
      accounts: {
        default: {
          username: "openclaw",
          accessToken: "oauth:abc123...",
          clientId: "xyz789...",
          channel: "yourchannel",
          clientSecret: "secret123...",
          refreshToken: "refresh456...",
          allowFrom: ["123456789"],
        },
        second: {
          username: "mybot",
          accessToken: "oauth:def456...",
          clientId: "uvw012...",
          channel: "your_channel",
          enabled: true,
          expiresIn: 14400,
          obtainmentTimestamp: 1706092800000,
          allowedRoles: ["moderator"],
        },
      },
    },
  },
}
```

## <a id="tool-actions"></a> 工具动作

代理可以通过消息工具`send`操作发送Twitch消息：

```json5
{
  channel: "twitch",
  action: "send",
  to: "#mychannel",
  message: "Hello Twitch!",
}
```

在 Twitch 对话中回复时，省略 `to` 以使用当前对话。没有当前对话的消息工具调用和 CLI 发送需要明确的目标。直接网关 `message.action` 发送可以省略 `to` 以使用所选帐户的配置 `channel`。

## <a id="safety-and-ops"></a> 安全与运维

- **将令牌视为密码** - 绝不要将令牌提交到 git。
- **为长期运行的机器人使用自动令牌刷新**。
- **使用用户 ID 白名单** 而不是用户名进行访问控制。
- **监控日志** 中的令牌刷新事件和连接状态。
- **尽量缩小令牌范围** - 只请求 `chat:read` 和 `chat:write`。
- **如果卡住**：在确认没有其他进程占用该会话后重启网关。

## <a id="limits"></a> 限制

- **每条消息 500 个字符**；更长的回复会在单词边界处分块。
- Markdown 会在发送前被去除（Twitch 聊天是纯文本；换行会变成空格）。
- 剥离 Markdown 后变空的文本，例如 `---`，将被记录为故意不发送，并且不计为已发送消息。
- OpenClaw 本身不增加任何限流；Twurple 聊天客户端会处理 Twitch 的速率限制。

## <a id="related"></a> 相关内容

- [通道路由](/channels/channel-routing) — 消息的会话路由
- [Channels Overview](/channels) — 所有支持的通道
- [Groups](/channels/groups) — 群聊行为和提及门控
- [配对](/channels/pairing) — DM 身份验证和配对流程
- [Security](/gateway/security) — 访问模型和强化
