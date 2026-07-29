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

- `运行时：运行中`
- `连接性探测：正常`
- `能力：只读`、`可写` 或 `具备管理员权限`
- 频道探测显示传输已连接，并且在支持的情况下显示 `works` 或 `audit ok`

## 更新后

在更新后，当 Telegram、iMessage、BlueBubbles 时代的配置，或其他插件通道消失时使用

```bash
openclaw status --all
openclaw doctor --fix
openclaw gateway restart
openclaw status --all
```

在 `openclaw status --all` 中查找 `plugin load failed: dependency tree corrupted; run openclaw doctor --fix`。这表示该通道已配置，但插件设置/加载时遇到了损坏的依赖树，导致没有注册该通道。`openclaw doctor --fix` 会清除过期的 plugin-runtime 依赖符号链接和过期的 auth shadow，然后 `openclaw gateway restart` 会重新加载干净状态。

## WhatsApp

### WhatsApp 失败特征

| 症状                                | 最快检查项                                       | 修复方法                                                                                                                              |
| ----------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 已连接但没有 DM 回复               | `openclaw pairing list whatsapp`                    | 批准发送者或切换 DM 策略/允许列表。                                                                                                    |
| 群组消息被忽略                      | 检查配置中的 `requireMention` + 提及模式          | 提及机器人，或放宽该群组的提及策略。                                                                                                    |
| 带有 408 的 QR 登录超时            | 检查网关 `HTTPS_PROXY` / `HTTP_PROXY` 环境变量    | 设置可访问的代理；仅将 `NO_PROXY` 用于绕过。                                                                                            |
| 随机断开/重新登录循环               | `openclaw channels status --probe` + 日志           | 即使当前已连接，最近的重连也会被标记；观察日志，重启网关，然后如果仍然频繁抖动就重新关联。                                            |
| `status=408 Request Time-out` 循环 | 探测、日志、doctor，然后查看网关状态                | 先修复主机连通性/时序；备份认证信息并在循环持续时重新关联账户。                                                                         |
| 回复延迟数秒/数分钟到达             | `openclaw doctor --fix`                             | 当已验证的本地旧 TUI 客户端正在拖慢 Gateway 事件循环时，doctor 会将其停止。                                                             |

完整故障排查：[WhatsApp 故障排查](/channels/whatsapp#troubleshooting)

## Telegram

### Telegram 失败特征

| 症状                                 | 最快检查                                           | 修复                                                                                                                    |
| ------------------------------------ | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `/start` 但没有可用的回复流程        | `openclaw pairing list telegram`                 | 批准配对或更改 DM 策略。                                                                                                  |
| Bot 在线但群组保持沉默               | 检查提及要求和 bot 隐私模式                         | 为了群组可见性关闭隐私模式，或提及 bot。                                                                                 |
| 发送失败并出现网络错误               | 检查 Telegram API 调用失败的日志                    | 修复到 `api.telegram.org` 的 DNS/IPv6/proxy 路由。                                                                       |
| 启动时报告 `getMe returned 401`      | 检查已配置的 token 来源                             | 重新复制或重新生成 BotFather token，并更新 `botToken`、`tokenFile` 或默认账户 `TELEGRAM_BOT_TOKEN`。                    |
| 轮询停滞或重连缓慢                   | 使用 `openclaw logs --follow` 查看轮询诊断信息      | 升级；持续停滞通常指向 proxy/DNS/IPv6。                                                                                  |
| 启动时 `setMyCommands` 被拒绝         | 检查日志中的 `BOT_COMMANDS_TOO_MUCH`                | 减少插件/技能/自定义 Telegram 命令，或禁用原生菜单。                                                                     |
| 升级后 allowlist 阻止你               | 执行 `openclaw security audit` 并检查配置 allowlists | 运行 `openclaw doctor --fix`，或将 `@username` 替换为数字发送者 ID。                                                     |

完整故障排查：[Telegram 故障排查](/channels/telegram#troubleshooting)

## Discord

### Discord 失败特征

| 症状                                                      | 最快检查方法                                                                                                                | 修复                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bot 在线但没有 guild 回复                              | `openclaw channels status --probe`                                                                                           | 允许 guild/channel 并验证消息内容意图。                                                                                                                                                                                                                |
| 群消息被忽略                                       | 检查日志中是否有 mention gating 丢弃                                                                                          | 提及 bot，或设置 guild/channel `requireMention: false`。                                                                                                                                                                                                             |
| 有输入/令牌使用但没有 Discord 消息                    | 检查这是否是 ambient room 事件，或者是一个已选择加入的 `message_tool` room，但模型遗漏了 `message(action=send)` | 检查 gateway verbose 日志中是否有被抑制的最终 payload 元数据，验证 `messages.groupChat.unmentionedInbound`，阅读 [Ambient room events](/channels/ambient-room-events)，或者将普通群组请求的 `messages.groupChat.visibleReplies` 保持为 `"automatic"`。 |
| DM 回复缺失                                           | `openclaw pairing list discord`                                                                                              | 批准 DM 配对或调整 DM 策略。                                                                                                                                                                                                                               |
| 以前能工作的频道里 bot 沉默                    | 检查 guild 条目是否新增了 `channels` map                                                                        | channel map 是一个 allowlist：未列出的频道会被拒绝。添加一个 `"*"` 通配符条目。参见 [Guild channel maps are allowlists](/channels/discord#guild-channel-maps-are-allowlists)。                                                                                |
| Agent 无法看到来自其他 bot 的 room 历史或附件 | 检查 room 的 `requireMention` 和账户的 `allowBots`                                                              | `requireMention: true` 会在未提及消息成为 room 事件之前将其丢弃，因此不会有 backlog。bot 发送的消息及其附件需要 `allowBots`（`"mentions"` 是更安全的设置）。参见 [Ambient room events](/channels/ambient-room-events)。 |
| Agent 监视一个 ambient room 但从不发帖                | 检查该 agent 的工具配置文件中是否有 `message` 工具                                                                        | room 事件需要 `message(action=send)`，而 `minimal` 和 `coding` 配置文件会省略它。为该 agent 授予 `tools.alsoAllow: ["message"]`。                                                                                                                      |

完整故障排查：[Discord 故障排查](/channels/discord#troubleshooting)

## Slack

### Slack 失败特征

| 症状                                | 最快检查项                             | 修复方法                                                                                                                                                  |
| ---------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Socket mode 已连接但没有响应       | `openclaw channels status --probe`        | 验证 app token + bot token 以及所需权限；在基于 SecretRef 的配置中，留意 `botTokenStatus` / `appTokenStatus = configured_unavailable`。 |
| DM 被阻止                           | `openclaw pairing list slack`             | 批准配对或放宽 DM 策略。                                                                                                                  |
| 频道消息被忽略                      | 检查 `groupPolicy` 和频道允许列表       | 允许该频道，或将策略切换为 `open`。                                                                                                        |

完整故障排查：[Slack 故障排查](/channels/slack#troubleshooting)

## iMessage

### iMessage 失败特征

| 症状                              | 最快检查项                                           | 修复方法                                                                   |
| ------------------------------------ | ------------------------------------------------------- | --------------------------------------------------------------------- |
| `imsg` 缺失或在非 macOS 上失败 | `openclaw channels status --probe --channel imessage`   | 在 Messages 所在的 Mac 上运行 OpenClaw，或为 `cliPath` 使用 SSH 封装器。 |
| 在 macOS 上可以发送但无法接收     | 检查 Messages automation 的 macOS 隐私权限 | 重新授予 TCC 权限并重启频道进程。                 |
| DM 发送者被阻止                    | `openclaw pairing list imessage`                        | 批准配对或更新允许列表。                                  |

完整故障排查：[iMessage 故障排查](/channels/imessage#troubleshooting)

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
| --------------------------- | --------------------------- | --------------------------------------------------------------- |
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

## 网关已启动但通道始终无法连接

如果网关进程运行正常，但在多次
非正常启动后某个通道仍处于停止状态，[崩溃循环保护器](/gateway/restart-recovery#safety-valves-and-observability)
可能正在抑制通道自动启动。使用
`openclaw gateway call channels.start --params '{"channel":"<id>"}'` 来
覆盖此行为，或者等待非正常启动窗口耗尽后再重启
网关。

## 相关

- [配对](/channels/pairing)
- [频道路由](/channels/channel-routing)
- [网关故障排除](/gateway/troubleshooting)
