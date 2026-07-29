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

The gateway service must have the CLI on its `PATH`. If a deployment needs a
nonstandard executable path or arguments, register that adapter in a
[CLI backend plugin](/plugins/cli-backend-plugins) instead of putting launch
mechanics in `openclaw.json`.

OpenClaw auto-loads an owning bundled plugin when model selection or a
model-scoped `agentRuntime.id` references its backend.

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

Configured fallbacks remain eligible when the primary provider fails (auth, rate limits, timeouts), even when they are not in `agents.defaults.modelPolicy.allow`. Add a CLI backend model to that policy only when users should also be able to select it directly through `/model`, a session override, or `--model`. `agents.defaults.models` only owns per-model aliases, parameters, and metadata.

## 配置

Users choose a registered backend through the model and runtime policy. Keep
the model ref canonical and select the CLI runtime per model:

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

Credentials remain in OpenClaw auth profiles or the owning plugin's config.
Command, argv, environment, parsing, session, image, and watchdog mechanics are
plugin code registered with `api.registerCliBackend(...)`.

## How it works

1. 按提供程序前缀（`claude-cli/...`）选择后端。
2. 使用相同的 OpenClaw 提示词和工作区上下文构建系统提示。
3. 使用会话 id 执行 CLI（如果支持），以保持历史记录一致。内置的 `claude-cli` 后端会为每个 OpenClaw 会话保持一个 Claude stdio 进程存活，并通过 stream-json stdin 发送后续轮次。
4. 解析输出（JSON 或纯文本）并返回最终文本。
5. 按后端持久化会话 id，以便后续跟进复用同一个 CLI 会话。

## Timeouts and long-running work

CLI backends have two independent limits:

- `agents.defaults.timeoutSeconds` limits the whole agent turn. Normal Gateway turns inherit the 48-hour default; `0` makes the turn budget unlimited. A stored override such as `600` replaces that default.
- The CLI no-output watchdog stops a subprocess that remains silent. Each backend plugin owns separate fresh/resume profiles, and the watchdog remains active even when the overall turn budget is unlimited.

Remove a short overall-timeout override to return to the 48-hour default, or set an explicit budget such as 12 hours:

```bash
# Return to the 48-hour default:
openclaw config unset agents.defaults.timeoutSeconds

# Or choose an explicit 12-hour limit:
openclaw config set agents.defaults.timeoutSeconds 43200
```

Background work started inside a CLI is still part of that CLI subprocess. If the parent turn reaches its overall limit, OpenClaw stops the subprocess and its CLI-internal background tasks together. For durable long work, use a detached OpenClaw [sub-agent](/tools/subagents) or [ACP agent](/tools/acp-agents); detached sub-agents have no run timeout by default.

The `openclaw agent` command also has its own request deadline. Its 600-second fallback default applies to that command invocation, not to ordinary Gateway turns; see [`openclaw agent`](/cli/agent).

### Claude CLI specifics

内置的 `claude-cli` 后端优先使用 Claude Code 的原生技能解析器。当当前技能快照中至少有一个已选择技能且具有已物化路径时，OpenClaw 会通过 `--plugin-dir` 传递一个临时的 Claude Code 插件，并从附加的系统提示中省略重复的 OpenClaw 技能目录。若没有已物化的插件技能，OpenClaw 会保留提示目录作为回退。技能环境变量/API 密钥覆盖在本次运行中仍会应用到子进程环境。

Claude CLI has its own noninteractive permission mode; OpenClaw maps that to the existing exec policy instead of adding Claude-specific config. For OpenClaw-managed Claude live sessions, the effective exec policy is authoritative: YOLO (`tools.exec.mode: "full"`) normally launches Claude with `--permission-mode bypassPermissions`, while a restrictive policy launches it with `--permission-mode default`. Root-run gateways also use `default` because Claude Code rejects bypass mode for root. Per-agent `agents.entries.*.tools.exec` settings override the global `tools.exec` for that agent. The Anthropic plugin normalizes Claude's permission flags to match the effective policy and host restriction.

Under a restrictive policy, Claude asks OpenClaw over stdio before using one of its native or extension tools (its own Bash, WebFetch, or Claude in Chrome browser tools). When the effective exec ask setting is `on-miss` or `always`, OpenClaw relays each request as an interactive approval to the session's channel: **Allow once** permits the single call, **Allow always** permits that tool name for the rest of the live Claude session (in memory only, never persisted), and **Deny**, a timeout, or an unreachable approval route all deny the call. Policies that never prompt keep their old behavior: `security: "deny"` rejects every request, and ask `off` with less than full security (exec mode `allowlist`) denies without asking.

### Claude browser tools and 1Password sign-in

Claude Code can drive a Chrome browser through the [Claude in Chrome extension](https://code.claude.com/docs/en/chrome), including [1Password for Claude](/gateway/1password#browser-sign-in-with-1password-for-claude) credential autofill. The bundled backend does not enable it; register a [CLI backend plugin](/plugins/cli-backend-plugins) that appends `--chrome` to the launch args of a `claude-stream-json`-dialect backend. OpenClaw preserves a configured `--chrome` on normal runs and always forces `--no-chrome` on runs with a restricted tool policy, such as side questions. The Chrome window, the extension, and any 1Password approval prompts live on the gateway host, so someone must be at that machine to approve credential use.

该后端还会将 OpenClaw 的 `/think` 级别映射到 Claude Code 原生的 `--effort` 标志：`minimal`/`low` -> `low`，`medium` -> `medium`，以及 `high`/`xhigh`/`max` 直接透传。这样可以使订阅支持的 Claude CLI 和 API 密钥路径保持与受支持的 Fable 5 级别相同的 effort 等级。`adaptive` 会移除已配置的 `--effort` 标志且不提供替代项，因此 Claude Code 会根据自身环境、设置和模型默认值来解析实际 effort。其他 CLI 后端需要其所属插件先声明等效的 argv 映射器，之后 `/think` 才会影响启动的 CLI。

在 OpenClaw 可以使用 `claude-cli` 之前，Claude Code 本身必须已在同一主机上登录：

```bash
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

Docker 安装需要在持久化的容器主目录中安装并登录 Claude Code，而不仅仅是在主机上；请参见 [Docker 中的 Claude CLI 后端](/install/docker#claude-cli-backend-in-docker)。

The gateway service must resolve `claude` on `PATH`. For a nonstandard path,
register a small wrapper backend plugin.

## 会话

- If the CLI supports sessions, set `sessionArgs` with a `{sessionId}` placeholder (for example `["--session-id", "{sessionId}"]`).
- If the CLI uses a resume subcommand with different flags, set `resumeArgs` (replaces `args` when resuming) and optionally `resumeOutput` for non-JSON resumes.
- `sessionMode`:
  - `always`: always send a session id (new UUID if none stored).
  - `existing`: only send a session id if one was stored before.
  - `none`: never send a session id.
- `claude-cli` defaults to `liveSession: "claude-stdio"`, `output: "jsonl"`, and `input: "stdin"`, so follow-up turns reuse the live Claude process while it is active, including for custom configs that omit transport fields. If the gateway restarts or the idle process exits, OpenClaw resumes from the stored Claude session id. Stored session ids are verified against a readable project transcript before resume; a missing transcript clears the binding (logged as `reason=transcript-missing`) instead of silently starting a fresh session under `--resume`.
- Claude live sessions keep bounded JSONL output guards: 8 MiB and 20,000 raw JSONL lines per turn.
- Stored CLI sessions are provider-owned continuity. Automatic reset is disabled by default; `/reset` and explicit daily or idle `session.reset` policies still cut them.
- Fresh CLI sessions normally reseed only from OpenClaw's compaction summary plus the post-compaction tail. To recover short sessions invalidated before compaction, a backend can opt in with `reseedFromRawTranscriptWhenUncompacted: true`. Raw transcript reseed stays bounded and limited to safe invalidations, such as a missing CLI transcript, an orphaned tool-use tail, message-policy/system-prompt/cwd/MCP changes, or a session-expired retry; auth profile or credential-epoch changes never reseed raw transcript history.

序列化：`serialize: true` 可保持同一通道的运行有序（大多数 CLI 会在单个提供方通道上串行化）。如果所选认证身份发生变化，OpenClaw 也会放弃已存储的 CLI 会话复用，包括认证配置文件 id 变更、静态 API key、静态 token，或当 CLI 提供时 OAuth 账户身份变更；仅 OAuth access/refresh token 轮换不会切断会话。如果某个 CLI 没有稳定的 OAuth 账户 id，OpenClaw 会让该 CLI 自行强制执行其恢复权限。

## claude-cli 会话中的回退前导

当 `claude-cli` 尝试回退到 [`agents.defaults.model.fallbacks`](/concepts/model-failover) 中的非 CLI 候选项时，OpenClaw 会从 Claude Code 的本地 JSONL 转录文件中提取上下文前导，并将其注入到下一次尝试中（位于 `~/.claude/projects/` 下，按工作区分别键控）。如果没有这个前导，回退提供方将从冷启动开始，因为对于 `claude-cli` 运行来说，OpenClaw 自己的会话转录是空的。

- 该前导优先使用最新的 `/compact` 摘要或 `compact_boundary` 标记，然后再附加边界之后最近的对话轮次，直到达到字符预算。边界之前的轮次会被丢弃，因为摘要已经代表了它们。
- 工具块会被合并为紧凑的 `(tool call: name)` 和 `(tool result: …)` 提示，以保持提示预算的准确性；过大的摘要会被截断并标记为 `(truncated)`。
- 同提供方的 `claude-cli` 到 `claude-cli` 回退依赖 Claude 自身的 `--resume`，并会跳过前导。
- 该种子会复用现有的 Claude 会话文件路径校验，因此无法读取任意路径。

## 图片

Plugin authors declare image-path support with `imageArg`:

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 会将 base64 图片写入临时文件。如果设置了 `imageArg`，这些路径会作为 CLI 参数传递；如果没有设置，OpenClaw 会将文件路径追加到提示词中（路径注入），这适用于会从普通路径自动加载本地文件的 CLI。

## 输入和输出

- `output: "text"` (default) treats stdout as the final response.
- `output: "json"` tries to parse JSON and extract text plus a session id.
- `output: "jsonl"` parses a JSONL stream and extracts the final agent message plus session identifiers when present.
- For Gemini CLI JSON output, OpenClaw reads reply text from `response` and usage from `stats` when `usage` is missing or empty. The bundled Gemini CLI adapter uses `stream-json`.

输入模式：

- `input: "arg"`（默认）将提示作为最后一个 CLI 参数传递。
- `input: "stdin"` 通过 stdin 发送提示。
- 如果提示非常长，并且设置了 `maxPromptArgChars`，则会改用 stdin。

## 插件所有的默认值

CLI 后端默认值是插件表面的一部分：

- Plugins register them with `api.registerCliBackend(...)`.
- The backend `id` becomes the provider prefix in model refs.
- Command, argv, environment, parser, session, and watchdog behavior stays in plugin code.
- Backend-specific normalization stays plugin-owned through the optional `normalizeConfig` hook.

Anthropic 负责 `claude-cli`，Google 负责 `google-gemini-cli`。OpenAI Codex agent 运行通过 `openai/*` 使用 Codex app-server harness；OpenClaw 不再注册内置的 `codex-cli` 后端。

内置的 Anthropic 插件为 `claude-cli` 注册：

| Key                   | Value                                                                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `command`             | `claude`                                                                                                                                                                                                      |
| `args`                | `-p --output-format stream-json --include-partial-messages --verbose --setting-sources user --allowedTools mcp__openclaw__* --disallowedTools ScheduleWakeup,CronCreate,Bash(run_in_background:true),Monitor` |
| `output`              | `jsonl`                                                                                                                                                                                                       |
| `input`               | `stdin`                                                                                                                                                                                                      |
| `modelArg`            | `--model`                                                                                                                                                                                                     |
| `sessionArgs`         | `["--session-id", "{sessionId}"]`                                                                                                                                                                             |
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

- The default `stream-json` parser reads assistant `message` events, tool events, final `result` usage, and fatal Gemini error events.
- Usage falls back to `stats` when `usage` is absent or empty; `stats.cached` normalizes into OpenClaw `cacheRead`, and if `stats.input` is missing, input tokens derive from `stats.input_tokens - stats.cached`.

## Text transform overlays

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

Restricted runs such as cron jobs with `toolsAllow` require an exact
backend-owned translation. The bundled `claude-cli` backend disables Claude's
native tools and user, project, and local customizations, including hooks,
plugins, agents, skills, and `CLAUDE.md`. It then exposes every allowed
OpenClaw tool through the grant-scoped MCP server. This keeps filesystem,
process, exec, approval, and sandbox policy inside OpenClaw instead of widening
authority to Claude's native tools or customization processes. The same MCP
list is enforced in Claude's generated config and again by the Gateway on tool
listing and execution. Before minting the grant, core rejects backend
translations that name any MCP permission outside the original allowlist.
Backends without an exact translation still fail closed.

If no MCP servers are enabled, OpenClaw still injects a strict config when a backend opts into bundle MCP, so background runs stay isolated.

Session-scoped bundled MCP runtimes are cached for reuse within a session, then reaped after 10 minutes of idle time. One-shot embedded runs such as auth probes, slug generation, and active-memory recall request cleanup at run end so stdio children and Streamable HTTP/SSE streams do not outlive the run.

For `claude-cli`, a compatible selected or ordered OpenClaw OAuth/token profile
is forwarded to that Claude child. This makes per-agent profiles authoritative
for the turn while preserving Claude's native host login when no compatible
profile exists.

## 重设历史上限

当一个新的 CLI 会话从先前的 OpenClaw 转录中种子化时（例如在 `session_expired` 重试之后），渲染的 `<conversation_history>` 块会被限制，以防重设提示词膨胀。默认值为 12,288 个字符（约 3,000 个 token）。

Claude CLI backends scale this cap with the resolved Claude context window instead: larger context windows get a larger prior-history slice, up to a fixed ceiling; other CLI backends keep the conservative default. This cap only governs the reseed prompt's prior-history block.

## 限制

- OpenClaw does not inject tool calls into the CLI backend protocol. Backends only see gateway tools when they opt into `bundleMcp: true`.
- Streaming is backend-specific: some backends stream JSONL, others buffer until exit.
- Structured outputs depend on the CLI's own JSON format.

## 故障排除

| Symptom               | Fix                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| CLI not found         | Put the CLI on the gateway service's `PATH`, or update the owning plugin's registered command. |
| Wrong model name      | Update the plugin's `modelAliases` mapping.                                                    |
| No session continuity | Check the plugin's `sessionArgs` and `sessionMode`.                                            |
| Images ignored        | Check the plugin's `imageArg` and the CLI's file-path support.                                 |

## 相关

- [网关运行手册](/gateway)
- [本地模型](/gateway/local-models)
