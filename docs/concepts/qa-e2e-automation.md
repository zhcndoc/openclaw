---
summary: "用于 qa-lab、qa-channel、种子场景和协议报告的私有 QA 自动化框架"
read_when:
  - 扩展 qa-lab 或 qa-channel
  - 添加基于仓库的 QA 场景
  - 围绕 Gateway 仪表板构建更高真实度的 QA 自动化
title: "QA E2E 自动化"
---

私有 QA 技术栈旨在以比单元测试更真实、
更接近频道形态的方式来对 OpenClaw 进行验证。

当前组件：

- `extensions/qa-channel`：具有私信、频道、线程、反应、编辑和删除界面的合成消息频道。
- `extensions/qa-lab`：用于观察转录内容、注入入站消息以及导出 Markdown 报告的调试器 UI 和 QA 总线。
- `qa/`：用于启动任务和基线 QA 场景的基于仓库的种子资产。

当前的 QA 操作员流程是一个双窗格 QA 站点：

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
pnpm openclaw qa matrix
```

该通道会在 Docker 中部署一个一次性的 Tuwunel homeserver，注册临时 driver、SUT 和 observer 用户，创建一个私有房间，然后在 QA gateway 子进程中运行真实的 Matrix 插件。该实时传输通道会将子配置限定在正在测试的传输上，因此 Matrix 运行时在子配置中不会包含 `qa-channel`。它会将结构化报告工件和合并的 stdout/stderr 日志写入所选的 Matrix QA 输出目录。若要连同外层的 `scripts/run-node.mjs` 构建/启动器输出一起捕获，请设置 `OPENCLAW_RUN_NODE_OUTPUT_LOG=<path>` 指向仓库内的日志文件。Matrix 进度默认会打印。`OPENCLAW_QA_MATRIX_TIMEOUT_MS` 限制完整运行时长，而 `OPENCLAW_QA_MATRIX_CLEANUP_TIMEOUT_MS` 限制清理时长，以便卡住的 Docker 清理流程会报告确切的恢复命令，而不是一直挂起。

对于真实的 Telegram 冒烟测试通道，运行：

```bash
pnpm openclaw qa telegram
```

该通道针对一个真实的私有 Telegram 群组，而不是部署一次性服务器。它需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和 `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`，并且要求同一个私有群组中有两个不同的机器人。SUT 机器人必须拥有 Telegram 用户名，而当两个机器人都在 `@BotFather` 中启用了 Bot-to-Bot Communication Mode 时，bot-to-bot 观察效果最佳。  
当任何场景失败时，该命令会以非零状态退出。若你想在不返回失败退出码的情况下获取工件，请使用 `--allow-failures`。  
Telegram 报告和摘要会包含每次回复的 RTT，即从 driver 消息发送请求到观测到 SUT 回复之间的时间，从 canary 开始统计。

在使用共享的实时凭据之前，请运行：

```bash
pnpm openclaw qa credentials doctor
```

该 doctor 会检查 Convex broker 环境，验证端点设置，并在维护者密钥存在时验证 admin/list 可达性。它只会报告密钥的已设置/缺失状态。

对于真实传输的 Discord smoke 通道，运行：

```bash
pnpm openclaw qa discord
```

该通道针对一个真实的私有 Discord guild 频道，使用两个机器人：一个由 harness 控制的 driver 机器人，以及一个由子 OpenClaw gateway 通过随附的 Discord 插件启动的 SUT 机器人。使用环境变量凭据时，它需要 `OPENCLAW_QA_DISCORD_GUILD_ID`、`OPENCLAW_QA_DISCORD_CHANNEL_ID`、`OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`、`OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`，以及 `OPENCLAW_QA_DISCORD_SUT_APPLICATION_ID`。  
该通道会验证频道提及处理，并检查 SUT 机器人是否已在 Discord 上注册了原生 `/help` 命令。  
当任何场景失败时，该命令会以非零状态退出。若你想在不返回失败退出码的情况下获取工件，请使用 `--allow-failures`。

实时传输通道现在共享一个更小的契约，而不是各自发明自己的场景列表形状：

`qa-channel` 仍然是广泛的合成产品行为套件，不属于实时传输覆盖矩阵的一部分。

| Lane     | Canary | Mention gating | Allowlist block | Top-level reply | Restart resume | Thread follow-up | Thread isolation | Reaction observation | Help command | Native command registration |
| -------- | ------ | -------------- | --------------- | --------------- | -------------- | ---------------- | ---------------- | -------------------- | ------------ | --------------------------- |
| Matrix   | x      | x              | x               | x               | x              | x                | x                | x                    |              |                             |
| Telegram | x      | x              |                 |                 |                |                  |                  |                      | x            |                             |
| Discord  | x      | x              |                 |                 |                |                  |                  |                      |              | x                           |

这使得 `qa-channel` 保持为广泛的产品行为套件，而 Matrix、Telegram 和未来的实时传输共享一个明确的传输契约检查列表。

对于不带 Docker 进入 QA 路径的一次性 Linux VM 通道，运行：

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

这会启动一个全新的 Multipass 客户机，安装依赖，在客户机内部构建 OpenClaw，运行 `qa suite`，然后将正常的 QA 报告和摘要复制回主机上的 `.artifacts/qa-e2e/...`。  
它复用了与主机上 `qa suite` 相同的场景选择行为。  
主机和 Multipass 的 suite 运行默认会使用隔离的 gateway worker 并行执行多个所选场景。`qa-channel` 默认并发数为 4，且上限受所选场景数量限制。使用 `--concurrency <count>` 调整 worker 数量，或使用 `--concurrency 1` 进行串行执行。  
若任何场景失败，该命令会以非零状态退出。若你想在不返回失败退出码的情况下获取产物，请使用 `--allow-failures`。  
实时运行会转发对客户机来说实用的受支持 QA 认证输入：基于环境变量的 provider key、QA live provider 配置路径，以及在存在时的 `CODEX_HOME`。请将 `--output-dir` 保持在仓库根目录下，以便客户机可以通过挂载的工作区写回数据。

## 基于仓库的种子

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

`qa-lab` 拥有用于 markdown QA 场景的通用传输接缝。`qa-channel` 是该接缝上的第一个适配器，但设计目标更广泛：未来的真实或合成通道应插入相同的套件运行器，而不是添加特定于传输的 QA 运行器。

在架构级别，拆分如下：

- `qa-lab` 拥有通用场景执行、工作程序并发、工件写入和报告。
- 传输适配器拥有 gateway 配置、就绪状态、入站和出站观察、传输操作和标准化传输状态。
- `qa/scenarios/` 下的 markdown 场景文件定义测试运行；`qa-lab` 提供执行它们的可重用运行时表面。

新通道适配器的维护者采用指南位于 [测试](/help/testing#adding-a-channel-to-qa)。

## 报告

`qa-lab` 从观察到的总线时间线导出 Markdown 协议报告。报告应回答：

- 哪些成功
- 哪些失败
- 哪些保持阻塞
- 哪些后续场景值得添加

对于角色和风格检查，在多个实时模型引用上运行相同的场景，并编写经过评判的 Markdown 报告：

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

- [测试](/help/testing)
- [QA 频道](/channels/qa-channel)
- [仪表板](/web/dashboard)
