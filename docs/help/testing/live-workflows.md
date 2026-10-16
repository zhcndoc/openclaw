---
summary: "实时提供商调试通道以及支持它们的 Docker 和 Parallels Smoke"
title: "实时和 Docker/Parallels 工作流程"
read_when:
  - "您正在调试真实的提供者或模型"
  - "您需要实时 Docker 或 Parallels 通道"
---

## <a id="live-and-docker%2Fparallels-workflows"></a><a id="live-and-docker/parallels-workflows"></a> Live 和 Docker/Parallels 工作流

调试真实providers/models时（需要真实信用）：

- Live套件（模型+网关tool/image检查）：`pnpm test:live`
- 靶向运行单个 live 文件且保持静默：`pnpm test:live -- src/agents/models.profiles.live.test.ts`
- 进度卡刷新：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- src/gateway/gateway-progress-refresh.live.test.ts`
  - 需要 `OPENAI_API_KEY` 并使用具有隔离网关状态的 `openai/gpt-5.6-luna`。
  - 完成较早的回合，然后在第二回合期间刷新，同时保持命令。原家长必须更新卡片并保留其最终答复。稍后的空闲刷新必须更新卡，而不添加聊天消息或恢复挂起的工作。
- Live 子代理切换压力：`OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_SUBAGENT_STRESS=1 pnpm test:live -- src/agents/subagents/announce/subagent-yield-resume.live.test.ts`
  - 需要 `OPENAI_API_KEY`，默认为 `openai/gpt-5.6-luna`；选择另一个 OpenAI 模型与 `OPENCLAW_LIVE_SUBAGENT_E2E_MODEL`。
  - 固定 OpenClaw 代理工具并使用隔离的网关状态、合成文件和外部保存的 HTTP 响应。它检查并发隐藏结果扇出、等待子树的仅状态询问、操作员恢复保留的任务标识和重放而无需重复工作、子超时、实时 HTTP 503 检索失败以及在其所有者声明运行后取消对正在运行的结果进行竞赛。根据保留的请求、子执行、任务交付状态和隐藏结果检查父报告。 503 案例检查完成的代理轮次并不意味着检索成功。
  - 每个案例在 `.artifacts/qa-e2e/subagent-challenges-*/evidence.json` 中逐步保留有界运行时事实以及最终助理答复，包括失败的运行。设置 `OPENCLAW_LIVE_SUBAGENT_EVIDENCE_DIR` 以更改输出目录。该实时通道不模拟冷过程损失；重新启动和丢失接受所有权由 `subagent-orphan-recovery.restart-integration.test.ts` 涵盖。
  - 默认两批三个孩子。设置 `OPENCLAW_LIVE_SUBAGENT_STRESS_BATCHES` （1–5） 和 `OPENCLAW_LIVE_SUBAGENT_STRESS_CHILDREN` （1–6） 以更改有界工作负载。
- Live Gateway 并发：在 `main` 上调度 `OpenClaw Performance`、`mode=gateway-concurrency` 和 `live_openai_candidate=true`。它跨 32 个代理运行 96 个实际轮次，具有 1,000 个种子会话、并发会话活动和加载阶段 CPU 配置文件。梦想被禁用，而普通索引和回顾仍然启用。结果保留在操作工件中。请参阅 [Gateway 并发基准](/ci/scheduled-workflows#gateway-concurrency-benchmark)。
- 运行时性能报告：调度 `OpenClaw Performance` 和 `live_openai_candidate=true` 来实现真正的 `openai/gpt-5.6-luna` 代理轮换，或调度 `deep_profile=true` 来实现 Kova CPU/heap/trace 工件。每日计划运行从单独的工件消耗发布者作业发布模拟提供者、深度配置文件和 GPT-5.6 Luna Lane 报告到 `openclaw/clawgrit-reports`；缺少或无效的发布者身份验证失败，并且 `profile=release` 运行。手动非发布调度保留 GitHub 工件并将报告发布视为建议。模拟提供者报告还包括源级网关启动、内存、插件压力、重复的假模型 hello-loop 和 CLI 启动编号。
- Docker live 模型扫描：`pnpm test:docker:live-models`
  - Each 选定的模型运行文本转换以及小型文件读取式检查。其元数据宣传 `image` 输入的模型也会运行微小的图像转弯。隔离提供程序故障时，禁用 `OPENCLAW_LIVE_MODEL_FILE_PROBE=0` 或 `OPENCLAW_LIVE_MODEL_IMAGE_PROBE=0` 的额外检查。
  - CI 覆盖范围：每日的 `OpenClaw Scheduled Live And E2E Checks` 和手动的 `OpenClaw Release Checks` 都会调用可复用的 live/E2E 工作流，并设置 `include_live_suites: true`，其中包括按提供方分片的 Docker live 模型矩阵任务。
  - 对于重点重播的 CI，请使用 `include_live_suites: true` 和 `live_models_only: true` 调度 `OpenClaw Live And E2E Checks (Reusable)`。
  - 向 `scripts/ci-hydrate-live-auth.sh` 加 `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml` 及其 scheduled/release 调用者添加新的高信号提供商机密。
- 原生 Codex 绑定聊天冒烟测试：`pnpm test:docker:live-codex-bind`
  - 针对 Codex 应用程序服务器路径运行 Docker 实时通道，将合成 Slack DM 与 `/codex bind` 绑定，练习 `/codex fast` 和 `/codex permissions`，然后验证简单回复和图像附件通过本机插件绑定而不是 ACP 进行路由。
- Codex app-server harness 冒烟测试：`pnpm test:docker:live-codex-harness`
  - Runs 网关代理通过插件拥有的 Codex 应用程序服务器工具进行检查，验证 `/codex status` 和 `/codex models`，并默认执行映像、cron MCP、子代理和 Guardian 检查。隔离其他故障时，禁用 `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=0` 的子代理检查。对于重点子代理检查，请禁用其他检查：`OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1 pnpm test:docker:live-codex-harness`。除非设置了 `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_ONLY=0`，否则这将在子代理检查后退出。
- Codex 按需安装冒烟测试：`pnpm test:docker:codex-on-demand`
  - 在Docker中安装打包的OpenClaw tarball，运行OpenAI API-key onboarding，并验证Codex插件和`@openai/codex`依赖项是否下载到托管npm项目根中按需。
- Codex npm-插件直播包烟雾：`pnpm test:docker:live-codex-npm-plugin`
  - 将候选OpenClaw包和精确的Codex插件安装到Docker中，然后使用真正的OpenAI密钥进行CLI预检和同会话轮次。
  - 其零重试中等思考后续回合必须发送进度，在随机化工作区读取和精确产物写入过程中持续工作，然后发送完成消息。仅发送进度的终端回合会导致该通道失败。
- Live 插件工具依赖冒烟测试：`pnpm test:docker:live-plugin-tool`
  - 使用真实的 `slugify` 依赖打包一个 fixture 插件，通过 `npm-pack:` 安装它，验证该依赖位于受管理的 npm 项目根目录下，然后要求一个 live OpenAI 模型调用插件工具并返回隐藏的 slug。
- OpenClaw 救援命令冒烟测试：`pnpm test:live:system-agent-rescue-channel`
  - 选择加入安全带检查消息通道救援指挥界面。练习 `/openclaw status`，将持久模型更改排队，回复 `/openclaw yes`，并验证 audit/config 写入路径。
- OpenClaw 首次运行 Docker 冒烟测试：`pnpm test:docker:system-agent-first-run`
  - 从空的 OpenClaw 状态目录开始，首先证明打包的 `openclaw setup` CLI 在没有推理的情况下拒绝运行。然后它通过打包的激活模块测试并激活假Claude。仅此后，模糊打包的 CLI 请求才会到达规划器并解析为类型化设置，然后是一次性模型、代理、Discord 配置和 SecretRef 操作。它验证配置和审核条目。这是支持 gate/operation 证据，而不是交互式入门引导或 OpenClaw agent/tool/approval 证明。同样的泳道由 `pnpm openclaw qa suite --scenario system-agent-ring-zero-setup` 在 QA 实验室中曝光。
- Moonshot/Kimi 成本烟雾：设置 `MOONSHOT_API_KEY` 后，运行 `openclaw models list --provider moonshot --json`，然后针对 `moonshot/kimi-k2.6` 运行隔离的 `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json`。验证 JSON 报告 Moonshot/K2.6 和辅助记录存储标准化 `usage.cost`。

<Tip>
当您只需要一种失败案例时，更喜欢通过 [allowlist 环境变量 ](/help/testing/docker) 缩小实时测试范围。
</Tip>
