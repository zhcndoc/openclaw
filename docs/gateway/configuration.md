---
summary: "配置概览：常见任务、快速设置以及完整参考的链接"
read_when:
  - 首次设置 OpenClaw
  - 查找常见配置模式
  - 导航到特定配置部分
title: "配置"
---

OpenClaw 会从 `~/.openclaw/openclaw.json` 读取一个可选的 <Tooltip tip="JSON5 支持注释和尾随逗号">**JSON5**</Tooltip> 配置。
活动配置路径必须是普通文件。符号链接的 `openclaw.json`
布局不支持 OpenClaw 所有的写入操作；原子写入可能会替换该路径，
而不是保留符号链接。如果你将配置保存在默认状态目录之外，
请直接将 `OPENCLAW_CONFIG_PATH` 指向真实文件。

如果文件缺失，OpenClaw 将使用安全默认值。添加配置的常见原因包括：

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

- Gateway 不会启动
- 只有诊断命令可用（`openclaw doctor`、`openclaw logs`、`openclaw health`、`openclaw status`）
- 运行 `openclaw doctor` 查看确切问题
- 运行 `openclaw doctor --fix`（或 `--yes`）应用修复

Gateway 在每次成功启动后都会保留一份受信任的最近一次已知良好副本，
但启动和热重载不会自动恢复它。如果 `openclaw.json`
校验失败（包括插件本地校验），Gateway 启动会失败，或者
重载会被跳过，而当前运行时会保留最后一次接受的配置。
运行 `openclaw doctor --fix`（或 `--yes`）以修复带前缀/被覆盖的配置，或
恢复最近一次已知良好副本。当候选配置包含诸如 `***`
之类的被遮蔽密钥占位符时，不会提升为最近一次已知良好副本。

## 常见任务

<AccordionGroup>
  <Accordion title="设置通道（WhatsApp、Telegram、Discord 等）">
    每个通道在 `channels.<provider>` 下都有自己的配置部分。请参阅对应的通道页面了解设置步骤：

    - [WhatsApp](/channels/whatsapp) - `channels.whatsapp`
    - [Telegram](/channels/telegram) - `channels.telegram`
    - [Discord](/channels/discord) - `channels.discord`
    - [Feishu](/channels/feishu) - `channels.feishu`
    - [Google Chat](/channels/googlechat) - `channels.googlechat`
    - [Microsoft Teams](/channels/msteams) - `channels.msteams`
    - [Slack](/channels/slack) - `channels.slack`
    - [Signal](/channels/signal) - `channels.signal`
    - [iMessage](/channels/imessage) - `channels.imessage`
    - [Mattermost](/channels/mattermost) - `channels.mattermost`

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

  <Accordion title="控制谁可以给机器人发消息">
    DM 访问通过 `dmPolicy` 按通道控制：

    - `"pairing"`（默认）：未知发送者会收到一次性的配对码以进行批准
    - `"allowlist"`：仅限 `allowFrom` 中的发送者（或已配对允许存储）
    - `"open"`：允许所有传入 DM（需要 `allowFrom: ["*"]`）
    - `"disabled"`：忽略所有 DM

    对于群组，请使用 `groupPolicy` + `groupAllowFrom` 或通道特定允许列表。

    查看[完整参考](/gateway/config-channels#dm-and-group-access)以了解各通道细节。

  </Accordion>

  <Accordion title="设置群聊提及门控">
    群消息默认 **需要提及**。请为每个代理配置触发模式，并保持可见房间回复走默认的 message-tool 路径，除非你有意让每个普通群回复都使用旧式自动最终回复路径：

    ```json5
    {
      messages: {
        visibleReplies: "automatic", // 设为 "message_tool" 可在全局要求 message-tool 发送
        groupChat: {
          visibleReplies: "message_tool", // 默认；可见输出需要 message(action=send)
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

    - 设置 `gateway.channelHealthCheckMinutes: 0` 可全局禁用健康监控重启。
    - `channelStaleEventThresholdMinutes` 应大于或等于检查间隔。
    - 使用 `channels.<provider>.healthMonitor.enabled` 或 `channels.<provider>.accounts.<id>.healthMonitor.enabled` 可仅为某个通道或账户禁用自动重启，而不关闭全局监控。
    - 有关运行时调试，请参阅 [Health Checks](/gateway/health)；有关所有字段，请参阅[完整参考](/gateway/configuration-reference#gateway)。

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

    - `dmScope`: `main`（共享）| `per-peer` | `per-channel-peer` | `per-account-channel-peer`
    - `threadBindings`：线程绑定会话路由的全局默认值（Discord 支持 `/focus`、`/unfocus`、`/agents`、`/session idle` 和 `/session max-age`）。
    - 有关作用域、身份链接和发送策略，请参阅 [会话管理](/concepts/session)。
    - 有关所有字段，请参阅[完整参考](/gateway/config-agents#session)。

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

  <Accordion title="为官方 iOS 构建启用中继支持的推送">
    中继支持的推送在 `openclaw.json` 中配置。

    在 gateway 配置中设置：

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

    - 让 gateway 可以通过外部中继发送 `push.test`、唤醒提示以及重连唤醒。
    - 使用由配对的 iOS 应用转发的注册范围发送授权。Gateway 不需要部署范围的中继令牌。
    - 将每个中继支持的注册绑定到 iOS 应用所配对的 gateway 身份，因此其他 gateway 不能复用已存储的注册。
    - 让本地/手动 iOS 构建继续直接使用 APNs。中继支持的发送仅适用于通过中继注册的官方分发构建。
    - 必须与官方/TestFlight iOS 构建中内置的中继基础 URL 匹配，因此注册和发送流量会到达同一个中继部署。

    端到端流程：

    1. 安装一个使用相同中继基础 URL 编译的官方/TestFlight iOS 构建。
    2. 在 gateway 上配置 `gateway.push.apns.relay.baseUrl`。
    3. 将 iOS 应用配对到 gateway，并让 node 和 operator 会话都连接起来。
    4. iOS 应用获取 gateway 身份，使用 App Attest 加应用收据向中继注册，然后将中继支持的 `push.apns.register` 载荷发布到已配对的 gateway。
    5. Gateway 存储中继句柄和发送授权，然后将它们用于 `push.test`、唤醒提示和重连唤醒。

    运维说明：

    - 如果你将 iOS 应用切换到不同的 gateway，请重新连接应用，以便它可以发布绑定到该 gateway 的新中继注册。
    - 如果你发布了指向不同中继部署的新 iOS 构建，应用会刷新其缓存的中继注册，而不是重用旧的中继来源。

    兼容性说明：

    - `OPENCLAW_APNS_RELAY_BASE_URL` 和 `OPENCLAW_APNS_RELAY_TIMEOUT_MS` 仍可作为临时环境变量覆盖。
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` 仍然是仅限回环的开发逃生口；不要在配置中持久保存 HTTP 中继 URL。

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

    - `every`：时长字符串（`30m`、`2h`）。设为 `0m` 可禁用。
    - `target`：`last` | `none` | `<channel-id>`（例如 `discord`、`matrix`、`telegram` 或 `whatsapp`）
    - `directPolicy`：用于 DM 风格心跳目标的 `allow`（默认）或 `block`
    - 有关完整指南，请参阅 [Heartbeat](/gateway/heartbeat)。

  </Accordion>

  <Accordion title="配置 cron 作业">
    ```json5
    {
      cron: {
        enabled: true,
        maxConcurrentRuns: 2, // cron 分发 + 隔离的 cron 代理轮执行
        sessionRetention: "24h",
        runLog: {
          maxBytes: "2mb",
          keepLines: 2000,
        },
      },
    }
    ```

    - `sessionRetention`：从 `sessions.json` 中清理已完成的隔离运行会话（默认 `24h`；设为 `false` 可禁用）。
    - `runLog`：按大小和保留行数清理 `cron/runs/<jobId>.jsonl`。
    - 有关功能概览和 CLI 示例，请参阅 [Cron 作业](/automation/cron-jobs)。

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

    安全提示：
    - 将所有 hook/webhook 负载内容视为不受信任的输入。
    - 使用专用的 `hooks.token`；不要重复使用共享的 Gateway 令牌。
    - Hook 身份验证仅限请求头（`Authorization: Bearer ...` 或 `x-openclaw-token`）；查询字符串令牌会被拒绝。
    - `hooks.path` 不能是 `/`；请将 webhook 入口放在专用子路径下，例如 `/hooks`。
    - 除非进行范围非常受限的调试，否则请保持不安全内容绕过标志为禁用（`hooks.gmail.allowUnsafeExternalContent`、`hooks.mappings[].allowUnsafeExternalContent`）。
    - 如果启用 `hooks.allowRequestSessionKey`，还应设置 `hooks.allowedSessionKeyPrefixes` 来限定调用方可选择的会话键。
    - 对于 hook 驱动的代理，优先使用更强的现代模型层级和严格的工具策略（例如尽可能仅消息 + 沙箱）。

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

    - **单文件**：替换其包含的对象
    - **文件数组**：按顺序深度合并（后者覆盖前者）
    - **同级键**：在 includes 之后合并（覆盖被包含的值）
    - **嵌套 includes**：支持最多 10 层深度
    - **相对路径**：相对于包含文件解析
    - **OpenClaw 所有的写入操作**：当一次写入只更改一个由单文件 include 支持的顶层部分时，例如 `plugins: { $include: "./plugins.json5" }`，
      OpenClaw 会更新该包含文件并保持 `openclaw.json` 不变
    - **不支持的透传写入**：根 include、include 数组以及带同级覆盖的 includes
      对 OpenClaw 所有的写入操作会直接失败，而不会
      扁平化配置
    - **隔离**：`$include` 路径必须解析到 `openclaw.json` 所在目录下。若要在机器或用户之间共享树结构，请将 `OPENCLAW_INCLUDE_ROOTS` 设置为路径列表（POSIX 上用 `:`，Windows 上用 `;`），指向 includes 可引用的额外目录。符号链接会被解析并重新检查，因此即使某路径在字面上位于配置目录中，但其真实目标逃逸出所有允许根目录，也仍会被拒绝。
    - **错误处理**：对缺失文件、解析错误和循环 includes 提供清晰错误

  </Accordion>
</AccordionGroup>

## 配置热重载

Gateway 会监视 `~/.openclaw/openclaw.json` 并自动应用更改——大多数设置无需手动重启。

直接文件编辑在验证通过之前都被视为不可信。监视器会等待
编辑器临时写入/重命名的抖动稳定下来，读取最终文件，并拒绝
无效的外部编辑，而不会重写 `openclaw.json`。OpenClaw 自身的配置
写入在写入前也会使用相同的架构门控；诸如
删除 `gateway.mode` 或将文件缩小超过一半等破坏性覆盖会被拒绝，并
保存为 `.rejected.*` 以供检查。

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

大多数字段都可在不停机的情况下热应用。在 `hybrid` 模式下，需要重启的更改会自动处理。

| 类别                | 字段                                                              | 需要重启？ |
| ------------------- | ----------------------------------------------------------------- | ---------- |
| 通道                | `channels.*`、`web`（WhatsApp）- 所有内置和插件通道              | 否         |
| 代理与模型          | `agent`、`agents`、`models`、`routing`                            | 否         |
| 自动化              | `hooks`、`cron`、`agent.heartbeat`                                | 否         |
| 会话与消息          | `session`、`messages`                                             | 否         |
| 工具与媒体          | `tools`、`browser`、`skills`、`mcp`、`audio`、`talk`              | 否         |
| UI 与其他           | `ui`、`logging`、`identity`、`bindings`                           | 否         |
| Gateway 服务器      | `gateway.*`（port、bind、auth、tailscale、TLS、HTTP）              | **是**     |
| 基础设施            | `discovery`、`plugins`                                            | **是**     |

<Note>
`gateway.reload` 和 `gateway.remote` 是例外——更改它们不会触发重启。
</Note>

### 重载规划

当你编辑一个通过 `$include` 引用的源文件时，OpenClaw 会根据源作者布局来规划重载，
而不是按内存中的扁平化视图来规划。这样即使某个顶层部分位于自己独立的包含文件中，
例如 `plugins: { $include: "./plugins.json5" }`，热重载决策（热应用还是重启）也会保持可预测。
如果源布局存在歧义，重载规划会失败关闭。

## 配置 RPC（程序化更新）

对于通过 gateway API 写入配置的工具，建议使用以下流程：

- `config.schema.lookup` 用于检查一个子树（浅层 schema 节点 + 子节点
  摘要）
- `config.get` 用于获取当前快照以及 `hash`
- `config.patch` 用于部分更新（JSON merge patch：对象合并，`null`
  删除，数组替换）
- `config.apply` 仅在你打算替换整个配置时使用
- `update.run` 用于显式自更新并重启；当重启后的会话应运行一次后续回合时，请包含 `continuationMessage`
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

`config.apply` 和 `config.patch` 都接受 `raw`、`baseHash`、`sessionKey`、
`note` 和 `restartDelayMs`。当
配置已存在时，这两种方法都需要 `baseHash`。

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

环境变量等价项：`OPENCLAW_LOAD_SHELL_ENV=1`
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
