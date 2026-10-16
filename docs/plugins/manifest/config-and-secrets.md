---
summary: "清单危险标记、SecretRef 迁移和秘密提供程序预设元数据"
read_when:
  - "您需要医生标记您的插件拥有的危险配置文字"
  - "您正在将插件配置值迁移到 SecretRefs"
  - "您正在发布可重用的 SecretRef exec 提供程序预设"
title: "清单配置和秘密字段"
sidebarTitle: "配置和秘密字段"
---

通用核心配置帮助程序读取的清单字段：危险标记检测、SecretRef 迁移目标、遗留路径缩小和秘密提供程序预设。 [插件清单](/plugins/manifest)参考的一部分； [ 顶级字段引用 ](/plugins/manifest#top-level-field-reference) 列出了每个字段。

## <a id="configcontracts-reference"></a> configContracts 参考

将 `configContracts` 用于清单所有的配置行为，这些行为是通用核心辅助工具所需，但又不能导入插件运行时：危险标志检测、SecretRef 迁移目标，以及旧版配置路径缩窄。

```json
{
  "configContracts": {
    "compatibilityMigrationPaths": ["legacyProvider"],
    "compatibilityRuntimePaths": ["legacyProvider.webhook"],
    "dangerousFlags": [
      {
        "path": "accounts.*.allowUnverifiedSenders",
        "equals": true
      }
    ],
    "secretInputs": {
      "bundledDefaultEnabled": false,
      "paths": [
        {
          "path": "routes.*.secret",
          "expected": "string",
          "ownerKind": "route"
        }
      ]
    }
  }
}
```

| 字段                         | 必需的 | 类型       | 含义                                                                                                                                                                                                                          |
| ----------------------------- | -------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `compatibilityMigrationPaths` | No       | `string[]` | 表示此插件的设置时兼容性迁移可能适用的相对于根的配置路径。当配置从未引用该插件时，允许通用运行时配置读取跳过每个插件的设置入口。                 |
| `compatibilityRuntimePaths`   | No       | `string[]` | 此插件可在运行时、插件代码完全激活之前处理的相对于根的兼容性路径。用于应缩小捆绑候选集、但无需导入每个兼容插件运行时的旧版入口。 |
| `dangerousFlags`              | No       | `object[]` | 启用时 `openclaw doctor` 应标记为不安全或危险的配置文字。请参阅 [dangerousFlags 条目](#dangerousflags-entries)。                                                                                       |
| `secretInputs`                | No       | `object`   | `plugins.entries.<id>.config` 下的配置路径，用于 SecretRef 迁移、审核、启动实现和可选的运行时所有者隔离。请参阅 [secretInputs 路径](#secretinputs-paths)。                                         |

### <a id="dangerousflags-entries"></a> dangerousFlags 条目

每个 `dangerousFlags` 条目支持：

| 字段    | 必需的 | 类型                                  | 含义                                                                                                       |
| -------- | -------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `path`   | 是      | `string`                              | 相对于 `plugins.entries.<id>.config` 的点分隔配置路径。支持 map/array 段的 `*` 通配符。 |
| `equals` | 是      | `string \| number \| boolean \| null` | 将此配置值标记为危险的精确字面量。                                                            |

### <a id="secretinputs-paths"></a> secret输入路径

`secretInputs` 支持：

| 字段                   | 必需的 | 类型       | 含义                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bundledDefaultEnabled` | No       | `boolean`  | 在确定此 SecretRef 入口是否处于活动状态时，覆盖捆绑插件的默认启用状态。当插件已捆绑、但该入口应保持非活动状态直到在配置中显式启用时使用。                                                                                                                                                           |
| `paths`                 | 是      | `object[]` | 秘密形状的配置路径，每个路径都有`path`（点分隔，相对于`plugins.entries.<id>.config`，支持`*`通配符），可选的`expected`（`"string"`是唯一接受的值）和可选的`ownerKind`（`"capability"`或`"route"`）。当解析失败时，声明的所有者仅隔离完全匹配的路径；它的所有者 ID 是完整的配置路径。 |

当能力所有者不可用时，能力所有者就会失败，因此陈旧的凭证永远不会保持活动状态。路由所有者可以保留最后已知的正确值，同时其完整的插件配置和提供者定义保持不变。

声明的路径还控制设置编辑，包括本地架构引用后面的通配符和字段。结构化SecretRefs保留`source`和`provider`，而隐藏`id`；明文秘密被完全隐藏。不相关的设置保存时会保留原始参考。更改其来源或提供者需要显式标识符。

对于声明 `secretInputs` 的插件，`configSchema` 验证与运行时配置配对的预解析源配置。有效的 SecretRef 不会被拒绝，因为其解析的凭据是具有不同形状的字符串。无效的纯文本源值仍然无法通过验证。运行时加载、CLI注册和root命令发现使用相同的规则；插件接收从源配置中选择的默认值的解析值，而不更改任何输入。

具体路径保留文字记录键和数组索引：`headers["X.Trace"]` 与 `headers.X.Trace` 保持不同，记录键 `["0"]` 与数组索引 `[0]` 保持不同。包含点的插件ID以同样的方式引用，例如`plugins.entries["example.plugin"].config.headers["X.Trace"]`。

## <a id="secretproviderintegrations-reference"></a> secretProviderIntegrations 参考

当某个插件可以发布可复用的 SecretRef exec 提供方预设时，请使用 `secretProviderIntegrations`。OpenClaw 会在插件运行时加载之前读取这些元数据，将插件所有权存储到 `secrets.providers.<alias>.pluginIntegration`，并将实际的密钥解析交由 SecretRef 运行时处理。预设仅对内置插件以及从受管理的插件安装根目录（例如 git 和 ClawHub 安装）中发现的已安装插件可用。

```json
{
  "secretProviderIntegrations": {
    "secret-store": {
      "providerAlias": "team-secrets",
      "displayName": "Team secrets",
      "source": "exec",
      "command": "${node}",
      "args": ["./bin/resolve-secrets.mjs"]
    }
  }
}
```

映射键是集成 id。若省略 `providerAlias`，OpenClaw 会使用该集成 id 作为 SecretRef 的提供方别名。提供方别名必须匹配常规的 SecretRef 提供方别名模式，例如 `team-secrets` 或 `onepassword-work`。

当操作员选择该预设时，OpenClaw 会写入类似这样的提供方引用：

```json
{
  "secrets": {
    "providers": {
      "team-secrets": {
        "source": "exec",
        "pluginIntegration": {
          "pluginId": "acme-secrets",
          "integrationId": "secret-store"
        }
      }
    }
  }
}
```

在 startup/reload 处，OpenClaw 通过加载当前插件清单元数据、检查所属插件是否已安装且处于活动状态以及从清单中具体化 exec 命令来解析该提供程序。禁用或删除插件会撤销活动 SecretRefs 的提供程序。想要独立执行配置的操作员仍然可以直接编写手动 `command`/`args` 提供程序。

`source` 接受单个值 `"exec"`。 `command` 必须是 `${node}`，并且 `args[0]` 必须是 `./` 插件根相对解析器脚本。 OpenClaw 在 startup/reload 将其具体化为当前 Node 可执行文件和绝对插件内脚本路径。 Node 选项（例如 `--require`、`--import`、`--loader`、`--env-file`、`--eval` 和 `--print`）不是清单预设合约的一部分。需要非 Node 命令的操作员可以直接配置独立的手动执行提供程序。

OpenClaw 从插件根目录派生清单预设的 `trustedDirs`，对于 `${node}` 预设，派生当前的 Node 可执行目录。清单编写的 `trustedDirs` 将被忽略。其他 exec 提供程序选项（例如 `timeoutMs`、`noOutputTimeoutMs`、`maxOutputBytes`、`jsonOnly`、`env` 和 `passEnv`）会传递到正常的 SecretRef exec 提供程序配置。
