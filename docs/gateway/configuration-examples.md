---
summary: "常见 OpenClaw 配置的与 Schema 严格匹配的示例"
read_when:
  - "学习如何配置 OpenClaw"
  - "寻找配置示例"
  - "首次设置 OpenClaw"
title: "配置示例"
---

下面的示例与当前配置 schema 保持一致。完整参考以及逐字段说明请见 [配置](/gateway/configuration)。

Doctor 将旧版 `agents.list` 阵列和 `default` 标记迁移到具有明确表面所有者的键控 `agents.entries` 中。更新程序通过其备份流程运行此迁移。直接替换二进制文件后，在启动网关之前运行 `openclaw doctor --fix`。

## <a id="quick-start"></a> 快速开始

### <a id="absolute-minimum"></a> 最小必需配置

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

保存到 `~/.openclaw/openclaw.json`，您就可以从该号码 DM 机器人。

### <a id="recommended-starter"></a> 推荐起步配置

```json5
{
  agents: {
    defaults: {
      workspace: "~/.openclaw/workspace",
      model: { primary: "anthropic/claude-sonnet-4-6" },
    },
    entries: {
      main: {
        identity: {
          name: "Clawd",
          theme: "helpful assistant",
          emoji: "🦞",
        },
      },
    },
  },
  channels: {
    whatsapp: {
      allowFrom: ["+15555550123"],
      groups: { "*": { requireMention: true } },
    },
  },
  messages: {
    visibleReplies: "automatic",
    groupChat: {
      visibleReplies: "message_tool", // opt-in; visible output requires message(action=send)
      unmentionedInbound: "room_event",
    },
  },
}
```

## <a id="expanded-example-(major-options)"></a><a id="expanded-example-major-options"></a> 扩展示例（主要选项）

> JSON5 允许使用注释和尾随逗号。普通 JSON 也可以。

此示例未设置 `agents.defaults.timeoutSeconds`，因此每次模型尝试都使用 48 小时默认值。仅当您的工作流程需要时，才设置不同的每次尝试预算。每个已配置的后备方案都会收到新的预算；请参阅 [Agent 运行时](/concepts/agent-loop#timeouts)。

```json5
{
  // Environment + shell
  env: {
    vars: {
      OPENROUTER_API_KEY: "sk-or-...",
      GROQ_API_KEY: "gsk-...",
    },
    shellEnv: {
      enabled: true,
      timeoutMs: 15000,
    },
  },

  // Auth profile metadata (secrets live in SQLite auth stores)
  auth: {
    profiles: {
      "anthropic:default": { provider: "anthropic", mode: "api_key" },
      "anthropic:work": { provider: "anthropic", mode: "api_key" },
      "openai:default": { provider: "openai", mode: "api_key" },
      "openai:personal": { provider: "openai", mode: "oauth" },
    },
    order: {
      anthropic: ["anthropic:default", "anthropic:work"],
      openai: ["openai:personal", "openai:default"],
    },
  },

  // Identity is per agent — set it on agents.entries.<id>.identity below.

  // Logging
  logging: {
    level: "info",
    file: "/tmp/openclaw/openclaw.log",
    consoleLevel: "info",
    consoleStyle: "pretty",
  },

  // Message formatting
  messages: {
    visibleReplies: "automatic",
    responsePrefix: ">",
    ackReaction: "👀",
    ackReactionScope: "group-mentions",
    groupChat: {
      historyLimit: 50,
      visibleReplies: "message_tool", // opt in for shared rooms with tool-reliable models
      unmentionedInbound: "room_event",
    },
    queue: {
      mode: "followup",
      cap: 20,
      drop: "summarize",
      byChannel: {
        whatsapp: "followup",
        telegram: "followup",
        discord: "collect",
        slack: "collect",
        signal: "followup",
        imessage: "followup",
        webchat: "followup",
      },
    },
  },

  // Session behavior
  session: {
    scope: "per-sender",
    dmScope: "per-channel-peer", // recommended for multi-user inboxes
    reset: {
      mode: "daily",
      atHour: 4,
      idleMinutes: 60,
    },
    resetByChannel: {
      discord: { mode: "idle", idleMinutes: 10080 },
    },
    resetTriggers: ["/new", "/reset"],
    store: "~/.openclaw/agents/main/sessions/sessions.json",
    maintenance: {
      mode: "warn",
      pruneAfter: "30d",
      maxEntries: 500,
      resetArchiveRetention: "30d", // duration or false
      maxDiskBytes: "500mb", // optional
      highWaterBytes: "400mb", // optional (defaults to 80% of maxDiskBytes)
    },
    sendPolicy: {
      default: "allow",
      rules: [{ action: "deny", match: { channel: "discord", chatType: "group" } }],
    },
  },

  // Channels
  channels: {
    whatsapp: {
      dmPolicy: "pairing",
      allowFrom: ["+15555550123"],
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15555550123"],
      groups: { "*": { requireMention: true } },
    },

    telegram: {
      enabled: true,
      botToken: "YOUR_TELEGRAM_BOT_TOKEN",
      allowFrom: ["123456789"],
      groupPolicy: "allowlist",
      groupAllowFrom: ["123456789"],
      groups: { "*": { requireMention: true } },
    },

    discord: {
      enabled: true,
      token: "YOUR_DISCORD_BOT_TOKEN",
      dmPolicy: "allowlist",
      allowFrom: ["123456789012345678"],
      guilds: {
        "123456789012345678": {
          slug: "friends-of-openclaw",
          requireMention: false,
          channels: {
            general: { enabled: true },
            help: { enabled: true, requireMention: true },
          },
        },
      },
    },

    slack: {
      enabled: true,
      botToken: "xoxb-REPLACE_ME",
      appToken: "xapp-REPLACE_ME",
      channels: {
        "#general": { enabled: true, requireMention: true },
      },
      dmPolicy: "allowlist",
      allowFrom: ["U123"],
      slashCommand: {
        enabled: true,
        name: "openclaw",
        sessionPrefix: "slack:slash",
        ephemeral: true,
      },
    },
  },

  // Agent runtime
  agents: {
    ownership: "explicit",
    defaults: {
      workspace: "~/.openclaw/workspace",
      systemAgent: { agentId: "main" },
      sessionStore: { agentId: "main" },
      userTimezone: "America/Chicago",
      model: {
        primary: "anthropic/claude-sonnet-4-6",
        fallbacks: ["anthropic/claude-opus-4-6", "openai/gpt-5.4"],
      },
      imageModel: {
        primary: "openrouter/anthropic/claude-sonnet-4-6",
      },
      models: {
        "anthropic/claude-opus-4-6": { alias: "opus" },
        "anthropic/claude-sonnet-4-6": { alias: "sonnet" },
        "openai/gpt-5.4": { alias: "gpt" },
      },
      skills: ["github", "weather"], // inherited by agents that omit entries.*.skills
      thinkingDefault: "low",
      verboseDefault: "off",
      toolProgressDetail: "explain",
      reasoningDefault: "off",
      elevatedDefault: "on",
      blockStreamingDefault: "off",
      blockStreamingBreak: "text_end",
      blockStreamingChunk: {
        minChars: 800,
        maxChars: 1200,
        breakPreference: "paragraph",
      },
      blockStreamingCoalesce: {
        idleMs: 1000,
      },
      humanDelay: {
        mode: "natural",
      },
      mediaMaxMb: 5,
      typingIntervalSeconds: 5,
      maxConcurrent: 3,
      heartbeat: {
        every: "30m",
        model: "anthropic/claude-sonnet-4-6",
        target: "whatsapp",
        directPolicy: "allow", // allow (default) | block
        to: "+15555550123",
        prompt: "HEARTBEAT",
      },
      sandbox: {
        mode: "non-main",
        scope: "session", // preferred over legacy perSession: true
        workspaceRoot: "~/.openclaw/sandboxes",
        docker: {
          image: "openclaw-sandbox:bookworm-slim",
          workdir: "/workspace",
          readOnlyRoot: true,
          tmpfs: ["/tmp", "/var/tmp", "/run"],
          network: "none",
          user: "1000:1000",
        },
        browser: {
          enabled: false,
        },
      },
    },
    entries: {
      main: {
        workspace: "~/.openclaw/workspace",
        identity: {
          name: "Samantha",
          theme: "helpful sloth",
          emoji: "🦥",
        },
        // inherits defaults.skills -> github, weather
        groupChat: {
          mentionPatterns: ["@openclaw", "openclaw"],
        },
        thinkingDefault: "high", // per-agent thinking override
        reasoningDefault: "on", // per-agent reasoning visibility
        fastModeDefault: false, // per-agent fast mode
      },
      quick: {
        skills: [], // no skills for this agent
        fastModeDefault: true, // this agent always runs fast
        thinkingDefault: "off",
      },
    },
  },

  bindings: [
    { agentId: "main", match: { channel: "discord", accountId: "*" } },
    { agentId: "main", match: { channel: "slack", accountId: "*" } },
    { agentId: "main", match: { channel: "telegram", accountId: "*" } },
    { agentId: "main", match: { channel: "whatsapp", accountId: "*" } },
  ],
  talk: { agentId: "main" },

  memory: {
    search: {
      provider: "gemini",
      model: "gemini-embedding-001",
      remote: {
        apiKey: "${GEMINI_API_KEY}",
      },
      extraPaths: ["../team-docs", "/srv/shared-notes"],
    },
  },

  tools: {
    media: {
      models: [
        { provider: "openai", model: "gpt-4o-transcribe", capabilities: ["audio"] },
        { provider: "google", model: "gemini-3-flash-preview", capabilities: ["video"] },
      ],
      audio: { enabled: true, maxBytes: 20971520, timeoutSeconds: 120 },
      video: { enabled: true, maxBytes: 52428800 },
    },
    allow: ["exec", "process", "read", "write", "edit", "apply_patch"],
    deny: ["browser", "canvas"],
    exec: {
      backgroundMs: 10000,
      timeoutSeconds: 1800,
      cleanupMs: 1800000,
    },
    elevated: {
      enabled: true,
      allowFrom: {
        whatsapp: ["+15555550123"],
        telegram: ["123456789"],
        discord: ["123456789012345678"],
        slack: ["U123"],
        signal: ["+15555550123"],
        imessage: ["user@example.com"],
        webchat: ["session:demo"],
      },
    },
  },

  // Custom model providers
  models: {
    mode: "merge",
    providers: {
      "custom-proxy": {
        baseUrl: "http://localhost:4000/v1",
        apiKey: "LITELLM_KEY",
        api: "openai-completions",
        authHeader: true,
        headers: { "X-Proxy-Region": "us-west" },
        models: [
          {
            id: "llama-3.1-8b",
            name: "Llama 3.1 8B",
            api: "openai-completions",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 32000,
          },
        ],
      },
    },
  },

  // Cron jobs
  cron: {
    enabled: true,
    sessionRetention: "24h",
  },

  // Webhooks
  hooks: {
    enabled: true,
    path: "/hooks",
    token: "shared-secret",
    presets: ["gmail"],
    transformsDir: "~/.openclaw/hooks/transforms",
    mappings: [
      {
        id: "gmail-hook",
        match: { path: "gmail" },
        action: "agent",
        wakeMode: "now",
        name: "Gmail",
        // One dispatch per pushed email; templates see the current message.
        forEach: "messages",
        sessionKey: "hook:gmail:{{messages[0].id}}",
        messageTemplate: "From: {{messages[0].from}}\nSubject: {{messages[0].subject}}",
        textTemplate: "{{messages[0].snippet}}",
        deliver: true,
        channel: "last",
        to: "+15555550123",
        thinking: "low",
        timeoutSeconds: 300,
        transform: {
          module: "gmail.js",
          export: "transformGmail",
        },
      },
    ],
    gmail: {
      account: "openclaw@gmail.com",
      label: "INBOX",
      topic: "projects/<project-id>/topics/gog-gmail-watch",
      subscription: "gog-gmail-watch-push",
      pushToken: "shared-push-token",
      hookUrl: "http://127.0.0.1:18789/hooks/gmail",
      includeBody: true,
      maxBytes: 20000,
      renewEveryMinutes: 720,
      serve: { bind: "127.0.0.1", port: 8788, path: "/" },
      tailscale: { mode: "funnel", path: "/gmail-pubsub" },
    },
  },

  // Gateway + networking
  gateway: {
    mode: "local",
    port: 18789,
    bind: "loopback",
    controlUi: { enabled: true, basePath: "/openclaw" },
    auth: {
      mode: "token",
      token: "gateway-token",
      allowTailscale: true,
    },
    tailscale: { mode: "serve" },
    remote: { url: "ws://gateway-host.ts.net:18789", token: "remote-token" },
    reload: { mode: "hybrid" },
  },

  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/path/to/agent-scripts/skills"],
      allowSymlinkTargets: ["~/path/to/agent-scripts/skills"],
    },
    install: {
      preferBrew: true,
      nodeManager: "npm", // npm | pnpm | yarn | bun
      allowUploadedArchives: false,
    },
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: "GEMINI_KEY_HERE",
        env: { GEMINI_API_KEY: "GEMINI_KEY_HERE" },
      },
      peekaboo: { enabled: true },
    },
  },
}
```

### <a id="symlinked-sibling-skill-repo"></a> 软链接的兄弟技能仓库

当内置技能根包含指向同级存储库的符号链接（例如 `~/.agents/skills/manager -> ~/path/to/skills`）时，请使用此选项。

```json5
{
  skills: {
    load: {
      extraDirs: ["~/path/to/skills"],
      allowSymlinkTargets: ["~/path/to/skills"],
    },
  },
}
```

- `extraDirs` 扫描兄弟仓库，作为显式的技能根目录。
- `allowSymlinkTargets` 允许软链接的技能文件夹解析到该受信任的真实目标根目录，而不允许任意软链接逃逸。
- Skill Workshop 不使用这些配置的符号链接目标。它仅写入活动代理的 `<state-dir>/agents/<agentId>/agent/workshop-skills` 内。

## <a id="common-patterns"></a> 常见模式

### <a id="shared-skill-baseline-with-one-override"></a> 共享技能基线与单一覆盖

```json5
{
  agents: {
    ownership: "explicit",
    defaults: {
      workspace: "~/.openclaw/workspace",
      skills: ["github", "weather"],
      heartbeat: { agentId: "main" },
      systemAgent: { agentId: "main" },
    },
    entries: {
      main: { workspace: "~/.openclaw/workspace" },
      docs: { workspace: "~/.openclaw/workspace-docs", skills: ["docs-search"] },
    },
  },
  talk: { agentId: "main" },
}
```

- `agents.defaults.skills` 是共享基线。
- `agents.entries.*.skills` 会为某个代理替换该基线。
- 当某个代理不应看到任何技能时，使用 `skills: []`。

### <a id="multi-platform-setup"></a> 多平台设置

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  channels: {
    whatsapp: { allowFrom: ["+15555550123"], responsePrefix: "[openclaw]" },
    telegram: {
      enabled: true,
      botToken: "YOUR_TOKEN",
      allowFrom: ["123456789"],
    },
    discord: {
      enabled: true,
      token: "YOUR_TOKEN",
      allowFrom: ["123456789012345678"],
    },
  },
}
```

### <a id="trusted-node-network-auto-approval"></a> 受信任节点网络自动批准

除非您控制网络路径，否则请保持手动设备配对。对于专用实验室或尾网子网，您可以选择使用准确的 CIDR 或 IP 进行首次节点设备自动批准：

```json5
{
  gateway: {
    nodes: {
      pairing: {
        autoApproveCidrs: ["192.168.1.0/24", "fd00:1234:5678::/64"],
      },
    },
  },
}
```

未设置时此功能保持关闭状态。它仅适用于没有要求范围的新 `role: node` 配对。 Operator/browser 客户端和角色、范围、元数据或公钥升级仍需要手动批准。

### <a id="secure-dm-mode-(shared-inbox-%2F-multi-user-dms)"></a><a id="secure-dm-mode-shared-inbox-/-multi-user-dms"></a> 安全 DM 模式（共享收件箱/多用户 DM）

如果超过一个人可以 DM 您的机器人（`allowFrom` 中的多个条目、多人的配对批准或 `dmPolicy: "open"`），请启用 **secure DM 模式**，以便来自不同发件人的 DM 默认情况下不会共享同一个上下文：

```json5
{
  // Secure DM mode (recommended for multi-user or sensitive DM agents)
  session: { dmScope: "per-channel-peer" },

  channels: {
    // Example: WhatsApp multi-user inbox
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15555550123", "+15555550124"],
    },

    // Example: Discord multi-user inbox
    discord: {
      enabled: true,
      token: "YOUR_DISCORD_BOT_TOKEN",
      allowFrom: ["123456789012345678", "987654321098765432"],
    },
  },
}
```

对于Discord/Google Chat/IRC/Mattermost/Microsoft Teams/Slack，发件人授权默认为ID-first。仅当您明确接受该风险时，才启用与每个通道的 `dangerouslyAllowNameMatching: true` 的直接可变 name/email/nick 匹配。

### <a id="anthropic-api-key-%2B-minimax-fallback"></a><a id="anthropic-api-key-+-minimax-fallback"></a> Anthropic API 密钥 + MiniMax 回退

```json5
{
  auth: {
    profiles: {
      "anthropic:api": {
        provider: "anthropic",
        mode: "api_key",
      },
    },
    order: {
      anthropic: ["anthropic:api"],
    },
  },
  models: {
    providers: {
      minimax: {
        baseUrl: "https://api.minimax.io/anthropic",
        api: "anthropic-messages",
        apiKey: "${MINIMAX_API_KEY}",
      },
    },
  },
  agents: {
    defaults: {
      workspace: "~/.openclaw/workspace",
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["minimax/MiniMax-M2.7"],
      },
    },
  },
}
```

### <a id="work-bot-(restricted-access)"></a><a id="work-bot-restricted-access"></a> 工作机器人（受限访问）

```json5
{
  agents: {
    defaults: {
      workspace: "~/work-openclaw",
      elevatedDefault: "off",
    },
    entries: {
      main: {
        identity: {
          name: "WorkBot",
          theme: "professional assistant",
        },
      },
    },
  },
  channels: {
    slack: {
      enabled: true,
      botToken: "xoxb-...",
      channels: {
        "#engineering": { enabled: true, requireMention: true },
        "#general": { enabled: true, requireMention: true },
      },
    },
  },
}
```

### <a id="local-models-only"></a> 仅使用本地模型

```json5
{
  agents: {
    defaults: {
      workspace: "~/.openclaw/workspace",
      model: { primary: "lmstudio/my-local-model" },
    },
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## <a id="tips"></a> 提示

- 如果你设置了 `dmPolicy: "open"`，匹配的 `allowFrom` 列表必须包含 `"*"`.
- 提供商 ID 不同（电话号码、用户 ID、频道 ID）。使用提供商文档来确认格式。
- 可稍后添加的可选部分：`web`、`browser`、`ui`、`discovery`、`plugins`、`talk`、`signal`、`imessage`。
- 查看 [提供方](/providers) 和 [故障排除](/gateway/troubleshooting) 以获取更深入的设置说明。

## <a id="related"></a> 相关内容

- [配置参考](/gateway/configuration-reference)
- [配置](/gateway/configuration)
