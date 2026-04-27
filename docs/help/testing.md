---

OpenClaw 有三个 Vitest 套件（单元/集成、端到端、实况）以及一小组
Docker 运行器。本文件是一个“我们如何测试”的指南：

- 每个套件涵盖的内容（以及它刻意 _不_ 涵盖的内容）。
- 常见工作流程（本地、推送前、调试）应运行哪些命令。
- 实况测试如何发现凭据并选择模型/提供商。
- 如何为真实世界的模型/提供商问题添加回归测试。

# 测试

OpenClaw 有三个 Vitest 测试套件（单元/集成、端到端、实况）以及一组小型 Docker 运行器。

- 完整门禁（推送前预期执行）：`pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- 在配置较充裕的机器上更快的本地全套运行：`pnpm test:max`
- 直接 Vitest 监视循环：`pnpm test:watch`
- 直接按文件定位现在也会路由扩展/通道路径：`pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- 当你在迭代单个失败用例时，优先先运行有针对性的测试。
- Docker 支持的 QA 实验室：`pnpm qa:lab:up`
- Linux VM 支持的 QA 通道：`pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

- 每个套件涵盖的内容（以及刻意 _不_ 涵盖的内容）
- 常见工作流程（本地、推送前、调试）使用的命令
- 实况测试如何发现凭据并选择模型/提供商
- 如何为真实世界的模型/提供商问题添加回归测试

## 快速开始

大多数日常使用：

- 实况套件（模型 + 网关工具/镜像探测）：`pnpm test:live`
- 静默目标单个实况文件：`pnpm test:live -- src/agents/models.profiles.live.test.ts`
- Docker 实况模型扫面：`pnpm test:docker:live-models`
  - 每个被选中的模型现在都会运行一次文本回合以及一个小型文件读取式探测。
    元数据声明 `image` 输入的模型还会运行一次小型图像回合。
    在隔离提供商故障时，可通过 `OPENCLAW_LIVE_MODEL_FILE_PROBE=0` 或
    `OPENCLAW_LIVE_MODEL_IMAGE_PROBE=0` 禁用额外探测。
  - CI 覆盖：每日的 `OpenClaw Scheduled Live And E2E Checks` 和手动的
    `OpenClaw Release Checks` 都会调用可复用的 live/E2E 工作流，并带上
    `include_live_suites: true`，其中包含按提供商分片的独立 Docker 实况模型矩阵作业。
  - 为进行聚焦的 CI 重跑，可带 `include_live_suites: true`
    和 `live_models_only: true` 触发 `OpenClaw Live And E2E Checks (Reusable)`。
  - 将新的高信号提供商密钥添加到 `scripts/ci-hydrate-live-auth.sh`
    以及 `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml` 和它的
    定时/发布调用方中。
- 原生 Codex 绑定聊天冒烟测试：`pnpm test:docker:live-codex-bind`
  - 在 Docker 实况通道上针对 Codex 应用服务器路径运行，使用 `/codex bind` 绑定一个合成
    Slack 私信，执行 `/codex fast` 和 `/codex permissions`，然后验证普通回复和图像附件
    通过原生插件绑定而不是 ACP 路由。
- Moonshot/Kimi 成本冒烟测试：设置 `MOONSHOT_API_KEY` 后，运行
  `openclaw models list --provider moonshot --json`，然后运行一个隔离的
  `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json`
  。验证 JSON 报告中包含 Moonshot/K2.6，并且助手转录会存储规范化的 `usage.cost`。

当你修改测试或需要额外信心时：

- 覆盖门禁：`pnpm test:coverage`
- 端到端套件：`pnpm test:e2e`

调试真实提供商/模型（需要真实凭据）时：

- 实况套件（模型 + 网关工具/镜像探测）：`pnpm test:live`
- 静默目标单个实况文件：`pnpm test:live -- src/agents/models.profiles.live.test.ts`

提示：当你只需要一个失败用例时，优先使用下面描述的白名单环境变量来缩小实况测试范围。

## QA 专用运行器

当你需要 QA 实验室级别的真实感时，这些命令与主测试套件并列使用：

CI 在专门的工作流中运行 QA 实验室。`Parity gate` 会在匹配的 PR 上以及通过使用 mock 提供商的手动触发时运行。
`QA-Lab - All Lanes` 在 `main` 上每晚运行，并在手动触发时与 mock parity gate、live Matrix 通道和 Convex 托管的 live Telegram 通道作为并行作业一起运行。
`OpenClaw Release Checks` 会在发布批准前运行相同的通道。

- `pnpm openclaw qa suite`
  - 直接在主机上运行仓库支持的 QA 场景。
  - 默认并行运行多个选定场景，使用隔离的网关工作器。`qa-channel` 默认并发数为 4（受所选场景数量限制）。使用 `--concurrency <count>` 调整工作器数量，或使用 `--concurrency 1` 使用旧的串行通道。
  - 当任一场景失败时以非零状态退出。若你想要工件但不希望失败退出码，请使用 `--allow-failures`。
  - 支持提供商模式 `live-frontier`、`mock-openai` 和 `aimock`。
    `aimock` 会启动一个本地的 AIMock 支持的提供商服务器，用于实验性 fixture 和协议 mock 覆盖，而不替换具备场景感知的 `mock-openai` 通道。
- `pnpm openclaw qa suite --runner multipass`
  - 在一次性 Multipass Linux 虚拟机内运行相同的 QA 套件。
  - 保持与主机上的 `qa suite` 相同的场景选择行为。
  - 复用与 `qa suite` 相同的提供商/模型选择标志。
  - 实况运行会转发对客户机有用的受支持 QA 认证输入：
    基于环境的提供商密钥、QA 实况提供商配置路径，以及存在时的 `CODEX_HOME`。
  - 输出目录必须保持在仓库根目录下，以便客户机可以通过挂载的工作区写回。
  - 在 `.artifacts/qa-e2e/...` 下写入正常的 QA 报告 + 摘要以及 Multipass 日志。
- `pnpm qa:lab:up`
  - 启动 Docker 支持的 QA 站点，用于操作员式 QA 工作。
- `pnpm test:docker:npm-onboard-channel-agent`
  - 从当前检出构建一个 npm tarball，将其安装到 Docker 中，全程以非交互方式完成 OpenAI API key 上手配置，默认配置 Telegram，验证启用插件时按需安装运行时依赖，运行 doctor，并对一个模拟的 OpenAI 端点执行一次本地 agent 回合。
  - 使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 可在 Discord 上运行相同的打包安装通道。
- `pnpm test:docker:npm-telegram-live`
  - 在 Docker 中安装已发布的 OpenClaw 包，运行已安装包的上手配置，通过已安装的 CLI 配置 Telegram，然后复用 live Telegram QA 通道，并将该已安装包作为 SUT Gateway。
  - 默认使用 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@beta`。
  - 使用与 `pnpm openclaw qa telegram` 相同的 Telegram 环境凭据或 Convex 凭据来源。用于 CI/发布自动化时，设置
    `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex` 加上
    `OPENCLAW_QA_CONVEX_SITE_URL` 和角色密钥。如果
    `OPENCLAW_QA_CONVEX_SITE_URL` 和 Convex 角色密钥在 CI 中存在，Docker 包装器会自动选择 Convex。
  - `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci|maintainer` 仅为此通道覆盖共享的
    `OPENCLAW_QA_CREDENTIAL_ROLE`。
  - GitHub Actions 将此通道公开为手动维护者工作流
    `NPM Telegram Beta E2E`。它不会在合并时运行。该工作流使用
    `qa-live-shared` 环境和 Convex CI 凭据租约。
- `pnpm test:docker:bundled-channel-deps`
  - 在 Docker 中打包并安装当前 OpenClaw 构建，使用已配置 OpenAI 启动 Gateway，然后通过配置
    编辑启用捆绑的通道/插件。
  - 验证设置发现不会为未配置的插件保留运行时依赖；第一次已配置的 Gateway 或 doctor 运行会按需安装每个捆绑插件的运行时依赖，第二次重启不会重新安装已激活的依赖。
  - 还会安装一个已知的较旧 npm 基线，在运行 `openclaw update --tag <candidate>` 之前启用 Telegram，并验证候选版本的
    更新后 doctor 会修复捆绑通道运行时依赖，而无需 harness 侧的 postinstall 修复。
- `pnpm test:parallels:npm-update`
  - 在 Parallels 来宾机中运行原生打包安装更新冒烟测试。每个选定平台都会先安装请求的基线包，然后在同一个来宾机中运行已安装的 `openclaw update` 命令，并验证已安装版本、更新状态、网关就绪情况以及一次本地 agent 回合。
  - 在迭代单个来宾机时可使用 `--platform macos`、`--platform windows` 或 `--platform linux`。使用 `--json` 获取摘要工件路径和每个通道的状态。
  - 将长时间的本地运行包裹在主机超时中，以免 Parallels 传输停滞耗尽其余测试窗口：

    ```bash
    timeout --foreground 150m pnpm test:parallels:npm-update -- --json
    timeout --foreground 90m pnpm test:parallels:npm-update -- --platform windows --json
    ```

  - 脚本会在 `/tmp/openclaw-parallels-npm-update.*` 下写入嵌套通道日志。
    在认为外层包装器挂起之前，请检查 `windows-update.log`、`macos-update.log` 或 `linux-update.log`。
  - Windows 更新在冷来宾机上的 post-update doctor/运行时依赖修复可能需要 10 到 15 分钟；只要嵌套的 npm 调试日志仍在推进，这仍然是正常的。
  - 不要将此聚合包装器与单独的 Parallels macOS、Windows 或 Linux 冒烟通道并行运行。它们共享虚拟机状态，可能在快照恢复、包服务或来宾网关状态上发生冲突。
  - 更新后验证会运行正常的捆绑插件表面，因为诸如语音、图像生成和媒体理解之类的能力外观即使当 agent 回合本身只检查简单文本响应时，也会通过捆绑的运行时 API 加载。

- `pnpm openclaw qa aimock`
  - 仅启动本地 AIMock 提供商服务器，用于直接协议冒烟测试。
- `pnpm openclaw qa matrix`
  - 针对一个可丢弃的、由 Docker 支持的 Tuwunel homeserver 运行 Matrix 实况 QA 通道。
  - 当前此 QA 主机仅用于仓库/开发。打包后的 OpenClaw 安装不会附带
    `qa-lab`，因此它们不会暴露 `openclaw qa`。
  - 仓库检出会直接加载捆绑的运行器；不需要单独的插件安装步骤。
  - 预置三个临时 Matrix 用户（`driver`、`sut`、`observer`）以及一个私人房间，然后以真实 Matrix 插件作为 SUT 传输启动一个 QA 网关子进程。
  - 默认使用固定的稳定版 Tuwunel 镜像 `ghcr.io/matrix-construct/tuwunel:v1.5.1`。当你需要测试不同镜像时，可通过 `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE` 覆盖。
  - Matrix 不暴露共享的凭据来源标志，因为该通道在本地预置可丢弃用户。
  - 在 `.artifacts/qa-e2e/...` 下写入 Matrix QA 报告、摘要、观察到的事件工件以及合并的 stdout/stderr 输出日志。
  - 默认输出进度，并使用 `OPENCLAW_QA_MATRIX_TIMEOUT_MS` 强制执行硬性运行超时（默认 30 分钟）。清理受 `OPENCLAW_QA_MATRIX_CLEANUP_TIMEOUT_MS` 限制，失败会包含恢复用的 `docker compose ... down --remove-orphans` 命令。
- `pnpm openclaw qa telegram`
  - 针对一个使用来自环境变量的 driver 和 SUT 机器人令牌的真实私有群组运行 Telegram 实况 QA 通道。
  - 需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和 `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`。群组 id 必须是数字形式的 Telegram 聊天 id。
  - 支持 `--credential-source convex` 以使用共享池化凭据。默认使用环境变量模式，或设置 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` 以启用池化租约。
  - 当任何场景失败时以非零状态退出。若你想要工件但不想要失败退出码，请在需要时使用 `--allow-failures`。
  - 需要同一私人群组中的两个不同机器人，并且 SUT 机器人暴露一个 Telegram 用户名。
  - 为了稳定地进行机器人对机器人观察，请在两个机器人上都在 `@BotFather` 中启用 Bot-to-Bot Communication Mode，并确保 driver 机器人可以观察群组机器人流量。
  - 在 `.artifacts/qa-e2e/...` 下写入 Telegram QA 报告、摘要以及观察到的消息工件。回复类场景会包含从 driver 发送请求到观察到 SUT 回复的 RTT。

实况传输通道共享一个标准契约，因此新传输不会偏离：

`qa-channel` 仍然是广泛的合成 QA 套件，不属于实况传输覆盖矩阵的一部分。

| 通道     | 金丝雀 | 提及门禁 | 白名单块 | 顶层回复 | 重启恢复 | 线程跟进 | 线程隔离 | 反应观察 | 帮助命令 |
| -------- | ------ | -------- | --------- | --------- | -------- | -------- | -------- | -------- | -------- |
| Matrix   | x      | x        | x         | x         | x        | x        | x        | x        |          |
| Telegram | x      |          |           |           |          |          |          |          | x        |

### 通过 Convex 共享 Telegram 凭据（v1）

当 `openclaw qa telegram` 启用 `--credential-source convex`（或 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）时，QA 实验室会从基于 Convex 的池中获取一个独占租约，在通道运行期间为该租约发送心跳，并在关闭时释放该租约。

参考 Convex 项目脚手架：

- `qa/convex-credential-broker/`

所需环境变量：

- `OPENCLAW_QA_CONVEX_SITE_URL`（例如 `https://your-deployment.convex.site`）
- 所选角色对应的一个密钥：
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 用于 `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` 用于 `ci`
- 凭据角色选择：
  - CLI：`--credential-role maintainer|ci`
  - 环境默认：`OPENCLAW_QA_CREDENTIAL_ROLE`（在 CI 中默认为 `ci`，否则默认为 `maintainer`）

可选环境变量：

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS`（默认 `1200000`）
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS`（默认 `30000`）
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS`（默认 `90000`）
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS`（默认 `15000`）
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX`（默认 `/qa-credentials/v1`）
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID`（可选跟踪 ID）
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` 允许仅在本地开发中使用 loopback 的 `http://` Convex URL。

`OPENCLAW_QA_CONVEX_SITE_URL` 在正常操作中应使用 `https://`。

维护者管理员命令（池添加/移除/列表）需要明确提供 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`。

CLI 维护者助手：

```bash
pnpm openclaw qa credentials doctor
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

在实况运行前使用 `doctor` 检查 Convex 站点 URL、broker 密钥、
端点前缀、HTTP 超时以及管理员/列表可达性，而不打印
密钥值。在脚本和 CI 工具中使用 `--json` 以获得机器可读输出。

默认端点契约（`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`）：

- `POST /acquire`
  - 请求：`{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - 成功：`{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - 已耗尽/可重试：`{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
- `POST /heartbeat`
  - 请求：`{ kind, ownerId, actorRole, credentialId, leaseToken, leaseTtlMs }`
  - 成功：`{ status: "ok" }`（或空 `2xx`）
- `POST /release`
  - 请求：`{ kind, ownerId, actorRole, credentialId, leaseToken }`
  - 成功：`{ status: "ok" }`（或空 `2xx`）
- `POST /admin/add`（仅维护者密钥）
  - 请求：`{ kind, actorId, payload, note?, status? }`
  - 成功：`{ status: "ok", credential }`
- `POST /admin/remove`（仅维护者密钥）
  - 请求：`{ credentialId, actorId }`
  - 成功：`{ status: "ok", changed, credential }`
  - 活动租约保护：`{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list`（仅维护者密钥）
  - 请求：`{ kind?, status?, includePayload?, limit? }`
  - 成功：`{ status: "ok", credentials, count }`

Telegram 凭据形状：

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` 必须是数字 Telegram 聊天 ID 字符串。
- `admin/add` 针对 `kind: "telegram"` 验证此形状并拒绝格式错误的负载。

### 向 QA 系统添加通道

向 markdown QA 系统添加通道恰好需要两件事：

1. 该通道的传输适配器。
2. 练习通道契约的场景包。

不要在共享 `qa-lab` 主机可以拥有流程时添加新的顶级 QA 命令根。

`qa-lab` 拥有共享主机机制：

- `openclaw qa` 命令根
- 套件启动和拆卸
- 工作器并发
- 工件写入
- 报告生成
- 场景执行
- 旧 `qa-channel` 场景的兼容性别名

运行器插件拥有传输契约：

- `openclaw qa <runner>` 如何挂载在共享 `qa` 根之下
- 如何为该传输配置网关
- 如何检查就绪状态
- 如何注入入站事件
- 如何观察出站消息
- 如何公开传输和规范化传输状态
- 如何执行与传输支持的操作
- 如何处理传输特定的重置或清理

新通道的最低采用标准是：

1. 将 `qa-lab` 作为共享 `qa` 根的拥有者。
2. 在共享 `qa-lab` 主机接缝上实现传输运行器。
3. 将传输特定机制保留在运行器插件或通道支架中。
4. 以 `openclaw qa <runner>` 的方式挂载运行器，而不是注册一个竞争性的根命令。
   运行器插件应在 `openclaw.plugin.json` 中声明 `qaRunners`，并从 `runtime-api.ts` 导出匹配的 `qaRunnerCliRegistrations` 数组。
   保持 `runtime-api.ts` 轻量；懒加载的 CLI 和运行器执行应留在独立入口之后。
5. 在主题化的 `qa/scenarios/` 目录下编写或改造 markdown 场景。
6. 对新场景使用通用场景辅助函数。
7. 保持现有兼容性别名可用，除非仓库正在进行有意的迁移。

决策规则是严格的：

- 如果行为可以在 `qa-lab` 中表达一次，请将其放入 `qa-lab`。
- 如果行为依赖于单个通道传输，请保留在该运行器插件或插件支架中。
- 如果场景需要多个通道都可以使用的新能力，请添加通用辅助函数，而不是在 `suite.ts` 中添加通道特定分支。
- 如果行为只对一种传输有意义，请保持场景具有传输特异性，并在场景契约中明确说明。

新场景的首选通用辅助函数名称是：

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

现有场景仍可使用兼容性别名，包括：

- `waitForQaChannelReady`
- `waitForOutboundMessage`
- `waitForNoOutbound`
- `formatConversationTranscript`
- `resetBus`

新通道工作应使用通用辅助函数名称。兼容性别名的存在是为了避免标志日迁移，而不是作为新场景创作的模式。

## 测试套件（运行位置及内容）

将测试套件视为“现实程度递增”（以及不稳定性/成本递增）：

### 单元 / 集成（默认）

- Command: `pnpm test`
- Config: 未定向运行使用 `vitest.full-*.config.ts` 分片集合，并且可能将多项目分片展开为按项目的配置，以便并行调度
- Files: `src/**/*.test.ts`、`packages/**/*.test.ts`、`test/**/*.test.ts` 下的核心/单元清单，以及由 `vitest.unit.config.ts` 覆盖的白名单 `ui` node 测试
- Scope:
  - 纯单元测试
  - 进程内集成测试（网关认证、路由、工具、解析、配置）
  - 针对已知 bug 的确定性回归测试
- Expectations:
  - 在 CI 中运行
  - 不需要真实密钥
  - 应该快速且稳定

<AccordionGroup>
  <Accordion title="项目、分片与作用域泳道">

    - 未定向的 `pnpm test` 不再运行一个巨大的原生根项目进程，而是运行十二个更小的分片配置（`core-unit-fast`、`core-unit-src`、`core-unit-security`、`core-unit-ui`、`core-unit-support`、`core-support-boundary`、`core-contracts`、`core-bundled`、`core-runtime`、`agentic`、`auto-reply`、`extensions`）。这可降低高负载机器上的峰值 RSS，并避免 auto-reply/extension 工作挤占无关测试套件。
    - `pnpm test --watch` 仍然使用原生根 `vitest.config.ts` 项目图，因为多分片 watch 循环并不现实。
    - `pnpm test`、`pnpm test:watch` 和 `pnpm test:perf:imports` 会先通过作用域泳道处理显式的文件/目录目标，因此 `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` 不会付出完整根项目启动成本。
    - 当 diff 只触及可路由的源/test 文件时，`pnpm test:changed` 会把变更的 git 路径展开到同样的作用域泳道；配置/设置类编辑仍会回退到更宽泛的根项目重跑。
    - `pnpm check:changed` 是窄范围工作的常规智能本地门禁。它会将 diff 分类为 core、core tests、extensions、extension tests、apps、docs、release metadata 和 tooling，然后运行匹配的 typecheck/lint/test 泳道。Public Plugin SDK 和 plugin-contract 的变更会额外包含一次 extension 校验，因为 extensions 依赖这些核心契约。仅修改 release metadata 的版本提升会运行有针对性的 version/config/root-dependency 检查，而不是完整套件，并带有一个守卫，用于拒绝顶层 version 字段之外的 package 变更。
    - 来自 agents、commands、plugins、auto-reply helpers、`plugin-sdk` 以及类似纯工具区域的轻量导入单元测试会走 `unit-fast` 泳道，它会跳过 `test/setup-openclaw-runtime.ts`；有状态/运行时较重的文件仍留在现有泳道中。
    - 选定的 `plugin-sdk` 和 `commands` helper 源文件在变更模式下也会映射到这些轻量泳道中的显式同级测试，因此对 helper 的修改无需为该目录重跑完整的重型套件。
    - `auto-reply` 有三个专用桶：顶层 core helpers、顶层 `reply.*` 集成测试，以及 `src/auto-reply/reply/**` 子树。这样可以把最重的 reply harness 工作从廉价的 status/chunk/token 测试中分离出去。

  </Accordion>

  <Accordion title="嵌入式运行器覆盖">

    - 当你修改消息工具发现输入或压缩运行时上下文时，请保留两个层级的覆盖。
    - 为纯路由与归一化边界添加聚焦的 helper 回归测试。
    - 保持嵌入式运行器集成套件健康：
      `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
      `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts`, 以及
      `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
    - 这些套件验证 scoped ids 和压缩行为仍会通过真实的 `run.ts` / `compact.ts` 路径流转；仅靠 helper 测试并不足以替代这些集成路径。

  </Accordion>

  <Accordion title="Vitest 池与隔离默认值">

    - 基础 Vitest 配置默认使用 `threads`。
    - 共享的 Vitest 配置将 `isolate: false` 固定下来，并在根项目、e2e 和 live 配置中使用非隔离运行器。
    - 根 UI 泳道保留其 `jsdom` 设置和优化器，但也运行在共享的非隔离运行器上。
    - 每个 `pnpm test` 分片都从共享 Vitest 配置继承相同的 `threads` + `isolate: false` 默认值。
    - `scripts/run-vitest.mjs` 默认会为 Vitest 子 Node 进程添加 `--no-maglev`，以减少大型本地运行中的 V8 编译抖动。设置 `OPENCLAW_VITEST_ENABLE_MAGLEV=1` 可与原生 V8 行为进行对比。

  </Accordion>

  <Accordion title="快速本地迭代">

    - `pnpm changed:lanes` 会显示 diff 会触发哪些架构泳道。
    - pre-commit 钩子只做格式化。它会重新暂存已格式化的文件，而不会运行 lint、typecheck 或 tests。
    - 当你需要智能本地门禁时，请在交接或推送前显式运行 `pnpm check:changed`。Public Plugin SDK 和 plugin-contract 的变更会额外包含一次 extension 校验。
    - `pnpm test:changed` 在变更路径能清晰映射到更小套件时，会通过作用域泳道进行路由。
    - `pnpm test:max` 和 `pnpm test:changed:max` 保持相同的路由行为，只是提高了 worker 上限。
    - 本地 worker 自动扩缩容是有意保持保守的；当宿主机负载平均值已经很高时会退让，因此默认情况下多个并发 Vitest 运行造成的破坏更小。
    - 基础 Vitest 配置将项目/配置文件标记为 `forceRerunTriggers`，因此当测试编排发生变化时，changed-mode 的重跑仍然正确。
    - 配置会在受支持的宿主机上保持启用 `OPENCLAW_VITEST_FS_MODULE_CACHE`；如果你想为直接分析指定一个明确的缓存位置，请设置 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`。

  </Accordion>

  <Accordion title="性能调试">

    - `pnpm test:perf:imports` 会启用 Vitest 导入耗时报告以及导入分解输出。
    - `pnpm test:perf:imports:changed` 会将相同的性能分析视图限定到自 `origin/main` 以来发生变更的文件。
    - 当某个热点测试仍然把大部分时间花在启动导入上时，请把重型依赖放在一个狭窄的本地 `*.runtime.ts` 接口之后，并直接 mock 该接口，而不是为了通过 `vi.mock(...)` 传递它们而深度导入运行时 helper。
    - `pnpm test:perf:changed:bench -- --ref <git-ref>` 会将路由后的 `test:changed` 与该已提交 diff 的原生根项目路径进行对比，并打印墙钟时间以及 macOS 的最大 RSS。
    - `pnpm test:perf:changed:bench -- --worktree` 通过将变更文件列表路由到 `scripts/test-projects.mjs` 和根 Vitest 配置来对当前脏工作树进行基准测试。
    - `pnpm test:perf:profile:main` 会为 Vitest/Vite 的启动与转换开销写出主线程 CPU profile。
    - `pnpm test:perf:profile:runner` 会在禁用文件并行的情况下，为单元套件写出运行器 CPU+heap profile。

  </Accordion>
</AccordionGroup>

### 稳定性（网关）

- Command: `pnpm test:stability:gateway`
- Config: `vitest.gateway.config.ts`，强制使用一个 worker
- Scope:
  - 默认启动带诊断功能的真实 loopback Gateway
  - 通过诊断事件路径驱动合成的网关消息、内存和大负载 churn
  - 通过 Gateway WS RPC 查询 `diagnostics.stability`
  - 覆盖诊断稳定性 bundle 持久化 helper
  - 断言 recorder 保持有界、合成 RSS 采样保持低于压力预算，并且每会话队列深度回落到零
- Expectations:
  - CI 安全且无需密钥
  - 这是稳定性回归跟进的窄泳道，不是完整 Gateway 套件的替代品

### E2E（网关冒烟）

- Command: `pnpm test:e2e`
- Config: `vitest.e2e.config.ts`
- Files: `src/**/*.e2e.test.ts`、`test/**/*.e2e.test.ts`，以及 `extensions/` 下的 bundled-plugin E2E 测试
- Runtime defaults:
  - 使用 Vitest `threads` 且 `isolate: false`，与仓库其余部分保持一致。
  - 使用自适应 workers（CI：最多 2 个，本地：默认 1 个）。
  - 默认以静默模式运行，以降低控制台 I/O 开销。
- Useful overrides:
  - `OPENCLAW_E2E_WORKERS=<n>` 用于强制 worker 数量（上限 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 用于重新启用详细控制台输出。
- Scope:
  - 多实例网关端到端行为
  - WebSocket/HTTP 界面、节点配对，以及更重的网络通信
- Expectations:
  - 在 CI 中运行（当流水线启用时）
  - 不需要真实密钥
  - 比单元测试有更多活动部件（可能更慢）

### E2E：OpenShell 后端冒烟测试

- Command: `pnpm test:e2e:openshell`
- File: `extensions/openshell/src/backend.e2e.test.ts`
- Scope:
  - 通过 Docker 在主机上启动一个隔离的 OpenShell gateway
  - 从临时本地 Dockerfile 创建一个 sandbox
  - 通过真实的 `sandbox ssh-config` + SSH exec 测试 OpenClaw 的 OpenShell backend
  - 通过 sandbox fs bridge 验证远程规范化的文件系统行为
- Expectations:
  - 仅按需启用；不属于默认的 `pnpm test:e2e` 运行
  - 需要本地 `openshell` CLI 以及可工作的 Docker daemon
  - 使用隔离的 `HOME` / `XDG_CONFIG_HOME`，然后销毁测试 gateway 和 sandbox
- Useful overrides:
  - `OPENCLAW_E2E_OPENSHELL=1` 用于在手动运行更广泛的 e2e 套件时启用该测试
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 用于指向非默认的 CLI 二进制或包装脚本

### 实况（真实提供商 + 真实模型）

- Command: `pnpm test:live`
- Config: `vitest.live.config.ts`
- Files: `src/**/*.live.test.ts`、`test/**/*.live.test.ts`，以及 `extensions/` 下的 bundled-plugin live 测试
- Default: 由 `pnpm test:live` **启用**（设置 `OPENCLAW_LIVE_TEST=1`）
- Scope:
  - “这个提供商/模型今天用真实凭据真的能工作吗？”
  - 捕获提供商格式变更、工具调用怪癖、认证问题以及速率限制行为
- Expectations:
  - 设计上不保证 CI 稳定（真实网络、真实提供商策略、配额、故障）
  - 会花钱 / 消耗速率限制
  - 更适合运行缩小范围的子集，而不是“一切”
- Live runs 会读取 `~/.profile` 以获取缺失的 API key。
- 默认情况下，live runs 仍会隔离 `HOME` 并把配置/认证材料复制到临时测试 home，因此单元 fixtures 不能修改你真实的 `~/.openclaw`。
- 仅在你有意让 live tests 使用真实 home 目录时，才设置 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 现在默认采用更安静的模式：保留 `[live] ...` 进度输出，但会抑制额外的 `~/.profile` 提示并静音 gateway bootstrap 日志/Bonjour 噪声。如果你想恢复完整启动日志，可设置 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API key 轮换（按提供商区分）：将 `*_API_KEYS` 设为逗号/分号格式，或使用 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`），或者通过 `OPENCLAW_LIVE_*_KEY` 进行每次 live 的覆盖；测试会在速率限制响应后重试。
- 进度/心跳输出：
  - Live 套件现在会向 stderr 输出进度行，因此即使 Vitest 控制台捕获是静默的，较长的 provider 调用也能明显看出正在运行。
  - `vitest.live.config.ts` 禁用了 Vitest 的控制台拦截，因此 provider/gateway 进度行会在 live 运行期间立即流式输出。
  - 通过 `OPENCLAW_LIVE_HEARTBEAT_MS` 调整直接模型心跳。
  - 通过 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 调整 gateway/probe 心跳。

## 我应该运行哪个套件？

请依据下表决策：

- 编辑逻辑/测试：运行 `pnpm test`（修改较多时加跑 `pnpm test:coverage`）
- 触及网关网络/WS 协议/配对：加跑 `pnpm test:e2e`
- 调试“我的机器人崩了”/特定提供商失败/工具调用：运行狭义的 `pnpm test:live`

## 实况（涉及网络）的测试

关于实况模型矩阵、CLI 后端冒烟、ACP 冒烟、Codex app-server
harness，以及所有媒体提供商的实况测试（Deepgram、BytePlus、ComfyUI、image、
music、video、media harness）——以及实况运行的凭据处理——请参见
[测试 — 实况套件](/help/testing-live)。

## Docker 运行器（可选的“在 Linux 中运行”检查）

这些 Docker 运行器分为两类：

- 实况模型运行器：`test:docker:live-models` 和 `test:docker:live-gateway` 只会在仓库 Docker 镜像内运行与其匹配的 profile-key 实况文件（`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`），并挂载你的本地配置目录和工作区（如果挂载了 `~/.profile` 也会读取）。对应的本地入口点是 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker 实况运行器默认采用较小的 smoke 上限，以便完整的 Docker 扫描仍然可行：
  `test:docker:live-models` 默认 `OPENCLAW_LIVE_MAX_MODELS=12`，而
  `test:docker:live-gateway` 默认 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`、
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`、
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000`，以及
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。当你明确想要更大、更穷举的扫描时，再覆盖这些环境变量。
- `test:docker:all` 会先通过 `test:docker:live-build` 构建一次实况 Docker 镜像，再通过 `scripts/package-openclaw-for-docker.mjs` 将 OpenClaw 打包成一个 npm tarball，然后构建/复用两个 `scripts/e2e/Dockerfile` 镜像。裸镜像只是用于 install/update/plugin-dependency 泳道的 Node/Git 运行器；这些泳道会挂载预构建 tarball。功能镜像会将同一个 tarball 安装到 `/app`，用于 built-app 功能泳道。Docker 泳道定义位于 `scripts/lib/docker-e2e-scenarios.mjs`；规划逻辑位于 `scripts/lib/docker-e2e-plan.mjs`；`scripts/test-docker-all.mjs` 会执行选定的计划。该聚合使用加权本地调度器：`OPENCLAW_DOCKER_ALL_PARALLELISM` 控制进程槽位，而资源上限会避免重型实况、npm-install 和多服务泳道同时启动。默认值是 10 个槽位、`OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；只有在 Docker 主机有更多余量时才调整 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。运行器默认会进行 Docker 预检、移除过时的 OpenClaw E2E 容器、每 30 秒打印状态、将成功的泳道耗时存储到 `.artifacts/docker-tests/lane-timings.json`，并在后续运行中根据这些耗时优先启动更长的泳道。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 可以在不构建或运行 Docker 的情况下打印加权后的泳道清单，或者使用 `node scripts/test-docker-all.mjs --plan-json` 打印所选泳道、包/镜像需求以及凭据的 CI 计划。
- 容器 smoke 运行器：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:npm-onboard-channel-agent`、`test:docker:update-channel-switch`、`test:docker:session-runtime-context`、`test:docker:agents-delete-shared-workspace`、`test:docker:gateway-network`、`test:docker:browser-cdp-snapshot`、`test:docker:mcp-channels`、`test:docker:pi-bundle-mcp-tools`、`test:docker:cron-mcp-cleanup`、`test:docker:plugins`、`test:docker:plugin-update` 以及 `test:docker:config-reload` 会启动一个或多个真实容器，并验证更高层级的集成路径。

实况模型 Docker 运行器还会只绑定挂载所需的 CLI 认证主目录（或者在运行未缩小范围时挂载所有受支持的主目录），然后在运行前将它们复制到容器主目录中，以便外部 CLI 的 OAuth 可以刷新令牌而不修改宿主机认证存储：

- 直接模型：`pnpm test:docker:live-models`（脚本：`scripts/test-live-models-docker.sh`）
- ACP 绑定 smoke：`pnpm test:docker:live-acp-bind`（脚本：`scripts/test-live-acp-bind-docker.sh`；默认覆盖 Claude、Codex 和 Gemini，通过 `pnpm test:docker:live-acp-bind:droid` 和 `pnpm test:docker:live-acp-bind:opencode` 可获得严格的 Droid/OpenCode 覆盖）
- CLI 后端 smoke：`pnpm test:docker:live-cli-backend`（脚本：`scripts/test-live-cli-backend-docker.sh`）
- Codex app-server harness smoke：`pnpm test:docker:live-codex-harness`（脚本：`scripts/test-live-codex-harness-docker.sh`）
- Gateway + 开发代理：`pnpm test:docker:live-gateway`（脚本：`scripts/test-live-gateway-models-docker.sh`）
- Open WebUI 实况 smoke：`pnpm test:docker:openwebui`（脚本：`scripts/e2e/openwebui-docker.sh`）
- 启动向导（TTY，完整脚手架）：`pnpm test:docker:onboard`（脚本：`scripts/e2e/onboard-docker.sh`）
- npm tarball 安装/频道/代理 smoke：`pnpm test:docker:npm-onboard-channel-agent` 会在 Docker 中全局安装打包后的 OpenClaw tarball，默认通过 env-ref onboarding 配置 OpenAI 和 Telegram，验证 doctor 会修复已激活插件的运行时依赖，并运行一次模拟的 OpenAI 代理轮次。可通过 `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 复用预构建 tarball，通过 `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0` 跳过主机重建，或通过 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 切换频道。
- 更新频道切换 smoke：`pnpm test:docker:update-channel-switch` 会在 Docker 中全局安装打包后的 OpenClaw tarball，从包 `stable` 切换到 git `dev`，验证持久化后的频道和插件在更新后仍能工作，然后切回包 `stable` 并检查更新状态。
- 会话运行时上下文 smoke：`pnpm test:docker:session-runtime-context` 验证隐藏的运行时上下文转录持久化，以及 doctor 对受影响的重复 prompt-rewrite 分支的修复。
- Bun 全局安装 smoke：`bash scripts/e2e/bun-global-install-smoke.sh` 会打包当前树，在隔离的 home 中用 `bun install -g` 安装它，并验证 `openclaw infer image providers --json` 返回的是打包内置的 image providers，而不是卡住。可通过 `OPENCLAW_BUN_GLOBAL_SMOKE_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 复用预构建 tarball，通过 `OPENCLAW_BUN_GLOBAL_SMOKE_HOST_BUILD=0` 跳过主机构建，或通过 `OPENCLAW_BUN_GLOBAL_SMOKE_DIST_IMAGE=openclaw-dockerfile-smoke:local` 从构建好的 Docker 镜像复制 `dist/`。
- 安装器 Docker smoke：`bash scripts/test-install-sh-docker.sh` 会在其 root、update 和 direct-npm 容器之间共享一个 npm 缓存。更新 smoke 默认将 npm `latest` 作为稳定基线，然后再升级到候选 tarball。非 root 安装器检查会保留一个隔离的 npm 缓存，这样 root 拥有的缓存条目不会掩盖用户本地的安装行为。设置 `OPENCLAW_INSTALL_SMOKE_NPM_CACHE_DIR=/path/to/cache` 可以在本地重复运行时复用 root/update/direct-npm 缓存。
- Install Smoke CI 会使用 `OPENCLAW_INSTALL_SMOKE_SKIP_NPM_GLOBAL=1` 跳过重复的 direct-npm 全局更新；如果需要 direct `npm install -g` 覆盖，请在本地运行脚本时不要设置该环境变量。
- Agents 删除共享工作区 CLI smoke：`pnpm test:docker:agents-delete-shared-workspace`（脚本：`scripts/e2e/agents-delete-shared-workspace-docker.sh`）默认构建根 Dockerfile 镜像，在隔离的容器 home 中用一个 workspace 种下两个 agents，运行 `agents delete --json`，并验证返回的是有效 JSON 以及 workspace 保留行为。可通过 `OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_IMAGE=openclaw-dockerfile-smoke:local OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_SKIP_BUILD=1` 复用安装 smoke 镜像。
- 网关联网（两个容器，WS auth + health）：`pnpm test:docker:gateway-network`（脚本：`scripts/e2e/gateway-network-docker.sh`）
- 浏览器 CDP 快照 smoke：`pnpm test:docker:browser-cdp-snapshot`（脚本：`scripts/e2e/browser-cdp-snapshot-docker.sh`）会构建源 E2E 镜像和一个 Chromium 层，使用原始 CDP 启动 Chromium，运行 `browser doctor --deep`，并验证 CDP 角色快照覆盖了链接 URL、由光标提升的可点击项、iframe 引用和 frame 元数据。
- OpenAI Responses `web_search` 最小推理回归：`pnpm test:docker:openai-web-search-minimal`（脚本：`scripts/e2e/openai-web-search-minimal-docker.sh`）会通过 Gateway 运行一个模拟的 OpenAI 服务器，验证 `web_search` 会把 `reasoning.effort` 从 `minimal` 提升到 `low`，然后强制 provider schema 拒绝并检查 Gateway 日志中是否出现原始细节。
- MCP 频道桥接（已种子化 Gateway + stdio bridge + 原始 Claude 通知帧 smoke）：`pnpm test:docker:mcp-channels`（脚本：`scripts/e2e/mcp-channels-docker.sh`）
- Pi bundle MCP 工具（真实 stdio MCP server + 嵌入式 Pi profile allow/deny smoke）：`pnpm test:docker:pi-bundle-mcp-tools`（脚本：`scripts/e2e/pi-bundle-mcp-tools-docker.sh`）
- Cron/subagent MCP 清理（真实 Gateway + 在隔离 cron 和一次性 subagent 运行后进行 stdio MCP 子进程拆除）：`pnpm test:docker:cron-mcp-cleanup`（脚本：`scripts/e2e/cron-mcp-cleanup-docker.sh`）
- 插件（安装 smoke、ClawHub 安装/卸载、市场更新，以及 Claude-bundle 启用/检查）：`pnpm test:docker:plugins`（脚本：`scripts/e2e/plugins-docker.sh`）
  设置 `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` 可跳过 live ClawHub 区块，或通过 `OPENCLAW_PLUGINS_E2E_CLAWHUB_SPEC` 和 `OPENCLAW_PLUGINS_E2E_CLAWHUB_ID` 覆盖默认包。
- 插件更新未变化 smoke：`pnpm test:docker:plugin-update`（脚本：`scripts/e2e/plugin-update-unchanged-docker.sh`）
- 配置重载元数据 smoke：`pnpm test:docker:config-reload`（脚本：`scripts/e2e/config-reload-source-docker.sh`）
- bundled plugin 运行时依赖：`pnpm test:docker:bundled-channel-deps` 默认先构建一个小型 Docker 运行器镜像，在主机上构建并打包一次 OpenClaw，然后将该 tarball 挂载到每个 Linux 安装场景中。可通过 `OPENCLAW_SKIP_DOCKER_BUILD=1` 复用镜像，通过 `OPENCLAW_BUNDLED_CHANNEL_HOST_BUILD=0` 在本地新构建后跳过主机重建，或通过 `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 指向已有 tarball。完整的 Docker 聚合会先打包一次该 tarball，然后将 bundled channel 检查分片成独立泳道，包括 Telegram、Discord、Slack、Feishu、memory-lancedb 和 ACPX 的独立更新泳道。运行 bundled 泳道时，可使用 `OPENCLAW_BUNDLED_CHANNELS=telegram,slack` 缩小频道矩阵，或使用 `OPENCLAW_BUNDLED_CHANNEL_UPDATE_TARGETS=telegram,acpx` 缩小更新场景。该泳道还会验证 `channels.<id>.enabled=false` 和 `plugins.entries.<id>.enabled=false` 会抑制 doctor/runtime-dependency 修复。
- 在迭代时，通过禁用无关场景来缩小 bundled plugin 运行时依赖范围，例如：
  `OPENCLAW_BUNDLED_CHANNEL_SCENARIOS=0 OPENCLAW_BUNDLED_CHANNEL_UPDATE_SCENARIO=0 OPENCLAW_BUNDLED_CHANNEL_ROOT_OWNED_SCENARIO=0 OPENCLAW_BUNDLED_CHANNEL_SETUP_ENTRY_SCENARIO=0 pnpm test:docker:bundled-channel-deps`。

要手动预构建并复用共享功能镜像：

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

像 `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE` 这样的套件特定镜像覆盖在设置后仍会优先生效。当 `OPENCLAW_SKIP_DOCKER_BUILD=1` 指向远程共享镜像时，如果该镜像尚未在本地存在，脚本会拉取它。QR 和 installer 的 Docker 测试保留它们各自的 Dockerfile，因为它们验证的是包/安装行为，而不是共享的已构建应用运行时。

实况模型 Docker 运行器还会以只读方式绑定挂载当前检出内容，并将其暂存到容器内的临时工作目录。这在保持运行时镜像精简的同时，仍然可以用你精确的本地源码/配置运行 Vitest。暂存步骤会跳过大型仅本地缓存和应用构建输出，例如 `.pnpm-store`、`.worktrees`、`__openclaw_vitest__`，以及应用本地的 `.build` 或 Gradle 输出目录，这样 Docker 实况运行就不会花几分钟去复制机器特定的产物。  
它们还会设置 `OPENCLAW_SKIP_CHANNELS=1`，以便网关实况探测不会在容器内启动真实的 Telegram/Discord/等频道工作器。  
`test:docker:live-models` 仍然会运行 `pnpm test:live`，因此当你需要缩小或排除该 Docker 车道中的网关实况覆盖范围时，也要透传 `OPENCLAW_LIVE_GATEWAY_*`。  
`test:docker:openwebui` 是一个更高层级的兼容性 smoke：它启动一个启用 OpenAI 兼容 HTTP 端点的 OpenClaw 网关容器，启动一个固定版本的 Open WebUI 容器连接该网关，通过 Open WebUI 完成登录，验证 `/api/models` 暴露 `openclaw/default`，然后通过 Open WebUI 的 `/api/chat/completions` 代理发送一次真实聊天请求。  
第一次运行可能会明显更慢，因为 Docker 可能需要拉取 Open WebUI 镜像，而且 Open WebUI 可能还需要完成自身的冷启动设置。  
该车道需要一个可用的实况模型密钥，而 `OPENCLAW_PROFILE_FILE`
（默认 `~/.profile`）是在 Docker 化运行中提供它的主要方式。  
成功运行会打印一个类似 `{ "ok": true, "model":
"openclaw/default", ... }` 的小型 JSON 载荷。  
`test:docker:mcp-channels` 被刻意设计为确定性的，并不需要真实的
Telegram、Discord 或 iMessage 账户。它会启动一个已种子化的 Gateway
容器，启动第二个容器来运行 `openclaw mcp serve`，然后
验证路由后的会话发现、转录读取、附件元数据、
实况事件队列行为、出站发送路由，以及通过真实 stdio MCP 桥接的
Claude 风格频道 + 权限通知。通知检查会直接检查原始 stdio MCP 帧，
因此该 smoke 验证的是桥接实际发出的内容，而不只是某个特定客户端 SDK
恰好展示的内容。  
`test:docker:pi-bundle-mcp-tools` 是确定性的，并不需要实况
模型密钥。它会构建仓库 Docker 镜像，在容器内启动一个真实的 stdio MCP 探测服务器，
通过内嵌的 Pi bundle MCP 运行时实例化该服务器，执行该工具，然后验证
`coding` 和 `messaging` 会保留 `bundle-mcp` 工具，而 `minimal` 和 `tools.deny: ["bundle-mcp"]` 会将它们过滤掉。  
`test:docker:cron-mcp-cleanup` 是确定性的，并不需要实况模型
密钥。它会启动一个已种子化的 Gateway 和一个真实的 stdio MCP 探测服务器，运行一个隔离的 cron 轮次和一次 `/subagents spawn` 单次子代理轮次，然后验证每次运行后 MCP 子进程都会退出。

手动 ACP 明文线程 smoke（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 保留此脚本供回归/调试流程，未来可能再次用于 ACP 线程路由验证，勿删。

实用环境变量：

- `OPENCLAW_CONFIG_DIR=...`（默认：`~/.openclaw`）挂载到 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（默认：`~/.openclaw/workspace`）挂载到 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（默认：`~/.profile`）挂载到 `/home/node/.profile` 并在运行测试前 source
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` 用于仅验证来自 `OPENCLAW_PROFILE_FILE` 的环境变量，使用临时配置/工作区目录且不挂载外部 CLI 认证目录
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...`（默认：`~.cache/openclaw/docker-cli-tools`）挂载到 `/home/node/.npm-global`，用于 Docker 内缓存的 CLI 安装
- `$HOME` 下的外部 CLI 认证目录/文件以只读方式挂载到 `/host-auth...`，然后在测试开始前复制到 `/home/node/...`
  - 默认目录：`.minimax`
  - 默认文件：`~/.codex/auth.json`、`~/.codex/config.toml`、`.claude.json`、`~/.claude/.credentials.json`、`~/.claude/settings.json`、`~/.claude/settings.local.json`
  - 缩小范围后的提供商运行只挂载从 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推断出的所需目录/文件
  - 可通过 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none` 或类似 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex` 的逗号列表手动覆盖
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 用于缩小运行范围
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 用于在容器内过滤提供商
- `OPENCLAW_SKIP_DOCKER_BUILD=1` 用于复用现有 `openclaw:local-live` 镜像，以便不需要重新构建的重跑
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 确保凭据来自配置文件存储（而不是环境变量）
- `OPENCLAW_OPENWEBUI_MODEL=...` 用于选择网关向 Open WebUI 冒烟暴露的模型
- `OPENCLAW_OPENWEBUI_PROMPT=...` 用于覆盖 Open WebUI 冒烟中使用的 nonce 检查提示
- `OPENWEBUI_IMAGE=...` 用于覆盖固定的 Open WebUI 镜像标签

## 文档健全性检查

编辑文档后运行文档检查：`pnpm check:docs`。  
当你需要检查页面内标题时，运行完整的 Mintlify 锚点验证：`pnpm docs:check-links:anchors`。

## 离线回归测试（CI 安全）

这些是“真实流水线”回归测试，但没有真实提供者：

- 网关工具调用（模拟 OpenAI，真实网关 + 代理循环）：`src/gateway/gateway.test.ts`（用例：“以端到端方式通过网关代理循环运行一个模拟 OpenAI 工具调用”）
- 网关向导（WS `wizard.start`/`wizard.next`，写配置 + 认证强制）：`src/gateway/gateway.test.ts`（用例：“通过 ws 运行向导并写入 auth token 配置”）

## 代理可靠性评估（技能）

我们已经有一些 CI 安全的测试，行为类似“代理可靠性评估”：

- 通过真实网关 + 代理循环进行模拟工具调用（`src/gateway/gateway.test.ts`）。
- 端到端向导流程，验证会话连接和配置效果（`src/gateway/gateway.test.ts`）。

技能评估仍缺少的是（见 [技能](/tools/skills)）：

- **决策能力**：当提示中列出技能时，代理能否选择正确的技能（或避免无关的技能）？
- **合规性**：代理是否会在使用前阅读 `SKILL.md` 并遵守所需步骤/参数？
- **工作流约定**：多轮场景，断言工具调用顺序、会话历史传递和沙箱边界。

未来评估应优先保持确定性：

- 使用模拟提供者的场景运行器，断言工具调用及顺序、技能文件读取和会话连接。
- 一小套以技能为中心的场景（使用 vs 避免、门控、提示注入）。
- 可选的实况评估（需选择加入、环境变量限制），仅在 CI 安全套件就绪后启用。

## 契约测试（插件和频道结构）

契约测试验证每个注册的插件和频道是否符合其接口契约。它们迭代所有发现的插件并运行一系列结构和行为断言。默认 `pnpm test` 单元通道故意跳过这些共享集成点和冒烟文件；当你触及共享频道或提供者表面时，请显式运行契约命令。

### 命令

- 所有契约：`pnpm test:contracts`
- 仅频道契约：`pnpm test:contracts:channels`
- 仅提供者契约：`pnpm test:contracts:plugins`

### 频道契约

位于 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - 基本插件结构（id、name、capabilities）
- **setup** - 设置向导契约
- **session-binding** - 会话绑定行为
- **outbound-payload** - 消息负载结构
- **inbound** - 入站消息处理
- **actions** - 频道操作处理程序
- **threading** - 线程 ID 处理
- **directory** - 目录/名册 API
- **group-policy** - 组策略执行

### 提供者状态契约

位于 `src/plugins/contracts/*.contract.test.ts`。

- **status** - 频道状态探测
- **registry** - 插件注册表结构

### 提供者契约

位于 `src/plugins/contracts/*.contract.test.ts`：

- **auth** - 认证流程契约
- **auth-choice** - 认证选择/筛选
- **catalog** - 模型目录 API
- **discovery** - 插件发现
- **loader** - 插件加载
- **runtime** - 提供者运行时
- **shape** - 插件结构/接口
- **wizard** - 设置向导

### 何时运行

- 修改 plugin-sdk 导出或子路径后
- 添加或修改频道或提供者插件后
- 重构插件注册或发现后

契约测试在 CI 中运行，不需要真实的 API 密钥。

## 添加回归测试（指南）

当你修复了在实况测试中发现的提供者/模型问题时：

- 如果可能，添加一个 CI 安全的回归测试（模拟/存根提供者，或捕获精确的请求形状转换）
- 如果本质上只能在线上运行（速率限制、认证策略），请将线上测试保持在较小范围，并通过环境变量选择加入
- 优先针对能捕获该 bug 的最小层级：
  - 提供者请求转换/回放 bug → 直接模型测试
  - 网关会话/历史/工具管道 bug → 网关实况冒烟测试或 CI 安全的网关模拟测试
- SecretRef 遍历防护：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 会从注册表元数据（`listSecretTargetRegistryEntries()`）中为每个 SecretRef 类派生一个采样目标，然后断言会拒绝跨越分段的 exec id。
  - 如果你在 `src/secrets/target-registry-data.ts` 中添加了新的 `includeInPlan` SecretRef 目标家族，请更新该测试中的 `classifyTargetClass`。该测试会故意在未分类的目标 id 上失败，因此新的类不会被悄悄跳过。

## 相关

- [测试实况](/help/testing-live)
- [CI](/ci)
