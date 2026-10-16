---
summary: "cron下的自动化配置加上媒体模型模板变量表面"
read_when:
  - "安排 cron 自动化"
  - "配置自动化故障警报"
  - "查找媒体模型模板变量"
title: "配置——自动化和媒体模板变量"
---

`cron.*` 下预定的自动化键，加上媒体模型模板变量表面。

完整密钥索引和其他顶级配置域，请参见[配置参考](/gateway/configuration-reference)。

## <a id="automations-(cron)"></a><a id="automations-cron"></a> 自动化（`cron`）

```json5
{
  cron: {
    enabled: true,
    triggers: {
      enabled: true,
    },
    webhookToken: "replace-with-dedicated-token", // optional bearer token for outbound webhook auth
    webhookSsrfPolicy: {
      allowedHostnames: ["127.0.0.1"], // optional exact exception for a trusted receiver
    },
    sessionRetention: "24h", // duration string ("0h" disables) or false
  },
}
```

- `enabled`：执行已存储的自动化任务（默认：`true`）。设置为 `false` 可暂停所有自动化执行，而不会删除任务。
- `skipMissedJobs`：启动时跳过错过的重复出现的 （`cron`/`every`） 插槽，并前进到下一个未来出现的位置（默认值：`false`）。一次性 （`at`） 追赶不变。
- `triggers.enabled`：运行事件驱动的自动化触发器（默认值：`true`）。设置 `false` 以禁用条件触发器、脚本负载、流计划和事件源准入。
- `sessionRetention`：在清理 SQLite 会话行之前，保留已完成的隔离自动化运行会话的时长。也控制已归档的已删除自动化记录的清理。默认值：`24h`；设置为 `false` 或 `"0h"` 等零时长可禁用（负时长无效）。
- 终端运行历史记录保留 7 天（`lost` 行保留 24 小时），每个作业和历史记录类强制执行最新的 2000 行作为附加上限。
- `webhookToken`：用于自动化 webhook POST 投递（`delivery.mode = "webhook"`）的 bearer 令牌；如果省略，则不会发送身份验证标头。
- `webhookSsrfPolicy`：用​​于主要、完成、故障目标和故障警报 Webhook 的共享出站 SSRF 策略。 Private/internal 省略时目标将被阻止。更喜欢精确的 `allowedHostnames`；仅将 `dangerouslyAllowPrivateNetwork: true` 用于受信任的专用网络接收方。窄假 IP 代理标志是 `allowRfc2544BenchmarkRange` 和 `allowIpv6UniqueLocalRange`。
- `webhookSsrfPolicy.blockedHostnames`：拒绝 DNS 之前的确切主机和通配符子域以及所有允许规则。 `*.example.com` 不包括顶点；单独添加`example.com`来阻止它。为空或未设置不会增加任何拒绝。

`cron`区块严格； `cron.enabled`、`cron.skipMissedJobs`、`cron.triggers`、`cron.webhookToken`、`cron.webhookSsrfPolicy`、`cron.sessionRetention` 和 `cron.failureAlert` 是唯一可接受的密钥。已退役的 `cron.webhook` 后备 URL 已消失：运行时交付使用每个作业 `delivery.mode = "webhook"` 加上 `delivery.to`，或在保留公告交付时使用 `delivery.completionDestination`。 `openclaw doctor --fix` 从现有配置文件中删除剩余的 `cron.webhook`。

### `cron.failureAlert`

```json5
{
  cron: {
    failureAlert: {
      enabled: false,
      after: 2,
      cooldownMs: 3600000,
      includeSkipped: false,
      mode: "announce",
      channel: "last",
      to: "channel:C1234567890",
      accountId: "main",
    },
  },
}
```

`cron.failureAlert` 拥有全局警报策略及其默认目标。已存在失败路径的作业，连续 2 次执行失败且冷却时间为 1 小时后，默认覆盖；即使不存在路由，`cron.failureAlert` 对象也会显式地使用 activates/tunes 策略。已退役的 `cron.failureDestination` 块由 [`openclaw doctor --fix`](/cli/doctor) 合并到其中。

- `enabled`：显式启用或禁用全局策略。 `false` 禁用继承的通知，除非作业有自己的 `failureAlert` 对象； `true` 显式全局启用。省略它会保留路由支持的默认值。
- `after`：触发告警前所需的连续失败次数（正整数，最小值：`1`；默认值：`2`）。
- `cooldownMs`：同一任务重复告警之间的最小毫秒数（非负整数；默认值：`3600000`）。
- `includeSkipped`：将连续跳过的运行计入告警阈值（默认：`false`）。跳过的运行会单独跟踪，不会影响执行错误退避。
- `mode`：投递模式——`"announce"` 通过频道消息发送；`"webhook"` 将请求发送到 `to` 中的目标。目标数据足够时，默认为 `"announce"`。
- `channel`：播报投递的频道覆盖值。`"last"` 会复用最后一个已知的投递频道。
- `to`：显式的播报目标或 webhook URL。使用 webhook 模式时必需。
- `accountId`：可选帐户或通道 ID，用于确定警报传送范围。
- Route 优先级是每个作业 `failureAlert` 路由字段，然后是每个作业 `delivery.failureDestination` 分层在这些全局目标字段上，然后是主要公告目标。
- Per-job `failureAlert: false` 禁用该作业的执行和所需交付失败警报；自动禁用安全通知保持活动状态。任何每个作业 `failureAlert` 对象都会显式启用和调整该作业。
- `delivery.bestEffort: true` 抑制 inherited/default 执行警报；明确的每个作业 `failureAlert` 仍然具有权威性。
- 必需的完成传递失败（`status: "ok"`、`completionStatus: "failed"`）不会增加执行退避，并且可能仅通过已解决的备用故障目标（而不是失败的主路由）立即通知。
- `delivery.failureDestination` 仅支持 `sessionTarget="isolated"` 的任务，除非该任务的主要 `delivery.mode` 为 `"webhook"`。

请参阅 [Automations](/automation/cron-jobs)。 Cron 记录隔离的自动化运行历史记录。

## <a id="media-model-template-variables"></a> 媒体模型模板变量

在 `tools.media.models[].args` 中展开的模板占位符：

| 变量                    | 描述                                       |
| --------------------------- | ------------------------------------------------- |
| `{{Body}}`                  | 完整的入站消息正文                         |
| `{{RawBody}}`               | 原始主体（无 history/sender 包装纸）             |
| `{{BodyStripped}}`          | 去除群组提及后的正文                 |
| `{{From}}`                  | 发送者标识符                                 |
| `{{To}}`                    | 目标标识符                            |
| `{{MessageSid}}`            | 频道消息ID                                |
| `{{SessionId}}`             | 当前会话 UUID                              |
| `{{IsNewSession}}`          | 创建新会话时为 `"true"`                 |
| `{{AttachmentUrl}}`         | 当前附件 URL 或提供商引用      |
| `{{AttachmentPath}}`        | 当前附件的本地路径                     |
| `{{AttachmentContentType}}` | 当前附件的 MIME 内容类型              |
| `{{AttachmentDir}}`         | 包含 `AttachmentPath` 的目录             |
| `{{AttachmentIndex}}`       | 从零开始的源事实索引                      |
| `{{Transcript}}`            | 音频转录文本                                  |
| `{{Prompt}}`                | CLI 条目的已解析媒体提示词             |
| `{{MaxChars}}`              | CLI 条目的已解析最大输出字符数         |
| `{{ChatType}}`              | `"direct"` 或 `"group"`                           |
| `{{GroupSubject}}`          | 群组主题（尽力获取）                       |
| `{{GroupMembers}}`          | 群组成员预览（尽力获取）               |
| `{{SenderName}}`            | 发送者显示名称（尽力获取）                 |
| `{{SenderE164}}`            | 发送者电话号码（尽力获取）                 |
| `{{Provider}}`              | 提供商提示（whatsapp、telegram、discord 等） |

旧版的 `{{MediaPath}}`、`{{MediaUrl}}`、`{{MediaType}}` 和 `{{MediaDir}}` 名称在插件 SDK 兼容期内仍然可用，但已弃用。新配置应使用 `Attachment*` 变量。

---
