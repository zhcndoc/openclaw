---
summary: "OpenClaw 如何区分模型提供方、模型、通道和代理运行时"
title: "代理运行时"
read_when:
  - "你正在在 OpenClaw、Codex、ACP 或其他原生代理运行时之间做选择"
  - "你对状态或配置中的 provider/model/runtime 标签感到困惑"
  - "你正在为原生 harness 记录支持一致性"
---

**代理运行时**负责一个已准备好的模型循环：它接收提示词， 驱动模型输出，处理原生工具调用，并将完成的轮次返回给 OpenClaw。

运行时很容易与提供方混淆，因为它们都会出现在模型配置附近。它们属于不同层：

| 层         | 示例                                             | 含义                                                             |
| ------------- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| 提供者      | `anthropic`, `github-copilot`, `openai`              | OpenClaw 如何进行身份验证、发现模型以及命名模型引用。 |
| 模型         | `claude-opus-4-6`, `gpt-6-astra`                     | 为代理轮次选择的模型。                              |
| 代理运行时 | `claude-cli`, `codex`, `copilot`, `muse`, `openclaw` | 执行已准备轮次的底层循环或后端。      |
| 渠道       | Discord, Slack, Telegram, WhatsApp                   | 消息进入和离开 OpenClaw 的位置。                            |

**harness** 是提供代理运行时（代码术语）的实现。例如，捆绑的 Codex harness实现了 `codex` 运行时。公共配置在提供者或模型条目上使用 `agentRuntime.id`；整个代理运行时密钥是遗留的并且被忽略。 `openclaw doctor --fix` 删除了旧的全代理运行时引脚，并将遗留运行时模型引用重写为标准 provider/model 引用以及模型范围的运行时策略（如果需要）。

有两类运行时：

- **嵌入式工具**在OpenClaw准备好的代理循环内运行：内置`openclaw`运行时，加上注册的插件工具，例如`codex`、`copilot`和`muse`。
- **CLI 后端** 运行本地 CLI 进程，同时保持模型引用为其标准形式。例如，`anthropic/claude-opus-5` 和模型范围的 `agentRuntime.id: "claude-cli"` 表示“选择 Anthropic 模型，通过 Claude CLI 执行”。 `claude-cli` 不是嵌入式harness ID，不得传递给 AgentHarness 选择。

`copilot` harness是用于 GitHub Copilot CLI 的独立的、可选的外部插件harness；请参阅 [GitHub Copilot 代理运行时](/plugins/copilot)，了解 PI、Codex 和 GitHub Copilot 代理运行时之间面向用户的决策。

## <a id="codex-surfaces"></a> Codex 表面

多个表面共用 Codex 这一名称：

| 表面                                          | OpenClaw name/config                 | 它的作用                                                                                                   |
| ------------------------------------------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| 本机 Codex 应用程序服务器运行时                  | `openai/*` 模型参考                | 通过 Codex 应用程序服务器运行 OpenAI 嵌入式代理。这是常见的 ChatGPT/Codex 订阅设置。 |
| Codex OAuth 身份验证配置文件                        | `openai` OAuth 配置文件              | 存储 Codex 应用程序服务器harness使用的 ChatGPT/Codex 订阅身份验证。                             |
| Codex ACP 适配器                                | `runtime: "acp"`, `agentId: "codex"` | 通过外部 ACP/acpx 控制平面运行 Codex。仅当明确要求 ACP/acpx 时才使用。        |
| 原生 Codex 聊天控制命令集            | `/codex ...`                         | 从聊天中绑定、恢复、引导、停止并检查 Codex app-server 线程。                                |
| OpenAI 平台 API 非代理表面路线 | `openai/*` 加 API-key 身份验证         | 直接 OpenAI API，例如图像、嵌入、语音和实时。                                           |

这些表面是有意独立的。启用 `codex` 插件使本机应用程序服务器功能可用； `openclaw doctor --fix` 拥有旧版 Codex 路由修复和过时会话引脚清理。自动 Codex 选择需要兼容的有效路由：精确的官方 HTTPS 平台响应或 ChatGPT 响应端点，无需编写请求覆盖。仅 `openai/*` 前缀不会选择 Codex。

常见的 ChatGPT/Codex 订阅设置使用 Codex OAuth 进行认证，但将模型引用保持为 `openai/*`，并选择 `codex` 运行时：

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-6-astra",
    },
  },
}
```

这意味着 OpenClaw 先选择一个 OpenAI 模型引用，然后让 Codex app-server 运行时执行这个嵌入式代理轮次。它并不意味着“使用 API 计费”，也不意味着通道、模型提供方目录或 OpenClaw 会话存储会变成 Codex。

启用捆绑的 `codex` 插件后，使用本机 `/codex` 命令界面（`/codex bind`、`/codex threads`、`/codex resume`、`/codex steer`、`/codex stop`）进行自然语言 Codex 控制，而不是ACP。仅当用户明确请求 ACP/acpx 或正在测试 ACP 适配器路径时，才将 ACP 用于 Codex。 Claude Code、Gemini、CLI、OpenCode、Cursor 和类似的外部harness仍使用 ACP。

决策树：

1. **Codex bind/control/thread/resume/steer/stop** -> 当启用捆绑的 `codex` 插件时，本机 `/codex` 命令界面。
2. **将 Codex 作为嵌入式运行时**，或使用通常由订阅支持的 Codex 代理体验 -> `openai/<model>`。
3. **OpenClaw 为 OpenAI 模型明确选择** -> 将模型引用保留为 `openai/<model>` 并将 provider/model 运行时策略设置为 `agentRuntime.id: "openclaw"`。选定的 `openai` OAuth 配置文件通过 OpenClaw 的 Codex-auth 传输进行内部路由。
4. **配置中的旧版 Codex 模型参考** -> 使用 `openclaw doctor --fix` 修复为 `openai/<model>`； doctor 通过在旧模型引用暗示的位置添加 provider/model-scoped `agentRuntime.id: "codex"` 来保留 Codex 身份验证路线。旧版 **`codex-cli/*`** 模型引用修复到相同的 `openai/<model>` Codex 应用程序服务器路由；捆绑的 Codex CLI 后端已在 v2026.5.14. 中删除
5. **明确请求 ACP、acpx 或 Codex ACP 适配器** -> `runtime: "acp"` and `agentId: "codex"`。
6. **Claude Code、Gemini CLI、OpenCode、Cursor、Droid 或其他外部 harness** -> 使用 ACP/acpx，而不是原生子代理运行时。

| 你mean...                             | Use...                                       |
| --------------------------------------- | -------------------------------------------- |
| Codex 应用服务器 chat/thread 控制    | 来自捆绑的 `codex` 插件的 `/codex ...` |
| Codex app-server 嵌入式代理运行时 | `openai/*` 代理模型引用                  |
| OpenAI Codex OAuth                      | `openai` OAuth 配置文件                      |
| Claude Code 或其他外部 harness   | ACP/acpx                                     |

有关 OpenAI- 系列前缀拆分，请参阅 [OpenAI](/providers/openai) 和 [ 模型提供程序](/concepts/model-providers)。有关 Codex 运行时支持合同，请参阅 [Codex Harness Runtime](/plugins/codex-harness-runtime#v1-support-contract)。

## <a id="runtime-ownership"></a> 运行时所有权

不同的运行时拥有循环的不同部分：

| 表面                     | OpenClaw 嵌入式                              | Codex 应用服务器                                                            |
| --------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------- |
| 模型循环所有者            | OpenClaw，通过 OpenClaw 嵌入式运行器 | Codex 应用服务器                                                            |
| 主线程状态        | OpenClaw 对话记录                            | Codex 线程，以及 OpenClaw 对话记录镜像                               |
| OpenClaw 动态工具      | 原生 OpenClaw 工具循环                      | 通过 Codex 适配器桥接                                           |
| 本机 shell 和文件工具 | OpenClaw路径                                  | Codex-native 工具，通过支持的本机挂钩桥接            |
| 上下文引擎              | 原生 OpenClaw 上下文组装               | OpenClaw 项目将上下文组装到 Codex 回合中                     |
| 压缩                  | OpenClaw 或选定的上下文引擎            | Codex-native 压缩，具有 OpenClaw 通知和镜像维护 |
| 通道传递            | OpenClaw                                       | OpenClaw                                                                    |

设计规则：如果OpenClaw拥有该表面，则它可以提供正常的插件挂钩行为。如果本机运行时拥有该表面，则 OpenClaw 需要运行时事件或本机挂钩。如果本机运行时拥有主线程状态，则 OpenClaw 镜像并投影上下文，而不是重写不支持的内部结构。

**锁定的具体模型聊天**仍然使用正常的模型发现、凭证选择及其配置的请求传输。锁可防止模型更改；它不会将模型或身份验证所有权移交给本机运行时。响应参数和其他创作的请求设置仍然是具体请求的一部分。所选运行时必须支持它们或在执行前声明无损回退。

**bound 本机会话** 可以改为保留其本机模型，并单独保留其本机连接的身份验证。 OpenClaw 根据确切的固定harness及其私人绑定验证所有权，而不是以前的使用报告。对于Codex，本机认证仅属于单独的监管连接；在托管连接上保留本机模型仍然使用主机身份验证准备。本机身份验证连接保留自己的连接策略，并且不接收转发的主机配置文件。它们拒绝显式的每次运行提供程序流参数，而不是默默地删除它们。当您需要应用这些参数时，请使用具体模型聊天。

当本机模型仍然使用主机身份验证时，其实际的 provider/model 对控制凭据和请求准备，而不是外部默认值。显式身份验证配置文件保持锁定状态。如果在准备好凭据后恢复更改了该对，则轮流会在推理之前停止并保留新观察到的本机状态；它不会使用过时的凭据重试或替换线程。

会话行和事件使用本机所有者的已知模型对。待处理的本机分支可以显示配置的占位符，直到其第一次选择模型。对于本机身份验证会话，聊天元数据会从呈现的行中删除不相关的主机凭据门，而不声明本机凭据已准备就绪。全局模型可用性和具体模型聊天保持正常的主机身份验证检查。本机选择也与最终响应的计费模型保持分离，包括主机终结器何时提供最后的答案。

## <a id="runtime-selection"></a> 运行时选择

OpenClaw 在提供者和模型解析之后按以下顺序解析嵌入式运行时：

1. **模型范围的运行时策略** 优先。它位于已配置的提供者模型条目中，或位于 `agents.defaults.models["provider/model"].agentRuntime` / `agents.entries.*.models["provider/model"].agentRuntime`。像 `agents.defaults.models["vllm/*"].agentRuntime` 这样的提供者通配符会在精确模型策略之后生效，因此动态发现的提供者模型可以共享同一个运行时，而不会覆盖精确到单个模型的例外。
2. **提供者范围的运行时策略**：`models.providers.<provider>.agentRuntime`。
3. **`auto` 模式**：注册的插件运行时可以声明支持的 provider/model 对。
4. 如果在 `auto` 模式下没有任何项声明该轮次，OpenClaw 会回退到 `openclaw` 作为兼容运行时。若运行必须严格一致，请使用显式的运行时 id。

历史`agentHarnessId`记录了哪个运行时产生了转录本；它不会固定下一回合。即使在另一个工具报告使用情况后，显式受信任的 `pluginOwnerId` 仍然是会话的控制所有者。该插件拥有的聊天上的模型锁定不会将观察结果转换为本机harness引脚。锁定的本机转录保留其创建工具，并且兼容的显式会话运行时覆盖优先于配置的策略。 ACP 会话保留其 ACP 后端。旧版整体代理运行时配置和 `OPENCLAW_AGENT_RUNTIME` 被忽略；使用 `openclaw doctor --fix` 删除过时的配置并修复旧模型引用。

当harness丢失或无法支持路由或身份验证时，显式 provider/model 插件运行时拒绝运行。有一个选择时例外：harness可能会声明 OpenClaw 可以重现确切的请求。 Codex 使用此回退来编写请求覆盖，例如标头、请求参数、超时或有效负载兼容性开关。它会保留这些设置，而不是默默地删除它们。一旦工具开始执行，它的失败就不会通过另一个运行时重播。

肯定的 `compat.supportsReasoningEffort: true` 和仅包含 `minimal`、`low`、`medium`、`high`、`xhigh`、`max` 的非空 `compat.supportedReasoningEfforts` 列表，或`ultra` 描述本机推理能力；他们不会选择 Codex 之外的其他兼容路线。禁用推理、自定义工作标签和其他兼容性开关仍然是请求行为。模型级运行时控件（例如 `fastMode` 和 `thinking`）在其值有效时也会保留本机选择。

CLI 后端别名与嵌入式 harness ids 不同。首选的 Claude CLI 形式如下：

```json5
{
  agents: {
    defaults: {
      model: "anthropic/claude-opus-5",
      models: {
        "anthropic/claude-opus-5": {
          agentRuntime: { id: "claude-cli" },
        },
      },
    },
  },
}
```

诸如 `claude-cli/claude-opus-4-7` 之类的旧参考被接受作为兼容性输入，但新配置应将 provider/model 保持其标准形式，并将执行后端置于 provider/model 运行时策略中。运行 `openclaw doctor --fix` 将持久保留的旧模型选择、模型映射键和显式 `modelPolicy.allow` 条目重写为该标准形状。

旧的 `codex-cli/*` 引用有所不同：doctor 会将它们迁移到 `openai/*`，使其通过 Codex app-server harness 运行，而不是保留一个 Codex CLI 后端。

对于OpenAI代理模型，未设置运行时和`auto`可以在提供商拥有的有效路由声明兼容时选择Codex。自定义端点、完成适配器和编写的请求覆盖保留在 OpenClaw 上，而不是丢失其传输设置。显式 `agentRuntime.id: "openclaw"` 还保持内置运行时可用；对于选定的 `openai` OAuth 配置文件，它使用 OpenClaw 的 Codex-auth 传输，同时保持公共模型引用为 `openai/*`。陈旧的历史生产者字段不会固定下一个回合，可以使用 `openclaw doctor --fix` 进行清理。

如果 `openclaw doctor` 提示在保留旧版 Codex 模型引用的同时已启用 `codex` 插件，请将其视为旧路由状态，并运行 `openclaw doctor --fix` 将其重写为带有 Codex 运行时的 `openai/*`。

## <a id="github-copilot-agent-runtime"></a> GitHub Copilot 代理运行时

外部 `@openclaw/copilot` 插件注册由 GitHub Copilot CLI （`@github/copilot-sdk`） 支持的选择加入 `copilot` 运行时。它声称是标准订阅`github-copilot`提供商，并且是`auto`选择的**never**。通过 `agentRuntime.id` 选择按模型或按提供商：

```json5
{
  agents: {
    defaults: {
      model: "github-copilot/gpt-5.5",
      models: {
        "github-copilot/gpt-5.5": {
          agentRuntime: { id: "copilot" },
        },
      },
    },
  },
}
```

插件清单声明了 harness 提供商、运行时、CLI 会话密钥和身份验证配置文件前缀， 无需 `openclaw doctor` 加载插件代码。有关配置、身份验证、记录镜像、压缩、 声明式 doctor 契约，以及更广泛的 PI、Codex 与 Copilot SDK 选型，请参阅 [GitHub Copilot 代理运行时](/plugins/copilot)。

## <a id="muse-code-agent-runtime"></a> Muse 代码代理运行时

外部 `@openclaw/muse` 插件为标准 `meta` 提供程序注册由 Muse 代码 CLI 支持的选择加入 `muse` 运行时。 `auto` 从未选择过它；在 `meta/*` 模型或提供程序上设置 `agentRuntime.id: "muse"`。请参阅 [Muse 代码代理运行时](/plugins/muse)。

## <a id="compatibility-contract"></a> 兼容性契约

当运行时不是 OpenClaw 时，其文档应说明它支持哪些 OpenClaw 表面：

| 问题                               | 重要原因                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 谁拥有模型循环？               | 决定重试、工具续接以及最终答案决策发生在哪里。                   |
| 谁拥有主线程历史记录？       | 决定 OpenClaw 是否可以编辑历史，还是只能镜像它。                                   |
| OpenClaw 动态工具有用吗？        | 消息、会话、cron 和 OpenClaw- 拥有的工具依赖于此。                                 |
| 动态工具挂钩有用吗？            | 插件需要 `before_tool_call`、`after_tool_call` 以及围绕 OpenClaw- 拥有的工具的中间件。 |
| 原生工具钩子是否可用？             | Shell、patch 以及运行时拥有的工具需要原生钩子支持以进行策略和观察。        |
| 上下文引擎生命周期是否运行？ | 内存和上下文插件依赖 assemble、ingest、after-turn 和 compaction 生命周期。      |
| 暴露了哪些压缩数据？       | 有些插件只需要通知；其他人需要 kept/dropped 元数据。                          |
| 哪些内容是有意不支持的？     | 用户不应假定在原生运行时拥有更多状态的情况下与 OpenClaw 等价。            |

Codex 运行时支持契约记录在 [Codex harness runtime](/plugins/codex-harness-runtime#v1-support-contract)。

## <a id="status-labels"></a> 状态标签

状态输出可以同时显示 `Execution` 和 `Runtime` 标签。请将它们视为诊断信息，而不是提供方名称：

- A 模型参考（例如 `openai/gpt-6-astra`）是所选的 provider/model.
- A运行时id例如`codex`是执行回合的循环。
- 类似 Telegram 或 Discord 的频道标签表示对话发生的位置。

如果运行显示意外的运行时，请首先检查所选的 provider/model 运行时策略。当注册的harness可以从配置的路线确定它时，下一回合运行时元数据包括声明的后备。它不检查凭据或启动运行时；最终route/auth准备依然可以拒绝回合。完成的结果记录了实际运行的运行时间。

## <a id="related"></a> 相关内容

- [Codex 运行环境](/plugins/codex-harness)
- [Codex harness运行时](/plugins/codex-harness-runtime)
- [GitHub Copilot 代理运行时](/plugins/copilot)
- [Muse 代码代理运行时](/plugins/muse)
- [OpenAI](/providers/openai)
- [Agent harness 插件](/plugins/sdk-agent-harness)
- [代理回路](/concepts/agent-loop)
- [模型](/concepts/models)
- [状态](/cli/status)
- [Code Mode](/tools/code-mode) — 一种实验性代理运行时功能，可自动按模型激活
- [Agent 运行时架构](/agent-runtime-architecture) — 代码布局、模块边界以及如何选择内置运行时
