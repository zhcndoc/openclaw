---
summary: "实时 CLI 后端烟雾（Claude、Gemini、其他本地 CLI）和 APNs HTTP/2 代理可达性检查"
title: "CLI 后端和 APNs 通道"
read_when:
  - "您正在根据本地 CLI 后端验证网关"
  - "您正在通过 HTTP CONNECT 代理检查 APNs 可达性"
---

## <a id="live%3A-cli-backend-smoke-(claude%2C-gemini%2C-or-other-local-clis)"></a><a id="live-cli-backend-smoke-claude-gemini-or-other-local-clis"></a> Live：CLI 后端烟雾（Claude、Gemini 或其他本地 CLI）

- 测试：`src/gateway/gateway-cli-backend.live.test.ts`
- 目标：使用本地 CLI 后端验证 Gateway + agent 管道，而不触碰你的默认配置。
- 各后端特定的冒烟默认值位于所属插件的 `cli-backend.ts` 定义中。
- 启用：
  - `pnpm test:live`（如果直接调用 Vitest，则使用 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- 默认值：
  - 默认provider/model：`claude-cli/claude-sonnet-4-6`
  - Command/args/image 行为来自拥有的 CLI 后端插件元数据。
- 覆盖项（可选）：
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/claude"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 用于发送真实图像附件（路径会注入到提示词中）。默认在 Docker 配方中关闭。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 用于将图像文件路径作为 CLI 参数传递，而不是注入到提示词中。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"`（或 `"list"`）用于在设置了 `IMAGE_ARG` 时控制图像参数的传递方式。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 用于发送第二轮并验证恢复流程。
  - `OPENCLAW_LIVE_CLI_BACKEND_CACHE_PROBE=1` 运行新的 Claude CLI 转动、工具轴承预热恢复和无工具结算恢复，然后在以下脏工作空间恢复中要求至少 90% 的提示缓存重用。它还验证了思维层面的变化会轮换实时会话生成，并且下一个稳定的恢复会恢复至少 90% 的重用。此检查禁用图像、MCP 和模型切换检查。
  - 当所选模型支持切换目标时，`OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=1` 选择加入 Claude Sonnet -> Opus 同一会话连续性检查。默认关闭，包括在 Docker 配方中。
  - `OPENCLAW_LIVE_CLI_BACKEND_MCP_PROBE=1` 选择进入 MCP/tool 环回检查。在 Docker 配方中默认关闭。

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

这不会要求 Gemini 生成响应。它会写入 OpenClaw 赋予 Gemini 的相同系统设置，然后运行 `gemini --debug mcp list`，以证明已保存的 `transport: "streamable-http"` 服务已被规范化为 Gemini 的 HTTP MCP 形状，并且可以连接到本地 streamable-HTTP MCP 服务器。

Docker 配方：

```bash
pnpm test:docker:live-cli-backend
```

单提供商 Docker 配方：

```bash
pnpm test:docker:live-cli-backend:claude
pnpm test:docker:live-cli-backend:claude:cache
pnpm test:docker:live-cli-backend:claude-subscription
pnpm test:docker:live-cli-backend:gemini
```

注意：

- Docker 运行器位于 `scripts/test-live-cli-backend-docker.sh`。
- `pnpm test:docker:live-cli-backend:claude:cache` 需要 Anthropic API-key 身份验证。它记录每个缓存检查恢复的规范化缓存使用情况，并要求结算后脏工作空间恢复和思维级别更改后的稳定恢复至少有 90% 的重用。
- 它以非 root `node` 用户身份在存储库 Docker 映像中运行实时 CLI- 后端烟雾。
- 它从所属插件解析 CLI 冒烟元数据，然后将匹配的 Linux CLI 软件包（`@anthropic-ai/claude-code` 或 `@google/gemini-cli`）安装到 `OPENCLAW_DOCKER_CLI_TOOLS_DIR` 指定的可写缓存前缀中（默认：`~/.cache/openclaw/docker-cli-tools`）。
- `codex-cli` 不再是捆绑的 CLI 后端；将 `openai/*` 与 Codex 应用程序服务器运行时结合使用（请参阅 [Live：Codex 应用程序服务器工具 Smoke](/help/testing-live/acp-and-codex#live-codex-app-server-harness-smoke)）。
- `pnpm test:docker:live-cli-backend:claude-subscription` 需要通过 `~/.claude/.credentials.json` 与 `claudeAiOauth.subscriptionType` 或来自 `claude setup-token` 的 `CLAUDE_CODE_OAUTH_TOKEN` 进行便携式 Claude Code 订阅 OAuth。它首先证明 Docker 中的直接 `claude -p`，然后运行两个网关 CLI- 后端轮次，而不保留 Anthropic API-key 环境变量。默认情况下，此订阅通道会禁用 Claude MCP/tool 和图像检查，因为它会消耗登录订阅的使用限制，并且 Anthropic 可以在不发布 OpenClaw 的情况下更改 Claude 代理 SDK / `claude -p` 计费和速率限制行为。
- Claude 和 Gemini 通过上述标志支持相同的检查集（文本翻转、图像分类、MCP `automations` 工具调用、模型切换连续性），但默认情况下不会运行这些检查 - 根据需要选择每个标志。

## <a id="live%3A-apns-http%2F2-proxy-reachability"></a><a id="live-apns-http/2-proxy-reachability"></a> 实时：APNs HTTP/2 代理可达性

- 测试：`src/infra/push-apns-http2.live.test.ts`
- 目标：通过本地 HTTP CONNECT 代理隧道连接到 Apple 的 sandbox APNs 端点，发送 APNs HTTP/2 验证请求，并断言 Apple 的真实 `403 InvalidProviderToken` 响应会经由代理路径返回。
- 启用：
  - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_APNS_REACHABILITY=1 pnpm test:live src/infra/push-apns-http2.live.test.ts`
- 可选超时：
  - `OPENCLAW_LIVE_APNS_TIMEOUT_MS=30000`
