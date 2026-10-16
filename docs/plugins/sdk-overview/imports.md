---
summary: "从哪个插件SDK子路径导入，以及如何布局插件自己的桶"
title: "插件 SDK 导入和模块布局"
sidebarTitle: "导入和模块布局"
read_when:
  - "你需要知道应从哪个 SDK 子路径导入"
  - "你正在查找某个特定的 SDK 导出"
  - "您正在决定如何构建插件的内部导入"
---

从哪个 `openclaw/plugin-sdk/*` 子路径导入，以及如何组织插件自己的公共和内部桶。 [插件SDK概述](/plugins/sdk-overview)的一部分。

## <a id="import-convention"></a> 导入约定

对于本机 Control UI 的功能，请使用 [ 功能插件 ](/plugins/feature-plugins)：`feature-contract` 定义共享操作，`feature-plugin` 注册其后端实现，`control-ui` 公开浏览器贡献和替换合约。

始终从特定子路径导入：

```typescript
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
```

每个子路径都是一个小的、独立的模块。这可以保持快速启动并防止循环依赖问题。对于特定于通道的 entry/build 帮助程序，首选 `openclaw/plugin-sdk/channel-core`；保留 `openclaw/plugin-sdk/core` 以获得更广泛的伞面和共享助手，例如 `buildChannelConfigSchema`。

对于渠道配置，请通过 `openclaw.plugin.json#channelConfigs` 发布由渠道自身维护的 JSON Schema。 `plugin-sdk/channel-config-schema` 子路径用于共享 Schema 基元和通用构建器。 OpenClaw 内置插件使用 `plugin-sdk/bundled-channel-config-schema` 来保留内置渠道 Schema。该内置 Schema 子路径不应作为新插件的开发模式。

<Warning>
  请勿导入提供商或渠道品牌的便捷界面（例如 `openclaw/plugin-sdk/slack`、`.../discord`、`.../signal`、`.../whatsapp`）。捆绑插件在自己的 `api.ts` / `runtime-api.ts` 桶内组成通用 SDK 子路径；当需求真正跨渠道时，核心消费者应该使用这些插件本地桶或添加狭窄的通用 SDK 合约。

当一小组捆绑插件帮助程序接口跟踪所有者使用情况时，它们仍然会出现在生成的导出映射中。它们仅用于捆绑插件维护，不建议将其作为新第三方插件的导入路径。

`openclaw/plugin-sdk/discord` 和 `openclaw/plugin-sdk/telegram-account` 已于 2026 年 10 月 2 日经 SDK-owner 明确批准删除。使用注入的运行时帮助程序和通用通道 SDK 子路径；在升级仍然导入这些外观的插件之前，请参阅 [ 迁移映射](/plugins/sdk-migration/import-paths#removed-command-and-channel-facades)。
</Warning>

对于仅需要凭证值的提供程序发现，请对 `readProviderEnvValue`、`resolveNonEnvSecretRefApiKeyMarker` 和 SecretRef coercion/normalization. 使用 `openclaw/plugin-sdk/secret-input` 这些帮助程序不会加载配置文件存储、提供程序传输或 Web 搜索执行。使用 `provider-web-search-config-contract` 读取插件拥有的网络搜索配置。在执行路径中保留完整的身份验证和搜索运行时导入。

## <a id="subpath-reference"></a> 子路径参考

`openclaw/plugin-sdk/gateway-ingress` 定义可选服务拥有的 [remote Control UI ingress](/plugins/sdk-gateway-ingress) 功能。主机通过其现有的 HTTP 和 WebSocket 所有者接纳浏览器设备。

插件 SDK 以按领域分组的一组窄子路径形式暴露（插件入口、渠道、提供方、认证、运行时、能力、内存，以及保留的捆绑插件辅助函数）。完整目录——按组整理并带链接——请参见 [插件 SDK 子路径](/plugins/sdk-subpaths)。

编译器入口点清单位于 `scripts/lib/plugin-sdk-entrypoints.json` 中；类型化的公共导出不包括 `scripts/lib/plugin-sdk-private-local-only-subpaths.json` 中列出的内部子路径。该列表中的生产条目保留 JavaScript-only 单独发布的官方插件的主机运行时导出，而仅测试条目保持未导出。运行`pnpm plugin-sdk:surface`来审计公共导出计数。 `scripts/lib/plugin-sdk-deprecated-public-subpaths.json` 中跟踪已弃用的公共子路径，这些子路径足够旧且未由捆绑扩展生产代码使用； `scripts/lib/plugin-sdk-deprecated-barrel-subpaths.json` 中跟踪了广泛已弃用的再出口桶。

## <a id="internal-module-convention"></a> 内部模块约定

在你的插件中，内部导入请使用本地 barrel 文件：

```text
my-plugin/
  api.ts            # Public exports for external consumers
  runtime-api.ts    # Internal-only runtime exports
  index.ts          # Plugin entry point
  setup-entry.ts    # Lightweight setup-only entry (optional)
```

<Warning>
  不要在生产代码中通过 `openclaw/plugin-sdk/<your-plugin>` 导入你自己的插件内部导入应通过 `./api.ts` 或 `./runtime-api.ts` 进行路由。SDK 路径只是一个外部契约。
</Warning>

对于对已加载外观可见的打包插件公开面（`api.ts`、`runtime-api.ts`、 `index.ts`、`setup-entry.ts` 以及类似的公共入口文件），当 OpenClaw 已经运行时， 优先使用当前运行时配置快照。如果还没有运行时快照，则回退到磁盘上已解析的配置文件。 打包后的插件外观应通过 OpenClaw 的插件外观加载器加载；直接从 `dist/extensions/...` 导入会绕过清单和运行时 sidecar 检查，而这些检查会在插件自身代码的打包安装中使用。

提供方插件可以暴露一个较窄、仅限插件本地的契约 barrel，当某个 helper 明确只适用于该提供方，并且尚未成为通用 SDK 子路径的一部分时。 打包示例：

- **Anthropic**：Claude beta 标头和 `service_tier` 流助手的公共 `api.ts` / `contract-api.ts` 接口。
- **`@openclaw/openai-provider`**: `api.ts` 导出 provider 构建器、 默认模型 helper，以及实时 provider 构建器。
- **`@openclaw/openrouter-provider`**：`api.ts` 导出提供程序构建器以及 onboarding/config 帮助程序。

<Warning>
  扩展生产代码还应避免 `openclaw/plugin-sdk/<other-plugin>` 导入。如果助手确实是共享的，请将其提升为中立的 SDK 子路径，例如 `openclaw/plugin-sdk/speech`、`.../provider-model-shared` 或其他面向功能的表面，而不是使两个插件相互依赖。
</Warning>
