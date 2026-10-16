---
summary: "Codex harness配置图、限制转弯、项目说明、压缩和长上下文"
read_when:
  - "您需要 Codex harness配置图"
  - "您正在调整压缩或项目指令"
  - "您正在配置直接 OpenAI API 长上下文路由"
title: "Codexharness配置"
sidebarTitle: "配置"
---

Codex harness配置图和每个设置控制的转弯水平行为。 [Codex harness](/plugins/codex-harness) 指南的一部分； [ 每个部分移动的位置](/plugins/codex-harness#where-each-section-moved) 列出每个部分。

## <a id="configuration"></a> 配置

| 需求                                                | 设置                                                                                                       | 位置                              |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 启用 harness                                  | `plugins.entries.codex.enabled: true`                                                                     | OpenClaw 配置                    |
| 隐藏原生 Codex 会话发现                 | `plugins.entries.codex.config.sessionCatalog.enabled: false`                                              | Codex 插件配置                |
| 包括额外的本地 Codex 存储（仅限 stdio）  | `plugins.entries.codex.config.sessionCatalog.homes`                                                       | Codex 插件配置                |
| 保留列入许可名单的插件安装                  | 将 `codex` 包含在 `plugins.allow` 中                                                                        | OpenClaw 配置                    |
| 允许符合条件的OpenAI隐式轮流使用Codex | 确切的官方 HTTPS Responses/ChatGPT 路线，无创作提供者请求覆盖，运行时 unset/`auto` | OpenAI provider/model 配置       |
| 使用 ChatGPT/Codex OAuth 登录                    | `openclaw models auth login --provider openai`                                                            | CLI 身份验证配置                   |
| 为 Codex 运行添加 API-key 备份                   | `openai:*` API- 密钥配置文件在 `auth.order.openai` 中订阅授权后列出                          | CLI 身份验证配置文件 + OpenClaw 配置 |
| 当Codex不可用时停止执行            | provider 或 model 的 `agentRuntime.id: "codex"`                                                              | OpenClaw model/provider 配置     |
| 使用直接的 OpenAI API 流量                       | provider 或 model 的 `agentRuntime.id: "openclaw"`，并使用常规 OpenAI 身份验证                                   | OpenClaw model/provider 配置     |
| 调整 app-server 行为                            | `plugins.entries.codex.config.appServer.*`                                                                | Codex 插件配置                |
| 启用原生 Codex 插件应用                     | `plugins.entries.codex.config.codexPlugins.*`                                                             | Codex 插件配置                |
| 启用 Codex Computer Use                           | `plugins.entries.codex.config.computerUse.*`                                                              | Codex 插件配置                |

优先选择 `auth.order.openai` 订阅 - first/API-key-backup 订购。现有的旧版 Codex 身份验证配置文件 ID 和旧版 Codex 身份验证订单是仅限医生的旧版状态；不要编写新的旧版 Codex GPT 参考文献。

```json5
{
  auth: {
    order: {
      openai: ["openai:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

对于 Codex- 兼容的有效路径，上述两个配置文件仍然是同一 Codex 运行的候选路径。配置文件顺序选择凭据，而不是运行时。更改身份验证顺序不会使自定义、完成、HTTP 或请求覆盖的路由 Codex- 兼容。有效的模型范围的快速模式和截止控件是运行时控件，而不是请求覆盖。

### <a id="restricted-turns-and-ring-zero"></a> 限制匝数和环零

OpenClaw 每回合应用 Codex 限制，而不是作为永久会话模式。因此，现有会话可以运行一个受限制的回合，并在下一个不受限制的回合返回到其正常的 Codex 线程。当限制是临时的时，OpenClaw 保留正常的线程绑定并在必要时使用临时的受限线程。

当显式 OpenClaw 工具策略无法安全映射到 Codex 的本机工具表面时，会发生普通的 **策略限制转向**。常见的触发因素包括：

- a 有限 `tools.allow` 列表或内部每次运行允许列表
- `disableTools` 或拒绝所有工具的 sender/group 策略
- a `tools.deny` 条目包含通配符、工具组、未知名称或不在 Codex harness的审核安全拒绝集中的名称
- an 适用的代理、提供者、组、发送者、沙箱、子代理、继承、计划或运行时工具策略，具有这些限制之一

仅默认刀具轮廓缩小不会触发此模式。仅包含经过审核的 OpenClaw- 工具的拒绝列表也可以保留在正常的本机表面上；该工具会强制执行这些拒绝，而不会禁用不相关的 Codex 功能。请参阅 [ 本机工具策略执行 ](/plugins/sdk-agent-harness#native-tool-policy-enforcement) 了解通用harness合同，并参阅 [Codex harness参考 ](/plugins/codex-harness-reference#restricted-turns) 了解当前的 Codex 规则。

对于普通的策略限制转向，OpenClaw 禁用 Codex 本机代码模式，删除环境选择，禁用和验证继承的和本机配置的 MCP 服务器，并禁用本机挂钩中继。静态配置的 MCP 工具将有效策略传递到该回合的 OpenClaw 的动态表面。其他 OpenClaw 动态工具使用相同的策略。有界工作区 `AGENTS.md` 快照仍然作为线程级开发人员指令到达模型，因为项目指令是上下文，而不是工具权限。

**零环**更坚固且独立。它是主机拥有的 OpenClaw 系统代理，用于设置和修复操作。主机使用单个`openclaw`工具激活它；正常的代理配置无法选择将聊天加入零环。零环转动仅保留主机范围的工具，用主机编写的安装指令替换环境 Codex 指令，禁用本机工具和 MCP 服务器，并抑制工作区项目文档，包括 `AGENTS.md` 开发人员指令载体。

其他狭窄的内部模式也会抑制项目文档：轻量级引导转向、仅消息源回复和禁用工具的内部转向。它们与策略限制轮次共享一些隔离设置，但不是环零的同义词。

### <a id="project-instructions"></a> 项目说明

Codex 通过本机项目文档发现加载 `AGENTS.md` 文件。对于正常的应用程序服务器线程，OpenClaw 将 Codex 的聚合根到工作目录预算从上游 32 KiB 默认值提高到有限的 128 KiB，因此后面的作用域指令不会被静默剪切。普通对话工具策略限制保留了预算，因为项目说明是上下文，而不是工具权限。它们的隔离本机环境无法读取工作区文件，因此 OpenClaw 提供有界工作区 `AGENTS.md` 快照作为线程级开发人员指令。显式编写的本机 `project_doc_max_bytes` 设置会覆盖普通线程的 128 KiB 回退； Codex的物化32 KiB默认没有。轻量级、零环、仅消息和禁用工具的内部转向将本机项目文档预算设置为零。

继承的代理工作区 `AGENTS.md` 快照对其本机线程保持固定，包括在编辑、清空或删除文件时。启动新会话以加载当前工作区说明。

此字节预算与通过 `agents.defaults.bootstrapMaxChars` 和 `agents.defaults.bootstrapTotalMaxChars` 配置的基于字符的工作区引导程序限制是分开的。

`/context` 将本机项目文档报告为未经验证，因为应用程序服务器公开了它们的源路径，但没有公开确定任何单个文件是否已完全加载或截断所需的保留字节数。

### <a id="compaction"></a> 压缩

请勿在 Codex- 支持的代理上设置 `compaction.model` 或 `compaction.provider`。 Codex 通过其本机应用程序服务器线程状态进行压缩，因此 OpenClaw 在运行时忽略这些本地摘要器覆盖，而 `openclaw doctor --fix` 在代理使用 Codex 时删除它们。

编写的 `models.providers.*.models[].contextTokens` 上限将转发到 Codex 线程启动并恢复为 `model_context_window`。 Codex 将值限制为模型的本机最大值，并从上限窗口导出自动压缩。即使 Codex 提供模型目录，这也适用于配置的模型聊天。当模型条目没有创作上限时，OpenClaw 不发送覆盖。固定到现有本机运行时的会话保留自己的上下文设置，而不是继承外部代理的模型上限。

在普通的配置模型聊天中，创作的上限还限制了主机上下文引擎的组装和维护。 OpenClaw 在装配历史之前为当前输入、指令、工具和输出保留空间，并在恢复接受的转弯时保留成功装配的预算。当前运行预算较小仍然会获胜。这是运营商策略，而不是发现 Codex 的可用限额：Codex 可以应用较小的本机限制或特定于模型的保留。选择具有足够本机余量的编写限制。未配置的模型不会继承另一个模型的上限。

Lossless 仍然可以作为一个 context engine 用于 Codex turn 周围的组装、摄取和维护，通过 `plugins.slots.contextEngine: "lossless-claw"` 和 `plugins.entries.lossless-claw.config.summaryModel` 进行配置，而不是通过 `agents.defaults.compaction.provider`。当 Codex 是活动运行时，`openclaw doctor --fix` 会将旧的 `compaction.provider: "lossless-claw"` 形式迁移到 Lossless context-engine 插槽，但原生 Codex 仍然负责压缩。原生 app-server harness 支持需要预提示组装的 context engine； 通用 CLI 后端，包括 `codex-cli`，不提供这种宿主能力。

当 OpenClaw 没有解析的令牌预算时，上下文引擎接收 Codex 报告的可用窗口。仅当没有较新的未报告轮次取代它时，程序集才可以对同一模型重用绑定线程的观察。在观察结果可用之前，只有明确编写的上限才能提供预算；否则预算仍然未知。已解决的 OpenClaw 预算优先，并且学习本机窗口不会更改线程的引导策略。

新的Codex线程，包括普通的**Fork对话**会话，在有界连续性窗口内接收最近保存的历史记录。适合此窗口的对话文本和摘要将被保留，而不会单独截断每条消息；更长的历史保留着最新的尾巴。工具有效负载和恢复的附件保留其自身的限制。

对于 Codex- 支持的代理，`/compact` 在绑定线程上启动本机 Codex 应用程序服务器压缩并等待其最终结果。适用共享 `agents.defaults.compaction.timeoutSeconds` 预算；超时时，OpenClaw 要求 Codex 中断本机转向并保持每线程围栏，直到确认终止。它永远不会退回到上下文引擎或公共 OpenAI 摘要器。如果本机 Codex 线程绑定丢失或过时，该命令会因错误而停止，而不是默默地切换压缩后端。 SIWC- 支持的本机线程无法使用手动 `/compact`。自动轮流压实仍然可用；当您需要新的上下文时，继续对话或开始新的会话。

取消可以防止未提交的本机请求，包括过载重试。提交后，OpenClaw 保持线程被占用，直到确认本机完成、中断或安全退出。停止会关闭可见的压缩进度，而不将未完成的压缩标记为成功或使之前观察到的本机工作有资格重播。

### <a id="direct-api-long-context"></a> 直接 API 长上下文

Codex 订阅和直接 OpenAI API 流量是单独的合同。实时 ChatGPT/Codex 目录通常公开 `272000` 代币模型窗口，而 OpenAI 记录 `1050000` 代币平台 API 窗口以及 GPT-5.5 和 GPT-5.6. 的 `128000` 最大输出两种运行时翻译都使用相同的内容安全算术：

```text
1050000 total - 128000 maximum output = 922000 safe active input
automatic compaction threshold = 700000 active tokens
```

本机 Codex 转换不是响应参数集。 Codex 拥有本机线程的上下文和压缩，因此请勿将 `responsesServerCompaction` 或 `responsesCompactThreshold` 添加到 Codex- 支持的模型中。

从与已安装 Codex 版本兼容的完整 Codex 模型目录开始。对于确切的 `gpt-5.6-sol` 条目，保留描述符的其余部分，并设置：

```json
{
  "context_window": 922000,
  "max_context_window": 922000,
  "auto_compact_token_limit": 700000
}
```

Codex 将其正常的 95% 有效窗口保留应用于 `922000` 目录值，因此它准确报告 `875900` 可用代币。在 `700000` 进行压缩，在有效防护之前留下 `175900` 代币，在提供者安全输入限额之前留下 `222000`。这个较大的余量是有意为之的：Codex 在添加下一条用户消息和上下文更新之前检查已记录的上下文，因此阈值必须覆盖一个大的传入回合以及工具、指令、序列化和压缩回合本身。

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

进程拥有的隔离网关和应用程序服务器运行验证了这一确切的 `openai/gpt-5.6-sol` API-key 配置。 Codex报告了`875900`的有效窗口。活动上下文从 `197032` 增长到 `377386`、`561957` 和 `750745` 令牌，无需手动压缩；下一个小回合触发了对 `75980` 活动代币的自动压缩，压缩后快照为 `68375` 的最小快照。压缩花费了 `2810` 毫秒并持续计数一。持久标记在压缩和重新启动中幸存下来，固定的长响应产生了 `5442` 输出令牌，并且 OpenClaw 在每次调用时发送 Codex 应用程序服务器层 `priority`。该请求证据并不能证明哪个上游层处理了每个调用。全套套件花了 `401.37` 几秒钟。这些时间是观察结果，而不是服务水平保证。

<Warning>
长上下文是有意选择加入的。一旦输入超过 `272000` 代币，OpenAI 将按 2 倍输入和缓存速率以及 1.5 输出速率对整个请求进行计费。快速模式定价因模型而异； GPT-5.6 Sol API 快速模式（以前​​称为优先级处理）目前是标准模式的另外 2 倍，因此该配方是 4 倍短上下文标准输入端定价和 3 倍短上下文标准输出定价。 OpenClaw 当前发送线值 `service_tier: "priority"`。 ChatGPT/Codex-credit 快速模式是独立的：GPT-5.6 和 GPT-5.5 当前消耗 2.5× 标准积分，而此 API-key Codex 路线使用 API 代币定价。 API 在访问、实际限制和计费方面仍然具有权威性。请参阅 [OpenAI 模型限制](https://developers.openai.com/api/docs/models/compare)、[快速模式](https://openai.com/api-priority-processing/)、[API 定价](https://developers.openai.com/api/docs/pricing) 和[Codex 速度](https://learn.chatgpt.com/docs/agent-configuration/speed)。
</Warning>

本指南的其余部分涵盖了需要 Codex](/plugins/codex-harness/routing)、[guardian 批准策略 ](/plugins/codex-harness/app-server) 和 [native Codex 插件和计算机 Use](/plugins/codex-harness/native-features) 的 [ 部署形状和路由。有关完整选项列表、默认值、枚举、发现、环境隔离、超时和应用程序服务器传输字段，请参阅 [Codex harness参考 ](/plugins/codex-harness-reference)。
