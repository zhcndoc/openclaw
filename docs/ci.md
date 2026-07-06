---
summary: "CI 作业图、范围门控、发布总罩，以及本地命令等价项"
title: "CI 流水线"
read_when:
  - 你需要了解某个 CI 作业为什么运行或未运行
  - 你正在调试一个失败的 GitHub Actions 检查
  - 你正在协调一次发布验证运行或重跑
  - 你正在更改 ClawSweeper 派发或 GitHub 活动转发
---

OpenClaw CI 会在推送到 `main` 时运行（触发时会忽略 Markdown 和 `docs/**` 路径），在非草稿 Pull Request 上运行（忽略仅 CHANGELOG 的差异），以及在手动触发时运行。规范的 `main` 推送首先会经过一个 90 秒的托管 runner 接纳窗口；当更新的提交到达时，`CI` 并发组会取消该等待中的运行，因此连续合并不会让每次都登记完整的 Blacksmith 矩阵。Pull Request 和手动触发会跳过等待。随后 `preflight` 作业会对 diff 进行分类，并在仅有无关区域发生更改时关闭昂贵的流水线。手动的 `workflow_dispatch` 运行会有意绕过智能范围控制，并展开完整图谱，用于发布候选和广泛验证。Android 流水线通过 `include_android`（或 `release_gate` 输入）保持为可选启用。仅发布相关的插件覆盖位于单独的 [`Plugin Prerelease`](#plugin-prerelease) 工作流中，并且只会从 [`Full Release Validation`](#full-release-validation) 或显式的手动触发中运行。

## 流水线概览

| Job                                | 目的                                                                                                                                                                                             | 运行时间                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `preflight`                        | 检测仅文档变更、变更范围、变更扩展，并构建 CI 清单                                                                                                                                                | 非草稿状态的 push 和 PR 时始终运行               |
| `runner-admission`                 | 在 Blacksmith 工作注册之前，为规范的 `main` 分支 push 提供托管的 90 秒去抖                                                                                                                      | 每次 CI 运行都执行；仅在规范的 `main` 分支 push 时休眠 |
| `security-fast`                    | 私钥检测、通过 `zizmor` 进行变更工作流审计，以及生产锁文件审计                                                                                                                                    | 非草稿状态的 push 和 PR 时始终运行               |
| `pnpm-store-warmup`                | 在不阻塞 Linux Node 分片的情况下，预热由锁文件固定版本的 pnpm store 缓存                                                                                                                         | 选中了 Node 或 docs-check 任务线                 |
| `build-artifacts`                  | 构建 `dist/`、Control UI、构建后的 CLI 冒烟检查、启动内存，以及嵌入式构建产物检查                                                                                                                  | 与 Node 相关的变更                               |
| `checks-fast-core`                 | 快速 Linux 正确性任务线：bundled + protocol、QA Smoke CI、Bun 启动器，以及 CI 路由快速任务                                                                                                       | 与 Node 相关的变更                               |
| `checks-fast-contracts-plugins-*`  | 两个加权的插件契约分片                                                                                                                                                                           | 与 Node 相关的变更                               |
| `checks-fast-contracts-channels-*` | 两个加权的通道契约分片                                                                                                                                                                           | 与 Node 相关的变更                               |
| `checks-node-*`                    | 核心 Node 测试分片，不包括通道、bundled、契约和扩展任务线                                                                                                                                         | 与 Node 相关的变更                               |
| `check-*`                          | 分片后的本地主门禁等价任务：guards、shrinkwrap、bundled-channel 配置元数据、生产类型、lint、依赖、测试类型                                                                                          | 与 Node 相关的变更                               |
| `check-additional-*`               | 边界检查条带（包括 prompt 快照漂移）、session accessor/transcript reader 边界、扩展 lint 分组、包边界编译/canary，以及运行时拓扑架构                                                           | 与 Node 相关的变更                               |
| `checks-node-compat-node22`        | Node 22 兼容性构建和冒烟任务线                                                                                                                                                                   | 发布的手动 CI 触发                               |
| `check-docs`                       | 文档格式化、lint 和断链检查                                                                                                                                                                       | 文档变更（PR 和手动触发）                        |
| `native-i18n`                      | 原生应用、Android 和 Apple 的 i18n 清单检查                                                                                                                                                     | 与原生 i18n 相关的变更                           |
| `skills-python`                    | Python 驱动技能的 Ruff + pytest                                                                                                                                                                  | 与 Python 技能相关的变更                         |
| `checks-windows`                   | Windows 特定的进程/路径测试，以及共享运行时导入说明符回归测试                                                                                                                                   | 与 Windows 相关的变更                            |
| `macos-node`                       | 聚焦的 macOS TypeScript 测试：launchd、Homebrew、运行时路径、打包脚本、进程组包装器                                                                                                              | 与 macOS 相关的变更                             |
| `macos-swift`                      | macOS 应用的 Swift lint、构建和测试                                                                                                                                                               | 与 macOS 相关的变更                             |
| `ios-build`                        | Xcode 项目生成以及 iOS 应用模拟器构建                                                                                                                                                             | iOS 应用、共享应用套件或 Swabble 变更           |
| `android`                          | 两种 flavor 的 Android 单元测试，以及一个 debug APK 构建                                                                                                                                         | 与 Android 相关的变更                            |
| `test-performance-agent`           | 独立工作流：在受信任活动之后，每日进行 Codex 慢测试优化                                                                                                                                          | 主 CI 成功或手动触发                             |
| `openclaw-performance`             | 独立工作流：每日/按需的 Kova 运行时性能报告，包含 mock-provider、deep-profile 和 GPT 5.5 live 任务线                                                                                             | 定时和手动触发                                   |

## 先失败顺序

1. `runner-admission` 仅等待规范的 `main` 推送；更新的推送会在 Blacksmith 注册之前取消运行。
2. `preflight` 决定哪些 lane 实际存在。`docs-scope` 和 `changed-scope` 逻辑是这个作业中的步骤，而不是独立作业。
3. `security-fast`、`check-*`、`check-additional-*`、`check-docs` 和 `skills-python` 会快速失败，不会等待更重的 artifact 和平台矩阵作业。
4. `build-artifacts` 会与快速的 Linux lanes 重叠，因此下游消费者可以在共享构建准备好后立即开始。
5. 更重的平台和运行时 lanes 随后展开：`checks-fast-core`、`checks-fast-contracts-plugins-*`、`checks-fast-contracts-channels-*`、`checks-node-*`、`checks-windows`、`macos-node`、`macos-swift`、`ios-build` 和 `android`。

当同一个 PR 或 `main` 引用上有新的 push 到来时，GitHub 可能会把被取代的作业标记为 `cancelled`。除非同一引用的最新运行也失败，否则应将其视为 CI 噪声。矩阵作业使用 `fail-fast: false`，而 `build-artifacts` 会直接报告嵌入的 channel、core-support-boundary 和 gateway-watch 失败，而不是排队很小的验证器作业。自动 CI 并发键已版本化（`CI-v7-*`），因此 GitHub 端旧队列组里的僵尸任务不会无限期阻塞新的 main 运行。手动全套运行使用 `CI-manual-v1-*`，并且不会取消进行中的运行。

使用 `pnpm ci:timings`、`pnpm ci:timings:recent`，或 `node scripts/ci-run-timings.mjs <run-id>` 来汇总来自 GitHub Actions 的总耗时、排队时间、最慢作业、失败情况，以及 `pnpm-store-warmup` 的 fanout barrier。工作流内的 `ci-timings-summary` 作业存在于 `ci.yml` 中，但目前已禁用（`if: false`）；请改为在本地运行 timing helper。对于构建耗时，请检查 `build-artifacts` 作业中的 `Build dist` 步骤：`pnpm build:ci-artifacts` 会打印 `[build-all] phase timings:`，并包含 `ui:build`；该作业还会上传 `startup-memory` artifact。

## PR 上下文与证据

外部贡献者的 PR 会从 `.github/workflows/real-behavior-proof.yml` 运行一个 PR 上下文与证据门控。该工作流检出受信任的工作流修订版本（`github.workflow_sha`），并且仅评估 PR 正文；它不会执行来自贡献者分支的代码。

该门控适用于 PR 作者不是仓库所有者、成员、协作者或 bot 的情况。若 PR 正文包含作者撰写的 `What Problem This Solves` 和 `Evidence` 章节，则通过。证据可以是定向测试、CI 结果、截图、录屏、终端输出、实时观察、脱敏日志或工件链接。正文提供意图和有用的验证；审阅者会检查代码、测试和 CI 以评估正确性。

当检查失败时，请更新 PR 正文，而不是再推送一次代码提交。

## 范围与路由

范围逻辑位于 `scripts/ci-changed-scope.mjs`，并由 `src/scripts/ci-changed-scope.test.ts` 中的单元测试覆盖。手动派发会跳过变更范围检测，并让 preflight 清单表现得好像所有有范围的区域都已变更。

- **CI 工作流编辑** 会验证 Node CI 图、工作流 lint，以及 Windows 轨道（`ci.yml` 会执行它），但不会单独强制触发 iOS、Android 或 macOS 的原生构建；这些平台轨道仍然仅限于平台源代码变更。
- **Workflow Sanity** 会对所有工作流 YAML 文件运行 `actionlint`、`zizmor`，以及 composite-action 插值防护和冲突标记防护。PR 范围内的 `security-fast` 作业也会对已变更的工作流文件运行 `zizmor`，以便工作流安全问题能在主 CI 图中尽早失败。
- **`main` 上的文档推送** 由独立的 `Docs` 工作流检查，使用与 CI 相同的 ClawHub 文档镜像，因此代码+文档混合推送不会再额外排队 CI 的 `check-docs` 分片。拉取请求和手动 CI 在文档变更时仍会从 CI 运行 `check-docs`。
- **TUI PTY** 在 TUI 变更时运行于 `checks-node-core-runtime-tui-pty` Linux Node 分片中。该分片使用 `OPENCLAW_TUI_PTY_INCLUDE_LOCAL=1` 运行 `test/vitest/vitest.tui-pty.config.ts`，因此它同时覆盖了确定性的 `TuiBackend` fixture 轨道，以及更慢的 `tui --local` 冒烟测试；后者只模拟外部模型端点。
- **仅限 CI 路由的编辑、fast 任务直接运行的少量核心测试 fixture，以及狭窄的插件契约辅助编辑** 使用快速的仅 Node manifest 路径：`preflight`、`security-fast`，以及变更所触及的仅有快速轨道——单个 `checks-fast-core` CI 路由任务、两个插件契约分片，或两者兼有。该路径会跳过构建产物、Node 22 兼容性、channel 契约、完整 core 分片、打包插件分片以及额外的防护矩阵。
- **Windows Node 检查** 仅限于 Windows 特定的进程/路径包装器、npm/pnpm/UI 运行器辅助工具、包管理器配置，以及执行该轨道的 CI 工作流表面；无关的源码、插件、install-smoke 和仅测试的变更仍保留在 Linux Node 轨道上。

最慢的 Node 测试家族被拆分或均衡分配，以便每个作业保持较小规模，而不会过度占用 runner：

- 插件契约和 channel 契约各自作为两个加权的 Blacksmith 支持分片运行，并带有标准 GitHub runner 回退。
- 核心单元 fast/support 轨道分开运行；核心运行时基础设施拆分为 process、shared、hooks、secrets，以及三个 cron 域分片。
- 自动回复作为均衡 worker 运行，reply 子树拆分为 agent-runner、commands、dispatch、session 和 state-routing 分片。
- 代理式 gateway/server（控制平面）配置分散到 chat、auth、model、HTTP/plugin、runtime 和 startup 轨道，而不是等待打包产物。
- 常规 CI 只将隔离的 infra include-pattern 分片打包为最多 64 个测试文件的确定性 bundle，从而减少 Node 矩阵，而不会把非隔离的 command/cron、stateful agents-core 或 gateway/server 套件合并进去。重型固定套件保持在 8 vCPU 上，而打包和较低权重的轨道使用 4 vCPU。
- 规范仓库上的拉取请求使用紧凑的准入计划：相同的按配置分组在隔离子进程中运行，目前是 18 个 Node 测试作业，而不是 74 个作业的完整矩阵。`main` 推送、手动派发和发布门禁保留完整矩阵。
- 更广泛的 browser、QA、media 和杂项插件测试使用各自专用的 Vitest 配置，而不是共享的插件兜底配置。include-pattern 分片会使用 CI 分片名称记录计时条目，因此 `.artifacts/vitest-shard-timings.json` 可以区分整个配置与过滤后的分片。
- `check-additional-*` 会将补充边界防护列表（`scripts/run-additional-boundary-checks.mjs`）分条拆分为一个 prompt-heavy 分片（`check-additional-boundaries-a`，其中包含 Codex prompt 快照漂移检查）和一个用于其余条目的组合分片（`check-additional-boundaries-bcd`），每个分片并发运行独立防护并打印逐项检查计时。包边界 compile/canary 工作保持在一起，而 runtime topology architecture 则与嵌入在 `build-artifacts` 中的 gateway watch 覆盖分开运行。
- Gateway watch、channel 测试以及 core support-boundary 分片在 `dist/` 和 `dist-runtime/` 已构建完成后，会在 `build-artifacts` 中并发运行。

一旦通过准入，规范的 Linux CI 允许最多 24 个并发 Node 测试作业，而较小的 fast/check 轨道允许 12 个；Windows 和 Android 由于 runner 池更窄，保持为 2。紧凑的整配置批次使用 120 分钟的批次超时，而 include-pattern 分组共享同一受限作业预算。

Android CI 会同时运行 `testPlayDebugUnitTest` 和 `testThirdPartyDebugUnitTest`，然后构建 Play debug APK。第三方 flavor 没有单独的 source set 或 manifest；其单元测试流水线仍会使用 SMS/call-log BuildConfig 标志编译该 flavor，同时避免在每次与 Android 相关的 push 上都重复进行 debug APK 打包作业。

`check-dependencies` 分片运行 `pnpm deadcode:dependencies`（一个生产用 Knip 仅依赖检查，固定到精确的 Knip 版本，并且对 `dlx` 安装禁用 pnpm 的最小发布年龄限制）以及 `pnpm deadcode:unused-files`，后者将 Knip 的生产未使用文件发现结果与 `scripts/deadcode-unused-files.allowlist.mjs` 进行对比，并附带一份建议性的 `pnpm deadcode:report:ci:ts-unused` 报告，作为 `deadcode-reports` 产物上传。当 PR 新增了一个未经审查的新未使用文件，或遗留了一个过期的 allowlist 条目时，未使用文件防护会失败，同时保留 Knip 无法静态解析的有意动态插件、生成文件、构建产物、运行时测试以及包桥接表面。

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

手动 CI 派发会运行与正常 CI 相同的作业图，但会强制开启所有非 Android 作用域的 lane：Linux Node 分片、bundled-plugin 分片、plugin 和 channel contract 分片、Node 22 兼容性、`check-*`、`check-additional-*`、已构建产物烟雾检查、文档检查、Python skills、Windows、macOS、iOS 构建，以及 Control UI i18n。独立的手动 CI 派发仅在 `include_android=true` 时运行 Android（`release_gate` 输入也会强制启用 Android）；完整的发布总入口则通过传入 `include_android=true` 启用 Android。插件预发布静态检查、仅发布使用的 `agentic-plugins` 分片、完整扩展批量扫描，以及插件预发布 Docker lane 都被 CI 排除在外。Docker 预发布套件仅在 `Full Release Validation` 派发时运行，它会在启用 release-validation gate 的情况下单独触发 `Plugin Prerelease` 工作流。

手动运行使用独立的并发组，因此同一 ref 上的另一次 push 或 PR 运行不会取消发布候选的完整套件。可选的 `target_ref` 输入允许受信任的调用方使用所选派发 ref 上的工作流文件，将该作业图运行在某个分支、标签或完整 commit SHA 上。`release_gate` 输入是一个精确 SHA 的维护者回退机制，用于容量受阻的 PR CI：它要求 `target_ref` 必须是与派发分支头匹配的完整 commit SHA。

```bash
gh workflow run ci.yml --ref release/YYYY.M.PATCH
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

每月仅 npm 的 extended-stable 路径是个例外：必须从精确的 `extended-stable/YYYY.M.33` 分支同时派发 `OpenClaw NPM
Release` 预检和 `Full Release Validation`，保留它们的运行 ID，并将这两个 ID 传递给
直接 npm 发布运行。有关命令、精确身份要求、注册表回读，以及选择器
修复流程，请参见 [每月仅 npm 的 extended-stable
发布](/reference/RELEASING#monthly-npm-only-extended-stable-publication)。此路径不会派发插件、macOS、Windows、GitHub
Release、private dist-tag 或其他平台发布。

## 运行器

| 运行器                          | 作业                                                                                                                                                                                                                                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                  | 手动 CI 触发以及非 canonical 仓库回退、CodeQL 安全和质量扫描、workflow-sanity、labeler、auto-response、独立的 Docs 工作流，以及整个 Install Smoke 工作流                                                                                          |
| `blacksmith-4vcpu-ubuntu-2404`  | `preflight`、`security-fast`、`pnpm-store-warmup`、`native-i18n`、`checks-fast-core`（不包括 QA Smoke CI）、插件/通道契约分片、绝大多数打包的/较低负载的 Linux Node 分片、除 `check-lint` 外的 `check-*` 线路、选定的 `check-additional-*` 分片、`check-docs`，以及 `skills-python` |
| `blacksmith-8vcpu-ubuntu-2404`  | 保留的重型 Linux Node 套件、边界/扩展密集型 `check-additional-*` 分片，以及 `android`                                                                                                                                                                                              |
| `blacksmith-16vcpu-ubuntu-2404` | QA Smoke CI、CI 和 Testbox 中的 `build-artifacts`，以及 `check-lint`（对 CPU 敏感到 8 vCPU 的成本高于它们带来的节省）                                                                                                                                                                    |
| `blacksmith-8vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                                                                                   |
| `blacksmith-6vcpu-macos-15`     | `openclaw/openclaw` 上的 `macos-node`；fork 会回退到 `macos-15`                                                                                                                                                                                                                                 |
| `blacksmith-12vcpu-macos-26`    | `openclaw/openclaw` 上的 `macos-swift` 和 `ios-build`；fork 会回退到 `macos-26`                                                                                                                                                                                                                |

## Runner registration budget

OpenClaw 当前的 GitHub runner-registration bucket 在 `ghx api rate_limit` 中报告每 5 分钟有 10,000 次自托管 runner 注册。每次调优前都要重新检查 `actions_runner_registration`，因为 GitHub 可能会更改这个 bucket。该限制由 `openclaw` 组织中所有 Blacksmith runner 注册共享，因此再添加一个 Blacksmith 安装也不会带来新的 bucket。

将 Blacksmith 标签视为突发控制的稀缺资源。只负责路由、通知、汇总、选择分片或运行短时 CodeQL 扫描的作业，除非已测得明确的 Blacksmith 特定需求，否则应继续使用 GitHub 托管运行器。任何新的 Blacksmith matrix、更大的 `max-parallel` 或高频工作流，都必须展示其最坏情况下的注册次数，并将组织级目标控制在实时 bucket 的约 60% 以下。按当前 10,000 次注册的 bucket 计算，这意味着 6,000 次注册的运行目标，为并发仓库、重试和突发重叠留出余量。

规范仓库 CI 会将 Blacksmith 作为正常 push 和 pull request 运行的默认运行器路径。`workflow_dispatch` 和非规范仓库运行使用 GitHub 托管运行器，但目前正常的规范运行不会探测 Blacksmith 队列健康状况，也不会在 Blacksmith 不可用时自动回退到 GitHub 托管标签。

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
OPENCLAW_TUI_PTY_INCLUDE_LOCAL=1 node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts
pnpm test                                     # vitest 测试
pnpm test:changed                             # 面向变更内容的轻量智能 Vitest 目标
pnpm test:channels
pnpm test:contracts:channels
pnpm check:docs                               # docs 格式 + lint + 损坏链接检查
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

- `mock-provider`: 针对本地构建的运行时运行 Kova 诊断场景，使用确定性的虚拟 OpenAI 兼容认证。
- `mock-deep-profile`: 针对启动、网关和 agent-turn 热点进行 CPU/堆/trace 性能分析。在计划任务时运行，或在手动派发时设置 `deep_profile=true` 运行。
- `live-openai-candidate`: 一个真实的 OpenAI `openai/gpt-5.5` agent turn；当 `OPENAI_API_KEY` 不可用时会跳过。在计划任务时运行，或在手动派发时设置 `live_openai_candidate=true` 运行。

在 Kova 通过后，`mock-provider` lane 还会运行 OpenClaw 原生源代码探测：默认、跳过 channel、internal-hook 和 fifty-plugin 启动场景下的网关启动时间和内存；捆绑插件导入 RSS、重复的 mock-OpenAI `channel-chat-baseline` 问候循环、针对已启动网关的 CLI 启动命令，以及 SQLite 状态 smoke 性能探测。当被测试 ref 对应的上一份已发布 mock-provider 源代码报告可用时，源代码摘要会将当前 RSS 和 heap 值与该基线进行比较，并将较大的 RSS 增长标记为 `watch`。源代码探测的 Markdown 摘要位于报告包中的 `source/index.md`，其原始 JSON 与之相邻。

每条 lane 都会上传 GitHub artifacts。配置了 `CLAWGRIT_REPORTS_TOKEN` 时，工作流还会将 `report.json`、`report.md`、bundles、`index.md` 和源代码探测 artifacts 提交到 `openclaw/clawgrit-reports`，路径为 `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/`。当前 tested-ref 指针会写入为 `openclaw-performance/<tested-ref>/latest-<lane>.json`。

## 完整发布验证

`Full Release Validation` 是用于“在发布前运行所有内容”的手动总控工作流。它接受分支、标签或完整的 commit SHA，并会针对该目标分发手动 `CI` 工作流（包括 Android），分发 `Plugin Prerelease` 以进行仅发布用的插件/包/静态/Docker 证明，针对目标 SHA 分发 `OpenClaw Performance`，以及分发 `OpenClaw Release Checks` 以进行安装 smoke、包接受度、跨 OS 包检查、QA Lab 对等、Matrix 和 Telegram 任务线（可通过 `run_maturity_scorecard` 选择启用告警成熟度评分卡渲染）。稳定版和完整配置文件始终包含详尽的 live/E2E 和 Docker 发布路径 soak 覆盖；beta 配置文件可通过 `run_release_soak=true` 选择启用。规范化的包 Telegram E2E 运行在 Package Acceptance 内部，因此完整候选不会启动重复的 live poller。发布后，传入 `release_package_spec` 以在 release checks、Package Acceptance、Docker、跨 OS 和 Telegram 中复用已发布的 npm 包，而无需重新构建。仅在需要专门重跑已发布包的 Telegram 时使用 `npm_telegram_package_spec`。Codex 插件 live package 任务线默认使用同样的已选状态：已发布的 `release_package_spec=openclaw@<tag>` 会派生出 `codex_plugin_spec=npm:@openclaw/codex@<tag>`，而 SHA/产物运行则会从所选 ref 打包 `extensions/codex`。对于诸如 `npm:`、`npm-pack:` 或 `git:` 之类的自定义插件来源，请显式设置 `codex_plugin_spec`。

参见 [完整发布验证](/reference/full-release-validation) 以了解
阶段矩阵、确切的工作流任务名称、配置差异、产物以及
定向重跑句柄。

`OpenClaw Release Publish` 是手动的变更性发布工作流。请在
`release/YYYY.M.PATCH` 或 `main` 上分发它，前提是发布 tag 已存在，并且
OpenClaw npm 预检已经成功（该预检会在其检查项中运行 `pnpm plugins:sync:check`）。它需要保存的 `preflight_run_id` 和一个成功的
`full_release_validation_run_id`，会为所有可发布的插件包分发 `Plugin NPM Release`，
为同一发布 SHA 分发 `Plugin ClawHub Release`，然后才分发
`OpenClaw NPM Release`。稳定版发布还需要精确的 `windows_node_tag`；工作流会验证 Windows 源发布，并在任何发布子流程之前，将其 x64/ARM64 安装程序与候选已批准的 `windows_node_installer_digests` 输入进行比较，然后再提升并验证这些相同的固定安装程序摘要，以及精确的配套资产和校验和契约，最后发布 GitHub release 草稿。

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.PATCH \
  -f tag=vYYYY.M.PATCH-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f full_release_validation_run_id=<successful-full-release-validation-run-id> \
  -f npm_dist_tag=beta
```

对于在快速变化分支上的固定 commit 证明，请使用辅助工具，而不是
`gh workflow run ... --ref main -f ref=<sha>`：

```bash
pnpm ci:full-release --sha <full-sha>
```

GitHub workflow dispatch refs 必须是分支或标签，而不是原始 commit SHA。
该辅助工具会在目标 SHA 上推送一个临时的 `release-ci/<sha>-...` 分支，
从该固定 ref 分发 `Full Release Validation`，验证每个子工作流的 `headSha`
都与目标一致，并在运行完成后删除该临时分支。若任一子工作流
在不同的 SHA 上运行，总控验证器也会失败。

`release_profile` 控制传入发布检查的 live/provider 广度。手动发布工作流默认使用 `stable`；只有在你有意想要更广泛的 advisory provider/media 矩阵时才使用 `full`。稳定版和完整发布检查始终运行详尽的 live/E2E 和 Docker 发布路径 soak；beta profile 可通过 `run_release_soak=true` 选择启用。

- `minimum` 保留最快的 OpenAI/核心发布关键 lane。
- `stable` 会增加稳定的 provider/backend 集合。
- `full` 运行更广泛的 advisory provider/media 矩阵。

这个总控会记录已触发的子运行 id，而最终的 `Verify full validation` 任务会重新检查当前子运行的结论，并为每个子运行附加最慢任务表。如果某个子工作流被重新运行并变为绿色，只需重新运行父级验证器任务即可刷新总控结果和耗时摘要。

对于恢复场景，`Full Release Validation` 和 `OpenClaw Release Checks` 都接受 `rerun_group`。对于发布候选，使用 `all`；仅对正常的完整 CI 子流程使用 `ci`；仅对插件预发布子流程使用 `plugin-prerelease`；仅对 OpenClaw Performance 子流程使用 `performance`；对于所有发布子流程使用 `release-checks`；或者在总控中使用更窄的组：`install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 或 `npm-telegram`。这使得在有针对性的修复后，失败的发布箱重跑保持在可控范围内。对于单个失败的跨 OS 任务线，将 `rerun_group=cross-os` 与 `cross_os_suite_filter` 结合使用，例如 `windows/packaged-upgrade`；较长的跨 OS 命令会输出心跳行，packaged-upgrade 摘要会包含各阶段耗时。QA 发布检查任务线除标准运行时工具覆盖门控外均为告警性质；当所需的 OpenClaw 动态工具在标准层摘要中漂移或消失时，该门控会阻止通过。

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
- `product` — `package` 集合加上 live `plugins` 覆盖，替代 `plugins-offline`，另外还包括 `mcp-channels`, `cron-mcp-cleanup`, `openai-web-search-minimal`, `openwebui`
- `full` — 带有 OpenWebUI 的完整 Docker release-path chunks
- `custom` — 精确的 `docker_lanes`；当 `suite_profile=custom` 时必需

`package` profile 使用离线插件覆盖，因此已发布包的验证不会受制于线上 ClawHub 可用性。可选的 Telegram lane 在 `NPM Telegram Beta E2E` 中重用 `package-under-test` 工件，而已发布的 npm spec 路径仍保留给独立分发使用。

关于专门的更新和插件测试策略，包括本地命令、Docker lanes、Package Acceptance 输入、发布默认值和失败排查，请参见 [Testing updates and plugins](/help/testing-updates-plugins)。

Release checks 调用 Package Acceptance 时使用 `source=artifact`、准备好的 release package artifact、`suite_profile=custom`、`docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor root-managed-vps-upgrade update-restart-auth plugins-offline plugin-update plugin-binding-command-escape'`，以及 `telegram_mode=mock-openai`。这样可以让 package migration、update、live ClawHub skill install、stale-plugin-dependency cleanup、configured-plugin install repair、offline plugin、plugin-update 和 Telegram proof 都基于同一个已解析的 package tarball。对 Full Release Validation 或 OpenClaw Release Checks，在发布 beta 后设置 `release_package_spec`，即可在不重新构建的情况下，对已发布的 npm package 运行同一矩阵；只有当 Package Acceptance 需要与其余 release validation 不同的 package 时，才设置 `package_acceptance_package_spec`。跨 OS 的 release checks 仍然覆盖 OS 特定的 onboarding、installer 和平台行为；package/update 产品验证应从 Package Acceptance 开始。

`published-upgrade-survivor` Docker lane 在阻塞的 release path 中，每次运行只验证一个已发布 package baseline。在 Package Acceptance 中，解析出的 `package-under-test` tarball 始终是候选项，而 `published_upgrade_survivor_baseline` 选择回退的已发布 baseline，默认值为 `openclaw@latest`；失败 lane 的重新运行命令会保留该 baseline。启用 `run_release_soak=true` 或 `release_profile=full` 的 Full Release Validation 会设置 `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` 和 `published_upgrade_survivor_scenarios=reported-issues`，以便扩展到最近四个 stable npm releases，再加上固定的 plugin-compatibility 边界 release，以及用于 Feishu config、保留的 bootstrap/persona 文件、已配置的 OpenClaw plugin 安装、tilde log paths 和 stale legacy plugin dependency roots 的 issue 形状 fixture。多 baseline 的 published-upgrade survivor 选择会按 baseline 分片，拆分为独立的目标 Docker runner jobs。单独的 `Update Migration` 工作流在问题是“穷尽式的已发布 update cleanup”，而不是普通 Full Release CI 范围时，会使用带有 `all-since-2026.4.23` baselines 和 `plugin-deps-cleanup` scenarios 的 `update-migration` Docker lane。本地聚合运行可以通过 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` 传入精确的 package spec，使用诸如 `openclaw@2026.4.15` 的 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 保持单一 lane，或者设置 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` 来配置 scenario matrix。published lane 会使用预设的 `openclaw config set` 命令 recipe 配置 baseline，在 `summary.json` 中记录 recipe steps，并在 Gateway 启动后探测 `/healthz`、`/readyz` 以及 RPC status。Windows packaged 和 installer fresh lanes 还会验证已安装的 package 能否从原始绝对 Windows path 导入 browser-control override。OpenAI 跨 OS agent-turn smoke 默认使用 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，若未设置则为 `openai/gpt-5.5`，因此安装和 gateway proof 会保持在 GPT-5 测试模型上，同时避免 GPT-4.x 默认值。

### 旧版兼容窗口

Package Acceptance 对已发布包提供有边界的旧版兼容窗口。对于 `2026.4.25` 及之前的包，包括 `2026.4.25-beta.*`，可以使用兼容路径：

- `dist/postinstall-inventory.json` 中已知的私有 QA 条目可以指向 tarball 中未包含的文件；
- 当包未暴露该标志时，`doctor-switch` 可以跳过 `gateway install --wrapper` 持久化子用例；
- `update-channel-switch` 可以从 tarball 派生的 fake git fixture 中清理缺失的 pnpm `patchedDependencies`，并且可以记录缺失的持久化 `update.channel`；
- plugin smokes 可以读取旧版 install-record 位置，或接受缺失的 marketplace install-record 持久化；
- `plugin-update` 可以允许配置元数据迁移，同时仍要求 install record 和 no-reinstall 行为保持不变。

已发布的 `2026.4.26` package 也可能对已随包发布过的本地 build metadata stamp files 发出警告，而 `2026.5.20` 及之前的包在缺失 `npm-shrinkwrap.json` 时可能会警告而不是失败。更晚的包必须满足现代合约；相同条件会导致失败，而不是警告或跳过。

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

独立的 `Install Smoke` 工作流不再在 pull request 或 `main` 推送时运行。它会在夜间计划任务、手动触发以及作为发布验证的工作流调用时运行，并且每次运行都会在 GitHub 托管的 runner 上走完整的 install-smoke 路径：

- 根 Dockerfile smoke 镜像会针对每个目标 SHA 只构建一次（或从 GHCR 复用，地址为 `ghcr.io/openclaw/openclaw-dockerfile-smoke:<sha>`），然后基于它运行 CLI smoke、agents delete shared-workspace CLI smoke、container gateway-network E2E，以及 bundled `matrix` 插件 build-arg smoke。插件 smoke 会验证运行时依赖安装镜像，以及插件加载时不会出现 entry-escape 诊断信息。
- QR 包安装，以及安装器/更新 Docker smokes（包括 Rocky Linux 安装器 lanes 和针对可配置 `update_baseline_version` npm 基线的更新 lane）会作为独立作业运行，这样安装器相关工作就不会被根镜像 smokes 阻塞。

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

`Plugin Prerelease` 是成本更高的产品/包覆盖，因此它是一个由 `Full Release Validation` 派发的独立工作流，或者由明确的操作员手动触发。普通的拉取请求、`main` 分支推送，以及独立的手动 CI 派发都会关闭该测试套件。它会在八个扩展 worker 之间平衡打包的插件测试；这些扩展分片任务一次最多运行两组插件配置，每组使用一个 Vitest worker，并配备更大的 Node 堆内存，以避免导入较重的插件批次生成额外的 CI 任务。仅在发布时启用的 Docker 预发布路径（通过 `full_release_validation` 输入启用）会将目标 Docker 任务按四个一组批处理，以避免为一到三分钟的任务占用数十个 runner。该工作流还会从 `@openclaw/plugin-inspector` 上传一个信息性的 `plugin-inspector-advisory` artifact；inspector 的发现结果仅作为分流输入，不会改变阻塞性的 Plugin Prerelease 门禁。

## QA 实验室

QA 实验室在主智能作用域工作流之外拥有专用的 CI lanes。Agentic parity 被嵌套在更广泛的 QA 和发布 harness 中，而不是独立的 PR 工作流。若需要 parity 随更广泛的验证运行一起执行，请使用 `Full Release Validation` 并设置 `rerun_group=qa-parity`。

- `QA-Lab - All Lanes` 工作流在 `main` 上每晚运行一次，也支持手动派发；它会将 mock parity lane、live Matrix lane 以及 live Telegram 和 Discord lanes 作为并行作业展开。live 作业使用 `qa-live-shared` 环境，Telegram/Discord 使用 Convex leases。

发布检查会使用确定性的 mock provider 和 mock 认证模型（`mock-openai/gpt-5.5` 与 `mock-openai/gpt-5.5-alt`）运行 Matrix 和 Telegram live transport lanes，从而将 channel 合约与 live model 延迟以及正常的 provider-plugin 启动隔离开来。live transport gateway 禁用 memory search，因为 QA parity 会单独覆盖 memory 行为；provider 连通性则由单独的 live model、原生 provider 和 Docker provider 套件覆盖。

Matrix 在定时和 release gate 中使用 `--profile fast`，仅当检出的 CLI 支持时才添加 `--fail-fast`。CLI 默认值和手动工作流输入都保持为 `all`；手动 `matrix_profile=all` 派发始终将完整的 Matrix 覆盖拆分为 `transport`、`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli` 作业。

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

Crabbox 是仓库自有的远程盒子封装器，用于维护者 Linux 证明。Agent 会话默认使用它进行测试和计算密集型工作，包括构建、类型检查、lint 扇出、Docker、包流水线、E2E、实时证明和 CI 一致性。受信任的维护者代码默认使用 `blacksmith-testbox`，并且 `.crabbox.yaml` 现在也默认使用它。其已配置的工作流会注入提供商和 agent 凭据，因此不受信任的贡献者或 fork 代码必须使用无密钥的 fork CI，或经过清理的直接 AWS Crabbox。经过清理的 AWS 运行会设置 `CRABBOX_ENV_ALLOW=CI`，传递 `--no-hydrate`，并使用全新的临时远程 `HOME`；这可防止仓库的 `OPENCLAW_*` allowlist 和现有认证配置文件进入不受信任的代码。它们使用专门分配给该不受信任来源的新加热 lease，绝不会使用受信任或之前已注入凭据的 lease。应从干净、受信任的 `main` 检出中启动已安装的受信任 Crabbox 二进制文件，并仅使用 `--fresh-pr` 获取远程 PR；绝不要在本地执行不受信任检出的封装器或配置。取消设置 `CRABBOX_AWS_INSTANCE_PROFILE`，并且除非解析出的 `aws.instanceProfile` 为空，否则应直接失败。在任何安装/测试之前，使用受信任的绝对路径工具要求 IMDSv2 token，证明 IAM 凭据端点返回 404，并将远程 `git rev-parse HEAD` 与完整审查过的 PR head SHA 进行比较。将 lease 绑定到该 SHA，并在 head 变化时停止/重新加热。与 `--fresh-pr` 一起上传来自干净 `main` 的受信任 `scripts/crabbox-untrusted-bootstrap.sh`；它会安装固定版本的 Node/pnpm，验证 SHA 和包管理器 pin，隔离 `HOME`，安装依赖，然后执行所请求的测试。取消设置所有 `CRABBOX_TAILSCALE*` 覆盖项，强制使用 `--network public --tailscale=false`，清除 exit-node/LAN 标志，并要求 `crabbox inspect` 在上传任何脚本之前报告没有 Tailscale 状态的公共网络。拥有的 AWS/Hetzner 容量也仍然是 Blacksmith 故障、配额问题或显式自有容量测试时的后备方案。

在一个很可能需要测试或大量证明的受信任代码任务开始时，agent 应立即在后台命令会话中预热，边做检查和编辑边等待注入，复用返回的 `tbx_...` id，在每次运行时同步当前检出，并在交接前停止它：

```bash
node scripts/crabbox-wrapper.mjs warmup --provider blacksmith-testbox --keep --timing-json
```

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

聚焦测试重跑：

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
