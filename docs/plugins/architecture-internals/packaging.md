---
summary: "插件 SDK 导入子路径、多扩展包、频道目录和安装元数据"
read_when:
  - "实现包包"
  - "您正在为新插件选择插件 SDK 导入子路径"
  - "您正在发布频道目录或安装元数据"
title: "包包和导入路径"
sidebarTitle: "包和导入路径"
---

插件应导入哪些 SDK 子路径、包包如何将扩展转换为插件，以及通道包可以发布的目录和安装元数据。 [插件架构内部](/plugins/architecture-internals)指南的一部分。

## <a id="plugin-sdk-import-paths"></a> 插件 SDK 导入路径

在编写新插件时，请使用更窄的 SDK 子路径，而不是单体的 `openclaw/plugin-sdk` 根聚合入口。核心子路径：

| 子路径                            | 用途                                      |
| ---------------------------------- | -------------------------------------------- |
| `openclaw/plugin-sdk/plugin-entry` | 插件注册原语               |
| `openclaw/plugin-sdk/channel-core` | 频道 entry/build 帮助者                  |
| `openclaw/plugin-sdk/core`         | 通用共享辅助工具和总括契约 |

通道插件从一系列窄接口中进行选择 - `channel-setup`、`setup-runtime`、`setup-tools`、`channel-pairing`、`channel-contract`、`channel-feedback`、`channel-inbound`、`channel-outbound`、 `command-auth-native`、`secret-input`、`webhook-ingress`、`channel-targets` 和 `channel-actions`。批准行为应合并在一份 `approvalCapability` 合约上，而不是在不相关的插件字段之间混合。请参阅 [ 频道插件](/plugins/sdk-channel-plugins)。

运行时和配置助手位于匹配的集中 `*-runtime` 子路径下（`approval-runtime`、`agent-runtime`、`lazy-runtime`、`directory-runtime`、`text-utility-runtime`、`runtime-store`、`system-event-runtime`、 `heartbeat-runtime`、`channel-activity-runtime` 等）。首选 `config-contracts`、`plugin-config-runtime`、`runtime-config-snapshot` 和 `config-mutation`，而不是删除的宽 `config-runtime` 兼容桶。

<Info>
`openclaw/plugin-sdk/channel-lifecycle`、`channel-message`、`channel-reply-pipeline`、`config-runtime` 和 `infra-runtime` 已于 2026 年 9 月 30 日经 SDK- 所有者明确批准删除。迁移到以 [ 为重点的公众升级前的合约](/plugins/sdk-migration/how-to-migrate)；替换路径不会导出每个旧帮助程序或命名类型。
</Info>

仓库内部入口点（按打包插件包根目录）：

- `index.js` — 打包后的插件入口
- `api.js` — helper/types 桶
- `runtime-api.js` — 仅运行时聚合入口
- `setup-entry.js` — 设置插件入口

外部插件应仅导入 `openclaw/plugin-sdk/*` 子路径。切勿从核心或其他插件中导入另一个插件包的 `src/*`。门面加载的入口点优先使用活动运行时配置快照（如果存在），然后回退到磁盘上的已解析配置文件。

设置和提供者发现回调保留加载程序的范围 SDK 分辨率以用于延迟导入，包括打包插件中的私有块。这些导入使用正在运行的主机的 SDK，而不需要插件内的 `openclaw` 依赖项链接。撤销拥有的库存也会撤销其回调。

特定于功能的子路径（例如 `image-generation`、`media-understanding` 和 `speech`）的存在是因为捆绑插件会导入它们。它们不是自动长期冻结的外部合约——依赖它们时请检查相关的 SDK 参考页面。

## <a id="package-packs"></a> 包集合

插件目录可能包含 `package.json` 和 `openclaw.extensions`：

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"],
    "setupEntry": "./src/setup-entry.ts"
  }
}
```

每个条目都会成为一个插件。如果一个包列出了多个扩展，插件 id 会变为 `<manifestOrPackageName>/<fileBase>`（如果存在，则优先使用 manifest id；否则使用未带作用域的 `package.json` 名称）。

如果你的插件导入了 npm 依赖，请将它们安装在该目录中，以便 `node_modules` 可用（`npm install`／`pnpm install`）。

安全防护：在符号链接解析之后，每个 `openclaw.extensions` 条目仍必须保留在插件目录内。逃逸出包目录的条目将被拒绝。

安全说明：`openclaw plugins install` 使用项目本地 `npm install --omit=dev --ignore-scripts` 安装插件依赖项（无生命周期脚本，运行时无开发依赖项），忽略继承的全局 npm 安装设置。保持插件依赖树“纯 JS/TS”并避免需要 `postinstall` 构建的包。

可选项：`openclaw.setupEntry` 可以指向一个轻量级的仅用于设置的模块。当 OpenClaw 需要为被禁用的频道插件显示设置界面，或者当频道插件已启用但尚未配置时，它会加载 `setupEntry`，而不是完整的插件入口。这使启动和设置更轻量，同时仍允许主插件入口连接工具、钩子或其他仅运行时需要的代码。

捆绑的频道还可以发布仅用于设置的契约表面辅助函数，核心可以在加载完整频道运行时之前查询这些辅助函数。当前的设置提升表面包括：

- `singleAccountKeysToMove`
- `namedAccountPromotionKeys`
- `resolveSingleAccountPromotionTarget(...)`

当 Core 需要将旧的单帐户通道配置提升到 `channels.<id>.accounts.*` 而不加载完整的插件条目时，它会使用该表面。 Matrix 是当前的捆绑示例：当指定帐户已存在时，它仅将 auth/bootstrap 密钥移动到指定的升级帐户中，并且它可以保留配置的自定义默认帐户密钥，而不是始终创建 `accounts.default`。

这些设置补丁适配器保留了对内置契约表面功能的惰性发现。请保持导入轻量；提升表面只会在首次使用时加载，而不会在模块导入期间重新进入内置频道启动流程。

当设置表面包含网关 RPC 方法时，请将其置于插件专用的前缀下。核心管理命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）仍然保留，并始终解析为 `operator.admin`，即使插件请求了更窄的作用域。

### <a id="channel-catalog-metadata"></a> 频道目录元数据

频道插件可以通过 `openclaw.channel` 宣传 setup/discovery 元数据，并通过 `openclaw.install` 安装提示。这使得核心目录数据保持免费。

示例：

```json
{
  "name": "@openclaw/nextcloud-talk",
  "openclaw": {
    "extensions": ["./index.ts"],
    "channel": {
      "id": "nextcloud-talk",
      "label": "Nextcloud Talk",
      "selectionLabel": "Nextcloud Talk (self-hosted)",
      "docsPath": "/channels/nextcloud-talk",
      "docsLabel": "nextcloud-talk",
      "blurb": "Self-hosted chat via Nextcloud Talk webhook bots.",
      "order": 65,
      "aliases": ["nc-talk", "nc"]
    },
    "install": {
      "npmSpec": "@openclaw/nextcloud-talk",
      "localPath": "<bundled-plugin-local-path>",
      "defaultChoice": "npm"
    }
  }
}
```

除了最小示例之外，`openclaw.channel` 还有几个有用的字段：

- `detailLabel`：用​​于更丰富的 catalog/status 表面的辅助标签
- `docsLabel`：覆盖文档链接的文本
- `preferOver`：优先级较低的 plugin/channel id 此商品的排名应高于
- `selectionDocsPrefix`、`selectionDocsOmitLabel`、`selectionExtras`：选择界面的文案控制项
- `markdownCapable`：将通道标记为支持降价以进行出站格式化决策
- `exposure.configured`：设为 `false` 时，将频道从已配置频道列表界面中隐藏
- `exposure.setup`：设置为 `false` 时，从交互式 setup/configure 选择器中隐藏通道
- `exposure.docs`：将文档导航界面的通道标记为 internal/private
- `quickstartAllowFrom`：将频道加入标准快速入门 `allowFrom` 流程
- `forceAccountBinding`：即使只有一个账户，也要求显式账户绑定
- `preferSessionLookupForAnnounceTarget`：解析公告目标时优先使用会话查找

OpenClaw 还可以合并**外部频道目录**（例如 MPM 注册表导出）。把 JSON 文件放在以下任一位置：

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或者将 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`）指向一个或多个 JSON 文件 （comma/semicolon/`PATH`-delimited）。每个文件应包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。解析器还接受 `"packages"` 或 `"plugins"` 作为 `"entries"` 密钥的旧别名。

生成的频道目录条目和提供商安装目录条目在原始 `openclaw.install` 块旁边公开标准化的安装源事实。规范化事实标识 npm 规范是否是精确版本或浮动选择器、是否存在预期的完整性元数据以及本地源路径是否也可用。当 catalog/package 身份已知时，规范化事实会警告解析的 npm 包名称是否偏离该身份。当 `defaultChoice` 无效或指向不可用的源时，以及当 npm 完整性元数据存在而没有有效的 npm 源时，它们还会发出警告。消费者应将 `installSource` 视为附加可选字段，以便手工构建的条目和目录垫片不必合成它。这使得入门和诊断可以解释源平面状态，而无需导入插件运行时。

官方外部 npm 条目应该更喜欢精确的 `npmSpec` 加上 `expectedIntegrity`。裸包名称和 dist 标签仍然可以实现兼容性，但它们会显示源平面警告，因此目录可以转向固定的、经过完整性检查的安装，而不会破坏现有插件。当官方包被重命名时，目录条目可能会使用以前的包名称声明 `legacyNpmPackageNames`。可信更新将匹配的 npm 记录重写为当前 `npmSpec`，并将目录查找别名（例如通道 id）迁移到主插件 id。仅当主安装也是受官方信任时，才会删除别名和主 ID 的重复记录。 `legacyPluginIds` 仍然是非查找别名的插件 ID 切换的合同。当从本地目录路径安装时，它会在可能的情况下记录带有 `source: "path"` 的托管插件插件索引条目和相对于工作区的 `sourcePath` 。绝对运行负载路径保持在`plugins.load.paths`；安装记录避免将本地工作站路径复制到长期配置中。这使得本地开发安装对源平面诊断可见，而无需添加第二个原始文件系统路径公开表面。 `plugins.installedIndex` 下的持久 `config_machine_state` 值是安装的真实来源，可以在不加载插件运行时模块的情况下刷新。即使插件清单丢失或无效，其 `installRecords` 映射也是持久的；其 `plugins` 有效负载是可重建的清单视图。
