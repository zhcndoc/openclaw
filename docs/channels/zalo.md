---
summary: "Zalo 机器人支持状态、功能与配置"
read_when:
  - 处理 Zalo 功能或 webhook 时
title: "Zalo"
---

状态：实验性。直接消息和群聊均已实现；下面的 [功能](#capabilities) 表反映了在 Zalo Bot Creator / Marketplace 机器人上的已验证行为。

## 捆绑插件

Zalo 在当前 OpenClaw 发行版中作为捆绑插件提供，因此打包构建不需要单独安装。

在较旧的构建版本或排除了 Zalo 的自定义安装中，请直接安装 npm 包：

- 安装：`openclaw plugins install @openclaw/zalo`
- 锁定版本：`openclaw plugins install @openclaw/zalo@2026.6.11`
- 从本地检出安装：`openclaw plugins install ./path/to/local/zalo-plugin`
- 详情：[插件](/tools/plugin)

## 快速设置

1. 在 [https://bot.zaloplatforms.com](https://bot.zaloplatforms.com) 创建一个机器人令牌（登录、创建机器人、配置设置）。该令牌格式为 `numeric_id:secret`；对于 Marketplace 机器人，可用的运行时令牌可能会出现在机器人欢迎消息中。
2. 设置令牌，可以通过环境变量 `ZALO_BOT_TOKEN=...`（仅默认账户）或在配置中设置。
3. 重启网关。
4. 在首次 DM 联系时批准配对代码（默认 DM 策略为配对）。

最小配置：

```json5
{
  channels: {
    zalo: {
      enabled: true,
      accounts: {
        default: {
          botToken: "12345689:abc-xyz",
          dmPolicy: "pairing",
        },
      },
    },
  },
}
```

多账户：在 `channels.zalo.accounts.<id>` 下添加更多条目，每个条目都有自己的 `botToken`/`name`。`channels.zalo.botToken`（扁平结构，不含 `accounts`）是旧版单账户简写；新配置建议优先使用 `accounts.<id>.*`。

## 它是什么

Zalo 是一款面向越南市场的消息应用。其 Bot API 允许 Gateway 运行机器人，用于 1:1 对话和群聊，并以确定性方式路由回 Zalo（模型从不选择渠道）。

本页涵盖 **Zalo Bot Creator / Marketplace 机器人**。**Zalo 官方账号（OA）机器人** 是不同的产品形态，行为可能有所不同；本页不涵盖它们。

## 工作原理

- 入站消息会被规范化为带有媒体占位符的共享通道信封。
- 回复始终路由回同一个 Zalo 聊天；不使用引用回复（`replyToMode` 固定关闭）。
- 默认使用长轮询（`getUpdates`）；也可通过 `channels.zalo.webhookUrl` 使用 webhook 模式。
- 群组中需要通过 @提及 才能触发机器人；这不能按通道进行配置。

## 限制

| 限制                          | 值                                                                            |
| ------------------------------ | ----------------------------------------------------------------------------- |
| 输出文本块大小                 | 2000 字符（Zalo API 限制）                                                     |
| 媒体大小（入站/出站）         | `channels.zalo.mediaMaxMb`，默认 `5` MB                                       |
| Webhook 请求体               | 1 MB，30 秒读取超时                                                           |
| Webhook 速率限制             | 每个路径+客户端 IP 120 次请求 / 60 秒，然后返回 HTTP 429                       |
| Webhook 重复事件窗口         | 5 分钟（按 路径 + 账号 + 事件名 + 聊天 + 发送者 + 消息 ID 进行键控）           |

## 访问控制

### 直接消息

- `channels.zalo.dmPolicy`: `pairing`（默认）| `allowlist` | `open` | `disabled`。
- 配对：未知发送者会获得一个配对码；在被批准之前，消息会被忽略。配对码在 1 小时后过期。
  - `openclaw pairing list zalo`
  - `openclaw pairing approve zalo <CODE>`
  - 详情：[配对](/channels/pairing)
- `channels.zalo.allowFrom` 接受纯数字的 Zalo 用户 ID（不进行用户名查找）。`open` 需要 `"*"`。

### 群组

群聊由插件支持（`chatTypes: ["direct", "group"]`），并通过提及以及群组策略进行限制：

- `channels.zalo.groupPolicy`: `open` | `allowlist` | `disabled`。
- `channels.zalo.groupAllowFrom` 限制哪些发送者 ID 可以在群组中触发机器人；如果未设置，则回退到 `allowFrom`。
- 默认解析：当配置了 `channels.zalo` 时，未设置的 `groupPolicy` 会解析为 `open`。当完全未配置 `channels.zalo` 时，运行时会关闭并回退到 `allowlist`。
- 已报告的真实世界注意事项：在某些 Marketplace-bot 配置中，机器人根本无法被添加到群组中。如果你遇到这种情况，请使用你的机器人 Zalo Bot Platform 设置进行验证；这是平台侧的限制，而不是 OpenClaw 策略。

## 长轮询 vs webhook

- 默认：长轮询（不需要公网 URL）。
- Webhook 模式：设置 `channels.zalo.webhookUrl` 和 `channels.zalo.webhookSecret`。
  - Webhook URL 必须使用 HTTPS。
  - Webhook secret 必须为 8-256 个字符。
  - Zalo 会使用 `X-Bot-Api-Secret-Token` 头发送事件，并通过恒定时间比较进行校验。
  - 网关 HTTP 在 `channels.zalo.webhookPath` 处理 webhook 请求（默认为 webhook URL 的路径）。
  - 请求必须使用 `Content-Type: application/json`（或 `+json` 媒体类型）。
  - 根据 Zalo API 文档，getUpdates 轮询和 webhook 彼此互斥。

## 支持的消息类型

- 文本：完全支持，按 2000 个字符分块。
- 媒体：入站/出站，受 `mediaMaxMb` 限制。
-  प्रतिक्र应、线程、投票、本地命令：插件不支持。
- 流式传输：插件声明支持块流式传输，但 Zalo 没有专门的出站队列/合并文本调优选项（与其他一些地区渠道不同）；如果这对你的用例很重要，请在你的环境中验证当前行为。

## 功能

| 功能                     | 状态                              |
| ------------------------ | --------------------------------- |
| 直接消息                 | 支持                              |
| 群组                     | 支持（需提及触发）                 |
| 媒体（入站/出站）        | 支持，受 `mediaMaxMb` 限制        |
| 表情回应                 | 不支持                            |
| 线程                     | 不支持                            |
| 投票                     | 不支持                            |
| 原生命令                 | 不支持                            |
| 回复 / 引用              | 未使用（固定关闭）                |

## 投递目标（CLI/cron）

使用 chat ID 作为目标：

```bash
openclaw message send --channel zalo --target 123456789 --message "hi"
```

## 故障排查

**Bot 不响应：**

- 检查 token：`openclaw channels status --probe`
- 验证发送者是否已获批准（pairing 或 `allowFrom`）
- 检查网关日志：`openclaw logs --follow`

**Webhook 未接收到事件：**

- 确认 webhook URL 使用 HTTPS
- 确认 secret 长度为 8-256 个字符
- 确认网关 HTTP 端点在配置的路径上可访问
- 确认没有同时运行 getUpdates 轮询（两者互斥）
- 请求突发可能返回 HTTP 429（每个 path+IP 每 60 秒 120 个请求）；请退避后重试

## 配置参考

完整配置：[Configuration](/gateway/configuration)

| Setting                                      | Description                                       | Default               |
| -------------------------------------------- | ------------------------------------------------- | --------------------- |
| `channels.zalo.enabled`                      | 启用/禁用频道启动                                  | `true`                |
| `channels.zalo.accounts.<id>.botToken`       | 来自 Zalo Bot Platform 的 Bot token              | -                     |
| `channels.zalo.accounts.<id>.tokenFile`      | 从文件中读取 token（拒绝符号链接）                 | -                     |
| `channels.zalo.accounts.<id>.name`           | 显示名称                                          | -                     |
| `channels.zalo.accounts.<id>.enabled`        | 启用/禁用此账户                                    | `true`                |
| `channels.zalo.accounts.<id>.dmPolicy`       | 按账户设置的 DM 策略                               | `pairing`             |
| `channels.zalo.accounts.<id>.allowFrom`      | DM 白名单（用户 ID）                               | -                     |
| `channels.zalo.accounts.<id>.groupPolicy`    | 按账户设置的群组策略                               | 见 [Groups](#groups)  |
| `channels.zalo.accounts.<id>.groupAllowFrom` | 群组发送者白名单；回退到 `allowFrom`              | -                     |
| `channels.zalo.accounts.<id>.mediaMaxMb`     | 入站/出站媒体上限（MB）                            | `5`                   |
| `channels.zalo.accounts.<id>.webhookUrl`     | 启用 webhook 模式（需要 HTTPS）                  | -                     |
| `channels.zalo.accounts.<id>.webhookSecret`  | Webhook 密钥（8-256 个字符）                      | -                     |
| `channels.zalo.accounts.<id>.webhookPath`    | 网关 HTTP 服务器上的 webhook 路径                 | webhook URL path      |
| `channels.zalo.accounts.<id>.proxy`          | API 请求的代理 URL                                | -                     |
| `channels.zalo.accounts.<id>.responsePrefix` | 出站响应前缀覆盖                                   | -                     |
| `channels.zalo.defaultAccount`               | 配置多个账户时使用的默认账户                      | `default`             |

`channels.zalo.botToken`、`channels.zalo.dmPolicy` 以及其他扁平的顶层键，都是上述字段的旧版单账户简写；两种形式都受支持。

环境变量选项：`ZALO_BOT_TOKEN=...` 仅解析默认账户的 token。

## 相关

- [频道概览](/channels) - 所有受支持的频道
- [配对](/channels/pairing) - DM 身份验证和配对流程
- [群组](/channels/groups) - 群聊行为和提及限制
- [频道路由](/channels/channel-routing) - 消息的会话路由
- [安全性](/gateway/security) - 访问模型和加固
