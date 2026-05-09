---
summary: "OpenClaw 如何验证更新路径、包迁移以及插件安装/更新行为"
read_when:
  - 更改 OpenClaw 的更新、doctor、包接纳或插件安装行为时
  - 准备或批准发布候选版本时
  - 调试包更新、插件依赖清理或插件安装回归时
title: "测试：更新和插件"
sidebarTitle: "更新和插件测试"
---

这是用于更新和插件验证的专用检查清单。目标很简单：证明可安装的包能够更新真实用户状态，通过 `doctor` 修复过时的旧状态，并且仍然可以从受支持的来源安装、加载、更新和卸载插件。

更全面的测试运行器地图请参见 [Testing](/help/testing)。关于实时 provider key 和会触发网络的套件，请参见 [Testing live](/help/testing-live)。

## 我们保护的内容

更新和插件测试保护以下契约：

- 包 tarball 是完整的，具有有效的 `dist/postinstall-inventory.json`，
  并且不依赖于解包后的仓库文件。
- 用户可以从较旧的已发布包迁移到候选包，
  而不会丢失配置、agents、sessions、workspaces、插件 allowlist，或
  channel 配置。
- `openclaw doctor --fix --non-interactive` 负责旧版清理和修复
  路径。启动过程不应为过时的
  插件状态增加隐藏的兼容性迁移。
- 插件安装可从本地目录、git 仓库、npm 包以及
  ClawHub registry 路径工作。
- 插件 npm 依赖会安装到受管理的 npm 根目录中，在建立信任前进行扫描，
  并在卸载时通过 npm 移除，这样提升的依赖就不会
  残留。
- 当没有变化时，插件更新应保持稳定：安装记录、已解析的
  来源、已安装的依赖布局以及启用状态都应保持完好。

## 开发期间的本地验证

先从较小范围开始：

```bash
pnpm changed:lanes --json
pnpm check:changed
pnpm test:changed
```

对于插件安装、卸载、依赖或包清单变更，也请运行覆盖已编辑接缝的聚焦测试：

```bash
pnpm test src/plugins/uninstall.test.ts src/infra/package-dist-inventory.test.ts test/scripts/package-acceptance-workflow.test.ts
```

在任何包 Docker lane 消费 tarball 之前，先验证包产物：

```bash
pnpm release:check
```

`release:check` 会运行配置/文档/API 漂移检查，写入包 dist 清单，运行 `npm pack --dry-run`，拒绝被打包的禁用文件，将 tarball 安装到临时前缀，运行 postinstall，并对打包内的 channel 入口点进行冒烟测试。

## Docker lanes

Docker lanes 是产品级验证。它们在 Linux 容器中安装或更新真实包，并通过 CLI 命令、Gateway 启动、HTTP 探针、RPC 状态和文件系统状态来断言行为。

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

- `test:docker:plugins` 验证插件安装冒烟测试、本地文件夹安装、
  本地文件夹更新跳过行为、带预装
  依赖的本地文件夹、`file:` 包安装、带 CLI 执行的 git 安装、git
  移动 ref 更新、带提升的传递
  依赖的 npm registry 安装、npm 更新无操作、本地 ClawHub fixture 安装和更新
  无操作、marketplace 更新行为，以及 Claude-bundle 启用/检查。设置
  `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` 可保持 ClawHub 区块 hermetic/offline。
- `test:docker:plugin-lifecycle-matrix` 在一个裸
  容器中安装候选包，通过安装、检查、禁用、启用、显式升级、显式降级和
  在删除插件代码后的卸载来运行一个 npm 插件。它会为每个阶段记录 RSS 和 CPU 指标。
- `test:docker:plugin-update` 验证在 `openclaw plugins update` 期间，未变化的已安装插件不会
  重新安装或丢失安装元数据。
- `test:docker:upgrade-survivor` 在一个脏的
  旧用户 fixture 上安装候选 tarball，运行包更新以及非交互式 doctor，然后启动一个回环 Gateway 并检查状态保留。
- `test:docker:published-upgrade-survivor` 先安装一个已发布的基线，
  通过预制的 `openclaw config set` 配方对其进行配置，将其更新到
  候选 tarball，运行 doctor，检查旧版清理，启动 Gateway，并探测
  `/healthz`、`/readyz` 和 RPC 状态。
- `test:docker:update-restart-auth` 安装候选包，启动一个
  受管理的 token-auth Gateway，为 `openclaw update --yes --json` 取消调用方 gateway auth 环境变量，
  并要求候选更新命令在正常探针之前
  重启 Gateway。
- `test:docker:update-migration` 是一个清理密集型的已发布更新 lane。它
  从一个已配置的 Discord/Telegram 风格用户状态开始，运行基线
  doctor，使已配置的插件依赖有机会实例化，种入
  一个已配置的打包插件的旧版插件依赖碎片，更新到
  候选 tarball，并要求更新后的 doctor 移除旧版
  依赖根目录。

有用的 published-upgrade survivor 变体：

```bash
OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC=openclaw@2026.4.23 \
OPENCLAW_UPGRADE_SURVIVOR_SCENARIO=versioned-runtime-deps \
pnpm test:docker:published-upgrade-survivor

OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC=openclaw@latest \
OPENCLAW_UPGRADE_SURVIVOR_SCENARIO=bootstrap-persona \
pnpm test:docker:published-upgrade-survivor
```

可用场景为 `base`、`feishu-channel`、`bootstrap-persona`、
`plugin-deps-cleanup`、`configured-plugin-installs`、
`stale-source-plugin-shadow`、`tilde-log-path` 和 `versioned-runtime-deps`。在聚合运行中，
`OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=reported-issues` 会展开为所有已报告
问题形状的场景，包括已配置的插件安装迁移。

完整更新迁移有意与 Full Release CI 分离。当发布问题是“从 2026.4.23 起的每个
已发布稳定版本都能更新到这个候选版本并清理插件依赖残留吗？”时，请使用手动
`Update Migration` 工作流：

```bash
gh workflow run update-migration.yml \
  --ref main \
  -f workflow_ref=main \
  -f package_ref=main \
  -f baselines=all-since-2026.4.23 \
  -f scenarios=plugin-deps-cleanup
```

## 包接纳

Package Acceptance 是 GitHub 原生的包门禁。它将一个候选包解析为一个 `package-under-test` tarball，记录版本和 SHA-256，然后针对该精确 tarball 运行可复用的 Docker E2E lanes。工作流 harness 参考与包源参考是分离的，因此当前测试逻辑可以验证较旧的受信任发布版本。

候选来源：

- `source=npm`：验证 `openclaw@beta`、`openclaw@latest` 或某个精确的已发布版本。
- `source=ref`：使用所选的当前 harness 打包一个受信任的分支、tag 或 commit。
- `source=url`：验证一个带有必需 `package_sha256` 的 HTTPS tarball。
- `source=artifact`：复用另一个 Actions 运行上传的 tarball。

Full Release Validation 默认使用 `source=artifact`，从
已解析的发布 SHA 构建。对于发布后的证明，请传入
`package_acceptance_package_spec=openclaw@YYYY.M.D`，这样同一套升级矩阵
就会改为针对已发布的 npm 包。

Release checks call Package Acceptance with the package/update/restart/plugin set:

```text
doctor-switch update-channel-switch update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update
```

When release soak is enabled, they also pass:

```text
published_upgrade_survivor_baselines=last-stable-4 2026.4.23 2026.5.2 2026.4.15
published_upgrade_survivor_scenarios=reported-issues
telegram_mode=mock-openai
```

This keeps package migration, update channel switching, corrupt managed-plugin
tolerance, stale plugin dependency cleanup, offline plugin coverage, plugin
update behavior, and Telegram package QA on the same resolved artifact without
making the default release package gate walk every published release.

`last-stable-4` resolves to the four latest stable npm-published OpenClaw
releases. Release package acceptance pins `2026.4.23` as the first plugin-update
compatibility boundary, `2026.5.2` as a plugin-architecture churn boundary, and
`2026.4.15` as an older 2026.4.1x published-update baseline; the resolver
dedupes pins that are already in the latest four. For exhaustive published
update migration coverage, use `all-since-2026.4.23` in the separate Update
Migration workflow instead of Full Release CI. `release-history` remains
available for manual wider sampling when you also want the legacy pre-date
anchor.

When multiple published-upgrade survivor baselines are selected, the reusable
Docker workflow shards each baseline into its own targeted runner job. Each
baseline shard still runs the selected scenario set, but logs and artifacts stay
per-baseline and wall time is bounded by the slowest shard instead of one large
serial job.

Run a package profile manually when validating a candidate before release:

```bash
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=package \
  -f published_upgrade_survivor_baselines="last-stable-4 2026.4.23 2026.5.2 2026.4.15" \
  -f published_upgrade_survivor_scenarios=reported-issues \
  -f telegram_mode=mock-openai
```

当发布问题涉及 MCP channels、cron/subagent 清理、OpenAI web search 或 OpenWebUI 时，使用 `suite_profile=product`。仅当你需要完整的 Docker 发布路径覆盖时，才使用 `suite_profile=full`。

## 发布默认项

对于发布候选版本，默认验证栈为：

1. `pnpm check:changed` and `pnpm test:changed` for source-level regressions.
2. `pnpm release:check` for package artifact integrity.
3. Package Acceptance `package` profile or the release-check custom package
   lanes for install/update/restart/plugin contracts.
4. Cross-OS release checks for OS-specific installer, onboarding, and platform
   behavior.
5. Live suites only when the changed surface touches provider or hosted-service
   behavior.

在维护者机器上，广泛门禁和 Docker/package 产品验证应在 Testbox 中运行，除非明确在做本地验证。

## 旧版兼容性

兼容性宽容范围很窄且有时间限制：

- 截至 `2026.4.25` 的包，包括 `2026.4.25-beta.*`，在 Package Acceptance 中可以容忍已发布的包元数据缺口。
- 已发布的 `2026.4.26` 包可以对已发布的本地构建元数据 stamp 文件发出警告。
- 更晚的包必须满足现代契约。同样的缺口会失败，而不是警告或跳过。

Do not add new startup migrations for these old shapes. Add or extend a doctor
repair, then prove it with `upgrade-survivor`, `published-upgrade-survivor`, or
`update-restart-auth` when the update command owns the restart.

## 添加覆盖

当更改更新或插件行为时，请在最可能以正确原因失败的最低层添加覆盖：

- Pure path or metadata logic: unit test beside the source.
- Package inventory or packed-file behavior: `package-dist-inventory` or tarball
  checker test.
- CLI install/update behavior: Docker lane assertion or fixture.
- Published-release migration behavior: `published-upgrade-survivor` scenario.
- Update-owned restart behavior: `update-restart-auth`.
- Registry/package source behavior: `test:docker:plugins` fixture or ClawHub
  fixture server.
- Dependency layout or cleanup behavior: assert both runtime execution and the
  filesystem boundary. npm dependencies may be hoisted under the managed npm
  root, so tests should prove the root is scanned/cleaned instead of assuming a
  package-local `node_modules` tree.

默认保持新的 Docker fixtures 为 hermetic。除非测试目标就是 live registry 行为，否则使用本地 fixture registry 和伪造包。

## 失败排查

先从产物身份开始：

- Package Acceptance 的 `resolve_package` 摘要：来源、版本、SHA-256 和产物名称。
- Docker 产物：`.artifacts/docker-tests/**/summary.json`、`failures.json`、lane 日志和重跑命令。
- Upgrade survivor 摘要：`.artifacts/upgrade-survivor/summary.json`，包括基线版本、候选版本、场景、阶段耗时和配方步骤。

优先使用相同的包产物重跑失败的精确 lane，而不是重跑整个发布总流程。
