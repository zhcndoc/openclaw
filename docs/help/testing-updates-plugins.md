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

更全面的测试运行器地图请参见 [测试](/help/testing)。关于实时 provider key 和会触发网络的套件，请参见 [实时测试](/help/testing-live)。

## 我们保护的内容

更新和插件测试保护以下契约：

- 一个包 tarball 是完整的，具有有效的 `dist/postinstall-inventory.json`，
  且不依赖未解包的仓库文件。
- 用户可以从较旧的已发布包迁移到候选包，
  而不会丢失配置、agents、sessions、workspaces、插件 allowlist 或
  channel 配置。
- `openclaw doctor --fix --non-interactive` 负责旧版清理和修复
  路径。启动阶段不应再为过时的插件状态引入隐藏的兼容性迁移。
- 插件安装可来自本地目录、git 仓库、npm 包，以及
  ClawHub registry 路径。
- 插件的 npm 依赖会在每个插件对应的受管 npm 项目中安装，
  在信任前进行扫描，并在卸载时通过 npm 删除，因此 hoisted
  依赖不会残留。
- 当没有任何变化时，插件更新是稳定的：安装记录、解析后的
  来源、已安装的依赖布局以及启用状态都保持不变。

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

- `test:docker:plugins` 会验证插件安装冒烟测试、本地文件夹安装、本地文件夹更新跳过行为、带预装依赖的本地文件夹、`file:` 包安装、带 CLI 执行的 git 安装、git 移动引用更新、带提升式传递依赖的 npm registry 安装、npm 更新无操作、损坏的 npm 包元数据拒绝、本地 ClawHub fixture 安装与更新无操作、marketplace 更新行为，以及 Claude-bundle 启用/检查。将 `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` 设为 0 可使 ClawHub 区块保持 hermetic/离线。
- `test:docker:plugin-lifecycle-matrix` 会在一个裸容器中安装候选包，运行一个 npm 插件完成安装、检查、禁用、启用、显式升级、显式降级，以及在删除插件代码后卸载。它会记录每个阶段的 RSS 和 CPU 指标。
- `test:docker:plugin-update` 会验证在 `openclaw plugins update` 期间，未发生变化的已安装插件不会重新安装，也不会丢失安装元数据。
- `test:docker:upgrade-survivor` 会在一个脏旧用户 fixture 上安装候选 tarball，运行包更新加非交互式 doctor，然后启动一个 loopback Gateway 并检查状态保留。
- `test:docker:published-upgrade-survivor` 会先安装一个已发布基线，通过预先烘焙的 `openclaw config set` 配方进行配置，更新到候选 tarball，运行 doctor，检查旧版清理，启动 Gateway，并探测 `/healthz`、`/readyz` 和 RPC 状态。
- `test:docker:update-restart-auth` 会安装候选包，启动一个受管的 token-auth Gateway，清除调用方 gateway auth 环境变量以供 `openclaw update --yes --json` 使用，并要求候选更新命令在正常探测之前重启 Gateway。
- `test:docker:update-migration` 是一个重清理的已发布更新 lane。它从已配置的 Discord/Telegram 风格用户状态开始，运行基线 doctor，使已配置的插件依赖有机会落地，为一个已配置的打包插件播种旧版插件依赖残留，更新到候选 tarball，并要求更新后的 doctor 删除旧的依赖根目录。

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

- `source=npm`: 验证 `openclaw@beta`、`openclaw@latest` 或某个精确的
  已发布版本。
- `source=ref`: 使用选定的当前
  harness 打包受信任的分支、标签或提交。
- `source=url`: 验证一个公共 HTTPS tarball，并要求提供 `package_sha256`。
  此路径会拒绝 URL 凭据、非默认 HTTPS 端口、私有/内部
  主机名或 DNS/IP 结果、特殊用途 IP 空间以及不安全的重定向。
- `source=trusted-url`: 根据维护者拥有的策略，
  对 `.github/package-trusted-sources.json` 中的 `trusted_source_id`
  验证一个带 `package_sha256` 和 `trusted_source_id` 的 HTTPS tarball。请将其用于企业/私有
  镜像，而不是通过输入级的 allow-private 开关来弱化 `source=url`。当策略配置了 Bearer 认证时，
  使用固定的 `OPENCLAW_TRUSTED_PACKAGE_TOKEN` secret。
- `source=artifact`: 复用由另一个 Actions 运行上传的 tarball。

Full Release Validation uses `source=artifact` by default, built from the
resolved release SHA. For post-publish proof, pass
`package_acceptance_package_spec=openclaw@YYYY.M.PATCH` so the same upgrade matrix
targets the shipped npm package instead.

发布检查会针对 package/update/restart/plugin 套件调用 Package Acceptance：

```text
doctor-switch update-channel-switch update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update
```

当启用发布 soak 时，它们还会传入：

```text
published_upgrade_survivor_baselines=last-stable-4 2026.4.23 2026.5.2 2026.4.15
published_upgrade_survivor_scenarios=reported-issues
telegram_mode=mock-openai
```

这使包迁移、更新渠道切换、损坏的受管插件容错、过时插件依赖清理、离线插件覆盖、插件更新行为以及 Telegram 包 QA 都在同一个已解析产物上进行，而不会让默认的发布包门禁去遍历每一个已发布版本。

`last-stable-4` 会解析为最近四个已发布到 npm 的稳定版 OpenClaw
版本。发布包接纳将 `2026.4.23` 作为第一个插件更新
兼容性边界，`2026.5.2` 作为插件架构变动边界，以及
`2026.4.15` 作为较早的 2026.4.1x 已发布更新基线；解析器会
去重已包含在最近四个中的固定版本。对于穷尽的已发布
更新迁移覆盖，请在单独的 Update
Migration 工作流中使用 `all-since-2026.4.23`，而不是 Full Release CI。`release-history` 仍然
可用于手动更广泛抽样，尤其是在你也想要使用旧的发布日期
锚点时。

当选择多个 published-upgrade survivor 基线时，可复用的
Docker workflow 会将每个基线拆分为自己的目标 runner job。每个
基线分片仍然会运行所选场景集，但日志和产物都保持
按基线分开，且总耗时由最慢的分片决定，而不是一个大的
串行任务。

在发布前手动运行一个 package profile 进行验证：

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

1. `pnpm check:changed` 和 `pnpm test:changed`，用于源代码级回归。
2. `pnpm release:check`，用于包产物完整性。
3. Package Acceptance 的 `package` profile 或 release-check 自定义包
   lanes，用于 install/update/restart/plugin 契约。
4. 跨操作系统发布检查，用于特定于操作系统的安装器、引导以及平台
   行为。
5. 仅当变更范围触及 provider 或托管服务
   行为时才运行 live suites。

在维护者机器上，广泛门禁和 Docker/package 产品验证应在 Testbox 中运行，除非明确在做本地验证。

## 旧版兼容性

兼容性宽容范围很窄且有时间限制：

- 截至 `2026.4.25` 的包，包括 `2026.4.25-beta.*`，在 Package Acceptance 中可以容忍已发布的包元数据缺口。
- 已发布的 `2026.4.26` 包可以对已发布的本地构建元数据 stamp 文件发出警告。
- 更晚的包必须满足现代契约。同样的缺口会失败，而不是警告或跳过。

不要为这些旧形状添加新的启动迁移。请添加或扩展 doctor
修复，然后在更新命令负责重启时，使用 `upgrade-survivor`、`published-upgrade-survivor` 或
`update-restart-auth` 来证明它。

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
  filesystem boundary. npm dependencies may be hoisted inside the plugin's
  managed npm project, so tests should prove that project is scanned/cleaned
  instead of assuming only the plugin package-local `node_modules` tree.

默认保持新的 Docker fixtures 为 hermetic。除非测试目标就是 live registry 行为，否则使用本地 fixture registry 和伪造包。

## 失败排查

先从产物身份开始：

- Package Acceptance 的 `resolve_package` 摘要：来源、版本、SHA-256 和产物名称。
- Docker 产物：`.artifacts/docker-tests/**/summary.json`、`failures.json`、lane 日志和重跑命令。
- Upgrade survivor 摘要：`.artifacts/upgrade-survivor/summary.json`，包括基线版本、候选版本、场景、阶段耗时和配方步骤。

优先使用相同的包产物重跑失败的精确 lane，而不是重跑整个发布总流程。
