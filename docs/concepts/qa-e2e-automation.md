---
doc-schema-version: 1
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

- `extensions/qa-channel`: 带有 DM、频道、线程、反应、编辑和删除表面的合成消息通道。
- `extensions/qa-lab`: 调试器 UI、QA 总线、场景运行器，以及用于观察对话记录、
  注入入站消息和导出 Markdown 报告的实时传输适配器。
- `qa/`: 用于启动任务和基线 QA
  场景的基于仓库的种子资产。
- [Mantis](/concepts/mantis)：针对需要真实传输、浏览器截图、虚拟机状态和 PR 证据的 bug，
  提供前后对比的实时验证。

## 命令界面

每个 QA 流程都在 `pnpm openclaw qa <subcommand>` 下运行。许多流程都有 `pnpm qa:*`
脚本别名；两种形式都可用。

| 命令                                             | 用途                                                                                                                                                                                                                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qa run`                                            | 不带 `--qa-profile` 时运行捆绑的 QA 自检；使用 `--qa-profile smoke-ci`、`--qa-profile release` 或 `--qa-profile all` 时，运行由分类体系支持的成熟度配置。                                                                                                  |
| `qa suite`                                          | 针对 QA 网关通道运行仓库支持的场景。`--runner multipass` 使用一次性的 Linux 虚拟机，而不是宿主机。                                                                                                                                         |
| `qa coverage`                                       | 输出 YAML 场景覆盖清单（机器输出使用 `--json`；使用 `--match <query>` 查找与已修改行为相关的场景；使用 `--tools` 查看运行时工具夹具覆盖）。                                                                                  |
| `qa parity-report`                                  | 比较两个 `qa-suite-summary.json` 文件以执行执行模型轴一致性门禁，或使用 `--runtime-axis --token-efficiency` 写入 Codex 与 OpenClaw 的运行时一致性和令牌效率报告。                                                                          |
| `qa confidence-report`                              | 根据清单对 QA 证明工件进行分类，生成不含 unknown 项的置信度报告。                                                                                                                                                                               |
| `qa confidence-self-test`                           | 写入预置的负控制 canary，证明置信度门禁能检测漂移。                                                                                                                                                                                   |
| `qa jsonl-replay`                                   | 通过运行时一致性重放测试工具重放精选的 JSONL transcript。                                                                                                                                                                                         |
| `qa character-eval`                                 | 使用带评审报告的方式，在多个在线模型上运行 character QA 场景。参见[报告](#reporting)。                                                                                                                                                        |
| `qa manual`                                         | 针对选定的 provider/model 通道运行一次性提示。                                                                                                                                                                                                      |
| `qa ui`                                             | 启动 QA 调试器 UI 和本地 QA 总线（别名：`pnpm qa:lab:ui`）。                                                                                                                                                                                                |
| `qa docker-build-image`                             | 构建预制的 QA Docker 镜像。                                                                                                                                                                                                                                 |
| `qa docker-scaffold`                                | 为 QA dashboard + gateway 通道写入 docker-compose scaffold。                                                                                                                                                                                                |
| `qa up`                                             | 构建 QA 站点，启动 Docker 支持的堆栈，并输出 URL（别名：`pnpm qa:lab:up`；`:fast` 变体会额外添加 `--use-prebuilt-image --bind-ui-dist --skip-ui-build`）。                                                                                              |
| `qa aimock`                                         | 仅启动 AIMock provider server。                                                                                                                                                                                                                              |
| `qa mock-openai`                                    | 仅启动面向场景的 `mock-openai` provider server。                                                                                                                                                                                                        |
| `qa credentials doctor` / `add` / `list` / `remove` | 管理共享的 Convex credential pool。                                                                                                                                                                                                                           |
| `qa buzz`                                           | 针对真实 Buzz relay room 的实时传输通道，使用专用的 driver 和 SUT 身份。                                                                                                                                                                        |
| `qa discord`                                        | 针对真实私有 Discord guild channel 的实时传输通道。                                                                                                                                                                                                   |
| `qa matrix`                                         | 针对一次性的 Tuwunel homeserver，运行 QA Lab Matrix catalog 场景。参见 [Matrix 实时通道](#matrix-live-lane)。                                                                                                                                                 |
| `qa slack`                                          | 针对真实私有 Slack channel 的实时传输通道。                                                                                                                                                                                                           |
| `qa telegram`                                       | 针对真实私有 Telegram group 的实时传输通道。                                                                                                                                                                                                          |
| `qa whatsapp`                                       | 针对真实 WhatsApp Web 账户的实时传输通道。                                                                                                                                                                                                             |
| `qa mantis`                                         | 用于实时传输 bug 的前后验证 runner，包含 Discord 状态 reaction 证据、Crabbox 桌面端/浏览器 smoke，以及 Slack-in-VNC smoke。参见 [Mantis](/concepts/mantis) 和 [Mantis Slack Desktop Runbook](/concepts/mantis-slack-desktop-runbook)。 |

### 基于配置的 `qa run`

基于配置的 `qa run` 会从 `taxonomy.yaml` 读取成员关系，然后通过
`qa suite` 分发已解析的场景。`--surface` 和 `--category` 会过滤
所选配置，而不是定义单独的通道。生成的
`qa-evidence.json` 包含一个配置记分卡摘要，其中有已选 category 计数和缺失的覆盖 ID；各个 evidence 条目仍然是测试、覆盖角色和结果的事实来源。taxonomy feature
覆盖 ID 是精确的证明目标，而不是别名：主场景覆盖满足匹配的 ID，而次级覆盖仅作为建议。每个覆盖
ID 都严格采用 `taxonomy-surface.feature` 的形式，使用来自
`taxonomy.yaml` 的简短 surface ID。某个场景单独的 `surface` 字段是执行/报告标签（例如 `channel` 或 `runtime-tool`）；它不定义 taxonomy 归属。显式的配置覆盖 ID 会选择该 ID 下所有符合条件的主所有者，并按场景去重。场景文件和 taxonomy 顺序不会影响成员关系或执行顺序。

`scenario.execution.channels` 是一个 OR eligibility 列表：特定 channel 的
runner 可以在所列 channel 中任选一个执行该场景。基于配置的执行会将同一列表扩展到所选 driver 支持的每个 channel，并且只有在每个扩展后的 channel 执行都通过时，配置执行才会通过。这一规则统一适用于每个 taxonomy profile。

精简 evidence 会省略每个条目的 `execution`，并设置 `evidenceMode: "slim"`；
`smoke-ci` 默认使用 slim，而 `--evidence-mode full` 会恢复完整条目：

```bash
pnpm openclaw qa run \
  --qa-profile smoke-ci \
  --category channels.conversation-routing-and-delivery \
  --provider-mode mock-openai \
  --output-dir .artifacts/qa-e2e/smoke-ci-profile-dispatch
```

使用 `smoke-ci` 可获得带 mock 模型 provider 和 Crabline 本地 provider servers 的确定性配置证明。使用 `release` 可针对 live channels 进行 Stable/LTS 证明。仅在显式的全 taxonomy evidence 运行时使用 `all`；它会选择所有活跃的成熟度 category，并且可以通过
`QA Profile Evidence` GitHub Actions workflow 使用 `qa_profile=all` 进行分发。当一个
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
QA Lab 页面，供操作员或自动化循环向 agent 下发 QA
任务、观察真实渠道行为，以及记录哪些有效、失败或
仍然受阻。

Runner 的 Scenarios 面板可以将 flow、Playwright、Vitest 和 script
目录条目组合启动。**Profile** 使用由 taxonomy 维护的会员计划；
勾选 scenarios 会创建显式覆盖，而 Scenarios 面板中的 **Profile**
则会回到服务器解析的 profile membership。

Config 还公开了 **Provider lane**、主模型和备用模型、
**Execution channel**、**Channel driver**、**Evidence mode**、**Runtime pair**
以及 **Runtime-pair lane**（`core`、`extended` 或 `soak`）。Provider/model、
runtime 和 channel-driver 的选择彼此独立：例如，真实的前沿提供商
可以使用 Crabline channel driver，而 Synthetic（mock）可以使用真实渠道。
服务器会在启动前解析 taxonomy membership、provider/model
资格、声明的 `execution.channel`、runtime-pair-lane membership 以及支持的
execution kinds。Run 面板会显示所选的 execution kinds 以及显式排除项或错误。
未知的、空的显式选择、与 profile 不兼容的选择，或与 lane 不兼容的选择，
都会失败关闭，而不是被默认 suite 替换。

为了在不每次重建 Docker 镜像的情况下更快迭代 QA Lab UI，
请使用绑定挂载的 QA Lab bundle 启动栈：

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
可观测性 QA 仅在源码检出环境中运行。npm tarball 故意
不包含 QA Lab（以及 `qa-channel`），因此包的 Docker 发布流水线
不会运行 `qa` 命令。修改诊断埋点时，请在构建后的源码检出环境中运行这些命令。
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

### Matrix 实时通道

对于不需要模型提供方凭证的真实传输 Matrix 通道，请使用确定性的 mock OpenAI 提供方：

```bash
pnpm openclaw qa matrix --provider-mode mock-openai
```

如果要运行 live-frontier provider 通道，请显式提供 OpenAI 兼容凭证：

```bash
OPENCLAW_LIVE_OPENAI_KEY="${OPENAI_API_KEY}" \
  pnpm openclaw qa matrix --provider-mode live-frontier
```

直接运行 `pnpm openclaw qa matrix` 会执行所有明确通过
`execution.channel` 或 `execution.channels` 声明 Matrix 适用性的 flow 场景，
并且会在场景失败后继续执行。使用 `--fail-fast` 可获得更短的反馈循环，
或重复指定 `--scenario <id>` 以运行明确的子集，包括没有通道限制的可移植场景。

Matrix 实时实现位于
`extensions/qa-lab/src/live-transports/matrix/scenarios/`。

该适配器会在 Docker 中配置一个一次性的 Tuwunel homeserver（默认镜像为
`ghcr.io/matrix-construct/tuwunel:v1.8.2`，固定到其多架构 OCI
索引摘要；服务器名称为 `matrix-qa.test`，端口为 `28008`），注册临时的
驱动程序、SUT 和观察者用户，初始化所需的房间，并记录经过脱敏的请求/响应边界。
随后，它会在限定为该传输方式的子 QA 网关中运行真实的 Matrix 插件
（不包含 `qa-channel`），并销毁该环境。

v1.8.2 GHCR 索引解析为
`sha256:6f950bb139411a7964781e986321e395e045e4a6a52240a4dda9d23d04075f78`。
`docker buildx imagetools inspect ghcr.io/matrix-construct/tuwunel:v1.8.2`
会报告 `linux/arm64`、`linux/amd64`、`linux/amd64/v2` 和
`linux/amd64/v3` 的清单。

常用选项：

| 选项                     | 默认值            | 作用                                                                                 |
| ------------------------ | ----------------- | ------------------------------------------------------------------------------------ |
| `--scenario <id>`        | -                 | 选择一个场景；可重复指定。                                                           |
| `--fail-fast`            | 关闭              | 在第一个失败的检查或场景后停止。                                                     |
| `--allow-failures`       | 关闭              | 写入制品，但场景失败时不返回失败的退出代码。                                         |
| `--provider-mode <mode>` | `live-frontier`   | 使用 `mock-openai` 进行确定性分发，或使用 `live-frontier` 连接实时提供方。            |
| `--model <ref>`          | 提供方默认值      | 设置主要的 `provider/model` 引用。                                                   |
| `--alt-model <ref>`      | 提供方默认值      | 设置在切换模型的场景中使用的备用模型。                                               |
| `--fast`                 | 关闭              | 在支持的情况下启用提供方快速模式。                                                   |
| `--output-dir <path>`    | generated         | 选择报告目录；相对路径将基于 `--repo-root` 解析。                                    |
| `--repo-root <path>`     | 当前目录          | 从中立的工作目录运行。                                                               |
| `--sut-account <id>`     | `sut`             | 选择子网关配置中的 Matrix 账户 ID。                                                  |

Matrix QA 不会租用共享 Matrix 凭证：该适配器会在本地创建一次性用户，因此不接受
`--credential-source` 或 `--credential-role`。可通过
`OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE` 覆盖 homeserver 镜像；可通过
`OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS` 调整负向无回复断言（默认 `8000`，
并会限制在当前场景超时范围内）。单次运行命令通常会在制品刷新后强制退出，
因为 Matrix crypto native handle 可能会在清理后继续存活；仅当直接测试框架
需要命令改为返回时，才设置 `OPENCLAW_QA_MATRIX_DISABLE_FORCE_EXIT=1`。

每次运行都会在所选输出目录下写入标准的 QA Lab 制品：
`qa-suite-report.md`、`qa-suite-summary.json` 和 `qa-evidence.json`。
如果清理失败，请运行打印出的
`docker compose ... down --remove-orphans` 恢复命令。在较慢的运行环境中，
可以增大无回复窗口；在较快的 CI 中，较小的窗口可以缩短负向断言时间。

该目录覆盖了单元测试无法端到端证明的传输行为：mention gating、
allow-bot 策略、allowlist、顶层回复和线程回复、DM 路由、reaction 处理、
入站 edit 抑制、重启回放去重、homeserver 中断恢复、approval 元数据传递、
媒体处理，以及 Matrix E2EE bootstrap/recovery/verification 流程。
E2EE CLI 场景还会通过同一个一次性 homeserver 驱动 `openclaw matrix encryption setup`
和 verification 命令，然后再检查 gateway 回复。

CI 在
`.github/workflows/qa-live-transports-convex.yml` 中使用相同的命令面。
计划任务、release 和手动运行会把基于目录的选择分摊到五个确定性分片上，
这样归属仍然由场景自身拥有，同时每个 job 都能保持在自己的超时时间内。

### Discord Mantis 场景

Discord 也有仅供 Mantis 使用的按需场景，用于 bug 复现。使用
`--scenario discord-status-reactions-tool-only` 可运行明确的状态 reaction 时间线，或者使用
`--scenario discord-thread-reply-filepath-attachment` 创建一个真实的 Discord thread，并验证 `message.thread-reply`
保留了一个 `filePath` 附件。这些场景不会进入默认的实时 Discord 通道，因为它们是前后对比的复现探针，而不是广泛的烟雾测试覆盖。线程附件的 Mantis 工作流在
`MANTIS_DISCORD_VIEWER_CHROME_PROFILE_DIR` 或
`MANTIS_DISCORD_VIEWER_CHROME_PROFILE_TGZ_B64` 已在 QA 环境中配置时，还可以添加一个已登录的 Discord Web 见证视频。该 viewer profile 仅用于视觉捕获；通过/失败的决定仍然来自 Discord REST oracle。

对于其他真实传输的烟雾测试线路：

```bash
pnpm openclaw qa buzz
pnpm openclaw qa discord
pnpm openclaw qa slack
pnpm openclaw qa telegram
pnpm openclaw qa whatsapp
```

它们会针对一个预先存在的真实频道，该频道中有两个 bot 或账户（driver +
SUT）。这五种传输所需的环境变量、场景列表、输出产物以及 Convex
凭据池，都记录在下方的
[Buzz、Discord、Slack、Telegram 和 WhatsApp QA 参考](#buzz-discord-slack-telegram-and-whatsapp-qa-reference)中。

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
管道正常，而无需调用图像理解提供方。录制是 `visual-task` 的必需产物；如果 Crabbox 没有录到非空的 `visual-task.mp4`，即便视觉驱动通过了，该任务也会失败。在失败时，Mantis 会保留该租约以便通过 VNC 查看，除非任务已经通过且未设置 `--keep-lease`】【。

### 凭证池健康检查

在使用池化的 live 凭证之前，请运行：

```bash
pnpm openclaw qa credentials doctor
```

doctor 会检查 Convex broker 环境（`OPENCLAW_QA_CONVEX_SITE_URL`、
`OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX`），验证端点设置，仅报告
`OPENCLAW_QA_CONVEX_SECRET_CI` 和
`OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 的已设置/缺失状态，并在 maintainer secret 存在时验证 admin/list 的可达性。

## 规范化场景覆盖

根目录下的 `taxonomy.yaml` 定义语义覆盖 ID。`qa/scenarios/` 下的场景 YAML 文件将每个场景映射到这些 ID，并负责执行元数据；`execution.channel` 或 `execution.channels` 声明通道要求。分类配置文件选择覆盖 ID 或整个类别，目录则解析其主要场景所有者。传输运行器会根据通道和提供者资格对该结果应用筛选，而不是维护场景 ID 允许列表。通道驱动器是运行级别上可互换的实现选项。

静态的 `qa coverage` 输出会报告 taxonomy 到场景的映射。实际证明来自 `qa-evidence.json`，其中记录了已执行的场景、覆盖 ID、通道、实际使用的驱动以及结果。通道和驱动是报告维度，而不是额外的覆盖 ID 词汇表或场景资格轴。

对于一个不将 Docker 引入 QA 路径的可丢弃 Linux VM 运行通道，请运行：

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

这会启动一个全新的 Multipass 来宾，安装依赖，在来宾中构建 OpenClaw，运行 `qa suite`，然后将常规 QA 报告和摘要复制回宿主机上的 `.artifacts/qa-e2e/...`。它重用了与宿主机上 `qa suite` 相同的场景选择行为。

主机和 Multipass suite 运行默认会并行执行多个已选场景，并使用隔离的网关 worker。`qa-channel` 默认并发数为 4，并受所选场景数量上限限制。使用 `--concurrency <count>` 调整 worker 数量，或使用 `--concurrency 1` 进行串行执行。使用 `qa run --qa-profile personal-agent --provider-mode mock-openai` 运行个人助手基准测试，或使用 `--qa-profile observability` 运行源码检出遥测检查。CI 对 `smoke-ci` 使用相同的 profile 解析器；这些选择器都不会维护第二份场景 ID 列表。

当任何场景失败时，命令会以非零状态退出。当你想要获取工件但不希望失败导致退出码非零时，请使用 `--allow-failures`。

实时运行会转发对来宾可用且实用的受支持 QA 认证输入：基于环境变量的提供者密钥、QA 实时提供者配置路径，以及存在时的 `CODEX_HOME`。请将 `--output-dir` 保持在仓库根目录下，这样来宾就可以通过挂载的工作区写回。

## Buzz、Discord、Slack、Telegram 和 WhatsApp QA 参考

Matrix 适配器使用上文记录的基于一次性 Docker 的通道。  
Buzz、Discord、Slack、Telegram 和 WhatsApp 针对预先存在的真实传输运行，  
因此它们的参考信息位于此处。

### 共享 CLI 标志

这些 lane 通过共享的 QA runner CLI 契约进行注册。传输插件可以负责注册，而 QA Lab 仍作为套件宿主。它们接受相同的标志：

| 标志                                  | 默认值                                            | 描述                                                                                                                                     |
| ------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `--scenario <id>`                     | -                                                  | 仅运行此场景。可重复指定。                                                                                                             |
| `--output-dir <path>`                 | `<repo>/.artifacts/qa-e2e/<transport>-<timestamp>` | 报告、摘要、证据、传输特定工件和输出日志的写入位置。相对路径将基于 `--repo-root` 解析。 |
| `--repo-root <path>`                  | `process.cwd()`                                    | 从中立 cwd 调用时的仓库根目录。                                                                                               |
| `--sut-account <id>`                  | `sut`                                              | QA gateway 配置中的临时账户 id。                                                                                              |
| `--provider-mode <mode>`              | `live-frontier`（Buzz：`mock-openai`）              | `mock-openai`、`aimock` 或 `live-frontier`。                                                                                                    |
| `--model <ref>` / `--alt-model <ref>` | provider 默认值                                   | 主模型/备用模型引用。                                                                                                                   |
| `--fast`                              | 关闭                                                | 在支持的情况下启用 provider 快速模式。                                                                                                             |
| `--credential-source <source>`        | `env`（Buzz：`file`）                               | 现有 lane 使用 `env` 或 `convex`；Buzz 使用 `file` 或 `convex`。参见 [Convex 凭据池](#convex-credential-pool)。                      |
| `--credential-role <maintainer\|ci>`  | CI 中为 `ci`，其他情况下为 `maintainer`                 | 使用 `--credential-source convex` 时采用的角色。                                                                                                    |
| `--credential-file <path>`            | -                                                  | 仅限 Buzz，用于本地运行的 JSON 凭据文件。                                                                                                  |
| `--allow-failures`                    | 关闭                                                | 当场景失败时写入工件，但不返回失败退出码。                                                                      |

每个 lane 在任何场景失败时都会以非零状态退出。`--allow-failures` 会在不设置失败退出码的情况下写入
工件。Telegram 还接受 `--list-scenarios` 来打印可用的场景 id 并退出；其他 lane
不暴露该标志。

### Buzz QA

```bash
pnpm openclaw qa buzz \
  --credential-file /secure/path/buzz-qa-credentials.json
```

针对一个真实的 Buzz 房间和两个专用的 Nostr 身份。驱动程序发布传入的房间事件；SUT 身份配置在子 OpenClaw Gateway 中，其出站事件从中继上进行观测。默认的 `mock-openai` 提供商无需模型提供商凭据即可验证真实的 Buzz 传输。

本地运行使用 `--credential-file <path>`，并配合一个包含 `relayUrl`、`roomId`、`driverPrivateKey` 和 `sutPrivateKey` 的私有 JSON 文件。封闭中继可能还需要 `driverAuthTag` 和 `sutAuthTag`。相对路径基于 `--repo-root` 解析。托管中继必须使用 `wss://`；仅对于回环开发中继才接受明文 `ws://`。

两个身份都必须是专用房间的成员，并且 SUT 公钥必须具有 **Bot** 角色。托管的封闭中继还可能要求将两个公钥登记为中继成员。只能使用专用的 QA 身份；切勿使用人工所有者或管理员的私钥。请勿将任何私钥和授权值写入日志、命令行、构件、屏幕截图或源代码管理中。

默认场景包括：

- `channel-canary`
- `channel-mention-gating`

每次运行都会在所选输出目录下写入 `qa-suite-report.md`、`qa-suite-summary.json` 和 `qa-evidence.json`。报告会标识真实的 Buzz 中继路径，但不会包含凭据值。

### Telegram QA

```bash
pnpm openclaw qa telegram
```

目标是一个真实的私有 Telegram 群组，包含两个不同的机器人（驱动机器人 +
被测系统机器人）。被测系统机器人必须具有 Telegram 用户名；当两个机器人都在 `@BotFather`
中启用了 **机器人间通信模式** 时，机器人之间的观察效果最佳。

在使用 `--credential-source env` 时所需的环境变量：

- `OPENCLAW_QA_TELEGRAM_GROUP_ID` - 数字聊天 ID（字符串）。
- `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`

`release` 配置文件会选择由分类体系管理的 Telegram 场景，这些场景声明了
频道、使用流程执行类型，并匹配所请求的提供商和模型通道。显式指定
`--scenario` 的值会收窄同一选择范围，而不是绕过这些约束。使用
`pnpm openclaw qa telegram --list-scenarios
--provider-mode mock-openai` 可打印当前选择及回归引用。提供 `--model` 时，
列出和执行都会应用相同的模型约束。

`telegram-startup-getme-live` 是一个目录脚本生成器，而不是实时适配器流程。
请通过 `qa suite --scenario telegram-startup-getme-live` 运行它；专用的
`qa telegram` 命令和 `--list-scenarios` 会有意将其排除。

输出产物：

- `qa-suite-report.md`
- `qa-suite-summary.json`
- `qa-evidence.json` - 实时传输检查的证据条目，
  包括配置文件、覆盖范围、提供商、频道、产物、结果和 RTT
  字段。

Package Telegram 运行使用相同的 Telegram 凭证契约。重复 RTT 测量是
Package Telegram 实时通道的正常组成部分；当下游选择 RTT 检查时，
RTT 分布会折叠到 `qa-evidence.json` 的 `result.timing` 下。

```bash
OPENCLAW_QA_CREDENTIAL_SOURCE=convex \
pnpm test:docker:npm-telegram-live
```

当设置了 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` 时，Package 实时包装器
会租用一个 `kind: "telegram"` 凭证，将租用到的群组/驱动机器人/被测系统机器人
环境变量导出到已安装包的运行中，持续发送心跳维护该租约，并在关闭时释放它。
当选择 Convex 时，Package 包装器在 CI 外默认执行 20 次
`channel-canary` RTT 检查、30s RTT 超时，以及 Convex 角色
`maintainer`。可通过覆盖
`OPENCLAW_NPM_TELEGRAM_RTT_SAMPLES`、`OPENCLAW_NPM_TELEGRAM_RTT_TIMEOUT_MS`
或 `OPENCLAW_NPM_TELEGRAM_RTT_MAX_FAILURES` 来调整 RTT 测量，而无需
创建单独的 RTT 命令或 Telegram 特定的摘要格式。

### Discord QA

```bash
pnpm openclaw qa discord
```

针对一个真实的私有 Discord 服务器频道，使用两个机器人：一个由 harness 控制的驱动机器人，以及一个通过捆绑的 Discord 插件由子 OpenClaw 网关启动的被测机器人（SUT bot）。验证频道提及处理、SUT bot 是否已向 Discord 注册原生的 `/help` 命令，以及可选的 Mantis 证据场景。

在 `--credential-source env` 时所需的环境变量：

- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_APPLICATION_ID` - 必须与 Discord 返回的 SUT bot 用户 ID 一致
  （否则该场景会快速失败）。

可选项：

- `OPENCLAW_QA_DISCORD_VOICE_CHANNEL_ID` 选择 `discord-voice-autojoin` 的语音/Stage 频道；如果不提供，场景会为 SUT bot 选择第一个可见的语音/Stage 频道。

Discord YAML 模块场景（`qa/scenarios/channels/discord-*.yaml`）：

- `discord-canary`
- `discord-mention-gating`
- `discord-native-help-command-registration`
- `discord-voice-autojoin` - 可选的语音场景。它会单独运行，启用
  `channels.discord.voice.autoJoin`，并验证 SUT bot 当前的
  Discord 语音状态是否为目标语音/Stage 频道。Convex Discord
  凭据可以包含可选的 `voiceChannelId`；否则 runner
  适配器会在服务器中发现第一个可见的语音/Stage 频道。
- `discord-status-reactions-tool-only` - 可选的 Mantis 场景。它会单独运行，因为它会将 SUT 切换为始终在线、仅工具的服务器回复，设置 `messages.statusReactions.enabled=true`，然后捕获 REST
  反应时间线以及 HTML/PNG 可视化工件。Mantis 前后
  报告也会将场景提供的 MP4 工件分别保存为 `baseline.mp4`
  和 `candidate.mp4`。
- `discord-thread-reply-filepath-attachment` - 可选的 Mantis 场景；请参见
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

输出工件：

- `qa-suite-report.md`
- `qa-suite-summary.json`
- `qa-evidence.json` - 实时传输检查的证据条目。
- `discord-qa-reaction-timelines.json` 和
  `discord-status-reactions-tool-only-timeline.png`，当状态反应
  场景运行时生成。

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

- `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_DIR` 为 Mantis 启用可视化批准检查点。适配器会写入 `<scenario>.pending.json` 和 `<scenario>.resolved.json`，然后等待匹配的 `.ack.json` 文件。
- `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_TIMEOUT_MS` 覆盖检查点确认超时时间。默认值为 `120000`。

通过 Slack 实时适配器暴露的规范 YAML 场景：

- `thread-follow-up`
- `thread-isolation`

Slack YAML 模块场景（`qa/scenarios/channels/slack-*.yaml`）：

- `slack-canary`
- `slack-mention-gating`
- `slack-mpim-app-mention-dedupe` - 打开一个真实的 C 前缀群组私信，验证在消息/app-mention 双重投递后 SUT 恰好回复一次，确认原生线程后续消息能够找回该机器人回复，然后关闭 MPIM。
- `slack-allowlist-block`
- `slack-channel-disabled-warning` - 可选的真实 Slack 探测，用于确认已配置的禁用频道会发出结构化警告而不会回复。
- `slack-top-level-reply-shape`
- `slack-restart-resume`
- `slack-progress-commentary-true`、`slack-progress-commentary-false`、`slack-progress-commentary-omitted` 和 `slack-progress-commentary-verbose-dedupe` - 针对独立 commentary/tool-progress 控制、遗漏键的旧默认行为，以及在持久化 verbose progress 开启时单次投递行为的可选真实 Slack 探测。
- `slack-reaction-glyph-native` - 可选的实时 message-tool reaction 场景。指示 agent 传递精确的 `✅` 符号，并确认 Slack 已为目标消息上的 SUT bot 存储了 `white_check_mark`。
- `slack-chart-presentation-native` - 可选的可移植图表场景，用于验证原生 `data_visualization` block 和精确的可访问文本。
- `slack-table-presentation-native` - 可选的可移植表格场景，用于验证原生 `data_table` block、精确行内容和可访问文本。
- `slack-table-invalid-blocks-fallback` - 可选的直接传输场景，通过生产 Slack 发送路径发送一个结构上可读但超限的原始表格，包含 101 行数据以及其表头，证明 Slack 本身返回 `invalid_blocks`，并验证已存储的禁用格式回退是完整的且没有原生数据 block。场景细节仅保留安全的错误码、计数和布尔证据。
- `slack-approval-exec-native` - 可选的原生 Slack exec approval 场景。通过 gateway 请求一次 exec approval，验证 Slack 消息具有原生批准按钮，完成批准，并验证已解决的 Slack 更新。
- `slack-approval-plugin-native` - 可选的原生 Slack plugin approval 场景。将 exec 和 plugin approval 转发一起启用，以便 plugin 事件不会被 exec approval 路由抑制，然后验证相同的 pending/resolved 原生 Slack UI 路径。
- `slack-codex-approval-exec-native` - 可选的 Codex Guardian command approval 场景。以 Guardian 模式启用 Codex plugin，通过 Codex app-server harness 将一个源自 Slack 的 Gateway agent turn 路由过去，等待 `openclaw-codex-app-server` 的原生 Slack plugin approval 提示，完成解决，并验证 Codex turn 以预期的 command-output 和 assistant markers 结束。
- `slack-codex-approval-plugin-native` - 可选的 Codex Guardian file approval 场景。使用工作区外的 `apply_patch` 指令，以便 Codex 发出 app-server 文件更改审批路径，然后验证相同的原生 Slack pending/resolved approval 路径、最终 assistant marker，以及在清理前的精确文件内容。

Codex approval 场景需要 `openai/*` 或 `codex/*` 的 `--model`、正常的 live model 凭据，以及被 Codex plugin 接受的 Codex auth 或 API-key auth。
场景细节包括 Codex app-server 方法、所选 Codex model key、最终 Codex turn status，以及与已脱敏 Slack approval metadata 一起的 operation-marker 验证。

输出工件：

- `qa-suite-report.md`
- `qa-suite-summary.json`
- `qa-evidence.json` - 实时传输检查的证据条目。
- `approval-checkpoints/` - 仅当 Mantis 设置了 `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_DIR` 时；包含 checkpoint JSON、确认 JSON，以及 pending/resolved 截图。

#### 设置 Slack 工作区

该通道需要同一工作区中的两个不同 Slack 应用，以及一个两个机器人都加入的频道：

- `channelId` - 两个机器人都已被邀请加入的频道的 `Cxxxxxxxxxx` id。请使用专用频道；该通道每次运行都会发消息。
- `driverBotToken` - **Driver** 应用的 bot token（`xoxb-...`）。
- `sutBotToken` - **SUT** 应用的 bot token（`xoxb-...`），它必须与 driver 是不同的 Slack 应用，这样它的 bot user id 才会不同。
- `sutAppToken` - SUT 应用的 app-level token（`xapp-...`），带有 `connections:write`，由 Socket Mode 使用，使 SUT 应用能够接收事件。

优先使用专用于 QA 的 Slack 工作区，而不是复用生产工作区。

下面的 SUT manifest 故意将捆绑的 Slack 插件生产安装（`extensions/slack/src/setup-shared.ts:12`）收窄为 live Slack QA 套件所覆盖的权限和事件。对于用户所见的生产频道设置，请参见
[Slack 频道快速设置](/channels/slack#quick-setup)；QA Driver/SUT 对是故意分开的，因为该通道需要同一工作区中的两个不同 bot user id。

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

从 _channel info → About → Channel ID_ 复制 `Cxxxxxxxxxx` id - 它将成为
`channelId`。公开频道可以使用；如果你使用私有频道，两个应用已经拥有 `groups:history`，因此 harness 的历史读取仍然会成功。

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

一次绿色运行在 30 秒内即可完成，而 `qa-suite-report.md` 会显示 `slack-canary` 和 `slack-mention-gating` 的状态均为 `pass`。如果该通道卡住约 90 秒并以 `Convex credential pool exhausted for kind "slack"` 退出，则要么池为空，要么每一行都已被租用——`qa credentials list --kind slack --status all --json` 会告诉你具体情况。

### WhatsApp 质量验证

```bash
pnpm openclaw qa whatsapp
```

目标是两个专用的 WhatsApp Web 账户：一个由
harness 控制的驱动账户，以及一个由子 OpenClaw gateway 通过
捆绑的 WhatsApp 插件启动的被测账户（SUT）。

当使用 `--credential-source env` 时所需的环境变量：

- `OPENCLAW_QA_WHATSAPP_DRIVER_PHONE_E164`
- `OPENCLAW_QA_WHATSAPP_SUT_PHONE_E164`
- `OPENCLAW_QA_WHATSAPP_DRIVER_AUTH_ARCHIVE_BASE64`
- `OPENCLAW_QA_WHATSAPP_SUT_AUTH_ARCHIVE_BASE64`

可选项：

- `OPENCLAW_QA_WHATSAPP_GROUP_JID` 启用诸如
  `whatsapp-mention-gating`、`whatsapp-group-pending-history-context`、
  `whatsapp-broadcast-group-fanout`、`whatsapp-group-activation-always`、
  `whatsapp-group-reply-to-bot-triggers`、群组 action/media/poll 场景，
  以及 `whatsapp-group-allowlist-block` 等群组场景。

WhatsApp YAML 场景（`qa/scenarios/channels/whatsapp-*.yaml`）：

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
  使用相同的方式来处理 `message(action=upload-file)`，并观察原生 WhatsApp 媒体。
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

WhatsApp 默认值根据所选的分类配置和通道约束派生而来。`mock-openai` 在仅模拟模型输出的情况下，通过真实的 WhatsApp 传输层以确定性方式运行符合条件的场景；`live-frontier` 会排除其提供商或模型合同要求使用模拟通道的场景。

WhatsApp QA driver 观察结构化的实时事件（`text`、`media`、
`location`、`reaction` 和 `poll`），并且可以主动发送媒体、投票、
联系人、位置和 sticker。QA Lab 通过
`@openclaw/whatsapp/api.js` 包表面导入该 driver，而不是深入私有的
WhatsApp 运行时文件。对于群组观察，`fromJid` 是群组 JID，
而 `participantJid` 和 `fromPhoneE164` 用于标识参与者发送者。
消息内容默认会被脱敏。直接 Gateway 的 poll、upload-file、
media、group poll、group media 和 reply-shape 探针是传输/API
合同检查；它们并不被视为证明某个用户提示导致 agent 选择了相同动作。
用户路径 action 证明来自诸如 `whatsapp-agent-message-action-react` 和
`whatsapp-group-agent-message-action-react` 等场景，在这些场景中，driver 发送普通
WhatsApp 消息，而 QA Lab 观察由此产生的原生 WhatsApp 产物。
WhatsApp 场景详情包含每个场景的姿态（`user-path`、
`direct-gateway` 或 `native-approval`），因此证据不会被误认为比它实际证明的合同更强。

输出产物：

- `qa-suite-report.md`
- `qa-suite-summary.json`
- `qa-evidence.json` - 实时传输检查的证据条目。

### Convex 凭据池

Buzz、Discord、Slack、Telegram 和 WhatsApp 线路可以从共享的 Convex 池中租用凭据，而不是读取上述环境变量。传递
`--credential-source convex`（或设置 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）；
QA Lab 会获取独占租约，在运行期间为其发送心跳，并在关闭时释放租约。池类型为 `"buzz"`、`"discord"`、
`"slack"`、`"telegram"` 和 `"whatsapp"`。

broker 在 `admin/add` 上验证的负载形状：

- Buzz (`kind: "buzz"`): `{ relayUrl: string, roomId: string,
driverPrivateKey: string, sutPrivateKey: string, driverAuthTag?: string,
sutAuthTag?: string }` - `relayUrl` 必须使用 `wss://`，仅当中继为回环中继时才允许使用
  `ws://`；`roomId` 必须是频道 UUID，且身份必须彼此不同。
- Discord (`kind: "discord"`): `{ guildId: string, channelId: string,
driverBotToken: string, sutBotToken: string, sutApplicationId: string }`。
- Telegram (`kind: "telegram"`): `{ groupId: string, driverToken: string,
sutToken: string }` - `groupId` 必须是数字形式的 chat-id 字符串。
- Telegram 真实用户 (`kind: "telegram-user"`): `{ groupId: string, sutToken:
string, testerUserId: string, testerUsername: string, telegramApiId:
string, telegramApiHash: string, tdlibDatabaseEncryptionKey: string,
tdlibArchiveBase64: string, tdlibArchiveSha256: string,
desktopTdataArchiveBase64: string, desktopTdataArchiveSha256: string }` -
  仅用于 Mantis Telegram Desktop 证明。通用 QA Lab 线路不得获取此类型。
- WhatsApp (`kind: "whatsapp"`): `{ driverPhoneE164: string, sutPhoneE164:
string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string,
groupJid?: string }` - 电话号码必须是彼此不同的 E.164 字符串。

Mantis Telegram Desktop 证明工作流会为 TDLib CLI 驱动和 Telegram Desktop 见证共同持有一个独占的 Convex `telegram-user` 租约，然后在发布证明后释放它。

当 PR 需要确定性的视觉差异时，Mantis 可以在 `main` 和 PR head 上使用相同的模拟模型回复，同时 Telegram 格式化器或传递层发生变更。捕获默认值针对 PR 评论进行了调优：标准 Crabbox 类、24fps 桌面录制、24fps 动态 GIF，以及 1920px 预览宽度。前/后评论应发布一个干净的 bundle，其中只包含预期的 GIF。

Slack 线路也可以使用该池。Slack 负载形状检查目前位于 Slack QA runner 而不是 broker 中；请使用 `{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`，其中 Slack 频道 ID 类似于 `Cxxxxxxxxxx`。有关应用和权限范围的配置，请参见 [设置 Slack 工作区](#setting-up-the-slack-workspace)。

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
helpers 与 browser 侧 helpers 结合起来，通过 Gateway 的
`browser.request` 连接驱动内嵌的 Control UI，而无需添加特殊情况运行器。

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
- 一个小型构建任务，例如 Lobster Invaders。

## Provider 模拟通道

`qa suite` 有两个本地 Provider 模拟通道：

- `mock-openai` 是具备场景感知能力的 OpenClaw 模拟器。它仍然是基于仓库的 QA 和一致性门禁所使用的默认确定性模拟通道。
- `aimock` 会启动一个基于 AIMock 的 Provider 服务器，用于实验性的
  协议、fixture、录制/回放和混沌测试覆盖。它是增量添加的，
  不会替代 `mock-openai` 场景分发器。

Provider 通道的实现位于 `extensions/qa-lab/src/providers/`。
每个 Provider 都拥有自己的默认值、本地服务器启动方式、网关模型配置、
身份验证配置文件分阶段需求，以及实时/模拟能力标志。共享的测试套件和
网关代码通过 Provider 注册表进行路由，而不是基于 Provider 名称进行分支处理。

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
3. 将传输特定的机制保留在运行器插件或通道 harness 中。
4. 将运行器挂载为 `openclaw qa <runner>`，而不是注册一个相互竞争的根命令。运行器插件应在 `openclaw.plugin.json` 中声明 `qaRunners`，并从轻量级的 `qa-runner-api.ts` 表面导出匹配的 `qaRunnerCliRegistrations` 数组。使用随附 `runtime-api.ts` 契约的已安装插件在作者迁移期间仍受支持，直到 2026-10-01。通过延迟入口点将运行器执行置于其后。可选的 `adapterFactory` 会将传输暴露给共享场景，而不会更改命令现有的场景目录。如果工厂声明每个实例都拥有隔离的凭据或一次性服务器、Gateway 状态和制品路径，则同通道分区可以并行执行；否则应串行执行。由模块支持的流程场景还要求 `adapterFactory.supportsModuleFlows: true`；这些工厂必须返回实现了 `prepareFlow` 的适配器。
5. 在主题化的 `qa/scenarios/` 目录下编写或调整 YAML 场景。
6. 对新场景使用通用场景辅助函数。
7. 保持现有兼容别名继续有效，除非仓库正在进行有意的迁移。

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
- `waitForOutboundMessage`
- `waitForNoTransportOutbound`
- `getTransportSnapshot`
- `readTransportMessage`
- `readTransportTranscript`
- `formatTransportTranscript`
- `resetTransport`

对于现有场景，仍保留兼容别名——`waitForQaChannelReady`、`waitForNoOutbound`、`formatConversationTranscript` 和 `resetBus`——但编写新场景时应使用通用名称。对于出站检查，请使用规范的 `waitForOutboundMessage`，而不是添加传输或通道特定的出站等待别名。

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

该命令运行本地 QA gateway 子进程，而不是 Docker。字符评估场景应通过
`SOUL.md` 设置 persona，然后运行普通的用户回合，例如聊天、工作区帮助和小文件任务。候选模型不应被告知它正在被评估。该命令会保留每份完整对话，记录基本运行统计，然后在支持的情况下以 `xhigh` 推理、fast 模式向裁判模型请求，按自然度、氛围和幽默感对运行结果进行排序。比较 provider 时使用 `--blind-judge-models`；裁判提示仍会获得每份对话和运行状态，但候选 ref 会被替换为中性标签，例如 `candidate-01`；报告会在解析后将排名映射回真实 ref。

候选运行默认使用 `high` 推理级别，GPT-5.6 Luna 使用 `medium`，支持该级别的较旧 OpenAI 评估 ref 使用 `xhigh`。使用 `--model provider/model,thinking=<level>` 可在行内覆盖特定候选模型；行内选项还支持 `fast`、`no-fast` 和 `fast=<bool>`。`--thinking
<level>` 仍会设置全局回退值，而较旧的 `--model-thinking
<provider/model=level>` 形式则会继续保留以确保兼容性。OpenAI 候选 ref 默认启用 fast 模式，因此在 provider 支持时会使用优先级处理。只有在希望为每个候选模型强制启用 fast 模式时，才传递 `--fast`。报告会记录候选模型和裁判模型的运行时长，以便进行基准分析，但裁判提示会明确要求不要按速度进行排名。候选模型和裁判模型运行的默认并发数均为 16。当 provider 限制或本地 gateway 压力导致运行结果噪声过大时，请降低 `--concurrency` 或 `--judge-concurrency`。

未传入候选 `--model` 时，字符评估默认使用
`openai/gpt-5.6-luna`、`openai/gpt-5.2`、`openai/gpt-5`、
`anthropic/claude-opus-4-8`、`anthropic/claude-sonnet-4-6`、`zai/glm-5.1`、
`moonshot/kimi-k2.5` 和 `google/gemini-3.1-pro-preview`。未传入
`--judge-model` 时，裁判模型默认为
`openai/gpt-5.6-sol,thinking=xhigh,fast` 和
`anthropic/claude-opus-4-8,thinking=high`。

## 相关文档

- [成熟度记分卡](/maturity/scorecard)
- [个人代理基准测试包](/concepts/personal-agent-benchmark-pack)
- [QA 频道](/channels/qa-channel)
- [测试](/help/testing)
- [仪表板](/web/dashboard)
