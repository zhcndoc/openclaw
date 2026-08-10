---
summary: "插件兼容性契约、弃用元数据和迁移预期"
title: "插件兼容性"
read_when:
  - 您维护一个 OpenClaw 插件
  - 您看到插件兼容性警告
  - 您正在规划插件 SDK 或 manifest 迁移
---

OpenClaw 会在移除旧的插件契约之前，通过命名的兼容性适配器继续连接这些旧契约。这可以在 SDK、manifest、setup、config 和 agent runtime 契约演进的同时，保护现有的内置插件和外部插件。

## 兼容性注册表

插件兼容性契约记录在核心注册表中，位于
`src/plugins/compat/registry.ts`。每条记录包括：

- 稳定的兼容性代码
- 状态：`active`、`deprecated`、`removal-pending` 或 `removed`
- 所有者：`sdk`、`config`、`setup`、`channel`、`provider`、`plugin-execution`、
  `agent-runtime` 或 `core`
- 适用时的引入日期和弃用日期
- 所有者维护者批准后的确切移除日期；省略
  `removeAfter` 会使已弃用的接口无法被移除
- 替代方案说明
- 覆盖新旧行为的文档、诊断信息和测试

该注册表是维护者规划以及未来插件检查器校验的依据。如果插件面向外部的行为发生变化，请在添加适配器的同一次变更中，添加或更新兼容性记录。

Doctor 修复和迁移兼容性单独记录在
`src/commands/doctor/shared/deprecation-compat.ts`。这些记录涵盖旧的配置形状、安装账本布局，以及在运行时兼容路径移除后可能仍需保留的修复 shim。

每条 Doctor 兼容性记录都声明了 `introduced` 和 `removeAfter`。
当某条记录在 `removeAfter` 当日或之后仍处于 `deprecated` 状态时，
`pnpm check:doctor-deprecation-registry` 检查会失败；维护者必须在有受支持的升级证明后将其移除，或将其移至 `removal-pending` 并记录相应的阻塞因素。`removal-pending` 记录不会导致日期检查失败，但在满足升级条件之前，仍会保留在明确的审核队列中。

发布检查应同时检查两个注册表。不要仅仅因为匹配的运行时或配置兼容性记录已过期，就删除 Doctor
迁移；应先确认不存在仍需要该修复的受支持升级路径。在发布规划期间也要重新验证每条替代方案注释，因为随着提供方和渠道移出核心，插件所有权和配置覆盖范围可能会发生变化。

## 弃用政策

OpenClaw 不应在引入替代方案的同一版本中移除已文档化的插件契约。迁移顺序：

1. 添加新契约。
2. 通过命名的兼容性适配器保留旧行为。
3. 当插件作者可以采取行动时，发出诊断或警告。
4. 文档化替代方案和时间线。
5. 测试旧路径和新路径。
6. 等待已宣布的迁移窗口结束。
7. 仅在获得明确的破坏性变更发布批准后才移除。

已弃用的记录必须包含警告开始日期、替代方案、文档链接，以及一个最终移除日期；该日期不得晚于警告开始后三个月。不要添加一个具有开放式移除窗口的已弃用兼容路径，除非维护者明确决定它是永久兼容性，并改为将其标记为 `active`。

## 当前兼容性区域

2026 年 7 月的清理移除了已过期的根 SDK、manifest、provider、runtime、
registry-flag 和 plugin-owned web-config 别名。Doctor 迁移仍会单独跟踪，
因此受支持的升级路径仍然可以修复旧配置。

剩余的、带日期的兼容性区域包括：

- 迁移指南中列出的 8 月和 9 月 SDK 子路径窗口
- `api.on("deactivate", ...)` 和 `api.on("subagent_spawning", ...)` 钩子别名
- 特定于 memory 的 embedding 注册以及 beta.5 session-store 桥接
- 下文所述的 WhatsApp 入站回调别名
- 显式 channel target 解析和 `openclaw/plugin-sdk/messaging-targets`
- 嵌入式 Pi agent 别名
- 已发布的 agent-harness SDK 别名；其移除正在等待新的、对外公开文档化的迁移决策
- 下文所列的 2026 年 10 月 SDK 注解系列

活跃的、无日期的 registry 记录涵盖受支持的行为，而不是待移除债务，
包括激活提示、插件捕获、捆绑插件启用以及生成的 channel-config 回退。

仅注解的兼容性审计新增了以下带日期的记录。其
`removeAfter` 日期表示最早的审查日期，而不是在其所述读取方或迁移条件
仍未满足时移除相关接口的许可。

| 兼容性代码                              | 移除条件                                                                                         | `removeAfter` |
| --------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------- |
| `plugin-sdk-channel-setup-input-fields` | 重复已发布插件的构件扫描，只移除不存在读取方的字段。                                               | 2026-10-01    |
| `plugin-sdk-broad-runtime-barrels`      | 将捆绑的和已索引的外部使用方迁移到专用 SDK 子路径。                                                | 2026-10-01    |
| `plugin-sdk-provider-owned-helper-shims` | 将每个已弃用的 provider helper 迁移到其 provider 本地 API，并证明不存在已发布的读取方。           | 2026-10-01    |
| `message-presentation-legacy-bridges`   | 将回复生产方和官方 channel 包迁移到 `MessagePresentation`。                                      | 2026-10-01    |
| `plugin-sdk-focused-compat-aliases`     | 证明每个列出的别名都不存在捆绑或已发布的读取方。                                                   | 2026-10-01    |
| `agent-harness-terminal-result-aliases` | 将 harness 迁移到 `terminal` 和 `visibleReplies`，然后证明旧结果字段已无人读取。                 | 2026-10-01    |
| `official-plugin-export-aliases`        | 将 Google Meet 测试、channel presentation 和 Discord timeout 导出的使用方迁移到规范 API。        | 2026-10-01    |
| `memory-host-compatibility-aliases`     | 在所有地方使用规范的 memory 表和准备好的 runtime 配置。                                          | 2026-10-01    |
| `plugin-runtime-api-compat-aliases`     | 将扁平的插件注册/runtime 调用迁移到其命名空间化或专用的替代接口。                                  | 2026-10-01    |
| `plugin-provider-manifest-compat-aliases` | 将 kind/setup/catalog 的所有权迁移到 manifest 和 model-catalog 注册。                            | 2026-10-01    |
| `deprecated-session-store-beta5-api`    | 结束 v2026.7.x 的 whole-store 升级窗口，包括 package-root 别名。                                   | 2026-10-12    |

`pnpm plugins:boundary-report` 会将 `removal-pending` 记录与 deprecated 记录分开报告。
某个到期的 `removal-pending` 记录在其报告的迁移条件满足且其读取方引用被清除之前，
仍会被阻止；现有的 `--fail-on-eligible-compat` gate 仍只适用于带日期的
`deprecated` 记录。读取方引用是用于分流的 surface-token 匹配；在批准移除之前，
请使用已发布构件扫描。

### Channel prompt-context identifier 别名

新的 channel 插件应使用 `MsgContext.ChannelPromptContext`、
`MsgContext.ChannelStructuredContext`、`ChannelStructuredContextEntry` 和
`SupplementalContextFacts.channelStructuredContext`。较旧的
`UntrustedContext`、`UntrustedStructuredContext`、
`UntrustedStructuredContextEntry` 以及 supplemental `untrustedContext` 名称
仍作为已弃用的 SDK 别名保留至 2026-09-08（registry 记录
`sdk-untrusted-context-identifier-aliases`）。入站最终化会将这些已弃用字段
折叠到 channel 命名的字段中，并从 runtime context 中移除旧键。

安全 runtime 同样导出 `buildChannelMetadata`；已弃用的
`buildUntrustedChannelMetadata` 别名按相同时间表保留。

### WhatsApp inbound callback 扁平别名

WhatsApp runtime 回调会传递 `WebInboundMessage`：即规范的
嵌套 `event`、`payload`、`quote`、`group` 和 `platform` 上下文，以及
已弃用的、针对已发布回调字段的扁平别名。新的回调代码应读取嵌套上下文。
构造干净的嵌套回调消息的代码可以使用 `WebInboundCallbackMessage`；仍然注入
旧的扁平测试或插件消息的兼容监听器应使用
`LegacyFlatWebInboundMessage` 或 `WebInboundMessageInput`。

扁平别名会一直可用到 **2026-08-30**；该窗口仅适用于扁平别名访问，不适用于
嵌套形态，后者才是规范的 runtime 契约。每个扁平别名的 TypeScript `@deprecated`
注解都会写明其精确的嵌套替代项。常见示例如下：

- `id`、`timestamp` 和 `isBatched` 移到 `event` 下。
- `body`、`mediaPath`、`mediaType`、`mediaFileName`、`mediaUrl`、`location`
  和 `channelStructuredContext` 移到 `payload` 下。
- `to`、`chatId`、sender/self 字段、`sendComposing`、`reply(...)` 和
  `sendMedia(...)` 移到 `platform` 下。
- `replyTo*` 字段移到 `quote` 下；群组主题/参与者/提及字段移到 `group` 下。

`payload.channelStructuredContext` 会从入站 provider payload 中提取。
插件在将其 `payload` 视为权威数据之前，应检查 `label`、`source` 和 `type`。

### WhatsApp inbound admission 字段

被接受的 WhatsApp 回调消息会携带 `admission`，这是一个对外安全的信封，
用于承载接纳该消息的访问控制决策。新的回调代码应从 `msg.admission`
而不是旧的顶层 admission 字段读取 admission 事实。

顶层字段会一直可用到 **2026-08-30**。每个字段的 TypeScript `@deprecated`
注解都会写明替代项：

- `from` 和 `conversationId` 移到 `admission.conversation.id`。
- `accountId` 移到 `admission.accountId`。
- `accessControlPassed` 是 `admission.ingress.decision === "allow"` 的派生兼容视图；
  对于已经携带 `admission` 的消息，写入旧布尔值不会重写 ingress 图。
- `chatType` 移到 `admission.conversation.kind`。

## 插件检查器包

插件检查器应位于核心 OpenClaw 仓库之外，作为一个独立的包/仓库存在，并依托版本化的兼容性与清单契约。第一天的 CLI 应为：

```sh
openclaw-plugin-inspector ./my-plugin
```

它应输出清单/Schema 验证、正在检查的契约兼容性版本、安装/源码元数据检查、冷路径导入检查，以及弃用/兼容性警告。使用 `--json` 以便在 CI 注释中获得稳定、可机器读取的输出。OpenClaw core 应公开检查器可以消费的契约和 fixtures，但不应从主 `openclaw` 包中发布检查器二进制。

### 维护者验收通道

在验证外部检查器与 OpenClaw 插件包的兼容性时，对可安装包验收通道使用基于 Crabbox 的 Blacksmith Testbox。包构建完成后，从一个干净的 OpenClaw 检出环境中运行：

```sh
pnpm crabbox:run -- --provider blacksmith-testbox --timing-json --shell -- "pnpm install && pnpm build && npm exec --yes @openclaw/plugin-inspector@0.1.0 -- ./extensions/telegram --json"
pnpm crabbox:run -- --provider blacksmith-testbox --timing-json --shell -- "npm exec --yes @openclaw/plugin-inspector@0.1.0 -- ./extensions/discord --json"
pnpm crabbox:run -- --provider blacksmith-testbox --timing-json --shell -- "npm exec --yes @openclaw/plugin-inspector@0.1.0 -- <clawhub-plugin-dir> --json"
```

请将此通道保持为维护者可选启用，因为它会安装一个外部 npm 包，并且可能检查仓库外克隆的插件包。本地仓库的防护覆盖 SDK 导出映射、兼容性注册表元数据、已弃用 SDK 导入的清理进度，以及打包扩展的导入边界；Testbox 检查器证明则覆盖外部插件作者实际消费它时的包行为。

## 发布说明

发布说明应包含即将到来的插件弃用信息，包括目标日期
以及迁移文档链接，且应在兼容性路径变为
`removal-pending` 或 `removed` 之前提供。
