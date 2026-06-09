---
summary: "如何在本地运行测试（vitest）以及何时使用 force/coverage 模式"
read_when:
  - 运行或修复测试时
title: "测试"
---

- 完整测试工具包（套件、实时、Docker）：[Testing](/help/testing)
- 更新和插件包验证：[Testing updates and plugins](/help/testing-updates-plugins)

- 常规本地测试顺序：
  1. `pnpm test:changed` 用于变更范围内的 Vitest 验证。
  2. `pnpm test <path-or-filter>` 用于单个文件、目录或显式目标。
  3. 仅当你有意需要完整的本地 Vitest 套件时才运行 `pnpm test`。
- `pnpm test:force`：先杀掉占用默认控制端口的任何残留 gateway 进程，然后使用隔离的 gateway 端口运行完整 Vitest 套件，这样服务器测试就不会与正在运行的实例冲突。当之前的 gateway 运行让端口 18789 仍被占用时使用它。
- `pnpm test:coverage`：通过 V8 覆盖率运行单元测试套件（经由 `vitest.unit.config.ts`）。这是默认单元通道的覆盖率门禁，不是整个仓库的全文件覆盖率。阈值为 lines/functions/statements 70%，branches 55%。由于 `coverage.all` 为 false，且默认通道的覆盖范围包含了非快速单元测试及其兄弟源文件，因此该门禁衡量的是该通道所拥有的源代码，而不是它恰好加载到的每一个传递性导入。
- `pnpm test:coverage:changed`：仅对自 `origin/main` 以来发生变化的文件运行单元覆盖率。
- `pnpm test:changed`：便宜的智能变更测试运行。它会根据直接测试编辑、兄弟 `*.test.ts` 文件、显式源映射以及本地导入图来运行精确目标。广泛/配置/包级变更会被跳过，除非它们映射到精确测试。
- `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`：显式的广泛变更测试运行。当测试 harness/配置/包编辑应回退到 Vitest 更宽泛的变更测试行为时使用它。
- `pnpm changed:lanes`：显示相对于 `origin/main` 的 diff 触发了哪些架构通道。
- `pnpm check:changed`：在 CI 外部默认委派给 Crabbox/Testbox，然后在远程子进程内对相对于 `origin/main` 的 diff 运行智能变更检查门禁。它会对受影响的架构通道运行类型检查、lint 和 guard 命令，但不会运行 Vitest 测试。要获得测试证明，请使用 `pnpm test:changed` 或显式的 `pnpm test <target>`。
- Codex 工作树和链接/稀疏检出：除非你已验证 pnpm 不会重新协调依赖，否则避免直接本地运行 `pnpm test*`、`pnpm check*` 和 `pnpm crabbox:run`。对于小而明确的文件级验证，使用 `node scripts/run-vitest.mjs <path-or-filter>`；对于变更门禁或更广泛的验证，使用 `node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox ... -- env OPENCLAW_CHECK_CHANGED_REMOTE_CHILD=1 OPENCLAW_CHANGED_LANES_RAW_SYNC=1 corepack pnpm check:changed`，这样 pnpm 会在 Testbox 中运行。
- `OPENCLAW_HEAVY_CHECK_LOCK_SCOPE=worktree <local-heavy-check command>`：将重型检查的串行化限制在当前工作树内，而不是 Git common dir 中，适用于诸如 `pnpm check:changed` 和有针对性的 `pnpm test ...` 等命令。仅当你在高性能本地主机上有意跨链接工作树运行独立检查时使用。
- `pnpm test`：将显式文件/目录目标路由到作用域化的 Vitest 通道。无目标运行则为完整套件验证：它们使用固定分片组，扩展为本地并行执行的叶子配置，并在启动前打印预期的本地分片展开。扩展组始终扩展为按扩展名划分的分片配置，而不是单个巨大的根项目进程。
- 测试包装器运行结束时会带有简短的 `[test] passed|failed|skipped ... in ...` 汇总。Vitest 自己的耗时行仍然是每个分片的详细信息。
- 共享 OpenClaw 测试状态：当测试需要隔离的 `HOME`、`OPENCLAW_STATE_DIR`、`OPENCLAW_CONFIG_PATH`、配置夹具、工作区、agent 目录或 auth-profile 存储时，在 Vitest 中使用 `src/test-utils/openclaw-test-state.ts`。
- `pnpm test:env-mutations:report`：对直接修改 `HOME`、`OPENCLAW_STATE_DIR`、`OPENCLAW_CONFIG_PATH`、`OPENCLAW_WORKSPACE_DIR` 或相关 OpenClaw 环境键的测试和 harness 给出非阻塞报告。用它来查找迁移到共享 test-state helper 的候选项。
- 控制 UI 模拟 E2E：对启动 Vite Control UI 并在模拟 Gateway WebSocket 上驱动真实 Chromium 页面 的 Vitest + Playwright 通道，使用 `pnpm test:ui:e2e`。测试位于 `ui/src/**/*.e2e.test.ts`；共享 mock 和控制位于 `ui/src/test-helpers/control-ui-e2e.ts`。`pnpm test:e2e` 包含该通道。在 Codex 工作树中，依赖安装完成后，针对小的定向验证优先使用 `node scripts/run-vitest.mjs run --config test/vitest/vitest.ui-e2e.config.ts --configLoader runner ui/src/ui/e2e/chat-flow.e2e.test.ts`，更广泛的 GUI 验证则使用 Testbox/Crabbox。
- 进程级 E2E helpers：当 Vitest 进程级 E2E 测试需要运行中的 Gateway、CLI 环境、日志捕获和清理时，使用 `test/helpers/openclaw-test-instance.ts`。
- TUI PTY 测试：对于快速的 fake-backend PTY 通道，使用 `node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts`。对于较慢的 `tui --local` 冒烟测试，使用 `OPENCLAW_TUI_PTY_INCLUDE_LOCAL=1` 或 `pnpm tui:pty:test:watch --mode local`，它只模拟外部模型端点。断言稳定的可见文本或 fixture 调用，而不是原始 ANSI 快照。
- Docker/Bash E2E helpers：来源于 `scripts/lib/docker-e2e-image.sh` 的通道可以将 `docker_e2e_test_state_shell_b64 <label> <scenario>` 传入容器，并用 `scripts/lib/openclaw-e2e-instance.sh` 解码；多 home 脚本可以传递 `docker_e2e_test_state_function_b64`，并在每个流程中调用 `openclaw_test_state_create <label> <scenario>`。更底层的调用者可以使用 `scripts/lib/openclaw-test-state.mjs shell --label <name> --scenario <name>` 获取容器内 shell 片段，或使用 `node scripts/lib/openclaw-test-state.mjs -- create --label <name> --scenario <name> --env-file <path> --json` 获取可 source 的主机环境文件。`create` 前的 `--` 可以防止较新的 Node 运行时把 `--env-file` 当成 Node 标志。启动 Gateway 的 Docker/Bash 通道可以在容器内 source `scripts/lib/openclaw-e2e-instance.sh`，用于入口点解析、模拟 OpenAI 启动、Gateway 前台/后台启动、就绪探测、状态环境导出、日志转储和进程清理。
- 完整、扩展和 include-pattern 分片运行会把本地耗时数据更新到 `.artifacts/vitest-shard-timings.json`；之后的整配置运行会利用这些耗时来平衡慢分片和快分片。CI 中的 include-pattern 分片会把分片名追加到耗时键中，这样过滤后的分片耗时也能可见，而不会替换整配置耗时数据。设置 `OPENCLAW_TEST_PROJECTS_TIMINGS=0` 可忽略本地耗时工件。
- 选定的 `plugin-sdk` 和 `commands` 测试文件现在会路由到专用的轻量通道，这些通道只保留 `test/setup.ts`，而将运行时较重的用例留在各自原有通道中。
- 具有兄弟测试的源文件会先映射到该兄弟测试，再退回到更宽的目录 glob。`src/channels/plugins/contracts/test-helpers`、`src/plugin-sdk/test-helpers` 和 `src/plugins/contracts` 下的 helper 编辑会使用本地导入图来运行导入这些 helper 的测试，而不是在依赖路径精确时广泛运行每个分片。
- `auto-reply` 现在也拆分为三个专用配置（`core`、`top-level`、`reply`），这样 reply harness 就不会压过更轻量的 top-level status/token/helper 测试。
- 基础 Vitest 配置现在默认使用 `pool: "threads"` 和 `isolate: false`，整个仓库配置都启用了共享的非隔离运行器。
- `pnpm test:channels` 运行 `vitest.channels.config.ts`。
- `pnpm test:extensions` 和 `pnpm test extensions` 运行所有扩展/插件分片。重型 channel 插件、浏览器插件和 OpenAI 作为专用分片运行；其他插件组保持批处理。使用 `pnpm test extensions/<id>` 可运行单个打包插件通道。
- `pnpm test:perf:imports`：启用 Vitest 导入耗时和导入分解报告，同时对显式文件/目录目标仍然使用作用域化的通道路由。
- `pnpm test:perf:imports:changed`：同样的导入分析，但仅针对自 `origin/main` 以来变化的文件。
- `pnpm test:perf:changed:bench -- --ref <git-ref>`：对同一已提交 git diff 上的路由变更模式与原生根项目运行进行基准比较。
- `pnpm test:perf:changed:bench -- --worktree`：在不先提交的情况下，对当前工作树变更集做基准比较。
- `pnpm test:perf:profile:main`：为 Vitest 主线程写入 CPU profile（`.artifacts/vitest-main-profile`）。
- `pnpm test:perf:profile:runner`：为单元 runner 写入 CPU + heap profile（`.artifacts/vitest-runner-profile`）。
- `pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json`：串行运行每个完整套件 Vitest 叶子配置，并写入分组耗时数据以及每个配置的 JSON/log 工件。Test Performance Agent 会把它作为尝试修复慢测试之前的基线。
- `pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json`：比较面向性能的变更后的分组报告。
- `pnpm test:docker:timings <summary.json>`：在 Docker 全量运行后检查较慢的 Docker 通道；使用 `pnpm test:docker:rerun <run-id|summary.json|failures.json>` 可从同一工件中打印廉价的定向重跑命令。
- Gateway 集成：通过 `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway` 启用。
- `pnpm test:e2e`：运行仓库 E2E 聚合，包括 gateway 端到端冒烟测试以及 Control UI 模拟浏览器 E2E 通道。
- `pnpm test:e2e:gateway`：运行 gateway 端到端冒烟测试（多实例 WS/HTTP/node 配对）。在 `vitest.e2e.config.ts` 中默认使用 `threads` + `isolate: false` 并采用自适应 worker；可通过 `OPENCLAW_E2E_WORKERS=<n>` 调整，并通过 `OPENCLAW_E2E_VERBOSE=1` 获取详细日志。
- `pnpm test:live`：运行 provider live 测试（minimax/zai）。需要 API key 和 `LIVE=1`（或 provider 特定的 `*_LIVE_TEST=1`）才能取消跳过。
- `pnpm test:docker:all`：构建共享的 live-test 镜像，打包 OpenClaw 一次为 npm tarball，构建/复用一个裸 Node/Git runner 镜像以及一个将该 tarball 安装到 `/app` 的功能镜像，然后通过加权调度器运行 Docker 冒烟通道。裸镜像（`OPENCLAW_DOCKER_E2E_BARE_IMAGE`）用于安装/更新/插件依赖通道；这些通道挂载预构建的 tarball，而不是使用复制的仓库源代码。功能镜像（`OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`）用于正常的已构建应用功能通道。`scripts/package-openclaw-for-docker.mjs` 是唯一的本地/CI 打包器，并会在 Docker 消费之前验证 tarball 和 `dist/postinstall-inventory.json`。Docker 通道定义位于 `scripts/lib/docker-e2e-scenarios.mjs`；planner 逻辑位于 `scripts/lib/docker-e2e-plan.mjs`；`scripts/test-docker-all.mjs` 执行所选计划。`node scripts/test-docker-all.mjs --plan-json` 会在不构建或运行 Docker 的情况下，输出调度器管理的 CI 计划，其中包含所选通道、镜像类型、包/live-image 需求、状态场景和凭据检查。`OPENCLAW_DOCKER_ALL_PARALLELISM=<n>` 控制进程槽位，默认 10；`OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM=<n>` 控制对 provider 敏感的尾部池，默认 10。重型通道上限默认是 `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=5` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；provider 上限默认每个 provider 只允许一个重型通道，即 `OPENCLAW_DOCKER_ALL_LIVE_CLAUDE_LIMIT=4`、`OPENCLAW_DOCKER_ALL_LIVE_CODEX_LIMIT=4` 和 `OPENCLAW_DOCKER_ALL_LIVE_GEMINI_LIMIT=4`。更大的主机可使用 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。如果某个通道在低并行主机上超过有效权重或资源上限，它仍然可以从空池启动，并会独自运行直到释放容量。默认情况下，通道启动会错开 2 秒，以避免本地 Docker daemon 创建风暴；可通过 `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=<ms>` 覆盖。运行器默认会预检 Docker、清理旧的 OpenClaw E2E 容器、每 30 秒输出活动通道状态、在兼容通道之间共享 provider CLI 工具缓存、对临时性 live-provider 失败默认重试一次（`OPENCLAW_DOCKER_ALL_LIVE_RETRIES=<n>`），并将通道耗时存储在 `.artifacts/docker-tests/lane-timings.json` 中，以便后续运行按最长优先排序。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 可仅打印通道清单而不运行 Docker，使用 `OPENCLAW_DOCKER_ALL_STATUS_INTERVAL_MS=<ms>` 调整状态输出，或使用 `OPENCLAW_DOCKER_ALL_TIMINGS=0` 禁用耗时复用。`OPENCLAW_DOCKER_ALL_LIVE_MODE=skip` 用于仅确定性/本地通道，`OPENCLAW_DOCKER_ALL_LIVE_MODE=only` 用于仅 live-provider 通道；包别名是 `pnpm test:docker:local:all` 和 `pnpm test:docker:live:all`。仅 live 模式会把主池和尾部 live 通道合并为一个最长优先池，这样 provider 分桶就可以把 Claude、Codex 和 Gemini 的工作一起打包。运行器会在首次失败后停止调度新的池化通道，除非设置 `OPENCLAW_DOCKER_ALL_FAIL_FAST=0`；每个通道都有 120 分钟的回退超时，可由 `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS` 覆盖；选定的 live/tail 通道使用更紧的每通道上限。CLI backend Docker setup 命令有自己的超时，由 `OPENCLAW_LIVE_CLI_BACKEND_SETUP_TIMEOUT_SECONDS` 控制（默认 180）。每通道日志、`summary.json`、`failures.json` 和阶段耗时写入 `.artifacts/docker-tests/<run-id>/`；使用 `pnpm test:docker:timings <summary.json>` 检查较慢通道，使用 `pnpm test:docker:rerun <run-id|summary.json|failures.json>` 打印廉价的定向重跑命令。
- `pnpm test:docker:browser-cdp-snapshot`：构建一个基于 Chromium 的源 E2E 容器，启动原始 CDP 和隔离的 Gateway，运行 `browser doctor --deep`，并验证 CDP 角色快照包含链接 URL、游标提升的可点击项、iframe 引用以及 frame 元数据。
- `pnpm test:docker:skill-install`：在裸 Docker runner 中安装打包好的 OpenClaw tarball，禁用 `skills.install.allowUploadedArchives`，从 live ClawHub 搜索中解析一个当前的 skill slug，通过 `openclaw skills install` 安装它，并验证 `SKILL.md`、`.clawhub/origin.json`、`.clawhub/lock.json` 以及 `skills info --json`。
- CLI backend live Docker probes 可以作为聚焦通道运行，例如 `pnpm test:docker:live-cli-backend:claude`、`pnpm test:docker:live-cli-backend:claude:resume` 或 `pnpm test:docker:live-cli-backend:claude:mcp`。Gemini 也有对应的 `:resume` 和 `:mcp` 别名。
- `pnpm test:docker:openwebui`：启动 Docker 化的 OpenClaw + Open WebUI，通过 Open WebUI 登录，检查 `/api/models`，然后通过 `/api/chat/completions` 运行一次真实的代理聊天。它需要可用的 live 模型密钥，会拉取外部 Open WebUI 镜像，而且不预期像正常的单元/E2E 套件那样适合 CI 稳定运行。
- `pnpm test:docker:mcp-channels`：启动一个已种子化的 Gateway 容器和第二个客户端容器，后者会启动 `openclaw mcp serve`，然后验证路由后的会话发现、转录读取、附件元数据、实时事件队列行为、出站发送路由，以及通过真实 stdio bridge 进行的 Claude 风格 channel 和权限通知。Claude 通知断言会直接读取原始 stdio MCP 帧，因此该冒烟测试反映的是 bridge 实际发出的内容。
- `pnpm test:docker:upgrade-survivor`：在一个已污染的旧用户 fixture 上安装打包好的 OpenClaw tarball，运行 package update 和非交互 doctor，而不使用 live provider 或 channel key，然后启动 loopback Gateway 并检查 agents、channel config、plugin allowlists、workspace/session 文件、旧的 legacy plugin dependency 状态、启动和 RPC status 是否能保留。
- `pnpm test:docker:published-upgrade-survivor`：默认安装 `openclaw@latest`，用现有用户的真实文件进行种子初始化而不使用 live provider 或 channel key，用内置的 `openclaw config set` 命令配方配置该基线，然后将该已发布安装更新为打包好的 OpenClaw tarball，运行非交互 doctor，写入 `.artifacts/upgrade-survivor/summary.json`，再启动 loopback Gateway 并检查配置的 intents、workspace/session 文件、旧的 plugin config 和 legacy dependency 状态、启动、`/healthz`、`/readyz` 和 RPC status 是否能保留或被干净修复。可通过 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 覆盖一个基线，通过 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` 扩展精确的本地矩阵，例如 `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`，或通过 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=reported-issues` 添加场景 fixture；`reported-issues` 集合包括 `configured-plugin-installs`，用于验证升级时会自动安装已配置的外部 OpenClaw 插件，以及 `stale-source-plugin-shadow`，用于确保仅源码的插件 shadow 不会破坏启动。Package Acceptance 将这些暴露为 `published_upgrade_survivor_baseline`、`published_upgrade_survivor_baselines` 和 `published_upgrade_survivor_scenarios`，并在把精确包规格交给 Docker 通道之前解析诸如 `last-stable-4` 或 `all-since-2026.4.23` 之类的元基线标记。
- `pnpm test:docker:update-migration`：在清理较重的 `plugin-deps-cleanup` 场景中运行已发布升级 survivor harness，默认从 `openclaw@2026.4.23` 开始。独立的 `Update Migration` 工作流会将该通道扩展为 `baselines=all-since-2026.4.23`，从而让 `.23` 之后的每个稳定已发布包都更新到候选版本，并在 Full Release CI 之外证明已配置的插件依赖清理。
- `pnpm test:docker:plugins`：运行本地路径、`file:`、带有提升依赖的 npm registry 包、git moving refs、ClawHub fixture、marketplace 更新以及 Claude-bundle enable/inspect 的安装/更新冒烟测试。

## 本地 PR 门禁

对于本地 PR 合入/门禁检查，运行：

- `pnpm check:changed`
- `pnpm check`
- `pnpm check:test-types`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

如果 `pnpm test` 在负载较高的主机上偶发失败，在将其视为回归之前先重跑一次，然后用 `pnpm test <path/to/test>` 进行隔离。对于内存受限的主机，使用：

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## 模型延迟基准（本地密钥）

脚本：[`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

用法：

- `pnpm tsx scripts/bench-model.ts --runs 10`
- 可选环境变量：`MINIMAX_API_KEY`、`MINIMAX_BASE_URL`、`MINIMAX_MODEL`、`ANTHROPIC_API_KEY`
- 默认提示词："只回复一个词：ok。不要标点或额外文本。"

最近一次运行（2025-12-31，20 次运行）：

- minimax 中位数 1279ms（最小 1114，最大 2431）
- opus 中位数 2454ms（最小 1224，最大 3170）

## CLI 启动基准

脚本：[`scripts/bench-cli-startup.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-cli-startup.ts)

用法：

- `pnpm test:startup:bench`
- `pnpm test:startup:bench:smoke`
- `pnpm test:startup:bench:save`
- `pnpm test:startup:bench:update`
- `pnpm test:startup:bench:check`
- `pnpm tsx scripts/bench-cli-startup.ts`
- `pnpm tsx scripts/bench-cli-startup.ts --runs 12`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case status --case gatewayStatus --runs 3`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case tasksJson --case tasksListJson --case tasksAuditJson --runs 3`
- `pnpm tsx scripts/bench-cli-startup.ts --entry openclaw.mjs --entry-secondary dist/entry.js --preset all`
- `pnpm tsx scripts/bench-cli-startup.ts --preset all --output .artifacts/cli-startup-bench-all.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case gatewayStatusJson --output .artifacts/cli-startup-bench-smoke.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --cpu-prof-dir .artifacts/cli-cpu`
- `pnpm tsx scripts/bench-cli-startup.ts --json`

预设：

- `startup`：`--version`、`--help`、`health`、`health --json`、`status --json`、`status`
- `real`：`health`、`status`、`status --json`、`sessions`、`sessions --json`、`tasks --json`、`tasks list --json`、`tasks audit --json`、`agents list --json`、`gateway status`、`gateway status --json`、`gateway health --json`、`config get gateway.port`
- `all`：两个预设都包含

输出包括每个命令的 `sampleCount`、avg、p50、p95、min/max、退出码/信号分布，以及最大 RSS 汇总。可选的 `--cpu-prof-dir` / `--heap-prof-dir` 会按每次运行写入 V8 profile，因此计时与 profile 采集使用同一个驱动程序。

已保存输出约定：

- `pnpm test:startup:bench:smoke` 会将目标 smoke 产物写入 `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` 会使用 `runs=5` 和 `warmup=1` 将完整套件产物写入 `.artifacts/cli-startup-bench-all.json`
- `pnpm test:startup:bench:update` 会使用 `runs=5` 和 `warmup=1` 刷新已提交的基线 fixture：`test/fixtures/cli-startup-bench.json`

已提交的 fixture：

- `test/fixtures/cli-startup-bench.json`
- 使用 `pnpm test:startup:bench:update` 刷新
- 使用 `pnpm test:startup:bench:check` 将当前结果与 fixture 进行比较

## Gateway 启动基准

脚本：[`scripts/bench-gateway-startup.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-gateway-startup.ts)

该基准默认使用构建后的 CLI 入口 `dist/entry.js`；在使用 package-script 命令前请先运行 `pnpm build`。如果要测量源码运行器，请传入 `--entry scripts/run-node.mjs`，并将这些结果与构建入口的基线分开保存。

用法：

- `pnpm test:startup:gateway -- --runs 5 --warmup 1`
- `pnpm test:startup:gateway -- --case default --runs 10 --warmup 1`
- `pnpm test:startup:gateway -- --case skipChannels --case fiftyPlugins --runs 5`
- `node --import tsx scripts/bench-gateway-startup.ts --case default --runs 5 --output .artifacts/gateway-startup.json`
- `node --import tsx scripts/bench-gateway-startup.ts --case default --runs 3 --cpu-prof-dir .artifacts/gateway-startup-cpu`

案例 ID：

- `default`：正常的 Gateway 启动。
- `skipChannels`：跳过 channel 启动的 Gateway 启动。
- `oneInternalHook`：一个已配置的内部 hook。
- `allInternalHooks`：所有内部 hook。
- `fiftyPlugins`：50 个 manifest 插件。
- `fiftyStartupLazyPlugins`：50 个 startup-lazy manifest 插件。

输出包括首个进程输出、`/healthz`、`/readyz`、HTTP 监听日志时间、
Gateway 就绪日志时间、CPU 时间、CPU 核心占用比、最大 RSS、堆、启动跟踪
指标、事件循环延迟，以及插件查找表详细指标。脚本会在子 Gateway 环境中
启用 `OPENCLAW_GATEWAY_STARTUP_TRACE=1`。

将 `/healthz` 视为存活性：HTTP 服务器能够响应。将 `/readyz` 视为
可用就绪性：启动插件 sidecar、channels，以及 ready-critical 的
post-attach 工作都已稳定。Gateway 启动 hooks 会异步派发，
不属于就绪性保证的一部分。就绪日志时间是 Gateway 内部的 ready 日志时间戳；
它适合用于进程侧归因，但不能替代外部的 `/readyz` 探针。

在比较变更时，请使用 JSON 输出或 `--output`。只有在跟踪输出指向导入、编译，或仅靠阶段时间无法解释的 CPU 密集型工作时，才使用 `--cpu-prof-dir`。不要将源码运行器结果与构建后的 `dist/entry.js` 结果视为同一基线进行比较。

## Gateway 重启基准

脚本：[`scripts/bench-gateway-restart.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-gateway-restart.ts)

该重启基准仅支持 macOS 和 Linux。它使用 SIGUSR1 进行
进程内重启，并且在 Windows 上会立即失败。

该基准默认使用构建后的 CLI 入口 `dist/entry.js`；在使用 package-script 命令前请先运行 `pnpm build`。如果要测量源码运行器，请传入 `--entry scripts/run-node.mjs`，并将这些结果与构建入口的基线分开保存。

用法：

- `pnpm test:restart:gateway -- --case skipChannels --runs 1 --restarts 5`
- `pnpm test:restart:gateway -- --case default --runs 3 --restarts 3 --warmup 1`
- `pnpm test:restart:gateway -- --case skipChannelsAcpxProbe --case skipChannelsNoAcpxProbe --runs 1 --restarts 5`
- `node --import tsx scripts/bench-gateway-restart.ts --case fiftyPlugins --runs 1 --restarts 5 --output .artifacts/gateway-restart.json`
- `node --import tsx scripts/bench-gateway-restart.ts --json`

案例 ID：

- `skipChannels`：跳过 channels 的重启。
- `skipChannelsAcpxProbe`：跳过 channels 的重启，并开启 ACPX 启动探针。
- `skipChannelsNoAcpxProbe`：跳过 channels 的重启，并关闭 ACPX 启动探针。
- `default`：正常重启。
- `fiftyPlugins`：带 50 个 manifest 插件的重启。

输出包括下一次 `/healthz`、下一次 `/readyz`、停机时间、重启就绪时间、
CPU、RSS、替换进程的启动跟踪指标，以及关于信号处理、活动工作排空、关闭阶段、下一次启动、就绪时间和内存快照的重启跟踪指标。脚本会在
子 Gateway 环境中启用 `OPENCLAW_GATEWAY_STARTUP_TRACE=1` 和 `OPENCLAW_GATEWAY_RESTART_TRACE=1`。

当变更涉及重启信号、关闭处理器、重启后的启动、sidecar 关闭、服务交接，或重启后的就绪性时，请使用该基准。先用 `skipChannels` 来隔离 Gateway 机制与 channel 启动的影响。只有在窄范围案例解释清楚重启路径后，才使用 `default` 或插件更重的案例。

跟踪指标只是归因提示，不是最终裁决。判断一次重启变更时，应结合多个样本、匹配的 owner span、`/healthz` 和 `/readyz` 行为，以及用户可见的重启契约。

## 入门 E2E（Docker）

Docker 是可选的；这里只在需要容器化入门 smoke 测试时才需要。

在干净的 Linux 容器中完成完整的冷启动流程：

```bash
scripts/e2e/onboard-docker.sh
```

该脚本通过伪终端驱动交互式向导，验证 config/workspace/session 文件，然后启动网关并运行 `openclaw health`。

## QR 导入 smoke（Docker）

确保维护的 QR 运行时辅助工具在受支持的 Docker Node 运行时下加载正常（Node 24 默认，Node 22 兼容）：

```bash
pnpm test:docker:qr
```

## 相关内容

- [测试](/help/testing)
- [测试实战](/help/testing-live)
- [测试更新和插件](/help/testing-updates-plugins)
