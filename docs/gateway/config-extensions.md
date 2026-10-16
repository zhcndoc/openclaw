---
summary: "扩展配置：MCP 服务器、技能、插件条目和画布小部件演示器"
read_when:
  - "注册 MCP 服务器或插件条目"
  - "调整技能发现或插件配置"
  - "配置画布小部件呈现器"
title: "配置 — MCP、技能和插件"
---

扩展面：`mcp.*`、`skills.*`、`plugins.*` 和 `canvas.*`。

完整密钥索引和其他顶级配置域，请参见[配置参考](/gateway/configuration-reference)。

## MCP

OpenClaw- 托管的 MCP 服务器定义位于 `mcp.servers` 下，用于嵌入式 OpenClaw 和其他运行时适配器。 `openclaw mcp list`、`show`、`set` 和 `unset` 无需连接到服务器即可管理此块。 Fetch 示例需要 [`uv`/`uvx`](https://docs.astral.sh/uv/getting-started/installation/).

```json5
{
  mcp: {
    servers: {
      docs: {
        command: "uvx",
        args: ["mcp-server-fetch"],
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
          identity: "per-requester", // shared | per-requester; default: shared
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

- `mcp.servers`：公开配置的 MCP 工具的运行时的命名 stdio 或远程 MCP 服务器定义。远程条目使用`transport: "streamable-http"`或`transport: "sse"`； `type: "http"` 是 CLI-native 别名，`openclaw mcp set` 和 `openclaw doctor --fix` 标准化为当前 `transport` 字段。
- `mcp.servers.<name>.enabled`：设置 `false` 以保留已保存的服务器定义，同时将其从嵌入式 OpenClaw MCP 发现和工具投影中排除。
- `mcp.servers.<name>.requestTimeoutMs`：每个服务器 MCP 请求超时（以毫秒为单位）（默认 60 秒）。如果未设置，会话开始时列出的工具将使用 10 秒。内置的 HTTP 客户端将标头和正文不活动超时保持至少这么长时间，从而保留更长的传输默认值，而不会对整个 SSE 流施加最后期限。
- `mcp.servers.<name>.connectionTimeoutMs`：每个服务器连接超时（以毫秒为单位）。
- `mcp.servers.<name>.supportsParallelToolCalls`：适配器的可选并发提示，可以选择是否发出并行 MCP 工具调用。
- `mcp.servers.<name>.auth`：为需要 OAuth 的 HTTP MCP 服务器设置 `"oauth"`。运行 `openclaw mcp login <name>` 以在 OpenClaw 状态下存储令牌。
- `mcp.servers.<name>.oauth`：可选的 OAuth 范围、重定向 URL 和客户端元数据 URL 覆盖。
- `mcp.servers.<name>.oauth.identity`：凭证所有权。省略它或为操作员管理的凭据设置 `"shared"`；设置 `"per-requester"` 以隔离每个经过身份验证的发件人的凭据。每个请求者 OAuth 需要 HTTP 服务器 URL，不能使用 `oauth.authProfileId`，并且需要 `gateway.publicOrigin` 进行回调。
- `mcp.servers.<name>.sslVerify`、`clientCert`、`clientKey`：HTTP TLS 用于专用端点和相互 TLS 的控制。
- `mcp.servers.<name>.toolFilter`：可选的每服务器工具选择。 `include` 将发现的 MCP 工具限制为匹配名称； `exclude` 隐藏匹配的名称。条目是精确的 MCP 工具名称或简单的 `*` 通配符。具有资源或提示的服务器还会生成实用工具名称（`resources_list`、`resources_read`、`prompts_list`、`prompts_get`），并且这些名称使用相同的过滤器。
- `mcp.servers.<name>.codex`：可选的 Codex 应用服务器投影控件。该块是仅适用于 Codex 应用程序服务器线程的 OpenClaw 元数据；它不会影响 ACP 会话、通用 Codex harness配置或其他运行时适配器。非空 `codex.agents` 将服务器限制为列出的 OpenClaw 代理 ID。空的、空白的或无效的作用域代理列表会被配置验证拒绝，并被运行时投影路径忽略，而不是成为全局的。 `codex.defaultToolsApprovalMode` 为该服务器发出 Codex 的本机 `default_tools_approval_mode`。在将本机 `mcp_servers` 配置传递给 Codex 之前，OpenClaw 会剥离 `codex` 块。省略该块，以使用 Codex 的默认 MCP 批准行为为每个 Codex 应用程序服务器代理保留服务器投影。
- 会话范围的 MCP 运行时在轮次之间保持活动状态，包括工具返回后的安静期和后台服务器工作。会话 reset/deletion 或压缩 ID 翻转、显式停止和网关关闭会淘汰它们并终止拥有的 stdio 子项。在幸存会话中完成一轮不会终止其运行时间。没有幸存的运行时会话的分离一次性运行拥有其 MCP 生命周期，并在运行结束时退出其运行时；仅保留的转录本并不能让它们存活。
- `mcp.sessionIdleTtlMs`：可选的空闲驱逐（以毫秒为单位）。未设置或 `0` 会保持上述会话生存期。正有限值选择驱逐；小数向下舍入。例如，`mcp: { sessionIdleTtlMs: 3600000 }` 在不使用一小时后驱逐。启用后，扫描每分钟运行一次，并保留活动租约和待处理的收购。此覆盖不会将运行拥有的运行时扩展到运行结束之外或阻止显式清理。医生保留了这把钥匙。如果早期的 `doctor --fix` 将其删除，请从配置备份中恢复预期值；无法推断删除的值。
- Each 网关最多可接纳 256 个 OpenClaw- 管理的 MCP 运行时，这些运行时具有跨会话和请求者分区的服务器连接，包括正在进行的创建和清理。在限制下，现有运行时保持活动状态，新的准入失败，并显示一条日志消息，指示您停止或重置未使用的会话。运行时可以拥有多个已配置的服务器连接。没有可用 MCP 服务器和仅登录目录的会话不消耗此限制。本机客户端运行时管理自己的边界。
- MCP 配置更改仅停用已更改或删除的服务器连接。不变的服务器保留其传输和工具目录；活动运行可以继续调用其工具和资源。下一回合的发现将从新配置创建更改的服务器。插件重新加载还会废弃被替换插件或其解析器拥有的连接。请求者登录工具在运行时替换后刷新下一条消息。
- Runtime 发现还通过删除受影响服务器的缓存目录来遵守 MCP 工具列表更改通知。通告资源或提示的服务器获取 listing/reading 资源和 listing/fetching 提示的实用工具。重复的工具调用失败会在尝试另一次调用之前短暂暂停受影响的服务器。

有关运行时行为，请参阅 [MCP](/cli/mcp#openclaw-as-an-mcp-client-registry) 和 [CLI 后端](/gateway/cli-backends#bundle-mcp-overlays)。

## <a id="skills"></a> 技能

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/path/to/agent-scripts/skills"],
      allowSymlinkTargets: ["~/path/to/skills"],
    },
    install: {
      preferBrew: true,
      nodeManager: "npm", // npm | pnpm | yarn | bun
      allowUploadedArchives: false,
    },
    entries: {
      "image-lab": {
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // or plaintext string
        env: { GEMINI_API_KEY: "GEMINI_KEY_HERE" },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

- `allowBundled`：仅适用于捆绑技能的可选允许列表（managed/workspace 技能不受影响）。
- `load.extraDirs`：额外共享技能根（最低优先级）。
- `load.allowSymlinkTargets`：当链接位于其配置的源根之外时，技能符号链接可能会解析为受信任的真实目标根。
- `install.preferBrew`：如果为 true，则在 `brew` 可用时首选 Homebrew 安装程序，然后再回退到其他安装程序类型。
- `install.nodeManager`：`metadata.openclaw.install` 规格的节点安装程序首选项 （`npm` | `pnpm` | `yarn` | `bun`）。
- `install.allowUploadedArchives`：允许受信任的 `operator.admin` 网关客户端安装通过 `skills.upload.*` 暂存的私有 zip 存档（默认值： false）。这仅启用上传的存档路径；正常的 ClawHub 安装不需要它。
- `entries.<skillKey>.enabled: false` 即使 bundled/installed. 也会禁用技能
- `entries.<skillKey>.apiKey`：方便技能声明主环境变量（明文字符串或 SecretRef 对象）。
- `limits.maxCandidatesPerRoot`、`limits.maxSkillsLoadedPerSource`、`limits.maxSkillsInPrompt`、`limits.maxSkillsPromptChars`、`limits.maxSkillFileBytes`：绑定技能发现以及面向模型的技能提示。
- 技能工坊设置（`workshop.autonomous.mode`、`workshop.maxSkillBytes`）记录在[技能配置](/tools/skills-config)中。

---

## <a id="plugins"></a> 插件

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: [],
    load: {
      paths: ["~/path/to/oss/voice-call-plugin"],
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

- 从 `~/.openclaw/extensions` 和 `<workspace>/.openclaw/extensions` 下的包或捆绑包目录以及 `plugins.load.paths` 中列出的文件或目录加载。
- 将独立插件文件放在`plugins.load.paths`中；自动发现的扩展根会忽略顶级 `.js`、`.mjs` 和 `.ts` 文件，因此这些根中的帮助程序脚本不会阻止启动。独立文件使用其文件名作为插件 ID，并在通过 `allow` 或 `entries.<id>.enabled` 启用后从网关开始。
- Discovery 接受本机 OpenClaw 插件以及兼容的 Codex 捆绑包和 Claude 捆绑包，包括无清单 Claude 默认布局捆绑包。
- 使用默认的混合重新加载模式，普通插件策略、条目和发现路径更改热重新加载插件运行时。条目配置更改替换受影响的实例。源代码或清单编辑后使用 `openclaw plugins reload <id>`；活动插件仍然可以声明重新启动触发配置前缀。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。
- `allow`：可选的白名单（仅加载列出的插件）。 `deny` 获胜。
- `plugins.entries.<id>.apiKey`：插件级API关键便利字段（当插件支持时）。
- `plugins.entries.<id>.env`：插件范围的环境变量映射。
- `plugins.entries.<id>.hooks.allowPromptInjection`：当`false`时，核心会阻止提示突变钩子，例如`before_prompt_build`。适用于本机插件挂钩和受支持的捆绑包提供的挂钩目录。
- `plugins.entries.<id>.hooks.allowConversationAccess`：当 `true` 时，受信任的非捆绑插件可能会从类型化挂钩读取原始对话内容，例如 `before_model_resolve`、`agent_turn_prepare`、`before_prompt_build`、`before_agent_reply`、`llm_input`、 `llm_output`、`before_agent_run`、`before_agent_finalize` 和 `agent_end`。它还授予有界的、调用范围的 `session_end` 结束转录阅读器；仅元数据 `session_end` 处理程序在没有授权的情况下仍然可以注册。
- `plugins.entries.<id>.subagent.allowModelOverride`：明确信任此插件请求每次运行 `provider` 和 `model` 覆盖后台子代理运行。
- `plugins.entries.<id>.subagent.allowedModels`：用​​于可信子代理覆盖的标准化 `provider/model` 目标的可选白名单。仅当您有意允许任何模型时才使用 `"*"`。
- `plugins.entries.<id>.llm.allowModelOverride`：明确信任此插件来请求 `api.runtime.llm.complete` 的模型覆盖。
- `plugins.entries.<id>.llm.allowedModels`：用​​于可信模型覆盖的规范化 `provider/model` 目标的可选白名单。仅当您有意允许任何模型覆盖时才使用 `"*"`。
- `plugins.entries.<id>.llm.allowedCompletionModels`：应用于每个插件 LLM 完成的可选白名单，包括主机解析的默认值和覆盖。仅当您有意允许任何模型时才使用 `"*"`。
- `plugins.entries.<id>.llm.allowAuthProfileOverride`：明确信任此插件为隔离的 `api.runtime.llm.complete` 执行选择非默认身份验证配置文件。直接 `model@profile` 调用仍受模型覆盖策略的约束。
- `plugins.entries.<id>.llm.allowAgentIdOverride`：明确信任此插件针对非默认代理 ID 运行 `api.runtime.llm.complete`。
- `plugins.entries.<id>.config`：插件定义的配置对象（由本机 OpenClaw 插件模式验证（如果可用））。
- Channel 插件 account/runtime 设置位于 `channels.<id>` 下，应由所属插件的清单 `channelConfigs` 元数据进行描述，而不是由中央 OpenClaw 选项注册表进行描述。

### <a id="codex-harness-plugin-config"></a> Codex harness插件配置

捆绑的 `codex` 插件在 `plugins.entries.codex.config` 下拥有本机 Codex 应用程序服务器harness设置。有关完整配置界面，请参阅 [Codex harness参考 ](/plugins/codex-harness-reference)；有关运行时模型，请参阅 [Codex harness ](/plugins/codex-harness)。

`codexPlugins` 仅适用于选择本机 Codex harness的会话。它不会为 OpenClaw 提供程序运行、ACP 对话绑定或任何非 Codex 工具启用 Codex 插件。

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

- `plugins.entries.codex.config.codexPlugins.enabled`：为 Codex harness 启用原生 Codex plugin/app 支持。默认值：`false`。
- `plugins.entries.codex.config.codexPlugins.allow_all_plugins`：将当前已认证 Codex 账户中所有可访问的 app 暴露给每个新的原生 Codex thread。默认值：`false`。
- `plugins.entries.codex.config.codexPlugins.allow_destructive_actions`：配置的插件应用程序引发的默认破坏性操作策略。使用 `true` 接受安全的 Codex 审批模式而不提示，使用 `false` 拒绝它们，使用 `"auto"` 通过 OpenClaw 插件审批路由 Codex- 所需的审批，或使用 `"ask"` 提示每个插件write/destructive 未经持久批准的行动。 `"ask"` 模式会清除受影响应用程序的持久 Codex 每个工具审批覆盖，并在 Codex 线程启动之前为该应用程序选择人工审批审阅者。默认值：`true`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.enabled`：当全局 `codexPlugins.enabled` 也为 true 时，启用配置的插件条目。默认值：`true` 用于显式条目。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.marketplaceName`：稳定的 marketplace 身份。每个已解析条目都必须与 `pluginName` 一起提供该字段。支持 Codex 已发现的任何有效 marketplace，包括 `"openai-curated"`、`"openai-bundled"`、`"openai-primary-runtime"`、`"workspace-directory"` 以及仓库本地 marketplace 身份。缺少任一身份字段的条目会被忽略。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.pluginName`：稳定的 Codex 插件身份，必须与 `marketplaceName` 一起提供。对于插件标识符带有 marketplace 限定的 marketplace，请使用 Codex 报告的确切身份。`/codex plugins available` 会列出可发现的身份，所有者或 `operator.admin` 可以使用 `/codex plugins install <plugin>@<marketplace>` 安装插件。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.allow_destructive_actions`：按插件设置的破坏性操作覆盖值。省略时使用全局 `allow_destructive_actions` 值。按插件设置的值接受相同的 `true`、`false`、`"auto"` 或 `"ask"` 策略。

每个使用 `"ask"` 的已准入插件应用都会将该应用的审批请求转交给人工审核者。其他应用以及非应用 thread 的审批会继续使用其已配置的审核者，因此混合插件策略不会继承 `"ask"` 行为。

`codexPlugins.enabled` 是全局启用指令。通过迁移编写的显式插件条目保留了持久的策划安装和修复资格。所有者或 `operator.admin` 可以使用 `/codex plugins install <plugin>@<marketplace>` 添加其他发现的插件； Codex 仍然控制上游安装和连接器身份验证。没有确切身份、安装或可访问的应用程序所有权的插件将被阻止。不支持 `plugins["*"]`，并且本地 `marketplacePath` 值故意不是配置字段，因为它们是特定于主机的。请参阅 [Native Codex 插件](/plugins/codex-native-plugins) 了解应用程序服务器版本和准备情况要求。

`app/installed` 就绪检查（包含来自批量 `app/read` 的已授权元数据）会缓存一小时，并在过期时异步刷新。Codex thread 应用配置会在 Codex harness 会话建立时计算，而不是在每一轮计算；更改原生插件配置后，请使用 `/new`、`/reset` 或重启网关。

`codexPlugins.allow_all_plugins` 将每个当前可访问的帐户应用程序快照到每个新的本机 Codex 线程中。它不安装插件或应用程序，并且无法访问的应用程序将被排除在外。帐户应用程序使用全局 `codexPlugins.allow_destructive_actions` 策略。当两个路径中都存在相同的应用程序时，显式插件条目优先。如果无法读取 `app/installed`，则账户范围内的风险将被阻止。

- `plugins.entries.firecrawl.config.webFetch`：Firecrawl Web 获取提供商设置。
  - `apiKey`：可选 Firecrawl API 密钥用于更高限制（接受 SecretRef）。回退到 `plugins.entries.firecrawl.config.webSearch.apiKey` 或 `FIRECRAWL_API_KEY` 环境变量。
  - `baseUrl`：Firecrawl API 基础 URL（默认值：`https://api.firecrawl.dev`；自承载覆盖必须以 private/internal 端点为目标）。
  - `onlyMainContent`：仅从页面中提取主要内容（默认值：`true`）。
  - `maxAgeMs`：最大缓存期限（以毫秒为单位）（默认值：`172800000` / 2 天）。
  - `timeoutSeconds`：抓取请求超时（以秒为单位）（默认值：`60`）。
- `plugins.entries.xai.config.xSearch`：xAI X 搜索（Grok 网页搜索）设置。
  - `enabled`：启用 X 搜索提供程序。
  - `model`：用​​于搜索的 Grok 模型 （e.g. `"grok-4.3"`）。
- `plugins.entries.memory-core.config.dreaming`：记忆做梦设置。有关阶段和阈值，请参阅 [Dreaming](/concepts/dreaming)。
  - `enabled`：做梦主开关（默认`false`）。
  - `frequency`：每次完整梦想扫描的 cron 节奏（默认为 `"0 3 * * *"`）。
  - `model`：可选的梦想日记子代理模型覆盖。需要`plugins.entries.memory-core.subagent.allowModelOverride: true`；与 `allowedModels` 配对以限制目标。模型不可用错误使用会话默认模型重试一次；信任或白名单失败不会默默地回退。
  - phase 策略和阈值是实现细节（不是面向用户的配置键）。
- 完整内存配置位于[内存配置参考](/reference/memory-config)：
  - `memory.search.*`
  - `agents.entries.*.memory.search.*` 用于每个代理覆盖
  - `memory.citations`
  - `plugins.entries.memory-core.config.dreaming`
- Enabled Claude 捆绑插件还可以贡献来自 `settings.json` 的嵌入式 OpenClaw 默认值； OpenClaw 将这些应用为清理后的代理设置，而不是原始 OpenClaw 配置补丁。
- `plugins.slots.memory`：选择活动内存插件 ID，或 `"none"` 禁用内存插件。
- `plugins.slots.contextEngine`：选择活动上下文引擎插件ID；默认为 `"legacy"` 除非您安装并选择其他引擎。

参见 [插件](/tools/plugin)。

---

## <a id="canvas-widget-presenter"></a> Canvas 小部件演示器

```json5
{
  plugins: {
    entries: {
      canvas: {
        config: {
          host: {
            enabled: true, // set false, or use OPENCLAW_SKIP_CANVAS_HOST=1
          },
        },
      },
    },
  },
}
```

- `host.enabled` 是单个 Canvas 主机交换机，默认启用。它控制 `/__openclaw__/canvas/` 下的托管小部件文档和 `/__openclaw__/a2ui/` 下的 A2UI 渲染器资产。
- 仅本地可访问：保持 `gateway.bind: "loopback"`（默认）。
- 非环回绑定：这些路由需要网关身份验证 （token/password/trusted-proxy），与其他网关 HTTP 表面相同。
- Node WebViews 通常不发送身份验证标头； macOS 节点配对并连接后，网关会通告节点范围的 `pluginSurfaceUrls.canvas` 能力 URL。
- Capability URL 绑定到活动节点 WS 会话并很快过期。未使用基于 IP- 的后备。
- `host.enabled` 在默认混合重载模式下通过 Canvas 插件热应用。 `OPENCLAW_SKIP_CANVAS_HOST` 环境覆盖仍需要重新启动网关。

---
