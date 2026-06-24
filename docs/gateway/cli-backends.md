---
summary: "CLI 后端：带可选 MCP 工具桥接的本地 AI CLI 回退"
read_when:
  - 你想要在 API 提供商失败时有一个可靠的回退
  - 你正在运行本地 AI CLI，并希望复用它们
  - 你想了解 CLI 后端工具访问的 MCP 回环桥接
title: "CLI 后端"
---

当 API 提供商不可用、被限流或暂时异常时，OpenClaw 可以将 **本地 AI CLI** 作为 **纯文本回退** 来运行。
这是有意为之的保守设计：

- **OpenClaw 工具不会被直接注入**，但带有 `bundleMcp: true` 的后端
  可以通过回环 MCP 桥接接收网关工具。
- 对支持的 CLI 使用 **JSONL 流式输出**。
- **支持会话**（因此后续轮次能保持连贯）。
- 如果 CLI 接受图片路径，**可以透传图片**。

这是设计为一个 **安全网**，而不是主要路径。当你想要“不依赖外部 API 也总能工作”的文本响应时使用它。

如果你想要一个带有 ACP 会话控制、后台任务、线程/会话绑定以及持久化外部编码会话的完整运行时，请改用
[ACP Agents](/tools/acp-agents)。CLI 后端不是 ACP。

<Tip>
  构建新的后端插件？请使用
  [CLI 后端插件](/plugins/cli-backend-plugins)。本页面面向的是配置和操作已注册后端的用户。
</Tip>

## 适合初学者的快速开始

你可以在**无需任何配置**的情况下使用 Claude Code CLI（捆绑的 Anthropic 插件会注册一个默认后端）：

```bash
openclaw agent --agent main --message "hi" --model claude-cli/claude-sonnet-4-6
```

`main` 是在未配置显式 agent 列表时的默认 agent id。如果你使用多个 agent，请将其替换为你想要运行的 agent id。

如果你的网关运行在 launchd/systemd 下且 PATH 很简短，请只添加命令路径：

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "claude-cli": {
          command: "/opt/homebrew/bin/claude",
        },
      },
    },
  },
}
```

就是这样。除 CLI 本身外，不需要任何密钥或额外的认证配置。

如果你在网关主机上将捆绑的 CLI 后端用作**主要消息提供方**，当你的配置在模型引用中或在
`agents.defaults.cliBackends` 下明确引用该后端时，OpenClaw 现在会自动加载其所属的捆绑插件。

## 作为回退使用

将 CLI 后端添加到你的回退列表中，这样它只会在主模型失败时运行：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["claude-cli/claude-sonnet-4-6"],
      },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "claude-cli/claude-sonnet-4-6": {},
      },
    },
  },
}
```

说明：

- 如果你使用 `agents.defaults.models`（允许列表），也必须把你的 CLI 后端模型包含进去。
- 如果主提供方失败（认证、限流、超时），OpenClaw 会接着尝试 CLI 后端。

## 配置概览

所有 CLI 后端都位于：

```
agents.defaults.cliBackends
```

每个条目都以 **provider id** 为键（例如 `claude-cli`、`my-cli`）。
provider id 会成为你的模型引用的左侧部分：

```
<provider>/<model>
```

### 配置示例

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "my-cli": {
          command: "my-cli",
          args: ["--json"],
          output: "json",
          input: "arg",
          modelArg: "--model",
          modelAliases: {
            "claude-opus-4-6": "opus",
            "claude-sonnet-4-6": "sonnet",
          },
          sessionArg: "--session",
          sessionMode: "existing",
          sessionIdFields: ["session_id", "conversation_id"],
          systemPromptArg: "--system",
          // 对于带有专用 prompt-file 标志的 CLI：
          // systemPromptFileArg: "--system-file",
          // 类似 Codex 的 CLI 也可以改为指向一个 prompt 文件：
          // systemPromptFileConfigArg: "-c",
          // systemPromptFileConfigKey: "model_instructions_file",
          systemPromptWhen: "first",
          imageArg: "--image",
          imageMode: "repeat",
          // 仅在该后端可能在压缩前，从有界的原始 OpenClaw 转录历史中重新种子化
          // 安全失效的会话时启用
          reseedFromRawTranscriptWhenUncompacted: true,
          serialize: true,
        },
      },
    },
  },
}
```

## 工作原理

1. **根据 provider 前缀选择后端**（`claude-cli/...`）。
2. **使用相同的 OpenClaw 提示词 + 工作区上下文构建系统提示**。
3. **以会话 id 执行 CLI**（如果支持），以保持历史一致。
   捆绑的 `claude-cli` 后端会为每个 OpenClaw 会话保持一个 Claude stdio 进程存活，
   并通过 stream-json stdin 发送后续轮次。
4. **解析输出**（JSON 或纯文本）并返回最终文本。
5. **按后端持久化会话 id**，因此后续调用会复用同一个 CLI 会话。

<Note>
捆绑的 Anthropic `claude-cli` 后端现已重新支持。Anthropic 员工告诉我们，OpenClaw 风格的 Claude CLI 用法再次被允许，因此除非 Anthropic 发布新的政策，否则 OpenClaw 会将 `claude -p` 用法视为此集成的授权用法。
</Note>

捆绑的 Anthropic `claude-cli` 后端优先为 OpenClaw 技能使用 Claude Code 的原生技能解析器。当当前技能快照至少包含一个带物化路径的已选技能时，OpenClaw 会通过 `--plugin-dir` 传入一个临时的 Claude Code 插件，并从追加的系统提示中省略重复的 OpenClaw 技能目录。如果快照中没有物化的插件技能，OpenClaw 会保留该提示目录作为回退。技能环境变量/API key 覆盖仍会由 OpenClaw 应用于本次运行的子进程环境。

Claude CLI 也有自己的非交互式权限模式。OpenClaw 将其映射到现有的执行策略，而不是添加 Claude 专用的策略配置。对于 OpenClaw 管理的 Claude 实时会话，有效的 OpenClaw 执行策略具有权威性：YOLO（`tools.exec.security: "full"` 且
`tools.exec.ask: "off"`）会以 `--permission-mode bypassPermissions` 启动 Claude，而受限的有效执行策略会以 `--permission-mode default` 启动 Claude。按 agent 的 `agents.list[].tools.exec` 设置会覆盖该 agent 的全局 `tools.exec`。原始 Claude 后端参数仍可包含 `--permission-mode`，但实时 Claude 启动会将该标志规范化为与有效 OpenClaw 执行策略一致。

捆绑的 Anthropic `claude-cli` 后端还会将 OpenClaw 的 `/think` 等级映射到 Claude Code 原生的 `--effort` 标志（适用于非关闭等级）。`minimal` 和
`low` 映射到 `low`，`adaptive` 和 `medium` 映射到 `medium`，而 `high`、
`xhigh` 和 `max` 则直接映射。其他 CLI 后端需要其所属插件在 `/think` 能影响启动的 CLI 之前声明等效的 argv 映射器。

在 OpenClaw 能使用捆绑的 `claude-cli` 后端之前，Claude Code 本身必须已经在同一主机上登录：

```bash
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

仅当 `claude` 二进制文件不在 `PATH` 中时，才使用 `agents.defaults.cliBackends.claude-cli.command`。

## 会话

- 如果 CLI 支持会话，请在需要将 ID 插入多个标志时设置 `sessionArg`（例如 `--session-id`）或
  `sessionArgs`（占位符 `{sessionId}`）。
- 如果 CLI 使用带有不同标志的 **resume 子命令**，请设置 `resumeArgs`（在恢复时替换 `args`），并可选设置 `resumeOutput`
  （用于非 JSON 恢复）。
- `sessionMode`：
  - `always`：始终发送会话 id（若未存储则使用新的 UUID）。
  - `existing`：仅在之前存储过会话 id 时发送。
  - `none`：从不发送会话 id。
- `claude-cli` 默认 `liveSession: "claude-stdio"`、`output: "jsonl"`，
  以及 `input: "stdin"`，因此后续轮次会在活动期间复用同一个 Claude 进程。
  现在默认使用热 stdio，包括那些省略传输字段的自定义配置。如果网关重启或空闲进程
  退出，OpenClaw 会从已存储的 Claude 会话 id 恢复。已存储的会话 id 在恢复前会与现有可读的项目转录进行验证，因此幽灵绑定会以 `reason=transcript-missing`
  被清除，而不是在 `--resume` 下悄悄启动一个新的 Claude CLI 会话。
- Claude 活动会话保留有界的 JSONL 输出保护。默认允许每轮最多
  8 MiB 和 20,000 行原始 JSONL。工具较多的 Claude 轮次可以按后端提升这些限制，使用
  `agents.defaults.cliBackends.claude-cli.reliability.outputLimits.maxTurnRawChars`
  和 `maxTurnLines`; OpenClaw 将这些设置上限夹紧到 64 MiB 和 100,000
  行。
- 存储的 CLI 会话属于提供方所有的连续性。隐式的每日会话
  重置不会切断它们；`/reset` 和显式的 `session.reset` 策略仍然会
  这样做。
- 新的 CLI 会话通常只会从 OpenClaw 的压缩摘要
  加上压缩后的尾部重新种子化。要恢复在压缩前就失效的短会话，后端可以通过
  `reseedFromRawTranscriptWhenUncompacted: true` 选择启用。OpenClaw 仍会对原始
  转录重新种子化进行有界控制，并将其限制为安全失效场景，例如缺失
  CLI 转录、系统提示/MCP 变更，或会话过期重试；认证配置文件或凭据周期更改
  永远不会重新种子化原始转录历史。

序列化说明：

- `serialize: true` 会保持同一通道上的运行顺序。
- 大多数 CLI 会在单个 provider 通道上序列化。
- 当所选认证身份发生变化时，OpenClaw 会放弃已存储的 CLI 会话复用，包括更改了认证配置文件 id、静态 API key、静态 token，或 CLI 暴露的 OAuth 账户身份。OAuth 访问令牌和刷新令牌轮换不会切断已存储的 CLI 会话。如果某个 CLI 不暴露稳定的 OAuth 账户 id，OpenClaw 会让该 CLI 自行强制执行恢复权限。

## claude-cli 会话中的回退前导

当一次 `claude-cli` 尝试回退到一个非 CLI 候选项时
[`agents.defaults.model.fallbacks`](/concepts/model-failover)，OpenClaw 会从 Claude Code 本地
位于 `~/.claude/projects/` 的 JSONL 转录中提取上下文前导，为下一次尝试预热。没有这个种子，回退提供方会冷启动，因为对 `claude-cli` 运行而言，OpenClaw 自己的会话转录是空的。

- 前导会优先使用最新的 `/compact` 摘要或 `compact_boundary`
  标记，然后附加边界之后最近的轮次，直至达到字符预算。边界之前的轮次会被丢弃，因为摘要已经代表了它们了。
- 工具块会被合并为简洁的 `(tool call: name)` 和 `(tool result: …)` 提示，以保持提示预算真实可控。如果摘要超出长度，会标记为 `(truncated)`。
- 同 provider 的 `claude-cli` 到 `claude-cli` 回退依赖 Claude 自己的 `--resume`，并跳过前导。
- 该种子会复用现有的 Claude 会话文件路径验证，因此无法读取任意路径。

## 图片（透传）

如果你的 CLI 接受图片路径，请设置 `imageArg`：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 会把 base64 图片写入临时文件。如果设置了 `imageArg`，这些路径会作为 CLI 参数传入。如果没有设置 `imageArg`，OpenClaw 会将文件路径附加到提示中（路径注入），这对那些能从普通路径自动加载本地文件的 CLI 已经足够。

## 输入 / 输出

- `output: "json"`（默认）会尝试解析 JSON 并提取文本 + 会话 id。
- 对于 Gemini CLI 的 JSON 输出，如果 `usage` 缺失或为空，OpenClaw 会从 `response` 中读取回复文本，并从 `stats` 中读取用量。
  捆绑的 Gemini CLI 默认使用 `stream-json`，但旧的 `--output-format json` 覆盖仍然会使用
  JSON 解析器。
- `output: "jsonl"` 会解析 JSONL 流，并在存在时提取最终 agent 消息以及会话
  标识符。
- `output: "text"` 会将 stdout 视为最终响应。

输入模式：

- `input: "arg"`（默认）会将提示作为最后一个 CLI 参数传入。
- `input: "stdin"` 会通过 stdin 发送提示。
- 如果提示非常长且设置了 `maxPromptArgChars`，则会使用 stdin。

## 默认值（插件所有）

捆绑的 CLI 后端默认值属于其所属插件。例如，
Anthropic 负责 `claude-cli`，Google 负责 `google-gemini-cli`。OpenAI Codex
agent 运行通过 `openai/*` 使用 Codex app-server harness；OpenClaw
不再注册捆绑的 `codex-cli` 后端。

捆绑的 Anthropic 插件为 `claude-cli` 注册了一个默认值：

- `command: "claude"`
- `args: ["-p","--output-format","stream-json","--include-partial-messages","--verbose", ...]`
- `output: "jsonl"`
- `input: "stdin"`
- `modelArg: "--model"`
- `sessionMode: "always"`

捆绑的 Google 插件还会为 `google-gemini-cli` 注册一个默认值：

- `command: "gemini"`
- `args: ["--skip-trust", "--approval-mode", "auto_edit", "--output-format", "stream-json", "--prompt", "{prompt}"]`
- `resumeArgs: ["--skip-trust", "--approval-mode", "auto_edit", "--resume", "{sessionId}", "--output-format", "stream-json", "--prompt", "{prompt}"]`
- `output: "jsonl"`
- `resumeOutput: "jsonl"`
- `jsonlDialect: "gemini-stream-json"`
- `imageArg: "@"`
- `imagePathScope: "workspace"`
- `modelArg: "--model"`
- `sessionMode: "existing"`
- `sessionIdFields: ["session_id", "sessionId"]`

前提条件：本地 Gemini CLI 必须已安装，并且可在 `PATH` 上通过
`gemini` 访问（`brew install gemini-cli` 或
`npm install -g @google/gemini-cli`）。

Gemini CLI 输出说明：

- 默认的 `stream-json` 解析器会读取 assistant 的 `message` 事件、工具事件、
  最终 `result` 用量，以及致命的 Gemini 错误事件。
- 如果你将 Gemini 参数覆盖为 `--output-format json`，OpenClaw 会将该
  后端规范化回 `output: "json"`，并从 JSON 的 `response`
  字段读取回复文本。
- 当 `usage` 缺失或为空时，用量会回退到 `stats`。
- `stats.cached` 会规范化为 OpenClaw 的 `cacheRead`。
- 如果 `stats.input` 缺失，OpenClaw 会从
  `stats.input_tokens - stats.cached` 推导输入 token。

仅在需要时覆盖（常见情况：绝对 `command` 路径）。

## 插件所有的默认值

CLI 后端默认值现在属于插件表面的一部分：

- 插件通过 `api.registerCliBackend(...)` 注册它们。
- 后端的 `id` 会成为模型引用中的提供方前缀。
- `agents.defaults.cliBackends.<id>` 中的用户配置仍然会覆盖插件默认值。
- 后端特定的配置清理仍通过可选的 `normalizeConfig` 钩子由插件所有。

需要细微提示/消息兼容性补丁的插件，可以声明双向文本转换，而无需替换提供方或 CLI 后端：

```typescript
api.registerTextTransforms({
  input: [
    { from: /red basket/g, to: "blue basket" },
    { from: /paper ticket/g, to: "digital ticket" },
    { from: /left shelf/g, to: "right shelf" },
  ],
  output: [
    { from: /blue basket/g, to: "red basket" },
    { from: /digital ticket/g, to: "paper ticket" },
    { from: /right shelf/g, to: "left shelf" },
  ],
});
```

`input` 会重写传递给 CLI 的系统提示和用户提示。`output`
会在 OpenClaw 处理自身的控制标记和通道传递之前，重写流式助手增量和解析后的最终文本。

对于发出 provider 特定 JSONL 事件的 CLI，请在该后端配置上设置 `jsonlDialect`。支持的方言包括适用于 Claude Code 兼容流的 `claude-stream-json`，以及适用于 Gemini CLI `stream-json`
事件的 `gemini-stream-json`。

## 原生压缩所有权

一些 CLI 后端运行的代理会压缩它们**自己的**转录，因此 OpenClaw
不能再对它们运行防护性摘要器——这样做会干扰后端自身的压缩，并可能导致本轮失败。

`claude-cli` 没有 harness 端点——Claude Code 会在内部压缩——因此它声明
`ownsNativeCompaction: true`，而 OpenClaw 会在压缩路径上返回 no-op。
像 Codex 这样的原生 harness 会话仍会改为路由到其 harness 压缩端点。

由于该后端拥有压缩权，为了仅防止 OpenClaw 的防护逻辑在
`claude-cli` 会话上触发而设置 `contextTokens: 1_000_000` 的旧权宜之计**不再需要**——这个显式退出选项已取而代之。

```typescript
api.registerCliBackend({ id: "my-cli", ownsNativeCompaction: true /* ... */ });
```

仅当后端确实拥有其压缩机制时，才声明 `ownsNativeCompaction`：它必须能在接近上下文窗口时可靠地限制自己的转录长度，并持久化一个可恢复的会话（例如 `--resume` / `--session-id`）；否则，延迟会话可能会一直超出预算。匹配的 `agentHarnessId` 会话仍会路由到 harness 端点。

## Bundle MCP 覆盖层

CLI 后端不会直接接收 OpenClaw 工具调用，但后端可以通过
`bundleMcp: true` 选择接入生成的 MCP 配置覆盖层。

当前捆绑行为：

- `claude-cli`：生成严格的 MCP 配置文件
- `google-gemini-cli`：生成 Gemini 系统设置文件

启用 bundle MCP 后，OpenClaw 会：

- 启动一个回环 HTTP MCP 服务器，为 CLI 进程暴露网关工具
- 使用按会话令牌（`OPENCLAW_MCP_TOKEN`）对桥接进行身份验证
- 将工具访问范围限定到当前会话、账号和通道上下文
- 为当前工作区加载已启用的 bundle-MCP 服务器
- 将它们与任何现有的后端 MCP 配置/设置形状合并
- 使用所属扩展中的后端所有集成模式重写启动配置

如果没有启用任何 MCP 服务器，当某个
后端选择接入 bundle MCP 时，OpenClaw 仍会注入严格配置，以便后台运行保持隔离。

按会话范围的捆绑 MCP 运行时会被缓存，以便在会话内复用，然后在
空闲 `mcp.sessionIdleTtlMs` 毫秒后被清理（默认 10
分钟；设为 `0` 可禁用）。一次性嵌入式运行，例如身份验证探测、
slug 生成和活动记忆回忆，会在运行结束时请求清理，因此 stdio
子进程和可流式 HTTP/SSE 流不会比运行时间更长。

## 重设历史上限

当新的 CLI 会话从先前的 OpenClaw 转录中播种时（例如在 `session_expired` 重试后），
渲染出的 `<conversation_history>` 块会被设定上限，以避免重设提示
膨胀。默认值为 `12288` 个字符（约 3000 个 token）。

Claude CLI 后端会自动使用一个更大的上限，该上限由解析后的 Claude
上下文层级推导得出。标准的 200K token Claude 运行会保留更大的转录片段，
而 1M token 的 Claude 运行会再保留更大的片段，其他 CLI
后端则保持保守的默认值。

- 该上限只约束重设提示中的先前历史块。实时会话
  输出限制会在 `reliability.outputLimits` 下单独调优
  （参见 [Sessions](#sessions)）。

## 限制

- **不直接调用 OpenClaw 工具。** OpenClaw 不会向 CLI 后端协议注入工具调用。只有在后端选择接入 `bundleMcp: true` 时，后端才会看到网关工具。
- **流式传输由后端决定。** 有些后端流式输出 JSONL；另一些则会缓冲直到退出。
- **结构化输出** 取决于 CLI 的 JSON 格式。

## 故障排除

- **未找到 CLI**：将 `command` 设置为完整路径。
- **模型名称错误**：使用 `modelAliases` 将 `provider/model` 映射到 CLI 模型。
- **没有会话连续性**：确保已设置 `sessionArg`，且 `sessionMode` 不是 `none`。
- **图片被忽略**：设置 `imageArg`（并确认 CLI 支持文件路径）。

## 相关

- [网关运行手册](/gateway)
- [本地模型](/gateway/local-models)
