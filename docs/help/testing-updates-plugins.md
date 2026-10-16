---
summary: "OpenClaw 如何验证更新路径、包迁移和插件 install/update 行为"
read_when:
  - "更改 OpenClaw 的更新、doctor、包接纳或插件安装行为时"
  - "准备或批准发布候选版本时"
  - "调试包更新、插件依赖清理或插件安装回归时"
title: "测试：更新和插件"
sidebarTitle: "更新和插件测试"
---

更新和插件验证检查清单：证明可安装包能够更新真实用户状态，通过 `doctor` 修复过期的旧状态，并且仍然能够从所有受支持的来源安装、加载、更新和卸载插件。

更全面的测试运行器地图请参见 [测试](/help/testing)。关于实时 provider key 和会触发网络的套件，请参见 [实时测试](/help/testing-live)。

## <a id="on-this-page"></a> 在此页

- [我们保护什么](#what-we-protect) - 保证这些车道存在以进行防御。
- [ 开发期间的本地证明](#local-proof-during-development) - 迭代时运行的命令。
- [无头节点自动更新证明](#headless-node-auto-update-proof) - 安装节点激活和共享网关保障。
- [Docker Lanes](#docker-lanes) - 通道参考：每个通道运行什么以及何时运行。
- [Package Acceptance](#package-acceptance) - 通道参考：接受矩阵及其门。
- [发布默认值](#release-default) - 候选版本必须清除的通道。
- [旧版兼容性](#legacy-compatibility) - 仍涵盖较旧的软件包和插件状态。
- [添加覆盖范围](#adding-coverage) - 新回归所属的位置。
- [故障分类](#failure-triage) - 当车道变红时该怎么办。

## <a id="what-we-protect"></a> 我们保护的内容

- 一个 package tarball 是完整的，具有有效的 `dist/postinstall-inventory.json`，并且不依赖于已解包的 repo 文件。
- 用户可以从较旧的已发布 package 迁移到候选 package，而不会丢失 config、agents、sessions、workspaces、plugin allowlists 或 channel config。
- `openclaw doctor --fix --non-interactive` 拥有遗留迁移和修复，包括真正悬空的插件运行时别名。软件包 postinstall 拥有软件包本地依赖碎片；两者都保留其他安装或配置文件可以使用的有效共享运行时根。启动不应为过时的插件状态增加隐藏的兼容性迁移。
- Plugin 安装可从本地目录、git repos、npm packages 和 ClawHub registry path 正常工作。
- Plugin 的 npm dependencies 在每个 plugin 的一个受管理 npm project 中安装，在信任之前会先进行扫描，并且在 plugin 卸载时通过 `npm uninstall` 移除，因此 hoisted dependencies 不会残留。
- 当没有任何变化时，Plugin update 是无操作：install records、resolved source、installed dependency layout 和 enabled state 都保持不变。

## <a id="local-proof-during-development"></a> 开发期间的本地验证

先从较小范围开始：

```bash
pnpm changed:lanes --json
pnpm check:changed
pnpm test:changed
```

对于插件安装、卸载、依赖项或包清单更改，还可以运行涵盖已编辑界面的重点测试：

```bash
pnpm test src/plugins/uninstall.test.ts src/infra/package-dist-inventory.test.ts test/scripts/package-acceptance-workflow.test.ts
```

在任何包 Docker lane 消费 tarball 之前，先验证包产物：

```bash
pnpm release:check
```

`release:check` 运行生成的 config/docs 和插件检查（配置架构、配置文档基线、插件 SDK 导出和表面预算、插件 versions/inventory），写入软件包 dist 库存，运行 `npm pack --dry-run`，拒绝禁止的打包文件，将 tarball 安装到临时前缀中，运行 postinstall，并抽出捆绑通道入口点。

对于插件 SDK 更改，请分别比较确切的提交：

```bash
base_sha=$(git merge-base origin/main HEAD)
head_sha=$(git rev-parse HEAD)
pnpm plugin-sdk:api:diff -- --base "$base_sha" --head "$head_sha"
```

版本 npm 预检使用与之前发布的 dist 标签相同的可读差异，并打印该版本更改插件 SDK API 时所需的 8 字符确认摘要。

## <a id="headless-node-auto-update-proof"></a> 无头节点自动更新证明

`pnpm test:e2e:node-auto-update <built-openclaw.tgz> [new-artifact-directory]` 在 Linux 上运行真实的安装包场景。在具有 Node、npm 和注册表访问权限的任务拥有的 Testbox 或 Crabbox 中运行它。它不需要提供商凭据并且可以选择加入；默认的 `pnpm test:e2e` 聚合不运行它。

在测试主机上构建并打包候选程序，然后传递确切的 tarball：

```bash
pnpm build
node scripts/package-openclaw-for-docker.mjs --skip-build \
  --output-dir /tmp/openclaw-node-update-package \
  --output-name openclaw-node-update.tgz
pnpm test:e2e:node-auto-update \
  /tmp/openclaw-node-update-package/openclaw-node-update.tgz \
  /tmp/openclaw-node-update-proof
```

该证明启动了隔离网关、配对节点、监控器和装置注册进程。它验证繁忙工作延迟、空闲激活、保留的配对和启动选项、激活冷却时间、所有三个公共选择退出以及候选者格式错误时工作节点的保留。相同状态的 Gateway/node 案例证实，当节点激活其私有运行时时，网关进程、配置和全局安装保持不变。一个单独的单元针对候选者运行已发布的 `openclaw@2026.9.4` 更新程序。

当子进程继续运行时，遗留插件案例从其命令返回，然后证明缺少空闲工作回调会在该工作期间和子进程完成后阻止激活。没有插件限制或节点命令白名单的默认插件节点必须在空闲时激活准备好的更新。

每次运行都在源签出之外使用新的工件目录，或者忽略它以创建新的临时目录。该场景保留 `observations.json` 和每个进程的日志，并在完成或失败时停止其子进程。在停止远程租赁之前收集证据。此场景证明了 Linux 行为；它不建立 Windows 或 macOS 激活覆盖范围。请参阅 [Node auto-updates](/cli/node#automatic-updates) 了解运营商合约。

## <a id="docker-lanes"></a> Docker 车道

Docker 通道是产品级证明。他们在 Linux 容器内安装或更新真实的包，并通过 CLI 命令、网关启动、HTTP 检查、RPC 状态和文件系统状态断言行为。

迭代时使用聚焦 lanes：

```bash
pnpm test:docker:plugins
pnpm test:docker:plugin-lifecycle-matrix
pnpm test:docker:plugin-update
pnpm test:docker:upgrade-survivor
pnpm test:docker:published-upgrade-survivor
pnpm test:docker:update-restart-auth
pnpm test:docker:update-migration
```

重要 lanes：

- `test:docker:plugins` 涵盖插件安装烟雾、本地文件夹安装、本地文件夹更新跳过行为、具有预安装依赖项的本地文件夹、`file:` 软件包安装、使用 CLI 执行进行 git 安装、git moving-ref 更新、使用提升的传递依赖项进行 npm 注册表安装、 npm 更新无操作、格式错误的 npm 包元数据拒绝、本地 ClawHub 固定装置安装和更新无操作、市场更新行为和 Claude-bundle enable/inspect. 设置 `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` 以保留 ClawHub 块hermetic/offline.
- `test:docker:plugin-lifecycle-matrix` 在一个裸容器中安装候选包，运行一个 npm 插件，依次经过安装、检查、禁用、启用、 显式升级、显式降级，以及在删除插件代码后的卸载。它会按阶段记录 RSS 和 CPU 指标。
- `test:docker:plugin-update` 验证一个未更改的已安装插件在执行 `openclaw plugins update` 期间不会重新安装或丢失安装元数据。
- `test:docker:upgrade-survivor` 在一个脏的 old-user fixture 上安装候选 tarball，运行包更新加非交互式 doctor，然后启动 loopback Gateway 并检查状态保留。
- `test:docker:published-upgrade-survivor` 首先安装最新的稳定版本，通过烘焙的 `openclaw config set` 配方对其进行配置，将其更新为候选 tarball，运行 doctor，检查遗留清理，启动网关，并检查 `/healthz`、`/readyz` 和 RPC 状态。基线配方通过环境引用的 API 键配置 Anthropic、Google、Gemini 和 OpenAI，使 OpenAI 保持为代理的主要模型。
- `test:docker:update-restart-auth` 安装候选包，启动托管令牌身份验证网关，取消 `openclaw update --yes --json` 的调用者网关身份验证环境，并要求候选更新命令在正常检查之前重新启动网关。
- `test:docker:update-migration` 是大量清理的已发布更新通道。它默认安装最新的稳定版本，从配置的 Discord/Telegram-style 用户状态开始，种子包本地插件依赖项碎片和共享运行时标记，并更新到候选 tarball。包安装后必须删除包本地碎片，同时更新和 Doctor 保留共享运行时根。

将 `OPENCLAW_UPGRADE_SURVIVOR_LIVE_MODELS` 设置为以空格分隔的模型引用列表，以便在更新后为每个模型运行一个 `openclaw agent --local` 标记。 Anthropic使用`ANTHROPIC_API_KEY`，Google使用`GEMINI_API_KEY`，OpenAI使用`OPENAI_API_KEY`；缺少选定的键会导致通道失败。 Docker 仅转发选定的提供商密钥。每个回合都有自己的会话和 `live-<provider>.json` / `.err` 工件（同一提供商的其他模型使用 `-2`、`-3` 等）。 `summary.json` 用 `model`、`ok` 和 `latencyMs` 记录 `liveModels.models` 条目。

旧版 `OPENCLAW_UPGRADE_SURVIVOR_LIVE_OPENAI=1` 表单在提供时仍选择 `openai/gpt-5.5` 或 `OPENCLAW_UPGRADE_SURVIVOR_LIVE_OPENAI_MODEL`。显式模型列表优先于该标志；摘要记录 `liveModels.source` 和 `overridesLiveOpenai`。现有的 `OPENCLAW_UPGRADE_SURVIVOR_LIVE_OPENAI_TIMEOUT_SECONDS` 预算（默认 180 秒）单独适用于每一回合。实时轮流使用配方的配置思维默认值，因此每个模型都可以应用其支持的推理级别。禁止实时提供者的场景保留该限制。

冻结的扩展稳定候选目标使用其历史运行程序，并在 Docker 启动之前拒绝两个实时选择变量，退出代码为 2。

```bash
# Export the three provider keys before invoking the lane.
OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC=openclaw@2026.9.5 \
OPENCLAW_UPGRADE_SURVIVOR_LIVE_MODELS="openai/gpt-5.5 anthropic/claude-opus-5 google/gemini-3.1-pro-preview" \
pnpm test:docker:published-upgrade-survivor
```

`base` 和 `sqlite-volume` 的源固定 tarball 运行验证更新前的候选提交，并在候选检查之前将已安装的应用程序负载与冻结的 tarball 进行比较。这可以区分具有相同版本字符串的不同版本。 npm 仍然拥有依赖具体化；手动 tarball 在没有选定源的情况下运行 SHA 保留其现有合同。这些通用场景不需要工作单元基线身份工件。更新后，在运行任何候选检查之前，丢失或无法读取的 tarball 以及已安装的有效负载会因相应的候选身份诊断而失败。

有用的 published-upgrade survivor 变体：

```bash
OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC=openclaw@2026.6.1 \
OPENCLAW_UPGRADE_SURVIVOR_SCENARIO=versioned-runtime-deps \
pnpm test:docker:published-upgrade-survivor

OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC=openclaw@latest \
OPENCLAW_UPGRADE_SURVIVOR_SCENARIO=bootstrap-persona \
pnpm test:docker:published-upgrade-survivor

OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC=openclaw@2026.7.1-2 \
OPENCLAW_UPGRADE_SURVIVOR_SCENARIO=sqlite-volume \
pnpm test:docker:published-upgrade-survivor

OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC=openclaw@2026.8.33 \
OPENCLAW_UPGRADE_SURVIVOR_SCENARIO=legacy-operator-state \
pnpm test:docker:published-upgrade-survivor

OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS=openclaw@2026.9.4 \
OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=custom-plugin-siblings \
pnpm test:docker:published-upgrade-survivor
```

可用场景：`base`、`acpx-openclaw-tools-bridge`、`feishu-channel`、`bootstrap-persona`、`channel-post-core-restore`、`plugin-deps-cleanup`、`configured-plugin-installs`、`custom-plugin-siblings`、`stale-source-plugin-shadow`、 `tilde-log-path`、`meeting-transcripts-sqlite`、`versioned-runtime-deps`、`cron-scheduled-authority`、`legacy-operator-state` 和 `sqlite-volume`。在总体运行中，`OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=reported-issues` 扩展了释放浸泡装置，但排除了昂贵的 `sqlite-volume` 方案。使用 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=far-reaching` 将其包含在内。

选择加入 `backup-schedule` 场景使用已发布的 `openclaw@2026.9.7` CLI 来初始化 Git 备份存储库，启用其网关拥有的 24 小时计划，并记录一份 Git 备份和一份存档备份。已发布的更新程序会安装源固定的候选 tarball。非交互式 Doctor 和 Gateway 启动后，该场景会检查原始计划声明和 argv、`backup.status` 的旧账本行、状态备份行、Doctor 错误和 HTTP 准备情况。它还要求 `storage.locations` 保持缺席并且 Cloudflare 插件保持不活动状态。此 manual/release 场景已从聚合别名和每个 PR CI 中排除。

```bash
OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS=openclaw@2026.9.7 \
OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=backup-schedule \
pnpm test:docker:published-upgrade-survivor
```

`custom-plugin-siblings` 场景从发布的 2026.9.4 或更高版本开始，并启用自定义内存插件，从其运行时条目和 Doctor 配置修复合约导入 `../shared/value.mjs`。它针对选定的候选 tarball 运行已发​​布的更新程序，并要求合约和网关插件注册都以私有金丝雀状态的预期同级值执行。仅做好准备是不够的。它还检查更新前后的实际插件加载、保留的启用以及未更改的原始源文件。当前源完整发布验证在其正常的包验收范围和发布浸泡中包含此场景。这些默认版本运行将此场景固定到已发布的 2026.9.4 驱动程序，包括当源候选者仍然报告版本 2026.9.4 时；其他场景保留其现有的基线选择。

选择加入 `projects-doctor` 和 `projects-startup-migration` 场景需要准确发布的 `openclaw@2026.9.4` 基线和冻结的候选 tarball。他们使用隔离状态、手动重启，并且没有实时提供程序或注册表配套装置；没有一个通过 `reported-issues` 或 `far-reaching` 运行。他们验证原始发布的驱动程序和安装的候选有效负载字节，包括它们的版本字符串是否相等。选择 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIO` 之一并设置 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC=openclaw@2026.9.4`。

`projects-doctor`保留1个已注册的项目和1个配置的工作区，然后运行真正的`doctor --lint --only core/doctor/project-clone-shape --json`两次。它检查存储的行、架构、标记和只读快照清理。 `projects-startup-migration` 通过发布者使用本地 Git 准备了两个独立的 project/worktree 样本。每个都有一个经过验证的备份和通过已发布的 Doctor 导入的合成遗留会话 JSON/JSONL。更新必须通过候选医生修复第一个样本的存储工作区。第二个状态不在该更新的发现范围内。在启动之前，候选人的 Doctor 模式所有者在其维护锁定下运行以升级该数据库，同时保留旧工作区字段和确切的 session/transcript 字节。它的第一次正常网关启动必须保留该状态。干净关闭后，显式 `doctor --fix --non-interactive` 修复其存储的工作空间；第二次启动必须保持修复状态不变。这些是受支持的旧格式导入，而不是历史运行时生成的会话。两个网关运行必须准备就绪并在持续读回之前报告完全关闭。将 `OPENCLAW_UPGRADE_SURVIVOR_STARTUP_BINDINGS` 设置为已审核的 JSON 文件，其中包含已编译基本名称、精确导出符号和 SHA-256 的候选 `commit`、`agentSchema` 和 `operations.prepare`/`operations.open` 三元组。快照准备器和 SQLite 开启器必须与安装的候选负载匹配；该文件以只读方式安装。此场景不使用远程存储库或模型转换。选择加入 `channel-owner-policy` 方案使用相同的固定 `openclaw@2026.9.4` 已发布驱动程序和候选包检查。它将现有的 `operator.channelPolicy` JSON 样本植入已发布数据库的机器状态表中，然后运行已安装的更新程序。它需要状态模式 19 内容、保留的 role/identity 策略和配置的所有者，以及跨两个候选网关启动的稳定的配置所有者引用。该标本是合成的现有状态，并非声称已发布的基线铸造回收参考。该单元采用隔离状态并手动重启；它不能证明更新程序拥有的服务重新启动或较旧的读取器降级行为。

`legacy-operator-state` 场景使用已发布基线自己的 CLI 创建第二个代理、白名单执行批准和两个命令 cron 作业：一个没有显式代理，另一个由 `ops` 拥有。它使 `systemAgent` 保持未设置状态，通过本地注册表安装一个版本匹配的 npm 插件，并保留工作区技能。它还可以在没有安装记录的情况下配置 DuckDuckGo：捆绑基线使用自己的 CLI Web 搜索设置；较新的基线接收已损坏的升级的保留配置。本地注册表提供候选人的官方外部 DuckDuckGo 包。在独立 Doctor 或同意修复之前，断言需要 npm 安装记录、候选包版本和完整性、`plugins list` 条目以及干净的 `config validate --json`。单独的隔离缺失插件状态会在没有更新或功能接受的情况下执行 `doctor --fix --non-interactive`。模拟 OpenAI 服务器在更新前后验证真实代理轮流，无需提供者凭据。更新后，通道会检查批准和旧文件停用、有效的 cron 所有者、候选插件工件、候选状态架构、不进行进一步更改的重复更新以及网关运行状况。在独立 Doctor 可以隐藏不完整的更新迁移之前运行断言。

已发布的配套软件包版本在整个灯具中保留相同的存档字节。如果源候选者仍然使用已发布的配套版本，则注册表和安装断言将保留该已发布的存档。新的配套版本使用准备好的候选工件。 npm 完整性防护在这两种情况下均保持启用状态；该装置永远不会替换已发布版本的字节来进行更新传递。

无所有者 cron 作业是在添加第二个代理之前创建的，因为较新的基线拒绝不明确的新作业。批准快照在比较之前通过基线 CLI 写回：JSON-era 读取可以分配 ID，而无需保留它们。最终的种子状态仍然有两个代理、两个工作，并且没有明确的 `systemAgent`。

PR/main 门使用 `OPENCLAW_UPGRADE_SURVIVOR_UPDATE_RESTART_MODE=auto-auth`。对于这种情况，基线更新程序必须替换其正在运行的托管网关；该harness检查进程替换和配置的身份验证。在第一次更新后，在任何同意修复可以隐藏不完整的迁移之前，立即询问 Cron 所有者。默认本地 `manual` 模式会通过 `--no-restart` 并启动候选程序进行检查，因此它不能证明更新程序拥有的重新启动。两种模式都需要干净的 `doctor --lint --json` 报告。

架构快照在 `schema-before.json` 和 `schema-after.json` 中记录已发布的 `userVersion` 和应用的 `contentVersion`。该通道将应用的内容与候选包的架构常量进行比较。自 #141109 起，共享状态发布可能会延迟已完成的迁移，延迟时间为旧版更新程序的五分钟终端宽限期；要求立即公布数字将拒绝健康升级。代理架构仍然使用其已发布的版本。观察者以只读方式打开数据库，并且从不触发迁移或发布。请参阅 [ 架构颠簸和较旧的更新程序](/reference/database-schemas#schema-bumps-and-older-updaters)。

之前的快照还记录基线的已配置代理名册和代理范围的遗留样本，包括会话行、脚本和轨迹文件、轨迹指针和技能提示 blob。模型目录和不相关的每个代理工件超出了该观察者的会话迁移范围。在候选者检查或代理轮换之前，具有现有 SQLite 或旧会话历史记录的每个代理必须在候选代理模式中拥有一个存储。观察者验证导入的会话身份和转录事件、完成的存档收据和保留的源字节以及未更改的提示 blob。没有遗留历史记录的未使用代理仍可能会延迟创建其存储。这些检查遵循[Doctor会话SQLite迁移合约](/cli/doctor#session-sqlite-migration)；观察者从不导入文件或打开可写数据库。

每个受支持的基线（包括 `2026.9.2`）都必须完成更新并将其数据库迁移到候选架构。输入的 `update-schema-bump-unfenced` 拒绝、回滚、未迁移的数据库或不可用的网关都会导致通道失败。仅在自动迁移断言通过后，所需的插件功能同意才能使用现有的显式恢复步骤；它绝不允许失败的模式修复。

其他场景保留其现有的成功断言。他们故意注入的遗留文件可以阻止基线在更新之前启动；更新者必须在候选者检查之前迁移这些装置。该泳道不会预先修复或跳过那些较旧的迁移标本。

`auth-profile-v2026-7-2-beta-5` 在这些聚合别名之外可以显式选择。它导入历史 JSON 凭证装置，验证当前共享存储中的凭证和身份验证顺序，并检查存档的源字节。它不会测试在已发布的 SQLite 存储中创建的凭据的保留。

默认情况下，`sqlite-volume` 场景将已配置的 Matrix、Discord 和 Telegram plugin/channel 状态与 4,800 个会话、23,890 个转录事件和 2,200 个 cron 爬网作业相结合。对于公开插件状态 SDK 的基线，它使用已安装的 SDK 创建已发布的共享数据库并跨两个命名空间写入 512 条永久记录，然后检查每个存储的值和时间戳是否存在。没有 API 的旧基线明确报告此部分不适用。它还播种帐户范围的配对请求和允许列表，以及工作区身份、指令和内存文件。它会在更新后立即验证准确的 JSONL- 到 SQLite 和 cron 迁移、旧存档、数据库完整性、帐户隔离和工作区内容，然后再进行任何独立的 Doctor 修复来隐藏不完整的迁移。然后，它通过网关 RPC 读取采样的对话，重新运行 Doctor 以检查它是否没有进行进一步的更改，并在网关重新启动后重复历史记录和保存检查。

这是 Docker 内的软件包更新测试。它不能证明容器镜像替换或后台更新活动；有关这些单独的入口点，请参阅 [Updating](/install/updating)。所需的插件功能同意仍然是一个明确的恢复步骤，并记录在幸存者摘要中。

`2026.9.2` 到 `2026.9.3` 幸存者过渡会练习已安装的更新程序。共享状态迁移内容可以是最新的，而已发布的架构版本保持在 15，直到旧更新程序清除其发布宽限期。模式证明记录了值并需要当前内容；它不会等待或强制发布。请参阅 [older 更新程序架构处理](/reference/database-schemas#schema-bumps-and-older-updaters)。

`test:docker:release-upgrade-user-journey` 分别涵盖了显式的外部包管理器和新的 Doctor 程序，以及所有者停止的网关、经过验证的备份以及通过网关历史记录保留的基线和新对话。其收据记录了`selfUpdatePassed: false`和`not-run`自我更新状态；外部安装并不是内部更新程序结果的证据。代理模式和不受支持的共享状态迁移拒绝仍然包含在 Doctor 所有者测试中。

使用 `OPENCLAW_UPGRADE_SURVIVOR_VOLUME_SESSIONS`、`OPENCLAW_UPGRADE_SURVIVOR_VOLUME_EVENTS_PER_SESSION` 和 `OPENCLAW_UPGRADE_SURVIVOR_VOLUME_CRON_JOBS` 缩放夹具。在重复 Doctor pass 之前，该工具会计算持久会话、转录事件、cron 作业和不同的启用插件根。它的预算是 60 秒的固定开销加上每个会话 80 毫秒、每个事件 2 毫秒、每个 cron 作业 20 毫秒以及每个插件根 20 秒，四舍五入到整秒。 60层覆盖小州；每单位津贴在测量的 473 秒 AWS 运行中提供了缓慢的硬件余量，同时仍然拒绝该装置的两倍减速。定时医生运行永远不会决定自己的预算。计数和 computed/effective 限制出现在场景输出和 `volume-doctor-budget.json` 中；摘要还记录了 `timings.idempotenceBudgetSeconds`。现有的 `OPENCLAW_UPGRADE_SURVIVOR_VOLUME_IDEMPOTENCE_BUDGET_SECONDS` 覆盖仍然可用于显式主机校准。独立`OPENCLAW_UPGRADE_SURVIVOR_COMMAND_TIMEOUT`看门狗仍然默认900秒；当缩放固定装置超过该持续时间时，显式增加它。

`Update Migration` 工作流程每周运行一次，支持手动调度。其默认 `supported-lines` 基线集在运行时解析 npm dist 标签和发布版本：`latest`（先前的稳定版本）、`extended-stable`（当该标签存在时）以及支持的底层 `2026.8.33`。重复版本运行一次。它将每个基线更新为选定的 `package_ref` 工件（默认情况下为 `main`），执行插件清理和旧操作符状态。将 `baselines` 留空以使用该默认值。要获得自 2026.6.1 以来每个已发布稳定版本的明确历史重放，请传递 `baselines=all-since-2026.6.1`：

```bash
gh workflow run update-migration.yml \
  --ref main \
  -f workflow_ref=main \
  -f package_ref=main \
  -f baselines=all-since-2026.6.1 \
  -f scenarios=plugin-deps-cleanup
```

## <a id="package-acceptance"></a> 包裹验收

封装验收是 GitHub-native 封装门。它将一个候选包解析为 `package-under-test` tarball，记录版本和 SHA-256，然后针对该确切的 tarball 运行可重用的 Docker E2E 通道。工作流工具引用与包源引用是分开的，因此当前的测试逻辑可以验证较旧的受信任版本。

候选来源：

- `source=npm`: 验证 `openclaw@extended-stable`、`openclaw@beta`、 `openclaw@latest`，或一个精确的已发布版本。
- `source=ref`: 使用所选的当前 harness 对一个受信任的分支、标签或提交进行打包。
- `source=url`：使用所需的 `package_sha256` 验证公共 HTTPS tarball。此路径拒绝 URL 凭据、非默认 HTTPS 端口、private/internal 主机名或 DNS/IP 结果、特殊用途 IP 空间和不安全重定向。
- `source=trusted-url`：根据 `.github/package-trusted-sources.json` 中维护者拥有的策略验证具有所需 `package_sha256` 和 `trusted_source_id` 的 HTTPS tarball。将其用于 enterprise/private 镜像，而不是使用输入级允许专用开关削弱 `source=url`。当通过策略配置时，承载身份验证使用固定的 `OPENCLAW_TRUSTED_PACKAGE_TOKEN` 密钥。
- `source=artifact`: 重用由另一个 Actions 运行上传的 tarball。

Full Release Validation 默认使用 `source=artifact`，其构建自解析后的发布 SHA。若要进行发布后证明，请传入 `package_acceptance_package_spec=openclaw@YYYY.M.PATCH`，这样相同的升级矩阵就会改为针对已发布的 npm 包。

发布检查会针对 package/update/restart/plugin 套件调用 Package Acceptance：

```text
doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor root-managed-vps-upgrade update-restart-auth plugins-offline plugin-update plugin-binding-command-escape
```

当启用 release soak 时（`release_profile=stable` 和 `full` 时强制开启），它们还会传入：

```text
published_upgrade_survivor_scenarios=reported-issues
telegram_mode=mock-openai
```

这使包迁移、更新渠道切换、损坏的受管插件容错、过时插件依赖清理、离线插件覆盖、插件更新行为以及 Telegram 包 QA 都在同一个已解析产物上进行，而不会让默认的发布包门禁去遍历每一个已发布版本。

当前源版本检查使用相同的 `supported-lines` 基线扩展，在 Docker 扇出之前解析一次以精确包。候选源元数据必须公开新的工具，并且其 `YYYY.M.PATCH` 基础版本必须至少是受信任工作流包的基础版本；此比较将忽略预发布后缀。子级准备或重用预发布插件注册表。默认场景集包括`base`和`legacy-operator-state`；释放浸泡运行 `reported-issues`。

独立的 `supported-lines` 选择器仅扩展 `legacy-operator-state`。每个预先存在的合成场景都保留在单独解决的候选相关前身上，包括每周 `plugin-deps-cleanup` 证明。接受逗号和空格分隔符以及重复选择器。显式版本列表和混合 selector/version 列表保留完整的笛卡尔矩阵以供手动证明。

较旧的源目标、扩展稳定资格、已发布的软件包和单独的 npm 覆盖保留了候选相关的前任和先前的场景集。已发布的资格不准备新运营商状态场景所需的注册表。历史浸泡保留了每个先前存在的已报告问题的固定装置；它不会自动启用冻结目标场景遗漏。具体边界请参见[发布资格](/ci/release-validation#suite-profiles)。候选者仍然是选定的待测包 tarball。每个 PR `docker-seed-e2e` 绊线仍仅限于 `latest` 和 `legacy-operator-state`，并且还在运行 CI 的每个上游 `main` 推送上运行。仅文档推送匹配的 `**/*.md` 和 `docs/**` 跳过 CI；混合文档和代码推送仍然可以运行它。

对于手动历史覆盖，`last-stable-4` 选择了四个最近发布的稳定版 npm-。确切的版本 `all-since-2026.6.1` 和 `release-history` 仍可通过 `published_upgrade_survivor_baselines` 获得。当前工具执行从 `2026.6.1` 开始的基线。 `release-history` 选择六个最新支持的稳定版本，而不添加旧的 3 月或 4 月锚点。要重播 6 月之前的升级，请选择匹配的历史工具；对于旧安装，请在安装最新版本之前通过 `2026.9.5`](/install/updating#upgrading-very-old-versions) 进行 [ 升级。在有界支持基线集之外重播迁移时，请使用这些覆盖。

当选择多个 published-upgrade survivor 基线时，可复用的 Docker workflow 会将每个基线拆分为自己的目标 runner job。每个基线分片仍然会运行所选场景集，但日志和产物都保持按基线分开，且总耗时由最慢的分片决定，而不是一个大的串行任务。

在发布前手动运行一个 package profile 进行验证：

```bash
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=package \
  -f published_upgrade_survivor_scenarios=reported-issues \
  -f telegram_mode=mock-openai
```

对于已发布的 extended-stable 金丝雀，请设置 `package_spec=openclaw@extended-stable`。Package Acceptance 会先将该选择器解析为精确的 tarball，然后再运行 Docker lanes。

当发布问题包含 MCP channels、cron/subagent cleanup、OpenAI web search 或 OpenWebUI 时，请使用 `suite_profile=product`。仅当你需要完整的 Docker 发布路径覆盖时，才使用 `suite_profile=full`。

## <a id="release-default"></a> 发布默认项

对于发布候选版本，默认验证栈为：

1. `pnpm check:changed` 和 `pnpm test:changed`，用于源代码级回归。
2. `pnpm release:check`，用于包产物完整性。
3. Package Acceptance 的 `package` profile 或 release-check 自定义包 lanes，用于 install/update/restart/plugin 契约。
4. Cross-OS 版本检查 OS- 特定的安装程序、入门和平台行为。
5. 仅当变更范围触及 provider 或托管服务行为时才运行 live suites。

在维护者机器上，广泛门禁和 Docker/package 产品验证应在 Testbox 中运行，除非明确在做本地验证。

## <a id="legacy-compatibility"></a> 旧版兼容性

包验收应用当前的元数据和持久性合同，而不会出现 2026 年 6 月之前停用的警告或跳过路径。再现对这些历史候选者的接受需要他们的历史 `workflow_ref` 工具。

对于保留的升级合同，请在 Doctor 中保留迁移，并在更新命令拥有重新启动时使用 `upgrade-survivor`、`published-upgrade-survivor` 或 `update-restart-auth` 证明更改。 6 月之前的任务和流程 sidecar 导入已停用；使用 [ 中间升级过程 ](/install/updating) 来保存这些记录。

## <a id="adding-coverage"></a> 添加覆盖

当更改更新或插件行为时，请在最可能以正确原因失败的最低层添加覆盖：

- 纯路径或元数据逻辑：在源文件旁边添加单元测试。
- 包清单或已打包文件行为：使用 `package-dist-inventory` 或 tarball 检查器测试。
- CLI install/update 行为：Docker 通道断言或夹具。
- 已发布版本迁移行为：`published-upgrade-survivor` 场景。
- update-owned 重启行为：`update-restart-auth`。
- Registry/package 源行为：`test:docker:plugins` 夹具或 ClawHub 夹具服务器。
- 依赖布局或清理行为：断言运行时执行和文件系统边界。 npm 依赖项可能会在插件的托管 npm 项目内提升，因此测试应证明该项目是 scanned/cleaned，而不是假设仅插件包本地 `node_modules` 树。

默认保持新的 Docker fixtures 为 hermetic。除非测试目标就是 live registry 行为，否则使用本地 fixture registry 和伪造包。

## <a id="failure-triage"></a> 失败排查

先从产物身份开始：

- 包验收 `resolve_package` 摘要：来源、版本、SHA-256 和工件名称。
- Docker 工件：`.artifacts/docker-tests/**/summary.json`、`failures.json`、通道日志和重新运行命令。
- 升级幸存者摘要：`.artifacts/upgrade-survivor/summary.json`，包括基线版本、候选版本、场景、阶段时序和配置配方覆盖范围。

`legacy-operator-state` 幸存者通过移动标签（`latest`、`beta` 或 `alpha`）安装匹配的已发布同伴。如果 npm 确认从未发布过确切的配套版本，则该行会在 `baselineCompanion` 中将该配套记录为不可用，并继续剩余的运算符状态和外部插件迁移检查。注册表错误仍然会导致夹具设置失败。尚未开始的更新会报告 `unknown` 结果；失败的更新尝试报告 `failed`，与后续场景断言无关。

故障捕获会在私有诊断快照中保留最新的会话 SQLite 迁移清单和 Doctor 问题报告，但受大小限制。发布的诊断包含问题直方图并捕获遗漏，而不是原始会话详细信息。在删除测试主机之前收集私有工件。容器拥有的观察目录可能需要该隔离主机上的 `sudo tar`；保持他们的权限不变。通过远程包装器收集时，请使用不同的 success/failure 下载目标。成功下载不会更改幸存者退出代码或 `summary.status`。

优先使用相同的包产物重跑失败的精确 lane，而不是重跑整个发布总流程。

## <a id="related"></a> 相关内容

- [Tests](/reference/test) - 测试参考索引，每个读者作业一页
- [Testing](/help/testing) - 完整的测试套件：套件、实时车道和 Docker 跑步者
- [发布政策](/reference/RELEASING) - 此清单控制的发布流程
