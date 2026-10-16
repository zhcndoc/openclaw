---
summary: "面向任务的配置方法：通道、模型、访问、会话、沙箱、cron、钩子、路由和 $include"
title: "常见任务"
sidebarTitle: "常见任务"
read_when:
  - "寻找通用设置的复制粘贴配置"
  - "设置通道、模型、访问规则或自动化"
  - "使用 $include 将一个配置文件拆分为多个配置文件"
---

## <a id="common-tasks"></a> 常见任务

<AccordionGroup>
  <Accordion id="set-up-a-channel-whatsapp-telegram-discord-etc" title="设置通道（WhatsApp、Telegram、Discord等）">
    每个通道在 `channels.<provider>` 下都有自己的配置部分。请参阅对应的通道页面了解设置步骤：

    - [Discord](/channels/discord) - `channels.discord`
    - [飞书](/channels/feishu) - `channels.feishu`
    - [Google Chat](/channels/googlechat) - `channels.googlechat`
    - [iMessage](/channels/imessage) - `channels.imessage`
    - [Mattermost](/channels/mattermost) - `channels.mattermost`
    - [微软 Teams](/channels/msteams) - `channels.msteams`
    - [信号](/channels/signal) - `channels.signal`
    - [Slack](/channels/slack) - `channels.slack`
    - [电报](/channels/telegram) - `channels.telegram`
    - [WhatsApp](/channels/whatsapp) - `channels.whatsapp`

    所有通道共享相同的 DM 策略模式：

    ```json5
    {
      channels: {
        telegram: {
          enabled: true,
          botToken: "123:abc",
          dmPolicy: "pairing",   // pairing | allowlist | open | disabled
          allowFrom: ["tg:123"], // only for allowlist/open
        },
      },
    }
    ```

  </Accordion>

  <Accordion id="choose-and-configure-models" title="选择和配置模型">
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

    - `agents.defaults.models` 存储别名和每个模型的设置；添加条目不会限制 `/model` 或 `--model` 覆盖。
    - `agents.defaults.modelPolicy.allow` 是用于覆盖和模型选择器的显式允许列表。它接受精确引用和 `provider/*` 通配符；省略它或使用 `[]` 可允许任何模型。
    - 模型参考使用 `provider/model` 格式 （e.g. `anthropic/claude-opus-4-6`）。
    - `agents.defaults.imageMaxDimensionPx`控制transcript/tool图像缩小（默认`1200`）；较低的值通常会减少大量屏幕截图运行时视觉令牌的使用。
    - 参见 [Models CLI](/concepts/models) 用于在聊天中切换模型，参见 [Model Failover](/concepts/model-failover) 用于身份验证轮换和回退行为。
    - 对于 custom/self-hosted 提供程序，请参阅参考中的 [ 自定义提供程序](/gateway/config-tools#custom-providers-and-base-urls)。

  </Accordion>

  <Accordion id="control-who-can-message-the-bot" title="Control 谁可以向机器人发送消息">
    DM 访问权限按通道通过 `dmPolicy` 控制（默认为 `"pairing"`）：

    - `"pairing"`：未知发送者会收到一次性配对代码，以供批准
    - `"allowlist"`：仅允许 `allowFrom` 中的发送者（或已配对的允许存储中的发送者）
    - `"open"`：允许所有入站 DM（需要 `allowFrom: ["*"]`）
    - `"disabled"`：忽略所有 DM

    对于群组，请使用 `groupPolicy`（`"allowlist" | "open" | "disabled"`），以及 `groupAllowFrom` 或特定通道的允许列表。

    查看[完整参考](/gateway/config-channels#dm-and-group-access)以了解各通道细节。

  </Accordion>

  <Accordion id="set-up-group-chat-mention-gating" title="设置群聊提及门控">
    群消息默认为**，需要注明**。配置每个代理的触发模式。正常group/channel自动回复帖子；选择共享房间的消息工具路径，代理应决定何时发言：

    ```json5
    {
      messages: {
        visibleReplies: "automatic", // set "message_tool" to require message-tool sends everywhere
        groupChat: {
          visibleReplies: "message_tool", // opt-in; visible output requires message(action=send)
          unmentionedInbound: "room_event", // unmentioned always-on group chatter is quiet context
        },
      },
      agents: {
        entries: {
          main: {
            groupChat: {
              mentionPatterns: ["@openclaw", "openclaw"],
            },
          },
        },
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
    - **可见回复**：`messages.visibleReplies`可以要求消息工具全局发送； `messages.groupChat.visibleReplies` 覆盖 groups/channels.
    - 有关可见回复模式、按通道覆盖以及自聊模式，请参阅[完整参考](/gateway/config-channels#group-chat-mention-gating)。

  </Accordion>

  <Accordion id="restrict-skills-per-agent" title="限制每个代理的技能">
    使用 `agents.defaults.skills` 设置共享基线，然后通过 `agents.entries.*.skills` 覆盖特定代理：

    ```json5
    {
      agents: {
        ownership: "explicit",
        defaults: {
          skills: ["github", "weather"],
          heartbeat: { agentId: "writer" },
          systemAgent: { agentId: "writer" },
          authInheritance: { agentId: "writer" },
        },
        entries: {
          writer: { workspace: "~/.openclaw/workspace" }, // inherits github, weather
          docs: { skills: ["docs-search"] }, // replaces defaults
          "locked-down": { skills: [] }, // no skills
        },
      },
      talk: { agentId: "writer" },
    }
    ```

    - 默认情况下，对于不受限制的技能，省略 `agents.defaults.skills`。
    - 省略 `agents.entries.*.skills` 以继承默认值。
    - 设置 `agents.entries.*.skills: []` 为无技能。
    - 请参见 [技能](/tools/skills)、[技能配置](/tools/skills-config)和[配置Reference](/gateway/config-agents/workspace-and-bootstrap#agents-defaults-skills)。

  </Accordion>

  <Accordion id="configure-per-channel-health-monitoring" title="配置每个通道的运行状况监控">
    禁用或启用通道或账户的自动健康重启：

    ```json5
    {
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

    - 使用 `channels.<provider>.healthMonitor.enabled` 或 `channels.<provider>.accounts.<id>.healthMonitor.enabled` 控制某个通道或账户的自动重启。
    - 请参阅 [Health Checks](/gateway/health) 以进行操作调试，并参阅 [ 完整参考 ](/gateway/config-gateway#gateway) 以了解所有字段。

  </Accordion>

  <Accordion id="configure-sessions-and-resets" title="配置会话和重置">
    会话控制对话的连续性和隔离：

    ```json5
    {
      session: {
        dmScope: "per-channel-peer",  // recommended for multi-user
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

    - `dmScope`：`main`（共享）| `per-peer` | `per-channel-peer` | `per-account-channel-peer`
    - `threadBindings`：线程绑定会话路由的全局默认值。生成 `sessions_spawn({ thread: true })` 或 `/acp spawn --thread auto`。使用 `/session unbind`、`/agents`、`/session idle` 和 `/session max-age` 分离、列出和调整绑定（Discord 绑定线程，Telegram 绑定 topics/conversations）。
    - 有关范围、身份链接和发送策略，请参阅 [Session Management](/concepts/session)。
    - 请参阅 [ 所有字段的完整参考](/gateway/config-agents/sessions#session)。

  </Accordion>

  <Accordion id="enable-sandboxing" title="启用沙箱">
    在隔离的沙箱运行时中运行代理会话：

    ```json5
    {
      agents: {
        defaults: {
          sandbox: {
            mode: "non-main",  // off | non-main | all
            scope: "agent",    // session | agent | shared
          },
        },
      },
    }
    ```

    先构建镜像 - 从源代码检出目录运行 `scripts/sandbox-setup.sh`，或在 npm 安装后查看[沙箱 § 镜像和设置](/gateway/sandboxing#images-and-setup)中内联的 `docker build` 命令。

    有关完整指南，请参阅 [Sandboxing](/gateway/sandboxing)；有关所有选项，请参阅 [ 完整参考 ](/gateway/config-agents/sandbox#agentsdefaultssandbox)。

  </Accordion>

  <Accordion id="enable-relay-backed-push-for-official-ios-builds" title="为官方 iOS 版本启用中继支持的推送">
    公共 App Store 构建使用托管的 OpenClaw 中继进行推送：`https://ios-push-relay.openclaw.ai`。

    自定义中继部署需要故意单独的 iOS build/deployment 路径，其中继 URL 与网关中继 URL 匹配。如果您使用自定义中继构建，请在网关配置中进行设置：

    ```json5
    {
      gateway: {
        push: {
          apns: {
            relay: {
              baseUrl: "https://relay.example.com",
              // Optional. Default: 10000
              timeoutMs: 10000,
            },
          },
        },
      },
    }
    ```

    CLI 等效项：

    ```bash
    openclaw config set gateway.push.apns.relay.baseUrl https://relay.example.com
    ```

    这会做什么：

    - 允许 Gateway 通过外部中继发送 `push.test`、唤醒提示和重新连接唤醒。
    - 使用由配对的 iOS 应用转发的、作用域限定于注册的发送授权。Gateway 不需要部署范围的中继令牌。
    - 将每个基于中继的注册绑定到 iOS 应用所配对的 Gateway 身份，因此其他 Gateway 无法重用已存储的注册。
    - 保留 local/manual iOS 基于直接 APN 构建。中继支持的发送仅适用于通过中继注册的官方分布式构建。
    - 必须与 iOS 构建中内置的中继基础 URL 匹配，以便注册和发送流量到达同一个中继部署。

    端到端流程：

    1. 安装官方 iOS 应用。
    2. 可选：仅在使用有意独立的自定义中继构建时，在 Gateway 上配置 `gateway.push.apns.relay.baseUrl`。
    3. 将 iOS 应用与 Gateway 配对，并让节点会话和操作员会话都连接。
    4. iOS 应用获取 Gateway 身份，使用 App Attest 和应用收据向中继注册，然后将基于中继的 `push.apns.register` 载荷发布到已配对的 Gateway。
    5. Gateway 存储中继句柄和发送授权，然后将它们用于 `push.test`、唤醒提示和重新连接唤醒。

    操作注意事项：

    - 如果你将 iOS 应用切换到不同的 Gateway，请重新连接应用，以便它可以发布绑定到该 Gateway 的新中继注册。
    - 如果你发布了指向不同中继部署的新 iOS 构建，应用会刷新其缓存的中继注册，而不是重用旧的中继来源。

    兼容性说明：

    - `OPENCLAW_APNS_RELAY_BASE_URL` 和 `OPENCLAW_APNS_RELAY_TIMEOUT_MS` 仍可作为临时环境变量覆盖使用。
    - 自定义网关中继 URL 必须与 iOS 构建中烘焙的中继基础 URL 相匹配；公共 App Store 发布通道拒绝自定义 iOS 中继 URL 覆盖。
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` 仍然是仅环回开发逃生舱口；不要在配置中保留 HTTP 中继 URL。

    有关端到端流程，请参阅 [iOS App](/platforms/ios#relay-backed-push-for-official-builds)；有关中继安全模型，请参阅 [ 身份验证和信任流程 ](/platforms/ios#authentication-and-trust-flow)。

  </Accordion>

  <Accordion id="set-up-heartbeat-periodic-check-ins" title="设置心跳（定期签入）">
    ```json5
    {
      agents: {
        defaults: {
          heartbeat: {
            every: "30m",
            target: "owner",
          },
        },
      },
    }
    ```

    - `every`：持续时间字符串（`30m`、`2h`）。设置 `0m` 禁用循环节奏；有针对性的事件驱动唤醒仍然可以运行一个代理轮次。默认值：`30m`。
    - `target`：`owner`（默认操作员 DM）| `last`（最新对话，包括群组）| `none`（仅内部）| `<channel-id>`
    - `directPolicy`：`allow`（默认）或 `block` 用于 DM- 样式心跳目标
    - 请参阅[心跳](/gateway/heartbeat)了解完整指南。

  </Accordion>

  <Accordion id="configure-cron-jobs" title="配置 cron 作业">
    ```json5
    {
      cron: {
        enabled: true,
        sessionRetention: "24h",
      },
    }
    ```

    - `sessionRetention`：从 SQLite 会话记录中清理已完成的隔离运行会话（默认值为 `24h`；设为 `false` 或 `"0h"` 等零时长可禁用）。
    - 终端运行历史记录保留 7 天（`lost` 行保留 24 小时），每个作业和历史记录类强制执行最新的 2000 行作为附加上限。
    - 请参阅[Cron 作业](/automation/cron-jobs)了解功能概览和 CLI 示例。

  </Accordion>

  <Accordion id="set-up-webhooks-hooks" title="设置网络钩子（hooks）">
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
            sessionKey: "hook:gmail",
            sessionMode: "persistent",
            deliver: true,
          },
        ],
      },
    }
    ```

    安全提示：
    - 将所有 hook/webhook 载荷内容视为不可信输入。
    - 使用专用的 `hooks.token`；不要重复使用活动中的 Gateway 身份验证密钥（`gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`）。
    - Hook 身份验证仅支持请求头（`Authorization: Bearer ...` 或 `x-openclaw-token`）；查询字符串中的令牌会被拒绝。
    - `hooks.path` 不能为 `/`；请将 webhook 入口保持在专用子路径中，例如 `/hooks`。
    - 除非进行范围严格限定的调试，否则请保持不安全内容绕过标志禁用（`hooks.gmail.allowUnsafeExternalContent`、`hooks.mappings[].allowUnsafeExternalContent`）。
    - 如果启用 `hooks.allowRequestSessionKey`，还应设置 `hooks.allowedSessionKeyPrefixes`，以限制调用方选择的会话密钥。
    - 除非有意使用持久上下文，否则请保持 hook 会话隔离。直接持久化 hook 要求显式且受前缀限制的请求 `sessionKey`；映射的持久化 hook 要求稳定的映射键或 `hooks.defaultSessionKey`。
    - 对于由 hook 驱动的代理，优先使用强大的现代模型层级和严格的工具策略（例如仅限消息发送，并尽可能启用沙箱）。

    有关所有映射选项和 Gmail 集成，请参阅 [ 完整参考](/gateway/config-hooks#hooks)。

  </Accordion>

  <Accordion id="configure-multi-agent-routing" title="配置多代理路由">
    运行多个相互隔离的代理，使用不同的工作区和会话：

    ```json5
    {
      agents: {
        ownership: "explicit",
        defaults: {
          heartbeat: { agentId: "home" },
          systemAgent: { agentId: "home" },
          authInheritance: { agentId: "home" },
        },
        entries: {
          home: { workspace: "~/.openclaw/workspace-home" },
          work: { workspace: "~/.openclaw/workspace-work" },
        },
      },
      bindings: [
        { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
        { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },
        { agentId: "home", match: { channel: "whatsapp", accountId: "*" } },
      ],
      talk: { agentId: "home" },
    }
    ```

    有关绑定规则和每个代理访问配置文件，请参阅 [Multi-Agent](/concepts/multi-agent) 和 [ 完整参考](/gateway/config-agents/entries-and-multi-agent#multi-agent-routing)。

  </Accordion>

  <Accordion id="split-config-into-multiple-files-include" title="将配置拆分为多个文件（$include）">
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

    - **单个文件**：替换所在对象
    - **文件数组**：按顺序进行深度合并（后者优先），最多嵌套 10 层
    - **同级键**：在 include 之后进行合并（覆盖被 include 的值）
    - **相对路径**：相对于包含该文件的文件解析
    - **路径格式**：include 路径不得包含空字节，并且在解析前后都必须严格短于 4096 个字符
    - **OpenClaw-owned writes**：当每个更改的密钥都由对象密钥路径中的一个单文件包含拥有时，OpenClaw 更新最深的拥有包含并保持 `openclaw.json` 不变。这适用于顶级部分（例如 `plugins: { $include: "./plugins.json5" }`）和嵌套对象映射条目。仅直写目标包括顶级配置目录中的文件；包括通过 `OPENCLAW_INCLUDE_ROOTS` 承认，对于 OpenClaw- 写入保持只读。
    - **Control UI 表单保存**：表单编辑包含解析的创作配置。未更改的经过编辑的凭据（包括 SecretRef id、通道令牌和提供程序标头）即使仅在包含的文件中编写，也会在保存后保留下来。以下相同的直写限制适用。
    - **不支持的直写**：根包含（根对象作者`$include`的配置的每个部分），实际数组条目包含，包含数组，同级覆盖，多个逻辑路径共享的文件，跨越所有权边界的更改，合并所有者下的任何嵌套包含，以及其自己的文件仍然创作嵌套的任何包含`$include` 指令拒绝写入而不是展平配置。数字对象键被视为映射键，而不是数组位置。包括围绕持久性重新检查目标和内容；对中间包含的并发编辑拒绝写入或回滚其未更改的叶子。
    - **医生修复**：`openclaw doctor --fix`通过相同的边界写入。候选者将根拥有的修复与包含拥有的修复混合在一起的运行将被整体拒绝。被拒绝的写入使每个文件保持不变（同一运行中的早期写入保持保存），Doctor 在重新运行之前手动命名要修复的边界，以及根文件创作该边界的 `$include` 时包含的一个或多个文件（代理名册边界在没有其文件的情况下命名）。
    - **限制范围**：`$include` 路径必须解析到存放 `openclaw.json` 的目录之下。若要跨机器或用户共享目录树，请将 `OPENCLAW_INCLUDE_ROOTS` 设置为路径列表（POSIX 使用 `:`，Windows 使用 `;`），其中列出 include 可以引用的其他目录。符号链接会被解析并再次检查，因此即使路径在词法上位于配置目录中，只要其实际目标逃逸出所有允许的根目录，仍会被拒绝。
    - **错误处理**：对于文件缺失、解析错误、循环 include、路径格式无效和长度超限，会提供明确的错误信息

  </Accordion>
</AccordionGroup>
