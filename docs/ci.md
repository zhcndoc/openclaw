---
summary: "CI 作业图、范围门控和本地命令等价项"
title: CI 流水线
read_when:
  - 你需要了解某个 CI 任务为何运行或未运行
  - 你正在调试失败的 GitHub Actions 检查
---

CI 会在每次推送到 `main` 和每个拉取请求时运行。它使用智能范围划分，在只有无关区域发生更改时跳过昂贵的任务。

QA Lab 在主智能范围工作流之外有专门的 CI 运行线。`Parity gate` 工作流会在匹配的 PR 变更和手动触发时运行；它会构建私有 QA 运行时，并比较 mock GPT-5.4 和 Opus 4.6 的 agentic pack。`QA-Lab - All Lanes` 工作流会在 `main` 上按夜间计划以及在手动触发时运行；它会并行分流到 mock parity gate、live Matrix 运行线和 live Telegram 运行线这几个并行任务。live 任务使用 `qa-live-shared` 环境，Telegram 运行线使用 Convex leases。`OpenClaw Release Checks` 也会在发布批准前运行同样的 QA Lab 运行线。

`Duplicate PRs After Merge` 工作流是一个供维护者手动使用的工作流，用于在 land 之后清理重复 PR。它默认是 dry-run，并且只有在 `apply=true` 时才会关闭明确列出的 PR。在修改 GitHub 之前，它会验证已 land 的 PR 确实已合并，并且每个重复项要么共享一个被引用的问题，要么有重叠的变更 hunks。

`Docs Agent` 工作流是一个事件驱动的 Codex 维护运行线，用于保持现有文档与最近落地的变更一致。它没有纯计划任务：一次成功的非机器人推送 CI 运行在 `main` 上可以触发它，手动触发也可以直接运行它。workflow-run 调用会在 `main` 已经前进或在最近一小时内已创建了另一个未跳过的 Docs Agent 运行时跳过。运行时，它会查看从上一个未跳过的 Docs Agent 源 SHA 到当前 `main` 的提交范围，因此一次按小时运行就可以覆盖自上次文档通过以来累积的所有 main 变更。

`Test Performance Agent` 工作流是一个面向慢测试的事件驱动 Codex 维护运行线。它没有纯计划任务：一次成功的非机器人推送 CI 运行在 `main` 上可以触发它，但如果同一天里已经有另一个 workflow-run 调用运行过或正在运行，它就会跳过。手动触发会绕过这个每日活动门控。该运行线会生成完整套件的分组 Vitest 性能报告，只允许 Codex 进行小的、保持覆盖率的测试性能修复，而不是大规模重构，然后重新运行完整套件报告，并拒绝会降低通过基线测试数量的更改。如果基线中存在失败测试，Codex 可以只修复明显失败项，并且代理执行后的完整套件报告必须通过后才会提交任何内容。当 `main` 在 bot push 落地前继续前进时，该运行线会对已验证的补丁进行 rebase，重新运行 `pnpm check:changed`，并重试推送；冲突的过期补丁会被跳过。它使用 GitHub 托管的 Ubuntu，因此 Codex action 可以保持与 docs agent 相同的 drop-sudo 安全姿态。

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## 作业概览

| 作业                              | 用途                                                                                         | 运行时机                             |
| -------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------ |
| `preflight`                      | 检测仅文档变更、变更范围、变更扩展，以及构建 CI 清单                                              | 始终在非草稿推送和 PR 上运行           |
| `security-scm-fast`              | 通过 `zizmor` 进行私钥检测和工作流审计                                                         | 始终在非草稿推送和 PR 上运行           |
| `security-dependency-audit`      | 针对 npm 公告的、无依赖的生产锁文件审计                                                         | 始终在非草稿推送和 PR 上运行           |
| `security-fast`                  | 快速安全任务的必需聚合项                                                                     | 始终在非草稿推送和 PR 上运行           |
| `build-artifacts`                | 构建 `dist/`、Control UI、构建产物检查，以及可复用的下游产物                                    | Node 相关变更                         |
| `checks-fast-core`               | 快速 Linux 正确性运行线，例如 bundled/plugin-contract/protocol 检查                           | Node 相关变更                         |
| `checks-fast-contracts-channels` | 分片的 channel 契约检查，带有稳定的聚合检查结果                                                     | Node 相关变更                         |
| `checks-node-extensions`         | 覆盖扩展套件的完整 bundled-plugin 测试分片                                                       | Node 相关变更                         |
| `checks-node-core-test`          | 核心 Node 测试分片，不包括 channel、bundled、contract 和 extension 运行线                      | Node 相关变更                         |
| `extension-fast`                 | 仅针对已变更 bundled plugin 的聚焦测试                                                           | 带有扩展变更的拉取请求                  |
| `check`                          | 分片化的主本地门禁等价项：生产类型检查、lint、guards、测试类型检查，以及严格 smoke              | Node 相关变更                         |
| `check-additional`               | 架构、边界、扩展表面 guards、package-boundary，以及 gateway-watch 分片                         | Node 相关变更                         |
| `build-smoke`                    | 构建后的 CLI smoke 测试和启动内存 smoke                                                          | Node 相关变更                         |
| `checks`                         | 构建产物 channel 测试的验证器，以及仅 push 的 Node 22 兼容性                                    | Node 相关变更                         |
| `check-docs`                     | 文档格式化、lint 和断链检查                                                                     | 文档已变更                            |
| `skills-python`                  | 面向 Python 支持的 skills 的 Ruff + pytest                                                       | Python skill 相关变更                 |
| `checks-windows`                 | Windows 特定的测试运行线                                                                       | Windows 相关变更                      |
| `macos-node`                     | 使用共享构建产物的 macOS TypeScript 测试运行线                                                   | macOS 相关变更                        |
| `macos-swift`                    | macOS 应用的 Swift lint、构建和测试                                                             | macOS 相关变更                        |
| `android`                        | 两个 flavor 的 Android 单元测试，加上一个 debug APK 构建                                        | Android 相关变更                      |
| `test-performance-agent`         | 在受信任活动之后，每日进行 Codex 慢测试优化                                                     | 主 CI 成功或手动触发                  |

## 快速失败顺序

任务按顺序排列，以便在昂贵任务运行前，先进行廉价检查以快速失败：

1. `preflight` 决定哪些流水线轨道实际存在。`docs-scope` 和 `changed-scope` 逻辑是这个任务内的步骤，而不是独立任务。
2. `security-scm-fast`、`security-dependency-audit`、`security-fast`、`check`、`check-additional`、`check-docs` 和 `skills-python` 会快速失败，而无需等待更重的产物和平台矩阵任务。
3. `build-artifacts` 与快速 Linux 轨道并行重叠，因此下游消费者可以在共享构建准备好后立即开始。
4. 更重的平台和运行时轨道随后展开：`checks-fast-core`、`checks-fast-contracts-channels`、`checks-node-extensions`、`checks-node-core-test`、仅 PR 的 `extension-fast`、`checks`、`checks-windows`、`macos-node`、`macos-swift` 和 `android`。

范围逻辑位于 `scripts/ci-changed-scope.mjs`，并由 `src/scripts/ci-changed-scope.test.ts` 中的单元测试覆盖。
CI 工作流编辑会验证 Node CI 图和工作流 linting，但不会因此强制执行 Windows、Android 或 macOS 原生构建；这些平台运行线仍然限定为平台源代码变更。
Windows Node 检查的范围限定于 Windows 特定的进程/路径包装器、npm/pnpm/UI runner helpers、包管理器配置，以及执行该运行线的 CI 工作流表面；无关的源代码、插件、install-smoke 和仅测试变更会留在 Linux Node 运行线上，因此它们不会为了已经由正常测试分片覆盖的内容而占用一个 16 vCPU 的 Windows worker。
独立的 `install-smoke` 工作流通过自己的 `preflight` 任务复用同一范围脚本。它将 smoke 覆盖拆分为 `run_fast_install_smoke` 和 `run_full_install_smoke`。拉取请求会针对 Docker/package 表面、bundled plugin 的 package/manifest 变更，以及 Docker smoke 任务所覆盖的核心 plugin/channel/gateway/Plugin SDK 表面运行快速路径。仅源码的 bundled plugin 变更、仅测试编辑和仅文档编辑不会占用 Docker worker。快速路径会构建一次根 Dockerfile 镜像，检查 CLI，运行 agents delete shared-workspace CLI smoke，运行容器 gateway-network e2e，验证 bundled extension build arg，并在 120 秒命令超时下运行受限的 bundled-plugin Docker profile。完整路径为夜间计划运行、手动触发、workflow-call 发布检查，以及真正涉及 installer/package/Docker 表面的拉取请求保留 QR package install 和 installer Docker/update 覆盖。`main` 推送，包括合并提交，不会强制完整路径；当 changed-scope 逻辑在一次推送中请求完整覆盖时，工作流会保留快速 Docker smoke，并把完整 install smoke 留给夜间或发布验证。较慢的 Bun global install image-provider smoke 由 `run_bun_global_install_smoke` 单独门控；它在夜间计划和发布检查工作流中运行，手动 `install-smoke` 触发可以选择启用它，但拉取请求和 `main` 推送不会运行它。QR 和 installer Docker 测试保留各自面向安装的 Dockerfile。本地 `test:docker:all` 会预构建一个共享的 live-test 镜像和一个共享的 `scripts/e2e/Dockerfile` built-app 镜像，然后使用加权调度器和 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行 live/E2E smoke 运行线；可用 `OPENCLAW_DOCKER_ALL_PARALLELISM` 调整默认主池槽位数 10，并用 `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` 调整对提供者敏感的尾部池槽位数 10。重运行线限制默认设为 `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=6`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=8` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`，这样 npm install 和多服务运行线就不会过度占用 Docker，而较轻的运行线仍能填满可用槽位。默认情况下，各运行线的启动会以 2 秒为间隔错开，以避免本地 Docker daemon create 风暴；可通过 `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=0` 或其他毫秒值覆盖。本地聚合会预检 Docker、移除过期的 OpenClaw E2E 容器、输出活动运行线状态、持久化运行线耗时以支持 longest-first 排序，并支持 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 用于调度器检查。它默认会在第一次失败后停止调度新的 pooled 运行线，并且每条运行线都有 120 分钟的回退超时，可通过 `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS` 覆盖；选定的 live/tail 运行线使用更严格的每运行线上限。可复用的 live/E2E 工作流通过在 Docker 矩阵之前构建并推送一个带 SHA 标签的 GHCR Docker E2E 镜像，来镜像共享镜像模式，然后使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行矩阵。计划中的 live/E2E 工作流会每日运行完整的发布路径 Docker 套件。bundled update 矩阵按更新目标拆分，因此重复的 npm update 和 doctor repair pass 可以与其他 bundled 检查一起分片运行。

本地 changed-lane 逻辑位于 `scripts/changed-lanes.mjs`，并由 `scripts/check-changed.mjs` 执行。与更宽泛的 CI 平台范围相比，这个本地门控对架构边界的约束更严格：核心生产变更会运行核心生产类型检查加核心测试，核心仅测试变更只运行核心测试类型检查/测试，扩展生产变更会运行扩展生产类型检查加扩展测试，而扩展仅测试变更只运行扩展测试类型检查/测试。Public Plugin SDK 或 plugin-contract 的变更会扩展到扩展验证，因为扩展依赖这些核心契约。仅发布元数据的版本提升会运行有针对性的版本/配置/根依赖检查。未知的根/配置变更会安全地回退为运行所有任务轨道。

在推送时，`checks` 矩阵会添加仅在 push 时运行的 `compat-node22` 任务轨道。在拉取请求中，该任务轨道会被跳过，矩阵会保持聚焦于正常的测试/channel 任务轨道。

最慢的 Node 测试族会被拆分或平衡，以便每个任务都保持较小规模，而不会过度占用 runner：channel contracts 作为三个加权分片运行，bundled plugin 测试在六个扩展 worker 之间平衡，小型核心单元运行线成对运行，auto-reply 作为三个平衡 worker 运行，而不是六个更小的 worker，agentic gateway/plugin 配置则分布到现有的仅源码 agentic Node 任务中，而不是等待构建产物。广泛的 browser、QA、media 和 miscellaneous plugin 测试使用它们各自专用的 Vitest 配置，而不是共享的 plugin catch-all。扩展分片任务一次最多运行两个 plugin 配置组，每组一个 Vitest worker，并使用更大的 Node 堆，以免导入繁重的 plugin 批次创建额外的 CI 任务。广泛的 agents 运行线使用共享的 Vitest 文件并行调度器，因为它更受导入/调度影响，而不是由单个缓慢测试文件主导。`runtime-config` 与 infra core-runtime 分片一起运行，以避免共享运行时分片独占尾部。`check-additional` 将 package-boundary 的 compile/canary 工作放在一起，并将 runtime topology architecture 与 gateway watch 覆盖分离；boundary guard 分片会在一个任务内并行运行其小型独立 guards。gateway watch、channel 测试以及 core support-boundary 分片会在 `build-artifacts` 内，在 `dist/` 和 `dist-runtime/` 已经构建完成后并行运行，从而保留它们原有的检查名称作为轻量验证任务，同时避免两个额外的 Blacksmith worker 和第二个产物消费者队列。
Android CI 会同时运行 `testPlayDebugUnitTest` 和 `testThirdPartyDebugUnitTest`，然后构建 Play debug APK。third-party flavor 没有独立的 source set 或 manifest；它的单元测试运行线仍会使用 SMS/call-log BuildConfig 标志来编译该 flavor，同时避免在每次 Android 相关推送时都重复一个 debug APK 打包任务。
`extension-fast` 仅限 PR，因为 push 运行已经执行了完整的 bundled plugin 分片。这样既能为评审保留已变更插件的反馈，又不会在 `main` 上为已由 `checks-node-extensions` 覆盖的内容额外占用一个 Blacksmith worker。

当更新的推送落到同一个 PR 或 `main` ref 上时，GitHub 可能会将被取代的任务标记为 `cancelled`。除非同一 ref 的最新运行也失败，否则应将其视为 CI 噪音。汇总分片检查使用 `!cancelled() && always()`，因此它们仍会报告正常的分片失败，但不会在整个工作流已经被取代后继续排队。
CI 并发键使用版本号（`CI-v7-*`），因此 GitHub 端旧队列组中的僵尸任务不会无限期阻塞新的 main 运行。

## 运行器

| Runner                           | 作业                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | `preflight`、快速安全作业和聚合（`security-scm-fast`、`security-dependency-audit`、`security-fast`）、快速协议/契约/捆绑检查、分片 channel 契约检查、除 lint 外的 `check` 分片、`check-additional` 分片和聚合、Node 测试聚合验证器、docs 检查、Python skills、workflow-sanity、labeler、auto-response；install-smoke preflight 也使用 GitHub 托管的 Ubuntu，以便 Blacksmith 矩阵可以更早排队 |
| `blacksmith-8vcpu-ubuntu-2404`   | `build-artifacts`、build-smoke、Linux Node 测试分片、捆绑插件测试分片、`android`                                                                                                                                                                                                                                                                                                                                                                           |
| `blacksmith-16vcpu-ubuntu-2404`  | `check-lint`，它仍然对 CPU 足够敏感，因此 8 vCPU 的成本高于节省；install-smoke Docker 构建，32 vCPU 的排队时间成本高于节省                                                                                                                                                                                                                                                                                                     |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `blacksmith-6vcpu-macos-latest`  | `macos-node`，运行于 `openclaw/openclaw`；fork 会回退到 `macos-latest`                                                                                                                                                                                                                                                                                                                                                                                                  |
| `blacksmith-12vcpu-macos-latest` | `macos-swift`，运行于 `openclaw/openclaw`；fork 会回退到 `macos-latest`                                                                                                                                                                                                                                                                                                                                                                                                 |

## 本地等价命令

```bash
pnpm changed:lanes   # 检查 origin/main...HEAD 的本地 changed-lane 分类器
pnpm check:changed   # 智能本地门控：按边界任务轨道运行已变更的类型检查/lint/测试
pnpm check          # 快速本地门控：生产 tsgo + 分片 lint + 并行快速 guards
pnpm check:test-types
pnpm check:timed    # 相同门控，带每个阶段的计时
pnpm build:strict-smoke
pnpm check:architecture
pnpm test:gateway:watch-regression
pnpm test           # vitest 测试
pnpm test:channels
pnpm test:contracts:channels
pnpm check:docs     # docs 格式 + lint + 断链检查
pnpm build          # 当 CI artifact/build-smoke 轨道重要时构建 dist
node scripts/ci-run-timings.mjs <run-id>      # 汇总总耗时、排队时间和最慢作业
node scripts/ci-run-timings.mjs --recent 10   # 比较最近成功的主分支 CI 运行
pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json
pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json
```

## 相关

- [安装概览](/install)
- [发布渠道](/install/development-channels)
