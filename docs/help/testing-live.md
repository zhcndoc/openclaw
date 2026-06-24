---
summary: "实时（联网）测试：模型矩阵、CLI 后端、ACP、媒体提供商、凭据"
read_when:
  - 运行实时模型矩阵 / CLI 后端 / ACP / 媒体提供商冒烟测试
  - 调试实时测试的凭据解析
  - 添加新的特定提供商实时测试
title: "测试：实时套件"
sidebarTitle: "实时测试"
---

如需快速开始、QA 运行器、单元/集成套件以及 Docker 流程，请参见
[测试](/help/testing)。本页涵盖 **实时**（联网）测试
套件：模型矩阵、CLI 后端、ACP 和媒体提供商实时测试，以及
凭据处理。

## 实时：本地冒烟命令

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

`voicecall smoke` 默认是干运行，除非同时提供 `--yes`。仅在你
有意发起真实通知电话时才使用 `--yes`。对于 Twilio、Telnyx 和
Plivo，成功的就绪检查需要一个公开的 webhook URL；本地回环/私有
回退方案按设计会被拒绝。

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
- Android 完整设置详情：[Android App](/platforms/android)

## 实时：模型冒烟（配置文件密钥）

实时测试分为两层，以便隔离故障：

- “Direct model” 告诉我们，提供商/模型在给定密钥下是否确实能够响应。
- “Gateway smoke” 告诉我们，该模型的完整 gateway+agent 流水线是否正常工作（会话、历史、工具、沙盒策略等）。

### 第 1 层：直接模型补全（无 gateway）

- Test: `src/agents/models.profiles.live.test.ts`
- Goal:
  - Enumerate discovered models
  - Use `getApiKeyForModel` to select models you have creds for
  - Run a small completion per model (and targeted regressions where needed)
- How to enable:
  - `pnpm test:live` (or `OPENCLAW_LIVE_TEST=1` if invoking Vitest directly)
- Set `OPENCLAW_LIVE_MODELS=modern`, `small`, or `all` (alias for modern) to actually run this suite; otherwise it skips to keep `pnpm test:live` focused on gateway smoke
- How to select models:
  - `OPENCLAW_LIVE_MODELS=modern` to run the modern allowlist (Opus/Sonnet 4.6+, GPT-5.2 + Codex, Gemini 3, DeepSeek V4, GLM 5.1, MiniMax M3, Grok 4.3)
  - `OPENCLAW_LIVE_MODELS=small` to run the constrained small-model allowlist (Qwen 8B/9B local-compatible routes, Ollama Gemma, OpenRouter Qwen/GLM, and Z.AI GLM)
  - `OPENCLAW_LIVE_MODELS=all` is an alias for the modern allowlist
  - or `OPENCLAW_LIVE_MODELS="openai/gpt-5.5,anthropic/claude-opus-4-6,..."` (comma allowlist)
  - Local Ollama small-model runs default to `http://127.0.0.1:11434`; set `OPENCLAW_LIVE_OLLAMA_BASE_URL` only for LAN, custom, or Ollama Cloud endpoints.
  - Modern/all and small sweeps default to their curated caps; set `OPENCLAW_LIVE_MAX_MODELS=0` for an exhaustive selected-profile sweep or a positive number for a smaller cap.
  - Exhaustive sweeps use `OPENCLAW_LIVE_TEST_TIMEOUT_MS` for the whole direct-model test timeout. Default: 60 minutes.
  - Direct-model probes run with 20-way parallelism by default; set `OPENCLAW_LIVE_MODEL_CONCURRENCY` to override.
- How to select providers:
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (comma allowlist)
- Where keys come from:
  - By default: profile store and env fallbacks
  - Set `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` to enforce **profile store** only
- Why this exists:
  - Separates "provider API is broken / key is invalid" from "gateway agent pipeline is broken"
  - Contains small, isolated regressions (example: OpenAI Responses/Codex Responses reasoning replay + tool-call flows)

### 第 2 层：Gateway + 开发 agent 冒烟（即“@openclaw”实际执行的内容）

- Test: `src/gateway/gateway-models.profiles.live.test.ts`
- Goal:
  - Spin up an in-process gateway
  - Create/patch a `agent:dev:*` session (model override per run)
  - Iterate models-with-keys and assert:
    - "meaningful" response (no tools)
    - a real tool invocation works (read probe)
    - optional extra tool probes (exec+read probe)
    - OpenAI regression paths (tool-call-only → follow-up) keep working
- Probe details (so you can explain failures quickly):
  - `read` probe: the test writes a nonce file in the workspace and asks the agent to `read` it and echo the nonce back.
  - `exec+read` probe: the test asks the agent to `exec`-write a nonce into a temp file, then `read` it back.
  - image probe: the test attaches a generated PNG (cat + randomized code) and expects the model to return `cat <CODE>`.
  - Implementation reference: `src/gateway/gateway-models.profiles.live.test.ts` and `test/helpers/live-image-probe.ts`.
- How to enable:
  - `pnpm test:live` (or `OPENCLAW_LIVE_TEST=1` if invoking Vitest directly)
- How to select models:
  - Default: modern allowlist (Opus/Sonnet 4.6+, GPT-5.2 + Codex, Gemini 3, DeepSeek V4, GLM 4.7, MiniMax M3, Grok 4.3)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=small` to run the same constrained small-model allowlist through the full gateway+agent pipeline
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` is an alias for the modern allowlist
  - Or set `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (or comma list) to narrow
  - Modern/all and small gateway sweeps default to their curated caps; set `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` for an exhaustive selected sweep or a positive number for a smaller cap.
- How to select providers (avoid "OpenRouter everything"):
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (comma allowlist)
- Tool + image probes are always on in this live test:
  - `read` probe + `exec+read` probe (tool stress)
  - image probe runs when the model advertises image input support
  - Flow (high level):
    - Test generates a tiny PNG with "CAT" + random code (`test/helpers/live-image-probe.ts`)
    - Sends it via `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - Gateway parses attachments into `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - Embedded agent forwards a multimodal user message to the model
    - Assertion: reply contains `cat` + the code (OCR tolerance: minor mistakes allowed)

<Tip>
要查看你机器上可以测试的内容（以及精确的 `provider/model` id），请运行：

```bash
openclaw models list
openclaw models list --json
```

</Tip>

## 实时：CLI 后端冒烟（Claude、Gemini 或其他本地 CLI）

- 测试：`src/gateway/gateway-cli-backend.live.test.ts`
- 目标：使用本地 CLI 后端验证 Gateway + agent 流水线，而不触碰你的默认配置。
- 各后端特定的冒烟默认值位于所属扩展的 `cli-backend.ts` 定义中。
- 启用：
  - `pnpm test:live`（如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- 默认值：
  - 默认提供商/模型：`claude-cli/claude-sonnet-4-6`
  - 命令/参数/图像行为来自所属 CLI 后端插件元数据。
- 覆盖项（可选）：
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/claude"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 以发送一个真实的图像附件（路径会注入到提示词中）。Docker 配方默认关闭，除非显式请求。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 以将图像文件路径作为 CLI 参数传递，而不是注入到提示词中。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"`（或 `"list"`）用于在设置了 `IMAGE_ARG` 时控制图像参数的传递方式。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 以发送第二轮并验证恢复流程。
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=1` 以启用 Claude Sonnet -> Opus 同会话连续性探测（当所选模型支持切换目标时）。Docker 配方默认关闭，以保证聚合可靠性。
  - `OPENCLAW_LIVE_CLI_BACKEND_MCP_PROBE=1` 以启用 MCP/工具回环探测。Docker 配方默认关闭，除非显式请求。

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
- 它会在仓库 Docker 镜像中以非 root 的 `node` 用户运行实时 CLI 后端冒烟测试。
- 它会从所属扩展解析 CLI 冒烟元数据，然后将匹配的 Linux CLI 包（`@anthropic-ai/claude-code` 或 `@google/gemini-cli`）安装到 `OPENCLAW_DOCKER_CLI_TOOLS_DIR` 中的可写缓存前缀（默认：`~/.cache/openclaw/docker-cli-tools`）。
- `pnpm test:docker:live-cli-backend:claude-subscription` 需要通过 `~/.claude/.credentials.json` 中的 `claudeAiOauth.subscriptionType` 或 `claude setup-token` 生成的 `CLAUDE_CODE_OAUTH_TOKEN` 提供可移植的 Claude Code 订阅 OAuth。它会先在 Docker 中证明直接的 `claude -p` 可用，然后在不保留 Anthropic API key 环境变量的情况下运行两轮 Gateway CLI 后端交互。此订阅通道默认禁用 Claude 的 MCP/工具和图像探测，因为 Claude 目前会通过额外用量计费而不是常规订阅方案限制来处理第三方应用使用。
- 现在的实时 CLI 后端冒烟测试会对 Claude 和 Gemini 执行相同的端到端流程：文本轮次、图像分类轮次，然后通过 gateway CLI 验证 MCP `cron` 工具调用。
- Claude 的默认冒烟测试还会将会话从 Sonnet 修补到 Opus，并验证恢复后的会话仍然记得之前的笔记。

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
  - `OPENCLAW_LIVE_ACP_BIND_CODEX_MODEL=gpt-5.5`
  - `OPENCLAW_LIVE_ACP_BIND_OPENCODE_MODEL=opencode/kimi-k2.6`
  - `OPENCLAW_LIVE_ACP_BIND_REQUIRE_TRANSCRIPT=1`
  - `OPENCLAW_LIVE_ACP_BIND_REQUIRE_CRON=1`
  - `OPENCLAW_LIVE_ACP_BIND_PARENT_MODEL=openai/gpt-5.5`
- 说明：
  - 该测试线使用网关的 `chat.send` 接口，并通过仅管理员可用的合成起始路由字段，让测试可以附加消息通道上下文，而无需伪装成外部投递。
  - 当 `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` 未设置时，测试会使用内置 `acpx` 插件中所选 ACP harness 代理的内建代理注册表。
  - 默认情况下，绑定后的会话 cron MCP 创建是尽力而为，因为外部 ACP harness 可能在绑定/图像证明通过后取消 MCP 调用；将 `OPENCLAW_LIVE_ACP_BIND_REQUIRE_CRON=1` 可使该绑定后的 cron 探针变为严格检查。

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
- 默认情况下，它会按顺序对聚合的实时 CLI 代理运行 ACP bind 冒烟测试：`claude`、`codex`，然后是 `gemini`。
- 使用 `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=codex`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=droid`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` 或 `OPENCLAW_LIVE_ACP_BIND_AGENTS=opencode` 可缩小矩阵范围。
- 它会将匹配的 CLI 认证材料放入容器，然后在缺失时安装所需的实时 CLI（`@anthropic-ai/claude-code`、`@openai/codex`、通过 `https://app.factory.ai/cli` 的 Factory Droid、`@google/gemini-cli` 或 `opencode-ai`）。ACP 后端本身是官方 `acpx` 插件中的嵌入式 `acpx/runtime` 包。
- Droid Docker 变体会暂存 `~/.factory` 配置，转发 `FACTORY_API_KEY`，并要求该 API key，因为本地 Factory OAuth/keyring 认证无法移植到容器中。它使用 ACPX 内置的 `droid exec --output-format acp` 注册项。
- OpenCode Docker 变体是一个严格的单代理回归通道。它会从 `OPENCLAW_LIVE_ACP_BIND_OPENCODE_MODEL`（默认 `opencode/kimi-k2.6`）写入临时的 `OPENCODE_CONFIG_CONTENT` 默认模型，并且 `pnpm test:docker:live-acp-bind:opencode` 需要绑定的助手转录，而不是接受通用的绑定后跳过。
- 直接的 `acpx` CLI 调用仅用于在 Gateway 之外比较行为的手动/临时路径。Docker ACP bind 冒烟测试会使用 OpenClaw 内嵌的 `acpx` 运行时后端。

## Live: Codex app-server harness 冒烟测试

- 目标：通过常规网关 `agent` 方法验证插件拥有的 Codex harness
  - 加载捆绑的 `codex` 插件
  - 选择 `openai/gpt-5.5`，这会默认将 OpenAI agent 回合路由到 Codex
  - 向已选中的 Codex harness 发送第一轮网关 agent 回合到 `openai/gpt-5.5`
  - 向同一个 OpenClaw 会话发送第二轮，并验证 app-server 线程可以恢复
  - 通过同一网关命令路径运行 `/codex status` 和 `/codex models`
  - 可选运行两个由 Guardian 复核的升级 shell 探测：一个应被批准的无害命令，以及一个应被拒绝的伪密钥上传，以便 agent 回问
- 测试：`src/gateway/gateway-codex-harness.live.test.ts`
- 启用：`OPENCLAW_LIVE_CODEX_HARNESS=1`
- 默认模型：`openai/gpt-5.5`
- 可选图像探测：`OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1`
- 可选 MCP/tool 探测：`OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1`
- 可选 Guardian 探测：`OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1`
- 该冒烟测试强制 provider/model 为 `agentRuntime.id: "codex"`，因此损坏的 Codex harness 不会通过静默回退到 OpenClaw 而蒙混过关。
- 认证：来自本地 Codex 订阅登录的 Codex app-server auth。Docker 冒烟在适用时也可以提供 `OPENAI_API_KEY` 用于非 Codex 探测，并可选复制 `~/.codex/auth.json` 和 `~/.codex/config.toml`。

本地配方：

```bash
OPENCLAW_LIVE_CODEX_HARNESS=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MODEL=openai/gpt-5.5 \
  pnpm test:live -- src/gateway/gateway-codex-harness.live.test.ts
```

Docker 配方：

```bash
pnpm test:docker:live-codex-harness
```

Docker 说明：

- Docker 运行器位于 `scripts/test-live-codex-harness-docker.sh`。
- 它会传入 `OPENAI_API_KEY`，在存在时复制 Codex CLI auth 文件，将 `@openai/codex` 安装到可写的挂载 npm 前缀中，暂存源码树，然后仅运行 Codex-harness live 测试。
- Docker 默认启用图像、MCP/tool 和 Guardian 探测。需要更窄的调试运行时，可设置 `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0` 或 `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0` 或 `OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0`。
- Docker 使用相同的显式 Codex runtime 配置，因此旧别名或 OpenClaw 回退无法掩盖 Codex harness 回归。

### 推荐的 live 配方

范围窄、明确的 allowlist 最快也最不容易出问题：

- 单模型，直接调用（无网关）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.5" pnpm test:live src/agents/models.profiles.live.test.ts`

- Small-model direct profile:
  - `OPENCLAW_LIVE_MODELS=small pnpm test:live src/agents/models.profiles.live.test.ts`

- Small-model gateway profile:
  - `OPENCLAW_LIVE_GATEWAY_MODELS=small pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Ollama Cloud API 冒烟：
  - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA=1 OPENCLAW_LIVE_OLLAMA_BASE_URL=https://ollama.com OPENCLAW_LIVE_OLLAMA_MODEL=glm-5.1:cloud OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=0 pnpm test:live -- extensions/ollama/ollama.live.test.ts`

- 单模型，网关冒烟：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多个提供方的工具调用：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.5,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,deepseek/deepseek-v4-flash,zai/glm-5.1,minimax/MiniMax-M3" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Z.AI Coding Plan GLM-5.2 direct smoke:
  - `ZAI_CODING_LIVE_TEST=1 pnpm test:live src/agents/zai.live.test.ts`

- Google focus (Gemini API key + Antigravity):
  - Gemini (API key): `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth): `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 自适应思考 smoke：
  - Gemini 3 动态默认：`pnpm openclaw qa manual --provider-mode live-frontier --model google/gemini-3.1-pro-preview --alt-model google/gemini-3.1-pro-preview --message '/think adaptive Reply exactly: GEMINI_ADAPTIVE_OK' --timeout-ms 180000`
  - Gemini 2.5 动态预算：`pnpm openclaw qa manual --provider-mode live-frontier --model google/gemini-2.5-flash --alt-model google/gemini-2.5-flash --message '/think adaptive Reply exactly: GEMINI25_ADAPTIVE_OK' --timeout-ms 180000`

说明：

- `google/...` 使用 Gemini API（API key）。
- `google-antigravity/...` 使用 Antigravity OAuth 桥接（Cloud Code Assist 风格的 agent 端点）。
- `google-gemini-cli/...` 使用你机器上的本地 Gemini CLI（独立的认证 + 工具链特性）。
- Gemini API 与 Gemini CLI：
  - API：OpenClaw 通过 HTTP 调用 Google 托管的 Gemini API（API key / profile auth）；这也是大多数人所说的“Gemini”。
  - CLI：OpenClaw 调用本地 `gemini` 二进制；它有自己的认证，并且行为可能不同（流式传输/工具支持/版本偏差）。

## Live: 模型矩阵（我们覆盖什么）

没有固定的“CI 模型列表”（live 是按需启用的），但以下是建议在带密钥的开发机上定期覆盖的 **推荐** 模型。

### 现代冒烟集合（工具调用 + 图像）

这是我们期望持续可用的“常见模型”运行集：

- OpenAI (non-Codex): `openai/gpt-5.5`
- OpenAI ChatGPT/Codex OAuth: `openai/gpt-5.5`
- Anthropic: `anthropic/claude-opus-4-6` (or `anthropic/claude-sonnet-4-6`)
- Google (Gemini API): `google/gemini-3.1-pro-preview` and `google/gemini-3-flash-preview` (avoid older Gemini 2.x models)
- Google (Antigravity): `google-antigravity/claude-opus-4-6-thinking` and `google-antigravity/gemini-3-flash`
- DeepSeek: `deepseek/deepseek-v4-flash` and `deepseek/deepseek-v4-pro`
- Z.AI (GLM): `zai/glm-5.1` (general API) or `zai/glm-5.2` (Coding Plan)
- MiniMax: `minimax/MiniMax-M3`

用工具 + 图像运行网关冒烟：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.5,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,deepseek/deepseek-v4-flash,zai/glm-5.1,minimax/MiniMax-M3" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基线：工具调用（Read + 可选 Exec）

每个提供方家族至少选一个：

- OpenAI: `openai/gpt-5.5`
- Anthropic: `anthropic/claude-opus-4-6`（或 `anthropic/claude-sonnet-4-6`）
- Google: `google/gemini-3-flash-preview`（或 `google/gemini-3.1-pro-preview`）
- DeepSeek: `deepseek/deepseek-v4-flash`
- Z.AI (GLM): `zai/glm-5.1` (general API) or `zai/glm-5.2` (Coding Plan)
- MiniMax: `minimax/MiniMax-M3`

可选的额外覆盖（有则更好）：

- xAI: `xai/grok-4.3`（或可用的最新版本）
- Mistral: `mistral/`…（选择你已启用的任一“tools”能力模型）
- Cerebras: `cerebras/`…（如果你有访问权限）
- LM Studio: `lmstudio/`…（本地；工具调用取决于 API 模式）

### 视觉：图像发送（附件 → 多模态消息）

在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中至少包含一个支持图像的模型（Claude/Gemini/OpenAI 的视觉能力变体等），以覆盖图像探测。

### 聚合器 / 备用网关

如果你启用了相关密钥，我们也支持通过以下方式测试：

- OpenRouter：`openrouter/...`（数百个模型；使用 `openclaw models scan` 查找支持工具 + 图像的候选项）
- OpenCode：`opencode/...` 用于 Zen，`opencode-go/...` 用于 Go（通过 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 认证）

你还可以在 live 矩阵中包含的更多提供方（如果你有凭据/配置）：

- Built-in: `openai`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- Via `models.providers` (custom endpoints): `minimax`（云/API），以及任何 OpenAI/Anthropic 兼容代理（LM Studio、vLLM、LiteLLM 等）

<Tip>
不要在文档中硬编码“所有模型”。权威列表是你机器上 `discoverModels(...)` 返回的内容，再加上可用的密钥。
</Tip>

## 凭据（切勿提交）

Live 测试发现凭据的方式与 CLI 相同。实际影响：

- 如果 CLI 可用，live 测试也应该能找到相同的密钥。
- 如果某个 live 测试提示“no creds”，排查方式应与排查 `openclaw models list` / 模型选择相同。

- 每个 agent 的认证配置文件：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（这就是 live 测试中“profile keys”的含义）
- 配置：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）
- 旧版状态目录：`~/.openclaw/credentials/`（存在时会复制到暂存的 live home 中，但不是主 profile-key 存储）
- 本地 live 运行默认会把活动配置、每个 agent 的 `auth-profiles.json` 文件、旧版 `credentials/`，以及受支持的外部 CLI 认证目录复制到临时测试 home；暂存的 live home 会跳过 `workspace/` 和 `sandboxes/`，并移除 `agents.*.workspace` / `agentDir` 路径覆盖，因此探测不会触及你真实主机的工作区。

如果你想依赖环境变量中的密钥，请在本地测试前先导出它们，或使用下面的 Docker 运行器并显式指定 `OPENCLAW_PROFILE_FILE`。

## Deepgram live（音频转录）

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
  - 在更改 comfy 工作流提交、轮询、下载或插件注册后很有用

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
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-2,google/gemini-3.1-flash-image-preview,openrouter/google/gemini-3.1-flash-image-preview,xai/grok-imagine-image"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit,openrouter:generate,xai:default-generate,xai:default-edit"`
- 可选认证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以强制使用 profile 存储认证并忽略仅环境变量覆盖

对于随 CLI 一起发布的路径，在 provider/runtime live 测试通过后，再增加一个 `infer` 冒烟测试：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_INFER_CLI_TEST=1 pnpm test:live -- test/image-generation.infer-cli.live.test.ts
openclaw infer image providers --json
openclaw infer image generate \
  --model google/gemini-3.1-flash-image-preview \
  --prompt "最小化的平面测试图像：白色背景上的一个蓝色方块，不要文字。" \
  --output ./openclaw-infer-image-smoke.png \
  --json
```

这覆盖了 CLI 参数解析、config/default-agent 解析、捆绑插件激活、共享的图像生成 runtime，以及 live provider 请求。插件依赖应在 runtime 加载之前就已存在。

## 音乐生成 live

- 测试：`extensions/music-generation-providers.live.test.ts`
- 启用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- 运行器：`pnpm test:live:media music`
- 范围：
  - 练习共享的捆绑音乐生成 provider 路径
  - 当前覆盖 Google 和 MiniMax
  - 探测前优先使用已导出的 provider 环境变量
  - 默认优先使用 live/env API key，而不是已存储的 auth profiles，因此 `auth-profiles.json` 中过期的测试密钥不会掩盖真实的 shell 凭据
  - 跳过没有可用 auth/profile/model 的 provider
  - 在可用时运行两种已声明的运行时模式：
    - `generate`，使用仅提示词输入
    - 当 provider 声明 `capabilities.edit.enabled` 时运行 `edit`
  - 当前共享通道覆盖：
    - `google`：`generate`、`edit`
    - `minimax`：`generate`
    - `comfy`：单独的 Comfy live 文件，不在这个共享扫描中
- 可选缩小范围：
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.6"`
- 可选认证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以强制使用 profile 存储认证并忽略仅环境变量覆盖

## 视频生成 live

- 测试：`extensions/video-generation-providers.live.test.ts`
- 启用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- 运行器：`pnpm test:live:media video`
- 范围：
  - 练习共享的捆绑视频生成 provider 路径
  - 默认使用发布安全的烟雾路径：非 FAL provider、每个 provider 一次 text-to-video 请求、一个 one-second lobster 提示词，以及来自 `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` 的每个 provider 操作上限（默认 `180000`）
  - 默认跳过 FAL，因为 provider 端队列延迟可能主导发布时间；显式传入 `--video-providers fal` 或 `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="fal"` 可运行它
  - 探测前优先使用已导出的 provider 环境变量
  - 默认优先使用 live/env API key，而不是已存储的 auth profiles，因此 `auth-profiles.json` 中过期的测试密钥不会掩盖真实的 shell 凭据
  - 跳过没有可用 auth/profile/model 的 provider
  - 默认仅运行 `generate`
  - 将 `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` 设为开启时，也会在可用时运行声明的转换模式：
    - 当 provider 声明 `capabilities.imageToVideo.enabled` 且所选 provider/model 在共享扫描中接受基于 buffer 的本地图像输入时，运行 `imageToVideo`
    - 当 provider 声明 `capabilities.videoToVideo.enabled` 且所选 provider/model 在共享扫描中接受基于 buffer 的本地视频输入时，运行 `videoToVideo`
  - 当前在共享扫描中已声明但跳过的 `imageToVideo` provider：
    - `vydra`，因为捆绑的 `veo3` 仅支持文本，而捆绑的 `kling` 需要远程图像 URL
  - Vydra 的特定 provider 覆盖：
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - 该文件默认运行 `veo3` text-to-video，以及一个使用远程图像 URL fixture 的 `kling` 线路
  - 当前 `videoToVideo` live 覆盖：
    - 仅当所选模型为 `runway/gen4_aleph` 时的 `runway`
  - 当前在共享扫描中已声明但跳过的 `videoToVideo` provider：
    - `alibaba`、`qwen`、`xai`，因为这些路径当前需要远程 `http(s)` / MP4 参考 URL
    - `google`，因为当前共享 Gemini/Veo 线路使用本地 buffer 输入，而该路径在共享扫描中不被接受
    - `openai`，因为当前共享线路缺少组织特定的视频编辑访问保证
- 可选缩小范围：
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="deepinfra,google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_SKIP_PROVIDERS=""` 以包含默认扫描中的每个 provider，包括 FAL
  - `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS=60000` 以降低每个 provider 操作上限，进行更激进的烟雾运行
- 可选认证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以强制使用 profile 存储认证并忽略仅环境变量覆盖

## 媒体 live harness

- 命令：`pnpm test:live:media`
- 目的：
  - 通过一个仓库原生入口运行共享的图像、音乐和视频 live 套件
  - 使用已导出的 provider 环境变量
  - 默认自动将每个套件缩小到当前拥有可用认证的 provider
  - 复用 `scripts/test-live.mjs`，因此心跳和静默模式行为保持一致
- 示例：
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## 相关

- [测试](/help/testing) - 单元、集成、QA 和 Docker 套件
