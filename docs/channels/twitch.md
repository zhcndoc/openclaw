---
summary: "Twitch 聊天机器人：安装、凭据、访问控制、令牌刷新"
read_when:
  - 为 OpenClaw 设置 Twitch 聊天集成
title: "Twitch"
sidebarTitle: "Twitch"
---

通过 Twurple 客户端，使用 Twitch 的聊天（IRC）接口支持 Twitch 聊天。OpenClaw 以 Twitch 机器人账号登录，加入每个已配置账号对应的一个频道，并在该频道中回复。

## 安装

Twitch 作为官方插件提供；它不属于核心安装的一部分。

<Tabs>
  <Tab title="npm registry">
    ```bash
    openclaw plugins install @openclaw/twitch
    ```
  </Tab>
  <Tab title="Local checkout">
    ```bash
    openclaw plugins install ./path/to/local/twitch-plugin
    ```
  </Tab>
</Tabs>

`plugins install` 会注册并启用该插件。在 `openclaw onboard` 或 `openclaw channels add` 期间选择 Twitch 会按需安装它。使用不带版本号的软件包名称可跟随当前发布版本；仅在需要可复现安装时才固定到精确版本。需要 OpenClaw 2026.4.10 或更新版本。

详情：[插件](/tools/plugin)

## 快速设置

<Steps>
  <Step title="安装插件">
    见上面的 [安装](#install)。
  </Step>
  <Step title="创建 Twitch 机器人账户">
    为机器人创建一个专用的 Twitch 账户（或者使用现有账户）。
  </Step>
  <Step title="生成凭据">
    使用 [Twitch Token Generator](https://twitchtokengenerator.com/)：

    - 选择 **Bot Token**
    - 确认已选择 `chat:read` 和 `chat:write` 作用域
    - 复制 **Client ID** 和 **Access Token**

  </Step>
  <Step title="查找你的 Twitch 用户 ID">
    使用 [https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/) 将用户名转换为 Twitch 用户 ID。
  </Step>
  <Step title="配置令牌">
    - 环境变量：`OPENCLAW_TWITCH_ACCESS_TOKEN=...`（仅默认账户）
    - 或配置：`channels.twitch.accessToken`

    如果两者都设置了，则以配置为准（环境变量仅作为默认账户的备用项）。

  </Step>
  <Step title="启动网关">
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
      username: "openclaw", // 机器人的 Twitch 账户（用于身份验证）
      accessToken: "oauth:abc123...", // OAuth 访问令牌（或使用 OPENCLAW_TWITCH_ACCESS_TOKEN 环境变量）
      clientId: "xyz789...", // 来自 Token Generator 的 Client ID
      channel: "yourchannel", // 要加入哪个 Twitch 频道的聊天（必填）
      allowFrom: ["123456789"], //（推荐）仅允许你的 Twitch 用户 ID
    },
  },
}
```

## 它是什么

- 由 Gateway 拥有的 Twitch 频道。
- 确定性路由：回复总是回到消息来自的 Twitch 频道。
- 每个已加入的频道都会映射到一个隔离的组会话密钥 `agent:<agentId>:twitch:group:<channel>`。
- `username` 是机器人的账号（进行身份验证），`channel` 是要加入的聊天房间。一个账号条目只加入一个频道。
- Token 带或不带 `oauth:` 前缀都可以；OpenClaw 会按两种方式进行规范化（设置向导期望的是 `oauth:` 格式）。

## 令牌刷新（可选）

来自 [Twitch Token Generator](https://twitchtokengenerator.com/) 的令牌无法被 OpenClaw 刷新 - 过期时请重新生成（它们通常只会持续几个小时；无需应用注册）。

如需自动刷新，请在 [Twitch 开发者控制台](https://dev.twitch.tv/console) 创建你自己的应用，并添加：

```json5
{
  channels: {
    twitch: {
      clientSecret: "your_client_secret",
      refreshToken: "your_refresh_token",
    },
  },
}
```

当两者都设置后，插件会使用可刷新的认证提供者，在令牌过期前自动续期，并记录每次刷新。若没有 `refreshToken`，它会记录 `token refresh disabled (no refresh token)`；若没有 `clientSecret`，则会回退到静态（不可刷新的）令牌。

## 多账户支持

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

## 访问控制

`allowFrom` 是 Twitch 用户 ID 的硬性允许列表。设置后，`allowedRoles` 会被忽略；若要改用基于角色的访问控制，请不要设置 `allowFrom`。

**可用角色：** `"moderator"`、`"owner"`、`"vip"`、`"subscriber"`、`"all"`。

<Tabs>
  <Tab title="用户 ID 允许列表（最安全）">
    ```json5
    {
      channels: {
        twitch: {
          accounts: {
            default: {
              allowFrom: ["123456789", "987654321"],
            },
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="基于角色">
    ```json5
    {
      channels: {
        twitch: {
          accounts: {
            default: {
              allowedRoles: ["moderator", "vip"],
            },
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="禁用 @mention 要求">
    默认情况下，`requireMention` 为 `true`。若要响应所有允许的消息：

    ```json5
    {
      channels: {
        twitch: {
          accounts: {
            default: {
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
**为什么使用用户 ID？** 用户名可以更改，可能导致冒充。用户 ID 是永久的。

可通过 [用户名转 ID 转换器](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/) 查找你的 ID。
</Note>

## 故障排查

首先，运行诊断命令：

```bash
openclaw doctor
openclaw channels status --probe
```

<AccordionGroup>
  <Accordion title="机器人不响应消息">
    - **检查访问控制：** 确保你的用户 ID 在 `allowFrom` 中，或者临时移除 `allowFrom` 并将 `allowedRoles` 设置为 `["all"]` 进行测试。
    - **检查提及门槛：** 在 `requireMention: true`（默认）时，消息必须 @mention 机器人用户名。
    - **检查机器人是否在频道中：** 机器人只会加入 `channel` 中指定的频道。

  </Accordion>
  <Accordion title="令牌问题">
    “连接失败”或身份验证错误：

    - 验证 `accessToken` 是否为 OAuth 访问令牌值（`oauth:` 前缀可选）
    - 检查令牌是否具有 `chat:read` 和 `chat:write` 权限范围
    - 如果使用令牌刷新，请验证已设置 `clientSecret` 和 `refreshToken`

  </Accordion>
  <Accordion title="令牌刷新未生效">
    检查日志中的刷新事件：

    ```text
    Using env token source for mybot
    Access token refreshed for user 123456 (expires in 14400s)
    ```

    如果你看到 `token refresh disabled (no refresh token)`：

    - 确保提供了 `clientSecret`
    - 确保提供了 `refreshToken`

  </Accordion>
</AccordionGroup>

## 配置

### 账户配置

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

### 提供者选项

- `channels.twitch.enabled` - 启用/禁用频道启动
- `channels.twitch.username` / `accessToken` / `clientId` / `channel` - 简化的单账户配置（隐式 `default` 账户；优先于 `accounts.default`）
- `channels.twitch.accounts.<accountName>` - 多账户配置（包含以上所有账户字段）
- `channels.twitch.defaultAccount` - 默认使用的账户名称
- `channels.twitch.markdown.tables` - Markdown 表格渲染模式（`off` | `bullets` | `code` | `block`）

完整示例：

```json5
{
  channels: {
    twitch: {
      enabled: true,
      username: "openclaw",
      accessToken: "oauth:abc123...",
      clientId: "xyz789...",
      channel: "yourchannel",
      clientSecret: "secret123...",
      refreshToken: "refresh456...",
      allowFrom: ["123456789"],
      accounts: {
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

## 工具操作

该代理可以通过消息工具的 `send` 操作发送 Twitch 消息：

```json5
{
  channel: "twitch",
  action: "send",
  to: "#mychannel",
  message: "你好，Twitch！",
}
```

`to` 是可选的，默认值为账户已配置的 `channel`。

## 安全与运维

- **将令牌视为密码** - 绝不要将令牌提交到 git。
- **为长期运行的机器人使用自动令牌刷新**。
- **使用用户 ID 白名单** 而不是用户名进行访问控制。
- **监控日志** 中的令牌刷新事件和连接状态。
- **尽量缩小令牌范围** - 只请求 `chat:read` 和 `chat:write`。
- **如果卡住**：在确认没有其他进程占用该会话后重启网关。

## 限制

- **每条消息 500 个字符**；更长的回复会在单词边界处分块。
- Markdown 会在发送前被去除（Twitch 聊天是纯文本；换行会变成空格）。
- OpenClaw 本身不增加任何限流；Twurple 聊天客户端会处理 Twitch 的速率限制。

## 相关内容

- [频道路由](/channels/channel-routing) — 用于消息的会话路由
- [频道概览](/channels) — 所有受支持的频道
- [群组](/channels/groups) — 群聊行为与提及门控
- [配对](/channels/pairing) — DM 身份验证与配对流程
- [安全](/gateway/security) — 访问模型与加固
