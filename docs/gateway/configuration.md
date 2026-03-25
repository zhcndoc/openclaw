---
summary: "配置概览：常见任务、快速设置及完整参考链接"
read_when:
  - 第一次设置 OpenClaw
  - 寻找常见配置模式
  - 导航到特定配置部分
title: "配置"
---

# 配置

OpenClaw 会从 `~/.openclaw/openclaw.json` 读取一个可选的 <Tooltip tip="JSON5 支持注释和尾随逗号">**JSON5**</Tooltip> 配置文件。

如果文件不存在，OpenClaw 将使用安全默认值。添加配置的常见原因包括：

- 连接渠道并控制谁可以给机器人发消息
- 设置模型、工具、沙箱环境或自动化（定时任务、钩子）
- 调整会话、媒体、网络或 UI

请参阅所有可用字段的[完整参考](/gateway/configuration-reference)。

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
  <Tab title="控制面板 UI">
    打开 [http://127.0.0.1:18789](http://127.0.0.1:18789) 并使用 **配置** 标签页。
    控制面板 UI 根据配置 schema 渲染表单，并提供一个 **原始 JSON** 编辑器作为应急方案。
  </Tab>
  <Tab title="直接编辑">
    直接编辑 `~/.openclaw/openclaw.json` 文件。Gateway 会监视该文件并自动应用更改（参见 [热重载](#config-hot-reload)）。
  </Tab>
</Tabs>

## 严格校验

<Warning>
OpenClaw 仅接受完全符合 schema 的配置。未知键、类型错误或无效值都会导致 Gateway **拒绝启动**。唯一的根级例外是 `$schema`（字符串），允许编辑器附加 JSON Schema 元数据。
</Warning>

校验失败时：

- Gateway 不启动
- 仅诊断命令可用（`openclaw doctor`、`openclaw logs`、`openclaw health`、`openclaw status`）
- 运行 `openclaw doctor` 查看具体问题
- 运行 `openclaw doctor --fix`（或 `--yes`）自动修复

## 常见任务

<AccordionGroup>
  <Accordion title="设置渠道（WhatsApp、Telegram、Discord 等）">
    每个渠道都有自己的配置节，位于 `channels.<provider>` 下。请参见对应渠道页面的设置步骤：

    - [WhatsApp](/channels/whatsapp) — `channels.whatsapp`
    - [Telegram](/channels/telegram) — `channels.telegram`
    - [Discord](/channels/discord) — `channels.discord`
    - [Slack](/channels/slack) — `channels.slack`
    - [Signal](/channels/signal) — `channels.signal`
    - [iMessage](/channels/imessage) — `channels.imessage`
    - [Google Chat](/channels/googlechat) — `channels.googlechat`
    - [Mattermost](/channels/mattermost) — `channels.mattermost`
    - [Microsoft Teams](/channels/msteams) — `channels.msteams`

    所有渠道共享相同的私信（DM）策略模式：

    ```json5
    {
      channels: {
        telegram: {
          enabled: true,
          botToken: "123:abc",
          dmPolicy: "pairing",   // pairing | allowlist | open | disabled
          allowFrom: ["tg:123"], // 仅适用于 allowlist/open
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
            fallbacks: ["openai/gpt-5.2"],
          },
          models: {
            "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
            "openai/gpt-5.2": { alias: "GPT" },
          },
        },
      },
    }
    ```

    - `agents.defaults.models` 定义模型目录并作为 `/model` 的白名单。
    - 模型引用格式为 `provider/model`（如 `anthropic/claude-opus-4-6`）。
    - `agents.defaults.imageMaxDimensionPx` 控制转录/工具图像的缩放（默认 `1200`）；较低的数值通常在截图密集的运行中减少视觉令牌使用量。
    - 参见 [模型命令行](/concepts/models) 以在聊天中切换模型，以及 [模型故障转移](/concepts/model-failover) 了解身份验证轮换和备用行为。
    - 自定义/自托管提供者请参阅参考中的[自定义提供者](/gateway/configuration-reference#custom-providers-and-base-urls)。

  </Accordion>

  <Accordion title="控制谁可以给机器人发消息">
    私信访问通过渠道的 `dmPolicy` 控制：

    - `"pairing"`（默认）：未知发送者获得一次性配对码用于批准
    - `"allowlist"`：仅允许 `allowFrom` 中的发送者（或配对的允许存储）
    - `"open"`：允许所有入站私信（需设为 `allowFrom: ["*"]`）
    - `"disabled"`：忽略所有私信

    群组请使用 `groupPolicy` + `groupAllowFrom` 或渠道特定的允许列表。

    详情请参阅[完整参考](/gateway/configuration-reference#dm-and-group-access)。

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

    - **Metadata mentions**: 原生@提及（WhatsApp 点按提及、Telegram @bot 等）
    - **Text patterns**: `mentionPatterns` 中的安全正则表达式模式
    - 详见 [完整参考](/gateway/configuration-reference#group-chat-mention-gating) 了解每渠道的覆盖以及自聊天模式。

  </Accordion>

  <Accordion title="调整网关渠道健康监控">
    控制网关对长时间无响应渠道的重启频率：

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

    - `dmScope`：`main`（共享）| `per-peer` | `per-channel-peer` | `per-account-channel-peer`
    - `threadBindings`：线程绑定的全局默认，会话路由（Discord 支持 `/focus`、`/unfocus`、`/agents`、`/session idle` 和 `/session max-age`）。
    - 详见 [会话管理](/concepts/session) 了解作用域、身份链接和发送策略。
    - 详见[完整参考](/gateway/configuration-reference#session)获取所有字段。

  </Accordion>

  <Accordion title="启用沙箱环境">
    在隔离的 Docker 容器中运行代理会话：

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

    See [Sandboxing](/gateway/sandboxing) for the full guide and [full reference](/gateway/configuration-reference#agentsdefaultssandbox) for all options.

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

    - `every`：时间间隔字符串（如 `30m`、`2h`），设置 `0m` 禁用。
    - `target`：`last` | `whatsapp` | `telegram` | `discord` | `none`
    - `directPolicy`：DM 风格心跳目标的策略，默认为 `allow`，可设为 `block`
    - 详见[心跳指南](/gateway/heartbeat)

  </Accordion>

  <Accordion title="配置定时任务">
    ```json5
    {
      cron: {
        enabled: true,
        maxConcurrentRuns: 2,
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
    - 详见[定时任务](/automation/cron-jobs)获取功能概览和 CLI 示例。

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

    安全注意事项：
    - 所有钩子/Webhook 负载内容均视为不可信输入。
    - 除非进行严格范围的调试，否则保持不安全内容绕过标记（`hooks.gmail.allowUnsafeExternalContent`、`hooks.mappings[].allowUnsafeExternalContent`）关闭状态。
    - 钩子驱动的代理建议优先使用现代高级模型和严格的工具策略（例如仅限消息传递且尽可能使用沙箱）。

    详见[完整参考](/gateway/configuration-reference#hooks)获取所有映射选项及 Gmail 集成。

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

    详情参见[多代理](/concepts/multi-agent)及[完整参考](/gateway/configuration-reference#multi-agent-routing)的绑定规则和每代理访问配置。

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

    - **单文件**：替换包含对象
    - **文件数组**：顺序深度合并（后者覆盖前者）
    - **同级键**：合并在包含后，覆盖包含值
    - **嵌套包含**：支持最多 10 层深度
    - **相对路径**：相对于包含文件解析
    - **错误处理**：缺少文件、解析错误和循环包含均有清晰报错

  </Accordion>
</AccordionGroup>

## 配置热重载

Gateway 会监视 `~/.openclaw/openclaw.json` 并自动应用更改 — 大多数设置无需手动重启。

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

| 分类               | 字段                                                               | 需重启？     |
| ------------------ | ------------------------------------------------------------------ | ------------ |
| 渠道               | `channels.*`、`web`（WhatsApp）— 所有内置及扩展渠道                 | 否           |
| 代理与模型         | `agent`, `agents`, `models`, `routing`                            | 否           |
| 自动化             | `hooks`, `cron`, `agent.heartbeat`                                | 否           |
| 会话与消息         | `session`, `messages`                                              | 否           |
| 工具与媒体         | `tools`, `browser`, `skills`, `audio`, `talk`                     | 否           |
| UI 与杂项          | `ui`, `logging`, `identity`, `bindings`                           | 否           |
| Gateway 服务器     | `gateway.*`（端口、绑定、认证、tailscale、TLS、HTTP）               | **是**       |
| 基础架构           | `discovery`, `canvasHost`, `plugins`                              | **是**       |

<Note>
`gateway.reload` 和 `gateway.remote` 是例外——更改它们**不会**触发重启。
</Note>

## 配置 RPC（编程式更新）

<Note>
控制面写入 RPC（`config.apply`、`config.patch`、`update.run`）对每个 `deviceId+clientIp` 限制为**每 60 秒最多 3 次请求**。限制时，RPC 返回 `UNAVAILABLE` 并带 `retryAfterMs`。
</Note>

<AccordionGroup>
  <Accordion title="config.apply（完整替换）">
    验证并写入完整配置，同时重启 Gateway。

    <Warning>
    `config.apply` 会替换**整个配置**。部分更新请使用 `config.patch`，单键修改请用 `openclaw config set`。
    </Warning>

    参数：

    - `raw`（字符串）— 整个配置的 JSON5 内容
    - `baseHash`（可选）— 来自 `config.get` 的配置哈希（配置已存在时必须）
    - `sessionKey`（可选）— 重启后唤醒 ping 使用的会话密钥
    - `note`（可选）— 重启哨兵的注释
    - `restartDelayMs`（可选）— 重启前延迟，默认 2000 毫秒

    重启请求在已有挂起/执行中的重启时会合并，且重启周期间隔为 30 秒冷却期。

    ```bash
    openclaw gateway call config.get --params '{}'  # 获取 payload.hash
    openclaw gateway call config.apply --params '{
      "raw": "{ agents: { defaults: { workspace: \"~/.openclaw/workspace\" } } }",
      "baseHash": "<hash>",
      "sessionKey": "agent:main:whatsapp:direct:+15555550123"
    }'
    ```

  </Accordion>

  <Accordion title="config.patch（部分更新）">
    按 JSON 合并补丁语义，将部分更新合并到现有配置：

    - 对象递归合并
    - `null` 删除键
    - 数组替换

    参数：

    - `raw`（字符串）— 仅包含要更改的键的 JSON5
    - `baseHash`（必填）— 来自 `config.get` 的配置哈希
    - `sessionKey`、`note`、`restartDelayMs` — 同 `config.apply`

    重启行为与 `config.apply` 相同：合并挂起的重启请求并设 30 秒冷却。

    ```bash
    openclaw gateway call config.patch --params '{
      "raw": "{ channels: { telegram: { groups: { \"*\": { requireMention: false } } } } }",
      "baseHash": "<hash>"
    }'
    ```

  </Accordion>
</AccordionGroup>

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

SecretRef 详情（包括 `secrets.providers` 的 `env`/`file`/`exec`）见[秘密管理](/gateway/secrets)。支持的凭据路径列于[SecretRef 凭据接口](/reference/secretref-credential-surface)。
</Accordion>

详见[环境](/help/environment)了解完整优先级和来源。

## 完整参考

字段逐项完整参考，请参阅 **[配置参考](/gateway/configuration-reference)**。

---

_相关内容：[配置示例](/gateway/configuration-examples) · [配置参考](/gateway/configuration-reference) · [诊断](/gateway/doctor)_
