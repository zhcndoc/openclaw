---
summary: "如何在本地运行测试（vitest）以及何时使用 force/coverage 模式"
read_when:
  - 运行或修复测试时
title: "测试"
---

- 完整测试套件（suites、live、Docker）：[测试](/help/testing)

- `pnpm test:force`：终止任何占用默认控制端口的残留 gateway 进程，然后使用隔离的 gateway 端口运行完整的 Vitest 套件，这样服务器测试就不会与正在运行的实例冲突。当之前的 gateway 运行留下 18789 端口被占用时，请使用此命令。
- `pnpm test:coverage`：使用 V8 coverage 运行单元测试套件（通过 `vitest.unit.config.ts`）。这是一个基于已加载文件的单元覆盖率门禁，而不是整个仓库所有文件的覆盖率。阈值为 70% 的 lines/functions/statements 和 55% 的 branches。由于 `coverage.all` 为 false，门禁衡量的是单元覆盖率套件加载到的文件，而不是把每个分片通道源文件都视为未覆盖。
- `pnpm test:coverage:changed`：仅对自 `origin/main` 以来发生变更的文件运行单元覆盖率。
- `pnpm test:changed`：当 diff 只涉及可路由的源文件/测试文件时，会将变更的 git 路径展开为范围限定的 Vitest lane。配置/设置变更仍会回退到原生 root projects 运行，因此当需要时，接线编辑会更广泛地重新执行。
- `pnpm changed:lanes`：显示由相对于 `origin/main` 的 diff 触发的架构 lanes。
- `pnpm check:changed`：运行相对于 `origin/main` 的 diff 的智能变更门禁。它会使用 core test lanes 运行 core 工作，使用 extension test lanes 运行扩展工作，使用 test typecheck/tests 运行仅测试相关工作，将公开 Plugin SDK 或 plugin-contract 的变更扩展为一次扩展验证，并对仅发布元数据的版本号提升保留针对性的 version/config/root-dependency 检查。
- `pnpm test`：将显式的文件/目录目标路由到范围限定的 Vitest lanes。未指定目标的运行会使用固定的 shard 组，并展开为叶子配置以便在本地并行执行；extension 组始终会展开为每个 extension 的 shard 配置，而不是一个巨大的 root-project 进程。
- 完整和 extension 的 shard 运行会更新 `.artifacts/vitest-shard-timings.json` 中的本地计时数据；后续运行会使用这些计时数据来平衡慢 shard 和快 shard。将 `OPENCLAW_TEST_PROJECTS_TIMINGS=0` 设为忽略本地计时工件。
- 选定的 `plugin-sdk` 和 `commands` 测试文件现在会路由到专用的轻量 lanes，这些 lanes 只保留 `test/setup.ts`，从而让运行时开销较大的用例继续留在它们原本的 lanes 上。
- 选定的 `plugin-sdk` 和 `commands` 辅助源文件也会将 `pnpm test:changed` 映射到这些轻量 lanes 中对应的显式兄弟测试，因此小型辅助编辑不会触发重跑耗时的、依赖运行时的套件。
- `auto-reply` 现在也拆分为三个专用配置（`core`、`top-level`、`reply`），这样 reply harness 就不会在较轻量的 top-level status/token/helper 测试中占主导。
- 基础 Vitest 配置现在默认使用 `pool: "threads"` 和 `isolate: false`，并在整个仓库配置中启用共享的非隔离 runner。
- `pnpm test:channels` 运行 `vitest.channels.config.ts`。
- `pnpm test:extensions` 和 `pnpm test extensions` 运行所有 extension/plugin shards。重型 channel plugins、browser plugin 和 OpenAI 作为专用 shard 运行；其他插件组保持批量运行。使用 `pnpm test extensions/<id>` 运行一个打包的 plugin lane。
- `pnpm test:perf:imports`：启用 Vitest 的导入耗时 + 导入拆解报告，同时仍对显式文件/目录目标使用范围限定的 lane 路由。
- `pnpm test:perf:imports:changed`：相同的导入性能分析，但仅针对自 `origin/main` 以来发生变更的文件。
- `pnpm test:perf:changed:bench -- --ref <git-ref>`：将路由后的 changed 模式路径与相同已提交 git diff 的原生 root-project 运行进行基准比较。
- `pnpm test:perf:changed:bench -- --worktree`：在不先提交的情况下，对当前 worktree 的变更集进行基准比较。
- `pnpm test:perf:profile:main`：为 Vitest 主线程写入 CPU profile（`.artifacts/vitest-main-profile`）。
- `pnpm test:perf:profile:runner`：为单元 runner 写入 CPU + heap profiles（`.artifacts/vitest-runner-profile`）。
- `pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json`：按顺序运行所有 full-suite Vitest 叶子配置，并写出分组耗时数据以及每个配置的 JSON/log 工件。Test Performance Agent 会在尝试修复慢测试之前把它用作基线。
- `pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json`：比较性能相关变更之后的分组报告。
- Gateway 集成：通过 `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway` 进行启用。
- `pnpm test:e2e`：运行 gateway 端到端冒烟测试（多实例 WS/HTTP/node 配对）。默认在 `vitest.e2e.config.ts` 中使用 `threads` + `isolate: false` 并配有自适应 workers；可通过 `OPENCLAW_E2E_WORKERS=<n>` 调整，并设置 `OPENCLAW_E2E_VERBOSE=1` 以输出详细日志。
- `pnpm test:live`：运行 provider live 测试（minimax/zai）。需要 API keys 和 `LIVE=1`（或 provider 特定的 `*_LIVE_TEST=1`）才能取消跳过。
- `pnpm test:docker:all`：先构建一次共享的 live-test image 和 Docker E2E image，然后通过加权调度器在 `OPENCLAW_SKIP_DOCKER_BUILD=1` 下运行 Docker 冒烟 lanes。`OPENCLAW_DOCKER_ALL_PARALLELISM=<n>` 控制进程槽位数，默认 10；`OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM=<n>` 控制对 provider 敏感的尾部池，默认 10。重型 lane 上限默认分别为 `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=6`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=8` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；在更大的主机上可使用 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。lane 启动默认相隔 2 秒，以避免本地 Docker daemon 的创建风暴；可通过 `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=<ms>` 覆盖。运行器默认会预检 Docker、清理过期的 OpenClaw E2E containers、每 30 秒输出一次活动 lane 状态，并将 lane 计时存储在 `.artifacts/docker-tests/lane-timings.json` 中，以便后续运行按最长优先排序。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 可以在不运行 Docker 的情况下打印 lane 清单，使用 `OPENCLAW_DOCKER_ALL_STATUS_INTERVAL_MS=<ms>` 调整状态输出，或使用 `OPENCLAW_DOCKER_ALL_TIMINGS=0` 禁用计时复用。运行器在第一个失败后会停止调度新的 pooled lanes，除非设置 `OPENCLAW_DOCKER_ALL_FAIL_FAST=0`，并且每个 lane 都有一个 120 分钟的回退超时，可通过 `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS` 覆盖；选定的 live/tail lanes 使用更严格的每 lane 上限。每个 lane 的日志写入 `.artifacts/docker-tests/<run-id>/` 下。
- `pnpm test:docker:openwebui`：启动 Docker 化的 OpenClaw + Open WebUI，通过 Open WebUI 登录，检查 `/api/models`，然后通过 `/api/chat/completions` 运行一次真实的代理聊天。需要可用的 live model key（例如 `~/.profile` 中的 OpenAI），会拉取外部 Open WebUI image，并且它并不指望像正常的单元/e2e 套件那样在 CI 中稳定。
- `pnpm test:docker:mcp-channels`：启动一个带种子的 Gateway 容器和第二个客户端容器，该客户端容器会启动 `openclaw mcp serve`，然后验证路由后的 conversation discovery、transcript reads、attachment metadata、live event queue 行为、outbound send routing，以及通过真实 stdio bridge 的 Claude 风格 channel + permission 通知。Claude 通知断言会直接读取原始的 stdio MCP frames，因此这个 smoke 反映的是 bridge 实际发出的内容。

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
