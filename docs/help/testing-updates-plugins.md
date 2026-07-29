---
summary: "OpenClaw 如何验证更新路径、包迁移以及插件安装/更新行为"
read_when:
  - 更改 OpenClaw 的更新、doctor、包接纳或插件安装行为时
  - 准备或批准发布候选版本时
  - 调试包更新、插件依赖清理或插件安装回归时
title: "测试：更新和插件"
sidebarTitle: "更新和插件测试"
---

更新和插件验证检查清单：证明可安装包能够
更新真实用户状态，通过 `doctor` 修复过期的旧状态，并且仍然能够
从所有受支持的来源安装、加载、更新和卸载插件。

更全面的测试运行器地图请参见 [测试](/help/testing)。关于实时 provider key 和会触发网络的套件，请参见 [实时测试](/help/testing-live)。

## 我们保护的内容

- 一个 package tarball 是完整的，具有有效的 `dist/postinstall-inventory.json`，并且不依赖于已解包的 repo 文件。
- 用户可以从较旧的已发布 package 迁移到候选 package，而不会丢失 config、agents、sessions、workspaces、plugin allowlists 或 channel config。
- `openclaw doctor --fix --non-interactive` 负责旧版清理和修复路径。启动时不应为过期的 plugin state 增加隐式的兼容性迁移。
- Plugin 安装可从本地目录、git repos、npm packages 和 ClawHub registry path 正常工作。
- Plugin 的 npm dependencies 在每个 plugin 的一个受管理 npm project 中安装，在信任之前会先进行扫描，并且在 plugin 卸载时通过 `npm uninstall` 移除，因此 hoisted dependencies 不会残留。
- 当没有任何变化时，Plugin update 是无操作：install records、resolved source、installed dependency layout 和 enabled state 都保持不变。

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

`release:check` runs config/docs/API drift checks (config schema, config docs
baseline, plugin SDK API contract manifest and exports, plugin versions/inventory),
writes the package dist inventory, runs `npm pack --dry-run`, rejects forbidden
packed files, installs the tarball into a temp prefix, runs postinstall, and
smokes bundled channel entrypoints.

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

- `test:docker:plugins` 覆盖插件安装冒烟测试、本地文件夹安装、
  本地文件夹更新跳过行为、带预安装
  依赖的本地文件夹、`file:` 包安装、带 CLI 执行的 git 安装、git
  移动引用更新、带提升的传递
  依赖的 npm registry 安装、npm 更新无操作、格式错误的 npm 包元数据拒绝、
  本地 ClawHub fixture 安装和更新无操作、marketplace 更新行为，
  以及 Claude-bundle 启用/检查。设置 `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` 以
  保持 ClawHub 区块的整体性/离线。
- `test:docker:plugin-lifecycle-matrix` 在一个裸
  容器中安装候选包，运行一个 npm 插件，依次经过安装、检查、禁用、启用、
  显式升级、显式降级，以及在删除插件
  代码后的卸载。它会按阶段记录 RSS 和 CPU 指标。
- `test:docker:plugin-update` 验证一个未更改的已安装插件在执行
  `openclaw plugins update` 期间不会重新安装或丢失安装元数据。
- `test:docker:upgrade-survivor` 在一个脏的
  old-user fixture 上安装候选 tarball，运行包更新加非交互式 doctor，然后启动
  loopback Gateway 并检查状态保留。
- `test:docker:published-upgrade-survivor` 先安装一个已发布的基线，
  通过预置的 `openclaw config set` 配方进行配置，更新到候选 tarball，
  运行 doctor，检查旧版清理，启动 Gateway，并
  探测 `/healthz`、`/readyz` 和 RPC 状态。
- `test:docker:update-restart-auth` 安装候选包，启动一个受管理的 token-auth Gateway，
  在 `openclaw update --yes --json` 前取消调用方 gateway auth 环境变量，
  并要求候选更新命令在正常探测之前重启 Gateway。
- `test:docker:update-migration` 是清理密集型的已发布更新 lane。它
  从一个已配置的 Discord/Telegram 风格用户状态开始，运行基线
  doctor 以便已配置的插件依赖有机会实例化，为一个已配置的打包插件播种
  旧版插件依赖残留，更新到候选 tarball，
  并要求更新后的 doctor 移除旧版依赖根。

有用的 published-upgrade survivor 变体：

```bash
OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC=openclaw@2026.4.23 \
OPENCLAW_UPGRADE_SURVIVOR_SCENARIO=versioned-runtime-deps \
pnpm test:docker:published-upgrade-survivor

OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC=openclaw@latest \
OPENCLAW_UPGRADE_SURVIVOR_SCENARIO=bootstrap-persona \
pnpm test:docker:published-upgrade-survivor
```

可用场景：`base`、`acpx-openclaw-tools-bridge`、`feishu-channel`、
`bootstrap-persona`、`channel-post-core-restore`、`plugin-deps-cleanup`、
`configured-plugin-installs`、`stale-source-plugin-shadow`、`tilde-log-path`，
以及 `versioned-runtime-deps`。在聚合运行中，`OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=reported-issues`
（别名 `far-reaching`）会展开为所有场景，包括
已配置插件安装迁移。

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

- `source=npm`: 验证 `openclaw@extended-stable`、`openclaw@beta`、
  `openclaw@latest`，或一个精确的已发布版本。
- `source=ref`: 使用所选的当前 harness 对一个受信任的分支、标签或提交进行打包。
- `source=url`: 验证带有必需 `package_sha256` 的公开 HTTPS tarball。
  该路径会拒绝 URL 凭据、非默认 HTTPS 端口、私有/内网主机名或 DNS/IP 解析结果、特殊用途 IP 空间，以及不安全的重定向。
- `source=trusted-url`: 针对维护者拥有的 `.github/package-trusted-sources.json` 中的策略，验证带有必需
  `package_sha256` 和 `trusted_source_id` 的 HTTPS tarball。对于企业/私有镜像，请使用此方式，而不是通过输入级别的 allow-private 开关来弱化 `source=url`。当策略配置了 Bearer 认证时，会使用固定的 `OPENCLAW_TRUSTED_PACKAGE_TOKEN` secret。
- `source=artifact`: 重用由另一个 Actions 运行上传的 tarball。

Full Release Validation 默认使用 `source=artifact`，其构建自解析后的发布 SHA。若要进行发布后证明，请传入
`package_acceptance_package_spec=openclaw@YYYY.M.PATCH`，这样相同的升级矩阵
就会改为针对已发布的 npm 包。

发布检查会针对 package/update/restart/plugin 套件调用 Package Acceptance：

```text
doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor root-managed-vps-upgrade update-restart-auth plugins-offline plugin-update plugin-binding-command-escape
```

当启用 release soak 时（`release_profile=stable` 和 `full` 时强制开启），它们还会传入：

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

对于已发布的 extended-stable 金丝雀，请设置
`package_spec=openclaw@extended-stable`。Package Acceptance 会先将该
选择器解析为精确的 tarball，然后再运行 Docker lanes。

当发布问题包含 MCP channels、cron/subagent cleanup、OpenAI web search 或 OpenWebUI 时，请使用 `suite_profile=product`。仅当你需要完整的 Docker 发布路径覆盖时，才使用 `suite_profile=full`。

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

- 纯路径或元数据逻辑：在源文件旁边添加单元测试。
- 包清单或已打包文件行为：使用 `package-dist-inventory` 或 tarball
  检查器测试。
- CLI 安装/更新行为：Docker lane 断言或 fixture。
- 已发布版本迁移行为：`published-upgrade-survivor` 场景。
- update-owned 重启行为：`update-restart-auth`。
- 注册表/包源行为：`test:docker:plugins` fixture 或 ClawHub
  fixture 服务器。
- 依赖布局或清理行为：同时断言运行时执行和文件系统边界。npm 依赖可能会在插件托管的 npm 项目中被提升，因此测试应证明会扫描/清理该项目，而不是假设只有插件包本地的 `node_modules` 树。

默认保持新的 Docker fixtures 为 hermetic。除非测试目标就是 live registry 行为，否则使用本地 fixture registry 和伪造包。

## 失败排查

先从产物身份开始：

- Package Acceptance `resolve_package` summary: source, version, SHA-256, and
  artifact name.
- Docker artifacts: `.artifacts/docker-tests/**/summary.json`,
  `failures.json`, lane logs, and rerun commands.
- Upgrade survivor summary: `.artifacts/upgrade-survivor/summary.json`,
  including baseline version, candidate version, scenario, phase timings, and
  config recipe coverage.

优先使用相同的包产物重跑失败的精确 lane，而不是重跑整个发布总流程。
