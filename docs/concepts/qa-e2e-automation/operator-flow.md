---
doc-schema-version: 1
summary: "启动 QA 实验室并运行可观察性、Matrix、Discord Mantis、Slack 桌面和凭证池通道。"
read_when:
  - "您正在端到端运行 QA 通道"
  - "您需要 Matrix 实时车道或 Mantis 跑步者"
title: "操作流程"
---

## <a id="operator-flow"></a> 操作流程

当前的 QA 操作流程是一个双栏 QA 网站：

- Left：带有代理的网关仪表板 （Control UI）。
- 右：QA 实验室，显示 Slack-ish 成绩单和情景计划。

运行它：

```bash
pnpm qa:lab:up
```

这会构建 QA 站点，启动 Docker- 支持的网关通道，并公开 QA 实验室页面，其中操作员或自动化循环可以为代理提供 QA 任务，观察真实的通道行为，并记录哪些内容有效、失败或保持阻塞。

从匹配的当前源检查运行 QA 实验室。实验室加载后，捕获请求会检查异步代理捕获支持，如果缺少则报告升级错误；不相关的实验室操作不需要这种捕获能力。此操作检查不会与旧主机建立完全兼容性：当前的 QA 源还需要 SDK 导入，例如已发布的 2026.9.6 包排除的 `sqlite-runtime-testing`，因此其 QA CLI 在捕获检查运行之前可能会失败。

Runner 的 Scenarios 面板可以将 flow、Playwright、Vitest 和 script 目录条目组合启动。**Profile** 使用由 taxonomy 维护的会员计划； 勾选 scenarios 会创建显式覆盖，而 Scenarios 面板中的 **Profile** 则会回到服务器解析的 profile membership。

Config还公开了**Provider Lane**、主要和备用模型、**执行通道**、**通道驱动程序**、**E证据模式**、 **运行时对**和**运行时对通道**（`core`、`extended`或`soak`）。 Provider/model、运行时和通道驱动程序选择保持独立：例如，Real 前沿提供商可以使用 Crabline 通道驱动程序，而 Synthetic（模拟）可以使用 Real 通道。服务器在启动前解析分类成员资格、provider/model 资格、声明的 `execution.channel`、运行时对通道成员资格以及支持的执行类型。 “运行”面板显示选定的执行类型以及显式排除或错误。未知、空的显式、配置文件不兼容或通道不兼容的选择将被拒绝，而不是被默认套件替换。

QA 实验室对套件进行序列化并进行自检。当任一正在运行时，新套件、自检和重置请求将返回 HTTP 409。关机会在关闭其总线和捕获存储之前使用其现有执行期限耗尽已接受的运行。它不会取消该运行。虽然 HTTP 服务器在耗尽期间保持可访问，但新套件、自检和重置请求会返回 HTTP 503。未接受的请求可能会在现有 HTTP 关闭期限内断开连接；计划跨越关闭的套件无法启动。

为了更快地进行 QA Lab UI 迭代，而无需每次重建 Docker 映像，请使用绑定安装的 QA Lab 包启动堆栈：

```bash
pnpm openclaw qa docker-build-image
pnpm qa:lab:build
pnpm qa:lab:up:fast
pnpm qa:lab:watch
```

`qa:lab:up:fast` 会让 Docker 服务继续使用预构建镜像，并将 `extensions/qa-lab/web/dist` 绑定挂载到 `qa-lab` 容器中。 `qa:lab:watch` 会在变更时重新构建该 bundle，而浏览器会在 QA Lab 资源 hash 变化时自动重载。

### <a id="observability-smokes"></a> 可观测性烟雾测试

<Note>
可观测性 QA 仅在源码检出环境中运行。npm tarball 故意不包含 QA Lab（以及 `qa-channel`），因此包的 Docker 发布流水线不会运行 `qa` 命令。修改诊断埋点时，请在构建后的源码检出环境中运行这些命令。
</Note>

| 别名                                   | 运行内容                                                                                                                            |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm qa:otel:smoke`                    | 本地 OpenTelemetry 接收器加上启用了 `diagnostics-otel` 的 `otel-trace-smoke` 场景。                                      |
| `pnpm qa:otel:collector-smoke`          | 通过真实 OpenTelemetry Collector Docker 容器运行同一路线。修改端点接线或 collector/OTLP 兼容性时使用。 |
| `pnpm qa:prometheus:smoke`              | 启用 `diagnostics-prometheus` 的 `docker-prometheus-smoke` 场景。                                                           |
| `pnpm qa:observability:smoke`           | 先运行 `qa:otel:smoke`，再运行 `qa:prometheus:smoke`。                                                                                      |
| `pnpm qa:observability:collector-smoke` | 先运行 `qa:otel:collector-smoke`，再运行 `qa:prometheus:smoke`。                                                                            |

`qa:otel:smoke` 启动本地 OTLP/HTTP 接收器，运行最小的 QA- 通道代理轮次，然后断言跟踪、指标和日志已导出。它对导出的 protobuf 跟踪范围进行解码并检查发布关键形状：`openclaw.run`、`openclaw.harness.run`、最新的 GenAI 语义约定模型调用范围、`openclaw.context.assembled` 和 `openclaw.message.delivery` 必须全部存在。烟雾强制 `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`，因此模型调用范围必须使用 `{gen_ai.operation.name} {gen_ai.request.model}` 名称；成功转弯时模型调用不得导出 `StreamAbandoned`；原始诊断 ID 和 `openclaw.content.*` 属性必须远离跟踪。场景提示要求模型用固定标记进行回复并保留固定的秘密字符串；原始 OTLP 有效负载不得包含从场景 ID 派生的 QA 会话密钥。它在 QA 套件工件旁边写入 `otel-smoke-summary.json`。

`qa:prometheus:smoke` 会验证未认证的 scrape 会被拒绝，然后检查已认证的 scrape 是否包含发布关键的 metric family， 同时不包含 prompt 内容、response 内容、原始诊断标识、auth token 或本地路径。

### <a id="matrix-live-lane"></a> Matrix 实时通道

对于不需要模型提供者凭证的真实传输 Matrix 通道，请使用固定响应模拟 OpenAI 提供者：

```bash
pnpm openclaw qa matrix --provider-mode mock-openai
```

对于实时前沿提供商通道，明确提供 OpenAI- 兼容凭证：

```bash
OPENCLAW_LIVE_OPENAI_KEY="${OPENAI_API_KEY}" \
  pnpm openclaw qa matrix --provider-mode live-frontier
```

直接运行 `pnpm openclaw qa matrix` 会执行所有明确通过 `execution.channel` 或 `execution.channels` 声明 Matrix 适用性的 flow 场景， 并且会在场景失败后继续执行。使用 `--fail-fast` 可获得更短的反馈循环， 或重复指定 `--scenario <id>` 以运行明确的子集，包括没有通道限制的可移植场景。

Matrix 实时实现位于 `extensions/qa-lab/src/live-transports/matrix/scenarios/`。

适配器在 Docker 中提供一次性 Tuwunel 家庭服务器（默认映像 `ghcr.io/matrix-construct/tuwunel:v1.8.3`，固定到其多架构 OCI 索引摘要；服务器名称 `matrix-qa.test`，Docker- 分配的主机端口），注册临时驱动程序 SUT 和观察者用户，播种所需的房间，并记录编辑后的 request/response 边界。然后，它在范围为该传输（无 `qa-channel`）的子 QA 网关内运行真正的 Matrix 插件，并破坏环境。

v1.8.3 GHCR 索引解析为 `sha256:699fa9971c174e01c884abad8d1a3cfb2fe518e1a71f1fa16ea9dedf11873d74`。 `docker buildx imagetools inspect ghcr.io/matrix-construct/tuwunel:v1.8.3` 报告 `linux/arm64`、`linux/amd64`、`linux/amd64/v2` 和 `linux/amd64/v3` 的清单。

常用选项：

| 标志                     | 默认值           | 用途                                                                           |
| ------------------------ | ----------------- | --------------------------------------------------------------------------------- |
| `--scenario <id>`        | -                 | 选择一个场景；可重复指定。                                                  |
| `--fail-fast`            | 关闭               | 在第一个失败的检查或场景后停止。                                    |
| `--allow-failures`       | 关闭               | 写入制品，但场景失败时不返回失败的退出代码。      |
| `--provider-mode <mode>` | `live-frontier`   | 使用 `mock-openai` 进行可重复调度，或使用 `live-frontier` 进行实时提供程序。 |
| `--model <ref>`          | 提供方默认值  | 设置主要的 `provider/model` 引用。                                       |
| `--alt-model <ref>`      | 提供方默认值  | 设置在切换模型的场景中使用的备用模型。                     |
| `--fast`                 | 关闭               | 在支持的情况下启用提供方快速模式。                                        |
| `--output-dir <path>`    | 生成         | 选择报告目录；相对路径将基于 `--repo-root` 解析。        |
| `--repo-root <path>`     | 当前目录 | 从中立的工作目录运行。                                             |
| `--sut-account <id>`     | `sut`             | 在子网关配置中选择 Matrix 帐户 ID。                         |

Matrix QA 不会租用共享 Matrix 凭证：该适配器会在本地创建一次性用户，因此不接受 `--credential-source` 或 `--credential-role`。可通过 `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE` 覆盖 homeserver 镜像；可通过 `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS` 调整负向无回复断言（默认 `8000`， 并会限制在当前场景超时范围内）。单次运行命令通常会在制品刷新后强制退出， 因为 Matrix crypto native handle 可能会在清理后继续存活；仅当直接测试框架需要命令改为返回时，才设置 `OPENCLAW_QA_MATRIX_DISABLE_FORCE_EXIT=1`。

每次运行都会在所选输出目录下写入标准的 QA Lab 制品： `qa-suite-report.md`、`qa-suite-summary.json` 和 `qa-evidence.json`。 如果清理失败，请运行打印出的 `docker compose ... down --remove-orphans` 恢复命令。在较慢的运行环境中， 可以增大无回复窗口；在较快的 CI 中，较小的窗口可以缩短负向断言时间。

该目录覆盖了单元测试无法端到端证明的传输行为：mention gating、 allow-bot 策略、allowlist、顶层回复和线程回复、DM 路由、reaction 处理、 入站 edit 抑制、重启回放去重、homeserver 中断恢复、approval 元数据传递、 媒体处理，以及 Matrix E2EE bootstrap/recovery/verification 流程。 E2EE CLI 场景还会通过同一个一次性 homeserver 驱动 `openclaw matrix encryption setup` 和 verification 命令，然后再检查 gateway 回复。

CI 在 `.github/workflows/qa-live-transports-convex.yml` 中使用相同的命令表面。计划、发布和手动运行在一项作业中执行源自目录的选择，最多有四个独立的主机工作人员。每个工作人员都拥有其一次性家庭服务器、网关、状态和工件。场景成员身份仍属于目录所有； `--fail-fast` 保持串行执行并在第一次失败后停止。使用`openclaw qa matrix --concurrency <count>`来请求更少的工人；高于运输限制的值仍然受到限制。

### <a id="discord-mantis-scenarios"></a> Discord Mantis 场景

Discord 还具有仅 Mantis 选择加入的错误重现场景。使用 `--scenario discord-status-reactions-tool-only` 作为显式状态反应时间线，或使用 `--scenario discord-thread-reply-filepath-attachment` 创建真正的 Discord 线程并验证 `message.thread-reply` 是否保留 `filePath` 附件。这些场景不在默认实时 Discord 通道内，因为它们是 before/after 重现检查而不是广泛的烟雾覆盖范围。当在 QA 环境中配置 `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_DIR` 或 `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_TGZ_B64` 时，线程连接 Mantis 工作流程还可以添加登录的 Discord Web 见证视频。该观众资料仅用于视觉捕捉； pass/fail 决策仍然来自 Discord REST 预言机。

对于其他真实传输的烟雾测试线路：

```bash
pnpm openclaw qa buzz
pnpm openclaw qa discord
pnpm openclaw qa slack
pnpm openclaw qa telegram
pnpm openclaw qa whatsapp
```

他们的目标是具有两个机器人或帐户（驱动程序 + SUT）的预先存在的真实通道。这五种传输所需的环境变量、场景列表、输出工件和凸凭证池记录在 [Buzz、Discord、Slack、Telegram 和 WhatsApp QA 参考 ](/concepts/qa-e2e-automation/channel-qa-reference#buzz-discord-slack-telegram-and-whatsapp-qa-reference) 中。

### <a id="mantis-slack-desktop-and-visual-task-runners"></a> Mantis Slack 桌面与视觉任务运行器

要运行完整的 Slack 桌面 VM 流程并带有 VNC rescue，请运行：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --gateway-setup \
  --scenario slack-canary \
  --keep-lease
```

该命令租用一台 Crabbox desktop/browser 机器，在 VM 内运行 Slack 实时通道，在 VNC 浏览器中打开 Slack Web，捕获桌面，并复制 `slack-qa/`、`slack-desktop-smoke.png` 和`slack-desktop-smoke.mp4`（当视频捕获可用时）返回到 Mantis 工件目录。 Crabbox desktop/browser 租约预先提供捕获工具和 browser/native-build 帮助程序包，因此该场景应仅在较旧的租约上安装后备程序。 Mantis 报告 `mantis-slack-desktop-smoke-report.md` 中的总时序和每阶段时序，如此缓慢的运行显示时间是否用于租约预热、凭证获取、远程设置或工件复制。通过VNC手动登录Slack Web后重复使用`--lease-id <cbx_...>`；重复使用的租约还可以使 Crabbox 的 pnpm 存储缓存保持温暖。默认的 `--hydrate-mode source` 从源签出进行验证并在 VM 内部运行 install/build。仅当重用的远程工作空间已具有 `node_modules` 和内置 `dist/` 时才使用 `--hydrate-mode prehydrated`；该模式会跳过昂贵的 install/build 步骤，并在工作区未准备就绪时拒绝运行。通过 `--gateway-setup`，Mantis 留下了一个持久的 OpenClaw Slack 网关，该网关在 VM 内部的端口 `38973` 上运行；如果没有它，该命令将运行正常的机器人到机器人 Slack QA 通道，并在工件捕获后退出。

为了用桌面证据证明原生 Slack 审批 UI，请运行 Mantis 审批检查点模式：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --approval-checkpoints \
  --credential-source convex \
  --credential-role maintainer
```

该模式与 `--gateway-setup` 互斥。它会运行 Slack 审批场景，拒绝非审批场景 id，在每个待处理和已解决的审批状态处等待，将观测到的 Slack API 消息渲染为 `approval-checkpoints/<scenario>-pending.png` 和 `approval-checkpoints/<scenario>-resolved.png`，然后在任何检查点、消息证据、确认或渲染截图缺失或为空时失败。冷启动的 CI 租约可能仍然会在 `slack-desktop-smoke.png` 中显示 Slack 登录；审批检查点图片则是该通道的视觉证据。

默认的检查点运行会保留两个标准 Slack 审批场景。 如果要捕获任一可选的 Codex 审批路线，请用 `--scenario slack-codex-approval-exec-native` 或 `--scenario slack-codex-approval-plugin-native` 显式选择；Mantis 接受这两种并输出同一对 pending/resolved 截图。运行器会为每个选定的 Codex 路线扩展其检查点和远程命令的截止时间，以便完整的审批、agent 完成以及已解决更新流程都能完成。

操作员清单、GitHub 工作流触发命令、证据评论契约、hydrate-mode 决策表、耗时解读以及故障处理步骤都在 [Mantis Slack Desktop Runbook](/concepts/mantis-slack-desktop-runbook) 中。

对于 agent/CV 风格的桌面任务，请运行：

```bash
pnpm openclaw qa mantis visual-task \
  --browser-url https://example.net \
  --expect-text "Example Domain" \
  --vision-model openai/gpt-5.6-luna
```

`visual-task` 租赁或重用 Crabbox desktop/browser 机器，启动 `crabbox record --while`，通过嵌套的 `visual-driver` 驱动可见浏览器，捕获 `visual-task.png`，在选择 `--vision-mode image-describe` 时针对屏幕截图运行 `openclaw infer image describe`，并写入`visual-task.mp4`、`mantis-visual-task-summary.json`、`mantis-visual-task-driver-result.json` 和 `mantis-visual-task-report.md`。设置 `--expect-text` 时，视觉提示会要求提供结构化的 JSON 判决（`visible`、`evidence`、`reason`），并且仅当模型报告 `visible: true` 并带有引用预期文本的证据时才会通过；仅引用目标文本的 `visible: false` 响应仍然无法通过断言。使用 `--vision-mode metadata` 进行无模型烟雾，无需调用图像理解提供商即可证明桌面、浏览器、屏幕截图和视频管道。录音是`visual-task`的必备神器；如果 Crabbox 没有记录非空 `visual-task.mp4`，则即使视觉驱动程序通过，任务也会失败。如果失败，Mantis 会保留 VNC 的租约，除非任务已经通过并且未设置 `--keep-lease`。

### <a id="credential-pool-health-check"></a> 凭证池健康检查

在使用池化的 live 凭证之前，请运行：

```bash
pnpm openclaw qa credentials doctor
```

Doctor 检查 Convex 代理环境（`OPENCLAW_QA_CONVEX_SITE_URL`、`OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX`），验证端点设置，仅报告 `OPENCLAW_QA_CONVEX_SECRET_CI` 和 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 的 set/missing 状态，并在维护者密钥存在时验证 admin/list 的可达性。
