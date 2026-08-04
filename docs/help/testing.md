---
summary: "测试工具包：单元/e2e/live 套件、Docker 运行器，以及每类测试覆盖的内容"
read_when:
  - 在本地或 CI 中运行测试时
  - 为模型/提供方错误添加回归测试时
  - 调试 gateway + agent 行为时
title: "测试"
---

OpenClaw 有三个 Vitest 测试套件（单元/集成、e2e、实时），以及 Docker
运行器。本页面介绍每个套件覆盖的内容、针对特定工作流应运行的命令、实时测试如何发现凭据，以及如何为现实世界中的提供方/模型问题添加回归测试。

<Note>
**QA 栈（qa-lab、qa-channel、实时传输通道）** 另有文档说明：

- [QA 概览](/concepts/qa-e2e-automation) - 架构、命令界面、场景编写以及 Matrix 实时通道。
- [成熟度评分卡](/maturity/scorecard) - 发布 QA 证据如何支持稳定性和 LTS 决策。
- [QA 通道](/channels/qa-channel) - 用于仓库支持场景的合成传输插件。

本页面介绍常规测试套件和 Docker/Parallels 运行器。下面的 [QA 专用运行器](#qa-specific-runners) 列出了具体的 `qa` 调用方式，并链接回上述参考文档。
</Note>

## 快速开始

大多数时候：

- 完整门禁（推送前应通过）：`pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- 在资源充足的机器上更快地运行本地完整测试套件：`pnpm test:max`
- 直接运行 Vitest 监听循环：`pnpm test:watch`
- 直接指定文件也适用于插件/频道路径：`pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- 针对单个失败进行迭代时，优先运行目标测试。
- 基于 Docker 的 QA 站点：`pnpm qa:lab:up`
- 基于 Linux 虚拟机的 QA 流程：`pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

当你修改测试或想要额外信心时：

- 仅供参考的 V8 覆盖率报告：`pnpm test:coverage`
- 端到端测试套件：`pnpm test:e2e`

## 测试临时目录

对于测试专用的临时目录，请使用 `test/helpers/temp-dir.ts` 中的共享辅助函数，以明确所有权，并确保清理工作在测试生命周期内完成：

```ts
import { afterEach } from "vitest";
import { useAutoCleanupTempDirTracker } from "../helpers/temp-dir.js";

const tempDirs = useAutoCleanupTempDirTracker(afterEach);

it("使用临时工作区", () => {
  const workspace = tempDirs.make("openclaw-example-");
  // 使用 workspace
});
```

`useAutoCleanupTempDirTracker(afterEach)` 有意不提供手动清理方法——Vitest 会在每个测试结束后负责清理。较旧的底层辅助函数（`makeTempDir`、`cleanupTempDirs`、`createTempDirTracker`）仍然存在，供尚未迁移的测试使用；请避免新增对它们的使用，也避免新增不带封装的 `fs.mkdtemp*` 调用，除非测试明确验证原始临时目录行为。当确实需要使用不带封装的临时目录时，请添加带有理由且可审计的允许注释：

```ts
// openclaw-temp-dir: 允许，用于验证原始 fs 清理行为
const workspace = fs.mkdtempSync(prefix);
```

`node scripts/report-test-temp-creations.mjs` 会报告新增差异行中的不带封装的临时目录创建和新增的手动共享辅助函数使用，但不会阻止现有的清理方式。它遵循与 `scripts/changed-lanes.mjs` 相同的测试路径分类方式，并跳过共享辅助函数本身。对于变更的测试路径，`check:changed` 会运行此报告，将其作为仅用于警告的 CI 信号（GitHub 警告注释，而非失败）。

## Live 和 Docker/Parallels 工作流

调试真实提供方/模型（需要真实凭证）时：

- Live 套件（模型 + 网关工具/图像探测）：`pnpm test:live`
- 靶向运行单个 live 文件且保持静默：`pnpm test:live -- src/agents/models.profiles.live.test.ts`
- 运行时性能报告：为真实的 `openai/gpt-5.6-luna` 智能体回合，使用 `live_openai_candidate=true` 调度 `OpenClaw Performance`；为 Kova CPU/堆/跟踪产物，使用 `deep_profile=true`。每日计划运行会将 mock-provider、deep-profile 和 GPT-5.6 Luna 通道报告，从单独的产物消费发布任务发布到 `openclaw/clawgrit-reports`；缺少或无效的发布者身份验证会使计划运行和 `profile=release` 运行失败。手动的非 release 调度会保留 GitHub 产物，并将报告发布视为建议性操作。mock-provider 报告还包括源代码级别的网关启动、内存、插件压力、重复 fake-model hello-loop 以及 CLI 启动数值。
- Docker live 模型扫描：`pnpm test:docker:live-models`
  - 每个选定模型都会运行一次文本回合和一次小型文件读取风格的探测。元数据声明支持 `image` 输入的模型还会运行一次小型图像回合。隔离提供方故障时，可通过 `OPENCLAW_LIVE_MODEL_FILE_PROBE=0` 或 `OPENCLAW_LIVE_MODEL_IMAGE_PROBE=0` 禁用额外探测。
  - CI 覆盖范围：每日的 `OpenClaw Scheduled Live And E2E Checks` 和手动的 `OpenClaw Release Checks` 都会调用可复用的 live/E2E 工作流，并设置 `include_live_suites: true`，其中包括按提供方分片的 Docker live 模型矩阵任务。
  - 对于有针对性的 CI 重跑，使用 `include_live_suites: true` 和 `live_models_only: true` 调度 `OpenClaw Live And E2E Checks (Reusable)`。
  - 将新的高信号提供方密钥添加到 `scripts/ci-hydrate-live-auth.sh`、`.github/workflows/openclaw-live-and-e2e-checks-reusable.yml` 及其计划运行/发布调用方中。
- 原生 Codex 绑定聊天冒烟测试：`pnpm test:docker:live-codex-bind`
  - 针对 Codex app-server 路径运行 Docker live 通道，使用 `/codex bind` 绑定一个合成的 Slack 私信，执行 `/codex fast` 和 `/codex permissions`，然后验证普通回复和图像附件是否通过原生插件绑定而非 ACP 路由。
- Codex app-server harness 冒烟测试：`pnpm test:docker:live-codex-harness`
  - 通过插件拥有的 Codex app-server harness 运行网关智能体回合，验证 `/codex status` 和 `/codex models`，并默认执行图像、cron MCP、子智能体和 Guardian 探测。隔离其他故障时，可通过 `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=0` 禁用子智能体探测。若要进行有针对性的子智能体检查，请禁用其他探测：
    `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1 pnpm test:docker:live-codex-harness`。
    除非设置 `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_ONLY=0`，否则该测试会在子智能体探测后退出。
- Codex 按需安装冒烟测试：`pnpm test:docker:codex-on-demand`
  - 在 Docker 中安装打包的 OpenClaw tarball，运行 OpenAI API 密钥初始化流程，并验证 Codex 插件及 `@openai/codex` 依赖是否按需下载到受管理的 npm 项目根目录。
- Codex npm 插件 live 包冒烟测试：`pnpm test:docker:live-codex-npm-plugin`
  - 在 Docker 中安装候选 OpenClaw 包和精确版本的 Codex 插件，然后使用真实的 OpenAI 密钥执行 CLI 预检和同一会话中的回合。
  - 其零重试中等思考后续回合必须发送进度，在随机化工作区读取和精确产物写入过程中持续工作，然后发送完成消息。仅发送进度的终端回合会导致该通道失败。
- Live 插件工具依赖冒烟测试：`pnpm test:docker:live-plugin-tool`
  - 使用真实的 `slugify` 依赖打包一个 fixture 插件，通过 `npm-pack:` 安装它，验证该依赖位于受管理的 npm 项目根目录下，然后要求一个 live OpenAI 模型调用插件工具并返回隐藏的 slug。
- OpenClaw 救援命令冒烟测试：`pnpm test:live:system-agent-rescue-channel`
  - 用于消息通道救援命令界面的可选双重保险检查。执行 `/openclaw status`，排队一个持久化模型变更，回复 `/openclaw yes`，并验证审计/配置写入路径。
- OpenClaw 首次运行 Docker 冒烟测试：`pnpm test:docker:system-agent-first-run`
  - 从空的 OpenClaw 状态目录开始，首先验证打包的 `openclaw setup` CLI 在没有推理能力时会安全失败。随后通过打包的激活模块测试并激活 fake Claude。只有在此之后，模糊的打包 CLI 请求才会到达规划器并解析为类型化设置，接着执行一次性模型、智能体、Discord 配置和 SecretRef 操作。它会验证配置和审计条目。这是辅助性的门禁/操作证据，不是交互式初始化流程，也不是 OpenClaw 智能体/工具/审批证明。同一通道也可在 QA Lab 中通过 `pnpm openclaw qa suite --scenario system-agent-ring-zero-setup` 使用。
- Moonshot/Kimi 成本冒烟测试：设置 `MOONSHOT_API_KEY` 后，运行 `openclaw models list --provider moonshot --json`，然后运行隔离的 `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json`。验证 JSON 报告中的 Moonshot/K2.6，并确认 assistant transcript 存储了归一化的 `usage.cost`。

<Tip>
当你只需要一个失败案例时，优先使用下面描述的 allowlist 环境变量缩小 live 测试范围。
</Tip>

## QA 专用运行器

当你需要 QA 实验室级别的真实性时，这些命令会与主测试套件并列使用。

CI 会在专用工作流中运行 QA Lab。Agentic parity 嵌套在
`QA-Lab - All Lanes` 和发布验证中，而不是作为独立的 PR 工作流。
广泛验证应使用 `Full Release Validation`，并设置
`rerun_group=qa-parity` 或发布检查的 QA 组。稳定/默认的发布检查会在
`run_release_soak=true` 后才执行详尽的 live/Docker soak；`full` 配置会强制启用
soak。`QA-Lab - All Lanes` 会在 `main` 上每夜运行，也会通过手动触发运行，其中
mock parity lane、live Matrix lane、Convex 管理的 live Telegram lane 以及
Convex 管理的 live Discord lane 作为并行作业运行。计划中的 QA 和发布检查会通过
共享的 live adapter 运行从目录派生的 Matrix 选择。`OpenClaw Release Checks` 会在
发布批准前运行 parity、可复用的 Matrix live-adapter lane 以及 Telegram lane。
发布传输检查使用 `mock-openai/gpt-5.6-luna`，以保持确定性并避免正常的
provider-plugin 启动。这些 live transport gateway
会禁用记忆搜索；记忆行为仍由 QA parity 套件覆盖。

完整的发布 live media 分片使用
`ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`，其中已包含
`ffmpeg` 和 `ffprobe`。Docker live 模型/backend 分片使用共享的
`ghcr.io/openclaw/openclaw-live-test:<sha>` 镜像，该镜像针对所选提交只构建一次，
然后通过 `OPENCLAW_SKIP_DOCKER_BUILD=1` 拉取，而不是在每个分片内重新构建。

- `pnpm openclaw qa suite`
  - 直接在主机上运行由仓库支持的 QA 场景。
  - 针对所选场景集写入顶层的 `qa-evidence.json`、`qa-suite-summary.json` 和
    `qa-suite-report.md` artifact，其中包括混合流程、Vitest 和 Playwright 场景选择。
  - 通过 `pnpm openclaw qa run --qa-profile <profile>` 调度时，会将所选 taxonomy 配置的计分卡嵌入同一个 `qa-evidence.json`。`smoke-ci` 会写入精简证据（`evidenceMode: "slim"`，不包含每个条目的 `execution`）。`release` 覆盖经过筛选的发布就绪切片；`all` 会选择每个活跃成熟度类别，并在需要完整计分卡 artifact 时指向明确的 QA Profile Evidence 工作流调度。
  - 默认并行运行多个所选场景，并使用相互隔离的 gateway worker。`qa-channel` 默认并发数为 4（受所选场景数量限制）。使用 `--concurrency <count>` 调整 worker 数量，或使用 `--concurrency 1` 运行旧版串行 lane。
  - 任一场景失败时以非零状态退出。使用 `--allow-failures` 可生成 artifact，但不以失败状态退出。
  - 支持 `live-frontier`、`mock-openai` 和 `aimock` provider 模式。`aimock` 会启动一个由本地 AIMock 支持的 provider server，用于实验性 fixture 和协议 mock 覆盖，但不会取代面向场景的 `mock-openai` lane。
- `pnpm openclaw qa coverage --match <query>`
  - 搜索场景 ID、标题、界面、覆盖 ID、文档引用、代码引用、插件和 provider 要求，然后输出匹配的套件目标。
  - 当你知道变更涉及的行为或文件路径，但不知道最小场景时，在运行 QA Lab 前使用此命令。它仅提供建议——仍应根据所变更的行为选择 mock、live、Multipass、Matrix 或传输证明。
- `pnpm test:plugins:kitchen-sink-live`
  - 通过 QA Lab 运行 live OpenAI Kitchen Sink 插件测试套件。安装外部 Kitchen Sink 包，验证插件 SDK 界面清单，探测 `/healthz` 和 `/readyz`，记录 gateway CPU/RSS 证据，运行一次 live OpenAI 对话，并检查对抗性诊断。需要 live OpenAI 身份验证，例如 `OPENAI_API_KEY`。在已注入环境的 Testbox 会话中，如果存在 `openclaw-testbox-env` helper，它会自动加载 Testbox live-auth 配置。
- `pnpm test:gateway:cpu-scenarios`
  - 运行 gateway 启动基准测试以及一小组 mock QA Lab 场景包（`channel-chat-baseline`、`memory-failure-fallback`、`gateway-restart-inflight-run`），并将合并后的 CPU 观测摘要写入 `.artifacts/gateway-cpu-scenarios/`。
  - 默认只标记持续的高 CPU 观测（`--cpu-core-warn` 默认值为 `0.9`；`--hot-wall-warn-ms` 默认值为 `30000`），因此短暂的启动峰值会作为指标记录，而不会被误判为持续数分钟的 gateway 占用异常。
  - 针对已构建的 `dist` artifact 运行；当检出内容中没有最新运行时输出时，请先执行构建。
- `pnpm openclaw qa suite --runner multipass`
  - 在一次性 Multipass Linux 虚拟机内运行同一个 QA 套件，并保留与 `qa suite` 相同的场景选择以及 provider/model 参数。
  - live 运行会将适用于 guest 的 QA 身份验证输入转发过去：基于环境变量的 provider key、QA live provider 配置路径，以及存在时的 `CODEX_HOME`。
  - 输出目录必须位于仓库根目录下，以便 guest 通过挂载的工作区写回文件。
  - 除常规 QA 报告和摘要外，还会将 Multipass 日志写入 `.artifacts/qa-e2e/...`。
- `pnpm qa:lab:up`
  - 启动 Docker 版 QA site，用于操作员式 QA 工作。
- `pnpm test:docker:npm-onboard-channel-agent`
  - 从当前检出内容构建 npm tarball，在 Docker 中全局安装，运行非交互式 OpenAI API key onboarding，默认配置 Telegram，验证打包后的插件运行时可以加载且无需启动依赖修复，运行 doctor，并针对 mock OpenAI endpoint 执行一次本地 agent 对话。
  - 使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 可使用 Discord 运行相同的打包安装 lane。
- `pnpm test:docker:session-runtime-context`
  - 对嵌入式运行时上下文 transcript 运行确定性的已构建应用 Docker smoke。验证隐藏的 OpenClaw 运行时上下文会作为不显示的自定义消息持久化，而不会泄露到可见的用户对话中；随后注入一个受影响的损坏 session JSONL，并验证 `openclaw doctor --fix` 会将其重写到活动分支，同时创建备份。
- `pnpm test:docker:npm-telegram-live`
  - 在 Docker 中安装 OpenClaw 包候选版本，运行已安装包的 onboarding，通过已安装的 CLI 配置 Telegram，然后复用 live Telegram QA lane，并将该已安装包作为被测系统（SUT）的 Gateway。
  - wrapper 只挂载检出内容中的 `qa-lab` harness 源码；已安装的包拥有 `dist`、`openclaw/plugin-sdk` 和捆绑的插件运行时，因此该 lane 不会将当前检出内容中的插件混入被测包。
  - 默认使用 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@beta`；设置 `OPENCLAW_NPM_TELEGRAM_PACKAGE_TGZ=/path/to/openclaw-current.tgz` 或 `OPENCLAW_CURRENT_PACKAGE_TGZ`，可测试已解析的本地 tarball，而不是从 registry 安装。
  - 默认在 `qa-evidence.json` 中输出重复的 RTT 计时，使用 `OPENCLAW_NPM_TELEGRAM_RTT_SAMPLES=20`。可覆盖 `OPENCLAW_NPM_TELEGRAM_RTT_SAMPLES`、`OPENCLAW_NPM_TELEGRAM_RTT_TIMEOUT_MS` 或 `OPENCLAW_NPM_TELEGRAM_RTT_MAX_FAILURES` 来调整运行。`OPENCLAW_NPM_TELEGRAM_RTT_CHECKS` 选择要采样的 Telegram QA 场景；受支持的 RTT 目标是 `channel-canary`。
  - 使用与 `pnpm openclaw qa telegram` 相同的 Telegram 环境凭据或 Convex 凭据源。对于 CI/发布自动化，设置 `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex`，以及 `OPENCLAW_QA_CONVEX_SITE_URL` 和一个角色密钥。如果 CI 中存在 `OPENCLAW_QA_CONVEX_SITE_URL` 和 Convex 角色密钥，Docker wrapper 会自动选择 Convex。
  - wrapper 会在 Docker 构建/安装工作开始前，于主机上验证 Telegram 或 Convex 凭据环境变量。仅当有意调试凭据预检之前的设置时，才设置 `OPENCLAW_NPM_TELEGRAM_SKIP_CREDENTIAL_PREFLIGHT=1`。
  - `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci|maintainer` 仅为此 lane 覆盖共享的 `OPENCLAW_QA_CREDENTIAL_ROLE`。选择 Convex 凭据且未设置角色时，wrapper 在 CI 中使用 `ci`，在 CI 外使用 `maintainer`。
  - GitHub Actions 将此 lane 暴露为手动 maintainer 工作流 `NPM Telegram Beta E2E`。它不会在合并时运行。该工作流使用 `qa-live-shared` 环境和 Convex CI 凭据租约。
- GitHub Actions 还提供 `Package Acceptance`，用于针对一个候选包进行旁路产品证明。它接受 Git ref、已发布的 npm spec、带 SHA-256 的 HTTPS tarball URL、受信任的 URL 策略，或来自另一次运行的 tarball artifact（`source=ref|npm|url|trusted-url|artifact`），上传规范化的 `openclaw-current.tgz` 作为 `package-under-test`，然后使用 `smoke`、`package`、`product`、`full` 或 `custom` lane 配置运行现有的 Docker E2E 调度器。设置 `telegram_mode=mock-openai` 或 `live-frontier`，可针对同一个 `package-under-test` artifact 运行 Telegram QA 工作流。
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
  - 在 Docker 中打包并安装当前 OpenClaw 构建，启动配置了 OpenAI 的 Gateway，然后通过修改配置启用捆绑的 channel/plugin。
  - 验证 setup discovery 不会留下未配置的可下载插件；首次配置后的 doctor 修复会明确安装每个缺失的可下载插件；第二次重启不会运行隐藏的依赖修复。
  - 还会安装一个已知的旧版 npm 基线，在运行 `openclaw update --tag <candidate>` 前启用 Telegram，并验证候选版本在更新后的 doctor 中无需 harness 侧的 postinstall 修复即可清理旧版插件依赖残留。
- `pnpm test:parallels:npm-update`
  - 在 Parallels guest 中运行原生打包安装更新 smoke。每个平台首先安装请求的基线包，然后在同一个 guest 中运行已安装的 `openclaw update` 命令，并验证已安装版本、更新状态、gateway 就绪状态以及一次本地 agent 对话。
  - 迭代单个 guest 时，使用 `--platform macos`、`--platform windows` 或 `--platform linux`。使用 `--json` 获取摘要 artifact 路径和每个 lane 的状态。
  - OpenAI lane 默认使用 `openai/gpt-5.6-luna` 进行 live agent 对话证明。传入 `--model <provider/model>` 或设置 `OPENCLAW_PARALLELS_OPENAI_MODEL`，可验证其他 OpenAI 模型。
  - 使用主机 timeout 包装较长的本地运行，以免 Parallels 传输停滞耗尽剩余测试时间：

    ```bash
    timeout --foreground 150m pnpm test:parallels:npm-update -- --json
    timeout --foreground 90m pnpm test:parallels:npm-update -- --platform windows --json
    ```

  - 脚本会将嵌套的 lane 日志写入 `/tmp/openclaw-parallels-npm-update.*`。在判断外层 wrapper 卡住之前，先检查 `windows-update.log`、`macos-update.log` 或 `linux-update.log`。
  - Windows 更新在冷 guest 中可能需要 10 到 15 分钟执行更新后的 doctor 和包更新工作；只要嵌套的 npm debug 日志仍在推进，这仍属于正常状态。
  - 不要将此聚合 wrapper 与单独的 Parallels macOS、Windows 或 Linux smoke lane 并行运行。它们共享 VM 状态，并可能在快照恢复、包提供或 guest gateway 状态方面发生冲突。
  - 更新后的证明会运行正常的捆绑插件界面，因为即使 agent 对话本身只检查简单的文本响应，语音、图像生成和媒体理解等能力 facade 仍会通过捆绑的运行时 API 加载。

- `pnpm openclaw qa aimock`
  - 仅启动本地 AIMock provider server，用于直接协议 smoke 测试。
- `pnpm openclaw qa buzz`
  - 针对真实 relay room，使用专用 driver 和 SUT 身份运行 Buzz live QA lane。
  - 本地运行使用 `--credential-file <path>`，其中包含 `relayUrl`、`roomId`、`driverPrivateKey` 和 `sutPrivateKey`。封闭 relay 可能还需要 `driverAuthTag` 和 `sutAuthTag`。托管 relay 要求使用 `wss://`；仅用于回环开发 relay 时才接受 `ws://`。
  - 默认使用 `mock-openai`，并通过真实 Buzz 插件路径运行 canary 和 mention-gating 场景。
  - 支持使用 pooled `kind: "buzz"` 行的 `--credential-source convex`。两个公钥都必须是 relay/room 成员，且 SUT 必须拥有房间的 **Bot** 角色。绝不要使用人类所有者或管理员的私钥。
- `pnpm openclaw qa matrix`
  - 针对一次性 Docker 支持的 Tuwunel homeserver 运行 Matrix live QA lane。仅支持源码检出——打包安装不包含 `qa-lab`。
  - 完整的 CLI、配置/场景目录、环境变量和 artifact 布局见：
    [Matrix smoke lanes](/concepts/qa-e2e-automation#matrix-smoke-lanes)。
- `pnpm openclaw qa telegram`
  - 针对真实私有群组运行 Telegram live QA lane，使用环境变量中的 driver 和 SUT bot token。
  - 需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、
    `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和
    `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`。群组 ID 必须是数字形式的 Telegram chat ID。
  - 支持使用 `--credential-source convex` 获取共享的 pooled 凭据。默认使用环境变量模式，或设置 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` 以选择 pooled lease。
  - 默认覆盖 canary、mention gating、命令寻址、`/status`、bot-to-bot mention 回复以及核心原生命令回复。`mock-openai` 默认还覆盖确定性的回复链和 Telegram 最终消息流式传输回归。使用 `--list-scenarios` 查看 `session_status` 等可选探针。
  - 任一场景失败时以非零状态退出。使用 `--allow-failures` 可生成 artifact，但不以失败状态退出。
  - 要求同一个私有群组中有两个不同的 bot，且 SUT bot 公开 Telegram 用户名。
  - 为实现稳定的 bot-to-bot 观测，请在 `@BotFather` 中为两个 bot 启用 Bot-to-Bot Communication Mode，并确保 driver bot 可以观测群组中的 bot 流量。
  - 将 Telegram QA 报告、摘要和 `qa-evidence.json` 写入 `.artifacts/qa-e2e/...`。包含回复的场景会记录从 driver 发送请求到观察到 SUT 回复之间的 RTT。

`Mantis Telegram Live` 是此 lane 的 PR 证据 wrapper。它使用 Convex 租约的 Telegram 凭据运行候选 ref，在 Crabbox 桌面浏览器中渲染经过脱敏的 QA 报告/证据包，记录 MP4 证据，生成经过动态裁剪的 GIF，上传 artifact 包，并在设置 `pr_number` 时通过 Mantis GitHub App 发布 PR 内联证据。维护者可以通过 Actions UI 中的 `Mantis Scenario`（`scenario_id: telegram-live`）启动，也可以直接通过 pull request 评论启动：

```text
@openclaw-mantis telegram
@openclaw-mantis telegram scenario=telegram-status-command
@openclaw-mantis telegram scenarios=telegram-status-command,channel-canary
```

`Mantis Telegram Desktop Proof` 是用于 PR 可视化证据的 agentic 原生 Telegram Desktop before/after wrapper。可以通过 Actions UI 传入自由格式的 `instructions` 启动，或通过 `Mantis Scenario`（`scenario_id: telegram-desktop-proof`）启动，或者通过 PR 评论启动：

```text
@openclaw-mantis telegram desktop proof
```

Mantis agent 会读取 PR，决定哪些 Telegram 可见行为能够证明该变更，针对 baseline 和 candidate ref 运行真实用户 Crabbox Telegram Desktop proof lane，持续迭代直到原生 GIF 足够有用，写入成对的 `motionPreview` manifest，并在设置 `pr_number` 时通过 Mantis GitHub App 发布相同的两列 GIF 表格。

- `pnpm openclaw qa mantis telegram-desktop-builder`
  - 租用或复用 Crabbox Linux desktop，安装原生 Telegram Desktop，使用租用的 Telegram SUT bot token 配置 OpenClaw，启动 gateway，并从可见的 VNC desktop 记录截图/MP4 证据。
  - 默认使用 `--credential-source convex`，因此 workflow 只需要 Convex broker secret。使用 `--credential-source env` 时，配置与 `pnpm openclaw qa telegram` 相同的 `OPENCLAW_QA_TELEGRAM_*` 变量。
  - Telegram Desktop 仍需要用户登录/配置文件；bot token 只用于配置 OpenClaw。使用 `--telegram-profile-archive-env <name>` 指定 base64 `.tgz` 配置文件归档，或使用 `--keep-lease` 并通过 VNC 手动登录一次。
  - 将 `mantis-telegram-desktop-builder-report.md`、
    `mantis-telegram-desktop-builder-summary.json`、
    `telegram-desktop-builder.png` 和 `telegram-desktop-builder.mp4`
    写入输出目录。

Live transport lane 共享一个标准契约，以避免新增 transport 发生偏差；各 lane 的覆盖矩阵位于
[QA overview - Live transport coverage](/concepts/qa-e2e-automation#live-transport-coverage)。
`qa-channel` 是广泛的 synthetic suite，不属于该矩阵。

### 通过 Convex 共享 Telegram 凭证（v1）

当 live transport QA 启用 `--credential-source convex`（或
`OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）时，QA lab 会从基于 Convex 的凭证池中获取独占租约，在通道运行期间为该租约发送心跳，并在关闭时释放租约。本节名称早于 Buzz、Discord、Slack 和 WhatsApp 支持；该租约契约在不同类型之间共享。

Convex 项目参考脚手架：`qa/convex-credential-broker/`

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

默认端点契约（`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`）。
请求通过 `Authorization: Bearer <role secret>` 请求头进行身份验证；
以下请求体省略该请求头：

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

- Buzz: `{ relayUrl: string, roomId: string, driverPrivateKey: string, sutPrivateKey: string, driverAuthTag?: string, sutAuthTag?: string }`
- Discord: `{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string, voiceChannelId?: string }`
- WhatsApp: `{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }`

Slack 通道也可以从凭证池中获取租约，但 Slack payload 的校验目前由 Slack QA runner 执行，而不是由 broker 执行。Slack 条目请使用
`{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`。

### 向 QA 添加一个 channel

新 channel 适配器的架构和场景辅助器名称位于
[QA 概览 - 添加一个 channel](/concepts/qa-e2e-automation#adding-a-channel)。
最低要求：在共享的 `qa-lab` 主机接入点上实现传输运行器，为共享场景添加
`adapterFactory`，在插件清单中声明 `qaRunners`，以
`openclaw qa <runner>` 的形式挂载，并在 `qa/scenarios/` 下编写场景。

## 测试套件（在哪运行什么）

可以将这些测试套件理解为“逐渐提高真实度”（同时也增加不稳定性和成本）。

### 单元 / 集成（默认）

- Command: `pnpm test`
- Config: 未指定目标的运行会使用 `vitest.full-*.config.ts` 分片集合，并可能将多项目分片展开为按项目划分的配置，以便并行调度
- Files: 核心单元测试清单位于 `src/**/*.test.ts`、
  `packages/**/*.test.ts` 和 `test/**/*.test.ts`；UI 单元测试在专用的
  `unit-ui` 分片中运行
- Scope:
  - 纯单元测试
  - 进程内集成测试（网关认证、路由、工具链、解析、配置）
  - 针对已知 bug 的确定性回归测试
- Expectations:
  - 在 CI 中运行
  - 不需要真实密钥
  - 应当快速且稳定
  - 解析器和公共表面加载器测试必须使用生成的微型插件 fixture，验证
    `api.js` 和 `runtime-api.js` 的广泛回退行为，而不是使用真实的捆绑插件源 API。真实插件 API 的加载应归属于插件自身的契约/集成测试套件。

本地依赖策略：

- 默认测试安装会跳过可选的原生 Discord opus 构建。Discord
  语音使用捆绑的 `libopus-wasm`，并且 `@discordjs/opus` 在
  `allowBuilds` 中保持禁用，因此本地测试和 Testbox 通道不会编译原生
  addon。
- 应在 `libopus-wasm` 基准测试仓库中比较原生 opus 的性能，而不是在默认的 OpenClaw 安装/测试循环中比较。不要在默认的 `allowBuilds` 中将 `@discordjs/opus` 设为 `true`；这会使无关的安装/测试循环编译原生代码。

<AccordionGroup>
  <Accordion title="项目、分片与受限通道">

    - 未指定目标的 `pnpm test` 会运行十三个较小的分片配置（`core-unit-fast`、`core-unit-src`、`core-unit-security`、`core-unit-ui`、`core-unit-support`、`core-support-boundary`、`core-tooling`、`core-contracts`、`core-bundled`、`core-runtime`、`agentic`、`auto-reply`、`extensions`），而不是运行一个庞大的原生根项目进程。这样可以降低高负载机器上的峰值 RSS，并避免 auto-reply/plugin 工作挤占其他无关套件的资源。
    - `pnpm test --watch` 仍使用原生根目录的 `vitest.config.ts` 项目图，因为多分片 watch 循环并不实用。
    - `pnpm test`、`pnpm test:watch` 和 `pnpm test:perf:imports` 会先将显式的文件/目录目标路由到作用域通道，因此 `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` 无需承担完整根项目的启动开销。
    - `pnpm test:changed` 默认会将变更的 git 路径扩展到成本较低的作用域通道：直接修改的测试、同级的 `*.test.ts` 文件、明确的源文件映射以及本地导入图依赖项。配置/setup/package 修改不会触发广泛测试，除非显式使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。
    - `pnpm check:changed` 是针对窄范围工作的常规智能本地检查门禁。它会将 diff 分类为核心代码、核心测试、扩展、扩展测试、应用、文档、发布元数据、实时 Docker 工具和工具链，然后运行匹配的类型检查、lint 和守卫命令。它不会运行 Vitest 测试；如需测试证明，请调用 `pnpm test:changed` 或显式执行 `pnpm test <target>`。仅涉及发布元数据的版本升级会运行针对性的版本/配置/根依赖检查，并通过守卫拒绝顶层版本字段之外的 package 修改。
    - 实时 Docker ACP harness 修改会运行聚焦检查：实时 Docker 认证脚本的 shell 语法检查，以及实时 Docker 调度器的 dry-run。只有当 diff 仅限于 `scripts["test:docker:live-*"]` 时才会包含 `package.json` 修改；依赖、导出、版本及其他 package 表面修改仍使用更广泛的守卫。
    - 来自 agents、commands、plugins、auto-reply 辅助程序、`plugin-sdk` 以及类似纯工具区域的轻量导入单元测试会路由到 `unit-fast` 通道，该通道会跳过 `test/setup-openclaw-runtime.ts`；有状态/运行时密集型文件仍保留在现有通道中。
    - 部分 `plugin-sdk` 和 `commands` 辅助源文件在变更模式运行中也会映射到这些轻量通道里的明确同级测试，因此辅助文件修改无需为该目录重新运行完整的重型套件。
    - `auto-reply` 为顶层核心辅助程序、顶层 `reply.*` 集成测试以及 `src/auto-reply/reply/**` 子树分别设置了专用分组。CI 还会进一步将 reply 子树拆分为 agent-runner、dispatch 和 commands/state-routing 分片，避免某个导入密集型分组独占完整的 Node 尾部耗时。
    - 常规 PR/main CI 会有意跳过捆绑插件批量扫描和仅发布使用的 `agentic-plugins` 分片。完整的发布验证会为这些插件密集型套件单独调度 `Plugin Prerelease` 子工作流，并在候选发布版本上运行。

  </Accordion>

  <Accordion title="嵌入式运行器覆盖">

    - 当你更改 message-tool 发现输入或 compaction 运行时上下文时，请保留两层覆盖。
    - 为纯路由和归一化边界添加聚焦的辅助回归测试。
    - 保持嵌入式运行器集成套件健康：
      `src/agents/embedded-agent-runner/compact.hooks.test.ts`,
      `src/agents/embedded-agent-runner/run.overflow-compaction.test.ts`, 和
      `src/agents/embedded-agent-runner/run.overflow-compaction.loop.test.ts`。
    - 这些套件验证作用域 id 和 compaction 行为仍然通过真实的 `run.ts` / `compact.ts` 路径流动；仅辅助程序测试不足以替代这些集成路径。

  </Accordion>

  <Accordion title="Vitest 池和隔离默认值">

    - 基础 Vitest 配置默认使用 `threads`。
    - 共享 Vitest 配置固定使用 `isolate: false`，并在根项目、e2e 和 live 配置中使用非隔离运行器。
    - 根 UI 通道保留其 `jsdom` 设置和优化器，但同样使用共享的非隔离运行器。
    - 每个 `pnpm test` 分片都会从共享 Vitest 配置继承相同的
      `threads` + `isolate: false` 默认值。
    - `scripts/run-vitest.mjs` 默认会为 Vitest 子 Node 进程添加
      `--no-maglev`，以减少大型本地运行期间的 V8 编译开销。
      设置 `OPENCLAW_VITEST_ENABLE_MAGLEV=1` 可与标准 V8
      行为进行比较。
    - 对于显式的非 watch Vitest 运行，如果 5 分钟内没有 stdout 或 stderr
      输出，`scripts/run-vitest.mjs` 会终止该运行。对于有意保持静默的调查，
      设置 `OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=0` 可禁用该 watchdog。

  </Accordion>

  <Accordion title="快速本地迭代">

    - `pnpm changed:lanes` 会显示 diff 会触发哪些架构通道。
    - pre-commit hook 仅负责格式化。它会重新暂存已格式化的文件，不会运行 lint、类型检查或测试。
    - 在交接或推送前，如果需要智能本地检查门禁，请显式运行
      `pnpm check:changed`。
    - `pnpm test:changed` 默认会通过成本较低的作用域通道进行路由。仅当代理判断 harness、配置、package 或契约修改确实需要更广泛的 Vitest 覆盖时，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。
    - `pnpm test:max` 和 `pnpm test:changed:max` 保持相同的路由行为，只是使用更高的 worker 上限。
    - 本地 worker 自动扩缩容有意保持保守，并会在主机负载平均值已经较高时降低并发，因此默认情况下多个并发 Vitest 运行造成的影响更小。
    - 基础 Vitest 配置将项目/配置文件标记为 `forceRerunTriggers`，从而确保测试连接方式发生变化时，变更模式的重新运行仍然正确。
    - 在受支持的主机上，配置会保持启用 `OPENCLAW_VITEST_FS_MODULE_CACHE`；设置 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path` 可为直接性能分析指定一个明确的缓存位置。

  </Accordion>

  <Accordion title="性能调试">

    - `pnpm test:perf:imports` 会启用 Vitest 导入耗时报告以及导入分解输出。
    - `pnpm test:perf:imports:changed` 会将相同的性能分析视图限定为自
      `origin/main` 以来发生变更的文件。
    - 分片耗时数据会写入 `.artifacts/vitest-shard-timings.json`。
      整个配置的运行会使用配置路径作为键；包含模式的 CI 分片会附加分片名称，
      以便分别跟踪经过筛选的分片。
    - 当某个高耗时测试的大部分时间仍花在启动导入上时，应将重型依赖置于范围狭窄的本地 `*.runtime.ts` 接缝之后，并直接 mock 该接缝，而不是仅为了将运行时辅助程序传入 `vi.mock(...)` 就进行深层导入。
    - `pnpm test:perf:changed:bench -- --ref <git-ref>` 会将路由后的
      `test:changed` 与该已提交 diff 的原生根项目路径进行比较，并输出耗时以及 macOS 最大 RSS。
    - `pnpm test:perf:changed:bench -- --worktree` 会通过
      `scripts/test-projects.mjs` 和根目录 Vitest 配置路由变更文件列表，
      对当前存在未提交修改的工作树进行基准测试。
    - `pnpm test:perf:profile:main` 会为 Vitest/Vite 启动和转换开销写入主线程 CPU 配置文件。
    - `pnpm test:perf:profile:runner` 会在禁用文件并行的情况下，为单元测试套件写入运行器 CPU + 堆配置文件。

  </Accordion>
</AccordionGroup>

### 稳定性（网关）

- 命令：`pnpm test:stability:gateway`
- 配置：`test/vitest/vitest.gateway.config.ts`、`test/vitest/vitest.logging.config.ts` 和 `test/vitest/vitest.infra.config.ts`，每个配置均强制使用一个 worker
- 范围：
  - 启动一个默认启用诊断功能的真实回环网关
  - 通过诊断事件路径驱动合成网关消息、内存和大负载的反复变化
  - 通过网关 WS RPC 查询 `diagnostics.stability`
  - 覆盖诊断稳定性捆绑包持久化辅助函数
  - 断言记录器保持有界、合成 RSS 样本低于压力预算，并且每个会话的队列深度最终降回零
- 预期：
  - 对 CI 安全且无需密钥
  - 用于稳定性回归跟进的专用测试通道，不能替代完整的网关测试套件

### E2E（仓库聚合）

- 命令：`pnpm test:e2e`
- 范围：
  - 运行网关冒烟 E2E 通道
  - 运行模拟的控制界面浏览器 E2E 通道
- 预期：
  - 持续集成环境安全且无需密钥
  - 需要安装 Playwright Chromium。

### E2E（网关冒烟测试）

- 命令：`pnpm test:e2e:gateway`
- 配置：`test/vitest/vitest.e2e.config.ts`
- 文件：`src/**/*.e2e.test.ts`、`test/**/*.e2e.test.ts`，以及 `extensions/` 下的捆绑插件 E2E 测试
- 运行时默认设置：
  - 使用 Vitest `threads`，并设置 `isolate: false`，与仓库其余部分保持一致。
  - 使用自适应工作线程（CI：最多 2 个，本地默认 1 个）。
  - 默认以静默模式运行，以减少控制台 I/O 开销。
- 有用的覆盖选项：
  - `OPENCLAW_E2E_WORKERS=<n>` 强制设置工作线程数量（上限为 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 重新启用详细的控制台输出。
- 范围：
  - 多实例网关端到端行为
  - WebSocket/HTTP 接口、节点配对以及更繁重的网络操作
- 预期：
  - 在 CI 中运行（启用流水线时）
  - 不需要真实密钥
  - 比单元测试涉及更多环节（可能运行得更慢）

### E2E（Control UI 模拟浏览器）

- 命令：`pnpm test:ui:e2e`
- 配置：`test/vitest/vitest.ui-e2e.config.ts`
- 文件：`ui/src/**/*.e2e.test.ts`
- 范围：
  - 启动 Vite Control UI
  - 通过 Playwright 驱动真实的 Chromium 页面
  - 使用确定性的浏览器内模拟替换 Gateway WebSocket
- 预期：
  - 作为 `pnpm test:e2e` 的一部分在 CI 中运行
  - 不需要真实的 Gateway、agents 或提供商密钥
  - 必须存在浏览器依赖（`pnpm --dir ui exec playwright install chromium`）。

### E2E：OpenShell 后端冒烟测试

- 命令：`pnpm test:e2e:openshell`
- 文件：`extensions/openshell/src/backend.e2e.test.ts`
- 范围：
  - 复用一个处于活动状态的本地 OpenShell 网关
  - 使用临时本地 Dockerfile 创建沙箱
  - 通过真实的 `sandbox ssh-config` + SSH 执行来测试 OpenClaw 的 OpenShell 后端
  - 通过沙箱文件系统桥接验证远程规范文件系统行为
- 预期：
  - 仅选择性启用；不属于默认的 `pnpm test:e2e` 运行范围
  - 需要本地 `openshell` CLI 以及正常工作的 Docker 守护进程
  - 需要处于活动状态的本地 OpenShell 网关及其配置源
  - 使用隔离的 `HOME` / `XDG_CONFIG_HOME`，然后销毁测试沙箱
- 可用的覆盖项：
  - `OPENCLAW_E2E_OPENSHELL=1`：手动运行更广泛的 e2e 测试套件时启用该测试
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell`：指定非默认的 CLI 二进制文件或包装脚本
  - `OPENCLAW_E2E_OPENSHELL_CONFIG_HOME=/path/to/config`：将已注册的网关配置暴露给隔离测试
  - `OPENCLAW_E2E_OPENSHELL_HOST_IP=172.18.0.1`：覆盖主机策略 fixture 使用的 Docker 网关 IP

### Live（真实提供方 + 真实模型）

- 命令：`pnpm test:live`
- 配置：`test/vitest/vitest.live.config.ts`
- 文件：`src/**/*.live.test.ts`、`test/**/*.live.test.ts`，以及 `extensions/` 下的捆绑插件实时测试
- 默认：通过 `pnpm test:live` **启用**（设置 `OPENCLAW_LIVE_TEST=1`）
- 范围：
  - “该提供方/模型今天使用真实凭据是否确实可用？”
  - 捕获提供方格式变更、工具调用差异、身份验证问题和速率限制行为
- 预期：
  - 按设计无法保证 CI 稳定（真实网络、真实提供方策略、配额和服务中断）
  - 会产生费用 / 消耗速率限制额度
  - 优先运行缩小范围的子集，而不是运行“全部”测试
- 实时运行使用已导出的 API 密钥和预置的身份验证配置文件。
- 默认情况下，实时运行仍会隔离 `HOME`，并将配置/身份验证材料复制到临时测试主目录中，因此单元测试 fixture 无法修改真实的 `~/.openclaw`。
- 仅当你确实需要实时测试使用真实主目录时，才设置 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 默认使用更安静的模式：保留 `[live] ...` 进度输出，并静默网关启动日志/Bonjour 输出。如果希望恢复完整的启动日志，请设置 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 密钥轮换（特定提供方）：使用逗号/分号格式设置 `*_API_KEYS`，或设置 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`）；也可以通过 `OPENCLAW_LIVE_*_KEY` 进行每次实时运行的覆盖设置；测试会在收到速率限制响应时重试。
- 进度/心跳输出：
  - 实时测试套件会将进度行输出到 stderr，因此即使 Vitest 控制台捕获处于安静状态，长时间运行的提供方调用也能显示为正在进行。
  - `test/vitest/vitest.live.config.ts` 会禁用 Vitest 控制台拦截，因此在实时运行期间，提供方/网关的进度行会立即流式输出。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 调整直接模型的心跳间隔。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 调整网关/探测器的心跳间隔。

## 我应该运行哪个测试套件？

使用这个决策表：

- 编辑逻辑/测试：运行 `pnpm test`（如果你改动很多，再加上 `pnpm test:coverage`）
- 触碰 gateway 网络 / WS 协议 / 配对：再加上 `pnpm test:e2e`
- 调试“我的机器人挂了”/特定提供方失败/工具调用：运行缩小范围的 `pnpm test:live`。

## Live（涉及网络）的测试

对于实时模型矩阵、CLI 后端冒烟测试、ACP 冒烟测试、Codex 应用服务器
测试工具，以及所有媒体提供商的实时测试（Deepgram、BytePlus、ComfyUI、
图像、音乐、视频、媒体测试工具），还包括实时运行的凭据处理

- 请参阅[测试实时测试套件](/help/testing-live)。有关专门的更新和
  插件验证清单，请参阅[测试更新和插件](/help/testing-updates-plugins)。

## Docker 运行器（可选的“在 Linux 上可用”检查）

这些 Docker 运行器分成两类：

- 直接模型运行器：`test:docker:live-models` 和 `test:docker:live-gateway` 只在仓库 Docker 镜像中运行与其匹配的 profile-key live 文件（`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`），并挂载你的本地配置目录、工作区和可选的 profile env 文件。对应的本地入口点是 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker live 运行器会在需要时保留各自的实际限制：
  `test:docker:live-models` 默认使用经过筛选的高信号支持集合，而
  `test:docker:live-gateway` 默认使用 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`、
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`、
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` 和 `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。当你明确需要更小的上限或更大的扫描范围时，可设置 `OPENCLAW_LIVE_MAX_MODELS`
  或 gateway 环境变量。
- `test:docker:all` 通过 `test:docker:live-build` 只构建一次 live Docker 镜像，通过 `scripts/package-openclaw-for-docker.mjs` 将 OpenClaw 打包成一个 npm tarball，然后构建/复用两个 `scripts/e2e/Dockerfile` 镜像。裸镜像只是用于 install/update/plugin-dependency 通道的 Node/Git 运行器；这些通道会挂载预构建的 tarball。功能镜像会将同一个 tarball 安装到 `/app`，用于已构建应用功能通道。Docker 通道定义位于 `scripts/lib/docker-e2e-scenarios.mjs`；规划逻辑位于 `scripts/lib/docker-e2e-plan.mjs`；`scripts/test-docker-all.mjs` 负责执行所选计划。聚合流程使用加权本地调度器：`OPENCLAW_DOCKER_ALL_PARALLELISM` 控制进程槽位，而资源上限会阻止过重的 live、npm-install 和多服务通道同时启动。如果单个通道比当前上限更重，调度器仍然可以在池为空时启动它，然后让它单独运行，直到再次有容量。默认值为 10 个槽位、`OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=5` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；只有当 Docker 主机有更多余量时，才调整 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`（以及其他 `OPENCLAW_DOCKER_ALL_<RESOURCE>_LIMIT` 覆盖项）。运行器默认会执行 Docker 预检，移除过期的 OpenClaw E2E 容器，每 30 秒打印状态，将成功的通道计时存储在 `.artifacts/docker-tests/lane-timings.json`，并利用这些计时在后续运行中优先启动更长的通道。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 可在不构建或运行 Docker 的情况下打印加权通道清单，或使用 `node scripts/test-docker-all.mjs --plan-json` 打印所选通道、包/镜像需求和凭据的 CI 计划。
- `Package Acceptance` 是 GitHub 原生的包门禁，用于判断“这个可安装 tarball 是否能作为产品工作？”它会从 `source=npm`、`source=ref`、`source=url`、`source=trusted-url` 或 `source=artifact` 中解析一个候选包，将其作为 `package-under-test` 上传，然后针对这个精确 tarball 运行可复用的 Docker E2E 通道，而不是重新打包所选 ref。Profile 按广度排序：`smoke`、`package`、`product` 和 `full`（以及用于显式通道列表的 `custom`）。有关包/更新/插件契约、已发布升级幸存者矩阵、发布默认值和失败分流，请参见 [Testing updates and plugins](/help/testing-updates-plugins)。
- 构建和发布检查会在 tsdown 之后运行 `scripts/check-cli-bootstrap-imports.mjs`。该守卫从 `dist/entry.js` 和 `dist/cli/run-main.js` 追踪静态构建图，如果命令分发之前的预分发启动图静态导入了任何外部包，就会失败（Commander、prompt UI、undici、日志记录以及类似启动阶段负载较重的依赖都包括在内）；它还会将打包后的 gateway 运行 chunk 限制在 70 KB，并拒绝从该 chunk 静态导入已知的冷门 gateway 路径（`control-ui-assets`、`diagnostic-stability-bundle`、`onboard-helpers`、`process-respawn`、`restart-sentinel`、`server-close`、`server-reload-handlers`）。`scripts/release-check.ts` 还会分别使用 `--help`、`onboard --help`、`doctor --help`、`status --json --timeout 1`、`config schema` 和 `models list --provider openai` 对打包后的 CLI 执行 smoke 测试。
- Package Acceptance 的旧版兼容性上限为 `2026.4.25`（包含 `2026.4.25-beta.*`）。在该截止点之前，harness 只容忍已发布包的元数据缺口：省略的 private QA 清单项、缺失的 `gateway install --wrapper`、tarball 派生的 git fixture 中缺失的 patch 文件、缺失的持久化 `update.channel`、旧版插件安装记录位置、缺失的 marketplace 安装记录持久化，以及 `plugins update` 期间的配置元数据迁移。对于 `2026.4.25` 之后的包，这些路径都属于严格失败。
- 容器 smoke 运行器：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:npm-onboard-channel-agent`、`test:docker:release-user-journey`、`test:docker:release-typed-onboarding`、`test:docker:release-media-memory`、`test:docker:release-upgrade-user-journey`、`test:docker:release-plugin-marketplace`、`test:docker:skill-install`、`test:docker:update-channel-switch`、`test:docker:upgrade-survivor`、`test:docker:published-upgrade-survivor`、`test:docker:session-runtime-context`、`test:docker:agents-delete-shared-workspace`、`test:docker:gateway-network`、`test:docker:browser-cdp-snapshot`、`test:docker:mcp-channels`、`test:docker:agent-bundle-mcp-tools`、`test:docker:cron-mcp-cleanup`、`test:docker:plugins`、`test:docker:plugin-update`、`test:docker:plugin-lifecycle-matrix` 和 `test:docker:config-reload` 会启动一个或多个真实容器，并验证更高层级的集成路径。
- 通过 `scripts/lib/openclaw-e2e-instance.sh` 安装打包后的 OpenClaw tarball 的 Docker/Bash E2E 通道，会将 `npm install` 限制在 `OPENCLAW_E2E_NPM_INSTALL_TIMEOUT` 内（默认 `600s`；设置为 `0` 可在调试时禁用该包装器）。

live-model Docker 运行器还会以 bind-mount 方式挂载当前检出内容，并设为只读，然后将其暂存到容器内的临时工作目录中。这样既能保持运行时镜像精简，又能让 Vitest 针对你本地的确切源代码/配置运行。暂存步骤会跳过大型本地缓存和应用构建输出，例如 `.pnpm-store`、`.worktrees`、`__openclaw_vitest__` 以及应用本地的 `.build` 或 Gradle 输出目录，因此 Docker live 运行不会花费数分钟复制与机器相关的构建产物。它们还会设置
`OPENCLAW_SKIP_CHANNELS=1`，确保 gateway live 探测不会在容器内启动真实的 Telegram/Discord 等通道工作进程。
`test:docker:live-models` 仍然会运行 `pnpm test:live`，因此当你需要缩小范围或排除该 Docker 通道中的 gateway live 覆盖时，也要传递
`OPENCLAW_LIVE_GATEWAY_*`。

`test:docker:openwebui` 是更高层级的兼容性 smoke：它会启动一个启用了 OpenAI 兼容 HTTP 端点的 OpenClaw gateway 容器，针对该 gateway 启动一个固定版本的 Open WebUI 容器，通过 Open WebUI 登录，验证 `/api/models` 暴露 `openclaw/default`，然后通过 Open WebUI 的 `/api/chat/completions` 代理发送真实聊天请求。对于应在 Open WebUI 登录和模型发现后停止、无需等待 live 模型完成的发布路径 CI 检查，可设置 `OPENWEBUI_SMOKE_MODE=models`。首次运行可能会明显更慢，因为 Docker 可能需要拉取 Open WebUI 镜像，而 Open WebUI 也可能需要完成自身的冷启动设置。该通道需要可用的 live 模型密钥，可通过进程环境、暂存的认证 profile 或显式的
`OPENCLAW_PROFILE_FILE` 提供。成功运行会打印类似
`{ "ok": true, "model": "openclaw/default", ... }`
的小型 JSON 负载。

`test:docker:mcp-channels` 是有意设计为确定性的，不需要真实的 Telegram、Discord 或 iMessage 账号。它会启动一个预置的 Gateway 容器，再启动一个生成 `openclaw mcp serve` 的第二容器，然后通过真实的 stdio MCP bridge 验证路由后的会话发现、transcript 读取、附件元数据、实时事件队列行为、出站发送路由，以及 Claude 风格的通道和权限通知。通知检查会直接检查原始 stdio MCP 帧，因此该 smoke 验证的是 bridge 实际发出的内容，而不仅仅是某个特定客户端 SDK 恰好展示的内容。

`test:docker:agent-bundle-mcp-tools` 是确定性的，不需要 live 模型密钥。它会构建仓库 Docker 镜像，在容器内启动一个真实的 stdio MCP 探测服务器，通过内嵌的 OpenClaw bundle MCP 运行时实例化该服务器，执行工具，然后验证 `coding` 和 `messaging` 保留 `bundle-mcp` 工具，而 `minimal` 和
`tools.deny: ["bundle-mcp"]` 会对其进行过滤。

`test:docker:cron-mcp-cleanup` 是确定性的，不需要 live 模型密钥。它会启动一个带有真实 stdio MCP 探测服务器的预置 Gateway，运行一个隔离的 cron 回合和一个 `sessions_spawn` 一次性子进程回合，然后验证每次运行后 MCP 子进程都已退出。

手动 ACP 纯语言线程 smoke（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 保留这个脚本用于回归/调试工作流。它将来可能还需要用于 ACP 线程路由验证，所以不要删除它。

有用的环境变量：

- `OPENCLAW_CONFIG_DIR=...`（默认：`~/.openclaw`），挂载到 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（默认：`~/.openclaw/workspace`），挂载到 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`，在运行测试前挂载并加载
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1`，仅验证从 `OPENCLAW_PROFILE_FILE` 加载的环境变量，使用临时配置/工作区目录，并且不挂载外部 CLI 认证目录
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...`（默认：`~/.cache/openclaw/docker-cli-tools`，除非该运行已使用 CI/托管 bind 目录），挂载到 `/home/node/.npm-global`，用于 Docker 内的缓存 CLI 安装
- `$HOME` 下的外部 CLI 认证目录/文件会以只读方式挂载到 `/host-auth...` 下，然后在测试开始前复制到 `/home/node/...`
  - 默认目录（当运行未缩小到特定 provider 时使用）：`.factory`、`.gemini`、`.minimax`
  - 默认文件：`~/.codex/auth.json`、`~/.codex/config.toml`、`.claude.json`、`~/.claude/.credentials.json`、`~/.claude/settings.json`、`~/.claude/settings.local.json`
  - 缩小范围的 provider 运行只会挂载根据 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推断出的所需目录/文件
  - 可通过 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none` 或类似 `.claude,.codex` 的逗号列表手动覆盖
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...`，用于缩小运行范围
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...`，用于过滤容器内的 provider
- `OPENCLAW_SKIP_DOCKER_BUILD=1`，用于复用已有的 `openclaw:local-live` 镜像，以便在不需要重新构建的情况下重新运行
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1`，确保凭据来自 profile 存储，而不是环境变量
- `OPENCLAW_OPENWEBUI_MODEL=...`，用于选择由 gateway 暴露给 Open WebUI smoke 的模型
- `OPENCLAW_OPENWEBUI_PROMPT=...`，用于覆盖 Open WebUI smoke 使用的 nonce 检查提示词
- `OPENWEBUI_IMAGE=...`，用于覆盖固定版本的 Open WebUI 镜像标签

- 发布用户旅程 smoke：`pnpm test:docker:release-user-journey` 会在干净的 Docker home 中全局安装打包后的 OpenClaw tarball，运行 onboarding，配置一个模拟的 OpenAI provider，运行一次 agent 回合，安装/卸载外部插件，针对本地 fixture 配置 ClickClack，验证出站/入站消息传递，重启 Gateway，然后运行 doctor。
- 发布类型化 onboarding smoke：`pnpm test:docker:release-typed-onboarding` 会安装打包后的 tarball，通过真实 TTY 驱动 `openclaw onboard`，将 OpenAI 配置为 env-ref provider，验证不会持久化原始密钥，然后运行一次模拟的 agent 回合。
- 发布媒体/记忆 smoke：`pnpm test:docker:release-media-memory` 会安装打包后的 tarball，验证从 PNG 附件理解图像、OpenAI 兼容的图像生成输出、记忆搜索召回，以及 Gateway 重启后的召回持久性。
- 发布升级用户旅程 smoke：`pnpm test:docker:release-upgrade-user-journey` 默认安装比候选 tarball 更旧的最新已发布基线，在已发布包上配置 provider/plugin/ClickClack 状态，升级到候选 tarball，然后重新运行核心 agent/plugin/channel 旅程。如果不存在更旧的已发布基线，则复用候选版本。通过 `OPENCLAW_RELEASE_UPGRADE_BASELINE_SPEC=openclaw@<version>` 覆盖基线。
- 发布插件 marketplace smoke：`pnpm test:docker:release-plugin-marketplace` 会从本地 fixture marketplace 安装插件，更新已安装的插件，卸载该插件，并验证插件 CLI 消失且安装元数据已清理。
- Skill 安装 smoke：`pnpm test:docker:skill-install` 会在 Docker 中全局安装打包后的 OpenClaw tarball，在配置中禁用上传的归档安装，从搜索结果中解析当前 live ClawHub skill slug，使用 `openclaw skills install` 安装它，并验证已安装的 skill 以及 `.clawhub` 来源/锁定元数据。
- 更新通道切换 smoke：`pnpm test:docker:update-channel-switch` 会在 Docker 中全局安装打包后的 OpenClaw tarball，从 package `stable` 切换到 git `dev`，验证持久化通道和插件在更新后仍然正常工作，然后切回 package `stable` 并检查更新状态。
- 升级幸存者 smoke：`pnpm test:docker:upgrade-survivor` 会在一个包含 agents、通道配置、插件 allowlist、过期插件依赖状态以及现有工作区/会话文件的脏旧用户 fixture 上安装打包后的 OpenClaw tarball。它会在没有 live provider 或通道密钥的情况下运行包更新和非交互式 doctor，然后启动 loopback Gateway，并检查配置/状态保留情况以及启动/状态预算。
- 已发布升级幸存者 smoke：`pnpm test:docker:published-upgrade-survivor` 默认安装 `openclaw@latest`，生成真实的现有用户文件，使用内置命令配方配置该基线，验证生成的配置，将该已发布安装更新为候选 tarball，运行非交互式 doctor，写入 `.artifacts/upgrade-survivor/summary.json`，然后启动 loopback Gateway，并检查已配置的 intents、状态保留、启动、`/healthz`、`/readyz` 和 RPC 状态预算。通过 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 覆盖一个基线；通过 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS`（例如 `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`）要求聚合调度器扩展精确的本地基线；通过 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS`（例如 `reported-issues`）扩展问题形态的 fixture；reported-issues 集合包含用于自动修复外部 OpenClaw 插件安装的 `configured-plugin-installs`。Package Acceptance 将这些暴露为 `published_upgrade_survivor_baseline`、`published_upgrade_survivor_baselines` 和 `published_upgrade_survivor_scenarios`，解析 `last-stable-4` 或 `all-since-2026.4.23` 等元基线令牌；Full Release Validation 会将 release-soak 包门禁扩展为 `last-stable-4 2026.4.23 2026.5.2 2026.4.15` 以及 `reported-issues`。
- 会话运行时上下文 smoke：`pnpm test:docker:session-runtime-context` 会验证隐藏运行时上下文的 transcript 持久化，以及 doctor 对受影响的重复 prompt-rewrite 分支进行修复。
- Bun 全局安装 smoke：`bash scripts/e2e/bun-global-install-smoke.sh` 会打包当前代码树，在隔离 home 中使用 `bun install -g` 安装，并验证 `openclaw infer image providers --json` 返回已捆绑的图像 provider，而不是卡住。通过 `OPENCLAW_BUN_GLOBAL_SMOKE_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 复用预构建 tarball，通过 `OPENCLAW_BUN_GLOBAL_SMOKE_HOST_BUILD=0` 跳过主机构建，或通过 `OPENCLAW_BUN_GLOBAL_SMOKE_DIST_IMAGE=openclaw-dockerfile-smoke:local` 从已构建的 Docker 镜像复制 `dist/`。
- 安装器 Docker smoke：`bash scripts/test-install-sh-docker.sh` 会在 root、update 和 direct-npm 容器之间共享一个 npm 缓存。更新 smoke 默认使用 npm `latest` 作为 stable 基线，然后升级到候选 tarball。在本地通过 `OPENCLAW_INSTALL_SMOKE_UPDATE_BASELINE=2026.4.22` 覆盖，或在 GitHub 的 Install Smoke 工作流中通过 `update_baseline_version` 输入覆盖。非 root 安装器检查使用隔离的 npm 缓存，因此 root 所有的缓存条目不会掩盖用户本地的安装行为。设置 `OPENCLAW_INSTALL_SMOKE_NPM_CACHE_DIR=/path/to/cache`，可在本地重复运行之间复用 root/update/direct-npm 缓存。
- Install Smoke CI 会通过 `OPENCLAW_INSTALL_SMOKE_SKIP_NPM_GLOBAL=1` 跳过重复的 direct-npm 全局更新；当需要覆盖直接 `npm install -g` 时，在本地运行脚本时不要设置该环境变量。
- Agents 删除共享工作区 CLI smoke：`pnpm test:docker:agents-delete-shared-workspace`（脚本：`scripts/e2e/agents-delete-shared-workspace-docker.sh`）默认构建 root Dockerfile 镜像，在隔离的容器 home 中创建两个共享一个工作区的 agent，运行 `agents delete --json`，并验证有效 JSON 以及工作区保留行为。通过 `OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_IMAGE=openclaw-dockerfile-smoke:local OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_SKIP_BUILD=1` 复用 install-smoke 镜像。
- Gateway 网络和主机生命周期：`pnpm test:docker:gateway-network`（脚本：`scripts/e2e/gateway-network-docker.sh`）保留双容器 LAN WebSocket 身份验证/健康检查 smoke，然后使用 loopback Admin HTTP 证明 prepare fencing、保留控制访问、恢复继续运行，以及同一容器内已准备好的停止/启动。重启检查必须在原始租约过期前完成，验证挂起状态是进程本地的，而持久化的 Gateway 配置和容器身份仍然保留，并输出机器可读的阶段计时 JSON。
- 浏览器 CDP 快照 smoke：`pnpm test:docker:browser-cdp-snapshot`（脚本：`scripts/e2e/browser-cdp-snapshot-docker.sh`）会构建源代码 E2E 镜像和 Chromium 层，使用原始 CDP 启动 Chromium，运行 `browser doctor --deep`，并验证 CDP 角色快照覆盖链接 URL、光标提升的可点击元素、iframe 引用和 frame 元数据。
- OpenAI Responses `web_search` 最小推理回归：`pnpm test:docker:openai-web-search-minimal`（脚本：`scripts/e2e/openai-web-search-minimal-docker.sh`）通过 Gateway 运行模拟的 OpenAI 服务器，验证 `web_search` 会将 `reasoning.effort` 从 `minimal` 提升到 `low`，然后强制 provider schema 拒绝，并检查原始详细信息是否出现在 Gateway 日志中。
- MCP 通道 bridge（预置 Gateway + stdio bridge + 原始 Claude 通知帧 smoke）：`pnpm test:docker:mcp-channels`（脚本：`scripts/e2e/mcp-channels-docker.sh`）
- OpenClaw bundle MCP 工具（真实 stdio MCP 服务器 + 内嵌 OpenClaw profile allow/deny smoke）：`pnpm test:docker:agent-bundle-mcp-tools`（脚本：`scripts/e2e/agent-bundle-mcp-tools-docker.sh`）
- Cron/子 agent MCP 清理（真实 Gateway + 隔离 cron 和一次性子 agent 运行后的 stdio MCP 子进程清理）：`pnpm test:docker:cron-mcp-cleanup`（脚本：`scripts/e2e/cron-mcp-cleanup-docker.sh`）
- 插件（涵盖本地路径、`file:`、带提升依赖的 npm registry、格式错误的 npm 包元数据、git 移动引用、ClawHub kitchen-sink、marketplace 更新以及 Claude-bundle 启用/检查的安装/更新 smoke）：`pnpm test:docker:plugins`（脚本：`scripts/e2e/plugins-docker.sh`）
  设置 `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` 可跳过 ClawHub 部分，或通过 `OPENCLAW_PLUGINS_E2E_CLAWHUB_SPEC` 和 `OPENCLAW_PLUGINS_E2E_CLAWHUB_ID` 覆盖默认的 kitchen-sink 包/运行时组合。如果没有设置 `OPENCLAW_CLAWHUB_URL`/`CLAWHUB_URL`，测试会使用 hermetic 的本地 ClawHub fixture 服务器。
- 插件更新未变化 smoke：`pnpm test:docker:plugin-update`（脚本：`scripts/e2e/plugin-update-unchanged-docker.sh`）
- 插件生命周期矩阵 smoke：`pnpm test:docker:plugin-lifecycle-matrix` 会在裸容器中安装打包后的 OpenClaw tarball，安装一个 npm 插件，通过本地 npm registry 对其进行启用/禁用切换、升级和降级，删除已安装代码，然后验证卸载仍会移除过期状态，同时记录每个生命周期阶段的 RSS/CPU 指标。
- 配置重载元数据 smoke：`pnpm test:docker:config-reload`（脚本：`scripts/e2e/config-reload-source-docker.sh`）
- 插件：`pnpm test:docker:plugins` 覆盖本地路径、`file:`、带提升依赖的 npm registry、git 移动引用、ClawHub fixture、marketplace 更新以及 Claude-bundle 启用/检查的安装/更新 smoke。`pnpm test:docker:plugin-update` 覆盖已安装插件的未变化更新行为。`pnpm test:docker:plugin-lifecycle-matrix` 覆盖带资源跟踪的 npm 插件安装、启用、禁用、升级、降级和缺失代码卸载。

要手动预构建并复用共享功能镜像：

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

像 `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE` 这样的套件专用镜像覆盖在设置时仍然优先。当 `OPENCLAW_SKIP_DOCKER_BUILD=1` 指向远程共享镜像时，如果该镜像本地尚不存在，脚本会拉取它。QR 和安装器 Docker 测试保留各自的 Dockerfile，因为它们验证的是包/安装行为，而不是共享的已构建应用运行时。

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

契约测试用于验证每个已注册的插件和通道是否符合其接口契约。它们会遍历所有已发现的插件，并运行一套形状和行为断言。默认的 `pnpm test` 单元测试流程会有意跳过这些共享接缝和冒烟测试文件；当你修改共享通道或提供方接口时，请显式运行契约测试命令。

### 命令

- 所有契约：`pnpm test:contracts`
- 仅通道契约：`pnpm test:contracts:channels`
- 仅提供方契约：`pnpm test:contracts:plugins`

### 通道契约

位于 `src/channels/plugins/contracts/*.contract.test.ts`。当前的顶层类别包括：

- **channel-catalog** - 内置/注册表通道目录条目元数据
- **plugin**（基于注册表，分片执行） - 基本插件注册形状
- **surfaces-only**（基于注册表，分片执行） - 针对 `actions`、`setup`、`status`、`outbound`、`messaging`、`threading`、`directory` 和 `gateway` 各接口的形状检查
- **session-binding**（基于注册表） - 会话绑定行为
- **outbound-payload** - 消息负载结构和规范化
- **group-policy**（回退） - 每个通道的默认群组策略强制执行
- **threading**（基于注册表，分片执行） - 线程 ID 处理
- **directory**（基于注册表，分片执行） - 目录/名册 API
- **registry** 和 **plugins-core.\*** - 通道插件注册表、加载器和配置写入授权内部逻辑

这些测试套件使用的入站分发捕获和出站负载测试工具辅助函数，通过 `src/plugin-sdk/channel-contract-testing.ts` 在内部提供（不包含在 npm 包中，也不是公共 SDK 子路径）；此目录中没有独立的 `inbound.contract.test.ts` 文件。

### 提供方契约

位于 `src/plugins/contracts/*.contract.test.ts`。当前类别包括：

- **shape** - 插件清单、API 和运行时导出形状
- **plugin-registration**（+ 并行） - 清单注册用例
- **package-manifest** - 包清单要求
- **loader** - 插件加载器的设置/清理行为
- **registry** - 插件契约注册表内容和查找
- **providers** - 内置提供方之间的共享提供方行为，以及 Web 搜索提供方
- **auth-choice** - 身份验证选项元数据和设置行为
- **provider-catalog-deprecation** - 已弃用的提供方目录元数据
- **wizard.choice-resolution**、**wizard.model-picker**、**wizard.setup-options** - 提供方设置向导契约
- **embedding-provider**、**memory-embedding-provider**、**web-fetch-provider**、**tts** - 特定能力的提供方契约
- **session-actions**、**session-attachments**、**session-entry-projection** - 插件自有的会话状态契约
- **scheduled-turns** - 插件计划回合元数据和时间戳范围
- **host-hooks**、**run-context-lifecycle**、**runtime-import-side-effects**、**runtime-seams** - 插件主机/运行时生命周期和导入边界契约
- **extension-runtime-dependencies** - 扩展的运行时依赖放置

### 何时运行

- 在更改 plugin-sdk 导出或子路径之后
- 在添加或修改通道或提供方插件之后
- 在重构插件注册或发现逻辑之后

契约测试在 CI 中运行，不需要真实 API key。

## 添加回归测试（指南）

当你修复了线上发现的 provider/model 问题时：

- 如果可能，添加一个 CI 安全的回归测试（模拟/存根 provider，或捕获确切的请求形状转换）
- 如果问题本质上只能通过线上环境测试（速率限制、身份验证策略），则保持线上测试范围狭窄，并通过环境变量选择性启用
- 优先针对能够捕获该问题的最小层级：
  - provider 请求转换/重放问题 -> 直接的 models 测试
  - gateway 会话/历史记录/工具流水线问题 -> gateway 线上冒烟测试或 CI 安全的 gateway 模拟测试
- SecretRef 遍历防护：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 根据注册表元数据（`listSecretTargetRegistryEntries()`）为每个 SecretRef 类派生一个采样目标，然后断言遍历分段的 exec id 会被拒绝。
  - 如果你在 `src/secrets/target-registry-data.ts` 中新增了一个 `includeInPlan` SecretRef 目标族，请更新该测试中的 `classifyTargetClass`。对于未分类的目标 id，该测试会有意失败，因此新的类别无法被静默跳过。

## 相关

- [测试实时功能](/help/testing-live)
- [测试更新和插件](/help/testing-updates-plugins)
- [CI](/ci)
