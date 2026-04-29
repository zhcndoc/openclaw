---
summary: "从旧版向后兼容层迁移到现代插件 SDK"
title: "插件 SDK 迁移"
sidebarTitle: "迁移到 SDK"
read_when:
  - 你看到 OPENCLAW_PLUGIN_SDK_COMPAT_DEPRECATED 警告
  - 你看到 OPENCLAW_EXTENSION_API_DEPRECATED 警告
  - 你在 OpenClaw 2026.4.25 之前使用过 api.registerEmbeddedExtensionFactory
  - 你正在将插件更新到现代插件架构
  - 你维护一个外部 OpenClaw 插件
---

OpenClaw 已经从一个广泛的向后兼容层迁移到了现代插件架构，采用了聚焦且有文档说明的导入方式。如果你的插件是在新架构之前构建的，本指南将帮助你完成迁移。

## 正在发生的变化

旧的插件系统提供了两个开放面，让插件可以从单一入口导入所需的任何内容：

- **`openclaw/plugin-sdk/compat`** — 一个单一导入，重新导出了几十个辅助工具。它的引入是为了在构建新插件架构期间，让旧的基于 hook 的插件继续工作。
- **`openclaw/plugin-sdk/infra-runtime`** — 一个广泛的运行时辅助工具总入口，混合了系统事件、心跳状态、投递队列、fetch/proxy 辅助工具、文件辅助工具、审批类型以及无关的实用工具。
- **`openclaw/plugin-sdk/config-runtime`** — 一个广泛的配置兼容总入口，在迁移窗口期间仍保留了已弃用的直接加载/写入辅助工具。
- **`openclaw/extension-api`** — 一个桥接层，使插件能够直接访问宿主侧辅助工具，例如嵌入式 agent 运行器。
- **`api.registerEmbeddedExtensionFactory(...)`** — 一个已移除的仅 Pi 可用的捆绑扩展 hook，它可以观察嵌入式运行器事件，例如 `tool_result`。

这些广泛的导入面现在都已**弃用**。它们在运行时仍然可用，但新插件不得使用它们，现有插件应在下一个大版本移除它们之前完成迁移。仅 Pi 的嵌入式扩展工厂注册 API 已经被移除；请改用 tool-result 中间件。

OpenClaw 不会在引入替代方案的同一次变更中移除或重新解释已文档化的插件行为。任何破坏性契约变更都必须先经过兼容适配器、诊断、文档和弃用窗口。这适用于 SDK 导入、清单字段、设置 API、hook 以及运行时注册行为。

<Warning>
  这层向后兼容机制将在未来的大版本中移除。仍然从这些面导入的插件在那时会失效。
  仅 Pi 的嵌入式扩展工厂注册现在已经不会再加载。
</Warning>

## 为什么会这样改

旧方案带来了这些问题：

- **启动慢** — 导入一个辅助工具会加载几十个无关模块
- **循环依赖** — 广泛的重导出让创建导入循环变得很容易
- **API 面不清晰** — 无法判断哪些导出是稳定的，哪些是内部的

现代插件 SDK 解决了这些问题：每个导入路径（`openclaw/plugin-sdk/\<subpath\>`）都是一个小型、自包含的模块，具有明确用途和文档化契约。

捆绑通道的旧 provider 便利接缝也已经移除。带通道品牌的辅助接缝是私有的单仓库快捷方式，不是稳定的插件契约。请改用更窄的通用 SDK 子路径。在捆绑插件工作区内部，将 provider 自有的辅助工具保留在该插件自己的 `api.ts` 或 `runtime-api.ts` 中。

当前的捆绑 provider 示例：

- Anthropic 将 Claude 专用流式辅助工具保留在自己的 `api.ts` / `contract-api.ts` 接缝中
- OpenAI 将 provider 构建器、默认模型辅助工具以及实时 provider 构建器保留在自己的 `api.ts` 中
- OpenRouter 将 provider 构建器以及 onboarding/config 辅助工具保留在自己的 `api.ts` 中

## 兼容性政策

对于外部插件，兼容性工作遵循以下顺序：

1. 添加新的契约
2. 通过兼容适配器继续保持旧行为
3. 发出诊断或警告，说明旧路径和替代路径
4. 在测试中覆盖两条路径
5. 记录弃用和迁移路径
6. 仅在公布的迁移窗口之后才移除，通常是在某个大版本中

维护者可以使用 `pnpm plugins:boundary-report` 审核当前迁移队列。使用 `pnpm plugins:boundary-report:summary` 获取简要计数，使用 `--owner <id>` 查看单个插件或兼容性负责人，使用 `pnpm plugins:boundary-report:ci` 让 CI 在存在待处理兼容记录、跨负责人保留的 SDK 导入或未使用的保留 SDK 子路径时失败。该报告会按移除日期分组已弃用的兼容记录，统计本地代码/文档引用，展示跨负责人保留的 SDK 导入，并汇总私有内存主机 SDK 桥接，以便兼容性清理保持明确，而不是依赖临时搜索。保留的 SDK 子路径必须具有已追踪的负责人使用情况；未使用的保留辅助导出应从公共 SDK 中移除。

如果某个清单字段仍被接受，插件作者可以继续使用它，直到文档和诊断另有说明。新代码应优先使用文档化的替代方案，但现有插件在常规次版本发布期间不应被破坏。

## 如何迁移

<Steps>
  <Step title="迁移运行时配置的加载/写入辅助工具">
    捆绑插件应停止直接调用 `api.runtime.config.loadConfig()` 和
    `api.runtime.config.writeConfigFile(...)`。优先使用已经传入当前调用路径的配置。
    需要当前进程快照的长生命周期处理器可以使用 `api.runtime.config.current()`。
    长生命周期 agent 工具应在 `execute` 中使用工具上下文的 `ctx.getRuntimeConfig()`，
    这样即使某个工具是在配置写入之前创建的，也仍能看到刷新后的运行时配置。

    配置写入必须通过事务型辅助工具，并选择写后策略：

    ```typescript
    await api.runtime.config.mutateConfigFile({
      afterWrite: { mode: "auto" },
      mutate(draft) {
        draft.plugins ??= {};
      },
    });
    ```

    当调用方知道该变更需要一次干净的 gateway 重启时，请使用
    `afterWrite: { mode: "restart", reason: "..." }`；只有当调用方负责后续步骤并且明确想抑制重载规划器时，才使用
    `afterWrite: { mode: "none", reason: "..." }`。
    变更结果会包含一个用于测试和日志的类型化 `followUp` 摘要；gateway 仍负责应用或安排重启。
    在迁移窗口期间，`loadConfig` 和 `writeConfigFile` 仍作为面向外部插件的已弃用兼容辅助工具存在，并会通过
    `runtime-config-load-write` 兼容代码仅警告一次。捆绑插件和仓库运行时代码受扫描防护约束，
    分别由 `pnpm check:deprecated-internal-config-api` 和
    `pnpm check:no-runtime-action-load-config` 保护：新的生产插件用法会直接失败，直接配置写入会失败，gateway 服务器方法必须使用请求运行时快照，运行时通道的 send/action/client 辅助工具必须从其边界接收配置，长生命周期运行时模块不允许出现任何环境中的 `loadConfig()` 调用。

    新的插件代码还应避免导入宽泛的 `openclaw/plugin-sdk/config-runtime` 兼容总入口。请使用与任务匹配的窄 SDK 子路径：

    | 需求 | 导入 |
    | --- | --- |
    | `OpenClawConfig` 等配置类型 | `openclaw/plugin-sdk/config-types` |
    | 已加载配置断言和插件入口配置查找 | `openclaw/plugin-sdk/plugin-config-runtime` |
    | 当前运行时快照读取 | `openclaw/plugin-sdk/runtime-config-snapshot` |
    | 配置写入 | `openclaw/plugin-sdk/config-mutation` |
    | 会话存储辅助工具 | `openclaw/plugin-sdk/session-store-runtime` |
    | Markdown 表格配置 | `openclaw/plugin-sdk/markdown-table-runtime` |
    | 组策略运行时辅助工具 | `openclaw/plugin-sdk/runtime-group-policy` |
    | 秘密输入解析 | `openclaw/plugin-sdk/secret-input-runtime` |
    | 模型/会话覆盖 | `openclaw/plugin-sdk/model-session-runtime` |

    捆绑插件及其测试受扫描防护限制，不允许使用这个宽泛的总入口，因此导入和 mock 都保持在所需行为的本地范围内。这个宽泛总入口仍为外部兼容性而存在，但新代码不应依赖它。

  </Step>

  <Step title="将 Pi 的 tool-result 扩展迁移到中间件">
    捆绑插件必须用运行时中立的中间件替换仅 Pi 可用的
    `api.registerEmbeddedExtensionFactory(...)` tool-result 处理器。

    ```typescript
    // Pi 和 Codex 运行时动态工具
    api.registerAgentToolResultMiddleware(async (event) => {
      return compactToolResult(event);
    }, {
      runtimes: ["pi", "codex"],
    });
    ```

    同时更新插件清单：

    ```json
    {
      "contracts": {
        "agentToolResultMiddleware": ["pi", "codex"]
      }
    }
    ```

    外部插件不能注册 tool-result 中间件，因为它可以在模型看到之前重写高信任度的工具输出。

  </Step>

  <Step title="将基于审批的处理器迁移到能力事实">
    具备审批能力的通道插件现在通过 `approvalCapability.nativeRuntime` 以及共享的运行时上下文注册表暴露原生审批行为。

    关键变化：

    - 将 `approvalCapability.handler.loadRuntime(...)` 替换为 `approvalCapability.nativeRuntime`
    - 将审批特定的认证/投递逻辑从旧的 `plugin.auth` / `plugin.approvals` 绑定中移出，并迁移到 `approvalCapability`
    - `ChannelPlugin.approvals` 已从公共 channel-plugin 契约中移除；请将 delivery/native/render 字段迁移到 `approvalCapability` 上
    - `plugin.auth` 仍仅用于通道登录/登出流程；其中的审批认证 hook 不再被核心读取
    - 通过 `openclaw/plugin-sdk/channel-runtime-context` 注册通道拥有的运行时对象，例如客户端、token 或 Bolt 应用
    - 不要从原生审批处理器发送插件拥有的 reroute 通知；核心现在从实际投递结果中负责“转到其他位置”的通知
    - 在将 `channelRuntime` 传入 `createChannelManager(...)` 时，请提供真实的 `createPluginRuntime().channel` 面。部分 stub 会被拒绝

    请参阅 `/plugins/sdk-channel-plugins` 获取当前审批能力布局。

  </Step>

  <Step title="审计 Windows wrapper 回退行为">
    如果你的插件使用 `openclaw/plugin-sdk/windows-spawn`，那么未解析的 Windows
    `.cmd`/`.bat` wrapper 现在会默认失败关闭，除非你显式传入 `allowShellFallback: true`。

    ```typescript
    // 之前
    const program = applyWindowsSpawnProgramPolicy({ candidate });

    // 之后
    const program = applyWindowsSpawnProgramPolicy({
      candidate,
      // 仅当可信的兼容性调用方明确接受经由 shell 的回退时才设置此项。
      allowShellFallback: true,
    });
    ```

    如果你的调用方并不刻意依赖 shell 回退，不要设置 `allowShellFallback`，而应改为处理抛出的错误。

  </Step>

  <Step title="查找已弃用导入">
    在你的插件中搜索来自任一已弃用面导入：

    ```bash
    grep -r "plugin-sdk/compat" my-plugin/
    grep -r "plugin-sdk/infra-runtime" my-plugin/
    grep -r "plugin-sdk/config-runtime" my-plugin/
    grep -r "openclaw/extension-api" my-plugin/
    ```

  </Step>

  <Step title="替换为聚焦导入">
    旧面中的每个导出都对应一个具体的现代导入路径：

    ```typescript
    // 之前（已弃用的向后兼容层）
    import {
      createChannelReplyPipeline,
      createPluginRuntimeStore,
      resolveControlCommandGate,
    } from "openclaw/plugin-sdk/compat";

    // 之后（现代的聚焦导入）
    import { createChannelReplyPipeline } from "openclaw/plugin-sdk/channel-reply-pipeline";
    import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
    import { resolveControlCommandGate } from "openclaw/plugin-sdk/command-auth";
    ```

    对于宿主侧辅助工具，请使用注入的插件运行时，而不是直接导入：

    ```typescript
    // 之前（已弃用的 extension-api 桥接）
    import { runEmbeddedPiAgent } from "openclaw/extension-api";
    const result = await runEmbeddedPiAgent({ sessionId, prompt });

    // 之后（注入的运行时）
    const result = await api.runtime.agent.runEmbeddedPiAgent({ sessionId, prompt });
    ```

    同样的模式也适用于其他旧的桥接辅助工具：

    | 旧导入 | 现代等价项 |
    | --- | --- |
    | `resolveAgentDir` | `api.runtime.agent.resolveAgentDir` |
    | `resolveAgentWorkspaceDir` | `api.runtime.agent.resolveAgentWorkspaceDir` |
    | `resolveAgentIdentity` | `api.runtime.agent.resolveAgentIdentity` |
    | `resolveThinkingDefault` | `api.runtime.agent.resolveThinkingDefault` |
    | `resolveAgentTimeoutMs` | `api.runtime.agent.resolveAgentTimeoutMs` |
    | `ensureAgentWorkspace` | `api.runtime.agent.ensureAgentWorkspace` |
    | 会话存储辅助工具 | `api.runtime.agent.session.*` |

  </Step>

  <Step title="替换宽泛的 infra-runtime 导入">
    `openclaw/plugin-sdk/infra-runtime` 仍为外部兼容性而存在，但新代码应导入它实际需要的聚焦辅助工具面：

    | 需求 | 导入 |
    | --- | --- |
    | 系统事件队列辅助工具 | `openclaw/plugin-sdk/system-event-runtime` |
    | 心跳事件和可见性辅助工具 | `openclaw/plugin-sdk/heartbeat-runtime` |
    | 待处理投递队列清空 | `openclaw/plugin-sdk/delivery-queue-runtime` |
    | 通道活动遥测 | `openclaw/plugin-sdk/channel-activity-runtime` |
    | 内存中的去重缓存 | `openclaw/plugin-sdk/dedupe-runtime` |
    | 安全的本地文件/媒体路径辅助工具 | `openclaw/plugin-sdk/file-access-runtime` |
    | 感知调度器的 fetch | `openclaw/plugin-sdk/runtime-fetch` |
    | 代理和受控 fetch 辅助工具 | `openclaw/plugin-sdk/fetch-runtime` |
    | SSRF 调度器策略类型 | `openclaw/plugin-sdk/ssrf-dispatcher` |
    | 审批请求/解析类型 | `openclaw/plugin-sdk/approval-runtime` |
    | 审批回复载荷和命令辅助工具 | `openclaw/plugin-sdk/approval-reply-runtime` |
    | 错误格式化辅助工具 | `openclaw/plugin-sdk/error-runtime` |
    | 传输就绪等待 | `openclaw/plugin-sdk/transport-ready-runtime` |
    | 安全令牌辅助工具 | `openclaw/plugin-sdk/secure-random-runtime` |
    | 有界异步任务并发 | `openclaw/plugin-sdk/concurrency-runtime` |
    | 数值强制转换 | `openclaw/plugin-sdk/number-runtime` |
    | 进程本地异步锁 | `openclaw/plugin-sdk/async-lock-runtime` |
    | 文件锁 | `openclaw/plugin-sdk/file-lock` |

    捆绑插件受 `infra-runtime` 扫描防护限制，因此仓库代码不能退回到这个宽泛总入口。

  </Step>

  <Step title="迁移通道 route 辅助工具">
    新的通道路由代码应使用 `openclaw/plugin-sdk/channel-route`。
    较旧的 route-key 和可比较目标名称在迁移窗口期间仍保留为兼容别名，但新插件应使用能直接描述行为的 route 名称：

    | 旧辅助工具 | 现代辅助工具 |
    | --- | --- |
    | `channelRouteIdentityKey(...)` | `channelRouteDedupeKey(...)` |
    | `channelRouteKey(...)` | `channelRouteCompactKey(...)` |
    | `ComparableChannelTarget` | `ChannelRouteParsedTarget` |
    | `resolveComparableTargetForChannel(...)` | `resolveRouteTargetForChannel(...)` |
    | `resolveComparableTargetForLoadedChannel(...)` | `resolveRouteTargetForLoadedChannel(...)` |
    | `comparableChannelTargetsMatch(...)` | `channelRouteTargetsMatchExact(...)` |
    | `comparableChannelTargetsShareRoute(...)` | `channelRouteTargetsShareConversation(...)` |

    现代 route 辅助工具会在原生审批、回复抑制、入站去重、cron 投递和会话路由中一致地规范化 `{ channel, to, accountId, threadId }`。如果你的插件拥有自定义 target 语法，请使用 `resolveChannelRouteTargetWithParser(...)` 将该解析器适配到相同的 route target 契约中。

  </Step>

  <Step title="构建并测试">
    ```bash
    pnpm build
    pnpm test -- my-plugin/
    ```
  </Step>
</Steps>

## 导入路径参考

<Accordion title="常见导入路径表">
  | 导入路径 | 用途 | 关键导出 |
  | --- | --- | --- |
  | `plugin-sdk/plugin-entry` | 标准插件入口辅助工具 | `definePluginEntry` |
  | `plugin-sdk/core` | 用于通道入口定义/构建器的旧式总导出 | `defineChannelPluginEntry`, `createChatChannelPlugin` |
  | `plugin-sdk/config-schema` | 根配置 schema 导出 | `OpenClawSchema` |
  | `plugin-sdk/provider-entry` | 单 provider 入口辅助工具 | `defineSingleProviderPluginEntry` |
  | `plugin-sdk/channel-core` | 聚焦的通道入口定义与构建器 | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
  | `plugin-sdk/setup` | 共享设置向导辅助工具 | Allowlist 提示、设置状态构建器 |
  | `plugin-sdk/setup-runtime` | 设置阶段运行时辅助工具 | 导入安全的设置补丁适配器、lookup-note 辅助工具、`promptResolvedAllowFrom`、`splitSetupEntries`、委托设置代理 |
  | `plugin-sdk/setup-adapter-runtime` | 设置适配器辅助工具 | `createEnvPatchedAccountSetupAdapter` |
  | `plugin-sdk/setup-tools` | 设置工具辅助工具 | `formatCliCommand`、`detectBinary`、`extractArchive`、`resolveBrewExecutable`、`formatDocsLink`、`CONFIG_DIR` |
  | `plugin-sdk/account-core` | 多账户辅助工具 | 账户列表/配置/动作门控辅助工具 |
  | `plugin-sdk/account-id` | 账户 ID 辅助工具 | `DEFAULT_ACCOUNT_ID`、账户 ID 规范化 |
  | `plugin-sdk/account-resolution` | 账户查找辅助工具 | 账户查找 + 默认回退辅助工具 |
  | `plugin-sdk/account-helpers` | 窄账户辅助工具 | 账户列表/账户动作辅助工具 |
  | `plugin-sdk/channel-setup` | 设置向导适配器 | `createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`、`createOptionalChannelSetupWizard`，以及 `DEFAULT_ACCOUNT_ID`、`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled`、`splitSetupEntries` |
  | `plugin-sdk/channel-pairing` | DM 配对原语 | `createChannelPairingController` |
  | `plugin-sdk/channel-reply-pipeline` | 回复前缀、typing 和源投递绑定 | `createChannelReplyPipeline`、`resolveChannelSourceReplyDeliveryMode` |
  | `plugin-sdk/channel-config-helpers` | 配置适配器工厂 | `createHybridChannelConfigAdapter` |
  | `plugin-sdk/channel-config-schema` | 配置 schema 构建器 | 共享的通道配置 schema 原语以及通用构建器 |
  | `plugin-sdk/bundled-channel-config-schema` | 捆绑配置 schema | 仅限 OpenClaw 维护的捆绑插件；新插件必须定义插件本地 schema |
  | `plugin-sdk/channel-config-schema-legacy` | 已弃用的捆绑配置 schema | 仅作为兼容别名；维护中的捆绑插件请使用 `plugin-sdk/bundled-channel-config-schema` |
  | `plugin-sdk/telegram-command-config` | Telegram 命令配置辅助工具 | 命令名规范化、描述裁剪、重复/冲突校验 |
  | `plugin-sdk/channel-policy` | 组/DM 策略解析 | `resolveChannelGroupRequireMention` |
  | `plugin-sdk/channel-lifecycle` | 账户状态和草稿流生命周期辅助工具 | `createAccountStatusSink`、草稿预览完成辅助工具 |
  | `plugin-sdk/inbound-envelope` | 入站信封辅助工具 | 共享 route + envelope 构建器辅助工具 |
  | `plugin-sdk/inbound-reply-dispatch` | 入站回复辅助工具 | 共享记录并分发辅助工具 |
  | `plugin-sdk/messaging-targets` | 消息 target 解析 | target 解析/匹配辅助工具 |
  | `plugin-sdk/outbound-media` | 出站媒体辅助工具 | 共享出站媒体加载 |
  | `plugin-sdk/outbound-send-deps` | 出站发送依赖辅助工具 | 不导入完整出站运行时的轻量级 `resolveOutboundSendDep` 查找 |
  | `plugin-sdk/outbound-runtime` | 出站运行时辅助工具 | 出站投递、身份/发送委托、会话、格式化和载荷规划辅助工具 |
  | `plugin-sdk/thread-bindings-runtime` | 线程绑定辅助工具 | 线程绑定生命周期和适配器辅助工具 |
  | `plugin-sdk/agent-media-payload` | 旧式媒体载荷辅助工具 | 用于旧字段布局的 agent 媒体载荷构建器 |
  | `plugin-sdk/channel-runtime` | 已弃用的兼容 shim | 仅限旧式通道运行时实用工具 |
  | `plugin-sdk/channel-send-result` | 发送结果类型 | 回复结果类型 |
  | `plugin-sdk/runtime-store` | 持久化插件存储 | `createPluginRuntimeStore` |
  | `plugin-sdk/runtime` | 广泛的运行时辅助工具 | 运行时/日志/备份/插件安装辅助工具 |
  | `plugin-sdk/runtime-env` | 窄运行时环境辅助工具 | logger/运行时环境、超时、重试和退避辅助工具 |
  | `plugin-sdk/plugin-runtime` | 共享插件运行时辅助工具 | 插件命令/hook/http/交互辅助工具 |
  | `plugin-sdk/hook-runtime` | hook 管道辅助工具 | 共享 webhook/内部 hook 管道辅助工具 |
  | `plugin-sdk/lazy-runtime` | 懒加载运行时辅助工具 | `createLazyRuntimeModule`、`createLazyRuntimeMethod`、`createLazyRuntimeMethodBinder`、`createLazyRuntimeNamedExport`、`createLazyRuntimeSurface` |
  | `plugin-sdk/process-runtime` | 进程辅助工具 | 共享 exec 辅助工具 |
  | `plugin-sdk/cli-runtime` | CLI 运行时辅助工具 | 命令格式化、等待、版本辅助工具 |
  | `plugin-sdk/gateway-runtime` | gateway 辅助工具 | gateway 客户端和通道状态补丁辅助工具 |
  | `plugin-sdk/config-runtime` | 已弃用的配置兼容 shim | 请优先使用 `config-types`、`plugin-config-runtime`、`runtime-config-snapshot` 和 `config-mutation` |
  | `plugin-sdk/telegram-command-config` | Telegram 命令辅助工具 | 当捆绑的 Telegram 契约面不可用时，提供稳定回退的 Telegram 命令校验辅助工具 |
  | `plugin-sdk/approval-runtime` | 审批提示辅助工具 | exec/plugin 审批载荷、审批能力/配置文件辅助工具、原生审批路由/运行时辅助工具，以及结构化审批显示路径格式化 |
  | `plugin-sdk/approval-auth-runtime` | 审批认证辅助工具 | 审批人解析、同聊动作认证 |
  | `plugin-sdk/approval-client-runtime` | 审批客户端辅助工具 | 原生 exec 审批配置文件/过滤辅助工具 |
  | `plugin-sdk/approval-delivery-runtime` | 审批投递辅助工具 | 原生审批能力/投递适配器 |
  | `plugin-sdk/approval-gateway-runtime` | 审批 gateway 辅助工具 | 共享审批 gateway 解析辅助工具 |
  | `plugin-sdk/approval-handler-adapter-runtime` | 审批适配器辅助工具 | 用于热通道入口点的轻量级原生审批适配器加载辅助工具 |
  | `plugin-sdk/approval-handler-runtime` | 审批处理器辅助工具 | 更广泛的审批处理器运行时辅助工具；当较窄的适配器/gateway 接缝已足够时，请优先使用它们 |
  | `plugin-sdk/approval-native-runtime` | 审批 target 辅助工具 | 原生审批 target/账户绑定辅助工具 |
  | `plugin-sdk/approval-reply-runtime` | 审批回复辅助工具 | exec/plugin 审批回复载荷辅助工具 |
  | `plugin-sdk/channel-runtime-context` | 通道运行时上下文辅助工具 | 通用通道运行时上下文注册/获取/观察辅助工具 |
  | `plugin-sdk/security-runtime` | 安全辅助工具 | 共享信任、DM 门控、外部内容和秘密收集辅助工具 |
  | `plugin-sdk/ssrf-policy` | SSRF 策略辅助工具 | 主机 allowlist 和私有网络策略辅助工具 |
  | `plugin-sdk/ssrf-runtime` | SSRF 运行时辅助工具 | 固定调度器、受控 fetch、SSRF 策略辅助工具 |
  | `plugin-sdk/system-event-runtime` | 系统事件辅助工具 | `enqueueSystemEvent`、`peekSystemEventEntries` |
  | `plugin-sdk/heartbeat-runtime` | 心跳辅助工具 | 心跳事件和可见性辅助工具 |
  | `plugin-sdk/delivery-queue-runtime` | 投递队列辅助工具 | `drainPendingDeliveries` |
  | `plugin-sdk/channel-activity-runtime` | 通道活动辅助工具 | `recordChannelActivity` |
  | `plugin-sdk/dedupe-runtime` | 去重辅助工具 | 内存中的去重缓存 |
  | `plugin-sdk/file-access-runtime` | 文件访问辅助工具 | 安全的本地文件/媒体路径辅助工具 |
  | `plugin-sdk/transport-ready-runtime` | 传输就绪辅助工具 | `waitForTransportReady` |
  | `plugin-sdk/collection-runtime` | 有界缓存辅助工具 | `pruneMapToMaxSize` |
  | `plugin-sdk/diagnostic-runtime` | 诊断门控辅助工具 | `isDiagnosticFlagEnabled`、`isDiagnosticsEnabled` |
  | `plugin-sdk/error-runtime` | 错误格式化辅助工具 | `formatUncaughtError`、`isApprovalNotFoundError`、错误图辅助工具 |
  | `plugin-sdk/fetch-runtime` | 封装的 fetch/proxy 辅助工具 | `resolveFetch`、proxy 辅助工具、EnvHttpProxyAgent 选项辅助工具 |
  | `plugin-sdk/host-runtime` | 主机规范化辅助工具 | `normalizeHostname`、`normalizeScpRemoteHost` |
  | `plugin-sdk/retry-runtime` | 重试辅助工具 | `RetryConfig`、`retryAsync`、策略运行器 |
  | `plugin-sdk/allow-from` | allowlist 格式化 | `formatAllowFromLowercase` |
  | `plugin-sdk/allowlist-resolution` | allowlist 输入映射 | `mapAllowlistResolutionInputs` |
  | `plugin-sdk/command-auth` | 命令门控和命令面辅助工具 | `resolveControlCommandGate`、发送方授权辅助工具、命令注册表辅助工具，包括动态参数菜单格式化 |
  | `plugin-sdk/command-status` | 命令状态/帮助渲染器 | `buildCommandsMessage`、`buildCommandsMessagePaginated`、`buildHelpMessage` |
  | `plugin-sdk/secret-input` | 秘密输入解析 | 秘密输入辅助工具 |
  | `plugin-sdk/webhook-ingress` | webhook 请求辅助工具 | webhook target 实用工具 |
  | `plugin-sdk/webhook-request-guards` | webhook 正文守卫辅助工具 | 请求正文读取/限制辅助工具 |
  | `plugin-sdk/reply-runtime` | 共享回复运行时 | 入站分发、心跳、回复规划器、分块 |
  | `plugin-sdk/reply-dispatch-runtime` | 窄回复分发辅助工具 | finalize、provider 分发以及会话标签辅助工具 |
  | `plugin-sdk/reply-history` | 回复历史辅助工具 | `buildHistoryContext`、`buildPendingHistoryContextFromMap`、`recordPendingHistoryEntry`、`clearHistoryEntriesIfEnabled` |
  | `plugin-sdk/reply-reference` | 回复引用规划 | `createReplyReferencePlanner` |
  | `plugin-sdk/reply-chunking` | 回复分块辅助工具 | 文本/markdown 分块辅助工具 |
  | `plugin-sdk/session-store-runtime` | 会话存储辅助工具 | 存储路径 + updated-at 辅助工具 |
  | `plugin-sdk/state-paths` | 状态路径辅助工具 | 状态和 OAuth 目录辅助工具 |
  | `plugin-sdk/routing` | 路由/会话键辅助工具 | `resolveAgentRoute`、`buildAgentSessionKey`、`resolveDefaultAgentBoundAccountId`、会话键规范化辅助工具 |
  | `plugin-sdk/status-helpers` | 通道状态辅助工具 | 通道/账户状态摘要构建器、运行时状态默认值、问题元数据辅助工具 |
  | `plugin-sdk/target-resolver-runtime` | target 解析器辅助工具 | 共享 target 解析器辅助工具 |
  | `plugin-sdk/string-normalization-runtime` | 字符串规范化辅助工具 | slug/字符串规范化辅助工具 |
  | `plugin-sdk/request-url` | 请求 URL 辅助工具 | 从类请求输入中提取字符串 URL |
  | `plugin-sdk/run-command` | 定时命令辅助工具 | 带规范化 stdout/stderr 的定时命令运行器 |
  | `plugin-sdk/param-readers` | 参数读取器 | 通用工具/CLI 参数读取器 |
  | `plugin-sdk/tool-payload` | 工具载荷提取 | 从工具结果对象中提取规范化载荷 |
  | `plugin-sdk/tool-send` | 工具发送提取 | 从工具参数中提取规范化发送目标字段 |
  | `plugin-sdk/temp-path` | 临时路径辅助工具 | 共享临时下载路径辅助工具 |
  | `plugin-sdk/logging-core` | 日志辅助工具 | 子系统 logger 和脱敏辅助工具 |
  | `plugin-sdk/markdown-table-runtime` | Markdown 表格辅助工具 | Markdown 表格模式辅助工具 |
  | `plugin-sdk/reply-payload` | 消息回复类型 | 回复载荷类型 |
  | `plugin-sdk/provider-setup` | 精选的本地/自托管 provider 设置辅助工具 | 自托管 provider 发现/config 辅助工具 |
  | `plugin-sdk/self-hosted-provider-setup` | 聚焦的 OpenAI 兼容自托管 provider 设置辅助工具 | 相同的自托管 provider 发现/config 辅助工具 |
  | `plugin-sdk/provider-auth-runtime` | provider 运行时认证辅助工具 | 运行时 API key 解析辅助工具 |
  | `plugin-sdk/provider-auth-api-key` | provider API key 设置辅助工具 | API key onboarding/profile-write 辅助工具 |
  | `plugin-sdk/provider-auth-result` | provider 认证结果辅助工具 | 标准 OAuth 认证结果构建器 |
  | `plugin-sdk/provider-auth-login` | provider 交互式登录辅助工具 | 共享交互式登录辅助工具 |
  | `plugin-sdk/provider-selection-runtime` | provider 选择辅助工具 | 已配置或自动 provider 选择以及原始 provider 配置合并 |
  | `plugin-sdk/provider-env-vars` | provider 环境变量辅助工具 | provider 认证环境变量查找辅助工具 |
  | `plugin-sdk/provider-model-shared` | 共享 provider 模型/重放辅助工具 | `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共享重放策略构建器、provider 端点辅助工具以及模型 ID 规范化辅助工具 |
  | `plugin-sdk/provider-catalog-shared` | 共享 provider 目录辅助工具 | `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`buildManifestModelProviderConfig`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` |
  | `plugin-sdk/provider-onboard` | provider onboarding 补丁 | onboarding config 辅助工具 |
  | `plugin-sdk/provider-http` | provider HTTP 辅助工具 | 通用 provider HTTP/端点能力辅助工具，包括音频转录 multipart form 辅助工具 |
  | `plugin-sdk/provider-web-fetch` | provider web-fetch 辅助工具 | web-fetch provider 注册/缓存辅助工具 |
  | `plugin-sdk/provider-web-search-config-contract` | provider web-search config 辅助工具 | 适用于不需要插件启用绑定的 provider 的窄 web-search config/credential 辅助工具 |
  | `plugin-sdk/provider-web-search-contract` | provider web-search 契约辅助工具 | 窄 web-search config/credential 契约辅助工具，例如 `createWebSearchProviderContractFields`、`enablePluginInConfig`、`resolveProviderWebSearchPluginConfig` 以及作用域化的 credential 设置/获取器 |
  | `plugin-sdk/provider-web-search` | provider web-search 辅助工具 | web-search provider 注册/缓存/运行时辅助工具 |
  | `plugin-sdk/provider-tools` | provider 工具/schema 兼容辅助工具 | `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks`、Gemini schema 清理 + 诊断，以及 xAI 兼容辅助工具，如 `resolveXaiModelCompatPatch` / `applyXaiModelCompat` |
  | `plugin-sdk/provider-usage` | provider 使用情况辅助工具 | `fetchClaudeUsage`、`fetchGeminiUsage`、`fetchGithubCopilotUsage`，以及其他 provider 使用情况辅助工具 |
  | `plugin-sdk/provider-stream` | provider 流包装器辅助工具 | `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、流包装器类型，以及共享 Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包装器辅助工具 |
  | `plugin-sdk/provider-transport-runtime` | provider 传输辅助工具 | 原生 provider 传输辅助工具，例如受控 fetch、传输消息变换以及可写传输事件流 |
  | `plugin-sdk/keyed-async-queue` | 有序异步队列 | `KeyedAsyncQueue` |
  | `plugin-sdk/media-runtime` | 共享媒体辅助工具 | 媒体 fetch/transform/store 辅助工具、基于 ffprobe 的视频尺寸探测以及媒体载荷构建器 |
  | `plugin-sdk/media-generation-runtime` | 共享媒体生成辅助工具 | 共享失败转移辅助工具、候选项选择以及图像/视频/音乐生成的缺失模型消息 |
  | `plugin-sdk/media-understanding` | 媒体理解辅助工具 | 媒体理解 provider 类型以及面向 provider 的图像/音频辅助导出 |
  | `plugin-sdk/text-runtime` | 共享文本辅助工具 | 去除对 assistant 可见文本、markdown 渲染/分块/表格辅助工具、脱敏辅助工具、directive-tag 辅助工具、安全文本工具以及相关文本/日志辅助工具 |
  | `plugin-sdk/text-chunking` | 文本分块辅助工具 | 出站文本分块辅助工具 |
  | `plugin-sdk/speech` | 语音辅助工具 | 语音 provider 类型以及面向 provider 的 directive、注册表、校验辅助工具和 OpenAI 兼容 TTS 构建器 |
  | `plugin-sdk/speech-core` | 共享语音核心 | 语音 provider 类型、注册表、directive、规范化 |
  | `plugin-sdk/realtime-transcription` | 实时转录辅助工具 | provider 类型、注册表辅助工具和共享 WebSocket 会话辅助工具 |
  | `plugin-sdk/realtime-voice` | 实时语音辅助工具 | provider 类型、注册表/解析辅助工具和桥接会话辅助工具 |
  | `plugin-sdk/image-generation` | 图像生成辅助工具 | 图像生成 provider 类型以及图像资产/data URL 辅助工具和 OpenAI 兼容图像 provider 构建器 |
  | `plugin-sdk/image-generation-core` | 共享图像生成核心 | 图像生成类型、失败转移、认证和注册表辅助工具 |
  | `plugin-sdk/music-generation` | 音乐生成辅助工具 | 音乐生成 provider/请求/结果类型 |
  | `plugin-sdk/music-generation-core` | 共享音乐生成核心 | 音乐生成类型、失败转移辅助工具、provider 查找和 model-ref 解析 |
  | `plugin-sdk/video-generation` | 视频生成辅助工具 | 视频生成 provider/请求/结果类型 |
  | `plugin-sdk/video-generation-core` | 共享视频生成核心 | 视频生成类型、失败转移辅助工具、provider 查找和 model-ref 解析 |
  | `plugin-sdk/interactive-runtime` | 交互式回复辅助工具 | 交互式回复载荷规范化/归约 |
  | `plugin-sdk/channel-config-primitives` | 通道配置原语 | 窄通道配置 schema 原语 |
  | `plugin-sdk/channel-config-writes` | 通道配置写入辅助工具 | 通道配置写入授权辅助工具 |
  | `plugin-sdk/channel-plugin-common` | 共享通道前导 | 共享通道插件前导导出 |
  | `plugin-sdk/channel-status` | 通道状态辅助工具 | 共享通道状态快照/摘要辅助工具 |
  | `plugin-sdk/allowlist-config-edit` | Allowlist config 辅助工具 | allowlist config 编辑/读取辅助工具 |
  | `plugin-sdk/group-access` | 组访问辅助工具 | 共享组访问决策辅助工具 |
  | `plugin-sdk/direct-dm` | 直接 DM 辅助工具 | 共享直接 DM 认证/守卫辅助工具 |
  | `plugin-sdk/extension-shared` | 共享扩展辅助工具 | 被动通道/状态和环境代理辅助原语 |
  | `plugin-sdk/webhook-targets` | webhook target 辅助工具 | webhook target 注册表和 route 安装辅助工具 |
  | `plugin-sdk/webhook-path` | webhook 路径辅助工具 | webhook 路径规范化辅助工具 |
  | `plugin-sdk/web-media` | 共享 web 媒体辅助工具 | 远程/本地媒体加载辅助工具 |
  | `plugin-sdk/zod` | Zod 重导出 | 为 plugin SDK 使用者重导出的 `zod` |
  | `plugin-sdk/memory-core` | 捆绑 memory-core 辅助工具 | 内存管理器/config/file/CLI 辅助工具面 |
  | `plugin-sdk/memory-core-engine-runtime` | 内存引擎运行时外观 | 内存索引/搜索运行时外观 |
  | `plugin-sdk/memory-core-host-engine-foundation` | 内存主机基础引擎 | 内存主机基础引擎导出 |
  | `plugin-sdk/memory-core-host-engine-embeddings` | 内存主机 embedding 引擎 | 内存 embedding 契约、注册表访问、本地 provider 和通用批处理/远程辅助工具；具体远程 provider 位于其所属插件中 |
  | `plugin-sdk/memory-core-host-engine-qmd` | 内存主机 QMD 引擎 | 内存主机 QMD 引擎导出 |
  | `plugin-sdk/memory-core-host-engine-storage` | 内存主机存储引擎 | 内存主机存储引擎导出 |
  | `plugin-sdk/memory-core-host-multimodal` | 内存主机多模态辅助工具 | 内存主机多模态辅助工具 |
  | `plugin-sdk/memory-core-host-query` | 内存主机查询辅助工具 | 内存主机查询辅助工具 |
  | `plugin-sdk/memory-core-host-secret` | 内存主机秘密辅助工具 | 内存主机秘密辅助工具 |
  | `plugin-sdk/memory-core-host-events` | 内存主机事件日志辅助工具 | 内存主机事件日志辅助工具 |
  | `plugin-sdk/memory-core-host-status` | 内存主机状态辅助工具 | 内存主机状态辅助工具 |
  | `plugin-sdk/memory-core-host-runtime-cli` | 内存主机 CLI 运行时 | 内存主机 CLI 运行时辅助工具 |
  | `plugin-sdk/memory-core-host-runtime-core` | 内存主机核心运行时 | 内存主机核心运行时辅助工具 |
  | `plugin-sdk/memory-core-host-runtime-files` | 内存主机文件/运行时辅助工具 | 内存主机文件/运行时辅助工具 |
  | `plugin-sdk/memory-host-core` | 内存主机核心运行时别名 | 内存主机核心运行时辅助工具的厂商无关别名 |
  | `plugin-sdk/memory-host-events` | 内存主机事件日志别名 | 内存主机事件日志辅助工具的厂商无关别名 |
  | `plugin-sdk/memory-host-files` | 内存主机文件/运行时别名 | 内存主机文件/运行时辅助工具的厂商无关别名 |
  | `plugin-sdk/memory-host-markdown` | 托管 markdown 辅助工具 | 面向内存相关插件的共享托管 markdown 辅助工具 |
  | `plugin-sdk/memory-host-search` | 活跃内存搜索外观 | 懒加载的活跃内存搜索管理器运行时外观 |
  | `plugin-sdk/memory-host-status` | 内存主机状态别名 | 内存主机状态辅助工具的厂商无关别名 |
  | `plugin-sdk/testing` | 测试工具 | 旧的宽泛兼容总入口；优先使用聚焦测试子路径，例如 `plugin-sdk/plugin-test-runtime`、`plugin-sdk/channel-test-helpers`、`plugin-sdk/channel-target-testing`、`plugin-sdk/test-env` 和 `plugin-sdk/test-fixtures` |
</Accordion>

此表有意只包含常见迁移子集，而不是完整的 SDK 面。完整的 200+ 个入口点列表位于 `scripts/lib/plugin-sdk-entrypoints.json`。

已保留的捆绑插件辅助接缝已从公共 SDK 导出映射中移除，除了明确文档化的兼容外观，例如为已发布的 `@openclaw/discord@2026.3.13` 包保留的已弃用 `plugin-sdk/discord` shim。特定 owner 的辅助工具保留在所属插件包内部；共享宿主行为应通过通用 SDK 契约迁移，例如 `plugin-sdk/gateway-runtime`、`plugin-sdk/security-runtime` 和 `plugin-sdk/plugin-config-runtime`。

请使用最符合任务的最窄导入。如果找不到某个导出，请检查 `src/plugin-sdk/` 下的源代码，或者询问维护者它应该归属哪个通用契约。

## 当前弃用项

下面这些更窄的弃用项适用于整个 plugin SDK、provider 契约、运行时面和清单。它们现在仍然可用，但会在未来的大版本中移除。每一项下面的条目都会把旧 API 映射到其标准替代项。

<AccordionGroup>
  <Accordion title="command-auth 帮助构建器 → command-status">
    **旧（`openclaw/plugin-sdk/command-auth`）**：`buildCommandsMessage`、
    `buildCommandsMessagePaginated`、`buildHelpMessage`。

    **新（`openclaw/plugin-sdk/command-status`）**：签名相同，导出相同——只是从更窄的子路径导入。`command-auth`
    通过兼容 stub 重新导出它们。

    ```typescript
    // 之前
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-auth";

    // 之后
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-status";
    ```

  </Accordion>

  <Accordion title="提及门控辅助工具 → resolveInboundMentionDecision">
    **旧**：来自 `openclaw/plugin-sdk/channel-inbound` 或
    `openclaw/plugin-sdk/channel-mention-gating` 的
    `resolveInboundMentionRequirement({ facts, policy })` 和
    `shouldDropInboundForMention(...)`。

    **新**：`resolveInboundMentionDecision({ facts, policy })` —— 返回一个单独的决策对象，而不是两个拆分调用。

    下游通道插件（Slack、Discord、Matrix、MS Teams）已经切换完成。

  </Accordion>

  <Accordion title="Channel runtime shim 和 channel actions 辅助工具">
    `openclaw/plugin-sdk/channel-runtime` 是为旧通道插件提供的兼容 shim。不要在新代码中导入它；请使用
    `openclaw/plugin-sdk/channel-runtime-context` 来注册运行时对象。

    `openclaw/plugin-sdk/channel-actions` 中的 `channelActions*` 辅助工具与原始的 "actions" 通道导出一起已弃用。
    请改为通过语义化的 `presentation` 面暴露能力——通道插件声明它们渲染什么（cards、buttons、selects），而不是它们接受哪些原始 action 名称。

  </Accordion>

  <Accordion title="Web search provider tool() 辅助工具 → 插件上的 createTool()">
    **旧**：来自 `openclaw/plugin-sdk/provider-web-search` 的 `tool()` 工厂。

    **新**：直接在 provider 插件上实现 `createTool(...)`。
    OpenClaw 不再需要 SDK 辅助工具来注册工具包装器。

  </Accordion>

  <Accordion title="纯文本通道信封 → BodyForAgent">
    **旧**：`formatInboundEnvelope(...)`（以及
    `ChannelMessageForAgent.channelEnvelope`），用于从入站通道消息构建扁平的纯文本 prompt 信封。

    **新**：`BodyForAgent` 加上结构化的用户上下文块。通道插件将路由元数据（线程、主题、回复对象、反应）作为带类型的字段附加，而不是把它们拼接进 prompt 字符串。`formatAgentEnvelope(...)` 辅助工具仍支持为生成的面向 assistant 的信封使用，但入站纯文本信封正在退出。

    受影响的区域：`inbound_claim`、`message_received`，以及任何对 `channelEnvelope` 文本进行后处理的自定义通道插件。

  </Accordion>

  <Accordion title="Provider 发现类型 → provider catalog 类型">
    下面四个发现类型别名现在都是 catalog 时代类型的薄包装：

    | 旧别名                 | 新类型                  |
    | ---------------------- | ----------------------- |
    | `ProviderDiscoveryOrder`  | `ProviderCatalogOrder`    |
    | `ProviderDiscoveryContext`| `ProviderCatalogContext`  |
    | `ProviderDiscoveryResult` | `ProviderCatalogResult`   |
    | `ProviderPluginDiscovery` | `ProviderPluginCatalog`   |

    另外还有旧的 `ProviderCapabilities` 静态集合——provider 插件应使用显式的 provider hooks，例如 `buildReplayPolicy`、
    `normalizeToolSchemas` 和 `wrapStreamFn`，而不是静态对象。

  </Accordion>

  <Accordion title="Thinking policy hooks → resolveThinkingProfile">
    **旧**（`ProviderThinkingPolicy` 上的三个独立 hook）：
    `isBinaryThinking(ctx)`、`supportsXHighThinking(ctx)` 和
    `resolveDefaultThinkingLevel(ctx)`。

    **新**：单个 `resolveThinkingProfile(ctx)`，返回一个带有标准 `id`、可选 `label` 和分级 level 列表的 `ProviderThinkingProfile`。OpenClaw 会根据 profile 等级自动降级陈旧的存储值。

    请实现一个 hook，而不是三个。旧 hook 在弃用窗口期间仍可工作，但不会与 profile 结果组合。

  </Accordion>

  <Accordion title="外部 OAuth provider 回退 → contracts.externalAuthProviders">
    **旧**：在没有在插件清单中声明该 provider 的情况下实现 `resolveExternalOAuthProfiles(...)`。

    **新**：在插件清单中声明 `contracts.externalAuthProviders`
    **并且**实现 `resolveExternalAuthProfiles(...)`。旧的“auth 回退”路径会在运行时发出警告，并将在以后移除。

    ```json
    {
      "contracts": {
        "externalAuthProviders": ["anthropic", "openai"]
      }
    }
    ```

  </Accordion>

  <Accordion title="Provider 环境变量查找 → setup.providers[].envVars">
    **旧** 清单字段：`providerAuthEnvVars: { anthropic: ["ANTHROPIC_API_KEY"] }`。

    **新**：将同样的环境变量查找映射到清单中的 `setup.providers[].envVars`。
    这样可以将 setup/status 的环境元数据集中在一个地方，并避免仅为回答环境变量查找而启动插件运行时。

    在弃用窗口结束之前，`providerAuthEnvVars` 仍通过兼容适配器受支持。

  </Accordion>

  <Accordion title="Memory 插件注册 → registerMemoryCapability">
    **旧**：三个单独调用——
    `api.registerMemoryPromptSection(...)`、
    `api.registerMemoryFlushPlan(...)`、
    `api.registerMemoryRuntime(...)`。

    **新**：在 memory-state API 上一次调用——
    `registerMemoryCapability(pluginId, { promptBuilder, flushPlanResolver, runtime })`。

    位置相同，注册调用变为单次。增量 memory 辅助工具
    (`registerMemoryPromptSupplement`、`registerMemoryCorpusSupplement`、
    `registerMemoryEmbeddingProvider`) 不受影响。

  </Accordion>

  <Accordion title="子 agent 会话消息类型重命名">
    `src/plugins/runtime/types.ts` 仍导出两个旧类型别名：

    | 旧                           | 新                             |
    | ----------------------------- | ------------------------------- |
    | `SubagentReadSessionParams`   | `SubagentGetSessionMessagesParams` |
    | `SubagentReadSessionResult`   | `SubagentGetSessionMessagesResult` |

    运行时方法 `readSession` 已弃用，建议改用 `getSessionMessages`。签名相同；旧方法会转调新方法。

  </Accordion>

  <Accordion title="runtime.tasks.flow → runtime.tasks.managedFlows">
    **旧**：`runtime.tasks.flow`（单数）返回一个活动 task-flow 访问器。

    **新**：`runtime.tasks.managedFlows` 为创建、更新、取消或运行子任务的插件保留受管理的 TaskFlow 变更运行时。仅当插件只需要基于 DTO 的读取时，请使用 `runtime.tasks.flows`。

    ```typescript
    // 之前
    const flow = api.runtime.tasks.flow.fromToolContext(ctx);
    // 之后
    const flow = api.runtime.tasks.managedFlows.fromToolContext(ctx);
    ```

  </Accordion>

  <Accordion title="嵌入式扩展工厂 → agent tool-result 中间件">
    见上文“如何迁移 → 将 Pi 的 tool-result 扩展迁移到中间件”。此处仅为完整性重复说明：
    已移除的仅 Pi 可用的 `api.registerEmbeddedExtensionFactory(...)` 路径，已由
    `api.registerAgentToolResultMiddleware(...)` 替代，并在 `contracts.agentToolResultMiddleware`
    中显式列出 runtime。

  </Accordion>

  <Accordion title="OpenClawSchemaType 别名 → OpenClawConfig">
    从 `openclaw/plugin-sdk` 重导出的 `OpenClawSchemaType` 现在只是 `OpenClawConfig` 的一行别名。请优先使用标准名称。

    ```typescript
    // 之前
    import type { OpenClawSchemaType } from "openclaw/plugin-sdk";
    // 之后
    import type { OpenClawConfig } from "openclaw/plugin-sdk/config-schema";
    ```

  </Accordion>
</AccordionGroup>

<Note>
扩展级弃用项（位于 `extensions/` 下捆绑通道/provider 插件内部）会在它们自己的 `api.ts` 和 `runtime-api.ts`
总入口中跟踪。它们不影响第三方插件契约，也不会在这里列出。如果你直接消费某个捆绑插件的本地总入口，请先阅读该总入口中的弃用注释再升级。
</Note>

## 移除时间线

| 时间                   | 会发生什么                                                            |
| ---------------------- | ----------------------------------------------------------------------- |
| **现在**              | 已弃用的面会发出运行时警告                                               |
| **下一个大版本**      | 已弃用的面将被移除；仍在使用它们的插件会失败                             |

所有核心插件都已经迁移完成。外部插件应在下一个大版本之前完成迁移。

## 临时抑制警告

在迁移期间设置以下环境变量：

```bash
OPENCLAW_SUPPRESS_PLUGIN_SDK_COMPAT_WARNING=1 openclaw gateway run
OPENCLAW_SUPPRESS_EXTENSION_API_WARNING=1 openclaw gateway run
```

这只是临时逃生通道，不是永久解决方案。

## 相关

- [入门指南](/plugins/building-plugins) — 构建你的第一个插件
- [SDK 概览](/plugins/sdk-overview) — 完整的子路径导入参考
- [频道插件](/plugins/sdk-channel-plugins) — 构建频道插件
- [提供程序插件](/plugins/sdk-provider-plugins) — 构建提供程序插件
- [插件内部机制](/plugins/architecture) — 架构深度解析
- [插件清单](/plugins/manifest) — 清单 schema 参考
