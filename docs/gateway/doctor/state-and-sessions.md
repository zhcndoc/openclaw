---
summary: "磁盘布局、cron 存储、会话、模型身份验证、沙箱和插件安装修复（检查 3-7b）"
title: "状态、会话和插件修复"
read_when:
  - "医生报告状态迁移、会话锁定或插件安装问题"
  - "您正在更改磁盘状态布局或状态完整性检查"
---

检查 3-7b 涵盖旧的磁盘状态迁移、会话完整性、模型身份验证运行状况、沙箱映像和插件安装。

## <a id="checks-3-7b"></a> 检查 3-7b

<AccordionGroup>
  <Accordion id="3-legacy-state-migrations-disk-layout" title="3. 旧状态迁移（磁盘布局）">
    支持的升级源是由 2026 年 7 月 1 日或之后发布的版本编写的状态形状。July Doctor 导入程序仍可以在会话行上保留 `provider` 和 `lastProvider` 别名。会话读取拒绝那些存在迁移所需错误的行，直到 `openclaw doctor --fix` 运行； Doctor 备份受影响的 SQLite 数据库，然后将别名重写为当前 `delivery` 状态及其查询投影。仍然需要退役的 `room` → `groupChannel` 转换的行将被拒绝，而不更改原始存储：保留状态，安装 OpenClaw `2026.9.5`，运行 `openclaw doctor --fix`，然后再次升级。即使过时的元数据仍保留在具有当前字段的行旁边，仍受支持。 7 月时代的 `sessions.json` 和 JSONL 转录本导入仍受支持。

    Doctor 可以将支持的磁盘布局迁移到当前结构中：

    - Session 行和记录：将旧版 `sessions.json` 和 JSONL 历史记录从每个代理 `sessions/` 目录或显式配置的存储导入到 `~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`
    - Agent dir：从 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`
    - WhatsApp 身份验证状态（Baileys）：从旧版 `~/.openclaw/credentials/*.json`（`oauth.json` 除外）到 `~/.openclaw/credentials/whatsapp/<accountId>/...`（默认帐户 ID：`default`）
    - 签名设备标识：从`~/.openclaw/identity/device.json`进入`primary` `device_identities`行中的`state/openclaw.sqlite`； Doctor还拥有对无效存储行的修复；网关和节点主机启动拒绝未导入的身份而不是创建替换身份，并保持单独的设备身份验证文件不变

    6 月之前的 `tasks/runs.sqlite`、`flows/registry.sqlite` 和 `plugin-state/state.sqlite` 数据库的导入已停用。医生保留这些文件原样。需要记录的旧安装应通过 `2026.9.5`](/install/updating#upgrading-very-old-versions) 进行 [ 升级，并在安装 `latest` 之前运行其 Doctor 迁移；六月及以后的版本已经使用共享状态数据库。

    `plugins/installs.json` 处的 JSON 插件索引已停用。 Doctor 保持不变，并指示操作员在 `2026.9.5` 上运行 `openclaw doctor --fix` 并进行更新前备份。更新还会在停止正在运行的网关之前检查此原始文件。当前的 SQLite 插件索引和安装记录仍然受支持。

    退役技能工坊提案属于Doctor，包括`openclaw update`期间的维修通行证。 Doctor 将每个待处理或隔离的草稿导出到 `<agentDir>/workshop-skills/.archive/.retired-proposals/<proposal-id>/`，删除已停用的提案表，并删除 `<state-dir>/skill-workshop/proposals/`。正常网关和本地 CLI 启动不会影响这些工件。导出失败会保留表和文件并报告警告；修复原因后重新运行 `openclaw doctor --fix`。

    重写或截断的旧审计原始存档不会阻止 Doctor 或更新完成。 Doctor 将其隔离在旁边，保留已清理的存档和现有的 SQLite 记录，并报告一次隔离路径。后期继续修复。有关保留的备份和恢复限制，请参阅 [ 旧审计恢复](/cli/update/repair-and-recovery#skipped-legacy-audit-recovery)。

    SQLite 成绩单和档案中的历史内联助理指令由 Doctor 标准化，包括普通 `openclaw doctor --non-interactive`。网关和普通的 CLI 启动不会影响这些历史字节。在不使用更新程序的情况下替换二进制文件时，如果旧历史记录仍包含回复、音频、TTS 或反应标记，请停止网关并在重新启动之前针对相同的 state/config 运行 Doctor。官方 [ 容器映像入口点 ](/install/docker#upgrading-container-images) 在网关激活之前自动运行 Doctor。这种规范化保留了现有的完成游标和停止写入器检查；它不支持仅修复维护、服务更改或执行批准迁移。

    修复在停止受管网关之前从只读数据库快照中准备保留的存档介质规范化。未更改的存档不需要存档写入事务。 Doctor 在现有迁移元数据中记录经过验证的内容和文件身份，因此同一版本的另一次运行将跳过解析和读取未更改的存档副本。导入、恢复、更改的文件和新版本使这些事实无效；仍会检查存储的 blob 摘要。实际修复保留停止作者的权限和源重新验证。

    自动发现不再导入代理前 `~/.openclaw/sessions/` 布局。仍支持显式会话存储路径，包括在该位置配置的路径。

    旧版会话文件导入和修复属于 Doctor。网关启动时会检查准备情况，而无需导入这些文件；运行时会话访问仅使用 SQLite。不可读的遗留会话索引及其记录保留在其原始路径中，并且重复的启动拒绝使用 Doctor 命令为活动配置文件做好准备。停止网关，备份其状态，修复指定源，并在重新启动之前运行 `openclaw doctor --fix`。 [目标迁移序列](/cli/doctor#session-sqlite-migration)提供检查和验证证据。当前的 SQLite 维护不需要将旧文件保留在磁盘上。

    当安装的启用的运行时支持该模型时，会话路由修复会保留显式的用户选择的模型和运行时，即使默认路由使用不同的运行时也是如此。这也适用于 `openclaw update` 期间的存档会话和医生通行证。如果插件不可用或选择无效，Doctor 会删除运行时选择。它仍然清除旧后端和模型被删除后实时路由忽略的遗留 CLI 运行时残留；单独更改默认值不会使当前显式会话选择无效。

    当不可用的插件仍然需要旧会话文件时，Doctor 在验证核心导入后会保留这些原始文件。仅当会话所有者具有匹配的已验证导入时，Startup 才会接受保留的文件。未使用的已配置代理不需要空数据库来存储其他代理的历史记录。已更改、未分配或未导入的源行在启动前仍需要修复。

    延迟会话导入收据绑定数据库 inode 和支持的创建时间，因此重新启动后虚拟文件系统设备号更改不会使已验证的导入无效。保留的源文件保留其 SHA-256 和大小检查；正常的 SQLite 编辑和删除仍然具有权威性。医生的 import/recovery 通行证会在现有收据 JSON 中升级旧的设备和 inode 收据。如果旧的物理身份不再匹配，Doctor 会在重新绑定之前根据存储的历史记录验证保留的来源。已更改或不完整的数据库会保留其恢复警告，并且无法重播保留的会话。

    当过时的收据引用丢失的原始文件时，Doctor 会在每个同步源验证阶段读取每个迁移清单一次，从而跨记录重复使用存档清单。稍后的阶段会再次验证，因此更改的清单和存档无法继承早期的验证。

    Doctor 通过计划和会话后修复保留了一种准备好的插件选择。当允许的插件完成修复时，延迟的外部插件将保持延迟状态；更改维护范围不会添加计划外操作或因操作顺序不匹配而阻止更新。当没有延迟插件迁移并且没有保留经过验证的遗留会话源时，会话后插件修复将运行其检测器一次并跳过完成认证通过。 `openclaw update status` 和 Doctor 报告推迟了插件修复；网关启动会消耗规范状态，而不读取那些待处理的记录。

    在归档保留的原始文件之前，Doctor 会根据当前发布事务重新检查待处理的插件迁移。如果这些义务在维修过程中发生变化，原件仍然受到保护，并且 Doctor 会报告冲突以供以后维修。

    当成功导入可用历史记录和会话元数据时（包括插件迁移挂起时），丢失的脚本仍然会发出警告。稍后 Doctor 运行保留当前 SQLite 编辑和删除，而不是重播保留的索引。丢失历史记录警告会在归档后使该索引受到保护。如果出现之前丢失的成绩单，Doctor 会保留它并报告源冲突，以便在完成延迟迁移之前进行检查。

    如果代理架构升级在数据库提交后中断，请使用兼容的 OpenClaw 版本重新运行 `openclaw doctor --fix`。 Doctor 刷新每个成功验证的数据库的注册，包括不再配置代理的活动状态目录内保留的注册数据库。

    未完成的代理删除在更新期间保留其数据库的所有权。 Doctor 在架构预检和迁移前备份中包含可恢复的挂起存储，然后在当前删除所有者下准备其架构。其他每代理内容迁移会推迟这些存储。网关恢复会在根据原始删除请求删除或保留文件之前恢复完整的会话清理，包括本机绑定和相关状态。这也支持没有相场的旧期刊。已完成的保留删除和未完成的爪去除保留其现有的恢复和去除所有者。

    Doctor 的旧主会话密钥修复使用会话导入目标策略。保留的退休智能体店即使在其架构需要准入时也保持不变，并且 Doctor 会通过每个跳过的商店路径发出警告。这些存储中的任何旧主行都将保留，以便显式代理恢复；它们不会阻止活动代理的更新。不可读的活动存储仍然需要修复。

    Doctor 在发布维护之前完成由修复开始的数据库工作。如果检查未发现修复，则现有运行时句柄将保持打开状态。如果维护所有权丢失，Doctor 会停止修复并清理自己的资源，而不会关闭独立承认的运行时工作。

    `openclaw doctor --fix`（包括 `openclaw update` 期间的修复通道）从历史任务运行 ID 和子会话密钥中删除周围的空白。它修复同一事务中的相关子代理任务绑定，同时保留任务 ID、物理子代理运行 ID 和交付记录。如果不同的运行 ID 变为相同的 ID，Doctor 会保持事务不变并报告冲突的绑定。新任务写入在持久化之前规范化这些字段；网关读取使用现有索引，而不扫描空白修复。直接替换二进制文件时，请在启动新网关之前针对相同状态运行 Doctor；官方容器镜像激活包含此修复通行证。

    独立 `openclaw doctor --fix` 会删除每个平台上从 `(multiple)` 会话存储标记派生的无效数据库注册。它删除经过验证的空文件，保留包含数据或不可读的文件，并报告保留的路径。在 Windows 上，它还整合使用普通路径和扩展长度（`\\?\` 或 `\\?\UNC\`）路径的内部数据库注册，将最新记录的事实保留在状态相关行中。外部数据库位置保留其现有拼写。 Doctor 在更新期间会跳过这些修复并发出警告，包括候选 Doctor pass，因此更新程序捕获的回滚库存保持不变。更新完成后重新运行独立 Doctor 以修复现有注册。

    Doctor 报告单个通道迁移计划失败，同时继续计划不相关的源（包括来自同一插件的源）。共享失败源的计划将被推迟，并且源清理会等待其最后一个使用者完成，而不会报告失败或不完整的导入。咨询就绪警告允许网关开始降级。启动使用确切的修复命令记录一次警告； `openclaw status`和`openclaw doctor`显示正在运行的网关的警告报告。针对同一 state/config 运行 `openclaw doctor --fix`，然后重新启动网关。在稍后运行 Doctor 之前，带有警告的迁移仍然不完整。读取不安全的状态仍然拒绝启动。

    如果代理数据库属于不同的代理，Doctor 将在升级任一数据库之前检查是否存在放错位置的副本。只有字节相同的数据库文件（sidecar 和存档依赖项不存在或相同）才符合资格。医生检查点并根据其维护租约重新检查它们，使用现有的 `.corrupt-<timestamp>` 恢复文件名保留丢失的副本，并让受影响的代理从新数据库开始。该警告命名了保留的路径。

    不同或未经验证的副本仍然存在。对于经验证所有权不匹配的已配置辅助代理，网关会在该代理不可用的情况下启动，并继续为健康的代理提供服务。 `openclaw agents list`，状态和医生报告降级的药剂；发送给它的轮次返回记录的拒绝原因。影响默认代理或系统代理或共享状态数据库的拒绝仍​​然会阻止启动。

    Doctor 报告嵌入式所有者和已检查数据并停止 OpenClaw 的操作员的现有显式隔离命令。独立状态迁移仍在进行；需要被拒绝的数据库的修复将被跳过并报告为警告。准入源自数据库文件，并且仅在运行过程中保留。修复或明确隔离丢失的副本后，重新启动网关以再次评估准入。没有持续拒绝或单独清关的记录。

    媒体持久性修复以字节为界的批次扫描转录本，并在长时间扫描期间服务维护租约更新。每个代理数据库都有自己的维护范围。如果所有权丢失，该数据库的活动重写将回滚； Doctor 报告失败并仍然尝试不相关的代理数据库。在重试被拒绝的修复之前，停止其他 OpenClaw 编写器。

    `delivery-queue/` 和 `session-delivery-queue/` 下的 JSON 交付文件最后一次写入是在 2026 年 7 月 1 日之前。它们的导入已停用。医生和初创公司保持这些文件不变，并停止指导通过 `2026.9.7` 升级并首先运行其 `openclaw doctor --fix`。在中间升级之前备份完整的状态目录，包括队列拥有的媒体。当前的 SQLite 队列及其重试策略保持不变。

    Doctor 还准备 SQLite 中已退役的原始出站行，包括中断的准备和媒体分段检查点。仅当准备或发送协调需要时，它才会加载配置的插件运行时，保留现有的修改器顺序和取消策略，并在完成修复之前处置该运行时。准备好的检查点完成，无需重新运行修改器。缺少的插件或媒体会留下现有的保管并重试警告以进行另一个 `doctor --fix` 通行证。正常网关启动会报告旧的 SQLite 行，而不进行转换；它继续恢复并重试当前准备好的队列。

    如果插件清理报告保留资源，Doctor 将保留其维护所有权并导致修复失败。在重新启动网关之前解决该进程的清理失败问题；当这些资源仍然可以写入时，另一个调用无法接管其租约。完全解决的回调错误仍然可见，但不保留维护所有权。

    现有的 `.migrated` JSON 文件和 `.media.migrated` 目录仍然是恢复工件。它们不是待处理消息，也不会自动删除。在发送新消息之前查看保留的收件人、文本和附件；不要将存档文件重命名回队列中以请求重播。

    当迁移留下旧文件夹作为备份时，Doctor 会发出警告。 WhatsApp 身份验证有意仅通过 `openclaw doctor` 迁移。 Talk provider/provider-map 规范化通过结构相等进行比较，因此仅键顺序差异不再触发重复无操作 `doctor --fix` 更改。

    当显式名册不再包含 `main` 时，仅 `openclaw doctor --fix` 迁移持久 `agent:main:*` SQLite 行，并且仅当替换所有者明确时：唯一名册成员或 `agents.defaults.sessionStore.agentId` 中配置的升级所有者。显式所有者适用于每个代理和固定会话存储；固定存储运行时所有权仍然限于该物理存储。网关启动、嵌入式 TUI 启动、CLI 预检和第一代理加入仅检查保留的索赔并报告 Doctor 提示；它们不会移动或删除行、恢复旧版转录本生成或写入旧版主迁移收据。

    `openclaw doctor --fix` 首先导入任何旧版 JSON 会话存储，然后保留获胜的主会话声明，并将每个失败的声明在其原始数据库中重命名为 `agent:<owner>:legacy-main-conflict-<n>`。隔离仅更改密钥；条目和完整成绩单仍可供检查或存档。

    Doctor 还可以修复有限转录本前缀中第一个用户请求中丢失的历史会话标题。它保留显式名称和会话活动，跳过正在运行和隐身会话，并且不会恢复冷历史记录或调用模型。会话密钥标准化后，它会标准化合格的旧 ACP 元数据密钥，同时保留其存储的生命周期绑定。丢失、过时或冲突的 ACP 声明仍然可供检查，并带有警告。网关启动和普通读取不会执行任何修复。

    Doctor 检测托管工作树会话中丢失的当前格式工作区元数据，并在会话密钥修复解决后修复它。网关启动不会扫描这些旧工作区修复。当前的模式开放、准备情况验证、转录投影和实时运行恢复仍由其运行时所有者保留。

    此迁移首先扫描会话密钥。如果任何候选存储中不存在旧别名，则它不会读取任何记录；否则，它仅在这些存储中流式传输别名及其规范化目标。跨存储副本在写入之前会重新读取并验证源，源删除会在删除事务中再次验证它。这限制了Doctor期间的转录记忆，包括`openclaw update`内的Doctor通行证。 Gateway 启动将遗留迁移及其扫描留给 Doctor。

    来自 2026.9.x 的独立 SDK 安装将继续使用 OS 主目录下的非空旧版 `~/.openclaw/agent/` 目录，直到 Doctor 记录完成的迁移，即使配置的目录已存在。仅当活动配置文件为默认且其状态目录为 OS-home `~/.openclaw` 或为活动配置文件显式配置旧代理路径时，指定的 `standaloneAgent` 迁移例外才适用。不同的配置文件 `OPENCLAW_STATE_DIR` 或 `OPENCLAW_HOME` 不会继承默认配置文件的 SDK 数据。 Doctor 将合格的源和任何不同的 `<state>/agent/` 有效负载合并到配置的目标中。移动或隔离每个 SDK 旧条目后，Doctor 在目标处写入 `.legacy-agent-dir-migration.json`，绑定到已解析的源路径和目标路径。如果旧文件再次出现，匹配的收据允许 SDK 使用配置的目录；医生报告并修复这些残留物。丢失或不完整的收据会将 SDK 保留在非空旧目录中。医生保留无法识别的目标收据并将其报告以供检查，而不是覆盖它。 Doctor 和独立的 SDK 从加载的配置中解析相同的安装目录，包括自定义 `agentDir` 或非主要默认代理。在检查配置之前，SDK 目录读取使用显式 `OPENCLAW_AGENT_DIR`。否则，丢失、不可读或无效的配置会产生一个警告并使用默认目录决策，包括未迁移的旧状态。检查永远不会重写配置、更改进程环境或运行迁移； Doctor 保留其单独的配置准入检查。显式 `OPENCLAW_AGENT_DIR` 覆盖对两者仍然具有权威性：Doctor 永远不会耗尽所选目录，并将其他遗留源合并到其中。当配置或迁移更改此目录时，托管工具查找将遵循此目录。复制状态规划将 SDK 主有效负载推迟到绑定快照之外；在原始安装上运行 Doctor 以迁移这些文件。

    如果没有环境代理所有者或选定的安装目录，搜索工具仍使用 `PATH` 上的系统二进制文件，并且 shell 命令保留其现有的 `PATH`。下载托管二进制文件需要选择所有者或设置 `OPENCLAW_AGENT_DIR`； SDK 会话保留其明确的所有者要求。

    SDK 将所选目录与其记录的数据库所有者配对。当配置选择另一个代理（例如 `worker`）时，旧版 `main` 存储仍会以 `main` 的形式打开。 Doctor 推迟目录迁移，将存储保留在原位，并记录 `outcome=deferred` 和原因 `owner-mismatch`、记录和配置的所有者以及源路径。该警告告诉您继续使用现有商店；全店所有权转让需要稍后发布。不会为延迟源写入完成标记，并且独​​立修复将继续。 SQLite 即使所有者匹配，目录迁移仍会延迟。

    Doctor 递归地合并旧代理目录，包括现有的 `bin/` 目录。相同的文件无需隔离；不同的文件保留当前目标并将旧副本保留在状态目录下的单个 `agent.legacy-<timestamp>-<id>` 目录下。即使 `agentDir` 是外部的或通过祖先符号链接到达的，恢复副本也会保留在那里； Doctor 在移动文件系统路径之前解析它们。警告和修复报告会列出每个冲突，然后继续进行修复。在没有新的冲突数据的情况下重复 Doctor 不会创建另一个隔离区。医生报告隔离时间超过 30 天，并带有清理提示，包括来自较旧的每个代理位置的工件；在手动删除不再需要的副本之前检查它们。 OpenClaw 永远不会自动删除这些恢复工件。

    Doctor 将每个 SQLite 数据库系列保留在其原始位置，包括其 WAL、共享内存和回滚日志文件。即使目标为空，并且对于缺少数据库的不完整族，这也适用。警告和维修收据记录 `outcome=deferred`、原因 `sqlite-family`、源文件和计划目标。继续使用现有商店；安全 SQLite 目录重定位需要更高版本。 Doctor 不会写入完成标记，并且 SDK 继续使用旧目录及其记录的所有者。

    对于包含 SQLite 的源，Doctor 也会保留其他源文件，使已安装的工具和模型发现可用。它将丢失的非数据库文件复制到目标位置，将相同的文件保留在适当的位置，并在保留两个原始文件的同时对不同的文件发出警告。它不会为这些延迟源创建冲突隔离。独立维修仍在继续。没有 SQLite 的源仍使用上述递归移动和隔离行为。

  </Accordion>
  <Accordion id="3a-legacy-plugin-manifest-migrations" title="3a.旧版插件清单迁移">
    Doctor 扫描所有已安装的插件清单以查找已弃用的顶级功能密钥（`speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders`、`webSearchProviders`）。找到后，它会将它们移动到 `contracts` 对象中并就地重写清单文件。重复此迁移不会产生额外效果；如果 `contracts` 已具有相同的值，则删除旧密钥而不复制数据。
  </Accordion>
  <Accordion id="3b-legacy-cron-store-migrations" title="3b.旧版 cron 存储迁移">
    Doctor 修复支持 SQLite cron 行中的历史形状，并导入支持的 `jobs-quarantine.json` sidecar。停用的 `jobs.json`、`jobs-state.json` 和 `runs/*.jsonl` 文件需要通过 `2026.9.7` 进行中间升级； Doctor 保留它们并在 cron 修复之前停止。请参阅 [ 保留政策](/gateway/doctor/config-migrations#retention-policy)。

    当前 cron 清理包括：

    - `jobId` → `id`
    - `schedule.cron` → `schedule.expr`
    - 顶层 payload 字段（`message`、`model`、`thinking`……）→ `payload`
    - 顶层 delivery 字段（`deliver`、`channel`、`to`、`provider`……）→ `delivery`
    - payload 中的 `provider` delivery 别名 → 明确的 `delivery.channel`
    - 旧版 `notify: true` webhook 回退任务 → 当已退役的原始 `cron.webhook` 值有效时，转换为明确的 webhook delivery；announce 任务保留其聊天 delivery，并获得 `delivery.completionDestination`。随后 Doctor 会移除旧配置键。如果没有可用的旧版 webhook，不指向目标的任务会移除无效的顶层 `notify` 标记（现有 delivery，包括 announce，会被保留），因为运行时 delivery 从不读取该标记。

    旧版默认代理所有权只能由 Doctor 修复。网关启动使存储的 cron 所有权保持不变。其配置仍保留旧默认标记的无主作业等待修复，而不消耗其应有的发生或禁用一次性。手动运行返回`openclaw doctor --fix`指导；明确拥有的工作继续正常进行。 Doctor 在删除该标记之前固定历史所有者，保留作业的定义和运行时状态。未解决的历史作业在更新或删除之前也需要 Doctor，并且当前的系统代理无法获得对它们的管理访问权限。操作员检查仍然可用。对于没有默认标记的旧 `agents.list`，Doctor 在转换花名册之前将历史无主作业固定到列表中的第一个代理。当前不带旧标记的键控 `agents.entries` 配置保留其动态系统代理选择。

    缺失的间隔锚由医生修复。运行时调度可以计算下一次运行，而无需将锚写入旧定义中。安排维护和运行结果保留存储的所有权和创作字段；有意的 enable/disable 转换仅更改启用的字段。

    Gateway 还会在加载时清理格式错误的 cron 行，使有效任务继续运行。格式错误的行会在从活动调度中移除它们的同一事务中，被隔离到共享 SQLite 状态数据库；doctor 会报告这些记录，并导入旧版本留下的 `jobs-quarantine.json` sidecar 文件。

    网关启动标准化运行时投影并忽略顶级 `notify` 标记，但保留持久的 cron 状态以供医生修复。 Doctor 会删除没有迁移目标的作业（`delivery.mode` none/absent、不可用的旧 Webhook 目标或现有的 announce/chat 交付）的惰性标记，使现有交付保持不变，因此重复的 `doctor --fix` 运行不再重新警告同一作业。

    在 Linux 上，当用户的 crontab 仍然调用旧版 `~/.openclaw/bin/ensure-whatsapp.sh` 时，doctor 也会发出警告。该主机本地脚本不是由当前的 OpenClaw 维护的，并且当 cron 无法到达 systemd 用户总线时，可以将错误的 `Gateway inactive` 消息写入 `~/.openclaw/logs/whatsapp-health.log`。使用 `crontab -e` 删除过时的 crontab 条目；使用 `openclaw channels status --probe`、`openclaw doctor` 和 `openclaw gateway status` 进行当前运行状况检查。

  </Accordion>
  <Accordion id="3c-session-lock-cleanup" title="3c.会话锁清理">
    Doctor 会扫描每个代理会话目录，查找文件支持的会话异常退出时留下的遗留写锁文件。对于找到的每个锁定文件，它会报告：路径、PID、PID 是否仍然存在、锁定期限以及是否被视为过时（死亡 PID、格式错误的所有者元数据、超过 30 分钟或被证明属于非 OpenClaw 进程的活动 PID）。在 `--fix` / `--repair` 模式下，它会自动删除死锁、孤儿锁、回收锁、畸形旧锁或非 OpenClaw 所有者的锁。仍由活动的 OpenClaw 进程拥有的旧锁会被报告，但仍保留在原处，因此医生不会切断活动的脚本编写者。
  </Accordion>
  <Accordion id="3d-session-transcript-branch-repair" title="3d.会话记录分支修复">
    Doctor 扫描旧代理会话 JSONL 文件，查找由 2026.4.24 提示记录重写错误创建的重复分支形状：废弃的用户使用 OpenClaw 内部运行时上下文以及包含相同可见用户提示的活动同级。在 `--fix` / `--repair` 模式下，Doctor 修复分支，同时暂存其历史记录以导入到 SQLite。原始 JSONL 文件保持不变，并在成功导入后存档。

    当除 `timestamp` 之外的每个字段都与第一个标头匹配时，Doctor 还会从暂存历史记录中删除冗余会话标头。 Discovery 也接受未索引历史记录中的这些标头。导入重试和验证使用相同的分阶段历史记录。保留具有冲突身份或元数据的标头以供调查；原始 JSONL 字节保持不变。

  </Accordion>
  <Accordion id="4-state-integrity-checks-session-persistence-routing-and-safety" title="4. 状态完整性检查（会话持久性、路由和安全）">
    State directory 是运行时的核心。如果它消失，除非你在其他地方有备份，否则会丢失 sessions、凭据、日志和配置。

    Doctor 会检查：

    - **State dir missing**：警告灾难性的状态丢失，提示重新创建目录，并提醒你它无法恢复丢失的数据。
    - **状态dir权限**：验证可写性；提供修复权限（并在检测到 owner/group 不匹配时发出 `chown` 提示）。配置修复（包括更新期间）会保留另一个用户拥有的可写状态根（例如模式为 `2775` 的 Kubernetes `fsGroup` 卷）。它们报告其路径、所有者 ID 和保留模式作为警告。配置和备份文件仍然需要模式 `600`；拥有的目录强化和私有凭证目录检查仍然强制执行。
    - **macOS 云同步状态 dir**：在 iCloud Drive （`~/Library/Mobile Documents/com~apple~CloudDocs/...`） 或 `~/Library/CloudStorage/...` 下解析状态时发出警告，因为同步支持的路径可能会导致 I/O 速度变慢lock/sync 比赛。
    - **Windows 云同步状态 dir**：在 OneDrive 同步根（来自 `OneDrive`、`OneDriveConsumer` 或 `OneDriveCommercial`）下解析状态时发出警告，因为支持同步的路径可能会导致 I/O、lock/sync 竞赛变慢以及文件按需脱水。要重新定位，请停止网关，移动整个状态目录，为网关服务（不仅仅是一个 shell）设置 `OPENCLAW_STATE_DIR`，重新启动并重新运行 doctor。
    - **Linux SD 或 eMMC 状态 dir**：当状态解析为 `mmcblk*` 挂载源时发出警告，因为 SD/eMMC-backed 随机 I/O 在会话下可能会更慢且磨损更快和凭证写入。
    - **Linux volatile state dir**：当状态路径解析到 `tmpfs` 或 `ramfs` 时发出警告，因为 sessions、凭据、配置和 SQLite 状态（包括 WAL/journal sidecar）会在重启时消失。Docker `overlay` 挂载不会被标记，因为只要容器仍在运行，其可写层会在主机重启后持久存在。
    - **会话目录权限**：检查现有会话和存储目录的可写性。丢失的存档目录在新配置文件上是健康的，并且会在需要时创建。
    - **旧版转录本不匹配**：当最近的旧版会话条目缺少转录本文件时发出警告。 SQLite- 拥有的会话不需要存档的 JSONL 文件。
    - **Legacy 主会话“1 行 JSONL”**：当未导入的主记录只有一行（历史记录未累积）时进行标记。
    - **状态目录范围**：完整性诊断检查配置文件或`OPENCLAW_STATE_DIR`选择的活动状态目录。单独的配置文件有意保留单独的历史记录； Doctor 不会探测默认的 `~/.openclaw` 目录，只是为了警告它也存在。 macOS 启动代理禁用警告仅读取活动状态目录的 `disable-launchagent` 标记。 `resolveLegacyProfileMigrationExceptions` 中命名了两个已发布的迁移例外：`profileWorkspace` 只能读取 `~/.openclaw/workspace-<active-profile>` 并将其迁移到该配置文件的工作区中，而 `standaloneAgent` 遵循上面的默认安装或显式路径规则。两种迁移都不会扫描其他配置文件的条目。
    - **Remote mode reminder**：如果 `gateway.mode=remote`，doctor 会提醒你在远程主机上运行它（状态位于远程主机）。
    - **配置文件权限**：如果活动配置文件为group/world可读，则发出警告，并建议收紧至`600`。

  </Accordion>
  <Accordion id="5-model-auth-health-oauth-expiry" title="5. 模型身份验证运行状况（OAuth 过期）">
    Doctor 检查身份验证存储中的 OAuth 配置文件，当令牌为 expiring/expired 时发出警告，并可以在安全时刷新它们。如果 Anthropic OAuth/token 配置文件已过时，则建议使用 Anthropic API 密钥或 Anthropic 设置令牌路径。仅在交互运行时出现刷新提示（TTY）； `--non-interactive` 跳过刷新尝试。

    当 OAuth 刷新永久失败时（例如 `refresh_token_reused`、`invalid_grant`，或 provider 提示你重新登录），doctor 会报告需要重新认证，并打印要运行的确切 `openclaw models auth login --provider ...` 命令。

    Doctor 还报告由于冷却时间短（limits/timeouts/auth 故障）或较长时间禁用（billing/credit 故障）而暂时无法使用的身份验证配置文件。

    Doctor 还将旧生成的提供商目录（`plugins/*/catalog.json` 和保留的迁移声明）导入代理 SQLite，同时保留提供商凭据。运行 `openclaw doctor --fix` 以导入这些目录或修复无法导出传输 API 的持久生成模型。普通模型加载读取存储的 SQLite 目录，无需导入 sidecar 或修复保存的行。初始磁盘发现和显式注册表刷新使用 Doctor 命令报告旧目录；热模型查找和生命周期捕获的目录不会检查旧文件。新生成的目录在发布前仍会进行标准化。

    OAuth 凭证 sidecar 导入已停用。医生保留了他们的文件和加密密钥。当旧版 `auth-profiles.json` 仍然引用 sidecar 时，Doctor 会拒绝迁移：通过 `2026.9.7` 升级，并在重试之前从原始主机上的交互式终端运行 `openclaw doctor --fix`；该版本可以恢复历史密钥并导入凭证。未引用的边车保持在原位而不会阻塞。请参阅 [ 保留政策](/gateway/doctor/config-migrations#retention-policy)。

    过时的 OAuth 影子清理会在遗留文件或规范存储中保留带有 sidecar 引用的配置文件。如果无法读取或解析旧版身份验证文件，Doctor 会跳过该代理的影子清理并使用文件路径发出警告；在重试之前检查或恢复它。丢失的旧文件不会阻止清理普通 SQLite-only 配置文件。

  </Accordion>
  <Accordion id="6-hooks-model-validation" title="6. Hooks模型验证">
    如果设置了 `hooks.gmail.model`，doctor 会根据目录和 allowlist 验证模型引用，并在该引用无法解析或不被允许时发出警告。
  </Accordion>
  <Accordion id="7-sandbox-image-repair" title="7. 沙箱镜像修复">
    启用沙箱时，doctor 会检查 Docker 镜像，并在当前镜像缺失时提供构建或切换到旧名称的选项。
  </Accordion>
  <Accordion id="7b-plugin-install-cleanup" title="7b.插件安装清理">
    Doctor 修复了早于记录的源权限的旧版官方 ClawHub 安装记录。对于 `--fix`，只有当原始规格和每个记录的包标识与官方目录一致时，它才会回填现有的官方 host/channel 字段。本地源、部分或冲突的权限以及无法验证的身份需要重新安装才能获得对受限运行时功能的信任。具有一致官方规格的普通传统 npm 记录已经满足信任。插件范围的状态和入口队列不需要可信来源。请参阅 [Plugin 运行时信任被拒绝 ](/tools/plugin#plugin-runtime-trust-refused) 了解拒绝原因代码和补救措施。

    当本地网关无法访问时，doctor 会将 CLI 状态目录与已安装服务的有效环境进行比较。当两个路径不同时，它会打印这两个路径，或者报告无法验证服务路径。不可读或无命令的服务定义以及不可用的引用环境文件是未知的，这不是路径匹配的证据。 Windows 具有未解析的变量扩展或不支持的转义的批处理分配也仍未得到验证；在选择维修之前，使用 `openclaw gateway status --deep` 检查其使用环境。使用网关的`OPENCLAW_STATE_DIR`和`OPENCLAW_CONFIG_PATH`进行检查和维修；仅匹配配置和可执行版本并不能建立匹配的插件安装状态。

    如果不可读的本机定义也阻止安装或自我更新，请按照 [native 服务恢复](/cli/gateway#recover-an-unreadable-native-service-definition) 操作。在重建启动器之前保留仅服务环境值；配置和插件状态不需要删除。

    Doctor 保留共享插件运行时缓存和暂存目录，包括旧版本存储桶。另一个安装或配置文件仍然可以依赖它们；目录名称或标记并不表明它未被使用。 `openclaw doctor --fix` / `openclaw doctor --repair` 仅当目标不再存在时才删除全局插件运行时符号链接，而不仅仅是因为它们指向较旧的缓存。

    v2026.8.1 中附带的 `core/doctor/legacy-plugin-dependencies` lint 选择器仍然可用作已弃用的非破坏性信息检查。它不再扫描缓存根或建议删除它们。使用 `--severity-min info` 显示其弃用通知。

    包本地清理仍由包安装程序进行。 Doctor 仍会删除捆绑 `@openclaw/*` 插件的孤立或恢复的托管 npm 副本，这些副本可能会影响当前捆绑清单。它还将主机 `openclaw` 包重新链接到声明 `peerDependencies.openclaw` 的托管 npm 插件中，因此包本地运行时导入（例如 `openclaw/plugin-sdk/*`）在更新或 npm 修复后继续解析。

    当配置引用缺少的可下载插件但本地插件注册表找不到它们时，Doctor 还可以重新安装它们（材料 `plugins.entries`、配置的 channel/provider/search 设置、配置的代理运行时）。在软件包更新期间，doctor 避免在交换核心软件包时重新安装插件软件包；如果配置的插件仍需要恢复，请在更新后再次运行 `openclaw doctor --fix`。网关启动和配置重新加载不运行包修复；插件安装仍然显式 doctor/install/update 工作。

    对于不完整的记录安装，Doctor 的重新安装提示会保留记录的软件包选择器，优先选择已解决的版本而不是原始规范。例如：`openclaw plugins install clawhub:demo@1.2.3 --force`。如果两个选择器都没有被记录，Doctor 会解释为什么它不能给出准确的重新安装命令，并保留通用修复指南。

    Doctor 还刷新了与当前 OpenClaw 发行版绑定的过时的官方运行时插件。此修复使用记录的注册表上声明的当前目标，并独立于旧安装验证该工件。现有的 npm 引脚成为精确的替换版本；普通的缺失插件修复可以保留记录的目标和完整性。能力同意仍然适用。

    容器化网关启动遵循与其他安装相同的准备边界。它验证配置，承认支持的数据库，刷新当前插件元数据，并检查活动插件有效负载。官方映像入口点在默认或 Compose Gateway 命令之前针对已安装的 state/config 运行 `openclaw doctor --fix --non-interactive`，因此常规映像升级不需要单独的 Doctor pass。网关启动本身不会导入旧文件、修复插件包或链接或记录已完成的旧迁移。如果您覆盖映像入口点，请在启动网关之前针对同一安装的 state/config 运行 Doctor。支持的版本化数据库打开和本机初始化仍然是正常运行时操作的一部分。

  </Accordion>
</AccordionGroup>
