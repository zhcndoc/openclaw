---
summary: "`openclaw gateway restart`、安装身份、外部进程管理程序和网关分析"
read_when:
  - "安全、强制或有限等待重新启动网关"
  - "集成外部网关进程监督器"
  - "分析网关启动和重新启动时间"
title: "重启和监控"
sidebarTitle: "重启和监控"
---

重新启动标志，安装拥有主机服务、外部管理程序和分析。 [`openclaw gateway`](/cli/gateway) 参考的一部分。

## <a id="restart-the-gateway"></a> 重启 Gateway

```bash
openclaw gateway restart
openclaw gateway restart --safe
openclaw gateway restart --safe --skip-deferral
openclaw gateway restart --force
openclaw gateway restart --wait 30s
```

<Warning>
手动重启信号现在使用 `SIGUSR2`。 `SIGUSR1` 启动 Node 的检查器，不再重新启动网关。更新发送旧信号的脚本；更喜欢 `openclaw gateway restart` 进行服务感知重启。
</Warning>

如果重新启动无法验证实时服务所有者，则不会影响该进程。运行 `openclaw gateway status --deep`，修复报告的启动失败（例如，配置 Serve 时停止的 Tailscale 后端），然后运行 ​​`openclaw gateway start` 以等待准备就绪。单独加载的服务或正在运行的 PID 并不能证明网关正在提供服务。重新安装并不能解决未解决的启动依赖性或未知的进程所有权问题。

`--safe` 会要求正在运行的 Gateway 预检活跃工作，并在这些工作排空后安排一次合并重启。等待时间上限为 5 分钟；当预算耗尽时，重启会被强制执行。`--safe` 不能与 `--force` 或 `--wait` 组合使用。

`--skip-deferral` 仅绕过安全重启主动工作延迟门。即使报告了活动工作阻止程序，它也可以将网关移至关闭状态，但在进程退出之前，关闭阶段挂起回复耗尽仍然适用。它需要 `--safe`——当延迟被困在失控的任务上并且回复传递仍然可以解决时使用它。

`--wait <duration>` 会覆盖普通（非安全）重启的消耗预算。接受裸毫秒或单位后缀 `ms`、`s`、`m`、`h`、`d` （e.g. `30s`、`5m`、 `1h30m`）； `--wait 0` 无限期等待。与 `--force` 或 `--safe` 不兼容。

本机服务停止截止期限仍然适用：对于 systemd 的 330 秒限制，网关将耗尽时间限制在 315 秒，对于 launchd 的 20 秒限制，将消耗时间限制在 5 秒。两者都留有取消和清理的时间。这些上限也适用于 `--wait 0`。较长的模型或心跳超时不会延长它。如果可用，排出日志会报告观察到的最大上下文模型请求超时。

当关闭关闭准入时，排队的心跳唤醒将稳定为 `gateway-draining`，包括等待重试的唤醒。他们无法在耗尽的运行时间内开始另一个回合。已经运行的唤醒和待处理的最终回复写入保留其消耗宽限。

如果在关闭开始时工作人员库存已停用，则网关仍会耗尽其保留的工作人员隧道和工作空间传输。仅靠库存报废不会导致停工失败；其他清理失败仍然如此。

如果工作在 systemd 或 launchd 下的关闭截止日期时仍然忽略取消，则本机服务停止或主管拥有的重新启动会记录剩余的工作类别和待处理的所有者（包括命令通道和请求来源），写入诊断稳定性包，并以状态 `0` 退出。它不会重用未完成的运行时来进行进程内重新启动。这可以让请求的停止干净地完成，并让服务管理器启动一个新的网关以进行重新启动。

显式服务器关闭失败会保留退出状态 `1`，包括当最终提供程序清理超过本机关闭截止时间时。

准入关闭日志为关闭触发器命名，例如 `stop (SIGTERM)` 或 `restart (SIGUSR2: config reload: gateway.bind)`。进程故障会保留其原因，例如 `stop (process exit: unhandled rejection)`，而仅当托管进程关闭其生命线时才会报告主机生命线关闭。信号本身并不能识别其发送者：Node 不会公开发送者 PID 或命令。在一个进程中 5 分钟内出现 3 次相同信号，或者在进程生命周期内记录 3 次普通 SIGTERM/SIGINT 停止，都会产生一个提示，要求检查另一主管的 `openclaw gateway status --deep`。深层本地状态显示所选状态目录最后记录的关机原因和时间；在Linux上，它在检查本机服务时还会报告竞争的用户和系统服务单元。失败结果保留其特定的失败原因。

降级后，网关会拒绝架构比正在运行的构建支持更新的数据库。启动错误和 `openclaw gateway status --deep` 报告找到的和支持的架构版本、记录时的编写器构建以及拒绝构建。运行至少与支持这些架构的编写器一样新的版本，或者停止服务并恢复升级前的备份。启动保留退出状态 `78` 并在可能时停放托管 LaunchAgent。被拒绝的共享状态数据库无法记录新的生命周期行；错误日志解释了拒绝，深度状态报告它而不是不可用的关闭记录。

当共享状态数据库根本无法读取时（例如，文件损坏），`openclaw gateway status --deep` 会失败，退出状态为 `1`，并命名数据库路径和读取错误，而不是报告配置读取失败。停止 OpenClaw 进程，然后从经过验证的备份恢复该文件，正如 `openclaw doctor` 还建议的那样。

当清理无法在关闭截止时间之前完成时，Foreground/manual 网关、`OPENCLAW_NO_RESPAWN=1` 选择的进程内重新启动以及其他监控程序将保留退出状态 `1`。

`--force` 立即开始重启并关闭新的准入。当前的 CLI 提供正常的消耗预算，但受本机服务关闭期限的限制。在清理之前，只有在截止日期前剩余的工作才会被取消。延期预算已过期的安全重启不会获得第二次消耗预算。普通 `restart` 通常使用服务管理器重新启动路径。

来自老呼叫者的强制请求，如果不提供耗尽预算，则最多需要 45 秒的时间来耗尽。他们的 60 秒更换窗口预留 10 秒用于清理，5 秒用于更换。这同样适用于交互式和更新调用者。如果在耗尽到期时仍有工作，网关会在其重新启动历史记录和日志中记录一条警告以及剩余工作类别，然后通过正常的终端恢复取消该工作。提供预算的呼叫者保留该预算，但须遵守本地服务截止日期。

在升级期间，重新启动会在现有网关状态中记录其原因和耗尽选项，而无需在旧网关仍在运行时启动架构迁移。如果不存在状态数据库，它会记录已跳过的意图记录并继续重新启动。

当更新程序调用已安装的 `gateway restart` 命令时，其现有更新标记会在观察到托管进程正在运行后启用五分钟启动看门狗。这使得较旧的更新程序可以完成缓慢的第一跳启动，而无需传递新选项。看门狗包括迁移、监听和健康阶段；相变不能延长其上限。由较新的更新调用者提供的显式准备预算优先。普通独立重新启动仅在同一正在运行的网关推进启动阶段或获取、更新或完成观察到的同一进程迁移时等待超出标准准备预算，最多五分钟，然后报告最后一个阶段的 `still-starting`（出口 2）和下一步的 `openclaw gateway status --deep`；没有进展的启动在标准预算下仍然会失败（出口 1），而新观察到的迁移租约在被视为停滞之前会获得一个心跳间隔加上轮询宽限，并且其观察到的完成会在同一上限内赢得一个新的准备窗口。请参阅 [ 重新启动恢复 ](/gateway/restart-recovery)。

在 Windows 上，托管 `gateway start` 和 `gateway restart` 允许最多 90 分钟的冷启动时间，使用三个默认更新步骤预算进行激活、加载和准备。托管更新恢复使用相同的限额，除非明确的 `update --timeout` 提供其每步预算。隐式 Windows 更新准备情况检查使用观察到的启动持续时间的十倍，范围在 90 到 120 分钟之间；天花板不能截断冷启动地板。这可以容纳慢速存储上的大型代理数据库；退出或健康检查失败的服务仍然可以更早地报告失败。在截止日期前仍处于启动状态的实时网关将继续运行并报告为 `still-starting`；更新保留就绪警告和恢复备份。

在 Windows 上，从网关服务进程启动的简单重启（包括代理的 shell 命令）会自动使用安全重启路径。正在运行的网关拥有延迟的计划任务切换，因此停止其进程树无法在重新启动之前杀死调用者。这需要一个可达的网关；该命令确认重新启动请求，而不是后继运行状况。之后使用 `openclaw gateway status` 验证恢复情况。

Windows 切换最多等待三分钟，以便传出网关退出，然后请求任务启动。仅在具有预期可执行文件的不同进程和网关入口点侦听配置的端口之后，它才会在 `logs/gateway-restart.log` 中记录 `restart finished`。此监听器检查使用相同的 90 分钟冷启动时间；它并不能证明渠道准备就绪。标记为 **Running** 的任务或单独的成功启动请求不算作恢复。

如果没有出现替换侦听器，日志将记录 `restart failed` 和要从外部终端运行的配置文件感知 `openclaw gateway restart --force` 命令。切换不会结束其自己的计划任务：在具有作业对象包含的安装中，这样做可能会在记录结果之前终止观察者。过时的正在运行的任务仍可能需要此外部恢复。

在 macOS 上，当 `openclaw gateway restart`、`stop`、`install` 或 `uninstall` 在托管 LaunchAgent 的进程树（包括代理的 shell 命令）内运行时，OpenClaw 检测到launchd 的服务环境，或者当手写的 plist 省略这些变量时，来自 PID launchd 作业报告的进程祖先。重新启动将交给独立的助手，这样 `kickstart -k` 就无法杀死调用者。停止、安装和卸载拒绝并要求您从外部 shell 运行命令。

没有网关服务标记的外部终端、外部监督的网关、节点服务和非 Windows 呼叫者保留其现有路由。显式 `--force`、`--wait`、`--preserve-definition` 或 `--skip-deferral` 也保留其现有行为和验证；它们不会隐式启用 `--safe`。

<Warning>
行内 `--password` 可能会暴露在本地进程列表中。建议使用 `--password-file`、环境变量或由 SecretRef 支持的 `gateway.auth.password`。
</Warning>

### <a id="install-identity"></a> 安装身份

服务管理（`install`、`start`、`stop`、`restart`、`uninstall`、医生服务修复和自更新服务处理）属于拥有主机服务的安装。这是 OS 帐户主目录下的标准 `.openclaw` 目录，或者是其中的命名配置文件项目的 `.openclaw-<profile>` 目录。命名配置文件使用不同的本机服务身份。

`OPENCLAW_HOME` 可以显式选择 OS 帐户主目录，包括该主目录的文件系统别名。进程主目录（`HOME` 或 `USERPROFILE`）和有效 OpenClaw 主目录必须解析为帐户主目录。指向其他地方的 `OPENCLAW_HOME`、`OPENCLAW_STATE_DIR` 或 `OPENCLAW_CONFIG_PATH` 被视为隔离状态并被跳过。重新定位或复制的状态树无法采用和重写帐户的主机服务。

Doctor 还会验证已安装服务中保存的环境。标准 `OPENCLAW_HOME` 不会阻止 `openclaw doctor --fix` 进入维护和导入旧凭证。 Doctor 仍然是迁移所有者：它会验证导入的凭据并在正常运行时读取恢复之前存档原始字节。

在 macOS 和 Windows 上，由原生服务管理的配置文件名称必须为小写。仅运行时使用的配置文件仍可使用大写，但在普通不区分大小写的文件系统上，`Main` 和 `main` 等仅大小写不同的名称会共享路径，因此无法安全地拥有彼此独立的原生服务。在 macOS 上，小写名称 `gateway` 和 `node` 也无法用于原生服务管理，因为其历史 LaunchAgent 标签会与默认的 Gateway 和 node-host 服务发生冲突。

命名配置文件还必须使用从 `OPENCLAW_PROFILE` 派生的本机服务标识。业务管理前取消设置`OPENCLAW_LAUNCHD_LABEL`、`OPENCLAW_SYSTEMD_UNIT`或`OPENCLAW_WINDOWS_TASK_NAME`；自定义身份仍然可用于默认配置文件或运行时 only/external-supervisor 设置。

在 Linux 上，发现还可以识别旧版 `openclaw-<profile>` 单元名称。当自定义系统单元的 OpenClaw 启动程序、服务帐户、配置文件和 state/config 路径标识该安装时，该自定义系统单元可以属于默认安装。 Discovery 使用 systemd 的有效命令和环境，包括插件和环境文件。如果多个自定义单元匹配或包装器使它们的身份不清楚，请使用 `OPENCLAW_SYSTEMD_UNIT` 指定预期单元； OpenClaw 不选择第一个带有其标记的单元。

仅当两个管理器加载的网关命令识别出选定的帐户、配置文件、state/config 路径和匹配的端口选择时，Doctor 才提供重复的用户单元清理。确认后，它会重新检查单位。不同或无法验证的身份使用户单元留在原地。 Cleanup 仅删除已确认的用户单元，然后报告任何剩余的匹配用户单元或无法验证的发现；另一个单元需要在稍后的医生运行中进行自己的检查和确认。

在 Linux 上，在更改配置、身份验证令牌或服务文件之前，`openclaw gateway install --force` 拒绝密封的 systemd 服务定义或无法验证写入权限的服务定义。该错误保留其 `SERVICE_DEFINITION_SEALED` 或 `SERVICE_DEFINITION_UNKNOWN` 前缀，并添加原因标记和下一步操作，而不打印私有路径、配置、环境值或底层检查错误。

对于 `[unsafe-permissions]`，在本地检查指定的工件类别。服务目录为`~/.config/systemd/user`；在全新安装时，其最近的现有祖先可能是 `~/.config`。服务状态目录属于所选的配置文件。检查目录元数据，而不是文件内容：

```bash
ls -ld ~/.config ~/.config/systemd ~/.config/systemd/user
```

全新安装时缺少目录是正常的。确认受影响的路径是您的且不是故意共享的后，使用 `chmod go-w <path>` 删除 group/other 写入访问权限，然后重试相同的命令。模式 `0700` 适用于私有目录。不要递归地 chmod、获取系统路径的所有权或使用 `sudo`/`--force` 来绕过检查。外国拥有的文件和密封安装需要部署所有者；检查失败需要首先恢复文件系统或本机服务管理器访问。

类型范围的 `service.d` 默认值被检查为共享只读输入，不需要写入访问权限。根拥有的选定单位和单位特定的插入项仍然受到保护。

### <a id="external-supervisors"></a> 外部监督器

仅当另一个进程管理器负责 Gateway 生命周期时，才设置 `OPENCLAW_SUPERVISOR_MODE=external`。在此模式下：

- `openclaw gateway restart` 保留现有的安全、强制和有界等待行为，同时针对已验证的正在运行的网关而不是 launchd、systemd 或任务计划程序。精确锁定重启交付在该网关内部运行，因此替换 CLI 在旧进程移交之前不会迁移共享状态。
- 原生的服务安装、启动、停止和卸载操作会被拒绝，并提示使用外部监督器。
- OpenClaw 自更新会被拒绝，以便由监督器停止 Gateway、替换并完成运行时，然后安全地重新启动它。
- 从新进程发起的重启会在干净退出前写入一个有界的 SQLite 交接记录。若持久化失败，Gateway 会回退到进程内重启，而不是在没有可消费交接记录的情况下退出。

外部监督器还可以声明共享状态写入的持久所有权：

```bash
OPENCLAW_SUPERVISOR_MODE=external \
  openclaw database ownership claim --manager gateway-supervisor --json
```

在声明之前，请通过外部监控器停止网关并停止任何嵌入式代理。 CLI 强制执行此程序：它拒绝实时网关或嵌入式代理所有者，并在提交声明时拥有独占的离线所有权。同时停止并验证每个早于 2026.8.1 的 CLI、Doctor、更新程序和本机应用程序进程，这些进程可以写入共享状态数据库。所有权合同 （[#121069](https://github.com/openclaw/openclaw/pull/121069)） 之前的进程不了解所有权行，因此无法追溯。仅在剩余的每个编写者使用所有权感知代码并携带 `OPENCLAW_SUPERVISOR_MODE=external` 后才声明。

重复声明相同的稳定管理者标识符不会产生额外效果；另一位经理被拒绝。没有自动声明或取消声明路径。一旦声明，未标记的可写共享状态打开在权限、模式迁移、附加修复、压缩或其他突变之前就会失败。只读访问权限仍然可用。这是针对意外未标记的同用户写入者的保护，而不是身份验证或租赁协议。

对于升级和回滚，让主管创建一个没有 SQLite sidecar 的合并 WAL- 一致复制快照，然后在激活之前运行目标版本自己的 `openclaw database preflight <copied-state.sqlite> --json`。仅数字模式版本并不能证明相同版本的附加形状是兼容的。请参阅 [ 数据库架构](/reference/database-schemas)。

`OPENCLAW_SERVICE_REPAIR_POLICY=external` 仍然是独立的 Doctor 修复策略。它不会声明运行时所有权；需要同时使用这两种行为的监督器应同时设置这两个变量。

外部监督器可以通过隐藏的机器契约协商并消费重启交接：

```bash
openclaw gateway restart-handoff capabilities --json
openclaw gateway restart-handoff consume --expected-pid <pid> --json
```

协议版本 `1` 支持 `consume` 操作。消费会在一次立即的 SQLite 事务中验证预期 PID 和有界交接字段。被接受的交接会在返回成功之前被删除，因此并发或重放的消费者不能同时接受它。PID 不匹配会保留给匹配的所有者；缺失、过期和无效的记录都不会授权重启。

有效的机器请求返回 JSON，退出代码为 `0`，包括非重新启动结果。无效参数返回 `reason: "invalid-expected-pid"`，退出代码为 `2`；状态存储失败返回 `reason: "store-unavailable"`，退出代码为 `1`。主管应该检查 `capabilities` 他们将使用的确切运行时或启动器，而不是从 OpenClaw 版本字符串推断支持或直接读取私有 SQLite 模式。

外部监管者实施还应应用这些验收规则：

- Bound 功能检查超时，该超时考虑了部署的运行时和存储上的完整 CLI 冷启动延迟，而不是假设热启动计时。
- 如果能力协商或切换消耗拒绝替换，则立即以非零状态退出，以便流程管理器的恢复策略可以运行。如果没有 Gateway 子级或侦听器，请勿保持活动状态。
- 将主管进程活跃度视为与替换启动和通道准备情况不同。仅当新网关拥有其侦听器且 `/startupz` 返回 `status: "started"` 后才报告成功；单独监控 `/readyz` 的配置通道运行状况，而 `/healthz` 仅证明活跃性。

### <a id="gateway-profiling"></a> Gateway 性能分析

- `OPENCLAW_GATEWAY_STARTUP_TRACE=1` 记录启动期间的阶段计时，包括每阶段 `eventLoopMax` 延迟和插件查找表计时（安装索引、清单注册表、启动计划、所有者映射工作）。 `process.bootstrap` 细分包括早期的 CLI 导入、配置、数据库准入、会话清单和工作区准备情况。每个引导步骤都会记录其与进程相关的 `start`、持续时间、调用计数和可用队列计数；重复的呼叫聚集在一个名字下。 `ready` 跟踪重复 `bootstrapSteps` 中的步骤名称和总计。嵌套步骤重叠，因此不应将它们的持续时间相加。
- `OPENCLAW_GATEWAY_RESTART_TRACE=1` 记录 `restart trace:` 线路，用于重新启动信号处理、活动工作消耗、关闭阶段、下次启动、就绪时序和内存指标。普通停止也会以 `stop.signal.received` 和 `stop.drain` 计时开始新的跟踪。指定的关闭步骤和粗略关闭阶段在等待之前发出 `.begin`，然后是它们稳定时的持续时间；不匹配的开始标识已进入的尚未解决的阶段。这些阶段不会单独为每个嵌套清理操作计时。
- `OPENCLAW_DIAGNOSTICS=timeline` 配合 `OPENCLAW_DIAGNOSTICS_TIMELINE_PATH=<path>` 会为外部 QA harness 写出尽力而为的 JSONL 启动诊断时间线（等同于配置 `diagnostics.flags: ["timeline"]`；该路径仍然只能通过环境变量设置）。再添加 `OPENCLAW_DIAGNOSTICS_EVENT_LOOP=1` 可包含事件循环样本。
- `pnpm build` 然后执行 `pnpm test:startup:gateway -- --runs 5 --warmup 1`，将 Gateway 启动与已构建的 CLI 入口进行基准测试：首次进程输出、`/healthz`、`/readyz`、启动 trace 时序、事件循环延迟以及插件查找表耗时。
- `pnpm build` 然后 `pnpm test:restart:gateway -- --case skipChannels --runs 1 --restarts 5` 在 macOS 或 Linux 上对进程内重新启动进行基准测试（Windows 上不支持；重新启动需要 `SIGUSR2`）。使用 `SIGUSR2`，在子进程中启用两个跟踪，并记录下一个 `/healthz`、下一个 `/readyz`、停机时间、就绪计时、CPU、RSS 和重新启动跟踪指标。
- 会话投影预热与会话准入和请求上下文准备之后的传输设置重叠。准备状态仍然等待初始会话实现和中断轮流恢复；当这些门保持待定状态时，侦听器可以处于活动状态。更新金丝雀继续推迟会话目录直到激活。
- `/healthz` 表示存活状态；`/readyz` 表示可用就绪状态。请将 trace 行和基准输出视为归因信号，而不是从单次时间跨度或样本得出的完整性能结论。

对于持久启动跟踪，请在全局 `~/.openclaw/.env` 文件（`%USERPROFILE%\.openclaw\.env` 在 Windows 上）中设置 `OPENCLAW_GATEWAY_STARTUP_TRACE=1`，或使用配置 `env.vars` 块。参见[环境变量](/help/environment)。服务定义中的现有启动跟踪分配（包括 Windows `gateway.cmd` 中的 `set "OPENCLAW_GATEWAY_STARTUP_TRACE=1"`）也可以在 `openclaw gateway install --force` 和服务修复中保留。生成的服务价值仍然具有权威性；不保留任意 `OPENCLAW_*` 脚本编辑。

如果没有跟踪，停止和重新启动会在第一个耗尽快照时报告非零活动工作类别计数，并且在仍待处理时最多每 30 秒报告一次。这些报告省略了任务身份和请求来源；类别可以重叠。拆卸前（包括耗尽超时或故障后）的普通停止记录 `active-work drain settled; beginning server close`。诊断不会改变排水预算或服务经理的停止期限。

客户端断开连接后，交互式设置可用于重新连接。网关停止或重新启动会在耗尽工作之前关闭设置提示。已经正在进行的设置写入可能会完成，但安装程序不会在关机期间等待另一个答案。网关再次启动后，重新打开设置并检查保存的设置。
