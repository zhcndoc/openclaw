---
summary: "网关服务、配对、安全性、工作区状态、身份验证、运行状况和主管检查（检查 8-17）"
title: "网关、服务和安全检查"
read_when:
  - "医生报告网关服务、主管、配对或身份验证问题"
  - "您正在更改网关服务迁移或运行时诊断"
---

检查 8-17 涵盖网关服务迁移、设备配对、安全警告、工作区状态、网关身份验证和运行状况以及主管。

包根目录中的有效 `openclaw-install-owner.json` 标记标识应用程序拥有的安装。 Doctor 报告主机的名称和更新提示，并将软件包、捆绑的 UI 和运行时替换留给该主机，包括当独立的 CLI 检查应用程序拥有的网关服务时。对于OpenClaw.app负载，更新应用程序以更新网关；正常配置和状态检查仍然适用。当应用程序拥有的网关经过离线验证时，独立的 `openclaw doctor --fix` 可以在现有数据库维护租约下修复同一帐户的配置和状态。 Doctor 保持应用程序的服务定义、包和启动不变；通过 OpenClaw.app. 重启或更新网关

修复后，Doctor 在有限的准备预算内等待托管网关。如果服务管理器仍然报告它正在运行，但其侦听器尚未打开，Doctor 将完成并显示警告并退出代码 0。请立即检查 `openclaw gateway status`。停止或失败的服务仍报告恢复失败；缓慢启动不会撤消已完成的修复。

## <a id="checks-8-17"></a> 检查 8-17

<AccordionGroup>
  <Accordion id="8-gateway-service-migrations-and-cleanup-hints" title="8. Gateway 服务迁移和清理提示">
    以交互方式运行 `openclaw doctor` 以查看旧版网关服务 （launchd/systemd/schtasks） 并确认支持的清理。显式修复维护会跳过此单独的清理流程。拆卸与安装分开报告；当缺少预期的本机服务时，请使用 `openclaw gateway install`。医生还可以扫描额外的类似网关的服务并打印清理提示。配置文件名为 OpenClaw 的网关服务被视为一流，不会被标记为“额外”

    清理预览仅包括用户范围内的旧版 launchd 服务和已识别的旧版 systemd 单元名称。旧版 Windows 服务、无法识别的 Linux 单元名称以及系统范围内的服务仍然需要手动审核。

    Windows 额外服务提示使用只读 `schtasks /Query` 检查。 Node 主机在诊断中保持可见；仅发现并不会使服务成为删除目标。不可读的不相关计划任务不会阻止发现或测试运行时准备，无论它们是否正在运行。当无法验证其命令时，选定的任务、已识别的 OpenClaw 启动器以及具有 OpenClaw 启动器内容的自定义别名仍然报告不完整的检查。

    如果停止或禁用服务失败，Linux 用户服务清理会保留单元文件。中断的状态检查不允许仅删除文件；仅当 `systemctl` 不可用时才报告回退。

    在 Linux 上，如果用户级 gateway 服务缺失但系统级 OpenClaw gateway 服务存在，doctor 不会自动安装第二个用户级服务。请使用 `openclaw gateway status --deep` 或 `openclaw doctor --deep` 检查，然后移除重复项，或者当系统 supervisor 承担 gateway 生命周期时设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。

  </Accordion>
  <Accordion id="8b-startup-matrix-migration" title="8b.启动 Matrix 迁移">
    当 Matrix 通道帐户有待处理或可操作的旧状态迁移时，doctor（在 `--fix` / `--repair` 模式下）会创建迁移前快照，然后运行尽力而为的迁移步骤：旧 Matrix 状态迁移和旧加密状态准备。这两个步骤都是非致命的；记录错误并继续启动。如果没有显式修复（`--fix`、`--repair` 或 `--yes`），则会跳过此检查。
  </Accordion>
  <Accordion id="8c-device-pairing-and-auth-drift" title="8c.设备配对和身份验证漂移">
    Doctor 会在正常健康检查过程中检查设备配对状态，并报告：

    - 待处理的首次配对请求
    - 已配对设备待处理的角色或 scope 升级
    - 公钥不匹配修复，其中设备 ID 仍然匹配，但设备身份不再与批准的记录匹配
    - 已批准角色缺少活动 token 的已配对记录
    - scope 偏离已批准配对基线的已配对 token
    - 当前机器的本地缓存设备 token 条目早于 gateway 端 token 轮换，或携带过时的 scope 元数据
    - a 已停用的 `identity/device-auth.json` 文件仍然存在，并阻止检查本地缓存的令牌，包括在远程网关模式下；停止网关并运行 `openclaw doctor --fix` 以完成迁移或清理
    - 已停用本地网关上的 `devices/*.json` 和 `nodes/*.json` 存储；停止网关并运行 `openclaw doctor --fix` 以在节点功能之前导入设备批准并存档原始文件。现有的 SQLite 记录优先；无法读取的来源仍保留在原地进行修复。

    Doctor 不会自动批准配对请求，也不会自动轮换设备 token。它会打印确切的后续步骤：

    - 使用 `openclaw devices list` 检查待处理请求
    - 使用 `openclaw devices approve <requestId>` 批准具体请求
    - 使用 `openclaw devices rotate --device <deviceId> --role <role>` 轮换新 token
    - 使用 `openclaw devices remove <deviceId>` 移除并重新批准过时记录

    这将首次配对与待定的 role/scope 升级和过时的 token/device-identity 漂移区分开来，从而弥补了常见的“已配对但仍需要配对”的漏洞。

    仅当配置请求节点执行或浏览器节点目标、允许节点命令、通过 CIDR 或 SSH 验证选择远程配对或明确 enables/configures 设备对插件时，才会检查 Node- 主机先决条件。该插件的捆绑默认设置、空节点设置和仅拒绝策略不请求托管。因此，仅本地环回网关不会收到节点托管警告；远程客户端配置文件将这些检查留给服务器。显式配对和加入代码请求仍然报告无法访问的源。此仅诊断更改不会重写配置或更改更新修复。

  </Accordion>
  <Accordion id="9-security-warnings" title="9. 安全警告">
    Doctor 仅在发现警告时才会发出 Security note，例如某个 provider 对没有 allowlist 的私信开放，或策略配置存在危险。请使用 `openclaw security audit` 获取完整的安全清单。

    发现缺少多代理 DM 路由所有权。它不会停止剩余的通道安全检查或待处理的状态迁移。在期望该路由起作用之前配置报告的帐户绑定。 Telegram 帐户发现在升级预览期间保留旧版默认代理帐户选择，无需环境代理。

  </Accordion>
  <Accordion id="10-systemd-linger-linux" title="10. systemd 徘徊 （Linux）">
    如果作为 systemd 用户服务运行，doctor 会在需要时启用延迟，以便网关在注销后保持活动状态。
  </Accordion>
  <a id="11-workspace-status-skills-plugins-and-taskflows" />
  <Accordion id="11-workspace-status-skills-and-plugins" title="11. 工作区状态（技能和插件）">
    Doctor 会为默认 agent 打印问题和操作，而不是健康状态清单：

    - **Skills**：列出已允许但不可用的 skill 名称；使用 `openclaw skills check` 查看要求详情和完整计数。
    - **Plugins**：仅报告错误的插件ID；使用 `openclaw plugins list` 来加载、导入、禁用和捆绑插件库存。
    - **Plugin compatibility warnings**：标记与当前运行时存在兼容性问题的插件。
    - **Plugin diagnostics**：显示插件注册表发出的所有加载时警告或错误。
    - **Claude CLI**：仅报告二进制、身份验证、配置文件、工作区或项目目录问题；健康检查细节被省略。

  </Accordion>
  <Accordion id="11b-bootstrap-file-size" title="11b.引导文件大小">
    Doctor 在运行时筛选后根据配置的字符预算检查工作区引导候选（`AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、`BOOTSTRAP.md` 和 `MEMORY.md`）。工作区设置完成后，根 `BOOTSTRAP.md` 将被排除。它报告每个文件的原始字符数与注入字符数、截断百分比、截断原因（`max/file` 或 `max/total`）以及总注入字符数占总预算的比例。当文件被截断或接近限制时，医生会打印调整 `agents.defaults.bootstrapMaxChars` 和 `agents.defaults.bootstrapTotalMaxChars` 的提示。 `USER.md` 是例外：它具有固定的 4,000 个字符上限，这些设置无法提高该上限，因此医生命名了该上限并建议改为压缩文件。参见[用户模型](/concepts/user-model)。

    这包括当新的网关启动选择捆绑的 `bootstrap-extra-files` 挂钩时声明的文件，前提是每个匹配的基本名称都是这六个名称之一（例如，`packages/core/AGENTS.md`）。其他基本名称将被忽略。 Doctor 使用每个代理的工作区和限制，而无需导入或运行自定义挂钩处理程序。它预测新开始的选择，而不是正在运行的网关在钩子重新加载失败后可以保留的上一个处理程序生成。

  </Accordion>
  <Accordion id="11c-shell-completion" title="11c.外壳完成">
    Doctor 会检查当前 shell（zsh、bash、fish 或 PowerShell）是否已安装 Tab 补全：

    - 如果 shell profile 使用的是较慢的动态补全模式（`source <(openclaw completion ...)`），doctor 会将其升级为更快的缓存文件变体。
    - 如果 profile 中已配置补全但缓存文件缺失，doctor 会自动重新生成缓存。
    - 如果完全没有配置补全，doctor 会提示安装它（仅交互模式；`--non-interactive` 会跳过）。

    运行 `openclaw completion --write-state` 可手动重新生成缓存。

  </Accordion>
  <Accordion id="11d-stale-channel-plugin-cleanup" title="11d。过时的频道插件清理">
    当 `openclaw doctor --fix` 移除缺失的频道插件时，它还会移除引用该插件的悬空频道范围配置：`channels.<id>` 条目、指定该频道的 heartbeat 目标，以及 `agents.*.models["<channel>/*"]` 覆盖。这可以防止频道运行时已消失但配置仍要求 gateway 绑定该频道而导致的 Gateway 启动循环。
  </Accordion>
  <Accordion id="11e-project-clone-shape" title="11e.项目克隆形状">
    Doctor 检查存储的以 `source: "cloned"` 注册的项目克隆。它报告项目名称和路径、浅层状态、每个 `remote.*.partialclonefilter` 和 `remote.*.promisor` 密钥（包括 URL-keyed 双胞胎）以及 `extensions.partialclone`（如果存在）。类似地址的名称将 userinfo 替换为 `***`，并省略查询字符串和片段，包括非标准 URL 的远程帮助程序和类似 scp 的地址。完整克隆没有发现任何结果。丢失或无法读取的克隆被报告为已跳过；其他项目仍在检查中。代理工作区和手动注册的签出不在此检查范围内。

    每个克隆使用三个本地 Git 读取，每个读取限制为 5 秒和 64 KiB 捕获的输出。即使使用 `--fix`，Doctor 也不会获取、重新打包或更改克隆配置。部分克隆支持托管工作树对象预取，但完整克隆可避免检出和快照恢复期间丢失对象和浅历史记录失败。

    对于重点只读报告，请运行：

    ```bash
    openclaw doctor --lint --only core/doctor/project-clone-shape --json
    ```

    支票也运行在普通Doctor和`--lint --all`；它被排除在默认的 lint 配置文件之外。 Lint 通过 Doctor 的私有状态快照检查注册表。

    在 POSIX shell 中遵循 Doctor 打印的命令，并访问 `origin`。停止任何失败的步骤。对于具有通常原始键的浅层部分克隆，序列为：

    ```bash
    cd /path/to/project-clone
    git config --unset-all remote.origin.partialclonefilter
    git fetch --refetch --unshallow origin
    git rev-list --objects --missing=print --all | grep '^?' | cut -c2- | git fetch origin --no-tags --no-write-fetch-head --recurse-submodules=no --stdin
    git config --unset-all remote.origin.promisor
    git repack -a -d
    ```

    在重新获取之前取消设置 **every** 报告 `partialclonefilter` 密钥，包括 `remote.https://github.com/openclaw/openclaw.git.partialclonefilter` 等密钥。如果存储库不浅，则省略 `--unshallow`； Git 拒绝完整历史记录的选项。保留承诺者设置，直到 ID 获取丢失的对象，然后在重新打包之前取消设置每个报告的 `promisor` 密钥以及 `extensions.partialclone`（如果存在）。 Doctor 为没有 `://`、`::` 或 `@` 的普通远程名称打印精确的未设置命令。对于类似地址的条目，请按照本地查找和取消设置说明进行操作，然后再继续；原始密钥可能包含凭据，并且不得复制到共享报告中。编辑后的名称标识该条目，但不是其字面 Git 配置密钥。

    在取消设置远程密钥并重新打包存储库后，Git 可以保留 `objects/pack/*.promisor` sidecar。 sidecar 是无害的：OpenClaw 从 Git 配置确定部分克隆修复可用性，而不是从这些文件。要删除过时的磁盘标签，请首先确认下面的丢失对象命令不打印任何内容并且 `git fsck` 成功：

    ```bash
    git rev-list --objects --missing=print --all | sed -n 's/^?//p'
    git fsck --full
    ```

    然后仅将 sidecar 从 pack 目录中移出，将它们保留为可恢复的备份，直到下一次成功运行 Doctor 和托管工作树：

    ```bash
    promisor_marker_backup="$(git rev-parse --git-dir)/retired-promisor-markers"
    mkdir -p "$promisor_marker_backup"
    find "$(git rev-parse --git-dir)/objects/pack" -maxdepth 1 -type f -name '*.promisor' -exec mv -n {} "$promisor_marker_backup"/ \;
    git fsck --full
    ```

    之后重新运行医生。如果历史记录或对象仍然丢失，请从原始存储库中恢复它们。 Origin 可能不包含仅限本地的快照；请参阅 [ 快照恢复 ](/concepts/managed-worktrees#snapshots-cleanup-and-restore)。

  </Accordion>
  <Accordion id="12-gateway-auth-checks-local-token" title="12. Gateway 身份验证检查（本地令牌）">
    Doctor 会检查本地 gateway token 身份验证是否就绪。

    - 如果 token 模式需要 token 且不存在 token 来源，doctor 会提供生成 token 的选项。
    - 如果 `gateway.auth.token` 由 SecretRef 管理但不可用，doctor 会发出警告且不会用明文覆盖它。
    - `openclaw doctor --generate-gateway-token` 报告健康的 SecretRef 何时不需要生成。
    - 如果存储支持的令牌解析为已知的编辑占位符，则 `--fix` 或 `--generate-gateway-token` 会验证数据库备份并重新生成该条目，同时保留其 SecretRef。 Doctor 打印备份路径和 restart/re-pair 指导。其他外部机密需要从源头进行替换。

  </Accordion>
  <Accordion id="12b-read-only-secretref-aware-repairs" title="12b.只读 SecretRef 感知修复">
    某些修复流程需要在不削弱运行时 fail-fast 行为的前提下检查已配置的凭据。

    - `openclaw doctor --fix` 使用与 status 系列命令相同的只读 SecretRef 摘要模型来执行目标配置修复。
    - 示例：Telegram `allowFrom` / `groupAllowFrom` 的 `@username` 修复会在可用时尝试使用已配置的 bot 凭据。
    - 如果 Telegram bot token 通过 SecretRef 配置但在当前命令路径中不可用，doctor 会报告该凭据已配置但不可用，并跳过自动解析，而不是崩溃或错误地报告 token 缺失。

  </Accordion>
  <Accordion id="13-gateway-health-check-restart" title="13. 网关健康检查+重启">
    Guided Doctor 运行健康检查，并可以为本地网关提供恢复服务，具体取决于服务所有权和确认。远程健康检查失败不会触发本地业务恢复，即使远程URL是环回SSH隧道。检查远程连接并恢复其主机上的网关。接受的交互式维护将恢复其停止的匹配服务并保留已停止的服务。显式修复维护恢复其停止的匹配服务。成功独立 `openclaw doctor --fix` 后，它还会启动并验证已停止的托管网关，其服务针对当前安装。更新时医生将激活留给更新程序。在重生之间加载、启用的 macOS 作业不会被视为有意停止的服务。
  </Accordion>
  <Accordion id="13b-memory-search-readiness" title="13b.内存搜索准备情况">
    Doctor 会检查已配置的 memory search embedding provider 是否已为默认 agent 就绪。具体行为取决于配置的 provider：

    - **显式本地提供程序**：检查本地模型文件或已识别的remote/downloadable模型URL。如果丢失，建议切换到远程提供商。
    - **Explicit remote provider**（`openai`、`voyage` 等）：验证环境或 auth store 中是否存在 API key。如果缺失，会打印可操作的修复提示。
    - **Legacy auto provider**：将 `memorySearch.provider: "auto"` 视为 OpenAI，检查 OpenAI 是否就绪，并由 `doctor --fix` 将其重写为 `provider: "openai"`。

    当缓存的网关检查结果可用时（检查时网关正常），医生将其结果与 CLI-visible 配置交叉引用，并记录任何差异。 Doctor 不会在默认路径上启动新的嵌入 ping；当您想要实时提供程序检查时，请使用深度内存状态命令。

    使用 `openclaw memory status --deep` 可在运行时验证 embedding 就绪性。

    嵌入提供者的准备情况是健康检查，而不是状态迁移。网关启动不会在准备检查期间初始化内存嵌入提供程序，因此 auth-profile SecretRefs 可以在之后激活。如果嵌入仍然不可用，内存同步会保留现有的语义索引，而不是用 FTS-only 数据替换它。就绪警告允许降级启动；导致所需状态读取不安全的错误仍然会阻止网关准备就绪。

  </Accordion>
  <Accordion id="14-channel-status-warnings" title="14. 通道状态警告">
    如果网关正常，医生会运行通道状态检查并报告警告以及建议的修复措施。
  </Accordion>
  <Accordion id="15-supervisor-config-audit-repair" title="15. Supervisor配置审核+修复">
    Plain Doctor 检查检查已安装的 Supervisor 配置 （launchd/systemd/schtasks） 是否缺少或过时的默认值（例如 systemd 网络在线依赖性和重新启动延迟），并可以提供交互式修复。显式修复维护会跳过此单独的服务重写阶段，但会通过本机安装程序协调先前运行的服务 ](/cli/doctor/recovery#gateway-service-recovery) 中的 [ 合格安装偏差。停止的服务保持其启动器和停止状态。从预期安装运行 `openclaw gateway install --force` 以替换启动器和托管环境。

    在 Linux 维护停止之前，策略刷新会备份过时的 OpenClaw 单元设置，确认 `daemon-reload`，并验证有效的 `TimeoutStopSec` 是否涵盖排空和清理（当前为 330 秒）。此更新保留了启动器、环境和操作员插件；离线服务可以在不启动的情况下接收它。短期或未知的居民关闭预算在停止之前使用有限的生命周期消耗。在更新截止日期时，报告的写托管拒绝与其所有者阶段停止；剩余的允许转弯或未知的监护会产生警告，并且停止继续进行。

    注意：

    - 较旧的安装标记无法安全地替换自定义本机设置。自动调节仅修复丢失或已识别的已发布默认值；无法识别的基本单元、LaunchAgent 或计划任务设置在诊断后保持不变。 Linux 操作员插入项永远不会被重写。
    - 在macOS上，协调会识别2026.4.29安装程序生成的完整默认PATH，并在备份定义后将其刷新为当前服务PATH。添加的自定义条目和其他无法识别的值仍然受到保护，包括在生成的环境文件内进行的编辑。如果可选的用户 bin 目录自安装后已更改，则旧的 PATH 仍然无法识别而不是被丢弃。
    - 如果备份或迁移子进程清理无法确认拥有的工作已停止，则其写入托管阻止程序将在网关进程生命周期内保留，即使在命令报告错误之后也是如此。自动维护不会在超时时清除它。部署所有者必须在替换网关进程之前独立验证工作是否已停止。
    - 在同意维修服务之前，Doctor 会预览计划的运行时间、入口点、PATH 以及任何记录的停机预算维修。预览命名修复将保留的运行时和源检查结果，并在批准修复后重复它们。如果没有支持的系统Node可用，重新安装仍然可以修复其他服务设置，同时保留记录的运行时间；安装受支持的系统 Node 并重新运行 Doctor 以解决该问题。当源签出启动器保持预期安装时，它会被保留。
    - `openclaw doctor` 在重写 Supervisor 配置之前出现提示。仅 `openclaw doctor --force` 仍保持指导：它允许积极的修复选择，但仍需要交互式同意才能进行合格的服务重写。它仅在获得指导托管同意后才进入维护状态，并保留所有权和写访问权限检查。
    - `openclaw doctor --yes` 接受默认的非服务修复提示，并根据上述策略刷新和安装漂移规则进入维护。
    - `openclaw doctor --fix` 应用建议维修而不提示（`--repair` 是别名；`--yes` 也进入维修维护）。它会在插件或可变状态检查之前停止匹配的托管网关，验证修复情况，并重新启动相同的服务一次，即使不需要任何更改。它协调符合条件的安装漂移，保留运营商启动器，仅启动针对当前安装的拥有的离线服务，并拒绝停止祖先网关。普通交互式Doctor会检查架构兼容性并在为剩余维修请求维护同意之前提供更新，并保留单独的维修提示；拒绝托管会跳过修复并在同一调用中继续进行只读 `--lint` 检查，从而使服务和持久状态保持不变。自定义状态目录不采用原生服务。
    - 显式修复拒绝不可用的服务检查和可能仍在运行的不匹配的服务。在其所有者停止它们并且本机管理器确认它们处于离线状态后，Doctor 会修复其选定状态，而无需更改或启动这些服务。禁用的 systemd 设备仍可以重新启动； Doctor 检查运行时状态以及安装状态。
    - 更新程序的显式网关激活策略将 stop/restart 所有权留给更新程序。 Doctor仍需要本地证明服务已离线；实时 `update --no-restart` 修复失败，无需停止或重新启动。在重试更新之前，请通过其所有者停止该服务。没有该政策的旧更新父母保留普通的医生维护。
    - `openclaw doctor --fix --force` 使用相同的策略刷新和安装漂移规则。使用`openclaw gateway install --force`请求重写；运营商拥有的 systemd 插件保持不变。
    - `OPENCLAW_SERVICE_REPAIR_POLICY=external` 在网关服务生命周期中使医生保持只读状态。让部署所有者停止网关，以国有帐户运行 Doctor，然后通过该所有者重新启动。该策略跳过本机维护检查和服务突变，包括 install/start/restart/bootstrap、主管配置重写和遗留服务清理。它保留 Gateway/state 协调器和代理数据库租赁检查、报告服务运行状况并运行非服务修复。参见[现有系统LaunchDaemons](/gateway#existing-system-launchdaemons)。
    - Doctor 和 `gateway status --deep` 名称不可用 launchd 域、缺少 systemd 用户会话总线以及本机检查访问拒绝。 Linux 指南涵盖 `XDG_RUNTIME_DIR`、`DBUS_SESSION_BUS_ADDRESS` 和 `dbus-user-session`；外部监督的部署遵循上述现有政策。请参见 [ 网关和服务恢复](/cli/doctor/recovery)。
    - 直播内Linux服务检查、OpenClaw如果会话总线停止，可以保留经过身份验证的用户管理器的专用连接。键入的命令和运行时读取仅针对原始管理器和单元继续。初始经理身份缺失或被替换的经理仍然无法使用；OpenClaw不启动总线或选择其他管理器。这种只读恢复不会改变服务start/stop权威。

    - 在 macOS 上，同标签的系统 LaunchDaemon 会阻止用户 LaunchAgent 的安装、启动、重启和 bootstrap 修复。Doctor 会报告系统所有者并停止服务恢复；`--force` 不会绕过此所有权边界。请参阅 [Existing system LaunchDaemons](/gateway#existing-system-launchdaemons)。
    - 在 Linux 上，当匹配的 systemd 网关单元处于活动状态时，doctor 不会重写 command/entrypoint 元数据。如果停止的单元的命令或工作目录被操作员拥有的 systemd 插件覆盖，请使用 `systemctl --user cat <unit>.service` 检查它，然后更新或删除插件；重写托管库不能更改有效的启动器。 `Environment=` 插件仍受支持。 Doctor 还会在重复服务扫描期间忽略不活动的非传统额外类似网关的单元，因此配套服务文件不会产生清理噪音。
    - 在Linux上，医生在保留恢复的网关令牌之前检查已安装和规划的服务文件的权限。如果该检查阻止服务修复，则修复将保持配置和令牌不变，并报告如何恢复检查访问或让部署所有者参与； `--force` 无法绕过它。不相关的 Doctor 配置修复不受影响。
    - 当服务修复必须保留从环境或旧服务恢复的令牌时，Doctor要求显式交互确认并默认为“否”。它重用相同的共享存储条目而不更改它，或者通过秘密存储所有者保存新的受保护条目，然后仅将其SecretRef写入`gateway.auth.token`。非交互式运行（包括 `--yes`）会跳过此步骤并发出警告。更新时间 Doctor 仍推迟服务修复以完成更新。
    - 在添加商店条目之前，Doctor会备份现有的状态数据库；它的正常配置编写器会在发布之前备份配置。如果配置发布失败，Doctor 会跳过服务重写并保留保存的条目，因为已提交或并发引用可能已使用它。解决报告的故障并重新运行 Doctor 以重用该条目；当参考文献不确定时，请勿将其删除。
    - 如果令牌身份验证需要令牌并且 `gateway.auth.token` 由 SecretRef 管理，则医生服务 install/repair 会验证 SecretRef，但不会将解析的明文令牌值保留到主管服务环境元数据中。
    - Doctor 检测托管 `.env`/SecretRef-backed 服务环境值，旧版 LaunchAgent、systemd 或 Windows 计划任务安装嵌入式内联并重写服务元数据，以便从运行时源而不是主管定义加载这些值。
    - Doctor 检测 `gateway.port` 更改后服务命令何时仍固定旧的 `--port`，并将服务元数据重写到当前端口。
    - 如果令牌身份验证需要令牌并且配置的令牌 SecretRef 未解析，则医生会通过可操作的指导来阻止 install/repair 路径。
    - 如果两者都`gateway.auth.token`和`gateway.auth.password`已配置并且`gateway.auth.mode`未设置，医生阻止install/repair直到显式设置模式。
    - 对于 Linux 用户 systemd unit，doctor 的 token 漂移检查会在比较服务身份验证元数据时同时包括 `Environment=` 和 `EnvironmentFile=` 来源。
    - `OPENCLAW_SERVICE_MANAGED_ENV_KEYS` 跟踪从配置、`.env` 或 SecretRefs 重新生成的值 OpenClaw；它不是运营商保留许可名单。 Systemd 将操作员 `Environment=` 和 `EnvironmentFile=` 插件合并到有效环境中，并且 `gateway install --force` 使这些插件及其文件保持不变。 Doctor 不会将它们的值复制到托管库中，也不会建议重新安装以迁移仅限操作员托管的密钥。无法读取或未经验证的插入仍然需要检查。 Linux 重新安装会按现有顺序保留已承认的 PATH 条目，包括安全的额外目录；缺少具体的管理值仍然会报告漂移。环境保护失败显示 PATH 和 Telegram 假脱机超时的有限 current/installer 值，其他值已编辑。
    - 当配置由较新版本写入时，Doctor 服务修复会拒绝从较旧的 OpenClaw 二进制文件重写、停止或重启 gateway 服务。请参阅 [Gateway troubleshooting](/gateway/troubleshooting#split-brain-installs-and-newer-config-guard)。
    - `openclaw gateway install --force` 重写受管基本单元，但绝不会删除操作员拥有的 systemd 插件；如果命令或工作目录覆盖仍然有效，它会发出警告。

  </Accordion>
  <Accordion id="16-gateway-runtime-port-diagnostics" title="16. Gateway运行时+端口诊断">
    Doctor 会检查服务运行时（PID、上次退出状态），并在服务已安装但实际上未运行时发出警告。它还会检查 gateway 端口（默认 `18789`）上的端口冲突，并报告可能原因（gateway 已在运行、SSH 隧道）。
  </Accordion>
  <Accordion id="17-gateway-runtime-best-practices" title="17. Gateway运行时最佳实践">
    当所选守护程序使用通过运行时检查的不同 Node 可执行文件时，Doctor 会忽略有关未使用系统 Node 的警告。任何剩余的系统 Node SQLite 功能警告都会为其检查的可执行文件命名。

    Doctor 接受提供 WAL- 重置安全 `node:sqlite` 的 Bun 1.4.3+ 运行时，并在网关服务在较旧或不安全的 Bun 或版本管理的 Node 路径（`nvm`、 `fnm`、`volta`、`asdf` 等）。保留受支持的 Bun 服务，无论是录制的还是固定的。固定的运行时永远不会迁移。只有未固定、不受支持的 Bun 才能迁移到受支持的系统 Node，并需要交互式批准。更新驱动的Doctor运行永远不会迁移运行时。如果没有支持的 Node 可用，则服务将停留在 Bun 上，并且 Doctor 会发出警告。版本管理器路径可能会在升级后中断，因为该服务不会加载您的 shell init。 Doctor 可以将未固定版本管理的 Node 迁移到受支持的系统 Node 安装 （Homebrew/apt/choco）。

    在没有包装器或运行时引脚的情况下重新安装现有但已卸载的服务时，Doctor 将其运行时选择器默认为支持的记录的 Node 或 Bun。保持运行时保留其可执行文件而不创建引脚；选择其他运行时将选择一个新的可执行文件。当未找到受支持的 Node 并且未设置显式运行时、引脚或包装器时，不可用或不受支持的记录运行时将回退到全新安装的默认值 Node，或运行受支持的 Bun，而不创建引脚。

    Doctor 将相同的建议用于其非交互式运行时回退。如果没有支持的 Node 可用，则在安装前显式选择 Node 仍然会失败；它不会默默地取代Bun。当 Doctor 要求确认安装服务时，这一点不会改变。

    在服务修复期间保留显式运行时路径引脚。 Doctor 仍会检查其运行时功能，但不会将有效引脚从版本管理器中迁移出来。用 `openclaw gateway install --runtime-path <path> --force` 或 `openclaw gateway install --runtime node --force` 替换或删除无效引脚。

    服务安装和修复可识别名为 `node`、`nodejs` 或版本名称（例如 `node24` 和 `node-24`）的当前 Node 可执行文件，包括 Windows `.exe` 变体。每个候选人在选择之前仍必须通过 Node 和 SQLite 能力检查。

    新安装或修复的 macOS LaunchAgents 使用固定系统 PATH （`/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`），而不是复制交互式 shell PATH，因此 Homebrew- 托管系统二进制文件保持可用，同时 Volta、asdf、fnm、pnpm 和其他版本管理器目录不会更改 Node 子进程解析的内容。 Linux 服务仍然保留显式环境根（`NVM_DIR`、`FNM_DIR`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`BUN_INSTALL`、`PNPM_HOME`）和稳定的用户 bin 目录，但猜测版本管理器后备目录仅写入服务当这些目录存在于磁盘上时为 PATH。

  </Accordion>
</AccordionGroup>
