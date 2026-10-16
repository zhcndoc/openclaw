---
summary: "`plugins uninstall` 删除了什么，`plugins update` 如何解决源、通道、引脚和完整性漂移，以及重新加载已编辑的插件"
title: "卸载和更新插件"
read_when:
  - "您想要删除插件并确切地知道卸载会涉及什么"
  - "您想要更新插件并了解引脚、通道和完整性规则"
  - "您想要重新加载已编辑的插件而不重新启动网关"
---

本页面涵盖删除和更新已安装的插件，以及在不重新启动网关的情况下重新加载已编辑的插件代码。

对于正在运行的网关，普通卸载会等待程序包运行时所有者停止，然后再删除文件。插件更新需要停止网关；他们不会与跑步的老板一起写作。如果没有正在运行的网关，这些命令将保存更改以供下次启动使用。有关安装源和网关主机路径要求，请参阅 [Install plugins](/cli/plugins/install#install)。

如果网关因另一个操作仍在运行而拒绝生命周期请求，则 CLI 在现有请求超时内尊重其重试延迟。连接失败和突变启动后的失败仍然会停止该命令。

## <a id="uninstall"></a> 卸载

```bash
openclaw plugins uninstall <ids...>
openclaw plugins uninstall <ids...> --dry-run
openclaw plugins uninstall <ids...> --keep-files
openclaw plugins uninstall <ids...> --force
```

`uninstall` 从 `plugins.entries`、持久插件索引、插件 allow/deny 列表条目以及精确解析为记录的安装路径的任何 `plugins.load.paths` 条目中删除插件设置。它只为每个删除的插件 ID 留下精确的 `enabled: false` 条目。此标记记录显式卸载选择，以便剩余的模型、提供商或渠道选择不会在启动修复期间自动重新安装软件包。重新安装不会默默地重新启用它；再次启用插件会替换标记。对于具有多个子条目的包，任何子 ID 都会解析为包所有者； uninstall 会删除每个同级的策略和 slot/channel 引用、一个软件包安装记录以及托管目录一次。链接路径安装还会删除其记录的源路径的确切条目。保留父目录、子路径、前缀匹配和不相关的加载路径。除非设置了 `--keep-files`，否则卸载还会删除跟踪的托管安装目录，但前提是它在 OpenClaw 的插件扩展根目录中解析。如果插件当前拥有 `memory` 或 `contextEngine` 插槽，则该插槽将重置为其默认值（`memory-core` 用于内存，`legacy` 用于上下文引擎）。

插件条目和 allow/deny 清理使用不区分大小写的策略 ID。混合大小写的清单 ID 会留下一个小写禁用标记，不会与具有不同拼写的条目发生冲突。软件包安装记录保留其确切所有者 ID。

匹配的加载路径引用在包文件之前被删除，因此符号链接别名不能留下无效的配置。对于正在运行的网关，运行时耗尽也会先于删除安装记录，包括 `--keep-files` 或链接安装。如果运行时耗尽或文件删除失败，插件将保持禁用状态并被跟踪，以便您可以重试卸载。

如果在运行时耗尽时再次添加匹配的加载路径引用，则卸载会保留文件并要求您在重试之前删除该引用。配置写入通过 OpenClaw 等待文件清理完成，包括写入共享配置包含。 Cleanup 在每次删除之前都会重新检查其权限，如果操作被撤销，则 Cleanup 会停止。

`uninstall` 会打印将要移除内容的预览。多条目包会在提示前列出包所有者和所有受影响的子条目。传入 `--force` 可跳过确认提示（适用于脚本和非交互式运行）；不传入时，卸载要求交互式 TTY。`--dry-run` 会打印相同的预览，并在不提示或更改任何内容的情况下退出。

当提供多个 ID 时，卸载会在删除任何内容之前解析整个选择。同一包的重复 ID 和子项选择该包一次。包按照首先请求的顺序进行处理，每个包都有单独的预览和确认。取消或失败会导致剩余的移除停止；早期成功的删除仍将继续。在删除任何包之前，无效目标会拒绝选择。

如果跟踪的软件包没有发现的插件条目，则卸载可以删除其确切的安装记录和同一所有者策略，包括没有其他发现的插件声明的所有者密钥通道配置。仅当没有其他安装记录共享其包路径并且没有发现的插件与其 ID 或记录的路径匹配时，才允许进行此恢复。无关政策保持不变。注册表刷新重建发现元数据；它不会删除这些孤立的安装记录。

在不更改包文件、配置或已安装索引的情况下，发现的所有权缺失、不明确或冲突的包仍会被拒绝。运行 `openclaw plugins registry --refresh`，检查 `openclaw plugins doctor`，并使用 `openclaw doctor --fix` 来修复可修复的旧索引状态。如果所有权仍然不明确，请在重试更新或卸载之前重新安装该软件包。

<Note>
`--keep-config` 作为已弃用的 `--keep-files` 别名仍受支持。
</Note>

## <a id="update"></a> 更新

```bash
openclaw plugins update <ids-or-npm-specs...>
openclaw plugins update --all
openclaw plugins update <ids-or-npm-specs...> --dry-run
openclaw plugins update @openclaw/voice-call
openclaw plugins update @acme/demo
openclaw plugins update openclaw-codex-app-server --acknowledge-install-policy-warning
```

更新会应用于托管插件索引中已跟踪的插件安装，以及共享 SQLite 状态中已跟踪的 hook-pack 安装。它们会复用用户在安装插件时已经选择的源，因此不需要第二次来源确认。

当记录的选择器是裸露的、`latest` 或较旧的 OpenClaw 版本时，合格的官方 OpenClaw npm 插件会遵循正在运行的主机的版本队列。这适用于命名更新和 `--all`，因此恢复过时的插件使用与 `openclaw update` 和 `openclaw update repair` 相同的目标。当前命令中提供的显式版本或标签仍然优先。

提供多个 ID 或 npm 规格来更新选择，或使用不带 ID 的 `--all`。重复的目标和同级插件 ID 更新其包一次。显式的 npm 规范会覆盖同一包的 ID-only 选择；一个包的两个不同的显式规格将被拒绝。未知目标和冲突选择在更新开始之前失败，包括 `--dry-run`。现有的批量更新程序处理插件包，然后挂钩包，在另一个包失败时保留成功的更新，并保存更改以供下一次网关启动。更新之前通过其服务所有者停止网关。

在激活替换之前，插件更新会通过正常的备份配置编写器应用其 Doctor 配置修复。这会保留之前配置的 Webhook 端点等设置。重试已经是最新的包也会完成挂起的仅配置修复。替换安装 （`plugins install --force`） 使用相同的维修所有者。如果所需的 Doctor 工件无法加载或记录的数据迁移仍需要维护，则该命令在激活之前会失败并指定修复以完成。重试之前请遵循报告的修复指南；数据迁移需要 `openclaw doctor --fix`。禁用的插件保留其待处理的输入而不运行状态迁移；不相关的待处理迁移仍然保留。

当配置回滚未确认时，恢复会保留已发布的包生成。该命令报告失败，但不声明运行时激活。

如果更新完成失败，错误会首先报告原始原因，并保留任何回滚失败作为附加诊断上下文。失败的回滚仍然可以重试；清理期间不会再次应用成功提交或回滚的安装。

在源安装中，使用主机构建的选定插件将保持使用状态。命名更新、`--all` 和 stable/beta 核心更新报告注册表副本未被接纳的原因并保持其休眠安装记录不变。包所有权检查仍然适用于正在更新的插件；显式插件路径保留其选择优先级。

在 `openclaw update` 期间，即使 OpenClaw 捆绑相同的插件 ID，具有显式加载路径的本地链接插件也会保持其选择。更新将保留的插件和路径报告为警告；从源头更新该插件。链接路径记录被排除在包更新所有权协调之外，因此过时的包元数据不会将链接保留变成更新失败。

`update --all` 报告并跳过孤立的路径源安装记录，以便剩余的插件可以更新。当不再需要文件时，使用 `openclaw plugins uninstall <id>` 删除孤立记录。

通过 `plugins.load.paths` 选择的插件由操作员管理。命名更新和 `update --all` 报告 `plugin-operator-managed` 警告并跳过它，以便其余插件可以更新；所选副本及其影子的任何安装记录保持不变。在源处更新该副本，或从 `plugins.load.paths` 中删除其路径以再次使用托管安装。

<AccordionGroup>
  <Accordion id="resolving-plugin-id-vs-npm-spec" title="解析插件 ID 与 npm 规范">
    当您传递插件 ID 时，OpenClaw 从其记录的安装源开始。对于多条目包，子 ID 解析为其包所有者并一起更新每个同级包。如果新的软件包版本删除或重命名子项，OpenClaw 将删除已停用的子项条目、allow/deny 策略、确切的子项加载路径、通道配置和 memory/context 插槽选择，同时保留 retained/new 子项和不相关的插件。存储的 dist 标签（例如 `@beta`）保留其选定的发布系列。

    唯一的狭义例外是：受信任的官方包正在完成目录声明的插件 id 替换。此更新会从目录中的包选择器开始，因此重命名后的清单可以替换旧版 id。

    已验证的 OpenClaw- 拥有的 npm 和官方 ClawHub 插件在其记录的确切 OpenClaw 版本不更新于核心并且其目录源遵循默认版本行时恢复自动更新。该更新使用现有的通道和兼容性规则，保留记录的注册表，并仅在成功安装或未更改的工件验证后才保存默认选择器。对于 npm 安装，当现有版本和记录的工件标识已与目标匹配时，恢复可以保存默认选择器，而无需下载或重新安装。

    当前命令中提供的显式 npm 版本或标签仍然具有权威性。较新的发布引脚、独立版本控制包、第三方包、本地、Git、市场和自定义 ClawHub 源保留其现有选择器。当符合资格的官方 npm 软件包接收恢复时，npm 注册表镜像将保持使用状态。如果保留的引脚有更新的可用版本，OpenClaw 将打印显式替换命令。 ClawHub 选择器替换使用 `plugins install clawhub:<package> --force`，因为 `plugins update` 仅接受 npm 记录的显式选择器覆盖。

    较旧的官方插件同步可以在无需用户请求的情况下保存确切的版本。这些记录不区分自动引脚和手动引脚，因此合格的较旧 OpenClaw 发布引脚在这两种情况下都会恢复自动更新。相同的恢复适用于目标更新 `--all`、`openclaw update` 和 `openclaw update repair`。失败的替换会保留以前的安装记录以供重试。

    对于 npm 安装，你也可以传入带 dist-tag 或精确版本的显式 npm 包 spec。OpenClaw 会将该包名解析回已跟踪的插件记录，更新该已安装插件，并记录新的 npm spec，以便将来基于 id 的更新使用。

    只传入不带版本或标签的 npm 包名也会解析回已跟踪的插件记录。当某个插件曾被锁定到精确版本，而你想把它切回 registry 的默认发布线时，可以使用这种方式。

  </Accordion>
  <Accordion id="beta-channel-updates" title="Beta 频道更新">
    目标 `openclaw plugins update <id-or-npm-spec>` 使用配置的更新通道（如果存在）。否则，公认的官方插件继承OpenClaw的注册表通道。 Bulk `openclaw plugins update --all` 对官方插件使用相同的注册表通道解析器。即使下载的工件具有精确的版本，移动选择器也会保持移动；恢复的 OpenClaw 释放销遵循相同的政策。

    `openclaw update` 从新安装的核心解析插件目标。 Beta 通道上的 npm 更新选择软件包的 `beta` 和 `latest` 版本中较新的版本； ClawHub 默认行更新尝试 `@beta`，并且当该版本不可用时可以回退到记录的 default/latest 选择器。完整性、兼容性、信任、安装策略和功能同意失败不会触发源回退。不可用的插件更新会留下通知，而不会导致其他成功的核心更新失败。通过上述托管 OpenClaw 释放销恢复，显式选择器保留其含义。

  </Accordion>
  <Accordion id="existing-plugin-source-choices" title="现有插件源选择">
    更新保留记录的 npm 或 ClawHub 源。较旧的安装记录无法区分自动 ClawHub 选择和显式 `clawhub:` 请求，因此 OpenClaw 不会默默地将这些记录切换到 npm。要有意更改现有插件，请查看并运行 `openclaw plugins install npm:<package> --force`。图像拥有的捆绑插件的自动外部化首先使用 npm，然后使用其声明的 ClawHub 源。

    版本检查报告来自该记录源的可用兼容更新。 ClawHub 和 npm 可以在不同时间发布，因此报告的目标可能早于核心或最新的 npm 包。更新核心不需要切换注册表。

  </Accordion>
  <Accordion id="version-checks-and-integrity-drift" title="版本检查和完整性漂移">
    在进行实时 npm 更新之前，OpenClaw 会根据 npm 注册表元数据检查已安装的软件包版本。如果安装的版本和记录的工件标识已经与解析的目标匹配，则可以避免下载或重新安装。请求的选择器更改或托管释放销恢复仍然可以更新插件索引，而无需重写 `openclaw.json`。

    当存储的完整性哈希存在并且获取的工件哈希发生更改时，OpenClaw 会将其视为 npm 工件漂移。交互式 `openclaw plugins update` 命令打印预期的和实际的哈希值，并在继续之前要求确认。非交互式更新助手拒绝更新，除非调用者提供明确的继续策略。

  </Accordion>
  <Accordion id="acknowledge-install-policy-warning-on-update" title="--acknowledge-install-policy-warning 更新">
    `plugins update` 使用与安装相同的警告确认，在交互式终端中使用 `type: '<plugin>' to update anyway`。重新评估策略，`block` 或策略失败仍然是最终状态。
  </Accordion>
  <Accordion id="clawhub-security-audit-on-update" title="ClawHub 更新安全审核">
    社区 ClawHub- 支持的插件更新在下载替换包之前运行与安装相同的确切版本信任检查。审核结果以信息形式打印并继续；被阻止的版本仍然不可安装。官方 ClawHub 软件包和捆绑的 OpenClaw 插件源绕过此发布信任检查。
  </Accordion>
</AccordionGroup>

## <a id="reload"></a> 重新加载

```bash
openclaw plugins reload <ids...>
openclaw plugins reload <ids...> --json
openclaw plugins reload <ids...> --wait
```

编辑 TypeScript 源、导入的帮助程序或清单后重新加载发现的插件，包括通过 `plugins.load.paths` 选择的插件。该命令需要一个正在运行的网关，并等待替换完成而不重新启动它。配置的启用将被保留，未更改的插件将保留其运行时实例。 JSON 输出包括 `pluginIds`、`restartRequired` 以及应用的运行时收据及其生成和源摘要（如果可用）。收据的 `selectedEntries` 命名加载程序选择的文件。 CLI 和工具输出提醒您在编辑其源代码后重建编译输出；重新加载不会运行构建。多个 ID 使用一个网关重新加载请求和一个应用的运行时生成。重复的 ID 会被折叠，网关会一起解析同级包。该请求最多支持 64 个不同的 ID。

繁忙的插件允许替换并隔离旧实例上新保留的工作。现有代理运行保留其原始回调，而新运行则等待替换。在停止服务或频道之前，替换会等待最多 60 秒以完成保留的工作和通话中的呼叫。详细的准备情况和网关日志显示排队的工作计数和截止日期；该命令等待最终应用的收据。成功发布会发出 `plugins.changed` 并记录所应用的替换。如果工作量超出预算，重载失败一次，上一代恢复服务；未完成的运行不会被强制处理。该工作完成后重试 `openclaw plugins reload <id>`，或使用 `openclaw plugins reload <id> --wait` 等待，而没有承认工作的截止日期。

`--wait` 将新运行保持在同一更换门后面。按Ctrl+C取消等待；断开其网关请求也会取消它。在发布之前，取消会在恢复成功时恢复上一代，而不取消已承认的运行。一旦发布提交，取消并不会撤消它。服务关闭、资源清理和恢复保持现有的期限。详细的准备情况公开了待重新加载；显式等待没有耗尽期限。传入消息保留其通道的现有队列和重播契约；此选项不会为缺乏该选项的通道添加持久入口。在本身持有目标插件的回合之外运行此维护命令：在等待重新加载时等待该回合无法取得进展。代理可以将 `plugins` 工具与 `action: "reloadAndResume"` 和 `pluginId` 结合使用。这种显式切换结束了活动回合（而不是对话），让正常清理释放其插件租约，然后运行普通授权重新加载并用结果唤醒相同的会话，包括失败和清理警告。它需要网关托管的对话并提供轮流支持。停止取消待处理的切换；它从不强制释放租约或回滚已提交的重新加载。切换是进程本地的：如果网关在交付之前退出，请在重试之前检查插件状态。普通 CLI 重新加载不会被拦截或推迟。

替换需要在其后继者获取这些资源之前完成先前注册的资源清理。失败的清理可以阻止替换和自动恢复；在重试之前检查报告的失败。收据还可以包含清理警告。模块和本机库在其注册被删除后可能仍会保持加载状态。

捆绑的插件可以重新加载，同时保留其启用或禁用的策略。即使源更新后仍保留休眠注册表安装记录，也会在选定的捆绑副本后重新加载；该记录保持不变。捆绑插件（包括 TypeScript 源条目）在注册重新加载时重用其进程加载的代码。如果插件的文件在其原始模块保持加载的情况下发生了更改，结果会报告 `restartRequired: true` 并带有警告，并且 CLI 和工具输出会解释需要重新启动网关才能加载编辑后的代码。重新加载不会重建捆绑的代码。当安装加载编译输出时，在重新启动之前重建。更换后，外部捕获源返回 `restartRequired: false`。重新加载未更改的捆绑文件也会返回 `restartRequired: false`；无需重新启动网关即可更换通道和服务注册。重新加载已发现的源不会创建安装记录或授予安装、替换或删除其文件的权限。

Reload 还适用于外部管理的配置 （`OPENCLAW_CONFIG_READONLY=1`） 和 Nix 模式 （`OPENCLAW_NIX_MODE=1`），包括由 `$include` 组成的配置。它保留配置和安装状态。如果更改的功能需要新的同意，请在重新加载之前通过部署所有者记录该接受情况。

更改的声明功能可能需要再次审查。交互式文本输出提示同意； `--json` 从不提示。仅在检查更改后才使用 `--accept-capabilities`，包括与 `--json` 组合时。如果准备失败，错误会报告是否已发布替换内容。发布后的失败可以让新一代保持活跃；在重试之前检查报告的状态。
