---
summary: "从旧版向后兼容层迁移到现代插件 SDK"
title: "插件 SDK 迁移"
sidebarTitle: "迁移到 SDK"
read_when:
  - 你看到 OPENCLAW_PLUGIN_SDK_COMPAT_DEPRECATED 警告时
  - 你看到 OPENCLAW_EXTENSION_API_DEPRECATED 警告时
  - 你在 OpenClaw 2026.4.24 之前使用过 api.registerEmbeddedExtensionFactory
  - 你正在将插件更新为现代插件架构
  - 你维护一个外部 OpenClaw 插件
---

OpenClaw 已从广泛的向后兼容层转向现代插件
架构，采用聚焦且有文档记录的导入。如果你的插件是在
新架构之前构建的，本指南将帮助你迁移。

## 正在发生的变化

旧插件系统提供了两个完全开放的表面，让插件可以从单个入口点导入任何他们需要的东西：

- **`openclaw/plugin-sdk/compat`** — 单一导入，重新导出数十个
  辅助函数。它被引入是为了在新插件架构构建期间让旧的基于 hook 的插件继续工作。
- **`openclaw/plugin-sdk/infra-runtime`** — 一个宽泛的运行时辅助函数聚合导出，
  混合了系统事件、心跳状态、传递队列、fetch/proxy 辅助函数、
  文件辅助函数、审批类型和无关工具。
- **`openclaw/plugin-sdk/config-runtime`** — 一个宽泛的配置兼容聚合导出，
  在迁移窗口期间仍保留已弃用的直接加载/写入辅助函数。
- **`openclaw/extension-api`** — 一个桥接层，让插件可以直接访问
  宿主侧辅助函数，例如嵌入式代理运行器。
- **`api.registerEmbeddedExtensionFactory(...)`** — 一个已移除的仅 Pi 捆绑
  扩展 hook，可观察嵌入式运行器事件，例如
  `tool_result`。

这些广泛的导入表面现在已**弃用**。它们在运行时仍然可用，
但新插件不得使用它们，现有插件应在下一次主要版本发布移除它们之前迁移。
仅 Pi 的嵌入式扩展工厂注册 API 已被移除；请改用工具结果中间件。

OpenClaw 不会在引入替代方案的同一次变更中移除或重新解释已记录的插件行为。
破坏性的契约变更必须先经过兼容适配器、诊断、文档和弃用窗口。
这适用于 SDK 导入、manifest 字段、设置 API、hooks，以及运行时
注册行为。

<Warning>
  向后兼容层将在未来的主要版本中移除。
  仍然从这些表面导入的插件在那时将会失效。
  仅 Pi 的嵌入式扩展工厂注册已经不再加载。
</Warning>

## 为何做出此更改

旧方法导致了以下问题：

- **启动缓慢** — 导入一个辅助函数会加载数十个不相关的模块
- **循环依赖** — 广泛的重新导出使得很容易创建导入循环
- **不清晰的 API 表面** — 无法区分哪些导出是稳定的还是内部的

现代插件 SDK 解决了这个问题：每个导入路径（`openclaw/plugin-sdk/<subpath>`）都是一个小型的、自包含的模块，具有明确的目的和有文档记录的契约。

遗留的捆绑通道便捷接口也已消失。
通道品牌化的辅助接口是私有的单仓库快捷方式，而不是稳定的
插件契约。请改用狭窄的通用 SDK 子路径。在捆绑
插件工作区内，将提供商拥有的辅助函数保留在该插件自己的 `api.ts` 或
`runtime-api.ts` 中。

当前捆绑提供商示例：

- Anthropic 在其自己的 `api.ts` / `contract-api.ts` 接口中保留 Claude 特定的流辅助函数
- OpenAI 在其自己的 `api.ts` 中保留提供商构建器、默认模型辅助函数和实时提供商构建器
- OpenRouter 在其自己的 `api.ts` 中保留提供商构建器和入职/配置辅助函数

## 兼容性策略

对于外部插件，兼容性工作按以下顺序进行：

1. 添加新契约
2. 通过兼容适配器保持旧行为连通
3. 发出诊断或警告，指出旧路径和替代方案
4. 在测试中覆盖两条路径
5. 记录弃用和迁移路径
6. 仅在公告的迁移窗口之后移除，通常是在主要版本中

如果某个 manifest 字段仍被接受，插件作者可以继续使用它，直到
文档和诊断说明另有提示。新代码应优先使用已记录的替代方案，
但现有插件不应在普通的小版本发布期间被破坏。

## 如何迁移

<Steps>
  <Step title="迁移运行时配置加载/写入辅助函数">
    捆绑插件应停止直接调用
    `api.runtime.config.loadConfig()` 和
    `api.runtime.config.writeConfigFile(...)`。应优先使用已经
    传入当前调用路径的配置。需要当前进程快照的长生命周期处理程序可以使用 `api.runtime.config.current()`。长生命周期
    代理工具应在 `execute` 中使用工具上下文的 `ctx.getRuntimeConfig()`，这样在配置写入前创建的工具仍然可以看到刷新后的
    运行时配置。

    配置写入必须通过事务型辅助函数，并选择写后策略：

    ```typescript
    await api.runtime.config.mutateConfigFile({
      afterWrite: { mode: "auto" },
      mutate(draft) {
        draft.plugins ??= {};
      },
    });
    ```

    当调用方知道更改需要一次干净的网关重启时，使用 `afterWrite: { mode: "restart", reason: "..." }`，并且
    仅当调用方负责后续流程并且明确希望抑制重新加载规划器时，才使用
    `afterWrite: { mode: "none", reason: "..." }`。
    变更结果包含一个供测试和日志使用的类型化 `followUp` 摘要；
    网关仍然负责应用或调度重启。
    在迁移窗口期间，`loadConfig` 和 `writeConfigFile` 仍作为面向外部插件的弃用
    兼容辅助函数存在，并会以 `runtime-config-load-write` 兼容代码
    仅警告一次。捆绑插件和仓库运行时代码受扫描防护
    `pnpm check:deprecated-internal-config-api` 和
    `pnpm check:no-runtime-action-load-config` 保护：新的生产插件使用会
    直接失败，直接配置写入会失败，网关服务器方法必须使用
    请求运行时快照，运行时通道发送/动作/客户端辅助函数
    必须从其边界接收配置，并且长生命周期运行时模块不允许出现任何
    允许的环境态 `loadConfig()` 调用。

    新插件代码也应避免导入宽泛的
    `openclaw/plugin-sdk/config-runtime` 兼容聚合导出。请根据任务使用
    相应的狭窄 SDK 子路径：

    | 需要 | 导入 |
    | --- | --- |
    | 如 `OpenClawConfig` 这样的配置类型 | `openclaw/plugin-sdk/config-types` |
    | 已加载配置断言和插件入口配置查找 | `openclaw/plugin-sdk/plugin-config-runtime` |
    | 当前运行时快照读取 | `openclaw/plugin-sdk/runtime-config-snapshot` |
    | 配置写入 | `openclaw/plugin-sdk/config-mutation` |
    | 会话存储辅助函数 | `openclaw/plugin-sdk/session-store-runtime` |
    | Markdown 表格配置 | `openclaw/plugin-sdk/markdown-table-runtime` |
    | 组策略运行时辅助函数 | `openclaw/plugin-sdk/runtime-group-policy` |
    | 密钥输入解析 | `openclaw/plugin-sdk/secret-input-runtime` |
    | 模型/会话覆盖 | `openclaw/plugin-sdk/model-session-runtime` |

    捆绑插件及其测试已对宽泛聚合导出加了扫描防护，因此导入和 mock 保持在所需行为的本地范围内。宽泛聚合导出
    仍然为外部兼容性而存在，但新代码不应依赖它。

  </Step>

  <Step title="将 Pi 工具结果扩展迁移到中间件">
    捆绑插件必须用运行时中立的中间件替换仅 Pi 的
    `api.registerEmbeddedExtensionFactory(...)` 工具结果处理程序。

    ```typescript
    // Pi 和 Codex 运行时动态工具
    api.registerAgentToolResultMiddleware(async (event) => {
      return compactToolResult(event);
    }, {
      runtimes: ["pi", "codex"],
    });
    ```

    同时更新插件 manifest：

    ```json
    {
      "contracts": {
        "agentToolResultMiddleware": ["pi", "codex"]
      }
    }
    ```

    外部插件不能注册 tool-result 中间件，因为它可以在模型看到之前重写高信任度的工具输出。

  </Step>

  <Step title="将原生审批处理程序迁移到能力事实">
    支持审批的渠道插件现在通过 `approvalCapability.nativeRuntime`
    以及共享的运行时上下文注册表暴露原生审批行为。

    关键变化：

    - 将 `approvalCapability.handler.loadRuntime(...)` 替换为 `approvalCapability.nativeRuntime`
    - 将特定于审批的身份验证/传递从遗留的 `plugin.auth` / `plugin.approvals` 布线上移，并移至 `approvalCapability`
    - `ChannelPlugin.approvals` 已从公共渠道插件合同中移除；将 delivery/native/render 字段移至 `approvalCapability`
    - `plugin.auth` 仅保留用于渠道登录/注销流程；核心不再读取其中的审批身份验证钩子
    - 通过 `openclaw/plugin-sdk/channel-runtime-context` 注册渠道拥有的运行时对象，如客户端、令牌或 Bolt 应用
    - 不要从原生审批处理程序发送插件拥有的重路由通知；核心现在拥有来自实际传递结果的路由到别处的通知
    - 当将 `channelRuntime` 传递给 `createChannelManager(...)` 时，请提供真实的 `createPluginRuntime().channel` 表面。部分存根将被拒绝。

    请参阅 `/plugins/sdk-channel-plugins` 了解当前的审批能力布局。

  </Step>

  <Step title="审计 Windows 包装器回退行为">
    如果您的插件使用 `openclaw/plugin-sdk/windows-spawn`，未解析的 Windows `.cmd`/`.bat` 包装器现在将失败关闭，除非您明确传递 `allowShellFallback: true`。

    ```typescript
    // 之前
    const program = applyWindowsSpawnProgramPolicy({ candidate });

    // 之后
    const program = applyWindowsSpawnProgramPolicy({
      candidate,
      // 仅对有意接受 shell 回退的可信兼容性调用者设置此项。
      allowShellFallback: true,
    });
    ```

    如果您的调用者并非有意依赖 shell 回退，请不要设置 `allowShellFallback`，而应处理抛出的错误。

  </Step>

  <Step title="查找已弃用的导入">
    在您的插件中搜索来自任一已弃用表面的导入：

    ```bash
    grep -r "plugin-sdk/compat" my-plugin/
    grep -r "plugin-sdk/infra-runtime" my-plugin/
    grep -r "plugin-sdk/config-runtime" my-plugin/
    grep -r "openclaw/extension-api" my-plugin/
    ```

  </Step>

  <Step title="替换为聚焦导入">
    旧表面的每个导出都映射到特定的现代导入路径：

    ```typescript
    // 之前（已弃用的向后兼容层）
    import {
      createChannelReplyPipeline,
      createPluginRuntimeStore,
      resolveControlCommandGate,
    } from "openclaw/plugin-sdk/compat";

    // 之后（现代聚焦导入）
    import { createChannelReplyPipeline } from "openclaw/plugin-sdk/channel-reply-pipeline";
    import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
    import { resolveControlCommandGate } from "openclaw/plugin-sdk/command-auth";
    ```

    对于宿主侧辅助函数，使用注入的插件运行时而不是直接导入：

    ```typescript
    // 之前（已弃用的 extension-api 桥接）
    import { runEmbeddedPiAgent } from "openclaw/extension-api";
    const result = await runEmbeddedPiAgent({ sessionId, prompt });

    // 之后（注入的运行时）
    const result = await api.runtime.agent.runEmbeddedPiAgent({ sessionId, prompt });
    ```

    相同的模式适用于其他遗留桥接辅助函数：

    | 旧导入 | 现代等效项 |
    | --- | --- |
    | `resolveAgentDir` | `api.runtime.agent.resolveAgentDir` |
    | `resolveAgentWorkspaceDir` | `api.runtime.agent.resolveAgentWorkspaceDir` |
    | `resolveAgentIdentity` | `api.runtime.agent.resolveAgentIdentity` |
    | `resolveThinkingDefault` | `api.runtime.agent.resolveThinkingDefault` |
    | `resolveAgentTimeoutMs` | `api.runtime.agent.resolveAgentTimeoutMs` |
    | `ensureAgentWorkspace` | `api.runtime.agent.ensureAgentWorkspace` |
    | session store helpers | `api.runtime.agent.session.*` |

  </Step>

  <Step title="替换宽泛的 infra-runtime 导入">
    `openclaw/plugin-sdk/infra-runtime` 仍然为外部
    兼容性而存在，但新代码应导入其实际需要的聚焦辅助函数表面：

    | 需要 | 导入 |
    | --- | --- |
    | 系统事件队列辅助函数 | `openclaw/plugin-sdk/system-event-runtime` |
    | 心跳事件和可见性辅助函数 | `openclaw/plugin-sdk/heartbeat-runtime` |
    | 待处理传递队列清空 | `openclaw/plugin-sdk/delivery-queue-runtime` |
    | 通道活动遥测 | `openclaw/plugin-sdk/channel-activity-runtime` |
    | 内存去重缓存 | `openclaw/plugin-sdk/dedupe-runtime` |
    | 安全的本地文件/媒体路径辅助函数 | `openclaw/plugin-sdk/file-access-runtime` |
    | 感知调度器的 fetch | `openclaw/plugin-sdk/runtime-fetch` |
    | 代理和受保护的 fetch 辅助函数 | `openclaw/plugin-sdk/fetch-runtime` |
    | SSRF 调度器策略类型 | `openclaw/plugin-sdk/ssrf-dispatcher` |
    | 审批请求/解析类型 | `openclaw/plugin-sdk/approval-runtime` |
    | 审批回复负载和命令辅助函数 | `openclaw/plugin-sdk/approval-reply-runtime` |
    | 错误格式化辅助函数 | `openclaw/plugin-sdk/error-runtime` |
    | 传输就绪等待 | `openclaw/plugin-sdk/transport-ready-runtime` |
    | 安全令牌辅助函数 | `openclaw/plugin-sdk/secure-random-runtime` |
    | 有界异步任务并发 | `openclaw/plugin-sdk/concurrency-runtime` |
    | 数值强制转换 | `openclaw/plugin-sdk/number-runtime` |
    | 进程本地异步锁 | `openclaw/plugin-sdk/async-lock-runtime` |
    | 文件锁 | `openclaw/plugin-sdk/file-lock` |

    捆绑插件已对 `infra-runtime` 加了扫描防护，因此仓库代码
    不会回退到宽泛聚合导出。

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
  | `plugin-sdk/plugin-entry` | 规范的插件入口辅助函数 | `definePluginEntry` |
  | `plugin-sdk/core` | 渠道入口定义/构建器的遗留总包重新导出 | `defineChannelPluginEntry`, `createChatChannelPlugin` |
  | `plugin-sdk/config-schema` | 根配置 schema 导出 | `OpenClawSchema` |
  | `plugin-sdk/provider-entry` | 单提供商入口辅助函数 | `defineSingleProviderPluginEntry` |
  | `plugin-sdk/channel-core` | 聚焦的渠道入口定义和构建器 | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
  | `plugin-sdk/setup` | 共享设置向导辅助函数 | 允许列表提示、设置状态构建器 |
  | `plugin-sdk/setup-runtime` | 设置时运行时辅助函数 | 导入安全的设置补丁适配器、查找注释辅助函数、`promptResolvedAllowFrom`、`splitSetupEntries`、委派设置代理 |
  | `plugin-sdk/setup-adapter-runtime` | 设置适配器辅助函数 | `createEnvPatchedAccountSetupAdapter` |
  | `plugin-sdk/setup-tools` | 设置工具辅助函数 | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
  | `plugin-sdk/account-core` | 多账户辅助函数 | 账户列表/配置/动作门控辅助函数 |
  | `plugin-sdk/account-id` | 账户 ID 辅助函数 | `DEFAULT_ACCOUNT_ID`, 账户 ID 规范化 |
  | `plugin-sdk/account-resolution` | 账户查找辅助函数 | 账户查找 + 默认回退辅助函数 |
  | `plugin-sdk/account-helpers` | 狭窄的账户辅助函数 | 账户列表/账户动作辅助函数 |
  | `plugin-sdk/channel-setup` | 设置向导适配器 | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, 以及 `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
  | `plugin-sdk/channel-pairing` | DM 配对原语 | `createChannelPairingController` |
  | `plugin-sdk/channel-reply-pipeline` | 回复前缀 + 输入状态 wiring | `createChannelReplyPipeline` |
  | `plugin-sdk/channel-config-helpers` | 配置适配器工厂 | `createHybridChannelConfigAdapter` |
  | `plugin-sdk/channel-config-schema` | 配置 schema 构建器 | 共享渠道配置 schema 原语以及仅通用构建器 |
  | `plugin-sdk/channel-config-schema-legacy` | 已弃用的捆绑配置 schema | 仅捆绑兼容性；新插件必须定义插件本地 schema |
  | `plugin-sdk/telegram-command-config` | Telegram 命令配置辅助函数 | 命令名规范化、描述修剪、重复/冲突验证 |
  | `plugin-sdk/channel-policy` | 组/DM 策略解析 | `resolveChannelGroupRequireMention` |
  | `plugin-sdk/channel-lifecycle` | 账户状态和草稿流生命周期辅助函数 | `createAccountStatusSink`, 草稿预览完成辅助函数 |
  | `plugin-sdk/inbound-envelope` | 入站信封辅助函数 | 共享路由 + 信封构建器辅助函数 |
  | `plugin-sdk/inbound-reply-dispatch` | 入站回复辅助函数 | 共享记录和分发辅助函数 |
  | `plugin-sdk/messaging-targets` | 消息目标解析 | 目标解析/匹配辅助函数 |
  | `plugin-sdk/outbound-media` | 出站媒体辅助函数 | 共享出站媒体加载 |
  | `plugin-sdk/outbound-send-deps` | 出站发送依赖辅助函数 | 无需导入完整出站运行时的轻量级 `resolveOutboundSendDep` 查找 |
  | `plugin-sdk/outbound-runtime` | 出站运行时辅助函数 | 出站传递、身份/发送委托、会话、格式化和负载规划辅助函数 |
  | `plugin-sdk/thread-bindings-runtime` | 线程绑定辅助函数 | 线程绑定生命周期和适配器辅助函数 |
  | `plugin-sdk/agent-media-payload` | 遗留媒体负载辅助函数 | 面向遗留字段布局的代理媒体负载构建器 |
  | `plugin-sdk/channel-runtime` | 已弃用的兼容性封装 | 仅遗留渠道运行时工具 |
  | `plugin-sdk/channel-send-result` | 发送结果类型 | 回复结果类型 |
  | `plugin-sdk/runtime-store` | 持久插件存储 | `createPluginRuntimeStore` |
  | `plugin-sdk/runtime` | 宽泛运行时辅助函数 | 运行时/日志/备份/插件安装辅助函数 |
  | `plugin-sdk/runtime-env` | 狭窄运行时环境辅助函数 | logger/运行时环境、超时、重试和退避辅助函数 |
  | `plugin-sdk/plugin-runtime` | 共享插件运行时辅助函数 | 插件 commands/hooks/http/interactive 辅助函数 |
  | `plugin-sdk/hook-runtime` | Hook 管道辅助函数 | 共享 webhook/内部 hook 管道辅助函数 |
  | `plugin-sdk/lazy-runtime` | 懒加载运行时辅助函数 | `createLazyRuntimeModule`, `createLazyRuntimeMethod`, `createLazyRuntimeMethodBinder`, `createLazyRuntimeNamedExport`, `createLazyRuntimeSurface` |
  | `plugin-sdk/process-runtime` | 进程辅助函数 | 共享 exec 辅助函数 |
  | `plugin-sdk/cli-runtime` | CLI 运行时辅助函数 | 命令格式化、等待、版本辅助函数 |
  | `plugin-sdk/gateway-runtime` | 网关辅助函数 | 网关客户端和渠道状态补丁辅助函数 |
  | `plugin-sdk/config-runtime` | 已弃用的配置兼容封装 | 优先使用 `config-types`, `plugin-config-runtime`, `runtime-config-snapshot`, 和 `config-mutation` |
  | `plugin-sdk/telegram-command-config` | Telegram 命令辅助函数 | 当捆绑的 Telegram 合同表面不可用时的回退稳定 Telegram 命令验证辅助函数 |
  | `plugin-sdk/approval-runtime` | 审批提示辅助函数 | exec/插件审批负载、审批能力/配置文件辅助函数、原生审批路由/运行时辅助函数，以及结构化审批显示路径格式化 |
  | `plugin-sdk/approval-auth-runtime` | 审批认证辅助函数 | 审批人解析、同聊动作认证 |
  | `plugin-sdk/approval-client-runtime` | 审批客户端辅助函数 | 原生 exec 审批配置文件/过滤辅助函数 |
  | `plugin-sdk/approval-delivery-runtime` | 审批传递辅助函数 | 原生审批能力/传递适配器 |
  | `plugin-sdk/approval-gateway-runtime` | 审批网关辅助函数 | 共享审批网关解析辅助函数 |
  | `plugin-sdk/approval-handler-adapter-runtime` | 审批适配器辅助函数 | 面向热通道入口点的轻量级原生审批适配器加载辅助函数 |
  | `plugin-sdk/approval-handler-runtime` | 审批处理程序辅助函数 | 更宽泛的审批处理程序运行时辅助函数；当更窄的适配器/网关接口已经足够时，优先使用它们 |
  | `plugin-sdk/approval-native-runtime` | 审批目标辅助函数 | 原生审批目标/账户绑定辅助函数 |
  | `plugin-sdk/approval-reply-runtime` | 审批回复辅助函数 | exec/插件审批回复负载辅助函数 |
  | `plugin-sdk/channel-runtime-context` | 通道运行时上下文辅助函数 | 通用通道运行时上下文注册/获取/监视辅助函数 |
  | `plugin-sdk/security-runtime` | 安全辅助函数 | 共享信任、DM 门控、外部内容和密钥收集辅助函数 |
  | `plugin-sdk/ssrf-policy` | SSRF 策略辅助函数 | 主机允许列表和私有网络策略辅助函数 |
  | `plugin-sdk/ssrf-runtime` | SSRF 运行时辅助函数 | 固定调度器、受保护的 fetch、SSRF 策略辅助函数 |
  | `plugin-sdk/system-event-runtime` | 系统事件辅助函数 | `enqueueSystemEvent`, `peekSystemEventEntries` |
  | `plugin-sdk/heartbeat-runtime` | 心跳辅助函数 | 心跳事件和可见性辅助函数 |
  | `plugin-sdk/delivery-queue-runtime` | 传递队列辅助函数 | `drainPendingDeliveries` |
  | `plugin-sdk/channel-activity-runtime` | 通道活动辅助函数 | `recordChannelActivity` |
  | `plugin-sdk/dedupe-runtime` | 去重辅助函数 | 内存去重缓存 |
  | `plugin-sdk/file-access-runtime` | 文件访问辅助函数 | 安全的本地文件/媒体路径辅助函数 |
  | `plugin-sdk/transport-ready-runtime` | 传输就绪辅助函数 | `waitForTransportReady` |
  | `plugin-sdk/collection-runtime` | 有界缓存辅助函数 | `pruneMapToMaxSize` |
  | `plugin-sdk/diagnostic-runtime` | 诊断门控辅助函数 | `isDiagnosticFlagEnabled`, `isDiagnosticsEnabled` |
  | `plugin-sdk/error-runtime` | 错误格式化辅助函数 | `formatUncaughtError`, `isApprovalNotFoundError`, 错误图辅助函数 |
  | `plugin-sdk/fetch-runtime` | 封装的 fetch/proxy 辅助函数 | `resolveFetch`, proxy 辅助函数 |
  | `plugin-sdk/host-runtime` | 主机规范化辅助函数 | `normalizeHostname`, `normalizeScpRemoteHost` |
  | `plugin-sdk/retry-runtime` | 重试辅助函数 | `RetryConfig`, `retryAsync`, 策略运行器 |
  | `plugin-sdk/allow-from` | 允许列表格式化 | `formatAllowFromLowercase` |
  | `plugin-sdk/allowlist-resolution` | 允许列表输入映射 | `mapAllowlistResolutionInputs` |
  | `plugin-sdk/command-auth` | 命令门控和命令表面辅助函数 | `resolveControlCommandGate`, 发送者授权辅助函数，包含动态参数菜单格式化的命令注册表辅助函数 |
  | `plugin-sdk/command-status` | 命令状态/帮助渲染器 | `buildCommandsMessage`, `buildCommandsMessagePaginated`, `buildHelpMessage` |
  | `plugin-sdk/secret-input` | 密钥输入解析 | 密钥输入辅助函数 |
  | `plugin-sdk/webhook-ingress` | Webhook 请求辅助函数 | Webhook 目标工具 |
  | `plugin-sdk/webhook-request-guards` | Webhook 正文守卫辅助函数 | 请求正文读取/限制辅助函数 |
  | `plugin-sdk/reply-runtime` | 共享回复运行时 | 入站分发、心跳、回复规划器、分块 |
  | `plugin-sdk/reply-dispatch-runtime` | 狭窄回复分发辅助函数 | 完成、提供商分发和会话标签辅助函数 |
  | `plugin-sdk/reply-history` | 回复历史辅助函数 | `buildHistoryContext`, `buildPendingHistoryContextFromMap`, `recordPendingHistoryEntry`, `clearHistoryEntriesIfEnabled` |
  | `plugin-sdk/reply-reference` | 回复引用规划 | `createReplyReferencePlanner` |
  | `plugin-sdk/reply-chunking` | 回复分块辅助函数 | 文本/markdown 分块辅助函数 |
  | `plugin-sdk/session-store-runtime` | 会话存储辅助函数 | 存储路径 + updated-at 辅助函数 |
  | `plugin-sdk/state-paths` | 状态路径辅助函数 | 状态和 OAuth 目录辅助函数 |
  | `plugin-sdk/routing` | 路由/会话键辅助函数 | `resolveAgentRoute`, `buildAgentSessionKey`, `resolveDefaultAgentBoundAccountId`, 会话键规范化辅助函数 |
  | `plugin-sdk/status-helpers` | 渠道状态辅助函数 | 渠道/账户状态摘要构建器、运行时状态默认值、问题元数据辅助函数 |
  | `plugin-sdk/target-resolver-runtime` | 目标解析器辅助函数 | 共享目标解析器辅助函数 |
  | `plugin-sdk/string-normalization-runtime` | 字符串规范化辅助函数 | slug/字符串规范化辅助函数 |
  | `plugin-sdk/request-url` | 请求 URL 辅助函数 | 从类请求输入中提取字符串 URL |
  | `plugin-sdk/run-command` | 定时命令辅助函数 | 带规范化 stdout/stderr 的定时命令运行器 |
  | `plugin-sdk/param-readers` | 参数读取器 | 常见工具/CLI 参数读取器 |
  | `plugin-sdk/tool-payload` | 工具负载提取 | 从工具结果对象中提取规范化负载 |
  | `plugin-sdk/tool-send` | 工具发送提取 | 从工具参数中提取规范化发送目标字段 |
  | `plugin-sdk/temp-path` | 临时路径辅助函数 | 共享临时下载路径辅助函数 |
  | `plugin-sdk/logging-core` | 日志辅助函数 | 子系统 logger 和脱敏辅助函数 |
  | `plugin-sdk/markdown-table-runtime` | Markdown 表格辅助函数 | Markdown 表格模式辅助函数 |
  | `plugin-sdk/reply-payload` | 消息回复类型 | 回复负载类型 |
  | `plugin-sdk/provider-setup` | 经过筛选的本地/自托管提供商设置辅助函数 | 自托管提供商发现/配置辅助函数 |
  | `plugin-sdk/self-hosted-provider-setup` | 聚焦的 OpenAI 兼容自托管提供商设置辅助函数 | 相同的自托管提供商发现/配置辅助函数 |
  | `plugin-sdk/provider-auth-runtime` | 提供商运行时认证辅助函数 | 运行时 API 密钥解析辅助函数 |
  | `plugin-sdk/provider-auth-api-key` | 提供商 API 密钥设置辅助函数 | API 密钥入职/配置写入辅助函数 |
  | `plugin-sdk/provider-auth-result` | 提供商认证结果辅助函数 | 标准 OAuth 认证结果构建器 |
  | `plugin-sdk/provider-auth-login` | 提供商交互式登录辅助函数 | 共享交互式登录辅助函数 |
  | `plugin-sdk/provider-selection-runtime` | 提供商选择辅助函数 | 已配置或自动提供商选择和原始提供商配置合并 |
  | `plugin-sdk/provider-env-vars` | 提供商环境变量辅助函数 | 提供商认证环境变量查找辅助函数 |
  | `plugin-sdk/provider-model-shared` | 共享提供商模型/重放辅助函数 | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, 共享重放策略构建器、提供商端点辅助函数，以及模型 ID 规范化辅助函数 |
  | `plugin-sdk/provider-catalog-shared` | 共享提供商目录辅助函数 | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` |
  | `plugin-sdk/provider-onboard` | 提供商入职补丁 | 入职配置辅助函数 |
  | `plugin-sdk/provider-http` | 提供商 HTTP 辅助函数 | 通用提供商 HTTP/端点能力辅助函数，包括音频转写 multipart form 辅助函数 |
  | `plugin-sdk/provider-web-fetch` | 提供商 web-fetch 辅助函数 | web-fetch 提供商注册/缓存辅助函数 |
  | `plugin-sdk/provider-web-search-config-contract` | 提供商 web 搜索配置辅助函数 | 适用于不需要插件启用 wiring 的提供商的狭窄 web 搜索配置/凭据辅助函数 |
  | `plugin-sdk/provider-web-search-contract` | 提供商 web 搜索合同辅助函数 | 狭窄的 web 搜索配置/凭据合同辅助函数，如 `createWebSearchProviderContractFields`, `enablePluginInConfig`, `resolveProviderWebSearchPluginConfig`, 以及作用域凭据 setter/getter |
  | `plugin-sdk/provider-web-search` | 提供商 web 搜索辅助函数 | web 搜索提供商注册/缓存/运行时辅助函数 |
  | `plugin-sdk/provider-tools` | 提供商工具/schema 兼容辅助函数 | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, Gemini schema 清理 + 诊断，以及 xAI 兼容辅助函数，如 `resolveXaiModelCompatPatch` / `applyXaiModelCompat` |
  | `plugin-sdk/provider-usage` | 提供商使用量辅助函数 | `fetchClaudeUsage`, `fetchGeminiUsage`, `fetchGithubCopilotUsage`，以及其他提供商使用量辅助函数 |
  | `plugin-sdk/provider-stream` | 提供商流包装器辅助函数 | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, 流包装器类型，以及共享 Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包装器辅助函数 |
  | `plugin-sdk/provider-transport-runtime` | 提供商传输辅助函数 | 原生提供商传输辅助函数，如受保护的 fetch、传输消息转换和可写传输事件流 |
  | `plugin-sdk/keyed-async-queue` | 有序异步队列 | `KeyedAsyncQueue` |
  | `plugin-sdk/media-runtime` | 共享媒体辅助函数 | 媒体 fetch/transform/store 辅助函数以及媒体负载构建器 |
  | `plugin-sdk/media-generation-runtime` | 共享媒体生成辅助函数 | 共享回退辅助函数、候选选择，以及图像/视频/音乐生成的缺失模型消息 |
  | `plugin-sdk/media-understanding` | 媒体理解辅助函数 | 媒体理解提供商类型以及面向提供商的图像/音频辅助函数导出 |
  | `plugin-sdk/text-runtime` | 共享文本辅助函数 | 助手可见文本剥离、markdown 渲染/分块/表格辅助函数、脱敏辅助函数、指令标签辅助函数、安全文本工具，以及相关文本/日志辅助函数 |
  | `plugin-sdk/text-chunking` | 文本分块辅助函数 | 出站文本分块辅助函数 |
  | `plugin-sdk/speech` | 语音辅助函数 | 语音提供商类型以及面向提供商的指令、注册表和验证辅助函数 |
  | `plugin-sdk/speech-core` | 共享语音核心 | 语音提供商类型、注册表、指令、规范化 |
  | `plugin-sdk/realtime-transcription` | 实时转写辅助函数 | 提供商类型、注册表辅助函数，以及共享 WebSocket 会话辅助函数 |
  | `plugin-sdk/realtime-voice` | 实时语音辅助函数 | 提供商类型、注册/解析辅助函数，以及桥接会话辅助函数 |
  | `plugin-sdk/image-generation-core` | 共享图像生成核心 | 图像生成类型、回退、认证和注册表辅助函数 |
  | `plugin-sdk/music-generation` | 音乐生成辅助函数 | 音乐生成提供商/请求/结果类型 |
  | `plugin-sdk/music-generation-core` | 共享音乐生成核心 | 音乐生成类型、回退辅助函数、提供商查找和模型引用解析 |
  | `plugin-sdk/video-generation` | 视频生成辅助函数 | 视频生成提供商/请求/结果类型 |
  | `plugin-sdk/video-generation-core` | 共享视频生成核心 | 视频生成类型、回退辅助函数、提供商查找和模型引用解析 |
  | `plugin-sdk/interactive-runtime` | 交互式回复辅助函数 | 交互式回复负载规范化/归约 |
  | `plugin-sdk/channel-config-primitives` | 渠道配置原语 | 狭窄的渠道配置 schema 原语 |
  | `plugin-sdk/channel-config-writes` | 渠道配置写入辅助函数 | 渠道配置写入授权辅助函数 |
  | `plugin-sdk/channel-plugin-common` | 共享渠道前言 | 共享渠道插件前言导出 |
  | `plugin-sdk/channel-status` | 渠道状态辅助函数 | 共享渠道状态快照/摘要辅助函数 |
  | `plugin-sdk/allowlist-config-edit` | 允许列表配置辅助函数 | 允许列表配置编辑/读取辅助函数 |
  | `plugin-sdk/group-access` | 组访问辅助函数 | 共享组访问决策辅助函数 |
  | `plugin-sdk/direct-dm` | 直接 DM 辅助函数 | 共享直接 DM 认证/守卫辅助函数 |
  | `plugin-sdk/extension-shared` | 共享扩展辅助函数 | 被动渠道/状态和环境代理辅助原语 |
  | `plugin-sdk/webhook-targets` | Webhook 目标辅助函数 | Webhook 目标注册表和路由安装辅助函数 |
  | `plugin-sdk/webhook-path` | Webhook 路径辅助函数 | Webhook 路径规范化辅助函数 |
  | `plugin-sdk/web-media` | 共享网页媒体辅助函数 | 远程/本地媒体加载辅助函数 |
  | `plugin-sdk/zod` | Zod 重新导出 | 为 plugin SDK 使用者重新导出的 `zod` |
  | `plugin-sdk/memory-core` | 捆绑 memory-core 辅助函数 | Memory manager/config/file/CLI 辅助函数表面 |
  | `plugin-sdk/memory-core-engine-runtime` | Memory 引擎运行时门面 | Memory 索引/搜索运行时门面 |
  | `plugin-sdk/memory-core-host-engine-foundation` | Memory host foundation 引擎 | Memory host foundation 引擎导出 |
  | `plugin-sdk/memory-core-host-engine-embeddings` | Memory host embedding 引擎 | Memory embedding 合同、注册表访问、本地提供商以及通用批处理/远程辅助函数；具体远程提供商位于它们各自拥有的插件中 |
  | `plugin-sdk/memory-core-host-engine-qmd` | Memory host QMD 引擎 | Memory host QMD 引擎导出 |
  | `plugin-sdk/memory-core-host-engine-storage` | Memory host 存储引擎 | Memory host 存储引擎导出 |
  | `plugin-sdk/memory-core-host-multimodal` | Memory host 多模态辅助函数 | Memory host 多模态辅助函数 |
  | `plugin-sdk/memory-core-host-query` | Memory host 查询辅助函数 | Memory host 查询辅助函数 |
  | `plugin-sdk/memory-core-host-secret` | Memory host 密钥辅助函数 | Memory host 密钥辅助函数 |
  | `plugin-sdk/memory-core-host-events` | Memory host 事件日志辅助函数 | Memory host 事件日志辅助函数 |
  | `plugin-sdk/memory-core-host-status` | Memory host 状态辅助函数 | Memory host 状态辅助函数 |
  | `plugin-sdk/memory-core-host-runtime-cli` | Memory host CLI 运行时 | Memory host CLI 运行时辅助函数 |
  | `plugin-sdk/memory-core-host-runtime-core` | Memory host 核心运行时 | Memory host 核心运行时辅助函数 |
  | `plugin-sdk/memory-core-host-runtime-files` | Memory host 文件/运行时辅助函数 | Memory host 文件/运行时辅助函数 |
  | `plugin-sdk/memory-host-core` | Memory host 核心运行时别名 | 面向供应商中立的 memory host 核心运行时辅助函数别名 |
  | `plugin-sdk/memory-host-events` | Memory host 事件日志别名 | 面向供应商中立的 memory host 事件日志辅助函数别名 |
  | `plugin-sdk/memory-host-files` | Memory host 文件/运行时别名 | 面向供应商中立的 memory host 文件/运行时辅助函数别名 |
  | `plugin-sdk/memory-host-markdown` | 托管 markdown 辅助函数 | 面向 memory 邻接插件的共享托管 markdown 辅助函数 |
  | `plugin-sdk/memory-host-search` | 活跃 memory 搜索门面 | 懒加载的活跃 memory 搜索管理器运行时门面 |
  | `plugin-sdk/memory-host-status` | Memory host 状态别名 | 面向供应商中立的 memory host 状态辅助函数别名 |
  | `plugin-sdk/memory-lancedb` | 捆绑 memory-lancedb 辅助函数 | memory-lancedb 辅助函数表面 |
  | `plugin-sdk/testing` | 测试实用工具 | 测试辅助函数和 mocks |
</Accordion>

此表故意仅为常见迁移子集，而非完整的 SDK 表面。完整的 200+ 入口点列表位于 `scripts/lib/plugin-sdk-entrypoints.json`。

该列表仍包含一些捆绑插件辅助接口，如 `plugin-sdk/feishu`、`plugin-sdk/feishu-setup`、`plugin-sdk/zalo`、`plugin-sdk/zalo-setup` 和 `plugin-sdk/matrix*`。这些仍被导出用于捆绑插件维护和兼容性，但它们故意从常见迁移表中省略，也不是新插件代码的推荐目标。

同样的规则适用于其他捆绑辅助系列，例如：
```- 浏览器支持辅助函数：`plugin-sdk/browser-cdp`, `plugin-sdk/browser-config-runtime`, `plugin-sdk/browser-config-support`, `plugin-sdk/browser-control-auth`, `plugin-sdk/browser-node-runtime`, `plugin-sdk/browser-profiles`, `plugin-sdk/browser-security-runtime`, `plugin-sdk/browser-setup-tools`, `plugin-sdk/browser-support`
- Matrix: `plugin-sdk/matrix*`
- LINE: `plugin-sdk/line*`
- IRC: `plugin-sdk/irc*`
- 捆绑辅助/插件表面如 `plugin-sdk/googlechat`, `plugin-sdk/zalouser`, `plugin-sdk/bluebubbles*`, `plugin-sdk/mattermost*`, `plugin-sdk/msteams`, `plugin-sdk/nextcloud-talk`, `plugin-sdk/nostr`, `plugin-sdk/tlon`, `plugin-sdk/twitch`, `plugin-sdk/github-copilot-login`, `plugin-sdk/github-copilot-token`, `plugin-sdk/diagnostics-otel`, `plugin-sdk/diffs`, `plugin-sdk/llm-task`, `plugin-sdk/thread-ownership`, 和 `plugin-sdk/voice-call`

`plugin-sdk/github-copilot-token` 当前暴露狭窄的令牌辅助表面 `DEFAULT_COPILOT_API_BASE_URL`, `deriveCopilotApiBaseUrlFromToken`, 和 `resolveCopilotApiToken`。

使用匹配作业的最狭窄导入。如果找不到导出，请检查 `src/plugin-sdk/` 处的源代码或在 Discord 中询问。

## 活跃的弃用项

适用于插件 SDK、提供方契约、
运行时表面和清单的更细粒度弃用项。每一项目前仍可正常工作，但将在未来的一个主要版本中移除。
每个条目下方的说明都会将旧 API 映射到其
规范替代项。

<AccordionGroup>
  <Accordion title="command-auth help builders → command-status">
    **旧 (`openclaw/plugin-sdk/command-auth`)**: `buildCommandsMessage`,
    `buildCommandsMessagePaginated`, `buildHelpMessage`.

    **新 (`openclaw/plugin-sdk/command-status`)**: 相同的签名、相同的
    导出 — 只是从更窄的子路径导入。`command-auth`
    作为兼容占位重新导出它们。

    ```typescript
    // Before
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-auth";

    // After
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-status";
    ```

  </Accordion>

  <Accordion title="Mention gating helpers → resolveInboundMentionDecision">
    **旧**: 来自
    `openclaw/plugin-sdk/channel-inbound` 或
    `openclaw/plugin-sdk/channel-mention-gating` 的
    `resolveInboundMentionRequirement({ facts, policy })` 和
    `shouldDropInboundForMention(...)`。

    **新**: `resolveInboundMentionDecision({ facts, policy })` — 返回一个
    单一决策对象，而不是拆分成两个调用。

    下游通道插件（Slack、Discord、Matrix、MS Teams）已经
    切换。

  </Accordion>

  <Accordion title="Channel runtime shim and channel actions helpers">
    `openclaw/plugin-sdk/channel-runtime` 是为旧版
    通道插件提供的兼容层。不要在新代码中导入它；请使用
    `openclaw/plugin-sdk/channel-runtime-context` 来注册运行时
    对象。

    `openclaw/plugin-sdk/channel-actions` 中的 `channelActions*` 辅助函数与原始的
    "actions" 通道导出一起已被弃用。请改为通过语义化的 `presentation`
    表面公开能力——通道插件声明它们渲染什么（卡片、按钮、选择器），而不是它们接受哪些原始
    动作名称。

  </Accordion>

  <Accordion title="Web search provider tool() helper → createTool() on the plugin">
    **旧**: 来自 `openclaw/plugin-sdk/provider-web-search` 的 `tool()`
    工厂函数。

    **新**: 直接在提供方插件上实现 `createTool(...)`。
    OpenClaw 不再需要 SDK 辅助函数来注册工具包装器。

  </Accordion>

  <Accordion title="Plaintext channel envelopes → BodyForAgent">
    **旧**: `formatInboundEnvelope(...)`（以及
    `ChannelMessageForAgent.channelEnvelope`）用于从传入通道消息构建扁平的纯文本提示
    信封。

    **新**: `BodyForAgent` 加上结构化的用户上下文块。通道
    插件将路由元数据（线程、主题、回复目标、反应）作为
    类型化字段附加，而不是将它们拼接进提示字符串中。
    `formatAgentEnvelope(...)` 辅助函数仍支持为合成的、面向助手的信封，
    但传入的纯文本信封正在被淘汰。

    受影响的区域：`inbound_claim`、`message_received`，以及任何对
    `channelEnvelope` 文本进行后处理的自定义通道插件。

  </Accordion>

  <Accordion title="Provider discovery types → provider catalog types">
    四个发现类型别名现在只是目录时代类型的薄封装：

    | 旧别名                  | 新类型                   |
    | ----------------------- | ------------------------ |
    | `ProviderDiscoveryOrder`  | `ProviderCatalogOrder`    |
    | `ProviderDiscoveryContext`| `ProviderCatalogContext`  |
    | `ProviderDiscoveryResult` | `ProviderCatalogResult`   |
    | `ProviderPluginDiscovery` | `ProviderPluginCatalog`   |

    另外还有旧的 `ProviderCapabilities` 静态集合——提供方插件
    应通过提供方运行时契约来附加能力事实，而不是使用静态对象。

  </Accordion>

  <Accordion title="Thinking policy hooks → resolveThinkingProfile">
    **旧**（`ProviderThinkingPolicy` 上的三个独立钩子）：
    `isBinaryThinking(ctx)`、`supportsXHighThinking(ctx)`，以及
    `resolveDefaultThinkingLevel(ctx)`。

    **新**: 单个 `resolveThinkingProfile(ctx)`，返回一个具有规范
    `id`、可选 `label` 和按等级排序列表的 `ProviderThinkingProfile`。OpenClaw 会
    按照配置文件等级自动降级过时的已存储值。

    只需实现一个钩子，而不是三个。旧版钩子在弃用窗口期间仍可工作，但不会与配置文件结果进行组合。

  </Accordion>

  <Accordion title="External OAuth provider fallback → contracts.externalAuthProviders">
    **旧**: 在不在插件清单中声明该提供方的情况下实现
    `resolveExternalOAuthProfiles(...)`。

    **新**: 在插件清单中声明 `contracts.externalAuthProviders`
    **并且** 实现 `resolveExternalAuthProfiles(...)`。旧的“auth
    fallback”路径会在运行时发出警告，并将被移除。

    ```json
    {
      "contracts": {
        "externalAuthProviders": ["anthropic", "openai"]
      }
    }
    ```

  </Accordion>

  <Accordion title="Provider env-var lookup → setup.providers[].envVars">
    **旧** 清单字段: `providerAuthEnvVars: { anthropic: ["ANTHROPIC_API_KEY"] }`。

    **新**: 将相同的环境变量查找映射到清单上的
    `setup.providers[].envVars`。这将把 setup/status 的环境元数据
    统一放在一个地方，并避免仅为了回答环境变量查找而启动插件运行时。

    在弃用窗口结束之前，`providerAuthEnvVars` 仍可通过兼容适配器
    继续使用。

  </Accordion>

  <Accordion title="Memory plugin registration → registerMemoryCapability">
    **旧**: 三个单独调用 —
    `api.registerMemoryPromptSection(...)`、
    `api.registerMemoryFlushPlan(...)`、
    `api.registerMemoryRuntime(...)`。

    **新**: 在 memory-state API 上一次调用 —
    `registerMemoryCapability(pluginId, { promptBuilder, flushPlanResolver, runtime })`。

    相同的槽位，单次注册调用。增量式 memory 辅助函数
    (`registerMemoryPromptSupplement`、`registerMemoryCorpusSupplement`、
    `registerMemoryEmbeddingProvider`) 不受影响。

  </Accordion>

  <Accordion title="Subagent session messages types renamed">
    `src/plugins/runtime/types.ts` 中仍导出两个旧版类型别名：

    | 旧                           | 新                             |
    | ----------------------------- | ------------------------------- |
    | `SubagentReadSessionParams`   | `SubagentGetSessionMessagesParams` |
    | `SubagentReadSessionResult`   | `SubagentGetSessionMessagesResult` |

    运行时方法 `readSession` 已弃用，改用 `getSessionMessages`。
    签名相同；旧方法会转调到新方法。

  </Accordion>

  <Accordion title="runtime.tasks.flow → runtime.tasks.flows">
    **旧**: `runtime.tasks.flow`（单数）返回一个实时的任务流访问器。

    **新**: `runtime.tasks.flows`（复数）返回基于 DTO 的 TaskFlow 访问，
    这更适合安全导入，不需要加载完整的任务运行时。

    ```typescript
    // Before
    const flow = api.runtime.tasks.flow(ctx);
    // After
    const flows = api.runtime.tasks.flows(ctx);
    ```

  </Accordion>

  <Accordion title="Embedded extension factories → agent tool-result middleware">
    已在上文的“如何迁移 → 将 Pi tool-result 扩展迁移到
    中间件”中说明。此处仅为完整性而列出：已移除的仅面向 Pi 的
    `api.registerEmbeddedExtensionFactory(...)` 路径被
    `api.registerAgentToolResultMiddleware(...)` 取代，并在 `contracts.agentToolResultMiddleware` 中提供显式的运行时
    列表。
  </Accordion>

  <Accordion title="OpenClawSchemaType alias → OpenClawConfig">
    从 `openclaw/plugin-sdk` 重新导出的 `OpenClawSchemaType` 现在是
    `OpenClawConfig` 的单行别名。请优先使用规范名称。

    ```typescript
    // Before
    import type { OpenClawSchemaType } from "openclaw/plugin-sdk";
    // After
    import type { OpenClawConfig } from "openclaw/plugin-sdk/config-schema";
    ```

  </Accordion>
</AccordionGroup>

<Note>
扩展级弃用项（位于 `extensions/` 下捆绑的通道/提供方插件内部）会在它们各自的 `api.ts` 和 `runtime-api.ts`
入口文件中跟踪。它们不会影响第三方插件契约，也不会在此列出。
如果您直接使用某个捆绑插件的本地入口文件，请在升级前先阅读
该入口文件中的弃用说明注释。
</Note>

## 移除时间线

| 时间 | 发生什么 |
| ---------------------- | ----------------------------------------------------------------------- |
| **现在** | 已弃用的表面发出运行时警告 |
| **下一个主要版本** | 已弃用的表面将被移除；仍使用它们的插件将失败 |

所有核心插件已完成迁移。外部插件应在下一个主要版本发布前迁移。

## 暂时抑制警告

在您进行迁移工作时设置这些环境变量：

```bash
OPENCLAW_SUPPRESS_PLUGIN_SDK_COMPAT_WARNING=1 openclaw gateway run
OPENCLAW_SUPPRESS_EXTENSION_API_WARNING=1 openclaw gateway run
```

这是一个临时逃生通道，不是永久解决方案。

## 相关内容

- [入门指南](/plugins/building-plugins) — 构建您的第一个插件
- [SDK 概述](/plugins/sdk-overview) — 完整子路径导入参考
- [通道插件](/plugins/sdk-channel-plugins) — 构建通道插件
- [提供商插件](/plugins/sdk-provider-plugins) — 构建提供商插件
- [插件内部](/plugins/architecture) — 架构深入探讨
- [插件清单](/plugins/manifest) — 清单模式参考
