---
summary: "CLI 用于列出、导入、存档、删除和维护存储会话的参考"
read_when:
  - "你想列出已存储的会话并查看近期活动"
  - "你想从无头 Gateway 归档或删除会话"
  - "您想要在 OpenClaw 中保留本机工具转录本"
title: "会话"
---

# `openclaw sessions`

列出存储的对话会话。

会话列表不是 channel/provider 活动检查。它们显示来自会话存储的持久对话行。在处理消息之前，安静的 Discord、Slack、Telegram 或其他通道可以成功重新连接，而无需创建新的会话行。当您需要实时频道连接时，请使用 `openclaw channels status --probe`、`openclaw status --deep` 或 `openclaw health --verbose`。

```bash
openclaw sessions
openclaw sessions --agent work
openclaw sessions --all-agents
openclaw sessions --active 120
openclaw sessions --limit 25
openclaw sessions --store ./tmp/sessions.json
openclaw sessions --json
```

`openclaw sessions list` 是默认列表操作的显式拼写，并接受相同的标志。

人类可读的列表和清理预览使用终端宽度的表格。长模型名称和标志会换行而不被截断，并且 Unicode 键保持对齐。长键显示其开始和结束；使用 `openclaw sessions --json` 获取完整的会话密钥。

1,000 以下的代币数量显示为整数；较大数量使用紧凑型 `k` 或 `m` 标签。 JSON 输出保留精确的数字计数。

上下文分母遵循所选模型和运行时，使用本地网关的已发布目录、保存的元数据、配置的限制或匹配的经过验证的运行预算。读取会话列表不会启动模型发现。表中未知容量为`?`，JSON中为`null`，无百分比。如果网关检查或其目录读取失败，该命令会发出警告，并仍然列出使用已保存或配置的容量的存储会话。

标志：

| 标志                 | 描述                                                         |
| -------------------- | ------------------------------------------------------------------- |
| `--agent <id>`       | 一个已配置的代理存储（多个显式代理需要）。 |
| `--all-agents`       | 聚合所有已配置的 agent 存储。                              |
| `--store <path>`     | 旧版存储选择器路径（无法与 `--all-agents` 组合）。    |
| `--active <minutes>` | 只显示过去 N 分钟内更新过的会话。               |
| `--limit <n\|all>`   | 输出的最大行数（默认 `100`；`all` 可恢复完整输出）。     |
| `--json`             | 机器可读输出。                                            |
| `--verbose`          | 详细日志。                                                    |

`--store` 接受记录的旧选择器形式，包括 `sessions.json` 和无后缀自定义选择器。 OpenClaw 将该选择器解析为其物理 SQLite 目标，验证目标是否存在且可用，并报告其实际读取的物理路径。当您必须选择拥有商店的已配置代理时，请将其与 `--agent <id>` 结合使用。

`--agent` 和 `--store` 需要非空白值。选择错误退出非零，并在设置 `--json` 时使用标准 [CLI JSON 故障包络线 ](/cli#json-failures)。

默认情况下，`openclaw sessions` 和网关 `sessions.list` RPC 是有界的，因此大型长期存储无法独占 CLI 进程或网关事件循环。 CLI默认返回最新的100个会话；当您有意需要完整商店时，请传递 `--limit <n>` 以获得 smaller/larger 窗口或 `--limit all`。当调用者需要显示存在更多行时，JSON 响应包括 `totalCount`、`limitApplied` 和 `hasMore`。

设置会话颜色时（例如，`"color": "blue"`），JSON 会话行包括 `color`。未着色的会话和颜色已清除的会话会省略该字段。

RPC 客户端可以传递 `configuredAgentsOnly: true` 以保留广泛的组合发现源，但仅返回配置中当前存在的代理的行。 Control UI 默认情况下使用该模式，因此已删除或仅磁盘代理存储不会重新出现在会话视图中。

`--all-agents` 读取已配置的 agent 存储。Gateway 和 ACP 会话发现范围更广：它们还包括从已配置的 agent 根目录或模板化的 `session.store` 根目录解析出的 SQLite 存储。旧版选择器路径必须解析到 agent 根目录内； 符号链接和根目录外路径会被跳过。

`openclaw sessions --all-agents --json`:

```json
{
  "path": null,
  "stores": [
    { "agentId": "main", "path": "/home/user/.openclaw/agents/main/agent/openclaw-agent.sqlite" },
    { "agentId": "work", "path": "/home/user/.openclaw/agents/work/agent/openclaw-agent.sqlite" }
  ],
  "allAgents": true,
  "count": 2,
  "totalCount": 2,
  "limitApplied": 100,
  "hasMore": false,
  "activeMinutes": null,
  "sessions": [
    { "agentId": "main", "key": "agent:main:main", "model": "openai/gpt-5.6-sol" },
    { "agentId": "work", "key": "agent:work:main", "model": "anthropic/claude-sonnet-4-6" }
  ]
}
```

## <a id="import-transcripts"></a> 导入成绩单

在正在运行的网关的持久会话存储中保留本机会话目录转录：

```bash
openclaw sessions import claude <thread-id>
openclaw sessions import codex <thread-id> --source-home <home-id>
openclaw sessions import claude <thread-id> --host <host-id> --agent work
openclaw sessions import --all --json
openclaw sessions import --all --catalog claude --limit 20 --dry-run
openclaw sessions import --all --host <host-id>
```

Claude Code 和 Codex 的目录 ID 为 `claude` 和 `codex`。其他具有转录读取的目录使用相同的命令。对于没有 `--host` 的一份副本，CLI 会发现该目录中的网关主机：它优先选择存在的 `gateway:local`，否则使用唯一的网关主机。如果不存在明确的网关主机，则显式传递 `--host <host-id>`。使用目录行的主机和 `sourceHomeId` 选择另一台计算机或本机工具主目录。 `--agent`选择目标代理。导入支持调用者可以读取的网关本地、配对节点、macOS 应用程序和 Linux 应用程序源。

导入会创建一个包含不受信任的参考资料的普通 OpenClaw 会话。导入的副本以 [drafts](/concepts/multi-user#drafts) 开头，仅对其创建者和网关管理员可见。通过会话共享控件发布副本以进行共享；重新导入保留其当前的可见性。禁用草稿后，导入的副本将遵循网关的默认可见性。它保留目录的投影消息，独立于本机工具清理；它不会恢复本机会话或将副本绑定到其模型或计算机。重复相同的导入会重复使用副本并仅附加新项目。每次导入最多读取 50,000 个项目和 64 个 MiB，在达到限制时保留最新历史记录。现有的每项文本限制仍然适用。不完整的结果警告说，较早的历史被忽略了。请参阅 [ 会话目录](/nodes/session-catalogs#import-transcripts)。

`--all` 分页查看可见的目录行并按顺序导入它们。新副本使用目录行名称作为标题；重新导入会保留现有副本的标题。名称经过修剪并限制为 500 个 UTF-16 代码单元。 `--catalog`和`--host`滤波器源； `--limit <n>` 限制尝试的会话总数。 `--dry-run` 列出选定的源而不导入它们，并且不预测项目计数或运行写入授权检查。一个源发生故障不会停止其余源。如果任何导入或目录页面失败，该命令将以非零值退出。

连接覆盖为 `--url`、`--token`、`--password` 和 `--timeout <ms>`（每个请求默认 5 分钟）。人工输出报告导入、更新或未更改的会话，其中包含项目计数和最终摘要。 `--json` 发出一个包含 `ok`、`operation: "import"`、`dryRun`、`results` 和 `summary` 的包络。成功结果包括源定位器 `status`、`sessionKey`、`importedItems`、`totalItems`、`complete` 和 `created`；试运行结果为 `status: "would_import"`。失败的结果包括 `status: "failed"` 和 `error`。

## <a id="archive-sessions"></a> 归档会话

通过正在运行的 Gateway 归档一个或多个会话：

```bash
openclaw sessions archive "agent:main:scratch-1"
openclaw sessions archive "agent:main:scratch-1" "agent:main:scratch-2"
openclaw sessions archive "agent:work:scratch-1" --agent work
openclaw sessions archive "agent:main:scratch-1" --dry-run
openclaw sessions archive "agent:main:scratch-1" --json
```

存档使用与 Control UI 相同的 `sessions.patch` 生命周期操作。它保留记录，将会话标记为已存档，并将会话从默认活动列表中删除。对于具有活动放置的云工作线程会话，网关首先停止工作线程，协调其工作区，并回收环境。如果展示位置仍在转换或失败，且没有证明其环境已消失，则会话将保持未存档状态；等待放置稳定，然后重试。代理主会话仍然受到保护。已存档的会话是成功的无操作。使用 `--dry-run` 验证每个密钥并预览结果，而无需更改会话状态。

存档原因会自动分配并在 Control UI 中显示为人类可读的文本。显式归档命令记录`manual`；维护拥有的档案记录其拥有的触发器。缺失原因仍作为遗留状态受到保护。保留时间的档案在磁盘压力下也能得到保护。只有由 `maxEntries` 显式存档的会话才有资格在较便宜的清理层用完后自动删除。

## <a id="delete-sessions"></a> 删除会话

通过正在运行的网关删除一个或多个会话：

```bash
openclaw sessions delete "agent:main:scratch-1"
openclaw sessions delete "agent:main:scratch-1" "agent:main:scratch-2" --yes
openclaw sessions delete "agent:work:scratch-1" --agent work --yes
openclaw sessions delete "agent:main:scratch-1" --dry-run
openclaw sessions delete "agent:main:scratch-1" --yes --json
```

在删除周围的空格后，重复的键将按首次出现的顺序处理一次。这也适用于 `sessions archive`。

<Warning>
  删除操作具有破坏性。在交互式终端中，删除有效键之前会询问一次。 非交互式删除和使用 `--json` 的删除都需要 `--yes`。编写批量清理脚本时，请先使用 `--dry-run`。
</Warning>

删除使用与 Control UI 相同的 `sessions.delete` 生命周期操作，并启用转录清理。网关删除实时会话行、脚本生成、会话拥有的运行时状态、绑定、板和其他生命周期工件。对于普通会话，它会将记录保留为经过验证的 `.jsonl.deleted.<timestamp>` 存档；隐身记录将被删除而不存档。保留的已删除会话存档仍然可以进行内存搜索。要删除索引内存，请使用网关的状态和配置在网关主机或容器上运行 `openclaw memory forget --agent <agent-id> --session <id-or-key>`。选择拥有已删除会话的代理，包括 `global` 密钥。内存清理在本地运行；通过 `--url` 或配置的远程网关删除不会将清理命令转发到该网关。有关预览和删除详细信息，请参阅 [Memoryforget](/cli/memory#memory-forget)。

如果无法安全删除托管工作树，该命令会报告保留的分支和路径以供手动清理。

两个生命周期命令都：

- 接受多个键，并针对每个键按顺序返回一个结果；
- 使用 `--agent <id>` 选择所属代理；对于默认代理之外的 `global` 键，这是必需的；
- 支持 `--url`、`--token`、`--password` 和 `--timeout <ms>` 网关连接覆盖选项；
- 当任何键未知或任何操作失败时返回非零退出状态，同时继续处理其他有效键；
- 当 `--json` 置位时，发出一个稳定的 JSON 包络，包括 `ok`、`operation`、`dryRun` 和 `results`。

生命周期命令直接查找每个请求的密钥，包括隐藏在网关的常规会话列表中的 cron 运行会话。即使 CLI 使用不同的本地会话设置，试运行也会使用这些网关事实将受保护的代理主会话报告为失败。已存档的会话仍保持成功存档无操作状态。试运行不会执行所有网关生命周期检查：`global` 预览仍然可以显示网关拒绝的存档或删除操作。仍支持显式选择的非默认全局删除。真正的归档或删除请求是权威的。

代理资格别名通过查找和变异保留其选定的所有者。例如，当网关使用解析密钥 `global` 描述该会话时，`sessions delete agent:work:main --yes` 仍以 `work` 为目标。

混合结果 JSON 示例：

```json
{
  "ok": false,
  "operation": "archive",
  "dryRun": false,
  "results": [
    { "key": "agent:main:scratch-1", "ok": true, "status": "archived" },
    {
      "key": "agent:main:missing",
      "ok": false,
      "status": "not_found",
      "error": "Session not found. Run openclaw sessions list --json to choose a valid key."
    }
  ]
}
```

## <a id="tail-trajectory-progress"></a> 尾部轨迹进度

```bash
openclaw sessions tail
openclaw sessions tail --follow
openclaw sessions tail --session-key "agent:main:telegram:direct:123" --tail 25
openclaw sessions --agent work tail --follow
openclaw sessions --all-agents tail --follow
```

`openclaw sessions tail` 将最近的运行时轨迹事件呈现为紧凑的进度线。如果没有 `--session-key`，它会首先请求配置的网关运行会话和尾部匹配本地会话，然后回退到最近活动的存储会话。如果网关无法访问，则会打印 `Gateway unreachable: showing the most recently active session`。显式 `--store` 会跳过网关查找、按活动排序并打印 `explicit store: ordered by activity`。显式 `--session-key` 仅选择本地会话，而不进行网关查找。 `--tail <count>` 控制在跟随模式之前打印多少个现有事件；默认为`80`，`0`从当前端开始。 `--follow` 持续关注选定的 SQLite- 支持的会话。会话键使用固定宽度的终端列，长键在整个字素边界处被截断，因此 CJK 字符、组合重音和连接的表情符号保持进度线对齐。

仅当`--agent`、`--store`和`--all-agents`不在时，完全合格的`--session-key`才会选择其代理。显式为空或仅包含空格的 `--agent` 会被拒绝，而不是选择推断的代理。

与未存储会话匹配的显式 `--session-key` 会以非零值退出，并提供列出有效密钥的指导，并且拒绝空或仅包含空格的 `--session-key`。如果没有密钥，空选择将打印 `No sessions found.` 并成功退出，包括 `--follow`。

进度视图省略提示文本和工具结果正文。工具调用显示工具名称和序列化参数，没有秘密屏蔽；此输出可能包含凭据，因此请在复制或共享之前查看它。工具结果显示状态，例如 `ok`、`error` 或 `done`；模型完成线显示 provider/model 和终端状态。提供商失败和未交付的转向显示 `error`；取消显示 `aborted`，超时显示 `timeout`，成功完成（包括交付的部分回复）显示 `done`。

## <a id="export-a-trajectory-bundle"></a> 导出轨迹包

```bash
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --workspace .
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --output bug-123 --json
```

这是所有者批准 exec 请求后 `/export-trajectory` 斜线命令使用的命令路径。输出目录始终在所选工作空间下的 `.openclaw/trajectory-exports/` 内解析。文本中的文件列表和 JSON 输出仅报告写入捆绑包的工件。

对于没有代理前缀的存储密钥（例如 `global`），导出使用配置的默认代理或唯一代理。当配置多个代理但没有默认值时，传递 `--agent <id>`。

## <a id="cleanup-maintenance"></a> 清理维护

立即运行维护，而不是等待下一个写入周期。如果没有 `--store`，清理工作将委托给可到达的网关。破坏性局部清理需要独占线下维护所有权；如果网关或另一个实时所有者持有该状态，则该命令会指定该所有者并拒绝。在没有 `--store` 的情况下运行清理以使用网关，或者首先停止网关和其他所有者。当网关运行时，试运行预览仍然可用：

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --agent work --dry-run
openclaw sessions cleanup --all-agents --dry-run
openclaw sessions cleanup --enforce
openclaw sessions cleanup --enforce --active-key "agent:main:telegram:direct:123"
openclaw sessions cleanup --dry-run --fix-dm-scope
openclaw sessions cleanup --json
```

`openclaw sessions cleanup` 使用配置中的 `session.maintenance` 设置（[ 配置参考](/gateway/config-agents/sessions#session)）：

- 范围注释：`openclaw sessions cleanup` 维护会话存储、转录本、轨迹行和旧轨迹 sidecar。它不会删除 cron 运行历史记录。 Cron 保留终端运行历史记录 7 天（`lost` 行保留 24 小时），并强制每个作业和历史记录类保留最新的 2000 行作为附加上限（[Cron 配置](/automation/cron-jobs#configuration)）。
- Cleanup 还会修剪未引用的 legacy/archive 转录工件、压缩检查点和早于 `session.maintenance.pruneAfter` 的轨迹边车；仍由 SQLite 会话行引用的工件将被保留。合格的空文件在空运行和应用摘要中都算作已删除的工件，即使它们释放了零字节。
- Cleanup 将短期网关模型运行检查清理单独报告为 `modelRunPruned`。这只匹配形状像 `agent:*:explicit:model-run-<uuid>` 的严格显式密钥。保留是固定的 `24h` 并且是压力门控的：它仅在达到会话条目 maintenance/cap 压力时删除过时的检查行。当它运行时，模型运行清理发生在全局陈旧清理和上限之前。
- `pruneAfter` 将符合条件的持久会话存档到位，保留其 ID 和所有转录本生成。清理报告`archive-age`；存储的`archiveReason`是`age-retention`。一次性自动化行仍会删除。
- `maxEntries` 默认为 5000 并限制未归档会话行数；已归档的行不会消耗它。合格的普通溢出被报告为 `archive-cap` 并存档，而合成运行时溢出仍然是一次性的。受保护的未归档行报告为 `keep`，并且仍然消耗上限。如果这些受保护的行阻止清理工作到达上限，则未归档的存储将保留在上限之上。 `--enforce` 不会取消该保护；取消固定、等待活动工作完成或明确删除您不再希望保留的会话。

可选的冷转录提取有自己的后台工作程序和 **立即在 [ 设置 → 代理默认值 → Session](/gateway/config-agents/sessions#cold-storage) 中运行** 操作。它使用 `session.maintenance.coldStorage.afterDays` 并在权威压缩文件中保留非活动转录本。 cleanup 命令的 reset/deletion 存档保留不会删除那些冷文件。

标志：

| 标志                 | 描述                                                                                                                                                                                                                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--dry-run`          | 预览有多少条目将是 pruned/capped 而不写入。在文本模式下，打印每个会话操作表（`Action`、`Key`、`Age`、`Model`、`Flags`）以及按会话标签分组的摘要。                                                                                                       |
| `--enforce`          | 即使 `session.maintenance.mode` 为 `warn`，也执行维护。                                                                                                                                                                                                                                          |
| `--fix-missing`      | 删除存档转录工件丢失或标头 only/empty 的遗留条目，即使它们通常不会出现 age/count。                                                                                                                                                             |
| `--fix-dm-scope`     | 当 `session.dmScope` 为 `main` 时，清理早先 `per-peer`、`per-channel-peer` 或 `per-account-channel-peer` 路由遗留下来的、按对端键控的陈旧直接 DM 行。请先使用 `--dry-run`；执行时会从 SQLite 中移除这些行，并将其旧版转录工件保留为已删除归档。 |
| `--active-key <key>` | 保护特定活动密钥免遭自动维护。它仍然计入 `maxEntries`。持久的外部对话指针，例如组会话和线程范围的聊天会话，也由 age/count/disk-budget 维护来保存。                                                         |
| `--agent <id>`       | 为某个已配置的代理存储运行清理。                                                                                                                                                                                                                                                                |
| `--all-agents`       | 为所有已配置的代理存储运行清理。                                                                                                                                                                                                                                                               |
| `--store <path>`     | 针对特定 SQLite 数据库或旧存储选择器路径在本地运行。                                                                                                                                                                                                                              |
| `--json`             | 输出 JSON 摘要。使用 `--all-agents` 时，输出会为每个存储包含一份摘要。                                                                                                                                                                                                                          |

当网关可访问时，将通过网关发送已配置代理存储的非空运行清理，以便它与运行时流量共享相同的会话存储编写器。连接后，CLI 等待清理完成，没有固定的请求期限；连接启动仍然超时。使用 `--store <path>` 对 SQLite 数据库或旧存储选择器进行显式脱机修复。

仅当在连接之前无法到达配置的本地网关时，才会应用自动离线回退。失败的远程网关连接或 `OPENCLAW_GATEWAY_URL` 覆盖会因错误退出并保留本地存储，包括当选定的 URL 使用环回 SSH 隧道时。恢复远程连接或使用 `--store <path>` 显式选择本地存储。

当所选存储的父目录名为 `agent` 时，转录工件位于同级 `sessions` 目录中。这也适用于自定义路径：`/backup/agent/sessions.json` 选择 `/backup/agent/openclaw-agent.sqlite`，其存档位于 `/backup/sessions` 中。无论您选择旧路径还是 SQLite 文件，清理都会测量并修剪同一工件目录。

离线清理会加载受信任的、允许的harness插件，以便使用已删除的行回收其会话拥有的资源，即使代理现在使用不同的模型也是如此。明确禁用或不受信任的插件不会运行。如果它们的资源可能保留，清理会在 stderr 上打印警告，而不更改 JSON 结果。试运行不会加载harness插件。

应用的工件清理仅计算成功的文件删除。如果文件无法删除，则它不会贡献任何释放的字节，并且仍然是磁盘使用的一部分。未引用的工件清理和遗留磁盘预算强制执行将继续处理其他符合条件的文件。 SQLite 归档修剪在删除错误后停止以保留其数据库恢复副本。如果使用率保持在目标之上，请检查文件系统权限并在解决删除失败后重试。

`openclaw sessions cleanup --all-agents --dry-run --json`:

```json
{
  "allAgents": true,
  "mode": "warn",
  "dryRun": true,
  "stores": [
    {
      "agentId": "main",
      "storePath": "/home/user/.openclaw/agents/main/agent/openclaw-agent.sqlite",
      "beforeCount": 120,
      "afterCount": 80,
      "missing": 0,
      "dmScopeRetired": 0,
      "pruned": 40,
      "capped": 0
    },
    {
      "agentId": "work",
      "storePath": "/home/user/.openclaw/agents/work/agent/openclaw-agent.sqlite",
      "beforeCount": 18,
      "afterCount": 18,
      "missing": 0,
      "dmScopeRetired": 0,
      "pruned": 0,
      "capped": 0
    }
  ]
}
```

### <a id="test-cleanup-on-a-copy"></a> 在副本上测试清理

在更改实时安装之前，使用单独的状态目录来测量清理情况。创建 WAL-aware SQLite 备份或协调的停止状态副本；仅复制实时数据库的主 `.sqlite` 文件可以忽略已提交的 WAL 数据。准备副本时保留代理 ID、目录布局和相关会话工件。使用普通的复制文件，而不是指向实时状态的符号链接或硬链接。

使用要测试的维护设置和复制的代理配置在副本内准备 `openclaw.json`。保持其路径和插件配置与实时安装隔离。以下示例显式选择复制的 `main` 代理数据库；调整目录和代理 ID 以匹配您的副本：

```bash
(
  export OPENCLAW_STATE_DIR="$HOME/openclaw-state-copy"
  export OPENCLAW_CONFIG_PATH="$OPENCLAW_STATE_DIR/openclaw.json"
  copied_db="$OPENCLAW_STATE_DIR/agents/main/agent/openclaw-agent.sqlite"

  openclaw sessions cleanup --store "$copied_db" --dry-run --json
)
```

查看预览，然后应用清理并压缩复制的数据库：

```bash
(
  export OPENCLAW_STATE_DIR="$HOME/openclaw-state-copy"
  export OPENCLAW_CONFIG_PATH="$OPENCLAW_STATE_DIR/openclaw.json"
  copied_db="$OPENCLAW_STATE_DIR/agents/main/agent/openclaw-agent.sqlite"

  openclaw sessions cleanup --store "$copied_db" --enforce --json
  openclaw doctor --session-sqlite compact --session-sqlite-agent main --session-sqlite-store "$copied_db" --json
)
```

显式 `--store` 清理保留在本地。破坏性清理和 Doctor 要求其目标位于 `OPENCLAW_STATE_DIR` 内，并拥有该状态目录的独占所有权；实时网关可以继续使用其单独的原始状态。将 `--session-sqlite-agent` 设置为复制的数据库的所有者；显式的 Doctor 商店选择器否则默认为 `main`。

`archive-age`、`archive-dashboard` 和 `archive-cap` 更改会话元数据，同时保留记录行。磁盘预算清理可以用压缩档案替换符合条件的历史记录，其存储的有效负载保留在 SQLite 中。 Doctor 的 `compact` 步骤然后使用 `VACUUM` 回收空闲数据库页面并报告 before/after 数据库和 WAL 大小。它不会选择更多历史记录来删除。比较物理大小和保留的历史记录，而不仅仅是会话计数；受保护的数据可以使使用量保持在配置的预算之上。有关存档所有权和保护规则，请参阅 [ 存储维护和保留](/reference/session-management-compaction/maintenance)。

## <a id="compact-a-session"></a> 压缩会话

为卡住或过大的会话回收上下文预算。`openclaw sessions compact <key>` 是对 `sessions.compact` Gateway RPC 的一等封装，并且需要正在运行的 Gateway。

```bash
openclaw sessions compact "agent:main:main"
openclaw sessions compact "agent:main:main" --max-lines 200
openclaw sessions compact "agent:work:main" --agent work --json
```

- 如果没有 `--max-lines`，网关 LLM- 会汇总记录。 CLI 默认情况下不强制要求客户截止日期；网关拥有配置的压缩生命周期。
- 使用 `--max-lines <n>` 时，它会将 SQLite 转录本永久截断到最后的 `n` 行。网关在报告成功之前在其存储工作线程中完成重建保留副本的索引，因此下一回合不会等待后台索引维护。此路径不会创建备份存档。
- `--agent <id>`：拥有该会话的代理；对于 `global` keys 是必需的。
- `--url` / `--token` / `--password`：Gateway 连接覆盖项。
- `--timeout <ms>`：可选的客户端 RPC 超时，单位为毫秒。
- `--json`：打印原始 RPC 负载。

当网关报告压缩失败或无法访问时，该命令将以非零值退出，因此 cron 和脚本永远不会将静默无操作误认为成功。丢失会话在两种模式下都是错误。没有历史记录或没有任何内容可截断的现有会话仍然是显式无操作。

<Note>
`openclaw agent --message '/compact ...'` **不是**一条压缩路径。CLI 中的斜杠命令会被 authorized-sender 检查拒绝；该调用会以非零状态退出，并给出指引，指向这里，而不是静默地无操作。
</Note>

### sessions.compact RPC

`openclaw gateway call sessions.compact --params '<json>'` 接受：

| 字段      | 类型        | 必需的 | 描述                                                |
| ---------- | ----------- | -------- | ---------------------------------------------------------- |
| `key`      | 字符串      | 是      | 要压缩的会话 key（例如 `agent:main:main`）。    |
| `agentId`  | 字符串      | no       | 拥有该会话的代理 id（用于 `global` keys）。        |
| `maxLines` | 整数≥1 | no       | 截断为最后 N 行，而不是进行 LLM 总结。 |

示例 LLM- 总结响应：

```json
{
  "ok": true,
  "key": "agent:main:main",
  "compacted": true,
  "result": { "tokensBefore": 243868, "tokensAfter": 34941 }
}
```

截断响应示例（`--max-lines 200`）：

```json
{
  "ok": true,
  "key": "agent:main:main",
  "compacted": true,
  "kept": 200
}
```

## <a id="related"></a> 相关内容

- [会话配置](/gateway/config-agents/sessions#session)
- [会话管理](/concepts/session)
- [压缩](/concepts/compaction)
- [CLI 参考](/cli)
- [`openclaw resume`](/cli/resume) — 将 TUI 连接到最近的网关会话
- [Cloud Workers](/gateway/cloud-workers) — 远程工作人员托管的会话
