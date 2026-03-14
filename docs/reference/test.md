---
summary: "如何在本地运行测试（vitest）以及何时使用 force/coverage 模式"
read_when:
  - 运行或修复测试时
title: "测试"
---

# 测试

- 完整测试套件（套件，实时，Docker）：[测试](/help/testing)

- `pnpm test:force`：终止任何占用默认控制端口的残留网关进程，然后使用独立的网关端口运行完整的 Vitest 测试套件，防止服务器测试与正在运行的实例冲突。当之前的网关运行导致端口 18789 被占用时使用此命令。
- `pnpm test:coverage`：运行带 V8 覆盖率的单元测试套件（通过 `vitest.unit.config.ts`）。全局阈值为 70% 的行／分支／函数／语句覆盖率。覆盖范围排除集成密集的入口点（CLI 接线、网关／Telegram 桥接、Webchat 静态服务器），以保持目标集中在可单元测试的逻辑上。
- 在 Node 22、23 和 24 上，`pnpm test` 默认使用 Vitest 的 `vmForks` 以加快启动速度。Node 25+ 则回退到 `forks`，直到重新验证。可以通过设置 `OPENCLAW_TEST_VM_FORKS=0|1` 强制指定行为。
- `pnpm test`：默认运行快速的核心单元测试，用于快速本地反馈。
- `pnpm test:channels`：运行频道密集的测试套件。
- `pnpm test:extensions`：运行扩展／插件测试套件。
- 网关集成：通过 `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway` 选择性启用。
- `pnpm test:e2e`：运行网关端到端冒烟测试（多实例 WS/HTTP/节点配对）。默认使用 `vitest.e2e.config.ts` 中的 `vmForks` + 自适应工作线程；可通过 `OPENCLAW_E2E_WORKERS=<n>` 调整，并设置 `OPENCLAW_E2E_VERBOSE=1` 开启详细日志。
- `pnpm test:live`：运行提供者实时测试（minimax/zai）。需要 API 密钥和 `LIVE=1`（或提供者特定的 `*_LIVE_TEST=1`）以取消跳过测试。

## 本地 PR 网关

本地 PR 检查，请运行：

- `pnpm check`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

如果 `pnpm test` 在负载较高的主机上不稳定，先重新运行一次再判断为回归，然后用 `pnpm vitest run <path/to/test>` 进行隔离。对于内存受限的主机，请使用：

- `OPENCLAW_TEST_PROFILE=low OPENCLAW_TEST_SERIAL_GATEWAY=1 pnpm test`

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
