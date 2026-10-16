---
summary: "配置规范化、旧配置密钥迁移和更新时架构发布"
title: "配置和迁移修复"
read_when:
  - "Doctor 报告旧配置密钥或配置迁移失败"
  - "您正在添加或修改配置迁移"
---

检查 0-2 涵盖配置规范化和旧版配置密钥迁移，以及 doctor 在更新期间如何发布共享状态架构。

插件配置修复按顺序在私有配置副本上运行。如果修复失败，Doctor 会保留该钩子之前的配置，报告故障，并继续进行剩余的修复。仅警告结果保持可见，无需更改配置。修复受影响的插件，然后再次运行 `openclaw doctor --fix`。

Doctor 通过稍后的健康检查和服务最终确定来保留插件修复和诊断合同。当流程结束时（包括失败的运行），它会释放其私有插件资源。

## <a id="cloud-setup-secret-migration"></a> 云设置秘密迁移

Crabbox 插件退役了 `cloudWorkers.profiles.<id>.settings.setupEnv`。运行 `openclaw doctor --fix` 将每个旧环境名称替换为 `settings.setupSecrets` 下的同名存储 SecretRef。共享存储条目必须已受到保护 （`kind: "secret"`） 并且具有显式目标绑定。 Doctor 会比较存在的旧主机环境值；冲突的值会使配置文件保持不变。它还保留现有的冲突 `setupSecrets` 映射，而不是授予不同的秘密。

医生报告缺少受保护的条目、缺少绑定、冲突的值以及在不暴露秘密值的情况下无法进行商店检查。它从不创建存储条目、覆盖值或推断允许的主机。通过`openclaw secrets`修复商店，然后重新运行Doctor。仅当每个选定条目都准备就绪时，配置文件才会迁移；不相关的配置文件可以独立迁移。审核和试运行检查使编写的配置保持不变。

该插件将修复的配置返回给 Doctor 现有的备份、包含感知的编写器。当该阶段被承认时，更新时医生使用相同的插件健康修复。推迟记录修复警告的更新；之后运行 `openclaw doctor --fix`。未修复的 `setupEnv` 配置文件拒绝新的配置，没有明文回退。现有的租赁检查和清理仍然可用。受保护的设置秘密使快照保持启用状态；旧的明文设置图像身份不被采用作为受保护的图像。

## <a id="runtime-config-migration"></a> 运行时配置迁移

运行时配置读取需要每个模型的上下文预算和当前的 GitHub Copilot 设置。 Doctor 将已停用的提供商级别 `contextTokens` 和 `contextWindow` 值迁移到显式模型条目中，保留现有的每个模型值，并报告无法按模型表示的代理级别上限。医生还移除了`plugins.entries.github-copilot.config.discovery.enabled`；配置的 Copilot 访问会自动刷新其目录。

在使用这些已停用的密钥开始之前运行 `openclaw doctor --fix`。在候选配置验证之前，更新通过现有备份和包含感知写入流程应用相同的转换。普通读取不会影响编写的值，以便医生可以报告并持续修复。

## <a id="direct-ollama-cloud-routing"></a> 直接的Ollama Cloud路由

较旧的仅云设置将托管 Ollama 模型存储在 `models.providers.ollama` 下。当该提供程序指向 `https://ollama.com` 时，Doctor 将其移动到 `ollama-cloud` 并在代理默认值、模型白名单、每个代理设置、心跳、实用程序、子代理和压缩模型、cron 作业和会话覆盖中重写其模型引用。 URL 路径和尾部斜杠不会更改托管分类。现有的 `ollama-cloud` 目录保留其模型并获得缺失的迁移模型，而不会重复。角色模型策略允许和拒绝规则一起移动，保留限制。

本地主机、LAN 和自定义端点保持不变，包括通过登录的本地 Ollama 守护程序提供服务的云模型。其他提供商密钥也保持不变。 Doctor 不会从模型名称推断托管路由。

provider/model 路由上的显式 `remote.baseUrl` 会被单独检查：即使聊天移动到 `ollama-cloud`，本地或自定义内存嵌入端点也会保留 `ollama`。空端点继续继承聊天提供者的路由。每个代理 `agents.entries.<id>.memory.search` 独立于 `memory.search` 覆盖解析提供程序、模型和端点。 Doctor 保留了该有效路径，仅在移动共享默认值时添加显式的每个代理提供程序或模型，否则会更改它。

两个提供商都使用 `OLLAMA_API_KEY`，因此环境支持的 URL、凭据和 SecretRefs 可以保留其编写的引用，而无需进行凭据存储迁移。 Doctor 保存的 `ollama` 身份验证配置文件未受影响；如果密钥仅存在于该保存的配置文件中，请运行 `openclaw onboard --auth-choice ollama-cloud` 配置云身份验证。

迁移后的模型参考会删除其 `@profile` 后缀，而不是跨提供商移动帐户 PIN 码。如果需要，医生会发出一条提醒，要求重新固定 `/model <provider/model>@<profile>`。保存的凭据不会被修改。

运行 `openclaw doctor --fix` 以应用迁移。更新使用相同的修复。 Doctor 通过现有的状态所有者修复 cron 和会话引用，然后备份并最后发布配置。云提供商已可通过 Ollama 插件使用。如果在配置发布之前中断，托管的 `ollama` 条目将保留，并且下一次 Doctor 运行将完成幂等修复。配置发布完成后，新的本地 Ollama 选择将保持不变； Doctor 绝不会重播旧的配置备份来推断提供程序重命名。

## <a id="claude-cli-model-routing"></a> Claude CLI 模型路由

Claude CLI 登录现在使用 `claude-cli` 运行时写入 `agents.defaults.models["anthropic/*"]`。早期登录的配置仅固定登录添加的 Claude 模型，因此其他 Claude 模型回退到 API 路线，并且在没有 Anthropic 凭据的情况下失败。当默认模型是 Anthropic 模型（其条目引脚为 `claude-cli`、不存在 `anthropic/*` 条目、未设置提供程序级 Anthropic 运行时、未配置 Anthropic 凭证（身份验证配置文件、提供程序）时，Anthropic 插件的 Doctor 修复会添加通配符API 密钥、`ANTHROPIC_API_KEY` 或 `ANTHROPIC_OAUTH_TOKEN`）。具有 Claude CLI 后备的 API 默认模型保持不变，并且现有的 `anthropic/*` 条目永远不会被替换。更新通过备份的Doctor配置写入运行相同的修复； `openclaw doctor` 没有 `--fix` 报告它。

## <a id="command-owner-target-kinds"></a> 命令所有者目标种类

Doctor 保留通道插件声明的 `commands.ownerAllowFrom` 目标类型。例如，`discord:user:123456789012345678` 仍然是直接用户目标；将其重写为 `discord:123456789012345678` 将使心跳传送无法证明直接路由。命令授权仍然比较通道的本机发送者身份。

对于活动的以所有者为目标的心跳，Doctor 会根据现有的 `.bak` 到 `.bak.4` 配置历史记录检查不明确的所有者。仅当整个所有者列表仍与旧迁移的输出匹配时，它才会恢复记录的 `user:` 类型。它不会搜索过去更改的所有者、不可读的历史记录或历史包含内容。如果没有这些证据，Doctor 会保留该条目不变，并在确认 ID 属于预期用户后报告要使用的确切替代品。此警告不会阻止更新。修复使用Doctor正常的配置备份和写入路径，因此更新回滚可以恢复之前的配置。

## <a id="retention-policy"></a> 保留政策

OpenClaw 支持从 2026 年 7 月 1 日或之后发布的版本编写的格式进行迁移。发布日期控制此截止日期：稍后发布的旧版本号（包括扩展稳定版本）仍然有效。只要该窗口中的发布仍然可以写入其输入格式，就保留转换。在重写现有数据时保留旧格式的受支持版本也算作写入器。在截止之前最后写入的格式可能会与其医生检查一起废弃。当 Doctor 拒绝停用的输入时，它会指定一个中间版本以在重试之前进行升级。退役必须保持持久源数据不变。 Doctor 在进入修复维护或准备数据库迁移之前检查已退役的运行时文件并引用 OAuth sidecar。拒绝会使数据库架构和运行网关保持不变，因此中间升级仍然可用。

除了下面记录的延迟读者之外，遗留规范化属于Doctor和迁移所有者，具有现有的备份和验证流程。运行时读取器使用当前状态格式。

### <a id="deferred-compaction-checkpoints"></a> 延迟压缩检查点

保留会话条目 `compactionCheckpoints` 的运行时读取器，包括其转录保留引用和历史令牌指标。通过持久迁移替换这些受支持的读卡器将增加 300 多条净生产线；留住读者，直到该格式离开支持窗口。

最后验证的创建版本是 `v2026.9.3`。保留也算作写入：`v2026.9.7` 在转录倒回和分支操作期间保留现有检查点。计划停用日期为 **2027 年 1 月 1 日**，具体取决于验证后续发布的版本是否写入或保留该格式。此时，直接删除 reader，而不是添加临时 Doctor 迁移。如果有其他保存作者发货，请保持此记录最新。

具有空条目元数据的保留转录节点保持受支持的运行时状态；此延迟不需要 Doctor 重写这些节点。

### <a id="workspace-setup"></a> 工作区设置

嵌套 `<workspace>/.openclaw/workspace-state.json` 布局已停用。它的最后一个稳定写入器是`2026.6.8`，于2026年6月16日发布到npm。后来的保存重写改为写入`<workspace>/openclaw-workspace-state.json`。通过 `2026.9.7` 升级并在更新之前运行 `openclaw doctor --fix` 以导入嵌套文件。现任医生保持原样。根级安装文件和工作区证明仍然支持迁移输入，因为 7 月版本仍然写入它们。

### <a id="session-settings"></a> 会话设置

全局和项目 `settings.json` 读者在发现代理资源之前拒绝停用设置。他们保留原始文件并命名要修复的字段。备份文件，保留任何现有的当前格式值，然后替换：

- `queueMode` 与 `steeringMode`。
- `websockets` 与 `transport`：`true` 变为 `"websocket"`，`false` 变为 `"sse"`。
- 物体形状的 `skills` 及其 `customDirectories` 阵列，或 `[]`（如果不存在）。将 `skills.enableSkillCommands` 移至顶层 `enableSkillCommands`（如果存在）。
- `retry.maxDelayMs` 和 `retry.provider.maxRetryDelayMs`，保留其他 `retry.provider` 设置。

移动值后删除被取代的键。 OpenClaw 如果需要分阶段升级，`2026.9.7` 保留原设置读取器；在使用具有现有状态的旧版本之前，请参阅 [ 升级非常旧的版本](/install/updating#upgrading-very-old-versions)。这些嵌入式会话文件与 `openclaw.json` 是分开的：当前的 `doctor --fix` 拥有受支持的 7 月及以后的配置迁移，但不会重写这些已停用的会话设置。

`keybindings.json` 阅读器还拒绝退役的操作名称，例如 `interrupt` 和 `submit`，命名其替代名称（`app.interrupt` 和 `tui.input.submit`）。备份文件并重命名报告的条目，在两个名称出现时保留现有的当前格式绑定。拒绝重新加载将保留最后接受的绑定并使文件保持不变。仍支持未知的自定义操作名称。 OpenClaw `2026.9.7`保留了之前的按键绑定读卡器；当前的 Doctor 不会重写已退休的键绑定名称。

### <a id="retired-state-and-config-formats"></a> 退役状态和配置格式

架构 8 以下未发布的每代理 SQLite 会话布局及其预登陆记录搜索缓存已停用。医生拒绝了这些布局，没有修理他们的桌子。仍支持已发布的 schema-1 memory/auth/cache 数据库；请参阅 [agent 模式历史记录 ](/reference/database-schemas/agent-schema-history) 以了解支持的布局和恢复路由。

Telegram 7 月前的机器人信息、贴纸、线程绑定、更新偏移、消息、发送消息和主题名称 JSON sidecar 不再检查或存档。他们的最后一个文件编写器于 2026 年 5 月发货。要恢复仅在这些文件中保存的状态，请在更新之前使用 OpenClaw `2026.9.5` Doctor 的更新前备份。请参阅 [ 旧状态迁移](/cli/doctor/state-migrations)。

Telegram SQLite 更新偏移版本 1 和 2 仍然受支持，因为发布的 7 月时代的 Doctor 导入仍然可以写入它们。 Doctor 在保存经过验证的 SQLite 备份后将这些行标准化为版本 3。游标、行时间戳、过期时间和不相关的字段都会被保留。丢失的机器人身份和令牌指纹保持为空；帐户启动保留代币轮换和任何所需的入口清除的责任。更新会在帐户启动之前运行此修复。手动更换软件包后，首先运行 `openclaw doctor --fix`。

旧的 `openclaw.extension.json` npm 声明存根被 discovery 和 Doctor 忽略。它们不是插件清单，并且它们的文件保持不变。使用 `openclaw plugins install npm:<package>` 重新安装软件包，并将任何显式 `plugins.load.paths` 条目更新到已安装的插件根目录。要使用旧的自动存根修复，请在升级之前在 `2026.9.7` 上运行 `openclaw doctor --fix`。当前的 `openclaw.plugin.json` 清单和 npm 软件包安装仍然受支持。

Discord `voice.tts.<provider>` 块和行会通道 `allow` 和 `agentId` 设置也已停用，包括帐户覆盖。 Doctor 保留原始配置并命名受影响的路径。安装`2026.9.7`，运行`openclaw doctor --fix`，然后再次升级。修复的表格为`voice.tts.providers.<provider>`、行会通道`enabled`、顶级`bindings`。

设备对 `device-pair-notify.json` 已停用。通过`2026.9.5`升级并运行`openclaw doctor --fix`导入用户。更新之前验证导入的状态。如果中间版本保留原始文件以进行回滚，或者无法解释空或无效源，请在重试之前保留备份并将该文件移出活动状态目录。当前的医生拒绝了退休的来源，而不删除或重写它。

存储在 JSON 中的 Discord 模型首选项和线程绑定，以及 iMessage 回复缓存、发送回显和追赶文件也已停用。通过`2026.9.5`升级，运行`openclaw doctor --fix`，验证导入的SQLite状态。更新之前保留备份并将所有保留的原始文件移出活动状态目录；当前的 Doctor 拒绝这些来源而不修改它们的字节。 Discord 的 7 月时代命令部署缓存迁移仍然受支持，并重建其一次性哈希值。

语音呼叫 JSONL 呼叫日志已停用 7 月前的状态。通过`2026.9.7`升级，并在更新前运行`openclaw doctor --fix`导入它们。 Current Doctor 保留剩余的 JSONL 源并报告中间升级。 SQLite 架构修复仍受支持。

`provider: "log"`、`twilio.from`、平面流媒体提供商设置和 `realtime.agentContext.includeSystemPrompt` 仍支持语音呼叫配置迁移。已发布的 `2026.9.7` 可以保留并重写这些设置，同时推迟插件修复。 Doctor 拥有它们的标准化，保留当前格式值，并在写入之前备份配置；运行时解析仅接受当前形状。

OpenClaw `v2026.9.7` 仍然可以编写无所有者和无模式 cron 作业，并且其 migration/import 编写器可以保留 null、`deliver` 或混合大小写交付模式。这些 cron 修复仍然受支持。 JSON 隔离文件仍受支持：`v2026.7.35` 仍会写入它们。

Cron JSON 作业存储 （`jobs.json`）、拆分运行时状态 （`jobs-state.json`） 和每个作业 `runs/*.jsonl` 历史记录最后由稳定版 `v2026.5.28` 写入； 5 月 30 日的 SQLite 切换删除了这些写入器。 Doctor 在修复 cron 或更改配置之前拒绝这些文件，保留其原始字节和任何支持的隔离边车。安装`2026.9.7`，运行`openclaw doctor --fix`，然后升级到最新版本。候选更新准入会在激活之前检查原始实时文件并报告升级要求，包括已发布的更新程序从其以后的排练快照中省略这些文件的情况。现有的 SQLite cron 存储（包括其所有者和交付修复）保留其正常更新路径。

Doctor 拒绝 7 月之前的 JSON 传送队列文件并保持不变。通过 `2026.9.7` 升级并运行其 `openclaw doctor --fix`，然后重试。当前的 SQLite 队列仍受支持。由 `2026.9.7` 驱动的更新在停止正在运行的网关之前检查这些原始文件。同样的早期检查报告了已退役的 `plugins/installs.json` 指数的现有恢复指南。请参见[状态迁移恢复](/gateway/doctor/state-and-sessions)。

语音唤醒 trigger/routing JSON、插件绑定批准、当前对话绑定、ACP 重播 `acp/event-ledger.json` 和 `restart-sentinel.json` 已停用。他们的最后一位编写者在 7 月 1 日之前发货。剩余的 `update-check.json` 只是通知缓存，因此 Doctor 和更新会忽略它。医生和更新准入保留文件并拒绝中间升级路径：安装`2026.9.7`，在原始主机上运行`openclaw doctor --fix`，然后重试。中断的 ACP 和重新启动哨兵导入声明也被保留。当前 SQLite 状态和支持的配置运行状况导入器保持不变。插件绑定批准保留其原始默认主范围；自定义状态目录不会检查另一个配置文件的批准文件。

Startup 将这些废弃的文件留给 Doctor。当 `openclaw gateway run` 或本地 `openclaw message send` 准备该状态时，它会继续而不导入文件，记录警告，并在启动诊断中保留该延迟的结果。它们的存在本身并不能阻止引导或恢复重新启动。网关路由的消息客户端将状态准备工作留给正在运行的网关。如果此咨询检查失败，启动会记录错误并指导运行 `openclaw doctor` 并继续而不更改文件。

Doctor 还拒绝这些已退役的配置输入：

- `agents.defaults.llm`，代理`embeddedPi`、`embeddedHarness`，全代理`agentRuntime`、`systemPromptOverride`、`sandbox.perSession`。
- 代理和表面`silentReplyRewrite`和`silentReply.direct`。
- Agent `model.timeoutMs` 和 `subagents.model.timeoutMs`，包括默认值。工具模型选择器的超时仍然受支持。
- `memorySearch.store.path`，包括其代理形式和`memory.search`形式。
- `plugins.installs`、`gateway.webchat`、`session.parentForkMaxTokens`、`browser.relayBindHost` 和 `browser.ssrfPolicy.allowPrivateNetwork`。
- 具有旧版 `cdpUrl` 的扩展浏览器配置文件。当前的分机配置文件会自动发现其中继端点；扩展驱动程序仍然受支持。
- `openai-codex-responses` 提供商或模型 API 标识符。中间版本在当前提供程序修复之前将其迁移到 `openai-chatgpt-responses`。
- 队列模式`queue`、`steer-backlog`和`messages.queue.mode`或`messages.queue.byChannel`中的`steer+backlog`。
- 顶级`heartbeat`、`routing.allowFrom`和`routing.groupChat`。
- 顶级通话实时选择器 `talk.mode`、`talk.transport`、`talk.brain`、`talk.model` 和 `talk.voice`。
- `channels.telegram.requireMention`、`channels.feishu.accounts.<id>.botName` 和退役的 `channels.webchat` 部分。
- `channels.telegram.groupMentionsOnly`；使用 `channels.telegram.groups["*"].requireMention`。
- `channels.whatsapp.exposeErrorText`，包括帐户覆盖。
- `session.threadBindings.ttlHours` 和 Discord/LINE/Matrix/Telegram `threadBindings.ttlHours`，包括每个账户的设置。
- Telegram `dm`、`direct.*.threadReplies`、本机草稿预览设置以及标量或平面流设置（`streamMode`、`chunkMode`、`blockStreaming`、`blockStreamingCoalesce` 和`draftChunk`），包括帐户覆盖。
- Nextcloud 谈话 `allowPrivateNetwork`；使用当前 `network.dangerouslyAllowPrivateNetwork` 设置之前的中间迁移。
- Matrix `dm.policy: "trusted"`、`allowPrivateNetwork` 和 `groups.<room>` 或 `rooms.<room>` 中的 `allow`，包括帐户覆盖。
- Slack `channels.<id>.allow`，包括帐户覆盖。

在当前验证成功之前，必须修复包含这些密钥的配置。 Doctor 会保留配置并停止并提供恢复指导，而不是删除这些设置或用备份替换它们。对于较旧的安装，请通过 `2026.9.5`](/install/updating#upgrading-very-old-versions) 升级 [ 并在安装最新版本之前运行其 Doctor 迁移。

WhatsApp的`exposeErrorText`自2026年4月起已被忽略。请在重试之前将其从报告的通道或帐户路径中删除；删除此无操作不会更改错误传递。 Doctor 保持编写的配置不变，或者您可以使用上面的中间版本将其删除。

`credentials/auth-profiles/` 下的 OAuth 凭证 sidecar 已停用。他们的最后一位作家于 2026 年 5 月 16 日以 `2026.5.16-beta.3` 发货； `2026.5.16-beta.4` 删除了该编写器。 Doctor 无需读取凭据或访问加密密钥即可检测这些文件。当旧版 `auth-profiles.json` 仍引用该主机时，请通过 `2026.9.7` 升级并在原始主机上运行 `openclaw doctor --fix`，然后重试。没有遗留配置文件引用的 Sidecar 保留在原处并且​​不会阻止升级； `2026.9.7` 也保留它们，因为其扫描之外的代理目录可能仍然使用它们。支持的 `auth.json`、`auth-profiles.json`、SQLite 凭证和迁移恢复合约保持不变。

## <a id="cron-ownership-before-roster-migration"></a> 名册迁移前的 Cron 所有权

在停用旧代理名册的默认标记之前，Doctor 将无主 cron 作业固定到该历史代理。当选择不同的系统代理时，这也适用。显式作业所有者和代理限定会话密钥保持不变。 Doctor 保存经过验证的 SQLite 备份，并在提交之前重新检查存储的所有者和定义。如果所有权无法修复，它会保留名册标记并报告要解决的情况。

当交付规范化先于所有权修复时，每个阶段都会保存自己经过验证的快照。最早的备份保留原始的持久 cron 定义、所有权和运行时状态。存档的受支持隔离区 JSON 保留其原始字节。

仅在 SQLite 所有者列中记录的所有者由 Doctor 复制到作业的当前格式定义中。其代理身份和运行时状态保持不变；不同的系统代理选择不会覆盖它。

普通配置写入不会修复 cron 所有权。 `openclaw doctor --fix` 指导意见会拒绝会失去历史所有者的名单变更。在更新或删除未解决的历史作业之前运行 Doctor。代理范围的管理不会从当前选定的系统代理继承这些作业；具有不受限制的会话访问权限的操作员仍然可以检查它们。当所有权未解决时，受限的个人资料和代理视图等待 `openclaw doctor --fix`；运行时不会从旧版 SQL 所有者或默认标记推断共享权限。显式创建者和代理合格的会话所有权保留其现有的共享检查。删除另一个代理会保持未解决的行完好无损。正常的 `openclaw update` Doctor 阶段在保存迁移的配置之前执行此修复，包括其早期的预检和包含恢复写入。在早期的更新演练中，Doctor 可以导入隔离行并规范私有数据库副本中的 cron 定义。它保留未复制的隔离文件，包括链接文件，并报告其延迟归档。实时 Doctor 阶段导入这些源并在软件包安装后将它们存档。这还可以保护由受支持的旧版本启动的更新。

## <a id="legacy-cron-delivery-settings"></a> 旧版 cron 传送设置

存储的交付对象必须命名其模式：`none`、`announce` 或 `webhook`。 Doctor 将缺失或空模式以及已停用的 `deliver` 值修复为 `announce`。它还会修剪和小写识别模式。未知模式保持不变，并提供指导以查看预期路线。

调度程序使未修复的作业保持可见并报告 `openclaw doctor --fix`；它会阻止他们的执行，而健康的工作仍在继续。医生修复已知的遗留值。对于未知值，请在查看预期路线后明确编辑递送模式。不相关的编辑不能默默地丢弃它。完全省略的交付仍然使用作业的正常默认值；可选的失败通知字段仍然继承其配置的默认值。

网关 `cron.add` 和 `cron.update` 请求仍接受已弃用的 `delivery.mode: "deliver"` 拼写并保留 `announce`。客户应发送 `announce`。此请求适配器不会修复存储的 `deliver` 值；那些仍然需要医生。

## <a id="exec-approval-policy"></a> Exec 审批政策

Doctor 规范了已存储在 SQLite 以及导入的 JSON 文件中的旧版执行审批策略。在重写 SQLite 行之前，它会保留一个名为 `openclaw.sqlite.pre-exec-approvals-migration-*.bak` 的经过验证的私有数据库快照。它将历史 `default` 代理策略移至 `main`，保留显式 `main` 值并合并允许列表条目和 MCP 授权。字符串白名单条目成为具有稳定 ID 的对象。过时的 `commandText` 和无法识别的源标签保留在备份中；当前命令使用的元数据、套接字凭据和行的更新时间戳将被保留。

运行时读取器需要当前的策略格式并报告旧行的 `openclaw doctor --fix` 指南，而无需替换它。更新时 Doctor pass 运行相同的迁移。重复 Doctor 会使标准化行及其 ID 保持不变。已发布的 SDK 和操作员输入标准化在输入边界仍然可用。

## <a id="claw-provenance-schema"></a> Claw 来源模式

爪子更新计划和简历预览需要当前的出处列。缺少引导程序或扩展出处列的较旧 SQLite 数据库现在停止使用 `openclaw doctor --fix` 指导。只读规划使这些数据库保持不变，而不是将缺失的列投影为空值。

Doctor 和更新时 Doctor pass 使用现有的共享状态模式修复。即使数字模式版本已经是最新版本，Doctor 也会保留经过验证的迁移前数据库快照，然后添加缺失的可为空列。安装记录、包引用、时间戳和同意约束的 v1 恢复计划保留其值。重复修复不会产生额外效果。

## <a id="channel-account-routing-during-an-update"></a> 更新期间的渠道帐户路由

Doctor 保留现有的渠道帐户映射及其隐式默认路由。共享根策略绝不会在命名帐户旁边创建额外的 `accounts.default`。空账户映射仍然可以接收迁移后的单账户字段； WhatsApp 等插件将其支持的共享策略保留在根目录中。

当纯策略、未链接的 WhatsApp `accounts.default` 位于指定帐户旁边时，Doctor 警告说，它可能是早期促销留下的，或者可能是等待登录的有意帐户。它命名当前为不合格操作选择的帐户，并保持帐户映射、共享策略和路由不变。 Doctor 无法从该配置形状推断谁创建了帐户。

要显式选择现有命名帐户，同时保留所有帐户和共享策略，请运行 `openclaw config set channels.whatsapp.defaultAccount '"work"' --strict-json`（将 `work` 替换为所需帐户 ID）。如果您确定不需要默认帐户，请首先保留从该帐户继承的任何共享策略，然后运行 ​​`openclaw channels remove --channel whatsapp --account default --delete`。医生的警告提供了配置的命名帐户的命令。它不执行任何操作，包括在更新或重复 `doctor --fix` 运行期间。

## <a id="channel-ownership-during-an-update"></a> 更新期间的频道所有权

当Doctor迁移遗产时`agents.list`名册上没有`default: true`标记为显式所有权，它还保留未绑定的帐户，并绑定到旧列表中的第一个代理，该代理在更新之前接收了隐式流量。现有的帐户绑定和更窄的对话路线保持不变。 Doctor 报告每个添加的绑定，并通过正常的配置备份和验证流程将其与名册迁移一起保存。

更新通道迁移和手动 `openclaw doctor --fix` 使用配置快照中的原始名册。较窄的对话路径永远不会建立帐户范围的所有权。如果原始名册不可用，Doctor 会报告 `unresolved: original roster unavailable` 以及要添加的确切绑定，并保持帐户的绑定不变。当网关和其他帐户继续运行时，未解决的帐户将因该原因而保持锁定状态；它不会进入重新启动循环。添加报告的绑定并重新启动网关。

## <a id="sender-tool-policies"></a> Sender工具策略

Doctor 在配置验证之前将无前缀的 `toolsBySender` 密钥迁移到 `id:` 条目，包括更新时 Doctor 通行证。它保留了以前的匹配行为：无前缀密钥上的前导 `@` 被删除，ID 匹配不考虑大小写，并且当多个密钥规范化为相同的 ID 时，第一个配置的策略获胜。 Doctor 会报告隐藏条目并在保存修复之前将其原始值保留在正常配置备份中。

运行时配置需要键入发送者密钥或 `"*"`。直接替换二进制文件后，在启动网关之前运行 `openclaw doctor --fix`。仍支持显式 `id:@user:server` 策略和传入发件人 ID 匹配。

## <a id="agent-roster-migration"></a> 智能体列表迁移

普通配置读取需要当前键控的 `agents.entries` 格式；它们不会转换填充的 `agents.list` 或删除旧的 `default` 标记。在使用这些输入启动直接替换的二进制文件之前运行 `openclaw doctor --fix`。正常的 `openclaw update` 流程调用候选 Doctor。没有名册的新配置仍然会收到内存中的 `main` 默认值。

Doctor 在迁移配置和持久状态（包括无所有者的 cron 作业）时保留原始名册顺序和历史所有者。它保留了旧的工作空间，并在淘汰标记之前具体化所需的每个表面所有者。显式系统代理、身份验证继承和其他角色所有者保持独立：选择不同的系统代理不会更改哪个代理拥有现有遗留数据。保留原始标记，直到 Doctor 完成配置和状态修复。

Doctor 遵循现有的 [include 写入约束 ](/gateway/config-secrets-env)。根级别 `$include` 或跨越包含的名册和根拥有的角色的修复可能需要手动准备；单独重复 `doctor --fix` 并不能消除该所有权限制。保留根配置、包含文件和持久状态的备份。暂时将原始包含解析的遗留配置合并到一个 `openclaw.json` 中，保留列表顺序、默认标记、创作环境和秘密引用以及配置路径的含义。不要替换已经规范化的运行时视图或手动删除旧标记：Doctor 仍然需要该来源来迁移数据所有权。

运行 `openclaw doctor --fix` 或使用该单文件配置重试更新。修复完成且 `openclaw config validate` 成功后，如果需要，可将更新的配置重新拆分为包含内容，然后再次验证。保留备份，直到验证修复的配置和迁移的状态。

## <a id="channel-private-network-opt-ins"></a> 频道专用网络选择加入

Matrix、Mattermost 和 Tlon 运行时路径在通道或帐户范围内仅读取 `network.dangerouslyAllowPrivateNetwork`。 Tlon 保留了针对旧版 `allowPrivateNetwork` 密钥的插件拥有的 Doctor 转换。它保留了显式的当前格式布尔值，包括 `false`。在将旧配置与直接替换的二进制文件一起使用之前运行 `openclaw doctor --fix`。更新通过 Doctor 和正常的配置备份流程调用相同的转换。延迟的插件迁移在安装后保留其对 Doctor 的输入；这些输入不会启用运行时专用网络访问。

Matrix 和 Mattermost 平键迁移已停用。在升级之前，在 `2026.9.7` 上使用 `openclaw doctor --fix` 修复旧配置。

## <a id="channel-webhook-listeners"></a> Channel webhook 侦听器

Feishu、Microsoft Teams、Nextcloud Talk 和 Telegram 接收网关 HTTP 路由上的 Webhooks。新安装不会打开单独的 Webhook 端口，除非 `legacyWebhook: { port, host? }` 明确选择一个端口。

Doctor 通过一次性迁移保留现有回调。它检查先前网关操作、通道入口或更新的证据，而不是比较版本字符串或将空状态数据库视为现有安装。对于没有显式或继承的 `legacyWebhook` 设置的已启用 Webhook 帐户，它将固定历史端点：Feishu `127.0.0.1:3000`、Teams 通配符端口 `3978`、Nextcloud Talk `0.0.0.0:8788` 或 Telegram `127.0.0.1:8787` 当其回调 URL 与其配置的公共网关目标不匹配或其配置的路径无法由网关提供服务时。已禁用的帐户、Telegram 轮询和 Feishu WebSocket 传输不会收到 pin。显式对象和 `false` 设置仍然具有权威性。

显式和更新时 Doctor 使用相同的迁移所有者。 Doctor 通过正常的写入流程验证并备份配置。引脚和 `meta.migrations.webhookListeners` 完成标记保存在一起，包括当通道设置来自 `$include` 文件时。全新安装记录 `true`，无引脚。现有安装记录一个对象，其键是完整的通道 ID，其值列出了迁移插入的确切配置路径；空列表意味着该通道不需要 pin。

移除销钉时请保留此标记。随后的 Doctor 运行、重新启动和更新将不会重新创建它。帐户 PIN 码仅涵盖迁移期间存在的帐户。对于具有较旧 Doctor 合约的可信官方插件，Doctor 使用网关附带的历史侦听器事实。安装的插件保留其其他配置迁移的所有权。在更新期间，当安装的官方插件被推迟到包收敛时，这些侦听器修复也会运行；它的延迟代码不会被加载，替换插件保留其所有权。当其他通道完成时，其他插件可以保持待处理状态。替换挂起的插件会在新的运行时启动之前通过安装程序的备份配置发布运行相同的迁移。在删除其引脚之前更新保留的旧版独立插件；较旧的插件版本仍然可以打开其历史默认端口。

启动时配置字节保持不变。当完成标记是唯一需要的更改时，启动会将其记录在存储的 SQLite 机器状态中，包括尚不存在配置文件时。如果端点或其他通道设置需要修复，启动会拒绝 `openclaw doctor --fix` 指导。对于只读外部配置源，请按照启动错误的指示更新该源及其完成标记。 Startup 拒绝删除未迁移的端点。全新安装不需要会干扰 `gateway --dev` 设置的引脚或新配置文件。

仍然支持现有的显式密钥迁移：`webhookPort` 和 `webhookHost` 变为 `legacyWebhook: { port, host? }`； Teams `webhook.port` 变为 `legacyWebhook.port`，同时保留 `webhook.path`。仅主机设置保留其历史默认端口。两个侦听器使用相同的网关请求管道、签名检查和重试响应。

导出的 Feishu、Microsoft Teams、Nextcloud Talk 和 Telegram 配置类型保留已弃用的侦听器输入属性（`webhookPort`、`webhookHost` 或 `webhook.port`），直到下一个插件 SDK专业。 TypeScript 配置生成器保持源兼容，但解析的运行时配置仅使用 `legacyWebhook`；在使用旧输入之前运行 Doctor。

将外部回调或反向代理上游更新到网关端口和通道的 Webhook 路径，验证传递，然后删除 pin 以关闭旧端口。使用帐户级别 `legacyWebhook: false` 禁用继承的端点。当没有帐户保留共享兼容性端口时，共享兼容性端口将关闭。 Doctor 确定了网关路由，并且仍然需要外部回调或代理更改。

新单独安装的 Feishu、Microsoft Teams、Nextcloud Talk 和 Telegram 插件需要 OpenClaw、2026.9.9 或更新版本，以便主机可以在替换之前保留隐式侦听器。较旧的主机拒绝这些软件包并保留已安装的插件；先升级OpenClaw。

对于没有显式侦听器设置的 Telegram，当 `webhookUrl` 匹配 `gateway.publicOrigin` 加上可用的 `webhookPath`（包括路径和查询）时，Doctor 会识别网关目标。启动时注册配置的 `webhookUrl` 不变。在通道准备就绪释放旧侦听器切换之前，注册必须成功；承认传入的 Webhook 并不会释放它。完整进程重启仍然有其正常的重启间隔。任何其他回调 URL 仍可能代理到旧端口，因此即使配置了 `gateway.publicOrigin`，Doctor 也会使用 pin 保留该端口。在删除 pin 之前将 `webhookUrl` 设置为公共网关路由，或将现有代理的上游移动到网关端口。显式端点对象和 `false` 仍然具有权威性。在不同端口上共享路径和机密的帐户必须使用不同的机密或路径，然后才能将其移动到一个网关端口。

Microsoft Teams 在两个侦听器上保留其 Express 主体解析器、ExpressAdapter 和 SDK 身份验证。在删除 pin 之前，将其 Azure Bot 消息传递终结点或代理上游移动到网关路由。

对于仅环境 Teams 凭证，Doctor 会保留端点而无需持续激活； `gateway run --ambient-channels` 仍然控制 Teams 是否运行。如果 Doctor 在没有这些凭据的情况下运行，则现有安装只会使 Teams 迁移挂起，直到第一次网关启动为止；其他渠道尚未完成。没有 Teams 凭证或新编写的 Teams 配置的初创公司无需 PIN 码即可完成该决定。稍后添加 Teams 不会重新打开其旧端口。现有的仅侦听器源配置获得 `enabled: true` 以保留其先前的激活。

## <a id="talk-realtime-inheritance"></a> Talk实时继承

Doctor 通过其正常验证的备份配置写入将先前继承的语音呼叫实时提供程序设置复制到 `talk.realtime` 中。显式 Talk 设置获胜，包括整个提供程序块和唯一配置的 Talk 提供程序。 SecretRefs 仍为参考文献。语音通话本身的实时和流媒体设置对于电话和通话转录保持不变。

修复后，实时Talk只能读取`talk.realtime`；更改语音通话设置不再更改通话会话。唯一迁移的提供商遵循 Talk 的正常单一提供商选择规则。当语音呼叫输入保留时，Doctor 会填充缺失的通话提供商设置，并且重复修复不会改变，直到这些输入或缺失的目标发生变化。此修复也在由已发布的更新程序驱动的更新期间运行，该更新程序在没有 `--fix` 的情况下调用 Doctor。仅语音呼叫设置仍然有效。 Doctor 独立于架构错误检测此待处理的继承修复；普通配置读取永远不会将设置复制到 Talk 中。

## <a id="acp-session-metadata"></a> ACP 会话元数据

Doctor 将历史原始、代理前缀和无主 ACP 元数据密钥移动到绑定到拥有会话的规范化密钥。它还导入 SQLite 会话条目中嵌入的 ACP 元数据。在重写源数据库之前，Doctor 会保存经过验证的私有 SQLite 备份并报告其路径。重新生成密钥会保留除密钥之外的所有元数据列。嵌入式导入保留当前的 ​​ACP 字段，包括身份和运行时选项 JSON、生命周期绑定和上次活动；条目的更新时间戳成为元数据更新时间戳。未知的嵌入字段保留在源备份中。嵌入式 JSON 遵循会话解码器的重复属性的最后值语义。不明确的所有权和冲突的有效负载保持不变，并带有命名受影响会话的警告。

运行时读取和写入仅使用当前格式的元数据。在将会话存储传递给运行时之前，启动会拒绝具有当前会话绑定的未迁移的 ACP 状态，并带有离线修复指令。绑定不存在或过时的历史共享行保持不变，并且不会阻止启动；运行时不提供其元数据。不可读的候选存储和未解决的记录所有者仍然阻止入场。恢复旧状态后运行`openclaw doctor --fix`；更新时的 Doctor pass 运行相同的修复。嵌入式元数据导入会在删除源字段之前记录持久收据，因此在清除存储的元数据后重试中断的清理无法重新打开会话。旧版 `sessions.json` 导入保留其现有备份和源收据。

## <a id="acp-agents'-model-precedence"></a><a id="acp-agents-model-precedence"></a> ACP 智能体模型优先

对于 `runtime.type: "acp"`、`agents.entries.*.model`（字符串形式）或 `agents.entries.*.model.primary`（对象形式）的代理，选择 ACP harness模型。这也适用于看起来像 `provider/model` 参考的harness选择。 OpenClaw 在配置时使用 `agents.defaults.model` 解析单独的本机默认值。显式本机会话、实用程序和子代理模型选择保留其优先级。

Doctor 将这种分离报告为信息 （`core/doctor/acp-agent-model`），命名配置的路径、harness模型和已解析的本机默认值。匹配和不同选择都是受支持的配置。此通知不建议修复，也不重写配置； ACP 转弯保留其配置的harness选择。

## <a id="missing-plugins-during-migration"></a> 迁移期间缺少插件

Doctor 拥有延迟的插件迁移。正常的 CLI 命令、网关启动和配置读取不会检查挂起的迁移记录或应用其验证豁免。他们使用规范的配置和状态。

丢失或无法完成安装的已配置插件不会阻止 Doctor 修复独立状态。 Doctor 会记录一条警告，其中包含该插件的名称、其待处理的迁移以及完成安装或修复的命令。当保留的配置通过正常验证时，可用插件可以运行。如果保留的旧设置被拒绝，请安装或修复其所属插件，然后在启动网关之前运行 `openclaw doctor --fix`。

`doctor --fix` 在记录挂起的插件迁移之前修复较旧的共享数据库架构。因此，缺少插件不会阻止数据库修复；他们的输入仍可供稍后重试。

Doctor 在修复期间（包括更改不相关的设置时）保留延迟状态和遗留配置输入。安装或修复插件后，运行 `openclaw doctor --fix` 以完成其迁移并清除挂起的警告。在旧版本驱动的更新期间，插件安装可以保持推迟，直到更新程序完成；其未决输入受到相同的保护。当插件迁移恢复时，核心导入后进行的会话编辑和删除仍然具有权威性。

当受保护的配置为空或不存在并且没有未完成的状态迁移或检查要求时，Doctor 解决了不可用插件的旧义务。现有的迁移收据记录没有任何可迁移的内容。迁移完成后，已知的官方替代品可以取代旧的义务，并且不再需要转移旧的插件设置。保留存储的插件数据；这些结果不会启用插件或扩大许可名单。即使其值为空对象或数组，从验证中排除的旧字段仍然受到保护；它们的主人必须解释或删除它们。通过激活策略的显式启用的插件会保留其包义务，直到它变得可用，即使它没有自定义设置。更新排练使得业主无法解决现场更新最终确定的问题。

如果保留的设置或明确的 state/inspection 要求仍然存在，Doctor 会保留待处理的义务并指定要安装或启用的插件。已退役的插件可能需要其维护者支持的恢复路径。禁用或卸载插件本身并不能完成其迁移。 Doctor完成后更新状态读取已结算的收据；仍然拥有插件安装的更新父级继续推迟工作。

当迁移待处理时，Doctor 的迁移感知写入拒绝会更改或删除其保留输入的编辑，并在发布前重新检查待处理的义务。普通配置编辑使用正常验证并且不检查迁移记录。在编辑其保留的设置之前完成插件迁移。

`openclaw update` 在更新和插件聚合期间运行候选者的 Doctor，包括旧版支持的更新程序。直接 Git/source 或程序包管理器升级后，请在正常命令或网关启动之前运行 `openclaw doctor --fix`。包安装不执行操作员状态迁移。即使不存在更新运行，Doctor 和 `openclaw update status` 也会报告挂起的插件升级。

## <a id="blocked-local-plugins"></a> 阻止的本地插件

Doctor 保留被发现拒绝的本地插件的完整配置条目和插件策略，包括所有权和可写路径安全检查。被阻止的插件不是已卸载的插件。它的运行时仍然被阻止，Doctor 报告路径问题，而不是删除其启用或建议为本地路径重新安装注册表。修复路径并以运行网关的帐户重新运行 `openclaw doctor --fix`。

当更新调用候选 Doctor 时，这种保留也适用。它不会更改更新执行帐户或修复已由其他用户拥有的文件。

## <a id="retired-taskflow-webhooks-plugin"></a> 已退役 TaskFlow Webhooks 插件

捆绑的 TaskFlow Webhooks 插件已被删除。现有的 `plugins.entries.webhooks` 设置将被忽略，并显示 `plugin removed: webhooks` 警告，以便网关可以在更新后启动。运行 `openclaw doctor --fix` 以通过正常的配置备份和修复流程删除其过时条目和 `plugins.allow` 或 `plugins.deny` 引用。此停用不会更改数据库架构或删除存储的任务或 TaskFlows。

如果 Webhooks 是 `plugins.allow` 中唯一的插件，Doctor 会将其他已启用的插件保留为显式允许列表条目，包括配置的捆绑通道和选定的内存或上下文引擎插件。现有的拒绝和禁用设置仍然适用。医生报告保留的身份证件；更改频道或插件插槽时请查看此列表，因为这些条目保留显式插件权限。

如果没有剩余启用的插件，Doctor 将设置 `plugins.enabled: false`。否则，空的允许列表将允许加载不相关的已安装插件。查看剩余的插件选项，将 `plugins.allow` 设置为您想要的插件，然后重新启用插件。

如果活动插件的旧版 ID 别名为其他所有者，Doctor 会保持过时的插件设置不变并发出警告，而不是授予其他所有者访问权限。选择不冲突的允许插件 ID，然后重新运行 `openclaw doctor --fix` 以完成清理。其他医生的维修仍在继续。

使用 [Gateway HTTP hooks](/automation/cron-jobs/webhooks) 唤醒代理或从外部服务提交代理轮次。它们的 `hooks.*` 设置、内部事件挂钩和 `openclaw webhooks gmail` 命令仍然可用。已停用插件的 TaskFlow 记录操作没有等效的 HTTP 端点。

## <a id="schema-publication-during-a-2026.9.2-update"></a><a id="schema-publication-during-a-2026-9-2-update"></a> 2026.9.2 更新期间的 Schema 发布

当 OpenClaw 2026.9.2 驱动需要更新的共享状态架构的更新时，Doctor 将应用迁移内容并报告 `schema content applied; version publication deferred until update run <id> finishes`。旧的更新程序可以完成其账本访问，而新的网关则使用迁移的内容。等到所有受影响的终端运行至少五分钟后才发布；连续运行的行超过 30 分钟保持不变视为放弃。每个打开的可写数据库都遵循此规则，并且网关观察者会在截止日期之后安排发布。

当网关运行时，普通的 CLI 命令（包括 Doctor）仍然可用。应用的内容视为准备就绪；只有拥有的网关，或者当没有网关拥有状态目录时的可写开启器，才会在宽限后发布版本。

代理数据库迁移不存在版本延迟。在已发布的 2026.9.2 更新程序的回滚窗口期间，Doctor 会验证私有状态副本并保持实时数据库和配置不变。包回滚不再可能后，新的更新继续需要在 Doctor 迁移实时状态之前覆盖每个挂起的代理数据库和当前更新所有权的经过验证的备份。托管更新保留已发送助手的原始移交记录不变。

当无法验证此切换、备份覆盖范围丢失、所需的共享状态元数据表不存在或迁移失败时，Doctor 会报告 `update-schema-bump-unfenced`。按照[手动更新顺序](/install/updating#updating-from-2026.9.2-across-a-schema-bump)从拒绝开始。请参阅 [Database schemas](/reference/database-schemas#schema-bumps-and-older-updaters) 了解发布合同以及旧 CLI 在宽限期后停滞的剩余风险。

## <a id="native-codex-recovery-after-tasks-removal"></a> 任务删除后 Native Codex 恢复

Codex 插件的 `codex-native-assignment-repair` 在 `openclaw doctor --fix` 和更新时间 Doctor 期间运行，在会话修复之后。它会折叠同一子级和本机轮次的经过验证的重复分配，并删除其请求者会话、生命周期或连接已证明已过时的分配。兼容的别名保留其收据和记录结果元数据；冲突的事实会产生可恢复的警告，而无需更改行。保留一个孩子的单独待处理回合。修复使用现有的 SQLite 备份和精确行比较并应用所有者；数据库架构或分配格式没有更改。普通网关启动不会运行此修复。

修复期间更改的未知或格式错误的所有权和绑定会保留并带有可恢复的警告，从而允许更新尽最大努力完成。解决这些警告后重试 `openclaw doctor --fix`。没有持久证据的历史重试耗尽仍未得到解决：任务的年龄和子项的完成执行都不能证明其结果已交付或放弃。

从任务运行时升级时，Codex 插件的 `codex-native-task-assignments` Doctor 迁移会保留可恢复的本机子工作。它贯穿现有插件状态迁移生命周期，包括更新时Doctor。直接二进制替换后，在启动新网关之前运行 `openclaw doctor --fix`。

在维护期间，Doctor 读取 `~/.openclaw/state/openclaw.sqlite` 的快照，并选择具有 `runtime = 'subagent'` 和 `task_kind = 'codex-native'` 的旧 `task_runs` 记录。它仅导入唯一标识的、未确认的工作，其 `nativeHistory` 所有者标记与当前请求者的物理会话、生命周期修订和 Codex 连接相匹配。这些所有权标记已存在于已发布的 2026.9.4 状态中。本机线程轮换后，原始本机父级可能会有所不同，但轮换无法提供缺失的请求者所有权。初始子级和已升级到任务行的后续子级保留其确切的子级和转弯定位器。当本机历史记录不再包含结果时，持久的终端摘要、状态和完成时间仍然可用。

标记为 `failed` 的终端交付仍保留历史记录，并且不会自动重新启动。当任务完成（`succeeded`、`failed` 或 `cancelled`）并且其原始请求者绑定丢失、清除或不再匹配记录的会话、生命周期或连接时，Doctor 还会将待处理交付结算为 `failed`。它将 `Undeliverable historical delivery` 原因附加到任务的现有 `error` 字段，并保留任何先前的错误、执行状态、结果、本机定位器和所有权事实。这并不意味着成功交付或将结果导入到替换父级中。该行仍然可供检查，后续的迁移过程将使其成为历史记录。如果没有其他 Codex 迁移挂起，正常的插件生命周期将确认数据准备就绪并恢复完整设置验证。

迁移将 `nativeSubagentAssignments` 和每源任务 ID 标记 `nativeSubagentTaskImport` 一起写入现有 `app-server-thread-bindings` 插件状态的一个比较和应用操作中。更改的绑定将被保留并报告以供重试。确认会消耗分配，而导入标记会在确认、本机轮换、清除和重置后继续存在，因此未更改的遗留行无法恢复已完成的工作。共享数据库在迁移的备份清单中声明，因此迁移前备份也会在回滚时恢复交付结算。导入的源任务行保持字节相同；历史结算仅更改交货状态和记录的错误。没有新的 SQL 表、架构版本冲突、任务运行时读取器或替换任务分类帐。本机执行和完成交付继续需要当前请求者权限。

未标记的记录（包括 2026.9.2-era 行）无法建立丢失的物理请求者和连接历史记录。 Doctor 还保留不明确的重复运行 ID、格式错误的记录以及所有权不再匹配的未完成的工作。它会发出可恢复的警告，标识任务和本机运行，而无需禁用网关或不相关的会话。检查其原始本机 Codex 帐户中的子项，或使用其匹配的 OpenClaw 版本恢复更新前备份以完成交付。解决可修复的绑定冲突后，再次运行 `openclaw doctor --fix`。迁移不会仅猜测当前父级的所有权。

## <a id="replay-a-july-2026-config-upgrade"></a> 重播 2026 年 7 月配置升级

从安装了 pnpm 依赖项的源签出中，运行：

```bash
node scripts/doctor-config-upgrade-replay.mjs
```

该驱动程序使用普通的 Node 运行，并且仅导入 Node 内置程序。它需要结帐的固定装置和 `pnpm openclaw` 构建包装器；仅安装的 npm 软件包无法运行此重放。驱动程序不需要调用 `tsx`。

重播使用合成的 `test/fixtures/doctor-2026.7.1.json` 配置。它通过`pnpm openclaw`构建，隔离`.local`下的home、state、config和log，并选择空闲的环回端口。它捕获修复前的验证、两次 `doctor --fix --non-interactive` 通过、第一次通过后的验证以及网关启动。它将原始配置、修复后的副本和命令输出保留在打印目录中。第二遍必须保持配置字节不变。它永远不需要凭据或正在运行的网关。

第二个固定装置涵盖 `messages.tts`，在删除退役的 TTS 字段之前移动到 `tts`。 Doctor 在删除 `prefsPath` 之前将旧的首选项文件路径保留在共享计算机状态；现有的当前格式设置和存储的状态保持优先，并且首选项文件保持不变。

该夹具结合了两个代理 `agents.list` 名册、旧模型允许列表、本地内存搜索、CLI 音频模型、Telegram 帐户允许列表以及已停用的 `meta.lastTouchedAt`、`gateway.tailscale.resetOnExit` 和 `gateway.nodes.denyCommands` 密钥。当前媒体字段可选复数`capabilities`； Doctor 在将纯音频模型移动到 `tools.media.models` 时添加了 `["audio"]`。不需要单个 `capability` 字段。

本地嵌入保留 `local` 提供程序及其现有模型选择。进程内 `node-llama-cpp` 运行时已替换为托管 `llama-server`。当托管设置丢失时，Doctor 和 Gateway 启动会命名降级语义召回和插件的引导设置命令：

```bash
openclaw models --agent main auth login --provider llama-cpp --method local
```

以交互方式运行该命令并选择适当的托管设置，然后使用 `openclaw memory status --deep` 进行验证。安装程序可以在不更改聊天模型的情况下提供嵌入。下载需要设置同意。在7月份的提供商中，`memorySearch.model`没有选择本地GGUF：`local.modelPath`选择了。因此，Doctor 保留了这两个字段，而不是默默地将被忽略的模型值转换为不同的嵌入模型。参见 [llama.cpp](/plugins/llama-cpp).

## <a id="auth-credential-fields"></a> Auth 凭证字段

Doctor 在 JSON 导入和现有 SQLite 身份验证存储中拥有旧的凭证字段转换，包括其配置文件 ID 已使用当前提供商名称的存储。仅现场 ​​SQLite 修复可保存经过验证的私有备份，并保留配置文件 ID、凭证材料、未知元数据和轮换状态。格式错误的凭证值和不可读的旋转状态 JSON 保持不变；它们不会阻止对受支持字段的修复。别名重命名仍然需要有效的完整存储和轮换状态。当所有者无法安全地重命名其 ID 时，Doctor 会推迟受影响的配置、会话和个人帐户引用。被占用的别名目标或更改的帐户收据会推迟该映射，而不会阻止独立的凭据字段修复或安全别名。

该转换将已识别的 `mode` 移动到缺失的 `type`，将 `type: "apiKey"` 更改为 `api_key`，并将可用的 `apiKey` 或 `api_key` 值移动到 `key`。可用的当前格式键和引用优先；空或格式错误的键不会丢弃可用的旧值。这些别名也可能包含 SecretRefs。仅当该引用丢失或无效时，凭证类型的 `key` 或 `token` 中的 SecretRef 才会移动到匹配的 `keyRef` 或 `tokenRef`。未提供替换的其他凭证类型和别名的字段保持不变。 Doctor 会删除转换后的字段名称，在提交之前验证源行，并且在第二次运行时不执行任何操作。运行时拒绝使用 `openclaw doctor --fix` 指令的可转换旧字段。格式错误的附加内容不会阻止加载其他有效的当前格式凭据。

JSON 导入保留其现有的当前格式投影：已识别的凭证类型和支持的字段输入 SQLite，保留字符串元数据，并且从活动导入中省略未知字段或格式错误的同级条目。原始 JSON 字节与现有迁移收据完全存档，因此那些省略的值仍然可以恢复。这与现有 SQLite 行的仅现场修复不同，后者保留了未知和格式错误的值。

安装的更新程序在激活之前调用候选 Doctor，因此在更新期间会运行相同的转换。混合的 JSON 和 SQLite 存储在合并其凭证集之前进行规范化，并在导入可以重命名配置文件之前根据当前 SQLite 所有者检查提供的别名映射。

## <a id="checks-0-2"></a> 检查 0-2

<AccordionGroup>
  <Accordion id="0-optional-update-git-installs" title="0. 可选更新（git安装）">
    如果这是一个 git checkout 并且 Doctor 正在交互运行，它会在运行检查之前提供更新。接受使用正常的 `openclaw update` 生命周期进行该签出，包括验证、恢复和网关重新启动。源更新使您保存的更新频道保持不变。外部管理的安装继续 Doctor，但不提供自我更新；通过其部署所有者更新它们。
  </Accordion>
  <Accordion id="1-config-normalization" title="1. 配置规范化">
    GitHub Copilot 现在需要显式提供程序配置、保存的 Copilot 身份验证配置文件或 `COPILOT_GITHUB_TOKEN`。通用 `GH_TOKEN` 和 `GITHUB_TOKEN` 不再激活它。当仅存在通用 GitHub 令牌时，Doctor 会报告此更改一次。在验证和保存配置之前，Doctor 会删除已停用的 `plugins.entries.github-copilot.config.discovery.enabled` 设置，包括格式错误的值。普通配置读取需要修复配置。

    Doctor 将遗留值形状标准化为当前模式。当前Talk语音配置为`talk.provider` + `talk.providers.<provider>`，实时语音配置为`talk.realtime.*`。 Doctor 将旧的 `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` / `talk.apiKey` 形状重写到提供者地图中。根据上述保留策略，顶级实时选择器将被淘汰。

    当 `plugins.allow` 非空且工具策略使用通配符或由插件拥有的工具条目时，Doctor 还会发出警告。`tools.allow: ["*"]` 只匹配实际加载的插件中的工具；它不会绕过专属插件 allowlist。

    具有非空 `allow` 和 `alsoAllow` 列表的工具策略范围无法验证。仅当继承额外内容的每个代理和提供商的有效配置文件授权保持不变时，`doctor --fix` 才会合并列表。它保留 `alsoAllow: []` 作为显式覆盖，因此继承的额外内容无法重新出现。如果附加功能可能扩展配置文件或授予网关配置读取访问权限，Doctor 会保持冲突范围不变，并报告确切的键和值以供手动检查。这适用于根 `tools` 策略、每个代理和每个提供商策略以及通道或网关工具策略。沙盒列表保持不变，因为 `allow` 和 `alsoAllow` 独立继承；冲突的沙箱列表仍然需要手动修复。插件拥有的 `plugins.entries.*.config` 留给拥有插件的医生合同。网关启动后，这些冲突保持不变，并将操作员引导至Doctor；未解决的冲突仍然需要操作员指导才能验证配置。

    `doctor --fix` 从 `agents.entries.<id>` 中删除了 `workspace: null`，因此可以应用正常的工作空间分辨率。它还从代理条目和 `agents.defaults` 中删除无效的 `heartbeat.activeHours` 窗口，保留其他心跳设置。如果需要，重新配置有效窗口；如果没有显式或继承的窗口，则心跳时间不受限制。这些修复在迁移旧版 `agents.list` 名册后也适用。

  </Accordion>
  <Accordion id="2-legacy-config-key-migrations" title="2. 旧版配置密钥迁移">
    当共享迁移转换产生完全有效的结果时，普通医生（包括 `doctor --non-interactive`）会自动标准化旧的单文件配置。这还涵盖了在没有 `--fix` 的情况下调用 Doctor 的旧版 npm 更新程序。规划器仍然需要完整的插件验证。 Doctor 将原始配置保留在配置备份环中，并保持状态迁移顺序完整。包括外部管理的配置、较新编写的配置和剩余的验证错误需要现有的显式修复或操作员恢复路径。明确推迟插件修复或宣传稍后可写配置切换的更新程序会推迟自动规范化。如果没有 `--fix`，则无法进行维修维护、服务更改或执行批准迁移。

    较旧的 Git 更新程序可以保留内存中的配置快照并在 Doctor 退出后写入它。当该父级标记更新正在进行中而没有广告支持 Doctor 配置写入时，Doctor 会保留配置，包括 `--fix`。支持的全新更新延续在插件收敛之前运行 Doctor 并重新读取修复的配置。没有该延续的旧版 Git 更新程序在更新后需要 `openclaw doctor --fix`；网关启动未完成其遗留修复。

    网关和本地 CLI 启动会验证当前配置，而无需重写旧密钥。无效的旧配置保持不变，启动时打印 `openclaw doctor --fix` 提示。交互式终端可以运行Doctor并重试一次；无头服务随着提示而停止。在写入经过验证的修复之前，Doctor 通过 `.bak.4` 备份环将原始文件保留在五槽 `openclaw.json.bak` / `.bak.1` 中。包括外部管理的配置、较新编写的配置和未解决的验证错误保留其现有的修复和恢复保护措施。

    普通配置恢复可以恢复已经有效的备份，而无需更改其编写的字节。需要遗留转换的备份必须通过 Doctor 进行恢复，Doctor 在验证和恢复之前应用相同的共享迁移转换。

    Doctor 在迁移写入之前检查编写的配置修订版、包含的文件和环境解析的值。运行时路径扩展（例如 Windows 上的 `~/.openclaw/wiki`）不算作输入更改。真实更改报告配置路径、文件内容、包含文件或解析值是否发生更改；重新运行 Doctor，以便迁移可以验证新输入。

    当模型迁移在 subscription/OAuth 和计量 API-key 计费之间更改配置的消费者时，Doctor 会在保存配置后报告消费者、模型以及新旧路由。该警告还会出现在诊断日志和更新运行记录中。当解析的计费路线未更改时，稍后的 Doctor 运行不会重复该操作。丢失的凭据不会被视为账单更改的证据。

    在更新期间，Doctor 会记录必须等到插件安装完成后的模型报废修复。更新后的 OpenClaw 在插件收敛后完成了这些修复，即使没有更改插件版本。 `openclaw update status` 记录其完成情况，以便退役的订阅模型不会落入计量的 API 凭证。

    实用程序模型分离在记录 `meta.migrations.utilityModelSeparation: true` 之前保留旧配置的隐式主配置。 Doctor 和普通配置写入使用以前的配置来显式保存该主配置；现有的主要选择、后备和凭证绑定保持权威。当旧的隐式主数据库还服务于实用任务时，这可以保持常规聊天的可用性。新的实用程序设置会在不选择主数据库的情况下记录分离，并且在实用程序设置期间添加的提供程序不会被误认为是以前的主数据库。参见[代理模型配置](/gateway/config-agents/models#agents.defaults.model)。

    其他遇到旧密钥的命令仍然要求您运行 `openclaw doctor`。 Doctor 解释了问题，显示了其迁移，并使用更新后的架构重写了 `~/.openclaw/openclaw.json`。 Cron 作业存储迁移也由 `openclaw doctor --fix` 处理；自动配置键迁移不会导入旧会话存储或修复服务。

    当可读的活动配置可以完全迁移时，Doctor 会在考虑最后一次已知的良好恢复之前保留它。这包括所有者为 `default: true` 的旧版多代理名册：不相关的设置和原始代理所有权在迁移后仍然存在。

    每个智能体迁移适用于带密钥的 `agents.entries` 和旧版 `agents.list` 名册，包括已设置 `agents.ownership: "explicit"` 的名册。例如，Doctor 将代理的旧 `memorySearch` 设置保留在 `memory.search` 下。当前配置路径中的现有值优先。

    对于具有多个代理且没有可解析的环境所有者的旧名册，Doctor 从唯一标记的 `default: true` 代理或 `main`（如果存在）中播种 `agents.defaults.systemAgent.agentId`。独家代理名册无需业主维修。 Doctor 在运行时准入之前将有效的旧默认标记转换为显式的每表面所有者。显式的车队所有权会禁用旧的默认标记回退，因此这些名册可能仍然需要修复。仅当心跳登记无法解决时，医生才会固定 `agents.defaults.heartbeat.agentId`；现有的检测信号所有者、共享默认值和每个代理注册均会保留。这些更改由 `doctor --fix` 报告并保存，包括更新时的医生通行证。如果无法识别默认值，请显式配置系统代理所有者。

    <Note>
      迁移保留遵循 [ 保留策略 ](/gateway/doctor/config-migrations#retention-policy) 中的 2026 年 7 月截止日期，基于该截止日期，受支持的版本仍然可以写入格式。对于已停用的格式，请在重试之前按照 Doctor 的中间升级说明进行操作。
    </Note>

    有效迁移：

    | 旧键                                                                                    | 当前键                                                                 |
    | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
    | `tools.toolSearch.mode: "code"` | `tools.toolSearch.mode: "tools"`（结构化工具搜索） |
    | `tools.toolSearch.codeTimeoutMs` | 已删除（保留工具搜索激活） |
    | `tools.codeMode.runtime: "quickjs-wasi"`（全局和每个代理）                                | `tools.codeMode.executor: "quickjs"`（现有执行者选择获胜） |
    | `tools.codeMode.languages`, `agents.entries.*.tools.codeMode.languages`                         | 已删除（代码模式执行 JavaScript；保留激活和限制） |
    | 旧版 `talk.voiceId`/`talk.voiceAliases`/`talk.modelId`/`talk.outputFormat`/`talk.apiKey`        | `talk.provider` + `talk.providers.<provider>`                               |
    | `messages.tts`                                                                                  | 顶层 `tts`                                                              |
    | `messages.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`)                             | `tts.providers.<provider>`                                                   |
    | `messages.tts.provider: "edge"` / `messages.tts.providers.edge`                                  | `tts.provider: "microsoft"` / `tts.providers.microsoft`                    |
    | `tools.exec.security` + `tools.exec.ask`                                                         | `tools.exec.mode`                                                            |
    | `session.idleMinutes`                                                                            | `session.reset.idleMinutes`                                                  |
    | `messages.responsePrefix` 具有显式通道块                                           | 复制到配置好的channel/account `responsePrefix`；为 implicit/custom 通道保留全局回退 |
    | `web.enabled`                                                                                    | `channels.whatsapp.enabled`                                                  |
    | `meta.lastTouchedAt`、hook 安装、cron 存储、捆绑发现、全局 TTS 偏好路径            | 共享 SQLite 状态                                                       |
    | TTS speaker 字段 `voice`/`voiceName`/`voiceId`                                                 | `speakerVoice`/`speakerVoiceId`                                              |
    | `channels.<id>.tts.<provider>` / `channels.<id>.accounts.<accountId>.tts.<provider>`（除 Discord 外的所有频道）                                          | `...tts.providers.<provider>`                                                |
    | `channels.<id>.voice.tts.<provider>` / `channels.<id>.accounts.<accountId>.voice.tts.<provider>`（除 Discord 之外的所有通道）                          | `...voice.tts.providers.<provider>`                                          |
    | `plugins.entries.voice-call.config.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`)     | `plugins.entries.voice-call.config.tts.providers.<provider>`                |
    | `plugins.entries.voice-call.config.tts.provider: "edge"` / `...tts.providers.edge`                | `provider: "microsoft"` / `...tts.providers.microsoft`                      |
    | `plugins.entries.voice-call.config.provider: "log"`                                              | `"mock"`                                                                      |
    | `plugins.entries.voice-call.config.twilio.from`                                                  | `plugins.entries.voice-call.config.fromNumber`                              |
    | `plugins.entries.voice-call.config.streaming.sttProvider`                                        | `plugins.entries.voice-call.config.streaming.provider`                      |
    | `plugins.entries.voice-call.config.streaming.openaiApiKey`/`sttModel`/`silenceDurationMs`/`vadThreshold` | `plugins.entries.voice-call.config.streaming.providers.openai.*`             |
    | `models.providers.*.api: "openai"`                                                               | `"openai-completions"`（网关启动还会跳过 `api` 是 future/unknown 枚举值的提供商，而不是拒绝启动） |
    | `mcp.servers.*.type`、`nodeHost.mcp.servers.*.type`（CLI-native 别名）                           | 对应`transport`字段                                            |
    | `mcp.servers.*.disabled`                                                                         | `mcp.servers.*.enabled` 的反值                                              |
    | MCP 超时别名 `connectTimeout`/`connect_timeout`/`timeout`                                 | `connectionTimeoutMs`/`requestTimeoutMs`                                    |
    | MCP snake-case 服务器字段                                                                     | camelCase MCP 服务器字段                                                   |
    | `tools.media.image/audio/video.models`                                                           | 带 capability 标签的 `tools.media.models`                                        |
    | `tools.media.asyncCompletion`                                                                    | 已移除                                                                       |
    | `tools.message.allowCrossContextSend`                                                            | `tools.message.crossContext`                                                  |
    | media model `deepgram` 选项                                                                   | `providerOptions.deepgram`                                                    |
    | `talk.realtime.voice`、Discord 实时 `voice`                                                 | `speakerVoice`                                                                |
    | `agents.defaults.pdfMaxBytesMb`                                                                  | `agents.defaults.pdfMaxMb`                                                    |
    | `tools.exec.timeoutSec`                                                                          | `tools.exec.timeoutSeconds`                                                   |
    | `browser.ssrfPolicy.hostnameAllowlist`                                                           | 支持通配符的 `browser.ssrfPolicy.allowedHostnames`                          |
    | 沙盒浏览器 `enableNoVnc`                                                                    | `noVncEnabled`                                                                |
    | 根级 `media`                                                                                     | `attachments`                                                                |
    | channel/account `heartbeat` 可见性块                                                   | `heartbeatVisibility`                                                         |
    | `channels.slack.identity`                                                                        | `channels.slack.postAs`                                                       |
    | 根级 `audit`                                                                                     | `logging.audit`                                                               |
    | `gateway.nodes.skills.enabled`                                                                   | `gateway.nodes.allowSkills`                                                   |
    | `gateway.nodes.allowCommands`/`denyCommands`                                                    | `gateway.nodes.commands.allow`/`deny`                                         |
    | 生成模型默认值                                                                       | `agents.defaults.mediaModels.{image,video,music}`                              |
    | 已退役的最终布局调优项                                                               | 内置默认行为                                                     |
    | `channels.whatsapp.messagePrefix` 和旧版 `messages.messagePrefix`                            | `channels.whatsapp.responsePrefix`                                            |
    | `channels.whatsapp.ackReaction`                                                                  | 全局 `messages.ackReaction` 和可转换时的 `ackReactionScope`        |
    | `cron.failureDestination`                                                                        | `cron.failureAlert` 上的目标字段                                     |
    | `gateway.controlUi.chatMessageMaxWidth`、仅用于展示的 `ui.prefs` 键                       | 已移除（文本缩放、聊天宽度和实时侧边栏活动均为浏览器本地设置） |
    | `agents.list`                                                                                    | 使用键标识的 `agents.entries`                                                        |
    | 顶层 `defaultModel`                                                                         | `agents.defaults.model`                                                      |
    | `session.maintenance.pruneDays`, `session.resetByType.dm`                                        | `session.maintenance.pruneAfter`, `session.resetByType.direct`               |
    | 顶层 `tui`                                                                                  | 已移除（TUI 页脚使用紧凑默认值）                            |
    | `plugins.entries.codex.config.codexDynamicToolsProfile`                                          | 已删除（Codex 应用程序服务器始终保持 Codex-native 工作区工具本机） |
    | `commands.modelsWrite`                                                                           | 已移除（`/models add` 已弃用）                                       |
    | `agents.defaults.silentReply.internal`, `surfaces.*.silentReply.internal`          | 已删除（只有外部频道组可以选择静默回复）          |
    | 顶层 `memorySearch`、`agents.defaults.memorySearch`                                         | `memory.search`                                                             |
    | `agents.entries.*.memorySearch`                                                                     | `agents.entries.*.memory.search`                                               |
    | `memorySearch.provider: "auto"`                                                                  | `"openai"`                                                                    |
    | `plugins.openai-codex` 策略 ID                                                                | `plugins.openai`                                                             |
    | `tools.web.x_search.apiKey`                                                                      | `plugins.entries.xai.config.webSearch.apiKey`                               |
    | `session.maintenance.rotateBytes`                                 | 已移除（已弃用）                                                        |
    | 2026.7 退役的运行时和频道调优项                                               | 已移除（应用内置生产默认值）                               |
    | `diagnostics.memoryPressureSnapshot`，旧版 `diagnostics.memoryPressureBundle`                  | 已删除（自动关键内存快照已停用；没有替代自动捕获） |
    | `skills.workshop.autonomous.mode: "propose"`, `skills.workshop.approvalPolicy`, `skills.workshop.maxPending` | `"off"`；提案设置已删除（技能工坊提案已停用） |

    Doctor 在两个服务器映射中将 MCP `type: "http"` 迁移到 `transport: "streamable-http"`，并将 `type: "sse"` 迁移到 `transport: "sse"`。现有的 `transport` 获胜。对于基于命令的服务器，Doctor 删除了 `type: "stdio"`；该命令仍然选择 stdio。更新时 Doctor pass 使用相同的备份配置修复。插件捆绑包文件保留其外部 `type` 格式：捆绑包加载会转换已识别的类型，而 CLI 导出则使用目标所需的格式。未知捆绑包 HTTP 传输被拒绝，而不是被视为 SSE；其原始 `type` 仍可用于目标 CLI。

    代码模式的运行时迁移在全局配置、键控代理条目和旧代理名册中保留了显式 QuickJS 选择。现有的 `executor` 值获胜，激活和限制保持不变。即使通用插件被禁用或列入白名单，选择捆绑的 QuickJS 运行时也能正常工作，而无需启用其他插件； `code-mode-quickjs` 的显式拒绝或禁用条目仍会阻止它。从未选择运行时的配置使用新的 `node` 默认值。在启用 Node 执行之前，请参阅 [Code Mode executors](/tools/code-mode/executors)； `node:vm` 不是安全边界。

    Doctor 从代理默认值和表面覆盖中删除已停用的 `silentReply.internal` 设置，同时保留 `silentReply.group`。此修复贯穿正常的配置备份和验证流程，包括更新时 Doctor。内部会话，包括子代理和私人完成，需要一个结果。外部直接聊天和群聊可以以明确的 `NO_REPLY` 结束；见[无声回复](/concepts/messages#silent-replies)。

    Doctor 在一份通知中命名了它实际删除的已退役调整路径，包括显式 `false` 值： `Removed retired runtime tuning knobs: diagnostics.memoryPressureSnapshot; built-in defaults now apply.` 在开始使用这些已退役密钥之前运行 `openclaw doctor --fix`。内存压力事件仍然可用；使用 [ 诊断导出或手动分配分析 ](/gateway/diagnostics) 获取当前证据。

    <Note>
      语音呼叫插件提供其旧配置键的迁移。 `openclaw doctor --fix` 调用它并将当前形状保留在 `openclaw.json` 中；运行时配置解析仅接受当前密钥。现有的当前格式设置胜过旧值，包括流媒体提供商凭据、模型和时间。医生报告保留了目标，而不是声称那些遗留值已被移动。
    </Note>

    每个代理 `memorySearch` 迁移可与旧的 `agents.list` 名册和密钥 `agents.entries` 一起使用。合并旧值时，Doctor 会保留显式的 `memory.search` 设置，包括移动到新路径的环境引用。当修复仅影响每个代理设置时，单文件代理将保留在其包含的文件中。

    当模型策略迁移伴随同一包含文件中的代理修复时，Doctor 会在该文件中保留显式策略和修复的设置。仅策略修复可以针对更深层次的默认设置，而无需重写其父文件。现有的包括所有权、备份和冲突检查仍然适用。

    已停用的 `tools.message.allowCrossContextSend` 标志会在根范围和每个代理范围内迁移。 Doctor 保留有效的跨上下文权限，包括代理的 `false` 覆盖根 `true` 标志。

    多账号频道的账号默认值指导：

    - 如果配置了两个或更多 `channels.<channel>.accounts` 条目，但没有 `channels.<channel>.defaultAccount` 或 `accounts.default`，doctor 会警告回退路由可能选择到意外的账号。
    - 如果`channels.<channel>.defaultAccount`设置为未知帐户ID，doctor会发出警告并列出配置的帐户ID。

    在多代理配置中，`doctor --fix` 保留原始旧名册中的历史帐户所有者。现有路线保持不变。没有历史所有权证据的账户需要明确的绑定； Doctor从不提倡采用更狭窄的对话途径来实现帐户范围的所有权。

  </Accordion>
</AccordionGroup>
