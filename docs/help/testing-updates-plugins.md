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

- 包 tarball 是完整的，包含有效的 `dist/postinstall-inventory.json`，并且不依赖解包后的仓库文件。
- 用户可以从较旧的已发布包迁移到候选包，而不会丢失配置、agents、sessions、workspaces、插件 allowlist 或 channel 配置。
- `openclaw doctor --fix --non-interactive` 负责旧版清理和修复路径。启动流程不应为过时的插件状态增加隐藏的兼容性迁移。
- 插件安装可从本地目录、git 仓库、npm 包以及 ClawHub registry 路径工作。
- 插件 npm 依赖会安装到受管理的 npm root 中，在信任前进行扫描，并在卸载时通过 npm 移除，因此 hoisted 依赖不会残留。
- 当没有任何变更时，插件更新保持稳定：安装记录、解析来源和启用状态都保持不变。

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
pnpm test:docker:plugin-update
pnpm test:docker:upgrade-survivor
pnpm test:docker:published-upgrade-survivor
```

重要 lanes：

- `test:docker:plugins` 验证插件安装冒烟、本地文件夹安装、带预装依赖的本地文件夹、带包依赖的 git 安装、npm 包依赖安装、本地 ClawHub fixture 安装、marketplace 更新行为，以及 Claude-bundle 的启用/检查。设置 `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` 可保持 ClawHub 区块的 hermetic/离线。
- `test:docker:plugin-update` 验证在 `openclaw plugins update` 期间，未变化的已安装插件不会重新安装或丢失安装元数据。
- `test:docker:upgrade-survivor` 在脏旧用户 fixture 上安装候选 tarball，运行包更新加非交互式 doctor，然后启动 loopback Gateway 并检查状态保留。
- `test:docker:published-upgrade-survivor` 先安装已发布基线，通过 baked 的 `openclaw config set` 配方进行配置，更新到候选 tarball，运行 doctor，检查旧版清理，启动 Gateway，并探测 `/healthz`、`/readyz` 和 RPC 状态。

有用的 published-upgrade survivor 变体：

```bash
OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC=openclaw@2026.4.23 \
OPENCLAW_UPGRADE_SURVIVOR_SCENARIO=versioned-runtime-deps \
pnpm test:docker:published-upgrade-survivor

OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC=openclaw@latest \
OPENCLAW_UPGRADE_SURVIVOR_SCENARIO=bootstrap-persona \
pnpm test:docker:published-upgrade-survivor
```

可用场景为 `base`、`feishu-channel`、`bootstrap-persona`、`tilde-log-path` 和 `versioned-runtime-deps`。在聚合运行中，`OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=reported-issues` 会展开为所有已报告问题形态的场景。

## 包接纳

Package Acceptance 是 GitHub 原生的包门禁。它将一个候选包解析为一个 `package-under-test` tarball，记录版本和 SHA-256，然后针对该精确 tarball 运行可复用的 Docker E2E lanes。工作流 harness 参考与包源参考是分离的，因此当前测试逻辑可以验证较旧的受信任发布版本。

候选来源：

- `source=npm`：验证 `openclaw@beta`、`openclaw@latest` 或某个精确的已发布版本。
- `source=ref`：使用所选的当前 harness 打包一个受信任的分支、tag 或 commit。
- `source=url`：验证一个带有必需 `package_sha256` 的 HTTPS tarball。
- `source=artifact`：复用另一个 Actions 运行上传的 tarball。

发布检查会使用 package/update/plugin 集合调用 Package Acceptance：

```text
doctor-switch update-channel-switch upgrade-survivor published-upgrade-survivor plugins-offline plugin-update
```

它们还会传入：

```text
published_upgrade_survivor_baselines=release-history
published_upgrade_survivor_scenarios=reported-issues
telegram_mode=mock-openai
```

这使包迁移、更新 channel 切换、过时插件依赖清理、离线插件覆盖、插件更新行为以及 Telegram 包 QA 都基于同一个已解析产物。

在发布前验证候选包时，手动运行一个 package profile：

```bash
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=package \
  -f published_upgrade_survivor_baselines=release-history \
  -f published_upgrade_survivor_scenarios=reported-issues \
  -f telegram_mode=mock-openai
```

当发布问题涉及 MCP channels、cron/subagent 清理、OpenAI web search 或 OpenWebUI 时，使用 `suite_profile=product`。仅当你需要完整的 Docker 发布路径覆盖时，才使用 `suite_profile=full`。

## 发布默认项

对于发布候选版本，默认验证栈为：

1. `pnpm check:changed` 和 `pnpm test:changed`，用于源码级回归。
2. `pnpm release:check`，用于包产物完整性。
3. Package Acceptance 的 `package` profile 或 release-check 自定义 package lanes，用于 install/update/plugin 契约。
4. 跨 OS 的发布检查，用于 OS 特定安装器、引导流程和平台行为。
5. 仅当变更面触及 provider 或托管服务行为时，才运行 live 套件。

在维护者机器上，广泛门禁和 Docker/package 产品验证应在 Testbox 中运行，除非明确在做本地验证。

## 旧版兼容性

兼容性宽容范围很窄且有时间限制：

- 截至 `2026.4.25` 的包，包括 `2026.4.25-beta.*`，在 Package Acceptance 中可以容忍已发布的包元数据缺口。
- 已发布的 `2026.4.26` 包可以对已发布的本地构建元数据 stamp 文件发出警告。
- 更晚的包必须满足现代契约。同样的缺口会失败，而不是警告或跳过。

不要为这些旧形态添加新的启动迁移。请添加或扩展 doctor 修复，然后用 `upgrade-survivor` 或 `published-upgrade-survivor` 证明它。

## 添加覆盖

当更改更新或插件行为时，请在最可能以正确原因失败的最低层添加覆盖：

- 纯路径或元数据逻辑：在源代码旁添加单元测试。
- 包清单或打包文件行为：`package-dist-inventory` 或 tarball 检查器测试。
- CLI 安装/更新行为：Docker lane 断言或 fixture。
- 已发布版本的迁移行为：`published-upgrade-survivor` 场景。
- registry/包来源行为：`test:docker:plugins` fixture 或 ClawHub fixture server。

默认保持新的 Docker fixtures 为 hermetic。除非测试目标就是 live registry 行为，否则使用本地 fixture registry 和伪造包。

## 失败排查

先从产物身份开始：

- Package Acceptance 的 `resolve_package` 摘要：来源、版本、SHA-256 和产物名称。
- Docker 产物：`.artifacts/docker-tests/**/summary.json`、`failures.json`、lane 日志和重跑命令。
- Upgrade survivor 摘要：`.artifacts/upgrade-survivor/summary.json`，包括基线版本、候选版本、场景、阶段耗时和配方步骤。

优先使用相同的包产物重跑失败的精确 lane，而不是重跑整个发布总流程。
