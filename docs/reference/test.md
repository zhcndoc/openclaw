---
summary: "如何在本地运行测试（vitest）以及何时使用 force/coverage 模式"
read_when:
  - 运行或修复测试时
title: "测试"
---

- 完整测试工具包（套件、实时、Docker）：[Testing](/help/testing)
- 更新和插件包验证：[Testing updates and plugins](/help/testing-updates-plugins)

- `pnpm test:force`：终止任何占用默认控制端口的残留 gateway 进程，然后使用隔离的 gateway 端口运行完整的 Vitest 套件，这样服务器测试就不会与正在运行的实例冲突。当之前的 gateway 运行遗留了被占用的 18789 端口时使用此命令。
- `pnpm test:coverage`：使用 V8 覆盖率运行单元测试套件（通过 `vitest.unit.config.ts`）。这不是全仓库全文件覆盖率，而是基于已加载文件的单元覆盖率门禁。阈值为 70% 的 lines/functions/statements 和 55% 的 branches。由于 `coverage.all` 为 false，门禁衡量的是单元覆盖率套件加载到的文件，而不是把每个分支路径上的源文件都视为未覆盖。
- `pnpm test:coverage:changed`：仅对自 `origin/main` 以来发生变更的文件运行单元覆盖率。
- `pnpm test:changed`：轻量智能变更测试运行。它会根据直接的测试编辑、同级 `*.test.ts` 文件、显式的源码映射以及本地导入图运行精确目标。除非能够映射到精确测试，否则会跳过大范围/配置/包级更改。
- `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`：显式的大范围变更测试运行。当测试 harness/config/package 的编辑应回退到 Vitest 更广泛的变更测试行为时使用。
- `pnpm changed:lanes`：显示相对于 `origin/main` 的 diff 所触发的架构 lane。
- `pnpm check:changed`：运行相对于 `origin/main` 的 diff 的智能变更检查门禁。它会对受影响的架构 lane 运行 typecheck、lint 和 guard 命令，但不会运行 Vitest 测试。测试证明请使用 `pnpm test:changed` 或显式的 `pnpm test <target>`。
- `pnpm test`：将显式文件/目录目标路由到范围化的 Vitest lanes。未指定目标的运行会使用固定分片组，并展开为本地并行执行的叶子配置；扩展组总是展开为每个扩展的分片配置，而不是一个巨大的 root-project 进程。
- 测试包装器运行结束时会输出简短的 `[test] passed|failed|skipped ... in ...` 摘要。Vitest 自身的 duration 行保持为每个分片的详细信息。
- 共享的 OpenClaw 测试状态：当测试需要隔离的 `HOME`、`OPENCLAW_STATE_DIR`、`OPENCLAW_CONFIG_PATH`、配置 fixture、workspace、agent 目录或 auth-profile 存储时，从 Vitest 中使用 `src/test-utils/openclaw-test-state.ts`。
- 进程级 E2E 辅助工具：当 Vitest 进程级 E2E 测试需要一个正在运行的 Gateway、CLI 环境、日志捕获和清理时，使用 `test/helpers/openclaw-test-instance.ts` 将这些内容集中处理。
- Docker/Bash E2E 辅助工具：源自 `scripts/lib/docker-e2e-image.sh` 的 lanes 可以将 `docker_e2e_test_state_shell_b64 <label> <scenario>` 传入容器，并使用 `scripts/lib/openclaw-e2e-instance.sh` 解码；多 home 脚本可以传入 `docker_e2e_test_state_function_b64`，并在每个流程中调用 `openclaw_test_state_create <label> <scenario>`。更底层的调用者可以使用 `scripts/lib/openclaw-test-state.mjs shell --label <name> --scenario <name>` 获取容器内 shell 片段，或使用 `node scripts/lib/openclaw-test-state.mjs -- create --label <name> --scenario <name> --env-file <path> --json` 获取可被 source 的主机环境文件。`create` 前面的 `--` 可防止较新的 Node 运行时将 `--env-file` 视为 Node 标志。启动 Gateway 的 Docker/Bash lanes 可以在容器内 source `scripts/lib/openclaw-e2e-instance.sh`，用于入口点解析、mock OpenAI 启动、Gateway 前台/后台启动、就绪探测、状态环境导出、日志转储和进程清理。
- 完整、扩展和 include-pattern 分片运行会将本地耗时数据更新到 `.artifacts/vitest-shard-timings.json`；后续的整配置运行会使用这些耗时来平衡慢/快分片。include-pattern CI 分片会将分片名附加到 timing key 上，这样筛选后的分片耗时仍可见，而不会替换整配置的 timing 数据。设置 `OPENCLAW_TEST_PROJECTS_TIMINGS=0` 可忽略本地 timing 产物。
- 选定的 `plugin-sdk` 和 `commands` 测试文件现在会通过专用的轻量 lanes 路由，这些 lanes 只保留 `test/setup.ts`，将运行时较重的用例留在它们原有的 lanes 中。
- 同级带测试的源文件会先映射到该同级测试，再回退到更宽的目录 glob。`src/channels/plugins/contracts/test-helpers`、`src/plugin-sdk/test-helpers` 和 `src/plugins/contracts` 下的 helper 编辑会使用本地导入图来运行导入它们的测试，而不是在依赖路径精确时把所有分片都广泛运行。
- `auto-reply` 现在也拆分为三个专用配置（`core`、`top-level`、`reply`），这样 reply harness 就不会压过较轻的顶层 status/token/helper 测试。
- 基础 Vitest 配置现在默认 `pool: "threads"` 和 `isolate: false`，并且在整个仓库配置中启用了共享的非隔离 runner。
- `pnpm test:channels` 运行 `vitest.channels.config.ts`。
- `pnpm test:extensions` 和 `pnpm test extensions` 运行所有扩展/plugin 分片。重型 channel plugins、浏览器插件和 OpenAI 作为专用分片运行；其他 plugin 组保持批处理。使用 `pnpm test extensions/<id>` 运行单个打包的插件 lane。
- `pnpm test:perf:imports`：启用 Vitest 导入耗时 + 导入拆分报告，同时仍然对显式文件/目录目标使用范围化 lane 路由。
- `pnpm test:perf:imports:changed`：同样进行导入性能分析，但只针对自 `origin/main` 以来变更的文件。
- `pnpm test:perf:changed:bench -- --ref <git-ref>`：将路由后的 changed-mode 路径与同一已提交 git diff 的原生 root-project 运行进行对比基准测试。
- `pnpm test:perf:changed:bench -- --worktree`：在不先提交的情况下，对当前工作区变更集进行基准测试。
- `pnpm test:perf:profile:main`：为 Vitest 主线程写入 CPU profile（`.artifacts/vitest-main-profile`）。
- `pnpm test:perf:profile:runner`：为单元 runner 写入 CPU + heap profile（`.artifacts/vitest-runner-profile`）。
- `pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json`：串行运行每个 full-suite Vitest 叶子配置，并写出分组耗时数据以及每个配置的 JSON/log 产物。Test Performance Agent 会在尝试修复慢测试之前将其作为基线。
- `pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json`：比较性能导向更改后的分组报告。
- Gateway 集成：可通过 `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway` 选择启用。
- `pnpm test:e2e`：运行 gateway 端到端 smoke 测试（多实例 WS/HTTP/node 配对）。在 `vitest.e2e.config.ts` 中默认使用 `threads` + `isolate: false` 和自适应 worker；可通过 `OPENCLAW_E2E_WORKERS=<n>` 调整，并设置 `OPENCLAW_E2E_VERBOSE=1` 输出详细日志。
- `pnpm test:live`：运行 provider live 测试（minimax/zai）。需要 API keys 和 `LIVE=1`（或 provider 特定的 `*_LIVE_TEST=1`）才能取消跳过。
- `pnpm test:docker:all`：构建共享的 live-test 镜像，先将 OpenClaw 打包为一个 npm tarball，构建/复用一个裸的 Node/Git runner 镜像以及一个会将该 tarball 安装到 `/app` 的功能镜像，然后通过加权调度器在 `OPENCLAW_SKIP_DOCKER_BUILD=1` 下运行 Docker smoke lanes。裸镜像（`OPENCLAW_DOCKER_E2E_BARE_IMAGE`）用于安装/更新/plugin-dependency lanes；这些 lanes 挂载预构建 tarball，而不是使用复制的仓库源码。功能镜像（`OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`）用于正常的已构建应用功能 lanes。`scripts/package-openclaw-for-docker.mjs` 是唯一的本地/CI 打包器，并会在 Docker 消费之前验证 tarball 以及 `dist/postinstall-inventory.json`。Docker lane 定义位于 `scripts/lib/docker-e2e-scenarios.mjs`；调度器逻辑位于 `scripts/lib/docker-e2e-plan.mjs`；`scripts/test-docker-all.mjs` 执行所选计划。`node scripts/test-docker-all.mjs --plan-json` 会输出由调度器管理的 CI 计划，包括所选 lanes、镜像类型、包/live-image 需求、状态场景和凭据检查，而无需构建或运行 Docker。`OPENCLAW_DOCKER_ALL_PARALLELISM=<n>` 控制进程槽位，默认值为 10；`OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM=<n>` 控制对 provider 敏感的尾部池，默认值为 10。重型 lane 上限默认分别为 `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；provider 上限默认通过 `OPENCLAW_DOCKER_ALL_LIVE_CLAUDE_LIMIT=4`、`OPENCLAW_DOCKER_ALL_LIVE_CODEX_LIMIT=4` 和 `OPENCLAW_DOCKER_ALL_LIVE_GEMINI_LIMIT=4` 为每个 provider 提供一个重型 lane。更大的主机可使用 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。如果某个 lane 在低并行主机上的有效权重或资源上限内超限，它仍然可以从空池启动，并且会单独运行，直到释放容量。默认情况下 lane 启动会相隔 2 秒，以避免本地 Docker daemon 创建风暴；可通过 `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=<ms>` 覆盖。运行器默认会预检 Docker、清理过期的 OpenClaw E2E 容器、每 30 秒输出一次活动 lane 状态、在兼容 lane 之间共享 provider CLI 工具缓存、默认对瞬时 live-provider 失败重试一次（`OPENCLAW_DOCKER_ALL_LIVE_RETRIES=<n>`），并将 lane 耗时存储在 `.artifacts/docker-tests/lane-timings.json` 中，以便后续运行按最长优先排序。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 可在不运行 Docker 的情况下打印 lane 清单，使用 `OPENCLAW_DOCKER_ALL_STATUS_INTERVAL_MS=<ms>` 可调整状态输出，或使用 `OPENCLAW_DOCKER_ALL_TIMINGS=0` 禁用耗时复用。使用 `OPENCLAW_DOCKER_ALL_LIVE_MODE=skip` 仅运行确定性/本地 lanes，或使用 `OPENCLAW_DOCKER_ALL_LIVE_MODE=only` 仅运行 live-provider lanes；包别名为 `pnpm test:docker:local:all` 和 `pnpm test:docker:live:all`。仅 live 模式会将主 live lanes 和尾部 live lanes 合并为一个最长优先池，以便 provider 分桶能把 Claude、Codex 和 Gemini 的工作一起打包。运行器在第一次失败后会停止调度新的 pooled lanes，除非设置了 `OPENCLAW_DOCKER_ALL_FAIL_FAST=0`，并且每个 lane 都有一个 120 分钟的回退超时，可通过 `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS` 覆盖；选定的 live/tail lanes 使用更严格的每 lane 上限。CLI backend Docker 设置命令通过 `OPENCLAW_LIVE_CLI_BACKEND_SETUP_TIMEOUT_SECONDS` 具有自己的超时时间（默认 180）。每个 lane 的日志、`summary.json`、`failures.json` 和阶段耗时会写入 `.artifacts/docker-tests/<run-id>/`；使用 `pnpm test:docker:timings <summary.json>` 查看慢 lane，使用 `pnpm test:docker:rerun <run-id|summary.json|failures.json>` 输出廉价的定向重跑命令。
- `pnpm test:docker:browser-cdp-snapshot`：构建一个基于 Chromium 的 source E2E 容器，启动原始 CDP 和一个隔离的 Gateway，运行 `browser doctor --deep`，并验证 CDP role snapshot 包含链接 URL、光标提升的可点击项、iframe 引用以及 frame 元数据。
- CLI backend live Docker 探测可以作为聚焦 lanes 运行，例如 `pnpm test:docker:live-cli-backend:codex`、`pnpm test:docker:live-cli-backend:codex:resume` 或 `pnpm test:docker:live-cli-backend:codex:mcp`。Claude 和 Gemini 也有对应的 `:resume` 和 `:mcp` 别名。
- `pnpm test:docker:openwebui`：启动 Docker 化的 OpenClaw + Open WebUI，通过 Open WebUI 登录，检查 `/api/models`，然后通过 `/api/chat/completions` 运行一次真实的代理聊天。需要一个可用的 live model key（例如 `~/.profile` 中的 OpenAI），会拉取外部的 Open WebUI 镜像，并且不指望像正常的 unit/e2e 套件那样保持 CI 稳定。
- `pnpm test:docker:mcp-channels`：启动一个已 seed 的 Gateway 容器和第二个客户端容器，后者会启动 `openclaw mcp serve`，然后验证路由后的对话发现、transcript 读取、attachment 元数据、live event queue 行为、出站发送路由，以及通过真实 stdio bridge 的 Claude 风格 channel + permission 通知。Claude 通知断言会直接读取原始 stdio MCP 帧，这样 smoke 测试就能反映 bridge 实际发出的内容。
- `pnpm test:docker:upgrade-survivor`：在一个带脏旧用户 fixture 上安装打包后的 OpenClaw tarball，运行 package 更新以及非交互式 doctor（不使用 live provider 或 channel keys），然后启动一个 loopback Gateway 并检查 agent、channel 配置、plugin allowlists、workspace/session 文件、过时的旧版 plugin dependency 状态、启动以及 RPC 状态是否能够保留。
- `pnpm test:docker:published-upgrade-survivor`：默认安装 `openclaw@latest`，使用 baked 的 `openclaw config set` 命令 recipe 预置真实的现有用户文件且不使用 live provider 或 channel keys，用该基线将已发布安装更新为打包后的 OpenClaw tarball，运行非交互式 doctor，写入 `.artifacts/upgrade-survivor/summary.json`，然后启动一个 loopback Gateway 并检查已配置的 intents、workspace/session 文件、过时的 plugin 配置和旧版依赖状态、启动、`/healthz`、`/readyz` 和 RPC 状态是否能够保留或被干净修复。可使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 覆盖单个基线，使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` 扩展精确矩阵，例如 `all-since-2026.4.23`，或使用 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=reported-issues` 添加场景 fixture；`reported-issues` 集合包含 `configured-plugin-installs`，用于验证配置好的外部 OpenClaw plugins 会在升级期间自动安装。Package Acceptance 将这些暴露为 `published_upgrade_survivor_baseline`、`published_upgrade_survivor_baselines` 和 `published_upgrade_survivor_scenarios`。
- `pnpm test:docker:update-migration`：在清理密集的 `plugin-deps-cleanup` 场景中运行 published-upgrade survivor harness，默认从 `openclaw@2026.4.23` 开始。单独的 `Update Migration` 工作流会使用 `baselines=all-since-2026.4.23` 扩展该 lane，以便从 `.23` 开始的每个稳定已发布包都能更新到候选版本，并证明在 Full Release CI 之外能够正确清理已配置的 plugin 依赖。
- `pnpm test:docker:plugins`：运行本地路径、`file:`、带有 hoisted 依赖的 npm registry 包、git moving refs、ClawHub fixtures、marketplace 更新，以及 Claude-bundle 启用/检查的安装/更新 smoke。

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

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- 可选环境变量：`MINIMAX_API_KEY`、`MINIMAX_BASE_URL`、`MINIMAX_MODEL`、`ANTHROPIC_API_KEY`
- 默认提示词：“只回复一个词：ok。不要标点或额外文本。”

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

- [Testing](/help/testing)
- [Testing live](/help/testing-live)
- [Testing updates and plugins](/help/testing-updates-plugins)
