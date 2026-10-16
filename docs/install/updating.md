---
summary: "安全地更新 OpenClaw（全局安装或源码安装），以及回滚策略"
read_when:
  - "更新 OpenClaw"
  - "更新后出现问题"
title: "更新"
---

使 OpenClaw 保持最新。

应用程序拥有的包在包根目录的 `openclaw-install-owner.json` 中声明其更新所有者。对于 `owner: "macos-app"`，通过其应用程序更新程序更新 OpenClaw.app，以一起更新捆绑的网关和运行时。 `openclaw update`、`openclaw update repair`和网关更新请求返回标记的更新提示，无需更改包或停止网关；后台检查跳过软件包注册表更新。丢失或无效的标记保留正常安装行为，并针对无效标记发出警告。

对于 [ 独立版本 ](/install/standalone#update-the-complete-artifact)，更新所属桌面应用程序或替换完整的可执行文件和运行时目录。独立的 CLI 拒绝包管理器和 git 更新，并提供可见的下一步；不支持混合来自不同版本的工件。

对于 Docker、Podman 和 Kubernetes 映像替换，请参阅 [ 升级容器映像](/install/docker#upgrading-container-images)。映像入口点在启动网关之前运行 Doctor，如果安装状态无法安全修复则退出。

升级之前，请遵循 [ 预检清单 ](/install/updating/rollback-and-recovery#before-you-upgrade)。在重大更新之前，[ 创建经过验证的备份](#before-updating-create-a-verified-backup)。自动配置副本和迁移恢复原始文件不是全状态备份。

## <a id="update-implementation-contract"></a> 更新执行合约

**更新始终有效**（`openclaw update`在任何地方都尽最大努力）。更新、Doctor、服务生命周期、迁移、插件加载的更改：说明其更新行为。安装的更新程序首先运行，无法修补；候选者修复了标记发送的驱动程序集上的密钥；现有操作符状态 = 输入。可恢复的打嗝→记录警告；变异前备份，让回滚恢复；仅在先前网关保持运行的情况下拒绝指定的数据风险。超时和预算：慷慨，源自测量状态，针对慢速硬件调整大小。证明：已发布的驱动程序 × 候选单元格。

激活后架构验证可保留 Doctor 在删除后保留的代理数据库。这些存储可能会保留较旧的架构而不会导致更新失败；医生保留的警告仍然可见。活动数据库和挂起的删除仍然需要候选架构，并且保留的存储仍然是回滚验证的一部分。

## <a id="retired-tenant-container-management"></a> 退休租户-集装箱管理

实验性的 `openclaw fleet` 命令已被删除。更新主机 CLI 不会影响现有租户容器、网络、挂载数据和注册表记录；它不会更新其容器映像。

更新之前，请备份每个租户并记录其容器身份、运行时、镜像、端口、挂载、资源限制和环境。将该记录作为凭据进行保护：容器环境可以包含网关令牌。将生命周期、映像更新、备份和清理传输到 Docker 或 Podman 部署工具。在停用恢复副本或删除资源之前，通过其现有端点验证每个租户。为每个 [ 信任边界 ](/gateway/security/trust-model) 保留单独的状态和凭证。

在更改映像或恢复较旧的 OpenClaw 版本之前，请参阅 [ 容器映像更新](/install/docker#upgrading-container-images)、[备份](/install/backups) 和 [ 降级限制](/install/updating/rollback-and-recovery#downgrade)。

## <a id="upgrading-very-old-versions"></a> 升级非常旧的版本

对于 2026 年 7 月之前的安装，请先升级到 **`2026.9.5`**，运行其 Doctor 迁移，然后升级到 `latest`。桥接版本仍然导入旧的 `tasks/runs.sqlite`、`flows/registry.sqlite` 和 `plugin-state/state.sqlite` 数据库，导入 JSON 插件安装索引、6 月前的插件 JSON 状态和 `credentials/oauth.json`，修复已停用的代理和通道配置密钥，并包含旧的运行时别名。已停用的插件导入包括 Telegram、iMessage、Active Memory、Nostr 和 Microsoft Teams；请参阅 [ 旧状态迁移](/cli/doctor/state-migrations)。当前版本保留了那些已停用的状态文件。如果您已经安装了最新版本，Doctor 会在重写仍包含这些已停用密钥的配置之前停止，并引导您通过同一桥。

在创建当前表之前，也会拒绝已停用的同文件内存索引（`meta`、`files` 和 `chunks`）。保留原始状态和配置，然后使用 **`2026.9.7`** 迁移该索引的兼容副本，然后重试。具有这些通用名称的不相关表保持不变。

如果较新版本已升级您的 SQLite 数据库，请为桥使用兼容的更新前备份。旧版本无法打开新数据库模式；在针对该状态运行任一桥接版本之前，请按照 [ 降级恢复 ](/reference/database-schemas/integrity-and-recovery#downgrade-recovery) 进行操作。

首先备份状态，并在24.x线上使用[支持的Node版本](/install/node)：Node 24.16+，或Node 26.1+。始终保持相同的所属帐户、安装前缀、配置文件和 state/configuration 路径。

对于具有 OpenClaw- 托管网关服务的 npm 安装，请从终端运行第一阶段：

```bash
openclaw gateway stop &&
  npm install -g openclaw@2026.9.5 --allow-scripts=openclaw &&
  openclaw --version &&
  openclaw doctor --fix
```

确认版本输出为 `2026.9.5` 并且 Doctor 导入了您需要的旧任务、流程、插件和通道状态。在继续之前解决任何失败或冲突的导入。 Doctor 仅导入启用的通道和帐户的通道状态。如果需要，请在网关停止时临时启用这些通道，重新运行网桥 Doctor，然后恢复其之前启用的设置。在运行迁移之前安装受影响的插件。然后安装当前版本并重新启动：

```bash
npm install -g openclaw@latest --allow-scripts=openclaw &&
  openclaw doctor --fix &&
  openclaw gateway start &&
  openclaw gateway status --deep
```

这些 npm 命令适用于 npm 12 或 npm 11.16+；在 npm 11.15 及更早版本上，省略 `--allow-scripts=openclaw`。对于 pnpm- 拥有的安装，请将每个安装命令替换为 `pnpm add -g --allow-build=openclaw openclaw@2026.9.5`，然后替换为 `pnpm add -g --allow-build=openclaw openclaw@latest`。对于 Bun，请使用 `bun add -g --trust openclaw@2026.9.5`，然后使用 `bun add -g --trust openclaw@latest`。在每个 `openclaw` 命令上保留任何正常的 `--profile` 选择器。对于自定义服务或前台网关，请通过其实际所有者而不是上面的托管服务命令停止和启动它。

## <a id="recommended%3A-openclaw-update"></a><a id="recommended-openclaw-update"></a> 推荐：`openclaw update`

检测您的安装类型（npm、pnpm、Bun 或 git），在旧网关服务时检查新版本，然后激活并验证更新。

```bash
openclaw update
```

从添加 [ 候选者拥有的准入 ](/cli/update#candidate-owned-admission) 的版本开始，软件包更新私下暂存目标，并让其代码在激活之前判断配置、数据库架构、Node 要求和插件可用性。因此，后续版本可以为已经使用支持更新程序的用户纠正这些准入决策。安装的更新程序保留托管服务所有权和祖先检查以及每个突变。较旧安装的更新程序保留其预部署拒绝；新的候选者无法修复第一跳。没有功能标记的目标会回退到已安装的检查，`--admission installed` 和 `--dry-run`（从不暂存包）也是如此。准入选择为 CLI-only：`--admission auto` 是默认值，并且没有环境变量覆盖。

即使 NTFS 文件 ID 超出 JavaScript 的确切数字范围，Windows 候选者也会接受来自 `2026.9.6` 更新程序的租用身份。验证切换后，候选者保留准确的文件和父目录身份；后来更换仍然停止更新。租约读取失败报告其根本原因，而不是父绑定不匹配。

服务备份和中断的代理清理也保留准确的文件标识。旧的圆形收据在下次写入验证后仍然可读并升级。

安装后 Doctor 还接受较旧的更新程序，包括 `2026.8.2`，但不提供更新运行 ID。它的命令保留特定于调用的保管，而不需要环境变量的解决方法。

医生通过本地监护权绑定保留指挥官捕获的出生身份。如果命令在捕获该身份之前完成，则其原始生成所有者仍会加入该命令并在释放保留之前确认其进程组已退出。实时或不可读的命令仍然受到保护。

当安装的 `2026.9.2` 更新程序运行候选者的早期 Doctor 检查时，共享状态和代理架构更改将在专用副本上演练。在此检查期间，插件检查无法将本机准入元数据发布到实时状态。拒绝的演练会使实时数据库模式保持不变以进行包回滚；成功的检查会推迟迁移到新的核心后更新程序。

托管服务检查是尽最大努力。如果服务管理器不可用，包括没有 systemd 的 Linux 主机，更新将继续并记录警告。它使未经验证的服务定义保持不变并跳过其自动重新启动。更新后重新启动手动启动的网关，或使用其实际管理程序。医生仍在迁移前检查活跃的状态作家。

在 Linux 上，更新之前取消屏蔽受管 systemd 单元。屏蔽单元（`masked` 或 `masked-runtime`）、`RefuseManualStart=yes` 或没有启动路径的禁用和非活动单元会导致在替换文件或运行迁移之前预检被拒绝。对于默认用户服务：

```bash
systemctl --user unmask openclaw-gateway.service
openclaw update
```

将 `openclaw gateway status --deep` 报告的单位和范围用于自定义配置文件或系统服务。如果操作员在更新期间应用掩码或其他启动限制，OpenClaw 会保留激活的候选者并报告服务定义警告，而不是回滚，因为 systemd 拒绝启动它。网关准备情况尚未得到验证；删除报告的限制，运行`openclaw gateway start`，然后检查`openclaw gateway status --deep`。这些检查属于已安装的更新程序；在从旧版本更新之前也取消屏蔽。参见[Linux维护持有](/cli/gateway/service#linux-maintenance-holds)。

服务成员身份使用正在运行的网关的进程祖先和本机主管事实。继承服务环境标记的外部终端在本机成员资格被验证为外部后仍然可以更新。当共享网关的 macOS 进程组或 launchd 作业或其 systemd 单元 cgroup 时，重设父级的子级仍保留在内部。在 macOS 上，即使根拥有的 `login` 进程阻止完整的祖先行走（包括在集成终端中），经过验证的外部 launchd 成员身份也足够了。已经存在的核心更新永远不会拒绝服务成员资格。当无法将成员资格验证为外部时，会以 `already-current` 完成，并发出一条警告，说明插件、运行时和服务维护已推迟，然后维护才能更改文件或停止网关。显式频道更改也不会应用并在警告中命名，以便可以重试。真正的更新保留了遏制检查。当前但不可读的本机成员资格拒绝 `service-membership-unverified`；已确认的本机成员身份使用 `inside-gateway-service`。 Windows 当前使用经过验证的祖先和继承标记回退，因为作业对象成员资格对运行时不可用。真正的网关后代必须使用托管更新切换或独立终端。

Linux 支持 cgroup v2 和命名的 systemd v1 层次结构。当可读的本机观察确定该主机没有服务包含树或 launchd 作业时，完整的外部祖先行走和不同的进程组允许更新程序自行停止、更新和启动托管服务。服务定义必须仍属于此安装。报告和`openclaw update status --json`记录警告：`Service membership unverifiable on this host; using managed stop/update/start.`

权限失败、冲突、不完整或格式错误的观察以及已知的服务成员不使用此后备。即使没有本机单元树，网关进程组中重新设置父级的调用者仍保留在内部。当本机事实存在但无法读取时，请在安装的所属帐户下从不是由网关服务启动的交互式外部 shell 运行此序列：

```bash
openclaw gateway stop && openclaw update --yes && openclaw gateway start
```

停止网关可以消除实时遏制的模糊性。始终保持相同的帐户、配置文件和 state/configuration 路径，并在更新命令上重复任何请求的 `--channel` 或 `--tag`。如果更新报告错误，请在启动网关之前按照其恢复指南进行操作。借助本机帮助程序支持，`openclaw gateway call update.run --params '{}'`、网关工具的 `update.run` 操作和 `/update` 可以执行托管切换。 Linux 瞬时用户切换需要 `systemd-run`；没有它的模拟管理器无法使用该路由。请参阅 [ 自动化和 SSH](/cli/update#automation-and-ssh)。

托管服务拒绝会在故障报告和 `openclaw update status --json` 中保留特定代码，例如 `inside-gateway-process-tree` 或 `service-definition-changed`。共享报告保留代码和恢复指南，同时删除私有路径和进程 ID。这些检查在已安装的更新程序中运行：新候选者无法在包替换之前修复旧驱动程序的拒绝，也无法恢复已丢弃的旧报告的详细信息。

包交换报告区分 `package-recovery-permissions-unsafe`（恢复工件权限或链接计数）和 `managed-handoff-lease-identity-changed`（记录的租赁数据库路径、文件或父目录已更改）。共享报告保留这些封闭原因代码，同时编辑私人诊断。其他包失败保留 `global-install-failed` 原因。这些诊断不会更改拒绝、备份或回滚行为，并且需要更新的驱动程序。

Control UI 更新使用经过验证的帮助程序来停止和重新启动托管网关。在macOS上，助手将其实时更新所有权带入LaunchAgent激活中； Gateway内部的普通命令仍然无法停止自己的服务。如果较旧安装的更新程序在激活前报告 `managed-service-stop-failed`，则候选者尚未更换该更新程序。使用同一安装所有者从外部终端进行更新，然后重试 Control UI 更新。

替换软件包后，兼容性配置会使用更新的软件包及其依赖项从在新进程中运行的旧更新程序中读取数据。这也适用于由 2026.9.4. 驱动的更新。如果可选读取失败，更新程序将打印 `candidate-config-read-failed` 以及读取器的错误或退出原因，并保持服务定义不变。读者的 stderr 没有得到回显。回滚后，读取会跟随恢复的包。更新完成后，使用更新的 CLI 检查报告的问题，然后使用与更新相同的 `--profile` 或 `--dev` 选项运行 `openclaw gateway install --force` 以刷新服务定义。 Node 和 Bun 读取器每次读取仅运行一个子项。尝试的嵌套读取器在生成之前停止并记录 `candidate-config-read-recursion`。两个运行时使用相同的结果通道进行同步和异步读取；配置诊断与结果分开。

Bun- 来自 2026.9.7 的托管更新可以完成候选 Doctor 并在软件包替换后重新启动网关。空闲的候选工作人员在本机工作关闭后释放其 IPC 引用，因此完成的 Doctor 不会让已安装的更新程序无限期地等待其退出。此修复程序在更新的包中运行；已发布的更新程序及其切换标记未更改。

本机服务启动后，重新启动准备允许其经过验证的进程在正常启动截止日期之前替换丢失或失效的网关所有权，然后再向其发送信号。当较旧的更新程序在要求新安装重新启动之前启动更新的服务时，这可以避免出现间歇性的 `restart-unhealthy` 结果。该修复程序在新安装中运行，因此它也适用于 2026.8.35. 的下一个更新。在截止日期后缺少所有权，并且不相关的进程锁仍然拒绝重新启动。

在就地更新可以替换程序包的捆绑文件之前，正在运行的网关会保留其关闭代码。转录关闭耗尽捕获并保留基于规则的注释，而无需启动可选的模型推理。此保护适用于包含关闭修复的 **版本的更新**。旧版运行的网关（包括 2026.9.6）在更换软件包后仍可能因 `ERR_MODULE_NOT_FOUND` 导致首次关闭失败；安装固定候选者不能更改已在该进程中运行的代码。如果旧进程退出且未重新启动，请与其安装所有者一起启动更新后的网关。

当可写托管 Node 网关服务指向另一个全局安装时，更新会将活动的 CLI 的安装保留为其目标，并在验证重新启动的网关之前通过 `gateway install --force` 刷新服务。旧的服务命令保留恢复身份，直到切换成功。协调失败将通过手动修复命令记录为警告。代码更新可以报告成功，而服务协调仍处于待处理状态；停止的服务将保持停止状态，直至修复。在 Linux 上，重新生成会保留保留的 `PATH` 条目的顺序，并在新添加的托管条目之前添加。仅从旧定义继承的路径仍然通过现有的安全过滤器。如果无法保留定义，则需要手动修复协调。部署拥有的定义保留其现有的安装所有者。

位于不同软件包根目录的自有托管 **Bun** 网关使用现有的服务根更新路径：仅网关安装前进，并且调用 CLI 安装保持不变。更新程序根据 Bun 1.4.3+ 和 WAL-safe `node:sqlite` 要求验证服务的实际 Bun 可执行文件； Bun 的模拟 Node 版本不会与 `engines.node` 进行检查。如果更新程序在 Node 上运行，则在包替换之前，其 Node 还必须满足目标包的引擎和 SQLite 要求，因为最终化使用该运行时。 Bun- 拥有的包管理器检查并安装使用已验证的可执行文件，并且现有的 install/restart 路径保留记录的运行时 pin。仅 `~/.openclaw` 下的路径不会建立 Bun 包管理器所有权。请参阅 [Bun-only 安装 ](/install/bun-compatibility#bun-only-installs)。

Doctor 和 `openclaw update repair` 不会将 Bun 网关移动到不同的 CLI 安装上。从其他安装调用的修复会报告漂移并在停止网关之前拒绝服务维护。从网关自己的安装（例如 `<bun> <service-root>/openclaw.mjs update repair`）运行修复，或使用 `openclaw update` 推进其安装到位。

首先运行已安装的更新程序。在 Linux 分根夹具中，当 Bun 不在 PATH 中时，发布的 2026.9.6 会提前拒绝 `ENOENT`，从而使网关和两个安装保持不变。通过在 PATH 上分叉 Bun，该发布的驱动程序更新了网关安装并正常重新启动，同时保持调用 CLI 不变。仅当驱动更新的更新程序包含此修复时，上述路由和显式 Bun 选择才适用。安装较新的候选者无法更改第一跳。

在可写准备之前，检查 CLI 或选定服务安装中的待处理包发布恢复。更新程序自动解决符合条件的丢失租约恢复问题；其他未完成的操作仍需要报告的恢复命令。医生没有清除这些伪影。

在不间断的软件包更新期间，通过目录标识、软件包版本和启动器检查新安装的私有候选者，而不是重复的全树扫描。不会检测到发布期间该私人候选人内部的内容更改。保留其完整指纹以供恢复；恢复发布和修复仍然验证包内容。当安装的更新程序包含此优化时，此优化适用；老更新者保留他们的检查。

pnpm 更新使用安装自己的 pnpm 主目录和 bin 目录，即使 macOS 服务 PATH 排除 pnpm 也是如此。安装的更新程序必须包含此修复程序。

本机 pnpm 更新还会在发布之前重新定位 pnpm 12 启动器路径。激活后，未解析的启动器目标会生成警告和修复指南，而不回滚更新的包。这些保护要求安装的更新程序包含修复程序。如果较旧的更新程序使 `openclaw` 指向丢失的 `.openclaw-update-native-*` 目录，请使用相同的帐户和全局目录重新安装与 `pnpm add -g --force openclaw@<installed-version>` 相同的版本，以重新创建启动器。首先备份并遵循 [ 手动包管理器过程 ](/install/updating/update-methods#alternative-manual-npm-pnpm-or-bun)。

如果 pnpm-owned 安装失败并显示 `IO error: not a terminal`，则安装的更新程序可能会在捕获其输出时触发交互式 pnpm 构建批准提示。新的候选者无法修复第一个更新。遵循 [ 手动包管理器程序 ](/install/updating/update-methods#alternative-manual-npm-pnpm-or-bun)，保留所属帐户、前缀和 state/configuration. 在替换包之前通过其实际所有者备份并停止网关。对于 POSIX shell 中的安装步骤，提供非交互式输入：

```bash
pnpm add -g --allow-build=openclaw openclaw@VERSION </dev/null
```

将 `VERSION` 替换为包含此修复的版本。然后运行 ​​Doctor 并按照手动过程中所述通过同一所有者重新启动。由固定版本驱动的更新为 pnpm 本身提供非交互式输入。恢复命令允许 OpenClaw 自己的安装脚本，而无需批准其他依赖项。

安装的2026.9.4更新程序可以在目标代码运行之前拒绝`managed-service-preflight`。要达到包含此修复的版本，请使用具有相同所属包管理器、前缀和 state/configuration. 的 [ 手动包管理器过程 ](/install/updating/update-methods#alternative-manual-npm-pnpm-or-bun) 首先备份，通过其实际主管或前台进程所有者停止网关，替换包，运行 Doctor，然后通过同一所有者重新启动。 `--no-restart` 无法修复旧的准入检查。

没有准入修复的更新程序首先在 2026.7.2-beta.5 中发布，包括 2026.6.34–2026.6.35 和 2026.7.33–2026.7.35 扩展稳定产品线，当配置的插件路径丢失时，在使用 `plugins.load.paths: plugin path not found` 进行暂存之前会拒绝。恢复自定义插件目录或删除其配置的路径，然后更新。 `openclaw doctor --fix` 修复已识别的捆绑路径别名，但保留不相关的自定义路径。

<Note>
在 macOS 上，2026.9.4 网关的 `update.run` 操作或 `/update` 可以成功切换，然后在 `managed-service-preflight` 激活时失败，并且“此命令正在网关进程树内运行”。安装的更新程序在交换软件包之前拒绝其自己的托管帮助程序，因此较新的候选者无法修复第一个更新。

对于此祖先拒绝，所有者应从网关进程树外部的独立终端运行一次 `openclaw update`，使用相同的拥有帐户、安装和 state/configuration. 安装包含托管帮助程序权限修复的版本后，通过 `update.run` 或 `/update` 启动的后续更新使用更正的更新程序。该修复适用于从**修复版本更新**；它不会修复 2026.9.4 macOS 切换到位。
</Note>

选择 Node 的软件包更新会在激活之前检查确切候选人的 Node 要求。不兼容的运行时会生成 `node-runtime-preflight`，其中包含目标版本、所需的引擎范围、选定的 Node 版本和升级命令。 npm 目录权限失败会生成 `global-install-permission-denied`，命名该目录、其所有者（可用时）以及下一步操作。试运行 JSON 将这些结果包含在 `failures` 中；更新报告和Doctor的更新历史记录保留记录的失败。在这些飞行前检查期间，服务网关保持在原位。

目录权限检查保留在 **安装的更新程序** 中。较老的更新者无法从他们尚未上演的候选者那里获得新的准入行为。如果从旧版本升级，请先检查[节点要求](/install/node)和npm前缀的权限；请参阅 [ 更新故障排除](/install/update-troubleshooting#node-and-global-install-permissions)。

<Note>
在 FreeBSD 上，OpenClaw 2026.9.4 可以在使用 `managed handoff process start identity is unavailable` 进行更新之前停止。更改目标或添加 `--no-restart` 无法修复已安装的更新程序。

对于 pkg 或 Ports 安装，请通过 pkg 或 Ports 进行更新；不要用 npm 覆盖其文件。对于 npm- 拥有的安装，请从单独的 shell 使用 [ 手动包管理器过程 ](/install/updating/update-methods#alternative-manual-npm-pnpm-or-bun)，具有相同的拥有 npm、安装前缀和网关 state/configuration. 选择发布版本，其发行说明包括 FreeBSD 修复； `main` 上的更改不是已发布的版本。

通过其实际主管或前台进程所有者围绕手动替换停止和启动网关。此恢复不会添加 CLI- 托管 FreeBSD rc.d 服务更新。

升级后，请在启动代理轮流之前检查 [FreeBSD 模型运行时限制 ](/install/installer#install-clish)。
</Note>

已安装的注册表包版本或 Git 目标 SHA 仍会运行插件维护，修复符合条件的旧 OpenClaw 释放引脚，并在插件更改或其服务点在另一个安装时重新启动正在运行的托管网关，除非设置了 `--no-restart`。未更改的运行结果为 `skipped` / `already-current`。

插件维护不会导致其他成功的核心更新失败。如果插件无法更新，OpenClaw 会继续使用剩余的插件，尽可能保留以前的安装，并打印简短的下一步操作。正在运行的更新网关还可以报告未加载的插件，而不会导致核心更新失败。各个插件结果在 `--json` 输出中仍然可用。当 ClawHub 尚未发布版本匹配的官方运行时插件时，更新程序会尝试其声明的受信任 npm 源来获取同一版本，并尊重目录引脚。安全性和完整性拒绝不允许源回退。如果两个源都无法提供该版本，则兼容的工作安装将保持不变，并带有版本偏差警告和 `openclaw plugins update <id>` 重试指令。

未完成的插件迁移保留其设置和状态输入，而 `plugins install`、`plugins update`、`doctor --fix` 和 `update repair` 修复包。可以在剩余数据迁移完成之前安装经过验证的替代品；挂起的迁移仍然保护运行时激活。显式 `config unset plugins.entries.<id>` 可以删除该条目，并保留正常的配置备份。删除该条目并不会解决其挂起的数据迁移问题。

安装核心、修复所需配置或状态或启动更新的网关失败仍然是更新失败，上述服务定义拒绝除外。通过 `plugins.load.paths` 选择的本地副本由操作员管理。更新和 `openclaw update repair` 保留选定的副本，并且任何 npm 安装它的影子，并在结果和更新历史记录中记录 `plugin-operator-managed` 警告。根据更新的 OpenClaw 版本验证该副本，或从 `plugins.load.paths` 中删除其路径以再次使用托管安装。这不会授予本地副本受信任插件权限。即使版本匹配，也会验证并安装显式包工件（例如 tarball 路径或 URL）；匹配版本并不能证明两个工件包含相同的代码。显式的 `--channel` 选择仍会成为保存的更新通道。对于支持安装前检查的版本，运行状况检查、配置和插件规划以及复制状态下的测试网关启动在服务停止之前完成。停止的时间间隔包含交换、所需的迁移、插件下载和收敛以及服务启动。插件工作使用已安装的目标，无需服务网关。更改的插件、挂起的插件迁移或延迟的模型退役在重新启动之前运行新的 Doctor 修复；所需的修复失败仍然会阻止启动。在候选人获得最终确定权后，可以在验证就绪后运行具有完整 lint 覆盖的可选诊断。当网关服务时，它们的警告和重试命令保留在更新报告中。缺少诊断选择器会导致检查在启动之前运行。如果插件后 lint 执行由于锁争用、超时或检查失败而无法完成，则经过验证的核心更新将继续，并记录警告和原始 lint 诊断。运行 `openclaw update repair` 重试这些检查，当修复要求独占状态访问时首先停止网关。具体的准备情况调查结果和未经验证的流程清理仍然阻碍完成。最终报告通过收敛和最终验证记录停机时间，以及验证结果。请参阅 [ 验证和激活](/cli/update#validation-and-activation) 进行检查。

更新后配置和结算读取等待现有更新限额内的临时 SQLite 维护保管。如果等待到期，仅通过争用即可保留自动网关恢复；实际的有风险数据拒绝仍然会阻碍恢复。 Doctor只有在维护资源释放后才会发布完成结果。

源更新还允许在停止网关之前在已安装的结账中构建工件所有权和运行时暂存访问权限。当服务网关保持运行时，保留的 `.artifacts/dist-artifacts.lock` 拒绝使用记录的所有者、时间戳和精确恢复命令进行更新。在释放该锁之前，验证所有关联的 build/check 进程（包括分离的后代进程）是否已停止；仅凭一个死去的主人 PID 是不够的。更新程序保留该所有权，直到其工作完成并完成准备好的运行时结果。目前已经进行的维修会重复使用已承认的所有权；提升的运行时输出不需要重新生成。通过源构建缓存位置的已发布更新程序（包括 2026.9.6）也会在候选构建期间接收已安装的签出检查。

金丝雀使用临时环回网关端口并抑制后台侦听器，包括 MCP Apps 沙箱、浏览器控制和通道服务。这允许在服务网关保留其配置的端口的同时运行验证。它保留非秘密网关身份验证设置（例如 `gateway.auth.rateLimit`）用于策略检查，同时使用临时令牌并禁用 Tailscale 身份身份验证。激活的网关保留您正常的侦听器设置。仅当驱动更新程序宣布支持时才会发出候选启动进度，因此较旧的更新程序（包括 2026.9.5 和 2026.9.6）会保留实际的启动错误，而不是将进度标记误认为失败原因。内部具有进度功能的启动重复了现有的 `--update-canary` 布尔标记；旧版发布包含它一次。这是内部更新者与候选者之间的合同，没有操作员配置设置。启动失败报告保留最后有意义的 stderr 诊断和有界日志行的结尾，并编辑机密。金丝雀进度标记不能替代失败原因。安装的更新程序拥有此报告，因此较旧的更新程序可以在第一次更新时保留其早期的诊断行为。金丝雀验证复制的插件有效负载，而不下载替换内容。当插件刷新被推迟时它会发出警告；实时更新完成拥有该刷新，因此缓慢的注册表无法消耗金丝雀的启动预算。当安装的更新程序是 2026.9.3. 时，此候选方行为也适用。该较旧的更新程序仍将整个验证序列限制在五分钟；其 `--timeout` 选项无法增加此上限。

插件排练副本是临时的，会在中断后重建。复制最多使用四个并发文件副本，并避免对每个文件进行磁盘刷新。如果副本失败，活动副本会在清理之前完成；仅在所有文件复制成功后才运行链接发布和验证。存储状态和恢复备份保留其现有的持久性保证。较旧安装的更新程序会保留其初始快照行为，直到您从较新版本启动更新为止。

运行时保留会查找包管理器所属安装中提升的依赖项。缺少可选对等点不会导致它复制不相关的祖先安装。显式链接的依赖项保留其自己的解决方案。此改进在安装较新的更新程序后适用；它无法缩短旧更新程序中已运行的保留阶段。

数据库演练还避免了每个私有快照的第二次完整备份。更新模式检查和演练使用带有固定读取事务的 SQLite 在线备份，因此繁忙的网关可以在副本包含已提交的 WAL 数据时继续写入。每次获取都会生成一份副本，而不是重试，直到数据库变得安静为止。在回滚日志卷上，SQLite 可以延迟写入器提交，直到一致性读取完成。演练在更新分类帐中记录复制的页面、字节和经过的时间，然后检查并发布私有副本，并保留行 ID 以供验证。源数据库和恢复备份保留其现有的保护；当较新的更新程序运行时，准备工作会更快地生效。

在停止服务网关或更换已安装的核心之前，软件包更新还会检查 npm 启用的已配置插件的可用性。尽早检查注册表目标；在私有验证、实时状态准备或激活之前，使用私有暂存的包版本检查显式包工件。该检查使用与更新后同步相同的插件版本规则，包括发布队列跟踪、测试版选择和扩展稳定目标。缺少插件版本或注册表错误会产生一条警告，命名受影响的插件；核心更新可以继续。注册表目标 `--dry-run` 包含这些警告。对于显式工件，`--dry-run` 不会暂存包并报告插件可用性检查仍处于待处理状态。扩展稳定版不接受 `--tag`。捆绑和路径安装的插件不需要注册表请求。

此元数据检查不保留下载。在成功进行核心更新后，仅限插件的下载、安装或加载失败仍然是可操作的警告。快照清单从暂存的候选包运行，因此它使用目标版本的插件检查器。快照库存和候选Doctor共享插件源检查。无法解析的条目会产生一个警告，其中包含插件 ID、源路径和解析器错误，同时其文件将被原封不动地复制并检查其他条目。有效的 ESM 插件可以在依赖项检查期间使用 `import.meta`。更新程序会保留记录的选择，并尽可能保留以前的插件有效负载。对于失败的安装或更新，请按照报告的 `openclaw plugins update <id>` 命令进行操作；对于加载问题，请按照报告的 `openclaw doctor --fix` 命令进行操作。无效的配置或状态、所有权错误以及失败的核心启动或就绪检查仍然会阻止完成。

Shell 完成缓存刷新是尽力而为。如果超时并且验证了其进程清理，则最终确定会记录失败的缓存阶段和截止时间警告，同时允许更新完成。运行`openclaw completion --write-state`手动刷新。未经验证的进程清理仍然会阻止最终确定；更新程序不会报告成功，而拥有的工作可能仍处于活动状态。

### <a id="package-publication-recovery"></a> 包-发布恢复

支持的 POSIX npm 更新在将暂存包转移到恢复保管之前，使用选定的外部 Node 或 Bun 可执行文件打印恢复命令。保留打印的命令；每个操作都使用所需的 `--anchor` 和 `--operation` 参数来命名一个操作。仅当初始日志和辅助程序都完成后，它们才会一起发布在私有控制目录中。稍后的更新首先打印临时暂存命令，然后在助手移动后打印稳定命令。暂存命令仅在该移动之前有效；较早操作的命令无法选择较晚操作。助手在使用该日志之前会验证自己记录的路径、身份和内容。它位于活动包和一次性恢复目录之外。 `status` 读取操作，`repair` 仅恢复其记录的包发布，`retire` 仅删除其记录的过时对象。这些命令不会取代更新后插件、迁移或服务恢复。在恢复操作时保持其他包管理器停止。

在 FreeBSD 上，`repair` 和 `retire` 通过记录的安装自己的 `@openclaw/proc-safe` 依赖项及其 FreeBSD 平台插件读取进程标识：实时包或操作在发布期间保留在其旁边的副本。由较旧的更新程序编写的帮助程序无法在 FreeBSD 上修复或失效； `status` 仍报告该操作。

Bun 恢复需要受支持的 Bun 运行时以及 WAL- 重置安全 SQLite，并且可以在不安装 Node 的情况下运行。安装的更新程序控制第一次升级：旧版本可能会忽略 Bun 上的恢复命令或拒绝 Bun 恢复运行时。安装更新的候选者不会改变第一跳行为；后续更新使用候选人的恢复支持。

退出记录在记录帮助者的最终取消链接意图之前删除一次性目录。然后助手被移除。有界的最后一个收据保留在控制目录中，并且可以通过 `openclaw update status --json` 读取为 `packageActivation`，即使在删除辅助程序之后也是如此。已完成的收据仅会被当前所有权下新承认的更新所取代；没有权力改变安装。历史文件系统或执行程序存储身份不必与今天的身份匹配。重新启动、重新安装或删除已保留的证据不会重新打开已关闭的操作。读取已完成的收据并不会重写它。新的更新在准备自己的操作之前存档已完成的收据，保留日志和任何剩余的帮助程序或恢复目录作为证据。

显式修复会在操作的保留恢复目录中保留已确定的证据，包括整个控制日志。已完成的日志会离开活动的准入路径，因此较旧的更新者不需要了解较新的结算原因。普通的成功退役会保留最后的收据，直到下一次更新将其存档。显式修复会验证当前执行者所有权下已安装的候选者，即使旧的租赁存储消失或被替换也是如此。它不执行旧的帮助程序，因此更改或丢失的帮助程序以及更改的保留目录将作为证据保留，而不是作为实时包的证明。未完成的回滚不能仅仅因为其租赁或安装被替换而得到解决。

`openclaw update` 当记录的租赁数据库丢失或其身份已更改且实时安装仍然是记录的先前或候选包时，使用入场前相同的结算。候选内容和启动器必须通过验证。和解会保留恢复证据、报告警告，并且不会重新启动网关或安装软件包。 `--dry-run` 验证并报告计划的结算，而不更改日志、租赁数据库或恢复证据。其他挂起的操作仍然需要 `openclaw update repair` 或记录的包恢复命令。租赁数据库保留在其现有位置。

事务验证其选定的安装后，清理失败将发出警告。更改的旧包树、旧帮助程序和意外的备份内容将被保留，而不是恢复或删除。更新程序永久关闭其恢复操作并尝试存档证据。如果无法归档已完成的证据，则稍后的更新将保留它并使用普通的包交换路径，而无需独立的发布恢复。它的警告命名了该限制。

这些规则不会将未经验证的发布标记为成功更新。丢失、遗留、损坏或身份不匹配的 **unfinished** 恢复工件仍需要其恢复所有者。实时所有权冲突、更改选定的软件包或启动器以及待定的恢复仍然会被拒绝。保护这些文物；不要重新创建日志或删除它们以绕过恢复。

这些准入和清理修复程序必须存在于执行它们的更新程序中。在已被阻止的旧更新程序下载之前，较新的候选程序无法运行。然而，候选者的依赖项清单可以避免在已通过准入的更新期间修改旧的恢复工件。

### <a id="recover-an-unfinished-publication-after-a-remount"></a> 重新安装后恢复未完成的出版物

当文件系统设备号在重新启动或重新安装后发生变化时，较旧的更新程序可以在下载修复程序之前拒绝未完成的日志。安装包含此修复程序的版本后，从独立终端运行 `openclaw update repair`。当日志的索引节点在一致的设备号映射下仍然匹配时，修复可以解决 `prepared`、`publishing`、`publication-complete` 和取代的操作。普通更新准入仍然严格。

如果安装的更新程序无法读取日志，则包含此修复程序的单独安装的 OpenClaw 版本将提供相同的仅结算路径：

```bash
node /path/to/recovery-openclaw/dist/package-update-activation-recovery.mjs \
  --anchor '/absolute/path/to/.openclaw.package-activation-<key>' \
  --operation '<recorded-operation-id>' repair
```

将原始锚点和操作 ID 与受支持的外部 Node 或 Bun 运行时结合使用。停止其他更新程序和包管理器。对于未完成的身份不匹配的期刊，普通 `status` 和更新准入仍然严格。

如果发布从未开始并且仍然安装了以前的软件包，则修复会在同一设备映射下验证其完整树指纹和未更改的启动器，然后将操作设置为 `publication-not-started`。候选人被保留作为证据；安装的包没有变化。具有未完成的发布意图或启动器收据的先前包仍需要其原始恢复所有者，并且不会进行静默存档。

对于已安装的候选者，修复需要不存在暂存路径、与匹配的对象 inode 一致的设备号更改、原始完整的帮助程序和保留的上一代、匹配的完整候选树指纹、有效的包库存和清单以及未更改的启动器。设备投影仅适用于摘要验证：日志中的历史身份不会被重写。仅版本或索引节点匹配不符合条件；更改的内容、不安全的日志权限或链接、主动更新所有权以及未完成的回滚仍然会被拒绝。

如果手动安装已将候选版本替换为较新版本，则修复会在将旧操作存档为 `superseded-by-manual-install` 之前验证该安装的清单、dist 库存、条目目标和启动器。旧的包树和助手仍然被保留下来作为证据；他们不必通过旧候选人的指纹检查。

对于已记录的候选者，在新的执行者所有权下，修复记录 `publication-settled-external-change` 并在报告的存档中保留整个日志和恢复证据。从活动准入路径中删除该关闭的收据可以让旧的更新程序继续而不解释新的收据类型。如果归档失败而活动收据仍然存在，请解决报告的错误并重新运行相同的命令。如果助手在移动控制目录后报告未确认的存档，请保留并检查报告的存档；原始命令不再具有可重新打开的活动日志。帮助程序不会重新发布或回滚包、删除保留的代、或重新启动或验证网关。它不执行原始的帮助程序。其他未完成的布局仍需要其原始回收所有者。

### <a id="recover-a-completed-receipt-with-an-older-updater"></a> 使用较旧的更新程序恢复完整的收据

当保存的文件系统设备编号发生更改时，已安装的 2026.9.8 或 2026.9.9 更新程序可以在下载修复程序之前拒绝已完成的 `anchor-retired` 收据。使用单独安装的包含已完成收据恢复修复的 OpenClaw 版本。它的独立帮助程序可以存档原始安装的完整历史记录，同时该安装的网关保持运行：

```bash
node /path/to/recovery-openclaw/dist/package-update-activation-recovery.mjs \
  --anchor '/absolute/path/to/.openclaw.package-activation-<key>' \
  --operation '<recorded-operation-id>' status
node /path/to/recovery-openclaw/dist/package-update-activation-recovery.mjs \
  --anchor '/absolute/path/to/.openclaw.package-activation-<key>' \
  --operation '<recorded-operation-id>' retire
```

使用原始日志中的锚点和操作 ID 以及受支持的外部 Node 或 Bun 运行时。停止其他更新程序和包管理器。 `status` 必须报告`complete`；它不会修改收据。 `retire` 获取新的更新所有权，验证已检查的已完成收据仍然是最新的，并将其控制目录移动到打印的 `.superseded-<id>` 存档中。它保留日志字节和保存的身份、安装的包、启动器和应用程序状态。它不运行 Doctor 或插件迁移。成功存档后，使用原始安装重试 `openclaw update`。

如果归档失败并且保留活动收据，则该命令将失败退出并指定下一步。解决该错误时，请保留收据和任何现有存档。未完成的、外部的或无效的操作仍需要其原始恢复所有者；独立帮助者不能授权发布或回滚它。不要重写身份或删除恢复工件。

### <a id="unfinished-publication-and-rollback"></a> 未完成的发布和回滚

当实时候选者通过与修复相同的验证时，即使更新租约未更改，`openclaw update` 也会自动解决 `publication-complete` 操作。试运行可在不改变恢复工件的情况下预览结算。在租约不变的情况下，其他未完成的阶段仍然需要明确的修复。

对于卡在 `prepared`、`publishing` 或 `publication-complete`（其实时包已为候选者提供服务）的外部辅助操作，请从独立终端运行 `openclaw update repair`。在解决操作之前，修复会验证已安装候选者的 dist 内容清单、清单、启动器和当前更新所有权。它归档剩余的帮助程序并保留包证据，包括更改的先前树，而不恢复或删除该树。验证失败会使恢复处于准备状态并阻止下一次更新。没有此解决路径的较旧更新程序版本仍然需要其原始恢复所有者。

SQLite 恢复和回滚托管验证文件身份、大小和内容。验证相同字节后，仅接受时间戳更改；替换的文件或更改的数据库或日志字节仍需要其所有者进行恢复。快照发布使用相同的检查，包括在较旧的 Linux 内核上，其中报告的文件创建时间在普通写入或硬链接删除后发生变化。

对于较旧的目录内激活日志，`openclaw update status --json` 报告记录的阶段和原始帮助程序的 `status` 命令。当前的更新程序仅检查这些期刊；在开始另一次更新之前，使用其原始助手来恢复或退出操作。

包恢复不会重播全状态检查点或反向数据库迁移。自动回滚可将兼容的数据库保持在适当的位置，从而保留较新的写入。如果以前的运行时无法读取当前数据库，更新程序将保留候选和恢复工件并报告回滚被拒绝的原因。

回滚快照在捕获之前将本地 SQLite 写入器置于维护所有权之下，因此回滚期间写入器关闭不会被误认为是干预写入。安装的更新程序拥有快照捕获；暂存较新的候选者无法更改已运行的较旧更新程序中的该行为。

切换通道或指定某个版本：

```bash
openclaw update --channel beta
openclaw update --channel extended-stable
openclaw update --channel dev
openclaw update --dry-run   # preview without applying
```

`openclaw update` 没有 `--verbose` 标志（安装器有）。如需诊断，请使用 `--dry-run` 预览计划执行的操作，使用 `--json` 获取结构化结果，或使用 `openclaw update status --json` 查看通道和可用性状态。

`--channel beta` 按语义版本顺序从 beta 和最新的 npm dist 标签中选择最新版本。使用 `--tag beta` 进行一次性包更新，固定到原始 npm beta dist-tag。

保存的 `update.channel` 保留为将来更新、自动检查和更新状态的通道。例如，保存的稳定频道上的一次性测试版包随后会继续检查稳定状态。使用 `--channel beta` 订阅 Beta 更新。如果需要兼容性，插件仍遵循已安装的核心版本。

`--channel extended-stable` 仅是软件包，并且安装仍然仅在前台进行。 OpenClaw 读取公共 npm `extended-stable` 选择器，验证所选的确切包，并安装该确切版本。注册表数据丢失或不一致会导致更新停止；它永远不会回落到 `latest`。如果所选版本比安装的版本旧，则正常降级确认仍然适用。 CLI 在核心更新成功后保留该通道；直接的 `npm install -g openclaw@extended-stable --allow-scripts=openclaw` 不会更新 `update.channel`，但最终的扩展稳定包版本仍然仅检查经过验证的 `extended-stable` 选择器的更新可用性。该直接命令适用于 npm 12 或 npm 11.16+。在 npm 11.15 及更早版本上，省略 `--allow-scripts=openclaw`。核心交换后，符合条件的官方 npm 和具有 bare/default 或 `latest` 意图的可信官方 ClawHub 插件将收敛到该确切的核心版本。符合条件的较旧 OpenClaw 释放引脚恢复默认更新策略。显式非 `latest` 标签、独立版本引脚、第三方插件、自定义 ClawHub 注册表和其他源保留其现有行为。当核心是修正版本时，版本绑定的运行时插件会收敛到基本版本组（例如，`YYYY.M.P-2` 使用插件 `YYYY.M.P`）。 `openclaw plugins update` 使用相同的主机匹配目标。已知不兼容的官方运行时版本（例如 2026.9.7 之前的 Codex 版本）在注册或服务轮次之前会被报告为不可用。即使兼容版本比主机旧，也仍然可以加载。运行 `openclaw update repair` 或 `openclaw plugins update codex`，然后重新启动网关。较新的显式引脚和独立版本的插件保留其现有的兼容性行为。当前 OpenClaw 版本创建的目录安装保留该默认意图。在成功更新后，在不更新于核心的确切 OpenClaw 版本中记录的经过验证的 OpenClaw- 拥有的软件包将恢复其目录的默认选择器。这包括旧的自动和手动销钉。他们记录的注册表和插件设置将被保留，后续更新将继续遵循所选频道。明确提供给插件更新命令的版本仍然适用于该操作。

`--channel dev` 为 npm- 拥有的软件包安装和现有的 Git 签出提供持久移动 GitHub `main` 签出。包安装拒绝 `--tag main` 简写，因为工作区签出不是独立的包工件。使用 `openclaw update --channel dev` 切换到支持的签出和构建流程。其他显式包规范保留其包管理器行为。开发目标检查仅获取选定的上游源，尊重存储库的引用映射和排除。它不会下载不相关的分支或更改存储库的浅层边界。

在源安装上，Doctor 和插件更新会保留使用主机构建的插件。具有相同版本字符串的注册表插件可以针对不同的 SDK，因此它不会替换没有匹配 SDK 构建证据的源构建。现有的注册表生成保留在磁盘上；收敛报告捆绑的选择并跳过它们的刷新。 `OPENCLAW_DEV_SOURCE_ROOT` 不是必需的。

Beta 通道上的托管 npm 插件使用相同的最新 beta/latest 选择，包括 `@openclaw/codex` 等官方插件。较旧的测试版标签无法容纳当前稳定版本后面的插件。启动修复会将当前的软件包保留在适当的位置，因此无操作刷新不需要再次重新启动。

有关通道语义，请参阅 [发布通道](/install/development-channels)。

### <a id="updating-from-2026.9.2-across-a-schema-bump"></a><a id="updating-from-2026-9-2-across-a-schema-bump"></a> 通过架构碰撞从 2026.9.2 更新

由 OpenClaw 2026.9.2 驱动的更新可以正常跨越共享状态架构碰撞。目标应用迁移内容，同时保留旧的已发布架构版本，以便旧的更新程序可以完成其分类帐写入和最终报告。医生解释说，架构内容已应用，版本发布已推迟。在此时间间隔内，新网关将在迁移的内容上运行。

发布会等待每个受影响的更新运行终止至少五分钟。超过 30 分钟没有更改的运行行仅被视为出于发布目的而放弃；这不会终止无身份的更新历史记录行。 Gateway 观察者在截止日期后发布；稍后打开数据库也可以发布它。请参阅 [ 数据库模式](/reference/database-schemas#schema-bumps-and-older-updaters) 中的精确计时和残余旧 CLI 限制。

当代理数据库也需要迁移时，候选者首先在私有副本上演练Doctor，而发布的更新程序仍然可以回滚其包。包提交后，新的核心后进程获得当前执行者权限并委托 Doctor。在迁移实时状态之前，Doctor 会验证覆盖每个代理数据库的保留恢复存档。然后更新程序会重新启动网关。

丢失状态元数据或未经验证的备份覆盖范围仍可能产生带有数据库版本和恢复指令的 `update-schema-bump-unfenced`。如果 npm postinstall 发出此类型的拒绝，则更新程序会报告该情况，而不会重试安装并省略可选依赖项。其他安装失败保留其现有的重试行为。在包提交之前，让失败的更新完成恢复之前的包。 OpenClaw 2026.9.2 在安装后验证失败后使网关服务停止。包提交后，旧的包备份消失了：使用已安装的兼容版本完成 `openclaw doctor --fix`，然后运行 ​​`openclaw gateway start`。包回滚无法撤消迁移的状态。

如果兼容包仍需要安装，请从网关外部的 shell 运行手动更新，将 `<target>` 替换为拒绝的确切目标版本：

```bash
openclaw gateway stop
npm install -g openclaw@<target> --allow-scripts=openclaw
openclaw doctor --fix
openclaw gateway start
```

仅在前一个命令成功后才运行每个命令。在 npm 11.15 及更早版本上，省略 `--allow-scripts=openclaw`。对于 pnpm- 拥有的安装，请将安装命令替换为 `pnpm add -g --allow-build=openclaw openclaw@<target>`；对于 Bun，请使用 `bun add -g --trust openclaw@<target>`。

相同架构更新、早期的无账本更新程序（例如 2026.9.1）以及从 2026.9.3 开始的隔离事务更新程序将保留其现有行为。回退不会撤消之前的迁移；如果数据库已经比恢复的包更新，请安装兼容的目标并在启动网关之前完成 Doctor。

对于 2026.9.2 更新的 Git 签出，当签出的引用日志明确识别先前的提交时，状态写入之前的 Doctor 拒绝会打印源恢复命令。等待更新程序退出，然后按照打印的结账、`pnpm install`、`pnpm build` 和独立 shell 中的服务启动指南进行操作。如果无法验证之前的提交，Doctor 会指示您查看引用日志。状态修复后的拒绝保留迁移所有者的指示：单独恢复源并不能恢复状态。这些诊断也会进入警告日志，并遵循正常的日志记录设置和轮换。解决拒绝原因后，重试更新。升级成功后，后续更新会在激活前检查新版本。

### <a id="from-chat"></a> 来自聊天

在 Control UI 中，展开收件箱中的 **Update available** 以检查最新的 Dev Git 目标。在打开更新确认之前，卡会再次检查。检查时，它会隐藏之前的 SHA 并禁用更新操作。失败的检查显示错误；重试该操作以再次检查。打开卡不会开始更新。

更新确认属于打开它的网关和配置文件。切换网关或配置文件会取消待定确认；在目标网关上再次打开它。当您确认时，本机更新还会检查当前的管理员访问权限，如果被撤销，则会显示访问错误。更新开始后，其进度报告在网关重新启动后仍然可用。

要求客服人员更新 OpenClaw，或从 Discord 或其他连接的聊天发送 `/update`。自然语言请求使用现有 `gateway` 工具的 `update.run` 操作。最小的编码和消息传递配置文件公开了更新操作，而无需授予配置读取或其他网关控制权。明确的工具限制仍然适用。

操作员创建的计划自动化也可以在没有聊天所有者身份的情况下调用 `gateway` → `update.run`。网关使用主动调度运行的权限；通知目标不会成为其请求者。由外部聊天用户和 Webhook 轮流创建的作业不会获得此权限。外部聊天更新请求仍然需要当前的命令所有者权限。

`/update` 是与模型无关的后备方案：它无需功能模型或访问 `gateway` 工具即可工作。该工具、斜杠命令和 Control UI 都使用相同的网关更新处理程序和当前授权检查。

在旧网关服务时检查新版本。当插件更改或其服务点位于不同的安装时，当前更新会重新启动正在运行的网关。当网关观察记录的里程碑时，更新运行可以在该聊天中发送这些通知：

1. 接受更新时的确认。
2. `⏳ Restarting the gateway now (v<from> → v<to>)…` 当网关停止之前记录激活时。
3. `🔁 Back on v<to>, verifying…` 当新网关开始验证时。
4. 最终报告，包括成功更新。

外部更新和重新启动通知将发送至 `commands.ownerAllowFrom` 中列出的目标或链接的管理员的直接对话。在检查管理员链接之前，通道将直接接收者解析为其稳定的发送者身份；组和频道目标不会继承个人的管理员权限。在 Control UI 中选择非所有者聊天并不授权向该联系人发送通知。如果没有所有者目标解析，则 OpenClaw 记录跳过的通知并将更新结果保留在运行记录和 Control UI 中；它不会将通知重定向到另一个聊天或通过诊断唤醒被拒绝的会话。

更新生命周期通知还遵守目标帐户的 `actions.sendMessage` 策略。明确的帐户设置会覆盖通道默认值；当两者都没有设置标志时，允许发出通知。禁用的发送将记录为跳过的通知，而不会阻止更新或其 Control UI 报告。

托管 systemd 或 launchd 更新可以在发出中间通知之前停止网关。对于这些安装，不保证完整的四消息序列；重新连接后，持久运行报告仍然可用。

使用内部原始会话运行，包括 Control UI 和网络聊天，直接在该会话的记录中接收这些通知。仅通过 `sessionKey` 就足够了；调用者不需要提供`deliveryContext`。在停止托管服务之前，更新程序会等待服务网关完成其重新启动通知尝试。该等待时间上限为 10 秒，因此停滞的通知无法阻止激活。

该报告包括结果、记录的阶段持续时间、失败的步骤、验证事实以及需要时的下一步行动。失败步骤摘要使用记录的故障事实（如果可用），在跟踪恢复建议之前保留起始原因。本地运行历史记录将验证结果和备份恢复路径与摘录分开保留。一次运行最多发送每个通知一次；在重新启动之前停止的更新仅发送其所达到的阶段的通知。如果更新无法启动，机器人会记录并解释原因，并在可用时提供手动命令。代理将返回的恢复指令转发给操作员。手动更新命令在网关服务之外的终端中运行；代理不得在托管其会话的网关的 shell 中执行它们。缺少所有者权限需要所有者设置，并且外部监督的安装使用其部署所有者的更新工作流程。

对于由 OpenClaw 本身更新的安装，聊天、CLI、Control UI 和自动更新共享持久运行 ID。使用 `openclaw update status` 读取活动或最新报告，包括重新启动后的报告； `--json` 公开 `activeRun` 和 `lastRun` 记录。有关网关历史查询，请参阅 [ 运行历史记录和报告 ](/cli/update#run-history-and-reports)。

发件人必须位于 [`commands.ownerAllowFrom`](/tools/slash-commands#configuration) 中或具有指向当前网关管理员 ](/concepts/user-model#channel-identity-links) 的 [ 已验证通道链接。允许聊天并不授予所有者权限。如果您的帐户不是所有者，回复会解释网关运营商如何连接它。频道设置和[pairing](/channels/pairing)区分所有者访问和聊天访问；现有允许的用户不会自动升级。聊天更新在托管交接、维修人员和医生运行中保留原始授权源。每个工作人员在执行操作之前都会检查原始安装的当前策略和配置文件状态。维修人员的推理轮次会在每次模型尝试、每次工具调用及其效果以及报告结果之前检查它们；其运行准备检查验证更新所有权、更新程序连接和取消。将频道帐户重新分配给其他管理员不会传输已经正在进行的更新；当前所有者必须开始新的更新。没有捕获的配置文件源的较旧更新程序切换保留其配置的所有者检查，并且在恢复期间无法获取链接配置文件权限。通过 `/update` 进行外部聊天更新或该工具需要 `commands.restart`（默认启用），包括托管安装。斜杠命令还遵循命令访问限制；工具调用遵循工具策略。聊天更新使用托管安装的配置更新通道和安装方法。代理绝不能运行 `npm install -g openclaw` 或从聊天 shell 停止网关服务；使用 `/update` 或更新操作，以便重新启动和通知保持协调。

## <a id="inspect-freebsd-service-discovery"></a> Inspect FreeBSD 服务发现

独立的 `scripts/freebsd-service-inspect.mjs` 诊断报告本机配置选择的 `openclaw` rc.d 定义。它需要 root 拥有的 Node 安装、脚本和共享发现帮助程序。它不需要 OpenClaw 端口服务包。

从现有的 root shell 中，从受信任的 OpenClaw 包安装脚本：

```sh
install -d -o root -g wheel -m 0755 /usr/local/libexec/lib
install -o root -g wheel -m 0644 /path/to/openclaw/scripts/freebsd-service-inspect.mjs /usr/local/libexec/openclaw-service-inspect.mjs
install -o root -g wheel -m 0644 /path/to/openclaw/scripts/lib/freebsd-service-discovery.mjs /usr/local/libexec/lib/freebsd-service-discovery.mjs
(cd / && /usr/bin/env -i HOME=/ PATH=/sbin:/bin:/usr/sbin:/usr/bin LC_ALL=C /usr/local/bin/node /usr/local/libexec/openclaw-service-inspect.mjs)
```

如果不同，请使用 root 拥有的 Node 路径。在 Node 启动之前清除环境，如图所示，以排除 Node 预加载选项。该命令不接受任何参数。它以 root 身份读取本机管理员 shell 配置，并且不请求任何服务生命周期操作。管理员配置是受信任的 shell 代码，而不是沙盒数据格式。

结果包括用于发现的确切干净环境和工作目录。它对应于使用相同上下文调用的 `service`。依赖于另一个环境或目录的配置可以选择不同的服务。

单个 JSON 结果报告 `absent`、`present` 或 `unknown`。当前结果包括可执行和不可执行的定义、它们的本机搜索顺序以及第一个可执行定义。符号链接、不安全的所有权、不完整的检查或意外的配置输出会生成 `unknown` 并退出 1。结果中不包含配置内容和子进程错误。

这是一个诊断性观察。它不会建立进程或包所有权、授权更新或启用 CLI- 托管的 rc.d 服务更新。继续使用上面安装所有者的更新过程。

## <a id="stale-update-history"></a> Stale 更新历史

未受影响的、无身份的遗产招生年龄超过24小时可以[自动过期](/cli/update/status-and-history#run-history-and-reports)在网关启动或状态检查期间。该行保留为`failed`合理`legacy-driver-expired`并重试建议；该形状不需要显式修复。

如果网关运行状况良好时更新状态保持进行中，请检查是否没有更新仍在运行。在更新的安装上，运行：

```bash
openclaw update repair
openclaw update status
```

对于超过 30 分钟的非活动旧行，修复会验证正在运行的网关是否与已安装的版本和版本匹配，然后清除过时的运行，而无需维护或重新启动服务。新的显式 `openclaw update` 也可以取代单个陈旧的无标识行。最近的行数和记录的实时驾驶员受到保护。遗留到期形状之外的无身份行需要显式恢复； Control UI 的配置写入暂停在协调后清除。

在拥有的更新中启动的修复可以继续使用匹配的继承运行 ID 和实时进程标识；运行记录了该延续。修复仍然拒绝不相关的实时或停滞的更新程序。该错误标识了其运行、阶段、驱动程序 PID、主机、启动和最后活动年龄以及观察到的活动。等待更新完成，或者停止其主机上的指定驱动程序并在退出后重新运行修复。有关维护和恢复行为，请参阅 [ 更新修复 ](/cli/update/repair-and-recovery#update-repair)。

OpenClaw 2026.9.2 不会拒绝新的 CLI 更新，因为存在较旧的运行行：其 [ 准入路径 ](https://github.com/openclaw/openclaw/blob/v2026.9.2/src/cli/update-cli/update-command-run.ts#L77) 创建新运行，其 [ledger](https://github.com/openclaw/openclaw/blob/v2026.9.2/src/infra/update-run-ledger.ts#L250) 仅检查重复运行ID。正常升级，如果旧历史记录仍然存在，则使用更新后的 `openclaw update repair`。此分类帐缺陷不需要包管理器转义。请参阅 [ 更新运行历史记录 ](/cli/update#run-history-and-reports)。

## <a id="retire-update-recovery-data"></a> 退出更新恢复数据

验证更新和对话后，预览保留的迁移原始版本：

```bash
openclaw update cleanup --dry-run
```

使用相同的配置文件和 state/config 覆盖作为更新，并检查报告中打印的状态目录。仅元数据预览可以在网关处于活动状态时运行。要申请，请自行停止该网关，等待其他 SQLite 维护完成，并停止数据库读取器（例如会话列表观察程序）。让它们停止，直到 `openclaw update cleanup` 退出；只读连接可以更改 WAL/SHM sidecar 并使验证无效。清理永远不会停止或重新启动网关。确认默认为**No**；自动化必须显式传递 `--yes`，包括使用 `--json` 时。

清理永久放弃回滚到符合条件的原始版本，包括修复的分支和旧的提供程序元数据。当前的 SQLite 历史记录、操作员备份以及受保护或未知的工件仍然存在。它不能替代 [ 更新前备份 ](#before-updating-create-a-verified-backup)。请参阅 [Update cleanup](/cli/update#update-cleanup) 了解资格、JSON 输出以及恢复中断的删除。私有包、命令填充程序和 Git 运行时备份仍归更新事务所有，并且不属于此迁移清理范围。更新历史记录中的中断条目不会阻止清理其他符合条件的迁移存档。

## <a id="after-updating"></a> 更新后

成功管理的 `openclaw update` 运行已经重新启动并验证网关。手动安装后或检查报告的问题时请使用这些步骤。

<Steps>

### <a id="run-doctor"></a> 运行 doctor

```bash
openclaw doctor
```

迁移配置、审核 DM 策略并检查网关运行状况。 Doctor 还将活动的官方插件与托管服务在重新启动后加载的 OpenClaw 包进行了比较。在继续之前解决任何插件重新启动准备警告。详细信息： [医生](/gateway/doctor)

如果您使用解压后的 Chrome 扩展，还需运行 `openclaw browser doctor --browser-profile chrome`。对于版本不匹配警告，请从 `chrome://extensions` 重新加载扩展；如果警告仍然存在，请完全重新启动 Chrome。

### <a id="restart-the-gateway"></a> 重启网关

```bash
openclaw gateway restart
```

### <a id="verify"></a> 验证

```bash
openclaw health
```

</Steps>

### <a id="background-exec-notifications-after-an-update"></a> 更新后后台执行通知

`[OpenClaw exec completion]` 识别后台命令的自动后续操作，而不是重复的心跳轮询。这些后续程序可以使用 `agents.defaults.heartbeat.every: "0m"` 运行。要保持后台执行而不需要这些额外的模型调用，请设置 `tools.exec.notifyOnExit: false` 并检查 `agents.entries.<id>.tools.exec.notifyOnExit` 处的每个代理覆盖。使用 `process poll` 收集结果。设置生效时间请参见[后台执行通知](/gateway/background-process#disable-automatic-completion-turns)。

<a id="rollback" />
<a id="roll-back-a-package-install" />
<a id="roll-back-a-source-checkout" />
<a id="downgrading-across-the-session-sqlite-migration" />
<a id="restore-state-only-when-necessary" />
<a id="verify-the-rollback" />

## <a id="detailed-topics"></a> 详细主题

<CardGroup cols={3}>
  <Card title="其他更新方法" href="/install/updating/update-methods" icon="shuffle">
    在 npm 和 git 安装、源服务器、安装程序和手动包管理器之间切换。
  </Card>
  <Card title="自动更新" href="/install/updating/automatic-updates" icon="clock">
    自动更新程序、每个频道的行为和更新活动。
  </Card>
  <Card title="回滚和恢复" href="/install/updating/rollback-and-recovery" icon="rotate-left">
    降级、自动回滚、更新前备份和分类。
  </Card>
</CardGroup>

- <a id="switch-between-npm-and-git-installs" />[在npm和git安装之间切换](/install/updating/update-methods#switch-between-npm-and-git-installs)
- <a id="source-checkout-servers-(reference-script)" /><a id="source-checkout-servers-reference-script" />[源结帐服务器（参考脚本）](/install/updating/update-methods#source-checkout-servers-reference-script)
- <a id="alternative%3A-re-run-the-installer" /><a id="alternative-re-run-the-installer" />[替代方案：重新运行安装程序](/install/updating/update-methods#alternative-re-run-the-installer)
- <a id="alternative%3A-manual-npm%2C-pnpm%2C-or-bun" /><a id="alternative-manual-npm-pnpm-or-bun" />[替代：手动npm、pnpm或bun](/install/updating/update-methods#alternative-manual-npm-pnpm-or-bun)
  - <a id="package-lifecycle-and-operator-state" />[包生命周期和操作状态](/install/updating/update-methods#package-lifecycle-and-operator-state)
  - <a id="advanced-npm-install-topics" />[高级 npm 安装主题](/install/updating/update-methods#advanced-npm-install-topics)
    - <a id="read-only-package-tree" />[只读包树](/install/updating/update-methods#read-only-package-tree)
    - <a id="hardened-systemd-units" />[硬化 systemd 单元](/install/updating/update-methods#hardened-systemd-units)
    - <a id="disk-space-preflight" />[磁盘空间预检](/install/updating/update-methods#disk-space-preflight)
- <a id="auto-updater" />[自动更新程序](/install/updating/automatic-updates#auto-updater)
  - <a id="update-campaigns" />[更新活动](/install/updating/automatic-updates#update-campaigns)
- <a id="downgrade" />[降级](/install/updating/rollback-and-recovery#downgrade)
  - <a id="automatic-checkpoint-recovery" />[全状态恢复需要备份](/install/updating/rollback-and-recovery#automatic-checkpoint-recovery)
  - <a id="automatic-schema-neutral-rollback" />[自动架构中性回滚](/install/updating/rollback-and-recovery#automatic-schema-neutral-rollback)
  - <a id="before-updating%3A-create-a-verified-backup" /><a id="before-updating-create-a-verified-backup" />[更新前：创建经过验证的备份](/install/updating/rollback-and-recovery#before-updating-create-a-verified-backup)
- <a id="if-you-are-stuck" />[如果你被卡住](/install/updating/rollback-and-recovery#if-you-are-stuck)
  - <a id="unattended-repair-on-your-own-inference" />[无人值守维修自行推断](/install/updating/rollback-and-recovery#unattended-repair-on-your-own-inference)

## <a id="related"></a> 相关内容

- [安装概述](/install)：所有安装方法。
- [Doctor](/gateway/doctor)：更新后的健康检查。
- [迁移](/install/migrating)：主要版本迁移指南。
