---
summary: "测试工具包：单元/e2e/live 套件、Docker 运行器，以及每类测试覆盖的内容"
read_when:
  - 在本地或 CI 中运行测试时
  - 为模型/提供方 bug 添加回归测试时
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

- [QA 概览](/concepts/qa-e2e-automation) — 架构、命令接口、场景编写。
- [Matrix QA](/concepts/qa-matrix) — `pnpm openclaw qa matrix` 参考。
- [QA channel](/channels/qa-channel) — 仓库回放场景使用的合成传输插件。

本页介绍如何运行常规测试套件以及 Docker/Parallels 运行器。下面的 QA 专用运行器部分（[QA-specific runners](#qa-specific-runners)）列出了具体的 `qa` 调用方式，并会链接回上面的参考文档。
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

- Live 套件（模型 + gateway 工具/图片探针）：`pnpm test:live`
- 静默地针对一个 live 文件：`pnpm test:live -- src/agents/models.profiles.live.test.ts`
- 运行时性能报告：通过发送 `OpenClaw Performance`，并使用
  `live_gpt54=true` 获取一次真实的 `openai/gpt-5.4` agent turn，或
  使用 `deep_profile=true` 获取 Kova 的 CPU/heap/trace 产物。每日定时运行会在
  `CLAWGRIT_REPORTS_TOKEN` 已配置时，将 mock-provider、deep-profile 和 GPT 5.4 lane 产物发布到
  `openclaw/clawgrit-reports`。mock-provider 报告还包含源码级 gateway 启动、内存、
  插件压力、重复的 fake-model hello-loop，以及 CLI 启动数据。
- Docker live 模型扫描：`pnpm test:docker:live-models`
  - 每个选中的模型现在都会运行一次文本轮次以及一个小型文件读取式探针。
    其元数据声明支持 `image` 输入的模型也会运行一个小型图片轮次。
    在隔离提供方失败时，可通过 `OPENCLAW_LIVE_MODEL_FILE_PROBE=0` 或
    `OPENCLAW_LIVE_MODEL_IMAGE_PROBE=0` 关闭额外探针。
  - CI 覆盖：每日的 `OpenClaw Scheduled Live And E2E Checks` 和手动的
    `OpenClaw Release Checks` 都会调用可复用的 live/E2E workflow，并设置
    `include_live_suites: true`，其中包含按提供方分片的独立 Docker live 模型 matrix 作业。
  - 若要进行聚焦的 CI 重跑，可触发
    `OpenClaw Live And E2E Checks (Reusable)`，并设置 `include_live_suites: true` 与 `live_models_only: true`。
  - 将新的高信号提供方密钥添加到 `scripts/ci-hydrate-live-auth.sh`
    以及 `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml` 及其
    定时/发布调用者中。
- Native Codex bound-chat 冒烟测试：`pnpm test:docker:live-codex-bind`
  - 运行一个针对 Codex app-server 路径的 Docker live lane，绑定一个合成
    Slack DM（使用 `/codex bind`），执行 `/codex fast` 和
    `/codex permissions`，然后验证普通回复和图片附件
    是通过 native plugin binding 而不是 ACP 路由的。
- Codex app-server harness 冒烟测试：`pnpm test:docker:live-codex-harness`
  - 通过插件拥有的 Codex app-server harness 运行 gateway agent 轮次，
    验证 `/codex status` 和 `/codex models`，并默认执行图片、cron MCP、子 agent
    以及 Guardian 探针。隔离其他 Codex app-server 失败时，可通过
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=0` 关闭子 agent 探针。若要进行聚焦的子 agent 检查，请关闭其他探针：
    `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1 pnpm test:docker:live-codex-harness`.
    除非设置了
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_ONLY=0`，否则在子 agent 探针之后会退出。
- Crestodian rescue command 冒烟测试：`pnpm test:live:crestodian-rescue-channel`
  - 面向消息通道 rescue command 表面的可选“加双保险”检查。它会执行 `/crestodian status`，排队一个持久化模型变更，回复 `/crestodian yes`，并验证审计/配置写入路径。
- Crestodian planner Docker 冒烟测试：`pnpm test:docker:crestodian-planner`
  - 在一个无配置容器中运行 Crestodian，`PATH` 上带有一个假的 Claude CLI，并验证模糊 planner 回退会转换为一次已审计的 typed config 写入。
- Crestodian 首次运行 Docker 冒烟测试：`pnpm test:docker:crestodian-first-run`
  - 从空的 OpenClaw 状态目录开始，将裸 `openclaw` 路由到 Crestodian，应用 setup/model/agent/Discord plugin + SecretRef 写入，校验配置，并验证审计条目。相同的 Ring 0 setup 路径也在 QA Lab 中通过
    `pnpm openclaw qa suite --scenario crestodian-ring-zero-setup` 覆盖。
- Moonshot/Kimi 成本冒烟测试：在设置 `MOONSHOT_API_KEY` 后，运行
  `openclaw models list --provider moonshot --json`，然后针对
  `moonshot/kimi-k2.6` 运行一个隔离的
  `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json`
  。验证 JSON 报告 Moonshot/K2.6，并且 assistant transcript 存储了归一化的
  `usage.cost`。

<Tip>
当你只需要一个失败案例时，优先使用下面描述的 allowlist 环境变量缩小 live 测试范围。
</Tip>

## QA-specific runners

当你需要更接近 QA-lab 真实环境时，这些命令可与主测试套件并列使用：

CI 将 QA Lab 运行在专用 workflow 中。Agentic parity 嵌套在
`QA-Lab - All Lanes` 和 release validation 中，而不是单独的 PR workflow。
广泛验证应使用 `Full Release Validation` 并设置
`rerun_group=qa-parity`，或使用 release-checks QA group。`QA-Lab - All Lanes`
每晚在 `main` 上运行，并可通过手动触发与 mock parity lane、live
Matrix lane、Convex 托管的 live Telegram lane 和 Convex 托管的 live Discord
lane 作为并行作业运行。计划中的 QA 和 release checks 会显式传入 Matrix 的
`--profile fast`，而 Matrix CLI 和手动 workflow 输入默认值仍为 `all`；手动触发可将 `all` 分片为
`transport`、`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli` 作业。`OpenClaw Release
Checks` 会在发布批准前运行 parity 以及 fast Matrix 和 Telegram lanes，
并针对 release transport checks 使用 `mock-openai/gpt-5.5`，以保持确定性并避免正常的 provider-plugin 启动。这些 live transport
gateway 会禁用 memory search；memory 行为仍由 QA parity suites 覆盖。

完整的发布 live media 分片使用
`ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`，其中已包含
`ffmpeg` 和 `ffprobe`。Docker live 模型/backend 分片使用共享的
`ghcr.io/openclaw/openclaw-live-test:<sha>` 镜像，该镜像针对所选提交只构建一次，
然后通过 `OPENCLAW_SKIP_DOCKER_BUILD=1` 拉取，而不是在每个分片内重新构建。

- `pnpm openclaw qa suite`
  - 直接在主机上运行仓库回放的 QA 场景。
  - 默认会使用隔离的 gateway workers 并行运行多个选定场景。`qa-channel` 默认并发数为 4（受所选场景数量限制）。使用 `--concurrency <count>` 调整 worker 数，或使用 `--concurrency 1` 进入旧的串行 lane。
  - 当任一场景失败时以非零状态退出。若你想保留产物但不希望以失败码退出，可使用 `--allow-failures`。
  - 支持 provider 模式 `live-frontier`、`mock-openai` 和 `aimock`。
    `aimock` 会启动一个本地 AIMock 备用提供方服务器，用于实验性 fixture 和 protocol-mock 覆盖，而不会替换具备场景感知能力的 `mock-openai` lane。
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
  - 在 Docker 中安装一个 OpenClaw package 候选版本，运行已安装包的 onboarding，通过已安装的 CLI 配置 Telegram，然后复用 live Telegram QA lane，并将该已安装包作为 SUT Gateway。
  - 默认值为 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@beta`；如需测试已解析的本地 tarball，而不是从 registry 安装，请设置
    `OPENCLAW_NPM_TELEGRAM_PACKAGE_TGZ=/path/to/openclaw-current.tgz` 或
    `OPENCLAW_CURRENT_PACKAGE_TGZ`。
  - 使用与 `pnpm openclaw qa telegram` 相同的 Telegram 环境凭证或 Convex 凭证来源。对于 CI/发布自动化，请设置
    `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex` 以及
    `OPENCLAW_QA_CONVEX_SITE_URL` 和角色密钥。如果在 CI 中同时存在
    `OPENCLAW_QA_CONVEX_SITE_URL` 和一个 Convex 角色密钥，Docker 包装器会自动选择 Convex。
  - `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci|maintainer` 会仅为该 lane 覆盖共享的
    `OPENCLAW_QA_CREDENTIAL_ROLE`。
  - GitHub Actions 将此 lane 作为手动 maintainer 工作流
    `NPM Telegram Beta E2E` 暴露出来。它不会在合并时运行。该工作流使用
    `qa-live-shared` 环境和 Convex CI 凭证租约。
- GitHub Actions 还暴露了 `Package Acceptance`，用于针对某个候选包做旁路产品验证。
  它接受受信任的 ref、已发布的 npm spec、带 SHA-256 的 HTTPS tarball URL，或来自另一个 run 的 tarball artifact，
  然后上传规范化后的 `openclaw-current.tgz` 作为 `package-under-test`，
  再运行现有的 Docker E2E 调度器，并使用 smoke、package、product、full 或 custom lane profiles。
  将 `telegram_mode` 设为 `mock-openai` 或 `live-frontier`，即可使用同一个 `package-under-test` artifact 运行 Telegram QA 工作流。
  - 最新 beta 产品验证：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai
```

- 精确 tarball URL 验证需要一个摘要值：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=url \
  -f package_url=https://registry.npmjs.org/openclaw/-/openclaw-VERSION.tgz \
  -f package_sha256=<sha256> \
  -f suite_profile=package
```

- Artifact 验证会从另一个 Actions run 下载 tarball artifact：

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

  - The script writes nested lane logs under `/tmp/openclaw-parallels-npm-update.*`.
    Inspect `windows-update.log`, `macos-update.log`, or `linux-update.log`
    before assuming the outer wrapper is hung.
  - Windows update can spend 10 to 15 minutes in post-update doctor and package
    update work on a cold guest; that is still healthy when the nested npm
    debug log is advancing.
  - Do not run this aggregate wrapper in parallel with individual Parallels
    macOS, Windows, or Linux smoke lanes. They share VM state and can collide on
    snapshot restore, package serving, or guest gateway state.
  - The post-update proof runs the normal bundled plugin surface because
    capability facades such as speech, image generation, and media
    understanding are loaded through bundled runtime APIs even when the agent
    turn itself only checks a simple text response.

- `pnpm openclaw qa aimock`
  - 仅启动本地 AIMock 提供方服务器，用于直接的协议冒烟测试。
- `pnpm openclaw qa matrix`
  - 在一个可丢弃的 Docker-backed Tuwunel homeserver 上运行 Matrix live QA lane。仅限源码 checkout — 打包安装不会附带 `qa-lab`。
  - 完整 CLI、profile/scenario 目录、环境变量和 artifact 布局： [Matrix QA](/concepts/qa-matrix)。
- `pnpm openclaw qa telegram`
  - 使用环境中的 driver 和 SUT bot token，在真实的私有群组上运行 Telegram live QA lane。
  - 需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和 `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`。group id 必须是数字形式的 Telegram chat id。
  - 支持 `--credential-source convex` 以使用共享池化凭证。默认使用 env 模式，或设置 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` 以启用池化租约。
  - 当任一场景失败时以非零状态退出。若你想保留产物但不希望以失败码退出，可使用 `--allow-failures`。
  - 要求同一个私有群组中存在两个不同的 bot，且 SUT bot 公开 Telegram 用户名。
  - 为了稳定观察 bot-to-bot 通信，请在 `@BotFather` 中为两个 bot 都启用 Bot-to-Bot Communication Mode，并确保 driver bot 能观察到群组 bot 流量。
  - 会在 `.artifacts/qa-e2e/...` 下写入 Telegram QA 报告、摘要以及 observed-messages artifact。带回复的场景会包含从 driver 发送请求到观察到 SUT 回复之间的 RTT。

Live transport lanes 共享一套标准契约，这样新传输不会偏离；每个 lane 的覆盖矩阵位于 [QA 概览 → Live transport coverage](/concepts/qa-e2e-automation#live-transport-coverage)。`qa-channel` 是更广泛的合成套件，不属于该矩阵。

### 通过 Convex 共享 Telegram 凭证（v1）

当为 `openclaw qa telegram` 启用 `--credential-source convex`（或 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）时，QA lab 会从一个基于 Convex 的池中获取独占租约，随着 lane 运行持续发送 heartbeat，并在关闭时释放该租约。

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

### 向 QA 添加一个 channel

新 channel adapter 的架构和 scenario-helper 名称位于 [QA 概览 → Adding a channel](/concepts/qa-e2e-automation#adding-a-channel)。最低要求：在共享的 `qa-lab` host seam 上实现传输运行器，在插件清单中声明 `qaRunners`，通过 `openclaw qa <runner>` 挂载，并在 `qa/scenarios/` 下编写场景。

## 测试套件（在哪运行什么）

可以把这些套件理解为“真实度逐步提高”（同时波动性/成本也逐步增加）：

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
    - 共享 Vitest 配置将 `isolate: false` 固定下来，并在
      根项目、e2e 和 live 配置中使用非隔离运行器。
    - 根 UI 通道保留其 `jsdom` 设置和优化器，但也运行在
      共享的非隔离运行器上。
    - 每个 `pnpm test` 分片都会从共享 Vitest 配置中继承相同的 `threads` + `isolate: false`
      默认值。
    - `scripts/run-vitest.mjs` 默认会为 Vitest 子 Node
      进程添加 `--no-maglev`，以减少大规模本地运行期间的 V8 编译抖动。
      设置 `OPENCLAW_VITEST_ENABLE_MAGLEV=1` 可与原生 V8
      行为进行对比。

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

### E2E（网关烟雾测试）

- 命令：`pnpm test:e2e`
- 配置：`vitest.e2e.config.ts`
- 文件：`src/**/*.e2e.test.ts`、`test/**/*.e2e.test.ts`，以及 `extensions/` 下打包插件的 E2E 测试
- 运行时默认值：
  - 使用 Vitest `threads` 且 `isolate: false`，与仓库其余部分一致。
  - 使用自适应 worker（CI：最多 2 个，本地：默认 1 个）。
  - 默认以静默模式运行，以减少控制台 I/O 开销。
- 有用的覆盖项：
  - `OPENCLAW_E2E_WORKERS=<n>` 用于强制 worker 数量（上限 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 用于重新启用详细控制台输出。
- 范围：
  - 多实例网关端到端行为
  - WebSocket/HTTP 表面、节点配对，以及更重的网络交互
- 预期：
  - 在 CI 中运行（当流水线启用时）
  - 不需要真实密钥
  - 比单元测试有更多活动部件（可能更慢）

### E2E：OpenShell 后端烟雾测试

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
  - 按设计并不适合 CI 稳定运行（真实网络、真实提供方策略、配额、故障）
  - 会花钱 / 占用速率限制
  - 更倾向于运行缩小后的子集，而不是“全部”
- Live 运行会 source `~/.profile` 以获取缺失的 API 密钥。
- 默认情况下，live 运行仍会隔离 `HOME`，并把配置/认证 सामग्री复制到临时测试 home 中，这样单元夹具就不能修改你真实的 `~/.openclaw`。
- 只有在你有意让 live 测试使用真实 home 目录时，才设置 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 现在默认使用更安静的模式：保留 `[live] ...` 进度输出，但会抑制额外的 `~/.profile` 提示，并静音网关 bootstrap 日志/Bonjour 聊天信息。如果你想恢复完整的启动日志，请设置 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 密钥轮换（按提供方区分）：使用逗号/分号格式设置 `*_API_KEYS`，或设置 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`），或者通过 `OPENCLAW_LIVE_*_KEY` 进行每个 live 的覆盖；测试会在收到速率限制响应时重试。
- 进度/心跳输出：
  - live 套件现在会向 stderr 输出进度行，因此即使 Vitest 控制台捕获是静默的，长时间的提供方调用也会明显显示为活跃。
  - `vitest.live.config.ts` 禁用了 Vitest 控制台拦截，因此提供方/网关进度行会在 live 运行期间立即流式输出。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 调整直接模型心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 调整网关/探测心跳。

## 我应该运行哪个测试套件？

使用这个决策表：

- 修改逻辑/测试：运行 `pnpm test`（如果改动很多，再运行 `pnpm test:coverage`）
- 触碰网关网络 / WS 协议 / 配对：增加运行 `pnpm test:e2e`
- 调试“我的 bot 挂了”/提供方特定失败/工具调用：运行缩小范围的 `pnpm test:live`

## Live（涉及网络）的测试

For the live model matrix, CLI backend smokes, ACP smokes, Codex app-server
harness, and all media-provider live tests (Deepgram, BytePlus, ComfyUI, image,
music, video, media harness) — plus credential handling for live runs — see
[Testing live suites](/help/testing-live). For the dedicated update and
plugin validation checklist, see
[Testing updates and plugins](/help/testing-updates-plugins).

## Docker 运行器（可选的“在 Linux 上可用”检查）

这些 Docker 运行器分成两类：

- Live-model runners: `test:docker:live-models` and `test:docker:live-gateway` run only their matching profile-key live file inside the repo Docker image (`src/agents/models.profiles.live.test.ts` and `src/gateway/gateway-models.profiles.live.test.ts`), mounting your local config dir and workspace (and sourcing `~/.profile` if mounted). The matching local entrypoints are `test:live:models-profiles` and `test:live:gateway-profiles`.
- Docker live runners default to a smaller smoke cap so a full Docker sweep stays practical:
  `test:docker:live-models` defaults to `OPENCLAW_LIVE_MAX_MODELS=12`, and
  `test:docker:live-gateway` defaults to `OPENCLAW_LIVE_GATEWAY_SMOKE=1`,
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`,
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000`, and `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`. Override those env vars when you
  explicitly want the larger exhaustive scan.
- `test:docker:all` builds the live Docker image once via `test:docker:live-build`, packs OpenClaw once as an npm tarball through `scripts/package-openclaw-for-docker.mjs`, then builds/reuses two `scripts/e2e/Dockerfile` images. The bare image is only the Node/Git runner for install/update/plugin-dependency lanes; those lanes mount the prebuilt tarball. The functional image installs the same tarball into `/app` for built-app functionality lanes. Docker lane definitions live in `scripts/lib/docker-e2e-scenarios.mjs`; planner logic lives in `scripts/lib/docker-e2e-plan.mjs`; `scripts/test-docker-all.mjs` executes the selected plan. The aggregate uses a weighted local scheduler: `OPENCLAW_DOCKER_ALL_PARALLELISM` controls process slots, while resource caps keep heavy live, npm-install, and multi-service lanes from all starting at once. If a single lane is heavier than the active caps, the scheduler can still start it when the pool is empty and then keeps it running alone until capacity is available again. Defaults are 10 slots, `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`, `OPENCLAW_DOCKER_ALL_NPM_LIMIT=10`, and `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`; tune `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` or `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT` only when the Docker host has more headroom. The runner performs a Docker preflight by default, removes stale OpenClaw E2E containers, prints status every 30 seconds, stores successful lane timings in `.artifacts/docker-tests/lane-timings.json`, and uses those timings to start longer lanes first on later runs. Use `OPENCLAW_DOCKER_ALL_DRY_RUN=1` to print the weighted lane manifest without building or running Docker, or `node scripts/test-docker-all.mjs --plan-json` to print the CI plan for selected lanes, package/image needs, and credentials.
- `Package Acceptance` is the GitHub-native package gate for "does this installable tarball work as a product?" It resolves one candidate package from `source=npm`, `source=ref`, `source=url`, or `source=artifact`, uploads it as `package-under-test`, then runs the reusable Docker E2E lanes against that exact tarball instead of repacking the selected ref. Profiles are ordered by breadth: `smoke`, `package`, `product`, and `full`. See [Testing updates and plugins](/help/testing-updates-plugins) for the package/update/plugin contract, published-upgrade survivor matrix, release defaults, and failure triage.
- Build and release checks run `scripts/check-cli-bootstrap-imports.mjs` after tsdown. The guard walks the static built graph from `dist/entry.js` and `dist/cli/run-main.js` and fails if pre-dispatch startup imports package dependencies such as Commander, prompt UI, undici, or logging before command dispatch; it also keeps the bundled gateway run chunk under budget and rejects static imports of known cold gateway paths. Packaged CLI smoke also covers root help, onboard help, doctor help, status, config schema, and a model-list command.
- Package Acceptance legacy compatibility is capped at `2026.4.25` (`2026.4.25-beta.*` included). Through that cutoff, the harness tolerates only shipped-package metadata gaps: omitted private QA inventory entries, missing `gateway install --wrapper`, missing patch files in the tarball-derived git fixture, missing persisted `update.channel`, legacy plugin install-record locations, missing marketplace install-record persistence, and config metadata migration during `plugins update`. For packages after `2026.4.25`, those paths are strict failures.
- Container smoke runners: `test:docker:openwebui`, `test:docker:onboard`, `test:docker:npm-onboard-channel-agent`, `test:docker:update-channel-switch`, `test:docker:upgrade-survivor`, `test:docker:published-upgrade-survivor`, `test:docker:session-runtime-context`, `test:docker:agents-delete-shared-workspace`, `test:docker:gateway-network`, `test:docker:browser-cdp-snapshot`, `test:docker:mcp-channels`, `test:docker:pi-bundle-mcp-tools`, `test:docker:cron-mcp-cleanup`, `test:docker:plugins`, `test:docker:plugin-update`, `test:docker:plugin-lifecycle-matrix`, and `test:docker:config-reload` boot one or more real containers and verify higher-level integration paths.

live-model Docker 运行器也会只挂载所需的 CLI auth homes（如果运行没有缩小范围，则挂载所有受支持的），然后在运行前把它们复制到容器 home 中，这样外部 CLI OAuth 就可以刷新 token，而不会修改宿主机 auth 存储：

- Direct models: `pnpm test:docker:live-models` (script: `scripts/test-live-models-docker.sh`)
- ACP bind smoke: `pnpm test:docker:live-acp-bind` (script: `scripts/test-live-acp-bind-docker.sh`; covers Claude, Codex, and Gemini by default, with strict Droid/OpenCode coverage via `pnpm test:docker:live-acp-bind:droid` and `pnpm test:docker:live-acp-bind:opencode`)
- CLI backend smoke: `pnpm test:docker:live-cli-backend` (script: `scripts/test-live-cli-backend-docker.sh`)
- Codex app-server harness smoke: `pnpm test:docker:live-codex-harness` (script: `scripts/test-live-codex-harness-docker.sh`)
- Gateway + dev agent: `pnpm test:docker:live-gateway` (script: `scripts/test-live-gateway-models-docker.sh`)
- Observability smoke: `pnpm qa:otel:smoke` is a private QA source-checkout lane. It is intentionally not part of package Docker release lanes because the npm tarball omits QA Lab.
- Open WebUI live smoke: `pnpm test:docker:openwebui` (script: `scripts/e2e/openwebui-docker.sh`)
- Onboarding wizard (TTY, full scaffolding): `pnpm test:docker:onboard` (script: `scripts/e2e/onboard-docker.sh`)
- Npm tarball onboarding/channel/agent smoke: `pnpm test:docker:npm-onboard-channel-agent` installs the packed OpenClaw tarball globally in Docker, configures OpenAI via env-ref onboarding plus Telegram by default, runs doctor, and runs one mocked OpenAI agent turn. Reuse a prebuilt tarball with `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz`, skip the host rebuild with `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0`, or switch channel with `OPENCLAW_NPM_ONBOARD_CHANNEL=discord`.
- Update channel switch smoke: `pnpm test:docker:update-channel-switch` installs the packed OpenClaw tarball globally in Docker, switches from package `stable` to git `dev`, verifies the persisted channel and plugin post-update work, then switches back to package `stable` and checks update status.
- Upgrade survivor smoke: `pnpm test:docker:upgrade-survivor` installs the packed OpenClaw tarball over a dirty old-user fixture with agents, channel config, plugin allowlists, stale plugin dependency state, and existing workspace/session files. It runs package update plus non-interactive doctor without live provider or channel keys, then starts a loopback Gateway and checks config/state preservation plus startup/status budgets.
- Published upgrade survivor smoke: `pnpm test:docker:published-upgrade-survivor` installs `openclaw@latest` by default, seeds realistic existing-user files, configures that baseline with a baked command recipe, validates the resulting config, updates that published install to the candidate tarball, runs non-interactive doctor, writes `.artifacts/upgrade-survivor/summary.json`, then starts a loopback Gateway and checks configured intents, state preservation, startup, `/healthz`, `/readyz`, and RPC status budgets. Override one baseline with `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC`, ask the aggregate scheduler to expand exact baselines with `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` such as `all-since-2026.4.23`, and expand issue-shaped fixtures with `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` such as `reported-issues`; the reported-issues set includes `configured-plugin-installs` for automatic external OpenClaw plugin install repair. Package Acceptance exposes those as `published_upgrade_survivor_baseline`, `published_upgrade_survivor_baselines`, and `published_upgrade_survivor_scenarios`.
- Session runtime context smoke: `pnpm test:docker:session-runtime-context` verifies hidden runtime context transcript persistence plus doctor repair of affected duplicated prompt-rewrite branches.
- Bun global install smoke: `bash scripts/e2e/bun-global-install-smoke.sh` packs the current tree, installs it with `bun install -g` in an isolated home, and verifies `openclaw infer image providers --json` returns bundled image providers instead of hanging. Reuse a prebuilt tarball with `OPENCLAW_BUN_GLOBAL_SMOKE_PACKAGE_TGZ=/path/to/openclaw-*.tgz`, skip the host build with `OPENCLAW_BUN_GLOBAL_SMOKE_HOST_BUILD=0`, or copy `dist/` from a built Docker image with `OPENCLAW_BUN_GLOBAL_SMOKE_DIST_IMAGE=openclaw-dockerfile-smoke:local`.
- Installer Docker smoke: `bash scripts/test-install-sh-docker.sh` shares one npm cache across its root, update, and direct-npm containers. Update smoke defaults to npm `latest` as the stable baseline before upgrading to the candidate tarball. Override with `OPENCLAW_INSTALL_SMOKE_UPDATE_BASELINE=2026.4.22` locally, or with the Install Smoke workflow's `update_baseline_version` input on GitHub. Non-root installer checks keep an isolated npm cache so root-owned cache entries do not mask user-local install behavior. Set `OPENCLAW_INSTALL_SMOKE_NPM_CACHE_DIR=/path/to/cache` to reuse the root/update/direct-npm cache across local reruns.
- Install Smoke CI skips the duplicate direct-npm global update with `OPENCLAW_INSTALL_SMOKE_SKIP_NPM_GLOBAL=1`; run the script locally without that env when direct `npm install -g` coverage is needed.
- Agents delete shared workspace CLI smoke: `pnpm test:docker:agents-delete-shared-workspace` (script: `scripts/e2e/agents-delete-shared-workspace-docker.sh`) builds the root Dockerfile image by default, seeds two agents with one workspace in an isolated container home, runs `agents delete --json`, and verifies valid JSON plus retained workspace behavior. Reuse the install-smoke image with `OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_IMAGE=openclaw-dockerfile-smoke:local OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_SKIP_BUILD=1`.
- Gateway networking (two containers, WS auth + health): `pnpm test:docker:gateway-network` (script: `scripts/e2e/gateway-network-docker.sh`)
- Browser CDP snapshot smoke: `pnpm test:docker:browser-cdp-snapshot` (script: `scripts/e2e/browser-cdp-snapshot-docker.sh`) builds the source E2E image plus a Chromium layer, starts Chromium with raw CDP, runs `browser doctor --deep`, and verifies CDP role snapshots cover link URLs, cursor-promoted clickables, iframe refs, and frame metadata.
- OpenAI Responses web_search minimal reasoning regression: `pnpm test:docker:openai-web-search-minimal` (script: `scripts/e2e/openai-web-search-minimal-docker.sh`) runs a mocked OpenAI server through Gateway, verifies `web_search` raises `reasoning.effort` from `minimal` to `low`, then forces the provider schema reject and checks the raw detail appears in Gateway logs.
- MCP channel bridge (seeded Gateway + stdio bridge + raw Claude notification-frame smoke): `pnpm test:docker:mcp-channels` (script: `scripts/e2e/mcp-channels-docker.sh`)
- Pi bundle MCP tools (real stdio MCP server + embedded Pi profile allow/deny smoke): `pnpm test:docker:pi-bundle-mcp-tools` (script: `scripts/e2e/pi-bundle-mcp-tools-docker.sh`)
- Cron/subagent MCP cleanup (real Gateway + stdio MCP child teardown after isolated cron and one-shot subagent runs): `pnpm test:docker:cron-mcp-cleanup` (script: `scripts/e2e/cron-mcp-cleanup-docker.sh`)
- Plugins (install/update smoke for local path, `file:`, npm registry with hoisted dependencies, git moving refs, ClawHub kitchen-sink, marketplace updates, and Claude-bundle enable/inspect): `pnpm test:docker:plugins` (script: `scripts/e2e/plugins-docker.sh`)
  Set `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` to skip the ClawHub block, or override the default kitchen-sink package/runtime pair with `OPENCLAW_PLUGINS_E2E_CLAWHUB_SPEC` and `OPENCLAW_PLUGINS_E2E_CLAWHUB_ID`. Without `OPENCLAW_CLAWHUB_URL`/`CLAWHUB_URL`, the test uses a hermetic local ClawHub fixture server.
- Plugin update unchanged smoke: `pnpm test:docker:plugin-update` (script: `scripts/e2e/plugin-update-unchanged-docker.sh`)
- Plugin lifecycle matrix smoke: `pnpm test:docker:plugin-lifecycle-matrix` installs the packed OpenClaw tarball in a bare container, installs an npm plugin, toggles enable/disable, upgrades and downgrades it through a local npm registry, deletes the installed code, then verifies uninstall still removes stale state while logging RSS/CPU metrics for each lifecycle phase.
- Config reload metadata smoke: `pnpm test:docker:config-reload` (script: `scripts/e2e/config-reload-source-docker.sh`)
- Plugins: `pnpm test:docker:plugins` covers install/update smoke for local path, `file:`, npm registry with hoisted dependencies, git moving refs, ClawHub fixtures, marketplace updates, and Claude-bundle enable/inspect. `pnpm test:docker:plugin-update` covers unchanged update behavior for installed plugins. `pnpm test:docker:plugin-lifecycle-matrix` covers resource-tracked npm plugin install, enable, disable, upgrade, downgrade, and missing-code uninstall.

要手动预构建并复用共享功能镜像：

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

像 `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE` 这样的特定套件镜像覆盖在设置时仍然优先。当 `OPENCLAW_SKIP_DOCKER_BUILD=1` 指向远程共享镜像时，如果本地尚不存在，脚本会拉取它。QR 和 installer 的 Docker 测试保留自己的 Dockerfile，因为它们验证的是包/安装行为，而不是共享的已构建应用运行时。

live-model Docker 运行器也会把当前检出以只读方式挂载，并将其暂存到容器内的临时 workdir 中。这样既能保持运行时镜像精简，又能针对你精确的本地源代码/配置运行 Vitest。暂存步骤会跳过大型本地专用 cache 和应用构建输出，例如 `.pnpm-store`、`.worktrees`、`__openclaw_vitest__`，以及 app 本地的 `.build` 或 Gradle 输出目录，这样 Docker live 运行就不会花几分钟复制机器特定的制品。
它们还会设置 `OPENCLAW_SKIP_CHANNELS=1`，这样 gateway live 探测就不会在容器内启动真实的 Telegram/Discord/etc. channel workers。
`test:docker:live-models` 仍然会运行 `pnpm test:live`，因此当你需要缩小或排除该 Docker lane 中的 gateway live 覆盖时，也要透传 `OPENCLAW_LIVE_GATEWAY_*`。
`test:docker:openwebui` 是更高层的兼容性 smoke：它启动一个启用了 OpenAI 兼容 HTTP 端点的 OpenClaw gateway 容器，启动一个固定版本的 Open WebUI 容器连接该 gateway，通过 Open WebUI 登录，验证 `/api/models` 暴露了 `openclaw/default`，然后通过 Open WebUI 的 `/api/chat/completions` 代理发送一次真实聊天请求。
第一次运行可能明显更慢，因为 Docker 可能需要拉取 Open WebUI 镜像，而且 Open WebUI 还可能需要完成自身的冷启动设置。
这条 lane 需要一个可用的 live model key，并且 `OPENCLAW_PROFILE_FILE`
（默认 `~/.profile`）是 Docker 化运行中提供它的主要方式。
成功运行会打印一个小的 JSON 载荷，例如 `{ "ok": true, "model":
"openclaw/default", ... }`。
`test:docker:mcp-channels` 故意设计为确定性测试，不需要真实的 Telegram、Discord 或 iMessage 账号。它会启动一个已种子的 Gateway 容器，再启动第二个容器来运行 `openclaw mcp serve`，然后验证路由后的会话发现、转录读取、附件元数据、实时事件队列行为、出站发送路由，以及通过真实的 stdio MCP 桥的 Claude 风格 channel + 权限通知。通知检查会直接检查原始 stdio MCP 帧，因此这个 smoke 验证的是桥实际发出的内容，而不只是某个特定客户端 SDK 恰好暴露的内容。
`test:docker:pi-bundle-mcp-tools` 是确定性的，不需要 live model key。它会构建仓库 Docker 镜像，在容器内启动一个真实的 stdio MCP probe server，通过内嵌的 Pi bundle MCP runtime 将该 server 实例化，执行工具，然后验证 `coding` 和 `messaging` 会保留 `bundle-mcp` tools，而 `minimal` 和 `tools.deny: ["bundle-mcp"]` 会把它们过滤掉。
`test:docker:cron-mcp-cleanup` 是确定性的，不需要 live model key。它会启动一个已种子的 Gateway 和一个真实的 stdio MCP probe server，运行一次隔离的 cron turn 和一次 `/subagents spawn` one-shot 子 turn，然后验证每次运行后 MCP 子进程都会退出。

手动 ACP 纯文本线程 smoke（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 保留这个脚本用于回归/调试工作流。它将来可能还需要用于 ACP 线程路由验证，所以不要删除它。

有用的环境变量：

- `OPENCLAW_CONFIG_DIR=...`（默认：`~/.openclaw`）挂载到 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（默认：`~/.openclaw/workspace`）挂载到 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（默认：`~/.profile`）挂载到 `/home/node/.profile`，并在运行测试前被 source
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` 用于仅验证从 `OPENCLAW_PROFILE_FILE` source 的 env 变量，使用临时 config/workspace 目录且不挂载外部 CLI auth
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...`（默认：`~/.cache/openclaw/docker-cli-tools`）挂载到 `/home/node/.npm-global`，用于 Docker 内缓存 CLI 安装
- `$HOME` 下的外部 CLI auth 目录/文件会以只读方式挂载到 `/host-auth...`，然后在测试开始前复制到 `/home/node/...`
  - 默认目录：`.minimax`
  - 默认文件：`~/.codex/auth.json`、`~/.codex/config.toml`、`.claude.json`、`~/.claude/.credentials.json`、`~/.claude/settings.json`、`~/.claude/settings.local.json`
  - 缩小范围的 provider 运行只挂载从 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推断出的必要目录/文件
  - 可用 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none`，或类似 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex` 的逗号列表手动覆盖
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 用于缩小运行范围
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 用于在容器内过滤 provider
- `OPENCLAW_SKIP_DOCKER_BUILD=1` 用于在不需要重建的重跑中复用现有 `openclaw:local-live` 镜像
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 用于确保凭据来自 profile store（而不是 env）
- `OPENCLAW_OPENWEBUI_MODEL=...` 用于选择由 gateway 向 Open WebUI smoke 暴露的模型
- `OPENCLAW_OPENWEBUI_PROMPT=...` 用于覆盖 Open WebUI smoke 使用的 nonce-check prompt
- `OPENWEBUI_IMAGE=...` 用于覆盖固定的 Open WebUI 镜像标签

## 文档检查

在修改文档后运行文档检查：`pnpm check:docs`。
当你还需要页面内标题检查时，运行完整的 Mintlify 锚点验证：`pnpm docs:check-links:anchors`。

## 离线回归（CI 安全）

这些是没有真实提供方的“真实流水线”回归：

- 网关工具调用（mock OpenAI，真实网关 + agent loop）：`src/gateway/gateway.test.ts`（用例："通过网关 agent loop 端到端运行 mock OpenAI 工具调用"）
- 网关向导（WS `wizard.start`/`wizard.next`，写入配置 + 强制认证）：`src/gateway/gateway.test.ts`（用例："通过 ws 运行向导并写入 auth token 配置"）

## Agent 可靠性评估（技能）

我们已经有一些 CI 安全测试，表现得像“agent 可靠性评估”：

- 通过真实网关 + agent loop 的 mock 工具调用（`src/gateway/gateway.test.ts`）。
- 端到端向导流程，用于验证会话接线和配置效果（`src/gateway/gateway.test.ts`）。

针对 skills（见 [Skills](/tools/skills)），目前还缺少的是：

- **决策能力：** 当提示中列出 skills 时，agent 是否会选择正确的 skill（或避开不相关的 skill）？
- **合规性：** agent 在使用前是否会阅读 `SKILL.md` 并遵循所需步骤/参数？
- **工作流契约：** 多轮场景，断言工具调用顺序、会话历史延续以及沙箱边界。

未来的评估应首先保持确定性：

- 使用 mock 提供方的场景运行器，用于断言工具调用 + 顺序、skill 文件读取以及会话接线。
- 一小套聚焦 skills 的场景（使用 vs 避免、门控、提示注入）。
- 可选的在线评估（opt-in，受环境变量控制）仅在 CI 安全套件就位后再启用。

## 契约测试（插件和 channel 形状）

契约测试会验证每个已注册的插件和 channel 是否符合其
接口契约。它们会遍历所有已发现的插件，并运行一组
形状与行为断言。默认的 `pnpm test` 单测通道会有意
跳过这些共享接缝和冒烟文件；当你修改共享 channel 或提供方
表面时，请显式运行契约命令。

### 命令

- 所有契约：`pnpm test:contracts`
- 仅 channel 契约：`pnpm test:contracts:channels`
- 仅提供方契约：`pnpm test:contracts:plugins`

### Channel 契约

位于 `src/channels/plugins/contracts/*.contract.test.ts` 中：

- **plugin** - 基本插件形态（id、name、capabilities）
- **setup** - 设置向导契约
- **session-binding** - 会话绑定行为
- **outbound-payload** - 消息负载结构
- **inbound** - 入站消息处理
- **actions** - Channel 动作处理器
- **threading** - 线程 ID 处理
- **directory** - 目录/名册 API
- **group-policy** - 群组策略执行

### 提供方状态契约

位于 `src/plugins/contracts/*.contract.test.ts`。

- **status** - Channel 状态探针
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
- 在添加或修改 channel 或提供方插件之后
- 在重构插件注册或发现逻辑之后

契约测试在 CI 中运行，不需要真实 API key。

## 添加回归测试（指南）

当你修复了线上发现的 provider/model 问题时：

- 尽可能添加一个 CI 安全的回归测试（mock/stub 提供方，或捕获精确的请求形状转换）
- 如果它本质上只能在线上触发（速率限制、认证策略），请保持在线测试范围窄，并通过环境变量 opt-in
- 优先针对能捕获该 bug 的最小层：
  - provider 请求转换/replay bug → 直接 models 测试
  - gateway 会话/历史/tool pipeline bug → gateway live smoke 或 CI 安全的 gateway mock 测试
- SecretRef 遍历护栏：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 会从注册表元数据（`listSecretTargetRegistryEntries()`）中为每个 SecretRef 类派生一个采样目标，然后断言拒绝 traversal 分段 exec id。
  - 如果你在 `src/secrets/target-registry-data.ts` 中添加了新的 `includeInPlan` SecretRef 目标家族，请更新该测试中的 `classifyTargetClass`。该测试会有意在未分类的目标 id 上失败，因此新类别不会被静默跳过。

## 相关

- [Testing live](/help/testing-live)
- [Testing updates and plugins](/help/testing-updates-plugins)
- [CI](/ci)
