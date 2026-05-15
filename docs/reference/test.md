---
summary: "如何在本地运行测试（vitest）以及何时使用 force/coverage 模式"
read_when:
  - 运行或修复测试时
title: "测试"
---

- 完整测试工具包（套件、实时、Docker）：[Testing](/help/testing)
- 更新和插件包验证：[Testing updates and plugins](/help/testing-updates-plugins)

- `pnpm test:force`: 终止任何占用默认控制端口的残留 gateway 进程，然后使用隔离的 gateway 端口运行完整的 Vitest 套件，这样服务器测试就不会与正在运行的实例冲突。当之前的 gateway 运行遗留了被占用的 18789 端口时使用此命令。
- `pnpm test:coverage`: 运行带有 V8 覆盖率的单元测试套件（通过 `vitest.unit.config.ts`）。这是默认单元测试通道的覆盖率门槛，而不是整个仓库的全文件覆盖率。阈值为 70% 的 lines/functions/statements，以及 55% 的 branches。由于 `coverage.all` 为 false，且默认通道范围内的覆盖率仅包含带有同级源文件的非快速单元测试，因此该门槛衡量的是此通道所拥有的源代码，而不是它恰好加载到的每个传递性导入。
- `pnpm test:coverage:changed`: 仅对自 `origin/main` 以来发生变更的文件运行单元测试覆盖率。
- `pnpm test:changed`: 经济型智能变更测试运行。它会基于直接测试编辑、同级 `*.test.ts` 文件、显式源码映射以及本地导入图来运行精确目标。除非它们能映射到精确测试，否则会跳过大范围/配置/包变更。
- `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`: 显式的大范围变更测试运行。当测试 harness / 配置 / 包的编辑应该回退到 Vitest 更宽泛的变更测试行为时使用。
- `pnpm changed:lanes`: 显示由相对于 `origin/main` 的差异触发的架构通道。
- `pnpm check:changed`: 运行相对于 `origin/main` 的差异所对应的智能变更检查门禁。它会为受影响的架构通道运行类型检查、lint 和 guard 命令，但不会运行 Vitest 测试。需要测试证明时请使用 `pnpm test:changed` 或显式的 `pnpm test <target>`。
- Codex worktree 和 linked/sparse checkout：除非你已确认 pnpm 不会重新协调依赖，否则避免直接在本地运行 `pnpm test*`、`pnpm check*` 和 `pnpm crabbox:run`。对于小型、显式文件证明，使用 `node scripts/run-vitest.mjs <path-or-filter>`；对于变更门禁或大范围证明，使用 `node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox ... --shell -- "pnpm check:changed"`，让 pnpm 在 Testbox 中运行。
- `OPENCLAW_HEAVY_CHECK_LOCK_SCOPE=worktree <local-heavy-check command>`：将重型检查串行化限制在当前 worktree 内，而不是 Git 公共目录，适用于 `pnpm check:changed` 和定向 `pnpm test ...` 等命令。仅在高性能本地主机上、并且你有意在链接的 worktree 之间运行独立检查时使用。
- `pnpm test`: 将显式的文件/目录目标路由到有范围限制的 Vitest 通道。未指定目标的运行会使用固定的分片组，并扩展到叶子配置以进行本地并行执行；扩展组始终展开为按扩展分别划分的分片配置，而不是一个巨大的根项目进程。
- 测试包装器运行结束时会输出简短的 `[test] passed|failed|skipped ... in ...` 汇总。Vitest 自身的持续时间行仍然保留为每个分片的详细信息。
- 共享的 OpenClaw 测试状态：当测试需要隔离的 `HOME`、`OPENCLAW_STATE_DIR`、`OPENCLAW_CONFIG_PATH`、配置 fixture、workspace、agent 目录或 auth-profile 存储时，请在 Vitest 中使用 `src/test-utils/openclaw-test-state.ts`。
- 进程级 E2E 帮助器：当 Vitest 的进程级 E2E 测试需要一个正在运行的 Gateway、CLI 环境、日志捕获和清理时，请使用 `test/helpers/openclaw-test-instance.ts`。
- Docker/Bash E2E 帮助器：源自 `scripts/lib/docker-e2e-image.sh` 的通道可以将 `docker_e2e_test_state_shell_b64 <label> <scenario>` 传入容器，并使用 `scripts/lib/openclaw-e2e-instance.sh` 对其解码；多 home 脚本可以传递 `docker_e2e_test_state_function_b64`，并在每个流程中调用 `openclaw_test_state_create <label> <scenario>`。更底层的调用者可以使用 `scripts/lib/openclaw-test-state.mjs shell --label <name> --scenario <name>` 获取容器内 shell 片段，或者使用 `node scripts/lib/openclaw-test-state.mjs -- create --label <name> --scenario <name> --env-file <path> --json` 获取可 source 的主机环境文件。`create` 前的 `--` 可防止较新的 Node 运行时将 `--env-file` 视为 Node 标志。启动 Gateway 的 Docker/Bash 通道可以在容器内 source `scripts/lib/openclaw-e2e-instance.sh`，用于入口解析、模拟 OpenAI 启动、Gateway 前台/后台启动、就绪探针、状态环境导出、日志转储和进程清理。
- 完整、扩展和 include-pattern 分片运行会将本地计时数据更新到 `.artifacts/vitest-shard-timings.json`；之后的整配置运行会使用这些计时来平衡慢分片和快分片。include-pattern 的 CI 分片会把分片名称追加到计时键中，这样在不替换整配置计时数据的情况下，过滤后的分片计时仍然可见。设置 `OPENCLAW_TEST_PROJECTS_TIMINGS=0` 可忽略本地计时制品。
- 选定的 `plugin-sdk` 和 `commands` 测试文件现在会通过专用的轻量通道路由，这些通道只保留 `test/setup.ts`，将运行时较重的用例留在其原有通道中。
- 带有同级测试的源文件会先映射到该同级测试，再回退到更宽的目录 glob。位于 `src/channels/plugins/contracts/test-helpers`、`src/plugin-sdk/test-helpers` 和 `src/plugins/contracts` 下的 helper 编辑会使用本地导入图来运行导入它们的测试，而不是在依赖路径精确时粗暴地运行每个分片。
- `auto-reply` 现在也拆分为三个专用配置（`core`、`top-level`、`reply`），这样 reply harness 就不会在较轻量的 top-level 状态/token/helper 测试中占主导。
- 基础 Vitest 配置现在默认使用 `pool: "threads"` 和 `isolate: false`，并在整个仓库配置中启用共享的非隔离运行器。
- `pnpm test:channels` 运行 `vitest.channels.config.ts`。
- `pnpm test:extensions` 和 `pnpm test extensions` 运行所有 extension/plugin 分片。重型 channel 插件、浏览器插件和 OpenAI 作为专用分片运行；其他插件组保持批量执行。使用 `pnpm test extensions/<id>` 运行单个打包插件通道。
- `pnpm test:perf:imports`：启用 Vitest 导入耗时 + 导入分解报告，同时对显式文件/目录目标仍使用有范围限制的通道路由。
- `pnpm test:perf:imports:changed`：相同的导入分析，但仅针对自 `origin/main` 以来变更的文件。
- `pnpm test:perf:changed:bench -- --ref <git-ref>`：将路由后的变更模式路径与同一已提交 git diff 的原生根项目运行进行基准对比。
- `pnpm test:perf:changed:bench -- --worktree`：在不先提交的情况下，对当前 worktree 变更集进行基准对比。
- `pnpm test:perf:profile:main`：为 Vitest 主线程写入 CPU 画像（`.artifacts/vitest-main-profile`）。
- `pnpm test:perf:profile:runner`：为单元测试 runner 写入 CPU + heap 画像（`.artifacts/vitest-runner-profile`）。
- `pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json`：按顺序运行每个全套 Vitest 叶子配置，并写入分组持续时间数据以及每个配置的 JSON/日志制品。Test Performance Agent 会在尝试修复慢测试之前将其用作基线。
- `pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json`：比较性能优化变更后的分组报告。
- Gateway 集成：通过 `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway` 启用。
- `pnpm test:e2e`：运行 gateway 端到端冒烟测试（多实例 WS/HTTP/node 配对）。默认使用 `threads` + `isolate: false`，并在 `vitest.e2e.config.ts` 中采用自适应 worker；可通过 `OPENCLAW_E2E_WORKERS=<n>` 调整，并设置 `OPENCLAW_E2E_VERBOSE=1` 以输出详细日志。
- `pnpm test:live`：运行 provider live 测试（minimax/zai）。需要 API key 和 `LIVE=1`（或 provider 特定的 `*_LIVE_TEST=1`）才能取消跳过。
- `pnpm test:docker:all`：构建共享的 live-test 镜像，将 OpenClaw 打包一次为 npm tarball，构建/复用一个裸 Node/Git runner 镜像以及一个会将该 tarball 安装到 `/app` 的功能镜像，然后通过带权调度器在 `OPENCLAW_SKIP_DOCKER_BUILD=1` 下运行 Docker 冒烟通道。裸镜像（`OPENCLAW_DOCKER_E2E_BARE_IMAGE`）用于 installer/update/plugin-dependency 通道；这些通道会挂载预构建 tarball，而不是使用复制的仓库源码。功能镜像（`OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`）用于正常的已构建应用功能通道。`scripts/package-openclaw-for-docker.mjs` 是本地/CI 的单一打包器，并会在 Docker 消费之前验证 tarball 以及 `dist/postinstall-inventory.json`。Docker 通道定义位于 `scripts/lib/docker-e2e-scenarios.mjs`；规划器逻辑位于 `scripts/lib/docker-e2e-plan.mjs`；`scripts/test-docker-all.mjs` 执行所选计划。`node scripts/test-docker-all.mjs --plan-json` 会在不构建或运行 Docker 的情况下输出由调度器拥有的 CI 计划，包括所选通道、镜像类型、包/live-image 需求、状态场景和凭据检查。`OPENCLAW_DOCKER_ALL_PARALLELISM=<n>` 控制进程槽位，默认值为 10；`OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM=<n>` 控制对 provider 敏感的尾部池，默认值为 10。重型通道上限默认为 `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；provider 上限默认通过 `OPENCLAW_DOCKER_ALL_LIVE_CLAUDE_LIMIT=4`、`OPENCLAW_DOCKER_ALL_LIVE_CODEX_LIMIT=4` 和 `OPENCLAW_DOCKER_ALL_LIVE_GEMINI_LIMIT=4` 为每个 provider 提供一个重型通道。对于更大的主机，可使用 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。如果某个通道在低并行度主机上的有效权重或资源上限被超过，它仍然可以从空池启动，并会单独运行直到释放容量。默认情况下，通道启动会以 2 秒间隔错开，以避免本地 Docker 守护进程创建风暴；可通过 `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=<ms>` 覆盖。运行器默认会预检 Docker、清理过期的 OpenClaw E2E 容器、每 30 秒输出活动通道状态、在兼容通道之间共享 provider CLI 工具缓存、默认重试一次临时性的 live-provider 失败（`OPENCLAW_DOCKER_ALL_LIVE_RETRIES=<n>`），并将通道计时存储在 `.artifacts/docker-tests/lane-timings.json` 中，以便后续运行按最长优先排序。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 可在不运行 Docker 的情况下打印通道清单，使用 `OPENCLAW_DOCKER_ALL_STATUS_INTERVAL_MS=<ms>` 可调整状态输出，或使用 `OPENCLAW_DOCKER_ALL_TIMINGS=0` 关闭计时复用。使用 `OPENCLAW_DOCKER_ALL_LIVE_MODE=skip` 仅运行确定性/本地通道，或使用 `OPENCLAW_DOCKER_ALL_LIVE_MODE=only` 仅运行 live-provider 通道；包别名为 `pnpm test:docker:local:all` 和 `pnpm test:docker:live:all`。仅 live 模式会将主池和尾部 live 通道合并为一个最长优先池，以便 provider 分桶能够将 Claude、Codex 和 Gemini 的工作一起打包。除非设置 `OPENCLAW_DOCKER_ALL_FAIL_FAST=0`，否则运行器在第一次失败后会停止调度新的 pooled 通道；每个通道都有 120 分钟的兜底超时，可通过 `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS` 覆盖；选定的 live/tail 通道使用更严格的每通道上限。CLI backend Docker 设置命令有自己的超时，由 `OPENCLAW_LIVE_CLI_BACKEND_SETUP_TIMEOUT_SECONDS` 控制（默认 180）。每个通道的日志、`summary.json`、`failures.json` 和阶段计时会写入 `.artifacts/docker-tests/<run-id>/`；使用 `pnpm test:docker:timings <summary.json>` 查看慢通道，使用 `pnpm test:docker:rerun <run-id|summary.json|failures.json>` 打印廉价的定向重跑命令。
- `pnpm test:docker:browser-cdp-snapshot`：构建一个基于 Chromium 的源码 E2E 容器，启动原始 CDP 和一个隔离的 Gateway，运行 `browser doctor --deep`，并验证 CDP 角色快照包含链接 URL、光标促发的可点击项、iframe 引用以及 frame 元数据。
- `pnpm test:docker:skill-install`：在裸 Docker runner 中安装打包后的 OpenClaw tarball，禁用 `skills.install.allowUploadedArchives`，从实时 ClawHub 搜索中解析当前 skill slug，通过 `openclaw skills install` 安装它，并验证 `SKILL.md`、`.clawhub/origin.json`、`.clawhub/lock.json` 和 `skills info --json`。
- CLI backend live Docker 探测可以作为聚焦通道运行，例如 `pnpm test:docker:live-cli-backend:claude`、`pnpm test:docker:live-cli-backend:claude:resume` 或 `pnpm test:docker:live-cli-backend:claude:mcp`。Gemini 也有对应的 `:resume` 和 `:mcp` 别名。
- `pnpm test:docker:openwebui`：启动 Docker 化的 OpenClaw + Open WebUI，通过 Open WebUI 登录，检查 `/api/models`，然后通过 `/api/chat/completions` 运行一个真实的代理聊天。它需要可用的 live model key，会拉取外部 Open WebUI 镜像，并且不应被期望像正常的单元/e2e 套件那样在 CI 中稳定。
- `pnpm test:docker:mcp-channels`：启动一个已播种的 Gateway 容器和第二个客户端容器，后者会启动 `openclaw mcp serve`，然后验证路由后的会话发现、转录读取、附件元数据、实时事件队列行为、出站发送路由，以及通过真实 stdio 桥的 Claude 风格通道 + 权限通知。Claude 通知断言直接读取原始 stdio MCP 帧，因此该冒烟测试反映的是桥实际上发出的内容。
- `pnpm test:docker:upgrade-survivor`：在一个被污染的旧用户 fixture 上安装打包后的 OpenClaw tarball，在没有 live provider 或 channel key 的情况下运行包更新以及非交互式 doctor，然后启动一个 loopback Gateway，并检查 agents、channel 配置、plugin allowlists、workspace/session 文件、过期的旧版 plugin 依赖状态、启动和 RPC 状态都能保留。
- `pnpm test:docker:published-upgrade-survivor`：默认安装 `openclaw@latest`，用真实感较强的现有用户文件播种环境，但不包含 live provider 或 channel key，使用预制的 `openclaw config set` 命令配方为该基线配置，然后将该已发布安装更新为打包后的 OpenClaw tarball，运行非交互式 doctor，写入 `.artifacts/upgrade-survivor/summary.json`，接着启动一个 loopback Gateway，并检查已配置的 intents、workspace/session 文件、过期的插件配置和旧依赖状态、启动、`/healthz`、`/readyz` 和 RPC 状态是否能保留或被正常修复。可通过 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 覆盖单个基线，通过 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` 扩展精确的本地矩阵，例如 `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`，或者通过 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=reported-issues` 添加场景 fixture；`reported-issues` 集合包含 `configured-plugin-installs`，用于验证升级期间配置好的外部 OpenClaw 插件会自动安装，以及 `stale-source-plugin-shadow`，用于防止仅源代码插件 shadow 破坏启动。Package Acceptance 将这些项暴露为 `published_upgrade_survivor_baseline`、`published_upgrade_survivor_baselines` 和 `published_upgrade_survivor_scenarios`，并在将精确包规格交给 Docker 通道之前解析诸如 `last-stable-4` 或 `all-since-2026.4.23` 之类的元基线 token。
- `pnpm test:docker:update-migration`：在清理较重的 `plugin-deps-cleanup` 场景中运行已发布升级 survivor harness，默认从 `openclaw@2026.4.23` 开始。独立的 `Update Migration` 工作流会用 `baselines=all-since-2026.4.23` 扩展此通道，以便从 `.23` 开始的每个稳定已发布包都升级到候选版本，并证明在 Full Release CI 之外的已配置插件依赖清理。
- `pnpm test:docker:plugins`：运行本地路径、`file:`、带有提升依赖的 npm registry 包、git 移动引用、ClawHub fixture、marketplace 更新以及 Claude bundle 启用/检查的安装/更新冒烟测试。

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
