---
doc-schema-version: 1
summary: "命令梯子和修复不触发或不交付的作业"
read_when:
  - "自动化未在预定时间触发"
  - "作业已运行，但聊天中没有任何内容"
  - "诊断时区或会话翻转意外"
title: "自动化故障排除"
sidebarTitle: "故障排查"
---

预定作业的命令阶梯和常见故障形状。 [Automations](/automation/cron-jobs) 指南的一部分。

## <a id="troubleshooting"></a> 故障排查

### <a id="command-ladder"></a> 命令序列

```bash
openclaw status
openclaw gateway status
openclaw automations status
openclaw automations list
openclaw automations runs <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
openclaw doctor
```

<AccordionGroup>
  <Accordion id="automations-not-firing" title="自动化不触发">
    - 检查网关启动环境中的`cron.enabled`配置设置和`OPENCLAW_SKIP_CRON`。要么可以禁用自动运行；清除这两个禁用设置并重新启动网关以启用调度。
    - 确认网关持续运行。
    - 使用 `openclaw automations list --all` 查找禁用的作业，使用 `openclaw doctor` 检查记录的自动禁用原因，包括终端一次性执行失败。在运行 `openclaw automations enable <jobId>` 之前修复原因。操作员取消和重新启动中断在运行历史记录中仍然可见，但不会增加连续故障、触发故障警报或自动修复，或记录自动禁用。在 Webhook 传递中断之前完成的作业失败仍然有效。被打断的一次性任务将保持禁用状态，以避免重播不确定的工作；重复作业仍保持启用状态，现有的错误回退仍然适用。
    - 对于 `cron` 计划，验证时区（`--tz`）是否与主机时区一致。
    - 如果运行输出中出现 `reason: not-due`，表示已通过 `openclaw automations run <jobId> --due` 检查手动运行，但任务尚未到执行时间。
    - 如果无法解析作业的执行代理，自动和手动尝试会记录失败的任务以及跳过的运行历史记录条目及其原因。选择 `openclaw automations edit <jobId> --agent <id>` 的代理。
    - `Automation has no recorded inference account` 表示旧作业尚未采用存储帐户。运行 `openclaw doctor --fix`：它备份 cron 状态并记录作业运行将使用的帐户（显式选择，或正常帐户顺序中的第一个帐户），而不固定继承模型或更改后备。当有多个账户符合资格时，Doctor 会列出其他账户；如果该帐户不可用或为个人帐户，Doctor 会指定该作业和所需的操作。授权操作员可以使用 `openclaw automations edit <jobId> --model <provider/model>@<profileId>` 明确选择所需的配置文件。环境或提供程序配置密钥上的作业会保留该密钥并且不需要采用；一旦存储的帐户符合资格，它就会停止而不是切换。拒绝会结束运行而不尝试后备模型。 CLI-native登录和配置的无凭证推理不需要采用主机配置文件；未绑定的 CLI 作业无法选择或自动借用作业。 Doctor 不会从运行历史记录中的最后一个模型推断历史帐户所有权。
    - A run 可以在 exec 调用失败且代理回复后完成 `ok`。查看运行历史记录中的`openclaw automations show <jobId>`或`diagnostics`中的`diagnostic:`；未解决的执行失败会产生警告，但不会公开命令参数。
    - `handler-unavailable`表示心跳服务在等待过程中未注册或停止。该尝试被记录为已跳过。在重试作业之前检查网关启动和 sidecar 错误。
    - 如果上限作业的存储命名创建者帐户不可用，则在 model/tool 执行之前运行会失败。作业详细信息、运行历史记录和警告日志为帐户命名。将其重新添加到通道配置中，或从预期帐户重新创建自动化；更改交付 `--account` 不会更改创建者权限。没有帐户元数据的旧作业保留其现有的执行策略。

  </Accordion>
  <Accordion id="job-fired-but-no-delivery" title="工作被解雇但没有送货">
    - `System event queue is full` 表示会话已有 20 个待处理事件。 OpenClaw 保留这些已接受的事件并将溢出的提醒记录为失败的运行，而不是删除较旧的提醒。让会话处理其待处理事件，然后使用 `openclaw automations run <jobId>` 重试失败的提醒。如果心跳暂停，请使用 `openclaw system heartbeat enable` 启用它们。待处理的系统事件是进程本地的，而不是网关重新启动后的持久传送收据。
    - 送达模式为 `none` 表示不会预期由运行器进行回退发送。如果聊天路由可用，代理仍可以通过 `message` 工具直接发送。
    - 递送目标 missing/invalid （`channel`/`to`） 表示出站被跳过。
    - 对于 Matrix，具有小写 `delivery.to` 房间 ID 的复制或旧作业可能会失败，因为 Matrix 房间 ID 区分大小写。将作业编辑为 Matrix 中的确切 `!room:server` 或 `room:!room:server` 值。
    - 频道身份验证错误（`unauthorized`、`Forbidden`）表示凭据阻止了送达。
    - 当调度程序记录有意抑制、作业状态、运行历史记录和已完成事件时，包括`deliverySuppressionReason`（`empty`、`silent`、`heartbeat`或`channel_transform`）。这与 `lastDeliveryError` / `deliveryError` 是分开的；所需的交付失败也会在发生时记录错误。
    - 对于纯文本的独立公告，只有修剪为大写 `NO_REPLY` 的完整结尾会抑制文本和后备排队摘要。小写、换行形式和尾随标记仍然可见。有关引导线形式和媒体行为，请参阅 [ 无提示令牌抑制 ](/cli/cron#silent-token-suppression)。
    - 如果代理应向用户本身发送消息，请检查作业是否具有可用的路由（带有先前聊天的 `channel: "last"`，或显式的 channel/target）。

  </Accordion>
  <Accordion id="automations-or-heartbeat-appear-to-prevent-new-style-rollover" title="自动化或心跳似乎可以防止/新型翻转">
    - 每日重置和空闲重置的新鲜度并非基于 `updatedAt`；请参阅[会话管理](/concepts/session#session-lifecycle)。
    - 自动化唤醒、心跳运行、执行通知和网关簿记可能会更新 routing/status 的会话行，但它们不会扩展 `sessionStartedAt` 或 `lastInteractionAt`。
    - 对于在这些字段存在之前创建的旧行，OpenClaw 可以在文件仍然可用时从记录 JSONL 会话标头恢复 `sessionStartedAt`。没有 `lastInteractionAt` 的旧空闲行使用恢复的开始时间作为其空闲基线。

  </Accordion>
  <Accordion id="timezone-gotchas" title="时区问题">
    - 不带 `--tz` 的 Cron 表达式使用网关主机的时区。
    - 不带时区的 `at` 计划将按 UTC 处理。
    - 心跳 `activeHours` 使用配置的时区解析结果。

  </Accordion>
</AccordionGroup>
