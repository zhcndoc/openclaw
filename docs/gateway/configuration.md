---
summary: "配置概览：常见任务、快速设置及完整参考链接"
read_when:
  - 第一次设置 OpenClaw
  - 寻找常见配置模式
  - 导航到特定配置部分
title: "配置"
---

OpenClaw 会从 `~/.openclaw/openclaw.json` 读取一个可选的 <Tooltip tip="JSON5 支持注释和尾随逗号">**JSON5**</Tooltip> 配置。
活动配置路径必须是普通文件。对于 OpenClaw 所拥有的写入，不支持符号链接的 `openclaw.json`
布局；原子写入可能会替换该路径，而不是保留符号链接。如果你将配置放在默认状态目录之外，
请将 `OPENCLAW_CONFIG_PATH` 直接指向真实文件。

如果文件不存在，OpenClaw 将使用安全默认值。添加配置的常见原因包括：

- 连接渠道并控制谁可以给机器人发消息
- 设置模型、工具、沙箱环境或自动化（定时任务、钩子）
- 调整会话、媒体、网络或 UI

请参阅所有可用字段的 [完整参考](/gateway/configuration-reference)。

<Tip>
**配置新手？** 请先运行 `openclaw onboard` 进行交互式设置，或查看 [配置示例](/gateway/configuration-examples) 指南，获取完整的复制粘贴配置。
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
  <Tab title="命令行（单行命令）">
    ```bash
    openclaw config get agents.defaults.workspace
    openclaw config set agents.defaults.heartbeat.every "2h"
    openclaw config unset plugins.entries.brave.config.webSearch.apiKey
    ```
  </Tab>
  <Tab title="控制 UI">
    打开 [http://127.0.0.1:18789](http://127.0.0.1:18789) 并使用 **配置** 标签页。
    控制 UI 根据实时配置 schema 渲染表单，包括字段
    `title` / `description` 文档元数据以及插件和渠道 schema（如果
    可用），并提供 **原始 JSON** 编辑器作为逃生通道。对于钻取
    UI 和其他工具，网关还暴露 `config.schema.lookup` 以
    获取一个路径范围的 schema 节点及直接子项摘要。
  </Tab>
  <Tab title="直接编辑">
    直接编辑 `~/.openclaw/openclaw.json` 文件。Gateway 会监视该文件并自动应用更改（参见 [热重载](#config-hot-reload)）。
  </Tab>
</Tabs>

## 严格校验

<Warning>
OpenClaw 仅接受完全符合 schema 的配置。未知键、类型错误或无效值都会导致 Gateway **拒绝启动**。唯一的根级例外是 `$schema`（字符串），允许编辑器附加 JSON Schema 元数据。
</Warning>

`openclaw config schema` 会打印 Control UI 和验证所使用的规范 JSON Schema。`config.schema.lookup` 会获取单个路径范围节点以及用于下钻工具的子项摘要。字段 `title`/`description` 的文档元数据会传递到嵌套对象、通配符（`*`）、数组项（`[]`）以及 `anyOf`/`oneOf`/`allOf` 分支中。运行时插件和渠道 schema 会在清单注册表加载后合并进来。

当验证失败时：

- Gateway 不启动
- 仅诊断命令可用（`openclaw doctor`、`openclaw logs`、`openclaw health`、`openclaw status`）
- 运行 `openclaw doctor` 查看具体问题
- 运行 `openclaw doctor --fix`（或 `--yes`）自动修复

每次成功启动后，Gateway 都会保留一份受信任的最近已知良好副本。如果之后 `openclaw.json` 验证失败（或缺少 `gateway.mode`、大幅缩小，或者前面多了一行日志），OpenClaw 会将损坏文件保留为 `.clobbered.*`，恢复最近已知良好副本，并记录恢复原因。下一次代理回合还会收到系统事件警告，这样主代理就不会盲目重写已恢复的配置。如果候选内容包含诸如 `***` 之类的已脱敏秘密占位符，则会跳过晋升为最近已知良好版本。

## 常见任务

<AccordionGroup>
  <Accordion title="设置渠道（WhatsApp、Telegram、Discord 等）">
    每个渠道都有自己的配置节，位于 `channels.<provider>` 下。请参见对应渠道页面的设置步骤：

    - [WhatsApp](/channels/whatsapp) — `channels.whatsapp`
    - [Telegram](/channels/telegram) — `channels.telegram`
    - [Discord](/channels/discord) — `channels.discord`
    - [Feishu](/channels/feishu) — `channels.feishu`
    - [Google Chat](/channels/googlechat) — `channels.googlechat`
    - [Microsoft Teams](/channels/msteams) — `channels.msteams`
    - [Slack](/channels/slack) — `channels.slack`
    - [Signal](/channels/signal) — `channels.signal`
    - [iMessage](/channels/imessage) — `channels.imessage`
    - [Mattermost](/channels/mattermost) — `channels.mattermost`

    所有渠道共享相同的私信（DM）策略模式：

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
    设置主模型及可选的备用模型：

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

    - `agents.defaults.models` 定义模型目录，并作为 `/model` 的允许列表。
    - 使用 `openclaw config set agents.defaults.models '<json>' --strict-json --merge` 可在不删除现有模型的情况下添加允许列表项。若普通替换会删除条目，则会被拒绝，除非你传入 `--replace`。
    - 模型引用使用 `provider/model` 格式（例如 `anthropic/claude-opus-4-6`）。
    - `agents.defaults.imageMaxDimensionPx` 控制转录/工具图像缩放（默认 `1200`）；较低值通常可减少在大量截图运行中的视觉 token 使用。
    - 请参阅 [Models CLI](/concepts/models) 了解在聊天中切换模型，以及 [Model Failover](/concepts/model-failover) 了解认证轮换和回退行为。
    - 对于自定义/自托管提供方，请参阅参考中的 [Custom providers](/gateway/config-tools#custom-providers-and-base-urls)。

  </Accordion>

  <Accordion title="控制谁可以给机器人发消息">
    私信访问通过渠道的 `dmPolicy` 控制：

    - `"pairing"`（默认）：未知发送者获得一次性配对码用于批准
    - `"allowlist"`：仅允许 `allowFrom` 中的发送者（或配对的允许存储）
    - `"open"`：允许所有入站私信（需设为 `allowFrom: ["*"]`）
    - `"disabled"`：忽略所有私信

    群组请使用 `groupPolicy` + `groupAllowFrom` 或渠道特定的允许列表。

    详见 [完整参考](/gateway/config-channels#dm-and-group-access) 了解各渠道细节。

  </Accordion>

  <Accordion title="设置群聊@提及门控">
    群消息默认 **需要提及**。可按代理配置匹配模式：

    ```json5
    {
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

    - **元数据提及**：原生 @ 提及（WhatsApp 点击提及、Telegram @bot 等）
    - **文本模式**：`mentionPatterns` 中的安全正则模式
    - 请参阅 [完整参考](/gateway/config-channels#group-chat-mention-gating) 了解各渠道覆盖和自聊模式。

  </Accordion>

  <Accordion title="限制每个代理的技能">
    使用 `agents.defaults.skills` 作为共享基线，然后使用 `agents.list[].skills` 覆盖特定代理：

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

    - 默认情况下省略 `agents.defaults.skills` 可获得不受限制的技能。
    - 省略 `agents.list[].skills` 可继承默认值。
    - 将 `agents.list[].skills` 设为 `[]` 表示无技能。
    - 请参阅 [Skills](/tools/skills)、[Skills config](/tools/skills-config) 以及
      [Configuration Reference](/gateway/config-agents#agents-defaults-skills)。

  </Accordion>

  <Accordion title="调整网关渠道健康监控">
    控制网关重启看似停滞的渠道的积极程度：

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

    - 设置 `gateway.channelHealthCheckMinutes: 0` 以全局禁用健康监控自动重启。
    - `channelStaleEventThresholdMinutes` 应大于或等于检查间隔。
    - 通过 `channels.<provider>.healthMonitor.enabled` 或 `channels.<provider>.accounts.<id>.healthMonitor.enabled`，可为单个渠道或账号禁用自动重启，而不影响全局监控。
    - 详见 [健康检查](/gateway/health) 以进行运行调试，及 [完整参考](/gateway/configuration-reference#gateway) 了解所有字段。

  </Accordion>

  <Accordion title="配置会话和重置">
    会话控制对话连续性和隔离：

    ```json5
    {
      session: {
        dmScope: "per-channel-peer",  // 推荐多用户使用
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
    - `threadBindings`: 线程绑定会话路由的全局默认值（Discord 支持 `/focus`、`/unfocus`、`/agents`、`/session idle` 和 `/session max-age`）。
    - 请参阅 [Session Management](/concepts/session) 了解作用域、身份链接和发送策略。
    - 请参阅 [完整参考](/gateway/config-agents#session) 了解所有字段。

  </Accordion>

  <Accordion title="启用沙箱环境">
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

    请先构建镜像：`scripts/sandbox-setup.sh`

    请参阅 [Sandboxing](/gateway/sandboxing) 获取完整指南，以及 [完整参考](/gateway/config-agents#agentsdefaultssandbox) 了解所有选项。

  </Accordion>

  <Accordion title="启用官方 iOS 构建的 Relay 支持推送">
    Relay 支持推送配置于 `openclaw.json` 中。

    在网关配置中设置：

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

    CLI 等效命令：

    ```bash
    openclaw config set gateway.push.apns.relay.baseUrl https://relay.example.com
    ```

    作用：

    - 允许网关通过外部 relay 发送 `push.test`、唤醒提示和重新连接唤醒。
    - 使用配对 iOS 应用转发的基于注册范围的发送授权。网关无需部署范围的 relay 令牌。
    - 将每个 relay 支持的注册绑定到 iOS 应用配对的网关身份，防止其他网关重复使用已存注册。
    - 保持本地/手动 iOS 版本使用直接 APNs。relay 支持的发送仅应用于通过 relay 注册的官方发布版本。
    - 必须匹配官方/TestFlight iOS 构建内置的 relay 基础 URL，确保注册和发送流量到达同一 relay 部署。

    端到端流程：

    1. 安装使用相同 relay 基础 URL 编译的官方/TestFlight iOS 版本。
    2. 在网关配置 `gateway.push.apns.relay.baseUrl`。
    3. 配对 iOS 应用与网关，允许节点和操作者会话连接。
    4. iOS 应用获取网关身份，使用 App Attest 和应用收据注册 relay，然后将 relay 支持的 `push.apns.register` 有效负载发布给配对的网关。
    5. 网关存储 relay 句柄和发送授权，用于 `push.test`、唤醒提示和重新连接唤醒。

    操作注意事项：

    - 若将 iOS 应用切换到不同网关，需重新连接应用以发布绑定新网关的 relay 注册。
    - 若发布指向不同 relay 部署的新 iOS 版本，应用会刷新缓存的 relay 注册而非复用旧 relay 来源。

    兼容性说明：

    - `OPENCLAW_APNS_RELAY_BASE_URL` 和 `OPENCLAW_APNS_RELAY_TIMEOUT_MS` 仍作为临时环境变量覆盖有效。
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` 仍为本地回环开发逃生通道，配置中不要持久保存 HTTP relay URL。

    详见 [iOS 应用](/platforms/ios#relay-backed-push-for-official-builds) 了解端到端流程，及 [身份验证和信任流程](/platforms/ios#authentication-and-trust-flow) 了解 relay 安全模型。

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

    - `every`: 时长字符串（`30m`, `2h`）。设为 `0m` 禁用。
    - `target`: `last` | `none` | `<channel-id>`（例如 `discord`, `matrix`, `telegram`, 或 `whatsapp`）
    - `directPolicy`: `allow`（默认）或 `block`，用于 DM 风格的心跳目标
    - 请参阅 [心跳](/gateway/heartbeat) 获取完整指南。

  </Accordion>

  <Accordion title="配置定时任务">
    ```json5
    {
      cron: {
        enabled: true,
        maxConcurrentRuns: 2, // cron dispatch + isolated cron agent-turn execution
        sessionRetention: "24h",
        runLog: {
          maxBytes: "2mb",
          keepLines: 2000,
        },
      },
    }
    ```

    - `sessionRetention`：清理完成的隔离运行会话，默认 24 小时，设为 `false` 禁用。
    - `runLog`：限制 `cron/runs/<jobId>.jsonl` 文件大小及保留行数。
    - 详见 [定时任务](/automation/cron-jobs) 获取功能概览和 CLI 示例。

  </Accordion>

  <Accordion title="设置 Webhook（钩子）">
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

    安全注意：
    - 将所有 hook/webhook 负载内容视为不可信输入。
    - 使用专用的 `hooks.token`；不要复用共享的 Gateway 令牌。
    - Hook 认证仅限头部（`Authorization: Bearer ...` 或 `x-openclaw-token`）；查询字符串令牌将被拒绝。
    - `hooks.path` 不能为 `/`；将 webhook 入口保持在专用子路径上，例如 `/hooks`。
    - 保持不安全内容绕过标志禁用（`hooks.gmail.allowUnsafeExternalContent`, `hooks.mappings[].allowUnsafeExternalContent`），除非进行严格范围的调试。
    - 如果启用 `hooks.allowRequestSessionKey`，同时设置 `hooks.allowedSessionKeyPrefixes` 以限制调用者选择的会话密钥。
    - 对于 hook 驱动的代理，首选强大的现代模型层级和严格的工具策略（例如仅限消息传递加上可能的沙箱环境）。

    详见 [完整参考](/gateway/configuration-reference#hooks) 获取所有映射选项及 Gmail 集成。

  </Accordion>

  <Accordion title="配置多代理路由">
    运行多个隔离代理，使用独立的工作区和会话：

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

    请参阅 [Multi-Agent](/concepts/multi-agent) 和 [完整参考](/gateway/config-agents#multi-agent-routing) 了解绑定规则和每个代理的访问配置文件。

  </Accordion>

  <Accordion title="拆分配置文件（$include）">
    使用 `$include` 组织大型配置：

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

    - **单文件**：替换所包含的对象
    - **文件数组**：按顺序深度合并（后者优先）
    - **同级键**：在 includes 之后合并（覆盖包含的值）
    - **嵌套 includes**：支持最多 10 层深度
    - **相对路径**：相对于包含文件解析
    - **OpenClaw 所拥有的写入**：当一次写入仅更改由单文件 include 支持的一个顶级节时，
      例如 `plugins: { $include: "./plugins.json5" }`，
      OpenClaw 会更新那个被包含的文件，并保持 `openclaw.json` 不变
    - **不支持的写透**：根级 includes、include 数组，以及带同级覆盖的 includes
      在 OpenClaw 所拥有的写入中会失败关闭，而不是展平配置
    - **错误处理**：对缺失文件、解析错误和循环 includes 给出清晰错误

  </Accordion>
</AccordionGroup>

## 配置热重载

Gateway 会监视 `~/.openclaw/openclaw.json` 并自动应用更改 — 大多数设置无需手动重启。

直接文件编辑在验证通过前都视为不可信。监视器会等待编辑器临时写入/重命名的抖动稳定下来，读取最终文件，并通过恢复最后已知良好配置来拒绝无效的外部编辑。OpenClaw 写入的配置在写入前也会经过同一 schema 审核；诸如丢弃 `gateway.mode` 或将文件大小缩减超过一半之类的破坏性覆盖会被拒绝并保存为 `.rejected.*` 供检查。

如果你在日志中看到 `Config auto-restored from last-known-good` 或 `config reload restored last-known-good config`，请检查 `openclaw.json` 旁边匹配的 `.clobbered.*` 文件，修复被拒绝的负载，然后运行 `openclaw config validate`。请参阅 [Gateway 故障排查](/gateway/troubleshooting#gateway-restored-last-known-good-config) 获取恢复清单。

### 重载模式

| 模式                   | 行为                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------- |
| **`hybrid`**（默认）    | 安全更改即时热应用。关键信息变更自动重启。                                             |
| **`hot`**              | 仅热应用安全更改。需要重启时记录警告，由你负责重启。                                     |
| **`restart`**          | 任何配置变更（安全或非安全）均重启 Gateway。                                           |
| **`off`**              | 关闭文件监视。变更仅在下次手动重启时生效。                                             |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### 哪些更改热应用，哪些需要重启

大部分字段可热应用且无停机。`hybrid` 模式会自动处理需要重启的更改。

| Category            | Fields                                                            | Restart needed? |
| ------------------- | ----------------------------------------------------------------- | --------------- |
| Channels            | `channels.*`, `web` (WhatsApp) — 所有内置和插件渠道               | 否              |
| Agent & models      | `agent`, `agents`, `models`, `routing`                            | 否              |
| Automation          | `hooks`, `cron`, `agent.heartbeat`                                | 否              |
| Sessions & messages | `session`, `messages`                                             | 否              |
| Tools & media       | `tools`, `browser`, `skills`, `audio`, `talk`                     | 否              |
| UI & misc           | `ui`, `logging`, `identity`, `bindings`                           | 否              |
| Gateway server      | `gateway.*`（端口、绑定、认证、tailscale、TLS、HTTP）            | **是**         |
| Infrastructure      | `discovery`, `canvasHost`, `plugins`                              | **是**         |

<Note>
`gateway.reload` 和 `gateway.remote` 是例外——更改它们**不会**触发重启。
</Note>

### 重载规划

当你编辑一个通过 `$include` 引用的源文件时，OpenClaw 会按照源文件所编写的布局来规划重载，而不是按内存中的扁平化视图来规划。这样即使某个顶级节位于其自己的包含文件中，例如 `plugins: { $include: "./plugins.json5" }`，热重载决策（热应用 vs 重启）也能保持可预测。如果源布局存在歧义，重载规划会失败关闭。

## 配置 RPC（程序化更新）

对于通过网关 API 写入配置的工具，建议采用以下流程：

- `config.schema.lookup` 用于检查一个子树（浅层 schema 节点 + 子项摘要）
- `config.get` 用于获取当前快照以及 `hash`
- `config.patch` 用于部分更新（JSON merge patch：对象合并，`null`
  删除，数组替换）
- `config.apply` 仅在你打算替换整个配置时使用
- `update.run` 用于显式自更新并重启
- `update.status` 用于检查最新的更新重启哨兵，并在重启后验证正在运行的版本

Agents 应将 `config.schema.lookup` 作为获取精确字段级文档和约束的第一站。需要更广泛的配置映射、默认值或指向专用子系统参考的链接时，请使用 [Configuration reference](/gateway/configuration-reference)。

<Note>
控制平面写入（`config.apply`、`config.patch`、`update.run`）按 `deviceId+clientIp` 限流为每 60 秒 3 次请求。重启请求会合并，并在每次重启周期之间强制执行 30 秒冷却时间。
`update.status` 仅可读，但需要 admin 权限，因为重启哨兵可能包含更新步骤摘要和命令输出尾部。
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
`note` 和 `restartDelayMs`。当配置已存在时，这两种方法都需要
`baseHash`。

## 环境变量

OpenClaw 会读取父进程的环境变量，以及：

- 当前工作目录下的 `.env`（如果存在）
- `~/.openclaw/.env`（全局备用）

两者都不会覆盖已有的环境变量。你还可以在配置中设置内联环境变量：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

<Accordion title="Shell 环境导入（可选）">
  如果启用且缺少预期的键，OpenClaw 会运行登录 shell，仅导入缺少的键：

```json5
{
  env: {
    shellEnv: { enabled: true, timeoutMs: 15000 },
  },
}
```

等价环境变量：`OPENCLAW_LOAD_SHELL_ENV=1`
</Accordion>

<Accordion title="配置值中的环境变量替换">
  在任何配置字符串中，可以用 `${VAR_NAME}` 引用环境变量：

```json5
{
  gateway: { auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" } },
  models: { providers: { custom: { apiKey: "${CUSTOM_API_KEY}" } } },
}
```

规则：

- 仅匹配大写名称：`[A-Z_][A-Z0-9_]*`
- 缺失或空值在加载时抛错
- 用 `$${VAR}` 转义输出字面量
- 可用于 `$include` 文件中
- 内联替换例子：`"${BASE}/v1"` → `"https://api.example.com/v1"`

</Accordion>

<Accordion title="Secret 引用（env、file、exec）">
  对支持 SecretRef 对象的字段，可以使用：

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

SecretRef 详情（包括 `secrets.providers` 的 `env`/`file`/`exec`）见 [秘密管理](/gateway/secrets)。支持的凭据路径列于 [SecretRef 凭据接口](/reference/secretref-credential-surface)。
</Accordion>

详见 [环境](/help/environment) 了解完整优先级和来源。

## 完整参考

字段逐项完整参考，请参阅 **[配置参考](/gateway/configuration-reference)**。

---

_相关：[配置示例](/gateway/configuration-examples) · [配置参考](/gateway/configuration-reference) · [诊断](/gateway/doctor)_

## 相关内容

- [配置参考](/gateway/configuration-reference)
- [配置示例](/gateway/configuration-examples)
- [网关运行手册](/gateway)
