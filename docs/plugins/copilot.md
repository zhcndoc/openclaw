---
summary: "通过外部 GitHub Copilot SDK harness运行 OpenClaw 嵌入式代理"
title: "Copilot SDK harness"
read_when:
  - "你想为代理使用 GitHub Copilot SDK harness"
  - "你需要 `copilot` 运行时的配置示例"
  - "你正在将代理接入订阅版 Copilot（github / openclaw / copilot），并希望它通过 Copilot CLI 运行"
---

外部 `@openclaw/copilot` 插件运行嵌入式订阅 Copilot 代理，通过 GitHub Copilot CLI （`@github/copilot-sdk`） 而不是 OpenClaw 的内置harness。 Copilot CLI 会话拥有低级代理循环：本机工具执行、本机压缩 （`infiniteSessions`） 和 `copilotHome` 下的 CLI- 托管线程状态。 OpenClaw 仍然拥有聊天通道、会话文件、模型选择、动态工具（桥接）、批准、媒体传送、可见的聊天记录、`/btw` 附带问题（请参阅 [ 附带问题 （`/btw`）](/plugins/copilot#side-questions-%2Fbtw)）和 `openclaw doctor`。

标记为顺序执行的直接桥接工具会在同一尝试中等待较早的工具调用，并延迟较晚的调用直至完成。其他工具调用可以同时运行。

对于更广泛的 model/provider/runtime 拆分，请从 [Agent 运行时](/concepts/agent-runtimes) 开始。

## <a id="requirements"></a> 要求

- 安装了 `@openclaw/copilot` 插件的 OpenClaw。
- 如果你的配置使用了 `plugins.allow`，请包含 `copilot`（插件声明的 manifest id）。针对 npm 包名 `@openclaw/copilot` 的允许列表项不会匹配，即使设置了 `agentRuntime.id: "copilot"` 也会使插件被阻止。
- A GitHub Copilot 订阅，可以驱动 Copilot CLI 或 `gitHubToken` env var / auth-profile 条目进行无头或 cron 运行。
- 一个可写的 `copilotHome` 目录。当 OpenClaw 提供 agent 目录时，默认为 `<agentDir>/copilot`，否则为 `~/.openclaw/agents/<agentId>/copilot`。

`openclaw doctor` 运行插件的 [doctor 合约 ](#doctor) 以实现会话状态所有权和未来的配置迁移。它不检查 Copilot CLI 环境。

## <a id="install"></a> 安装

Copilot 运行时作为外部插件提供，因此核心 `openclaw` 包不携带 `@github/copilot-sdk` 或其特定于平台的 `@github/copilot-sdk-<platform>-<arch>` 运行时包。在安装过程中保持启用可选依赖项，以便包含本机运行时。仅为选择此运行时的代理安装它：

```bash
openclaw plugins install @openclaw/copilot
```

当您第一次选择 `github-copilot/*` 模型 **和** 时，设置向导会自动安装该插件，您的配置会通过 `agentRuntime: { id: "copilot" }` 将该模型（或其提供者）路由到 Copilot 运行时；请参阅 [ 快速入门 ](#quickstart)。如果没有该选择，OpenClaw 将使用其内置的 GitHub Copilot 提供程序并且永远不会安装此插件。

该运行时按以下顺序解析 SDK：

1. 来自已安装的 `@openclaw/copilot` 软件包的 `import("@github/copilot-sdk")`。
2. 回退目录 `~/.openclaw/npm-runtime/copilot/`（旧版按需安装目标）。

缺少 SDK 时会出现一个错误，错误代码为 `COPILOT_SDK_MISSING`，并附带上面的重新安装命令。

## <a id="quickstart"></a> 快速开始

将一个模型（或一个 provider）固定到该 harness：

```json5
{
  agents: {
    defaults: {
      model: "github-copilot/auto",
      models: {
        "github-copilot/auto": {
          agentRuntime: { id: "copilot" },
        },
      },
    },
  },
}
```

在单个模型条目上设置 `agentRuntime.id`，即可仅将该模型路由到该 harness；或者在 provider 上设置，以路由该 provider 下的每个模型。

`github-copilot/auto` 是可移植的起点。命名的 Copilot 模型取决于账号和组织策略；在固定之前，请确认你已通过身份验证的 Copilot CLI 实际上暴露了该模型。

## <a id="supported-providers"></a> 支持的提供商

该harness支持标准 `github-copilot` 提供程序（由 `extensions/github-copilot` 所有），以及当模型具有非空 `baseUrl` 和以下 `api` 形状之一时的自定义 `models.providers` 条目：

- `anthropic-messages`
- `azure-openai-responses`
- `ollama`（OpenAI-兼容完成）
- `openai-completions`
- `openai-responses`

原生 provider id（`openai`、`anthropic`、`google`、`ollama`）仍由其原生运行时拥有。请改用不同的自定义 provider id，才能通过 Copilot BYOK 来路由端点。

Copilot BYOK 端点必须是公共 HTTPS URL。该工具为 Copilot SDK 提供每次尝试环回代理，然后通过 OpenClaw 的受保护获取路径转发提供商流量，以便 DNS 固定和 SSRF 策略仍由 OpenClaw 拥有。对本地 Ollama、LM Studio 或 LAN 模型服务器使用本机 OpenClaw 运行时。

## BYOK

Copilot BYOK 使用 SDK 的会话级自定义提供程序合约。 OpenClaw 传递已解析的模型端点、API 密钥、承载令牌模式、标头、模型 ID 和 context/output 限制；提供者传输逻辑保留在 SDK 中，而不是核心中。

```json5
{
  agents: {
    defaults: {
      model: "custom-proxy/llama-3.1-8b",
      models: {
        "custom-proxy/llama-3.1-8b": {
          agentRuntime: { id: "copilot" },
        },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      "custom-proxy": {
        baseUrl: "https://api.example.com/v1",
        apiKey: "${CUSTOM_PROXY_API_KEY}",
        api: "openai-responses",
        authHeader: true,
        models: [{ id: "llama-3.1-8b", name: "Llama 3.1 8B" }],
      },
    },
  },
}
```

BYOK 会话与订阅会话，以及与其他 BYOK 端点或凭证，分别单独标识。轮换密钥、请求头、模型或端点会启动一个新的 Copilot SDK 会话，而不是恢复不兼容的状态。

## <a id="auth"></a> 身份验证

在 `runCopilotAttempt` 中按每个 agent 应用的优先级：

1. **在 attempt 输入中显式设置 `useLoggedInUser: true`** —— 使用该 agent 的 `copilotHome` 下 Copilot CLI 已登录的用户。
2. **在 attempt 输入中显式设置 `gitHubToken`**（需要 `profileId` + `profileVersion`）。用于直接调用 CLI 和需要绕过 auth-profile 解析的测试。
3. **合约解析得到的 `resolvedApiKey` + `authProfileId`** —— 生产环境主路径。Core 在调用 harness 之前会先解析 agent 配置的 `github-copilot` auth profile（`src/infra/provider-usage.auth.ts:resolveProviderAuths`）， 因此 `github-copilot:<profile>` auth profile 可以在无头、cron 或多 profile 场景中端到端工作，而无需环境变量。
4. **Harness env-var Fallback**，按此顺序检查（第一个非空值获胜；空字符串视为不存在）。这适用于明确选择的 Copilot harness。 `github-copilot` 提供程序仅接受 `COPILOT_GITHUB_TOKEN` 作为其自动环境凭证：
   1. `OPENCLAW_GITHUB_TOKEN` —— harness 专用覆盖；可让你为 OpenClaw harness 固定一个 token，而不影响系统范围的 `gh` / Copilot CLI 配置。
   2. `COPILOT_GITHUB_TOKEN` —— 标准 Copilot SDK / CLI 环境变量。
   3. `GH_TOKEN` —— 标准 `gh` CLI 环境变量。
   4. `GITHUB_TOKEN` —— 通用 GitHub token 回退。

   合成的 pool profile id 为 `env:<NAME>`；profile version 是 token 的不可逆 sha256 指纹，因此轮换环境变量值时会干净地使客户端池失效。

5. **在没有 token 信号时的默认 `useLoggedInUser`**。

每个代理都有自己的 `copilotHome`，因此 Copilot、CLI 令牌、会话和配置永远不会在同一台计算机上的代理之间泄漏。默认值：`<agentDir>/copilot`（将 SDK 状态保留在与 OpenClaw 的 `models.json` / `openclaw-agent.sqlite` 相同的目录之外），或在未提供代理目录时保留 `~/.openclaw/agents/<agentId>/copilot`。在自定义位置（例如，用于迁移的共享安装）的尝试输入上使用 `copilotHome: <path>` 覆盖。

实时 harness 测试使用 `OPENCLAW_COPILOT_AGENT_LIVE_TOKEN` 作为直接 token。 共享的 live-test 设置会在将真实 auth profiles 暂存到隔离的测试 home 后清除 `COPILOT_GITHUB_TOKEN`、`GH_TOKEN` 和 `GITHUB_TOKEN`，因此通过专用变量传入的 `gh auth token` 值可以避免误判为跳过，同时不会泄漏到无关的测试套件中。

## <a id="configuration-surface"></a> 配置面

该 harness 从每次尝试的输入（`runCopilotAttempt({...})`）以及 `extensions/copilot/src/` 中的一小组环境默认值读取配置：

| 字段                    | 用途                                                                                                                                                                                                                                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `copilotHome`            | 每个代理的 CLI 状态目录（如上所示默认为默认值）。                                                                                                                                                                                                                                                 |
| `model`                  | 字符串或 `{ provider, id, api?, baseUrl?, headers?, authHeader? }`。若省略，则使用代理的常规模型选择；harness 会验证解析出的 provider 是否受支持。                                                                                                                   |
| `reasoningEffort`        | `"low" \| "medium" \| "high" \| "xhigh"`。 OpenClaw 的 `ThinkLevel` / `ReasoningLevel` 分辨率的地图为 `auto-reply/thinking.ts`。                                                                                                                                                          |
| `infiniteSessionConfig`  | 可选的 SDK `infiniteSessions` 块覆盖项，由 `harness.compact` 驱动。保持原样即可。                                                                                                                                                                                        |
| `hooksConfig`            | 可选的原生 Copilot SDK `SessionHooks` 配置，用于 tool/MCP、user-prompt、session 和 error 回调。它与 OpenClaw 的可移植生命周期 hooks 是分开的。                                                                                                                                   |
| `permissionPolicy`       | 可选的 SDK `onPermissionRequest` 处理器覆盖项，适用于内置 SDK 工具类型（`shell`、`write`、`read`、`url`、`mcp`、`memory`、`hook`）。默认是 `rejectAllPolicy` 作为安全兜底；参见 [Permissions and ask_user](#permissions-and-ask_user)，了解它为什么实际上从不会触发。 |
| `enableSessionTelemetry` | 可选的 SDK session telemetry 标志。                                                                                                                                                                                                                                                            |

OpenClaw 插件挂钩不需要 Copilot- 特定的尝试配置。harness通过标准harness助手运行 `before_prompt_build`、`llm_input`、`llm_output` 和 `agent_end`。成功的 SDK 压缩还运行 `before_compaction` 和 `after_compaction`。桥接的 OpenClaw 工具运行 `before_tool_call` 并报告 `after_tool_call`； `hooksConfig` 保留用于本机 SDK-only 回调，没有可移植的等效项。

OpenClaw 中没有其他内容需要了解这些字段。其他插件、通道和核心代码只会看到标准的 `AgentHarnessAttemptParams` / `AgentHarnessAttemptResult` 形状。

## <a id="compaction"></a> 压缩

当 `harness.compact` 运行时，Copilot SDK harness 会：

1. 在不继续未完成工作的情况下恢复已跟踪的 SDK 会话。
2. 调用 SDK 的会话作用域历史压缩 RPC。
3. 返回 SDK 的压缩结果，而不在工作区下写入兼容性标记文件。

OpenClaw-side 转录日志（如下）不断接收压缩后的消息，因此面向用户的聊天历史记录保持一致。

## <a id="transcript-persistence"></a> 转录持久化

`runCopilotAttempt` 为每次尝试提供一个记录日志（`extensions/copilot/src/attempt-transcript-journal.ts` 中的 `createAttemptTranscriptJournal`），将每个回合的消息保留到 OpenClaw 会话记录中。日志身份是回合范围的，而不是内容范围的：初始用户回合的密钥为 `${runId}:user`，SDK- 源事件的密钥为 `copilot-sdk:${sdkSessionId}:${eventId}`，声明的事件 ID 加上副本存储中的重复检查，因此重新发出的先前回合条目不能重复。

助理转弯及其工具结果被记录为结构完整的组，因此组之间的崩溃会留下有效的转录前缀。 `before_message_write` 挂钩可以编辑内容，但不能更改角色或工具拓扑；结构上破坏性的重写会抑制整个组，而不是持续错误的重播。

持久性失败会停止尝试。第一次写入失败标记日志失败，中止正在进行的 SDK 会话，并将尝试的重播标记为未经验证，以便下次运行创建一个新的 SDK 会话，而不是信任部分转录本。仅尽力并记录追加后的成绩单更新通知。

## <a id="side-questions-(%2Fbtw)"></a><a id="side-questions-/btw"></a> 侧边问题（`/btw`）

`/btw` 在这个 harness 中**不是**原生支持的。`createCopilotAgentHarness()` 故意将 `harness.runSideQuestion` 留空未定义 （在 `extensions/copilot/harness.test.ts` 中的 `describe("runSideQuestion")` 里有断言）， 因此 OpenClaw 的 `/btw` 分发器（`src/agents/btw.ts`）会回落到它对所有非 Codex 运行时使用的相同路径：直接用一段简短的侧边问题提示调用已配置的模型提供方，并通过 `streamSimple` 流式返回（不使用 CLI 会话，也不占用额外的池槽位）。

这使得 Copilot CLI 会话仅保留给代理的主轮次循环， 并让 `/btw` 的行为与其他非 Codex 运行时保持一致。

## <a id="doctor"></a> 医师

Copilot 插件通过其清单和 doctor 契约提供修复元数据：

- 空的 `legacyConfigRules`（目前尚无已弃用字段）。
- 无操作的 `normalizeCompatibilityConfig`（保留此项，以便未来弃用字段时在代码库中拥有稳定的归属位置）。
- 其清单声明了一个 `sessionRouteStateOwners` 条目：提供方为 `github-copilot`，运行时为 `copilot`，CLI 会话键为 `copilot`，身份验证配置文件前缀为 `github-copilot:`。

## <a id="limitations"></a> 限制

- 该 harness 声称支持 `github-copilot` 以及未被拥有的自定义 BYOK provider id。 Manifest 所拥有的原生 provider id 仍由其所属的 runtime 处理，即使将 `agentRuntime.id` 强制设为 `copilot`。
- 没有 TUI 界面；对于没有对等界面的 runtime，PI 的 TUI 仍是备用方案。
- 当 agent 切换到 `copilot` 时，PI 会话状态不会迁移。 选择按每次尝试进行；现有的 PI 会话仍然有效。
- `ask_user` 使用与 provider 无关的网关提问 runtime。Control UI 显示与其他 OpenClaw 问题相同的问题卡片，受支持的渠道会渲染选项按钮，并且下一条排队中的纯文本消息会在 SDK 请求返回前解析该网关记录。

## <a id="permissions-and-ask_user"></a> 权限和 ask_user

桥接 OpenClaw 工具的权限强制执行发生在工具包装器 **内部的**，而不是通过 SDK 的 `onPermissionRequest` 回调。 PI 使用的相同 `wrapToolWithBeforeToolCallHook` （`src/agents/agent-tools.before-tool-call.ts`） 被 `createOpenClawCodingToolsAsync` 应用到每个编码工具：循环检测、可信插件策略、工具调用前挂钩和通过网关 （`plugin.approval.request`） 的两阶段插件批准都通过与本机 PI 完全相同的代码路径运行尝试。

Copilot 工具桥返回的每个 SDK 工具都标记有：

- `overridesBuiltInTool: true` — 替换 Copilot CLI 中同名的内置工具（edit、read、write、bash、...），因此每次工具调用都会路由回 OpenClaw。
- `skipPermission: true` — 告诉 SDK 在调用该工具之前不要触发 `onPermissionRequest({kind: "custom-tool"})`。包装后的 `execute()` 已经执行了更丰富的 OpenClaw 策略检查； SDK-level 提示会短路 OpenClaw 的强制执行（全部允许）或阻止每个工具调用（全部拒绝）——两者都不匹配 PI 奇偶校验。

树内 Codex harness使用相同的拆分：桥接 OpenClaw 工具被包装 （`extensions/codex/src/app-server/dynamic-tools.ts`），并且 codex-app-server 自己的本机批准类型 （`item/commandExecution/requestApproval`、`item/fileChange/requestApproval`、`item/permissions/requestApproval`） 通过 `plugin.approval.request` 路由（`extensions/codex/src/app-server/approval-bridge.ts`）。 Copilot SDK 等效项 - `rejectAllPolicy` 拒绝任何到达 `onPermissionRequest` 的非 `custom-tool` 类型 - 是相同的安全网，并且它在实践中永远不会触发，因为 `overridesBuiltInTool: true` 取代了所有内置项。

嵌入式 Codex 和 Copilot harness共享 `buildEmbeddedAttemptToolRunContext`，用于原始客户端功能、工具绑定、发送者和角色身份、通道路由、任务建议以及允许审核批准的设备。当选择后端或恢复转弯时，这可以保持这些事实完整无缺。 `extensions/copilot/src/tool-bridge.ts` 中的 Copilot 桥在等待 `hostCapabilities.createToolSurfaceAsync` 之前添加自己的会话和工作区映射、身份验证、模型上下文和执行回调。 `runAttempt` 通过共享的 `resolveSandboxContext` 接口解析沙箱上下文，向 SDK 传递有效工作目录，并将 `sandbox` 以及子代理生成工作空间转发到工具桥中。该桥还转发它可以在 SDK 边界强制执行的有界工具构造控制：`includeCoreTools`、运行时工具白名单和 `toolConstructionPlan`。

该桥还使用 `openclaw/plugin-sdk/agent-harness-tool-runtime` 的共享harness工具表面助手来实现 PI 奇偶校验。启用工具搜索后，SDK 会看到紧凑的控制工具加上隐藏的目录执行器，而不是每个 OpenClaw 工具架构。 `before_prompt_build` 缩小目录后，共享工具搜索目录和特定于模式的调用指令进入 SDK 开发人员提示符。被拒绝的条目不会被公布，并且空目录不会添加发现指令。启用代码模式后，帮助程序将构建与其他代理工具使用的相同代码模式控制界面和目录生命周期。本地模型精益默认值、运行时兼容的模式过滤和目录清理保留在共享帮助程序中。

对于 Copilot，`tools.toolSearch.mode: "directory"` 使用结构化 `tools` 语义：使用 `tool_search` 或 `tool_describe` 进行发现，然后使用 `id` 和 `args` 通过 `dispatch_action` 执行。隐藏的 OpenClaw 目录名称未注册为 SDK 工具处理程序，无法直接调用。固定的 Copilot SDK 1.0.13 支持通过 `Tool.defer` 本地延迟已注册的工具声明；这是一个单独的 SDK 目录，而不是省略的 OpenClaw 工具的解析器。 OpenClaw 保持其紧凑的桥，而不是使用 SDK 注册每个隐藏模式。代理配置不会被重写，嵌入式harness保留其直接目录名称水合作用。

### <a id="session-level-github-token"></a> 会话级 GitHub token

Copilot SDK 合约将 **客户端级** GitHub 代币（`CopilotClientOptions.gitHubToken`，验证 CLI 进程本身）与**会话级**令牌（`SessionConfig.gitHubToken`，确定该会话的内容排除、模型路由和配额；在`createSession`和`resumeSession`上均受尊重）。该harness通过 `resolveCopilotAuth` 解析一次身份验证，并在身份验证模式为 `gitHubToken`（显式 `auth.gitHubToken` 或来自配置的 `github-copilot` 身份验证配置文件的合同解析 `resolvedApiKey`）时设置这两个字段。当解析模式为 `useLoggedInUser` 时，会话级字段被省略，因此 SDK 继续从登录身份派生身份。

`ask_user` 使用 `SessionConfig.onUserInputRequest`。桥接会将 SDK 的选择题或无选项的自由文本提示注册为网关问题；对于固定选项请求，会接受选项索引或标签；当 SDK 请求允许时，则接受自由格式的回答。中止 OpenClaw 尝试会取消网关记录，并返回一个空的 SDK 回答。

## <a id="related"></a> 相关内容

- [Agent 运行时](/concepts/agent-runtimes)
- [Codex 运行环境](/plugins/codex-harness)
- [Agent harness 插件（SDK 参考）](/plugins/sdk-agent-harness)
