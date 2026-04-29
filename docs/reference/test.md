---
summary: "如何在本地运行测试（vitest）以及何时使用 force/coverage 模式"
read_when:
  - 运行或修复测试时
title: "测试"
---

- 完整测试套件（suite、live、Docker）：[测试](/help/testing)

- `pnpm test:force`：终止任何仍在运行、占用默认控制端口的网关进程，然后使用隔离的网关端口运行完整的 Vitest 套件，这样服务器测试就不会与正在运行的实例冲突。当之前一次网关运行导致端口 18789 被占用时使用此命令。
- `pnpm test:coverage`：使用 V8 覆盖率（通过 `vitest.unit.config.ts`）运行单元套件。这是基于已加载文件的单元覆盖率门禁，而不是整个仓库所有文件的覆盖率。阈值为 70% 的 lines/functions/statements 和 55% 的 branches。由于 `coverage.all` 为 false，门禁衡量的是被单元覆盖率套件加载的文件，而不是把每个拆分通道的源文件都视为未覆盖。
- `pnpm test:coverage:changed`：仅对自 `origin/main` 以来发生变更的文件运行单元覆盖率。
- `pnpm test:changed`：便宜的智能变更测试运行。它会基于直接的测试编辑、同级 `*.test.ts` 文件、显式源映射以及本地导入图运行精确目标。宽泛/配置/包变更会被跳过，除非它们能映射到精确测试。
- `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`：显式的宽泛变更测试运行。当测试 harness/config/package 的编辑应退回到 Vitest 更宽泛的 changed-test 行为时使用。
- `pnpm changed:lanes`：显示由相对于 `origin/main` 的差异触发的架构通道。
- `pnpm check:changed`：对相对于 `origin/main` 的差异运行智能变更检查门禁。它会对受影响的架构通道运行 typecheck、lint 和 guard 命令，但不会运行 Vitest 测试。测试证明请使用 `pnpm test:changed` 或显式的 `pnpm test <target>`。
- `pnpm test`：将显式的文件/目录目标路由到范围限定的 Vitest 通道。未指定目标的运行使用固定分片组，并展开为叶子配置以便本地并行执行；扩展分组始终展开为按扩展划分的分片配置，而不是一个巨大的 root-project 进程。
- 测试包装器运行结束时会输出一个简短的 `[test] passed|failed|skipped ... in ...` 汇总。Vitest 自身的耗时行仍保留为每个分片的详细信息。
- 共享的 OpenClaw 测试状态：当测试需要隔离的 `HOME`、`OPENCLAW_STATE_DIR`、`OPENCLAW_CONFIG_PATH`、配置 fixture、workspace、agent 目录或 auth-profile 存储时，请在 Vitest 中使用 `src/test-utils/openclaw-test-state.ts`。
- 进程级 E2E 辅助工具：当 Vitest 进程级 E2E 测试需要一个正在运行的 Gateway、CLI 环境、日志捕获和清理时，请使用 `test/helpers/openclaw-test-instance.ts`，把这些内容集中处理。
- Docker/Bash E2E 辅助工具：源自 `scripts/lib/docker-e2e-image.sh` 的通道可以将 `docker_e2e_test_state_shell_b64 <label> <scenario>` 传入容器，并用 `scripts/lib/openclaw-e2e-instance.sh` 解码；多 home 脚本可以传入 `docker_e2e_test_state_function_b64`，并在每个流程中调用 `openclaw_test_state_create <label> <scenario>`。更底层的调用方可以使用 `scripts/lib/openclaw-test-state.mjs shell --label <name> --scenario <name>` 获取容器内 shell 片段，或者使用 `node scripts/lib/openclaw-test-state.mjs -- create --label <name> --scenario <name> --env-file <path> --json` 生成可 source 的主机环境文件。`create` 前面的 `--` 可避免较新的 Node 运行时把 `--env-file` 当作 Node 参数处理。启动 Gateway 的 Docker/Bash 通道可以在容器内 source `scripts/lib/openclaw-e2e-instance.sh`，用于入口点解析、mock OpenAI 启动、Gateway 前台/后台启动、就绪探测、状态环境导出、日志转储和进程清理。
- 完整、扩展和 include-pattern 分片运行会把本地耗时数据更新到 `.artifacts/vitest-shard-timings.json`；后续的整配置运行会使用这些耗时来平衡慢分片和快分片。include-pattern CI 分片会把分片名称追加到 timing key 中，这样在不替换整配置耗时数据的情况下仍能看到被过滤的分片耗时。设置 `OPENCLAW_TEST_PROJECTS_TIMINGS=0` 可忽略本地 timing 工件。
- 选定的 `plugin-sdk` 和 `commands` 测试文件现在会路由到专用的轻量通道，这些通道只保留 `test/setup.ts`，让运行时较重的用例继续留在原有通道上。
- 带有同级测试的源文件会先映射到该同级测试，再回退到更宽的目录 glob。位于 `src/channels/plugins/contracts/test-helpers`、`src/plugin-sdk/test-helpers` 和 `src/plugins/contracts` 下的 helper 编辑会使用本地导入图来运行导入它们的测试，而不是在依赖路径足够精确时宽泛地运行每个分片。
- `auto-reply` 现在也拆分为三个专用配置（`core`、`top-level`、`reply`），这样 reply harness 就不会压制更轻量的 top-level status/token/helper 测试。
- 基础 Vitest 配置现在默认使用 `pool: "threads"` 和 `isolate: false`，并在整个仓库的配置中启用共享的非隔离运行器。
- `pnpm test:channels` 运行 `vitest.channels.config.ts`。
- `pnpm test:extensions` 和 `pnpm test extensions` 运行所有扩展/plugin 分片。重型 channel 插件、浏览器插件和 OpenAI 作为专用分片运行；其他插件组保持批量运行。使用 `pnpm test extensions/<id>` 可运行一个打包好的插件通道。
- `pnpm test:perf:imports`：启用 Vitest 导入耗时 + 导入拆分报告，同时对显式文件/目录目标仍使用范围限定的通道路由。
- `pnpm test:perf:imports:changed`：同样进行导入性能分析，但仅针对自 `origin/main` 以来发生变更的文件。
- `pnpm test:perf:changed:bench -- --ref <git-ref>`：将路由后的 changed 模式路径与同一已提交 git diff 的原生 root-project 运行进行基准比较。
- `pnpm test:perf:changed:bench -- --worktree`：在不先提交的情况下，对当前工作区变更集进行基准比较。
- `pnpm test:perf:profile:main`：为 Vitest 主线程写出 CPU profile（`.artifacts/vitest-main-profile`）。
- `pnpm test:perf:profile:runner`：为单元 runner 写出 CPU + heap profile（`.artifacts/vitest-runner-profile`）。
- `pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json`：串行运行每个 full-suite Vitest 叶子配置，并写出分组后的耗时数据以及每个配置对应的 JSON/log 工件。Test Performance Agent 会把它作为基线，然后再尝试修复慢测试。
- `pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json`：在性能优化变更之后比较分组报告。
- Gateway 集成：通过 `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway` 选择启用。
- `pnpm test:e2e`：运行 gateway 端到端冒烟测试（多实例 WS/HTTP/node 配对）。默认使用 `threads` + `isolate: false`，并在 `vitest.e2e.config.ts` 中使用自适应 workers；可用 `OPENCLAW_E2E_WORKERS=<n>` 调整，并设置 `OPENCLAW_E2E_VERBOSE=1` 以输出详细日志。
- `pnpm test:live`：运行 provider live 测试（minimax/zai）。需要 API key 和 `LIVE=1`（或 provider 特定的 `*_LIVE_TEST=1`）才能取消跳过。
- `pnpm test:docker:all`：构建共享的 live-test 镜像，将 OpenClaw 作为一个 npm tarball 打包一次，构建/复用一个基础 Node/Git runner 镜像以及一个会把该 tarball 安装到 `/app` 的功能镜像，然后通过带权调度器运行 Docker 冒烟通道并设置 `OPENCLAW_SKIP_DOCKER_BUILD=1`。基础镜像（`OPENCLAW_DOCKER_E2E_BARE_IMAGE`）用于 installer/update/plugin-dependency 通道；这些通道挂载预构建 tarball，而不是使用复制的仓库源代码。功能镜像（`OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`）用于常规已构建应用功能通道。`scripts/package-openclaw-for-docker.mjs` 是本地/CI 唯一的打包器，在 Docker 消费之前会校验 tarball 和 `dist/postinstall-inventory.json`。Docker 通道定义位于 `scripts/lib/docker-e2e-scenarios.mjs`；规划逻辑位于 `scripts/lib/docker-e2e-plan.mjs`；`scripts/test-docker-all.mjs` 执行所选计划。`node scripts/test-docker-all.mjs --plan-json` 会在不构建或运行 Docker 的情况下，为所选通道、镜像类型、包/live 镜像需求、状态场景和凭据检查输出由调度器管理的 CI 计划。`OPENCLAW_DOCKER_ALL_PARALLELISM=<n>` 控制进程槽位，默认值为 10；`OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM=<n>` 控制对 provider 敏感的尾部池，默认值为 10。重型通道上限默认是 `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；provider 上限默认通过 `OPENCLAW_DOCKER_ALL_LIVE_CLAUDE_LIMIT=4`、`OPENCLAW_DOCKER_ALL_LIVE_CODEX_LIMIT=4` 和 `OPENCLAW_DOCKER_ALL_LIVE_GEMINI_LIMIT=4` 为每个重型通道限制为一个。对于更大的主机，请使用 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。如果在低并行度主机上某个通道超过了有效权重或资源上限，它仍然可以从空池启动，并会单独运行直到释放容量。默认情况下，通道启动会间隔 2 秒，以避免本地 Docker daemon 的创建风暴；可用 `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=<ms>` 覆盖。运行器默认会先对 Docker 做预检，清理过期的 OpenClaw E2E 容器，每 30 秒输出一次活动通道状态，在兼容通道之间共享 provider CLI 工具缓存，默认对临时 live-provider 失败重试一次（`OPENCLAW_DOCKER_ALL_LIVE_RETRIES=<n>`），并将通道耗时存储在 `.artifacts/docker-tests/lane-timings.json` 中，以便后续运行按最长优先排序。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 可在不运行 Docker 的情况下打印通道清单，使用 `OPENCLAW_DOCKER_ALL_STATUS_INTERVAL_MS=<ms>` 可调整状态输出，或使用 `OPENCLAW_DOCKER_ALL_TIMINGS=0` 禁用耗时复用。使用 `OPENCLAW_DOCKER_ALL_LIVE_MODE=skip` 仅运行确定性/本地通道，或使用 `OPENCLAW_DOCKER_ALL_LIVE_MODE=only` 仅运行 live-provider 通道；包别名为 `pnpm test:docker:local:all` 和 `pnpm test:docker:live:all`。仅 live 模式会把 main 和 tail live 通道合并到一个最长优先池中，以便 provider 分桶可以将 Claude、Codex 和 Gemini 的工作放在一起。运行器在第一次失败后会停止调度新的已分组通道，除非设置了 `OPENCLAW_DOCKER_ALL_FAIL_FAST=0`，并且每个通道都有一个 120 分钟的兜底超时，可通过 `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS` 覆盖；所选 live/tail 通道使用更严格的每通道上限。CLI backend Docker 设置命令有自己的超时，由 `OPENCLAW_LIVE_CLI_BACKEND_SETUP_TIMEOUT_SECONDS` 控制（默认 180）。每个通道的日志、`summary.json`、`failures.json` 和阶段耗时都会写入 `.artifacts/docker-tests/<run-id>/`；使用 `pnpm test:docker:timings <summary.json>` 可查看慢通道，使用 `pnpm test:docker:rerun <run-id|summary.json|failures.json>` 可打印廉价的定向重跑命令。
- `pnpm test:docker:browser-cdp-snapshot`：构建一个基于 Chromium 的 source E2E 容器，启动原始 CDP 和一个隔离的 Gateway，运行 `browser doctor --deep`，并验证 CDP role snapshots 包含链接 URL、cursor-promoted 可点击项、iframe 引用以及 frame 元数据。
- CLI backend live Docker 探测可以作为聚焦通道运行，例如 `pnpm test:docker:live-cli-backend:codex`、`pnpm test:docker:live-cli-backend:codex:resume` 或 `pnpm test:docker:live-cli-backend:codex:mcp`。Claude 和 Gemini 也有对应的 `:resume` 和 `:mcp` 别名。
- `pnpm test:docker:openwebui`：启动 Docker 化的 OpenClaw + Open WebUI，通过 Open WebUI 登录，检查 `/api/models`，然后通过 `/api/chat/completions` 运行一次真实的代理聊天。需要可用的 live model key（例如在 `~/.profile` 中配置的 OpenAI key），会拉取一个外部 Open WebUI 镜像，并且其稳定性不被期望达到像常规单元/e2e 套件那样适合 CI。
- `pnpm test:docker:mcp-channels`：启动一个已种子的 Gateway 容器和第二个客户端容器，后者会启动 `openclaw mcp serve`，然后验证路由后的对话发现、转录读取、附件元数据、live 事件队列行为、外发发送路由，以及通过真实 stdio 桥的 Claude 风格 channel + permission 通知。Claude 通知断言会直接读取原始 stdio MCP 帧，因此该冒烟测试反映的是桥实际上发出的内容。

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

- [测试](/help/testing)
- [在线测试](/help/testing-live)
