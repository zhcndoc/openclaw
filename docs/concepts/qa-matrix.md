---
summary: "Docker 支持的 Matrix live QA 运行通道维护者参考：CLI、配置文件、环境变量、场景和输出产物。"
read_when:
  - 在本地运行 pnpm openclaw qa matrix 时
  - 添加或选择 Matrix QA 场景时
  - 排查 Matrix QA 失败、超时或清理卡住时
title: "Matrix QA"
---

Matrix QA 运行通道会在 Docker 中针对一个可丢弃的 Tuwunel homeserver 运行捆绑的 `@openclaw/matrix` 插件，并使用临时的 driver、SUT 和 observer 账户以及预置房间。这是面向 Matrix 的实时传输级真实覆盖。

仅限维护者使用的工具。打包发布的 Openclaw 版本会省略 `qa-lab`，因此 `openclaw qa` 只能在源代码检出版本中运行，并且会直接加载内置运行器，不需要插件安装步骤。

如需更广泛的 QA 框架背景，请参见 [QA 概览](/concepts/qa-e2e-automation)。

## 快速开始

```bash
pnpm openclaw qa matrix --profile fast --fail-fast
```

普通的 `pnpm openclaw qa matrix` 会运行 `--profile all`，并且不会在首次失败时停止。使用 `--profile transport|media|e2ee-smoke|e2ee-deep|e2ee-cli` 将完整清单分片分配到并行任务中。

## 该运行通道会做什么

1. 在 Docker 中预配一个一次性的 Tuwunel homeserver（默认镜像 `ghcr.io/matrix-construct/tuwunel:v1.5.1`，服务器名 `matrix-qa.test`，端口 `28008`），并置于一个带边界的、会进行脱敏的请求/响应记录器之后。
2. 注册三个临时用户：`driver`（发送入站流量）、`sut`（被测的 OpenClaw Matrix 账号）、`observer`（第三方流量捕获）。
3. 为所选场景创建所需房间（主场景、线程、媒体、重启、辅助、允许名单、E2EE、验证私聊等）。
4. 针对已记录的 Tuwunel 边界运行与底层无关的 `matrix-qa-v1` 协议探针。单元测试用 Matrix 协议 fixture 证明探针契约；[#99707](https://github.com/openclaw/openclaw/pull/99707) 中的规范 QA 传输适配器主机负责真实 Crabline 目标接线。
5. 启动一个子级 OpenClaw 网关，使用真实的 Matrix 插件，并限定于 SUT 账号范围内。
6. 按顺序运行各个场景，通过 driver/observer 的 Matrix 客户端观察事件，并根据已记录的流量推导路由/状态预期。
7. 清理 homeserver，写入报告和证据工件，然后退出。

## CLI

```text
pnpm openclaw qa matrix [options]
```

### 常用标志

| Flag                  | Default                                       | Description                                                                                                                                   |
| --------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `--profile <profile>` | `all`                                         | 场景配置文件。参见 [Profiles](#profiles)。                                                                                                  |
| `--fail-fast`         | off                                           | 在第一次检查或场景失败后停止。                                                                                                                |
| `--scenario <id>`     | -                                             | 仅运行此场景。可重复使用。参见 [Scenarios](#scenarios)。                                                                                     |
| `--output-dir <path>` | `<repo>/.artifacts/qa-e2e/matrix-<timestamp>` | 报告、摘要、路由/状态清单、观测到的事件以及输出日志的写入位置。相对路径会相对于 `--repo-root` 解析。                                           |
| `--repo-root <path>`  | `process.cwd()`                               | 当从中立工作目录调用时的仓库根目录。                                                                                                          |
| `--sut-account <id>`  | `sut`                                         | QA 网关配置中的 Matrix 账户 id。                                                                                                             |

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

| Profile         | 适用场景                                                                                                                                                                                                            |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `all` (default) | 完整目录。速度较慢，但内容全面。                                                                                                                                                                                     |
| `fast`          | 适用于发布门禁的子集，用于验证命令式实时传输契约：提及门禁、allowlist 阻止、回复格式、重启恢复、reaction 观察、exec 审批元数据传递，以及 E2EE 基础回复。 |
| `transport`     | 传输层级的线程、DM、房间、自动加入、提及/allowlist、审批和 reaction 场景。                                                                                                                   |
| `media`         | 图片、音频、视频、PDF、EPUB 附件覆盖。                                                                                                                                                                   |
| `e2ee-smoke`    | 最小化 E2EE 覆盖：基础加密回复、线程跟进、启动成功。                                                                                                                                    |
| `e2ee-deep`     | 全面的 E2EE 状态丢失、备份、密钥和恢复场景。                                                                                                                                                      |
| `e2ee-cli`      | 通过 QA harness 驱动的 `openclaw matrix encryption setup` 和 `verify *` CLI 场景。                                                                                                                        |

确切映射位于 `extensions/qa-matrix/src/runners/contract/scenario-catalog.ts`。

## 场景

共享的 Matrix 适配器通过 `openclaw qa suite --channel-driver live --channel matrix` 暴露以下规范化 YAML 场景：

- `channel-chat-baseline`
- `thread-follow-up`
- `thread-isolation`
- `thread-reply-override`
- `dm-shared-session`
- `dm-per-room-session`

`subagent-thread-spawn` 仍可通过显式的 `--scenario subagent-thread-spawn`
选择来使用，但在 live 子完成证明稳定之前，它不属于默认的共享 Matrix 集合。

其余的命令式场景 id 列表是 `extensions/qa-matrix/src/runners/contract/scenario-catalog.ts` 中的 `MatrixQaScenarioId` 联合类型。分类如下：

- 线程：`matrix-thread-root-preservation`、`matrix-thread-nested-reply-shape`
- 顶层 / DM / 房间：`matrix-top-level-reply-shape`、`matrix-room-*`、`matrix-dm-*`
- 流式与工具进度：`matrix-room-partial-streaming-preview`、`matrix-room-quiet-streaming-preview`、`matrix-room-tool-progress-*`、`matrix-room-block-streaming`
- 媒体：`matrix-media-type-coverage`、`matrix-room-image-understanding-attachment`、`matrix-attachment-only-ignored`、`matrix-unsupported-media-safe`
- 路由：`matrix-room-autojoin-invite`、`matrix-secondary-room-*`
- 反应：`matrix-reaction-*`
- 审批：`matrix-approval-*`（exec/plugin 元数据、分块回退、拒绝反应、线程，以及 `target: "both"` 路由）
- 重启与回放：`matrix-restart-*`、`matrix-stale-sync-replay-dedupe`、`matrix-room-membership-loss`、`matrix-homeserver-restart-resume`、`matrix-initial-catchup-then-incremental`
- 提及门控、bot 对 bot，以及允许列表：`matrix-mention-*`、`matrix-allowbots-*`、`matrix-allowlist-*`、`matrix-multi-actor-ordering`、`matrix-inbound-edit-*`、`matrix-mxid-prefixed-command-block`、`matrix-observer-allowlist-override`
- E2EE：`matrix-e2ee-*`（基础回复、线程后续、引导、恢复密钥生命周期、状态丢失变体、服务器备份行为、设备卫生、SAS / QR / DM 验证、重启、制品清理）
- E2EE CLI：`matrix-e2ee-cli-*`（加密设置、幂等设置、引导失败、恢复密钥生命周期、多账号、gateway-reply 往返、自我验证）

传入 `--scenario <id>`（可重复）可运行手动挑选的一组；与 `--profile all` 结合使用可忽略配置文件门控。

## 环境变量

| 变量                                | 默认                                   | 影响                                                                                                                                                                                         |
| --------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_QA_MATRIX_TIMEOUT_MS`         | `1800000` (30 分钟)                        | 整个运行过程的硬上限。                                                                                                                                                            |
| `OPENCLAW_QA_MATRIX_CANARY_TIMEOUT_MS`  | `45000`                                   | 初始金丝雀回复的上限。发布 CI 会在共享运行器上提高该值，这样较慢的首次网关轮次也不会在场景覆盖开始前失败。                                       |
| `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS` | `8000`                                    | 用于负向无回复断言的静默窗口。会被限制为 `<=` 运行超时。                                                                                                                |
| `OPENCLAW_QA_MATRIX_CLEANUP_TIMEOUT_MS` | `90000`                                   | Docker 清理的上限。失败时会显示恢复用的 `docker compose ... down --remove-orphans` 命令。                                                                           |
| `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE`      | `ghcr.io/matrix-construct/tuwunel:v1.5.1` | 在验证不同的 Tuwunel 版本时覆盖 homeserver 镜像。                                                                                                             |
| `OPENCLAW_QA_MATRIX_PROGRESS`           | 开启                                        | `0` 会在 stderr 上静默 `[matrix-qa] ...` 进度行。`1` 会强制显示。                                                                                                                   |
| `OPENCLAW_QA_MATRIX_CAPTURE_CONTENT`    | 已脱敏                                  | `1` 会在 `matrix-qa-observed-events.json` 中保留消息正文和 `formatted_body`。默认会脱敏以确保 CI 产物安全。                                                                    |
| `OPENCLAW_QA_MATRIX_DISABLE_FORCE_EXIT` | 关闭                                       | `1` 会跳过在产物写入后的确定性 `process.exit`。默认会强制退出，因为 matrix-js-sdk 的原生加密句柄可能会让事件循环在产物完成后仍保持活跃。 |
| `OPENCLAW_RUN_NODE_OUTPUT_LOG`          | 未设置                                     | 当由外部启动器（例如 `scripts/run-node.mjs`）设置时，Matrix QA 会复用该日志路径，而不是启动自己的 tee。                                                                   |

## 输出制品

写入 `--output-dir`（默认 `<repo>/.artifacts/qa-e2e/matrix-<timestamp>`，因此连续运行不会相互覆盖）：

- `matrix-qa-report.md`：Markdown 协议报告（哪些通过、哪些失败、哪些被跳过，以及原因）。
- `matrix-qa-summary.json`：适用于 CI 解析和仪表盘的结构化摘要。
- `matrix-qa-route-state-manifest.json`：按场景 ID 键控的动态 `matrix-qa-v1` 清单。它记录了已脱敏的路由/主体形状、请求顺序、观察到的重试、错误、同步令牌连续性，以及该次运行中观察到的设备/密钥/媒体/备份状态族。这是可执行证据，而不是提交到仓库中的基线。
- `matrix-qa-observed-events.json`：来自驱动程序和观察者客户端的已观察 Matrix 事件。除非 `OPENCLAW_QA_MATRIX_CAPTURE_CONTENT=1`，否则正文会被脱敏；审批元数据会使用选定的安全字段和截断的命令预览进行摘要。
- `matrix-qa-output.log`：本次运行的 stdout/stderr 合并输出。如果设置了 `OPENCLAW_RUN_NODE_OUTPUT_LOG`，则改用外层启动器的日志。

## 排查提示

- **运行在接近结束时挂起：** `matrix-js-sdk` 原生加密句柄可能会比测试框架存活更久。默认情况下会在写入工件后强制 `process.exit`；如果你设置 `OPENCLAW_QA_MATRIX_DISABLE_FORCE_EXIT=1`，请预期进程会继续挂起一段时间。
- **清理错误：** 查找打印出的恢复命令（一个 `docker compose ... down --remove-orphans` 调用），并手动运行它以释放 homeserver 端口。
- **CI 中脆弱的负断言窗口：** 当 CI 很快时，调低 `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS`（默认 8 秒）；在较慢的共享运行器上则调高它。
- **需要为 bug 报告提供已脱敏的正文：** 使用 `OPENCLAW_QA_MATRIX_CAPTURE_CONTENT=1` 重新运行，并附上 `matrix-qa-observed-events.json`。请将生成的工件视为敏感内容。
- **不同的 Tuwunel 版本：** 将 `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE` 指向正在测试的版本。该 lane 只检查固定的默认镜像。

## 实时传输契约

Matrix 是三条实时传输通道之一（Matrix、Telegram、Discord），它们共享在 [QA 概览：实时传输覆盖](/concepts/qa-e2e-automation#live-transport-coverage) 中定义的单一契约检查清单。`qa-channel` 仍然是更广泛的合成测试套件，并且有意不包含在该矩阵中。

## 相关内容

- [QA 概览](/concepts/qa-e2e-automation): 整体 QA 技术栈和实时传输契约
- [QA Channel](/channels/qa-channel): 面向仓库支持场景的合成通道适配器
- [测试](/help/testing): 运行测试并添加 QA 覆盖
- [Matrix](/channels/matrix): 正在测试的通道插件
