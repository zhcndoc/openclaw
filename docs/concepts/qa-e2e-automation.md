---
summary: "QA 堆栈概览：qa-lab、qa-channel、基于仓库的场景、实时传输通道、传输适配器和报告。"
read_when:
  - 了解 QA 堆栈如何协同工作
  - 扩展 qa-lab、qa-channel 或传输适配器
  - 添加基于仓库的 QA 场景
  - 围绕 Gateway 仪表板构建更高真实性的 QA 自动化
title: "QA 概览"
---

私有 QA 堆栈以一种更贴近真实、面向通道的方式对 OpenClaw 进行测试，这是
单元测试无法做到的。

组成部分：

- `extensions/qa-channel`：合成消息通道，提供 DM、channel、thread、
  reaction、edit 和 delete 等表面。
- `extensions/qa-lab`：用于观察转录、注入入站消息并导出 Markdown 报告的调试器 UI 和 QA 总线。
- `extensions/qa-matrix`：实时传输适配器，在子 QA 网关中驱动真正的 Matrix
  插件。
- `qa/`：用于 kickoff 任务和基线 QA 场景的基于仓库的种子资产。
- [Mantis](/concepts/mantis)：针对需要真实传输、浏览器截图、VM 状态和 PR 证据的 bug，
  提供前后对比的实时验证。

## 命令面

每个 QA 流程都在 `pnpm openclaw qa <subcommand>` 下运行。许多流程都有 `pnpm qa:*`
脚本别名；两种形式都可用。

| 命令                                             | 用途                                                                                                                                                                                                                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qa run`                                            | 不带 `--qa-profile` 的打包 QA 自检；基于 taxonomy 的成熟度配置文件运行器，支持 `--qa-profile smoke-ci`、`--qa-profile release` 或 `--qa-profile all`。                                                                                                  |
| `qa suite`                                          | 针对 QA gateway lane 运行 repo-backed 场景。`--runner multipass` 会使用一次性 Linux VM，而不是宿主机。                                                                                                                                         |
| `qa coverage`                                       | 打印 YAML 场景覆盖清单（`--json` 用于机器输出；`--match <query>` 用于查找触及某个行为的场景；`--tools` 用于运行时工具 fixture 覆盖）。                                                                                  |
| `qa parity-report`                                  | 比较两个 `qa-suite-summary.json` 文件以进行模型轴 parity gate，或使用 `--runtime-axis --token-efficiency` 生成 Codex 与 OpenClaw 的运行时 parity 和 token-efficiency 报告。                                                                          |
| `qa confidence-report`                              | 将 QA 证明工件与清单进行比对，生成一个 zero-unknown confidence 报告。                                                                                                                                                                               |
| `qa confidence-self-test`                           | 写入带种子的负对照 canary，证明 confidence gate 能检测到漂移。                                                                                                                                                                                   |
| `qa jsonl-replay`                                   | 通过运行时 parity replay harness 重放精心挑选的 JSONL 转录。                                                                                                                                                                                         |
| `qa character-eval`                                 | 在多个在线模型上运行 character QA 场景，并生成判定报告。参见 [Reporting](#reporting)。                                                                                                                                                        |
| `qa manual`                                         | 针对所选 provider/model lane 运行一次性提示。                                                                                                                                                                                                      |
| `qa ui`                                             | 启动 QA debugger UI 和本地 QA bus（别名：`pnpm qa:lab:ui`）。                                                                                                                                                                                                |
| `qa docker-build-image`                             | 构建预烘焙的 QA Docker 镜像。                                                                                                                                                                                                                                 |
| `qa docker-scaffold`                                | 为 QA dashboard + gateway lane 生成 docker-compose 脚手架。                                                                                                                                                                                                |
| `qa up`                                             | 构建 QA 站点，启动由 Docker 支持的栈，打印 URL（别名：`pnpm qa:lab:up`；`:fast` 变体会添加 `--use-prebuilt-image --bind-ui-dist --skip-ui-build`）。                                                                                              |
| `qa aimock`                                         | 仅启动 AIMock provider server。                                                                                                                                                                                                                              |
| `qa mock-openai`                                    | 仅启动具备场景感知的 `mock-openai` provider server。                                                                                                                                                                                                        |
| `qa credentials doctor` / `add` / `list` / `remove` | 管理共享的 Convex 凭据池。                                                                                                                                                                                                                           |
| `qa discord`                                        | 面向真实私有 Discord guild channel 的 live transport lane。                                                                                                                                                                                                   |
| `qa matrix`                                         | 面向一次性 Tuwunel homeserver 的 live transport lane。参见 [Matrix QA](/concepts/qa-matrix)。                                                                                                                                                                  |
| `qa slack`                                          | 面向真实私有 Slack channel 的 live transport lane。                                                                                                                                                                                                           |
| `qa telegram`                                       | 面向真实私有 Telegram group 的 live transport lane。                                                                                                                                                                                                          |
| `qa whatsapp`                                       | 面向真实 WhatsApp Web accounts 的 live transport lane。                                                                                                                                                                                                             |
| `qa mantis`                                         | 用于 live transport bugs 的前后验证运行器，包含 Discord 状态反应证据、Crabbox desktop/browser smoke，以及 Slack-in-VNC smoke。参见 [Mantis](/concepts/mantis) 和 [Mantis Slack Desktop Runbook](/concepts/mantis-slack-desktop-runbook)。 |

`qa matrix` 注册为 runner plugin（`extensions/qa-matrix`）；上面其他所有
lane 都直接内置在 `qa-lab` 中。

### 由 profile 支持的 `qa run`

由 profile 支持的 `qa run` 先从 `taxonomy.yaml` 读取成员关系，然后通过
`qa suite` 分发解析后的场景。`--surface` 和 `--category` 会过滤所选
profile，而不是定义单独的 lane。生成的 `qa-evidence.json` 会包含一份
profile scorecard 摘要，其中包括所选 category 的计数和缺失的 coverage ID；
各个 evidence 条目仍然是测试、coverage roles 和结果的事实来源。Taxonomy feature
coverage ID 是精确的证明目标，而不是别名：主场景 coverage 可满足匹配的 ID，
次级 coverage 仅作参考。Coverage ID 使用带点的 `namespace.behavior` 形式，
各段为小写字母数字/短横线；profile、surface 和 category ID 仍可使用现有的
带短横线或带点的 taxonomy ID。

精简 evidence 会省略每条记录的 `execution`，并设置 `evidenceMode: "slim"`；
`smoke-ci` 默认使用精简模式，而 `--evidence-mode full` 可恢复完整条目：

```bash
pnpm openclaw qa run \
  --qa-profile smoke-ci \
  --category channel-framework.conversation-routing-and-delivery \
  --provider-mode mock-openai \
  --output-dir .artifacts/qa-e2e/smoke-ci-profile-dispatch
```

使用 `smoke-ci` 可获得带 mock 模型 provider 和 Crabline 本地 provider servers 的确定性 profile 证明。使用 `release` 可针对 live channels 进行 Stable/LTS 证明。仅在显式的全 taxonomy evidence 运行时使用 `all`；它会选择所有活跃的成熟度 category，并且可以通过 `QA
Profile Evidence` GitHub Actions workflow 使用 `qa_profile=all` 进行分发。当一个
命令还需要 OpenClaw root profile 时，将 root profile 放在 QA 命令之前：

```bash
pnpm openclaw --profile work qa run --qa-profile smoke-ci
```

## 操作流程

当前的 QA 操作流程是一个双栏 QA 网站：

- 左侧：带有 agent 的 Gateway 仪表盘（控制 UI）。
- 右侧：QA Lab，显示类似 Slack 的转录和场景计划。

运行方式：

```bash
pnpm qa:lab:up
```

这会构建 QA 网站，启动基于 Docker 的 gateway 通道，并打开
QA Lab 页面，供操作员或自动化循环给 agent 下发 QA
任务、观察真实渠道行为，以及记录哪些有效、失败或
仍然受阻。

如果想在每次迭代时避免重新构建 Docker 镜像、从而更快地进行 QA Lab UI 迭代，
可以使用绑定挂载的 QA Lab bundle 启动栈：

```bash
pnpm openclaw qa docker-build-image
pnpm qa:lab:build
pnpm qa:lab:up:fast
pnpm qa:lab:watch
```

`qa:lab:up:fast` 会让 Docker 服务继续使用预构建镜像，并将
`extensions/qa-lab/web/dist` 绑定挂载到 `qa-lab` 容器中。
`qa:lab:watch` 会在变更时重新构建该 bundle，而浏览器会在
QA Lab 资源 hash 变化时自动重载。

### 可观测性烟雾测试

<Note>
可观测性 QA 仅保留源码检出模式。npm tarball 故意
不包含 QA Lab（以及 `qa-channel`/`qa-matrix`），因此包的 Docker 发布通道
不会运行 `qa` 命令。更改诊断埋点时，请在已构建的源码检出环境中运行这些命令。
</Note>

| 别名                                      | 运行内容                                                                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm qa:otel:smoke`                      | 本地 OpenTelemetry receiver 加上启用 `diagnostics-otel` 的 `otel-trace-smoke` 场景。                                                      |
| `pnpm qa:otel:collector-smoke`            | 通过真实 OpenTelemetry Collector Docker 容器运行同一路线。修改端点接线或 collector/OTLP 兼容性时使用。                                         |
| `pnpm qa:prometheus:smoke`                | 启用 `diagnostics-prometheus` 的 `docker-prometheus-smoke` 场景。                                                                            |
| `pnpm qa:observability:smoke`             | 先运行 `qa:otel:smoke`，再运行 `qa:prometheus:smoke`。                                                                                        |
| `pnpm qa:observability:collector-smoke`   | 先运行 `qa:otel:collector-smoke`，再运行 `qa:prometheus:smoke`。                                                                              |

`qa:otel:smoke` 会启动本地 OTLP/HTTP receiver，运行一次最小的 QA-channel
agent 回合，然后断言 traces、metrics 和 logs 都已导出。它会解码
导出的 protobuf trace spans，并检查发布关键的结构：
`openclaw.run`、`openclaw.harness.run`、一个最新的 GenAI semantic-convention
model-call span、`openclaw.context.assembled` 以及 `openclaw.message.delivery`
都必须存在。该烟雾测试会强制设置
`OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`，因此 model-call
span 必须使用 `{gen_ai.operation.name} {gen_ai.request.model}` 这个名称；model
调用成功时不得导出 `StreamAbandoned`；原始诊断
ID 和 `openclaw.content.*` 属性必须不出现在 trace 中。场景
提示会要求模型回复一个固定标记并保留一个固定的秘密字符串不输出；原始 OTLP
payload 中不能包含这两者，也不能包含从场景 id 派生出的 QA
session key。它会将 `otel-smoke-summary.json`
写到 QA 套件产物旁边。

`qa:prometheus:smoke` 会验证未认证的 scrape 会被拒绝，然后
检查已认证的 scrape 是否包含发布关键的 metric family，
同时不包含 prompt 内容、response 内容、原始诊断标识、auth token 或本地路径。

### Matrix 烟雾通道

如果要运行不需要模型提供方凭证、且传输真实的 Matrix 烟雾通道，
请使用带有确定性 mock OpenAI provider 的快速配置：

```bash
OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS=3000 \
  pnpm openclaw qa matrix --provider-mode mock-openai --profile fast --fail-fast
```

如果要运行 live-frontier provider 通道，请显式提供 OpenAI 兼容凭证：

```bash
OPENCLAW_LIVE_OPENAI_KEY="${OPENAI_API_KEY}" \
OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS=3000 \
  pnpm openclaw qa matrix --provider-mode live-frontier --profile fast --fail-fast
```

该通道的完整 CLI 参考、profile/scenario 目录、环境变量和产物
布局见下面的 [Matrix QA](/concepts/qa-matrix)。简而言之：它会
在 Docker 中创建一个一次性的 Tuwunel homeserver，注册临时的
driver/SUT/observer 用户，在一个仅针对该传输的子 QA gateway 中运行真实的
Matrix 插件（不使用 `qa-channel`），然后把 Markdown 报告、JSON 摘要、已观测事件产物
以及合并输出日志写到 `.artifacts/qa-e2e/matrix-<timestamp>/` 下。

这些场景覆盖了单元测试无法端到端证明的传输行为：提及门控、allow-bot 策略、allowlist、顶层和线程回复、DM 路由、reaction 处理、入站编辑抑制、重启回放去重、homeserver 中断恢复、审批元数据传递、媒体处理，以及 Matrix E2EE 启动/恢复/验证流程。E2EE CLI profile 还会在检查 gateway 回复之前，通过同一个一次性 homeserver 驱动 `openclaw matrix encryption setup`
和验证命令。

CI 在
`.github/workflows/qa-live-transports-convex.yml` 中使用同一套命令接口。定时和默认的手动运行会使用 QA 提供的 live-frontier 凭证、`--fast` 以及
`OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS=3000` 执行快速 Matrix profile。手动设置 `matrix_profile=all` 会拆分为五个 profile shard：`transport`、
`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli`。

### Discord Mantis 场景

Discord 也有仅供 Mantis 使用的按需场景，用于 bug 复现。使用
`--scenario discord-status-reactions-tool-only` 可运行明确的状态 reaction 时间线，或者使用
`--scenario discord-thread-reply-filepath-attachment` 创建一个真实的 Discord thread，并验证 `message.thread-reply`
保留了一个 `filePath` 附件。这些场景不会进入默认的 live Discord 通道，因为它们是前/后对比的复现探针，而不是广泛的烟雾覆盖。线程附件的 Mantis 工作流在
`MANTIS_DISCORD_VIEWER_CHROME_PROFILE_DIR` 或
`MANTIS_DISCORD_VIEWER_CHROME_PROFILE_TGZ_B64` 已在 QA 环境中配置时，还可以添加一个已登录的 Discord Web witness 视频。该 viewer profile 仅用于视觉捕获；通过/失败的决定仍然来自 Discord REST oracle。

对于传输真实的 Discord、Slack、Telegram 和 WhatsApp 烟雾通道：

```bash
pnpm openclaw qa discord
pnpm openclaw qa slack
pnpm openclaw qa telegram
pnpm openclaw qa whatsapp
```

它们会针对一个已存在的真实频道，并使用两个 bot 或账号（driver + SUT）。所需环境变量、场景列表、输出产物以及 Convex 凭证池
已在下面的
[Discord、Slack、Telegram 和 WhatsApp QA 参考](#discord-slack-telegram-and-whatsapp-qa-reference)中记录。

### Mantis Slack 桌面与视觉任务运行器

要运行完整的 Slack 桌面 VM 流程并带有 VNC rescue，请运行：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --gateway-setup \
  --scenario slack-canary \
  --keep-lease
```

该命令会租用一台 Crabbox 桌面/浏览器机器，在 VM 内运行 Slack live
通道，在 VNC 浏览器中打开 Slack Web，捕获桌面，并将 `slack-qa/`、
`slack-desktop-smoke.png` 和
`slack-desktop-smoke.mp4`（如果可用视频捕获）复制回
Mantis 产物目录。Crabbox 桌面/浏览器租约会预先提供捕获工具和浏览器/原生构建辅助包，因此该场景
只应在较旧的租约上安装备用方案。Mantis 会在 `mantis-slack-desktop-smoke-report.md` 中报告总耗时和各阶段耗时，
这样慢运行时就能看出时间是花在租约预热、凭证获取、远程设置还是
产物复制上。通过 VNC 手动登录 Slack Web 后，可复用 `--lease-id <cbx_...>`；复用的租约还会保持 Crabbox 的 pnpm store 缓存
热起来。默认的 `--hydrate-mode source` 会从源码检出环境进行验证，并在 VM 内执行 install/build。
只有当复用的远程工作区已经有 `node_modules` 和已构建的 `dist/` 时，才使用 `--hydrate-mode prehydrated`；
该模式会跳过昂贵的 install/build 步骤，并在
工作区未就绪时直接失败。使用 `--gateway-setup` 时，Mantis 会在 VM 内保留一个持续运行的 OpenClaw Slack gateway，监听端口 `38973`；否则，该命令会运行正常的 bot-to-bot Slack QA 通道，并在产物捕获后退出。

为了用桌面证据证明原生 Slack 审批 UI，请运行 Mantis
审批检查点模式：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --approval-checkpoints \
  --credential-source convex \
  --credential-role maintainer
```

该模式与 `--gateway-setup` 互斥。它会运行 Slack
审批场景，拒绝非审批场景 id，在每个待处理和已解决的审批状态处等待，将观测到的 Slack API 消息渲染为
`approval-checkpoints/<scenario>-pending.png` 和
`approval-checkpoints/<scenario>-resolved.png`，然后在任何检查点、消息证据、确认或渲染截图缺失或为空时失败。冷启动的 CI 租约可能仍然会在
`slack-desktop-smoke.png` 中显示 Slack 登录；审批检查点图片则是该通道的视觉证据。

默认的检查点运行会保留两个标准 Slack 审批场景。
如果要捕获任一可选的 Codex 审批路线，请用
`--scenario slack-codex-approval-exec-native` 或
`--scenario slack-codex-approval-plugin-native` 显式选择；Mantis 接受这两种并输出同一对 pending/resolved 截图。运行器会为每个选定的 Codex 路线扩展其检查点和远程命令的截止时间，以便完整的
审批、agent 完成以及已解决更新流程都能完成。

操作员清单、GitHub 工作流触发命令、证据评论契约、hydrate-mode 决策表、耗时解读以及故障处理步骤都在
[Mantis Slack Desktop Runbook](/concepts/mantis-slack-desktop-runbook) 中。

对于 agent/CV 风格的桌面任务，请运行：

```bash
pnpm openclaw qa mantis visual-task \
  --browser-url https://example.net \
  --expect-text "Example Domain" \
  --vision-model openai/gpt-5.6-luna
```

`visual-task` 会租用或复用一台 Crabbox 桌面/浏览器机器，启动
`crabbox record --while`，通过嵌套的 `visual-driver` 驱动可见浏览器，捕获 `visual-task.png`，在选择
`--vision-mode image-describe` 时对截图运行 `openclaw infer image describe`，并写出 `visual-task.mp4`、
`mantis-visual-task-summary.json`、`mantis-visual-task-driver-result.json`，以及
`mantis-visual-task-report.md`。当设置了 `--expect-text` 时，视觉提示会要求结构化 JSON 判定（`visible`、`evidence`、`reason`），且只有当模型报告 `visible: true`
并提供引用预期文本的证据时才算通过；如果 `visible: false` 只是复述目标文本，也仍然会失败。使用 `--vision-mode metadata` 可进行无需模型的烟雾测试，以证明桌面、浏览器、截图和视频
管道正常，而无需调用图像理解提供方。录制是 `visual-task` 的必需产物；如果 Crabbox 没有录到非空的 `visual-task.mp4`，即便视觉驱动通过了，该任务也会失败。在失败时，Mantis 会保留该租约以便通过 VNC 查看，除非任务已经通过且未设置 `--keep-lease`。

### 凭证池健康检查

在使用池化的 live 凭证之前，请运行：

```bash
pnpm openclaw qa credentials doctor
```

doctor 会检查 Convex broker 环境（`OPENCLAW_QA_CONVEX_SITE_URL`、
`OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX`），验证端点设置，仅报告
`OPENCLAW_QA_CONVEX_SECRET_CI` 和
`OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 的已设置/缺失状态，并在 maintainer secret 存在时验证 admin/list 的可达性。

## 实时传输覆盖

实时传输通道共享同一个契约，而不是各自发明自己的场景列表结构。`qa-channel` 是一个更广泛的合成产品行为测试套件，不属于实时传输覆盖矩阵的一部分。

实时传输运行器会从 `openclaw/plugin-sdk/qa-live-transport-scenarios` 导入共享的场景 ID、基线覆盖辅助工具，以及场景选择辅助工具。

| 通道     | Canary | 触发门控 | 机器人对机器人 | 允许列表阻断 | 顶层回复 | 引用回复 | 重启恢复 | 线程后续 | 线程隔离 | 反应观察 | 帮助命令 | 原生命令注册 |
| -------- | ------ | -------- | ---------- | --------------- | --------------- | ----------- | -------------- | ---------------- | ---------------- | -------------------- | ------------ | --------------------------- |
| Discord  | x      | x      | x          |                 |                 |             |                |                  |                  |                      |              | x                           |
| Matrix   | x      | x      | x          | x               | x               |             | x              | x                | x                | x                    |              |                             |
| Slack    | x      | x      | x          | x               | x               |             | x              | x                | x                |                      |              |                             |
| Telegram | x      | x      | x          |                 |                 |             |                |                  |                  |                      | x            |                             |
| WhatsApp | x      | x      |            | x               | x               | x           | x              |                  |                  | x                    | x            |                             |

这使得 `qa-channel` 继续作为更广泛的产品行为套件，而 Matrix、Telegram 以及其他实时传输通道共享一份明确的传输契约检查清单。

对于一个不将 Docker 引入 QA 路径的可丢弃 Linux VM 运行通道，请运行：

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

这会启动一个全新的 Multipass 来宾，安装依赖，在来宾中构建 OpenClaw，运行 `qa suite`，然后将常规 QA 报告和摘要复制回宿主机上的 `.artifacts/qa-e2e/...`。它重用了与宿主机上 `qa suite` 相同的场景选择行为。

宿主机和 Multipass 的 suite 运行默认会并行执行多个选定场景，并使用隔离的网关工作进程。`qa-channel` 默认并发数为 4，并受所选场景数量上限限制。使用 `--concurrency <count>` 调整工作进程数量，或使用 `--concurrency 1` 进行串行执行。使用 `--pack personal-agent` 运行个人助理基准测试包（10 个场景）。包选择器可与重复的 `--scenario` 标志叠加：显式场景先运行，然后按包顺序运行包场景，并去重。使用 `--pack observability` 同时选择 `otel-trace-smoke` 和 `docker-prometheus-smoke` 场景，当自定义 QA 运行器已经提供 OpenTelemetry 收集器设置时。

当任何场景失败时，命令会以非零状态退出。当你想要获取工件但不希望失败导致退出码非零时，请使用 `--allow-failures`。

实时运行会转发对来宾可用且实用的受支持 QA 认证输入：基于环境变量的提供者密钥、QA 实时提供者配置路径，以及存在时的 `CODEX_HOME`。请将 `--output-dir` 保持在仓库根目录下，这样来宾就可以通过挂载的工作区写回。

## Discord、Slack、Telegram 和 WhatsApp QA 参考

Matrix 由于其场景数量以及基于 Docker 的 homeserver 配置，拥有一个[专门页面](/concepts/qa-matrix)。Discord、Slack、Telegram 和 WhatsApp 运行在预先存在的真实传输之上，因此它们的参考内容放在这里。

### 共享 CLI 标志

这些 lane 通过
`extensions/qa-lab/src/live-transports/shared/live-transport-cli.ts` 注册，并
接受相同的标志：

| Flag                                  | Default                                            | Description                                                                                                                                     |
| ------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `--scenario <id>`                     | -                                                  | 仅运行此场景。可重复使用。                                                                                                                        |
| `--output-dir <path>`                 | `<repo>/.artifacts/qa-e2e/<transport>-<timestamp>` | 报告、摘要、证据、传输特定工件以及输出日志的写入位置。相对路径会相对于 `--repo-root` 解析。                                                         |
| `--repo-root <path>`                  | `process.cwd()`                                    | 在从中立 cwd 调用时的仓库根目录。                                                                                                                |
| `--sut-account <id>`                  | `sut`                                              | QA 网关配置中的临时账户 id。                                                                                                                     |
| `--provider-mode <mode>`              | `live-frontier`                                    | `mock-openai` 或 `live-frontier`（旧的 `live-openai` 仍然可用）。                                                                                |
| `--model <ref>` / `--alt-model <ref>` | provider default                                   | 主/备用模型引用。                                                                                                                                |
| `--fast`                              | off                                                | 在支持的情况下启用 provider 快速模式。                                                                                                           |
| `--credential-source <env\|convex>`   | `env`                                              | 参见 [Convex 凭证池](#convex-credential-pool)。                                                                                                  |
| `--credential-role <maintainer\|ci>`  | `ci` in CI, `maintainer` otherwise                 | 当使用 `--credential-source convex` 时所用的角色。                                                                                               |

每个 lane 在任何场景失败时都会以非零状态退出。`--allow-failures` 会在不设置失败退出码的情况下写入
工件。Telegram 还接受 `--list-scenarios` 来打印可用的场景 id 并退出；其他 lane
不暴露该标志。

### Telegram QA

```bash
pnpm openclaw qa telegram
```

目标是一个真实的私有 Telegram 群组，包含两个不同的机器人（driver +
SUT）。SUT 机器人必须具有 Telegram 用户名；当两个机器人都在 `@BotFather`
中启用了 **Bot-to-Bot Communication Mode** 时，机器人之间的观察效果最佳。

在使用 `--credential-source env` 时所需的环境变量：

- `OPENCLAW_QA_TELEGRAM_GROUP_ID` - 数字聊天 ID（字符串）。
- `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`

场景（`extensions/qa-lab/src/live-transports/telegram/telegram-live.runtime.ts`）：

- `telegram-canary`
- `telegram-mention-gating`
- `telegram-mentioned-message-reply`
- `telegram-help-command`
- `telegram-commands-command`
- `telegram-tools-compact-command`
- `telegram-whoami-command`
- `telegram-status-command`
- `telegram-repeated-command-authorization`
- `telegram-other-bot-command-gating`
- `telegram-context-command`
- `telegram-current-session-status-tool`
- `telegram-tool-only-usage-footer`
- `telegram-reply-chain-exact-marker`
- `telegram-stream-final-single-message`
- `telegram-long-final-reuses-preview`
- `telegram-long-final-three-chunks`

隐式默认集始终覆盖 canary、mention gating、原生命令回复、命令定向，
以及机器人之间的群组回复。`mock-openai` 默认还包括确定性的 reply-chain
和 final-message 流式检查。`telegram-current-session-status-tool` 和
`telegram-tool-only-usage-footer` 仍然是可选项：前者只有在紧跟 canary 之后
直接串联时才稳定，后者则是真实 Telegram 环境下对仅工具回复中的 `/usage`
页脚的证明。使用 `pnpm openclaw qa telegram
--list-scenarios --provider-mode mock-openai` 来打印当前默认/可选的拆分以及
回归参考。

输出产物：

- `telegram-qa-report.md`
- `qa-evidence.json` - 直播传输检查的证据条目，包含 profile、coverage、
  provider、channel、artifacts、result 和 RTT 字段。

Package Telegram 运行使用相同的 Telegram 凭证契约。重复 RTT 测量是
package Telegram live lane 的正常组成部分；当下游选择的 RTT 检查时，
RTT 分布会折叠到 `qa-evidence.json` 的 `result.timing` 下。

```bash
OPENCLAW_QA_CREDENTIAL_SOURCE=convex \
pnpm test:docker:npm-telegram-live
```

当设置了 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` 时，package live wrapper 会
租用一个 `kind: "telegram"` 凭证，将租用到的 group/driver/SUT bot 环境变量
导出到已安装包的运行中，维持租约心跳，并在关闭时释放它。package wrapper
默认对 `telegram-mentioned-message-reply` 执行 20 次 RTT 检测，RTT 超时时间
为 30s，并且在选择了 Convex 时，CI 之外默认使用 Convex 角色 `maintainer`。
可通过覆盖 `OPENCLAW_NPM_TELEGRAM_RTT_SAMPLES`、
`OPENCLAW_NPM_TELEGRAM_RTT_TIMEOUT_MS` 或 `OPENCLAW_NPM_TELEGRAM_RTT_MAX_FAILURES`
来调整 RTT 测量，而无需创建单独的 RTT 命令或 Telegram 特定的摘要格式。

### Discord QA

```bash
pnpm openclaw qa discord
```

针对一个真实的私有 Discord guild 频道，使用两个机器人：一个由 harness 控制的 driver bot，以及一个通过捆绑的 Discord 插件由子 OpenClaw gateway 启动的 SUT bot。验证频道提及处理、SUT bot 是否已向 Discord 注册原生的 `/help` 命令，以及可选的 Mantis 证据场景。

在 `--credential-source env` 时所需的环境变量：

- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_APPLICATION_ID` - 必须与 Discord 返回的 SUT bot 用户 id 一致
  （否则该 lane 会快速失败）。

可选项：

- `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1` 会在 observed-message artifacts 中保留消息正文。
- `OPENCLAW_QA_DISCORD_VOICE_CHANNEL_ID` 为 `discord-voice-autojoin` 选择语音/舞台频道；如果未设置，场景会为 SUT bot 选择第一个可见的语音/舞台频道。

场景（`extensions/qa-lab/src/live-transports/discord/discord-live.runtime.ts:36`）：

- `discord-canary`
- `discord-mention-gating`
- `discord-native-help-command-registration`
- `discord-voice-autojoin` - 可选语音场景。单独运行，启用 `channels.discord.voice.autoJoin`，并验证 SUT bot 当前的 Discord 语音状态是目标语音/舞台频道。Convex Discord 凭据可以包含可选的 `voiceChannelId`；否则运行器会在 guild 中发现第一个可见的语音/舞台频道。
- `discord-status-reactions-tool-only` - 可选 Mantis 场景。单独运行，因为它会将 SUT 切换为始终在线、仅工具的 guild 回复，并将 `messages.statusReactions.enabled=true`，然后捕获一个 REST reaction 时间线以及 HTML/PNG 视觉 artifacts。Mantis 的前后报告也会将场景提供的 MP4 artifacts 以 `baseline.mp4` 和 `candidate.mp4` 的形式保留。
- `discord-thread-reply-filepath-attachment` - 可选 Mantis 场景；参见
  [Discord Mantis 场景](#discord-mantis-scenarios)。

显式运行 Discord 语音自动加入场景：

```bash
pnpm openclaw qa discord \
  --scenario discord-voice-autojoin \
  --provider-mode mock-openai
```

显式运行 Mantis 状态反应场景：

```bash
pnpm openclaw qa discord \
  --scenario discord-status-reactions-tool-only \
  --provider-mode live-frontier \
  --model openai/gpt-5.6-luna \
  --alt-model openai/gpt-5.6-luna \
  --fast
```

输出 artifacts：

- `discord-qa-report.md`
- `qa-evidence.json` - live transport 检查的证据条目。
- `discord-qa-observed-messages.json` - 除非设置了 `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1`，否则正文会被脱敏。
- `discord-qa-reaction-timelines.json` 和
  `discord-status-reactions-tool-only-timeline.png`，当状态反应场景运行时生成。

### Slack QA

```bash
pnpm openclaw qa slack
```

以一个真实的私有 Slack 频道为目标，包含两个不同的机器人：一个由 harness 控制的 driver bot，以及一个由子 OpenClaw gateway 通过捆绑的 Slack 插件启动的 SUT bot。

当使用 `--credential-source env` 时所需的环境变量：

- `OPENCLAW_QA_SLACK_CHANNEL_ID`
- `OPENCLAW_QA_SLACK_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_APP_TOKEN`

可选项：

- `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1` 会将消息正文保留在 observed-message 工件中。
- `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_DIR` 为 Mantis 启用可视化审批检查点。运行器会写入 `<scenario>.pending.json` 和 `<scenario>.resolved.json`，然后等待匹配的 `.ack.json` 文件。
- `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_TIMEOUT_MS` 覆盖检查点确认超时时间。默认值为 `120000`。

通过 Slack live adapter 暴露的规范 YAML 场景：

- `thread-follow-up`
- `thread-isolation`

命令式 Slack 场景（`extensions/qa-lab/src/live-transports/slack/slack-live.runtime.ts`）：

- `slack-canary`
- `slack-mention-gating`
- `slack-allowlist-block`
- `slack-channel-disabled-warning` - 可选的真实 Slack 探测，用于确认
  已配置的禁用频道会发出结构化警告而不会回复。
- `slack-top-level-reply-shape`
- `slack-restart-resume`
- `slack-progress-commentary-true`、`slack-progress-commentary-false`、
  `slack-progress-commentary-omitted`，以及
  `slack-progress-commentary-verbose-dedupe` - 用于独立的 commentary/tool-progress 控制、
  省略键的旧默认值，以及在持久化 verbose progress 开启时单次投递行为的可选真实 Slack 探测。
- `slack-reaction-glyph-native` - 可选的实时消息工具 reaction 场景。
  指示代理传递精确的 `✅` 符号，并确认 Slack 已为目标消息中的 SUT bot 存储
  `white_check_mark`。
- `slack-chart-presentation-native` - 可选的可移植图表场景，
  验证原生 `data_visualization` 区块和精确的可访问文本。
- `slack-table-presentation-native` - 可选的可移植表格场景，
  验证原生 `data_table` 区块、精确的行和可访问文本。
- `slack-table-invalid-blocks-fallback` - 可选的直接传输场景，
  通过生产 Slack 发送路径发送一个结构上可读但超限的原始表格，
  包含 101 行数据及其表头，证明 Slack 本身返回 `invalid_blocks`，
  并验证存储的禁用格式回退是完整的且没有原生 data block。报告只保留安全的错误码、计数和布尔证据；原始合成表格文本遵循
  `OPENCLAW_QA_SLACK_CAPTURE_CONTENT`。
- `slack-approval-exec-native` - 可选的原生 Slack exec 审批场景。
  通过 gateway 请求一个 exec 审批，验证 Slack 消息具有原生审批按钮，完成其审批，
  并验证已解决的 Slack 更新。
- `slack-approval-plugin-native` - 可选的原生 Slack plugin 审批
  场景。同步启用 exec 和 plugin 审批转发，以便 plugin 事件不会被 exec 审批路由抑制，
  然后验证相同的 pending/resolved 原生 Slack UI 路径。
- `slack-codex-approval-exec-native` - 可选的 Codex Guardian 命令审批
  场景。以 Guardian 模式启用 Codex 插件，通过 Codex app-server harness 路由一个
  源自 Slack 的 Gateway agent 回合，等待
  `openclaw-codex-app-server` 的原生 Slack plugin 审批提示，完成其审批，并验证 Codex 回合
  以预期的命令输出和 assistant 标记结束。
- `slack-codex-approval-plugin-native` - 可选的 Codex Guardian 文件审批
  场景。使用工作区外的 `apply_patch` 指令，使 Codex 发出 app-server 文件变更审批路由，
  然后验证相同的原生 Slack pending/resolved 审批路径、最终 assistant 标记，以及在清理前
  的精确文件内容。

Codex 审批场景需要 `openai/*` 或 `codex/*` 的 `--model`、常规的 live model 凭据，以及被 Codex 插件接受的 Codex auth 或 API-key auth。
Slack 报告会包含 Codex app-server 方法、所选 Codex 模型 key、最终 Codex 回合状态，以及操作标记验证，并附带已脱敏的 Slack 审批元数据。

输出工件：

- `slack-qa-report.md`
- `qa-evidence.json` - live transport 检查的证据条目。
- `slack-qa-observed-messages.json` - 除非设置
  `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1`，否则正文会被脱敏。
- `approval-checkpoints/` - 仅在 Mantis 设置了 `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_DIR` 时存在；包含检查点 JSON、确认 JSON，以及 pending/resolved 截图。

#### 设置 Slack 工作区

该通道需要同一工作区中的两个不同 Slack 应用，以及一个两个机器人都加入的频道：

- `channelId` - 两个机器人都已被邀请加入的频道的 `Cxxxxxxxxxx` id。请使用专用频道；该通道每次运行都会发消息。
- `driverBotToken` - **Driver** 应用的 bot token（`xoxb-...`）。
- `sutBotToken` - **SUT** 应用的 bot token（`xoxb-...`），它必须与 driver 是不同的 Slack 应用，这样它的 bot user id 才会不同。
- `sutAppToken` - SUT 应用的 app-level token（`xapp-...`），带有 `connections:write`，由 Socket Mode 使用，使 SUT 应用能够接收事件。

优先使用专用于 QA 的 Slack 工作区，而不是复用生产工作区。

下面的 SUT manifest 故意将捆绑的 Slack 插件生产安装（`extensions/slack/src/setup-shared.ts:12`）收窄为 live Slack QA 套件所覆盖的权限和事件。对于用户所见的生产频道设置，请参见
[Slack channel quick setup](/channels/slack#quick-setup)；QA Driver/SUT 对是故意分开的，因为该通道需要同一工作区中的两个不同 bot user id。

**1. 创建 Driver 应用**

前往 [api.slack.com/apps](https://api.slack.com/apps) → _Create New App_ →
_From a manifest_ → 选择 QA 工作区，粘贴以下 manifest，然后 _Install to Workspace_：

```json
{
  "display_information": {
    "name": "OpenClaw QA Driver",
    "description": "OpenClaw QA Slack live lane 的测试 driver bot"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw QA Driver",
      "always_online": true
    }
  },
  "oauth_config": {
    "scopes": {
      "bot": ["chat:write", "channels:history", "groups:history", "users:read"]
    }
  },
  "settings": {
    "socket_mode_enabled": false
  }
}
```

复制 _Bot User OAuth Token_（`xoxb-...`）- 它将成为
`driverBotToken`。driver 只需要发送消息并识别自己；不需要事件，也不需要 Socket Mode。

**2. 创建 SUT 应用**

在同一工作区中重复 _Create New App → From a manifest_。这个 QA 应用故意使用捆绑的 Slack 插件生产 manifest（`extensions/slack/src/setup-shared.ts:12`）的更窄版本：省略了 reaction 作用域和事件，因为 live Slack QA 套件尚未覆盖 reaction 处理。

```json
{
  "display_information": {
    "name": "OpenClaw QA SUT",
    "description": "OpenClaw QA SUT connector for OpenClaw"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw QA SUT",
      "always_online": true
    },
    "app_home": {
      "home_tab_enabled": true,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    }
  },
  "oauth_config": {
    "scopes": {
      "bot": [
        "app_mentions:read",
        "assistant:write",
        "channels:history",
        "channels:read",
        "chat:write",
        "commands",
        "emoji:read",
        "files:read",
        "files:write",
        "groups:history",
        "groups:read",
        "im:history",
        "im:read",
        "im:write",
        "mpim:history",
        "mpim:read",
        "mpim:write",
        "pins:read",
        "pins:write",
        "usergroups:read",
        "users:read"
      ]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": [
        "app_home_opened",
        "app_mention",
        "channel_rename",
        "member_joined_channel",
        "member_left_channel",
        "message.channels",
        "message.groups",
        "message.im",
        "message.mpim",
        "pin_added",
        "pin_removed"
      ]
    }
  }
}
```

Slack 创建应用后，在其设置页面执行两件事：

- _Install to Workspace_ → 复制 _Bot User OAuth Token_ → 它将成为
  `sutBotToken`。
- _Basic Information → App-Level Tokens → Generate Token and Scopes_ → 添加
  scope `connections:write` → 保存 → 复制 `xapp-...` 值 → 它将成为
  `sutAppToken`。

通过对每个 token 调用 `auth.test` 来验证两个机器人拥有不同的 user id。运行时通过 user id 区分 driver 和 SUT；若两个角色复用同一个应用，mention-gating 会立即失败。

**3. 创建频道**

在 QA 工作区中创建一个频道（例如 `#openclaw-qa`），并从频道内部邀请两个机器人：

```text
/invite @OpenClaw QA Driver
/invite @OpenClaw QA SUT
```

从 _channel info → About → Channel ID_ 复制 `Cxxxxxxxxxx` id - 它将成为 `channelId`。公开频道可以使用；如果你使用私有频道，两个应用已经拥有 `groups:history`，因此 harness 的历史读取仍然会成功。

**4. 注册凭据**

两种方式。单机调试使用环境变量（设置四个 `OPENCLAW_QA_SLACK_*` 变量并传入 `--credential-source env`），或者将共享 Convex 池预先填充，以便 CI 和其他维护者租用。

对于 Convex 池，写入一个 JSON 文件中的四个字段：

```json
{
  "channelId": "Cxxxxxxxxxx",
  "driverBotToken": "xoxb-...",
  "sutBotToken": "xoxb-...",
  "sutAppToken": "xapp-..."
}
```

在 shell 中导出 `OPENCLAW_QA_CONVEX_SITE_URL` 和 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 后，注册并验证：

```bash
pnpm openclaw qa credentials add \
  --kind slack \
  --payload-file slack-creds.json \
  --note "QA Slack 池种子"

pnpm openclaw qa credentials list --kind slack --status all --json
```

预期 `count: 1`、`status: "active"`，且没有 `lease` 字段。

**5. 端到端验证**

在本地运行该通道，以确认两个机器人能够通过 broker 相互通信：

```bash
pnpm openclaw qa slack \
  --credential-source convex \
  --credential-role maintainer \
  --output-dir .artifacts/qa-e2e/slack-local
```

一次绿色运行通常在 30 秒内完成，而 `slack-qa-report.md` 会显示 `slack-canary` 和 `slack-mention-gating` 的状态都为 `pass`。如果该通道卡住约 90 秒后退出并显示 `Convex credential pool exhausted for kind "slack"`，要么池为空，要么每一行都已被租用 - `qa credentials list --kind slack --status all --json` 会告诉你是哪一种。

### WhatsApp QA

```bash
pnpm openclaw qa whatsapp
```

目标是两个专用的 WhatsApp Web 账户：一个由
harness 控制的 driver 账户，以及一个由子 OpenClaw gateway 通过
捆绑的 WhatsApp 插件启动的 SUT 账户。

当使用 `--credential-source env` 时所需的环境变量：

- `OPENCLAW_QA_WHATSAPP_DRIVER_PHONE_E164`
- `OPENCLAW_QA_WHATSAPP_SUT_PHONE_E164`
- `OPENCLAW_QA_WHATSAPP_DRIVER_AUTH_ARCHIVE_BASE64`
- `OPENCLAW_QA_WHATSAPP_SUT_AUTH_ARCHIVE_BASE64`

可选项：

- `OPENCLAW_QA_WHATSAPP_GROUP_JID` 启用群组场景，例如
  `whatsapp-mention-gating`、`whatsapp-group-pending-history-context`、
  `whatsapp-broadcast-group-fanout`、`whatsapp-group-activation-always`、
  `whatsapp-group-reply-to-bot-triggers`、群组 action/media/poll 场景，
  以及 `whatsapp-group-allowlist-block`。
- `OPENCLAW_QA_WHATSAPP_CAPTURE_CONTENT=1` 保留
  observed-message 产物中的消息正文。

场景目录（`extensions/qa-lab/src/live-transports/whatsapp/whatsapp-live.runtime.ts`）：

- 基线与群组 gating：`whatsapp-canary`、`whatsapp-pairing-block`、
  `whatsapp-mention-gating`、`whatsapp-group-pending-history-context`、
  `whatsapp-group-activation-always`、`whatsapp-group-reply-to-bot-triggers`、
  `whatsapp-top-level-reply-shape`、`whatsapp-restart-resume`、
  `whatsapp-group-allowlist-block`。
- 原生命令：`whatsapp-help-command`、`whatsapp-status-command`、
  `whatsapp-commands-command`、`whatsapp-tools-compact-command`、
  `whatsapp-whoami-command`、`whatsapp-context-command`、
  `whatsapp-native-new-command`。
- 回复与最终输出行为：`whatsapp-tool-only-usage-footer`、
  `whatsapp-reply-to-message`、`whatsapp-group-reply-to-message`、
  `whatsapp-reply-to-mode-batched`、`whatsapp-reply-context-isolation`、
  `whatsapp-reply-delivery-shape`、`whatsapp-stream-final-message-accounting`。
- 用户路径消息 action：`whatsapp-agent-message-action-react` 从一个真实的 driver DM 开始，
  让模型调用 `message` 工具，并观察原生 WhatsApp reaction。`whatsapp-agent-message-action-upload-file`
  使用相同的姿态来处理 `message(action=upload-file)`，并观察原生 WhatsApp 媒体。
  `whatsapp-group-agent-message-action-react` 和
  `whatsapp-group-agent-message-action-upload-file` 在真实 WhatsApp 群组中证明了相同的
  用户可见行为。
- 群组 fanout：`whatsapp-broadcast-group-fanout` 从一条被提及的
  WhatsApp 群组消息开始，并验证来自 `main`
  和 `qa-second` 的不同可见回复。
- 群组激活：`whatsapp-group-activation-always` 将一个真实群组会话切换为 `/activation always`，
  证明一条未提及的群组消息会唤醒 agent，然后恢复 `/activation mention`。
  `whatsapp-group-reply-to-bot-triggers` 先播种一个 bot 回复，
  再向其发送一条原生引用回复且不包含显式 mention，并验证 agent 会从该回复上下文中被唤醒。
- 入站媒体与结构化消息：`whatsapp-inbound-image-caption`、
  `whatsapp-audio-preflight`、`whatsapp-inbound-structured-messages`、
  `whatsapp-group-audio-gating`、`whatsapp-inbound-reaction-no-trigger`。
  这些场景通过 driver 发送真实的 WhatsApp 图片、音频、文档、位置、联系人、
  sticker 和 reaction 事件。
- 直接 Gateway 合同探针：`whatsapp-outbound-media-matrix`、
  `whatsapp-outbound-document-preserves-filename`、`whatsapp-outbound-poll`、
  `whatsapp-outbound-send-serialization`、
  `whatsapp-group-outbound-media`、`whatsapp-group-outbound-poll`、
  `whatsapp-message-actions`、`whatsapp-reply-context-isolation`、
  `whatsapp-reply-delivery-shape`。这些场景有意绕过模型提示，
  以证明确定性的 Gateway/channel `send`、`poll` 和
  `message.action` 合同。
- 访问控制覆盖：`whatsapp-access-control-dm-open`、
  `whatsapp-access-control-dm-disabled`、`whatsapp-access-control-group-open`、
  `whatsapp-access-control-group-disabled`、`whatsapp-group-allowlist-block`。
- 原生审批：`whatsapp-approval-exec-deny-native`、
  `whatsapp-approval-exec-native`、`whatsapp-approval-exec-reaction-native`、
  `whatsapp-approval-exec-group-reaction-native`、
  `whatsapp-approval-plugin-native`。
- 状态 reaction：`whatsapp-status-reactions`、
  `whatsapp-status-reaction-lifecycle`。

当前目录包含 52 个场景。`live-frontier` 默认 lane 保持较小，
仅 10 个场景，用于快速 smoke 覆盖。`mock-openai` 默认 lane
通过真实 WhatsApp transport 确定性地运行 45 个场景，仅 mock 模型输出；
审批场景和少数更重/阻塞性的检查仍需通过场景 id 显式运行。

WhatsApp QA driver 会观察结构化 live 事件（`text`、`media`、
`location`、`reaction` 和 `poll`），并且可以主动发送媒体、投票、
联系人、位置和 sticker。QA Lab 通过
`@openclaw/whatsapp/api.js` 包的导出接口导入该 driver，而不是直接访问
私有 WhatsApp runtime 文件。对于群组观察，`fromJid` 是群组 JID，
而 `participantJid` 和 `fromPhoneE164` 用于标识参与者发送者。
默认情况下消息内容会被脱敏。Direct Gateway 的 poll、upload-file、
media、group poll、group media 和 reply-shape 探针属于 transport/API
合同检查；它们并不被视为证明“用户提示让 agent 选择了相同行为”。
用户路径 action 证明来自诸如 `whatsapp-agent-message-action-react` 和
`whatsapp-group-agent-message-action-react` 之类的场景，在这些场景中，
driver 发送一条普通 WhatsApp 消息，而 QA Lab 观察到最终生成的原生
WhatsApp 产物。WhatsApp 报告会包含每个场景的姿态（`user-path`、
`direct-gateway` 或 `native-approval`），因此证据不会被误认为比它实际
证明的合同更强。

输出产物：

- `whatsapp-qa-report.md`
- `qa-evidence.json` - live transport 检查的证据条目。
- `whatsapp-qa-observed-messages.json` - 除非
  `OPENCLAW_QA_WHATSAPP_CAPTURE_CONTENT=1`，否则正文会被脱敏。

### Convex 凭据池

Discord、Slack、Telegram 和 WhatsApp 线路可以从共享的 Convex 池中租用凭据，而不是读取上面的环境变量。传入 `--credential-source convex`（或设置 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）；QA Lab 会获取一个独占租约，在运行期间发送心跳，并在关闭时释放它。池类型为 `"discord"`、`"slack"`、`"telegram"` 和 `"whatsapp"`。

broker 在 `admin/add` 上验证的负载形状：

- Discord（`kind: "discord"`）：`{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string }`。
- Telegram（`kind: "telegram"`）：`{ groupId: string, driverToken: string, sutToken: string }` - `groupId` 必须是数字聊天 ID 字符串。
- Telegram 真人用户（`kind: "telegram-user"`）：`{ groupId: string, sutToken: string, testerUserId: string, testerUsername: string, telegramApiId: string, telegramApiHash: string, tdlibDatabaseEncryptionKey: string, tdlibArchiveBase64: string, tdlibArchiveSha256: string, desktopTdataArchiveBase64: string, desktopTdataArchiveSha256: string }` -  
  仅用于 Mantis Telegram Desktop 证明。通用 QA Lab 线路不得获取此类型。
- WhatsApp（`kind: "whatsapp"`）：`{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }` - 手机号必须是不同的 E.164 字符串。

Mantis Telegram Desktop 证明工作流会为 TDLib CLI 驱动和 Telegram Desktop 见证共同持有一个独占的 Convex `telegram-user` 租约，然后在发布证明后释放它。

当 PR 需要确定性的视觉差异时，Mantis 可以在 `main` 和 PR head 上使用相同的模拟模型回复，同时 Telegram 格式化器或传递层发生变更。捕获默认值针对 PR 评论进行了调优：标准 Crabbox 类、24fps 桌面录制、24fps 动态 GIF，以及 1920px 预览宽度。前/后评论应发布一个干净的 bundle，其中只包含预期的 GIF。

Slack 线路也可以使用该池。Slack 负载形状检查目前位于 Slack QA runner 而不是 broker 中；请使用 `{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`，其中 Slack channel id 类似 `Cxxxxxxxxxx`。有关应用和权限范围的配置，请参见 [设置 Slack 工作区](#setting-up-the-slack-workspace)。

操作环境变量和 Convex broker 端点契约位于 [Testing → 通过 Convex 共享 Telegram 凭据](/help/testing#shared-telegram-credentials-via-convex-v1)（该章节名称早于多通道池；租约语义在各类型之间是共享的）。

## 仓库支持的种子

种子资产位于 `qa/`：

- `qa/scenarios/index.yaml`
- `qa/scenarios/<theme>/*.yaml`

这些文件刻意保留在 git 中，以便 QA 计划对人和
agent 都可见。

`qa-lab` 仍然保持为通用的 YAML 场景运行器。每个场景 YAML 文件都是
一次测试运行的单一事实来源，并且应定义：

- 顶层 `title`
- `scenario` 元数据
- `scenario` 中可选的 category、capability、lane 和 risk 元数据
- `scenario` 中的 docs 和 code refs
- `scenario` 中可选的插件需求
- `scenario` 中可选的网关配置补丁
- 用于 flow 场景的可执行顶层 `flow`，或
  Vitest 和 Playwright 场景的 `scenario.execution.kind` / `scenario.execution.path`

支撑 `flow` 的可复用运行时表面保持通用且
跨领域。例如，YAML 场景可以将 transport 侧
helpers 与 browser 侧 helpers 结合起来，通过 Gateway 的 `browser.request` 连接驱动内嵌的 Control UI，而无需添加特殊情况运行器。

场景文件应按产品能力分组，而不是按源代码树文件夹分组。文件移动时保持场景 ID 稳定；使用 `docsRefs` 和
`codeRefs` 进行实现可追溯性。

基线列表应保持足够广泛，以覆盖：

- DM 和频道聊天
- 线程行为
- 消息操作生命周期
- cron 回调
- 记忆召回
- 模型切换
- 子代理交接
- 仓库读取和文档读取
- 一个小型构建任务，例如 Lobster Invaders

## Provider mock 通道

`qa suite` 有两个本地 provider mock 通道：

- `mock-openai` 是具备场景感知的 OpenClaw mock。它仍然是基于仓库的 QA 和 parity gates 的默认确定性 mock 通道。
- `aimock` 会启动一个基于 AIMock 的 provider server，用于实验性的
  protocol、fixture、record/replay 和 chaos 覆盖。它是增量添加的，
  不会替代 `mock-openai` 场景分发器。

Provider-lane 的实现位于 `extensions/qa-lab/src/providers/`。
每个 provider 都拥有自己的默认值、本地 server 启动、gateway model config、
auth-profile 分阶段需求，以及 live/mock 能力标志。共享的 suite 和
gateway 代码通过 provider registry 路由，而不是基于 provider 名称进行分支处理。

## 传输适配器

`qa-lab` 为 YAML QA 场景提供了一个通用的传输接缝。`qa-channel` 是合成的默认实现。`crabline` 会启动本地、形态类似提供方的服务器，并让 OpenClaw 的普通通道插件与之交互。`live` 仅保留给真实的提供方凭据和外部通道。

在架构层面，划分如下：

- `qa-lab` 负责通用场景执行、工作线程并发、制品写入和报告。
- 传输适配器负责网关配置、就绪检查、入站和出站观察、传输操作以及规范化的传输状态。
- `qa/scenarios/` 下的 YAML 场景文件定义测试运行；`qa-lab` 提供执行它们的可复用运行时表面。

### 添加一个通道

向 YAML QA 系统添加一个通道，需要通道实现以及一个用于验证该通道契约的场景包。对于烟雾 CI 覆盖，还要添加匹配的 Crabline 本地提供方服务器，并通过 `crabline` 驱动将其暴露出来。

当共享的 `qa-lab` 主机可以承担该流程时，不要新增一个顶层 QA 命令根。

`qa-lab` 负责共享主机机制：

- `openclaw qa` 命令根
- 套件启动与清理
- 工作线程并发
- 制品写入
- 报告生成
- 场景执行
- 旧版 `qa-channel` 场景的兼容别名

运行器插件负责传输契约：

- 如何将 `openclaw qa <runner>` 挂载到共享 `qa` 根命令下
- 该传输的网关如何配置
- 如何检查就绪状态
- 如何注入入站事件
- 如何观察出站消息
- 如何暴露转录和规范化的传输状态
- 如何执行基于传输的操作
- 如何处理传输特定的重置或清理

新增通道的最低接入门槛：

1. 保持 `qa-lab` 作为共享 `qa` 根命令的所有者。
2. 在共享的 `qa-lab` 主机接缝上实现传输运行器。
3. 将传输特定机制保留在运行器插件或通道
   harness 中。
4. 将运行器挂载为 `openclaw qa <runner>`，而不是注册一个
   竞争性的根命令。运行器插件应在 `openclaw.plugin.json` 中声明 `qaRunners`，并在 `runtime-api.ts` 中导出匹配的 `qaRunnerCliRegistrations`
   数组。保持 `runtime-api.ts` 轻量；懒加载 CLI 和
   运行器执行应留在单独的入口点之后。可选的 `adapterFactory` 可将传输暴露给共享场景，而无需更改
   该命令现有的场景目录。
5. 在主题化的 `qa/scenarios/`
   目录下编写或适配 YAML 场景。
6. 对新场景使用通用场景辅助函数。
7. 除非仓库正在进行有意迁移，否则保持现有兼容别名可用。

决策规则是严格的：

- 如果某种行为可以在 `qa-lab` 中一次性表达，就放进 `qa-lab`。
- 如果某种行为依赖于某一个通道传输，就将其保留在对应的运行器插件或插件 harness 中。
- 如果某个场景需要一个多个通道都能使用的新能力，就添加一个通用辅助函数，而不是在 `suite.ts` 中加入通道特定分支。
- 如果某种行为只对某一种传输有意义，就让场景保持传输特定，并在场景契约中明确说明这一点。

### 场景辅助函数名称

新场景推荐使用的通用辅助函数：

- `waitForTransportReady`
- `waitForChannelReady`
- `injectInboundMessage`
- `injectOutboundMessage`
- `waitForTransportOutboundMessage`
- `waitForChannelOutboundMessage`
- `waitForNoTransportOutbound`
- `getTransportSnapshot`
- `readTransportMessage`
- `readTransportTranscript`
- `formatTransportTranscript`
- `resetTransport`

兼容别名仍可用于现有场景——`waitForQaChannelReady`、`waitForOutboundMessage`、`waitForNoOutbound`、`formatConversationTranscript`、`resetBus`——但新的场景编写应使用通用名称。这些别名的存在是为了避免一次性迁移，而不是未来的建模方式。

## 报告

`qa-lab` 会从观测到的 bus 时间线导出一份 Markdown 协议报告。
报告应回答：

- 哪些工作正常
- 哪些失败了
- 哪些仍然被阻塞
- 值得补充哪些后续场景

关于可用场景的清单——在评估后续工作量或接入新的传输层时很有用——运行 `pnpm openclaw qa coverage`（加上 `--json`
可获得机器可读输出）。在为某个已接触到的行为或文件路径选择有针对性的证明时，运行 `pnpm openclaw qa coverage --match <query>`。匹配报告会搜索场景元数据、文档引用、代码引用、coverage IDs、
插件以及 provider 要求，然后打印匹配的 `qa suite
--scenario ...` 目标。

每次 `qa suite` 运行都会为所选场景集写入顶层的 `qa-evidence.json`、
`qa-suite-summary.json` 和 `qa-suite-report.md` 工件。声明了 `execution.kind: vitest` 或
`execution.kind: playwright` 的场景会运行匹配的测试路径，并且还会写入
每个场景的日志。声明了 `execution.kind: script` 的场景会通过 `node --import tsx` 运行位于 `execution.path` 的证据生成器（并在 `execution.args` 中展开 `${outputDir}` 和 `${scenarioId}`）；生成器会写出自己的 `qa-evidence.json`，其条目会被导入到 suite 输出中，而其工件路径会相对于该生成器的 `qa-evidence.json` 进行解析。当 `qa suite` 通过 `qa run
--qa-profile` 进入时，同一个 `qa-evidence.json` 还会包含所选分类类别的 profile 评分卡摘要。

将 coverage 输出视为发现辅助，而不是 gate 的替代；所选场景仍然需要正确的 provider 模式、live transport、Multipass、Testbox 或 release lane，才能验证被测行为。关于评分卡上下文，请参阅 [成熟度评分卡](/maturity/scorecard)。

对于字符和风格检查，跨多个 live 模型 ref 运行同一场景，并写出一份经评判的 Markdown 报告：

```bash
pnpm openclaw qa character-eval \
  --model openai/gpt-5.6-luna,thinking=medium,fast \
  --model openai/gpt-5.2,thinking=xhigh \
  --model openai/gpt-5,thinking=xhigh \
  --model anthropic/claude-opus-4-8,thinking=high \
  --model anthropic/claude-sonnet-4-6,thinking=high \
  --model zai/glm-5.1,thinking=high \
  --model moonshot/kimi-k2.5,thinking=high \
  --model google/gemini-3.1-pro-preview,thinking=high \
  --judge-model openai/gpt-5.6-sol,thinking=xhigh,fast \
  --judge-model anthropic/claude-opus-4-8,thinking=high \
  --blind-judge-models \
  --concurrency 16 \
  --judge-concurrency 16
```

该命令运行本地 QA gateway 子进程，而不是 Docker。字符评估场景应通过 `SOUL.md` 设置 persona，然后运行普通的用户回合，例如聊天、工作区帮助和小文件任务。候选模型不应被告知它正在被评估。该命令会保留每份完整对话，记录基本运行统计，然后在支持的情况下以 `xhigh` 推理、fast 模式向裁判模型请求，按自然度、氛围和幽默感对运行结果进行排序。比较 provider 时使用 `--blind-judge-models`；裁判提示仍会获得每份对话和运行状态，但候选 ref 会被替换为中性标签，例如 `candidate-01`；报告会在解析后将排名映射回真实 ref。

Candidate runs default to `high` thinking, with `medium` for GPT-5.6 Luna and
`xhigh` for older OpenAI eval refs that support it. Override a specific
candidate inline with `--model provider/model,thinking=<level>`; inline
options also support `fast`, `no-fast`, and `fast=<bool>`. `--thinking
<level>` still sets a global fallback, and the older `--model-thinking
<provider/model=level>` form is kept for compatibility. OpenAI candidate
refs default to fast mode so priority processing is used where the provider
supports it. Pass `--fast` only when you want to force fast mode on for
every candidate model. Candidate and judge durations are recorded in the
report for benchmark analysis, but judge prompts explicitly say not to rank
by speed. Candidate and judge model runs both default to concurrency 16.
Lower `--concurrency` or `--judge-concurrency` when provider limits or local
gateway pressure make a run too noisy.

When no candidate `--model` is passed, the character eval defaults to
`openai/gpt-5.6-luna`, `openai/gpt-5.2`, `openai/gpt-5`,
`anthropic/claude-opus-4-8`, `anthropic/claude-sonnet-4-6`, `zai/glm-5.1`,
`moonshot/kimi-k2.5`, and `google/gemini-3.1-pro-preview`. When no
`--judge-model` is passed, the judges default to
`openai/gpt-5.6-sol,thinking=xhigh,fast` and
`anthropic/claude-opus-4-8,thinking=high`.

## 相关文档

- [矩阵 QA](/concepts/qa-matrix)
- [成熟度评分卡](/maturity/scorecard)
- [个人代理基准测试包](/concepts/personal-agent-benchmark-pack)
- [QA 频道](/channels/qa-channel)
- [测试](/help/testing)
- [仪表板](/web/dashboard)