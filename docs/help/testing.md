---
summary: "测试工具包：单元/e2e/live 套件、Docker 运行器，以及每类测试覆盖的内容"
read_when:
  - 在本地或 CI 中运行测试时
  - 为模型/提供方错误添加回归测试时
  - 调试 gateway + agent 行为时
title: "测试"
---

OpenClaw 有三个 Vitest 套件（unit/integration、e2e、live）以及一小组
Docker 运行器。本文档是一份“我们如何测试”的指南：

- 每个套件覆盖什么内容（以及它刻意不覆盖什么）。
- 常见工作流（本地、pre-push、调试）该运行哪些命令。
- live 测试如何发现凭证并选择模型/提供方。
- 如何为真实世界的模型/提供方问题添加回归测试。

<Note>
**QA 栈（qa-lab、qa-channel、live transport lanes）** 另有文档说明：

- [QA 概览](/concepts/qa-e2e-automation) - 架构、命令入口、场景编写。
- [Matrix QA](/concepts/qa-matrix) - `pnpm openclaw qa matrix` 参考文档。
- [QA 通道](/channels/qa-channel) - 仓库回放场景使用的合成传输插件。

本页介绍如何运行常规测试套件以及 Docker/Parallels 运行器。下面的 QA 专用运行器部分（[QA 专用运行器](#qa-specific-runners)）列出了具体的 `qa` 调用方式，并会链接回上面的参考文档。
</Note>

## 快速开始

大多数时候：

- 完整门禁（推送前预期运行）：`pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- 在资源充足的机器上更快的本地全套运行：`pnpm test:max`
- 直接的 Vitest watch 循环：`pnpm test:watch`
- 直接指定文件现在也会路由 extension/channel 路径：`pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- 在迭代单个失败时，优先先做定向运行。
- Docker 版 QA site：`pnpm qa:lab:up`
- Linux VM 版 QA lane：`pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

当你修改测试或想要额外信心时：

- 覆盖率门禁：`pnpm test:coverage`
- E2E 套件：`pnpm test:e2e`

当你调试真实提供方/模型（需要真实凭证）时：

- Live 套件（模型 + gateway 工具/图像探针）：`pnpm test:live`
- 静默运行单个 live 文件：`pnpm test:live -- src/agents/models.profiles.live.test.ts`
- 运行时性能报告：发送 `OpenClaw Performance`，并带上
  `live_openai_candidate=true` 用于一次真实的 `openai/gpt-5.5` agent 回合，或
  `deep_profile=true` 用于 Kova 的 CPU/heap/trace 产物。每日定时运行会在配置了
  `CLAWGRIT_REPORTS_TOKEN` 时将 mock-provider、deep-profile 和 GPT 5.5 lane 产物发布到
  `openclaw/clawgrit-reports`。mock-provider 报告还包括源级 gateway 启动、内存、
  plugin-pressure、重复 fake-model hello-loop 以及 CLI 启动数值。
- Docker live model sweep：`pnpm test:docker:live-models`
  - 每个被选中的模型现在都会运行一次文本回合以及一个小型文件读取式探针。
    元数据声明了 `image` 输入的模型还会运行一个微型图像回合。
    在隔离提供方故障时，可通过 `OPENCLAW_LIVE_MODEL_FILE_PROBE=0` 或
    `OPENCLAW_LIVE_MODEL_IMAGE_PROBE=0` 禁用额外探针。
  - CI 覆盖：每日的 `OpenClaw Scheduled Live And E2E Checks` 和手动的
    `OpenClaw Release Checks` 都会调用可复用的 live/E2E workflow，并设置
    `include_live_suites: true`，其中包括按提供方分片的独立 Docker live model matrix 作业。
  - 若要进行聚焦的 CI 重跑，可触发 `OpenClaw Live And E2E Checks (Reusable)`
    并设置 `include_live_suites: true` 和 `live_models_only: true`。
  - 将新的高信号提供方密钥添加到 `scripts/ci-hydrate-live-auth.sh`
    以及 `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml` 和其
    scheduled/release 调用者中。
- 原生 Codex 绑定聊天冒烟：`pnpm test:docker:live-codex-bind`
  - 运行一个针对 Codex app-server 路径的 Docker live lane，使用 `/codex bind`
    绑定一个合成 Slack DM，执行 `/codex fast` 和
    `/codex permissions`，然后验证普通回复以及图像附件通过原生插件绑定而不是 ACP 路由。
- Codex app-server harness 冒烟：`pnpm test:docker:live-codex-harness`
  - 通过插件拥有的 Codex app-server harness 运行 gateway agent 回合，
    验证 `/codex status` 和 `/codex models`，并默认执行图像、cron MCP、sub-agent 和 Guardian 探针。
    在隔离其他 Codex app-server 故障时，可通过
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=0` 禁用 sub-agent 探针。
    若要进行聚焦的 sub-agent 检查，可禁用其他探针：
    `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1 pnpm test:docker:live-codex-harness`。
    除非设置了
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_ONLY=0`，否则它会在 sub-agent 探针后退出。
- Codex 按需安装冒烟：`pnpm test:docker:codex-on-demand`
  - 在 Docker 中安装打包后的 OpenClaw tarball，运行 OpenAI API key
    onboarding，并验证 Codex 插件以及 `@openai/codex` 依赖是否已按需下载到受管理的 npm root 中。
- Live 插件工具依赖冒烟：`pnpm test:docker:live-plugin-tool`
  - 将一个带有真实 `slugify` 依赖的 fixture 插件打包，并通过
    `npm-pack:` 安装它，验证受管理 npm root 下的依赖，然后要求一个
    live OpenAI 模型调用插件工具并返回隐藏的 slug。
- Crestodian rescue 命令冒烟：`pnpm test:live:crestodian-rescue-channel`
  - 面向消息通道 rescue 命令表面的可选加固检查。它会执行 `/crestodian status`，
    排队一个持久化模型变更，回复 `/crestodian yes`，并验证审计/配置写入路径。
- Crestodian planner Docker 冒烟：`pnpm test:docker:crestodian-planner`
  - 在无配置容器中运行 Crestodian，PATH 上提供一个假的 Claude CLI，
    并验证模糊 planner 回退会转换为经过审计的类型化配置写入。
- Crestodian 首次运行 Docker 冒烟：`pnpm test:docker:crestodian-first-run`
  - 从空的 OpenClaw 状态目录开始，验证现代 onboard Crestodian 入口点，
    应用 setup/model/agent/Discord plugin + SecretRef 写入，校验配置，并验证审计条目。
    同样的 Ring 0 setup 路径也已在 QA Lab 中由
    `pnpm openclaw qa suite --scenario crestodian-ring-zero-setup` 覆盖。
- Moonshot/Kimi 成本冒烟：在设置了 `MOONSHOT_API_KEY` 的情况下，运行
  `openclaw models list --provider moonshot --json`，然后运行一个隔离的
  `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json`
  。验证 JSON 报告 Moonshot/K2.6，并且 assistant transcript 存储了归一化的
  `usage.cost`。

<Tip>
当你只需要一个失败案例时，优先使用下面描述的 allowlist 环境变量缩小 live 测试范围。
</Tip>

## QA 专用运行器

当你需要更接近 QA-lab 真实环境时，这些命令可与主测试套件并列使用：

CI 会在专门的工作流中运行 QA Lab。Agentic parity 嵌套在
`QA-Lab - All Lanes` 和 release validation 之下，而不是一个独立的 PR 工作流。
广泛验证应使用 `Full Release Validation` 并设置
`rerun_group=qa-parity`，或使用 release-checks QA group。稳定/默认 release
checks 会通过 `run_release_soak=true` 保留完整的 live/Docker soak；
`full` profile 会强制开启 soak。`QA-Lab - All Lanes`
在 `main` 分支上每晚运行，并可通过手动触发运行 mock parity lane、live
Matrix lane、Convex 托管的 live Telegram lane，以及 Convex 托管的 live Discord
lane，作为并行作业。Scheduled QA 和 release checks 会显式传入 Matrix
`--profile fast`，而 Matrix CLI 与手动 workflow 输入的默认值仍然是 `all`；手动触发可以把 `all` 分片成 `transport`、
`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli` 作业。`OpenClaw Release
Checks` 在发布批准前会先运行 parity、fast Matrix 和 Telegram lanes，并使用
`mock-openai/gpt-5.5` 执行 release transport checks，使其保持确定性并避免正常的提供方插件启动。这些 live transport
gateway 会禁用 memory search；memory 行为仍由 QA parity 套件覆盖。

完整的发布 live media 分片使用
`ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`，其中已包含
`ffmpeg` 和 `ffprobe`。Docker live 模型/backend 分片使用共享的
`ghcr.io/openclaw/openclaw-live-test:<sha>` 镜像，该镜像针对所选提交只构建一次，
然后通过 `OPENCLAW_SKIP_DOCKER_BUILD=1` 拉取，而不是在每个分片内重新构建。

- `pnpm openclaw qa suite`
  - 直接在主机上运行仓库支持的 QA 场景。
  - 默认使用隔离的 gateway worker 并行运行多个已选场景。`qa-channel` 默认并发为 4（受所选场景数量限制）。使用 `--concurrency <count>` 调整 worker 数量，或使用 `--concurrency 1` 进入旧的串行 lane。
  - 当任一场景失败时以非零退出。若想保留产物但不以失败码退出，可使用 `--allow-failures`。
  - 支持提供方模式 `live-frontier`、`mock-openai` 和 `aimock`。`aimock` 会启动一个本地、基于 AIMock 的提供方服务器，用于实验性 fixture 和协议 mock 覆盖，而不会替代具备场景感知的 `mock-openai` lane。
- `pnpm openclaw qa coverage --match <query>`
  - 搜索场景 ID、标题、surface、coverage ID、文档引用、代码引用、插件和提供方要求，然后打印匹配的 suite 目标。
  - 当你知道受影响的行为或文件路径，但不知道最小场景时，在运行 QA Lab 之前先用它。它仅供参考；仍然应根据被修改的行为选择 mock、live、Multipass、Matrix 或 transport proof。
- `pnpm test:plugins:kitchen-sink-live`
  - 通过 QA Lab 运行 live OpenAI Kitchen Sink plugin gauntlet。它会安装外部 Kitchen Sink 包，验证插件 SDK surface inventory，探测 `/healthz` 和 `/readyz`，记录 gateway CPU/RSS 证据，运行一次 live OpenAI 轮次，并检查 adversarial diagnostics。
    需要 live OpenAI 认证，例如 `OPENAI_API_KEY`。在已注入凭证的 Testbox 会话中，当存在 `openclaw-testbox-env` helper 时，它会自动加载 Testbox live-auth profile。
- `pnpm test:gateway:cpu-scenarios`
  - 运行 gateway 启动基准测试以及一小组 mock QA Lab 场景包
    （`channel-chat-baseline`、`memory-failure-fallback`、
    `gateway-restart-inflight-run`），并在 `.artifacts/gateway-cpu-scenarios/`
    下写出一个合并后的 CPU 观察摘要。
  - 默认仅标记持续性的高 CPU 观察（`--cpu-core-warn`
    加上 `--hot-wall-warn-ms`），因此短暂的启动峰值会被记录为指标，
    不会看起来像持续数分钟的 gateway 占满回归。
  - 使用已构建的 `dist` 产物；如果 checkout 中还没有新的运行时输出，请先执行 build。
- `pnpm openclaw qa suite --runner multipass`
  - 在一个可丢弃的 Multipass Linux VM 中运行相同的 QA suite。
  - 保持与主机上的 `qa suite` 相同的场景选择行为。
  - 复用与 `qa suite` 相同的 provider/model 选择标志。
  - live 运行会转发对 guest 实用的受支持 QA auth 输入：
    基于环境变量的提供方密钥、QA live provider 配置路径，以及存在时的 `CODEX_HOME`。
  - 输出目录必须保留在仓库根目录下，以便 guest 能通过挂载的工作区回写。
  - 在 `.artifacts/qa-e2e/...` 下写入常规 QA 报告 + 摘要以及 Multipass 日志。
- `pnpm qa:lab:up`
  - 启动 Docker 版 QA site，用于操作员式 QA 工作。
- `pnpm test:docker:npm-onboard-channel-agent`
  - 从当前 checkout 打包并安装一个 npm tarball 到 Docker 中，全局安装，运行非交互式 OpenAI API key onboarding，默认配置 Telegram，验证打包后的插件运行时能在无需启动时依赖修复的情况下加载，运行 doctor，并针对一个 mocked OpenAI 端点执行一次本地 agent 轮次。
  - 使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 可用 Discord 运行相同的已打包安装 lane。
- `pnpm test:docker:session-runtime-context`
  - 为嵌入式 runtime context transcript 运行一个确定性的 built-app Docker 冒烟。
    它验证隐藏的 OpenClaw runtime context 会以不可显示的自定义消息形式持久化，而不会泄露到可见的用户轮次中，
    然后构造一个受影响的损坏 session JSONL，并验证
    `openclaw doctor --fix` 会将其重写到当前分支并带有备份。
- `pnpm test:docker:npm-telegram-live`
  - 在 Docker 中安装一个 OpenClaw package 候选版本，运行已安装包的
    onboarding，通过已安装的 CLI 配置 Telegram，然后复用
    live Telegram QA lane，将该已安装包作为 SUT Gateway。
  - 包装器只从 checkout 挂载 `qa-lab` harness 源码；已安装包拥有 `dist`、`openclaw/plugin-sdk` 和 bundled plugin
    runtime，因此该 lane 不会把当前 checkout 的插件混入被测包中。
  - 默认值为 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@beta`；设置
    `OPENCLAW_NPM_TELEGRAM_PACKAGE_TGZ=/path/to/openclaw-current.tgz` 或
    `OPENCLAW_CURRENT_PACKAGE_TGZ` 可测试一个已解析的本地 tarball，而不是
    从 registry 安装。
  - 使用与 `pnpm openclaw qa telegram` 相同的 Telegram 环境凭证或 Convex 凭证源。用于 CI/release 自动化时，设置
    `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex`，再加上
    `OPENCLAW_QA_CONVEX_SITE_URL` 和角色密钥。如果
    `OPENCLAW_QA_CONVEX_SITE_URL` 和一个 Convex 角色密钥在 CI 中可用，
    Docker 包装器会自动选择 Convex。
  - 包装器会在 Docker build/install 之前先在主机上验证 Telegram 或 Convex 凭证环境。仅在你明确调试凭证前置步骤时才设置
    `OPENCLAW_NPM_TELEGRAM_SKIP_CREDENTIAL_PREFLIGHT=1`。
  - `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci|maintainer` 仅为此 lane 覆盖共享的
    `OPENCLAW_QA_CREDENTIAL_ROLE`。
  - GitHub Actions 将此 lane 作为手动维护者工作流
    `NPM Telegram Beta E2E` 暴露。它不会在合并时运行。该 workflow 使用
    `qa-live-shared` 环境和 Convex CI 凭证租约。
- GitHub Actions 还提供 `Package Acceptance`，用于针对单个候选包做旁路产品证明。它接受受信任的 ref、已发布的 npm spec、HTTPS tarball URL 加 SHA-256，或来自其他 run 的 tarball artifact，上传规范化后的 `openclaw-current.tgz` 作为 `package-under-test`，然后运行现有的 Docker E2E 调度器，使用 smoke、package、product、full 或 custom lane profiles。设置 `telegram_mode=mock-openai` 或 `live-frontier` 可针对同一 `package-under-test` artifact 运行 Telegram QA workflow。
  - 最新 beta 产品证明：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai
```

- 精确 tarball URL 证明需要摘要值，并使用公共 URL 安全策略：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=url \
  -f package_url=https://registry.npmjs.org/openclaw/-/openclaw-VERSION.tgz \
  -f package_sha256=<sha256> \
  -f suite_profile=package
```

- 企业/私有 tarball 镜像使用显式的受信任源策略：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=trusted-url \
  -f trusted_source_id=enterprise-artifactory \
  -f package_url=https://packages.example.internal:8443/artifactory/openclaw/openclaw-VERSION.tgz \
  -f package_sha256=<sha256> \
  -f suite_profile=package
```

`source=trusted-url` 会从受信任的 workflow ref 读取 `.github/package-trusted-sources.json`，且不接受 URL 凭证或 workflow 输入的私有网络绕过。如果命名策略声明了 bearer auth，请配置固定的 `OPENCLAW_TRUSTED_PACKAGE_TOKEN` 密钥。

- Artifact 证明会从另一个 Actions run 下载 tarball artifact：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=artifact \
  -f artifact_run_id=<run-id> \
  -f artifact_name=<artifact-name> \
  -f suite_profile=smoke
```

- `pnpm test:docker:plugins`
  - 在 Docker 中打包并安装当前 OpenClaw 构建，使用已配置 OpenAI 启动 Gateway，然后通过配置编辑启用随包附带的 channel/plugins。
  - 验证 setup discovery 不会显示未配置的可下载插件，第一次配置后的 doctor 修复会显式安装每个缺失的可下载插件，第二次重启不会运行隐藏的依赖修复。
  - 还会安装一个已知的旧 npm 基线，在运行 `openclaw update --tag <candidate>` 之前启用 Telegram，并验证候选版本更新后的 doctor 会清理旧版插件依赖残留，而不会在 harness 侧进行 postinstall 修复。
- `pnpm test:parallels:npm-update`
  - 在 Parallels guest 上运行原生打包安装更新冒烟。每个被选中的平台会先安装所请求的基线包，然后在同一个 guest 中运行已安装的 `openclaw update` 命令，并验证已安装版本、更新状态、gateway 就绪状态以及一次本地 agent 轮次。
  - 在只迭代一个 guest 时，使用 `--platform macos`、`--platform windows` 或 `--platform linux`。使用 `--json` 获取摘要 artifact 路径和每个 lane 的状态。
  - 默认情况下，OpenAI lane 会使用 `openai/gpt-5.5` 作为 live agent-turn 验证。若要刻意验证其他 OpenAI 模型，请传入 `--model <provider/model>` 或设置 `OPENCLAW_PARALLELS_OPENAI_MODEL`。
  - 将较长的本地运行包裹在 host timeout 中，以免 Parallels 传输卡住而耗尽剩余测试窗口：

    ```bash
    timeout --foreground 150m pnpm test:parallels:npm-update -- --json
    timeout --foreground 90m pnpm test:parallels:npm-update -- --platform windows --json
    ```

  - 该脚本会在 `/tmp/openclaw-parallels-npm-update.*` 下写入嵌套的 lane 日志。
    在假定外层包装器卡住之前，请检查 `windows-update.log`、`macos-update.log` 或
    `linux-update.log`。
  - Windows 更新在冷 guest 上的 post-update doctor 和 package
    update 工作中可能会花费 10 到 15 分钟；只要嵌套的 npm
    debug log 还在前进，这仍然是正常的。
  - 不要将此聚合包装器与单独的 Parallels macOS、Windows 或 Linux 冒烟 lanes 并行运行。它们共享 VM 状态，可能在 snapshot restore、package serving 或 guest gateway state 上发生冲突。
  - post-update 证明会运行正常的 bundled plugin surface，因为像 speech、image generation 和 media
    understanding 这样的 capability facades 即使在 agent
    轮次本身只检查简单文本回复时，也会通过 bundled runtime APIs 加载。

- `pnpm openclaw qa aimock`
  - 仅启动本地 AIMock 提供方服务器，用于直接的协议冒烟测试。
- `pnpm openclaw qa matrix`
  - 在一个可丢弃的、由 Docker 支持的 Tuwunel homeserver 上运行 Matrix live QA lane。仅限源码 checkout——已打包安装不包含 `qa-lab`。
  - 完整 CLI、profile/scenario 目录、环境变量和产物布局： [Matrix QA](/concepts/qa-matrix)。
- `pnpm openclaw qa telegram`
  - 使用来自环境变量的 driver 和 SUT bot tokens，在真实私有群组上运行 Telegram live QA lane。
  - 需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和 `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`。group id 必须是数字形式的 Telegram chat id。
  - 支持 `--credential-source convex` 以使用共享的池化凭证。默认使用 env 模式，或设置 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` 以启用池化租约。
  - 默认覆盖 canary、mention gating、command addressing、`/status`、bot-to-bot mentioned replies，以及核心 native command replies。`mock-openai` 默认值还覆盖确定性的 reply-chain 和 Telegram final-message streaming 回归。使用 `--list-scenarios` 查看可选探针，例如 `session_status`。
  - 当任一场景失败时退出非零。想保留产物但不以失败码退出时使用 `--allow-failures`。
  - 需要同一个私有群组中的两个不同机器人，并且 SUT bot 必须暴露 Telegram username。
  - 为了稳定地观察 bot-to-bot 行为，请在两个机器人上都于 `@BotFather` 启用 Bot-to-Bot Communication Mode，并确保 driver bot 可以观察群组机器人流量。
  - 在 `.artifacts/qa-e2e/...` 下写入 Telegram QA 报告、摘要以及 observed-messages 产物。回复类场景会包含从 driver 发送请求到观察到 SUT 回复的 RTT。

`Mantis Telegram Live` 是此 lane 的 PR 证据包装器。它会使用 Convex 租用的 Telegram 凭证运行候选 ref，在 Crabbox 桌面浏览器中渲染脱敏后的 observed-message 转录，录制 MP4 证据，生成 motion-trim GIF，上传产物包，并在设置了 `pr_number` 时通过 Mantis GitHub App 以内联方式发布 PR 证据。维护者可以通过 Actions UI 中的 `Mantis Scenario`（`scenario_id: telegram-live`）启动它，或直接在 pull request 评论中触发：

```text
@openclaw-mantis telegram
@openclaw-mantis telegram scenario=telegram-status-command
@openclaw-mantis telegram scenarios=telegram-status-command,telegram-mentioned-message-reply
```

`Mantis Telegram Desktop Proof` 是用于 PR 可视化证据的 agentic 原生 Telegram Desktop before/after 包装器。可以通过 Actions UI 传入自由格式的 `instructions` 启动，或通过 `Mantis Scenario`（`scenario_id: telegram-desktop-proof`）启动，或者通过 PR 评论启动：

```text
@openclaw-mantis telegram desktop proof
```

Mantis agent 会读取 PR，决定什么样的 Telegram 可见行为能够证明改动，运行基线和候选 ref 的真实用户 Crabbox Telegram Desktop proof lane，反复迭代直到原生 GIF 具有足够说明力，写入成对的 `motionPreview` 清单，并在设置了 `pr_number` 时通过 Mantis GitHub App 发布同样的双栏 GIF 表格。

- `pnpm openclaw qa mantis telegram-desktop-builder`
  - 租用或复用一个 Crabbox Linux 桌面，安装原生 Telegram Desktop，使用租用的 Telegram SUT bot token 配置 OpenClaw，启动 gateway，并从可见的 VNC 桌面录制截图/MP4 证据。
  - 默认使用 `--credential-source convex`，因此工作流只需要 Convex broker secret。配合 `pnpm openclaw qa telegram` 相同的 `OPENCLAW_QA_TELEGRAM_*` 变量时，使用 `--credential-source env`。
  - Telegram Desktop 仍需要用户登录/配置文件。bot token 只用于配置 OpenClaw。使用 `--telegram-profile-archive-env <name>` 传入 base64 的 `.tgz` 配置文件归档，或使用 `--keep-lease` 并通过 VNC 手动登录一次。
  - 在输出目录下写入 `mantis-telegram-desktop-builder-report.md`、`mantis-telegram-desktop-builder-summary.json`、`telegram-desktop-builder.png` 和 `telegram-desktop-builder.mp4`。

Live transport lanes 共享一个标准契约，因此新的传输不会偏离；每个 lane 的覆盖矩阵位于 [QA 概览 → Live transport coverage](/concepts/qa-e2e-automation#live-transport-coverage)。`qa-channel` 是更广泛的合成套件，不属于该矩阵。

### 通过 Convex 共享 Telegram 凭证（v1）

当 `--credential-source convex`（或 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）为 live transport QA 启用时，QA lab 会从一个由 Convex 支持的池中获取独占租约，在 lane 运行期间对该租约发送心跳，并在关闭时释放租约。该节名称早于 Discord、Slack 和 WhatsApp 支持；租约契约在各类之间是共享的。

参考 Convex 项目骨架：

- `qa/convex-credential-broker/`

必需环境变量：

- `OPENCLAW_QA_CONVEX_SITE_URL`（例如 `https://your-deployment.convex.site`）
- 针对所选角色的一个密钥：
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 对应 `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` 对应 `ci`
- 凭证角色选择：
  - CLI：`--credential-role maintainer|ci`
  - 环境默认值：`OPENCLAW_QA_CREDENTIAL_ROLE`（CI 中默认为 `ci`，否则默认为 `maintainer`）

可选环境变量：

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS`（默认 `1200000`）
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS`（默认 `30000`）
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS`（默认 `90000`）
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS`（默认 `15000`）
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX`（默认 `/qa-credentials/v1`）
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID`（可选 trace id）
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` 允许仅用于本地开发的 loopback `http://` Convex URL。

`OPENCLAW_QA_CONVEX_SITE_URL` 在正常运行中应使用 `https://`。

维护者管理命令（pool add/remove/list）需要
`OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`。

面向维护者的 CLI 辅助命令：

```bash
pnpm openclaw qa credentials doctor
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

在 live 运行前先使用 `doctor` 检查 Convex site URL、broker 密钥、
endpoint prefix、HTTP timeout 以及 admin/list 可达性，而不会打印
密钥值。脚本和 CI 工具中可使用 `--json` 以获得机器可读输出。

默认 endpoint 契约（`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`）：

- `POST /acquire`
  - 请求：`{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - 成功：`{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - 耗尽/可重试：`{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
- `POST /payload-chunk`
  - 请求：`{ kind, ownerId, actorRole, credentialId, leaseToken, index }`
  - 成功：`{ status: "ok", index, data }`
- `POST /heartbeat`
  - 请求：`{ kind, ownerId, actorRole, credentialId, leaseToken, leaseTtlMs }`
  - 成功：`{ status: "ok" }`（或空的 `2xx`）
- `POST /release`
  - 请求：`{ kind, ownerId, actorRole, credentialId, leaseToken }`
  - 成功：`{ status: "ok" }`（或空的 `2xx`）
- `POST /admin/add`（仅 maintainer 密钥）
  - 请求：`{ kind, actorId, payload, note?, status? }`
  - 成功：`{ status: "ok", credential }`
- `POST /admin/remove`（仅 maintainer 密钥）
  - 请求：`{ credentialId, actorId }`
  - 成功：`{ status: "ok", changed, credential }`
  - 活跃租约保护：`{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list`（仅 maintainer 密钥）
  - 请求：`{ kind?, status?, includePayload?, limit? }`
  - 成功：`{ status: "ok", credentials, count }`

Telegram kind 的 payload 结构：

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` 必须是数字形式的 Telegram chat id 字符串。
- `admin/add` 会校验 `kind: "telegram"` 的该结构，并拒绝格式错误的 payload。

Telegram real-user kind 的 payload 结构：

- `{ groupId: string, sutToken: string, testerUserId: string, testerUsername: string, telegramApiId: string, telegramApiHash: string, tdlibDatabaseEncryptionKey: string, tdlibArchiveBase64: string, tdlibArchiveSha256: string, desktopTdataArchiveBase64: string, desktopTdataArchiveSha256: string }`
- `groupId`、`testerUserId` 和 `telegramApiId` 必须是数字字符串。
- `tdlibArchiveSha256` 和 `desktopTdataArchiveSha256` 必须是 SHA-256 十六进制字符串。
- `kind: "telegram-user"` 为 Mantis Telegram Desktop proof 工作流保留。通用 QA Lab lanes 不得获取它。

经 broker 验证的多通道 payload：

- Discord: `{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string, voiceChannelId?: string }`
- WhatsApp: `{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }`

Slack lane 也可以从池中租用，不过 Slack payload 验证目前位于 Slack QA 运行器中，而不是 broker 中。Slack 行请使用
`{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`。

### 向 QA 添加一个 channel

新 channel adapter 的架构和 scenario-helper 名称位于 [QA 概览 → 添加一个 channel](/concepts/qa-e2e-automation#adding-a-channel)。最低要求：在共享的 `qa-lab` host seam 上实现传输运行器，在插件清单中声明 `qaRunners`，通过 `openclaw qa <runner>` 挂载，并在 `qa/scenarios/` 下编写场景。

## 测试套件（在哪运行什么）

将这些套件看作“越来越接近真实环境”（同时也越来越不稳定/昂贵）：

### 单元 / 集成（默认）

- 命令：`pnpm test`
- 配置：未定向运行会使用 `vitest.full-*.config.ts` 分片集合，并可能将多项目分片展开为按项目配置，以便并行调度
- 文件：`src/**/*.test.ts`、`packages/**/*.test.ts` 和 `test/**/*.test.ts` 下的核心/单元清单；UI 单元测试在专用的 `unit-ui` 分片中运行
- 范围：
  - 纯单元测试
  - 进程内集成测试（网关认证、路由、工具、解析、配置）
  - 已知缺陷的确定性回归测试
- 预期：
  - 在 CI 中运行
  - 不需要真实密钥
  - 应该快速且稳定
  - 解析器和公共表面加载器测试必须通过生成的微型插件夹具，证明广泛的 `api.js` 和
    `runtime-api.js` 回退行为，而不是依赖真实打包后的插件源码 API。真实插件 API 加载应归入
    由插件拥有的契约/集成套件。

本地依赖策略：

- 默认测试安装会跳过可选的原生 Discord opus 构建。Discord 语音使用捆绑的 `libopus-wasm`，而 `@discordjs/opus` 会在 `allowBuilds` 中保持禁用，因此本地测试和 Testbox 通道不会编译原生插件。
- 请在 `libopus-wasm` 基准仓库中比较原生 opus 性能，不要在默认的 OpenClaw 安装/测试循环中比较。不要在默认的 `allowBuilds` 中将 `@discordjs/opus` 设为 `true`；那样会让无关的安装/测试循环编译原生代码。

<AccordionGroup>
  <Accordion title="项目、分片与受限通道">

    - 未定向的 `pnpm test` 会运行十二个更小的分片配置（`core-unit-fast`、`core-unit-src`、`core-unit-security`、`core-unit-ui`、`core-unit-support`、`core-support-boundary`、`core-contracts`、`core-bundled`、`core-runtime`、`agentic`、`auto-reply`、`extensions`），而不是一个巨大的原生根项目进程。这样可以降低加载较重机器上的峰值 RSS，并避免 auto-reply/扩展工作饿死无关套件。
    - `pnpm test --watch` 仍然使用原生根 `vitest.config.ts` 项目图，因为多分片 watch 循环并不实际。
    - `pnpm test`、`pnpm test:watch` 和 `pnpm test:perf:imports` 会先通过受限通道路由显式的文件/目录目标，因此 `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` 不会承担完整根项目启动成本。
    - `pnpm test:changed` 默认会把变更的 git 路径展开为廉价的受限通道：直接测试编辑、同级 `*.test.ts` 文件、显式源码映射，以及本地导入图依赖项。除非你显式使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`，否则配置/设置/包的编辑不会广泛运行测试。
    - `pnpm check:changed` 是窄范围工作的常规智能本地检查门禁。它会将差异分类为核心、核心测试、扩展、扩展测试、应用、文档、发布元数据、实时 Docker 工具以及工具，然后运行匹配的类型检查、lint 和守卫命令。它不会运行 Vitest 测试；如需测试证明，请调用 `pnpm test:changed` 或显式 `pnpm test <target>`。仅发布元数据的版本提升会运行定向的版本/配置/根依赖检查，并带有一个守卫，用于拒绝除顶层 version 字段之外的 package 变更。
    - 实时 Docker ACP 运行器编辑会运行聚焦检查：实时 Docker 认证脚本的 shell 语法，以及实时 Docker 调度器的 dry-run。只有当差异仅限于 `scripts["test:docker:live-*"]` 时才包含 `package.json` 变更；依赖、导出、版本以及其他包表面编辑仍然使用更宽的守卫。
    - 来自 agents、commands、plugins、auto-reply helpers、`plugin-sdk` 以及类似纯工具区域的轻导入单元测试，会通过 `unit-fast` 通道路由，该通道会跳过 `test/setup-openclaw-runtime.ts`；有状态/运行时较重的文件则保留在现有通道中。
    - 选定的 `plugin-sdk` 和 `commands` 辅助源码文件在变更模式运行时也会映射到这些轻通道中的显式同级测试，因此辅助代码的编辑不会因为该目录而重新运行完整的重型套件。
    - `auto-reply` 为顶层核心辅助程序、顶层 `reply.*` 集成测试，以及 `src/auto-reply/reply/**` 子树分别设置了专用桶。CI 还会把 reply 子树进一步拆分为 agent-runner、dispatch 和 commands/state-routing 分片，这样单个导入较重的桶就不会独占完整的 Node 尾部。
    - 常规 PR/main CI 会刻意跳过扩展批量扫描和仅发布用的 `agentic-plugins` 分片。完整发布验证会在发布候选版本上为这些偏插件/扩展的套件单独触发 `Plugin Prerelease` 子工作流。

  </Accordion>

  <Accordion title="嵌入式运行器覆盖">

    - 当你更改 message-tool 发现输入或压缩运行时
      上下文时，请保留两个层级的覆盖。
    - 为纯路由和归一化
      边界添加聚焦的辅助回归测试。
    - 保持嵌入式运行器集成套件健康：
      `src/agents/pi-embedded-runner/compact.hooks.test.ts`、
      `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts`，以及
      `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
    - 这些套件验证 scoped ids 和压缩行为仍然会通过真实的
      `run.ts` / `compact.ts` 路径流动；仅靠辅助测试
      不能替代这些集成路径。

  </Accordion>

  <Accordion title="Vitest 池和隔离默认值">

    - 基础 Vitest 配置默认使用 `threads`。
    - 共享 Vitest 配置固定 `isolate: false`，并在根项目、e2e 和 live 配置中使用
      非隔离运行器。
    - 根 UI 通道保留其 `jsdom` 设置和优化器，但也运行在
      共享的非隔离运行器上。
    - 每个 `pnpm test` 分片都会从共享 Vitest 配置继承相同的 `threads` + `isolate: false`
      默认值。
    - `scripts/run-vitest.mjs` 默认会为 Vitest 子 Node
      进程添加 `--no-maglev`，以减少大型本地运行期间的 V8 编译抖动。
      设置 `OPENCLAW_VITEST_ENABLE_MAGLEV=1` 可与原生 V8
      行为进行对比。
    - `scripts/run-vitest.mjs` 会在显式的非 watch Vitest 运行中，如果
      5 分钟内没有 stdout 或 stderr 输出，就终止进程。设置
      `OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=0` 可为有意静默的调查禁用此看门狗。

  </Accordion>

  <Accordion title="快速本地迭代">

    - `pnpm changed:lanes` 会显示某个差异触发了哪些架构通道。
    - pre-commit 钩子只做格式化。它会重新暂存已格式化的文件，
      不会运行 lint、类型检查或测试。
    - 在交接或推送前，如果需要智能本地检查门禁，请显式运行 `pnpm check:changed`。
    - `pnpm test:changed` 默认会通过廉价的受限通道路由。仅当代理
      判断某个运行器、配置、包或契约编辑确实需要更广泛的
      Vitest 覆盖时，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。
    - `pnpm test:max` 和 `pnpm test:changed:max` 保持相同的路由
      行为，只是提高了 worker 上限。
    - 本地 worker 自动缩放是有意保守的，并且在主机负载平均值已经较高时会退让，
      因此默认情况下多个并发 Vitest 运行造成的影响更小。
    - 基础 Vitest 配置将项目/配置文件标记为
      `forceRerunTriggers`，这样当测试
      连接方式变化时，变更模式的重新运行仍然正确。
    - 该配置在受支持的主机上保持启用 `OPENCLAW_VITEST_FS_MODULE_CACHE`；如果你想要
      一个用于直接分析的显式缓存位置，可设置 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`。

  </Accordion>

  <Accordion title="性能调试">

    - `pnpm test:perf:imports` 会启用 Vitest 导入耗时报告以及
      导入分解输出。
    - `pnpm test:perf:imports:changed` 会将相同的分析视图限定到
      自 `origin/main` 以来发生变化的文件。
    - 分片计时数据会写入 `.artifacts/vitest-shard-timings.json`。
      整体配置运行会使用配置路径作为键；包含模式的 CI
      分片会附加分片名称，以便可以分别跟踪过滤后的分片。
    - 当某个热点测试仍然把大部分时间花在启动导入上时，
      请把重依赖放在一个窄的本地 `*.runtime.ts` 边界之后，并直接 mock 该边界，
      而不是深度导入运行时辅助程序只是为了通过 `vi.mock(...)` 传递它们。
    - `pnpm test:perf:changed:bench -- --ref <git-ref>` 会把路由后的
      `test:changed` 与该已提交差异的原生根项目路径进行比较，并打印墙钟时间以及 macOS 最大 RSS。
    - `pnpm test:perf:changed:bench -- --worktree` 会通过
      `scripts/test-projects.mjs` 和根 Vitest 配置，对当前脏工作区进行基准测试。
    - `pnpm test:perf:profile:main` 会为 Vitest/Vite 启动和转换开销写入主线程 CPU profile。
    - `pnpm test:perf:profile:runner` 会为禁用文件并行性的单元套件写入运行器 CPU+heap profile。

  </Accordion>
</AccordionGroup>

### 稳定性（网关）

- 命令：`pnpm test:stability:gateway`
- 配置：`vitest.gateway.config.ts`，强制单 worker
- 范围：
  - 默认启用诊断并启动一个真实的回环 Gateway
  - 通过诊断事件路径驱动合成的网关消息、内存和大负载 churn
  - 通过 Gateway WS RPC 查询 `diagnostics.stability`
  - 覆盖诊断稳定性 bundle 持久化辅助程序
  - 断言记录器保持有界、合成 RSS 样本保持在压力预算之下，并且每个会话的队列深度回落到零
- 预期：
  - 对 CI 安全且无需密钥
  - 这是用于稳定性回归跟进的窄通道，不是完整 Gateway 套件的替代品

### E2E（仓库聚合）

- 命令：`pnpm test:e2e`
- 范围：
  - 运行 gateway smoke E2E 通道
  - 运行模拟的 Control UI 浏览器 E2E 通道
- 预期：
  - CI 安全且无需密钥
  - 需要安装 Playwright Chromium

### E2E（gateway smoke）

- 命令：`pnpm test:e2e:gateway`
- 配置：`vitest.e2e.config.ts`
- 文件：`src/**/*.e2e.test.ts`、`test/**/*.e2e.test.ts`，以及 `extensions/` 下打包插件的 E2E 测试
- 运行时默认值：
  - 使用 Vitest `threads` 且 `isolate: false`，与仓库其余部分一致。
  - 使用自适应 worker（CI：最多 2 个，本地：默认 1 个）。
  - 默认以静默模式运行，以降低控制台 I/O 开销。
- 有用的覆盖项：
  - `OPENCLAW_E2E_WORKERS=<n>` 用于强制 worker 数量（上限 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 用于重新启用详细控制台输出。
- 范围：
  - 多实例 gateway 端到端行为
  - WebSocket/HTTP 表面、节点配对，以及更重的网络行为
- 预期：
  - 在 CI 中运行（当流水线启用时）
  - 不需要真实密钥
  - 比单元测试有更多活动部件（可能更慢）

### E2E（Control UI 模拟浏览器）

- 命令：`pnpm test:ui:e2e`
- 配置：`test/vitest/vitest.ui-e2e.config.ts`
- 文件：`ui/src/**/*.e2e.test.ts`
- 范围：
  - 启动 Vite Control UI
  - 通过 Playwright 驱动真实的 Chromium 页面
  - 用确定性的浏览器内 mock 替换 Gateway WebSocket
- 预期：
  - 作为 `pnpm test:e2e` 的一部分在 CI 中运行
  - 不需要真实的 Gateway、agents 或 provider 密钥
  - 必须存在浏览器依赖（`pnpm --dir ui exec playwright install chromium`）

### E2E：OpenShell 后端 smoke

- 命令：`pnpm test:e2e:openshell`
- 文件：`extensions/openshell/src/backend.e2e.test.ts`
- 范围：
  - 通过 Docker 在主机上启动一个隔离的 OpenShell 网关
  - 从临时本地 Dockerfile 创建一个沙箱
  - 通过真实的 `sandbox ssh-config` + SSH exec 测试 OpenClaw 的 OpenShell 后端
  - 通过 sandbox fs 桥验证远端规范化的文件系统行为
- 预期：
  - 仅可选择启用；不属于默认的 `pnpm test:e2e` 运行
  - 需要本地 `openshell` CLI 以及可用的 Docker 守护进程
  - 使用隔离的 `HOME` / `XDG_CONFIG_HOME`，然后销毁测试网关和沙箱
- 有用的覆盖项：
  - `OPENCLAW_E2E_OPENSHELL=1` 用于在手动运行更广泛的 e2e 套件时启用该测试
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 用于指向非默认的 CLI 二进制文件或包装脚本

### Live（真实提供方 + 真实模型）

- 命令：`pnpm test:live`
- 配置：`vitest.live.config.ts`
- 文件：`src/**/*.live.test.ts`、`test/**/*.live.test.ts`，以及 `extensions/` 下打包插件的 live 测试
- 默认：由 `pnpm test:live` **启用**（会设置 `OPENCLAW_LIVE_TEST=1`）
- 范围：
  - “这个提供方/模型今天用真实凭据真的能工作吗？”
  - 捕获提供方格式变更、工具调用怪癖、认证问题和速率限制行为
- 预期：
  - 设计上不稳定于 CI（真实网络、真实提供方策略、配额、故障）
  - 会花钱 / 消耗速率限制
  - 优先运行缩小后的子集，而不是“全部”
- live 运行使用已导出的 API 密钥和预先配置的认证配置文件。
- 默认情况下，live 运行仍会隔离 `HOME`，并将配置/认证材料复制到临时测试 home，因此单元夹具不会修改你真实的 `~/.openclaw`。
- 只有当你有意需要 live 测试使用真实 home 目录时，才设置 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 默认采用更安静的模式：保留 `[live] ...` 进度输出，并静音网关启动日志/Bonjour 交谈。如果你想恢复完整启动日志，可设置 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 密钥轮换（按提供方区分）：将 `*_API_KEYS` 设为逗号/分号格式，或使用 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`），也可通过 `OPENCLAW_LIVE_*_KEY` 覆盖到单个 live 测试；测试会在速率限制响应后重试。
- 进度/心跳输出：
  - live 套件现在会向 stderr 输出进度行，因此即使 Vitest 控制台捕获很安静，较长的提供方调用也会明显处于活跃状态。
  - `vitest.live.config.ts` 会禁用 Vitest 控制台拦截，因此在 live 运行期间提供方/网关进度行会立即流式输出。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 调整直接模型心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 调整网关/探针心跳。

## 我应该运行哪个测试套件？

使用这个决策表：

- 编辑逻辑/测试：运行 `pnpm test`（如果你改动很多，再加上 `pnpm test:coverage`）
- 触碰 gateway 网络 / WS 协议 / 配对：再加上 `pnpm test:e2e`
- 调试“我的机器人挂了”/特定提供方失败/工具调用：运行缩小范围的 `pnpm test:live`

## Live（涉及网络）的测试

对于 live 模型矩阵、CLI 后端 smoke、ACP smoke、Codex app-server harness，以及所有媒体提供方 live 测试（Deepgram、BytePlus、ComfyUI、image、music、video、media harness）——外加 live 运行的凭据处理——请参见
[Testing live suites](/help/testing-live)。关于专门的更新与
插件验证清单，请参见
[Testing updates and plugins](/help/testing-updates-plugins)。

## Docker 运行器（可选的“在 Linux 上可用”检查）

这些 Docker 运行器分成两类：

- Live-model runners: `test:docker:live-models` and `test:docker:live-gateway` run only their matching profile-key live file inside the repo Docker image (`src/agents/models.profiles.live.test.ts` and `src/gateway/gateway-models.profiles.live.test.ts`), mounting your local config dir, workspace, and optional profile env file. The matching local entrypoints are `test:live:models-profiles` and `test:live:gateway-profiles`.
- Docker live runners default to a smaller smoke cap so a full Docker sweep stays practical:
  `test:docker:live-models` defaults to `OPENCLAW_LIVE_MAX_MODELS=12`, and
  `test:docker:live-gateway` defaults to `OPENCLAW_LIVE_GATEWAY_SMOKE=1`,
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`,
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000`, and
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`. Override those env vars when you
  explicitly want the larger exhaustive scan.
- `test:docker:all` builds the live Docker image once via `test:docker:live-build`, packs OpenClaw once as an npm tarball through `scripts/package-openclaw-for-docker.mjs`, then builds/reuses two `scripts/e2e/Dockerfile` images. The bare image is only the Node/Git runner for install/update/plugin-dependency lanes; those lanes mount the prebuilt tarball. The functional image installs the same tarball into `/app` for built-app functionality lanes. Docker lane definitions live in `scripts/lib/docker-e2e-scenarios.mjs`; planner logic lives in `scripts/lib/docker-e2e-plan.mjs`; `scripts/test-docker-all.mjs` executes the selected plan. The aggregate uses a weighted local scheduler: `OPENCLAW_DOCKER_ALL_PARALLELISM` controls process slots, while resource caps keep heavy live, npm-install, and multi-service lanes from all starting at once. If a single lane is heavier than the active caps, the scheduler can still start it when the pool is empty and then keeps it running alone until capacity is available again. Defaults are 10 slots, `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`, `OPENCLAW_DOCKER_ALL_NPM_LIMIT=10`, and `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`; tune `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` or `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT` only when the Docker host has more headroom. The runner performs a Docker preflight by default, removes stale OpenClaw E2E containers, prints status every 30 seconds, stores successful lane timings in `.artifacts/docker-tests/lane-timings.json`, and uses those timings to start longer lanes first on later runs. Use `OPENCLAW_DOCKER_ALL_DRY_RUN=1` to print the weighted lane manifest without building or running Docker, or `node scripts/test-docker-all.mjs --plan-json` to print the CI plan for selected lanes, package/image needs, and credentials.
- `Package Acceptance` is the GitHub-native package gate for "does this installable tarball work as a product?" It resolves one candidate package from `source=npm`, `source=ref`, `source=url`, or `source=artifact`, uploads it as `package-under-test`, then runs the reusable Docker E2E lanes against that exact tarball instead of repacking the selected ref. Profiles are ordered by breadth: `smoke`, `package`, `product`, and `full`. See [Testing updates and plugins](/help/testing-updates-plugins) for the package/update/plugin contract, published-upgrade survivor matrix, release defaults, and failure triage.
- Build and release checks run `scripts/check-cli-bootstrap-imports.mjs` after tsdown. The guard walks the static built graph from `dist/entry.js` and `dist/cli/run-main.js` and fails if pre-dispatch startup imports package dependencies such as Commander, prompt UI, undici, or logging before command dispatch; it also keeps the bundled gateway run chunk under budget and rejects static imports of known cold gateway paths. Packaged CLI smoke also covers root help, onboard help, doctor help, status, config schema, and a model-list command.
- Package Acceptance legacy compatibility is capped at `2026.4.25` (`2026.4.25-beta.*` included). Through that cutoff, the harness tolerates only shipped-package metadata gaps: omitted private QA inventory entries, missing `gateway install --wrapper`, missing patch files in the tarball-derived git fixture, missing persisted `update.channel`, legacy plugin install-record locations, missing marketplace install-record persistence, and config metadata migration during `plugins update`. For packages after `2026.4.25`, those paths are strict failures.
- Container smoke runners: `test:docker:openwebui`, `test:docker:onboard`, `test:docker:npm-onboard-channel-agent`, `test:docker:release-user-journey`, `test:docker:release-typed-onboarding`, `test:docker:release-media-memory`, `test:docker:release-upgrade-user-journey`, `test:docker:release-plugin-marketplace`, `test:docker:skill-install`, `test:docker:update-channel-switch`, `test:docker:upgrade-survivor`, `test:docker:published-upgrade-survivor`, `test:docker:session-runtime-context`, `test:docker:agents-delete-shared-workspace`, `test:docker:gateway-network`, `test:docker:browser-cdp-snapshot`, `test:docker:mcp-channels`, `test:docker:pi-bundle-mcp-tools`, `test:docker:cron-mcp-cleanup`, `test:docker:plugins`, `test:docker:plugin-update`, `test:docker:plugin-lifecycle-matrix`, and `test:docker:config-reload` boot one or more real containers and verify higher-level integration paths.
- Docker/Bash E2E lanes that install the packed OpenClaw tarball through `scripts/lib/openclaw-e2e-instance.sh` cap `npm install` at `OPENCLAW_E2E_NPM_INSTALL_TIMEOUT` (default `600s`; set `0` to disable the wrapper for debugging).

live-model Docker 运行器也只挂载所需的 CLI auth homes（如果运行没有缩小范围，则挂载所有受支持的），然后在运行前把它们复制到容器 home 中，这样外部 CLI OAuth 就可以刷新 token，而不会修改宿主机 auth 存储：

- 直接模型：`pnpm test:docker:live-models` 和 `pnpm test:docker:live-gateway` 只在仓库 Docker 镜像中运行与其匹配的 profile-key live 文件（`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`），并挂载你的本地配置目录、工作区和可选的 profile env 文件。对应的本地入口点是 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker live 运行器默认使用更小的 smoke 上限，因此完整的 Docker 扫描仍然可行：
  `test:docker:live-models` 默认 `OPENCLAW_LIVE_MAX_MODELS=12`，而
  `test:docker:live-gateway` 默认 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`、
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`、
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` 和 `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。只有当你
  明确需要更大的穷举扫描时，才覆盖这些 env 变量。
- `test:docker:all` 先通过 `test:docker:live-build` 构建一次 live Docker 镜像，再通过 `scripts/package-openclaw-for-docker.mjs` 将 OpenClaw 打包成一个 npm tarball，然后构建/复用两个 `scripts/e2e/Dockerfile` 镜像。裸镜像只是用于 install/update/plugin-dependency 通道的 Node/Git 运行器；这些通道会挂载预构建 tarball。功能镜像会将同一个 tarball 安装到 `/app`，用于已构建应用功能通道。Docker 通道定义位于 `scripts/lib/docker-e2e-scenarios.mjs`；规划逻辑位于 `scripts/lib/docker-e2e-plan.mjs`；`scripts/test-docker-all.mjs` 负责执行所选计划。聚合流程使用加权本地调度器：`OPENCLAW_DOCKER_ALL_PARALLELISM` 控制进程槽位，而资源上限会阻止过重的 live、npm-install 和多服务通道同时启动。如果单个通道比当前上限更重，调度器仍然可以在池为空时启动它，然后让它单独运行，直到再次有容量。默认值为 10 个槽位、`OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；只有当 Docker 主机有更多余量时，才调整 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。运行器默认会执行 Docker 预检，移除过期的 OpenClaw E2E 容器，每 30 秒打印状态，将成功的通道计时存储在 `.artifacts/docker-tests/lane-timings.json`，并利用这些计时在后续运行中优先启动更长的通道。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 可在不构建或运行 Docker 的情况下打印加权通道清单，或使用 `node scripts/test-docker-all.mjs --plan-json` 打印所选通道、包/镜像需求和凭据的 CI 计划。
- `Package Acceptance` 是 GitHub 原生的包门禁，用于判断“这个可安装 tarball 是否能作为产品工作？”它会从 `source=npm`、`source=ref`、`source=url` 或 `source=artifact` 中解析一个候选包，将其作为 `package-under-test` 上传，然后针对这个精确 tarball 运行可复用的 Docker E2E 通道，而不是重新打包所选 ref。Profile 按广度排序：`smoke`、`package`、`product` 和 `full`。有关包/更新/插件契约、已发布升级幸存者矩阵、发布默认值和失败分流，请参见 [Testing updates and plugins](/help/testing-updates-plugins)。
- 构建和发布检查会在 tsdown 之后运行 `scripts/check-cli-bootstrap-imports.mjs`。该守卫从 `dist/entry.js` 和 `dist/cli/run-main.js` 追踪静态构建图，如果在命令分发之前的预分发启动导入了 Commander、prompt UI、undici 或日志记录等包依赖，就会失败；它还会将打包后的 gateway 运行 chunk 控制在预算内，并拒绝对已知冷门 gateway 路径的静态导入。打包后的 CLI smoke 还覆盖 root help、onboard help、doctor help、status、config schema 和 model-list 命令。
- Package Acceptance 的旧版兼容性上限为 `2026.4.25`（包含 `2026.4.25-beta.*`）。在该截止点之前，harness 只容忍已发布包的元数据缺口：省略的 private QA 清单项、缺失的 `gateway install --wrapper`、tarball 派生的 git fixture 中缺失的 patch 文件、缺失的持久化 `update.channel`、旧版插件安装记录位置、缺失的 marketplace 安装记录持久化，以及 `plugins update` 期间的配置元数据迁移。对于 `2026.4.25` 之后的包，这些路径都属于严格失败。
- 容器 smoke 运行器：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:npm-onboard-channel-agent`、`test:docker:release-user-journey`、`test:docker:release-typed-onboarding`、`test:docker:release-media-memory`、`test:docker:release-upgrade-user-journey`、`test:docker:release-plugin-marketplace`、`test:docker:skill-install`、`test:docker:update-channel-switch`、`test:docker:upgrade-survivor`、`test:docker:published-upgrade-survivor`、`test:docker:session-runtime-context`、`test:docker:agents-delete-shared-workspace`、`test:docker:gateway-network`、`test:docker:browser-cdp-snapshot`、`test:docker:mcp-channels`、`test:docker:pi-bundle-mcp-tools`、`test:docker:cron-mcp-cleanup`、`test:docker:plugins`、`test:docker:plugin-update`、`test:docker:plugin-lifecycle-matrix` 和 `test:docker:config-reload` 会启动一个或多个真实容器，并验证更高层级的集成路径。

live-model Docker 运行器还会 bind-mount 当前检出为只读，并将其暂存到容器内的临时 workdir 中。这样既能保持运行时镜像精简，又能让 Vitest 针对你精确的本地源码/配置运行。
暂存步骤会跳过大型仅本地缓存和应用构建输出，例如 `.pnpm-store`、`.worktrees`、`__openclaw_vitest__`，以及应用本地的 `.build` 或 Gradle 输出目录，这样 Docker live 运行就不会花费几分钟复制机器特定的制品。
它们还会设置 `OPENCLAW_SKIP_CHANNELS=1`，因此 gateway live 探测不会在容器内启动真实的 Telegram/Discord 等通道 worker。
`test:docker:live-models` 仍然会运行 `pnpm test:live`，所以当你需要缩小或排除该 Docker 通道中的 gateway live 覆盖时，也请透传 `OPENCLAW_LIVE_GATEWAY_*`。
`test:docker:openwebui` 是一个更高层级的兼容性 smoke：它会启动一个启用 OpenAI 兼容 HTTP 端点的 OpenClaw gateway 容器，针对该 gateway 启动一个固定版本的 Open WebUI 容器，通过 Open WebUI 登录，验证 `/api/models` 暴露 `openclaw/default`，然后通过 Open WebUI 的 `/api/chat/completions` 代理发送一次真实聊天请求。
将 `OPENWEBUI_SMOKE_MODE=models` 设为用于发布路径 CI 检查，该检查应在 Open WebUI 登录和模型发现后停止，而无需等待 live 模型 completion。
第一次运行可能会明显更慢，因为 Docker 可能需要拉取 Open WebUI 镜像，而且 Open WebUI 可能需要完成自身的冷启动设置。
该通道需要可用的 live 模型密钥。请通过进程环境、暂存的 auth profile 或显式的 `OPENCLAW_PROFILE_FILE` 提供它。
成功运行会打印一个小的 JSON 负载，例如 `{ "ok": true, "model":
"openclaw/default", ... }`。
`test:docker:mcp-channels` 是刻意确定性的，不需要真实的 Telegram、Discord 或 iMessage 账户。它启动一个带种子的 Gateway 容器，启动第二个容器来运行 `openclaw mcp serve`，然后验证路由后的对话发现、转录读取、附件元数据、实时事件队列行为、出站发送路由，以及通过真实 stdio MCP 桥的 Claude 风格通道 + 权限通知。通知检查会直接检查原始 stdio MCP 帧，因此该 smoke 验证的是桥实际发出的内容，而不仅是某个特定客户端 SDK 恰好展示出来的内容。
`test:docker:pi-bundle-mcp-tools` 是确定性的，不需要 live 模型密钥。它构建仓库 Docker 镜像，在容器内启动一个真实的 stdio MCP 探针服务器，通过内嵌 Pi bundle MCP runtime 实例化该服务器，执行工具，然后验证 `coding` 和 `messaging` 会保留 `bundle-mcp` 工具，而 `minimal` 和 `tools.deny: ["bundle-mcp"]` 会将其过滤掉。
`test:docker:cron-mcp-cleanup` 是确定性的，不需要 live 模型密钥。它使用真实 stdio MCP 探针服务器启动一个种子 Gateway，运行一次隔离的 cron 回合和一次 `/subagents spawn` 单次子回合，然后验证每次运行后 MCP 子进程都会退出。

- 直接模型：`pnpm test:docker:live-models`（脚本：`scripts/test-live-models-docker.sh`）
- ACP 绑定 smoke：`pnpm test:docker:live-acp-bind`（脚本：`scripts/test-live-acp-bind-docker.sh`；默认覆盖 Claude、Codex 和 Gemini，并通过 `pnpm test:docker:live-acp-bind:droid` 与 `pnpm test:docker:live-acp-bind:opencode` 提供严格的 Droid/OpenCode 覆盖）
- CLI 后端 smoke：`pnpm test:docker:live-cli-backend`（脚本：`scripts/test-live-cli-backend-docker.sh`）
- Codex app-server harness smoke：`pnpm test:docker:live-codex-harness`（脚本：`scripts/test-live-codex-harness-docker.sh`）
- Gateway + 开发 agent：`pnpm test:docker:live-gateway`（脚本：`scripts/test-live-gateway-models-docker.sh`）
- 可观测性 smoke：`pnpm qa:otel:smoke`、`pnpm qa:prometheus:smoke` 和 `pnpm qa:observability:smoke` 是私有 QA 源码检出通道。它们故意不属于 package Docker 发布通道，因为 npm tarball 不包含 QA Lab。
- Open WebUI live smoke：`pnpm test:docker:openwebui`（脚本：`scripts/e2e/openwebui-docker.sh`）
- 上手向导（TTY，完整脚手架）：`pnpm test:docker:onboard`（脚本：`scripts/e2e/onboard-docker.sh`）
- npm tarball 上手/通道/agent smoke：`pnpm test:docker:npm-onboard-channel-agent` 会在 Docker 中全局安装打包好的 OpenClaw tarball，默认通过 env-ref 上手并配置 OpenAI + Telegram，运行 doctor，然后运行一次模拟的 OpenAI agent 回合。可用 `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 复用预构建 tarball，用 `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0` 跳过宿主机重建，或通过 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 或 `OPENCLAW_NPM_ONBOARD_CHANNEL=slack` 切换通道。

- 发布用户旅程 smoke：`pnpm test:docker:release-user-journey` 会在干净的 Docker home 中全局安装打包好的 OpenClaw tarball，运行 onboarding，配置一个模拟的 OpenAI provider，运行一次 agent 回合，安装/卸载外部插件，针对本地 fixture 配置 ClickClack，验证出站/入站消息，重启 Gateway，并运行 doctor。
- 发布类型化 onboarding smoke：`pnpm test:docker:release-typed-onboarding` 安装打包好的 tarball，通过真实 TTY 驱动 `openclaw onboard`，将 OpenAI 配置为 env-ref provider，验证不会持久化原始密钥，并运行一次模拟的 agent 回合。
- 发布媒体/记忆 smoke：`pnpm test:docker:release-media-memory` 安装打包好的 tarball，验证从 PNG 附件中理解图像、OpenAI 兼容的图像生成输出、记忆搜索召回，以及在 Gateway 重启后的召回保留。
- 发布升级用户旅程 smoke：`pnpm test:docker:release-upgrade-user-journey` 默认安装 `openclaw@latest`，在已发布包上配置 provider/plugin/ClickClack 状态，升级到候选 tarball，然后重新运行核心 agent/plugin/channel 旅程。可通过 `OPENCLAW_RELEASE_UPGRADE_BASELINE_SPEC=openclaw@<version>` 覆盖基线。
- 发布插件市场 smoke：`pnpm test:docker:release-plugin-marketplace` 从本地 fixture marketplace 安装，更新已安装插件，卸载它，并验证插件 CLI 随安装元数据被清理而消失。
- 技能安装 smoke：`pnpm test:docker:skill-install` 会在 Docker 中全局安装打包好的 OpenClaw tarball，禁用配置中的上传归档安装，从搜索中解析当前 live ClawHub 技能 slug，用 `openclaw skills install` 安装它，并验证已安装技能以及 `.clawhub` 来源/锁定元数据。
- 更新通道切换 smoke：`pnpm test:docker:update-channel-switch` 会在 Docker 中全局安装打包好的 OpenClaw tarball，从 package `stable` 切换到 git `dev`，验证持久化通道和更新后插件工作，然后切回 package `stable` 并检查更新状态。
- 升级幸存者 smoke：`pnpm test:docker:upgrade-survivor` 会在一个带有 agents、通道配置、插件 allowlist、陈旧插件依赖状态以及现有 workspace/session 文件的脏旧用户 fixture 上安装打包好的 OpenClaw tarball。在没有 live provider 或通道密钥的情况下执行 package update 和非交互 doctor，然后启动回环 Gateway，并检查配置/状态保留以及启动/状态预算。
- 已发布升级幸存者 smoke：`pnpm test:docker:published-upgrade-survivor` 默认安装 `openclaw@latest`，播种真实感较强的现有用户文件，用 baked command recipe 配置该基线，验证生成的配置，将该已发布安装更新到候选 tarball，运行非交互 doctor，写入 `.artifacts/upgrade-survivor/summary.json`，然后启动回环 Gateway 并检查已配置意图、状态保留、启动、`/healthz`、`/readyz` 和 RPC 状态预算。可使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 覆盖一个基线，要求聚合调度器用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` 展开精确本地基线，例如 `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`，并用 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` 展开问题形状的 fixture，例如 `reported-issues`；`reported-issues` 集合包括 `configured-plugin-installs`，用于自动修复外部 OpenClaw 插件安装。Package Acceptance 将这些暴露为 `published_upgrade_survivor_baseline`、`published_upgrade_survivor_baselines` 和 `published_upgrade_survivor_scenarios`，解析诸如 `last-stable-4` 或 `all-since-2026.4.23` 之类的元基线标记，而 Full Release Validation 会将 release-soak package gate 展开为 `last-stable-4 2026.4.23 2026.5.2 2026.4.15` 加上 `reported-issues`。
- 会话运行时上下文 smoke：`pnpm test:docker:session-runtime-context` 验证隐藏运行时上下文转录持久化，以及 doctor 对受影响的重复 prompt-rewrite 分支的修复。
- Bun 全局安装 smoke：`bash scripts/e2e/bun-global-install-smoke.sh` 会打包当前树，在隔离 home 中使用 `bun install -g` 安装，并验证 `openclaw infer image providers --json` 返回的是内置 image providers，而不是挂起。可用 `OPENCLAW_BUN_GLOBAL_SMOKE_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 复用预构建 tarball，用 `OPENCLAW_BUN_GLOBAL_SMOKE_HOST_BUILD=0` 跳过宿主机构建，或通过 `OPENCLAW_BUN_GLOBAL_SMOKE_DIST_IMAGE=openclaw-dockerfile-smoke:local` 从已构建的 Docker 镜像复制 `dist/`。
- 安装器 Docker smoke：`bash scripts/test-install-sh-docker.sh` 在其 root、update 和 direct-npm 容器之间共享一个 npm cache。Update smoke 默认以 npm `latest` 作为稳定基线，然后升级到候选 tarball。可在本地通过 `OPENCLAW_INSTALL_SMOKE_UPDATE_BASELINE=2026.4.22` 覆盖，或在 GitHub 的 Install Smoke workflow 中通过 `update_baseline_version` 输入覆盖。非 root 安装器检查会保持隔离的 npm cache，以免 root 拥有的缓存条目掩盖用户本地安装行为。设置 `OPENCLAW_INSTALL_SMOKE_NPM_CACHE_DIR=/path/to/cache` 可在本地重跑之间复用 root/update/direct-npm 缓存。
- Install Smoke CI 会通过 `OPENCLAW_INSTALL_SMOKE_SKIP_NPM_GLOBAL=1` 跳过重复的 direct-npm 全局更新；当你需要 direct `npm install -g` 覆盖时，请在本地不加该环境变量运行脚本。
- agents delete shared workspace CLI smoke：`pnpm test:docker:agents-delete-shared-workspace`（脚本：`scripts/e2e/agents-delete-shared-workspace-docker.sh`）默认构建根 Dockerfile 镜像，在隔离的容器 home 中播种两个 agents 和一个 workspace，运行 `agents delete --json`，并验证有效 JSON 以及保留 workspace 的行为。可用 `OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_IMAGE=openclaw-dockerfile-smoke:local OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_SKIP_BUILD=1` 复用 install-smoke 镜像。
- Gateway 网络（两个容器，WS auth + health）：`pnpm test:docker:gateway-network`（脚本：`scripts/e2e/gateway-network-docker.sh`）
- 浏览器 CDP 快照 smoke：`pnpm test:docker:browser-cdp-snapshot`（脚本：`scripts/e2e/browser-cdp-snapshot-docker.sh`）会构建源 E2E 镜像和 Chromium 层，使用原始 CDP 启动 Chromium，运行 `browser doctor --deep`，并验证 CDP 角色快照覆盖链接 URL、光标提升的可点击项、iframe refs 和 frame 元数据。
- OpenAI Responses web_search 最小推理回归：`pnpm test:docker:openai-web-search-minimal`（脚本：`scripts/e2e/openai-web-search-minimal-docker.sh`）通过 Gateway 运行一个模拟的 OpenAI 服务器，验证 `web_search` 会将 `reasoning.effort` 从 `minimal` 提升到 `low`，然后强制 provider schema 拒绝并检查原始细节是否出现在 Gateway 日志中。
- MCP 通道桥（带种子的 Gateway + stdio bridge + 原始 Claude 通知帧 smoke）：`pnpm test:docker:mcp-channels`（脚本：`scripts/e2e/mcp-channels-docker.sh`）
- Pi bundle MCP 工具（真实 stdio MCP 服务器 + 内嵌 Pi profile allow/deny smoke）：`pnpm test:docker:pi-bundle-mcp-tools`（脚本：`scripts/e2e/pi-bundle-mcp-tools-docker.sh`）
- Cron/subagent MCP 清理（真实 Gateway + 在隔离 cron 和一次性 subagent 运行后进行 stdio MCP 子进程拆除）：`pnpm test:docker:cron-mcp-cleanup`（脚本：`scripts/e2e/cron-mcp-cleanup-docker.sh`）
- 插件（本地路径、`file:`、带 hoisted 依赖的 npm registry、损坏的 npm 包元数据、git 移动 refs、ClawHub 大杂烩、marketplace 更新，以及 Claude-bundle 启用/检查的安装/更新 smoke）：`pnpm test:docker:plugins`（脚本：`scripts/e2e/plugins-docker.sh`）
  设置 `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` 可跳过 ClawHub 区块，或通过 `OPENCLAW_PLUGINS_E2E_CLAWHUB_SPEC` 和 `OPENCLAW_PLUGINS_E2E_CLAWHUB_ID` 覆盖默认的 kitchen-sink package/runtime 配对。若没有 `OPENCLAW_CLAWHUB_URL`/`CLAWHUB_URL`，测试将使用一个 hermetic 的本地 ClawHub fixture server。
- 插件更新未变更 smoke：`pnpm test:docker:plugin-update`（脚本：`scripts/e2e/plugin-update-unchanged-docker.sh`）
- 插件生命周期矩阵 smoke：`pnpm test:docker:plugin-lifecycle-matrix` 会在裸容器中安装打包好的 OpenClaw tarball，安装一个 npm 插件，切换启用/禁用，通过本地 npm registry 升级和降级它，删除已安装代码，然后验证卸载仍会移除陈旧状态，同时为每个生命周期阶段记录 RSS/CPU 指标。
- 配置重载元数据 smoke：`pnpm test:docker:config-reload`（脚本：`scripts/e2e/config-reload-source-docker.sh`）
- 插件：`pnpm test:docker:plugins` 覆盖本地路径、`file:`、带 hoisted 依赖的 npm registry、git 移动 refs、ClawHub fixture、marketplace 更新，以及 Claude-bundle 启用/检查的安装/更新 smoke。`pnpm test:docker:plugin-update` 覆盖已安装插件的未变更新行为。`pnpm test:docker:plugin-lifecycle-matrix` 覆盖资源跟踪的 npm 插件安装、启用、禁用、升级、降级以及缺失代码卸载。

要手动预构建并复用共享功能镜像：

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

像 `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE` 这样的套件专用镜像覆盖在设置时仍然优先。当 `OPENCLAW_SKIP_DOCKER_BUILD=1` 指向远程共享镜像时，如果该镜像本地尚不存在，脚本会拉取它。QR 和安装器 Docker 测试保留各自的 Dockerfile，因为它们验证的是包/安装行为，而不是共享的已构建应用运行时。

live-model Docker 运行器还会 bind-mount 当前检出为只读，并将其暂存到容器内的临时 workdir 中。这样既能保持运行时镜像精简，又能让 Vitest 针对你精确的本地源码/配置运行。
暂存步骤会跳过大型仅本地缓存和应用构建输出，例如 `.pnpm-store`、`.worktrees`、`__openclaw_vitest__`，以及应用本地的 `.build` 或 Gradle 输出目录，这样 Docker live 运行就不会花费几分钟复制机器特定的制品。
它们还会设置 `OPENCLAW_SKIP_CHANNELS=1`，因此 gateway live 探测不会在容器内启动真实的 Telegram/Discord 等通道 worker。
`test:docker:live-models` 仍然会运行 `pnpm test:live`，所以当你需要缩小或排除该 Docker 通道中的 gateway live 覆盖时，也请透传 `OPENCLAW_LIVE_GATEWAY_*`。
`test:docker:openwebui` 是一个更高层级的兼容性 smoke：它会启动一个启用 OpenAI 兼容 HTTP 端点的 OpenClaw gateway 容器，针对该 gateway 启动一个固定版本的 Open WebUI 容器，通过 Open WebUI 登录，验证 `/api/models` 暴露 `openclaw/default`，然后通过 Open WebUI 的 `/api/chat/completions` 代理发送一次真实聊天请求。
将 `OPENWEBUI_SMOKE_MODE=models` 设为用于发布路径 CI 检查，该检查应在 Open WebUI 登录和模型发现后停止，而无需等待 live 模型 completion。
第一次运行可能会明显更慢，因为 Docker 可能需要拉取 Open WebUI 镜像，而且 Open WebUI 可能需要完成自身的冷启动设置。
该通道需要可用的 live 模型密钥。请通过进程环境、暂存的 auth profile 或显式的 `OPENCLAW_PROFILE_FILE` 提供它。
成功运行会打印一个小的 JSON 负载，例如 `{ "ok": true, "model":
"openclaw/default", ... }`。
`test:docker:mcp-channels` 是刻意确定性的，不需要真实的 Telegram、Discord 或 iMessage 账户。它启动一个带种子的 Gateway 容器，启动第二个容器来运行 `openclaw mcp serve`，然后验证路由后的对话发现、转录读取、附件元数据、实时事件队列行为、出站发送路由，以及通过真实 stdio MCP 桥的 Claude 风格通道 + 权限通知。通知检查会直接检查原始 stdio MCP 帧，因此该 smoke 验证的是桥实际发出的内容，而不仅是某个特定客户端 SDK 恰好展示出来的内容。
`test:docker:pi-bundle-mcp-tools` 是确定性的，不需要 live 模型密钥。它构建仓库 Docker 镜像，在容器内启动一个真实的 stdio MCP 探针服务器，通过内嵌 Pi bundle MCP runtime 实例化该服务器，执行工具，然后验证 `coding` 和 `messaging` 会保留 `bundle-mcp` 工具，而 `minimal` 和 `tools.deny: ["bundle-mcp"]` 会将其过滤掉。
`test:docker:cron-mcp-cleanup` 是确定性的，不需要 live 模型密钥。它使用真实 stdio MCP 探针服务器启动一个种子 Gateway，运行一次隔离的 cron 回合和一次 `/subagents spawn` 单次子回合，然后验证每次运行后 MCP 子进程都会退出。

手动 ACP 纯语言线程 smoke（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 保留这个脚本用于回归/调试工作流。它将来可能还需要用于 ACP 线程路由验证，所以不要删除它。

有用的环境变量：

- `OPENCLAW_CONFIG_DIR=...`（默认：`~/.openclaw`）挂载到 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（默认：`~/.openclaw/workspace`）挂载到 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` 会在运行测试前挂载并 source
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` 用于仅验证来自 `OPENCLAW_PROFILE_FILE` 的 env 变量，使用临时 config/workspace 目录且不挂载外部 CLI auth
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...`（默认：`~/.cache/openclaw/docker-cli-tools`）挂载到 `/home/node/.npm-global`，用于在 Docker 内缓存 CLI 安装
- `$HOME` 下的外部 CLI auth 目录/文件以只读方式挂载到 `/host-auth...`，然后在测试开始前复制到 `/home/node/...`
  - 默认目录：`.minimax`
  - 默认文件：`~/.codex/auth.json`、`~/.codex/config.toml`、`.claude.json`、`~/.claude/.credentials.json`、`~/.claude/settings.json`、`~/.claude/settings.local.json`
  - 缩小范围的 provider 运行只挂载从 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推断出的所需目录/文件
  - 可手动用 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none`，或像 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex` 这样的逗号列表覆盖
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 用于缩小运行范围
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 用于过滤容器内 provider
- `OPENCLAW_SKIP_DOCKER_BUILD=1` 用于在不需要重建的重跑中复用现有的 `openclaw:local-live` 镜像
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 用于确保凭据来自 profile store（而不是 env）
- `OPENCLAW_OPENWEBUI_MODEL=...` 用于选择 gateway 为 Open WebUI smoke 暴露的模型
- `OPENCLAW_OPENWEBUI_PROMPT=...` 用于覆盖 Open WebUI smoke 使用的 nonce-check prompt
- `OPENWEBUI_IMAGE=...` 用于覆盖固定的 Open WebUI 镜像 tag

## 文档检查

在修改文档后运行文档检查：`pnpm check:docs`。
当你还需要页面内标题检查时，运行完整的 Mintlify 锚点验证：`pnpm docs:check-links:anchors`。

## 离线回归（CI 安全）

这些是没有真实提供方的“真实流水线”回归：

- 网关工具调用（模拟 OpenAI，真实网关 + agent 循环）：`src/gateway/gateway.test.ts`（用例："通过网关 agent 循环端到端运行模拟 OpenAI 工具调用"）
- 网关向导（WebSocket `wizard.start`/`wizard.next`，写入配置 + 强制认证）：`src/gateway/gateway.test.ts`（用例："通过 WebSocket 运行向导并写入 auth token 配置"）

## Agent 可靠性评估（技能）

我们已经有一些 CI 安全的测试，它们的行为类似于“agent 可靠性评估”：

- 通过真实网关 + agent 循环的模拟工具调用（`src/gateway/gateway.test.ts`）。
- 端到端向导流程，用于验证会话接线和配置效果（`src/gateway/gateway.test.ts`）。

目前在技能方面仍缺少的内容（见 [Skills](/tools/skills)）：

- **决策能力：** 当提示中列出技能时，agent 是否会选择正确的技能（或避开不相关的技能）？
- **合规性：** agent 在使用前是否会阅读 `SKILL.md` 并遵循所需步骤/参数？
- **工作流契约：** 多轮场景，断言工具调用顺序、会话历史延续以及沙箱边界。

未来的评估应首先保持确定性：

- 使用带 mock 提供方的场景运行器，用于断言工具调用 + 顺序、技能文件读取以及会话接线。
- 一小套聚焦技能的场景（使用 vs 避免、门控、提示注入）。
- 可选的在线评估（按需启用，受环境变量控制）仅在 CI 安全套件就位后再启用。

## 契约测试（插件和通道形状）

契约测试会验证每个已注册的插件和通道是否符合其
接口契约。它们会遍历所有已发现的插件，并运行一组
形状与行为断言。默认的 `pnpm test` 单测通道会有意
跳过这些共享接缝和冒烟文件；当你修改共享通道或提供方
表面时，请显式运行契约命令。

### 命令

- 所有契约：`pnpm test:contracts`
- 仅通道契约：`pnpm test:contracts:channels`
- 仅提供方契约：`pnpm test:contracts:plugins`

### 通道契约

位于 `src/channels/plugins/contracts/*.contract.test.ts` 中：

- **plugin** - 基本插件形态（id、name、capabilities）
- **setup** - 设置向导契约
- **session-binding** - 会话绑定行为
- **outbound-payload** - 消息负载结构
- **inbound** - 入站消息处理
- **actions** - 通道动作处理器
- **threading** - 线程 ID 处理
- **directory** - 目录/名册 API
- **group-policy** - 群组策略执行

### 提供方状态契约

位于 `src/plugins/contracts/*.contract.test.ts`。

- **status** - 通道状态探针
- **registry** - 插件注册表形状

### 提供方契约

位于 `src/plugins/contracts/*.contract.test.ts` 中：

- **auth** - 认证流程契约
- **auth-choice** - 认证选择/挑选
- **catalog** - 模型目录 API
- **discovery** - 插件发现
- **loader** - 插件加载
- **runtime** - 提供方运行时
- **shape** - 插件形态/接口
- **wizard** - 设置向导

### 何时运行

- 在更改 plugin-sdk 导出或子路径之后
- 在添加或修改通道或提供方插件之后
- 在重构插件注册或发现逻辑之后

契约测试在 CI 中运行，不需要真实 API key。

## 添加回归测试（指南）

当你修复了线上发现的 provider/model 问题时：

- 如果可能，添加一个 CI 安全的回归测试（mock/stub 提供方，或捕获精确的请求形态转换）
- 如果它本质上只能在线运行（速率限制、认证策略），请保持线上测试范围窄，并通过环境变量设为可选
- 优先针对能够捕获 bug 的最小层级：
  - 提供方请求转换/回放 bug → 直接的 models 测试
  - gateway 会话/历史/工具流水线 bug → gateway live smoke 或 CI 安全的 gateway mock 测试
- SecretRef 遍历防护：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 会从注册表元数据（`listSecretTargetRegistryEntries()`）中为每个 SecretRef 类派生一个采样目标，然后断言会拒绝 traversal-segment exec id。
  - 如果你在 `src/secrets/target-registry-data.ts` 中添加了新的 `includeInPlan` SecretRef 目标族，请更新该测试中的 `classifyTargetClass`。该测试会故意在未分类的目标 id 上失败，因此新的类别不会被悄悄跳过。

## 相关

- [Testing live](/help/testing-live)
- [Testing updates and plugins](/help/testing-updates-plugins)
- [CI](/ci)
