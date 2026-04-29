---
summary: "通过每个频道的失败特征和修复方法进行快速频道级故障排查"
read_when:
  - 传输层显示已连接，但回复失败
  - 在深入查看提供方文档之前，需要先做频道特定检查
title: "频道故障排查"
---

当某个频道已连接但行为异常时，请使用此页面。

## 命令阶梯

请先按顺序运行以下命令：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

健康基线：

- `Runtime: running`
- `Connectivity probe: ok`
- `Capability: read-only`, `write-capable`, or `admin-capable`
- 频道探测显示传输已连接，并且在支持的情况下显示 `works` 或 `audit ok`

## WhatsApp

### WhatsApp 失败特征

| 症状                         | 最快检查项                                       | 修复方法                                                                                                                        |
| --------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 已连接但没有 DM 回复         | `openclaw pairing list whatsapp`                    | 批准发送者，或切换 DM 策略/允许列表。                                                                                            |
| 群消息被忽略                 | 检查配置中的 `requireMention` + mention patterns | 提及机器人，或放宽该群组的提及策略。                                                                                             |
| QR 登录因 408 超时          | 检查网关 `HTTPS_PROXY` / `HTTP_PROXY` 环境变量    | 设置一个可达的代理；仅将 `NO_PROXY` 用于绕过。                                                                                   |
| 随机断开/重新登录循环       | `openclaw channels status --probe` + logs           | 即使当前已连接，最近的重连也会被标记；观察日志、重启网关，然后如果仍然频繁抖动则重新关联。 |

完整故障排查：[WhatsApp 故障排查](/channels/whatsapp#troubleshooting)

## Telegram

### Telegram 失败特征

| 症状                              | 最快检查项                                    | 修复方法                                                                                                                        |
| -------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `/start` 但没有可用的回复流程    | `openclaw pairing list telegram`                 | 批准配对或更改 DM 策略。                                                                                                       |
| 机器人在线但群组保持沉默        | 验证提及要求和机器人隐私模式                   | 对群组可见性禁用隐私模式，或提及机器人。                                                                                        |
| 发送失败并伴随网络错误            | 检查日志中的 Telegram API 调用失败             | 修复到 `api.telegram.org` 的 DNS/IPv6/代理路由。                                                                                |
| 启动时报告 `getMe returned 401` | 检查已配置的令牌来源                            | 重新复制或重新生成 BotFather token，并更新 `botToken`、`tokenFile` 或默认账户的 `TELEGRAM_BOT_TOKEN`。                      |
| 轮询卡住或重连很慢                | 使用 `openclaw logs --follow` 查看轮询诊断      | 升级；如果重启是假阳性，则调整 `pollingStallThresholdMs`。持续卡住仍然指向代理/DNS/IPv6 问题。                                 |
| 启动时 `setMyCommands` 被拒绝    | 检查日志中的 `BOT_COMMANDS_TOO_MUCH`           | 减少插件/技能/自定义 Telegram 命令，或禁用原生菜单。                                                                           |
| 升级后允许列表阻止了你            | `openclaw security audit` 和配置允许列表        | 运行 `openclaw doctor --fix`，或用数字发送者 ID 替换 `@username`。                                                              |

完整故障排查：[Telegram 故障排查](/channels/telegram#troubleshooting)

## Discord

### Discord 失败特征

| 症状                         | 最快检查项                       | 修复方法                                                       |
| --------------------------- | ----------------------------------- | --------------------------------------------------------- |
| 机器人在线但没有 guild 回复 | `openclaw channels status --probe`  | 允许 guild/channel 并验证 message content intent。        |
| 群消息被忽略                 | 检查日志中提及门控丢弃             | 提及机器人，或将 guild/channel 的 `requireMention` 设为 `false`。 |
| DM 回复缺失                  | `openclaw pairing list discord`     | 批准 DM 配对或调整 DM 策略。                               |

完整故障排查：[Discord 故障排查](/channels/discord#troubleshooting)

## Slack

### Slack 失败特征

| 症状                                | 最快检查项                             | 修复方法                                                                                                                                                  |
| ---------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Socket mode 已连接但没有响应       | `openclaw channels status --probe`        | 验证 app token + bot token 以及所需权限；在基于 SecretRef 的配置中，留意 `botTokenStatus` / `appTokenStatus = configured_unavailable`。 |
| DM 被阻止                           | `openclaw pairing list slack`             | 批准配对或放宽 DM 策略。                                                                                                                  |
| 频道消息被忽略                      | 检查 `groupPolicy` 和频道允许列表       | 允许该频道，或将策略切换为 `open`。                                                                                                        |

完整故障排查：[Slack 故障排查](/channels/slack#troubleshooting)

## iMessage 和 BlueBubbles

### iMessage 和 BlueBubbles 失败特征

| 症状                          | 最快检查项                                                           | 修复方法                                                   |
| ---------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------- |
| 没有入站事件                | 验证 webhook/服务器可达性和应用权限                                  | 修复 webhook URL 或 BlueBubbles 服务器状态。          |
| 能发送但在 macOS 上无法接收 | 检查 Messages automation 的 macOS 隐私权限                         | 重新授予 TCC 权限并重启频道进程。 |
| DM 发送者被阻止             | `openclaw pairing list imessage` or `openclaw pairing list bluebubbles` | 批准配对或更新允许列表。                  |

完整故障排查：

- [iMessage 故障排查](/channels/imessage#troubleshooting)
- [BlueBubbles 故障排查](/channels/bluebubbles#troubleshooting)

## Signal

### Signal 失败特征

| 症状                         | 最快检查项                              | 修复方法                                                      |
| --------------------------- | ------------------------------------------ | -------------------------------------------------------- |
| 守护进程可达但机器人沉默   | `openclaw channels status --probe`         | 验证 `signal-cli` 守护进程 URL/账户和接收模式。 |
| DM 被阻止                  | `openclaw pairing list signal`             | 批准发送者或调整 DM 策略。                      |
| 群组回复不触发              | 检查群组允许列表和提及模式              | 添加发送者/群组，或放宽门控。                       |

完整故障排查：[Signal 故障排查](/channels/signal#troubleshooting)

## QQ Bot

### QQ Bot 失败特征

| 症状                         | 最快检查项                               | 修复方法                                                             |
| --------------------------- | ------------------------------------------- | --------------------------------------------------------------- |
| 机器人回复“去了火星”      | 验证配置中的 `appId` 和 `clientSecret` | 设置凭据或重启网关。                         |
| 没有入站消息               | `openclaw channels status --probe`          | 验证 QQ Open Platform 上的凭据。                     |
| 语音未转录                 | 检查 STT provider 配置                   | 配置 `channels.qqbot.stt` 或 `tools.media.audio`。          |
| 主动消息未送达             | 检查 QQ 平台交互要求                    | QQ 可能会阻止没有最近交互的机器人发起消息。 |

完整故障排查：[QQ Bot 故障排查](/channels/qqbot#troubleshooting)

## Matrix

### Matrix 失败特征

| 症状                             | 最快检查项                          | 修复方法                                                                       |
| ----------------------------------- | -------------------------------------- | ------------------------------------------------------------------------- |
| 已登录但忽略房间消息            | `openclaw channels status --probe`     | 检查 `groupPolicy`、房间允许列表和提及门控。                  |
| DM 不处理                         | `openclaw pairing list matrix`         | 批准发送者或调整 DM 策略。                                       |
| 加密房间失败                      | `openclaw matrix verify status`        | 重新验证设备，然后检查 `openclaw matrix verify backup status`。  |
| 备份恢复处于待处理/损坏状态       | `openclaw matrix verify backup status` | 运行 `openclaw matrix verify backup restore`，或使用恢复密钥重新运行。 |
| 交叉签名/启动配置看起来不对       | `openclaw matrix verify bootstrap`     | 一次性修复 secret storage、交叉签名和备份状态。       |

完整设置和配置：[Matrix](/channels/matrix)

## 相关内容

- [配对](/channels/pairing)
- [频道路由](/channels/channel-routing)
- [网关故障排除](/gateway/troubleshooting)
