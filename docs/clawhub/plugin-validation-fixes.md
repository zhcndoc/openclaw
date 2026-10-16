---
summary: "在发布之前修复 ClawHub 插件包验证结果"
read_when:
  - "您运行clawhub包验证并需要修复插件结果"
  - "ClawHub 插件包发布被拒绝或警告"
  - "您正在发布之前更新插件包元数据"
title: "插件验证修复"
---

# <a id="plugin-validation-fixes"></a> 插件验证修复

ClawHub 在发布之前验证插件包，还可以显示自动包扫描的结果。此页面涵盖面向作者的发现，这意味着插件作者可以在其包元数据、清单、SDK 导入或已发布的工件中修复发现。

它不涵盖内部插件检查器覆盖率调查结果。如果完整报告包含扫描仪维护代码而没有作者修复指南，则这些代码适用于 OpenClaw 维护者而不是插件作者。

应用任何修复后，重新运行：

```bash
clawhub package validate <path-to-plugin>
```

## <a id="author-facing-findings"></a> 面向作者的调查结果

当已弃用的 OpenClaw API 有计划的停用日期时，插件页面会显示信息性 API 更新通知。打开 **API 详细信息** 查看每个 API 及其替代品。该日期为最终兼容日；这些通知不会阻止安装。发布者还会在其仪表板中看到 **API update** 项。单独的兼容性错误继续显示现有的不兼容警报。

更新到替换 API 后，验证并发布新版本以刷新插件最新版本的结果。

| 代码                                    | 从这里开始                                                                                                                  |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `package-json-missing`                  | [添加包元数据](/clawhub/plugin-validation-fixes#package-json-missing)                                                   |
| `package-openclaw-metadata-missing`     | [添加包openclaw block](/clawhub/plugin-validation-fixes#package-openclaw-metadata-missing)                            |
| `package-openclaw-entry-missing`        | [声明 OpenClaw 包入口点](/clawhub/plugin-validation-fixes#package-openclaw-entry-missing)                         |
| `package-entrypoint-missing`            | [发布声明的入口点](/clawhub/plugin-validation-fixes#package-entrypoint-missing)                                  |
| `package-install-metadata-incomplete`   | [完整安装元数据](/clawhub/plugin-validation-fixes#package-install-metadata-incomplete)                               |
| `package-plugin-api-compat-missing`     | [声明插件 API 兼容性](/clawhub/plugin-validation-fixes#package-plugin-api-compat-missing)                          |
| `package-min-host-version-drift`        | [Align最低主机版本](/clawhub/plugin-validation-fixes#package-min-host-version-drift)                                   |
| `package-manifest-version-drift`        | [对齐包和清单版本](/clawhub/plugin-validation-fixes#package-manifest-version-drift)                          |
| `package-openclaw-unsupported-metadata` | [删除不支持的 OpenClaw 包元数据](/clawhub/plugin-validation-fixes#package-openclaw-unsupported-metadata)          |
| `package-npm-pack-unavailable`          | [使npm神器可打包](/clawhub/plugin-validation-fixes#package-npm-pack-unavailable)                                 |
| `package-npm-pack-entrypoint-missing`   | [在 npm 包输出中包含入口点](/clawhub/plugin-validation-fixes#package-npm-pack-entrypoint-missing)                  |
| `package-npm-pack-metadata-missing`     | [在 npm 包输出中包含元数据](/clawhub/plugin-validation-fixes#package-npm-pack-metadata-missing)                       |
| `manifest-name-missing`                 | [添加清单显示名称](/clawhub/plugin-validation-fixes#manifest-name-missing)                                           |
| `manifest-unknown-fields`               | [删除不支持的清单字段](/clawhub/plugin-validation-fixes#manifest-unknown-fields)                                  |
| `manifest-unknown-contracts`            | [删除不支持的合约密钥](/clawhub/plugin-validation-fixes#manifest-unknown-contracts)                                 |
| `legacy-root-sdk-import`                | [替换root SDK 导入](/clawhub/plugin-validation-fixes#legacy-root-sdk-import)                                             |
| `reserved-sdk-import`                   | [删除保留的SDK进口](/clawhub/plugin-validation-fixes#reserved-sdk-import)                                             |
| `sdk-load-session-store`                | [替换整个会话存储访问](/clawhub/plugin-validation-fixes#sdk-load-session-store)                                   |
| `sdk-session-store-write`               | [替换整个会话存储写入](/clawhub/plugin-validation-fixes#sdk-session-store-write)                                  |
| `sdk-session-file-helper`               | [替换会话文件路径助手](/clawhub/plugin-validation-fixes#sdk-session-file-helper)                                   |
| `sdk-session-transcript-file-target`    | [替换旧的转录文件目标](/clawhub/plugin-validation-fixes#sdk-session-transcript-file-target)                   |
| `sdk-session-transcript-low-level`      | [替换低级转录助手](/clawhub/plugin-validation-fixes#sdk-session-transcript-low-level)                       |
| `legacy-before-agent-start`             | [替换before_agent_start](/clawhub/plugin-validation-fixes#legacy-before-agent-start)                                        |
| `provider-auth-env-vars`                | [移动提供商环境变量以设置元数据](/clawhub/plugin-validation-fixes#provider-auth-env-vars)                             |
| `channel-env-vars`                      | [当前元数据中的镜像通道环境变量](/clawhub/plugin-validation-fixes#channel-env-vars)                                |
| `security-manifest-schema-unavailable`  | [删除不可用的安全清单架构引用](/clawhub/plugin-validation-fixes#security-manifest-schema-unavailable) |
| `unrecognized-security-manifest`        | [删除不受支持的安全清单文件](/clawhub/plugin-validation-fixes#unrecognized-security-manifest)                   |

## <a id="package-metadata"></a> 包元数据

### <a id="package-json-missing"></a> package-json-缺失

包根不包含 `package.json`，因此 ClawHub 无法识别 npm 包、版本、入口点或 OpenClaw 元数据。

- 添加`package.json`与`name`、`version`和`type`。
- 当软件包附带 OpenClaw 插件时添加 `openclaw` 块。
- 使用 [ 构建插件 ](/plugins/building-plugins) 作为最小包示例，使用 [ 插件清单 ](/plugins/manifest#manifest-versus-package.json) 用于包与清单拆分。
- 重新运行`clawhub package validate <path-to-plugin>`。

### <a id="package-openclaw-metadata-missing"></a> package-openclaw-元数据缺失

该包具有 `package.json`，但未声明 OpenClaw 包元数据。

- 添加`package.json#openclaw`。
- 包括入口点元数据，例如 `openclaw.extensions` 或 `openclaw.runtimeExtensions`。
- 当通过 ClawHub 发布或安装包时添加兼容性并安装元数据。
- 请参阅影响发现的 [package.json 字段](/plugins/manifest#package.json-fields-that-affect-discovery)。
- 重新运行`clawhub package validate <path-to-plugin>`。

### package-openclaw-entry-missing

包元数据存在，但未声明 OpenClaw 运行时入口点。

- 为本机插件入口点添加 `openclaw.extensions`。
- 当发布的包应加载构建的 JavaScript 时添加 `openclaw.runtimeExtensions`。
- 将所有入口点路径保留在包目录内。
- 请参阅影响发现的 [ 插件入口点 ](/plugins/sdk-entrypoints) 和 [package.json 字段](/plugins/manifest#package.json-fields-that-affect-discovery)。
- 重新运行`clawhub package validate <path-to-plugin>`。

### package-entrypoint-missing

该包声明了 OpenClaw 入口点，但正在验证的包中缺少引用的文件。

- 检查`openclaw.extensions`、`openclaw.runtimeExtensions`、`openclaw.setupEntry`和`openclaw.runtimeSetupEntry`中的每条路径。
- 如果入口点生成到 `dist` 中，则构建包。
- 如果入口点移动，则更新元数据。
- 请参阅 [插件入口点](/plugins/sdk-entrypoints)。
- 重新运行`clawhub package validate <path-to-plugin>`。

### <a id="package-install-metadata-incomplete"></a> 软件包安装元数据不完整

ClawHub 无法判断应如何安装或更新该软件包。

- 使用支持的安装源填充 `openclaw.install`，例如 `clawhubSpec`、`npmSpec` 或 `localPath`。
- 当有多个安装源可用时设置 `openclaw.install.defaultChoice`。
- 对于最低 OpenClaw 主机版本，请使用 `openclaw.install.minHostVersion`。
- 请参阅影响发现的 [package.json 字段](/plugins/manifest#package.json-fields-that-affect-discovery)。
- 重新运行`clawhub package validate <path-to-plugin>`。

### package-plugin-api-compat-missing

该包没有声明它支持的 OpenClaw 插件 API 范围。

- 将`openclaw.compat.pluginApi`添加到`package.json`。
- 使用您构建和测试的 OpenClaw 插件 API 版本或 semver 底层。
- 将其与软件包版本分开。软件包版本描述了插件版本； `openclaw.compat.pluginApi` 描述了主机 API 合约。
- 请参阅影响发现的 [package.json 字段](/plugins/manifest#package.json-fields-that-affect-discovery)。
- 重新运行`clawhub package validate <path-to-plugin>`。

### package-min-host-version-drift

包最低主机版本与构建该包所依据的 OpenClaw 版本元数据不匹配。

- 检查`openclaw.install.minHostVersion`。
- 检查包中的任何 OpenClaw 构建元数据，例如发布期间使用的 OpenClaw 版本。
- 将最低主机版本与软件包实际支持的主机版本范围保持一致。
- 请参阅影响发现的 [package.json 字段](/plugins/manifest#package.json-fields-that-affect-discovery)。
- 重新运行`clawhub package validate <path-to-plugin>`。

### package-manifest-version-drift

包版本和插件清单版本不一致。

- 首选 `package.json#version` 作为软件包发布版本。
- 如果 `openclaw.plugin.json` 也有 `version`，则在包元数据具有权威性时更新它以匹配或删除过时的清单版本元数据。
- 更改已发布的元数据后发布新的包版本。
- 请参阅 [插件清单](/plugins/manifest)。
- 重新运行`clawhub package validate <path-to-plugin>`。

### <a id="package-openclaw-unsupported-metadata"></a> package-openclaw-不支持的元数据

`package.json#openclaw` 块包含 OpenClaw 包元数据不支持的字段。

- 删除不支持的字段，例如`openclaw.bundle`。
- 将本机插件元数据保留在 `openclaw.plugin.json` 中。
- 将包入口点、兼容性、安装、设置和目录元数据保留在支持的 `package.json#openclaw` 字段中。
- 请参阅影响发现的 [package.json 字段](/plugins/manifest#package.json-fields-that-affect-discovery)。
- 重新运行`clawhub package validate <path-to-plugin>`。

## <a id="published-artifact"></a> 发布神器

### <a id="package-npm-pack-unavailable"></a> package-npm-pack-不可用

该包无法打包到 ClawHub 将检查或发布的工件中。

- 从包根运行 `npm pack --dry-run`。
- 修复无效的包元数据、损坏的生命周期脚本或导致打包失败的文件条目。
- 如果此包用于公开发布，请删除 `private: true`。
- 重新运行`clawhub package validate <path-to-plugin>`。

### <a id="package-npm-pack-entrypoint-missing"></a> package-npm-pack-入口点缺失

可以打包该包，但打包的工件不包含 `package.json#openclaw` 中声明的入口点文件。

- 运行 `npm pack --dry-run` 并检查将包含的文件。
- Build 在打包前生成入口点。
- Update `files`、`.npmignore` 或构建输出，以便包含声明的入口点。
- 请参阅 [插件入口点](/plugins/sdk-entrypoints)。
- 重新运行`clawhub package validate <path-to-plugin>`。

### <a id="package-npm-pack-metadata-missing"></a> package-npm-pack-元数据缺失

打包的工件缺少源包中存在的 OpenClaw 元数据。

- 运行 `npm pack --dry-run` 并检查包含的元数据文件。
- 确保 `package.json` 在打包工件中包含 `openclaw` 块。
- 确保当包是本机 OpenClaw 插件时包含 `openclaw.plugin.json`。
- 更新`files`或`.npmignore`，因此不排除包元数据。
- 请参见 [构建插件](/plugins/building-plugins)。
- 重新运行`clawhub package validate <path-to-plugin>`。

## <a id="manifest-metadata"></a> Manifest 元数据

### <a id="manifest-name-missing"></a> 清单名称缺失

本机插件清单不包含显示名称。

- 向`openclaw.plugin.json`添加一个非空的`name`字段。
- 保持 `name` 可读，并保持 `id` 作为稳定的机器 ID。
- 请参阅 [插件清单](/plugins/manifest)。
- 重新运行`clawhub package validate <path-to-plugin>`。

### <a id="manifest-unknown-fields"></a> 清单未知字段

插件清单具有 OpenClaw 不支持的顶级字段。

- 将每个顶级字段与 [ 清单字段参考 ](/plugins/manifest#top-level-field-reference) 进行比较。
- 从 `openclaw.plugin.json` 中删除自定义字段。
- 将包或安装元数据移动到支持的 `package.json#openclaw` 字段而不是清单中。
- 重新运行`clawhub package validate <path-to-plugin>`。

### manifest-unknown-contracts

清单声明 `contracts` 内不支持的密钥。

- 将 `contracts` 下的每个密钥与 [ 合约参考 ](/plugins/manifest#contracts-reference) 进行比较。
- 删除不支持的合约密钥。
- 将运行时行为移至插件注册代码中，并将 `contracts` 限制为静态功能所有权元数据。
- 重新运行`clawhub package validate <path-to-plugin>`。

## <a id="sdk-and-compatibility-migration"></a> SDK 和兼容性迁移

### <a id="legacy-root-sdk-import"></a> legacy-root-sdk-导入

该插件从已弃用的根 SDK 桶导入：`openclaw/plugin-sdk`。

- 用集中的公共子路径导入替换根桶导入。
- 使用`openclaw/plugin-sdk/plugin-entry`作为`definePluginEntry`。
- 使用 `openclaw/plugin-sdk/channel-core` 作为频道输入助手。
- 使用[导入约定](/plugins/building-plugins#import-conventions)和[插件SDK子路径](/plugins/sdk-subpaths)来查找窄导入。
- 重新运行`clawhub package validate <path-to-plugin>`。

### <a id="reserved-sdk-import"></a> 保留-sdk-导入

该插件导入为捆绑插件或内部兼容性保留的 SDK 路径。

- 将保留的 OpenClaw 内部 SDK 导入替换为记录的公共 `openclaw/plugin-sdk/*` 子路径。
- 如果该行为没有公共SDK，请将帮助程序保留在您的包中或请求公共OpenClaw API。
- 使用[插件SDK子路径](/plugins/sdk-subpaths)和[SDK迁移](/plugins/sdk-migration)来选择支持的导入。
- 重新运行`clawhub package validate <path-to-plugin>`。

### <a id="sdk-load-session-store"></a> sdk-加载会话存储

该插件仍然使用已弃用的整个会话存储帮助程序 `loadSessionStore`。

- 读取会话状态时使用 `getSessionEntry(...)` 或 `listSessionEntries(...)`。
- 写入会话状态时使用 `patchSessionEntry(...)` 或 `upsertSessionEntry(...)`。
- 避免加载、改变和保存整个会话存储对象。
- 仅当您声明的兼容性范围仍支持需要它的较旧 OpenClaw 版本时才保留 `loadSessionStore(...)`。
- 请参见 [运行时 API](/plugins/sdk-runtime#runtime-namespaces) 和 [插件 SDK 子路径](/plugins/sdk-subpaths)。
- 重新运行`clawhub package validate <path-to-plugin>`。

### <a id="sdk-session-store-write"></a> sdk-会话存储-写入

该插件仍然使用已弃用的整个会话存储写入帮助程序，例如 `saveSessionStore` 或 `updateSessionStore`。

- 更新现有会话条目上的字段时使用 `patchSessionEntry(...)`。
- 替换或创建会话条目时使用 `upsertSessionEntry(...)`。
- 避免加载、改变和保存整个会话存储对象。
- 仅在您声明的兼容性范围仍支持需要它们的较旧 OpenClaw 版本时保留全商店写入帮助程序。
- 请参见 [运行时 API](/plugins/sdk-runtime#runtime-namespaces) 和 [插件 SDK 子路径](/plugins/sdk-subpaths)。
- 重新运行`clawhub package validate <path-to-plugin>`。

### <a id="sdk-session-file-helper"></a> sdk-会话-文件-帮助程序

该插件仍然使用已弃用的会话文件路径帮助程序，例如 `resolveSessionFilePath` 或 `resolveAndPersistSessionFile`。

- 使用 `getSessionEntry(...)` 按代理和会话身份读取会话元数据。
- 使用 `patchSessionEntry(...)` 或 `upsertSessionEntry(...)` 保存会话元数据。
- 在代码准备转录操作时使用转录标识或目标助手。
- 不要保留或依赖旧的转录文件路径。
- 请参见 [运行时 API](/plugins/sdk-runtime#runtime-namespaces) 和 [插件 SDK 子路径](/plugins/sdk-subpaths)。
- 重新运行`clawhub package validate <path-to-plugin>`。

### <a id="sdk-session-transcript-file-target"></a> sdk-会话-转录-文件-目标

该插件仍然使用已弃用的转录文件目标帮助器 `resolveSessionTranscriptLegacyFileTarget`。

- 当代码只需要公共会话标识时使用 `resolveSessionTranscriptIdentity(...)`。
- 当代码需要结构化转录操作目标时使用 `resolveSessionTranscriptTarget(...)`。
- 避免直接读取或构建遗留转录文件目标。
- 仅当您声明的兼容性范围仍支持需要它的较旧 OpenClaw 版本时才保留旧版助手。
- 请参见 [运行时 API](/plugins/sdk-runtime#runtime-namespaces) 和 [插件 SDK 子路径](/plugins/sdk-subpaths)。
- 重新运行`clawhub package validate <path-to-plugin>`。

### <a id="sdk-session-transcript-low-level"></a> sdk-会话-转录本-低级别

该插件仍然使用已弃用的低级转录助手，例如 `appendSessionTranscriptMessage` 或 `emitSessionTranscriptUpdate`。

- 使用 `appendSessionTranscriptMessageByIdentity(...)` 进行成绩单附加。
- 使用 `publishSessionTranscriptUpdateByIdentity(...)` 进行成绩单更新通知。
- 更喜欢结构化转录运行时表面，以便 OpenClaw 可以应用正确的事务边界和身份处理。
- 仅在您声明的兼容性范围仍支持需要它们的较旧 OpenClaw 版本时保留低级转录助手。
- 请参见 [运行时 API](/plugins/sdk-runtime#runtime-namespaces) 和 [插件 SDK 子路径](/plugins/sdk-subpaths)。
- 重新运行`clawhub package validate <path-to-plugin>`。

### legacy-before-agent-start

该插件仍然使用旧版 `before_agent_start` 挂钩。

- 将模型或提供商覆盖工作移至 `before_model_resolve`。
- 将提示或上下文突变工作移至`before_prompt_build`。
- 仅当您声明的兼容性范围仍支持需要它的较旧 OpenClaw 版本时才保留 `before_agent_start`。
- 请参阅 [Hooks](/plugins/hooks) 和 [ 插件兼容性](/plugins/compatibility)。
- 重新运行`clawhub package validate <path-to-plugin>`。

### provider-auth-env-vars

该清单仍使用旧版 `providerAuthEnvVars` 提供程序身份验证元数据。

- 将提供程序环境变量元数据镜像到 `setup.providers[].envVars` 中。
- 仅将 `providerAuthEnvVars` 保留为兼容性元数据，而您支持的 OpenClaw 系列仍需要它。
- 请参见[设置参考](/plugins/manifest#setup-reference)和[SDK迁移](/plugins/sdk-migration)。
- 重新运行`clawhub package validate <path-to-plugin>`。

### <a id="channel-env-vars"></a> 通道环境变量

清单使用旧版或较旧的通道环境变量元数据，而没有 ClawHub 期望的当前设置或配置元数据。

- 保持通道环境变量元数据声明性，以便 OpenClaw 可以在不加载通道运行时的情况下检查设置状态。
- 将环境驱动的通道设置镜像到插件形状使用的当前设置、通道配置或包通道元数据中。
- 仅保留 `channelEnvVars` 作为兼容性元数据，而较旧的受支持 OpenClaw 版本仍然需要它。
- 参见[插件清单](/plugins/manifest)和[频道插件](/plugins/sdk-channel-plugins)。
- 重新运行`clawhub package validate <path-to-plugin>`。

## <a id="security-manifest"></a> 安全清单

### <a id="security-manifest-schema-unavailable"></a> 安全清单架构不可用

该软件包附带 `openclaw.security.json` 和 ClawHub 无法识别为可用的架构引用。

- 如果架构 URL 仅供咨询，则删除该架构。
- 仅在 OpenClaw 发布版本化模式后才使用记录的版本化模式。
- 重新运行`clawhub package validate <path-to-plugin>`。

### <a id="unrecognized-security-manifest"></a> unrecognized-安全清单

该软件包附带了不受支持的安全清单文件。

- 删除 `openclaw.security.json`，直到 OpenClaw 记录版本化安全清单架构和 ClawHub 行为。
- 将安全敏感行为记录在公共包文档或 README 中，直到清单合同存在。
- 重新运行`clawhub package validate <path-to-plugin>`。

## <a id="related"></a> 相关内容

- [ClawHub CLI](/clawhub/cli)
- [ClawHub 发布](/clawhub/publishing)
- [构建插件](/plugins/building-plugins)
- [插件清单](/plugins/manifest)
- [插件入口点](/plugins/sdk-entrypoints)
- [插件兼容性](/plugins/compatibility)
