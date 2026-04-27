---
summary: "CI 作业图、范围门控和本地命令等价项"
title: CI 流水线
read_when:
  - 你需要了解某个 CI 任务为何运行或未运行
  - 你正在调试失败的 GitHub Actions 检查
---

CI 会在每次推送到 `main` 以及每个 pull request 时运行。它使用智能范围控制，在只变更了无关区域时跳过昂贵作业。手动的 `workflow_dispatch` 运行会有意绕过智能范围控制，并展开完整的正常 CI 图，用于发布候选版本或更广泛的验证。

`Full Release Validation` 是用于“在发布前运行所有内容”的手动总控工作流。它接受分支、标签或完整的 commit SHA，针对该目标分发手动 `CI` 工作流，并分发 `OpenClaw Release Checks`，用于安装 smoke、Docker 发布路径套件、live/E2E、OpenWebUI、QA Lab parity、Matrix 和 Telegram 运行线。如果提供了已发布包规范，它还可以运行发布后 `NPM Telegram Beta E2E` 工作流。

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

| Job                              | 目的                                                                                      | 运行时机                           |
| -------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------- |
| `preflight`                      | 检测仅文档变更、已变更范围、已变更扩展名，并构建 CI 清单                                      | 始终在非草稿 push 和 PR 上运行      |
| `security-scm-fast`              | 通过 `zizmor` 进行私钥检测和工作流审计                                                      | 始终在非草稿 push 和 PR 上运行      |
| `security-dependency-audit`      | 针对 npm 安全公告的无依赖生产锁文件审计                                                     | 始终在非草稿 push 和 PR 上运行      |
| `security-fast`                  | 快速安全作业的必需聚合项                                                                    | 始终在非草稿 push 和 PR 上运行      |
| `build-artifacts`                | 构建 `dist/`、Control UI、构建产物检查以及可复用的下游产物                                   | 需要 Node 相关变更时               |
| `checks-fast-core`               | 快速 Linux 正确性运行线，例如 bundled/plugin-contract/protocol 检查                        | 需要 Node 相关变更时               |
| `checks-fast-contracts-channels` | 带稳定聚合检查结果的分片 channel contract 检查                                               | 需要 Node 相关变更时               |
| `checks-node-extensions`         | 覆盖扩展套件的完整 bundled-plugin 测试分片                                                   | 需要 Node 相关变更时               |
| `checks-node-core-test`          | 核心 Node 测试分片，排除 channel、bundled、contract 和 extension 运行线                      | 需要 Node 相关变更时               |
| `check`                          | 分片后的主本地门禁等价项：生产类型、lint、guards、test types 和 strict smoke               | 需要 Node 相关变更时               |
| `check-additional`               | 架构、边界、extension-surface guards、package-boundary 和 gateway-watch 分片               | 需要 Node 相关变更时               |
| `build-smoke`                    | 构建后的 CLI smoke 测试和 startup-memory smoke                                              | 需要 Node 相关变更时               |
| `checks`                         | 构建产物 channel 测试的验证器                                                                | 需要 Node 相关变更时               |
| `checks-node-compat-node22`      | Node 22 兼容性构建和 smoke 运行线                                                            | 发布用手动 CI 分发                 |
| `check-docs`                     | 文档格式化、lint 和断链检查                                                                  | 文档已变更                         |
| `skills-python`                  | 针对 Python 支持技能的 Ruff + pytest                                                         | Python skill 相关变更              |
| `checks-windows`                 | Windows 特定测试运行线                                                                       | Windows 相关变更                  |
| `macos-node`                     | 使用共享构建产物的 macOS TypeScript 测试运行线                                               | macOS 相关变更                    |
| `macos-swift`                    | macOS 应用的 Swift lint、构建和测试                                                          | macOS 相关变更                    |
| `android`                        | 两个 flavor 的 Android 单元测试加一个 debug APK 构建                                         | Android 相关变更                   |
| `test-performance-agent`         | 经过可信活动后的每日 Codex 慢测试优化                                                        | 主 CI 成功或手动分发                |

手动 CI 分发会运行与正常 CI 相同的作业图，但会强制开启所有有范围的运行线：Linux Node 分片、bundled-plugin 分片、channel contracts、Node 22 兼容性、`check`、`check-additional`、build smoke、文档检查、Python skills、Windows、macOS、Android，以及 Control UI i18n。手动运行使用独立的 concurrency group，因此同一 ref 上的另一个 push 或 PR 运行不会取消发布候选版本的完整套件。可选的 `target_ref` 输入允许可信调用方使用所选分发 ref 上的 workflow 文件，将该图运行在分支、标签或完整 commit SHA 上。

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha>
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## 快速失败顺序

任务按顺序排列，以便在昂贵任务运行前，先进行廉价检查以快速失败：

1. `preflight` 决定哪些运行线根本存在。`docs-scope` 和 `changed-scope` 逻辑是这个作业中的步骤，而不是独立作业。
2. `security-scm-fast`、`security-dependency-audit`、`security-fast`、`check`、`check-additional`、`check-docs` 和 `skills-python` 会在不等待更重的产物和平台矩阵作业的情况下快速失败。
3. `build-artifacts` 与快速 Linux 运行线重叠，因此下游消费者可以在共享构建就绪后立刻开始。
4. 更重的平台和运行时运行线随后展开：`checks-fast-core`、`checks-fast-contracts-channels`、`checks-node-extensions`、`checks-node-core-test`、`checks`、`checks-windows`、`macos-node`、`macos-swift` 和 `android`。

范围逻辑位于 `scripts/ci-changed-scope.mjs`，并由 `src/scripts/ci-changed-scope.test.ts` 中的单元测试覆盖。
手动分发会跳过 changed-scope 检测，并让 preflight manifest 表现得像所有有范围的区域都已变更。
CI workflow 编辑会验证 Node CI 图以及 workflow linting，但不会单独强制 Windows、Android 或 macOS 原生构建；这些平台运行线仍然限定于平台源代码变更。
CI 仅路由类编辑、选定的廉价 core-test fixture 编辑，以及窄范围的 plugin contract helper/test-routing 编辑，会使用快速的仅 Node manifest 路径：preflight、security 和单个 `checks-fast-core` 任务。该路径在变更文件仅限于 fast 任务直接覆盖的路由或 helper 表面时，会避免构建产物、Node 22 兼容性、channel contracts、完整 core 分片、bundled-plugin 分片以及额外的 guard 矩阵。
Windows Node 检查的范围限定于 Windows 特定的 process/path 包装器、npm/pnpm/UI runner helpers、包管理器配置，以及执行该运行线的 CI workflow 表面；无关的源代码、plugin、install-smoke 和仅测试变更会停留在 Linux Node 运行线上，因此不会为了已经由正常测试分片覆盖的内容而占用一个 16 vCPU 的 Windows worker。
独立的 `install-smoke` 工作流通过自己的 `preflight` 作业复用相同的范围脚本。它将 smoke 覆盖拆分为 `run_fast_install_smoke` 和 `run_full_install_smoke`。Pull request 会对 Docker/package 表面、bundled plugin 包/manifest 变更，以及 Docker smoke 作业所覆盖的 core plugin/channel/gateway/Plugin SDK 表面运行快速路径。仅源代码层面的 bundled plugin 变更、仅测试编辑和仅文档编辑不会占用 Docker worker。快速路径会构建根 Dockerfile 镜像一次，检查 CLI，运行 agents delete shared-workspace CLI smoke，运行 container gateway-network e2e，验证 bundled extension build arg，并在 240 秒的聚合命令超时下运行受限的 bundled-plugin Docker profile，每个场景的 Docker run 都分别设有上限。完整路径保留 QR package 安装和 installer Docker/update 覆盖，用于夜间计划运行、手动分发、workflow-call 发布检查，以及真正触及 installer/package/Docker 表面的 pull request。`main` push，包括 merge commit，不会强制走完整路径；当 changed-scope 逻辑在 push 上要求完整覆盖时，工作流会保留快速 Docker smoke，并将完整 install smoke 留给夜间或发布验证。较慢的 Bun global install image-provider smoke 由 `run_bun_global_install_smoke` 单独门控；它会在夜间计划和发布检查工作流中运行，手动 `install-smoke` 分发可以选择包含它，但 pull request 和 `main` push 不会运行它。QR 和 installer Docker 测试保留各自面向安装的 Dockerfile。本地 `test:docker:all` 会预构建一个共享 live-test 镜像，将 OpenClaw 打包一次为 npm tarball，并构建两个共享的 `scripts/e2e/Dockerfile` 镜像：一个用于 installer/update/plugin-dependency 运行线的纯 Node/Git runner，以及一个将同一 tarball 安装到 `/app` 中、用于正常功能运行线的功能镜像。Docker 运行线定义位于 `scripts/lib/docker-e2e-scenarios.mjs`，planner 逻辑位于 `scripts/lib/docker-e2e-plan.mjs`，运行器只执行选定的计划。调度器通过 `OPENCLAW_DOCKER_E2E_BARE_IMAGE` 和 `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE` 为每条运行线选择镜像，然后使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行各运行线；可通过 `OPENCLAW_DOCKER_ALL_PARALLELISM` 调整默认的主池槽位数 10，通过 `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` 调整 provider 敏感的尾池槽位数 10。重型运行线默认上限分别为 `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`，因此 npm install 和多服务运行线不会过度占用 Docker，而较轻的运行线仍能填满可用槽位。默认情况下，运行线启动之间会错开 2 秒，以避免本地 Docker daemon 创建风暴；可通过 `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=0` 或其他毫秒值覆盖。本地聚合作业会预检 Docker，移除过时的 OpenClaw E2E 容器，输出活动运行线状态，持久化运行线耗时以便按最长优先排序，并支持 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 用于调度器检查。默认情况下，它会在第一个失败之后停止调度新的池化运行线，并且每条运行线都有一个 120 分钟的回退超时，可通过 `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS` 覆盖；选定的 live/tail 运行线使用更严格的每运行线上限。`OPENCLAW_DOCKER_ALL_LANES=<lane[,lane]>` 会运行精确的调度器运行线，包括仅发布时才使用的运行线如 `install-e2e`，以及拆分的 bundled update 运行线如 `bundled-channel-update-acpx`，同时跳过清理 smoke，以便代理可以复现某个失败的单条运行线。可复用的 live/E2E 工作流会询问 `scripts/test-docker-all.mjs --plan-json` 需要哪个 package、镜像类型、live 镜像、运行线以及凭据覆盖，然后 `scripts/docker-e2e.mjs` 将该计划转换为 GitHub outputs 和摘要。它通过 `scripts/package-openclaw-for-docker.mjs` 打包 OpenClaw，验证 tarball 清单，在计划需要 install/update/plugin-dependency 运行线时构建并推送一个 SHA-tagged 的 bare GHCR Docker E2E 镜像，并在计划需要 package-installed 功能运行线时构建一个 SHA-tagged 的 functional GHCR Docker E2E 镜像；如果任一 SHA-tagged 镜像已存在，工作流会跳过该镜像的重建，但仍会创建目标重跑所需的新鲜 tarball artifact。发布路径 Docker 套件最多以三个分块作业运行，使用 `OPENCLAW_SKIP_DOCKER_BUILD=1`，因此每个分块只拉取其所需的镜像类型，并通过同一个加权调度器执行多个运行线（`OPENCLAW_DOCKER_ALL_PROFILE=release-path`，`OPENCLAW_DOCKER_ALL_CHUNK=core|package-update|plugins-integrations`）。每个分块都会上传 `.artifacts/docker-tests/`，其中包含运行线日志、耗时、`summary.json`、`failures.json`、阶段耗时、调度器计划 JSON，以及每条运行线的重试命令。工作流的 `docker_lanes` 输入会针对准备好的镜像运行所选运行线，而不是运行那三个分块作业，这使失败运行线的调试被限制在一个有针对性的 Docker 作业内，并为所选 ref 准备一个新的 npm tarball；如果所选运行线是 live Docker 运行线，目标作业会在本地为该重跑构建 live-test 镜像。使用 `pnpm test:docker:rerun <run-id>` 可以从 GitHub 运行中下载 Docker artifact，并打印合并后的/每运行线的目标重试命令；使用 `pnpm test:docker:timings <summary.json>` 可以查看慢运行线和阶段关键路径摘要。当在发布路径套件中请求 Open WebUI 时，它会在 plugins/integrations 分块内运行，而不是额外占用第四个 Docker worker；只有在仅 openwebui 的分发时，Open WebUI 才保留独立作业。按计划运行的 live/E2E 工作流每天运行完整的发布路径 Docker 套件。bundled update 矩阵按更新目标拆分，因此重复的 npm update 和 doctor repair 过程可以与其他 bundled 检查一起分片执行。

本地 changed-lane 逻辑位于 `scripts/changed-lanes.mjs`，并由 `scripts/check-changed.mjs` 执行。与广泛的 CI 平台范围相比，这个本地检查门禁对架构边界更严格：核心生产变更会运行 core prod 和 core test typecheck 以及 core lint/guards，core test-only 变更只运行 core test typecheck 以及 core lint，extension 生产变更会运行 extension prod 和 extension test typecheck 以及 extension lint，而 extension test-only 变更只运行 extension test typecheck 以及 extension lint。Public Plugin SDK 或 plugin-contract 变更会扩展到 extension typecheck，因为扩展依赖这些核心契约，但 Vitest extension 全量扫描属于明确的测试工作。仅发布元数据版本递增会运行有针对性的 version/config/root-dependency 检查。未知的 root/config 变更会安全地失败到所有 check 运行线。

手动 CI 分发会将 `checks-node-compat-node22` 作为发布候选兼容性覆盖运行。正常的 pull request 和 `main` push 会跳过该运行线，并让矩阵聚焦于 Node 24 的测试/channel 运行线。

最慢的 Node 测试家族被拆分或平衡，以便每个作业都保持较小，而不会过度占用 runner：channel contracts 以三个加权分片运行，bundled plugin 测试在六个 extension worker 之间平衡，小型 core unit 运行线成对运行，auto-reply 作为四个平衡 worker 运行，并将 reply 子树拆分为 agent-runner、dispatch 和 commands/state-routing 分片，而 agentic gateway/plugin 配置则分布到现有的仅源代码 agentic Node 作业中，而不是等待构建产物。广泛的浏览器、QA、媒体和其他 plugin 测试使用各自专用的 Vitest 配置，而不是共享的 plugin 总括配置。extension 分片作业一次最多运行两组 plugin config，每组一个 Vitest worker，并使用更大的 Node 堆，因此 import-heavy 的 plugin 批次不会创建额外的 CI 作业。广泛的 agents 运行线使用共享的 Vitest 文件并行调度器，因为它更多受 import/scheduling 驱动，而不是由单个慢测试文件所有。`runtime-config` 会与 infra core-runtime 分片一起运行，以保持共享 runtime 分片不负责尾部工作。include-pattern 分片会使用 CI shard name 记录耗时条目，因此 `.artifacts/vitest-shard-timings.json` 可以区分整个配置与过滤后的分片。`check-additional` 会将 package-boundary 的 compile/canary 工作放在一起，并将 runtime topology architecture 与 gateway watch 覆盖分开；boundary guard 分片会在一个作业内并发运行其小型独立 guards。gateway watch、channel tests 和 core support-boundary 分片会在 `build-artifacts` 内、`dist/` 和 `dist-runtime/` 已构建完成后并发运行，保留其旧的检查名称作为轻量验证作业，同时避免额外两个 Blacksmith worker 和第二个 artifact-consumer 队列。
Android CI 会同时运行 `testPlayDebugUnitTest` 和 `testThirdPartyDebugUnitTest`，然后构建 Play debug APK。third-party flavor 没有单独的 source set 或 manifest；它的 unit-test 运行线仍会使用 SMS/call-log BuildConfig 标志编译该 flavor，同时避免在每次与 Android 相关的 push 中重复执行 debug APK 打包作业。
当新的 push 落到同一个 PR 或 `main` ref 上时，GitHub 可能会将被取代的作业标记为 `cancelled`。除非同一 ref 的最新运行也失败了，否则应将其视为 CI 噪音。聚合分片检查使用 `!cancelled() && always()`，因此它们仍会报告正常的分片失败，但在整个工作流已经被取代后不会再排队。
自动 CI concurrency key 是有版本号的（`CI-v7-*`），因此旧队列组中的 GitHub 侧僵尸不会无限期阻塞较新的 main 运行。手动完整套件运行使用 `CI-manual-v1-*`，并且不会取消正在进行的运行。

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
pnpm changed:lanes   # 检查 origin/main...HEAD 的本地变更 lane 分类器
pnpm check:changed   # 智能本地检查门禁：按边界 lane 检查变更的 typecheck/lint/guards
pnpm check          # 快速本地门禁：生产 tsgo + 分片 lint + 并行快速 guards
pnpm check:test-types
pnpm check:timed    # 相同门禁，带每个阶段的计时
pnpm build:strict-smoke
pnpm check:architecture
pnpm test:gateway:watch-regression
pnpm test           # vitest 测试
pnpm test:changed   # 轻量智能的变更 Vitest 目标
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
