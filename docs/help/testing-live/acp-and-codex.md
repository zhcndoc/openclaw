---
summary: "实时 ACP 对话绑定烟雾和插件拥有的 Codex 应用服务器利用烟雾"
title: "ACP 绑定和 Codex 应用程序服务器通道"
read_when:
  - "您正在针对真实的 ACP 代理调试 `/acp spawn ... --bind here`"
  - "您正在运行 Codex 应用程序服务器工具、其压力检查或其 Docker 配方"
---

## <a id="live%3A-acp-bind-smoke-(%2Facp-spawn-...---bind-here)"></a><a id="live-acp-bind-smoke-/acp-spawn-bind-here"></a> 实时：ACP 绑定冒烟（`/acp spawn ... --bind here`）

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
  - ACP Docker 智能体：`claude,codex,gemini`
  - 直接执行 `pnpm test:live ...` 时的 ACP 代理：`claude`
  - Synthetic 通道：Slack DM-style 对话上下文
  - ACP 后端：`acpx`
- 覆盖项：
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=droid`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=grok-build`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=opencode`
  - `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude,codex,gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND='npx -y @agentclientprotocol/claude-agent-acp@<version>'`
  - `OPENCLAW_LIVE_ACP_BIND_CODEX_MODEL=gpt-5.6-luna`
  - `OPENCLAW_LIVE_ACP_BIND_OPENCODE_MODEL=opencode/kimi-k2.6`
  - `OPENCLAW_LIVE_ACP_BIND_IMAGE_PROBE=1`（或`on`/`true`/`yes`）强制图像检查；任何其他值都会迫使它关闭。默认情况下为除 `opencode` 之外的每个代理运行。
  - `OPENCLAW_LIVE_ACP_BIND_REQUIRE_CRON=1`
  - `OPENCLAW_LIVE_ACP_BIND_PARENT_MODEL=openai/gpt-5.6-luna`
- 注释：
  - 这条通道使用网关的 `chat.send` 接口，并带有仅管理员可见的合成 originating-route 字段，因此测试可以附加消息通道上下文，而无需伪装成外部投递。
  - 当 `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` 未设置时，测试会使用嵌入式 `acpx` 插件内置的代理注册表，针对所选的 ACP harness 代理。
  - 默认情况下，Bound-session cron MCP 创建是尽力而为的，因为外部 ACP 工具可以在 bind/image 证明通过后取消 MCP 调用；设置 `OPENCLAW_LIVE_ACP_BIND_REQUIRE_CRON=1` 以使绑定后 cron 检查严格。

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
- 默认情况下，它按顺序针对聚合的实时 CLI 代理运行 ACP 绑定烟雾：`claude`、`codex`，然后是 `gemini`。
- 使用 `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=codex`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=droid`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` 或 `OPENCLAW_LIVE_ACP_BIND_AGENTS=opencode` 可以缩小矩阵范围。
- It 将匹配的 CLI 身份验证材料暂存到容器中，然后安装请求的实时 CLI（`@anthropic-ai/claude-code`、`@openai/codex`、Factory Droid 通过 `https://app.factory.ai/cli`、`@google/gemini-cli` 或 `opencode-ai`）如果丢失。 ACP 后端本身是来自官方 `acpx` 插件的嵌入式 `acpx/runtime` 包。
- Droid Docker 变体阶段 `~/.factory` 进行设置，转发 `FACTORY_API_KEY`，并需要 API 密钥，因为本地工厂 OAuth/keyring 身份验证无法移植到容器中。它使用 ACPX 的内置 `droid exec --output-format acp` 注册表项。
- OpenCode Docker 变体是严格的单智能体回归通道。它从`OPENCLAW_LIVE_ACP_BIND_OPENCODE_MODEL`（默认`opencode/kimi-k2.6`）写入临时`OPENCODE_CONFIG_CONTENT`默认模型。
- Direct `acpx` CLI 调用只是用于比较网关外部行为的 manual/workaround 路径。 Docker ACP 绑定烟雾练习 OpenClaw 的嵌入式 `acpx` 运行时后端。

## <a id="live%3A-codex-app-server-harness-smoke"></a><a id="live-codex-app-server-harness-smoke"></a> 实时：Codex app-server harness 冒烟测试

- 目标：通过正常的网关 `agent` 方法验证插件所有的 Codex harness
  - 加载捆绑的 `codex` 插件
  - 通过 `/model <ref> --runtime codex` 选择 OpenAI 模型
  - 使用请求的思考级别发送第一轮网关 agent 对话
  - 向同一个 OpenClaw 会话发送第二轮对话，并验证 app-server 线程可以恢复
  - 通过相同的网关命令路径运行 `/codex status` 和 `/codex models`
  - 可选择运行两项经过 Guardian 审查的升级 shell 检查：一项应获得批准的良性命令，一项应被拒绝的虚假秘密上传，以便代理进行回复
- 测试：`src/gateway/gateway-codex-harness.live.test.ts`
- 启用：`OPENCLAW_LIVE_CODEX_HARNESS=1`
- Harness 基准模型：`openai/gpt-5.6-luna`
- 新鲜OpenAI API-密钥选择默认：`openai/gpt-6-astra`
- 默认思考级别：`low`
- 模型覆盖：`OPENCLAW_LIVE_CODEX_HARNESS_MODEL=openai/<model>`
- 思考级别覆盖：`OPENCLAW_LIVE_CODEX_HARNESS_THINKING=<level>`
- 非默认模型 effort 断言： `OPENCLAW_LIVE_CODEX_HARNESS_EXPECTED_EFFORT=<level>`
- Matrix 倍率：`OPENCLAW_LIVE_CODEX_HARNESS_TARGETS=<model>=<thinking>,...`
- 认证模式：`OPENCLAW_LIVE_CODEX_HARNESS_AUTH=codex-auth`（默认）使用复制的 Codex 登录信息；`api-key` 通过 Codex app-server 使用 `OPENAI_API_KEY`。
- 可选图像检查：`OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1`
- 可选MCP/tool检查：`OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1`
- 可选监护人检查：`OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1`
- 可选恢复压力：`OPENCLAW_LIVE_CODEX_HARNESS_RESUME_STRESS=1`添加四轮历史记录，然后关闭并重新启动网关和Codex应用程序服务器三次，同时需要相同的本机线程ID和对话历史记录。使用 `OPENCLAW_LIVE_CODEX_HARNESS_RESUME_STRESS_HISTORY_TURNS` （1-20） 和 `OPENCLAW_LIVE_CODEX_HARNESS_RESUME_STRESS_RESTARTS` （1-10） 覆盖有界计数。
- 可选扇出压力测试：设置 `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1` 和 `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_COUNT`（1-12）。Harness 会并发启动每个子任务，等待每个终态运行完成，并验证每个子任务的唯一回复和原生线程身份。
- 可选压缩压力测试：`OPENCLAW_LIVE_CODEX_HARNESS_COMPACTION_STRESS=1` 生成有界的原生工具输出，要求自动压缩事件，验证持久化的压缩计数和隐藏标记召回， 重启网关和物理 Codex app-server，然后重复输出和压缩阶段。可通过 `OPENCLAW_LIVE_CODEX_HARNESS_COMPACTION_STRESS_TURNS`（1-8）和 `OPENCLAW_LIVE_CODEX_HARNESS_LARGE_OUTPUT_BYTES`（100000-800000）调整有界工作量。
- 完整直接 API 上下文：`OPENCLAW_LIVE_CODEX_HARNESS_FULL_CONTEXT=1` 应用 `922000` 上下文和 `700000` 总自动压缩限制，在不使用 `/compact` 或其他手动检查点的情况下， 发送密集且有界的用户对话，并要求之后的一轮简短对话触发原生自动压缩。它要求 `OPENCLAW_LIVE_CODEX_HARNESS_AUTH=api-key`，以及绝对路径形式的 `OPENCLAW_LIVE_CODEX_HARNESS_MODEL_CATALOG`。目录必须公开精确选中的模型，并包含 `context_window: 922000`、 `max_context_window: 922000` 和 `auto_compact_token_limit: 700000`，这样 Codex 就不会将覆盖值限制回其正常目录窗口。 上述普通的降低阈值压力测试会保留更严格的自动压缩和隐藏标记保留断言。
- 可选环路继电器选择退出检查：`OPENCLAW_LIVE_CODEX_HARNESS_DISABLE_LOOP_RELAY=1`
- 请求的思考偏好可能会映射到 Codex 为该模型公布的最接近 effort。例如，Luna 会将 `minimal` 映射为 `low`。
- 已知 Codex 目录中的模型会自动推导出准确的原生 effort。未知模型覆盖必须声明预期的映射 effort。
- 冒烟测试强制使用 provider/model `agentRuntime.id: "codex"`，因此损坏的 Codex harness 无法通过静默回退到 OpenClaw 来伪装通过。
- Auth：来自本地 Codex 订阅登录的 Codex 应用程序服务器身份验证，或 `OPENCLAW_LIVE_CODEX_HARNESS_AUTH=api-key` 时的 `OPENAI_API_KEY`。 Docker 可以复制 `~/.codex/auth.json` 和 `~/.codex/config.toml` 进行订阅运行。

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

Docker 通道使用基于 Docker 的默认策略的 seccomp 配置文件以及 Codex 的本机 Bubblewrap 沙箱所需的命名空间设置操作。它使 `no-new-privileges` 保持启用状态，并在发出提供程序请求之前检查本机沙箱启动情况。运行程序的内核和 AppArmor 策略还必须允许嵌套沙箱设置。在带有 AppArmor 的一次性 CI/Testbox 滑道上，通道为其自己的容器加载临时配置文件，并在容器退出后将其删除。它保留了 Docker 的其他限制，并且不会更改默认配置文件或内核设置。加载需要可用的 `apparmor_parser` 和加载配置文件的非交互权限。

子代理检查还默认启用 Codex 的 V2 本机子代理。显式 `OPENCLAW_CODEX_APP_SERVER_ARGS` 覆盖不变地转发；禁用子代理检查会使本机参数默认值保持不变。手动压缩配置提供优先于此环境默认值的显式本机参数。

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
  OPENCLAW_LIVE_CODEX_HARNESS_MODEL=openai/gpt-5.6-luna \
  OPENCLAW_LIVE_CODEX_HARNESS_THINKING=low \
  OPENCLAW_LIVE_CODEX_HARNESS_COMPACTION_STRESS_TURNS=8 \
  OPENCLAW_LIVE_CODEX_HARNESS_LARGE_OUTPUT_BYTES=800000 \
  OPENCLAW_LIVE_CODEX_HARNESS_DEBUG=1 \
  node --import tsx scripts/test-live.mts --quiet src/gateway/gateway-codex-harness.live.test.ts
```

GPT-5.6 原生 Codex 矩阵：

```bash
OPENCLAW_LIVE_CODEX_HARNESS_AUTH=api-key \
  OPENCLAW_LIVE_CODEX_HARNESS_TARGETS='openai/gpt-5.6-terra=ultra,openai/gpt-5.6-luna=max' \
  pnpm test:docker:live-codex-harness
```
