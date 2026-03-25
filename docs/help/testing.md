---
summary: "测试工具包：单元测试/e2e/实况套件，Docker 运行器，以及每种测试涵盖的内容"
read_when:
  - 本地或 CI 中运行测试时
  - 为模型/提供商漏洞添加回归测试时
  - 调试网关与代理行为时
title: "测试"
---

# 测试

OpenClaw 有三个 Vitest 测试套件（单元/集成、端到端、实况）以及一小套 Docker 运行器。

本文档是“我们如何测试”的指南：

- 每个套件涵盖的内容（以及刻意 _不_ 涵盖的内容）
- 常见工作流程（本地、推送前、调试）使用的命令
- 实况测试如何发现凭据并选择模型/提供商
- 如何为真实世界的模型/提供商问题添加回归测试

## 快速开始

大多数日常使用：

- 完整门禁（推送前应执行）：`pnpm build && pnpm check && pnpm test`

当你修改测试或需要额外信心：

- 覆盖门禁：`pnpm test:coverage`
- 端到端套件：`pnpm test:e2e`

调试真实提供商/模型（需要真实凭据）时：

- 实况套件（模型 + 网关工具/图片探针）：`pnpm test:live`

提示：当你仅需一个失败用例时，优先通过下面描述的白名单环境变量缩小实况测试范围。

## 测试套件（在哪儿运行什么）

将测试套件视作“现实程度递增”（以及不稳定性/成本递增）：

### 单元 / 集成（默认）

- Command: `pnpm test`
- Config: `scripts/test-parallel.mjs` (runs `vitest.unit.config.ts`, `vitest.extensions.config.ts`, `vitest.gateway.config.ts`)
- Files: `src/**/*.test.ts`, `extensions/**/*.test.ts`
- Scope:
  - 纯单元测试
  - 进程内集成测试（网关认证、路由、工具、解析、配置）
  - 已知 Bug 的确定性回归测试
- Expectations:
  - Runs in CI
  - No real keys required
  - Should be fast and stable
- Scheduler note:
  - `pnpm test` now keeps a small checked-in behavioral manifest for true pool/isolation overrides and a separate timing snapshot for the slowest unit files.
  - Shared unit coverage now defaults to `threads`, while the manifest keeps the measured fork-only exceptions and heavy singleton lanes explicit.
  - The shared extension lane still defaults to `threads`; the wrapper keeps explicit fork-only exceptions in `test/fixtures/test-parallel.behavior.json` when a file cannot safely share a non-isolated worker.
  - The channel suite (`vitest.channels.config.ts`) now also defaults to `threads`; the March 22, 2026 direct full-suite control run passed clean without channel-specific fork exceptions.
  - The wrapper peels the heaviest measured files into dedicated lanes instead of relying on a growing hand-maintained exclusion list.
  - Refresh the timing snapshot with `pnpm test:perf:update-timings` after major suite shape changes.
- Embedded runner note:
  - When you change message-tool discovery inputs or compaction runtime context,
    keep both levels of coverage.
  - Add focused helper regressions for pure routing/normalization boundaries.
  - Also keep the embedded runner integration suites healthy:
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts`, and
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
  - Those suites verify that scoped ids and compaction behavior still flow
    through the real `run.ts` / `compact.ts` paths; helper-only tests are not a
    sufficient substitute for those integration paths.
- Pool note:
  - Base Vitest config still defaults to `forks`.
  - Unit wrapper lanes default to `threads`, with explicit manifest fork-only exceptions.
  - Extension scoped config defaults to `threads`.
  - Channel scoped config defaults to `threads`.
  - Unit, channel, and extension configs default to `isolate: false` for faster file startup.
  - `pnpm test` also passes `--isolate=false` at the wrapper level.
  - Opt back into Vitest file isolation with `OPENCLAW_TEST_ISOLATE=1 pnpm test`.
  - `OPENCLAW_TEST_NO_ISOLATE=0` or `OPENCLAW_TEST_NO_ISOLATE=false` also force isolated runs.
- Fast-local iteration note:
  - `pnpm test:changed` runs the wrapper with `--changed origin/main`.
  - The base Vitest config marks the wrapper manifests/config files as `forceRerunTriggers` so changed-mode reruns stay correct when scheduler inputs change.
  - Vitest's filesystem module cache is now enabled by default for Node-side test reruns.
  - Opt out with `OPENCLAW_VITEST_FS_MODULE_CACHE=0` or `OPENCLAW_VITEST_FS_MODULE_CACHE=false` if you suspect stale transform cache behavior.
- Perf-debug note:
  - `pnpm test:perf:imports` enables Vitest import-duration reporting plus import-breakdown output.
  - `pnpm test:perf:imports:changed` scopes the same profiling view to files changed since `origin/main`.
  - `pnpm test:perf:profile:main` writes a main-thread CPU profile for Vitest/Vite startup and transform overhead.
  - `pnpm test:perf:profile:runner` writes runner CPU+heap profiles for the unit suite with file parallelism disabled.

### 端到端（网关冒烟测试）

- Command: `pnpm test:e2e`
- Config: `vitest.e2e.config.ts`
- Files: `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- Runtime defaults:
  - Uses Vitest `forks` for deterministic cross-file isolation.
  - Uses adaptive workers (CI: up to 2, local: 1 by default).
  - Runs in silent mode by default to reduce console I/O overhead.
- Useful overrides:
  - `OPENCLAW_E2E_WORKERS=<n>` to force worker count (capped at 16).
  - `OPENCLAW_E2E_VERBOSE=1` to re-enable verbose console output.
- Scope:
  - Multi-instance gateway end-to-end behavior
  - WebSocket/HTTP surfaces, node pairing, and heavier networking
- Expectations:
  - Runs in CI (when enabled in the pipeline)
  - No real keys required
  - More moving parts than unit tests (can be slower)

### E2E: OpenShell backend smoke

- Command: `pnpm test:e2e:openshell`
- File: `test/openshell-sandbox.e2e.test.ts`
- Scope:
  - Starts an isolated OpenShell gateway on the host via Docker
  - Creates a sandbox from a temporary local Dockerfile
  - Exercises OpenClaw's OpenShell backend over real `sandbox ssh-config` + SSH exec
  - Verifies remote-canonical filesystem behavior through the sandbox fs bridge
- Expectations:
  - Opt-in only; not part of the default `pnpm test:e2e` run
  - Requires a local `openshell` CLI plus a working Docker daemon
  - Uses isolated `HOME` / `XDG_CONFIG_HOME`, then destroys the test gateway and sandbox
- Useful overrides:
  - `OPENCLAW_E2E_OPENSHELL=1` to enable the test when running the broader e2e suite manually
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` to point at a non-default CLI binary or wrapper script

### Live (real providers + real models)

- Command: `pnpm test:live`
- Config: `vitest.live.config.ts`
- Files: `src/**/*.live.test.ts`
- Default: **enabled** by `pnpm test:live` (sets `OPENCLAW_LIVE_TEST=1`)
- Scope:
  - “Does this provider/model actually work _today_ with real creds?”
  - Catch provider format changes, tool-calling quirks, auth issues, and rate limit behavior
- Expectations:
  - Not CI-stable by design (real networks, real provider policies, quotas, outages)
  - Costs money / uses rate limits
  - Prefer running narrowed subsets instead of “everything”
  - Live runs will source `~/.profile` to pick up missing API keys
- API key rotation (provider-specific): set `*_API_KEYS` with comma/semicolon format or `*_API_KEY_1`, `*_API_KEY_2` (for example `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) or per-live override via `OPENCLAW_LIVE_*_KEY`; tests retry on rate limit responses.
- Progress/heartbeat output:
  - Live suites now emit progress lines to stderr so long provider calls are visibly active even when Vitest console capture is quiet.
  - `vitest.live.config.ts` disables Vitest console interception so provider/gateway progress lines stream immediately during live runs.
  - Tune direct-model heartbeats with `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Tune gateway/probe heartbeats with `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## 我应该运行哪个套件？

请依据下表决策：

- 编辑逻辑/测试：运行 `pnpm test`（修改较多时加 `pnpm test:coverage`）
- 触及网关网络/WS 协议/配对：加跑 `pnpm test:e2e`
- 调试“我的机器人崩了”/特定提供商失败/工具调用：运行狭义的 `pnpm test:live`

## 实况：Android 节点能力扫描

- 测试：`src/gateway/android-node.capabilities.live.test.ts`
- 脚本：`pnpm android:test:integration`
- 目标：调用连接的 Android 节点当前公开支持的**所有命令**，并断言命令契约行为。
- 范围：
  - 需预置/手动设置（测试套件不负责安装/运行/配对应用）
  - 按命令逐个调用网关 `node.invoke` 验证所选 Android 节点
- 必要预置：
  - Android 应用已连接并配对至网关
  - 应用运行在前台
  - 启用所预期通过能力的权限/录制同意
- 可选目标覆盖：
  - `OPENCLAW_ANDROID_NODE_ID` 或 `OPENCLAW_ANDROID_NODE_NAME`
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`
- 完整 Android 设置详情：[Android 应用](/platforms/android)

## 实况：模型冒烟测试（档案密钥）

实况测试分两层以便隔离错误：

- “直接模型”表明提供商/模型凭当前密钥至少能响应。
- “网关冒烟”表明整个网关+代理管线（会话，历史，工具，沙盒策略等）对该模型可用。

### 层 1：直接模型补全（不经网关）

- Test: `src/agents/models.profiles.live.test.ts`
- Goal:
  - Enumerate discovered models
  - Use `getApiKeyForModel` to select models you have creds for
  - Run a small completion per model (and targeted regressions where needed)
- How to enable:
  - `pnpm test:live` (or `OPENCLAW_LIVE_TEST=1` if invoking Vitest directly)
- Set `OPENCLAW_LIVE_MODELS=modern` (or `all`, alias for modern) to actually run this suite; otherwise it skips to keep `pnpm test:live` focused on gateway smoke
- How to select models:
  - `OPENCLAW_LIVE_MODELS=modern` to run the modern allowlist (Opus/Sonnet/Haiku 4.5, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_MODELS=all` is an alias for the modern allowlist
  - or `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,..."` (comma allowlist)
- How to select providers:
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (comma allowlist)
- Where keys come from:
  - By default: profile store and env fallbacks
  - Set `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` to enforce **profile store** only
- Why this exists:
  - Separates “provider API is broken / key is invalid” from “gateway agent pipeline is broken”
  - Contains small, isolated regressions (example: OpenAI Responses/Codex Responses reasoning replay + tool-call flows)

### Layer 2: Gateway + dev agent smoke (what "@openclaw" actually does)

- Test: `src/gateway/gateway-models.profiles.live.test.ts`
- Goal:
  - Spin up an in-process gateway
  - Create/patch a `agent:dev:*` session (model override per run)
  - Iterate models-with-keys and assert:
    - “meaningful” response (no tools)
    - a real tool invocation works (read probe)
    - optional extra tool probes (exec+read probe)
    - OpenAI regression paths (tool-call-only → follow-up) keep working
- Probe details (so you can explain failures quickly):
  - `read` probe: the test writes a nonce file in the workspace and asks the agent to `read` it and echo the nonce back.
  - `exec+read` probe: the test asks the agent to `exec`-write a nonce into a temp file, then `read` it back.
  - image probe: the test attaches a generated PNG (cat + randomized code) and expects the model to return `cat <CODE>`.
  - Implementation reference: `src/gateway/gateway-models.profiles.live.test.ts` and `src/gateway/live-image-probe.ts`.
- How to enable:
  - `pnpm test:live` (or `OPENCLAW_LIVE_TEST=1` if invoking Vitest directly)
- How to select models:
  - Default: modern allowlist (Opus/Sonnet/Haiku 4.5, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` is an alias for the modern allowlist
  - Or set `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (or comma list) to narrow
- How to select providers (avoid “OpenRouter everything”):
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (comma allowlist)
- Tool + image probes are always on in this live test:
  - `read` probe + `exec+read` probe (tool stress)
  - image probe runs when the model advertises image input support
  - Flow (high level):
    - Test generates a tiny PNG with “CAT” + random code (`src/gateway/live-image-probe.ts`)
    - Sends it via `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - Gateway parses attachments into `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - Embedded agent forwards a multimodal user message to the model
    - Assertion: reply contains `cat` + the code (OCR tolerance: minor mistakes allowed)

提示：要查看你机器上能测试的内容（及具体的 `provider/model` ID），运行：

```bash
openclaw models list
openclaw models list --json
```

## 实况：Anthropic setup-token 冒烟测试

- 测试：`src/agents/anthropic.setup-token.live.test.ts`
- 目标：验证 Claude Code CLI 的 setup-token（或者粘贴的 setup-token 档案）是否能完成 Anthropic 提示
- 启用：
  - `pnpm test:live`（或直接调用 Vitest 时设置 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_SETUP_TOKEN=1`
- 令牌来源（任选一）：
  - 档案：`OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test`
  - 原始令牌：`OPENCLAW_LIVE_SETUP_TOKEN_VALUE=sk-ant-oat01-...`
- 模型覆盖（可选）：
  - `OPENCLAW_LIVE_SETUP_TOKEN_MODEL=anthropic/claude-opus-4-6`

示例设置：

```bash
openclaw models auth paste-token --provider anthropic --profile-id anthropic:setup-token-test
OPENCLAW_LIVE_SETUP_TOKEN=1 OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test pnpm test:live src/agents/anthropic.setup-token.live.test.ts
```

## 实况：CLI 后端冒烟测试（Claude Code CLI 或其他本地 CLI）

- 测试：`src/gateway/gateway-cli-backend.live.test.ts`
- 目标：验证网关 + 代理管线用本地 CLI 后端工作，且不影响你的默认配置
- 启用：
  - `pnpm test:live`（或直接调用 Vitest 时设置 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- 默认：
  - 模型：`claude-cli/claude-sonnet-4-6`
  - 命令：`claude`
  - 参数：`["-p","--output-format","json","--permission-mode","bypassPermissions"]`
- 覆盖（可选）：
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-opus-4-6"`
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/claude"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json","--permission-mode","bypassPermissions"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_CLEAR_ENV='["ANTHROPIC_API_KEY","ANTHROPIC_API_KEY_OLD"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 发送真实图片附件（路径注入提示）
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 以 CLI 参数形式传递图片路径代替提示注入
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"`（或 `"list"`）控制 `IMAGE_ARG` 设置时图片参数传递方式
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 发送第二轮消息验证续写流程
- `OPENCLAW_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0` 保持 Claude Code CLI MCP 配置启用（默认则用临时空文件禁用 MCP 配置）

示例：

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

### 推荐的实况测试用法

缩小、明确的白名单最快且最稳定：

- 单模型，直接（不经网关）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- 单模型，网关冒烟：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多个提供商的工具调用：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 重点（Gemini API 密钥 + Antigravity）：
  - Gemini（API 密钥）：`OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity（OAuth）：`OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

注意：

- `google/...` 使用 Gemini API（API 密钥）。
- `google-antigravity/...` 使用 Antigravity OAuth 桥接（类似 Cloud Code Assist 的代理端点）。
- `google-gemini-cli/...` 使用本地 Gemini CLI（独立的认证和工具特性）。
- Gemini API 与 Gemini CLI 的区别：
  - API：OpenClaw 通过 HTTP 调用 Google 托管的 Gemini API（API 密钥/配置文件认证）；这是多数用户理解的“Gemini”。
  - CLI：OpenClaw 调用本地 `gemini` 二进制；拥有独自认证方式，行为可能不同（流式/工具支持/版本差异）。

## 实况：模型矩阵（覆盖范围）

无固定“CI 模型列表”（实况为选择性开启），但以下为**推荐**定期在开发机器上用密钥覆盖的模型。

### 现代冒烟集（工具调用 + 图像）

这是一组我们期望持续有效的“常用模型”：

- OpenAI (non-Codex): `openai/gpt-5.2` (optional: `openai/gpt-5.1`)
- OpenAI Codex: `openai-codex/gpt-5.4`
- Anthropic: `anthropic/claude-opus-4-6` (or `anthropic/claude-sonnet-4-6`)
- Google (Gemini API): `google/gemini-3.1-pro-preview` and `google/gemini-3-flash-preview` (avoid older Gemini 2.x models)
- Google (Antigravity): `google-antigravity/claude-opus-4-6-thinking` and `google-antigravity/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

使用工具 + 图像运行网关冒烟：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

```
OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/minimax-m2.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts
```

### 基线：工具调用（Read + 可选 Exec）

- OpenAI: `openai/gpt-5.2` (or `openai/gpt-5-mini`)
- Anthropic: `anthropic/claude-opus-4-6` (or `anthropic/claude-sonnet-4-6`)
- Google: `google/gemini-3-flash-preview` (or `google/gemini-3.1-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

可选额外覆盖（锦上添花）：

- xAI：`xai/grok-4`（或最新可用）
- Mistral：`mistral/` ……（选择你启用的“支持工具”模型）
- Cerebras：`cerebras/` ……（如果有权限）
- LM Studio：`lmstudio/` ……（本地；工具调用取决于 API 模式）

### 视觉：图像发送（附件 → 多模态消息）

在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中至少包含一个支持图像的模型（Claude/Gemini/OpenAI 支持视觉变体等），以执行图片探针。

### 聚合器 / 替代网关

如果你有可用密钥，也支持通过以下方式测试：
- OpenRouter: `openrouter/...`（上百种模型；使用 `openclaw models scan` 查找支持工具和图像的候选模型）
- OpenCode: `opencode/...` 用于 Zen，`opencode-go/...` 用于 Go（通过 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 进行认证）

更多可纳入实况矩阵的提供商（若有凭据/配置）：
- 内置支持：`openai`、`openai-codex`、`anthropic`、`google`、`google-vertex`、`google-antigravity`、`google-gemini-cli`、`zai`、`openrouter`、`opencode`、`opencode-go`、`xai`、`groq`、`cerebras`、`mistral`、`github-copilot`
- 通过 `models.providers`（自定义端点）：`minimax`（云/API），以及任何兼容 OpenAI/Anthropic 的代理（如 LM Studio、vLLM、LiteLLM 等）

提示：不要试图在文档里硬编码“所有模型”，权威列表即你机器上 `discoverModels(...)` 返回的范围及你具备的有效密钥所涵盖的模型。

## 凭据（切勿提交）

实况测试发现凭据的方式与 CLI 一致。实际意义：

- 如果 CLI 生效，实况测试也应能找到同样的密钥。
- 若实况测试提示“无凭据”，请根据调试 `openclaw models list` / 模型选择的方式排查。

凭据位置：

- 档案存储：`~/.openclaw/credentials/`（首选；测试中称为“档案密钥”）
- 配置文件：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）

若依赖环境变量密钥（例如 `~/.profile` 导出），请先 `source ~/.profile` 再运行本地测试，或使用下面的 Docker 运行器（它们可以挂载 `~/.profile` 进容器）。

## Deepgram 实况（音频转录）

- 测试：`src/media-understanding/providers/deepgram/audio.live.test.ts`
- 启用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## 图像生成实况

- 测试：`src/image-generation/runtime.live.test.ts`
- 命令：`pnpm test:live src/image-generation/runtime.live.test.ts`
- 范围：
  - 枚举每一个已注册的图像生成提供商插件
  - 在探测前从你的登录 shell（`~/.profile`）加载缺失的提供商环境变量
  - 默认优先使用实时/环境 API 密钥而非存储的认证档案，因此 `auth-profiles.json` 中的陈旧测试密钥不会掩盖真实的 shell 凭据
  - 跳过无可用认证/档案/模型的提供商
  - 通过共享运行时能力运行标准图像生成变体：
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- 当前捆绑覆盖的提供商：
  - `openai`
  - `google`
- 可选范围缩小：
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-1,google/gemini-3.1-flash-image-preview"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit"`
- 可选认证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 强制使用档案存储认证并忽略仅环境变量的覆盖

## Docker 运行器（可选的“在 Linux 中工作”检查）

这些在仓库 Docker 镜像内运行 `pnpm test:live`，挂载你的本地配置目录和工作区（并在挂载时 source `~/.profile`）。它们还只绑定挂载所需的 CLI 认证主目录（或未缩小时挂载所有支持的目录），然后在运行前将它们复制到容器主目录中，以便外部 CLI OAuth 可以刷新令牌而无需修改主机的认证存储：

- 直接模型：`pnpm test:docker:live-models`（脚本：`scripts/test-live-models-docker.sh`）
- 网关 + 开发代理：`pnpm test:docker:live-gateway`（脚本：`scripts/test-live-gateway-models-docker.sh`）
- 入门向导（TTY，完整脚手架）：`pnpm test:docker:onboard`（脚本：`scripts/e2e/onboard-docker.sh`）
- 网关网络（两个容器，WS 认证 + 健康检查）：`pnpm test:docker:gateway-network`（脚本：`scripts/e2e/gateway-network-docker.sh`）
- 插件（安装冒烟 + `/plugin` 别名 + Claude-bundle 重启语义）：`pnpm test:docker:plugins`（脚本：`scripts/e2e/plugins-docker.sh`）

实况模型 Docker 运行器还以只读方式绑定挂载当前检出代码，并将其暂存到容器内的临时工作目录。这让运行时镜像保持精简，同时仍针对你精确的本地源码/配置运行 Vitest。它们还设置 `OPENCLAW_SKIP_CHANNELS=1`，以便网关实况探测不会在容器内启动真实的 Telegram/Discord 等频道工作器。`test:docker:live-models` 仍运行 `pnpm test:live`，因此当你需要从该 Docker 通道缩小或排除网关实况覆盖时，也要透传 `OPENCLAW_LIVE_GATEWAY_*`。

手动 ACP 明文线程冒烟（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 保留此脚本供回归/调试流程，未来可能再次用于 ACP 线程路由验证，勿删。

实用环境变量：

- `OPENCLAW_CONFIG_DIR=...`（默认：`~/.openclaw`）挂载到 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（默认：`~/.openclaw/workspace`）挂载到 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（默认：`~/.profile`）挂载到 `/home/node/.profile` 并在运行测试前 source
- `$HOME` 下的外部 CLI 认证目录以只读方式挂载到 `/host-auth/...`，然后在测试开始前复制到 `/home/node/...`
  - 默认：挂载所有支持的目录（`.codex`、`.claude`、`.qwen`、`.minimax`）
  - 缩小的提供商运行仅从 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推断所需的目录
  - 使用 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none` 或逗号列表如 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex` 手动覆盖
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 用于缩小运行范围
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 用于在容器内过滤提供商
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 确保凭据来自档案存储（而非环境变量）

## 文档健全性检查

在编辑文档后运行文档检查：`pnpm docs:list`。

## 离线回归测试（CI 安全）

这些是"真实流水线"回归测试，但没有真实提供者：

- 网关工具调用（模拟 OpenAI，真实网关 + 代理循环）：`src/gateway/gateway.test.ts`（用例："runs a mock OpenAI tool call end-to-end via gateway agent loop"）
- 网关向导（WS `wizard.start`/`wizard.next`，写配置 + 认证强制）：`src/gateway/gateway.test.ts`（用例："runs wizard over ws and writes auth token config"）

## 代理可靠性评估（技能）

我们已经有一些 CI 安全的测试，行为类似"代理可靠性评估"：

- 通过真实网关 + 代理循环进行模拟工具调用（`src/gateway/gateway.test.ts`）。
- 端到端向导流程，验证会话连接和配置效果（`src/gateway/gateway.test.ts`）。

技能评估仍缺少的是（见 [Skills](/tools/skills)）：

- **决策能力**：当提示中列出技能时，代理能否选择正确的技能（或避免无关的技能）？
- **合规性**：代理是否会在使用前阅读 `SKILL.md` 并遵守所需步骤/参数？
- **工作流约定**：多轮场景，断言工具调用顺序、会话历史传递和沙箱边界。

未来评估应优先保持确定性：

- 使用模拟提供者的场景运行器，断言工具调用及顺序、技能文件读取和会话连接。
- 一小套以技能为中心的场景（使用 vs 避免、门控、提示注入）。
- 可选的实况评估（需选择加入、环境变量限制），仅在 CI 安全套件就绪后启用。

## 契约测试（插件和频道结构）

契约测试验证每个已注册的插件和频道是否符合其接口契约。它们遍历所有发现的插件并运行一系列结构和行为断言。

### 命令

- 所有契约：`pnpm test:contracts`
- 仅频道契约：`pnpm test:contracts:channels`
- 仅提供者契约：`pnpm test:contracts:plugins`

### 频道契约

位于 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - 基本插件结构（id、名称、能力）
- **setup** - 设置向导契约
- **session-binding** - 会话绑定行为
- **outbound-payload** - 消息载荷结构
- **inbound** - 入站消息处理
- **actions** - 频道操作处理器
- **threading** - 线程 ID 处理
- **directory** - 目录/花名册 API
- **group-policy** - 群组策略执行
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

- 尽可能添加 CI 安全的回归测试（模拟/存根提供者，或捕获精确的请求变换）
- 如果是本质上只能实况测试的问题（速率限制、认证策略），请保持实况测试范围窄并通过环境变量选择性启用
- 优先定位捕捉错误的最小层级：
  - 提供者请求转换/回放错误 → 直接模型测试
  - 网关会话/历史/工具流水线错误 → 网关实况冒烟或 CI 安全网关模拟测试
- SecretRef 访问保护：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 从注册表元数据（`listSecretTargetRegistryEntries()`）派生每个 SecretRef 类的一个样本目标，然后断言拒绝访问段执行 id。
  - 如果你在 `src/secrets/target-registry-data.ts` 中添加了新的 `includeInPlan` SecretRef 目标族，请更新那个测试中的 `classifyTargetClass`。该测试有意在未分类目标 id 上失败，防止新类被悄无声息地跳过。
