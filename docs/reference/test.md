---
summary: "如何在本地运行测试（vitest）以及何时使用 force/coverage 模式"
read_when:
  - 运行或修复测试时
title: "测试"
---

- 完整测试套件（suites、live、Docker）：[测试](/help/testing)

- `pnpm test:force`：终止任何仍在运行、占用默认控制端口的 gateway 进程，然后使用隔离的 gateway 端口运行完整的 Vitest 套件，这样服务端测试就不会与正在运行的实例冲突。当之前的 gateway 运行遗留了被 18789 端口占用的情况时使用它。
- `pnpm test:coverage`：使用 V8 覆盖率运行单元测试套件（通过 `vitest.unit.config.ts`）。这是一个按已加载文件统计的单元覆盖率门禁，不是整个仓库所有文件的覆盖率。阈值为 70% 的 lines/functions/statements 和 55% 的 branches。由于 `coverage.all` 为 false，该门禁衡量的是单元覆盖率套件加载到的文件，而不是把每个分支线路上的源文件都当作未覆盖。
- `pnpm test:coverage:changed`：仅对自 `origin/main` 以来发生变更的文件运行单元覆盖率。
- `pnpm test:changed`：便宜的智能变更测试运行。它会根据直接的测试编辑、同级 `*.test.ts` 文件、显式源映射以及本地导入图来运行精确目标。广泛/配置/包级别的变更会被跳过，除非它们能映射到精确测试。
- `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`：显式的广泛变更测试运行。当测试 harness/config/package 的编辑应回退到 Vitest 更宽泛的 changed-test 行为时使用它。
- `pnpm changed:lanes`：显示相对于 `origin/main` 的 diff 所触发的架构 lanes。
- `pnpm check:changed`：对相对于 `origin/main` 的 diff 运行智能变更检查门禁。它会为受影响的架构 lanes 运行 typecheck、lint 和 guard 命令，但不会运行 Vitest 测试。要获取测试证明，请使用 `pnpm test:changed` 或显式的 `pnpm test <target>`。
- `pnpm test`：将显式的文件/目录目标路由到受限范围的 Vitest lanes。未指定目标的运行会使用固定的分片组，并展开到叶子配置以便本地并行执行；扩展组总是展开为每个扩展的分片配置，而不是一个巨大的根项目进程。
- 测试封装器运行结束时会输出简短的 `[test] passed|failed|skipped ... in ...` 摘要。Vitest 自己的耗时行仍保留为每个分片的细节。
- 完整、扩展和 include-pattern 分片运行会更新 `.artifacts/vitest-shard-timings.json` 中的本地计时数据；后续的整配置运行会使用这些计时来平衡快慢分片。include-pattern CI 分片会将分片名称追加到计时键中，这样筛选后的分片计时仍然可见，而不会覆盖整配置计时数据。设置 `OPENCLAW_TEST_PROJECTS_TIMINGS=0` 可忽略本地计时产物。
- 选定的 `plugin-sdk` 和 `commands` 测试文件现在会路由到专用的轻量 lanes，这些 lanes 只保留 `test/setup.ts`，从而让运行时开销较大的用例继续留在它们原有的 lanes 上。
- 带有同级测试的源文件会先映射到该同级测试，再回退到更宽的目录 glob。`test/helpers/channels` 和 `test/helpers/plugins` 下的 helper 编辑会使用本地导入图来运行导入它们的测试，而不是在依赖路径精确时广泛运行每个分片。
- `auto-reply` 现在也拆分为三个专用配置（`core`、`top-level`、`reply`），因此 reply harness 不会在较轻的顶层状态/token/helper 测试中占主导。
- 基础 Vitest 配置现在默认使用 `pool: "threads"` 和 `isolate: false`，仓库各配置中都启用了共享的非隔离运行器。
- `pnpm test:channels` 运行 `vitest.channels.config.ts`。
- `pnpm test:extensions` 和 `pnpm test extensions` 运行所有 extension/plugin 分片。重型 channel plugins、browser plugin 和 OpenAI 作为专用分片运行；其他 plugin 组保持批量运行。要运行一个打包好的 plugin lane，请使用 `pnpm test extensions/<id>`。
- `pnpm test:perf:imports`：启用 Vitest 的 import-duration + import-breakdown 报告，同时仍对显式文件/目录目标使用受限 lane 路由。
- `pnpm test:perf:imports:changed`：同样进行 import profiling，但仅针对自 `origin/main` 以来发生变更的文件。
- `pnpm test:perf:changed:bench -- --ref <git-ref>`：将路由后的 changed-mode 路径与针对同一已提交 git diff 的原生 root-project 运行进行基准比较。
- `pnpm test:perf:changed:bench -- --worktree`：在不先提交的情况下对当前工作区变更集进行基准比较。
- `pnpm test:perf:profile:main`：为 Vitest 主线程写入 CPU profile（`.artifacts/vitest-main-profile`）。
- `pnpm test:perf:profile:runner`：为单元 runner 写入 CPU + heap profiles（`.artifacts/vitest-runner-profile`）。
- `pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json`：按顺序运行每个 full-suite Vitest 叶子配置，并写出分组耗时数据以及每个配置的 JSON/log 产物。Test Performance Agent 会在尝试修复慢测试之前将其作为基线。
- `pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json`：比较一次性能优化变更之后的分组报告。
- Gateway 集成：可通过 `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway` 选择启用。
- `pnpm test:e2e`：运行 gateway 端到端冒烟测试（多实例 WS/HTTP/node 配对）。默认在 `vitest.e2e.config.ts` 中使用 `threads` + `isolate: false` 和自适应 workers；可通过 `OPENCLAW_E2E_WORKERS=<n>` 调整，并设置 `OPENCLAW_E2E_VERBOSE=1` 以输出详细日志。
- `pnpm test:live`：运行 provider live 测试（minimax/zai）。需要 API keys 和 `LIVE=1`（或 provider 专用的 `*_LIVE_TEST=1`）才能取消跳过。
- `pnpm test:docker:all`：构建共享的 live-test 镜像，先将 OpenClaw 打包为一个 npm tarball，构建/复用一个纯 Node/Git runner 镜像以及一个会把该 tarball 安装到 `/app` 的 functional 镜像，然后通过加权调度器在 `OPENCLAW_SKIP_DOCKER_BUILD=1` 下运行 Docker 冒烟 lanes。纯镜像（`OPENCLAW_DOCKER_E2E_BARE_IMAGE`）用于安装器/更新/plugin-dependency lanes；这些 lanes 挂载预构建的 tarball，而不是使用复制的仓库源码。functional 镜像（`OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`）用于正常的已构建应用功能 lanes。`scripts/package-openclaw-for-docker.mjs` 是单一的本地/CI 打包器，会在 Docker 消费 tarball 之前验证 tarball 以及 `dist/postinstall-inventory.json`。Docker lane 定义位于 `scripts/lib/docker-e2e-scenarios.mjs`；planner 逻辑位于 `scripts/lib/docker-e2e-plan.mjs`；`scripts/test-docker-all.mjs` 执行所选计划。`node scripts/test-docker-all.mjs --plan-json` 会在不构建或运行 Docker 的情况下，输出由调度器管理的 CI 计划，包含所选 lanes、镜像类型、包/live-image 需求以及凭据检查。`OPENCLAW_DOCKER_ALL_PARALLELISM=<n>` 控制进程槽位，默认值为 10；`OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM=<n>` 控制对 provider 敏感的尾部池，默认值为 10。重型 lane 上限默认是 `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；provider 上限默认通过 `OPENCLAW_DOCKER_ALL_LIVE_CLAUDE_LIMIT=4`、`OPENCLAW_DOCKER_ALL_LIVE_CODEX_LIMIT=4` 和 `OPENCLAW_DOCKER_ALL_LIVE_GEMINI_LIMIT=4` 为每个 provider 限制一个重型 lane。对更大的主机可使用 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。如果某个 lane 在低并行度主机上的有效权重或资源上限之上，它仍然可以从空池启动，并会独自运行，直到释放容量。默认情况下 lane 启动会以 2 秒间隔错峰，以避免本地 Docker daemon create 风暴；可用 `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=<ms>` 覆盖。runner 默认会预检 Docker、清理过期的 OpenClaw E2E 容器、每 30 秒输出一次活动 lane 状态、在兼容 lanes 之间共享 provider CLI 工具缓存、默认对临时的 live-provider 失败重试一次（`OPENCLAW_DOCKER_ALL_LIVE_RETRIES=<n>`），并将 lane 计时存储在 `.artifacts/docker-tests/lane-timings.json` 中，以便后续运行按最长优先排序。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 可在不运行 Docker 的情况下打印 lane 清单，使用 `OPENCLAW_DOCKER_ALL_STATUS_INTERVAL_MS=<ms>` 调整状态输出，或使用 `OPENCLAW_DOCKER_ALL_TIMINGS=0` 禁用计时复用。使用 `OPENCLAW_DOCKER_ALL_LIVE_MODE=skip` 仅运行确定性/本地 lanes，或使用 `OPENCLAW_DOCKER_ALL_LIVE_MODE=only` 仅运行 live-provider lanes；包别名为 `pnpm test:docker:local:all` 和 `pnpm test:docker:live:all`。仅 live 模式会将 main 和 tail live lanes 合并为一个按最长优先的池，这样 provider buckets 就可以把 Claude、Codex 和 Gemini 的工作一起打包。runner 会在首次失败后停止调度新的 pooled lanes，除非设置了 `OPENCLAW_DOCKER_ALL_FAIL_FAST=0`，并且每个 lane 都有一个 120 分钟的回退超时，可通过 `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS` 覆盖；选定的 live/tail lanes 使用更严格的每 lane 上限。CLI backend Docker setup 命令有自己的超时，通过 `OPENCLAW_LIVE_CLI_BACKEND_SETUP_TIMEOUT_SECONDS` 设置（默认 180）。每个 lane 的日志、`summary.json`、`failures.json` 和阶段耗时会写入 `.artifacts/docker-tests/<run-id>/`；使用 `pnpm test:docker:timings <summary.json>` 可检查慢 lane，使用 `pnpm test:docker:rerun <run-id|summary.json|failures.json>` 可打印便宜的定向重跑命令。
- `pnpm test:docker:browser-cdp-snapshot`：构建一个基于 Chromium 的 source E2E 容器，启动原始 CDP 和隔离的 Gateway，运行 `browser doctor --deep`，并验证 CDP role snapshots 是否包含链接 URL、游标提升的可点击项、iframe 参考以及 frame 元数据。
- CLI backend live Docker 探针可以作为聚焦的 lanes 运行，例如 `pnpm test:docker:live-cli-backend:codex`、`pnpm test:docker:live-cli-backend:codex:resume` 或 `pnpm test:docker:live-cli-backend:codex:mcp`。Claude 和 Gemini 也有对应的 `:resume` 和 `:mcp` 别名。
- `pnpm test:docker:openwebui`：启动 Docker 化的 OpenClaw + Open WebUI，通过 Open WebUI 登录，检查 `/api/models`，然后通过 `/api/chat/completions` 运行一个真实的代理聊天。需要可用的 live model key（例如 `~/.profile` 中的 OpenAI），会拉取外部的 Open WebUI 镜像，并且不指望像普通 unit/e2e 套件那样在 CI 中稳定。
- `pnpm test:docker:mcp-channels`：启动一个已植入种子的 Gateway 容器和第二个会启动 `openclaw mcp serve` 的客户端容器，然后验证路由后的对话发现、转录读取、附件元数据、live event queue 行为、出站发送路由，以及通过真实 stdio bridge 的 Claude 风格 channel + permission 通知。Claude 通知断言会直接读取原始 stdio MCP 帧，因此该冒烟测试反映的是 bridge 实际发出的内容。

## 本地 PR 网关

对于本地 PR 检查，请运行：

- `pnpm check:changed`
- `pnpm check`
- `pnpm check:test-types`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

如果 `pnpm test` 在负载较高的主机上不稳定，在视为回归之前重试一次，然后使用 `pnpm test <path/to/test>` 进行隔离。对于内存受限的主机，使用：

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## 模型延迟基准测试（本地密钥）

脚本：[`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

用法：

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- 可选环境变量：`MINIMAX_API_KEY`、`MINIMAX_BASE_URL`、`MINIMAX_MODEL`、`ANTHROPIC_API_KEY`
- 默认提示：“回复一个词：ok。不要添加标点或额外文字。”

上次运行（2025-12-31，20 次）：

- minimax 中位数 1279ms（最小 1114，最大 2431）
- opus 中位数 2454ms（最小 1224，最大 3170）

## CLI 启动基准测试

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

- `startup`: `--version`、`--help`、`health`、`health --json`、`status --json`、`status`
- `real`: `health`、`status`、`status --json`、`sessions`、`sessions --json`、`tasks --json`、`tasks list --json`、`tasks audit --json`、`agents list --json`、`gateway status`、`gateway status --json`、`gateway health --json`、`config get gateway.port`
- `all`：两个预设都包括

输出包括每个命令的 `sampleCount`、平均值、p50、p95、最小/最大值、退出代码/信号分布和最大 RSS 摘要。可选的 `--cpu-prof-dir` / `--heap-prof-dir` 会为每次运行写入 V8 配置文件，以便计时和配置文件捕获使用相同的工具。

保存的输出约定：

- `pnpm test:startup:bench:smoke` 将目标冒烟工件写入 `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` 使用 `runs=5` 和 `warmup=1` 将完整套件工件写入 `.artifacts/cli-startup-bench-all.json`
- `pnpm test:startup:bench:update` 使用 `runs=5` 和 `warmup=1` 刷新检入的基线夹具文件 `test/fixtures/cli-startup-bench.json`

检入的夹具文件：

- `test/fixtures/cli-startup-bench.json`
- 使用 `pnpm test:startup:bench:update` 刷新
- 使用 `pnpm test:startup:bench:check` 将当前结果与夹具文件进行比较

## 入门端到端（Docker）

Docker 是可选的；仅用于容器化的入门冒烟测试。

在干净的 Linux 容器中进行完整的冷启动流程：

```bash
scripts/e2e/onboard-docker.sh
```

此脚本通过伪终端驱动交互式向导，验证配置/工作空间/会话文件，然后启动网关并运行 `openclaw health`。

## QR 导入冒烟测试（Docker）

确保在受支持的 Docker Node 运行时下加载维护的 QR 运行时助手（默认 Node 24，兼容 Node 22）：

```bash
pnpm test:docker:qr
```

## 相关内容

- [测试](/help/testing)
- [测试直播](/help/testing-live)
