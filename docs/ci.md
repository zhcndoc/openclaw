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

| Job                              | Purpose                                                                                                   | When it runs                       |
| -------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `preflight`                      | 检测仅文档更改、已更改范围、已更改扩展，并构建 CI 清单                                                     | 始终在非草稿 push 和 PR 上运行     |
| `security-scm-fast`              | 通过 `zizmor` 进行私钥检测和工作流审计                                                                    | 始终在非草稿 push 和 PR 上运行     |
| `security-dependency-audit`      | 针对 npm 安全公告的无依赖生产 lockfile 审计                                                                | 始终在非草稿 push 和 PR 上运行     |
| `security-fast`                  | 快速安全作业所需的聚合项                                                                                   | 始终在非草稿 push 和 PR 上运行     |
| `check-dependencies`             | 生产 Knip 仅依赖扫描加上未使用文件允许列表守卫                                                             | 与 Node 相关的更改                 |
| `build-artifacts`                | 构建 `dist/`、Control UI、构建产物检查，以及可复用的下游产物                                               | 与 Node 相关的更改                 |
| `checks-fast-core`               | 快速的 Linux 正确性流水线，例如 bundled/plugin-contract/protocol 检查                                     | 与 Node 相关的更改                 |
| `checks-fast-contracts-channels` | 分片的 channel 合约检查，带稳定的聚合检查结果                                                             | 与 Node 相关的更改                 |
| `checks-node-core-test`          | 核心 Node 测试分片，不包括 channel、bundled、contract 和 extension 流水线                                  | 与 Node 相关的更改                 |
| `check`                          | 分片的主要本地门禁等价项：生产类型、lint、守卫、测试类型和严格 smoke                                       | 与 Node 相关的更改                 |
| `check-additional`               | 架构、分片边界/prompt 漂移、扩展守卫、包边界和 gateway watch                                              | 与 Node 相关的更改                 |
| `build-smoke`                    | 构建后的 CLI smoke 测试和启动内存 smoke                                                                    | 与 Node 相关的更改                 |
| `checks`                         | 构建产物 channel 测试的验证器                                                                               | 与 Node 相关的更改                 |
| `checks-node-compat-node22`      | Node 22 兼容性构建和 smoke 流水线                                                                           | 用于发布的手动 CI 派发             |
| `check-docs`                     | 文档格式化、lint 和断链检查                                                                                 | 文档已更改                         |
| `skills-python`                  | 用于 Python 支持技能的 Ruff + pytest                                                                       | 与 Python 技能相关的更改           |
| `checks-windows`                 | Windows 特有的进程/路径测试，以及共享运行时导入说明符回归                                                 | 与 Windows 相关的更改              |
| `macos-node`                     | 使用共享构建产物的 macOS TypeScript 测试流水线                                                            | 与 macOS 相关的更改                |
| `macos-swift`                    | macOS 应用的 Swift lint、构建和测试                                                                         | 与 macOS 相关的更改                |
| `android`                        | 两个 flavor 的 Android 单元测试以及一个 debug APK 构建                                                     | 与 Android 相关的更改              |
| `test-performance-agent`         | 在可信活动之后每日进行 Codex 慢测优化                                                                       | 主 CI 成功或手动派发                |
| `openclaw-performance`           | 每日/按需的 Kova 运行时性能报告，包含 mock-provider、deep-profile 和 GPT 5.4 live 流水线                  | 定时和手动派发                      |

## 先失败顺序

1. `preflight` 决定哪些流水线实际上存在。`docs-scope` 和 `changed-scope` 逻辑是这个作业内部的步骤，不是独立作业。
2. `security-scm-fast`、`security-dependency-audit`、`security-fast`、`check`、`check-additional`、`check-docs` 和 `skills-python` 会快速失败，而无需等待更重的产物和平台矩阵作业。
3. `build-artifacts` 会与快速 Linux 流水线重叠执行，以便下游消费者在共享构建准备好后尽快开始。
4. 更重的平台和运行时流水线随后展开：`checks-fast-core`、`checks-fast-contracts-channels`、`checks-node-core-test`、`checks`、`checks-windows`、`macos-node`、`macos-swift` 和 `android`。

当新的推送落在同一个 PR 或 `main` ref 上时，GitHub 可能会将被取代的作业标记为 `cancelled`。除非同一 ref 的最新运行也失败，否则应将其视为 CI 噪音。聚合分片检查使用 `!cancelled() && always()`，因此它们仍会报告正常的分片失败，但在整个工作流已经被取代后不会再排队。自动 CI 并发键已版本化（`CI-v7-*`），因此 GitHub 端旧队列组中的僵尸任务不会无限期阻塞更新的 main 运行。手动全套运行使用 `CI-manual-v1-*`，并且不会取消进行中的运行。

`ci-timings-summary` 作业会为每次非草稿 CI 运行上传一个精简的 `ci-timings-summary` 产物。它会记录当前运行的总耗时、排队耗时、最慢作业和失败作业，因此 CI 健康检查无需反复抓取完整的 Actions 负载。

## 范围与路由

范围逻辑位于 `scripts/ci-changed-scope.mjs`，并由 `src/scripts/ci-changed-scope.test.ts` 中的单元测试覆盖。手动派发会跳过变更范围检测，并让 preflight 清单表现得好像所有有范围的区域都已变更。

- **CI 工作流编辑** 会验证 Node CI 图以及工作流 linting，但不会单独强制进行 Windows、Android 或 macOS 原生构建；这些平台流水线仍然仅对平台源代码变更进行范围控制。
- **仅 CI 路由编辑、部分廉价核心测试 fixture 编辑，以及狭窄的插件合约 helper/test-routing 编辑** 会使用快速的仅 Node 清单路径：`preflight`、security，以及单个 `checks-fast-core` 任务。该路径会跳过构建产物、Node 22 兼容性、channel 合约、完整核心分片、bundled 插件分片，以及额外守卫矩阵，前提是变更仅限于快速任务直接执行的路由或 helper 表面。
- **Windows Node 检查** 仅针对 Windows 特有的进程/路径包装器、npm/pnpm/UI 运行器 helper、包管理器配置，以及执行该流水线的 CI 工作流表面；无关源码、插件、安装 smoke 和仅测试的变更仍停留在 Linux Node 流水线上。

最慢的 Node 测试家族会被拆分或做平衡处理，这样每个作业都保持较小规模，而不会过度预留运行器：channel 合约以三个加权的 Blacksmith 支持分片运行，并带有标准 GitHub 运行器回退；核心单元快速/支持通道分开运行；核心运行时基础设施拆分为 state、process/config、cron 和 shared 分片；auto-reply 以平衡的 worker 运行（其中 reply 子树拆分为 agent-runner、dispatch 和 commands/state-routing 分片）；agentic gateway/server 配置则拆分为 chat/auth/model/http-plugin/runtime/startup 通道，而不是等待构建产物。广泛的 browser、QA、media 和杂项插件测试使用各自专用的 Vitest 配置，而不是共享的插件总包配置。包含模式分片使用 CI 分片名称记录时间条目，因此 `.artifacts/vitest-shard-timings.json` 可以区分完整配置和过滤后的分片。`check-additional` 会将包边界编译/canary 工作放在一起，并将运行时拓扑架构与 gateway watch 覆盖分离；边界守卫列表分布在四个矩阵分片上，每个分片并发运行选定的独立守卫并打印每个检查的耗时。昂贵的 Codex happy-path prompt snapshot 漂移检查会作为一个单独的额外作业运行，仅用于手动 CI 和影响 prompt 的更改，因此正常无关的 Node 更改不会排在冷启动 prompt snapshot 生成之后等待，而边界分片在 prompt 漂移仍然固定在触发它的 PR 上时也能保持平衡；同一个标志还会跳过构建产物 core support-boundary 分片中的 prompt snapshot Vitest 生成。gateway watch、channel 测试和 core support-boundary 分片会在 `build-artifacts` 内部并发运行，而此时 `dist/` 和 `dist-runtime/` 已经构建完成。

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

手动 CI 派发会运行与正常 CI 相同的作业图，但会强制开启所有非 Android 范围的流水线：Linux Node 分片、bundled 插件分片、channel 合约、Node 22 兼容性、`check`、`check-additional`、build smoke、文档检查、Python 技能、Windows、macOS，以及 Control UI i18n。独立的手动 CI 派发只有在 `include_android=true` 时才运行 Android；完整发布总罩通过传入 `include_android=true` 启用 Android。插件预发布静态检查、仅发布使用的 `agentic-plugins` 分片、完整扩展批量扫描以及插件预发布 Docker 流水线都不包含在 CI 中。Docker 预发布套件仅在 `Full Release Validation` 使用已启用发布验证门控的单独 `Plugin Prerelease` 工作流进行派发时运行。

手动运行使用唯一的并发组，因此发布候选的完整套件不会被同一 ref 上的另一次 push 或 PR 运行取消。可选的 `target_ref` 输入允许受信任的调用者针对某个分支、标签或完整 commit SHA 运行该图，同时使用所选派发 ref 的工作流文件。

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## 运行器

| Runner                           | Jobs                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ubuntu-24.04`                   | `preflight`、快速安全任务及汇总（`security-scm-fast`、`security-dependency-audit`、`security-fast`）、快速协议/契约/捆绑检查、分片 channel 契约检查、除 lint 外的 `check` 分片、`check-additional` 汇总、Node 测试汇总验证器、文档检查、Python skills、workflow-sanity、labeler、auto-response；install-smoke 预检也使用 GitHub 托管的 Ubuntu，因此 Blacksmith 矩阵可以更早排队 |
| `blacksmith-4vcpu-ubuntu-2404`   | `CodeQL Critical Quality`、较低权重的扩展分片、`checks-fast-core`、`checks-node-compat-node22`、`check-prod-types` 和 `check-test-types`                                                                                                                                                                                                                                                                                                                  |
| `blacksmith-8vcpu-ubuntu-2404`   | `build-artifacts`、build-smoke、Linux Node 测试分片、bundled plugin 测试分片、`check-additional` 分片、`android`                                                                                                                                                                                                                                                                                                                                        |
| `blacksmith-16vcpu-ubuntu-2404`  | `check-lint`（对 CPU 敏感到 8 vCPU 的成本高于收益）；install-smoke Docker 构建（32-vCPU 的排队时间成本高于收益）                                                                                                                                                                                                                                                                                                                                       |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `blacksmith-6vcpu-macos-latest`  | `openclaw/openclaw` 上的 `macos-node`；fork 会回退到 `macos-latest`                                                                                                                                                                                                                                                                                                                                                                                         |
| `blacksmith-12vcpu-macos-latest` | `openclaw/openclaw` 上的 `macos-swift`；fork 会回退到 `macos-latest`                                                                                                                                                                                                                                                                                                                                                                                        |

Canonical-repo CI 将 Blacksmith 保持为默认运行器路径。在 `preflight` 期间，`scripts/ci-runner-labels.mjs` 会检查近期已排队和正在进行的 Actions 运行，以查找排队中的 Blacksmith 任务。如果某个特定的 Blacksmith 标签已经有排队任务，那么本次运行中将使用该确切标签的下游任务会回退到匹配的 GitHub 托管运行器（`ubuntu-24.04`、`windows-2025` 或 `macos-latest`）。同一 OS 家族中的其他 Blacksmith 规格仍保持其主标签。如果 API 探测失败，则不会应用回退。

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
pnpm test                                     # vitest 测试
pnpm test:changed                             # 便宜且智能的 changed Vitest 目标
pnpm test:channels
pnpm test:contracts:channels
pnpm check:docs                               # 文档格式 + lint + 断链检查
pnpm build                                    # 当 CI artifact/build-smoke 车道很重要时构建 dist
pnpm ci:timings                               # 汇总最近一次 origin/main push 的 CI 运行
pnpm ci:timings:recent                        # 比较最近成功的 main CI 运行
node scripts/ci-run-timings.mjs <run-id>      # 汇总总耗时、排队时间和最慢的任务
node scripts/ci-run-timings.mjs --latest-main # 忽略 issue/comment 噪音并选择 origin/main push 的 CI
node scripts/ci-run-timings.mjs --recent 10   # 比较最近成功的 main CI 运行
pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json
pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json
pnpm perf:kova:summary --report .artifacts/kova/reports/mock-provider/report.json --output .artifacts/kova/summary.md
```

## OpenClaw 性能

`OpenClaw Performance` 是产品/运行时性能工作流。它会在 `main` 上每天运行，也可以手动派发：

```bash
gh workflow run openclaw-performance.yml --ref main -f profile=diagnostic -f repeat=3
gh workflow run openclaw-performance.yml --ref main -f profile=smoke -f repeat=1 -f deep_profile=true -f live_gpt54=true
gh workflow run openclaw-performance.yml --ref main -f target_ref=v2026.5.2 -f profile=diagnostic -f repeat=3
```

手动派发通常会基准测试工作流所指向的 ref。将 `target_ref` 设置为某个发布标签或另一分支，以使用当前工作流实现进行基准测试。已发布报告路径和最新指针以被测试的 ref 为键，每个 `index.md` 都会记录被测试的 ref/SHA、工作流 ref/SHA、Kova ref、profile、lane auth 模式、模型、重复次数和场景过滤器。

该工作流会从固定版本中安装 OCM，并从 `openclaw/Kova` 中安装 Kova，使用固定的 `kova_ref` 输入，然后运行三条 lane：

- `mock-provider`：针对本地构建运行时运行 Kova 诊断场景，使用确定性的 fake OpenAI 兼容认证。
- `mock-deep-profile`：对启动、gateway 和 agent-turn 热点进行 CPU/heap/trace 分析。
- `live-gpt54`：一次真实的 OpenAI `openai/gpt-5.4` agent turn；当 `OPENAI_API_KEY` 不可用时会跳过。

`mock-provider` lane 在 Kova 通过后还会运行 OpenClaw 原生源代码探测：跨默认、hook 和 50-plugin 启动场景的 gateway 启动时间和内存；重复的 mock-OpenAI `channel-chat-baseline` hello 循环；以及针对已启动 gateway 的 CLI 启动命令。源代码探测的 Markdown 摘要位于报告包中的 `source/index.md`，其原始 JSON 紧随其后。

每条 lane 都会上传 GitHub artifacts。配置了 `CLAWGRIT_REPORTS_TOKEN` 时，工作流还会将 `report.json`、`report.md`、bundles、`index.md` 和源代码探测 artifacts 提交到 `openclaw/clawgrit-reports`，路径为 `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/`。当前 tested-ref 指针会写入为 `openclaw-performance/<tested-ref>/latest-<lane>.json`。

## 完整发布验证

`Full Release Validation` 是用于“发布前运行全部内容”的手动总工作流。它接受分支、标签或完整 commit SHA，针对该目标派发手动的 `CI` 工作流，派发 `Plugin Prerelease` 以进行仅发布用途的插件/包/静态资源/Docker 证明，并派发 `OpenClaw Release Checks` 以执行 install smoke、包接受、跨 OS 包检查、QA Lab 对等性、Matrix 和 Telegram 车道。稳定/默认运行会将详尽的 live/E2E 和 Docker 发布路径覆盖保留在 `run_release_soak=true` 之后；`release_profile=full` 会强制开启该 soak 覆盖，以便广泛的 advisory 验证仍然保持广泛。搭配 `rerun_group=all` 和 `release_profile=full` 时，它还会针对发布检查中的 `release-package-under-test` artifact 运行 `NPM Telegram Beta E2E`。发布后，传入 `npm_telegram_package_spec` 可针对已发布的 npm 包重新运行相同的 Telegram 包车道。

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

For recovery, both `Full Release Validation` and `OpenClaw Release Checks` accept `rerun_group`. Use `all` for a release candidate, `ci` for only the normal full CI child, `plugin-prerelease` for only the plugin prerelease child, `release-checks` for every release child, or a narrower group: `install-smoke`, `cross-os`, `live-e2e`, `package`, `qa`, `qa-parity`, `qa-live`, or `npm-telegram` on the umbrella. This keeps a failed release box rerun bounded after a focused fix. For one failed cross-OS lane, combine `rerun_group=cross-os` with `cross_os_suite_filter`, for example `windows/packaged-upgrade`; long cross-OS commands emit heartbeat lines and packaged-upgrade summaries include per-phase timings. QA release-check lanes are advisory, so QA-only failures warn but do not block the release-check verifier.

`OpenClaw Release Checks` uses the trusted workflow ref to resolve the selected ref once into a `release-package-under-test` tarball, then passes that artifact to cross-OS checks and Package Acceptance, plus the live/E2E release-path Docker workflow when soak coverage runs. That keeps the package bytes consistent across release boxes and avoids repacking the same candidate in multiple child jobs.

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

- `source=npm` 只接受 `openclaw@beta`、`openclaw@latest`，或像 `openclaw@2026.4.27-beta.2` 这样的精确 OpenClaw 发布版本。用于已发布的预发布/稳定版接受。
- `source=ref` 打包受信任的 `package_ref` 分支、标签或完整提交 SHA。解析器会获取 OpenClaw 的分支/标签，验证所选提交可从仓库分支历史或发布标签访问，在分离的 worktree 中安装依赖，并使用 `scripts/package-openclaw-for-docker.mjs` 进行打包。
- `source=url` 下载一个 HTTPS `.tgz`；此时 `package_sha256` 是必需的。
- `source=artifact` 从 `artifact_run_id` 和 `artifact_name` 下载一个 `.tgz`；`package_sha256` 可选，但对于外部共享工件应提供。

请将 `workflow_ref` 和 `package_ref` 分开。`workflow_ref` 是运行测试的受信任工作流/harness 代码。`package_ref` 是在 `source=ref` 时被打包的源代码提交。这样当前测试 harness 就可以验证较旧但受信任的源代码提交，而无需运行旧的工作流逻辑。

### 套件 profile

- `smoke` — `npm-onboard-channel-agent`、`gateway-network`、`config-reload`
- `package` — `npm-onboard-channel-agent`、`doctor-switch`、`update-channel-switch`、`upgrade-survivor`、`published-upgrade-survivor`、`plugins-offline`、`plugin-update`
- `product` — `package` 外加 `mcp-channels`、`cron-mcp-cleanup`、`openai-web-search-minimal`、`openwebui`
- `full` — 含 OpenWebUI 的完整 Docker release-path 分块
- `custom` — 精确的 `docker_lanes`；当 `suite_profile=custom` 时必需

`package` profile 使用离线插件覆盖，因此已发布包的验证不会受制于线上 ClawHub 可用性。可选的 Telegram lane 在 `NPM Telegram Beta E2E` 中重用 `package-under-test` 工件，而已发布的 npm spec 路径仍保留给独立分发使用。

关于专门的更新和插件测试策略，包括本地命令、Docker lanes、Package Acceptance 输入、发布默认值和失败排查，请参见 [Testing updates and plugins](/help/testing-updates-plugins)。

Release checks 会使用 `source=artifact`、准备好的发布包工件、`suite_profile=custom`、`docker_lanes='doctor-switch update-channel-switch upgrade-survivor published-upgrade-survivor plugins-offline plugin-update'` 以及 `telegram_mode=mock-openai` 调用 Package Acceptance。这样可以让包迁移、更新、陈旧插件依赖清理、已配置插件安装修复、离线插件、plugin-update 和 Telegram 证明都基于同一个已解析的包 tarball。将 `package_acceptance_package_spec` 设置在 Full Release Validation 或 OpenClaw Release Checks 上，可以针对已发布的 npm 包而不是 SHA 构建的工件运行同样的矩阵。跨操作系统的 release checks 仍然覆盖与操作系统相关的 onboarding、installer 和平台行为；包/更新产品验证应从 Package Acceptance 开始。`published-upgrade-survivor` Docker lane 在阻塞式发布路径中每次运行验证一个已发布包基线。在 Package Acceptance 中，解析得到的 `package-under-test` tarball 始终是候选包，而 `published_upgrade_survivor_baseline` 选择回退的已发布基线，默认值为 `openclaw@latest`；失败 lane 的重跑命令会保留该基线。使用 `run_release_soak=true` 或 `release_profile=full` 的 Full Release Validation 会设置 `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` 和 `published_upgrade_survivor_scenarios=reported-issues`，以扩展到最近四个稳定版 npm 发布以及固定的插件兼容性边界版本，并覆盖用于飞书配置、保留的 bootstrap/persona 文件、已配置的 OpenClaw 插件安装、波浪线日志路径以及陈旧旧版插件依赖根的 issue 形态 fixtures。多基线的 published-upgrade survivor 选择会按基线分片，拆分为独立的定向 Docker 运行器作业。单独的 `Update Migration` 工作流在问题是穷尽式已发布更新清理而不是常规 Full Release CI 广度时，会使用带有 `all-since-2026.4.23` 和 `plugin-deps-cleanup` 的 `update-migration` Docker lane。本地聚合运行可以通过 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` 传入精确包规格，使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 保持单个 lane，例如 `openclaw@2026.4.15`，或者设置 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` 以指定场景矩阵。已发布 lane 会用内置的 `openclaw config set` 命令配方配置基线，在 `summary.json` 中记录配方步骤，并在 Gateway 启动后探测 `/healthz`、`/readyz` 以及 RPC 状态。Windows 打包和 installer fresh lanes 还会验证已安装包是否可以从原始绝对 Windows 路径导入 browser-control override。OpenAI 跨操作系统 agent-turn smoke 在设置了 `OPENCLAW_CROSS_OS_OPENAI_MODEL` 时默认使用该值，否则使用 `openai/gpt-5.4`，因此安装和 gateway 证明会停留在 GPT-5 测试模型上，同时避免 GPT-4.x 默认值。

### 旧版兼容窗口

Package Acceptance 对已发布包提供有边界的旧版兼容窗口。对于 `2026.4.25` 及之前的包，包括 `2026.4.25-beta.*`，可以使用兼容路径：

- `dist/postinstall-inventory.json` 中已知的私有 QA 条目可以指向 tarball 中省略的文件；
- 当包未暴露该标志时，`doctor-switch` 可以跳过 `gateway install --wrapper` 持久化子场景；
- `update-channel-switch` 可以从基于 tarball 的伪 git fixture 中清理缺失的 `pnpm.patchedDependencies`，并且可以记录缺失的持久化 `update.channel`；
- plugin smoke 可以读取旧版安装记录位置，或接受 marketplace 安装记录持久化缺失；
- `plugin-update` 可以允许配置元数据迁移，同时仍然要求安装记录和 no-reinstall 行为保持不变。

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

# 复用另一个 Actions 运行上传的 tarball。
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

## Install smoke

独立的 `Install Smoke` 工作流通过自己的 `preflight` 作业复用同一范围脚本。它将 smoke 覆盖拆分为 `run_fast_install_smoke` 和 `run_full_install_smoke`。

- **Fast path** 适用于触及 Docker/package 表面、捆绑插件 package/manifest 变更，或 Docker smoke 作业会执行到的核心插件/channel/gateway/Plugin SDK 表面的拉取请求。仅源代码层面的捆绑插件改动、仅测试改动和仅文档改动不会占用 Docker worker。fast path 会先构建一次根 Dockerfile 镜像，检查 CLI，运行 agents delete shared-workspace CLI smoke，运行容器 gateway-network e2e，验证捆绑扩展 build arg，并在 240 秒的聚合命令超时下运行受限的捆绑插件 Docker profile（每个场景的 Docker run 会单独设上限）。
- **Full path** 为夜间定时运行、手动分发、workflow-call 发布检查，以及真正触及 installer/package/Docker 表面的拉取请求保留 QR package install 和 installer Docker/update 覆盖。在 full 模式下，install-smoke 会准备或复用一个目标 SHA 的 GHCR 根 Dockerfile smoke 镜像，然后将 QR package install、根 Dockerfile/gateway smoke、installer/update smoke 以及 fast bundled-plugin Docker E2E 作为独立作业运行，这样 installer 工作就不必排在根镜像 smoke 后面等待。

`main` 推送（包括合并提交）不会强制进入 full path；当变更范围逻辑在 push 场景下要求完整覆盖时，工作流仍保持 fast Docker smoke，并将完整的 install smoke 留给夜间或发布验证。

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

当前的 release Docker 分块为 `core`、`package-update-openai`、`package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、`plugins-runtime-services`，以及 `plugins-runtime-install-a` 到 `plugins-runtime-install-h`。`plugins-runtime-core`、`plugins-runtime` 和 `plugins-integrations` 仍然是聚合的 plugin/runtime 别名。`install-e2e` lane 别名仍然是两个 provider installer lanes 的聚合手动重跑别名。

当完整的 release-path 覆盖需要 OpenWebUI 时，它会被并入 `plugins-runtime-services`；只有在仅 OpenWebUI 的派发中，才保留独立的 `openwebui` 分块。捆绑渠道的更新 lanes 会在遇到临时 npm 网络故障时重试一次。

每个分块都会上传 `.artifacts/docker-tests/`，其中包含 lane 日志、耗时、`summary.json`、`failures.json`、阶段耗时、调度器计划 JSON、慢 lane 表，以及每个 lane 的重跑命令。工作流的 `docker_lanes` 输入会针对已准备好的镜像运行所选 lanes，而不是运行分块作业，这样可以将失败 lane 的调试范围限制在一个定向的 Docker 作业中，并为该次运行准备、下载或复用 package artifact；如果所选 lane 是 live Docker lane，则定向作业会在本地构建 live-test 镜像用于该次重跑。生成的每个 lane 的 GitHub 重跑命令会在这些值存在时包含 `package_artifact_run_id`、`package_artifact_name` 和已准备好的镜像输入，因此失败的 lane 可以复用失败运行中的确切 package 和镜像。

```bash
pnpm test:docker:rerun <run-id>      # 下载 Docker 工件并打印合并的/按 lane 定向的重跑命令
pnpm test:docker:timings <summary>   # 慢 lane 和阶段关键路径摘要
```

定时的 live/E2E 工作流会每天运行完整的 release-path Docker 套件。

## 插件预发布

`插件预发布` 是更昂贵的产品/package 覆盖，因此它是一个由 `Full Release Validation` 或显式操作员单独触发的工作流。普通 pull request、`main` 分支推送以及独立的手动 CI 派发都会关闭该套件。它将捆绑插件测试分摊到 8 个扩展 worker 上；这些扩展分片作业每次最多并行运行 2 组插件配置，每组使用 1 个 Vitest worker，并使用更大的 Node 堆，以免导入较重的插件批次额外创建 CI 作业。仅发布路径的 Docker 预发布会将定向 Docker lanes 分批成小组，以避免为持续一到三分钟的作业预留几十个 runner。

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

`Test Performance Agent` 工作流是一个事件驱动的 Codex 维护通道，用于处理慢测试。它没有纯定时调度：在 `main` 上一次成功的非机器人 push CI 运行可以触发它，但如果当天 UTC 时间内已有另一次 workflow-run 调用已经运行过或正在运行，它就会跳过。手动触发会绕过这个每日活动门槛。该通道会生成完整套件的分组 Vitest 性能报告，让 Codex 只进行小范围、保持覆盖率的测试性能修复，而不是大规模重构，然后重新运行完整套件报告，并拒绝会降低通过基线测试数量的更改。如果基线中存在失败测试，Codex 只能修复明显故障，并且在提交任何内容之前，代理后的完整套件报告必须通过。当 `main` 在机器人 push 落地之前继续前进时，该通道会对已验证的补丁执行 rebase，重新运行 `pnpm check:changed`，并重试 push；冲突的过期补丁会被跳过。它使用 GitHub 托管的 Ubuntu，因此 Codex action 可以与文档代理保持相同的 drop-sudo 安全姿态。

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

从仓库根目录运行 Testbox，并且在进行广泛验证时优先使用一个新鲜、已预热的 box。在对一个已复用、已过期或刚刚报告了异常大的同步的 box 花费慢速门控之前，先在 box 内运行 `pnpm testbox:sanity`。

当所需的根文件（例如 `pnpm-lock.yaml`）消失，或者 `git status --short` 显示至少 200 个被跟踪的删除时，sanity 检查会快速失败。这通常意味着远程同步状态不是 PR 的可信副本；停止该 box 并预热一个新 box，而不是去调试产品测试失败。对于有意的大规模删除 PR，请在该 sanity 运行中设置 `OPENCLAW_TESTBOX_ALLOW_MASS_DELETIONS=1`。

`pnpm testbox:run` 还会终止一个本地 Blacksmith CLI 调用：当它在同步阶段停留超过五分钟且没有后同步输出时。设置 `OPENCLAW_TESTBOX_SYNC_TIMEOUT_MS=0` 可禁用该保护，或者为异常大的本地差异使用更大的毫秒值。

Crabbox 是仓库自有的远程 box 封装器，用于维护者的 Linux 证明。当某个检查对本地编辑循环来说范围过大、需要与 CI 保持一致、或证明需要 secrets、Docker、package lanes、可复用 box 或远程日志时，请使用它。常规的 OpenClaw 后端是 `blacksmith-testbox`；在 Blacksmith 故障、配额问题或需要显式使用自有容量测试时，才使用自有的 AWS/Hetzner 容量作为回退。

首次运行前，请在仓库根目录检查该封装器：

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

仓库封装器会拒绝不宣称 `blacksmith-testbox` 的过期 Crabbox 二进制。即使 `.crabbox.yaml` 里有自有云默认值，也要显式传入 provider。

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

如果 Crabbox 这个层有问题，但 Blacksmith 本身可用，请使用直接的 Blacksmith 作为窄范围回退：

```bash
blacksmith testbox warmup ci-check-testbox.yml --ref main --idle-timeout 90
blacksmith testbox run --id <tbx_id> "env CI=1 NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
blacksmith testbox stop --id <tbx_id>
```

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
