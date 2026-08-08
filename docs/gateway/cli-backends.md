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

将其用作“始终可用”的文本响应安全网，而不是主要路径。若你需要带有 ACP 会话控制、后台任务、线程/对话绑定以及持久化外部编码会话的完整运行时，请改用 [ACP 代理](/tools/acp-agents)；CLI 后端并不是 ACP。

<Tip>
  要构建新的后端插件吗？请参阅 [CLI 后端插件](/plugins/cli-backend-plugins)。本页介绍的是如何配置和操作一个已经注册的后端。
</Tip>

## 快速开始

捆绑的 Anthropic 插件会注册一个默认的 `claude-cli` 后端，因此只要已安装并登录 Claude Code，就无需额外配置即可使用：

```bash
openclaw agent --agent main --message "hi" --model claude-cli/claude-sonnet-4-6
```

当未配置显式的代理列表时，`main` 是默认的代理 ID；否则请替换为你自己的代理 ID。

网关服务必须能够在其 `PATH` 中找到 CLI。如果部署需要非标准的可执行文件路径或参数，请在[CLI 后端插件](/plugins/cli-backend-plugins)中注册该适配器，而不是将启动机制写入 `openclaw.json`。

当模型选择或模型范围的 `agentRuntime.id` 引用了某个后端时，OpenClaw 会自动加载拥有该后端的捆绑插件。

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

当主提供商失败时（身份验证、速率限制、超时），已配置的回退项仍然符合条件，即使它们不在 `agents.defaults.modelPolicy.allow` 中。仅当用户还应能够通过 `/model`、会话覆盖或 `--model` 直接选择 CLI 后端模型时，才将其添加到该策略中。`agents.defaults.models` 仅负责管理每个模型的别名、参数和元数据。

## 配置

用户通过模型和运行时策略选择已注册的后端。保持模型引用的规范形式，并按模型选择 CLI 运行时：

```json5
{
  agents: {
    defaults: {
      model: "anthropic/claude-opus-5",
      models: {
        "anthropic/claude-opus-5": {
          agentRuntime: { id: "claude-cli" },
        },
      },
    },
  },
}
```

凭据仍保留在 OpenClaw 认证配置文件或所属插件的配置中。命令、argv、环境、解析、会话、图像和看门狗机制均属于通过 `api.registerCliBackend(...)` 注册的插件代码。

## 工作原理

1. 按提供程序前缀（`claude-cli/...`）选择后端。
2. 使用相同的 OpenClaw 提示词和工作区上下文构建系统提示。
3. 使用会话 id 执行 CLI（如果支持），以保持历史记录一致。内置的 `claude-cli` 后端会为每个 OpenClaw 会话保持一个 Claude stdio 进程存活，并通过 stream-json stdin 发送后续轮次。
4. 解析输出（JSON 或纯文本）并返回最终文本。
5. 按后端持久化会话 id，以便后续跟进复用同一个 CLI 会话。

## 超时和长时间运行的工作

CLI 后端有两个独立的限制：

- `agents.defaults.timeoutSeconds` 限制整个代理回合的时长。普通 Gateway 回合继承 48 小时的默认值；`0` 表示回合预算不受限制。存储的覆盖值（例如 `600`）会替换该默认值。
- CLI 无输出监视器会停止持续无输出的子进程。每个后端插件都拥有独立的全新运行/恢复配置，即使总体回合预算不受限制，监视器仍然处于活动状态。

移除较短的总体超时覆盖设置，以恢复 48 小时默认值；或者设置一个明确的预算，例如 12 小时：

```bash
# 恢复为 48 小时默认值：
openclaw config unset agents.defaults.timeoutSeconds

# 或选择明确的 12 小时限制：
openclaw config set agents.defaults.timeoutSeconds 43200
```

在 CLI 内部启动的后台工作仍属于该 CLI 子进程的一部分。如果父回合达到其总体限制，OpenClaw 会同时停止该子进程及其 CLI 内部的后台任务。对于持久运行的长时间工作，请使用独立运行的 OpenClaw [子代理](/tools/subagents)或 [ACP 代理](/tools/acp-agents)；独立运行的子代理默认没有运行超时。

`openclaw agent` 命令也有自己的请求截止时间。其 600 秒的后备默认值适用于该命令调用，而不适用于普通 Gateway 回合；请参见 [`openclaw agent`](/cli/agent)。

### Claude CLI 特定说明

OpenClaw 管理的 Claude stdio 会话要求具备 `msg_lifecycle_v1`
能力，该能力首次在已发布的 Claude Code 2.1.206 版本中被发现。在运行时，
OpenClaw 不会仅凭版本字符串建立信任：它会等待 Claude Code 的
`system/init` 记录声明 `msg_lifecycle_v1`，然后仅在匹配的输入生命周期
开始后接受助手、工具和结果记录。未知能力会被忽略。缺少所需能力的 CLI
会立即失败，并提供 `claude update` 和重启 Gateway 的指导，而不是等待无输出监视器触发。

设置和 Doctor 会将 2.1.206 视为建议版本，因此仍可选择较低版本的兼容性
回移版本或包装器，并由运行时门控进行验证。

```bash
claude --version
claude update
# 更新后重启 OpenClaw Gateway。
```

Claude Code 的公开 CLI 文档涵盖了 stream-json 模式和更新，但目前尚未记录
该生命周期事件。因此，OpenClaw 会检测所声明的能力；2.1.206 是目前观察到的
首个提供该能力的已发布 Claude Code 版本。

捆绑的 `claude-cli` 后端优先使用 Claude Code 原生的技能解析器。当当前技能快照中
至少有一个已选技能具有已物化的路径时，OpenClaw 会通过 `--plugin-dir` 传递一个
临时的 Claude Code 插件，并从附加的系统提示中省略重复的 OpenClaw 技能目录。
如果没有已物化的插件技能，OpenClaw 会保留提示目录作为后备方案。技能环境变量/API
密钥覆盖仍会应用于本次运行的子进程环境。

Claude CLI 有自己的非交互式权限模式；OpenClaw 将其映射到现有的 exec 策略，而不是添加 Claude 专用配置。对于由 OpenClaw 管理的 Claude 实时会话，有效的 exec 策略具有权威性：YOLO（`tools.exec.mode: "full"`）通常会使用 `--permission-mode bypassPermissions` 启动 Claude，而限制性策略则使用 `--permission-mode default` 启动。以 root 身份运行的 Gateway 也使用 `default`，因为 Claude Code 会拒绝 root 使用绕过模式。针对单个代理的 `agents.entries.*.tools.exec` 设置会覆盖该代理的全局 `tools.exec` 设置。Anthropic 插件会将 Claude 的权限标志规范化，使其与有效策略和主机限制保持一致。

在限制性策略下，Claude 在使用其原生工具或扩展工具之一（其自身的 Bash、WebFetch 或 Claude in Chrome 浏览器工具）之前，会通过 stdio 向 OpenClaw 发起请求。当有效的 exec ask 设置为 `on-miss` 或 `always` 时，OpenClaw 会将每个请求作为交互式审批转发到会话所在的频道：**允许一次**允许单次调用，**始终允许**允许该工具名称在当前 Claude 实时会话的剩余时间内使用（仅保存在内存中，绝不会持久化），而**拒绝**、超时或无法访问的审批路由都会拒绝该调用。从不提示的策略会保留原有行为：`security: "deny"` 会拒绝所有请求，而安全级别低于完全安全性的 `ask off`（exec 模式为 `allowlist`）会直接拒绝而不询问。

### Claude 浏览器工具和 1Password 登录

Claude Code 可以通过 [Claude in Chrome 扩展](https://code.claude.com/docs/en/chrome)驱动 Chrome 浏览器，包括使用 [适用于 Claude 的 1Password](/gateway/1password#browser-sign-in-with-1password-for-claude) 自动填充凭据。捆绑的后端不会启用此功能；请注册一个 [CLI 后端插件](/plugins/cli-backend-plugins)，为 `claude-stream-json` 方言的后端在启动参数中追加 `--chrome`。OpenClaw 会在正常运行中保留已配置的 `--chrome`，而在使用限制性工具策略的运行中（例如旁问）始终强制使用 `--no-chrome`。Chrome 窗口、扩展以及任何 1Password 审批提示都位于 Gateway 主机上，因此必须有人在该机器前批准凭据的使用。

该后端还会将 OpenClaw 的 `/think` 级别映射到 Claude Code 原生的 `--effort` 标志：`minimal`/`low` -> `low`，`medium` -> `medium`，以及 `high`/`xhigh`/`max` 直接透传。这样可以使订阅支持的 Claude CLI 和 API 密钥路径保持与受支持的 Fable 5 级别相同的 effort 等级。`adaptive` 会移除已配置的 `--effort` 标志且不提供替代项，因此 Claude Code 会根据自身环境、设置和模型默认值来解析实际 effort。其他 CLI 后端需要其所属插件先声明等效的 argv 映射器，之后 `/think` 才会影响启动的 CLI。

在 OpenClaw 可以使用 `claude-cli` 之前，Claude Code 本身必须已在同一主机上登录：

```bash
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

Docker 安装需要在持久化的容器主目录中安装并登录 Claude Code，而不仅仅是在主机上；请参见 [Docker 中的 Claude CLI 后端](/install/docker#claude-cli-backend-in-docker)。

Gateway 服务必须能够在 `PATH` 上解析到 `claude`。对于非标准路径，请注册一个小型包装器后端插件。

## 会话

- 如果 CLI 支持会话，请使用带有 `{sessionId}` 占位符的 `sessionArgs`（例如 `["--session-id", "{sessionId}"]`）。
- 如果 CLI 使用带有不同标志的恢复子命令，请设置 `resumeArgs`（恢复时替换 `args`），并可选择为非 JSON 恢复设置 `resumeOutput`。
- `sessionMode`：
  - `always`：始终发送会话 ID（如果没有已存储的 ID，则生成新的 UUID）。
  - `existing`：仅在之前存储过会话 ID 时发送。
  - `none`：从不发送会话 ID。
- `claude-cli` 默认使用 `liveSession: "claude-stdio"`、`output: "jsonl"` 和 `input: "stdin"`，因此后续轮次会在实时 Claude 进程处于活动状态时复用该进程，即使是省略传输字段的自定义配置也如此。如果网关重启或空闲进程退出，OpenClaw 会从已存储的 Claude 会话 ID 恢复。已存储的会话 ID 会在恢复前根据可读取的项目记录进行验证；如果记录缺失，则会清除绑定（记录为 `reason=transcript-missing`），而不是在 `--resume` 下静默启动新会话。
- Claude 实时会话会保留有界的 JSONL 输出保护机制：每轮最多 8 MiB 和 20,000 行原始 JSONL。
- 已存储的 CLI 会话属于提供方所有的连续会话。默认情况下禁用自动重置；`/reset` 以及明确配置的每日或空闲 `session.reset` 策略仍会中断这些会话。
- 全新的 CLI 会话通常只会根据 OpenClaw 的压缩摘要和压缩后的尾部内容重新植入上下文。为了恢复在压缩前失效的短会话，后端可以通过设置 `reseedFromRawTranscriptWhenUncompacted: true` 选择加入。原始记录重新植入会保持有界，并且仅限于安全的失效情况，例如 CLI 记录缺失、孤立的工具调用尾部、消息策略/系统提示/cwd/MCP 发生变化，或会话过期重试；认证配置文件或凭据周期发生变化时，绝不会重新植入原始记录历史。

序列化：`serialize: true` 可保持同一通道的运行有序（大多数 CLI 会在单个提供方通道上串行化）。如果所选认证身份发生变化，OpenClaw 也会放弃已存储的 CLI 会话复用，包括认证配置文件 id 变更、静态 API key、静态 token，或当 CLI 提供时 OAuth 账户身份变更；仅 OAuth access/refresh token 轮换不会切断会话。如果某个 CLI 没有稳定的 OAuth 账户 id，OpenClaw 会让该 CLI 自行强制执行其恢复权限。

## claude-cli 会话中的回退前导

当 `claude-cli` 尝试回退到 [`agents.defaults.model.fallbacks`](/concepts/model-failover) 中的非 CLI 候选项时，OpenClaw 会从 Claude Code 的本地 JSONL 转录文件中提取上下文前导，并将其注入到下一次尝试中（位于 `~/.claude/projects/` 下，按工作区分别键控）。如果没有这个前导，回退提供方将从冷启动开始，因为对于 `claude-cli` 运行来说，OpenClaw 自己的会话转录是空的。

- 该前导优先使用最新的 `/compact` 摘要或 `compact_boundary` 标记，然后再附加边界之后最近的对话轮次，直到达到字符预算。边界之前的轮次会被丢弃，因为摘要已经代表了它们。
- 工具块会被合并为紧凑的 `(tool call: name)` 和 `(tool result: …)` 提示，以保持提示预算的准确性；过大的摘要会被截断并标记为 `(truncated)`。
- 同提供方的 `claude-cli` 到 `claude-cli` 回退依赖 Claude 自身的 `--resume`，并会跳过前导。
- 该种子会复用现有的 Claude 会话文件路径校验，因此无法读取任意路径。

## 图片

插件作者通过 `imageArg` 声明图片路径支持：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 会将 base64 图片写入临时文件。如果设置了 `imageArg`，这些路径会作为 CLI 参数传递；如果没有设置，OpenClaw 会将文件路径追加到提示词中（路径注入），这适用于会从普通路径自动加载本地文件的 CLI。

## 输入和输出

- `output: "text"`（默认）将 stdout 视为最终响应。
- `output: "json"` 尝试解析 JSON，并提取文本和会话 ID。
- `output: "jsonl"` 解析 JSONL 流，并提取最终代理消息以及（如有）会话标识符。
- 对于 Gemini CLI JSON 输出，当 `usage` 缺失或为空时，OpenClaw 会从 `response` 中读取回复文本，并从 `stats` 中读取使用情况。内置的 Gemini CLI 适配器使用 `stream-json`。

输入模式：

- `input: "arg"`（默认）将提示作为最后一个 CLI 参数传递。
- `input: "stdin"` 通过 stdin 发送提示。
- 如果提示非常长，并且设置了 `maxPromptArgChars`，则会改用 stdin。

## 插件的所有默认值

CLI 后端默认值是插件接口的一部分：

- 插件通过 `api.registerCliBackend(...)` 注册这些默认值。
- 后端 `id` 会成为模型引用中的提供商前缀。
- 命令、argv、环境、解析器、会话和 watchdog 行为均保留在插件代码中。
- 特定于后端的规范化仍由插件通过可选的 `normalizeConfig` 钩子负责。

Anthropic 负责 `claude-cli`，Google 负责 `google-gemini-cli`。OpenAI Codex agent 运行通过 `openai/*` 使用 Codex app-server harness；OpenClaw 不再注册内置的 `codex-cli` 后端。

内置的 Anthropic 插件为 `claude-cli` 注册：

| 键                       | 值                                                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `command`                | `claude`                                                                                                                                                                                                      |
| `args`                   | `-p --output-format stream-json --include-partial-messages --verbose --setting-sources user --allowedTools mcp__openclaw__* --disallowedTools ScheduleWakeup,CronCreate,Bash(run_in_background:true),Monitor` |
| `output`                 | `jsonl`                                                                                                                                                                                                       |
| `input`                  | `stdin`                                                                                                                                                                                                       |
| `modelArg`               | `--model`                                                                                                                                                                                                     |
| `sessionArgs`            | `["--session-id", "{sessionId}"]`                                                                                                                                                                             |
| `sessionMode`            | `always`                                                                                                                                                                                                      |
| 实时会话要求             | `msg_lifecycle_v1`（首次出现于 Claude Code 2.1.206）                                                                                                                                                           |
| `imageArg`               | `@`                                                                                                                                                                                                           |
| `imagePathScope`         | `workspace`                                                                                                                                                                                                   |
| `systemPromptFileArg`    | `--append-system-prompt-file`                                                                                                                                                                                 |
| `systemPromptMode`       | `append`                                                                                                                                                                                                      |

内置的 Google 插件为 `google-gemini-cli` 注册：

| 键                        | 值                                                                                  |
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

前置条件：必须安装本地 Gemini CLI，并在 `PATH` 中以 `gemini` 的名称可用（`brew install gemini-cli` 或 `npm install -g @google/gemini-cli`）；所选模型还必须具有受支持的 Google AI Studio API 密钥配置。现有的有效旧版 Gemini CLI OAuth 配置在运行时仍保持兼容，但 OpenClaw 不会创建或修复这些配置。

Gemini CLI 输出说明：

- 默认的 `stream-json` 解析器会读取 assistant `message` 事件、工具事件、最终 `result` 使用量以及致命的 Gemini 错误事件。
- 当 `usage` 缺失或为空时，使用量会回退到 `stats`；`stats.cached` 会规范化为 OpenClaw 的 `cacheRead`，如果缺少 `stats.input`，则根据 `stats.input_tokens - stats.cached` 推导输入 token 数量。

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

诸如带有 `toolsAllow` 的 cron 作业之类的受限运行，需要由后端负责进行精确转换。捆绑的 `claude-cli` 后端会禁用 Claude 的原生工具以及用户、项目和本地自定义配置，包括 hooks、plugins、agents、skills 和 `CLAUDE.md`。随后，它会通过受授权范围限制的 MCP 服务器暴露每个允许使用的 OpenClaw 工具。这样，文件系统、进程、exec、审批和沙箱策略都由 OpenClaw 控制，而不会将权限扩展到 Claude 的原生工具或自定义进程。相同的 MCP 列表会在 Claude 生成的配置中强制执行，并由 Gateway 在工具列表和执行阶段再次强制执行。在创建授权之前，核心会拒绝任何指定了原始允许列表之外 MCP 权限的后端转换。无法进行精确转换的后端仍会默认拒绝。

如果未启用任何 MCP 服务器，当后端选择加入 bundle MCP 时，OpenClaw 仍会注入严格的配置，以确保后台运行保持隔离。

会话范围内的捆绑 MCP 运行时会被缓存，以便在会话内复用，然后在空闲 10 分钟后回收。诸如身份验证探测、slug 生成和活动记忆召回之类的一次性嵌入式运行会在运行结束时请求清理，以确保 stdio 子进程以及 Streamable HTTP/SSE 流不会超出运行生命周期。

对于 `claude-cli`，兼容的已选定或按顺序排列的 OpenClaw OAuth/token 配置文件会被转发给 Claude 子进程。这使每个代理的配置文件在当前轮次中具有权威性，同时在不存在兼容配置文件时保留 Claude 的原生主机登录。

## 重设历史上限

当一个新的 CLI 会话从先前的 OpenClaw 转录中种子化时（例如在 `session_expired` 重试之后），渲染的 `<conversation_history>` 块会被限制，以防重设提示词膨胀。默认值为 12,288 个字符（约 3,000 个 token）。

Claude CLI 后端会根据解析后的 Claude 上下文窗口调整此上限：上下文窗口越大，可容纳的先前历史记录片段就越大，但不会超过固定上限；其他 CLI 后端则继续使用保守的默认值。此上限仅控制重设提示词中的先前历史记录块。

## 限制

- OpenClaw 不会将工具调用注入 CLI 后端协议。只有在启用 `bundleMcp: true` 时，后端才能看到网关工具。
- 流式传输取决于后端：某些后端以 JSONL 形式进行流式传输，其他后端则会缓冲内容直到退出。
- 结构化输出取决于 CLI 自身的 JSON 格式。

## 故障排除

| 症状                  | 修复                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| 找不到 CLI            | 将 CLI 放入网关服务的 `PATH` 中，或更新所属插件注册的命令。                                      |
| 模型名称错误          | 更新插件的 `modelAliases` 映射。                                                               |
| 会话无法保持连续性    | 检查插件的 `sessionArgs` 和 `sessionMode`。                                                     |
| 图片被忽略            | 检查插件的 `imageArg` 以及 CLI 对文件路径的支持情况。                                           |

## 相关

- [网关运行手册](/gateway)
- [本地模型](/gateway/local-models)。
