---
summary: "通过外部 GitHub Copilot SDK harness 运行 OpenClaw 嵌入式 agent 轮次"
title: "Copilot SDK harness"
read_when:
  - 你想为 agent 使用 GitHub Copilot SDK harness
  - 你需要 `copilot` 运行时的配置示例
  - 你正在将 agent 接入订阅版 Copilot（github / openclaw / copilot），并希望它通过 Copilot CLI 运行
---

外部的 `@openclaw/copilot` 插件通过 GitHub Copilot CLI（`@github/copilot-sdk`）运行嵌入式订阅版 Copilot
agent 轮次，而不是使用 OpenClaw 内置的 harness。Copilot CLI 会拥有底层的
agent 循环：原生工具执行、原生压缩（`infiniteSessions`），以及由 CLI 在
`copilotHome` 下管理的线程状态。OpenClaw 仍然负责聊天
通道、会话文件、模型选择、动态工具（桥接）、审批、
媒体传递、可见的对话镜像、`/btw` 附加问题（参见
[附加问题 (`/btw`)](#side-questions-btw)），以及 `openclaw doctor`。

关于更广泛的模型 / provider / runtime 拆分，请从
[Agent runtimes](/concepts/agent-runtimes) 开始。

## 要求

- 安装了 `@openclaw/copilot` 插件的 OpenClaw。
- 如果你的配置使用了 `plugins.allow`，请包含 `copilot`（插件声明的 manifest id）。针对 npm 包名
  `@openclaw/copilot` 的允许列表项不会匹配，即使设置了
  `agentRuntime.id: "copilot"` 也会使插件被阻止。
- 一个可以驱动 Copilot CLI 的 GitHub Copilot 订阅，或者用于无头运行或定时任务运行的
  `gitHubToken` 环境变量 / auth-profile 条目。
- 一个可写的 `copilotHome` 目录。当 OpenClaw 提供 agent 目录时，默认为 `<agentDir>/copilot`，否则为
  `~/.openclaw/agents/<agentId>/copilot`。

`openclaw doctor` 会运行插件的 [doctor contract](#doctor)，用于
session-state 所有权和未来的配置迁移。它不会探测
Copilot CLI 环境。

## 安装

Copilot 运行时作为外部插件随附，因此核心 `openclaw`
包不包含 `@github/copilot-sdk` 或其平台特定的
`@github/copilot-<platform>-<arch>` CLI 二进制文件（总计大约 260 MB）。
仅为选择启用此运行时的 agent 安装它：

```bash
openclaw plugins install @openclaw/copilot
```

设置向导会在你第一次选择
`github-copilot/*` 模型并且你的配置通过
`agentRuntime: { id: "copilot" }` 将该模型（或其提供方）路由到 Copilot 运行时时自动安装该插件；请参见
[快速开始](#quickstart)。如果没有启用该选项，OpenClaw 会使用其内置的
GitHub Copilot 提供方，并且不会安装此插件。

该运行时按以下顺序解析 SDK：

1. 来自已安装的 `@openclaw/copilot`
   包的 `import("@github/copilot-sdk")`。
2. 回退目录 `~/.openclaw/npm-runtime/copilot/`（旧版按需
   安装目标）。

缺少 SDK 时会出现一个错误，错误代码为 `COPILOT_SDK_MISSING`，并附带
上面的重新安装命令。

## 快速开始

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

在单个模型条目上设置 `agentRuntime.id`，即可仅将该模型路由到
该 harness；或者在 provider 上设置，以路由该 provider 下的每个模型。

`github-copilot/auto` 是可移植的起点。命名的 Copilot 模型取决于
账号和组织策略；在固定之前，请确认你已通过身份验证的
Copilot CLI 实际上暴露了该模型。

## 支持的 provider

harness 支持规范的 `github-copilot` provider（由
`extensions/github-copilot` 拥有），以及当
模型具有非空的 `baseUrl` 且具备以下任一 `api` 形状时的自定义 `models.providers` 条目：

- `anthropic-messages`
- `azure-openai-responses`
- `ollama`（OpenAI 兼容的 completions）
- `openai-completions`
- `openai-responses`

原生 provider id（`openai`、`anthropic`、`google`、`ollama`）仍由
其原生运行时拥有。请改用不同的自定义 provider id，才能通过 Copilot BYOK
来路由端点。

Copilot BYOK 端点必须是公开的 HTTPS URL。harness 会为 Copilot SDK 提供
每次尝试对应的 loopback 代理，然后通过 OpenClaw 的受控 fetch 路径转发 provider 流量，
从而使 DNS pinning 和 SSRF 策略仍由 OpenClaw 管理。对于本地 Ollama、LM
Studio 或局域网模型服务器，请使用原生 OpenClaw 运行时。

## BYOK

Copilot BYOK 使用 SDK 的会话级自定义提供商契约。OpenClaw
会传递解析后的模型端点、API 密钥、Bearer 令牌模式、请求头、模型
ID，以及上下文/输出限制；提供商传输逻辑保留在 SDK 中，而不是
核心中。

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

BYOK 会话与订阅会话，以及与其他
BYOK 端点或凭证，分别单独标识。轮换密钥、请求头、模型或端点
会启动一个新的 Copilot SDK 会话，而不是恢复不兼容的状态。

## 认证

在 `runCopilotAttempt` 中按每个 agent 应用的优先级：

1. **在 attempt 输入中显式设置 `useLoggedInUser: true`** —— 使用
   该 agent 的 `copilotHome` 下 Copilot CLI 已登录的用户。
2. **在 attempt 输入中显式设置 `gitHubToken`**（需要 `profileId` +
   `profileVersion`）。用于直接调用 CLI 和需要绕过 auth-profile 解析的测试。
3. **合约解析得到的 `resolvedApiKey` + `authProfileId`** —— 生产环境
   主路径。Core 在调用 harness 之前会先解析 agent 配置的
   `github-copilot` auth profile（`src/infra/provider-usage.auth.ts:resolveProviderAuths`），
   因此 `github-copilot:<profile>` auth profile 可以在无头、cron 或多 profile
   场景中端到端工作，而无需环境变量。
4. **环境变量回退**，按以下顺序检查（第一个非空值生效，空字符串视为缺失；与
   已发布的 `github-copilot` provider 优先级一致，见 `extensions/github-copilot/auth.ts`）：
   1. `OPENCLAW_GITHUB_TOKEN` —— harness 专用覆盖；可让你为 OpenClaw
      harness 固定一个 token，而不影响系统范围的 `gh` /
      Copilot CLI 配置。
   2. `COPILOT_GITHUB_TOKEN` —— 标准 Copilot SDK / CLI 环境变量。
   3. `GH_TOKEN` —— 标准 `gh` CLI 环境变量。
   4. `GITHUB_TOKEN` —— 通用 GitHub token 回退。

   合成的 pool profile id 为 `env:<NAME>`；profile version 是 token 的
   不可逆 sha256 指纹，因此轮换环境变量值时会干净地使客户端池失效。

5. **在没有 token 信号时的默认 `useLoggedInUser`**。

每个 agent 都拥有自己的 `copilotHome`，因此 Copilot CLI 的 token、会话和
配置绝不会在同一台机器上的 agent 之间泄漏。默认值：
`<agentDir>/copilot`（使 SDK 状态与 OpenClaw 的 `models.json` /
`auth-profiles.json` 不放在同一目录下），或者在未提供 agent 目录时使用
`~/.openclaw/agents/<agentId>/copilot`。
可在 attempt 输入中通过 `copilotHome: <path>` 覆盖为自定义位置（例如用于迁移的
共享挂载）。

实时 harness 测试使用 `OPENCLAW_COPILOT_AGENT_LIVE_TOKEN` 作为直接 token。
共享的 live-test 设置会在将真实 auth profiles 暂存到隔离的测试 home 后清除
`COPILOT_GITHUB_TOKEN`、`GH_TOKEN` 和 `GITHUB_TOKEN`，因此通过专用变量传入的
`gh auth token` 值可以避免误判为跳过，同时不会泄漏到无关的测试套件中。

## 配置面

该 harness 从每次尝试的输入（`runCopilotAttempt({...})`）以及 `extensions/copilot/src/` 中的一小组环境默认值读取配置：

| 字段                    | 作用                                                                                                                                                                                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `copilotHome`            | 每个代理的 CLI 状态目录（如上所示默认为默认值）。                                                                                                                                                                                                                                             |
| `model`                  | 字符串或 `{ provider, id, api?, baseUrl?, headers?, authHeader? }`。若省略，则使用代理的常规模型选择；harness 会验证解析出的 provider 是否受支持。                                                                                                                    |
| `reasoningEffort`        | `"low" \| "medium" \| "high" \| "xhigh"`。映射自 `auto-reply/thinking.ts` 中 OpenClaw 的 `ThinkLevel` / `ReasoningLevel` 解析结果。                                                                                                                                                         |
| `infiniteSessionConfig`  | 可选的 SDK `infiniteSessions` 块覆盖项，由 `harness.compact` 驱动。保持原样即可。                                                                                                                                                                                                                |
| `hooksConfig`            | 可选的原生 Copilot SDK `SessionHooks` 配置，用于 tool/MCP、user-prompt、session 和 error 回调。它与 OpenClaw 的可移植生命周期 hooks 是分开的。                                                                                                                                               |
| `permissionPolicy`       | 可选的 SDK `onPermissionRequest` 处理器覆盖项，适用于内置 SDK 工具类型（`shell`、`write`、`read`、`url`、`mcp`、`memory`、`hook`）。默认是 `rejectAllPolicy` 作为安全兜底；参见 [Permissions and ask_user](#permissions-and-ask_user)，了解它为什么实际上从不会触发。 |
| `enableSessionTelemetry` | 可选的 SDK session telemetry 标志。                                                                                                                                                                                                                                                            |

OpenClaw 插件 hooks 不需要任何 Copilot 特定的尝试配置。harness 会通过标准的 harness helpers 运行 `before_prompt_build`（以及旧版的 `before_agent_start` 兼容性 hook）、`llm_input`、`llm_output` 和 `agent_end`。成功的 SDK 压缩也会运行 `before_compaction` 和 `after_compaction`。桥接的 OpenClaw 工具会运行 `before_tool_call` 并报告 `after_tool_call`；`hooksConfig` 仍然保留给原生 SDK 专用、且没有可移植对应物的回调。

OpenClaw 中没有其他内容需要了解这些字段。其他插件、通道和核心代码只会看到标准的 `AgentHarnessAttemptParams` /
`AgentHarnessAttemptResult` 形状。

## 压缩

当 `harness.compact` 运行时，Copilot SDK harness 会：

1. 在不继续未完成工作的情况下恢复已跟踪的 SDK 会话。
2. 调用 SDK 的会话作用域历史压缩 RPC。
3. 返回 SDK 的压缩结果，而不在工作区下写入兼容性标记
   文件。

OpenClaw 端的对话记录镜像（如下）会继续接收压缩后的
消息，因此面向用户的聊天历史会保持一致。

## 转录镜像

`runCopilotAttempt` 会通过 `extensions/copilot/src/dual-write-transcripts.ts` 将每一轮可镜像的消息双写到 OpenClaw 审计转录中。该镜像按会话（`copilot:${sessionId}`）进行作用域划分，并按消息（`${role}:${sha256_16(role,content)}`）进行键控，因此重新发出的先前轮次条目会与现有磁盘键发生冲突，而不会重复创建。

镜像外层包裹了两层故障隔离，以确保转录写入失败绝不会导致尝试失败：一层是内部尽力而为的包装器，另一层是尝试级别上的防御性 `.catch(...)`。失败只会被记录，不会向外抛出。

## Side Question（`/btw`）

`/btw` 在这个 harness 中**不是**原生支持的。`createCopilotAgentHarness()`
故意将 `harness.runSideQuestion` 留空未定义
（在 `extensions/copilot/harness.test.ts` 中的 `describe("runSideQuestion")` 里有断言），
因此 OpenClaw 的 `/btw` 分发器（`src/agents/btw.ts`）会回落到
它对所有非 Codex 运行时使用的相同路径：直接用一段简短的侧边问题提示调用
已配置的模型提供方，并通过 `streamSimple` 流式返回（不使用 CLI 会话，也不占用额外的池槽位）。

这使得 Copilot CLI 会话仅保留给代理的主轮次循环，
并让 `/btw` 的行为与其他非 Codex 运行时保持一致。

## Doctor

`extensions/copilot/doctor-contract-api.ts` 会被 `src/plugins/doctor-contract-registry.ts` 自动加载。它提供：

- 一个空的 `legacyConfigRules`（目前还没有废弃字段）。
- 一个无操作的 `normalizeCompatibilityConfig`（保留它是为了让未来字段废弃时在仓库内有一个稳定的位置）。
- 一条 `sessionRouteStateOwners` 条目：provider `github-copilot`，runtime `copilot`，CLI session key `copilot`，auth profile 前缀 `github-copilot:`。

## 局限性

- 该 harness 声称 `github-copilot` 以及未拥有的自定义 BYOK provider ids。
  由 manifest 拥有的原生 provider ids 即使在 `agentRuntime.id` 被强制设为 `copilot` 时，也仍留在其所属的 runtime 上。
- 没有 TUI 界面；对于没有 peer 界面的 runtimes，PI 的 TUI 仍然是回退方案。
- 当 agent 切换到 `copilot` 时，PI 会话状态不会迁移。
  选择按每次尝试单独决定；现有的 PI 会话仍然有效。
- `ask_user` 使用与 Codex harness 相同的 OpenClaw prompt-and-reply 路径：当 Copilot SDK 请求用户输入时，OpenClaw 会向活动 channel/TUI 发布一个阻塞式提示，随后排队中的下一条用户消息会解决该 SDK 请求。

## 权限和 ask_user

桥接的 OpenClaw 工具的权限强制执行发生在**工具包装器内部**，而不是通过 SDK 的 `onPermissionRequest` 回调。PI 使用的同一个
`wrapToolWithBeforeToolCallHook`（`src/agents/agent-tools.before-tool-call.ts`）也被
`createOpenClawCodingTools` 应用于每个编码工具：循环检测、受信任的插件策略、before-tool-call 钩子，以及通过网关（`plugin.approval.request`）进行的两阶段插件审批，全部都沿着与原生 PI 尝试完全相同的代码路径运行。

Each SDK tool returned by the Copilot tool bridge is marked with:

- `overridesBuiltInTool: true` — 替换 Copilot CLI 中同名的内置工具（edit、read、write、bash、...），因此每次工具调用都会路由回 OpenClaw。
- `skipPermission: true` — 告诉 SDK 在调用工具之前不要触发 `onPermissionRequest({kind: "custom-tool"})`。包装后的 `execute()` 已经执行了更丰富的 OpenClaw 策略检查；如果在 SDK 层再弹出提示，要么会短路 OpenClaw 的强制执行（全部允许），要么会阻止每一次工具调用（全部拒绝）——这两种情况都不符合 PI 的对等行为。

树内的 Codex harness 使用相同的拆分：桥接的 OpenClaw 工具被包装（`extensions/codex/src/app-server/dynamic-tools.ts`），而 codex-app-server 自己原生的审批类型
（`item/commandExecution/requestApproval`、`item/fileChange/requestApproval`、`item/permissions/requestApproval`）则通过
`plugin.approval.request` 路由（`extensions/codex/src/app-server/approval-bridge.ts`）。Copilot SDK 的对应机制——对任何最终进入 `onPermissionRequest` 的非 `custom-tool` 类型使用 fail-closed 的 `rejectAllPolicy`——是同样的安全网，而实际上它从不会触发，因为 `overridesBuiltInTool: true` 会替换掉所有内置工具。

为了让被包装的工具层做出与 PI 等价的策略决定，harness 会将完整的 PI attempt-tool 上下文转发给
`createOpenClawCodingTools`：身份信息（`senderIsOwner`、`memberRoleIds`、`ownerOnlyToolAllowlist`、...）、频道/路由（`groupId`、
`currentChannelId`、`replyToMode`、消息工具开关）、认证（`authProfileStore`）、运行身份（由 `sandboxSessionKey`、`runId` 派生的
`sessionKey` / `runSessionKey`）、模型上下文（`modelApi`、
`modelContextWindowTokens`、`modelCompat`、`modelHasVision`）、以及运行钩子（`onToolOutcome`、`onYield`）。如果缺少这些字段，owner-only allowlist 会默认静默拒绝，插件信任策略无法解析到正确的作用域，而 `session_status: "current"` 会解析到过期的 sandbox key。桥接构建器是 `extensions/copilot/src/tool-bridge.ts`，它与 PI 的权威调用 `src/agents/embedded-agent-runner/run/attempt.ts:1262` 保持一致。`runAttempt` 通过共享的 `resolveSandboxContext` 接口解析 sandbox 上下文，向 SDK 传递有效的工作目录，并把 `sandbox` 以及子代理启动工作区转发到工具桥接中。该桥接还会转发它能在 SDK 边界强制执行的受限工具构建控制：`includeCoreTools`、运行时工具 allowlist，以及 `toolConstructionPlan`。

该桥接还使用来自
`openclaw/plugin-sdk/agent-harness-tool-runtime` 的共享 harness 工具面辅助实现 PI parity。启用
tool-search 时，SDK 会看到紧凑的控制工具加一个隐藏的
catalog 执行器，而不是每一个 OpenClaw 工具 schema。启用代码模式时，helper 会构建与其他 agent harness 使用的相同代码模式控制面和 catalog 生命周期。轻量本地模型默认值、
运行时兼容的 schema 过滤、目录 hydration，以及 catalog
清理都保留在共享 helper 中，这样 Copilot 和 Codex 相关
harness 就不会分叉。

### 会话级 GitHub token

Copilot SDK 合同区分**客户端级** GitHub token
（`CopilotClientOptions.gitHubToken`，用于认证 CLI 进程本身）
和**会话级** token（`SessionConfig.gitHubToken`，决定该会话的内容排除、模型路由和配额；在 `createSession` 和 `resumeSession` 中都会生效）。harness 只通过一次 `resolveCopilotAuth` 解析认证，并在认证模式为 `gitHubToken` 时设置这两个字段（即显式的 `auth.gitHubToken`，或者从已配置的 `github-copilot` 认证配置中由契约解析出的 `resolvedApiKey`）。当解析出的模式是 `useLoggedInUser` 时，会省略会话级字段，这样 SDK 就会继续从已登录身份中推导身份信息。

`ask_user` 使用 `SessionConfig.onUserInputRequest`。桥接会接受固定选项请求的选择索引或标签，在 SDK 请求允许自由输入时接受自由格式答案，并在 OpenClaw 尝试被中止时取消挂起的请求。

## 相关

- [Agent 运行时](/concepts/agent-runtimes)
- [Codex harness](/plugins/codex-harness)
- [Agent harness 插件（SDK 参考）](/plugins/sdk-agent-harness)
