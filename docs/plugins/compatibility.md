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

- 一个稳定的兼容性代码
- 状态：`active`、`deprecated`、`removal-pending` 或 `removed`
- 负责人：`sdk`、`config`、`setup`、`channel`、`provider`、`plugin-execution`、
  `agent-runtime` 或 `core`
- 适用时的引入日期和弃用日期
- 替代方案指引
- 覆盖旧行为和新行为的文档、诊断和测试

该注册表是维护者规划以及未来插件检查器校验的依据。如果插件面向外部的行为发生变化，请在添加适配器的同一次变更中，添加或更新兼容性记录。

Doctor 修复和迁移兼容性单独记录在
`src/commands/doctor/shared/deprecation-compat.ts`。这些记录涵盖旧的配置形状、安装账本布局，以及在运行时兼容路径移除后可能仍需保留的修复 shim。

发布清理应同时检查这两个注册表。不要仅仅因为匹配的运行时或配置兼容性记录已过期，就删除某个 doctor 迁移；应先确认是否仍然存在需要该修复的受支持升级路径。在发布规划期间也要重新验证每条替代方案注释，因为随着提供方和通道移出核心，插件所有权和配置范围可能会发生变化。

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

注册表目前在以下这些区域跟踪大约 70 个兼容性代码。新的插件代码应在每个区域以及对应的迁移指南中使用替代方案；现有插件可以继续使用兼容路径，直到文档、诊断信息和发布说明宣布移除窗口。

- `openclaw/plugin-sdk/compat` 等旧的宽泛 SDK 导入
- 旧的仅 hook 插件形态和 `before_agent_start`
- 插件迁移到 `gateway_stop` 期间，旧的 `api.on("deactivate", ...)` 清理 hook 名称
- 插件迁移到 `register(api)` 期间，旧的 `activate(api)` 插件入口点
- 旧的 SDK 别名，例如 `openclaw/extension-api`、
  `openclaw/plugin-sdk/channel-runtime`、`openclaw/plugin-sdk/command-auth`
  状态构建器、`openclaw/plugin-sdk/test-utils`（已被更聚焦的
  `openclaw/plugin-sdk/*` 测试子路径替代），以及 `ClawdbotConfig` /
  `OpenClawSchemaType` 类型别名
- 内置插件白名单和启用行为
- 旧的 provider/channel 环境变量清单元数据
- 旧的 provider 插件 hooks 和类型别名，随着 provider 迁移到
  显式的 catalog、auth、thinking、replay 和 transport hooks
- 旧的运行时别名，例如 `api.runtime.taskFlow`、
  `api.runtime.subagent.getSession`、`api.runtime.stt`，以及已弃用的
  `api.runtime.config.loadConfig()` / `api.runtime.config.writeConfigFile(...)`
- WhatsApp `WebInboundMessage` 扁平回调字段（见下文）
- WhatsApp `WebInboundMessage` 顶层 admission 字段（见下文）
- 旧的内存插件分离注册方式，随着内存插件迁移到
  `registerMemoryCapability`
- 旧的、面向 memory 的 embedding provider 注册方式，随着 embedding
  providers 迁移到 `api.registerEmbeddingProvider(...)` 和
  `contracts.embeddingProviders`
- 旧的 channel SDK 辅助函数，用于原生消息 schema、mention gate、
  inbound envelope 格式化以及 approval capability 嵌套
- 旧的 channel route key 和可比目标辅助别名，随着插件迁移到
  `openclaw/plugin-sdk/channel-route`
- 正在被 manifest 贡献归属替代的 activation hints
- `setup-api` 运行时回退，随着 setup 描述符迁移到冷启动的
  `setup.requiresRuntime: false` 元数据
- provider `discovery` hooks，随着 provider catalog hooks 迁移到
  `catalog.run(...)`
- channel `showConfigured` / `showInSetup` 元数据，随着 channel 包
  迁移到 `openclaw.channel.exposure`
- 旧的 runtime-policy 配置键，随着 doctor 将操作员迁移到
  `agentRuntime`
- 生成的内置 channel 配置元数据回退，随着 registry-first 的
  `channelConfigs` 元数据落地
- 持久化的插件注册表禁用和安装迁移环境标志，随着修复流程将操作员迁移到
  `openclaw plugins registry --refresh`
  和 `openclaw doctor --fix`
- 旧的、由插件拥有的 web search、web fetch 和 x_search 配置路径，
  随着 doctor 将它们迁移到 `plugins.entries.<plugin>.config`
- 旧的 `plugins.installs` 手写配置和内置插件 load-path 别名，随着安装元数据
  迁移到由状态管理的插件账本中

### WhatsApp inbound callback 扁平别名

WhatsApp 运行时回调会传递 `WebInboundMessage`：即规范的
嵌套 `event`、`payload`、`quote`、`group` 和 `platform` 上下文，以及
已弃用的、针对已发布回调字段的扁平别名。新的回调代码应读取嵌套上下文。
构造干净的嵌套回调消息的代码可以使用 `WebInboundCallbackMessage`；仍然注入
旧的扁平测试或插件消息的兼容监听器应使用
`LegacyFlatWebInboundMessage` 或 `WebInboundMessageInput`。

扁平别名会一直可用到 **2026-08-30**；该窗口仅适用于扁平别名访问，不适用于
嵌套形态，后者才是规范的运行时契约。每个扁平别名的 TypeScript `@deprecated`
注解都会写明其精确的嵌套替代项。常见示例如下：

- `id`、`timestamp` 和 `isBatched` 移到 `event` 下。
- `body`、`mediaPath`、`mediaType`、`mediaFileName`、`mediaUrl`、`location`
  和 `untrustedStructuredContext` 移到 `payload` 下。
- `to`、`chatId`、发送者/自身字段、`sendComposing`、`reply(...)` 和
  `sendMedia(...)` 移到 `platform` 下。
- `replyTo*` 字段移到 `quote` 下；群组 subject/participant/mention 字段移到
  `group` 下。

`payload.untrustedStructuredContext` 是从 inbound provider payload 中提取的。
插件应先检查 `label`、`source` 和 `type`，再将其 `payload` 视为权威。

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
