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

- a stable compatibility code
- status: `active`, `deprecated`, `removal-pending`, or `removed`
- owner: `sdk`, `config`, `setup`, `channel`, `provider`, `plugin-execution`,
  `agent-runtime`, or `core`
- introduction and deprecation dates when applicable
- an exact removal date once the owning maintainer approves it; an omitted
  `removeAfter` keeps a deprecated surface ineligible for removal
- replacement guidance
- docs, diagnostics, and tests that cover the old and new behavior

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

The July 2026 sweep removed the expired root SDK, manifest, provider, runtime,
registry-flag, and plugin-owned web-config aliases. Doctor migrations remain
separately tracked so supported upgrade paths can still repair old config.

The remaining dated compatibility areas are:

- the August and September SDK subpath windows listed in the migration guide
- `api.on("deactivate", ...)` and `api.on("subagent_spawning", ...)` hook aliases
- memory-specific embedding registration and the beta.5 session-store bridge
- WhatsApp inbound callback aliases described below
- explicit channel target parsing and `openclaw/plugin-sdk/messaging-targets`
- embedded Pi agent aliases
- the shipped agent-harness SDK aliases, whose removal is pending a new
  externally documented migration decision
- the October 2026 SDK annotation families listed below

Active, undated registry records cover supported behavior rather than removal
debt, including activation hints, plugin capture, bundled plugin enablement,
and the generated channel-config fallback.

The annotation-only compatibility audit added these dated records. Their
`removeAfter` date is an earliest review date, not permission to remove a
surface while its stated reader or migration condition remains unmet.

| Compatibility code                        | Removal condition                                                                                       | `removeAfter` |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------- |
| `plugin-sdk-channel-setup-input-fields`   | Repeat the published-plugin artifact sweep and remove only fields with no reader.                       | 2026-10-01    |
| `plugin-sdk-broad-runtime-barrels`        | Move bundled and indexed external consumers to focused SDK subpaths.                                    | 2026-10-01    |
| `plugin-sdk-provider-owned-helper-shims`  | Move each deprecated provider helper to its provider-local API and prove no published reader remains.   | 2026-10-01    |
| `message-presentation-legacy-bridges`     | Move reply producers and official channel packages to `MessagePresentation`.                            | 2026-10-01    |
| `plugin-sdk-focused-compat-aliases`       | Prove every enumerated alias has no bundled or published reader.                                        | 2026-10-01    |
| `agent-harness-terminal-result-aliases`   | Move harnesses to `terminal` and `visibleReplies`, then prove the legacy result fields are unread.      | 2026-10-01    |
| `official-plugin-export-aliases`          | Move users of Google Meet testing, channel presentation, and Discord timeout exports to canonical APIs. | 2026-10-01    |
| `memory-host-compatibility-aliases`       | Use canonical memory tables and prepared runtime config everywhere.                                     | 2026-10-01    |
| `plugin-runtime-api-compat-aliases`       | Move flat plugin registration/runtime calls to their namespaced or focused replacements.                | 2026-10-01    |
| `plugin-provider-manifest-compat-aliases` | Move kind/setup/catalog ownership to manifests and model-catalog registration.                          | 2026-10-01    |
| `deprecated-session-store-beta5-api`      | End the v2026.7.x whole-store upgrade window, including package-root aliases.                           | 2026-10-12    |

`pnpm plugins:boundary-report` reports `removal-pending` records separately
from deprecated records. A due `removal-pending` record remains blocked until
its reported migration condition is satisfied and its reader references are
cleared; the existing `--fail-on-eligible-compat` gate continues to apply only
to dated `deprecated` records. Reader references are surface-token matches for
triage; use the published-artifact sweep before authorizing removal.

### Channel prompt-context identifier aliases

New channel plugins should use `MsgContext.ChannelPromptContext`,
`MsgContext.ChannelStructuredContext`, `ChannelStructuredContextEntry`, and
`SupplementalContextFacts.channelStructuredContext`. The older
`UntrustedContext`, `UntrustedStructuredContext`,
`UntrustedStructuredContextEntry`, and supplemental `untrustedContext` names
remain as deprecated SDK aliases until 2026-09-08 (registry record
`sdk-untrusted-context-identifier-aliases`). Inbound finalization folds those
deprecated fields into the channel-named fields and removes the old keys from
runtime context.

The security runtime similarly exports `buildChannelMetadata`; the deprecated
`buildUntrustedChannelMetadata` alias remains available on the same schedule.

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

- `id`, `timestamp`, and `isBatched` move under `event`.
- `body`, `mediaPath`, `mediaType`, `mediaFileName`, `mediaUrl`, `location`,
  and `channelStructuredContext` move under `payload`.
- `to`, `chatId`, sender/self fields, `sendComposing`, `reply(...)`, and
  `sendMedia(...)` move under `platform`.
- `replyTo*` fields move under `quote`; group subject/participant/mention
  fields move under `group`.

`payload.channelStructuredContext` is extracted from inbound provider
payloads. Plugins should inspect `label`, `source`, and `type` before
treating its `payload` as authoritative.

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
