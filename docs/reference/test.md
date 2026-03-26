---
summary: "如何在本地运行测试（vitest）以及何时使用 force/coverage 模式"
read_when:
  - 运行或修复测试时
title: "测试"
---

# 测试

- 完整测试套件（套件，实时，Docker）：[测试](/help/testing)

- `pnpm test:force`: 会终止任何占用默认控制端口的残留 gateway 进程，然后使用隔离的 gateway 端口运行完整的 Vitest 套件，这样服务器测试就不会与正在运行的实例冲突。当之前的 gateway 运行留下端口 18789 被占用时，请使用此命令。
- `pnpm test:coverage`: 使用 V8 覆盖率运行单元测试套件（通过 `vitest.unit.config.ts`）。全局阈值为 70% 的 lines/branches/functions/statements。覆盖率会排除集成性较强的入口点（CLI 连接、gateway/telegram 桥接、webchat 静态服务器），以保持目标聚焦于可进行单元测试的逻辑。
- `pnpm test:coverage:changed`: 仅对自 `origin/main` 以来发生变更的文件运行单元覆盖率测试。
- `pnpm test:changed`: 使用 `--changed origin/main` 运行包装器。基础 Vitest 配置会将包装器的清单/配置文件视为 `forceRerunTriggers`，因此在需要时调度器变更仍会广泛重新运行。
- `pnpm test`: 运行完整包装器。它在 git 中只保留一个很小的行为覆盖清单，然后使用一个已提交的时间快照，把测得最慢的单元文件拆分到专用执行通道中。
- 单元文件在包装器中默认使用 `threads`；请将仅 fork 的例外记录在 `test/fixtures/test-parallel.behavior.json` 中。
- `pnpm test:channels` 现在通过 `vitest.channels.config.ts` 默认使用 `threads`；2026 年 3 月 22 日的直接完整套件控制运行在没有渠道特定 fork 例外的情况下干净通过。
- `pnpm test:extensions` 通过包装器运行，并在 `test/fixtures/test-parallel.behavior.json` 中保留已记录的扩展仅 fork 例外；共享的扩展通道仍默认使用 `threads`。
- `pnpm test:extensions`: 运行扩展/插件套件。
- `pnpm test:perf:imports`: 为包装器启用 Vitest 导入耗时 + 导入拆分报告。
- `pnpm test:perf:imports:changed`: 同样的导入性能分析，但仅针对自 `origin/main` 以来发生变更的文件。
- `pnpm test:perf:profile:main`: 为 Vitest 主线程写入 CPU profile（`.artifacts/vitest-main-profile`）。
- `pnpm test:perf:profile:runner`: 为单元运行器写入 CPU + heap profile（`.artifacts/vitest-runner-profile`）。
- `pnpm test:perf:update-timings`: 刷新 `scripts/test-parallel.mjs` 使用的已提交慢文件时间快照。
- Gateway 集成：可通过 `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway` 选择启用。
- `pnpm test:e2e`: 运行 gateway 端到端冒烟测试（多实例 WS/HTTP/node 配对）。在 `vitest.e2e.config.ts` 中默认使用 `forks` + 自适应 worker；可通过 `OPENCLAW_E2E_WORKERS=<n>` 调整，并设置 `OPENCLAW_E2E_VERBOSE=1` 输出详细日志。
- `pnpm test:live`: 运行 provider live 测试（minimax/zai）。需要 API 密钥以及 `LIVE=1`（或 provider 特定的 `*_LIVE_TEST=1`）才能取消跳过。
- `pnpm test:docker:openwebui`: 启动 Docker 化的 OpenClaw + Open WebUI，通过 Open WebUI 登录，检查 `/api/models`，然后通过 `/api/chat/completions` 运行一次真实的代理聊天。需要可用的 live 模型密钥（例如在 `~/.profile` 中配置 OpenAI），会拉取外部 Open WebUI 镜像，并且不应指望它像正常的单元/e2e 套件那样在 CI 中稳定。

## 本地 PR 网关

本地 PR 检查，请运行：

- `pnpm check`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

如果 `pnpm test` 在负载较高的主机上不稳定，先重新运行一次再判断为回归，然后用 `pnpm vitest run <path/to/test>` 进行隔离。对于内存受限的主机，请使用：

- `OPENCLAW_TEST_PROFILE=low OPENCLAW_TEST_SERIAL_GATEWAY=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE=0 pnpm test:changed`

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

- `pnpm tsx scripts/bench-cli-startup.ts`
- `pnpm tsx scripts/bench-cli-startup.ts --runs 12`
- `pnpm tsx scripts/bench-cli-startup.ts --entry dist/entry.js --timeout-ms 45000`

测试以下命令：

- `--version`
- `--help`
- `health --json`
- `status --json`
- `status`

输出包含每个命令的平均值、中位数 (p50)、95 百分位 (p95)、最小/最大值以及退出码/信号分布。

## 入门端到端（Docker）

Docker 是可选的；仅用于容器化的入门冒烟测试。

在干净的 Linux 容器中进行完整的冷启动流程：

```bash
scripts/e2e/onboard-docker.sh
```

此脚本通过伪终端驱动交互式向导，验证配置/工作空间/会话文件，然后启动网关并运行 `openclaw health`。

## QR 导入冒烟测试（Docker）

确保 `qrcode-terminal` 能在支持的 Docker Node 运行环境中加载（默认 Node 24，兼容 Node 22）：

```bash
pnpm test:docker:qr
```
