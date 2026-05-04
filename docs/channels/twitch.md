---
summary: "Twitch 聊天机器人配置与设置"
read_when:
  - 为 OpenClaw 设置 Twitch 聊天集成
title: "Twitch"
sidebarTitle: "Twitch"
---

通过 IRC 连接提供 Twitch 聊天支持。OpenClaw 以 Twitch 用户（机器人账户）的身份连接，以便在频道中接收和发送消息。

## 捆绑插件

<Note>
Twitch 在当前 OpenClaw 版本中作为捆绑插件提供，因此正常的打包构建不需要单独安装。
</Note>

如果你使用的是较旧的构建版本，或者是排除了 Twitch 的自定义安装，请直接安装 npm 包：

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

使用裸包以跟随当前官方发布标签。只有在你需要可复现安装时，才固定为精确版本。

详情：[插件](/tools/plugin)

## 快速设置（初学者）

<Steps>
  <Step title="确保插件可用">
    当前的 OpenClaw 打包版本已经将其捆绑。较旧/自定义安装可使用上面的命令手动添加。
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

    如果两者都设置了，则以配置为准（环境变量仅作为默认账户的后备）。

  </Step>
  <Step title="启动网关">
    使用已配置的频道启动网关。
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
      username: "openclaw", // 机器人的 Twitch 账户
      accessToken: "oauth:abc123...", // OAuth 访问令牌（或使用 OPENCLAW_TWITCH_ACCESS_TOKEN 环境变量）
      clientId: "xyz789...", // 来自 Token Generator 的 Client ID
      channel: "vevisk", // 要加入的 Twitch 频道聊天（必需）
      allowFrom: ["123456789"], //（推荐）仅允许你的 Twitch 用户 ID - 从 https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/ 获取
    },
  },
}
```

## 它是什么

- 由 Gateway 拥有的一个 Twitch 频道。
- 确定性路由：回复总是回到 Twitch。
- 每个账户映射到一个隔离的会话键 `agent:<agentId>:twitch:<accountName>`。
- `username` 是机器人的账户（进行身份验证的用户），`channel` 是要加入的聊天房间。

## 设置（详细）

### 生成凭据

使用 [Twitch Token Generator](https://twitchtokengenerator.com/)：

- 选择 **Bot Token**
- 确认已选择 `chat:read` 和 `chat:write` 作用域
- 复制 **Client ID** 和 **Access Token**

<Note>
不需要手动注册应用。令牌会在几小时后过期。
</Note>

### 配置机器人

<Tabs>
  <Tab title="Env var (default account only)">
    ```bash
    OPENCLAW_TWITCH_ACCESS_TOKEN=oauth:abc123...
    ```
  </Tab>
  <Tab title="Config">
    ```json5
    {
      channels: {
        twitch: {
          enabled: true,
          username: "openclaw",
          accessToken: "oauth:abc123...",
          clientId: "xyz789...",
          channel: "vevisk",
        },
      },
    }
    ```
  </Tab>
</Tabs>

如果同时设置了环境变量和配置，则以配置为准。

### 访问控制（推荐）

```json5
{
  channels: {
    twitch: {
      allowFrom: ["123456789"], //（推荐）仅允许你的 Twitch 用户 ID
    },
  },
}
```

优先使用 `allowFrom` 作为严格的允许列表。如果你想基于角色进行访问，请保留 `allowFrom` 不设置，改为配置 `allowedRoles`。

**可用角色：** `"moderator"`, `"owner"`, `"vip"`, `"subscriber"`, `"all"`。

<Note>
**为什么使用用户 ID？** 用户名可能会更改，从而允许冒充。用户 ID 是永久的。

查找你的 Twitch 用户 ID：[https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/)（将你的 Twitch 用户名转换为 ID）
</Note>

## 令牌刷新（可选）

来自 [Twitch Token Generator](https://twitchtokengenerator.com/) 的令牌无法自动刷新——过期后需要重新生成。

若要自动刷新令牌，请在 [Twitch Developer Console](https://dev.twitch.tv/console) 创建你自己的 Twitch 应用，并将以下内容添加到配置中：

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

机器人会在令牌过期前自动刷新，并记录刷新事件。

## 多账户支持

使用 `channels.twitch.accounts` 配合每个账户各自的令牌。共享模式请参见 [配置](/gateway/configuration)。

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
          channel: "vevisk",
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
每个账户都需要自己的令牌（每个频道一个令牌）。
</Note>

## 访问控制

<Tabs>
  <Tab title="User ID allowlist (most secure)">
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
  <Tab title="Role-based">
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

    `allowFrom` 是一个严格的允许列表。设置后，只有这些用户 ID 被允许。如果你想基于角色进行访问，请不要设置 `allowFrom`，而改为配置 `allowedRoles`。

  </Tab>
  <Tab title="Disable @mention requirement">
    默认情况下，`requireMention` 为 `true`。若要禁用并响应所有消息：

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

## 故障排查

首先，运行诊断命令：

```bash
openclaw doctor
openclaw channels status --probe
```

<AccordionGroup>
  <Accordion title="机器人不响应消息">
    - **检查访问控制：** 确保你的用户 ID 在 `allowFrom` 中，或者临时移除 `allowFrom` 并设置 `allowedRoles: ["all"]` 进行测试。
    - **检查机器人是否在频道中：** 机器人必须加入 `channel` 中指定的频道。

  </Accordion>
  <Accordion title="令牌问题">
    “连接失败”或身份验证错误：

    - 验证 `accessToken` 是 OAuth 访问令牌值（通常以 `oauth:` 前缀开头）
    - 检查令牌是否具有 `chat:read` 和 `chat:write` 作用域
    - 如果使用令牌刷新，请验证已设置 `clientSecret` 和 `refreshToken`

  </Accordion>
  <Accordion title="令牌刷新未生效">
    检查日志中的刷新事件：

    ```
    使用 env 令牌源 for mybot
    Access token refreshed for user 123456 (expires in 14400s)
    ```

    如果你看到 “token refresh disabled (no refresh token)”：

    - 确保提供了 `clientSecret`
    - 确保提供了 `refreshToken`

  </Accordion>
</AccordionGroup>

## 配置

### 账户配置

<ParamField path="username" type="string">
  机器人用户名。
</ParamField>
<ParamField path="accessToken" type="string">
  带有 `chat:read` 和 `chat:write` 的 OAuth 访问令牌。
</ParamField>
<ParamField path="clientId" type="string">
  Twitch Client ID（来自 Token Generator 或你的应用）。
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
  令牌过期时间（秒）。
</ParamField>
<ParamField path="obtainmentTimestamp" type="number">
  获取令牌的时间戳。
</ParamField>
<ParamField path="allowFrom" type="string[]">
  用户 ID 允许列表。
</ParamField>
<ParamField path="allowedRoles" type='Array<"moderator" | "owner" | "vip" | "subscriber" | "all">'>
  基于角色的访问控制。
</ParamField>
<ParamField path="requireMention" type="boolean" default="true">
  需要 @mention。
</ParamField>

### 提供者选项

- `channels.twitch.enabled` - 启用/禁用频道启动
- `channels.twitch.username` - 机器人用户名（简化的单账户配置）
- `channels.twitch.accessToken` - OAuth 访问令牌（简化的单账户配置）
- `channels.twitch.clientId` - Twitch Client ID（简化的单账户配置）
- `channels.twitch.channel` - 要加入的频道（简化的单账户配置）
- `channels.twitch.accounts.<accountName>` - 多账户配置（以上所有账户字段）

完整示例：

```json5
{
  channels: {
    twitch: {
      enabled: true,
      username: "openclaw",
      accessToken: "oauth:abc123...",
      clientId: "xyz789...",
      channel: "vevisk",
      clientSecret: "secret123...",
      refreshToken: "refresh456...",
      allowFrom: ["123456789"],
      allowedRoles: ["moderator", "vip"],
      accounts: {
        default: {
          username: "mybot",
          accessToken: "oauth:abc123...",
          clientId: "xyz789...",
          channel: "your_channel",
          enabled: true,
          clientSecret: "secret123...",
          refreshToken: "refresh456...",
          expiresIn: 14400,
          obtainmentTimestamp: 1706092800000,
          allowFrom: ["123456789", "987654321"],
          allowedRoles: ["moderator"],
        },
      },
    },
  },
}
```

## 工具操作

代理可以使用 `twitch` 调用以下 action：

- `send` - 向频道发送消息

示例：

```json5
{
  action: "twitch",
  params: {
    message: "Hello Twitch!",
    to: "#mychannel",
  },
}
```

## 安全与运维

- **将令牌视为密码** — 切勿将令牌提交到 git。
- **长时间运行的机器人请使用自动令牌刷新**。
- **访问控制请使用用户 ID 白名单**，而不是用户名。
- **监控日志**，查看令牌刷新事件和连接状态。
- **尽量缩小令牌权限范围** — 仅请求 `chat:read` 和 `chat:write`。
- **如果卡住了**：在确认没有其他进程占用该会话后，重启网关。

## 限制

- 每条消息最多 **500 个字符**（会在单词边界自动分块）。
- 分块前会移除 Markdown。
- 不进行速率限制（使用 Twitch 内置的速率限制）。

## 相关内容

- [频道路由](/channels/channel-routing) — 用于消息的会话路由
- [频道概览](/channels) — 所有受支持的频道
- [群组](/channels/groups) — 群聊行为与提及门控
- [配对](/channels/pairing) — DM 身份验证与配对流程
- [安全](/gateway/security) — 访问模型与加固
