---
summary: "两层实时模型烟雾：直接完成和网关+开发代理管道"
title: "真人烟雾模型（配置文件键）"
read_when:
  - "您正在使用自己的个人资料密钥吸烟提供商或模型"
  - "您需要区分损坏的提供商密钥和损坏的网关管道"
---

## <a id="live%3A-model-smoke-(profile-keys)"></a><a id="live-model-smoke-profile-keys"></a> 实时：模型冒烟（配置文件密钥）

实时模型测试分成两层，这样失败就能彼此隔离：

- “直接模式”告诉您provider/model是否可以用给定的密钥应答。
- “网关冒烟”用于判断该模型的完整网关 + agent 流程是否可用（会话、历史记录、工具、沙箱策略等）。

[Live 上列出的精选模型：模型矩阵](/help/testing-live/long-context-and-matrix#live-model-matrix-what-we-cover) 存在于 `src/agents/test-helpers/live-model-dynamic-candidates.ts` 中并随时间变化；将那里的数组视为事实来源，而不是此页面。

MiniMax M3 使用 `minimax/MiniMax-M3` 作为其默认 provider/model 引用。

显式 `provider/model` 选择使用代理的共享模型解析器，包括配置的模型和接受的捆绑别名。不明确的仅模型选择器继续枚举匹配的已发现模型。在检查运行之前会报告无效的选择器和无法解析的请求模型。提供商允许名单仍然缩小了选择范围，有意的模型上限仍然限制了候选人的数量。解析每个适用的选择器证明可用性，而不是对上限省略的模型的推断。

### <a id="layer-1%3A-direct-model-completion-(no-gateway)"></a><a id="layer-1-direct-model-completion-no-gateway"></a> 第 1 层：直接模型补全（无网关）

- 测试：`src/agents/models.profiles.live.test.ts`
- 目标：
  - 枚举已发现的模型
  - 使用 `getApiKeyForModel` 选择你拥有凭据的模型
  - 为每个模型运行一次小型补全测试（并在需要时运行针对性的回归测试）
- 启用方式：
  - `pnpm test:live`（如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
  - 设置 `OPENCLAW_LIVE_MODELS=modern`、`small` 或 `all`（`modern` 的别名）以实际运行此测试套件；否则会跳过，因此单独运行 `pnpm test:live` 时仍只会专注于网关冒烟测试。
- 模型选择方式：
  - `OPENCLAW_LIVE_MODELS=modern` 运行策划的高信号优先级列表（请参阅 [Live：模型矩阵](/help/testing-live/long-context-and-matrix#live-model-matrix-what-we-cover)）
  - `OPENCLAW_LIVE_MODELS=small` 运行精选的小模型优先级列表
  - `OPENCLAW_LIVE_MODELS=all` 是 `modern` 的别名
  - 或使用 `OPENCLAW_LIVE_MODELS="openai/gpt-5.6-luna,anthropic/claude-opus-4-6,..."`（逗号分隔的允许列表）
  - 本地Ollama小模型运行默认为`http://127.0.0.1:11434`；仅针对 LAN、自定义或 Ollama Cloud 端点设置 `OPENCLAW_LIVE_OLLAMA_BASE_URL`。
  - Modern/all 和小型扫描默认以其策划列表长度作为上限；设置 `OPENCLAW_LIVE_MAX_MODELS=0` 进行详尽的选定轮廓扫描，或设置正数以获得较小的上限。
  - 穷举扫描对整个直接模型测试使用 `OPENCLAW_LIVE_TEST_TIMEOUT_MS` 作为超时时间。默认值：60 分钟。
  - Direct-模型检查默认以20路并行运行；将 `OPENCLAW_LIVE_MODEL_CONCURRENCY` 设置为覆盖。
- 提供方选择方式：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-gemini-cli"`（逗号分隔的允许列表）
- 密钥来源：
  - 默认：配置文件存储和环境变量回退值
  - 设置 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1`，强制仅使用**配置文件存储**中的密钥
- 存在的原因：
  - 将“提供方 API 故障／密钥无效”与“网关 agent 流程故障”区分开
  - 包含小型、隔离的回归测试（例如：OpenAI Responses/Codex Responses 的推理重放 + 工具调用流程）

### <a id="layer-2%3A-gateway-%2B-dev-agent-smoke-(what-%22%40openclaw%22-actually-does)"></a><a id="layer-2-gateway-+-dev-agent-smoke-what-@openclaw-actually-does"></a> 第 2 层：网关 + 开发 agent 冒烟（即“@openclaw”实际执行的内容）

- 测试：`src/gateway/gateway-models.profiles.live.test.ts`
- 目标：
  - 启动一个进程内网关
  - Create/patch `agent:dev:*` 会话（每次运行的模型覆盖）
  - 遍历拥有密钥的模型，并断言：
    - “有意义的”响应（无工具）
    - a 真实工具调用有效（读取检查）
    - 可选的额外工具检查（执行+读取检查）
    - OpenAI 回归路径（仅工具调用 -> 后续跟进）仍然正常工作
- 检查详细信息（以便您可以快速解释故障）：
  - `read` 检查：测试在工作区中写入一个随机数文件，并要求代理 `read` 它并回显随机数。
  - `exec+read` 检查：测试要求代理将 `exec`- 将随机数写入临时文件，然后将 `read` 返回。
  - 图像检查：测试附加生成的PNG（猫+随机代码）并期望模型返回`cat <CODE>`。
  - 实现参考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `test/helpers/live-image-probe.ts`。
- 启用方式：
  - `pnpm test:live`（如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
- 模型选择方式：
  - 默认：精选的高信号（`modern`）优先级列表
  - `OPENCLAW_LIVE_GATEWAY_MODELS=small` 通过完整的网关 + agent 流程运行精选的小模型列表
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是 `modern` 的别名
  - 或设置 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗号分隔的列表）来缩小范围
  - Modern/all 和小型网关扫描默认以其策划列表长度作为上限；设置 `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` 进行详尽的选定扫描，或设置正数以获得较小的上限。
- 提供方选择方式（避免“OpenRouter 全部模型”）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-gemini-cli,openai,anthropic,zai,minimax"`（逗号分隔的允许列表）
- Tool + 图像检查在此实时测试中始终处于开启状态：
  - `read` 检查 + `exec+read` 检查（刀具应力）
  - 当模型通告图像输入支持时运行图像检查
  - 流程（高层概述）：
    - Test 生成一个微小的 PNG，其中包含“CAT”+随机代码（`test/helpers/live-image-probe.ts`）
    - 通过 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 发送
    - 网关将附件解析为 `images[]`（`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`）
    - 内嵌 agent 向模型转发多模态用户消息
    - 断言：回复包含 `cat` + 代码（允许 OCR 存在轻微错误）

<Tip>
要查看你机器上可以测试的内容（以及精确的 `provider/model` id），请运行：

```bash
openclaw models list
openclaw models list --json
```

</Tip>
