---
summary: "网关配置参考，涵盖核心 OpenClaw 键、默认值以及指向专用子系统参考的链接"
title: "配置参考"
read_when:
  - 需要准确的字段级配置语义或默认值
  - 正在验证频道、模型、网关或工具配置块
---

`~/.openclaw/openclaw.json` 的核心配置参考。有关面向任务的概览，请参见 [配置](/gateway/configuration)。

本页面涵盖主要的 OpenClaw 配置面，并在子系统拥有独立深入参考时提供链接。它**不会**尝试将所有频道/插件拥有的命令目录或所有深层内存/QMD 旋钮内联到一页中。

代码真相：

- `openclaw config schema` 打印用于验证和 Control UI 的实时 JSON Schema，当可用时会合并捆绑/插件/频道元数据
- `config.schema.lookup` 返回一个路径范围的架构节点，用于深入查看工具
- `pnpm config:docs:check` / `pnpm config:docs:gen` 根据当前架构面验证配置文档基线哈希

专门的深入参考：

- [内存配置参考](/reference/memory-config) 用于 `agents.defaults.memorySearch.*`、`memory.qmd.*`、`memory.citations` 以及 `plugins.entries.memory-core.config.dreaming` 下的梦境配置
- [斜杠命令](/tools/slash-commands) 用于当前内置 + 捆绑的命令目录
- 所属频道/插件页面，用于特定频道的命令面

配置格式为 **JSON5**（支持注释和尾逗号）。所有字段均为可选 — 省略时 OpenClaw 使用安全默认值。

---

## 频道（Channels）

每频道配置键已移至专门页面 — 请参见
[配置 — 频道](/gateway/config-channels) 了解 `channels.*`，
包括 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 以及其他
捆绑频道（认证、访问控制、多账号、提及门控）。

## 代理默认值、多代理、会话和消息

已移至专门页面 — 请参见
[配置 — 代理](/gateway/config-agents) 了解：

- `agents.defaults.*`（工作区、模型、思考、心跳、内存、媒体、技能、沙箱）
- `multiAgent.*`（多代理路由和绑定）
- `session.*`（会话生命周期、压缩、修剪）
- `messages.*`（消息传递、TTS、Markdown 渲染）
- `talk.*`（Talk 模式）
  - `talk.silenceTimeoutMs`：未设置时，Talk 会在发送转写前保持平台默认的暂停窗口（macOS 和 Android 为 `700 ms`，iOS 为 `900 ms`）

## 工具和自定义提供方

工具策略、实验性开关、由提供方支持的工具配置，以及自定义
提供方 / 基础 URL 设置已移至专门页面 — 请参见
[配置 — 工具和自定义提供方](/gateway/config-tools)。

## MCP

OpenClaw 管理的 MCP 服务器定义位于 `mcp.servers` 下，并被
嵌入式 Pi 及其他运行时适配器使用。`openclaw mcp list`、
`show`、`set` 和 `unset` 命令可在配置编辑期间管理此块，而无需连接到
目标服务器。

```json5
{
  mcp: {
    // 可选。默认值：600000 ms（10 分钟）。设为 0 以禁用空闲回收。
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

- `mcp.servers`：为暴露已配置 MCP 工具的运行时提供命名的 stdio 或远程 MCP 服务器定义。
  远程条目使用 `transport: "streamable-http"` 或 `transport: "sse"`；
  `type: "http"` 是 CLI 原生别名，`openclaw mcp set` 和
  `openclaw doctor --fix` 会将其规范化为标准的 `transport` 字段。
- `mcp.sessionIdleTtlMs`：会话作用域捆绑 MCP 运行时的空闲 TTL。
  一次性嵌入式运行会请求运行结束清理；此 TTL 是长生命周期会话和未来调用方的兜底。
- `mcp.*` 下的更改会通过释放已缓存的会话 MCP 运行时而热应用。
  下一次工具发现/使用会根据新配置重新创建它们，因此已移除的
  `mcp.servers` 条目会立即被回收，而不是等到空闲 TTL 到期。

运行时行为详见 [MCP](/cli/mcp#openclaw-as-an-mcp-client-registry) 和
[CLI 后端](/gateway/cli-backends#bundle-mcp-overlays)。

## 技能

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
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // 或纯文本字符串
        env: { GEMINI_API_KEY: "GEMINI_KEY_HERE" },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

- `allowBundled`：仅针对捆绑技能的可选允许列表（受管/工作区技能不受影响）。
- `load.extraDirs`：额外的共享技能根目录（优先级最低）。
- `install.preferBrew`：当为 true 时，当 `brew` 可用时优先使用 Homebrew 安装程序，然后再回退到其他安装程序类型。
- `install.nodeManager`：`metadata.openclaw.install` 规范的 node 安装程序偏好（`npm` | `pnpm` | `yarn` | `bun`）。
- `entries.<skillKey>.enabled: false`：即使技能已捆绑/安装，也会禁用该技能。
- `entries.<skillKey>.apiKey`：用于声明主环境变量的技能的便捷字段（纯文本字符串或 SecretRef 对象）。

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

- 从 `~/.openclaw/extensions`、`<workspace>/.openclaw/extensions` 以及 `plugins.load.paths` 加载。
- 发现机制接受原生 OpenClaw 插件以及兼容的 Codex 捆绑包和 Claude 捆绑包，包括无清单的 Claude 默认布局捆绑包。
- **配置更改需要重启网关。**
- `allow`：可选允许列表（仅加载列出的插件）。`deny` 优先。
- `plugins.entries.<id>.apiKey`：插件级 API 密钥便捷字段（当插件支持时）。
- `plugins.entries.<id>.env`：插件作用域的环境变量映射。
- `plugins.entries.<id>.hooks.allowPromptInjection`：当为 `false` 时，核心会阻止 `before_prompt_build`，并忽略旧版 `before_agent_start` 中会修改提示词的字段，同时保留旧版 `modelOverride` 和 `providerOverride`。适用于原生插件钩子和受支持的捆绑包提供的钩子目录。
- `plugins.entries.<id>.hooks.allowConversationAccess`：当为 `true` 时，受信任的非捆绑插件可以通过 `llm_input`、`llm_output`、`before_agent_finalize` 和 `agent_end` 等类型化钩子读取原始对话内容。
- `plugins.entries.<id>.subagent.allowModelOverride`：显式信任此插件，为后台子代理运行请求每次运行的 `provider` 和 `model` 覆盖。
- `plugins.entries.<id>.subagent.allowedModels`：受信任的子代理覆盖可使用的规范 `provider/model` 目标的可选允许列表。仅当你有意允许任意模型时，才使用 `"*"`。
- `plugins.entries.<id>.config`：插件定义的配置对象（当可用时由原生 OpenClaw 插件架构验证）。
- 频道插件账号/运行时设置位于 `channels.<id>` 下，应由所属插件的清单 `channelConfigs` 元数据来描述，而不是由中央 OpenClaw 选项注册表描述。
- `plugins.entries.firecrawl.config.webFetch`：Firecrawl 网页抓取提供方设置。
  - `apiKey`：Firecrawl API 密钥（接受 SecretRef）。回退到 `plugins.entries.firecrawl.config.webSearch.apiKey`、旧版 `tools.web.fetch.firecrawl.apiKey` 或 `FIRECRAWL_API_KEY` 环境变量。
  - `baseUrl`：Firecrawl API 基础 URL（默认：`https://api.firecrawl.dev`）。
  - `onlyMainContent`：仅从页面中提取主要内容（默认：`true`）。
  - `maxAgeMs`：最大缓存年龄，单位为毫秒（默认：`172800000` / 2 天）。
  - `timeoutSeconds`：抓取请求超时，单位为秒（默认：`60`）。
- `plugins.entries.xai.config.xSearch`：xAI X Search（Grok 网页搜索）设置。
  - `enabled`：启用 X Search 提供方。
  - `model`：用于搜索的 Grok 模型（例如 `"grok-4-1-fast"`）。
- `plugins.entries.memory-core.config.dreaming`：内存梦境设置。有关阶段和阈值，请参见 [梦境](/concepts/dreaming)。
  - `enabled`：梦境总开关（默认 `false`）。
  - `frequency`：每次完整梦境扫掠的 cron 频率（默认 `"0 3 * * *"`）。
  - `model`：可选的 Dream Diary 子代理模型覆盖。需要 `plugins.entries.memory-core.subagent.allowModelOverride: true`；可配合 `allowedModels` 以限制目标。
  - 阶段策略和阈值属于实现细节（不是面向用户的配置键）。
- 完整的内存配置位于 [内存配置参考](/reference/memory-config)：
  - `agents.defaults.memorySearch.*`
  - `memory.backend`
  - `memory.citations`
  - `memory.qmd.*`
  - `plugins.entries.memory-core.config.dreaming`
- 启用的 Claude 软件包插件还可以从 `settings.json` 贡献嵌入式 Pi 默认值；OpenClaw 将这些作为清理后的代理设置应用，而不是原始 OpenClaw 配置补丁。
- `plugins.slots.memory`：选择活动的内存插件 ID，或 `"none"` 以禁用内存插件。
- `plugins.slots.contextEngine`：选择活动的上下文引擎插件 ID；除非您安装并选择其他引擎，否则默认为 `"legacy"`。
- `plugins.installs`：CLI 管理的安装元数据，由 `openclaw plugins update` 使用。
  - 包括 `source`、`spec`、`sourcePath`、`installPath`、`version`、`resolvedName`、`resolvedVersion`、`resolvedSpec`、`integrity`、`shasum`、`resolvedAt`、`installedAt`。
  - 将 `plugins.installs.*` 视为管理状态；优先使用 CLI 命令而非手动编辑。

详见 [插件](/tools/plugin)。

---

## 浏览器

```json5
{
  browser: {
    enabled: true,
    evaluateEnabled: true,
    defaultProfile: "user",
    ssrfPolicy: {
      // dangerouslyAllowPrivateNetwork: true, // 仅针对受信任的私有网络访问选择加入
      // allowPrivateNetwork: true, // 旧版别名
      // hostnameAllowlist: ["*.example.com", "example.com"],
      // allowedHostnames: ["localhost"],
    },
    profiles: {
      openclaw: { cdpPort: 18800, color: "#FF4500" },
      work: { cdpPort: 18801, color: "#0066CC" },
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

- `evaluateEnabled: false` 禁用 `act:evaluate` 和 `wait --fn`。
- `ssrfPolicy.dangerouslyAllowPrivateNetwork` 在未设置时会被禁用，因此默认保持严格：浏览器导航会继续受到严格限制。
- 仅当你有意信任私有网络的浏览器导航时，才将 `ssrfPolicy.dangerouslyAllowPrivateNetwork: true` 设置为 true。
- 在严格模式下，远程 CDP 配置文件端点（`profiles.*.cdpUrl`）在可达性/发现检查期间同样会受到私有网络阻断的约束。
- `ssrfPolicy.allowPrivateNetwork` 仍作为遗留别名被支持。
- 在严格模式下，使用 `ssrfPolicy.hostnameAllowlist` 和 `ssrfPolicy.allowedHostnames` 来为明确例外设置规则。
- 远程配置文件为“仅附加”（attach-only）（禁用启动/停止/重置）。
- `profiles.*.cdpUrl` 接受 `http://`、`https://`、`ws://` 和 `wss://`。
  当你希望 OpenClaw 发现 `/json/version` 时使用 HTTP(S)；当你的提供方给你的是直接的 DevTools WebSocket URL 时使用 WS(S)。
- `existing-session` 配置文件使用 Chrome MCP 而不是 CDP，并且可以附加到所选主机，或附加到已连接的浏览器节点。
- `existing-session` 配置文件可以将 `userDataDir` 设置为目标的特定 Chromium 浏览器配置文件（例如 Brave 或 Edge）。
- `existing-session` 配置文件保留当前的 Chrome MCP 路由限制：
  快照/基于 ref 的操作替代 CSS 选择器定位，一文件上传 hooks，不覆盖对话框超时，不使用 `wait --load networkidle`，以及不提供 `responsebody`、PDF 导出、下载拦截或批量操作。
- 本地托管的 `openclaw` 配置文件会自动分配 `cdpPort` 和 `cdpUrl`；仅在远程 CDP 场景下才显式设置 `cdpUrl`。
- 自动检测顺序：基于 Chromium 的默认浏览器 → Chrome → Brave → Edge → Chromium → Chrome Canary。
- 控制服务：仅回环（端口由 `gateway.port` 派生，默认 `18791`）。
- `extraArgs` 会把额外的启动标志追加到本地 Chromium 启动中（例如
  `--disable-gpu`、窗口尺寸设置或调试标志）。

---

## 用户界面

```json5
{
  ui: {
    seamColor: "#FF4500",
    assistant: {
      name: "OpenClaw",
      avatar: "CB", // 表情符号、简短文字、图片 URL 或 data URI
    },
  },
}
```

- `seamColor`：本机应用 UI 主题强调色（例如 Talk 模式气泡染色等）。
- `assistant`：控制 UI 的代理身份覆盖；如果未设置则回退到活动代理 `identity`。

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
      // password: "your-password", // 或环境变量 OPENCLAW_GATEWAY_PASSWORD
      // trustedProxy: { userHeader: "x-forwarded-user" }, // mode=trusted-proxy 专用；详见 /gateway/trusted-proxy-auth
      allowTailscale: true,
      rateLimit: {
        maxAttempts: 10,
        windowMs: 60000,
        lockoutMs: 300000,
        exemptLoopback: true,
      },
    },
    tailscale: {
      mode: "off", // 关闭 | 服务 | 漏斗
      resetOnExit: false,
    },
    controlUi: {
      enabled: true,
      basePath: "/openclaw",
      // root: "dist/control-ui",
      // embedSandbox: "scripts", // 严格 | 脚本 | 受信任
      // allowExternalEmbedUrls: false, // 危险：允许绝对外部 http(s) 嵌入 URL
      // allowedOrigins: ["https://control.example.com"], // 非回环控制界面必需
      // dangerouslyAllowHostHeaderOriginFallback: false, // 危险的 Host-header 源回退模式
      // allowInsecureAuth: false,
      // dangerouslyDisableDeviceAuth: false,
    },
    remote: {
      url: "ws://gateway.tailnet:18789",
      transport: "ssh", // ssh | 直连
      token: "your-token",
      // password: "your-password",
    },
    trustedProxies: ["10.0.0.1"],
    // 可选，默认 false
    allowRealIpFallback: false,
    tools: {
      // 额外 HTTP /tools/invoke 拒绝列表
      deny: ["browser"],
      // 从默认 HTTP 拒绝列表去除工具
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

<Accordion title="网关字段详解">

- `mode`: `local`（运行网关）或 `remote`（连接到远程网关）。网关若非 `local` 将拒绝启动。
- `port`: WS + HTTP 共享的单一多路复用端口。优先级：`--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`。
- `bind`: `auto`、`loopback`（默认）、`lan`（`0.0.0.0`）、`tailnet`（仅 Tailscale IP）或 `custom`。
- **旧版 bind 别名**：在 `gateway.bind` 中使用绑定模式值（`auto`、`loopback`、`lan`、`tailnet`、`custom`），而不是主机别名（`0.0.0.0`、`127.0.0.1`、`localhost`、`::`、`::1`）。
- **Docker 注意**：默认的 `loopback` 绑定会在容器内监听 `127.0.0.1`。使用 Docker 桥接网络（`-p 18789:18789`）时，流量会到达 `eth0`，因此网关不可访问。请使用 `--network host`，或将 `bind` 设为 `"lan"`（或者 `bind: "custom"` 且 `customBindHost: "0.0.0.0"`）以监听所有接口。
- **认证**：默认必需。非 loopback 绑定需要网关认证。实际上这意味着共享令牌/密码，或者通过具备身份感知能力的反向代理并设置 `gateway.auth.mode: "trusted-proxy"`。引导向导默认会生成令牌。
- 如果 `gateway.auth.token` 和 `gateway.auth.password` 都已配置（包括 SecretRef），则必须显式将 `gateway.auth.mode` 设为 `token` 或 `password`。当两者都已配置且 mode 未设置时，启动以及服务安装/修复流程会失败。
- `gateway.auth.mode: "none"`：显式的无认证模式。仅用于受信任的本地 loopback 环境；该模式不会在引导提示中提供。
- `gateway.auth.mode: "trusted-proxy"`：将浏览器/用户认证委托给具备身份感知能力的反向代理，并信任来自 `gateway.trustedProxies` 的身份头（参见 [Trusted Proxy Auth](/gateway/trusted-proxy-auth)）。此模式要求代理源为**非 loopback**；同主机的 loopback 反向代理不满足 trusted-proxy 身份认证。主机内部的同机调用者可使用 `gateway.auth.password` 作为本地直连回退；`gateway.auth.token` 仍然与 trusted-proxy 模式互斥。
- `gateway.auth.allowTailscale`：当为 `true` 时，Tailscale Serve 身份头可以满足 Control UI/WebSocket 认证（通过 `tailscale whois` 验证）。HTTP API 端点**不会**使用该 Tailscale 头认证；它们仍遵循网关正常的 HTTP 认证模式。此无令牌流程假定网关主机是可信的。`tailscale.mode = "serve"` 时默认值为 `true`。
- `gateway.auth.rateLimit`：可选的认证失败限流器。按客户端 IP 和认证作用域分别生效（共享密钥和设备令牌分别跟踪）。被阻止的尝试会返回 `429` + `Retry-After`。
  - 在异步 Tailscale Serve Control UI 路径上，同一 `{scope, clientIp}` 的失败尝试会在失败写入前串行化。因此，同一客户端的并发错误尝试可能会在第二个请求时触发限流，而不是像普通不匹配那样同时竞争通过。
  - `gateway.auth.rateLimit.exemptLoopback` 默认为 `true`；当你有意希望 localhost 流量也被限流时，将其设为 `false`（用于测试环境或严格的代理部署）。
- 浏览器来源的 WS 认证尝试始终会被限流，并禁用 loopback 豁免（针对基于浏览器的 localhost 暴力破解的纵深防御）。
- 在 loopback 上，这些浏览器来源的锁定会按规范化的 `Origin`
  值隔离，因此来自某个 localhost origin 的重复失败不会自动
  将另一个 origin 锁定。
- `tailscale.mode`：`serve`（仅 tailnet，loopback 绑定）或 `funnel`（公开，要求认证）。
- `controlUi.allowedOrigins`：Gateway WebSocket 连接的显式浏览器来源允许列表。当预期浏览器客户端来自非 loopback 来源时必需。
- `controlUi.dangerouslyAllowHostHeaderOriginFallback`：危险模式，启用 Host-header 源回退，适用于那些有意依赖 Host-header 源策略的部署。
- `remote.transport`：`ssh`（默认）或 `direct`（ws/wss）。对于 `direct`，`remote.url` 必须是 `ws://` 或 `wss://`。
- `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`：客户端进程环境
  的紧急开关覆盖，允许对受信任的私有网络
  IP 使用明文 `ws://`；默认仍仅允许 loopback 的明文连接。没有 `openclaw.json`
  对应项，且诸如
  `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 之类的浏览器私有网络配置不会影响 Gateway
  WebSocket 客户端。
- `gateway.remote.token` / `.password` 是远程客户端凭据字段。它们本身不会配置网关认证。
- `gateway.push.apns.relay.baseUrl`：官方/TestFlight iOS 构建在向网关发布 relay-backed 注册后使用的外部 APNs relay 的基础 HTTPS URL。该 URL 必须与编译进 iOS 构建中的 relay URL 匹配。
- `gateway.push.apns.relay.timeoutMs`：网关到 relay 的发送超时，单位毫秒。默认 `10000`。
- relay-backed 注册会委托给特定的网关身份。配对的 iOS 应用会获取 `gateway.identity.get`，将该身份包含在 relay 注册中，并向网关转发一个注册范围的发送授权。另一个网关不能重用该已存储的注册。
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS`：用于上面 relay 配置的临时环境变量覆盖。
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`：仅用于开发的逃生通道，允许 loopback HTTP relay URL。生产环境的 relay URL 应保持 HTTPS。
- `gateway.channelHealthCheckMinutes`：通道健康监控间隔，单位分钟。设为 `0` 可全局禁用健康监控重启。默认：`5`。
- `gateway.channelStaleEventThresholdMinutes`：陈旧 socket 阈值，单位分钟。请保持其大于或等于 `gateway.channelHealthCheckMinutes`。默认：`30`。
- `gateway.channelMaxRestartsPerHour`：每个通道/账户在滚动一小时内的健康监控最大重启次数。默认：`10`。
- `channels.<provider>.healthMonitor.enabled`：在保留全局监控启用的同时，针对单个通道关闭健康监控重启。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：多账户通道的逐账户覆盖。如果设置，它优先于通道级覆盖。
- 仅当 `gateway.auth.*` 未设置时，本地网关调用路径才可将 `gateway.remote.*` 用作回退。
- 如果通过 SecretRef 显式配置了 `gateway.auth.token` / `gateway.auth.password` 但尚未解析，则解析会失败并关闭（不会被远程回退掩盖）。
- `trustedProxies`：终止 TLS 或注入转发客户端头的反向代理 IP。仅列出你控制的代理。loopback 条目对于同主机代理/本地检测设置仍然有效（例如 Tailscale Serve 或本地反向代理），但它们**不会**使 loopback 请求符合 `gateway.auth.mode: "trusted-proxy"` 的条件。
- `allowRealIpFallback`：当为 `true` 时，如果缺少 `X-Forwarded-For`，网关接受 `X-Real-IP`。默认 `false`，以保持失败即关闭。
- `gateway.nodes.pairing.autoApproveCidrs`：可选的 CIDR/IP 允许列表，用于在首次节点设备配对且未请求作用域时自动批准。未设置时禁用。这不会自动批准操作员/浏览器/Control UI/WebChat 配对，也不会自动批准角色、作用域、元数据或公钥升级。
- `gateway.nodes.allowCommands` / `gateway.nodes.denyCommands`：在配对和允许列表评估后，对已声明节点命令进行全局允许/拒绝塑形。
- `gateway.tools.deny`：用于 HTTP `POST /tools/invoke` 的额外工具名称阻止列表（扩展默认拒绝列表）。
- `gateway.tools.allow`：从默认 HTTP 拒绝列表中移除工具名称。

</Accordion>

### OpenAI 兼容端点

- 聊天补全：默认禁用。启用需设置 `gateway.http.endpoints.chatCompletions.enabled: true`。
- Responses API：启用通过 `gateway.http.endpoints.responses.enabled`。
- Responses URL 输入安全强化：
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist`
    空允许列表被视为未设置；使用 `gateway.http.endpoints.responses.files.allowUrl=false`
    和/或 `gateway.http.endpoints.responses.images.allowUrl=false` 禁用 URL 获取。
- 可选的响应安全强化头：
  - `gateway.http.securityHeaders.strictTransportSecurity`（仅对您控制的 HTTPS 来源设置；参见 [Trusted Proxy Auth](/gateway/trusted-proxy-auth#tls-termination-and-hsts)）

### 多实例隔离

单主机运行多个网关，使用唯一端口和状态目录：

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json \
OPENCLAW_STATE_DIR=~/.openclaw-a \
openclaw gateway --port 19001
```

便捷参数：

- `--dev` 使用 `~/.openclaw-dev` 目录及端口 `19001`
- `--profile <name>` 使用 `~/.openclaw-<name>` 目录。

详见 [Multiple Gateways](/gateway/multiple-gateways)。

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
- `autoGenerate`：当未配置显式文件时自动生成本地自签名 cert/key 对；仅用于本地/开发使用。
- `certPath`：TLS 证书文件的文件系统路径。
- `keyPath`：TLS 私钥文件的文件系统路径；保持权限限制。
- `caPath`：可选的 CA bundle 路径，用于客户端验证或自定义信任链。

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

- `mode`：控制配置编辑如何在运行时应用。
  - `"off"`：忽略实时编辑；更改需要显式重启。
  - `"restart"`：配置更改时始终重启网关进程。
  - `"hot"`：在不重启的情况下在进程内应用更改。
  - `"hybrid"`（默认）：首先尝试热重载；如果需要则回退到重启。
- `debounceMs`：应用配置更改前的防抖窗口（毫秒）（非负整数）。
- `deferralTimeoutMs`：强制重启前等待进行中操作的最长时间（毫秒）（默认：`300000` = 5 分钟）。

## 钩子（Hooks）

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
        messageTemplate: "From: {{messages[0].from}}\nSubject: {{messages[0].subject}}\n{{messages[0].snippet}}",
        deliver: true,
        channel: "last",
        model: "openai/gpt-5.4-mini",
      },
    ],
  },
}
```

认证：`Authorization: Bearer <token>` 或 `x-openclaw-token: <token>`。
查询字符串中的钩子令牌将被拒绝。

验证和安全注意事项：

- `hooks.enabled=true` 需要非空的 `hooks.token`。
- `hooks.token` 必须与 `gateway.auth.token` **不同**；重用 Gateway 令牌会被拒绝。
- `hooks.path` 不能是 `/`；请使用专用子路径，例如 `/hooks`。
- 如果 `hooks.allowRequestSessionKey=true`，请限制 `hooks.allowedSessionKeyPrefixes`（例如 `["hook:"]`）。
- 如果某个映射或预设使用了模板化的 `sessionKey`，请设置 `hooks.allowedSessionKeyPrefixes` 和 `hooks.allowRequestSessionKey=true`。静态映射键不需要此显式启用。

**端点：**

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, agentId?, sessionKey?, wakeMode?, deliver?, channel?, to?, model?, thinking?, timeoutSeconds? }`
  - 仅当 `hooks.allowRequestSessionKey=true` 时，才接受请求载荷中的 `sessionKey`（默认：`false`）。
- `POST /hooks/<name>` → 通过 `hooks.mappings` 解析
  - 模板渲染后的映射 `sessionKey` 值被视为外部提供，因此同样需要 `hooks.allowRequestSessionKey=true`。

<Accordion title="映射细节">

- `match.path` 匹配 `/hooks` 后的子路径（例如 `/hooks/gmail` → `gmail`）。
- `match.source` 匹配通用路径的载荷字段。
- 类似 `{{messages[0].subject}}` 的模板会从载荷中读取。
- `transform` 可以指向返回钩子动作的 JS/TS 模块。
  - `transform.module` 必须是相对路径，并且保持在 `hooks.transformsDir` 之内（绝对路径和路径穿越会被拒绝）。
- `agentId` 路由到特定代理；未知 ID 会回退到默认值。
- `allowedAgentIds`：限制显式路由（`*` 或省略 = 允许全部，`[]` = 全部拒绝）。
- `defaultSessionKey`：可选的固定会话键，用于没有显式 `sessionKey` 的钩子代理运行。
- `allowRequestSessionKey`：允许 `/hooks/agent` 调用方和基于模板的映射 `sessionKey` 设置 `sessionKey`（默认：`false`）。
- `allowedSessionKeyPrefixes`：可选的显式 `sessionKey` 值前缀允许列表（请求 + 映射），例如 `["hook:"]`。当任何映射或预设使用模板化 `sessionKey` 时，它会变为必需。
- `deliver: true` 会将最终回复发送到某个频道；`channel` 默认值为 `last`。
- `model` 为本次钩子运行覆盖 LLM（如果已设置模型目录，则必须是允许的）。

</Accordion>

### Gmail 集成

- 内置的 Gmail 预设使用 `sessionKey: "hook:gmail:{{messages[0].id}}"`。
- 如果你保留这种按消息路由，请设置 `hooks.allowRequestSessionKey: true` 并将 `hooks.allowedSessionKeyPrefixes` 限制为与 Gmail 命名空间匹配，例如 `["hook:", "hook:gmail:"]`。
- 如果你需要 `hooks.allowRequestSessionKey: false`，请使用静态 `sessionKey` 覆盖预设，而不是模板化的默认值。

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

- 配置后网关启动时自动触发 `gog gmail watch serve`，设置环境变量 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 可禁用。
- 请勿单独运行 `gog gmail watch serve`。

---

## 画布主机（Canvas host）

```json5
{
  canvasHost: {
    root: "~/.openclaw/workspace/canvas",
    liveReload: true,
    // enabled: false, // 或环境变量 OPENCLAW_SKIP_CANVAS_HOST=1
  },
}
```

- 在网关端口通过 HTTP 发布代理可编辑 HTML/CSS/JS 和 A2UI：
  - `http://<gateway-host>:<gateway.port>/__openclaw__/canvas/`
  - `http://<gateway-host>:<gateway.port>/__openclaw__/a2ui/`
- 仅本地访问：保持 `gateway.bind: "loopback"`（默认）。
- 非回环绑定时，画布路由需网关认证（令牌/密码/信任代理）。
- 节点 WebViews 通常不发送认证头；配对连接后，网关广播节点作用域能力 URL 供画布和 A2UI 访问。
- 能力 URL 绑定当前活动节点 WebSocket 会话，短时过期，无 IP 降级。
- 提供热重载客户端脚本注入。
- 空内容时自动创建启动文件 `index.html`。
- 同时提供 A2UI 界面。
- 修改配置需重启网关。
- 大目录或出现 `EMFILE` 时建议关闭热重载。

---

## 发现（Discovery）

### mDNS（Bonjour）

```json5
{
  discovery: {
    mdns: {
      mode: "minimal", // minimal（最小） | full（完整） | off（关闭）
    },
  },
}
```

- `minimal`（默认）：从 TXT 记录中省略 `cliPath` + `sshPort`。
- `full`：包含 `cliPath` + `sshPort`。
- 当主机名是有效的 DNS 标签时，默认为系统主机名，否则回退为 `openclaw`。可通过 `OPENCLAW_MDNS_HOSTNAME` 覆盖。

### 广域网 DNS-SD

```json5
{
  discovery: {
    wideArea: { enabled: true },
  },
}
```

在 `~/.openclaw/dns/` 下写入单播 DNS-SD 区域。跨网络发现时搭配 DNS 服务器（推荐 CoreDNS）及 Tailscale 分割 DNS。

配置命令：`openclaw dns setup --apply`。

---

## 环境变量（Environment）

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

- 内联环境变量仅在进程环境中未设置对应键时应用。
- `.env` 文件：搜索当前工作目录和 `~/.openclaw/.env`，且不覆盖已有环境变量。
- `shellEnv`：从登录 Shell 配置中导入缺失的预期键。
- 详见 [环境变量](/help/environment) 。

### 环境变量替换

配置字符串中可用 `${VAR_NAME}` 形式引用环境变量：

```json5
{
  gateway: {
    auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" },
  },
}
```

- 仅匹配大写字母、数字和下划线的变量名（正则 `[A-Z_][A-Z0-9_]*`）。
- 缺失或为空的变量会导致加载失败。
- 使用 `$${VAR}` 转义，输出 `${VAR}`。
- 支持与 `$include` 配合使用。

---

## 密钥（Secrets）

密钥引用与明文可兼容。

### `SecretRef`

格式示例：

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

校验规则：

- `provider` 仅允许小写字母、数字、下划线、短横，长度不超过 64。
- `source: "env"` 时，`id` 为大写字母、数字、下划线组成的字符串，最长 128。
- `source: "file"` 时，`id` 为绝对 JSON 指针。
- `source: "exec"` 时，`id` 由数字、字母、点、冒号、斜杠、连字符组成，最长 256。
- `source: "exec"` 的 `id` 不得包含以 `.` 或 `..` 作为路径段的斜杠分隔路径（例如 `a/../b` 会被拒绝）。

### 支持的凭证面

- 参见 [SecretRef 凭证面](/reference/secretref-credential-surface)。
- `secrets apply` 支持针对 `openclaw.json` 凭证路径。
- `auth-profiles.json` 引用包含在运行时解析与审计内。

### 密钥提供商配置

```json5
{
  secrets: {
    providers: {
      default: { source: "env" }, // 可选显式 env 提供商
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

- `file` 提供商支持 `mode: "json"` 和 `mode: "singleValue"`（singleValue 模式下 `id` 必须为 `"value"`）。
- 当 Windows ACL 验证不可用时，文件和 exec 提供商路径会以失败关闭。仅对无法验证且受信任的路径设置 `allowInsecurePath: true`。
- `exec` 提供商要求使用绝对 `command` 路径，并在 stdin/stdout 上使用协议载荷。
- 默认情况下会拒绝符号链接命令路径。设置 `allowSymlinkCommand: true` 可允许符号链接路径，同时验证解析后的目标路径。
- 如果配置了 `trustedDirs`，则受信目录检查将应用于解析后的目标路径。
- `exec` 子进程环境默认最小化；请使用 `passEnv` 显式传递所需变量。
- 密钥引用会在激活时解析为内存快照，之后请求路径只读取该快照。
- 激活时适用活动面过滤：启用的作用域上未解析的引用会导致启动/重载失败，而非活动作用域会被跳过并输出诊断信息。

---

## 认证存储（Auth storage）

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

- 每个代理的配置文件存储于 `<agentDir>/auth-profiles.json`。
- 对于静态凭证模式，`auth-profiles.json` 支持值级引用（`api_key` 使用 `keyRef`，`token` 使用 `tokenRef`）。
- OAuth 模式配置文件（`auth.profiles.<id>.mode = "oauth"`）不支持基于 SecretRef 的 auth-profile 凭证。
- 静态运行时凭证来自内存中解析的快照；发现旧版静态 `auth.json` 条目时会被清除。
- 旧版 OAuth 导入自 `~/.openclaw/credentials/oauth.json`。
- 参见 [OAuth](/concepts/oauth)。
- 密钥运行时行为及 `audit/configure/apply` 工具：[密钥管理](/gateway/secrets)。

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

- `billingBackoffHours`：当配置文件因真实的计费/信用不足错误而失败时的基础退避时间（小时）（默认：`5`）。即使是 `401`/`403` 响应，明确的计费文本也可能归入此类，但提供商特定的文本匹配器仍局限于其所属的提供商（例如 OpenRouter `Key limit exceeded`）。可重试的 HTTP `402`、使用窗口或组织/工作区支出限制消息会保留在 `rate_limit` 路径中。
- `billingBackoffHoursByProvider`：可选的按提供商配置的计费退避小时数覆盖。
- `billingMaxHours`：计费退避指数增长的上限（小时）（默认：`24`）。
- `authPermanentBackoffMinutes`：高置信度 `auth_permanent` 失败的基础退避时间（分钟）（默认：`10`）。
- `authPermanentMaxMinutes`：`auth_permanent` 退避增长的上限（分钟）（默认：`60`）。
- `failureWindowHours`：用于退避计数器的滚动窗口时长（小时）（默认：`24`）。
- `overloadedProfileRotations`：在切换到模型回退之前，针对过载错误的同一提供商认证配置文件轮换的最大次数（默认：`1`）。提供商繁忙形态（如 `ModelNotReadyException`）归入此类。
- `overloadedBackoffMs`：在重试过载提供商/配置文件轮换之前的固定延迟（默认：`0`）。
- `rateLimitedProfileRotations`：在切换到模型回退之前，针对速率限制错误的同一提供商认证配置文件轮换的最大次数（默认：`1`）。该速率限制桶包括提供商形态的文本，如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded` 和 `resource exhausted`。

---

## 日志记录（Logging）

```json5
{
  logging: {
    level: "info",
    file: "/tmp/openclaw/openclaw.log",
    consoleLevel: "info",
    consoleStyle: "pretty", // pretty（美观） | compact（紧凑） | json
    redactSensitive: "tools", // off（关闭） | tools（工具）
    redactPatterns: ["\\bTOKEN\\b\\s*[=:]\\s*([\"']?)([^\\s\"']+)\\1"],
  },
}
```

- 默认日志文件：`/tmp/openclaw/openclaw-YYYY-MM-DD.log`。
- 设置 `logging.file` 以使用稳定路径。
- 使用 `--verbose` 时，`consoleLevel` 会提升为 `debug`。
- `maxFileBytes`：轮转前活动日志文件允许的最大字节大小（正整数；默认：`104857600` = 100 MB）。OpenClaw 会在活动文件旁保留最多五个编号归档。
- `redactSensitive` / `redactPatterns`：用于控制台输出、文件日志、OTLP 日志记录以及持久化会话转录文本的尽力脱敏。`redactSensitive: "off"` 仅禁用这一通用日志/转录策略；UI/工具/诊断安全表面在输出前仍会脱敏处理。

## 诊断（Diagnostics）

```json5
{
  diagnostics: {
    enabled: true,
    flags: ["telegram.*"],
    stuckSessionWarnMs: 30000,

    otel: {
      enabled: false,
      endpoint: "https://otel-collector.example.com:4318",
      protocol: "http/protobuf", // http/protobuf（默认） | grpc
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

- `enabled`：仪表输出的总开关（默认：`true`）。
- `flags`：启用定向日志输出的标志字符串数组（支持通配符，如 `"telegram.*"` 或 `"*"`）。
- `stuckSessionWarnMs`：当会话保持在处理状态时，触发卡住会话警告的年龄阈值（毫秒）。
- `otel.enabled`：启用 OpenTelemetry 导出管道（默认：`false`）。
- `otel.endpoint`：OTel 导出收集器 URL。
- `otel.protocol`：`"http/protobuf"`（默认）或 `"grpc"`。
- `otel.headers`：随 OTel 导出请求发送的额外 HTTP/gRPC 元数据头。
- `otel.serviceName`：资源属性的服务名称。
- `otel.traces` / `otel.metrics` / `otel.logs`：启用 trace、metrics 或 log 导出。
- `otel.sampleRate`：trace 采样率 `0`–`1`。
- `otel.flushIntervalMs`：定期 telemetry 刷新间隔（毫秒）。
- `otel.captureContent`：为 OTEL span 属性按需捕获原始内容。默认关闭。布尔值 `true` 会捕获非系统消息/工具内容；对象形式可显式启用 `inputMessages`、`outputMessages`、`toolInputs`、`toolOutputs` 和 `systemPrompt`。
- `cacheTrace.enabled`：为嵌入式运行记录缓存追踪快照（默认：`false`）。
- `cacheTrace.filePath`：缓存追踪 JSONL 的输出路径（默认：`$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`）。
- `cacheTrace.includeMessages` / `includePrompt` / `includeSystem`：控制缓存追踪输出中包含的内容（默认均为 `true`）。

## 更新（Update）

```json5
{
  update: {
    channel: "stable", // stable（稳定） | beta（测试） | dev（开发）
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

- `channel`：npm/git 安装的发布渠道 — `"stable"`、`"beta"` 或 `"dev"`。
- `checkOnStart`：网关启动时检查 npm 更新（默认：`true`）。
- `auto.enabled`：启用包安装的后台自动更新（默认：`false`）。
- `auto.stableDelayHours`：稳定渠道自动应用前的最小延迟小时数（默认：`6`；最大：`168`）。
- `auto.stableJitterHours`：额外稳定渠道推广散布窗口小时数（默认：`12`；最大：`168`）。
- `auto.betaCheckIntervalHours`：beta 渠道检查运行频率（小时）（默认：`1`；最大：`24`）。

---

## ACP

```json5
{
  acp: {
    enabled: false,
    dispatch: { enabled: true },
    backend: "acpx",
    defaultAgent: "main",
    allowedAgents: ["main", "ops"],
    maxConcurrentSessions: 10,

    stream: {
      coalesceIdleMs: 50,
      maxChunkChars: 1000,
      repeatSuppression: true,
      deliveryMode: "live", // live（实时） | final_only（仅最终）
      hiddenBoundarySeparator: "paragraph", // none（无） | space（空格） | newline（换行） | paragraph（段落）
      maxOutputChars: 50000,
      maxSessionUpdateChars: 500,
    },

    runtime: {
      ttlMinutes: 30,
    },
  },
}
```

- `enabled`：全局 ACP 功能开关（默认：`false`）。
- `dispatch.enabled`：ACP 会话轮次分派的独立开关（默认：`true`）。设为 `false` 可保留 ACP 命令可用性但阻止执行。
- `backend`：默认 ACP 运行时后端 ID（必须匹配已注册的 ACP 运行时插件）。
- `defaultAgent`：当生成未指定明确目标时的备用 ACP 目标代理 ID。
- `allowedAgents`：允许用于 ACP 运行时会话的代理 ID 白名单；空表示无额外限制。
- `maxConcurrentSessions`：最大并发活跃 ACP 会话数。
- `stream.coalesceIdleMs`：流式文本的空闲刷新窗口（毫秒）。
- `stream.maxChunkChars`：分割流式块投影前的最大块大小。
- `stream.repeatSuppression`：抑制每轮重复的状态/工具行（默认：`true`）。
- `stream.deliveryMode`：`"live"` 增量流式传输；`"final_only"` 缓冲直至轮次终止事件。
- `stream.hiddenBoundarySeparator`：隐藏工具事件后可见文本前的分隔符（默认：`"paragraph"`）。
- `stream.maxOutputChars`：每 ACP 轮次投影的最大助手输出字符数。
- `stream.maxSessionUpdateChars`：投影 ACP 状态/更新行的最大字符数。
- `stream.tagVisibility`：流式事件标签名到布尔可见性覆盖的记录。
- `runtime.ttlMinutes`：ACP 会话工作器在符合清理条件前的空闲 TTL（分钟）。
- `runtime.installCommand`：引导 ACP 运行时环境时要运行的可选安装命令。

---

## CLI

```json5
{
  cli: {
    banner: {
      taglineMode: "off", // random（随机） | default（默认） | off（关闭）
    },
  },
}
```

- `cli.banner.taglineMode` 控制横幅标语样式：
  - `"random"`（默认）：循环显示有趣/季节性标语。
  - `"default"`：固定中性标语（所有聊天，尽在 OpenClaw。）。
  - `"off"`：无标语文本，仅显示标题与版本。
- 如需隐藏整条横幅（非仅标语），设置环境变量 `OPENCLAW_HIDE_BANNER=1`。

---

## 向导（Wizard）

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

## 身份（Identity）

参见 [Agent defaults](/gateway/config-agents#agent-defaults) 下的 `agents.list` 身份字段。

---

## 桥接（Bridge，遗留，已移除）

当前版本不再包含 TCP 桥接。节点通过网关 WebSocket 连接。配置中 `bridge.*` 不再认可，验证失败直到删除，可使用 `openclaw doctor --fix` 清除未知键。

<Accordion title="遗留桥接配置（历史参考）">

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

## 定时任务（Cron）

```json5
{
  cron: {
    enabled: true,
    maxConcurrentRuns: 2, // cron 分派 + 隔离 cron 代理轮次执行
    webhook: "https://example.invalid/legacy", // 存储的 notify:true 任务的已弃用后备项
    webhookToken: "replace-with-dedicated-token", // 用于出站 webhook 认证的可选 bearer token
    sessionRetention: "24h", // duration string 或 false
    runLog: {
      maxBytes: "2mb", // 单次运行日志最大字节数，默认 2,000,000
      keepLines: 2000, // 日志裁剪后保留最新行数，默认 2000
    },
  },
}
```

- `sessionRetention`：完成的隔离定时任务会话保存期限，同时控制删除存档的清理。默认 24 小时，设置 `false` 禁用。
- `runLog.maxBytes`：单次运行日志文件大小限制，触发裁剪。默认 2MB。
- `runLog.keepLines`：裁剪后保留的最新日志行数。默认 2000。
- `webhookToken`：用于出站定时任务 Webhook POST 认证的 Bearer Token，若未设置则不发送认证头。
- `webhook`：弃用的旧后备 Webhook（Http/HTTPS），仅用于遗留带 `notify: true` 的任务。

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

- `maxAttempts`：一次性任务在瞬态错误下的最大重试次数（默认：`3`；范围：`0`–`10`）。
- `backoffMs`：每次重试尝试的退避延迟数组（毫秒）（默认：`[30000, 60000, 300000]`；1–10 个条目）。
- `retryOn`：触发重试的错误类型 — `"rate_limit"`、`"overloaded"`、`"network"`、`"timeout"`、`"server_error"`。省略则重试所有瞬态类型。

仅适用于一次性 cron 任务。周期性任务使用单独的失败处理。

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

- `enabled`：为 cron 任务启用失败警报（默认：`false`）。
- `after`：触发警报前的连续失败次数（正整数，最小：`1`）。
- `cooldownMs`：同一任务重复警报之间的最小间隔毫秒数（非负整数）。
- `includeSkipped`：将连续跳过的运行计入警报阈值（默认：`false`）。跳过的运行会单独跟踪，不影响执行错误退避。
- `mode`：交付模式 — `"announce"` 通过频道消息发送；`"webhook"` 发布到已配置的 webhook。
- `accountId`：用于限定警报发送范围的可选账户或频道 ID。

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

- 所有任务定时任务失败通知的默认目的地。
- `mode`：`"announce"` 或 `"webhook"`；当存在足够的目标数据时默认为 `"announce"`。
- `channel`：宣布交付的频道覆盖。`"last"` 重用已知的最后交付频道。
- `to`：明确的宣布目标或 Webhook URL。Webhook 模式必需。
- `accountId`：可选的交付账户覆盖。
- 每个任务的 `delivery.failureDestination` 覆盖此全局默认值。
- 当未设置全局或每任务失败目的地时，已经通过 `announce` 交付的任务在失败时会回退到该主要宣布目标。
- `delivery.failureDestination` 仅支持 `sessionTarget="isolated"` 任务，除非任务的主要 `delivery.mode` 为 `"webhook"`。

参见 [定时任务](/automation/cron-jobs)。隔离的 cron 执行被跟踪为 [后台任务](/automation/tasks)。

---

## 媒体模型模板变量

用于 `tools.media.models[].args` 的模板占位符：

| 变量 | 说明 |
| --- | --- |
| `{{Body}}` | 完整入站消息正文 |
| `{{RawBody}}` | 原始正文（无历史/发送者包装） |
| `{{BodyStripped}}` | 去除群组提及的正文 |
| `{{From}}` | 发送者标识 |
| `{{To}}` | 目标标识 |
| `{{MessageSid}}` | 频道消息 ID |
| `{{SessionId}}` | 当前会话 UUID |
| `{{IsNewSession}}` | 新建会话时为字符串 `"true"` |
| `{{MediaUrl}}` | 入站媒体伪 URL |
| `{{MediaPath}}` | 本地媒体路径 |
| `{{MediaType}}` | 媒体类型（image/audio/document/...） |
| `{{Transcript}}` | 音频转录 |
| `{{Prompt}}` | CLI 条目解析后的媒体提示 |
| `{{MaxChars}}` | CLI 条目解析的最大输出字符数 |
| `{{ChatType}}` | `"direct"` 或 `"group"` |
| `{{GroupSubject}}` | 群组主题（尽力） |
| `{{GroupMembers}}` | 群组成员预览（尽力） |
| `{{SenderName}}` | 发送者显示名（尽力） |
| `{{SenderE164}}` | 发送者电话号码（尽力） |
| `{{Provider}}` | 提供商提示（whatsapp，telegram，discord 等） |

---

## 配置包含（`$include`）

将配置拆分为多个文件：

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

**合并规则：**

- 单文件：替换其所在对象。
- 文件数组：按顺序深度合并（后者覆盖前者）。
- 兄弟键：在 includes 之后合并（覆盖被包含值）。
- 嵌套 include：最多向下 10 层。
- 路径：相对于包含文件解析，但必须保留在顶层配置目录（`openclaw.json` 所在 `dirname`）内。仅当绝对路径/`../` 形式最终仍解析到该边界内时才允许。
- OpenClaw 自有写入在仅更改由单文件 include 支持的单个顶级分区时，会直接写入该被包含文件。例如，`plugins install` 会更新 `plugins: { $include: "./plugins.json5" }` 对应的 `plugins.json5`，并保持 `openclaw.json` 不变。
- 根级 includes、include 数组以及带兄弟覆盖的 includes 对 OpenClaw 自有写入为只读；这些写入会直接失败，而不是展平配置。
- 错误：对缺失文件、解析错误和循环 includes 提供清晰信息。

---

_Related: [配置](/gateway/configuration) · [配置示例](/gateway/configuration-examples) · [Doctor](/gateway/doctor)_

## 相关

- [配置](/gateway/configuration)
- [配置示例](/gateway/configuration-examples)
