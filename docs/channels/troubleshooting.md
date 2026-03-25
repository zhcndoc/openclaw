---
summary: "通过每个频道的故障特征和修复快速进行频道级故障排查"
read_when:
  - 频道传输显示已连接但回复失败
  - 你需要频道特定检查以替代深入的供应商文档
title: "频道故障排查"
---

# 频道故障排查

当频道连接但行为异常时使用本页面。

## 命令步骤

请按顺序先运行以下命令：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

健康基线：

- `Runtime: running`（运行时：运行中）
- `RPC probe: ok`（RPC 探针：正常）
- 频道探测显示已连接/准备就绪

## WhatsApp

### WhatsApp 故障特征

| 症状                         | 最快检查                                         | 修复                                                         |
| ----------------------------- | ------------------------------------------------ | ------------------------------------------------------------ |
| 已连接但无私信回复            | `openclaw pairing list whatsapp`                 | 批准发送者或调整私信策略/白名单。                           |
| 群组消息被忽略                | 检查配置中的 `requireMention` 和提及模式        | 提及机器人或放宽该群组的提及策略。                           |
| 随机断开连接/重复登录循环    | `openclaw channels status --probe` + 日志          | 重新登录并确认凭据目录正常。                             |

完整故障排查：[/channels/whatsapp#troubleshooting](/channels/whatsapp#troubleshooting)

## Telegram

### Telegram 故障特征

| 症状                             | 最快检查                                   | 修复                                                                         |
| -------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------- |
| 输入 `/start` 但没有可用的回复流程         | `openclaw pairing list telegram`          | 批准配对或更改私信策略。                                                    |
| 机器人在线但群组无响应          | 验证提及要求和机器人隐私模式               | 关闭隐私模式以在群组中可见，或提及机器人。                                    |
| 发送失败并伴随网络错误              | 检查日志中的 Telegram API 调用失败           | 修复到 `api.telegram.org` 的 DNS/IPv6/代理路由。                               |
| 启动时 `setMyCommands` 被拒绝     | 检查日志中的 `BOT_COMMANDS_TOO_MUCH`          | 减少插件/技能/自定义 Telegram 命令或禁用原生菜单。                         |
| 升级后允许名单阻止你               | `openclaw security audit` 和配置允许名单    | 运行 `openclaw doctor --fix` 或用数字发件人 ID 替换 `@username`。          |

完整故障排查：[/channels/telegram#troubleshooting](/channels/telegram#troubleshooting)

## Discord

### Discord 故障特征

| 症状                         | 最快检查                           | 修复                                                         |
| ----------------------------- | --------------------------------- | ------------------------------------------------------------ |
| 机器人在线但公会无回复        | `openclaw channels status --probe` | 允许公会/频道并验证 MESSAGE_CONTENT 意图权限。                        |
| 群组消息被忽略                | 检查日志中的提及门控丢弃            | 提及机器人或将公会/频道设置为 `requireMention: false`。     |
| 私信回复缺失                   | `openclaw pairing list discord`    | 批准私信配对或调整私信策略。                                 |

完整故障排查：[/channels/discord#troubleshooting](/channels/discord#troubleshooting)

## Slack

### Slack 故障特征

| 症状                                | 最快检查                              | 修复                                                         |
| ---------------------------------- | ------------------------------------ | ------------------------------------------------------------ |
| 套接字模式已连接但无响应            | `openclaw channels status --probe`  | 验证应用令牌 + 机器人令牌及所需的权限范围。                       |
| 私信被阻止                        | `openclaw pairing list slack`        | 批准配对或放宽私信策略。                                    |
| 频道消息被忽略                    | 检查 `groupPolicy` 和频道白名单      | 允许该频道或将策略调整为 `open`。                           |

完整故障排查：[/channels/slack#troubleshooting](/channels/slack#troubleshooting)

## iMessage 和 BlueBubbles

### iMessage 和 BlueBubbles 故障特征

| 症状                          | 最快检查                                             | 修复                                                         |
| ----------------------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| 无入站事件                    | 验证 webhook/服务器可达性和应用权限                  | 修复 webhook URL 或 BlueBubbles 服务器状态。                |
| macOS 可以发送但无法接收          | 检查 macOS 信息自动化的隐私权限                      | 重新授权 TCC 权限并重启频道进程。                           |
| 私信发送者被阻止              | `openclaw pairing list imessage` 或 `openclaw pairing list bluebubbles` | 批准配对或更新白名单。                                      |

完整故障排查：

- [/channels/imessage#troubleshooting](/channels/imessage#troubleshooting)
- [/channels/bluebubbles#troubleshooting](/channels/bluebubbles#troubleshooting)

## Signal

### Signal 故障特征

| 症状                         | 最快检查                          | 修复                                                      |
| ----------------------------- | -------------------------------- | --------------------------------------------------------- |
| 守护进程可达但机器人无响应    | `openclaw channels status --probe` | 验证 `signal-cli` 守护进程 URL/账户和接收模式。           |
| 私信被阻止                   | `openclaw pairing list signal`    | 批准发送者或调整私信策略。                                |
| 群组回复未触发               | 检查群组白名单和提及模式          | 添加发送者/群组或放松门控。                               |

完整故障排查：[/channels/signal#troubleshooting](/channels/signal#troubleshooting)

## Matrix

### Matrix 故障特征

| 症状                             | 最快检查                              | 修复                                                         |
| -------------------------------- | ------------------------------------ | ------------------------------------------------------------ |
| 已登录但忽略房间消息             | `openclaw channels status --probe`   | 检查 `groupPolicy` 和房间白名单。                           |
| 私信未处理                     | `openclaw pairing list matrix`        | 批准发送者或调整私信策略。                                  |
| 加密房间故障                   | 验证加密模块和加密设置                | 启用加密支持并重新加入/同步房间。                           |

完整设置和配置：[Matrix](/channels/matrix)
