---
summary: "通过外部 GitHub Copilot SDK harness 运行 OpenClaw 嵌入式 agent 轮次"
title: "Copilot SDK harness"
read_when:
  - 你想为 agent 使用 GitHub Copilot SDK harness
  - 你需要 `copilot` 运行时的配置示例
  - 你正在将 agent 接入订阅版 Copilot（github / openclaw / copilot），并希望它通过 Copilot CLI 运行
---

外部 `@openclaw/copilot` 插件让 OpenClaw 能够通过 GitHub Copilot CLI（`@github/copilot-sdk`）运行嵌入式订阅版
Copilot agent 回合，而不是使用内置的 PI harness。

当你希望 Copilot CLI 会话来负责底层 agent 循环时，请使用 Copilot SDK harness：原生工具执行、原生压缩
（`infiniteSessions`），以及由 CLI 在 `copilotHome` 下管理线程状态。
OpenClaw 仍然负责聊天通道、会话文件、模型选择、OpenClaw
动态工具（桥接）、审批、媒体传递、可见的转录
镜像、`/btw` 侧边问题（由内置的 PI 回退处理——参见
[侧边问题（`/btw`）](#side-questions-btw)），以及 `openclaw doctor`。

关于更广泛的模型 / provider / runtime 拆分，请从
[Agent runtimes](/concepts/agent-runtimes) 开始。

## Requirements

- 安装了 `@openclaw/copilot` 插件的 OpenClaw。
- 如果你的配置使用 `plugins.allow`，请包含 `copilot`（由插件声明的 manifest
  id）。如果使用 npm 风格 `@openclaw/copilot` 包名的严格
  allowlist，就会阻止该插件，运行时即使设置了 `agentRuntime.id: "copilot"` 也不会加载。
- 一个可驱动 Copilot CLI 的 GitHub Copilot 订阅（或者一个
  `gitHubToken` 环境变量 / auth-profile 条目，用于无头 / cron 运行）。
- 一个可写的 `copilotHome` 目录。如果 OpenClaw 提供了 agent 目录，harness 默认使用
  `<agentDir>/copilot`，否则对每个 agent 完全隔离时使用
  `~/.openclaw/agents/<agentId>/copilot`。

`openclaw doctor` 会运行插件的
[doctor contract](#doctor)，用于声明式会话状态所有权和未来
兼容性迁移。它不会运行 Copilot CLI 环境探测。

## 插件安装

Copilot 运行时是外部插件，因此核心 `openclaw` 包不包含
`@github/copilot-sdk` 依赖，也不包含其平台相关的
`@github/copilot-<platform>-<arch>` CLI 二进制。两者合计大约会增加
260 MB，所以只应为采用该运行时的 agent 安装它们：

```bash
openclaw plugins install @openclaw/copilot
```

当你第一次选择一个 `github-copilot/*` 模型，并且你的配置把该模型（或其
provider）通过 `agentRuntime: { id: "copilot" }` 接入 Copilot agent runtime 时，向导会安装该插件
（见下方的 [Quickstart](#quickstart)）。
如果没有显式接入，openclaw 会使用其内置的 GitHub Copilot provider，
并且不会安装该运行时插件。

该运行时按以下顺序解析 SDK：

1. 从已安装的 `@openclaw/copilot`
   包中执行 `import("@github/copilot-sdk")`。
2. 使用众所周知的回退目录 `~/.openclaw/npm-runtime/copilot/`（
   旧的按需安装目标）。

缺失 SDK 时会以单个错误暴露，错误码为 `COPILOT_SDK_MISSING`
，并提示使用上面的插件重新安装命令。

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

这两种方式等价。仅当只有该模型应该通过 harness 路由时，才在单个模型条目上使用
`agentRuntime.id`；如果某个 provider 下的所有模型都应使用它，则在 provider 上设置
`agentRuntime.id`。

`github-copilot/auto` 是可移植的起点。命名的 Copilot 模型
取决于账号和组织策略，因此只有在确认已认证的 Copilot CLI 暴露了它之后才固定其中一个。

## 支持的 provider

该 harness 声明支持规范的 `github-copilot` provider
（也就是 `extensions/github-copilot` 所拥有的同一个 id）：

- `github-copilot`

超出该集合的内容都会在 `selection.ts` 的 `auto_pi` 分支中回退到
PI。

## 认证

按每个 agent 的优先级，在 `runCopilotAttempt` 中应用：

1. **尝试输入中显式的 `useLoggedInUser: true`**。使用在该 agent 的 `copilotHome` 下解析出的 Copilot
   CLI 已登录用户。
2. **尝试输入中显式的 `gitHubToken`**（带 `profileId` +
   `profileVersion`）。适用于直接的 CLI 调用和测试，在这些场景下调用方
   希望绕过 auth-profile 解析。
3. **由契约解析得到的 `resolvedApiKey` + `authProfileId`**，来自
   `EmbeddedRunAttemptParams` 形状。这是**生产主路径**：
   核心会先通过 `src/infra/provider-usage.auth.ts:resolveProviderAuths` 解析该 agent 配置的
   `github-copilot` auth profile，然后再调用 harness，harness 会直接消费这两个字段。
   这样一来，`github-copilot:<profile>` auth profile 就能在无头 / cron / 多 profile
   场景下端到端工作，而无需环境变量。
4. **环境变量回退**，适用于未配置 auth profile 的直接 CLI / dogfood 运行。运行时按以下
   变量优先级检查，行为与已发布的 `github-copilot` provider（`extensions/github-copilot/auth.ts`）
   以及文档中的 Copilot SDK 设置保持一致：
   1. `OPENCLAW_GITHUB_TOKEN` -- harness 专用覆盖；将其设为
      可以在不干扰系统级 `gh` / Copilot CLI 配置的前提下，为 OpenClaw harness 固定一个 token。
   2. `COPILOT_GITHUB_TOKEN` -- 标准 Copilot SDK / CLI 环境变量。
   3. `GH_TOKEN` -- 标准 `gh` CLI 环境变量（与现有的
      `github-copilot` provider 优先级一致）。
   4. `GITHUB_TOKEN` -- 通用 GitHub token 回退值。

   第一个非空值获胜；空字符串会被视为
   不存在。合成的 pool profile id 为 `env:<NAME>`，`profileVersion` 是该
   token 的不可逆 sha256 指纹，因此轮换环境变量值会干净地使 client pool 失效。

5. **在没有 token 信号时的默认 `useLoggedInUser`**。

每个 agent 都会获得一个独立的 `copilotHome`，因此 Copilot CLI 的 token、会话和
配置不会在同一机器上的不同 agent 之间泄漏。默认值是
当主机向 harness 提供 agent 目录时使用 `<agentDir>/copilot`
（将 SDK 状态与同一目录中的 OpenClaw `models.json` / `auth-profiles.json` 隔离），否则使用
`~/.openclaw/agents/<agentId>/copilot`。
当你需要自定义位置时（例如迁移时使用共享挂载），可在尝试输入中用
`copilotHome: <path>` 覆盖。

Live harness tests use `OPENCLAW_COPILOT_AGENT_LIVE_TOKEN` when a direct token
is needed. The shared live-test setup intentionally scrubs `COPILOT_GITHUB_TOKEN`,
`GH_TOKEN`, and `GITHUB_TOKEN` after staging real auth profiles into the isolated
test home, so passing a `gh auth token` value through the dedicated live-test
variable avoids false skips without exposing the token to unrelated suites.

## 配置面

该 harness 从每次尝试的输入
（`runCopilotAttempt({...})`）以及 `extensions/copilot/src/` 内的一小组环境变量默认值中读取配置：

- `copilotHome` — 每个 agent 的 CLI 状态目录（默认值如上所述）。
- `model` — 字符串或 `{ provider, id, api? }`。省略时，OpenClaw 使用
  agent 的常规模型选择，harness 会验证解析出的
  provider 是否在支持集合中。
- `reasoningEffort` — `"low" | "medium" | "high" | "xhigh"`。映射自
  OpenClaw 在 `auto-reply/thinking.ts` 中的 `ThinkLevel` / `ReasoningLevel` 解析结果。
- `infiniteSessionConfig` — 可选的 SDK
  `infiniteSessions` 块覆盖，由 `harness.compact` 驱动。默认值是安全的，
  可以保持不变。
- `hooksConfig` — 可选的原生 Copilot SDK `SessionHooks` 兼容
  配置，用于 tool/MCP、user-prompt、session 和 error 回调。
  它与 OpenClaw 的可移植生命周期钩子是分开的。
- `permissionPolicy` — 可选的 SDK
  `onPermissionRequest` 处理器覆盖，用于内建 SDK 工具类型
  (`shell`, `write`, `read`, `url`, `mcp`, `memory`, `hook`)。默认
  使用 `rejectAllPolicy` 作为安全网；实际上 SDK 从不
  调用这些类型中的任何一种，因为每个桥接的 OpenClaw 工具都以
  `overridesBuiltInTool: true` 和 `skipPermission: true` 注册，因此 100% 的工具调用都通过 OpenClaw 的
  包装 `execute()`。参见 [权限和 ask_user](#permissions-and-ask_user)。
- `enableSessionTelemetry` — 可选的 SDK 会话遥测标志。

OpenClaw 插件钩子不需要 Copilot 特定的尝试配置。该
harness 会通过标准 harness helper 运行 `before_prompt_build`（以及遗留的
`before_agent_start` 兼容钩子）、`llm_input`、`llm_output` 和 `agent_end`。
成功的 SDK 压缩也会运行
`before_compaction` 和 `after_compaction`。桥接的 OpenClaw 工具会继续运行
`before_tool_call` 并报告 `after_tool_call`；`hooksConfig` 仍用于
没有可移植等价物的原生 SDK 专属回调。

OpenClaw 的其余部分都无需了解这些字段。其他插件、通道以及核心代码只会看到标准的
`AgentHarnessAttemptParams` / `AgentHarnessAttemptResult` 形状。

## 压缩

当 `harness.compact` 运行时，Copilot SDK harness 会：

1. 在不继续未完成工作的情况下恢复已跟踪的 SDK 会话。
2. 调用 SDK 的会话作用域历史压缩 RPC。
3. 返回 SDK 的压缩结果，而不在工作区下写入兼容性标记
   文件。

OpenClaw 侧的转录镜像（见下文）会继续接收
压缩后的消息，因此面向用户的聊天历史会保持一致。

## 转录镜像

`runCopilotAttempt` 会通过
`extensions/copilot/src/dual-write-transcripts.ts` 将每一轮可镜像消息双写到
OpenClaw 审计转录中。该镜像按会话范围作用（`copilot:${sessionId}`），并使用每条消息的
身份标识（`${role}:${sha256_16(role,content)}`），因此对上一轮条目的重新发送会与
现有磁盘键冲突，不会产生重复。

该镜像被两层失败隔离包裹，因此转录写入失败不会导致尝试失败：一层是内部尽力而为的包装，
另一层是尝试级别的防御性 `.catch(...)`。失败会被记录，但不会上浮。

## 侧边问题（`/btw`）

`/btw` 在该 harness 上**不是原生支持**的。`createCopilotAgentHarness()`
刻意让 `harness.runSideQuestion` 保持未定义，因此 OpenClaw 的 `/btw`
分发器（`src/agents/btw.ts`）会回退到与所有非 Codex 运行时相同的 in-tree PI 回退
路径：直接调用已配置的模型 provider，使用简短的侧边问题提示，并通过
`streamSimple` 流式返回（没有 CLI 会话，也不会占用额外的 pool 槽位）。

这使得 Copilot CLI 会话专门保留给 agent 的主回合循环，
并让 `/btw` 行为与其他基于 PI 的运行时保持一致。该契约在
[`extensions/copilot/harness.test.ts`](https://github.com/openclaw/openclaw/blob/main/extensions/copilot/harness.test.ts)
的 `describe("runSideQuestion")` 下进行了断言。

## Doctor

`extensions/copilot/doctor-contract-api.ts` 会被 `src/plugins/doctor-contract-registry.ts` 自动加载。它提供：

- 一个空的 `legacyConfigRules`（MVP 阶段没有已退休字段）。
- 一个空操作的 `normalizeCompatibilityConfig`（保留它是为了让未来字段退役时有一个稳定的树内落点）。
- 一条 `sessionRouteStateOwners` 条目，声明 provider 为 `github-copilot`；runtime 为 `copilot`；CLI session key 为 `copilot`；auth profile 前缀为 `github-copilot:`。

## 局限性

- 该 harness 在 MVP 阶段只声明支持规范的 `github-copilot` provider。
  其他 provider（BYOK 或其他）应在后续 PR 中与适配器一并交付。
- 该 harness 不提供 TUI；PI 的 TUI 不受影响，并仍然是
  对于没有同类界面的运行时的回退方案。
- 当 agent 切换到 `copilot` 时，不会迁移 PI 的会话状态。
  选择按每次尝试进行；已有的 PI 会话仍然有效。
- `ask_user` 使用与 Codex
  harness 相同的 OpenClaw 提示-回复路径。当 Copilot SDK 请求用户输入时，OpenClaw 会向活动通道/TUI 发送一个
  阻塞式提示，而下一个排队的用户
  消息会解析该 SDK 请求。

## 权限和 ask_user

桥接的 OpenClaw tools 的权限 enforcement 发生在 **tool wrapper 内部**，而不是通过 SDK 的 `onPermissionRequest` callback。与 PI 使用的同一个 `wrapToolWithBeforeToolCallHook`（`src/agents/pi-tools.before-tool-call.ts`）会被 `createOpenClawCodingTools` 应用于每个 coding tool：loop detection、trusted plugin policies、before-tool-call hooks，以及通过 gateway（`plugin.approval.request`）进行的两阶段 plugin approvals，全部都走与原生 PI attempts 完全相同的代码路径。

为了让这个 wrapper 自己做决策，从 `convertOpenClawToolToSdkTool` 返回的 SDK Tool 会被标记为：

- `overridesBuiltInTool: true` — 替换 Copilot CLI 同名的内建 tool（edit、read、write、bash，等等），从而让每次 tool invocation 都回到 OpenClaw。
- `skipPermission: true` — 告诉 SDK 在调用 tool 之前不要触发 `onPermissionRequest({kind: "custom-tool"})`。被包裹的 `execute()` 会在内部执行更丰富的 OpenClaw policy check；如果在 SDK 层面先提示，要么会绕过 OpenClaw 的 enforcement（如果我们选择全放行），要么会阻塞每一次 tool call（如果我们选择全拒绝）——这两者都不符合 PI parity。

仓内的 codex harness 也采用同样的拆分：桥接的 OpenClaw tools 会被包裹（`extensions/codex/src/app-server/dynamic-tools.ts`），而 codex-app-server 自己的原生 approval kinds（`item/commandExecution/requestApproval`、`item/fileChange/requestApproval`、`item/permissions/requestApproval`）则通过 `plugin.approval.request` 路由（`extensions/codex/src/app-server/approval-bridge.ts`）。Copilot SDK 的对应机制——对任何可能进入 `onPermissionRequest` 的非 `custom-tool` kind 使用 fail-closed 的 `rejectAllPolicy`——同样是一道安全网，而且在实践中不会触发，因为 `overridesBuiltInTool: true` 已经把每个 built-in 都挤掉了。

为了让包装后的 tool 层做出的策略决策与 PI 等价，
harness 会将完整的 PI attempt-tool 上下文转发给
`createOpenClawCodingTools` — 身份信息（`senderIsOwner`、
`memberRoleIds`、`ownerOnlyToolAllowlist`、…），通道/路由
（`groupId`、`currentChannelId`、`replyToMode`、message-tool 开关），认证
（`authProfileStore`），运行身份
（由 `sandboxSessionKey`、
`runId` 派生的 `sessionKey`/`runSessionKey`），模型上下文（`modelApi`、`modelContextWindowTokens`、
`modelCompat`、`modelHasVision`），以及运行钩子（`onToolOutcome`、
`onYield`）。如果没有这些字段，仅限所有者的 allowlist 会悄悄地
表现为默认拒绝，插件信任策略无法解析到正确作用域，而
`session_status: "current"` 会解析到过时的沙箱 key。桥接构建器位于
`extensions/copilot/src/tool-bridge.ts`，并映射 PI 的权威调用：
`src/agents/pi-embedded-runner/run/attempt.ts:1029-1117`。`runAttempt`
已经通过共享的 `resolveSandboxContext` 连接解析 sandbox 上下文，向 SDK 传递有效的工作目录，并将
`sandbox` 以及子 agent 启动工作区转发到
工具桥接中。该桥接还会转发它能在 SDK 边界执行的受限工具构建控制：`includeCoreTools`、运行时工具 allowlist，以及 `toolConstructionPlan`。

该桥接还使用来自
`openclaw/plugin-sdk/agent-harness-tool-runtime` 的共享 harness 工具面辅助实现 PI parity。启用
tool-search 时，SDK 会看到紧凑的控制工具加一个隐藏的
catalog 执行器，而不是每一个 OpenClaw 工具 schema。启用代码模式时，helper 会构建与其他 agent harness 使用的相同代码模式控制面和 catalog 生命周期。轻量本地模型默认值、
运行时兼容的 schema 过滤、目录 hydration，以及 catalog
清理都保留在共享 helper 中，这样 Copilot 和 Codex 相关
harness 就不会分叉。

### 会话级 GitHub token

Copilot SDK contract 区分 **client-level** GitHub token（`CopilotClientOptions.gitHubToken`，用于认证 CLI 进程本身）和 **session-level** token（`SessionConfig.gitHubToken`，决定该 session 的内容排除、模型路由和配额，并在 `createSession` 和 `resumeSession` 上都生效）。harness 会通过 `resolveCopilotAuth` 统一解析 auth，并在 auth mode 为 `gitHubToken` 时同时设置这两个字段（来源可以是显式的 `auth.gitHubToken`，也可以是 contract 解析得到的、来自配置好的 `github-copilot` auth profile 的 `resolvedApiKey`）。当解析后的 mode 为 `useLoggedInUser` 时，会省略 session-level 字段，这样 SDK 就会继续从已登录身份推导 identity。

`ask_user` 使用 `SessionConfig.onUserInputRequest`。该桥接支持
固定选项请求的索引或标签，在 SDK 请求允许时接受自由格式
回答，并在 OpenClaw 尝试被中止时取消挂起的请求。

## 相关

- [Agent 运行时](/concepts/agent-runtimes)
- [Codex harness](/plugins/codex-harness)
- [Agent harness 插件（SDK 参考）](/plugins/sdk-agent-harness)
