---
summary: "Twitch 聊天机器人配置和设置"
read_when:
  - 为 OpenClaw 设置 Twitch 聊天集成
title: "Twitch"
---

# Twitch（插件）

通过 IRC 连接支持 Twitch 聊天。OpenClaw 以 Twitch 用户（机器人账号）身份连接，接收并发送频道消息。

## 需要插件

Twitch 作为插件发布，不包含在核心安装包内。

通过 CLI 安装（npm 仓库）：

```bash
openclaw plugins install @openclaw/twitch
```

本地检出（从 git 仓库运行时）：

```bash
openclaw plugins install ./extensions/twitch
```

详情见：[插件](/tools/plugin)

## 快速设置（初学者）

1. 创建一个专用的 Twitch 机器人账号（或使用已有账号）。
2. 生成凭证：[Twitch Token Generator](https://twitchtokengenerator.com/)
   - 选择 **Bot Token**
   - 确认选中权限 `chat:read` 和 `chat:write`
   - 复制 **Client ID** 和 **Access Token**
3. 查找你的 Twitch 用户 ID：[https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/)
4. 配置令牌：
   - 环境变量：`OPENCLAW_TWITCH_ACCESS_TOKEN=...`（仅限默认账号）
   - 或配置文件：`channels.twitch.accessToken`
   - 若两者都设定，则配置优先（环境变量仅默认账号回退）。
5. 启动网关。

**⚠️ 重要：** 加入访问控制（`allowFrom` 或 `allowedRoles`）以防止未授权用户触发机器人。`requireMention` 默认为 `true`。

最简配置示例：

```json5
{
  channels: {
    twitch: {
      enabled: true,
      username: "openclaw", // 机器人的 Twitch 账号
      accessToken: "oauth:abc123...", // OAuth 访问令牌（或使用 OPENCLAW_TWITCH_ACCESS_TOKEN 环境变量）
      clientId: "xyz789...", // Token 生成器提供的 Client ID
      channel: "vevisk", // 要加入的 Twitch 聊天频道（必填）
      allowFrom: ["123456789"], // （推荐）只允许你的 Twitch 用户 ID - 可从 https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/ 查询
    },
  },
}
```

## 它是什么

- 一个由网关拥有的 Twitch 频道。
- 确定性路由：回复总是回到 Twitch。
- 每个账号映射一个独立会话 key：`agent:<agentId>:twitch:<accountName>`
- `username` 是机器人账号（用于认证），`channel` 是加入的聊天室。

## 详细设置

### 生成凭证

使用 [Twitch Token Generator](https://twitchtokengenerator.com/)：

- 选择 **Bot Token**
- 确认选择权限 `chat:read` 和 `chat:write`
- 复制 **Client ID** 和 **Access Token**

无需手动注册应用。令牌在数小时后过期。

### 配置机器人

**环境变量（仅默认账号支持）：**

```bash
OPENCLAW_TWITCH_ACCESS_TOKEN=oauth:abc123...
```

**或者配置文件：**

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

同时设置时配置优先。

### 访问控制（推荐）

```json5
{
  channels: {
    twitch: {
      allowFrom: ["123456789"], // （推荐）只允许你的 Twitch 用户 ID
    },
  },
}
```

推荐使用 `allowFrom` 创建严格白名单。如果需要基于角色访问，请使用 `allowedRoles`。

**可用角色：** `"moderator"`, `"owner"`, `"vip"`, `"subscriber"`, `"all"`。

**为何用用户 ID？** 用户名可更改，容易被仿冒；用户 ID 永久不变。

查找你的 Twitch 用户 ID：[https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/)（将 Twitch 用户名转换为 ID）

## 令牌刷新（可选）

来自 [Twitch Token Generator](https://twitchtokengenerator.com/) 的令牌不能自动刷新，过期后须重新生成。

如需自动刷新令牌，请在 [Twitch 开发者控制台](https://dev.twitch.tv/console) 创建自己的 Twitch 应用，并添加配置：

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

机器人会在令牌过期前自动刷新并记录刷新事件。

## 多账号支持

使用 `channels.twitch.accounts` 配置多账号令牌。参见 [`gateway/configuration`](/gateway/configuration) 获取共享模式。

示例（同一机器人账号加入两个频道）：

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

**注意：** 每个账号都需要自己的令牌（频道一对一令牌）。

## 访问控制

### 基于角色限制

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

### 按用户 ID 白名单（最安全）

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

### 基于角色访问（替代方案）

`allowFrom` 是严格白名单，有此项时仅允许列表内用户。
若想使用角色访问，取消设置 `allowFrom`，改用 `allowedRoles`：

```json5
{
  channels: {
    twitch: {
      accounts: {
        default: {
          allowedRoles: ["moderator"],
        },
      },
    },
  },
}
```

### 关闭 @提及需求

默认 `requireMention` 为 `true`。若想关闭并响应所有消息：

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

## 故障排查

先运行诊断命令：

```bash
openclaw doctor
openclaw channels status --probe
```

### 机器人不响应消息

**检查访问控制：** 确认你的用户 ID 在 `allowFrom` 中，或暂时移除 `allowFrom` 并设 `allowedRoles: ["all"]` 测试。

**检查机器人是否加入频道：** 机器人必须加入配置中的 `channel` 。

### 令牌问题

**“连接失败” 或认证错误：**

- 确认 `accessToken` 是 OAuth 访问令牌（通常带 `oauth:` 前缀）
- 确认令牌包含 `chat:read` 和 `chat:write` 权限
- 若使用令牌刷新，确认已正确配置 `clientSecret` 和 `refreshToken`

### 令牌刷新无效

**查日志是否有刷新事件：**

```
Using env token source for mybot
Access token refreshed for user 123456 (expires in 14400s)
```

如出现 “token refresh disabled (no refresh token)”：

- 确认提供了 `clientSecret`
- 确认提供了 `refreshToken`

## 配置项

**账号配置：**

- `username` - 机器人用户名
- `accessToken` - 含 `chat:read` 和 `chat:write` 权限的 OAuth 令牌
- `clientId` - Twitch Client ID（来自令牌生成器或自建应用）
- `channel` - 要加入的频道（必填）
- `enabled` - 是否启用此账号（默认：`true`）
- `clientSecret` - 可选：自动刷新令牌时使用
- `refreshToken` - 可选：自动刷新令牌时使用
- `expiresIn` - 令牌过期时间（秒）
- `obtainmentTimestamp` - 令牌获取时间戳
- `allowFrom` - 用户 ID 白名单
- `allowedRoles` - 基于角色的访问控制（`"moderator" | "owner" | "vip" | "subscriber" | "all"`）
- `requireMention` - 是否需要 @提及（默认：`true`）

**提供者选项：**

- `channels.twitch.enabled` - 启用/禁用频道启动
- `channels.twitch.username` - 机器人用户名（简化单账号配置）
- `channels.twitch.accessToken` - OAuth 访问令牌（简化单账号配置）
- `channels.twitch.clientId` - Twitch Client ID（简化单账号配置）
- `channels.twitch.channel` - 加入频道（简化单账号配置）
- `channels.twitch.accounts.<accountName>` - 多账号配置（以上所有账号字段）

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

Agent 可调用 `twitch` 动作：

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

- **将令牌视为密码** - 切勿提交令牌到 git
- **使用自动令牌刷新** 以支持长时间运行的机器人
- **使用用户 ID 白名单代替用户名** 管理访问权限
- **监控日志** 以跟踪令牌刷新事件和连接状态
- **最小化请求权限范围** - 只申请 `chat:read` 和 `chat:write`
- **遇到问题时**：确认无其他进程占用会话后重启网关

## 限制

- 每条消息最多 **500 字符**（按单词边界自动拆分）
- Markdown 语法会在拆分前被清除
- 无额外速率限制，使用 Twitch 内建速率限制机制
