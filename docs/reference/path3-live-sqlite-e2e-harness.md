---
summary: "Path 3 SQLite 会话/转录切换的 live Gateway 证明设计"
read_when:
  - 你正在针对一个 live Gateway 证明 Path 3 SQLite 存储切换
  - 你需要区分预期的 legacy JSONL 漂移与运行时故障
  - 你正在构建或审查由 agent 驱动的 live SQLite E2E harness
title: "Path 3 live SQLite E2E harness"
---

Path 3 live SQLite E2E harness 证明 Gateway 正在使用 SQLite 作为权威的会话和转录存储，同时 legacy JSONL 文件仍然只是迁移输入或归档材料。它是一个维护者证明 harness，而不是普通用户的诊断工具。

在 Gateway 处理完迁移后的流量之后，legacy JSONL 一致性不再是有效的运行时健康信号。一个健康的已迁移 Gateway 可能会有与 legacy JSONL 计数不同的 SQLite 转录行，因为新的 turn 应该只推进 SQLite。因此，live harness 必须在每个步骤衡量 Gateway 行为、SQLite 行移动、legacy 文件静默状态以及日志健康状况。

## 命令形状

预期的实时命令是：

```bash
node scripts/path3-live-sqlite-e2e.mjs \
  --url http://127.0.0.1:18789 \
  --agent main \
  --session-key agent:main:path3-live-e2e:<timestamp> \
  --json
```

该命令连接到一个已经运行的 Gateway。除非后来添加了显式的迁移模式，否则它不会启动、停止、导入或重新运行迁移。CI 或隔离的本地变体可以使用
`test/helpers/openclaw-test-instance.ts`，但实时验证路径应该检查
实际的 operator Gateway 及其真实的按代理划分的 SQLite 数据库。

## 独立的 built-CLI 证明

built-CLI 证明运行器会种子化一个隔离的旧版会话存储，启动重建后的 Gateway，并证明启动时会将热的旧版会话导入到 SQLite 中，然后才开始运行时读取。它在第一次启动 Gateway 之前，绝不能运行 `openclaw doctor --fix`，因为那样证明的是手动迁移路径，而不是用户在功能切换后首次启动时收到的升级路径。

在启动导入之后，隔离证明可以运行 `openclaw doctor --session-sqlite inspect` 和 `openclaw doctor --session-sqlite validate` 作为诊断证据。这些 doctor 命令不是启动升级证明的迁移驱动器。单独的 doctor 导入场景应当种子化旧版 transcript 文件以及 trajectory sidecar，并验证 doctor 会在 SQLite 仍然作为权威来源时归档这些工件。

## 预检

Preflight 会收集基线，并在发送 proof turn 之前失败，如果
Gateway 不可用：

- `GET /health` 和 Gateway 深度状态必须报告一个正在运行、可访问的
  Gateway。
- CLI 和 Gateway 版本必须与正在测试的分支匹配。
- harness 会为当前 Gateway 文件日志记录一个日志游标。
- harness 会为每个 agent 记录 SQLite 表计数，涉及 `sessions`、
  `session_entries`、`transcript_events`、`transcript_event_identities` 和
  `session_routes`。
- harness 会记录 `sessions.json`、引用的 JSONL 文件以及候选 proof-session JSONL
  路径的 `mtime`、`size` 和存在性。
- `lsof -p <gateway-pid>` 必须显示 SQLite DB/WAL/SHM 句柄，并且没有正在使用的
  `.jsonl` 或 `sessions.json` 句柄。

`openclaw doctor --session-sqlite validate` 在 live 模式下仅用于信息参考。  
在 post-flip 流量之后，它可能会针对旧文件报告预期的漂移。  
harness 应使用 doctor 的输出进行分类和迁移清单整理，而不是把它作为运行时的通过/失败判定标准。

## 代理驱动场景

实时场景使用专用的证明会话密钥，并在可能的情况下通过公共 RPC 路径驱动 Gateway。一次代理轮次就应足以
验证普通持久化，但完整证明应覆盖此前需要单独实时检查的 3.1b 断点：

- 普通聊天轮次：创建或复用证明会话，发送一个真实的代理
  提示，等待最终的助手结果，并验证 `chat.history` 或
  等效的 Gateway 投影。
- 转录标识：验证相同的标记同时出现在 Gateway 历史和
  SQLite 转录行中，包括在存在时稳定的事件标识行。
- 会话元数据访问器：通过 Gateway/会话访问器读取证明会话和选定的现有实时会话，并将它们与 SQLite 行进行比较。
- 会话补丁投影：对证明会话应用一次可逆的模型/会话元数据变更，然后验证投影后的行与 Gateway 响应一致。
- 压缩检查点生命周期：仅在证明会话或由 harness 创建的合成 fixture 会话上列出、分支和恢复一个检查点。
- 重启恢复：针对受控的证明会话或隔离的测试实例运行安全恢复标记路径；只有当目标会话集合明确且可逆时，实时模式才可以运行此步骤。
- 清理生命周期：删除或重置证明会话，然后验证 SQLite 生命周期行和已归档的转录状态。

不能在实时 operator Gateway 上安全执行的、与传输相关的断点，例如 WhatsApp 或语音通话入口，应使用针对同一 SQLite 协议的所有者级运行时探针，而不是伪造外部传输。

## 每步断言

每一步都会在前后状态进行快照，并写入一条结构化断言记录：

- SQLite 行数仅在预期的位置发生增长。
- 对于记录运行时事件的、由标记支持的证明会话，轨迹运行时行数会发生增长。
- 证明会话行具有预期的 `session_id`、状态、时间戳、元数据和路由行。
- Gateway 历史/会话投影与 SQLite 转录尾部一致。
- 不会创建或修改任何证明会话 JSONL 文件。
- 不会创建任何证明会话的 `.trajectory.jsonl`、`.trajectory-path.json`，或由标记派生的 `trajectory/<session>.jsonl` 侧车文件。
- 除非该步骤明确是离线迁移或归档操作，否则现有的旧版 JSONL 文件和 `sessions.json` 保持不变。
- Gateway 进程不会打开 `.jsonl` 或 `sessions.json` 句柄。
- 自上一游标以来的日志中不包含 `ERROR`、`FATAL`、`SQLITE_`、`no such column`、session-store unavailable、restart-recovery failure 或 transcript-reconcile warning，除非场景明确将其列入白名单。

日志扫描是通过/失败契约的一部分。一个能够响应健康检查但又输出 SQLite 模式错误或重复的转录协调失败的 Gateway，不属于 Path 3 的绿色状态。

## 证据工件

harness 应该将证据写入 `.artifacts/path3-live-e2e/<timestamp>/`
并将其排除在 git 之外：

- `summary.json`：命令参数、Gateway 版本、结果、失败的断言，以及
  工件路径。
- `sqlite-before.json` 和 `sqlite-after.json`：行数统计和选定的证明
  行。
- `legacy-files.json`：旧版文件是否存在、`mtime`、大小，以及每个
  文件是否发生变化。
- `gateway-log-scan.json`：游标范围、匹配到的日志行，以及允许列表
  决策。
- `events.jsonl`：按步骤排序的观察记录，适合用于 PR 证明评论。

PR 证明应当对这些工件进行总结，而不是粘贴完整的
转录内容或私人消息内容。

## 安全规则

- 实时模式在 Gateway 运行时绝不能重新导入旧版 JSONL。
- 实时模式不得修改非证明会话，除非是明确选择的、可逆的修复探测。
- 任何破坏性或大范围迁移步骤都需要先为受影响的 SQLite DB 和旧版会话目录创建新的备份。
- 备份应限定在所涉及的 agent DB/会话目录范围内，并在一次证明运行期间复用，以避免磁盘占用无限增长。
- 清理步骤必须不留下任何证明会话、证明 JSONL 或已修改的旧版文件，除非调用方传入 `--keep-artifacts`。

## 通过结果

通过的实时运行意味着 Gateway 接受了一个真实的 agent 驱动会话流，
所有观测到的规范状态都在 SQLite 中，旧版运行时文件保持
静止，并且在测量窗口内日志健康保持良好。这并不意味着
在实时流量之后旧版 JSONL 一致性仍然保持良好；一旦 SQLite 成为规范存储，实时漂移就是预期之中的。
