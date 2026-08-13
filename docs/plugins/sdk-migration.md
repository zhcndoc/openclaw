---
summary: "从旧版向后兼容层迁移到现代插件 SDK"
title: "插件 SDK 迁移"
sidebarTitle: "迁移到 SDK"
read_when:
  - 在 OpenClaw 2026.4.25 之前使用过 api.registerEmbeddedExtensionFactory
  - 正在将插件更新到现代插件架构
  - 维护外部 OpenClaw 插件
---

OpenClaw 用由小型、专注的导入构建的现代插件架构，替代了庞大的向后兼容层。如果你的插件早于这一变更，本指南将帮助你迁移到当前的契约。

## 变更内容

过去，一些过于宽泛的导入入口允许插件从单个入口访问几乎所有内容：

- **`openclaw/plugin-sdk`** 和 **`openclaw/plugin-sdk/compat`** - 在构建专用 SDK
  的过程中重新导出了数十个辅助函数。现在这两个根入口都已移除；请改为导入
  文档化的子路径。
- **`openclaw/plugin-sdk/infra-runtime`** - 一个宽泛的聚合模块，混合了系统
  事件、心跳状态、投递队列、fetch/proxy 辅助函数、文件辅助函数、
  审批类型以及其他无关工具。
- **`openclaw/plugin-sdk/config-runtime`** - 一个宽泛的配置聚合模块，仅因其
  后续兼容窗口而保留；直接的运行时加载/写入辅助函数已被移除。
- **`openclaw/extension-api`** - 一个已移除的桥接层，使插件可以直接访问主机侧
  辅助函数，例如内嵌代理运行器。
- **`api.registerEmbeddedExtensionFactory(...)`** - 一个已移除的、仅供内嵌运行器
  使用的钩子，用于观察 `tool_result` 等内嵌运行器事件。请改用代理工具结果
  中间件（参见[如何迁移内嵌工具结果扩展](#how-to-migrate)）。

根 SDK、compat 聚合模块、扩展桥接层以及内嵌扩展工厂均已移除。`infra-runtime`
和 `config-runtime` 仅因各自单独记录的后续窗口而保留；新插件应使用专用子路径。

<Warning>
导入已移除的根入口、compat 或扩展接口的插件将无法再加载。请在升级前按照下面的映射进行调整。
</Warning>

OpenClaw 不会在引入替代方案的同一变更中移除或重新解释已文档化的插件行为。破坏性契约变更会先经过兼容性适配器、诊断信息、文档以及弃用窗口。SDK 导入、清单字段、设置 API、钩子和运行时注册行为均遵循这一原则。

### 原因

- **启动缓慢** - 导入一个辅助函数会加载数十个无关模块。
- **循环依赖** - 宽泛的重新导出很容易导致创建导入循环。
- **API 表面不清晰** - 无法判断哪些导出是稳定的，哪些是内部的。

现在，每个 `openclaw/plugin-sdk/<subpath>` 都是一个小型、自包含且具有文档化契约的模块。

捆绑频道的旧版提供商便利接口也已移除 -
带有频道品牌的辅助函数快捷方式只是私有的单一代码库便利功能，并非稳定的插件契约。请改用范围更窄的通用 SDK 子路径。在捆绑插件工作区内，将提供商自有的辅助函数保留在该插件自己的 `api.ts` 或 `runtime-api.ts` 中：

- Anthropic 将 Claude 专用的流辅助函数保留在自己的 `api.ts` /
  `contract-api.ts` 接口中。
- OpenAI 将提供商构建器、默认模型辅助函数以及实时提供商构建器保留在自己的
  `api.ts` 中。
- OpenRouter 将提供商构建器以及入门/配置辅助函数保留在自己的 `api.ts` 中。

## 兼容性政策

外部插件兼容性工作遵循以下顺序：

1. 添加新的契约。
2. 通过兼容性适配器保留旧行为。
3. 发出诊断信息或警告，指出旧路径及其替代方案。
4. 在测试中覆盖两条路径。
5. 记录弃用信息和迁移路径。
6. 仅在已公布的迁移窗口结束后移除，通常是在主要版本中。

### 频道状态迁移声明

频道插件应在
`openclaw.plugin.json` 中声明 `doctorContract.stateMigrations: true`，并从其 doctor-contract
制品中导出 `stateMigrations`。基于计划的迁移可以使用
`openclaw/plugin-sdk/runtime-doctor-migrations` 中的
`definePluginDoctorMigrationFromPlans(...)`，以保留现有的移动、复制、预览
和插件状态导入行为。

设置入口的 `legacyStateMigrations` 选项和功能标志
`setupFeatures.legacyStateMigrations`、
`BundledChannelLegacyStateMigrationDetector` 以及
`ChannelPlugin.lifecycle.detectLegacyStateMigrations` 仍通过一个面向外部插件的 doctor 流水线适配器得到支持，但已被弃用。移除计划：仅当已发布插件读取方扫描确认不再有任何使用者后，才在 OpenClaw 2027.1 之后移除该适配器。

### AuthStorage SQLite 迁移

`AuthStorage.forAgent(agentDir)` 是按提供商密钥划分的会话 SDK 标准门面。它通过代理的
`openclaw-agent.sqlite` 认证配置文件行持久化提供商默认凭据，并且不会创建
`auth.json`。

`AuthStorage.create(authPath)` 仍作为现有插件使用的具名弃用适配器保留。该路径仅用于推导所属代理目录；
该适配器读写的是 SQLite，而不是指定的 JSON 文件。现在请迁移到
`forAgent(...)`。接受路径的形式会发出
`AUTH_STORAGE_CREATE_DEPRECATED`，如果已发布插件读取方清理完成，则可在
2026-10-01 之后移除。

直接导入 `FileAuthStorageBackend` 在同一时间窗口内仍可用，作为基于 SQLite 的兼容适配器。它们会发出
`FILE_AUTH_STORAGE_BACKEND_DEPRECATED`；请将后端构造替换为
`AuthStorage.forAgent(agentDir)`。这两种弃用路径都不会读取或写入
旧版文件。

如果某个清单字段仍被接受，请继续使用它，直到文档和诊断信息另行说明。新代码应优先使用文档中说明的替代方案；
现有插件不应在正常的小版本发布期间被破坏。

有日期的兼容性注册表还会跟踪不属于某个旧版子路径的已发布注解。这些记录使用 2026-10-01 作为最早的审查日期；
移除仍需要满足最后一列中的读取方条件。

| 兼容性代码                              | 替代方案                                                                                      | 移除条件                                                                                  |
| --------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `plugin-sdk-broad-runtime-barrels`      | 专用能力子路径                                                                                | 不再存在对七个列举的宽泛 barrel 的捆绑或已发布导入。                                      |
| `plugin-sdk-provider-owned-helper-shims` | 提供商本地的认证/模型/重放/OAuth/流 API                                                        | 每个列举的辅助工具均已在官方提供商中完成迁移，并且不再存在于已发布插件中。                  |
| `message-presentation-legacy-bridges`   | `MessagePresentation` 和频道展示渲染器                                                        | 生产方和官方频道包不再生成或读取旧版交互式回复。                                          |
| `plugin-sdk-focused-compat-aliases`     | 每个 `@deprecated` 注解中指定的专用替代方案                                                     | 每个列举的别名都不再有任何捆绑或已发布的读取方。                                          |
| `agent-harness-terminal-result-aliases` | `AgentHarnessAttemptResult.terminal` 和 `visibleReplies`                                      | Harness 插件不再读取旧版终端布尔值或 `sourceVisibleReplies`。                             |
| `official-plugin-export-aliases`        | 标准 Google Meet 测试、展示渲染器以及由主机拥有的 Discord 超时行为                             | 最低支持版本的官方插件包不再导入这些别名。                                                |
| `memory-host-compatibility-aliases`     | 标准内存表和准备好的运行时配置                                                                  | 内存集成不再传递表覆盖项或调用旧版 `loadConfig`。                                         |
| `plugin-runtime-api-compat-aliases`     | 命名空间化插件 API 和专用运行时方法                                                             | 所有列举的扁平 API/运行时别名都不再有读取方。                                              |
| `plugin-provider-manifest-compat-aliases` | 由清单拥有的类型/设置元数据和模型目录注册                                                       | 提供商不再发布运行时类型或旧版目录钩子。                                                  |

### 已发布频道设置兼容性

通过 `2026.7.1` 发布的 Slack、Discord、Signal 和 Microsoft Teams 软件包从
`openclaw/plugin-sdk/bundled-channel-config-schema` 导入特定于频道的配置架构。已发布的 Slack 和
Discord 软件包还从 `openclaw/plugin-sdk/setup-runtime` 导入
`createLegacyCompatChannelDmPolicy` 和
`promptLegacyChannelAllowFromForAccount`。

这些导出仍作为已弃用的运行时兼容适配器提供。新的及重新发布的插件应在本地维护其配置架构和设置策略，并使用
`channel-config-schema` 和 `setup-runtime` 中的通用基础原语。只有在最低支持的已发布软件包版本不再导入这些导出后，才能移除这些兼容性导出。

### 频道设置输入字段兼容性

`ChannelSetupInput` 现在只永久保留跨频道设置信封的类型。频道特定字段仍在已弃用的兼容层中保留类型，以便现有外部插件继续编译，同时插件作者将这些字段迁移到插件本地的设置输入类型中。

OpenClaw 不发布大版本。2026-07-22 的注册表扫描检查了 426 个已发布的树外频道插件，并移除了 21 个没有读取方的字段。保留的 22 个字段各自都有已知的已发布读取方。之后，只要没有已发布插件读取某个字段，就会立即删除该字段；随着插件作者迁移到插件本地的设置输入类型，保留字段集合会逐渐缩小。

同一次扫描还移除了 23 个没有已发布依赖方的旧版未声明适配器提升键。六个常用键和仅用于设置的 `rooms` 键仍然保留。随着已发布插件声明 `singleAccountKeysToMove`，该集合也会逐渐缩小。

共享类型没有索引签名。插件自有的键仍然可以存在于运行时输入对象中；请在插件本地的交叉类型中声明这些键，或通过所属插件的设置 schema 对其进行收窄。

| `code`                                  | `owner`   | `replacement`                                                                                       | 删除条件                                                               |
| --------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `plugin-sdk-channel-setup-input-fields` | `channel` | 将 `ChannelSetupInput` 与声明所属频道字段的插件本地类型进行交叉组合 | 已发布插件注册表扫描中没有读取方时删除字段 |

旧版未声明适配器提升层遵循相同的读取方驱动策略。请声明 `singleAccountKeysToMove`；如果插件不需要额外的提升键，也要声明一个空数组，以便共享回退机制能够逐个键地退役。

#### 验证读取方

1. 使用每个 `nextCursor` 分页访问 `https://clawhub.ai/api/v1/packages?family=code-plugin&limit=100`，保留 `categories` 包含 `channels` 的包。
2. 从 `npm search --json --searchlimit=1000 "openclaw channel plugin"` 添加 npm 候选项。通过 GitHub 代码搜索 `openclaw/plugin-sdk/channel-setup`、`openclaw/plugin-sdk/setup` 和 `openclaw/plugin-sdk/core` 添加仅源代码候选项。
3. 确定每个候选项最新的已发布版本。运行 `npm pack <package>@<version> --json --pack-destination <temp-dir>`，解包后检查其中发布的 `dist` JavaScript 和声明文件，查找直接读取或解构读取字段的代码。当某个包没有 npm 发布版本时，下载 ClawHub 制品。
4. 记录包、版本、字段或提升键，以及匹配的文件。只有当没有任何已发布插件制品读取某个字段或键时，才可以删除它。保持代码中保留字段和键列表旁的读取方名称与扫描结果同步。

这只是源代码/类型兼容性记录。注册表条目的 `removeAfter: 2026-10-01` 表示该日期，但设置输入运行时对象和行为保持不变。该日期用于启动审查；每个字段都会一直保留，直到其已发布制品的读取方数量为零。

使用 `pnpm plugins:boundary-report` 审查当前迁移队列：

| Flag                                                    | Effect                                                                     |
| ------------------------------------------------------- | -------------------------------------------------------------------------- |
| `--summary` (or `pnpm plugins:boundary-report:summary`) | Compact counts instead of full detail.                                     |
| `--json`                                                | Machine-readable report.                                                   |
| `--owner <id>`                                          | Filter to one compatibility owner.                                         |
| `--fail-on-eligible-compat`                             | Exit non-zero on or after a deprecated compat record's `removeAfter` date. |

`pnpm plugins:boundary-report:ci` runs with the compatibility fail flag.
Deprecated records normally have an explicit `removeAfter` date. A contract
tied to a version boundary instead declares a `removalGate`;
`next-plugin-sdk-major` is an approved major-version gate, not a pending owner
decision, and is never date-eligible. A record with neither field appears as
`no-date` and remains ineligible until its owner publishes a gate. The report
displays either the date or named gate, counts local code/doc references, lists
`removal-pending` records with their blockers and surface-token reader
references, and summarizes the private memory-host SDK bridge. Those reader
references are triage signals, not published-artifact proof.

### 媒体旧版投影

`media-legacy-projection` 兼容性记录涵盖旧的并行媒体字段、负载构建器、钩子元数据别名和媒体模板名称。其批准的
`removeAfter` 日期为 **2026-10-01**（即事实优先替代方案发布后的两个发布周期）。此外，届时还必须完成一次干净的已发布插件
制品扫描；请在该日期之前完成迁移。

对于频道入口，将单数/复数的 `MediaPath`、`MediaUrl`、
`MediaType`、`MediaPaths`、`MediaUrls`、`MediaTypes`、
`MediaTranscribedIndexes`、`MediaWorkspaceDir` 和 `MediaStaged` 替换为有序
事实：

```ts
import { toInboundMediaFacts } from "openclaw/plugin-sdk/channel-inbound";

const media = toInboundMediaFacts([
  { path: saved.path, url: nativeUrl, contentType: saved.contentType, messageId },
]);

const ctx = finalizeInboundContext({ Body: caption, media });
```

在 `inbound_claim` 和 `message_received` 钩子中使用 `event.media`。如果远程
媒体尚未在本地暂存，则使用 `event.originalMedia` 进行身份识别/诊断，并等待
`event.media`；`event.mediaStagingPending` 用于区分该状态。不要从
`event.metadata` 中读取已弃用的单数/复数属性。

对于 CLI 媒体模型，将 `{{MediaPath}}`、`{{MediaUrl}}`、`{{MediaType}}`
和 `{{MediaDir}}` 替换为 `{{AttachmentPath}}`、`{{AttachmentUrl}}`、
`{{AttachmentContentType}}` 和 `{{AttachmentDir}}`。当附件位置很重要时，使用
`{{AttachmentIndex}}`。

对于本地媒体读取策略，从
`openclaw/plugin-sdk/media-local-roots` 导入 `getAgentScopedMediaLocalRoots(...)` 或
`getAgentScopedMediaLocalRootsForSources(...)`。`openclaw/plugin-sdk/agent-media-payload`
门面及其 `buildAgentMediaPayload(...)` 投影已弃用。

## 如何迁移

<Steps>
  <Step title="迁移运行时配置加载/写入辅助工具">
    捆绑插件应停止直接调用 `api.runtime.config.loadConfig()` 和 `api.runtime.config.writeConfigFile(...)`。优先使用已传入当前调用路径的配置。需要当前进程快照的长生命周期处理程序可以使用 `api.runtime.config.current()`。需要读取当前配置的长生命周期代理工具应在 `execute` 内调用 `ctx.getRuntimeConfig()`，这样即使工具是在配置写入之前创建的，也能看到刷新的配置。

    配置写入通过事务辅助工具完成，并明确指定写入后的策略：

    ```typescript
    await api.runtime.config.mutateConfigFile({
      afterWrite: { mode: "auto" },
      mutate(draft) {
        draft.plugins ??= {};
      },
    });
    ```

    当变更需要干净地重启网关时，使用 `afterWrite: { mode: "restart", reason: "..." }`；仅当调用方负责后续操作并且有意抑制重新加载规划器时，才使用 `afterWrite: { mode: "none", reason: "..." }`。变更结果包含一个供测试和日志记录使用的类型化 `followUp` 摘要；网关仍负责执行或安排重启。

    `loadConfig` 和 `writeConfigFile` 已从插件运行时中移除。捆绑插件和仓库运行时代码受到
    `pnpm check:deprecated-api-usage` 以及
    `pnpm check:no-runtime-action-load-config` 的保护：新的生产插件用法会直接失败，直接配置写入会失败，网关服务器方法必须使用请求运行时快照，运行时通道发送/操作/客户端辅助工具必须从其边界接收配置，并且长生命周期运行时模块允许存在的环境隐式 `loadConfig()` 调用数量为零。

    新插件代码应避免使用宽泛的 `openclaw/plugin-sdk/config-runtime`
    统一入口。应根据具体任务使用范围更窄的子路径：

    | 需求 | 导入 |
    | --- | --- |
    | `OpenClawConfig` 等配置类型 | `openclaw/plugin-sdk/config-contracts` |
    | 插件入口配置查找 | `api.pluginConfig` |
    | 配置合并 | 配置边界处的插件本地逻辑 |
    | 当前运行时快照读取 | `openclaw/plugin-sdk/runtime-config-snapshot` |
    | 配置写入 | `openclaw/plugin-sdk/config-mutation` |
    | 会话存储辅助工具 | `openclaw/plugin-sdk/session-store-runtime` |
    | Markdown 表格配置 | `openclaw/plugin-sdk/markdown-table-runtime` |
    | 群组策略运行时辅助工具 | `openclaw/plugin-sdk/runtime-group-policy` |
    | 秘密输入解析 | `openclaw/plugin-sdk/secret-input-runtime` |
    | 模型/会话覆盖项 | `openclaw/plugin-sdk/model-session-runtime` |

    捆绑插件及其测试受到扫描器保护，不得使用宽泛的统一入口，因此导入和模拟对象会保持在所需行为的本地范围内。
    该统一入口仍为外部兼容性而保留，但新代码不应依赖它。

  </Step>

  <Step title="将嵌入式工具结果扩展迁移到中间件">
    捆绑插件必须将仅适用于嵌入式运行器的
    `api.registerEmbeddedExtensionFactory(...)` 工具结果处理程序替换为
    与运行时无关的中间件：

    ```typescript
    // OpenClaw 运行时工具和 Codex 运行时动态工具（结果可能会被转换）。
    // Codex 原生工具结果也会被转发以供观察，
    // 但其转换后的输出永远不会到达模型：Codex 的 PostToolUse 钩子契约
    // 无法替代原生工具响应。
    api.registerAgentToolResultMiddleware(async (event) => {
      return compactToolResult(event);
    }, {
      runtimes: ["openclaw", "codex"],
    });
    ```

    同时更新插件清单：

    ```json
    {
      "contracts": {
        "agentToolResultMiddleware": ["openclaw", "codex"]
      }
    }
    ```

    在明确启用且每个目标运行时都已在
    `contracts.agentToolResultMiddleware` 中声明的情况下，已安装的插件也可以注册工具结果中间件。未声明的已安装中间件注册会被拒绝。

  </Step>

  <Step title="将审批原生处理程序迁移到能力事实">
    支持审批的通道插件通过
    `approvalCapability.nativeRuntime` 以及共享的运行时上下文注册表来公开原生审批行为：

    - 将 `approvalCapability.handler.loadRuntime(...)` 替换为
      `approvalCapability.nativeRuntime`。
    - 将审批专用的身份验证/投递逻辑从旧的 `plugin.auth` /
      `plugin.approvals` 接线迁移到 `approvalCapability`。
    - `ChannelPlugin.approvals` 已从公开的通道插件契约中移除；将投递/原生/渲染字段迁移到
      `approvalCapability`。
    - `plugin.auth` 仅用于通道登录/注销流程；核心不再从那里读取审批身份验证钩子。
    - 通过 `openclaw/plugin-sdk/channel-runtime-context`
      注册通道拥有的运行时对象（客户端、令牌、Bolt 应用）。
    - 不要从原生审批处理程序发送插件拥有的重新路由通知；核心负责根据实际投递结果发出已路由到其他位置的通知。
    - 将 `channelRuntime` 传入 `createChannelManager(...)` 时，应提供真实的
      `createPluginRuntime().channel` 接口；不完整的存根会被拒绝。

    当前的审批能力布局请参阅[通道插件](/plugins/sdk-channel-plugins)。

  </Step>

  <Step title="审查 Windows 包装器回退行为">
    如果你的插件使用 `openclaw/plugin-sdk/windows-spawn`，未解析的 Windows
    `.cmd`/`.bat` 包装器现在会默认安全失败，除非你明确传入
    `allowShellFallback: true`：

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

  <Step title="查找已弃用的导入">
    ```bash
    grep -r "plugin-sdk/compat" my-plugin/
    grep -r "plugin-sdk/infra-runtime" my-plugin/
    grep -r "plugin-sdk/config-runtime" my-plugin/
    grep -r "openclaw/extension-api" my-plugin/
    ```
  </Step>

  <Step title="替换为聚焦导入">
    旧门面中的每个导出都对应一个具体的现代导入路径：

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

    对于主机端辅助工具，应使用注入的插件运行时，而不是直接导入：

    ```typescript
    // 之前（已弃用的 extension-api 桥接）
    import { runEmbeddedAgent } from "openclaw/extension-api";
    const result = await runEmbeddedAgent({ sessionId, prompt });

    // 之后（注入的运行时）
    const result = await api.runtime.agent.runEmbeddedAgent({ sessionId, prompt });
    ```

    其他旧版桥接辅助工具也采用相同模式：

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
    `openclaw/plugin-sdk/infra-runtime` 仍为外部兼容性而保留，但新代码应使用实际所需的受支持接口：

    | 需求 | 替代项 |
    | --- | --- |
    | 新系统事件生产者 | `api.runtime.system.enqueueSystemEvent` |
    | 心跳唤醒、事件和可见性辅助工具 | `openclaw/plugin-sdk/heartbeat-runtime` |
    | 待处理投递队列排空 | `openclaw/plugin-sdk/delivery-queue-runtime` |
    | 通道活动遥测 | `openclaw/plugin-sdk/channel-activity-runtime` |
    | 内存及持久化后端去重缓存 | `openclaw/plugin-sdk/dedupe-runtime` |
    | 安全的本地文件/媒体路径辅助工具 | `openclaw/plugin-sdk/file-access-runtime` |
    | 感知调度器的 fetch | `openclaw/plugin-sdk/runtime-fetch` |
    | 代理和受保护的 fetch 辅助工具 | `openclaw/plugin-sdk/fetch-runtime` |
    | SSRF 调度器策略类型 | `openclaw/plugin-sdk/ssrf-dispatcher` |
    | 审批请求/解析类型 | `openclaw/plugin-sdk/approval-runtime` |
    | 审批回复负载和命令辅助工具 | `openclaw/plugin-sdk/approval-reply-runtime` |
    | 错误格式化辅助工具 | `openclaw/plugin-sdk/error-runtime` |
    | 传输就绪等待 | `openclaw/plugin-sdk/transport-ready-runtime` |
    | 安全令牌辅助工具 | `openclaw/plugin-sdk/secure-random-runtime` |
    | 有界异步任务并发 | `openclaw/plugin-sdk/concurrency-runtime` |
    | 可证明不变量所需的值断言 | `openclaw/plugin-sdk/expect-runtime` |
    | 数值强制转换 | `openclaw/plugin-sdk/number-runtime` |
    | 进程本地异步锁 | `openclaw/plugin-sdk/async-lock-runtime` |
    | 文件锁 | `openclaw/plugin-sdk/file-lock` |

    系统事件快照检查和消费辅助工具仍仅通过已弃用的
    `openclaw/plugin-sdk/infra-runtime` 兼容性接口提供；没有现代公开替代项。当前快照携带一个用于标识某个排队事件的非透明 `id`。将快照返回以供消费时，应在复制和序列化过程中保留该标识。没有 ID 的旧调用方仍保留结构匹配行为，但在队列发生变化后可能出现歧义。不要将该 ID 视为持久标识，也不要认为它在重启后仍然有效。

    文件锁嵌套的作用域为所有者。仅在同一逻辑操作中的嵌套获取时传入相同的 `reentrantOwner`；普通加锁时省略该参数。绝不要使用进程范围的常量，否则不相关的工作会错误地共享同一个临界区。

    捆绑插件受到扫描器保护，不得使用 `infra-runtime`，因此仓库代码无法回退到宽泛的统一入口。

  </Step>

  <Step title="迁移通道路由辅助工具">
    新的通道路由代码使用 `openclaw/plugin-sdk/channel-route`。较旧的路由键名称仍作为兼容性别名保留：

    | 旧辅助工具 | 现代辅助工具 |
    | --- | --- |
    | `channelRouteIdentityKey(...)` | `channelRouteDedupeKey(...)` |
    | `channelRouteKey(...)` | `channelRouteCompactKey(...)` |

    现代路由辅助工具会在原生审批、回复抑制、入站去重、
    cron 投递和会话路由中一致地规范化 `{ channel, to, accountId, threadId }`。

    不要从 `plugin-sdk/channel-route` 新增对
    `ChannelMessagingAdapter.parseExplicitTarget` 或
    `resolveChannelRouteTargetWithParser(...)` 的使用——这些 API 已弃用，仅为旧插件保留。新的通道插件应使用
    `messaging.targetResolver.resolveTarget(...)` 进行目标 ID 规范化和目录未命中回退，
    在核心需要提前获取对端类型时使用
    `messaging.inferTargetChatType(...)`，
    并使用 `messaging.resolveOutboundSessionRoute(...)` 获取提供商原生的会话和线程标识。

  </Step>

  <Step title="构建并测试">
    ```bash
    pnpm build
    pnpm test my-plugin/
    ```
  </Step>
</Steps>

## 导入路径参考

公共包导出映射是可导入 SDK 子路径的唯一依据。请使用从 [SDK 概览](/plugins/sdk-overview) 链接的主题 SDK 指南，并优先选择文档中最窄的公共子路径。`scripts/lib/plugin-sdk-entrypoints.json` 中的编译器清单还包含用于构建捆绑插件的私有本地条目；这些条目出现在其中，并不意味着它们是公共包导出项。

此表是常见的迁移子集，并非完整的 SDK 范围。编译器入口点清单位于 `scripts/lib/plugin-sdk-entrypoints.json`；包导出项由公共子集生成。

除明确记录的兼容性外观（例如已弃用的 `plugin-sdk/discord` shim，它仍为直接导入已发布 `@openclaw/discord` 包的外部插件保留）之外，捆绑插件专用的辅助接口已从公共 SDK 导出映射中移除。特定所有者的辅助工具位于所属插件包内部；共享的宿主行为则通过通用 SDK 契约（例如 `plugin-sdk/gateway-runtime`、`plugin-sdk/security-runtime`）以及注入的插件 API 传递。

请使用与任务匹配的最窄导入路径。如果找不到某个导出项，请检查 `src/plugin-sdk/` 中的源代码，或询问维护者应由哪个通用契约负责。

## 已移除的兼容性接口

2026 年 7 月的清理移除了根 SDK 和兼容性 barrel、扩展 API 桥接、已过期的 SDK 子路径别名、未使用的 SDK 子路径，以及仅供打包使用的 SDK 模块的公开导出。仅供打包使用的模块仍可通过私有本地构建映射供其仓库所有者使用；它们无法从已发布的软件包中导入。

### 进程全局 API 提供者发布

`registerApiProvider(...)` 和 `unregisterApiProviders(...)` 已从
`openclaw/plugin-sdk/llm` 中移除。它们会将 API 传输发布到进程全局状态中，而由生命周期管理的模型运行时随后必须将这些传输复制到每个已准备好的注册表中。

提供者插件应通过 `api.registerProvider(...)` 注册文本推理提供者。构造
`ApiRegistry` 的宿主代码和测试应直接在该注册表上进行注册，以便提供者的所有权和清理范围保持在已准备好的运行时内。

### deactivate 钩子别名

`api.on("deactivate", handler)` 兼容性别名已移除。请使用 `gateway_stop` 注册相同的关闭清理逻辑：

```typescript
// Before
api.on("deactivate", async (event, ctx) => {
  await stopPluginService(ctx);
});

// After
api.on("gateway_stop", async (event, ctx) => {
  await stopPluginService(ctx);
});
```

### 私有测试 barrel

`openclaw/plugin-sdk/testing` 仅限仓库本地使用，并且被排除在已发布的软件包构件之外，因此在其 2026-07-28 的 `removeAfter` 日期之前被移除。仓库测试使用诸如
`plugin-sdk/plugin-test-runtime`、`plugin-sdk/channel-test-helpers`、
`plugin-sdk/channel-target-testing`、`plugin-sdk/test-env` 和
`plugin-sdk/test-fixtures` 等专用子路径。

## 迁移参考

这些映射涵盖已移除的 2026 年 7 月接口，以及后续窗口期内仍处于活跃状态的弃用项。映射是迁移指南，并不表示旧接口仍然可用；当前状态请参考兼容性注册表和移除时间线。

<AccordionGroup>
  <Accordion title="command-auth 帮助构建器 -> command-status">
    **旧** (`openclaw/plugin-sdk/command-auth`)：`buildCommandsMessage`、
    `buildCommandsMessagePaginated`、`buildHelpMessage`。

    **新** (`openclaw/plugin-sdk/command-status`)：签名相同，但从更精简的子路径导入。`command-auth` 的兼容性重新导出已被移除。

    ```typescript
    // 之前
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-auth";

    // 之后
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-status";
    ```

  </Accordion>

  <Accordion title="提及门控辅助函数 -> resolveInboundMentionDecision">
    **旧**：来自 `openclaw/plugin-sdk/channel-inbound` 或
    `openclaw/plugin-sdk/channel-mention-gating` 的
    `resolveMentionGating(params)` 和
    `resolveMentionGatingWithBypass(params)`。

    **新**：`resolveInboundMentionDecision({ facts, policy })` —— 使用一个决策对象，而不是两种拆分的调用形式。

    已应用于 Discord、iMessage、Matrix、MS Teams、QQBot、Signal、
    Telegram、WhatsApp 和 Zalo。Slack 自身的 `app_mention` 事件模型不使用此辅助函数。

  </Accordion>

  <Accordion title="通道运行时 shim 和通道操作辅助函数">
    `openclaw/plugin-sdk/channel-runtime` 已被移除。注册运行时对象时，请使用
    `openclaw/plugin-sdk/channel-runtime-context`。

    `openclaw/plugin-sdk/channel-actions` 中的原生消息 schema 辅助函数已随原始“actions”通道导出一并移除。请改为通过语义化的 `presentation` 接口暴露能力——通道插件声明它们渲染的内容（卡片、按钮、选择器），而不是声明它们接受哪些原始操作名称。

  </Accordion>

  <Accordion title="Web 搜索 provider 的 tool() 辅助函数 -> 插件上的 createTool()">
    **旧**：来自 `openclaw/plugin-sdk/provider-web-search` 的
    `tool()` 工厂函数。

    **新**：直接在 provider 插件上实现 `createTool(...)`。
    OpenClaw 不再需要 SDK 辅助工具来注册工具包装器。

  </Accordion>

  <Accordion title="纯文本通道信封 -> BodyForAgent">
    **旧**：使用 `api.runtime.channel.reply.formatInboundEnvelope(...)`（以及入站消息对象上的
    `channelEnvelope` 字段），从入站通道消息构建扁平的纯文本提示信封。

    **新**：使用 `BodyForAgent` 加上结构化的用户上下文块。通道插件将路由元数据（线程、主题、回复目标、反应）作为类型化字段附加，而不是将其拼接到提示字符串中。`formatAgentEnvelope(...)` 辅助函数仍支持为面向 assistant 的合成信封提供服务，但入站纯文本信封即将退出。

    受影响的区域：`inbound_claim`、`message_received`，以及任何对旧信封文本进行后处理的自定义通道插件。

  </Accordion>

  <Accordion title="subagent_spawning hook -> core thread binding">
    **旧**：`api.on("subagent_spawning", handler)` 返回
    `threadBindingReady` 或 `deliveryOrigin`。

    **新**：让核心通过通道会话绑定适配器准备 `thread: true` 的子 agent 绑定。仅使用 `api.on("subagent_spawned", handler)` 进行启动后的观察。

    ```typescript
    // 之前
    api.on("subagent_spawning", async () => ({
      status: "ok",
      threadBindingReady: true,
      deliveryOrigin: { channel: "discord", to: "channel:123", threadId: "456" },
    }));

    // 之后
    api.on("subagent_spawned", async (event) => {
      await observeSubagentLaunch(event);
    });
    ```

    在外部插件迁移期间，`subagent_spawning`、
    `PluginHookSubagentSpawningEvent`、
    `PluginHookSubagentSpawningResult` 和
    `SubagentLifecycleHookRunner.runSubagentSpawning(...)` 仅作为已弃用的兼容性接口保留，并将在 2026-08-30 之后移除。

  </Accordion>

  <Accordion title="Provider 发现类型 -> provider catalog 类型">
    四个发现类型别名现在是 catalog 时代类型的薄封装：

    | 旧别名                    | 新类型                    |
    | ------------------------- | ------------------------- |
    | `ProviderDiscoveryOrder`  | `ProviderCatalogOrder`    |
    | `ProviderDiscoveryContext`| `ProviderCatalogContext`  |
    | `ProviderDiscoveryResult` | `ProviderCatalogResult`   |
    | `ProviderPluginDiscovery` | `ProviderPluginCatalog`   |

    这些别名以及旧版的 `ProviderCapabilities` 静态容器已被移除。Provider 插件应使用明确的 provider 钩子，例如 `buildReplayPolicy`、
    `normalizeToolSchemas` 和 `wrapStreamFn`，而不是使用静态对象。

  </Accordion>

  <Accordion title="Thinking 策略钩子 -> resolveThinkingProfile">
    **旧**（`ProviderThinkingPolicy` 上的三个独立钩子）：
    `isBinaryThinking(ctx)`、`supportsXHighThinking(ctx)` 和
    `resolveDefaultThinkingLevel(ctx)`。

    **新**：使用单一的 `resolveThinkingProfile(ctx)`，返回包含规范化 `id`、可选 `label` 以及按优先级排列的等级列表的 `ProviderThinkingProfile`。OpenClaw 会根据 profile 排名自动降级过时的已存储值。

    上下文包含 `provider`、`modelId`、可选合并的 `reasoning`，
    以及可选合并的模型 `compat` 事实。Provider 插件可以使用这些
    catalog 事实，仅在配置的请求契约支持时暴露模型特定的 profile。

    实现一个钩子，而不是三个。旧钩子已被移除。

  </Accordion>

  <Accordion title="外部 auth provider -> contracts.externalAuthProviders">
    **旧**：实现外部 auth 钩子，但未在插件清单中声明 provider。

    **新**：在插件清单中声明 `contracts.externalAuthProviders`
    **并且**实现 `resolveExternalAuthProfiles(...)`。

    ```json
    {
      "contracts": {
        "externalAuthProviders": ["anthropic", "openai"]
      }
    }
    ```

  </Accordion>

  <Accordion title="Provider 环境变量查找 -> setup.providers[].envVars">
    **旧**清单字段：`providerAuthEnvVars: { anthropic: ["ANTHROPIC_API_KEY"] }`。

    **新**：在清单的 `setup.providers[].envVars` 中映射相同的环境变量查找信息。这样可以将设置和状态环境元数据集中到一处，并避免仅为回答环境变量查找请求而启动插件运行时。

    `providerAuthEnvVars` 不再被接受。

  </Accordion>

  <Accordion title="Memory 插件注册 -> registerMemoryCapability">
    **旧**：三个独立调用——`api.registerMemoryPromptSection(...)`、
    `api.registerMemoryFlushPlan(...)`、`api.registerMemoryRuntime(...)`。

    **新**：在 memory-state API 上一次调用：
    `registerMemoryCapability(pluginId, { promptBuilder, flushPlanResolver, runtime })`。

    槽位保持不变，但改为单次注册调用。增量式提示和语料辅助工具
    (`registerMemoryPromptSupplement`, `registerMemoryCorpusSupplement`) 不受影响。

  </Accordion>

  <Accordion title="Memory embedding provider API">
    **旧**：`api.registerMemoryEmbeddingProvider(...)` 加上
    `contracts.memoryEmbeddingProviders`。

    **新**：`api.registerEmbeddingProvider(...)` 加上
    `contracts.embeddingProviders`。

    通用 embedding provider 契约可复用于 memory 之外的场景，是新 provider 的受支持路径。面向 memory 的专用注册 API 在现有 provider 迁移期间仍作为已弃用的兼容性接口保留并接入。插件检查会将非捆绑使用报告为兼容性债务。

  </Accordion>

  <Accordion title="原始通道发送结果 -> OutboundDeliveryResult">
    **旧**：通过 `ChannelSendRawResult` 返回 `{ ok, messageId, error }`，
    并使用 `createRawChannelSendResultAdapter(...)` 对其进行规范化。

    **新**：返回 `OutboundDeliveryResult` 字段，并使用
    `createAttachedChannelResultAdapter(...)` 附加通道。发送失败时应抛出异常，而不是返回错误字符串。原始结果类型在下一个 plugin-SDK 主版本发布前仍可用。

  </Accordion>

  <Accordion title="子 agent 会话消息类型重命名">
    两个旧版类型别名仍从 `src/plugins/runtime/types.ts` 导出：

    | 旧                           | 新                                |
    | ---------------------------- | --------------------------------- |
    | `SubagentReadSessionParams`   | `SubagentGetSessionMessagesParams` |
    | `SubagentReadSessionResult`   | `SubagentGetSessionMessagesResult` |

    运行时方法 `readSession` 已弃用，建议改用 `getSessionMessages`。签名相同；旧方法会转调新方法。

  </Accordion>

  <Accordion title="已移除的会话和 transcript 文件 API">
    SQLite 会话/transcript 切换移除或弃用了面向插件的 API，这些 API 会暴露活动的 `sessions.json` 存储、JSONL transcript 路径或会话文件列表。运行时插件应使用会话身份和 SDK 运行时辅助函数，而不是解析或修改活动文件。

    | 迁移接口 | 替代方案 |
    | ------- | -------- |
    | 已弃用的 `loadSessionStore(...)`、`updateSessionStore(...)` 和 `resolveSessionStoreEntry(...)`，包括包根目录中的 `loadSessionStore(...)` | `getSessionEntry(...)`、`listSessionEntries(...)` 以及行级会话修改。 |
    | 已弃用的 `resolveSessionFilePath(...)` | 会话身份（`sessionKey`、`sessionId` 和 SDK 运行时目标辅助函数），以及操作当前会话的 Gateway 方法。 |
    | 已弃用的包根目录 `saveSessionStore(...)` 以及已移除的 SDK 文件存储写入 | 由 Gateway 所有的会话运行时 API；插件代码应通过文档化的运行时/上下文辅助函数请求或修改会话状态，而不是写入活动存储文件。 |
    | 已移除的 `resolveSessionTranscriptPathInDir(...)` 和 `resolveAndPersistSessionFile(...)` | 会话身份，以及操作当前会话的 Gateway 方法。 |
    | `readLatestAssistantTextFromSessionTranscript(...)` | 当前运行时上下文暴露的、基于身份的 transcript 读取器；如果插件不在 transcript 所有者路径中，则使用 Gateway 历史记录/会话方法。 |
    | `SessionTranscriptUpdate.sessionFile` | 包含 `agentId`、`sessionKey` 和 `sessionId` 的 `SessionTranscriptUpdate.target`。 |
    | `sessionFiles` 等 Memory 同步输入 | 由宿主提供的、基于身份的 transcript/会话源；不要为活动会话遍历 JSONL 文件。 |
    | 活动会话中名为 `transcriptPath` 或 `sessionFile` 的运行时选项 | 携带与存储无关的会话身份的 `sessionTarget`/运行时目标对象。 |

    旧版 JSONL transcript 文件仍可作为导入、归档、导出和支持工件使用。但它们不再是活动会话的稳态运行时契约。

    使用 `v2026.7.1-beta.5` 发布的官方插件导入了上述四个已弃用的辅助函数。`openclaw/plugin-sdk/session-store-runtime` 会在 2026-10-12 前保留这一精确桥接；新插件必须使用替代方案。`resolveStorePath(...)` 仍是受支持的 SDK 辅助函数，不属于此次弃用范围。

    `openclaw plugins inspect --all --runtime` 会报告非捆绑插件中加载错误或诊断信息仍引用这些已移除文件 API 的情况。`@openclaw/plugin-inspector` 的建议扫描必须使用 `0.3.17` 或更高版本，这样外部包扫描也会在发布前标记完整存储会话辅助函数、会话文件路径辅助函数、旧版 transcript 文件目标和底层 transcript 辅助函数。

  </Accordion>

  <Accordion title="Agent harness 尝试参数 -> V2 宿主能力契约">
    新建或更新的 harness 插件应实现 `AgentHarnessV2`，并使用
    `AgentHarnessAttemptParamsV2`、`EmbeddedRunAttemptParamsV2` 或
    `AgentHarnessSideQuestionParamsV2`。V2 参数类型要求包含
    `hostCapabilities`，与核心在选定 harness 边界处提供的内容一致。采用这些 V2 契约的插件必须在其包清单中声明
    `openclaw.compat.pluginApi: ">=2026.8.1"`（或更高的最低版本），以便旧版宿主在加载插件前拒绝该插件。

    现有插件可以继续实现 `AgentHarness`，并在 2026-10-12 之前构造不含该字段的
    `AgentHarnessAttemptParams`、`EmbeddedRunAttemptParams` 或
    `AgentHarnessSideQuestionParams` 类型。这些契约仅为保持源码兼容性而使能力字段可选；它们不会创建无能力的运行时路径。迁移时，请更改导入的类型名称，并通过
    `params.hostCapabilities` 绑定工具或原生操作接口。

  </Accordion>

  <Accordion title="runtime.tasks.flow -> runtime.tasks.managedFlows">
    **旧**：`runtime.tasks.flow`（单数）返回实时任务流访问器。

    **新**：`runtime.tasks.managedFlows` 为创建、更新、取消或从流程中运行子任务的插件保留受管理的 TaskFlow 变更运行时。如果插件只需要基于 DTO 的读取，请使用 `runtime.tasks.flows`。

    ```typescript
    // 之前
    const flow = api.runtime.tasks.flow.fromToolContext(ctx);
    // 之后
    const flow = api.runtime.tasks.managedFlows.fromToolContext(ctx);
    ```

    旧版别名已于 2026 年 7 月移除。

  </Accordion>

  <Accordion title="嵌入式扩展工厂 -> agent 工具结果中间件">
    上文的[如何迁移](#how-to-migrate)部分已有介绍。此处列出以保持完整：已移除的、仅供嵌入式运行器使用的
    `api.registerEmbeddedExtensionFactory(...)` 路径，替换为
    `api.registerAgentToolResultMiddleware(...)`，并在
    `contracts.agentToolResultMiddleware` 中显式列出运行时。

  </Accordion>

  <Accordion title="OpenClawSchemaType 别名 -> OpenClawConfig">
    根 SDK 中的 `OpenClawSchemaType` 别名已被移除。请使用规范的
    `OpenClawConfig` 名称。

    ```typescript
    // 之前
    import type { OpenClawSchemaType } from "openclaw/plugin-sdk";
    // 之后
    import type { OpenClawConfig } from "openclaw/plugin-sdk/config-contracts";
    ```

  </Accordion>
</AccordionGroup>

<Note>
扩展级弃用项（位于 `extensions/` 下捆绑通道/provider 插件内部）会在它们自己的 `api.ts` 和 `runtime-api.ts`
总入口中跟踪。它们不影响第三方插件契约，也不会在这里列出。如果你直接消费某个捆绑插件的本地总入口，请先阅读该总入口中的弃用注释再升级。
</Note>

## Talk 与实时语音迁移

实时语音、电话、会议和浏览器 Talk 代码共享一个由 `openclaw/plugin-sdk/realtime-voice` 导出的 Talk 会话控制器。该控制器负责通用的 Talk 事件封装、活动轮次状态、采集状态、输出音频状态、近期事件历史记录以及过期轮次拒绝。提供商插件负责供应商特定的实时会话。浏览器会议插件使用 `openclaw/plugin-sdk/meeting-runtime` 处理会话、浏览器、音频、节点主机、代理咨询和语音通话机制，然后实现 `MeetingPlatformAdapter` 来处理 URL 规则、DOM 脚本、手动操作映射、字幕、创建和拨入计划。平台 REST API、OAuth、工件、选择器和通信名称仍保留在插件中。浏览器权限计划会接收请求的会议 URL，因此每个平台只能授予其确切支持的来源。会话运行时还必须在确认离开浏览器后规范化平台特定的实时健康状态；历史转录字段可以保留，但离开后字幕和音频就绪状态不得继续保持活动。

所有内置界面都运行在共享控制器上：浏览器中继、托管房间交接、语音通话实时功能、语音通话流式 STT、Google Meet 实时功能以及原生按键通话。Gateway 在 `hello-ok.features.events` 中公布一个实时 Talk 事件通道：`talk.event`。

除非是在实现低级适配器或测试夹具，否则新代码不应直接调用 `createTalkEventSequencer(...)`。请使用共享控制器，以确保没有轮次 ID 就无法发出轮次范围事件，过期的 `turnEnd` / `turnCancel` 调用不会清除较新的活动轮次，并确保输出音频生命周期事件在电话、会议、浏览器中继、托管房间交接和原生 Talk 客户端之间保持一致。

公共 API 形式：

```typescript
// Gateway 所有的 Talk 会话 API。
await gateway.request("talk.session.create", {
  mode: "realtime",
  transport: "gateway-relay",
  brain: "agent-consult",
  sessionKey: "main",
});
await gateway.request("talk.session.appendAudio", { sessionId, audioBase64 });
await gateway.request("talk.session.cancelOutput", { sessionId, reason: "barge-in" });
await gateway.request("talk.session.submitToolResult", {
  sessionId,
  callId,
  result: { status: "working" },
  options: { willContinue: true },
});
await gateway.request("talk.session.submitToolResult", {
  sessionId,
  callId,
  result: { status: "already_delivered" },
  options: { suppressResponse: true },
});
await gateway.request("talk.session.submitToolResult", { sessionId, callId, result });
await gateway.request("talk.session.close", { sessionId });

// 客户端所有的提供商会话 API。
await gateway.request("talk.client.create", {
  mode: "realtime",
  transport: "webrtc",
  brain: "agent-consult",
  sessionKey: "main",
});
await gateway.request("talk.client.toolCall", { sessionKey, callId, name, args });
await gateway.request("talk.client.steer", { sessionKey, text, mode: "steer" });
```

浏览器所有的 WebRTC/提供商 WebSocket 会话使用 `talk.client.create`，因为浏览器负责提供商协商和媒体传输，而 Gateway 负责凭据、指令和工具策略。`talk.session.*` 是 Gateway 管理的通用界面，适用于 Gateway 中继实时会话、Gateway 中继转录会话以及托管房间原生 STT/TTS 会话。

将实时选择器放置在 `talk.provider` / `talk.providers` 旁边的旧版配置，应使用 `openclaw doctor --fix` 修复；运行时 Talk 不会将语音/TTS 提供商配置重新解释为实时提供商配置。

受支持的 `talk.session.create` 组合刻意保持精简：

| 模式             | 传输方式          | 大脑             | 所有者             | 备注                                                                                                               |
| ---------------- | ----------------- | ---------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `realtime`       | `gateway-relay`   | `agent-consult`  | Gateway            | 通过 Gateway 中继的全双工提供商音频；工具调用通过 agent-consult 工具路由。                                          |
| `transcription`  | `gateway-relay`   | `none`           | Gateway            | 仅流式 STT；调用方发送输入音频并接收转录事件。                                                                     |
| `stt-tts`        | `managed-room`    | `agent-consult`  | 原生/客户端房间    | 按键通话和对讲机风格的房间，客户端负责采集/播放，Gateway 负责轮次状态。                                             |
| `stt-tts`        | `managed-room`    | `direct-tools`   | 原生/客户端房间    | 仅限管理员的房间模式，适用于直接执行 Gateway 工具操作的受信任第一方界面。                                           |

供从旧版 `talk.realtime.*` / `talk.transcription.*` / `talk.handoff.*` 系列（现已全部移除）迁移的读者参考的方法映射：

| 旧版                              | 新版                                                  |
| -------------------------------- | ---------------------------------------------------- |
| `talk.realtime.session`          | `talk.client.create`                                 |
| `talk.realtime.toolCall`         | `talk.client.toolCall`                               |
| `talk.realtime.relayAudio`       | `talk.session.appendAudio`                           |
| `talk.realtime.relayCancel`      | `talk.session.cancelOutput`                          |
| `talk.realtime.relayToolResult`  | `talk.session.submitToolResult`                      |
| `talk.realtime.relayStop`        | `talk.session.close`                                 |
| `talk.transcription.session`     | `talk.session.create({ mode: "transcription" })`     |
| `talk.transcription.relayAudio`  | `talk.session.appendAudio`                           |
| `talk.transcription.relayCancel` | `talk.session.close`                                 |
| `talk.transcription.relayStop`   | `talk.session.close`                                 |
| `talk.handoff.create`            | `talk.session.create({ transport: "managed-room" })` |
| `talk.handoff.revoke`            | `talk.session.close`                                 |

统一的控制词汇同样刻意保持精简：

| 方法                            | 适用范围                                                | 合约                                                                                                                                                                                                                      |
| ------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `talk.session.appendAudio`      | `realtime/gateway-relay`、`transcription/gateway-relay` | 将一个 base64 PCM 音频块追加到由同一 Gateway 连接拥有的提供商会话中。                                                                                                                             |
| `talk.session.cancelOutput`     | `realtime/gateway-relay`                                | 停止助手音频输出，但不一定结束用户轮次。                                                                                                                                                     |
| `talk.session.submitToolResult` | `realtime/gateway-relay`                                | 在其桥接公开的任何异步完成之后完成提供商工具调用；传递 `options.willContinue` 以获取中间输出，或者在受支持时传递 `options.suppressResponse` 以避免另一个助手响应。 |
| `talk.session.steer`            | 由代理支持的 Talk 会话                              | 向从 Talk 会话解析的活动嵌入式运行发送语音 `status`、`steer`、`cancel` 或 `followup` 控制。                                                                                                 |
| `talk.session.close`            | 所有统一会话                                    | 停止中继会话或撤销托管房间状态，然后忘记统一会话 ID。                                                                                                                                     |

不要为了实现此功能而在核心代码中引入提供商或平台特殊处理。核心代码负责 Talk 会话语义。提供商插件负责供应商会话设置。语音通话和 Google Meet 负责电话/会议适配器。浏览器和原生应用负责设备采集/播放体验。

## 移除时间线

| 时间                                        | 发生的情况                                                                                                                              |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **现在**                                     | 可发出警告的已弃用接口会发出运行时警告；仓库防护措施会拒绝核心和捆绑插件导入已弃用的 SDK 接口 |
| **等待所有者决策**                  | 没有 `removeAfter` 或 `removalGate` 的记录仍保持已弃用状态，在其所有者发布门控之前不具备移除资格 |
| **每条兼容性记录的 `removeAfter` 日期** | 该日期对应的接口具备移除资格；在该日期当天或之后，`pnpm plugins:boundary-report --fail-on-eligible-compat` 会使 CI 失败 |
| **下一个 Plugin SDK 主版本**                   | `inbound-reply-dispatch` 将达到其明确的 `next-plugin-sdk-major` 门控；在该版本边界之前，它不具备按日期移除的资格 |

以下剩余的公共 SDK 子路径均有注册表支持的移除窗口。
7 月 30 日的条目已在早期获得维护者授权的清理中移除：
未使用的子路径已删除，较早的兼容性别名已删除，
仅随内置模块使用的模块已降级为私有本地构建映射。

8 月 15 日的兼容性子路径 `agent-config-primitives`、
`channel-logging`、`channel-secret-runtime`、`channel-streaming`、
`group-access`、`matrix`、`text-runtime` 和 `zod` 已于 2026 年 8 月在
SDK 所有者明确批准下提前停用。请使用[Plugin SDK 子路径目录](/plugins/sdk-subpaths)中的专用替代项，并直接从 `zod` 包导入 `zod`。`inbound-reply-dispatch` 将继续可用，直到下一个 Plugin SDK 主版本。

| 移除门控            | 层级                               | SDK 子路径                                                                                                                                                                        |
| ----------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `2026-09-01`            | 较早的兼容性弃用 | `channel-lifecycle`、`channel-message`、`channel-reply-pipeline`、`config-runtime`、`infra-runtime`                                                                                 |
| `next-plugin-sdk-major` | 主版本兼容性门控   | `inbound-reply-dispatch`                                                                                                                                                            |
| `2026-10-01`            | 媒体旧版投影            | `agent-media-payload`，以及非子路径的 `MsgContext Media*` 字段、通道入站媒体负载构建器、`buildMediaPayload`、钩子媒体别名和 `{{Media*}}` 模板 |

所有核心插件都已完成迁移。外部插件应在下一个主要版本发布前完成迁移。运行
`pnpm plugins:boundary-report`，即可查看你所使用接口中哪些兼容性记录最早到期。

## 相关内容

- [入门指南](/plugins/building-plugins) - 构建你的第一个插件
- [SDK 概览](/plugins/sdk-overview) - 完整的子路径导入参考
- [频道插件](/plugins/sdk-channel-plugins) - 构建频道插件
- [提供商插件](/plugins/sdk-provider-plugins) - 构建提供商插件
- [插件内部机制](/plugins/architecture) - 架构深度解析
- [插件清单](/plugins/manifest) - 清单模式参考
