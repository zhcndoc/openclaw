---
summary: "重构具有最高 LOC 减少潜力的集群"
read_when:
  - 您想在不改变行为的情况下减少总代码行数（LOC）
  - 您正在选择下一步的去重或提取过程
title: "重构集群待办事项"
---

# 重构集群待办事项

按可能的 LOC 减少、安全性和广度排序。

## 1. 通道插件配置和安全脚手架

价值最高的集群。

许多通道插件中重复的结构：

- `config.listAccountIds`
- `config.resolveAccount`
- `config.defaultAccountId`
- `config.setAccountEnabled`
- `config.deleteAccount`
- `config.describeAccount`
- `security.resolveDmPolicy`

典型示例：

- `extensions/telegram/src/channel.ts`
- `extensions/googlechat/src/channel.ts`
- `extensions/slack/src/channel.ts`
- `extensions/discord/src/channel.ts`
- `extensions/matrix/src/channel.ts`
- `extensions/irc/src/channel.ts`
- `extensions/signal/src/channel.ts`
- `extensions/mattermost/src/channel.ts`

可能的提取结构：

- `buildChannelConfigAdapter(...)`
- `buildMultiAccountConfigAdapter(...)`
- `buildDmSecurityAdapter(...)`

预期节省：

- 约 250-450 行代码

风险：

- 中等。每个通道的 `isConfigured`、警告和归一化略有不同。

## 2. 扩展运行时单例样板代码

非常安全。

几乎每个扩展都有相同的运行时持有者：

- `let runtime: PluginRuntime | null = null`
- `setXRuntime`
- `getXRuntime`

典型示例：

- `extensions/telegram/src/runtime.ts`
- `extensions/matrix/src/runtime.ts`
- `extensions/slack/src/runtime.ts`
- `extensions/discord/src/runtime.ts`
- `extensions/whatsapp/src/runtime.ts`
- `extensions/imessage/src/runtime.ts`
- `extensions/twitch/src/runtime.ts`

特殊情况变体：

- `extensions/bluebubbles/src/runtime.ts`
- `extensions/line/src/runtime.ts`
- `extensions/synology-chat/src/runtime.ts`

可能的提取结构：

- `createPluginRuntimeStore<T>(errorMessage)`

预期节省：

- 约 180-260 行代码

风险：

- 低

## 3. 设置提示和配置补丁步骤

范围广泛。

许多设置文件重复：

- 解析账户 ID
- 提示允许列表条目
- 合并 allowFrom
- 设置 DM 策略
- 提示机密信息
- 补丁顶层与账户范围的配置差异

典型示例：

- `extensions/bluebubbles/src/setup-surface.ts`
- `extensions/googlechat/src/setup-surface.ts`
- `extensions/msteams/src/setup-surface.ts`
- `extensions/zalo/src/setup-surface.ts`
- `extensions/zalouser/src/setup-surface.ts`
- `extensions/nextcloud-talk/src/setup-surface.ts`
- `extensions/matrix/src/setup-surface.ts`
- `extensions/irc/src/setup-surface.ts`

已有辅助接口：

- `src/channels/plugins/setup-wizard-helpers.ts`

可能的提取结构：

- `promptAllowFromList(...)`
- `buildDmPolicyAdapter(...)`
- `applyScopedAccountPatch(...)`
- `promptSecretFields(...)`

预期节省：

- 约 300-600 行代码

风险：

- 中等。容易过度泛化；保持辅助函数狭小且可组合。

## 4. 多账户配置模式片段

扩展中重复的模式片段。

常见模式：

- `const allowFromEntry = z.union([z.string(), z.number()])`
- 账户模式加：
  - `accounts: z.object({}).catchall(accountSchema).optional()`
  - `defaultAccount: z.string().optional()`
- 重复的 DM/群组字段
- 重复的 markdown/工具策略字段

典型示例：

- `extensions/bluebubbles/src/config-schema.ts`
- `extensions/zalo/src/config-schema.ts`
- `extensions/zalouser/src/config-schema.ts`
- `extensions/matrix/src/config-schema.ts`
- `extensions/nostr/src/config-schema.ts`

可能的提取结构：

- `AllowFromEntrySchema`
- `buildMultiAccountChannelSchema(accountSchema)`
- `buildCommonDmGroupFields(...)`

预期节省：

- 约 120-220 行代码

风险：

- 低到中等。有些模式简单，有些较特殊。

## 5. Webhook 和监控生命周期启动

中等价值的良好集群。

重复的 `startAccount` / 监控设置模式：

- 解析账户
- 计算 webhook 路径
- 记录启动日志
- 启动监控
- 等待中止事件
- 清理
- 状态接收器更新

典型示例：

- `extensions/googlechat/src/channel.ts`
- `extensions/bluebubbles/src/channel.ts`
- `extensions/zalo/src/channel.ts`
- `extensions/telegram/src/channel.ts`
- `extensions/nextcloud-talk/src/channel.ts`

已有辅助接口：

- `src/plugin-sdk/channel-lifecycle.ts`

可能的提取结构：

- 用于账户监控生命周期的辅助函数
- 用于基于 webhook 的账户启动的辅助函数

预期节省：

- 约 150-300 行代码

风险：

- 中到高。传输细节差异迅速。

## 6. 小型完全克隆清理

低风险的清理类别。

示例：

- 重复的网关 argv 检测：
  - `src/infra/gateway-lock.ts`
  - `src/cli/daemon-cli/lifecycle.ts`
- 重复的端口诊断渲染：
  - `src/cli/daemon-cli/restart-health.ts`
- 重复的会话密钥构造：
  - `src/web/auto-reply/monitor/broadcast.ts`

预期节省：

- 约 30-60 行代码

风险：

- 低

## 测试集群

### LINE webhook 事件夹具

典型示例：

- `src/line/bot-handlers.test.ts`

可能的提取：

- `makeLineEvent(...)`
- `runLineEvent(...)`
- `makeLineAccount(...)`

预期节省：

- 约 120-180 行代码

### Telegram 原生命令权限矩阵

典型示例：

- `src/telegram/bot-native-commands.group-auth.test.ts`
- `src/telegram/bot-native-commands.plugin-auth.test.ts`

可能的提取：

- 论坛上下文构建器
- 拒绝消息断言辅助函数
- 表驱动的权限用例

预期节省：

- 约 80-140 行代码

### Zalo 生命周期设置

典型示例：

- `extensions/zalo/src/monitor.lifecycle.test.ts`

可能的提取：

- 共享的监控设置工具

预期节省：

- 约 50-90 行代码

### Brave llm-context 不支持选项测试

典型示例：

- `src/agents/tools/web-tools.enabled-defaults.test.ts`

可能的提取：

- `it.each(...)` 矩阵

预期节省：

- 约 30-50 行代码

## 建议顺序

1. 运行时单例样板代码
2. 小型完全克隆清理
3. 配置和安全构建器提取
4. 测试辅助提取
5. 入门步骤提取
6. 监控生命周期辅助提取
