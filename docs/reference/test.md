---
summary: "如何在本地运行测试（vitest）以及何时使用 force/coverage 模式"
read_when:
  - 运行或修复测试时
title: "测试"
---

- 完整测试工具包（套件、实时、Docker）：[测试](/help/testing)
- 更新和插件包验证：[测试更新和插件](/help/testing-updates-plugins)

## Agent default

代理会话通过 Crabbox 远程运行测试和计算密集型验证。受信任维护者代码默认使用 Blacksmith Testbox。已配置的 Testbox 工作流会获取凭据，因此不受信任的贡献者或 fork 代码必须使用无密钥的 fork CI，或使用经过清理的直接 AWS Crabbox。

当受信任的代码任务很可能需要测试或大量验证时，立即在后台命令会话中预热，在其完成 hydration 的同时继续工作，复用返回的 `tbx_...` id，每次运行都同步当前检出，并在交接前停止它：

```bash
node scripts/crabbox-wrapper.mjs warmup --provider blacksmith-testbox --keep --timing-json
```

下面的本地测试命令仅适用于人工工作流，或用户明确要求的代理回退。必须报告远程提供商不可用的情况；不能默默地在本地运行大范围门禁。

对于不受信任的代码，使用 `--provider aws` 预热。每次运行都必须设置 `CRABBOX_ENV_ALLOW=CI`，传入 `--provider aws --no-hydrate`，并在安装依赖或运行测试之前使用新的临时远程 `HOME`。为该不受信任来源使用新预热的专用租约；绝不要复用受信任的或之前已 hydrated 的租约。必须从干净的受信任 `main` 检出中启动已安装的受信任 Crabbox 二进制，并且只使用 `--fresh-pr` 获取远程 PR；绝不要在本地执行不受信任检出中的包装器或配置。取消设置 `CRABBOX_AWS_INSTANCE_PROFILE`，并在未解析出 `aws.instanceProfile` 为空时直接失败。 在任何安装/测试之前，使用受信任的绝对路径工具要求 IMDSv2 token，证明 IAM 凭据端点返回 404，并验证远程 `git rev-parse HEAD` 等于完整审查过的 PR head SHA。将租约绑定到该 SHA，并在 head 变更时停止/重新预热。与 `--fresh-pr` 一起，从干净的 `main` 上传受信任的 `scripts/crabbox-untrusted-bootstrap.sh`；它会安装固定版本的 Node/pnpm，验证 SHA 和包管理器 pin，隔离 `HOME`，安装依赖，然后执行所请求的测试。如果 broker 不能证明不存在 role 或不存在远程 PR，则使用无密钥的 fork CI。不要使用 `hydrate-github`、`--no-sync`，或带有凭据 hydration 的 Testbox 工作流。

取消设置所有 `CRABBOX_TAILSCALE*` 覆盖项，强制使用 `--network public --tailscale=false`，清除 exit-node/LAN 标志，并要求 `crabbox inspect` 在上传任何脚本之前报告公共网络且没有 Tailscale 状态。

## 常规本地顺序

1. 对于已变更范围的 Vitest 证明，使用 `pnpm test:changed`。
2. 对于单个文件、目录或显式目标，使用 `pnpm test <path-or-filter>`。
3. 仅当你有意需要完整的本地 Vitest 测试套件时，才使用 `pnpm test`。

在 Codex worktree 或链接/稀疏检出中，代理应避免直接本地运行
`pnpm test*` / `pnpm check*` / `pnpm crabbox:run`：

- 针对一个很小文件、且明确由用户要求的本地回退：
  `node scripts/run-vitest.mjs <path-or-filter>`。
- 变更门禁或广泛证明：`node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox ... -- env OPENCLAW_CHECK_CHANGED_REMOTE_CHILD=1 OPENCLAW_CHANGED_LANES_RAW_SYNC=1 corepack pnpm check:changed`，这样 pnpm 会在 Testbox 内运行。
- wrapper 最终的 `exitCode` 和计时 JSON 就是命令结果。一次委派的 Blacksmith GitHub Actions 运行在 SSH 命令成功后可能显示 `cancelled`，因为 Testbox 会从 keepalive action 外部被停止；在将其视为失败之前，请先检查 wrapper 摘要和命令输出。
- `OPENCLAW_HEAVY_CHECK_LOCK_SCOPE=worktree <local-heavy-check command>`：将 heavy-check 的串行化保持在当前 worktree 内，而不是 Git common dir 中，适用于诸如 `pnpm check:changed` 和有针对性的 `pnpm test ...` 等命令。仅在高容量本地主机上、且你有意在链接的 worktree 之间运行独立检查时使用它。

## 核心命令

测试包装器运行结束时会输出一条简短的 `[test] passed|failed|skipped ... in ...` 汇总；Vitest 自己的耗时行仍然保留为每个分片的详细信息。

| 命令                                           | 作用                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test`                                       | 明确的文件/目录目标会路由到受范围限制的 Vitest 通道。未指定目标的运行会进行整套测试验证：固定的分片组会展开为叶子级配置以便本地并行执行，启动前会打印出预期的分片扇出。扩展组始终会展开为按扩展划分的分片配置，而不是一个巨大的根项目进程。 |
| `pnpm test:changed`                               | 轻量智能变更测试运行：来自直接测试编辑的精确目标、同级 `*.test.ts` 文件、显式源映射以及本地导入图。除非它们能映射到精确测试，否则会跳过较大的/配置/包变更。                                                                                                                     |
| `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` | 显式的宽松变更测试运行；当测试脚手架/配置/包的编辑应回退到 Vitest 更宽泛的变更测试行为时使用。                                                                                                                                                                                                              |
| `pnpm test:force`                                 | 释放已配置的 OpenClaw 网关端口（默认 `18789`），然后使用隔离的网关端口运行完整套件，这样服务器测试就不会与正在运行的实例冲突。                                                                                                                                                                          |
| `pnpm test:coverage`                              | 带 V8 覆盖率的单元测试套件（`vitest.unit.config.ts`）。这是默认单元通道的门禁，而不是整个仓库的覆盖率：`coverage.all` 为 `false`，阈值为 lines/functions/statements 70%，branches 55%，范围限定为带有同级源文件的非快速单元测试。                                                                                           |
| `pnpm test:coverage:changed`                      | 仅针对自 `origin/main` 以来变更的文件进行单元覆盖率测试。                                                                                                                                                                                                                                                                                             |
| `pnpm changed:lanes`                              | 显示相对于 `origin/main` 的 diff 所触发的架构通道。                                                                                                                                                                                                                                                                            |
| `pnpm check:changed`                              | 默认情况下在 CI 之外委托给 Crabbox/Testbox，然后在远程子进程内运行智能变更检查门禁：受影响通道的类型检查、lint 和 guard 命令。不运行 Vitest；如需测试验证，请使用 `pnpm test:changed` 或 `pnpm test <target>`。                                                                                      |

## 共享测试状态和进程辅助工具

- `src/test-utils/openclaw-test-state.ts`：当测试需要隔离的 `HOME`、`OPENCLAW_STATE_DIR`、`OPENCLAW_CONFIG_PATH`、配置夹具、工作区、代理目录或 auth-profile 存储时，在 Vitest 中使用。
- `pnpm test:env-mutations:report`：对直接修改 `HOME`、`OPENCLAW_STATE_DIR`、`OPENCLAW_CONFIG_PATH`、`OPENCLAW_WORKSPACE_DIR` 或相关环境键的测试/测试框架进行非阻塞报告。用它来查找适合迁移到共享测试状态辅助工具的候选项。
- `test/helpers/openclaw-test-instance.ts`：适用于需要在一个地方完成运行中的 Gateway、CLI 环境、日志捕获和清理的进程级 E2E 测试。
- 源自 `scripts/lib/docker-e2e-image.sh` 的 Docker/Bash E2E 任务可以将 `docker_e2e_test_state_shell_b64 <label> <scenario>` 传入容器，并使用 `scripts/lib/openclaw-e2e-instance.sh` 对其解码；多 home 脚本可以传递 `docker_e2e_test_state_function_b64`，并在每个流程中调用 `openclaw_test_state_create <label> <scenario>`。`node scripts/lib/openclaw-test-state.mjs -- create --label <name> --scenario <name> --env-file <path> --json` 会写入一个可被 source 的宿主环境文件（`create` 前的 `--` 可防止较新的 Node 运行时将 `--env-file` 视为 Node 标志）。启动 Gateway 的任务可以源自 `scripts/lib/openclaw-e2e-instance.sh`，以获取入口点解析、模拟 OpenAI 启动、前台/后台启动、就绪探测、状态环境导出、日志转储以及进程清理。

## Control UI、TUI 和扩展通道

- **Control UI 模拟 E2E：** `pnpm test:ui:e2e` 运行 Vitest + Playwright 通道，启动 Vite Control UI，并针对模拟的 Gateway WebSocket 驱动一个真实的 Chromium 页面。测试位于 `ui/src/**/*.e2e.test.ts`；共享的 mocks/controls 位于 `ui/src/test-helpers/control-ui-e2e.ts`。`pnpm test:e2e` 包含此通道。Agent 运行默认使用 Testbox/Crabbox，包括定向 proof；仅在明确需要本地回退时才使用 `node scripts/run-vitest.mjs run --config test/vitest/vitest.ui-e2e.config.ts --configLoader runner ui/src/ui/e2e/chat-flow.e2e.test.ts`。
- **TUI PTY 测试：** `node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts` 运行快速的 fake-backend PTY 通道。`OPENCLAW_TUI_PTY_INCLUDE_LOCAL=1` 或 `pnpm tui:pty:test:watch --mode local` 运行较慢的 `tui --local` smoke 测试，它只模拟外部模型端点。断言稳定的可见文本或 fixture 调用，而不是原始 ANSI 快照。
- `pnpm test:extensions` 和 `pnpm test extensions` 运行所有扩展/plugin 分片。重型通道插件、浏览器插件和 OpenAI 作为独立分片运行；其他插件组保持批量执行。`pnpm test extensions/<id>` 运行一个打包好的插件通道。
- 具有同级测试的源文件会优先映射到该同级测试，然后再回退到更宽泛的目录 glob。`src/channels/plugins/contracts/test-helpers`、`src/plugin-sdk/test-helpers` 和 `src/plugins/contracts` 下的辅助文件编辑会使用本地 import 图来运行导入它们的测试，而不是在依赖路径足够精确时广泛运行所有分片。
- `auto-reply` 分拆为三个独立配置（`core`、`top-level`、`reply`），这样 reply harness 就不会压过更轻量的 top-level status/token/helper 测试。
- 选定的 `plugin-sdk` 和 `commands` 测试文件会通过专用的轻量通道路由，这些通道只保留 `test/setup.ts`，而将运行时开销大的用例留在它们现有的通道上。
- 基础 Vitest 配置默认 `pool: "threads"` 且 `isolate: false`，并在整个仓库配置中启用共享的非隔离 runner。
- `pnpm test:channels` 运行 `vitest.channels.config.ts`。

## 网关和 E2E

- 网关集成是可选启用的：`OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway`。
- `pnpm test:e2e`：仓库 E2E 汇总 = `pnpm test:e2e:gateway && pnpm test:ui:e2e`。
- `pnpm test:e2e:gateway`：网关端到端冒烟测试（多实例 WS/HTTP/node 配对）。默认使用 `threads` + `isolate: false`，并在 `vitest.e2e.config.ts` 中采用自适应 workers；可通过 `OPENCLAW_E2E_WORKERS=<n>` 调整，通过 `OPENCLAW_E2E_VERBOSE=1` 输出详细日志。
- `pnpm test:live`：提供商联机测试（Claude/Minimax/DeepSeek/z.ai 等，由 `*.live.test.ts` 进行门控）。需要 API 密钥和 `LIVE=1`（或 `OPENCLAW_LIVE_TEST=1`）才能取消跳过；通过 `OPENCLAW_LIVE_TEST_QUIET=0` 输出详细信息。

## 完整 Docker 套件（`pnpm test:docker:all`）

构建共享的 live-test 镜像，将 OpenClaw 仅打包一次为 npm tarball，构建/复用一个裸 Node/Git 运行器镜像以及一个功能镜像（将该 tarball 安装到 `/app`），然后通过加权调度器运行 Docker 冒烟测试通道。`scripts/package-openclaw-for-docker.mjs` 是本地/CI 唯一的打包器，并会在 Docker 消费该包之前验证 tarball 以及 `dist/postinstall-inventory.json`。

- 裸镜像（`OPENCLAW_DOCKER_E2E_BARE_IMAGE`）：安装器/更新/插件依赖通道；挂载预构建的 tarball，而不是复制仓库源码。
- 功能镜像（`OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`）：正常的已构建应用功能通道。
- 通道定义：`scripts/lib/docker-e2e-scenarios.mjs`。规划器：`scripts/lib/docker-e2e-plan.mjs`。执行器：`scripts/test-docker-all.mjs`。
- `node scripts/test-docker-all.mjs --plan-json` 会输出由调度器拥有的 CI 计划（通道、镜像类型、包/直播镜像需求、状态场景、凭据检查），而不会构建或运行 Docker。

调度参数（环境变量，括号内为默认值）：

| 环境变量                                                                                                         | 默认值              | 用途                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`                                                                               | 10                  | 进程槽位。                                                                                                                                                                                                                                                                             |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM`                                                                          | 10                  | 与提供者敏感的尾部池。                                                                                                                                                                                                                                                              |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`                                                                                | 9                   | 重型 live-provider 通道上限。                                                                                                                                                                                                                                                              |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`                                                                                 | 5                   | npm 资源通道上限。                                                                                                                                                                                                                                                                     |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`                                                                             | 7                   | 服务资源通道上限。                                                                                                                                                                                                                                                                 |
| `OPENCLAW_DOCKER_ALL_LIVE_CLAUDE_LIMIT` / `_CODEX_LIMIT` / `_GEMINI_LIMIT` / `_DROID_LIMIT` / `_OPENCODE_LIMIT` | 4                   | 按提供者划分的重型通道上限。                                                                                                                                                                                                                                                              |
| `OPENCLAW_DOCKER_ALL_LIVE_OPENAI_LIMIT` / `_TELEGRAM_LIMIT`                                                     | 1                   | 更窄的按提供者上限。                                                                                                                                                                                                                                                                |
| `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` / `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`                                         | -                   | 用于更大主机的覆盖设置。                                                                                                                                                                                                                                                                 |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS`                                                                          | 2000                | 通道启动之间的延迟，避免本地 Docker 守护进程创建风暴。                                                                                                                                                                                                                       |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`                                                                           | 7,200,000（120 分钟） | 每个通道的兜底超时；选中的 live/tail 通道使用更紧的上限。                                                                                                                                                                                                                      |
| `OPENCLAW_DOCKER_ALL_LIVE_RETRIES`                                                                              | 1                   | 针对临时性 live-provider 失败的重试次数。                                                                                                                                                                                                                                              |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`                                                                                   | 关闭                | 输出通道清单而不运行 Docker。                                                                                                                                                                                                                                            |
| `OPENCLAW_DOCKER_ALL_STATUS_INTERVAL_MS`                                                                        | 30000               | 活动通道状态打印间隔。                                                                                                                                                                                                                                                         |
| `OPENCLAW_DOCKER_ALL_TIMINGS`                                                                                   | 开启                | 复用 `.artifacts/docker-tests/lane-timings.json` 以按最长优先顺序排序；设为 `0` 可禁用。                                                                                                                                                                                       |
| `OPENCLAW_DOCKER_ALL_LIVE_MODE`                                                                                 | -                   | `skip` 表示仅确定性/本地通道，`only` 表示仅 live-provider 通道。别名：`pnpm test:docker:local:all`、`pnpm test:docker:live:all`。仅 live 模式会将主 live 通道和尾部 live 通道合并为一个按最长优先排序的池，从而让提供者桶将 Claude/Codex/Gemini 工作打包在一起。 |
| `OPENCLAW_LIVE_CLI_BACKEND_SETUP_TIMEOUT_SECONDS`                                                               | 180                 | CLI 后端 Docker 设置超时。                                                                                                                                                                                                                                                          |

资源上限的环境变量模式为 `OPENCLAW_DOCKER_ALL_<RESOURCE>_LIMIT`（资源名转为大写，非字母数字字符折叠为 `_`）。

其他行为：运行器默认会预检 Docker，清理过期的 OpenClaw E2E 容器，在兼容通道之间共享提供者 CLI 工具缓存，并且在首次失败后停止调度新的池化通道，除非设置了 `OPENCLAW_DOCKER_ALL_FAIL_FAST=0`。如果某个通道在低并行度主机上超过了有效的权重/资源上限，它仍然可以从空池启动，并单独运行直到释放容量。每个通道的日志、`summary.json`、`failures.json` 和阶段计时都会写入 `.artifacts/docker-tests/<run-id>/`；使用 `pnpm test:docker:timings <summary.json>` 查看慢通道，并使用 `pnpm test:docker:rerun <run-id|summary.json|failures.json>` 打印低成本的定向重跑命令。

### 值得注意的 Docker 通道

| 命令                                                                     | 验证内容                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test:docker:browser-cdp-snapshot`                                     | 基于 Chromium 的源 E2E 容器，带原始 CDP + 隔离 Gateway；`browser doctor --deep` 的 CDP 角色快照包含链接 URL、鼠标指针高亮的可点击项、iframe 引用以及帧元数据。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `pnpm test:docker:skill-install`                                            | 在裸 Docker 运行器中安装已打包的 tarball，使用 `skills.install.allowUploadedArchives: false`，从实时 ClawHub 搜索中解析当前 skill slug，通过 `openclaw skills install` 安装，并验证 `SKILL.md`、`.clawhub/origin.json`、`.clawhub/lock.json` 以及 `skills info --json`。                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `pnpm test:docker:live-cli-backend:claude`, `:claude:resume`, `:claude:mcp` | 聚焦的 CLI 后端 live 探测；Gemini 也有对应的 `:resume` 和 `:mcp` 别名。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `pnpm test:docker:openwebui`                                                | 容器化的 OpenClaw + Open WebUI：登录、检查 `/api/models`，并通过 `/api/chat/completions` 运行一次真实的代理聊天。需要可用的 live 模型密钥，并会拉取外部镜像；不指望像单元/e2e 套件那样保持 CI 稳定。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `pnpm test:docker:mcp-channels`                                             | 预置的 Gateway 容器加上一个启动 `openclaw mcp serve` 的客户端容器：路由对话发现、转录读取、附件元数据、实时事件队列行为、出站发送路由，以及通过真实 stdio 桥的 Claude 风格通道 + 权限通知（断言直接读取原始 stdio MCP 帧）。                                                                                                                                                                                                                                                                                                                                                                                                               |
| `pnpm test:docker:upgrade-survivor`                                         | 在一个脏旧用户 fixture 上安装已打包的 tarball，运行 package update 以及非交互式 doctor，不使用 live provider/channel 密钥，启动一个回环 Gateway，检查 agents/channel 配置/plugin allowlists/workspace/session 文件/陈旧的旧版插件依赖状态/启动/RPC 状态是否得以保留。                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `pnpm test:docker:published-upgrade-survivor`                               | 默认安装 `openclaw@latest`，准备真实的现有用户文件，通过预置的 `openclaw config set` 配方进行配置，更新到已打包的 tarball，运行非交互式 doctor，写入 `.artifacts/upgrade-survivor/summary.json`，检查 `/healthz`、`/readyz`、RPC 状态。可通过 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 覆盖，使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` 扩展矩阵，或通过 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=reported-issues` 添加场景 fixture（包含 `configured-plugin-installs` 和 `stale-source-plugin-shadow`）。Package Acceptance 将这些暴露为 `published_upgrade_survivor_baseline(s)` / `_scenarios`，并解析诸如 `last-stable-4` 或 `all-since-2026.4.23` 之类的元 token。 |
| `pnpm test:docker:update-migration`                                         | `plugin-deps-cleanup` 场景中的 published-upgrade survivor 运行器，默认从 `openclaw@2026.4.23` 开始。`Update Migration` 工作流会将其扩展为 `baselines=all-since-2026.4.23`，以证明在 Full Release CI 之外的已配置插件依赖清理。                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `pnpm test:docker:plugins`                                                  | 本地路径、`file:`、带提升依赖的 npm registry 包、git 移动引用、ClawHub fixture、marketplace 更新，以及 Claude-bundle 启用/检查的安装/更新冒烟测试。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

## 本地 PR 门禁

对于本地 PR 合入/门禁检查，运行：

- `pnpm check:changed`
- `pnpm check`
- `pnpm check:test-types`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

如果 `pnpm test` 在负载较高的主机上出现偶发失败，在将其视为回归之前先重跑一次，然后使用 `pnpm test <path/to/test>` 进行隔离。对于内存受限的主机：

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## 测试性能工具

- `pnpm test:perf:imports`：启用 Vitest 的导入耗时 + 导入拆解报告，同时仍然对显式文件/目录目标使用分组通道路由。`pnpm test:perf:imports:changed` 会将相同的性能分析范围限定到自 `origin/main` 以来发生变更的文件。
- `pnpm test:perf:changed:bench -- --ref <git-ref>`：将路由后的 changed 模式路径与同一已提交 git diff 的原生 root-project 运行进行基准测试；`pnpm test:perf:changed:bench -- --worktree` 则在不先提交的情况下，对当前工作区变更集进行基准测试。
- `pnpm test:perf:profile:main` 会为 Vitest 主线程写入 CPU 配置文件（`.artifacts/vitest-main-profile`）；`pnpm test:perf:profile:runner` 会为单元测试运行器写入 CPU + 堆配置文件（`.artifacts/vitest-runner-profile`）。
- `pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json`：串行运行每个 full-suite Vitest 叶子配置，并写入分组耗时数据以及每个配置的 JSON/日志工件。Full-suite 报告默认会隔离文件，因此来自更早文件的保留模块图和 GC 暂停不会计入后续断言；仅在有意分析共享 worker 累积时才传入 `-- --no-isolate`。Test Performance Agent 会在尝试修复慢测试之前，将其作为基线。`pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json` 用于比较一次以性能为重点的更改之后的分组报告。
- Full、extension 和 include-pattern 分片运行会更新 `.artifacts/vitest-shard-timings.json` 中的本地计时数据；后续的 whole-config 运行会使用这些计时数据来平衡慢分片和快分片。Include-pattern CI 分片会将分片名称附加到计时键中，这样在不替换 whole-config 计时数据的情况下，过滤后的分片计时仍然可见。将 `OPENCLAW_TEST_PROJECTS_TIMINGS=0` 设置为忽略本地计时工件。

## 基准测试

<Accordion title="模型延迟（scripts/bench-model.ts）">

```bash
pnpm tsx scripts/bench-model.ts --runs 10
```

可选环境变量：`MINIMAX_API_KEY`、`MINIMAX_BASE_URL`、`MINIMAX_MODEL`、`ANTHROPIC_API_KEY`。默认提示词："Reply with a single word: ok. No punctuation or extra text."

</Accordion>

<Accordion title="CLI 启动（scripts/bench-cli-startup.ts）">

```bash
pnpm test:startup:bench
pnpm test:startup:bench:smoke
pnpm test:startup:bench:save
pnpm test:startup:bench:update
pnpm test:startup:bench:check
pnpm tsx scripts/bench-cli-startup.ts --runs 12
pnpm tsx scripts/bench-cli-startup.ts --preset real --case status --case gatewayStatus --runs 3
pnpm tsx scripts/bench-cli-startup.ts --entry openclaw.mjs --entry-secondary dist/entry.js --preset all
```

预设：

- `startup`: `--version`、`--help`、`health`、`health --json`、`status --json`、`status`
- `real`: `health`、`status`、`status --json`、`sessions`、`sessions --json`、`tasks --json`、`tasks list --json`、`tasks audit --json`、`agents list --json`、`gateway status`、`gateway status --json`、`gateway health --json`、`config get gateway.port`
- `all`: 两个预设合并

输出包括 `sampleCount`、avg、p50、p95、min/max、退出码/信号分布，以及每个命令的最大 RSS。`--cpu-prof-dir` / `--heap-prof-dir` 会为每次运行写入 V8 配置文件。

保存的输出：`pnpm test:startup:bench:smoke` 会写入 `.artifacts/cli-startup-bench-smoke.json`；`pnpm test:startup:bench:save` 会写入 `.artifacts/cli-startup-bench-all.json`（`runs=5 warmup=1`）。纳入仓库的 fixture：`test/fixtures/cli-startup-bench.json`，可通过 `pnpm test:startup:bench:update` 刷新，并由 `pnpm test:startup:bench:check` 比较。

</Accordion>

<Accordion title="网关启动（scripts/bench-gateway-startup.ts）">

默认使用构建后的 CLI 入口 `dist/entry.js`；请先运行 `pnpm build`。传入 `--entry scripts/run-node.mjs` 可改为测量源码运行器，并请将这些结果与构建后入口的基线分开保存。

```bash
pnpm test:startup:gateway -- --runs 5 --warmup 1
pnpm test:startup:gateway -- --case skipChannels --case fiftyPlugins --runs 5
node --import tsx scripts/bench-gateway-startup.ts --case default --runs 5 --output .artifacts/gateway-startup.json
```

案例 id：`default`、`skipChannels`（跳过通道启动）、`oneInternalHook`、`allInternalHooks`、`fiftyPlugins`（50 个 manifest 插件）、`fiftyStartupLazyPlugins`（50 个 startup-lazy manifest 插件）。

输出包括首次进程输出、`/healthz`、`/readyz`、HTTP 监听日志时间、Gateway 就绪日志时间、CPU 时间、CPU 核心占比、最大 RSS、堆、启动跟踪指标、事件循环延迟，以及插件查找表细节指标。脚本会在子 Gateway 环境中设置 `OPENCLAW_GATEWAY_STARTUP_TRACE=1`。

`/healthz` 表示存活状态（HTTP 服务器可以响应）。`/readyz` 表示可用就绪状态（启动插件 sidecar、通道，以及 ready-critical 的 post-attach 工作都已稳定）。启动钩子是异步分发的，不属于就绪性保证的一部分。就绪日志时间是 Gateway 的内部时间戳，适合做进程侧归因，但不能替代外部 `/readyz` 探测。

在比较变更时请使用 JSON 输出或 `--output`。仅当跟踪输出表明存在导入、编译或 CPU 密集型工作，而仅靠阶段时间无法解释时，才使用 `--cpu-prof-dir`。

</Accordion>

<Accordion title="网关重启（scripts/bench-gateway-restart.ts）">

仅限 macOS 和 Linux（使用 SIGUSR1 进行进程内重启；在 Windows 上会立即失败）。与上面的网关启动相同，默认使用构建后的入口，并可通过 `--entry scripts/run-node.mjs` 覆盖。

```bash
pnpm test:restart:gateway -- --case skipChannels --runs 1 --restarts 5
pnpm test:restart:gateway -- --case default --runs 3 --restarts 3 --warmup 1
```

案例 id：`skipChannels`、`skipChannelsAcpxProbe`（开启 ACPX 启动探针）、`skipChannelsNoAcpxProbe`（关闭探针）、`default`、`fiftyPlugins`。

输出包括下一次 `/healthz`、下一次 `/readyz`、停机时间、重启就绪时间、CPU、RSS、替换进程的启动跟踪指标，以及关于信号处理、活动工作项清理、关闭阶段、下一次启动、就绪时间和内存快照的重启跟踪指标。脚本会设置 `OPENCLAW_GATEWAY_STARTUP_TRACE=1` 和 `OPENCLAW_GATEWAY_RESTART_TRACE=1`。

当变更涉及重启信号、关闭处理器、重启后的启动、sidecar 关闭、服务切换，或重启后的就绪性时，请使用此基准。先从 `skipChannels` 开始，以将 Gateway 机制与通道启动隔离开；只有在这个窄场景解释清楚重启路径之后，才使用 `default` 或插件密集型案例。跟踪指标只是归因线索，不是最终裁决——判断重启变更时，应综合多次样本、匹配的 owner span、`/healthz`/`/readyz` 行为，以及用户可见的重启契约。

</Accordion>

## 入门 E2E（Docker）

可选；仅在容器化入门冒烟测试时需要。在干净的 Linux 容器中执行完整的冷启动流程：

```bash
scripts/e2e/onboard-docker.sh
```

通过伪终端驱动交互式向导，验证配置/工作区/会话文件，然后启动网关并运行 `openclaw health`。

## QR 导入 smoke（Docker）

确保维护的 QR 运行时辅助工具在受支持的 Docker Node 运行时下加载正常（Node 24 默认，Node 22 兼容）：

```bash
pnpm test:docker:qr
```

## 相关内容

- [测试](/help/testing)
- [测试实战](/help/testing-live)
- [测试更新和插件](/help/testing-updates-plugins)
