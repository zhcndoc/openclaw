---
summary: "网关配置参考：核心 OpenClaw 键、默认值以及到专用子系统参考文档的链接"
title: "配置参考"
read_when:
  - 你需要精确的字段级配置语义或默认值
  - 你正在验证 channel、model、gateway 或 tool 的配置块
---

`~/.openclaw/openclaw.json` 的核心配置参考。面向任务的概览请参见 [Configuration](/gateway/configuration)。

本文涵盖主要的 OpenClaw 配置面，并在某个子系统拥有更深入的专门参考时提供链接。由 channel 和 plugin 拥有的命令目录，以及深度 memory/QMD 参数，都会放在各自的页面，而不是本文。

代码真相：

- `openclaw config schema` 会打印用于校验和 Control UI 的实时 JSON Schema，并在可用时合并内置/plugin/channel 元数据
- `config.schema.lookup` 会返回一个按路径作用域限定的 schema 节点，供下钻工具使用
- `pnpm config:docs:check` / `pnpm config:docs:gen` 会根据当前 schema 表面对 config-doc 基线哈希进行校验

Agent 查找路径：在修改前，请使用 `gateway` 工具动作 `config.schema.lookup` 获取精确的字段级文档和约束。使用 [Configuration](/gateway/configuration) 获取面向任务的指导，并使用本页了解更广泛的字段映射、默认值以及到子系统参考文档的链接。

专门的深入参考：

- [Memory configuration reference](/reference/memory-config)，用于 `agents.defaults.memorySearch.*`、`memory.qmd.*`、`memory.citations`，以及 `plugins.entries.memory-core.config.dreaming` 下的 dreaming 配置
- [Slash commands](/tools/slash-commands)，用于当前内置 + 捆绑的命令目录
- 各 channel/plugin 自己的页面，用于 channel 特定的命令面

配置格式是 **JSON5**（支持注释和尾随逗号）。所有字段都是可选的——OpenClaw 在省略时会使用安全默认值。

---

## Channels

每个 channel 的配置键已移到专门页面——参见 [Configuration — channels](/gateway/config-channels)，了解 `channels.*`，包括 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 以及其他捆绑 channel（认证、访问控制、多账号、提及门控）。

## Agent defaults, multi-agent, sessions, and messages

已移到专门页面——参见 [Configuration — agents](/gateway/config-agents)，了解：

- `agents.defaults.*`（workspace、model、thinking、heartbeat、memory、media、skills、sandbox）
- `multiAgent.*`（multi-agent 路由和绑定）
- `session.*`（session 生命周期、压缩、剪枝）
- `messages.*`（消息投递、TTS、markdown 渲染）
- `talk.*`（Talk 模式）
  - `talk.speechLocale`：Talk 在 iOS/macOS 上进行语音识别时可选的 BCP 47 locale id
  - `talk.silenceTimeoutMs`：未设置时，Talk 会在发送转写内容前保留平台默认的暂停窗口（macOS 和 Android 为 `700 ms`，iOS 为 `900 ms`）

## Tools and custom providers

工具策略、实验性开关、由 provider 支持的工具配置，以及自定义 provider / base-URL 设置，已移到专门页面——参见 [Configuration — tools and custom providers](/gateway/config-tools)。

## Models

provider 定义、model allowlist，以及自定义 provider 设置，位于 [Configuration — tools and custom providers](/gateway/config-tools#custom-providers-and-base-urls)。
`models` 根节点还负责全局 model catalog 行为。

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
- `models.pricing.enabled`：控制后台 pricing 初始化。当
  `false` 时，Gateway 启动会跳过 OpenRouter 和 LiteLLM pricing-catalog 拉取；
  已配置的 `models.providers.*.models[].cost` 值仍可用于本地成本
  估算。

## MCP

OpenClaw 管理的 MCP server 定义位于 `mcp.servers` 下，并被
内嵌 Pi 和其他运行时适配器消费。`openclaw mcp list`、
`show`、`set` 和 `unset` 命令可在不连接目标 server 的情况下管理该
区块，并用于配置编辑。

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
        headers: {
          Authorization: "Bearer ${MCP_REMOTE_TOKEN}",
        },
      },
    },
  },
}
```

- `mcp.servers`：供暴露已配置 MCP 工具的运行时使用的命名 stdio 或远程 MCP server 定义。
  远程条目使用 `transport: "streamable-http"` 或 `transport: "sse"`；
  `type: "http"` 是 CLI 原生别名，`openclaw mcp set` 和
  `openclaw doctor --fix` 会将其规范化为 canonical 的 `transport` 字段。
- `mcp.sessionIdleTtlMs`：会话作用域内捆绑 MCP 运行时的空闲 TTL。
  一次性嵌入式运行会请求在运行结束时清理；此 TTL 作为长生命周期会话和未来调用者的后备保障。
- `mcp.*` 下的更改会通过释放已缓存的会话 MCP 运行时而热应用。
  下一次工具发现/使用会使用新配置重新创建它们，因此被移除的
  `mcp.servers` 条目会立即被清理，而不是等待空闲 TTL。

有关运行时行为，请参见 [MCP](/cli/mcp#openclaw-as-an-mcp-client-registry) 和
[CLI backends](/gateway/cli-backends#bundle-mcp-overlays)。

## Skills

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills"],
    },
    install: {
      preferBrew: true,
      nodeManager: "npm", // npm | pnpm | yarn | bun
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

- `allowBundled`：仅针对捆绑 skills 的可选 allowlist（不影响 managed/workspace skills）。
- `load.extraDirs`：额外的共享 skill 根目录（优先级最低）。
- `install.preferBrew`：当 `brew` 可用时，若为 true，则优先使用 Homebrew 安装器，然后再回退到其他安装器类型。
- `install.nodeManager`：`metadata.openclaw.install` 规范的 node 安装器偏好（`npm` | `pnpm` | `yarn` | `bun`）。
- `entries.<skillKey>.enabled: false` 会禁用某个 skill，即使它已捆绑/安装。
- `entries.<skillKey>.apiKey`：用于声明主环境变量的 skills 的便捷配置（明文字符串或 SecretRef 对象）。

---

## Plugins

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

- 从 `~/.openclaw/extensions`、`<workspace>/.openclaw/extensions` 以及 `plugins.load.paths` 加载。
- 发现机制接受原生 OpenClaw plugins，以及兼容的 Codex bundles 和 Claude bundles，包括无 manifest 的 Claude 默认布局 bundles。
- **配置变更需要重启 Gateway。**
- `allow`：可选 allowlist（仅加载列出的 plugins）。`deny` 优先级更高。
- `plugins.entries.<id>.apiKey`：plugin 级 API key 便捷字段（当 plugin 支持时）。
- `plugins.entries.<id>.env`：plugin 作用域的环境变量映射。
- `plugins.entries.<id>.hooks.allowPromptInjection`：当为 `false` 时，core 会阻止 `before_prompt_build`，并忽略来自旧版 `before_agent_start` 的提示词变更字段，同时保留旧版 `modelOverride` 和 `providerOverride`。适用于原生 plugin hooks 和受支持的 bundle 提供的 hook 目录。
- `plugins.entries.<id>.hooks.allowConversationAccess`：当为 `true` 时，受信任的非捆绑 plugins 可通过类型化 hooks 读取原始会话内容，例如 `llm_input`、`llm_output`、`before_agent_finalize` 和 `agent_end`。
- `plugins.entries.<id>.subagent.allowModelOverride`：显式信任此 plugin 以请求后台 subagent 运行的每次运行 `provider` 和 `model` 覆盖。
- `plugins.entries.<id>.subagent.allowedModels`：用于受信任 subagent 覆盖的 canonical `provider/model` 目标的可选 allowlist。仅当你有意允许任何 model 时才使用 `"*"`。
- `plugins.entries.<id>.config`：plugin 定义的配置对象（当可用时由原生 OpenClaw plugin schema 校验）。
- Channel plugin 的账号/运行时设置位于 `channels.<id>` 下，应由所属 plugin 的 manifest `channelConfigs` 元数据来描述，而不是由中心化的 OpenClaw 选项注册表来描述。
- `plugins.entries.firecrawl.config.webFetch`：Firecrawl web-fetch provider 设置。
  - `apiKey`：Firecrawl API key（接受 SecretRef）。回退到 `plugins.entries.firecrawl.config.webSearch.apiKey`、旧版 `tools.web.fetch.firecrawl.apiKey`，或 `FIRECRAWL_API_KEY` 环境变量。
  - `baseUrl`：Firecrawl API 基础 URL（默认值：`https://api.firecrawl.dev`）。
  - `onlyMainContent`：仅从页面提取主要内容（默认值：`true`）。
  - `maxAgeMs`：最大缓存年龄，单位毫秒（默认值：`172800000` / 2 天）。
  - `timeoutSeconds`：抓取请求超时时间，单位秒（默认值：`60`）。
- `plugins.entries.xai.config.xSearch`：xAI X Search（Grok web search）设置。
  - `enabled`：启用 X Search provider。
  - `model`：用于搜索的 Grok model（例如 `"grok-4-1-fast"`）。
- `plugins.entries.memory-core.config.dreaming`：memory dreaming 设置。有关 phases 和阈值请参见 [Dreaming](/concepts/dreaming)。
  - `enabled`：dreaming 总开关（默认值 `false`）。
  - `frequency`：每次完整 dreaming 扫描的 cron 频率（默认值 `"0 3 * * *"`）。
  - `model`：可选的 Dream Diary subagent model 覆盖。需要 `plugins.entries.memory-core.subagent.allowModelOverride: true`；可配合 `allowedModels` 限制目标。model 不可用错误会使用会话默认 model 重试一次；信任或 allowlist 失败不会静默回退。
  - phase policy 和阈值属于实现细节（不是面向用户的配置键）。
- 完整的 memory 配置位于 [Memory configuration reference](/reference/memory-config)：
  - `agents.defaults.memorySearch.*`
  - `memory.backend`
  - `memory.citations`
  - `memory.qmd.*`
  - `plugins.entries.memory-core.config.dreaming`
- 已启用的 Claude bundle plugins 也可以从 `settings.json` 提供嵌入式 Pi 默认值；OpenClaw 会将其作为已净化的 agent 设置应用，而不是作为原始 OpenClaw 配置补丁。
- `plugins.slots.memory`：选择当前激活的 memory plugin id，或使用 `"none"` 来禁用 memory plugins。
- `plugins.slots.contextEngine`：选择当前激活的 context engine plugin id；默认值为 `"legacy"`，除非你安装并选择另一个引擎。

参见 [Plugins](/tools/plugin)。

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
    mode: "local", // local | remote
    port: 18789,
    bind: "loopback",
    auth: {
      mode: "token", // none | token | password | trusted-proxy
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
      mode: "off", // off | serve | funnel
      resetOnExit: false,
    },
    controlUi: {
      enabled: true,
      basePath: "/openclaw",
      // root: "dist/control-ui",
      // embedSandbox: "scripts", // strict | scripts | trusted
      // allowExternalEmbedUrls: false, // 危险：允许绝对外部 http(s) 嵌入 URL
      // allowedOrigins: ["https://control.example.com"], // 非回环 Control UI 必需
      // dangerouslyAllowHostHeaderOriginFallback: false, // 危险的 Host 头 origin 回退模式
      // allowInsecureAuth: false,
      // dangerouslyDisableDeviceAuth: false,
    },
    remote: {
      url: "ws://gateway.tailnet:18789",
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
      // 从默认 HTTP 拒绝列表中移除工具
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

- `mode`：`local`（运行网关）或 `remote`（连接到远程网关）。除非为 `local`，否则网关拒绝启动。
- `port`：WS + HTTP 共用的单一多路复用端口。优先级：`--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`。
- `bind`：`auto`、`loopback`（默认）、`lan`（`0.0.0.0`）、`tailnet`（仅 Tailscale IP）或 `custom`。
- **旧版绑定别名**：在 `gateway.bind` 中使用绑定模式值（`auto`、`loopback`、`lan`、`tailnet`、`custom`），不要使用主机别名（`0.0.0.0`、`127.0.0.1`、`localhost`、`::`、`::1`）。
- **Docker 注意**：默认的 `loopback` 绑定会在容器内部监听 `127.0.0.1`。在 Docker 桥接网络（`-p 18789:18789`）下，流量会到达 `eth0`，因此网关不可达。请使用 `--network host`，或者设置 `bind: "lan"`（或 `bind: "custom"` 并配合 `customBindHost: "0.0.0.0"`）以监听所有接口。
- **认证**：默认必需。非回环绑定要求网关认证。实际上这意味着共享 token/password，或使用带身份感知的反向代理并设置 `gateway.auth.mode: "trusted-proxy"`。引导向导默认会生成 token。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`（包括 SecretRef），请显式将 `gateway.auth.mode` 设置为 `token` 或 `password`。当两者都已配置但 mode 未设置时，启动以及服务安装/修复流程会失败。
- `gateway.auth.mode: "none"`：显式的无认证模式。仅用于受信任的本地回环环境；引导提示不会主动提供此模式。
- `gateway.auth.mode: "trusted-proxy"`：将浏览器/用户认证委托给带身份感知的反向代理，并信任来自 `gateway.trustedProxies` 的身份头（见 [Trusted Proxy Auth](/gateway/trusted-proxy-auth)）。默认情况下此模式期望代理来源为**非回环**；同主机回环反向代理需要显式设置 `gateway.auth.trustedProxy.allowLoopback = true`。同主机内部调用者可将 `gateway.auth.password` 作为本地直接回退；`gateway.auth.token` 与 trusted-proxy 模式仍互斥。
- `gateway.auth.allowTailscale`：当为 `true` 时，Tailscale Serve 身份头可以满足 Control UI/WebSocket 认证（通过 `tailscale whois` 验证）。HTTP API 端点**不**使用该 Tailscale 头部认证；它们仍遵循网关的正常 HTTP 认证模式。此无 token 流程假定网关主机是受信任的。`tailscale.mode = "serve"` 时默认为 `true`。
- `gateway.auth.rateLimit`：可选的失败认证限流器。按客户端 IP 和认证范围分别生效（共享密钥与设备 token 独立追踪）。被阻止的尝试返回 `429` + `Retry-After`。
  - 在异步 Tailscale Serve Control UI 路径中，同一 `{scope, clientIp}` 的失败尝试会在失败写入前串行化。因此，同一客户端的并发错误尝试可能会在第二个请求时触发限流，而不是两者都像普通不匹配那样并行通过。
  - `gateway.auth.rateLimit.exemptLoopback` 默认是 `true`；当你有意希望本地主机流量也被限流时设为 `false`（用于测试环境或严格代理部署）。
- 浏览器来源的 WS 认证尝试始终会启用限流，并关闭回环豁免（对基于浏览器的 localhost 暴力破解进行纵深防御）。
- 在回环上，这些浏览器来源的锁定会按归一化后的 `Origin`
  值隔离，因此来自某个 localhost origin 的重复失败不会自动
  锁定另一个 origin。
- `tailscale.mode`：`serve`（仅 tailnet，回环绑定）或 `funnel`（公开，需要认证）。
- `controlUi.allowedOrigins`：Gateway WebSocket 连接的显式浏览器来源允许列表。当预期浏览器客户端来自非回环来源时必须设置。
- `controlUi.dangerouslyAllowHostHeaderOriginFallback`：危险模式，启用 Host 头 origin 回退，适用于刻意依赖 Host 头 origin 策略的部署。
- `remote.transport`：`ssh`（默认）或 `direct`（ws/wss）。对于 `direct`，`remote.url` 必须是 `ws://` 或 `wss://`。
- `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`：客户端进程环境的
  破窗式覆盖选项，允许对受信任的私有网络 IP 使用明文 `ws://`；默认情况下明文仍仅限回环。没有对应的 `openclaw.json`
  配置项，浏览器私有网络配置（如
  `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`）不会影响 Gateway
  WebSocket 客户端。
- `gateway.remote.token` / `.password` 是远程客户端凭据字段。它们本身不会配置网关认证。
- `gateway.push.apns.relay.baseUrl`：官方/TestFlight iOS 构建在将基于中继的注册发布到网关后，所使用的外部 APNs 中继基础 HTTPS URL。此 URL 必须与编译进 iOS 构建中的中继 URL 一致。
- `gateway.push.apns.relay.timeoutMs`：网关到中继的发送超时时间，单位毫秒。默认值为 `10000`。
- 基于中继的注册会委托给特定的网关身份。配对的 iOS 应用会获取 `gateway.identity.get`，将该身份包含在中继注册中，并向网关转发一个注册范围的发送授权。另一个网关不能重用该已存储的注册。
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS`：上面中继配置的临时环境变量覆盖。
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`：仅用于开发的回退开关，允许回环 HTTP 中继 URL。生产环境的中继 URL 应保持 HTTPS。
- `gateway.handshakeTimeoutMs`：预认证 Gateway WebSocket 握手超时时间，单位毫秒。默认：`15000`。当已加载或低性能主机上，本地客户端能连接但启动预热仍在收敛时，可增大该值。
- `gateway.channelHealthCheckMinutes`：通道健康监控间隔，单位分钟。设为 `0` 可全局禁用健康监控重启。默认：`5`。
- `gateway.channelStaleEventThresholdMinutes`：陈旧 socket 阈值，单位分钟。请保持其大于或等于 `gateway.channelHealthCheckMinutes`。默认：`30`。
- `gateway.channelMaxRestartsPerHour`：每个通道/账户在滚动一小时内允许的最大健康监控重启次数。默认：`10`。
- `channels.<provider>.healthMonitor.enabled`：在保持全局监控启用的同时，对单个通道关闭健康监控重启的选项。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：多账户通道的按账户覆盖设置。设置后优先于通道级覆盖。
- 本地网关调用路径仅在 `gateway.auth.*` 未设置时，才可将 `gateway.remote.*` 作为回退。
- 如果通过 SecretRef 显式配置了 `gateway.auth.token` / `gateway.auth.password` 但尚未解析，解析将失败并关闭（不会使用远程回退掩盖问题）。
- `trustedProxies`：终止 TLS 或注入转发客户端头的反向代理 IP。仅列出你控制的代理。回环条目对于同主机代理/本地检测设置仍然有效（例如 Tailscale Serve 或本地反向代理），但它们**不会**使回环请求有资格使用 `gateway.auth.mode: "trusted-proxy"`。
- `allowRealIpFallback`：当为 `true` 时，如果缺少 `X-Forwarded-For`，网关接受 `X-Real-IP`。默认 `false`，以实现失败即关闭的行为。
- `gateway.nodes.pairing.autoApproveCidrs`：可选的 CIDR/IP 允许列表，用于在未请求任何作用域时自动批准首次节点设备配对。未设置时处于禁用状态。这不会自动批准操作者/浏览器/Control UI/WebChat 配对，也不会自动批准角色、作用域、元数据或公钥升级。
- `gateway.nodes.allowCommands` / `gateway.nodes.denyCommands`：在配对及平台允许列表评估之后，对声明的节点命令进行全局允许/拒绝控制。使用 `allowCommands` 可以启用危险节点命令，如 `camera.snap`、`camera.clip` 和 `screen.record`；`denyCommands` 即使平台默认或显式允许包含某命令，也会将其移除。节点更改其声明的命令列表后，应拒绝并重新批准该设备配对，以便网关存储更新后的命令快照。
- `gateway.tools.deny`：对 HTTP `POST /tools/invoke` 额外阻止的工具名称（扩展默认拒绝列表）。
- `gateway.tools.allow`：从默认 HTTP 拒绝列表中移除工具名称。

</Accordion>

### OpenAI 兼容端点

- Chat Completions：默认禁用。通过 `gateway.http.endpoints.chatCompletions.enabled: true` 启用。
- Responses API：`gateway.http.endpoints.responses.enabled`。
- Responses URL 输入加固：
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist`
    空允许列表会被视为未设置；使用 `gateway.http.endpoints.responses.files.allowUrl=false`
    和/或 `gateway.http.endpoints.responses.images.allowUrl=false` 来禁用 URL 抓取。
- 可选的响应加固头：
  - `gateway.http.securityHeaders.strictTransportSecurity`（仅对你控制的 HTTPS origin 设置；见 [Trusted Proxy Auth](/gateway/trusted-proxy-auth#tls-termination-and-hsts)）

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
      mode: "hybrid", // off | restart | hot | hybrid
      debounceMs: 500,
      deferralTimeoutMs: 300000,
    },
  },
}
```

- `mode`：控制配置编辑在运行时如何应用。
  - `"off"`：忽略实时编辑；更改需要显式重启。
  - `"restart"`：配置变更时始终重启网关进程。
  - `"hot"`：在进程内应用更改，无需重启。
  - `"hybrid"`（默认）：先尝试热重载；若需要则回退到重启。
- `debounceMs`：应用配置更改前的防抖窗口，单位 ms（非负整数）。
- `deferralTimeoutMs`：可选的最长等待时间，单位 ms，用于等待进行中的操作完成后再强制重启。省略则使用默认的有界等待（`300000`）；设为 `0` 则无限等待，并定期记录仍在等待的警告。

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
- `hooks.token` 必须与 `gateway.auth.token` **不同**；重复使用 Gateway token 会被拒绝。
- `hooks.path` 不能是 `/`；请使用专用子路径，例如 `/hooks`。
- 如果 `hooks.allowRequestSessionKey=true`，请限制 `hooks.allowedSessionKeyPrefixes`（例如 `["hook:"]`）。
- 如果某个 mapping 或 preset 使用模板化的 `sessionKey`，请设置 `hooks.allowedSessionKeyPrefixes` 和 `hooks.allowRequestSessionKey=true`。静态 mapping key 不需要该显式开启。

**端点：**

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, agentId?, sessionKey?, wakeMode?, deliver?, channel?, to?, model?, thinking?, timeoutSeconds? }`
  - 当 `hooks.allowRequestSessionKey=true` 时，才接受请求负载中的 `sessionKey`（默认：`false`）。
- `POST /hooks/<name>` → 通过 `hooks.mappings` 解析
  - 模板渲染后的 mapping `sessionKey` 值会被视为外部提供，因此同样需要 `hooks.allowRequestSessionKey=true`。

<Accordion title="Mapping 详情">

- `match.path` 匹配 `/hooks` 之后的子路径（例如 `/hooks/gmail` → `gmail`）。
- `match.source` 匹配通用路径的某个负载字段。
- 像 `{{messages[0].subject}}` 这样的模板会从负载中读取。
- `transform` 可以指向一个返回 hook action 的 JS/TS 模块。
  - `transform.module` 必须是相对路径，并且限制在 `hooks.transformsDir` 内（绝对路径和路径遍历会被拒绝）。
- `agentId` 路由到特定 agent；未知 ID 会回退到默认值。
- `allowedAgentIds`：限制显式路由（`*` 或省略 = 允许全部，`[]` = 拒绝全部）。
- `defaultSessionKey`：可选的固定 session key，用于没有显式 `sessionKey` 的 hook agent 运行。
- `allowRequestSessionKey`：允许 `/hooks/agent` 调用方和基于模板的 mapping session key 设置 `sessionKey`（默认：`false`）。
- `allowedSessionKeyPrefixes`：用于显式 `sessionKey` 值（请求 + mapping）的可选前缀允许列表，例如 `["hook:"]`。当任何 mapping 或 preset 使用模板化 `sessionKey` 时，它会变为必需。
- `deliver: true` 会将最终回复发送到某个 channel；`channel` 默认为 `last`。
- `model` 会覆盖本次 hook 运行所用的 LLM（如果已设置模型目录，则必须是允许的）。

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

## Canvas 主机

```json5
{
  canvasHost: {
    root: "~/.openclaw/workspace/canvas",
    liveReload: true,
    // enabled: false, // 或 OPENCLAW_SKIP_CANVAS_HOST=1
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
      mode: "minimal", // minimal | full | off
    },
  },
}
```

- `minimal`（默认）：从 TXT 记录中省略 `cliPath` + `sshPort`。
- `full`：包含 `cliPath` + `sshPort`。
- 当主机名是有效 DNS 标签时，主机名默认使用系统主机名，否则回退为 `openclaw`。可使用 `OPENCLAW_MDNS_HOSTNAME` 覆盖。

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
- `source: "env"` 的 `id` 模式：`^[A-Z][A-Z0-9_]{0,127}$`
- `source: "file"` 的 `id`：绝对 JSON Pointer（例如 `"/providers/openai/apiKey"`）
- `source: "exec"` 的 `id` 模式：`^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
- `source: "exec"` 的 `id` 不能包含 `.` 或 `..` 这类由斜杠分隔的路径段（例如 `a/../b` 会被拒绝）

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
      "openai-codex:personal": { provider: "openai-codex", mode: "oauth" },
    },
    order: {
      anthropic: ["anthropic:default", "anthropic:work"],
      "openai-codex": ["openai-codex:personal"],
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
- 密钥运行时行为以及 `audit/configure/apply` 工具： [Secrets Management](/gateway/secrets)。

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
    consoleStyle: "pretty", // pretty | compact | json
    redactSensitive: "tools", // off | tools
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

- `enabled`：仪表化输出的总开关（默认：`true`）。
- `flags`：启用定向日志输出的标志字符串数组（支持通配符，如 `"telegram.*"` 或 `"*"`）。
- `stuckSessionWarnMs`：当会话仍处于处理状态时，发出卡住会话警告的时长阈值（毫秒）。
- `otel.enabled`：启用 OpenTelemetry 导出管线（默认：`false`）。完整配置、信号目录和隐私模型请参见 [OpenTelemetry 导出](/gateway/opentelemetry)。
- `otel.endpoint`：OTel 导出的收集器 URL。
- `otel.tracesEndpoint` / `otel.metricsEndpoint` / `otel.logsEndpoint`：按信号分别指定的可选 OTLP 端点。设置后仅对对应信号覆盖 `otel.endpoint`。
- `otel.protocol`：`"http/protobuf"`（默认）或 `"grpc"`。
- `otel.headers`：随 OTel 导出请求发送的额外 HTTP/gRPC 元数据头。
- `otel.serviceName`：资源属性的服务名称。
- `otel.traces` / `otel.metrics` / `otel.logs`：启用链路、指标或日志导出。
- `otel.sampleRate`：链路采样率 `0`–`1`。
- `otel.flushIntervalMs`：定期刷新遥测数据的间隔（毫秒）。
- `otel.captureContent`：为 OTEL span 属性启用原始内容捕获的可选项。默认关闭。布尔值 `true` 会捕获非系统消息/工具内容；对象形式可显式启用 `inputMessages`、`outputMessages`、`toolInputs`、`toolOutputs` 和 `systemPrompt`。
- `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`：用于最新实验性 GenAI span 提供程序属性的环境开关。默认情况下，为兼容性，span 会保留旧的 `gen_ai.system` 属性；GenAI 指标使用有界语义属性。
- `OPENCLAW_OTEL_PRELOADED=1`：适用于已经注册全局 OpenTelemetry SDK 的主机的环境开关。此时 OpenClaw 会跳过由插件拥有的 SDK 启动/关闭，同时保持诊断监听器处于活动状态。
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`、`OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` 和 `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`：当对应配置键未设置时使用的按信号端点环境变量。
- `cacheTrace.enabled`：为嵌入式运行记录缓存轨迹快照（默认：`false`）。
- `cacheTrace.filePath`：缓存轨迹 JSONL 的输出路径（默认：`$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`）。
- `cacheTrace.includeMessages` / `includePrompt` / `includeSystem`：控制缓存轨迹输出中包含哪些内容（默认均为 `true`）。

---

## 更新

```json5
{
  update: {
    channel: "stable", // stable | beta | dev
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

- `channel`：npm/git 安装的发布通道 — `"stable"`、`"beta"` 或 `"dev"`。
- `checkOnStart`：在网关启动时检查 npm 更新（默认：`true`）。
- `auto.enabled`：为包安装启用后台自动更新（默认：`false`）。
- `auto.stableDelayHours`：稳定通道自动应用前的最小时延（小时，默认：`6`；最大：`168`）。
- `auto.stableJitterHours`：稳定通道发布扩散的额外窗口时长（小时，默认：`12`；最大：`168`）。
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
      deliveryMode: "live", // live | final_only
      hiddenBoundarySeparator: "paragraph", // none | space | newline | paragraph
      maxOutputChars: 50000,
      maxSessionUpdateChars: 500,
    },

    runtime: {
      ttlMinutes: 30,
    },
  },
}
```

- `enabled`：ACP 的全局功能开关（默认：`true`；设为 `false` 可隐藏 ACP 分发和启动相关入口）。
- `dispatch.enabled`：ACP 会话轮次分发的独立开关（默认：`true`）。设为 `false` 可保留 ACP 命令可用，但阻止执行。
- `backend`：默认 ACP 运行时后端 id（必须与已注册的 ACP 运行时插件匹配）。
  如果设置了 `plugins.allow`，则需要包含后端插件 id（例如 `acpx`），否则内置默认插件不会加载。
- `defaultAgent`：当启动时未指定明确目标时的 ACP 目标代理 id 兜底值。
- `allowedAgents`：允许 ACP 运行时会话使用的代理 id 白名单；为空表示不增加额外限制。
- `maxConcurrentSessions`：同时活跃的 ACP 会话最大数量。
- `stream.coalesceIdleMs`：流式文本的空闲刷新窗口（毫秒）。
- `stream.maxChunkChars`：在拆分流式块投影前的最大块大小。
- `stream.repeatSuppression`：按轮次抑制重复的状态/工具行（默认：`true`）。
- `stream.deliveryMode`：`"live"` 表示增量流式输出；`"final_only"` 表示缓冲直到轮次终止事件。
- `stream.hiddenBoundarySeparator`：隐藏工具事件后、可见文本前的分隔符（默认：`"paragraph"`）。
- `stream.maxOutputChars`：每个 ACP 轮次投影的助手输出最大字符数。
- `stream.maxSessionUpdateChars`：投影的 ACP 状态/更新行最大字符数。
- `stream.tagVisibility`：流式事件标签名到布尔可见性覆盖的记录。
- `runtime.ttlMinutes`：ACP 会话工作进程在可被清理前的空闲 TTL（分钟）。
- `runtime.installCommand`：在引导 ACP 运行时环境时可选执行的安装命令。

---

## CLI

```json5
{
  cli: {
    banner: {
      taglineMode: "off", // random | default | off
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

请参见 [Agent defaults](/gateway/config-agents#agent-defaults) 下 `agents.list` 的身份字段。

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
    maxConcurrentRuns: 2, // cron 分发 + 隔离的 cron 代理轮次执行
    webhook: "https://example.invalid/legacy", // 已弃用的、用于已存储 notify:true 作业的回退项
    webhookToken: "replace-with-dedicated-token", // 用于出站 webhook 认证的可选 bearer token
    sessionRetention: "24h", // duration string 或 false
    runLog: {
      maxBytes: "2mb", // 默认 2_000_000 字节
      keepLines: 2000, // 默认 2000
    },
  },
}
```

- `sessionRetention`：在从 `sessions.json` 中清除前，已完成的隔离 cron 运行会话保留多长时间。也用于清理已归档删除的 cron 转录。默认：`24h`；设为 `false` 可禁用。
- `runLog.maxBytes`：每个运行日志文件（`cron/runs/<jobId>.jsonl`）在清理前的最大大小。默认：`2_000_000` 字节。
- `runLog.keepLines`：触发运行日志清理时保留的最新行数。默认：`2000`。
- `webhookToken`：用于 cron webhook POST 投递（`delivery.mode = "webhook"`）的 bearer token；如果省略，则不会发送认证头。
- `webhook`：已弃用的旧版回退 webhook URL（http/https），仅用于仍具有 `notify: true` 的已存储作业。

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

- `maxAttempts`：一次性作业在瞬态错误时的最大重试次数（默认：`3`；范围：`0`–`10`）。
- `backoffMs`：每次重试的退避延迟数组（毫秒）（默认：`[30000, 60000, 300000]`；1–10 项）。
- `retryOn`：触发重试的错误类型 — `"rate_limit"`、`"overloaded"`、`"network"`、`"timeout"`、`"server_error"`。省略则重试所有瞬态类型。

仅适用于一次性 cron 作业。周期性作业使用单独的失败处理。

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
- `after`：连续失败达到多少次后触发告警（正整数，最小：`1`）。
- `cooldownMs`：同一作业重复告警之间的最小间隔毫秒数（非负整数）。
- `includeSkipped`：将连续跳过的运行计入告警阈值（默认：`false`）。跳过的运行会单独跟踪，不会影响执行错误退避。
- `mode`：投递模式 — `"announce"` 通过频道消息发送；`"webhook"` 发布到配置的 webhook。
- `accountId`：可选的账户或频道 id，用于限定告警投递范围。

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

参见 [Cron Jobs](/automation/cron-jobs)。隔离的 cron 执行会被跟踪为 [后台任务](/automation/tasks)。

---

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

将配置拆分到多个文件中：

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

- 单文件：替换所包含的对象。
- 文件数组：按顺序深度合并（后者覆盖前者）。
- 同级键：在 include 之后合并（覆盖被包含的值）。
- 嵌套 include：最多 10 层。
- 路径：相对于包含它的文件解析，但必须保留在顶级配置目录（`openclaw.json` 的 `dirname`）内。只有当绝对路径/`../` 形式最终仍解析到该边界内时才允许。
- OpenClaw 负责的写入如果只更改由单文件 include 支持的某个顶级部分，则会写回到该包含文件中。例如，`plugins install` 会更新 `plugins: { $include: "./plugins.json5" }` 中的 `plugins.json5`，并保持 `openclaw.json` 不变。
- 根级 includes、include 数组以及带有同级覆盖的 includes 对 OpenClaw 负责的写入是只读的；这些写入会直接失败，而不是将配置扁平化。
- 错误：针对缺失文件、解析错误和循环 includes 提供清晰的消息。

---

_相关：[配置](/gateway/configuration) · [配置示例](/gateway/configuration-examples) · [诊断](/gateway/doctor)_

## 相关

- [配置](/gateway/configuration)
- [配置示例](/gateway/configuration-examples)
