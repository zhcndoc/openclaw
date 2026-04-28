---
summary: "Docker 支持的 Matrix 实时 QA 车道的维护者参考：CLI、配置文件、环境变量、场景和输出工件。"
read_when:
  - 本地运行 pnpm openclaw qa matrix
  - 添加或选择 Matrix QA 场景
  - 排查 Matrix QA 失败、超时或卡在清理阶段的问题
title: "Matrix QA"
---

Matrix QA 车道会在 Docker 中针对一个可丢弃的 Tuwunel homeserver 运行捆绑的 `@openclaw/matrix` 插件，配有临时的 driver、SUT 和 observer 账户，以及已预置的房间。这是 Matrix 的实时传输级真实覆盖。

这是仅限维护者使用的工具。打包后的 OpenClaw 发布版会刻意省略 `qa-lab`，因此 `openclaw qa` 只能从源码检出中使用。源码检出会直接加载捆绑的运行器——不需要插件安装步骤。

如需更广泛的 QA 框架上下文，请参阅 [QA 概览](/concepts/qa-e2e-automation)。

## 快速开始

```bash
pnpm openclaw qa matrix --profile fast --fail-fast
```

直接运行 `pnpm openclaw qa matrix` 会使用 `--profile all`，并且不会在首次失败时停止。将 `--profile fast --fail-fast` 用作发布门禁；当并行运行完整清单时，可使用 `--profile transport|media|e2ee-smoke|e2ee-deep|e2ee-cli` 对目录进行分片。

## 该车道做什么

1. 在 Docker 中提供一个可丢弃的 Tuwunel homeserver（默认镜像 `ghcr.io/matrix-construct/tuwunel:v1.5.1`，服务器名 `matrix-qa.test`，端口 `28008`）。
2. 注册三个临时用户——`driver`（发送入站流量）、`sut`（被测试的 OpenClaw Matrix 账户）、`observer`（第三方流量捕获）。
3. 为所选场景预置所需房间（主房间、线程、媒体、重启、次级、白名单、E2EE、验证 DM 等）。
4. 启动一个子 OpenClaw 网关，为 SUT 账户限定并加载真实的 Matrix 插件；子进程中不会加载 `qa-channel`。
5. 按顺序运行场景，通过 driver/observer Matrix 客户端观察事件。
6. 拆除 homeserver，写入报告和摘要工件，然后退出。

## CLI

```text
pnpm openclaw qa matrix [options]
```

### 常用标志

| Flag                  | Default                                       | Description                                                                                                            |
| --------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `--profile <profile>` | `all`                                         | 场景配置文件。参见 [配置文件](#profiles)。                                                                           |
| `--fail-fast`         | off                                           | 在第一个失败的检查或场景后停止。                                                                                       |
| `--scenario <id>`     | —                                             | 仅运行此场景。可重复。参见 [场景](#scenarios)。                                                                       |
| `--output-dir <path>` | `<repo>/.artifacts/qa-e2e/matrix-<timestamp>` | 报告、摘要、观测到的事件以及输出日志的写入位置。相对路径会基于 `--repo-root` 解析。                                     |
| `--repo-root <path>`  | `process.cwd()`                               | 从中性工作目录调用时的仓库根目录。                                                                                    |
| `--sut-account <id>`  | `sut`                                         | QA 网关配置中的 Matrix 账户 id。                                                                                       |

### 提供方标志

该车道使用真实的 Matrix 传输，但模型提供方是可配置的：

| Flag                     | Default          | Description                                                                                                                               |
| ------------------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `--provider-mode <mode>` | `live-frontier`  | `mock-openai` 用于确定性的模拟分发，或 `live-frontier` 用于实时 frontier 提供方。旧别名 `live-openai` 仍然可用。                         |
| `--model <ref>`          | provider default | 主 `provider/model` 引用。                                                                                                                |
| `--alt-model <ref>`      | provider default | 备用 `provider/model` 引用，在场景运行中会切换到它。                                                                                      |
| `--fast`                 | off              | 在受支持时启用提供方快速模式。                                                                                                             |

Matrix QA 不接受 `--credential-source` 或 `--credential-role`。该车道会在本地提供可丢弃的用户；不存在可供租用的共享凭据池。

## 配置文件

所选配置文件决定运行哪些场景。

| Profile         | Use it for                                                                                                                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `all` (default) | 完整目录。较慢但最全面。                                                                                                                                                                        |
| `fast`          | 发布门禁子集，覆盖实时传输契约：canary、mention gating、allowlist block、reply shape、restart resume、thread follow-up、thread isolation、reaction observation。 |
| `transport`     | 传输级线程、DM、房间、autojoin、mention/allowlist 场景。                                                                                                                                    |
| `media`         | 图片、音频、视频、PDF、EPUB 附件覆盖。                                                                                                                                                         |
| `e2ee-smoke`    | 最小 E2EE 覆盖——基本加密回复、线程跟进、bootstrap 成功。                                                                                                                                      |
| `e2ee-deep`     | 全面的 E2EE 状态丢失、备份、密钥和恢复场景。                                                                                                                                                  |
| `e2ee-cli`      | 通过 QA 运行器驱动的 `openclaw matrix encryption setup` 和 `verify *` CLI 场景。                                                                                                              |

确切映射位于 `extensions/qa-matrix/src/runners/contract/scenario-catalog.ts`。

## 场景

完整的场景 id 列表是 `extensions/qa-matrix/src/runners/contract/scenario-catalog.ts:15` 中的 `MatrixQaScenarioId` 联合类型。类别包括：

- threading — `matrix-thread-*`, `matrix-subagent-thread-spawn`
- top-level / DM / room — `matrix-top-level-reply-shape`, `matrix-room-*`, `matrix-dm-*`
- streaming and tool progress — `matrix-room-partial-streaming-preview`, `matrix-room-quiet-streaming-preview`, `matrix-room-tool-progress-*`, `matrix-room-block-streaming`
- media — `matrix-media-type-coverage`, `matrix-room-image-understanding-attachment`, `matrix-attachment-only-ignored`, `matrix-unsupported-media-safe`
- routing — `matrix-room-autojoin-invite`, `matrix-secondary-room-*`
- reactions — `matrix-reaction-*`
- restart and replay — `matrix-restart-*`, `matrix-stale-sync-replay-dedupe`, `matrix-room-membership-loss`, `matrix-homeserver-restart-resume`, `matrix-initial-catchup-then-incremental`
- mention gating and allowlists — `matrix-mention-*`, `matrix-allowlist-*`, `matrix-multi-actor-ordering`, `matrix-inbound-edit-*`, `matrix-mxid-prefixed-command-block`, `matrix-observer-allowlist-override`
- E2EE — `matrix-e2ee-*`（基本回复、线程跟进、bootstrap、恢复密钥生命周期、状态丢失变体、服务器备份行为、设备卫生、SAS / QR / DM 验证、重启、工件脱敏）
- E2EE CLI — `matrix-e2ee-cli-*`（加密设置、幂等设置、bootstrap 失败、恢复密钥生命周期、多账户、网关回复往返、自验证）

传入 `--scenario <id>`（可重复）可运行手动挑选的一组；与 `--profile all` 结合可忽略配置文件门控。

## 环境变量

| Variable                                | Default                                   | Effect                                                                                                                                                                                         |
| --------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_QA_MATRIX_TIMEOUT_MS`         | `1800000` (30 min)                        | 整个运行过程的硬上限。                                                                                                                                                                        |
| `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS` | `8000`                                    | 用于负向无回复断言的静默窗口。会被钳制到 `≤` 运行超时。                                                                                                                                         |
| `OPENCLAW_QA_MATRIX_CLEANUP_TIMEOUT_MS` | `90000`                                   | Docker 拆除的上限。失败信息会包含恢复用的 `docker compose ... down --remove-orphans` 命令。                                                                                                    |
| `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE`      | `ghcr.io/matrix-construct/tuwunel:v1.5.1` | 在针对不同的 Tuwunel 版本进行验证时覆盖 homeserver 镜像。                                                                                                                                     |
| `OPENCLAW_QA_MATRIX_PROGRESS`           | on                                        | `0` 会静默 stderr 上的 `[matrix-qa] ...` 进度行。`1` 会强制显示它们。                                                                                                                          |
| `OPENCLAW_QA_MATRIX_CAPTURE_CONTENT`    | redacted                                  | `1` 会在 `matrix-qa-observed-events.json` 中保留消息正文和 `formatted_body`。默认会进行脱敏以保证 CI 工件安全。                                                                                |
| `OPENCLAW_QA_MATRIX_DISABLE_FORCE_EXIT` | off                                       | `1` 会在写入工件后跳过确定性的 `process.exit`。默认会强制退出，因为 matrix-js-sdk 的原生加密句柄可能会让事件循环在工件完成后仍然保持存活。                                                     |
| `OPENCLAW_RUN_NODE_OUTPUT_LOG`          | unset                                     | 当由外部启动器（例如 `scripts/run-node.mjs`）设置时，Matrix QA 会复用该日志路径，而不是启动自己的 tee。                                                                                         |

## 输出工件

写入到 `--output-dir`：

- `matrix-qa-report.md` — Markdown 协议报告（哪些通过、失败、被跳过，以及原因）。
- `matrix-qa-summary.json` — 适用于 CI 解析和仪表盘的结构化摘要。
- `matrix-qa-observed-events.json` — 来自驱动程序和观察者客户端的已观察 Matrix 事件。除非设置 `OPENCLAW_QA_MATRIX_CAPTURE_CONTENT=1`，否则消息正文会被去除。
- `matrix-qa-output.log` — 本次运行的合并 stdout/stderr。若设置了 `OPENCLAW_RUN_NODE_OUTPUT_LOG`，则改用外部启动器的日志。

默认输出目录为 `<repo>/.artifacts/qa-e2e/matrix-<timestamp>`，因此连续运行不会相互覆盖。

## 排查提示

- **运行接近结束时卡住：** `matrix-js-sdk` 的原生加密句柄可能会比测试框架存活更久。默认会在工件写入后强制执行 `process.exit`；如果你取消设置了 `OPENCLAW_QA_MATRIX_DISABLE_FORCE_EXIT=1`，请预期进程会继续滞留。
- **清理错误：** 查找打印出的恢复命令（一个 `docker compose ... down --remove-orphans` 调用）并手动运行，以释放 homeserver 端口。
- **CI 中不稳定的负断言窗口：** 当 CI 很快时，降低 `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS`（默认 8 秒）；在较慢的共享运行器上则提高它。
- **需要用于 bug 报告的已去除内容正文：** 使用 `OPENCLAW_QA_MATRIX_CAPTURE_CONTENT=1` 重新运行，并附上 `matrix-qa-observed-events.json`。请将生成的工件视为敏感信息。
- **不同的 Tuwunel 版本：** 将 `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE` 指向正在测试的版本。该测试线仅检查固定的默认镜像。

## 实时传输契约

Matrix 是三条实时传输通道之一（Matrix、Telegram、Discord），它们共享在 [QA 概览 → 实时传输覆盖](/concepts/qa-e2e-automation#live-transport-coverage) 中定义的单一契约检查清单。`qa-channel` 仍然是更广泛的合成测试套件，并且有意不包含在该矩阵中。

## 相关

- [QA 概览](/concepts/qa-e2e-automation) — 整体 QA 栈和实时传输契约
- [QA Channel](/channels/qa-channel) — 用于仓库支持场景的合成频道适配器
- [测试](/help/testing) — 运行测试和添加 QA 覆盖
- [Matrix](/channels/matrix) — 正在测试的频道插件
