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
  - 在 CI 中运行
  - 不需要真实密钥
  - 应该快速且稳定
- Pool note:
  - OpenClaw 在 Node 22、23 和 24 上使用 Vitest `vmForks` 来加速单元测试分片。
  - 在 Node 25 及以上版本，OpenClaw 自动回退到普通的 `forks`，直到仓库在那里重新验证。
  - 可用 `OPENCLAW_TEST_VM_FORKS=0`（强制 `forks`）或 `OPENCLAW_TEST_VM_FORKS=1`（强制 `vmForks`）手动覆盖。

### 端到端（网关冒烟测试）

- 命令：`pnpm test:e2e`
- 配置：`vitest.e2e.config.ts`
- 文件：`src/**/*.e2e.test.ts`
- 运行时默认：
  - 使用 Vitest 的 `vmForks` 加快文件启动
  - 使用自适应工作线程数（CI：2-4，本地：4-8）
  - 默认静默模式运行以减少控制台 I/O 开销
- 有用的覆盖选项：
  - `OPENCLAW_E2E_WORKERS=<n>` 强制工作线程数（最大 16）
  - `OPENCLAW_E2E_VERBOSE=1` 重新启用详细控制台输出
- 范围：
  - 多实例网关的端到端行为
  - WebSocket/HTTP 界面、节点配对及更复杂的网络测试
- 预期：
  - 在 CI 中运行（管道启用时）
  - 不需要真实密钥
  - 包含比单元测试更多的运行环节（可能更慢）

### 实况（真实提供商 + 真实模型）

- 命令：`pnpm test:live`
- 配置：`vitest.live.config.ts`
- 文件：`src/**/*.live.test.ts`
- 默认：通过 `pnpm test:live` 启用（设置 `OPENCLAW_LIVE_TEST=1`）
- 范围：
  - “此提供商/模型今天用真实凭据是否实际可用？”
  - 捕获提供商格式变更、工具调用奇葩情况、认证问题及速率限制行为
- 预期：
  - 设计上不稳定于 CI（真实网络，真实提供商策略，配额，故障）
  - 花费费用 / 使用速率限制
  - 建议运行缩小范围而非“全部运行”
  - 实况测试会调用 `~/.profile` 以获取缺少的 API 密钥
- API 密钥轮换（针对提供商）：设置 `*_API_KEYS` 使用逗号或分号分隔的格式，或设置 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`），或通过 `OPENCLAW_LIVE_*_KEY` 针对实况进行覆盖；测试对速率限制响应含重试逻辑。

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

- 测试：`src/agents/models.profiles.live.test.ts`
- 目标：
  - 枚举发现的模型
  - 使用 `getApiKeyForModel` 选出你有凭据的模型
  - 对每个模型运行简短补全（及必要的定向回归）
- 启用方式：
  - `pnpm test:live`（或直接调用 Vitest 时，设置 `OPENCLAW_LIVE_TEST=1`）
- 设置 `OPENCLAW_LIVE_MODELS=modern`（或别名 `all`）实际运行该套件；否则跳过保持 `pnpm test:live` 聚焦于网关冒烟
- 如何选择模型：
  - `OPENCLAW_LIVE_MODELS=modern` 运行现代白名单（Opus/Sonnet/Haiku 4.5，GPT-5.x + Codex，Gemini 3，GLM 4.7，MiniMax M2.5，Grok 4）
  - `OPENCLAW_LIVE_MODELS=all` 是现代白名单的别名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,..."`（逗号白名单）
- 如何选择提供商：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"`（逗号白名单）
- 密钥来源：
  - 默认：档案存储和环境变量回退
  - 设 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 强制仅从**档案存储**获取
- 存在原因：
  - 分离“提供商 API 坏了/密钥无效”与“网关代理管线坏了”
  - 包含少量孤立回归（例：OpenAI Responses/Codex Responses 逻辑重演 + 工具调用流程）

### 层 2：网关 + 开发代理冒烟测试（“@openclaw” 实际行为）

- 测试：`src/gateway/gateway-models.profiles.live.test.ts`
- 目标：
  - 启动一个进程内网关
  - 创建/补丁 `agent:dev:*` 会话（每次运行可覆盖模型）
  - 遍历带密钥的模型，断言：
    - “有意义”响应（无工具）
    - 实际工具调用成功（读探针）
    - 可选附加工具探针（执行+读探针）
    - OpenAI 回归路径（仅工具调用 → 跟进）保持可用
- 探针细节（助你快速定位故障）：
  - `read` 探针：测试在工作区写入随机字符串文件，请代理 `read` 并回显随机字符串
  - `exec+read` 探针：测试让代理执行写入随机字符串到临时文件，再读取回显
  - 图片探针：测试附加一个生成的 PNG（猫 + 随机代码），预期模型返回 `cat <CODE>`
  - 实现参考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`
- 启用方式：
  - `pnpm test:live`（或直接调用 Vitest时设置 `OPENCLAW_LIVE_TEST=1`）
- 选择模型：
  - 默认：现代白名单（Opus/Sonnet/Haiku 4.5，GPT-5.x + Codex，Gemini 3，GLM 4.7，MiniMax M2.5，Grok 4）
  - 设置 `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是现代白名单的别名
  - 或设置 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗号列表）以缩小范围
- 选择提供商（避免“OpenRouter 全选”）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`（逗号白名单）
- 此实况测试始终开启工具 + 图片探针：
  - `read` 探针 + `exec+read` 探针（工具压力测试）
  - 当模型支持图片输入时，启用图片探针
  - 流程（高层）：
    - 测试生成一个小型带“CAT” + 随机码的 PNG（`src/gateway/live-image-probe.ts`）
    - 通过 `agent` 的 `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 发送
    - 网关解析附件为 `images[]`（`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`）
    - 嵌入的代理转发多模态用户消息给模型
    - 断言：回复包含 `cat` + 代码（OCR 容错：小错误允许）

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

- 跨多个提供商工具调用：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/minimax-m2.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

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

- OpenAI（非 Codex）：`openai/gpt-5.2`（可选：`openai/gpt-5.1`）
- OpenAI Codex：`openai-codex/gpt-5.4`
- Anthropic：`anthropic/claude-opus-4-6`（或 `anthropic/claude-sonnet-4-5`）
- Google（Gemini API）：`google/gemini-3.1-pro-preview` 和 `google/gemini-3-flash-preview`（避免旧 Gemini 2.x 模型）
- Google（Antigravity）：`google-antigravity/claude-opus-4-6-thinking` 和 `google-antigravity/gemini-3-flash`
- Z.AI（GLM）：`zai/glm-4.7`
- MiniMax：`minimax/minimax-m2.5`

运行带工具+图片的网关冒烟：

```
OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/minimax-m2.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts
```

### 基线：工具调用（Read + 可选 Exec）

每个提供商家族至少选一个：

- OpenAI：`openai/gpt-5.2`（或 `openai/gpt-5-mini`）
- Anthropic：`anthropic/claude-opus-4-6`（或 `anthropic/claude-sonnet-4-5`）
- Google：`google/gemini-3-flash-preview`（或 `google/gemini-3.1-pro-preview`）
- Z.AI（GLM）：`zai/glm-4.7`
- MiniMax：`minimax/minimax-m2.5`

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

- OpenRouter：`openrouter/...`（数百模型；使用 `openclaw models scan` 查找支持工具+图片的候选）
- OpenCode Zen：`opencode/...`（通过 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 认证）

更多可纳入实况矩阵的提供商（若有凭据/配置）：
- 内置支持：`openai`、`openai-codex`、`anthropic`、`google`、`google-vertex`、`google-antigravity`、`google-gemini-cli`、`zai`、`openrouter`、`opencode`、`opencode-go`、`xai`、`groq`、`cerebras`、`mistral`、`github-copilot`
- 通过 `models.providers`（自定义端点）：`minimax`（云/API），以及任何兼容 OpenAI/Anthropic 的代理（如 LM Studio、vLLM、LiteLLM 等）

- 内置：`openai`、`openai-codex`、`anthropic`、`google`、`google-vertex`、`google-antigravity`、`google-gemini-cli`、`zai`、`openrouter`、`opencode`、`xai`、`groq`、`cerebras`、`mistral`、`github-copilot`
- 通过 `models.providers`（定制端点）：`minimax`（云/API）、任意 OpenAI/Anthropic 兼容代理（LM Studio、vLLM、LiteLLM 等）

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

## BytePlus 代码计划实况

- 测试：`src/agents/byteplus.live.test.ts`
- 启用：`BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- 可选模型覆盖：`BYTEPLUS_CODING_MODEL=ark-code-latest`

## Docker 运行器（可选“Linux工作环境”检查）

这些会在 repo 的 Docker 镜像中运行 `pnpm test:live`，挂载你的本地配置目录和工作区（如果挂载会调用 `~/.profile`）：

- 直接模型：`pnpm test:docker:live-models`（脚本：`scripts/test-live-models-docker.sh`）
- 网关 + 开发代理：`pnpm test:docker:live-gateway`（脚本：`scripts/test-live-gateway-models-docker.sh`）
- 入门向导（TTY，全流程脚手架）：`pnpm test:docker:onboard`（脚本：`scripts/e2e/onboard-docker.sh`）
- 网关网络（两个容器，WS 认证 + 健康检查）：`pnpm test:docker:gateway-network`（脚本：`scripts/e2e/gateway-network-docker.sh`）
- 插件（自定义扩展加载 + 注册中心冒烟）：`pnpm test:docker:plugins`（脚本：`scripts/e2e/plugins-docker.sh`）

live-model Docker 运行器也会只读绑定当前检出代码，并将其暂存到容器内临时工作目录。这让运行时镜像保持精简，同时对精准本地源码/配置运行 Vitest。

手动 ACP 明文线程冒烟（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 保留此脚本供回归/调试流程，未来可能再次用于 ACP 线程路由验证，勿删。

实用环境变量：

- `OPENCLAW_CONFIG_DIR=...` (default: `~/.openclaw`) mounted to `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (default: `~/.openclaw/workspace`) mounted to `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (default: `~/.profile`) mounted to `/home/node/.profile` and sourced before running tests
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` to narrow the run
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` to ensure creds come from the profile store (not env)

## Docs sanity

在编辑文档后运行文档检查：`pnpm docs:list`。

## Offline regression (CI-safe)

这些是“真实流水线”回归测试但没有真实提供者：

- 网关工具调用（模拟 OpenAI，真实网关 + 代理循环）：`src/gateway/gateway.test.ts`（用例："runs a mock OpenAI tool call end-to-end via gateway agent loop"）
- 网关向导（WS `wizard.start`/`wizard.next`，写配置 + 认证强制）：`src/gateway/gateway.test.ts`（用例："runs wizard over ws and writes auth token config"）

## Agent reliability evals (skills)

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

## Adding regressions (guidance)

当你修复了在实况测试中发现的提供者/模型问题时：

- 尽可能添加 CI 安全的回归测试（模拟/存根提供者，或捕获精确的请求变换）
- 如果是本质上只能实况测试的问题（速率限制、认证策略），请保持实况测试范围窄并通过环境变量选择性启用
- 优先定位捕捉错误的最小层级：
  - 提供者请求转换/回放错误 → 直接模型测试
  - 网关会话/历史/工具流水线错误 → 网关实况冒烟或 CI 安全网关模拟测试
- SecretRef 访问保护：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 从注册表元数据（`listSecretTargetRegistryEntries()`）派生每个 SecretRef 类的一个样本目标，然后断言拒绝访问段执行 id。
  - 如果你在 `src/secrets/target-registry-data.ts` 中添加了新的 `includeInPlan` SecretRef 目标族，请更新那个测试中的 `classifyTargetClass`。该测试有意在未分类目标 id 上失败，防止新类被悄无声息地跳过。
