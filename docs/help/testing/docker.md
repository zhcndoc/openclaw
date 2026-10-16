---
summary: "Docker 在 Linux 运行程序中工作，其调度程序、通道和环境变量"
title: "Docker 测试运行者"
read_when:
  - "您正在运行 Docker 测试通道"
  - "您需要 Docker 通道名称或环境变量"
---

## <a id="docker-runners-(optional-%22works-in-linux%22-checks)"></a><a id="docker-runners-optional-works-in-linux-checks"></a> Docker 运行器（可选的“在 Linux 上可用”检查）

这些 Docker 运行器分成两类：

- Live-model 运行器：`test:docker:live-models` 和 `test:docker:live-gateway` 只会在仓库 Docker 镜像中运行与其匹配的 profile-key live 文件（`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`），并挂载本地配置目录、工作区以及可选的 profile 环境变量文件。对应的本地入口点是 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker live 运行器会在需要时保留各自的实际限制： `test:docker:live-models` 默认使用精选的高信号支持集合，而 `test:docker:live-gateway` 默认使用 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`、 `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`、 `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` 和 `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。当你明确需要更小的限制或更大范围的扫描时，可设置 `OPENCLAW_LIVE_MAX_MODELS` 或 gateway 环境变量。
- `test:docker:all` 通过 `test:docker:live-build` 构建一次实时 Docker 映像，通过 `scripts/package-openclaw-for-docker.mjs` 将 OpenClaw 打包为 npm tarball，然后将 builds/reuses 打包两次`scripts/e2e/Dockerfile` 图像。裸图仅是 install/update/plugin-dependency 通道的 Node/Git 跑步者；这些通道安装了预构建的 tarball。功能映像将相同的 tarball 安装到 `/app` 中，以用于内置应用程序功能通道。 Docker 车道定义位于 `scripts/lib/docker-e2e-scenarios.mts` 中；规划器逻辑位于 `scripts/lib/docker-e2e-plan.mts` 中； `scripts/test-docker-all.mjs` 执行选定的计划。聚合使用加权本地调度程序：`OPENCLAW_DOCKER_ALL_PARALLELISM` 控制进程槽，而资源上限保持重活，npm- 安装和多服务通道同时启动。如果单个通道比活动上限重，调度程序仍然可以在池空时启动它，然后保持它单独运行，直到容量再次可用。默认为 10 个插槽，`OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=5` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；仅当 Docker 主机有更多余量时才调整 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`（以及其他 `OPENCLAW_DOCKER_ALL_<RESOURCE>_LIMIT` 覆盖）。跑步者默认执行 Docker 预检，删除陈旧的 OpenClaw E2E 容器，每 30 秒打印一次状态，将成功的车道计时存储在 `.artifacts/docker-tests/lane-timings.json` 中，并使用这些计时在以后的运行中首先启动更长的车道。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 打印加权通道清单，无需构建或运行 Docker，或使用 `node scripts/test-docker-all.mjs --plan-json` 打印选定通道的 CI 计划、package/image 需求和凭证。
- `Package Acceptance` 是 GitHub-native 包入口，用于“这个可安装的 tarball 可以作为产品使用吗？”它解析 `source=npm`、`source=ref`、`source=url`、`source=trusted-url` 或 `source=artifact` 中的一个候选包，将其上传为 `package-under-test`，然后针对该确切通道运行可重用的 Docker E2E 通道tarball 而不是重新打包选定的参考。配置文件按宽度排序：`smoke`、`package`、`product` 和 `full`（加上 `custom` 以获得显式通道列表）。请参阅 [ 测试更新和插件](/help/testing-updates-plugins)，了解 package/update/plugin 合约、已发布的升级幸存者矩阵、发布默认值和故障分类。
- Build 和发布检查在 tsdown 之后运行 `scripts/check-cli-bootstrap-imports.mts`。如果预调度引导图在命令调度之前静态导入任何外部包（Commander、提示符 UI、undici、日志记录和类似的启动繁重的 deps），则守卫会从 `dist/entry.js` 和 `dist/cli/run-main.js` 遍历静态构建的图，并且会失败；它还将捆绑网关运行块限制为 70 KB，并拒绝已知冷网关路径的静态导入（`control-ui-assets`、`diagnostic-stability-bundle`、`onboard-helpers`、`process-respawn`、`restart-sentinel`、`server-close`、 `server-reload-handlers`） 来自该块。当前版本通过 tsdown 发出的经过哈希检查的元数据来定位网关块，因此发现不会扫描 `dist` 下不相关的 JavaScript。丢失或陈旧的元数据需要重建；可信发布工具仅保留对定位器之前的冻结目标的源扫描。独立工作线程仍会收到独立的 JavaScript 依赖性检查。 `scripts/release-check.ts`分别对包装好的CLI和`--help`、`onboard --help`、`doctor --help`、`status --json --timeout 1`、`config schema`和`models list --provider openai`进行冒烟测试。
- Package Acceptance 强制执行当前包元数据和持久性契约。 2026 年 6 月之前警告和跳过路径已停用；使用匹配的历史工具来重现那些旧候选人的接受结果。
- 容器 smoke 运行器：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:npm-onboard-channel-agent`、`test:docker:release-user-journey`、`test:docker:release-typed-onboarding`、`test:docker:release-media-memory`、`test:docker:release-upgrade-user-journey`、`test:docker:release-plugin-marketplace`、`test:docker:skill-install`、`test:docker:update-channel-switch`、`test:docker:upgrade-survivor`、`test:docker:published-upgrade-survivor`、`test:docker:session-runtime-context`、`test:docker:agents-delete-shared-workspace`、`test:docker:gateway-network`、`test:docker:browser-cdp-snapshot`、`test:docker:mcp-channels`、`test:docker:agent-bundle-mcp-tools`、`test:docker:cron-mcp-cleanup`、`test:docker:plugins`、`test:docker:plugin-update`、`test:docker:plugin-lifecycle-matrix` 和 `test:docker:config-reload` 会启动一个或多个真实容器，并验证更高层级的集成路径。
- Docker/Bash E2E 通道，通过 `scripts/lib/openclaw-e2e-instance.sh` 帽 `npm install` 在 `OPENCLAW_E2E_NPM_INSTALL_TIMEOUT` 安装打包的 OpenClaw tarball（默认 `600s`；设置 `0` 以禁用用于调试的包装器）。
- `update-channel-switch` 给它的两个通道切换 `openclaw update` 运行 `OPENCLAW_E2E_GIT_CHANNEL_TIMEOUT` （默认 `900s`），因为它们安装依赖项并交换容器内的包；其他 CLI 调用保留 `OPENCLAW_E2E_COMMAND_TIMEOUT` 默认值 `300s`。

实时模型 Docker 运行器还仅绑定安装所需的 CLI 身份验证主目录（或在运行未缩小范围时所有受支持的身份验证主目录），然后在运行之前将它们复制到容器主目录中，以便 external-CLI OAuth 可以刷新令牌而无需更改主机身份验证存储：

- 直接模型：`pnpm test:docker:live-models`（脚本：`scripts/test-live-models-docker.sh`）
- ACP 绑定烟雾：`pnpm test:docker:live-acp-bind`（脚本：`scripts/test-live-acp-bind-docker.sh`；默认覆盖 Claude、Codex 和 Gemini，通过 `pnpm test:docker:live-acp-bind:droid` 严格覆盖 Droid/OpenCode和 `pnpm test:docker:live-acp-bind:opencode`）
- CLI 后端烟雾：`pnpm test:docker:live-cli-backend`（脚本：`scripts/test-live-cli-backend-docker.sh`）
- Codex 应用程序服务器harness烟雾：`pnpm test:docker:live-codex-harness`（脚本：`scripts/test-live-codex-harness-docker.sh`）
- Gateway + 开发代理：`pnpm test:docker:live-gateway`（脚本：`scripts/test-live-gateway-models-docker.sh`）
- Observability 冒烟：`pnpm qa:otel:smoke`、`pnpm qa:prometheus:smoke` 和 `pnpm qa:observability:smoke` 是私有 QA 源结帐通道。它们故意不属于软件包 Docker 发布通道，因为 npm tarball 省略了 QA Lab。
- 打开WebUI直播烟雾：`pnpm test:docker:openwebui`（脚本：`scripts/e2e/openwebui-docker.sh`）
- 载入向导（TTY，完整工作区设置）：`pnpm test:docker:onboard`（脚本：`scripts/e2e/onboard-docker.sh`）
- Npm tarball onboarding/channel/agent Smoke：`pnpm test:docker:npm-onboard-channel-agent` 在 Docker 中全局安装打包的 OpenClaw tarball，通过 env-ref onboarding 加上默认的 Telegram 配置 OpenAI，运行 doctor，并运行一个模拟的OpenAI代理转。通过 `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 重用预构建的 tarball，通过 `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0` 跳过主机重建，或通过 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 或 `OPENCLAW_NPM_ONBOARD_CHANNEL=slack` 切换通道。

- 释放用户旅程烟雾：`pnpm test:docker:release-user-journey`在干净的Docker主目录中全局安装打包的OpenClaw tarball，运行入门引导，配置模拟的OpenAI提供程序，运行代理轮，installs/uninstalls外部插件，配置ClickClack 针对本地固定装置，验证 outbound/inbound 消息传递，重新启动网关并运行 doctor。
- Release 输入的载入烟雾：`pnpm test:docker:release-typed-onboarding` 安装打包的 tarball，通过真正的 TTY 驱动 `openclaw onboard`，将 OpenAI 配置为 env-ref 提供程序，验证是否没有原始密钥持久性，并运行模拟代理轮次。
- 发布media/memory烟雾：`pnpm test:docker:release-media-memory`安装打包的tarball，验证对PNG附件的图像理解，OpenAI-兼容的图像生成输出，内存搜索调用，以及在网关重新启动时调用生存。
- 发布升级用户旅程烟雾：默认情况下，`pnpm test:docker:release-upgrade-user-journey` 安装早于候选 tarball 的最新发布的稳定基线，在已发布的软件包上加载并安装 CLI 插件，然后替换该软件包并运行记录的 Doctor 迁移步骤。它验证现有插件是否仍然有效，并为 agent/channel 旅程配置候选兼容的模拟 provider/ClickClack 设置。如果不存在较旧的稳定基线，则仅当候选版本已发布且稳定时，它才会重用该版本；否则它会失败并需要明确的基线。使用 `OPENCLAW_RELEASE_UPGRADE_BASELINE_SPEC=openclaw@<version>` 覆盖基线。
- 发布插件市场烟雾：`pnpm test:docker:release-plugin-marketplace`从本地固定装置市场安装，更新已安装的插件，卸载它，并验证插件CLI消失并删除安装元数据。
- Skill install Smoke：`pnpm test:docker:skill-install` 在 Docker 中全局安装打包的 OpenClaw tarball，并在配置中禁用上传的存档安装。由于没有非空 `OPENCLAW_SKILL_INSTALL_E2E_QUERY`、`OPENCLAW_SKILL_INSTALL_E2E_SLUG` 或 `OPENCLAW_SKILL_INSTALL_E2E_PREFERRED_SLUG` 覆盖，它会解析实时搜索中维护的 `@steipete/gifgrep` 固定装置，安装版本 `1.0.1`，并验证其审查的 `SKILL.md` 字节以及确切的 owner/version `.clawhub` origin/lock 元数据。安全拒绝是终局；烟雾不运行技能或安装其可选工具。任何非空覆盖都会保留自定义选择和现有的安全检查后备行为，而无需维护固定装置引脚。
- 更新通道切换烟雾：`pnpm test:docker:update-channel-switch`在Docker中全局安装打包的OpenClaw tarball，从包`stable`切换到git `dev`，验证持久通道和插件更新后工作，然后切换回包`stable`和检查更新状态。
- 升级幸存者烟雾：`pnpm test:docker:upgrade-survivor`将打包的OpenClaw tarball安装在肮脏的旧用户固定装置上，其中包含代理、通道配置、插件白名单、过时的插件依赖状态和现有的workspace/session文件。它运行包更新以及没有实时提供商或频道密钥的非交互式医生，然后启动环回网关并检查 config/state 保留以及 startup/status 预算。
- 发布的升级幸存者烟雾：`pnpm test:docker:published-upgrade-survivor`默认安装`openclaw@latest`，播种现实的现有用户文件，使用烘焙命令配方配置该基线，验证生成的配置，更新已发布的安装到候选tarball，运行非交互式医生，写入`.artifacts/upgrade-survivor/summary.json`，然后启动环回网关并检查配置的意图，状态保存，启动， `/healthz`、`/readyz` 和 RPC 状态预算。使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 覆盖一条基线，要求聚合调度程序使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` 扩展精确的本地基线，例如 `openclaw@2026.6.1 openclaw@2026.7.1 openclaw@2026.9.5`，并使用 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` 扩展问题形状的固定装置，例如 `reported-issues`；报告的问题集包括用于自动外部 OpenClaw 插件安装修复的 `configured-plugin-installs`。包验收将这些内容公开为 `published_upgrade_survivor_baseline`、`published_upgrade_survivor_baselines` 和 `published_upgrade_survivor_scenarios`，解析元基线标记（例如 `last-stable-4` 或 `all-since-2026.6.1`），完整版本验证根据最新的稳定基线运行所有 `reported-issues` 场景，在扇出之前解析为精确的包。历史矩阵仍然是明确的手动覆盖。

  成功的已发布升级运行还包括 Docker 工件中的主机编辑的 `summary.json`。收据将初始更新输出及其核心后观察与修复和恢复输出分开。最初的岩心后证据缺失仍然未知；通过的场景可以包括能力同意恢复。

  当已发布的更新程序支持无效配置准入时，手动 `base` 运行还会执行已删除的自定义插件路径。较旧的驱动程序，包括 `2026.7.2-beta.5` 之前的版本和 7 月延长稳定线，保留该装置为非种子并记录其未执行的原因；正常的更新、迁移、状态和就绪断言仍然运行。显式 `missing-load-path` 场景需要兼容的基线。在夹具播种之前，会根据已安装的版本再次检查浮动基线标签。请参阅 [ 更新准入 ](/cli/update#candidate-owned-admission) 了解已发布的驱动程序限制。

- Session 运行时上下文烟雾：`pnpm test:docker:session-runtime-context` 验证隐藏的运行时上下文副本持久性、受影响的重复提示重写分支的医生修复，以及通过运行已安装软件包的真实网关自动副本冷存储。小型、过时的综合历史记录需要维护人员的锻炼，无需重新启动网关即可对 `session.maintenance.coldStorage.afterDays` 进行更改，精确的转录恢复，丢失存档文件的显式错误，无需补水的活动列表，以及跨重新启动和便携式备份恢复的历史记录保存。
- Bun全局安装和运行时烟雾：`bash scripts/e2e/bun-global-install-smoke.sh`打包当前树，安装它`bun install -g --trust`在一个孤立的家里，验证OpenClaw的生命周期脚本运行，并执行已安装的包Bun 1.4.3或更新的。它检查代表CLI状态、捆绑图像提供程序、模拟的本地代理轮转、网关准备情况和运行状况以及模拟的代理轮流Bun-托管网关。重用预构建的 tarball`OPENCLAW_BUN_GLOBAL_SMOKE_PACKAGE_TGZ=/path/to/openclaw-*.tgz`，跳过主机构建`OPENCLAW_BUN_GLOBAL_SMOKE_HOST_BUILD=0`，或复制`dist/`从建成的Docker图像与`OPENCLAW_BUN_GLOBAL_SMOKE_DIST_IMAGE=openclaw-dockerfile-smoke:local`。
- Bun-only 运行时烟雾 （Linux x64）：使用 `OPENCLAW_BUN_ONLY_SMOKE_PACKAGE_TGZ=/path/to/openclaw-candidate.tgz`、`BUN_BIN=/path/to/pinned-fork/bun`（固定在 `.github/actions/setup-test-bun/action.yml` 中的叉子）和 `OPENCLAW_BUN_ONLY_SMOKE_ARTIFACT_DIR=/path/to/artifacts` 运行 `bash scripts/e2e/bun-only-runtime-smoke.sh`。将 `OPENCLAW_BUN_ONLY_SMOKE_HIDE_SYSTEM_NODE=1` 设置为掩码系统 Node，并在烟雾的私有挂载命名空间内记录哨兵；这需要无密码 `sudo`、`unshare` 和 `setpriv`。它仅影响烟雾的进程树，使主机 Node 保持不变，并在运行该工具之前返回到调用用户。 Node必须在冒烟前做好有效载荷的准备。然后，该harness使用记录的 Bun 启动器标记进行一次 Node- 免费安装尝试；安装失败会导致通道失败，而无需使用 Node 重试。如果没有该标志，如果真实的 Node 仍然可达，则运行时前提条件将失败。
- Installer Docker 烟雾：`bash scripts/test-install-sh-docker.sh` 在其根、更新和直接 npm 容器之间共享一个 npm 缓存。在升级到候选 tarball 之前，将 Smoke 默认更新为 npm `latest` 作为稳定基线。在本地使用 `OPENCLAW_INSTALL_SMOKE_UPDATE_BASELINE=2026.9.5` 进行覆盖，或者使用 GitHub 上的安装烟雾工作流程的 `update_baseline_version` 输入进行覆盖。非 root 安装程序检查保留隔离的 npm 缓存，因此 root 拥有的缓存条目不会掩盖用户本地安装行为。设置 `OPENCLAW_INSTALL_SMOKE_NPM_CACHE_DIR=/path/to/cache` 以在本地重新运行时重用 root/update/direct-npm 缓存。
- Install Smoke CI 跳过与 `OPENCLAW_INSTALL_SMOKE_SKIP_NPM_GLOBAL=1` 重复的直接 npm 全局更新；当需要直接覆盖 `npm install -g` 时，在没有该环境的情况下在本地运行脚本。
- Agents 删除共享工作区 CLI 烟雾：`pnpm test:docker:agents-delete-shared-workspace`（脚本：`scripts/e2e/agents-delete-shared-workspace-docker.sh`）默认构建根 Dockerfile 映像，在隔离的容器主目录中为两个代理和一个工作区播种，运行 `agents delete --json`，并验证有效的 JSON 以及保留的工作区行为。通过 `OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_IMAGE=openclaw-dockerfile-smoke:local OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_SKIP_BUILD=1` 重新使用 install-smoke 映像。
- 网关网络和主机生命周期：`pnpm test:docker:gateway-network`（脚本：`scripts/e2e/gateway-network-docker.sh`）保留两个容器LAN WebSocket auth/health烟雾，然后使用环回Admin HTTP来证明准备隔离，保留控制访问，恢复恢复和准备好的相同容器 stop/start. 重新启动检查必须在原始租约到期之前完成，验证挂起状态是进程本地的，同时持久网关配置和容器标识仍然存在，并发出机器可读的阶段计时 JSON。
- Browser CDP快照烟雾：`pnpm test:docker:browser-cdp-snapshot`（脚本：`scripts/e2e/browser-cdp-snapshot-docker.sh`）构建源E2E图像加上Chromium层，使用原始CDP启动Chromium，运行`browser doctor --deep`，并验证 CDP 角色快照涵盖链接 URL、光标提升的可点击内容、iframe 引用和框架元数据。
- OpenAI 响应 web_search 最小推理回归：`pnpm test:docker:openai-web-search-minimal`（脚本：`scripts/e2e/openai-web-search-minimal-docker.sh`）通过网关运行模拟的 OpenAI 服务器，验证 `web_search` 从 `reasoning.effort` 引发`minimal` 到 `low`，然后强制提供程序架构拒绝并检查网关日志中显示的原始详细信息。
- OpenAI 聊天工具和存档历史记录调用：`pnpm test:docker:openai-chat-tools` 通过聊天完成端点验证外部工具调用，然后运行一个实时代理轮次，其答案需要来自存档记录的随机数。召回提示省略了随机数，因此响应证明恢复的历史记录到达了提供者。此通道需要 OpenAI API 密钥。
- MCP 通道桥（种子网关 + stdio 桥 + 原始 Claude 通知帧烟雾）：`pnpm test:docker:mcp-channels`（脚本：`scripts/e2e/mcp-channels-docker.sh`）
- OpenClaw 捆绑包 MCP 工具（真实 stdio MCP 服务器 + 嵌入式 OpenClaw 配置文件 allow/deny 烟雾）：`pnpm test:docker:agent-bundle-mcp-tools`（脚本：`scripts/e2e/agent-bundle-mcp-tools-docker.sh`）
- Cron/subagent MCP 清理（独立 cron 和一次性子代理运行后真正的网关 + stdio MCP 子进程拆卸）：`pnpm test:docker:cron-mcp-cleanup`（脚本：`scripts/e2e/cron-mcp-cleanup-docker.sh`）
- Plugins（install/update 本地路径冒烟、`file:`、具有提升依赖项的 npm 注册表、格式错误的 npm 包元数据、git 移动引用、ClawHub 固定装置、市场更新以及Claude-bundle enable/inspect）： `pnpm test:docker:plugins` （脚本： `scripts/e2e/plugins-docker.sh`） 设置 `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` 以跳过 ClawHub 块。默认情况下，它使用密封本地 ClawHub 夹具，即使设置了 ClawHub URL 也是如此。要测试实时 ClawHub 包，请设置 `OPENCLAW_PLUGINS_E2E_LIVE_CLAWHUB=1` 并提供 `OPENCLAW_PLUGINS_E2E_CLAWHUB_SPEC`（例如 `clawhub:publisher/package`）和 `OPENCLAW_PLUGINS_E2E_CLAWHUB_ID`（包的运行时插件 ID）。 Kitchen Sink被退市，不再是现场测试目标；没有这两个值的实时模式设置将以状态 2 退出。
- 插件更新不变烟雾：`pnpm test:docker:plugin-update`（脚本：`scripts/e2e/plugin-update-unchanged-docker.sh`）
- Plugin 生命周期矩阵烟雾：`pnpm test:docker:plugin-lifecycle-matrix` 在裸容器中安装打包的 OpenClaw tarball，安装 npm 插件，切换 enable/disable，通过本地 npm 注册表升级和降级，删除已安装的代码，然后验证卸载是否仍删除记录每个生命周期阶段的 RSS/CPU 指标时的过时状态。
- Config 重新加载元数据烟雾：`pnpm test:docker:config-reload`（脚本：`scripts/e2e/config-reload-source-docker.sh`）

完整发布验证在其稳定和完整 Docker 发布路径配置文件中包括冷存储案例：`session-runtime-context` 属于 `core`，`openai-chat-tools` 属于 `package-update-openai`。两者都使用共享功能映像中安装的候选包。这些有界案例通过检查打包的工作人员、网关配置和历史请求、文件系统恢复以及真正的提供者转向来补充存储单元测试；他们不会在每个版本上重复大型数据库压力活动。

当较新的工具验证了冷存储之前的明确授权的较旧冻结目标时，兼容性预检会将冷子情况记录为不受支持，并且通道会为其报告 **NOT RUN**。原始检查仍在运行，当前目标始终需要冷存储覆盖。

要手动预构建和重用共享功能映像：

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

设置后，特定于套件的图像覆盖（例如 `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE`）仍然会获胜。当 `OPENCLAW_SKIP_DOCKER_BUILD=1` 指向远程共享映像时，如果该映像尚未位于本地，则脚本会拉取该映像。 QR 和安装程序 Docker 测试保留自己的 Dockerfile，因为它们验证 package/install 行为而不是共享的内置应用程序运行时。

实时模型 Docker 运行程序还将当前结帐只读绑定挂载，并将其暂存到容器内的临时工作目录中。这可以使运行时映像保持苗条，同时仍然针对您的确切本地 source/config. 运行 Vitest 暂存步骤会跳过大型仅本地缓存和应用程序构建输出，例如 `.pnpm-store`、`.worktrees`、`__openclaw_vitest__` 和应用程序本地 `.build` 或 Gradle 输出目录，因此 Docker 实时运行不会花费时间分钟复制机器特定的工件。他们还设置了 `OPENCLAW_SKIP_CHANNELS=1`，以便网关实时检查不会启动容器内真正的 Telegram/Discord/etc. 通道工作人员。 `test:docker:live-models` 仍运行 `pnpm test:live`，因此当您需要缩小或排除 Docker 通道中的网关实时覆盖范围时，也请通过 `OPENCLAW_LIVE_GATEWAY_*`。

`test:docker:openwebui` 是一个更高级别的兼容性烟雾：它启动一个 OpenClaw 网关容器，并启用 OpenAI- 兼容的 HTTP 端点，启动针对该网关的固定 Open WebUI 容器，通过 Open WebUI 登录，验证 `/api/models` 公开`openclaw/default`，然后通过打开WebUI的`/api/chat/completions`代理发送真实的聊天请求。为发布路径 CI 检查设置 `OPENWEBUI_SMOKE_MODE=models`，该检查应在 Open WebUI 登录和模型发现后停止，而无需等待实时模型完成。第一次运行可能会明显变慢，因为 Docker 可能需要拉取 Open WebUI 映像，而 Open WebUI 可能需要完成其自己的冷启动设置。该通道需要一个可用的实时模型密钥，通过流程环境、分阶段身份验证配置文件或显式 `OPENCLAW_PROFILE_FILE` 提供。成功的运行会打印一个小的 JSON 有效负载，例如 `{ "ok": true, "model": "openclaw/default", ... }`。

`test:docker:mcp-channels` 使用固定响应，不需要真实的 Telegram、Discord 或 iMessage 帐户。它启动一个种子网关容器，启动第二个容器来生成 `openclaw mcp serve`，然后通过真实的 stdio MCP 桥验证路由对话发现、转录读取、附件元数据、实时事件队列行为、出站发送路由和 Claude-style 通道 + 权限通知。通知检查直接检查原始 stdio MCP 帧，以便烟雾验证桥实际发出的内容，而不仅仅是特定客户端 SDK 碰巧出现的内容。

`test:docker:agent-bundle-mcp-tools` 使用固定响应，不需要实时模型密钥。它构建存储库 Docker 映像，在容器内启动真正的 stdio MCP 检查服务器，通过嵌入式 OpenClaw 捆绑包 MCP 运行时具体化该服务器，执行该工具，然后验证 `coding` 和 `messaging` 保留 `bundle-mcp` 工具而 `minimal` 和 `tools.deny: ["bundle-mcp"]` 则对其进行过滤。

`test:docker:cron-mcp-cleanup` 使用固定响应，不需要实时模型密钥。它使用真实的 stdio MCP 检查服务器启动种子网关，运行隔离的 cron 轮次和 `sessions_spawn` 一次性子轮次，然后验证 MCP 子进程在每次运行后退出。

手动 ACP 纯语言线程 smoke（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 为 regression/debug 工作流程保留此脚本。 ACP 线程路由验证可能会再次需要它，所以不要删除它。

有用的环境变量：

- `OPENCLAW_CONFIG_DIR=...`（默认：`~/.openclaw`），挂载到 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（默认：`~/.openclaw/workspace`），挂载到 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`，在运行测试前挂载并加载
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` 仅验证源自 `OPENCLAW_PROFILE_FILE` 的环境变量，使用临时 config/workspace 目录且无外部 CLI 身份验证安装
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...`（默认：`~/.cache/openclaw/docker-cli-tools`，除非运行已使用 CI/managed 绑定目录）安装到 `/home/node/.npm-global`，以便缓存的 CLI 安装在 Docker 内
- 外部CLI auth `$HOME`下的dirs/files以只读方式安装在`/host-auth...`下，然后在测试开始之前复制到`/home/node/...`
  - 默认目录（当运行未缩小到特定 provider 时使用）：`.factory`、`.gemini`、`.minimax`
  - 默认文件：`~/.codex/auth.json`、`~/.codex/config.toml`、`.claude.json`、`~/.claude/.credentials.json`、`~/.claude/settings.json`、`~/.claude/settings.local.json`
  - Narrowed 提供程序仅运行安装从 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推断出的所需 dirs/files
  - 使用 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none` 或 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex` 等逗号列表手动覆盖
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...`，用于缩小运行范围
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...`，用于过滤容器内的 provider
- `OPENCLAW_SKIP_DOCKER_BUILD=1`，用于复用已有的 `openclaw:local-live` 镜像，以便在不需要重新构建的情况下重新运行
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 要求凭据来自配置文件存储（不是 env）
- `OPENCLAW_OPENWEBUI_MODEL=...`，用于选择由 gateway 暴露给 Open WebUI smoke 的模型
- `OPENCLAW_OPENWEBUI_PROMPT=...`，用于覆盖 Open WebUI smoke 使用的 nonce 检查提示词
- `OPENWEBUI_IMAGE=...`，用于覆盖固定版本的 Open WebUI 镜像标签
