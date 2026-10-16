---
summary: "macOS 上捆绑的网关运行时、应用程序托管和后台服务"
read_when:
  - "打包 OpenClaw.app"
  - "调试 macOS 网关 launchd 服务"
  - "为macOS安装网关CLI"
title: "macOS 上的网关"
---

OpenClaw.app 捆绑了从 OpenClaw Bun 分支构建的私有运行时、具有扩展加载功能的签名 SQLite 库以及完全匹配的 OpenClaw 包（CLI、网关和 Control UI）。其应用程序拥有的 `node worker` 帮助程序和固定的本地 Chrome-extension 设置入口点在此 Bun 运行时上运行。该应用程序包不包含 Node 可执行文件。

有效负载位于一个 `Contents/Resources/runtime` 目录中。通用应用程序在架构之间共享 JavaScript 包，并包括通用 Bun 和 SQLite 二进制文件以及每个架构的本机依赖项。重建或替换应用程序也会替换此运行时，包括使用相同的公共版本进行重建。该应用程序会在启动前验证包的版本、提交、构建时间并构建 ID。移动应用程序或删除其构建签出不会更改它使用的运行时。

在新的配置文件中，**app 使用其捆绑的 Bun 运行时将 Gateway** 作为子进程托管。网关随应用程序启动，并在应用程序退出时停止。所配置端口上的现有网关将被附加而不是重复。现有的独立管理的安装保持其当前的生命周期。符合条件的应用管理的 Node 服务将迁移到捆绑的 Bun，同时保持其始终在线的服务。

在启动应用程序托管的网关之前，当配置和子环境均不提供凭据并且选择或隐式令牌身份验证时，应用程序会保存本地身份验证令牌。现有凭证、秘密引用和其他身份验证模式将被保留。如果无法保存令牌，安装程序将停止并出现可重试错误。这也适用于与远程主连接一起托管的本地网关。

该应用程序还保留远程回退凭据、配置包括、受信任的 dotenv 凭据以及启用的登录 shell 环境导入。当凭证源不可读或无法安全解析时，它会保持身份验证不变。受信任的 dotenv 文件是配置文件的 `.env`，对于默认状态目录，是 `~/.config/openclaw/gateway.env`。

该应用程序首先将其运行时复制到 `<state>/runtime/<runtimeBuildId>/`，其中 `<state>` 是 `~/.openclaw` 或 `~/.openclaw-<profile>`。副本使用一个 APFS 目录克隆（如果可用），回退到文件副本，并在出处和 Bun 检查成功后以原子方式发布。子进程和应用程序管理的 Bun 服务使用具体的构建目录，因此每个进程都保留其匹配的包和 SQLite 库。 `runtime/current` 符号链接选择终端 CLI 填充程序的运行时。该应用程序保留当前和以前的版本；仅当网关运行状况成功并且没有进程从其中运行后，才会删除旧副本。

对于应用程序拥有的完整网关负载，打包会在 OpenClaw 包根目录中写入 `openclaw-install-owner.json`、`schemaVersion: 1`、`owner: "macos-app"`、`displayName: "OpenClaw.app"` 和 `updateHint: "Update OpenClaw.app to update this Gateway."`。该合约通过应用程序更新程序（Sparkle）保留有效负载和运行时更新：核心报告所有者，跳过包注册表更新检查，并拒绝自我更新和运行时迁移。启动主机可以设置`OPENCLAW_GATEWAY_HOST_LIFELINE=stdin`并保留stdin管道编写器； EOF 或管道错误请求网关正常关闭。应用程序托管的网关使用这条生命线，因此即使应用程序意外结束，它们也会退出。

私有工作人员通过只读引导程序验证核心和节点配置，无需网关范围内的 Doctor 预检或通道模式验证。 Node 插件在发布命令之前仍然会验证自己的设置，并且节点运行时拥有其 MCP 客户端。 Node 启动保留了 Doctor 拥有的设备身份验证、设备身份和执行批准迁移；这并不是承诺所有工作进程启动都是只读的。 Public `node run`、Gateway 和 Doctor 保留其现有的启动策略。

当本机应用程序在工作程序启动之前创建身份、设备身份验证或批准表时，节点启动会在插件读取其状态之前通过共享初始化程序完成识别的版本零数据库。现有的本机行将被保留。这不会迁移已版本化的共享网关数据库或采用未知或占用的引导状态。

## <a id="automatic-setup"></a> 自动设置

在新的 Mac 上，在入门过程中选择 **This Mac**。 **准备工作** 准备包含的运行时、启动网关并验证其是否准备就绪。此设置不需要运行时下载、Node 安装、终端、Homebrew 或管理员访问权限。连接 AI 提供商仍然需要互联网访问。当应用程序重试网关启动时，首次运行切换会保持等待，然后在网关准备就绪后打开自动设置。终端故障或取消导致登录未完成。

该应用程序创建 `<state>/bin/openclaw`，这是一个小型 shell 包装器，它运行当前捆绑的 CLI 和 Bun 以及随附的 SQLite 库。当应用程序从持久位置运行时，它还会链接旁边的 `openclaw-mac`，并且默认配置文件会将该 bin 目录添加到常用的 shell 配置文件中。命名配置文件以及从下载、桌面、磁盘映像或临时目录（例如 `/tmp`）运行的副本，使 shell 配置文件保持不变；通过其完整路径运行其包装器，例如 `~/.openclaw-<profile>/bin/openclaw`。保留操作员创建的现有 `openclaw` 文件；仅替换应用程序自己的包装器或可识别的 `install-cli.sh` 包装器。

未捆绑的 DEBUG 版本保留开发人员安装程序和频道选择器。该安装程序使用私有临时目录来下载和构建工具，当继承的临时目录无法访问时，会回退到 `/tmp` 下的私有目录。

远程连接和连接到独立管理的本地网关将跳过此安装。仅附加模式从不提示 CLI 运行应用程序的节点。即使停止应用程序管理的服务会删除其 LaunchAgent 记录，暂停也会保留谁管理网关。如果重新连接时独立端点不再可用，则本地设置将再次可用。不可读的服务所有权记录会阻止自动安装，而不是被视为丢失的服务；检查 LaunchAgent 并重试。

选择 **设置 → 本机 → 在仪表板中的此设备上设置 Chrome** 以准备 Chrome 扩展，包括仅远程和仅连接的 Mac。启动不会检查或更改 Chrome 数据。开始设置后，默认应用程序配置文件会在该应用程序会话期间维护 CLI 更新的注册。安装程序使用经过验证的私有运行时，在请求 Store 扩展之前注册本机帮助程序，并将 Chrome 的权限批准留给您。它不运行网关范围内的 Doctor 或迁移网关状态。需要时执行相同的操作重试设置。请参阅 [Chrome 扩展 ](/tools/chrome-extension)。

## <a id="manual-recovery"></a> 手动恢复

从应用程序中读取要安装的版本：在菜单栏中选择 **About OpenClaw**，或运行 `openclaw-mac status --json`，它会报告应用程序版本和内部版本。

对于手动安装，请使用 Node 26（推荐）或其他受支持的版本：Node 24.16+ 或 Node 26.1+。全局安装`openclaw`：

以下命令适用于 npm 12 或 npm 11.16+。在 npm 11.15 及更早版本上，省略 `--allow-scripts=openclaw`。

```bash
npm install -g openclaw@<version> --allow-scripts=openclaw
```

使用 **在捆绑设置失败后重试设置**。如果运行时有效负载丢失或不兼容，请重新安装 OpenClaw.app. 安装全局 CLI 不会修复应用程序的捆绑有效负载。上面的手动 Node 安装适用于独立管理的网关或非捆绑开发设置。

对于使用应用程序的确切版本策略的现有应用程序管理的网关，**Retry setup** 会在启动之前通过其安装的 CLI 更新旧包。失败的更新仍然可以重试；通道策略和运营商运行时引脚保留其现有的更新路径。

## <a id="launchd-(gateway-as-launchagent)"></a><a id="launchd-gateway-as-launchagent"></a> Launchd（网关为 LaunchAgent）

标签：`ai.openclaw.gateway`（默认配置文件），或 `ai.openclaw.<profile>` 用于指定名称的配置文件。

Plist 位置（每用户）：`~/Library/LaunchAgents/ai.openclaw.gateway.plist` （或 `ai.openclaw.<profile>.plist`）。

macOS 应用程序可以将网关作为后台服务而不是子进程进行管理。打开 **在应用程序关闭时保持 OpenClaw 运行** 旁边的 **在登录时启动** 在仪表板设备设置中或在捆绑入门期间。全新设置已关闭。启用它会停止子进程并启动后台服务；禁用它会删除该服务并启动应用程序拥有的子项。该控制对于独立管理的网关和不托管本地网关的连接不可用。当此首选项更改时，暂停的网关将保持暂停状态。

如果替换网关无法启动，应用程序将恢复之前的托管模式并在报告故障之前验证其运行状况。操作员更改服务，或在切换过程中暂停或退出，将停止自动恢复；该应用程序保留较新的选择并报告无法完成的内容。

该应用程序保留网关生成的服务环境中的设置，并在以后的应用程序启动时重新读取该文件。如果服务的设置在切换到应用程序托管后会丢失，则应用程序会保持该服务不变，并要求您将所需的设置移至配置文件的持久配置或 `.env` 文件中。运行 `openclaw gateway install --force`，然后重试托管更改。这使用网关 CLI 现有的提供者凭证和引用配置的持久性规则；不保证任意环境变量在新服务安装中持续存在。

CLI 也可以直接安装：`openclaw gateway install`（命名配置文件通过 `OPENCLAW_PROFILE` 环境变量选择）。从应用程序启用现有服务会保留其保存的运行时 pin。如果该引脚无效，则使能失败，错误CLI；使用 `--runtime` 或 `--runtime-path` 显式重新安装以替换保存的引脚。禁用它会卸载 LaunchAgent，从而删除该引脚。

运行时意图存在于守护程序拥有的本地 SQLite 存储 `<state>/control/services.sqlite` 中，独立于所选的共享状态引擎。该应用程序通过其捆绑的 CLI 读取输入的意图；它不会打开共享数据库。未知、格式错误或过时的意图会保留服务，并需要在替换之前进行显式的运行时选择。待处理的迁移报告为 `migrationPending`；更新并恢复保留当前运行时间，直到医生或 CLI start/repair 完成它。既不运行 Doctor 也不运行 CLI 起始围栏的应用程序托管简历可能会使收据处于待处理状态；下一个 CLI start/repair 或 `openclaw doctor` 完成它。

新安装的应用程序管理的 Bun 服务固定到 `<state>/runtime/<runtimeBuildId>/bin/bun`，并具有匹配的包和 `OPENCLAW_SQLITE_LIBRARY` 环境。应用程序更新后，应用程序仅将其拥有的可执行文件位于 `<state>/runtime/` 内的服务重新安装到新的具体构建中。使用该目录之外的可执行文件的服务保持不变，包括取消固定的可执行文件。更新窗口报告“网关服务使用操作员固定的运行时；请自行更新。”

行为：

- 在服务模式下，“OpenClaw Active”enables/disables LaunchAgent。
- 在服务模式下，退出应用程序会**不是**停止网关（launchd使其保持活力）。
- 如果配置端口上已经有一个 Gateway 在运行，应用会连接到它， 而不是启动一个新的。
- 其他侦听器保持运行状态。通过拥有端口冲突的进程或服务解决端口冲突；自动清理仅收获记录的孤立 SSH 隧道。
- 如果服务检查没有结论，应用程序将推迟安装并使用其现有的准备情况检查。确认不存在的服务仍然可以安装。

使用 CLI 进行生命周期检查和恢复：

```bash
openclaw gateway status --deep
openclaw gateway restart
```

当 **Also 在此 Mac** 上运行网关并使用远程主服务器启用时，托管启动代理包括 `--allow-unconfigured`，因此它可以在 `gateway.mode` 保留为 `remote` 时运行。将主服务器切换到本地服务器会删除该参数。请参阅 [ 本地托管以及远程主 ](/platforms/mac/remote#run-a-local-gateway-alongside-a-remote-primary)。

Launchd 提供登录时自动启动、崩溃重启，以及一个可预测的日志位置， 而不会将 Gateway 的生命周期绑定到应用进程。

### <a id="unexpected-repeated-restarts"></a> 意外重复重启

如果网关在更新后重复重新启动，请运行以下命令：

```bash
openclaw gateway status
openclaw doctor
```

在 macOS 上，这两个命令都会报告 `ai.openclaw.*` 命名空间中外部加载的作业，包括没有 plist 提交的作业。该报告显示每个标签、程序、KeepAlive 标志以及检测到的 `openclaw gateway restart`、`start` 或 `stop` 调用。当至少一项作业具有 KeepAlive 或经过验证的生命周期调用时，纯文本状态会将该列表显示为警告。否则，该列表会以信息形式显示在“其他 OpenClaw launchd 作业 （macOS）”下。状态 JSON 包括 `service.foreignLaunchdJobs` 下的所有这些作业。对于警告，生命周期日志中最近的外部强制重启提供了可能的关联；仅凭计数并不能确定哪个作业导致了重新启动。在 10 分钟内进行 3 次外部强制重启后，托管网关会记录一条可操作的警告，在可用时命名可能为 KeepAlive 作业。它不会抑制操作员的重新启动命令。

要删除已确认的杂散网关生命周期作业并验证恢复：

```bash
openclaw doctor --fix
openclaw gateway status
openclaw health
```

仅当外部作业的文字、直线脚本或直接参数通过 Gateway 生命周期子命令调用绝对 OpenClaw 路径时，Doctor 才会删除外部作业。 Shell 作业还必须没有改变 shell 执行的 launchd 环境条目。本合同之外的所有内容均已报告并保持不变。这是命令元数据验证；它不检查二进制可执行性、解释器可用性或隔离状态。

Doctor 会保留托管的 LaunchAgents、不相关的标签和无法确定目的的作业，并为每次删除命名，即使在非交互式运行中也是如此。对于隔离安装身份、外部监督或正在进行的更新，服务修复仍然处于禁用状态。

切勿使用 `launchctl submit` 或临时 KeepAlive 作业进行更新或网关生命周期命令。这样的作业可以在其脚本退出时重复运行 `openclaw gateway restart`，如 [#114967](https://github.com/openclaw/openclaw/issues/114967) 中所述。使用托管更新工作流程及其暂停栅栏，然后验证状态和运行状况。

### <a id="attach-only-development"></a> 仅附加开发

当另一个进程已经占用本地 Gateway 时，运行开发应用，而不安装或更改其 LaunchAgent：

```bash
scripts/restart-mac.sh --attach-only
```

直接使用 `--attach-only` 或 `--no-launchd` 启动应用会产生相同的效果。此覆盖设置会持久化到 `~/.openclaw/disable-launchagent`；删除该文件即可恢复由应用管理的 launchd 行为。

命名配置文件仍然要求侦听器属于该配置文件的网关服务。仅附加模式不允许附加其他进程或配置文件。如果发生端口所有权冲突，自动恢复会保留故障，而不是重复重新打开仪表板。解决冲突，然后重新启动应用程序。

日志：

- Gateway 标准输出：`~/Library/Logs/openclaw/gateway.log`（配置文件使用 `gateway-<profile>.log`）
- Gateway stderr：合并到同一个`gateway.log`文件中，因此记录器启动之前发生的启动失败仍然被记录
- 如果主机循环并重复 `EADDRINUSE` 或快速重启，请检查 `ai.openclaw.gateway` / `ai.openclaw.node` LaunchAgents 和 [ 网关故障排除 ](/gateway/troubleshooting#macos-launchd-supervisor-loop-with-duplicate-gateway%2Fnode-launchagents) 中的 launchd- 标记解决方法是否重复。

当 shell CLI 和正在运行的网关报告相同版本时，它们仍然可以属于不同的物理安装。检查 `openclaw gateway status --deep` 和 `openclaw health` 以及 shell 版本，以识别服务命令和运行时。终端 shim 路径（例如 `/opt/homebrew/bin/openclaw`）单独无法识别其包所有者。对于应用程序拥有的恢复，请在应用程序中选择**Retry**；它使用应用程序捕获的运行时和现有的修复所有者。保持恢复首选项不变。成功的健康状况验证了准备情况；所需的维修工作也必须在更新收据结算之前完成。

## <a id="app-hosted-lifecycle-and-updates"></a> App 托管的生命周期和更新

在本地启动期间，就绪探针拥有重试节奏和截止时间。网关启动时的连接拒绝不会留下指数连接延迟，从而阻碍就绪的网关。

该应用程序重新启动崩溃的子进程，延迟从一秒增加一倍到 30 秒，并在 60 秒正常运行后重置。五个快速故障会停止重新启动循环，并通过网关日志尾部显示故障。暂停或退出会关闭主机生命线并等待正常关闭，然后再强制退出无响应的进程组。

应用程序更新（包括使用相同公共版本进行重建）后，应用程序会播种新的运行时并以选定的托管模式重新启动其网关。该应用程序会耗尽其生产者并在重新启动网关之前通过选定的运行时运行Doctor。 Doctor 拥有核心迁移和配置的插件主机链接修复；该应用程序拥有服务发布和激活。拒绝所需的维修会使恢复处于待定状态，并在本地托管允许时恢复之前的服务。如果无法确认 Doctor 清理，应用程序将保持网关停止并等待恢复；在重试之前保留报告的监护诊断。有条件的插件警告仍然可见，并保留其待修复记录。它在删除旧版本之前验证运行状况。暂停的网关将保持暂停状态。种子安装从不运行 npm 自我更新；更新 OpenClaw.app 以更新其网关。即使旧应用程序删除了其 LaunchAgent，已暂停的旧应用程序管理的 Node 安装仍会保留后台服务托管。暂停时，应用程序会记录该首选项，而不检查或更改运行时。恢复时，它会恢复更新之前的托管 Node CLI；这也适用于命名配置文件。现有的应用管理的 Node 服务将继续执行其已安装的 CLI 的更新和修复流程（包括运行状况验证），并保留其运行时 pin。留在磁盘上的种子不采用附加的 Node 服务。如果无法验证旧版运行时，更新窗口会保持故障可重试，而不是用新的捆绑安装替换它。通过播种修复丢失的 `runtime/current` 链接；旧的构建会保留，直到稍后成功的更新重新建立以前的构建记录。无效的现有元数据仍然是可重试的失败。外部服务和渠道策略保留其现有的所有权规则。通过远程主节点，已安装的旧 Mac 节点服务将通过其自己捕获的 CLI 进行更新和验证。然后，应用程序拥有的本地配套网关将单独更新；更新收据将保持挂起状态，直到两个所需的运行时都正常。捆绑的私有工作线程不是 Node LaunchAgent，并且缺少的节点服务或命名配置文件不会触发旧节点生命周期工作。

要在发布应用程序上安装本地重建，请使用发布标识将其打包。默认调试包保留单独的权限、默认配置文件首选项和保存的网关配置文件，并针对发布应用程序的钥匙串项引发登录钥匙串提示。请参阅 [ 替换已安装的发行版应用程序 ](/platforms/mac/dev-setup#replace-an-installed-release-app)。

### <a id="existing-app-managed-node-services"></a> 现有应用管理的 Node 服务

对于加入后的默认配置文件，应用程序会在两次单独的尝试中迁移应用程序版本的应用程序管理的 Node 安装。较旧的安装首先使用其现有的托管更新程序来达到应用程序的版本。核心更新程序拥有备份、回滚和数据库迁移。失败的更新会将运行时保留在 Node 上，并显示现有更新失败和重试窗口。

在下次启动或重试时，一旦核心更新或修复完成并且版本匹配，应用程序将为其捆绑的运行时播种并使用匹配的具体 Bun、包和 SQLite 路径重新安装服务。它在完成迁移之前验证运行状况。如果该步骤失败，它将重新安装并验证保留的相同版本 Node 命令，然后通过“重试”显示失败。该应用程序保留旧的 Node 工具和 npm 包进行恢复。在迁移完成之前暂停并重新启动会保留 Node 恢复路径；它不会跳过版本更新或提前启用托管切换。

在通过捆绑的 CLI 进行应用程序拥有的安装之前，应用程序使用 `gateway status --runtime-intent-only --json` 读取具有相同 CLI、运行时和环境的运行时意图。当网关或 PostgreSQL 停止时，此本地检查仍然可用。在最终的本地监管检查后，它将观察到的修订和服务定义传递给安装人员。失败或未知的检查会停止安装。如果操作员在安装开始之前更改服务或运行时引脚，CLI 会保留该选择，并且应用程序会报告该选择，而无需重试或回滚。

Node 回滚和先前构建恢复使用此应用程序的捆绑 CLI 以及相同的运行时意图观察。安装程序恢复保留包的运行时和入口点，以及 Bun 的 SQLite 库，而不是它自己的库。恢复不需要运行失败的替换服务。操作员更改将被保留并报告，无需重试。如果应用程序的捆绑运行时丢失或不兼容，恢复将停止；重新安装 OpenClaw.app. 核心更新程序步骤仍然运行已安装的 CLI，并且不被此安装围栏覆盖。

通道策略安装、独立管理的服务以及具有保存的操作员运行时引脚的服务不会迁移。这包括指向应用程序 Node 工具的保存的 pin。此注册服务迁移不会在命名配置文件中自动运行。

较旧的应用程序在暂停时删除了 LaunchAgent。在本地模式下加入后，即使 LaunchAgent 不存在，幸存的应用程序管理的 Node 安装也会保留服务托管。这适用于使用精确或未设置的安装策略的默认和命名配置文件。暂停时，应用程序仅记录托管首选项；它不会更新、播种或安装网关。

在恢复时，较旧的 Node 安装使用其核心更新程序来达到应用程序的版本，而无需重新启动服务。然后，它会在同一启动尝试中播种 Bun、安装服务并验证运行状况。如果运行时切换失败，应用程序将重新安装并验证相同版本的 Node 服务，并通过“重试”显示更新失败。新的配置文件保留应用程序托管；不采用通道策略、仅附加配置文件和独立管理的安装。

兼容的较新 Node 安装将通过其现有选定的 CLI 恢复；应用程序不会将其降级或将其切换到应用程序的旧捆绑运行时。运行状况验证、所需的迁移完成和当前运行时所有权仍然控制恢复完成。

## <a id="version-compatibility"></a> 版本兼容性

私人工作人员必须匹配应用程序的构建来源，而不仅仅是其版本号。缺失或不兼容的工作负载会产生可见的工作错误；重建或重新安装应用程序。更改 CLI 通道或更新全局 CLI 不会修复此私有有效负载。未捆绑的 Swift 开发版本可以使用 checkout 的新鲜度感知源运行程序。

如果网关更新将共享状态数据库架构提升到超出私有工作人员支持的版本，则也更新并重新启动 OpenClaw.app。重新启动外部网关不会替换应用程序拥有的工作线程。来自较旧读取器的架构版本错误并不意味着升级后的网关数据库已损坏。

对于捆绑的本地网关，应用程序会根据其自己的构建来源来验证种子运行时； Node版本要求没有门设置。非捆绑开发版本根据其安装策略检查外部 CLI。连接的网关使用连接和运行状况检查，而不是本地 CLI 安装诊断。设置失败后使用**重试设置**，或者从菜单栏打开**连接…→连接**，修复后选择**重新检查**。当仪表板无法到达网关时，连接窗口仍然可用。

## <a id="state-directory-on-macos"></a> macOS 上的状态目录

将 OpenClaw 状态保存在本地、不同步的磁盘上。避免使用 iCloud Drive 和其他云同步文件夹；同步延迟和文件锁可能会影响会话、凭据和 Gateway 状态。

仅在需要覆盖默认设置时，才将 `OPENCLAW_STATE_DIR` 设置为本地路径。 `openclaw doctor` 会警告常见的云同步状态路径，并建议迁回本地存储。请参阅 [环境变量](/help/environment#path-related-env-vars) 和 [Doctor](/gateway/doctor)。

## <a id="debug-app-connectivity"></a> 调试应用连接性

使用捆绑的 macOS CLI 检查正在运行的应用程序：

```bash
openclaw-mac status --json
openclaw-mac primary show --json
openclaw-mac gateway list --json
```

应用程序的 CLI 安装程序在其配置文件管理的 `openclaw` 命令旁边链接 `openclaw-mac`。 You can also run `/Applications/OpenClaw.app/Contents/MacOS/openclaw-mac` directly.有关 `primary set`、保存的网关命令、配置文件和凭证输入，请参阅 [ 远程控制 ](/platforms/mac/remote#macos-app-setup)。

对于独立网关 WebSocket 握手和来自源签出的发现检查，现有的调试命令仍然可用：

```bash
cd apps/macos
swift run openclaw-mac connect --json
swift run openclaw-mac discover --timeout 3000 --json
```

`connect` 接受 `--url`、`--token`、`--timeout`、`--probe` 和 `--json` （以及客户端标识覆盖；运行 `--help` 查看完整列表）。 `discover` 接受 `--timeout`、`--json` 和 `--include-local`。需要将发现输出与 `openclaw gateway discover --json` 进行比较时，可借此区分 CLI 发现问题和应用端连接问题。

## <a id="smoke-check"></a> 冒烟检查

```bash
openclaw --version

OPENCLAW_SKIP_CHANNELS=1 \
OPENCLAW_SKIP_CANVAS_HOST=1 \
openclaw gateway --port 18999 --bind loopback
```

然后：

```bash
openclaw gateway call health --port 18999 --timeout 3000
```

## <a id="related"></a> 相关内容

- [macOS 应用](/platforms/macos)
- [Gateway 运行手册](/gateway)
