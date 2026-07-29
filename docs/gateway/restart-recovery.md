---
summary: "网关重启或崩溃后会保留什么：中断的代理轮次会自动恢复，子代理和后台任务会恢复，排队的投递会继续处理"
read_when:
  - 你想了解重启网关是否会丢失正在进行中的代理工作
  - 某个代理运行在重启、崩溃或配置重新加载时被中断了
  - 你正在排查网关恢复后自动会话恢复的行为
title: "重启恢复"
---

Restarting the gateway does not lose agent state. Conversations, transcripts,
scheduled jobs, background task records, and queued outbound messages all live
on disk, and work that was interrupted mid-turn is detected and resumed
automatically after the gateway comes back up. Recovery is always on and
normally needs no manual intervention. Repeatedly failing recovery is bounded
and may quarantine one session until you inspect or replace it.

本页介绍了重启后哪些内容会保留、如何检测中断的工作，以及自动恢复看起来是什么样子。

## 重启后会保留什么

| 状态                         | 存储                                        | 重启后的行为                                                      |
| ----------------------------- | ------------------------------------------- | ----------------------------------------------------------------------- |
| Conversation history          | Per-agent SQLite database                   | Untouched; sessions continue from the stored transcript                 |
| Interrupted main-session turn | Per-agent SQLite session row and transcript | Automatically resumed or reconciled a few seconds after startup         |
| Subagent runs                 | SQLite (shared state database)              | Registry restored on boot; interrupted runs resumed                     |
| Background tasks              | SQLite (shared state database)              | Reconciled on boot; orphaned runs recovered or marked lost              |
| Queued outbound deliveries    | SQLite delivery queue                       | Drained after restart; undelivered replies are retried                  |
| Scheduled (cron) jobs         | SQLite cron store                           | Schedules persist; the scheduler re-arms on boot                        |
| Restart continuation          | SQLite restart sentinel                     | One-shot follow-up dispatched to the session that asked for the restart |

## 优雅重启会先进行排空

请求的重启（`openclaw gateway restart`、需要重启的配置变更，或网关更新）不会立即终止正在进行中的工作。网关会停止接受新的工作，然后等待活跃的代理回合和后台任务完成，最长等待一个排空预算（默认 5 分钟）。因此，大多数重启根本不会中断任何内容。

只有无法在排空预算内完成的工作（或任何被强制重启或崩溃中断的运行）才会被终止——并且在此之前，每个受影响的会话都会被标记为可恢复。

## 中断工作如何被检测

三个相互补充的机制会标记那些回合未能完成的会话：

- **At turn admission:** for an ordinary text turn on an existing main session,
  the gateway appends the user message, marks the session running, and records
  its recovery delivery claim in one SQLite transaction before model or
  `before_agent_reply` hook execution. Control UI does this before returning the
  `started` acknowledgement; channel dispatch does it when the prepared turn
  adopts the agent run.
  Commands, attachments, per-turn overrides, pending deliveries, prior abort
  hints, plugin-owned sessions, and turns with execution hooks keep their
  specialized admission paths.
  If a `before_agent_reply` hook is installed, admission also records its phase.
  Recovery never replays a hook interrupted mid-call. Once an unhandled hook
  finishes, its checkpoint records that result, but recovery still fails closed
  while that hook remains active: a checkpoint cannot prove that the same
  plugin code and configuration loaded after the restart. Handled text and
  silent results are checkpointed separately for deterministic settlement.
  Durable recovery claims written by older versions have no source-ownership
  marker, so they receive the same fail-closed hook check during an upgrade.
- **At shutdown:** during the restart drain, every session with an active run
  is stamped with a recovery marker in the session store before the run is
  aborted.
- **At startup:** the gateway scans session stores for sessions that still
  claim to be running but have no live owner in the new process. This catches
  hard crashes and kills where no shutdown code ran. Stale transcript lock
  files are cleaned up at the same time.

## 自动恢复

A few seconds after startup, the gateway re-dispatches each marked session
with a synthetic system message telling the agent its previous turn was
interrupted by a restart and to continue from the existing transcript. If a
final reply had already been produced but not delivered, its text is included
so the agent can deliver it instead of redoing the work.

Startup reconciliation retries transient failures up to three times with
exponential backoff. Separately, each interrupted main-session cycle has a
durable budget of three charged automatic dispatch attempts, retained across
gateway restarts. OpenClaw charges an attempt before dispatch, refunds it when
the gateway explicitly rejects the request before acceptance, and retains the
charge when a post-dispatch result is uncertain to avoid replaying work.
Foreground work that already owns the session keeps automatic recovery out
until that work settles.

After the durable budget is exhausted, the session is tombstoned instead of
looping forever. Inspect the failed session and use `/new` or `/reset` to start a
replacement. `openclaw doctor --fix` can repair a stale aborted flag that
conflicts with a tombstone, but it does not re-enable that recovery cycle.

Every retry reuses one durable dispatch identifier, so an ambiguous connection
failure cannot start the same recovery twice. Completed and unresumable Control
UI turns also retain bounded durable idempotency tombstones, allowing a
reconnecting outbox to retire them without re-executing the request.

Message-tool-only replies use a second durable correlation. Before a terminal
same-conversation send reaches the channel, the gateway records an unresolved
delivery intent on the exact session and source turn. A confirmed provider
success resolves it to a durable delivered receipt; a confirmed failure clears
it. Recovery completes a delivered receipt without rerunning tools. If a crash
leaves the provider outcome unknown, recovery fails closed instead of replaying
an external effect.

The delivered reply is also mirrored into the transcript with its source
message ID. Terminal mirrors use a distinct receipt key, so a progress send with
the same provider idempotency key cannot mask the terminal marker. Progress
sends and receipts from older turns cannot complete the current turn. Only
durable channel-ingress claims can restore message-action authority. A resumed
run keeps the original source-delivery mode and source correlation, including
requester identity and any same-channel/thread restriction, so the same receipt
remains authoritative even if another restart happens during recovery. A
message-tool-only turn without reconstructable channel authority is failed
closed and receives the one-time resend notice.

Before resuming, the gateway checks that the transcript tail is safe to
continue from. An aborted turn is the interruption itself, so it resumes on a
best-effort basis whatever abort detail the provider or worker recorded with it:
partial streamed text stays in the transcript and the continuation picks up from
the message beneath it, while a tool call left dangling is dropped from the next
provider payload and restricted to restart-safe tools unless it is audited
replay-safe. If the tail is genuinely unsafe (for example a provider failure, or
a turn that ended on a stale pending approval), the session is not blindly
re-run; the agent instead posts a short notice asking the user to resend the
last request. For WebChat, that notice is written directly to the session
history so it remains visible after reconnect.

OpenClaw can also reconstruct interrupted read-only [Code Mode](/tools/code-mode)
work. Code Mode marks these runs as restart-safe and rejects side-effecting
catalog or namespace tool calls before they execute. If a restart lands on
the `wait` control, the new gateway reconstructs the turn from its transcript
and forces the reconstructed execution to remain restart-safe even if the
model omits or clears that flag. The host filters the entire reconstructed
turn to audited read-only core tools and explicitly replay-safe plugin tools,
including when Code Mode is disabled after the restart. Side-effecting work
remains guarded by the resend notice rather than risking a duplicate write.

### 子代理

子代理运行会持久化到共享的 SQLite 状态数据库中，因此子代理注册表会随进程一同保留。启动时会恢复注册表，并携带原始任务上下文继续已中断的子代理会话。适用两个安全阀：

- 若运行在 2 小时之前被中断，则会直接完成归档而不是恢复，因此整夜停机的网关不会让过时的工作“复活”。
- 如果某个会话反复恢复失败，则会被标记为卡死并加上墓碑，以免恢复无限循环。

### 后台任务

[后台任务注册表](/automation/tasks) 由 SQLite 支持，并会在启动时以及定期周期内进行协调：已完成运行记录的持久化结果会被恢复，而其所属进程已消失的运行会在宽限期后被标记为丢失，而不是永远挂起。

### 代理请求的重启

当代理自身触发重启时（应用配置更改、更新网关，或显式重启请求），在进程退出前会先将一个重启哨兵写入 SQLite。启动后，网关会将结果回传到发起该操作的聊天，并派发一个一次性的续接回合，让代理在相同的频道和线程中，精确地从离开的地方继续。

The sentinel's typed SQLite columns are authoritative for restart handling;
its `payload_json` value is a replay/debug shadow only. Runtime reads, writes,
and clears SQLite state without a file fallback. During the storage cutover, a
bounded state migration runs at startup and through Doctor to preserve a
validated `restart-sentinel.json` left by the older process after an update.
The migration verifies the typed row and removes the source file before normal
restart handling continues.

## Safety valves and observability

- **Crash-loop breaker:** 3 unclean boots within 5 minutes trip a breaker that
  suppresses auto-start side services on the next boot, so a crashing gateway
  does not amplify itself. A later boot recovers once the unclean-boot window
  drains.

  When the breaker is tripped, the **control plane still starts**, but channel
  plugins (and other auto-started side services) stay down for the current boot
  unless an operator manually overrides the suppression. Automatic startup
  resumes on a later boot after the unclean-boot window drains. Gateway logs
  look like:
  `channel autostart suppressed by crash-loop breaker; refusing automatic
start for <channel>… Start a channel manually with: openclaw gateway call
channels.start --params '{"channel":"<id>"}'`

  Operator recovery SOP:

  1. Confirm the gateway process is up (`openclaw gateway status` / LaunchAgent
     or systemd unit still running). A “channel disconnected” symptom often
     means suppressed autostart, not a dead gateway.
  2. Inspect channel state: `openclaw channels status` (add `--probe` when
     useful). Look for stopped / not connected accounts while the gateway
     itself is healthy.
  3. Fix the root cause of the unclean boots (bad config, plugin crash on
     start, missing secrets) before forcing channels back up.
  4. Manually start a channel while suppression is active:

     ```bash
     openclaw gateway call channels.start --params '{"channel":"<id>"}'
     # optional: {"channel":"<id>","accountId":"<account>"}
     ```

     `channels.start` is a **manual** override; it does not disable the
     breaker for other channels.

  5. Or wait for the unclean-boot window to drain, then restart the gateway.
     The next boot logs whether channel auto-start is restored.

  See also [Gateway](/gateway) (safe mode paragraph) for the same control-plane
  vs channel-autostart split.

- **Main-session attempt budget:** three charged automatic dispatch attempts
  per interrupted cycle; exhaustion tombstones that session until it is
  inspected and replaced.
- **Metrics:** recovery activity is exported via
  [Prometheus](/gateway/prometheus) as `openclaw_session_recovery_total` and
  `openclaw_session_recovery_age_seconds`.
- **Logs:** recovery decisions are logged under the
  `main-session-restart-recovery` and `subagent-interrupted-resume`
  subsystems.

## 未恢复的内容

- Sessions excluded from main-session recovery because another owner already
  handles them: subagent sessions (subagent recovery), cron sessions (the
  scheduler re-runs on schedule), and ACP-managed sessions (the connected IDE
  or client owns the resume).
- Sessions whose transcript tail cannot be safely continued; these get the
  resend notice described above instead of a silent re-run.
- Work that was never admitted: messages arriving during the drain window are
  rejected with an explicit restart error rather than silently queued into a
  dying process.
- Standalone embedded turns cannot take over a main session with pending
  restart recovery because they do not share the gateway's lifecycle owner.
  Run the turn through the gateway or reset it there with `/new` or `/reset`.
