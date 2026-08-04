---
summary: "`openclaw doctor` 的 CLI 参考（健康检查 + 引导式修复）"
read_when:
  - 当你遇到连接/认证问题并希望获得引导式修复时
  - 当你已更新并希望进行一次完整性检查时
title: "医生"
---

# `openclaw doctor`

针对网关、通道、插件、技能、模型路由、本地状态和配置迁移的健康检查与快速修复。只要某些内容没有按预期运行，并且你希望通过一个命令来说明问题所在，就使用它。

当 Gateway 状态报告 SecretRef 所有者降级时，doctor 会打印一个 **Secret 运行时降级** 警告，列出每个冷却或过期的所有者、受影响的配置路径、已脱敏的原因，以及 `openclaw secrets reload` 重试命令。

当通道入口事件被投递到 dead-letter 时，doctor 会指出每个受影响的通道账户，并指向 [`openclaw channels dead-letters list`](/cli/channels#inbound-dead-letters) 以便检查和恢复。

相关：

- 故障排查: [疑难解答](/gateway/troubleshooting)
- 安全审计: [安全](/gateway/security)

## 姿态

Doctor 有五种姿态：

| 姿态                      | 命令                                      | 行为                                                                        |
| ------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------- |
| 检查                      | `openclaw doctor`                         | 面向人工的检查和引导式提示。                                                   |
| 修复                      | `openclaw doctor --fix`                   | 应用受支持的修复；除非非交互式修复是安全的，否则会使用提示。                  |
| Lint                      | `openclaw doctor --lint`                  | 供 CI、预检和审查门使用的只读结构化结果。                                      |
| 共享 SQLite 维护          | `openclaw doctor --state-sqlite compact`  | 显式执行检查点、压缩并验证规范的共享状态数据库。                               |
| 会话 SQLite 迁移          | `openclaw doctor --session-sqlite <mode>` | 检查、导入、验证、压缩、恢复或还原会话状态。                                   |

当自动化需要稳定结果时，优先使用 `--lint`。当人工操作员希望 doctor 编辑配置或状态时，优先使用 `--fix`。

## 示例

```bash
openclaw doctor
openclaw doctor --lint
openclaw doctor --lint --json
openclaw doctor --lint --severity-min warning
openclaw doctor --lint --all
openclaw doctor --lint --allow-exec
openclaw doctor --deep
openclaw doctor --fix
openclaw doctor --fix --non-interactive
openclaw doctor --generate-gateway-token
openclaw doctor --post-upgrade
openclaw doctor --post-upgrade --json
openclaw doctor --state-sqlite compact
openclaw doctor --state-sqlite compact --json
openclaw doctor --session-sqlite inspect --session-sqlite-all-agents
openclaw doctor --session-sqlite dry-run --session-sqlite-agent main --json
openclaw doctor --session-sqlite import --session-sqlite-all-agents
openclaw doctor --session-sqlite validate --session-sqlite-all-agents --json
openclaw doctor --session-sqlite compact --session-sqlite-all-agents
openclaw doctor --session-sqlite recover --github-issue
openclaw doctor --session-sqlite restore --session-sqlite-all-agents
```

针对通道的权限，请改用通道探测而不是 `doctor`：

```bash
openclaw channels capabilities --channel discord --target channel:<channel-id>
openclaw channels status --probe
```

`channels capabilities` 会报告机器人针对特定通道目标的实际权限。`channels status --probe` 会审计所有已配置的通道和语音自动加入目标。

## 选项

| 选项                              | 作用                                                                                                                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--no-workspace-suggestions`      | 禁用工作区内存/搜索建议。                                                                                                                                                               |
| `--yes`                           | 不提示直接接受默认值。                                                                                                                                                                       |
| `--repair` / `--fix`             | 应用推荐的非服务修复，无需提示（`--fix` 是别名）。网关服务的安装/重写仍需要交互式确认或显式的 `gateway` 命令。                                                                                 |
| `--force`                         | 应用激进修复，包括覆盖自定义服务配置。                                                                                                                                                        |
| `--non-interactive`               | 以无提示方式运行；仅执行安全迁移和非服务修复。                                                                                                                                                  |
| `--generate-gateway-token`        | 生成并配置网关令牌。                                                                                                                                                                          |
| `--allow-exec`                    | 在验证密钥时，允许 doctor 执行已配置的 `exec` SecretRefs。                                                                                                                                    |
| `--deep`                          | 扫描系统服务以发现额外的网关安装；报告最近的 Gateway supervisor 重启交接。                                                                                                                       |
| `--lint`                          | 以只读模式运行现代化健康检查并输出诊断结果。                                                                                                                                                      |
| `--post-upgrade`                  | 运行升级后插件兼容性探测；结果输出到 stdout；如果存在任何错误级别的结果，则退出码为 1。                                                                                                            |
| `--state-sqlite <mode>`           | 运行显式的共享状态 SQLite 维护。唯一可用模式是 `compact`。                                                                                                                                    |
| `--session-sqlite <mode>`         | 运行指定的 session SQLite 迁移模式：`inspect`、`dry-run`、`import`、`validate`、`compact`、`recover` 或 `restore`。                                                                              |
| `--session-sqlite-store <path>`    | 配合 `--session-sqlite`：选择一个旧的 `sessions.json` 存储路径。                                                                                                                                |
| `--session-sqlite-agent <id>`      | 配合 `--session-sqlite`：选择一个已配置的代理。                                                                                                                                                 |
| `--session-sqlite-all-agents`      | 配合 `--session-sqlite`：选择已配置和已发现的代理存储。                                                                                                                                            |
| `--github-issue`                  | 配合 `--session-sqlite recover`：准备一份经过清理的 openclaw/openclaw issue 报告；在 `--yes` 或交互式确认后，doctor 会使用 `gh` 创建它。                                                   |
| `--json`                          | 配合 `--lint`：输出 JSON 结果。配合 `--post-upgrade`：输出 `{ probesRun, findings }`。配合 `--state-sqlite` 或 `--session-sqlite`：以 JSON 形式输出维护报告。                                   |
| `--severity-min <level>`          | 配合 `--lint`：过滤掉低于 `info`、`warning` 或 `error` 的结果。                                                                                                                                    |
| `--all`                           | 配合 `--lint`：运行所有已注册检查，包括默认集合中排除的可选检查。                                                                                                                                    |
| `--skip <id>`                     | 配合 `--lint`：跳过一个检查 id。可重复。                                                                                                                                                         |
| `--only <id>`                     | 配合 `--lint`：仅运行指定的检查 id。可重复。                                                                                                                                                       |

`--severity-min`、`--all`、`--only` 和 `--skip` 仅在与 `--lint` 一起使用时才被接受；`--json` 可与 `--lint`、`--post-upgrade`、`--state-sqlite` 和 `--session-sqlite` 一起使用】【。

## 语法检查模式

`openclaw doctor --lint` 是只读的：无提示、无修复、无配置/状态重写。

```bash
openclaw doctor --lint
openclaw doctor --lint --severity-min warning
openclaw doctor --lint --json
openclaw doctor --lint --all
openclaw doctor --lint --allow-exec
openclaw doctor --lint --only core/doctor/gateway-config --json
openclaw doctor --lint --only core/doctor/local-audio-acceleration --severity-min info
```

人类可读输出很简洁：

```text
doctor --lint: ran 6 check(s), 1 finding(s)
  [warning] core/doctor/gateway-config gateway.mode - gateway.mode is unset; gateway start will be blocked.
    fix: 运行 `openclaw configure` 并设置 Gateway 模式（local/remote），或 `openclaw config set gateway.mode local`。
```

JSON 输出是脚本接口：

```json
{
  "ok": false,
  "checksRun": 5,
  "checksSkipped": 0,
  "findings": [
    {
      "checkId": "core/doctor/gateway-config",
      "severity": "warning",
      "message": "gateway.mode is unset; gateway start will be blocked.",
      "path": "gateway.mode",
      "fixHint": "运行 `openclaw configure` 并设置 Gateway 模式（local/remote），或 `openclaw config set gateway.mode local`。"
    }
  ]
}
```

退出码：

| Code | 含义                                                       |
| ---- | ------------------------------------------------------------- |
| `0`  | 在所选严重级别阈值及以上没有发现问题。      |
| `1`  | 至少有一个发现满足所选阈值。            |
| `2`  | 在生成 lint 发现之前发生命令/运行时失败。      |

`--severity-min` 同时控制哪些发现会打印以及退出阈值：即使存在较低严重级别的 `info`/`warning` 发现，`openclaw doctor --lint --severity-min error` 也可能什么都不打印并以 `0` 退出。

`--all` 控制在严重级别过滤之前选择哪些检查。默认的 lint 运行会排除那些更深入、更具历史性，或更可能暴露可修复旧残留的检查；使用 `--all` 可查看完整清单。`--only <id>` 是最精确的选择器，可以按 id 运行任何已注册的检查。

`core/doctor/local-audio-acceleration` 会报告自动选择的本地 STT 命令、分别提供的/可用的/观察到的后端证据，以及在不加载语音模型的情况下的回退顺序。它会发出一条信息级别的发现，因此需要包含 `--severity-min info` 才能显示它。

## 结构化健康检查

现代 doctor 检查使用一种小型拆分契约：

```ts
detect(ctx, scope?) -> HealthFinding[]
repair?(ctx, findings) -> HealthRepairResult
```

`detect()` 驱动 `doctor --lint`。`repair()` 是可选的，并且只会在 `doctor --fix` / `doctor --repair` 下运行。尚未迁移到这种形式的检查仍然使用旧的 doctor 贡献流程。

修复上下文可以携带 `dryRun`/`diff` 请求；修复结果可以返回结构化的 `diffs`（配置/文件编辑）和 `effects`（服务、进程、包、状态或其他副作用），因此已转换的检查可以朝着 `doctor --fix --dry-run` 发展，而无需把变更规划移入 `detect()`。

`repair()` 会报告 `status: "repaired" | "skipped" | "failed"`（省略 status 表示 `repaired`）。当修复返回 `skipped` 或 `failed` 时，doctor 会报告原因并跳过该检查的验证。成功修复后，doctor 会针对已修复的发现结果重新运行带范围限制的 `detect()`；如果该发现仍然存在，doctor 会报告修复警告，而不是将该变更视为完成。

一个发现结果包含：

| 字段              | 用途                                                   |
| ----------------- | ------------------------------------------------------ |
| `checkId`         | 用于 skip/only 过滤和 CI 白名单的稳定 id。             |
| `severity`        | `info`、`warning` 或 `error`。                         |
| `message`         | 面向人的问题描述。                                     |
| `path`            | 可用时的配置、文件或逻辑路径。                         |
| `line` / `column` | 可用时的源位置。                                       |
| `ocPath`          | 当检查可以指向一个精确 `oc://` 地址时使用。            |
| `fixHint`         | 建议的操作员动作或修复摘要。                           |

现代化的 core doctor 检查仍然附着在有序的 doctor contribution 上，由其负责对应的人类可见 `doctor` / `doctor --fix` 行为。共享的结构化健康注册表是扩展点：捆绑和插件支持的检查会在其所属包在当前命令路径中注册后，排在 core doctor 检查之后运行。`openclaw/plugin-sdk/health` 为插件作者暴露了相同的契约。

## 检查选择

```bash
openclaw doctor --lint --only core/doctor/gateway-config --json
openclaw doctor --lint --skip core/doctor/skills-readiness
openclaw doctor --lint --all --skip core/doctor/session-locks
```

`--only` 和 `--skip` 接受完整的检查 ID，并且可以多次使用。如果 `--only` 中的某个 ID 未注册，那么该 ID 将不会运行任何检查；请使用输出中的 `checksRun`/`checksSkipped` 来确认你所针对的门禁是否选择了你期望的检查。

## 升级后模式

`openclaw doctor --post-upgrade` 在构建或升级后运行插件兼容性探测，以便串联后续步骤。结果输出到 stdout；如果任何结果的 `level` 为 `"error"`，退出码为 1。添加 `--json` 可输出适合机器读取的封装格式（`{ probesRun, findings }`），适用于 CI、社区的 `fork-upgrade` 技能以及其他升级后的冒烟测试工具。如果已安装的插件索引缺失或格式错误，JSON 模式仍会输出该封装，并包含一个 `plugin.index_unavailable` 错误结果。

容器镜像启动是常规“更新后运行 doctor”流程的例外。当 `openclaw gateway run` 在新的 OpenClaw 版本上启动时，它会在报告就绪之前运行安全的状态和插件修复。如果修复无法安全完成，启动将退出，并提示你先使用 `openclaw doctor --fix` 针对相同挂载的 state/config 在同一镜像上运行一次，然后再正常重启容器。

## 旧版状态迁移

`openclaw doctor --fix` 是持久化文件到 SQLite 迁移的唯一负责者。它会验证并接管每个已识别的源，写入并校验规范化行，记录迁移回执，然后移除已退役的源。运行时代码不会执行惰性导入或回退读取。

这包括 `<state-dir>/mcp-oauth/*.json` 下已退役的 MCP OAuth 文件。修复前请停止 Gateway。Doctor 会将有效凭证导入到 `<state-dir>/state/openclaw.sqlite`，在两个存储都存在时保留现有的规范 SQLite 会话，删除已废弃的持久化 OAuth `state` 值，并使用其回执防止重新创建的过期文件复活已注销的凭证。已退役的 `.lock` 旁车文件会安全失败关闭：如果 Doctor 报告存在过期所有者，请确认没有更旧的 OpenClaw 进程在运行，移除该旁车文件，然后重新运行 Doctor。

## 共享状态 SQLite 压缩

请参阅 [数据库模式](/reference/database-schemas) 以了解 schema 版本控制、完整性检查和降级恢复。

`openclaw doctor --state-sqlite compact` 是针对规范共享状态数据库 `<state-dir>/state/openclaw.sqlite` 的显式离线维护。它不接受任意数据库路径，正常 Gateway 运行不会调用它，也不属于 `openclaw doctor --fix` 的一部分。该命令会获取与 Gateway 启动相同的状态所有权锁，并在验证、checkpoint、`VACUUM` 和最终完整性检查期间一直持有该锁。只要 Gateway 或另一个 SQLite 维护命令拥有该锁，它就会拒绝运行。即使 `OPENCLAW_ALLOW_MULTI_GATEWAY=1` 跳过了按配置划分的 Gateway 单例，状态锁仍然保持有效，因此运维 shell 不需要继承 Gateway 服务的环境变量也能检测到它。

请先停止 Gateway 并创建已验证的备份：

```bash
openclaw gateway stop
openclaw backup create --verify
openclaw doctor --state-sqlite compact --json
openclaw gateway start
```

该命令：

1. 要求在规范的共享状态路径上存在一个普通文件。缺失的数据库会被报告为 `skipped` 并成功退出。
2. 在 checkpoint 或修改文件之前，验证当前受支持的 schema 版本以及 `schema_meta.role = "global"`。
3. 要求非忙碌状态下的 `wal_checkpoint(TRUNCATE)`。如果 checkpoint 忙碌，请停止任何仍在运行的 OpenClaw 进程后重试。
4. 将 `auto_vacuum` 设为 `INCREMENTAL`，执行完整的 `VACUUM`，然后再次 checkpoint。
5. 运行 `quick_check`、`integrity_check` 和 `foreign_key_check`，然后重新应用仅所有者可访问的数据库及 SQLite sidecar 文件权限。

JSON 输出会在压缩前后报告数据库和 WAL 大小、freelist 页数、页大小，以及 `auto_vacuum` 值，并给出回收的字节数以及 `quick_check` 和 `integrity_check` 的结果。`foreign_key_check` 采用失败即关闭（fail-closed）的方式强制执行，没有单独的成功字段。SQLite 将 `auto_vacuum` 报告为 `0` 表示 none，`1` 表示 full，`2` 表示 incremental。

如果 schema 过旧、比当前运行的 OpenClaw 构建更新，或者属于 agent 数据库，压缩都会在不发生修改的情况下失败。对于较旧的共享状态 schema，请先运行 `openclaw doctor --fix`。对于较新的 schema，请恢复兼容的备份或升级 OpenClaw。

## Session SQLite 迁移

OpenClaw 会在网关启动期间以及运行 `openclaw doctor --fix` 期间，自动将旧版会话行和转录历史导入到每个代理的 SQLite 数据库中。`openclaw doctor --session-sqlite <mode>` 是用于该迁移的定向检查和验证工具。当前运行时会话行位于 `~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`。旧版 `sessions.json` 文件是迁移源。热转录 JSONL 文件在成功导入后会从活动会话目录中导入并归档；归档层 JSONL 文件仍然是支持性工件，不是运行时回退来源。

常规的 `openclaw doctor` 检查还会报告那些其初始会话头从未持久化的标准 SQLite 转录。`openclaw doctor --fix` 会在一个事务中添加当前头并重建转录索引，同时保留现有事件 ID、父链接、行时间戳和会话列表的最近性。没有头的旧版或格式错误的转录会继续被拒绝，直到其所属迁移能够验证它们为止。

模式：

| 模式       | 行为                                                                                                               |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| `inspect`  | 读取旧版和 SQLite 计数，以及未引用的 JSONL 文件，但不执行导入。                                                       |
| `dry-run`  | 解析旧版条目和转录 JSONL 文件，统计可导入的行，并报告问题，但不向 SQLite 写入任何行。                                 |
| `import`   | 将所选目标的旧版条目和转录事件导入到 SQLite 中。                                                                      |
| `validate` | 将所选旧版源与 SQLite 行及转录事件计数进行比较。                                                                      |
| `compact`  | 对所选代理的 SQLite 数据库执行 checkpoint 和 VACUUM，以在大规模删除或归档清理后回收空闲页。                           |
| `recover`  | 恢复最近一次失败的迁移运行，验证其目标，并准备一份经过清理的 GitHub issue 报告。                                     |
| `restore`  | 根据记录的迁移清单从归档的转录工件中恢复数据，但不删除 SQLite 数据。                                                   |

选择器：

- 默认：已配置的默认代理存储（当该旧版存储文件存在时）。
- `--session-sqlite-agent <id>`：一个已配置代理。
- `--session-sqlite-all-agents`：已配置代理存储加上已发现的代理存储。
- `--session-sqlite-store <path>`：一个显式的旧版 `sessions.json` 路径。

手动检查顺序：

```bash
openclaw doctor --session-sqlite inspect --session-sqlite-all-agents
openclaw doctor --session-sqlite dry-run --session-sqlite-all-agents --json
openclaw doctor --session-sqlite import --session-sqlite-all-agents
openclaw doctor --session-sqlite validate --session-sqlite-all-agents --json
openclaw doctor --session-sqlite compact --session-sqlite-all-agents
openclaw doctor --session-sqlite recover --github-issue
```

在重要历史数据的安装上运行 `import` 之前，请先备份 OpenClaw 状态目录。`validate` 在所选旧版条目缺失于 SQLite、会话 id 不同，或转录事件计数不同的时候，会以非零状态退出。使用 `--session-sqlite-store <path>` 时，请检查报告中是否包含预期的目标计数；不存在的显式存储路径会选择零个目标。

SQLite 删除操作会先在数据库内部回收页面；它们不一定会立即缩小数据库文件。删除或归档大型转录后，请运行 `openclaw doctor --session-sqlite compact --session-sqlite-all-agents` 以 checkpoint WAL 文件、运行 `VACUUM`，并报告数据库和 WAL 大小的前后变化。压缩要求一个带有当前代理 schema 的普通文件、所选代理的持久所有者元数据，并且 doctor 进程中没有打开句柄。破坏性的 `import`、`compact`、`recover` 和 `restore` 模式在整个操作期间持有与 Gateway 启动相同的状态所有权锁；`inspect`、`dry-run` 和 `validate` 仍然是只读的，不会获取该锁。请先停止 Gateway。破坏性模式会失败，而不是与实时写入竞争或与其他维护命令竞争。破坏性的 `--session-sqlite-store` 目标必须位于活动状态目录内；在维护另一套安装时，请将 `OPENCLAW_STATE_DIR` 设置为该存储所属的状态目录。已有的硬链接目标会被拒绝，因为另一路径可能在锁定的状态目录之外共享同一个数据库 inode。相同的所有权检查也适用于 SQLite WAL、shared-memory 和 rollback-journal 附属文件。

每次导入都会在将转录工件移动到归档之前，在 `~/.openclaw/session-sqlite-migration-runs/` 下写入清单。如果启动在工件已移动后报告 session SQLite 迁移失败，请运行恢复：

```bash
openclaw doctor --session-sqlite recover --github-issue
```

恢复会选择最近一次失败迁移的清单，只恢复该清单中的归档工件，验证受影响的目标，刷新经过清理的 `.failure.md` 和 `.failure.json` 报告，并准备一个避免包含转录内容、原始环境、密钥和无限制配置的 GitHub issue 正文。当不存在失败的迁移清单，但所选代理的 SQLite 数据库已损坏、不是数据库，或在没有主数据库的情况下存在 journal 附属文件时，恢复会把完整文件集复制到一个临时检查目录。SQLite 可以在该一次性副本中回滚有效的 hot journal，然后再运行 `quick_check`、`integrity_check` 和 `foreign_key_check`，而原始取证文件保持不变。失败的完整性检查或孤立的附属文件会通过为整个发现的文件集统一追加 `.corrupt-<timestamp>` 后缀，来保留 DB、WAL、SHM 和 rollback-journal 文件。如果捕获到重命名失败，已移动的文件会在报告失败前回滚，因此可恢复的文件集不会被静默拆分。恢复前请停止 Gateway；复制或重命名一个正在变化的 SQLite 文件集是不安全的，而且在不同操作系统上的行为也不同。使用 `--github-issue --yes` 时，doctor 会使用 GitHub CLI 在 `openclaw/openclaw` 中创建 issue；未确认时，它会写入本地支持报告并打印一个已预填的 issue URL。

`restore` 仍然是较低层级的撤销操作。它使用清单中的
`sourcePath -> archivePath` 记录，仅当原始路径不存在时才将归档工件移回，
当两个路径都存在时报告冲突，并保留 SQLite 数据库不变。当多个清单记录了同一个
原始路径时，restore 会先规划所有候选项，然后再移动其中任何一个。内容相同的归档
属于安全的重复项；一个非空的旧版 `sessions.json` 可以取代由旧版写入器创建的空副本。
不同的非空索引、不同的转录归档、无效归档，以及在没有记录先前恢复的情况下缺失的归档，
都会使操作安全失败，从而确保 restore 不会悄无声息地替换或隐藏可恢复的数据。

### 在 Session SQLite 迁移之后降级

在启动较旧的基于文件的 OpenClaw 版本之前，请先恢复归档的旧版转录工件：

```bash
openclaw doctor --session-sqlite restore --session-sqlite-all-agents
```

旧版本会读取 `sessions.json` 条目以及这些条目中记录的 `sessionFile` 路径。完成 SQLite 迁移后，成功导入会将热 JSONL 转录移动到 `session-sqlite-import-archive/` 中，因此较旧的运行时在 `restore` 将这些由清单记录的工件移回其原始路径之前，无法看到那段历史。

`restore` 不会删除 SQLite 数据。迁移到 SQLite 之后创建的会话只存在于 SQLite 中，旧运行时将不会显示它们。如果之后再次升级，请运行上面的正常迁移验证序列，以便 OpenClaw 在导入之前将恢复的旧版工件与 SQLite 行进行比较。

## 说明

- 在 Nix 模式（`OPENCLAW_NIX_MODE=1`）下，只读的 doctor 检查仍然有效，但 `doctor --fix`、`doctor --repair`、`doctor --yes` 和 `doctor --generate-gateway-token` 会被禁用，因为 `openclaw.json` 是不可变的。请改为编辑此安装对应的 Nix 源；对于 nix-openclaw，请使用面向代理的 [快速开始](https://github.com/openclaw/nix-openclaw#quick-start)。
- 交互式提示（密钥链/OAuth 修复等）仅在 stdin 是 TTY 且未设置 `--non-interactive` 时运行。无头运行（cron、Telegram、无终端）会跳过提示。
- 非交互式 `doctor` 运行会跳过急切的插件加载，以便无头健康检查保持快速。交互式会话仍会加载旧版健康检查/修复流程所需的插件界面。
- `--lint` 比 `--non-interactive` 更严格：始终为只读模式、从不显示提示、从不应用安全迁移。需要 doctor 修改内容时，请使用 `doctor --fix` 或 `doctor --repair`。
- 默认情况下，doctor 检查密钥时不会执行 `exec` SecretRef。仅当你确实希望 doctor 运行已配置的密钥解析器时，才使用 `--allow-exec`（可与 `--lint` 一起使用，也可单独使用）。
- 任何配置写入（包括 `--fix` 修复）都会将备份轮换到 `~/.openclaw/openclaw.json.bak`（并使用带编号的 `.bak.1` 到 `.bak.4` 环）。`--fix` 还会删除架构验证报告的未知配置键，并列出每个被删除的键；更新进行期间会跳过此操作，以免在迁移完成前移除部分写入的升级状态。
- 如果无法解析 `openclaw.json` 且无法恢复最近一次可用配置，`doctor --fix` 会将原文件保留为 `openclaw.json.clobbered.<timestamp>`，保持当前文件不变，并以错误退出，而不是写入不完整的替代文件。
- 当其他监管程序负责网关生命周期时，设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。Doctor 仍会报告网关/服务健康状况并应用非服务修复，但会跳过服务安装/启动/重启/引导以及旧版服务清理。
- Doctor 会报告受管理 Gateway 应用的堆限制，以及根据当前主机或容器内存限制使用的自适应推导结果。在修复流程之外，可使用 `openclaw gateway status` 获取相同报告。
- 在 Linux 上，doctor 会忽略未激活的额外类网关 systemd 单元，并且在修复期间不会重写正在运行的 systemd 网关服务的命令/入口点元数据。请先停止服务，或使用 `openclaw gateway install --force` 替换当前激活的启动器。
- `doctor --fix --non-interactive` 会报告缺失或过时的网关服务定义，但在更新修复模式之外不会安装或重写这些定义。对于缺失的服务，请运行 `openclaw gateway install`；要替换启动器，请运行 `openclaw gateway install --force`。
- 状态完整性检查会检测会话目录中的孤立转录文件。将它们归档为 `.deleted.<timestamp>` 需要交互式确认；`--fix`、`--yes` 和无头运行会将它们保留在原处。
- Doctor 会扫描历史上的 `~/.openclaw/cron/jobs.json` 存储以及之前配置的旧版存储位置，查找旧的 cron 任务格式，将任务和隔离记录导入 SQLite，并归档已迁移的 JSON 文件。
- Doctor 会报告带有明确 `payload.model` 覆盖值的 cron 任务，包括提供商命名空间计数以及与 `agents.defaults.model` 的不匹配情况，以便在排查认证或计费问题时发现未继承默认模型的计划任务。
- Doctor 会报告仍标记为执行中的 cron 任务（`state.runningAtMs`），这可能导致 `openclaw cron list` 将其显示为 `running`。此检查为只读操作：如果当前没有 Gateway 正在执行被标记的任务，那么下一次 cron 服务启动时会记录该次中断运行并清除标记。
- 在 Linux 上，当用户的 crontab 仍运行未维护的旧版 `~/.openclaw/bin/ensure-whatsapp.sh` 时，doctor 会发出警告；当 cron 缺少 systemd 用户总线环境时，该脚本可能错误地报告 `Gateway inactive`。
- 启用 WhatsApp 时，如果仍有本地 `openclaw-tui` 客户端运行，doctor 会检查 Gateway 是否存在性能下降的事件循环。`doctor --fix` 只会停止经过验证的本地 TUI 客户端，以避免 WhatsApp 回复排在过时的 TUI 刷新循环之后。
- 当存在 HTTP(S) 代理环境变量但禁用了 `tools.web.fetch.useTrustedEnvProxy` 时，doctor 会说明 `web_fetch` 仍使用直接路由，执行一次简短的直接 TLS 连通性探测，并指出明确的启用选项。它绝不会自动启用代理信任。
- Doctor 会将旧版 `codex/*` 和 `openai-codex/*` 模型引用重写为规范的 `openai/*` 引用，覆盖主模型、备用模型、模型允许列表、图像/视频生成模型、心跳/子代理/压缩覆盖项、钩子、频道模型覆盖项、cron 负载以及过时的会话/转录路由固定项。`--fix` 还会在安全的情况下合并旧版 `models.providers.codex` 和 `models.providers.openai-codex` 配置，将旧版 `openai-codex:*` 认证配置文件及 `auth.order.openai-codex` 条目迁移为 `openai:*`，将 Codex 意图移至按提供商/模型作用域的 `agentRuntime.id: "codex"` 条目，移除过时的整个代理/会话运行时固定项，并让修复后的 OpenAI 代理引用继续使用 Codex 认证路由，而不是直接使用 OpenAI API 密钥认证。
- Doctor 会报告非空的 `auth.order.<provider>` 列表（其引用的配置文件已全部消失），前提是仍存在兼容的已存储凭据。`doctor --fix` 只会删除这些过时的覆盖项，从而恢复按代理自动选择凭据的功能；显式为空的顺序、部分仍有效的列表，以及没有兼容已存储凭据的顺序都会保持不变。如果活动 SQLite 认证存储不可读或格式错误，doctor 会说明跳过此修复的原因。如果正在运行的 Gateway 的配置重新加载模式不会自动应用写入，请重启 Gateway 后再重新检查认证状态。
- Doctor 会清理旧版 OpenClaw 中遗留的插件依赖暂存状态，并为声明其为对等依赖的受管理 npm 插件重新链接主机上的 `openclaw` 包。它还会修复配置引用的缺失可下载插件（`plugins.entries`、已配置频道、已配置提供商/搜索设置、已配置代理运行时）。在软件包更新期间，doctor 会跳过软件包管理器插件修复，直到软件包替换完成；如果配置的插件仍需要恢复，请随后重新运行 `openclaw doctor --fix`。如果下载失败，doctor 会报告安装错误，并保留配置的插件条目，以便下次修复尝试。
- 当插件发现功能正常时，doctor 会通过从 `plugins.allow`/`plugins.deny`/`plugins.entries` 中删除缺失的插件 ID，以及匹配的悬空频道配置、心跳目标和频道模型覆盖项，来修复过时的插件配置。
- Doctor 会通过禁用受影响的 `plugins.entries.<id>` 条目并删除其无效的 `config` 负载，将无效的插件配置隔离。Gateway 启动时已经只会跳过该有问题的插件，因此其他插件和频道仍可继续运行。
- Doctor 会删除已退役的 `plugins.entries.codex.config.codexDynamicToolsProfile`；Codex app-server 始终会原生保留 Codex 原生工作区工具。
- Doctor 会将旧版扁平 Talk 配置（`talk.voiceId`、`talk.modelId` 及同类配置）自动迁移到 `talk.provider` + `talk.providers.<provider>`。当唯一差异是对象键顺序时，重复运行 `doctor --fix` 不会再报告或应用 Talk 规范化。
- Doctor 包含内存搜索就绪性检查，并可在缺少嵌入凭据时建议运行 `openclaw configure --section model`。
- 当未配置命令所有者时，doctor 会发出警告。命令所有者是允许运行仅限所有者命令并批准危险操作的人类操作员账户。DM 配对只允许某人与机器人对话；如果你在首次所有者引导功能存在之前批准过某个发送者，请显式设置 `commands.ownerAllowFrom`。
- 当配置了 Codex 模式代理且操作员的 Codex 主目录中存在个人 Codex CLI 资源时，doctor 会报告一条信息提示。本地 Codex app-server 启动会使用按代理隔离的主目录；如有需要，请先安装 Codex 插件，然后使用 `openclaw migrate plan codex` 清点应被有意提升的资源。
- 当默认代理允许使用的技能在当前运行环境中不可用（缺少二进制文件、环境变量、配置或操作系统要求）时，doctor 会发出警告。`doctor --fix` 可以通过设置 `skills.entries.<skill>.enabled=false` 来禁用这些不可用技能；如果希望保持技能激活，请改为安装/配置缺失的要求。
- 如果启用了沙箱模式但 Docker 不可用，doctor 会报告高信号警告及修复建议（`install Docker` 或 `openclaw config set agents.defaults.sandbox.mode off`）。
- 如果存在旧版沙箱注册表文件或分片目录（`~/.openclaw/sandbox/containers.json`、`~/.openclaw/sandbox/browsers.json`、`~/.openclaw/sandbox/containers/` 或 `~/.openclaw/sandbox/browsers/`），doctor 会报告它们；`--fix` 会将有效条目迁移到 SQLite，并隔离无效的旧版文件。
- 如果 `gateway.auth.token`/`gateway.auth.password` 由 SecretRef 管理，且在当前命令路径中不可用，doctor 会报告只读警告，不会写入明文备用凭据。对于由 exec 支持的 SecretRef，除非存在 `--allow-exec`，否则 doctor 会跳过执行。
- 如果在修复路径中检查频道 SecretRef 失败，doctor 会继续执行并报告警告，而不是提前退出。
- 状态目录迁移后，如果启用的默认 Telegram 或 Discord 账户依赖环境变量回退，且 doctor 进程无法获取 `TELEGRAM_BOT_TOKEN` 或 `DISCORD_BOT_TOKEN`，doctor 会发出警告。
- Telegram `allowFrom` 用户名自动解析（`doctor --fix`）要求在当前命令路径中存在可解析的 Telegram 令牌。如果令牌检查不可用，doctor 会报告警告，并在本次运行中跳过自动解析。

## macOS：`launchctl` 环境变量覆盖

如果你之前运行过 `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...`（或 `...PASSWORD`），该值会覆盖你的配置文件，并可能导致持续的“未授权”错误。

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

## 相关

- [CLI 参考](/cli)
- [Gateway 诊断](/gateway/doctor)
