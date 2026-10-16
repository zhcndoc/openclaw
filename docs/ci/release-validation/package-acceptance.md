---
summary: "Package Acceptance jobs， candidate sources， suite profiles， and dispatch examples"
read_when:
  - "您正在验证可安装的OpenClaw包裹"
  - "You are debugging a failed package acceptance run"
title: "包裹验收"
sidebarTitle: "包裹验收"
---

Package Acceptance jobs， candidate sources， suite profiles， compatibility windows， and dispatch examples. [ 发布验证工作流程](/ci/release-validation) 索引的一部分。

## <a id="package-acceptance"></a> 包裹验收

当问题是“这个可安装的 OpenClaw 包作为一个产品能正常工作吗？”时，请使用 `Package Acceptance`。它不同于普通 CI：普通 CI 验证源代码树，而包接受则通过用户在安装或更新后所经历的同一套 Docker E2E harness 来验证单个 tarball。

### <a id="jobs"></a> 作业

1. `resolve_package` 检出 `workflow_ref`，解析一个 package candidate，写入 `.artifacts/docker-e2e-package/openclaw-current.tgz`、写入 `.artifacts/docker-e2e-package/package-candidate.json`，将两者作为 `package-under-test` artifact 上传，并在 GitHub step summary 中打印 source、workflow ref、package ref、version、SHA-256 和 profile。
2. `package_integrity` 下载 `package-under-test` artifact，并使用 `scripts/check-openclaw-package-tarball.mjs` 强制执行公共 package tarball 合约。
3. `npm_12_install_sh` 通过 npm 12 下的公共 Linux 安装程序在隔离的 home/prefix 中安装该确切工件，然后验证 CLI 版本和生命周期完成防护并强制执行安装包树预算。
4. `docker_acceptance` 使用已解析的包源 SHA（回退到 `workflow_ref`）和 `package_artifact_name=package-under-test` 调用 `openclaw-live-and-e2e-checks-reusable.yml`。可重用工作流下载该工件，验证 tarball 库存，在需要时准备包摘要 Docker 映像，并针对该包运行选定的 Docker 通道，而不是打包工作流签出。当配置文件选择多个目标 `docker_lanes` 时，可重用工作流程会准备一次包和共享映像，然后将这些通道扇出为具有独特工件的并行目标 Docker 作业。
5. `package_telegram` 可选择调用 `NPM Telegram Beta E2E`。它在 `telegram_mode` 不是 `none` 时运行，并在包验收解决时安装相同的 `package-under-test` 工件；独立的 Telegram 调度仍然可以安装已发布的 npm 规范。
6. 如果包解析、完整性、npm 12 安装程序接受、Docker 接受或可选的 Telegram 通道失败，则 `summary` 工作流程失败。选定的车道保持其第一次失败； callers cannot downgrade a failing test to a warning。

### <a id="installed-package-tree-budget"></a> 安装包树预算

`scripts/check-openclaw-installed-package-budget.mts` 测量 npm- 安装的软件包树，包括 tarball 检查无法看到的依赖项。它计算根目录和每个目录条目，而不遵循符号链接，并对每个常规文件的大小进行求和，包括 npm 的隐藏 `node_modules/.package-lock.json` 文件，因为已发布的更新程序也会对这些字节收费。硬链接路径单独计数。该报告按条目数列出了最大的贡献者，并将总数添加到 GitHub 步骤摘要中。

已发布的 2026.9.3–2026.9.8 更新程序冻结了 **50,000 个条目/1 GiB** 的上限。发布预算为 **47,500 个条目 / 900 MiB**：2,500 个条目保留 （5%） 涵盖 npm- 版本、提升和每个平台的可选依赖项差异，并且大于常规依赖项颠簸，因此检查失败，而每个发布的更新程序仍可以安装候选版本。字节数远未达到上限，但与平台本机预构建的差异更大，因此字节预算保留大约 12% 的储备。

较新的更新程序允许 **500,000 个条目/8 GiB** 并继续候选激活和发布目录标识、版本，启动器检查扫描是否达到这些资源限制，警告完整包内容未经验证。这不会改变发布预算或已安装的驱动程序。 2026.9.8 或更早版本的主管版本下的候选准入拒绝超过 50,000 个条目的树，并给出手动 `npm i -g openclaw@latest` 命令（指定时保留请求的版本或标签）；它无法绕过老司机的步行。

要使用候选 tarball 在本地重现：

```bash
tmp="$(mktemp -d)"
npm install -g --prefix "$tmp" ./openclaw.tgz
node scripts/check-openclaw-installed-package-budget.mts "$tmp/lib/node_modules/openclaw"
```

发生故障时，通过修剪最大的依赖项或 dist 块和预压缩资产数量来减少已安装的条目；减少大文件以应对字节预算失败。不要提高预算：已发布的更新程序的上限无法更改。

### <a id="candidate-sources"></a> 候选来源

- `source=npm`只接受`openclaw@extended-stable`， `openclaw@beta`， `openclaw@latest`，或者一个精确的OpenClaw发布版本如`openclaw@2026.9.5`。将此用于已发布的扩展稳定版、预发行版或稳定版验收。
- `source=ref` 打包一个受信任的 `package_ref` 分支、标签或完整 commit SHA。resolver 会获取 OpenClaw branches/tags，验证所选提交可从 repository branch history 或 release tag 到达，在 detached worktree 中安装依赖，并使用 `scripts/package-openclaw-for-docker.mjs` 打包。
- `source=url` 下载公共 HTTPS `.tgz`；需要 `package_sha256`。此路径拒绝 URL 凭证、非默认 HTTPS 端口、private/internal/special-use 主机名或解析的 IP，并重定向到同一公共安全策略之外。
- `source=trusted-url` 从 `.github/package-trusted-sources.json` 中的命名可信源策略下载 HTTPS `.tgz`；需要 `package_sha256` 和 `trusted_source_id`。仅将其用于维护者拥有的企业镜像或需要配置主机、端口、路径前缀、重定向主机或专用网络解析的专用软件包存储库。如果策略声明承载身份验证，则工作流使用固定的 `OPENCLAW_TRUSTED_PACKAGE_TOKEN` 密钥； URL-嵌入式凭据仍被拒绝。
- `source=artifact` downloads one `.tgz` from `artifact_run_id` and `artifact_name`； `package_sha256` 是可选的，但应为外部共享工件提供。

将 `workflow_ref` 和 `package_ref` 分开。 `workflow_ref` 是运行测试的可信 workflow/harness 代码。 `package_ref` 是在 `source=ref` 时打包的源提交。这使得当前的测试工具可以验证较旧的受信任源提交，而无需运行旧的工作流逻辑。

### <a id="suite-profiles"></a> 套件 profile

- `smoke` — `npm-onboard-channel-agent`, `gateway-network`, `config-reload`
- `package` — `npm-onboard-channel-agent`, `doctor-switch`, `update-channel-switch`, `skill-install`, `update-corrupt-plugin`, `upgrade-survivor`, `published-upgrade-survivor`, `root-managed-vps-upgrade`, `update-restart-auth`, `plugins-offline`, `plugin-update`
- `product` — `package` 集合加上实时 `plugins` 覆盖，替代 `plugins-offline`，另外还包括 `mcp-channels`、`cron-mcp-cleanup`、`openai-web-search-minimal`、`openwebui`
- `full` — 带有 OpenWebUI 的完整 Docker release-path chunks
- `custom` — 精确的 `docker_lanes`；当 `suite_profile=custom` 时必需

`package` 配置文件使用离线插件覆盖范围，因此已发布的包验证​​不会受到实时 ClawHub 可用性的限制。可选的 Telegram 通道重用 `NPM Telegram Beta E2E` 中的 `package-under-test` 工件，并保留已发布的 npm 规范路径以用于独立调度。

关于专门的更新和插件测试策略，包括本地命令、Docker lanes、Package Acceptance 输入、发布默认值和失败排查，请参见 [测试更新和插件](/help/testing-updates-plugins)。

发布检查使用 `source=artifact`、准备好的发布包工件、`suite_profile=custom`、`docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor root-managed-vps-upgrade update-restart-auth plugins-offline plugin-update plugin-binding-command-escape'` 和 `telegram_mode=mock-openai` 调用包验收。这可以使包迁移、更新、实时 ClawHub 技能安装、陈旧插件依赖项清理、配置插件安装修复、离线插件、插件更新和 Telegram 证明保存在同一解析包 tarball 上。发布测试版后，将 `release_package_spec` 设置为完整版本验证或 OpenClaw 版本检查，以针对已发货的 npm 包运行相同的矩阵，而无需重建；仅当包验收需要与其余发布验证不同的包时才设置 `package_acceptance_package_spec`。跨 OS 版本检查仍然涵盖 OS- 特定的入门、安装程序和平台行为； package/update 产品验证应从包装验收开始。

升级幸存者断言所有权遵循所选目标的发布序列，在源身份验证后从其不可变包元数据中读取。扩展稳定目标保留其附带的场景运行器、断言和固定装置；常规目标将可信场景保持在一起，包括其服务 turn/post-inference 断言。历史基线不选择断言所有者。无效的目标版本和不受支持的扩展稳定修正版本在 Docker 之前失败。

Docker 种子 CI 在运行 `published-upgrade-survivor` 之前解析所选源包版本的确切发布的稳定前身。它使用发布基线解析器和选定的发布上下文，因此发布 `latest` 永远不会将第一次升级变成当前的操作。 Docker 启动前缺少前辈失败；现有的单独控制保持不变。

`published-upgrade-survivor` Docker 通道验证每个场景的一个已发布包基线。在包验收中，已解析的 `package-under-test` tarball 始终是候选者，`published_upgrade_survivor_baseline` 选择后备已发布基线，默认为 `openclaw@latest`；失败通道重新运行命令保留该基线。当前源版本检查设置 `published_upgrade_survivor_baselines=supported-lines` 为 `legacy-operator-state`：npm 的当前 `latest`、之前的稳定版本、`extended-stable`（当该标签存在时）以及记录的最早支持的基线 `2026.8.33`。解析器在运行时读取 `npm view openclaw versions` 和 `npm view openclaw dist-tags`，在扇出之前固定精确版本，并删除重叠行。正常电流源释放检查保留 `base` 并添加 `legacy-operator-state` 和 `custom-plugin-siblings`；发布浸泡选择`reported-issues`，包括这些和现有的问题形夹具。同级源场景使用从 2026.9.4 开始的基线，并需要从私有更新金丝雀执行实际的自定义插件 Doctor 合约，以及更新后完整的源文件和插件加载。

在目标 Docker 扇出之前，受信任的组规划器会在一次性 npm 前缀中安装每个不同的已发布基线，并根据综合隔离状态检查 `openclaw --version` 和 `openclaw config set gateway.mode local`。配置写入加载 CLI 设置路径，因为 version/help 和配置读取可以使用快速路径。未成功退出的已安装 CLI 会记录为 **unusable 已发布基线**，其跳过的场景以及在作业摘要和 `upgrade-baseline-checks-*` 工件中捕获的错误。跳过的场景永远不会被视为成功升级。安装错误、检查超时和流程启动失败都会导致计划失败。候选安装和升级保留其现有的故障门。

安装预发行注册表后，基准包安装和初始手动基准网关启动将使用配置的已发布上游。已发布的包和候选包可以共享确切的版本，但包含不同的字节；仅保留已发布的 dist 标签并不能隔离它们。在这些基线命令之后，候选安装将继续使用经过验证的候选注册表，包括其确切版本依赖项。

`legacy-operator-state` 配套装置在两个注册阶段都保留其包 name/version 的已发布存档。当候选伙伴具有相同版本时，安装断言需要保留的已发布字节。不同的版本选择并验证准备好的候选档案。这使得相同版本的核心更新证明无法模拟 npm 重新发布；测试更改的伴随字节需要不同的伴随版本。

扩展发布资格要求候选者的 `YYYY.M.PATCH` 基本版本至少是可信工作流包的基本版本，在此比较中忽略预发布后缀。然后，它读取操作员状态harness的不可变源目录元数据。较旧的源目标和扩展稳定上下文或分支保留经过验证的候选相对前身。已发布的候选者保留该前身和预先存在的合成场景清单，因为他们的资格路径不准备运营商状态固定装置所需的注册表。单独的 `package_acceptance_package_spec` 覆盖从包接受内覆盖的实际包版本解析其前身。

在受支持的产品线发布配置文件中，`custom-plugin-siblings` 始终使用确切发布的 `openclaw@2026.9.4` 回归驱动程序。当源候选具有相同版本时，这会保留报告的第一跳；基础和遗留运营商场景保留其现有的基线选择。

子工作流程准备或重用新场景的工件断言所需的预发布插件注册表，以便该场景仅针对合格的未发布候选者运行。已发布的重新资格保留 `base` 或每个预先存在的报告问题场景以进行浸泡，因为其包路径不准备该注册表。历史资格同样仅排除新添加的运营商状态场景。现有的冻结目标兼容性检查和明确的场景忽略选择保持不变；永远不会执行候选源代码来选择此配置文件。

对于独立的 `supported-lines` 选择器，组规划器仅针对单独解析的前身运行每个预先存在的综合场景，并针对每个支持的基线运行 `legacy-operator-state`。它合并重叠的组并保留每个请求的固定装置；丢失或移动标签的前任失败了计划。逗号和空格分隔符以及重复的独立选择器使用解析器的正常标记语法。显式版本列表和混合 selector/version 列表保留完整的笛卡尔 baseline/scenario 矩阵，用于有意的手动证明。选择器来源仅作为内部可重用工作流元数据传输；没有新的手动调度输入。

扩展的发布升级幸存者和更新迁移选择对每个受支持的 baseline/scenario 对使用一项作业，每个矩阵最多有 32 个活动的目标 Docker 作业。规划器首先承认包含 `update-restart-auth`、`plugin-update` 和 `root-managed-vps-upgrade` 的现有组，因此那些长更新作业不会等待扩展的场景矩阵。在每个扩展的升级系列中，精确的基线队列首先运行最新的，将测得的较慢的最近升级置于较旧的基线之前。群组内的场景和其他群组保留其输入顺序；未解析的基线标签保留调用者顺序。分组共享执行计划器的基线兼容性策略，因此每个支持的场景只运行一次，而无需为旧基线创建空分片。每个场景拥有一个新的容器和不变的npm资源限制；包装和图像标识在整个矩阵中保持共享。 `Update Migration` 每周日 03：17 UTC 运行并手动调度。它默认为 `supported-lines` 以及 `plugin-deps-cleanup` 和 `legacy-operator-state`，保留现有的清理覆盖范围，并且不转发任何提供者机密。每周运行会清理与候选者相关的前任者，并在每个支持的基线上练习本机操作员状态。每个场景的规划时间为 12 分钟，加上 30 分钟的共享 package/image 准备和控制时间，每周大约 78 分钟的跑步时间有 3 个不同的基线，或者 90 分钟有 4 个基线；实际的时序工件决定了观察到的成本。

通过 `baselines=all-since-2026.6.1` 进行详尽的历史清理； `last-stable-4`、`release-history` 和确切的历史版本仍然是明确的手动选择。本地聚合运行可以通过 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` 传递已解析的精确规格，与 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 保持单通道，或为场景矩阵设置 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS`。现有场景保留其烘焙的 `openclaw config set` 配方和摘要记录。新的操作员状态场景改为使用基线自己的代理、exec-approvals、cron 和插件 CLI，然后在升级后验证保留的状态和模拟提供者轮流。网关检查包括 `/healthz`、`/readyz` 和 RPC 状态。请参阅 [ 测试更新和插件](/help/testing-updates-plugins) 了解保留状态和成功升级的要求。

所有支持的基线行都需要成功更新。现有的合成 `base` 和报告的问题固定装置保留其成功断言，并在候选相对前身上运行一次。该通道不会运行额外的 Doctor 或省略这些固定装置来将失败的架构升级转变为通过。

当前的跨 OS 工具在 Linux、Windows 和 macOS 的 Node 24.21.0 和 Node 26.1.0 支持层上运行打包的全新安装和升级检查。由于后来的 libuv 文件观察器回归，Windows 打包的全新安装为其 Node 24 单元保留了 Node 24.16.0。两个运行时变体都使用相同的准备好的候选 tarball。聚焦 `suite_filter` 选择 Node 两个变体； Node 26 个作业和工件具有不同的名称。安装程序和源更新通道保留其现有的 Node 24 覆盖范围。显式选择较旧的 `workflow_ref` 工具会保留该修订版的历史矩阵。

Windows 打包和安装程序新通道还验证已安装的包是否可以从原始绝对 Windows 路径导入浏览器控制覆盖。 OpenAI跨OS代理转烟雾设置时默认为`OPENCLAW_CROSS_OS_OPENAI_MODEL`，否则为`openai/gpt-5.6-luna`，因此安装和网关证明使用成本较低的GPT-5.6测试层。

### <a id="legacy-compatibility-windows"></a> 旧版兼容窗口

当前的升级幸存者执行需要 `2026.6.1` 或更高版本的已发布基线。历史选择器过滤掉早期版本； `release-history` 选择六个最新支持的稳定版本。准确的 6 月前基线将被拒绝，包括当 dist-tag 解析为 1 时。使用匹配的历史 `workflow_ref` 工具来重放旧的升级。现有的历史收据仍然可读。

套餐接受不再放宽对 2026 年 6 月之前候选人的断言。缺少清单条目、已发送的本地构建元数据、缺少服务包装器支持以及不完整的更新或插件安装记录持久性都会导致当前合同失败。当前的包验证器还要求新 tarball 中不存在 npm 锁定文件格式。要重现历史验收结果，请选择匹配的历史 `workflow_ref` 工具。

### <a id="examples"></a> 示例

```bash
# Validate the current beta package with product-level coverage.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai

# Validate the published extended-stable package with package coverage.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@extended-stable \
  -f suite_profile=package \
  -f telegram_mode=mock-openai

# Pack and validate a release branch with the current harness.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=ref \
  -f package_ref=release/YYYY.M.PATCH \
  -f suite_profile=package \
  -f telegram_mode=mock-openai

# Validate a tarball URL. SHA-256 is mandatory for source=url.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=url \
  -f package_url=https://example.com/openclaw-current.tgz \
  -f package_sha256=<64-char-sha256> \
  -f suite_profile=smoke

# Validate a tarball from a named trusted private mirror policy.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=trusted-url \
  -f trusted_source_id=enterprise-artifactory \
  -f package_url=https://packages.example.internal:8443/artifactory/openclaw/openclaw-current.tgz \
  -f package_sha256=<64-char-sha256> \
  -f suite_profile=smoke

# Reuse a tarball uploaded by another Actions run.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=artifact \
  -f artifact_run_id=<run-id> \
  -f artifact_name=package-under-test \
  -f suite_profile=custom \
  -f docker_lanes='install-e2e plugin-update'
```

当排查一次失败的 package acceptance 运行时，请先查看 `resolve_package` summary，以确认包来源、版本和 SHA-256。然后检查 `docker_acceptance` 子运行及其 Docker 工件：`.artifacts/docker-tests/**/summary.json`、`failures.json`、lane 日志、阶段耗时以及重新运行命令。优先重新运行失败的 package profile 或精确的 Docker lanes，而不是重新运行完整的发布验证。
