---
summary: "从 Control UI 或 CLI 中失败的 OpenClaw 更新中恢复"
read_when:
  - "OpenClaw 更新失败"
  - "网关未报告最终更新结果"
title: "更新疑难解答"
---

更新恢复解决后，失败的更新将进入内置分类。在交互式终端中，OpenClaw 显示所选代理、保存的提示路径（如果可用）以及使用您自己的 account/tokens，然后在启动 [triage](/cli/triage) 之前进行询问。只有肯定的“是”才会继续。输入 `n`、取消或 30 秒内无应答将跳过启动并保留诊断和手动恢复命令。使用 `openclaw triage --agent codex` 选择另一个代理。使用 `--yes`、`--json` 或无交互式终端时，更新会保存诊断并且从不启动修复代理。输出打印显式选择加入命令 `openclaw triage --run --update-result <path>`。托管切换和前台网关启动失败也仅收集诊断信息。请参见 [ 无人值守故障诊断 ](/cli/triage#automatic-failure-handoff)。原始更新失败和退出状态保持权威；诊断不会将失败的更新转变为成功的更新。

如果更新运行状况检查发出完整的 lint 报告，但未在截止日期之前退出，则失败将与进程终止分开标识该完成。输出管道保持打开状态的已退出子进程将单独报告。如果没有完整的 lint 报告，截止日期并不能证明检查已完成。诊断收集不需要推理；原始更新检查仍然是报告的失败。

在 Control UI 中，失败的尝试会打开 **Ask OpenClaw** 及其记录的详细信息，并要求其在重试之前进行调查。连接丢失或验证超时将显示为未知结果。该选项卡会记住最近 32 个调查的尝试身份，范围仅限于其网关和配置文件。状态检查、在这些范围之间切换以及重新加载同一选项卡不会自动再次发送这些调查。如果浏览器无法读取或保存该历史记录，则故障详细信息仍然可见，而无需自动诊断请求。手动询问 OpenClaw 或在主机上运行 `openclaw triage`。如果网关或代理不可用，请在网关主机上使用 `openclaw triage`。自动诊断会保留未发送的作曲家草稿，包括何时必须重新启动其对话会话。

**Control UI → 设置 → 更新** 保持最新记录的尝试可见，包括其时间、before/after 身份、原因代码、失败步骤和有限的诊断详细信息。当状态检查重新读取相同的尝试时，版本或修订验证失败仍然可见。当预期版本或修订版本到达时，或者当同一尝试报告其最终失败或取消时，未知的验证结果将得到解决。较新记录的尝试也可以取代它。故意取消、当前安装和仍在进行中的更新不会启动分类。

当托管服务更新无法移交给其帮助程序时，保存的尝试包括有限的失败类型和下一步：运行时或生成失败、权限或服务拒绝、所有权拒绝、payload/control-channel 失败、超时、早期帮助程序退出或准备失败。如果故障发生在所有权转移之前，恢复结果会记录网关继续服务。仅转移错误并不能确定帮助者是否接受所有权；重试之前检查 `openclaw update status` 和 `openclaw gateway status --deep`。

对于最终失败的尝试，**报告更新失败**与**Retry**和**Ask OpenClaw**是分开的。它预览包含 OpenClaw 版本、平台、更新目标、失败阶段、清理诊断和验证回滚结果的有界报告。该报告不包括机密、令牌、聊天内容、原始日志、私有绝对路径和恢复命令。在指定的管理员确认预览之前，不会提交任何内容。指定管理员会收到预先填写的问题，以便在浏览器中使用自己的 GitHub 帐户进行查看和提交。此路径从不调用主机的 GitHub CLI，包括用于身份验证或协调。连接“我的 GitHub”不会授予主机帐户发布权限。只有网关所有者或内部系统管理员才能授权现有主机 GitHub CLI 发出流。回退和待定结果在本地保留经过净化的报告；已确认的问题仅保留其持久问题 URL。 OpenClaw 首先使用活动的 `github.com` 帐户发出静默只读请求。缺少 CLI 或失败、不可用或超时的身份验证检查会返回预填充的问题链接，而不开始创建问题。在Control UI中，记录尝试的中断准备可以在其本地保留到期后重试。一旦问题创建开始，超时、信号、非零退出或没有经过验证的问题 URL 的格式错误的响应将使尝试处于挂起状态，而没有重播链接，因为问题创建结果可能未知。该操作与一个更新尝试身份相关联，并且不能提交该尝试两次；重新连接或刷新状态永远不会自动报告。 CLI 报告错误返回到显式操作菜单，并且永远不会代表用户启动诊断。

Control UI 修复仅使用键入的产品操作。当连接的 UI 具有所需的功能和范围时，它会引导经过身份验证的网关或本机操作，保留破坏性操作的确认，并将终端命令保留为辅助主机端后备。它从不解析本地化指导或执行任意命令字符串。

## <a id="recover-in-the-control-ui"></a> 在Control UI中恢复

1. 当网关重新启动、断开连接或未报告最终结果时，选择**检查状态**。这读作 `update.status`；它不会启动另一个更新。在检查挂起期间，恢复控件保持禁用状态，并且被拒绝的请求在页面或更新对话框中显示为错误。该对话框显示 **检查状态…等待时​​的** 和刷新的 **状态。成功读取后的**，即使记录的故障尚未更改。如果网关断开连接，请在检查或重试之前重新连接。
2. 打开**查看详细信息**并解决记录的失败步骤。诊断文本经过限制和编辑以供显示；当需要更多上下文时使用网关日志。
3. 选择**，仅在原因解决后重试更新**。 Control UI 使用正常的确认更新流程，并声明在网关重新启动时正在运行的会话会中断。

这些控件需要连接的网关、对相应类型网关方法的支持以及管理员范围。如果不满足这些条件，请在网关主机上使用 CLI 回退。

## <a id="doctor-cannot-enter-maintenance-during-finalization"></a> Doctor在终结时无法进入维护

当网关仍拥有所选状态目录时，`finalize:doctor` 可以报告 `Doctor could not enter maintenance`。启动网关和健康的服务网关在其整个进程生命周期中保留该所有权；等待就绪不会释放锁。

当没有数据存在风险时，包括来自未知或非服务持有者的争用，维护准入拒绝会通过记录的警告来完成更新。修复可恢复在报告该警告之前停止的托管服务。医生和插件维护仍悬而未决。解决报告的所有权或可用性问题，然后运行 ​​`openclaw update repair`。检查 `openclaw update status --json` 和 `openclaw gateway status --deep` 的待处理迁移、记录的警告和当前运行状况。

不要删除锁定文件来强制进入。死进程释放物理锁，并且租约所有者回收可证明死的身份。维护警告永远不会授权并发修复或放弃恢复备份。活动迁移写入、不可读状态、不完整迁移和未经确认的子进程清理保留其故障和恢复指导。

在 Windows 上，`windows-task-inspection-failed` 表示 OpenClaw 无法查询任务计划程序来验证服务是否存在。检查任务计划程序可用性和服务帐户的查询权限，然后在重试之前运行 `openclaw gateway status --deep`。安装失败和更新报告包括安全失败类别以及数字错误号、十六进制 HRESULT、退出代码或超时预算（如果有）。这些事实出现在恢复指南之前，因此有限的报告会保留它们。报告问题时保留这些事实；任务定义和原始本机输出被排除在外。

## <a id="node-and-global-install-permissions"></a> Node 和全局安装权限

如果包恢复报告 `nlink=2`（或其他大于 1 的值），请让更新程序工作人员完成，然后从受影响的安装运行 `openclaw doctor --fix`。 Doctor 可以回收废弃的更新程序运行时，包括保留在 npm 前缀的 `lib/` 目录中的更新程序运行时，并释放其额外的日志链接。然后重试更新。请勿削弱恢复权限或删除激活日志；如果 Doctor 报告当前所有者或无法识别运行时，请在重试之前遵循该诊断。

对于 `node-runtime-preflight`，将消息中指定的运行时升级到满足候选者完整引擎范围和更新程序支持的 Node 范围的版本。建议的版本是该交叉点中受支持的最低版本。按照检测到的运行时管理器（nvm、fnm、Volta 或系统 Node）的恢复步骤进行操作。下一步使用选定的 Node 通过原始安装的绝对 `openclaw.mjs` 启动器运行 `update`。它不依赖于版本管理器切换后 `openclaw` 保留在 PATH 上，也不建议全局安装到未经检查的前缀中。扩展稳定恢复使用 `--channel extended-stable`，因此解析器选择支持的每月版本；其他封装渠道保留带`--tag`的检验版本。恢复中包含显式通道切换，因为运行时拒绝发生在保存该首选项之前。如果当前服务已停止或其定义无法刷新，请让其部署所有者在重试之前在该定义中选择受支持的 Node。切换 shell 运行时不会更改服务的固定 Node 路径。

保留相同的服务帐户、配置文件和 state/config 覆盖。恢复会恢复记录的服务选择器，包括 shell 中不存在的覆盖；不包括凭据。普通更新调用会在安装前重新检查所选的 npm 前缀和托管服务，并保留原始包所有者。其正常运行时选择、服务刷新、重新启动和验证检查均适用。容器使用相同的 state/config 挂载重新部署目标映像。

`global-install-foreign-destination`表示打包交易的目标为国外或无法确定其所有权。检查使用已解析的安装目标：当 nvm、fnm、Homebrew Node 或操作员的 npm 前缀更改在 shell 中选择不同的前缀时，现有的 npm- 全局安装将保留其自己的前缀。该 shell 前缀的不相关安装不会阻止对原始安装的更新。 pnpm 全局安装保留其 pnpm 所有者，并且不使用此 npm 目标检查。

实际目标必须为空，或其解析的包路径必须与正在运行的安装或选定的托管服务匹配，并且任何现有启动程序都指向该包内。无法访问或不可读的目标会在暂存之前停止更新；未知的目标永远不会被视为空。恢复检查通道或选定的包装布局。要求部署所有者验证不可读的布局并明确选择预期的安装。保存的结果和公共故障报告命名目标前缀、程序包、启动器、正在运行的安装和分类的所有权原因。公共路径将您的主目录替换为 `~` 并编辑其他主目录用户名。 `openclaw update status`和Doctor保留警告和恢复步骤。允许解析为相同安装的符号链接前缀；仅靠拼写并不能使目标变得陌生。将运行时切换回来并通过保留的绝对启动器重试。或者，在征得目标所有者同意的情况下，使用打印的 `gateway install --force` 命令（如果可用）明确选择目标服务的安装，然后进行更新。这改变了服务绑定；不允许覆盖另一个部署的包。受保护的服务定义使用部署所有者指令； `--force` 无法更换密封安装座。试运行返回相同的拒绝。记录的尝试保留在更新历史记录中并由 Doctor 显示。如果活动的 CLI 和服务点位于不同的安装中，请按照 [Gateway 服务恢复](/cli/doctor/recovery#gateway-service-recovery) 选择预期的安装，同时保留其状态和服务帐户。在暂存之前拒绝的旧更新程序无法加载候选者的改进诊断；在重试更新之前解决其前缀不匹配问题。

如果范围不重叠，请安装受支持的 Node 并选择兼容的 OpenClaw 目标；该候选者无法在受支持的 Node 版本上运行此更新程序。参见 [Node.js](/install/node).

对于 `global-install-permission-denied`，检查指定的目录和所有者。如果您拥有该目录，则该消息会给出一个有作用域的 `chmod u+rwx` 命令。对于管理员拥有的 npm 前缀，请让该帐户执行包更新或授予预期更新者写入访问权限。保留网关现有的状态和配置；使用 `sudo` 调用整个更新程序可以选择不同的主帐户和服务帐户。不要递归地更改共享系统前缀的所有权。个人安装可以使用 [ 用户可写 npm 前缀 ](/install/node#permission-errors-on-npm-install-g-linux)。

入学后发现的权限错误也有同样的原因。如果激活已经开始，则报告的回滚和服务恢复限制仍然适用。在容器内，相同的下一步操作还会指导您拉取或构建目标 OpenClaw 映像，并使用相同的 state/config 安装重新部署。正在运行的容器内的包更改是不持久的。

### <a id="system-scope-systemd-services"></a> 系统范围 systemd 服务

当调用帐户可以写入安装时，系统范围的网关服务不会阻止包更新。 `openclaw update --yes` 和网关更新操作都会更新程序包并使用确切的操作员重新启动命令（例如 `sudo systemctl restart openclaw-gateway.service`）记录警告。更新程序不会停止或重新启动系统服务，也不会调用 `sudo`。正在运行的网关在检测到其安装已被替换时可以退出；更新后重新启动设备。使用结果中打印的单位名称（包括任何实例名称），然后检查 `openclaw gateway status --deep`。

如果用户范围和系统范围中都存在相同的网关单元，则更新将保留这些系统范围限制。不同名称的网关不会产生此冲突。安装-替换重启等待助手确认更新和清理解决；单独中断的助手不允许重新启动。在中断后手动重新启动之前，检查任何剩余的更新程序。

即使更新程序以 root 身份运行，重新启动仍由操作员管理：托管更新移交自己的用户范围服务监督和恢复，而不是系统服务的生命周期。当待处理的 Doctor 或插件维护无法与当前网关一起安全运行时，它会被记录为警告。解决报告的维护情况后运行 `openclaw update repair`。

如果安装不可写，更新会在 `managed-service-handoff-failed` 包突变之前停止，并打印确切的包更新和重新启动命令。让安装的所属帐户运行这些命令，同时保留网关的服务帐户、状态和配置。不要在不同的主目录下运行整个更新程序或递归更改共享系统前缀的所有权。

已安装的更新程序报告 `Managed update handoff requires a user-scope systemd unit` 在加载候选程序之前拒绝。候选人无法修复录取决定。使用 [ 手动包管理程序 ](/install/updating/update-methods#alternative-manual-npm-pnpm-or-bun) 一次，然后重新启动指定的系统单元；后续更新可以使用固定更新程序。

## <a id="candidate-migration-rehearsal-timeouts"></a> 候选迁移排练超时

当前的更新程序提供快照准备，每个候选者检查从复制的数据库和插件大小得出的单独预算。 SQLite 完整性检查报告其数据库大小、运行时间和活动阶段。耗尽其预算报告 `candidate-migration-rehearsal: <step> exceeded budget after <n> s (<last output>)` 的支票。最后的输出是一个观察结果，而不是检查完成的证据。在报告缓慢的完整性检查或迁移时保留该详细信息。显式的 `--timeout` 仍然控制候选检查截止日期。

已发布的 2026.9.3 更新程序在快照准备和候选检查方面共享五分钟的截止日期。增加 `--timeout` 不能延长该上限。停止网关可以消除写入器争用，但不能延长此期限或消除复制数据库的迁移工作。候选端 Doctor 的改进可以减少这项工作；他们无法更改已安装更新程序的截止日期。

该版本还可以在排练超时后报告跳过修复，并显示“无法提供可用的推理路线”。这来自准备自动修复时的广泛错误处理程序，而不是来自排练时执行的推理检查。检查原始失败的步骤和经过的时间。当前更新程序保留 `candidate-checks-timeout` 原因，并且不会针对该故障运行推理修复。如果安装的更新程序无法完成，请保留 [ 已验证的备份 ](/install/updating/rollback-and-recovery#before-updating-create-a-verified-backup) 并使用安装所有者的 [ 手动包管理程序 ](/install/updating/update-methods#alternative-manual-npm-pnpm-or-bun) 与完全兼容的目标，然后在启动其网关之前运行目标的 `openclaw doctor --fix`。

## <a id="published-2026.9.4-on-large-agent-fleets"></a><a id="published-2026-9-4-on-large-agent-fleets"></a> 在大型代理车队上发布了2026.9.4

已发布的 2026.9.4 更新程序在快照准备和候选检查方面共享五分钟的截止日期。其故障日志尾部结合了这些检查的输出：`Doctor complete.` 可以属于前面的修复过程，即使 lint 是失败的步骤也是如此。最后日志行中的经过时间衡量了整个排练；步骤持续时间衡量单独的检查。需要完整的 lint JSON 报告来确定 lint 在终止前已完成。

已发布的 OpenClaw 2026.9.4 在其 HTTP 侦听器绑定后可能会花费许多分钟来准备模型目录和聊天元数据。在没有更新的仪表化 480 代理控制中，HTTP 检查在 944 秒的观察期间仍未得到答复；然后网关在 947.5 秒处记录 `ready`。停止该实例最终需要 systemd 现有的 5 分 30 秒停止限制。这些是对一种合成装置的测量，而不是预期的启动预算。

第二个未经检测的 480 代理控制首先通过了签名网关握手、服务构建和运行状况 RPC 检查，然后失去了 HTTP 响应能力而没有任何更新。 25分钟后准备控制完成；抽样失败持续了 24 分钟，最后一次 3 分钟的服务检查也失败了。原来的 PID 和安装仍然保留。共享模式 17，模式 19 处的所有 481 个物理代理数据库，配置字节保持不变；捕获的国家维护租约是空的。

主线程消耗了近1个CPU核心。日志显示现有的计划审查尝试、整个队列的完整性检查以及内存插件启动清理错误。这重现了已发布的网关组 preparation/background 维护可用性问题，与更新无关。其确切的 JavaScript 热循环仍未分析，并且原始失败的更新运行缺乏排除其他状态或恢复缺陷所需的实时状态证据。保留的包、PID 或 `serviceRestartSafe: true` 无法确定以前的网关正在提供服务。参见[的调查](https://github.com/openclaw/openclaw/issues/151295)。

在恢复之前，请保留更新报告和 [ 已验证的备份 ](/install/updating/rollback-and-recovery#before-updating-create-a-verified-backup)。保持相同的服务帐户、配置文件、包管理器和安装前缀。在手动更换之前，让该安装的所有者停止网关和其他编写器。当安装的更新程序无法完成时，请使用 [ 手动包管理器过程 ](/install/updating/update-methods#alternative-manual-npm-pnpm-or-bun) 以及与保留状态兼容的确切目标，然后在启动其网关之前运行目标的 `openclaw doctor --fix`。如果保留的二进制文件无法读取当前状态，请按照[备份恢复](/install/updating/rollback-and-recovery#downgrade)；更改架构标记或删除租赁行不会反转迁移。

通过经过身份验证的网关 RPC 验证实际服务的 version/build，并在声明恢复或删除备份之前检查 `/readyz`。简单启动控制未验证这些恢复步骤或确定重新启动相同的 2026.9.4 队列可以解决更新失败的情况。

## <a id="headless-nodes-waiting-on-2026.9.6"></a><a id="headless-nodes-waiting-on-2026-9-6"></a> 等待 2026.9.6 的无头节点

使用默认插件运行已发布的 2026.9.6 的无头节点会准备自动更新，但从不激活它。即使没有运行命令，其日志也会显示 `node auto-update <version> is ready; waiting for active work to finish`。该版本的捆绑文件传输插件不会报告其空闲状态，并且运行节点在加载任何新代码之前做出空闲决定，因此更高版本无法自动修复此问题。

通过正常工作流程更新节点一次，然后重新启动它：

```bash
openclaw update
openclaw node restart
```

对于前台节点，停止 `openclaw node run` 并重新启动它。后续版本将文件传输命令报告为在调用之间处于空闲状态，因此后续自动节点更新会正常激活。

## <a id="plugin-repair-warnings"></a> 插件修复警告

`post-update-plugins` / `plugin-convergence` 和 `post-plugin-doctor-execution-failed` 可以描述软件包安装后出现 Doctor child 故障。更新了收敛记录，将执行失败作为警告，保留其退出原因和可用的插件诊断，并继续配置验证、准备情况检查和网关激活。即使更新成功，`openclaw update status` 也会显示警告。后来的故障报告将其保留在单独的 **Warnings** 部分中。

抛出插件配置修复钩子使该插件的输入保持不变，并在警告中命名该插件。修复插件，然后运行 ​​`openclaw doctor --fix` 或 `openclaw update repair`。实时或未经验证的网关以及显式的状态迁移或配置写入拒绝仍然处于阻塞状态。无法确认关闭的 Doctor child 也是如此：它可能仍会写入状态。重试之前，请保留备份并解决特定的拒绝问题。

Doctor 的配置插件修复和有效负载验证警告不会阻止网关准备就绪。有效负载不可用的跟踪插件将被标记为不可用，并且其配置和待处理的迁移输入将保留。这包括更新期间的主机链接修复故障。 `openclaw update status --json` 列出待处理的插件迁移警告，Doctor 报告受影响的插件和修复命令。运行 `openclaw update repair`，然后运行 ​​`openclaw doctor --fix` 以在恢复对插件源的访问后重试。

缺少配置的 `plugins.load.paths` 是可用性警告。更新仍在继续，网关可以准备好可用的插件。更新报告和 Doctor lint 识别出 `configured-plugin-path-unavailable` 不可用的路径。权限、I/O 和其他文件系统检查失败使用不同的 `configured-plugin-path-inspection-failed` 警告以及原始错误代码和消息。对于权限错误，修复报告路径的权限，然后运行`openclaw doctor --fix`；对于其他故障，请首先解决报告的文件系统问题。这两个警告都会保留未经检查的配置并让更新继续。

加载路径可以包含多个插件或覆盖捆绑的插件，因此发现无法推断哪些设置属于其缺失的有效负载。 Doctor 保留未经检查的插件设置、通道设置、模型选择和加载路径条目，而不是将它们视为过时或应用其他插件的修复。恢复路径或更正其 `plugins.load.paths` 条目，然后运行 ​​`openclaw doctor --fix` 恢复检查和修复。其他发现错误保留其现有的诊断。

通过 ClawHub 安装的官方版本绑定运行时插件使用其声明的 ClawHub 源来发布新的核心版本。已发布的 2026.9.4 目录省略了 Codex 的来源；修正主要在 [#148518](https://github.com/openclaw/openclaw/pull/148518) 中。

### <a id="missing-temporary-plugin-captures"></a> 缺少临时插件捕获

即使已安装的插件文件仍然存在，包含 `openclaw-plugin-build-` 的 `ENOENT` 路径也可以识别丢失的运行时源捕获。重新加载或替换该插件会将不可用的恢复快照报告为警告，并在正常清理后加载已安装的替换插件。运行 `openclaw plugins reload <id>`，或者如果已安装的有效负载也需要修复，则重新安装该插件。如果替换失败，则无法恢复之前丢失的代码；健康的插件保留其可用的恢复快照。

旧版本在尝试复制相同的丢失捕获时可能会拒绝启用、卸载和重新安装。在重试之前通过其服务所有者重新启动网关，或升级主机。请参阅 [ 插件源生命周期 ](/plugins/architecture#runtime-instance-and-source-lifetime)。

### <a id="database-snapshots-under-continuous-writes"></a> 连续写入下的数据库快照

较早的更新者可能会报告数据库“在 10 次尝试后不稳定，而网关仍在继续写入”。当前更新架构检查和演练使用一致的 SQLite 在线备份。排练进度在更新分类帐中记录复制的页面、字节和经过的时间。

这无法改造已安装的 2026.9.5 驱动程序。对于该跃点，通过服务所有者停止服务，从单独的终端运行 `openclaw update`，然后启动服务。在 Linux 用户服务上，使用 `systemctl --user stop openclaw-gateway.service` 停止它。如果服务关闭本身挂起，请将其视为单独的关闭问题；不要启动第二个更新程序。

### <a id="snapshot-parse-errors-from-2026.9.5-and-2026.9.6"></a><a id="snapshot-parse-errors-from-2026-9-5-and-2026-9-6"></a> Snapshot 解析来自 2026.9.5 和 2026.9.6 的错误

从 2026.9.5 或 2026.9.6 开始的更新可能会停止并显示 `Update state snapshot failed (exit): Assigning to rvalue (308:4)` 等消息。安装的更新程序无法解析在插件依赖项中分配给 `import.meta.url` 的有效 JavaScript，例如 `@jsquash/png` 或 `@jsquash/avif`。该修复位于目标版本中，但安装的更新程序在目标启动之前运行此检查。禁用此更新的插件：

```bash
openclaw plugins disable <id>
openclaw update
openclaw plugins enable <id>
```

从固定版本开始的更新会正常检查这些插件。

2026.9.5 更新程序还可以报告 ESM 插件的 `Cannot use 'import.meta' outside a module`，包括使用 `import.meta.dir` 的捆绑包。使用相同的临时 disable/update/enable 序列：新候选者无法替换已在已安装更新程序中运行的解析器。版本 2026.9.6 承认保留了 `import.meta` 语法。当前快照清单还将无法解析的条目记录为命名插件警告，而不是中止快照。

### <a id="snapshot-cleanup-could-not-be-confirmed"></a> 无法确认快照清理

当为候选快照启动的插件工作未及时完成时，更新可能会停止并显示 `Update snapshot cleanup could not be confirmed`（原因为 `candidate-snapshot-failed`）。安装的更新程序运行此步骤，因此重试相同的更新会重复该步骤，并且 `openclaw update repair` 无法完成从未完成的快照。在网关停止的情况下手动安装一次目标（[手动npm、pnpm或bun](/install/updating/update-methods#alternative-manual-npm-pnpm-or-bun)），然后运行`openclaw doctor --fix`并启动网关。报告时请包括 `openclaw update status --json`（以及嵌套的 `cause`）。

### <a id="large-model-catalog-temporary-directories"></a> 大型模型目录临时目录

较旧的版本可以在 `openclaw-model-catalog-*` 目录中保留多个完整的插件副本。仅扫描顶级 `openclaw-plugin-build-*` 路径会丢失这些嵌套副本。当前的目录工作人员重用所选的运行时捕获来进行提供程序发现，并在其所有者退休时删除其临时树。

升级主机，然后运行 ​​`openclaw doctor` 以检查旧捕获。在 Linux 和 macOS 上，`openclaw doctor --fix` 仅在维护期间当没有其他 OpenClaw 进程正在运行时删除整个旧目录树。不要根据捕获的时间或不存在于打开文件或内存映射列表中来删除捕获：闲置的所有者仍然可能需要它们。现代捕获使用 SQLite 托管来证明退休。请参阅 [ 插件源生命周期 ](/plugins/architecture#runtime-instance-and-source-lifetime)。

运行 `node dist/index.js` 的不相关的 Node 服务不算作 OpenClaw 所有者。 Doctor 根据其安装的包标识解析通用入口点并遵循 OpenClaw 服务标记。如果无法对实时 PID 进行分类，Doctor 会保留 PID 的捕获和报告以及检查失败（包括丢失或无法读取的包裹清单）；这仍然是维护警告并且不会使更新失败。解决报告的检查问题后重试 `openclaw doctor --fix`。在 macOS 上，来自另一个 UID 拥有的进程的不可读参数不会阻止清理； Doctor 在调试级别记录一次排除。来自同一 UID 或未知 UID 的不可读参数仍保留旧捕获。 Doctor 还保留了另一个 UID 拥有的遗留捕获根，包括特权运行中的根。托管本机捕获使用其记录的保管和安装索引引用，而不是主机进程普查，就像在启动清理期间所做的那样。 Windows 主机范围的遗留捕获清理仍然仅报告。

## <a id="reason-codes"></a> 原因代码

- `dirty`、`no-upstream`：在重试之前修复源签出。
- `runtime-artifact-publication`：受影响的网关正在运行或无法离线验证。检查 `openclaw gateway status --deep`，通过其服务所有者停止它，然后重试。在macOS上，加载的LaunchAgent即使在禁用且暂时没有PID的情况下也可以重生； `openclaw gateway stop` 卸载它。
- `update-ledger-busy`：另一个进程持有的状态数据库的写入锁超出了更新步骤预算。该命令成功退出，但未承认运行，并且完整保留了之前的历史记录。网关写入稳定后重试。更新命令的 JSON 输出包含延迟注释； `openclaw update status --json` 显示之前记录的运行。如果延迟核心更新后所需的最终确定，则其子级退出非零，因此现有父级不会将其误认为是已完成的插件收敛。更新后的网关记录跳过原因，不重启；重试更新会再次运行终结，包括当核心已经是最新版本时。
- `plugin-target-unavailable`：启用的已配置 npm 插件没有所选核心的可解析目标，或者无法读取其注册表元数据。在服务网关停止或核心包更改之前，拒绝会识别插件、包目标和注册表错误。发布或注册表恢复后重试，使用 `openclaw update --tag <older-version>`，或禁用受影响的插件并重试。如果核心版本未知，请选择准确的注册表版本。延长稳定拒绝 `--tag`；稍后重试或明确切换频道。 `--dry-run` 执行相同的可用性检查。
- `preflight-insufficient-space`：包含预检暂存（POSIX 上的签出 `.artifacts` 区域）和包管理器存储的文件系统上有可用空间，然后重试。更新程序在确认的 ENOSPC 上停止，而不是尝试较旧的提交；它不会删除共享的包管理器存储。请参阅 [Git 结账流程 ](/cli/update#git-checkout-flow) 了解暂存位置和较旧的已发布更新程序限制。
- `deps-install-failed`、`build-failed`、`ui-build-failed`：检查失败的步骤，修复依赖项或构建错误，然后重试。
- `global-install-failed`：包管理器安装、暂存、验证或启动器交换退出非零。然后更新程序尝试回滚。生成的报告的 `Rollback outcome` 行和 `openclaw update status` 记录先前的安装是否已恢复并且可以安全地重新启动。 `openclaw gateway status --deep` 显示正在服务的内容；在假设之前的版本运行之前确认两者。当前的故障报告保留经过清理的 npm 错误行和代码，同时编辑命令和专用路径。失败步骤的有界 stderr 尾部保存在持久运行记录中以及状态目录中 `logs/support/` 下保存的更新失败上下文中。有两个原因属于已发布的 2026.9.3 和 2026.9.4 更新程序，并且更高版本无法挽救已安装的更新程序：在 macOS、`Package rollback launcher backup changed` 上，当更新程序的 umask 与已安装的启动程序的权限不同时，以及在繁忙的主机或慢速磁盘上，30 秒基准程序包指纹超时报告为已更改的程序包树。使用相同的已安装更新程序重试会重复这些过程。使用 [ 手动包管理器过程 ](/install/updating/update-methods#alternative-manual-npm-pnpm-or-bun) 安装一次目标，运行 `openclaw doctor --fix`，然后重新启动网关。此手动安装会绕过已安装的更新程序一次。尚未发布的版本包含这两个修复：仅在安装 2026.9.4 之后的包含 [#145282](https://github.com/openclaw/openclaw/pull/145282) 和 [#144758](https://github.com/openclaw/openclaw/pull/144758) 的版本后，`openclaw update` 才运行修复的更新程序。其他原因显示包管理器的错误：`EACCES`、`EPERM` 或前缀不匹配意味着全局前缀是自定义的或调用用户不可写；修复所有权和权限，然后重试。如果软件包安装不完整，请重新运行 [installer](/install/installer)。
- `ETARGET`、`E404` 或 `EINTEGRITY` 在 `package-install` 期间：报告命名 npm 错误代码和 npm 提供注册表规范时的依赖项。当前更新程序使用 npm 的 `--prefer-online` 或 Bun 的 `--no-cache` 重试一次命名依赖项失败（pnpm 没有等效的强制元数据刷新）；成功的重试会记录陈旧缓存修复警告。不可用的 OpenClaw 目标将留给目标解析。如果 `ETARGET` 或 `E404` 仍然存在，请运行 `npm cache verify`，检查配置的注册表或镜像，并在重试之前使用报告的规范运行 `npm view <spec> version`。候选人无法修复旧安装的更新程序中的此行为；使用 [ 手动安装程序 ](/install/updating/update-methods#alternative-manual-npm-pnpm-or-bun) 一次来获取修复的更新程序。
- 从 2026.9.4 更新时，`runtime-verification-failed` 在 `candidate gateway canary` 处接近 300 秒：安装的更新程序在快照和候选检查中共享该截止日期，即使 `--timeout` 更大。故障持续时间不仅仅是网关启动时间。使用相同的 [ 手动包管理器过程 ](/install/updating/update-methods#alternative-manual-npm-pnpm-or-bun)，然后运行 ​​`openclaw doctor --fix` 并重新启动网关。请参见 [#144858](https://github.com/openclaw/openclaw/issues/144858) 和 [#154381](https://github.com/openclaw/openclaw/issues/154381)。
- `Plugin dependency <name> is unresolvable inside the temporary update copy`：仅在排练目录上方发现未声明的可选包。更新检查会忽略该祖先包并继续显示警告；声明的依赖项和转义副本的链接仍然无法遏制。在同一版本的两个相同候选 Doctor 失败后，自动更新会暂停，然后开始另一次排练。使用 `openclaw update status --json` 检查记录的故障，修复其原因，然后运行 ​​`openclaw update` 重试。新的候选版本也消除了这种停顿。
- `doctor-failed`：在网关主机上运行 `openclaw doctor`，解决其结果，然后重试。有关检查列表和 `--fix` 行为，请参阅 [Doctor](/cli/doctor)。
- `restart-disabled`、`restart-unavailable`：恢复支持的 Supervisor 或在重试之前启用网关重新启动。
- `restart-unhealthy`、`restart-revision-mismatch`、`restart-revision-unavailable`：在重试之前检查网关服务运行状况及其安装根目录。
- `managed-service-handoff-*`：先检查状态。如果切换停止，请使用网关主机上的 CLI 来保留完整的诊断输出。

未知原因代码仍然可见。重试之前请检查网关日志。

## <a id="retained-legacy-session-history"></a> 保留的旧会话历史记录

当 Doctor 可以验证导入的 SQLite 状态并保留原始内容时，旧版 `sessions.json` 中的无效条目和格式错误的 JSONL 转录本不会导致更新失败。 Doctor 会跳过没有有效会话 ID 的条目，并导入可读的成绩单前缀。它将文件和原因报告为迁移报告和 `openclaw update status --json` 中的警告，包括由无法自行记录 Doctor 警告的旧版本启动的更新。

当插件迁移挂起时，原始文件会保留在原处并带有经过验证的导入收据。重复的 Doctor 修复会保留当前的 ​​SQLite 编辑和删除。插件迁移完成后，损坏的原件保留在受保护的迁移存档中以供手动恢复；更新清理无法将它们作为完全导入的历史记录丢弃。

保留指定的文件和更新前的备份。使用 `openclaw doctor --session-sqlite dry-run --session-sqlite-all-agents --json` 检查它们。请勿覆盖收据装订原件进行修复。更改或新出现的转录本可能包含 SQLite 中不存在的历史记录，但仍处于块就绪状态。检查 `openclaw update status --json`，停止网关，并在重试之前运行 `openclaw doctor --session-sqlite recover --session-sqlite-all-agents`。请参见 [ 会话恢复](/cli/doctor/sqlite-maintenance)。

## <a id="cli-fallback"></a> CLI 后备

在网关主机上运行这些命令，而不是在仅打开 Control UI 的计算机上运行：

```bash
openclaw update status --json
openclaw triage
```

使用 `openclaw update --dry-run` 预览新的尝试。如果安装开始后软件包更新失败，请按照 [Updating](/install/updating#alternative-re-run-the-installer) 中的安装程序恢复步骤进行操作。

如果安装的 CLI 损坏或文件系统无法写入诊断信息，自动分类会报告该故障并保留原始更新错误。修复已安装的命令，然后运行 ​​`openclaw triage`。即使网关无法启动，托管更新也会保留其独立的帮助程序日志；记录的结果指向可用的诊断或失败的收集尝试。重新启动通知总结了诊断结果。保存的工件路径和准确的、特定于安装的恢复命令保留在主机命令输出或托管更新帮助程序日志中，而不是发送到代理或通道的通知中。

如果更新程序在网关停止后崩溃或被终止，则网关将保持停止状态，除非更新程序完成并验证恢复。检查 `openclaw gateway status --deep`，修复报告的依赖项或安装失败，然后重新运行 `openclaw update`。失败的 Git 依赖项安装会在允许自动重新启动之前恢复并重建之前的运行时。验证恢复后重新启动仍会检查已安装的配置、服务所有权和网关运行状况。

## <a id="rollback-boundary"></a> 回滚边界

不要将恢复状态作为对更新失败的第一响应。首先重新安装已知良好的代码，同时保留当前状态。仅当旧代码无法读取当前配置或数据库时，才恢复经过验证的更新前状态快照。请参见 [Rollback](/install/updating#rollback)。

## <a id="support-diagnostics"></a> 支持诊断

收集以下内容，而无需发布凭据、原始配置或未编辑的流程输出：

- OpenClaw 版本和安装类型；
- 从“设置”→“更新”更新时间戳、目标、阶段和原因代码；
- **显示的有界故障详细信息查看详情**；
- `openclaw update status --json`;
- `openclaw gateway status --deep --json`;
- 相关的已编辑网关日志行。
