---
summary: "测试工具包：unit/e2e/live 套件、Docker runner，以及各测试覆盖范围"
read_when:
  - 在本地或 CI 中运行测试时
  - 为模型/提供商 bug 添加回归测试时
  - 调试 gateway + agent 行为时
title: "测试"
---

OpenClaw 有三个 Vitest 套件（unit/integration、e2e、live）以及一小组
Docker runner。本文档是“我们如何测试”的指南：

- 每个套件覆盖什么（以及它明确不覆盖什么）。
- 常见工作流（本地、pre-push、调试）应运行哪些命令。
- live 测试如何发现凭据并选择模型/提供商。
- 如何为真实世界的模型/提供商问题添加回归测试。

## 快速开始

大多数时候：

- 完整门禁（推送前预期执行）：`pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- 更快的本地全套运行（在资源充足的机器上）：`pnpm test:max`
- 直接使用 Vitest watch 循环：`pnpm test:watch`
- 直接指定文件现在也会路由扩展名/频道路径：`pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- 当你正在迭代单个失败案例时，优先进行有针对性的运行。
- Docker 驱动的 QA 站点：`pnpm qa:lab:up`
- Linux VM 驱动的 QA 线路：`pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

当你修改测试或想获得额外信心时：

- 覆盖率门禁：`pnpm test:coverage`
- E2E 套件：`pnpm test:e2e`

当你在调试真实提供商/模型（需要真实凭据）时：

- Live 套件（模型 + gateway 工具/图像探测）：`pnpm test:live`
- 静默运行单个 live 文件：`pnpm test:live -- src/agents/models.profiles.live.test.ts`
- Docker live 模型扫描：`pnpm test:docker:live-models`
  - 每个被选中的模型现在都会运行一次文本轮次以及一个小型文件读取式探测。
    元数据声明支持 `image` 输入的模型还会额外运行一个小型图像轮次。
    在隔离提供商故障时，可使用
    `OPENCLAW_LIVE_MODEL_FILE_PROBE=0` 或
    `OPENCLAW_LIVE_MODEL_IMAGE_PROBE=0` 禁用额外探测。
  - CI 覆盖：每日的 `OpenClaw Scheduled Live And E2E Checks` 和手动的
    `OpenClaw Release Checks` 都会调用可复用的 live/E2E workflow，
    并设置 `include_live_suites: true`，其中包含按提供商分片的独立 Docker live 模型矩阵作业。
  - 若需聚焦重跑 CI，可触发 `OpenClaw Live And E2E Checks (Reusable)`，
    并设置 `include_live_suites: true` 与 `live_models_only: true`。
  - 将新的高信号提供商密钥添加到 `scripts/ci-hydrate-live-auth.sh`
    以及 `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml` 和它的
    scheduled/release 调用方中。
- 原生 Codex 绑定聊天冒烟测试：`pnpm test:docker:live-codex-bind`
  - 在 Codex app-server 路径上运行 Docker live 线路，用 `/codex bind` 绑定一个合成的
    Slack DM，执行 `/codex fast` 和 `/codex permissions`，然后验证普通回复和图像附件
    通过原生插件绑定而不是 ACP 路由。
- Codex app-server harness 冒烟测试：`pnpm test:docker:live-codex-harness`
  - 通过插件拥有的 Codex app-server harness 运行 gateway agent 轮次，
    验证 `/codex status` 和 `/codex models`，并默认执行图像、cron MCP、sub-agent
    和 Guardian 探测。隔离其他 Codex app-server 故障时，可通过
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=0` 禁用 sub-agent 探测。若要
    专门检查 sub-agent，可禁用其他探测：
    `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1 pnpm test:docker:live-codex-harness`。
    除非设置了
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_ONLY=0`，否则此命令会在 sub-agent 探测后退出。
- Crestodian rescue 命令冒烟测试：`pnpm test:live:crestodian-rescue-channel`
  - 针对消息频道 rescue 命令表面的可选“多一层保险”检查。它会执行 `/crestodian status`，
    队列一个持久化模型变更，回复 `/crestodian yes`，并验证审计/配置写入路径。
- Crestodian planner Docker 冒烟测试：`pnpm test:docker:crestodian-planner`
  - 在无配置的容器中运行 Crestodian，PATH 上使用假的 Claude CLI，并验证模糊规划器回退会转换为
    经过审计的类型化配置写入。
- Crestodian 首次运行 Docker 冒烟测试：`pnpm test:docker:crestodian-first-run`
  - 从空的 OpenClaw 状态目录开始，将裸 `openclaw` 路由到 Crestodian，应用 setup/model/agent/Discord
    插件 + SecretRef 写入，验证配置，并检查审计条目。相同的 Ring 0 setup 路径也在 QA Lab 中通过
    `pnpm openclaw qa suite --scenario crestodian-ring-zero-setup` 覆盖。
- Moonshot/Kimi 费用冒烟测试：在设置 `MOONSHOT_API_KEY` 后，运行
  `openclaw models list --provider moonshot --json`，然后针对 `moonshot/kimi-k2.6`
  运行一个隔离的
  `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json`
  。验证 JSON 报告 Moonshot/K2.6，并且 assistant 转录中存储了规范化的 `usage.cost`。

<Tip>
当你只需要一个失败案例时，优先使用下方描述的 allowlist 环境变量缩小 live 测试范围。
</Tip>

## QA 专用 runner

当你需要 QA 实验室级别的真实感时，这些命令与主测试套件并列存在：

CI 在专门的 workflows 中运行 QA Lab。`Parity gate` 会在匹配的 PR 上以及通过手动
dispatch 时，使用 mock provider 运行。`QA-Lab - All Lanes` 会在 `main` 上夜间运行
以及通过手动 dispatch 运行，包含 mock parity gate、live Matrix 线路、Convex 托管的 live
Telegram 线路和 Convex 托管的 live Discord 线路，作为并行作业。计划任务的 QA 和 release
检查会显式传入 Matrix `--profile fast`，而 Matrix CLI 和手动 workflow 输入的默认值仍为
`all`；手动 dispatch 可以将 `all` 分片为 `transport`、`media`、`e2ee-smoke`、
`e2ee-deep` 和 `e2ee-cli` 作业。`OpenClaw Release Checks` 在发布审批前会先运行 parity、
fast Matrix 和 Telegram 线路。

- `pnpm openclaw qa suite`
  - 直接在主机上运行仓库支持的 QA 场景。
  - 默认会以隔离的 gateway worker 并行运行多个所选场景。`qa-channel` 默认并发为 4
    （受所选场景数量限制）。使用 `--concurrency <count>` 调整 worker 数量，或使用
    `--concurrency 1` 回到旧的串行线路。
  - 当任何场景失败时以非零状态退出。需要保留产物但不想让命令失败退出时可使用
    `--allow-failures`。
  - 支持 provider 模式 `live-frontier`、`mock-openai` 和 `aimock`。
    `aimock` 会启动一个本地 AIMock 驱动的 provider server，用于实验性 fixture 和协议 mock
    覆盖，但不会替换具有场景感知能力的 `mock-openai` 线路。
- `pnpm openclaw qa suite --runner multipass`
  - 在一次性的 Multipass Linux VM 中运行相同的 QA 套件。
  - 与主机上的 `qa suite` 保持相同的场景选择行为。
  - 复用与 `qa suite` 相同的 provider/model 选择标志。
  - live 运行会转发对 guest 实际可用的 QA 认证输入：
    基于环境变量的 provider key、QA live provider 配置路径，以及存在时的
    `CODEX_HOME`。
  - 输出目录必须保持在仓库根目录下，这样 guest 才能通过挂载的 workspace 写回。
  - 会将常规 QA report + summary 以及 Multipass 日志写到
    `.artifacts/qa-e2e/...` 下。
- `pnpm qa:lab:up`
  - 启动 Docker 驱动的 QA 站点，用于操作员式 QA 工作。
- `pnpm test:docker:npm-onboard-channel-agent`
  - 从当前检出构建 npm tarball，在 Docker 中全局安装它，运行非交互式 OpenAI API key
    onboarding，默认配置 Telegram，验证启用插件会按需安装运行时依赖，运行 doctor，并
    针对一个 mocked OpenAI 端点运行一次本地 agent 轮次。
  - 使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 可以在 Discord 上运行同一个打包安装线路。
- `pnpm test:docker:session-runtime-context`
  - 运行一个确定性的 built-app Docker 冒烟测试，用于嵌入式 runtime context 转录。
    它会验证隐藏的 OpenClaw runtime context 被作为不可展示的自定义消息持久化，而不是泄漏到
    可见的用户轮次中，然后种入一个受影响的损坏 session JSONL，并验证
    `openclaw doctor --fix` 会将其重写到活动分支并生成备份。
- `pnpm test:docker:npm-telegram-live`
  - 在 Docker 中安装一个 OpenClaw 包候选，运行已安装包的 onboarding，通过已安装的 CLI 配置
    Telegram，然后复用 live Telegram QA 线路，将该已安装包作为 SUT Gateway。
  - 默认使用 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@beta`；也可设置
    `OPENCLAW_NPM_TELEGRAM_PACKAGE_TGZ=/path/to/openclaw-current.tgz` 或
    `OPENCLAW_CURRENT_PACKAGE_TGZ`，以测试解析后的本地 tarball，而不是从 registry 安装。
  - 使用与 `pnpm openclaw qa telegram` 相同的 Telegram 环境凭据或 Convex 凭据来源。
    对于 CI/release 自动化，设置
    `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex` 再加上
    `OPENCLAW_QA_CONVEX_SITE_URL` 和角色密钥。如果在 CI 中同时存在
    `OPENCLAW_QA_CONVEX_SITE_URL` 和 Convex 角色密钥，Docker wrapper 会自动选择 Convex。
  - `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci|maintainer` 仅为此线路覆盖共享的
    `OPENCLAW_QA_CREDENTIAL_ROLE`。
  - GitHub Actions 将此线路暴露为手动 maintainer workflow
    `NPM Telegram Beta E2E`。它不会在合并时运行。该 workflow 使用
    `qa-live-shared` 环境和 Convex CI 凭据租约。
- GitHub Actions 还暴露了 `Package Acceptance`，用于针对单个候选包做旁路产品验证。它接受一个可信 ref、
  已发布的 npm spec、HTTPS tarball URL 加 SHA-256，或来自另一轮运行的 tarball artifact，上传
  标准化后的 `openclaw-current.tgz` 作为 `package-under-test`，然后运行现有的 Docker E2E 调度器，
  使用 smoke、package、product、full 或 custom 线路配置。将 `telegram_mode=mock-openai` 或
  `live-frontier` 设置为针对同一个 `package-under-test` artifact 运行 Telegram QA workflow。
  - 最新 beta 产品验证：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai
```

- 精确的 tarball URL 验证需要 digest：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=url \
  -f package_url=https://registry.npmjs.org/openclaw/-/openclaw-VERSION.tgz \
  -f package_sha256=<sha256> \
  -f suite_profile=package
```

- Artifact 验证会从另一次 Actions 运行中下载 tarball artifact：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=artifact \
  -f artifact_run_id=<run-id> \
  -f artifact_name=<artifact-name> \
  -f suite_profile=smoke
```

- `pnpm test:docker:bundled-channel-deps`
  - 在 Docker 中打包并安装当前 OpenClaw 构建，使用已配置 OpenAI 的 Gateway 启动，
    然后通过配置编辑启用捆绑的 channel/plugins。
  - 验证 setup discovery 会让未配置的插件运行时依赖保持缺失，首次配置的 Gateway 或 doctor 运行
    会按需安装每个捆绑插件的运行时依赖，而第二次重启不会重新安装已经激活过的依赖。
  - 还会安装一个已知的较旧 npm 基线，在运行 `openclaw update --tag <candidate>` 前先启用 Telegram，
    并验证候选版本的更新后 doctor 会修复捆绑 channel 的运行时依赖，而无需 harness 侧的 postinstall 修复。
- `pnpm test:parallels:npm-update`
  - 在 Parallels guest 间运行原生打包安装更新冒烟测试。每个所选平台会先安装请求的基线包，
    然后在同一个 guest 中运行已安装的 `openclaw update` 命令，并验证已安装版本、更新状态、
    gateway 就绪情况以及一次本地 agent 轮次。
  - 在迭代单个 guest 时使用 `--platform macos`、`--platform windows` 或 `--platform linux`。
    使用 `--json` 获取摘要 artifact 路径和每条线路状态。
  - 默认情况下，OpenAI 线路使用 `openai/gpt-5.5` 作为 live agent-turn 验证。
    当你有意验证另一个 OpenAI 模型时，传入 `--model <provider/model>` 或设置
    `OPENCLAW_PARALLELS_OPENAI_MODEL`。
  - 将较长的本地运行包裹在主机 timeout 中，这样 Parallels 传输卡住时不会消耗掉剩余测试窗口：

    ```bash
    timeout --foreground 150m pnpm test:parallels:npm-update -- --json
    timeout --foreground 90m pnpm test:parallels:npm-update -- --platform windows --json
    ```

  - 脚本会将嵌套的 lane 日志写到 `/tmp/openclaw-parallels-npm-update.*` 下。
    在认为外层 wrapper 卡住之前，请先检查 `windows-update.log`、`macos-update.log`
    或 `linux-update.log`。
  - Windows 更新在冷 guest 上后续的 doctor/运行时依赖修复中可能花费 10 到 15 分钟；
    只要嵌套的 npm debug 日志仍在前进，这仍然是正常的。
  - 不要把这个聚合 wrapper 与单独的 Parallels macOS、Windows 或 Linux 冒烟线路并行运行。
    它们共享 VM 状态，可能在 snapshot restore、包服务或 guest gateway 状态上发生冲突。
  - 更新后验证会运行正常的捆绑插件表面，因为 speech、图像生成和媒体理解等能力外观
    即使 agent 轮次本身只检查一个简单的文本响应，也是通过捆绑的运行时 API 加载的。

- `pnpm openclaw qa aimock`
  - 仅启动本地 AIMock provider server，用于直接协议冒烟测试。
- `pnpm openclaw qa matrix`
  - 在一次性的 Docker 驱动 Tuwunel homeserver 上运行 Matrix live QA 线路。
  - 这个 QA 主机目前仅用于仓库/开发环境。打包后的 OpenClaw 安装不会包含 `qa-lab`，
    因而也不会暴露 `openclaw qa`。
  - 仓库检出会直接加载捆绑的 runner；不需要单独的插件安装步骤。
  - 会创建三个临时 Matrix 用户（`driver`、`sut`、`observer`）以及一个私有房间，然后启动一个带真实 Matrix 插件的 QA gateway 子进程，作为 SUT transport。
  - 默认使用 `--profile all`。发布关键的 transport 验证可使用 `--profile fast --fail-fast`，
    或在分片完整目录时使用 `--profile transport|media|e2ee-smoke|e2ee-deep|e2ee-cli`。
  - 默认使用固定的稳定 Tuwunel 镜像 `ghcr.io/matrix-construct/tuwunel:v1.5.1`。
    当你需要测试其他镜像时，可通过 `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE` 覆盖。
  - Matrix 不提供共享凭据来源标志，因为该线路会在本地创建一次性用户。
  - 会在 `.artifacts/qa-e2e/...` 下写入 Matrix QA report、summary、observed-events artifact，
    以及合并后的 stdout/stderr 输出日志。
  - 默认会输出进度，并通过 `OPENCLAW_QA_MATRIX_TIMEOUT_MS` 强制硬性运行超时（默认 30 分钟）。
    `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS` 用于调整 negative no-reply 的静默窗口，
    cleanup 则由 `OPENCLAW_QA_MATRIX_CLEANUP_TIMEOUT_MS` 约束，失败信息中会包含恢复用的
    `docker compose ... down --remove-orphans` 命令。
- `pnpm openclaw qa telegram`
  - 使用来自环境变量的 driver 和 SUT bot token，在真实私有群组上运行 Telegram live QA 线路。
  - 需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和
    `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`。group id 必须是数值型 Telegram chat id。
  - 支持 `--credential-source convex` 来使用共享池化凭据。默认使用 env 模式，或设置
    `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` 以启用池化租约。
  - 当任一场景失败时会以非零状态退出。需要保留产物但不想让命令失败退出时可使用
    `--allow-failures`。
  - 需要同一个私有群组中的两个不同 bot，并且 SUT bot 必须公开一个 Telegram username。
  - 为了稳定的 bot-to-bot 观测，请在 `@BotFather` 中为两个 bot 都开启 Bot-to-Bot Communication Mode，
    并确保 driver bot 能观察到群组中的 bot 流量。
  - 会在 `.artifacts/qa-e2e/...` 下写入 Telegram QA report、summary 和 observed-messages artifact。
    回应类场景会包含从 driver 发送请求到观察到 SUT 回复之间的 RTT。

Live transport 线路共享一套标准契约，因此新的 transport 不会偏离：

`qa-channel` 仍然是宽泛的合成 QA 套件，不属于 live transport 覆盖矩阵的一部分。

| 线路     | Canary | Mention gating | Allowlist block | 顶层回复 | 重启恢复 | 线程后续 | 线程隔离 | reaction 观测 | 帮助命令 | 原生命令注册 |
| -------- | ------ | -------------- | --------------- | -------- | -------- | -------- | -------- | ------------- | -------- | ------------ |
| Matrix   | x      | x              | x               | x        | x        | x        | x        | x             |          |              |
| Telegram | x      | x              |                 |          |          |          |          |               | x        |              |
| Discord  | x      | x              |                 |          |          |          |          |               |          | x            |

### 通过 Convex 共享 Telegram 凭据（v1）

当为 `openclaw qa telegram` 启用 `--credential-source convex`（或 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）时，
QA lab 会从基于 Convex 的池中获取独占租约，在该线路运行期间维持该租约的 heartbeat，并在关闭时释放该租约。

参考的 Convex 项目脚手架：

- `qa/convex-credential-broker/`

必需的环境变量：

- `OPENCLAW_QA_CONVEX_SITE_URL`（例如 `https://your-deployment.convex.site`）
- 所选角色对应的一个 secret：
  - `maintainer` 使用 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`
  - `ci` 使用 `OPENCLAW_QA_CONVEX_SECRET_CI`
- 凭据角色选择：
  - CLI：`--credential-role maintainer|ci`
  - 默认环境变量：`OPENCLAW_QA_CREDENTIAL_ROLE`（CI 中默认为 `ci`，否则默认为 `maintainer`）

可选环境变量：

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS`（默认 `1200000`）
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS`（默认 `30000`）
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS`（默认 `90000`）
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS`（默认 `15000`）
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX`（默认 `/qa-credentials/v1`）
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID`（可选 trace id）
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` 允许仅限本地开发使用 loopback `http://` Convex URL。

`OPENCLAW_QA_CONVEX_SITE_URL` 在正常运行时应使用 `https://`。

维护者管理命令（池的添加/移除/列表）需要专门使用
`OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`。

维护者的 CLI 辅助命令：

```bash
pnpm openclaw qa credentials doctor
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

在 live 运行之前先使用 `doctor` 检查 Convex site URL、broker secret、
endpoint prefix、HTTP timeout 以及 admin/list 可达性，同时不会打印 secret 值。
在脚本和 CI 工具中可使用 `--json` 获取机器可读输出。

默认 endpoint 契约（`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`）：

- `POST /acquire`
  - 请求：`{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - 成功：`{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - 资源耗尽/可重试：`{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
- `POST /heartbeat`
  - 请求：`{ kind, ownerId, actorRole, credentialId, leaseToken, leaseTtlMs }`
  - 成功：`{ status: "ok" }`（或空的 `2xx`）
- `POST /release`
  - 请求：`{ kind, ownerId, actorRole, credentialId, leaseToken }`
  - 成功：`{ status: "ok" }`（或空的 `2xx`）
- `POST /admin/add`（仅 maintainer secret）
  - 请求：`{ kind, actorId, payload, note?, status? }`
  - 成功：`{ status: "ok", credential }`
- `POST /admin/remove`（仅 maintainer secret）
  - 请求：`{ credentialId, actorId }`
  - 成功：`{ status: "ok", changed, credential }`
  - 活跃租约保护：`{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list`（仅 maintainer secret）
  - 请求：`{ kind?, status?, includePayload?, limit? }`
  - 成功：`{ status: "ok", credentials, count }`

Telegram 类型的 payload 形状：

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` 必须是数值型 Telegram chat id 字符串。
- `admin/add` 会针对 `kind: "telegram"` 校验此形状，并拒绝格式错误的 payload。

### 向 QA 添加一个频道

向 markdown QA 系统添加一个频道，正好需要两样东西：

1. 该频道的 transport adapter。
2. 一组用于验证该频道契约的 scenario pack。

当共享的 `qa-lab` 主机能够接管流程时，不要添加新的顶层 QA 命令根。

`qa-lab` 负责共享主机机制：

- `openclaw qa` 命令根
- 套件启动与关闭
- worker 并发
- 产物写入
- report 生成
- 场景执行
- 旧 `qa-channel` 场景的兼容别名

Runner 插件负责 transport 契约：

- `openclaw qa <runner>` 如何挂载到共享 `qa` 根命令之下
- 如何为该 transport 配置 gateway
- 如何检查就绪状态
- 如何注入入站事件
- 如何观测出站消息
- 如何暴露转录与规范化 transport 状态
- 如何执行基于 transport 的动作
- 如何处理 transport 特定的重置或清理

新频道的最低接纳标准是：

1. 保持 `qa-lab` 作为共享 `qa` 根命令的所有者。
2. 在共享的 `qa-lab` 主机接点上实现 transport runner。
3. 将 transport 特定机制保留在 runner 插件或 channel harness 内。
4. 通过 `openclaw qa <runner>` 挂载 runner，而不是注册一个竞争性的根命令。
   Runner 插件应在 `openclaw.plugin.json` 中声明 `qaRunners`，并在 `runtime-api.ts` 中导出匹配的
   `qaRunnerCliRegistrations` 数组。
   保持 `runtime-api.ts` 轻量；懒加载 CLI 和 runner 执行应留在单独入口之后。
5. 在主题化的 `qa/scenarios/` 目录下编写或改编 markdown 场景。
6. 新场景使用通用 scenario helper。
7. 除非仓库正在进行有意的迁移，否则保持现有兼容别名可用。

决策规则是严格的：

- 如果某个行为可以只在 `qa-lab` 中表达一次，就放进 `qa-lab`。
- 如果某个行为依赖于单一频道 transport，就把它保留在该 runner 插件或插件 harness 中。
- 如果某个场景需要一个多个频道都能使用的新能力，就添加一个通用 helper，而不是在 `suite.ts` 中写频道特定分支。
- 如果某个行为只对一种 transport 有意义，就保持该场景为 transport 特定，并在场景契约中明确说明。

新场景首选的通用 helper 名称是：

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

现有场景仍可使用兼容别名，包括：

- `waitForQaChannelReady`
- `waitForOutboundMessage`
- `waitForNoOutbound`
- `formatConversationTranscript`
- `resetBus`

新的 channel 工作应使用通用 helper 名称。
兼容别名的存在是为了避免“一次性迁移日”，而不是作为新场景编写的模型。

## 测试套件（在哪运行）

可以把这些套件理解为“真实度逐步提高”（同时也意味着不稳定性/成本逐步增加）：

### 单元 / 集成（默认）

- 命令：`pnpm test`
- 配置：未定向运行会使用 `vitest.full-*.config.ts` 分片集合，并且可能将多项目分片展开为按项目配置，以便并行调度
- 文件：位于 `src/**/*.test.ts`、`packages/**/*.test.ts`、`test/**/*.test.ts` 下的核心/单元清单，以及由 `vitest.unit.config.ts` 覆盖的白名单 `ui` 节点测试
- 范围：
  - 纯单元测试
  - 进程内集成测试（网关认证、路由、工具、解析、配置）
  - 针对已知 bug 的确定性回归测试
- 预期：
  - 在 CI 中运行
  - 不需要真实密钥
  - 应该快速且稳定

<AccordionGroup>
  <Accordion title="项目、分片与作用域车道">

    - 未定向的 `pnpm test` 会运行十二个更小的分片配置（`core-unit-fast`、`core-unit-src`、`core-unit-security`、`core-unit-ui`、`core-unit-support`、`core-support-boundary`、`core-contracts`、`core-bundled`、`core-runtime`、`agentic`、`auto-reply`、`extensions`），而不是一个巨大的原生 root-project 进程。这降低了高负载机器上的峰值 RSS，并避免 `auto-reply`/扩展工作饿死无关套件。
    - `pnpm test --watch` 仍然使用原生的 root `vitest.config.ts` 项目图，因为多分片 watch 循环并不现实。
    - `pnpm test`、`pnpm test:watch` 和 `pnpm test:perf:imports` 会先通过作用域车道路由显式文件/目录目标，因此 `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` 可以避免支付完整 root 项目启动税。
    - `pnpm test:changed` 默认会把变更的 git 路径展开为更便宜的作用域车道：直接修改的测试、同级 `*.test.ts` 文件、显式源码映射，以及本地导入图依赖项。配置/设置/包的修改不会自动扩大运行范围，除非你显式使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。
    - `pnpm check:changed` 是窄范围工作的常规智能本地检查门禁。它会把差异分类为 core、core tests、extensions、extension tests、apps、docs、release metadata、live Docker tooling 和 tooling，然后运行相应的 typecheck、lint 和 guard 命令。它不会运行 Vitest 测试；如需测试证明，请调用 `pnpm test:changed` 或显式 `pnpm test <target>`。仅有 release metadata 的版本递增会运行定向的 version/config/root-dependency 检查，并带有一个 guard，用于拒绝顶层 version 字段之外的 package 变更。
    - live Docker ACP harness 的编辑会运行聚焦检查：对 live Docker auth 脚本进行 shell 语法检查，以及 live Docker scheduler dry-run。只有当 diff 仅限于 `scripts["test:docker:live-*"]` 时才包含 `package.json` 变更；依赖、导出、版本以及其他 package 表面层面的编辑仍然使用更宽泛的 guard。
    - 来自 agents、commands、plugins、auto-reply helpers、`plugin-sdk` 以及类似纯工具区域的轻量导入单元测试，会通过 `unit-fast` 车道路由，该车道会跳过 `test/setup-openclaw-runtime.ts`；有状态/运行时较重的文件则保留在现有车道上。
    - 选定的 `plugin-sdk` 和 `commands` helper 源文件在 changed-mode 运行时也会映射到这些轻量车道中的显式同级测试，因此 helper 编辑不会为该目录重新运行完整的重型套件。
    - `auto-reply` 为顶层 core helpers、顶层 `reply.*` 集成测试以及 `src/auto-reply/reply/**` 子树设有专用桶。CI 还会把 reply 子树进一步拆分为 agent-runner、dispatch 和 commands/state-routing 分片，这样单个导入密集桶就不会独占整个 Node 尾部。

  </Accordion>

  <Accordion title="嵌入式 runner 覆盖">

    - 当你更改 message-tool discovery 输入或 compaction 运行时上下文时，请保留两级覆盖。
    - 为纯路由和规范化边界添加聚焦的 helper 回归测试。
    - 保持嵌入式 runner 集成套件健康：
      `src/agents/pi-embedded-runner/compact.hooks.test.ts`、
      `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts`，以及
      `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
    - 这些套件验证 scoped ids 和 compaction 行为仍然会沿着真实的 `run.ts` / `compact.ts` 路径流动；仅有 helper 的测试不足以替代这些集成路径。

  </Accordion>

  <Accordion title="Vitest 池与隔离默认值">

    - 基础 Vitest 配置默认使用 `threads`。
    - 共享 Vitest 配置固定为 `isolate: false`，并在 root projects、e2e 和 live 配置中使用非隔离 runner。
    - root UI 车道保留其 `jsdom` 设置和优化器，但同样运行在共享的非隔离 runner 上。
    - 每个 `pnpm test` 分片都会从共享 Vitest 配置继承相同的 `threads` + `isolate: false` 默认值。
    - `scripts/run-vitest.mjs` 默认会为 Vitest 子 Node 进程添加 `--no-maglev`，以减少大规模本地运行中的 V8 编译抖动。设置 `OPENCLAW_VITEST_ENABLE_MAGLEV=1` 可与原生 V8 行为进行对比。

  </Accordion>

  <Accordion title="快速本地迭代">

    - `pnpm changed:lanes` 会显示一个 diff 会触发哪些架构车道。
    - 预提交钩子只做格式化。它会重新暂存已格式化文件，但不会运行 lint、typecheck 或测试。
    - 在交接或推送之前，如需智能本地检查门禁，请显式运行 `pnpm check:changed`。
    - `pnpm test:changed` 默认通过更便宜的作用域车道路由。只有当代理判断 harness、config、package 或 contract 的编辑确实需要更宽泛的 Vitest 覆盖时，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。
    - `pnpm test:max` 和 `pnpm test:changed:max` 保持相同的路由行为，只是 worker 上限更高。
    - 本地 worker 自动扩缩容是刻意保守的：当主机负载平均值已经很高时会退缩，因此默认情况下多个并发 Vitest 运行造成的影响更小。
    - 基础 Vitest 配置会把 projects/config 文件标记为 `forceRerunTriggers`，这样当测试接线变化时，changed-mode 重新运行仍然是正确的。
    - 配置会在受支持的主机上保持启用 `OPENCLAW_VITEST_FS_MODULE_CACHE`；如果你想为直接剖析指定一个明确的缓存位置，可设置 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`。

  </Accordion>

  <Accordion title="性能调试">

    - `pnpm test:perf:imports` 会启用 Vitest 导入耗时报告以及导入分解输出。
    - `pnpm test:perf:imports:changed` 会把同样的剖析视图限制到自 `origin/main` 以来发生变化的文件。
    - 分片计时数据会写入 `.artifacts/vitest-shard-timings.json`。整配置运行会使用配置路径作为键；包含模式的 CI 分片会追加分片名称，以便分别跟踪过滤后的分片。
    - 当某个热点测试仍将大部分时间花在启动导入上时，请把重型依赖放在一个狭窄的本地 `*.runtime.ts` 接口后面，并直接 mock 该接口，而不是为了通过 `vi.mock(...)` 传递它们而深度导入运行时 helper。
    - `pnpm test:perf:changed:bench -- --ref <git-ref>` 会将路由后的 `test:changed` 与该已提交 diff 的原生 root-project 路径进行比较，并打印墙钟时间以及 macOS 最大 RSS。
    - `pnpm test:perf:changed:bench -- --worktree` 会通过 `scripts/test-projects.mjs` 和 root Vitest 配置，对当前脏工作区进行基准测试，将变更文件列表路由过去。
    - `pnpm test:perf:profile:main` 会为 Vitest/Vite 的启动和 transform 开销写出主线程 CPU profile。
    - `pnpm test:perf:profile:runner` 会为禁用文件并行的单元套件写出 runner CPU + heap profile。

  </Accordion>
</AccordionGroup>

### 稳定性（网关）

- 命令：`pnpm test:stability:gateway`
- 配置：`vitest.gateway.config.ts`，强制单 worker
- 范围：
  - 启动一个真实的 loopback Gateway，默认启用诊断
  - 通过诊断事件路径驱动合成的 gateway 消息、内存和大负载抖动
  - 通过 Gateway WS RPC 查询 `diagnostics.stability`
  - 覆盖诊断稳定性 bundle 持久化 helper
  - 断言 recorder 保持有界、合成 RSS 采样保持低于压力预算，并且每会话队列深度回落到 0
- 预期：
  - 对 CI 安全，且不需要密钥
  - 作为稳定性回归跟进的窄车道，而不是完整 Gateway 套件的替代品

### E2E（网关冒烟）

- 命令：`pnpm test:e2e`
- 配置：`vitest.e2e.config.ts`
- 文件：`src/**/*.e2e.test.ts`、`test/**/*.e2e.test.ts`，以及 `extensions/` 下捆绑插件的 E2E 测试
- 运行时默认值：
  - 使用 Vitest `threads` 且 `isolate: false`，与仓库其余部分保持一致。
  - 使用自适应 worker（CI：最多 2 个，本地：默认 1 个）。
  - 默认以静默模式运行，以减少控制台 I/O 开销。
- 有用的覆盖项：
  - `OPENCLAW_E2E_WORKERS=<n>` 可强制 worker 数量（上限 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 可重新启用详细控制台输出。
- 范围：
  - 多实例 gateway 端到端行为
  - WebSocket/HTTP 接口、节点配对，以及更重的网络功能
- 预期：
  - 在 CI 中运行（当流水线启用时）
  - 不需要真实密钥
  - 比单元测试涉及更多活动部件（可能更慢）

### E2E：OpenShell 后端冒烟

- 命令：`pnpm test:e2e:openshell`
- 文件：`extensions/openshell/src/backend.e2e.test.ts`
- 范围：
  - 通过 Docker 在主机上启动隔离的 OpenShell gateway
  - 从临时的本地 Dockerfile 创建一个 sandbox
  - 通过真实的 `sandbox ssh-config` + SSH exec 练习 OpenClaw 的 OpenShell 后端
  - 通过 sandbox fs bridge 验证远端规范化的文件系统行为
- 预期：
  - 仅在显式启用时运行；不属于默认的 `pnpm test:e2e` 运行
  - 需要本地 `openshell` CLI 以及可工作的 Docker daemon
  - 使用隔离的 `HOME` / `XDG_CONFIG_HOME`，然后销毁测试 gateway 和 sandbox
- 有用的覆盖项：
  - `OPENCLAW_E2E_OPENSHELL=1` 可在手动运行更宽泛的 e2e 套件时启用该测试
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 可指向非默认的 CLI 二进制或包装脚本

### Live（真实提供方 + 真实模型）

- 命令：`pnpm test:live`
- 配置：`vitest.live.config.ts`
- 文件：`src/**/*.live.test.ts`、`test/**/*.live.test.ts`，以及 `extensions/` 下捆绑插件的 live 测试
- 默认：由 `pnpm test:live` **启用**（会设置 `OPENCLAW_LIVE_TEST=1`）
- 范围：
  - “这个提供方/模型**今天**用真实凭据真的能工作吗？”
  - 捕捉提供方格式变化、工具调用怪癖、认证问题和速率限制行为
- 预期：
  - 设计上不适合 CI 稳定运行（真实网络、真实提供方策略、配额、故障）
  - 会产生费用 / 使用速率限制额度
  - 优先运行缩小后的子集，而不是“一切”
- Live 运行会 source `~/.profile` 以获取缺失的 API 密钥。
- 默认情况下，live 运行仍会隔离 `HOME`，并将配置/认证材料复制到临时测试 home 中，因此单元 fixtures 不会修改你的真实 `~/.openclaw`。
- 仅在你有意让 live 测试使用真实 home 目录时，才设置 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 现在默认更安静：它会保留 `[live] ...` 进度输出，但会抑制额外的 `~/.profile` 提示，并静音 gateway bootstrap 日志/Bonjour 交互。若要恢复完整启动日志，请设置 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 密钥轮换（按提供方区分）：使用逗号/分号格式的 `*_API_KEYS`，或 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`），或者通过 `OPENCLAW_LIVE_*_KEY` 进行每个 live 测试的覆盖；测试会在遇到速率限制响应时重试。
- 进度/心跳输出：
  - Live 套件现在会向 stderr 输出进度行，因此即使 Vitest 控制台捕获是静默的，较长的提供方调用也能明显看出正在活动。
  - `vitest.live.config.ts` 会禁用 Vitest 的控制台拦截，以便在 live 运行期间提供方/gateway 进度行可以立即流式输出。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 调整直接模型心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 调整 gateway/probe 心跳。

## 我应该运行哪个测试套件？

使用这张决策表：

- 编辑逻辑/测试：运行 `pnpm test`（如果你改动很多，再运行 `pnpm test:coverage`）
- 触及 gateway 网络 / WS 协议 / 配对：加上 `pnpm test:e2e`
- 调试“我的 bot 挂了” / provider 特定失败 / tool calling：运行缩小范围后的 `pnpm test:live`

## Live（触及网络）测试

关于 live model 矩阵、CLI 后端 smoke、ACP smoke、Codex app-server
harness，以及所有媒体 provider 的 live 测试（Deepgram、BytePlus、ComfyUI、image、
music、video、media harness）——再加上 live 运行的凭据处理——请参见
[Testing — live suites](/help/testing-live)。

## Docker runner（可选的“在 Linux 上能工作”检查）

这些 Docker runner 分成两类：

- Live-model runner：`test:docker:live-models` 和 `test:docker:live-gateway` 只会在仓库 Docker 镜像中运行各自匹配的 profile-key live 文件（`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`），并挂载你的本地配置目录和工作区（如果挂载了 `~/.profile`，也会一并 source）。对应的本地入口点是 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker live runner 默认使用较小的 smoke 限额，以便完整的 Docker 全量扫描保持可行：
  `test:docker:live-models` 默认使用 `OPENCLAW_LIVE_MAX_MODELS=12`，而
  `test:docker:live-gateway` 默认使用 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`，
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`，
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000`，以及
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。当你明确想要更大、更穷尽的扫描时，再覆盖这些 env 变量。
- `test:docker:all` 会先通过 `test:docker:live-build` 构建一次 live Docker 镜像，再通过 `scripts/package-openclaw-for-docker.mjs` 将 OpenClaw 打包一次为 npm tarball，然后构建/复用两个 `scripts/e2e/Dockerfile` 镜像。基础镜像只作为 Node/Git runner，用于 install/update/plugin-dependency 这些 lane；这些 lane 会挂载预构建 tarball。功能镜像会把同一个 tarball 安装到 `/app` 中，用于 built-app 功能 lane。Docker lane 定义位于 `scripts/lib/docker-e2e-scenarios.mjs`；planner 逻辑位于 `scripts/lib/docker-e2e-plan.mjs`；`scripts/test-docker-all.mjs` 执行所选计划。这个聚合器使用加权本地调度器：`OPENCLAW_DOCKER_ALL_PARALLELISM` 控制进程槽位，而资源上限可防止重型 live、npm-install 和多服务 lane 同时全部启动。如果某个单独 lane 比当前上限更重，调度器仍然可以在池为空时启动它，然后一直让它单独运行，直到再次有容量。默认值是 10 个槽位、`OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10`，以及 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；只有当 Docker 主机有更多余量时，才调整 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。该 runner 默认会执行 Docker 预检，清理陈旧的 OpenClaw E2E 容器，每 30 秒打印一次状态，将成功的 lane 耗时存储在 `.artifacts/docker-tests/lane-timings.json`，并使用这些耗时在后续运行中优先启动更长的 lane。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 可以在不构建或运行 Docker 的情况下打印加权 lane 清单，或者使用 `node scripts/test-docker-all.mjs --plan-json` 打印所选 lane 的 CI 计划、package/image 需求以及凭据。
- `Package Acceptance` 是 GitHub 原生的包门禁，用于判断“这个可安装 tarball 作为一个产品是否可用？”它会从 `source=npm`、`source=ref`、`source=url` 或 `source=artifact` 中解析出一个候选包，作为 `package-under-test` 上传，然后针对这个精确 tarball 运行可复用的 Docker E2E lane，而不是重新打包所选 ref。`workflow_ref` 选择受信任的 workflow/harness 脚本，而 `package_ref` 在 `source=ref` 时选择要打包的源码 commit/branch/tag；这使得当前 acceptance 逻辑可以验证更老的受信任 commit。profile 的覆盖范围按广度排序：`smoke` 是快速的 install/channel/agent 加 gateway/config，`package` 是 package/update/plugin 合约，也是大多数 Parallels package/update 覆盖的默认原生替代项，`product` 额外加入 MCP channels、cron/subagent 清理、OpenAI web search 和 OpenWebUI，而 `full` 运行带有 OpenWebUI 的 release-path Docker 块。发布验证会对目标 ref 运行 `package` profile，并启用 Telegram package QA。由 artifacts 生成的针对 GitHub Docker 的重跑命令在可用时会包含先前的 package artifact 和已准备好的 image 输入，因此失败的 lane 可以避免重新构建 package 和 images。
- Package Acceptance 的旧版兼容性上限为 `2026.4.25`（包含 `2026.4.25-beta.*`）。在该截止点之前，harness 只容忍已发布包的元数据缺口：省略的 private QA inventory 条目、缺失的 `gateway install --wrapper`、tarball 派生 git fixture 中缺失的 patch 文件、缺失的持久化 `update.channel`、旧版 plugin install-record 位置、缺失的 marketplace install-record 持久化，以及 `plugins update` 期间的配置元数据迁移。对于 `2026.4.25` 之后的包，这些路径都将被严格视为失败。
- 容器 smoke runner：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:npm-onboard-channel-agent`、`test:docker:update-channel-switch`、`test:docker:session-runtime-context`、`test:docker:agents-delete-shared-workspace`、`test:docker:gateway-network`、`test:docker:browser-cdp-snapshot`、`test:docker:mcp-channels`、`test:docker:pi-bundle-mcp-tools`、`test:docker:cron-mcp-cleanup`、`test:docker:plugins`、`test:docker:plugin-update` 以及 `test:docker:config-reload` 会启动一个或多个真实容器，并验证更高层级的集成路径。

live-model Docker runner 还会只挂载所需的 CLI auth home（如果运行没有缩小范围，则挂载所有支持的），然后在运行前将它们复制到容器 home 中，这样外部 CLI OAuth 就可以刷新 token，而不会修改宿主机的 auth 存储：

- 直接模型：`pnpm test:docker:live-models`（脚本：`scripts/test-live-models-docker.sh`）
- ACP bind smoke：`pnpm test:docker:live-acp-bind`（脚本：`scripts/test-live-acp-bind-docker.sh`；默认覆盖 Claude、Codex 和 Gemini，通过 `pnpm test:docker:live-acp-bind:droid` 和 `pnpm test:docker:live-acp-bind:opencode` 可进行严格的 Droid/OpenCode 覆盖）
- CLI 后端 smoke：`pnpm test:docker:live-cli-backend`（脚本：`scripts/test-live-cli-backend-docker.sh`）
- Codex app-server harness smoke：`pnpm test:docker:live-codex-harness`（脚本：`scripts/test-live-codex-harness-docker.sh`）
- Gateway + 开发 agent：`pnpm test:docker:live-gateway`（脚本：`scripts/test-live-gateway-models-docker.sh`）
- 可观测性 smoke：`pnpm qa:otel:smoke` 是一个私有 QA 源码检出 lane。它有意不包含在 package Docker 发布 lane 中，因为 npm tarball 不包含 QA Lab。
- Open WebUI live smoke：`pnpm test:docker:openwebui`（脚本：`scripts/e2e/openwebui-docker.sh`）
- 上手向导（TTY，完整脚手架）：`pnpm test:docker:onboard`（脚本：`scripts/e2e/onboard-docker.sh`）
- Npm tarball onboarding/channel/agent smoke：`pnpm test:docker:npm-onboard-channel-agent` 会在 Docker 中全局安装打包后的 OpenClaw tarball，通过 env-ref onboarding 配置 OpenAI，默认还会配置 Telegram，验证 doctor 能修复已激活的插件运行时依赖，并运行一次 mock 的 OpenAI agent turn。可通过 `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 复用预构建 tarball，通过 `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0` 跳过宿主机重建，或者通过 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 切换 channel。
- 更新 channel 切换 smoke：`pnpm test:docker:update-channel-switch` 会在 Docker 中全局安装打包后的 OpenClaw tarball，将 package `stable` 切换到 git `dev`，验证持久化 channel 和插件在更新后仍可工作，然后切回 package `stable` 并检查更新状态。
- Session runtime context smoke：`pnpm test:docker:session-runtime-context` 验证隐藏 runtime context transcript 的持久化，以及对受影响的重复 prompt-rewrite 分支的 doctor 修复。
- Bun 全局安装 smoke：`bash scripts/e2e/bun-global-install-smoke.sh` 会打包当前源码树，在隔离的 home 中使用 `bun install -g` 安装它，并验证 `openclaw infer image providers --json` 返回的是捆绑的 image providers，而不是卡住。可通过 `OPENCLAW_BUN_GLOBAL_SMOKE_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 复用预构建 tarball，通过 `OPENCLAW_BUN_GLOBAL_SMOKE_HOST_BUILD=0` 跳过宿主机构建，或者通过 `OPENCLAW_BUN_GLOBAL_SMOKE_DIST_IMAGE=openclaw-dockerfile-smoke:local` 从已构建的 Docker 镜像复制 `dist/`。
- Installer Docker smoke：`bash scripts/test-install-sh-docker.sh` 在其 root、update 和 direct-npm 容器之间共享一个 npm cache。update smoke 默认以 npm `latest` 作为稳定基线，然后升级到候选 tarball。可在本地使用 `OPENCLAW_INSTALL_SMOKE_UPDATE_BASELINE=2026.4.22` 覆盖，或者在 GitHub 的 Install Smoke workflow 中使用 `update_baseline_version` 输入覆盖。非 root 的 installer 检查会保留一个隔离的 npm cache，因此 root 拥有的 cache 条目不会掩盖用户本地的安装行为。设置 `OPENCLAW_INSTALL_SMOKE_NPM_CACHE_DIR=/path/to/cache` 可在本地重跑时复用 root/update/direct-npm 的 cache。
- Install Smoke CI 通过 `OPENCLAW_INSTALL_SMOKE_SKIP_NPM_GLOBAL=1` 跳过重复的 direct-npm 全局更新；如果需要 direct `npm install -g` 覆盖，请在本地运行脚本时不要设置该 env。
- Agents delete shared workspace CLI smoke：`pnpm test:docker:agents-delete-shared-workspace`（脚本：`scripts/e2e/agents-delete-shared-workspace-docker.sh`）默认构建 root Dockerfile 镜像，在隔离的容器 home 中用一个 workspace 初始化两个 agents，运行 `agents delete --json`，并验证有效 JSON 以及 workspace 保留行为。可使用 `OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_IMAGE=openclaw-dockerfile-smoke:local OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_SKIP_BUILD=1` 复用 install-smoke 镜像。
- Gateway networking（两个容器，WS auth + health）：`pnpm test:docker:gateway-network`（脚本：`scripts/e2e/gateway-network-docker.sh`）
- Browser CDP snapshot smoke：`pnpm test:docker:browser-cdp-snapshot`（脚本：`scripts/e2e/browser-cdp-snapshot-docker.sh`）会构建源码 E2E 镜像以及 Chromium 层，使用原始 CDP 启动 Chromium，运行 `browser doctor --deep`，并验证 CDP role snapshot 覆盖 link URLs、cursor-promoted clickables、iframe refs 以及 frame metadata。
- OpenAI Responses web_search 最小推理回归：`pnpm test:docker:openai-web-search-minimal`（脚本：`scripts/e2e/openai-web-search-minimal-docker.sh`）会通过 Gateway 运行一个 mock 的 OpenAI server，验证 `web_search` 会将 `reasoning.effort` 从 `minimal` 提升到 `low`，然后强制 provider schema 拒绝并检查原始详情是否出现在 Gateway 日志中。
- MCP channel bridge（种子化 Gateway + stdio bridge + 原始 Claude notification-frame smoke）：`pnpm test:docker:mcp-channels`（脚本：`scripts/e2e/mcp-channels-docker.sh`）
- Pi bundle MCP tools（真实 stdio MCP server + 内嵌 Pi profile allow/deny smoke）：`pnpm test:docker:pi-bundle-mcp-tools`（脚本：`scripts/e2e/pi-bundle-mcp-tools-docker.sh`）
- Cron/subagent MCP cleanup（真实 Gateway + 在隔离 cron 和一次性 subagent 运行后进行 stdio MCP child teardown）：`pnpm test:docker:cron-mcp-cleanup`（脚本：`scripts/e2e/cron-mcp-cleanup-docker.sh`）
- Plugins（install smoke、ClawHub install/uninstall、marketplace updates，以及 Claude-bundle enable/inspect）：`pnpm test:docker:plugins`（脚本：`scripts/e2e/plugins-docker.sh`）
  设置 `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` 可跳过 live ClawHub 区块，或者通过 `OPENCLAW_PLUGINS_E2E_CLAWHUB_SPEC` 和 `OPENCLAW_PLUGINS_E2E_CLAWHUB_ID` 覆盖默认 package。
- Plugin update unchanged smoke：`pnpm test:docker:plugin-update`（脚本：`scripts/e2e/plugin-update-unchanged-docker.sh`）
- Config reload metadata smoke：`pnpm test:docker:config-reload`（脚本：`scripts/e2e/config-reload-source-docker.sh`）
- Bundled plugin runtime deps：`pnpm test:docker:bundled-channel-deps` 默认会构建一个小型 Docker runner 镜像，在宿主机上构建并打包一次 OpenClaw，然后将该 tarball 挂载到每个 Linux 安装场景中。可通过 `OPENCLAW_SKIP_DOCKER_BUILD=1` 复用该镜像，通过 `OPENCLAW_BUNDLED_CHANNEL_HOST_BUILD=0` 在本地新鲜构建后跳过宿主机重建，或者通过 `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 指向现有 tarball。完整的 Docker 聚合器和 release-path `plugins-integrations` 块会先打包一次这个 tarball，然后将 bundled channel 检查分片为独立 lane，包括 Telegram、Discord、Slack、Feishu、memory-lancedb 和 ACPX 的独立更新 lane。直接运行 bundled lane 时，可使用 `OPENCLAW_BUNDLED_CHANNELS=telegram,slack` 缩小 channel 矩阵，或者使用 `OPENCLAW_BUNDLED_CHANNEL_UPDATE_TARGETS=telegram,acpx` 缩小更新场景。该 lane 还会验证 `channels.<id>.enabled=false` 和 `plugins.entries.<id>.enabled=false` 会抑制 doctor/runtime-dependency 修复。
- 在迭代时，通过禁用无关场景来缩小 bundled plugin runtime deps，例如：
  `OPENCLAW_BUNDLED_CHANNEL_SCENARIOS=0 OPENCLAW_BUNDLED_CHANNEL_UPDATE_SCENARIO=0 OPENCLAW_BUNDLED_CHANNEL_ROOT_OWNED_SCENARIO=0 OPENCLAW_BUNDLED_CHANNEL_SETUP_ENTRY_SCENARIO=0 pnpm test:docker:bundled-channel-deps`。

要手动预构建并复用共享功能镜像：

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

当设置了 `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE` 之类的特定 suite 镜像覆盖时，它仍然会优先生效。当 `OPENCLAW_SKIP_DOCKER_BUILD=1` 指向远程共享镜像时，如果该镜像本地尚不存在，脚本会拉取它。QR 和 installer 的 Docker 测试保留了自己的 Dockerfile，因为它们验证的是 package/install 行为，而不是共享的 built-app 运行时。

live-model Docker runner 还会将当前检出内容以只读方式挂载，并
将其分阶段复制到容器内的临时 workdir 中。这样可以让运行时
镜像保持精简，同时仍然使用你的精确本地源码/config 来运行 Vitest。
分阶段步骤会跳过大型本地专用缓存和应用构建输出，例如
`.pnpm-store`、`.worktrees`、`__openclaw_vitest__`，以及 app-local `.build` 或
Gradle 输出目录，这样 Docker live run 就不会花费数分钟复制
机器特定的制品。
它们还会设置 `OPENCLAW_SKIP_CHANNELS=1`，以便 gateway live probe 不会在
容器内部启动真实的 Telegram/Discord/etc. channel workers。
`test:docker:live-models` 仍然会运行 `pnpm test:live`，因此当你需要缩小或排除
该 Docker lane 中的 gateway live 覆盖时，也要传递
`OPENCLAW_LIVE_GATEWAY_*`。
`test:docker:openwebui` 是一个更高层级的兼容性 smoke：它会启动一个
启用了 OpenAI 兼容 HTTP 端点的 OpenClaw gateway 容器，启动一个固定版本的 Open WebUI 容器连接到该 gateway，通过 Open WebUI 登录，验证 `/api/models` 暴露 `openclaw/default`，然后通过 Open WebUI 的 `/api/chat/completions` 代理发送一次真实聊天请求。
第一次运行可能会明显更慢，因为 Docker 可能需要拉取
Open WebUI 镜像，而且 Open WebUI 可能还需要完成其自身的冷启动设置。
这个 lane 需要一个可用的 live model key，而 `OPENCLAW_PROFILE_FILE`
（默认是 `~/.profile`）是 Docker 化运行中提供它的主要方式。
成功运行会打印一个小的 JSON payload，例如 `{ "ok": true, "model":
"openclaw/default", ... }`。
`test:docker:mcp-channels` 是有意确定性的，不需要真实的
Telegram、Discord 或 iMessage 账户。它会启动一个种子化的 Gateway
容器，再启动第二个容器来运行 `openclaw mcp serve`，然后
验证路由后的对话发现、transcript 读取、附件元数据、
live event queue 行为、出站发送路由，以及通过真实 stdio MCP bridge 的 Claude 风格 channel +
permission 通知。notification 检查会直接检查原始 stdio MCP frame，
因此这个 smoke 验证的是 bridge 实际发出的内容，而不仅仅是某个特定 client SDK 恰好暴露了什么。
`test:docker:pi-bundle-mcp-tools` 是确定性的，不需要 live
model key。它会构建仓库 Docker 镜像，在容器内启动一个真实的 stdio MCP probe server，
通过内嵌的 Pi bundle MCP runtime 将该 server 实例化，执行 tool，然后验证 `coding` 和 `messaging` 会保留
`bundle-mcp` tools，而 `minimal` 和 `tools.deny: ["bundle-mcp"]` 会将它们过滤掉。
`test:docker:cron-mcp-cleanup` 是确定性的，不需要 live model
key。它会启动一个种子化 Gateway 和一个真实的 stdio MCP probe server，运行一次隔离的 cron turn 和一次 `/subagents spawn` one-shot child turn，然后验证每次运行后 MCP child process 都会退出。

手动 ACP 纯语言 thread smoke（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 请将这个脚本保留用于回归/调试工作流。它以后可能还会再次用于 ACP thread routing 验证，因此不要删除它。

有用的环境变量：

- `OPENCLAW_CONFIG_DIR=...`（默认：`~/.openclaw`）挂载到 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（默认：`~/.openclaw/workspace`）挂载到 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（默认：`~/.profile`）挂载到 `/home/node/.profile`，并在运行测试前 source
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` 用于仅验证从 `OPENCLAW_PROFILE_FILE` source 的环境变量，使用临时 config/workspace 目录且不挂载任何外部 CLI auth
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...`（默认：`~/.cache/openclaw/docker-cli-tools`）挂载到 `/home/node/.npm-global`，用于 Docker 内缓存 CLI 安装
- `$HOME` 下的外部 CLI auth 目录/文件会以只读方式挂载到 `/host-auth...`，然后在测试开始前复制到 `/home/node/...`
  - 默认目录：`.minimax`
  - 默认文件：`~/.codex/auth.json`、`~/.codex/config.toml`、`.claude.json`、`~/.claude/.credentials.json`、`~/.claude/settings.json`、`~/.claude/settings.local.json`
  - 缩小范围的 provider 运行只会挂载从 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推断出的所需目录/文件
  - 可通过 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none`，或像 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex` 这样的逗号列表手动覆盖
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 用于缩小运行范围
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 用于在容器内过滤 provider
- `OPENCLAW_SKIP_DOCKER_BUILD=1` 用于复用已存在的 `openclaw:local-live` 镜像，以便重跑时无需重建
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 用于确保凭据来自 profile store（而不是 env）
- `OPENCLAW_OPENWEBUI_MODEL=...` 用于选择 gateway 为 Open WebUI smoke 暴露的 model
- `OPENCLAW_OPENWEBUI_PROMPT=...` 用于覆盖 Open WebUI smoke 使用的 nonce-check prompt
- `OPENWEBUI_IMAGE=...` 用于覆盖固定的 Open WebUI 镜像标签

## 文档检查

在修改文档后运行文档检查：`pnpm check:docs`。
如需进行页面内标题检查，请运行完整的 Mintlify 锚点验证：`pnpm docs:check-links:anchors`。

## 离线回归（CI 安全）

这些是在没有真实提供方的情况下进行的“真实流水线”回归：

- Gateway 工具调用（mock OpenAI，真实 gateway + agent 循环）：`src/gateway/gateway.test.ts`（用例："runs a mock OpenAI tool call end-to-end via gateway agent loop"）
- Gateway 向导（WS `wizard.start`/`wizard.next`，写入配置 + 强制认证）：`src/gateway/gateway.test.ts`（用例："runs wizard over ws and writes auth token config"）

## Agent 可靠性评估（技能）

我们已经有一些像“agent 可靠性评估”一样运行的 CI 安全测试：

- 通过真实 gateway + agent 循环进行 mock 工具调用（`src/gateway/gateway.test.ts`）。
- 端到端向导流程，验证会话连线和配置效果（`src/gateway/gateway.test.ts`）。

针对技能，目前还缺少的内容（参见 [Skills](/tools/skills)）：

- **决策能力：** 当提示中列出技能时，agent 是否会选择正确的技能（或避免无关技能）？
- **合规性：** agent 是否会在使用前阅读 `SKILL.md` 并遵循所需步骤/参数？
- **工作流契约：** 多轮场景，断言工具顺序、会话历史继承以及沙箱边界。

未来的评估应首先保持确定性：

- 使用 mock 提供方的场景运行器，断言工具调用及其顺序、技能文件读取和会话连线。
- 一小套聚焦技能的场景（使用 vs 避免、门控、提示注入）。
- 仅在 CI 安全套件就绪后，才添加可选的 live 评估（可显式启用、由环境变量控制）。

## 契约测试（插件和通道形状）

契约测试用于验证每个已注册的插件和通道是否符合其接口契约。它们会遍历所有已发现的插件，并运行一组形状和行为断言。默认的 `pnpm test` 单元测试通道会有意跳过这些共享接缝和冒烟文件；当你修改共享通道或提供方表面时，请显式运行契约命令。

### 命令

- 所有契约：`pnpm test:contracts`
- 仅通道契约：`pnpm test:contracts:channels`
- 仅提供方契约：`pnpm test:contracts:plugins`

### 通道契约

位于 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - 基础插件形状（id、name、capabilities）
- **setup** - 设置向导契约
- **session-binding** - 会话绑定行为
- **outbound-payload** - 消息载荷结构
- **inbound** - 入站消息处理
- **actions** - 通道动作处理器
- **threading** - 线程 ID 处理
- **directory** - 目录/名册 API
- **group-policy** - 群组策略强制

### 提供方状态契约

位于 `src/plugins/contracts/*.contract.test.ts`。

- **status** - 通道状态探测
- **registry** - 插件注册表形状

### 提供方契约

位于 `src/plugins/contracts/*.contract.test.ts`：

- **auth** - 认证流程契约
- **auth-choice** - 认证选择/选择
- **catalog** - 模型目录 API
- **discovery** - 插件发现
- **loader** - 插件加载
- **runtime** - 提供方运行时
- **shape** - 插件形状/接口
- **wizard** - 设置向导

### 何时运行

- 修改 plugin-sdk 导出或子路径后
- 添加或修改通道或提供方插件后
- 重构插件注册或发现逻辑后

契约测试在 CI 中运行，不需要真实 API 密钥。

## 添加回归（指南）

当你修复了在真实环境中发现的提供方/模型问题时：

- 尽可能添加一个 CI 安全的回归测试（mock/stub 提供方，或捕获精确的请求形状转换）
- 如果它本质上只能在真实环境中复现（速率限制、认证策略），请保持 live 测试范围足够窄，并通过环境变量按需启用
- 优先定位到能捕获 bug 的最小层级：
  - 提供方请求转换/重放 bug → 直接的 models 测试
  - gateway 会话/历史/工具流水线 bug → gateway live 冒烟测试或 CI 安全的 gateway mock 测试
- SecretRef 遍历护栏：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 会从注册表元数据（`listSecretTargetRegistryEntries()`）中为每个 SecretRef 类派生一个采样目标，然后断言拒绝遍历段 exec id。
  - 如果你在 `src/secrets/target-registry-data.ts` 中新增了一个 `includeInPlan` 的 SecretRef 目标族，请更新该测试中的 `classifyTargetClass`。该测试会刻意在未分类的目标 id 上失败，因此新的类别不会被悄悄跳过。

## 相关

- [Testing live](/help/testing-live)
- [CI](/ci)