---
summary: "如何在本地运行测试（vitest）以及何时使用 force/coverage 模式"
read_when:
  - 运行或修复测试时
title: "测试"
---

- 完整测试工具包（套件、实时、Docker）：[Testing](/help/testing)
- 更新和插件包验证：[Testing updates and plugins](/help/testing-updates-plugins)

- `pnpm test:force`：终止任何占用默认控制端口的残留 gateway 进程，然后使用隔离的 gateway 端口运行完整的 Vitest 套件，这样服务器测试就不会与正在运行的实例冲突。当之前的 gateway 运行遗留了占用 18789 端口的进程时使用此命令。
- `pnpm test:coverage`：使用 V8 覆盖率（通过 `vitest.unit.config.ts`）运行单元测试套件。这是默认单元测试通道的覆盖率门禁，不是整个仓库的全文件覆盖率。阈值为 70% 的 lines/functions/statements 和 55% 的 branches。由于 `coverage.all` 为 false，并且默认通道的覆盖范围仅包含带有同级源文件的非快速单元测试，因此该门禁衡量的是此通道所拥有的源代码，而不是它恰好加载到的所有传递依赖。
- `pnpm test:coverage:changed`：仅对自 `origin/main` 以来发生变更的文件运行单元覆盖率。
- `pnpm test:changed`：低成本的智能变更测试运行。它会针对直接的测试编辑、同级 `*.test.ts` 文件、显式源映射以及本地导入图运行精确目标。除非宽泛/配置/包级变更能映射到精确测试，否则会跳过。
- `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`：显式的宽泛变更测试运行。当测试脚手架/配置/包的修改应回退到 Vitest 更宽泛的变更测试行为时使用。
- `pnpm changed:lanes`：显示由相对于 `origin/main` 的差异触发的架构通道。
- `pnpm check:changed`：运行相对于 `origin/main` 的差异所对应的智能变更检查门禁。它会对受影响的架构通道运行 typecheck、lint 和 guard 命令，但不会运行 Vitest 测试。需要测试证明时请使用 `pnpm test:changed` 或显式的 `pnpm test <target>`。
- `pnpm test`：将显式文件/目录目标路由到受限作用域的 Vitest 通道。未指定目标的运行会使用固定分片组，并展开到叶子配置以便本地并行执行；扩展组总是展开为按扩展划分的分片配置，而不是单个巨大的根项目进程。
- 测试包装器运行结束时会输出简短的 `[test] passed|failed|skipped ... in ...` 汇总。Vitest 自己的持续时间行仍然保留为每个分片的详细信息。
- 共享 OpenClaw 测试状态：当测试需要隔离的 `HOME`、`OPENCLAW_STATE_DIR`、`OPENCLAW_CONFIG_PATH`、配置 fixture、workspace、agent 目录或 auth-profile 存储时，请在 Vitest 中使用 `src/test-utils/openclaw-test-state.ts`。
- 进程级 E2E 辅助：当 Vitest 进程级 E2E 测试需要一个正在运行的 Gateway、CLI 环境、日志捕获以及统一清理时，请使用 `test/helpers/openclaw-test-instance.ts`。
- Docker/Bash E2E 辅助：源自 `scripts/lib/docker-e2e-image.sh` 的通道可以将 `docker_e2e_test_state_shell_b64 <label> <scenario>` 传入容器，并通过 `scripts/lib/openclaw-e2e-instance.sh` 解码；多 home 脚本可以传入 `docker_e2e_test_state_function_b64` 并在每个流程中调用 `openclaw_test_state_create <label> <scenario>`。更底层的调用者可以使用 `scripts/lib/openclaw-test-state.mjs shell --label <name> --scenario <name>` 获取容器内 shell 片段，或使用 `node scripts/lib/openclaw-test-state.mjs -- create --label <name> --scenario <name> --env-file <path> --json` 生成可直接 source 的主机环境文件。`create` 前的 `--` 可防止较新的 Node 运行时将 `--env-file` 视为 Node 标志。启动 Gateway 的 Docker/Bash 通道可以在容器内 source `scripts/lib/openclaw-e2e-instance.sh`，用于入口点解析、mock OpenAI 启动、Gateway 前台/后台启动、就绪探测、状态环境导出、日志转储和进程清理。
- 完整、扩展和 include-pattern 分片运行会将本地计时数据更新到 `.artifacts/vitest-shard-timings.json`；后续的整配置运行会使用这些计时来平衡慢分片和快分片。include-pattern 的 CI 分片会在计时键中附加分片名称，这样过滤后的分片计时仍然可见，而不会替换整配置的计时数据。将 `OPENCLAW_TEST_PROJECTS_TIMINGS=0` 设为忽略本地计时工件。
- 选定的 `plugin-sdk` 和 `commands` 测试文件现在会路由到专用的轻量通道，这些通道只保留 `test/setup.ts`，从而将运行时较重的用例保留在它们原有的通道中。
- 具有同级测试的源文件会先映射到同级测试，再回退到更宽泛的目录 glob。`src/channels/plugins/contracts/test-helpers`、`src/plugin-sdk/test-helpers` 和 `src/plugins/contracts` 下的辅助文件编辑会使用本地导入图来运行导入它们的测试，而不是在依赖路径精确时宽泛运行所有分片。
- `auto-reply` 现在也拆分为三个专用配置（`core`、`top-level`、`reply`），因此 reply 脚手架不会在较轻的顶层状态/token/helper 测试中占用过多资源。
- 基础 Vitest 配置现在默认使用 `pool: "threads"` 和 `isolate: false`，并在整个仓库配置中启用共享的非隔离 runner。
- `pnpm test:channels` 运行 `vitest.channels.config.ts`。
- `pnpm test:extensions` 和 `pnpm test extensions` 运行所有扩展/plugin 分片。重型 channel plugins、browser plugin 和 OpenAI 作为专用分片运行；其他插件组保持批处理。使用 `pnpm test extensions/<id>` 运行单个打包的插件通道。
- `pnpm test:perf:imports`：启用 Vitest import-duration + import-breakdown 报告，同时对显式文件/目录目标仍使用受限通道路由。
- `pnpm test:perf:imports:changed`：相同的导入分析，但仅针对自 `origin/main` 以来发生变更的文件。
- `pnpm test:perf:changed:bench -- --ref <git-ref>`：将路由后的 changed-mode 路径与同一已提交 git diff 的原生根项目运行进行基准比较。
- `pnpm test:perf:changed:bench -- --worktree`：在不先提交的情况下，对当前工作区变更集进行基准比较。
- `pnpm test:perf:profile:main`：为 Vitest 主线程写入 CPU profile（`.artifacts/vitest-main-profile`）。
- `pnpm test:perf:profile:runner`：为单元 runner 写入 CPU + heap profiles（`.artifacts/vitest-runner-profile`）。
- `pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json`：串行运行每个 full-suite Vitest 叶子配置，并写出分组持续时间数据以及每个配置的 JSON/log 工件。Test Performance Agent 会在尝试修复慢测试之前将其用作基线。
- `pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json`：比较一次性能优化变更后的分组报告。
- Gateway 集成：通过 `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway` 启用。
- `pnpm test:e2e`：运行 gateway 端到端 smoke 测试（多实例 WS/HTTP/node 配对）。默认在 `vitest.e2e.config.ts` 中使用 `threads` + `isolate: false` 和自适应 worker；可用 `OPENCLAW_E2E_WORKERS=<n>` 调整，并设置 `OPENCLAW_E2E_VERBOSE=1` 以输出详细日志。
- `pnpm test:live`：运行 provider live 测试（minimax/zai）。需要 API key 和 `LIVE=1`（或 provider 特定的 `*_LIVE_TEST=1`）才会解除跳过。
- `pnpm test:docker:all`：构建共享的 live-test 镜像，将 OpenClaw 打包一次为 npm tarball，构建/复用一个裸 Node/Git runner 镜像以及一个功能镜像（将该 tarball 安装到 `/app`），然后通过加权调度器运行 Docker smoke 通道，并设置 `OPENCLAW_SKIP_DOCKER_BUILD=1`。裸镜像（`OPENCLAW_DOCKER_E2E_BARE_IMAGE`）用于安装/更新/plugin-dependency 通道；这些通道挂载预构建的 tarball，而不是使用复制的仓库源代码。功能镜像（`OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`）用于正常的已构建应用功能通道。`scripts/package-openclaw-for-docker.mjs` 是本地/CI 唯一的打包器，并在 Docker 使用 tarball 之前验证 tarball 及 `dist/postinstall-inventory.json`。Docker 通道定义位于 `scripts/lib/docker-e2e-scenarios.mjs`；调度器逻辑位于 `scripts/lib/docker-e2e-plan.mjs`；`scripts/test-docker-all.mjs` 执行所选计划。`node scripts/test-docker-all.mjs --plan-json` 会在不构建或运行 Docker 的情况下输出由调度器管理的 CI 计划，包括所选通道、镜像类型、包/live-image 需求、状态场景和凭据检查。`OPENCLAW_DOCKER_ALL_PARALLELISM=<n>` 控制进程槽位，默认值为 10；`OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM=<n>` 控制对 provider 敏感的尾部池，默认值为 10。重型通道上限默认分别为 `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；provider 上限默认通过 `OPENCLAW_DOCKER_ALL_LIVE_CLAUDE_LIMIT=4`、`OPENCLAW_DOCKER_ALL_LIVE_CODEX_LIMIT=4` 和 `OPENCLAW_DOCKER_ALL_LIVE_GEMINI_LIMIT=4` 为每个 provider 限制一个重型通道。对于更大的主机，请使用 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。如果某个通道在低并行度主机上超过了有效权重或资源上限，它仍然可以从空池启动，并会独占运行直到释放容量。默认情况下，通道启动之间会间隔 2 秒，以避免本地 Docker 守护进程创建风暴；可通过 `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=<ms>` 覆盖。运行器默认会预检 Docker、清理过期的 OpenClaw E2E 容器、每 30 秒输出一次活动通道状态、在兼容通道之间共享 provider CLI 工具缓存、默认重试一次临时的 live-provider 失败（`OPENCLAW_DOCKER_ALL_LIVE_RETRIES=<n>`），并将通道计时存储在 `.artifacts/docker-tests/lane-timings.json` 中，以便后续运行按最长优先排序。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 可在不运行 Docker 的情况下打印通道清单，使用 `OPENCLAW_DOCKER_ALL_STATUS_INTERVAL_MS=<ms>` 调整状态输出，或使用 `OPENCLAW_DOCKER_ALL_TIMINGS=0` 禁用计时复用。使用 `OPENCLAW_DOCKER_ALL_LIVE_MODE=skip` 仅运行确定性/本地通道，或使用 `OPENCLAW_DOCKER_ALL_LIVE_MODE=only` 仅运行 live-provider 通道；包别名为 `pnpm test:docker:local:all` 和 `pnpm test:docker:live:all`。仅 live 模式会将主池和尾部 live 通道合并为一个按最长优先的池，以便 provider 分桶能够一起容纳 Claude、Codex 和 Gemini 的工作。除非设置 `OPENCLAW_DOCKER_ALL_FAIL_FAST=0`，否则运行器在第一次失败后会停止调度新的池化通道；每个通道都有 120 分钟的兜底超时，可通过 `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS` 覆盖；选定的 live/tail 通道使用更严格的单通道上限。CLI backend Docker 设置命令有自己的超时，通过 `OPENCLAW_LIVE_CLI_BACKEND_SETUP_TIMEOUT_SECONDS` 控制（默认 180）。每个通道的日志、`summary.json`、`failures.json` 和阶段计时会写入 `.artifacts/docker-tests/<run-id>/`；使用 `pnpm test:docker:timings <summary.json>` 查看慢通道，使用 `pnpm test:docker:rerun <run-id|summary.json|failures.json>` 打印廉价的定向重跑命令。
- `pnpm test:docker:browser-cdp-snapshot`：构建一个基于 Chromium 的 source E2E 容器，启动原始 CDP 以及隔离的 Gateway，运行 `browser doctor --deep`，并验证 CDP role 快照是否包含链接 URL、游标提升的可点击元素、iframe 引用以及 frame 元数据。
- CLI backend live Docker 探针可以作为定向通道运行，例如 `pnpm test:docker:live-cli-backend:codex`、`pnpm test:docker:live-cli-backend:codex:resume` 或 `pnpm test:docker:live-cli-backend:codex:mcp`。Claude 和 Gemini 也有对应的 `:resume` 和 `:mcp` 别名。
- `pnpm test:docker:openwebui`：启动 Docker 化的 OpenClaw + Open WebUI，通过 Open WebUI 登录，检查 `/api/models`，然后通过 `/api/chat/completions` 运行一次真实的代理聊天。需要可用的 live model key（例如 `~/.profile` 中的 OpenAI），会拉取外部 Open WebUI 镜像，并且不像正常的单元/e2e 套件那样被期望在 CI 中稳定运行。
- `pnpm test:docker:mcp-channels`：启动一个已播种的 Gateway 容器和第二个客户端容器，后者会启动 `openclaw mcp serve`，然后验证路由后的对话发现、转录读取、附件元数据、live event 队列行为、出站发送路由，以及通过真实 stdio bridge 的 Claude 风格 channel + 权限通知。Claude 通知断言会直接读取原始 stdio MCP 帧，因此 smoke 反映的是 bridge 实际发出的内容。
- `pnpm test:docker:upgrade-survivor`：在一个脏旧用户 fixture 上安装打包后的 OpenClaw tarball，在没有 live provider 或 channel key 的情况下运行包更新和非交互式 doctor，然后启动 loopback Gateway 并检查 agents、channel 配置、插件 allowlists、workspace/session 文件、过期的 legacy plugin dependency 状态、启动以及 RPC 状态是否能够幸存。
- `pnpm test:docker:published-upgrade-survivor`：默认安装 `openclaw@latest`，使用预置的 `openclaw` 配置 `set` 命令 recipe 生成逼真的现有用户文件，在没有 live provider 或 channel key 的情况下用该基线更新已发布安装到打包后的 OpenClaw tarball，运行非交互式 doctor，写入 `.artifacts/upgrade-survivor/summary.json`，然后启动 loopback Gateway 并检查已配置的 intents、workspace/session 文件、过期的插件配置和 legacy dependency 状态、启动、`/healthz`、`/readyz` 以及 RPC 状态是否能够幸存或被干净修复。可通过 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 覆盖单个基线，通过 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` 扩展精确的本地矩阵，例如 `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`，或通过 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=reported-issues` 添加场景 fixture；`reported-issues` 集合包含 `configured-plugin-installs`，用于验证已配置的外部 OpenClaw 插件会在升级期间自动安装，以及 `stale-source-plugin-shadow`，用于防止仅源码插件 shadow 破坏启动。Package Acceptance 将这些项暴露为 `published_upgrade_survivor_baseline`、`published_upgrade_survivor_baselines` 和 `published_upgrade_survivor_scenarios`，并在将精确包规格交给 Docker 通道之前解析诸如 `last-stable-4` 或 `all-since-2026.4.23` 之类的 meta baseline token。
- `pnpm test:docker:update-migration`：在清理工作量较大的 `plugin-deps-cleanup` 场景中运行 published-upgrade survivor 脚手架，默认从 `openclaw@2026.4.23` 开始。单独的 `Update Migration` 工作流会将此通道扩展为 `baselines=all-since-2026.4.23`，因此从 `.23` 开始的每个稳定已发布包都会更新到候选版本，并证明在 Full Release CI 之外已配置的 plugin dependency 清理。
- `pnpm test:docker:plugins`：运行本地路径、`file:`、带有 hoisted 依赖的 npm registry 包、git moving refs、ClawHub fixtures、marketplace 更新以及 Claude-bundle 启用/检查的安装/更新 smoke。

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
- 默认提示词："Reply with a single word: ok. No punctuation or extra text."

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
