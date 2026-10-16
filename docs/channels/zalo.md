---
summary: "Zalo 机器人支持状态、功能与配置"
read_when:
  - "处理 Zalo 功能或 webhook 时"
title: "Zalo"
---

状态：实验性的。私信和群聊均已实现。下面的 [Capability](#capabilities) 表反映了 Zalo Bot Creator/Marketplace 机器人的经过验证的行为。

## <a id="bundled-plugin"></a> 捆绑插件

Zalo 在当前 OpenClaw 发行版中作为捆绑插件提供，因此打包构建不需要单独安装。

在较旧的构建版本或排除了 Zalo 的自定义安装中，请直接安装 npm 包：

- 安装：`openclaw plugins install @openclaw/zalo`
- 固定版本：`openclaw plugins install @openclaw/zalo@<version>`（仅用于可重复安装的固定）
- 从本地检出安装：`openclaw plugins install ./path/to/local/zalo-plugin`
- 详情：[插件](/tools/plugin)。

## <a id="quick-setup"></a> 快速设置

1. 在 [https://bot.zaloplatforms.com](https://bot.zaloplatforms.com) 创建机器人令牌（登录、创建机器人、配置设置）。代币为`numeric_id:secret`。对于 Marketplace 机器人，可用的运行时令牌可能会出现在机器人的欢迎消息中。
2. 设置令牌，可以通过环境变量 `ZALO_BOT_TOKEN=...`（仅默认账户）或在配置中设置。
3. 检查`openclaw channels status --probe`；如果网关离线，则启动网关。配置更改遵循 [hot reload](/gateway/configuration/hot-reload)。如果您更改了服务环境，请重新启动网关以加载它。
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

多账户：在`channels.zalo.accounts.<id>`下添加更多条目，每个条目都有自己的`botToken`/`name`. `channels.zalo.botToken`（扁平，没有`accounts`）是传统的单账户简写。对于新配置，首选 `accounts.<id>.*`。

## <a id="what-it-is"></a> 它是什么

Zalo 是一款专注于越南的消息应用程序。其机器人 API 让网关运行机器人进行 1：1 对话和群聊。回复返回 Zalo。该模型从不选择渠道。

本页面涵盖 **Zalo 机器人创建者/市场机器人**。 **Zalo 公众号 （OA） 机器人** 是不同的产品界面，行为可能有所不同。本页不涉及它们。

## <a id="how-it-works"></a> 工作原理

- 入站消息会被规范化为带有媒体占位符的共享通道信封。
- 回复始终路由回同一个 Zalo 聊天。不使用引用回复（`replyToMode` 已固定关闭）。
- 默认情况下为长轮询 （`getUpdates`）。通过 `channels.zalo.webhookUrl` 提供 Webhook 模式。
- 组需要 @mention 来触发机器人。这不能按通道进行配置。

## <a id="limits"></a> 限制

| 限制                         | 值                                                                    |
| ----------------------------- | ------------------------------------------------------------------------ |
| 外发文本块大小      | 2000 字符（Zalo API 限制）                                         |
| 介质尺寸 （inbound/outbound） | `channels.zalo.mediaMaxMb`，默认`5` MB                               |
| Webhook 请求正文          | 1 MB，30s读取超时                                                   |
| Webhook 速率限制            | 每个路径 120 个请求/60 秒+客户端 IP，然后 HTTP 429                     |
| Webhook 重放墓碑     | 30 天，每个账户最多 20,000 个已完成事件（按 message id 键控） |

## <a id="access-control"></a> 访问控制

### <a id="direct-messages"></a> 私信

- `channels.zalo.dmPolicy`: `pairing`（默认）| `allowlist` | `open` | `disabled`。
- Pairing：未知发件人获得配对码。消息在获得批准之前将被忽略。代码将在 1 小时后过期。
  - `openclaw pairing list zalo`
  - `openclaw pairing approve zalo <CODE>`
  - 详情：[配对](/channels/pairing)
- `channels.zalo.allowFrom` 接受数字 Zalo 用户 ID（无用户名查找）。 `open` 需要 `"*"`。

### <a id="groups"></a> 群组

群聊由插件支持（`chatTypes: ["direct", "group"]`），并通过提及以及群组策略进行限制：

- `channels.zalo.groupPolicy`: `open` | `allowlist` | `disabled`.
- `channels.zalo.groupAllowFrom` 限制哪些发件人 ID 可以分组触发机器人。未设置时回落至 `allowFrom`。
- 默认解析：配置`channels.zalo`时，未设置的`groupPolicy`解析为`open`。当 `channels.zalo` 完全缺失时，运行时默认为 `allowlist`。
- 报告了现实世界的警告：在某些市场机器人设置中，机器人根本无法添加到组中。如果您点击该按钮，请验证机器人的 Zalo 机器人平台设置。这是平台端约束，而不是OpenClaw策略。

## <a id="long-polling-vs-webhook"></a> 长轮询 vs Webhook

- 默认：长轮询（无需公共 URL）。
- Webhook 模式：设置 `channels.zalo.webhookUrl` 和 `channels.zalo.webhookSecret`。
  - Webhook URL 必须使用 HTTPS。
  - Webhook 密钥必须为 8-256 个字符。
  - Zalo 会在请求中发送 `X-Bot-Api-Secret-Token` 标头，并使用恒定时间比较进行验证。
  - 网关 HTTP 在 `channels.zalo.webhookPath` 处理 Webhook 请求（默认为 Webhook URL 的路径）。
  - 请求必须使用 `Content-Type: application/json`（或带有 `+json` 的媒体类型）。
  - OpenClaw 仅在持久存储原始事件后才返回 HTTP 200。存储故障返回 HTTP 500。持久 `200` 携带 `x-openclaw-delivery-accepted: durable`。反向代理可以要求该标头将 OpenClaw 接受与通用 `200` 区分开。身份验证、验证和存储错误响应忽略它。
  - 根据 Zalo API 文档，getUpdates 轮询和 webhook 是互斥的。

## <a id="supported-message-types"></a> 支持的消息类型

- 文本：完全支持，按每 2000 个字符进行分割。
- 媒体：inbound/outbound，上限为`mediaMaxMb`。
- 照片说明：已被截断以适应 2000 个字符的限制，包括投票回复。
- 反应、线程、投票、本地命令：插件不支持。
- Streaming：该插件声明块流功能。与其他一些区域频道不同，Zalo 没有专用的出站 queue/merge-text 调谐旋钮。如果这对您的用例很重要，请验证您环境中的当前行为。

## <a id="capabilities"></a> 功能

| 功能                  | 状态                            |
| ------------------------ | --------------------------------- |
| 直接消息          | 支持                         |
| 群组                   | 支持（需提及触发）         |
| 媒体 （inbound/outbound） | 支持，上限为`mediaMaxMb` |
| 反应                | 不支持                     |
| 线程                  | 不支持                     |
| 投票                    | 不支持                     |
| 原生命令          | 不支持                     |
| 回复 / 引用         | 未使用（固定关闭）              |

## <a id="delivery-targets-(cli%2Fcron)"></a><a id="delivery-targets-cli/cron"></a> 投递目标（CLI/cron）

使用 chat ID 作为目标：

```bash
openclaw message send --channel zalo --target 123456789 --message "hi"
```

## <a id="troubleshooting"></a> 故障排查

**Bot 不响应：**

- 检查 token：`openclaw channels status --probe`
- 验证发送者是否已获批准（pairing 或 `allowFrom`）
- 检查网关日志：`openclaw logs --follow`

**Webhook 未接收到事件：**

- 确认 webhook URL 使用 HTTPS
- 确认 secret 长度为 8-256 个字符
- 确认网关 HTTP 端点在配置的路径上可访问
- 确认没有同时运行 getUpdates 轮询（两者互斥）
- A 突发请求可以返回 HTTP 429（120 个请求/每条路径 60 秒+IP）。退出并重试

## <a id="configuration-reference"></a> 配置参考

完整配置：[配置](/gateway/configuration)

| 设置                                      | 描述                                       | 默认值               |
| -------------------------------------------- | ------------------------------------------------- | --------------------- |
| `channels.zalo.enabled`                      | Enable/disable 通道启动                    | `true`                |
| `channels.zalo.accounts.<id>.botToken`       | 来自 Zalo Bot Platform 的 Bot 令牌                  | -                     |
| `channels.zalo.accounts.<id>.tokenFile`      | 从文件中读取令牌（拒绝符号链接）        | -                     |
| `channels.zalo.accounts.<id>.name`           | 显示名称                                      | -                     |
| `channels.zalo.accounts.<id>.enabled`        | Enable/disable 此帐号                       | `true`                |
| `channels.zalo.accounts.<id>.dmPolicy`       | 每账户 DM 政策                             | `pairing`             |
| `channels.zalo.accounts.<id>.allowFrom`      | DM 许可名单（用户 ID）                           | -                     |
| `channels.zalo.accounts.<id>.groupPolicy`    | 按账户设置的群组策略                          | 见 [群组](#groups) |
| `channels.zalo.accounts.<id>.groupAllowFrom` | 群组发送者白名单；回退到 `allowFrom` | -                     |
| `channels.zalo.accounts.<id>.mediaMaxMb`     | Inbound/outbound 介质盖 （MB）                   | `5`                   |
| `channels.zalo.accounts.<id>.webhookUrl`     | 启用 webhook 模式（需要 HTTPS）              | -                     |
| `channels.zalo.accounts.<id>.webhookSecret`  | Webhook 密钥（8-256 个字符）                      | -                     |
| `channels.zalo.accounts.<id>.webhookPath`    | 网关 HTTP 服务器上的 webhook 路径           | webhook URL 路径      |
| `channels.zalo.accounts.<id>.proxy`          | API 请求的代理 URL                        | -                     |
| `channels.zalo.accounts.<id>.responsePrefix` | 出站响应前缀覆盖                 | -                     |
| `channels.zalo.defaultAccount`               | 配置多个账户时使用的默认账户      | `default`             |

`channels.zalo.botToken`、`channels.zalo.dmPolicy` 和其他平面顶级密钥是上述字段的传统单帐户简写。两种形式均受支持。

环境变量选项：`ZALO_BOT_TOKEN=...` 仅解析默认账户的令牌。

## <a id="related"></a> 相关内容

- [Channels Overview](/channels) - 所有支持的渠道
- [Pairing](/channels/pairing) - DM 身份验证和配对流程
- [群组](/channels/groups) - 群聊行为和提及门控
- [通道路由](/channels/channel-routing) - 消息的会话路由
- [Security](/gateway/security) - 访问模型和强化
