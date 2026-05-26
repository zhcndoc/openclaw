---
summary: "CI 作业图、范围门控、发布总罩，以及本地命令等价项"
title: "CI 流水线"
read_when:
  - 你需要了解某个 CI 作业为什么运行或未运行
  - 你正在调试一个失败的 GitHub Actions 检查
  - 你正在协调一次发布验证运行或重跑
  - 你正在更改 ClawSweeper 派发或 GitHub 活动转发
---

OpenClaw CI 会在每次推送到 `main` 以及每个 pull request 上运行。`preflight` 作业会对差异进行分类，并在只改动了无关区域时关闭开销较大的流水线。手动 `workflow_dispatch` 运行会有意绕过智能范围划分，并展开完整图以用于发布候选和广泛验证。Android 流水线仍通过 `include_android` 保持为可选。仅发布使用的插件覆盖位于单独的 [`Plugin Prerelease`](#plugin-prerelease) 工作流中，并且只会从 [`Full Release Validation`](#full-release-validation) 或显式手动派发运行。

## 流水线概览

| Job                                | Purpose                                                                                                   | When it runs                       |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `preflight`                        | 检测仅文档变更、已变更范围、已变更扩展，并构建 CI 清单                                                     | 在非草稿的 push 和 PR 上始终运行   |
| `security-fast`                    | 私钥检测、通过 `zizmor` 进行工作流审计，以及生产 lockfile 审计                                              | 在非草稿的 push 和 PR 上始终运行   |
| `check-dependencies`               | 生产 Knip 仅依赖扫描加上未使用文件允许列表守卫                                                             | 与 Node 相关的变更                 |
| `build-artifacts`                  | 构建 `dist/`、Control UI、已构建 CLI 冒烟检查、内嵌构建产物检查，以及可复用产物                             | 与 Node 相关的变更                 |
| `checks-fast-core`                 | 快速 Linux 正确性通道，例如 bundled、protocol 和 CI 路由检查                                               | 与 Node 相关的变更                 |
| `checks-fast-contracts-plugins-*`  | 两个分片的插件契约检查                                                                                     | 与 Node 相关的变更                 |
| `checks-fast-contracts-channels-*` | 两个分片的 channel 契约检查                                                                                | 与 Node 相关的变更                 |
| `checks-node-core-*`               | 核心 Node 测试分片，不包括 channel、bundled、contract 和 extension 通道                                   | 与 Node 相关的变更                 |
| `check-*`                          | 分片的主要本地门控等价项：prod types、lint、guards、test types 和 strict smoke                              | 与 Node 相关的变更                 |
| `check-additional-*`               | 架构、分片边界/提示漂移、extension 守卫、包边界和运行时拓扑                                                 | 与 Node 相关的变更                 |
| `checks-node-compat-node22`        | Node 22 兼容性构建和 smoke 通道                                                                             | 发布的手动 CI 派发                 |
| `check-docs`                       | 文档格式化、lint 和断链检查                                                                                 | 文档已变更                         |
| `skills-python`                    | 面向 Python 支持技能的 Ruff + pytest                                                                        | 与 Python-skill 相关的变更        |
| `checks-windows`                   | Windows 特有的进程/路径测试，以及共享运行时导入说明符回归                                                   | 与 Windows 相关的变更             |
| `macos-node`                       | 使用共享构建产物的 macOS TypeScript 测试通道                                                                 | 与 macOS 相关的变更               |
| `macos-swift`                      | macOS 应用的 Swift lint、构建和测试                                                                          | 与 macOS 相关的变更               |
| `android`                          | 两个 flavor 的 Android 单元测试以及一个 debug APK 构建                                                     | 与 Android 相关的变更             |
| `test-performance-agent`           | 在可信活动之后每日进行 Codex 慢测试优化                                                                     | 主 CI 成功或手动派发               |
| `openclaw-performance`             | 使用 mock-provider、deep-profile 和 GPT 5.5 live 通道的每日/按需 Kova 运行时性能报告                      | 定时和手动派发                     |

## 先失败顺序

1. `preflight` 决定哪些通道根本存在。`docs-scope` 和 `changed-scope` 逻辑是这个作业中的步骤，而不是独立作业。
2. `security-fast`、`check-*`、`check-additional-*`、`check-docs` 和 `skills-python` 会快速失败，而不会等待更重的产物和平台矩阵作业。
3. `build-artifacts` 会与快速 Linux 通道重叠运行，因此下游消费者可以在共享构建准备好后尽快开始。
4. 然后更重的平台和运行时通道会展开：`checks-fast-core`、`checks-fast-contracts-plugins-*`、`checks-fast-contracts-channels-*`、`checks-node-core-*`、`checks-windows`、`macos-node`、`macos-swift` 和 `android`。

当同一个 PR 或 `main` 引用上有新的 push 到来时，GitHub 可能会把被取代的作业标记为 `cancelled`。除非同一引用的最新运行也失败，否则应将其视为 CI 噪声。矩阵作业使用 `fail-fast: false`，而 `build-artifacts` 会直接报告嵌入的 channel、core-support-boundary 和 gateway-watch 失败，而不是排队很小的验证器作业。自动 CI 并发键已版本化（`CI-v7-*`），因此 GitHub 端旧队列组里的僵尸任务不会无限期阻塞新的 main 运行。手动全套运行使用 `CI-manual-v1-*`，并且不会取消进行中的运行。

`ci-timings-summary` 作业会为每个非草稿 CI 运行上传一个紧凑的 `ci-timings-summary` 产物。它会记录当前运行的墙钟时间、排队时间、最慢作业和失败作业，因此 CI 健康检查无需反复抓取完整的 Actions 负载。`build-artifacts` 作业还会运行阻塞性的 startup-memory 冒烟检查，并上传一个 `startup-memory` 产物，其中包含 `--help`、`status --json` 和 `gateway status` 的每条命令 RSS 值。

## Real behavior proof

外部贡献者 PR 会从
`.github/workflows/real-behavior-proof.yml` 运行一个 `Real behavior proof` 门控。该工作流会检出受信任的
base commit，并且只评估 PR 正文；它不会执行来自
贡献者分支的代码。

该门控适用于不是仓库所有者、成员、
协作者或 bot 的 PR 作者。只要 PR 正文中包含一个
`Real behavior proof` 部分，并为以下字段填写了值，就会通过：

- `Behavior or issue addressed`
- `Real environment tested`
- `Exact steps or command run after this patch`
- `Evidence after fix`
- `Observed result after fix`
- `What was not tested`

证据必须展示补丁后在真实 OpenClaw
设置中的变更行为。截图、录屏、终端捕获、控制台输出、复制的实时输出、脱敏的运行时日志以及链接的产物都算。单元测试、mock、快照、lint、类型检查和 CI 结果可作为有用的辅助验证，
但它们本身并不能满足这个门控。

当检查失败时，请更新 PR 正文，而不是再推送另一个代码提交。
维护者只有在该 proof 门控不应
适用于该 PR 时，才能应用 `proof: override`。

## 范围与路由

范围逻辑位于 `scripts/ci-changed-scope.mjs`，并由 `src/scripts/ci-changed-scope.test.ts` 中的单元测试覆盖。手动派发会跳过变更范围检测，并让 preflight 清单表现得好像所有有范围的区域都已变更。

- **CI workflow edits** 会验证 Node CI 图以及工作流 linting，但不会仅凭自身强制触发 Windows、Android 或 macOS 原生构建；这些平台通道仍然只针对平台源代码变更。
- **`main` 上的 Docs push** 会由独立的 `Docs` 工作流检查，并使用与 CI 相同的 ClawHub 文档镜像，因此混合代码+文档的 push 不会再额外排队 CI 的 `check-docs` 分片。Pull request 和手动 CI 在文档变更时仍会从 CI 运行 `check-docs`。
- **TUI PTY** 是一个面向 TUI 变更的专门工作流。它会在 Linux Node 24 上对 `src/tui/**`、watch harness、package script、lockfile 和工作流编辑运行 `node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts`。必需通道使用确定性的 `TuiBackend` fixture；较慢的 `tui --local` smoke 可通过 `OPENCLAW_TUI_PTY_INCLUDE_LOCAL=1` 选择性启用，并且只 mock 外部模型端点。
- **仅 CI 路由编辑、选定的廉价 core-test fixture 编辑，以及窄范围的插件契约 helper/test-routing 编辑** 使用快速的仅 Node 清单路径：`preflight`、security，以及单个 `checks-fast-core` 任务。若变更仅限于该快速任务直接执行的路由或 helper 表面，这条路径会跳过构建产物、Node 22 兼容性、channel 契约、完整 core 分片、bundled-plugin 分片和额外守卫矩阵。
- **Windows Node 检查** 仅针对 Windows 特有的进程/路径封装、npm/pnpm/UI 运行器 helper、包管理器配置，以及执行该通道的 CI 工作流表面；无关源码、插件、安装冒烟和仅测试的变更仍然留在 Linux Node 通道上。

最慢的 Node 测试家族会被拆分或平衡，以便每个作业保持较小规模而不会过度预留 runner：插件契约和 channel 契约各自作为两个加权的 Blacksmith 支持分片运行，并带有标准 GitHub runner 回退；core 单元快速/支持通道分开运行；core 运行时基础设施被拆分为 state、process/config、shared，以及三个 cron 域分片；auto-reply 作为平衡的 worker 运行（其中 reply 子树拆分为 agent-runner、dispatch 和 commands/state-routing 分片）；agentic gateway/server 配置则拆分为 chat/auth/model/http-plugin/runtime/startup 通道，而不是等待构建产物。广泛的浏览器、QA、媒体和杂项插件测试使用各自专用的 Vitest 配置，而不是共享的插件兜底配置。include-pattern 分片使用 CI 分片名称记录 timing 条目，因此 `.artifacts/vitest-shard-timings.json` 可以区分整个配置与被过滤的分片。`check-additional-*` 会把 package-boundary 的编译/canary 工作放在一起，并将 runtime topology 架构与 gateway watch 覆盖分开；边界守卫列表被分为一个提示密集分片和一个针对其余守卫条带的组合分片，每个分片都会并发运行选定的独立守卫并打印每项检查的计时。昂贵的 Codex happy-path 提示快照漂移检查作为一个独立的额外作业运行，仅用于手动 CI 和影响提示的变更，因此普通无关的 Node 变更不会因为冷提示快照生成而被阻塞，而边界分片也能保持平衡，同时提示漂移仍然锁定到引发它的 PR；同一个标志还会跳过 built-artifact core support-boundary 分片中的提示快照 Vitest 生成。在 `build-artifacts` 内部，gateway watch、channel 测试和 core support-boundary 分片会在 `dist/` 和 `dist-runtime/` 已经构建完成后并发运行。

Android CI 会同时运行 `testPlayDebugUnitTest` 和 `testThirdPartyDebugUnitTest`，然后构建 Play debug APK。第三方 flavor 没有单独的 source set 或 manifest；其单元测试流水线仍会使用 SMS/call-log BuildConfig 标志编译该 flavor，同时避免在每次与 Android 相关的 push 上都重复进行 debug APK 打包作业。

`check-dependencies` 分片会运行 `pnpm deadcode:dependencies`（一个仅依赖的生产 Knip 扫描，固定到最新 Knip 版本，并为 `dlx` 安装禁用了 pnpm 的最小发布年龄），以及 `pnpm deadcode:unused-files`，它会将 Knip 的生产未使用文件发现结果与 `scripts/deadcode-unused-files.allowlist.mjs` 进行比较。未使用文件守卫会在 PR 新增了一个新的、未经审查的未使用文件，或者留下一个过时的允许列表条目时失败，同时保留 Knip 无法静态解析的有意动态插件、生成内容、构建内容、live-test 和包桥接表面。

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

## 手动派发

手动 CI 派发运行与正常 CI 相同的作业图，但会强制开启所有非 Android 范围的流水线：Linux Node 分片、捆绑插件分片、插件和通道契约分片、Node 22 兼容性、`check-*`、`check-additional-*`、已构建产物冒烟检查、文档检查、Python skills、Windows、macOS，以及 Control UI i18n。独立的手动 CI 派发仅在 `include_android=true` 时运行 Android；完整发布总控会通过传入 `include_android=true` 启用 Android。插件预发布静态检查、仅发布时使用的 `agentic-plugins` 分片、完整扩展批量扫描，以及插件预发布 Docker 流水线都不包含在 CI 中。Docker 预发布套件仅在 `Full Release Validation` 派发启用发布验证门禁并另外触发 `Plugin Prerelease` 工作流时运行。

手动运行使用唯一的并发组，因此发布候选的完整套件不会被同一 ref 上的另一次 push 或 PR 运行取消。可选的 `target_ref` 输入允许受信任的调用者针对某个分支、标签或完整 commit SHA 运行该图，同时使用所选派发 ref 的工作流文件。

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## 运行器

| Runner                           | Jobs                                                                                                                                                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | `preflight`、文档检查、Python skills、workflow-sanity、labeler、auto-response；install-smoke preflight 也使用 GitHub 托管的 Ubuntu，因此 Blacksmith 矩阵可以更早排队 |
| `blacksmith-4vcpu-ubuntu-2404`   | `CodeQL Critical Quality`、`security-fast`、较低权重的扩展分片、`checks-fast-core`、插件/通道契约分片、`checks-node-compat-node22`、`check-guards`、`check-prod-types` 和 `check-test-types` |
| `blacksmith-8vcpu-ubuntu-2404`   | Linux Node 测试分片、捆绑插件测试分片、`check-additional-*` 分片、`android`                                                                                                                             |
| `blacksmith-16vcpu-ubuntu-2404`  | `build-artifacts`、`check-lint`（对 CPU 的敏感度足以让 8 vCPU 的成本高于收益）；install-smoke Docker 构建（32-vCPU 的排队时间成本高于收益）                                                 |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                       |
| `blacksmith-6vcpu-macos-latest`  | `openclaw/openclaw` 上的 `macos-node`；fork 会回退到 `macos-latest`                                                                                                                                                 |
| `blacksmith-12vcpu-macos-latest` | `openclaw/openclaw` 上的 `macos-swift`；fork 会回退到 `macos-latest`                                                                                                                                                |

规范仓库 CI 会将 Blacksmith 作为默认运行器路径。在 `preflight` 期间，`scripts/ci-runner-labels.mjs` 会检查近期已排队和正在进行的 Actions 运行，以查找排队中的 Blacksmith 任务。如果某个特定的 Blacksmith 标签已经有排队任务，那么本次运行中会使用该确切标签的下游任务将回退到匹配的 GitHub 托管运行器（`ubuntu-24.04`、`windows-2025` 或 `macos-latest`）。同一 OS 家族中的其他 Blacksmith 规格仍保持其主标签。如果 API 探测失败，则不会应用回退。

## 本地对应项

```bash
pnpm changed:lanes                            # 检查 origin/main...HEAD 的本地 changed-lane 分类器
pnpm check:changed                            # 智能本地检查门禁：按边界 lane 进行已变更的类型检查/lint/guards
pnpm check                                    # 快速本地门禁：prod tsgo + 分片 lint + 并行快速 guards
pnpm check:test-types
pnpm check:timed                              # 与上面相同的门禁，但包含各阶段耗时
pnpm build:strict-smoke
pnpm check:architecture
pnpm test:gateway:watch-regression
node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts
pnpm test                                     # vitest 测试
pnpm test:changed                             # 低成本的智能变更 Vitest 目标
pnpm test:channels
pnpm test:contracts:channels
pnpm check:docs                               # 文档格式 + lint + 链接失效检查
pnpm build                                    # 当 CI 产物/冒烟检查重要时构建 dist
pnpm ci:timings                               # 汇总最近一次 origin/main push 的 CI 运行
pnpm ci:timings:recent                        # 比较最近成功的 main CI 运行
node scripts/ci-run-timings.mjs <run-id>      # 汇总总耗时、排队耗时和最慢作业
node scripts/ci-run-timings.mjs --latest-main # 忽略 issue/comment 噪音并选择 origin/main push CI
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

- `mock-provider`：在本地构建的运行时上进行 Kova 诊断场景测试，使用确定性的伪造 OpenAI 兼容认证。
- `mock-deep-profile`：对启动、网关和代理轮次热点进行 CPU/heap/trace 分析。
- `live-openai-candidate`：一次真实的 OpenAI `openai/gpt-5.5` 代理轮次，在 `OPENAI_API_KEY` 不可用时跳过。

`mock-provider` lane 在 Kova 通过后还会运行 OpenClaw 原生源代码探测：默认、hook 和 50 插件启动场景下的网关启动时间与内存；捆绑插件导入 RSS、重复的 mock-OpenAI `channel-chat-baseline` hello 循环，以及针对已启动网关的 CLI 启动命令。若针对被测试的 ref 存在上一次发布的 mock-provider 源报告，则源摘要会将当前 RSS 和 heap 值与该基线进行比较，并将较大的 RSS 增长标记为 `watch`。源探测的 Markdown 摘要位于报告包中的 `source/index.md`，其旁边是原始 JSON。

每条 lane 都会上传 GitHub artifacts。配置了 `CLAWGRIT_REPORTS_TOKEN` 时，工作流还会将 `report.json`、`report.md`、bundles、`index.md` 和源代码探测 artifacts 提交到 `openclaw/clawgrit-reports`，路径为 `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/`。当前 tested-ref 指针会写入为 `openclaw-performance/<tested-ref>/latest-<lane>.json`。

## 完整发布验证

`Full Release Validation` 是用于“在发布前运行一切”的手动总控工作流。它接受分支、标签或完整 commit SHA，使用该目标派发手动 `CI` 工作流，派发 `Plugin Prerelease` 用于仅发布的插件/包/静态/Docker 证明，并派发 `OpenClaw Release Checks` 用于安装冒烟检查、包接受度、跨 OS 包检查、QA Lab 一致性、Matrix 和 Telegram 流水线。稳定/默认运行会将详尽的 live/E2E 和 Docker 发布路径覆盖保留在 `run_release_soak=true` 之后；`release_profile=full` 会强制启用该 soak 覆盖，以便广泛的建议性验证仍保持广泛。使用 `rerun_group=all` 且 `release_profile=full` 时，它还会针对发布检查中的 `release-package-under-test` artifact 运行 `NPM Telegram Beta E2E`。发布后，传入 `release_package_spec` 可在 release checks、Package Acceptance、Docker、跨 OS 和 Telegram 之间复用已发布的 npm 包，而无需重新构建。仅当 Telegram 必须证明不同包时才使用 `npm_telegram_package_spec`。Codex 插件 live package lane 默认使用相同的已选状态：已发布的 `release_package_spec=openclaw@<tag>` 会派生出 `codex_plugin_spec=npm:@openclaw/codex@<tag>`，而 SHA/artifact 运行则会从所选 ref 打包 `extensions/codex`。对于自定义插件源，例如 `npm:`、`npm-pack:` 或 `git:` 规格，请显式设置 `codex_plugin_spec`。

参见 [完整发布验证](/reference/full-release-validation) 以了解
阶段矩阵、确切的工作流任务名称、配置差异、产物以及
定向重跑句柄。

`OpenClaw Release Publish` 是手动的变更型发布工作流。请在发布 tag 存在且
OpenClaw npm 预检已成功之后，从 `release/YYYY.M.D` 或 `main` 触发它。
它会验证 `pnpm plugins:sync:check`，
为所有可发布的插件包派发 `Plugin NPM Release`，
为同一个 release SHA 派发 `Plugin ClawHub Release`，然后才使用保存的 `preflight_run_id`
派发 `OpenClaw NPM Release`。

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

对于在快速变化分支上的固定 commit 证明，请使用辅助工具，而不是
`gh workflow run ... --ref main -f ref=<sha>`：

```bash
pnpm ci:full-release --sha <full-sha>
```

GitHub workflow dispatch refs 必须是分支或标签，而不是原始 commit SHA。
该辅助工具会在目标 SHA 上推送一个临时的 `release-ci/<sha>-...` 分支，
从该固定 ref 派发 `Full Release Validation`，验证每个子工作流的 `headSha`
都与目标一致，并在运行完成后删除该临时分支。若任一子工作流
在不同的 SHA 上运行，总控验证器也会失败。

`release_profile` 控制传入发布检查的 live/provider 广度。手动发布工作流默认为 `stable`；仅在你有意想要广泛的 advisory provider/media 矩阵时使用 `full`。`run_release_soak` 控制稳定/默认发布检查是否运行详尽的 live/E2E 和 Docker 发布路径 soak；`full` 会强制开启 soak。

- `minimum` 保留最快的 OpenAI/核心发布关键 lane。
- `stable` 会增加稳定的 provider/backend 集合。
- `full` 运行更广泛的 advisory provider/media 矩阵。

这个总控会记录已触发的子运行 id，而最终的 `Verify full validation` 任务会重新检查当前子运行的结论，并为每个子运行附加最慢任务表。如果某个子工作流被重新运行并变为绿色，只需重新运行父级验证器任务即可刷新总控结果和耗时摘要。

为恢复而设计，`Full Release Validation` 和 `OpenClaw Release Checks` 都接受 `rerun_group`。对发布候选使用 `all`，仅对正常的完整 CI 子流程使用 `ci`，仅对插件预发布子流程使用 `plugin-prerelease`，对所有发布子流程使用 `release-checks`，或者在总控上使用更窄的分组：`install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 或 `npm-telegram`。这使得在针对性修复后，失败的发布盒子重跑仍然保持有界。对于单个失败的跨 OS lane，可将 `rerun_group=cross-os` 与 `cross_os_suite_filter` 组合使用，例如 `windows/packaged-upgrade`；较长的跨 OS 命令会输出心跳行，而 packaged-upgrade 摘要会包含各阶段耗时。QA 发布检查 lane 仅具建议性，标准运行时工具覆盖门禁除外；当所需的 OpenClaw 动态工具从标准层摘要中漂移或消失时，该门禁会阻止通过。

`OpenClaw Release Checks` 使用受信任的工作流 ref 将所选 ref 一次性解析为 `release-package-under-test` tarball，然后将该 artifact 传递给跨 OS 检查和 Package Acceptance；当运行 soak 覆盖时，还会传递给 live/E2E 发布路径 Docker 工作流。这样可确保不同发布盒子之间的包字节一致，并避免在多个子作业中重复重新打包同一个候选版本。对于 Codex npm 插件 live lane，release checks 要么传递一个由 `release_package_spec` 派生的、匹配的已发布插件规格，要么传递操作员提供的 `codex_plugin_spec`，要么保持输入为空，以便 Docker 脚本对所选检出的 Codex 插件进行打包。

对于 `ref=main` 且 `rerun_group=all` 的重复 `Full Release Validation` 运行，会取代较旧的总控流程。父级监控器在父流程被取消时会取消它已经触发的任何子工作流，因此较新的 main 验证不会排在一个陈旧的两小时发布检查运行之后。发布分支/标签验证和定向重跑分组保持 `cancel-in-progress: false`。

## Live 和 E2E 分片

发布 live/E2E 子流程保留了广泛的原生 `pnpm test:live` 覆盖，但它通过 `scripts/test-live-shard.mjs` 以命名分片的方式运行，而不是一个串行任务：

- `native-live-src-agents`
- `native-live-src-gateway-core`
- 按 provider 过滤的 `native-live-src-gateway-profiles` 任务
- `native-live-src-gateway-backends`
- `native-live-test`
- `native-live-extensions-a-k`
- `native-live-extensions-l-n`
- `native-live-extensions-openai`
- `native-live-extensions-o-z-other`
- `native-live-extensions-xai`
- 拆分的音频/视频媒体分片以及按 provider 过滤的音乐分片

这样可以在保持相同文件覆盖范围的同时，让缓慢的 live provider 失败更容易重跑和诊断。聚合的 `native-live-extensions-o-z`、`native-live-extensions-media` 和 `native-live-extensions-media-music` 分片名称仍然适用于手动一次性重跑。

原生 live 媒体分片在 `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04` 中运行，该镜像由 `Live Media Runner Image` 工作流构建。该镜像预装了 `ffmpeg` 和 `ffprobe`；媒体任务只在 setup 前验证这些二进制文件。请将基于 Docker 的 live 套件保留在普通 Blacksmith 运行器上——容器任务不是启动嵌套 Docker 测试的合适位置。

基于 Docker 的 live 模型/backend 分片会针对所选提交使用单独共享的 `ghcr.io/openclaw/openclaw-live-test:<sha>` 镜像。live 发布工作流会先构建并推送该镜像一次，然后 Docker live model、按 provider 分片的 gateway、CLI backend、ACP bind 和 Codex harness 分片在 `OPENCLAW_SKIP_DOCKER_BUILD=1` 下运行。Gateway Docker 分片带有显式的脚本级 `timeout` 上限，低于工作流任务超时时间，因此卡住的容器或清理路径会快速失败，而不是消耗整个发布检查预算。如果这些分片独立重建完整的源 Docker 目标，那么发布运行就被配置错误了，并会在重复的镜像构建上浪费墙钟时间。

## 包接受

当问题是“这个可安装的 OpenClaw 包作为一个产品能正常工作吗？”时，请使用 `Package Acceptance`。它不同于普通 CI：普通 CI 验证源代码树，而包接受则通过用户在安装或更新后所经历的同一套 Docker E2E harness 来验证单个 tarball。

### 作业

1. `resolve_package` 检出 `workflow_ref`，解析出一个包候选，写入 `.artifacts/docker-e2e-package/openclaw-current.tgz`，写入 `.artifacts/docker-e2e-package/package-candidate.json`，将两者作为 `package-under-test` 工件上传，并在 GitHub step summary 中打印源码、workflow ref、package ref、版本、SHA-256 和 profile。
2. `docker_acceptance` 以 `ref=workflow_ref` 和 `package_artifact_name=package-under-test` 调用 `openclaw-live-and-e2e-checks-reusable.yml`。可复用工作流会下载该工件，在需要时校验 tarball 清单，为 package-digest Docker 镜像做准备，并针对该包而不是打包工作流检出内容运行所选的 Docker lanes。当某个 profile 选择了多个目标 `docker_lanes` 时，可复用工作流会先准备一次包和共享镜像，然后将这些 lanes 作为带有唯一工件的并行目标 Docker 作业分发出去。
3. `package_telegram` 可选地调用 `NPM Telegram Beta E2E`。当 `telegram_mode` 不是 `none` 且 Package Acceptance 已解析出一个包时，它会安装同一个 `package-under-test` 工件；独立的 Telegram 分发仍然可以安装已发布的 npm spec。
4. `summary` 会在包解析、Docker 接受，或可选的 Telegram lane 失败时使工作流失败。

### 候选来源

- `source=npm` 仅接受 `openclaw@beta`、`openclaw@latest`，或一个精确的 OpenClaw 发布版本，例如 `openclaw@2026.4.27-beta.2`。用于已发布的预发布/稳定版接受。
- `source=ref` 打包一个受信任的 `package_ref` 分支、标签或完整 commit SHA。解析器会获取 OpenClaw 分支/标签，验证所选提交可从仓库分支历史或发布标签到达，在分离的 worktree 中安装依赖，并使用 `scripts/package-openclaw-for-docker.mjs` 打包。
- `source=url` 下载一个公共 HTTPS `.tgz`；`package_sha256` 为必需项。该路径会拒绝 URL 凭证、非默认 HTTPS 端口、私有/内部/特殊用途主机名或解析出的 IP，以及重定向到同一公共安全策略之外的地址。
- `source=trusted-url` 从 `.github/package-trusted-sources.json` 中命名的受信任来源策略下载一个 HTTPS `.tgz`；`package_sha256` 和 `trusted_source_id` 为必需项。仅当维护者拥有的企业镜像或私有包仓库需要配置主机、端口、路径前缀、重定向主机或私有网络解析时才使用此项。如果策略声明了 bearer auth，工作流会使用固定的 `OPENCLAW_TRUSTED_PACKAGE_TOKEN` secret；URL 中嵌入的凭证仍会被拒绝。
- `source=artifact` 从 `artifact_run_id` 和 `artifact_name` 下载一个 `.tgz`；`package_sha256` 是可选的，但如果来自外部共享工件则应提供。

请将 `workflow_ref` 和 `package_ref` 分开。`workflow_ref` 是运行测试的受信任工作流/harness 代码。`package_ref` 是在 `source=ref` 时被打包的源代码提交。这样当前测试 harness 就可以验证较旧但受信任的源代码提交，而无需运行旧的工作流逻辑。

### 套件 profile

- `smoke` — `npm-onboard-channel-agent`, `gateway-network`, `config-reload`
- `package` — `npm-onboard-channel-agent`, `doctor-switch`, `update-channel-switch`, `skill-install`, `update-corrupt-plugin`, `upgrade-survivor`, `published-upgrade-survivor`, `update-restart-auth`, `plugins-offline`, `plugin-update`
- `product` — `package` plus `mcp-channels`, `cron-mcp-cleanup`, `openai-web-search-minimal`, `openwebui`
- `full` — 带有 OpenWebUI 的完整 Docker release-path chunks
- `custom` — 精确的 `docker_lanes`；当 `suite_profile=custom` 时为必需

`package` profile 使用离线插件覆盖，因此已发布包的验证不会受制于线上 ClawHub 可用性。可选的 Telegram lane 在 `NPM Telegram Beta E2E` 中重用 `package-under-test` 工件，而已发布的 npm spec 路径仍保留给独立分发使用。

关于专门的更新和插件测试策略，包括本地命令、Docker lanes、Package Acceptance 输入、发布默认值和失败排查，请参见 [Testing updates and plugins](/help/testing-updates-plugins)。

Release checks 调用 Package Acceptance 时使用 `source=artifact`、准备好的 release package 工件、`suite_profile=custom`、`docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update'`，以及 `telegram_mode=mock-openai`。这会让包迁移、更新、live ClawHub 技能安装、陈旧插件依赖清理、已配置插件安装修复、离线插件、plugin-update 和 Telegram 证明都基于同一个已解析的包 tarball 运行。在发布 beta 后，可在 Full Release Validation 或 OpenClaw Release Checks 上设置 `release_package_spec`，以便对已发布的 npm 包运行同样的矩阵而无需重新构建；只有当 Package Acceptance 需要一个与其余发布验证不同的包时，才设置 `package_acceptance_package_spec`。跨 OS 的 release checks 仍然覆盖特定于 OS 的 onboarding、安装器和平台行为；包/更新产品验证应从 Package Acceptance 开始。在阻塞型发布路径中，`published-upgrade-survivor` Docker lane 每次运行都会验证一个已发布包基线。在 Package Acceptance 中，解析出的 `package-under-test` tarball 始终是候选包，而 `published_upgrade_survivor_baseline` 选择回退的已发布基线，默认为 `openclaw@latest`；失败 lane 的重新运行命令会保留该基线。启用 `run_release_soak=true` 或 `release_profile=full` 的 Full Release Validation 会设置 `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` 和 `published_upgrade_survivor_scenarios=reported-issues`，以扩展到最近四个稳定 npm 版本，再加上固定的插件兼容性边界版本，以及用于 Feishu 配置、保留的 bootstrap/persona 文件、已配置的 OpenClaw 插件安装、tilde 日志路径和陈旧旧版插件依赖根的 issue 形状 fixture。多基线的 published-upgrade survivor 选择会按基线分片到单独的目标 Docker runner 作业中。单独的 `Update Migration` 工作流在问题是穷举式的已发布更新清理，而不是常规 Full Release CI 广度时，会使用带有 `all-since-2026.4.23` 和 `plugin-deps-cleanup` 的 `update-migration` Docker lane。本地聚合运行可以通过 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` 传递精确的包 spec，通过 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 保持单一路径，例如 `openclaw@2026.4.15`，或通过 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` 设置场景矩阵。已发布的 lane 会使用内置的 `openclaw config set` 命令配方配置基线，在 `summary.json` 中记录配方步骤，并在 Gateway 启动后探测 `/healthz`、`/readyz` 以及 RPC 状态。Windows packaged 和 installer fresh lanes 还会验证已安装的包可以从原始绝对 Windows 路径导入 browser-control override。OpenAI 跨 OS agent-turn smoke 在设置了 `OPENCLAW_CROSS_OS_OPENAI_MODEL` 时默认使用它，否则使用 `openai/gpt-5.5`，因此安装和 gateway 证明会留在 GPT-5 测试模型上，同时避免 GPT-4.x 默认值。

### 旧版兼容窗口

Package Acceptance 对已发布包提供有边界的旧版兼容窗口。对于 `2026.4.25` 及之前的包，包括 `2026.4.25-beta.*`，可以使用兼容路径：

- `dist/postinstall-inventory.json` 中已知的私有 QA 条目可以指向 tarball 中未包含的文件；
- 当包未暴露该标志时，`doctor-switch` 可以跳过 `gateway install --wrapper` 持久化子用例；
- `update-channel-switch` 可以从 tarball 派生的 fake git fixture 中清理缺失的 pnpm `patchedDependencies`，并且可以记录缺失的持久化 `update.channel`；
- plugin smokes 可以读取旧版 install-record 位置，或接受缺失的 marketplace install-record 持久化；
- `plugin-update` 可以允许配置元数据迁移，同时仍要求 install record 和 no-reinstall 行为保持不变。

已发布的 `2026.4.26` 包也可能会对已经发布出去的本地构建元数据 stamp 文件发出警告。更晚的包必须满足现代契约；相同条件会导致失败，而不是警告或跳过。

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

# 使用当前 harness 打包并验证一个 release 分支。
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=ref \
  -f package_ref=release/YYYY.M.D \
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

独立的 `Install Smoke` 工作流通过自己的 `preflight` 作业复用同一范围脚本。它将 smoke 覆盖拆分为 `run_fast_install_smoke` 和 `run_full_install_smoke`。

- **快速路径** 适用于触及 Docker/package 表面、捆绑插件 package/manifest 变更，或 Docker smoke 作业会执行到的核心插件/channel/gateway/Plugin SDK 表面的拉取请求。仅源代码层面的捆绑插件改动、仅测试改动和仅文档改动不会占用 Docker worker。快速路径会先构建一次根 Dockerfile 镜像，检查 CLI，运行 agents delete shared-workspace CLI smoke，运行容器 gateway-network e2e，验证捆绑扩展 build arg，并在 240 秒的聚合命令超时下运行受限的捆绑插件 Docker profile（每个场景的 Docker run 会单独设上限）。
- **完整路径** 为夜间定时运行、手动分发、workflow-call 发布检查，以及真正触及 installer/package/Docker 表面的拉取请求保留 QR package install 和 installer Docker/update 覆盖。在完整模式下，install-smoke 会准备或复用一个目标 SHA 的 GHCR 根 Dockerfile smoke 镜像，然后将 QR package install、根 Dockerfile/gateway smoke、installer/update smoke 以及快速捆绑插件 Docker E2E 作为独立作业运行，这样 installer 工作就不必排在根镜像 smoke 后面等待。

`main` 推送（包括合并提交）不会强制进入完整路径；当变更范围逻辑在 push 场景下要求完整覆盖时，工作流仍保持快速 Docker smoke，并将完整的 install smoke 留给夜间或发布验证。

较慢的 Bun global install image-provider smoke 由 `run_bun_global_install_smoke` 单独门控。它会在夜间计划任务和 release checks 工作流中运行，手动 `Install Smoke` 分发也可以选择启用它，但拉取请求和 `main` 推送不会运行它。QR 和 installer 的 Docker 测试保留各自聚焦安装的 Dockerfile。

## 本地 Docker E2E

`pnpm test:docker:all` 会预构建一个共享的 live-test 镜像，打包一次 OpenClaw 作为 npm tarball，并构建两个共享的 `scripts/e2e/Dockerfile` 镜像：

- 一个裸的 Node/Git 运行器，用于 installer/update/plugin-dependency 这些 lane；
- 一个功能性镜像，将同一个 tarball 安装到 `/app` 中，用于普通功能 lane。

Docker lane 定义位于 `scripts/lib/docker-e2e-scenarios.mjs`，规划器逻辑位于 `scripts/lib/docker-e2e-plan.mjs`，运行器只执行所选计划。调度器通过 `OPENCLAW_DOCKER_E2E_BARE_IMAGE` 和 `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE` 为每个 lane 选择镜像，然后在 `OPENCLAW_SKIP_DOCKER_BUILD=1` 下运行这些 lanes。

### 可调参数

| 变量                                  | 默认值  | 用途                                                                                          |
| ------------------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10      | 普通 lanes 的主池槽位数。                                                                      |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10      | 对 provider 敏感的尾池槽位数。                                                                 |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9       | 并发 live lane 上限，避免 provider 限流。                                                     |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 10      | 并发 npm install lane 上限。                                                                  |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7       | 并发多服务 lane 上限。                                                                         |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000    | lane 启动之间的错峰时间，用于避免 Docker daemon 创建风暴；设为 `0` 则不进行错峰。           |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000 | 每个 lane 的兜底超时时间（120 分钟）；被选中的 live/tail lanes 会使用更严格的上限。        |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | 未设置   | `1` 时仅打印调度器计划，不运行 lanes。                                                         |
| `OPENCLAW_DOCKER_ALL_LANES`            | 未设置   | 逗号分隔的精确 lane 列表；会跳过 cleanup smoke，以便代理可以复现某个失败 lane。              |

比其有效上限更重的 lane 仍然可以从空池中启动，然后会单独运行直到释放容量。本地聚合流程会预检 Docker、移除过时的 OpenClaw E2E 容器、输出活跃 lane 状态、持久化 lane 耗时以支持最长优先排序，并且默认在首次失败后停止调度新的池化 lanes。

### 可复用的 live/E2E 工作流

可复用的 live/E2E 工作流会询问 `scripts/test-docker-all.mjs --plan-json`，以确定需要哪种 package、镜像类型、live 镜像、lane 和凭据覆盖范围。随后 `scripts/docker-e2e.mjs` 会将该计划转换为 GitHub 输出和摘要。它要么通过 `scripts/package-openclaw-for-docker.mjs` 打包 OpenClaw，要么下载当前运行的 package artifact，要么从 `package_artifact_run_id` 下载 package artifact；校验 tarball 清单；当计划需要已安装 package 的 lanes 时，通过 Blacksmith 的 Docker layer cache 构建并推送带有 package-digest 标签的 bare/functional GHCR Docker E2E 镜像；并且会复用提供的 `docker_e2e_bare_image`/`docker_e2e_functional_image` 输入或现有的 package-digest 镜像，而不是重新构建。Docker 镜像拉取会以每次尝试 180 秒的有界超时进行重试，因此卡住的 registry/cache 流会快速重试，而不是消耗 CI 关键路径的大部分时间。

### Release-path 分块

Release Docker 覆盖会运行更小的分块作业，并设置 `OPENCLAW_SKIP_DOCKER_BUILD=1`，这样每个分块只拉取它需要的镜像类型，并通过同一个加权调度器执行多个 lanes：

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-anthropic | package-update-core | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h`

当前的 release Docker 分块为 `core`、`package-update-openai`、`package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、`plugins-runtime-services`，以及 `plugins-runtime-install-a` 到 `plugins-runtime-install-h`。`package-update-openai` 包含 live Codex 插件 package lane，它会安装候选 OpenClaw package，从 `codex_plugin_spec` 或同一 ref 的 tarball 安装 Codex 插件并显式批准 Codex CLI 安装，运行 Codex CLI 预检，然后针对 OpenAI 运行多个同会话的 OpenClaw agent 回合。`plugins-runtime-core`、`plugins-runtime` 和 `plugins-integrations` 仍然是聚合的插件/runtime 别名。`install-e2e` lane 别名仍然是两个 provider installer lanes 的聚合手动重跑别名。

当完整的 release-path 覆盖需要 OpenWebUI 时，它会被并入 `plugins-runtime-services`；只有在仅 OpenWebUI 的派发中，才保留独立的 `openwebui` 分块。捆绑渠道的更新 lanes 会在遇到临时 npm 网络故障时重试一次。

每个分块都会上传 `.artifacts/docker-tests/`，其中包含 lane 日志、耗时、`summary.json`、`failures.json`、阶段耗时、调度器计划 JSON、慢 lane 表，以及每个 lane 的重跑命令。工作流的 `docker_lanes` 输入会针对已准备好的镜像运行所选 lanes，而不是运行分块作业，这样可以将失败 lane 的调试范围限制在一个定向的 Docker 作业中，并为该次运行准备、下载或复用 package artifact；如果所选 lane 是 live Docker lane，则定向作业会在本地构建 live-test 镜像用于该次重跑。生成的每个 lane 的 GitHub 重跑命令会在这些值存在时包含 `package_artifact_run_id`、`package_artifact_name` 和已准备好的镜像输入，因此失败的 lane 可以复用失败运行中的确切 package 和镜像。

```bash
pnpm test:docker:rerun <run-id>      # 下载 Docker 工件并打印合并的/按 lane 定向的重跑命令
pnpm test:docker:timings <summary>   # 慢 lane 和阶段关键路径摘要
```

定时的 live/E2E 工作流会每天运行完整的 release-path Docker 套件。

## 插件预发布

`Plugin Prerelease` 是更昂贵的产品/package 覆盖，因此它是一个由 `Full Release Validation` 或显式操作者派发的独立工作流。普通 pull request、`main` 推送以及独立的手动 CI 派发都不会运行这套检查。它会在八个 extension worker 之间平衡捆绑插件测试；这些 extension shard 作业一次最多运行两个 plugin config group，每个 group 使用一个 Vitest worker，并配置更大的 Node heap，这样 import-heavy 的插件批次就不会创建额外的 CI 作业。仅限发布的 Docker prerelease 路径会将目标 Docker lanes 分成小批次，以避免为一到三分钟的作业预留几十个 runner。该工作流还会从 `@openclaw/plugin-inspector` 上传一个信息性 `plugin-inspector-advisory` artifact；inspector 发现结果仅作为分流输入，不会改变阻塞性的 Plugin Prerelease 门禁。

## QA 实验室

QA 实验室在主智能作用域工作流之外拥有专用的 CI lanes。Agentic parity 被嵌套在更广泛的 QA 和发布 harness 中，而不是独立的 PR 工作流。若需要 parity 随更广泛的验证运行一起执行，请使用 `Full Release Validation` 并设置 `rerun_group=qa-parity`。

- `QA-Lab - All Lanes` 工作流在 `main` 上每晚运行一次，也支持手动派发；它会将 mock parity lane、live Matrix lane 以及 live Telegram 和 Discord lanes 作为并行作业展开。live 作业使用 `qa-live-shared` 环境，Telegram/Discord 使用 Convex leases。

发布检查会使用确定性的 mock provider 和 mock 认证模型（`mock-openai/gpt-5.5` 与 `mock-openai/gpt-5.5-alt`）运行 Matrix 和 Telegram live transport lanes，从而将 channel 合约与 live model 延迟以及正常的 provider-plugin 启动隔离开来。live transport gateway 禁用 memory search，因为 QA parity 会单独覆盖 memory 行为；provider 连通性则由单独的 live model、原生 provider 和 Docker provider 套件覆盖。

Matrix 在定时和 release gate 中使用 `--profile fast`，仅当检出的 CLI 支持时才添加 `--fail-fast`。CLI 默认值和手动工作流输入都保持为 `all`；手动 `matrix_profile=all` 派发始终将完整的 Matrix 覆盖拆分为 `transport`、`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli` 作业。

`OpenClaw Release Checks` 还会在 release 批准前运行 release-critical 的 QA Lab lanes；其 QA parity gate 会将 candidate 和 baseline packs 作为并行 lane 作业运行，然后将两个 artifact 下载到一个小型报告作业中，以进行最终 parity 比较。

对于普通 PR，请遵循作用域化的 CI/检查证据，而不要把 parity 当作必需状态。

## CodeQL

`CodeQL` 工作流有意设计为一个窄范围的首轮安全扫描器，而不是对整个仓库进行全面扫描。每日、手动以及非草稿 pull request 的保护运行，会扫描 Actions workflow 代码，以及风险最高的 JavaScript/TypeScript 表面，并使用按 high/critical `security-severity` 过滤的高置信度安全查询。

pull request 保护保持轻量：它只会在 `.github/actions`、`.github/codeql`、`.github/workflows`、`packages` 或 `src` 下有变更时启动，并运行与定时工作流相同的高置信度安全矩阵。Android 和 macOS CodeQL 不包含在 PR 默认项中。

### 安全类别

| 类别                                              | 表面                                                                                                                               |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | 认证、密钥、sandbox、cron 和 gateway 基线                                                                                           |
| `/codeql-security-high/channel-runtime-boundary`  | 核心 channel 实现契约，以及 channel plugin runtime、gateway、Plugin SDK、secrets、audit 触点                                        |
| `/codeql-security-high/network-ssrf-boundary`     | 核心 SSRF、IP 解析、网络防护、web-fetch 和 Plugin SDK SSRF 策略表面                                                                |
| `/codeql-security-high/mcp-process-tool-boundary` | MCP servers、进程执行辅助工具、外发交付，以及 agent 工具执行门禁                                                                   |
| `/codeql-security-high/plugin-trust-boundary`     | 插件安装、加载器、manifest、registry、包管理器安装、源加载，以及 Plugin SDK 包契约信任表面                                         |

### 平台特定的安全分片

- `CodeQL Android Critical Security` — 定时 Android 安全分片。它在工作流可接受的最小 Blacksmith Linux runner 上手动构建 Android 应用以供 CodeQL 使用。产物上传到 `/codeql-critical-security/android`。
- `CodeQL macOS Critical Security` — 每周/手动 macOS 安全分片。它在 Blacksmith macOS 上手动构建 macOS 应用供 CodeQL 使用，从上传的 SARIF 中过滤掉依赖构建结果，并上传到 `/codeql-critical-security/macos`。之所以不放在每日默认项中，是因为即使在干净状态下，macOS 构建也会主导运行时间。

### Critical Quality 类别

`CodeQL Critical Quality` 是相应的非安全分片。它仅在较小的 Blacksmith Linux runner 上，针对狭窄的高价值表面运行 error-severity、非安全的 JavaScript/TypeScript 质量查询。其 pull request 保护故意比定时配置更小：非草稿 PR 只运行匹配的 `agent-runtime-boundary`、`config-boundary`、`core-auth-secrets`、`channel-runtime-boundary`、`gateway-runtime-boundary`、`memory-runtime-boundary`、`mcp-process-runtime-boundary`、`provider-runtime-boundary`、`session-diagnostics-boundary`、`plugin-boundary`、`plugin-sdk-package-contract` 和 `plugin-sdk-reply-runtime` 分片，用于 agent command/model/tool 执行和 reply dispatch 代码、config schema/migration/IO 代码、auth/secrets/sandbox/security 代码、核心 channel 和捆绑 channel plugin runtime、gateway protocol/server-method、memory runtime/SDK glue、MCP/process/outbound delivery、provider runtime/model catalog、session diagnostics/delivery queues、plugin loader、Plugin SDK/package-contract，或 Plugin SDK reply runtime 的变更。CodeQL 配置和质量工作流变更会运行全部 12 个 PR 质量分片。

手动派发接受：

```
profile=all|agent-runtime-boundary|config-boundary|core-auth-secrets|channel-runtime-boundary|gateway-runtime-boundary|memory-runtime-boundary|mcp-process-runtime-boundary|plugin-boundary|plugin-sdk-package-contract|plugin-sdk-reply-runtime|provider-runtime-boundary|session-diagnostics-boundary
```

这些窄范围配置是用于单独运行一个质量分片的教学/迭代钩子。

| 类别                                                    | 表面                                                                                                                                                           |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-critical-quality/core-auth-secrets`            | 认证、密钥、sandbox、cron 和 gateway 安全边界代码                                                                                                                |
| `/codeql-critical-quality/config-boundary`              | 配置 schema、迁移、规范化和 IO 契约                                                                                                                               |
| `/codeql-critical-quality/gateway-runtime-boundary`     | gateway protocol schemas 和 server method 契约                                                                                                                   |
| `/codeql-critical-quality/channel-runtime-boundary`     | 核心 channel 和捆绑 channel plugin 实现契约                                                                                                                      |
| `/codeql-critical-quality/agent-runtime-boundary`       | 命令执行、模型/provider 派发、自动回复派发和队列，以及 ACP control-plane runtime 契约                                                                            |
| `/codeql-critical-quality/mcp-process-runtime-boundary` | MCP servers 和工具桥接、进程监管辅助工具，以及外发交付契约                                                                                                       |
| `/codeql-critical-quality/memory-runtime-boundary`      | Memory host SDK、memory runtime 外观、memory Plugin SDK 别名、memory runtime 激活 glue，以及 memory doctor 命令                                                 |
| `/codeql-critical-quality/session-diagnostics-boundary` | 回复队列内部实现、session delivery queues、外发 session 绑定/交付辅助工具、诊断事件/log bundle 表面，以及 session doctor CLI 契约                              |
| `/codeql-critical-quality/plugin-sdk-reply-runtime`     | Plugin SDK 入站回复派发、reply payload/chunking/runtime 辅助工具、channel reply 选项、delivery queues，以及 session/thread 绑定辅助工具                       |
| `/codeql-critical-quality/provider-runtime-boundary`    | 模型目录规范化、provider 认证与发现、provider runtime 注册、provider 默认值/目录，以及 web/search/fetch/embedding registry                                  |
| `/codeql-critical-quality/ui-control-plane`             | 控制 UI 引导、本地持久化、gateway 控制流，以及 task control-plane runtime 契约                                                                                  |
| `/codeql-critical-quality/web-media-runtime-boundary`   | 核心 web fetch/search、media IO、media 理解、图像生成以及 media 生成 runtime 契约                                                                             |
| `/codeql-critical-quality/plugin-boundary`              | 加载器、registry、公共表面，以及 Plugin SDK 入口点契约                                                                                                           |
| `/codeql-critical-quality/plugin-sdk-package-contract`  | 已发布包端的 Plugin SDK 源代码和插件包契约辅助工具                                                                                                                |

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

本地变更通道路由逻辑位于 `scripts/changed-lanes.mjs`，并由 `scripts/check-changed.mjs` 执行。这个本地检查门在架构边界方面比宽泛的 CI 平台范围更严格：

- core 生产变更运行 core prod 和 core test typecheck，以及 core lint/guards；
- core 仅测试变更只运行 core test typecheck 和 core lint；
- extension 生产变更运行 extension prod 和 extension test typecheck，以及 extension lint；
- extension 仅测试变更只运行 extension test typecheck 和 extension lint；
- public Plugin SDK 或 plugin-contract 变更会扩展到 extension typecheck，因为 extensions 依赖这些 core 合约（Vitest extension 全量扫描仍然属于明确的测试工作）；
- 仅发布元数据版本提升会运行定向的 version/config/root-dependency 检查；
- 未知的 root/config 变更会安全失败为所有检查通道。

本地变更测试路由位于 `scripts/test-projects.test-support.mjs`，其设计上比 `check:changed` 更便宜：直接的测试编辑运行自身，源代码编辑优先使用显式映射，然后是同级测试和 import-graph 依赖项。共享的 group-room 交付配置就是显式映射之一：对 group visible-reply 配置、source reply delivery mode 或 message-tool system prompt 的更改，会通过 core reply tests，以及 Discord 和 Slack delivery 回归测试，从而确保共享默认值的变更在第一次 PR push 之前就失败。仅当变更在整个 harness 范围内足够大，以至于这种廉价的映射集合不能作为可靠代理时，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。

## Testbox 验证

Crabbox 是仓库自有的远程 box 封装器，用于维护者的 Linux 证明。当检查范围对本地编辑循环来说过于宽泛、需要 CI 一致性、需要 secrets、Docker、包通道、可复用 box 或远程日志时，请在仓库根目录使用它。普通的 OpenClaw 后端是 `blacksmith-testbox`；自有的 AWS/Hetzner 容量则作为 Blacksmith 故障、配额问题或显式自有容量测试时的备选方案。

由 Crabbox 驱动的 Blacksmith 会依次执行 warm、claim、sync、run、report 和 clean up 的一次性 Testbox。内置的同步健全性检查会在所需根文件（例如 `pnpm-lock.yaml`）消失，或 `git status --short` 显示至少 200 个已跟踪删除时快速失败。对于有意的大规模删除 PR，请为远程命令设置 `OPENCLAW_TESTBOX_ALLOW_MASS_DELETIONS=1`。

如果同步阶段停留超过五分钟且在 sync 之后没有输出，Crabbox 也会终止本地 Blacksmith CLI 调用。设置 `CRABBOX_BLACKSMITH_SYNC_TIMEOUT_MS=0` 可以禁用该保护，或者在本地差异异常巨大时使用更大的毫秒值。

首次运行前，请在仓库根目录检查该封装器：

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

仓库封装器会拒绝不再声明 `blacksmith-testbox` 的过期 Crabbox 二进制。即使 `.crabbox.yaml` 有自有云默认值，也要显式传入提供商。在 Codex 工作树或链接/稀疏检出中，避免使用本地 `pnpm crabbox:run` 脚本，因为 pnpm 可能会在 Crabbox 启动前协调依赖；请改为直接调用 node 封装器：

```bash
node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox --timing-json --shell -- "pnpm test <path-or-filter>"
```

变更门控：

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
  "env CI=1 NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
```

聚焦测试重跑：

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
  "env CI=1 NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm test <path-or-filter>"
```

完整套件：

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
  "env CI=1 NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm test"
```

读取最终的 JSON 摘要。有用的字段是 `provider`、`leaseId`、`syncDelegated`、`exitCode`、`commandMs` 和 `totalMs`。一次性的 Blacksmith 支持的 Crabbox 运行应该会自动停止 Testbox；如果运行被中断或清理情况不明确，请检查活动 box，并且只停止你创建的 box：

```bash
blacksmith testbox list --all
blacksmith testbox status --id <tbx_id>
blacksmith testbox stop --id <tbx_id>
```

只有在你明确需要在同一个已预热 box 上运行多个命令时才使用复用：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox --id <tbx_id> --no-sync --timing-json --shell -- "pnpm test <path-or-filter>"
pnpm crabbox:stop -- <tbx_id>
```

如果 Crabbox 这一层有问题但 Blacksmith 本身可用，则仅将 Blacksmith 直接用于诊断，例如 `list`、`status` 和清理。先修复 Crabbox 路径，再把直接的 Blacksmith 运行视为维护者证明。

如果 `blacksmith testbox list --all` 和 `blacksmith testbox status` 能工作，但新的 warmup 在几分钟后仍处于 `queued`，既没有 IP 也没有 Actions 运行 URL，则应将其视为 Blacksmith 提供商、队列、计费或组织限制压力。停止你创建的 queued id，避免再启动更多 Testbox，并把证明转移到下面的自有 Crabbox 容量路径，同时让别人检查 Blacksmith 仪表板、计费和组织限制。

只有在 Blacksmith 宕机、受配额限制、缺少所需环境，或明确目标就是使用自有容量时，才升级到自有 Crabbox 容量：

```bash
CRABBOX_CAPACITY_REGIONS=eu-west-1,eu-west-2,eu-central-1,us-east-1,us-west-2 \
  pnpm crabbox:warmup -- --provider aws --class standard --market on-demand --idle-timeout 90m
pnpm crabbox:hydrate -- --id <cbx_id-or-slug>
pnpm crabbox:run -- --id <cbx_id-or-slug> --timing-json --shell -- "env NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
pnpm crabbox:stop -- <cbx_id-or-slug>
```

在 AWS 压力下，除非任务确实需要 48xlarge 级别的 CPU，否则避免使用 `class=beast`。`beast` 请求从 192 vCPU 开始，是最容易触发区域 EC2 Spot 或 On-Demand Standard 配额限制的方式。仓库自有的 `.crabbox.yaml` 默认使用 `standard`、多个容量区域以及 `capacity.hints: true`，因此经纪的 AWS 租约会打印所选区域/市场、配额压力、Spot 回退以及高压等级警告。对于更重的广泛检查使用 `fast`，只有在 `standard`/`fast` 不够时才用 `large`，而 `beast` 仅用于异常的 CPU 密集型通道，例如完整套件或所有插件的 Docker 矩阵、显式的发布/阻断验证，或高核性能分析。不要将 `beast` 用于 `pnpm check:changed`、聚焦测试、仅文档工作、普通 lint/typecheck、小型 E2E 复现，或 Blacksmith 故障分流。使用 `--market on-demand` 进行容量诊断，这样就不会把 Spot 市场波动混入信号中。

`.crabbox.yaml` 为自有云通道管理 provider、同步以及 GitHub Actions 水合默认值。它排除了本地 `.git`，这样水合后的 Actions 检出会保留自己的远程 Git 元数据，而不是同步维护者本地的 remotes 和对象存储，并且它排除了本地运行时/构建产物，这些内容绝不应被传输。`.github/workflows/crabbox-hydrate.yml` 管理检出、Node/pnpm 设置、`origin/main` 拉取，以及用于自有云 `crabbox run --id <cbx_id>` 命令的非机密环境交接。

## 相关内容

- [安装概览](/install)
- [开发通道](/install/development-channels)
