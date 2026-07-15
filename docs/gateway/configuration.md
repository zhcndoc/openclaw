---
summary: "配置概览：常见任务、快速设置以及完整参考的链接"
read_when:
  - 首次设置 OpenClaw
  - 查找常见配置模式
  - 导航到特定配置部分
title: "配置"
---

OpenClaw reads an optional <Tooltip tip="JSON5 supports comments and trailing commas">**JSON5**</Tooltip> config from `~/.openclaw/openclaw.json`. If the file is missing, OpenClaw uses safe defaults.

The active config path must be a regular file. OpenClaw-owned writes replace it atomically (rename onto the path), so a symlinked `openclaw.json` gets its target replaced rather than written through - avoid symlinked config layouts. If you keep config outside the default state directory, point `OPENCLAW_CONFIG_PATH` directly at the real file.

Common reasons to add a config:

- 连接通道并控制谁可以给机器人发消息
- 设置模型、工具、沙箱或自动化（cron、hooks）
- 调整会话、媒体、网络或 UI

请参阅[完整参考](/gateway/configuration-reference)以查看所有可用字段。

代理和自动化应在编辑配置前使用 `config.schema.lookup` 获取精确的字段级文档。
本页用于任务导向的指导，[配置参考](/gateway/configuration-reference)用于更广泛的字段映射和默认值。

<Tip>
**刚接触配置？** 可以先运行 `openclaw onboard` 进行交互式设置，或者查看 [配置示例](/gateway/configuration-examples) 指南，获取可直接复制粘贴的完整配置。
</Tip>

## 最小配置

```json5
// ~/.openclaw/openclaw.json
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

## 编辑配置

<Tabs>
  <Tab title="交互式向导">
    ```bash
    openclaw onboard       # 完整的入门流程
    openclaw configure     # 配置向导
    ```
  </Tab>
  <Tab title="CLI（单行命令）">
    ```bash
    openclaw config get agents.defaults.workspace
    openclaw config set agents.defaults.heartbeat.every "2h"
    openclaw config unset plugins.entries.brave.config.webSearch.apiKey
    ```
  </Tab>
  <Tab title="控制 UI">
    打开 [http://127.0.0.1:18789](http://127.0.0.1:18789) 并使用 **Config** 选项卡。
    控制 UI 会根据实时配置架构渲染表单，包括字段
    `title` / `description` 文档元数据，以及可用时的插件和通道架构，
    并提供一个 **Raw JSON** 编辑器作为兜底。对于下钻式 UI 和其他工具，
    网关还公开了 `config.schema.lookup`，用于获取一个路径作用域的架构节点以及直接子项摘要。
  </Tab>
  <Tab title="直接编辑">
    直接编辑 `~/.openclaw/openclaw.json`。Gateway 会监视该文件并自动应用更改（见[热重载](#config-hot-reload)）。
  </Tab>
</Tabs>

## 严格校验

<Warning>
OpenClaw 只接受完全符合架构的配置。未知键、格式错误的类型或无效值都会导致 Gateway **拒绝启动**。根级唯一例外是 `$schema`（字符串），这样编辑器就可以附加 JSON Schema 元数据。
</Warning>

`openclaw config schema` 会打印 Control UI 和校验所使用的规范 JSON Schema。
`config.schema.lookup` 会为下钻工具获取单个路径作用域节点以及子项摘要。
字段 `title`/`description` 文档元数据会贯穿嵌套对象、通配符（`*`）、数组项（`[]`）以及 `anyOf`/
`oneOf`/`allOf` 分支。运行时插件和通道架构会在清单注册表加载后合并进来。

当校验失败时：

- The Gateway does not boot
- Only diagnostic commands work (`openclaw doctor`, `openclaw logs`, `openclaw health`, `openclaw status`)
- Run `openclaw doctor` to see exact issues
- Run `openclaw doctor --fix` (`--repair` is the same flag; `--yes` skips prompts) to apply repairs

The Gateway keeps a trusted last-known-good copy after each successful startup,
but startup and hot reload do not restore it automatically - only `openclaw doctor --fix`
does. If `openclaw.json` fails validation (including plugin-local validation), Gateway
startup fails or the reload is skipped and the current runtime keeps the last accepted
config. A rejected write is also saved as `<path>.rejected.<timestamp>` for inspection.
The Gateway blocks writes that look like accidental clobbers - dropping `gateway.mode`,
losing the `meta` block, or shrinking the file by more than half - unless the write
explicitly allows destructive changes. Promotion to last-known-good is skipped when a
candidate contains a redacted secret placeholder such as `***` or `[redacted]`.

## 常见任务

<AccordionGroup>
  <Accordion title="设置通道（WhatsApp、Telegram、Discord 等）">
    每个通道在 `channels.<provider>` 下都有自己的配置部分。请参阅对应的通道页面了解设置步骤：

    - [Discord](/channels/discord) - `channels.discord`
    - [Feishu](/channels/feishu) - `channels.feishu`
    - [Google Chat](/channels/googlechat) - `channels.googlechat`
    - [iMessage](/channels/imessage) - `channels.imessage`
    - [Mattermost](/channels/mattermost) - `channels.mattermost`
    - [Microsoft Teams](/channels/msteams) - `channels.msteams`
    - [Signal](/channels/signal) - `channels.signal`
    - [Slack](/channels/slack) - `channels.slack`
    - [Telegram](/channels/telegram) - `channels.telegram`
    - [WhatsApp](/channels/whatsapp) - `channels.whatsapp`

    所有通道共享相同的 DM 策略模式：

    ```json5
    {
      channels: {
        telegram: {
          enabled: true,
          botToken: "123:abc",
          dmPolicy: "pairing",   // 配对 | 允许列表 | 开放 | 禁用
          allowFrom: ["tg:123"], // 仅适用于允许列表/开放
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="选择并配置模型">
    设置主模型和可选的回退模型：

    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "anthropic/claude-sonnet-4-6",
            fallbacks: ["openai/gpt-5.4"],
          },
          models: {
            "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
            "openai/gpt-5.4": { alias: "GPT" },
          },
        },
      },
    }
    ```

    - `agents.defaults.models` 定义模型目录，并作为 `/model` 的允许列表；`provider/*` 条目会将 `/model`、`/models` 和模型选择器筛选为所选提供方，同时仍使用动态模型发现。
    - 使用 `openclaw config set agents.defaults.models '<json>' --strict-json --merge` 可在不移除现有模型的情况下添加允许列表条目。若普通替换会移除条目，则会被拒绝，除非你传入 `--replace`。
    - 模型引用使用 `provider/model` 格式（例如 `anthropic/claude-opus-4-6`）。
    - `agents.defaults.imageMaxDimensionPx` 控制转录/工具图片缩放（默认 `1200`）；较低的值通常可减少以截图为主的运行中的视觉 token 用量。
    - 在聊天中切换模型请参阅 [Models CLI](/concepts/models)，有关认证轮换和回退行为请参阅 [Model Failover](/concepts/model-failover)。
    - 对于自定义/自托管提供方，请参阅参考中的 [Custom providers](/gateway/config-tools#custom-providers-and-base-urls)。

  </Accordion>

  <Accordion title="Control who can message the bot">
    DM access is controlled per channel via `dmPolicy` (default `"pairing"`):

    - `"pairing"`: unknown senders get a one-time pairing code to approve
    - `"allowlist"`: only senders in `allowFrom` (or the paired allow store)
    - `"open"`: allow all inbound DMs (requires `allowFrom: ["*"]`)
    - `"disabled"`: ignore all DMs

    For groups, use `groupPolicy` (`"allowlist" | "open" | "disabled"`) plus `groupAllowFrom` or channel-specific allowlists.

    查看[完整参考](/gateway/config-channels#dm-and-group-access)以了解各通道细节。

  </Accordion>

  <Accordion title="Set up group chat mention gating">
    Group messages default to **require mention**. Configure trigger patterns per agent. Normal group/channel replies post automatically; opt into the message-tool path for shared rooms where the agent should decide when to speak:

    ```json5
    {
      messages: {
        visibleReplies: "automatic", // 设为 "message_tool" 可在全局要求 message-tool 发送
        groupChat: {
          visibleReplies: "message_tool", // opt-in; visible output requires message(action=send)
          unmentionedInbound: "room_event", // unmentioned always-on group chatter is quiet context
        },
      },
      agents: {
        list: [
          {
            id: "main",
            groupChat: {
              mentionPatterns: ["@openclaw", "openclaw"],
            },
          },
        ],
      },
      channels: {
        whatsapp: {
          groups: { "*": { requireMention: true } },
        },
      },
    }
    ```

    - **元数据提及**：原生 @ 提及（WhatsApp 点按提及、Telegram @bot 等）
    - **文本模式**：`mentionPatterns` 中的安全正则模式
    - **可见回复**：`messages.visibleReplies` 可在全局要求 message-tool 发送；`messages.groupChat.visibleReplies` 可为群组/通道覆盖该设置。
    - 有关可见回复模式、按通道覆盖以及自聊模式，请参阅[完整参考](/gateway/config-channels#group-chat-mention-gating)。

  </Accordion>

  <Accordion title="限制每个代理的技能">
    使用 `agents.defaults.skills` 作为共享基础，然后用 `agents.list[].skills` 覆盖特定代理：

    ```json5
    {
      agents: {
        defaults: {
          skills: ["github", "weather"],
        },
        list: [
          { id: "writer" }, // 继承 github, weather
          { id: "docs", skills: ["docs-search"] }, // 替换默认值
          { id: "locked-down", skills: [] }, // 无技能
        ],
      },
    }
    ```

    - 若默认情况下不想限制技能，请省略 `agents.defaults.skills`。
    - 省略 `agents.list[].skills` 以继承默认值。
    - 将 `agents.list[].skills` 设为 `[]` 表示没有技能。
    - 参阅 [Skills](/tools/skills)、[Skills 配置](/tools/skills-config) 以及
      [配置参考](/gateway/config-agents#agents-defaults-skills)。

  </Accordion>

  <Accordion title="调整网关通道健康监控">
    控制 gateway 对看起来陈旧的通道重启有多激进：

    ```json5
    {
      gateway: {
        channelHealthCheckMinutes: 5,
        channelStaleEventThresholdMinutes: 30,
        channelMaxRestartsPerHour: 10,
      },
      channels: {
        telegram: {
          healthMonitor: { enabled: false },
          accounts: {
            alerts: {
              healthMonitor: { enabled: true },
            },
          },
        },
      },
    }
    ```

    - Values shown are the defaults. Set `gateway.channelHealthCheckMinutes: 0` to disable health-monitor restarts globally.
    - `channelStaleEventThresholdMinutes` should be greater than or equal to the check interval.
    - Use `channels.<provider>.healthMonitor.enabled` or `channels.<provider>.accounts.<id>.healthMonitor.enabled` to disable auto-restarts for one channel or account without disabling the global monitor.
    - See [Health Checks](/gateway/health) for operational debugging and the [full reference](/gateway/configuration-reference#gateway) for all fields.

  </Accordion>

  <Accordion title="调整网关 WebSocket 握手超时">
    为本地客户端在负载较高或低性能主机上完成预认证 WebSocket 握手争取更多时间：

    ```json5
    {
      gateway: {
        handshakeTimeoutMs: 30000,
      },
    }
    ```

    - 默认值为 `15000` 毫秒。
    - `OPENCLAW_HANDSHAKE_TIMEOUT_MS` 仍然会优先用于一次性的服务或 shell 覆盖。
    - 优先先修复启动/事件循环卡顿；这个开关适用于健康但在预热期间较慢的主机。

  </Accordion>

  <Accordion title="配置会话和重置">
    会话控制对话连续性和隔离：

    ```json5
    {
      session: {
        dmScope: "per-channel-peer",  // 推荐用于多用户
        threadBindings: {
          enabled: true,
          idleHours: 24,
          maxAgeHours: 0,
        },
        reset: {
          mode: "daily",
          atHour: 4,
          idleMinutes: 120,
        },
      },
    }
    ```

    - `dmScope`: `main` (shared) | `per-peer` | `per-channel-peer` | `per-account-channel-peer`
    - `threadBindings`: global defaults for thread-bound session routing. `/focus`, `/unfocus`, `/agents`, `/session idle`, and `/session max-age` bind, unbind, list, and tune this per session (Discord binds threads, Telegram binds topics/conversations).
    - See [Session Management](/concepts/session) for scoping, identity links, and send policy.
    - See [full reference](/gateway/config-agents#session) for all fields.

  </Accordion>

  <Accordion title="启用沙箱">
    在隔离的沙箱运行时中运行代理会话：

    ```json5
    {
      agents: {
        defaults: {
          sandbox: {
            mode: "non-main",  // 关闭 | 非主 | 全部
            scope: "agent",    // 会话 | 代理 | 共享
          },
        },
      },
    }
    ```

    先构建镜像 - 从源代码检出目录运行 `scripts/sandbox-setup.sh`，或在 npm 安装后查看 [Sandboxing § Images and setup](/gateway/sandboxing#images-and-setup) 中内联的 `docker build` 命令。

    有关完整指南，请参阅 [沙箱](/gateway/sandboxing)；有关所有选项，请参阅[完整参考](/gateway/config-agents#agentsdefaultssandbox)。

  </Accordion>

  <Accordion title="Enable relay-backed push for official iOS builds">
    Relay-backed push for public App Store builds uses the hosted OpenClaw relay: `https://ios-push-relay.openclaw.ai`.

    Custom relay deployments require a deliberately separate iOS build/deployment path whose relay URL matches the gateway relay URL. If you are using a custom relay build, set this in gateway config:

    ```json5
    {
      gateway: {
        push: {
          apns: {
            relay: {
              baseUrl: "https://relay.example.com",
              // 可选。默认值：10000
              timeoutMs: 10000,
            },
          },
        },
      },
    }
    ```

    对应的 CLI 命令：

    ```bash
    openclaw config set gateway.push.apns.relay.baseUrl https://relay.example.com
    ```

    这会做什么：

    - Lets the gateway send `push.test`, wake nudges, and reconnect wakes through the external relay.
    - Uses a registration-scoped send grant forwarded by the paired iOS app. The gateway does not need a deployment-wide relay token.
    - Binds each relay-backed registration to the gateway identity that the iOS app paired with, so another gateway cannot reuse the stored registration.
    - Keeps local/manual iOS builds on direct APNs. Relay-backed sends apply only to official distributed builds that registered through the relay.
    - Must match the relay base URL baked into the iOS build, so registration and send traffic reach the same relay deployment.

    端到端流程：

    1. Install the official iOS app.
    2. Optional: configure `gateway.push.apns.relay.baseUrl` on the gateway only when using a deliberately separate custom relay build.
    3. Pair the iOS app to the gateway and let both node and operator sessions connect.
    4. The iOS app fetches the gateway identity, registers with the relay using App Attest plus the app receipt, and then publishes the relay-backed `push.apns.register` payload to the paired gateway.
    5. The gateway stores the relay handle and send grant, then uses them for `push.test`, wake nudges, and reconnect wakes.

    运维说明：

    - 如果你将 iOS 应用切换到不同的 gateway，请重新连接应用，以便它可以发布绑定到该 gateway 的新中继注册。
    - 如果你发布了指向不同中继部署的新 iOS 构建，应用会刷新其缓存的中继注册，而不是重用旧的中继来源。

    兼容性说明：

    - `OPENCLAW_APNS_RELAY_BASE_URL` and `OPENCLAW_APNS_RELAY_TIMEOUT_MS` still work as temporary env overrides.
    - Custom gateway relay URLs must match the relay base URL baked into the iOS build; the public App Store release lane rejects custom iOS relay URL overrides.
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` remains a loopback-only development escape hatch; do not persist HTTP relay URLs in config.

    有关端到端流程，请参阅 [iOS 应用](/platforms/ios#relay-backed-push-for-official-builds)；有关中继安全模型，请参阅 [认证与信任流程](/platforms/ios#authentication-and-trust-flow)。

  </Accordion>

  <Accordion title="设置心跳（周期性签到）">
    ```json5
    {
      agents: {
        defaults: {
          heartbeat: {
            every: "30m",
            target: "last",
          },
        },
      },
    }
    ```

    - `every`: duration string (`30m`, `2h`). Set `0m` to disable. Default: `30m`.
    - `target`: `last` | `none` | `<channel-id>` (for example `discord`, `matrix`, `telegram`, or `whatsapp`)
    - `directPolicy`: `allow` (default) or `block` for DM-style heartbeat targets
    - See [Heartbeat](/gateway/heartbeat) for the full guide.

  </Accordion>

  <Accordion title="配置 cron 作业">
    ```json5
    {
      cron: {
        enabled: true,
        maxConcurrentRuns: 8, // 默认；cron 分发 + 隔离的 cron 代理轮次执行
        sessionRetention: "24h",
      },
    }
    ```

    - `sessionRetention`: prune completed isolated run sessions from SQLite session rows (default `24h`; set `false` to disable).
    - Run history automatically keeps the newest 2000 terminal rows per job; lost rows retain their 24-hour cleanup window.
    - See [Cron jobs](/automation/cron-jobs) for feature overview and CLI examples.

  </Accordion>

  <Accordion title="设置 webhook（hooks）">
    在 Gateway 上启用 HTTP webhook 端点：

    ```json5
    {
      hooks: {
        enabled: true,
        token: "shared-secret",
        path: "/hooks",
        defaultSessionKey: "hook:ingress",
        allowRequestSessionKey: false,
        allowedSessionKeyPrefixes: ["hook:"],
        mappings: [
          {
            match: { path: "gmail" },
            action: "agent",
            agentId: "main",
            deliver: true,
          },
        ],
      },
    }
    ```

    Security note:
    - 将所有 hook/webhook 载荷内容视为不受信任的输入。
    - 使用专用的 `hooks.token`；不要复用活动 Gateway 认证密钥（`gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`）。
    - Hook 认证仅支持请求头（`Authorization: Bearer ...` 或 `x-openclaw-token`）；查询字符串 token 会被拒绝。
    - `hooks.path` 不能是 `/`；请将 webhook 入口放在专用子路径下，例如 `/hooks`。
    - 除非在严格限定范围内调试，否则请保持不安全内容绕过标志为禁用状态（`hooks.gmail.allowUnsafeExternalContent`、`hooks.mappings[].allowUnsafeExternalContent`）。
    - 如果启用 `hooks.allowRequestSessionKey`，还应设置 `hooks.allowedSessionKeyPrefixes` 以限制调用方可选择的会话键。
    - 对于由 hook 驱动的代理，优先使用强健的现代模型档位和严格的工具策略（例如仅消息加上尽可能的沙箱）。

    有关所有映射选项和 Gmail 集成，请参阅[完整参考](/gateway/configuration-reference#hooks)。

  </Accordion>

  <Accordion title="配置多代理路由">
    运行多个相互隔离的代理，使用不同的工作区和会话：

    ```json5
    {
      agents: {
        list: [
          { id: "home", default: true, workspace: "~/.openclaw/workspace-home" },
          { id: "work", workspace: "~/.openclaw/workspace-work" },
        ],
      },
      bindings: [
        { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
        { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },
      ],
    }
    ```

    有关绑定规则和每个代理的访问配置文件，请参阅 [多代理](/concepts/multi-agent) 和[完整参考](/gateway/config-agents#multi-agent-routing)。

  </Accordion>

  <Accordion title="将配置拆分为多个文件（$include）">
    使用 `$include` 来组织大型配置：

    ```json5
    // ~/.openclaw/openclaw.json
    {
      gateway: { port: 18789 },
      agents: { $include: "./agents.json5" },
      broadcast: {
        $include: ["./clients/a.json5", "./clients/b.json5"],
      },
    }
    ```

    - **Single file**: replaces the containing object
    - **Array of files**: deep-merged in order (later wins), up to 10 nested levels deep
    - **Sibling keys**: merged after includes (override included values)
    - **Relative paths**: resolved relative to the including file
    - **Path format**: include paths must not contain null bytes and must be strictly shorter than 4096 characters before and after resolution
    - **OpenClaw-owned writes**: when a write changes only one top-level section
      backed by a single-file include such as `plugins: { $include: "./plugins.json5" }`,
      OpenClaw updates that included file and leaves `openclaw.json` intact
    - **Unsupported write-through**: root includes, include arrays, and includes
      with sibling overrides fail closed for OpenClaw-owned writes instead of
      flattening the config
    - **Confinement**: `$include` paths must resolve under the directory holding
      `openclaw.json`. To share a tree across machines or users, set
      `OPENCLAW_INCLUDE_ROOTS` to a path-list (`:` on POSIX, `;` on Windows) of
      additional directories that includes may reference. Symlinks are resolved
      and re-checked, so a path that lexically lives in a config dir but whose
      real target escapes every allowed root is still rejected.
    - **Error handling**: clear errors for missing files, parse errors, circular includes, invalid path format, and excessive length

  </Accordion>
</AccordionGroup>

## 配置热重载

Gateway 会监视 `~/.openclaw/openclaw.json` 并自动应用更改——大多数设置无需手动重启。

Direct file edits are treated as untrusted until they validate. The watcher waits
for editor temp-write/rename churn to settle, reads the final file, and rejects
invalid external edits without rewriting `openclaw.json`. OpenClaw-owned config
writes use the same schema gate before writing (see [Strict validation](#strict-validation)
for the clobber/rollback rules that apply to every write).

如果你看到 `config reload skipped (invalid config)` 或启动报告 `Invalid
config`，请检查配置，运行 `openclaw config validate`，然后运行 `openclaw
doctor --fix` 进行修复。请参阅 [Gateway 故障排查](/gateway/troubleshooting#gateway-rejected-invalid-config)
获取检查清单。

### 重载模式

| 模式                   | 行为                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------- |
| **`hybrid`**（默认）   | 热应用安全更改，立即生效。对关键更改会自动重启。           |
| **`hot`**              | 仅热应用安全更改。需要重启时会记录警告——由你来处理。 |
| **`restart`**          | 任何配置更改都会重启 Gateway，无论安全与否。                                 |
| **`off`**              | 禁用文件监视。更改会在下一次手动重启时生效。                 |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### 哪些可热应用，哪些需要重启

Most fields hot-apply without downtime; some hot-applied sections restart just that
subsystem (channel, cron, heartbeat, health monitor) rather than the whole Gateway. In
`hybrid` mode, Gateway-restart-required changes are handled automatically.

| Category            | Fields                                                                  | Gateway restart needed?      |
| ------------------- | ----------------------------------------------------------------------- | ---------------------------- |
| Channels            | `channels.*`, `web` (WhatsApp) - all built-in and plugin channels       | No (restarts that channel)   |
| Agent & models      | `agent`, `agents`, `models`, `routing`                                  | No                           |
| Automation          | `hooks`, `cron`, `agent.heartbeat`                                      | No (restarts that subsystem) |
| Sessions & messages | `session`, `messages`                                                   | No                           |
| Tools & media       | `tools`, `skills`, `mcp`, `audio`, `talk`                               | No                           |
| Plugin config       | `plugins.entries.*`, `plugins.allow`, `plugins.deny`, `plugins.enabled` | No (reloads plugin runtime)  |
| UI & misc           | `ui`, `logging`, `identity`, `bindings`                                 | No                           |
| Gateway server      | `gateway.*` (port, bind, auth, tailscale, TLS, HTTP, push)              | **Yes**                      |
| Infrastructure      | `discovery`, `browser`, `plugins.load`, `plugins.installs`              | **Yes**                      |

<Note>
`gateway.reload` and `gateway.remote` are exceptions under `gateway.*` - changing them does **not** trigger a restart. Individual plugins can also override this table: a loaded plugin may declare its own restart-triggering config prefixes (for example the bundled Canvas plugin restarts the Gateway for `plugins.enabled`, `plugins.allow`, and `plugins.deny`, not just its own `plugins.entries.canvas`), so the actual behavior depends on which plugins are active.
</Note>

### 重载规划

当你编辑一个通过 `$include` 引用的源文件时，OpenClaw 会根据源作者布局来规划重载，
而不是按内存中的扁平化视图来规划。这样即使某个顶层部分位于自己独立的包含文件中，
例如 `plugins: { $include: "./plugins.json5" }`，热重载决策（热应用还是重启）也会保持可预测。
如果源布局存在歧义，重载规划会失败关闭。

## 配置 RPC（程序化更新）

对于通过 gateway API 写入配置的工具，建议使用以下流程：

- `config.schema.lookup` 用于检查某个子树（浅层 schema 节点 + 子节点摘要）
- `config.get` 用于获取当前快照以及 `hash`
- `config.patch` 用于部分更新（JSON merge patch：对象合并，`null` 删除，数组在通过 `replacePaths` 明确确认且条目会被移除时才替换）
- `config.apply` 仅在你打算替换整个配置时使用
- `update.run` 用于显式自更新并重启；如果重启后的会话应继续执行一次后续轮次，请包含 `continuationMessage`
- `update.status` 用于检查最新的更新重启哨兵，并在重启后验证正在运行的版本

Agents 应将 `config.schema.lookup` 视为获取精确
字段级文档和约束的第一站。在需要更广泛的配置映射、默认值或指向专用
子系统参考的链接时，请使用 [配置参考](/gateway/configuration-reference)。

<Note>
控制平面写入（`config.apply`、`config.patch`、`update.run`）在每个 `deviceId+clientIp` 上每 60 秒限制 3 次请求。重启
请求会合并，然后在每个重启周期之间强制执行 30 秒冷却时间。
`update.status` 是只读的，但需要 admin 作用域，因为重启哨兵可能
包含更新步骤摘要和命令输出尾部。
</Note>

部分补丁示例：

```bash
openclaw gateway call config.get --params '{}'  # 捕获 payload.hash
openclaw gateway call config.patch --params '{
  "raw": "{ channels: { telegram: { groups: { \"*\": { requireMention: false } } } } }",
  "baseHash": "<hash>"
}'
```

Both `config.apply` and `config.patch` accept `raw`, `baseHash`, `sessionKey`,
`note`, and `restartDelayMs`. `baseHash` is required for both methods once a
config file already exists (a first write with no existing config skips the check).

`config.patch` 还接受 `replacePaths`，这是一个配置路径数组，用于表明数组替换是有意为之的。如果某个补丁会用更少的条目替换或删除现有数组，除非该精确路径出现在 `replacePaths` 中，否则 Gateway 会拒绝写入；数组条目下的嵌套数组使用 `[]` 表示，例如
`agents.list[].skills`。这可以防止被截断的 `config.get` 快照在不知不觉中覆盖路由或 allowlist 数组。若你打算替换完整配置，请使用 `config.apply`。

## 环境变量

OpenClaw 会从父进程以及以下位置读取环境变量：

- 当前工作目录中的 `.env`（如果存在）
- `~/.openclaw/.env`（全局回退）

这两个文件都不会覆盖已有的环境变量。你也可以在配置中设置内联环境变量：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

<Accordion title="Shell 环境导入（可选）">
  如果启用且预期的键未设置，OpenClaw 会运行你的登录 shell，并且只导入缺失的键：

```json5
{
  env: {
    shellEnv: { enabled: true, timeoutMs: 15000 },
  },
}
```

Env var equivalent: `OPENCLAW_LOAD_SHELL_ENV=1`. Default `timeoutMs`: `15000`.
</Accordion>

<Accordion title="配置值中的环境变量替换">
  可在任何配置字符串值中使用 `${VAR_NAME}` 引用环境变量：

```json5
{
  gateway: { auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" } },
  models: { providers: { custom: { apiKey: "${CUSTOM_API_KEY}" } } },
}
```

规则：

- 仅匹配大写名称：`[A-Z_][A-Z0-9_]*`
- 缺失/为空的变量会在加载时抛出错误
- 使用 `$${VAR}` 转义以输出字面值
- 可在 `$include` 文件中使用
- 内联替换：`"${BASE}/v1"` → `"https://api.example.com/v1"`

</Accordion>

<Accordion title="Secret 引用（env、file、exec）">
  对于支持 SecretRef 对象的字段，你可以使用：

```json5
{
  models: {
    providers: {
      openai: { apiKey: { source: "env", provider: "default", id: "OPENAI_API_KEY" } },
    },
  },
  skills: {
    entries: {
      "image-lab": {
        apiKey: {
          source: "file",
          provider: "filemain",
          id: "/skills/entries/image-lab/apiKey",
        },
      },
    },
  },
  channels: {
    googlechat: {
      serviceAccountRef: {
        source: "exec",
        provider: "vault",
        id: "channels/googlechat/serviceAccount",
      },
    },
  },
}
```

SecretRef 详情（包括用于 `env`/`file`/`exec` 的 `secrets.providers`）见 [Secrets Management](/gateway/secrets)。
支持的凭据路径列在 [SecretRef Credential Surface](/reference/secretref-credential-surface)。
</Accordion>

完整优先级和来源请参见 [环境](/help/environment)。

## 完整参考

有关按字段的完整参考，请参见 **[配置参考](/gateway/configuration-reference)**。

---

_相关：[配置示例](/gateway/configuration-examples) · [配置参考](/gateway/configuration-reference) · [诊断工具](/gateway/doctor)_

## 相关内容

- [配置参考](/gateway/configuration-reference)
- [配置示例](/gateway/configuration-examples)
- [Gateway 运行手册](/gateway)
