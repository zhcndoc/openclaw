---
summary: "如何在本地运行测试（vitest）以及何时使用 force/coverage 模式"
read_when:
  - 运行或修复测试时
title: "测试"
---

- 完整测试套件（suites、live、Docker）：[测试](/help/testing)

- `pnpm test:force`: 杀掉任何占用默认控制端口的残留 gateway 进程，然后使用隔离的 gateway 端口运行完整的 Vitest 套件，这样服务器测试就不会与正在运行的实例发生冲突。当之前的 gateway 运行导致 18789 端口被占用时使用它。
- `pnpm test:coverage`: 使用 V8 覆盖率运行单元测试套件（通过 `vitest.unit.config.ts`）。这是针对已加载文件的单元覆盖率门禁，而不是整个仓库所有文件的覆盖率。阈值为 lines/functions/statements 70%，branches 55%。由于 `coverage.all` 为 false，门禁统计的是单元覆盖率套件加载到的文件，而不是把每个 split-lane 源文件都当作未覆盖。
- `pnpm test:coverage:changed`: 仅对自 `origin/main` 以来发生变化的文件运行单元覆盖率。
- `pnpm test:changed`: 轻量智能变更测试运行。它会根据直接的测试编辑、同级 `*.test.ts` 文件、显式源映射以及本地导入图运行精确目标。除非能够映射到精确测试，否则会跳过宽泛/配置/包级变更。
- `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`: 显式宽泛变更测试运行。当测试 harness/config/package 的修改应回退到 Vitest 更宽泛的变更测试行为时使用。
- `pnpm changed:lanes`: 显示相对于 `origin/main` 的 diff 触发了哪些架构 lane。
- `pnpm check:changed`: 针对相对于 `origin/main` 的 diff 运行智能变更检查门禁。它会对受影响的架构 lane 运行 typecheck、lint 和 guard 命令，但不会运行 Vitest 测试。要获取测试证明，请使用 `pnpm test:changed` 或显式 `pnpm test <target>`。
- `pnpm test`: 将显式文件/目录目标路由到范围限定的 Vitest lane。未定向运行会使用固定分片组，并展开为叶子配置以便在本地并行执行；扩展组总是展开为按扩展拆分的分片配置，而不是一个巨大的根项目进程。
- 测试包装器运行结束时会输出简短的 `[test] passed|failed|skipped ... in ...` 摘要。Vitest 自己的耗时行仍然作为每个分片的细节信息。
- 完整、扩展和包含模式的分片运行会更新 `.artifacts/vitest-shard-timings.json` 中的本地计时数据；后续的整体配置运行会使用这些计时来平衡慢分片和快分片。包含模式 CI 分片会将分片名追加到计时键中，这样可在不替换整体配置计时数据的情况下保留被过滤的分片计时。设置 `OPENCLAW_TEST_PROJECTS_TIMINGS=0` 可忽略本地计时产物。
- 选定的 `plugin-sdk` 和 `commands` 测试文件现在会通过专门的轻量 lane 路由，这些 lane 只保留 `test/setup.ts`，让运行时较重的用例继续留在它们原本的 lane 上。
- 带有同级测试的源文件会先映射到该同级测试，然后再回退到更宽泛的目录 glob。`test/helpers/channels` 和 `test/helpers/plugins` 下的辅助文件编辑会使用本地导入图来运行导入它们的测试，而不是在依赖路径足够精确时宽泛地重跑每个分片。
- `auto-reply` 现在也会拆分为三个专用配置（`core`、`top-level`、`reply`），因此 reply harness 不会主导更轻量的顶层状态/令牌/辅助测试。
- 基础 Vitest 配置现在默认使用 `pool: "threads"` 和 `isolate: false`，并在整个仓库配置中启用共享的非隔离运行器。
- `pnpm test:channels` 运行 `vitest.channels.config.ts`。
- `pnpm test:extensions` 和 `pnpm test extensions` 运行所有扩展/plugin 分片。重型 channel plugin、browser plugin 和 OpenAI 作为专用分片运行；其他 plugin 组保持批处理。使用 `pnpm test extensions/<id>` 运行一个打包好的 plugin lane。
- `pnpm test:perf:imports`: 启用 Vitest 导入耗时 + 导入分解报告，同时仍对显式文件/目录目标使用范围限定的 lane 路由。
- `pnpm test:perf:imports:changed`: 同样进行导入性能分析，但仅针对自 `origin/main` 以来发生变化的文件。
- `pnpm test:perf:changed:bench -- --ref <git-ref>` 将路由后的变更模式路径与同一已提交 git diff 的原生根项目运行进行基准对比。
- `pnpm test:perf:changed:bench -- --worktree` 在不先提交的情况下，对当前工作区变更集进行基准测试。
- `pnpm test:perf:profile:main`: 为 Vitest 主线程写入 CPU profile（`.artifacts/vitest-main-profile`）。
- `pnpm test:perf:profile:runner`: 为单元运行器写入 CPU + heap profile（`.artifacts/vitest-runner-profile`）。
- `pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json`: 串行运行每个 full-suite Vitest 叶子配置，并写入分组耗时数据以及每个配置的 JSON/log 产物。Test Performance Agent 会在尝试修复慢测试之前将其用作基线。
- `pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json`: 在性能导向的变更后比较分组报告。
- Gateway 集成：可通过 `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway` 选择启用。
- `pnpm test:e2e`: 运行 gateway 端到端冒烟测试（多实例 WS/HTTP/node 配对）。默认在 `vitest.e2e.config.ts` 中使用 `threads` + `isolate: false` 和自适应 worker；可通过 `OPENCLAW_E2E_WORKERS=<n>` 调整，并设置 `OPENCLAW_E2E_VERBOSE=1` 输出详细日志。
- `pnpm test:live`: 运行 provider live 测试（minimax/zai）。需要 API key 和 `LIVE=1`（或 provider-specific 的 `*_LIVE_TEST=1`）才能取消跳过。
- `pnpm test:docker:all`: 构建共享的 live-test 镜像，将 OpenClaw 仅打包一次为 npm tarball，构建/复用一个裸的 Node/Git runner 镜像以及一个会将该 tarball 安装到 `/app` 的功能镜像，然后通过加权调度器运行带 `OPENCLAW_SKIP_DOCKER_BUILD=1` 的 Docker 冒烟 lane。裸镜像（`OPENCLAW_DOCKER_E2E_BARE_IMAGE`）用于安装器/更新/plugin-dependency lane；这些 lane 挂载预构建的 tarball，而不是使用复制的仓库源代码。功能镜像（`OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`）用于正常的已构建应用功能 lane。`scripts/package-openclaw-for-docker.mjs` 是本地/CI 唯一的打包器，并在 Docker 消费之前验证 tarball 以及 `dist/postinstall-inventory.json`。Docker lane 定义位于 `scripts/lib/docker-e2e-scenarios.mjs`；调度器逻辑位于 `scripts/lib/docker-e2e-plan.mjs`；`scripts/test-docker-all.mjs` 执行所选计划。`node scripts/test-docker-all.mjs --plan-json` 会输出调度器管理的 CI 计划，包含所选 lane、镜像类型、包/live 镜像需求和凭据检查，而不构建或运行 Docker。`OPENCLAW_DOCKER_ALL_PARALLELISM=<n>` 控制进程槽位，默认值为 10；`OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM=<n>` 控制与 provider 相关的尾部池，默认值为 10。重型 lane 上限默认分别为 `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；provider 上限默认通过 `OPENCLAW_DOCKER_ALL_LIVE_CLAUDE_LIMIT=4`、`OPENCLAW_DOCKER_ALL_LIVE_CODEX_LIMIT=4` 和 `OPENCLAW_DOCKER_ALL_LIVE_GEMINI_LIMIT=4` 为每个 provider 限制一个重型 lane。对更大的主机可使用 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。为避免本地 Docker daemon 创建风暴，lane 默认以 2 秒错峰启动；可用 `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=<ms>` 覆盖。运行器默认会预检 Docker，清理过期的 OpenClaw E2E 容器，每 30 秒输出一次活动 lane 状态，在兼容的 lane 之间共享 provider CLI 工具缓存，默认对临时性 live-provider 失败重试一次（`OPENCLAW_DOCKER_ALL_LIVE_RETRIES=<n>`），并将 lane 计时存储在 `.artifacts/docker-tests/lane-timings.json` 中，以便后续运行按最长优先排序。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 可在不运行 Docker 的情况下打印 lane 清单，使用 `OPENCLAW_DOCKER_ALL_STATUS_INTERVAL_MS=<ms>` 调整状态输出，或使用 `OPENCLAW_DOCKER_ALL_TIMINGS=0` 禁用计时复用。使用 `OPENCLAW_DOCKER_ALL_LIVE_MODE=skip` 仅运行确定性/本地 lane，或使用 `OPENCLAW_DOCKER_ALL_LIVE_MODE=only` 仅运行 live-provider lane；包别名为 `pnpm test:docker:local:all` 和 `pnpm test:docker:live:all`。仅 live 模式会将主池和尾池的 live lane 合并为一个最长优先池，以便 provider 分桶可以将 Claude、Codex 和 Gemini 的工作一起打包。运行器在首次失败后会停止调度新的 pooled lane，除非设置了 `OPENCLAW_DOCKER_ALL_FAIL_FAST=0`，并且每个 lane 都有一个 120 分钟的回退超时，可由 `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS` 覆盖；选定的 live/tail lane 使用更严格的每 lane 上限。CLI backend Docker 设置命令有自己的超时时间，通过 `OPENCLAW_LIVE_CLI_BACKEND_SETUP_TIMEOUT_SECONDS` 控制（默认 180）。每个 lane 的日志、`summary.json`、`failures.json` 和阶段耗时会写入 `.artifacts/docker-tests/<run-id>/`；使用 `pnpm test:docker:timings <summary.json>` 查看慢 lane，使用 `pnpm test:docker:rerun <run-id|summary.json|failures.json>` 输出廉价的定向重跑命令。
- `pnpm test:docker:browser-cdp-snapshot`: 构建一个基于 Chromium 的源 E2E 容器，启动原始 CDP 和一个隔离的 Gateway，运行 `browser doctor --deep`，并验证 CDP 角色快照是否包含链接 URL、光标提升的可点击元素、iframe 引用以及 frame 元数据。
- CLI backend live Docker 探针可以作为聚焦 lane 运行，例如 `pnpm test:docker:live-cli-backend:codex`、`pnpm test:docker:live-cli-backend:codex:resume` 或 `pnpm test:docker:live-cli-backend:codex:mcp`。Claude 和 Gemini 也有对应的 `:resume` 和 `:mcp` 别名。
- `pnpm test:docker:openwebui`: 启动 Docker 化的 OpenClaw + Open WebUI，通过 Open WebUI 登录，检查 `/api/models`，然后通过 `/api/chat/completions` 运行一次真实的代理聊天。需要一个可用的 live 模型 key（例如在 `~/.profile` 中配置 OpenAI），会拉取一个外部 Open WebUI 镜像，并且并不指望像普通单元/e2e 套件那样在 CI 中保持稳定。
- `pnpm test:docker:mcp-channels`: 启动一个已播种数据的 Gateway 容器和第二个客户端容器，后者会启动 `openclaw mcp serve`，然后验证路由后的会话发现、转录读取、附件元数据、live event 队列行为、出站发送路由，以及通过真实 stdio bridge 的 Claude 风格 channel + 权限通知。Claude 通知断言会直接读取原始 stdio MCP 帧，因此该冒烟测试反映的是 bridge 实际发出的内容。

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
- 默认提示：“回复一个单词：ok。不添加标点或额外文字。”

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
- `pnpm tsx scripts/bench-cli-startup.ts --entry openclaw.mjs --entry-secondary dist/entry.js --preset all`
- `pnpm tsx scripts/bench-cli-startup.ts --preset all --output .artifacts/cli-startup-bench-all.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case gatewayStatusJson --output .artifacts/cli-startup-bench-smoke.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --cpu-prof-dir .artifacts/cli-cpu`
- `pnpm tsx scripts/bench-cli-startup.ts --json`

预设：

- `startup`：`--version`、`--help`、`health`、`health --json`、`status --json`、`status`
- `real`：`health`、`status`、`status --json`、`sessions`、`sessions --json`、`agents list --json`、`gateway status`、`gateway status --json`、`gateway health --json`、`config get gateway.port`
- `all`：包含两个预设

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
