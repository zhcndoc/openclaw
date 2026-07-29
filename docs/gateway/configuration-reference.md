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

Schema `uiHints` also carry a resolved `advanced` boolean for every path.
Control UI uses it to show common fields first and collapse advanced fields per
section; search still spans both tiers. Tier metadata is presentational only.
When adding a key, declare its tier on the leaf or let it inherit the nearest
ancestor declaration. A path with no declared ancestor is advanced by default.

Dedicated deep references:

- [Memory configuration reference](/reference/memory-config) for `memory.search.*`, `memory.qmd.*`, `memory.citations`, and dreaming config under `plugins.entries.memory-core.config.dreaming`.
- [Slash commands](/tools/slash-commands) for the current built-in + bundled command catalog.
- Owning channel/plugin pages for channel-specific command surfaces.

---

## Channels

Per-channel config keys live in [Configuration - channels](/gateway/config-channels): `channels.*` for Slack, Discord, Telegram, WhatsApp, Matrix, iMessage, and other bundled channels (auth, access control, multi-account, mention gating).

## Agent 默认值、多 Agent、会话和消息

See [Configuration - agents](/gateway/config-agents) for:

- `agents.defaults.*` (workspace, model, thinking, heartbeat, memory, media, skills, sandbox)
- `multiAgent.*` (multi-agent routing and bindings)
- `session.*` (session lifecycle, compaction, pruning)
- `messages.*` (message delivery, TTS, markdown rendering)
- `talk.*` (Talk mode)
  - `talk.consultThinkingLevel`: thinking level override for the full OpenClaw agent run behind Control UI Talk realtime consults
  - `talk.consultFastMode`: one-shot fast-mode override for Control UI Talk realtime consults
  - `talk.speechLocale`: optional BCP 47 locale id for Talk speech recognition on Android, iOS, and macOS, and for iOS system-voice fallback
  - `talk.silenceTimeoutMs`: when unset, Talk keeps the platform default pause window before sending the transcript (`700 ms on macOS and Android, 900 ms on iOS`)
  - `talk.realtime.consultRouting`: Gateway relay fallback for finalized realtime Talk transcripts that skip `openclaw_agent_consult`

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
    // Optional. Hosted catalog updates default on.
    catalogRefresh: {
      enabled: true,
      // url: "https://catalog.example.com/openclaw/catalog.json",
    },
  },
}
```

- `models.mode`: provider catalog behavior (`merge` or `replace`).
- `models.providers`: custom provider map keyed by provider id.
- `models.providers.*.localService`: optional on-demand process manager for
  local model servers. OpenClaw probes the configured health endpoint, starts
  the absolute `command` when needed, waits for readiness, then sends the model
  request. See [Local model services](/gateway/local-model-services).
- `models.catalogRefresh.enabled`: controls the hosted model catalog refresh
  (default: `true`). Set it to `false` to prevent all remote catalog requests;
  model metadata and pricing then stay at the values shipped in the installed
  release or declared under `models.providers.*.models[].cost`.
- `models.catalogRefresh.url`: optional HTTPS mirror override (plain HTTP is
  accepted only for explicit localhost testing). The Gateway
  checks in the background at startup and every six hours. A downloaded catalog
  applies on the next Gateway restart; a release whose bundled catalog is newer
  always wins.

Pricing updates ship in the same hosted catalog file as model metadata. The
retired `models.pricing` toggle is removed automatically by `openclaw doctor
--fix`; use `models.catalogRefresh.enabled: false` when OpenClaw must avoid all
hosted catalog traffic.

## MCP

OpenClaw 管理的 MCP server 定义位于 `mcp.servers` 下，并被嵌入式 OpenClaw 以及其他运行时适配器消费。`openclaw mcp list`、
`show`、`set` 和 `unset` 命令可在配置编辑期间管理该块，而无需连接到
目标 server。

```json5
{
  mcp: {
    servers: {
      docs: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-fetch"],
      },
      remote: {
        url: "https://example.com/mcp",
        transport: "streamable-http", // streamable-http | sse
        requestTimeoutMs: 20000,
        connectionTimeoutMs: 5000,
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

- `mcp.servers`: named stdio or remote MCP server definitions for runtimes that
  expose configured MCP tools.
  Remote entries use `transport: "streamable-http"` or `transport: "sse"`;
  `type: "http"` is a CLI-native alias that `openclaw mcp set` and
  `openclaw doctor --fix` normalize into the canonical `transport` field.
- `mcp.servers.<name>.enabled`: set `false` to keep a saved server definition
  while excluding it from embedded OpenClaw MCP discovery and tool projection.
- `mcp.servers.<name>.requestTimeoutMs`: per-server MCP request timeout in milliseconds.
- `mcp.servers.<name>.connectionTimeoutMs`: per-server connection timeout in milliseconds.
- `mcp.servers.<name>.supportsParallelToolCalls`: optional concurrency hint for
  adapters that can choose whether to issue parallel MCP tool calls.
- `mcp.servers.<name>.auth`: set `"oauth"` for HTTP MCP servers that require
  OAuth. Run `openclaw mcp login <name>` to store tokens under OpenClaw state.
- `mcp.servers.<name>.oauth`: optional OAuth scope, redirect URL, and client
  metadata URL overrides.
- `mcp.servers.<name>.sslVerify`, `clientCert`, `clientKey`: HTTP TLS controls
  for private endpoints and mutual TLS.
- `mcp.servers.<name>.toolFilter`: optional per-server tool selection. `include`
  limits the discovered MCP tools to matching names; `exclude` hides matching
  names. Entries are exact MCP tool names or simple `*` globs. Servers with
  resources or prompts also generate utility tool names (`resources_list`,
  `resources_read`, `prompts_list`, `prompts_get`), and those names use the
  same filter.
- `mcp.servers.<name>.codex`: optional Codex app-server projection controls.
  This block is OpenClaw metadata for Codex app-server threads only; it does not
  affect ACP sessions, generic Codex harness config, or other runtime adapters.
  Non-empty `codex.agents` limits the server to the listed OpenClaw agent ids.
  Empty, blank, or invalid scoped agent lists are rejected by config validation
  and omitted by the runtime projection path instead of becoming global.
  `codex.defaultToolsApprovalMode` emits Codex's native
  `default_tools_approval_mode` for that server. OpenClaw strips the `codex`
  block before passing native `mcp_servers` config to Codex. Omit the block to
  keep the server projected for every Codex app-server agent with Codex's
  default MCP approval behavior.
- Session-scoped bundled MCP runtimes use a built-in 10-minute idle TTL.
  One-shot embedded runs request run-end cleanup; the TTL is the backstop for long-lived sessions and future callers.
- Changes under `mcp.*` hot-apply by disposing cached session MCP runtimes.
  The next tool discovery/use recreates them from the new config, so removed
  `mcp.servers` entries are reaped immediately instead of waiting for idle TTL.
- Runtime discovery also honors MCP tool-list change notifications by dropping
  the cached catalog for that session. Servers that advertise resources or
  prompts get utility tools for listing/reading resources and listing/fetching
  prompts. Repeated tool-call failures pause the affected server briefly before
  another call is attempted.

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

- Loaded from package or bundle directories under `~/.openclaw/extensions` and `<workspace>/.openclaw/extensions`, plus files or directories listed in `plugins.load.paths`.
- Put standalone plugin files in `plugins.load.paths`; auto-discovered extension roots ignore top-level `.js`, `.mjs`, and `.ts` files so helper scripts in those roots do not block startup.
- Discovery accepts native OpenClaw plugins plus compatible Codex bundles and Claude bundles, including manifestless Claude default-layout bundles.
- **Config changes require a gateway restart.**
- `allow`: optional allowlist (only listed plugins load). `deny` wins.
- `plugins.entries.<id>.apiKey`: plugin-level API key convenience field (when supported by the plugin).
- `plugins.entries.<id>.env`: plugin-scoped env var map.
- `plugins.entries.<id>.hooks.allowPromptInjection`: when `false`, core blocks prompt-mutating hooks such as `before_prompt_build`. Applies to native plugin hooks and supported bundle-provided hook directories.
- `plugins.entries.<id>.hooks.allowConversationAccess`: when `true`, trusted non-bundled plugins may read raw conversation content from typed hooks such as `llm_input`, `llm_output`, `before_model_resolve`, `before_agent_reply`, `before_agent_run`, `before_agent_finalize`, and `agent_end`.
- `plugins.entries.<id>.subagent.allowModelOverride`: explicitly trust this plugin to request per-run `provider` and `model` overrides for background subagent runs.
- `plugins.entries.<id>.subagent.allowedModels`: optional allowlist of canonical `provider/model` targets for trusted subagent overrides. Use `"*"` only when you intentionally want to allow any model.
- `plugins.entries.<id>.llm.allowModelOverride`: explicitly trust this plugin to request model overrides for `api.runtime.llm.complete`.
- `plugins.entries.<id>.llm.allowedModels`: optional allowlist of canonical `provider/model` targets for trusted plugin LLM completion overrides. Use `"*"` only when you intentionally want to allow any model.
- `plugins.entries.<id>.llm.allowAgentIdOverride`: explicitly trust this plugin to run `api.runtime.llm.complete` against a non-default agent id.
- `plugins.entries.<id>.config`: plugin-defined config object (validated by native OpenClaw plugin schema when available).
- Channel plugin account/runtime settings live under `channels.<id>` and should be described by the owning plugin's manifest `channelConfigs` metadata, not by a central OpenClaw option registry.

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
  - `apiKey`: Optional Firecrawl API key for higher limits (accepts SecretRef). Falls back to `plugins.entries.firecrawl.config.webSearch.apiKey` or `FIRECRAWL_API_KEY` env var.
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
  - `memory.search.*`
  - `agents.entries.*.memory.search.*` for per-agent overrides
  - `memory.backend`
  - `memory.citations`
  - `memory.qmd.*`
  - `plugins.entries.memory-core.config.dreaming`
- 已启用的 Claude bundle 插件也可以通过 `settings.json` 提供嵌入式 OpenClaw 默认值；OpenClaw 会将这些默认值作为已清理的 agent 设置应用，而不是作为原始 OpenClaw 配置补丁。
- `plugins.slots.memory`：选择当前活跃的 memory plugin id，或使用 `"none"` 以禁用 memory plugins。
- `plugins.slots.contextEngine`：选择当前活跃的 context engine plugin id；默认值为 `"legacy"`，除非你安装并选择了其他 engine。

参见 [Plugins](/tools/plugin)。

---

## Browser

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
- `tabCleanup` controls best-effort periodic cleanup for tracked primary-agent
  tabs after idle time or when a session exceeds its cap. Tracking applies only
  to tabs created by browser tool `action: "open"`; tabs opened by the user or
  with unknown ownership are never adopted. Disabling `tabCleanup` does not disable explicit session lifecycle cleanup.
- Host-local opens with a stable native CDP target and browser identity are
  stored in shared SQLite state and remain eligible across Gateway restarts for
  `/new` and session lifecycle cleanup. Native tool-facing CDP targets also
  remain eligible for idle and cap cleanup after restart. Chrome MCP uses
  process-local target handles, so cold existing-session records wait for
  lifecycle cleanup rather than risking an idle sweep against unattributable
  post-restart activity. OpenClaw verifies the profile and browser instance
  before closing. Chrome MCP auto-connect, missing `/json/version` browser
  identity, and unresolved native targets remain fully process-local, so they
  are not automatically closed after a restart. Older untracked tabs require
  manual closure. Transient failures stay pending for a later retry. See
  [Tab cleanup ownership](/tools/browser#tab-cleanup-ownership).
- `ssrfPolicy.dangerouslyAllowPrivateNetwork` is disabled when unset, so browser navigation stays strict by default.
- Set `ssrfPolicy.dangerouslyAllowPrivateNetwork: true` only when you intentionally trust private-network browser navigation.
- In strict mode, remote CDP profile endpoints (`profiles.*.cdpUrl`) are subject to the same private-network blocking during reachability/discovery checks.
- `ssrfPolicy.allowPrivateNetwork` remains supported as a legacy alias.
- In strict mode, use `ssrfPolicy.hostnameAllowlist` and `ssrfPolicy.allowedHostnames` for explicit exceptions.
- Remote profiles are attach-only (start/stop/reset disabled).
- `profiles.*.cdpUrl` accepts `http://`, `https://`, `ws://`, and `wss://`.
  Use HTTP(S) when you want OpenClaw to discover `/json/version`; use WS(S)
  when your provider gives you a direct DevTools WebSocket URL.
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
    prefs: {
      theme: "claw", // claw | knot | dash | custom
      themeMode: "system", // light | dark | system
      locale: "en",
      chatShowThinking: true,
      chatShowToolCalls: true,
      chatPersistCommentary: true, // Keep commentary after runs in Control UI; does not deliver it to channels
      chatSendShortcut: "enter", // enter | modifier-enter
      chatFollowUpMode: "steer", // steer | queue; omit to use the server queue mode
    },
  },
}
```

- `seamColor`: accent color for native app UI chrome (Talk Mode bubble tint, etc.).
- `assistant`: Control UI identity override. Falls back to active agent identity.
- `prefs`: cross-device operator preferences. This is the canonical home so agents can
  change them through the approval gate and every Control UI client stays in
  sync; browsers mirror the values into local storage for instant boot and keep
  a device-local copy when they cannot write config (viewer scope, offline).
  `chatPersistCommentary` defaults to `true`. Setting it to `false` keeps live
  commentary visible during a run but removes it at completion and prevents new
  Codex commentary from entering the durable transcript mirror. Messaging-channel
  delivery remains separate and unchanged.
  Presentation-only preferences such as advanced-tier visibility, text scale,
  chat width, and live sidebar activity stay browser-local and are configured in Settings.
  Connected clients apply server-side changes live: the gateway broadcasts a
  hash-only `config.changed` event after every persisted config write and
  clients refresh their snapshot (skipped while a local settings draft has
  unsaved edits). Reconnecting clients reconcile on connect.

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
      // allowedOrigins: ["https://control.example.com"], // required for non-loopback Control UI
      // dangerouslyAllowHostHeaderOriginFallback: false, // dangerous Host-header origin fallback mode
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
      commands: {
        allow: ["canvas.navigate"],
        deny: ["system.run"],
      },
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
- `controlUi.dangerouslyAllowHostHeaderOriginFallback`: dangerous mode that enables Host-header origin fallback for deployments that intentionally rely on Host-header origin policy.
- `terminal.enabled`: the admin-scoped operator terminal. Default: `true`; set `false` to opt out. The terminal starts a host PTY in the selected agent workspace, inherits the Gateway process environment, and is refused for agents with `sandbox.mode: "all"`. Disable it on deployments where admin operators should not get a host shell; changing it restarts the Gateway and updates the Control UI content security policy.
- `terminal.shell`: optional shell executable. When unset, OpenClaw uses `$SHELL` on Unix and `%ComSpec%` on Windows.
- `terminal.detachedSessionTimeoutSeconds`: how long a terminal session survives after its connection drops (page reload, laptop sleep), staying reattachable via `terminal.attach` with its recent output replayed. Default: `300`. Set `0` to kill sessions the moment their connection drops. Detached sessions keep running their commands, so shorten this on shared or exposed hosts.
- `remote.transport`: `ssh` (default) or `direct` (ws/wss). For `direct`, `remote.url` must be `wss://` for public hosts; plaintext `ws://` is accepted only for loopback, LAN, link-local, `.local`, `.ts.net`, and Tailscale CGNAT hosts.
- `remote.remotePort`: gateway port on the remote SSH host. Defaults to `18789`; use this when the local tunnel port differs from the remote gateway port.
- `remote.tlsFingerprint`: expected SHA-256 certificate fingerprint for a remote `wss://` Gateway. The macOS app applies it to both operator/control and companion-node connections. Without an explicit value, macOS records a first-use pin only after normal system trust succeeds.
- `remote.sshHostKeyPolicy`: macOS SSH tunnel host-key policy. `strict` is the default and requires an already trusted key. `openssh` is an explicit opt-in to the effective OpenSSH configuration for managed aliases; review matching user and system SSH settings before using it. The macOS app and `configure-remote` reset this policy to `strict` when changing targets unless explicitly opted in again.
- `gateway.remote.token` / `.password` are remote-client credential fields. They do not configure gateway auth by themselves.
- `gateway.push.apns.relay.baseUrl`: base HTTPS URL for the external APNs relay used after relay-backed iOS builds publish registrations to the gateway. Public App Store builds use the hosted OpenClaw relay. Custom relay URLs must match a deliberately separate iOS build/deployment path whose relay URL points at that relay.
- `gateway.push.apns.relay.timeoutMs`: gateway-to-relay send timeout in milliseconds. Defaults to `10000`.
- Relay-backed registrations are delegated to a specific gateway identity. The paired iOS app fetches `gateway.identity.get`, includes that identity in the relay registration, and forwards a registration-scoped send grant to the gateway. Another gateway cannot reuse that stored registration.
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS`: temporary env overrides for the relay config above.
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`: development-only escape hatch for loopback HTTP relay URLs. Production relay URLs should stay on HTTPS.
- `OPENCLAW_HANDSHAKE_TIMEOUT_MS`: optional environment override for the built-in pre-auth Gateway WebSocket handshake timeout.
- `channels.<provider>.healthMonitor.enabled`: per-channel opt-out for health-monitor restarts while keeping the global monitor enabled.
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`: per-account override for multi-account channels. When set, it takes precedence over the channel-level override.
- Local gateway call paths can use `gateway.remote.*` as fallback only when `gateway.auth.*` is unset.
- If `gateway.auth.token` / `gateway.auth.password` is explicitly configured via SecretRef and unresolved, resolution fails closed (no remote fallback masking).
- `trustedProxies`: reverse proxy IPs that terminate TLS or inject forwarded-client headers. Only list proxies you control. Loopback entries are still valid for same-host proxy/local-detection setups (for example Tailscale Serve or a local reverse proxy), but they do **not** make loopback requests eligible for `gateway.auth.mode: "trusted-proxy"`.
- `allowRealIpFallback`: when `true`, the gateway accepts `X-Real-IP` if `X-Forwarded-For` is missing. Default `false` for fail-closed behavior.
- `gateway.nodes.pairing.autoApproveCidrs`: optional CIDR/IP allowlist for auto-approving first-time node device pairing with no requested scopes. It is disabled when unset. This does not auto-approve operator/browser/Control UI/WebChat pairing, and it does not auto-approve role, scope, metadata, or public-key upgrades.
- `gateway.nodes.pairing.sshVerify`: SSH-verified auto-approval for first-time node device pairing (default: enabled). The gateway SSHes back to the pairing host (BatchMode, strict host keys) and approves only on an exact `openclaw node identity` device-key match. Same eligibility floor as `autoApproveCidrs`; probes are limited to private/CGNAT source addresses unless `cidrs` overrides them. Set `false` to disable, or `{ user, identity, timeoutMs, cidrs }` to tune. See [Node pairing](/gateway/pairing#ssh-verified-device-auto-approval-default).
- `gateway.nodes.commands.allow` / `gateway.nodes.commands.deny`: global allow/deny shaping for declared node commands after pairing and platform allowlist evaluation. `commands.allow` is the one-time persistent enable for classified commands such as `camera.snap`, `camera.clip`, `screen.record`, `health.summary`, `sms.search`, and `sms.send`; `commands.deny` removes a command even if a platform default or explicit allow would otherwise include it. Computer and mobile UI control instead rely on default-off node-local enablement plus pairing. iOS Health permission, Android SMS permission, and Gateway command authorization are independent. After a node changes its declared command list, reject and re-approve that device pairing so the gateway stores the updated command snapshot.
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

- `enabled`: enables TLS termination at the gateway listener (HTTPS/WSS) (default: `false`).
- `autoGenerate`: auto-generates a local self-signed cert/key pair when explicit files are not configured; for local/dev use only. Generated files are published without overwriting existing paths and their parent directories are synchronized when the filesystem supports it; unsupported directory flushing emits a structured degraded-durability warning.
- `certPath`: filesystem path to the TLS certificate file.
- `keyPath`: filesystem path to the TLS private key file; keep permission-restricted.
- `caPath`: optional CA bundle path for client verification or custom trust chains.

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

<Note>
  OpenClaw resolves Crabbox's lease-local `sshKey` path through the provider-owned secret resolver and pins the authoritative `sshHostKey` returned by `crabbox inspect --json`. AWS admission also requires `providerMetadata.instanceProfileAttached`. Install Crabbox 0.38.1 or newer for this closed inspection contract.
</Note>

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

---

## Audit

```json5
{
  logging: {
    audit: {
      enabled: true,
      messages: "off", // off | direct | all
    },
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

A root-level `audit` block is retired; the canonical path is `logging.audit`.
The root config object is strict, so an old top-level `audit` block is rejected.
Run [`openclaw doctor --fix`](/cli/doctor) to move it to `logging.audit`.

The running Gateway captures `logging.audit.enabled` and
`logging.audit.messages` at startup;
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
    consoleStyle: "pretty", // pretty | json
    redactPatterns: ["\\bTOKEN\\b\\s*[=:]\\s*([\"']?)([^\\s\"']+)\\1"],
  },
}
```

- Default log file: `/tmp/openclaw/openclaw-YYYY-MM-DD.log`; named profiles use `/tmp/openclaw/openclaw-<profile>-YYYY-MM-DD.log`.
- Set `logging.file` for a stable path.
- `consoleLevel` bumps to `debug` when `--verbose`.
- `consoleStyle`: `"pretty"` or `"json"`. The earlier `"compact"` value is retired; [`openclaw doctor --fix`](/cli/doctor) maps it to `"pretty"`.
- `maxFileBytes`: maximum active log file size in bytes before rotation (positive integer; default: `104857600` = 100 MB). OpenClaw keeps up to five numbered archives beside the active file.
- `redactPatterns`: regexes for best-effort masking of console output, file logs, OTLP log records, and persisted session transcript text. Setting this **replaces** the built-in default patterns for log and transcript output, so include the defaults you still want; omitting them also turns off form-body and structured auth-header redaction. Tool payload redaction is separate and always merges your patterns with the defaults.
- Redaction is always on and is no longer configurable. [`openclaw doctor --fix`](/cli/doctor) removes the retired switch from older config files; the runtime always applies `tools`-mode redaction to logs and transcripts. UI, tool, and diagnostic safety surfaces redact secrets independently of this policy.

---

## 诊断

```json5
{
  diagnostics: {
    enabled: true,
    flags: ["telegram.*"],

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
      captureContent: false,
    },

    cacheTrace: {
      enabled: false,
    },
  },
}
```

- `enabled`: master toggle for instrumentation output (default: `true`).
- `flags`: array of flag strings enabling targeted log output (supports wildcards like `"telegram.*"` or `"*"`).
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
- `otel.captureContent`: opt-in raw content capture for OTEL span attributes. Defaults to off. `true` captures non-system message, tool, and tool-definition content plus OTLP log bodies.
- `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`: environment toggle for latest experimental GenAI inference span shape, including `{gen_ai.operation.name} {gen_ai.request.model}` span names, `CLIENT` span kind, and `gen_ai.provider.name` instead of legacy `gen_ai.system`. By default spans keep `openclaw.model.call` and `gen_ai.system` for compatibility; GenAI metrics use bounded semantic attributes.
- `OPENCLAW_OTEL_PRELOADED=1`: environment toggle for hosts that already registered a global OpenTelemetry SDK. OpenClaw then skips plugin-owned SDK startup/shutdown while keeping diagnostic listeners active.
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`, and `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`: signal-specific endpoint env vars used when the matching config key is unset.
- `cacheTrace.enabled`: log cache trace snapshots for embedded runs (default: `false`).

---

## 更新

```json5
{
  update: {
    channel: "stable", // stable | extended-stable | beta | dev
    checkOnStart: true,

    auto: {
      enabled: false,
    },
  },
}
```

- `channel`: release channel - `"stable"`, `"extended-stable"`, `"beta"`, or `"dev"`. Extended-stable is package-only: foreground commands own installation, while the Gateway may emit read-only update hints.
- `checkOnStart`: check for npm updates when the gateway starts (default: `true`). Stored extended-stable selections use the same read-only hint and 24-hour hint schedule.
- `auto.enabled`: enable background auto-update for stable and beta package installs (default: `false`). Extended-stable never applies automatically.

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
    stream: {
      repeatSuppression: true,
      deliveryMode: "live", // live | final_only
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
- `stream.repeatSuppression`: suppress repeated status/tool lines per turn (default: `true`).
- `stream.deliveryMode`: `"live"` streams incrementally; `"final_only"` buffers until turn terminal events.
- `stream.tagVisibility`: record of tag names to boolean visibility overrides for streamed events.
- `runtime.installCommand`: optional install command to run when bootstrapping an ACP runtime environment.

---

## Wizard

Behavior and metadata for CLI guided setup flows (`onboard`, `configure`, `doctor`):

```json5
{
  wizard: {
    accessMode: "full",
    appRecommendations: true,
    lastRunAt: "2026-01-01T00:00:00.000Z",
    lastRunVersion: "2026.1.4",
    lastRunCommit: "abc1234",
    lastRunCommand: "configure",
    lastRunMode: "local",
    securityAcknowledgedAt: "2026-01-01T00:00:00.000Z",
  },
}
```

- `wizard.accessMode`: discovery consent chosen at the start of guided onboarding. `"full"` (recommended) lets setup look for AI apps, keys, and local runtimes automatically; `"guarded"` makes setup ask once before looking around and offers manual configuration instead.

- `wizard.appRecommendations` defaults to `true`. Set it to `false` to disable installed-application recommendations during guided or classic onboarding and block Gateway `device.apps` access. Node hosts still require their separate, default-off installed-app sharing flag before they advertise the command.

---

## 身份

See `agents.entries` identity fields under [Agent defaults](/gateway/config-agents#agent-defaults).

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
    triggers: {
      enabled: true,
    },
    webhookToken: "replace-with-dedicated-token", // optional bearer token for outbound webhook auth
    sessionRetention: "24h", // duration string or false
  },
}
```

- `enabled`: execute stored cron jobs (default: `true`). Set `false` to pause all cron execution without deleting jobs.
- `triggers.enabled`: also run event-driven cron triggers (default: `false`).
- `sessionRetention`: how long to keep completed isolated cron run sessions before pruning SQLite session rows. Also controls cleanup of archived deleted cron transcripts. Default: `24h`; set `false` to disable.
- Run history automatically keeps the newest 2000 terminal rows per job. Lost rows retain their 24-hour cleanup window.
- `webhookToken`: bearer token used for cron webhook POST delivery (`delivery.mode = "webhook"`), if omitted no auth header is sent.

The `cron` block is strict; `cron.enabled`, `cron.triggers`, `cron.webhookToken`,
`cron.sessionRetention`, and `cron.failureAlert` are the only accepted keys. The
retired `cron.webhook` fallback URL is gone: runtime delivery uses per-job
`delivery.mode = "webhook"` plus `delivery.to`, or `delivery.completionDestination`
when preserving announce delivery. `openclaw doctor --fix` strips a leftover
`cron.webhook` from existing config files.

### `cron.failureAlert`

```json5
{
  cron: {
    failureAlert: {
      enabled: false,
      after: 2,
      cooldownMs: 3600000,
      includeSkipped: false,
      mode: "announce",
      channel: "last",
      to: "channel:C1234567890",
      accountId: "main",
    },
  },
}
```

`cron.failureAlert` owns both the alert threshold and the default failure
destination for every job. The retired `cron.failureDestination` block is merged
into it by [`openclaw doctor --fix`](/cli/doctor).

- `enabled`: enable failure alerts for cron jobs (default: `false`).
- `after`: consecutive failures before an alert fires (positive integer, min: `1`; default: `2`).
- `cooldownMs`: minimum milliseconds between repeated alerts for the same job (non-negative integer; default: `3600000`).
- `includeSkipped`: count consecutive skipped runs toward the alert threshold (default: `false`). Skipped runs are tracked separately and do not affect execution-error backoff.
- `mode`: delivery mode - `"announce"` sends via a channel message; `"webhook"` posts to the target in `to`. Defaults to `"announce"` when enough target data exists.
- `channel`: channel override for announce delivery. `"last"` reuses the last known delivery channel.
- `to`: explicit announce target or webhook URL. Required for webhook mode.
- `accountId`: optional account or channel id to scope alert delivery.
- Per-job `delivery.failureDestination` overrides these global destination fields.
- When neither global nor per-job failure destination is set, jobs that already deliver via `announce` fall back to that primary announce target on failure.
- `delivery.failureDestination` is only supported for `sessionTarget="isolated"` jobs unless the job's primary `delivery.mode` is `"webhook"`.

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

## Media model template variables

Template placeholders expanded in `tools.media.models[].args`:

| Variable                    | Description                                       |
| --------------------------- | ------------------------------------------------- |
| `{{Body}}`                  | Full inbound message body                         |
| `{{RawBody}}`               | Raw body (no history/sender wrappers)             |
| `{{BodyStripped}}`          | Body with group mentions stripped                 |
| `{{From}}`                  | Sender identifier                                 |
| `{{To}}`                    | Destination identifier                            |
| `{{MessageSid}}`            | Channel message id                                |
| `{{SessionId}}`             | Current session UUID                              |
| `{{IsNewSession}}`          | `"true"` when new session created                 |
| `{{AttachmentUrl}}`         | Current attachment URL or provider reference      |
| `{{AttachmentPath}}`        | Current attachment local path                     |
| `{{AttachmentContentType}}` | Current attachment MIME content type              |
| `{{AttachmentDir}}`         | Directory containing `AttachmentPath`             |
| `{{AttachmentIndex}}`       | Zero-based source fact index                      |
| `{{Transcript}}`            | Audio transcript                                  |
| `{{Prompt}}`                | Resolved media prompt for CLI entries             |
| `{{MaxChars}}`              | Resolved max output chars for CLI entries         |
| `{{ChatType}}`              | `"direct"` or `"group"`                           |
| `{{GroupSubject}}`          | Group subject (best effort)                       |
| `{{GroupMembers}}`          | Group members preview (best effort)               |
| `{{SenderName}}`            | Sender display name (best effort)                 |
| `{{SenderE164}}`            | Sender phone number (best effort)                 |
| `{{Provider}}`              | Provider hint (whatsapp, telegram, discord, etc.) |

The legacy `{{MediaPath}}`, `{{MediaUrl}}`, `{{MediaType}}`, and `{{MediaDir}}`
names remain available during the plugin SDK compatibility window but are
deprecated. New configuration should use the `Attachment*` variables.

---

## Config includes (`$include`)

Split config into multiple files:

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
