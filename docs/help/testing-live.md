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

## 实时测试与您的真实网关

实时测试套件和临时冒烟测试绝不能干扰已经在提供真实流量的网关（无论是您的还是其他操作员的）：

- 自带网关：使用进程内网关（下方的第 2 层），或使用隔离的状态目录启动一个开发实例（`OPENCLAW_STATE_DIR=<scratch>`），并使用空闲端口。真实网关正在使用默认网关端口（18789）时，不要绑定该端口。
- 不要对本会话中并非由您启动的服务执行 `openclaw gateway stop`/`restart`（或 `launchctl`/`systemctl`/tmux 等效命令）——那是操作员正在使用的实时实例。请先获得明确批准。
- 需要真实数据？将实时状态/数据库复制到您的开发状态目录中，并针对副本进行测试。对实时网关状态执行原地迁移同样需要明确批准。

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

`voicecall smoke` 默认是一次试运行，除非同时提供 `--yes`；仅当你打算发起真实通话时才使用 `--yes`。对于 Twilio、Telnyx 和 Plivo，成功的就绪检查需要一个公开的 webhook URL——本地／私有的 loopback URL 会被拒绝，因为这些提供商无法访问它们。

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
- Android 完整设置详情：[Android 应用](/platforms/android)。

## 实时：模型冒烟（配置文件密钥）

实时模型测试分成两层，这样失败就能彼此隔离：

- “直接模型”用于判断在给定密钥下，提供方／模型是否至少能够正常回答。
- “网关冒烟”用于判断该模型的完整网关 + agent 流程是否可用（会话、历史记录、工具、沙箱策略等）。

下面整理的模型列表位于 `src/agents/live-model-filter.ts`，并且
会随着时间变化；请把那里的数组视为事实来源，而不是本
页面。

MiniMax M3 使用 `minimax/MiniMax-M3` 作为其默认 provider/model 引用。

### 第 1 层：直接模型补全（无网关）

- 测试：`src/agents/models.profiles.live.test.ts`
- 目标：
  - 枚举已发现的模型
  - 使用 `getApiKeyForModel` 选择你拥有凭据的模型
  - 为每个模型运行一次小型补全测试（并在需要时运行针对性的回归测试）
- 启用方式：
  - `pnpm test:live`（如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
  - 设置 `OPENCLAW_LIVE_MODELS=modern`、`small` 或 `all`（`modern` 的别名）以实际运行此测试套件；否则会跳过，因此单独运行 `pnpm test:live` 时仍只会专注于网关冒烟测试。
- 模型选择方式：
  - `OPENCLAW_LIVE_MODELS=modern` 运行精选的高信号优先级列表（参见[实时：模型矩阵](#live-model-matrix-what-we-cover)）
  - `OPENCLAW_LIVE_MODELS=small` 运行精选的小模型优先级列表
  - `OPENCLAW_LIVE_MODELS=all` 是 `modern` 的别名
  - 或使用 `OPENCLAW_LIVE_MODELS="openai/gpt-5.6-luna,anthropic/claude-opus-4-6,..."`（逗号分隔的允许列表）
  - 本地 Ollama 小模型运行默认使用 `http://127.0.0.1:11434`；仅当使用局域网、自定义或 Ollama Cloud 端点时，才设置 `OPENCLAW_LIVE_OLLAMA_BASE_URL`。
  - modern/all 和 small 扫描默认以各自精选列表的长度作为上限；设置 `OPENCLAW_LIVE_MAX_MODELS=0` 可对选定配置进行穷举扫描，设置为正数则使用更小的上限。
  - 穷举扫描对整个直接模型测试使用 `OPENCLAW_LIVE_TEST_TIMEOUT_MS` 作为超时时间。默认值：60 分钟。
  - 直接模型探测默认使用 20 路并行；设置 `OPENCLAW_LIVE_MODEL_CONCURRENCY` 可覆盖此设置。
- 提供方选择方式：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-gemini-cli"`（逗号分隔的允许列表）
- 密钥来源：
  - 默认：配置文件存储和环境变量回退值
  - 设置 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1`，强制仅使用**配置文件存储**中的密钥
- 存在的原因：
  - 将“提供方 API 故障／密钥无效”与“网关 agent 流程故障”区分开
  - 包含小型、隔离的回归测试（例如：OpenAI Responses/Codex Responses 的推理重放 + 工具调用流程）

### 第 2 层：网关 + 开发 agent 冒烟（即“@openclaw”实际执行的内容）

- 测试：`src/gateway/gateway-models.profiles.live.test.ts`
- 目标：
  - 启动一个进程内网关
  - 创建／修改一个 `agent:dev:*` 会话（每次运行覆盖模型）
  - 遍历拥有密钥的模型，并断言：
    - “有意义的”响应（无工具）
    - 实际工具调用可用（读取探测）
    - 可选的额外工具探测（执行 + 读取探测）
    - OpenAI 回归路径（仅工具调用 -> 后续跟进）仍然正常工作
- 探测详情（便于快速解释失败原因）：
  - `read` 探测：测试会在工作区写入一个随机数文件，并要求 agent `read` 该文件，然后回显随机数。
  - `exec+read` 探测：测试要求 agent 使用 `exec` 将随机数写入临时文件，然后再使用 `read` 读回。
  - 图像探测：测试附加一张生成的 PNG（猫 + 随机代码），并期望模型返回 `cat <CODE>`。
  - 实现参考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `test/helpers/live-image-probe.ts`。
- 启用方式：
  - `pnpm test:live`（如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
- 模型选择方式：
  - 默认：精选的高信号（`modern`）优先级列表
  - `OPENCLAW_LIVE_GATEWAY_MODELS=small` 通过完整的网关 + agent 流程运行精选的小模型列表
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是 `modern` 的别名
  - 或设置 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗号分隔的列表）来缩小范围
  - modern/all 和 small 网关扫描默认以各自精选列表的长度作为上限；设置 `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` 可对选定模型进行穷举扫描，设置为正数则使用更小的上限。
- 提供方选择方式（避免“OpenRouter 全部模型”）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-gemini-cli,openai,anthropic,zai,minimax"`（逗号分隔的允许列表）
- 此实时测试始终启用工具 + 图像探测：
  - `read` 探测 + `exec+read` 探测（工具压力测试）
  - 当模型声明支持图像输入时运行图像探测
  - 流程（高层概述）：
    - 测试生成一张包含“CAT”+ 随机代码的小型 PNG（`test/helpers/live-image-probe.ts`）
    - 通过 agent 的 `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 发送
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

## 实时：CLI 后端冒烟（Claude、Gemini 或其他本地 CLI）

- 测试：`src/gateway/gateway-cli-backend.live.test.ts`
- 目标：使用本地 CLI 后端验证 Gateway + agent 管道，而不触碰你的默认配置。
- 各后端特定的冒烟默认值位于所属插件的 `cli-backend.ts` 定义中。
- 启用：
  - `pnpm test:live`（或在直接调用 Vitest 时使用 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- 默认值：
  - 默认提供商／模型：`claude-cli/claude-sonnet-4-6`
  - 命令／参数／图像行为来自所属 CLI 后端插件元数据。
- 覆盖项（可选）：
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/claude"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 用于发送真实图像附件（路径会注入到提示词中）。默认在 Docker 配方中关闭。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 用于将图像文件路径作为 CLI 参数传递，而不是注入到提示词中。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"`（或 `"list"`）用于在设置了 `IMAGE_ARG` 时控制图像参数的传递方式。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 用于发送第二轮并验证恢复流程。
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=1` 用于在所选模型支持切换目标时，启用 Claude Sonnet -> Opus 同会话连续性探测。默认关闭，包括 Docker 配方中。
  - `OPENCLAW_LIVE_CLI_BACKEND_MCP_PROBE=1` 用于启用 MCP／工具回环探测。默认在 Docker 配方中关闭。

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
- 它以非 root 用户 `node` 的身份，在仓库 Docker 镜像内运行实时 CLI 后端冒烟测试。
- 它从所属插件解析 CLI 冒烟元数据，然后将匹配的 Linux CLI 软件包（`@anthropic-ai/claude-code` 或 `@google/gemini-cli`）安装到 `OPENCLAW_DOCKER_CLI_TOOLS_DIR` 指定的可写缓存前缀中（默认：`~/.cache/openclaw/docker-cli-tools`）。
- `codex-cli` 不再是捆绑的 CLI 后端；请改用带有 Codex app-server 运行时的 `openai/*`（参见[实时：Codex app-server harness 冒烟测试](#live-codex-app-server-harness-smoke)）。
- `pnpm test:docker:live-cli-backend:claude-subscription` 需要通过以下任一方式提供可移植的 Claude Code 订阅 OAuth：使用包含 `claudeAiOauth.subscriptionType` 的 `~/.claude/.credentials.json`，或使用 `claude setup-token` 获取的 `CLAUDE_CODE_OAUTH_TOKEN`。它会先在 Docker 中验证直接运行 `claude -p`，然后在不保留 Anthropic API 密钥环境变量的情况下，运行两轮 Gateway CLI 后端调用。由于该订阅通道会消耗已登录订阅的使用限额，并且 Anthropic 可能在不发布 OpenClaw 新版本的情况下更改 Claude Agent SDK／`claude -p` 的计费和速率限制行为，因此默认禁用 Claude MCP／工具和图像探测。
- Claude 和 Gemini 通过上述标志支持相同的探测集（文本调用、图像分类、MCP `automations` 工具调用、模型切换连续性），但默认不运行其中任何探测——如有需要，请按标志逐项启用。

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
- 注释：
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

## 实时：Codex app-server harness 冒烟测试

- 目标：通过正常的网关 `agent` 方法验证插件所有的 Codex harness
  - 加载捆绑的 `codex` 插件
  - 通过 `/model <ref> --runtime codex` 选择 OpenAI 模型
  - 使用请求的思考级别发送第一轮网关 agent 对话
  - 向同一个 OpenClaw 会话发送第二轮对话，并验证 app-server 线程可以恢复
  - 通过相同的网关命令路径运行 `/codex status` 和 `/codex models`
  - 可选地运行两个经过 Guardian 审查的升级 shell 探测：一个应获批准的无害命令，以及一个应被拒绝、从而让 agent 反问的伪造密钥上传操作
- 测试：`src/gateway/gateway-codex-harness.live.test.ts`
- 启用：`OPENCLAW_LIVE_CODEX_HARNESS=1`
- Harness 基准模型：`openai/gpt-5.6-luna`
- 新鲜 OpenAI API 密钥选择默认值：`openai/gpt-5.6-sol`
- 默认思考级别：`low`
- 模型覆盖：`OPENCLAW_LIVE_CODEX_HARNESS_MODEL=openai/<model>`
- 思考级别覆盖：`OPENCLAW_LIVE_CODEX_HARNESS_THINKING=<level>`
- 非默认模型 effort 断言：
  `OPENCLAW_LIVE_CODEX_HARNESS_EXPECTED_EFFORT=<level>`
- 矩阵覆盖：`OPENCLAW_LIVE_CODEX_HARNESS_TARGETS=<model>=<thinking>,...`
- 认证模式：`OPENCLAW_LIVE_CODEX_HARNESS_AUTH=codex-auth`（默认）使用
  复制的 Codex 登录信息；`api-key` 通过 Codex app-server 使用
  `OPENAI_API_KEY`。
- 可选图像探测：`OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1`
- 可选 MCP/工具探测：`OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1`
- 可选 Guardian 探测：`OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1`
- 可选恢复压力测试：`OPENCLAW_LIVE_CODEX_HARNESS_RESUME_STRESS=1` 添加
  四轮历史对话，然后关闭并重启网关和 Codex app-server
  三次，同时要求使用相同的原生线程 ID 和对话历史。可通过
  `OPENCLAW_LIVE_CODEX_HARNESS_RESUME_STRESS_HISTORY_TURNS`（1-20）和
  `OPENCLAW_LIVE_CODEX_HARNESS_RESUME_STRESS_RESTARTS`（1-10）覆盖有界计数。
- 可选扇出压力测试：设置 `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1`
  和 `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_COUNT`（1-12）。Harness 会并发启动
  每个子任务，等待每个终态运行完成，并验证每个子任务的唯一回复和原生线程身份。
- 可选压缩压力测试：`OPENCLAW_LIVE_CODEX_HARNESS_COMPACTION_STRESS=1`
  生成有界的原生工具输出，要求自动压缩事件，验证持久化的压缩计数和隐藏标记召回，
  重启网关和物理 Codex app-server，然后重复输出和压缩阶段。可通过
  `OPENCLAW_LIVE_CODEX_HARNESS_COMPACTION_STRESS_TURNS`（1-8）和
  `OPENCLAW_LIVE_CODEX_HARNESS_LARGE_OUTPUT_BYTES`（100000-800000）调整有界工作量。
- 完整直接 API 上下文：`OPENCLAW_LIVE_CODEX_HARNESS_FULL_CONTEXT=1` 应用
  `922000` 上下文和 `700000` 总自动压缩限制，在不使用 `/compact` 或其他手动检查点的情况下，
  发送密集且有界的用户对话，并要求之后的一轮简短对话触发原生自动压缩。它要求
  `OPENCLAW_LIVE_CODEX_HARNESS_AUTH=api-key`，以及绝对路径形式的
  `OPENCLAW_LIVE_CODEX_HARNESS_MODEL_CATALOG`。目录必须公开精确选中的模型，并包含
  `context_window: 922000`、
  `max_context_window: 922000` 和
  `auto_compact_token_limit: 700000`，这样 Codex 就不会将覆盖值限制回其正常目录窗口。
  上述普通的降低阈值压力测试会保留更严格的自动压缩和隐藏标记保留断言。
- 可选循环中继退出探测：
  `OPENCLAW_LIVE_CODEX_HARNESS_DISABLE_LOOP_RELAY=1`
- 请求的思考偏好可能会映射到 Codex 为该模型公布的最接近 effort。例如，Luna 会将 `minimal` 映射为 `low`。
- 已知 Codex 目录中的模型会自动推导出准确的原生 effort。未知模型覆盖必须声明预期的映射 effort。
- 冒烟测试强制使用 provider/model `agentRuntime.id: "codex"`，因此损坏的 Codex harness 无法通过静默回退到 OpenClaw 来伪装通过。
- 认证：来自本地 Codex 订阅登录的 Codex app-server 认证；或者当
  `OPENCLAW_LIVE_CODEX_HARNESS_AUTH=api-key` 时使用 `OPENAI_API_KEY`。对于订阅运行，Docker 可以复制 `~/.codex/auth.json` 和 `~/.codex/config.toml`。

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

重启和历史记录压力测试：

```bash
OPENCLAW_LIVE_CODEX_HARNESS_RESUME_STRESS=1 \
pnpm test:docker:live-codex-harness
```

扇出、大输出、压缩和重启压力测试：

```bash
OPENCLAW_LIVE_CODEX_HARNESS_AUTH=api-key \
  OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_COUNT=8 \
  OPENCLAW_LIVE_CODEX_HARNESS_RESUME_STRESS=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_COMPACTION_STRESS=1 \
  pnpm test:docker:live-codex-harness
```

完整原生 Codex `922000` 输入预算压缩压力测试：

```bash
OPENCLAW_LIVE_CODEX_HARNESS=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_AUTH=api-key \
  OPENCLAW_LIVE_CODEX_HARNESS_FULL_CONTEXT=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MODEL_CATALOG=/absolute/path/to/models-api-1m.json \
  OPENCLAW_LIVE_CODEX_HARNESS_MODEL=openai/gpt-5.6-sol \
  OPENCLAW_LIVE_CODEX_HARNESS_THINKING=low \
  OPENCLAW_LIVE_CODEX_HARNESS_COMPACTION_STRESS_TURNS=8 \
  OPENCLAW_LIVE_CODEX_HARNESS_LARGE_OUTPUT_BYTES=800000 \
  OPENCLAW_LIVE_CODEX_HARNESS_DEBUG=1 \
  node --import tsx scripts/test-live.mts --quiet src/gateway/gateway-codex-harness.live.test.ts
```

GPT-5.6 原生 Codex 矩阵：

```bash
OPENCLAW_LIVE_CODEX_HARNESS_AUTH=api-key \
  OPENCLAW_LIVE_CODEX_HARNESS_TARGETS='openai/gpt-5.6-sol=ultra,openai/gpt-5.6-terra=ultra,openai/gpt-5.6-luna=max' \
  pnpm test:docker:live-codex-harness
```

## 实时：OpenAI 长上下文

- 目标：通过进程自有的隔离 Gateway，验证精确模型嵌入式 OpenClaw 执行，跨越长上下文定价边界，观察一等 OpenAI Responses 压缩项，并证明下一次请求中的不透明重放和前缀裁剪。
- 测试：`src/gateway/gateway-openai-long-context.live.test.ts`
- 启用：`OPENCLAW_LIVE_OPENAI_LONG_CONTEXT=1`
- 配置文件：`OPENCLAW_LIVE_OPENAI_LONG_CONTEXT_PROFILE=full` 选择精确的
  `openai/gpt-5.6-sol`，总窗口为 `1050000`，安全活动输入为
  `922000`，最大输出为 `128000`，压缩阈值为 `700000`。`reduced`
  使用更小的预算，但经过相同的传输和持久化路径。
- 指标：`OPENCLAW_LIVE_OPENAI_LONG_CONTEXT_METRICS=1` 会输出阶段计时和
  token 观测值。这些测量仅供参考，不是通过／失败的延迟目标。
- 长输出：`OPENCLAW_LIVE_OPENAI_LONG_CONTEXT_OUTPUT=1` 要求生成
  4000 到 8000 个输出 token 之间的确定性响应。
- 可选的原始读取工具压力测试：
  `OPENCLAW_LIVE_OPENAI_LONG_CONTEXT_TOOL_OUTPUT=1`。它不属于默认配方，
  因为有效工具面可能使用 Code Mode，而不是暴露原始读取工具。

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

### 长上下文硬性判定条件

完整的嵌入式和原生配方是验证运行，而不是吞吐量基准测试。除非满足以下运行时契约，否则测试会失败：

- 运行时和模型身份必须精确匹配：按请求使用嵌入式 OpenClaw 或原生 Codex，二者都使用 `openai/gpt-5.6-sol`。
- 至少有一个提供商请求的输入超过 `272000` 个 token，并且每次调用都报告优先级服务。
- 嵌入式 OpenClaw 接收并持久化一等加密 Responses `compaction` 项，在下一次请求中重放完全相同的不透明项，并裁剪较早的输入前缀。加密内容绝不能出现在显示内容或诊断信息中。
- 原生 Codex 报告有效窗口为 `875900`，在没有手动压缩的情况下增长到超过 `700000` 的总范围阈值，并在下一轮自动压缩。
- 每个运行时都会生成 4000 到 8000 个输出 token 之间的确定性长响应，并在压缩和 Gateway 重启后保留持久化标记。

压缩耗时、重启延迟、回合延迟和套件总耗时仅作为信息性指标输出。

<Warning>
完整模式会有意跨越 OpenAI 的长上下文定价边界，并发起多次大型 API 调用。当输入 token 超过 `272000` 时，整个请求的输入／缓存价格为 2 倍，输出价格为 1.5 倍；Fast／Priority 会使该层级的价格再次翻倍。只有在获得明确的费用批准后，才可使用完整模式。
</Warning>

新鲜 OpenAI API 密钥默认配置：

```bash
OPENCLAW_LIVE_GATEWAY_OPENAI_API_DEFAULT=1 \
  OPENCLAW_LIVE_GATEWAY_PROVIDERS=openai \
  OPENCLAW_LIVE_GATEWAY_THINKING=off \
  pnpm test:live -- src/gateway/gateway-models.profiles.live.test.ts
```

此验证将 `OPENCLAW_LIVE_GATEWAY_MODELS` 保持未设置，通过新鲜引导流程的推理选择接缝解析模型，断言为 `openai/gpt-5.6-sol`，然后使用已解析的模型运行一次真实的 Gateway 回合。

GPT-5.6 内嵌 OpenClaw 矩阵：

```bash
OPENCLAW_LIVE_GATEWAY_THINKING=ultra \
  OPENCLAW_LIVE_GATEWAY_PROVIDERS=openai \
  OPENCLAW_LIVE_GATEWAY_MODELS='openai/gpt-5.6-sol,openai/gpt-5.6-terra,openai/gpt-5.6-luna' \
  pnpm test:live -- src/gateway/gateway-models.profiles.live.test.ts
```

Docker 说明：

- Docker 运行器位于 `scripts/test-live-codex-harness-docker.sh`。
- 它传递 `OPENAI_API_KEY`，在存在时复制 Codex CLI 认证文件，将 `@openai/codex` 安装到可写的挂载 npm 前缀中，准备源代码树，然后只运行 Codex-harness 实时测试。
- Docker 默认启用图片、MCP／工具和 Guardian 探测。需要更窄的调试运行时，设置 `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0` 或 `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0` 或 `OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0`。
- Docker 使用相同的显式 Codex 运行时配置，因此旧别名或 OpenClaw 回退无法掩盖 Codex harness 回归。
- 矩阵目标在一个容器中按顺序运行。Docker 脚本会按目标数量扩展其默认 35 分钟超时；任何外层 shell 或 CI 超时都必须允许相同的总时长。规范 CI 会把每个 GPT-5.6 目标放在独立 shard 中。

### 推荐的实时测试配方

范围窄、明确的 allowlist 最快，也最不容易出问题：

- 单模型，直接方式（无 Gateway）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.6-luna" pnpm test:live src/agents/models.profiles.live.test.ts`

- 小模型直接 profile：
  - `OPENCLAW_LIVE_MODELS=small pnpm test:live src/agents/models.profiles.live.test.ts`

- 小模型 Gateway profile：
  - `OPENCLAW_LIVE_GATEWAY_MODELS=small pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Ollama Cloud API 冒烟：
  - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA=1 OPENCLAW_LIVE_OLLAMA_BASE_URL=https://ollama.com OPENCLAW_LIVE_OLLAMA_MODEL=glm-5.1:cloud OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=0 pnpm test:live -- extensions/ollama/ollama.live.test.ts`

- 单模型，Gateway 冒烟：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.6-luna" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多个提供方的工具调用：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.6-luna,anthropic/claude-opus-4-6,google/gemini-3.5-flash,deepseek/deepseek-v4-flash,zai/glm-5.1,minimax/MiniMax-M3" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Z.AI Coding Plan GLM-5.2 直接冒烟：
  - `ZAI_CODING_LIVE_TEST=1 pnpm test:live src/agents/zai.live.test.ts`

- Google 重点测试：
  - Gemini（API 密钥）：`OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3.5-flash" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 自适应思考冒烟（来自私有 QA CLI 的 `qa manual`－需要 `OPENCLAW_ENABLE_PRIVATE_QA_CLI=1` 和源码检出；见 [QA 概览](/concepts/qa-e2e-automation)）：
  - Gemini 3 动态默认：`OPENCLAW_ENABLE_PRIVATE_QA_CLI=1 pnpm openclaw qa manual --provider-mode live-frontier --model google/gemini-3.1-pro-preview --alt-model google/gemini-3.1-pro-preview --message '/think adaptive Reply exactly: GEMINI_ADAPTIVE_OK' --timeout-ms 180000`
  - Gemini 2.5 动态预算：`OPENCLAW_ENABLE_PRIVATE_QA_CLI=1 pnpm openclaw qa manual --provider-mode live-frontier --model google/gemini-2.5-flash --alt-model google/gemini-2.5-flash --message '/think adaptive Reply exactly: GEMINI25_ADAPTIVE_OK' --timeout-ms 180000`

说明：

- `google／...` 使用 Gemini API（API 密钥）。
- `google-gemini-cli／...` 使用你计算机上的本地 Gemini CLI（单独的身份验证和工具链特性）。
- `google-antigravity／...` 不是已注册的提供商，也不是受支持的配置路径。不要将其添加到实时测试 allowlist 中。
- Gemini API 与 Gemini CLI：
  - API：OpenClaw 通过 HTTP 调用 Google 托管的 Gemini API（API 密钥／配置文件身份验证）；大多数用户所说的“Gemini”指的就是它。
  - CLI：OpenClaw 调用本地的 `gemini` 二进制文件；它拥有独立的身份验证，并且行为可能有所不同（流式传输／工具支持／版本差异）。

## Live：模型矩阵（我们覆盖的内容）

Live 是可选启用的，所以没有固定的“CI 模型列表”。`OPENCLAW_LIVE_MODELS=modern` / `OPENCLAW_LIVE_GATEWAY_MODELS=modern`（以及它们的 `all` 别名）会运行来自 `src/agents/live-model-filter.ts` 中 `HIGH_SIGNAL_LIVE_MODEL_PRIORITY` 的精选优先列表，顺序如下：

| 提供方/模型                                  | 备注       |
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

- `codex` 和 `codex-cli` 提供方不包含在默认的 modern 扫描中（它们覆盖的是 CLI 后端/ACP 行为，已在上方单独测试）。`openai/gpt-5.5` 本身默认通过 Codex 应用服务器测试框架路由；请参见 [Live：Codex 应用服务器测试框架冒烟测试](#live-codex-app-server-harness-smoke)。
- `fireworks`、`google`、`openrouter` 和 `xai` 在 modern 扫描中只运行其显式精选的模型 id（不会自动扩展为“此提供方的所有模型”）。
- 请在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中至少包含一个支持图像的模型（Claude/Gemini/OpenAI 系列视觉变体等），以覆盖图像探测。

使用工具 + 图像，针对跨提供方的手选集合运行网关冒烟测试：

```bash
OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.6-luna,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3.5-flash,deepseek/deepseek-v4-flash,zai/glm-5.1,minimax/MiniMax-M3" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts
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

- 第一方提供方插件：`anthropic`, `cerebras`, `github-copilot`, `google`, `google-gemini-cli`, `google-vertex`, `groq`, `mistral`, `openai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `zai`
- 通过 `models.providers`（自定义端点）：`minimax`（云端/API），以及任何兼容 OpenAI/Anthropic 的代理（LM Studio、vLLM、LiteLLM 等）

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

## BytePlus 编码计划 实时版

- 测试：`extensions/byteplus/live.test.ts`
- 启用：`BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live extensions/byteplus/live.test.ts`
- 可选模型覆盖：`BYTEPLUS_CODING_MODEL=ark-code-latest`。

## ComfyUI 工作流媒体实时测试

- 测试：`extensions/comfy/comfy.live.test.ts`
- 启用：`OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- 范围：
  - 测试 comfy 图像、视频和 `music_generate` 路径
  - 除非配置了 `plugins.entries.comfy.config.<capability>`，否则跳过相应能力
  - 适用于更改 comfy 工作流提交、轮询、下载或插件注册后进行验证。

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

- 测试：`extensions/music-generation-providers.live.test.ts`
- 启用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- 运行器：`pnpm test:live:media music`
- 范围：
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
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以强制使用 profile 存储认证并忽略仅环境变量覆盖。

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

- [测试](/help/testing) - 单元、集成、QA 和 Docker 套件。
