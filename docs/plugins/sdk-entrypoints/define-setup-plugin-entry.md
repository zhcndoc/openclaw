---
summary: "轻量级设置入口助手和窄设置助手系列"
title: "插件 SDK DefineSetupPluginEntry 帮助程序"
sidebarTitle: "定义SetupPluginEntry"
read_when:
  - "您正在编写 setup-entry.ts 文件"
  - "您需要狭窄的设置、存档或秘密文件帮助程序导入"
---

轻量级 `setup-entry.ts` 文件的入门帮助程序，以及与其配对的窄设置帮助程序系列。 [插件入口点部分参考](/plugins/sdk-entrypoints)。

## `defineSetupPluginEntry`

**导入：** `openclaw/plugin-sdk/channel-core`

用于轻量级的 `setup-entry.ts` 文件。只返回 `{ plugin }`，不包含运行时或 CLI 接线。

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineSetupPluginEntry(myChannelPlugin);
```

当通道被禁用或取消配置时，OpenClaw 加载此内容而不是完整条目。请参阅 [Setup 和 Config](/plugins/sdk-setup#setup-entry) 了解何时重要。

当完成延迟的插件升级时，Doctor 还会检查此公共设置条目。如果提供的话，它使用 `plugin.lifecycle.detectLegacyStateMigrations`。将检测器保留在这个轻量级条目上，而发布的版本可能仍需要遗留迁移；省略它并不能证明完整条目没有迁移，因此 Doctor 保留升级义务待定。丢失或损坏的设置条目也会使义务悬而未决。

将 `defineSetupPluginEntry(...)` 与以下更窄的设置辅助工具系列搭配使用：

| 导入                                  | 用途                                                                                                                                                                            |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw/plugin-sdk/setup-runtime`     | 运行时安全的设置辅助工具：`createSetupTranslator`、导入安全的设置补丁适配器、查找备注输出、`promptResolvedAllowFrom`、`splitSetupEntries`、委托式设置代理 |
| `openclaw/plugin-sdk/channel-setup`     | 可选安装的设置接口                                                                                                                                                    |
| `openclaw/plugin-sdk/channel-dm-policy` | 面向账户的 DM 策略描述符，用于设置流程                                                                                                                                |
| `openclaw/plugin-sdk/setup-tools`       | Setup/install CLI、存档和文档帮助程序                                                                                                                                       |
| `openclaw/plugin-sdk/archive`           | 有界 TAR/gzip 成员检查、档案提取和单条目读取                                                                                                     |
| `openclaw/plugin-sdk/root-walk`         | 预算受限、根目录有界的目录遍历                                                                                                                                           |
| `openclaw/plugin-sdk/secret-file`       | 固定目标的机密读取和先写入者优先创建                                                                                                                                 |

`inspectTarArchive({ archivePath, timeoutMs, limits, entryFilter, onFiltered })` 返回接受的 `{ path, kind, size }` TAR/gzip 成员的有界、冻结列表，而不创建提取的树。它使用fs-safe的完整准入和零带提取策略，而不是tar显示输出。路径使用现有的规范化存档标识； LF 和 Unicode 拼写被保留。使用匹配的 filter/limit 设置并保留或验证相同的存档字节以供后续提取：检查结果不可重复使用写入权限。只有解决的结果才是完整录取的证据；过滤器回调可以在以后的策略失败之前发生。成员清单不会合成隐式父目录，因此整个树使用者必须单独授权这些父路径。

将繁重的 SDK、CLI 注册和长期运行时服务保留在完整条目中。

分割设置和运行时表面的捆绑工作区通道可以使用 `openclaw/plugin-sdk/channel-entry-contract` 中的 `defineBundledChannelSetupEntry(...)`。它允许设置条目保持设置安全的 plugin/secrets 导出，同时仍然公开运行时设置器：

```typescript
import { defineBundledChannelSetupEntry } from "openclaw/plugin-sdk/channel-entry-contract";

export default defineBundledChannelSetupEntry({
  importMetaUrl: import.meta.url,
  plugin: {
    specifier: "./channel-plugin-api.js",
    exportName: "myChannelPlugin",
  },
  runtime: {
    specifier: "./runtime-api.js",
    exportName: "setMyChannelRuntime",
  },
  registerSetupRuntime(api) {
    api.registerHttpRoute({
      path: "/my-channel/events",
      auth: "plugin",
      handler: async (req, res) => {
        /* setup-safe route */
      },
    });
  },
});
```

仅当设置流程确实需要轻量级运行时 setter，或需要为未配置的通道提供设置安全的网关接口时，才使用此方式。 `registerSetupRuntime` 仅在 `"setup-runtime"` 加载时运行；请将其限制为配置专用路由，或该设置流程所需的方法。
