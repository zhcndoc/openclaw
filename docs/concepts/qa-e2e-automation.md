---
summary: "QA 栈概览：qa-lab、qa-channel、基于仓库的场景、实时传输通道、传输适配器以及报告。"
read_when:
  - 理解 QA 技术栈如何协同工作
  - 扩展 qa-lab、qa-channel 或传输适配器
  - 添加基于仓库的 QA 场景
  - 围绕 Gateway 仪表板构建更高保真度的 QA 自动化
title: "QA 概览"
---

私有 QA 技术栈旨在以比单元测试更真实、
更接近频道形态的方式来验证 OpenClaw。

当前组件：

- `extensions/qa-channel`：带有 DM、channel、thread、
  reaction、edit 和 delete 接口面的合成消息通道。
- `extensions/qa-lab`：用于观察转录内容、
  注入入站消息以及导出 Markdown 报告的调试器 UI 和 QA bus。
- `extensions/qa-matrix`，以及未来的 runner 插件：在子 QA gateway 中
  驱动真实频道的实时传输适配器。
- `qa/`：用于 kickoff 任务和基线 QA
  场景的基于仓库的种子资产。

## 命令面

每个 QA 流程都在 `pnpm openclaw qa <subcommand>` 下运行。许多命令都有 `pnpm qa:*`
脚本别名；两种形式都受支持。

| 命令                                                | 用途                                                                                                                                                                |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qa run`                                            | 打包的 QA 自检；写入 Markdown 报告。                                                                                                                                |
| `qa suite`                                           | 在 QA gateway 通道上运行基于仓库的场景。别名：`pnpm openclaw qa suite --runner multipass`，用于一次性 Linux VM。                                 |
| `qa coverage`                                        | 打印 markdown 场景覆盖清单（`--json` 用于机器输出）。                                                                                          |
| `qa parity-report`                                   | 比较两个 `qa-suite-summary.json` 文件并写出 agentic parity-gate 报告。                                                                                    |
| `qa character-eval`                                  | 在多个实时模型上运行 character QA 场景，并生成裁决报告。参见 [报告](#reporting)。                                                           |
| `qa manual`                                          | 针对所选 provider/model 通道运行一次性 prompt。                                                                                                         |
| `qa ui`                                              | 启动 QA 调试器 UI 和本地 QA bus（别名：`pnpm qa:lab:ui`）。                                                                                                   |
| `qa docker-build-image`                              | 构建预烘焙的 QA Docker 镜像。                                                                                                                                    |
| `qa docker-scaffold`                                 | 为 QA 仪表板 + gateway 通道生成 docker-compose 脚手架。                                                                                                   |
| `qa up`                                              | 构建 QA 站点，启动 Docker 支持的栈，打印 URL（别名：`pnpm qa:lab:up`；`:fast` 变体会额外添加 `--use-prebuilt-image --bind-ui-dist --skip-ui-build`）。 |
| `qa aimock`                                          | 仅启动 AIMock provider 服务器。                                                                                                                                 |
| `qa mock-openai`                                     | 仅启动具备场景感知的 `mock-openai` provider 服务器。                                                                                                           |
| `qa credentials doctor` / `add` / `list` / `remove` | 管理共享的 Convex 凭据池。                                                                                                                              |
| `qa matrix`                                          | 针对一次性 Tuwunel homeserver 的实时传输通道。参见 [Matrix QA](/concepts/qa-matrix)。                                                                     |
| `qa telegram`                                        | 针对真实私有 Telegram 群组的实时传输通道。                                                                                                             |
| `qa discord`                                         | 针对真实私有 Discord guild 频道的实时传输通道。                                                                                                      |

## 操作流程

当前 QA 操作员流程是一个双窗格 QA 站点：

- 左侧：带有代理的 Gateway 仪表板（控制 UI）。
- 右侧：QA Lab，显示类似 Slack 的转录内容和场景计划。

运行方式：

```bash
pnpm qa:lab:up
```

这将构建 QA 站点，启动由 Docker 支持的 gateway 通道，并暴露 QA Lab 页面，操作员或自动化循环可以在其中给代理分配 QA 任务，观察真实的频道行为，并记录哪些成功、失败或保持阻塞。

为了在不每次重建 Docker 镜像的情况下更快地迭代 QA Lab UI，请使用绑定挂载的 QA Lab 包启动堆栈：

```bash
pnpm openclaw qa docker-build-image
pnpm qa:lab:build
pnpm qa:lab:up:fast
pnpm qa:lab:watch
```

`qa:lab:up:fast` 在预构建镜像上保持 Docker 服务运行，并将 `extensions/qa-lab/web/dist` 绑定挂载到 `qa-lab` 容器中。`qa:lab:watch` 在更改时重新构建该包，并且在 QA Lab 资源哈希更改时浏览器会自动重新加载。

用于本地 OpenTelemetry trace 冒烟测试，运行：

```bash
pnpm qa:otel:smoke
```

该脚本会启动一个本地 OTLP/HTTP trace 接收器，启用 `diagnostics-otel` 插件运行 `otel-trace-smoke` QA 场景，然后解码导出的 protobuf spans，并断言发布关键形态：必须存在 `openclaw.run`、`openclaw.harness.run`、`openclaw.model.call`、`openclaw.context.assembled` 和 `openclaw.message.delivery`；成功回合中的模型调用不得导出 `StreamAbandoned`；原始诊断 ID 和 `openclaw.content.*` 属性必须不出现在 trace 中。它会在 QA 套件产物旁边写入 `otel-smoke-summary.json`。

可观测性 QA 仅限源码检出环境。npm tarball 故意不包含 QA Lab，因此包的 Docker 发布流水线不会运行 `qa` 命令。变更诊断埋点时，请在已构建的源码检出环境中使用 `pnpm qa:otel:smoke`。

对于真实传输的 Matrix 冒烟通道，运行：

```bash
pnpm openclaw qa matrix --profile fast --fail-fast
```

该通道的完整 CLI 参考、profile/场景目录、环境变量和产物布局位于 [Matrix QA](/concepts/qa-matrix)。简而言之：它会在 Docker 中预置一个一次性 Tuwunel homeserver，注册临时 driver/SUT/observer 用户，在一个仅针对该传输范围的子 QA gateway 内运行真实 Matrix 插件（不使用 `qa-channel`），然后将 Markdown 报告、JSON 摘要、观测事件产物以及合并后的输出日志写入 `.artifacts/qa-e2e/matrix-<timestamp>/` 下。

对于真实传输的 Telegram 和 Discord 冒烟通道：

```bash
pnpm openclaw qa telegram
pnpm openclaw qa discord
```

两者都以一个预先存在的真实频道为目标，并使用两个 bot（driver + SUT）。所需环境变量、场景列表、输出产物以及 Convex 凭据池记录在下方的 [Telegram 和 Discord QA 参考](#telegram-and-discord-qa-reference) 中。

在使用共享的实时凭据之前，请运行：

```bash
pnpm openclaw qa credentials doctor
```

doctor 会检查 Convex broker 环境变量，在存在 maintainer secret 时验证端点设置，并校验 admin/list 的可达性。它只报告 secret 的已设置/缺失状态。

## 实时传输覆盖

实时传输通道共享同一个契约，而不是各自发明不同的场景列表结构。`qa-channel` 是广泛的合成产品行为套件，不属于实时传输覆盖矩阵的一部分。

| 通道     | Canary | Mention gating | Allowlist block | 顶层回复 | Restart resume | Thread 跟进 | Thread 隔离 | Reaction 观察 | Help 命令 | 原生命令注册 |
| -------- | ------ | -------------- | --------------- | -------- | -------------- | ----------- | ----------- | ------------- | -------- | ----------- |
| Matrix   | x      | x              | x               | x        | x              | x           | x           | x             |          |             |
| Telegram | x      | x              |                 |          |                |             |             |               | x        |             |
| Discord  | x      | x              |                 |          |                |             |             |               |          | x           |

这使得 `qa-channel` 保持为广泛的产品行为套件，而 Matrix、Telegram 以及未来的实时传输共享一个明确的传输契约检查列表。

对于不带 Docker 进入 QA 路径的一次性 Linux VM 通道，运行：

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

这会启动一个全新的 Multipass 客户机，安装依赖，在客户机内部构建 OpenClaw，运行 `qa suite`，然后将正常的 QA 报告和摘要复制回主机上的 `.artifacts/qa-e2e/...`。  
它复用了与主机上 `qa suite` 相同的场景选择行为。  
主机和 Multipass 的 suite 运行默认会使用隔离的 gateway worker 并行执行多个所选场景。`qa-channel` 默认并发数为 4，且上限受所选场景数量限制。使用 `--concurrency <count>` 调整 worker 数量，或使用 `--concurrency 1` 进行串行执行。  
若任何场景失败，该命令会以非零状态退出。若你想在不返回失败退出码的情况下获取产物，请使用 `--allow-failures`。  
实时运行会转发对客户机来说实用的受支持 QA 认证输入：基于环境变量的 provider key、QA live provider 配置路径，以及在存在时的 `CODEX_HOME`。请将 `--output-dir` 保持在仓库根目录下，以便客户机可以通过挂载的工作区写回数据。

## Telegram 和 Discord QA 参考

Matrix 之所以有一个[专门页面](/concepts/qa-matrix)，是因为它的场景数量以及基于 Docker 的 homeserver 预置流程。Telegram 和 Discord 更小——每个只有少数几个场景、没有 profile 系统、面向预先存在的真实频道——因此它们的参考文档放在这里。

### 共享 CLI 标志

两个通道都通过 `extensions/qa-lab/src/live-transports/shared/live-transport-cli.ts` 注册，并接受相同的标志：

| 标志                                  | 默认值                                                   | 描述                                                                                                           |
| ------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `--scenario <id>`                     | —                                                         | 仅运行此场景。可重复。                                                                                   |
| `--output-dir <path>`                 | `<repo>/.artifacts/qa-e2e/{telegram,discord}-<timestamp>` | 报告/摘要/观测消息和输出日志的写入位置。相对路径会相对于 `--repo-root` 解析。 |
| `--repo-root <path>`                  | `process.cwd()`                                           | 从中性 cwd 调用时的仓库根目录。                                                                     |
| `--sut-account <id>`                  | `sut`                                                     | QA gateway 配置中的临时账户 id。                                                                    |
| `--provider-mode <mode>`              | `live-frontier`                                           | `mock-openai` 或 `live-frontier`（旧的 `live-openai` 仍然可用）。                                                  |
| `--model <ref>` / `--alt-model <ref>` | provider 默认值                                          | 主/备用模型引用。                                                                                         |
| `--fast`                              | off                                                       | 在支持的情况下使用 provider 快速模式。                                                                                   |
| `--credential-source <env\|convex>`   | `env`                                                     | 参见 [Convex 凭据池](#convex-credential-pool)。                                                                |
| `--credential-role <maintainer\|ci>`  | CI 中为 `ci`，否则为 `maintainer`                        | 当 `--credential-source convex` 时使用的角色。                                                                          |

若任何场景失败，二者都会以非零状态退出。`--allow-failures` 会在不设置失败退出码的情况下写入产物。

### Telegram QA

```bash
pnpm openclaw qa telegram
```

目标是一个真实的私有 Telegram 群组，使用两个不同的 bot（driver + SUT）。SUT bot 必须拥有 Telegram username；当两个 bot 都在 `@BotFather` 中启用 **Bot-to-Bot Communication Mode** 时，bot-to-bot 观测效果最佳。

当 `--credential-source env` 时所需的环境变量：

- `OPENCLAW_QA_TELEGRAM_GROUP_ID` — 数字型 chat id（字符串）。
- `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`

可选项：

- `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1` 保留观测消息产物中的消息正文（默认会脱敏）。

场景（`extensions/qa-lab/src/live-transports/telegram/telegram-live.runtime.ts:44`）：

- `telegram-canary`
- `telegram-mention-gating`
- `telegram-mentioned-message-reply`
- `telegram-help-command`
- `telegram-commands-command`
- `telegram-tools-compact-command`
- `telegram-whoami-command`
- `telegram-context-command`

输出产物：

- `telegram-qa-report.md`
- `telegram-qa-summary.json` — 从 canary 开始包含每次回复的 RTT（driver 发送 → 观测到的 SUT 回复）。
- `telegram-qa-observed-messages.json` — 除非 `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1`，否则正文会被脱敏。

### Discord QA

```bash
pnpm openclaw qa discord
```

目标是一个真实的私有 Discord guild 频道，使用两个 bot：一个由 harness 控制的 driver bot，以及一个由子 OpenClaw gateway 通过内置 Discord 插件启动的 SUT bot。验证频道 mention 处理，以及 SUT bot 是否已向 Discord 注册原生 `/help` 命令。

当 `--credential-source env` 时所需的环境变量：

- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_APPLICATION_ID` — 必须与 Discord 返回的 SUT bot 用户 id 匹配（否则该通道会快速失败）。

可选项：

- `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1` 保留观测消息产物中的消息正文。

场景（`extensions/qa-lab/src/live-transports/discord/discord-live.runtime.ts:36`）：

- `discord-canary`
- `discord-mention-gating`
- `discord-native-help-command-registration`

输出产物：

- `discord-qa-report.md`
- `discord-qa-summary.json`
- `discord-qa-observed-messages.json` — 除非 `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1`，否则正文会被脱敏。

### Convex 凭据池

Telegram 和 Discord 两个通道都可以从共享的 Convex 池中租用凭据，而不是读取上面的环境变量。传入 `--credential-source convex`（或设置 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）；QA Lab 会获取一个独占租约，在运行期间保持心跳，并在关闭时释放它。池类型为 `"telegram"` 和 `"discord"`。

broker 在 `admin/add` 上验证的 payload 形状：

- Telegram（`kind: "telegram"`）：`{ groupId: string, driverToken: string, sutToken: string }` — `groupId` 必须是数字型 chat-id 字符串。
- Discord（`kind: "discord"`）：`{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string }`。

操作环境变量以及 Convex broker 端点契约位于 [Testing → 通过 Convex 共享 Telegram 凭据](/help/testing#shared-telegram-credentials-via-convex-v1)（该章节名称早于 Discord 支持；但 broker 语义对两种类型完全相同）。

## 仓库支持的种子

种子资产位于 `qa/`：

- `qa/scenarios/index.md`
- `qa/scenarios/<theme>/*.md`

这些故意放在 git 中，以便 QA 计划对人类和代理都可见。

`qa-lab` 应保持为通用的 markdown 运行器。每个场景 markdown 文件是一次测试运行的真实来源，应定义：

- 场景元数据
- 可选的 category、capability、lane 和 risk 元数据
- docs 和 code 引用
- 可选的插件需求
- 可选的 gateway 配置补丁
- 可执行的 `qa-flow`

支撑 `qa-flow` 的可复用运行时表面可以继续保持通用、跨领域的设计。例如，Markdown 场景可以把传输侧 helper 与浏览器侧 helper 组合起来，通过 Gateway 的 `browser.request` 接缝驱动嵌入式 Control UI，而不需要额外增加一个特化 runner。

场景文件应按产品能力分组，而不是按源代码树的文件夹分组。文件移动时请保持场景 ID 稳定；使用 `docsRefs` 和 `codeRefs` 做实现追踪。

基线列表应保持足够广泛，以覆盖：

- 私信和频道聊天
- 线程行为
- 消息操作生命周期
- cron 回调
- 记忆回忆
- 模型切换
- 子代理交接
- 仓库阅读和文档阅读
- 一个小型构建任务，例如 Lobster Invaders

## Provider 模拟 lanes

`qa suite` 提供两个本地 provider 模拟 lane：

- `mock-openai` 是具备场景感知能力的 OpenClaw mock。它仍然是仓库内 QA 与 parity gate 的默认确定性 mock lane。
- `aimock` 会启动一个基于 AIMock 的 provider 服务，用于实验性协议、fixture、record/replay 与 chaos 覆盖。它是增量能力，不会替代 `mock-openai` 的场景分发器。

provider lane 的实现位于 `extensions/qa-lab/src/providers/`。每个 provider 自己负责其默认值、本地服务启动、gateway 模型配置、auth profile 预置需求，以及 live/mock 能力标记。共享的 suite 和 gateway 代码应通过 provider registry 路由，而不是按 provider 名称写分支。

## 传输适配器

`qa-lab` 为 markdown QA 场景提供了一个通用的传输接缝。`qa-channel` 是这个接缝上的第一个适配器，但设计目标更广：未来真实或合成的 channel 都应接入同一个 suite runner，而不是新增一个特定于传输的 QA runner。

在架构级别，拆分如下：

- `qa-lab` 负责通用场景执行、worker 并发、制品写入和报告。
- 传输适配器负责 gateway 配置、就绪检查、入站和出站观测、传输动作以及标准化的传输状态。
- `qa/scenarios/` 下的 Markdown 场景文件定义测试运行；`qa-lab` 提供执行它们的可复用运行时表面。

### 添加一个 channel

向 markdown QA 系统添加一个 channel 只需要两件事：

1. 该 channel 的传输适配器。
2. 一个覆盖该 channel 契约的场景包。

当共享的 `qa-lab` 宿主可以负责整个流程时，不要新增一个顶层 QA 命令根。

`qa-lab` 负责共享宿主机制：

- `openclaw qa` 命令根
- suite 启动和关闭
- worker 并发
- 制品写入
- 报告生成
- 场景执行
- 旧版 `qa-channel` 场景的兼容别名

Runner 插件负责传输契约：

- `openclaw qa <runner>` 如何挂载到共享 `qa` 根命令下
- 该传输如何配置 gateway
- 如何检查就绪状态
- 如何注入入站事件
- 如何观察出站消息
- 如何暴露转录和标准化传输状态
- 如何执行基于传输的动作
- 如何处理传输相关的重置或清理

新 channel 的最低接入门槛：

1. 保持 `qa-lab` 作为共享 `qa` 根命令的拥有者。
2. 在共享的 `qa-lab` 宿主接缝上实现传输 runner。
3. 将传输相关机制保留在 runner 插件或 channel harness 内。
4. 通过 `openclaw qa <runner>` 挂载 runner，而不是注册一个竞争性的根命令。Runner 插件应在 `openclaw.plugin.json` 中声明 `qaRunners`，并从 `runtime-api.ts` 导出一个匹配的 `qaRunnerCliRegistrations` 数组。保持 `runtime-api.ts` 轻量；惰性 CLI 和 runner 执行应留在单独的入口点之后。
5. 在主题化的 `qa/scenarios/` 目录下编写或改造 markdown 场景。
6. 新场景使用通用场景 helper。
7. 保持现有兼容别名可用，除非仓库正在进行有意迁移。

决策规则是严格的：

- 如果行为可以在 `qa-lab` 中只表达一次，就放在 `qa-lab`。
- 如果行为依赖于某个 channel 传输，就把它保留在那个 runner 插件或插件 harness 中。
- 如果某个场景需要一个多个 channel 都能使用的新能力，就添加一个通用 helper，而不是在 `suite.ts` 中写 channel 专属分支。
- 如果某种行为只对一种传输有意义，就把场景保持为传输特定，并在场景契约中明确说明。

### 场景 helper 名称

新场景推荐使用的通用 helper：

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

现有场景仍可使用兼容别名——`waitForQaChannelReady`、`waitForOutboundMessage`、`waitForNoOutbound`、`formatConversationTranscript`、`resetBus`——但新的场景编写应使用通用名称。这些别名是为了避免一次性迁移，而不是未来的发展方向。

## 报告

`qa-lab` 从观察到的总线时间线导出 Markdown 协议报告。报告应回答：

- 哪些成功
- 哪些失败
- 哪些保持阻塞
- 哪些后续场景值得添加

关于可用场景清单——在评估后续工作量或接入新传输时很有用——运行 `pnpm openclaw qa coverage`（加上 `--json` 可获得机器可读输出）。

对于角色和风格检查，在多个 live model
引用上运行同一个场景，并写出一份判定后的 Markdown 报告：

```bash
pnpm openclaw qa character-eval \
  --model openai/gpt-5.4,thinking=medium,fast \
  --model openai/gpt-5.2,thinking=xhigh \
  --model openai/gpt-5,thinking=xhigh \
  --model anthropic/claude-opus-4-6,thinking=high \
  --model anthropic/claude-sonnet-4-6,thinking=high \
  --model zai/glm-5.1,thinking=high \
  --model moonshot/kimi-k2.5,thinking=high \
  --model google/gemini-3.1-pro-preview,thinking=high \
  --judge-model openai/gpt-5.4,thinking=xhigh,fast \
  --judge-model anthropic/claude-opus-4-6,thinking=high \
  --blind-judge-models \
  --concurrency 16 \
  --judge-concurrency 16
```

该命令运行本地 QA gateway 子进程，而不是 Docker。角色评估场景应通过 `SOUL.md` 设置 persona，然后执行普通用户交互，例如聊天、工作区帮助和小型文件任务。候选模型不应被告知它正在被评估。该命令会保留每段完整转录，记录基本运行统计，然后在支持的情况下使用 `xhigh` 推理让裁判模型以 fast 模式对运行结果按自然度、氛围和幽默感进行排序。  
在比较 provider 时使用 `--blind-judge-models`：裁判提示词仍会收到每段转录和运行状态，但候选引用会被替换为中性标签，例如 `candidate-01`；报告会在解析后将排序映射回真实引用。  
候选运行默认使用 `high` thinking，而 GPT-5.4 使用 `medium`，较旧且支持该特性的 OpenAI 评估引用使用 `xhigh`。可通过 `--model provider/model,thinking=<level>` 覆盖某个具体候选。`--thinking <level>` 仍然会设置全局回退值，而较旧的 `--model-thinking <provider/model=level>` 形式则保留用于兼容。OpenAI 候选引用默认启用 fast 模式，因此在 provider 支持时会使用优先级处理。当单个候选或裁判需要覆盖时，可在行内添加 `,fast`、`,no-fast` 或 `,fast=false`。只有在你想强制所有候选模型都开启 fast 模式时，才传入 `--fast`。候选和裁判持续时间会记录在报告中用于基准分析，但裁判提示词明确说明不要按速度排序。  
候选和裁判模型运行都默认并发 16。当 provider 限制或本地 gateway 压力使运行过于嘈杂时，降低 `--concurrency` 或 `--judge-concurrency`。  
当未传入候选 `--model` 时，角色评估默认使用 `openai/gpt-5.4`、`openai/gpt-5.2`、`openai/gpt-5`、`anthropic/claude-opus-4-6`、`anthropic/claude-sonnet-4-6`、`zai/glm-5.1`、`moonshot/kimi-k2.5` 和 `google/gemini-3.1-pro-preview`。  
当未传入 `--judge-model` 时，裁判默认使用 `openai/gpt-5.4,thinking=xhigh,fast` 和 `anthropic/claude-opus-4-6,thinking=high`。

## 相关文档

- [Matrix QA](/concepts/qa-matrix)
- [QA Channel](/channels/qa-channel)
- [Testing](/help/testing)
- [Dashboard](/web/dashboard)
