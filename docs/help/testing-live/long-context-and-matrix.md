---
summary: "OpenAI 长上下文验证运行、推荐的实时食谱和策划的模型矩阵"
title: "OpenAI 长上下文和实时模型矩阵"
read_when:
  - "您故意跨越 OpenAI 长上下文定价边界"
  - "您想要精选的 modern/small 模型列表或可复制的实时食谱"
---

## <a id="live%3A-openai-long-context"></a><a id="live-openai-long-context"></a> 实时：OpenAI 长上下文

- 目标：通过进程自有的隔离 Gateway，验证精确模型嵌入式 OpenClaw 执行，跨越长上下文定价边界，观察一等 OpenAI Responses 压缩项，并证明下一次请求中的不透明重放和前缀裁剪。
- 测试：`src/gateway/gateway-openai-long-context.live.test.ts`
- 启用：`OPENCLAW_LIVE_OPENAI_LONG_CONTEXT=1`
- 配置文件：`OPENCLAW_LIVE_OPENAI_LONG_CONTEXT_PROFILE=full`使用`1050000`总窗口、`922000`安全活动输入、`128000`最大输出和`700000`压缩阈值选择精确的`openai/gpt-5.6-luna`。 `reduced` 以较小的预算达到相同的传输和持久路径。
- Metrics：`OPENCLAW_LIVE_OPENAI_LONG_CONTEXT_METRICS=1` 发出相位计时和令牌观察结果。这些测量结果仅供参考，并非 pass/fail 延迟目标。
- 长输出：`OPENCLAW_LIVE_OPENAI_LONG_CONTEXT_OUTPUT=1`需要4000到8000个输出令牌之间的固定格式响应。
- 可选的原始读取工具压力测试： `OPENCLAW_LIVE_OPENAI_LONG_CONTEXT_TOOL_OUTPUT=1`。它不属于默认配方， 因为有效工具面可能使用 Code Mode，而不是暴露原始读取工具。

完整 `922000` 输入预算配方：

```bash
OPENCLAW_LIVE_OPENAI_LONG_CONTEXT=1 \
  OPENCLAW_LIVE_OPENAI_LONG_CONTEXT_PROFILE=full \
  OPENCLAW_LIVE_OPENAI_LONG_CONTEXT_METRICS=1 \
  OPENCLAW_LIVE_OPENAI_LONG_CONTEXT_OUTPUT=1 \
  node --import tsx scripts/test-live.mts --quiet src/gateway/gateway-openai-long-context.live.test.ts
```

精简预算配方：

```bash
OPENCLAW_LIVE_OPENAI_LONG_CONTEXT=1 \
  OPENCLAW_LIVE_OPENAI_LONG_CONTEXT_PROFILE=reduced \
  OPENCLAW_LIVE_OPENAI_LONG_CONTEXT_METRICS=1 \
  OPENCLAW_LIVE_OPENAI_LONG_CONTEXT_OUTPUT=1 \
  node --import tsx scripts/test-live.mts --quiet src/gateway/gateway-openai-long-context.live.test.ts
```

### <a id="long-context-hard-oracles"></a> 长上下文硬性判定条件

完整的嵌入式和原生配方是验证运行，而不是吞吐量基准测试。除非满足以下运行时契约，否则测试会失败：

- 运行时和模型标识是准确的：根据要求嵌入OpenClaw或本机Codex，两者都在`openai/gpt-5.6-luna`上。
- 至少有一个提供商请求的输入超过 `272000` 个 token，并且每次调用都报告优先级服务。
- 嵌入式 OpenClaw 接收并持久化一等加密 Responses `compaction` 项，在下一次请求中重放完全相同的不透明项，并裁剪较早的输入前缀。加密内容绝不能出现在显示内容或诊断信息中。
- 原生 Codex 报告有效窗口为 `875900`，在没有手动压缩的情况下增长到超过 `700000` 的总范围阈值，并在下一轮自动压缩。
- Each 运行时生成 4000 到 8000 个输出令牌之间的固定格式长响应，并通过压缩和网关重启保留持久标记。

压缩耗时、重启延迟、回合延迟和套件总耗时仅作为信息性指标输出。

### <a id="bounded-compaction-replay"></a> 有界压缩重放

有界重放案例仅在合成工具输出中放置验证标记，重新打开 SQLite 会话，并要求模型调用该标记。在运行任一情况之前配置相应的提供商 API 密钥；显式提供者失败就是测试失败。

Anthropic 练习流式本机压缩和下一个请求的重播。其原生阈值最低为 50,000 个代币：

```bash
OPENCLAW_LIVE_TEST=1 ANTHROPIC_LIVE_TEST=1 \
  node scripts/run-vitest.mjs --config test/vitest/vitest.live.config.ts \
  src/agents/anthropic-transport-stream.live.test.ts \
  -t 'replays streamed native compaction from SQLite'
```

OpenAI 通过具有较小配置上下文预算的托管运行器执行自动客户端汇总，然后重播其持久摘要：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OPENAI_COMPACTION=1 \
  node scripts/run-vitest.mjs --config test/vitest/vitest.live.config.ts \
  src/agents/sessions/agent-session.openai-compaction.live.test.ts \
  -t 'automatically compacts tool history and resumes from its SQLite checkpoint'
```

<Warning>
完整模式故意跨越 OpenAI 的长上下文定价边界，并进行多次大型 API 调用。以上`272000`输入代币，整个请求为2×input/cache和1.5×输出； Fast/Priority 再次将该等级加倍。仅在明确支出批准的情况下使用完整模式。
</Warning>

新鲜OpenAI API-key默认：

```bash
OPENCLAW_LIVE_GATEWAY_OPENAI_API_DEFAULT=1 \
  OPENCLAW_LIVE_GATEWAY_PROVIDERS=openai \
  OPENCLAW_LIVE_GATEWAY_THINKING=off \
  pnpm test:live -- src/gateway/gateway-models.profiles.live.test.ts
```

该证明使 `OPENCLAW_LIVE_GATEWAY_MODELS` 未设置，通过新的入门推理选择路径解析模型，断言 `openai/gpt-6-astra`，然后使用该解析模型运行真正的网关回合。

GPT-5.6 内嵌 OpenClaw 矩阵：

```bash
OPENCLAW_LIVE_GATEWAY_THINKING=ultra \
  OPENCLAW_LIVE_GATEWAY_PROVIDERS=openai \
  OPENCLAW_LIVE_GATEWAY_MODELS='openai/gpt-5.6-terra,openai/gpt-5.6-luna' \
  pnpm test:live -- src/gateway/gateway-models.profiles.live.test.ts
```

Docker 说明：

- Docker 运行器位于 `scripts/test-live-codex-harness-docker.sh`。
- 它传递 `OPENAI_API_KEY`，在存在时复制 Codex CLI 认证文件，将 `@openai/codex` 安装到可写的挂载 npm 前缀中，准备源代码树，然后只运行 Codex-harness 实时测试。
- Docker 默认启用图像、MCP/tool 和 Guardian 检查。当您需要更窄的调试运行时，设置 `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0` 或 `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0` 或 `OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0`。
- Docker 使用相同的显式 Codex 运行时配置，因此旧别名或 OpenClaw 回退无法掩盖 Codex harness 回归。
- Matrix 目标在一个容器中按顺序运行。 Docker 脚本按目标计数调整其默认的 35 分钟超时；任何外壳或 CI 超时必须允许相同的总数。上游 CI 将每个 GPT-5.6 目标保留在单独的分片中。

### <a id="recommended-live-recipes"></a> 推荐的实时测试配方

范围窄、明确的 allowlist 最快，也最不容易出问题：

- 单模型，直接方式（无 Gateway）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.6-luna" pnpm test:live src/agents/models.profiles.live.test.ts`

- 小模型直接 profile：
  - `OPENCLAW_LIVE_MODELS=small pnpm test:live src/agents/models.profiles.live.test.ts`

- 小模型 Gateway profile：
  - `OPENCLAW_LIVE_GATEWAY_MODELS=small pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Ollama Cloud API 冒烟：
  - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA=1 OPENCLAW_LIVE_OLLAMA_BASE_URL=https://ollama.com OPENCLAW_LIVE_OLLAMA_MODEL=glm-5.2:cloud OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=0 pnpm test:live -- extensions/ollama/ollama.live.test.ts`

- 单模型，Gateway 冒烟：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.6-luna" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多个提供方的工具调用：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.6-luna,anthropic/claude-opus-4-6,google/gemini-3.5-flash,deepseek/deepseek-v4-flash,zai/glm-5.1,minimax/MiniMax-M3" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Z.AI 编码方案 GLM-5.3 直烟：
  - `ZAI_CODING_LIVE_TEST=1 pnpm test:live src/agents/zai.live.test.ts`

- Google 重点测试：
  - Gemini（API 密钥）：`OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3.5-flash" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 自适应思考冒烟（来自私有 QA CLI 的 `qa manual`－需要 `OPENCLAW_ENABLE_PRIVATE_QA_CLI=1` 和源码检出；见 [QA 概览](/concepts/qa-e2e-automation)）：
  - Gemini 3 动态默认：`OPENCLAW_ENABLE_PRIVATE_QA_CLI=1 pnpm openclaw qa manual --provider-mode live-frontier --model google/gemini-3.1-pro-preview --alt-model google/gemini-3.1-pro-preview --message '/think adaptive Reply exactly: GEMINI_ADAPTIVE_OK' --timeout-ms 180000`
  - Gemini 2.5 动态预算：`OPENCLAW_ENABLE_PRIVATE_QA_CLI=1 pnpm openclaw qa manual --provider-mode live-frontier --model google/gemini-2.5-flash --alt-model google/gemini-2.5-flash --message '/think adaptive Reply exactly: GEMINI25_ADAPTIVE_OK' --timeout-ms 180000`

注意：

- `google/...` 使用 Gemini API（API 密钥）。
- `google-gemini-cli/...` 使用计算机上的本地 Gemini CLI（单独的身份验证 + 工具怪癖）。
- `google-antigravity/...` 不是注册的提供商或支持的安装路径。不要将其添加到实时测试白名单中。
- Gemini API 与 Gemini CLI：
  - API：OpenClaw 通过 HTTP 调用 Google 托管的 Gemini API（API 密钥/配置文件身份验证）；这就是大多数用户所说的“Gemini”的意思。
  - CLI：OpenClaw shell 到本地 `gemini` 二进制文件；它有自己的身份验证，并且可以表现不同（streaming/tool support/version 倾斜）。

## <a id="live%3A-model-matrix-(what-we-cover)"></a><a id="live-model-matrix-what-we-cover"></a> Live：模型矩阵（我们覆盖的内容）

Live 是可选择加入的，因此没有固定的“CI 模型列表”。 `OPENCLAW_LIVE_MODELS=modern` / `OPENCLAW_LIVE_GATEWAY_MODELS=modern`（及其 `all` 别名）从 `src/agents/test-helpers/live-model-dynamic-candidates.ts` 中的 `HIGH_SIGNAL_LIVE_MODEL_PRIORITY` 运行策划的优先级列表，按以下优先级顺序：

| Provider/model                                      | 笔记      |
| --------------------------------------------------- | ---------- |
| `anthropic/claude-opus-5-5`                         |            |
| `anthropic/claude-opus-5`                           |            |
| `anthropic/claude-opus-4-8`                         |            |
| `anthropic/claude-sonnet-5`                         |            |
| `anthropic/claude-sonnet-4-6`                       |            |
| `anthropic/claude-opus-4-7`                         |            |
| `google/gemini-3.1-pro-preview`                     | Gemini API |
| `google/gemini-3.5-flash`                           | Gemini API |
| `cohere/command-a-plus-05-2026`                     |            |
| `moonshot/kimi-k3`                                  |            |
| `anthropic/claude-opus-4-6`                         |            |
| `deepseek/deepseek-v4-flash`                        |            |
| `deepseek/deepseek-v4-pro`                          |            |
| `minimax/MiniMax-M3`                                |            |
| `openai/gpt-5.6`                                    |            |
| `openrouter/openai/gpt-5.6-luna`                    |            |
| `openrouter/minimax/minimax-m2.7`                   |            |
| `opencode-go/glm-5.3`                               |            |
| `xai/grok-4.7`                                      |            |
| `xai/grok-4.6`                                      |            |
| `xai/grok-4.5`                                      |            |
| `xai/grok-4.20-0309-reasoning`                      |            |
| `zai/glm-5.1`                                       |            |
| `fireworks/accounts/fireworks/routers/glm-5p3-fast` |            |
| `minimax-portal/minimax-m3`                         |            |

精选的 **小模型** 列表（`OPENCLAW_LIVE_MODELS=small` / `OPENCLAW_LIVE_GATEWAY_MODELS=small`）来自 `SMALL_LIVE_MODEL_PRIORITY`：

| Provider/model               |
| ---------------------------- |
| `lmstudio/qwen/qwen3.5-9b`   |
| `vllm/qwen/qwen3-8b`         |
| `sglang/qwen/qwen3-8b`       |
| `ollama/gemma3:4b`           |
| `openrouter/qwen/qwen3.5-9b` |
| `openrouter/z-ai/glm-5.1`    |
| `openrouter/z-ai/glm-5`      |
| `zai/glm-5.1`                |

关于 modern 列表的说明：

- `codex` 和 `codex-cli` 提供程序被排除在默认的现代扫描之外（它们涵盖 CLI-backend/ACP 行为，在 [CLI 后端和 APNs 通道上单独测试](/help/testing-live/cli-backends) 和 [ACP 绑定和Codex 应用程序服务器通道](/help/testing-live/acp-and-codex)）。默认情况下，`openai/gpt-5.6` 本身通过 Codex 应用程序服务器harness进行路由；请参阅[Live：Codex应用程序服务器利用smoke](/help/testing-live/acp-and-codex#live-codex-app-server-harness-smoke)。
- `fireworks`、`google`、`openrouter` 和 `xai` 在 modern 扫描中只运行其显式精选的模型 id（不会自动扩展为“此提供方的所有模型”）。
- 在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中包含至少一个具有图像功能的模型（Claude/Gemini/OpenAI-family 视觉变体等）以进行图像检查。

使用工具 + 图像，针对跨提供方的手选集合运行网关冒烟测试：

```bash
OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.6-luna,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3.5-flash,deepseek/deepseek-v4-flash,zai/glm-5.1,minimax/MiniMax-M3" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts
```

在精选列表之外的可选额外覆盖（有则更好，选择一个你已启用且支持“工具”的模型）：

- Mistral: `mistral/...`
- Cerebras：`cerebras/...`（如果你有权限）
- LM Studio：`lmstudio/...`（本地；工具调用取决于 API 模式）

### <a id="aggregators-%2F-alternate-gateways"></a><a id="aggregators-/-alternate-gateways"></a> 聚合器 / 备用网关

如果你已启用密钥，也可以通过以下方式测试：

- OpenRouter：`openrouter/...`（数百个模型；使用 `openclaw models scan` 查找支持工具 + 图像的候选项）
- OpenCode：`opencode/...` 用于 Zen，`opencode-go/...` 用于 Go（通过 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 认证）

您可以在实时矩阵中包含更多提供商（如果您有 creds/config）：

- 第一方提供方插件：`anthropic`, `cerebras`, `github-copilot`, `google`, `google-gemini-cli`, `google-vertex`, `groq`, `mistral`, `openai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `zai`
- Via `models.providers`（自定义端点）：`minimax` （cloud/API），加上任何 OpenAI/Anthropic-compatible 代理（LM Studio、vLLM、LiteLLM 等）

<Tip>
不要在文档中对“所有模型”进行硬编码。权威列表是 `await discoverModelsAsync(...)` 在您的计算机上返回的任何内容以及可用的密钥。
</Tip>
