---
summary: "重复 async exec 完成注入的调查笔记"
read_when:
  - 调试重复的 node exec 完成事件
  - 处理 heartbeat/system-event 去重
title: "Async exec 重复完成调查"
---

## 范围

- Session: `agent:main:telegram:group:-1003774691294:topic:1`
- 症状：同一个 session/run `keen-nexus` 的 async exec 完成在 LCM 中被记录了两次，作为 user turns。
- 目标：判断这更可能是重复的 session 注入，还是普通的 outbound delivery 重试。

## 结论

最可能的是 **重复的 session 注入**，而不是纯粹的 outbound delivery 重试。

最强的 gateway 侧缺口在 **node exec 完成路径**：

1. node 侧 exec 结束会发出带完整 `runId` 的 `exec.finished`。
2. Gateway `server-node-events` 将其转换为 system event，并请求 heartbeat。
3. heartbeat 运行将已排空的 system event block 注入 agent prompt。
4. 嵌入式 runner 将该 prompt 持久化为 session transcript 中新的 user turn。

如果同一个 `exec.finished` 因为任何原因（重放、重连重复、上游重复发送、重复 producer）对同一个 `runId` 到达 gateway 两次，OpenClaw 目前在这条路径上**没有基于 `runId`/`contextKey` 的幂等检查**。第二份会变成第二条相同内容的 user message。

## 精确代码路径

### 1. Producer：node exec 完成事件

- `src/node-host/invoke.ts:340-360`
  - `sendExecFinishedEvent(...)` 发出 `event` 为 `exec.finished` 的 `node.event`。
  - payload 包含 `sessionKey` 和完整 `runId`。

### 2. Gateway 事件接入

- `src/gateway/server-node-events.ts:574-640`
  - 处理 `exec.finished`。
  - 构建文本：
    - `Exec finished (node=..., id=<runId>, code ...)`
  - 通过以下方式入队：
    - `enqueueSystemEvent(text, { sessionKey, contextKey: runId ? \`exec:${runId}\` : "exec", trusted: false })`
  - 立刻请求唤醒：
    - `requestHeartbeatNow(scopedHeartbeatWakeOptions(sessionKey, { reason: "exec-event" }))`

### 3. System event 去重薄弱点

- `src/infra/system-events.ts:90-115`
  - `enqueueSystemEvent(...)` 只抑制 **连续重复文本**：
    - `if (entry.lastText === cleaned) return false`
  - 它保存了 `contextKey`，但**没有**使用 `contextKey` 做幂等判断。
  - drain 之后，重复抑制会重置。

这意味着，带有相同 `runId` 的 replayed `exec.finished` 之后仍然可以再次被接受，即使代码里已经有一个稳定的幂等候选项（`exec:<runId>`）。

### 4. Wake 处理不是主要重复源

- `src/infra/heartbeat-wake.ts:79-117`
  - wake 会按 `(agentId, sessionKey)` 合并。
  - 对同一目标的重复 wake 请求会折叠为一个待处理 wake 条目。

这使得 **仅靠重复 wake 处理** 的解释弱于重复事件接入。

### 5. Heartbeat 消费事件并将其变成 prompt 输入

- `src/infra/heartbeat-runner.ts:535-574`
  - 预检会查看 pending system events，并对 exec-event runs 分类。
- `src/auto-reply/reply/session-system-events.ts:86-90`
  - `drainFormattedSystemEvents(...)` 会清空该 session 的队列。
- `src/auto-reply/reply/get-reply-run.ts:400-427`
  - 排空后的 system event block 会被预置到 agent prompt body 中。

### 6. Transcript 注入点

- `src/agents/pi-embedded-runner/run/attempt.ts:2000-2017`
  - `activeSession.prompt(effectivePrompt)` 将完整 prompt 提交给 embedded PI session。
  - 这就是 completion 派生出的 prompt 变成持久化 user turn 的位置。

因此，一旦同一个 system event 被两次重建进 prompt，就会出现重复的 LCM user messages。

## 为什么纯 outbound delivery 重试不太可能

heartbeat runner 中确实存在真实的 outbound failure 路径：

- `src/infra/heartbeat-runner.ts:1194-1242`
  - 先生成 reply。
  - 后续再通过 `deliverOutboundPayloads(...)` 进行 outbound delivery。
  - 这里失败会返回 `{ status: "failed" }`。

不过，针对同一个 system event 队列项，这**不足以**解释重复的 user turns：

- `src/auto-reply/reply/session-system-events.ts:86-90`
  - system event 队列在 outbound delivery 之前就已经被 drain 了。

所以，仅靠 channel send retry 本身不会重新创建同一个已排队事件。它可以解释外部交付缺失/失败，但不能单独解释第二条相同的 session user message。

## 次要、低置信度的可能性

agent runner 中存在完整 run 重试循环：

- `src/auto-reply/reply/agent-runner-execution.ts:741-1473`
  - 某些瞬时失败会重试整个 run，并重新提交相同的 `commandBody`。

如果在重试条件触发前 prompt 已经被追加，这可能会在**同一次 reply 执行**中重复持久化一个 user prompt。

我把它排在重复 `exec.finished` 接入之后，原因是：

- 观察到的间隔约为 51 秒，看起来更像第二次 wake/turn，而不是进程内重试；
- 报告已经提到重复的消息发送失败，这更像是一个独立的后续 turn，而不是立即的 model/runtime 重试。

## 根因假设

最高置信度假设：

- `keen-nexus` 的 completion 经过了 **node exec event 路径**。
- 同一个 `exec.finished` 被两次送达 `server-node-events`。
- Gateway 接受了两次，因为 `enqueueSystemEvent(...)` 没有按 `contextKey` / `runId` 去重。
- 每次接受都会触发 heartbeat，并作为 user turn 注入 PI transcript。

## 建议的最小外科式修复

如果要修复，最小且高价值的改动是：

- 让 exec/system-event 幂等性在短时间窗口内尊重 `contextKey`，至少对精确的 `(sessionKey, contextKey, text)` 重复进行处理；
- 或者在 `server-node-events` 里为 `exec.finished` 增加专门的去重，按 `(sessionKey, runId, event kind)` 键控。

这样可以在 replayed `exec.finished` 变成 session turn 之前直接拦截它们。

## 相关

- [Exec 工具](/tools/exec)
- [Session 管理](/concepts/session)
