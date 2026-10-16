---
summary: "qa-lab 命令界面、共享 Convex 凭证以及向 QA 添加通道"
title: "QA-专用跑步者"
read_when:
  - "您正在运行 QA 实验室或实时传输通道"
  - "您需要共享的 QA 凭证合约"
---

## <a id="qa-specific-runners"></a> QA-特定跑步者

当您需要 QA-lab 真实性时，这些命令位于主测试套件旁边。

CI 在专用工作流程中运行 QA 实验室。代理奇偶校验嵌套在 `QA-Lab - All Lanes` 和发布验证下，而不是独立的 PR 工作流程。广泛验证应使用 `Full Release Validation` 和 `rerun_group=qa-parity` 进行奇偶校验，或使用 `rerun_group=qa-live` 进行实时 QA。直接 `OpenClaw Release Checks` 子项可以单独使用 `rerun_group=qa` 作为两个组的手动聚合。 Stable/full、启用浸泡和显式 `qa-live` 发布检查包括 QA-live Matrix 和 Telegram 通道。有界测试发布 `all` 没有浸泡运行平价，但将这些实时通道推迟到发布后信心。 `QA-Lab - All Lanes` 每晚在 `main` 上运行，并通过手动调度与模拟奇偶校验通道、实时 Matrix 通道、Convex 管理的实时 Telegram 通道和 Convex 管理的实时 Discord 通道作为并行作业运行。计划的 QA 和选定的版本检查通过共享实时适配器运行目录派生的 Matrix 选择。发布传输检查使用 `mock-openai/gpt-5.6-luna`，因此它们使用固定响应并避免正常的提供程序插件启动。这些实时传输网关禁用内存搜索； QA 奇偶校验套件仍然涵盖内存行为。

完整版本的直播媒体分片使用 `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`，其中已有 `ffmpeg` 和 `ffprobe`。 Docker 实时 model/backend 分片使用每个选定提交构建一次的共享 `ghcr.io/openclaw/openclaw-live-test:<sha>` 映像，然后使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 拉取它，而不是在每个分片内重建。

- `pnpm openclaw qa suite`
  - 直接在主机上运行由仓库支持的 QA 场景。
  - 针对所选场景集写入顶层的 `qa-evidence.json`、`qa-suite-summary.json` 和 `qa-suite-report.md` artifact，其中包括混合流程、Vitest 和 Playwright 场景选择。
  - 通过 `pnpm openclaw qa run --qa-profile <profile>` 调度时，会将所选 taxonomy 配置的计分卡嵌入同一个 `qa-evidence.json`。`smoke-ci` 会写入精简证据（`evidenceMode: "slim"`，不包含每个条目的 `execution`）。`release` 覆盖经过筛选的发布就绪切片；`all` 会选择每个活跃成熟度类别，并在需要完整计分卡 artifact 时指向明确的 QA Profile Evidence 工作流调度。
  - 默认情况下与隔离网关工作线程并行运行多个选定场景。 `qa-channel` 默认为并发 4（受所选场景计数限制）。使用 `--concurrency <count>` 调整工作线程数量，或使用 `--concurrency 1` 调整旧串行通道。每个工作线程都拥有一个稳定的命名配置文件以及单独的主路径、状态路径和配置路径，因此其 CLI 引导程序无法选择运营商安装的网关服务。父配置文件和运行时环境补丁不会覆盖该工作人员身份。子临时文件和默认编译器缓存保留在工作线程的临时根中，并在其进程停止后被删除。父临时路径和运行时环境补丁不会重定向此临时存储。 `OPENCLAW_QA_KEEP_TEMP=1` 保留该根用于调试。如果控制器死亡，当前网关的父看门狗将退出，而不删除后代可能仍使用的运行时文件。幸存的所有者或主机维护人员必须确认这些编写器在删除保留的根之前已停止。
  - 任一场景失败时以非零状态退出。使用 `--allow-failures` 可生成 artifact，但不以失败状态退出。
  - 支持 `live-frontier`、`mock-openai` 和 `aimock` provider 模式。`aimock` 会启动一个由本地 AIMock 支持的 provider server，用于实验性 fixture 和协议 mock 覆盖，但不会取代面向场景的 `mock-openai` lane。
- `pnpm openclaw qa coverage --match <query>`
  - 搜索场景 ID、标题、表面、覆盖范围 ID、文档参考、代码参考、插件和提供程序要求，然后打印匹配的套件目标。
  - 当你知道变更涉及的行为或文件路径，但不知道最小场景时，在运行 QA Lab 前使用此命令。它仅提供建议——仍应根据所变更的行为选择 mock、live、Multipass、Matrix 或传输证明。
- `pnpm test:plugins:kitchen-sink-live`
  - 通过 QA 实验室运行实时 OpenAI 厨房水槽插件挑战。安装外部厨房水槽包，验证插件 SDK 表面库存，检查 `/healthz` 和 `/readyz`，记录网关 CPU/RSS 证据，运行实时 OpenAI 转弯，并检查对抗性诊断。需要实时 OpenAI 身份验证，例如 `OPENAI_API_KEY`。在水合 Testbox 会话中，当 `openclaw-testbox-env` 帮助程序存在时，它会自动获取 Testbox 实时身份验证配置文件。该助手用于实时车道；非实时 Vitest 工作人员会删除凭证环境变量。 Wrapper Testbox 从流输出中运行编辑水合配置文件值，这也会清除 Crabbox 故障包。直接运行 `crabbox` 或 `blacksmith testbox` 并且下载的工件不会进行流编辑； Vitest 报告通过编辑记者。
- `pnpm test:gateway:cpu-scenarios`
  - 运行 gateway 启动基准测试以及一小组 mock QA Lab 场景包（`channel-chat-baseline`、`memory-failure-fallback`、`gateway-restart-inflight-run`），并将合并后的 CPU 观测摘要写入 `.artifacts/gateway-cpu-scenarios/`。
  - 默认只标记持续的高 CPU 观测（`--cpu-core-warn` 默认值为 `0.9`；`--hot-wall-warn-ms` 默认值为 `30000`），因此短暂的启动峰值会作为指标记录，而不会被误判为持续数分钟的 gateway 占用异常。
  - 针对已构建的 `dist` artifact 运行；当检出内容中没有最新运行时输出时，请先执行构建。
- `pnpm openclaw qa suite --runner multipass`
  - 在一次性 Multipass Linux VM 内运行相同的 QA 套件，保持与 `qa suite` 相同的场景选择和 provider/model 标记。
  - live 运行会将适用于 guest 的 QA 身份验证输入转发过去：基于环境变量的 provider key、QA live provider 配置路径，以及存在时的 `CODEX_HOME`。
  - 输出目录必须位于仓库根目录下，以便 guest 通过挂载的工作区写回文件。
  - 除常规 QA 报告和摘要外，还会将 Multipass 日志写入 `.artifacts/qa-e2e/...`。
- `pnpm qa:lab:up`
  - 启动 Docker- 支持的 QA 站点，以进行操作员式 QA 工作。
- `pnpm test:docker:npm-onboard-channel-agent`
  - 从当前签出构建 npm tarball，将其全局安装在 Docker 中，运行非交互式 OpenAI API-key 载入，默认配置 Telegram，验证打包的插件运行时加载而无需启动依赖项修复，运行 doctor，并运行一个本地代理针对模拟的 OpenAI 端点进行攻击。
  - 使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 可使用 Discord 运行相同的打包安装 lane。
- `pnpm test:docker:session-runtime-context`
  - 对嵌入式运行时上下文脚本运行可重复的内置应用程序 Docker 烟雾检查。验证隐藏的 OpenClaw 运行时上下文是否保留为非显示自定义消息，而不是泄漏到可见的用户轮次中，然后为受影响的损坏会话 JSONL 播种并验证 `openclaw doctor --fix` 使用备份将其重写到活动分支。
- `pnpm test:docker:npm-telegram-live`
  - 在 Docker 中安装 OpenClaw 候选软件包，运行已安装软件包载入，通过已安装的 CLI 配置 Telegram，然后将已安装软件包重用为实时 Telegram QA 通道SUT 网关。
  - 受信任的检出内容负责 QA harness 源码、taxonomy、场景、依赖项和私有 SDK 构建。已安装的软件包仍是测试中的绝对 CLI、Gateway 和捆绑插件运行时，其 CLI 会写入候选软件包持久化的身份验证状态。
  - 默认使用 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@beta`；设置 `OPENCLAW_NPM_TELEGRAM_PACKAGE_TGZ=/path/to/openclaw-current.tgz` 或 `OPENCLAW_CURRENT_PACKAGE_TGZ`，即可测试解析后的本地 tarball，而不是从 registry 安装。
  - E 默认情况下使用 `OPENCLAW_NPM_TELEGRAM_RTT_SAMPLES=20` 在 `qa-evidence.json` 中重复 RTT 时序。覆盖 `OPENCLAW_NPM_TELEGRAM_RTT_SAMPLES`、`OPENCLAW_NPM_TELEGRAM_RTT_TIMEOUT_MS` 或 `OPENCLAW_NPM_TELEGRAM_RTT_MAX_FAILURES` 来调整运行。 `OPENCLAW_NPM_TELEGRAM_RTT_CHECKS` 接受零个或正好一个已注册的 Telegram QA 场景 ID。省略时，正常泳道样本`channel-canary`；重点非 RTT 场景运行保持免检查。场景选择中会自动包含显式的 RTT 场景，因此调用者无需在 `OPENCLAW_NPM_TELEGRAM_SCENARIOS` 中重复该场景。多个 id 立即失败，而未知或不适用的 id 则无法通过共享场景验证。包运行程序将选定的 RTT 场景一次提升到第一个位置，然后再进行剩余的分类支持的快速失败发布场景。使用租用的主要参与者，在最近观察到的对话和线程中继续进行检查。第一个样本开始一条新消息；后面的样本会链接自己的回复，而不是其他场景参与者观察到的回复。仅交付场景使用其观察到的出站路由，不需要额外的目录元数据。
  - 使用与 `pnpm openclaw qa telegram` 相同的凸面租赁测试服务器用户机器人凭据。设置 `OPENCLAW_QA_CONVEX_SITE_URL` 和所选角色的秘密。 Docker 包装器默认选择凸面。
  - 包装器在 Docker build/install 工作之前验证主机上的 Convex 凭证 env。仅当有意调试预凭证设置时才设置 `OPENCLAW_NPM_TELEGRAM_SKIP_CREDENTIAL_PREFLIGHT=1`。
  - `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci|maintainer` 仅覆盖此通道的共享 `OPENCLAW_QA_CREDENTIAL_ROLE`。在没有角色的情况下，包装器在 CI 中使用 `ci`，在 CI 外部使用 `maintainer`。
  - GitHub Actions 将此通道公开为手动维护人员工作流程 `NPM Telegram Beta E2E`。它不在合并时运行。该工作流使用 `qa-live-shared` 环境和 Convex CI 凭证租赁。设置其可选的 `rtt_scenario` 输入以选择重复的 RTT 场景，或者将其留空以实现上述默认行为。启用`allow_older_binary_destructive_actions`仅用于故意历史降级或恢复证明；默认情况下它仍然是 false。
- GitHub Actions 还公开了 `Package Acceptance`，用于针对一个候选包进行旁路产品证明。它接受 Git 引用、已发布的 npm 规范、HTTPS tarball URL 加上 SHA-256、可信 URL 策略或来自另一次运行 （`source=ref|npm|url|trusted-url|artifact`） 的 tarball 工件，将规范化的 `openclaw-current.tgz` 上传为`package-under-test`，然后使用 `smoke`、`package`、`product`、`full` 或 `custom` 通道配置文件运行现有的 Docker E2E 调度程序。设置 `telegram_mode=mock-openai` 或 `live-frontier` 以针对同一 `package-under-test` 工件运行 Telegram QA 工作流。
  - 对于已发布的驱动程序更新中的旧版 Telegram 主题绑定，请选择 `suite_profile=telegram`、`telegram_mode=mock-openai` 和单一场景 `telegram-published-upgrade-bindings`。提供 `package_spec` 作为精确发布的基线，例如 `openclaw@2026.9.6`，并通过 `source=ref` 或经过验证的 tarball 工件解析候选值。此场景在租用测试服务器凭据之前安装基线，让它生成一个接管论坛主题的线程绑定子项，并针对候选者运行该安装的正常 `openclaw update`。它检查激活后主题是否路由回父会话，并且另一个网关重新启动，同时子会话保持不变，包括所有三个有序关闭。原始凭证、会话和传输状态保留在容器中；上传的证据仅包含包裹身份和经过编辑的结果。
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

- Enterprise/private tarball 镜像使用显式可信源策略：

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
  - 打包并安装Docker中的当前OpenClaw构建，启动配置了OpenAI的网关，然后通过配置编辑启用捆绑的channel/plugins。
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
  - 更新后的证明运行正常的捆绑插件表面，因为语音、图像生成和媒体理解等功能外观通过捆绑运行时 API 加载，即使代理本身只检查简单的文本响应。

- `pnpm openclaw qa aimock`
  - 仅启动本地 AIMock provider server，用于直接协议 smoke 测试。
- `pnpm openclaw qa buzz`
  - 使用专用驱动程序和 SUT 身份针对真实中继室运行 Buzz Live QA 通道。
  - 本地运行使用 `--credential-file <path>`，其中包含 `relayUrl`、`roomId`、`driverPrivateKey` 和 `sutPrivateKey`。封闭 relay 可能还需要 `driverAuthTag` 和 `sutAuthTag`。托管 relay 要求使用 `wss://`；仅用于回环开发 relay 时才接受 `ws://`。
  - 默认使用 `mock-openai`，并通过真实 Buzz 插件路径运行 canary 和 mention-gating 场景。
  - 通过池化 `kind: "buzz"` 行支持 `--credential-source convex`。两个公钥都必须是 relay/room 成员，并且 SUT 必须具有 **Bot** 房间角色。切勿使用人类所有者或管理员私钥。
- `pnpm openclaw qa matrix`
  - 针对一次性 Docker- 支持的 Tuwunel 家庭服务器运行 Matrix 实时 QA 通道。仅源签出 - 打包安装不提供 `qa-lab`。
  - 完整的CLI、profile/scenario目录、环境变量和工件布局：[矩阵烟雾通道](/concepts/qa-e2e-automation#matrix-live-lane)。
- `pnpm openclaw qa telegram`
  - 在 Telegram 的测试服务器上运行 Telegram 实时 QA 通道，其中包含一个凸租用的 SUT 机器人和一个独立的 TDLib 用户会话。
  - 默认使用 `--credential-source convex` 并拒绝 `env`。提供 `OPENCLAW_QA_CONVEX_SITE_URL` 和所选 `--credential-role` 的密码。
  - 默认涵盖金丝雀、提及门控、命令寻址、`/status`、机器人到机器人提到的回复以及核心本机命令回复。 `mock-openai` 默认值还涵盖固定响应回复链和 Telegram 最终消息流回归。使用 `--list-scenarios` 进行可选检查，例如 `session_status`。
  - 任一场景失败时以非零状态退出。使用 `--allow-failures` 可生成 artifact，但不以失败状态退出。
  - 租用用户驱动并观察共享测试服务器组。不使用生产 Telegram 帐户或机器人观察者。
  - 在`.artifacts/qa-e2e/...`下编写Telegram QA报告、摘要和`qa-evidence.json`。回复场景包括从驱动程序发送请求到观察到的 SUT 回复的 RTT。

实时传输通道共享一份标准合同，因此新传输不会漂移；每车道覆盖矩阵位于 [QA 概述 - 实时交通覆盖](/concepts/qa-e2e-automation#buzz%2C-discord%2C-slack%2C-telegram%2C-and-whatsapp-qa-reference) 中。 `qa-channel` 是广泛的合成套件，不是该矩阵的一部分。

### <a id="shared-telegram-credentials-via-convex-(v1)"></a><a id="shared-telegram-credentials-via-convex-v1"></a> 通过 Convex 共享 Telegram 凭证（v1）

当为实时传输 `--credential-source convex`（或 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）启用 QA 时，QA 实验室从 Convex 支持的池获取独占租约，在通道运行时对该租约进行检测，并在关闭时释放租约。 Telegram 始终使用此源。该部分名称早于 Buzz、Discord、Slack 和 WhatsApp 支持；租赁合同是跨种类共享的。

Convex 项目参考脚手架：`qa/convex-credential-broker/`

必需环境变量：

- `OPENCLAW_QA_CONVEX_SITE_URL`（例如 `https://your-deployment.convex.site`）
- 针对所选角色的一个密钥：
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 对应 `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` 对应 `ci`
- 凭证角色选择：
  - CLI: `--credential-role maintainer|ci`
  - 环境默认值：`OPENCLAW_QA_CREDENTIAL_ROLE`（CI 中默认为 `ci`，否则默认为 `maintainer`）

可选环境变量：

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS`（默认 `1200000`）
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS`（默认 `30000`）
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS`（默认 `90000`）
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS`（默认 `15000`）
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX`（默认 `/qa-credentials/v1`）
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID`（可选跟踪 ID）
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` 允许环回 `http://` 凸 URL，用于仅限本地开发。

`OPENCLAW_QA_CONVEX_SITE_URL` 在正常运行中应使用 `https://`。

维护者管理命令（pool add/remove/list）需要 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`。

面向维护者的 CLI 辅助命令：

```bash
pnpm openclaw qa credentials doctor
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

在实时运行前先使用 `doctor` 检查 Convex site URL、broker 密钥、 endpoint prefix、HTTP timeout 以及 admin/list 可达性，而不会打印密钥值。脚本和 CI 工具中可使用 `--json` 以获得机器可读输出。

默认端点契约（`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`）。 请求通过 `Authorization: Bearer <role secret>` 请求头进行身份验证； 以下请求体省略该请求头：

- `POST /acquire`
  - 请求：`{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - 成功：`{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - Exhausted/retryable: `{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
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

经 broker 验证的多通道 payload：

- Buzz：`{ relayUrl: string, roomId: string, driverPrivateKey: string, sutPrivateKey: string, driverAuthTag?: string, sutAuthTag?: string }`
- Discord: `{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string, voiceChannelId?: string }`
- WhatsApp: `{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }`

Slack 通道也可以从凭证池中获取租约，但 Slack payload 的校验目前由 Slack QA runner 执行，而不是由 broker 执行。Slack 条目请使用 `{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`。

### <a id="adding-a-channel-to-qa"></a> 向 QA 添加一个 channel

新通道适配器的架构和场景帮助程序名称位于 [QA 概述 - 添加通道](/concepts/qa-e2e-automation#adding-a-channel) 中。最低标准：在共享 `qa-lab` 主机 API 上实现传输运行器，为共享场景添加 `adapterFactory`，在插件清单中声明 `qaRunners`，挂载为 `openclaw qa <runner>`，并在 `qa/scenarios/` 下编写场景。
