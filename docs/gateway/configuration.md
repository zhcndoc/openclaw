---
summary: "配置概览：常见任务、快速设置以及完整参考的链接"
read_when:
  - 首次设置 OpenClaw
  - 查找常见配置模式
  - 导航到特定配置部分
title: "配置"
---

OpenClaw 从 `~/.openclaw/openclaw.json` 读取可选的 <Tooltip tip="JSON5 支持注释和尾随逗号">**JSON5**</Tooltip> 配置文件。如果文件不存在，OpenClaw 将使用安全默认值。

活动配置路径必须是普通文件。OpenClaw 所有的写入操作都会以原子方式替换该文件（将文件重命名到目标路径），因此符号链接形式的 `openclaw.json` 会被替换其目标，而不是通过链接写入——请避免使用符号链接形式的配置布局。如果你将配置保存在默认状态目录之外，请将 `OPENCLAW_CONFIG_PATH` 直接指向实际文件。

添加配置的常见原因：

- 连接通道并控制谁可以给机器人发消息
- 设置模型、工具、沙箱或自动化（cron、hooks）
- 调整会话、媒体、网络或 UI

请参阅[完整参考](/gateway/configuration-reference)以查看所有可用字段。

配置遵循“双存储区”规则：根级同级字段存放基础设施和跨代理默认值，而 `agents.defaults` 存放代理循环行为。`agents.entries` 下的条目可以在架构支持按代理覆盖的情况下，覆盖任一存储区中的设置。

代理和自动化在编辑配置前，应使用 `config.schema.lookup` 获取精确到字段级别的
文档。本页面用于提供面向任务的指导，[配置参考](/gateway/configuration-reference)则用于查看更广泛的
字段映射和默认值。

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
  <Tab title="控制界面">
    打开 [http://127.0.0.1:18789](http://127.0.0.1:18789) 并使用 **配置** 标签页。
    控制界面会根据实时配置架构生成表单，其中包括字段的
    `title` / `description` 文档元数据，以及可用的插件和频道架构，
    并提供 **原始 JSON** 编辑器作为备用方式。对于下钻界面和其他工具，
    网关还提供 `config.schema.lookup`，用于获取一个路径范围内的架构节点及其直接子节点摘要。
    设置会优先显示常用字段。每个部分都会将高级字段收纳在折叠的
    **高级（N）** 组中；使用 **显示高级** 可展开所有组。设置搜索始终包含这两个层级，
    并会在需要时打开匹配的高级组。**设置 -> 频道** 下的每个频道设置
    使用相同的分组方式，并共享 **显示高级** 偏好；
    点击分隔线上的 **隐藏高级** 可再次将其折叠。
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

每个配置叶节点在 `uiHints` 中都有通用或高级展示层级。
`advanced: false` 表示常用设置，`advanced: true` 表示高级设置。
如果叶节点没有直接提示，则会继承最近祖先节点的层级；
没有声明祖先的路径默认使用高级层级。这只影响展示，不影响校验、默认值、重新加载行为，也不影响是否可以设置该键。

校验失败时：

- Gateway 不会启动
- 只有诊断命令可用（`openclaw doctor`、`openclaw logs`、`openclaw health`、`openclaw status`）
- 运行 `openclaw doctor` 查看具体问题
- 运行 `openclaw doctor --fix`（`--repair` 是相同的标志；`--yes` 会跳过提示）以应用修复

Gateway 每次成功启动后都会保留一份可信的最新正常副本，
但启动和热重载不会自动恢复该副本——只有 `openclaw doctor --fix`
会执行此操作。如果 `openclaw.json` 未通过校验（包括插件本地校验），Gateway
启动会失败或跳过重载，当前运行时会继续使用上一次接受的配置。
被拒绝的写入还会以 `<path>.rejected.<timestamp>` 的形式保存，以便检查。
Gateway 会阻止看起来像意外覆盖的写入——例如删除 `gateway.mode`、
丢失 `meta` 块，或使文件大小缩小超过一半——除非该写入明确允许破坏性更改。
当候选配置包含诸如 `***` 或 `[redacted]` 之类的已脱敏密钥占位符时，不会将其提升为最新正常副本。

## 常见任务

<AccordionGroup>
  <Accordion title="设置通道（WhatsApp、Telegram、Discord 等）">
    每个通道在 `channels.<provider>` 下都有自己的配置部分。请参阅对应的通道页面了解设置步骤：

    - [Discord](/channels/discord) - `channels.discord`
    - [飞书](/channels/feishu) - `channels.feishu`
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

    - `agents.defaults.models` 存储别名和每个模型的设置；添加条目不会限制 `/model` 或 `--model` 覆盖。
    - `agents.defaults.modelPolicy.allow` 是用于覆盖和模型选择器的显式允许列表。它接受精确引用和 `provider/*` 通配符；省略它或使用 `[]` 可允许任何模型。
    - 模型引用使用 `provider/model` 格式（例如 `anthropic/claude-opus-4-6`）。
    - `agents.defaults.imageMaxDimensionPx` 控制对话记录/工具图像的缩小尺寸（默认为 `1200`）；较低的值通常可减少大量使用截图的运行中的视觉令牌用量。
    - 请参阅[模型 CLI](/concepts/models)了解如何在聊天中切换模型，并参阅[模型故障转移](/concepts/model-failover)了解身份验证轮换和回退行为。
    - 对于自定义/自托管提供商，请参阅参考文档中的[自定义提供商](/gateway/config-tools#custom-providers-and-base-urls)。

  </Accordion>

  <Accordion title="控制谁可以向机器人发送消息">
    DM 访问权限按通道通过 `dmPolicy` 控制（默认为 `"pairing"`）：

    - `"pairing"`：未知发送者会收到一次性配对代码，以供批准
    - `"allowlist"`：仅允许 `allowFrom` 中的发送者（或已配对的允许存储中的发送者）
    - `"open"`：允许所有传入的 DM（要求使用 `allowFrom: ["*"]`）
    - `"disabled"`：忽略所有 DM

    对于群组，请使用 `groupPolicy`（`"allowlist" | "open" | "disabled"`），以及 `groupAllowFrom` 或特定通道的允许列表。

    查看[完整参考](/gateway/config-channels#dm-and-group-access)以了解各通道细节。

  </Accordion>

  <Accordion title="设置群聊提及门控">
    群组消息默认**要求提及**。为每个代理配置触发模式。普通群组/通道回复会自动发布；对于代理应决定何时发言的共享聊天室，可选择使用消息工具路径：

    ```json5
    {
      messages: {
        visibleReplies: "automatic", // 设为 "message_tool" 可在全局要求 message-tool 发送
        groupChat: {
          visibleReplies: "message_tool", // 选择启用；可见输出需要 message(action=send)
          unmentionedInbound: "room_event", // 未提及的始终开启的群聊内容作为静默上下文
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

  <Accordion title="限制每个代理可使用的技能">
    使用 `agents.defaults.skills` 设置共享基线，然后通过 `agents.entries.*.skills` 覆盖特定代理：

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

    - 默认情况下省略 `agents.defaults.skills` 可不限制技能。
    - 省略 `agents.entries.*.skills` 可继承默认值。
    - 将 `agents.entries.*.skills` 设为 `[]` 表示不使用任何技能。
    - 请参阅[技能](/tools/skills)、[技能配置](/tools/skills-config)以及[配置参考](/gateway/config-agents#agents-defaults-skills)。

  </Accordion>

  <Accordion title="配置每个通道的健康监控">
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
    - 请参阅[健康检查](/gateway/health)了解运行调试信息，并参阅[完整参考](/gateway/configuration-reference#gateway)了解所有字段。

  </Accordion>

  <Accordion title="配置会话和重置">
    会话控制对话的连续性和隔离：

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

    - `dmScope`：`main`（共享）| `per-peer` | `per-channel-peer` | `per-account-channel-peer`
    - `threadBindings`：线程绑定会话路由的全局默认设置。`/focus`、`/unfocus`、`/agents`、`/session idle` 和 `/session max-age` 可绑定、解除绑定、列出并调整每个会话的这些设置（Discord 绑定线程，Telegram 绑定主题/对话）。
    - 请参阅[会话管理](/concepts/session)了解范围、身份链接和发送策略。
    - 请参阅[完整参考](/gateway/config-agents#session)了解所有字段。

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

    先构建镜像 - 从源代码检出目录运行 `scripts/sandbox-setup.sh`，或在 npm 安装后查看[沙箱 § 镜像和设置](/gateway/sandboxing#images-and-setup)中内联的 `docker build` 命令。

    有关完整指南，请参阅[沙箱](/gateway/sandboxing)；有关所有选项，请参阅[完整参考](/gateway/config-agents#agentsdefaultssandbox)。

  </Accordion>

  <Accordion title="为官方 iOS 构建启用中继支持的推送">
    公共 App Store 构建使用托管的 OpenClaw 中继进行推送：`https://ios-push-relay.openclaw.ai`。

    自定义中继部署需要采用有意独立的 iOS 构建/部署路径，并确保其中继 URL 与 Gateway 中继 URL 匹配。如果你使用自定义中继构建，请在 Gateway 配置中设置：

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

    - 允许 Gateway 通过外部中继发送 `push.test`、唤醒提示和重新连接唤醒。
    - 使用由配对的 iOS 应用转发的、作用域限定于注册的发送授权。Gateway 不需要部署范围的中继令牌。
    - 将每个基于中继的注册绑定到 iOS 应用所配对的 Gateway 身份，因此其他 Gateway 无法重用已存储的注册。
    - 本地/手动 iOS 构建继续使用直接 APNs。基于中继的发送仅适用于通过中继注册的官方分发构建。
    - 必须与 iOS 构建中内置的中继基础 URL 匹配，以便注册和发送流量到达同一个中继部署。

    端到端流程：

    1. 安装官方 iOS 应用。
    2. 可选：仅在使用有意独立的自定义中继构建时，在 Gateway 上配置 `gateway.push.apns.relay.baseUrl`。
    3. 将 iOS 应用与 Gateway 配对，并让节点会话和操作员会话都连接。
    4. iOS 应用获取 Gateway 身份，使用 App Attest 和应用收据向中继注册，然后将基于中继的 `push.apns.register` 载荷发布到已配对的 Gateway。
    5. Gateway 存储中继句柄和发送授权，然后将它们用于 `push.test`、唤醒提示和重新连接唤醒。

    运维说明：

    - 如果你将 iOS 应用切换到不同的 Gateway，请重新连接应用，以便它可以发布绑定到该 Gateway 的新中继注册。
    - 如果你发布了指向不同中继部署的新 iOS 构建，应用会刷新其缓存的中继注册，而不是重用旧的中继来源。

    兼容性说明：

    - `OPENCLAW_APNS_RELAY_BASE_URL` 和 `OPENCLAW_APNS_RELAY_TIMEOUT_MS` 仍可作为临时环境变量覆盖使用。
    - 自定义 Gateway 中继 URL 必须与 iOS 构建中内置的中继基础 URL 匹配；公共 App Store 发布渠道会拒绝自定义 iOS 中继 URL 覆盖。
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` 仍是仅限回环地址的开发逃生开关；不要在配置中持久化 HTTP 中继 URL。

    有关端到端流程，请参阅[iOS 应用](/platforms/ios#relay-backed-push-for-official-builds)；有关中继安全模型，请参阅[认证与信任流程](/platforms/ios#authentication-and-trust-flow)。

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

    - `every`：时长字符串（`30m`、`2h`）。设为 `0m` 可禁用。默认值：`30m`。
    - `target`：`last` | `none` | `<channel-id>`（例如 `discord`、`matrix`、`telegram` 或 `whatsapp`）
    - `directPolicy`：对于 DM 样式的心跳目标，使用 `allow`（默认）或 `block`
    - 请参阅[心跳](/gateway/heartbeat)了解完整指南。

  </Accordion>

  <Accordion title="配置 cron 作业">
    ```json5
    {
      cron: {
        enabled: true,
        sessionRetention: "24h",
      },
    }
    ```

    - `sessionRetention`：从 SQLite 会话记录中清理已完成的隔离运行会话（默认值为 `24h`；设为 `false` 或 `"0h"` 等零时长可禁用）。
    - 运行历史会自动为每个作业保留最新的 2000 条终止状态记录；丢失的记录仍会保留 24 小时的清理窗口。
    - 请参阅[Cron 作业](/automation/cron-jobs)了解功能概览和 CLI 示例。

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

    有关绑定规则和每个代理的访问配置文件，请参阅[多代理](/concepts/multi-agent)和[完整参考](/gateway/config-agents#multi-agent-routing)。

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

    - **单个文件**：替换所在对象
    - **文件数组**：按顺序进行深度合并（后者优先），最多嵌套 10 层
    - **同级键**：在 include 之后进行合并（覆盖被 include 的值）
    - **相对路径**：相对于包含该文件的文件解析
    - **路径格式**：include 路径不得包含空字节，并且在解析前后都必须严格短于 4096 个字符
    - **OpenClaw 写入**：当一次写入只修改由单文件 include 支持的一个顶层部分时，例如 `plugins: { $include: "./plugins.json5" }`，OpenClaw 会更新被 include 的文件，并保持 `openclaw.json` 不变
    - **不支持写回**：根 include、include 数组以及带有同级覆盖的 include 对 OpenClaw 写入会直接失败，而不会将配置扁平化
    - **限制范围**：`$include` 路径必须解析到存放 `openclaw.json` 的目录之下。若要跨机器或用户共享目录树，请将 `OPENCLAW_INCLUDE_ROOTS` 设置为路径列表（POSIX 使用 `:`，Windows 使用 `;`），其中列出 include 可以引用的其他目录。符号链接会被解析并再次检查，因此即使路径在词法上位于配置目录中，只要其实际目标逃逸出所有允许的根目录，仍会被拒绝。
    - **错误处理**：对于文件缺失、解析错误、循环 include、路径格式无效和长度超限，会提供明确的错误信息

  </Accordion>
</AccordionGroup>

## 配置热重载

Gateway 会监视 `~/.openclaw/openclaw.json` 并自动应用更改——大多数设置无需手动重启。

直接编辑文件在通过验证之前会被视为不受信任。监视器会等待编辑器临时写入/重命名操作稳定下来，读取最终文件，并拒绝无效的外部编辑，而不会重写 `openclaw.json`。OpenClaw 自有的配置写入在写入前也会使用相同的模式验证机制（有关适用于每次写入的覆盖/回滚规则，请参阅[严格验证](#strict-validation)）。

如果你看到 `config reload skipped (invalid config)` 或启动报告 `Invalid
config`，请检查配置，运行 `openclaw config validate`，然后运行 `openclaw
doctor --fix` 进行修复。请参阅 [Gateway 故障排查](/gateway/troubleshooting#gateway-rejected-invalid-config)
获取检查清单。

### 重载模式

| 模式                   | 行为                                                                         |
| ---------------------- | ----------------------------------------------------------------------------- |
| **`hybrid`**（默认）   | 立即热应用安全更改。对于关键更改会自动重启。                                 |
| **`off`**              | 禁用文件监视。更改将在下一次手动重启时生效。                                 |

```json5
{
  gateway: {
    reload: { mode: "hybrid" },
  },
}
```

早期的 `hot` 和 `restart` 模式已弃用；[`openclaw doctor --fix`](/cli/doctor) 会将两者映射为 `hybrid`。重载防抖不再可配置，而是使用内置的默认值运行。

### 哪些更改会热应用，哪些需要重启

大多数字段都可以在不中断服务的情况下热应用；某些热应用的部分会重启对应的子系统（频道、定时任务、心跳、健康监视器），而不是整个 Gateway。在 `hybrid` 模式下，需要重启 Gateway 的更改会被自动处理。

| 类别               | 字段                                                                  | 是否需要重启 Gateway？         |
| ------------------- | ----------------------------------------------------------------------- | ---------------------------- |
| 频道               | `channels.*`、`web`（WhatsApp）——所有内置频道和插件频道                | 否（重启对应频道）             |
| 代理与模型         | `agent`、`agents`、`models`、`routing`                                  | 否                           |
| 自动化             | `hooks`、`cron`、`agent.heartbeat`                                      | 否（重启对应子系统）           |
| 会话与消息         | `session`、`messages`                                                   | 否                           |
| 工具与媒体         | `tools`、`skills`、`mcp`、`audio`、`talk`                               | 否                           |
| 插件配置           | `plugins.entries.*`、`plugins.allow`、`plugins.deny`、`plugins.enabled` | 否（重新加载插件运行时）       |
| 界面与其他         | `ui`、`logging`、`identity`、`bindings`                                 | 否                           |
| Gateway 服务器     | `gateway.*`（端口、绑定、身份验证、Tailscale、TLS、HTTP、推送）         | **是**                       |
| 基础设施           | `discovery`、`browser`、`plugins.load`、`plugins.installs`              | **是**                       |

<Note>
`gateway.reload` 和 `gateway.remote` 是 `gateway.*` 下的例外——更改它们**不会**触发重启。单个插件也可以覆盖此表：已加载的插件可能会声明自己的触发重启的配置前缀（例如，内置 Canvas 插件会因 `plugins.enabled`、`plugins.allow` 和 `plugins.deny` 重启 Gateway，而不仅仅是其自身的 `plugins.entries.canvas`），因此实际行为取决于当前启用的插件。
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
控制平面写入（`config.apply`、`config.patch`、`update.run`）受到速率限制：每个方法针对每个
`deviceId+clientIp` 每 60 秒最多 30 个请求；请参阅[速率限制](/gateway/security/rate-limiting)。重启
请求会合并处理，随后在每个重启周期之间强制执行 30 秒的冷却时间。
`update.status` 是只读的，但其作用域为管理员，因为重启哨兵可能包含更新步骤摘要和命令输出尾部。
</Note>

部分补丁示例：

```bash
openclaw gateway call config.get --params '{}'  # 捕获 payload.hash
openclaw gateway call config.patch --params '{
  "raw": "{ channels: { telegram: { groups: { \"*\": { requireMention: false } } } } }",
  "baseHash": "<hash>"
}'
```

`config.apply` 和 `config.patch` 都接受 `raw`、`baseHash`、`sessionKey`、
`note` 和 `restartDelayMs`。一旦配置文件已经存在，两个方法都要求提供
`baseHash`（首次写入且不存在现有配置时会跳过检查）。

`config.patch` 还接受 `replacePaths`，这是一个配置路径数组，用于明确表示有意替换数组。如果补丁会用更少的条目替换或删除现有数组，Gateway 将拒绝写入，除非该确切路径出现在 `replacePaths` 中；数组条目下的嵌套数组使用 `[]`，例如
`agents.entries.*.skills`。这可以防止被截断的 `config.get` 快照在不知情的情况下破坏路由或允许列表数组。当你打算替换完整配置时，请使用 `config.apply`。

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
  如果启用且预期的键未设置，OpenClaw 会运行你的登录 Shell，并且只导入缺失的键：

```json5
{
  env: {
    shellEnv: { enabled: true, timeoutMs: 15000 },
  },
}
```

环境变量等价形式：`OPENCLAW_LOAD_SHELL_ENV=1`。默认 `timeoutMs`：`15000`。
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

<Accordion title="密钥引用（env、file、exec）">
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
      serviceAccount: {
        source: "exec",
        provider: "vault",
        id: "channels/googlechat/serviceAccount",
      },
    },
  },
}
```

SecretRef 详情（包括用于 `env`/`file`/`exec` 的 `secrets.providers`）见 [密钥管理](/gateway/secrets)。
支持的凭据路径列在 [SecretRef 凭据范围](/reference/secretref-credential-surface)。
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
