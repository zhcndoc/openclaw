---
summary: "CI 作业图、范围门控、发布总罩，以及本地命令等价项"
title: "CI 流水线"
read_when:
  - 你需要了解某个 CI 作业为什么运行或未运行
  - 你正在调试一个失败的 GitHub Actions 检查
  - 你正在协调一次发布验证运行或重跑
  - 你正在更改 ClawSweeper 派发或 GitHub 活动转发
---

OpenClaw CI 在推送到 `main` 时运行（`Markdown` 和 `docs/**` 路径在触发时会被忽略），在每个非草稿拉取请求上运行，以及在手动分发时运行。规范的 `main` 推送是单飞的：`CI` 并发组允许一次完整的集成周期运行，而 GitHub 只保留最新的待处理推送。新的合并会替换那个待处理运行，而不会取消已经注册了 Blacksmith 矩阵的工作。拉取请求仍然会取消被取代的 head，而手动分发使用隔离的组。`preflight` 会对差异进行分类，并在只更改了无关区域时关闭昂贵的流水线。手动 `workflow_dispatch` 运行会有意绕过智能范围控制，并展开完整图谱，用于发布候选和广泛验证。Android 流水线仍通过 `include_android`（或 `release_gate` 输入）保持可选。仅发布时的插件覆盖位于单独的 [`插件预发布`](#plugin-prerelease) 工作流中，并且只会从 [`完整发布验证`](#full-release-validation) 或显式的手动分发中运行。

## 流水线概览

| 作业                               | 目的                                                                                                                                                                                                                | 运行时间                                      |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `preflight`                        | 检测变更范围并构建 CI 清单；在规范化、与 Node 相关的 `main` 分支上，在扇出之前刷新并维护依赖快照                                                                                                                 | 非草稿 push 和 PR 时始终运行                   |
| `security-fast`                    | 私钥检测、通过 `zizmor` 进行变更工作流审计，以及生产锁文件审计                                                                                                                                                | 非草稿 push 和 PR 时始终运行                   |
| `pnpm-store-warmup`                | 为拉取请求和手动运行预热由 lockfile 固定的 Actions 缓存，同时不阻塞 Linux Node 分片                                                                                                                         | 在 main 之外选择 Node 或 docs-check 线路时运行 |
| `build-artifacts`                  | 构建 `dist/`、Control UI、已构建 CLI 冒烟检查、启动内存，以及嵌入式已构建制品检查                                                                                                                               | 与 Node 相关的变更                            |
| `control-ui-i18n`                  | 验证生成的 Control UI 语言包、元数据和翻译记忆；自动运行时为建议性，手动发布 CI 时为阻塞性                                                                                                                     | 与 Control UI i18n 相关的变更和手动 CI        |
| `checks-fast-core`                 | 快速 Linux 正确性线路：抑制基线 max-lines 递增、bundled + protocol、Bun 启动器，以及 CI 路由 fast 任务                                                                                                         | 与 Node 相关的变更                            |
| `qa-smoke-ci-profile`              | 自包含、平衡的自动 QA 冒烟覆盖集的一部分；完整的分类覆盖仍可通过显式 QA 配置文件获得                                                                                                                         | 与 Node 相关的变更                            |
| `checks-fast-contracts-plugins-*`  | 两个加权插件契约分片                                                                                                                                                                                                  | 与 Node 相关的变更                            |
| `checks-fast-contracts-channels-*` | 两个加权通道契约分片                                                                                                                                                                                                  | 与 Node 相关的变更                            |
| `checks-node-*`                    | 拉取请求上对变更目标 Node 测试；在 `main`、手动、发布和广泛回退运行中执行完整核心分片                                                                                                                       | 与 Node 相关的变更                            |
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
| `android`                          | 两种 flavor 的 Android 单元测试，以及一个 debug APK 构建                                                                                                                                                            | 与 Android 相关的变更                          |
| `openclaw/ci-gate`                 | 最终汇总：要求 preflight 和 security；仅接受那些由清单禁用的下游线路的跳过                                                                                                                                        | 每次非草稿 CI 运行                             |
| `test-performance-agent`           | 独立工作流：在可信活动之后，每日进行 Codex 慢测试优化                                                                                                                                                               | 主 CI 成功或手动调度                           |
| `openclaw-performance`             | 独立工作流：通过 mock-provider、deep-profile 和 GPT 5.6 live 线路，按日/按需生成 Kova 运行时性能报告                                                                                                           | 定时和手动调度                                 |

独立的 Periphery 工作流会强制 iOS 和 macOS 应用保持零死代码发现。共享的 OpenClawKit 工作流会并行扫描两个消费者，并且只有当 Periphery 在两个构建中都发出相同的 Swift USR 时，才会报告一个声明。其生成的 `OpenClawProtocol/GatewayModels.swift` schema 契约被保留为生成器拥有的代码，而不是被视为应用本地死代码。

## 快速失败顺序

1. `preflight` 决定哪些 lane 实际存在。`docs-scope` 和 `changed-scope` 逻辑是此工作流中的步骤，而不是独立作业。规范化的 `main` 会立即开始，但其并发组一次只允许一个完整运行，并会将后续推送合并为一个最新的待处理运行。与 Node 相关的 `main` 推送还会在下游作业挂载 key 之前，在此处串行化唯一的依赖磁盘写入者及其大小维护；Blacksmith 可能只会让稍后的工作流运行暴露一个新提交，因此同一运行中的消费者会保留带标记检查的本地回退方案。
2. `security-fast`、`check-*`、`check-additional-*`、`check-docs` 和 `skills-python` 会快速失败，无需等待更重的 artifact 和平台矩阵作业。
3. `build-artifacts` 和区域设置检查会与快速的 Linux lane 并行。Control UI 和原生应用源代码 PR 会排除生成的区域设置快照/资源；它们串行化的刷新工作流会在后台修复并自动合并隔离的生成 PR。源代码 CI 仍会阻止过期的源清单和不安全的本地化调用。生成的 PR、手动 CI 和发布准备会强制要求完整的翻译/平台生成一致性。规范化的 `release/YYYY.M.PATCH` 分支可以将发布准备中的区域设置修复与其他生成的发布输出一并包含。
4. 随后会展开更重的平台和运行时 lane：`checks-fast-core`、`checks-fast-contracts-plugins-*`、`checks-fast-contracts-channels-*`、`checks-node-*`、`checks-windows`、`macos-node`、`macos-swift`、`ios-build` 和 `android`。
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

- **CI 工作流编辑**会验证 Node CI 图、工作流 lint，以及 Windows 车道（`ci.yml` 会执行该车道），但不会自行强制执行 iOS、Android 或 macOS 原生构建；这些平台车道仍仅针对平台源代码变更运行。
- **工作流健全性检查**会对所有工作流 YAML 文件运行 `actionlint` 和 `zizmor`，运行组合操作插值守卫，以及冲突标记守卫。PR 范围的 `security-fast` 作业还会对变更的工作流文件运行 `zizmor`，以便工作流安全发现能够在主 CI 图中尽早失败。
- **`main` 推送上的文档**由独立的 `Docs` 工作流检查，该工作流使用与 CI 相同的 ClawHub 文档镜像，因此混合代码与文档的推送不会同时排队 CI 的 `check-docs` 分片。拉取请求和手动 CI 仍会在文档发生变更时从 CI 运行 `check-docs`。
- **TUI PTY** 按证明责任拆分。专用的 `core-runtime-tui-pty` Node 分片负责针对精确头部构建的 CLI 运行完整真实后端套件。`build-artifacts` 作业仅保留本地模型往返和真实 Gateway 连接 canary，因此每个产物边界都会验证构建出的启动器，而不会在构建作业中重复完整的串行套件。
- **SQLite 会话生命周期**仅在差异触及其直接存储／会话所有者，或嵌入式运行器中的可达会话路径时，运行构建 CLI 的迁移、重启、压缩、清理和会话 RPC 证明。专用的 `check-sqlite-session-lifecycle` 作业会下载 `build-artifacts` 生成的精确运行时；手动和发布派发在目标包含该证明时始终选择它。
- **仅涉及 CI 路由的编辑、快速任务直接运行的少量核心测试夹具，以及范围有限的插件契约辅助程序编辑**会使用快速的仅 Node 清单路径：`preflight`、`security-fast`，以及变更触及的快速车道——单个 `checks-fast-core` CI 路由任务、两个插件契约分片，或两者。该路径会跳过构建产物、Node 22 兼容性、频道契约、完整核心分片、捆绑插件分片和额外守卫矩阵。
- **Windows Node 检查**仅针对 Windows 专属的进程／路径包装器、npm／pnpm／UI 运行器辅助程序、包管理器配置，以及执行该车道的 CI 工作流界面；无关的源代码、插件、安装冒烟测试和仅测试变更仍会运行 Linux Node 车道。

最慢的 Node 测试家族被拆分或均衡分配，以便每个作业保持较小规模，而不会过度占用 runner：

- 插件契约和频道契约分别作为两个经过加权的 Blacksmith 分片运行，并提供标准 GitHub runner 回退。
- 核心单元快速／支持车道分别运行；核心运行时基础设施拆分为进程、共享、钩子、机密，以及三个 cron 域分片。
- 自动回复作为均衡的工作进程运行，其中回复子树拆分为代理运行器、命令、派发、会话和状态路由分片。
- Agentic 网关／服务器（控制平面）配置拆分到聊天、身份验证、模型、HTTP／插件、运行时和启动车道，而不是等待构建产物。
- 常规 CI 仅将隔离的基础设施 include-pattern 分片打包为最多包含 64 个测试文件的确定性包，在不合并非隔离的命令／cron、带状态的 agents-core 或网关／服务器套件的情况下，减少 Node 矩阵规模。较重的固定套件继续使用 8 vCPU，而捆绑和较低权重的车道使用 4 vCPU。
- 规范仓库上的拉取请求会针对合成合并树差异，重新使用变更测试解析器。精确变更只运行一个定向 Node 作业；每个选定的测试文件都使用独立进程，以保持带状态套件的隔离性。对于工作区包、包／锁文件、共享测试框架、拆分配置、重命名或删除变更、公共扩展契约变更、具有特殊分片设置的测试、部分解析或空目标、过大的路径或目标计划，以及规划器错误，规划器会将同级测试与导入图依赖项相结合，并回退到现有的 14 作业紧凑完整套件计划。定向计划始终保留完整的构建产物边界门禁，因为其仓库扫描器无法从导入关系推导出来。`main` 推送运行同一个紧凑完整套件：待处理的中间推送事件可能会被合并，因此最新保留下来的运行必须验证完整的集成树，而不能只验证最后一次单独推送的差异。手动派发和发布门禁保留完整的按名称划分的分片矩阵。
- 完整 Node 矩阵会优先接纳一贯较慢的串行工具、自动回复命令分片，以及广泛的 core-fast 缓存写入器。这会保持 28 个作业的上限，同时防止关键路径工作和下一次运行的转换种子被推迟到后续波次。
- 广泛的浏览器、QA、媒体和其他插件测试使用各自专用的 Vitest 配置，而不是共享的插件兜底配置。Include-pattern 分片会使用 CI 分片名称记录计时条目，以便 `.artifacts/vitest-shard-timings.json` 区分整个配置和经过筛选的分片。
- Linux Node 分片作业通过上游 Actions 缓存 API 持久化 Vitest 的实验性文件系统模块缓存，Blacksmith 会在其 runner 上透明地加速该缓存。每个 CI 分片都仅负责恢复，并将受保护的种子解压到自己的 runner 本地根目录；随后分片包装器会为并发运行的 Vitest 进程提供相互独立的活动子目录。只有不取消其他任务的每日预热任务或显式派发的预热任务才会保存新的不可变归档，因此拉取请求无法发布转换结果，也不会创建每个 PR 独有的缓存族。预热任务会在新的子进程中启动每个选定的分片／配置封装，并将并发数设为 1，在复用同一个串行缓存叶节点的同时保留其 include 模式和环境。这样可以防止配置级全局状态泄漏，避免将经过筛选的分片扩展为完整配置，并保留前一个子进程生成的转换结果。转换输入指纹会清除不兼容的锁文件、包、tsconfig 和 Vitest 配置版本。受保护的写入器会扫描并清理恢复的缓存，使其在超过 2 GiB 后降至 75%。Vitest 会对模块 ID、源内容、环境和解析后的转换配置进行哈希，因此普通的部分源代码变更可以保持未变条目处于预热状态，而变更模块会安全地缓存未命中。粗粒度恢复前缀用于连接不同的工作流运行；常规 Actions 缓存的 LRU 和非活动淘汰机制会限制旧的不可变归档。
- 受信任的 Blacksmith Linux Node 作业还会从每个受支持 Node 版本线对应的一个受保护依赖磁盘中挂载 pnpm store 和 `node_modules`。GitHub 托管的作业，包括手动派发、来自 fork 的拉取请求，以及两个 UI E2E 作业在同一仓库中的重试，改用 Actions 缓存路径。包清单、安装设置、runner 平台和精确的 Node 补丁版本不会出现在磁盘键中；精确的运行时和安装输入指纹决定作业是复用目录，还是重新安装并刷新同一个磁盘。哈希计算前会对清单进行规范化。经过审计的直接根钩子只保留 pnpm 的安装生命周期脚本，因此格式化以及普通测试／构建脚本的编辑可以继续使用预热的依赖树；未经审计的生命周期钩子漂移会在其源输入加入指纹契约之前默认失败。依赖、包管理器、钩子源代码和锁文件变更始终会使快照失效。匹配的指纹是必要条件但并不充分：设置过程还会检查导入器归档和清单校验和，然后验证通过 postinstall 保留的、由注册表支持的锁文件依赖是否与 Node 根据其导入器解析出的包清单一致。缺失或过期的导入器内容会回退到全新安装，而不是提供根提升目录。只读快照不可用的拉取请求会解除工作区挂载，并安装到 runner 本地存储中，从而避免向无法发布的克隆写入缓慢数据。持续的冷安装会禁用 pnpm 的内部获取重试，并从逐步预热的 store 中最多进行三次有界的完整安装尝试；超时仍会视为失败。在内容验证恢复或冻结锁文件安装之后，设置过程会禁用 pnpm 多余的预运行依赖检查：仓库有意清理插件本地的 `node_modules`，而 pnpm 会将其视为过期内容，并在分片扇出期间通过不安全的并发隐式安装进行修复。规范 `main` preflight 是唯一的写入器，并在每次刷新时测量 store，只有在已退役的包版本将其推高到 8 GiB 以上后才运行 `pnpm store prune`。即使写入器作业完成，Blacksmith 快照发布仍是异步的，因此新键或新指纹首次运行时仍可能处于冷状态；后续通过内容验证的精确标记恢复才是发布证明。必需的 Blacksmith CI 作业以及同仓库拉取请求的首次尝试会使用一次性克隆，因此依赖变更不会创建新磁盘、竞争快照或可能取消构建的缓存锁。
- Node 分片和构建产物作业还会通过不可变 Actions 缓存恢复 Node 的便携式磁盘编译缓存。独立的 `test` 和 `build` 命名空间会防止彼此的写入器替换归档：计划任务测试预热器拥有受保护的测试种子，而 `build-artifacts` 最多可以从受信任的 `main` 推送中每天按 UTC 发布一个受保护的构建归档。PR 和普通测试作业只读取受保护的快照，因此功能分支字节码不会进入共享种子，PR 流量也不会创建缓存归档。这会在不同检出路径之间复用 Node 加载的编排代码、构建工具和外部依赖的 V8 字节码，即使源代码图只有部分发生变化也一样。Vitest 子进程会禁用继承的编译缓存，因为动态配置中可能启用覆盖率，而当脚本从字节码反序列化时，V8 覆盖率可能会失去源位置精度。
- 构建产物作业还会持久化带有内容指纹的 `build-all` 步骤输出。CI 自行构建的插件 SDK 声明会对完整的、由仓库拥有的 TypeScript／JSON 源代码图进行哈希，排除已安装和生成的目录，并在 `tsdown` 清理 `dist` 后恢复扁平声明和包桥接文件。不在该图中的文档、工作流、插件和其他变更可以复用声明快照；源代码变更会在导出门禁运行前重新构建声明。
- 完整声明构建会将 `tsdown` 拆分为 AI、工作区包和统一组。每组只缓存声明，然后仍会在恢复这些声明之前重新构建运行时 JavaScript。因此，核心或插件变更只会使大型统一图失效，而工作区包变更则会保守地使每个依赖声明组失效。公共完整构建通常使用不可变 Actions 缓存；粗粒度恢复键会为部分变更提供种子，每组内容指纹会拒绝过期数据，GitHub 的缓存配额会淘汰旧版本。每周的 Node 22 车道则会在成功运行 `main` 后发布一个为期 14 天的构建产物，并且只恢复其不可变生产者身份解析到 `main` 上该工作流的构建产物，从而避免配额 churn，同时不允许 PR 代码写入共享缓存。Private-QA 声明不会持久化到 Actions 缓存中，因为缓存命名空间并不是机密边界。
- `check-additional-*` 会将补充边界守卫列表（`scripts/run-additional-boundary-checks.mts`）分成一个提示词密集型分片（`check-additional-boundaries-a`，其中包括 Codex 提示词快照漂移检查）和一个用于其余分片的组合分片（`check-additional-boundaries-bcd`），每个分片都会并发运行独立守卫，并打印每项检查的计时。包边界编译／canary 工作保持在一起，而运行时拓扑架构则与嵌入 `build-artifacts` 的网关监视覆盖分开运行。
- 在 32-vCPU 的自托管构建 runner 上，Gateway 监视、频道测试和核心支持边界分片会在 `build-artifacts` 内同时启动，此时 `dist/` 和 `dist-runtime/` 已经构建完成。GitHub 托管的回退运行会让 Gateway 监视保持串行，以免低核心数竞争消耗其就绪期限。随后，两条路径都会单独运行两个已构建 TUI PTY 产物 canary；专用 Node 分片负责完整的串行套件。

一旦被接纳，canonical Linux CI 允许最多 28 个并发 Node 测试作业，而较小的 fast／check 车道则允许 12 个；Windows 和 Android 保持在两个，因为这些 runner 池更窄。紧凑的整配置批次使用 120 分钟的批次超时，而 include-pattern 组共享同一个受限作业预算。

Android CI 会同时运行 `testPlayDebugUnitTest` 和 `testThirdPartyDebugUnitTest`，然后构建 Play debug APK。第三方 flavor 没有独立的源集或清单；其单元测试车道仍会使用 SMS／通话记录 BuildConfig 标志编译该 flavor，同时避免在每次与 Android 相关的推送中重复执行 debug APK 打包作业。每个当前的 Gradle 任务都有一个受保护的持续磁盘；PR 作业使用一次性克隆，而受保护的运行会就地刷新基于内容寻址的 Gradle 条目。

Blacksmith 持久磁盘键会有意限制在受支持的运行时或任务维度内，绝不会包含 PR 编号、提交、运行、分支或依赖哈希。运行时转换和编译缓存使用 Actions 缓存而非持久磁盘，因为不可变归档能够提供可验证的恢复／保存结果，并避免可变快照提升失败。持久键版本迁移后，只将确切的过时键、架构和区域身份添加到 `.github/retired-sticky-disks.json`，使用相同维度从 `main` 派发 `Sticky Disk Cleanup` 并确认，验证删除结果，然后移除这些条目。该工作流会将 ARM 身份路由到 ARM runner，拒绝 runner 与区域不匹配的情况，使用 Blacksmith 的精确键删除操作，并且绝不会删除 Docker 构建器缓存或通配符前缀。Actions 缓存归档使用常规 LRU 和非活动淘汰。

`check-dependencies` 分片会运行生产环境 Knip 依赖、未使用文件和未使用导出检查。未使用文件守卫会在 PR 添加新的、未经审查的未使用文件，或保留过时的允许列表条目时失败，同时保留 Knip 无法静态解析的、有意存在的动态插件、生成、构建、实时测试和包桥接界面。未使用导出守卫会排除测试支持文件，并对每个未使用的生产导出失败；有意使用动态消费者的情况必须在 `config/knip.config.ts` 中建模。历史目标在提供导出守卫时运行该守卫，否则继续使用其较旧的死代码回退检查。

## ClawSweeper 活动转发

`.github/workflows/clawsweeper-dispatch.yml` 是从 OpenClaw 仓库活动到 ClawSweeper 的目标端桥接。它不会检出或执行不受信任的 pull request 代码。该工作流会使用 `CLAWSWEEPER_APP_PRIVATE_KEY` 创建一个 GitHub App 令牌，然后将精简的 `repository_dispatch` 负载派发到 `openclaw/clawsweeper`。

该工作流包含三条通道：

- `clawsweeper_item`：用于精确的 issue 和 pull request 审查请求；
- `clawsweeper_comment`：用于 issue 评论中的显式 ClawSweeper 命令；
- `github_activity`：用于 ClawSweeper 代理可能检查的常规 GitHub 活动。

`github_activity` 流水线仅转发规范化的元数据：事件类型、动作、actor、仓库、条目编号、URL、标题、状态，以及在存在时评论或审查的简短摘录。它有意避免转发完整 webhook 正文。`openclaw/clawsweeper` 中接收的工作流是 `.github/workflows/github-activity.yml`，它会把规范化事件发布到 OpenClaw Gateway hook，供 ClawSweeper 代理使用。

主分支上的推送仍作为 `github_activity` 观察事件处理。它们不会生成托管的逐提交报告或提交 Check Runs。

常规活动属于观察，而非默认交付。ClawSweeper 代理会在其提示中收到 Discord 目标，并且仅当事件令人意外、可采取行动、存在风险或具有运维价值时，才应发布到 `#clawsweeper`。常规的开启、编辑、机器人活动、重复的 webhook 噪声和正常的审查流量都应返回 `NO_REPLY`。

将 GitHub 标题、评论、正文、审查文本、分支名和提交消息在整个路径中都视为不受信任的数据。它们是用于摘要和分诊的输入，而不是用于工作流或代理运行时的指令。

Barnacle 将带有 bug 标签的 issue 视为待验证候选项，而不是因不活跃而关闭的候选项。它可以添加 `stale` 标签，从而派发一次精确的 ClawSweeper 审查，但不能关闭该 issue。随后，ClawSweeper 可能会应用有证据支持的解决方案；当前 `main` 上已证实的修复会将其关闭为已完成，而当前仍存在问题或结论不明确的 bug 则保持打开状态。stale 工作流还会审计最近的关闭事件，并在 Barnacle 身份将 bug 关闭为 `not_planned` 时失败。

## 手动派发

手动 CI 派发运行与常规 CI 使用相同的作业图，但会强制启用每个非 Android 范围的任务通道：Linux Node 分片、bundled-plugin 分片、插件和 channel contract 分片、Node 22 兼容性、`check-*`、`check-additional-*`、构建产物冒烟检查、文档检查、Python skills、Windows、macOS、iOS 构建，以及 Control UI/原生应用国际化。自动源代码 PR 会验证原生提取清单和 Android/Apple 本地化安全性，但不要求在同一个 PR 中包含已翻译或平台生成的输出。串行化的 Native App Locale Refresh 工作流会在一个隔离的 PR 中重新构建这些产物，并在必需检查通过后启用精确头提交自动合并。对于生成产物 PR、手动 CI、Full Release Validation 和发布准备，完整原生对等性仍然是阻塞性要求。Control UI 本地化对等性在自动 PR 和 `main` 运行中仍仅供参考，而在手动/发布 CI 中是阻塞性要求。独立的手动 CI 派发仅在使用 `include_android=true` 时运行 Android（`release_gate` 输入也会强制启用 Android）；完整发布总流程通过传入 `include_android=true` 来启用 Android。插件预发布静态检查、仅限发布的 `agentic-plugins` 分片、完整扩展批量扫描，以及插件预发布 Docker 通道均不包含在 CI 中。Docker 预发布套件仅在 `Full Release Validation` 启用发布验证门控并派发独立的 `Plugin Prerelease` 工作流时运行。

PR 最大行数检查会从已检出的合成合并树中推导基线，并验证其头父提交与事件头提交一致。手动运行使用唯一的并发组，因此同一引用上的另一个推送或 PR 运行不会取消某个发布候选完整套件。可选的 `target_ref` 输入允许受信任的调用者使用所选派发引用上的工作流文件，将该作业图运行在分支、标签或完整提交 SHA 上；最大行数基线会与该运行所解析出的默认分支头部的目标合并基点进行比较。`release_gate` 输入是容量受阻 PR CI 的精确 SHA 维护者回退方案：它要求 `target_ref` 为完整提交 SHA，且与已派发分支头部匹配，并要求 `pull_request_number` 用于标识其合并树将被验证的开放状态 PR。

```bash
gh workflow run ci.yml --ref release/YYYY.M.PATCH
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
VALIDATION_SHA="<full-commit-sha>"
gh workflow run full-release-validation.yml --ref main \
  -f ref="$VALIDATION_SHA" \
  -f expected_sha="$VALIDATION_SHA"
```

Gateway extended-stable 从 `extended-stable/YYYY.M.33` 运行 npm 预检、Full Release Validation 和插件 npm 发布；核心发布会使用这三个运行 ID 以及验证尝试。`release-ci/*` 证据无效，因为发布流程会将每次运行绑定到规范分支和发布 SHA。该标签会发布 Gateway 镜像以及仅有的 `extended-stable*` 别名；此路径会跳过常规编排器及其 ClawHub、原生应用、GitHub Release、网站和私有 dist-tag 发布面。有关命令和恢复方法，请参阅[每月 Gateway extended-stable 发布](/reference/RELEASING#monthly-gateway-extended-stable-publication)。

## 运行器

| 运行器                          | 作业                                                                                                                                                                                                                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ubuntu-24.04`                  | `security-fast`、手动 CI dispatch 和非规范仓库回退、两个 UI E2E 作业的拉取请求重试、QA Smoke aggregate、CodeQL 安全和质量扫描、workflow-sanity、labeler、auto-response、独立的 Docs workflow，以及完整的 Install Smoke workflow           |
| `blacksmith-4vcpu-ubuntu-2404`  | `preflight`、`pnpm-store-warmup`、`native-i18n`、除 QA Smoke CI 外的 `checks-fast-core`、plugin/channel contract shards、大多数 bundled/lower-weight Linux Node shards、除 `check-lint` 外的 `check-*` lanes、选定的 `check-additional-*` shards、`check-docs`，以及 `skills-python`                      |
| `blacksmith-8vcpu-ubuntu-2404`  | 保留的重型 Linux Node suites、同仓库拉取请求和推送首次尝试中的串行 Chromium/Vite `checks-ui-e2e` lane（三个 Control UI shards 加一个 browser extension shard）、boundary/extension-heavy `check-additional-*` shards、`check-sqlite-session-lifecycle`，以及 `android` |
| `blacksmith-16vcpu-ubuntu-2404` | 自动 QA Smoke CI shards、同仓库拉取请求和推送首次尝试中的 `checks-ui-e2e-real-gateway`、CI 和 Testbox 中的 `build-artifacts`，以及 `check-lint`（其 CPU 敏感度足够高，使用 8 vCPU 的成本反而高于节省的成本）                                                                    |
| `blacksmith-8vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                                                                                       |
| `blacksmith-6vcpu-macos-15`     | `openclaw/openclaw` 上的 `macos-node`；forks 回退到 `macos-15`                                                                                                                                                                                                                                     |
| `blacksmith-12vcpu-macos-26`    | `openclaw/openclaw` 上的 `macos-swift` 和 `ios-build`；forks 回退到 `macos-26`                                                                                                                                                                                                                    |

## 运行器注册预算

OpenClaw 当前的 GitHub runner-registration bucket 在 `ghx api rate_limit` 中报告每 5 分钟有 10,000 次自托管运行器注册。每次调优前都要重新检查 `actions_runner_registration`，因为 GitHub 可能会更改这个 bucket。该限制由 `openclaw` 组织中所有 Blacksmith 运行器注册共享，因此再添加一个 Blacksmith 安装也不会带来新的 bucket。

将 Blacksmith 标签视为突发控制的稀缺资源。只负责路由、通知、汇总、选择分片或运行短时 CodeQL 扫描的作业，除非已测得明确的 Blacksmith 特定需求，否则应继续使用 GitHub 托管运行器。任何新的 Blacksmith matrix、更大的 `max-parallel` 或高频工作流，都必须展示其最坏情况下的注册次数，并将组织级目标控制在实时 bucket 的约 60% 以下。按当前 10,000 次注册的 bucket 计算，这意味着 6,000 次注册的运行目标，为并发仓库、重试和突发重叠留出余量。

已更改目标的 PR 方案将常见的 Node 测试突发从 14 次 Blacksmith 注册减少到 1 次。广泛风险的 PR 仍保留 14 次注册的紧凑回退方案，因此最坏情况不会增加。

规范仓库 CI 会继续将 Blacksmith 作为推送和首次尝试的同仓库拉取请求运行的默认运行器路径。两个 UI E2E 作业的拉取请求重试均使用 GitHub 托管的 Ubuntu；推送重试仍使用 Blacksmith。所有 `workflow_dispatch` 运行（包括 `release_gate`）以及非规范仓库运行，均使用 GitHub 托管运行器。规范仓库的正常运行目前不会探测 Blacksmith 队列健康状况，也不会在 Blacksmith 不可用时自动回退到 GitHub 托管标签。

## 表面棘轮

两个仅缩减预算保护配置表面。两者在增长时都会使 CI 失败，直到在同一个 PR 中有意识地更新预算文件；并且当清理工作降低实际数量时，两者都要求向下收紧棘轮。

- `config/env-var-count-budget.txt` 限制生产源代码中 `src/`、`packages/` 和 `extensions/` 下不同 `OPENCLAW_*` 名称的数量（不包括测试和 QA Lab）。由 `node --import tsx scripts/check-env-var-count.mts` 检查。
  移除环境变量：在同一个 PR 中降低该数量。添加环境变量属于配置表面决策——请在 PR 正文中说明理由。
- `docs/.generated/config-baseline.counts.json` 限制 `openclaw.json` 架构条目按类型（核心/频道/插件）划分的数量。由 `pnpm config:docs:check` 检查；架构发生任何更改后，使用 `pnpm config:docs:gen` 重新生成。

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

`OpenClaw Performance` 是产品／运行时性能工作流。它会在 `main` 上每天运行，也可以手动派发：

```bash
gh workflow run openclaw-performance.yml --ref main -f profile=diagnostic -f repeat=3
gh workflow run openclaw-performance.yml --ref main -f profile=smoke -f repeat=1 -f deep_profile=true -f live_openai_candidate=true
gh workflow run openclaw-performance.yml --ref main -f target_ref=v2026.5.2 -f profile=diagnostic -f repeat=3
```

手动派发通常会基准测试工作流所指向的 ref。将 `target_ref` 设置为某个发布标签或另一分支，以使用当前工作流实现进行基准测试。已发布报告路径和最新指针以被测试的 ref 为键，每个 `index.md` 都会记录被测试的 ref／SHA、工作流 ref／SHA、Kova ref、profile、通道认证模式、模型、重复次数和场景过滤器。

该工作流会从固定版本中安装 OCM，并从 `openclaw/Kova` 中安装 Kova，使用固定的 `kova_ref` 输入，然后运行三条通道：

- `mock-provider`：针对本地构建运行时的 Kova 诊断场景，使用确定性的模拟 OpenAI 兼容认证。
- `mock-deep-profile`：针对启动、网关和 agent-turn 热点进行 CPU／heap／trace 性能分析。在计划任务中运行，或在派发时设置 `deep_profile=true` 运行。
- `live-openai-candidate`：一次真实的 OpenAI `openai/gpt-5.6-luna` agent turn；当 `OPENAI_API_KEY` 不可用时会跳过。在计划任务中运行，或在派发时设置 `live_openai_candidate=true` 运行。

在 Kova 通过后，`mock-provider` 通道还会运行 OpenClaw 原生源代码探测：默认、跳过通道、internal-hook 和 fifty-plugin 启动场景下的网关启动时间和内存；捆绑插件导入 RSS、重复的模拟 OpenAI `channel-chat-baseline` 问候循环、针对已启动网关的 CLI 启动命令，以及 SQLite 状态 smoke 性能探测。当被测试 ref 对应的上一份已发布 mock-provider 源代码报告可用时，源代码摘要会将当前 RSS 和 heap 值与该基线进行比较，并将较大的 RSS 增长标记为 `watch`。源代码探测的 Markdown 摘要位于报告包中的 `source/index.md`，其原始 JSON 与之相邻。

每条通道都会上传其完整的 GitHub 构建产物，包括 CPU、heap、trace 和压缩后的诊断包。一个单独的发布器作业会下载并验证这些构建产物，然后生成一个短期的 ClawSweeper GitHub App 令牌，该令牌仅限于 `openclaw/clawgrit-reports` 的内容权限，并且只会将其传递给 Git 推送步骤。它会在 `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/` 下提交 `report.json`、`report.md`、`index.md`、源探测构建产物以及 bundle 元数据／校验和；完整的诊断归档仍保留在关联的 Actions 构建产物中。发布器在尝试推送之前，会拒绝任何超过 50 MB 的报告文件。当前的 tested-ref 指针是 `openclaw-performance/<tested-ref>/latest-<lane>.json`。计划运行和 `profile=release` 派发如果应用令牌创建或报告发布失败，则会失败。非 release 的手动派发会在认证或发布失败时将发布视为建议性操作，并保留 GitHub 构建产物。上一份源基线会从公共报告仓库匿名获取，因此成功获取基线并不能证明发布器认证有效。

## 完整发布验证

`Full Release Validation` 是手动发布总控。每次运行都会绑定一个精确的 Validation SHA + Tooling SHA 元组，并在分发子工作流之前拒绝 `expected_sha` 不匹配。Validation SHA 会映射到用于产品验证的 Code SHA，或用于仅变更日志验证的 Release SHA；它不是第三个发布身份。Beta-publish 映射到 `release_profile=beta`，并设置 `run_release_soak=false`；其 `all` 运行包含常规 CI、Plugin Prerelease、package/install/cross-OS 检查、性能和 QA parity，但排除广泛的 live/E2E 和 QA-live。Postpublish-confidence 使用精确的已发布包，并运行 soak 或明确的定向组。Stable-publish 映射到 `release_profile=stable`。

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

GitHub workflow dispatch refs 必须是分支或标签，不能是原始的 commit SHA。该辅助工具会在受信任的 Tooling SHA 处推送一个临时的 `release-ci/<sha>-...` 分支，通过 `ref` 和 `expected_sha` 传递请求的 Validation SHA，在可用时复用严格的精确目标证据，并验证每个子工作流的 `headSha` 都与 Tooling SHA 匹配。

`release_profile` 控制传入发布检查的 live/provider 广度。手动发布工作流默认使用 `stable`；只有在你有意想要更广泛的 advisory provider/media 矩阵时才使用 `full`。稳定版和完整发布检查始终运行详尽的 live/E2E 和 Docker 发布路径 soak；beta profile 可通过 `run_release_soak=true` 选择启用。

`fail_fast` 默认为 `false`：总控会等待每个已触发的子工作流，并汇总报告各自的失败。只有当某个子工作流在首个任务失败后立即取消，比获取完整的失败清单更有价值时，才应设置 `fail_fast=true`。在 Release Checks 中，这也会启用 Matrix QA CLI 自带的“首个场景失败即取消”功能。

- `beta` 保留速度最快的 OpenAI/核心发布关键线路。
- `stable` 增加稳定版 provider/backend 集合。
- `full` 运行范围更广的建议性 provider/media 矩阵。

总控会记录已分发的子运行 ID，并且 `Verify full validation` 会在该父运行尝试期间检查这些 ID。父运行取消或超时不会停止已接管的子运行；当某个子运行不再需要时，请显式取消它。

对于恢复操作，请先在编辑前对产品、harness/tooling/provenance、基础设施/凭证和包装器故障进行分类。只有确认是产品故障时，才会更改 Code SHA。使用一次诊断、在需要时进行一次修复，以及一次范围狭窄的 `rerun_group` 重试，然后重新评估；绝不要自动扩大到 `all`。范围狭窄的证据本身并不构成发布授权。

`OpenClaw Release Checks` 使用受信任的工作流 ref 将所选 ref 一次性解析为 `release-package-under-test` tarball，然后将该 artifact 传递给跨 OS 检查和 Package Acceptance；当运行 soak 覆盖时，还会传递给 live/E2E 发布路径 Docker 工作流。这样可确保不同发布盒子之间的包字节一致，并避免在多个子作业中重复重新打包同一个候选版本。对于 Codex npm 插件 live 任务线，release checks 要么传递一个由 `release_package_spec` 派生的、匹配的已发布插件规格，要么传递操作员提供的 `codex_plugin_spec`，要么保持输入为空，以便 Docker 脚本对所选检出的 Codex 插件进行打包。

完整发布验证的并发键由 Validation SHA、Tooling SHA 和重跑组组成，并设置 `cancel-in-progress: false`。父运行取消不会取消已接管的子运行。

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
- `source=url` 下载一个公共 HTTPS `.tgz`；`package_sha256` 为必需。此路径会拒绝 URL 凭据、非默认 HTTPS 端口、私有／内部／特殊用途主机名或已解析 IP，以及跳转到同一公共安全策略之外的重定向。
- `source=trusted-url` 从 `.github/package-trusted-sources.json` 中一个命名的 trusted-source policy 下载 HTTPS `.tgz`；`package_sha256` 和 `trusted_source_id` 为必需。仅将其用于维护者拥有的企业镜像或需要配置主机、端口、路径前缀、重定向主机或私有网络解析的私有 package 仓库。如果策略声明了 bearer auth，工作流会使用固定的 `OPENCLAW_TRUSTED_PACKAGE_TOKEN` secret；URL 中嵌入的凭据仍会被拒绝。
- `source=artifact` 从 `artifact_run_id` 和 `artifact_name` 下载一个 `.tgz`；`package_sha256` 可选，但如果是外部共享的 artifact，则应提供。

请将 `workflow_ref` 和 `package_ref` 分开。`workflow_ref` 是运行测试的受信任工作流／harness 代码。`package_ref` 是在 `source=ref` 时被打包的源代码提交。这样当前测试 harness 就可以验证较旧但受信任的源代码提交，而无需运行旧的工作流逻辑。

### 套件 profile

- `smoke` — `npm-onboard-channel-agent`、`gateway-network`、`config-reload`
- `package` — `npm-onboard-channel-agent`、`doctor-switch`、`update-channel-switch`、`skill-install`、`update-corrupt-plugin`、`upgrade-survivor`、`published-upgrade-survivor`、`root-managed-vps-upgrade`、`update-restart-auth`、`plugins-offline`、`plugin-update`
- `product` — `package` 集合加上实时 `plugins` 覆盖，替代 `plugins-offline`，另外还包括 `mcp-channels`、`cron-mcp-cleanup`、`openai-web-search-minimal`、`openwebui`
- `full` — 带有 OpenWebUI 的完整 Docker release-path chunks
- `custom` — 精确的 `docker_lanes`；当 `suite_profile=custom` 时必需

`package` profile 使用离线插件覆盖，因此已发布包的验证不会受制于线上 ClawHub 可用性。可选的 Telegram lane 在 `NPM Telegram Beta E2E` 中重用 `package-under-test` 工件，而已发布的 npm spec 路径仍保留给独立分发使用。

关于专门的更新和插件测试策略，包括本地命令、Docker lanes、Package Acceptance 输入、发布默认值和失败排查，请参见 [测试更新和插件](/help/testing-updates-plugins)。

Release checks 调用 Package Acceptance 时使用 `source=artifact`、准备好的 release package artifact、`suite_profile=custom`、`docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor root-managed-vps-upgrade update-restart-auth plugins-offline plugin-update plugin-binding-command-escape'`，以及 `telegram_mode=mock-openai`。这样可以让 package migration、update、实时 ClawHub skill install、stale-plugin-dependency cleanup、configured-plugin install repair、offline plugin、plugin-update 和 Telegram proof 都基于同一个已解析的 package tarball。对于 Full Release Validation 或 OpenClaw Release Checks，在发布 beta 后设置 `release_package_spec`，即可在不重新构建的情况下，对已发布的 npm package 运行同一矩阵；只有当 Package Acceptance 需要与其余 release validation 不同的 package 时，才设置 `package_acceptance_package_spec`。跨 OS 的 release checks 仍然覆盖 OS 特定的 onboarding、installer 和平台行为；package／update 产品验证应从 Package Acceptance 开始。

`published-upgrade-survivor` Docker lane 会在阻塞式 release path 中验证每次运行的一个已发布 package baseline。在 Package Acceptance 中，已解析的 `package-under-test` tarball 始终是 candidate，而 `published_upgrade_survivor_baseline` 选择回退的已发布 baseline，默认为 `openclaw@latest`；失败 lane 的重新运行命令会保留该 baseline。启用 `run_release_soak=true` 或设置 `release_profile=full` 的 Full Release Validation 会将 `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` 和 `published_upgrade_survivor_scenarios=reported-issues` 设为相应值，从而扩展到最近四个稳定版 npm release、固定的插件兼容性边界 release，以及针对 Feishu 配置、保留的 bootstrap/persona 文件、已配置的 Openclaw 插件安装、波浪号日志路径和过时的旧版插件依赖根目录等问题设计的 fixture。多 baseline 的 published-upgrade survivor 选择会按 baseline 分片，分发到单独的目标 Docker runner 作业中。当问题是穷举已发布更新清理，而不是普通 Full Release CI 覆盖范围时，独立的 `Update Migration` 工作流会使用 `update-migration` Docker lane，并采用 `all-since-2026.4.23` baselines 及 `plugin-deps-cleanup` scenarios。本地聚合运行可以通过 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` 传入精确的 package specs，使用类似 `openclaw@2026.4.15` 的 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 保持单一 lane，或设置 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` 运行 scenario 矩阵。该 published lane 使用内置的 `openclaw config set` 命令配方配置 baseline，将配方步骤记录在 `summary.json` 中，并在 Gateway 启动后探测 `/healthz`、`/readyz` 以及 RPC 状态。Windows packaged 和 installer fresh lanes 还会验证已安装的 package 能够从原始的 Windows 绝对路径导入 browser-control override。OpenAI 跨 OS agent-turn smoke 在设置 `OPENCLAW_CROSS_OS_OPENAI_MODEL` 时默认使用其值，否则使用 `openai/gpt-5.6-luna`，因此安装和 gateway proof 使用成本更低的 GPT-5.6 测试层级。

### 旧版兼容窗口

Package Acceptance 对已发布包提供有边界的旧版兼容窗口。对于 `2026.4.25` 及之前的包，包括 `2026.4.25-beta.*`，可以使用兼容路径：

- `dist/postinstall-inventory.json` 中已知的私有 QA 条目可以指向 tarball 中未包含的文件；
- 当包未暴露该标志时，`doctor-switch` 可以跳过 `gateway install --wrapper` 持久化子用例；
- `update-channel-switch` 可以从 tarball 派生的 fake git fixture 中清理缺失的 pnpm `patchedDependencies`，并且可以记录缺失的持久化 `update.channel`；
- plugin smokes 可以读取旧版 install-record 位置，或接受缺失的 marketplace install-record 持久化；
- `plugin-update` 可以允许配置元数据迁移，同时仍要求 install record 和 no-reinstall 行为保持不变。

已发布的 `2026.4.26` package 还可能会针对已经随包发布的本地构建元数据 stamp 文件发出警告。当前 package validators 要求新 tarball 中不得包含两种 npm lockfile 格式。

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

## 安装烟测

`Install Smoke` 工作流不再在拉取请求或向 `main` 推送时运行。其夜间／手动封装器以及发布验证都会调用只读的 `install-smoke-reusable.yml` 核心工作流，并且每次运行都会在 GitHub 托管的 runner 上执行完整的安装烟测路径：

- 根 Dockerfile 烟测镜像会针对每个目标 SHA 只构建一次，并绑定到工作流修订版和生成者尝试，作为不可变制品保存；随后由 CLI 烟测、代理删除共享工作区的 CLI 烟测、容器网关网络 E2E，以及带有 `matrix` 插件的捆绑 `build-arg` 烟测加载。插件烟测会验证运行时依赖安装镜像行为，并确认插件加载时没有 entry-escape 诊断信息。
- QR 包安装以及安装器／更新 Docker 烟测（包括 Rocky Linux 安装器通道和针对可配置 `update_baseline_version` npm 基线的更新通道）会作为独立作业运行，因此安装器相关工作不会排在根镜像烟测后面等待。

较慢的 Bun 全局安装 image-provider 烟测会由 `run_bun_global_install_smoke` 单独控制。它会在夜间计划任务中运行，默认在来自发布检查的工作流调用中开启，手动触发 `Install Smoke` 时也可以选择启用它。常规 PR CI 仍会针对与 Node 相关的变更运行快速的 Bun 启动器回归通道。QR 和安装器 Docker 测试则继续使用各自专门面向安装的 Dockerfile。

## 本地 Docker 端到端测试

`pnpm test:docker:all` 会预构建一个共享的 live-test 镜像，打包一次 OpenClaw 作为 npm tarball，并构建两个共享的 `scripts/e2e/Dockerfile` 镜像：

- 一个裸的 Node/Git 运行器，用于 installer/update/plugin-dependency 这些 lane；
- 一个功能性镜像，将同一个 tarball 安装到 `/app` 中，用于普通功能 lane。

Docker lane 定义位于 `scripts/lib/docker-e2e-scenarios.mts`，规划器逻辑位于 `scripts/lib/docker-e2e-plan.mts`，而运行器只执行选定的计划。调度器通过 `OPENCLAW_DOCKER_E2E_BARE_IMAGE` 和 `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE` 为每个 lane 选择镜像，然后使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行各个 lane。

### 可调参数

| 变量                                   | 默认值 | 用途                                                                                       |
| -------------------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10      | 主池中普通 lane 的并发槽位数。                                                        |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10      | 对 provider 敏感的尾池槽位数。                                                      |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9       | 并发 live lane 上限，避免 provider 限流。                                        |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 5        | 并发 npm install lane 上限。                                                              |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7        | 并发多服务 lane 上限。                                                            |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000    | 为避免 Docker daemon 创建风暴，lane 启动之间的错峰间隔；设为 `0` 可取消错峰。     |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000 | 每个 lane 的兜底超时时间（120 分钟）；被选中的 live/tail lane 使用更严格的上限。           |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | 未设置   | `1` 会打印调度计划而不运行 lane。                                          |
| `OPENCLAW_DOCKER_ALL_LANES`            | 未设置   | 逗号分隔的精确 lane 列表；会跳过 cleanup smoke，方便 agent 复现某个失败 lane。 |

权重超过其有效上限的 lane 仍然可以从空池中启动，然后会单独运行直到释放容量。本地聚合流程会预检 Docker、移除过时的 OpenClaw E2E 容器、输出活跃 lane 状态、持久化 lane 耗时以支持最长优先排序，并且默认在首次失败后停止调度新的池化 lane。

### 可复用的 live/E2E 工作流

可复用的 live/E2E 工作流会询问 `scripts/test-docker-all.mjs --plan-json` 需要哪个 package、image kind、live image、lane 和凭据覆盖。然后 `scripts/docker-e2e.mjs` 会把该计划转换为 GitHub outputs 和 summaries。它要么通过 `scripts/package-openclaw-for-docker.mjs` 打包 OpenClaw，要么下载当前运行的 package artifact，或者从 `package_artifact_run_id` 下载 package artifact，然后验证 tarball 清单。默认的 `no-push-artifact` 路径会通过 Blacksmith 的 Docker layer cache 构建带有 package-digest 标签的 bare/functional 镜像，将精确的镜像字节打包进不可变的 workflow artifact，并让每个消费者验证并加载该 artifact。`existing-only` 则要求显式提供 `docker_e2e_bare_image`/`docker_e2e_functional_image` 的 GHCR 引用，并且从不构建或推送。这些 registry 拉取使用有上限的 180 秒单次尝试超时，因此卡住的流会快速重试，而不是占用大部分 CI 关键路径。在成功完成调度验证后，`openclaw-scheduled-live-checks.yml` 会将不可变的已测试镜像清单传递给独立的 package-write 发布器；只读的 release 和 prerelease 调用方永远不会进入该写入流程。

### Release-path 分块

Release Docker 覆盖使用更小的分块作业，并设置 `OPENCLAW_SKIP_DOCKER_BUILD=1`，这样每个分块只验证并加载它所需的 artifact-backed 镜像种类（或者在显式 `existing-only` 复用下拉取它），并通过同一个加权调度器执行多个 lane：

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-anthropic | package-update-core | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h | openwebui`

当前的 release Docker 分块是 `core`、`package-update-openai`、`package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、`plugins-runtime-services`、`plugins-runtime-install-a` 到 `plugins-runtime-install-h`，以及 `openwebui`。`package-update-openai` 包含 live Codex plugin 包 lane，它会安装候选 OpenClaw 包，从 `codex_plugin_spec` 安装 Codex plugin 或使用带有显式 Codex CLI 安装批准的同 ref tarball，运行 Codex CLI 预检和同会话 agent 回合，然后运行一次零重试的 medium-thinking 回合，发送进度、读取随机化的工作区输入、写入其精确的 artifact，并发送完成信号。`plugins-runtime-core`、`plugins-runtime` 和 `plugins-integrations` 仍然是聚合的 plugin/runtime 别名。`install-e2e` lane 别名仍然是两个 provider installer lane 的聚合手动重跑别名。

OpenWebUI 会作为独立的 `openwebui` 分块在专用的大磁盘 Blacksmith runner 上运行，只要稳定版或完整 release-path 覆盖请求它，就会这样运行，即使可复用 workflow 将受支持的作业路由到 GitHub 托管的 runner。将外部镜像拉取分开处理，可以防止大镜像与 `plugins-runtime-services` 中共享的 package 和 plugin 镜像竞争；传统的聚合 plugin/runtime 分块在兼容的手动重跑中仍然包含 OpenWebUI。捆绑通道的更新 lane 会在遇到瞬态 npm 网络故障时重试一次。

每个分块都会上传 `.artifacts/docker-tests/`，其中包含 lane 日志、耗时、`summary.json`、`failures.json`、阶段耗时、调度器计划 JSON、慢 lane 表，以及每个 lane 的重跑命令。工作流的 `docker_lanes` 输入会针对为该次运行准备好的镜像执行所选 lane，而不是运行分块作业，这样失败 lane 的调试就被限制在一个定向的 Docker 作业中；如果所选 lane 是 live Docker lane，那么定向作业会为那次重跑在本地构建 live-test 镜像。重跑辅助工具会验证失败 artifact 的精确 selected target SHA，而手动触发会重新打包该 ref，因为内部可复用 workflow 的 package tuple 不属于 `workflow_dispatch` schema。生成的命令只有在这些输入是 GHCR-backed 时才会包含已准备好的镜像输入和 `shared_image_policy=existing-only`；runner 本地的 artifact tags 会被省略，这样新 runner 会重新构建它们。显式的 target override 会丢弃恢复出的 GHCR 镜像引用，除非 artifact 证明它们与 override 匹配。由 artifact 生成的 workflow-definition refs 也会被省略，因为 full-release 临时分支会被删除；dispatch 会使用仓库默认分支，除非操作员显式覆盖它。

```bash
pnpm test:docker:rerun <run-id>      # 下载 Docker 工件并打印合并的/按 lane 定向的重跑命令
pnpm test:docker:timings <summary>   # 慢 lane 和阶段关键路径摘要
```

计划中的 live/E2E 工作流会每天运行完整的 release-path Docker 套件，并在成功后为精确的已测试镜像工件调用显式发布器。

## 插件预发布

`Plugin Prerelease` 是一个成本更高的产品/包覆盖，因此它是由 `Full Release Validation` 派发的独立工作流，或者由明确的操作员手动触发。普通的拉取请求、`main` 分支推送，以及独立的手动 CI 派发都会关闭该测试套件。它会在八个扩展 worker 之间平衡打包的插件测试；这些扩展分片任务一次最多运行两组插件配置，每组使用一个 Vitest worker，并配备更大的 Node 堆内存，以避免导入较重的插件批次生成额外的 CI 任务。仅在发布时启用的 Docker 预发布路径（通过 `full_release_validation` 输入启用）会将目标 Docker 任务按四个一组批处理，以避免为一到三分钟的任务占用数十个 runner。该工作流还会从 `@openclaw/plugin-inspector` 上传一个信息性的 `plugin-inspector-advisory` artifact；inspector 的发现结果仅作为分流输入，不会改变阻塞性的 Plugin Prerelease 门禁。

## QA 实验室

QA 实验室在主智能作用域工作流之外拥有专用的 CI 流水线。智能体一致性检查被嵌套在更广泛的 QA 和发布测试框架中，而不是独立的 PR 工作流。若需要让一致性检查随更广泛的验证运行一起执行，请使用 `Full Release Validation` 并设置 `rerun_group=qa-parity`。

- `QA-Lab - All Lanes` 工作流每晚在 `main` 上运行，也支持手动触发；它会分发运行模拟一致性检查，以及实时的 Matrix、Telegram、Discord、WhatsApp 和 Slack 作业。实时作业使用 `qa-live-shared` 环境；Telegram、Discord、WhatsApp 和 Slack 使用 Convex 租约，而 Matrix 会配置一次性本地凭据。
- 发布版 Matrix 目录验证会在配备 16 个 vCPU 的 Blacksmith runner 上串行运行，作业预算为 90 分钟。对该超时时间、runner 规格或并发设置的更改，都需要匹配的工作流防护措施和精确候选版本的发布证明。

计划、手动和发布版的 Matrix 检查使用确定性的模拟 provider，因此实时传输契约与模型延迟和常规 provider 插件启动相互隔离。Telegram 发布版检查使用相同的确定性模型边界。实时传输网关会禁用 memory search，因为 QA 一致性检查会单独覆盖 memory 行为；provider 连通性则由单独的实时模型、原生 provider 和 Docker provider 套件覆盖。

`OpenClaw Release Checks` 还会在发布批准前运行发布关键的 QA 实验室流水线；其 QA 一致性检查门禁会将候选包和基线包作为并行流水线作业运行，然后将两个构件下载到一个小型报告作业中，以进行最终的一致性比较。

对于普通 PR，请遵循作用域化的 CI/检查证据，而不要把一致性检查当作必需状态。

## CodeQL

`CodeQL` 工作流有意被设计为一个范围狭窄的首轮安全扫描器，而不是对整个仓库进行全面扫描。每日运行、手动运行、推送到 `main` 以及非草稿拉取请求保护运行会扫描 Actions 工作流代码，以及最高风险的 JavaScript/TypeScript 表面，并使用筛选到高/严重 `security-severity` 的高置信度安全查询。

拉取请求保护保持轻量：它只会在 `.github/actions`、`.github/codeql`、`.github/workflows`、`packages`、`scripts`、`src`，或负责流程的捆绑插件运行时路径发生变更时启动，并且会运行与定时工作流相同的高置信度安全矩阵。Android 和 macOS CodeQL 不包含在拉取请求默认项中。

### 安全类别

| 类别                                              | 表面                                                                                                                               |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | 身份验证、机密、沙箱、定时任务和网关基线                                                                                           |
| `/codeql-security-high/channel-runtime-boundary`  | 核心 channel 实现契约，以及 channel 插件运行时、网关、Plugin SDK、机密、审计触点                                                      |
| `/codeql-security-high/network-ssrf-boundary`     | 核心 SSRF、IP 解析、网络保护、web-fetch，以及 Plugin SDK SSRF 策略表面                                                               |
| `/codeql-security-high/mcp-process-tool-boundary` | MCP 服务器、进程执行辅助工具、外发投递，以及 agent 工具执行闸门                                                                     |
| `/codeql-security-high/process-exec-boundary`     | 本地 shell、进程生成辅助工具、拥有子进程的捆绑插件运行时，以及工作流脚本胶水                                                         |
| `/codeql-security-high/plugin-trust-boundary`     | 插件安装、加载器、manifest、registry、包管理器安装、源代码加载，以及 Plugin SDK 包契约信任表面                                      |

### 平台特定的安全分片

- `CodeQL Android Critical Security` — 定时 Android 安全分片。它在工作流可接受的最小 Blacksmith Linux runner 上手动构建 Android 应用以供 CodeQL 使用。产物上传到 `/codeql-critical-security/android`。
- `CodeQL macOS Critical Security` — 每周/手动 macOS 安全分片。它在 Blacksmith macOS 上手动构建 macOS 应用供 CodeQL 使用，从上传的 SARIF 中过滤掉依赖构建结果，并上传到 `/codeql-critical-security/macos`。之所以不放在每日默认项中，是因为即使在干净状态下，macOS 构建也会主导运行时间。

### 关键质量类别

`CodeQL Critical Quality` 是对应的非安全分片。它仅在 GitHub 托管的 Linux runner 上，对范围狭窄但高价值的表面运行错误严重度、非安全的 JavaScript/TypeScript 质量查询，因此质量扫描不会消耗 Blacksmith runner 注册预算。它的拉取请求保护故意比定时配置更小：非草稿拉取请求只会对其涉及的表面运行匹配的分片，来自十三个可由拉取请求路由的分片——`agent-runtime-boundary`、`channel-runtime-boundary`、`config-boundary`、`core-auth-secrets`、`gateway-runtime-boundary`、`mcp-process-runtime-boundary`、`memory-runtime-boundary`、`network-runtime-boundary`、`plugin-boundary`、`plugin-sdk-package-contract`、`plugin-sdk-reply-runtime`、`provider-runtime-boundary` 和 `session-diagnostics-boundary`。`ui-control-plane` 和 `web-media-runtime-boundary` 不包含在拉取请求运行中。CodeQL 配置和质量工作流的变更会运行完整的拉取请求分片集合（网络运行时分片依据其自己的 CodeQL 配置文件和网络归属的源路径来触发）。

手动派发接受：

```text
profile=all|agent-runtime-boundary|config-boundary|core-auth-secrets|channel-runtime-boundary|gateway-runtime-boundary|memory-runtime-boundary|mcp-process-runtime-boundary|network-runtime-boundary|plugin-boundary|plugin-sdk-package-contract|plugin-sdk-reply-runtime|provider-runtime-boundary|session-diagnostics-boundary
```

这些范围狭窄的配置用于单独运行一个质量分片，是教学和迭代钩子。

| 类别                                                | 表面                                                                                                                                                           |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-critical-quality/core-auth-secrets`        | 身份验证、机密、沙箱、定时任务和网关安全边界代码                                                                                                                    |
| `/codeql-critical-quality/config-boundary`          | 配置 schema、迁移、规范化和 IO 契约                                                                                                                               |
| `/codeql-critical-quality/gateway-runtime-boundary` | 网关协议 schema 和服务器方法契约                                                                                                                                  |
| `/codeql-critical-quality/channel-runtime-boundary` | 核心 channel 和捆绑 channel 插件实现契约                                                                                                                           |
| `/codeql-critical-quality/agent-runtime-boundary`   | 命令执行、模型/provider 调度、自动回复调度与队列，以及 ACP control-plane 运行时契约                                                                               |
| `/codeql-critical-quality/mcp-process-runtime-boundary` | MCP 服务器和工具桥接、进程监督辅助工具，以及外发投递契约                                                                                                           |
| `/codeql-critical-quality/memory-runtime-boundary`  | Memory host SDK、memory runtime 外观、memory Plugin SDK 别名、memory runtime 激活胶水，以及 memory doctor 命令                                                    |
| `/codeql-critical-quality/network-runtime-boundary` | 网络策略包、原始 socket 和代理捕获运行时、SSH 隧道、网关锁、JSONL socket，以及推送传输表面                                                                      |
| `/codeql-critical-quality/session-diagnostics-boundary` | 回复队列内部、session 投递队列、外发 session 绑定/投递辅助工具、诊断事件/日志捆绑表面，以及 session doctor CLI 契约                                               |
| `/codeql-critical-quality/plugin-sdk-reply-runtime` | Plugin SDK 入站回复调度、reply payload/chunking/runtime 辅助工具、channel reply 选项、投递队列，以及 session/thread 绑定辅助工具                             |
| `/codeql-critical-quality/provider-runtime-boundary` | 模型目录规范化、provider 身份验证和发现、provider runtime 注册、provider 默认值/catalogs，以及 web/search/fetch/embedding registry               |
| `/codeql-critical-quality/ui-control-plane`         | Control UI 启动、本地持久化、网关控制流，以及任务 control-plane 运行时契约                                                                                       |
| `/codeql-critical-quality/web-media-runtime-boundary` | 核心 web fetch/search、媒体 IO、媒体理解、图像生成，以及媒体生成运行时契约                                                                                      |
| `/codeql-critical-quality/plugin-boundary`          | 加载器、registry、公共表面，以及 Plugin SDK 入口点契约                                                                                                             |
| `/codeql-critical-quality/plugin-sdk-package-contract` | 已发布包侧的 Plugin SDK 源代码以及 plugin package contract 辅助工具                                                                                                |

质量与安全分离，这样质量发现可以被调度、度量、禁用或扩展，而不会掩盖安全信号。Swift、Python 和捆绑插件的 CodeQL 扩展应仅在范围狭窄的配置具备稳定运行时间和稳定信号之后，作为有范围或分片化的后续工作再加回来。

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

### 配置基线计数棘轮

`pnpm config:docs:check` 会拒绝未记录在案的配置面增长，以及损坏或过时的计数快照。当经过审查的产品变更有意添加了 schema 路径时，请运行 `pnpm config:docs:gen`，检查 core/channel/plugin 的计数差异和生成的 SHA-256 文件，并将包含 schema、help、labels、migration 和 tests 的有意基线提升一并提交。不要通过手工编辑 counts 文件来绕过 ratchet。

配置作者还必须为 Settings 中的新叶子节点分配层级。在叶子节点上添加 `advanced: false` 或
`advanced: true`，或者将该 key 放在其某个祖先节点之下，并让所有后代继承该祖先的层级。
未分类的根节点会因复制粘贴占位符而导致 schema quality
测试失败；没有祖先路径默认视为 advanced。
经过整理的 common-leaf 快照会让有意的层级变更在
review 中清晰可见。

本地变更 lane 逻辑位于 `scripts/changed-lanes.mjs`，并由 `scripts/check-changed.mjs` 执行。该本地检查门对架构边界的限制比宽泛的 CI 平台范围更严格：

- 核心生产变更运行核心生产和核心测试类型检查，以及核心 lint/guards；
- 仅核心测试变更只运行核心测试类型检查，以及核心 lint；
- 扩展生产变更运行扩展生产和扩展测试类型检查，以及扩展 lint；
- 仅扩展测试变更只运行扩展测试类型检查，以及扩展 lint；
- 捆绑的 channel manifest、包元数据、配置 schema、UI 提示和生成器所有者还会运行捆绑 channel 配置元数据漂移检查；
- 公共 Plugin SDK 或 plugin-contract 变更会扩展到扩展类型检查，因为扩展依赖这些核心契约（Vitest 扩展全面扫描仍作为显式测试工作执行）；
- 仅发布元数据的版本提升会运行定向版本、配置和根依赖检查；
- 未知的根目录或配置变更会安全地回退到所有检查 lane。

本地变更测试路由位于 `scripts/test-projects.test-support.mts`，其设计上比 `check:changed` 更节省资源：直接测试编辑会运行对应测试本身，源代码编辑则优先使用显式映射，然后运行同级测试和导入图中的依赖项。共享群组房间的消息发送配置属于显式映射之一：对群组可见回复配置、源代码回复发送模式或消息工具系统提示路由的变更，会通过核心回复测试以及 Discord 和 Slack 发送回归测试，以确保共享默认值的变更在首次推送 PR 之前就能失败。只有当变更影响整个测试工具链，使廉价的映射集合不再是可靠的代理时，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。

## Testbox 验证

Crabbox 是由仓库维护的远程盒封装器，用于维护者的 Linux 证明。对于受信任源，当现有依赖安装已就绪时，代理会话只在本地保留少量聚焦测试和低成本静态检查。它们使用 Crabbox 运行更大的套件和计算密集型工作，包括构建、类型检查、lint 扇出、Docker、包流程、E2E、实时证明和 CI 对等验证。受信任的维护者重型证明默认使用 `blacksmith-testbox`，而 `.crabbox.yaml` 现在也默认使用它。其配置的工作流会注入提供商和代理凭据，因此不受信任的贡献者或 fork 代码必须使用无密钥 fork CI，或经过清理的直接 AWS Crabbox。检查工作流会以深度为 1 的检出注入其固定的调度提交；变更门禁随后会重建准确的合并基线和同步后的最终树。经过清理的 AWS 运行会设置 `CRABBOX_ENV_ALLOW=CI`、传递 `--no-hydrate`，并使用全新的临时远程 `HOME`；这会阻止仓库的 `OPENCLAW_*` 允许列表和现有身份验证配置文件传递给不受信任的代码。它们会使用专门分配给该不受信任源的新预热 lease，绝不使用受信任或之前已注入凭据的 lease。从干净、受信任的 `main` 检出中启动已安装的受信任 Crabbox 二进制文件，并使用 `--fresh-pr` 只获取远程 PR；绝不要在本地执行不受信任检出的封装器或配置。取消设置 `CRABBOX_AWS_INSTANCE_PROFILE`，并且除非解析后的 `aws.instanceProfile` 为空，否则快速失败。在任何安装／测试之前，使用受信任的绝对路径工具要求 IMDSv2 令牌，证明 IAM 凭据端点返回 404，并将远程 `git rev-parse HEAD` 与完整的已审查 PR head SHA 进行比较。将 lease 绑定到该 SHA，并在 head 发生变化时停止／重新预热。上传来自干净 `main` 的受信任 `scripts/crabbox-untrusted-bootstrap.sh`，并配合 `--fresh-pr`；它会安装固定版本的 Node／pnpm，验证 SHA 和包管理器固定版本，隔离 `HOME`，安装依赖，然后执行请求的测试。取消设置所有 `CRABBOX_TAILSCALE*` 覆盖项，强制使用 `--network public
--tailscale=false`，清除出口节点／LAN 标志，并要求 `crabbox inspect` 在上传任何脚本之前报告公共网络且不存在 Tailscale 状态。自有 AWS／Hetzner 容量仍然是 Blacksmith 宕机、配额问题或明确进行自有容量测试时的后备方案。

代理不会为预期工作提前预热。只有在
第一个重型命令准备就绪时才懒加载获取 Testbox，后续重型命令复用返回的 `tbx_...` id，
每次运行都同步当前检出，并在交接前停止它。

由 Crabbox 驱动的 Blacksmith 运行会对单次 Testbox 执行预热、领取、同步、运行、报告和清理。内置的同步健全性检查会在同步后的盒子上运行 `git status --short` 时，如果发现至少 200 个跟踪文件删除，就会快速失败，这可捕捉到诸如 `pnpm-lock.yaml` 之类的根文件消失。对于有意进行的大规模删除 PR，请为远程命令设置 `CRABBOX_ALLOW_MASS_DELETIONS=1`。

如果同步阶段停留超过五分钟且在 sync 之后没有输出，Crabbox 也会终止本地 Blacksmith CLI 调用。设置 `CRABBOX_BLACKSMITH_SYNC_TIMEOUT_MS=0` 可以禁用该保护，或者在本地差异异常巨大时使用更大的毫秒值。

首次运行前，请在仓库根目录检查该封装器：

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

仓库封装器会拒绝不再声明所选提供商的过期 Crabbox 二进制文件，而 Blacksmith 驱动的运行要求 Crabbox 0.22.0 或更新版本，以便封装器获得当前的 Testbox 同步、队列和清理行为。在 Codex 工作树或链接／稀疏检出中，避免使用本地的 `pnpm crabbox:run` 脚本，因为 pnpm 可能会在 Crabbox 启动前协调依赖；应改为直接调用 node 封装器：

```bash
node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox --timing-json --shell -- "pnpm test <path-or-filter>"
```

在使用兄弟检出时，在进行计时或证明工作前重建被忽略的本地二进制文件：

```bash
version="$(git -C ../crabbox describe --tags --always --dirty | sed 's/^v//')" \
  && go build -C ../crabbox -trimpath -ldflags "-s -w -X github.com/openclaw/crabbox/internal/cli.version=${version}" -o bin/crabbox ./cmd/crabbox
```

`.crabbox.yaml` 中的 `blacksmith:` 块已经固定了 org、workflow、job 和 ref 默认值，因此下面的显式标志是可选的。变更门禁：

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

读取最终的 JSON 摘要。有用的字段是 `provider`、`leaseId`、`syncDelegated`、`exitCode`、`commandMs` 和 `totalMs`。对于委托给 Blacksmith Testbox 的运行，Crabbox 封装器退出码和 JSON 摘要就是命令结果。关联的 GitHub Actions 运行负责注入凭据和 keepalive；当 Testbox 在 SSH 命令已经返回后被外部停止时，它可能会以 `cancelled` 结束。除非封装器 `exitCode` 非零或命令输出显示测试失败，否则应将其视为清理／状态工件。单次 Blacksmith 驱动的 Crabbox 运行应自动停止 Testbox；如果运行被中断或清理状态不清楚，请检查活动 box，并且只停止你创建的 box：

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

复用 lease，而不是陈旧源代码。不要省略 `--no-sync`，这样每次运行都会上传当前检出；只有在你有意重新运行一个未变化、且已同步过的树时才使用它。不受信任的贡献者／fork 代码必须对每条命令使用 `CRABBOX_ENV_ALLOW=CI`、`--provider aws --no-hydrate`，以及一个全新的临时远程 `HOME`；在测试之前，要在该已清理的命令内部安装依赖。只复用专门分配给同一不受信任来源的新加热 lease；绝不复用受信任或之前已注入凭据的 lease。永远不要在本地执行不受信任检出的封装器或配置：从干净、受信任的 `main` 启动已安装的受信任 Crabbox 二进制文件，并在每次运行时传递 `--fresh-pr`。保持 `CRABBOX_AWS_INSTANCE_PROFILE` 未设置，拒绝非空的已解析实例配置文件，要求受信任的远程 IMDS 无角色证明，并在安装／测试前验证已审查的 head SHA。将 lease 绑定到该 SHA；在任何 head 变更后停止并重新加热。如果没有远程 PR，则使用无密钥的 fork CI。不要为不受信任的源选择 `hydrate-github` 或凭据注入的 Blacksmith 工作流。

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

在 AWS 压力下，除非任务真的需要 48xlarge 级 CPU，否则避免使用 `class=beast`。`beast` 请求从 192 vCPU 开始，是触发区域 EC2 Spot 或 On-Demand Standard 配额最容易的方式。仓库自有的 `.crabbox.yaml` 默认使用 `class: standard`、按需市场和 `capacity.hints: true`，因此经纪 AWS lease 会打印所选区域／市场、配额压力、Spot 回退以及高压级别警告。更重但范围更广的检查使用 `fast`，只有在 standard／fast 不够时才用 `large`，而 `beast` 仅用于异常的 CPU 密集型流水线，例如完整套件或所有插件的 Docker 矩阵、显式发布／阻断项验证，或高核性能剖析。不要将 `beast` 用于 `pnpm check:changed`、聚焦测试、仅文档工作、普通 lint／typecheck、小型 E2E 复现，或 Blacksmith 故障排查。使用 `--market on-demand` 进行容量诊断，这样 Spot 市场的波动不会混入信号。

`.crabbox.yaml` 负责 provider、同步以及 GitHub Actions 注入凭据的默认值。Crabbox 同步从不传输 `.git`，因此已注入凭据的 Actions 检出会保留自己的远程 Git 元数据，而不会同步维护者本地的 remotes 和对象存储；仓库配置还会额外排除本地运行／构建产物（例如 `.artifacts` 和测试报告），这些内容绝不应被传输。`.github/workflows/crabbox-hydrate.yml` 负责检出、Node／pnpm 设置、`origin/main` 获取，以及用于自有云 `crabbox run --id <cbx_id>` 命令的无密钥环境交接。

## 相关内容

- [安装概览](/install)
- [开发通道](/install/development-channels)
