---
summary: "CLI `openclaw memory` （status/index/reset/search/forget/promote/promote-explain/rem-harness/rem-backfill/session-backfill） 的参考"
read_when:
  - "你想索引或搜索语义记忆"
  - "你在排查记忆可用性或索引问题"
  - "你想把回忆到的短期记忆提升到 `MEMORY.md`"
  - "您需要删除源自特定会话或参与者的来源跟踪记忆"
title: "记忆"
doc-schema-version: 1
---

# `openclaw memory`

管理语义记忆索引、搜索、升级到 `MEMORY.md` 以及基于来源的删除。由捆绑的 `memory-core` 插件提供。 `plugins.slots.memory` 默认选择 `memory-core`。其他内存插件公开它们自己的 CLI 命名空间。

`search` 和 `session-backfill` 在运行时通过本地网关进行路由。搜索保留其结果限制、会话范围和调用记录。启用梦想后，这些召回将提供给请求的客服人员的工作空间，就像离线搜索时一样。回填预览、应用和回滚保留其现有输出。 Apply 保持其有界批处理循环，并且自始至终都需要相同的网关所有者；失败的请求永远不会在本地重播。如果旧网关不支持此路由，请更新它。

其他命令以及使用 `--rem` 或 `--archive-files` 的会话回填需要停止本地网关。诊断和预览可以初始化可写存储。通过其服务所有者停止网关，运行命令，然后重新启动它。当网关拥有状态目录时，命令会在打开这些存储之前拒绝；离线执行通过管理器和工作器清理保留独占所有权。 `memory.status` RPC 返回的提供者运行状况与 CLI 的聚合索引、源、嵌入以及梦想诊断和修复选项不同。

当另一个插件拥有内存插槽并且 `memory-core` 仅作为梦想整合 sidecar 运行时：

- `memory status` 报告所选提供商的 id 和健康状况（使用主机状态权限打开）以及做梦状态，而不是 Memory Core 自己的索引。 `--json` 返回 `[{"agentId","provider","health","memoryCore":"consolidation-sidecar"}]`。 `--deep`、`--index` 和 `--fix` 退出时代码为 1，因为它们检查内存核心自己的索引。
- `memory search` 以代码 1 退出，并命名插槽所有者，而不是搜索 sidecar 索引。
- `index`、`reset`、`forget`、`promote` 和 REM 命令继续处理内存核心的 sidecar 索引并打印一条通知（在带有 `--json` 的 stderr 上）。

相关内容：[记忆](/concepts/memory) 概念、[梦境](/concepts/dreaming)， [记忆配置参考](/reference/memory-config)、[记忆 Wiki](/plugins/memory-wiki)， [wiki](/cli/wiki)、[插件](/tools/plugin)。

## <a id="json-availability"></a> JSON 可用性

在任何工作运行之前，使用 `--json`、`search`、`promote`、`promote-explain`、`rem-harness`、`rem-backfill` 和 `session-backfill` 报告内存后端不可用：

- Disabled 内存返回 `{"agentId":"main","status":"disabled"}` 并成功退出。
- 后端获取失败返回标准 `{"ok":false,"error":{"type":"cli_error","message":"..."}}` 信封，加上 `agentId`，并以代码 1 退出。

无效的命令输入和命令执行期间的错误也使用标准的 [CLI JSON 失败信封 ](/cli#json-failures) 并以代码 1 退出。失败消息解释了命令错误；人类可读的诊断保留在 stderr 上。

在读取命令的正常结果字段之前处理这些结果。启用但没有匹配项的搜索仍会返回 `{"results":[]}`。 `status --json` 保留其可用代理的聚合数组，包括 `[]`（当所有代理均被禁用时）；获取失败仍然设置非零退出代码。

## `memory status`

```bash
openclaw memory status [--agent <id>] [--deep] [--index] [--fix] [--json] [--verbose]
```

不带 `--agent` 时，将对 `agents.entries` 中的每个 agent 运行；如果没有配置 agent 列表，则回退到默认 agent。

| 标志        | 作用                                                                                                                                                                                                                                                                            |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--deep`    | 检查向量存储、嵌入提供程序和语义搜索准备情况（意味着额外的提供程序调用）。普通 `memory status` 保持快速并跳过此操作；完整的持久索引显示为 `indexed (unprobed)`，而未知的 vector/semantic 状态表示未检查。 |
| `--index`   | 如果存储处于脏状态，则重新建立索引。隐含启用 `--deep`。                                                                                                                                                                                                                                  |
| `--fix`     | 修复过期的召回锁，并规范化提升元数据。                                                                                                                                                                                                                       |
| `--json`    | 输出 JSON。                                                                                                                                                                                                                                                                       |
| `--verbose` | 输出每个阶段的详细日志。                                                                                                                                                                                                                                                     |

通过本地 llama.cpp 嵌入，`--deep` 和 `--index` 还显示可用的服务器、模型、功能和端点诊断。

修复保留记录的召回天数，包括与 UTC 不同的本地日期。仅当没有记录日期时，它才从上次调用时间戳开始填充一天。

如果 `Dreaming` 行保持 `off`，即使使用 `dreaming.enabled: true`，或者计划的扫描似乎从未运行，则托管梦想 cron 依赖于默认代理的心跳触发来触发协调。有关调度详细信息，请参阅 [Dreaming](/concepts/dreaming)。

状态还列出了来自 `memory.search.extraPaths` 的任何额外搜索路径。存储诊断显示共享代理数据库文件 WAL、可重用的空闲页面以及保留的嵌入缓存有效负载字节和条目计数，包括禁用缓存时的情况。每个源文本加嵌入总数仅描述索引块。这些数字重叠：不要向文件大小添加有效负载或可重用字节。数据库还保存会话和其他代理状态； WAL 可以包含尚未检查点到主文件中的较新页面。 JSON 在 `status.storage` 下揭露了这些事实。字节检查仅针对显式诊断运行，而不是正常的内存搜索。对于在初始化时发现其默认模型的提供者，普通状态会推迟模型身份检查，直到该模型已知为止。使用 `--deep` 初始化提供程序并根据现有索引验证模型和提供程序设置。

会话资格不包括未索引的转录本，其解析内容完全由系统生成，符合索引器的准入规则。这些成绩单不会让状态变得肮脏；稍后的用户内容使他们有资格再次索引。

## `memory index`

```bash
openclaw memory index [--agent <id>] [--force] [--verbose]
```

每个代理的范围与 `status` 相同。 `--force` 运行完整重新索引而不是增量重新索引。 `--verbose` 在显示索引进度之前打印每个代理提供程序、模型、源和额外路径详细信息。完成消息报告索引文件计数。空语料库是成功的无操作：该命令报告已解析的工作空间路径并且没有索引任何内容，并留下缺失的 `memory/` 目录以供第一次内存写入创建。内部梦想叙事、计划任务和心跳会话记录被排除在索引之外，包括保留的压缩叙事档案，其原始会话不再活跃。 `memory forget` 先前选择的会话也仍被排除。 `--force` 删除两个组的过时索引记录，而不重新索引其保留的转录本。普通保留、重置和删除的用户会话存档在明确定位之前仍然有效。

完全重建在报告完成之前等待临时数据库清理。文件删除异步运行，因此清理不会阻止网关事件循环。

当嵌入提供程序对索引进行速率限制时，每个嵌入操作最多可获得五次尝试。重试遵循有效的提供程序冷却提示，每次等待时间上限为 60 秒。其他瞬态错误会保留较短的三次尝试预算。没有冷却提示的永久配额错误会停止该操作。详细输出显示每次重试等待。

对于 OpenAI 和 OpenAI- 兼容嵌入，设置 `OPENCLAW_DEBUG_MEMORY_EMBEDDINGS=1` 来记录远程请求计数、HTTP 状态、提供的响应大小以及向量形状。这些诊断忽略标头、URL、输入文本和矢量内容。验证错误会识别提供商、模型、批量大小和拒绝条件。被拒绝的批次仍会中止索引；完全重建仅发布完整的索引。

交互式 `memory_search` 在代理工具的 30 秒截止期限内保留 3 次尝试和最多 8 秒的总重试睡眠时间。取消的调用者会中断其重试等待。

OpenClaw 索引格式升级后，第一个搜索会在返回结果之前重建索引。重建可能需要更长的时间，并且搜索结果会显示已配置的嵌入提供程序可能产生的成本。由较新的 OpenClaw 版本编写的索引仍处于暂停状态；明确升级 OpenClaw 或重新索引。稍后的搜索将重用修复后的索引；仅状态检查并不能重建它。并发搜索等待主动修复。缓慢的修复可能会超出交互式工具的最后期限；当承认的索引工作完成时，该工具报告不可用。如果在发布之前格式修复失败，搜索将报告记录的同步错误并保留先前的索引。在重试之前使用 `memory status --deep` 检查该故障。

如果更改嵌入设置后状态报告索引身份警告，请检查受影响代理的提供程序、模型、源和额外路径，然后重建：

```bash
openclaw memory status --deep --agent <id>
openclaw memory index --force --agent <id>
openclaw memory status --agent <id>
```

`openclaw memory status --index --agent <id>` 还会重建不兼容的索引。两个修复命令都会替换派生的内存索引，同时保留其他代理状态。使用 `--agent` 将修复限制为受影响的代理。

<Warning>
默认的 `openclaw-agent.sqlite` 数据库还包含存储的会话、记录和其他持久代理状态。切勿删除它或其 `-wal`、`-shm` 或 `-journal` sidecar 来重置内存索引。使用`memory index --force`重建，或者[`memory reset`](/cli/memory#memory-reset)清除派生索引和嵌入缓存；参见[安全索引恢复](/concepts/memory-builtin#safe-index-recovery)。
</Warning>

## `memory reset`

清除内置内存索引和嵌入缓存，而不删除会话、记录或内存文件。

```bash
openclaw memory reset [--agent <id>] [--yes]
```

每个代理作用域与 `status` 和 `index` 相同：如果没有 `--agent`，则重置​​会对每个配置的代理运行，在未配置列表时回退到默认代理。该命令要求确认。 `--yes` 跳过提示，在非交互式终端中是必需的。

重置以原子方式删除并重新创建 `agents/<agentId>/agent/openclaw-agent.sqlite` 中仅内存拥有的派生表，清除索引内容和缓存的嵌入，同时保留所需的修订簿记。非内存数据库表和内存源文件保持不变。没有索引的代理是成功的空操作。重置坐标与现有内存维护并不会重新启动网关；正在运行的网关可以在之后重新索引保留的源。如果索引正忙，请让它完成并重试重置。

之后从保留的源重建：

```bash
openclaw memory reset --agent main --yes
openclaw memory index --agent main
```

重置不会收缩数据库文件或恢复因删除而丢失的数据。要回收磁盘空间，请在重建之前按照 [disk-space recovery](/concepts/memory-builtin#reclaim-disk-space) 进行操作。这不是隐私清除：使用 [`memory forget`](/cli/memory#memory-forget) 删除从选定会话派生的跟踪内存并防止重新摄取。

## `memory search`

```bash
openclaw memory search [query] [--query <text>] [--agent <id>] [--max-results <n>] [--min-score <n>] [--json]
```

- 查询：位置参数 `[query]` 或 `--query <text>`。如果两者同时设置，则以 `--query` 为准。如果两者均未设置，命令将报错。
- `--agent <id>`：默认为默认代理（而非完整的代理列表）。
- `--max-results <n>`：限制结果数量（正整数）。
- `--min-score <n>`：过滤掉低于此分数的匹配项。

搜索返回后，常规索引可以继续，并且不会添加警告。如果自动索引失败，或者索引标识不兼容，人工输出会警告匹配可能不完整。对于 `--json`，响应会添加 `stale: true`、`warning` 和 `action` 字段。仅当 `stale` 不存在时，才将空 `results` 数组视为权威数组。

如果记录搜索以供以后内存升级失败，搜索仍会返回其匹配项，并显示一条警告，指出记录错误。

Control UI 的“记忆”选项卡在陈旧的搜索结果旁边显示相同的警告和恢复指南，并在新搜索后清除它们。

## `memory forget`

删除从选定会话中派生的可识别记忆工件，并将这些会话记录为被遗忘在一个代理的存储中。有关沿袭、准入策略和删除覆盖范围之间的关系，请参阅 [ 内存来源和删除](/concepts/memory-provenance)。

<Warning>
除非设置了 `--dry-run`，否则此命令将立即删除。没有确认提示或 `--apply` 标志。保留源会话记录。
</Warning>

从预览开始：

```bash
openclaw memory forget --agent <agent-id> --session <id-or-key> --dry-run --json
openclaw memory forget --agent <agent-id> --hook-source gmail --dry-run --json
openclaw memory forget --agent <agent-id> --participant <actor-id> --dry-run --json
```

检查报告后，重复不带 `--dry-run` 的预期命令。

| 标志                       | 作用                                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `--agent <id>`             | 选择一名智能体。默认为默认代理，而不是所有代理。                                               |
| `--session <id-or-key>`    | 通过会话ID或按键选择；可重复的。                                                                       |
| `--hook-source <source>`   | 选择具有此录制的外部内容挂钩源的实时会话；可重复的。                              |
| `--participant <actor-id>` | 选择与此录制的参与者演员 ID 的现场会话；可重复的。                                      |
| `--since <date>`           | 包括该日期当天或之后创建的会话。使用带有时区的 ISO 时间戳来实现明确的截止。 |
| `--dry-run`                | 计算报告而不更改内存文件、索引、插件状态或忘记的会话记录。           |
| `--json`                   | 将完整报告打印为 JSON。                                                                                 |

### <a id="session-selection"></a> 会话选择

至少需要一个选择器。重复值和不同选择器类型与**OR**结合：选择与任何选择器匹配的会话，服从`--since`。选择器匹配记录的标识符，而不是消息中的名称或文本。参与者选择器选择整个会话，包括其他参与者的贡献。

`--participant` 有意跨身份命名空间匹配原始参与者 ID；它不是仅配置文件的选择器。报告的 `participantMatches` 显示与每个请求的 ID 匹配的键入身份，包括不明确的匹配。删除之前，请检查这些身份以及 `--dry-run --json` 中选定的整个会话。配置文件合并不会默默地重新解释原始选择器。

显式 ID 和密钥针对已配置的 `session.store` 中的实时会话和保留存档进行解析，包括自定义和共享存储。匹配范围仍限于所选代理。该报告将每个结果标记为 `live`、`archived` 或 `unresolved`。未解析的显式值按字面意思记录为会话 ID，以供将来排除；它并不证明已找到所请求的会话。 ID 完全匹配且区分大小写，包括匹配保留的存档名称时。缩写不选择较长的会话 ID。

挂钩源和参与者选择器需要实时元数据；仅存档的记录不保留这些事实。通过完整的 ID 或密钥选择这些档案。挂钩源匹配是精确的：IMAP 使用 `email`，Gmail 挂钩使用 `gmail`，通用 Webhooks 使用 `webhook`。当原始确切来源消失时，仅包含粗略 `webhook` 分类的旧保留记录无法将 IMAP 与通用 Webhook 区分开来；而是通过完整的 ID 选择这些会话。 `--since` 使用实时会话的创建时间或存档的创建时间，而不是单个消息时间戳。未解析的显式 ID 没有时间戳并保持选中状态。

### <a id="read-the-report"></a> 阅读报告

| 字段                              | 含义                                                                                                                                              |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agentId`, `dryRun`                | 存储所选内容以及这是否是预览。                                                                                                       |
| `sessionIds`, `sessionResolutions` | 选定的 ID 以及每个 ID 的解析方式；分辨率还可以包括`sessionKey`。                                                                      |
| `entryKeys`                        | 所选会话中至少有一个来源的输入键。                                                                                        |
| `mixedLineageEntryKeys`            | 选定的条目也有未选定的来源；它们被整个移除。                                                                          |
| `untargetableEntryKeys`            | 在此智能体的商店中发现没有原始行的促销标记。这并没有列举未标记的散文。                                           |
| `curatedWrites`                    | 要查看的文件，包含 `relativePath` 和 `observedAt`（Unix 毫秒）。包括受支持的记录的写入尝试，这些尝试可能未成功。 |
| `artifacts`                        | 匹配文件、条目、行和存储行的计数如下所述。                                                                            |
| `refusals`                         | 历史整合突出需要人工审查。空列表不能建立完整的删除覆盖范围。                              |

Preview和apply使用相同的匹配逻辑，但各自读取当前状态；预览不是不可变的计划或对后续写入的锁定。应用内存插件的暂存和文件突变的坐标。它会在准备后重新检查选定的沿袭，并在计划发生更改时刷新计划，同时保留已标识为属于选定会话的条目。索引会丢弃过时的结果，而不是恢复已清除的块或缓存的嵌入；重新运行报告源更改的索引命令。直接代理编辑和外部编写器不共享该锁，因此在敏感清理期间暂停它们。之后重新运行预览。空选择或零计数并不能证明没有相关数据剩余。

### <a id="if-deletion-fails"></a> 如果删除失败

删除不是跨文件和存储的一项事务。索引和插件状态清理（包括重写备份）在内存文件编辑之前运行；语料库和原始证据最后被删除，以便重试可以识别剩余的工件。如果清除失败，请解决报告的存储或文件系统错误，并使用相同的选择器重新运行相同的命令。不要手动删除其语料库或原始记录。成功后，使用 `--dry-run` 重复该命令以查看剩余内容。

### <a id="artifacts-removed"></a> 伪影已删除

清除会从扫描的内存文件、选定的会话语料库行和选定的会话转录索引块中删除匹配的升级标记条目和会话引用部分。它清除关联的全文和向量行、匹配短期状态、摄取可见哈希范围和原始行。匹配的内容是从梦想重写备份中删除的，而不是删除每个备份。

对于非空会话选择，Forget 还会清除所选代理的整个嵌入缓存，包括未完成的索引重建中保留的结果。这些结果可能尚未链接到已发布的索引块。不相关的已发布索引条目仍然可用，但以后的索引可能需要重新生成其缓存的嵌入。试运行报告包括整个缓存删除计数；试运行或空会话选择不会清除缓存。

合并保留了被替换的升级标记的起源，同时保留了引用它们的重写原像。仅在实时条目、保留的原像、日记摘录和索引快照停止引用键后，才会修剪这些起源。新的合并历史摘录带有替换条目的沿袭并随之删除。即使在备份轮换之后，它们的起源仍然存在，而摘录仍然存在；日记历史记录不会自动过期。在共享工作区中，即使第一次清除已经删除了共享文件内容，稍后对另一个代理的清除也会检查其索引快照。

当选择非空时，它还会清除内部梦想叙述、cron 或心跳会话的陈旧索引记录。因此，索引清理可以包括比选定的会话更多的内容，并且来自已更改的内存文件的所有块可能对于以后的重新索引来说是无效的。

`artifacts` 计数器是：

- `memoryFiles`、`memoryEntries`、`memoryLines`：更改了内存文件，删除了标记的条目或会话引用部分，以及包含精确选择的语料库片段的额外整行。
- `sessionCorpusFiles`、`sessionCorpusLines`：更改语料库文件并删除语料库行。
- `indexChunks`、`indexSources`、`ftsRows`、`vectorRows`、`embeddingCacheRows`：删除了索引和缓存记录。
- `shortTermEntries`、`seenHashScopes`、`backups`、`originRows`：删除短期条目和重复数据删除范围、重写备份记录并删除源源行。

具有混合血统的条目将被整体删除；该命令不会重写它们以仅保留未选定的贡献。幸存的源稍后可能会支持新条目，但不能保证重新生成。

### <a id="readmission-and-retained-data"></a> 重新访问和保留数据

真正的清除会在删除工件之前将选定的会话 ID 记录在代理的 SQLite 数据库中。自动做梦摄取，`memory session-backfill`，和转录索引，包括`memory index --force`，检查这些记录。自动摄取记录原因`forgotten`。重复清除不会删除排除项，删除准入策略规则也不会撤消它。先前的清除不会排除未来使用新 ID 的会话。

新的会话回填日记事实和反思带有条目标记和来源来源，包括 REM 预览和失败应用留下的日记块。遗忘会删除每条匹配行，包括转换或组合的声明；不相关的行仍然存在。历史上未标记的回填文本没有重建的谱系。梦日记中的精确语料引用如`DREAMS.md`和`memory/dreaming/**/*.md`可以整行删除。未追踪的释义无法可靠地归因并保留。

`curatedWrites` 记录本身不会删除文件或其自由形式编辑。保留的记录中最新的文件级写入观察者记录和支持的 `write`、`edit` 和 `apply_patch` 调用可识别要查看的文件。这不是对 shell 写入或外部编辑器的完整审核。报告的文件仍然可以通过单独的标记、会话引用或精确引用清理来更改。

<Warning>
在源会话跟踪之前暂存的条目可能缺少原始行并在清除后保留；分别审查它们。当前会话回填保留起源，但不重建丢失的历史谱系。重写原始行已丢失的备份也需要单独审查；这不会自动修复早期不完整的清除。 `untargetableEntryKeys` 并未枚举每个未跟踪的候选者或内存。

源记录、保留的档案、其他代理的索引、导出和外部备份也需要单独审查。特别是，[会话删除](/cli/sessions#delete-sessions)通常会保留已删除的转录本存档；这并不是删除所有对话副本。
</Warning>

## `memory promote`

从 `memory/YYYY-MM-DD.md` 中对短期候选项进行排序，并可选择性地将排名靠前的条目附加到 `MEMORY.md`。

```bash
openclaw memory promote [--agent <id>] [--limit <n>] [--min-score <n>] \
  [--min-recall-count <n>] [--min-unique-queries <n>] [--apply] [--include-promoted] [--json]
```

| 标志                       | 默认值        | 作用                                                            |
| -------------------------- | -------------- | ----------------------------------------------------------------- |
| `--limit <n>`              | 所有候选人 | 最大候选者为 return/apply.                                   |
| `--min-score <n>`          | `0.75`         | 晋升所需的最低加权分数。                                 |
| `--min-recall-count <n>`   | `3`            | 所需的最低召回次数。                                    |
| `--min-unique-queries <n>` | `3`            | 所需的最低不同查询数量。                            |
| `--apply`                  | 仅预览   | 将选定的候选项追加到 `MEMORY.md`，并将其标记为已晋升。 |
| `--include-promoted`       | 关闭            | 包含之前周期中已经晋升的候选项。           |
| `--json`                   | 关闭            | 输出 JSON。                                                       |

CLI 和定期的梦境扫描共享以下深度阶段默认值。 显式指定的 CLI 标志会在一次性手动运行中覆盖这些默认值。

来源为 `untrusted` 或 `system` 的条目在排名前被排除，因此它们不会占用预览限制或出现在 `promote-explain` 中。在编写之前，促销仍然会重新检查当前的出处。

排名信号：回忆频率、检索相关性、查询多样性、时间新近度、跨日整合和派生概念丰富度，来自记忆回忆和每日摄取过程，加上用于重复做梦重访的 light/REM 阶段强化增强。在编写之前，促销会重新读取实时每日笔记，因此会尊重排名以来对短期片段的编辑或删除，而不是从陈旧的快照进行促销。

## `memory promote-explain`

解释一个晋升候选项的分数构成。

```bash
openclaw memory promote-explain <selector> [--agent <id>] [--include-promoted] [--json]
```

`<selector>` 匹配候选项的键（精确匹配或子串匹配）、路径或片段文本。

## `memory rem-harness`

预览 REM 反思、候选真相和深度阶段晋升输出， 而不写入任何内容。

```bash
openclaw memory rem-harness [--agent <id>] [--path <file-or-dir>] [--grounded] [--include-promoted] [--json]
```

- `--path <file-or-dir>`：从历史 `YYYY-MM-DD.md` 日常文件而不是实时工作区来为 harness 提供种子。
- `--grounded`：还根据历史笔记渲染接地的 `What Happened` / `Reflections` / `Possible Lasting Updates` 预览。

## `memory rem-backfill`

将有依据的历史 REM 摘要写入 `DREAMS.md` 以供 UI 审核。 可逆。

```bash
openclaw memory rem-backfill --path <file-or-dir> [--agent <id>] [--stage-short-term] [--json]
openclaw memory rem-backfill --rollback [--rollback-short-term] [--json]
```

- `--path <file-or-dir>`：除非设置了 `--rollback`/`--rollback-short-term`，否则为必需。用于回填的历史日记内存文件或目录。
- `--stage-short-term`：同时将有依据的持久候选项播种到实时短期晋升存储中，以便正常的深度阶段对其进行排序。
- `--rollback`：从 `DREAMS.md` 中移除先前写入的有依据的日记条目。
- `--rollback-short-term`：移除先前暂存的有依据的短期候选项。

## `memory session-backfill`

将保留的会话历史提炼为基础的短期候选者。它与梦想共享成绩单信任分类、准入政策和语料库存储。分阶段候选者会保留每个贡献会话的来源，以便 `memory forget` 稍后可以选择它们。配置的排除适用于预览、REM 和应用模式；被遗忘的会话在每种模式下都被排除在外。默认为只读预览，按从最旧的未处理日期到最新的顺序排列。

```bash
openclaw memory session-backfill --agent <id> [--from YYYY-MM-DD] [--to YYYY-MM-DD] \
  [--limit-days <n>] [--archive-files <path...>] [--rem | --apply] [--json]
openclaw memory session-backfill --agent <id> --rollback [--json]
```

| 标志                        | 默认值      | 作用                                                                                                        |
| --------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------- |
| `--from YYYY-MM-DD`         | 无         | 包含 dreaming 时区中当天及之后的消息。                                               |
| `--to YYYY-MM-DD`           | 无         | 包含 dreaming 时区中当天及之前的消息。                                              |
| `--limit-days <n>`          | `92`         | 最多处理这么多未进行哈希跟踪的日期，按从最早到最晚的顺序处理。                                                  |
| `--archive-files <path...>` | 无         | 同时检查外部转录文件，并将其作为不可信输入；不接受其中嵌入的所有者元数据。            |
| `--rem`                     | 关闭          | 将基于规则的每日预览写入 `DREAMS.md` 并保留其源记录。             |
| `--apply`                   | 仅预览 | 排空所有有界批次，暂存可信候选项，并写入可逆的 `DREAMS.md` 日记区块。           |
| `--rollback`                | 关闭          | 移除所有基于依据的回填候选项和共享回填日记区块，包括 `rem-backfill` 产物。 |
| `--json`                    | 关闭          | 输出机器可读的每日计数和候选项排名。                                                     |

该命令读取所选代理的会话存储，包括会话轮换中保留的 SQLite 转录本身份。它使用与实时会话摄取相同的跟踪消息哈希和每次运行上限，因此重复的 `--apply` 运行会跳过已经摄取的消息。会话商店中的所有者和代理线路均符合资格；工具输出、网络或非所有者输入以及没有值得信赖的所有者出处的转弯均被排除在外。外部档案文件没有经过身份验证的所有者出处合同，因此其嵌入的所有权字段仍然不受信任且无法暂存。之前使用 [`memory forget`](/cli/memory#memory-forget) 清除的会话仍会永久排除在外，包括当其原始记录仍然存在或跟踪的哈希值已被清除时。

`--apply` 会在一次调用中将所选历史处理至完成，同时将每个有界批次置于各自的事务中。人类可读输出和 JSON 输出都会报告每批次的进度，以及批次总数、候选项总数和已暂存条目总数。成功执行 apply 后立即进行预览时，报告的新候选项数量将为零。它只会写入 `memory/.dreams/` 下的会话语料库、短期暂存状态以及 `DREAMS.md` 中可逆的日记条目。它绝不会写入 `MEMORY.md` 或 `USER.md`；持久化提升仍由单独的 `memory promote` 或 dreaming 决策完成。`--rem` 和 `--apply` 互斥。

两种写作模式都会在发布文本之前记录日记来源，因此以后应用失败不会留下无法追踪的日记引用。 REM 仅保留日记及其原始簿记：它不保留会话语料库、阶段候选项、高级摄取光标或调用模型。

回填回滚有意与 `memory rem-backfill` 共享：两个命令都使用相同的仅接地暂存类和日记标记。仅当您打算从该工作区清除这两个命令的接地回填工件时，才运行 `session-backfill --rollback`。回滚还会删除会话回填添加的跟踪哈希值，并倒回受影响的成绩单光标，因此可以预览并再次应用幸存的合格候选者。回滚不会删除被遗忘的会话记录或重新允许已清除的会话。

## <a id="dreaming"></a> 做梦

Dreaming是一个后台记忆整合系统，具有三个合作阶段，按一个时间表依次运行：**light**（sort/stage短期材料）、**REM**（反映和表面主题）、 **deep**（将持久事实提升到`MEMORY.md`）。仅深度写入 `MEMORY.md`。

- 通过 `plugins.entries.memory-core.config.dreaming.enabled: true` 启用（默认值为 `true`）；`memory-core` 会自动管理扫描 cron 任务，无需手动执行 `openclaw cron add`。
- 在聊天中通过 `/dreaming on|off` 切换；通过 `/dreaming status` （或 `/dreaming`/`/dreaming help`）查看状态。`on`/`off` 要求频道所有者身份或网关 `operator.admin` 权限；任何可以调用该命令的用户都可以使用 `status` 和帮助功能。
- 人类可读的阶段输出会写入 `DREAMS.md`（或已有的 `dreams.md`）。 默认情况下（`dreaming.storage.mode: "separate"`），每个阶段还会将独立报告写入 `memory/dreaming/<phase>/YYYY-MM-DD.md`；将 `mode: "inline"` 设置为将报告合并到每日记忆文件中，或设置为 `"both"` 以同时写入两者。
- 计划运行和手动执行的 `memory promote` 会共享相同的 deep 阶段排序信号和默认阈值； 显式 CLI 标志仍仅对单次运行生效。
- 计划运行会分发到每个已配置代理的记忆工作区。

计划默认值（`plugins.entries.memory-core.config.dreaming`）：

| 键                                    | 默认值     |
| -------------------------------------- | ----------- |
| `frequency`                            | `0 3 * * *` |
| `phases.deep.minScore`                 | `0.75`      |
| `phases.deep.minRecallCount`           | `3`         |
| `phases.deep.minUniqueQueries`         | `3`         |
| `phases.deep.recencyHalfLifeDays`      | `14`        |
| `phases.deep.maxAgeDays`               | `30`        |
| `phases.deep.maxPromotedSnippetTokens` | `160`       |

```json
{
  "plugins": {
    "entries": {
      "memory-core": {
        "config": {
          "dreaming": {
            "enabled": true
          }
        }
      }
    }
  }
}
```

完整键列表和阶段详情：[做梦](/concepts/dreaming)， [记忆配置参考](/reference/memory-config#dreaming)。

## <a id="secretref-gateway-dependency"></a> SecretRef 网关依赖

如果活动内存远程 API key 字段配置为 SecretRefs，`memory` 命令会从活动网关快照中解析它们；如果网关不可用，该命令会快速失败。这要求网关支持 `secrets.resolve` 方法；较旧的网关会返回 unknown-method 错误。

当另一个插件拥有内存插槽时，`memory status` 和 Doctor 的内存探针也会在打开提供程序之前解析该插件的清单声明的凭据。如果无法解析凭据，他们会将提供程序报告为不可用，而不是使用未解析的引用进行身份验证。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [内存概览](/concepts/memory)
