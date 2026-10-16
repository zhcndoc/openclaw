---
summary: "恢复网关服务、远程网关、Control UI 资产和网关代币"
title: "网关和服务恢复"
read_when:
  - "医生报告网关服务丢失、过时或不受管理"
  - "您遇到持续的未经授权的错误或丢失 Control UI 资产"
---

这些部分涵盖修复网关服务、其远程和 Control UI 先决条件以及它启动时使用的凭据。

## <a id="gateway-service-recovery"></a> 网关服务恢复

在选择恢复操作之前，运行 `openclaw gateway status --deep` 以检查已安装的服务及其运行时。使用 `openclaw gateway install` 表示缺少的服务，使用 `openclaw gateway start` 表示已安装但未加载的服务，或者使用预期安装中的 `openclaw gateway install --force` 来替换其服务定义。外部管理的服务仍然属于其主管。

Doctor 还会将该服务的包路径和版本与活动的 CLI 进行比较，而无需网关连接。更新完成和独立 `openclaw doctor --fix` 协调合格的、之前通过本机安装程序运行的托管服务；更新时间 Doctor 报告偏差并将发布推迟到最终确定。 Doctor 可以在经过验证的、可写的打包服务中自动刷新仅安装的漂移。它还可以在恢复因维护而停止的网关之前，通过更新安装程序的备份事务修复已识别的过时本机策略，例如丢失的 systemd `KillMode=mixed` 或零计划任务重新启动重试。医生报告更改了密钥和备份路径；支持的自定义设置在重写后仍然存在。自动本机策略修复保留未知的操作员编辑和不确定的定义以供操作员审查。其他命令或凭证更改仍然需要交互式确认。成功独立 `openclaw doctor --fix` 后，已停止的托管网关将启动并在其服务针对当前安装时验证准备情况，并且最终检查积极验证其所有权和离线状态。如果检查失败、超时或所有权不确定，Doctor 会记录原因并停止服务。在手动启动之前用 `openclaw gateway status --deep` 检查它。更新时医生将激活留给更新程序。针对另一个安装的已停止服务将保留其定义和停止状态；从预期安装运行报告的配置文件感知 `openclaw gateway install --force` 命令来协调它（安装可能会启动服务）。当未配置端口时，它会保留服务的配置文件和显式服务端口。源签出、部署拥有的覆盖和不可用的本机检查不会授予自动安装修复权限；医生报告不匹配情况和下一步修复操作。

如果 Doctor 在安装过程中失去维护所有权，它将停止进一步安装或激活，并在可以验证替换的所有权时恢复其捕获的服务定义。警告报告定义是否未更改、已恢复或需要检查；主动维护或更新完成后，请遵循报告的状态和安装程序命令。未经验证的恢复使恢复处于挂起状态，而不是要求安全重启。

当显式修复停止托管网关时，Doctor 会等待该进程在服务停止期限内释放共享状态生命周期所有权，然后再修复状态。如果所有权仍然保留，Doctor 会发出警告，恢复服务，并拒绝不安全的维修。在 macOS 上，失败的激活尝试会恢复 LaunchAgent 注册，以便其 KeepAlive 策略可以恢复；该错误报告作业是否已加载，并在引导程序也失败时给出恢复命令。出现不明确的 `kickstart` 错误，然后使用引导恢复进行检查以确认作业不存在；成功激活然后正常完成。保持加载状态的作业的失败仍然可见。当本机检查验证作业已加载时，引导修复还接受操作进行中响应，而无需重新启动运行状况良好的网关。在修复报告成功之前，已停止的作业将启动。持续引导 I/O 故障仍然可见，需要进行服务诊断。

获得两名维护协调员后，医生重新检查更新入院情况。如果它必须在修复开始之前取消，它将反转其自身的停止状态，同时其本机服务托管仍然有效。正常的修复后恢复仍然需要当前更新许可。

在服务检查期间，Doctor 在重新检查实时更新所有权后重复使用已记录的更新继续收据。这避免了在服务经理的检查期限内重复对未更改的收据进行完整的数据库完整性扫描。新的延续或接管收据仍使用经过验证的账本编写者。

在 Linux 上，嵌套服务管理器检查共享截止时间核算，不包括同步所有权和准入检查。因此，缓慢的数据库检查不会消耗管理器 I/O 的津贴。每个权限检查仍然运行；经理的电话、取消、服务停止和耗尽期限仍然有限。数据库检查仍然会增加总命令时间。

恢复后，Doctor 使用 `openclaw gateway start` 使用的共享运行状况探针验证网关。正在运行的进程或拥有的侦听器本身并不意味着它已准备就绪。如果在服务运行时准备预算到期，Doctor 会让其运行并警告准备情况尚未验证，包括观察到的启动阶段（如果可用）。运行`openclaw gateway status --deep`或`openclaw gateway diagnostics export`进行调查；修复仍然完成。

当退出的容器在绑定安装的状态目录中留下网关锁时，Doctor 将使用网关启动的命名空间和心跳策略。对于无法验证的容器所有者，它会等待长达 95 秒（受任何活动服务停止期限的限制），并在上次更新时间超过 90 秒后回收锁定。已经失效的锁不需要等待。等待消息命名持有者的主机、PID 命名空间和续订年龄。如果持有者继续更新，Doctor 会保持状态不变并报告重试之前需要等待多长时间。同一主机上经过验证的活体持有者必须先停止，然后才能进行普通修复；医生将其命名为PID。更新驱动的前台关闭保留其现有的消耗预算。不要删除活动网关可能仍拥有的锁。

一旦 Doctor 拥有维护权，它就会检查更新请求者在同一所有权范围内的当前权限。它自己的维护窗口不会触发锁等待或离线维护拒绝；请求者撤销仍然会停止修复。

当维护无法获取状态所有权时，Doctor 会包含底层架构或文件系统错误。较新的 OpenClaw 版本的共享状态数据库保持不变；使用支持该数据库版本的版本重新运行 Doctor。

如果Doctor的输出管道关闭（例如，`openclaw doctor --fix | head -20`），或者Doctor在维护期间收到SIGINT、SIGTERM或SIGPIPE，则它会等待承认的维修工作和服务恢复后再退出。普通修复错误还会使用当前保存的配置恢复 Doctor 停止的托管服务。等待批准提示会取消，而不会中断已承认的写入。具体的数据风险、丢失的服务权限和未经验证的子清理仍然可以防止不安全的激活并报告恢复操作。

对于旧服务或冲突的 systemd 范围，请以交互方式运行 `openclaw doctor` 以查看结果并确认支持的清理。 Cleanup 报告它删除或跳过的内容；它不保证将安装替代服务。显式修复维护会跳过此单独的清理流程。

如果 Doctor 停止托管网关进行修复，则失败或超时的恢复检查会产生警告，并且 Doctor 仍会尝试启动该服务并验证准备情况。实时维护托管和更新许可仍然适用；观察到的服务命令、帐户或管理器的更改需要操作员审查。明确的所有权拒绝将报告为拒绝，而不尝试启动被拒绝的服务。在 systemd 上，Doctor 在停止服务之前保留本机管理员和单元身份，并在激活时重新验证它。如果无法捕获该身份，Doctor 会让服务继续运行并报告检查警告；实时状态编写器仍然可以防止不安全的离线修复。

当服务检查阻止修复时，Doctor 和 `gateway status --deep` 命名失败的本机检查：

- **Linux 检验期限已过：** 经理检查或其 custody/admission 警卫用尽检验预算。这并不意味着用户会话总线丢失。检查上报的恢复结果，恢复后运行`openclaw gateway status --deep`。
- **Linux 用户会话总线不可用：** 检查服务帐户的 `XDG_RUNTIME_DIR` 和 `DBUS_SESSION_BUS_ADDRESS`。单独运行 `systemctl --user` 命令是不够的：有效的服务检查还使用 `busctl --user`。在 Debian/Ubuntu 上，安装 `dbus-user-session`，然后从该帐户的用户会话运行 `systemctl --user start dbus.socket`。
- **Check无法启动（`EACCES`/`EPERM`）：**检查作为服务帐户的可执行权限和目录访问权限。本机检查从文件系统根运行，因此通过 `sudo -u` 继承的不可访问的操作员目录不会阻止检查。
- **macOS GUI 域不可用：** 以目标用户身份登录桌面，然后再管理其 LaunchAgent。 `gui/<uid>` 的错误 125 并不表明系统 LaunchDaemon 存在。
- **macOS 系统域不可用或检测到系统 LaunchDaemon：** 具有 root 检查 `sudo launchctl print system/<label>` 并通过其部署所有者停止自定义守护程序。要保留该主管，请使用现有的 `OPENCLAW_SERVICE_REPAIR_POLICY=external` 策略将 Doctor 作为国有帐户运行。保留服务使用的相同 `HOME`、`OPENCLAW_STATE_DIR` 和 `OPENCLAW_CONFIG_PATH` 选择器。参见[现有系统LaunchDaemons](/gateway#existing-system-launchdaemons)。

OpenClaw 不管理自定义系统 LaunchDaemons。使用另一个帐户的 `HOME` 以 root 身份运行 Doctor 不会添加该功能，并且可以创建 root 拥有的状态文件。

对于任一平台，当外部主管拥有网关时，让该所有者停止它并使用 `OPENCLAW_SERVICE_REPAIR_POLICY=external` 作为国有帐户运行 Doctor。该现有策略跳过本机维护检查和服务突变；它保留 Gateway/state 协调员和代理数据库租约检查。关闭和重新启动仍由部署所有者负责。失败的本机检查永远不会被视为网关已停止的证据。

健康诊断还将本机服务检查留给外部所有者。他们仍然检查所选端口、实时网关所有权和启动迁移活动。如果没有人在场，Doctor 会立即报告不可用的网关，而不是等待不相关的本机服务管理器。实时或启动的网关保留共享的准备预算。

对于诸如 `openclaw@.service` 和 `User=%i` 之类的系统模板，检查将遵循当前账户的实例 （`openclaw@<user>.service`），同时保留共享模板。在系统服务所有者停止其实例后，以该帐户运行 Doctor。

Doctor 在初始检查时和批准的重启后使用共享的 60 秒准备预算等待启动本地网关。它报告等待时观察到的启动阶段。在截止日期仍报告启动的网关会产生非失败的“仍在启动”结果； Doctor 让它继续运行并且不提供再次重启。没有启动证据的连接失败仍然是诊断失败。当已安装的更新程序调用候选 Doctor 时，这也适用。

插件初始化和数据库启动检查可能会使冷启动在已加载或较旧的主机上花费超过十秒的时间。让现有网关完成启动，然后再请求单独重新启动。远程网关诊断继续使用配置的远程目标。

## <a id="remote-gateway-recovery"></a> 远程网关恢复

对于 `gateway.mode: "remote"`，失败的网关运行状况检查不会触发本地服务安装、启动、重新启动或引导提示。检查远程 URL、凭据和 SSH 隧道或网络连接。如果网关本身需要恢复，请在运行它的主机上运行服务命令。环回远端URL可以是SSH隧道；它不会使网关成为本地服务。

请参阅 [ 远程访问 ](/gateway/remote) 进行连接检查。其他 Doctor 配置和状态检查仍遵循所选的 [posture](/cli/doctor/running#postures)。

## <a id="control-ui-assets"></a> Control UI 资产

对于源安装，Doctor 可以构建缺失的 Control UI 资产或在协议更改后重建过时的资产。其手动构建命令包括检测到的签出路径（`pnpm --dir <checkout> ui:build`），因此您可以从另一个目录运行显示的命令。使用完整的命令，包括其引用的路径，而不是在不相关的项目中运行 `pnpm ui:build`。

没有 UI 源的打包安装会收到重新安装指导，而不是源构建命令。 Doctor 不会下载源代码来修复打包安装。

Doctor 报告旧安装留下的过时 `cache/control-ui-assets` 目录。 `openclaw doctor --fix` 删除它们；更新命令的 Doctor pass 也会运行此修复。清理失败只是警告，不会中止 Doctor。

## <a id="invalid-gateway-tokens"></a> 网关令牌无效

Doctor 会标记空白或包含文字字符串 `undefined` 或 `null` 的活动网关令牌。网关在启动时拒绝这些值。要替换内联令牌，请运行 `openclaw doctor --fix --generate-gateway-token`，然后重新启动网关。对于 SecretRef，改为旋转外部秘密源； doctor 保留其参考并保持密码、`none` 和可信代理身份验证模式不变。不存在的令牌仍使用正常的启动令牌生成流程。

已知的密文占位符（包括 `__OPENCLAW_REDACTED__`）也是无效凭据。 Doctor 和 `gateway status --deep` 会命名受影响的引用，即使较旧的网关进程仍然使用其以前的内存中令牌也是如此。对于商店支持的网关令牌，请运行 `openclaw doctor --fix`（或 `openclaw doctor --generate-gateway-token`）。 Doctor 验证数据库备份，重新生成引用值，保留 SecretRef 和条目的当前 `secret`/`env` 类型和允许的主机，并打印备份路径。备份期间更改的凭据将被保留。重新启动网关，然后使用新令牌重新连接或重新配对设备。

当跳过健康的 SecretRef 时，显式令牌生成会报告。其他占位符秘密需要从其提供者处进行真正的替换；医生在不删除其存储值的情况下报告它们。

在可信代理模式下，经过编辑的内联或环境提供的可选密码不会阻止代理身份验证。启动、医生和状态警告本地密码回退不可用。替换或删除可选密码并重新启动； Doctor 保留可信代理模式而不是生成令牌。

## <a id="macos%3A-launchctl-env-overrides"></a><a id="macos-launchctl-env-overrides"></a> macOS：`launchctl` 环境变量覆盖

如果您之前运行过 `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...`（或 `...PASSWORD`），则当本地配置未提供后备凭据时，该值将提供后备凭据。配置的内联凭证或活动 SecretRef 优先于其匹配的环境回退。选择过时的回退可能会导致持续的“未经授权”错误。

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```
