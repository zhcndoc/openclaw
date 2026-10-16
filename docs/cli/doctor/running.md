---
summary: "医生姿势、调用示例和完整选项表"
title: "跑医生"
read_when:
  - "你想跑`openclaw doctor`并选择正确的姿势"
  - "您需要医生标志或标志组合规则的含义"
---

本页介绍如何调用 `openclaw doctor`：支持的姿势、准备运行的示例以及命令接受的每个选项。

如果插件在 Doctor 期间加载失败，报告会包含插件 ID 的错误发现、源路径和错误。 `ENOSPC` 故障指出磁盘空间原因。独立 `doctor --non-interactive` 因这些故障而退出 `1`，并报告 Doctor 已完成插件加载错误。当更新程序调用 Doctor 时，相同的故障会保留记录警告，以便安全更新可以继续；解决报告的原因后重新运行 Doctor。

CLI 在退出之前耗尽其共享状态数据库工作线程。脚本调用者仍必须检查进程退出状态：`Doctor complete.` 记录检查的完成情况，但后续崩溃在更新期间仍然是失败的候选医生步骤。

如果本机 SQLite 快照请求失败，即使可选检查推迟其工作，Doctor 也会退出并出现错误。在重试之前解决报告的快照或文件系统故障；延期检查并不能证明检查成功。

## <a id="postures"></a> 姿态

医生支持这些姿势：

| 姿态                   | 命令                                   | 行为                                                                              |
| ------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------- |
| 引导检查             | `openclaw doctor`                         | 互动健康流程；可以复制旧配置并应用自动状态迁移。 |
| 咨询JSON             | `openclaw doctor --json`                  | 只读调查结果；生成报告后成功退出。                      |
| 修复                    | `openclaw doctor --fix`                   | 应用支持的修复；除非安全地进行非交互式修复，否则使用提示。       |
| 语法检查                      | `openclaw doctor --lint [--json]`         | CI 门的基于阈值的退出代码的只读结果。                      |
| 共享SQLite维修 | `openclaw doctor --state-sqlite compact`  | 显式检查点、压缩并验证共享状态 DB。                   |
| 会话 SQLite 工具      | `openclaw doctor --session-sqlite <mode>` | 检查或维护 SQLite 会话并显式导入旧历史记录。          |

当操作员或脚本希望咨询医生报告为 JSON 时，请使用 `openclaw doctor --json`。生成报告后成功退出；检查`ok`和`findings`的健康状态。当 CI 对于所选严重性阈值的结果应退出非零时，请使用显式 `openclaw doctor --lint --json`。当操作员希望 Doctor 编辑配置或状态时，首选 `--fix`。

对于只读诊断，请使用 `--lint` 或裸 `--json`。普通 `doctor`（包括 `doctor --non-interactive`）即使没有 `--fix` 也可以复制旧配置并迁移状态。 `--non-interactive` 抑制提示，而不是写入。

Interactive `doctor` 首先检查共享架构兼容性并可以提供源更新。如果更新没有接管，Doctor 会在您检查修复时要求暂停匹配的托管网关之前检查所有数据库架构。接受维护保管，保留单独的修复提示，并在数据库处理关闭后恢复服务之前的状态。拒绝会跳过修复并通过只读 `--lint` 检查继续相同的调用，而不更改服务或持久状态或请求修复批准。如果报告发现警告或错误，则退出 `1`，否则退出 `0`。现有的 `--deep` 和 `--allow-exec` 选择仍然适用。外部监督或不匹配的网关仍需接受其现有的维护所有权检查。

当普通 `doctor` 询问 **现在应用建议的配置修复？** 时，它会检查所选的根配置文件是否仍然与该建议的源匹配。如果其内容或选定的路径在写入之前发生更改，Doctor 会保留较新的文件，保留待处理的配置修复不被写入，并退出并出现错误。重新运行 `openclaw doctor` 以查看更新的提案。

如果保存成功但稍后处理失败，Doctor 将停止并显示错误，命名写入的文件，并报告写入是否已回滚。当未回滚或无法确认恢复时，请在重新运行 Doctor 之前检查该文件和活动配置。

如果共享状态数据库使用较新的模式，Doctor 在提供交互式更新之前会拒绝，因为更新准入也需要该数据库。从写入状态的 OpenClaw 安装或其他兼容版本运行 Doctor。当代理数据库使用更新的模式时，可读的共享数据库仍然允许交互式源更新；如果更新没有接管，Doctor 会在诊断或修复之前再次检查所有数据库架构。请参阅 [ 数据库架构](/reference/database-schemas)。

执行批准格式升级后，Doctor 报告旧生成的批准不再有效，因为它们未绑定到工作目录。 `openclaw doctor --fix` 删除那些不活动的生成条目，并保持手动允许列表规则不变。重新运行受影响的工作流程并选择 **始终允许此处** 更新对目标目录的信任。正常的 `openclaw update` 完成会自动运行此安全修复。

显式修复会停止匹配的托管网关，并在获取只读架构快照之前检查网关、状态和代理数据库所有权。它在修复期间排除其他进程，然后重新启动相同的服务一次并验证准备情况。策略刷新保留已安装的启动器和环境。另外，先前运行的服务中的 [eligible 安装漂移 ](/cli/doctor/recovery#gateway-service-recovery) 通过本机安装程序进行协调。自动安装刷新涵盖仅安装漂移；其他操作员编辑或不确定的检查仍然需要交互确认。维护前确认离线的服务保持其启动器和停止状态； Linux 策略无需激活即可刷新，如下所述。使用报告的配置文件感知 `openclaw gateway install --force` 命令来协调其安装偏差（安装可能会启动服务）。在 Linux 上，如果 systemd 在修复期间卸载停止的单元，Doctor 还会恢复之前运行的服务；更改的服务定义或管理器仍然会阻止重新启动。重生之间已加载、启用的 macOS 作业不会离线：Doctor 在修复之前停止它，然后恢复它。从网关进程树外部的 shell 运行修复。对于外部监控或不匹配的安装，请通过其所属的监控器停止和启动网关。

预修复备份完成后，Doctor 通过其保留的只读维护连接检查当前已提交行的更新冲突。这些检查与托管服务连续检查共享 Doctor 的修复范围，从而避免在有或没有缓存写入器的情况下重复进行整个数据库扫描。修复前检查仍然保留源数据库及其 sidecar。

在 Linux 维护停止之前，Doctor 备份并刷新过时的 OpenClaw 单元策略并确认 `daemon-reload`。操作员插入保持不变。目前的服务停止政策是330秒。常驻网关仍然可以有较旧的、较短的关闭预算：发布的 2026.9.5 在启动时缓存该预算。对于短期或未报告的居民预算，维护人员要求网关隔离新的进入并耗尽现有工作，一旦报告空闲就立即停止。等待时间使用更新现有的每步骤截止时间（默认为 30 分钟）。在该截止日期之前，允许的转弯可能会被中断并受到警告；报告的写托管阶段，例如会话突变或终端持久性，拒绝停止并命名其所有者阶段。没有监护观察的老年居民在截止日期前停止，并发出警告，指出活跃的 root 请求和 cron 运行；不明监护并不构成拒绝。确认离线的自有服务无需启动即可接收策略刷新。

无人值守更新和网关启动失败仅收集 [ 诊断 ](/cli/triage#automatic-failure-handoff)。较旧的、已承认的托管修复移交可以在升级过程中保持活动状态。在该子树中，当架构和维护锁允许时，修复可以针对离线目标运行。如果修复需要停止托管网关，Doctor 会在其自动修复子树内拒绝，因为该停止会取消恢复。使用只读诊断或安全离线工件修复，然后使用原子 `openclaw gateway restart`，或要求独立操作员从分类之外的 shell 运行 Doctor。

每个数据库的只读数据库快照和初始完整性扫描的执行时间限制为 30 秒。超时指定数据库并要求您在重试之前停止其网关服务和其他 OpenClaw 进程。如果所有写入器都停止，请检查存储性能和报告的数据库；超时并不能证明腐败。

`openclaw doctor --fix --non-interactive` 应用受支持的迁移，这些迁移会在没有提示的情况下阻止网关启动，包括共享状态审核架构、旧工作区设置、旧会话存储和执行批准。格式错误或冲突的输入将被保留，并需要在诊断中进行手动操作。更新程序在接受安装的目标之前使用此修复路径。

更新时医生在可选检查之前运行启动所需的修复。当安装的更新程序支持重新启动后检查时，Doctor 会将 lint 支持的仅检查检查移出停止的网关窗口。更新程序在重新启动后运行它们，并将其结果保存在 `post-activation doctor inspections` 结果步骤中。调查结果或不完整的检查仍然是建议性的，并且不会导致其他成功的更新失败。没有同等 lint 覆盖范围的维修、迁移、就绪门和检查将保持现有的顺序。较旧安装的更新程序将检查保留在其原始 Doctor pass 中。

在大型机群中，它可以推迟身份验证和模型诊断、插件检查、技能和工作区元数据、会话快照检查以及咨询 lint，以便为所需的维修和更新验证预留时间。每项延期检查在 Doctor 输出和更新结果中显示为 `update-inspection-deferred` 警告，并附有原因和剩余检查限额。延期检查未通过或未通过；它没有运行。

激活后运行 `openclaw doctor --fix` 以完成这些检查并查看可选修复。普通的 Doctor 运行不会保留更新的检查限制。更新期间仍会运行所需的会话、数据库、工作区状态和执行批准准备情况检查。项目克隆检查、SQLite 数据库大小建议以及工作区备份和内存建议保留其独立范围。

当修复最终没有发现任何变化时，此维护时段也适用。没有 `--fix`、`--repair` 或 `--yes` 的非交互式运行不会进入维护。普通的互动运行只有在监护人同意后才能进入。自定义状态目录仅保留运行时状态，并且不采用本机服务。

`--force` 本身不会选择修复模式：`openclaw doctor --force` 仍处于引导状态，并且在符合条件的服务重写之前仍然需要交互同意。对于 `--fix`、`--repair` 或 `--yes`，它允许使用上述相同的安装漂移和 Linux 策略刷新规则进行积极的 config/state 修复。强制不会绕过服务所有权、写入访问或仅交互式确认要求。

<Warning>
  `doctor --fix` 遵循显式配置的工作区和存储路径，包括 `OPENCLAW_STATE_DIR` 外部的路径。将 `OPENCLAW_STATE_DIR` 和 `OPENCLAW_CONFIG_PATH` 设置为副本不会重定向这些路径。在对复制状态进行修复之前，也复制外部工作区和存储，然后在复制的配置中重写它们的路径以指向副本。否则，医生可以修改原件。
</Warning>

在更新期间，Doctor 尊重更新者的服务激活政策。如果正在运行的网关具有旧的 version/build 或在包替换后无法加载其 WebSocket 处理程序，Doctor 将通过经过验证的服务管理器停止该过时的实例，并确认其进程和侦听器已消失。它在运行离线修复（包括旧会话导入）时保留服务托管，然后重新启动服务并验证候选版本并在 RPC 上构建 ID。启动可能需要这些导入，因此维护后会检查候选人的准备情况。警告将替换的 PID 命名为经过验证的服务版本。 HTTP 健康状况本身并不能证明康复。拒绝停止或未经验证的恢复会在更新结果中记录失败的阶段和确切的恢复命令。

传统的后核融合在其新的 Doctor 进程运行时保留服务维护托管，然后在发布完成之前恢复网关。普通的健康网关仍然遵循父级的激活策略； `openclaw update --no-restart` 不向实时写入器授予状态修复访问权限。

不可用的服务检查将成为警告，并且不授予任何服务控制权限。 Doctor 在修复之前仍会检查 Gateway/state 协调器、代理数据库租约以及旧网关（例如 2026.6.33）使用的临时文件锁。实时或不可验证的旧锁所有者阻止修复并命名其 PID 和锁路径；通过其服务所有者停止该网关，然后从独立的 shell 运行 `openclaw doctor --fix`。仍然可以运行的无与伦比的服务也会阻碍维护；用`openclaw gateway status --deep`检查它。一旦本机管理器确认其处于离线状态，Doctor 就可以修复其选定的状态，而无需更改或启动该服务。已停止或禁用的 systemd 单元无需在管理器中保持加载状态即可继续进行状态修复。

如果迁移或配​​置修复无法完成，Doctor 会使已停止的服务停止，并报告不完整的修复，退出代码为 1。当状态需要手动恢复时，诊断会命名其路径和下一步操作：

- **不受支持的工作区版本：** 使用支持该版本的 OpenClaw 版本。保持共享数据库不变。
- **执行策略不可读或冲突：** 停止网关和节点主机，然后将指定的旧文件或中断的声明与预期策略的经过验证的副本进行协调。保留现有的 SQLite 策略。

Doctor 不会隔离不受支持的工作区状态、丢弃未来版本的行或推断执行策略。重复相同的修复调用无法解决这些情况。手动恢复后，请在通过其所有者启动服务之前验证准备情况。

## <a id="examples"></a> 示例

```bash
openclaw doctor
openclaw doctor --lint
openclaw doctor --json
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

对于特定于通道的权限，请使用通道检查而不是 `doctor`：

```bash
openclaw channels capabilities --channel discord --target channel:<channel-id>
openclaw channels status --probe
```

`channels capabilities` 会报告机器人针对特定通道目标的实际权限。`channels status --probe` 会审计所有已配置的通道和语音自动加入目标。

## <a id="options"></a> 选项

| 选项                          | 作用                                                                                                                                                                                                                                                |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--no-workspace-suggestions`    | 禁用工作区 memory/search 建议。                                                                                                                                                                                                          |
| `--yes`                         | 接受默认值并进入修复维护而不提示。                                                                                                                                                                                       |
| `--repair` / `--fix`            | 应用建议的修复，同时与匹配的托管网关（`--fix` 是别名）协调维护。刷新过时的 Linux 策略并协调合格的运行服务安装偏差；保留停止的发射器和停止状态。 |
| `--force`                       | 允许积极的修复选择。独自一人，仍受指引；对于 `--fix`、`--repair` 或 `--yes`，使用相同的策略刷新和安装漂移规则。                                                                                              |
| `--non-interactive`             | 运行无提示；安全自动迁移仍然适用。与`--fix`、`--repair`或`--yes`组合进入维修保养。                                                                                                                 |
| `--generate-gateway-token`      | 生成并配置 Gateway 令牌。                                                                                                                                                                                                               |
| `--allow-exec`                  | 允许医生在验证秘密时执行配置的`exec` SecretRefs。                                                                                                                                                                         |
| `--deep`                        | 扫描系统服务中的额外 Gateway 安装；报告最近的 Gateway supervisor 重启交接。                                                                                                                                                   |
| `--lint`                        | 以只读模式运行 [ 结构化运行状况检查 ](/cli/doctor/health-contract) 并发出诊断结果。                                                                                                                                       |
| `--post-upgrade`                | 运行升级后插件兼容性检查；结果将输出到标准输出；如果存在任何错误级别的发现，则退出代码 1。                                                                                                                               |
| `--state-sqlite <mode>`         | 运行显式的共享状态 SQLite 维护。唯一的模式是 `compact`。                                                                                                                                                                             |
| `--session-sqlite <mode>`       | 运行目标会话 SQLite 维护或旧版导入：`inspect`、`dry-run`、`import`、`validate`、`compact`、`recover` 或 `restore`。                                                                                                             |
| `--session-sqlite-store <path>` | 使用 `--session-sqlite`：选择 SQLite 数据库或旧版 `sessions.json` 源，遵循模式的 [ 选择规则 ](/cli/doctor/sqlite-maintenance#session-sqlite-migration)。                                                                 |
| `--session-sqlite-agent <id>`   | 与 `--session-sqlite` 一起使用：选择一个已配置的代理。                                                                                                                                                                                                 |
| `--session-sqlite-all-agents`   | 与 `--session-sqlite` 一起使用：选择已配置和已发现的代理存储。                                                                                                                                                                               |
| `--github-issue`                | 对于 `--session-sqlite recover`：准备一份经过净化的 openclaw/openclaw 问题报告；医生在`--yes`或交互确认后用`gh`创建它。                                                                                           |
| `--json`                        | 发出只读 JSON。裸机`--json`为咨询；与 `--lint` 结合使用基于阈值的退出代码。对于另一种机器模式，发出该模式的现有 JSON 报告。                                                                               |
| `--severity-min <level>`        | 与 `--lint` 一起使用：丢弃低于 `info`、`warning` 或 `error` 的发现结果。                                                                                                                                                                                     |
| `--all`                         | 与 `--lint` 一起使用：运行所有已注册的检查，包括默认集合中排除的选择性检查。                                                                                                                                                      |
| `--skip <id>`                   | 与 `--lint` 一起使用：跳过一个检查 id。可重复指定。                                                                                                                                                                                                           |
| `--only <id>`                   | 与 `--lint` 一起使用：仅运行给定的检查 id。可重复指定。                                                                                                                                                                                            |

`--severity-min`、`--all`、`--only` 和 `--skip` 仅与 `--lint` 一起接受。 Bare `--json` 使用默认的只读 lint 检查选择，但保留 Doctor 的建议退出行为。两种只读姿势均拒绝 `--repair`、`--fix`、`--force`、`--yes` 和 `--generate-gateway-token`。显式 `--lint` 还拒绝 `--session-sqlite` 模式及其选择器，包括 `--github-issue`。其他机器模式仍然可以使用 `--json` 进行自己的输出。
