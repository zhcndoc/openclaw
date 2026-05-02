---
summary: "如何在本地运行测试（vitest）以及何时使用 force/coverage 模式"
read_when:
  - 运行或修复测试时
title: "测试"
---

- 完整测试工具包（套件、实时、Docker）：[Testing](/help/testing)
- 更新和插件包验证：[Testing updates and plugins](/help/testing-updates-plugins)

- `pnpm test:force`：终止任何仍在占用默认控制端口的残留 gateway 进程，然后使用隔离的 gateway 端口运行完整 Vitest 套件，这样服务端测试就不会与正在运行的实例冲突。当先前的 gateway 运行让端口 18789 仍被占用时，请使用此命令。
- `pnpm test:coverage`：使用 V8 覆盖率运行单元测试套件（通过 `vitest.unit.config.ts`）。这是针对已加载文件的单元覆盖率门禁，而不是整个仓库所有文件的覆盖率。阈值为：行/函数/语句 70%，分支 55%。由于 `coverage.all` 为 false，该门禁衡量的是被单元覆盖率套件加载的文件，而不是把每个拆分车道的源码文件都视为未覆盖。
- `pnpm test:coverage:changed`：仅对自 `origin/main` 以来发生变化的文件运行单元覆盖率。
- `pnpm test:changed`：低成本的智能变更测试运行。它会根据直接测试编辑、同级 `*.test.ts` 文件、显式源码映射和本地导入图运行精确目标。宽泛的/config/package 变更会被跳过，除非它们能映射到精确的测试。
- `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`：显式的宽泛变更测试运行。当测试 harness/config/package 编辑应回退到 Vitest 更宽泛的 changed-test 行为时使用它。
- `pnpm changed:lanes`：显示相对于 `origin/main` 的差异所触发的架构车道。
- `pnpm check:changed`：针对相对于 `origin/main` 的差异运行智能变更检查门禁。它会为受影响的架构车道运行 typecheck、lint 和 guard 命令，但不会运行 Vitest 测试。要证明测试通过，请使用 `pnpm test:changed` 或显式的 `pnpm test <target>`。
- `pnpm test`：通过带作用域的 Vitest 车道路由显式文件/目录目标。未指定目标的运行使用固定分片组，并展开为叶子配置以进行本地并行执行；扩展组总是展开为按扩展拆分的分片配置，而不是一个巨大的根项目进程。
- 测试包装器运行结束时会输出简短的 `[test] passed|failed|skipped ... in ...` 摘要。Vitest 自己的耗时行则保留为每个分片的详细信息。
- 共享的 OpenClaw 测试状态：当测试需要隔离的 `HOME`、`OPENCLAW_STATE_DIR`、`OPENCLAW_CONFIG_PATH`、配置夹具、工作区、agent 目录或 auth-profile 存储时，请在 Vitest 中使用 `src/test-utils/openclaw-test-state.ts`。
- 进程级 E2E 辅助工具：当 Vitest 的进程级 E2E 测试需要在一个地方处理运行中的 Gateway、CLI 环境、日志捕获和清理时，请使用 `test/helpers/openclaw-test-instance.ts`。
- Docker/Bash E2E 辅助工具：引入 `scripts/lib/docker-e2e-image.sh` 的车道可以将 `docker_e2e_test_state_shell_b64 <label> <scenario>` 传入容器，并用 `scripts/lib/openclaw-e2e-instance.sh` 解码；多 home 脚本可以传入 `docker_e2e_test_state_function_b64`，并在每个流程中调用 `openclaw_test_state_create <label> <scenario>`。更底层的调用方可以使用 `scripts/lib/openclaw-test-state.mjs shell --label <name> --scenario <name>` 获取容器内 shell 片段，或使用 `node scripts/lib/openclaw-test-state.mjs -- create --label <name> --scenario <name> --env-file <path> --json` 获取可 source 的宿主环境文件。`create` 前面的 `--` 可防止较新的 Node 运行时将 `--env-file` 视为 Node 标志。启动 Gateway 的 Docker/Bash 车道可以在容器内引入 `scripts/lib/openclaw-e2e-instance.sh`，以处理入口点解析、模拟 OpenAI 启动、Gateway 前台/后台启动、就绪探测、状态环境导出、日志转储和进程清理。
- 完整、扩展和 include-pattern 分片运行会将本地计时数据更新到 `.artifacts/vitest-shard-timings.json`；后续的整配置运行会使用这些计时数据来平衡慢分片和快分片。include-pattern CI 分片会将分片名称附加到计时键上，这样筛选后的分片计时仍然可见，而不会替换整配置计时数据。设置 `OPENCLAW_TEST_PROJECTS_TIMINGS=0` 可忽略本地计时工件。
- 选定的 `plugin-sdk` 和 `commands` 测试文件现在通过专用的轻量车道路由，这些车道只保留 `test/setup.ts`，而运行时较重的案例仍留在现有车道上。
- 带有同级测试的源码文件会先映射到该同级测试，然后才回退到更宽泛的目录 glob。位于 `src/channels/plugins/contracts/test-helpers`、`src/plugin-sdk/test-helpers` 和 `src/plugins/contracts` 下的辅助工具编辑会使用本地导入图来运行导入它们的测试，而不是在依赖路径精确时宽泛地运行每个分片。
- `auto-reply` 现在也拆分为三个专用配置（`core`、`top-level`、`reply`），这样 reply harness 就不会主导较轻量的顶层状态/token/helper 测试。
- 基础 Vitest 配置现在默认使用 `pool: "threads"` 和 `isolate: false`，并在整个仓库配置中启用了共享的非隔离 runner。
- `pnpm test:channels` 运行 `vitest.channels.config.ts`。
- `pnpm test:extensions` 和 `pnpm test extensions` 运行所有扩展/插件分片。重量级 channel 插件、browser 插件和 OpenAI 会作为专用分片运行；其他插件组仍保持批处理。对某个打包插件车道使用 `pnpm test extensions/<id>`。
- `pnpm test:perf:imports`：启用 Vitest 导入耗时 + 导入明细报告，同时对显式文件/目录目标仍使用带作用域的车道路由。
- `pnpm test:perf:imports:changed`：相同的导入性能分析，但仅针对自 `origin/main` 以来发生变化的文件。
- `pnpm test:perf:changed:bench -- --ref <git-ref>`：对同一已提交 git 差异下，已路由的 changed 模式路径与原生根项目运行进行基准对比。
- `pnpm test:perf:changed:bench -- --worktree`：对当前工作树的变更集进行基准测试，无需先提交。
- `pnpm test:perf:profile:main`：为 Vitest 主线程写入 CPU profile（`.artifacts/vitest-main-profile`）。
- `pnpm test:perf:profile:runner`：为单元 runner 写入 CPU + 堆 profile（`.artifacts/vitest-runner-profile`）。
- `pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json`：串行运行每个完整套件 Vitest 叶子配置，并写入分组耗时数据以及每个配置的 JSON/日志工件。测试性能代理会在尝试修复慢测试前将其用作基线。
- `pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json`：对比一次以性能为重点的修改之后的分组报告。
- Gateway 集成：通过 `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway` 显式启用。
- `pnpm test:e2e`：运行 gateway 端到端冒烟测试（多实例 WS/HTTP/node 配对）。在 `vitest.e2e.config.ts` 中默认使用 `threads` + `isolate: false` 和自适应 workers；可通过 `OPENCLAW_E2E_WORKERS=<n>` 调整，并设置 `OPENCLAW_E2E_VERBOSE=1` 以获得详细日志。
- `pnpm test:live`：运行 provider 实时测试（minimax/zai）。需要 API keys 和 `LIVE=1`（或 provider 专属的 `*_LIVE_TEST=1`）才能取消跳过。
- `pnpm test:docker:all`：构建共享的实时测试镜像，将 OpenClaw 一次性打包为 npm tarball，构建/复用一个裸 Node/Git runner 镜像以及一个功能镜像，后者会将该 tarball 安装到 `/app` 中，然后通过加权调度器使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行 Docker 冒烟车道。裸镜像（`OPENCLAW_DOCKER_E2E_BARE_IMAGE`）用于 installer/update/plugin-dependency 车道；这些车道会挂载预构建的 tarball，而不是使用复制的仓库源码。功能镜像（`OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`）用于普通的已构建应用功能车道。`scripts/package-openclaw-for-docker.mjs` 是本地/CI 唯一的包打包器，并会在 Docker 使用前验证 tarball 以及 `dist/postinstall-inventory.json`。Docker 车道定义位于 `scripts/lib/docker-e2e-scenarios.mjs`；规划逻辑位于 `scripts/lib/docker-e2e-plan.mjs`；`scripts/test-docker-all.mjs` 执行所选计划。`node scripts/test-docker-all.mjs --plan-json` 会输出由调度器持有的 CI 计划，其中包括所选车道、镜像类型、package/live-image 需求、状态场景和凭据检查，而不会构建或运行 Docker。`OPENCLAW_DOCKER_ALL_PARALLELISM=<n>` 控制进程槽位，默认值为 10；`OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM=<n>` 控制对 provider 敏感的尾部池，默认值也为 10。重型车道上限默认为 `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；provider 上限默认通过 `OPENCLAW_DOCKER_ALL_LIVE_CLAUDE_LIMIT=4`、`OPENCLAW_DOCKER_ALL_LIVE_CODEX_LIMIT=4` 和 `OPENCLAW_DOCKER_ALL_LIVE_GEMINI_LIMIT=4` 为每个 provider 限制一个重型车道。对于更大的主机，可使用 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。如果在低并行主机上某个车道超过有效权重或资源上限，它仍可从空池启动，并会单独运行直到释放容量。默认情况下，车道启动会错开 2 秒，以避免本地 Docker daemon 的创建风暴；可通过 `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=<ms>` 覆盖。runner 默认会对 Docker 进行预检，清理陈旧的 OpenClaw E2E 容器，每 30 秒输出一次活动车道状态，在兼容车道之间共享 provider CLI 工具缓存，默认对瞬态实时 provider 失败重试一次（`OPENCLAW_DOCKER_ALL_LIVE_RETRIES=<n>`），并将车道耗时存储在 `.artifacts/docker-tests/lane-timings.json` 中，以便后续运行按最长优先排序。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 可仅打印车道清单而不运行 Docker，使用 `OPENCLAW_DOCKER_ALL_STATUS_INTERVAL_MS=<ms>` 可调整状态输出，或使用 `OPENCLAW_DOCKER_ALL_TIMINGS=0` 禁用计时复用。对仅确定性/本地车道使用 `OPENCLAW_DOCKER_ALL_LIVE_MODE=skip`，或对仅实时 provider 车道使用 `OPENCLAW_DOCKER_ALL_LIVE_MODE=only`；对应的包别名为 `pnpm test:docker:local:all` 和 `pnpm test:docker:live:all`。仅实时模式会将主实时车道和尾部实时车道合并到一个按最长优先排序的池中，这样 provider bucket 就可以将 Claude、Codex 和 Gemini 的工作一起打包。除非设置了 `OPENCLAW_DOCKER_ALL_FAIL_FAST=0`，否则 runner 会在首次失败后停止调度新的池化车道，并且每个车道都有一个 120 分钟的兜底超时，可通过 `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS` 覆盖；选定的实时/尾部车道会使用更严格的每车道上限。CLI backend Docker 设置命令有自己独立的超时，通过 `OPENCLAW_LIVE_CLI_BACKEND_SETUP_TIMEOUT_SECONDS` 控制（默认 180）。每车道日志、`summary.json`、`failures.json` 和阶段计时会写入 `.artifacts/docker-tests/<run-id>/`；使用 `pnpm test:docker:timings <summary.json>` 可检查慢车道，使用 `pnpm test:docker:rerun <run-id|summary.json|failures.json>` 可打印低成本的定向重跑命令。
- `pnpm test:docker:browser-cdp-snapshot`：构建一个由 Chromium 支持的源码 E2E 容器，启动原始 CDP 和一个隔离的 Gateway，运行 `browser doctor --deep`，并验证 CDP 角色快照包含链接 URL、经光标提升的可点击项、iframe 引用和 frame 元数据。
- CLI backend 实时 Docker 探针可作为聚焦车道运行，例如 `pnpm test:docker:live-cli-backend:codex`、`pnpm test:docker:live-cli-backend:codex:resume` 或 `pnpm test:docker:live-cli-backend:codex:mcp`。Claude 和 Gemini 也有对应的 `:resume` 和 `:mcp` 别名。
- `pnpm test:docker:openwebui`：启动 Docker 化的 OpenClaw + Open WebUI，通过 Open WebUI 登录，检查 `/api/models`，然后通过 `/api/chat/completions` 运行一次真实的代理聊天。需要可用的实时模型密钥（例如 `~/.profile` 中的 OpenAI），会拉取外部 Open WebUI 镜像，并且不像常规 unit/e2e 套件那样预期具备 CI 稳定性。
- `pnpm test:docker:mcp-channels`：启动一个带种子数据的 Gateway 容器和第二个客户端容器，后者会生成 `openclaw mcp serve`，然后验证路由会话发现、转录读取、附件元数据、实时事件队列行为、出站发送路由，以及通过真实 stdio bridge 传递的 Claude 风格 channel + permission 通知。Claude 通知断言会直接读取原始 stdio MCP 帧，因此该冒烟测试能够反映 bridge 实际发出的内容。
- `pnpm test:docker:upgrade-survivor`：将打包后的 OpenClaw tarball 安装到一个脏旧用户夹具之上，在没有实时 provider 或 channel keys 的情况下运行 package update 和非交互式 doctor，然后启动一个 loopback Gateway，并检查 agents、channel 配置、plugin allowlists、workspace/session 文件、陈旧的 legacy plugin dependency 状态、启动和 RPC 状态是否得以保留。
- `pnpm test:docker:published-upgrade-survivor`：默认安装 `openclaw@latest`，在没有实时 provider 或 channel keys 的情况下填充真实的现有用户文件，使用内置的 `openclaw config set` 命令配方配置该基线，将该已发布安装更新为打包后的 OpenClaw tarball，运行非交互式 doctor，写入 `.artifacts/upgrade-survivor/summary.json`，然后启动一个 loopback Gateway，并检查已配置 intents、workspace/session 文件、陈旧的 plugin 配置和 legacy dependency 状态、启动、`/healthz`、`/readyz` 和 RPC 状态是否保留或被干净地修复。可使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 覆盖一个基线，使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` 展开精确矩阵，或使用 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=reported-issues` 添加场景夹具；Package Acceptance 将这些暴露为 `published_upgrade_survivor_baseline`、`published_upgrade_survivor_baselines` 和 `published_upgrade_survivor_scenarios`。

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
