---
summary: "Docker 支持的 Matrix live QA 运行通道维护者参考：CLI、配置文件、环境变量、场景和输出产物。"
read_when:
  - 在本地运行 pnpm openclaw qa matrix 时
  - 添加或选择 Matrix QA 场景时
  - 排查 Matrix QA 失败、超时或清理卡住时
title: "Matrix QA"
---

Matrix QA 运行通道会在 Docker 中针对一个可丢弃的 Tuwunel homeserver 运行捆绑的 `@openclaw/matrix` 插件，并使用临时的 driver、SUT 和 observer 账户以及预置房间。这是面向 Matrix 的实时传输级真实覆盖。

这是仅限维护者使用的工具。打包后的 OpenClaw 发布版会刻意省略 `qa-lab`，因此 `openclaw qa` 只能从源码检出中使用。源码检出会直接加载捆绑的运行器——无需安装插件步骤。

如需更广泛的 QA 框架背景，请参见 [QA 概览](/concepts/qa-e2e-automation)。

## 快速开始

```bash
pnpm openclaw qa matrix --profile fast --fail-fast
```

直接运行 `pnpm openclaw qa matrix` 会使用 `--profile all`，并且不会在首次失败时停止。发布门禁请使用 `--profile fast --fail-fast`；当并行运行完整清单时，可使用 `--profile transport|media|e2ee-smoke|e2ee-deep|e2ee-cli` 对目录进行分片。

## 该运行通道会做什么

1. 在 Docker 中提供一个可丢弃的 Tuwunel homeserver（默认镜像 `ghcr.io/matrix-construct/tuwunel:v1.5.1`，服务器名 `matrix-qa.test`，端口 `28008`）。
2. 注册三个临时用户——`driver`（发送入站流量）、`sut`（待测的 OpenClaw Matrix 账户）、`observer`（第三方流量捕获）。
3. 为所选场景播种所需房间（主房间、线程、媒体、重启、secondary、allowlist、E2EE、验证 DM 等）。
4. 启动一个子 OpenClaw 网关，在其中仅针对 SUT 账户加载真实的 Matrix 插件；子进程中不会加载 `qa-channel`。
5. 按顺序运行各个场景，通过 driver/observer Matrix 客户端观察事件。
6. 清理 homeserver，写入报告和摘要产物，然后退出。

## CLI

```text
pnpm openclaw qa matrix [options]
```

### 常用标志

| Flag                  | Default                                       | Description                                                                                                            |
| --------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `--profile <profile>` | `all`                                         | 场景配置文件。见 [配置文件](#profiles)。                                                                                 |
| `--fail-fast`         | off                                           | 在首次失败的检查或场景后停止。                                                                                           |
| `--scenario <id>`     | —                                             | 仅运行此场景。可重复使用。见 [场景](#scenarios)。                                                                       |
| `--output-dir <path>` | `<repo>/.artifacts/qa-e2e/matrix-<timestamp>` | 报告、摘要、已观测事件和输出日志的写入位置。相对路径会相对于 `--repo-root` 解析。                                       |
| `--repo-root <path>`  | `process.cwd()`                               | 从中性工作目录调用时的仓库根目录。                                                                                      |
| `--sut-account <id>`  | `sut`                                         | QA 网关配置中的 Matrix 账户 id。                                                                                         |

### 提供方标志

该运行通道使用真实的 Matrix 传输，但模型提供方是可配置的：

| Flag                     | Default          | Description                                                                                                                               |
| ------------------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `--provider-mode <mode>` | `live-frontier`  | `mock-openai` 用于确定性的模拟分发，或 `live-frontier` 用于实时 frontier 提供方。旧别名 `live-openai` 仍然可用。                         |
| `--model <ref>`          | provider default | 主 `provider/model` 引用。                                                                                                                  |
| `--alt-model <ref>`      | provider default | 备用 `provider/model` 引用，在场景中会中途切换。                                                                                            |
| `--fast`                 | off              | 在受支持时启用提供方快速模式。                                                                                                              |

Matrix QA 不接受 `--credential-source` 或 `--credential-role`。该运行通道会在本地提供可丢弃用户；不存在可供租用的共享凭证池。

## 配置文件

所选配置文件决定运行哪些场景。

| Profile         | Use it for                                                                                                                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `all` (default) | 完整目录。慢但全面。                                                                                                                                                                                                                  |
| `fast`          | 发布门禁子集，覆盖实时传输契约：canary、mention gating、allowlist 阻断、回复形状、重启恢复、线程后续、线程隔离、reaction 观察，以及 exec approval 元数据传递。                                                         |
| `transport`     | 传输级线程、DM、房间、自动加入、mention/allowlist、approval 和 reaction 场景。                                                                                                                                                     |
| `media`         | 图像、音频、视频、PDF、EPUB 附件覆盖。                                                                                                                                                                                               |
| `e2ee-smoke`    | 最小 E2EE 覆盖——基础加密回复、线程后续、bootstrap 成功。                                                                                                                                                                           |
| `e2ee-deep`     | 全面的 E2EE 状态丢失、备份、密钥和恢复场景。                                                                                                                                                                                        |
| `e2ee-cli`      | 通过 QA harness 驱动的 `openclaw matrix encryption setup` 和 `verify *` CLI 场景。                                                                                                                                                  |

确切映射位于 `extensions/qa-matrix/src/runners/contract/scenario-catalog.ts`。

## 场景

完整的场景 id 列表是 `extensions/qa-matrix/src/runners/contract/scenario-catalog.ts:15` 中的 `MatrixQaScenarioId` 联合类型。类别包括：

- threading — `matrix-thread-*`, `matrix-subagent-thread-spawn`
- top-level / DM / room — `matrix-top-level-reply-shape`, `matrix-room-*`, `matrix-dm-*`
- streaming and tool progress — `matrix-room-partial-streaming-preview`, `matrix-room-quiet-streaming-preview`, `matrix-room-tool-progress-*`, `matrix-room-block-streaming`
- media — `matrix-media-type-coverage`, `matrix-room-image-understanding-attachment`, `matrix-attachment-only-ignored`, `matrix-unsupported-media-safe`
- routing — `matrix-room-autojoin-invite`, `matrix-secondary-room-*`
- reactions — `matrix-reaction-*`
- approvals — `matrix-approval-*`（exec/plugin 元数据、分块回退、拒绝 reaction、线程，以及 `target: "both"` 路由）
- restart and replay — `matrix-restart-*`, `matrix-stale-sync-replay-dedupe`, `matrix-room-membership-loss`, `matrix-homeserver-restart-resume`, `matrix-initial-catchup-then-incremental`
- mention gating, bot-to-bot, and allowlists — `matrix-mention-*`, `matrix-allowbots-*`, `matrix-allowlist-*`, `matrix-multi-actor-ordering`, `matrix-inbound-edit-*`, `matrix-mxid-prefixed-command-block`, `matrix-observer-allowlist-override`
- E2EE — `matrix-e2ee-*`（基础回复、线程后续、bootstrap、恢复密钥生命周期、状态丢失变体、服务器备份行为、设备卫生、SAS / QR / DM 验证、重启、产物脱敏）
- E2EE CLI — `matrix-e2ee-cli-*`（加密设置、幂等设置、bootstrap 失败、恢复密钥生命周期、多账户、网关回复往返、自我验证）

传入 `--scenario <id>`（可重复）可运行手动挑选的一组；与 `--profile all` 结合使用可忽略配置文件门控。

## 环境变量

| Variable                                | Default                                   | Effect                                                                                                                                                                                         |
| --------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_QA_MATRIX_TIMEOUT_MS`         | `1800000` (30 min)                        | 整个运行的硬性上限。                                                                                                                                                                           |
| `OPENCLAW_QA_MATRIX_CANARY_TIMEOUT_MS`  | `45000`                                   | 初始 canary 回复的上限。发布 CI 会在共享运行器上提高该值，以避免较慢的首次网关轮次在场景覆盖开始前就失败。                                                                                  |
| `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS` | `8000`                                    | 负向无回复断言的静默窗口。会被限制为 `≤` 运行超时。                                                                                                                                           |
| `OPENCLAW_QA_MATRIX_CLEANUP_TIMEOUT_MS` | `90000`                                   | Docker 清理的上限。失败提示会包含恢复用的 `docker compose ... down --remove-orphans` 命令。                                                                                                  |
| `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE`      | `ghcr.io/matrix-construct/tuwunel:v1.5.1` | 在针对不同的 Tuwunel 版本进行验证时覆盖 homeserver 镜像。                                                                                                                                    |
| `OPENCLAW_QA_MATRIX_PROGRESS`           | on                                        | `0` 会静音 stderr 上的 `[matrix-qa] ...` 进度行。`1` 会强制开启。                                                                                                                             |
| `OPENCLAW_QA_MATRIX_CAPTURE_CONTENT`    | redacted                                  | `1` 会在 `matrix-qa-observed-events.json` 中保留消息正文和 `formatted_body`。默认会进行脱敏以确保 CI 产物安全。                                                                                |
| `OPENCLAW_QA_MATRIX_DISABLE_FORCE_EXIT` | off                                       | `1` 会在产物写入后跳过确定性的 `process.exit`。默认会强制退出，因为 matrix-js-sdk 的原生加密句柄可能会让事件循环在产物完成后仍保持存活。                                                    |
| `OPENCLAW_RUN_NODE_OUTPUT_LOG`          | unset                                     | 当由外层启动器（例如 `scripts/run-node.mjs`）设置时，Matrix QA 会复用该日志路径，而不是启动自己的 tee。                                                                                       |

## 输出制品

写入到 `--output-dir`：

- `matrix-qa-report.md` — Markdown 协议报告（哪些通过、失败、被跳过，以及原因）。
- `matrix-qa-summary.json` — 适合 CI 解析和仪表板使用的结构化摘要。
- `matrix-qa-observed-events.json` — 来自驱动和观察者客户端的观测到的 Matrix 事件。除非 `OPENCLAW_QA_MATRIX_CAPTURE_CONTENT=1`，否则消息正文会被脱敏；审批元数据会使用选定的安全字段进行摘要，并截断命令预览。
- `matrix-qa-output.log` — 本次运行的合并 stdout/stderr。如果设置了 `OPENCLAW_RUN_NODE_OUTPUT_LOG`，则会改用外层启动器的日志。

默认输出目录为 `<repo>/.artifacts/qa-e2e/matrix-<timestamp>`，因此连续运行不会相互覆盖。

## 排查提示

- **运行在接近结束时卡住：** `matrix-js-sdk` 的原生加密句柄可能会比测试框架存活更久。默认会在生成制品后强制执行干净的 `process.exit`；如果你取消设置了 `OPENCLAW_QA_MATRIX_DISABLE_FORCE_EXIT=1`，则应预期进程会继续挂起一段时间。
- **清理错误：** 查找打印出的恢复命令（一个 `docker compose ... down --remove-orphans` 调用）并手动运行它，以释放 homeserver 端口。
- **CI 中不稳定的负向断言窗口：** 当 CI 很快时，降低 `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS`（默认 8 s）；当共享运行器较慢时，提高该值。
- **需要用于 bug 报告的脱敏正文：** 使用 `OPENCLAW_QA_MATRIX_CAPTURE_CONTENT=1` 重新运行，并附上 `matrix-qa-observed-events.json`。请将生成的制品视为敏感内容。
- **不同的 Tuwunel 版本：** 将 `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE` 指向正在测试的版本。该 lane 仅检查固定的默认镜像。

## 实时传输契约

Matrix 是三个实时传输 lane 之一（Matrix、Telegram、Discord），它们共享在 [QA 概览 → 实时传输覆盖](/concepts/qa-e2e-automation#live-transport-coverage) 中定义的单一契约检查清单。`qa-channel` 仍然是更广泛的合成测试套件，并且有意不属于该矩阵的一部分。

## 相关内容

- [QA 概览](/concepts/qa-e2e-automation) — 整体 QA 栈和实时传输契约
- [QA Channel](/channels/qa-channel) — 用于基于仓库场景的合成频道适配器
- [测试](/help/testing) — 运行测试并添加 QA 覆盖
- [Matrix](/channels/matrix) — 正在测试的频道插件
