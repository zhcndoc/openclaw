---
summary: "剩下的医生检查和修复，从 Nix 模式到插件、沙箱和通道"
title: "其他检查和维修"
read_when:
  - "您想知道医生是否承保特定检查或维修"
  - "医生报告了您不认识的检查"
---

这些是 `openclaw doctor` 执行的剩余检查和维修，超出其他页面上记录的姿势和维护模式。

<a id="notes" />

## <a id="modes-and-prompting"></a> 模式和提示

- 在Nix模式（`OPENCLAW_NIX_MODE=1`）下，只读医生检查仍然有效，但`doctor --fix`、`doctor --repair`、`doctor --yes`和`doctor --generate-gateway-token`被禁用，因为`openclaw.json`是不可变的。编辑此安装的 Nix 源；对于 nix-openclaw，请使用代理优先 [Quick Start](https://github.com/openclaw/nix-openclaw#quick-start)。
- 交互式提示（keychain/OAuth修复等）仅在stdin为TTY且`--non-interactive`为**not**集时运行。无头运行（cron、Telegram、无终端）跳过提示。
- 独立非交互模式会跳过提示，而不是完整的提供程序目录或运行时工具验证。更新时可选检查可以延迟 [，并带有警告 ](/cli/doctor/running#postures)。构建的签出运行重用可用的已编译插件条目来进行这些检查；有意的源覆盖仍然执行源。参见[开发调试](</help/debugging#dev-profile-%2B-dev-gateway-(--dev)>）。
- `--lint` 比 `--non-interactive` 更严格：始终为只读模式、从不显示提示、从不应用安全迁移。需要 doctor 修改内容时，请使用 `doctor --fix` 或 `doctor --repair`。
- Doctor默认在检查机密时不执行`exec` SecretRefs。仅当您有意希望 Doctor 运行这些已配置的秘密解析器时，才使用 `--allow-exec`（带或不带 `--lint`）。

## <a id="config-writes-and-backups"></a> Config写入和备份

更新历史记录检查和协调是尽最大努力的维护。失败会打印警告，并允许独立的 Doctor 修复和插件注册表突变继续进行。可写通行证还尝试保存最新的现有 SQLite 更新运行的警告，而不更改其结果或活动时间戳或创建新的运行。只读通行证不会写入历史。数据库完整性、迁移和未解决的进程清理检查仍然可以保护突变。

快照工作线程使用执行 CLI 的运行时。本机工作线程继承未更改的工作目录，从而避免 `sudo -u` 切换用户后可能失败的冗余目录更改。生成拒绝命名运行时和工作目录；检查服务用户的可执行权限和目录访问权限。磁盘空间或 `XDG_CACHE_HOME` 指南适用于快照存储故障，而不是运行时启动权限。

检查完成后，`doctor --fix` 在保留维护所有权的同时安顿自己的检查人员，然后检查是否可以删除废弃的更新程序运行时。独立的 OpenClaw 进程、工作线程和共享代理工作仍然会阻止删除。 Doctor 报告持有者 PID，并要求您在重新运行 `openclaw doctor --fix` 之前完成他们的工作。

- 在 npm 全局安装中，Doctor 报告在已安装的软件包旁边保留了 `.openclaw.package-backup-*.databases` 目录（以及 `.openclaw-package-backup-*.databases`，失败的清理将其淘汰的名称），以及它们的总常规文件大小（以字节为单位）和人类可读的单位，以及每个目录的引用的删除命令。扫描是有界的；不完整的尺寸是下限。如果在发现任何快照之前检查不完整，Doctor 会发出警告并要求您手动列出 npm 全局根目录，包括隐藏条目。丢失的全局根不会产生警告。这只是警告，包括 `--fix`：在手动删除快照之前，请确认没有正在进行更新并且没有恢复需要快照。更新程序驱动的 Doctor Pass 会推迟此检查，因此它们不会报告活动更新的快照；更新完成后运行独立的 Doctor。
- 任何配置写入（包括 `--fix` 修复）都会将备份轮换到 `~/.openclaw/openclaw.json.bak`（带有编号为 `.bak.1`..`.bak.4` 的环）。 `--fix` 还删除架构验证报告的未知配置键，列出每个删除；它会在更新进行时跳过此操作，因此在迁移完成之前不会删除部分写入的升级状态。
- 如果无法解析 `openclaw.json` 并且无法恢复最后一次已知的正确配置，则 `doctor --fix` 使文件保持不变并以错误退出，而不是编写部分替换。该错误指向 `openclaw config validate` 的确切解析位置，并解释了如何编辑或重新生成配置。

## <a id="gateway-and-service-repairs"></a> 网关和服务维修

- 当另一个 Supervisor 拥有网关生命周期时设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。让该所有者停止网关，以国有帐户运行 Doctor，然后通过所有者重新启动。 Doctor 跳过本机维护检查和服务突变，包括 install/start/restart/bootstrap 和遗留服务清理；它保留 Gateway/state 协调员和代理数据库租赁检查、报告服务运行状况并应用非服务维修。参见[现有系统LaunchDaemons](/gateway#existing-system-launchdaemons)。
- Doctor 和 `gateway status --deep` 区分不可用的 launchd 域、丢失的 systemd 用户总线以及本机检查访问拒绝。有关运行时环境、`dbus-user-session` 和外部主管指南，请参阅 [Gateway 和服务恢复](/cli/doctor/recovery)。
- Doctor 会报告受管理 Gateway 应用的堆限制，以及根据当前主机或容器内存限制使用的自适应推导结果。在修复流程之外，可使用 `openclaw gateway status` 获取相同报告。
- 当经理报告屏蔽或以其他方式卸载的单元时，Doctor 和 `openclaw gateway status` 会跳过 systemd 内容修复建议。加载单元检查、管理器查询失败后的可读文件回退以及不相关的备份或凭证诊断仍保持活动状态。
- 在Linux上，当systemd网关服务处于活动状态时，doctor会忽略不活动的额外网关（例如systemd单元）并且不会重写command/entrypoint元数据；在协调安装偏差之前，显式修复会停止符合条件的服务。使用 `openclaw gateway install --force` 重写管理基板。如果 systemd 插件覆盖 `ExecStart=` 或 `WorkingDirectory=`，请使用 `systemctl --user cat <unit>.service` 检查它并自行更新或删除该插件；重新安装底座并不能取代它。 `Environment=` 插件仍受支持。
- `doctor --fix --non-interactive`保留已安装的启动器和环境，除了[先前运行的服务中符合条件的安装偏差](/cli/doctor/recovery#gateway-service-recovery)，包括更新修复期间。分别地，Linux政策刷新备份过时OpenClaw单位设置，确认`daemon-reload`，并在维护前验证有效的关闭超时时间。操作员插入保持不变。短期或未知的居民关闭预算使用有界生命周期消耗；报告的写监管拒绝截止时间停止，而中断的轮流会产生警告。停止的服务保持其启动器和停止状态；他们的Linux策略无需激活即可刷新。跑步`openclaw gateway install`对于缺少的服务，或者`openclaw gateway install --force`从预期安装中替换其启动器和托管环境。

## <a id="session-state-and-cron"></a> 会话状态和 cron

- 状态完整性检查会检测会话目录中的孤立转录文件。将它们归档为 `.deleted.<timestamp>` 需要交互式确认；`--fix`、`--yes` 和无头运行会将它们保留在原处。
- Doctor 会扫描历史上的 `~/.openclaw/cron/jobs.json` 存储以及之前配置的旧版存储位置，查找旧的 cron 任务格式，将任务和隔离记录导入 SQLite，并归档已迁移的 JSON 文件。
- Doctor 会报告带有明确 `payload.model` 覆盖值的 cron 任务，包括提供商命名空间计数以及与 `agents.defaults.model` 的不匹配情况，以便在排查认证或计费问题时发现未继承默认模型的计划任务。
- Doctor 会报告仍标记为执行中的 cron 任务（`state.runningAtMs`），这可能导致 `openclaw cron list` 将其显示为 `running`。此检查为只读操作：如果当前没有 Gateway 正在执行被标记的任务，那么下一次 cron 服务启动时会记录该次中断运行并清除标记。

## <a id="tool-and-channel-policy"></a> 工具和渠道政策

Doctor 在检查上下文引擎插件之前准备有效的运行时配置，因此他们的注册可以在预览和修复模式下读取 `api.runtime.config.current()`。缺少的配置文件使用默认值；无效的配置在修复之前不会发布。

- Doctor 每次运行都会检查一次活动工具模式，在整个队列中共享插件注册，同时检查每个代理的工具工厂、策略和所选模型。当代理在一个捕获的配置生成中解析到相同的插件源时，模型准备还会共享提供程序注册和配置快照；不同的插件选择和明确的工作区注册表所有者保持独立。失败的插件注册和清理会产生结果，而不会隐藏健康代理的结果。如果模型需要实时提供程序发现，Doctor 会报告其特定于模型的架构检查被推迟；正常的经过身份验证的代理使用会执行该发现。独立 lint 保留其只读目录检查。更新时检查可以通过记录警告来推迟。
- Doctor 报告名为 `image` 的旧图像检查策略条目。 `openclaw doctor --fix` 将支持的配置 allow/deny 表面和持久自动化 `toolsAllow` 条目重写为 `view_image`；仅旧的通配符模式（例如 `image*`）将被保留并获得显式的 `view_image`，而已经涵盖这两个名称的模式保持不变。运行时仅公开当前名称。
- 在 Linux 上，当用户的 crontab 仍运行未维护的旧版 `~/.openclaw/bin/ensure-whatsapp.sh` 时，doctor 会发出警告；当 cron 缺少 systemd 用户总线环境时，该脚本可能错误地报告 `Gateway inactive`。
- 当启用WhatsApp时，医生可以报告网关压力并检测到本地TUI客户端。这些观察结果无法确定原因或将客户端连接到该网关。在决定是否关闭客户端之前检查[网关诊断](/gateway/diagnostics)；医生并没有阻止他们。
- 当 HTTP（S） 代理环境变量存在但 `tools.web.fetch.useTrustedEnvProxy` 被禁用时，医生解释说 `web_fetch` 仍然使用直接路由，运行简短的直接 TLS 连接检查，并命名显式选择加入。它永远不会自动启用代理信任。

## <a id="models-and-auth"></a> 模型和授权

- Doctor 将旧版 `codex/*` 和 `openai-codex/*` 模型引用重写为当前 `openai/*` 引用，涵盖主要模型、后备、模型允许列表、image/video 生成模型、heartbeat/subagent/compaction 覆盖、挂钩、通道模型覆盖、cron 有效负载和过时的 session/transcript 路由引脚。 `--fix` 还在安全时合并旧版 `models.providers.codex` 和 `models.providers.openai-codex` 配置，将旧版 `openai-codex:*` 身份验证配置文件和 `auth.order.openai-codex` 条目迁移到 `openai:*`，将 Codex 意图移至 provider/model-scoped `agentRuntime.id: "codex"` 条目，删除过时的整个 agent/session 运行时引脚，并在 Codex 身份验证路由上保留修复的 OpenAI 代理引用，而不是直接 OpenAI API-key 身份验证。
- Doctor 还修复首选媒体选择中已停用的模型名称，并跨后备列表、模型映射、媒体插槽和会话 provider/model 对转换 CLI-encoded 模型引用。迁移后的代理选择保留了每个模型的运行时选择；显式当前运行时和会话运行时覆盖 win。当前条目赢得冲突，同时保留缺少的嵌套设置。这些参考修复保留了帐户 pin、自定义命名空间模型 ID 和会话绑定。
- 当活动模型参考命名已知提供程序但在该提供程序的本地目录中丢失时，Doctor 会报告信息查找结果。离线不提供目录行的提供程序（例如 OpenRouter，其目录是在运行时发现的）将被跳过，因为未列出的 id 没有拼写错误的证据。
- `doctor --fix` 在删除旧字段之前将旧的 Claude-only 会话 ID 移动到提供者密钥会话绑定中。现有绑定及其简历元数据优先。在安全会话迁移时，空或不明确的绑定会保留并带有协调警告。当 Doctor 清除配置路由之外的过时 Claude 路由状态时，它还会清除旧字段，因此迁移无法恢复该会话。升级后运行此修复，然后再恢复仅具有旧字段的会话；运行时查找和正常保存使用提供程序键控绑定。
- `doctor --fix` 迁移现有共享和代理 SQLite 存储中已停用的身份验证提供程序和配置文件标识符，以及旧版 JSON 导入。它保留凭据和帐户元数据，使用未使用的配置文件 ID 进行冲突，并一起更新配置引用和轮换状态。现有的迁移收据保留跨中断的存储通行证或失败的配置写入的经过验证的帐户映射；重试时不会采用更改的帐户。显式的空配置命令保持为空。无法读取的存储和未解析的凭证领域通过诊断保持不变；独立的安全存储仍然可以迁移。
- Doctor 会报告非空的 `auth.order.<provider>` 列表（其引用的配置文件已全部消失），前提是仍存在兼容的已存储凭据。`doctor --fix` 只会删除这些过时的覆盖项，从而恢复按代理自动选择凭据的功能；显式为空的顺序、部分仍有效的列表，以及没有兼容已存储凭据的顺序都会保持不变。如果活动 SQLite 认证存储不可读或格式错误，doctor 会说明跳过此修复的原因。如果正在运行的 Gateway 的配置重新加载模式不会自动应用写入，请重启 Gateway 后再重新检查认证状态。
- 当 `doctor --fix` 删除过时的代理本地 OAuth 副本以便代理继承共享帐户时，它会保留该帐户在代理保存的身份验证顺序中的位置。已移除副本的局部冷却时间和成功状态被清除；共享凭据和其他本地帐户保持不变。当 Doctor 在更新期间运行时，这也适用。

## <a id="plugins-and-skills"></a> 插件和技能

- `doctor --fix` 回收废弃的遗留插件捕获并在维护期间保留更新程序运行时。当可读工作目录和包证据表明进程不相关时，不熟悉的启动器语法本身不会阻止清理。绝对入口点路径仍然需要可读的外部包标识。 OpenClaw 身份、入口点和模块引用、capture/runtime 路径和本机捕获托管保留实时工件。标准 Linux `systemd --user` 管理器及其同帐户 PAM 帮助程序在受保护的工作目录不可读时不会阻止回收。发球前经理更改为`/`；它的 PAM 帮助程序仅解决该登录会话。可读的工作目录和运行时引用仍然可以保护实时工件。不可读的同一用户参数或其他未解析的工作目录、脚本、包或服务标记证据会导致清理被跳过并发出警告；未通过的证据检查永远不会被视为流程不相关的证据。
- First-write 本机会话目录隐私首选项不启用插件或扩展 `plugins.allow`。当启用的 Codex 条目仅包含目录选择退出并与 OpenClaw 2026.9.3/9.4. 可能的意外启用匹配时，Doctor 会发出警告。此​​签名无法区分旧的自动写入和有意选择，因此 `--fix` 保留它。如果未启用 Codex，请将 `plugins.entries.codex.enabled` 设置为 `false`，并从 `plugins.allow` 中删除 `codex`（如果存在），并保留其他条目。
- Doctor 保留其他安装或配置文件仍可能使用的遗留共享插件运行时缓存，并仅删除真正悬空的插件运行时符号链接。它为托管 npm 插件重新链接主机 `openclaw` 包，并将其声明为对等依赖项。它还修复配置引用的丢失的可下载插件（`plugins.entries`、配置的通道、配置的 provider/search 设置、配置的代理运行时）。在软件包更新期间，doctor 会跳过软件包管理器插件修复，直到软件包交换完成；如果配置的插件仍然需要恢复，请重新运行 `openclaw doctor --fix`。如果下载失败，doctor 会报告安装错误并保留配置的插件条目以供下次修复尝试。
- `doctor --fix` 还使用与 `openclaw update` 相同的插件更新程序，将漂移的活动官方 npm 插件从 OpenClaw 目录更新到已安装的 OpenClaw 版本。记录的非默认标签和引脚比该版本的插件队列更新，保留其选定的目标。它报告每个结果并重新检查重启准备情况。无法获取的插件仍然会发出警告并提示失败原因；其他插件仍然可以修复，Doctor可以完成。此修复使第三方插件保持不变。正常的[网关维护和重启策略](/cli/doctor/running#postures)适用；当 Doctor 没有为您重新启动网关时，请按照打印的重新启动命令进行操作。
- 当插件发现正常时，Doctor 通过从 `plugins.allow`/`plugins.deny`/`plugins.entries` 中删除丢失的插件 ID，加上匹配的悬空通道配置、心跳目标和通道模型覆盖来修复过时的插件配置。
- Doctor 会通过禁用受影响的 `plugins.entries.<id>` 条目并删除其无效的 `config` 负载，将无效的插件配置隔离。Gateway 启动时已经只会跳过该有问题的插件，因此其他插件和频道仍可继续运行。
- Doctor删除了退役的`plugins.entries.codex.config.codexDynamicToolsProfile`； Codex 应用程序服务器始终保持 Codex-native 工作区工具原生。
- Doctor 自动将旧版 Flat Talk 配置（`talk.voiceId`、`talk.modelId` 等）迁移到 `talk.provider` + `talk.providers.<provider>`。当唯一的区别是对象键顺序时，重复 `doctor --fix` 不再运行 report/apply Talk 规范化。
- Doctor 包含内存搜索就绪性检查，并可在缺少嵌入凭据时建议运行 `openclaw configure --section model`。
- Doctor 会单独报告有效的梦境启用和节奏，即使在禁用记忆搜索的情况下也是如此。它尊重插件激活和所选内存提供商的梦想设置，包括内存核心边车。此仅清单摘要不会加载插件运行时代码或探测模型或嵌入；回忆和梦境工件审核需要 `--deep`。
- 当未配置命令所有者时，doctor 会发出警告。命令所有者是允许运行仅限所有者命令并批准危险操作的人类操作员账户。DM 配对只允许某人与机器人对话；如果你在首次所有者引导功能存在之前批准过某个发送者，请显式设置 `commands.ownerAllowFrom`。
- 当配置 Codex-mode 代理且操作员的 Codex 主目录中存在个人 Codex CLI 资产时，Doctor 会报告信息注释。本地 Codex 应用程序服务器启动使用隔离的每个代理主页；如果需要，请先安装 Codex 插件，然后使用 `openclaw migrate plan codex` 盘点应刻意推广的资产。
- 当默认代理允许的技能在当前运行时环境中不可用（缺少 bin、环境变量、配置或 OS 要求）时，Doctor 会发出警告。 `doctor --fix` 可以使用 `skills.entries.<skill>.enabled=false` 禁用那些不可用的技能，并列出更改，而无需要求您重复修复。更新程序驱动的修复使可选技能启用保持不变。如果您想保持技能处于活动状态，则需要 Install/configure 缺少的要求。
- 如果较旧的Doctor运行禁用了正在运行的`sag`技能，请使用`openclaw config set skills.entries.sag.enabled true`重新启用它。

## <a id="sandbox"></a> 沙箱

- 如果启用了沙箱模式但 Docker 不可用，doctor 会报告高信号警告及修复建议（`install Docker` 或 `openclaw config set agents.defaults.sandbox.mode off`）。
- Doctor 识别每个代理 `agents.entries.<id>.sandbox` Docker、浏览器和在共享范围下忽略的修剪覆盖。当代理的显式主模型忽略回退并因此禁用默认值的回退链时，它还会发出警告；两种诊断均使用旧名册标准化后的当前代理路径。
- 如果存在已停用的沙箱注册表文件或分片目录（`~/.openclaw/sandbox/containers.json`、`~/.openclaw/sandbox/browsers.json`、`~/.openclaw/sandbox/containers/`或`~/.openclaw/sandbox/browsers/`），Doctor会报告它们，而`--fix`会拒绝而不更改其内容。通过`2026.9.7`升级，先在原主机上运行`openclaw doctor --fix`；请参阅 [ 旧状态迁移](/cli/doctor/state-migrations)。

## <a id="secrets-and-channel-credentials"></a> Secrets 和通道凭证

- 如果 `gateway.auth.token`/`gateway.auth.password` 受 SecretRef 管理且在当前命令路径中不可用，则 doctor 会报告只读警告，并且不会写入明文后备凭据。对于 exec 支持的 SecretRefs，医生会跳过执行，除非 `--allow-exec` 存在。
- 如果在修复路径中检查频道 SecretRef 失败，doctor 会继续执行并报告警告，而不是提前退出。
- 状态目录迁移后，如果启用的默认 Telegram 或 Discord 账户依赖环境变量回退，且 doctor 进程无法获取 `TELEGRAM_BOT_TOKEN` 或 `DISCORD_BOT_TOKEN`，doctor 会发出警告。
- Telegram `allowFrom` 用户名自动解析（`doctor --fix`）要求在当前命令路径中存在可解析的 Telegram 令牌。如果令牌检查不可用，doctor 会报告警告，并在本次运行中跳过自动解析。
