---
summary: "OpenClaw SQLite 数据库位置、架构版本、完整性检查和降级恢复"
read_when:
  - 诊断较新的数据库架构错误
  - 在更新或降级前检查数据库兼容性
  - 为较旧的 OpenClaw 版本恢复数据库
title: "数据库架构"
---

OpenClaw 将控制平面状态存储在一个全局 SQLite 数据库中，并将代理数据存储在每个代理一个 SQLite 数据库中。数据库打开时会向前运行架构迁移。较旧的 OpenClaw 构建会拒绝由较新架构写入的数据库。

## 数据库布局

| 范围                 | 默认路径                                               | 内容                                                                                              |
| -------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 全局控制平面         | `~/.openclaw/state/openclaw.sqlite`                        | 共享配置状态、注册表、审批、插件状态以及共享运行时状态             |
| 每代理数据平面       | `~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite` | 会话、转录、记忆索引、认证状态、对话状态以及代理作用域内的运行时状态 |

一些高频或特定生命周期的功能使用专用的 SQLite 存储，包括任务注册表和轨迹数据。

## 版本控制契约

每个数据库都在两个地方记录其模式：

- `PRAGMA user_version` 是 SQLite 的模式版本。
- 主 `schema_meta` 行记录 `role`、`agent_id`、`schema_version` 和 `app_version`。`app_version` 是最后一次写入模式元数据的 OpenClaw 构建版本。

当 OpenClaw 打开一个较旧但仍受支持的数据库时，它会应用仅向前的迁移。它会拒绝 `user_version` 新于当前运行构建版本的数据库，并报告 `newer schema version` 错误。Gateway 会在启动前检查所有已注册的数据库。`openclaw update` 也会拒绝其声明的模式支持版本早于磁盘上数据库的包或源目标。对于在添加模式元数据之前发布的目标包，无法进行预检。

通过 npm 手动安装 OpenClaw 会绕过更新器保护。数据库打开检查仍然会拒绝不兼容的构建版本。

## Agent schema history

| 版本 | 变更                                                                                                                                                                                                                                                         | 首次发布                                   |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 1       | 初始的每个 agent 存储 ([#88349](https://github.com/openclaw/openclaw/pull/88349))                                                                                                                                                                            | `v2026.5.30-beta.1`, 稳定版直到 `v2026.7.1` |
| 2       | 内存索引标识 ([#104449](https://github.com/openclaw/openclaw/pull/104449))                                                                                                                                                                            | `v2026.7.2-beta.1`                              |
| 4       | 会话和转录移入 SQLite ([#98236](https://github.com/openclaw/openclaw/pull/98236))                                                                                                                                                         | `v2026.7.2-beta.1`                              |
| 5-6     | 终端新鲜度和状态生命周期 ([#104859](https://github.com/openclaw/openclaw/pull/104859))                                                                                                                                                           | `v2026.7.2-beta.1`                              |
| 7       | 按条目生命周期状态投影 ([#106151](https://github.com/openclaw/openclaw/pull/106151))                                                                                                                                                            | `v2026.7.2-beta.1`                              |
| 8       | 按转录会话溯源 ([#106766](https://github.com/openclaw/openclaw/pull/106766))                                                                                                                                                                | `v2026.7.2-beta.2`                              |
| 9       | `STRICT` 表 ([#108663](https://github.com/openclaw/openclaw/pull/108663))                                                                                                                                                                                  | `v2026.7.2-beta.2`                              |
| 10      | 物化的活动转录路径 ([#108851](https://github.com/openclaw/openclaw/pull/108851))                                                                                                                                                             | 未发布                                      |
| 11      | 租约、持久交付、会话地址和心跳结果 ([#109636](https://github.com/openclaw/openclaw/pull/109636), [#95838](https://github.com/openclaw/openclaw/pull/95838), [#109999](https://github.com/openclaw/openclaw/pull/109999)) | 未发布                                      |

版本 3 是一个未发布的开发步骤，已并入版本 4。

## 状态 schema 历史

| 版本 | 变更                                                                                                   | 首次发布            |
| ------- | -------------------------------------------------------------------------------------------------------- | ------------------- |
| 1       | 初始共享状态数据库                                                                            | `v2026.5.30-beta.1` |
| 2       | 仅元数据的消息审计事件 ([#103903](https://github.com/openclaw/openclaw/pull/103903))         | `v2026.7.2-beta.1`  |
| 3       | `STRICT` 表和 schema 漂移加固 ([#108663](https://github.com/openclaw/openclaw/pull/108663)) | `v2026.7.2-beta.2`  |
| 4       | 会话监视来源取代编码哨兵行                                                  | 未发布          |

## 完整性检查

| 何时                                       | 检查                                                          |
| ------------------------------------------ | ------------------------------------------------------------- |
| 每次打开                                  | 验证 `schema_meta` 表和主元数据行       |
| 在待处理迁移之前                          | 运行完整的完整性、外键、角色、模式和索引扫描 |
| Gateway 后台验证器                         | 大约每天运行一次完整扫描并记录结果              |
| Doctor、备份验证和压缩                    | 在接受或重写数据库之前运行完整扫描    |

Gateway 预检只读取模式头。后台验证器负责对不需要迁移的数据库执行较慢的完整扫描。
隔离决定仅保存在专用的 `openclaw-quarantine.sqlite` 存储中，因此即使被隔离的数据库损坏，它们也能保留。验证结果会被记录。

## 故障排除

### 为什么更新到 2026.7.2 后无法回退

直到 `v2026.7.1` 的每个版本都使用 agent schema 1 和 state schema 1。2026.7.2 发布线（从 `v2026.7.2-beta.1` 开始）会在首次启动时将你的数据库向前迁移。该迁移是单向的：数据会被重写到更新后的 schema 中，而之后安装较旧版本的 OpenClaw 并不会撤销这一点。较旧的构建会拒绝启动，并报出 `newer schema version` 错误，其中会指出拥有该数据库的构建。

降级二进制文件永远不会降级数据。如果在更新后必须运行早于 2026.7.2 的版本，你有三个选择：

1. 恢复更新前创建的备份。[在重大更新前创建并验证备份](/cli/backup)。
2. 使用单独的状态目录（`OPENCLAW_STATE_DIR`）运行旧版本构建。它会从空白状态开始；你已迁移的数据会保持不变，等你切回较新版本时再使用。
3. 按照下面的手动降级流程操作。这不受支持，并且如果没有经过验证的备份，存在数据丢失风险。

自 2026.7.2 起，`openclaw update` 会拒绝安装无法打开你当前数据库的版本，因此更新器不会让你陷入这种情况。通过 npm 手动安装旧版本会绕过该保护；数据库仍然会拒绝旧二进制文件，但那时它已经被安装好了。

### Gateway 因为 newer schema version 错误而拒绝启动

一个更新的 OpenClaw 构建写入了你的数据库，而当前运行的构建更旧。错误会指出拒绝启动的安装信息——发布版本、commit 和安装根目录——以及它支持的 schema 和实际发现的 schema。

请针对安装根目录采取行动，而不是版本号。一个发布版本字符串可能覆盖许多 `main` commit 和多个 schema 级别，因此两个安装都可能自称为 `2026.7.2`，却支持不同的 schema。预发布版本甚至可能根本不存在于 `latest` npm tag 上：在重新安装前先查看 `npm view openclaw dist-tags`，因为你需要的 schema 所在的 tag 可能是 `beta`，而从 `latest` 重新安装可能会让你离目标更远。

链接的源码检出是 commit 会误导的情况：`openclaw --version` 显示的是检出仓库的 git HEAD，但实际执行的代码是 `dist/` 上次构建出来的内容。如果安装根目录是一个检出仓库，请先重新构建它（`pnpm build`），再判断版本是否有误。

使用支持其 schema 的构建打开数据库，或者让旧版本构建指向单独的 `OPENCLAW_STATE_DIR`。不要通过编辑数据库来消除该错误。

### 数据库在完整性验证失败后被隔离

后台验证器证明该文件已损坏，因此之后每次打开都会快速失败，而不会重新扫描。请从备份中恢复数据库，或者修复它，然后运行 `openclaw doctor --fix` 以清除隔离记录。如果隔离记录本身无法清除，doctor 会报告明确错误；请反复运行，直到它报告正常。

## 不支持降级

手动降级 schema 仅适用于愿意承担风险的代理和操作人员。在编辑任何数据库之前，请先[创建并验证备份](/cli/backup)。停止 Gateway 以及所有可能打开该数据库的进程。

一般流程是：

1. 读取目标版本的 schema 和迁移。
2. 在一个事务中，删除目标版本之后引入的每一张表、索引、触发器和列。
3. 将 `PRAGMA user_version` 和 `schema_meta.schema_version` 设置为目标版本。
4. 在启动 Gateway 之前，运行目标版本的完整数据库验证。

### 示例：将 agent schema 从 11 降级到 9

Schema 10 添加了活动转录投影。Schema 11 添加了租约、持久化传递、会话地址状态以及心跳结果。QMD 协调使用 `state_leases` 中的行；无需保留单独的 QMD 表。

在检查写入它的确切 schema 后，对每个受影响的 per-agent 数据库运行等效 SQL：

```sql
BEGIN IMMEDIATE;

DROP TABLE IF EXISTS heartbeat_outcomes;
DROP TABLE IF EXISTS conversation_deliveries;
DROP TABLE IF EXISTS state_leases;
DROP TABLE IF EXISTS session_transcript_active_events;

ALTER TABLE session_transcript_index_state DROP COLUMN active_event_count;
ALTER TABLE session_transcript_index_state DROP COLUMN active_message_count;
ALTER TABLE conversations DROP COLUMN delivery_target;

PRAGMA user_version = 9;
UPDATE schema_meta
SET schema_version = 9,
    updated_at = unixepoch('now') * 1000
WHERE meta_key = 'primary';

COMMIT;
```

这会丢弃 10-11 版本的状态，包括进行中的传递操作、租约、心跳结果，以及派生出来的活动转录投影。降级失败意味着必须从已验证的备份中恢复。
