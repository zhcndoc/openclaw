---
summary: "CLI 后端：本地 AI CLI 后备方案，带有可选的 MCP 工具桥接"
read_when:
  - 你想要在 API 提供商失败时获得可靠的后备方案
  - 你正在运行 Codex CLI 或其他本地 AI CLI，并希望复用它们
  - 你想了解用于 CLI 后端工具访问的 MCP 环回桥接
title: "CLI 后端"
---

OpenClaw can run **local AI CLIs** as a **text-only fallback** when API providers are down,
rate-limited, or temporarily misbehaving. This is intentionally conservative:

- **OpenClaw 工具不会直接注入**，但带有 `bundleMcp: true` 的后端
  可以通过环回 MCP 桥接接收网关工具。
- **JSONL 流式传输**，适用于支持它的 CLIs。
- **支持会话**（因此后续对话保持一致性）。
- **图片可以透传**，如果 CLI 接受图片路径。

这被设计为一个 **安全网**，而不是主要路径。当你
想要“始终可用”的文本响应而不依赖外部 API 时使用它。

如果你想要一个带有 ACP 会话控制、后台任务、
线程/对话绑定和持久化外部编码会话的完整 harness 运行时，请改用
[ACP Agents](/tools/acp-agents)。CLI 后端不是 ACP。

## 初学者快速入门

你可以 **无需任何配置** 使用 Codex CLI（捆绑的 OpenAI 插件
注册了一个默认后端）：

```bash
openclaw agent --message "hi" --model codex-cli/gpt-5.5
```

如果你的网关在 launchd/systemd 下运行且 PATH 最小化，只需添加
命令路径：

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

就是这样。除了 CLI 本身之外，不需要密钥，也不需要额外的认证配置。

如果你在网关主机上将捆绑的 CLI 后端用作 **主要消息提供商**，
当你的配置在模型引用中或 `agents.defaults.cliBackends` 下显式引用该后端时，
OpenClaw 现在会自动加载拥有的捆绑插件。

## 将其用作后备方案

将 CLI 后端添加到你的后备列表中，这样它仅在主要模型失败时运行：

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

注意：

- 如果你使用 `agents.defaults.models`（允许列表），你也必须在那里包含你的 CLI 后端模型。
- 如果主要提供商失败（认证、速率限制、超时），OpenClaw 将
  接下来尝试 CLI 后端。

## 配置概览

所有 CLI 后端位于：

```
agents.defaults.cliBackends
```

每个条目由 **提供商 id** 键控（例如 `codex-cli`、`my-cli`）。
提供商 id 成为模型引用的左侧：

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
          // Codex 风格的 CLI 可以指向提示文件代替：
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

1. **根据提供商前缀选择后端**（`codex-cli/...`）。
2. **使用相同的 OpenClaw 提示词 + 工作区上下文构建系统提示**。
3. **执行 CLI**，并带上会话 id（如果支持），以便历史保持一致。
   捆绑的 `claude-cli` 后端会为每个 OpenClaw 会话保持一个 Claude stdio 进程处于活动状态，
   并通过 stream-json stdin 发送后续轮次。
4. **解析输出**（JSON 或纯文本）并返回最终文本。
5. **按后端持久化会话 id**，以便后续请求复用同一个 CLI 会话。

<Note>
捆绑的 Anthropic `claude-cli` 后端再次得到支持。Anthropic 工作人员
告诉我们 OpenClaw 风格的 Claude CLI 使用再次被允许，因此 OpenClaw 将
`claude -p` 的使用视为此集成的许可用法，除非 Anthropic 发布
新政策。
</Note>

捆绑的 OpenAI `codex-cli` 后端通过 Codex 的 `model_instructions_file` 配置覆盖（`-c model_instructions_file="..."`）传递 OpenClaw 的系统提示。Codex 没有公开类似 Claude 的 `--append-system-prompt` 标志，因此 OpenClaw 会将组装好的提示写入每个全新 Codex CLI 会话的临时文件中。

捆绑的 Anthropic `claude-cli` 后端通过两种方式接收 OpenClaw 技能快照：附加系统提示中的紧凑 OpenClaw 技能目录，以及通过 `--plugin-dir` 传递的临时 Claude Code 插件。该插件仅包含该代理/会话符合条件的技能，因此 Claude Code 的原生技能解析器看到的过滤集与 OpenClaw 否则会在提示中宣传的集相同。技能 env/API 密钥覆盖仍由 OpenClaw 应用于运行的子进程环境。

Claude CLI 还有自己的非交互式权限模式。OpenClaw 将其映射到现有的 exec 策略，而不是添加 Claude 特定配置：当有效请求的 exec 策略为 YOLO（`tools.exec.security: "full"` 且 `tools.exec.ask: "off"`）时，OpenClaw 会添加 `--permission-mode bypassPermissions`。每个代理的 `agents.list[].tools.exec` 设置会覆盖该代理的全局 `tools.exec`。若要强制使用不同的 Claude 模式，可在 `agents.defaults.cliBackends.claude-cli.args` 以及匹配的 `resumeArgs` 下设置显式原始后端参数，例如 `--permission-mode default` 或 `--permission-mode acceptEdits`。

在 OpenClaw 能使用捆绑的 `claude-cli` 后端之前，Claude Code 本身必须已经在同一主机上登录：

```bash
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

仅当 `claude` 二进制文件不在 `PATH` 上时，才使用 `agents.defaults.cliBackends.claude-cli.command`。

## 会话

- 如果 CLI 支持会话，请设置 `sessionArg`（例如 `--session-id`）或
  `sessionArgs`（在需要将 ID 插入多个标志时使用占位符 `{sessionId}`）。
- 如果 CLI 使用带不同标志的 **resume 子命令**，请设置 `resumeArgs`
  （恢复时替代 `args`），并可选设置 `resumeOutput`
  （用于非 JSON 恢复）。
- `sessionMode`：
  - `always`：始终发送会话 id（如果没有存储则使用新的 UUID）。
  - `existing`：仅在之前已存储会话 id 时发送。
  - `none`：从不发送会话 id。
- `claude-cli` 默认使用 `liveSession: "claude-stdio"`、`output: "jsonl"`，
  以及 `input: "stdin"`，因此后续轮次会在活动期间复用同一个 Claude 进程。
  现在默认使用预热 stdio，包括省略传输字段的自定义配置。
  如果 Gateway 重启或空闲进程退出，OpenClaw 会从存储的 Claude 会话 id 继续。
  存储的会话 id 在恢复前会针对现有可读的项目转录记录进行验证，因此幽灵绑定会以 `reason=transcript-missing`
  被清除，而不是在 `--resume` 下静默启动一个新的 Claude CLI 会话。
- 存储的 CLI 会话是提供商拥有的连续性。隐式的每日会话
  重置不会中断它们；`/reset` 和显式的 `session.reset` 策略仍然会。

序列化说明：

- `serialize: true` 保持同一通道的运行有序。
- 大多数 CLI 会在一个提供商通道上序列化。
- 当所选认证身份发生变化时，OpenClaw 会放弃已存储的 CLI 会话复用，
  包括更改后的认证配置文件 id、静态 API key、静态 token，
  或 CLI 暴露的 OAuth 账户身份。OAuth 访问令牌和刷新令牌
  轮换不会切断已存储的 CLI 会话。如果 CLI 不暴露稳定的 OAuth 账户 id，
  OpenClaw 会让该 CLI 自行强制执行恢复权限。

## 图片（透传）

如果你的 CLI 接受图片路径，设置 `imageArg`：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 会将 base64 图片写入临时文件。如果设置了 `imageArg`，这些
路径将作为 CLI 参数传递。如果缺少 `imageArg`，OpenClaw 会将
文件路径附加到提示中（路径注入），这对于自动
从纯路径加载本地文件的 CLIs 来说已经足够。

## 输入 / 输出

- `output: "json"`（默认）尝试解析 JSON 并提取文本 + 会话 id。
- 对于 Gemini CLI JSON 输出，当 `usage` 缺失或为空时，OpenClaw 从
  `response` 读取回复文本，从 `stats` 读取用量。
- `output: "jsonl"` 解析 JSONL 流（例如 Codex CLI `--json`）并在存在时提取最终代理消息加上会话
  标识符。
- `output: "text"` 将 stdout 视为最终响应。

输入模式：

- `input: "arg"`（默认）将提示作为最后一个 CLI 参数传递。
- `input: "stdin"` 通过 stdin 发送提示。
- 如果提示非常长且设置了 `maxPromptArgChars`，则使用 stdin。

## 默认值（插件拥有）

捆绑的 OpenAI 插件也为 `codex-cli` 注册了一个默认值：

- `command: "codex"`
- `args: ["exec","--json","--color","never","--sandbox","workspace-write","--skip-git-repo-check"]`
- `resumeArgs: ["exec","resume","{sessionId}","-c","sandbox_mode=\"workspace-write\"","--skip-git-repo-check"]`
- `output: "jsonl"`
- `resumeOutput: "text"`
- `modelArg: "--model"`
- `imageArg: "--image"`
- `sessionMode: "existing"`

捆绑的 Google 插件也为 `google-gemini-cli` 注册了一个默认值：

- `command: "gemini"`
- `args: ["--output-format", "json", "--prompt", "{prompt}"]`
- `resumeArgs: ["--resume", "{sessionId}", "--output-format", "json", "--prompt", "{prompt}"]`
- `imageArg: "@"`
- `imagePathScope: "workspace"`
- `modelArg: "--model"`
- `sessionMode: "existing"`
- `sessionIdFields: ["session_id", "sessionId"]`

前提条件：本地 Gemini CLI 必须安装并在 `PATH` 上可用为
`gemini`（`brew install gemini-cli` 或
`npm install -g @google/gemini-cli`）。

Gemini CLI JSON 说明：

- 回复文本从 JSON `response` 字段读取。
- 当 `usage` 缺失或为空时，用量回退到 `stats`。
- `stats.cached` 被标准化为 OpenClaw `cacheRead`。
- 如果 `stats.input` 缺失，OpenClaw 从
  `stats.input_tokens - stats.cached` 推导输入令牌。

仅在需要时覆盖（常见：绝对 `command` 路径）。

## 插件拥有的默认值

CLI 后端默认值现在是插件表面的一部分：

- 插件使用 `api.registerCliBackend(...)` 注册它们。
- 后端 `id` 成为模型引用中的提供商前缀。
- `agents.defaults.cliBackends.<id>` 中的用户配置仍然覆盖插件默认值。
- 后端特定的配置清理通过可选的
  `normalizeConfig` 钩子保持插件拥有。

需要微小提示/消息兼容性填充的插件可以声明双向文本转换，而无需替换提供商或 CLI 后端：

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

`input` 重写传递给 CLI 的系统提示和用户提示。`output` 在 OpenClaw 处理其自己的控制标记和通道交付之前，重写流式助手增量和解析后的最终文本。

对于发出兼容 Claude Code stream-json JSONL 的 CLI，在该后端的配置上设置 `jsonlDialect: "claude-stream-json"`。

## 捆绑 MCP 覆盖

CLI 后端 **不直接** 接收 OpenClaw 工具调用，但后端可以通过 `bundleMcp: true` 选择加入
生成的 MCP 配置覆盖。

当前捆绑行为：

- `claude-cli`: 生成的严格 MCP 配置文件
- `codex-cli`: `mcp_servers` 的内联配置覆盖；生成的
  OpenClaw 环回服务器会被标记为 Codex 的按服务器工具审批模式，
  因此 MCP 调用不会因本地审批提示而停滞
- `google-gemini-cli`: 生成的 Gemini 系统设置文件

当启用 bundle MCP 时，OpenClaw：

- 生成一个环回 HTTP MCP 服务器，将网关工具暴露给 CLI 进程
- 使用每个会话的令牌 (`OPENCLAW_MCP_TOKEN`) 对桥接进行身份验证
- 将工具访问范围限定为当前会话、账户和频道上下文
- 为当前工作区加载已启用的 bundle-MCP 服务器
- 将它们与任何现有的后端 MCP 配置/设置形状合并
- 使用所属扩展的后端拥有的集成模式重写启动配置

如果没有启用 MCP 服务器，当后端
选择加入 bundle MCP 时，OpenClaw 仍然注入严格配置，以便后台运行保持隔离。

## 限制

- **无直接 OpenClaw 工具调用。** OpenClaw 不将工具调用注入到
  CLI 后端协议中。后端仅在选择加入
  `bundleMcp: true` 时看到网关工具。
- **流式传输是后端特定的。** 一些后端流式传输 JSONL；其他缓冲
  直到退出。
- **结构化输出** 依赖于 CLI 的 JSON 格式。
- **Codex CLI 会话** 通过文本输出恢复（无 JSONL），这比初始 `--json` 运行结构更少。OpenClaw 会话仍然正常
  工作。

## 故障排除

- **未找到 CLI**：将 `command` 设置为完整路径。
- **模型名称错误**：使用 `modelAliases` 将 `provider/model` → CLI model 进行映射。
- **没有会话连续性**：确保已设置 `sessionArg`，并且 `sessionMode` 不是
  `none`（Codex CLI 当前无法使用 JSON 输出恢复会话）。
- **图片被忽略**：设置 `imageArg`（并确认 CLI 支持文件路径）。

## 相关内容

- [Gateway runbook](/gateway)
- [本地模型](/gateway/local-models)
