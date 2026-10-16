---
summary: "通过每个频道的失败特征和修复方法进行快速频道级故障排查"
read_when:
  - "传输层显示已连接，但回复失败"
  - "在深入查看提供方文档之前，需要先做频道特定检查"
title: "频道故障排查"
---

当某个频道已连接但行为异常时，请使用此页面。

## <a id="command-ladder"></a> 命令阶梯

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
- A 连接检查成功
- `Capability: read-only`、`write-capable` 或 `admin-capable`
- 通道检查显示已连接的传输，以及 `works` 或 `audit ok`（如果支持）

## <a id="after-an-update"></a> 更新后

当 Telegram、iMessage、BlueBubbles-era 配置或其他插件通道在更新后消失时使用此选项。

```bash
openclaw status --all
openclaw doctor --fix
openclaw gateway restart
openclaw status --all
```

在 `openclaw status --all` 中查找 `plugin load failed: dependency tree corrupted; run openclaw doctor --fix`。这意味着通道已配置，但插件 setup/load 命中了损坏的依赖关系树，而不是注册通道。 `openclaw doctor --fix` 清除过时的插件运行时依赖符号链接和过时的身份验证阴影，然后 `openclaw gateway restart` 重新加载干净状态。

## WhatsApp

### <a id="whatsapp-failure-signatures"></a> WhatsApp 失败特征

| 症状                             | 最快检查项                                       | 修复                                                                                                                              |
| ----------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 已连接但无 DM 回复         | `openclaw pairing list whatsapp`                    | 批准发送者或交换机 DM policy/allowlist.                                                                                    |
| 群组消息被忽略              | 检查配置中的 `requireMention` + 提及模式 | 提及机器人，或放宽该群组的提及策略。                                                                          |
| 带有 408 的 QR 登录超时         | 检查网关 `HTTPS_PROXY` / `HTTP_PROXY` 环境变量      | 设置可访问的代理；仅将 `NO_PROXY` 用于绕过。                                                                         |
| 随机 disconnect/relogin 循环     | `openclaw channels status --probe` + 日志           | 即使当前已连接，最近的重新连接也会被标记；观察日志，重新启动网关，然后如果持续抖动则重新链接。 |
| `status=408 Request Time-out`循环  | 检查、日志、医生、然后网关状态            | 先修复主机connectivity/timing；如果循环仍然存在，请备份身份验证并重新链接帐户。                                   |
| 回复迟到 seconds/minutes | `openclaw doctor --fix`                             | 当经过验证的过时本地 TUI 客户端降低网关事件循环性能时，Doctor 会停止这些客户端。                                    |

完整故障排查：[WhatsApp 故障排查](/channels/whatsapp#troubleshooting)

## Telegram

### <a id="telegram-failure-signatures"></a> Telegram 故障特征

| 症状                              | 最快检查项                                    | 修复                                                                                                                    |
| ------------------------------------ | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `/start` 但没有可用的回复流程    | `openclaw pairing list telegram`                 | 批准配对或更改 DM 策略。                                                                                   |
| 机器人在线但群组保持沉默    | 检查提及要求和机器人的隐私模式  | 为了群组可见性关闭隐私模式，或提及机器人。                                                              |
| 由于网络错误导致发送失败    | 检查日志中是否有 Telegram API 调用失败      | 修复 DNS/IPv6/proxy 路由至 `api.telegram.org`。                                                                      |
| 启动时报告 `getMe returned 401` | 检查已配置的令牌来源                    | 重新复制或重新生成 BotFather 令牌，并更新 `botToken`、`tokenFile` 或默认账户 `TELEGRAM_BOT_TOKEN`。 |
| 轮询停止或重新连接缓慢  | `openclaw logs --follow` 用于轮询诊断 | 升级；持久性停顿通常指向 proxy/DNS/IPv6.                                                            |
| `setMyCommands` 启动时被拒绝  | 检查日志中是否有 `BOT_COMMANDS_TOO_MUCH`         | 减少 plugin/skill/custom Telegram 命令或禁用本机菜单。                                                  |
| 已升级并列入许可名单会阻止您    | `openclaw security audit` 和配置允许列表  | 运行 `openclaw doctor --fix` 或用数字发件人 ID 替换 `@username`。                                            |

完整故障排查：[Telegram 故障排查](/channels/telegram#troubleshooting)。

## Discord

### <a id="discord-failure-signatures"></a> Discord 失败特征

| 症状                                                      | 最快检查项                                                                                                                | 修复                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 机器人在线但没有 guild 回复                              | `openclaw channels status --probe`                                                                                           | 允许 guild/channel 并验证消息内容意图。                                                                                                                                                                                                                |
| 群组消息被忽略                                       | 检查日志中是否有提及门控丢弃                                                                                          | 提及机器人，或设置 guild/channel `requireMention: false`。                                                                                                                                                                                                             |
| Typing/token 使用但没有 Discord 消息                    | 检查这是否是环境房间事件或模型错过了 `message(action=send)` 的选择加入的 `message_tool` 房间 | 检查网关详细日志以获取受抑制的最终有效负载元数据，验证 `messages.groupChat.unmentionedInbound`，读取 [ 环境房间事件 ](/channels/ambient-room-events)，或保留 `messages.groupChat.visibleReplies: "automatic"` 以用于正常组请求。 |
| DM 回复缺失                                           | `openclaw pairing list discord`                                                                                              | 批准 DM 配对或调整 DM 策略。                                                                                                                                                                                                                               |
| 以前能工作的频道里机器人沉默                     | 检查 guild 条目是否新增了 `channels` map                                                                        | channel map 是一个允许列表：未列出的频道会被拒绝。添加一个 `"*"` 通配符条目。参见 [Guild channel maps are allowlists](/channels/discord#guild-channel-maps-are-allowlists)。                                                                                |
| Agent 无法看到来自其他机器人的 room 历史或附件 | 检查 room 的 `requireMention` 和账户的 `allowBots`                                                              | `requireMention: true` 会在未提及消息成为 room 事件之前将其丢弃，因此不会有 backlog。机器人发送的消息及其附件需要 `allowBots`（`"mentions"` 是更安全的设置）。参见 [Ambient room events](/channels/ambient-room-events)。 |
| Agent 监视一个 ambient room 但从不发帖                | 检查该 agent 的工具配置文件中是否有 `message` 工具                                                                        | room 事件需要 `message(action=send)`，而 `minimal` 和 `coding` 配置文件会省略它。为该 agent 授予 `tools.alsoAllow: ["message"]`。                                                                                                                      |

完整故障排除：[不一致故障排除](/channels/discord/troubleshooting#troubleshooting)

## Slack

### <a id="slack-failure-signatures"></a> Slack 失败特征

| 症状                                | 最快检查项                             | 修复                                                                                                                                                  |
| -------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Socket mode 已连接但没有响应 | `openclaw channels status --probe`        | 验证 app token + bot token 以及所需权限；在基于 SecretRef 的配置中，留意 `botTokenStatus` / `appTokenStatus = configured_unavailable`。 |
| 私信被屏蔽                            | `openclaw pairing list slack`             | 批准配对或放宽 DM 政策。                                                                                                                  |
| 频道消息被忽略                | 检查 `groupPolicy` 和频道允许列表 | 允许该频道，或将策略切换为 `open`。                                                                                                        |

完整故障排除：[松弛故障排除](/channels/slack/troubleshooting#troubleshooting)

## iMessage

### <a id="imessage-failure-signatures"></a> iMessage 失败特征

| 症状                              | 最快检查项                                           | 修复                                                                   |
| ------------------------------------ | ------------------------------------------------------- | --------------------------------------------------------------------- |
| `imsg` 缺失或在非 macOS 上失败 | `openclaw channels status --probe --channel imessage`   | 在 Messages 所在的 Mac 上运行 OpenClaw，或为 `cliPath` 使用 SSH 封装器。 |
| 在 macOS 上可以发送但无法接收     | 检查 Messages automation 的 macOS 隐私权限 | 重新授予 TCC 权限并重启频道进程。                 |
| DM 发送者被阻止                    | `openclaw pairing list imessage`                        | 批准配对或更新允许列表。                                  |

完整故障排查：[iMessage 故障排查](/channels/imessage#troubleshooting)。

## Signal

### <a id="signal-failure-signatures"></a> Signal 失败特征

| 症状                         | 最快检查项                              | 修复                                                      |
| ------------------------------- | ------------------------------------------ | -------------------------------------------------------- |
| 守护进程可访问，但机器人保持沉默 | `openclaw channels status --probe`         | 验证 `signal-cli` 守护进程 URL/account 和接收模式。 |
| DM 被阻止                      | `openclaw pairing list signal`             | 批准发送者或调整 DM 策略。                      |
| 群组回复不触发    | 检查组许可名单和提及模式 | 添加 sender/group 或放松选通。                       |

完整故障排查：[Signal 故障排查](/channels/signal#troubleshooting)。

## <a id="qq-bot"></a> QQ 机器人

### <a id="qq-bot-failure-signatures"></a> QQ Bot 失败特征

| 症状                         | 最快检查项                               | 修复                                                                                                                       |
| ------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 机器人回复“去了火星”      | 验证配置中的 `appId` 和 `clientSecret` | 正确的凭据，然后在 [hot 重新加载 ](/gateway/configuration/hot-reload) 后检查 `openclaw channels status --probe`。 |
| 没有入站消息             | `openclaw channels status --probe`          | 验证 QQ Open Platform 上的凭据。                                                                               |
| 语音未转录           | 检查 STT provider 配置                   | 配置 `channels.qqbot.stt` 或 `tools.media.audio`。                                                                    |
| 主动消息未送达 | 检查 QQ 平台交互要求  | QQ 可能会阻止没有最近交互的机器人发起消息。                                                           |

完整故障排查：[QQ Bot 故障排查](/channels/qqbot#troubleshooting)。

## Matrix

### <a id="matrix-failure-signatures"></a> Matrix 失败特征

| 症状                             | 最快检查项                          | 修复                                                                       |
| ----------------------------------- | -------------------------------------- | ------------------------------------------------------------------------- |
| 已登录但忽略房间消息 | `openclaw channels status --probe`     | 检查 `groupPolicy`、房间允许列表和提及门控。                  |
| DM 不处理                  | `openclaw pairing list matrix`         | 批准发送者或调整 DM 策略。                                       |
| 加密房间失败                | `openclaw matrix verify status`        | 重新验证设备，然后检查 `openclaw matrix verify backup status`。  |
| 备份恢复为pending/broken    | `openclaw matrix verify backup status` | 运行 `openclaw matrix verify backup restore` 或使用恢复密钥重新运行。 |
| Cross-signing/bootstrap 看起来不对 | `openclaw matrix verify bootstrap`     | 一次性修复秘密存储、交叉签名和备份状态。       |

完整设置和配置：[Matrix](/channels/matrix)。

## <a id="gateway-up-but-channel-never-connects"></a> 网关已启动但通道始终无法连接

如果网关进程运行正常，但某个通道在多次非正常启动后仍处于停止状态，则[崩溃循环断路器](/gateway/restart-recovery#safety-valves-and-observability) 可能正在抑制通道自动启动。使用 `openclaw gateway call channels.start --params '{"channel":"<id>"}'` 可立即覆盖该限制，或者让运行正常的网关继续运行。待完整的非正常启动窗口结束后，同一进程会重新检查断路器，并恢复被延迟的通道自动启动。

## <a id="related"></a> 相关内容

- [配对](/channels/pairing)
- [频道路由](/channels/channel-routing)
- [网关故障排查](/gateway/troubleshooting)
