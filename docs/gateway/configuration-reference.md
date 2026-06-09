---
summary: "网关配置参考：核心 OpenClaw 键、默认值以及到专用子系统参考文档的链接"
title: "配置参考"
read_when:
  - 你需要精确的字段级配置语义或默认值
  - 你正在验证 channel、model、gateway 或 tool 的配置块
---

`~/.openclaw/openclaw.json` 的核心配置参考。面向任务的概览请参见 [Configuration](/gateway/configuration)。

本文涵盖主要的 OpenClaw 配置面，并在某个子系统拥有更深入的专门参考时提供链接。由 channel 和 plugin 拥有的命令目录，以及深度 memory/QMD 参数，都会放在各自的页面，而不是本文。

代码事实：

- `openclaw config schema` 会打印用于校验和 Control UI 的实时 JSON Schema，并在可用时合并内置/plugin/channel 元数据
- `config.schema.lookup` 会返回一个按路径作用域限定的 schema 节点，供下钻工具使用
- `pnpm config:docs:check` / `pnpm config:docs:gen` 会根据当前 schema 表面对 config-doc 基线哈希进行校验

Agent 查找路径：在修改前，请使用 `gateway` 工具动作 `config.schema.lookup` 获取精确的字段级文档和约束。使用 [Configuration](/gateway/configuration) 获取面向任务的指导，并使用本页了解更广泛的字段映射、默认值以及到子系统参考文档的链接。

专门的深入参考：

- [Memory configuration reference](/reference/memory-config)，用于 `agents.defaults.memorySearch.*`、`memory.qmd.*`、`memory.citations`，以及 `plugins.entries.memory-core.config.dreaming` 下的 dreaming 配置
- [Slash commands](/tools/slash-commands)，用于当前内置 + 捆绑的命令目录
- 各 channel/plugin 自己的页面，用于 channel 特定的命令面

配置格式为 **JSON5**（允许注释 + 尾随逗号）。所有字段均为可选 - OpenClaw 在省略时会使用安全默认值。

---

## Channels

每个 channel 的配置键已移到专门页面 - 参见
[Configuration - channels](/gateway/config-channels) 了解 `channels.*`，
包括 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 以及其他
捆绑的 channels（认证、访问控制、多账号、提及门控）。

## Agent 默认值、多 Agent、会话和消息

已移到专门页面 - 参见
[Configuration - agents](/gateway/config-agents) 了解：

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

工具策略、实验性开关、provider 支持的工具配置，以及自定义
provider / base-URL 设置已移到专门页面 - 参见
[Configuration - tools and custom providers](/gateway/config-tools)。

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

OpenClaw-managed MCP server definitions live under `mcp.servers` and are
consumed by embedded OpenClaw and other runtime adapters. The `openclaw mcp list`,
`show`, `set`, and `unset` commands manage this block without connecting to the
target server during config edits.

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
        // Optional Codex app-server projection controls.
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
- `mcp.servers.<name>.timeout` / `requestTimeoutMs`: per-server MCP request
  timeout in seconds or milliseconds.
- `mcp.servers.<name>.connectTimeout` / `connectionTimeoutMs`: per-server
  connection timeout in seconds or milliseconds.
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
- `mcp.sessionIdleTtlMs`: idle TTL for session-scoped bundled MCP runtimes.
  One-shot embedded runs request run-end cleanup; this TTL is the backstop for
  long-lived sessions and future callers.
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

- `allowBundled`：仅适用于 bundled skills 的可选 allowlist（不影响 managed/workspace skills）。
- `load.extraDirs`：额外的共享 skill 根目录（优先级最低）。
- `load.allowSymlinkTargets`：受信任的真实目标根目录；当 skill symlink 位于其配置的源根目录之外时，链接可以解析到这些目录。
- `install.preferBrew`：当 `brew` 可用时，优先使用 Homebrew 安装器，然后再回退到其他安装器类型。
- `install.nodeManager`：`metadata.openclaw.install` 规格的 node 安装器偏好（`npm` | `pnpm` | `yarn` | `bun`）。
- `install.allowUploadedArchives`：允许受信任的 `operator.admin` Gateway 客户端安装通过 `skills.upload.*` 暂存的私有 zip 归档（默认：`false`）。这只启用上传归档路径；正常的 ClawHub 安装不需要它。
- `entries.<skillKey>.enabled: false` 即使 skill 已 bundled/installed 也会禁用它。
- `entries.<skillKey>.apiKey`：为声明主环境变量的 skills 提供的便捷配置（明文字符串或 SecretRef 对象）。

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
- `plugins.entries.<id>.hooks.allowPromptInjection`: when `false`, core blocks `before_prompt_build` and ignores prompt-mutating fields from legacy `before_agent_start`, while preserving legacy `modelOverride` and `providerOverride`. Applies to native plugin hooks and supported bundle-provided hook directories.
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

`codexPlugins` applies only to sessions that select the native Codex harness.
It does not enable Codex plugins for OpenClaw provider runs, ACP
conversation bindings, or any non-Codex harness.

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            allow_destructive_actions: true,
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

- `plugins.entries.codex.config.codexPlugins.enabled`：为 Codex harness 启用原生 Codex plugin/app 支持。默认值：`false`。
- `plugins.entries.codex.config.codexPlugins.allow_destructive_actions`：
  迁移后的 plugin app 请求的默认破坏性操作策略。默认值：`true`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.enabled`：当全局 `codexPlugins.enabled` 也为 true 时，启用迁移后的 plugin 条目。默认值：显式条目为 `true`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.marketplaceName`：
  稳定的 marketplace 标识。V1 仅支持 `"openai-curated"`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.pluginName`：来自迁移的稳定 Codex plugin 标识，例如 `"google-calendar"`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.allow_destructive_actions`：
  单个 plugin 的破坏性操作覆盖。省略时，使用全局 `allow_destructive_actions` 值。

`codexPlugins.enabled` 是全局启用指令。由迁移写入的显式 plugin
条目是持久安装和修复资格集合。`plugins["*"]` 不受支持，没有 `install`
开关，且本地 `marketplacePath` 值有意不是配置字段，因为它们是
主机特定的。

`app/list` 就绪性检查会缓存一小时，并在过期时异步刷新。Codex thread app 配置在 Codex harness
session 建立时计算，而不是每一轮都计算；在更改原生 plugin 配置后，请使用 `/new`、`/reset` 或重启 gateway。

- `plugins.entries.firecrawl.config.webFetch`：Firecrawl web-fetch provider 设置。
  - `apiKey`：Firecrawl API key（接受 SecretRef）。回退到 `plugins.entries.firecrawl.config.webSearch.apiKey`、旧版 `tools.web.fetch.firecrawl.apiKey` 或 `FIRECRAWL_API_KEY` 环境变量。
  - `baseUrl`：Firecrawl API base URL（默认：`https://api.firecrawl.dev`；自托管覆盖必须指向私有/内部端点）。
  - `onlyMainContent`：仅从页面提取主要内容（默认：`true`）。
  - `maxAgeMs`：缓存最大年龄，单位毫秒（默认：`172800000` / 2 天）。
  - `timeoutSeconds`：抓取请求超时时间，单位秒（默认：`60`）。
- `plugins.entries.xai.config.xSearch`：xAI X Search（Grok web search）设置。
  - `enabled`：启用 X Search provider。
  - `model`：用于搜索的 Grok model（例如 `"grok-4-1-fast"`）。
- `plugins.entries.memory-core.config.dreaming`：memory dreaming 设置。有关阶段和阈值请参见 [Dreaming](/concepts/dreaming)。
  - `enabled`：主 dreaming 开关（默认 `false`）。
  - `frequency`：每次完整 dreaming sweep 的 cron 频率（默认 `"0 3 * * *"`）。
  - `model`：可选的 Dream Diary subagent model 覆盖。需要 `plugins.entries.memory-core.subagent.allowModelOverride: true`；可配合 `allowedModels` 进行目标限制。model 不可用错误会使用 session 默认 model 重试一次；信任或 allowlist 失败不会静默回退。
  - phase policy 和阈值是实现细节（不是面向用户的配置键）。
- 完整的 memory 配置位于 [Memory configuration reference](/reference/memory-config)：
  - `agents.defaults.memorySearch.*`
  - `memory.backend`
  - `memory.citations`
  - `memory.qmd.*`
  - `plugins.entries.memory-core.config.dreaming`
- Enabled Claude bundle plugins can also contribute embedded OpenClaw defaults from `settings.json`; OpenClaw applies those as sanitized agent settings, not as raw OpenClaw config patches.
- `plugins.slots.memory`: pick the active memory plugin id, or `"none"` to disable memory plugins.
- `plugins.slots.contextEngine`: pick the active context engine plugin id; defaults to `"legacy"` unless you install and select another engine.

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

- `evaluateEnabled: false` 会禁用 `act:evaluate` 和 `wait --fn`。
- `tabCleanup` 会在空闲一段时间后，或会话超过其上限时，回收已跟踪的主代理标签页。将 `idleMinutes: 0` 或 `maxTabsPerSession: 0` 设为 0 可禁用对应的单独清理模式。
- 当未设置时，`ssrfPolicy.dangerouslyAllowPrivateNetwork` 为禁用状态，因此浏览器导航默认保持严格。
- 只有在你明确信任私有网络浏览器导航时，才设置 `ssrfPolicy.dangerouslyAllowPrivateNetwork: true`。
- 在严格模式下，远程 CDP 配置文件端点（`profiles.*.cdpUrl`）在可达性/发现检查期间也会受到相同的私有网络阻止限制。
- `ssrfPolicy.allowPrivateNetwork` 仍作为旧版别名受支持。
- 在严格模式下，使用 `ssrfPolicy.hostnameAllowlist` 和 `ssrfPolicy.allowedHostnames` 来配置显式例外。
- 远程配置文件为仅附加模式（禁止启动/停止/重置）。
- `profiles.*.cdpUrl` 支持 `http://`、`https://`、`ws://` 和 `wss://`。
  当你希望 OpenClaw 发现 `/json/version` 时使用 HTTP(S)；当提供方直接给你 DevTools WebSocket URL 时使用 WS(S)。
- `remoteCdpTimeoutMs` 和 `remoteCdpHandshakeTimeoutMs` 适用于远程和
  `attachOnly` 的 CDP 可达性以及打开标签页请求。受管回环配置文件保留本地 CDP 默认值。
- 如果外部管理的 CDP 服务可通过回环地址访问，请将该配置文件设为 `attachOnly: true`；否则 OpenClaw 会将该回环端口视为本地受管浏览器配置文件，并可能报告本地端口占用错误。
- `existing-session` 配置文件使用 Chrome MCP 而不是 CDP，并且可以附加到
  所选主机或通过已连接的浏览器节点附加。
- `existing-session` 配置文件可以设置 `userDataDir` 来指定某个
  基于 Chromium 的浏览器配置文件，例如 Brave 或 Edge。
- `existing-session` 配置文件保留当前 Chrome MCP 路由限制：
  使用基于快照/引用驱动的操作，而不是 CSS 选择器定位、单文件上传钩子、
  不支持对话框超时覆盖、不支持 `wait --load networkidle`，也不支持
  `responsebody`、PDF 导出、下载拦截或批量操作。
- 本地受管的 `openclaw` 配置文件会自动分配 `cdpPort` 和 `cdpUrl`；仅
  在远程 CDP 场景下显式设置 `cdpUrl`。
- 本地受管配置文件可以设置 `executablePath` 来覆盖该配置文件的全局
  `browser.executablePath`。可用它让一个配置文件运行 Chrome，另一个运行 Brave。
- 本地受管配置文件在进程启动后使用 `browser.localLaunchTimeoutMs` 进行 Chrome CDP HTTP
  发现，并使用 `browser.localCdpReadyTimeoutMs` 进行启动后 CDP WebSocket 就绪检查。
  在较慢的主机上，如果 Chrome 已成功启动但就绪检查与启动过程竞争，则应调高这两个值。两个值都必须为
  介于 1 到 `120000` ms 之间的正整数；无效配置值会被拒绝。
- 自动检测顺序：如果默认浏览器基于 Chromium，则优先默认浏览器 → Chrome → Brave → Edge → Chromium → Chrome Canary。
- `browser.executablePath` 和 `browser.profiles.<name>.executablePath` 在 Chromium 启动前都
  支持将 `~` 和 `~/...` 展开为你的操作系统主目录。
  `existing-session` 配置文件中的按配置文件 `userDataDir` 也会进行波浪号展开。
- 控制服务：仅回环（端口由 `gateway.port` 推导，默认 `18791`）。
- `extraArgs` 会将额外启动标志追加到本地 Chromium 启动参数中（例如
  `--disable-gpu`、窗口大小设置或调试标志）。

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
      // embedSandbox: "scripts", // 严格 | 脚本 | 可信
      // allowExternalEmbedUrls: false, // 危险：允许绝对外部 http(s) 嵌入 URL
      // chatMessageMaxWidth: "min(1280px, 82%)", // 可选的分组聊天消息最大宽度
      // allowedOrigins: ["https://control.example.com"], // 非 loopback Control UI 必填
      // dangerouslyAllowHostHeaderOriginFallback: false, // 危险：Host-header origin 回退模式
      // allowInsecureAuth: false,
      // dangerouslyDisableDeviceAuth: false,
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

- `mode`: `local`（运行网关）或 `remote`（连接到远程网关）。除非是 `local`，否则网关拒绝启动。
- `port`: WS + HTTP 的单一多路复用端口。优先级：`--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`。
- `bind`: `auto`、`loopback`（默认）、`lan`（`0.0.0.0`）、`tailnet`（仅 Tailscale IP）或 `custom`。
- **旧版 bind 别名**：请在 `gateway.bind` 中使用绑定模式值（`auto`、`loopback`、`lan`、`tailnet`、`custom`），不要使用主机别名（`0.0.0.0`、`127.0.0.1`、`localhost`、`::`、`::1`）。
- **Docker 说明**：默认的 `loopback` 绑定会在容器内部监听 `127.0.0.1`。使用 Docker bridge 网络（`-p 18789:18789`）时，流量到达 `eth0`，因此网关不可访问。请使用 `--network host`，或者将 `bind` 设为 `lan`（或设为 `custom` 并将 `customBindHost` 设为 `0.0.0.0`），以监听所有接口。
- **认证**：默认必需。非 loopback 绑定需要网关认证。实际上这意味着共享令牌/密码，或使用具备身份感知能力的反向代理并将 `gateway.auth.mode` 设为 `trusted-proxy`。引导向导默认会生成令牌。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`（包括 SecretRefs），请显式将 `gateway.auth.mode` 设为 `token` 或 `password`。当两者都已配置而模式未设置时，启动以及服务安装/修复流程会失败。
- `gateway.auth.mode: "none"`：显式无认证模式。仅用于受信任的本地 loopback 环境；引导提示中故意不提供此项。
- `gateway.auth.mode: "trusted-proxy"`：将浏览器/用户认证委托给具备身份感知能力的反向代理，并信任来自 `gateway.trustedProxies` 的身份头（参见 [可信代理认证](/gateway/trusted-proxy-auth)）。此模式默认需要来自**非 loopback** 的代理来源；同主机 loopback 反向代理需要显式设置 `gateway.auth.trustedProxy.allowLoopback = true`。同主机内部调用者可以使用 `gateway.auth.password` 作为本地直接回退；`gateway.auth.token` 仍与 trusted-proxy 模式互斥。
- `gateway.auth.allowTailscale`：当为 `true` 时，Tailscale Serve 身份头可满足 Control UI/WebSocket 认证需求（通过 `tailscale whois` 验证）。HTTP API 端点**不会**使用该 Tailscale 头认证；它们仍遵循网关正常的 HTTP 认证模式。这个无令牌流程默认假设网关主机是可信的。在 `tailscale.mode = "serve"` 时默认值为 `true`。
- `gateway.auth.rateLimit`：可选的失败认证限制器。按客户端 IP 和认证作用域分别应用（共享密钥与设备令牌会独立跟踪）。被阻止的尝试返回 `429` + `Retry-After`。
  - 在异步 Tailscale Serve Control UI 路径中，同一 `{scope, clientIp}` 的失败尝试会在失败写入前串行化。因此来自同一客户端的并发错误尝试可能会在第二个请求时触发限制器，而不是两个请求都作为普通不匹配而通过。
  - `gateway.auth.rateLimit.exemptLoopback` 默认是 `true`；当你有意也希望对 localhost 流量进行限流时，将其设为 `false`（用于测试环境或严格代理部署）。
- 浏览器来源的 WS 认证尝试始终会限流，并禁用 loopback 豁免（作为对基于浏览器的 localhost 暴力破解的纵深防御）。
- 在 loopback 上，这些浏览器来源锁定会按归一化后的 `Origin` 值隔离，因此来自某个 localhost origin 的重复失败不会自动锁定另一个 origin。
- `tailscale.mode`：`serve`（仅 tailnet，loopback 绑定）或 `funnel`（公网，需要认证）。
- `tailscale.serviceName`：Serve 模式下可选的 Tailscale Service 名称，例如 `svc:openclaw`。设置后，OpenClaw 会将其传递给 `tailscale serve --service`，从而让 Control UI 通过命名 Service 暴露，而不是通过设备主机名暴露。该值必须使用 Tailscale 的 `svc:<dns-label>` Service 名称格式；启动时会报告派生出的 Service URL。
- `tailscale.preserveFunnel`：当为 `true` 且 `tailscale.mode = "serve"` 时，OpenClaw 会在启动时重新应用 Serve 之前检查 `tailscale funnel status`，如果外部配置的 Funnel 路由已经覆盖网关端口，则跳过它。默认 `false`。
- `controlUi.allowedOrigins`：网关 WebSocket 连接的显式浏览器来源允许列表。公共非 loopback 浏览器来源必须配置。来自 loopback、RFC1918/link-local、`.local`、`.ts.net` 或 Tailscale CGNAT 主机的私有同源 LAN/Tailnet UI 加载，无需启用 Host-header 回退即可接受。
- `controlUi.chatMessageMaxWidth`：Control UI 分组聊天消息的可选最大宽度。接受受约束的 CSS 宽度值，例如 `960px`、`82%`、`min(1280px, 82%)` 和 `calc(100% - 2rem)`。
- `controlUi.dangerouslyAllowHostHeaderOriginFallback`：危险模式，启用 Host-header origin 回退，适用于有意依赖 Host-header origin 策略的部署。
- `remote.transport`：`ssh`（默认）或 `direct`（ws/wss）。对于 `direct`，公共主机上的 `remote.url` 必须是 `wss://`；明文 `ws://` 仅接受用于 loopback、LAN、link-local、`.local`、`.ts.net` 和 Tailscale CGNAT 主机。
- `remote.remotePort`：远程 SSH 主机上的网关端口。默认 `18789`；当本地隧道端口与远程网关端口不同时时使用它。
- `gateway.remote.token` / `.password` 是远程客户端凭据字段。它们本身不会配置网关认证。
- `gateway.push.apns.relay.baseUrl`：官方/TestFlight iOS 构建在向网关发布基于 relay 的注册后所使用的外部 APNs relay 的基础 HTTPS URL。此 URL 必须与编译进 iOS 构建中的 relay URL 匹配。
- `gateway.push.apns.relay.timeoutMs`：网关到 relay 的发送超时，单位毫秒。默认 `10000`。
- 基于 relay 的注册会委托给特定的网关身份。配对的 iOS 应用会获取 `gateway.identity.get`，将该身份包含在 relay 注册中，并向网关转发一个 registration 作用域的发送授权。另一个网关不能重用该已存储的注册。
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS`：上面 relay 配置的临时环境变量覆盖。
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`：仅限开发使用的回退开关，用于 loopback HTTP relay URL。生产环境的 relay URL 应保持 HTTPS。
- `gateway.handshakeTimeoutMs`：认证前的网关 WebSocket 握手超时，单位毫秒。默认：`15000`。当本地主机负载较高或性能较弱，且本地客户端可连接但启动预热仍未稳定时，请增大该值。
- `gateway.channelHealthCheckMinutes`：通道健康监控间隔，单位分钟。设为 `0` 可全局禁用健康监控重启。默认：`5`。
- `gateway.channelStaleEventThresholdMinutes`：陈旧 socket 阈值，单位分钟。请保持其大于或等于 `gateway.channelHealthCheckMinutes`。默认：`30`。
- `gateway.channelMaxRestartsPerHour`：每个通道/账户在滚动一小时内允许的最大健康监控重启次数。默认：`10`。
- `channels.<provider>.healthMonitor.enabled`：在保留全局监控开启的同时，对单个通道禁用健康监控重启。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：多账户通道的按账户覆盖项。设置后，其优先级高于通道级覆盖。
- 本地网关调用路径仅在 `gateway.auth.*` 未设置时，才可将 `gateway.remote.*` 作为回退。
- 如果通过 SecretRef 显式配置了 `gateway.auth.token` / `gateway.auth.password` 但尚未解析，则解析会失败并关闭（不会由远程回退掩盖）。
- `trustedProxies`：终止 TLS 或注入转发客户端头的反向代理 IP。只列出你控制的代理。loopback 条目在同主机代理/本地检测场景中仍然有效（例如 Tailscale Serve 或本地反向代理），但它们**不会**使 loopback 请求符合 `gateway.auth.mode: "trusted-proxy"` 的条件。
- `allowRealIpFallback`：当为 `true` 时，如果缺少 `X-Forwarded-For`，网关会接受 `X-Real-IP`。默认 `false`，以实现失败即关闭。
- `gateway.nodes.pairing.autoApproveCidrs`：用于在首次节点设备配对且未请求任何作用域时自动批准的可选 CIDR/IP 允许列表。未设置时则禁用。它不会自动批准 operator/browser/Control UI/WebChat 配对，也不会自动批准角色、作用域、元数据或公钥升级。
- `gateway.nodes.allowCommands` / `gateway.nodes.denyCommands`：在配对和平台允许列表评估之后，对声明的节点命令进行全局允许/拒绝塑形。使用 `allowCommands` 来启用危险节点命令，例如 `camera.snap`、`camera.clip` 和 `screen.record`；`denyCommands` 即使平台默认或显式允许本应包含某命令，也会将其移除。节点更改其声明的命令列表后，请拒绝并重新批准该设备配对，以便网关存储更新后的命令快照。
- `gateway.tools.deny`：额外阻止 `POST /tools/invoke` 的工具名称（扩展默认拒绝列表）。
- `gateway.tools.allow`：从默认 HTTP 拒绝列表中移除工具名称，适用于 owner/admin 调用者。这不会将具有身份的 `operator.write` 调用者升级为 owner/admin 访问；即使被加入允许列表，`cron`、`gateway` 和 `nodes` 对非 owner 调用者仍不可用。

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

- `mode`：控制运行时如何应用配置编辑。
  - `"off"`：忽略实时编辑；更改需要显式重启。
  - `"restart"`：配置更改时始终重启网关进程。
  - `"hot"`：无需重启，在进程内应用更改。
  - `"hybrid"`（默认）：先尝试热重载；如有需要则回退到重启。
- `debounceMs`：应用配置更改前的防抖窗口，单位 ms（非负整数）。
- `deferralTimeoutMs`：在强制重启或通道热重载前，等待进行中操作的可选最长时间，单位 ms。省略它可使用默认的有界等待（`300000`）；设为 `0` 则无限期等待并定期记录仍在等待的警告。

---

## 钩子

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
        model: "openai/gpt-5.4-mini",
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

- 内置的 Gmail preset 使用 `sessionKey: "hook:gmail:{{messages[0].id}}"`。
- 如果你保留这种按消息路由方式，请设置 `hooks.allowRequestSessionKey: true`，并将 `hooks.allowedSessionKeyPrefixes` 限制为匹配 Gmail 命名空间，例如 `["hook:", "hook:gmail:"]`。
- 如果你需要 `hooks.allowRequestSessionKey: false`，请用静态 `sessionKey` 覆盖该 preset，而不是使用模板化默认值。

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
      model: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
      thinking: "off",
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

- `minimal`（在捆绑的 `bonjour` 插件启用时为默认值）：从 TXT 记录中省略 `cliPath` + `sshPort`。
- `full`：包含 `cliPath` + `sshPort`；LAN 组播广播仍需要启用捆绑的 `bonjour` 插件。
- `off`：在不改变插件启用状态的情况下抑制 LAN 组播广播。
- 捆绑的 `bonjour` 插件会在 macOS 主机上自动启动，并且在 Linux、Windows 和容器化的 Gateway 部署中为可选启用。
- 当主机名是有效的 DNS 标签时，默认使用系统主机名，否则回退为 `openclaw`。可通过 `OPENCLAW_MDNS_HOSTNAME` 覆盖。

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

## 日志

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

- `enabled`：仪表化输出的主开关（默认：`true`）。
- `flags`：用于启用定向日志输出的标志字符串数组（支持如 `"telegram.*"` 或 `"*"` 之类的通配符）。
- `stuckSessionWarnMs`：用于将长时间运行的处理会话分类为 `session.long_running`、`session.stalled` 或 `session.stuck` 的无进度时长阈值（毫秒）。回复、工具、状态、阻塞以及 ACP 进度会重置计时器；在状态不变时，重复的 `session.stuck` 诊断会逐渐退避。
- `stuckSessionAbortMs`：在符合条件的卡住活动工作可被 abort-drained 以进行恢复之前的无进度时长阈值（毫秒）。未设置时，OpenClaw 会使用更安全的扩展嵌入式运行窗口，至少 5 分钟且为 `stuckSessionWarnMs` 的 3 倍。
- `memoryPressureSnapshot`：当内存压力达到 `critical` 时，会捕获一个脱敏的 OOM 前稳定性快照（默认：`false`）。设为 `true` 可在保留正常内存压力事件的同时，增加稳定性捆绑文件的扫描/写入。
- `otel.enabled`：启用 OpenTelemetry 导出流水线（默认：`false`）。完整配置、信号目录和隐私模型请参见 [OpenTelemetry 导出](/gateway/opentelemetry)。
- `otel.endpoint`：OTel 导出的收集器 URL。
- `otel.tracesEndpoint` / `otel.metricsEndpoint` / `otel.logsEndpoint`：按信号区分的可选 OTLP 端点。设置后，它们会仅针对对应信号覆盖 `otel.endpoint`。
- `otel.protocol`：`"http/protobuf"`（默认）或 `"grpc"`。
- `otel.headers`：随 OTel 导出请求发送的额外 HTTP/gRPC 元数据头。
- `otel.serviceName`：资源属性使用的服务名称。
- `otel.traces` / `otel.metrics` / `otel.logs`：启用 trace、metrics 或 log 导出。
- `otel.sampleRate`：trace 采样率 `0`-`1`。
- `otel.flushIntervalMs`：周期性遥测刷新间隔，单位毫秒。
- `otel.captureContent`：为 OTEL span 属性提供的原始内容捕获可选项。默认关闭。布尔值 `true` 会捕获非系统消息/工具内容；对象形式可显式启用 `inputMessages`、`outputMessages`、`toolInputs`、`toolOutputs`、`systemPrompt` 和 `toolDefinitions`。
- `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`：用于最新实验性 GenAI 推理 span 形态的环境开关，包括 `{gen_ai.operation.name} {gen_ai.request.model}` 的 span 名称、`CLIENT` span kind，以及 `gen_ai.provider.name`，替代旧的 `gen_ai.system`。默认情况下，为了兼容性，span 仍保留 `openclaw.model.call` 和 `gen_ai.system`；GenAI 指标使用有界语义属性。
- `OPENCLAW_OTEL_PRELOADED=1`：适用于已注册全局 OpenTelemetry SDK 的主机的环境开关。此时 OpenClaw 会跳过由插件拥有的 SDK 启停，但仍保留诊断监听器处于激活状态。
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`、`OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` 和 `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`：当对应配置键未设置时使用的按信号区分端点环境变量。
- `cacheTrace.enabled`：为嵌入式运行记录日志缓存轨迹快照（默认：`false`）。
- `cacheTrace.filePath`：缓存轨迹 JSONL 的输出路径（默认：`$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`）。
- `cacheTrace.includeMessages` / `includePrompt` / `includeSystem`：控制缓存轨迹输出中包含哪些内容（全部默认：`true`）。

---

## 更新

```json5
{
  update: {
    channel: "stable", // 稳定版 | 测试版 | 开发版
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

- `channel`：npm/git 安装的发布通道 - `"stable"`、`"beta"` 或 `"dev"`。
- `checkOnStart`：网关启动时检查 npm 更新（默认：`true`）。
- `auto.enabled`：为包安装启用后台自动更新（默认：`false`）。
- `auto.stableDelayHours`：稳定版通道自动应用前的最小时延（小时，默认：`6`；最大：`168`）。
- `auto.stableJitterHours`：稳定版通道额外的分批发布窗口（小时，默认：`12`；最大：`168`）。
- `auto.betaCheckIntervalHours`：beta 通道检查运行的频率（小时，默认：`1`；最大：`24`）。

---

## ACP

```json5
{
  acp: {
    enabled: true,
    dispatch: { enabled: true },
    backend: "acpx",
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

- `enabled`：全局 ACP 功能开关（默认：`true`；设为 `false` 可隐藏 ACP dispatch 和 spawn 入口）。
- `dispatch.enabled`：ACP 会话轮次分发的独立开关（默认：`true`）。设为 `false` 可保留 ACP 命令可用，同时阻止执行。
- `backend`：默认 ACP 运行时后端 id（必须与已注册的 ACP 运行时插件匹配）。
  请先安装后端插件，如果设置了 `plugins.allow`，请包含后端插件 id（例如 `acpx`），否则 ACP 后端将不会加载。
- `defaultAgent`：当 spawn 未指定明确目标时使用的 ACP 目标代理 id 备用值。
- `allowedAgents`：允许 ACP 运行时会话使用的代理 id 白名单；为空表示不额外限制。
- `maxConcurrentSessions`：可同时活动的 ACP 会话最大数量。
- `stream.coalesceIdleMs`：流式文本的空闲刷新窗口（毫秒）。
- `stream.maxChunkChars`：在拆分流式块投影之前的最大块大小。
- `stream.repeatSuppression`：按轮次抑制重复的状态/工具行（默认：`true`）。
- `stream.deliveryMode`：`"live"` 表示增量流式输出；`"final_only"` 表示缓冲直到轮次终止事件。
- `stream.hiddenBoundarySeparator`：隐藏工具事件之后、可见文本之前的分隔符（默认：`"paragraph"`）。
- `stream.maxOutputChars`：每个 ACP 轮次可投影的助手输出最大字符数。
- `stream.maxSessionUpdateChars`：投影的 ACP 状态/更新行最大字符数。
- `stream.tagVisibility`：用于流式事件的标签名称到布尔可见性覆盖值的记录。
- `runtime.ttlMinutes`：ACP 会话 worker 在可被清理前的空闲 TTL（分钟）。
- `runtime.installCommand`：引导 ACP 运行时环境时可选执行的安装命令。

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
    maxConcurrentRuns: 8, // 默认；cron 分发 + 隔离的 cron 代理轮次执行
    webhook: "https://example.invalid/legacy", // 用于已存储 notify:true 作业的已弃用回退项
    webhookToken: "replace-with-dedicated-token", // 用于出站 webhook 认证的可选 bearer token
    sessionRetention: "24h", // 持续时间字符串或 false
    runLog: {
      maxBytes: "2mb", // 默认 2_000_000 字节
      keepLines: 2000, // 默认 2000
    },
  },
}
```

- `sessionRetention`: 保留已完成的隔离 cron 运行会话多长时间，然后再从 `sessions.json` 中清理。也控制已归档删除的 cron 转录文本的清理。默认：`24h`；设为 `false` 可禁用。
- `runLog.maxBytes`: 为兼容旧的基于文件的 cron 运行日志而保留。默认：`2_000_000` 字节。
- `runLog.keepLines`: 每个作业保留的最新 SQLite 运行历史行数。默认：`2000`。
- `webhookToken`: 用于 cron webhook `POST` 投递（`delivery.mode = "webhook"`）的 bearer token；若省略则不会发送认证头。
- `webhook`: 已弃用的旧版回退 webhook URL（http/https），`openclaw doctor --fix` 会使用它迁移仍带有 `notify: true` 的已存储作业；运行时投递使用逐作业的 `delivery.mode="webhook"` 加 `delivery.to`，或在保留 announce 投递时使用 `delivery.completionDestination`。

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

## 配置包含（`$include`）

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

- 单个文件：替换其所在的对象。
- 文件数组：按顺序深度合并（后面的覆盖前面的）。
- 同级键：在 include 之后合并（覆盖被包含的值）。
- 嵌套 include：最多 10 层。
- 路径：相对于包含它的文件解析，但必须保留在顶级配置目录内（`openclaw.json` 所在的 `dirname`）。只有当绝对路径或 `../` 形式在解析后仍位于该边界内时才允许。路径不得包含空字节，并且在解析前后都必须严格短于 4096 个字符。
- OpenClaw 所有的写入：如果只更改一个由单文件 include 支持的顶级部分，则会直接写回该包含文件。例如，`plugins install` 会更新 `plugins.json5` 中的 `plugins: { $include: "./plugins.json5" }`，并保持 `openclaw.json` 不变。
- 根级 include、include 数组以及带同级覆盖的 include 对 OpenClaw 所有的写入都是只读的；这些写入会直接失败，而不是将配置拍平。
- 错误：对于缺失文件、解析错误、循环 include、无效路径格式以及长度过长，提供清晰的消息。

---

_另请参见： [配置](/gateway/configuration) · [配置示例](/gateway/configuration-examples) · [诊断](/gateway/doctor)_

## 另请参见

- [配置](/gateway/configuration)
- [配置示例](/gateway/configuration-examples)
