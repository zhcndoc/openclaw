---
summary: "Structured reply controls， approval event metadata， and exec approval prompts"
read_when:
  - "在 Matrix 客户端中呈现按钮或选择列表"
  - "通过 Matrix 提供执行批准"
title: "Matrix 丰富的消息和批准"
sidebarTitle: "丰富的消息"
---

结构化内容 OpenClaw 附加到 Matrix 事件，以及基于其构建的批准提示。

## <a id="reply-controls-and-presentations"></a> 回复控件和演示文稿

代理回复中的按钮和选择列表包括 `com.openclaw.presentation` 下的可读后备文本和结构化内容。股票Matrix 客户展示文字； OpenClaw-aware 客户端可以呈现结构化控件。仅包含控件的回复仍会生成房间消息。

对于带有多个附件的回复，第一个事件携带控件。流式回复将其保留在最终编辑中。当表格或图表无法以本机方式呈现时，将保留编写的文本后备。

## <a id="approval-metadata"></a> 审批元数据

Matrix 本机批准提示是正常的 `m.room.message` 事件，在 `com.openclaw.approval` 密钥下具有 OpenClaw- 特定内容。 Stock 客户端仍然渲染文本主体； OpenClaw-aware 客户端可以读取结构化审批 ID、种类、状态、决策和 exec/plugin 详细信息。

当提示对于一个 Matrix 事件来说太长时，OpenClaw 会对可见文本进行分块，并仅将 `com.openclaw.approval` 附加到第一个块。 Allow/deny 反应绑定到第一个事件，因此长提示保持与单事件提示相同的批准目标。

### <a id="self-hosted-push-rules-for-quiet-finalized-previews"></a> 用于静默最终化预览的自托管推送规则

`streaming.mode: "quiet"` 仅在一个块或一轮内容完成定稿后才通知接收者——每个用户的推送规则必须匹配已完成的预览标记。完整配置请参见 [Matrix 静默预览的推送规则](/channels/matrix-push-rules)。

## <a id="exec-approvals"></a> Exec 批准

Matrix 可以作为原生批准客户端使用。请在 `channels.matrix.execApprovals` 下配置（或者为每个账户在 `channels.matrix.accounts.<account>.execApprovals` 下覆盖）：

- `enabled`：通过Matrix-native提示下达审批。一旦可以解析至少一个审批者，则取消设置或 `"auto"` 自动启用；将 `false` 设置为显式禁用。
- `approvers`：Matrix 用户 ID （`@owner:example.org`） 允许批准 exec 请求。回落至 `channels.matrix.dm.allowFrom`。
- `target`：提示所在的位置。 `"dm"`（默认）发送给审批者DM； `"channel"` 发送至始发房间或DM； `"both"` 发送给两者。
- `agentFilter` / `sessionFilter`：agents/sessions 触发 Matrix 传送的可选允许列表。

不同批准类型的授权略有差异：

- **Exec 和系统代理批准** 使用 `execApprovals.approvers`，回退到 `dm.allowFrom`。
- **插件批准** 仅通过 `dm.allowFrom` 授权。

所有三种类型共享 Matrix 反应快捷方式和消息更新，包括从持久状态恢复的反应目标。审批者可以在主要审批消息上看到反应快捷方式：

- ✅ 仅允许一次
- ❌ 拒绝
- ♾️ 始终允许（当有效 exec 策略允许时）

备用斜杠命令：`/approve <id> allow-once`、`/approve <id> allow-always`、`/approve <id> deny`。

只有已解析出的批准者才能批准或拒绝。用于 exec 批准的频道投递会包含命令文本——仅在受信任的房间中启用 `channel` 或 `both`。

相关：[Exec 批准](/tools/exec-approvals)。
