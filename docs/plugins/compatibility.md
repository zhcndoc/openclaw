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

插件兼容性契约记录在核心注册表中：
`src/plugins/compat/registry.ts`。

每条记录都有：

- 稳定的兼容性代码
- 状态：`active`、`deprecated`、`removal-pending` 或 `removed`
- 负责人：SDK、config、setup、channel、provider、plugin execution、agent runtime 或 core
- 适用时的引入和弃用日期
- 替代方案指引
- 覆盖旧行为和新行为的文档、诊断和测试

该注册表是维护者规划和未来插件检查器检查的来源。如果某个面向插件的行为发生变化，请在添加适配器的同一次变更中添加或更新兼容性记录。

Doctor 修复和迁移兼容性则单独记录在 `src/commands/doctor/shared/deprecation-compat.ts`。这些记录涵盖旧的 config 结构、install-ledger 布局，以及在运行时兼容路径移除后可能仍需保留的修复 shim。

发布检查应同时查看两个注册表。不要因为匹配的运行时或 config 兼容性记录过期了，就删除 doctor 迁移；请先确认是否还不存在仍需要该修复的受支持升级路径。在发布规划期间，也要重新校验每个替代方案注释，因为随着 provider 和 channel 从 core 中移出，插件归属和 config 足迹可能会变化。

## 插件检查器包

插件检查器应当位于核心 OpenClaw 仓库之外，作为一个独立的包/仓库，并由版本化的兼容性和 manifest 契约提供支持。

第一天的 CLI 应该是：

```sh
openclaw-plugin-inspector ./my-plugin
```

它应输出：

- manifest/schema 验证
- 正在检查的契约兼容性版本
- install/source 元数据检查
- cold-path 导入检查
- 弃用和兼容性警告

在 CI 注释中使用 `--json` 以获得稳定、可机器读取的输出。OpenClaw core 应暴露检查器可消费的契约和 fixtures，但不应从主 `openclaw` 包发布检查器二进制文件。

### 维护者验收通道

在验证外部检查器与 OpenClaw 插件包时，请将由 Crabbox 支持的 Blacksmith Testbox 用作可安装包验收通道。
在构建完成后，从一个干净的 OpenClaw 检出目录中运行它：

```sh
pnpm crabbox:run -- --provider blacksmith-testbox --timing-json --shell -- "pnpm install && pnpm build && npm exec --yes @openclaw/plugin-inspector@0.1.0 -- ./extensions/telegram --json"
pnpm crabbox:run -- --provider blacksmith-testbox --timing-json --shell -- "npm exec --yes @openclaw/plugin-inspector@0.1.0 -- ./extensions/discord --json"
pnpm crabbox:run -- --provider blacksmith-testbox --timing-json --shell -- "npm exec --yes @openclaw/plugin-inspector@0.1.0 -- <clawhub-plugin-dir> --json"
```

请将此通道保持为维护者可选，因为它会安装外部 npm 包，并且可能检查从仓库外部克隆的插件包。本地仓库的保护覆盖了 SDK 导出映射、兼容性注册表元数据、已弃用的 SDK 导入清理，以及内置扩展导入边界；Testbox 检查器验证则覆盖了外部插件作者实际消费该包时的情况。

## 弃用政策

OpenClaw 不应在引入替代方案的同一个发布版本中移除已文档化的插件契约。

迁移顺序如下：

1. 添加新契约。
2. 通过命名的兼容性适配器保留旧行为。
3. 当插件作者可以采取行动时，发出诊断或警告。
4. 文档化替代方案和时间线。
5. 测试旧路径和新路径。
6. 等待已宣布的迁移窗口结束。
7. 仅在获得明确的破坏性变更发布批准后才移除。

弃用记录必须包含警告开始日期、替代方案、文档链接，以及不晚于警告开始后三个月的最终移除日期。不要添加一个没有明确截止日期的弃用兼容路径，除非维护者明确决定它是永久兼容性，并将其标记为 `active`。

## 当前兼容性区域

当前兼容性记录包括：

- 旧版宽泛的 SDK 导入，例如 `openclaw/plugin-sdk/compat`
- 旧版仅 hook 的插件形态和 `before_agent_start`
- 在插件迁移到 `register(api)` 期间仍保留的旧版 `activate(api)` 插件入口点
- 旧版 SDK 别名，例如 `openclaw/extension-api`、`openclaw/plugin-sdk/channel-runtime`、`openclaw/plugin-sdk/command-auth` 状态构建器、`openclaw/plugin-sdk/test-utils`（已被更聚焦的 `openclaw/plugin-sdk/*` 测试子路径替代），以及 `ClawdbotConfig` / `OpenClawSchemaType` 类型别名
- 打包插件 allowlist 和启用行为
- 旧版 provider/channel 环境变量 manifest 元数据
- 在 provider 迁移到显式 catalog、auth、thinking、replay 和 transport hooks 期间保留的旧版 provider 插件 hooks 和类型别名
- 旧版运行时别名，例如 `api.runtime.taskFlow`、`api.runtime.subagent.getSession`、`api.runtime.stt`，以及已弃用的 `api.runtime.config.loadConfig()` / `api.runtime.config.writeConfigFile(...)`
- memory 插件迁移到 `registerMemoryCapability` 期间保留的旧版 memory-plugin 拆分注册
- 用于原生消息 schema、mention gating、入站 envelope 格式化和 approval capability 嵌套的旧版 channel SDK helper
- 旧版 channel route key 和可比较目标 helper 别名，同时插件迁移到 `openclaw/plugin-sdk/channel-route`
- 正在被 manifest 贡献所有权替代的 activation hints
- setup 描述符迁移到冷态 `setup.requiresRuntime: false` 元数据时的 `setup-api` 运行时回退
- provider `discovery` hooks，而 provider catalog hooks 迁移到 `catalog.run(...)`
- channel `showConfigured` / `showInSetup` 元数据，而 channel 包迁移到 `openclaw.channel.exposure`
- 旧版 runtime-policy config 键，而 doctor 正在将操作员迁移到 `agentRuntime`
- 生成的打包 channel config 元数据回退，而 registry-first 的 `channelConfigs` 元数据正在落地
- 持久化的插件注册表禁用和安装迁移环境变量标志，而修复流程正将操作员迁移到 `openclaw plugins registry --refresh` 和 `openclaw doctor --fix`
- 旧版由插件拥有的 web search、web fetch 和 x_search config 路径，而 doctor 正在将它们迁移到 `plugins.entries.<plugin>.config`
- 旧版 `plugins.installs` 作者配置和打包插件 load-path 别名，而安装元数据正迁移到由状态管理的插件账本中

新的插件代码应优先使用注册表和具体迁移指南中列出的替代方案。现有插件可以继续使用兼容路径，直到文档、诊断和发布说明宣布移除窗口。

## 发布说明

发布说明应包含即将到来的插件弃用内容、目标日期以及迁移文档链接。该警告必须在兼容路径变为 `removal-pending` 或 `removed` 之前发出。
