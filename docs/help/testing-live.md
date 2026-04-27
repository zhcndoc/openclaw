---
summary: "实时（联网）测试：模型矩阵、CLI 后端、ACP、媒体提供方、凭证"
read_when:
  - 运行实时模型矩阵 / CLI 后端 / ACP / 媒体提供方冒烟测试
  - 调试实时测试的凭证解析
  - 添加新的特定提供方实时测试
title: "测试：实时套件"
sidebarTitle: "实时测试"
---

对于快速入门、QA 运行器、单元/集成套件和 Docker 流程，请参见
[测试](/help/testing)。本页涵盖 **实时**（联网）测试
套件：模型矩阵、CLI 后端、ACP 和媒体提供方实时测试，以及
凭证处理。

## 实时：Android 节点能力扫描

- 测试：`src/gateway/android-node.capabilities.live.test.ts`
- 脚本：`pnpm android:test:integration`
- 目标：调用已连接 Android 节点当前**公开的每一条命令**，并断言命令契约行为。
- 范围：
  - 前置条件/手动设置（该套件不会安装/运行/配对应用）。
  - 针对所选 Android 节点逐条命令进行 `node.invoke` 网关校验。
- 所需预先设置：
  - Android 应用已连接 + 已与网关配对。
  - 应用保持在前台。
  - 对你期望通过的能力已授予权限/采集同意。
- 可选目标覆盖：
  - `OPENCLAW_ANDROID_NODE_ID` 或 `OPENCLAW_ANDROID_NODE_NAME`。
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`。
- Android 完整设置细节：[Android App](/platforms/android)

## 实时：模型冒烟测试（profile keys）

实时测试分成两层，以便隔离故障：

- “直接模型”用于确认在给定 key 的情况下，提供方/模型本身是否能正常应答。
- “网关冒烟测试”用于确认该模型的完整网关 + agent 管线是否正常工作（会话、历史、工具、沙箱策略等）。

### 第 1 层：直接模型补全（无网关）

- 测试：`src/agents/models.profiles.live.test.ts`
- 目标：
  - 枚举已发现的模型
  - 使用 `getApiKeyForModel` 选择你有凭证的模型
  - 每个模型运行一次小型补全（必要时包含有针对性的回归测试）
- 如何启用：
  - `pnpm test:live`（如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
- 设置 `OPENCLAW_LIVE_MODELS=modern`（或 `all`，modern 的别名）来真正运行此套件；否则它会跳过，以保持 `pnpm test:live` 专注于网关冒烟测试
- 如何选择模型：
  - `OPENCLAW_LIVE_MODELS=modern` 运行 modern 白名单（Opus/Sonnet 4.6+、GPT-5.2 + Codex、Gemini 3、DeepSeek V4、GLM 4.7、MiniMax M2.7、Grok 4）
  - `OPENCLAW_LIVE_MODELS=all` 是 modern 白名单的别名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,openai-codex/gpt-5.2,anthropic/claude-opus-4-6,..."`（逗号白名单）
  - modern/all 扫描默认使用精心挑选的高信号上限；设置 `OPENCLAW_LIVE_MAX_MODELS=0` 可进行穷举 modern 扫描，或设置正数以使用更小的上限。
  - 穷举扫描使用 `OPENCLAW_LIVE_TEST_TIMEOUT_MS` 作为整个直接模型测试的超时时间。默认：60 分钟。
  - 直接模型探测默认并发 20 路；可设置 `OPENCLAW_LIVE_MODEL_CONCURRENCY` 覆盖。
- 如何选择提供方：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"`（逗号白名单）
- 密钥来源：
  - 默认：profile 存储和环境变量回退
  - 设置 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 可强制仅使用 **profile 存储**
- 这样设计的原因：
  - 将“提供方 API 坏了 / key 无效”与“gateway agent 管线坏了”分离开来
  - 包含小型、隔离的回归测试（示例：OpenAI Responses/Codex Responses 的 reasoning replay + tool-call 流程）

### 第 2 层：网关 + dev agent 冒烟测试（也就是 “@openclaw” 实际做的事）

- 测试：`src/gateway/gateway-models.profiles.live.test.ts`
- 目标：
  - 启动一个进程内网关
  - 创建/补丁一个 `agent:dev:*` 会话（每次运行可覆盖模型）
  - 遍历有 key 的模型并断言：
    - “有意义”的响应（无工具）
    - 一个真实的工具调用可工作（read 探针）
    - 可选的额外工具探针（exec+read 探针）
    - OpenAI 回归路径（仅 tool-call → follow-up）仍可正常工作
- 探针细节（方便你快速解释失败原因）：
  - `read` 探针：测试会在工作区写入一个 nonce 文件，并要求 agent `read` 它后把 nonce 复述回来。
  - `exec+read` 探针：测试要求 agent 用 `exec` 把 nonce 写入临时文件，然后再 `read` 回来。
  - 图像探针：测试会附加一个生成的 PNG（猫 + 随机代码），并期望模型返回 `cat <CODE>`。
  - 实现参考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何启用：
  - `pnpm test:live`（如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
- 如何选择模型：
  - 默认：modern 白名单（Opus/Sonnet 4.6+、GPT-5.2 + Codex、Gemini 3、DeepSeek V4、GLM 4.7、MiniMax M2.7、Grok 4）
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是 modern 白名单的别名
  - 或设置 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗号列表）进行缩小范围
  - modern/all 网关扫描默认使用精心挑选的高信号上限；设置 `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` 可进行穷举 modern 扫描，或设置正数以使用更小的上限。
- 如何选择提供方（避免“OpenRouter 全家桶”）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`（逗号白名单）
- 工具 + 图像探针在此实时测试中始终开启：
  - `read` 探针 + `exec+read` 探针（工具压力测试）
  - 当模型声明支持图像输入时，图像探针会运行
  - 流程（高层）：
    - 测试生成一个带有“CAT”+ 随机代码的微型 PNG（`src/gateway/live-image-probe.ts`）
    - 通过 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 发送
    - 网关将附件解析为 `images[]`（`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`）
    - 内嵌 agent 将多模态用户消息转发给模型
    - 断言：回复包含 `cat` + 该代码（OCR 容错：允许轻微错误）

提示：如果想查看你机器上可测试的内容（以及准确的 `provider/model` id），运行：

```bash
openclaw models list
openclaw models list --json
```

## 实时：CLI 后端冒烟测试（Claude、Codex、Gemini 或其他本地 CLI）

- 测试：`src/gateway/gateway-cli-backend.live.test.ts`
- 目标：使用本地 CLI 后端验证 Gateway + agent 管线，而不触碰你的默认配置。
- 特定后端的冒烟默认值位于所属扩展的 `cli-backend.ts` 定义中。
- 启用：
  - `pnpm test:live`（如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- 默认值：
  - 默认提供方/模型：`claude-cli/claude-sonnet-4-6`
  - 命令/参数/图像行为来自所属 CLI 后端插件元数据。
- 覆盖（可选）：
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.2"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/codex"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 发送真实图像附件（路径会注入到提示词中）。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 通过 CLI 参数而不是提示词注入来传递图像文件路径。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"`（或 `"list"`）在设置了 `IMAGE_ARG` 时控制图像参数的传递方式。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 发送第二轮并验证恢复流程。
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=1` 在所选模型支持切换目标时，启用 Claude Sonnet -> Opus 同会话连续性探针。Docker 配方默认关闭此项以提高整体可靠性。
  - `OPENCLAW_LIVE_CLI_BACKEND_MCP_PROBE=1` 启用 MCP/tool 回环探针。Docker 配方默认关闭此项，除非显式请求。

示例：

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.2" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

Docker 配方：

```bash
pnpm test:docker:live-cli-backend
```

单提供方 Docker 配方：

```bash
pnpm test:docker:live-cli-backend:claude
pnpm test:docker:live-cli-backend:claude-subscription
pnpm test:docker:live-cli-backend:codex
pnpm test:docker:live-cli-backend:gemini
```

说明：

- Docker 运行器位于 `scripts/test-live-cli-backend-docker.sh`。
- 它在仓库 Docker 镜像内、以非 root 的 `node` 用户运行实时 CLI 后端冒烟测试。
- 它从所属扩展中解析 CLI 冒烟元数据，然后将匹配的 Linux CLI 包（`@anthropic-ai/claude-code`、`@openai/codex` 或 `@google/gemini-cli`）安装到 `OPENCLAW_DOCKER_CLI_TOOLS_DIR`（默认：`~/.cache/openclaw/docker-cli-tools`）下可缓存、可写的前缀中。
- `pnpm test:docker:live-cli-backend:claude-subscription` 需要通过 `~/.claude/.credentials.json` 中的 `claudeAiOauth.subscriptionType` 或 `claude setup-token` 生成的 `CLAUDE_CODE_OAUTH_TOKEN` 提供可移植的 Claude Code 订阅 OAuth。它会先在 Docker 中验证直接 `claude -p`，然后在不保留 Anthropic API key 环境变量的情况下运行两轮 Gateway CLI 后端。此订阅通道默认禁用 Claude MCP/tool 和图像探针，因为 Claude 目前会将第三方应用使用路由到额外使用量计费，而不是正常的订阅计划限额。
- 该实时 CLI 后端冒烟现在会对 Claude、Codex 和 Gemini 执行相同的端到端流程：文本轮次、图像分类轮次，然后通过 Gateway CLI 验证 MCP `cron` 工具调用。
- Claude 的默认冒烟还会把会话从 Sonnet 补丁到 Opus，并验证恢复后的会话仍记得之前的一条备注。

## 实时：ACP 绑定冒烟测试（`/acp spawn ... --bind here`）

- 测试：`src/gateway/gateway-acp-bind.live.test.ts`
- 目标：使用一个真实 ACP agent 验证真实的 ACP 对话绑定流程：
  - 发送 `/acp spawn <agent> --bind here`
  - 原地绑定一个合成消息通道会话
  - 在同一会话上发送正常的后续消息
  - 验证后续消息进入已绑定的 ACP 会话转录
- 启用：
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- 默认值：
  - Docker 中的 ACP agents：`claude,codex,gemini`
  - 直接 `pnpm test:live ...` 的 ACP agent：`claude`
  - 合成通道：Slack DM 风格对话上下文
  - ACP 后端：`acpx`
- 覆盖：
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude,codex,gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND='npx -y @agentclientprotocol/claude-agent-acp@<version>'`
  - `OPENCLAW_LIVE_ACP_BIND_CODEX_MODEL=gpt-5.2`
  - `OPENCLAW_LIVE_ACP_BIND_OPENCODE_MODEL=opencode/kimi-k2.6`
  - `OPENCLAW_LIVE_ACP_BIND_REQUIRE_TRANSCRIPT=1`
  - `OPENCLAW_LIVE_ACP_BIND_REQUIRE_CRON=1`
  - `OPENCLAW_LIVE_ACP_BIND_PARENT_MODEL=openai/gpt-5.2`
- 注：
  - 此路径使用 gateway `chat.send` 接口，并带有仅管理员可用的合成来源路由字段，因此测试可以附加消息通道上下文，而无需伪装成外部投递。
  - 当未设置 `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` 时，测试将为所选 ACP harness agent 使用嵌入式 `acpx` 插件的内置 agent 注册表。
  - 默认情况下，已绑定会话的 cron MCP 创建是尽力而为，因为外部 ACP harness 可能会在绑定/图像证明通过后取消 MCP 调用；设置 `OPENCLAW_LIVE_ACP_BIND_REQUIRE_CRON=1` 可将该绑定后的 cron 探针设为严格模式。

示例：

```bash
OPENCLAW_LIVE_ACP_BIND=1 \
  OPENCLAW_LIVE_ACP_BIND_AGENT=claude \
  pnpm test:live src/gateway/gateway-acp-bind.live.test.ts
```

Docker 配方：

```bash
pnpm test:docker:live-acp-bind
```

单 agent Docker 配方：

```bash
pnpm test:docker:live-acp-bind:claude
pnpm test:docker:live-acp-bind:codex
pnpm test:docker:live-acp-bind:gemini
```

Docker 说明：

- Docker 运行器位于 `scripts/test-live-acp-bind-docker.sh`。
- 默认情况下，它会按顺序针对所有受支持的实时 CLI agents 运行 ACP 绑定冒烟：`claude`、`codex`，然后 `gemini`。
- 使用 `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=codex` 或 `OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` 可缩小矩阵范围。
- 它会 source `~/.profile`，将匹配的 CLI 认证材料暂存到容器中，将 `acpx` 安装到可写的 npm 前缀中，然后在缺失时安装所请求的实时 CLI（`@anthropic-ai/claude-code`、`@openai/codex` 或 `@google/gemini-cli`）。
- 在 Docker 内，运行器会设置 `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx`，以便 acpx 将来自已 source 的 profile 的提供方环境变量保留给子 harness CLI。

## 现场：Codex app-server harness 烟雾测试

- 目标：通过正常的 gateway `agent` 方法验证由插件拥有的 Codex harness：
  - 加载捆绑的 `codex` 插件
  - 选择 `OPENCLAW_AGENT_RUNTIME=codex`
  - 向 `openai/gpt-5.2` 发送第一次 gateway agent 回合，并强制使用 Codex harness
  - 向同一个 OpenClaw 会话发送第二次回合，并验证 app-server 线程可以恢复
  - 通过同一条 gateway 命令路径运行 `/codex status` 和 `/codex models`
  - 可选地运行两个经 Guardian 审核的升级 shell 探测：一个应当被批准的良性命令，以及一个应当被拒绝的伪密钥上传，从而让 agent 追问
- 测试：`src/gateway/gateway-codex-harness.live.test.ts`
- 启用：`OPENCLAW_LIVE_CODEX_HARNESS=1`
- 默认模型：`openai/gpt-5.2`
- 可选图片探测：`OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1`
- 可选 MCP/工具探测：`OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1`
- 可选 Guardian 探测：`OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1`
- 该烟雾测试将 `OPENCLAW_AGENT_HARNESS_FALLBACK=none`，因此损坏的 Codex harness 不能通过静默回退到 PI 而蒙混过关。
- 认证：来自本地 Codex 订阅登录的 Codex app-server 认证。Docker 烟雾测试在适用时也可以提供 `OPENAI_API_KEY` 以用于非 Codex 探测，并可选复制 `~/.codex/auth.json` 和 `~/.codex/config.toml`。

本地配方：

```bash
source ~/.profile
OPENCLAW_LIVE_CODEX_HARNESS=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MODEL=openai/gpt-5.2 \
  pnpm test:live -- src/gateway/gateway-codex-harness.live.test.ts
```

Docker 配方：

```bash
source ~/.profile
pnpm test:docker:live-codex-harness
```

Docker 说明：

- Docker 运行器位于 `scripts/test-live-codex-harness-docker.sh`。
- 它会加载挂载的 `~/.profile`，传递 `OPENAI_API_KEY`，在存在时复制 Codex CLI 认证文件，将 `@openai/codex` 安装到一个可写的挂载 npm 前缀中，暂存源码树，然后只运行 Codex-harness 的现场测试。
- Docker 默认启用图片、MCP/工具和 Guardian 探测。若需要更窄的调试运行，可设置 `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0` 或 `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0` 或 `OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0`。
- Docker 还会导出 `OPENCLAW_AGENT_HARNESS_FALLBACK=none`，与现场测试配置一致，因此旧别名或 PI 回退不会掩盖 Codex harness 回归。

### 推荐的现场配方

更窄、明确的 allowlist 最快也最不容易波动：

- 单模型，直接方式（非 gateway）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- 单模型，gateway 烟雾测试：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多个提供方的工具调用：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.2,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,deepseek/deepseek-v4-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 重点（Gemini API key + Antigravity）：
  - Gemini（API key）：`OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity（OAuth）：`OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 自适应思考烟雾测试：
  - 如果本地密钥存放在 shell profile 中：`source ~/.profile`
  - Gemini 3 动态默认：`pnpm openclaw qa manual --provider-mode live-frontier --model google/gemini-3.1-pro-preview --alt-model google/gemini-3.1-pro-preview --message '/think adaptive Reply exactly: GEMINI_ADAPTIVE_OK' --timeout-ms 180000`
  - Gemini 2.5 动态预算：`pnpm openclaw qa manual --provider-mode live-frontier --model google/gemini-2.5-flash --alt-model google/gemini-2.5-flash --message '/think adaptive Reply exactly: GEMINI25_ADAPTIVE_OK' --timeout-ms 180000`

说明：

- `google/...` 使用 Gemini API（API key）。
- `google-antigravity/...` 使用 Antigravity OAuth 桥接（Cloud Code Assist 风格的 agent 端点）。
- `google-gemini-cli/...` 使用你机器上的本地 Gemini CLI（单独的认证 + 工具链特性）。
- Gemini API vs Gemini CLI：
  - API：OpenClaw 通过 HTTP 调用 Google 托管的 Gemini API（API key / profile auth）；这通常就是大多数人所说的“Gemini”。
  - CLI：OpenClaw 调用本地 `gemini` 二进制；它有自己的认证，而且行为可能不同（流式传输/工具支持/版本偏差）。

## 现场：模型矩阵（我们的覆盖范围）

没有固定的“CI 模型列表”（现场测试是可选启用的），但以下是建议在装有密钥的开发机器上定期覆盖的**推荐**模型。

### 现代烟雾集合（工具调用 + 图片）

这是我们期望持续可用的“常见模型”运行：

- OpenAI（非 Codex）：`openai/gpt-5.2`
- OpenAI Codex OAuth：`openai-codex/gpt-5.2`
- Anthropic：`anthropic/claude-opus-4-6`（或 `anthropic/claude-sonnet-4-6`）
- Google（Gemini API）：`google/gemini-3.1-pro-preview` 和 `google/gemini-3-flash-preview`（避免较旧的 Gemini 2.x 模型）
- Google（Antigravity）：`google-antigravity/claude-opus-4-6-thinking` 和 `google-antigravity/gemini-3-flash`
- DeepSeek：`deepseek/deepseek-v4-flash` 和 `deepseek/deepseek-v4-pro`
- Z.AI（GLM）：`zai/glm-4.7`
- MiniMax：`minimax/MiniMax-M2.7`

使用工具 + 图片运行 gateway 烟雾测试：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.2,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,deepseek/deepseek-v4-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基线：工具调用（Read + 可选 Exec）

每个提供方家族至少选一个：

- OpenAI：`openai/gpt-5.2`
- Anthropic：`anthropic/claude-opus-4-6`（或 `anthropic/claude-sonnet-4-6`）
- Google：`google/gemini-3-flash-preview`（或 `google/gemini-3.1-pro-preview`）
- DeepSeek：`deepseek/deepseek-v4-flash`
- Z.AI（GLM）：`zai/glm-4.7`
- MiniMax：`minimax/MiniMax-M2.7`

可选的额外覆盖（锦上添花）：

- xAI：`xai/grok-4`（或当前可用的最新版本）
- Mistral：`mistral/`…（选择一个你已启用且支持“tools”的模型）
- Cerebras：`cerebras/`…（如果你有访问权限）
- LM Studio：`lmstudio/`…（本地；工具调用取决于 API 模式）

### 视觉：图片发送（附件 → 多模态消息）

在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中至少包含一个支持图片的模型（Claude/Gemini/OpenAI 的 vision-capable 变体等），以覆盖图片探测。

### 聚合器 / 其他网关

如果你启用了相关 key，我们也支持通过以下方式测试：

- OpenRouter：`openrouter/...`（数百个模型；使用 `openclaw models scan` 找到支持工具 + 图片的候选）
- OpenCode：`opencode/...` 用于 Zen，以及 `opencode-go/...` 用于 Go（通过 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 认证）

你还可以在现场矩阵中加入的更多提供方（如果你有凭据/配置）：

- 内置：`openai`、`openai-codex`、`anthropic`、`google`、`google-vertex`、`google-antigravity`、`google-gemini-cli`、`zai`、`openrouter`、`opencode`、`opencode-go`、`xai`、`groq`、`cerebras`、`mistral`、`github-copilot`
- 通过 `models.providers`（自定义端点）：`minimax`（云/API），以及任何 OpenAI/Anthropic 兼容代理（LM Studio、vLLM、LiteLLM 等）

提示：不要在文档里硬编码“所有模型”。权威列表是你机器上 `discoverModels(...)` 返回的内容，以及可用的密钥。

## 凭据（切勿提交）

现场测试发现凭据的方式与 CLI 相同。实际影响如下：

- 如果 CLI 可用，现场测试也应能找到相同的密钥。
- 如果某个现场测试提示“no creds”，请按你调试 `openclaw models list` / 模型选择时的方式来排查。

- 每个 agent 的认证配置文件：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（这就是现场测试里“profile keys”的含义）
- 配置：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）
- 旧版状态目录：`~/.openclaw/credentials/`（存在时会复制到暂存的现场 home 中，但它不是主 profile key 存储）
- 本地现场运行默认会将当前配置、每个 agent 的 `auth-profiles.json` 文件、旧版 `credentials/`，以及受支持的外部 CLI 认证目录复制到临时测试 home 中；暂存的现场 home 会跳过 `workspace/` 和 `sandboxes/`，并且会去除 `agents.*.workspace` / `agentDir` 路径覆盖，因此探测不会碰到你真实主机工作区。

如果你想依赖环境变量中的 key（例如在 `~/.profile` 里导出的），请先 `source ~/.profile` 后再运行本地测试，或者使用下面的 Docker 运行器（它们可以将 `~/.profile` 挂载进容器）。

## Deepgram 现场（音频转录）

- 测试：`extensions/deepgram/audio.live.test.ts`
- 启用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live extensions/deepgram/audio.live.test.ts`

## BytePlus 编码计划现场

- 测试：`extensions/byteplus/live.test.ts`
- 启用：`BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live extensions/byteplus/live.test.ts`
- 可选模型覆盖：`BYTEPLUS_CODING_MODEL=ark-code-latest`

## ComfyUI 工作流媒体现场

- 测试：`extensions/comfy/comfy.live.test.ts`
- 启用：`OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- 范围：
  - 覆盖捆绑的 comfy 图像、视频以及 `music_generate` 路径
  - 除非配置了 `plugins.entries.comfy.config.<capability>`，否则会跳过各项能力
  - 在更改 comfy 工作流提交、轮询、下载或插件注册后很有用

## 图像生成现场

- 测试：`test/image-generation.runtime.live.test.ts`
- 命令：`pnpm test:live test/image-generation.runtime.live.test.ts`
- Harness：`pnpm test:live:media image`
- 范围：
  - 枚举每个已注册的图像生成提供方插件
  - 在探测之前，从你的登录 shell（`~/.profile`）加载缺失的 provider 环境变量
  - 默认优先使用 live/env API key 而不是已存储的认证配置，因此 `auth-profiles.json` 中过期的测试 key 不会掩盖真实的 shell 凭据
  - 跳过没有可用认证/配置文件/模型的提供方
  - 通过共享的图像生成运行时运行每个已配置提供方：
    - `<provider>:generate`
    - 当提供方声明支持编辑时的 `<provider>:edit`
- 当前覆盖的内置提供方：
  - `fal`
  - `google`
  - `minimax`
  - `openai`
  - `openrouter`
  - `vydra`
  - `xai`
- 可选缩小范围：
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google,openrouter,xai"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-2,google/gemini-3.1-flash-image-preview,openrouter/google/gemini-3.1-flash-image-preview,xai/grok-imagine-image"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit,openrouter:generate,xai:default-generate,xai:default-edit"`
- 可选认证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 强制使用 profile-store 认证并忽略仅环境变量覆盖

对于随附的 CLI 路径，在 provider/runtime 现场测试通过后，再添加一个 `infer` 烟雾测试：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_INFER_CLI_TEST=1 pnpm test:live -- test/image-generation.infer-cli.live.test.ts
openclaw infer image providers --json
openclaw infer image generate \
  --model google/gemini-3.1-flash-image-preview \
  --prompt "Minimal flat test image: one blue square on a white background, no text." \
  --output ./openclaw-infer-image-smoke.png \
  --json
```

这覆盖了 CLI 参数解析、配置/默认 agent 解析、捆绑插件激活、按需捆绑运行时依赖修复、共享的图像生成运行时，以及现场 provider 请求。

## 音乐生成联机测试

- 测试：`extensions/music-generation-providers.live.test.ts`
- 启用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- 运行器：`pnpm test:live:media music`
- 范围：
  - 测试共享的捆绑音乐生成提供方路径
  - 当前覆盖 Google 和 MiniMax
  - 在探测前从你的登录 shell（`~/.profile`）加载提供方环境变量
  - 默认优先使用 live/env API 密钥，而不是已存储的认证配置文件，因此 `auth-profiles.json` 中过时的测试密钥不会掩盖真实的 shell 凭据
  - 跳过没有可用 auth/profile/model 的提供方
  - 在可用时运行两个声明的运行时模式：
    - 使用仅 prompt 输入的 `generate`
    - 当提供方声明 `capabilities.edit.enabled` 时运行 `edit`
  - 当前共享通道覆盖：
    - `google`：`generate`、`edit`
    - `minimax`：`generate`
    - `comfy`：单独的 Comfy 联机文件，不在这次共享扫描中
- 可选缩小范围：
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.5+"`
- 可选认证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 强制使用配置文件存储中的认证并忽略仅环境变量覆盖

## 视频生成联机测试

- 测试：`extensions/video-generation-providers.live.test.ts`
- 启用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- 运行器：`pnpm test:live:media video`
- 范围：
  - 测试共享的捆绑视频生成提供方路径
  - 默认采用发布安全的冒烟路径：非 FAL 提供方、每个提供方一次 text-to-video 请求、一个一秒的 lobster 提示词，以及来自 `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` 的每个提供方操作上限（默认 `180000`）
  - 默认跳过 FAL，因为提供方侧队列延迟可能主导发布耗时；传入 `--video-providers fal` 或 `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="fal"` 可显式运行它
  - 在探测前从你的登录 shell（`~/.profile`）加载提供方环境变量
  - 默认优先使用 live/env API 密钥，而不是已存储的认证配置文件，因此 `auth-profiles.json` 中过时的测试密钥不会掩盖真实的 shell 凭据
  - 跳过没有可用 auth/profile/model 的提供方
  - 默认只运行 `generate`
  - 设置 `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` 以在可用时也运行声明的转换模式：
    - 当提供方声明 `capabilities.imageToVideo.enabled` 且所选提供方/模型在共享扫描中接受基于 buffer 的本地图像输入时，运行 `imageToVideo`
    - 当提供方声明 `capabilities.videoToVideo.enabled` 且所选提供方/模型在共享扫描中接受基于 buffer 的本地视频输入时，运行 `videoToVideo`
  - 当前在共享扫描中已声明但被跳过的 `imageToVideo` 提供方：
    - `vydra`，因为捆绑的 `veo3` 仅支持文本，而捆绑的 `kling` 需要远程图像 URL
  - Vydra 的特定提供方覆盖：
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - 该文件默认运行 `veo3` 的 text-to-video，以及一个使用远程图像 URL fixture 的 `kling` 通道
  - 当前 `videoToVideo` 联机覆盖：
    - 仅当所选模型是 `runway/gen4_aleph` 时运行 `runway`
  - 当前在共享扫描中已声明但被跳过的 `videoToVideo` 提供方：
    - `alibaba`、`qwen`、`xai`，因为这些路径目前需要远程 `http(s)` / MP4 参考 URL
    - `google`，因为当前共享 Gemini/Veo 通道使用本地 buffer-backed 输入，而该路径在共享扫描中不被接受
    - `openai`，因为当前共享通道缺少组织特定的视频 inpaint/remix 访问保证
- 可选缩小范围：
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_SKIP_PROVIDERS=""` 以包含默认扫描中的每个提供方，包括 FAL
  - `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS=60000` 以降低每个提供方操作上限，适合激进的冒烟运行
- 可选认证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 强制使用配置文件存储中的认证并忽略仅环境变量覆盖

## 媒体联机运行器

- 命令：`pnpm test:live:media`
- 目的：
  - 通过一个仓库原生入口点运行共享的图像、音乐和视频联机套件
  - 自动从 `~/.profile` 加载缺失的提供方环境变量
  - 默认自动将每个套件缩小到当前具有可用认证的提供方
  - 复用 `scripts/test-live.mjs`，因此 heartbeat 和 quiet-mode 行为保持一致
- 示例：
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## 相关内容

- [测试](/help/testing) — 单元、集成、QA 和 Docker 套件
