---
summary: "安装、启动、停止和卸载托管网关服务，包括包装器、堆大小调整和安装时身份验证"
read_when:
  - "将网关作为本机 OS 服务进行管理"
  - "恢复不可读的本机服务定义"
  - "通过包装器安装网关服务"
title: "管理网关服务"
sidebarTitle: "服务"
---

本机服务生命周期、恢复、包装器和托管服务选项参考。 [`openclaw gateway`](/cli/gateway) 参考的一部分。

## <a id="manage-the-gateway-service"></a> 管理 Gateway 服务

```bash
openclaw gateway install
openclaw gateway start
openclaw gateway stop
openclaw gateway restart
openclaw gateway uninstall
```

当配置无效或需要Doctor迁移时，`gateway stop`、`gateway uninstall`和`gateway restart`仍然可用，包括较新的OpenClaw版本编写的配置。他们控制记录的服务并根据 `openclaw doctor --fix` 指导将配置问题报告为警告。停止和卸载不会重写配置。当配置需要修复时，重新启动会保留已安装的服务定义；它的健康检查仍然报告网关是否回来了。 `gateway start` 在启动网关之前继续验证配置。

如果网关持有状态所有权超过五分钟而没有记录其侦听器绑定，`openclaw gateway stop`可以恢复停滞的启动，包括在发布其所有者身份之前冻结的启动。恢复验证记录PID以及终止前的进程启动时间，然后确认进程退出和状态所有权释放。新的工人心跳不会延长这个启动预算。所有权争夺陷入停滞PID、启动年龄和停止命令；您不需要手动删除锁定文件。

`gateway status`与网关就绪情况分开报告服务进程状态。当连接检查失败时，即使进程正在运行，也要检查服务日志。最近的日志错误与有界日志尾部的匹配证据，可能属于较早的运行，并且不建立当前进程的启动阶段。例行启动和关闭消息不会被报告为错误。医生和入门引导人员使用相同的错误选择。

在Windows上，计划任务停止并重新启动首先要求验证的网关耗尽并退出。较旧或无响应的网关会回退到终止捕获的进程树；保留替换实例。确认进程退出后重试瞬时 SQLite 共享错误；如果检查仍然不可用，该命令会发出警告并在继续重新启动之前检查网关端口是否空闲。

如果在停止预算内任务结算检查仍然不可用，则重启确认网关退出后仍尝试捕获任务，然后报告重启未验证。保留观察到的替换并拒绝重新启动。

即使服务进程已经在运行，`gateway start` 也会检查准备情况。仅在所选网关通过运行状况和就绪检查后，它才会报告 `already-running`；它不会重新启动仍在预热的进程。

如果 `gateway start` 达到其准备期限，而受管网关仍在启动，它将报告 `still-starting` 并退出，代码为 `2`。 The service keeps running； check `openclaw gateway status --deep` again before restarting it.崩溃的服务或外部侦听器仍然会产生故障。港口所有权本身并不能证明已经做好准备或排除预热的可能性。

### <a id="linux-maintenance-holds"></a> Linux维护搁置

在 Linux 上，`openclaw gateway stop` 请求 systemd 停止设备。显式停止会抑制其 `Restart=always` 策略，直到设备再次启动；它不会在下次登录或引导时禁用启动。 `gateway stop --disable` is macOS-only.对于非交互式维护，请使用 `openclaw gateway stop --force`。

systemd 掩码也拒绝显式启动。将面罩置于操作员控制之下：OpenClaw 不会自动移除面罩。如果您屏蔽了默认用户服务以进行维护，请在更新之前取消保留：

```bash
systemctl --user unmask openclaw-gateway.service
openclaw update
```

将 `openclaw gateway status --deep` 显示的单位和范围用于自定义配置文件或系统服务。在运行 `openclaw update` 的 **之前取消屏蔽**：预检会在替换文件或运行迁移之前拒绝屏蔽的受管单元。 Doctor 和 status 使用 unmask 命令报告 mask；医生不会取消保留或重新安装面罩装置。

如果某个单元在更新期间被屏蔽，更新程序将保留激活的候选单元并报告服务定义警告。去掉掩码，运行`openclaw gateway start`，查看`openclaw gateway status --deep`；被拒绝的开始并不能证明候选人不健康或网关准备好。

### <a id="recover-an-unreadable-native-service-definition"></a> 恢复不可读的本机服务定义

如果安装或托管更新报告 `SERVICE_DEFINITION_UNKNOWN`，请首先恢复对服务文件和本机服务管理器的访问。 `--force` 不会绕过未知的服务事实。使用 `openclaw gateway status --deep` 从拥有该服务的帐户和配置文件中检查所选服务。

对于格式错误的定义或不受支持的环境语法，请私下备份服务文件以及仅存储在其环境中的任何值。重新安装之前更正未解析或不受支持的值； OpenClaw 无法推断其预期值。然后，从外部 shell 使用相同的帐户和配置文件：

```bash
openclaw gateway uninstall
openclaw gateway install
openclaw gateway health
```

卸载会删除本机注册和启动器，保留配置、插件安装、会话状态和工作区。重新安装根据当前配置和安装输入重建服务环境；必须再次提供仅服务值。如果本机服务状态本身不可用，卸载也会拒绝：首先恢复本机管理器访问权限，而不是删除状态或绕过检查。

### <a id="lifecycle-requests-from-gateway-chat"></a> 来自网关聊天的生命周期请求

网关托管OpenClaw聊天控制为该会话提供服务的确切网关。批准的启动请求报告**网关已运行**无需发现或启动其他服务。重新启动可保持安全的本地重新启动行为。

在主机为其确切实例准备好停止后，批准的停止会报告 **Scheduled Gateway stop**。这确认了调度，而不是完成了终止。独占的前台主机会耗尽工作、完成拆卸并成功退出，而无需发现或更改已安装的服务。由 launchd 或 systemd 管理的主机验证本机所有权并准备执行程序，然后在要求本机管理器停止服务之前耗尽工作并完成拆卸。请求操作可以在该耗尽期间完成其审核、历史记录和响应提交；这并不能保证客户端在断开连接之前收到响应。

在正常的宽限期之后，停止会取消该网关拥有的剩余运行，并等待它们的命令和清理完成。普通停止不安排重新启动恢复。所需的清理失败会产生非零退出并阻止进程内替换，包括在网关准备就绪之前启动失败的情况。

所有权或准备失败会使网关继续服务并返回错误。 Linux 在所属的 systemd 管理器中使用独立的瞬态控制范围，因此停止命令在服务 cgroup 终止后仍然有效。在 macOS 上，托管停止请求普通 `launchctl bootout`，而不更改持久启用。如果本机管理器在最终停止切换期间发送 `SIGTERM`，则主机在加入清理后完成其正常退出，包括拥有的停止客户端。

在Windows上，独占网关进程的运行循环也在任务计划程序下使用优雅的进程退出。它不会按名称选择或停止任务。生成的任务管理器等待子进程树退出，并通过启动器传播子进程退出结果。其 [`RestartOnFailure` 策略](https://learn.microsoft.com/en-us/windows/win32/taskschd/taskschedulerschema-restartonfailure-settingstype-element) 不会重新启动成功的任务退出。自定义包装器可以有不同的退出或重新启动行为；单独检查他们的政策。此停止路径不会更改任务定义或其重新启动策略。外部监督的网关将停止请求直接发送给其主管。

如果 systemd 在拆卸后明确拒绝停止，并且同一本机实例保持活动状态且没有挂起的作业，则主机会记录失败的停止并在同一进程中启动新的网关生成。不确定的本机结果将记录为关闭失败，而不声明成功或启动进程内替换。意外断开连接后，请在重试之前从外部 shell 检查 `openclaw gateway status` 和本机服务日志。独立的 CLI 生命周期命令保留其服务管理行为。

### <a id="pin-the-service-runtime"></a> 固定服务运行时

当未提供运行时选项时，强制重新安装将保留记录在未固定服务中的受支持的 Node 或 Bun 可执行文件，而无需包装器。更新刷新执行相同的操作，无需创建 pin。当不需要运行时迁移时，包括现有但已卸载的服务，Doctor 也会默认使用记录的运行时。丢失、不可执行或不受支持的记录 Bun 将回退到自动 Node 选择。显式 `--runtime node` 或 `--runtime bun` 请求自动选择该运行时。

配置和高级入门首先建议支持的记录运行时间。如果没有，他们的运行时选择器会在没有受支持的 Node 可用时建议运行受支持的 Bun，否则为 Node。选择器选择是明确的：在 Bun-only 主机上选择 Node 会报告在替换服务之前 Node 不可用。 Quickstart 保持自动选择，无需创建运行时引脚。

使用 `--runtime-path` 将服务保留在操作员选择的 Node 或 Bun 可执行文件上，而不是自动运行时选择：

```bash
openclaw gateway install --runtime-path "/absolute/path/to/node" --force
```

该路径必须是绝对的、可执行的，并且在还提供该选项时与 `--runtime` 匹配。运行时必须通过当前的 Node/Bun 和 SQLite 功能检查。支持包含空格的路径；在你的 shell 中引用它们。

该 pin 保存在该托管服务的机器状态元数据中。强制重新安装、更新和定义修复保留它。丢失或不受支持的引脚会因诊断而失败，而不是默默地切换运行时间。如需替换，请提供另一个 `--runtime-path`；要返回自动选择，请运行 `openclaw gateway install --runtime node --force`，而不运行 `--runtime-path`。显式包装器仍然控制可执行文件并优先于引脚。安装会启动服务并可能重新启动现有网关。

### <a id="repair-a-launchagent-environment-wrapper"></a> 修复 LaunchAgent 环境包装器

在 macOS 上，生成的 LaunchAgent 使用生成的环境文件启动 shell 包装器，后跟 Gateway 命令。如果 `gateway status` 报告缺少环境文件参数，或者服务日志报告 **Invalid LaunchAgent 环境文件**，请从所属帐户和配置文件运行 `openclaw gateway install --force`，然后检查 `openclaw gateway status` 和 `openclaw health`。

在修复格式错误的定义之前，请备份 plist 和专用服务环境文件。如果其运行时参数也发生了更改，请使用 `--runtime-path` 显式选择预期的可执行文件，如上所示。必须再次显式选择服务定义已更改的记录运行时引脚。保留仅服务环境值可用于重新安装；格式错误的包装器参数可能会阻止 OpenClaw 读取先前的环境文件。

### <a id="install-with-a-wrapper"></a> 使用包装器安装

当托管服务必须通过另一个可执行文件启动时，请使用 `--wrapper`，例如 secrets manager shim 或 run-as helper。包装器会接收正常的 Gateway 参数，并负责最终使用这些参数 exec 执行 `openclaw` 或 Node。

```bash
cat > ~/.local/bin/openclaw-doppler <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
exec doppler run --project my-project --config production -- openclaw "$@"
EOF
chmod +x ~/.local/bin/openclaw-doppler

openclaw gateway install --wrapper ~/.local/bin/openclaw-doppler --force
openclaw gateway restart
```

你也可以通过环境变量设置包装器。`gateway install` 会验证该路径是否为可执行文件，将包装器写入服务的 `ProgramArguments`，并将 `OPENCLAW_WRAPPER` 持久化到服务环境中，以便后续强制重新安装、更新和 doctor 修复时使用。

```bash
OPENCLAW_WRAPPER="$HOME/.local/bin/openclaw-doppler" openclaw gateway install --force
openclaw doctor
```

要移除已持久化的包装器，请在重新安装时清空 `OPENCLAW_WRAPPER`：

```bash
OPENCLAW_WRAPPER= openclaw gateway install --force
openclaw gateway restart
```

<AccordionGroup>
  <Accordion id="command-options" title="命令选项">
    - `gateway status`: `--url`, `--port`, `--token`, `--password`, `--timeout`, `--no-probe`, `--require-rpc`, `--deep`, `--json`
    - `gateway install`：`--port`、`--runtime <node|bun>`（全新安装默认值：`node`）、`--runtime-path <path>`、`--token`、`--wrapper <path>`、`--force`、 `--json`
    - `gateway restart`: `--safe`, `--skip-deferral`, `--force`, `--wait <duration>`, `--preserve-definition`, `--json`
    - `gateway uninstall|start`: `--json`
    - `gateway stop`: `--disable`, `--force`, `--json`

  </Accordion>
  <Accordion id="service-runtime" title="服务运行时间">
    - Node 是主要且推荐的托管网关运行时，也是全新安装的默认值；如果没有显式的运行时、引脚或包装器，则在受支持的 Bun 下运行的安装将使用该可执行文件，而无需创建引脚（如果未找到受支持的 Node）。隐式重新安装保留受支持的记录的 Node 或 Bun 运行时，如上所述。
    - 对于未固定的服务，`gateway install` 检查托管服务中记录的 Node 可执行文件。如果丢失、不可执行或不受支持，安装将刷新服务而不需要 `--force` 并报告替换路径。当安装程序或更新刷新服务时，这也适用。修复优先选择当前 CLI 支持的 Node，保留稳定的 Homebrew 路径，然后检查支持的系统安装。自定义包装器可以控制其运行时间；受保护的服务定义仍然需要其部署所有者来修复它们。
    - Bun 1.4.3+ 和 WAL- 复位安全 `node:sqlite` 可作为 `gateway install --runtime bun` 的显式选择加入。

  </Accordion>
  <Accordion id="lifecycle-behavior" title="生命周期行为">
    - 当托管服务已在运行时，`gateway start` 报告正在运行的进程并使其保持不变。已加载但已停止的服务将像以前一样启动。
    - 在 Windows 上，显式 `gateway start` 在验证其选定的配置文件和命令后重新启用已禁用的计划任务。它保留注册的启动器和触发器设置。如果启用成功但启动失败，任务可能会保持启用状态；在重试之前，使用 `gateway status --deep` 检查相同的配置文件。 `update repair` 离开已离线停止的网关；当您打算将其联机时，请运行 `gateway start`。
    - 如果未安装托管服务，`gateway start` 将打印安装提示并以非零值退出。 `gateway restart` 可以首先恢复已安装但已卸载的 LaunchAgent 或经过验证的非托管网关；如果托管服务和恢复都不处理该操作，则它会打印相同的提示并以非零值退出。停止缺失的服务仍然是一个成功的空操作。
    - 如果 `gateway start` 或 `gateway restart` 需要修复过时的服务定义，而调用该命令的 shell 所解析出的状态目录、配置路径或端口与已安装的服务不一致，则命令会拒绝执行。请匹配这些环境覆盖项，或取消设置冲突的环境覆盖项；也可以使用 `openclaw gateway install --force` 有意地重新定位服务。
    - 当操作员拥有的 systemd 插件覆盖命令或工作目录时， 在 Linux、`gateway start` 和 `gateway restart` 上也会拒绝无效修复。使用 `systemctl --user cat <unit>.service` 检查有效单元，然后更新或删除该插入项。 `gateway install --force` 仅重写受管基本单元，并在覆盖仍然存在时发出警告； `Environment=` 插件仍受支持。
    - `gateway restart --preserve-definition` 仅重新启动可检查的本机服务，跳过自动定义修复，并检查已安装启动器端口的运行状况。它不会恢复非托管侦听器，并且不能与 `--safe` 或外部监督结合使用。在 macOS 上，它可以引导卸载的可读 plist，而无需重写 plist、环境、包装器或权限；拒绝本机激活失败，且没有文件修复。在 Windows 上，它还保留现有的启动条目。 `daemon restart` 别名接受相同的选项。
    - 在可写 Linux 服务安装或刷新期间，保持单元和状态目录固定并避免并发手动编辑。 OpenClaw 序列化自己的编写器并在检测到更改时中止，但无法协调任意文件系统编辑。在发布过程中移动或替换父目录可能会在移动的目录中留下临时文件；重试之前检查一下。
    - 在 macOS 上，回滚失败的 LaunchAgent 替换会恢复之前的 plist 字节和权限位，包括二进制 plist。如果恢复无法完成，该命令会报告失败。
    - 使用 `gateway restart` 重启受管服务。不要通过串联 `gateway stop` 和 `gateway start` 来替代重启。
    - 正在运行的Gateway记录其进程标识、侦听器模式和处于共享状态的supervisor。重新启动会在启动时保留经过验证的实时所有者，甚至在侦听器打开之前；健康超时不会使该所有者变得陈旧。即使安装了本机服务，记录的前台所有者也会收到有针对性的重启。计划任务清理保留外部主管和其他任务，识别错误中的所有者。当其参数与安装的任务命令完全匹配时，没有记录身份的旧网关仍然可以终止。如果没有该归因，保留的协调器会使进程继续运行，并要求您在启动后重试。未经验证的听众会被报告而不是被杀死。
    - 在非交互式 shell 中，`gateway stop` 需要使用 `--force`。交互式终端仍保持现有的无提示行为。对于自动化和测试，优先使用 `gateway run --dev`，或使用带有空闲端口的隔离 `--profile`。
    - 在 macOS 上，`gateway stop` 默认使用 `launchctl bootout`，这会从当前启动会话中移除 LaunchAgent，但不会持久化禁用状态——KeepAlive 自动恢复功能会继续对未来的崩溃保持活跃，而 `gateway start` 可以干净地重新启用服务，无需手动执行 `launchctl enable`。传入 `--disable` 可持久化抑制 KeepAlive 和 RunAtLoad，使 Gateway 在下一次显式执行 `gateway start` 之前不会重新生成；当手动停止应在重启后继续生效时，请使用此选项。
    - Gateway 生命周期变更会以尽力而为的方式，将键值审计记录追加到 `<state-dir>/logs/gateway-restart.log`，其中包括 CLI 启动、停止和重启操作、安全重启请求、supervisor 重启以及脱离式交接。
    - 生命周期命令支持使用 `--json` 进行脚本处理。
    - A 完成本机激活或接受的恢复但未通过运行状况检查的重新启动会发出 `action: "restart"`、`ok: false` 和 `result: "restart-health-failed"`，保留其错误、提示、警告和退出代码 1。此诊断不授权另一次激活。拒绝、意外异常和未经确认激活的定义修复不会发出此结果。预定的重启报告接受，但不声明后继者的健康状况。

  </Accordion>
  <Accordion id="managed-gateway-heap-sizing" title="托管网关堆大小">
    - 对于没有现有堆设置的托管 Node 网关，`gateway install` 将 `--max-old-space-size` 放置在 Node 的启动参数中，位于入口脚本之前。它显式清除服务环境中的 `NODE_OPTIONS`，因此环境服务管理器 preload/debug 标志不会泄漏到网关中。普通生成的 Node 进程不会通过 `NODE_OPTIONS` 继承新的自动预算； Node的fork和Worker继承规则不变。
    - Capacity 是有效物理 RAM 和 Node 报告的有效约束中较小的一个，从不波动自由 RAM。由于没有可用容量读数，Node 保持其本机默认值。安装程序的目标是 50% 的容量，标称下限为 2048 MiB，上限为 8192 MiB 或 25% 容量中的较大者。最终 75% 的容量上限保留了本机内存空间，并且可以将小型主机预算置于名义下限以下。
    - 示例：32个GiB容量选择8个GiB旧空间； 64 GiB 选择16 GiB； 128 GiB 选择 32 GiB。旧空间只是 V8 总堆的一部分，并且对总进程内存 （RSS） 也没有限制。提高上限不会预先分配该内存。
    - 在强制重新安装和医生修复过程中保留现有的托管服务堆控制，包括绝对旧空间、百分比旧空间和总堆标志。只有堆标志能够在受管理的 `NODE_OPTIONS` 清理中幸存；任意 preload/debug 标志都不会。将有意的 preload/debug 设置放入运营商拥有的 systemd `Environment=` 插件中，或者在启动 Node 之前将它们设置在 [ 安装的包装器 ](#install-with-a-wrapper) 中。不要编辑这些设置生成的服务环境。即使现有存储的数字类似于旧的自动默认值或超出新的建议，也会保留它们。
    - 当运营商拥有的服务覆盖控制`NODE_OPTIONS`（包括空值或重置）时，重新生成不会添加新的自动堆参数。运算符值和插入文件与托管库保持分离。现有的托管 argv 控件仍然存在：对于相同选项，Node 的 argv 胜过 `NODE_OPTIONS`，并且百分比旧空间大小优先于绝对旧空间大小。更换盖子之前检查两个表面。
    - Ambient 安装程序 `NODE_OPTIONS` 和安装程序自己的 Node 参数不会保存为网关堆设置。预算在安装时选择，并在服务流程开始时生效；网关运行时不会重新计算。单独升级 OpenClaw 不会调整正在运行的网关的大小，并且前台启动不会替换自身来应用此策略。
    - 安装程序的内存限制可能与未来服务的限制不同。 Node/libuv 报告依赖于平台，并且不保证检测到每个祖先 cgroup 限制；在增加预算之前检查实际的服务或容器限制。
    - 此策略适用于托管 Node 网关启动，而不是前台 `gateway run`、自定义管理程序、Docker 运行时命令、Bun 或节点主机服务。它们保留自己的运行时配置。有关显式本机 Node 设置，请参阅 [ 内存故障排除](/gateway/troubleshooting#gateway-exits-during-high-memory-use)。

  </Accordion>
  <Accordion id="auth-and-secretrefs-at-install-time" title="安装时验证和 SecretRefs">
    - 当令牌认证需要令牌且 `gateway.auth.token` 由 SecretRef 管理时，`gateway install` 会验证该 SecretRef 是否可解析，但不会将解析后的令牌持久化到服务环境元数据中。
    - 重新安装和更新保留活动环境 SecretRefs 的现有服务值，包括网关令牌和密码。在 Linux 和 macOS 上，在重写单元或 LaunchAgent 之前，旧内联值会移至生成的所有者专用环境文件中。这不会使服务凭证可用于交互式 CLI 命令。
    - 如果令牌身份验证需要令牌并且配置的令牌 SecretRef 未解析，则安装将停止，而不是保留后备明文。
    - 对于 `gateway run` 的密码认证，优先使用 `OPENCLAW_GATEWAY_PASSWORD`、`--password-file` 或由 SecretRef 支持的 `gateway.auth.password`，而不是内联 `--password`。
    - 在推断认证模式下，仅 shell 变量 `OPENCLAW_GATEWAY_PASSWORD` 不会放宽安装时的令牌要求；在安装受管服务时，请使用持久配置（`gateway.auth.password` 或配置中的 `env`）。
    - 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`，且未设置 `gateway.auth.mode`，则在显式设置模式之前会阻止安装。

  </Accordion>
</AccordionGroup>
