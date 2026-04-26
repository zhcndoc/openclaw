---
summary: "网关配置参考，涵盖核心 OpenClaw 键、默认值以及指向专用子系统参考的链接"
title: "配置参考"
read_when:
  - 需要准确的字段级配置语义或默认值
  - 正在验证频道、模型、网关或工具配置块
---

Core config reference for `~/.openclaw/openclaw.json`. For a task-oriented overview, see [Configuration](/gateway/configuration).

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

Per-channel config keys moved to a dedicated page — see
[Configuration — channels](/gateway/config-channels) for `channels.*`,
including Slack, Discord, Telegram, WhatsApp, Matrix, iMessage, and other
bundled channels (auth, access control, multi-account, mention gating).

## 代理默认值、多代理、会话和消息

Moved to a dedicated page — see
[Configuration — agents](/gateway/config-agents) for:

- `agents.defaults.*`（工作区、模型、思考、心跳、内存、媒体、技能、沙箱）
- `multiAgent.*`（多代理路由和绑定）
- `session.*`（会话生命周期、压缩、修剪）
- `messages.*`（消息传递、TTS、Markdown 渲染）
- `talk.*`（Talk 模式）
  - `talk.silenceTimeoutMs`：未设置时，Talk 会在发送转写前保持平台默认的暂停窗口（macOS 和 Android 为 `700 ms`，iOS 为 `900 ms`）

## 工具和自定义提供方

Tool policy, experimental toggles, provider-backed tool config, and custom
provider / base-URL setup moved to a dedicated page — see
[Configuration — tools and custom providers](/gateway/config-tools).

## 技能（Skills）

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
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // or plain string
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

- Loaded from `~/.openclaw/extensions`, `<workspace>/.openclaw/extensions`, plus `plugins.load.paths`.
- Discovery accepts native OpenClaw plugins plus compatible Codex bundles and Claude bundles, including manifestless Claude default-layout bundles.
- **Config changes require a gateway restart.**
- `allow`: optional allowlist (only listed plugins load). `deny` wins.
- `plugins.entries.<id>.apiKey`: plugin-level API key convenience field (when supported by the plugin).
- `plugins.entries.<id>.env`: plugin-scoped env var map.
- `plugins.entries.<id>.hooks.allowPromptInjection`: when `false`, core blocks `before_prompt_build` and ignores prompt-mutating fields from legacy `before_agent_start`, while preserving legacy `modelOverride` and `providerOverride`. Applies to native plugin hooks and supported bundle-provided hook directories.
- `plugins.entries.<id>.hooks.allowConversationAccess`: when `true`, trusted non-bundled plugins may read raw conversation content from typed hooks such as `llm_input`, `llm_output`, and `agent_end`.
- `plugins.entries.<id>.subagent.allowModelOverride`: explicitly trust this plugin to request per-run `provider` and `model` overrides for background subagent runs.
- `plugins.entries.<id>.subagent.allowedModels`: optional allowlist of canonical `provider/model` targets for trusted subagent overrides. Use `"*"` only when you intentionally want to allow any model.
- `plugins.entries.<id>.config`: plugin-defined config object (validated by native OpenClaw plugin schema when available).
- Channel plugin account/runtime settings live under `channels.<id>` and should be described by the owning plugin's manifest `channelConfigs` metadata, not by a central OpenClaw option registry.
- `plugins.entries.firecrawl.config.webFetch`: Firecrawl web-fetch provider settings.
  - `apiKey`: Firecrawl API key (accepts SecretRef). Falls back to `plugins.entries.firecrawl.config.webSearch.apiKey`, legacy `tools.web.fetch.firecrawl.apiKey`, or `FIRECRAWL_API_KEY` env var.
  - `baseUrl`: Firecrawl API base URL (default: `https://api.firecrawl.dev`).
  - `onlyMainContent`: extract only the main content from pages (default: `true`).
  - `maxAgeMs`: maximum cache age in milliseconds (default: `172800000` / 2 days).
  - `timeoutSeconds`: scrape request timeout in seconds (default: `60`).
- `plugins.entries.xai.config.xSearch`: xAI X Search（Grok 网页搜索）设置。
  - `enabled`: 启用 X Search 提供方。
  - `model`: 用于搜索的 Grok 模型（例如 `"grok-4-1-fast"`）。
- `plugins.entries.memory-core.config.dreaming`: memory dreaming 设置。有关阶段和阈值，请参见 [Dreaming](/concepts/dreaming)。
  - `enabled`: dreaming 总开关（默认 `false`）。
  - `frequency`: 每次完整 dreaming 扫描的 cron 频率（默认 `"0 3 * * *"`）。
  - phase policy and thresholds are implementation details (not user-facing config keys).
- Full memory config lives in [Memory configuration reference](/reference/memory-config):
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
      avatar: "CB", // emoji、简短文字、图片 URL 或 data URI
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

- `mode`: `local` (run gateway) or `remote` (connect to remote gateway). Gateway refuses to start unless `local`.
- `port`: single multiplexed port for WS + HTTP. Precedence: `--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`.
- `bind`: `auto`, `loopback` (default), `lan` (`0.0.0.0`), `tailnet` (Tailscale IP only), or `custom`.
- **Legacy bind aliases**: use bind mode values in `gateway.bind` (`auto`, `loopback`, `lan`, `tailnet`, `custom`), not host aliases (`0.0.0.0`, `127.0.0.1`, `localhost`, `::`, `::1`).
- **Docker note**: the default `loopback` bind listens on `127.0.0.1` inside the container. With Docker bridge networking (`-p 18789:18789`), traffic arrives on `eth0`, so the gateway is unreachable. Use `--network host`, or set `bind: "lan"` (or `bind: "custom"` with `customBindHost: "0.0.0.0"`) to listen on all interfaces.
- **Auth**: required by default. Non-loopback binds require gateway auth. In practice that means a shared token/password or an identity-aware reverse proxy with `gateway.auth.mode: "trusted-proxy"`. Onboarding wizard generates a token by default.
- If both `gateway.auth.token` and `gateway.auth.password` are configured (including SecretRefs), set `gateway.auth.mode` explicitly to `token` or `password`. Startup and service install/repair flows fail when both are configured and mode is unset.
- `gateway.auth.mode: "none"`: explicit no-auth mode. Use only for trusted local loopback setups; this is intentionally not offered by onboarding prompts.
- `gateway.auth.mode: "trusted-proxy"`: delegate auth to an identity-aware reverse proxy and trust identity headers from `gateway.trustedProxies` (see [Trusted Proxy Auth](/gateway/trusted-proxy-auth)). This mode expects a **non-loopback** proxy source; same-host loopback reverse proxies do not satisfy trusted-proxy auth.
- `gateway.auth.allowTailscale`: when `true`, Tailscale Serve identity headers can satisfy Control UI/WebSocket auth (verified via `tailscale whois`). HTTP API endpoints do **not** use that Tailscale header auth; they follow the gateway's normal HTTP auth mode instead. This tokenless flow assumes the gateway host is trusted. Defaults to `true` when `tailscale.mode = "serve"`.
- `gateway.auth.rateLimit`: optional failed-auth limiter. Applies per client IP and per auth scope (shared-secret and device-token are tracked independently). Blocked attempts return `429` + `Retry-After`.
  - On the async Tailscale Serve Control UI path, failed attempts for the same `{scope, clientIp}` are serialized before the failure write. Concurrent bad attempts from the same client can therefore trip the limiter on the second request instead of both racing through as plain mismatches.
  - `gateway.auth.rateLimit.exemptLoopback` defaults to `true`; set `false` when you intentionally want localhost traffic rate-limited too (for test setups or strict proxy deployments).
- Browser-origin WS auth attempts are always throttled with loopback exemption disabled (defense-in-depth against browser-based localhost brute force).
- On loopback, those browser-origin lockouts are isolated per normalized `Origin`
  value, so repeated failures from one localhost origin do not automatically
  lock out a different origin.
- `tailscale.mode`: `serve` (tailnet only, loopback bind) or `funnel` (public, requires auth).
- `controlUi.allowedOrigins`: explicit browser-origin allowlist for Gateway WebSocket connects. Required when browser clients are expected from non-loopback origins.
- `controlUi.dangerouslyAllowHostHeaderOriginFallback`: dangerous mode that enables Host-header origin fallback for deployments that intentionally rely on Host-header origin policy.
- `remote.transport`: `ssh` (default) or `direct` (ws/wss). For `direct`, `remote.url` must be `ws://` or `wss://`.
- `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`: client-side process-environment
  break-glass override that allows plaintext `ws://` to trusted private-network
  IPs; default remains loopback-only for plaintext. There is no `openclaw.json`
  equivalent, and browser private-network config such as
  `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` does not affect Gateway
  WebSocket clients.
- `gateway.remote.token` / `.password` are remote-client credential fields. They do not configure gateway auth by themselves.
- `gateway.push.apns.relay.baseUrl`: base HTTPS URL for the external APNs relay used by official/TestFlight iOS builds after they publish relay-backed registrations to the gateway. This URL must match the relay URL compiled into the iOS build.
- `gateway.push.apns.relay.timeoutMs`: gateway-to-relay send timeout in milliseconds. Defaults to `10000`.
- Relay-backed registrations are delegated to a specific gateway identity. The paired iOS app fetches `gateway.identity.get`, includes that identity in the relay registration, and forwards a registration-scoped send grant to the gateway. Another gateway cannot reuse that stored registration.
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS`: temporary env overrides for the relay config above.
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`: development-only escape hatch for loopback HTTP relay URLs. Production relay URLs should stay on HTTPS.
- `gateway.channelHealthCheckMinutes`: channel health-monitor interval in minutes. Set `0` to disable health-monitor restarts globally. Default: `5`.
- `gateway.channelStaleEventThresholdMinutes`: stale-socket threshold in minutes. Keep this greater than or equal to `gateway.channelHealthCheckMinutes`. Default: `30`.
- `gateway.channelMaxRestartsPerHour`: maximum health-monitor restarts per channel/account in a rolling hour. Default: `10`.
- `channels.<provider>.healthMonitor.enabled`: per-channel opt-out for health-monitor restarts while keeping the global monitor enabled.
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`: per-account override for multi-account channels. When set, it takes precedence over the channel-level override.
- Local gateway call paths can use `gateway.remote.*` as fallback only when `gateway.auth.*` is unset.
- If `gateway.auth.token` / `gateway.auth.password` is explicitly configured via SecretRef and unresolved, resolution fails closed (no remote fallback masking).
- `trustedProxies`: reverse proxy IPs that terminate TLS or inject forwarded-client headers. Only list proxies you control. Loopback entries are still valid for same-host proxy/local-detection setups (for example Tailscale Serve or a local reverse proxy), but they do **not** make loopback requests eligible for `gateway.auth.mode: "trusted-proxy"`.
- `allowRealIpFallback`: when `true`, the gateway accepts `X-Real-IP` if `X-Forwarded-For` is missing. Default `false` for fail-closed behavior.
- `gateway.tools.deny`: extra tool names blocked for HTTP `POST /tools/invoke` (extends default deny list).
- `gateway.tools.allow`: remove tool names from the default HTTP deny list.

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
查询字符串钩子令牌将被拒绝。

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

- `minimal`（默认）：TXT 记录省略 `cliPath` 和 `sshPort`。
- `full`：包括 `cliPath` 和 `sshPort`。
- 主机名默认 `openclaw`，可用 `OPENCLAW_MDNS_HOSTNAME` 覆盖。

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
- 当使用 `--verbose` 时，`consoleLevel` 提升至 `debug`。
- `maxFileBytes`：写入被抑制前的最大日志文件大小（字节）（正整数；默认：`524288000` = 500 MB）。生产部署请使用外部日志轮转。

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

- `enabled`：仪器输出的总开关（默认：`true`）。
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
    maxConcurrentRuns: 2,
    webhook: "https://example.invalid/legacy", // 过时备用，用于遗留 notify:true 任务
    webhookToken: "replace-with-dedicated-token", // 出站 Webhook 认证 Bearer Token（可选）
    sessionRetention: "24h", // 会话保存时间，时长字符串或 false
    runLog: {
      maxBytes: "2mb", // 单次运行日志最大字节数，默认 2,000,000
      keepLines: 2000, // 日志剪裁后保留最新行数，默认 2000
    },
  },
}
```

- `sessionRetention`：完成的隔离定时任务会话保存期限，同时控制删除存档的清理。默认 24 小时，设置 `false` 禁用。
- `runLog.maxBytes`：单次运行日志文件大小限制，触发剪裁。默认 2MB。
- `runLog.keepLines`：剪裁后保留的最新日志行数。默认 2000。
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
      mode: "announce",
      accountId: "main",
    },
  },
}
```

- `enabled`：启用定时任务失败警报（默认：`false`）。
- `after`：触发警报前的连续失败次数（正整数，最小值：`1`）。
- `cooldownMs`：同一任务重复警报之间的最小毫秒数（非负整数）。
- `mode`：交付模式 — `"announce"` 通过频道消息发送；`"webhook"` 发布到配置的 Webhook。
- `accountId`：可选的账户或频道 ID，用于限定警报交付范围。

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
