---
doc-schema-version: 1
summary: "WhatsApp QA 通道和真实传输通道使用的共享凸面凭证池。"
read_when:
  - "您正在运行 WhatsApp QA 通道"
  - "您正在从凸池租赁 QA 凭证"
title: "WhatsApp QA 和凭证"
---

## WhatsApp QA

```bash
pnpm openclaw qa whatsapp
```

目标是两个专用的 WhatsApp Web 账户：一个由 harness 控制的驱动账户，以及一个由子 OpenClaw gateway 通过捆绑的 WhatsApp 插件启动的被测账户（SUT）。

`--credential-source env` 时所需的环境：

- `OPENCLAW_QA_WHATSAPP_DRIVER_PHONE_E164`
- `OPENCLAW_QA_WHATSAPP_SUT_PHONE_E164`
- `OPENCLAW_QA_WHATSAPP_DRIVER_AUTH_ARCHIVE_BASE64`
- `OPENCLAW_QA_WHATSAPP_SUT_AUTH_ARCHIVE_BASE64`

可选项：

- `OPENCLAW_QA_WHATSAPP_GROUP_JID` 启用诸如 `whatsapp-mention-gating`、`whatsapp-group-pending-history-context`、 `whatsapp-broadcast-group-fanout`、`whatsapp-group-activation-always`、 `whatsapp-group-reply-to-bot-triggers`、群组 action/media/poll 场景， 以及 `whatsapp-group-allowlist-block` 等群组场景。

WhatsApp YAML 场景（`qa/scenarios/channels/whatsapp-*.yaml`）：

- 基线与群组 gating：`whatsapp-canary`、`whatsapp-pairing-block`、 `whatsapp-mention-gating`、`whatsapp-group-pending-history-context`、 `whatsapp-group-activation-always`、`whatsapp-group-reply-to-bot-triggers`、 `whatsapp-top-level-reply-shape`、`whatsapp-restart-resume`、 `whatsapp-group-allowlist-block`。
- 原生命令：`whatsapp-help-command`、`whatsapp-status-command`、 `whatsapp-commands-command`、`whatsapp-tools-compact-command`、 `whatsapp-whoami-command`、`whatsapp-context-command`、 `whatsapp-native-new-command`。
- 回复与最终输出行为：`whatsapp-tool-only-usage-footer`、 `whatsapp-reply-to-message`、`whatsapp-group-reply-to-message`、 `whatsapp-reply-to-mode-batched`、`whatsapp-reply-context-isolation`、 `whatsapp-reply-delivery-shape`、`whatsapp-stream-final-message-accounting`。
- 用户路径消息 action：`whatsapp-agent-message-action-react` 从一个真实的 driver DM 开始， 让模型调用 `message` 工具，并观察原生 WhatsApp reaction。`whatsapp-agent-message-action-upload-file` 使用相同的方式来处理 `message(action=upload-file)`，并观察原生 WhatsApp 媒体。 `whatsapp-group-agent-message-action-react` 和 `whatsapp-group-agent-message-action-upload-file` 在真实 WhatsApp 群组中证明了相同的用户可见行为。
- 群组 fanout：`whatsapp-broadcast-group-fanout` 从一条被提及的 WhatsApp 群组消息开始，并验证来自 `main` 和 `qa-second` 的不同可见回复。
- 群组激活：`whatsapp-group-activation-always` 将一个真实群组会话切换为 `/activation always`， 证明一条未提及的群组消息会唤醒 agent，然后恢复 `/activation mention`。 `whatsapp-group-reply-to-bot-triggers` 先播种一个 bot 回复， 再向其发送一条原生引用回复且不包含显式 mention，并验证 agent 会从该回复上下文中被唤醒。
- 入站媒体与结构化消息：`whatsapp-inbound-image-caption`、 `whatsapp-audio-preflight`、`whatsapp-inbound-structured-messages`、 `whatsapp-group-audio-gating`、`whatsapp-inbound-reaction-no-trigger`。 这些场景通过 driver 发送真实的 WhatsApp 图片、音频、文档、位置、联系人、 sticker 和 reaction 事件。
- 直接网关合约检查：`whatsapp-outbound-media-matrix`、`whatsapp-outbound-document-preserves-filename`、`whatsapp-outbound-poll`、`whatsapp-outbound-send-serialization`、`whatsapp-group-outbound-media`、`whatsapp-group-outbound-poll`、`whatsapp-message-actions`、`whatsapp-reply-context-isolation`、 `whatsapp-reply-delivery-shape`。这些绕过模型故意提示并证明可重复的 Gateway/channel、`send`、`poll` 和 `message.action` 合约。
- 访问控制覆盖：`whatsapp-access-control-dm-open`、 `whatsapp-access-control-dm-disabled`、`whatsapp-access-control-group-open`、 `whatsapp-access-control-group-disabled`、`whatsapp-group-allowlist-block`。
- 原生审批：`whatsapp-approval-exec-deny-native`、 `whatsapp-approval-exec-native`、`whatsapp-approval-exec-reaction-native`、 `whatsapp-approval-exec-group-reaction-native`、 `whatsapp-approval-plugin-native`。
- 状态 reaction：`whatsapp-status-reactions`、 `whatsapp-status-reaction-lifecycle`。

WhatsApp 默认值源自选定的分类配置文件和泳道约束。 `mock-openai` 通过真实的 WhatsApp 传输运行具有固定模型响应的合格场景，同时仅模拟模型输出； `live-frontier` 排除提供商或模型合同需要模拟通道的场景。

WhatsApp QA 驱动程序观察结构化实时事件（`text`、`media`、`location`、`reaction` 和 `poll`），并可以主动发送媒体、民意调查、联系人、位置和贴纸。 QA 实验室通过 `@openclaw/whatsapp/api.js` 包表面导入该驱动程序，而不是访问私有 WhatsApp 运行时文件。对于组观察，`fromJid` 是组 JID，而 `participantJid` 和 `fromPhoneE164` 标识参与者发送者。消息内容默认经过编辑。直接网关轮询、上传文件、媒体、组轮询、组媒体和回复形状检查是 transport/API 合同检查；它们不会被视为用户提示使代理选择相同操作的证据。用户路径操作证明来自 `whatsapp-agent-message-action-react` 和 `whatsapp-group-agent-message-action-react` 等场景，其中驱动程序发送正常的 WhatsApp 消息，QA 实验室观察生成的本机 WhatsApp 工件。 WhatsApp 场景详细信息包括每个场景的姿态（`user-path`、`direct-gateway` 或 `native-approval`），因此证据不能被误认为是比实际证明的更强大的合约。

WhatsApp 模块场景选择使用 `execution.config.whatsappScenario` 进行实现。在场景截止时间开始之前，适配器在流准备期间应用其配置并等待通道准备就绪。消极场景则观察其完全安静的窗口；配置和重新连接时间不会消耗该窗口。

输出工件：

- `qa-suite-report.md`
- `qa-suite-summary.json`
- `qa-evidence.json` - 实时传输检查的证据条目。

## <a id="convex-credential-pool"></a> 凸凭证池

Buzz、Discord、Slack、Telegram 和 WhatsApp 通道可以从共享凸池租用凭证，而不是读取 [Channel QA 参考 ](/concepts/qa-e2e-automation/channel-qa-reference) 中记录的每通道环境变量， [Slack QA](/concepts/qa-e2e-automation/slack-qa) 和 [WhatsApp QA](#whatsapp-qa)。通过`--credential-source convex`（或设置`OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）； QA 实验室获取独占租约，在运行期间对其进行检测，并在关闭时释放它。池类型为 `"buzz"`、`"discord"`、`"slack"`、`"telegram"` 和 `"whatsapp"`。

该套件在启动开始之前拥有其网关生命周期，包括打包的身份验证和插件修复命令、启动重试、替换进程以及针对活动网关运行的命令。每个 CLI 命令都有两分钟的执行限制。 Stop 立即关闭准入并结算所有拥有的进程组； Leader exit 不会绕过关闭或继承的 stdio 关闭的有限等待。在 POSIX 上，CLI 命令使用自己的进程组，因此并发命令不会替换活动网关的标识。 CLI 故障（包括超时、取消和流故障）保留通过关闭捕获的有界、经过编辑的 stderr 和 stdout。打包插件设置错误将 `update repair --help` 与 `update repair` 区分开来。

网关 RPC 呼叫仅在请求未发送时等待重新连接。发送后，将向场景报告丢失的连接，而无需重播请求：网关可能已经提交了该请求。场景代码必须在决定中断的操作是否可以安全重试之前检查结果状态。

传输适配器耗尽 `cleanup()` 中的驱动程序工作，并在 `cleanupAfterGatewayStop()` 中释放网关支持的凭据。仅当没有生成子进程或确认所有拥有的进程组已停止时，套件才会运行第二阶段。准备失败或退出组长并不能证明关闭。

失败的启动或替换会解决该过程，但不会最终确定其日志或暂存目录。调用者保留生命周期所有者并始终调用 `stop()`，包括启动拒绝后。该显式停止应用调用者的工件策略，因此故障报告可以在删除临时运行时状态之前保留经过清理的网关日志。

确认关闭后，成功导出（或选择不导出）会在临时状态删除之前完成工件策略。清理重试会保留该导出，而不重写它或使用以后的目标，而 RPC 和分段清理仍会重试。失败的导出仍然可以重试。未确认的停止刷新请求的快照，最终确认的快照包括稍后的输出。保持临时状态可使其日志可供稍后清理重试。

如果无法确认终止，套件会报告清理失败，保留运行时目录，并保留适配器的租约和心跳。在重用这些凭据之前，请检查报告的进程组和保留的运行时间。仍会报告日志、RPC 或工件错误，但不会阻止在确认进程组已停止时进行停止后清理。此顺序要求适配器使用两个清理阶段；在 QA 父级或主机丢失后，它不会更改代理 TTL 或提供持久保证。

临时运行时和暂存插件目录将被独立删除，并通过编辑的诊断报告清理失败。在删除运行时之前，QA 父级会关闭该根的身份验证读取器和代理数据库，在共享状态仍处于打开状态时释放其租约，然后关闭共享数据库。其他 QA 根保持不变。关闭失败会保留重试的运行时间，同时仍会尝试删除分阶段插件。因此，即使确认进程终止，清理错误也会在磁盘上留下孤立的运行时或身份验证状态。更正报告的问题并在保留的生命周期所有者上重试 `stop()`；确认终止仍然允许停止后凭证清理。

broker 在 `admin/add` 上验证的负载形状：

- Buzz (`kind: "buzz"`): `{ relayUrl: string, roomId: string, driverPrivateKey: string, sutPrivateKey: string, driverAuthTag?: string, sutAuthTag?: string }` - `relayUrl` 必须使用 `wss://`，仅当中继为回环中继时才允许使用 `ws://`；`roomId` 必须是频道 UUID，且身份必须彼此不同。
- Discord (`kind: "discord"`): `{ guildId: string, channelId: string,
  driverBotToken: string, sutBotToken: string, sutApplicationId: string,
  voiceChannelId?: string }`.
- Telegram (`kind: "telegram"`): `{ groupId: string, driverToken: string, sutToken: string }` - `groupId` 必须是数字形式的 chat-id 字符串。
- WhatsApp (`kind: "whatsapp"`): `{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }` - 电话号码必须是彼此不同的 E.164 字符串。

Slack泳道也可以使用泳池。 Slack 有效负载形状检查当前位于 Slack QA 运行器中，而不是代理中；使用 `{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`，通道 ID 为 Slack，如 `Cxxxxxxxxxx`。请参阅 [ 设置 Slack 工作区 ](/concepts/qa-e2e-automation/slack-qa#setting-up-the-slack-workspace) 以进行应用程序和范围配置。

操作环境变量和凸代理端点合约位于 [Testing → 通过 Convex](/help/testing/qa-runners#shared-telegram-credentials-via-convex-v1) 共享 Telegram 凭证（部分名称早于多通道池；租赁语义在各种类型之间共享）。
