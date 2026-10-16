---
summary: "切换安装类型、源服务器脚本、重新运行安装程序以及手动 npm/pnpm/bun 更新"
read_when:
  - "您想要在包管理器和 git checkout 之间切换安装"
  - "您直接从服务器上的 git checkout 运行网关"
  - "您需要使用npm、pnpm或bun直接更新或恢复OpenClaw"
title: "其他更新方法"
sidebarTitle: "更新方法"
---

安装类型切换、源服务器参考脚本、安装程序和手动包管理器更新。 [Updating](/install/updating) 指南的一部分。

## <a id="switch-between-npm-and-git-installs"></a> 在 npm 和 git 安装之间切换

安装人员驱动的开关在工作所有者退休之前验证更换情况。源包装器以原子方式发布； Same-path npm shim 转换使用经过身份检查的备份，该备份会在失败时恢复，因此失败的候选者会使先前的命令保持可运行状态。在淘汰旧的源包装器之前，更新程序会重新检查其身份和内容，并确认它仍然拥有更新。 `openclaw update` 命令仅在核心后收敛和请求的重新启动运行状况检查成功后才打印其最终成功结果。

候选验证失败后，旧网关将继续服务。激活后，仅当共享和受影响的预先存在的每代理数据库架构版本未更改且配置自候选人激活 Doctor pass 以来未更改时，包恢复才能恢复保留的先前包。候选人首先创建的数据库仅在该数据库类型的受支持架构版本上是中立的。恢复的网关必须通过相同的运行时检查才能报告恢复已完成。架构迁移可防止包自动回滚；替换代码无法撤消迁移的状态。不完整的文件回滚会保留其备份以供检查。参见[自动回滚](/install/updating#automatic-schema-neutral-rollback)。如果较旧的目标不支持保留服务定义，自动恢复将停止并报告错误，而不会使用较弱的选项重试。修复报告的故障，重新运行`openclaw update`，并检查`openclaw gateway status --deep`。请参阅 [ 更新恢复失败 ](/gateway/restart-recovery#recovery-after-a-failed-update)。

在 macOS 上，如果 Doctor 在更新中断后报告已安装但已卸载且禁用的网关 LaunchAgent，请先完成更新验证或 Doctor 和分类。然后使用打印的 `openclaw gateway start` 命令，保留其配置文件和 state/config 或自定义标签覆盖。 `doctor --fix` 诊断禁用的标签，但使已停止的网关保持停止状态。

使用频道更改安装类型。更新程序将您的状态、配置、凭据和工作区保存在 `~/.openclaw` 中；它仅更改安装 CLI 和网关使用的 OpenClaw 代码。

```bash
# npm package install -> editable git checkout
openclaw update --channel dev

# git checkout -> npm package install
openclaw update --channel stable
```

先预览安装模式切换：

```bash
openclaw update --channel dev --dry-run
openclaw update --channel stable --dry-run
```

`dev` 创建或重用 git checkout，构建它，并从该 checkout 安装全局 CLI。 `stable`、`extended-stable` 和 `beta` 频道使用软件包安装。扩展稳定版在 git checkout 时被拒绝，而无需对其进行变异或转换。如果网关已安装，则 `openclaw update` 会刷新服务元数据并重新启动它，除非您传递 `--no-restart`。

自动包到 Git 的转换当前需要 npm- 拥有的包符号链接。 pnpm 或 Bun- 拥有的安装在停止网关之前拒绝 `--channel dev`；更改该安装的所有者时，请使用 [Git 安装程序](/install/installer)。正常的包到包更新继续使用 pnpm 或 Bun。

Git 更新在临时候选工作树中构建了完整的运行时，包括插件和 Control UI。开发更新通过在构建之前重新确定候选者的基础来保留本地提交。更新程序在激活期间发布准备好的运行时，而不是在停止时重复构建。它保留构建时间戳，因此普通的 CLI 命令继续使用经过验证的运行时，而无需在移动后重新生成它。候选安装和嵌套构建命令使用私有 pnpm 虚拟存储，因此准备更新无法删除服务网关使用的依赖项。在检查源更改之前恢复候选人的临时工作区设置；实时结帐的工作区设置将被保留。候选命令将合格的 Node 保留在 `PATH` 上的 Node 提供程序中的第一位，同时保留仅启动器的前缀，例如其前面的作用域 pnpm 垫片。当所选的 Node 目录已位于 `PATH` 上时，这也适用；它的包管理器可执行文件不会取代那些作用域启动器。

在激活软件包或 Git 更新之前，更新程序还会检查共享物理安装的可发现的托管网关。在所选网关停止之前，观察到的活动同级会阻止更新；更新程序在发布时再次检查。通过其自己的服务管理器或确切的启动条目停止同级，然后重试。更新程序不会停止或重新启动同级服务。包 `--no-restart` 仍然允许所选服务继续运行，但该例外不包括使用相同文件的其他服务或启动条目。网关的安装更改观察程序仍然可以重新启动它。如果更新 Doctor 维护停止选定的服务，最终确定将恢复匹配的服务并报告维护重新启动，包括 `--no-restart`。如果无法检查其当前身份，则恢复仍悬而未决。这是对观察到的消费者的检查，而不是对新服务启动的锁定；无法进行检查并不能证明该装置没有消费者。已经运行的旧更新程序保留其自己的激活和最终化行为。

对于在不同根处使用自有托管 Bun 网关进行的软件包安装，`openclaw update` 以网关的软件包根为目标，并保持调用 CLI 安装不变。它验证 Bun 1.4.3+ 和 WAL-safe `node:sqlite` 的服务的实际 Bun 可执行文件，并通过服务安装和重新启动保留其记录的运行时 pin。 Bun 的模拟 Node 版本从未与目标的 `engines.node` 要求进行比较。当更新程序在 Node 上运行时，其 Node 还必须在包替换之前通过目标的引擎和 SQLite 检查，因为最终确定在更新程序运行时运行。

Node 服务保留现有路由：可写的拥有定义通常会移动到调用 CLI 安装； Windows、覆盖或不可写的定义和 `--no-restart` 保留服务根路由。所选的 Node 必须满足目标版本的 `engines.node` 要求。有关所有权检查和旧更新程序限制，请参阅 [ 托管服务更新](/install/updating#recommended-openclaw-update)。

## <a id="source-checkout-servers-(reference-script)"></a><a id="source-checkout-servers-reference-script"></a> 源码检出服务器（参考脚本）

在手动重建源签出之前，请停止每个网关为其 `dist` 文件提供服务。构建入口点检查可发现的托管网关，包括同级配置文件，并在实时服务共享该输出时拒绝。在 systemd 上，这包括在其主 PID 退出后服务 cgroup 中剩余的进程。在正在运行的网关的代理会话之外使用外部终端。按照报告的 service/profile 停止命令进行重建，然后启动这些相同的服务。对于默认配置文件，请从源签出运行以下命令：

```bash
openclaw gateway stop &&
pnpm build &&
openclaw doctor --fix &&
openclaw gateway start
```

在构建之前停止列出的每个同级，然后再启动每个同级。保留其配置文件和自定义服务覆盖，或使用匹配的本机服务命令。对于列出的 launchd 作业，使用其命名域、作业和加载的 plist 来选择这些控件；仅配置文件名称就可以识别不同的定义。必须使用确切的启动文件指南停止仅启动同级，并通过相同的启动条目重新启动；更新所选服务无法停止该同级服务。构建成功后才启动服务。如果此签出的内置运行时缺失并且 CLI 无法运行，请在重建之前使用这些本机控件。默认情况下，源运行器 `gateway stop` 和 `gateway restart` 使用现有构建的 CLI，因此恢复不会首先重建。要应用源更改，请使用上面的停止、构建和启动序列。 `openclaw update` 可以应用可用更新，但 `skipped` / `already-current` 不会重建过时的 `dist`；对于这种情况，请使用外部停止、重建和启动顺序。

当安装的网关继续服务时，可以构建具有独立输出的单独候选结帐。该检查观察当前服务；它不会阻止服务在编译期间启动，并且不可用检查不能证明没有网关正在运行。

发现使用已安装的服务定义和调用服务选择器。检查当前 OS 帐户的裸 systemd 模板。不枚举没有安装实例定义或显式选择器的其他活动模板实例。在构建之前使用其本机服务命令停止这些实例。在`system`域中检查发现macOS LaunchDaemons；全局 LaunchAgents 保留在调用用户的 GUI 域中。此观察结果不会授予更新程序对系统 LaunchDaemon 的控制权。

Teams 直接从服务器上的 git checkout 运行网关可以从该 checkout 内部使用 `scripts/update-gateway.sh` 更新它。它是源服务器更新的参考：它拒绝跟踪的本地更改，包括构建输出，并在私有结帐中准备获取的目标。它检查 `main` 是否可以快进，或使用 `--rebase-merges` 重新设置本地服务器分支的基础。依赖项使用冻结的锁定文件进行安装，并且候选版本在服务签出更改之前构建。准备失败会使现有服务继续运行。准备完成后，脚本会停止其选定的服务并检查其他观察到的托管使用者，然后再一起发布源、依赖项和生成的输出。首先通过其自己的服务所有者停止任何共享安装同级；该脚本不会为您停止或重新启动它们。消费者检查发生在第一次源更改之前；它不会在源代码和运行时发布期间锁定新服务的启动。

与 `openclaw update` 一样，该脚本默认构建运行时 JavaScript、插件资源和 Control UI，而不生成 TypeScript 声明。如果此签出还需要插件开发的新声明，则在调用脚本时设置 `OPENCLAW_RUN_NODE_SKIP_DTS_BUILD=0`。

此参考脚本需要 **Corepack** 并在获取之前创建临时垫片而无需全局激活。获取后，它会冻结目标提交并检查其确切的 pnpm 引脚是否可以通过私有检查工作区中的这些垫片运行。检查仅包含包管理器元数据，而不包含目标的依赖项、挂钩或配置。元数据丢失或无效、配置失败或版本不匹配在签出更新或重新启动之前停止；修复目标引脚或安装兼容的 Corepack，然后重试。

相同的获取提交用于快进或变基。单独检查生成的候选 pnpm 引脚，因此本地分支覆盖仍然有效。相同作用域的 shim 目录引导嵌套命令的 `PATH`，并且每个操作都使用自己的工作区和锁定文件根。接受的未跟踪构建输入将复制到候选版本中，并在发布前再次检查。结帐内解析的参考资料遵循候选人的相应文件。真正的外部链接仍然是操作员拥有的引用：检查它们的目标身份，但外部目录内容不会递归冻结。保留的运行时事务目录仍然是恢复材料，并且在重试时被排除在候选构建输入之外。

如果停止服务后发布失败，脚本将恢复并验证以前的 Git 修订版并在重新启动之前保留 dependencies/output。它保留了原来的失败。配置和外部操作员数据在此运行时事务之外。更改源或未经验证的子清理会阻止破坏性恢复；报告保留的路径以供检查。如果重新启动经过验证的新运行时失败，该运行时将保持在原位置，因为新进程可能已经在使用它，并且以前的工件仍然可用于操作员恢复。失败的自动调用也会保留其小范围的 pnpm 启动器目录；仅在所有更新子项停止后才删除报告的目录。当 Corepack 不可用时，托管的 [installers](/install/installer) 还支持 npm- 拥有的临时配置；该服务器脚本故意需要 Corepack。

<Warning>
正在运行的旧更新程序或服务器脚本会保留其旧引导代码，即使它检出包含此修复的文件也是如此。如果该较旧的入口点调用环境 pnpm，则操作员必须在引脚更改的第一次更新之前选择与目标兼容的 pnpm 启动器。在开始更新之前，根据预期目标和已知良好的回滚引用验证该启动器。单独更新目标文件并不能修复较旧的运行二进制文件。
</Warning>

调用旧的三参数构建适配器的已运行源服务器脚本仍然拥有其早期的 Git 和依赖项更改。该兼容性路径保留其仅输出恢复；加载较新的适配器无法将旧 shell 的已完成安装移动到停止边界后面。

已发布的 2026.9.4 源服务器脚本也在最终重新启动之前构建。仅当选定的本地拥有的网关为此结帐的物理 `dist` 提供服务时，候选构建入口点才会识别其现有更新标记。现有的源构建事务在写入之前停止该网关。在解决的构建失败时，它会恢复以前的输出并通过其本机所有者重新启动所选服务，保留其定义并重新检查其绑定。原始构建失败仍然可见；自定义 shell 重新启动命令仅在旧调用方成功构建后运行。单独的候选者结帐或仅兄弟匹配永远不会授予停止其他服务的权限。如果该本机停止部分成功然后失败，候选服务将通过其本机所有者重新验证并重新启动原始服务，而无需运行自定义 shell 命令或启动构建。仍然报告原始停止故障，包括任何无法完成恢复的故障。

对于第一跳，旧脚本仍然拥有一次成功的重启，包括编写的自定义重启命令。其空或仅空白重新启动设置仍然是手动的，并且不会触发自动停止。旧脚本无法接收候选进程的恢复状态：成功构建后，候选进程会解决本机自动启动并在返回之前取消其构建备份。因此，随后的旧脚本重启失败需要操作员恢复；它不会获得较新脚本的保留备份保证。未加入的构建编写器或失败的输出恢复会使网关停止并保留恢复材料。

诸如 `dist`、`dist-runtime` 以及包本地的 `dist` 目录等生成输出根目录必须是真实目录。构建会在读取或修改其内容之前拒绝符号链接根目录， 因此清理操作不会影响链接目标。在更新或构建源码检出目录之前，请将输出根目录符号链接替换为真实目录。

```bash
ssh you@server 'cd /path/to/openclaw && scripts/update-gateway.sh'
```

默认停止命令为 `openclaw gateway stop --force`，因此非交互式 SSH 更新可以停止服务。覆盖自定义服务单元的两个命令：

```bash
OPENCLAW_UPDATE_STOP_CMD='systemctl --user stop openclaw-gateway.service' \
OPENCLAW_UPDATE_RESTART_CMD='systemctl --user restart openclaw-gateway.service' \
  scripts/update-gateway.sh
```

自定义自动命令必须一起提供，并且不能为空。完全空的重新启动命令保留操作员拥有的手动生命周期：在调用脚本之前自行停止网关，然后在解决任何故障后自行重新启动。请勿在此模式下设置停止覆盖。该脚本不执行自动停止、重新启动或构建输出回滚：

```bash
OPENCLAW_UPDATE_RESTART_CMD='' scripts/update-gateway.sh
```

对于普通的单用户源码安装，建议改用 `openclaw update --channel dev` — 它会为你管理检出目录、构建和网关重启。

## <a id="alternative%3A-re-run-the-installer"></a><a id="alternative-re-run-the-installer"></a> 替代方案：重新运行安装器

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

添加 `--no-onboard` 可跳过引导流程。若要强制指定安装类型，请传入 `--install-method git --no-onboard` 或 `--install-method npm --no-onboard`。

如果 npm 软件包替换失败后 `openclaw triage` 无法启动，请重新运行安装程序。它直接运行全局包安装，并且可以恢复部分更新的 npm 安装。修复未经验证的网关时，使其停止。

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
```

可使用 `--version` 将恢复固定到特定版本或 dist-tag：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm --version <version-or-dist-tag>
```

## <a id="homebrew-formula-installs"></a> Homebrew 式安装

对于`brew install openclaw-cli`，通过Homebrew更新：

```bash
brew upgrade openclaw-cli
openclaw gateway restart
```

`openclaw update` 保持公式不变并打印这些命令。现有配置文件保留 `openclaw update status --json` 和更新报告中跳过的结果和指导。在手动升级之前停止正在运行的网关，以避免从已删除的桶中加载文件；重启前先备份并运行`openclaw doctor --fix`。

新的或刷新的服务定义使用 Homebrew 的稳定 `opt/openclaw-cli` 路径。要修复仍指向版本化 `Cellar` 路径的服务，请从升级后的 CLI 运行 `openclaw gateway install --force`。 Homebrew 前缀下的全局 npm 软件包继续使用 npm。

## <a id="alternative%3A-manual-npm%2C-pnpm%2C-or-bun"></a><a id="alternative-manual-npm-pnpm-or-bun"></a> 备选方案：手动使用 npm、pnpm 或 bun

下面的 npm 命令适用于 npm 12 或 npm 11.16+。在 npm 11.15 及更早版本上，省略 `--allow-scripts=openclaw`。

```bash
npm i -g openclaw@latest --allow-scripts=openclaw
```

首选 `openclaw update` 进行受监督安装：它可以与正在运行的网关服务协调包交换。如果您在受监督的安装上手动更新，请先停止托管网关。包管理器就地替换文件，并且正在运行的网关可以尝试在交换中加载核心或插件文件。包管理器完成后，在重新启动网关之前运行 `openclaw doctor --fix`，以便它获取规范配置和迁移状态。检查 `openclaw update status` 是否有未完成的插件升级及其修复命令。正常的 CLI 命令和网关启动不应用延迟插件迁移。

在 Windows 上，已发布的 OpenClaw 2026.9.3 更新程序可以在替换任何文件之前耗尽其固定的 30 秒基准包指纹预算。然后，即使安装的树未更改，它也会报告 `Package rollback verification timed out` 和 `retained package tree changed`。新的候选者无法修复已经运行的更新程序。创建 [ 已验证备份 ](/install/updating/rollback-and-recovery#before-updating-create-a-verified-backup) 后，停止网关并使用其现有的包管理器手动安装目标版本。运行 `openclaw doctor --fix`，使用 `openclaw gateway install --force` 刷新服务，然后启动并验证网关。发布的 OpenClaw 2026.9.5 及更高版本包含基线超时回退。

具有安装替换检测功能的网关还会在其维护标记上检查已安装的版本。如果正在运行的版本和已安装的版本不同，则网关会记录替换，停止接受新工作，并在移交给其服务管理器之前为活动工作提供现有的有界关闭窗口。前台网关退出并带有再次运行 `openclaw gateway run` 的指令。状态和医生在网关排空时报告更换情况。随后，`openclaw gateway status --deep`、`openclaw update status` 和 Doctor 将记录的替换显示为历史信息，直到下一次网关关闭。该记录本身并不能确认新网关是否正常。如果回复的传送模块在发送开始之前消失，则回复仍符合恢复条件，而不是被视为不确定的发送。此恢复无法防止包管理器就地交换期间的每次失败，并且较旧的正在运行的网关无法从安装在其下方的文件中获取它。 `openclaw update` 仍然是协调替换的受支持路径。

发行包包括生成的兼容性文件，用于在支持的升级窗口中从更新程序延迟导入，包括 2026.9.1 服务重新启动路径。这些文件让旧的更新程序在其安装被替换后完成。它们不会保留正在运行的网关的旧模块状态，不会覆盖任意插件导入，也不会在不重新启动的情况下安全地回滚到旧的已发布包。

对于 root 拥有的 Linux 系统全局安装，如果 `openclaw update` 因 `EACCES` 失败，请使用系统 npm 进行恢复，同时保持网关停止以进行手动更换。使用您通常用于该网关的相同配置文件 flags/environment。将 `/usr/bin/npm` 替换为主机上拥有 root 拥有的全局前缀的系统 npm：

下面的 npm 命令遵循相同的版本约定：在 npm 12 或 npm 11.16+ 上使用该标志，并在 npm 11.15 及更早版本上省略该标志。

```bash
openclaw gateway stop
sudo /usr/bin/npm i -g openclaw@latest --allow-scripts=openclaw
openclaw gateway install --force
openclaw gateway restart
```

然后验证：

```bash
openclaw --version
curl -fsS http://127.0.0.1:18789/readyz
openclaw plugins list --json
openclaw gateway status --deep --json
openclaw doctor --lint --json
```

当 `openclaw update` 管理全局 npm 安装时，它首先将目标安装到临时 npm 前缀中。候选包在`preinstall`期间验证主机Node版本； OpenClaw 在将干净的包树交换到真正的全局前缀之前验证打包的 `dist` 库存。待处理的生命周期工作记录在包根目录下的 `.openclaw-lifecycle-pending` 中，位于 `dist` 库存之外。 `postinstall` 完成后删除该标记。如果跳过包脚本，则 CLI 在运行任何命令（包括 `--version`）之前完成挂起的生命周期；失败会停止命令并重新安装指导。更新程序在突变之前检查所属的 npm。在 npm 11.15 及更早版本上，它省略了不受支持的生命周期策略标志。在npm 12和npm 11.16+上，仅批准候选OpenClaw生命周期；传递依赖脚本仍未获得批准。这可以避免 npm 将新包覆盖到旧包的过时文件上。如果安装命令失败，OpenClaw 会使用 `--omit=optional` 重试一次，这有助于无法编译本机可选依赖项的主机。当重试忽略它时，打包的生命周期会恢复匹配的预编译的 fs 安全依赖项。它使用已安装的 fs 安全包声明的版本，并且不运行依赖项构建脚本。修复适用于 Node 和 Bun 并保留任何现有的本机包。有效的本机绑定不需要额外下载。不支持的主机或下载失败会产生警告并允许安装完成；显式禁用文件系统安全本机支持也会跳过此修复。

对于 npm 12 上的本地 tarball 目标，存档文件名和每个父目录必须不含逗号。请参阅 [ 安装程序路径要求 ](/install/installer)。

OpenClaw- 托管的 npm 更新和插件更新命令还会清除子 npm 进程的 npm 的 `min-release-age` 供应链隔离（或较旧的 `before` 配置密钥）。该策略的存在是为了提供一般保护，但明确的 OpenClaw 更新意味着“立即安装所选版本”

```bash
pnpm add -g --allow-build=openclaw openclaw@latest
```

如果 pnpm 11 安装了 OpenClaw 2026.7.1，请运行该手动命令一次。该版本早于 pnpm 11 的独立全局包布局，因此其更新程序可能会将另一个 npm 安装误认为是正在运行的 CLI。更高版本保留 pnpm 所有权并在更新期间遵循替换包根。它们还使用所属管理器报告的全局 bin 目录，并在可用的 pnpm 命令报告另一个全局根目录时，或者当调用包是孤立的或不是唯一活动的 OpenClaw 安装时在突变之前停止。

pnpm 12保留了`global/v11`布局；布局编号不需要与 pnpm CLI 主要版本匹配。新的或修复的网关服务定义使用活动项目哈希链接，因此保存的命令在 pnpm 替换其版本化项目目录后仍然存在。所有权检测还可以识别已指向项目 `.pnpm` 目录内部的命令。分阶段的 pnpm 更新隔离了全球项目及其启动器。 OpenClaw 通过 pnpm 10/11 的 CLI 配置和 pnpm 12 的子进程环境配置来设置暂存 bin，然后在安装前验证两个目标。仍然报告实时目标的管理器会在激活之前停止更新。

如果 OpenClaw 与另一个软件包共享 pnpm 全局安装组，则自动更新程序会在更改组之前停止。手动更新原始的逗号分隔组，以便其同级包和构建策略保持不变。

```bash
bun add -g --trust openclaw@latest
```

`--trust` 允许 OpenClaw 的生命周期脚本。标准 `openclaw update` 路径在拥有安装时应用相同的 OpenClaw-only Bun 信任。对于 Bun- 拥有的更新，程序包管理器在更新托管服务根时检查并安装使用经过验证的服务 Bun。否则，当更新程序在 Bun 下运行时，他们会使用 `process.execPath`，而 PATH 中的裸 `bun` 仅作为最终后备。丢失或不同的 PATH Bun 不会替换显式选择的可执行文件。包管理器所有权检测未更改；将安装定位在 `~/.openclaw` 下并不意味着它属于 Bun-。在 Windows 上，分阶段更新程序在停止网关之前拒绝 Bun 安装，因为它无法重新定位 Bun 的二进制启动器。手动运行`bun add -g --trust openclaw@<resolved-target-version>`，然后运行`openclaw gateway restart`；使用 `openclaw update status` 进行验证。

### <a id="package-lifecycle-and-operator-state"></a> 包生命周期和操作员状态

包生命周期挂钩验证 Node 运行时并仅更新包本地工件：已安装的 `dist` 树和生命周期标记。插件注册表和操作员状态迁移属于Doctor，而不是软件包安装。 Doctor 还删除了真正悬空的全局插件运行时链接，但保留了共享和版本化的运行时缓存以及指向它们的有效链接：其他安装或配置文件可能仍然使用它们。 `openclaw update`安装候选后仍然运行Doctor；手动更换软件包后，请在重新启动网关之前运行 `openclaw doctor --fix`。

在标记的 Windows 2026.9.4 更新期间，程序包生命周期还会要求 Doctor 的只读模式预检在激活之前拒绝不兼容的共享状态升级。它不会迁移操作员状态。独立软件包安装不会运行此遗留更新程序检查。

新的后核心延续在插件收敛之前运行修复 Doctor，包括当较旧的更新程序已经在没有 `--fix` 的情况下运行 Doctor 时。即使配置本身不需要修复，这也会完成挂起的遗留状态。

Doctor 还将漂移的活跃官方 npm 插件引入到已安装的 OpenClaw 版本中，尊重记录的非默认标签和比其插件队列更新的引脚。它使用与 `openclaw update` 相同的插件更新程序，并保持第三方插件不变。不可用的插件会产生警告并说明原因；它不会阻止其他修复的完成。恢复注册表访问或等待丢失的包，然后重新运行 `openclaw doctor --fix`。

`OPENCLAW_DISABLE_BUNDLED_PLUGIN_POSTINSTALL=1` 跳过程序包本地安装后清理，但仍完成生命周期标记。医生迁移仍然启用。

<Warning>
较旧的软件包（包括 `2026.8.1`）可以在安装过程中迁移状态数据库，即使设置了安装后选择退出。升级前备份。要在不更改工作网关的情况下评估受影响的包，请使用具有单独的主目录、配置目录和状态目录的一次性环境。仅使用不同的 npm 前缀并不能隔离操作员状态。
</Warning>

### <a id="stuck-on-2026.9.3"></a><a id="stuck-on-2026-9-3"></a> 卡在2026.9.3上

已发布的 2026.9.3 更新程序具有固定的五分钟限制，可以在升级完成之前停止升级。目标版本中的超时修复无法替换已经运行的更新程序。通过手动软件包安装绕过旧的更新程序一次。

首先创建一个[验证备份](/install/updating/rollback-and-recovery#before-updating-create-a-verified-backup)。保留相同的服务帐户、npm 前缀、配置文件和 state/config 覆盖。在更换软件包之前，通过其所属的管理程序停止网关。对于托管 npm 安装：

```bash
openclaw gateway stop
npm install -g openclaw@latest --allow-scripts=openclaw
openclaw doctor --fix
openclaw gateway restart
openclaw gateway status --deep
```

在 npm 11.15 及更早版本上省略 `--allow-scripts=openclaw`。对于外部监控程序，请使用其停止和重新启动命令。 Doctor 会使已停止的网关保持停止状态，因此请在查看其修复结果后完成重新启动。

在 2026.9.5. 之后添加了自动官方插件漂移修复如果安装的版本仍然打印 **Fix 每个漂移的插件**，请在重新启动之前运行其打印的 `openclaw plugins update` 命令。安装后，具有自动漂移修复功能的版本会在 `doctor --fix` 期间执行这些官方插件更新；任何剩余的就绪警告都会指出仍需要注意的插件。

### <a id="advanced-npm-install-topics"></a> 高级 npm 安装主题

<AccordionGroup>
  <Accordion id="read-only-package-tree" title="只读包树">
    包生命周期完成后，OpenClaw 在运行时将打包的全局安装视为只读，即使全局包目录可由当前用户写入。插件包实时安装在用户配置目录下的 OpenClaw- 拥有的 npm/git 根目录中，并且网关启动不会改变 OpenClaw 包树。

    某些 Linux npm 设置将全局包安装在 root 拥有的目录下，例如 `/usr/lib/node_modules/openclaw`。 OpenClaw 支持该布局，因为插件 install/update 命令在该全局包目录之外写入。

  </Accordion>
  <Accordion id="hardened-systemd-units" title="硬化 systemd 单元">
    授予 OpenClaw 对其 config/state 根的写入权限，以便显式插件安装、插件更新和医生清理可以保留其更改：

    ```ini
    ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
    ```

  </Accordion>
  <Accordion id="disk-space-preflight" title="磁盘空间预检">
    在包更新和显式插件安装之前，OpenClaw 会尽力对目标卷执行磁盘空间检查。空间不足会产生一条带有已检查路径的警告，但不会阻止更新，因为文件系统配额、快照和网络卷可能会在检查后发生变化。实际的包管理器安装和安装后验证仍然具有最终决定权。

    对于包更新，检查在注册表查找和数据库架构验证之前运行。托管更新运行会在更新历史记录中保留警告，因此它也会显示在 Control UI 中。

    在进行替换之前，只读快照检查会测量已知的 SQLite 数据库系列，包括 WAL、SHM 和日志文件。 `openclaw update status --json` 中的非警告诊断条目记录每个系列的大小和现有快照预算：系列总字节的两倍、最大系列的三倍以及元数据的 64 个 MiB。插件副本和注册的外部数据库在暂存后进行完整检查之前仍然未知。

    在现有目标处检查快照空间：`TMPDIR`、状态目录旁边的捕获目录以及系统临时目录。仅当每个目标的已知可用空间低于快照所有者的要求时，更新才会在暂存之前被拒绝，因为无法获取其私有状态副本。数据库大小是临时快照的库存，而不是数据库运行状况或增长警告。成功的检查不需要清理数据库。如果测量失败，更新程序会发出警告，它将在暂存后再次检查。可用的替代方案或未知的自由空间读取本身不会停止更新。已经是当前的包和 Git 目标不需要候选快照。更新程序保留配置副本，而不是全状态备份。

    对于直接 CLI 更新，调用操作员设置的暂存变量（`TMPDIR`、`TMP` 和 `TEMP`）优先于托管服务默认值。例如，`TMPDIR="$HOME/.cache" openclaw update` 首先检查该目录，并在快照容量报告中将其标记为 `explicit-tmpdir`。该服务仍然拥有安装、配置文件、状态和运行时路径选择。此优先修复属于已安装的更新程序，并对其在安装后执行的更新生效；新的候选者无法更改旧的更新者的环境合并。

    此检查在已安装的更新程序中运行；已安装的 2026.9.3 更新程序会为其自己的第一个升级跃点保留其先前的行为。

  </Accordion>
</AccordionGroup>
