---
summary: "在保持配置文件存储的同时，将 SQLite 作为主要持久化状态和缓存层的迁移计划"
title: "以数据库为首选的状态重构"
doc-schema-version: 1
read_when:
  - 将 OpenClaw 运行时数据、缓存、转录、任务状态或临时文件移入 SQLite
  - 设计从旧版 JSON 或 JSONL 文件迁移的 doctor 流程
  - 更改备份、恢复、VFS 或 worker 存储行为
  - 移除会话锁、裁剪、截断或 JSON 兼容路径
---

# 以数据库为首选的状态重构

## 决策

使用两级 SQLite 布局：

- 全局数据库：`~/.openclaw/state/openclaw.sqlite`
- Agent 数据库：每个 agent 使用一个 SQLite 数据库，用于存储 agent 所有的工作区、
  转录、VFS、工件以及大量的 agent 专属运行时状态
- 配置保持文件存储：`openclaw.json` 仍位于数据库之外。运行时认证配置文件移至 SQLite；外部 provider 或 CLI 凭据文件仍由其所有者管理，位于 OpenClaw 数据库之外。

全局数据库是控制平面数据库。它负责 agent 发现、
共享网关状态、配对、设备/node 状态、任务和流程账本、插件状态、调度器运行时状态、备份元数据以及迁移状态。

Agent 数据库是数据平面数据库。它负责存储 agent 的会话元数据、
转录事件流、VFS 工作区或临时命名空间、工具工件、运行工件以及可搜索/可索引的 agent 本地缓存数据。

这样既能提供一个持久化的全局视图，又无需将大型 agent 工作区、
转录和二进制临时数据写入共享的网关写入通道。

## 硬性契约

此迁移只有一种规范的运行时形态：

- 会话行只持久化会话元数据。不得持久化
  `transcriptLocator`、转录文件路径、同级 JSONL 路径、锁路径、
  裁剪元数据或文件时代兼容指针。
- 转录身份始终是 SQLite 身份：`{agentId, sessionId}`，并可根据协议需要附加
  topic 元数据。
- `sqlite-transcript://...` 不是运行时或协议身份。新代码不得
  派生、持久化、传递、解析或迁移转录定位符。运行时和测试中不应存在伪定位符；文档中只能提及该字符串以禁止使用。
- 旧版 `sessions.json`、转录 JSONL、`.jsonl.lock`、裁剪、截断
  以及旧版会话路径逻辑只能存在于 doctor 迁移/导入路径中。
- 旧版会话配置别名只能存在于 doctor 迁移中。运行时不得解析
  `session.idleMinutes`、`session.resetByType.dm`，也不得将跨 agent 的
  `agent:main:*` 主会话别名解释为其他已配置 agent 的别名。
- 会话路由身份是带类型的关系状态。热运行时和 UI 路径应读取
  `sessions.session_scope`、`sessions.account_id`、
  `sessions.primary_conversation_id`、`conversations` 和
  `session_conversations`；不得解析 `session_key`，也不得从
  `session_entries.entry_json` 中提取 provider 身份，除非是在删除旧调用点期间作为兼容性影子。
- 通道级直接消息标记（如 `dm` 与 `direct`）属于路由词汇，而不是转录定位符或文件存储兼容句柄。
- 旧版 hook handler 配置只能存在于 doctor 警告/迁移界面。
  运行时不得加载 `hooks.internal.handlers`；hooks 只能通过发现到的 hook 目录和 `HOOK.md` 元数据运行。
- 运行时启动、热回复路径、压缩、重置、恢复、诊断、TTS、memory hooks、subagents、插件命令路由、协议边界以及 hooks，必须在运行时传递 `{agentId, sessionId}`。
- 测试应通过 `{agentId, sessionId}` 写入并断言 SQLite 转录行。只证明 JSONL 路径转发、
  调用方提供的定位符保留或转录文件兼容性的测试应删除，除非它们覆盖 doctor 导入、非会话支持/调试材料具体化或协议形态。
- `runEmbeddedPiAgent(...)`、准备好的 worker 运行以及内部 embedded
  attempt 不得接受转录定位符。它们应通过 `{agentId, sessionId}` 打开 SQLite 转录管理器，并将该管理器传递给内部化的、兼容 PI 的 agent 会话，从而使过时的调用方无法让 runner 写入 JSON/JSONL 转录。
- 持久化运行时审计和稳定性记录，在其所属子系统定义数据库契约时使用 SQLite。面向操作员或外部 harness 的可选诊断仍保留为命名文件工件：缓存跟踪、Anthropic payload 日志、原始模型流、启动时间线以及 macOS 滚动诊断日志使用 JSONL，并保留其文档化的路径覆盖设置。
- 原始流日志使用 `OPENCLAW_RAW_STREAM=1`，默认写入
  `logs/raw-stream.jsonl`；`OPENCLAW_RAW_STREAM_PATH` 覆盖工件路径。旧版 pi-mono 的 `PI_RAW_STREAM`、`PI_RAW_STREAM_PATH` 和 `raw-openai-completions.jsonl` 契约不属于 OpenClaw 运行时。
- QMD 已移除。Builtin memory 是唯一的运行时引擎，Doctor 会将已弃用的 QMD 路径迁移到 `memory.search.extraPaths`，然后删除派生的 QMD 工作区。
- Built-in memory 索引位于所属 agent 数据库中。运行时配置和解析后的运行时契约不得暴露 `memorySearch.store.path`；doctor 会删除这个旧版配置键，当前代码在内部传递 agent 的 `databasePath`。

实现工作应持续删除代码，直到这些声明全部成立，且 doctor/import/export/debug 边界之外不存在例外。

## 目标状态和进度

### 硬性目标

- 一个全局 SQLite 数据库负责控制平面状态：
  `state/openclaw.sqlite`。
- 每个 agent 一个 SQLite 数据库负责数据平面状态：
  `agents/<agentId>/agent/openclaw-agent.sqlite`。
- 配置仍然使用文件存储。`openclaw.json` 不属于本次数据库重构。
- 旧版文件仅作为 doctor 迁移输入。
- 运行时永远不会将会话或转录 JSONL 作为活动状态读写。

### 目标状态

- `not-started`：文件时代的运行时代码仍在写入活动状态。
- `migrating`：doctor/import 代码可以将文件数据移入 SQLite。
- `dual-read`：临时桥接同时读取 SQLite 和旧版文件。除非明确记录为仅限 doctor，否则本次重构禁止此状态。
- `sqlite-runtime`：运行时只读写 SQLite。
- `clean`：旧版运行时 API 和测试已移除，并且防护机制可以阻止回归。
- `done`：文档、测试、备份、doctor 迁移以及变更检查共同证明已达到 clean 状态。

### 当前状态

- Sessions：运行时已达到 `clean`。会话行位于 agent 数据库中，
  运行时 API 使用 `{agentId, sessionId}` 或 `{agentId, sessionKey}`，
  `sessions.json` 仅作为 doctor 专用的旧版输入。
- Transcripts：运行时已达到 `clean`。转录事件、身份、快照和轨迹运行时事件位于 agent 数据库中。运行时不再接受转录定位符或 JSONL 转录路径。
- PI embedded runner：`clean`。Embedded PI 运行、准备好的 worker、压缩和重试循环使用 SQLite 会话作用域，并拒绝过时的转录句柄。
- Cron：运行时已达到 `clean`。运行时使用 `cron_jobs` 和 cron 所有的 `task_runs`；运行时测试使用 SQLite `storeKey` 命名，文件时代的 cron 路径仅保留在 doctor 旧版迁移测试中。
- Task registry：`clean`。Task 和 Task Flow 运行时行位于
  `state/openclaw.sqlite`；未发布的旁路 SQLite 导入器已删除。
- Plugin state：`clean`。插件状态/blob 行位于共享全局数据库中；旧版插件状态旁路 SQLite helper 已受到防护。
- Memory：内置 memory 和会话转录索引已达到 `sqlite-runtime`。
  Memory 索引表位于 agent 数据库中，插件 memory 状态使用共享插件状态行，旧版 memory 文件仅作为 doctor 迁移输入或用户工作区内容。
- Backup：`sqlite-runtime`。备份会暂存压缩后的 SQLite 快照，省略活动 WAL/SHM 旁路文件，验证 SQLite 完整性，并在全局数据库中记录备份运行。
- Workspace setup：`sqlite-runtime`。设置完成状态、工作区证明以及生成的 bootstrap 哈希位于带类型的共享 SQLite 表中。运行时不会读写已弃用的工作区 JSON 和 `.attested` 旁路文件；Doctor 负责验证导入并确认删除。
- Inferred commitments：已弃用。提取、交付、运行时存储访问以及 CLI 均已移除。现有行和旧版 JSON 保持不变且不生效，直到批准保留策略和 schema 版本迁移可以将其删除。
- Doctor migration：有意保持为 `migrating`。Doctor 将旧版 JSON、
  JSONL 和已弃用的旁路存储导入 SQLite，记录迁移运行/来源，并删除成功处理的来源。
- Exec approvals：`sqlite-runtime`。TypeScript 和 macOS 读写共享状态中的
  `exec_approvals_config` 单例行。Doctor 专门导入已弃用的状态范围 JSON 文件，运行时在该一次性迁移完成前会安全失败。
- E2E scripts：运行时覆盖已达到 `clean`。Docker MCP seed 写入 SQLite 行。runtime-context Docker 脚本仅在 doctor 迁移 seed 中创建旧版 JSONL，并明确命名旧版会话索引路径。

### 剩余工作

- [x] 将 cron 运行时测试中的 store 变量从 `storePath` 重命名，除非它们是 doctor 旧版输入。
      文件：`src/cron/service.test-harness.ts`、
      `src/cron/service.runs-one-shot-main-job-disables-it.test.ts`、
      `src/cron/service/timer.regression.test.ts`、
      `src/cron/service/ops.test.ts`、`src/cron/service/store.test.ts`、
      `src/cron/service.heartbeat-ok-summary-suppressed.test.ts`、
      `src/cron/service.main-job-passes-heartbeat-target-last.test.ts`、
      `src/cron/store.test.ts`。
      证明：`pnpm check:database-first-legacy-stores`；`rg -n 'storePath' src/cron --glob '!**/commands/doctor/**'`。
- [x] 移除或重命名已废弃的文件时代导出测试 mock。
      文件：`src/auto-reply/reply/commands-export-test-mocks.ts`。
      证明：`rg -n 'resolveSessionFilePath|sessionFile|storePath|transcriptLocator' src/auto-reply/reply`。
- [x] 使 Docker runtime-context 旧版 JSONL seed 明确仅供 doctor 使用。
      文件：`scripts/e2e/session-runtime-context-docker-client.ts`。
      证明：`rg -n 'sessions\\.json|sessionFile|\\.jsonl' scripts/e2e/session-runtime-context-docker-client.ts` 仅显示
      `seedBrokenLegacySessionForDoctorMigration`。
- [x] 在任何 schema 更改后保持 Kysely 生成类型同步。
      文件：`src/state/openclaw-state-schema.sql`、
      `src/state/openclaw-agent-schema.sql`、
      `src/state/*-db.generated.d.ts`。
      证明：本次没有 schema 更改；`pnpm db:kysely:check`；
      `pnpm lint:kysely`。
- [x] 重新运行受影响的 store、命令和脚本的聚焦测试。
      证明：`pnpm test src/cron/service/store.test.ts src/cron/store.test.ts src/cron/service.heartbeat-ok-summary-suppressed.test.ts src/cron/service.main-job-passes-heartbeat-target-last.test.ts src/cron/service.every-jobs-fire.test.ts src/cron/service.persists-delivered-status.test.ts src/cron/service.runs-one-shot-main-job-disables-it.test.ts src/cron/service/ops.test.ts src/cron/service/timer.regression.test.ts src/auto-reply/reply/commands-export-session.test.ts extensions/telegram/src/thread-bindings.test.ts extensions/slack/src/monitor/message-handler/prepare.test.ts src/acp/translator.session-lineage-meta.test.ts`；`git diff --check`。
- [x] 在声明 `done` 之前，运行变更 gate 或远程广泛证明。
      证明：在 Hetzner Crabbox 运行 `run_3f1cabf6b25c` 中，通过临时 Node 24/pnpm 设置以及针对同步后无 `.git` 工作区的显式路径路由，`pnpm check:changed --timed -- <changed extension paths>` 已通过。

### 不得回归

- 不得使用转录定位符。
- 不得使用活动会话文件。
- 除 doctor 旧版迁移测试外，不得使用伪造的 JSONL 测试 fixture。
- 在应使用 Kysely 的地方不得直接访问 SQLite。
- 不得新增文件时代的运行时存储。当前全局 schema 版本为 `7`，当前 agent schema 版本为 `17`；较旧的受支持数据库通过[数据库 schema](/reference/database-schemas)中列出的有限前向迁移进行升级。

## 代码阅读假设

没有后续产品决策会阻塞本计划。实现应基于以下假设继续进行：

- 直接使用 `node:sqlite`，并要求使用支持 WAL 重置安全性的 Node 运行时
  （22.22.3+、24.15+ 或 25.9+）来处理此存储路径。
- 保持恰好一个普通配置文件。不要在本次重构中将配置、插件
  manifest 或 Git 工作区移入 SQLite。
- 不需要运行时兼容文件。旧版 JSON 和 JSONL 文件仅作为迁移输入。分支本地的 SQLite 旁路文件从未发布，应删除而不是导入。
- `openclaw doctor --fix` 负责旧版文件到数据库的迁移。运行时启动只负责已发布 SQLite schema 版本之间的有限升级；不得导入文件时代状态。
- 凭据兼容遵循相同规则：运行时凭据位于 SQLite。旧版 `auth-profiles.json`、每个 agent 的 `auth.json` 以及共享的 `credentials/oauth.json` 文件作为 doctor 迁移输入，导入后删除。
- 生成的模型目录状态由数据库支持。运行时代码不得写入
  `agents/<agentId>/agent/models.json`；现有 `models.json` 文件是旧版 doctor 输入，导入 `agent_model_catalogs` 后删除。
- 运行时不得迁移、规范化或桥接转录定位符。活动转录身份是 SQLite 中的 `{agentId, sessionId}`。文件路径仅是旧版 doctor 输入，`sqlite-transcript://...` 必须从运行时、协议、hook 和插件界面中消失，而不是被当作边界句柄。
- 运行时 SQLite 转录读取不执行旧版 JSONL entry 形状迁移，也不会为了兼容性重写整个转录。旧版 entry 规范化仅保留在明确的 doctor/import 工具中。Doctor 在插入 SQLite 行之前规范化旧版 JSONL 转录文件；当前运行时行已经以当前转录 schema 写入。Trajectory/session export 按原样读取这些行，不得在导出时执行旧版迁移。
- 旧版转录 JSONL 解析/迁移 helper 仅供 doctor 使用。运行时转录格式代码只构建当前 SQLite 转录上下文；doctor 负责在插入行之前升级旧版 JSONL entry。
- 旧版由运行时负责的 JSONL 转录流式 helper 已删除。Doctor 导入代码负责明确的旧版文件读取；运行时会话历史读取 SQLite 行。
- Codex app-server binding 使用 OpenClaw 的 `sessionId` 作为 Codex plugin-state 命名空间中的规范 key。`sessionKey` 是用于路由/显示的元数据，不得替代持久化会话 id，也不得恢复转录文件身份。
- Context engine 直接接收当前运行时契约。registry 不得使用会删除
  `sessionKey`、`transcriptScope` 或 `prompt` 的重试 shim 包装 engine；无法接受当前以数据库为首选的参数的 engine 应明确失败，而不是被桥接。
- 备份输出应保持为一个归档文件。数据库内容应以压缩后的 SQLite 快照进入该归档，而不是使用活动 WAL 旁路文件。
- 转录搜索有用，但不是第一版以数据库为首选的必要功能。设计 schema 时应保留未来添加 FTS 的空间。
- Worker 执行应在数据库边界稳定期间继续通过设置保持实验性。

## 代码阅读发现

当前分支已经超过概念验证阶段。共享数据库已经存在，Node `node:sqlite` 已通过一个小型运行时 helper 接入，原有 store 现在会写入 `state/openclaw.sqlite` 或所属的 `openclaw-agent.sqlite` 数据库。

剩余工作不是选择 SQLite，而是保持新边界清晰，并删除所有仍然呈现旧文件世界形态的兼容性接口：

- Session `storePath` 不再是运行时身份、测试 fixture 形状或状态 payload 字段。运行时和 bridge 测试不再包含 `storePath` 契约名称；doctor/migration 代码负责该旧版词汇。
- 会话写入不再经过旧的进程内 `store-writer.ts` 队列。SQLite patch 写入会在事务之外准备，然后使用带明确冲突检测的短同步验证/应用事务。
- 旧版路径发现仍有有效的迁移用途，但运行时代码应停止将 `sessions.json` 和转录 JSONL 文件视为可能的写入目标。
- Agent 所有的表位于每个 agent 的 SQLite 数据库中。全局数据库保存 registry/control-plane 行；转录行中的转录身份是 `{agentId, sessionId}`。运行时代码不得持久化转录文件路径或迁移转录定位符。
- Doctor 已经导入若干旧版文件。清理工作是将其统一为一个明确的迁移实现，由 doctor 调用，并提供持久化迁移报告。

没有其他产品问题会阻塞实现。

## 当前代码形态

当前分支已经拥有真正的共享 SQLite 基础：

- 运行时最低版本现在要求支持 WAL 重置安全性的 Node 构建：22.22.3+、
  24.15+ 或 25.9+。`package.json`、CLI 运行时 guard、安装器默认值、
  macOS 运行时定位器、CI 和公开安装文档保持一致。
- `src/state/openclaw-state-db.ts` 打开 `openclaw.sqlite`，设置 WAL、
  `synchronous=NORMAL`、`busy_timeout=30000`、`foreign_keys=ON`，并应用由
  `src/state/openclaw-state-schema.sql` 派生的、内置于构建中的 schema 字节。
- Kysely 表类型由根据已提交 `.sql` 文件创建的临时 SQLite 数据库生成。源码运行时读取这些规范文件；打包构建将相同字节内联，因此运行时代码不会保留已提交的复制粘贴 schema 字符串或打包 SQL 资源。
- 运行时 store 从生成的 Kysely `DB` 接口派生选定行和插入行的类型，而不是手动复制 SQLite 行形状。原始 SQL 仅限于 schema 应用、pragma 和仅迁移使用的 DDL。
- 全局 SQLite schema 当前为 `user_version = 7`。Agent schema 当前为版本 `17`；其 opener 会从受支持的旧版 schema 应用有限的前向迁移。文件到数据库的导入仍位于 Doctor 代码中。
- 在所有权边界明确的地方强制执行关系所有权：
  source migration 行从 `migration_runs` 级联，task delivery 状态从
  `task_runs` 级联，转录身份行从转录事件级联。
- 当前共享表包括
  `agent_databases`、`auth_profile_stores`、`auth_profile_state`、
  `plugin_state_entries`、`plugin_blob_entries`、`media_blobs`、
  `skill_uploads`、`capture_sessions`、`capture_events`、`capture_blobs`、
  `sandbox_registry_entries`、`cron_jobs`、`delivery_queue_entries`、
  `model_capability_cache`、`workspace_setup_state`、`workspace_path_aliases`、
  `workspace_attestations`、`workspace_generated_bootstrap_hashes`、
  `native_hook_relay_bridges`、`current_conversation_bindings`、
  `plugin_binding_approvals`、`tui_last_sessions`、`acp_sessions`、
  `acp_replay_sessions`、`acp_replay_events`、`task_runs`、
  `task_delivery_state`、`flow_runs`、`subagent_runs`、`migration_runs` 和
  `backup_runs`。
- 任意插件所有的状态不会获得由宿主所有的类型化表。已安装插件使用
  `plugin_state_entries` 存储版本化 JSON payload，使用
  `plugin_blob_entries` 存储字节，并支持命名空间/key 所有权、TTL 清理、
  备份和插件迁移记录。当宿主拥有查询契约时，宿主所有的插件编排状态仍可使用类型化表，例如 `plugin_binding_approvals`。
- 插件迁移是针对插件所有命名空间的数据迁移，而不是宿主 schema 迁移。插件可以通过 migration provider 迁移自己的版本化 state/blob entry，宿主则在普通迁移账本中记录 source/run 状态。安装新插件不需要更改 `openclaw-state-schema.sql`，除非宿主自身要接管新的跨插件契约。
- `src/state/openclaw-agent-db.ts` 打开
  `agents/<agentId>/agent/openclaw-agent.sqlite`，在全局数据库中注册该数据库，并负责 agent 本地的 session、transcript、cache 和 memory-index 表。共享运行时发现现在读取生成的类型化 `agent_databases` registry，而不是在每个调用点重新实现查询。
- 全局和每个 agent 的数据库都会记录一个 `schema_meta` 行，其中包含数据库角色、schema 版本、时间戳以及 agent 数据库的 agent id。全局数据库当前使用 `user_version = 7`；Agent 数据库使用版本 `17`。
- 每个 agent 的会话身份现在有一个以 `session_id` 为 key 的规范
  `sessions` 根表，其中包含 `session_key`、`session_scope`、`account_id`、
  `primary_conversation_id`、时间戳、显示字段、模型元数据、harness id
  以及可查询列形式的 parent/spawn 关联。`session_routes` 是从
  `session_key` 到当前 `session_id` 的唯一活动路由索引，因此路由 key 可以移动到新的持久化会话，而不会让热读取在重复的 `sessions.session_key` 行之间进行选择。旧版、具有兼容形态的 `session_entries.entry_json` payload 通过外键挂在持久化的 `session_id` 根上；它不再是 schema 层面唯一的会话表示。
- 每个 agent 的外部会话身份同样是关系型的：
  `conversations` 存储规范化的 provider/account/conversation 身份，
  `session_conversations` 将一个 OpenClaw 会话关联到一个或多个外部会话。这支持共享主 DM 会话，即多个 peer 可以有意映射到一个会话，而不会错误地反映在 `session_key` 中。SQLite 也会对自然 provider 身份强制唯一性，因此相同的 channel/account/kind/peer/thread 元组不能分叉到多个 conversation id。共享主会话的直接 peer 使用 `participant` 角色关联，因此一个 OpenClaw 会话可以表示多个外部 DM peer，而不会将旧 peer 降级为模糊的 related 行。`sessions.primary_conversation_id` 仍指向当前带类型的交付目标。关闭状态的路由/状态列通过 SQLite `CHECK` 约束强制执行，而不是只依赖 TypeScript union。
  运行时会话投影在应用带类型的 session/conversation 列之前清除
  `session_entries.entry_json` 中的兼容路由影子，因此过时的 JSON payload 无法恢复交付目标。
  Subagent announce 路由同样要求带类型的 SQLite 交付上下文；不再回退到兼容的 `SessionEntry` 路由字段。
  Gateway `chat.send` 的显式交付继承会读取带类型的 SQLite 交付上下文，而不是 `origin`/`last*` 兼容字段。
  `tools.effective` 同样从带类型的 SQLite 交付/路由行派生 provider/account/thread 上下文，而不是从过时的 `last*` session-entry 影子中派生。
  System-event prompt 上下文会从带类型的交付字段重新构建 channel/to/account/thread 字段，而不是使用 `origin` 影子。
  共享的 `deliveryContextFromSession` helper 和 session-to-conversation mapper 现在完全忽略 `SessionEntry.origin`；只有带类型的交付字段和关系型 conversation 行才能创建热路由身份。
  运行时会话 entry 规范化会在持久化或投影 `entry_json` 前移除 `origin`，入站元数据写入带类型的 channel/chat 字段和关系型 conversation 行，而不是创建新的 origin 影子。
- 转录事件、转录快照和轨迹运行时事件现在引用规范的 agent 会话 `sessions` 根表，并在会话删除时级联。转录身份/幂等性行仍从精确的转录事件行级联。
- Memory-core 索引现在使用明确的 agent 数据库表
  `memory_index_meta`、`memory_index_sources`、`memory_index_chunks` 和
  `memory_embedding_cache`，并通过 `memory_index_state` 跟踪修订变化。
  可选的 FTS/vector 辅助索引命名为 `memory_index_chunks_fts` 和
  `memory_index_chunks_vec`，而不是通用的 `meta`、`files`、`chunks`、
  `chunks_fts` 或 `chunks_vec` 表。规范名称保留当前的 path/source 行形状和序列化 embedding 兼容性。这些表属于派生/搜索缓存，而不是规范的转录存储；它们可以从 memory 工作区文件和已配置 source 中删除并重建。
  打开已发布的通用名称 memory 索引时，会将其 metadata、sources、chunks 和 embedding cache 迁移到规范表中；派生的 FTS/vector 表会以规范名称重建。
- Subagent 运行恢复状态现在位于带类型的共享 `subagent_runs` 行中，并对 child、requester 和 controller session key 建立索引。旧版
  `subagents/runs.json` 文件仅作为 Doctor 清理输入。其运行条目属于临时恢复状态，因此 Doctor 会记录退役凭据并丢弃该文件，而不导入它。由于 SQLite 行被裁剪后，文件无法证明其中的条目是活动的还是过时的，因此操作员必须让文件时代的活动运行在跨越此边界升级前完成。
- 当前会话绑定现在位于带类型的共享
  `current_conversation_bindings` 行中，以规范化 conversation id 为 key，并将目标 agent/session 列、conversation kind、状态、过期时间和 metadata 作为关系列存储，而不是存储重复的不透明 binding 记录。持久化 binding key 包含规范化的 conversation kind，因此 direct/group/channel ref 不会冲突；SQLite 会拒绝无效的 binding kind/status 值。旧版 `bindings/current-conversations.json` 仅作为 doctor 迁移输入。
- Delivery queue 恢复现在将 channel、target、account、session、retry、error、platform-send 和 recovery 状态的带类型列覆盖到 replay JSON 上。`entry_json` 保留 replay payload、hooks 和格式化 payload，但带类型的列是热队列路由/状态的权威来源。
- TUI 上次会话恢复指针现在位于带类型的共享 `tui_last_sessions` 行中，并以经过哈希处理的 TUI connection/session scope 为 key。运行时只读写 SQLite，原子地 upsert 每个 scope，并排除 heartbeat 会话。`openclaw doctor --fix` 会严格验证旧版 TUI JSON 文件，保留更新的 SQLite 行，验证规范结果，然后删除未更改的旧版文件，而不是留下归档。
- Discord 命令部署哈希现在位于共享的 plugin-state SQLite store 中。运行时只读写精确的 application-scoped key。Doctor 删除可重建的旧版 `discord/command-deploy-cache.json` 文件而不导入它，因此下一次启动会执行一次规范 reconcile。
- 默认 TTS 偏好现在位于共享 plugin-state SQLite 行中，key 位于
  `speech-core` 插件下。旧版 `settings/tts.json` 文件仅作为 doctor 迁移输入；运行时不再读写 TTS 偏好 JSON 文件，旧版路径 resolver 位于 doctor 迁移模块中。
- Secret target 元数据现在讨论 store，而不是假设每个 credential target 都是配置文件。`openclaw.json` 仍是配置 store；auth-profile target 使用带类型的 SQLite `auth_profile_stores` 行，并将 provider 形状的凭据保留为 JSON payload。
- Secret audit 不再扫描已弃用的每个 agent 的 `auth.json` 文件。Doctor 负责警告、导入和删除该旧版文件。
- 旧版 auth profile 路径 helper 现在位于 doctor 旧版代码中。核心 auth profile 路径 helper 暴露 SQLite auth-store 身份和显示位置，而不是 `auth-profiles.json` 或 `auth-state.json` 运行时路径。
- Subagent 运行恢复和 OpenRouter 模型能力缓存运行时模块现在将 SQLite 快照读写器与仅供 doctor 使用的旧版 JSON 导入 helper 分离。OpenRouter 能力使用 provider_id = `"openrouter"` 下带类型的通用 `model_capability_cache` 行，而不是使用一个不透明缓存 blob 或 provider 专属宿主表。Subagent run 的 `taskName` 存储在带类型的 `subagent_runs.task_name` 列中；`payload_json` 副本属于 replay/debug 数据，不是热显示或查找字段的数据源。
- 已回退的原型路径
  `src/agents/filesystem/virtual-agent-fs.sqlite.ts` 和
  `src/agents/runtime-worker.entry.ts` 不是当前实现文件。
  规范的 agent schema 包含 `cache_entries`，但当前没有定义 VFS、工具工件或运行工件表。
- Workspace bootstrap 完成状态、证明时效性和生成的 bootstrap 哈希现在位于带类型的共享
  `workspace_setup_state`、`workspace_path_aliases`、`workspace_attestations` 和
  `workspace_generated_bootstrap_hashes` 行中，并以规范工作区身份为 key。持久化的词法路径和真实路径别名会在已配置的符号链接消失后保持工作区消失保护；重新指向的别名会安全失败。运行时不再读取或写入
  `openclaw-workspace-state.json`、`.openclaw/workspace-state.json`、
  state-dir 下的 `workspace-attestations/*.attested` 或同级的
  `<workspace>.attested` 旁路文件。`openclaw doctor --fix` 会验证并认领旧版来源，将其导入 SQLite 并记录迁移凭据，验证规范行，然后才删除已认领的文件。
- Exec approvals 在 TypeScript 和 macOS companion 中都使用共享的
  `exec_approvals_config` 单例行。该行的 `raw_json` 仍是协议 CAS 哈希的权威来源；带类型的列是写入时投影。
- TypeScript 设备身份和设备认证 token 使用带类型的
  `device_identities` 和 `device_auth_tokens` 行，doctor 专用的旧版 JSON 导入位于运行时所有者之外。Gateway-origin-scoped token 使用延迟添加的 `gateway_origin_device_tokens` 表。
- GitHub Copilot token exchange 缓存使用共享 SQLite plugin-state 表中的
  `github-copilot/token-cache/default`。这是 provider 所有的缓存状态，因此有意不添加宿主 schema 表。
- GitHub Copilot 压缩不再写入 `openclaw-compaction-*.json` 工作区旁路文件。Harness 调用 SDK history compaction RPC 处理被跟踪的 SDK session，OpenClaw 将持久化 session/transcript 状态保存在 SQLite 中，而不是使用兼容性标记文件。
- 共享 Swift runtime（`OpenClawKit`）对设备身份使用相同的
  `state/openclaw.sqlite#table/device_identities` 形状和行 key。Apple-container 旧版文件由 Swift 迁移所有者导入，因为 TypeScript Doctor 无法访问这些 container。Swift device auth 也读取和写入共享的 `device_auth_tokens` 表。
- Android 设备身份和缓存的设备认证仍是 app-local store。它们需要单独由 Android 负责的迁移；宿主 SQLite 声明不描述当前 Android 行为。
- Android 通知最近 package 历史使用带类型的
  `android_notification_recent_packages` 行。运行时不再迁移或读取旧版 SharedPreferences CSV key。
- 当旧版 `identity/device.json` 存在、SQLite 身份行无效或 SQLite 身份 store 无法打开时，设备身份创建会安全失败。Doctor 会先导入并删除该文件，因此运行时启动不会在迁移前静默轮换配对身份。
- 设备身份选择使用 SQLite 行 key，而不是 JSON 文件定位符。测试和网关 helper 传递明确的身份 key；只有 doctor 迁移和安全失败的启动 gate 知道已退役的 `identity/device.json` 文件名。
- 会话重置兼容性现在位于 doctor 配置迁移中：
  `session.idleMinutes` 被移入 `session.reset.idleMinutes`，
  `session.resetByType.dm` 被移入 `session.resetByType.direct`，运行时重置策略只读取规范 reset key。
- 旧版配置兼容性现在位于 `src/commands/doctor/` 下。普通的
  `readConfigFileSnapshot()` 验证不会导入 doctor 旧版检测器或标注旧版问题；`runDoctorConfigPreflight()` 会为 doctor 修复/报告添加这些问题。配置修复通过 `src/commands/doctor/legacy-config-repair.ts` 和共享的
  `legacy-config-migrate.ts` 所有者进入；过时的 OAuth-profile 清理由
  `src/commands/doctor/shared/stale-oauth-profile-shadows.ts` 负责。
- 非 doctor 命令不会自动运行旧版配置修复。例如，
  `openclaw update --channel` 现在会在旧版配置无效时失败，并要求用户运行 doctor，而不是静默导入 doctor 迁移代码。
- Web push、APNs、Voice Wake、更新检查和配置健康现在使用带类型的共享 SQLite 表存储 subscription、VAPID key、node registration、trigger 行、路由行、更新通知状态和配置健康条目，而不是使用完整的不透明 JSON blob。Web Push 和 APNs 写入只 upsert 受影响的 primary-key 行；配置健康按配置路径 reconcile。它们的运行时模块与仅供 Doctor 使用的旧版 JSON 导入 helper 保持分离。
- APNs runtime 只读取和写入 `apns_registrations`。明确执行
  `openclaw doctor --fix` 时，会严格导入已退役的
  `push/apns-registrations.json`，保留现有规范行，验证事务，记录凭据，并删除包含 secret 的 JSON。基于凭据的重试只执行清理，而 `apns_registration_tombstones` 会覆盖首次修复前的失效，因此过期的 relay grant 或设备 token 无法复活。
- Node-host 配置现在使用共享 SQLite 数据库中的带类型单例行。运行时在旧版 `node.json` 文件或中断的认领操作仍存在时会安全失败；明确执行
  `openclaw doctor --fix` 会在正常运行时使用前严格导入并删除该文件。
- 设备/node 配对、通道配对、通道 allowlist 和 bootstrap 状态现在使用带类型的 SQLite 行，而不是完整的不透明 JSON blob。插件 binding approval 和 cron job 状态遵循相同拆分：运行时模块暴露 SQLite 支持的操作和中立的快照 helper，配对/bootstrap 以及插件 binding approval 快照写入按 primary key reconcile 行，而不是截断表；doctor 则通过 `src/infra/state-migrations.*` 所有者和插件 Doctor 契约导入/删除旧版 JSON 文件。
- 已安装插件记录现在位于 SQLite installed-plugin index 中。运行时配置读写不再迁移或保留旧版 `plugins.installs` authored-config 数据；doctor 会在正常运行时使用前将该旧版配置形状导入 SQLite。
- QQBot 凭据恢复快照现在位于 SQLite plugin state 的
  `qqbot/credential-backups` 下。运行时不再写入
  `qqbot/data/credential-backup*.json`；QQBot doctor 契约从活动状态目录导入并归档这些旧版备份文件。
- Gateway reload planning 比较内部
  `installedPluginIndex.installRecords.*` diff namespace 下的 SQLite installed-plugin index 快照。运行时 reload 决策不再将这些行包装为伪造的 `plugins.installs` 配置对象。
- Matrix 账户凭据现在位于 SQLite plugin state 中。运行时只读取该规范 store；当能够解析其账户时，Doctor 会导入、验证并归档已退役的
  `credentials/matrix/credentials*.json` 文件。
- 核心配对和 cron 运行时模块不再使用旧版 JSON 路径构建器。已弃用的 pairing-path SDK helper 仍保留为仅供迁移使用的兼容项；doctor 状态迁移负责读取和导入文件。由 Doctor 负责的旧版模块只为导入测试和迁移构建 `pending.json`、`paired.json`、`bootstrap.json` 及 `cron/jobs.json` source 路径。旧版 cron job 形状规范化和 JSONL 历史导入位于
  `src/commands/doctor/cron/` 下；旧版 SQLite 历史最终化在状态数据库打开期间运行。
- `src/infra/state-migrations.doctor.ts` 负责协调仅限 Doctor 的状态导入；
  通用的已退役 JSON 状态位于
  `src/infra/state-migrations.runtime-state.ts`，而特定所有者的 source 使用同级的 `state-migrations.*` 模块。
- `src/infra/state-migrations.session-store.ts` 将旧版
  `sessions.json` 和 `*.jsonl` 转录直接导入 SQLite，并删除成功处理的 source。它不再通过 `agents/<agentId>/sessions/*.jsonl` 暂存根目录旧版转录，也不会在导入前创建规范 JSONL 目标。
- 状态完整性 doctor 检查不再扫描旧版会话目录，也不再提供删除孤立 JSONL 的选项。旧版转录文件仅作为迁移输入，迁移步骤负责导入和删除 source。
- 活动 sandbox registry 的读写位于
  `src/agents/sandbox/registry.ts`；已删除的
  `src/commands/doctor/legacy/sandbox-registry.ts` 路径不是当前所有者。
- 旧版会话 store 的读取和迁移位于
  `src/infra/state-migrations.legacy-session-store.ts` 和
  `src/infra/state-migrations.session-store.ts`；已删除的
  `src/commands/doctor/legacy/session-transcript-health.ts` 路径不是当前修复所有者。

已完成的整合/删除重点：

- 插件状态现在使用共享的 `state/openclaw.sqlite` 数据库。旧的分支本地 `plugin-state/state.sqlite` 旁车导入器已移除，因为该 SQLite 布局从未发布。探测／测试辅助工具现在报告共享的 `databasePath`，而不再暴露插件状态专用的 SQLite 路径。
- Task 和 Task Flow 运行时表现在位于共享的 `state/openclaw.sqlite` 数据库中，而不是 `tasks/runs.sqlite` 和 `tasks/flows/registry.sqlite`；出于同样的未发布布局原因，旧的旁车导入器已移除。
- 会话存储拆分到 `src/config/sessions/session-accessor.*` 和 `session-accessor.sqlite-*` 模块中。`storePath` 仍是配置项和兼容性目标，由 `session-sqlite-target.ts` 解析到代理数据库；它不是规范的会话或 transcript 身份。
- 会话目标解析现在暴露每个代理的数据库目标，而不是旧版 `sessions.json` 路径。共享网关、ACP 元数据、doctor 路由修复以及 `openclaw sessions` 现在枚举 `agent_databases` 与已配置的代理。
- 网关会话路由现在使用 `resolveGatewaySessionDatabaseTarget`；返回的目标携带 `databasePath` 和候选 SQLite 行键，而不是旧版会话存储文件路径。
- 通道会话运行时类型现在为更新时间读取、入站元数据和最近路由更新暴露 `{agentId, sessionKey}`。旧的 `saveSessionStore(storePath, store)` 兼容类型已移除。
- 插件运行时、扩展 API 和插件 SDK 会话接口现在暴露基于 SQLite 的会话行辅助工具，而不是活动会话整体存储／文件兼容辅助工具。根库兼容性导出仍可用，但仅限插件 SDK 之外的旧版内部调用方和迁移调用方。旧的 `resolveLegacySessionStorePath` 辅助工具已移除；旧版 `sessions.json` 路径构造现在仅存在于迁移和测试夹具中。
- `src/config/sessions/session-accessor.sqlite-entry.ts` 在每个代理的数据库中存储规范会话条目，并支持行级读取／upsert／删除补丁。运行时 upsert／patch／delete 不再扫描大小写变体或清理旧别名键；规范化由 doctor 负责。独立的 JSON 导入辅助工具已移除，迁移现在合并 upsert 更新的行，而不是替换整个会话表。公开的 read／list／load 辅助工具从类型化的 `sessions` 和 `conversations` 行投影活跃会话元数据；`entry_json` 是兼容性／调试影子，可能过期或无效，但不会因此丢失类型化会话身份或投递上下文。
- `src/config/sessions/delivery-info.ts` 现在从类型化的每个代理的 `sessions`、`conversations` 和 `session_conversations` 行解析投递上下文。它不再从 `session_entries.entry_json` 重建运行时投递身份；缺失类型化 conversation 行属于 doctor 迁移／修复问题，而不是运行时回退。
- 存储会话重置决策现在优先使用类型化的 `sessions.session_scope`、`sessions.chat_type` 和 `sessions.channel` 元数据。`sessionKey` 解析仅用于命令目标中明确的 thread／topic 后缀；群组与直接会话的重置分类不再来自键形状。
- 会话列表／状态显示分类现在使用类型化聊天元数据和网关会话类型。不再将 `session_key` 中的 `:group:` 或 `:channel:` 子字符串视为持久的群组／直接会话事实。
- 静默回复策略选择现在仅使用显式 conversation 类型或 surface 元数据。不再根据 `session_key` 子字符串猜测直接／群组策略。
- 会话显示模型解析现在从 SQLite 会话数据库目标接收代理 id，而不是从 `session_key` 中拆分出来。
- 代理间 announce 目标填充现在仅使用类型化 `sessions.list` 的 `deliveryContext`。不再从旧版 `origin`、镜像的 `last*` 字段或 `session_key` 形状中恢复通道／账户／thread 路由。
- `sessions_send` 的 thread 目标拒绝现在读取类型化 SQLite 路由元数据。不再通过从目标键中解析 thread 后缀来拒绝或接受目标。
- 群组范围工具策略验证现在读取当前会话或派生会话的类型化 SQLite conversation 路由。不再相信通过解码 `sessionKey` 得到的群组／通道身份；当没有类型化会话行为其背书时，调用方提供的群组 id 会被丢弃。
- 通道模型覆盖匹配现在使用显式群组和父 conversation 元数据。不再从 `parentSessionKey` 中解码父 conversation id。
- 存储的模型覆盖继承现在要求类型化会话上下文中存在显式父会话键。不再从 `sessionKey` 中的 `:thread:` 或 `:topic:` 后缀派生父级覆盖。
- 旧的会话 thread-info 包装器和已加载插件的 thread 解析器已移除；运行时代码不再导入 `config/sessions/thread-info`。
- 通道 conversation 辅助工具不再暴露完整会话键解析桥接。Core 仍通过 `resolveSessionConversation(...)` 规范化由 provider 所有的原始 conversation id，但不会从 `sessionKey` 重建路由事实。
- 完成投递、发送策略和任务维护不再根据 `session_key` 形状推导聊天类型。旧的聊天类型键解析器已删除；这些路径要求类型化会话元数据、类型化投递上下文或显式投递目标词汇。
- 会话列表／状态、诊断、审批账户绑定、TUI 心跳过滤和用量摘要不再从 `SessionEntry.origin` 中挖掘 provider／账户／thread／显示路由。剩余的运行时 `origin` 读取仅涉及非会话概念或当前轮次投递对象。
- 审批请求的原生 conversation 查找现在读取每个代理的类型化会话路由行。不再从 `sessionKey` 解析通道／群组／thread conversation 身份；缺失类型化元数据属于迁移／修复问题。
- 网关会话 changed／chat／session 事件载荷不再回显 `SessionEntry.origin` 或 `last*` 路由影子；客户端接收类型化的 `channel`、`chatType` 和 `deliveryContext`。
- 心跳投递解析现在可以直接接收类型化 SQLite `deliveryContext`，心跳运行时传递每个代理的会话投递行，而不是依赖兼容性的 `session_entries` 影子来进行当前路由。
- Cron 隔离代理投递目标解析也会先从每个代理的类型化会话投递行填充当前路由，然后才回退到兼容性条目载荷。
- 子代理 announce 源解析现在通过 `loadRequesterSessionEntry` 传递类型化的请求方会话投递上下文，并优先使用该行，而不是兼容性的 `last*`／`deliveryContext` 影子。
- 入站会话元数据更新现在先与每个代理的类型化投递行合并；只有不存在类型化 conversation 行时，旧的 `SessionEntry` 投递字段才作为回退。
- 重启／更新投递提取现在让类型化 SQLite 投递 `threadId` 优先于从 `sessionKey` 解析出的 topic／thread 片段；解析仅作为旧版 thread 形键的回退。
- Hook 代理上下文中的通道 id 现在优先使用类型化 SQLite conversation 身份，其次使用显式消息元数据。不再从 `sessionKey` 解析 provider／群组／通道片段。
- 网关 `chat.send` 外部路由继承现在读取类型化 SQLite 会话路由元数据，而不是从 `sessionKey` 片段推断通道／直接／群组范围。通道范围会话只有在类型化会话通道和聊天类型与已存储投递上下文匹配时才继承；共享主会话仍保留更严格的 CLI／无客户端元数据规则。
- 重启标记唤醒和继续路由现在会在排队心跳唤醒或路由代理轮次继续之前读取类型化 SQLite 投递／路由行。不再从会话条目 JSON 影子重建投递上下文。
- 网关 `tools.effective` 上下文解析现在读取类型化 SQLite 投递／路由行中的 provider、账户、目标、thread 和回复模式输入。不再从过期的 `session_entries.entry_json` origin 影子恢复这些热路由字段。
- 实时语音咨询路由现在从每个代理的类型化 SQLite 会话行解析父级／通话投递。不再在选择嵌入代理消息路由时回退到兼容性的 `SessionEntry.deliveryContext` 影子。
- ACP spawn 心跳中继和父流路由现在从类型化 SQLite 会话行读取父级投递。不再从兼容性的会话条目影子重建父级投递上下文。
- 会话投递路由保留现在遵循类型化聊天元数据和持久化投递列。不再从 `sessionKey` 提取通道提示、直接／主会话标记或 thread 形状；内部 webchat 路由只有在 SQLite 已为该会话保存类型化／持久化投递身份时，才会继承外部目标。
- 通用会话投递提取现在仅读取精确的类型化 SQLite 会话投递行。不再解析 thread／topic 后缀，也不再从 thread 形键回退到基础会话键。
- 回复分派、重启标记恢复和实时语音咨询路由现在使用精确的类型化 SQLite 会话／conversation 行进行 thread 路由。不再通过解析 thread 形会话键恢复 thread id 或基础会话投递上下文。
- 嵌入式 PI 历史限制现在使用类型化 SQLite 会话路由投影（`sessions` 加主 `conversations`）获取 provider、聊天类型和对端身份。不再从 `sessionKey` 中解析 provider、DM、群组或 thread 形状。
- Cron 工具投递推断现在仅使用显式投递或当前类型化投递上下文。不再从 `agentSessionKey` 解码通道、对端、账户或 thread 目标。
- 运行时会话行不再携带旧的 `lastProvider` 路由别名。辅助工具和测试使用类型化的 `lastChannel` 与 `deliveryContext` 字段；doctor 迁移是唯一应转换旧路由别名或持久化 `origin` 影子的地方。
- Transcript 事件现在写入每个代理的数据库。VFS 和工具产物表不属于当前规范代理架构。未发布的全局 transcript 文件映射表已移除；Doctor 会在持久化迁移行中记录旧来源路径。
- 运行时 transcript 查找不再扫描 JSONL 字节偏移或探测旧 transcript 文件。网关聊天／媒体／历史路径从 SQLite 读取 transcript 行；会话 JSONL 现在仅是旧版 doctor 输入，不是运行时状态或导出格式。
- Transcript 父级和分支关系使用 SQLite transcript 标头中的结构化 `parentTranscriptScope: {agentId, sessionId}` 元数据，而不是类似路径的 `agent-db:...transcript_events...` 定位字符串。
- Transcript 管理器契约不再暴露隐式持久化的 `create(cwd)` 或 `continueRecent(cwd)` 构造器。持久化 transcript 管理器使用显式 `{agentId, sessionId}` 范围打开；只有内存管理器对测试和纯 transcript 转换保持无范围。
- 运行时 transcript 存储 API 解析 SQLite 范围，而不是文件系统路径。旧的 `resolve...ForPath` 辅助工具和未使用的 `transcriptPath` 写入选项已从运行时调用方中移除。
- 运行时会话解析现在使用 `{agentId, sessionId}`，不得为外部边界派生 `sqlite-transcript://<agent>/<session>` 字符串。旧的绝对 JSONL 路径仅是 doctor 迁移输入。
- 原生 hook 中继直接桥接记录现在存储在类型化共享的 `native_hook_relay_bridges` 行中，并以 relay id 为键。运行时不再为这些短生命周期桥接记录写入 `/tmp` JSON 注册表或不透明的通用记录。
- `runEmbeddedPiAgent(...)` 不再具有 transcript-locator 参数。准备好的 worker 描述符也省略 transcript 定位符。运行时会话状态和排队的后续运行携带 `{agentId, sessionId}`，而不是派生的 transcript 句柄。
- 嵌入式压缩现在从 `agentId` 和 `sessionId` 获取 SQLite 范围。压缩 hook、context-engine 调用、CLI 委托和协议回复不得接收派生的 `sqlite-transcript://...` 句柄。导出／调试代码可以从行中生成显式用户产物，但不会提供通用会话 JSONL 导出路径，也不会将文件名传回运行时身份。
- `/export-session` 从 SQLite 读取 transcript 行，并仅写入请求的独立 HTML 视图。嵌入式查看器不再从这些行重建或下载会话 JSONL。
- Context-engine 委托不再解析 transcript 定位符来恢复代理身份。准备好的运行时上下文将已解析的 `agentId` 传递给内置压缩适配器。
- Transcript 重写和实时工具结果截断现在按 `{agentId, sessionId}` 读取并持久化 transcript 状态，不会为 transcript-update 事件载荷派生临时定位符。
- Transcript 状态辅助工具接口不再提供基于定位符的 `readTranscriptState`、`replaceTranscriptStateEvents` 或 `persistTranscriptStateMutation` 变体。运行时调用方必须使用 `{agentId, sessionId}` API。Doctor 导入通过显式文件路径读取旧文件并写入 SQLite 行；不会迁移定位符字符串。
- 运行时会话管理器契约不再暴露 `open(locator)`、`forkFrom(locator)` 或 `setTranscriptLocator(...)`。持久化会话管理器仅按 `{agentId, sessionId}` 打开；列表／fork 辅助工具位于面向行的会话和 checkpoint API 上，而不是 transcript 管理器门面。
- 网关 transcript reader API 以范围优先。它们接收 `{agentId, sessionId}`，不接受可能意外成为运行时身份的顺序 transcript 定位符。活动 transcript 定位符解析已移除；旧来源路径仅由 doctor 导入代码读取。
- Transcript 更新事件同样以范围优先。`emitSessionTranscriptUpdate` 不再接受裸定位符字符串，监听器按 `{agentId, sessionId}` 路由，而不解析句柄。
- 网关会话消息广播从代理／会话范围解析会话键，而不是从 transcript 定位符解析。旧的 transcript 定位符到会话键解析器／缓存已移除。
- 网关会话历史 SSE 按代理／会话范围过滤实时更新。不再规范化 transcript 定位符候选项、realpath 或文件形 transcript 身份来决定流是否应接收更新。
- 会话生命周期 hook 不再在 `session_end` 上派生或暴露 transcript 定位符。Hook 使用者获得 `sessionId`、`sessionKey`、下一会话 id 和代理上下文；transcript 文件不属于生命周期契约。
- 重置 hook 也不再派生或暴露 transcript 定位符。`before_reset` 载荷携带恢复的 SQLite 消息和重置原因，而会话身份保留在 hook 上下文中。
- 代理 harness 重置不再接受 transcript 定位符。重置分派由 `sessionId`／`sessionKey` 加原因确定范围。
- 代理扩展会话类型不再暴露 `transcriptLocator`；扩展应使用会话上下文和运行时 API，而不是访问文件形 transcript 身份。
- 插件压缩 hook 不再暴露 transcript 定位符。Hook 上下文已经携带会话身份，transcript 读取必须通过支持 SQLite 范围的 API，而不是文件形句柄。
- `before_agent_finalize` hook 不再暴露 `transcriptPath`，包括原生 hook 中继载荷。完成 hook 仅使用会话上下文。
- 网关重置响应不再在返回条目上合成 transcript 定位符。重置会创建 SQLite transcript 行，返回干净的会话条目，并将 transcript 访问交给范围感知的读取器。
- 嵌入式运行和压缩结果不再为会话记账暴露 transcript 定位符。自动压缩更新仅涉及活动的 `sessionId`、压缩计数器和 token 元数据。
- 嵌入式尝试结果不再返回 `transcriptLocatorUsed`，context-engine `compact()` 结果也不再返回 transcript 定位符。运行时重试循环只接受后继 `sessionId`。
- 投递镜像 transcript 追加结果不再返回 transcript 定位符。调用方获得追加的 `messageId`；transcript 更新信号使用 SQLite 范围。
- 父会话 fork 辅助工具仅返回 fork 后的 `sessionId`。子代理准备会将子代理／会话范围传递给引擎。
- CLI runner 参数和历史重新播种不再接受 transcript 定位符。CLI 历史读取根据 `{agentId, sessionId}` 和会话键上下文解析 SQLite transcript 范围。
- CLI 和嵌入式 runner 测试夹具现在按会话 id 播种和读取 SQLite transcript 行，不再假装活动会话是 `*.jsonl` 文件，也不再通过运行时参数传递 `sqlite-transcript://...` 字符串。
- 会话工具结果保护事件即使内存管理器没有派生定位符，也会从已知会话范围发出。其测试不再伪造活动的 `/tmp/*.jsonl` transcript 文件。
- BTW 和压缩 checkpoint 辅助工具现在按 SQLite 范围读取和 fork transcript 行。Checkpoint 元数据现在仅存储会话 id 以及叶节点／条目 id；不再将派生定位符写入 checkpoint 载荷。
- 网关 transcript 键查找在协议边界使用 SQLite transcript 范围，不再对 transcript 文件名执行 realpath 或 stat。
- 自动压缩 transcript 轮换通过 SQLite transcript 存储直接写入后继 transcript 行。会话行仅保留后继会话身份，不再保留持久化 JSONL 路径或定位符。
- 嵌入式 context-engine 压缩使用 SQLite 命名的 transcript 轮换辅助工具。轮换测试不再构造 JSONL 后继路径，也不再将活动会话建模为文件。
- 托管外发图片保留功能现在根据 SQLite transcript 统计信息为 transcript-message 缓存生成键，而不是调用文件系统 stat。
- 运行时会话锁和独立的旧版 `.jsonl.lock` doctor 通道已移除。
- Microsoft Teams 运行时 barrel 和公开插件 SDK 不再重新导出旧的文件锁辅助工具；持久化插件状态路径由 SQLite 支持。
- 会话年龄／数量清理和显式会话清理已移除。Doctor 负责旧版导入；过期会话会被显式重置或删除。
- Doctor 完整性检查不再将旧版 JSONL 文件计为 SQLite 会话行的有效活动 transcript。活动 transcript 健康状态仅基于 SQLite；旧版 JSONL 文件会作为迁移／孤立清理输入报告。
- Doctor 不再将 `agents/<agent>/sessions/` 视为必需的运行时状态。仅当该目录已经存在时才扫描它，将其作为旧版导入或孤立清理输入。
- 网关 `sessions.resolve`、会话 patch／reset／compact 路径、子代理生成、快速中止、ACP 元数据、心跳隔离会话和 TUI patching 不再在正常运行时工作中顺带迁移或清理旧版会话键。
- CLI 命令会话解析现在返回所属的 `agentId` 而不是 `storePath`，正常的 `--to` 或 `--session-id` 解析不再复制旧版主会话行。旧版主行规范化仅由 doctor 负责。
- 运行时子代理深度解析不再读取 `sessions.json` 或 JSON5 会话存储。它按代理 id 读取 SQLite `session_entries`；旧版深度／会话元数据只能通过 doctor 导入路径进入。
- Auth profile 会话覆盖现在通过直接的 `{agentId, sessionKey}` 行 upsert 持久化，而不是延迟加载文件形会话存储运行时。
- 自动回复详细模式门控和会话更新辅助工具现在按会话身份读取／upsert SQLite 会话行，在访问持久化行状态之前不再要求旧版存储路径。
- 命令运行会话元数据辅助工具现在使用面向条目的名称和模块路径；旧的 `session-store` 命令辅助工具接口已移除。
- Bootstrap 标头播种和手动压缩边界加固现在直接修改 SQLite transcript 行。运行时调用方传递会话身份，而不是可写的 `.jsonl` 路径。
- 静默会话轮换重放现在从 SQLite transcript 行按 `{agentId, sessionId}` 复制最近的用户／助手轮次。不再接受源或目标 transcript 定位符。
- 新创建的运行时会话行不再存储 transcript 定位符。调用方直接使用 `{agentId, sessionId}`；导出／调试命令可以在生成行时自行选择输出文件名。
- 启动新的持久化 transcript 会话现在始终按范围打开 SQLite 行。会话管理器不再复用文件时代的 transcript 路径或定位符作为新会话身份。
- 持久化 transcript 会话使用显式的 `openTranscriptSessionManagerForSession({agentId, sessionId})` API。旧的静态 `SessionManager.create/openForSession/list/forkFromSession` 门面已移除，使测试和运行时代码无法意外重建文件时代的会话发现逻辑。
- 插件运行时不再暴露 `api.runtime.agent.session.resolveTranscriptLocatorPath`；插件代码使用 SQLite 行辅助工具和范围值。
- 公开的 `session-store-runtime` SDK 接口现在只导出会话行和 transcript 行辅助工具。专用的 SQLite 架构／路径／事务辅助工具位于 `sqlite-runtime`；原始 open／close／reset 辅助工具仍仅供一方测试本地使用。
- 旧版 `.jsonl` trajectory／checkpoint 文件名分类器现在位于 doctor 旧版会话文件模块中。Core 会话验证不再导入文件产物辅助工具来决定普通 SQLite 会话 id。
- 活动内存阻塞子代理运行使用 SQLite transcript 行，而不是在插件状态下创建临时或持久化的 `session.jsonl` 文件。旧的 `transcriptDir` 选项已移除。
- 一次性 slug 生成和系统代理规划器运行使用 SQLite transcript 行，而不是创建临时的 `session.jsonl` 文件。
- `llm-task` 辅助运行使用 SQLite transcript 行，因此这些仅模型辅助会话不再创建临时 JSON／JSONL transcript 文件。
- `TranscriptSessionManager` 现在仅是已打开的 SQLite transcript 范围。运行时代码使用 `openTranscriptSessionManagerForSession({agentId, sessionId})` 打开它；create、branch、continue、list 和 fork 流程位于各自负责的 SQLite 行辅助工具中，而不是静态管理器门面中。Doctor／import／debug 代码在运行时会话管理器之外处理显式旧版源文件。
- 过时的 `SessionManager.newSession()` 和 `SessionManager.createBranchedSession()` 门面方法已移除。新会话和 transcript 后代由其负责的 SQLite 工作流创建，而不是将已打开的管理器修改为另一个持久化会话。
- 父 transcript fork 决策和 fork 创建不再接受 `storePath` 或 `sessionsDir`；它们使用 `{agentId, sessionId}` SQLite transcript 范围，而不是保留的文件系统路径元数据。
- Memory-host 不再导出无操作的会话目录 transcript 分类辅助工具；transcript 过滤现在在条目构造期间从 SQLite 行元数据派生。
- Memory-host 和 QMD 会话导出测试使用 SQLite transcript 范围。旧的 `agents/<agentId>/sessions/*.jsonl` 路径仅在测试有意验证 doctor／import／export 兼容性时保留覆盖。
- QA-lab 原始会话检查现在通过网关使用 `sessions.list`，而不是读取 `agents/qa/sessions/sessions.json`；MSteams 反馈直接追加到 SQLite transcript，不再伪造 JSONL 路径。
- 共享入站通道轮次现在携带 `{agentId, sessionKey}`，而不是旧的 `storePath`。LINE、WhatsApp、Slack、Discord、Telegram、Matrix、Signal、iMessage、BlueBubbles、Feishu、Google Chat、IRC、Nextcloud Talk、Zalo、Zalo Personal、QA Channel、Microsoft Teams、Mattermost、Synology Chat、Tlon、Twitch 和 QQBot 的记录路径现在通过 SQLite 身份读取更新时间元数据并记录入站会话行。
- 活动会话行中的 transcript 定位符持久化已移除。`resolveSessionTranscriptTarget` 返回 `agentId`、`sessionId` 和可选的 topic 元数据；doctor 是唯一导入旧版 transcript 文件名的代码。
- 运行时 transcript 标头从 SQLite 版本 `1` 开始。旧版 JSONL V1／V2／V3 形状升级仅存在于 doctor 导入中，导入的标头会在存储行之前规范化为当前 SQLite transcript 版本。
- 数据库优先保护机制现在禁止 `SessionManager.listAll` 和 `SessionManager.forkFromSession`；会话列表和 fork／恢复工作流必须使用行／范围化 SQLite API。
- 该保护机制还禁止 doctor／import 代码之外的旧版 transcript JSONL 解析／活动分支修复辅助工具名称，防止运行时再次建立旧版 transcript 迁移路径。
- 嵌入式 PI 运行会拒绝传入的 transcript 句柄。它在 worker 启动前以及尝试访问 transcript 状态前再次使用 SQLite 的 `{agentId, sessionId}` 身份。过期的 `/tmp/*.jsonl` 输入无法选择运行时写入目标。
- Cache trace、Anthropic 载荷、原始流和诊断时间线输出是选择性启用的 JSONL 产物。`OPENCLAW_CACHE_TRACE_FILE`、`OPENCLAW_ANTHROPIC_PAYLOAD_LOG_FILE`、`OPENCLAW_RAW_STREAM_PATH` 和 `OPENCLAW_DIAGNOSTICS_TIMELINE_PATH` 仍是受支持的路径控制项。网关稳定性包使用类型化 SQLite `diagnostic_stability_bundles` 行，并可物化为显式支持导出。
- Cron 持久化现在协调 SQLite `cron_jobs` 行，而不是每次保存都删除并重新插入整个任务表。插件目标回写直接更新匹配的 cron 行，并在同一个状态数据库事务中保持运行时 cron 状态。
- Cron 运行时调用方现在使用稳定的 SQLite cron 存储键。旧版 `cron.store` 路径仅是 doctor 导入输入；生产网关、任务维护、状态、运行历史和 Telegram 目标回写路径使用 `resolveCronStoreKey`，不再对该键执行路径规范化。Cron 状态现在报告 `storeKey`，而不是旧的文件形 `storePath` 字段。
- Cron 运行时加载和调度不再规范化旧版持久化任务形状，例如 `jobId`、`schedule.cron`、数字形式的 `atMs`、字符串布尔值或缺失的 `sessionTarget`。Doctor 旧版导入负责在行插入 SQLite 前修复这些内容。
- ACP spawn 不再解析或持久化 transcript JSONL 文件路径。Spawn 和 thread-bind 设置直接持久化 SQLite 会话行，并将会话 id 保留为 transcript 身份。
- ACP 会话元数据 API 现在按 `agentId` 读取／列出／upsert SQLite 行，不再在 ACP 会话条目契约中暴露 `storePath`。
- 会话用量记账和网关用量聚合现在仅按 `{agentId, sessionId}` 解析 transcript。成本／用量缓存和已发现会话摘要不再合成或返回 transcript 定位符字符串。
- 网关聊天追加、中止部分持久化、`/sessions.send` 和 webchat 媒体 transcript 写入现在直接通过 SQLite transcript 范围追加。网关 transcript 注入辅助工具不再接受 `transcriptLocator` 参数。
- SQLite transcript 发现现在仅列出 transcript 范围和统计信息：`{agentId, sessionId, updatedAt, eventCount}`。已废弃的 `listSqliteSessionTranscriptLocators` 兼容辅助工具和每行的 `locator` 字段已移除。
- Transcript 运行时修复现在仅暴露 `repairTranscriptSessionStateIfNeeded({agentId, sessionId})`。旧的基于定位符的修复辅助工具已删除；doctor／debug 代码读取显式源文件路径，从不迁移定位符字符串。
- ACP replay ledger 运行时现在将每会话 replay 行存储在共享 SQLite 状态数据库中，而不是 `acp/event-ledger.json`；doctor 会导入并移除旧文件。
- 网关 transcript reader 辅助工具现在位于 `src/gateway/session-transcript-readers.ts`，而不是旧的 `session-utils.fs` 模块名。回退重试历史检查现在以 SQLite transcript 内容命名，而不是旧的文件辅助工具接口。
- 网关注入聊天和压缩辅助工具现在通过内部辅助 API 传递 SQLite transcript 范围，而不是将值命名为 transcript 路径或源文件。
- Bootstrap 继续检测现在通过 `hasCompletedBootstrapTranscriptTurn` 检查 SQLite transcript 行；不再暴露文件形辅助工具名称。
- 嵌入式 runner 测试现在使用 SQLite transcript 身份，打开新的 transcript 管理器始终需要显式的 `sessionId`。
- 内存索引辅助工具现在端到端使用 SQLite transcript 术语：host 导出 `listSessionTranscriptScopesForAgent` 和 `sessionTranscriptKeyForScope`，定向同步队列使用 `sessionTranscripts`，公开会话搜索命中项暴露不透明的 `transcript:<agent>:<session>` 路径，内部数据库源键在 `source_kind='sessions'` 下为 `session:<session>`，而不是伪造的文件路径。
- 通用插件 SDK 持久化去重辅助工具不再暴露文件形选项。调用方提供 SQLite 范围键，持久化去重行存储在共享插件状态中。
- Microsoft Teams SSO token 已从加锁 JSON 文件迁移到 SQLite 插件状态。Doctor 导入 `msteams-sso-tokens.json`，根据载荷重建规范 SSO token 键，并移除源文件。委托 OAuth token 仍保留在现有的私有凭据文件边界中。
- Matrix 同步缓存状态已从 `bot-storage.json` 迁移到 SQLite 插件状态。Doctor 导入旧版原始或包装后的同步载荷并移除源文件。活动 Matrix 和 QA Lab Matrix 适配器客户端传递 SQLite 同步存储根目录，而不是伪造的 `sync-store.json` 或 `bot-storage.json` 路径。
- Matrix 旧版加密迁移状态已从 `legacy-crypto-migration.json` 迁移到 SQLite 插件状态。Doctor 导入旧状态文件；Matrix SDK IndexedDB 快照已从 `crypto-idb-snapshot.json` 迁移到 SQLite 插件 blob。Matrix 恢复密钥和凭据是 SQLite 插件状态行；旧 JSON 文件仅是 doctor 迁移输入。
- Memory Wiki 活动日志现在使用 SQLite 插件状态，而不是 `.openclaw-wiki/log.jsonl`。Memory Wiki 迁移 provider 导入旧 JSONL 日志；wiki markdown 和用户 vault 内容仍由文件支持，作为工作区内容。
- Memory Wiki 不再创建 `.openclaw-wiki/state.json` 或未使用的 `.openclaw-wiki/locks` 目录。如果旧版 vault 仍有这些已废弃的插件元数据文件，迁移 provider 会将其移除。
- 系统代理审计条目现在使用 Core SQLite 插件状态，而不是 `audit/crestodian.jsonl`。Doctor 导入旧版 JSONL 审计日志，并在成功导入后将其移除。
- 配置写入／观察审计条目现在使用 Core SQLite 插件状态，而不是 `logs/config-audit.jsonl`。Doctor 导入旧版 JSONL 审计日志，并在成功导入后将其移除。
- macOS companion 在编辑 `openclaw.json` 时不再写入应用本地的 `logs/config-audit.jsonl` 或 `logs/config-health.json` 旁车文件。配置文件仍由文件支持，恢复快照仍保存在配置文件旁边，持久化配置审计／健康状态属于 Gateway SQLite 存储。
- 系统代理救援待处理审批现在使用 Core SQLite 插件状态，而不是 `crestodian/rescue-pending/*.json` 或 `openclaw/rescue-pending/*.json`。这些短生命周期安全能力永不导入；doctor 会丢弃两个已废弃的目录，防止升级重新激活过期写入。
- 已废弃的 Phone Control 租约状态不再是运行时状态。Doctor 在规范配置清理后丢弃其 SQLite 插件状态日志，并归档旧版 `plugins/phone-control/armed.json` 源文件。
- Doctor 不再原地修复 JSONL transcript，也不再创建备份 JSONL 文件。它将活动分支导入 SQLite，并移除旧源。
- Session-memory hook transcript 查找仅使用 `{agentId, sessionId}` 范围化 SQLite 读取。其辅助工具不再接受或派生 transcript 定位符、旧版文件读取或文件重写选项。
- Codex app-server conversation 绑定现在以 OpenClaw 会话键或显式 `{agentId, sessionId}` 范围为键存储 SQLite 插件状态。不得保留 transcript 路径回退绑定。
- Codex app-server 镜像历史读取仅使用 SQLite transcript 范围；不得从 transcript 文件路径恢复身份。
- 角色排序和压缩重置路径不再 unlink 旧 transcript 文件；重置仅轮换 SQLite 会话行和 transcript 身份。
- 网关重置和 checkpoint 响应返回干净的会话行及会话 id。不再为客户端合成 SQLite transcript 定位符。
- Memory-core dreaming 不再通过探测缺失 JSONL 文件来清理会话行。子代理清理通过会话运行时 API 完成，而不是文件系统存在性检查。其 transcript 摄取测试直接播种 SQLite 行，而不是创建 `agents/<id>/sessions` 夹具或定位符占位值。
- Memory transcript 索引可能将 `transcript:<agentId>:<sessionId>` 暴露为供引用／读取辅助工具使用的虚拟搜索命中路径。持久化索引源是关系型数据（`source_kind='sessions'`、`source_key='session:<sessionId>'`、`session_id=<sessionId>`），因此该值不是运行时 transcript 定位符，不是文件系统路径，绝不能传回会话运行时 API。
- 网关 doctor memory 状态从 SQLite 插件状态行读取短期回忆和阶段信号计数，而不是从 `memory/.dreams/*.json` 读取；CLI 和 doctor 输出现在将该存储标记为 SQLite store，而不是路径。
- Memory-core 运行时、CLI 状态、Gateway doctor 方法和插件 SDK 门面不再审计或归档旧版 `.dreams/session-corpus` 文件。这些文件仅是迁移输入；doctor 将其导入 SQLite，并在验证后删除源。活动会话摄取证据行现在使用虚拟 SQLite 路径 `memory/session-ingestion/<day>.txt`；运行时不会写入或从 `.dreams/session-corpus` 派生状态。
- Memory-core 公共产物将 SQLite host 事件暴露为虚拟 JSON 产物 `memory/events/memory-host-events.json`；不再复用旧版 `.dreams/events.jsonl` 源路径。
- Sandbox 容器／浏览器注册表现在使用共享的 `sandbox_registry_entries` SQLite 表，其中包含类型化的会话、镜像、时间戳、后端／配置和浏览器端口列。Doctor 导入旧版单体和分片 JSON 注册表文件，并移除成功导入的源。运行时读取以类型化行列为事实来源；`entry_json` 仅是重放／调试副本。
- 共享架构版本 7 会验证并移除准确匹配的已废弃 `commitments` 表，并丢弃其中的惰性行。同名但未知的表或索引会被保留，迁移会被拒绝。运行时不再读取或写入 commitment 状态。Doctor 保留旧版 `commitments.json` 源文件不变。
- Web Push 订阅和生成的 VAPID 身份现在使用类型化共享的 `web_push_subscriptions` 和 `web_push_vapid_keys` 行。运行时注册、过期清理和首次使用时的密钥生成使用行级 SQLite 事务。显式 Doctor 修复会验证两个已废弃的 JSON 存储，在 SQLite 写入前声明它们，以原子方式导入，拒绝冲突的 VAPID 身份，验证结果，然后才移除声明。Doctor 在整个导入期间持有状态目录维护锁，使旧版 Gateway 无法重新创建已废弃文件。在 Doctor 解决待处理旧源或中断的声明之前，注册、投递、删除和密钥解析会 fail closed。
- Cron 作业定义、调度状态和运行历史不再具有运行时 JSON 写入器或读取器。运行时使用带有类型化调度、载荷、投递、失败提醒、会话、状态和运行时状态列的 `cron_jobs` 行，并使用 cron 所有的 `task_runs` 详细信息记录诊断、投递、会话／运行、模型和 token 总量。`job_json` 仅是重放／调试副本；`state_json` 保留尚未拥有热查询字段的嵌套运行时诊断，而运行时从类型化列重新填充热状态字段。Doctor 导入旧版 `jobs.json`、`jobs-state.json` 和 `runs/*.jsonl` 文件，并移除已导入的源。插件目标回写更新匹配的 `cron_jobs` 行，而不是加载并替换整个 cron 存储。
- 网关启动会忽略运行时投影中的旧版 `notify: true` 标记。Doctor 仅在将这些标记转换为显式 SQLite 投递时读取已废弃的原始 `cron.webhook`，随后移除该配置键。
- 外发和会话投递队列现在将队列状态、条目类型、会话键、通道、目标、账户 id、重试次数、最近尝试／错误、恢复状态和平台发送标记作为类型化列存储在共享的 `delivery_queue_entries` 表中。运行时恢复从类型化列读取这些热字段，重试／恢复变更直接更新这些列，而不重写重放 JSON。完整 JSON 载荷仅作为消息正文和其他冷重放数据的重放／调试 blob 保留。
- 托管外发图片记录现在使用类型化共享的 `managed_outgoing_image_records` 行。运行时仅读取类型化列；JSON 列是重放／调试副本。原始图片字节仍是托管媒体目录中带名称的附件产物。
- Discord 模型选择器偏好、命令部署哈希和 thread 绑定现在使用共享 SQLite 插件状态。其旧版 JSON 导入计划位于 Discord 插件设置／doctor 迁移接口，而不是 Core 迁移代码中。
- 插件旧版导入检测器使用 `doctor-legacy-state.ts` 或 `doctor-state-imports.ts` 等以 doctor 命名的模块；普通通道运行时模块不得导入旧版 JSON 检测器。
- BlueBubbles 追赶游标和入站去重标记现在使用共享 SQLite 插件状态。其旧版 JSON 导入计划位于 BlueBubbles 插件设置／doctor 迁移接口，而不是 Core 迁移代码中。
- Telegram 更新偏移、贴纸缓存行、已发送消息缓存行、topic 名称缓存行和 thread 绑定现在使用共享 SQLite 插件状态。其旧版 JSON 导入计划位于 Telegram 插件设置／doctor 迁移接口，而不是 Core 迁移代码中。
- iMessage 追赶游标、回复短 id 映射和已发送回声去重行现在使用共享 SQLite 插件状态。旧的 `imessage/catchup/*.json`、`imessage/reply-cache.jsonl` 和 `imessage/sent-echoes.jsonl` 文件仅作为 doctor 输入。
- Feishu 消息去重行现在使用 Core 可声明的去重功能（共享 SQLite 插件状态中的 `feishu.dedup.*` 命名空间），而不是 `feishu/dedup/*.json` 文件或已废弃的手写 `dedup.*` 存储；由于升级后会重建重放保护缓存，因此不进行旧版导入。
- Microsoft Teams conversation、poll、待处理上传缓冲区和反馈学习现在使用共享 SQLite 插件状态／blob 表。待处理上传路径使用 `plugin_blob_entries`，因此媒体缓冲区以 SQLite BLOB 而不是 base64 JSON 存储。运行时辅助工具名称现在使用 SQLite／状态命名，而不是 `*-fs` 文件存储命名，这些存储中的旧 `storePath` shim 已移除。其旧版 JSON 导入计划位于 Microsoft Teams 插件设置／doctor 迁移接口。
- Zalo 托管外发媒体现在使用共享 SQLite `plugin_blob_entries`，而不是 `openclaw-zalo-outbound-media` JSON／bin 临时旁车文件。
- Diffs viewer HTML 和元数据现在使用共享 SQLite `plugin_blob_entries`，而不是 `meta.json`／`viewer.html` 临时文件。Viewer HTML 作为 gzip blob 存储，仅持久化 URL token 哈希。渲染出的 PNG／PDF 输出仍是临时物化，因为通道投递仍需要文件路径；其过期元数据由 SQLite 管理，不使用 JSON 旁车文件。
- Canvas 托管文档现在使用共享 SQLite `plugin_blob_entries`，而不是默认的 `state/canvas/documents` 目录。Canvas host 直接提供这些 blob；仅当存在显式的 `host.root` 操作者内容，或下游媒体读取器需要路径进行临时物化时，才创建本地文件。
- File Transfer 审计决策现在使用共享 SQLite `plugin_state_entries`，而不是无界的 `audit/file-transfer.jsonl` 运行时日志。Doctor 将旧版 JSONL 审计文件导入插件状态，并在干净导入后移除源文件。
- ACPX 进程租约和网关实例身份现在使用共享 SQLite 插件状态。Doctor 将旧版 `gateway-instance-id` 文件导入插件状态，并移除源文件。
- ACPX 生成的包装脚本和隔离的 Codex home 是 OpenClaw 临时根目录下的临时物化内容，不是持久化 OpenClaw 状态。持久化 ACPX 运行时记录是 SQLite 租约和网关实例行；旧的 ACPX `stateDir` 配置接口已移除，因为运行时不再在那里写入状态。
- 网关媒体附件现在使用共享的 `media_blobs` SQLite 表作为规范字节存储。返回给通道和 sandbox 兼容接口的本地路径是数据库行的临时物化，而不是持久化媒体存储。运行时媒体 allowlist 不再包含旧版 `$OPENCLAW_STATE_DIR/media` 或配置目录下的 `media` 根目录；这些目录仅是 doctor 导入源。
- Shell 补全不再写入 `$OPENCLAW_STATE_DIR/completions/*` 缓存文件。安装、doctor、更新和发布 smoke 路径使用生成的补全输出或 profile 加载，而不是持久化补全缓存文件。
- 网关 skill 上传暂存现在使用共享的 `skill_uploads` 和 `skill_upload_chunks` 行。上传期间各 chunk 保持独立事务，随后提交操作组装一个经过验证的归档 BLOB 并移除 chunk 行。安装程序仅在安装运行期间接收临时物化的归档路径。Doctor 丢弃已废弃的一小时文件系统暂存树，而不是导入临时上传内容。
- 子代理内联附件物化在子工作区的 `.openclaw/attachments/<attachmentId>/` 目录下。子代理注册表保留附件和根目录，使生命周期清理能够移除它们。
- CLI 图片 hydration 不再维护稳定的 `openclaw-cli-images` 缓存文件。外部 CLI 后端仍接收文件路径，但这些路径是每次运行的临时物化内容，并会被清理。
- Cache-trace 诊断、Anthropic 载荷诊断、原始模型流和诊断时间线事件会写入可选启用的 JSONL 产物，并使用有界且有文档说明的路径控制。网关稳定性包仍由 SQLite 支持，支持导出可将最新包物化为 JSON。
- macOS companion 具有可选的轮换 `diagnostics.jsonl` 写入器，位于 `~/Library/Logs/OpenClaw`，与统一日志并列。
- macOS port-guardian 记录列表现在使用类型化共享 SQLite `macos_port_guardian_records` 行，而不是 Application Support JSON 文件或不透明的单例 blob。所有 macOS 应用 profile 使用同一个主机全局原生数据库，因为它们需要协调机器本地端口。每次 ledger 操作都会在旧版写入 JSON 的应用副本运行时阻塞。迁移仅加入旧 ledger 的稳定文件锁协议，用于快照并在之后重新验证源；随后在不持有该锁的情况下，根据实时命令和进程启动事实解析每条旧记录，再重新读取权威 SQLite 行、应用计划、验证每张回执，并移除源。移除重试会为缺失行重新制定计划，因此已废弃的过时回执无法复活。锁保持短生命周期，避免 SSH 启动后使旧写入器陷入阻塞。切换有意设置为单向：稳定状态运行时从不读取、投影或写入 JSON，回滚到仅使用 JSON 的构建不会保留更新的 SQLite 回执。
- 网关单例锁现在使用 `gateway_locks` 范围下类型化共享 SQLite `state_leases` 行，而不是临时目录锁文件。Fly 和 OAuth 故障排除文档现在指向 SQLite 租约／身份验证刷新锁，而不是过时的文件锁清理。
- 网关重启标记状态现在使用类型化共享 SQLite `gateway_restart_sentinel` 行，而不是 `restart-sentinel.json`；运行时从类型化列读取标记类型、状态、路由、消息、继续信息和统计数据。这些列是权威来源；`payload_json` 仅是重放／调试影子。运行时读取、写入和清除路径仅使用 SQLite。一个有界的状态迁移模块会在启动期间和 Doctor 运行期间导入经过验证的旧版更新后标记，然后再进行正常重启恢复；它会验证类型化行并移除源文件。稳定状态运行时模块不会读取、写入或清理旧文件。
- 网关重启意图和 supervisor 交接状态现在使用类型化共享 SQLite `gateway_restart_intent` 和 `gateway_restart_handoff` 行，而不是 `gateway-restart-intent.json` 和 `gateway-supervisor-restart-handoff.json` 旁车文件。
- 网关单例协调现在使用 `gateway_locks` 范围下的类型化 `state_leases` 行，而不是写入 `gateway.<hash>.lock` 文件。租约行拥有锁所有者、过期时间、心跳和调试载荷；SQLite 负责原子获取／释放边界。已废弃的文件锁目录选项已移除；测试直接使用 SQLite 行身份。
- 旧的未引用 cron 用量报告辅助工具（扫描 `cron/runs/*.jsonl` 文件）已删除。Cron 运行历史报告读取 cron 所有的 `task_runs` 行。
- 主会话重启恢复现在通过 SQLite `agent_databases` 注册表发现候选代理，而不是扫描 `agents/*/sessions` 目录。
- Gemini 会话损坏恢复现在仅删除 SQLite 会话行；不再需要旧版 `storePath` 门控，也不再尝试 unlink 派生的 transcript JSONL 路径。
- 路径覆盖处理现在将字面值为 `undefined`／`null` 的环境值视为未设置，防止测试或 shell 交接期间意外产生仓库根目录下的 `undefined/state/*.sqlite` 数据库。
- 配置健康指纹现在使用类型化共享 SQLite `config_health_entries` 行，而不是 `logs/config-health.json`，使普通配置文件成为唯一的非凭据配置文档。macOS companion 仅保留进程本地健康状态，不会重新创建旧 JSON 旁车文件。
- Auth profile 运行时不再导入或写入凭据 JSON 文件。规范凭据存储是 SQLite；`auth-profiles.json`、每个代理的 `auth.json` 和共享的 `credentials/oauth.json` 是 doctor 迁移输入，导入后会被移除。
- Auth profile 保存／状态测试现在直接断言类型化 SQLite auth 表，并且仅将旧版 auth-profile 文件名作为 doctor 迁移输入使用。
- `openclaw secrets apply` 会清理配置文件、环境文件和 SQLite
  仅限 auth-profile store。它不再携带会编辑已停用的每个代理 `auth.json` 的兼容性逻辑；doctor 负责导入和删除该文件。
- Hermes secret 迁移计划会将导入的 API-key 配置直接应用到 SQLite auth-profile store。它不再将 `auth-profiles.json` 写入或验证为中间目标。
- 面向用户的 auth 文档现在描述
  `state/openclaw.sqlite#table/auth_profile_stores/<agentDir>`，而不是告知用户检查或复制 `auth-profiles.json`；旧版 OAuth/auth JSON 名称仍仅作为 doctor 导入输入进行记录。
- MCP OAuth 会话现在使用共享
  `state/openclaw.sqlite` 中有版本号的 `mcp_oauth_stores` 行。SDK 所有的 token、客户端注册和发现对象仍保存在一个经过验证的 JSON 负载中，因此依赖项扩展字段可以保留，同时每次读取／修改／写入都会在一个短 Kysely 事务中提交。一个共享 SQLite 租约会串行化刷新、登录和注销；嵌入式 MCP 传输不再允许 MCP SDK 在该租约之外刷新。Doctor 专门负责导入和删除已停用的 `mcp-oauth/*.json` store，并记录源收据；运行时没有文件回退。
- Core state-path helper 不再暴露已停用的 `credentials/oauth.json` 文件。旧文件名仅存在于 doctor auth 导入路径中。
- Install、security、onboarding、model-auth 和 SecretRef 文档现在描述 SQLite auth-profile 行以及整个状态的备份／迁移，而不是按代理划分的 auth-profile JSON 文件。
- PI model discovery 现在将规范化凭据传入内存中的
  `pi-coding-agent` auth storage。它在 discovery 期间不再创建、清理或写入每个代理的 `auth.json`。
- Voice Wake 触发器和路由设置现在使用类型化的共享 SQLite 表，而不是 `settings/voicewake.json`、`settings/voicewake-routing.json` 或不透明的通用行；doctor 会导入旧版 JSON 文件，并在迁移成功后删除它们。
- 更新检查状态现在使用类型化的共享 `update_check_state` 行，而不是 `update-check.json` 或不透明的通用 blob；doctor 会导入旧版 JSON 文件，并在迁移成功后删除它。
- Config health 状态现在使用类型化的共享 `config_health_entries` 行，而不是 `logs/config-health.json` 或不透明的通用 blob；doctor 会导入旧版 JSON 文件，并在迁移成功后删除它。
- Plugin conversation binding approvals 现在使用类型化的
  `plugin_binding_approvals` 行，而不是不透明的共享 SQLite 状态或
  `plugin-binding-approvals.json`；旧文件仅作为 doctor 迁移输入。
- 通用 current-conversation bindings 现在存储类型化的
  `current_conversation_bindings` 行，而不是重写
  `bindings/current-conversations.json`；doctor 会导入旧版 JSON 文件，并在迁移成功后删除它。
- Memory Wiki 导入源同步账本现在针对每个 vault/source key 存储一个 SQLite plugin-state 行，而不是重写 `.openclaw-wiki/source-sync.json`；迁移 provider 会导入并删除旧版 JSON 账本。
- Memory Wiki ChatGPT 导入运行记录现在针对每个 vault/run id 存储一个 SQLite plugin-state 行，而不是写入 `.openclaw-wiki/import-runs/*.json`。
  回滚快照在 import-run snapshot archival 移入 blob storage 之前，仍保留为明确的 vault 文件。
- Memory Wiki 编译后的摘要现在存储为压缩的 SQLite plugin-blob 行，而不是写入 `.openclaw-wiki/cache/agent-digest.json` 和 `.openclaw-wiki/cache/claims.jsonl`。缓存可重建，因此 doctor 会删除旧缓存文件，而不导入它们。
- ClawHub skill install tracking 现在针对每个 workspace/skill 存储一个 SQLite plugin-state 行，而不是在运行时写入或读取 `.clawhub/lock.json` 和 `.clawhub/origin.json` sidecar。运行时代码使用 tracked-install 状态对象，而不是文件形态的 lockfile／origin 抽象。Doctor 会从已配置的代理 workspace 导入旧版 sidecar，并在干净导入后删除它们。
- 已安装的 plugin index 现在读取和写入类型化共享 SQLite 的
  `installed_plugin_index` singleton 行，而不是 `plugins/installs.json`；旧版 JSON 文件仅作为 doctor 迁移输入，并在导入后删除。
- 旧版 `plugins/installs.json` path helper 现在位于 doctor legacy code 中。运行时 plugin-index 模块仅暴露 SQLite-backed persistence option，不再暴露 JSON 文件路径。
- Gateway restart sentinel、restart intent 和 supervisor handoff 状态现在使用类型化的共享 SQLite 行（`gateway_restart_sentinel`、`gateway_restart_intent` 和 `gateway_restart_handoff`），而不是通用的不透明 blob。运行时重启代码没有文件形态的 sentinel／intent／handoff contract。
- Matrix sync cache、storage metadata、thread bindings、inbound dedupe markers、startup verification cooldown state、SDK IndexedDB crypto snapshots、credentials 和 recovery keys 现在使用共享 SQLite plugin state/blob 表。运行时 path struct 不再暴露 `storage-meta.json` metadata path；该文件名仅作为旧版迁移输入。它们的旧版 JSON 导入计划位于 Matrix plugin setup／doctor migration surface 中。Inbound dedupe markers 使用 core claimable dedupe（共享 state DB 中的 `matrix.inbound-dedupe.*` namespace）；Matrix doctor state migration 会导入已停用的每个 root 的 `inbound-dedupe` 行和 `inbound-dedupe.json` 一次，之后运行时只读取 claimable-dedupe store。
- Matrix 启动时不再扫描、报告或完成旧版 Matrix 文件状态。Matrix 文件检测、旧版 crypto snapshot 创建、room-key restore migration state、导入和源移除全部由 doctor 负责。
- Matrix runtime migration barrel 已移除。旧版 state／crypto 检测和 mutation helper 由 Matrix doctor 直接导入，而不再属于 runtime API surface。
- Matrix migration snapshot reuse marker 现在位于 SQLite plugin state 中，而不是 `matrix/migration-snapshot.json`；doctor 仍可复用相同的、经过验证的迁移前 archive，而无需写入 sidecar state file。
- Nostr bus cursor 和 profile publish state 现在使用共享 SQLite plugin state。它们的旧版 JSON 导入计划位于 Nostr plugin setup／doctor migration surface 中。
- Active Memory session toggle 现在使用共享 SQLite plugin state，而不是 `session-toggles.json`；重新开启 memory 时会删除该行，而不是重写 JSON object。
- Skill Workshop proposal 和 review counter 现在使用共享 SQLite plugin state，而不是按 workspace 划分的 `skill-workshop/<workspace>.json` store。每个 proposal 是 `skill-workshop/proposals` 下的独立行，review counter 是 `skill-workshop/reviews` 下的独立行。
- Skill Workshop reviewer subagent run 现在使用 runtime session transcript resolver，而不是创建 `skill-workshop/<sessionId>.json` sidecar session path。
- ACPX process lease 现在使用 `acpx/process-leases` 下的共享 SQLite plugin state，而不是完整文件形式的 `process-leases.json` registry。每个 lease 都作为独立行存储，同时保留启动时回收过期进程的能力，且运行时没有 JSON 重写路径。
- ACPX wrapper script 和隔离的 Codex home 在 OpenClaw temp root 中生成。它们会按需重新创建，不属于备份或迁移输入。
- Subagent run registry persistence 使用类型化的共享 `subagent_runs` 行。旧版 `subagents/runs.json` path 现在仅作为 Doctor cleanup input。Doctor 会在 state maintenance lock 下认领该文件，将 discard decision 记录到 SQLite，并删除它，而不导入临时运行状态。运行时不再保留 JSON reader、writer、cache 或 fallback；在这一退役边界上，有意不支持仅存在于文件中的进行中 run 的跨版本恢复。
  运行时测试不再创建无效或空的 `runs.json` fixture 来验证 registry 行为；它们直接 seed／read SQLite 行。
- Backup 会在归档前暂存 state directory，复制非数据库文件，使用 online backup 加离线 `VACUUM` 对数据库进行 snapshot，省略活动的 WAL／SHM sidecar，在 archive manifest 中记录 snapshot metadata，并将已完成的 backup run 与 archive manifest 一起记录在 SQLite 中。`openclaw backup create` 默认验证写入的 archive；`--no-verify` 是明确的快速路径。
- `openclaw backup restore` 会在 extraction 前验证 archive，复用 verifier 的 normalized manifest，并将已验证的 manifest asset 恢复到其记录的 source path。写入操作需要 `--yes`，并支持对 restore plan 使用 `--dry-run`。
- 旧版 backup volatile-path filter 已删除。由于 SQLite snapshot 会在创建 archive 前暂存，Backup 不再需要针对旧版 session 或 cron JSON／JSONL 文件的 live-tar skip list。
- Plain setup 和 onboarding workspace preparation 不再创建 `agents/<agentId>/sessions/` directory。它们只创建 config／workspace；SQLite session row 和 transcript row 会在每个代理的 database 中按需创建。
- Security permission repair 现在针对全局和每个代理的 SQLite database 以及 WAL／SHM sidecar，而不是 `sessions.json` 和 transcript JSONL 文件。
- Sandbox registry runtime name 现在直接描述 SQLite registry kind，而不是在 active store 中携带旧版 JSON registry 术语。
- `openclaw reset --scope config+creds+sessions` 会删除每个代理的 `openclaw-agent.sqlite` database 以及 WAL／SHM sidecar，而不只是旧版 `sessions/` directory。
- Gateway aggregate session helper 现在使用面向 entry 的名称：
  `loadCombinedSessionEntriesForGateway` 返回 `{ databasePath, entries }`。
  旧版 combined-store naming 已从 runtime caller 中移除。
- Docker MCP channel seeding 现在将 main session row 和 transcript event 写入每个代理的 SQLite database，而不是创建 `sessions.json` 和 JSONL transcript。
- 内置 session-memory hook 现在通过 `{agentId, sessionId}` 从 SQLite 解析 previous-session context。它不再扫描、存储或合成 transcript path 或 `workspace/sessions` directory。
- 内置 command-logger hook 现在将 command audit row 写入共享 SQLite 的
  `command_log_entries` table，而不是追加到 `logs/commands.log`。
- Channel pairing allowlist 在运行时只暴露 SQLite-backed read／write helper。已弃用的 plugin SDK path resolver 仍为迁移兼容性保留；文件 reader 仅存在于 doctor state migration code 中。
- `migration_runs` 记录 legacy-state migration execution，包括 status、timestamp 和 JSON report。
- `migration_sources` 记录每个已导入的 legacy file source，包括 hash、size、record count、target table、run id、status 和 source-removal state。
- `backup_runs` 记录 backup archive path、status 和 JSON manifest。
- Global schema 不保留未使用的 `agents` registry table。在 runtime 拥有真正的 agent-record owner 之前，agent database discovery 使用 canonical `agent_databases` registry。
- Generated model catalog config 存储在类型化的全局 SQLite
  `agent_model_catalogs` 行中，并以 agent directory 为 key。Runtime caller 使用
  `ensureOpenClawModelCatalog`；runtime code 中没有 `models.json` compatibility API。实现会写入 SQLite，并从存储的 payload hydrate embedded PI registry，而不会创建 `models.json` 文件。
- QMD 没有 runtime export、collection、SDK 或 lease surface。Doctor 会将已配置的 QMD path 迁移到 builtin `memory.search.extraPaths`，并可删除已停用的每个代理的 QMD index、model download、collection metadata 和 session export。当前由 host 拥有的 lease consumer 使用共享的 `state_leases` table；agent schema 17 会退役不带 tenant 的每个代理 table。
- 可选的 `memory-lancedb` plugin 不再将 `~/.openclaw/memory/lancedb` 作为隐式的 OpenClaw-managed store 创建。它是 external LanceDB backend，在 operator 配置明确的 `dbPath` 之前保持禁用。
- `check:database-first-legacy-stores` 会阻止新的 runtime source 将 legacy store name 与 write-style filesystem API 配对。它还会阻止 runtime source 重新引入已退役的 transcript bridge marker `transcriptLocator` 或 `sqlite-transcript://...`。Migration、doctor、import 和明确的非 session export code 仍然允许。更广泛的 legacy contract name，例如 `sessionFile`、`storePath` 和旧版 `SessionManager` file-era facade 仍有当前 owner，需要单独的 migration guard 工作后，才能成为必需的 preflight check。该 guard 现在还覆盖 runtime `cache/*.json` store、通用 `thread-bindings.json` sidecar、cron state／run-log JSON、config health JSON、restart 和 lock sidecar、Voice Wake settings、plugin binding approvals、installed plugin index JSON、File Transfer audit JSONL、Memory Wiki activity log 以及旧版内置 `command-logger` text log。它还禁止旧版 root-level doctor legacy module name，以便兼容性代码保持在 `src/commands/doctor/` 下。Android debug handler 也使用 logcat／in-memory output，而不是暂存 `camera_debug.log` 或 `debug_logs.txt` cache file。

## Target Schema Shape

保持 schema 明确。Host-owned runtime state 使用类型化 table。Plugin-owned opaque state 使用 `plugin_state_entries`／`plugin_blob_entries`；不存在通用 host `kv` table。

Global database：

```text
state_leases(scope, lease_key, owner, expires_at, heartbeat_at, payload_json, created_at, updated_at)
exec_approvals_config(config_key, raw_json, socket_path, has_socket_token, default_security, default_ask, default_ask_fallback, auto_allow_skills, agent_count, allowlist_count, updated_at_ms)
schema_meta(meta_key, role, schema_version, agent_id, app_version, created_at, updated_at)
agent_databases(agent_id, path, schema_version, last_seen_at, size_bytes)
task_runs(...)
task_delivery_state(...)
flow_runs(...)
subagent_runs(run_id, child_session_key, requester_session_key, controller_session_key, created_at, ended_at, cleanup_handled, payload_json)
current_conversation_bindings(binding_key, binding_id, target_agent_id, target_session_id, target_session_key, channel, account_id, conversation_kind, parent_conversation_id, conversation_id, target_kind, status, bound_at, expires_at, metadata_json, updated_at)
plugin_binding_approvals(plugin_root, channel, account_id, plugin_id, plugin_name, approved_at)
tui_last_sessions(scope_key, session_key, updated_at)
plugin_state_entries(plugin_id, namespace, entry_key, value_json, created_at, expires_at)
plugin_blob_entries(plugin_id, namespace, entry_key, metadata_json, blob, created_at, expires_at)
media_blobs(subdir, id, content_type, size_bytes, blob, created_at, updated_at)
skill_uploads(upload_id, kind, slug, force, size_bytes, sha256, actual_sha256, received_bytes, archive_blob, created_at, expires_at, committed, committed_at, idempotency_key_hash)
skill_upload_chunks(upload_id, byte_offset, size_bytes, chunk_blob)
web_push_subscriptions(endpoint_hash, subscription_id, endpoint, p256dh, auth, created_at_ms, updated_at_ms)
web_push_vapid_keys(key_id, public_key, private_key, subject, updated_at_ms)
apns_registrations(node_id, transport, token, relay_handle, send_grant, installation_id, relay_origin, topic, environment, distribution, token_debug_suffix, updated_at_ms)
apns_registration_tombstones(node_id, deleted_at_ms)
node_host_config(config_key, version, node_id, token, display_name, gateway_host, gateway_port, gateway_tls, gateway_tls_fingerprint, gateway_context_path, updated_at_ms)
device_identities(identity_key, device_id, public_key_pem, private_key_pem, created_at_ms, updated_at_ms)
device_auth_tokens(device_id, role, token, scopes_json, updated_at_ms)
macos_port_guardian_records(pid, port, command, mode, timestamp)
workspace_setup_state(workspace_key, workspace_path, version, bootstrap_seeded_at, setup_completed_at, updated_at)
workspace_path_aliases(alias_key, alias_path, workspace_key, workspace_path, updated_at_ms)
workspace_attestations(workspace_key, attested_at_ms, updated_at_ms)
workspace_generated_bootstrap_hashes(workspace_key, filename, sha256)
native_hook_relay_bridges(relay_id, pid, hostname, port, token, expires_at_ms, updated_at_ms)
model_capability_cache(provider_id, model_id, name, input_text, input_image, reasoning, supports_tools, context_window, max_tokens, cost_input, cost_output, cost_cache_read, cost_cache_write, updated_at_ms)
agent_model_catalogs(catalog_key, agent_dir, raw_json, updated_at)
managed_outgoing_image_records(attachment_id, session_key, agent_id, message_id, created_at, updated_at, retention_class, alt, original_media_id, original_media_subdir, original_content_type, original_width, original_height, original_size_bytes, original_filename, record_json, cleanup_pending)
gateway_restart_sentinel(sentinel_key, version, kind, status, ts, session_key, thread_id, delivery_channel, delivery_to, delivery_account_id, message, continuation_json, doctor_hint, stats_json, payload_json, updated_at_ms)
channel_pairing_requests(channel_key, account_id, request_id, code, created_at, last_seen_at, meta_json)
channel_pairing_allow_entries(channel_key, account_id, entry, sort_order, updated_at)
voicewake_triggers(config_key, position, trigger, updated_at_ms)
voicewake_routing_config(config_key, version, default_target_mode, default_target_agent_id, default_target_session_key, updated_at_ms)
voicewake_routing_routes(config_key, position, trigger, target_mode, target_agent_id, target_session_key, updated_at_ms)
update_check_state(state_key, last_checked_at, last_notified_version, last_notified_tag, last_available_version, last_available_tag, auto_install_id, auto_first_seen_version, auto_first_seen_tag, auto_first_seen_at, auto_last_attempt_version, auto_last_attempt_at, auto_last_success_version, auto_last_success_at, updated_at_ms)
config_health_entries(config_path, last_known_good_json, last_promoted_good_json, last_observed_suspicious_signature, updated_at_ms)
sandbox_registry_entries(registry_kind, container_name, session_key, backend_id, runtime_label, image, created_at_ms, last_used_at_ms, config_label_kind, config_hash, cdp_port, no_vnc_port, entry_json, updated_at)
cron_jobs(store_key, job_id, name, description, enabled, delete_after_run, created_at_ms, agent_id, session_key, schedule_kind, schedule_expr, schedule_tz, every_ms, anchor_ms, at, stagger_ms, session_target, wake_mode, payload_kind, payload_message, payload_model, payload_fallbacks_json, payload_thinking, payload_timeout_seconds, payload_allow_unsafe_external_content, payload_external_content_source_json, payload_light_context, payload_tools_allow_json, delivery_mode, delivery_channel, delivery_to, delivery_thread_id, delivery_account_id, delivery_best_effort, failure_delivery_mode, failure_delivery_channel, failure_delivery_to, failure_delivery_account_id, failure_alert_disabled, failure_alert_after, failure_alert_channel, failure_alert_to, failure_alert_cooldown_ms, failure_alert_include_skipped, failure_alert_mode, failure_alert_account_id, next_run_at_ms, running_at_ms, last_run_at_ms, last_run_status, last_error, last_duration_ms, consecutive_errors, consecutive_skipped, schedule_error_count, last_delivery_status, last_delivery_error, last_delivered, last_failure_alert_at_ms, job_json, state_json, runtime_updated_at_ms, schedule_identity, sort_order, updated_at)
delivery_queue_entries(queue_name, id, status, entry_kind, session_key, channel, target, account_id, retry_count, last_attempt_at, last_error, recovery_state, platform_send_started_at, entry_json, enqueued_at, updated_at, failed_at)
migration_runs(id, started_at, finished_at, status, report_json)
migration_sources(source_key, migration_kind, source_path, target_table, source_sha256, source_size_bytes, source_record_count, last_run_id, status, imported_at, removed_source, report_json)
backup_runs(id, created_at, archive_path, status, manifest_json)
```

Agent database：

```text
schema_meta(meta_key, role, schema_version, agent_id, app_version, created_at, updated_at)
sessions(session_id, session_key, session_scope, created_at, updated_at, started_at, ended_at, status, chat_type, channel, account_id, primary_conversation_id, model_provider, model, agent_harness_id, parent_session_key, spawned_by, display_name)
conversations(conversation_id, channel, account_id, kind, peer_id, parent_conversation_id, thread_id, native_channel_id, native_direct_user_id, label, metadata_json, created_at, updated_at)
session_conversations(session_id, conversation_id, role, first_seen_at, last_seen_at)
session_routes(session_key, session_id, updated_at)
session_entries(session_id, session_key, entry_json, updated_at)
transcript_events(session_id, seq, event_json, created_at)
transcript_event_identities(session_id, event_id, seq, event_type, has_parent, parent_id, message_idempotency_key, created_at)
transcript_snapshots(session_id, snapshot_id, reason, event_count, created_at, metadata_json)
vfs_entries(namespace, path, kind, content_blob, metadata_json, updated_at)
tool_artifacts(run_id, artifact_id, kind, metadata_json, blob, created_at)
run_artifacts(run_id, path, kind, metadata_json, blob, created_at)
trajectory_runtime_events(session_id, run_id, seq, event_json, created_at)
memory_index_meta(key, value)
memory_index_sources(id, path, source, hash, mtime, size)
memory_index_chunks(id, path, source, start_line, end_line, hash, model, text, embedding, updated_at)
memory_embedding_cache(provider, model, provider_key, hash, embedding, dims, updated_at)
memory_index_state(id, revision)
cache_entries(scope, key, value_json, blob, expires_at, updated_at)
```

`memory_index_sources.id` 是稳定的整数主键；`(path, source)` 仍然保持唯一。

未来的搜索可以添加 FTS table，而无需更改 canonical event table：

```text
transcript_events_fts(session_id, seq, text)
vfs_entries_fts(namespace, path, text)
```

较大的值应使用 `blob` column，而不是 JSON string encoding。对于必须能够通过普通 SQLite tooling 检查的小型结构化数据，保留 `value_json`。

`agent_databases` 是此分支的 canonical registry。在存在真正的 agent-record owner 之前，不要添加 `agents` table；agent config 仍保留在 `openclaw.json` 中。

## Doctor Migration Shape

Doctor 应调用一个明确、可报告且可安全重复运行的 migration step：

```bash
openclaw doctor --fix
```

`openclaw doctor --fix` 会在普通 config preflight 之后调用 state migration implementation，并在导入前创建经过验证的 backup。Runtime startup 和 `openclaw migrate` 不得导入旧版 OpenClaw state file。

Migration properties：

- 一次 migration pass 会发现所有 legacy file source，并在执行任何变更前生成 plan。
- Doctor 会在导入 legacy file 前创建经过验证的 migration 前 backup archive。
- Import 是幂等的，并以 source path、mtime、size、hash 和 target table 为 key。
- 在 target database 提交后，成功处理的 source file 会被删除或归档。
- 失败的 import 会保留 source 不变，并在 `migration_runs` 中记录 warning。
- 只有在 migration 存在后，runtime code 才会读取 SQLite。
- 不需要 downgrade／export-to-runtime-files path。

## Migration Inventory

将以下内容移入 global database：

- Task registry runtime write 现在使用 shared database；未发布的 `tasks/runs.sqlite` sidecar importer 已删除。Snapshot save 会按 task id upsert，并仅删除缺失的 task／delivery row。
- Task Flow runtime write 现在使用 shared database；未发布的 `tasks/flows/registry.sqlite` sidecar importer 已删除。Snapshot save 会按 flow id upsert，并仅删除缺失的 flow row。
- Plugin state runtime write 现在使用 shared database；未发布的 `plugin-state/state.sqlite` sidecar importer 已删除。
- Builtin memory search 不再默认使用 `memory/<agentId>.sqlite`；其 index table 位于所属 agent database 中，显式的 `memorySearch.store.path` sidecar opt-in 已退役，并交由 doctor config migration 处理。
- Builtin memory reindex 只重置 agent database 中由 memory 拥有的 table。它不得替换整个 SQLite file，因为同一 database 还拥有 session、transcript、runtime cache 和 memory index。
- Monolithic 和 sharded JSON 中的 Sandbox container／browser registry。Runtime write 现在使用 shared database；legacy JSON import 仍然保留。
- Cron job definition、schedule state 和 run history 现在使用 shared SQLite；doctor 会导入／删除旧版 `jobs.json`、`jobs-state.json` 和 `cron/runs/*.jsonl` file
- Host 和 Apple device identity／auth、push、update check、OpenRouter model cache、installed plugin index 以及 app-server binding。Android device auth 仍在 app-local 的 `SecurePrefs` 中。
- Shared schema version 7 会丢弃已退役的 commitment row 并删除其 table。旧版 `commitments.json` source 保持不活跃且不作处理。
- Device／node pairing 和 bootstrap record 现在使用类型化 SQLite table
- Device-pair notification subscriber 和 delivered-request marker 现在使用 shared SQLite plugin-state table，而不是 `device-pair-notify.json`。
- Voice-call call record 现在使用 `voice-call`／`calls` namespace 下的 shared SQLite plugin-state table，而不是 `calls.jsonl`；plugin CLI 会 tail 和汇总 SQLite-backed call history。
- QQBot gateway session、known-user record 和 ref-index quote cache 现在使用 `qqbot` namespace 下的 SQLite plugin state（`gateway-sessions`、`known-users`、`ref-index`），而不是 `session-*.json`、`known-users.json` 和 `ref-index.jsonl`。这些旧文件属于 cache，不会迁移。
- Discord model-picker preference、command-deploy hash 和 thread binding 现在使用 `discord` namespace 下的 SQLite plugin state（`model-picker-preferences`、`command-deploy-hashes`、`thread-bindings`），而不是 `model-picker-preferences.json`、`command-deploy-cache.json` 和 `thread-bindings.json`；Discord doctor／setup migration 会导入并删除旧文件。
- BlueBubbles catchup cursor 和 inbound dedupe marker 现在使用 `bluebubbles` namespace 下的 SQLite plugin state（`catchup-cursors`、`inbound-dedupe`），而不是 `bluebubbles/catchup/*.json` 和 `bluebubbles/inbound-dedupe/*.json`；BlueBubbles doctor／setup migration 会导入并删除旧文件。
- Telegram update offset、sticker cache entry、reply-chain message cache entry、sent-message cache entry、topic-name cache entry 和 thread binding 现在使用 `telegram` namespace 下的 SQLite plugin state（`update-offsets`、`sticker-cache`、`message-cache`、`sent-messages`、`topic-names`、`thread-bindings`），而不是 `update-offset-*.json`、`sticker-cache.json`、`*.telegram-messages.json`、`*.telegram-sent-messages.json`、`*.telegram-topic-names.json` 和 `thread-bindings-*.json`；Telegram doctor／setup migration 会导入并删除旧文件。
- iMessage catchup cursor、reply short-id mapping 和 sent-echo dedupe row 现在使用 `imessage` namespace 下的 SQLite plugin state（`catchup-cursors`、`reply-cache`、`sent-echoes`），而不是 `imessage/catchup/*.json`、`imessage/reply-cache.jsonl` 和 `imessage/sent-echoes.jsonl`；iMessage doctor／setup migration 会导入并删除旧文件。
- Microsoft Teams conversation、poll、SSO token 和 feedback learning 现在使用 SQLite plugin state namespace（`conversations`、`polls`、`sso-tokens`、`feedback-learnings`），而不是 `msteams-conversations.json`、`msteams-polls.json`、`msteams-sso-tokens.json` 和 `*.learnings.json`；Microsoft Teams doctor／setup migration 会导入并归档旧文件。Pending upload 是短期 SQLite cache，旧 JSON cache file 不会迁移。
- Matrix sync cache、storage metadata、thread binding、inbound dedupe marker、startup verification cooldown state、credentials、recovery key 和 SDK IndexedDB crypto snapshot 现在使用 `matrix` 下的 SQLite plugin state／blob namespace（`sync-store`、`storage-meta`、`thread-bindings`、通过 core claimable dedupe 使用的 `matrix.inbound-dedupe.*`、`startup-verification`、`credentials`、`recovery-key`、`idb-snapshots`），而不是 `bot-storage.json`、`storage-meta.json`、`thread-bindings.json`、`inbound-dedupe.json`、`startup-verification.json`、`credentials.json`、`recovery-key.json` 和 `crypto-idb-snapshot.json`；Matrix doctor／setup migration 会从 account-scoped Matrix storage root 导入并删除这些旧文件（以及已退役的每个 root 的 `inbound-dedupe` SQLite row）。
- Nostr bus cursor 和 profile publish state 现在使用 `nostr` namespace 下的 SQLite plugin state（`bus-state`、`profile-state`），而不是 `bus-state-*.json` 和 `profile-state-*.json`；Nostr doctor／setup migration 会导入并删除旧文件。
- Active Memory session toggle 现在使用 `active-memory/session-toggles` 下的 SQLite plugin state，而不是 `session-toggles.json`。
- Skill Workshop proposal queue 和 review counter 现在使用 `skill-workshop/proposals` 和 `skill-workshop/reviews` 下的 SQLite plugin state，而不是按 workspace 划分的 `skill-workshop/<workspace>.json` file。
- Outbound delivery 和 session delivery queue 现在共享全局 SQLite 的
  `delivery_queue_entries` table，并使用独立的 queue name（`outbound-delivery`、`session-delivery`），而不是持久化的 `delivery-queue/*.json`、`delivery-queue/failed/*.json` 和 `session-delivery-queue/*.json` file。Doctor legacy-state step 会导入 pending 和 failed row，删除过期的 delivered marker，并在导入后删除旧 JSON file。Hot routing 和 retry field 使用类型化 column；JSON payload 仅为 replay／debug 保留。
- ACPX process lease 现在使用 `acpx/process-leases` 下的 SQLite plugin state，而不是 `process-leases.json`。
- Backup 和 migration run metadata

将以下内容移入 agent database：

- Agent session root 和兼容性形态的 session-entry payload。Runtime write 已完成：hot session metadata 可在 `sessions` 中查询，而旧版形态的完整 `SessionEntry` payload 仍保存在 `session_entries` 中。
- Agent transcript event。Runtime write 已完成。
- Compaction checkpoint 和 transcript snapshot。Runtime write 已完成：checkpoint transcript copy 是 SQLite transcript row，checkpoint metadata 记录在 `transcript_snapshots` 中。Gateway checkpoint helper 现在将这些值命名为 transcript snapshot，而不是 source file。
- Agent VFS scratch／workspace namespace 仍处于计划中；当前 canonical agent schema 没有 VFS table。
- Subagent attachment payload 当前会在 child workspace 下 materialize，并由 subagent lifecycle cleanup 删除。
- Tool- 和 run-artifact table 仍处于计划中；它们不属于当前 canonical agent schema。
- Agent-local runtime cache 使用每个 agent 的 `cache_entries` table。除非 gateway-wide model cache 变为 agent-specific，否则继续保留在 global database 中。
- ACP parent stream log。Runtime write 已完成。
- ACP replay ledger session。Runtime write 已通过 `acp_replay_sessions` 和 `acp_replay_events` 完成；旧版 `acp/event-ledger.json` 仅作为 doctor input。
- ACP session metadata。Runtime write 已通过 `acp_sessions` 完成；`sessions.json` 中旧版的 `entry.acp` block 仅作为 doctor migration input。
- 非明确 export file 的 trajectory sidecar。Runtime write 已完成：trajectory capture 写入 agent-database 的 `trajectory_runtime_events` row，并将 run-scoped artifact mirror 到 SQLite。旧版 sidecar 仅作为 doctor import input；export 可以生成新的 JSONL support-bundle output，但 runtime 不会读取或迁移旧的 trajectory／transcript sidecar。
  Runtime trajectory capture 暴露 SQLite scope；JSONL path helper 隔离在 export／debug support 中，并且不会从 runtime module 重新导出。
  Embedded-runner trajectory metadata 记录 `{agentId, sessionId, sessionKey}` identity，而不是持久化 transcript locator。

暂时保留以下基于文件的内容：

- `openclaw.json`
- provider 或 CLI credential file
- plugin／package manifest
- user workspace 和 Git repository（选择 disk mode 时）
- 供 operator tailing 使用的 log，除非特定 log surface 被迁移

## Migration Plan

### Phase 0：冻结边界

在移动更多 row 之前，明确 durable-state boundary：

- 向 global database 添加 `migration_runs` table。
  已完成 legacy-state migration execution report。
- 添加一个由 doctor 拥有的、用于 file-to-database import 的 state migration service。
  已完成：`openclaw doctor --fix` 使用 legacy-state migration implementation。
- 使 `plan` 只读，并使 `apply` 创建 backup、执行 import、验证，然后删除或隔离旧 file。
  已完成：doctor 创建经过验证的 migration 前 backup，将 backup path 传入 `migration_runs`，并复用 importer／removal path。
- 添加 static ban，使新的 runtime code 无法写入 legacy state file，同时 migration code 和 test 仍可 seed／read 它们。
  已完成当前已迁移的 legacy store；该 guard 还会扫描嵌套 test，禁止 runtime transcript locator contract。

### Phase 1：完成 Global Control Plane

将 shared coordination state 保留在 `state/openclaw.sqlite`：

- Agent 和 agent database registry
- Task 和 Task Flow ledger
- Plugin state
- Sandbox container／browser registry
- Cron／scheduler run history
- Pairing、device、push、update-check、TUI、OpenRouter／model cache 以及其他小型 gateway-scoped runtime state
- Backup 和 migration metadata
- Gateway media attachment byte。Runtime write 已完成；直接 file path 是为兼容 channel sender 和 sandbox staging 而进行的临时 materialization。Runtime allowlist 接受 SQLite materialization path，而不是 legacy state／config media root。Doctor 会将 legacy media file 导入 `media_blobs`，并在成功写入 row 后删除 source file。
- Debug proxy capture session、event 和 payload blob。已完成：capture 位于 shared state DB 中，并通过 shared state DB bootstrap、schema、WAL 和 busy-timeout setting 打开。Payload byte 在 `capture_blobs.data` 中以 gzip 压缩；不存在 debug proxy runtime sidecar DB override、blob directory 或仅供 proxy capture 使用的 generated schema／codegen target。
  Doctor／startup migration 会导入已发布的 `debug-proxy/capture.sqlite` row 和引用的 payload blob，包括活动的 legacy DB／blob environment override，然后归档这些 source，同时保留 CA certificate。

本阶段还会删除这些 subsystem 中重复的 sidecar opener、permission helper、WAL setup、filesystem pruning 和 compatibility writer。

### Phase 2：引入 Per-Agent Database

为每个 agent 创建一个 database，并从 global DB 注册：

```text
~/.openclaw/state/openclaw.sqlite
~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite
```

Global `agent_databases` row 存储 path、schema version、last-seen timestamp 以及基本的 size／integrity metadata。Runtime code 会向 registry 请求 agent DB，而不是直接推导 file path。

Agent DB 拥有：

- `sessions` 作为 canonical session root，`session_entries` 作为附加到该 root 的兼容性形态 payload table，`session_routes` 作为唯一的活动 `session_key` lookup
- `conversations` 和 `session_conversations`，作为附加到 session 的 normalized provider routing identity
- `transcript_events`
- transcript snapshot 和 compaction checkpoint。Runtime write 已完成。
- agent-local runtime／cache row

VFS、tool-artifact 和 run-artifact table 仍是计划中的 addition，而不是当前的 agent-database owner。

- ACP parent stream event
- 非明确 export artifact 时的 trajectory runtime event

### Phase 3：替换 Session Store API

Runtime 已完成。文件形态的 session store surface 不再是活动的 runtime contract：

- Runtime 不再调用 `loadSessionStore(storePath)`，也不再将 `storePath` 视为 session identity。
- Runtime row operation 为 `getSessionEntry`、`upsertSessionEntry`、
  `patchSessionEntry`、`deleteSessionEntry` 和 `listSessionEntries`。
- Whole-store rewrite helper、file writer、queue test、alias pruning 和 legacy-key deletion parameter 已从 runtime 中移除。
- Deprecated root-package compatibility export 会委托给仅供 doctor 使用的 `sessions.json` importer，直到 2026-10-12；Plugin SDK compatibility read 继续将 canonical SQLite row 投影出来。
- `sessions.json` parsing 仅保留在 doctor migration／import code 和 doctor test 中。
- Runtime lifecycle fallback 会读取 SQLite transcript header，而不是优先读取 JSONL 首行。

继续删除任何重新引入 file-lock parameter、pruning／truncation-as-file-maintenance 术语、store-path identity 的内容，以及唯一断言为 JSON persistence 的 test。

### Phase 4：迁移 Transcript、ACP Stream、Trajectory 和 VFS

使每个 agent data stream 都原生使用 database：

- Transcript append write 通过一个 SQLite transaction 完成，该 transaction 会确保 session header、检查 message idempotency、选择 parent tail、插入 `transcript_events`，并在 `transcript_event_identities` 中记录可查询的 identity metadata。Direct transcript message append 和普通持久化的 `TranscriptSessionManager` append 已完成；显式 branch operation 保留其明确的 parent choice，并继续写入 SQLite row，而不推导任何 file locator。
- ACP parent stream log 变为 row，而不是 `.acp-stream.jsonl` file。已完成。
- ACP spawn setup 不再持久化 transcript JSONL path。已完成。
- Runtime trajectory capture 直接写入 event row／artifact。明确的 support／export command 仍可生成 support-bundle JSONL artifact 作为 export format，但 session export 不会重新创建 session JSONL。已完成。
- 配置为 disk mode 时，Disk workspace 继续保留在磁盘上。
- VFS scratch 和 experimental VFS-only workspace mode 仍是未来工作；当前 agent schema 没有 VFS table。

Migration 会一次性导入旧版 JSONL file，在 `migration_runs` 中记录 count／hash，并在 integrity check 后删除已导入文件。

### Phase 5：Backup、Restore、Vacuum 和 Verify

Backup 仍是一个 archive file：

- Checkpoint 每个 global 和 agent database。
- 使用 SQLite online backup 对每个 DB 进行 snapshot，然后执行 offline `VACUUM`。
- Archive compact DB snapshot、config、external credential 和请求的 workspace export。
- 省略原始的活动 `*.sqlite-wal` 和 `*.sqlite-shm` file。
- 通过打开每个 DB snapshot 并运行 `PRAGMA integrity_check` 进行验证。
  `openclaw backup create` 默认执行此 archive verification；
  `--no-verify` 只跳过 post-write archive pass，不跳过 snapshot creation integrity check。
- Restore 将 snapshot 复制回其 target path，而不重写其记录的 schema version。正常 database open 随后会在需要时将 global version `7` 或 per-agent version `17` 应用有界的 forward migration。

### Phase 6：Worker Runtime

在 database split 落地期间，保持 worker mode 为 experimental：

- Worker 接收 agent id、run id、filesystem mode 和 DB registry identity。
- 每个 worker 打开自己的 SQLite connection。
- Parent 保留 channel delivery、approval、config 和 cancellation authority。
- 每个 active run 从一个 worker 开始；只有在 lifecycle 和 DB connection ownership 稳定后才添加 pooling。

### Phase 7：删除旧世界

Runtime session management 已完成。旧世界仅允许作为明确的 doctor input 或 support／export output：

- Runtime 不再写入 `sessions.json`、transcript JSONL、sandbox registry JSON、task sidecar SQLite 或 plugin-state sidecar SQLite。
- 不再进行 JSON／session file pruning、file transcript truncation、session file lock，也不再保留 lock-shaped session test。
- 不再保留目的在于使旧 session file 保持最新的 runtime compatibility export。
- Explicit support export 仍是用户请求的 archive／materialization format，不得将 file name 反馈为 runtime identity。

## Backup And Restore

Backup 应是一个 archive file，但 database capture 应原生使用 SQLite：

1. 保持 write transaction 有界，以便 online backup 能够持续推进。
2. 在 capture 前验证每个活动的 global 和 agent database。
3. 使用 SQLite online backup 将每个 database capture 到临时 backup directory，然后关闭活动 connection，并对 private copy 执行 `VACUUM`。
   需要 owner-defined SQLite capability 的 plugin schema 在 owner 提供安全的 snapshot contract 前应 fail closed。
4. Archive database snapshot、config file、credential directory、选定的 workspace 和 manifest。
5. 验证每个 SQLite snapshot 的 file shape，然后打开 canonical OpenClaw database 并运行 `PRAGMA integrity_check` 以及 role validation。除非其 owner 提供 verifier，否则 dedicated plugin schema 保持 opaque。
   `openclaw backup create` 默认执行此操作；`--no-verify` 仅用于有意跳过 post-write archive pass。

不要依赖原始活动 `*.sqlite`、`*.sqlite-wal` 和 `*.sqlite-shm` copy 作为主要 backup format。Archive manifest 应记录 database role、agent id、schema version、source path、snapshot path、byte size 和 integrity status。

Restore 应从 archive snapshot 重建 global database 和 agent database file，而不重写其记录的 schema version。正常 database open 会将有界的 forward migration 应用到当前 global version `7` 或 per-agent version `17`。Doctor 仍是 file-to-database import 的唯一 owner。Restore command 会先验证 archive，然后从已验证的 extracted payload 替换每个 manifest asset。

## Runtime Refactor Plan

1. 添加 database registry API。
   - 解析 global DB 和 per-agent DB path。
   - Global schema 现在使用 `user_version = 7`；per-agent DB 使用 version
     `17`，并支持从受支持的旧版进行有界的 forward migration。
   - 添加供 test、backup 和 doctor 使用的 close／checkpoint／integrity helper。

2. 合并 sidecar SQLite store。
   - 将 plugin state table 移入 global database。Runtime write 已完成；未发布的 legacy sidecar importer 已删除。
   - 将 task registry table 移入 global database。Runtime write 已完成；未发布的 legacy sidecar importer 已删除。
   - 将 Task Flow table 移入 global database。Runtime write 已完成；未发布的 legacy sidecar importer 已删除。
   - 将 builtin memory-search table 移入每个 agent database。已完成；显式的自定义 `memorySearch.store.path` 现在由 doctor config migration 删除。
     Full reindex 仅针对 memory table 原地运行；旧版 whole-file swap path 和 sidecar index swap helper 已删除。
   - 从这些 subsystem 中删除重复的 database opener、WAL setup、permission helper 和 close path。

3. 将 agent-owned table 移入 per-agent database。
   - 通过 global database registry 按需创建 agent DB。已完成。
   - 将 runtime session entry 和 transcript event 移入 agent DB。已完成。
   - Reverted prototype 中的 VFS 和 tool-artifact table 从未发布，不属于当前 canonical agent schema。

4. 替换 session store API。
   - 移除 `storePath` 作为 runtime identity。Runtime 已完成，并由
     `check:database-first-legacy-stores` 保护：session metadata、route update、
     command persistence、CLI session cleanup、Feishu reasoning preview、
     transcript-state persistence、subagent depth、auth profile session
     override、parent-fork logic 和 QA-lab inspection 现在都根据 canonical
     agent／session key 解析 database。
     Gateway／TUI／UI／macOS session-list response 现在暴露
     `databasePath`，而不是旧版 `path`；macOS debug surface 将 per-agent
     database 显示为只读 state，而不是写入 `session.store` config。
     `/status`、chat-driven trajectory export 和 CLI dependency proxy 不再传递旧版 store path；transcript usage fallback 按 agent／session identity 读取 SQLite。Runtime 和 bridge test 不再暴露 `storePath`；doctor／migration input 拥有该 legacy field name。
     Gateway combined-session loading 不再针对非 templated `session.store` value 保留特殊 runtime branch；它会聚合 per-agent SQLite row。
     Legacy session-lock doctor lane 及其 `.jsonl.lock` cleanup helper 已移除；SQLite 现在是 session concurrency boundary。
     Hot runtime call site 使用 `resolveSessionRowEntry` 等面向 row 的 helper name；旧版 `resolveSessionStoreEntry` compatibility alias 已从 runtime 和 plugin SDK export 中移除。

- 使用 `{ agentId, sessionKey }` 行操作。
  已完成：`getSessionEntry`、`upsertSessionEntry`、`deleteSessionEntry`、
  `patchSessionEntry` 和 `listSessionEntries` 是以 SQLite 为优先的 API，不需要
  session store 路径。状态摘要、本地 agent 状态、健康状态以及 `openclaw sessions`
  列表命令现在直接读取每个 agent 的行，并显示每个 agent 的 SQLite 数据库路径，而不是
  `sessions.json` 路径。
- 使用 `upsertSessionEntry`、
  `deleteSessionEntry`、`listSessionEntries` 和 SQL 清理查询替代整个存储的删除／插入。
  运行时已完成：热点路径现在使用行 API 和冲突重试的行补丁；剩余的整个存储导入／替换辅助函数仅限于迁移导入代码和 SQLite 后端测试。
  - 删除 `store-writer.ts` 和 writer-queue 测试。已完成。
  - 删除运行时旧版 key 清理，以及 session 行 upsert／patch 中的别名删除参数。已完成。

5. 删除运行时 JSON registry 行为。
   - 使 sandbox registry 的读取和写入仅使用 SQLite。已完成。
   - 仅在迁移步骤中导入单体和分片 JSON。已完成。
   - 移除分片 registry 锁和 JSON 写入。已完成。

- 如果 registry 行的结构仍属于热点运行时状态，则保留一个有类型的 registry 表，而不是将 registry 行存储为通用的不透明 JSON。已完成。

6. 删除文件锁形态的 session 变更。
   - 运行时锁创建和运行时锁 API 已完成。
   - 独立的旧版 `.jsonl.lock` doctor 清理流程已移除。
   - 状态完整性不再有单独的孤立 transcript 文件清理路径；doctor 迁移会在一个位置导入／移除旧版 JSONL 源。
   - Gateway 单例协调使用 `gateway_locks` 下有类型的 SQLite `state_leases` 行，不再暴露文件锁目录接口。
   - 通用 plugin SDK 去重持久化不再使用文件锁或 JSON 文件；它会写入共享 SQLite plugin-state 行。已完成。
   - QMD 写入器不再获取 OpenClaw 状态租约。运行时不再创建 `qmd/embed.lock.lock` 或 `agents/<agentId>/qmd-write.lock.lock`；Doctor 仅移除确定已过时的退役 sidecar。已完成。

7. 使 workers 具备数据库感知能力。
   - Workers 打开自己的 SQLite 连接。
   - Parent 负责 delivery、channel callbacks 和 config。
   - Worker 接收 agent id、run id、文件系统模式以及 DB registry identity，而不是实时句柄。
   - `vfs-only` 仍是计划中的实验模式；当前没有任何 worker runtime 或规范的 agent-schema 表实现该模式。
   - 首先为每个活动 run 保留一个 worker。等到 DB 连接生命周期和取消行为变得足够简单稳定后，再考虑池化。

8. 备份集成。
   - 让 backup 使用在线备份后离线 `VACUUM` 的方式，对全局、agent 和 plugin 数据库创建快照。在 state asset 下发现的 `*.sqlite` 文件已完成；需要不可用 owner capabilities 的 plugin schema 会安全失败。
   - 为规范 SQLite 完整性和 schema identity 添加备份验证，并为专用 plugin 快照添加通用文件形态验证。备份创建和默认归档验证已完成。
   - 在 SQLite 中记录备份运行元数据。已通过共享的 `backup_runs` 表完成，其中包含归档路径、状态和 manifest JSON。
   - 添加从已验证归档快照恢复的功能。已完成：`openclaw backup
restore` 会在提取前进行验证，使用验证器规范化后的 manifest，支持 `--dry-run`，并要求使用 `--yes` 后才能替换已记录的源路径。
   - 仅在请求时包含 VFS／workspace 导出；不要将 session 内部导出为 JSON 或 JSONL。

9. 删除过时的测试和代码。已完成已知的运行时 session 代码面。

- 删除断言运行时创建 `sessions.json` 或 transcript
  JSONL 文件的测试。核心 session store、chat、gateway transcript events、
  preview、lifecycle、command session-entry updates、auto-reply reset／trace 以及
  memory-core dreaming fixtures、approval target routing、session transcript
  repair、security permission repair、trajectory export 和 session export 已完成。
  Active-memory transcript 测试现在断言 SQLite scopes，以及不会创建临时或持久化 JSONL 文件。
  旧的 heartbeat transcript-pruning 回归测试已移除，因为运行时不再截断 JSONL transcript。
  Agent session-list tool 测试不再将旧版 `sessions.json` 路径建模为 gateway 响应形态；app／UI／macOS 测试使用 `databasePath`。
  `/status` transcript-usage 测试现在直接写入 SQLite transcript 行，而不是写入 JSONL 文件。
  Gateway session lifecycle 测试现在直接使用 SQLite transcript seeding helpers；旧的单行 session-file fixture 形态已从 reset 和 delete 覆盖范围中移除。
  `sessions.delete` 不再返回文件时代的 `archived: []` 字段；删除操作只报告行变更结果。旧的 `deleteTranscript` 选项也已移除：删除 session 会移除规范的 `sessions` 根，并让 SQLite 级联删除 session 所拥有的 transcript、snapshot 和 trajectory 行，因此调用方无法留下 transcript 孤立行或忘记清理分支。
  Context-engine trajectory capture 测试现在从隔离的 agent 数据库中读取
  `trajectory_runtime_events` 行，而不是读取 `session.trajectory.jsonl`。
  Docker MCP channel seed 脚本现在直接写入 SQLite 行。直接写入 `sessions.json` 仅限于 doctor fixtures。
  Tool Search Gateway E2E 现在从 SQLite transcript 行读取 tool-call evidence，而不是扫描 `agents/<agentId>/sessions/*.jsonl` 文件。
  Memory-core host events 和 session-corpus scratch 行现在位于共享的 SQLite plugin-state 中；`events.jsonl` 和 `session-corpus/*.txt` 仅是旧版 doctor 迁移输入。活动行使用 `memory/session-ingestion/` 虚拟路径，而不是 `.dreams/session-corpus`。旧的 memory-core dreaming repair 模块及其 CLI／Gateway 测试已移除，因为运行时不再负责该 corpus 的文件归档修复。Memory-core bridge／public-artifact 测试不再显示 `.dreams/events.jsonl`；它们使用 SQLite 支持的虚拟 JSON artifact 名称。
  Public SDK／Codex 测试文档现在描述的是 SQLite session state，而不是 session files，channel-turn 示例也不再暴露 `storePath` 参数。
  Matrix sync state 现在直接使用 SQLite plugin-state store。活动 client／runtime contracts 传递的是 account storage root，而不是 `bot-storage.json` 路径；doctor 会先将旧版 `bot-storage.json` 导入 SQLite，再删除源文件。QA Lab Matrix restart／destructive 场景现在直接修改 SQLite sync 行，而不是创建或删除虚假的 `bot-storage.json` 文件；E2EE substrate 传递 sync-store root，而不是虚假的 `sync-store.json` 路径。
  Matrix storage-root 选择不再根据旧版 sync／thread JSON 文件为 root 评分；它使用持久化 root metadata 加真实 crypto state。
  运行时 SQLite session backend 测试套件不再伪造 `sessions.json`；旧版源 fixtures 现在位于导入它们的 doctor 测试中。
  Gateway session 测试不再暴露 `createSessionStoreDir` helper，也不再设置未使用的临时 session-store 路径；fixture 目录明确指定，直接的行设置使用 SQLite session-row 命名。
  仅供 Doctor 使用的 JSON5 session-store parser 覆盖测试已从 infra 测试移至 doctor migration 测试，因此运行时测试套件不再负责旧版 session-file 解析。
  Microsoft Teams runtime SSO／pending-upload 测试不再携带 JSON sidecar fixtures 或 parsers；旧版 SSO token parsing 仅存在于 plugin migration 模块中。Telegram 测试不再写入虚假的 `/tmp/*.json` store 路径；它们直接重置 SQLite 支持的 message cache。通用 OpenClaw test-state helper 不再暴露旧版 `auth-profiles.json` writer；doctor auth migration 测试在本地负责该 fixture。
  TUI last-session pointers、exec approvals、active-memory toggles、Matrix dedupe／startup verification、Memory Wiki source sync、current-conversation bindings、onboarding auth 和 Hermes secret imports 的运行时测试不再创建旧的 sidecar 文件，也不再断言旧文件名不存在。它们通过 SQLite 行和 public store APIs 验证行为；doctor／migration 测试是旧版源文件名唯一应出现的位置。
  device／node pairing、channel allowFrom、restart intents、restart handoff、session delivery queue entries、config health、iMessage caches、cron jobs、PI transcript headers、subagent registries 和 managed image attachments 的运行时测试也不再创建已退役的 JSON／JSONL 文件来证明这些文件被忽略或不存在。
  PI overflow recovery 不再有 SessionManager rewrite／truncation fallback：tool-result truncation 和 context-engine transcript rewrites 会修改 SQLite transcript 行，然后从数据库刷新 active prompt state。
  持久化的 SessionManager message appends 会委托给 atomic SQLite transcript append helper，由其负责 parent selection 和 idempotency。普通 metadata／custom entry appends 也会在 SQLite 内选择当前 parent，因此过时的 manager 实例不会重新引发 SQLite 之前的 parent-chain 竞争。
  mid-turn prechecks 和 `sessions_yield` 的 synthetic PI tail cleanup 现在直接裁剪 SQLite transcript state；旧的 SessionManager tail-removal bridge 及其测试已删除。
  Compaction checkpoint capture 也只从 SQLite 创建快照；调用方不再传递实时 SessionManager 作为备用 transcript source。
- 保留仅为迁移而写入旧版文件的测试。
- 活动运行时代码面的 JSON 文件证明已替换为 SQL 行证明。

- 为运行时写入旧版 session／cache JSON 路径添加静态禁止规则。已完成 repo guard。

10. 使迁移报告可审计。
    - 在 SQLite 中记录迁移运行，包括开始／完成时间戳、源路径、源哈希、数量、警告和备份路径。
      已完成：旧版状态迁移执行现在会持久化 `migration_runs` 报告，其中包含源路径／表清单、源文件 SHA-256、大小、记录数、警告和备份路径。
      已完成：旧版状态迁移执行还会持久化 `migration_sources` 行，用于源级审计以及未来的跳过／回填决策。
    - 使应用具备幂等性。部分导入后重新运行时，应跳过已导入的源，或按稳定 key 合并。
      已完成：session indexes、transcripts、delivery queues、plugin state、task ledgers 以及 agent-owned global SQLite rows 会通过稳定 key 或 upsert／replace 语义导入，因此重新运行会合并，而不会复制持久化行。
    - 导入失败时必须保留原始源文件。
      已完成：transcript 导入失败时会将原始 JSONL 源保留在检测到的路径，`migration_sources` 会将该源记录为 `warning`，并设置 `removed_source=0`，供下一次 doctor 运行。

## 性能规则

- 每个线程／进程一个连接即可；不要在 workers 之间共享句柄。
- 使用 WAL、`foreign_keys=ON`、5 秒 busy timeout 以及简短的 `BEGIN IMMEDIATE` 写事务。不要在 SQLite 的单次 busy wait 之上再叠加同步锁重试。
- 除非／直到异步事务 API 增加明确的 mutex／backpressure 语义，否则保持写事务辅助函数同步。
- 保持 parent delivery 写入小型且具备事务性。
- 避免整个存储重写；使用行级 upsert／delete。
- 在移动热点代码之前，为按 agent 列表、按 session 列表、按更新时间、run id 和过期路径添加索引。
- 将大型 artifact、媒体和 vectors 存储为 BLOB 或分块的 BLOB 行，而不是 base64 或数值数组 JSON。
- 保持不透明的 plugin-state 条目小型且有作用域。
- 添加 TTL／过期的 SQL 清理，而不是文件系统清理。
  数据库拥有的运行时存储已完成：media、plugin state、plugin blobs、persistent dedupe 和 agent cache 都通过 SQLite 行过期。剩余的文件系统清理仅限于临时物化或明确的移除命令。

## 静态禁止规则

添加 repo 检查，阻止新的运行时写入旧版状态路径：

- `sessions.json`
- 除物化的 support-bundle 输出之外的 `*.trajectory.jsonl`
- `.acp-stream.jsonl`
- `acp/event-ledger.json`
- `cache/*.json` 运行时 cache 文件
- `agents/<agentId>/agent/auth.json`
- `agents/<agentId>/agent/models.json`
- `credentials/oauth.json`
- `github-copilot.token.json`
- `openrouter-models.json`
- `auth-profiles.json`
- `auth-state.json`
- `exec-approvals.json`（已退役；仅由 Doctor 导入 `exec_approvals_config`）
- `openclaw-workspace-state.json`
- `workspace-state.json`
- `workspace-attestations/*.attested`
- sibling `<workspace>.attested`
- Matrix `credentials*.json` 和 `recovery-key.json`
- `cron/runs/*.jsonl`
- `cron/jobs.json`
- `jobs-state.json`
- `device-pair-notify.json`
- `devices/pending.json`／`devices/paired.json`／`devices/bootstrap.json`
  （已于 2026.7 退役：运行时存储是共享状态 DB 中的 `device_pairing_*`／
  `device_bootstrap_tokens`；已配对记录在 gateway 启动时导入，临时 pending／bootstrap 行会被丢弃）
- `nodes/pending.json`／`nodes/paired.json`（已于 2026.7 退役：在 gateway 启动时折叠进已配对设备记录）
- `identity/device.json`
- `identity/device-auth.json`（已退役；仅由 Doctor 导入 `device_auth_tokens`）
- `push/web-push-subscriptions.json`（已退役；仅由 Doctor 导入 `web_push_subscriptions`）
- `push/vapid-keys.json`（已退役；仅由 Doctor 导入 `web_push_vapid_keys`）
- `push/apns-registrations.json`（已退役；仅由 Doctor 导入 `apns_registrations`）
- `process-leases.json`
- `gateway-instance-id`
- `session-toggles.json`
- Memory-core `.dreams/events.jsonl`
- Memory-core `.dreams/session-corpus/`
- Memory-core `.dreams/daily-ingestion.json`
- Memory-core `.dreams/session-ingestion.json`
- Memory-core `.dreams/short-term-recall.json`
- Memory-core `.dreams/phase-signals.json`
- Memory-core `.dreams/short-term-promotion.lock`
- Skill Workshop `skill-workshop/<workspace>.json`
- Skill Workshop `skill-workshop/skill-workshop-review-*.json`
- Nostr `bus-state-*.json`
- Nostr `profile-state-*.json`
- `calls.jsonl`
- `known-users.json`
- `ref-index.jsonl`
- QQBot `session-*.json`
- BlueBubbles `bluebubbles/catchup/*.json`
- BlueBubbles `bluebubbles/inbound-dedupe/*.json`
- Telegram `update-offset-*.json`
- Telegram `sticker-cache.json`
- Telegram `*.telegram-messages.json`
- Telegram `*.telegram-sent-messages.json`
- Telegram `*.telegram-topic-names.json`
- Telegram `thread-bindings-*.json`
- iMessage `catchup/*.json`
- iMessage `reply-cache.jsonl`
- iMessage `sent-echoes.jsonl`
- Microsoft Teams `msteams-conversations.json`
- Microsoft Teams `msteams-polls.json`
- Microsoft Teams `msteams-sso-tokens.json`
- Microsoft Teams `*.learnings.json`
- Matrix `bot-storage.json`
- Matrix `sync-store.json`
- Matrix `thread-bindings.json`
- Matrix `inbound-dedupe.json`
- Matrix `startup-verification.json`
- Matrix `storage-meta.json`
- Matrix `crypto-idb-snapshot.json`
- Discord `model-picker-preferences.json`
- Discord `command-deploy-cache.json`
- sandbox registry shard JSON files
- `plugin-state/state.sqlite`
- 临时的 `openclaw-state.sqlite` 运行时 sidecar
- `tasks/runs.sqlite`
- `tasks/flows/registry.sqlite`
- `bindings/current-conversations.json`
- `restart-sentinel.json`
- `gateway-restart-intent.json`
- `gateway-supervisor-restart-handoff.json`
- `gateway.<hash>.lock`
- `qmd/embed.lock.lock`
- `agents/<agentId>/qmd-write.lock.lock`
- `commands.log`
- `config-health.json`
- `port-guard.json`
- `settings/voicewake.json`
- `settings/voicewake-routing.json`
- `plugin-binding-approvals.json`
- `plugins/installs.json`
- `audit/file-transfer.jsonl`
- `audit/crestodian.jsonl`
- `crestodian/rescue-pending/*.json`
- `openclaw/rescue-pending/*.json`
- `plugins/phone-control/armed.json`
- Memory Wiki `.openclaw-wiki/log.jsonl`
- Memory Wiki `.openclaw-wiki/state.json`
- Memory Wiki `.openclaw-wiki/locks/`
- Memory Wiki `.openclaw-wiki/source-sync.json`
- Memory Wiki `.openclaw-wiki/import-runs/*.json`
- Memory Wiki `.openclaw-wiki/cache/agent-digest.json`
- Memory Wiki `.openclaw-wiki/cache/claims.jsonl`
- ClawHub `.clawhub/lock.json`
- ClawHub `.clawhub/origin.json`
- Browser profile decoration `.openclaw-profile-decorated`
- `SessionManager.open(...)` 基于文件的 session openers
- `SessionManager.listAll(...)` 和 `TranscriptSessionManager.listAll(...)`
  transcript listing facades
- `SessionManager.forkFromSession(...)` 和
  `TranscriptSessionManager.forkFromSession(...)` transcript fork facades
- `SessionManager.newSession(...)` 和 `TranscriptSessionManager.newSession(...)`
  可变 session replacement facades
- `SessionManager.createBranchedSession(...)` 和
  `TranscriptSessionManager.createBranchedSession(...)` branch-session facades

该禁止规则应允许测试创建旧版 fixtures，并允许迁移代码读取／导入／移除旧版文件源。未发布的 SQLite sidecar 仍然禁止，不得获得 doctor 导入例外。

## 完成标准

- 运行时数据和 cache 写入全局或 agent SQLite 数据库。
- 运行时不再写入 session indexes、transcript JSONL、sandbox registry JSON、task sidecar SQLite 或 plugin-state sidecar SQLite。未发布的 task 和 plugin-state sidecar SQLite 导入器已删除。
- 旧版文件导入仅限 doctor。
- Backup 生成一个包含紧凑 SQLite 快照和完整性证明的归档。
- 基于磁盘的 agent workers 已完成；VFS scratch 和实验性 VFS-only 存储仍处于计划中。
- Config 和明确的 credential 文件仍是预期的唯一持久化非数据库控制文件。
- Repo 检查可防止重新引入旧版运行时文件存储。
