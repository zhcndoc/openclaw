---
title: "插件 SDK 概览"
sidebarTitle: "SDK 概览"
summary: "导入映射、注册 API 参考以及 SDK 架构"
read_when:
  - 你需要知道应该从哪个 SDK 子路径导入
  - 你想查看 OpenClawPluginApi 上所有注册方法的参考
  - 你正在查找某个特定的 SDK 导出
---

# 插件 SDK 概览

插件 SDK 是插件与核心之间的类型化契约。本页是关于**导入什么**以及**可以注册什么**的参考。

<Tip>
  **在找操作指南？**
  - 第一个插件？从 [Getting Started](/plugins/building-plugins) 开始
  - Channel 插件？查看 [Channel Plugins](/plugins/sdk-channel-plugins)
  - Provider 插件？查看 [Provider Plugins](/plugins/sdk-provider-plugins)
</Tip>

## 导入约定

始终从特定子路径导入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/core";
```

每个子路径都是一个小型、独立的模块。这可以保持启动速度快，并防止循环依赖问题。

## 子路径参考

按用途分组的最常用子路径。完整的 100+ 个子路径列表在 `scripts/lib/plugin-sdk-entrypoints.json` 中。

### 插件入口

| 子路径                    | 关键导出                                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/plugin-entry` | `definePluginEntry`                                                                                                                    |
| `plugin-sdk/core`         | `defineChannelPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase`, `defineSetupPluginEntry`, `buildChannelConfigSchema` |

<AccordionGroup>
  <Accordion title="Channel 子路径">
    | 子路径 | 关键导出 |
    | --- | --- |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface` |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | `createChannelReplyPipeline` |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter` |
    | `plugin-sdk/channel-config-schema` | Channel 配置 schema 类型 |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink` |
    | `plugin-sdk/channel-inbound` | 防抖、提及匹配、封装辅助函数 |
    | `plugin-sdk/channel-send-result` | 回复结果类型 |
    | `plugin-sdk/channel-actions` | `createMessageToolButtonsSchema`, `createMessageToolCardSchema` |
    | `plugin-sdk/channel-targets` | 目标解析/匹配辅助函数 |
    | `plugin-sdk/channel-contract` | Channel 契约类型 |
    | `plugin-sdk/channel-feedback` | 反馈/反应联动 |
  </Accordion>

  <Accordion title="Provider 子路径">
    | 子路径 | 关键导出 |
    | --- | --- |
    | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`, `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile` |
    | `plugin-sdk/provider-models` | `normalizeModelCompat` |
    | `plugin-sdk/provider-catalog` | Catalog 类型重新导出 |
    | `plugin-sdk/provider-usage` | `fetchClaudeUsage` 等 |
    | `plugin-sdk/provider-stream` | 流包装器类型 |
    | `plugin-sdk/provider-onboard` | 入门配置补丁辅助函数 |
  </Accordion>

  <Accordion title="认证与安全子路径">
    | 子路径 | 关键导出 |
    | --- | --- |
    | `plugin-sdk/command-auth` | `resolveControlCommandGate` |
    | `plugin-sdk/allow-from` | `formatAllowFromLowercase` |
    | `plugin-sdk/secret-input` | 密钥输入解析辅助函数 |
    | `plugin-sdk/webhook-ingress` | Webhook 请求/目标辅助函数 |
  </Accordion>

  <Accordion title="运行时与存储子路径">
    | 子路径 | 关键导出 |
    | --- | --- |
    | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` |
    | `plugin-sdk/config-runtime` | 配置加载/写入辅助函数 |
    | `plugin-sdk/infra-runtime` | 系统事件/心跳辅助函数 |
    | `plugin-sdk/agent-runtime` | Agent 目录/身份/工作区辅助函数 |
    | `plugin-sdk/directory-runtime` | 基于配置的目录查询/去重 |
    | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
  </Accordion>

  <Accordion title="能力与测试子路径">
    | 子路径 | 关键导出 |
    | --- | --- |
    | `plugin-sdk/image-generation` | 图像生成 provider 类型 |
    | `plugin-sdk/media-understanding` | 媒体理解 provider 类型 |
    | `plugin-sdk/speech` | 语音 provider 类型 |
    | `plugin-sdk/testing` | `installCommonResolveTargetErrorCases`, `shouldAckReaction` |
  </Accordion>
</AccordionGroup>

## 注册 API

`register(api)` 回调会接收一个 `OpenClawPluginApi` 对象，其中包含以下
方法：

### 能力注册

| 方法                                        | 注册内容                       |
| ------------------------------------------- | ------------------------------ |
| `api.registerProvider(...)`                   | 文本推理（LLM）                |
| `api.registerChannel(...)`                    | 消息通道                       |
| `api.registerSpeechProvider(...)`             | 文本转语音 / STT 合成          |
| `api.registerMediaUnderstandingProvider(...)` | 图像/音频/视频分析              |
| `api.registerImageGenerationProvider(...)`    | 图像生成                       |
| `api.registerWebSearchProvider(...)`          | 网页搜索                       |

### 工具与命令

| 方法                          | 注册内容                             |
| ------------------------------- | --------------------------------------------- |
| `api.registerTool(tool, opts?)` | Agent 工具（必需或 `{ optional: true }`） |
| `api.registerCommand(def)`      | 自定义命令（绕过 LLM）               |

### 基础设施

| 方法                                         | 注册内容              |
| ---------------------------------------------- | --------------------- |
| `api.registerHook(events, handler, opts?)`     | 事件钩子            |
| `api.registerHttpRoute(params)`                | 网关 HTTP 端点      |
| `api.registerGatewayMethod(name, handler)`     | 网关 RPC 方法       |
| `api.registerCli(registrar, opts?)`            | CLI 子命令          |
| `api.registerService(service)`                 | 后台服务            |
| `api.registerInteractiveHandler(registration)` | 交互式处理器        |

### 独占槽位

| 方法                                     | 注册内容                     |
| ------------------------------------------ | ------------------------------------- |
| `api.registerContextEngine(id, factory)`   | 上下文引擎（同一时间只能激活一个） |
| `api.registerMemoryPromptSection(builder)` | 记忆提示词分区构建器         |

### 事件与生命周期

| 方法                                       | 作用                  |
| -------------------------------------------- | ----------------------------- |
| `api.on(hookName, handler, opts?)`           | 类型化生命周期钩子          |
| `api.onConversationBindingResolved(handler)` | 会话绑定回调                |

### 钩子决策语义

- `before_tool_call`：返回 `{ block: true }` 为终止性决策。一旦任一处理器设置了它，低优先级处理器会被跳过。
- `before_tool_call`：返回 `{ block: false }` 会被视为没有决策（与省略 `block` 相同），而不是覆盖。
- `message_sending`：返回 `{ cancel: true }` 为终止性决策。一旦任一处理器设置了它，低优先级处理器会被跳过。
- `message_sending`：返回 `{ cancel: false }` 会被视为没有决策（与省略 `cancel` 相同），而不是覆盖。

### API 对象字段

| 字段                    | 类型                      | 描述                                               |
| ------------------------ | ------------------------- | --------------------------------------------------------- |
| `api.id`                 | `string`                  | 插件 id                                             |
| `api.name`               | `string`                  | 显示名称                                            |
| `api.version`            | `string?`                 | 插件版本（可选）                                     |
| `api.description`        | `string?`                 | 插件描述（可选）                                     |
| `api.source`             | `string`                  | 插件源路径                                           |
| `api.rootDir`            | `string?`                 | 插件根目录（可选）                                    |
| `api.config`             | `OpenClawConfig`          | 当前配置快照                                         |
| `api.pluginConfig`       | `Record<string, unknown>` | 来自 `plugins.entries.<id>.config` 的插件专属配置 |
| `api.runtime`            | `PluginRuntime`           | [运行时辅助](/plugins/sdk-runtime)                   |
| `api.logger`             | `PluginLogger`            | 作用域日志器（`debug`、`info`、`warn`、`error`）     |
| `api.registrationMode`   | `PluginRegistrationMode`  | `"full"`、`"setup-only"` 或 `"setup-runtime"`       |
| `api.resolvePath(input)` | `(string) => string`      | 解析相对于插件根目录的路径                        |

## 内部模块约定

在你的插件内部，使用本地 barrel 文件来处理内部导入：

```
my-plugin/
  api.ts            # 面向外部消费者的公共导出
  runtime-api.ts    # 仅供内部使用的运行时导出
  index.ts          # 插件入口点
  setup-entry.ts    # 轻量级仅 setup 入口（可选）
```

<Warning>
  切勿在生产代码中通过 `openclaw/plugin-sdk/<your-plugin>`
  导入你自己的插件。请将内部导入通过 `./api.ts` 或
  `./runtime-api.ts` 路由。SDK 路径仅是外部契约。
</Warning>

## 相关内容

- [入口点](/plugins/sdk-entrypoints) — `definePluginEntry` 和 `defineChannelPluginEntry` 选项
- [运行时帮助函数](/plugins/sdk-runtime) — `api.runtime` 命名空间完整参考
- [设置与配置](/plugins/sdk-setup) — 打包、清单、配置模式
- [测试](/plugins/sdk-testing) — 测试工具和 lint 规则
- [SDK 迁移](/plugins/sdk-migration) — 从已弃用接口迁移
- [插件内部机制](/plugins/architecture) — 深层架构和能力模型
