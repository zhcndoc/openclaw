---
summary: "用于归档属于某个会话的所有 SQLite 转录工件的 Path 3 方案"
read_when:
  - 你正在实现 clawdbot-d63.2 / clawdbot-04b
  - 你正在处理 SQLite 会话保留、重置、删除或代理删除归档
  - 你需要区分 SQLite 时代的工件家族与旧版 JSONL 侧车文件
title: "Path 3 SQLite 会话工件家族"
---

# Path 3 SQLite 会话工件家族

本说明将 `clawdbot-d63.2` 的范围限定在这里，而 `clawdbot-d63.1` 负责 `src/config/sessions/session-accessor.sqlite.ts` 中重叠的重置/删除归档辅助函数。该实现文件在本次处理期间处于脏状态，因此此工件在不与兄弟工作项抢占的情况下记录精确的契约和补丁点。

## 权威家族

在 SQLite 切换之后，活动会话转录本是 SQLite 行。一个会话的
归档家族包括：

- 该条目当前 `sessionId` 对应的 `transcript_events`、`transcript_event_identities` 和 `sessions` 行。
- `entry.compactionCheckpoints[*].preCompaction.sessionId` 引用的每个 `sessionId` 对应的相同 SQLite 转录本行集。
- `entry.compactionCheckpoints[*].postCompaction.sessionId` 引用的每个 `sessionId` 对应的相同 SQLite 转录本行集。
- `entry.usageFamilySessionIds` 中每个 `sessionId` 对应的相同 SQLite 转录本行集。

只归档那些不再被任何剩余 `session_entries` 行，或任何剩余条目的压缩或使用家族元数据引用的行。
这会在最后一个有效引用消失之前，保留检查点分支/恢复以及使用汇总状态。

## 翻转后的非家庭工件

生成的主题转录文件变体和轨迹 sidecar 并不是活动的
SQLite 运行时状态。它们是遗留的文件工件：

- 像 `<sessionId>-topic-<thread>.jsonl` 这样的主题变体仅存在于
  基于文件的转录格式中。SQLite 使用规范的 session id 加上
  `session_routes`/条目投递元数据，而不是按主题的 JSONL 文件。
- 像 `.trajectory.jsonl` 和 `.trajectory-path.json` 这样的轨迹 sidecar
  是根据真实的 JSONL `sessionFile` 路径命名的。SQLite 的 `sessionFile` 值是
  `sqlite:<agentId>:<sessionId>:<storePath>` 标记，不会命名 sidecar
  文件。
- Archive 层读取器必须继续读取遗留的已归档 JSONL 文件，但
  运行时保留不得扫描活动会话目录，也不得为 SQLite 会话重新打开 JSONL
  转录文件。

Doctor 导入仍然是遗留主 JSONL 文件及其相邻轨迹 sidecar 的迁移所有者。
运行时 SQLite 保留不应再添加第二个导入器或文件回退。

## 修补点

扩展 `clawdbot-d63.1` 中引入的 SQLite archive helper，而不是添加一条并行路径。

1. 在 `deleteSqliteSessionStateIfUnreferenced` 附近添加一个本地收集器：
   - `collectSqliteSessionArtifactFamily(entry: SessionEntry): Set<string>`
   - 包含 `entry.sessionId`、checkpoint 的前/后 session ids，以及 `usageFamilySessionIds`。
   - 过滤空字符串并进行确定性去重。

2. 为删除后的存储添加一个引用收集器：
   - `readReferencedSqliteSessionArtifactFamilyIds(database): Set<string>`
   - 遍历当前的 `session_entries`，解析每个 `entry_json`，并从每个仍然存在的条目中收集相同的 family ids。

3. 修改当前会归档单个被移除 `sessionId` 的 reset/delete/maintenance 调用方，改为传递被移除条目的完整 family。

4. 对于每个 family id，使用调用方的原因（`reset` 或 `deleted`）归档 SQLite transcript 行，然后仅在该 family id 不存在于删除后的引用集合中时删除 `sessions` 行。

5. 保持 transcript event deletion 通过现有的 SQLite session-row cleanup 路径集中处理。不要添加活跃的 JSONL 读取。

## 聚焦测试

在 `clawdbot-d63.1` 提交之后，向 `src/config/sessions/session-accessor.conformance.test.ts`
或相邻的生命周期测试中添加仅适用于 SQLite 的测试：

- 删除带有压缩前转录的条目时，会归档当前会话和压缩前会话，然后移除两组 SQLite 行。
- 删除两个共享同一压缩前会话的条目中的一个时，在最后一个引用该会话的条目被删除之前，不会对共享的压缩前会话归档任何内容。
- 删除带有 `usageFamilySessionIds` 的条目时，在没有其他条目引用该使用族时，会归档前驱 SQLite 转录行。
- 带有 SQLite 标记的 topic 形状会话键，不会触发任何生成的 topic JSONL 读取或 sidecar 查找。

聚焦验证应使用：

```bash
node scripts/run-vitest.mjs src/config/sessions/session-accessor.conformance.test.ts
```

Broad `pnpm` gates 应继续保留在 Crabbox/Testbox 上，适用于此 Codex 工作区。
