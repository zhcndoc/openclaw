---
summary: "CLI 后端：带可选 MCP 工具桥接的本地 AI CLI 回退"
read_when:
  - 你想要在 API 提供商失败时有一个可靠的回退
  - 你正在运行本地 AI CLI，并希望复用它们
  - 你想了解 CLI 后端工具访问的 MCP 回环桥接
title: "CLI 后端"
---

当 API 提供商宕机、速率受限或行为异常时，OpenClaw 可以将本地 AI CLI 作为仅文本的回退来运行。它的设计是刻意保持保守的：

- OpenClaw 工具不会被直接注入，但启用了 `bundleMcp: true` 的后端可以通过回环 MCP 桥接接收网关工具。
- 对支持 JSONL 流式输出的 CLI，提供 JSONL 流式支持。
- 支持会话，因此后续轮次能够保持连贯。
- 如果 CLI 接受图片路径，则图片会被透传。

将其用作“始终可用”的文本响应安全网，而不是主要路径。若你需要带有 ACP 会话控制、后台任务、线程/对话绑定以及持久化外部编码会话的完整运行时，请改用 [ACP Agents](/tools/acp-agents)；CLI 后端并不是 ACP。

<Tip>
  要构建新的后端插件吗？请参阅 [CLI 后端插件](/plugins/cli-backend-plugins)。本页介绍的是如何配置和操作一个已经注册的后端。
</Tip>

## 快速开始

捆绑的 Anthropic 插件会注册一个默认的 `claude-cli` 后端，因此只要已安装并登录 Claude Code，就无需额外配置即可使用：

```bash
openclaw agent --agent main --message "hi" --model claude-cli/claude-sonnet-4-6
```

当未配置显式的代理列表时，`main` 是默认的代理 ID；否则请替换为你自己的代理 ID。

如果网关在 launchd/systemd 下运行，且 `PATH` 非常精简，请显式指定二进制文件路径：

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

如果你在网关主机上将捆绑的 CLI 后端用作主要消息提供方，并且你的配置在模型引用中或在 `agents.defaults.cliBackends` 下引用了该后端，OpenClaw 会自动加载其所属的捆绑插件。

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

如果你将 `agents.defaults.models` 用作允许列表，也请把你的 CLI 后端模型添加到那里。当主提供方失败时（认证、速率限制、超时），OpenClaw 会接着尝试 CLI 后端。

## 配置

所有 CLI 后端都位于 `agents.defaults.cliBackends` 下，并按提供者 id 作为键（例如 `claude-cli`、`my-cli`）。提供者 id 会成为模型引用的左侧部分：`<provider>/<model>`。

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
          // 专用的 prompt-file 标志：
          // systemPromptFileArg: "--system-file",
          // 或者改用 Codex 风格的 config-override 标志：
          // systemPromptFileConfigArg: "-c",
          // systemPromptFileConfigKey: "model_instructions_file",
          systemPromptWhen: "first",
          imageArg: "--image",
          imageMode: "repeat",
          // 仅当此后端可能会在压缩前，
          // 从受限的原始 OpenClaw 转录历史中重新播种失效会话时启用。
          reseedFromRawTranscriptWhenUncompacted: true,
          serialize: true,
        },
      },
    },
  },
}
```

## 工作原理

1. 按提供程序前缀（`claude-cli/...`）选择后端。
2. 使用相同的 OpenClaw 提示词和工作区上下文构建系统提示。
3. 使用会话 id 执行 CLI（如果支持），以保持历史记录一致。内置的 `claude-cli` 后端会为每个 OpenClaw 会话保持一个 Claude stdio 进程存活，并通过 stream-json stdin 发送后续轮次。
4. 解析输出（JSON 或纯文本）并返回最终文本。
5. 按后端持久化会话 id，以便后续跟进复用同一个 CLI 会话。

### Claude CLI 细节

内置的 `claude-cli` 后端优先使用 Claude Code 的原生技能解析器。当当前技能快照中至少有一个已选择技能且具有已物化路径时，OpenClaw 会通过 `--plugin-dir` 传递一个临时的 Claude Code 插件，并从附加的系统提示中省略重复的 OpenClaw 技能目录。若没有已物化的插件技能，OpenClaw 会保留提示目录作为回退。技能环境变量/API 密钥覆盖在本次运行中仍会应用到子进程环境。

Claude CLI 有自己的非交互式权限模式；OpenClaw 会将其映射到现有的 exec 策略，而不是添加 Claude 专用配置。对于 OpenClaw 管理的 Claude 实时会话，实际生效的 exec 策略具有权威性：YOLO（`tools.exec.security: "full"` 且 `tools.exec.ask: "off"`）通常会以 `--permission-mode bypassPermissions` 启动 Claude，而更严格的策略会以 `--permission-mode default` 启动。以 root 运行的网关也会使用 `default`，因为 Claude Code 会拒绝 root 下的 bypass 模式；OpenClaw 仍然会根据已配置的 exec 策略来响应 Claude 的 stdio 工具控制请求。每个代理的 `agents.list[].tools.exec` 设置会覆盖该代理的全局 `tools.exec`。原始后端参数仍可能包含 `--permission-mode`，但实时 Claude 启动会对该标志进行规范化，使其与实际生效的策略和主机限制相匹配。

该后端还会将 OpenClaw 的 `/think` 级别映射到 Claude Code 原生的 `--effort` 标志：`minimal`/`low` -> `low`，`medium` -> `medium`，以及 `high`/`xhigh`/`max` 直接透传。这样可以使订阅支持的 Claude CLI 和 API 密钥路径保持与受支持的 Fable 5 级别相同的 effort 等级。`adaptive` 会移除已配置的 `--effort` 标志且不提供替代项，因此 Claude Code 会根据自身环境、设置和模型默认值来解析实际 effort。其他 CLI 后端需要其所属插件先声明等效的 argv 映射器，之后 `/think` 才会影响启动的 CLI。

在 OpenClaw 可以使用 `claude-cli` 之前，Claude Code 本身必须已在同一主机上登录：

```bash
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

Docker 安装需要在持久化的容器主目录中安装并登录 Claude Code，而不仅仅是在主机上；请参见 [Docker 中的 Claude CLI 后端](/install/docker#claude-cli-backend-in-docker)。

仅当 `claude` 二进制文件尚未位于 `PATH` 中时，才设置 `agents.defaults.cliBackends.claude-cli.command`。

## 会话

- 如果 CLI 支持会话，在需要 id 出现在多个标志位中时，设置 `sessionArg`（例如 `--session-id`）或 `sessionArgs`（占位符 `{sessionId}`）。
- 如果 CLI 使用带不同标志位的恢复子命令，设置 `resumeArgs`（在恢复时替换 `args`），并可选设置 `resumeOutput` 用于非 JSON 恢复。
- `sessionMode`：
  - `always`：始终发送会话 id（如果没有已存储的，则使用新的 UUID）。
  - `existing`：仅在之前已存储会话 id 时发送。
  - `none`：从不发送会话 id。
- `claude-cli` 默认 `liveSession: "claude-stdio"`、`output: "jsonl"` 和 `input: "stdin"`，因此后续轮次会在活动期间复用当前的 Claude 进程，包括省略传输字段的自定义配置。如果网关重启或空闲进程退出，OpenClaw 会从已存储的 Claude 会话 id 恢复。已存储的会话 id 在恢复前会与可读的项目转录进行验证；缺失的转录会清除绑定（记录为 `reason=transcript-missing`），而不是在 `--resume` 下静默启动一个新的会话。
- Claude 活动会话保留有界的 JSONL 输出保护：默认每轮 8 MiB 和 20,000 行原始 JSONL。可按后端通过 `agents.defaults.cliBackends.claude-cli.reliability.outputLimits.maxTurnRawChars` 和 `maxTurnLines` 提高；OpenClaw 会将这些设置限制为 64 MiB 和 100,000 行。
- 已存储的 CLI 会话是由提供方拥有的连续性。隐式的每日会话重置不会中断它们；`/reset` 和显式的 `session.reset` 策略仍然会中断。
- 新的 CLI 会话通常只会从 OpenClaw 的压缩摘要以及压缩后的尾部重新播种。为恢复在压缩前失效的短会话，后端可以选择启用 `reseedFromRawTranscriptWhenUncompacted: true`。原始转录重播种保持有界，并仅限于安全失效情况，例如缺失的 CLI 转录、孤立的工具使用尾部、消息策略/系统提示词/cwd/MCP 变更，或会话过期重试；身份验证配置文件或凭据轮次的变更绝不会重播原始转录历史。

序列化：`serialize: true` 可保持同一通道的运行有序（大多数 CLI 会在单个提供方通道上串行化）。如果所选认证身份发生变化，OpenClaw 也会放弃已存储的 CLI 会话复用，包括认证配置文件 id 变更、静态 API key、静态 token，或当 CLI 提供时 OAuth 账户身份变更；仅 OAuth access/refresh token 轮换不会切断会话。如果某个 CLI 没有稳定的 OAuth 账户 id，OpenClaw 会让该 CLI 自行强制执行其恢复权限。

## claude-cli 会话中的回退前导

当 `claude-cli` 尝试回退到 [`agents.defaults.model.fallbacks`](/concepts/model-failover) 中的非 CLI 候选项时，OpenClaw 会从 Claude Code 的本地 JSONL 转录文件中提取上下文前导，并将其注入到下一次尝试中（位于 `~/.claude/projects/` 下，按工作区分别键控）。如果没有这个前导，回退提供方将从冷启动开始，因为对于 `claude-cli` 运行来说，OpenClaw 自己的会话转录是空的。

- 该前导优先使用最新的 `/compact` 摘要或 `compact_boundary` 标记，然后再附加边界之后最近的对话轮次，直到达到字符预算。边界之前的轮次会被丢弃，因为摘要已经代表了它们。
- 工具块会被合并为紧凑的 `(tool call: name)` 和 `(tool result: …)` 提示，以保持提示预算的准确性；过大的摘要会被截断并标记为 `(truncated)`。
- 同提供方的 `claude-cli` 到 `claude-cli` 回退依赖 Claude 自身的 `--resume`，并会跳过前导。
- 该种子会复用现有的 Claude 会话文件路径校验，因此无法读取任意路径。

## 图片

如果你的 CLI 接受图片路径，请设置 `imageArg`：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 会将 base64 图片写入临时文件。如果设置了 `imageArg`，这些路径会作为 CLI 参数传递；如果没有设置，OpenClaw 会将文件路径追加到提示词中（路径注入），这适用于会从普通路径自动加载本地文件的 CLI。

## 输入和输出

- `output: "text"`（默认）将 stdout 视为最终响应。
- `output: "json"` 尝试解析 JSON，并提取文本以及会话 ID。
- `output: "jsonl"` 解析 JSONL 流，并在存在时提取最终的 agent 消息以及会话标识符。
- 对于 Gemini CLI 的 JSON 输出，当 `usage` 缺失或为空时，OpenClaw 会从 `response` 读取回复文本，并从 `stats` 读取使用情况。捆绑的 Gemini CLI 默认使用 `stream-json`；旧的 `--output-format json` 覆盖项仍然使用 JSON 解析器。

输入模式：

- `input: "arg"`（默认）将提示作为最后一个 CLI 参数传递。
- `input: "stdin"` 通过 stdin 发送提示。
- 如果提示非常长，并且设置了 `maxPromptArgChars`，则会改用 stdin。

## 插件所有的默认值

CLI 后端默认值是插件表面的一部分：

- 插件通过 `api.registerCliBackend(...)` 注册它们。
- 后端 `id` 会成为模型引用中的提供者前缀。
- `agents.defaults.cliBackends.<id>` 中的用户配置仍会覆盖插件默认值。
- 通过可选的 `normalizeConfig` 钩子，特定后端的配置清理仍由插件负责。

Anthropic 负责 `claude-cli`，Google 负责 `google-gemini-cli`。OpenAI Codex agent 运行通过 `openai/*` 使用 Codex app-server harness；OpenClaw 不再注册内置的 `codex-cli` 后端。

内置的 Anthropic 插件为 `claude-cli` 注册：

| Key                   | Value                                                                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `command`             | `claude`                                                                                                                                                                                                      |
| `args`                | `-p --output-format stream-json --include-partial-messages --verbose --setting-sources user --allowedTools mcp__openclaw__* --disallowedTools ScheduleWakeup,CronCreate,Bash(run_in_background:true),Monitor` |
| `output`              | `jsonl`                                                                                                                                                                                                       |
| `input`               | `stdin`                                                                                                                                                                                                      |
| `modelArg`            | `--model`                                                                                                                                                                                                     |
| `sessionArg`         | `--session-id`                                                                                                                                                                                                |
| `sessionMode`         | `always`                                                                                                                                                                                                      |
| `imageArg`            | `@`                                                                                                                                                                                                           |
| `imagePathScope`      | `workspace`                                                                                                                                                                                                   |
| `systemPromptFileArg` | `--append-system-prompt-file`                                                                                                                                                                                 |
| `systemPromptMode`    | `append`                                                                                                                                                                                                      |

内置的 Google 插件为 `google-gemini-cli` 注册：

| Key                       | Value                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `command`                 | `gemini`                                                                               |
| `args`                    | `--skip-trust --approval-mode auto_edit --output-format stream-json --prompt {prompt}` |
| `resumeArgs`              | 相同，但加上 `--resume {sessionId}`                                                      |
| `output` / `resumeOutput` | `jsonl`                                                                                |
| `jsonlDialect`            | `gemini-stream-json`                                                                   |
| `imageArg`                | `@`                                                                                    |
| `imagePathScope`          | `workspace`                                                                            |
| `modelArg`                | `--model`                                                                              |
| `sessionMode`             | `existing`                                                                             |
| `sessionIdFields`         | `["session_id", "sessionId"]`                                                          |

前提条件：本地 Gemini CLI 必须已安装，并且以 `gemini` 的形式位于 `PATH` 中（`brew install gemini-cli` 或 `npm install -g @google/gemini-cli`）。

Gemini CLI 输出说明：

- 默认的 `stream-json` 解析器会读取 assistant `message` 事件、工具事件、最终 `result` 用量，以及致命的 Gemini 错误事件。
- 如果你将 Gemini 参数覆盖为 `--output-format json`，OpenClaw 会将该后端规范化回 `output: "json"`，并从 JSON `response` 字段读取回复文本。
- 当 `usage` 缺失或为空时，用量会回退到 `stats`；`stats.cached` 会规范化为 OpenClaw 的 `cacheRead`，如果 `stats.input` 缺失，输入 token 则由 `stats.input_tokens - stats.cached` 推导得出。

仅在需要时覆盖默认值（最常见的是绝对路径的 `command`）。

## 文本转换覆盖层

需要小型提示/消息兼容性补丁的插件，可以声明双向文本转换，而无需替换提供方或 CLI 后端：

```typescript
api.registerTextTransforms({
  input: [{ from: /red basket/g, to: "blue basket" }],
  output: [{ from: /blue basket/g, to: "red basket" }],
});
```

`input` 会重写传递给 CLI 的系统提示和用户提示。`output` 会在 OpenClaw 处理其自身的控制标记和通道传递之前，重写流式助手文本和解析后的最终文本；对于由提供方支持的模型调用，它还会在流修复之后、工具执行之前，恢复结构化工具调用参数中的字符串值。原始的提供方 JSON 片段会保持不变；消费者应使用结构化的 partial、end 或 result 负载。

对于输出 provider-specific JSONL 事件的 CLI，请在该后端的配置中设置 `jsonlDialect`：`claude-stream-json` 用于兼容 Claude Code 的流，`gemini-stream-json` 用于 Gemini CLI 的 `stream-json` 事件。

## 原生压缩所有权

某些 CLI 后端会运行一个代理来压缩其自身的对话记录，因此 OpenClaw 必须不要对它们运行其保护性摘要器——这样做会与后端自身的压缩机制相冲突，并且可能会使该轮次直接失败。

`claude-cli` 没有 harness 端点（Claude Code 会在内部进行压缩），因此它声明 `ownsNativeCompaction: true`，而 OpenClaw 的压缩路径会原样返回会话条目。OpenClaw 通过 Claude Code 文档中的 [`CLAUDE_CODE_AUTO_COMPACT_WINDOW`](https://code.claude.com/docs/en/env-vars)，将运行的有效上下文预算传递下去，使原生自动压缩与配置的 Anthropic `contextTokens` 限制保持一致。像 Codex 这样的原生 harness 会话则会继续路由到它们自己的 harness 压缩端点。

```typescript
api.registerCliBackend({ id: "my-cli", ownsNativeCompaction: true /* ... */ });
```

只有在后端确实自行负责压缩时，才应声明 `ownsNativeCompaction`：它必须能够可靠地将自身对话记录限制在接近上下文窗口的范围内，并持久化一个可恢复的会话（例如 `--resume` / `--session-id`），否则延迟恢复的会话可能会一直超出预算。

## Bundle MCP 覆盖层

CLI 后端不会直接接收 OpenClaw 工具调用，但后端可以通过 `bundleMcp: true` 选择启用生成的 MCP 配置覆盖层。当前捆绑行为如下：

- `claude-cli`：生成严格的 MCP 配置文件。
- `google-gemini-cli`：生成 Gemini 系统设置文件。

启用 bundle MCP 后，OpenClaw 会：

- 启动一个回环 HTTP MCP 服务器，向 CLI 进程暴露网关工具，并使用仅在当前执行尝试期间有效的每次运行上下文授权（`OPENCLAW_MCP_TOKEN`）进行认证；
- 将工具访问绑定到 Gateway 选择的会话、账户和频道上下文，而不是信任子进程头部信息；
- 为当前工作区加载已启用的 bundle-MCP 服务器，并将它们与任何现有的后端 MCP 配置/设置结构合并；
- 使用所属插件中的后端所有集成模式重写启动配置。

如果没有启用任何 MCP 服务器，当后端选择启用 bundle MCP 时，OpenClaw 仍会注入严格配置，以便后台运行保持隔离。

会话作用域的捆绑 MCP 运行时会在会话内缓存以便复用，然后在空闲 `mcp.sessionIdleTtlMs` 毫秒后被清理（默认 10 分钟；设为 `0` 可禁用）。像认证探测、slug 生成以及活动内存回忆这样的单次嵌入式运行，会在运行结束时请求清理，因此 stdio 子进程和 Streamable HTTP/SSE 流不会超出运行期。

## 重设历史上限

当一个新的 CLI 会话从先前的 OpenClaw 转录中种子化时（例如在 `session_expired` 重试之后），渲染的 `<conversation_history>` 块会被限制，以防重设提示词膨胀。默认值为 12,288 个字符（约 3,000 个 token）。

Claude CLI 后端会根据解析出的 Claude 上下文窗口来调整此上限：更大的上下文窗口会获得更大的历史记录切片，但有一个固定上限；其他 CLI 后端则保持保守的默认值。这个上限仅约束重设提示词中的历史记录块——实时会话的输出限制会在 `reliability.outputLimits` 下单独调优（参见 [Sessions](#sessions)）。

## 限制

- 不支持直接调用 OpenClaw 工具：OpenClaw 不会将工具调用注入 CLI 后端协议。只有在后端选择启用 `bundleMcp: true` 时，后端才会看到网关工具。
- 流式输出取决于后端：有些后端流式输出 JSONL，另一些则会缓冲直到退出。
- 结构化输出取决于 CLI 自身的 JSON 格式。

## 故障排除

| 症状               | 修复                                                               |
| --------------------- | ----------------------------------------------------------------- |
| 未找到 CLI         | 将 `command` 设置为完整路径。                                     |
| 模型名称错误      | 使用 `modelAliases` 将 `provider/model` 映射到 CLI 的模型 ID。 |
| 无会话连续性 | 确保已设置 `sessionArg` 且 `sessionMode` 不为 `none`。       |
| 图片被忽略        | 设置 `imageArg` 并确认该 CLI 支持文件路径。            |

## 相关

- [网关运行手册](/gateway)
- [本地模型](/gateway/local-models)
