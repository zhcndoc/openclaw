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

- 命令：`pnpm test`
- 配置：`scripts/test-parallel.mjs`（运行 `vitest.unit.config.ts`、`vitest.extensions.config.ts`、`vitest.gateway.config.ts`）
- 文件：`src/**/*.test.ts`、`extensions/**/*.test.ts`
- 范围：
  - 纯单元测试
  - 进程内集成测试（网关认证、路由、工具、解析、配置）
  - 已知 Bug 的确定性回归测试
- 预期：
  - 在 CI 中运行
  - 不需要真实密钥
  - 应该快速且稳定
- 调度器说明：
  - `pnpm test` 现在为真实 pool/隔离覆盖保留了一个小型、已提交到仓库的行为清单，并为最慢的单元文件保留了单独的时序快照。
  - 共享单元覆盖现在默认使用 `threads`，而清单会明确保留测量出的仅 fork 例外和重型单例通道。
  - 共享扩展通道仍默认使用 `threads`；当某个文件无法安全地在非隔离 worker 中共享时，包装器会在 `test/fixtures/test-parallel.behavior.json` 中保留明确的仅 fork 例外。
  - 通道套件（`vitest.channels.config.ts`）现在也默认使用 `threads`；2026 年 3 月 22 日的直接全套控制运行已干净通过，没有通道特定的 fork 例外。
  - 包装器会把最重的测量文件拆分到独立通道，而不是依赖不断增长的手工维护排除列表。
  - 在套件结构发生重大变化后，使用 `pnpm test:perf:update-timings` 刷新时序快照。
- 嵌入式运行器说明：
  - 当你更改消息工具发现输入或压缩运行时上下文时，
    请同时保留两层覆盖。
  - 为纯路由/归一化边界添加聚焦的辅助回归测试。
  - 同时也要保持嵌入式运行器集成套件健康：
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts`, 以及
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
  - 这些套件验证了作用域 id 和压缩行为仍然通过真实的 `run.ts` / `compact.ts` 路径流动；仅靠辅助测试并不能替代这些集成路径。
- 池说明：
  - 基础 Vitest 配置仍默认使用 `forks`。
  - 单元包装通道默认使用 `threads`，并保留明确的清单仅 fork 例外。
  - 扩展作用域配置默认使用 `threads`。
  - 通道作用域配置默认使用 `threads`。
  - 单元、通道和扩展配置默认使用 `isolate: false` 以加快文件启动。
  - `pnpm test` 也会在包装器层面传递 `--isolate=false`。
  - 通过 `OPENCLAW_TEST_ISOLATE=1 pnpm test` 重新启用 Vitest 文件隔离。
  - `OPENCLAW_TEST_NO_ISOLATE=0` 或 `OPENCLAW_TEST_NO_ISOLATE=false` 也会强制使用隔离运行。
- 本地快速迭代说明：
  - `pnpm test:changed` 使用 `--changed origin/main` 运行包装器。
  - 基础 Vitest 配置会把包装器清单/配置文件标记为 `forceRerunTriggers`，因此当调度器输入变化时，changed 模式的重新运行仍然正确。
  - 现在默认启用 Node 侧测试重跑的文件系统模块缓存。
  - 如果你怀疑存在陈旧的转换缓存行为，可通过 `OPENCLAW_VITEST_FS_MODULE_CACHE=0` 或 `OPENCLAW_VITEST_FS_MODULE_CACHE=false` 关闭。
- 性能调试说明：
  - `pnpm test:perf:imports` 启用 Vitest 导入耗时报告以及导入分解输出。
  - `pnpm test:perf:imports:changed` 将相同的性能分析视图限定到自 `origin/main` 以来发生变化的文件。
  - `pnpm test:perf:profile:main` 为 Vitest/Vite 启动和转换开销写入主线程 CPU 分析文件。
  - `pnpm test:perf:profile:runner` 为禁用文件并行的单元套件写入运行器 CPU+堆分析文件。

### 端到端（网关冒烟测试）

- 命令：`pnpm test:e2e`
- 配置：`vitest.e2e.config.ts`
- 文件：`src/**/*.e2e.test.ts`、`test/**/*.e2e.test.ts`
- 运行时默认值：
  - 使用 Vitest `forks` 来实现确定性的跨文件隔离。
  - 使用自适应 worker（CI：最多 2 个，本地：默认 1 个）。
  - 默认以静默模式运行，以降低控制台 I/O 开销。
- 有用的覆盖项：
  - `OPENCLAW_E2E_WORKERS=<n>` 强制指定 worker 数量（上限 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 重新启用详细控制台输出。
- 范围：
  - 多实例网关端到端行为
  - WebSocket/HTTP 入口、节点配对，以及更重的网络行为
- 预期：
  - 在 CI 中运行（当流水线启用时）
  - 不需要真实密钥
  - 比单元测试涉及更多活动部件（可能更慢）

### E2E：OpenShell 后端冒烟测试

- 命令：`pnpm test:e2e:openshell`
- 文件：`test/openshell-sandbox.e2e.test.ts`
- 范围：
  - 通过 Docker 在主机上启动一个隔离的 OpenShell 网关
  - 从临时本地 Dockerfile 创建一个沙盒
  - 通过真实的 `sandbox ssh-config` + SSH exec 运行 OpenClaw 的 OpenShell 后端
  - 通过沙盒 fs 桥验证远程规范化文件系统行为
- 预期：
  - 仅按需启用；不属于默认的 `pnpm test:e2e` 运行内容
  - 需要本地 `openshell` CLI 以及可工作的 Docker 守护进程
  - 使用隔离的 `HOME` / `XDG_CONFIG_HOME`，然后销毁测试网关和沙盒
- 有用的覆盖项：
  - `OPENCLAW_E2E_OPENSHELL=1` 在更广泛的 e2e 套件中手动运行时启用该测试
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 指向非默认的 CLI 二进制文件或包装脚本

### 实况（真实提供商 + 真实模型）

- 命令：`pnpm test:live`
- 配置：`vitest.live.config.ts`
- 文件：`src/**/*.live.test.ts`
- 默认：由 `pnpm test:live` **启用**（设置 `OPENCLAW_LIVE_TEST=1`）
- 范围：
  - “这个提供商/模型今天用真实凭据真的能工作吗？”
  - 捕获提供商格式变化、工具调用怪癖、认证问题和速率限制行为
- 预期：
  - 设计上不保证 CI 稳定（真实网络、真实提供商策略、配额、故障）
  - 需要花钱 / 会消耗速率限制
  - 优先运行缩小后的子集，而不是“一次跑全部”
  - 实况运行会从 `~/.profile` 读取缺失的 API 密钥
- API 密钥轮换（按提供商区分）：使用逗号/分号格式的 `*_API_KEYS`，或 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`），或者通过 `OPENCLAW_LIVE_*_KEY` 进行逐个实况覆盖；测试会在速率限制响应时重试。
- 进度/心跳输出：
  - 实况套件现在会向 stderr 输出进度行，因此即使 Vitest 控制台捕获较安静，较长的提供商调用也能明显看出正在进行。
  - `vitest.live.config.ts` 禁用了 Vitest 控制台拦截，因此提供商/网关进度行会在实况运行期间立即流式输出。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 调整直接模型心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 调整网关/探针心跳。

## 我应该运行哪个套件？

请依据下表决策：

- 编辑逻辑/测试：运行 `pnpm test`（修改较多时加跑 `pnpm test:coverage`）
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

- 测试：`src/agents/models.profiles.live.test.ts`
- 目标：
  - 枚举发现的模型
  - 使用 `getApiKeyForModel` 选择你有凭据的模型
  - 对每个模型运行一个小型补全（必要时也包含有针对性的回归）
- 如何启用：
  - `pnpm test:live`（或者如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
- 设置 `OPENCLAW_LIVE_MODELS=modern`（或 `all`，modern 的别名）以实际运行该套件；否则它会跳过，以保持 `pnpm test:live` 专注于网关冒烟
- 如何选择模型：
  - `OPENCLAW_LIVE_MODELS=modern` 运行现代白名单（Opus/Sonnet/Haiku 4.5、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.7、Grok 4）
  - `OPENCLAW_LIVE_MODELS=all` 是现代白名单的别名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,..."`（逗号白名单）
- 如何选择提供商：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"`（逗号白名单）
- 密钥来源：
  - 默认：配置档案存储和环境变量回退
  - 设置 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以强制仅使用**配置档案存储**
- 这样做的原因：
  - 将“提供商 API 已损坏 / 密钥无效”与“网关代理管线已损坏”分离开来
  - 包含小而独立的回归（例如：OpenAI Responses/Codex Responses 推理重放 + 工具调用流程）

### 层 2：网关 + 开发代理冒烟测试（“@openclaw” 实际做的事）

- 测试：`src/gateway/gateway-models.profiles.live.test.ts`
- 目标：
  - 启动一个进程内网关
  - 创建/补丁一个 `agent:dev:*` 会话（每次运行覆盖模型）
  - 遍历有密钥的模型并断言：
    - “有意义”的响应（不使用工具）
    - 一个真实的工具调用可工作（read 探针）
    - 可选的额外工具探针（exec+read 探针）
    - OpenAI 回归路径（仅工具调用 → 后续跟进）继续正常工作
- 探针细节（便于你快速解释失败）：
  - `read` 探针：测试会在工作区写入一个 nonce 文件，并要求代理 `read` 它并把 nonce 复述回来。
  - `exec+read` 探针：测试要求代理使用 `exec` 将 nonce 写入临时文件，然后再 `read` 回来。
  - 图片探针：测试会附加一个生成的 PNG（猫 + 随机代码），并期望模型返回 `cat <CODE>`。
  - 实现参考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何启用：
  - `pnpm test:live`（或者如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
- 如何选择模型：
  - 默认：现代白名单（Opus/Sonnet/Haiku 4.5、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.7、Grok 4）
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是现代白名单的别名
  - 或设置 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗号列表）进行缩小
- 如何选择提供商（避免“OpenRouter 全家桶”）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`（逗号白名单）
- 工具 + 图片探针在此实况测试中始终开启：
  - `read` 探针 + `exec+read` 探针（工具压力测试）
  - 当模型声明支持图像输入时，图片探针运行
  - 流程（高层）：
    - 测试生成一个带有 “CAT” + 随机代码 的小 PNG（`src/gateway/live-image-probe.ts`）
    - 通过 `agent` 的 `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 发送
    - 网关将 attachments 解析为 `images[]`（`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`）
    - 嵌入式代理将多模态用户消息转发给模型
    - 断言：回复包含 `cat` + 该代码（OCR 容错：允许轻微错误）

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

这些 Docker 运行器分为两类：

- 实况模型运行器：`test:docker:live-models` 和 `test:docker:live-gateway` 会在仓库 Docker 镜像内运行 `pnpm test:live`，挂载你的本地配置目录和工作区（如果已挂载，还会先加载 `~/.profile`）。
- 容器冒烟运行器：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:gateway-network` 和 `test:docker:plugins` 会启动一个或多个真实容器，并验证更高层级的集成路径。

实况模型 Docker 运行器还会只绑定挂载所需的 CLI 认证主目录（或者在运行未缩小范围时挂载所有受支持的主目录），然后在运行前将它们复制到容器主目录中，以便外部 CLI 的 OAuth 可以刷新令牌而不修改宿主机认证存储：

- 直接模型：`pnpm test:docker:live-models`（脚本：`scripts/test-live-models-docker.sh`）
- 网关 + 开发代理：`pnpm test:docker:live-gateway`（脚本：`scripts/test-live-gateway-models-docker.sh`）
- Open WebUI 实况冒烟：`pnpm test:docker:openwebui`（脚本：`scripts/e2e/openwebui-docker.sh`）
- 上手向导（TTY，完整脚手架）：`pnpm test:docker:onboard`（脚本：`scripts/e2e/onboard-docker.sh`）
- 网关网络（两个容器，WS 认证 + 健康检查）：`pnpm test:docker:gateway-network`（脚本：`scripts/e2e/gateway-network-docker.sh`）
- 插件（安装冒烟 + `/plugin` 别名 + Claude-bundle 重启语义）：`pnpm test:docker:plugins`（脚本：`scripts/e2e/plugins-docker.sh`）

实况模型 Docker 运行器还会将当前检出目录以只读方式挂载，并将其放入容器内的临时工作目录中。这样既能保持运行时镜像精简，又能针对你精确的本地源码/配置运行 Vitest。它们还会设置 `OPENCLAW_SKIP_CHANNELS=1`，以便网关实况探针不会在容器内启动真实的 Telegram/Discord 等频道工作器。`test:docker:live-models` 仍然会运行 `pnpm test:live`，因此当你需要缩小或排除 Docker 这条线路中的网关实况覆盖时，也请传递 `OPENCLAW_LIVE_GATEWAY_*`。
`test:docker:openwebui` 是更高层级的兼容性冒烟：它会启动启用 OpenAI 兼容 HTTP 端点的 OpenClaw 网关容器，启动一个固定版本的 Open WebUI 容器连接该网关，通过 Open WebUI 登录，验证 `/api/models` 暴露 `openclaw/default`，然后通过 Open WebUI 的 `/api/chat/completions` 代理发送真实聊天请求。
第一次运行可能会明显更慢，因为 Docker 可能需要拉取 Open WebUI 镜像，而 Open WebUI 也可能需要完成自身的冷启动设置。
这条线路需要一个可用的实况模型密钥，而 `OPENCLAW_PROFILE_FILE`
（默认是 `~/.profile`）是在 Docker 化运行中提供它的主要方式。
成功运行会打印一个小型 JSON 负载，例如 `{ "ok": true, "model":
"openclaw/default", ... }`。

手动 ACP 明文线程冒烟（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 保留此脚本供回归/调试流程，未来可能再次用于 ACP 线程路由验证，勿删。

实用环境变量：

- `OPENCLAW_CONFIG_DIR=...` (default: `~/.openclaw`) mounted to `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (default: `~/.openclaw/workspace`) mounted to `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (default: `~/.profile`) mounted to `/home/node/.profile` and sourced before running tests
- External CLI auth dirs under `$HOME` are mounted read-only under `/host-auth/...`, then copied into `/home/node/...` before tests start
  - Default: mount all supported dirs (`.codex`, `.claude`, `.qwen`, `.minimax`)
  - Narrowed provider runs mount only the needed dirs inferred from `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Override manually with `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, or a comma list like `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` to narrow the run
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` to filter providers in-container
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` to ensure creds come from the profile store (not env)
- `OPENCLAW_OPENWEBUI_MODEL=...` to choose the model exposed by the gateway for the Open WebUI smoke
- `OPENCLAW_OPENWEBUI_PROMPT=...` to override the nonce-check prompt used by the Open WebUI smoke
- `OPENWEBUI_IMAGE=...` to override the pinned Open WebUI image tag

## 文档健全性检查

在编辑文档后运行文档检查：`pnpm docs:list`。

## 离线回归测试（CI 安全）

这些是“真实流水线”回归测试，但没有真实提供者：

- 网关工具调用（模拟 OpenAI，真实网关 + 代理循环）：`src/gateway/gateway.test.ts`（用例：“以端到端方式通过网关代理循环运行一个模拟 OpenAI 工具调用”）
- 网关向导（WS `wizard.start`/`wizard.next`，写配置 + 认证强制）：`src/gateway/gateway.test.ts`（用例：“通过 ws 运行向导并写入 auth token 配置”）

## 代理可靠性评估（技能）

我们已经有一些 CI 安全的测试，行为类似“代理可靠性评估”：

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
