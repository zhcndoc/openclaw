---
summary: "网关配置参考：核心 OpenClaw 键、默认值以及到专用子系统参考文档的链接"
title: "配置参考"
read_when:
  - 你需要精确的字段级配置语义或默认值
  - 你正在验证 channel、model、gateway 或 tool 的配置块
---

Field-level reference for `~/.openclaw/openclaw.json`: keys, defaults, and links to deeper subsystem pages. For task-oriented setup guidance, see [Configuration](/gateway/configuration). Channel- and plugin-owned command catalogs and deep memory/QMD knobs live on their own pages, not here.

Config format is **JSON5** (comments + trailing commas allowed). All fields are optional; OpenClaw uses safe defaults when omitted.

Code truth beats this page:

- `openclaw config schema` prints the live JSON Schema used for validation and Control UI, with bundled/plugin/channel metadata merged in.
- Agents should call the `gateway` tool action `config.schema.lookup` for one exact path-scoped schema node before editing config.
- `pnpm config:docs:check` / `pnpm config:docs:gen` validate this doc's baseline hash against the current schema surface.

专门的深入参考：

- [Memory configuration reference](/reference/memory-config) for `agents.defaults.memorySearch.*`, `memory.qmd.*`, `memory.citations`, and dreaming config under `plugins.entries.memory-core.config.dreaming`.
- [Slash commands](/tools/slash-commands) for the current built-in + bundled command catalog.
- Owning channel/plugin pages for channel-specific command surfaces.

---

## Channels

Per-channel config keys live in [Configuration - channels](/gateway/config-channels): `channels.*` for Slack, Discord, Telegram, WhatsApp, Matrix, iMessage, and other bundled channels (auth, access control, multi-account, mention gating).

## Agent 默认值、多 Agent、会话和消息

See [Configuration - agents](/gateway/config-agents) for:

- `agents.defaults.*`（workspace、model、thinking、heartbeat、memory、media、skills、sandbox）
- `multiAgent.*`（多 agent 路由和绑定）
- `session.*`（会话生命周期、压缩、修剪）
- `messages.*`（消息投递、TTS、markdown 渲染）
- `talk.*`（Talk 模式）
  - `talk.consultThinkingLevel`：用于 Control UI Talk 实时咨询背后完整 OpenClaw agent 运行的 thinking level 覆盖
  - `talk.consultFastMode`：用于 Control UI Talk 实时咨询的一次性 fast-mode 覆盖
  - `talk.speechLocale`：用于 iOS/macOS 上 Talk 语音识别的可选 BCP 47 locale id
  - `talk.silenceTimeoutMs`：未设置时，Talk 会在发送转录前保持平台默认的暂停窗口（macOS 和 Android 为 `700 ms`，iOS 为 `900 ms`）
  - `talk.realtime.consultRouting`：对于跳过 `openclaw_agent_consult` 的已完成实时 Talk 转录，Gateway relay 回退路径

## 工具和自定义 provider

Tool policy, experimental toggles, provider-backed tool config, and custom
provider / base-URL setup live in
[Configuration - tools and custom providers](/gateway/config-tools).

## 模型

provider 定义、model allowlist，以及自定义 provider 设置位于
[Configuration - tools and custom providers](/gateway/config-tools#custom-providers-and-base-urls)。
`models` 根节点也负责全局 model catalog 行为。

```json5
{
  models: {
    // 可选。默认值：true。更改后需要重启 Gateway。
    pricing: { enabled: false },
  },
}
```

- `models.mode`：provider catalog 行为（`merge` 或 `replace`）。
- `models.providers`：以 provider id 为键的自定义 provider 映射。
- `models.providers.*.localService`：本地 model server 的可选按需进程管理器。OpenClaw 会探测所配置的健康检查端点，需要时启动绝对路径的 `command`，等待就绪，然后发送 model 请求。参见 [Local model services](/gateway/local-model-services)。
- `models.pricing.enabled`：控制在 sidecar 和 channels 到达 Gateway ready 路径后启动的后台定价引导流程。设为 `false` 时，Gateway 会跳过 OpenRouter 和 LiteLLM 的 pricing-catalog 获取；已配置的 `models.providers.*.models[].cost` 值仍可用于本地成本估算。

## MCP

OpenClaw 管理的 MCP server 定义位于 `mcp.servers` 下，并被嵌入式 OpenClaw 以及其他运行时适配器消费。`openclaw mcp list`、
`show`、`set` 和 `unset` 命令可在配置编辑期间管理该块，而无需连接到
目标 server。

```json5
{
  mcp: {
    // 可选。默认值：600000 ms（10 分钟）。设为 0 可禁用空闲驱逐。
    sessionIdleTtlMs: 600000,
    servers: {
      docs: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-fetch"],
      },
      remote: {
        url: "https://example.com/mcp",
        transport: "streamable-http", // streamable-http | sse
        timeout: 20,
        connectTimeout: 5,
        supportsParallelToolCalls: true,
        headers: {
          Authorization: "Bearer ${MCP_REMOTE_TOKEN}",
        },
        auth: "oauth",
        oauth: {
          scope: "docs.read",
        },
        sslVerify: true,
        clientCert: "/path/to/client.crt",
        clientKey: "/path/to/client.key",
        toolFilter: {
          include: ["search_*"],
          exclude: ["admin_*"],
        },
        // 可选 Codex app-server 投影控制。
        codex: {
          agents: ["main"],
          defaultToolsApprovalMode: "approve", // auto | prompt | approve
        },
      },
    },
  },
}
```

- `mcp.servers`：为暴露已配置 MCP 工具的运行时提供命名的 stdio 或远程 MCP server 定义。
  远程条目使用 `transport: "streamable-http"` 或 `transport: "sse"`；
  `type: "http"` 是 CLI 原生别名，`openclaw mcp set` 和
  `openclaw doctor --fix` 会将其规范化为 canonical `transport` 字段。
- `mcp.servers.<name>.enabled`：设为 `false` 可保留已保存的 server 定义，
  但将其排除在嵌入式 OpenClaw MCP 发现和工具投影之外。
- `mcp.servers.<name>.timeout` / `requestTimeoutMs`：每个 server 的 MCP 请求
  超时，单位为秒或毫秒。
- `mcp.servers.<name>.connectTimeout` / `connectionTimeoutMs`：每个 server 的
  连接超时，单位为秒或毫秒。
- `mcp.servers.<name>.supportsParallelToolCalls`：可选的并发提示，
  供可选择是否并行发起 MCP 工具调用的适配器使用。
- `mcp.servers.<name>.auth`：对于需要 OAuth 的 HTTP MCP server，设为 `"oauth"`。
  运行 `openclaw mcp login <name>` 将 token 存储在 OpenClaw 状态中。
- `mcp.servers.<name>.oauth`：可选的 OAuth scope、重定向 URL 和客户端
  metadata URL 覆盖。
- `mcp.servers.<name>.sslVerify`、`clientCert`、`clientKey`：用于私有端点和
  双向 TLS 的 HTTP TLS 控制。
- `mcp.servers.<name>.toolFilter`：可选的按 server 工具选择。`include`
  将发现到的 MCP 工具限制为匹配的名称；`exclude` 隐藏匹配的名称。
  条目可以是精确的 MCP 工具名或简单的 `*` glob。带有 resources 或 prompts 的
  server 还会生成实用工具名（`resources_list`、`resources_read`、`prompts_list`、
  `prompts_get`），这些名称也使用相同的过滤器。
- `mcp.servers.<name>.codex`：可选的 Codex app-server 投影控制。
  该块仅用于 Codex app-server 线程的 OpenClaw 元数据；它不会影响 ACP 会话、
  通用 Codex harness 配置或其他运行时适配器。
  非空的 `codex.agents` 会将 server 限制为所列的 OpenClaw agent id。
  空、空白或无效的作用域 agent 列表会在 config validation 中被拒绝，
  并在运行时投影路径中被省略，而不是变成全局配置。
  `codex.defaultToolsApprovalMode` 会为该 server 输出 Codex 原生的
  `default_tools_approval_mode`。OpenClaw 在将原生 `mcp_servers` 配置传给 Codex 前会去掉 `codex`
  块。若省略该块，则该 server 会以 Codex 默认的 MCP 审批行为投影给每个 Codex app-server agent。
- `mcp.sessionIdleTtlMs`：会话作用域捆绑 MCP runtime 的空闲 TTL。
  一次性嵌入式运行会请求 run-end 清理；该 TTL 是长生命周期会话和未来调用者的兜底。
- `mcp.*` 下的更改会通过释放缓存的会话 MCP runtime 立即热应用。
  下一次工具发现/使用会从新配置重新创建它们，因此移除的 `mcp.servers` 条目会立即被回收，而不是等待空闲 TTL。
- 运行时发现也会通过丢弃该会话的缓存 catalog 来响应 MCP 工具列表变更通知。
  声明 resources 或 prompts 的 server 会获得用于列出/读取 resources 以及列出/获取 prompts 的实用工具。
  重复的工具调用失败会在再次尝试前短暂暂停受影响的 server。

有关运行时行为，请参见 [MCP](/cli/mcp#openclaw-as-an-mcp-client-registry) 和
[CLI backends](/gateway/cli-backends#bundle-mcp-overlays)。

## 技能

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
    },
    install: {
      preferBrew: true,
      nodeManager: "npm", // npm | pnpm | yarn | bun
      allowUploadedArchives: false,
    },
    workshop: {
      allowSymlinkTargetWrites: false,
    },
    entries: {
      "image-lab": {
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // 或明文字符串
        env: { GEMINI_API_KEY: "GEMINI_KEY_HERE" },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

- `allowBundled`: optional allowlist for bundled skills only (managed/workspace skills unaffected).
- `load.extraDirs`: extra shared skill roots (lowest precedence).
- `load.allowSymlinkTargets`: trusted real target roots that skill symlinks may
  resolve into when the link lives outside its configured source root.
- `workshop.allowSymlinkTargetWrites`: allows Skill Workshop apply to write
  through already-trusted symlink targets (default: false).
- `install.preferBrew`: when true, prefer Homebrew installers when `brew` is
  available before falling back to other installer kinds.
- `install.nodeManager`: node installer preference for `metadata.openclaw.install`
  specs (`npm` | `pnpm` | `yarn` | `bun`).
- `install.allowUploadedArchives`: allow trusted `operator.admin` Gateway
  clients to install private zip archives staged through `skills.upload.*`
  (default: false). This only enables the uploaded-archive path; normal ClawHub
  installs do not require it.
- `entries.<skillKey>.enabled: false` disables a skill even if bundled/installed.
- `entries.<skillKey>.apiKey`: convenience for skills declaring a primary env var (plaintext string or SecretRef object).
- `limits.maxCandidatesPerRoot`, `limits.maxSkillsLoadedPerSource`, `limits.maxSkillsInPrompt`, `limits.maxSkillsPromptChars`, `limits.maxSkillFileBytes`: bound skill discovery and the model-facing skills prompt.
- Skill Workshop autonomy/approval settings (`workshop.autonomous.enabled`, `workshop.approvalPolicy`, `workshop.maxPending`, `workshop.maxSkillBytes`) are documented in [Skills configuration](/tools/skills-config).

---

## 插件

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: [],
    load: {
      paths: ["~/Projects/oss/voice-call-plugin"],
    },
    entries: {
      "voice-call": {
        enabled: true,
        hooks: {
          allowPromptInjection: false,
        },
        config: { provider: "twilio" },
      },
    },
  },
}
```

- 从 `~/.openclaw/extensions` 和 `<workspace>/.openclaw/extensions` 下的 package 或 bundle 目录加载，并加载 `plugins.load.paths` 中列出的文件或目录。
- 将独立插件文件放在 `plugins.load.paths` 中；自动发现的扩展根目录会忽略顶层 `.js`、`.mjs` 和 `.ts` 文件，因此这些根目录中的辅助脚本不会阻止启动。
- 发现过程接受原生 OpenClaw 插件以及兼容的 Codex bundle 和 Claude bundle，包括无 manifest 的 Claude 默认布局 bundle。
- **配置更改需要重启 gateway。**
- `allow`：可选 allowlist（仅加载列出的插件）。`deny` 优先。
- `plugins.entries.<id>.apiKey`：插件级 API key 便捷字段（当插件支持时）。
- `plugins.entries.<id>.env`：插件作用域的环境变量映射。
- `plugins.entries.<id>.hooks.allowPromptInjection`：为 `false` 时，核心会阻止 `before_prompt_build`，并忽略来自旧版 `before_agent_start` 的 prompt 变更字段，同时保留旧版 `modelOverride` 和 `providerOverride`。适用于原生插件 hooks 和受支持的 bundle 提供的 hook 目录。
- `plugins.entries.<id>.hooks.allowConversationAccess`：为 `true` 时，受信任的非捆绑插件可通过类型化 hooks 读取原始对话内容，例如 `llm_input`、`llm_output`、`before_model_resolve`、`before_agent_reply`、`before_agent_run`、`before_agent_finalize` 和 `agent_end`。
- `plugins.entries.<id>.subagent.allowModelOverride`：显式信任该插件可为后台 subagent 运行请求按次运行的 `provider` 和 `model` 覆盖。
- `plugins.entries.<id>.subagent.allowedModels`：受信任 subagent 覆盖可用的 canonical `provider/model` 目标的可选 allowlist。只有在你有意允许任意 model 时才使用 `"*"`。
- `plugins.entries.<id>.llm.allowModelOverride`：显式信任该插件可为 `api.runtime.llm.complete` 请求 model 覆盖。
- `plugins.entries.<id>.llm.allowedModels`：受信任插件 LLM completion 覆盖可用的 canonical `provider/model` 目标的可选 allowlist。只有在你有意允许任意 model 时才使用 `"*"`。
- `plugins.entries.<id>.llm.allowAgentIdOverride`：显式信任该插件可让 `api.runtime.llm.complete` 针对非默认 agent id 运行。
- `plugins.entries.<id>.config`：插件定义的配置对象（在可用时由原生 OpenClaw plugin schema 校验）。
- channel plugin 账号/runtime 设置位于 `channels.<id>` 下，应由所属插件的 manifest `channelConfigs` 元数据描述，而不是由中央 OpenClaw 选项注册表描述。

### Codex harness 插件配置

捆绑的 `codex` plugin 在 `plugins.entries.codex.config` 下拥有原生 Codex app-server harness 设置。完整配置范围请参见 [Codex harness reference](/plugins/codex-harness-reference)，运行时模型请参见 [Codex harness](/plugins/codex-harness)。

`codexPlugins` 仅适用于选择原生 Codex harness 的会话。
它不会为 OpenClaw provider 运行、ACP
conversation bindings 或任何非 Codex harness 启用 Codex plugins。

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            allow_all_plugins: true,
            allow_destructive_actions: "auto",
            plugins: {
              "google-calendar": {
                enabled: true,
                marketplaceName: "openai-curated",
                pluginName: "google-calendar",
                allow_destructive_actions: false,
              },
            },
          },
        },
      },
    },
  },
}
```

- `plugins.entries.codex.config.codexPlugins.enabled`: enables native Codex
  plugin/app support for the Codex harness. Default: `false`.
- `plugins.entries.codex.config.codexPlugins.allow_all_plugins`: exposes every
  currently accessible app connected to the authenticated Codex account in
  each new native Codex thread. Default: `false`.
- `plugins.entries.codex.config.codexPlugins.allow_destructive_actions`:
  default destructive-action policy for configured plugin app elicitations.
  Use `true` to accept safe Codex approval schemas without prompting, `false`
  to decline them, `"auto"` to route Codex-required approvals through OpenClaw
  plugin approvals, or `"ask"` to prompt for every plugin write/destructive
  action without durable approval. The `"ask"` mode clears durable Codex
  per-tool approval overrides for the affected app and selects the human
  approvals reviewer for that app before the Codex thread starts.
  Default: `true`.
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.enabled`: enables a
  configured plugin entry when global `codexPlugins.enabled` is also true.
  Default: `true` for explicit entries.
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.marketplaceName`:
  stable marketplace identity, required with `pluginName` for every resolved
  entry. Supports `"openai-curated"` and `"workspace-directory"`. Entries
  missing either identity field are ignored.
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.pluginName`: stable
  Codex plugin identity, required with `marketplaceName`. A
  `workspace-directory` entry must use the exact marketplace-qualified
  `summary.id` returned by `plugin/list`, for example
  `"example-plugin@workspace-directory"`.
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.allow_destructive_actions`:
  per-plugin destructive-action override. When omitted, the global
  `allow_destructive_actions` value is used. The per-plugin value accepts the
  same `true`, `false`, `"auto"`, or `"ask"` policies.

Each admitted plugin app that uses `"ask"` routes that app's approval requests
to the human reviewer. Other apps and non-app thread approvals keep their
configured reviewer, so mixed plugin policies do not inherit `"ask"` behavior.

`codexPlugins.enabled` is the global enablement directive. Explicit plugin
entries written by migration are the durable curated install and repair
eligibility set. Manually configured `workspace-directory` entries must already
be installed and enabled, and their owned apps must be accessible; OpenClaw
does not install or authenticate them. If Codex rejects the explicit workspace
catalog request, enabled workspace entries fail closed with
`marketplace_missing` while curated entries from the default catalog remain
available. `plugins["*"]` is not supported, there is no `install` switch, and
local `marketplacePath` values are intentionally not config fields because they
are host-specific. See
[Native Codex plugins](/plugins/codex-native-plugins) for app-server version and
readiness requirements.

`app/list` 就绪性检查会缓存一小时，并在过期时异步刷新。Codex thread app 配置在 Codex harness
session 建立时计算，而不是每一轮都计算；在更改原生 plugin 配置后，请使用 `/new`、`/reset` 或重启 gateway。

`codexPlugins.allow_all_plugins` snapshots every currently accessible account
app into each new native Codex thread. It does not install plugins or apps, and
inaccessible apps stay excluded. Account apps use the global
`codexPlugins.allow_destructive_actions` policy. Explicit plugin entries take
precedence when the same app is present in both paths. If `app/list` cannot be
read, account-wide exposure fails closed.

- `plugins.entries.firecrawl.config.webFetch`: Firecrawl web-fetch provider settings.
  - `apiKey`: Optional Firecrawl API key for higher limits (accepts SecretRef). Falls back to `plugins.entries.firecrawl.config.webSearch.apiKey`, legacy `tools.web.fetch.firecrawl.apiKey`, or `FIRECRAWL_API_KEY` env var.
  - `baseUrl`: Firecrawl API base URL (default: `https://api.firecrawl.dev`; self-hosted overrides must target private/internal endpoints).
  - `onlyMainContent`: extract only the main content from pages (default: `true`).
  - `maxAgeMs`: maximum cache age in milliseconds (default: `172800000` / 2 days).
  - `timeoutSeconds`: scrape request timeout in seconds (default: `60`).
- `plugins.entries.xai.config.xSearch`: xAI X Search (Grok web search) settings.
  - `enabled`: enable the X Search provider.
  - `model`: Grok model to use for search (e.g. `"grok-4.3"`).
- `plugins.entries.memory-core.config.dreaming`: memory dreaming settings. See [Dreaming](/concepts/dreaming) for phases and thresholds.
  - `enabled`: master dreaming switch (default `false`).
  - `frequency`: cron cadence for each full dreaming sweep (`"0 3 * * *"` by default).
  - `model`: optional Dream Diary subagent model override. Requires `plugins.entries.memory-core.subagent.allowModelOverride: true`; pair with `allowedModels` to restrict targets. Model-unavailable errors retry once with the session default model; trust or allowlist failures do not fall back silently.
  - phase policy and thresholds are implementation details (not user-facing config keys).
- Full memory config lives in [Memory configuration reference](/reference/memory-config):
  - `agents.defaults.memorySearch.*`
  - `memory.backend`
  - `memory.citations`
  - `memory.qmd.*`
  - `plugins.entries.memory-core.config.dreaming`
- 已启用的 Claude bundle 插件也可以通过 `settings.json` 提供嵌入式 OpenClaw 默认值；OpenClaw 会将这些默认值作为已清理的 agent 设置应用，而不是作为原始 OpenClaw 配置补丁。
- `plugins.slots.memory`：选择当前活跃的 memory plugin id，或使用 `"none"` 以禁用 memory plugins。
- `plugins.slots.contextEngine`：选择当前活跃的 context engine plugin id；默认值为 `"legacy"`，除非你安装并选择了其他 engine。

参见 [Plugins](/tools/plugin)。

---

## 承诺

`commitments` 控制推断式后续记忆：OpenClaw 可以从对话轮次中检测 check-in，并通过 heartbeat 运行传递它们。

- `commitments.enabled`：启用隐藏的 LLM 提取、存储以及推断式后续 commitments 的 heartbeat 传递。默认：`false`。
- `commitments.maxPerDay`：每个 agent session 在滚动一天内最多传递的推断式后续 commitments 数量。默认：`3`。

参见 [推断式承诺](/concepts/commitments)。

---

## 浏览器

```json5
{
  browser: {
    enabled: true,
    evaluateEnabled: true,
    defaultProfile: "user",
    ssrfPolicy: {
      // dangerouslyAllowPrivateNetwork: true, // 仅在受信任的私有网络访问场景中启用
      // allowPrivateNetwork: true, // 旧版别名
      // hostnameAllowlist: ["*.example.com", "example.com"],
      // allowedHostnames: ["localhost"],
    },
    tabCleanup: {
      enabled: true,
      idleMinutes: 120,
      maxTabsPerSession: 8,
      sweepMinutes: 5,
    },
    profiles: {
      openclaw: { cdpPort: 18800, color: "#FF4500" },
      work: {
        cdpPort: 18801,
        color: "#0066CC",
        executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      },
      user: { driver: "existing-session", attachOnly: true, color: "#00AA00" },
      brave: {
        driver: "existing-session",
        attachOnly: true,
        userDataDir: "~/Library/Application Support/BraveSoftware/Brave-Browser",
        color: "#FB542B",
      },
      remote: { cdpUrl: "http://10.0.0.42:9222", color: "#00AA00" },
    },
    color: "#FF4500",
    // headless: false,
    // noSandbox: false,
    // extraArgs: [],
    // executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    // attachOnly: false,
  },
}
```

- `evaluateEnabled: false` disables `act:evaluate` and `wait --fn`.
- `tabCleanup` reclaims tracked primary-agent tabs after idle time or when a
  session exceeds its cap. Set `idleMinutes: 0` or `maxTabsPerSession: 0` to
  disable those individual cleanup modes.
- `ssrfPolicy.dangerouslyAllowPrivateNetwork` is disabled when unset, so browser navigation stays strict by default.
- Set `ssrfPolicy.dangerouslyAllowPrivateNetwork: true` only when you intentionally trust private-network browser navigation.
- In strict mode, remote CDP profile endpoints (`profiles.*.cdpUrl`) are subject to the same private-network blocking during reachability/discovery checks.
- `ssrfPolicy.allowPrivateNetwork` remains supported as a legacy alias.
- In strict mode, use `ssrfPolicy.hostnameAllowlist` and `ssrfPolicy.allowedHostnames` for explicit exceptions.
- Remote profiles are attach-only (start/stop/reset disabled).
- `profiles.*.cdpUrl` accepts `http://`, `https://`, `ws://`, and `wss://`.
  Use HTTP(S) when you want OpenClaw to discover `/json/version`; use WS(S)
  when your provider gives you a direct DevTools WebSocket URL.
- `remoteCdpTimeoutMs` and `remoteCdpHandshakeTimeoutMs` apply to remote and
  `attachOnly` CDP reachability plus tab-opening requests. Managed loopback
  profiles keep local CDP defaults. Persistent remote Playwright tab
  enumeration uses the larger value as its operation deadline.
- If an externally managed CDP service is reachable through loopback, set that
  profile's `attachOnly: true`; otherwise OpenClaw treats the loopback port as a
  local managed browser profile and may report local port ownership errors.
- `existing-session` profiles use Chrome MCP instead of CDP and can attach on
  the selected host or through a connected browser node.
- `existing-session` profiles can set `userDataDir` to target a specific
  Chromium-based browser profile such as Brave or Edge.
- `existing-session` profiles can set `cdpUrl` when Chrome is already running
  behind a DevTools HTTP(S) discovery endpoint or direct WS(S) endpoint. In that
  mode OpenClaw passes the endpoint to Chrome MCP instead of using auto-connect;
  `userDataDir` is ignored for Chrome MCP launch arguments.
- `existing-session` profiles keep the current Chrome MCP route limits:
  snapshot/ref-driven actions instead of CSS-selector targeting, one-file upload
  hooks, no dialog timeout overrides, no `wait --load networkidle`, and no
  `responsebody`, PDF export, download interception, or batch actions.
- Local managed `openclaw` profiles auto-assign `cdpPort` and `cdpUrl`; set
  `cdpUrl` explicitly only for remote CDP profiles or existing-session endpoint
  attach.
- Local managed profiles can set `executablePath` to override the global
  `browser.executablePath` for that profile. Use this to run one profile in
  Chrome and another in Brave.
- Local managed profiles use `browser.localLaunchTimeoutMs` for Chrome CDP HTTP
  discovery after process start and `browser.localCdpReadyTimeoutMs` for
  post-launch CDP websocket readiness. Raise them on slower hosts where Chrome
  starts successfully but readiness checks race startup. Both values must be
  positive integers up to `120000` ms; invalid config values are rejected.
- Auto-detect order: default browser if Chromium-based → Chrome → Brave → Edge → Chromium → Chrome Canary.
- `browser.executablePath` and `browser.profiles.<name>.executablePath` both
  accept `~` and `~/...` for your OS home directory before Chromium launch.
  Per-profile `userDataDir` on `existing-session` profiles is also tilde-expanded.
- Control service: loopback only (port derived from `gateway.port`, default `18791`).
- `extraArgs` appends extra launch flags to local Chromium startup (for example
  `--disable-gpu`, window sizing, or debug flags).

---

## UI

```json5
{
  ui: {
    seamColor: "#FF4500",
    assistant: {
      name: "OpenClaw",
      avatar: "CB", // 表情符号、短文本、图片 URL 或数据 URI
    },
  },
}
```

- `seamColor`：本地应用 UI 装饰的强调色（如 Talk Mode 气泡色调等）。
- `assistant`：控制 UI 身份覆盖。回退到当前活跃代理身份。

---

## 网关

```json5
{
  gateway: {
    mode: "local", // 本地 | 远程
    port: 18789,
    bind: "loopback",
    auth: {
      mode: "token", // 无 | 令牌 | 密码 | 可信代理
      token: "your-token",
      // password: "your-password", // 或 OPENCLAW_GATEWAY_PASSWORD
      // trustedProxy: { userHeader: "x-forwarded-user" }, // 适用于 mode=trusted-proxy；见 /gateway/trusted-proxy-auth
      allowTailscale: true,
      rateLimit: {
        maxAttempts: 10,
        windowMs: 60000,
        lockoutMs: 300000,
        exemptLoopback: true,
      },
    },
    tailscale: {
      mode: "off", // 关闭 | 提供服务 | 漏斗
      resetOnExit: false,
    },
    controlUi: {
      enabled: true,
      basePath: "/openclaw",
      // root: "dist/control-ui",
      // toolTitles: false, // opt-in AI purpose titles for tool calls (spends utility-model tokens)
      // embedSandbox: "scripts", // strict | scripts | trusted
      // allowExternalEmbedUrls: false, // dangerous: allow absolute external http(s) embed URLs
      // chatMessageMaxWidth: "min(1280px, 82%)", // optional centered chat transcript max-width
      // allowedOrigins: ["https://control.example.com"], // required for non-loopback Control UI
      // dangerouslyAllowHostHeaderOriginFallback: false, // dangerous Host-header origin fallback mode
      // allowInsecureAuth: false,
      // dangerouslyDisableDeviceAuth: false,
    },
    terminal: {
      enabled: false,
      // shell: "/bin/zsh",
    },
    remote: {
      url: "ws://127.0.0.1:18789",
      transport: "ssh", // ssh | direct
      token: "your-token",
      // password: "your-password",
    },
    trustedProxies: ["10.0.0.1"],
    // 可选。默认 false。
    allowRealIpFallback: false,
    nodes: {
      pairing: {
        // 可选。默认未设置/已禁用。
        autoApproveCidrs: ["192.168.1.0/24", "fd00:1234:5678::/64"],
        // SSH-verified auto-approval. Default: enabled (true).
        // Set false to disable SSH verification only; this does not affect
        // autoApproveCidrs above. For manual-only node pairing, set false AND
        // unset autoApproveCidrs. Pass an object to tune: { user, identity,
        // timeoutMs, cidrs }.
        sshVerify: true,
      },
      allowCommands: ["canvas.navigate"],
      denyCommands: ["system.run"],
    },
    tools: {
      // 额外的 /tools/invoke HTTP 拒绝项
      deny: ["browser"],
      // 从默认 HTTP 拒绝列表中移除工具，适用于 owner/admin 调用者
      allow: ["gateway"],
    },
    push: {
      apns: {
        relay: {
          baseUrl: "https://relay.example.com",
          timeoutMs: 10000,
        },
      },
    },
  },
}
```

<Accordion title="网关字段详情">

- `mode`: `local` (run gateway) or `remote` (connect to remote gateway). Gateway refuses to start unless `local`.
- `port`: single multiplexed port for WS + HTTP. Precedence: `--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`.
- `bind`: `auto`, `loopback` (default), `lan` (`0.0.0.0`), `tailnet` (Tailscale IPv4 when available, otherwise loopback), or `custom` (one IPv4 address). A resolved `tailnet` address and any `custom` address other than `127.0.0.1` or `0.0.0.0` require `127.0.0.1` on the same port for same-host clients; startup fails if either listener cannot bind. Non-loopback exposure remains limited to the selected interface.
- **Legacy bind aliases**: use bind mode values in `gateway.bind` (`auto`, `loopback`, `lan`, `tailnet`, `custom`), not host aliases (`0.0.0.0`, `127.0.0.1`, `localhost`, `::`, `::1`).
- **Docker note**: the default `loopback` bind listens on `127.0.0.1` inside the container. With Docker bridge networking (`-p 18789:18789`), traffic arrives on `eth0`, so the gateway is unreachable. Use `--network host`, or set `bind: "lan"` (or `bind: "custom"` with `customBindHost: "0.0.0.0"`) to listen on all interfaces.
- **Auth**: required by default. Non-loopback binds require gateway auth. In practice that means a shared token/password or an identity-aware reverse proxy with `gateway.auth.mode: "trusted-proxy"`. Onboarding wizard generates a token by default.
- If both `gateway.auth.token` and `gateway.auth.password` are configured (including SecretRefs), set `gateway.auth.mode` explicitly to `token` or `password`. Startup and service install/repair flows fail when both are configured and mode is unset.
- `gateway.auth.mode: "none"`: explicit no-auth mode. Use only for trusted local loopback setups; this is intentionally not offered by onboarding prompts.
- `gateway.auth.mode: "trusted-proxy"`: delegate browser/user auth to an identity-aware reverse proxy and trust identity headers from `gateway.trustedProxies` (see [Trusted Proxy Auth](/gateway/trusted-proxy-auth)). This mode expects a **non-loopback** proxy source by default; same-host loopback reverse proxies require explicit `gateway.auth.trustedProxy.allowLoopback = true`. Internal same-host callers can use `gateway.auth.password` as a local direct fallback; `gateway.auth.token` remains mutually exclusive with trusted-proxy mode.
- `gateway.auth.allowTailscale`: when `true`, Tailscale Serve identity headers can satisfy Control UI/WebSocket auth (verified via `tailscale whois`). HTTP API endpoints do **not** use that Tailscale header auth; they follow the gateway's normal HTTP auth mode instead. This tokenless flow assumes the gateway host is trusted. Defaults to `true` when `tailscale.mode = "serve"`.
- `gateway.auth.rateLimit`: optional failed-auth limiter. Applies per client IP and per auth scope (shared-secret and device-token are tracked independently). Blocked attempts return `429` + `Retry-After`.
  - On the async Tailscale Serve Control UI path, failed attempts for the same `{scope, clientIp}` are serialized before the failure write. Concurrent bad attempts from the same client can therefore trip the limiter on the second request instead of both racing through as plain mismatches.
  - `gateway.auth.rateLimit.exemptLoopback` defaults to `true`; set `false` when you intentionally want localhost traffic rate-limited too (for test setups or strict proxy deployments).
- Browser-origin WS auth attempts are always throttled with loopback exemption disabled (defense-in-depth against browser-based localhost brute force).
- On loopback, those browser-origin lockouts are isolated per normalized `Origin`
  value, so repeated failures from one localhost origin do not automatically
  lock out a different origin.
- `tailscale.mode`: `serve` (tailnet only, loopback bind) or `funnel` (public, requires auth).
- `tailscale.serviceName`: optional Tailscale Service name for Serve mode, such
  as `svc:openclaw`. When set, OpenClaw passes it to `tailscale serve
--service` so the Control UI can be exposed through a named Service instead
  of the device hostname. The value must use Tailscale's `svc:<dns-label>`
  Service name format; startup reports the derived Service URL.
- `tailscale.preserveFunnel`: when `true` and `tailscale.mode = "serve"`, OpenClaw
  checks `tailscale funnel status` before re-applying Serve at startup and skips
  it if an externally configured Funnel route already covers the gateway port.
  Default `false`.
- `controlUi.allowedOrigins`: explicit browser-origin allowlist for Gateway WebSocket connects. Required for public non-loopback browser origins. Private same-origin LAN/Tailnet UI loads from loopback, RFC1918/link-local, `.local`, `.ts.net`, or Tailscale CGNAT hosts are accepted without enabling Host-header fallback.
- `controlUi.toolTitles`: opt in to AI-generated purpose titles for tool calls in Control UI chat. Default: `false` (tool rendering stays fully deterministic with no background model calls). When enabled, the `chat.toolTitles` method labels complex calls through standard utility-model routing — the agent's `utilityModel` (an operator decision that may send bounded tool arguments to the chosen provider, like every utility task), or the session provider's declared small-model default (OpenAI → `gpt-5.6-luna`, Anthropic → `claude-haiku-4-5`) — and caches results in the per-agent state database so repeat views never re-bill. `utilityModel: \"\"` disables titles like every other utility task; titles never fall back to the primary model.
- `controlUi.chatMessageMaxWidth`: optional max-width for the centered Control UI chat transcript. Accepts constrained CSS width values such as `960px`, `82%`, `min(1280px, 82%)`, and `calc(100% - 2rem)`.
- `controlUi.dangerouslyAllowHostHeaderOriginFallback`: dangerous mode that enables Host-header origin fallback for deployments that intentionally rely on Host-header origin policy.
- `terminal.enabled`: opt in to the admin-scoped operator terminal. Default: `false`. The terminal starts a host PTY in the selected agent workspace, inherits the Gateway process environment, and is refused for agents with `sandbox.mode: "all"`. Enable it only for trusted operator deployments; changing it restarts the Gateway and updates the Control UI content security policy.
- `terminal.shell`: optional shell executable. When unset, OpenClaw uses `$SHELL` on Unix and `%ComSpec%` on Windows.
- `terminal.detachedSessionTimeoutSeconds`: how long a terminal session survives after its connection drops (page reload, laptop sleep), staying reattachable via `terminal.attach` with its recent output replayed. Default: `300`. Set `0` to kill sessions the moment their connection drops. Detached sessions keep running their commands, so shorten this on shared or exposed hosts.
- `remote.transport`: `ssh` (default) or `direct` (ws/wss). For `direct`, `remote.url` must be `wss://` for public hosts; plaintext `ws://` is accepted only for loopback, LAN, link-local, `.local`, `.ts.net`, and Tailscale CGNAT hosts.
- `remote.remotePort`: gateway port on the remote SSH host. Defaults to `18789`; use this when the local tunnel port differs from the remote gateway port.
- `remote.sshHostKeyPolicy`: macOS SSH tunnel host-key policy. `strict` is the default and requires an already trusted key. `openssh` is an explicit opt-in to the effective OpenSSH configuration for managed aliases; review matching user and system SSH settings before using it. The macOS app and `configure-remote` reset this policy to `strict` when changing targets unless explicitly opted in again.
- `gateway.remote.token` / `.password` are remote-client credential fields. They do not configure gateway auth by themselves.
- `gateway.push.apns.relay.baseUrl`: base HTTPS URL for the external APNs relay used after relay-backed iOS builds publish registrations to the gateway. Public App Store builds use the hosted OpenClaw relay. Custom relay URLs must match a deliberately separate iOS build/deployment path whose relay URL points at that relay.
- `gateway.push.apns.relay.timeoutMs`: gateway-to-relay send timeout in milliseconds. Defaults to `10000`.
- Relay-backed registrations are delegated to a specific gateway identity. The paired iOS app fetches `gateway.identity.get`, includes that identity in the relay registration, and forwards a registration-scoped send grant to the gateway. Another gateway cannot reuse that stored registration.
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS`: temporary env overrides for the relay config above.
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`: development-only escape hatch for loopback HTTP relay URLs. Production relay URLs should stay on HTTPS.
- `gateway.handshakeTimeoutMs`: pre-auth Gateway WebSocket handshake timeout in milliseconds. Default: `15000`. `OPENCLAW_HANDSHAKE_TIMEOUT_MS` takes precedence when set. Increase this on loaded or low-powered hosts where local clients can connect while startup warmup is still settling.
- `gateway.channelHealthCheckMinutes`: channel health-monitor interval in minutes. Set `0` to disable health-monitor restarts globally. Default: `5`.
- `gateway.channelStaleEventThresholdMinutes`: stale-socket threshold in minutes. Keep this greater than or equal to `gateway.channelHealthCheckMinutes`. Default: `30`.
- `gateway.channelMaxRestartsPerHour`: maximum health-monitor restarts per channel/account in a rolling hour. Default: `10`.
- `channels.<provider>.healthMonitor.enabled`: per-channel opt-out for health-monitor restarts while keeping the global monitor enabled.
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`: per-account override for multi-account channels. When set, it takes precedence over the channel-level override.
- Local gateway call paths can use `gateway.remote.*` as fallback only when `gateway.auth.*` is unset.
- If `gateway.auth.token` / `gateway.auth.password` is explicitly configured via SecretRef and unresolved, resolution fails closed (no remote fallback masking).
- `trustedProxies`: reverse proxy IPs that terminate TLS or inject forwarded-client headers. Only list proxies you control. Loopback entries are still valid for same-host proxy/local-detection setups (for example Tailscale Serve or a local reverse proxy), but they do **not** make loopback requests eligible for `gateway.auth.mode: "trusted-proxy"`.
- `allowRealIpFallback`: when `true`, the gateway accepts `X-Real-IP` if `X-Forwarded-For` is missing. Default `false` for fail-closed behavior.
- `gateway.nodes.pairing.autoApproveCidrs`: optional CIDR/IP allowlist for auto-approving first-time node device pairing with no requested scopes. It is disabled when unset. This does not auto-approve operator/browser/Control UI/WebChat pairing, and it does not auto-approve role, scope, metadata, or public-key upgrades.
- `gateway.nodes.pairing.sshVerify`: SSH-verified auto-approval for first-time node device pairing (default: enabled). The gateway SSHes back to the pairing host (BatchMode, strict host keys) and approves only on an exact `openclaw node identity` device-key match. Same eligibility floor as `autoApproveCidrs`; probes are limited to private/CGNAT source addresses unless `cidrs` overrides them. Set `false` to disable, or `{ user, identity, timeoutMs, cidrs }` to tune. See [Node pairing](/gateway/pairing#ssh-verified-device-auto-approval-default).
- `gateway.nodes.allowCommands` / `gateway.nodes.denyCommands`: global allow/deny shaping for declared node commands after pairing and platform allowlist evaluation. Use `allowCommands` to opt into dangerous node commands such as `camera.snap`, `camera.clip`, `screen.record`, `health.summary`, `sms.search`, and `sms.send`; `denyCommands` removes a command even if a platform default or explicit allow would otherwise include it. iOS Health permission, Android SMS permission, and Gateway command authorization are independent. After a node changes its declared command list, reject and re-approve that device pairing so the gateway stores the updated command snapshot.
- `gateway.tools.deny`: extra tool names blocked for HTTP `POST /tools/invoke` (extends default deny list).
- `gateway.tools.allow`: remove tool names from the default HTTP deny list for
  owner/admin callers. This does not upgrade identity-bearing `operator.write`
  callers into owner/admin access; `cron`, `gateway`, and `nodes` remain
  unavailable to non-owner callers even when allowlisted.

</Accordion>

### OpenAI 兼容端点

- 管理员 HTTP RPC：默认作为 `admin-http-rpc` 插件关闭。启用该插件以注册 `POST /api/v1/admin/rpc`。参见 [管理员 HTTP RPC](/plugins/admin-http-rpc)。
- Chat Completions：默认禁用。使用 `gateway.http.endpoints.chatCompletions.enabled: true` 启用。
- Responses API：`gateway.http.endpoints.responses.enabled`。
- Responses URL 输入加固：
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist`
    空允许列表会被视为未设置；使用 `gateway.http.endpoints.responses.files.allowUrl=false`
    和/或 `gateway.http.endpoints.responses.images.allowUrl=false` 来禁用 URL 抓取。
- 可选的响应加固头：
  - `gateway.http.securityHeaders.strictTransportSecurity`（仅对你控制的 HTTPS origin 设置；见 [可信代理认证](/gateway/trusted-proxy-auth#tls-termination-and-hsts)）

### 多实例隔离

在一台主机上使用唯一端口和状态目录运行多个网关：

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json \
OPENCLAW_STATE_DIR=~/.openclaw-a \
openclaw gateway --port 19001
```

便捷标志：`--dev`（使用 `~/.openclaw-dev` + 端口 `19001`）、`--profile <name>`（使用 `~/.openclaw-<name>`）。

参见 [多个网关](/gateway/multiple-gateways)。

### `gateway.tls`

```json5
{
  gateway: {
    tls: {
      enabled: false,
      autoGenerate: false,
      certPath: "/etc/openclaw/tls/server.crt",
      keyPath: "/etc/openclaw/tls/server.key",
      caPath: "/etc/openclaw/tls/ca-bundle.crt",
    },
  },
}
```

- `enabled`：在网关监听器处启用 TLS 终止（HTTPS/WSS）（默认：`false`）。
- `autoGenerate`：在未配置显式文件时自动生成本地自签名证书/密钥对；仅用于本地/开发场景。
- `certPath`：TLS 证书文件的文件系统路径。
- `keyPath`：TLS 私钥文件的文件系统路径；请限制其权限。
- `caPath`：用于客户端验证或自定义信任链的可选 CA bundle 路径。

### `gateway.reload`

```json5
{
  gateway: {
    reload: {
      mode: "hybrid", // 关闭 | 重启 | 热重载 | 混合
      debounceMs: 500,
      deferralTimeoutMs: 300000,
    },
  },
}
```

- `mode`: controls how config edits are applied at runtime.
  - `"off"`: ignore live edits; changes require an explicit restart.
  - `"restart"`: always restart the gateway process on config change.
  - `"hot"`: apply changes in-process without restarting.
  - `"hybrid"` (default): try hot reload first; fall back to restart if required.
- `debounceMs`: debounce window in ms before config changes are applied (non-negative integer; default: `300`).
- `deferralTimeoutMs`: optional maximum time in ms to wait for in-flight operations before forcing a restart or channel hot reload. Omit it to use the default bounded wait (`300000`); set `0` to wait indefinitely and log periodic still-pending warnings.

---

## Cloud worker environments

Cloud workers are opt-in. If `cloudWorkers` is absent, or `profiles` is empty, OpenClaw accepts no new worker creation. Durable records created earlier still reconcile and remain visible; the existing gateway/node projection is unchanged.

Every worker provider must return an SSH `hostKey` from trusted provisioning output as exactly `algorithm base64`, without a hostname or comment. Bootstrap writes that key to an isolated `known_hosts` file, uses `StrictHostKeyChecking=yes`, and fails before opening a connection when the provider omits it. There is no trust-on-first-use fallback.

Tunnel setup is on demand rather than part of provisioning. When started, the gateway reverse-forwards a worker-local Unix socket to its loopback WebSocket endpoint. The socket lives in a randomly allocated, owner-only remote directory; unlike a loopback TCP port, it is not reachable by other accounts on a multi-user worker and cannot collide with another environment's port. SSH keepalives and capped reconnect backoff run only while the tunnel owner remains current. Stopping the tunnel fences reconnects before closing the SSH process.

Control traffic and workspace transfer use separate SSH connections. Both reuse the same resolved identity and isolated pinned `known_hosts` file, but workspace transfer does not share SSH connection multiplexing with the long-lived tunnel, so rsync cannot block control traffic.

### Crabbox profile

The bundled `crabbox` provider provisions an SSH-capable lease through the local Crabbox CLI. The inner `settings.provider` selects the Crabbox backend; it is separate from the outer OpenClaw provider id.

```json5
{
  cloudWorkers: {
    profiles: {
      production: {
        provider: "crabbox",
        install: "bundle", // Default; use "npm" only for a released gateway version.
        settings: {
          provider: "aws",
          class: "standard",
          ttl: "24h",
          idleTimeout: "60m",
          // Optional absolute path. Default: sibling ../crabbox/bin/crabbox, then PATH.
          binary: "/usr/local/bin/crabbox",
        },
        lifetime: {
          idleTimeoutMinutes: 60,
          maxLifetimeMinutes: 1440,
        },
      },
    },
  },
}
```

- `settings.provider` (required): Crabbox backend passed through `--provider`. Use a backend whose inspect output includes an SSH endpoint; `aws` selects the direct AWS backend.
- `settings.class` (required): Crabbox machine class passed to `--class`.
- `settings.ttl` and `settings.idleTimeout` (required): positive Go duration strings passed to `--ttl` and `--idle-timeout`. These provider-side failsafes are distinct from OpenClaw's stored `lifetime` policy below.
- `settings.binary`: optional absolute Crabbox executable path. Without it, OpenClaw checks the sibling Crabbox checkout, then executable entries on `PATH`, and finally invokes `crabbox` so a missing CLI remains a visible provider error.

Unknown settings are rejected. Crabbox credentials and backend-specific account configuration remain owned by Crabbox; do not place them in `settings`. OpenClaw invokes only the local CLI and makes no provider network calls from this plugin. Provisioning always passes `--keep=true`; OpenClaw owns the external lifecycle and destroys the lease with `crabbox stop`.

<Warning>
  OpenClaw resolves Crabbox's lease-local `sshKey` path through the provider-owned secret resolver. Current `crabbox inspect --json` output does not expose a provisioned `sshHostKey`, so Crabbox-backed workers still fail closed before bootstrap or tunnel setup. Crabbox must provision an authoritative per-lease host key and return `sshHostKey` as exactly `algorithm base64`, without a hostname or comment. Its current lease-local `known_hosts` cache is not provisioning trust material.
</Warning>

### Static SSH development profile

```json5
{
  cloudWorkers: {
    profiles: {
      development: {
        provider: "static-ssh",
        settings: {
          host: "worker.example.test",
          port: 22,
          user: "openclaw",
          hostKey: "ssh-ed25519 <base64-public-host-key>",
          keyRef: {
            source: "env",
            provider: "default",
            id: "OPENCLAW_WORKER_SSH_KEY",
          },
        },
        lifetime: {
          idleTimeoutMinutes: 60,
          maxLifetimeMinutes: 1440,
        },
      },
    },
  },
}
```

- `profiles`: named worker profiles with non-empty, whitespace-trimmed ids. Each profile selects a provider registered by a plugin.
- `provider`: non-empty worker provider id. The examples use the bundled `crabbox` provider and the QA Lab `static-ssh` provider.
- `install`: worker installation method. `"bundle"` (default) transfers a content-hashed bundle of the gateway's installed build and supports released, development, and unreleased versions. `"npm"` is an opt-in optimization for an unmodified packaged release; it installs `openclaw@<exact gateway version>` from the public npm registry and never installs `latest`.
- Bundled provider plugins are selected automatically when configured, but explicit disables and `plugins.allow` still apply. Include the provider id (for example, `crabbox`) when an allowlist is configured. External provider plugins must also be installed and explicitly enabled.
- `settings`: provider-owned bounded JSON. The selected plugin defines and validates its keys; use [SecretRef objects](/gateway/secrets) for secret-bearing values. The static SSH provider requires `host`, `user`, `hostKey`, and `keyRef`; `port` defaults to `22`. `hostKey` must be one OpenSSH public host-key line (`algorithm base64`) obtained from the known host or another trusted channel, with no options prefix.
- `lifetime.idleTimeoutMinutes`: positive integer minutes stored for later idle-reclamation policy.
- `lifetime.maxLifetimeMinutes`: positive integer minutes stored for later lifecycle policy.

A supported Node runtime (22.22.3+, 24.15+, or 25.9+) with WAL-reset-safe SQLite must already be installed on the worker. The opt-in `"npm"` method also requires `npm` and outbound HTTPS access to the public npm registry. Networked toolchain setup is provider policy; bootstrap reports an actionable error instead of installing toolchains itself.

This foundation installs and verifies the gateway build and provides tunnel start/stop lifecycle, but it does not launch the general OpenClaw CLI. The self-contained worker entry and loop land in the next cloud-worker milestone.

Each durable environment record retains its validated provider settings, resolved install method, and lifetime policy in a creation-time profile snapshot. Changing or removing a named profile affects new creates; existing records continue lifecycle reconciliation with that snapshot, provided the owning plugin remains available.

Lifetime values are data only in the first cloud-worker release; automatic enforcement lands with later lifecycle work. Profile changes require a gateway restart.

<Warning>
  The `static-ssh` provider is a source-tree QA Lab development harness and is excluded from packaged distributions. A worker running on its shared host can read unrelated host data, so do not use this provider as a production isolation boundary.
  Its operator must supply the expected `hostKey`; OpenClaw will not learn or accept a key from the first connection.
  Destroying its lease only releases OpenClaw's logical record; it does not stop or clean the host.
</Warning>

---

## Hooks

```json5
{
  hooks: {
    enabled: true,
    token: "shared-secret",
    path: "/hooks",
    maxBodyBytes: 262144,
    defaultSessionKey: "hook:ingress",
    allowRequestSessionKey: true,
    allowedSessionKeyPrefixes: ["hook:", "hook:gmail:"],
    allowedAgentIds: ["hooks", "main"],
    presets: ["gmail"],
    transformsDir: "~/.openclaw/hooks/transforms",
    mappings: [
      {
        match: { path: "gmail" },
        action: "agent",
        agentId: "hooks",
        wakeMode: "now",
        name: "Gmail",
        sessionKey: "hook:gmail:{{messages[0].id}}",
        messageTemplate: "来自：{{messages[0].from}}\n主题：{{messages[0].subject}}\n{{messages[0].snippet}}",
        deliver: true,
        channel: "last",
        model: "openai/gpt-5.6-sol",
      },
    ],
  },
}
```

认证：`Authorization: Bearer <token>` 或 `x-openclaw-token: <token>`。  
不接受查询字符串中的 hook token。

验证和安全说明：

- `hooks.enabled=true` 需要一个非空的 `hooks.token`。
- `hooks.token` 应与活动的 Gateway 共享密钥认证（`gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`）不同；当检测到复用时，启动日志会输出非致命的安全警告。
- `openclaw security audit` 会将 hook/Gateway 认证复用标记为严重问题，包括仅在审计时提供的 Gateway 密码认证（`--auth password --password <password>`）。运行 `openclaw doctor --fix` 可轮换持久化的复用 `hooks.token`，然后更新外部 hook 发送方以使用新的 hook token。
- `hooks.path` 不能是 `/`；请使用专用子路径，例如 `/hooks`。
- 如果 `hooks.allowRequestSessionKey=true`，请限制 `hooks.allowedSessionKeyPrefixes`（例如 `["hook:"]`）。
- 如果某个 mapping 或 preset 使用了模板化的 `sessionKey`，请设置 `hooks.allowedSessionKeyPrefixes` 和 `hooks.allowRequestSessionKey=true`。静态 mapping key 不需要该显式开启。

**端点：**

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, agentId?, sessionKey?, wakeMode?, deliver?, channel?, to?, model?, thinking?, timeoutSeconds? }`
  - 仅当 `hooks.allowRequestSessionKey=true` 时，才接受请求负载中的 `sessionKey`（默认：`false`）。
- `POST /hooks/<name>` → 通过 `hooks.mappings` 解析
  - 模板渲染后的 mapping `sessionKey` 值会被视为外部提供，因此同样需要 `hooks.allowRequestSessionKey=true`。

<Accordion title="Mapping 详情">

- `match.path` 匹配 `/hooks` 后的子路径（例如 `/hooks/gmail` → `gmail`）。
- `match.source` 匹配通用路径的 payload 字段。
- `{{messages[0].subject}}` 之类的模板会从 payload 中读取。
- `transform` 可以指向一个返回 hook action 的 JS/TS 模块。
  - `transform.module` 必须是相对路径，并且会被限制在 `hooks.transformsDir` 之内（绝对路径和路径穿越会被拒绝）。
  - 将 `hooks.transformsDir` 保持在 `~/.openclaw/hooks/transforms` 下；工作区 skill 目录会被拒绝。如果 `openclaw doctor` 报告此路径无效，请把 transform 模块移动到 hooks transforms 目录，或者移除 `hooks.transformsDir`。
- `agentId` 路由到特定 agent；未知 ID 会回退到默认 agent。
- `allowedAgentIds`：限制实际生效的 agent 路由，包括未提供 `agentId` 时的默认 agent 路径（`*` 或省略 = 允许全部，`[]` = 全部拒绝）。
- `defaultSessionKey`：用于没有显式 `sessionKey` 的 hook agent 运行的可选固定 session key。
- `allowRequestSessionKey`：允许 `/hooks/agent` 调用方和基于模板的 mapping session key 设置 `sessionKey`（默认：`false`）。
- `allowedSessionKeyPrefixes`：显式 `sessionKey` 值（请求 + mapping）的可选前缀允许列表，例如 `["hook:"]`。当任何 mapping 或 preset 使用模板化 `sessionKey` 时，它会变为必需。
- `deliver: true` 会将最终回复发送到某个 channel；`channel` 默认为 `last`。
- `model` 为此 hook 运行覆盖 LLM（如果已设置模型目录，则必须允许）。

</Accordion>

### Gmail 集成

- The built-in Gmail preset uses `sessionKey: "hook:gmail:{{messages[0].id}}"`.
- This per-message key isolates conversation context, not tools or workspace access. Without a custom mapping that sets `agentId`, the preset uses the default agent.
- For untrusted inboxes, route Gmail to a dedicated reader agent and restrict that agent with [per-agent sandbox and tool policy](/tools/multi-agent-sandbox-tools). If the reader must notify the main agent, constrain the handoff with [`tools.agentToAgent`](/gateway/config-tools#toolsagenttoagent). See [Prompt injection](/gateway/security#prompt-injection) for the recommended threat model and model tier.
- If you keep that per-message routing, set `hooks.allowRequestSessionKey: true` and constrain `hooks.allowedSessionKeyPrefixes` to match the Gmail namespace, for example `["hook:", "hook:gmail:"]`.
- If you need `hooks.allowRequestSessionKey: false`, override the preset with a static `sessionKey` instead of the templated default.

```json5
{
  hooks: {
    gmail: {
      account: "openclaw@gmail.com",
      topic: "projects/<project-id>/topics/gog-gmail-watch",
      subscription: "gog-gmail-watch-push",
      pushToken: "shared-push-token",
      hookUrl: "http://127.0.0.1:18789/hooks/gmail",
      includeBody: true,
      maxBytes: 20000,
      renewEveryMinutes: 720,
      serve: { bind: "127.0.0.1", port: 8788, path: "/" },
      tailscale: { mode: "funnel", path: "/gmail-pubsub" },
      model: "openai/gpt-5.6-sol",
      thinking: "high",
    },
  },
}
```

- 在配置后，Gateway 会在启动时自动启动 `gog gmail watch serve`。设置 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 可禁用。
- 不要在 Gateway 旁边再单独运行一个 `gog gmail watch serve`。

---

## Canvas 插件宿主

```json5
{
  plugins: {
    entries: {
      canvas: {
        config: {
          host: {
            root: "~/.openclaw/workspace/canvas",
            liveReload: true,
            // enabled: false, // 或 OPENCLAW_SKIP_CANVAS_HOST=1
          },
        },
      },
    },
  },
}
```

- 通过 Gateway 端口经 HTTP 提供 agent 可编辑的 HTML/CSS/JS 和 A2UI：
  - `http://<gateway-host>:<gateway.port>/__openclaw__/canvas/`
  - `http://<gateway-host>:<gateway.port>/__openclaw__/a2ui/`
- 仅本地可访问：保持 `gateway.bind: "loopback"`（默认）。
- 非 loopback 绑定：canvas 路由需要 Gateway 认证（token/password/trusted-proxy），与其他 Gateway HTTP 表面相同。
- Node WebView 通常不会发送认证头；当 node 完成配对并连接后，Gateway 会为 canvas/A2UI 访问公开按 node 范围限定的能力 URL。
- 能力 URL 绑定到当前激活的 node WS 会话，并会快速过期。不使用基于 IP 的回退。
- 在提供的 HTML 中注入 live-reload 客户端。
- 在目录为空时自动创建 starter `index.html`。
- 也会在 `/__openclaw__/a2ui/` 提供 A2UI。
- 更改需要重启 gateway。
- 对于大型目录或 `EMFILE` 错误，请禁用 live reload。

---

## 发现

### mDNS（Bonjour）

```json5
{
  discovery: {
    mdns: {
      mode: "minimal", // 最小 | 完整 | 关闭
    },
  },
}
```

- `minimal` (default): omit `cliPath` + `sshPort` from TXT records.
- `full`: include `cliPath` + `sshPort`; LAN multicast advertising still requires the bundled `bonjour` plugin to be enabled.
- `off`: suppress LAN multicast advertising without changing plugin enablement.
- The bundled `bonjour` plugin auto-starts on macOS hosts and is opt-in on Linux, Windows, and containerized Gateway deployments.
- Hostname defaults to the system hostname when it is a valid DNS label, falling back to `openclaw`. Override with `OPENCLAW_MDNS_HOSTNAME`.
- `OPENCLAW_DISABLE_BONJOUR=1` disables mDNS advertising outright, overriding `discovery.mdns.mode`.

### 广域（DNS-SD）

```json5
{
  discovery: {
    wideArea: { enabled: true },
  },
}
```

在 `~/.openclaw/dns/` 下写入单播 DNS-SD 区域。要实现跨网络发现，请配合 DNS 服务器（推荐 CoreDNS）+ Tailscale split DNS。

设置：`openclaw dns setup --apply`。

---

## 环境

### `env`（内联环境变量）

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: {
      GROQ_API_KEY: "gsk-...",
    },
    shellEnv: {
      enabled: true,
      timeoutMs: 15000,
    },
  },
}
```

- 只有当进程环境中缺少该键时，才会应用内联环境变量。
- `.env` 文件：CWD `.env` + `~/.openclaw/.env`（都不会覆盖已有变量）。
- `shellEnv`：从你的登录 shell 配置文件中导入缺失的预期键。
- 完整优先级请参见 [环境](/help/environment)。

### 环境变量替换

使用 `${VAR_NAME}` 在任意配置字符串中引用环境变量：

```json5
{
  gateway: {
    auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" },
  },
}
```

- 仅匹配大写名称：`[A-Z_][A-Z0-9_]*`。
- 缺失/空值变量会在配置加载时抛出错误。
- 使用 `$${VAR}` 转义为字面量 `${VAR}`。
- 可与 `$include` 一起使用。

---

## 密钥

密钥引用是增量式的：明文值仍然可用。

### `SecretRef`

使用一种对象形状：

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

验证：

- `provider` 模式：`^[a-z][a-z0-9_-]{0,63}$`
- `source: "env"` id 模式：`^[A-Z][A-Z0-9_]{0,127}$`
- `source: "file"` id：绝对 JSON Pointer（例如 `"/providers/openai/apiKey"`）
- `source: "exec"` id 模式：`^[A-Za-z0-9][A-Za-z0-9._:/#-]{0,255}$`（支持 AWS 风格的 `secret#json_key` 选择器）
- `source: "exec"` 的 id 不能包含 `.` 或 `..` 这样的斜杠分隔路径段（例如 `a/../b` 会被拒绝）

### 支持的凭据范围

- 规范矩阵：[SecretRef 凭据范围](/reference/secretref-credential-surface)
- `secrets apply` 目标是受支持的 `openclaw.json` 凭据路径。
- `auth-profiles.json` 引用会包含在运行时解析和审计覆盖范围内。

### 密钥提供方配置

```json5
{
  secrets: {
    providers: {
      default: { source: "env" }, // 可选的显式 env 提供方
      filemain: {
        source: "file",
        path: "~/.openclaw/secrets.json",
        mode: "json",
        timeoutMs: 5000,
      },
      vault: {
        source: "exec",
        command: "/usr/local/bin/openclaw-vault-resolver",
        passEnv: ["PATH", "VAULT_ADDR"],
      },
    },
    defaults: {
      env: "default",
      file: "filemain",
      exec: "vault",
    },
  },
}
```

说明：

- `file` 提供方支持 `mode: "json"` 和 `mode: "singleValue"`（在 singleValue 模式下，`id` 必须是 `"value"`）。
- 当 Windows ACL 验证不可用时，文件和 exec 提供方路径会以 fail closed 方式处理。仅对无法验证的受信任路径设置 `allowInsecurePath: true`。
- `exec` 提供方要求绝对的 `command` 路径，并通过 stdin/stdout 使用协议负载。
- 默认情况下会拒绝符号链接的命令路径。设置 `allowSymlinkCommand: true` 可允许符号链接路径，同时验证解析后的目标路径。
- 如果配置了 `trustedDirs`，则 trusted-dir 检查适用于解析后的目标路径。
- `exec` 子进程环境默认是最小化的；请使用 `passEnv` 显式传递所需变量。
- 密钥引用在激活时解析为内存中的快照，之后请求路径只读取该快照。
- 激活期间会应用活动面过滤：启用的面上未解析的引用会导致启动/重载失败，而不活动的面会被跳过并输出诊断信息。

---

## 认证存储

```json5
{
  auth: {
    profiles: {
      "anthropic:default": { provider: "anthropic", mode: "api_key" },
      "anthropic:work": { provider: "anthropic", mode: "api_key" },
      "openai:personal": { provider: "openai", mode: "oauth" },
    },
    order: {
      anthropic: ["anthropic:default", "anthropic:work"],
      openai: ["openai:personal"],
    },
  },
}
```

- 每个 agent 的配置文件存储在 `<agentDir>/auth-profiles.json`。
- `auth-profiles.json` 支持值级引用（`api_key` 使用 `keyRef`，`token` 使用 `tokenRef`），适用于静态凭据模式。
- 旧式扁平 `auth-profiles.json` 映射，例如 `{ "provider": { "apiKey": "..." } }`，不是运行时格式；`openclaw doctor --fix` 会将其重写为规范的 `provider:default` API-key 配置文件，并创建 `.legacy-flat.*.bak` 备份。
- OAuth 模式配置文件（`auth.profiles.<id>.mode = "oauth"`）不支持基于 SecretRef 的 auth-profile 凭据。
- 静态运行时凭据来自内存中解析后的快照；发现旧式静态 `auth.json` 条目时会被清理。
- 旧式 OAuth 导入来自 `~/.openclaw/credentials/oauth.json`。
- 参见 [OAuth](/concepts/oauth)。
- 密钥运行时行为以及 `audit/configure/apply` 工具： [密钥管理](/gateway/secrets)。

### `auth.cooldowns`

```json5
{
  auth: {
    cooldowns: {
      billingBackoffHours: 5,
      billingBackoffHoursByProvider: { anthropic: 3, openai: 8 },
      billingMaxHours: 24,
      authPermanentBackoffMinutes: 10,
      authPermanentMaxMinutes: 60,
      failureWindowHours: 24,
      overloadedProfileRotations: 1,
      overloadedBackoffMs: 0,
      rateLimitedProfileRotations: 1,
    },
  },
}
```

- `billingBackoffHours`：当配置文件因真实的计费/信用额度不足错误而失败时，基础退避时间（小时）（默认：`5`）。即使在 `401`/`403` 响应中出现明确的计费文本，也可能进入这里，但提供方特定的文本匹配器仍仅限于其所属提供方（例如 OpenRouter 的 `Key limit exceeded`）。可重试的 HTTP `402` 使用窗口或组织/工作区花费上限消息则仍停留在 `rate_limit` 路径中。
- `billingBackoffHoursByProvider`：可选的按提供方覆盖计费退避小时数。
- `billingMaxHours`：计费退避指数增长的小时上限（默认：`24`）。
- `authPermanentBackoffMinutes`：高置信度 `auth_permanent` 失败的基础退避时间（分钟）（默认：`10`）。
- `authPermanentMaxMinutes`：`auth_permanent` 退避增长的分钟上限（默认：`60`）。
- `failureWindowHours`：用于退避计数器的滚动时间窗口（小时）（默认：`24`）。
- `overloadedProfileRotations`：在切换到模型回退前，针对过载错误允许的同提供方 auth-profile 轮换最大次数（默认：`1`）。如 `ModelNotReadyException` 之类的提供方忙碌形态会落在这里。
- `overloadedBackoffMs`：重试过载的提供方/配置文件轮换前的固定延迟（默认：`0`）。
- `rateLimitedProfileRotations`：在切换到模型回退前，针对限流错误允许的同提供方 auth-profile 轮换最大次数（默认：`1`）。该限流桶包括诸如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded` 和 `resource exhausted` 等提供方样式的文本。

---

## Audit

```json5
{
  audit: {
    enabled: true,
    messages: "off", // off | direct | all
  },
}
```

The Gateway records **metadata-only** audit events for agent runs and tool
actions into the shared state database. Message lifecycle metadata is a
separate opt-in. The ledger stores identity, timing, tool names, and normalized
outcomes, but never prompts, message bodies, tool arguments, results, or raw
error text. Message rows do not store raw platform account, conversation,
message, and target ids. Run/tool session keys remain available for correlation
and can themselves contain platform account or peer ids. Records
expire after 30 days and the ledger is capped at 100,000 rows. Query them with
[`openclaw audit`](/cli/audit) or the
[`audit.activity.list`](/gateway/protocol#audit-ledger-rpc) Gateway RPC. See
[Audit history](/gateway/audit) for the full data model, privacy semantics,
and coverage limits.

- `enabled`: record new audit events (default: `true`). The ledger is on by
  default because an audit trail enabled only after an incident cannot explain
  the incident. Setting `false` stops new event inserts after the Gateway restarts;
  existing records stay readable until they expire. Turning it back on resumes
  recording from that point — the gap is not backfilled.
- `messages`: message metadata scope (default: `"off"`). `"direct"` records
  known direct conversations only. `"all"` also records group, channel, and
  unknown conversation kinds. Both modes remain content-free and replace raw
  identifiers with installation-local keyed pseudonyms where correlation is
  available. These are correlation aids rather than anonymization; the state
  database stores the derivation key, but RPC and CLI exports do not.

The running Gateway captures `audit.enabled` and `audit.messages` at startup;
restart it after changing either setting. Message coverage currently includes
accepted inbound messages that reach core dispatch and one terminal row per
original logical outbound reply payload that reaches shared durable delivery.
Plugin-local and direct-send paths that bypass those shared boundaries are not
yet covered. The bounded background
writer is best-effort, not a lossless compliance archive.

---

## Logging

```json5
{
  logging: {
    level: "info",
    file: "/tmp/openclaw/openclaw.log",
    consoleLevel: "info",
    consoleStyle: "pretty", // 美观 | 紧凑 | JSON
    redactSensitive: "tools", // 关闭 | 工具
    redactPatterns: ["\\bTOKEN\\b\\s*[=:]\\s*([\"']?)([^\\s\"']+)\\1"],
  },
}
```

- 默认日志文件：`/tmp/openclaw/openclaw-YYYY-MM-DD.log`。
- 设置 `logging.file` 以使用稳定路径。
- 当使用 `--verbose` 时，`consoleLevel` 会提升为 `debug`。
- `maxFileBytes`：在轮转之前的活动日志文件最大大小（字节，正整数；默认：`104857600` = 100 MB）。OpenClaw 会在活动文件旁保留最多五个编号归档文件。
- `redactSensitive` / `redactPatterns`：对控制台输出、文件日志、OTLP 日志记录以及持久化会话转录文本进行尽力而为的脱敏。`redactSensitive: "off"` 只会禁用这一通用日志/转录策略；UI/工具/诊断安全表面仍会在输出前对密钥进行脱敏。

---

## 诊断

```json5
{
  diagnostics: {
    enabled: true,
    flags: ["telegram.*"],
    stuckSessionWarnMs: 30000,
    stuckSessionAbortMs: 300000,
    memoryPressureSnapshot: false,

    otel: {
      enabled: false,
      endpoint: "https://otel-collector.example.com:4318",
      tracesEndpoint: "https://traces.example.com/v1/traces",
      metricsEndpoint: "https://metrics.example.com/v1/metrics",
      logsEndpoint: "https://logs.example.com/v1/logs",
      protocol: "http/protobuf", // http/protobuf | grpc
      headers: { "x-tenant-id": "my-org" },
      serviceName: "openclaw-gateway",
      traces: true,
      metrics: true,
      logs: false,
      logsExporter: "otlp",
      sampleRate: 1.0,
      flushIntervalMs: 5000,
      captureContent: {
        enabled: false,
        inputMessages: false,
        outputMessages: false,
        toolInputs: false,
        toolOutputs: false,
        systemPrompt: false,
        toolDefinitions: false,
      },
    },

    cacheTrace: {
      enabled: false,
      filePath: "~/.openclaw/logs/cache-trace.jsonl",
      includeMessages: true,
      includePrompt: true,
      includeSystem: true,
    },
  },
}
```

- `enabled`: master toggle for instrumentation output (default: `true`).
- `flags`: array of flag strings enabling targeted log output (supports wildcards like `"telegram.*"` or `"*"`).
- `stuckSessionWarnMs`: no-progress age threshold in ms for classifying long-running processing sessions as `session.long_running`, `session.stalled`, or `session.stuck` (default: `120000`). Reply, tool, status, block, and ACP progress reset the timer; repeated `session.stuck` diagnostics back off while unchanged.
- `stuckSessionAbortMs`: no-progress age threshold in ms before eligible stalled active work may be abort-drained for recovery. When unset, OpenClaw uses the safer extended embedded-run window of at least 5 minutes and 3x `stuckSessionWarnMs`.
- `memoryPressureSnapshot`: captures a redacted pre-OOM stability snapshot when memory pressure reaches `critical` (default: `false`). Set to `true` to add the stability bundle file scan/write while keeping normal memory pressure events.
- `otel.enabled`: enables the OpenTelemetry export pipeline (default: `false`). For the full configuration, signal catalog, and privacy model, see [OpenTelemetry export](/gateway/opentelemetry).
- `otel.endpoint`: collector URL for OTel export.
- `otel.tracesEndpoint` / `otel.metricsEndpoint` / `otel.logsEndpoint`: optional signal-specific OTLP endpoints. When set, they override `otel.endpoint` for that signal only.
- `otel.protocol`: `"http/protobuf"` (default) or `"grpc"`.
- `otel.headers`: extra HTTP/gRPC metadata headers sent with OTel export requests.
- `otel.serviceName`: service name for resource attributes.
- `otel.traces` / `otel.metrics` / `otel.logs`: enable trace, metrics, or log export.
- `otel.logsExporter`: log export sink: `"otlp"` (default), `"stdout"` for one JSON object per stdout line, or `"both"`.
- `otel.sampleRate`: trace sampling rate `0`-`1`.
- `otel.flushIntervalMs`: periodic telemetry flush interval in ms.
- `otel.captureContent`: opt-in raw content capture for OTEL span attributes. Defaults to off. Boolean `true` captures non-system message/tool content; the object form lets you enable `inputMessages`, `outputMessages`, `toolInputs`, `toolOutputs`, `systemPrompt`, and `toolDefinitions` explicitly.
- `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`: environment toggle for latest experimental GenAI inference span shape, including `{gen_ai.operation.name} {gen_ai.request.model}` span names, `CLIENT` span kind, and `gen_ai.provider.name` instead of legacy `gen_ai.system`. By default spans keep `openclaw.model.call` and `gen_ai.system` for compatibility; GenAI metrics use bounded semantic attributes.
- `OPENCLAW_OTEL_PRELOADED=1`: environment toggle for hosts that already registered a global OpenTelemetry SDK. OpenClaw then skips plugin-owned SDK startup/shutdown while keeping diagnostic listeners active.
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`, and `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`: signal-specific endpoint env vars used when the matching config key is unset.
- `cacheTrace.enabled`: log cache trace snapshots for embedded runs (default: `false`).
- `cacheTrace.filePath`: output path for cache trace JSONL (default: `$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`).
- `cacheTrace.includeMessages` / `includePrompt` / `includeSystem`: control what is included in cache trace output (all default: `true`).

---

## 更新

```json5
{
  update: {
    channel: "stable", // stable | extended-stable | beta | dev
    checkOnStart: true,

    auto: {
      enabled: false,
      stableDelayHours: 6,
      stableJitterHours: 12,
      betaCheckIntervalHours: 1,
    },
  },
}
```

- `channel`: release channel - `"stable"`, `"extended-stable"`, `"beta"`, or `"dev"`. Extended-stable is package-only: foreground commands own installation, while the Gateway may emit read-only update hints.
- `checkOnStart`: check for npm updates when the gateway starts (default: `true`). Stored extended-stable selections use the same read-only hint and 24-hour hint schedule.
- `auto.enabled`: enable background auto-update for stable and beta package installs (default: `false`). Extended-stable never applies automatically.
- `auto.stableDelayHours`: minimum delay in hours before stable-channel auto-apply (default: `6`; max: `168`).
- `auto.stableJitterHours`: extra stable-channel rollout spread window in hours (default: `12`; max: `168`).
- `auto.betaCheckIntervalHours`: how often beta-channel checks run in hours (default: `1`; max: `24`). Stable delay/jitter and beta polling settings do not apply to extended-stable.

---

## ACP

```json5
{
  acp: {
    enabled: true,
    dispatch: { enabled: true },
    backend: "acpx",
    fallbacks: ["acpx-secondary"],
    defaultAgent: "main",
    allowedAgents: ["main", "ops"],
    maxConcurrentSessions: 10,

    stream: {
      coalesceIdleMs: 50,
      maxChunkChars: 1000,
      repeatSuppression: true,
      deliveryMode: "live", // 实时 | 仅最终
      hiddenBoundarySeparator: "paragraph", // 无 | 空格 | 换行 | 段落
      maxOutputChars: 50000,
      maxSessionUpdateChars: 500,
    },

    runtime: {
      ttlMinutes: 30,
    },
  },
}
```

- `enabled`: global ACP feature gate (default: `true`; set `false` to hide ACP dispatch and spawn affordances).
- `dispatch.enabled`: independent gate for ACP session turn dispatch (default: `true`). Set `false` to keep ACP commands available while blocking execution.
- `backend`: default ACP runtime backend id (must match a registered ACP runtime plugin).
  Install the backend plugin first, and if `plugins.allow` is set, include the backend plugin id (for example `acpx`) or the ACP backend will not load.
- `fallbacks`: ordered list of fallback ACP backend ids tried when the primary backend fails early with a transient-looking error (unavailable, rate-limited, quota exhausted, or overloaded) before it produced any output. Each entry must match a registered ACP runtime plugin backend.
- `defaultAgent`: fallback ACP target agent id when spawns do not specify an explicit target.
- `allowedAgents`: allowlist of agent ids permitted for ACP runtime sessions; empty means no additional restriction.
- `maxConcurrentSessions`: maximum concurrently active ACP sessions.
- `stream.coalesceIdleMs`: idle flush window in ms for streamed text.
- `stream.maxChunkChars`: maximum chunk size before splitting streamed block projection.
- `stream.repeatSuppression`: suppress repeated status/tool lines per turn (default: `true`).
- `stream.deliveryMode`: `"live"` streams incrementally; `"final_only"` buffers until turn terminal events.
- `stream.hiddenBoundarySeparator`: separator before visible text after hidden tool events (default: `"paragraph"`).
- `stream.maxOutputChars`: maximum assistant output characters projected per ACP turn.
- `stream.maxSessionUpdateChars`: maximum characters for projected ACP status/update lines.
- `stream.tagVisibility`: record of tag names to boolean visibility overrides for streamed events.
- `runtime.ttlMinutes`: idle TTL in minutes for ACP session workers before eligible cleanup.
- `runtime.installCommand`: optional install command to run when bootstrapping an ACP runtime environment.

---

## CLI

```json5
{
  cli: {
    banner: {
      taglineMode: "off", // 随机 | 默认 | 关闭
    },
  },
}
```

- `cli.banner.taglineMode` 控制横幅标语样式：
  - `"random"`（默认）：轮换显示有趣/季节性标语。
  - `"default"`：固定的中性标语（`All your chats, one OpenClaw.`）。
  - `"off"`：不显示标语文本（仍会显示横幅标题/版本）。
- 如需隐藏整个横幅（不仅仅是标语），请设置环境变量 `OPENCLAW_HIDE_BANNER=1`。

---

## 向导

由 CLI 引导式设置流程（`onboard`、`configure`、`doctor`）写入的元数据：

```json5
{
  wizard: {
    lastRunAt: "2026-01-01T00:00:00.000Z",
    lastRunVersion: "2026.1.4",
    lastRunCommit: "abc1234",
    lastRunCommand: "configure",
    lastRunMode: "local",
    securityAcknowledgedAt: "2026-01-01T00:00:00.000Z",
  },
}
```

---

## 身份

请参见 [代理默认值](/gateway/config-agents#agent-defaults) 下 `agents.list` 的身份字段。

---

## Bridge（旧版，已移除）

当前版本不再包含 TCP bridge。节点现在通过 Gateway WebSocket 连接。`bridge.*` 键不再属于配置 schema（在移除之前校验会失败；`openclaw doctor --fix` 可清除未知键）。

<Accordion title="旧版 bridge 配置（历史参考）">

```json
{
  "bridge": {
    "enabled": true,
    "port": 18790,
    "bind": "tailnet",
    "tls": {
      "enabled": true,
      "autoGenerate": true
    }
  }
}
```

</Accordion>

---

## Cron

```json5
{
  cron: {
    enabled: true,
    maxConcurrentRuns: 8, // default; cron dispatch + isolated cron agent-turn execution
    webhook: "https://example.invalid/legacy", // deprecated fallback for stored notify:true jobs
    webhookToken: "replace-with-dedicated-token", // optional bearer token for outbound webhook auth
    sessionRetention: "24h", // duration string or false
  },
}
```

- `sessionRetention`: how long to keep completed isolated cron run sessions before pruning SQLite session rows. Also controls cleanup of archived deleted cron transcripts. Default: `24h`; set `false` to disable.
- Run history automatically keeps the newest 2000 terminal rows per job. Lost rows retain their 24-hour cleanup window.
- `webhookToken`: bearer token used for cron webhook POST delivery (`delivery.mode = "webhook"`), if omitted no auth header is sent.
- `webhook`: deprecated legacy fallback webhook URL (http/https) used by `openclaw doctor --fix` to migrate stored jobs that still have `notify: true`; runtime delivery uses per-job `delivery.mode="webhook"` plus `delivery.to`, or `delivery.completionDestination` when preserving announce delivery.

### `cron.retry`

```json5
{
  cron: {
    retry: {
      maxAttempts: 3,
      backoffMs: [30000, 60000, 300000],
      retryOn: ["rate_limit", "overloaded", "network", "timeout", "server_error"],
    },
  },
}
```

- `maxAttempts`: cron 作业在临时错误上的最大重试次数（默认：`3`；范围：`0`-`10`）。
- `backoffMs`: 每次重试对应的退避延迟数组，单位毫秒（默认：`[30000, 60000, 300000]`；1-10 项）。
- `retryOn`: 触发重试的错误类型 - `"rate_limit"`、`"overloaded"`、`network`、`timeout`、`server_error`。省略则重试所有临时错误类型。

一次性作业会保持启用，直到重试次数用尽，然后在保留最终错误状态的同时禁用。循环作业在下一个计划槽位之前，会使用相同的临时重试策略在退避后再次运行；永久错误或耗尽的临时重试会回退到正常的循环计划，并采用错误退避。

### `cron.failureAlert`

```json5
{
  cron: {
    failureAlert: {
      enabled: false,
      after: 3,
      cooldownMs: 3600000,
      includeSkipped: false,
      mode: "announce",
      accountId: "main",
    },
  },
}
```

- `enabled`：为 cron 作业启用失败告警（默认：`false`）。
- `after`：连续失败达到该次数后触发告警（正整数，最小：`1`）。
- `cooldownMs`：同一作业重复告警之间的最小毫秒数（非负整数）。
- `includeSkipped`：将连续跳过的运行次数计入告警阈值（默认：`false`）。跳过的运行会单独跟踪，不影响执行错误退避。
- `mode`：投递模式 - `"announce"` 表示通过频道消息发送；`"webhook"` 表示发布到已配置的 webhook。
- `accountId`：用于限定告警投递范围的可选账户或频道 id。

### `cron.failureDestination`

```json5
{
  cron: {
    failureDestination: {
      mode: "announce",
      channel: "last",
      to: "channel:C1234567890",
      accountId: "main",
    },
  },
}
```

- 所有作业的 cron 失败通知默认目的地。
- `mode`：`"announce"` 或 `"webhook"`；当存在足够的目标数据时，默认值为 `"announce"`。
- `channel`：用于 announce 投递的频道覆盖值。`"last"` 会重用最后已知的投递频道。
- `to`：显式的 announce 目标或 webhook URL。webhook 模式必填。
- `accountId`：可选的投递账户覆盖值。
- 单个作业的 `delivery.failureDestination` 会覆盖此全局默认值。
- 当全局和作业级失败目的地都未设置时，已经通过 `announce` 投递的作业在失败时会回退到该主要 announce 目标。
- `delivery.failureDestination` 仅支持 `sessionTarget="isolated"` 的作业，除非该作业的主要 `delivery.mode` 是 `"webhook"`。

参见 [Cron 作业](/automation/cron-jobs)。隔离的 cron 执行会被跟踪为 [后台任务](/automation/tasks)。

## 媒体模型模板变量

在 `tools.media.models[].args` 中展开的模板占位符：

| 变量              | 描述                                       |
| ----------------- | ------------------------------------------ |
| `{{Body}}`         | 完整的传入消息正文                          |
| `{{RawBody}}`      | 原始正文（不含历史/发送者包装）             |
| `{{BodyStripped}}` | 去除群组提及后的正文                        |
| `{{From}}`         | 发送者标识符                               |
| `{{To}}`           | 目标标识符                                 |
| `{{MessageSid}}`   | 渠道消息 ID                                |
| `{{SessionId}}`    | 当前会话 UUID                              |
| `{{IsNewSession}}` | 新会话创建时为 `"true"`                     |
| `{{MediaUrl}}`     | 传入媒体伪 URL                             |
| `{{MediaPath}}`    | 本地媒体路径                               |
| `{{MediaType}}`    | 媒体类型（image/audio/document/…）         |
| `{{Transcript}}`   | 音频转写                                   |
| `{{Prompt}}`       | 为 CLI 条目解析后的媒体提示词               |
| `{{MaxChars}}`     | 为 CLI 条目解析后的最大输出字符数           |
| `{{ChatType}}`     | `"direct"` 或 `"group"`                    |
| `{{GroupSubject}}` | 群组主题（尽力获取）                       |
| `{{GroupMembers}}` | 群组成员预览（尽力获取）                   |
| `{{SenderName}}`   | 发送者显示名称（尽力获取）                 |
| `{{SenderE164}}`   | 发送者电话号码（尽力获取）                 |
| `{{Provider}}`     | 提供方提示（whatsapp、telegram、discord 等） |

---

## Worktrees

```json5
{
  worktrees: {
    cleanup: {
      maxCount: 25, // max managed worktrees across all repositories; 0 or unset disables
      maxTotalSizeGb: 50, // max total size in GB across all managed worktrees; 0 or unset disables
    },
  },
}
```

Retention limits for OpenClaw-managed worktrees, enforced by hourly cleanup, `openclaw worktrees gc`, and the Control UI **Clean up now** action. When a limit is exceeded, cleanup snapshots and removes the least recently active session- and Workboard-owned worktrees until the count and total size fit. Manual worktrees, worktrees with live locks or run leases, and worktrees owned by recently active sessions are never limit-evicted, so a limit can remain exceeded when only protected worktrees are left. Removed worktrees stay restorable from their snapshots for 30 days.

- `cleanup.maxCount`: maximum number of managed worktrees to retain across all repositories. Default: unset (no limit).
- `cleanup.maxTotalSizeGb`: maximum total disk size in GB across all managed worktrees, measured during cleanup. Fractional values such as `0.5` are accepted. Default: unset (no limit).

The Control UI **Worktrees** page under Settings exposes both limits as stepper controls. See [Managed worktrees](/concepts/managed-worktrees).

---

## Media model template variables

将你的配置拆分到多个文件中：

```json5
// ~/.openclaw/openclaw.json
{
  gateway: { port: 18789 },
  agents: { $include: "./agents.json5" },
  broadcast: {
    $include: ["./clients/mueller.json5", "./clients/schmidt.json5"],
  },
}
```

**合并行为：**

- Single file: replaces the containing object.
- Array of files: deep-merged in order (later overrides earlier).
- Sibling keys: merged after includes (override included values).
- Nested includes: up to 10 levels deep.
- Paths: resolved relative to the including file, but must stay inside the top-level config directory (`dirname` of `openclaw.json`). Absolute/`../` forms are allowed only when they still resolve inside that boundary. Set `OPENCLAW_INCLUDE_ROOTS` (absolute paths) to allow additional roots outside the config directory.
- Limits: paths must not contain null bytes and must be strictly shorter than 4096 characters before and after resolution; each included file is capped at 2 MB.
- OpenClaw-owned writes that change only one top-level section backed by a single-file include write through to that included file. For example, `plugins install` updates `plugins: { $include: "./plugins.json5" }` in `plugins.json5` and leaves `openclaw.json` intact.
- Root includes, include arrays, and includes with sibling overrides are read-only for OpenClaw-owned writes; those writes fail closed instead of flattening the config.
- Errors: clear messages for missing files, parse errors, circular includes, invalid path format, and excessive length.

---

## Related

- [Configuration](/gateway/configuration)
- [Configuration examples](/gateway/configuration-examples)
- [Doctor](/gateway/doctor)
