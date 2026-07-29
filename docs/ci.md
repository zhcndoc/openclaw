---
summary: "CI 作业图、范围门控、发布总罩，以及本地命令等价项"
title: "CI 流水线"
read_when:
  - 你需要了解某个 CI 作业为什么运行或未运行
  - 你正在调试一个失败的 GitHub Actions 检查
  - 你正在协调一次发布验证运行或重跑
  - 你正在更改 ClawSweeper 派发或 GitHub 活动转发
---

OpenClaw CI 在推送到 `main` 时运行（`Markdown` 和 `docs/**` 路径在触发时会被忽略），在每个非草稿拉取请求上运行，以及在手动分发时运行。规范的 `main` 推送是单飞的：`CI` 并发组允许一次完整的集成周期运行，而 GitHub 只保留最新的待处理推送。新的合并会替换那个待处理运行，而不会取消已经注册了 Blacksmith 矩阵的工作。拉取请求仍然会取消被取代的 head，而手动分发使用隔离的组。`preflight` 会对差异进行分类，并在只更改了无关区域时关闭昂贵的流水线。手动 `workflow_dispatch` 运行会有意绕过智能范围控制，并展开完整图谱，用于发布候选和广泛验证。Android 流水线仍通过 `include_android`（或 `release_gate` 输入）保持可选。仅发布时的插件覆盖位于单独的 [`Plugin Prerelease`](#plugin-prerelease) 工作流中，并且只会从 [`Full Release Validation`](#full-release-validation) 或显式的手动分发中运行。

## 流水线概览

| Job                                | 目的                                                                                                                                                                                                                | 运行时间                                      |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `preflight`                        | 检测变更范围并构建 CI 清单；在规范化、与 Node 相关的 `main` 分支上，在 fanout 之前刷新并维护依赖快照                                                                                                                 | 非草稿 push 和 PR 时始终运行                   |
| `security-fast`                    | 私钥检测、通过 `zizmor` 进行变更工作流审计，以及生产锁文件审计                                                                                                                                                | 非草稿 push 和 PR 时始终运行                   |
| `pnpm-store-warmup`                | 为 pull request 和手动运行预热由 lockfile 固定的 Actions 缓存，同时不阻塞 Linux Node 分片                                                                                                                         | 在 main 之外选择 Node 或 docs-check 线路时运行 |
| `build-artifacts`                  | 构建 `dist/`、Control UI、已构建 CLI 冒烟检查、启动内存，以及嵌入式已构建制品检查                                                                                                                               | 与 Node 相关的变更                            |
| `control-ui-i18n`                  | 验证生成的 Control UI 语言包、元数据和翻译记忆；自动运行时为建议性，手动发布 CI 时为阻塞性                                                                                                                     | 与 Control UI i18n 相关的变更和手动 CI        |
| `checks-fast-core`                 | 快速 Linux 正确性线路：抑制基线 max-lines 递增、bundled + protocol、Bun 启动器，以及 CI 路由 fast 任务                                                                                                         | 与 Node 相关的变更                            |
| `qa-smoke-ci-profile`              | 自包含、平衡的自动 QA Smoke 覆盖集的一部分；完整的分类覆盖仍可通过显式 QA 配置文件获得                                                                                                                         | 与 Node 相关的变更                            |
| `checks-fast-contracts-plugins-*`  | 两个加权插件契约分片                                                                                                                                                                                                  | 与 Node 相关的变更                            |
| `checks-fast-contracts-channels-*` | 两个加权通道契约分片                                                                                                                                                                                                  | 与 Node 相关的变更                            |
| `checks-node-*`                    | Pull request 上对变更目标 Node 测试；在 `main`、手动、发布和广泛回退运行中执行完整核心分片                                                                                                                       | 与 Node 相关的变更                            |
| `check-*`                          | 分片化的 main 本地门禁等价项：guards、临时 npm-lock 验证、bundled-channel 配置元数据、生产类型、lint、依赖、测试类型                                                                                             | 与 Node 相关的变更                            |
| `check-additional-*`               | 边界检查条带（包括 prompt 快照漂移）、会话访问器/转录读取器/SQLite 事务边界、扩展 lint 组、包边界编译/canary，以及运行时拓扑架构                                                     | 与 Node 相关的变更                            |
| `checks-node-compat-node22`        | Node 22 兼容性构建和冒烟线路                                                                                                                                                                                          | 发布的手动 CI 调度                            |
| `check-docs`                       | 文档格式化、lint 和断链检查                                                                                                                                                                                           | 文档变更（PR 和手动调度）                     |
| `native-i18n`                      | 在源代码 PR 上验证原生源码提取和本地化安全性；在生成的 PR 和手动 CI 上强制完整的翻译/平台生成一致性                                                                                                            | 与原生 i18n 相关的变更                         |
| `skills-python`                    | 供 Python 支持的技能使用的 Ruff + pytest                                                                                                                                                                              | 与 Python 技能相关的变更                      |
| `checks-windows`                   | Windows 特有的进程/路径测试，以及共享运行时导入说明符回归测试                                                                                                                                                       | 与 Windows 相关的变更                         |
| `macos-node`                       | 聚焦的 macOS TypeScript 测试：launchd、Homebrew、运行时路径、打包脚本、进程组包装器                                                                                                                               | 与 macOS 相关的变更                           |
| `macos-swift`                      | macOS 应用的 Swift lint 和构建，以及应用和共享 OpenClawKit 包的测试                                                                                                                                                 | 与 macOS 相关的变更                           |
| `ios-build`                        | Xcode 项目生成以及 iOS 应用模拟器构建                                                                                                                                                                                | iOS 应用、共享 app kit，或 Swabble 变更        |
| `android`                          | 两种 flavor 的 Android 单元测试，以及一个 debug APK 构建                                                                                                                                                            | 与 Android 相关的变更                        |
| `openclaw/ci-gate`                 | 最终汇总：要求 preflight 和 security；仅接受那些由清单禁用的下游线路的跳过                                                                                                                                        | 每次非草稿 CI 运行                             |
| `test-performance-agent`           | 独立工作流：在可信活动之后，每日进行 Codex 慢测试优化                                                                                                                                                               | 主 CI 成功或手动调度                           |
| `openclaw-performance`             | 独立工作流：通过 mock-provider、deep-profile 和 GPT 5.6 live 线路，按日/按需生成 Kova 运行时性能报告                                                                                                           | 定时和手动调度                                 |

独立的 Periphery 工作流会强制 iOS 和 macOS 应用保持零死代码发现。共享的 OpenClawKit 工作流会并行扫描两个消费者，并且只有当 Periphery 在两个构建中都发出相同的 Swift USR 时，才会报告一个声明。其生成的 `OpenClawProtocol/GatewayModels.swift` schema 合同被保留为生成器拥有的代码，而不是被视为应用本地死代码。

## 先失败顺序

1. `preflight` 决定了哪些 lane 实际存在。`docs-scope` 和 `changed-scope` 逻辑是这个作业中的步骤，而不是独立作业。规范化的 `main` 会立即开始，但其并发组一次只允许一个完整运行，并会将后续推送合并为一个最新的待处理运行。与 Node 相关的 `main` 推送还会在下游作业挂载 key 之前，在这里串行化唯一的依赖磁盘写入者及其大小维护；Blacksmith 可能只会让稍后的工作流运行暴露一个新提交，因此同一运行中的消费者会保留带标记检查的本地回退方案。
2. `security-fast`、`check-*`、`check-additional-*`、`check-docs` 和 `skills-python` 会快速失败，不必等待更重的 artifact 和平台矩阵作业。
3. `build-artifacts` 和区域设置检查会与快速的 Linux lane 并行。Control UI 和原生应用源代码 PR 会排除生成的区域设置快照/资源；它们串行化的刷新工作流会在后台修复并自动合并隔离的生成 PR。源代码 CI 仍会阻止过期的源清单和不安全的本地化调用。生成的 PR、手动 CI 和发布准备会强制要求完整的翻译/平台生成一致性。规范化的 `release/YYYY.M.PATCH` 分支可以将发布准备中的区域设置修复与其他生成的发布输出一并包含。
4. 更重的平台和运行时 lane 随后展开：`checks-fast-core`、`checks-fast-contracts-plugins-*`、`checks-fast-contracts-channels-*`、`checks-node-*`、`checks-windows`、`macos-node`、`macos-swift`、`ios-build` 和 `android`。
5. `openclaw/ci-gate` 会等待所有被选中的 lane。Preflight 和 security 必须成功；下游作业只有在清单未选中它们时才可跳过。任何失败或被取消的已选 lane 都会使聚合失败。

合并协调器可以对同一个 pull request head 复用一个已认证且成功的 `openclaw/ci-gate`，最长可达 24 小时。这样可以避免在与无关的 `main` 变更之后重写贡献者分支。这个可复用结果并不能替代针对当前 `main` 的、由 App 拥有的独立严格 test-merge 检查。对于该未变化的 head，在 freshness 窗口内，后续的 pending 或 failed rerun 不会抹去先前的成功结果。

默认分支规则集要求使用由 GitHub Actions 拥有的 `openclaw/ci-gate` 检查。仓库维护者和管理员拥有经过审计的 break-glass 绕过权限，仅用于签名的直接 fast-forward 落地；组织规则集仍会阻止删除和非 fast-forward 更新。常规的 pull request 合并应继续使用 gate，而不是绕过失败的 CI。单独的、由 App 拥有的严格 test-merge 检查仍然会将 head 绑定到当前的 `main`。

当更新的 head 落地时，GitHub 可能会将被替代的 pull request 作业标记为 `cancelled`。除非同一 PR 的最新运行也失败，否则应将其视为 CI 噪声。规范化的 `main` 运行在被接纳后不会被取消；当合并流量到来时，GitHub 只会用最新的 tip 替换较早的待处理运行。矩阵作业使用 `fail-fast: false`，而 `build-artifacts` 会直接报告嵌入的 channel、core-support-boundary 和 gateway-watch 失败，而不是排队运行很小的 verifier 作业。自动 CI 并发 key 采用版本号（`CI-v7-*`），因此旧队列组中的 GitHub 侧僵尸任务不会无限期阻塞更新的 main 运行。手动全套运行使用 `CI-manual-v1-*`，并且不会取消正在进行的运行。plugin-list 的启动内存保护会将自托管 Blacksmith Linux 的上限保持在 350 MiB，并允许 GitHub 托管 Linux 使用 425 MiB，因为在相同已构建 CLI 下，其 RSS 基线更高。

使用 `pnpm ci:timings`、`pnpm ci:timings:recent`，或 `node scripts/ci-run-timings.mjs <run-id>` 来汇总来自 GitHub Actions 的总耗时、排队时间、最慢作业、失败情况，以及 `pnpm-store-warmup` 的 fanout barrier。工作流内的 `ci-timings-summary` 作业存在于 `ci.yml` 中，但目前已禁用（`if: false`）；请改为在本地运行 timing helper。对于构建耗时，请检查 `build-artifacts` 作业中的 `Build dist` 步骤：`pnpm build:ci-artifacts` 会打印 `[build-all] phase timings:`，并包含 `ui:build`；该作业还会上传 `startup-memory` artifact。

## PR 上下文与证据

外部贡献者的 PR 会从 `.github/workflows/real-behavior-proof.yml` 运行一个 PR 上下文与证据门控。该工作流检出受信任的工作流修订版本（`github.workflow_sha`），并且仅评估 PR 正文；它不会执行来自贡献者分支的代码。

该门控适用于 PR 作者不是仓库所有者、成员、协作者或 bot 的情况。若 PR 正文包含作者撰写的 `What Problem This Solves` 和 `Evidence` 章节，则通过。证据可以是定向测试、CI 结果、截图、录屏、终端输出、实时观察、脱敏日志或工件链接。正文提供意图和有用的验证；审阅者会检查代码、测试和 CI 以评估正确性。

当检查失败时，请更新 PR 正文，而不是再推送一次代码提交。

## 范围与路由

范围逻辑位于 `scripts/ci-changed-scope.mjs`，并由 `src/scripts/ci-changed-scope.test.ts` 中的单元测试覆盖。手动派发会跳过变更范围检测，并让 preflight 清单表现得好像所有有范围的区域都已变更。

单独的 iOS 和 macOS Periphery 工作流会强制执行零发现死代码策略。每个工作流仅在非草稿拉取请求触及其原生扫描范围时运行，或在手动派发时运行。

- **CI workflow edits** 会验证 Node CI 图谱、工作流 lint 检查以及 Windows 车道（`ci.yml` 会执行它），但不会仅因这些修改就强制触发 iOS、Android 或 macOS 原生构建；这些平台车道仍然只会对平台源代码变更进行范围限定。
- **Workflow Sanity** 会对所有工作流 YAML 文件运行 `actionlint`、`zizmor`、复合 action 插值守卫以及冲突标记守卫。PR 范围内的 `security-fast` 作业也会对变更的工作流文件运行 `zizmor`，以便工作流安全问题能在主 CI 图谱中尽早失败。
- **`main` 上的文档推送** 会由独立的 `Docs` 工作流检查，使用与 CI 相同的 ClawHub 文档镜像，因此混合代码+文档的推送不会同时再排队 CI 的 `check-docs` 分片。拉取请求和手动 CI 在文档变更时仍会从 CI 运行 `check-docs`。
- **TUI PTY** 会在用于 TUI 变更的 `checks-node-core-runtime-tui-pty` Linux Node 分片中运行。该分片使用 `OPENCLAW_TUI_PTY_INCLUDE_LOCAL=1` 运行 `test/vitest/vitest.tui-pty.config.ts`，因此同时覆盖确定性的 `TuiBackend` 固件车道，以及较慢的 `tui --local` 冒烟测试，后者只会 mock 外部模型端点。
- **CI 仅路由编辑、fast task 直接运行的那小部分 core-test 固件，以及窄范围的插件契约辅助编辑** 使用快速的仅 Node 清单路径：`preflight`、`security-fast`，以及变更所触及的所有 fast 车道——一个单独的 `checks-fast-core` CI 路由任务、两个插件契约分片，或两者兼有。该路径会跳过构建产物、Node 22 兼容性、channel 契约、完整 core 分片、bundled-plugin 分片以及额外的守卫矩阵。
- **Windows Node 检查** 的范围限定于 Windows 特定的进程/路径包装器、npm/pnpm/UI runner 辅助工具、包管理器配置，以及执行该车道的 CI 工作流表面；无关的源代码、插件、install-smoke 和仅测试变更仍停留在 Linux Node 车道上。

最慢的 Node 测试家族被拆分或均衡分配，以便每个作业保持较小规模，而不会过度占用 runner：

- Plugin contracts and channel contracts each run as two weighted Blacksmith-backed shards with the standard GitHub runner fallback.
- Core unit fast/support lanes run separately; core runtime infra splits into process, shared, hooks, secrets, and three cron domain shards.
- Auto-reply runs as balanced workers, with the reply subtree split into agent-runner, commands, dispatch, session, and state-routing shards.
- Agentic gateway/server (control-plane) configs split across chat, auth, model, HTTP/plugin, runtime, and startup lanes instead of waiting on built artifacts.
- Normal CI packs only isolated infra include-pattern shards into deterministic bundles of at most 64 test files, reducing the Node matrix without merging non-isolated command/cron, stateful agents-core, or gateway/server suites. Heavy fixed suites stay on 8 vCPU while the bundled and lower-weight lanes use 4 vCPU.
- Pull requests on the canonical repository reuse the changed-test resolver against the synthetic merged-tree diff. Precise changes run one targeted Node job; each selected test file gets its own process so stateful suite isolation remains intact. The planner combines sibling tests with import-graph dependents and falls back to the existing 14-job compact full-suite plan for workspace package, package/lockfile, shared harness, split-config, renamed, or deleted changes, public extension-contract changes, tests with special shard setup, partially resolved or empty targets, oversized path or target plans, and planner errors. Targeted plans always retain the full built-artifact boundary gate because its repository scanners cannot be derived from imports. `main` pushes run the same full compact suite: pending intermediate push events can be coalesced, so the newest surviving run must validate the complete integration tree rather than only its final single-push diff. Manual dispatches and release gates retain the full named per-shard matrix.
- The full Node matrix admits the consistently slow serial tooling, auto-reply command shards, and broad core-fast cache writer first. This keeps the 28-job cap while preventing critical-path work and the next run's transform seed from slipping into a later wave.
- Broad browser, QA, media, and miscellaneous plugin tests use their dedicated Vitest configs instead of the shared plugin catch-all. Include-pattern shards record timing entries using the CI shard name, so `.artifacts/vitest-shard-timings.json` can distinguish a whole config from a filtered shard.
- Linux Node shard jobs persist Vitest's experimental filesystem module cache through the upstream Actions cache API, which Blacksmith transparently accelerates on its runners. Every CI shard is restore-only and unpacks the protected seed into its own runner-local root; the shard wrapper then gives concurrent Vitest processes separate live subdirectories. Only the non-cancelling daily or explicitly dispatched warmer saves a new immutable archive, so pull requests cannot publish transforms or mint per-PR cache families. A transform-input fingerprint clears incompatible lockfile, package, tsconfig, and Vitest-config generations. The protected writer scans and prunes its restored cache to 75% after it exceeds 2 GiB. Vitest hashes module id, source content, environment, and resolved transform config, so ordinary partial source changes keep unchanged entries warm while changed modules miss safely. Coarse restore prefixes bridge workflow runs; normal Actions cache LRU and inactivity eviction bound old immutable archives.
- Trusted Linux Node jobs also bind the pnpm store and `node_modules` from one protected dependency disk per supported Node line. Package manifests, install settings, runner platform, and the exact Node patch stay out of the disk key; an exact runtime and install-input fingerprint decides whether a job reuses the tree or reinstalls and refreshes the same disk. Manifests are canonicalized before hashing. The audited direct root hooks retain only pnpm's install lifecycle scripts, so formatting and ordinary test/build script edits keep the warm dependency tree; unaudited lifecycle-hook drift fails closed until its source inputs join the fingerprint contract. Dependency, package-manager, hook-source, and lockfile changes always invalidate the snapshot. A matching fingerprint is necessary but not sufficient: setup also checks the importer archive and manifest checksums, then verifies registry-backed lockfile dependencies retained by postinstall against the package manifests Node resolves from their importers. Missing or stale importer content falls back to a fresh install instead of serving the root hoist. A pull request whose read-only snapshot is unusable detaches the workspace bind and installs into runner-local storage, avoiding slow writes to a clone it cannot publish. Sticky cold installs disable pnpm's inner fetch retries and make up to three bounded full-install attempts from the progressively warmed store; a timeout remains a failure. After a content-validated restore or frozen-lockfile install, setup disables pnpm's redundant pre-run dependency check: the repository intentionally prunes plugin-local `node_modules`, which pnpm otherwise treats as stale and repairs through unsafe concurrent implicit installs during shard fanout. Canonical main preflight is the sole writer and measures the store on every refresh, running `pnpm store prune` only after retired package versions push it above 8 GiB. Blacksmith snapshot publication is asynchronous even after a writer job completes, so the first run after a fresh key or fingerprint can remain cold; later content-validated exact-marker restores are the rollout proof. Required CI jobs and pull requests get disposable clones, so dependency changes do not create new disks, competing snapshots, or a cache lock that can cancel builds.
- Node shard and build-artifact jobs also restore Node's portable on-disk compile cache through immutable Actions caches. Independent `test` and `build` namespaces prevent their writers from replacing each other's archives: the scheduled test warmer owns the protected test seed, while `build-artifacts` may publish at most one protected build archive per UTC day from trusted `main` pushes. PR and ordinary test jobs only read protected snapshots, so feature-branch bytecode never enters the shared seed and PR traffic creates no cache archives. This reuses V8 bytecode for Node-loaded orchestration, build tooling, and external dependencies across different checkout paths, including when only part of the source graph changes. Vitest child processes disable an inherited compile cache because coverage can be enabled inside dynamic configs and V8 coverage can lose source-position precision when scripts are deserialized from bytecode.
- The build-artifact job also persists content-fingerprinted `build-all` step outputs. CI's self-built plugin SDK declarations hash the complete repository-owned TypeScript/JSON source graph, exclude installed and generated directories, and restore both flat declarations and package bridges after `tsdown` clears `dist`. Documentation, workflow, plugin, and other changes outside that graph can reuse the declaration snapshot; source changes rebuild it before the export gate runs.
- Full declaration builds split `tsdown` into AI, workspace-package, and unified groups. Each group caches declarations only, then still rebuilds runtime JavaScript before restoring those declarations. Core or plugin changes therefore invalidate only the large unified graph, while workspace-package changes conservatively invalidate every dependent declaration group. Public full builds generally use an immutable Actions cache; coarse restore keys seed partial changes, per-group content fingerprints reject stale data, and GitHub's cache quota evicts old generations. The weekly Node 22 lane instead publishes a 14-day artifact after successful `main` runs and restores only artifacts whose immutable producer identity resolves to that workflow on `main`, avoiding quota churn without allowing PR code to write a shared cache. Private-QA declarations are never persisted in Actions caches because cache namespaces are not confidentiality boundaries.
- `check-additional-*` stripes the supplemental boundary guard list (`scripts/run-additional-boundary-checks.mjs`) into one prompt-heavy shard (`check-additional-boundaries-a`, which includes the Codex prompt snapshot drift check) and one combined shard for the remaining stripes (`check-additional-boundaries-bcd`), each running independent guards concurrently and printing per-check timings. Package-boundary compile/canary work stays together, and runtime topology architecture runs separately from the gateway watch coverage embedded in `build-artifacts`.
- On the 32-vCPU self-hosted build runner, Gateway watch, channel tests, and the core support-boundary shard start together inside `build-artifacts` after `dist/` and `dist-runtime/` are already built. GitHub-hosted fallback runs keep Gateway watch serial so low-core contention cannot consume its readiness deadline.

一旦被接纳，canonical Linux CI 允许最多 28 个并发 Node 测试作业，而较小的 fast/check 车道则允许 12 个；Windows 和 Android 保持在两个，因为这些 runner 池更窄。紧凑的整配置批次使用 120 分钟的批次超时，而 include-pattern 组共享同一个受限作业预算。

Android CI runs both `testPlayDebugUnitTest` and `testThirdPartyDebugUnitTest` and then builds the Play debug APK. The third-party flavor has no separate source set or manifest; its unit-test lane still compiles the flavor with the SMS/call-log BuildConfig flags, while avoiding a duplicate debug APK packaging job on every Android-relevant push. Each current Gradle task has one protected sticky disk; PR jobs use disposable clones, while protected runs refresh content-addressed Gradle entries in place.

Blacksmith sticky-disk keys are deliberately bounded by supported runtime or task dimensions, never PR number, commit, run, branch, or dependency hash. Runtime transform and compile caches use Actions cache instead of sticky disks because immutable archives expose verifiable restore/save results and avoid mutable snapshot-promotion failures. After a sticky key-version migration, add only the exact obsolete key, architecture, and region identities to `.github/retired-sticky-disks.json`, dispatch `Sticky Disk Cleanup` from `main` with the same dimensions and confirmation, verify deletion, then remove those entries. The workflow routes ARM identities to an ARM runner, rejects runner-region mismatches, uses Blacksmith's exact-key deletion action, and never deletes Docker builder caches or wildcard prefixes. Actions cache archives use normal LRU and inactivity eviction.

The `check-dependencies` shard runs production Knip dependency, unused-file, and unused-export checks. The unused-file guard fails when a PR adds a new unreviewed unused file or leaves a stale allowlist entry, while preserving intentional dynamic plugin, generated, build, live-test, and package bridge surfaces that Knip cannot resolve statically. The unused-export guard excludes test-support files and fails on every unused production export; intentional dynamic consumers must be modeled in `config/knip.config.ts`. Historical targets run the export guard when they provide it and retain their older dead-code fallback otherwise.

## ClawSweeper 活动转发

`.github/workflows/clawsweeper-dispatch.yml` 是从 OpenClaw 仓库活动到 ClawSweeper 的目标端桥接。它不会检出或执行不受信任的 pull request 代码。该工作流会使用 `CLAWSWEEPER_APP_PRIVATE_KEY` 创建一个 GitHub App token，然后将精简的 `repository_dispatch` 负载派发到 `openclaw/clawsweeper`。

该工作流有四条流水线：

- `clawsweeper_item`：用于精确的 issue 和 pull request 审查请求；
- `clawsweeper_comment`：用于 issue 评论中的显式 ClawSweeper 命令；
- `clawsweeper_commit_review`：用于 `main` push 上的提交级审查请求；
- `github_activity`：用于 ClawSweeper 代理可能检查的一般 GitHub 活动。

`github_activity` 流水线仅转发规范化的元数据：事件类型、动作、actor、仓库、条目编号、URL、标题、状态，以及在存在时评论或审查的简短摘录。它有意避免转发完整 webhook 正文。`openclaw/clawsweeper` 中接收的工作流是 `.github/workflows/github-activity.yml`，它会把规范化事件发布到 OpenClaw Gateway hook，供 ClawSweeper 代理使用。

一般活动是观察，而不是默认投递。ClawSweeper 代理会在提示中接收 Discord 目标，并且应当只在事件出乎意料、可执行、有风险或对运维有用时发布到 `#clawsweeper`。常规打开、编辑、bot churn、重复 webhook 噪音以及正常的审查流量都应返回 `NO_REPLY`。

将 GitHub 标题、评论、正文、审查文本、分支名和提交消息在整个路径中都视为不受信任的数据。它们是用于摘要和分诊的输入，而不是用于工作流或代理运行时的指令。

Barnacle 将带有 bug 标签的 issue 视为待验证候选项，而不是因不活跃而关闭的候选项。它可以添加 `stale` 标签，从而派发一次精确的 ClawSweeper 审查，但不能关闭该 issue。随后，ClawSweeper 可能会应用有证据支持的解决方案；当前 `main` 上已证实的修复会将其关闭为已完成，而当前仍存在问题或结论不明确的 bug 则保持打开状态。stale 工作流还会审计最近的关闭事件，并在 Barnacle 身份将 bug 关闭为 `not_planned` 时失败。

## 手动派发

手动 CI 派发运行与常规 CI 相同的作业图，但会强制启用每个非 Android 范围的任务通道：Linux Node 分片、bundled-plugin 分片、插件和 channel contract 分片、Node 22 兼容性、`check-*`、`check-additional-*`、构建产物冒烟检查、文档检查、Python skills、Windows、macOS、iOS 构建，以及 Control UI/原生应用国际化。自动源代码 PR 会验证原生提取清单和 Android/Apple 本地化安全性，但不要求在同一个 PR 中包含已翻译或平台生成的输出。串行化的 Native App Locale Refresh 工作流会在一个隔离的 PR 中重新构建这些产物，并在必需检查通过后启用精确头提交自动合并。对于生成产物 PR、手动 CI、Full Release Validation 和发布准备，完整原生对等性仍然是阻塞性要求。Control UI 本地化对等性在自动 PR 和 `main` 运行中仍仅供参考，而在手动/发布 CI 中是阻塞性要求。独立的手动 CI 派发仅在使用 `include_android=true` 时运行 Android（`release_gate` 输入也会强制启用 Android）；完整发布总流程通过传入 `include_android=true` 来启用 Android。插件预发布静态检查、仅限发布的 `agentic-plugins` 分片、完整扩展批量扫描，以及插件预发布 Docker 通道均不包含在 CI 中。Docker 预发布套件仅在 `Full Release Validation` 启用发布验证门控并派发独立的 `Plugin Prerelease` 工作流时运行。

PR max-lines 检查会从已检出的合成合并树中推导基线，并验证其头父提交与事件头提交一致。手动运行使用唯一的并发组，因此同一引用上的另一个 push 或 PR 运行不会取消某个 release-candidate 完整套件。可选的 `target_ref` 输入允许受信任的调用者使用所选派发 ref 上的工作流文件，将该作业图运行在分支、标签或完整 commit SHA 上；max-lines 基线会与该运行所解析出的默认分支 head 的目标合并基点进行比较。`release_gate` 输入是容量受阻 PR CI 的精确 SHA 维护者回退方案：它要求 `target_ref` 为完整 commit SHA，且与已派发分支 head 匹配，并要求 `pull_request_number` 用于标识其合并树将被验证的打开状态 PR。

```bash
gh workflow run ci.yml --ref release/YYYY.M.PATCH
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

Gateway extended-stable 从 `extended-stable/YYYY.M.33` 运行 npm 预检、Full Release Validation 和插件 npm 发布；核心发布会使用这三个运行 ID 以及验证尝试。`release-ci/*` 证据无效，因为发布流程会将每次运行绑定到规范分支和发布 SHA。该标签会发布 Gateway 镜像以及仅有的 `extended-stable*` 别名；此路径会跳过常规编排器及其 ClawHub、原生应用、GitHub Release、网站和私有 dist-tag 发布面。有关命令和恢复方法，请参阅[每月 Gateway extended-stable 发布](/reference/RELEASING#monthly-gateway-extended-stable-publication)。

## 运行器

| Runner                          | 作业                                                                                                                                                                                                                                                                              |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                  | `security-fast`、手动 CI 触发以及非 canonical 仓库回退、QA Smoke 聚合、CodeQL 安全与质量扫描、workflow-sanity、labeler、auto-response、独立的 Docs 工作流，以及整个 Install Smoke 工作流                                |
| `blacksmith-4vcpu-ubuntu-2404`  | `preflight`、`pnpm-store-warmup`、`native-i18n`、除 QA Smoke CI 外的 `checks-fast-core`、plugin/channel contract 分片、大多数打包的/低负载 Linux Node 分片、除 `check-lint` 外的 `check-*` 轨道、选定的 `check-additional-*` 分片、`check-docs`，以及 `skills-python` |
| `blacksmith-8vcpu-ubuntu-2404`  | 保留的重型 Linux Node 套件、串行 Chromium/Vite `checks-ui-e2e` 轨道、边界/扩展密集型 `check-additional-*` 分片，以及 `android`                                                                                                                              |
| `blacksmith-16vcpu-ubuntu-2404` | CI 和 Testbox 中自动 QA Smoke CI 分片、`build-artifacts`，以及 `check-lint`（对 CPU 敏感到 8 vCPU 的成本高于其节省）                                                                                                                                  |
| `blacksmith-8vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                                                                  |
| `blacksmith-6vcpu-macos-15`     | `openclaw/openclaw` 上的 `macos-node`；fork 会回退到 `macos-15`                                                                                                                                                                                                                |
| `blacksmith-12vcpu-macos-26`    | `openclaw/openclaw` 上的 `macos-swift` 和 `ios-build`；fork 会回退到 `macos-26`                                                                                                                                                                                               |

## 运行器注册预算

OpenClaw 当前的 GitHub runner-registration bucket 在 `ghx api rate_limit` 中报告每 5 分钟有 10,000 次自托管 runner 注册。每次调优前都要重新检查 `actions_runner_registration`，因为 GitHub 可能会更改这个 bucket。该限制由 `openclaw` 组织中所有 Blacksmith runner 注册共享，因此再添加一个 Blacksmith 安装也不会带来新的 bucket。

将 Blacksmith 标签视为突发控制的稀缺资源。只负责路由、通知、汇总、选择分片或运行短时 CodeQL 扫描的作业，除非已测得明确的 Blacksmith 特定需求，否则应继续使用 GitHub 托管运行器。任何新的 Blacksmith matrix、更大的 `max-parallel` 或高频工作流，都必须展示其最坏情况下的注册次数，并将组织级目标控制在实时 bucket 的约 60% 以下。按当前 10,000 次注册的 bucket 计算，这意味着 6,000 次注册的运行目标，为并发仓库、重试和突发重叠留出余量。

已更改目标的 PR 方案将常见的 Node 测试突发从 14 次 Blacksmith 注册减少到 1 次。广泛风险的 PR 仍保留 14 次注册的紧凑回退方案，因此最坏情况不会增加。

Canonical 仓库的 CI 将 Blacksmith 保持为正常 push 和 pull-request 运行的默认运行器路径。`workflow_dispatch` 和非 canonical 仓库运行使用 GitHub 托管运行器，但正常的 canonical 运行目前不会探测 Blacksmith 队列健康状况，也不会在 Blacksmith 不可用时自动回退到 GitHub 托管标签。

## 表面棘轮

两个仅缩减预算保护配置表面。两者在增长时都会使 CI 失败，直到在同一个 PR 中有意识地更新预算文件；并且当清理工作降低实际数量时，两者都要求向下收紧棘轮。

- `config/env-var-count-budget.txt` 限制生产源码中 `src/`、`packages/` 和 `extensions/` 下不同 `OPENCLAW_*`
  名称的数量（排除测试和 QA Lab）。通过 `node scripts/check-env-var-count.mjs` 检查。
  移除环境变量：在同一个 PR 中降低该数字。新增一个则是一次配置表面决策——请在 PR 正文中说明理由。
- `docs/.generated/config-baseline.counts.json` 限制按类型（core/channel/plugin）
  的 `openclaw.json` schema 条目数量。通过
  `pnpm config:docs:check` 检查；在任何 schema 变更后，使用 `pnpm config:docs:gen` 重新生成。

## 本地等价命令

```bash
pnpm changed:lanes                            # 检查 origin/main...HEAD 的本地变更分支分类器
pnpm check:changed                            # 智能本地检查门禁：按边界分支对变更的格式化/typecheck/lint/guards 进行检查
pnpm check                                    # 快速本地门禁：prod tsgo + 分片 lint + 并行快速 guards
pnpm check:test-types
pnpm check:timed                              # 与上面相同的门禁，但包含各阶段耗时
pnpm build:strict-smoke
pnpm check:architecture
pnpm test:gateway:watch-regression
OPENCLAW_TUI_PTY_INCLUDE_LOCAL=1 node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts
pnpm test                                     # vitest 测试
pnpm test:changed                             # 便宜的智能变更 Vitest 目标
pnpm test:ui                                  # Control UI 单元/浏览器测试套件
pnpm ui:i18n:check                            # 生成的 Control UI 本地化完整性检查（发布门禁）
pnpm native:i18n:baseline                     # 更新源代码维护的原生提取清单
pnpm native:i18n:verify                       # 源清单 + Android/Apple 本地化安全检查
pnpm native:i18n:check                        # 严格的已翻译/平台生成完整性检查（发布门禁）
pnpm test:channels
pnpm test:contracts:channels
pnpm check:docs                               # 文档格式 + lint + 损坏链接检查
pnpm build                                    # 当 CI 产物/烟雾检查重要时构建 dist
pnpm ios:build                                # 生成并构建 iOS 应用项目
pnpm ci:timings                               # 汇总最近一次 origin/main 推送的 CI 运行耗时
pnpm ci:timings:recent                        # 比较最近成功的 main CI 运行
node scripts/ci-run-timings.mjs <run-id>      # 汇总总耗时、排队耗时和最慢的作业
node scripts/ci-run-timings.mjs --latest-main # 忽略 issue/comment 噪声并选择 origin/main 推送的 CI
node scripts/ci-run-timings.mjs --recent 10   # 比较最近成功的 main CI 运行
pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json
pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json
pnpm test:startup:memory
pnpm test:extensions:memory -- --json .artifacts/openclaw-performance/source/mock-provider/extension-memory.json
pnpm perf:kova:summary --report .artifacts/kova/reports/mock-provider/report.json --output .artifacts/kova/summary.md
```

## OpenClaw 性能

`OpenClaw Performance` 是产品/运行时性能工作流。它会在 `main` 上每天运行，也可以手动派发：

```bash
gh workflow run openclaw-performance.yml --ref main -f profile=diagnostic -f repeat=3
gh workflow run openclaw-performance.yml --ref main -f profile=smoke -f repeat=1 -f deep_profile=true -f live_openai_candidate=true
gh workflow run openclaw-performance.yml --ref main -f target_ref=v2026.5.2 -f profile=diagnostic -f repeat=3
```

手动派发通常会基准测试工作流所指向的 ref。将 `target_ref` 设置为某个发布标签或另一分支，以使用当前工作流实现进行基准测试。已发布报告路径和最新指针以被测试的 ref 为键，每个 `index.md` 都会记录被测试的 ref/SHA、工作流 ref/SHA、Kova ref、profile、lane auth 模式、模型、重复次数和场景过滤器。

该工作流会从固定版本中安装 OCM，并从 `openclaw/Kova` 中安装 Kova，使用固定的 `kova_ref` 输入，然后运行三条 lane：

- `mock-provider`: 针对本地构建运行时的 Kova 诊断场景，使用确定性的假 OpenAI 兼容认证。
- `mock-deep-profile`: 针对启动、网关和 agent-turn 热点进行 CPU/heap/trace 性能分析。在计划任务中运行，或在派发时设置 `deep_profile=true` 运行。
- `live-openai-candidate`: 一次真实的 OpenAI `openai/gpt-5.6-luna` agent turn；当 `OPENAI_API_KEY` 不可用时会跳过。在计划任务中运行，或在派发时设置 `live_openai_candidate=true` 运行。

在 Kova 通过后，`mock-provider` lane 还会运行 OpenClaw 原生源代码探测：默认、跳过 channel、internal-hook 和 fifty-plugin 启动场景下的网关启动时间和内存；捆绑插件导入 RSS、重复的 mock-OpenAI `channel-chat-baseline` 问候循环、针对已启动网关的 CLI 启动命令，以及 SQLite 状态 smoke 性能探测。当被测试 ref 对应的上一份已发布 mock-provider 源代码报告可用时，源代码摘要会将当前 RSS 和 heap 值与该基线进行比较，并将较大的 RSS 增长标记为 `watch`。源代码探测的 Markdown 摘要位于报告包中的 `source/index.md`，其原始 JSON 与之相邻。

每条 lane 都会上传其完整的 GitHub artifact，包括 CPU、heap、trace 和压缩后的诊断包。一个单独的发布器作业会下载并验证这些 artifact，然后生成一个短期的 ClawSweeper GitHub App token，该 token 仅限于 `openclaw/clawgrit-reports` 的内容权限，并且只会将其传递给 Git push 步骤。它会在 `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/` 下提交 `report.json`、`report.md`、`index.md`、源探测 artifact 以及 bundle 元数据/校验和；完整的诊断归档仍保留在关联的 Actions artifact 中。发布器在尝试推送之前，会拒绝任何超过 50 MB 的报告文件。当前的 tested-ref 指针是 `openclaw-performance/<tested-ref>/latest-<lane>.json`。计划运行和 `profile=release` 派发如果 app-token 创建或报告发布失败，则会失败。非 release 的手动派发会在认证或发布失败时将发布视为建议性操作，并保留 GitHub artifact。上一份源基线会从公共报告仓库匿名获取，因此成功获取基线并不能证明发布器认证有效。

## 完整发布验证

`Full Release Validation` 是用于“在发布前运行一切”的手动总控工作流。它接受分支、标签或完整 commit SHA，并用该目标触发手动的 `CI` 工作流（包括 Android），触发 `Plugin Prerelease` 以进行仅发布用的插件/包/静态/Docker 证明，针对目标 SHA 触发 `OpenClaw Performance`，并触发 `OpenClaw Release Checks` 以执行安装冒烟测试、包验收、跨 OS 包检查、QA Lab 一致性、Matrix、Telegram，以及受门控的 Discord、WhatsApp 和 Slack 线路（可选通过 `run_maturity_scorecard` 渲染建议性成熟度评分卡）。稳定版和完整配置文件始终包含详尽的 live/E2E 和 Docker 发布路径 soak 覆盖；beta 配置文件可以通过 `run_release_soak=true` 选择启用。规范的包 Telegram E2E 运行在 Package Acceptance 内，因此完整候选不会启动重复的 live poller。发布后，传入 `release_package_spec` 即可在 release checks、Package Acceptance、Docker、跨 OS 和 Telegram 中复用已发布的 npm 包，而无需重新构建。仅将 `npm_telegram_package_spec` 用于有针对性的已发布包 Telegram 重新运行。Codex 插件 live 包线路默认使用相同的已选状态：已发布的 `release_package_spec=openclaw@<tag>` 会派生出 `codex_plugin_spec=npm:@openclaw/codex@<tag>`，而 SHA/artifact 运行则会从所选 ref 打包 `extensions/codex`。对于自定义插件来源，例如 `npm:`、`npm-pack:` 或 `git:` 规格，请显式设置 `codex_plugin_spec`。其 live agent 证明会发送可见进度，继续执行随机化的工作区读取和一次精确的 artifact 写入，然后发送完成信号。

参见 [完整发布验证](/reference/full-release-validation) 以了解
阶段矩阵、确切的工作流任务名称、配置差异、产物以及
定向重跑句柄。

`OpenClaw Release Publish` 是手动的变更性发布工作流。仅在发布标签已存在且 OpenClaw npm 预检已成功之后，才从受信任的 `main` 分支分发常规 beta 和 stable 发布（预检会在其检查中运行 `pnpm plugins:sync:check`）。该标签仍然会选择精确的发布 commit，包括 `release/YYYY.M.PATCH` 上的 commit；Tideclaw alpha 发布仍然使用其对应的 alpha 分支。它需要已保存的 `preflight_run_id` 以及成功的
`full_release_validation_run_id` 和其精确的
`full_release_validation_run_attempt`，会为所有可发布的插件包分发 `Plugin NPM Release`，为同一发布 SHA 分发 `Plugin ClawHub Release`，然后才分发 `OpenClaw NPM Release`。Stable 发布还要求精确的 `windows_node_tag`；在任何发布子流程之前，该工作流会验证 Windows 源发布，并将其 x64/ARM64 安装程序与候选已批准的 `windows_node_installer_digests` 输入进行比较，然后在发布 GitHub release 草稿之前，晋级并验证这些相同的固定安装程序摘要，以及精确的伴随资产和校验和契约。
定向的仅插件修复使用 `plugin_publish_scope=selected` 并配合非空包列表。仅插件的 `all-publishable` 运行要求与核心发布相同的不可变 npm 预检和完整发布验证证据。

```bash
gh workflow run openclaw-release-publish.yml \
  --ref main \
  -f tag=vYYYY.M.PATCH-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f full_release_validation_run_id=<successful-full-release-validation-run-id> \
  -f full_release_validation_run_attempt=<successful-full-release-validation-run-attempt> \
  -f npm_dist_tag=beta
```

对于在快速变化分支上的固定 commit 证明，请使用辅助工具，而不是
`gh workflow run ... --ref main -f ref=<sha>`：

```bash
pnpm ci:full-release --sha <full-sha>
```

GitHub workflow dispatch refs 必须是分支或标签，而不是原始 commit SHA。该
辅助工具会在受信任的 `main`
workflow SHA 上推送一个临时的 `release-ci/<sha>-...` 分支，通过 workflow 的 `ref` 输入传递所请求的目标 SHA，
在可用时复用严格的精确目标证据，验证每个子工作流的 `headSha` 都与受信任的 workflow SHA 匹配，并在运行完成后删除临时
分支。传入 `-f reuse_evidence=false` 可强制进行新的
验证。如果任何子工作流在不同的 workflow SHA 上运行，总控验证器也会失败。

`release_profile` 控制传入发布检查的 live/provider 广度。手动发布工作流默认使用 `stable`；只有在你有意想要更广泛的 advisory provider/media 矩阵时才使用 `full`。稳定版和完整发布检查始终运行详尽的 live/E2E 和 Docker 发布路径 soak；beta profile 可通过 `run_release_soak=true` 选择启用。

- `beta` 保留最快的 OpenAI/core 发布关键线路。
- `stable` 增加 stable provider/backend 集合。
- `full` 运行更广泛的 advisory provider/media 矩阵。

这个总控会记录已触发的子运行 id，而最终的 `Verify full validation` 任务会重新检查当前子运行的结论，并为每个子运行附加最慢任务表。如果某个子工作流被重新运行并变为绿色，只需重新运行父级验证器任务即可刷新总控结果和耗时摘要。

对于恢复，`Full Release Validation` 和 `OpenClaw Release Checks` 都接受 `rerun_group`。候选发布使用 `all`，仅正常的完整 CI 子项使用 `ci`，仅插件预发布子项使用 `plugin-prerelease`，仅 OpenClaw Performance 子项使用 `performance`，所有发布子项使用 `release-checks`，或者使用更细的组：总控上的 `install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 或 `npm-telegram`。这使得在针对性修复后，失败的发布盒重跑范围保持受限。对于单个失败的跨 OS 线路，将 `rerun_group=cross-os` 与 `cross_os_suite_filter` 结合使用，例如 `windows/packaged-upgrade`；较长的跨 OS 命令会输出 heartbeat 行，而 packaged-upgrade 摘要会包含各阶段耗时。被选中的 Matrix 和 Telegram QA 线路会阻塞正常的发布验证，核心 runtime-pair 工具覆盖门禁也是如此。QA 一致性、runtime 一致性以及受门控的 Discord、WhatsApp 和 Slack live 线路仅为建议性。

`OpenClaw Release Checks` 使用受信任的工作流 ref 将所选 ref 一次性解析为 `release-package-under-test` tarball，然后将该 artifact 传递给跨 OS 检查和 Package Acceptance；当运行 soak 覆盖时，还会传递给 live/E2E 发布路径 Docker 工作流。这样可确保不同发布盒子之间的包字节一致，并避免在多个子作业中重复重新打包同一个候选版本。对于 Codex npm 插件 live 任务线，release checks 要么传递一个由 `release_package_spec` 派生的、匹配的已发布插件规格，要么传递操作员提供的 `codex_plugin_spec`，要么保持输入为空，以便 Docker 脚本对所选检出的 Codex 插件进行打包。

对于 `ref=main` 且 `rerun_group=all` 的重复 `Full Release Validation` 运行，会取代较旧的总控流程。父级监控器在父流程被取消时会取消它已经触发的任何子工作流，因此较新的 main 验证不会排在一个陈旧的两小时发布检查运行之后。发布分支/标签验证和定向重跑分组保持 `cancel-in-progress: false`。

## Live 和 E2E 分片

发布 live/E2E 子流程保留了广泛的原生 `pnpm test:live` 覆盖，但它通过 `scripts/test-live-shard.mjs` 以命名分片的方式运行，而不是一个串行任务：

- `native-live-src-agents` 和 `native-live-src-agents-zai-coding`
- `native-live-src-gateway-core`
- 按 provider 过滤的 `native-live-src-gateway-profiles` 任务
- `native-live-src-gateway-backends`
- `native-live-src-infra`
- `native-live-test`
- `native-live-extensions-a-k`
- `native-live-extensions-l-n`
- `native-live-extensions-moonshot`
- `native-live-extensions-openai`
- `native-live-extensions-o-z-other`
- `native-live-extensions-xai`
- 拆分的音频/视频媒体分片以及按 provider 过滤的音乐分片

这在保持相同文件覆盖范围的同时，使缓慢的 live provider 失败更容易重新运行和诊断。聚合的 `native-live-src-gateway`、`native-live-extensions-o-z`、`native-live-extensions-media` 和 `native-live-extensions-media-music` 分片名称仍然对手动一次性重跑有效。

原生 live 媒体分片在 `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04` 中运行，该镜像由 `Live Media Runner Image` 工作流构建。该镜像预装了 `ffmpeg` 和 `ffprobe`；媒体任务只在 setup 前验证这些二进制文件。请将基于 Docker 的 live 套件保留在普通 Blacksmith 运行器上——容器任务不是启动嵌套 Docker 测试的合适位置。

Docker 支持的 live 模型/后端分片使用一个按所选提交分别共享的 `ghcr.io/openclaw/openclaw-live-test:<sha>-<extensions>` 镜像。live 发布工作流会先构建并推送一次该镜像，然后 Docker live 模型、按 provider 分片的网关、CLI 后端、ACP bind 和 Codex harness 分片都使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行。网关 Docker 分片在工作流作业超时之下带有显式的脚本级 `timeout` 限制，因此卡住的容器或清理路径会快速失败，而不是消耗整个发布检查预算。如果这些分片独立重新构建完整的源 Docker 目标，则说明发布运行配置错误，并且会因为重复的镜像构建而浪费墙钟时间。

## 包接受

当问题是“这个可安装的 OpenClaw 包作为一个产品能正常工作吗？”时，请使用 `Package Acceptance`。它不同于普通 CI：普通 CI 验证源代码树，而包接受则通过用户在安装或更新后所经历的同一套 Docker E2E harness 来验证单个 tarball。

### 作业

1. `resolve_package` 检出 `workflow_ref`，解析一个 package candidate，写入 `.artifacts/docker-e2e-package/openclaw-current.tgz`、写入 `.artifacts/docker-e2e-package/package-candidate.json`，将两者作为 `package-under-test` artifact 上传，并在 GitHub step summary 中打印 source、workflow ref、package ref、version、SHA-256 和 profile。
2. `package_integrity` 下载 `package-under-test` artifact，并使用 `scripts/check-openclaw-package-tarball.mjs` 强制执行公共 package tarball 合约。
3. `docker_acceptance` 调用 `openclaw-live-and-e2e-checks-reusable.yml`，使用解析出的 package source SHA（若无则回退到 `workflow_ref`）以及 `package_artifact_name=package-under-test`。该可复用工作流会下载该 artifact，校验 tarball 清单，在需要时准备 package-digest Docker images，并针对该 package 运行所选 Docker lanes，而不是打包工作流检出内容。当某个 profile 选择多个目标 `docker_lanes` 时，可复用工作流会先准备 package 和共享 images 一次，然后将这些 lanes 作为并行的目标 Docker 作业分发出去，并使用唯一的 artifacts。
4. `package_telegram` 可选地调用 `NPM Telegram Beta E2E`。当 `telegram_mode` 不为 `none` 时运行；如果 Package Acceptance 已解析出 `package-under-test`，则安装相同的 artifact；独立的 Telegram dispatch 仍然可以安装已发布的 npm spec。
5. `summary` 会在 package 解析、完整性、Docker acceptance 或可选的 Telegram lane 失败时使工作流失败。`advisory` 输入会将 acceptance 失败降级为警告，供 advisory 调用者使用。

### 候选来源

- `source=npm` 仅接受 `openclaw@extended-stable`、`openclaw@beta`、`openclaw@latest`，或如 `openclaw@2026.4.27-beta.2` 这样的精确 OpenClaw release version。用于已发布的 extended-stable、pre-release 或 stable acceptance。
- `source=ref` 打包一个受信任的 `package_ref` 分支、标签或完整 commit SHA。resolver 会获取 OpenClaw branches/tags，验证所选提交可从 repository branch history 或 release tag 到达，在 detached worktree 中安装依赖，并使用 `scripts/package-openclaw-for-docker.mjs` 打包。
- `source=url` 下载一个公共 HTTPS `.tgz`；`package_sha256` 为必需。此路径会拒绝 URL 凭据、非默认 HTTPS 端口、私有/内部/特殊用途主机名或已解析 IP，以及跳转到同一公共安全策略之外的重定向。
- `source=trusted-url` 从 `.github/package-trusted-sources.json` 中一个命名的 trusted-source policy 下载 HTTPS `.tgz`；`package_sha256` 和 `trusted_source_id` 为必需。仅将其用于维护者拥有的企业镜像或需要配置主机、端口、路径前缀、重定向主机或私有网络解析的私有 package 仓库。如果策略声明了 bearer auth，工作流会使用固定的 `OPENCLAW_TRUSTED_PACKAGE_TOKEN` secret；URL 中嵌入的凭据仍会被拒绝。
- `source=artifact` 从 `artifact_run_id` 和 `artifact_name` 下载一个 `.tgz`；`package_sha256` 可选，但如果是外部共享的 artifact，则应提供。

请将 `workflow_ref` 和 `package_ref` 分开。`workflow_ref` 是运行测试的受信任工作流/harness 代码。`package_ref` 是在 `source=ref` 时被打包的源代码提交。这样当前测试 harness 就可以验证较旧但受信任的源代码提交，而无需运行旧的工作流逻辑。

### 套件 profile

- `smoke` — `npm-onboard-channel-agent`, `gateway-network`, `config-reload`
- `package` — `npm-onboard-channel-agent`, `doctor-switch`, `update-channel-switch`, `skill-install`, `update-corrupt-plugin`, `upgrade-survivor`, `published-upgrade-survivor`, `root-managed-vps-upgrade`, `update-restart-auth`, `plugins-offline`, `plugin-update`
- `product` — `package` 集合加上 live `plugins` 覆盖，替代 `plugins-offline`, 另外还包括 `mcp-channels`, `cron-mcp-cleanup`, `openai-web-search-minimal`, `openwebui`
- `full` — 带有 OpenWebUI 的完整 Docker release-path chunks
- `custom` — 精确的 `docker_lanes`；当 `suite_profile=custom` 时必需

`package` profile 使用离线插件覆盖，因此已发布包的验证不会受制于线上 ClawHub 可用性。可选的 Telegram lane 在 `NPM Telegram Beta E2E` 中重用 `package-under-test` 工件，而已发布的 npm spec 路径仍保留给独立分发使用。

关于专门的更新和插件测试策略，包括本地命令、Docker lanes、Package Acceptance 输入、发布默认值和失败排查，请参见 [Testing updates and plugins](/help/testing-updates-plugins)。

Release checks 调用 Package Acceptance 时使用 `source=artifact`、准备好的 release package artifact、`suite_profile=custom`、`docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor root-managed-vps-upgrade update-restart-auth plugins-offline plugin-update plugin-binding-command-escape'`，以及 `telegram_mode=mock-openai`。这样可以让 package migration、update、live ClawHub skill install、stale-plugin-dependency cleanup、configured-plugin install repair、offline plugin、plugin-update 和 Telegram proof 都基于同一个已解析的 package tarball。对 Full Release Validation 或 OpenClaw Release Checks，在发布 beta 后设置 `release_package_spec`，即可在不重新构建的情况下，对已发布的 npm package 运行同一矩阵；只有当 Package Acceptance 需要与其余 release validation 不同的 package 时，才设置 `package_acceptance_package_spec`。跨 OS 的 release checks 仍然覆盖 OS 特定的 onboarding、installer 和平台行为；package/update 产品验证应从 Package Acceptance 开始。

The `published-upgrade-survivor` Docker lane validates one published package baseline per run in the blocking release path. In Package Acceptance, the resolved `package-under-test` tarball is always the candidate and `published_upgrade_survivor_baseline` selects the fallback published baseline, defaulting to `openclaw@latest`; failed-lane rerun commands preserve that baseline. Full Release Validation with `run_release_soak=true` or `release_profile=full` sets `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` and `published_upgrade_survivor_scenarios=reported-issues` to expand across the four latest stable npm releases plus pinned plugin-compatibility boundary releases and issue-shaped fixtures for Feishu config, preserved bootstrap/persona files, configured Openclaw plugin installs, tilde log paths, and stale legacy plugin dependency roots. Multi-baseline published-upgrade survivor selections are sharded by baseline into separate targeted Docker runner jobs. The separate `Update Migration` workflow uses the `update-migration` Docker lane with `all-since-2026.4.23` baselines and `plugin-deps-cleanup` scenarios when the question is exhaustive published update cleanup, not normal Full Release CI breadth. Local aggregate runs can pass exact package specs with `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS`, keep a single lane with `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` such as `openclaw@2026.4.15`, or set `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` for the scenario matrix. The published lane configures the baseline with a baked `openclaw config set` command recipe, records recipe steps in `summary.json`, and probes `/healthz`, `/readyz`, plus RPC status after Gateway start. The Windows packaged and installer fresh lanes also verify that an installed package can import a browser-control override from a raw absolute Windows path. The OpenAI cross-OS agent-turn smoke defaults to `OPENCLAW_CROSS_OS_OPENAI_MODEL` when set, otherwise `openai/gpt-5.6-luna`, so the install and gateway proof uses the lower-cost GPT-5.6 test tier.

### 旧版兼容窗口

Package Acceptance 对已发布包提供有边界的旧版兼容窗口。对于 `2026.4.25` 及之前的包，包括 `2026.4.25-beta.*`，可以使用兼容路径：

- `dist/postinstall-inventory.json` 中已知的私有 QA 条目可以指向 tarball 中未包含的文件；
- 当包未暴露该标志时，`doctor-switch` 可以跳过 `gateway install --wrapper` 持久化子用例；
- `update-channel-switch` 可以从 tarball 派生的 fake git fixture 中清理缺失的 pnpm `patchedDependencies`，并且可以记录缺失的持久化 `update.channel`；
- plugin smokes 可以读取旧版 install-record 位置，或接受缺失的 marketplace install-record 持久化；
- `plugin-update` 可以允许配置元数据迁移，同时仍要求 install record 和 no-reinstall 行为保持不变。

The published `2026.4.26` package may also warn for local build metadata stamp files that were already shipped. Current package validators require both npm lockfile formats to be absent from new tarballs.

### 示例

```bash
# 使用产品级覆盖验证当前 beta package。
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai

# 使用 package coverage 验证已发布的 extended-stable package。
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@extended-stable \
  -f suite_profile=package \
  -f telegram_mode=mock-openai

# 使用当前 harness 打包并验证一个 release branch。
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=ref \
  -f package_ref=release/YYYY.M.PATCH \
  -f suite_profile=package \
  -f telegram_mode=mock-openai

# 验证一个 tarball URL。对于 source=url，SHA-256 是必需的。
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=url \
  -f package_url=https://example.com/openclaw-current.tgz \
  -f package_sha256=<64-char-sha256> \
  -f suite_profile=smoke

# 从命名的受信任私有镜像策略验证一个 tarball。
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=trusted-url \
  -f trusted_source_id=enterprise-artifactory \
  -f package_url=https://packages.example.internal:8443/artifactory/openclaw/openclaw-current.tgz \
  -f package_sha256=<64-char-sha256> \
  -f suite_profile=smoke

# 重用由另一次 Actions 运行上传的 tarball。
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

## 安装 smoke

`Install Smoke` 工作流不再在拉取请求或 `main` 推送时运行。其夜间/手动封装器以及发布验证都会调用只读的 `install-smoke-reusable.yml` 核心工作流，并且每次运行都会在 GitHub 托管的 runner 上执行完整的 install-smoke 路径：

- 根 Dockerfile smoke 镜像会针对每个目标 SHA 只构建一次，并绑定到工作流修订版和生成者尝试，作为不可变制品保存；随后由 CLI smoke、agents 删除共享工作区的 CLI smoke、容器网关网络 E2E，以及带有 `matrix` 插件的 bundled `build-arg` smoke 加载。插件 smoke 会验证运行时依赖安装镜像行为，并确认插件加载时没有 entry-escape 诊断信息。
- QR 包安装以及安装器/更新 Docker smokes（包括 Rocky Linux 安装器通道和针对可配置 `update_baseline_version` npm 基线的更新通道）会作为独立作业运行，因此安装器相关工作不会排在根镜像 smoke 后面等待。

较慢的 Bun 全局安装 image-provider smoke 会由 `run_bun_global_install_smoke` 单独控制。它会在夜间计划任务中运行，默认在来自发布检查的工作流调用中开启，手动 `Install Smoke` 触发也可以选择启用它。常规 PR CI 仍会针对与 Node 相关的变更运行快速的 Bun launcher 回归 lane。QR 和安装器 Docker 测试则继续使用各自专门面向安装的 Dockerfile。

## 本地 Docker E2E

`pnpm test:docker:all` 会预构建一个共享的 live-test 镜像，打包一次 OpenClaw 作为 npm tarball，并构建两个共享的 `scripts/e2e/Dockerfile` 镜像：

- 一个裸的 Node/Git 运行器，用于 installer/update/plugin-dependency 这些 lane；
- 一个功能性镜像，将同一个 tarball 安装到 `/app` 中，用于普通功能 lane。

Docker lane 定义位于 `scripts/lib/docker-e2e-scenarios.mjs`，规划器逻辑位于 `scripts/lib/docker-e2e-plan.mjs`，运行器只执行所选计划。调度器通过 `OPENCLAW_DOCKER_E2E_BARE_IMAGE` 和 `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE` 为每个 lane 选择镜像，然后在 `OPENCLAW_SKIP_DOCKER_BUILD=1` 下运行这些 lanes。

### 可调参数

| Variable                               | Default | Purpose                                                                                       |
| -------------------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10      | 主池中普通 lane 的并发槽位数。                                                        |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10      | 对 provider 敏感的尾池槽位数。                                                      |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9       | 并发 live lane 上限，避免 provider 限流。                                        |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 5        | 并发 npm install lane 上限。                                                              |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7       | 并发多服务 lane 上限。                                                            |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000    | 为避免 Docker daemon 创建风暴，lane 启动之间的错峰间隔；设为 `0` 可取消错峰。     |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000 | 每个 lane 的兜底超时时间（120 分钟）；被选中的 live/tail lanes 使用更严格的上限。           |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | 未设置   | `1` 会打印调度计划而不运行 lanes。                                          |
| `OPENCLAW_DOCKER_ALL_LANES`            | 未设置   | 逗号分隔的精确 lane 列表；会跳过 cleanup smoke，方便 agent 复现某个失败 lane。 |

比其有效上限更重的 lane 仍然可以从空池中启动，然后会单独运行直到释放容量。本地聚合流程会预检 Docker、移除过时的 OpenClaw E2E 容器、输出活跃 lane 状态、持久化 lane 耗时以支持最长优先排序，并且默认在首次失败后停止调度新的池化 lanes。

### 可复用的 live/E2E 工作流

可复用的 live/E2E 工作流会询问 `scripts/test-docker-all.mjs --plan-json` 需要哪个 package、image kind、live image、lane 和凭据覆盖。然后 `scripts/docker-e2e.mjs` 会把该计划转换为 GitHub outputs 和 summaries。它要么通过 `scripts/package-openclaw-for-docker.mjs` 打包 OpenClaw，要么下载当前运行的 package artifact，或者从 `package_artifact_run_id` 下载 package artifact，然后验证 tarball 清单。默认的 `no-push-artifact` 路径会通过 Blacksmith 的 Docker layer cache 构建带有 package-digest 标签的 bare/functional 镜像，将精确的镜像字节打包进不可变的 workflow artifact，并让每个消费者验证并加载该 artifact。`existing-only` 则要求显式提供 `docker_e2e_bare_image`/`docker_e2e_functional_image` 的 GHCR 引用，并且从不构建或推送。这些 registry 拉取使用有上限的 180 秒单次尝试超时，因此卡住的流会快速重试，而不是占用大部分 CI 关键路径。在成功完成调度验证后，`openclaw-scheduled-live-checks.yml` 会将不可变的已测试镜像清单传递给独立的 package-write 发布器；只读的 release 和 prerelease 调用方永远不会进入该写入流程。

### Release-path 分块

Release Docker 覆盖使用更小的分块作业，并设置 `OPENCLAW_SKIP_DOCKER_BUILD=1`，这样每个分块只验证并加载它所需的 artifact-backed 镜像种类（或者在显式 `existing-only` 复用下拉取它），并通过同一个加权调度器执行多个 lane：

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-anthropic | package-update-core | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h | openwebui`

当前的 release Docker 分块是 `core`、`package-update-openai`、`package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、`plugins-runtime-services`、`plugins-runtime-install-a` 到 `plugins-runtime-install-h`，以及 `openwebui`。`package-update-openai` 包含 live Codex plugin 包 lane，它会安装候选 OpenClaw 包，从 `codex_plugin_spec` 安装 Codex plugin 或使用带有显式 Codex CLI 安装批准的同 ref tarball，运行 Codex CLI 预检和同会话 agent 回合，然后运行一次零重试的 medium-thinking 回合，发送进度、读取随机化的工作区输入、写入其精确的 artifact，并发送完成信号。`plugins-runtime-core`、`plugins-runtime` 和 `plugins-integrations` 仍然是聚合的 plugin/runtime 别名。`install-e2e` lane 别名仍然是两个 provider installer lanes 的聚合手动重跑别名。

OpenWebUI 会作为独立的 `openwebui` 分块在专用的大磁盘 Blacksmith runner 上运行，只要稳定版或完整 release-path 覆盖请求它，就会这样运行，即使可复用 workflow 将受支持的作业路由到 GitHub 托管的 runners。将外部镜像拉取分开处理，可以防止大镜像与 `plugins-runtime-services` 中共享的 package 和 plugin 镜像竞争；传统的聚合 plugin/runtime 分块在兼容的手动重跑中仍然包含 OpenWebUI。捆绑通道的更新 lanes 会在遇到 transient npm network failures 时重试一次。

每个分块都会上传 `.artifacts/docker-tests/`，其中包含 lane 日志、耗时、`summary.json`、`failures.json`、阶段耗时、调度器计划 JSON、慢 lane 表，以及每个 lane 的重跑命令。工作流的 `docker_lanes` 输入会针对为该次运行准备好的镜像执行所选 lanes，而不是运行分块作业，这样失败 lane 的调试就被限制在一个定向的 Docker 作业中；如果所选 lane 是 live Docker lane，那么定向作业会为那次重跑在本地构建 live-test 镜像。重跑辅助工具会验证失败 artifact 的精确 selected target SHA，而手动触发会重新打包该 ref，因为内部可复用 workflow 的 package tuple 不属于 `workflow_dispatch` schema。生成的命令只有在这些输入是 GHCR-backed 时才会包含已准备好的镜像输入和 `shared_image_policy=existing-only`；runner 本地的 artifact tags 会被省略，这样新 runner 会重新构建它们。显式的 target override 会丢弃恢复出的 GHCR 镜像引用，除非 artifact 证明它们与 override 匹配。由 artifact 生成的 workflow-definition refs 也会被省略，因为 full-release 临时分支会被删除；dispatch 会使用仓库默认分支，除非操作员显式覆盖它。

```bash
pnpm test:docker:rerun <run-id>      # 下载 Docker 工件并打印合并的/按 lane 定向的重跑命令
pnpm test:docker:timings <summary>   # 慢 lane 和阶段关键路径摘要
```

计划中的 live/E2E 工作流会每天运行完整的 release-path Docker 套件，并在成功后为精确的已测试镜像工件调用显式发布器。

## 插件预发布

`Plugin Prerelease` 是一个成本更高的产品/包覆盖，因此它是由 `Full Release Validation` 派发的独立工作流，或者由明确的操作员手动触发。普通的拉取请求、`main` 分支推送，以及独立的手动 CI 派发都会关闭该测试套件。它会在八个扩展 worker 之间平衡打包的插件测试；这些扩展分片任务一次最多运行两组插件配置，每组使用一个 Vitest worker，并配备更大的 Node 堆内存，以避免导入较重的插件批次生成额外的 CI 任务。仅在发布时启用的 Docker 预发布路径（通过 `full_release_validation` 输入启用）会将目标 Docker 任务按四个一组批处理，以避免为一到三分钟的任务占用数十个 runner。该工作流还会从 `@openclaw/plugin-inspector` 上传一个信息性的 `plugin-inspector-advisory` artifact；inspector 的发现结果仅作为分流输入，不会改变阻塞性的 Plugin Prerelease 门禁。

## QA 实验室

QA 实验室在主智能作用域工作流之外拥有专用的 CI lanes。Agentic parity 被嵌套在更广泛的 QA 和发布 harness 中，而不是独立的 PR 工作流。若需要 parity 随更广泛的验证运行一起执行，请使用 `Full Release Validation` 并设置 `rerun_group=qa-parity`。

- `QA-Lab - All Lanes` 工作流在 `main` 上按夜间计划运行，并支持手动触发；它会扇出 mock parity 以及 live Matrix、Telegram、Discord、WhatsApp 和 Slack 作业。live 作业使用 `qa-live-shared` 环境；Telegram、Discord、WhatsApp 和 Slack 使用 Convex leases，而 Matrix 会配置可丢弃的本地凭据。

计划、手动和 release 的 Matrix 检查使用确定性的 mock provider，因此 live transport contract 与模型延迟和常规 provider-plugin 启动相互隔离。Telegram release 检查使用相同的确定性模型边界。live transport gateway 会禁用 memory search，因为 QA parity 会单独覆盖 memory 行为；provider 连通性则由单独的 live model、native provider 和 Docker provider 套件覆盖。

计划、手动和 release 的 Matrix gates 使用共享的 QA Lab suite host 和 live adapter。默认成员资格来自明确声明 Matrix channel 资格的 flow scenarios；runner 和 workflow 不维护任何精选 profile 或 scenario-id 列表。CI 会将该 catalog 派生的选择分布到五个确定性的均衡 shard 中，因此成员资格与顺序无关，并且每个作业都能保持在其超时时间内。聚焦的本地运行会重复 `--scenario <id>`。

`OpenClaw Release Checks` 还会在 release 批准前运行 release-critical 的 QA Lab lanes；其 QA parity gate 会将 candidate 和 baseline packs 作为并行 lane 作业运行，然后将两个 artifact 下载到一个小型报告作业中，以进行最终 parity 比较。

对于普通 PR，请遵循作用域化的 CI/检查证据，而不要把 parity 当作必需状态。

## CodeQL

`CodeQL` 工作流有意被设计为一个窄范围的首轮安全扫描器，而不是对整个仓库的全面扫描。每日、手动、`main` push 以及非草稿 pull request 保护运行会扫描 Actions 工作流代码，以及最高风险的 JavaScript/TypeScript 表面，并使用筛选到高/严重 `security-severity` 的高置信度安全查询。

pull request 保护保持轻量：它只会在 `.github/actions`、`.github/codeql`、`.github/workflows`、`packages`、`scripts`、`src`，或负责流程的捆绑插件运行时路径下有变更时启动，并且会运行与定时工作流相同的高置信度安全矩阵。Android 和 macOS CodeQL 不包含在 PR 默认项中。

### 安全类别

| 类别                                              | 表面                                                                                                                               |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | Auth、secrets、sandbox、cron 和 gateway 基线                                                                                      |
| `/codeql-security-high/channel-runtime-boundary`  | 核心 channel 实现契约，以及 channel 插件运行时、gateway、Plugin SDK、secrets、audit 触点                                           |
| `/codeql-security-high/network-ssrf-boundary`     | 核心 SSRF、IP 解析、网络保护、web-fetch，以及 Plugin SDK SSRF 策略表面                                                             |
| `/codeql-security-high/mcp-process-tool-boundary` | MCP servers、进程执行辅助工具、外发投递，以及 agent 工具执行闸门                                                                  |
| `/codeql-security-high/process-exec-boundary`     | 本地 shell、process spawn 辅助工具、拥有子进程的捆绑插件运行时，以及工作流脚本胶水                                                  |
| `/codeql-security-high/plugin-trust-boundary`     | 插件安装、loader、manifest、registry、package-manager 安装、source-loading，以及 Plugin SDK 包契约信任表面                         |

### 平台特定的安全分片

- `CodeQL Android Critical Security` — 定时 Android 安全分片。它在工作流可接受的最小 Blacksmith Linux runner 上手动构建 Android 应用以供 CodeQL 使用。产物上传到 `/codeql-critical-security/android`。
- `CodeQL macOS Critical Security` — 每周/手动 macOS 安全分片。它在 Blacksmith macOS 上手动构建 macOS 应用供 CodeQL 使用，从上传的 SARIF 中过滤掉依赖构建结果，并上传到 `/codeql-critical-security/macos`。之所以不放在每日默认项中，是因为即使在干净状态下，macOS 构建也会主导运行时间。

### Critical Quality 类别

`CodeQL Critical Quality` 是对应的非安全分片。它仅在 GitHub 托管的 Linux runner 上，对狭窄但高价值的表面运行错误严重度、非安全的 JavaScript/TypeScript 质量查询，因此质量扫描不会消耗 Blacksmith runner 注册预算。它的 pull request 保护故意比定时配置更小：非草稿 PR 只会对其涉及的表面运行匹配的分片，来自十三个可由 PR 路由的分片——`agent-runtime-boundary`、`channel-runtime-boundary`、`config-boundary`、`core-auth-secrets`、`gateway-runtime-boundary`、`mcp-process-runtime-boundary`、`memory-runtime-boundary`、`network-runtime-boundary`、`plugin-boundary`、`plugin-sdk-package-contract`、`plugin-sdk-reply-runtime`、`provider-runtime-boundary` 和 `session-diagnostics-boundary`。`ui-control-plane` 和 `web-media-runtime-boundary` 不包含在 PR 运行中。CodeQL 配置和质量工作流的变更会运行完整的 PR 分片集合（网络运行时分片依据其自己的 CodeQL 配置文件和网络归属的源路径来触发）。

手动派发接受：

```text
profile=all|agent-runtime-boundary|config-boundary|core-auth-secrets|channel-runtime-boundary|gateway-runtime-boundary|memory-runtime-boundary|mcp-process-runtime-boundary|network-runtime-boundary|plugin-boundary|plugin-sdk-package-contract|plugin-sdk-reply-runtime|provider-runtime-boundary|session-diagnostics-boundary
```

这些窄范围配置是用于单独运行一个质量分片的教学/迭代钩子。

| Category                                                | Surface                                                                                                                                                           |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-critical-quality/core-auth-secrets`            | Auth、secrets、sandbox、cron 和 gateway 安全边界代码                                                                                                             |
| `/codeql-critical-quality/config-boundary`              | Config schema、migration、normalization 和 IO 契约                                                                                                                 |
| `/codeql-critical-quality/gateway-runtime-boundary`     | Gateway 协议 schema 和 server method 契约                                                                                                                          |
| `/codeql-critical-quality/channel-runtime-boundary`     | 核心 channel 和捆绑 channel 插件实现契约                                                                                                                          |
| `/codeql-critical-quality/agent-runtime-boundary`       | 命令执行、模型/provider 调度、自动回复调度与队列，以及 ACP control-plane 运行时契约                                                                               |
| `/codeql-critical-quality/mcp-process-runtime-boundary` | MCP servers 和工具桥接、进程监督辅助工具，以及外发投递契约                                                                                                        |
| `/codeql-critical-quality/memory-runtime-boundary`      | Memory host SDK、memory runtime 外观、memory Plugin SDK 别名、memory runtime 激活胶水，以及 memory doctor 命令                                                |
| `/codeql-critical-quality/network-runtime-boundary`     | 网络策略包、原始 socket 和代理捕获运行时、SSH tunnel、gateway lock、JSONL socket，以及 push transport 表面                                                       |
| `/codeql-critical-quality/session-diagnostics-boundary` | 回复队列内部、session 投递队列、外发 session 绑定/投递辅助工具、诊断事件/日志捆绑表面，以及 session doctor CLI 契约                                               |
| `/codeql-critical-quality/plugin-sdk-reply-runtime`     | Plugin SDK 入站回复调度、reply payload/chunking/runtime 辅助工具、channel reply 选项、投递队列，以及 session/thread 绑定辅助工具                             |
| `/codeql-critical-quality/provider-runtime-boundary`    | 模型目录 normalization、provider auth 和 discovery、provider runtime 注册、provider 默认值/catalogs，以及 web/search/fetch/embedding registry               |
| `/codeql-critical-quality/ui-control-plane`             | Control UI 启动、本地持久化、gateway control flows，以及 task control-plane 运行时契约                                                                            |
| `/codeql-critical-quality/web-media-runtime-boundary`   | 核心 web fetch/search、media IO、media understanding、image-generation，以及 media-generation 运行时契约                                                         |
| `/codeql-critical-quality/plugin-boundary`              | loader、registry、public-surface，以及 Plugin SDK 入口点契约                                                                                                       |
| `/codeql-critical-quality/plugin-sdk-package-contract`  | 已发布包侧的 Plugin SDK 源代码以及 plugin package contract 辅助工具                                                                                                |

质量与安全分离，这样质量发现可以被调度、度量、禁用或扩展，而不会掩盖安全信号。Swift、Python 和捆绑插件的 CodeQL 扩展应仅在窄范围配置具备稳定运行时间和稳定信号之后，作为有范围或分片化的后续工作再加回来。

## 维护工作流

### 文档代理

`Docs Agent` 工作流是一个事件驱动的 Codex 维护通道，用于保持现有文档与最近落地的变更一致。它没有纯定时调度：在 `main` 上一次成功的非机器人 push CI 运行可以触发它，手动触发也可以直接运行它。工作流运行调用会在 `main` 已经前进，或在过去一小时内创建了另一个未跳过的 Docs Agent 运行时跳过。当它运行时，它会审查从上一个未跳过的 Docs Agent 源 SHA 到当前 `main` 的提交范围，因此一次按小时运行就可以覆盖自上次文档处理以来累积的所有 main 变更。

### 测试性能代理

`Test Performance Agent` 工作流是一个面向慢测试的事件驱动 Codex 维护通道。它没有纯定时计划：`main` 上一次成功的非机器人 push CI 运行可以触发它，但如果当天已经运行过或正在运行另一个 workflow-run 调用，它就会跳过。手动触发会绕过这个每日活动门槛。该通道会构建一份全套件分组的 Vitest 性能报告，只允许 Codex 进行尽量小、且不破坏覆盖率的测试性能修复，而不是大范围重构，然后重新运行全套件报告，并拒绝任何会降低通过基线测试数量的变更。分组报告会记录 Linux 和 macOS 上每个配置的墙钟时间和最大 RSS，因此前后对比除了时长差异，也能同时呈现测试内存差异。如果基线存在失败测试，Codex 只能修复明显故障，而且代理执行后的全套件报告必须通过，才能提交任何内容。当 `main` 在机器人推送落地之前继续前进时，该通道会对已验证的补丁重新基线、重新运行 `pnpm check:changed`，并重试推送；有冲突的过期补丁会被跳过。它使用 GitHub 托管的 Ubuntu，因此 Codex action 可以与文档代理保持相同的 drop-sudo 安全姿态。

### 合并后的重复 PR

`Duplicate PRs After Merge` 工作流是一个供维护者手动使用的工作流，用于落地后的重复清理。它默认是 dry-run，只有在 `apply=true` 时才会关闭显式列出的 PR。在修改 GitHub 之前，它会验证已落地的 PR 已合并，并且每个重复项要么有共享的引用 issue，要么有重叠的变更 hunks。

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## 本地检查门和变更路由

### Config baseline count ratchet

`pnpm config:docs:check` 会拒绝未记录在案的配置面增长，以及损坏或过时的计数快照。当经过审查的产品变更有意添加了 schema 路径时，请运行 `pnpm config:docs:gen`，检查 core/channel/plugin 的计数差异和生成的 SHA-256 文件，并将包含 schema、help、labels、migration 和 tests 的有意基线提升一并提交。不要通过手工编辑 counts 文件来绕过 ratchet。

Config 作者还必须为 Settings 中的新叶子节点分配层级。在叶子节点上添加 `advanced: false` 或
`advanced: true`，或者将该 key 放在其某个祖先节点之下，并让所有后代继承该祖先的层级。
未分类的根节点会因复制粘贴占位符而导致 schema quality
测试失败；没有祖先路径默认视为 advanced。
经过整理的 common-leaf 快照会让有意的层级变更在
review 中清晰可见。

本地变更 lane 逻辑位于 `scripts/changed-lanes.mjs`，并由 `scripts/check-changed.mjs` 执行。该本地检查门对架构边界的限制比宽泛的 CI 平台范围更严格：

- core production changes run core prod and core test typecheck plus core lint/guards;
- core test-only changes run only core test typecheck plus core lint;
- extension production changes run extension prod and extension test typecheck plus extension lint;
- extension test-only changes run extension test typecheck plus extension lint;
- bundled channel manifests, package metadata, config schemas, UI hints, and generator owners also run the bundled channel config metadata drift check;
- public Plugin SDK or plugin-contract changes expand to extension typecheck because extensions depend on those core contracts (Vitest extension sweeps stay explicit test work);
- release metadata-only version bumps run targeted version/config/root-dependency checks;
- unknown root/config changes fail safe to all check lanes.

本地变更测试路由位于 `scripts/test-projects.test-support.mjs`，其设计上比 `check:changed` 更便宜：直接的测试编辑运行自身，源代码编辑优先使用显式映射，然后是同级测试和 import-graph 依赖项。共享的 group-room 交付配置就是显式映射之一：对 group visible-reply 配置、source reply delivery mode 或 message-tool system prompt 的更改，会通过 core reply tests，以及 Discord 和 Slack delivery 回归测试，从而确保共享默认值的变更在第一次 PR push 之前就失败。仅当变更在整个 harness 范围内足够大，以至于这种廉价的映射集合不能作为可靠代理时，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。

## Testbox 验证

Crabbox 是仓库自有的远程盒子封装器，用于维护者的 Linux 证明。Agent
会话会为本地受信任源码保留一项或少量聚焦测试和低成本静态检查，仅在
现有依赖安装就绪时执行。它们使用 Crabbox 来运行更大规模的套件和
计算密集型工作，包括构建、类型检查、lint 分发、
Docker、包流水线、E2E、实时证明和 CI 对齐。受信任的维护者重型
证明默认使用 `blacksmith-testbox`，而 `.crabbox.yaml` 现在也默认使用它。其配置的
工作流会注入 provider 和 agent 凭据，因此不受信任的贡献者或
fork 代码必须使用无密钥的 fork CI 或经过清理的直接 AWS Crabbox。经过清理的 AWS 运行会设置 `CRABBOX_ENV_ALLOW=CI`，传递
`--no-hydrate`，并使用全新的临时远程 `HOME`；这可防止仓库中的
`OPENCLAW_*` 白名单和现有身份验证配置文件被不受信任的代码访问。
它们使用专门为该不受信任来源新加热的 lease，绝不使用
受信任或之前已注入凭据的 lease。请从一个干净、受信任的 `main` 检出中启动已安装的受信任 Crabbox
二进制文件，并且只使用 `--fresh-pr` 获取远程 PR；切勿在本地执行不受信任检出的封装器或配置。
取消设置 `CRABBOX_AWS_INSTANCE_PROFILE`，并在未解析为
空的 `aws.instanceProfile` 时默认失败关闭。在任何安装/测试之前，使用受信任的
绝对路径工具要求 IMDSv2 令牌，证明 IAM 凭据
端点返回 404，并将远程 `git rev-parse HEAD` 与完整的已审查 PR head SHA 进行比较。
将 lease 绑定到该 SHA，并在 head 变更时停止/重新加热。
从干净的 `main` 一并上传受信任的 `scripts/crabbox-untrusted-bootstrap.sh` 与 `--fresh-pr`；它会安装固定版本的 Node/pnpm，验证 SHA 和
包管理器 pin，隔离 `HOME`，安装依赖，然后执行
所请求的测试。
取消设置所有 `CRABBOX_TAILSCALE*` 覆盖项，强制使用 `--network public
--tailscale=false`，清除 exit-node/LAN 标志，并要求 `crabbox inspect` 在上传任何脚本之前
报告公共网络且没有 Tailscale 状态。
受 Blacksmith 宕机、配额问题或显式自有容量测试所驱动的自有 AWS/Hetzner 容量也仍然是回退方案。

Agents 不会为预期工作提前预热。只有在
第一个重型命令准备就绪时才懒加载获取 Testbox，后续重型命令复用返回的 `tbx_...` id，
每次运行都同步当前检出，并在交接前停止它。

由 Crabbox 驱动的 Blacksmith 运行会对单次 Testbox 执行预热、领取、同步、运行、报告和清理。内置的同步健全性检查会在同步后的盒子上运行 `git status --short` 时，如果发现至少 200 个跟踪文件删除，就会快速失败，这可捕捉到诸如 `pnpm-lock.yaml` 之类的根文件消失。对于有意进行的大规模删除 PR，请为远程命令设置 `CRABBOX_ALLOW_MASS_DELETIONS=1`。

如果同步阶段停留超过五分钟且在 sync 之后没有输出，Crabbox 也会终止本地 Blacksmith CLI 调用。设置 `CRABBOX_BLACKSMITH_SYNC_TIMEOUT_MS=0` 可以禁用该保护，或者在本地差异异常巨大时使用更大的毫秒值。

首次运行前，请在仓库根目录检查该封装器：

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

仓库封装器会拒绝不再声明所选提供商的过期 Crabbox 二进制文件，而 Blacksmith 驱动的运行要求 Crabbox 0.22.0 或更新版本，以便封装器获得当前的 Testbox 同步、队列和清理行为。在 Codex worktree 或链接/稀疏检出中，避免使用本地的 `pnpm crabbox:run` 脚本，因为 pnpm 可能会在 Crabbox 启动前协调依赖；应改为直接调用 node 封装器：

```bash
node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox --timing-json --shell -- "pnpm test <path-or-filter>"
```

在使用兄弟检出时，在进行计时或证明工作前重建被忽略的本地二进制文件：

```bash
version="$(git -C ../crabbox describe --tags --always --dirty | sed 's/^v//')" \
  && go build -C ../crabbox -trimpath -ldflags "-s -w -X github.com/openclaw/crabbox/internal/cli.version=${version}" -o bin/crabbox ./cmd/crabbox
```

`.crabbox.yaml` 中的 `blacksmith:` 块已经固定了 org、workflow、job 和 ref 默认值，因此下面的显式标志是可选的。Changed gate：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox \
  --blacksmith-org openclaw \
  --blacksmith-workflow .github/workflows/ci-check-testbox.yml \
  --blacksmith-job check \
  --blacksmith-ref main \
  --idle-timeout 90m \
  --ttl 240m \
  --timing-json \
  --shell -- \
  "corepack pnpm check:changed"
```

在本地依赖不可用或目标会分发到多个分支时，在 Testbox 上重新运行聚焦测试：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox \
  --idle-timeout 90m \
  --ttl 240m \
  --timing-json \
  --shell -- \
  "corepack pnpm test <path-or-filter>"
```

完整套件：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox \
  --idle-timeout 90m \
  --ttl 240m \
  --timing-json \
  --shell -- \
  "corepack pnpm test"
```

读取最终的 JSON 摘要。有用的字段是 `provider`、`leaseId`、`syncDelegated`、`exitCode`、`commandMs` 和 `totalMs`。对于委托给 Blacksmith Testbox 的运行，Crabbox 封装器退出码和 JSON 摘要就是命令结果。关联的 GitHub Actions 运行负责注入凭据和 keepalive；当 Testbox 在 SSH 命令已经返回后被外部停止时，它可能会以 `cancelled` 结束。除非封装器 `exitCode` 非零或命令输出显示测试失败，否则应将其视为清理/状态工件。单次 Blacksmith 驱动的 Crabbox 运行应自动停止 Testbox；如果运行被中断或清理状态不清楚，请检查活动 box，并且只停止你创建的 box：

```bash
blacksmith testbox list --all
blacksmith testbox status --id <tbx_id>
blacksmith testbox stop --id <tbx_id>
```

只有在你明确需要在同一个已预热 box 上运行多个命令时才使用复用：

```bash
node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox --id <tbx_id> --timing-json --shell -- "corepack pnpm test <path-or-filter>"
pnpm crabbox:stop -- <tbx_id>
```

复用 lease，而不是陈旧源代码。不要省略 `--no-sync`，这样每次运行都会上传当前检出；只有在你有意重新运行一个未变化、且已同步过的树时才使用它。不受信任的贡献者/fork 代码必须对每条命令使用 `CRABBOX_ENV_ALLOW=CI`、`--provider aws --no-hydrate`，以及一个全新的临时远程 `HOME`；在测试之前，要在该已清理的命令内部安装依赖。只复用专门分配给同一不受信任来源的新加热 lease；绝不复用受信任或之前已注入凭据的 lease。永远不要在本地执行不受信任检出的封装器或配置：从干净、受信任的 `main` 启动已安装的受信任 Crabbox 二进制文件，并在每次运行时传递 `--fresh-pr`。保持 `CRABBOX_AWS_INSTANCE_PROFILE` 未设置，拒绝非空的已解析实例配置文件，要求受信任的远程 IMDS 无角色证明，并在安装/测试前验证已审查的 head SHA。将 lease 绑定到该 SHA；在任何 head 变更后停止并重新加热。如果没有远程 PR，则使用无密钥的 fork CI。不要为不受信任的源选择 `hydrate-github` 或凭据注入的 Blacksmith 工作流。

如果 Crabbox 这一层出了问题但 Blacksmith 本身可用，则仅将直接 Blacksmith 用于诊断，例如 `list`、`status` 和清理。在把直接 Blacksmith 运行视为维护者证明之前，先修复 Crabbox 路径。

如果 `blacksmith testbox list --all` 和 `blacksmith testbox status` 能工作，但新的 warmup 在几分钟后仍处于 `queued`，既没有 IP 也没有 Actions 运行 URL，则应将其视为 Blacksmith 提供商、队列、计费或组织限制压力。停止你创建的 queued id，避免再启动更多 Testbox，并把证明转移到下面的自有 Crabbox 容量路径，同时让别人检查 Blacksmith 仪表板、计费和组织限制。

只有在 Blacksmith 宕机、受配额限制、缺少所需环境，或明确目标就是使用自有容量时，才升级到自有 Crabbox 容量：

```bash
CRABBOX_CAPACITY_REGIONS=eu-west-1,eu-west-2,eu-central-1,us-east-1,us-west-2 \
  pnpm crabbox:warmup -- --provider aws --class standard --market on-demand --idle-timeout 90m
pnpm crabbox:hydrate -- --provider aws --id <cbx_id-or-slug>
pnpm crabbox:run -- --provider aws --id <cbx_id-or-slug> --timing-json --shell -- "pnpm check:changed"
pnpm crabbox:stop -- --provider aws <cbx_id-or-slug>
```

在 AWS 压力下，除非任务真的需要 48xlarge 级 CPU，否则避免使用 `class=beast`。`beast` 请求从 192 vCPU 开始，是触发区域 EC2 Spot 或 On-Demand Standard 配额最容易的方式。仓库自有的 `.crabbox.yaml` 默认使用 `class: standard`、按需市场和 `capacity.hints: true`，因此经纪 AWS lease 会打印所选区域/市场、配额压力、Spot 回退以及高压级别警告。更重但范围更广的检查使用 `fast`，只有在 standard/fast 不够时才用 `large`，而 `beast` 仅用于异常的 CPU 密集型流水线，例如完整套件或所有插件的 Docker 矩阵、显式发布/阻断项验证，或高核性能剖析。不要将 `beast` 用于 `pnpm check:changed`、聚焦测试、仅文档工作、普通 lint/typecheck、小型 E2E 复现，或 Blacksmith 故障排查。使用 `--market on-demand` 进行容量诊断，这样 Spot 市场的波动不会混入信号。

`.crabbox.yaml` 负责 provider、同步以及 GitHub Actions 注入凭据的默认值。Crabbox 同步从不传输 `.git`，因此已注入凭据的 Actions 检出会保留自己的远程 Git 元数据，而不会同步维护者本地的 remotes 和对象存储；仓库配置还会额外排除本地运行/构建产物（例如 `.artifacts` 和测试报告），这些内容绝不应被传输。`.github/workflows/crabbox-hydrate.yml` 负责检出、Node/pnpm 设置、`origin/main` 获取，以及用于自有云 `crabbox run --id <cbx_id>` 命令的无密钥环境交接。

## 相关内容

- [安装概览](/install)
- [开发通道](/install/development-channels)
