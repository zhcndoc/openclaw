---
summary: "将一个 OpenClaw 会话的回复路由在已链接的聊天频道之间切换"
title: "频道停靠"
read_when:
  - 你希望某个活跃会话的回复从 Telegram 移动到 Discord、Slack、Mattermost 或其他已链接频道
  - 你正在为跨频道私信配置 session.identityLinks
  - /dock 命令提示发送者未链接，或不存在活跃会话
---

频道停靠是针对一个 OpenClaw 会话的呼叫转移。

它会保留相同的对话上下文，但会改变该会话未来回复的投递位置。

## 示例

Alice 可以在 Telegram 和 Discord 上向 OpenClaw 发消息：

```json5
{
  session: {
    identityLinks: {
      alice: ["telegram:123", "discord:456"],
    },
  },
}
```

如果 Alice 从 Telegram 发送：

```text
/dock_discord
```

OpenClaw 会保留当前会话上下文，并更改回复路由：

| 停靠前                        | 执行 `/dock_discord` 后        |
| ---------------------------- | --------------------------- |
| 回复发送到 Telegram `123` | 回复发送到 Discord `456` |

该会话不会被重新创建。转录历史仍然附着在同一个会话上。

## 为什么使用它

当某个任务从一个聊天应用开始，但后续回复应该发到别处时，就使用停靠。

常见流程：

1. 从 Telegram 启动一个代理任务。
2. 切换到正在协调工作的 Discord。
3. 在 Telegram 会话中发送 `/dock_discord`。
4. 保持相同的 OpenClaw 会话，但在 Discord 中接收未来的回复。

## 必要配置

停靠需要 `session.identityLinks`。源发送者和目标对等方必须位于同一个身份组中：

```json5
{
  session: {
    identityLinks: {
      alice: ["telegram:123", "discord:456", "slack:U123"],
    },
  },
}
```

这些值是带频道前缀的对等方 id：

| 值             | 含义                          |
| -------------- | ---------------------------- |
| `telegram:123` | Telegram 发送者 id `123`     |
| `discord:456`  | Discord 私信对等方 id `456` |
| `slack:U123`   | Slack 用户 id `U123`         |

规范键（上例中的 `alice`）只是共享身份组名称。Dock 命令使用带频道前缀的值来证明源发送者和目标对等方是同一个人。

## 命令

Dock 命令由已加载的、支持原生命令的频道插件生成。目前内置命令如下：

| 目标频道   | 命令               | 别名               |
| -------------- | ------------------ | ------------------ |
| Discord        | `/dock-discord`    | `/dock_discord`    |
| Mattermost     | `/dock-mattermost` | `/dock_mattermost` |
| Slack          | `/dock-slack`      | `/dock_slack`      |
| Telegram       | `/dock-telegram`   | `/dock_telegram`   |

带下划线的别名在 Telegram 这类原生命令界面上很有用。

## 会发生什么变化

停靠会更新活动会话的投递字段：

| 会话字段         | 执行 `/dock_discord` 后的示例            |
| --------------- | ---------------------------------------- |
| `lastChannel`   | `discord`                                |
| `lastTo`        | `456`                                    |
| `lastAccountId` | 目标频道账号，或 `default` |

这些字段会持久化到会话存储中，并用于该会话后续的回复投递。

## 不会发生什么变化

停靠不会：

- 创建频道账号
- 连接新的 Discord、Telegram、Slack 或 Mattermost 机器人
- 授予用户访问权限
- 绕过频道允许列表或私信策略
- 将转录历史移动到另一个会话
- 让无关用户共享同一个会话

它只会改变当前会话的投递路由。

## 故障排查

**命令提示发送者未链接。**

将当前发送者和目标对等方都添加到同一个 `session.identityLinks` 组中。例如，如果 Telegram 发送者 `123` 应该停靠到 Discord 对等方 `456`，则同时包含 `telegram:123` 和 `discord:456`。

**命令提示不存在活跃会话。**

请从一个已有的私聊会话中执行停靠。该命令需要一个活跃会话条目，以便持久化新的路由。

**回复仍然发送到旧频道。**

检查命令是否返回了成功消息，并确认目标对等方 id 与该频道使用的 id 一致。停靠只会更改当前会话路由；另一个会话可能仍然路由到别处。

**我需要切换回去。**

从已链接的发送者那里发送与原始频道对应的命令，例如 `/dock_telegram` 或 `/dock-telegram`。
