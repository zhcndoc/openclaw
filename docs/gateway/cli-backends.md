---
summary: "CLI 后端：带可选 MCP 工具桥接的本地 AI CLI 回退"
read_when:
  - 当你希望在 API 提供商失败时有一个可靠的回退方案
  - 当你正在运行 Codex CLI 或其他本地 AI CLI，并希望复用它们
  - 当你想了解用于 CLI 后端工具访问的 MCP 回环桥接时
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

你可以**无需任何配置**直接使用 Codex CLI（捆绑的 OpenAI 插件会注册一个默认后端）：

```bash
openclaw agent --message "hi" --model codex-cli/gpt-5.5
```

如果你的网关运行在 launchd/systemd 下且 PATH 很简洁，只需添加命令路径：

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "codex-cli": {
          command: "/opt/homebrew/bin/codex",
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
        fallbacks: ["codex-cli/gpt-5.5"],
      },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "codex-cli/gpt-5.5": {},
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

每个条目都以一个 **provider id**（例如 `codex-cli`、`my-cli`）作为键。
provider id 会成为你的模型引用左侧的一部分：

```
<provider>/<model>
```

### 配置示例

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "codex-cli": {
          command: "/opt/homebrew/bin/codex",
        },
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
          serialize: true,
        },
      },
    },
  },
}
```

## 工作原理

1. **根据 provider 前缀选择后端**（`codex-cli/...`）。
2. **使用相同的 OpenClaw 提示词 + 工作区上下文构建系统提示**。
3. **执行 CLI**，带上会话 id（如果支持），以便历史记录保持一致。
   捆绑的 `claude-cli` 后端会为每个 OpenClaw 会话保持一个 Claude stdio 进程存活，并通过 stream-json stdin 发送后续轮次。
4. **解析输出**（JSON 或纯文本）并返回最终文本。
5. **按后端持久化会话 id**，以便后续调用复用同一个 CLI 会话。

<Note>
捆绑的 Anthropic `claude-cli` 后端现已重新支持。Anthropic 员工告诉我们，OpenClaw 风格的 Claude CLI 用法再次被允许，因此除非 Anthropic 发布新的政策，否则 OpenClaw 会将 `claude -p` 用法视为此集成的授权用法。
</Note>

捆绑的 OpenAI `codex-cli` 后端会通过 Codex 的 `model_instructions_file` 配置覆盖（`-c
model_instructions_file="..."`）传递 OpenClaw 的系统提示。Codex 不提供类似 Claude 的
`--append-system-prompt` 标志，因此 OpenClaw 会在每个新的 Codex CLI 会话中将组装好的提示写入一个临时文件。

捆绑的 Anthropic `claude-cli` 后端会以两种方式接收 OpenClaw 的 skills 快照：一是附加到系统提示中的精简版 OpenClaw skills 目录，二是通过 `--plugin-dir` 传入的临时 Claude Code 插件。该插件只包含该 agent/会话符合条件的 skills，因此 Claude Code 的原生 skill 解析器看到的是与 OpenClaw 原本会在提示中展示的相同过滤结果。skill 的环境变量/API 密钥覆盖仍会由 OpenClaw 在运行时应用到子进程环境。

Claude CLI 也有自己的非交互权限模式。OpenClaw 将其映射到现有的执行策略，而不是添加 Claude 专属配置：当有效请求的执行策略为 YOLO（`tools.exec.security: "full"` 且 `tools.exec.ask: "off"`）时，OpenClaw 会添加 `--permission-mode bypassPermissions`。
每个 agent 的 `agents.list[].tools.exec` 设置会覆盖该 agent 的全局 `tools.exec`。如果你想强制使用不同的 Claude 模式，可以在 `agents.defaults.cliBackends.claude-cli.args` 和匹配的 `resumeArgs` 下设置显式的原始后端参数，例如 `--permission-mode default` 或 `--permission-mode acceptEdits`。

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
  和 `maxTurnLines`；OpenClaw 会将这些设置钳制到 64 MiB 和 100,000
  行。
- 已存储的 CLI 会话属于 provider 的连续性。隐式的每日会话重置不会中断它们；`/reset` 和显式的 `session.reset` 策略仍然会。

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
- 对于 Gemini CLI 的 JSON 输出，当 `usage` 缺失或为空时，OpenClaw 会从 `response` 读取回复文本，并从 `stats` 读取用量信息。
- `output: "jsonl"` 会解析 JSONL 流（例如 Codex CLI `--json`），并在存在时提取最终的 agent 消息以及会话标识符。
- `output: "text"` 会将 stdout 视为最终响应。

输入模式：

- `input: "arg"`（默认）会将提示作为最后一个 CLI 参数传入。
- `input: "stdin"` 会通过 stdin 发送提示。
- 如果提示非常长且设置了 `maxPromptArgChars`，则会使用 stdin。

## 默认值（插件所有）

捆绑的 OpenAI 插件还会为 `codex-cli` 注册一个默认值：

- `command: "codex"`
- `args: ["exec","--json","--color","never","--sandbox","workspace-write","--skip-git-repo-check"]`
- `resumeArgs: ["exec","resume","{sessionId}","-c","sandbox_mode=\"workspace-write\"","--skip-git-repo-check"]`
- `output: "jsonl"`
- `resumeOutput: "text"`
- `modelArg: "--model"`
- `imageArg: "--image"`
- `sessionMode: "existing"`

捆绑的 Google 插件还会为 `google-gemini-cli` 注册一个默认值：

- `command: "gemini"`
- `args: ["--output-format", "json", "--prompt", "{prompt}"]`
- `resumeArgs: ["--resume", "{sessionId}", "--output-format", "json", "--prompt", "{prompt}"]`
- `imageArg: "@"`
- `imagePathScope: "workspace"`
- `modelArg: "--model"`
- `sessionMode: "existing"`
- `sessionIdFields: ["session_id", "sessionId"]`

前提条件：本地 Gemini CLI 必须已安装，并且可在 `PATH` 上通过
`gemini` 访问（`brew install gemini-cli` 或
`npm install -g @google/gemini-cli`）。

Gemini CLI JSON 说明：

- 回复文本从 JSON 的 `response` 字段中读取。
- 当 `usage` 缺失或为空时，使用 `stats` 作为回退。
- `stats.cached` 会被规范化为 OpenClaw 的 `cacheRead`。
- 如果 `stats.input` 缺失，OpenClaw 会通过
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

对于输出 Claude Code stream-json 兼容 JSONL 的 CLI，在该后端配置上设置
`jsonlDialect: "claude-stream-json"`。

## Bundle MCP 覆盖层

CLI 后端不会直接接收 OpenClaw 工具调用，但后端可以通过
`bundleMcp: true` 选择接入生成的 MCP 配置覆盖层。

当前捆绑行为：

- `claude-cli`：生成严格的 MCP 配置文件
- `codex-cli`：为 `mcp_servers` 提供内联配置覆盖；生成的
  OpenClaw 回环服务器会使用 Codex 的按服务器工具审批模式标记，
  因此 MCP 调用不会因本地审批提示而停滞
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

## 限制

- **不直接调用 OpenClaw 工具。** OpenClaw 不会将工具调用注入
  CLI 后端协议。只有当后端选择接入 `bundleMcp: true` 时，后端才会看到网关工具。
- **流式传输因后端而异。** 有些后端流式输出 JSONL；另一些则会缓冲
  到退出为止。
- **结构化输出** 取决于 CLI 的 JSON 格式。
- **Codex CLI 会话** 通过文本输出恢复（不是 JSONL），其结构化程度
  低于初始的 `--json` 运行。OpenClaw 会话仍可正常工作。

## 故障排除

- **未找到 CLI**：将 `command` 设置为完整路径。
- **模型名称错误**：使用 `modelAliases` 将 `provider/model` 映射到 CLI 模型。
- **没有会话连续性**：确保已设置 `sessionArg`，并且 `sessionMode` 不是
  `none`（Codex CLI 目前无法使用 JSON 输出恢复）。
- **图片被忽略**：设置 `imageArg`（并确认 CLI 支持文件路径）。

## 相关

- [网关运行手册](/gateway)
- [本地模型](/gateway/local-models)
