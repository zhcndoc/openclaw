---
summary: "通过官方 Codex app-server harness 运行 OpenClaw 嵌入式代理轮次"
title: "Codex harness"
read_when:
  - 你想使用官方 Codex app-server harness
  - 你需要 Codex harness 配置示例
  - 你希望仅限 Codex 的部署在失败时不回退到 OpenClaw
---

官方的 `codex` 插件通过 Codex app-server 运行嵌入式 OpenAI 代理轮次，而不是使用内置的 OpenClaw harness。Codex 负责底层代理会话：原生线程恢复、原生工具续接、原生压缩以及 app-server 执行。OpenClaw 仍然负责聊天频道、会话文件、模型选择、OpenClaw 动态工具、审批、媒体传递以及可见的转录镜像。

远程 Codex app-server 可以运行在与 Gateway 不同的机器上。设置
`remoteWorkspaceRoot` 以验证远程工作区附件路径。OpenClaw 使用现有的 app-server 连接，通过固定的无 shell `command/exec` 读取器传输权威附件字节。该读取器会拒绝符号链接，在分配内存之前强制执行文件和响应大小限制，并在发送到频道之前暂存由 Gateway 管理的不可变媒体，而不要求文件系统共享或同步。Codex 图像直接根据类型化的 app-server 事件生成；仅保存路径的图像使用相同的有界远程读取器。上传始终使用 Gateway 配置的频道身份和请求超时时间。

使用规范的 OpenAI 模型引用，例如 `openai/gpt-5.6-sol`。不要配置旧版 Codex GPT 引用；将 OpenAI 代理认证顺序放在 `auth.order.openai` 下。旧版 Codex 认证配置文件 ID 和旧版 Codex 认证顺序条目可通过 `openclaw doctor --fix` 修复。

当提供商/模型运行时策略未设置或设为 `auto` 时，仅有 `openai/*` 前缀绝不会选择此 harness。只有在不存在已编写的提供商请求覆盖项时，OpenAI 才可能隐式选择 Codex；并且必须是精确匹配的官方 HTTPS Platform Responses 或 ChatGPT Responses 路由。有效的模型级 `params.fastMode` /
`params.fast_mode` 值和有效的 cutoff 键属于类型化的代理运行时控制项，因此不算作已编写的提供商请求参数，也不会自行选择运行时。请参阅
[OpenAI 隐式代理运行时](/providers/openai#implicit-agent-runtime)。
如果在 Platform 与 ChatGPT 路由尚未确定之前由 Codex 持有认证，OpenClaw 仍要求每个候选路由声明与 Codex 兼容。仅凭原生认证归属绝不会绕过该路由检查。

当没有 OpenClaw 沙箱处于活动状态时，OpenClaw 会在启用 Codex 原生代码模式的情况下启动 Codex app-server 线程（code-mode-only 默认保持关闭），因此原生工作区/代码能力仍可与通过 app-server `item/tool/call` 桥接路由的 OpenClaw 动态工具一起使用。活动中的 OpenClaw 沙箱或受限工具策略会完全禁用原生代码模式，除非你启用实验性的 sandbox exec-server 路径。

在默认的 `tools.exec.host: "auto"` 且没有活动的 OpenClaw 沙箱时，Codex 还会接收 `node_exec` 和 `node_process` 工具，用于在已配对节点上执行命令。原生 shell 仍位于 Codex app-server 的主机和工作区上（对于默认的 stdio 部署，即 Gateway 本地）；`node_exec` 按名称或 ID 选择节点，并继续遵循 OpenClaw 的节点审批策略。如果有限的运行时允许列表禁用了原生代码模式，导致该轮次没有执行环境，OpenClaw 会继续提供经过策略筛选的 `exec` 和 `process` 工具，以便直接进行无沙箱执行。

此 Codex 原生功能与
[OpenClaw Code Mode](/tools/code-mode) 不同；后者是一个可选启用的 QuickJS-WASI 运行时，用于通用的 OpenClaw 运行，并采用不同的
`exec` 输入形状。关于更广泛的模型/提供商/运行时划分，请从
[代理运行时](/concepts/agent-runtimes) 开始了解：`openai/gpt-5.6-sol` 是模型引用，`codex` 是运行时，而 Telegram、Discord、Slack 或其他频道则是通信界面。

## 需求

- 已安装官方 `@openclaw/codex` 插件。如果配置使用允许列表，请在
  `plugins.allow` 中包含 `codex`。
- Codex app-server `0.147.0`。插件默认随附并管理 `@openai/codex`
  `0.147.0`，因此 `PATH` 中的 `codex` 命令不会影响正常启动。显式指定的自定义、远程以及由 macOS 桌面端管理的 app-server 必须报告完全相同的稳定版
  `0.147.0` 版本。
- 当设置了 `remoteWorkspaceRoot` 且必须传输跨机器工作区附件时，远程 Codex app-server 主机上需要安装 Node.js。
- 通过 `openclaw models auth login --provider openai` 完成 Codex 认证、代理的 Codex 主目录中已存在 app-server 账户，或使用显式的 Codex API 密钥认证配置文件。

有关认证优先级、环境隔离、自定义 app-server 命令、模型发现以及完整的配置字段列表，请参阅
[Codex 运行时参考](/plugins/codex-harness-reference)。

## 快速开始

安装官方插件，然后使用 Codex OAuth 登录：

```bash
openclaw plugins install @openclaw/codex
openclaw models auth login --provider openai
```

启用 `codex` 插件并选择一个 OpenAI agent 模型：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.6-sol",
    },
  },
}
```

如果你的配置使用 `plugins.allow`，也请在其中添加 `codex`：

```json5
{
  plugins: {
    allow: ["codex"],
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

修改插件配置后，请重启网关。如果某个聊天已经有一个
会话，请先运行 `/new` 或 `/reset`，这样下一轮就会根据当前配置解析运行框架。

## 与 Codex Desktop 和 CLI 共享线程

默认的 `appServer.homeScope: "agent"` 会将每个 OpenClaw 代理与操作员的原生 Codex 状态隔离开来。若想让所有者能够检查并管理与 Codex Desktop 和 Codex CLI 显示的相同原生线程，请启用用户 Codex 主目录：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            homeScope: "user",
          },
        },
      },
    },
  },
}
```

用户主目录模式支持本地受管的 stdio 进程或共享的 Unix 套接字传输。启用
`$CODEX_HOME` 时使用该目录，否则使用 `~/.codex`，其中包括该主目录中的
原生 Codex 身份验证、配置、插件和线程存储。即使代理的模型路由中存储了
OpenAI 配置文件，OpenClaw 也不会向此应用服务器注入 OpenClaw 身份验证配置。
相反，系统会对照路由验证原生账户，反之亦然：

- 订阅路由要求原生主目录已登录 ChatGPT。如果某个回合报告缺少订阅凭据，请在该主目录中运行
  `codex login`。
- Platform（API 密钥）路由会拒绝使用 ChatGPT 订阅登录的原生主目录，因此按 API
  计费的路由绝不会在无提示的情况下消耗订阅方案。请使用
  `codex login --with-api-key` 登录该主目录，或切换到 `homeScope: "agent"`，
  让 OpenClaw 注入其已持有的密钥。

存储的 OpenAI 配置文件可以与 `homeScope: "user"` 共存；OpenClaw 会为代理范围的连接保留
该配置文件，但不会将其交给原生主目录。使用
`openclaw models auth list --provider openai` 检查存储的配置文件，并使用
`openclaw models auth logout <profileId> --yes` 移除不再需要的配置文件。

所有者回合将获得 `codex_threads` 工具：可用于列出、搜索、读取、分叉、重命名、归档和恢复原生线程。将线程分叉后可在 OpenClaw 中继续它；分叉后的线程会附加到当前 OpenClaw 会话，并继续对其他原生 Codex 客户端可见。归档需要明确确认该线程已在其他地方关闭。启用监督时，转录字段和修改还需要匹配的 `supervision.allowRawTranscripts` 或 `supervision.allowWriteControls` 显式启用。

不要通过彼此独立受管的 stdio App Server 并发恢复或写入同一个线程。Codex 只会在同一个 App Server 内协调活动写入者，而不会跨独立进程协调。对于普通的用户主目录 stdio 会话，分叉是安全的共存方式。

`appServer.homeScope: "user"` 本身并不会控制 fleet 目录。插件处于活动状态时，会启用原生会话发现；将 `sessionCatalog.enabled: false` 以在不禁用 Codex 的情况下将其从 OpenClaw 侧边栏移除。目录使用单独的监督连接；如果没有显式的 `appServer` 连接设置，该连接默认使用受管的用户主目录 stdio，而普通 harness 仍保持 agent 范围。显式的 `appServer` 设置会同时作用于两条路径。当普通 harness 也应共享原生状态时，如上所示显式设置 `homeScope: "user"`。

## 监督 Codex 会话

同一个 `codex` 插件可以列出来自 Gateway 计算机和已加入的配对节点的未归档 Codex 会话。已存储或空闲的 Gateway 本地会话可以创建一个受模型锁定的 Chat，它会镜像其有界的持久化用户与助手历史。其私有绑定使用监督连接来处理原生快照、规范分支以及后续轮次，而普通 Codex 会话仍然处于 agent 作用域内。第一次规范启动严格使用 Codex 为快照分支返回的模型和提供方。之后的恢复将选择权留给 Codex 的原生配置；外层的 OpenClaw 模型和回退链永远不会替代它。已存储和空闲的行在经过明确的“没有其他运行器”确认后可以归档。活跃来源不能创建分支或被归档；但现有的受监督 Chat 仍然可以打开。配对节点会话仍然仅限元数据。

有关设置、分支规则、配对节点限制、元数据暴露和故障排除，请参见 [监督 Codex 会话](/plugins/codex-supervision)。

## 配置

| 需求                                                | 设置                                                                                                       | 位置                              |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 启用 harness                                  | `plugins.entries.codex.enabled: true`                                                                     | OpenClaw 配置                    |
| 隐藏原生 Codex 会话发现                 | `plugins.entries.codex.config.sessionCatalog.enabled: false`                                              | Codex 插件配置                |
| 保留允许列表中的插件安装                  | 在 `plugins.allow` 中包含 `codex`                                                                        | OpenClaw 配置                    |
| 允许符合条件的 OpenAI 请求隐式使用 Codex | 官方 HTTPS Responses/ChatGPT 路由，未编写 provider 请求覆盖，运行时未设置或为 `auto` | OpenAI provider/model 配置       |
| 使用 ChatGPT/Codex OAuth 登录                    | `openclaw models auth login --provider openai`                                                            | CLI 身份验证配置                   |
| 为 Codex 运行添加 API 密钥备用方案                   | 在 `auth.order.openai` 中将 `openai:*` API 密钥配置列在订阅身份验证之后                          | CLI 身份验证配置 + OpenClaw 配置 |
| Codex 不可用时快速失败               | provider 或 model 的 `agentRuntime.id: "codex"`                                                              | OpenClaw model/provider 配置     |
| 使用直接的 OpenAI API 流量                       | provider 或 model 的 `agentRuntime.id: "openclaw"`，并使用常规 OpenAI 身份验证                                   | OpenClaw model/provider 配置     |
| 调整 app-server 行为                            | `plugins.entries.codex.config.appServer.*`                                                                | Codex 插件配置                |
| 启用原生 Codex 插件应用                     | `plugins.entries.codex.config.codexPlugins.*`                                                             | Codex 插件配置                |
| 启用 Codex Computer Use                           | `plugins.entries.codex.config.computerUse.*`                                                              | Codex 插件配置                |

优先使用 `auth.order.openai` 来实现“订阅优先／API key 备份”的排序。  
现有的旧版 Codex auth 配置文件 id 和旧版 Codex auth 顺序  
仅用于 doctor 的旧状态；不要写入新的旧版 Codex GPT 引用。

```json5
{
  auth: {
    order: {
      openai: ["openai:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

对于兼容 Codex 的有效路由，上述两个配置文件仍然都是同一次 Codex 运行的候选项。配置文件顺序决定使用哪些凭据，而不是运行时。更改身份验证顺序不会使自定义路由、Completions 路由、HTTP 路由或被请求覆盖的路由兼容 Codex。有效的模型级 Fast-mode 和 cutoff 控制属于运行时控制，而不是请求覆盖。

### 压缩

不要在由 Codex 支持的 agent 上设置 `compaction.model` 或 `compaction.provider`。Codex 通过其原生 app-server thread 状态进行压缩，因此 OpenClaw 在运行时会忽略这些本地 summarizer 覆盖项，并且当 agent 使用 Codex 时，`openclaw doctor --fix` 会将它们移除。

Lossless 仍然可以作为一个 context engine 用于 Codex turn 周围的组装、摄取和维护，通过  
`plugins.slots.contextEngine: "lossless-claw"` 和  
`plugins.entries.lossless-claw.config.summaryModel` 进行配置，而不是通过 `agents.defaults.compaction.provider`。当 Codex 是活动运行时，`openclaw doctor --fix` 会将旧的  
`compaction.provider: "lossless-claw"` 形式迁移到 Lossless  
context-engine 插槽，但原生 Codex 仍然负责压缩。原生 app-server harness 支持需要预提示组装的 context engine；  
通用 CLI 后端，包括 `codex-cli`，不提供这种宿主能力。

对于由 Codex 支持的 agent，`/compact` 会在绑定的 thread 上启动原生 Codex app-server  
压缩，并等待其终止结果。共享的  
`agents.defaults.compaction.timeoutSeconds` 时间预算仍然适用；超时时，  
OpenClaw 会要求 Codex 中断原生 turn，并持续保留每个 thread 的栅栏，  
直到确认终止。它绝不会回退到 context engine 或  
公共 OpenAI summarizer。如果原生 Codex thread 绑定缺失或已过期，  
该命令会安全失败，而不是静默切换压缩后端。

### 直接 API 长上下文

Codex 订阅与直接 OpenAI API 流量属于独立的合约。实时 ChatGPT/Codex 目录通常会公开一个 `272000` token 的模型窗口，而 OpenAI 文档显示，Platform API 为 GPT-5.5 和 GPT-5.6 提供 `1050000` token 的窗口以及 `128000` 的最大输出。两种运行时转换都使用相同的安全算术：

```text
1050000 总量 - 128000 最大输出 = 922000 安全活动输入
自动压缩阈值 = 700000 活动 token
```

原生 Codex 转换不是一组 Responses 参数。Codex 负责原生线程的上下文和压缩，因此不要向 Codex 支持的模型添加 `responsesServerCompaction` 或 `responsesCompactThreshold`。

从与已安装 Codex 版本兼容的完整 Codex 模型目录开始。对于确切的 `gpt-5.6-sol` 条目，保留描述符的其余部分，并设置：

```json
{
  "context_window": 922000,
  "max_context_window": 922000,
  "auto_compact_token_limit": 700000
}
```

Codex 会对 `922000` 的目录值应用正常的 95% 有效窗口预留，因此会准确报告 `875900` 个可用 token。在 `700000` 处进行压缩时，在该有效保护阈值之前还剩 `175900` 个 token，在提供商安全输入额度之前还剩 `222000` 个 token。这个更大的余量是有意设计的：Codex 会在添加下一条用户消息和上下文更新之前检查已经记录的上下文，因此阈值必须同时覆盖一轮大型传入消息，以及工具、指令、序列化和压缩轮次本身。

对于独立使用 Codex CLI 或 Desktop 的场景，基于命令身份验证的自定义提供商可以从系统钥匙串或密钥管理器中读取 API key，同时保留正常的 ChatGPT 登录以供连接器使用：

```toml
model = "gpt-5.6-sol"
model_provider = "openai_api_direct"
model_context_window = 922000
model_auto_compact_token_limit = 700000
model_auto_compact_token_limit_scope = "total"
model_catalog_json = "/absolute/path/to/models-api-1m.json"

[model_providers.openai_api_direct]
name = "OpenAI API direct"
base_url = "https://api.openai.com/v1"
wire_api = "responses"
requires_openai_auth = false

[model_providers.openai_api_direct.auth]
command = "/absolute/path/to/read-openai-inference-key"
timeout_ms = 5000
refresh_interval_ms = 300000
```

身份验证辅助程序必须仅将 key 输出到 stdout。不要将其放入 TOML。

对于 OpenClaw Codex app-server harness，保留默认的按代理作用域划分的 Codex 主目录，并让 OpenClaw 注入一个 `openai` API-key 配置档案。通过正常的 OpenAI API-key 身份验证流程创建该配置档案，将其实际 id 放在 `auth.order.openai` 的首位，并将目录和上下文限制作为原生 Codex app-server 参数传入：

```json5
{
  auth: {
    order: {
      openai: ["openai:api-key"],
    },
  },
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            args: [
              "app-server",
              "--listen",
              "stdio://",
              "-c",
              'model_catalog_json="/absolute/path/to/models-api-1m.json"',
              "-c",
              "model_context_window=922000",
              "-c",
              "model_auto_compact_token_limit=700000",
              "-c",
              "model_auto_compact_token_limit_scope=total",
            ],
          },
        },
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "openai/gpt-5.6-sol" },
      models: {
        "openai/gpt-5.6-sol": {
          agentRuntime: { id: "codex" },
          params: { fastMode: true },
        },
      },
    },
  },
}
```

将 `openai:api-key` 替换为实际的 API-key 配置档案 id。按代理作用域划分的 app-server 只会接收该已准备好的 key；操作员原生的 `~/.codex` ChatGPT 登录、插件、连接器和线程存储均保持不变。对于此路由，请使用上面的按代理作用域注入的 API-key 路径，而不要依赖 `homeScope: "user"` 来提供预期的凭据。

模型目录、`model_context_window`、总范围自动压缩限制、准确的 `openai/gpt-5.6-sol` 路由以及 API-key 配置档案顺序共同构成一个配置单元。请将它们一起应用。只有当嵌入式和原生的长上下文选项具有可区分的模型引用或代理配置时，OpenClaw 才能同时保留它们；单个模型条目不能同时承载两种由运行时负责的压缩策略。

更改目录或 app-server 参数后，重启 Gateway 和原生 Codex app-server，然后开始新的聊天。在现有会话具有模型或运行时覆盖时，运行 `/model default -s`。现有原生线程会保留其记录的提供商和模型设置。使用 `/status` 和 `/codex status` 验证运行时，然后在开始长会话之前发送一轮无害的直接 API 请求。

一个由进程持有、相互隔离的 Gateway 和 app-server 运行验证了这一精确的 `openai/gpt-5.6-sol` API-key 配置。Codex 报告的有效窗口为 `875900`。活动上下文从 `197032` 增长到 `377386`、`561957` 和 `750745` token，期间没有手动压缩；下一轮小请求触发了自动压缩，活动 token 降至 `75980`，压缩后的最低快照为 `68375`。压缩耗时 `2810` 毫秒，并持久化记录了 1 次压缩。一个持久标记在压缩和重启后仍然存在，一次确定性的长响应产生了 `5442` 个输出 token，并且 OpenClaw 在每次调用时都向 Codex app-server 发送了 `priority` 层级。该请求证据无法证明每次调用由哪个上游层级处理。完整测试套件耗时 `401.37` 秒。这些耗时是观测结果，不是服务级别保证。

<Warning>
长上下文默认选择启用。一旦输入超过 `272000` 个 token，OpenAI 将按输入和缓存费率的 2 倍以及输出费率的 1.5 倍，对整个请求计费。快速模式的价格因模型而异；GPT-5.6 Sol API 快速模式（前称 Priority processing）目前是在标准模式之上的另一重 2 倍，因此此方案的短上下文标准模式输入侧价格为 4 倍，输出侧价格为 3 倍。OpenClaw 目前发送线上的值 `service_tier: "priority"`。ChatGPT/Codex 积分快速模式是独立的：GPT-5.6 和 GPT-5.5 目前消耗标准模式积分的 2.5 倍，而此 API-key Codex 路由使用 API token 计价。API 仍是访问权限、实际限制和计费的权威来源。请参阅 [OpenAI 模型限制](https://developers.openai.com/api/docs/models/compare)、[快速模式](https://openai.com/api-priority-processing/)、[API 定价](https://developers.openai.com/api/docs/pricing) 和 [Codex 速度](https://learn.chatgpt.com/docs/agent-configuration/speed)。
</Warning>

本页其余内容涵盖部署形态、失败即关闭路由、监护人批准策略、原生 Codex 插件以及 Computer Use。有关完整的选项  
列表、默认值、枚举、发现、环境隔离、超时，以及  
app-server 传输字段，请参阅  
[Codex harness 参考](/plugins/codex-harness-reference)。

## 验证 Codex 运行时

在你期望使用 Codex 的聊天中使用 `/status`。由 Codex 支持的 OpenAI
代理轮次会显示：

```text
Runtime: OpenAI Codex
```

然后检查 Codex app-server 状态：

```text
/codex status
/codex models
/codex binding
```

`/status` 报告解析后的 OpenClaw Fast 策略（`on`、`off` 或 `auto`）
以及所选运行时。它不会报告已完成请求实际采用或返回的上游服务层级。
`/codex binding` 报告已附加的原生线程和当前模型设置。`/codex status`
报告 app-server 连接状态、账户、速率限制、MCP 服务器和技能。
这两个 Codex 命令都不是提供商响应遥测。`/codex models` 列出适用于该
工具和账户的实时 Codex app-server 目录。如果 `/status` 的结果出乎意料，
请参阅[故障排除](#troubleshooting)。

## 路由和模型选择

将提供方引用和运行时策略分开：

- 对于规范的 OpenAI 模型选择，请使用 `openai/gpt-*`。此前缀本身绝不会选择 Codex。
- 当运行时未设置或设为 `auto` 时，只有完全匹配的官方 HTTPS Platform Responses 或 ChatGPT Responses 路由，且未编写提供方请求覆盖，才可以隐式选择 Codex。有效的模型级快速模式和截止时间控制不计为已编写的请求参数。
- 不要在配置中使用旧版 Codex GPT 引用；运行 `openclaw doctor --fix` 以修复旧版引用和过时的会话路由固定。
- `agentRuntime.id: "codex"` 会使 Codex 成为兼容路由的失败即关闭要求，但不会使不兼容的有效路由变得兼容。
- 当有意为提供方或模型启用嵌入式 OpenClaw 运行时时，使用 `agentRuntime.id: "openclaw"`。
- `/codex ...` 用于从聊天中控制原生 Codex 应用服务器对话。
- ACP/acpx 是独立的外部运行器路径。仅当用户要求使用 ACP/acpx 或外部运行器适配器时才使用它。

| 用户意图                                                | 使用                                                                                                   |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 附加当前聊天                                    | `/codex bind [thread-id] [--cwd <path>] [--model <model>] [--provider <provider>]`                    |
| 恢复现有 Codex 线程                            | `/codex resume <thread-id>`                                                                           |
| 列出或筛选 Codex 线程                               | `/codex threads [filter]`                                                                             |
| 读取或更新绑定线程的原生目标              | `/codex goal [status\|set <objective>\|pause\|resume\|block\|complete\|clear]`                        |
| 列出原生 Codex 插件                                  | `/codex plugins list`                                                                                 |
| 发现可用的原生 Codex 市场插件        | `/codex plugins available`                                                                            |
| 安装并授权一个原生 Codex 插件              | `/codex plugins install <plugin>@<marketplace>`                                                       |
| 启用或禁用已配置的原生 Codex 插件         | `/codex plugins enable <name>`、`/codex plugins disable <name>`                                       |
| 将已存储的 Codex CLI 会话作为配对节点轮次恢复    | `/codex sessions --host <node> [filter]`，然后运行 `/codex resume <session-id> --host <node> --bind here` |
| 查看各计算机上的未归档 Codex 会话          | 启用 Codex 监督并打开 **Codex Sessions**                                                  |
| 更改绑定线程的模型、快速模式或权限 | `/codex model <model>`、`/codex fast [on\|off\|status]`、`/codex permissions [default\|yolo\|status]` |
| 停止或引导活动轮次                              | `/codex stop`、`/codex steer <text>`                                                                  |
| 解除当前绑定                                 | `/codex detach`（别名 `/codex unbind`）                                                               |
| 仅发送 Codex 反馈                                   | `/codex diagnostics [note]`                                                                           |
| 启动 ACP/acpx 任务                                     | ACP/acpx 会话命令，而不是 `/codex`                                                               |

| 使用场景                                        | 配置                                                                                                            | 验证                                  | 备注                                                   |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------- |
| 具备原生 Codex 运行时的合格 OpenAI 路由 | 完全匹配的官方 HTTPS Responses/ChatGPT 路由，未编写提供方请求覆盖，并启用 `codex` 插件 | `/status` 显示 `Runtime: OpenAI Codex` | 有效的快速运行时控制不会使此路径失效 |
| Codex 不可用时失败即关闭             | 提供方或模型使用 `agentRuntime.id: "codex"`                                                                         | 轮次失败，而不是回退到嵌入式运行时 | 用于仅限 Codex 的部署                          |
| 通过 OpenClaw 直接传输 OpenAI API 密钥流量  | 提供方或模型使用 `agentRuntime.id: "openclaw"`，并使用常规 OpenAI 身份验证                                               | `/status` 显示 OpenClaw 运行时        | 仅在有意使用 OpenClaw 时采用                   |
| 旧版配置                                   | 旧版 Codex GPT 引用                                                                                                | `openclaw doctor --fix` 会将其重写     | 不要以这种方式编写新配置                        |
| ACP/acpx Codex 适配器                          | ACP `sessions_spawn({ runtime: "acp" })`                                                                             | ACP 任务/会话状态                 | 与原生 Codex 运行器分开                      |

`agents.defaults.imageModel` 遵循相同的前缀拆分规则。正常的 OpenAI 路由请使用 `openai/gpt-*`
；只有当图像理解应通过受限的 Codex 应用服务器轮次运行时，才使用 `codex/gpt-*`。Doctor 会将旧版
Codex GPT 引用重写为 `openai/gpt-*`。

## 部署模式

### 基础 Codex 部署

为有效官方 HTTPS 路由符合隐式 Codex 选择条件的 OpenAI 模型使用快速启动配置：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.6-sol",
    },
  },
}
```

### 混合提供商部署

配置一个 Claude `main` agent，并添加一个命名的 Codex agent：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
  agents: {
    ownership: "explicit",
    defaults: {
      model: "anthropic/claude-opus-4-6",
    },
    entries: {
      main: {
        model: "anthropic/claude-opus-4-6",
      },
      codex: {
        name: "Codex",
        model: "openai/gpt-5.6-sol",
      },
    },
  },
}
```

此显式 fleet 没有默认 agent；通过会话、`--agent` 或绑定将目标设为 `main` 或 `codex`。`main` agent 使用其正常的提供方路径。只要其有效的 OpenAI 路由保持兼容，`codex` agent 就会使用 Codex app-server；当这应当成为失败即关闭要求时，添加显式的模型级 `agentRuntime.id: "codex"`。

### 故障关闭的 Codex 部署

捆绑的插件可用时，符合条件的精确官方 HTTPS OpenAI 路由可以解析为 Codex。为书面规定的故障关闭规则添加显式运行时策略：

```json5
{
  models: {
    providers: {
      openai: {
        agentRuntime: {
          id: "codex",
        },
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.6-sol",
    },
  },
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

强制使用 Codex 时，如果有效路由未声明为兼容 Codex、插件已禁用、app-server 版本过旧，或 app-server 启动失败，OpenClaw 将提前失败。

## App-server 策略

默认情况下，插件会在本地通过 stdio 传输启动由 OpenClaw 管理的 Codex
二进制文件。仅在有意运行其他可执行文件时设置 `appServer.command`。Codex 将 WebSocket 传输归类为实验性且不受支持；仅将其用于针对已在其他位置运行的 app-server 进行非生产测试：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            transport: "websocket",
            url: "ws://gateway-host:39175",
            authToken: "${CODEX_APP_SERVER_TOKEN}",
          },
        },
      },
    },
  },
}
```

WebSocket 传输会在网关启动时主动建立与 app-server 的连接，并将打开握手限制为 10 秒。空闲连接每 20 秒发送一次 WebSocket ping，并为匹配的 pong 等待 20 秒。健康的 app-server 消息或 pong 会重置未收到心跳的计数；连续五次未收到 pong 将关闭连接。临时故障会通过有界且带抖动的指数退避自动重连。身份验证失败和不受支持的 app-server 版本会停止重连，并报告需要操作员介入。Ping 和 pong 帧是传输层健康检查：它们不会启动 Codex 轮次，也不会调用模型。本地 stdio 和 Unix 传输不会执行这些远程连接检查。

本地 stdio app-server 会话默认采用受信任的本地操作员姿态：`approvalPolicy: "never"`、`approvalsReviewer: "user"` 和 `sandbox: "danger-full-access"`。如果本地 Codex 要求不允许这种隐式的 YOLO 姿态，OpenClaw 会改为选择允许的 guardian 权限。当会话启用了 OpenClaw sandbox 时，OpenClaw 会在该轮次中禁用 Codex 原生 Code Mode、用户 MCP 服务器和基于 app 的插件执行，而不是依赖 Codex 主机侧的 sandbox。相应地，当常规 exec/process 工具可用时，Shell 访问会通过由 OpenClaw sandbox 支持的动态工具（例如 `sandbox_exec` 和 `sandbox_process`）进行。

在启用 Codex 原生自动审查、sandbox 逃逸或额外权限之前，请使用规范化的 OpenClaw exec 模式：

```json5
{
  tools: {
    exec: {
      mode: "auto",
    },
  },
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

对于 Codex app-server 会话，`tools.exec.mode: "auto"` 会映射为经过 Codex Guardian 审核的批准：
在本地要求允许这些值时，通常是 `approvalPolicy: "on-request"`、
`approvalsReviewer: "auto_review"`，以及 `sandbox: "workspace-write"`。
在 `tools.exec.mode: "auto"` 下，OpenClaw 不会保留旧版不安全的 Codex
`approvalPolicy: "never"` 或 `sandbox: "danger-full-access"` 覆盖；如果有意采用无需批准的
Codex 姿态，请使用 `tools.exec.mode: "full"`。旧版
`plugins.entries.codex.config.appServer.mode: "guardian"` 预设仍然可用，
但 `tools.exec.mode: "auto"` 才是规范化的 OpenClaw 接口。

关于该模式与主机 exec 批准及 ACPX 权限的对比，请参见
[权限模式](/tools/permission-modes)。关于所有 app-server 字段、认证顺序、环境隔离和超时行为，
请参见 [Codex harness 参考](/plugins/codex-harness-reference)。

## 命令与诊断

`codex` 插件会在任何支持 OpenClaw 文本命令的频道中，将 `/codex` 注册为斜杠命令。

原生执行和控制需要所有者或 `operator.admin` 权限。网关客户端可以绑定或恢复线程、发送或停止轮次、更改模型、快速模式或权限状态、压缩或审查线程，以及解除绑定。其他已授权的发送者仍可使用只读的状态、帮助、账户、模型、线程、原生目标、MCP 服务器、技能和绑定检查命令。

常见形式：

- `/codex status` 检查应用服务器连接、模型、账户、速率限制、MCP 服务器和技能。
- `/codex models` 列出实时的 Codex 应用服务器模型。
- `/codex threads [filter]` 列出最近的 Codex 应用服务器线程。
- `/codex goal` 读取或更新已附加线程的原生 Codex 目标。Codex 的自动目标延续功能仍处于禁用状态；OpenClaw 尚未拥有自主后续轮次的能力。
- `/codex resume <thread-id>` 将当前 OpenClaw 会话附加到现有的 Codex 线程。
- `/codex bind [thread-id] [--cwd <path>] [--model <model>] [--provider <provider>]`
  附加当前聊天。
- `/codex detach`（或 `/codex unbind`）解除当前绑定。
- `/codex binding` 描述当前绑定。
- `/codex stop` 停止活动轮次；`/codex steer <text>` 引导该轮次。
- `/codex model <model>`、`/codex fast [on|off|status]` 和
  `/codex permissions [default|yolo|status]` 更改每次对话的状态。
- `/codex compact` 请求 Codex app-server 压缩已附加的线程。
- `/codex review` 为已附加的线程启动 Codex 原生审查。
- `/codex diagnostics [note]` 在发送已附加线程的 Codex 反馈前请求确认。
- `/codex account` 显示账户和速率限制状态。
- `/codex mcp` 列出 Codex app-server MCP 服务器状态。
- `/codex skills` 列出 Codex app-server 技能。
- `/codex plugins list` 显示已配置的原生插件；`/codex plugins
available` 在绑定的工作区中发现 Codex 市场插件。
- `/codex plugins install <plugin>@<marketplace>` 安装并授权一个已发现的
  插件。`/codex plugins enable <name>` 和 `/codex plugins
disable <name>` 更新其持久化策略。修改需要所有者或
  `operator.admin` 网关客户端。
- `/codex computer-use [status|install]` 管理 Codex Computer Use。
- `/codex help` 列出完整的命令树。

### 共享快速模式和 Codex 快速模式

`/fast` 控制共享的 OpenClaw 策略。仅包含指令的 `/fast off`
会在 OpenClaw 会话中持久化保存 `off`，并在受影响的 Codex
harness 回合中发送 `null`，以清除由 OpenClaw 所有的服务层级覆盖。`/fast default`
仅清除该会话层，因此较低优先级的共享默认值仍可能解析为
`on`、`off` 或 `auto`。

`/codex fast` 则会更改绑定的原生 Codex 对话偏好。`/codex fast off` 会为之后绑定到对话的原生回合保存
`flex`；它不是 `/fast off` 的同义词，也不会更改共享的 OpenClaw
会话策略。当共享快速模式运行控制到达 Codex harness
回合时，它会覆盖 `plugins.entries.codex.config.appServer.serviceTier` 以及适用于该回合的任何绑定偏好：快速模式开启时发送
`priority`，关闭时发送 `null`，而自动模式会针对每次模型调用进行决策。只有在未提供共享运行控制时，才会使用已配置或绑定的原生层级。

`/codex fast status` 和 `/codex binding` 报告的是原生偏好状态，而不是处理完毕的提供商请求所使用的上游层级。

对于大多数支持报告，请从发生错误的对话中使用 `/diagnostics [note]` 开始。它会创建一份 Gateway 诊断报告；对于 Codex harness 会话，还会请求批准以发送相关的 Codex 反馈包。有关隐私模型和群聊行为，请参阅
[诊断导出](/gateway/diagnostics)。仅当你明确希望在不包含完整 Gateway 诊断包的情况下，为当前附加的线程上传 Codex 反馈时，才使用
`/codex diagnostics [note]`。

### 在本地检查 Codex 线程

检查一次失败的 Codex 运行，最快的方法通常是直接打开原生
Codex 线程：

```bash
codex resume <thread-id>
```

可从已完成的 `/diagnostics` 回复、`/codex binding`，
或 `/codex threads [filter]` 中获取线程 ID。

有关上传机制和运行时级诊断边界，请参见
[Codex harness 运行时](/plugins/codex-harness-runtime#codex-feedback-upload)。

### 认证顺序

在默认的按 agent 划分的 home 中，认证按以下顺序选择：

1. 为该 agent 排序后的 OpenAI 认证配置文件，优先使用
   `auth.order.openai`。运行 `openclaw doctor --fix` 以迁移较旧的
   传统 Codex 认证配置文件 ID 和传统 Codex 认证顺序。
2. 该 agent 的 Codex home 中 app-server 现有的账户。
3. 仅对于本地 stdio app-server 启动，在没有 app-server 账户且仍然需要
   OpenAI 认证时，依次使用 `CODEX_API_KEY`，然后是
   `OPENAI_API_KEY`。

当 OpenClaw 看到 ChatGPT 订阅式的 Codex 认证配置文件时，它会从启动的
Codex 子进程中移除 `CODEX_API_KEY` 和 `OPENAI_API_KEY`。这样可以让
Gateway 级别的 API key 继续用于 embeddings 或直接使用 OpenAI 模型，
同时避免原生 Codex app-server 的轮次误通过 API 计费。显式的 Codex API key
配置文件以及本地 stdio 环境变量 key 回退会使用 app-server 登录，而不是继承
的子进程环境变量。WebSocket app-server 连接不会接收 Gateway 环境变量
API key 回退；请使用显式认证配置文件或远程 app-server 自身的账户。

如果订阅配置文件遇到 Codex 使用限制，OpenClaw 会在 Codex 报告重置时间时
记录该时间，并为同一次 Codex 运行尝试下一个按顺序排列的认证配置文件。
当重置时间过去后，该订阅配置文件会再次具备资格，而无需更改所选的
`openai/gpt-*` 模型或 Codex 运行时。

配置原生 Codex 插件后，OpenClaw 会读取并缓存一份按运行时和工作区范围限定的
`plugin/installed` 快照。该快照涵盖从 Codex 发现的市场中配置的插件，包括已禁用插件的归属信息。
`plugin/read` 只解析明确配置的插件详情。`/codex plugins available` 会使用绑定的工作区查询
`plugin/list`，而 `/codex plugins install <plugin>@<marketplace>` 是由所有者或管理员授权的安装路径。
常规线程设置会保留现有的明确配置精选插件恢复机制。

`app/installed` 提供已安装应用的运行时快照，而 `app/read` 以每批最多 100 个应用 ID
的方式提供经过认证的应用元数据。OpenClaw 会强制刷新一次冷快照，并将成功的精选
安装整合到一次应用清单刷新中。普通的缓存读取不会为每个线程强制刷新连接器。

经过授权的应用最初可能显示为已禁用或不可调用，因为 Codex 尚未应用目标线程的限制性
应用配置。OpenClaw 只临时接纳明确允许且已证明归属的应用，以
`_default.enabled = false` 启动线程，并使用该线程的 ID 和 `forceRefresh: false` 读取
一次 `app/installed`。只有在 Codex 确认应用对实际线程已启用且可调用后，才会暴露该应用。
缺失的元数据、已撤销的身份验证、托管限制、工作区策略以及不可用的工具都会保持故障关闭。

该检查会在 OpenClaw 启动轮次或提交线程绑定之前运行。失败的持久临时线程会被删除；
临时线程会被取消订阅。如果无法确认清理已完成，OpenClaw 会停用该 app-server 连接，
而不是重新使用不安全的线程。

整个账户范围的应用访问权限永远不会覆盖显式禁用的已配置工作区插件。当
`app/read` 省略该插件的归属信息时，OpenClaw 会使用 `plugin/installed` 快照，并且
只读取完全匹配的已配置插件的详情，以继续拒绝其应用访问。此检查绝不会安装、启用或
验证该插件。

OpenClaw 不会安装未知应用，也不会让模型授权新的插件安装。所有者批准的插件安装会刷新目标运行时清单。
缺失的清单方法、身份验证错误、传输失败和连接器刷新失败都会以故障安全方式关闭。

### 环境隔离

对于本地 stdio 应用服务器启动，OpenClaw 会将 `CODEX_HOME` 设置为
每个代理专用的目录，因此 Codex 配置、认证/账户文件、插件缓存/数据，
以及本地线程状态默认都不会读写操作者个人的
`~/.codex`。OpenClaw 会保留正常的进程 `HOME`；Codex 运行的子进程仍然可以找到用户主目录中的配置和令牌，并且
Codex 可能会发现共享的 `$HOME/.agents/skills` 和
`$HOME/.agents/plugins/marketplace.json` 条目。使用
`appServer.homeScope: "user"` 时，OpenClaw 会改为使用原生用户的 Codex
home 及其现有账户，而不会注入 OpenClaw 认证配置文件。

如果某个部署需要额外的环境隔离，请将这些
变量添加到 `appServer.clearEnv` 中：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            clearEnv: ["CODEX_API_KEY", "OPENAI_API_KEY"],
          },
        },
      },
    },
  },
}
```

`appServer.clearEnv` 只影响所创建的 Codex 应用服务器子
进程。OpenClaw 在本地启动规范化期间会将 `CODEX_HOME` 和 `HOME` 从该列表中移除：
`CODEX_HOME` 仍会指向所选的代理或用户作用域，而 `HOME` 仍会保持继承状态，以便子进程可以使用
正常的用户主目录状态。

经过验证的本地设置运行同样会证明所选的 Codex 启动器和软件包有效。
继承的 `NODE_OPTIONS` 可能包含资源限制、警告、DNS 结果顺序、
网络族自动选择、环境代理和 CA 来源选项，因为这些设置无法预加载代码或更改模块解析。例如，
允许使用 `--dns-result-order=ipv4first --no-network-family-autoselection`。
格式错误或未知的选项，以及 `--require` 或
`--import` 等代码加载选项，都会以故障安全方式失败。如果 Codex 不需要某个继承的选项，请使用
`appServer.clearEnv` 移除 `NODE_OPTIONS`。

### 动态工具和网页搜索

Codex 动态工具默认以 `searchable` 模式加载。OpenClaw 通常不会公开与 Codex 原生工作区操作重复的动态工具：
`read`、`write`、`edit`、`apply_patch`、`exec`、`process`、`update_plan`、
`get_goal`、`create_goal`、`update_goal`、`tool_call`、`tool_describe`、
`tool_search` 和 `tool_search_code`。目标操作仍由 Codex 原生处理，
因此 OpenClaw 不会将第二个目标存储投影到 Codex 轮次中。其余大多数
OpenClaw 集成工具，例如消息、媒体、cron、浏览器、节点、网关和
`heartbeat_respond`，都可通过 `openclaw` 命名空间下的 Codex 工具搜索使用，
从而减小初始模型上下文。对于 `exec` 和 `process`，当有限的允许列表禁用原生代码模式时，
受限轮次 shell 回退是例外；运行时允许列表和 `codexDynamicToolsExclude` 仍然适用。

标记为 `catalogMode: "direct-only"` 的工具，包括 OpenClaw 的 `computer` 工具，
应改用 `openclaw_direct` 命名空间。Codex 将该命名空间视为 `DirectModelOnly`，
因此这些工具在普通线程和仅代码线程中仍会直接对模型可见，而不会通过嵌套的代码模式
`tools.*` 调用进行路由。

启用搜索后，如果未选择托管提供商，网页搜索默认使用 Codex 托管的 `web_search` 工具。
原生托管搜索与 OpenClaw 的托管 `web_search` 动态工具互斥，因此托管搜索无法绕过原生域名限制。
当托管搜索不可用、被明确禁用或被所选托管提供商替代时，OpenClaw 会使用托管工具。
OpenClaw 会保持禁用 Codex 独立的 `web.run` 扩展，因为生产环境的应用服务器流量会拒绝其用户定义的
`web` 命名空间。`tools.web.search.enabled: false` 会禁用这两条路径，工具禁用专用的 LLM 运行也是如此。
Codex 将 `"cached"` 视为一种偏好，并在不受限的应用服务器轮次中将其解析为实时外部访问。
当设置了原生 `allowedDomains` 时，自动托管回退会失败并关闭，从而确保无法绕过允许列表。
持久化的有效搜索策略变更会在下一轮之前轮换绑定的 Codex 线程；每轮临时限制则使用临时受限线程，
并保留现有绑定，以便之后恢复。

`sessions_yield`、`sessions_spawn` 以及仅限消息工具的源回复会保持直接调用，
因为它们属于轮次控制或委派契约。指南仍然建议将 Codex 原生的 `spawn_agent` 作为主要的 Codex
子代理接口，同时，显式的 OpenClaw 或 ACP 委派仍可通过 `sessions_spawn` 直接调用。
在 Codex 代码模式中，通用 OpenClaw 动态工具的结果是 JSON 文本，而不是 JavaScript 对象，
因此在读取字段前，应先解析看起来像 JSON 的结果。Codex 还会串行化嵌套的动态调用；
应在有界循环中提交多个 `sessions_spawn` 调用，而不要期望 `Promise.all` 并发启动它们。
已经接受的子任务仍可在后续调用提交期间重叠执行。完整模式请参见
[Swarm](/tools/swarm#use-swarm-from-other-harnesses)。
Heartbeat 协作说明会告知 Codex：当 `heartbeat_respond` 尚未加载时，
应在结束 heartbeat 轮次前搜索该工具。

仅当连接到无法搜索延迟动态工具的自定义 Codex 应用服务器，或调试完整工具负载时，
才设置 `codexDynamicToolsLoading: "direct"`。

### 配置字段

支持的顶层 Codex 插件字段：

| 字段                      | 默认值        | 含义                                                                                  |
| -------------------------- | -------------- | ---------------------------------------------------------------------------------------- |
| `codexDynamicToolsLoading` | `"searchable"` | 使用 `"direct"` 可将 OpenClaw 动态工具直接放入初始 Codex 工具上下文中。 |
| `codexDynamicToolsExclude` | `[]`           | 要从 Codex app-server 轮次中省略的额外 OpenClaw 动态工具名称。              |
| `codexPlugins`             | disabled       | 为已迁移的、从源码安装的精选插件提供原生 Codex 插件/app 支持。           |
| `sessionCatalog`           | enabled        | 用于在此 Gateway 和符合条件的配对节点上发现原生 Codex 会话的侧边栏功能。   |
| `supervision`              | disabled       | 面向代理的原生会话转录与写入控制策略。                         |

支持的 `appServer` 字段：

| 字段                                         | 默认值                                                | 含义                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `transport`                                   | `"stdio"`                                              | `"stdio"` 会启动 Codex；显式设置为 `"unix"` 时连接到本地控制套接字；设置为 `"websocket"` 时连接到 `url`。                                                                                                                                                                                                                                                                                                                   |
| `homeScope`                                   | `"agent"`                                              | `"agent"` 会按 OpenClaw 代理隔离普通工具链状态。`"user"` 是显式选择加入的设置，会共享原生 `$CODEX_HOME` 或 `~/.codex`，使用原生身份验证，并启用仅限所有者的线程管理。用户范围支持本地 stdio 或 Unix 传输。对于单独的监督连接，未设置时，stdio 或 Unix 会解析为 `"user"`，WebSocket 会解析为 `"agent"`。                                        |
| `command`                                     | 受管理的 Codex 二进制文件                                   | stdio 传输使用的可执行文件。留空以使用受管理的二进制文件；仅在需要显式覆盖时设置。                                                                                                                                                                                                                                                                                                                       |
| `args`                                        | `["app-server", "--listen", "stdio://"]`               | stdio 传输使用的参数。                                                                                                                                                                                                                                                                                                                                                                                                     |
| `url`                                         | 未设置                                                  | WebSocket App Server URL 或 `unix://` URL。显式设置为空的 Unix 路径时，会选择规范的用户主目录控制套接字。                                                                                                                                                                                                                                                                                                             |
| `authToken`                                   | 未设置                                                  | WebSocket 传输使用的 Bearer 令牌。接受字面量字符串或 SecretInput，例如 `${CODEX_APP_SERVER_TOKEN}`。                                                                                                                                                                                                                                                                                                                 |
| `headers`                                     | `{}`                                                   | 额外的 WebSocket 标头。标头值接受字面量字符串或 SecretInput 值，例如 `x-codex-client-session-token: "${CODEX_CLIENT_SESSION_TOKEN}"`。                                                                                                                                                                                                                                                                  |
| `clearEnv`                                    | `[]`                                                   | 在 OpenClaw 构建继承的环境后，从生成的 stdio app-server 进程中移除的额外环境变量名称。对于本地启动，OpenClaw 会保留所选的 `CODEX_HOME` 和继承的 `HOME`。                                                                                                                                                                                                              |
| `codeModeOnly`                                | `false`                                                | 选择加入 Codex 的仅代码模式工具面。普通 OpenClaw 动态工具仍可通过嵌套的 `tools.*` 调用使用；`openclaw_direct` 工具仍会直接对模型可见。                                                                                                                                                                                                                                                |
| `remoteWorkspaceRoot`                         | 未设置                                                  | 远程 Codex app-server 工作区根目录。OpenClaw 会将本地 cwd 映射到此根目录，并通过一个具有限制输出大小且无 shell 的 `command/exec` 读取器传输权威远程附件。越出任一工作区的路径、符号链接、超大文件以及无界附件批次都会安全失败；上传会保留配置的通道身份和 app-server 请求超时时间。                                            |
| `requestTimeoutMs`                            | `60000`                                                | app-server 控制平面调用的超时时间。                                                                                                                                                                                                                                                                                                                                                                                        |
| `turnCompletionIdleTimeoutMs`                 | `60000`                                                | Codex 接受轮次后，或轮次范围的 app-server 请求完成后，OpenClaw 等待 `turn/completed` 时所使用的静默窗口。                                                                                                                                                                                                                                                                                                       |
| `turnAssistantCompletionIdleTimeoutMs`        | `10000`                                                | 在最终/非评论性 assistant 项或工具调用前的原始 assistant 完成后，OpenClaw 仍在等待 `turn/completed` 时，用于启动 assistant 输出释放的静默窗口。增大此值会给 Codex 更多时间发出 `turn/completed`，之后 OpenClaw 才会中断并释放会话通道。                                                                                                                               |
| `postToolRawAssistantCompletionIdleTimeoutMs` | `300000`                                               | 在工具交接、原生工具完成、工具调用后的原始 assistant 进度、原始推理完成或推理进度之后，OpenClaw 等待 `turn/completed` 时使用的完成静默和进度保护时间。对于受信任或负载较重的工作负载，如果工具调用后的综合处理确实可能比最终 assistant 释放预算保持更长时间的静默，请使用此项。                                                                   |
| `mode`                                        | `"yolo"`，除非本地 Codex 要求不允许 YOLO | YOLO 或受监管方审核执行的预设。本地 stdio 要求如果不包含 `danger-full-access`、`never` 审批或 `user` 审核者，则隐式默认值为 guardian。                                                                                                                                                                                                                                              |
| `approvalPolicy`                              | `"never"` 或允许的 guardian 审批策略       | 发送到线程启动/恢复/轮次的原生 Codex 审批策略。Guardian 默认值在允许时优先使用 `"on-request"`。                                                                                                                                                                                                                                                                                                               |
| `sandbox`                                     | `"danger-full-access"` 或允许的 guardian 沙箱  | 发送到线程启动/恢复的原生 Codex 沙箱模式。Guardian 默认值在允许时优先使用 `"workspace-write"`，否则使用 `"read-only"`。启用 OpenClaw 沙箱时，`danger-full-access` 轮次会使用 Codex `workspace-write`，网络访问权限则根据 OpenClaw 沙箱的出口设置确定。                                                                                                                        |
| `approvalsReviewer`                           | `"user"` 或允许的 guardian 审核者               | 在允许时，使用 `"auto_review"` 让 Codex 审核原生审批提示，否则使用 `guardian_subagent` 或 `user`。`guardian_subagent` 仍是旧版别名。                                                                                                                                                                                                                                                                 |
| `serviceTier`                                 | 未设置                                                  | 仅适用于原生 Codex app-server 的偏好设置。任何非空字符串都会透传，以确保向前兼容；文档化的值为 `"priority"` 和 `"flex"`。`null` 会清除覆盖值，旧版 `"fast"` 会规范化为 `"priority"`。这既不是共享的快速模式设置，也不是直接嵌入式 OpenAI 设置。共享的快速运行控制会以 `priority` 或 `null` 覆盖它，或者在自动模式下决定每次模型调用的设置。 |
| `networkProxy`                                | disabled                                               | 选择加入 Codex 针对 app-server 命令的权限配置文件网络功能。OpenClaw 会定义所选 `permissions.<profile>.network` 配置，并使用 `default_permissions` 选择它，而不是发送 `sandbox`。                                                                                                                                                                                                                |
| `experimental.sandboxExecServer`              | `false`                                                | 预览版选择加入功能，会向受支持的 Codex app-server 注册由 OpenClaw 沙箱提供支持的 Codex 环境，使原生 Codex 执行可以在当前活跃的 OpenClaw 沙箱内运行。                                                                                                                                                                                                                                               |

`appServer.networkProxy` 是显式配置，因为它会改变 Codex 沙箱
契约。启用后，OpenClaw 还会在 Codex 线程配置中设置 `features.network_proxy.enabled`
和 `default_permissions`，以便生成的
权限配置文件可以启动 Codex 托管网络。默认情况下，OpenClaw 会根据配置文件主体
生成一个抗冲突的 `openclaw-network-<fingerprint>` 配置文件
名称；仅在需要稳定的本地名称时使用 `profileName`。

```json5
{
  plugins: {
    entries: {
      codex: {
        config: {
          appServer: {
            sandbox: "workspace-write",
            networkProxy: {
              enabled: true,
              domains: {
                "api.openai.com": "allow",
                "blocked.example.com": "deny",
              },
              unixSockets: {
                "/tmp/proxy.sock": "allow",
                "/tmp/blocked.sock": "none",
              },
              allowUpstreamProxy: true,
              proxyUrl: "http://127.0.0.1:3128",
            },
          },
        },
      },
    },
  },
}
```

如果常规 app-server 运行时本应是 `danger-full-access`，启用
`networkProxy` 会为生成的权限配置文件使用工作区风格的文件系统访问：Codex
托管网络强制是受沙箱保护的网络，因此完全访问配置文件不会
保护出站流量。域条目使用 `allow` 或 `deny`；Unix 套接字条目使用 Codex 的
`allow` 或 `none` 值。

### 动态工具调用超时

OpenClaw 自有的动态工具调用独立于
`appServer.requestTimeoutMs` 进行限制：Codex 的 `item/tool/call` 请求默认使用 90
秒的 OpenClaw 看门狗。每次调用传入的正数 `timeoutMs`
参数可以延长或缩短该特定工具的预算，上限为 600000 毫秒。
`image_generate` 工具在工具调用未提供自身超时时使用
`agents.defaults.mediaModels.image.timeoutMs`，否则使用 120 秒的
图像生成默认值。媒体理解的 `image` 工具使用所选支持图像的
`tools.media.models[]` 条目的 `timeoutSeconds`，或使用其 60 秒的媒体默认值；对于
图像理解，该超时应用于请求本身，不会因之前的准备工作而缩短。超时时，OpenClaw 会在支持的情况下中止工具信号，并向 Codex 返回失败的动态工具响应，使轮次能够继续，而不是让会话一直停留在 `processing` 状态。
此看门狗是外层动态 `item/tool/call` 预算；提供商特定的请求超时在该调用内部运行，并保持各自的超时语义。

在 Codex 接受一个轮次之后，以及在 OpenClaw 响应一次轮次范围内的 app-server 请求之后，harness 期望 Codex 取得当前轮次的进展，并最终以 `turn/completed` 完成原生轮次。如果 app-server 在 `appServer.turnCompletionIdleTimeoutMs` 时间内保持静默，OpenClaw 会尽力中断 Codex 轮次，记录诊断超时，并释放 OpenClaw 会话通道，这样后续聊天消息就不会排在一个过时的原生轮次之后。对同一轮次的大多数非终态通知都会解除这个短看门狗，因为 Codex 已证明该轮次仍然存活。

工具交接使用更长的工具后空闲预算：在 OpenClaw 返回 `item/tool/call` 响应之后，在原生工具项（如 `commandExecution`）完成之后，在原始 `custom_tool_call_output` 完成之后，以及在工具后的原始 assistant 进度、原始 reasoning 完成或 reasoning 进度之后。若已配置，该保护使用 `appServer.postToolRawAssistantCompletionIdleTimeoutMs`，否则默认为五分钟；同一预算还会扩展进度看门狗，用于 Codex 发出下一个当前轮次事件之前的静默合成窗口。全局 app-server 通知（例如限流更新）不会重置轮次空闲进度。Reasoning 完成、评论性 `agentMessage` 完成，以及工具前的原始 reasoning 或 assistant 进度之后，可能会跟随自动最终回复，因此它们使用的是工具后进度回复保护，而不是立即释放会话通道。

只有最终的/非评论性的已完成 `agentMessage` 项，以及工具前的原始 assistant 完成，才会武装 assistant 输出释放：如果随后 Codex 在没有 `turn/completed` 的情况下保持静默，OpenClaw 会尽力中断原生轮次并释放会话通道。如果另一个轮次看门狗赢得了该释放竞态，那么只要没有原生请求、项或动态工具完成仍处于活动状态，并且 assistant 输出释放仍属于最新完成的项且没有更晚的项完成，OpenClaw 仍会接受已完成的最终 assistant 项。这样可以在已完成的工具工作后保留最终答案，而无需重放该轮次。部分 assistant 增量、过时的较早回复，以及空的较晚完成都不符合条件。

可重放的 stdio app-server 失败，包括在没有 assistant、工具、活动项或副作用证据的情况下发生的轮次完成空闲超时，会在新的 app-server 尝试中重试一次。不安全的超时仍会终止卡住的 app-server 客户端并释放 OpenClaw 会话通道；它们还会清除过时的原生线程绑定，而不是自动重放。完成看门狗超时会显示 Codex 特定的超时文本：可重放的情况会说明响应可能不完整，而不安全的情况会提示用户在重试前验证当前状态。公开的超时诊断包含结构化字段，例如最后一条 app-server 通知方法、原始 assistant 响应项的 id/type/role、活动请求/项计数，以及已武装的看门狗状态；当最后一条通知是原始 assistant 响应项时，它们还会包含一个有界的 assistant 文本预览。它们不包含原始提示词或工具内容。

### 本地测试环境覆盖项

- `OPENCLAW_CODEX_APP_SERVER_BIN` 在 `appServer.command` 未设置时会绕过受管二进制文件。
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已被移除。请改用
`plugins.entries.codex.config.appServer.mode: "guardian"`，或者在一次性的本地测试中使用
`OPENCLAW_CODEX_APP_SERVER_MODE=guardian`。对于可重复部署，更推荐使用配置，
因为它会将插件行为与 Codex harness 其余设置一起保存在同一个经过审查的文件中。

## 原生 Codex 插件

原生 Codex 插件支持使用 Codex app-server 自身的 app 和插件能力，并且与 OpenClaw harness turn 处于同一个 Codex 线程中。OpenClaw 不会将 Codex 插件转换为合成的 `codex_plugin_*` OpenClaw 动态工具。

`codexPlugins` 仅影响选择原生 Codex harness 的会话。
它对内置 harness 运行、普通 OpenAI provider 运行、ACP
conversation bindings 或其他 harness 不产生任何影响。

迁移后的最小配置：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            allow_destructive_actions: true,
            plugins: {
              "google-calendar": {
                enabled: true,
                marketplaceName: "openai-curated",
                pluginName: "google-calendar",
              },
            },
          },
        },
      },
    },
  },
}
```

当 OpenClaw 建立 Codex harness
会话或替换过期的 Codex 线程绑定时，会计算 Thread app 配置；它不会在
每个 turn 都重新计算。更改 `codexPlugins` 后，请使用 `/new`、`/reset`，或重启
gateway，以便未来的 Codex harness 会话使用更新后的 app
集合启动。

关于迁移资格、app 库存、破坏性操作策略、询问机制和原生插件诊断，请参见
[原生 Codex 插件](/plugins/codex-native-plugins)。

OpenAI 侧的 app 和插件访问受已登录的 Codex
账户控制；对于 Business 和 Enterprise/Edu workspace，还受 workspace app
controls 控制。有关 OpenAI 的账户和 workspace 控制概览，请参见
[使用 Codex 搭配你的 ChatGPT 方案](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)。

## 计算机使用

计算机使用有其自己的设置指南：
[Codex 计算机使用](/plugins/codex-computer-use)。

简短版本：OpenClaw 不会内置桌面控制应用，也不会自行执行桌面操作。它会准备 Codex 应用服务器，验证 `computer-use` MCP 服务器可用，然后在 Codex 模式轮次中让 Codex 负责原生的 MCP 工具调用。

## 运行时边界

Codex harness 只会改变底层嵌入式 agent 执行器。

- 支持 OpenClaw 动态工具。Codex 会请求 OpenClaw 执行
  这些工具，因此 OpenClaw 仍然处于执行路径中。
- Codex 原生的 shell、patch、MCP 和原生应用工具由 Codex 负责。
  OpenClaw 可以通过
  支持的中继观察或阻止选定的原生事件，但不会重写原生工具参数。
- Codex 负责原生压缩。OpenClaw 会保留一份转录镜像，用于
  通道历史、搜索、`/new`、`/reset` 以及未来的模型或 harness 切换，
  但不会用 OpenClaw 或 context-engine 摘要器替代 Codex 压缩。
- 媒体生成、媒体理解、TTS、审批以及消息工具
  输出继续通过匹配的 OpenClaw 提供方/模型设置进行。
- `tool_result_persist` 适用于 OpenClaw 负责的转录工具结果，
  不适用于 Codex 原生工具结果记录。

关于 hook 层、受支持的 V1 接口、原生权限处理、队列引导、Codex 反馈上传机制以及压缩细节，请参见
[Codex harness 运行时](/plugins/codex-harness-runtime)。

## 故障排查

**Codex 不会作为普通的 `/model` 提供方出现：** 对于新配置来说这是预期行为。请选择 `openai/gpt-*` 模型，启用
`plugins.entries.codex.enabled`，并检查 `plugins.allow` 是否排除了
`codex`。

**OpenClaw 使用内置 harness 而不是 Codex：** 确认有效路由是精确的官方 HTTPS Platform Responses 或 ChatGPT Responses 路由、
没有编写的 provider 请求覆盖，并且 Codex 插件已安装且已启用。仅有
`openai/gpt-*` 前缀并不足够。为了在测试时进行严格验证，请设置 provider 或 model 的
`agentRuntime.id: "codex"`；当路由或 harness 不兼容时，强制使用 Codex 会失败，
而不是回退。

**OpenAI Codex runtime 回退到 API-key 路径：** 收集一段已脱敏的
gateway 摘录，展示 model、runtime、所选 provider 和
失败信息。请受影响的协作者在其 OpenClaw 主机上运行以下只读命令：

```bash
(
  pattern='openai/gpt-5\.[45]|openai[-]codex|agentRuntime(\.id)?|harnessRuntime|Runtime: OpenAI Codex|legacy OpenAI Codex prefix|resolveSelectedOpenAIRuntimeProvider|candidateProvider[": ]+openai|status[": ]+401|Incorrect API key|No API key|api-key path|API-key path|OAuth'

  if ls /tmp/openclaw/openclaw-*.log >/dev/null 2>&1; then
    grep -E -i -n "$pattern" /tmp/openclaw/openclaw-*.log 2>/dev/null || true
  else
    journalctl --user -u openclaw-gateway --since today --no-pager 2>/dev/null \
      | grep -E -i "$pattern" || true
  fi
) | sed -E \
    -e 's/(Authorization: Bearer )[A-Za-z0-9._~+\/-]+/\1[REDACTED]/Ig' \
    -e 's/(Bearer )[A-Za-z0-9._~+\/-]+/\1[REDACTED]/Ig' \
    -e 's/(api[_ -]?key[=: ]+)[^ ,}"]+/\1[REDACTED]/Ig' \
    -e 's/(OPENAI_API_KEY[=: ]+)[^ ,}"]+/\1[REDACTED]/Ig' \
    -e 's/sk-[A-Za-z0-9_-]{12,}/sk-[REDACTED]/g' \
    -e 's/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/[EMAIL-REDACTED]/g' \
  | tail -200
```

常见的有效摘录通常包括 `openai/gpt-5.6-sol` 或 `openai/gpt-5.6-luna`、
`Runtime: OpenAI Codex`、`agentRuntime.id` 或 `harnessRuntime`、
`candidateProvider: "openai"`，以及 `401`、`Incorrect API key` 或
`No API key` 结果。修正后的运行应显示 OpenAI OAuth 路径，
而不是普通的 OpenAI API-key 失败。

**旧版 Codex 模型引用配置仍然存在：** 运行 `openclaw doctor --fix`。Doctor 会将旧版模型引用重写为 `openai/*`，移除过期的会话和整 agent runtime 固定配置，并保留现有的 auth-profile 覆盖。

**app-server 被拒绝：** 确切使用稳定版 Codex `0.147.0`。旧版本或新版本、预发布版本、带构建后缀的版本以及未指定版本的服务器都会被拒绝，因为 OpenClaw 会根据其随附的 Codex 版本，验证生成的 schema 和 runtime 契约。请更新或移除选择其他版本的自定义、远程或桌面二进制覆盖配置。

**`/codex status` 无法连接：** 检查 `codex` 插件是否
已启用；如果配置了 allowlist，检查 `plugins.allow` 是否包含它；并确认任何自定义的
`appServer.command`、`url`、`authToken` 或 headers 都有效。

**Codex app-server 使用过多内存：** 首先区分这两个进程。
OpenClaw 将本地 Codex app-server 作为独立的 Rust 子进程运行。
`NODE_OPTIONS=--max-old-space-size=...` 只会改变 Gateway 的 Node.js V8
堆大小；它不会限制或扩大 Codex 的内存。受管控的 Gateway 安装已经会选择自适应的 V8 堆大小，
增大该值反而可能为 Codex 留下更少的主机内存。对于 Gateway 内存压力，请使用
[Gateway 内存故障排查](/gateway/troubleshooting#gateway-exits-during-high-memory-use)，
并检查主机或容器为 Codex 子进程分配的内存。

捆绑的 Codex 没有堆或 RSS 限制，也没有可配置的空闲卸载延迟。在最后一个客户端取消订阅后，
非活跃线程最多可以保持加载 30 分钟。OpenClaw 会在每个 Codex app-server 上独立保持最多 64 个空闲会话线程的订阅，
在它们最后一次活动后的 30 分钟内持续如此。当多个会话交替使用时，这可以保留热会话和会话范围的审批。
活跃轮次以及拥有未完成原生子 agent 的父线程会受到保护，不会被空闲回收；会话重置或删除会立即释放其自身线程。
达到空闲上限后，会取消订阅最近最少使用的会话；随后 Codex 会应用其独立的卸载延迟，
之后恢复的会话可能需要再次进行审批。

在资源受限的主机上，请先减少原生 Codex 子 agent 的扇出，再增加
Gateway 堆大小：

```json5
{
  plugins: {
    entries: {
      codex: {
        config: {
          appServer: {
            args: ["-c", "agents.max_threads=3", "app-server", "--listen", "stdio://"],
          },
        },
      },
    },
  },
}
```

此设置会限制捆绑 Codex 默认多 agent 后端的原生子线程数量。
如果你明确启用了 Codex multi-agent v2，请改用
`features.multi_agent_v2.max_concurrent_threads_per_session=3`；v2
限制包含根线程，且不能与 `agents.max_threads` 结合使用。
如需为 Codex 提供更多内存空间，请增加主机、容器或 cgroup 的内存分配。
操作系统硬限制可能会直接终止 Codex，而不是对其施加背压。

**模型发现速度较慢：** 降低
`plugins.entries.codex.config.discovery.timeoutMs` 或禁用发现功能。
参见 [Codex harness 参考](/plugins/codex-harness-reference#model-discovery)。

**WebSocket 传输立即失败：** 检查 `appServer.url`、
`authToken`、headers，并确认远程 app-server 使用相同的 Codex
app-server 协议版本。Codex WebSocket 传输仍处于实验阶段且不受支持；
优先使用受管控的 stdio 或本地 Unix 控制套接字。

**原生 shell 或 patch 工具被 `Native hook relay unavailable` 阻止：** Codex 线程仍在尝试使用 OpenClaw 已不再注册的原生 hook relay
id。这是原生 Codex hook 传输问题，不是 ACP 后端、provider、GitHub 或 shell 命令
失败。请在受影响的聊天中使用 `/new` 或 `/reset` 开启全新会话，
然后重试一个无害命令。如果这次能成功，但下一次原生工具调用又失败，
则将 `/new` 仅视为临时解决方案：在重启 Codex app-server 或
OpenClaw Gateway 之后，将提示复制到新会话中，以便旧线程被丢弃并重新创建
原生 hook 注册。

**Codex 工具调用创建了过多短生命周期的 hook 进程：** 将
`plugins.entries.codex.config.appServer.loopDetectionPreToolUseRelay: false`
设为 `false`，然后重启 gateway。这只会禁用 Codex 的 `PreToolUse` 子进程，
该子进程用于 OpenClaw 循环检测及其无策略标记。
必需的 `before_tool_call` 和受信任工具策略 relay 仍会保持启用。

**非 Codex 模型使用内置 harness：** 除非 provider 或 model runtime policy
将其路由到其他 harness，否则这是预期行为。
普通的非 OpenAI provider 引用在 `auto` 模式下仍会使用其正常的 provider 路径。

**Computer Use 已安装但工具无法运行：** 在新的会话中检查
`/codex computer-use status`。如果某个工具报告 `Native hook relay unavailable`，
请使用上面的原生 hook relay 恢复方法。
参见 [Codex Computer Use](/plugins/codex-computer-use#troubleshooting)。

## 相关内容

- [Codex 运行时参考](/plugins/codex-harness-reference)
- [Codex 运行时](/plugins/codex-harness-runtime)
- [Codex 监督](/plugins/codex-supervision)
- [原生 Codex 插件](/plugins/codex-native-plugins)
- [Codex 计算机使用](/plugins/codex-computer-use)
- [Agent 运行时](/concepts/agent-runtimes)
- [模型提供商](/concepts/model-providers)
- [OpenAI 提供商](/providers/openai)
- [OpenAI Codex 帮助](https://help.openai.com/en/collections/14937394-codex)
- [Agent 运行时插件](/plugins/sdk-agent-harness)
- [插件钩子](/plugins/hooks)
- [诊断导出](/gateway/diagnostics)
- [状态](/cli/status)
- [测试](/help/testing-live#live-codex-app-server-harness-smoke)
