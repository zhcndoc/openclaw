---
summary: "网桥或网关重启后拆分发送 DM 合并和自动入站恢复"
read_when:
  - "调试命令及其 URL 两轮到达"
  - "了解网关关闭时发送的消息会发生什么情况"
title: "iMessage 消息行为"
sidebarTitle: "消息行为"
---

在客服人员看到入站 iMessage 之前，OpenClaw 对它们执行的操作。

<a id="coalescing-split-send-dms-command--url-in-one-composition"></a>

## <a id="coalescing-split-send-dms-(command-%2B-url-in-one-composition)"></a><a id="coalescing-split-send-dms-command-+-url-in-one-composition"></a> 合并分流发送 DM（命令 + URL 为一个组合）

Apple 可以将一个命令及其 URL 预览存储为两条独立的物理 `chat.db` 记录。`imsg` 0.13.1 及更新版本会在 watch、history 或 search 返回消息之前将这些记录合并，因此 OpenClaw 会收到一条逻辑上的入站消息，而不会增加特定于频道的 DM 延迟。

不需要 iMessage 合并设置。已废弃的 `channels.imessage.coalesceSameSenderDms` 键会被 `openclaw doctor --fix` 删除。当你有意想跨频道批量处理快速文本消息时，仍可使用通用的 `messages.inbound` 去抖动（debounce）设置。

如果命令加 URL 的发送以分开的 agent turn 到达，请在 Messages Mac 上更新 `imsg`：

```bash
brew update && brew upgrade imsg
```

## <a id="inbound-recovery-after-a-bridge-or-gateway-restart"></a> 桥接器或网关重启后的入站恢复

iMessage 会恢复网关宕机期间遗漏的消息，同时抑制 Apple 在 Push 恢复后可能冲刷出来的过时“积压弹”。默认行为始终开启，基于持久化入站记录和年龄防线实现。

- **持久化重放保护。** 在推进恢复游标之前，OpenClaw 会将共享 SQLite 入站队列中的每一条原始行以其 Apple GUID 作为事件 ID 写入日志。完成的行会保留一份约 4 小时的墓碑记录，最多 10,000 条，因此即使重启后，具有相同 GUID 的重放也会被丢弃。待处理的行会一直可恢复，直到调度器接管它为止。
- **停机恢复。** 启动时，监视器会记住最后一个持久承认的 `chat.db` rowid（持久的每帐户游标）并将其作为 `since_rowid` 传递到 `imsg watch.subscribe`，因此 imsg 重播尚未记录的行，然后尾巴活了。从 SQLite 崩溃恢复之前记录的行。重播仅限于最近的 500 行和长达约 2 小时的消息，并且 GUID 墓碑会丢弃所有已处理的内容。
- **过时积压年龄防线。** 启动边界之上的行是真正的实时消息；其中发送时间比到达时间早超过约 15 分钟的，属于 Push 冲刷形成的积压，会被抑制。被重放的行（位于边界处或边界之下）则使用更宽的恢复窗口，因此最近遗漏的消息会被投递，而更久远的历史不会。

恢复机制同时适用于本地和远程 `cliPath`，因为 `since_rowid` 重放通过同一个 `imsg` RPC 连接运行。区别在于窗口：当网关能够读取 `chat.db`（本地）时，它会锚定启动时的行号边界，限制重放跨度，并投递最多几小时前遗漏的消息；通过远程 SSH `cliPath` 时则无法读取数据库，因此重放不设上限，所有行都使用实时年龄防线——它仍会恢复最近遗漏的消息，也仍会抑制旧积压，只是使用更窄的实时窗口。要获得更宽的恢复窗口，请在 Messages 所在的 Mac 上运行网关。

### <a id="operator-visible-signal"></a> 运维可见信号

被抑制的积压会按默认级别记录日志，不会静默丢弃（`recovery` 标志会显示当前使用了哪个窗口）：

```text
imessage: suppressed stale inbound backlog account=<id> sent=<iso> recovery=<bool> (<N> suppressed since start)
```

### <a id="migration"></a> 迁移

`channels.imessage.catchup.*` 已弃用——停机恢复是自动的，新配置无需任何设置。现有配置中 `catchup.enabled: true` 仍会作为兼容性配置保留，用于恢复重放窗口。已禁用的 catchup 块（`enabled: false` 或未设置 `enabled: true`）已退役；`openclaw doctor --fix` 会将其移除。
