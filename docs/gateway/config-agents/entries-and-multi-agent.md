---
summary: "agents.entries 覆盖、多代理绑定、绑定匹配字段和访问配置文件"
read_when:
  - "覆盖一个代理的默认值"
  - "将渠道或帐户路由至特定代理"
  - "编写每个代理工具和沙箱访问配置文件"
title: "配置 — 每个代理条目和多代理路由"
---

每个代理在 `agents.entries` 和 `multiAgent` 绑定下覆盖，决定哪个代理应答消息。

<a id="agentsentries-per-agent-overrides" />

## <a id="agents.entries-(per-agent-overrides)"></a><a id="agents-entries-per-agent-overrides"></a> `agents.entries`（每个代理覆盖）

使用 `agents.entries.*.tts` 为代理指定其自己的 TTS 提供商、语音、模型、 风格或自动 TTS 模式。代理配置块会与全局 `tts` 进行深度合并，因此共享凭据可以集中放置，而各个代理只需覆盖所需的语音或提供商字段。当前代理的覆盖设置会应用于自动语音回复、`/tts audio`、`/tts status` 以及 `tts` 代理工具。有关提供商示例和优先级，请参阅[文本转语音](/tools/tts#per-agent-voice-overrides)。

```json5
{
  agents: {
    entries: {
      main: {
        name: "Main Agent",
        workspace: "~/.openclaw/workspace",
        agentDir: "~/.openclaw/agents/main/agent",
        model: "anthropic/claude-opus-4-6", // or { primary, fallbacks }
        utilityModel: "openai/gpt-5.4-mini",
        thinkingDefault: "high", // per-agent thinking level override
        reasoningDefault: "on", // per-agent reasoning visibility override
        fastModeDefault: false, // per-agent fast mode override
        params: { cacheRetention: "none" }, // overrides matching defaults.models params by key
        tts: {
          providers: {
            elevenlabs: { speakerVoiceId: "EXAVITQu4vr4xnSDxMaL" },
          },
        },
        skills: ["docs-search"], // replaces agents.defaults.skills when set
        identity: {
          name: "Samantha",
          theme: "helpful sloth",
          emoji: "🦥",
          avatar: "avatars/samantha.png",
        },
        groupChat: { mentionPatterns: ["@openclaw"] },
        sandbox: { mode: "off" },
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent", // persistent | oneshot
            cwd: "/workspace/openclaw",
          },
        },
        subagents: { allowAgents: ["*"] },
        tools: {
          profile: "coding",
          allow: ["browser"],
          deny: ["canvas"],
          elevated: { enabled: true },
        },
      },
    },
  },
}
```

- `agents.entries` 对象密钥是稳定代理 ID。
- `cwd`：用​​于回复运行的可选工作目录，与 `workspace` 分开。覆盖 `agents.defaults.cwd`；有关优先级和沙箱限制，请参阅 [ 工作目录](/gateway/config-agents/workspace-and-bootstrap#agents.defaults.cwd)。
- `default` 已退役。恰好一个配置的代理隐式解析；多代理操作需要绑定、表面 `agentId` 目标、范围 session/store 所有者或显式 `--agent`/request 字段。
- `model`：字符串形式会为代理设置严格的主模型，不使用模型回退；对象形式的 `{ primary }` 同样严格，除非添加 `fallbacks`。使用 `{ primary, fallbacks: [...] }` 可让该代理启用回退，或使用 `{ primary, fallbacks: [] }` 明确指定严格行为。只覆盖 `primary` 的 Cron 作业仍会继承默认回退，除非设置 `fallbacks: []`。
- `utilityModel`：可选的代理级覆盖项，用于生成会话标题和线程标题等简短内部任务。会回退到 `agents.defaults.utilityModel`，然后回退到当前有效会话提供程序声明的小模型默认值。控制面板标题会使用当前有效的常规会话模型重试一次。空字符串会跳过该代理的备用实用模型路径，但不会禁用控制面板标题生成。
- `params`：代理范围的流参数合并到共享的和代理特定的每个模型参数上。将此用于应适用于代理模型的覆盖，例如 `cacheRetention`、`temperature` 或 `maxTokens`。
- `tts`：可选的代理级文本转语音覆盖项。该配置块会与 `tts` 深度合并，因此应将共享的提供程序凭据和回退策略保留在 `tts` 中，并仅在此处设置角色专用的值，例如提供程序、语音、模型、风格或自动模式。
- `skills`：可选的代理级技能允许列表。如果省略，代理会在设置时继承 `agents.defaults.skills`；显式列表会替换默认值而不是合并，`[]` 表示不使用任何技能。
- `thinkingDefault`：可选的每个代理默认思维级别 （`off | minimal | low | medium | high | xhigh | adaptive | max | ultra`）。当未设置每条消息或会话覆盖时，优先于代理特定和共享模型 `params.thinking` 设置和 `agents.defaults.thinkingDefault`。所选的 provider/model 配置文件控制哪些值有效；对于Google Gemini，`adaptive`保持提供商拥有的动态思维（`thinkingLevel`在Gemini 3/3.1上省略，`thinkingBudget: -1`在Gemini 2.5上省略）。参见[思维解析顺序](/tools/thinking#resolution-order)。
- `reasoningDefault`：可选的代理级默认 reasoning 可见性（`on | off | stream`）。当未设置每条消息或会话级 reasoning 覆盖时，会覆盖该代理的 `agents.defaults.reasoningDefault`。
- `fastModeDefault`：可选的代理级快速模式默认值（`"auto" | true | false`）。当未设置每条消息或会话级快速模式覆盖时，会覆盖该代理的 `agents.defaults.fastModeDefault`。
- `models`：可选的每个代理模型设置，由完整的 `provider/model` id 键入。使用 `models["provider/model"].params` 进行特定于模型的请求设置，使用 `models["provider/model"].agentRuntime` 进行运行时异常。 `models["provider/model"].codeMode` 接受 `true` 或 `false`，并优先于代理的 `tools.codeMode` 激活、共享模型覆盖和全局默认值。省略它来继承；它不影响 Codex 本机代码模式。
- `nativeRuntimeConsent`：设置期间记住的harness ID 的可选列表，例如 `["muse"]`。仅适用于该代理；它没有全局或默认继承。管理员选择记住的harness或与其创建聊天会自动使用完全访问权限并禁用可选沙箱。此促销使用与显式设置更改相同的权限更改生命周期，并在活动运行期间拒绝更改。非管理员客户端无法使用记住的同意来提高聊天权限；他们现有的限制仍然适用。强制沙箱和工作区边界仍然拒绝运行时。每轮都会检查当前列表、当前会话身份、完全访问权限、沙箱关闭以及是否存在工具白名单、禁用工具或群体收集。在本机调度之前会立即再次检查当前的实时配置，因此删除同意也会阻止依赖它的排队或准备工作。在 **记住的本机运行时权限** 下的“设置”中删除 ID，以便根据记住的同意对每个聊天撤销它。明确的 **继续此聊天** 同意保持不变。该字段是可加的并且不需要迁移。
- `runtime`：可选的代理级运行时描述符。当代理应默认使用 ACP harness 会话时，使用 `type: "acp"` 以及 `runtime.acp` 默认值（`agent`、`backend`、`mode`、`cwd`）。
- `identity.avatar`：相对于工作区的路径、`http(s)` URL 或 `data:` URI。
- 本地工作空间相关的 `identity.avatar` 图像文件仅限于 2 个 MB。不会根据本地文件大小限制检查 `http(s)` URL 和 `data:` URI。
- `identity` 派生默认值：`ackReaction` 来自 `emoji`，`mentionPatterns` 来自 `name`/`emoji`.
- `subagents.allowAgents`：显式 `sessions_spawn.agentId` 目标的已配置代理 ID 的白名单（`["*"]` = 任何已配置目标；默认值：仅限相同代理）。当应允许自我定位 `agentId` 调用时，请包含请求者 ID。代理配置被删除的过时条目将被 `sessions_spawn` 拒绝，并从 `agents_list` 中省略；运行 `openclaw doctor --fix` 来清理它们，或者添加一个最小的 `agents.entries.*` 条目（如果该目标在继承默认值时应保持可生成）。
- `tools.agentToAgent.send`：`sessions_send` 的可选传出目标代理 ID 或 `*` 模式。忽略保留全局策略和可见性检查； `[]` 拒绝普通的跨代理发送。匹配允许在狭窄的可见性下进行仅发送访问，而不授予历史记录、搜索、列表、状态或会话控制。全球智能体对智能体政策和沙箱限制仍然适用；同一代理和请求者拥有的子规则保持不变。请参阅 [ 仅发送配置](/gateway/config-tools/sessions-and-subagents#per-agent-send-only-access)。
- 沙箱继承保护：如果请求方会话处于沙箱中，`sessions_spawn` 会拒绝将以未沙箱方式运行的目标。
- `subagents.requireAgentId`：为 true 时，阻止省略 `agentId` 的 `sessions_spawn` 调用（强制显式配置文件选择；默认值：false）。
- `subagents.maxConcurrent`：每个即时 spawning/controller 会话的最大并发子代理运行数。默认：`8`；独立会话有独立预算。 Codex-native 子代理使用 Codex 的单独调度程序和限制。
- `subagents.maxChildrenPerAgent`：单个代理会话可以生成的活动子项的单独入场限制。默认值：`5`。
- `subagents.maxSpawnDepth`：子代理生成的最大嵌套深度（`1`-`5`）。默认：`5`；设置 `1` 使直接子节点离开。
- `subagents.archiveAfterMinutes`：已完成子代理状态被归档前的存留时间。默认值：`60`。

---

## <a id="multi-agent-routing"></a> 多代理路由

在一个网关内运行多个独立的代理。请参阅 [Multi-Agent](/concepts/multi-agent)。

```json5
{
  agents: {
    ownership: "explicit",
    defaults: { heartbeat: { agentId: "home" }, systemAgent: { agentId: "home" } },
    entries: {
      home: { workspace: "~/.openclaw/workspace-home" },
      work: { workspace: "~/.openclaw/workspace-work" },
    },
  },
  bindings: [
    { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
    { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },
  ],
  talk: { agentId: "home" },
}
```

### <a id="binding-match-fields"></a> 绑定匹配字段

- `type`（可选）：正常路由使用 `route`（缺省时默认为 route），持久化 ACP 会话绑定使用 `acp`。
- `match.channel`（必需）
- `match.accountId`（可选；`*` = 任意账户；省略 = 默认账户）
- `match.peer`（可选；`{ kind: direct|group|channel, id }`）
- `match.guildId` / `match.teamId`（可选；按渠道不同）
- `session`（可选；仅限路由绑定）：`{ dmScope, groupScope }` 覆盖匹配对等方的会话路由
- `acp`（可选；仅适用于 `type: "acp"`）：`{ mode, label, cwd, backend }`

**固定比赛顺序：**

1. `match.peer`
2. `match.guildId`
3. `match.teamId`
4. `match.accountId`（精确匹配，不含 peer/guild/team）
5. `match.accountId: "*"`（频道范围）
6. 单代理后备（仅当仅配置了一个代理时；没有匹配绑定的显式多代理队列拒绝请求）

在每个层级内，最先匹配的 `bindings` 条目获胜。

对于 `type: "acp"` 的条目，OpenClaw 会按精确会话身份（`match.channel` + account + `match.peer.id`）解析，不使用上面的路由绑定层级顺序。

### <a id="per-agent-access-profiles"></a> 每个代理的访问配置

<Accordion id="full-access-no-sandbox" title="完全访问（无沙箱）">

```json5
{
  agents: {
    entries: {
      personal: {
        workspace: "~/.openclaw/workspace-personal",
        sandbox: { mode: "off" },
      },
    },
  },
}
```

</Accordion>

<Accordion id="read-only-tools-workspace" title="只读工具+工作区">

```json5
{
  agents: {
    entries: {
      family: {
        workspace: "~/.openclaw/workspace-family",
        sandbox: { mode: "all", scope: "agent", workspaceAccess: "ro" },
        tools: {
          allow: [
            "read",
            "sessions_list",
            "sessions_history",
            "sessions_send",
            "sessions_spawn",
            "session_status",
          ],
          deny: ["write", "edit", "apply_patch", "exec", "process", "browser"],
        },
      },
    },
  },
}
```

</Accordion>

<Accordion id="no-filesystem-access-messaging-only" title="无文件系统访问权限（仅限消息传递）">

```json5
{
  agents: {
    entries: {
      public: {
        workspace: "~/.openclaw/workspace-public",
        sandbox: { mode: "all", scope: "agent", workspaceAccess: "none" },
        tools: {
          allow: [
            "sessions_list",
            "sessions_history",
            "sessions_send",
            "sessions_spawn",
            "session_status",
            "whatsapp",
            "telegram",
            "slack",
            "discord",
            "gateway",
          ],
          deny: [
            "read",
            "write",
            "edit",
            "apply_patch",
            "exec",
            "process",
            "browser",
            "canvas",
            "nodes",
            "cron",
            "gateway",
            "image",
          ],
        },
      },
    },
  },
}
```

</Accordion>

有关优先级详细信息，请参阅 [ 多代理沙箱和 Tools](/tools/multi-agent-sandbox-tools)。
