---
summary: "实时（联网）测试：模型矩阵、CLI 后端、ACP、媒体提供商、凭据"
read_when:
  - 运行实时模型矩阵 / CLI 后端 / ACP / 媒体提供商冒烟测试
  - 调试实时测试的凭据解析
  - 添加新的特定提供商实时测试
title: "测试：实时套件"
sidebarTitle: "实时测试"
---

有关快速开始、QA 运行器、单元/集成套件和 Docker 流程，请参见
[Testing](/help/testing)。本页涵盖**实时**（会进行网络交互）的测试：
模型矩阵、CLI 后端、ACP、媒体提供商以及凭据处理。

## Live tests vs your real gateway

Live suites and ad hoc smokes must never disturb a gateway that is already
serving real traffic (yours or another operator's):

- Bring your own gateway: use the in-process gateway (Layer 2 below) or start a
  dev instance with an isolated state dir (`OPENCLAW_STATE_DIR=<scratch>`) and a
  free port. Do not bind the default gateway port (18789) while a real gateway
  is running on it.
- Do not `openclaw gateway stop`/`restart` (or `launchctl`/`systemctl`/tmux
  equivalents) a service you did not start in this session — that is the
  operator's live instance. Get explicit approval first.
- Need realistic data? Copy the live state/DB into your dev state dir and test
  against the copy. In-place migrations of a live gateway's state also require
  explicit approval.

## Live: local smoke commands

在进行临时实时检查之前，请先在进程环境中导出所需的提供商密钥。

安全的媒体冒烟测试：

```bash
pnpm openclaw infer tts convert --local --json \
  --text "OpenClaw live smoke." \
  --output /tmp/openclaw-live-smoke.mp3
```

安全的语音通话就绪冒烟测试：

```bash
pnpm openclaw voicecall setup --json
pnpm openclaw voicecall smoke --to "+15555550123"
```

`voicecall smoke` 默认是一次 dry run，除非同时提供 `--yes`；仅当你打算发起真实通话时才使用 `--yes`。对于 Twilio、Telnyx 和 Plivo，成功的就绪检查需要一个公开的 webhook URL——本地/私有的 loopback URL 会被拒绝，因为这些提供商无法访问它们。

## 实时：Android 节点能力扫描

- 测试：`src/gateway/android-node.capabilities.live.test.ts`
- 脚本：`pnpm android:test:integration`
- 目标：调用已连接 Android 节点当前声明的**每一个命令**，并断言命令契约行为。
- 范围：
  - 预置条件/手动设置（该套件不会安装/运行/配对应用）。
  - 针对所选 Android 节点逐个命令进行 gateway `node.invoke` 验证。
- 必需的前置设置：
  - Android 应用已连接并与 gateway 配对。
  - 应用保持在前台。
  - 对于你期望通过的能力，已授予权限/采集同意。
- 可选目标覆盖：
  - `OPENCLAW_ANDROID_NODE_ID` 或 `OPENCLAW_ANDROID_NODE_NAME`。
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`。
- Android 完整设置详情：[Android 应用](/platforms/android)

## 实时：模型冒烟（配置文件密钥）

实时模型测试分成两层，这样失败就能彼此隔离：

- “直接模型”用于判断在给定密钥下，提供方/模型是否至少能够正常回答。
- “网关冒烟”用于判断该模型的完整网关 + agent 流程是否可用（会话、历史记录、工具、沙箱策略等）。

下面整理的模型列表位于 `src/agents/live-model-filter.ts`，并且
会随着时间变化；请把那里的数组视为事实来源，而不是本
页面。

MiniMax M3 使用 `minimax/MiniMax-M3` 作为其默认 provider/model 引用。

### 第 1 层：直接模型补全（无 gateway）

- 测试：`src/agents/models.profiles.live.test.ts`
- 目标：
  - 枚举发现的模型
  - 使用 `getApiKeyForModel` 选择你有凭据的模型
  - 每个模型运行一次小型补全（必要时包含定向回归测试）
- 如何启用：
  - `pnpm test:live`（如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
  - 设置 `OPENCLAW_LIVE_MODELS=modern`、`small` 或 `all`（`modern` 的别名）才会真正运行该套件；否则会跳过，所以单独运行 `pnpm test:live` 时会保持专注于网关冒烟测试。
- 如何选择模型：
  - `OPENCLAW_LIVE_MODELS=modern` 运行精心筛选的高信号优先级列表（参见 [实时：模型矩阵](#live-model-matrix-what-we-cover)）
  - `OPENCLAW_LIVE_MODELS=small` 运行精心筛选的小模型优先级列表
  - `OPENCLAW_LIVE_MODELS=all` 是 `modern` 的别名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.6-luna,anthropic/claude-opus-4-6,..."`（逗号允许列表）
  - 本地 Ollama 小模型运行默认使用 `http://127.0.0.1:11434`；仅在 LAN、自定义或 Ollama Cloud 端点时设置 `OPENCLAW_LIVE_OLLAMA_BASE_URL`。
  - modern/all 和 small 扫描默认以其精心筛选列表的长度作为上限；设置 `OPENCLAW_LIVE_MAX_MODELS=0` 可进行穷尽式的已选 profile 扫描，或设置一个正数以使用更小的上限。
  - 穷尽式扫描使用 `OPENCLAW_LIVE_TEST_TIMEOUT_MS` 作为整个直接模型测试的超时。默认：60 分钟。
  - 直接模型探针默认并行度为 20；可通过设置 `OPENCLAW_LIVE_MODEL_CONCURRENCY` 覆盖。
- 如何选择提供方：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"`（逗号允许列表）
- 密钥来源：
  - 默认：profile 存储和环境变量回退
  - 设置 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 可强制**仅使用 profile 存储**
- 这样做的原因：
  - 将“提供方 API 出故障 / 密钥无效”与“网关 agent 流水线出故障”分开
  - 包含小型、隔离的回归测试（例如：OpenAI Responses/Codex Responses 推理回放 + tool-call 流程）

### 第 2 层：Gateway + 开发 agent 冒烟（即“@openclaw”实际执行的内容）

- 测试：`src/gateway/gateway-models.profiles.live.test.ts`
- 目标：
  - 启动一个进程内 gateway
  - 创建/补丁一个 `agent:dev:*` 会话（每次运行可覆盖模型）
  - 遍历有密钥的模型，并断言：
    - “有意义”的响应（不使用工具）
    - 一个真实的工具调用可正常工作（read 探针）
    - 可选的额外工具探针（exec+read 探针）
    - OpenAI 回归路径（仅 tool-call -> follow-up）保持可用
- 探针细节（这样你可以更快解释失败原因）：
  - `read` 探针：测试会在工作区写入一个 nonce 文件，并要求 agent `read` 它，然后把 nonce 回显回来。
  - `exec+read` 探针：测试要求 agent `exec` 将 nonce 写入临时文件，然后再 `read` 回来。
  - 图片探针：测试会附加一张生成的 PNG（猫 + 随机化代码），并期望模型返回 `cat <CODE>`。
  - 实现参考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `test/helpers/live-image-probe.ts`。
- 如何启用：
  - `pnpm test:live`（如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
- 如何选择模型：
  - 默认：精心筛选的高信号（`modern`）优先级列表
  - `OPENCLAW_LIVE_GATEWAY_MODELS=small` 通过完整的 gateway + agent 流程运行精心筛选的小模型列表
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是 `modern` 的别名
  - 或设置 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗号列表）来缩小范围
  - modern/all 和 small 的 gateway 扫描默认以其精心筛选列表的长度作为上限；设置 `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` 可进行穷尽式的已选扫描，或设置一个正数以使用更小的上限。
- 如何选择提供方（避免“OpenRouter 全家桶”）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`（逗号允许列表）
- 工具 + 图片探针在此 live 测试中始终开启：
  - `read` 探针 + `exec+read` 探针（工具压力测试）
  - 当模型声明支持图像输入时，图片探针会运行
  - 流程（高层）：
    - 测试生成一个带有“CAT” + 随机代码的小 PNG（`test/helpers/live-image-probe.ts`）
    - 通过 `agent` 的 `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 发送
    - Gateway 将附件解析为 `images[]`（`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`）
    - 内嵌 agent 将多模态用户消息转发给模型
    - 断言：回复包含 `cat` + 该代码（OCR 容错：允许轻微错误）

<Tip>
要查看你机器上可以测试的内容（以及精确的 `provider/model` id），请运行：

```bash
openclaw models list
openclaw models list --json
```

</Tip>

## 实时：CLI 后端冒烟（Claude、Gemini 或其他本地 CLI）

- 测试：`src/gateway/gateway-cli-backend.live.test.ts`
- 目标：使用本地 CLI 后端验证 Gateway + agent 管道，而不触碰你的默认配置。
- 各后端特定的冒烟默认值位于所属插件的 `cli-backend.ts` 定义中。
- 启用：
  - `pnpm test:live`（或在直接调用 Vitest 时使用 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- 默认值：
  - 默认提供商/模型：`claude-cli/claude-sonnet-4-6`
  - 命令/参数/图像行为来自所属 CLI 后端插件元数据。
- 覆盖项（可选）：
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/claude"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 用于发送真实图像附件（路径会注入到提示词中）。默认在 Docker 配方中关闭。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 用于将图像文件路径作为 CLI 参数传递，而不是注入到提示词中。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"`（或 `"list"`）用于在设置了 `IMAGE_ARG` 时控制图像参数的传递方式。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 用于发送第二轮并验证恢复流程。
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=1` 用于在所选模型支持切换目标时，启用 Claude Sonnet -> Opus 同会话连续性探测。默认关闭，包括 Docker 配方中。
  - `OPENCLAW_LIVE_CLI_BACKEND_MCP_PROBE=1` 用于启用 MCP/工具回环探测。默认在 Docker 配方中关闭。

示例：

```bash
  OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

廉价的 Gemini MCP 配置冒烟测试：

```bash
OPENCLAW_LIVE_TEST=1 \
  pnpm test:live src/agents/cli-runner/bundle-mcp.gemini.live.test.ts
```

这不会要求 Gemini 生成响应。它会写入 OpenClaw 赋予 Gemini 的相同系统
设置，然后运行 `gemini --debug mcp list`，以证明已保存的 `transport: "streamable-http"` 服务已被规范化为 Gemini 的 HTTP MCP
形状，并且可以连接到本地 streamable-HTTP MCP 服务器。

Docker 配方：

```bash
pnpm test:docker:live-cli-backend
```

单提供商 Docker 配方：

```bash
pnpm test:docker:live-cli-backend:claude
pnpm test:docker:live-cli-backend:claude-subscription
pnpm test:docker:live-cli-backend:gemini
```

说明：

- Docker 运行器位于 `scripts/test-live-cli-backend-docker.sh`。
- 它在仓库 Docker 镜像内、以非 root 的 `node` 用户运行实时 CLI 后端冒烟测试。
- 它从所属插件解析 CLI 冒烟元数据，然后将匹配的 Linux CLI 包（`@anthropic-ai/claude-code` 或 `@google/gemini-cli`）安装到 `OPENCLAW_DOCKER_CLI_TOOLS_DIR` 中可缓存、可写的前缀里（默认：`~/.cache/openclaw/docker-cli-tools`）。
- `codex-cli` 不再是捆绑的 CLI 后端；请改用 `openai/*` 和 Codex app-server 运行时（参见 [实时：Codex app-server harness 冒烟](#live-codex-app-server-harness-smoke)）。
- `pnpm test:docker:live-cli-backend:claude-subscription` 需要通过 `~/.claude/.credentials.json` 中的 `claudeAiOauth.subscriptionType` 或来自 `claude setup-token` 的 `CLAUDE_CODE_OAUTH_TOKEN` 提供可移植的 Claude Code 订阅 OAuth。它会先在 Docker 中证明直接的 `claude -p` 可用，然后在不保留 Anthropic API key 环境变量的情况下运行两次 Gateway CLI 后端回合。该订阅通道默认禁用 Claude MCP/工具和图像探测，因为它会消耗已登录订阅的使用额度，而且 Anthropic 可能会在不发布 OpenClaw 版本的情况下更改 Claude Agent SDK / `claude -p` 的计费和速率限制行为。
- 通过上面的标志，Claude 和 Gemini 支持相同的探测集（文本回合、图像分类、MCP `cron` 工具调用、模型切换连续性），但这些探测默认都不会运行——请按需通过相应标志显式启用。

## 实时：APNs HTTP/2 代理可达性

- 测试：`src/infra/push-apns-http2.live.test.ts`
- 目标：通过本地 HTTP CONNECT 代理隧道连接到 Apple 的 sandbox APNs 端点，发送 APNs HTTP/2 验证请求，并断言 Apple 的真实 `403 InvalidProviderToken` 响应会经由代理路径返回。
- 启用：
  - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_APNS_REACHABILITY=1 pnpm test:live src/infra/push-apns-http2.live.test.ts`
- 可选超时：
  - `OPENCLAW_LIVE_APNS_TIMEOUT_MS=30000`

## 实时：ACP 绑定冒烟（`/acp spawn ... --bind here`）

- 测试：`src/gateway/gateway-acp-bind.live.test.ts`
- 目标：使用一个真实的 ACP 代理验证真实的 ACP conversation-bind 流程：
  - 发送 `/acp spawn <agent> --bind here`
  - 原地绑定一个合成的消息通道会话
  - 在同一个会话上发送一次正常的后续消息
  - 验证该后续消息落入已绑定的 ACP 会话转录中
- 启用：
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- 默认值：
  - Docker 中的 ACP 代理：`claude,codex,gemini`
  - 直接执行 `pnpm test:live ...` 时的 ACP 代理：`claude`
  - 合成通道：Slack DM 风格的会话上下文
  - ACP 后端：`acpx`
- 覆盖项：
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=droid`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=opencode`
  - `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude,codex,gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND='npx -y @agentclientprotocol/claude-agent-acp@<version>'`
  - `OPENCLAW_LIVE_ACP_BIND_CODEX_MODEL=gpt-5.6-luna`
  - `OPENCLAW_LIVE_ACP_BIND_OPENCODE_MODEL=opencode/kimi-k2.6`
  - `OPENCLAW_LIVE_ACP_BIND_IMAGE_PROBE=1`（或 `on`/`true`/`yes`）以强制开启图像探测；任何其他值都会强制关闭。默认情况下，除 `opencode` 外的每个代理都会运行。
  - `OPENCLAW_LIVE_ACP_BIND_REQUIRE_CRON=1`
  - `OPENCLAW_LIVE_ACP_BIND_PARENT_MODEL=openai/gpt-5.6-luna`
- Notes:
  - 这条通道使用网关的 `chat.send` 接口，并带有仅管理员可见的合成 originating-route 字段，因此测试可以附加消息通道上下文，而无需伪装成外部投递。
  - 当 `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` 未设置时，测试会使用嵌入式 `acpx` 插件内置的代理注册表，针对所选的 ACP harness 代理。
  - 绑定会话的 cron MCP 创建默认是尽力而为，因为外部 ACP harness 可能会在绑定/图像证明通过后取消 MCP 调用；将 `OPENCLAW_LIVE_ACP_BIND_REQUIRE_CRON=1` 设为严格模式，以便让该绑定后的 cron 探测变得严格。

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

单代理 Docker 配方：

```bash
pnpm test:docker:live-acp-bind:claude
pnpm test:docker:live-acp-bind:codex
pnpm test:docker:live-acp-bind:droid
pnpm test:docker:live-acp-bind:gemini
pnpm test:docker:live-acp-bind:opencode
```

Docker 说明：

- Docker 运行器位于 `scripts/test-live-acp-bind-docker.sh`。
- 默认情况下，它会依次对聚合的实时 CLI 代理运行 ACP 绑定冒烟测试：`claude`、`codex`，然后是 `gemini`。
- 使用 `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=codex`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=droid`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` 或 `OPENCLAW_LIVE_ACP_BIND_AGENTS=opencode` 可以缩小矩阵范围。
- 它会将匹配的 CLI 认证材料暂存到容器中，然后在缺失时安装所需的实时 CLI（`@anthropic-ai/claude-code`、`@openai/codex`、通过 `https://app.factory.ai/cli` 的 Factory Droid、`@google/gemini-cli` 或 `opencode-ai`）。ACP 后端本身是来自官方 `acpx` 插件的嵌入式 `acpx/runtime` 包。
- Droid Docker 变体会暂存 `~/.factory` 配置，转发 `FACTORY_API_KEY`，并要求该 API 密钥，因为本地 Factory OAuth/密钥环认证无法移植到容器中。它使用 ACPX 内置的 `droid exec --output-format acp` 注册条目。
- OpenCode Docker 变体是一个严格的单代理回归通道。它会根据 `OPENCLAW_LIVE_ACP_BIND_OPENCODE_MODEL`（默认 `opencode/kimi-k2.6`）写入一个临时的 `OPENCODE_CONFIG_CONTENT` 默认模型。
- 直接的 `acpx` CLI 调用仅用于在网关之外手动/临时比较行为。Docker ACP 绑定冒烟测试使用的是 OpenClaw 内嵌的 `acpx` 运行时后端。

## Live: Codex app-server harness 冒烟测试

- Goal: validate the plugin-owned Codex harness through the normal gateway
  `agent` method:
  - load the bundled `codex` plugin
  - select an OpenAI model through `/model <ref> --runtime codex`
  - send a first gateway agent turn with the requested thinking level
  - send a second turn to the same OpenClaw session and verify the app-server
    thread can resume
  - run `/codex status` and `/codex models` through the same gateway command
    path
  - optionally run two Guardian-reviewed escalated shell probes: one benign
    command that should be approved and one fake-secret upload that should be
    denied so the agent asks back
- Test: `src/gateway/gateway-codex-harness.live.test.ts`
- Enable: `OPENCLAW_LIVE_CODEX_HARNESS=1`
- Harness baseline model: `openai/gpt-5.6-luna`
- Fresh OpenAI API-key selection default: `openai/gpt-5.6`
- Default thinking: `low`
- Model override: `OPENCLAW_LIVE_CODEX_HARNESS_MODEL=openai/<model>`
- Thinking override: `OPENCLAW_LIVE_CODEX_HARNESS_THINKING=<level>`
- Non-default model effort assertion:
  `OPENCLAW_LIVE_CODEX_HARNESS_EXPECTED_EFFORT=<level>`
- Matrix override: `OPENCLAW_LIVE_CODEX_HARNESS_TARGETS=<model>=<thinking>,...`
- Auth mode: `OPENCLAW_LIVE_CODEX_HARNESS_AUTH=codex-auth` (default) uses the
  copied Codex login; `api-key` uses `OPENAI_API_KEY` through Codex app-server.
- Optional image probe: `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1`
- Optional MCP/tool probe: `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1`
- Optional Guardian probe: `OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1`
- Optional resume stress: `OPENCLAW_LIVE_CODEX_HARNESS_RESUME_STRESS=1` adds
  four history turns, then closes and restarts the Gateway and Codex app-server
  three times while requiring the same native thread id and conversation
  history. Override the bounded counts with
  `OPENCLAW_LIVE_CODEX_HARNESS_RESUME_STRESS_HISTORY_TURNS` (1-20) and
  `OPENCLAW_LIVE_CODEX_HARNESS_RESUME_STRESS_RESTARTS` (1-10).
- Optional fan-out stress: set `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1`
  and `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_COUNT` (1-12). The harness starts
  every child concurrently, waits for every terminal run, and verifies each
  unique child reply and native thread identity.
- Optional compaction stress: `OPENCLAW_LIVE_CODEX_HARNESS_COMPACTION_STRESS=1`
  generates bounded native tool output, requires automatic compaction events,
  verifies the persisted compaction count and hidden-marker recall, restarts
  the Gateway and physical Codex app-server, then repeats the output and
  compaction wave. Tune the bounded work with
  `OPENCLAW_LIVE_CODEX_HARNESS_COMPACTION_STRESS_TURNS` (1-8) and
  `OPENCLAW_LIVE_CODEX_HARNESS_LARGE_OUTPUT_BYTES` (100000-800000).
- Full direct-API context: `OPENCLAW_LIVE_CODEX_HARNESS_FULL_CONTEXT=1` applies
  the `922000` context and `700000` total compaction limits, sends dense bounded
  user turns, runs two explicit native compaction checkpoints per wave, and
  continues with later turns after each checkpoint. It requires
  `OPENCLAW_LIVE_CODEX_HARNESS_AUTH=api-key` plus an absolute
  `OPENCLAW_LIVE_CODEX_HARNESS_MODEL_CATALOG` path. The catalog must expose the
  selected model with `max_context_window: 922000` so Codex does not clamp the
  override back to its normal catalog window. The ordinary reduced-threshold
  stress above keeps the stricter automatic-compaction and hidden-marker
  retention assertions.
- Optional loop-relay opt-out probe:
  `OPENCLAW_LIVE_CODEX_HARNESS_DISABLE_LOOP_RELAY=1`
- The requested thinking preference may map to the nearest effort advertised
  by Codex for that model. For example, Luna maps `minimal` to `low`.
- Known Codex catalog models derive that exact native effort automatically.
  Unknown model overrides must state the expected mapped effort.
- The smoke forces provider/model `agentRuntime.id: "codex"` so a broken Codex
  harness cannot pass by silently falling back to OpenClaw.
- Auth: Codex app-server auth from the local Codex subscription login, or
  `OPENAI_API_KEY` when `OPENCLAW_LIVE_CODEX_HARNESS_AUTH=api-key`. Docker can
  copy `~/.codex/auth.json` and `~/.codex/config.toml` for subscription runs.

本地配方：

```bash
OPENCLAW_LIVE_CODEX_HARNESS=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MODEL=openai/gpt-5.6-luna \
  pnpm test:live -- src/gateway/gateway-codex-harness.live.test.ts
```

Docker 配方：

```bash
pnpm test:docker:live-codex-harness
```

Restart and history stress:

```bash
OPENCLAW_LIVE_CODEX_HARNESS_RESUME_STRESS=1 \
pnpm test:docker:live-codex-harness
```

Fan-out, large-output, compaction, and restart stress:

```bash
OPENCLAW_LIVE_CODEX_HARNESS_AUTH=api-key \
  OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_COUNT=8 \
  OPENCLAW_LIVE_CODEX_HARNESS_RESUME_STRESS=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_COMPACTION_STRESS=1 \
  pnpm test:docker:live-codex-harness
```

Full native Codex `922000` input-budget compaction stress:

```bash
OPENCLAW_LIVE_CODEX_HARNESS=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_AUTH=api-key \
  OPENCLAW_LIVE_CODEX_HARNESS_FULL_CONTEXT=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MODEL_CATALOG=/absolute/path/to/models-api-1m.json \
  OPENCLAW_LIVE_CODEX_HARNESS_MODEL=openai/gpt-5.6-terra \
  OPENCLAW_LIVE_CODEX_HARNESS_THINKING=medium \
  OPENCLAW_LIVE_CODEX_HARNESS_COMPACTION_STRESS_TURNS=8 \
  OPENCLAW_LIVE_CODEX_HARNESS_LARGE_OUTPUT_BYTES=800000 \
  pnpm test:live -- src/gateway/gateway-codex-harness.live.test.ts
```

GPT-5.6 native Codex matrix:

```bash
OPENCLAW_LIVE_CODEX_HARNESS_AUTH=api-key \
  OPENCLAW_LIVE_CODEX_HARNESS_TARGETS='openai/gpt-5.6-sol=ultra,openai/gpt-5.6-terra=ultra,openai/gpt-5.6-luna=max' \
  pnpm test:docker:live-codex-harness
```

## Live: OpenAI repeated compaction

- Goal: exercise the embedded OpenClaw `openai-responses` agent loop through at
  least two real automatic compactions, then verify a durable marker survives.
- Test: `src/agents/sessions/agent-session.openai-compaction.live.test.ts`
- Enable: `OPENCLAW_LIVE_OPENAI_COMPACTION=1`
- Default model: `gpt-5.6-luna`
- Model override: `OPENCLAW_LIVE_OPENAI_COMPACTION_MODEL=<model>`
- The normal stress mode uses a reduced client context budget to reach the same
  real compaction path with bounded API spend.
- Full-context mode sets the client budget to `922000` and compaction reserve to
  `222000`, so automatic compaction starts at `700000`. It also requires an
  observed provider input count above the `272000` long-context pricing boundary.

Bounded live recipe:

```bash
OPENCLAW_LIVE_TEST=1 \
  OPENCLAW_LIVE_OPENAI_COMPACTION=1 \
  pnpm test:live -- src/agents/sessions/agent-session.openai-compaction.live.test.ts
```

Full `922000` input-budget recipe:

```bash
OPENCLAW_LIVE_TEST=1 \
  OPENCLAW_LIVE_OPENAI_COMPACTION=1 \
  OPENCLAW_LIVE_OPENAI_COMPACTION_FULL=1 \
  OPENCLAW_LIVE_OPENAI_COMPACTION_MODEL=gpt-5.6-terra \
  pnpm test:live -- src/agents/sessions/agent-session.openai-compaction.live.test.ts
```

<Warning>
The full mode deliberately crosses OpenAI's long-context pricing boundary and
can make several large API calls. Use it only with explicit spend approval.
</Warning>

Fresh OpenAI API-key default:

```bash
OPENCLAW_LIVE_GATEWAY_OPENAI_API_DEFAULT=1 \
  OPENCLAW_LIVE_GATEWAY_PROVIDERS=openai \
  OPENCLAW_LIVE_GATEWAY_THINKING=off \
  pnpm test:live -- src/gateway/gateway-models.profiles.live.test.ts
```

这个证明不设置 `OPENCLAW_LIVE_GATEWAY_MODELS`，通过新鲜的 onboarding inference-selection seam 解析模型，断言 `openai/gpt-5.6`，然后使用该解析出的模型运行一次真实的 gateway 回合。

GPT-5.6 内嵌 OpenClaw 矩阵：

```bash
OPENCLAW_LIVE_GATEWAY_THINKING=ultra \
  OPENCLAW_LIVE_GATEWAY_PROVIDERS=openai \
  OPENCLAW_LIVE_GATEWAY_MODELS='openai/gpt-5.6-sol,openai/gpt-5.6-terra,openai/gpt-5.6-luna' \
  pnpm test:live -- src/gateway/gateway-models.profiles.live.test.ts
```

Docker 说明：

- Docker 运行器位于 `scripts/test-live-codex-harness-docker.sh`。
- 它传递 `OPENAI_API_KEY`，在存在时复制 Codex CLI 认证文件，将 `@openai/codex` 安装到可写的挂载 npm 前缀中，准备源代码树，然后只运行 Codex-harness live test。
- Docker 默认启用图片、MCP/工具和 Guardian 探测。需要更窄的调试运行时，设置 `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0` 或 `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0` 或 `OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0`。
- Docker 使用相同的显式 Codex runtime 配置，因此旧别名或 OpenClaw 回退无法掩盖 Codex harness 回归。
- 矩阵目标在一个容器中按顺序运行。Docker 脚本会按目标数量扩展其默认 35 分钟超时；任何外层 shell 或 CI 超时都必须允许相同的总时长。规范 CI 会把每个 GPT-5.6 目标放在独立 shard 中。

### 推荐的 live 配方

范围窄、明确的 allowlist 最快，也最不容易出问题：

- 单模型，直接方式（无 gateway）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.6-luna" pnpm test:live src/agents/models.profiles.live.test.ts`

- 小模型直接 profile：
  - `OPENCLAW_LIVE_MODELS=small pnpm test:live src/agents/models.profiles.live.test.ts`

- 小模型 gateway profile：
  - `OPENCLAW_LIVE_GATEWAY_MODELS=small pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Ollama Cloud API 冒烟：
  - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA=1 OPENCLAW_LIVE_OLLAMA_BASE_URL=https://ollama.com OPENCLAW_LIVE_OLLAMA_MODEL=glm-5.1:cloud OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=0 pnpm test:live -- extensions/ollama/ollama.live.test.ts`

- 单模型，gateway smoke：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.6-luna" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多个提供方的工具调用：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.6-luna,anthropic/claude-opus-4-6,google/gemini-3.5-flash,deepseek/deepseek-v4-flash,zai/glm-5.1,minimax/MiniMax-M3" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Z.AI Coding Plan GLM-5.2 直接冒烟：
  - `ZAI_CODING_LIVE_TEST=1 pnpm test:live src/agents/zai.live.test.ts`

- Google 重点（Gemini API key + Antigravity）：
  - Gemini（API key）：`OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3.5-flash" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity（OAuth）：`OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 自适应思考冒烟（来自私有 QA CLI 的 `qa manual` - 需要 `OPENCLAW_ENABLE_PRIVATE_QA_CLI=1` 和源码检出；见 [QA 概览](/concepts/qa-e2e-automation)）：
  - Gemini 3 动态默认：`OPENCLAW_ENABLE_PRIVATE_QA_CLI=1 pnpm openclaw qa manual --provider-mode live-frontier --model google/gemini-3.1-pro-preview --alt-model google/gemini-3.1-pro-preview --message '/think adaptive Reply exactly: GEMINI_ADAPTIVE_OK' --timeout-ms 180000`
  - Gemini 2.5 动态预算：`OPENCLAW_ENABLE_PRIVATE_QA_CLI=1 pnpm openclaw qa manual --provider-mode live-frontier --model google/gemini-2.5-flash --alt-model google/gemini-2.5-flash --message '/think adaptive Reply exactly: GEMINI25_ADAPTIVE_OK' --timeout-ms 180000`

说明：

- `google/...` 使用 Gemini API（API key）。
- `google-antigravity/...` 使用 Antigravity OAuth 桥接（Cloud Code Assist 风格的 agent 端点）。
- `google-gemini-cli/...` 使用你机器上的本地 Gemini CLI（独立的认证 + 工具链特性）。
- Gemini API 与 Gemini CLI：
  - API：OpenClaw 通过 HTTP 调用 Google 托管的 Gemini API（API key / profile auth）；这也是大多数人所说的“Gemini”。
  - CLI：OpenClaw 调用本地 `gemini` 二进制；它有自己的认证，并且行为可能不同（流式传输/工具支持/版本偏差）。

## Live：模型矩阵（我们覆盖什么）

Live 是可选启用的，所以没有固定的“CI 模型列表”。`OPENCLAW_LIVE_MODELS=modern` / `OPENCLAW_LIVE_GATEWAY_MODELS=modern`（以及它们的 `all` 别名）会运行来自 `src/agents/live-model-filter.ts` 中 `HIGH_SIGNAL_LIVE_MODEL_PRIORITY` 的精选优先列表，顺序如下：

| Provider/model                                | Notes      |
| --------------------------------------------- | ---------- |
| `anthropic/claude-opus-5`                     |            |
| `anthropic/claude-opus-4-8`                   |            |
| `anthropic/claude-sonnet-5`                   |            |
| `anthropic/claude-sonnet-4-6`                 |            |
| `anthropic/claude-opus-4-7`                   |            |
| `google/gemini-3.1-pro-preview`               | Gemini API |
| `google/gemini-3.5-flash`                     | Gemini API |
| `cohere/command-a-plus-05-2026`               |            |
| `moonshot/kimi-k3`                            |            |
| `anthropic/claude-opus-4-6`                   |            |
| `deepseek/deepseek-v4-flash`                  |            |
| `deepseek/deepseek-v4-pro`                    |            |
| `minimax/MiniMax-M3`                          |            |
| `openai/gpt-5.5`                              |            |
| `openrouter/openai/gpt-5.2-chat`              |            |
| `openrouter/minimax/minimax-m2.7`             |            |
| `opencode-go/glm-5`                           |            |
| `openrouter/ai21/jamba-large-1.7`             |            |
| `xai/grok-4.5`                                |            |
| `xai/grok-4.20-0309-reasoning`                |            |
| `zai/glm-5.1`                                 |            |
| `fireworks/accounts/fireworks/models/glm-5p1` |            |
| `minimax-portal/minimax-m3`                   |            |

精选的 **小模型** 列表（`OPENCLAW_LIVE_MODELS=small` / `OPENCLAW_LIVE_GATEWAY_MODELS=small`）来自 `SMALL_LIVE_MODEL_PRIORITY`：

| 提供方/模型               |
| ------------------------ |
| `lmstudio/qwen/qwen3.5-9b` |
| `vllm/qwen/qwen3-8b`     |
| `sglang/qwen/qwen3-8b`   |
| `ollama/gemma3:4b`       |
| `openrouter/qwen/qwen3.5-9b` |
| `openrouter/z-ai/glm-5.1` |
| `openrouter/z-ai/glm-5`  |
| `zai/glm-5.1`            |

关于 modern 列表的说明：

- `codex` 和 `codex-cli` 提供方不包含在默认的 modern 扫描中（它们覆盖的是 CLI 后端/ACP 行为，已在上方单独测试）。`openai/gpt-5.5` 本身默认通过 Codex app-server harness 路由；请参见 [Live：Codex app-server harness 冒烟测试](#live-codex-app-server-harness-smoke)。
- `fireworks`、`google`、`openrouter` 和 `xai` 在 modern 扫描中只运行其显式精选的模型 id（不会自动扩展为“此提供方的所有模型”）。
- 请在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中至少包含一个支持图像的模型（Claude/Gemini/OpenAI 系列 vision 变体等），以覆盖图像探测。

使用工具 + 图像，针对跨提供方的手选集合运行网关冒烟测试：

```bash
OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.6-luna,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3.5-flash,google-antigravity/claude-opus-4-6-thinking,deepseek/deepseek-v4-flash,zai/glm-5.1,minimax/MiniMax-M3" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts
```

在精选列表之外的可选额外覆盖（有则更好，选择一个你已启用且支持“工具”的模型）：

- Mistral：`mistral/...`
- Cerebras：`cerebras/...`（如果你有权限）
- LM Studio：`lmstudio/...`（本地；工具调用取决于 API 模式）

### 聚合器 / 备用网关

如果你已启用密钥，也可以通过以下方式测试：

- OpenRouter：`openrouter/...`（数百个模型；使用 `openclaw models scan` 查找支持工具 + 图像的候选项）
- OpenCode：`opencode/...` 用于 Zen，`opencode-go/...` 用于 Go（通过 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 认证）

你还可以在 live 矩阵中包含更多提供方（如果你有凭据/配置）：

- 内置：`anthropic`, `cerebras`, `github-copilot`, `google`, `google-antigravity`, `google-gemini-cli`, `google-vertex`, `groq`, `mistral`, `openai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `zai`
- 通过 `models.providers`（自定义端点）：`minimax`（云/API），以及任何 OpenAI/Anthropic 兼容代理（LM Studio、vLLM、LiteLLM 等）

<Tip>
不要在文档中硬编码“所有模型”。权威列表是你机器上 `discoverModels(...)` 返回的内容，再加上可用的密钥。
</Tip>

## 凭据（切勿提交）

Live 测试发现凭据的方式与 CLI 相同。实际影响：

- 如果 CLI 可用，live 测试也应该能找到相同的密钥。
- 如果某个 live 测试提示“no creds”，排查方式应与排查 `openclaw models list` / 模型选择相同。

- 每个代理的 auth 配置文件：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（这就是 live 测试里所说的“profile keys”）
- 配置：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）
- 旧版 OAuth 目录：`~/.openclaw/credentials/`（存在时会复制到临时的 live home 中，但不是主 profile-key 存储）
- 本地 live 运行会复制当前生效的配置（去掉 `agents.*.workspace` / `agentDir` 覆盖项）以及每个代理的 `auth-profiles.json`——而不会复制该代理目录中的其他内容，因此 `workspace/` 和 `sandboxes/` 数据永远不会进入临时 home——另外还会复制旧版 `credentials/` 目录以及受支持的外部 CLI 认证文件/目录（`.claude.json`、`.claude/.credentials.json`、`.claude/settings*.json`、`.claude/backups`、`.codex/auth.json`、`.codex/config.toml`、`.gemini`、`.minimax`）到一个临时测试 home 中。

如果你想依赖环境变量中的密钥，请在本地测试前先导出它们，或使用下面的 Docker 运行器并显式指定 `OPENCLAW_PROFILE_FILE`。

## Deepgram 实时（音频转录）

- 测试：`extensions/deepgram/audio.live.test.ts`
- 启用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live extensions/deepgram/audio.live.test.ts`

## BytePlus 编码计划 live

- 测试：`extensions/byteplus/live.test.ts`
- 启用：`BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live extensions/byteplus/live.test.ts`
- 可选模型覆盖：`BYTEPLUS_CODING_MODEL=ark-code-latest`

## ComfyUI 工作流媒体 live

- 测试：`extensions/comfy/comfy.live.test.ts`
- 启用：`OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- 范围：
  - 测试内置的 comfy 图像、视频和 `music_generate` 路径
  - 除非 `plugins.entries.comfy.config.<capability>` 已配置，否则会跳过每项能力
  - 在更改 comfy 工作流提交、轮询、下载或插件注册后会很有用

## 图像生成 live

- 测试：`test/image-generation.runtime.live.test.ts`
- 命令：`pnpm test:live test/image-generation.runtime.live.test.ts`
- 运行器：`pnpm test:live:media image`
- 范围：
  - 枚举每个已注册的图像生成 provider 插件
  - 探测前优先使用已导出的 provider 环境变量
  - 默认优先使用 live/env API key，而不是已存储的 auth profiles，因此 `auth-profiles.json` 中过期的测试密钥不会掩盖真实的 shell 凭据
  - 跳过没有可用 auth/profile/model 的 provider
  - 通过共享的图像生成 runtime 运行每个已配置 provider：
    - `<provider>:generate`
    - 当 provider 声明支持编辑时运行 `<provider>:edit`
- 当前覆盖的内置 provider：
  - `deepinfra`
  - `fal`
  - `google`
  - `minimax`
  - `openai`
  - `openrouter`
  - `vydra`
  - `xai`
- 可选缩小范围：
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google,openrouter,xai"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="deepinfra"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-2,google/gemini-3.1-flash-image,openrouter/google/gemini-3.1-flash-image-preview,xai/grok-imagine-image"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit,openrouter:generate,xai:default-generate,xai:default-edit"`
- 可选认证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以强制使用 profile 存储认证并忽略仅环境变量覆盖

对于随 CLI 一起发布的路径，在 provider/runtime live 测试通过后，再增加一个 `infer` 烟雾测试：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_INFER_CLI_TEST=1 pnpm test:live -- test/image-generation.infer-cli.live.test.ts
openclaw infer image providers --json
openclaw infer image generate \
  --model google/gemini-3.1-flash-image \
  --prompt "Minimal flat test image: one blue square on a white background, no text." \
  --output ./openclaw-infer-image-smoke.png \
  --json
```

这覆盖了 CLI 参数解析、config/default-agent 解析、捆绑插件激活、共享的图像生成 runtime，以及 live provider 请求。插件依赖应在 runtime 加载之前就已存在。

## 音乐生成 live

- 测试: `extensions/music-generation-providers.live.test.ts`
- 启用: `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- 运行器: `pnpm test:live:media music`
- 范围:
  - 练习共享的打包音乐生成提供方路径
  - 目前覆盖 `fal`、`google`、`minimax` 和 `openrouter`
  - 在探测前使用已导出的提供方环境变量
  - 默认优先使用 live/env API 密钥于已存储的认证配置文件，这样 `auth-profiles.json` 中陈旧的测试密钥不会掩盖真实的 shell 凭据
  - 跳过没有可用认证/配置文件/模型的提供方
  - 在可用时运行两种声明的运行时模式：
    - 使用仅提示输入的 `generate`
    - 当提供方声明 `capabilities.edit.enabled` 时使用 `edit`
  - `comfy` 有自己单独的 live 文件，不在这个共享扫描中
- 可选缩小范围：
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.6"`
- 可选认证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以强制使用 profile 存储认证并忽略仅环境变量覆盖

## 视频生成 live

- 测试：`extensions/video-generation-providers.live.test.ts`
- 启用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- Harness：`pnpm test:live:media video`
- 范围：
  - 在 `alibaba`、`byteplus`、`deepinfra`、`fal`、`google`、`minimax`、`openai`、`openrouter`、`pixverse`、`qwen`、`runway`、`together`、`vydra`、`xai` 之间执行共享的打包视频生成 provider 路径
  - 默认使用发布安全的冒烟路径：每个 provider 一次 text-to-video 请求、一个一秒的 lobster 提示词，以及来自 `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` 的每个 provider 操作上限（默认 `180000`）
  - 默认跳过 FAL，因为 provider 侧队列延迟可能会主导发布耗时；传入 `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="fal"`（或清空跳过列表）即可显式运行它
  - 在探测前优先使用已经导出的 provider 环境变量
  - 默认优先使用 live/env API keys，而不是存储的 auth profiles，因此 `auth-profiles.json` 中过时的测试 key 不会掩盖真实的 shell 凭据
  - 跳过没有可用 auth/profile/model 的 provider
  - 默认只运行 `generate`
  - 设置 `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` 也会在可用时运行已声明的 transform 模式：
    - 当 provider 声明 `capabilities.imageToVideo.enabled` 且所选 provider/model 在共享扫描中接受 buffer-backed 本地图像输入时，运行 `imageToVideo`
    - 当 provider 声明 `capabilities.videoToVideo.enabled` 且所选 provider/model 在共享扫描中接受 buffer-backed 本地视频输入时，运行 `videoToVideo`
  - 当前在共享扫描中已声明但被跳过的 `imageToVideo` provider：
    - `vydra`（此通道不支持 buffer-backed 本地图像输入）
  - Vydra 的特定覆盖：
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - 该文件默认运行 `veo3` 文本生成视频，以及一个使用远程图像 URL 夹具的 `kling` 图像生成视频通道（可通过 `OPENCLAW_LIVE_VYDRA_KLING_IMAGE_URL` 覆盖）。
  - Provider-specific xAI 覆盖：
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_XAI_VIDEO=1 pnpm test:live -- extensions/xai/xai.live.test.ts -t "classic Grok Imagine"`
    - 经典案例会先生成一个方形本地 PNG 首帧，省略几何参数，请求一个一秒钟的图像生成视频片段，轮询直到完成，并验证下载的 buffer。
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_XAI_VIDEO=1 pnpm test:live -- extensions/xai/xai.live.test.ts -t "Grok Imagine Video 1.5"`
    - 1.5 案例会生成一个本地 PNG 首帧，请求一个一秒钟的 1080P 图像生成视频片段，轮询直到完成，并验证下载的 buffer。
  - 当前 `videoToVideo` live 覆盖：
    - 仅当所选模型解析为 `gen4_aleph` 时运行 `runway`
  - 共享扫描中当前已声明但被跳过的 `videoToVideo` provider：
    - `alibaba`、`google`、`openai`、`qwen`、`xai`，因为这些路径目前需要远程 `http(s)` 引用 URL，而不是 buffer-backed 本地输入
- 可选缩小范围：
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="deepinfra,google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_SKIP_PROVIDERS=""` 以包含默认扫描中的每个 provider，包括 FAL
  - `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS=60000` 以降低每个 provider 的操作上限，进行更激进的烟雾运行
- 可选认证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以强制使用 profile 存储认证并忽略仅环境变量覆盖

## 媒体 live 运行器

- 命令：`pnpm test:live:media`
- 入口点：`test/e2e/qa-lab/media/hosted-media-provider-live.ts`，它会针对每个选定的 suite 运行 `pnpm test:live -- <suite-test-file>`，因此心跳和静默模式行为会与其他 `pnpm test:live` 运行保持一致。
- 目的：
  - 通过一个仓库原生入口点运行共享的 image、music 和 video live suites
  - 自动从 `~/.profile` 加载缺失的 provider 环境变量
  - 默认自动将每个 suite 缩小到当前具有可用认证的 provider
- 标志：
  - `--providers <csv>` 全局 provider 过滤器；`--image-providers` / `--music-providers` / `--video-providers` 将过滤器限定到单个 suite
  - `--all-providers` 跳过基于认证的自动过滤
  - `--allow-empty` 当过滤后没有可运行的 provider 时以 `0` 退出
  - `--quiet` / `--no-quiet` 传递给 `test:live`
- 示例：
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## 相关

- [测试](/help/testing) - 单元、集成、QA 和 Docker 套件
