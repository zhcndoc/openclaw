---
summary: "通过每个频道的故障特征和修复快速进行频道级故障排查"
read_when:
  - Channel transport says connected but replies fail
  - You need channel specific checks before deep provider docs
title: "频道故障排查"
---

当某个频道已连接但行为异常时，请使用此页面。

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

- `Runtime: running`
- `Connectivity probe: ok`
- `Capability: read-only`, `write-capable`, 或 `admin-capable`
- 频道探测显示传输已连接，并且在受支持的情况下显示 `works` 或 `audit ok`

## WhatsApp

### WhatsApp 故障特征

| Symptom                         | Fastest check                                       | Fix                                                      |
| ------------------------------- | --------------------------------------------------- | -------------------------------------------------------- |
| Connected but no DM replies     | `openclaw pairing list whatsapp`                    | Approve sender or switch DM policy/allowlist.            |
| Group messages ignored          | Check `requireMention` + mention patterns in config | Mention the bot or relax mention policy for that group.  |
| QR login times out with 408     | Check gateway `HTTPS_PROXY` / `HTTP_PROXY` env      | Set a reachable proxy; use `NO_PROXY` only for bypasses. |
| Random disconnect/relogin loops | `openclaw channels status --probe` + logs           | Re-login and verify credentials directory is healthy.    |

完整故障排查：[WhatsApp 故障排查](/channels/whatsapp#troubleshooting)

## Telegram

### Telegram 故障特征

| 症状                             | 最快检查                                    | 修复                                                                                                                        |
| ----------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `/start` 但没有可用的回复流程   | `openclaw pairing list telegram`                 | 批准配对或更改私信策略。                                                                                       |
| 机器人在线但群组保持沉默   | 验证提及要求和机器人隐私模式  | 为群组可见性禁用隐私模式，或提及机器人。                                                                  |
| 发送失败并伴随网络错误   | 检查 Telegram API 调用失败的日志      | 修复到 `api.telegram.org` 的 DNS/IPv6/代理路由。                                                                          |
| 轮询停滞或重新连接缓慢 | `openclaw logs --follow` 查看轮询诊断 | 升级；如果重启是误报，请调整 `pollingStallThresholdMs`。持续停滞仍指向代理/DNS/IPv6。 |
| 启动时 `setMyCommands` 被拒绝 | 检查日志中的 `BOT_COMMANDS_TOO_MUCH`         | 减少插件/技能/自定义 Telegram 命令，或禁用原生菜单。                                                      |
| 升级后白名单阻止了你   | `openclaw security audit` 和配置白名单  | 运行 `openclaw doctor --fix`，或将 `@username` 替换为数字发送者 ID。                                                |

完整故障排查：[Telegram 故障排查](/channels/telegram#troubleshooting)

## Discord

### Discord 故障特征

| 症状                         | 最快检查                           | 修复                                                         |
| ----------------------------- | --------------------------------- | ------------------------------------------------------------ |
| 机器人在线但公会无回复        | `openclaw channels status --probe` | 允许公会/频道并验证 MESSAGE_CONTENT 意图权限。                        |
| 群组消息被忽略                | 检查日志中的提及门控丢弃            | 提及机器人或将公会/频道设置为 `requireMention: false`。     |
| 私信回复缺失                   | `openclaw pairing list discord`    | 批准私信配对或调整私信策略。                                 |

完整故障排查：[Discord 故障排查](/channels/discord#troubleshooting)

## Slack

### Slack 故障特征

| 症状 | 最快检查 | 修复 |
| -------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Socket 模式已连接但无回复 | `openclaw channels status --probe`        | 验证应用令牌 + 机器人令牌和所需作用域；在基于 SecretRef 的设置上注意 `botTokenStatus` / `appTokenStatus = configured_unavailable`。 |
| 私信被阻止                            | `openclaw pairing list slack`             | 批准配对或放宽私信策略。                                                                                                                  |
| 频道消息被忽略                | 检查 `groupPolicy` 和频道允许名单 | 允许该频道或将策略切换为 `open`。                                                                                                        |

完整故障排查：[Slack 故障排查](/channels/slack#troubleshooting)

## iMessage 和 BlueBubbles

### iMessage 和 BlueBubbles 故障特征

| 症状                          | 最快检查                                             | 修复                                                         |
| ----------------------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| 无入站事件                    | 验证 webhook/服务器可达性和应用权限                  | 修复 webhook URL 或 BlueBubbles 服务器状态。                |
| macOS 可以发送但无法接收          | 检查 macOS 信息自动化的隐私权限                      | 重新授权 TCC 权限并重启频道进程。                           |
| 私信发送者被阻止              | `openclaw pairing list imessage` 或 `openclaw pairing list bluebubbles` | 批准配对或更新白名单。                                      |

完整故障排查：

- [iMessage 故障排查](/channels/imessage#troubleshooting)
- [BlueBubbles 故障排查](/channels/bluebubbles#troubleshooting)

## Signal

### Signal 故障特征

| 症状                         | 最快检查                          | 修复                                                      |
| ----------------------------- | -------------------------------- | --------------------------------------------------------- |
| 守护进程可达但机器人无响应    | `openclaw channels status --probe` | 验证 `signal-cli` 守护进程 URL/账户和接收模式。           |
| 私信被阻止                   | `openclaw pairing list signal`    | 批准发送者或调整私信策略。                                |
| 群组回复未触发               | 检查群组白名单和提及模式          | 添加发送者/群组或放松门控。                               |

完整故障排查：[Signal 故障排查](/channels/signal#troubleshooting)

## QQ Bot

### QQ Bot 故障特征

| 症状 | 最快检查 | 修复 |
| ------------------------------- | ------------------------------------------- | --------------------------------------------------------------- |
| 机器人回复 "gone to Mars"      | 验证配置中的 `appId` 和 `clientSecret` | 设置凭据或重启网关。                         |
| 无入站消息             | `openclaw channels status --probe`          | 在 QQ 开放平台验证凭据。                     |
| 语音未转录           | 检查 STT 提供商配置                   | 配置 `channels.qqbot.stt` 或 `tools.media.audio`。          |
| 主动消息未到达 | 检查 QQ 平台交互要求  | QQ 可能会阻止没有最近交互的机器人发起消息。 |

完整故障排查：[QQ Bot 故障排查](/channels/qqbot#troubleshooting)

## Matrix

### Matrix 故障特征

| 症状 | 最快检查 | 修复 |
| ----------------------------------- | -------------------------------------- | ------------------------------------------------------------------------- |
| 已登录但忽略房间消息 | `openclaw channels status --probe`     | 检查 `groupPolicy`、房间允许名单和提及门控。                  |
| 私信不处理                  | `openclaw pairing list matrix`         | 批准发送者或调整私信策略。                                       |
| 加密房间失败                | `openclaw matrix verify status`        | 重新验证设备，然后检查 `openclaw matrix verify backup status`。  |
| 备份恢复待处理/损坏    | `openclaw matrix verify backup status` | 运行 `openclaw matrix verify backup restore` 或使用恢复密钥重新运行。 |
| 交叉签名/引导看起来异常 | `openclaw matrix verify bootstrap`     | 一次性修复秘密存储、交叉签名和备份状态。       |

完整设置与配置：[Matrix](/channels/matrix)

## 相关内容

- [配对](/channels/pairing)
- [频道路由](/channels/channel-routing)
- [网关故障排查](/gateway/troubleshooting)
