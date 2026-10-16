---
summary: "哪些运行前元数据位于 package.json 中，哪些重复的插件 ID 获胜"
read_when:
  - "您不确定元数据是否属于清单或 package.json"
  - "您正在声明入口点、安装提示或频道目录元数据"
  - "两个插件根共享一个 id，您需要知道加载哪一个"
title: "清单与 package.json"
sidebarTitle: "清单与 package.json"
---

当预运行时插件元数据不在清单中时，它位于何处，以及当两个插件根共享一个 id 时 OpenClaw 如何选择一个清单。 [插件清单](/plugins/manifest)参考的一部分； [ 顶级字段引用 ](/plugins/manifest#top-level-field-reference) 列出了每个字段。

## <a id="manifest-versus-package.json"></a><a id="manifest-versus-package-json"></a> Manifest 与 package.json

这两个文件用途不同：

| 文件                   | 用途                                                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | 发现、配置校验、认证选择元数据，以及插件代码运行前必须存在的 UI 提示                         |
| `package.json`         | npm 元数据、依赖安装，以及用于入口点、安装门控、设置或目录元数据的 `openclaw` 块 |

如果你不确定某条元数据应该放在哪里，请使用以下规则：

- 如果 OpenClaw 在加载插件代码之前必须知道它，就放在 `openclaw.plugin.json` 中
- 如果它涉及打包、入口文件或 npm 安装行为，就放在 `package.json` 中

### <a id="package.json-fields-that-affect-discovery"></a><a id="package-json-fields-that-affect-discovery"></a> 影响发现的 package.json 字段

一些运行前插件元数据有意放在 `package.json` 的 `openclaw` 块下，而不是 `openclaw.plugin.json` 中。`openclaw.bundle` 和 `openclaw.bundle.json` 不是 OpenClaw 插件契约；原生插件必须使用 `openclaw.plugin.json` 以及下面支持的 `package.json#openclaw` 字段。

重要示例：

| 字段                                                                                      | 含义                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                                                      | 声明原生插件入口点。必须位于插件包目录内。                                                                                                                         |
| `openclaw.runtimeExtensions`                                                               | 声明已安装包的构建后 JavaScript 运行时入口点。必须位于插件包目录内。                                                                                       |
| `openclaw.setupEntry`                                                                      | 在加入、通道设置和只读通道 status/SecretRef 发现期间使用的轻量级仅设置入口点。必须位于插件包目录中。                                  |
| `openclaw.runtimeSetupEntry`                                                               | 声明已安装包的构建后 JavaScript 设置入口点。需要同时存在 `setupEntry`，且必须位于插件包目录内。                                               |
| `openclaw.channel`                                                                         | 轻量级 channel 目录元数据，例如标签、文档路径、别名和选择提示文案。                                                                                                                       |
| `openclaw.channel.approvalFlags`                                                           | 在运行时加载前可用的封闭式审批行为标志。`native` 表示该 channel 拥有原生审批 UI 和同轮解决能力。                                                                 |
| `openclaw.channel.commands`                                                                | 在 channel 运行时加载前，由配置、审计和命令列表界面使用的静态原生命令及原生技能自动默认元数据。                                                                |
| `openclaw.channel.cliAddOptions`                                                           | 插件拥有的 [`openclaw channels add`](/cli/channels) 选项。每个条目都声明 `flags`、`description`、可选的 `defaultValue` 和可选的 `valueType`（`int` 或 `list`）用于通用输入强制。 |
| `openclaw.channel.configuredState`                                                         | 轻量级的已配置状态检查器元数据，可以在不加载完整 channel 运行时的情况下回答“仅通过环境变量的设置是否已经存在？”。                                                               |
| `openclaw.channel.persistedAuthState`                                                      | 轻量级的持久化认证检查器元数据，可以在不加载完整 channel 运行时的情况下回答“是否已经有任何登录状态？”。                                                                     |
| `openclaw.install.clawhubSpec` / `openclaw.install.npmSpec` / `openclaw.install.localPath` | Install/update 提示捆绑和外部发布的插件。                                                                                                                                         |
| `openclaw.install.defaultChoice`                                                           | 安装路径提示，包括本地结账选择。默认远程请求优先声明 npm，然后是 ClawHub；明确的来源选择仍然具有权威性。                                            |
| `openclaw.install.minHostVersion`                                                          | 支持的 OpenClaw 主机最低版本，使用类似 `>=2026.3.22` 或 `>=2026.5.1-beta.1` 的 semver 下限。                                                                                                   |
| `openclaw.compat.pluginApi`                                                                | 此包所需的最低 OpenClaw 插件 API 范围，使用类似 `>=2026.5.27` 的 semver 下限。                                                                                                       |
| `openclaw.install.expectedIntegrity`                                                       | 预期的 npm dist 完整性字符串，例如 `sha512-...`；安装和更新流程会根据它验证获取到的工件。                                                                                  |
| `openclaw.install.allowInvalidConfigRecovery`                                              | 当配置无效时，允许一条范围有限的捆绑插件重新安装恢复路径。                                                                                                                             |
| `openclaw.install.requiredPlatformPackages`                                                | 当锁文件中的平台约束与当前主机匹配时，必须实际安装的 npm 包别名。                                                                                                 |

清单元数据决定在运行时加载之前，引导过程中会出现哪些 provider/channel/setup 选项。`package.json#openclaw.install` 告诉引导流程，当用户选择这些选项之一时如何获取或启用该插件。不要把安装提示移到 `openclaw.plugin.json` 中。

配置的启动插件在网关开始侦听后从其完整运行时注册 HTTP 路由。在启动 sidecar 准备就绪之前，未声明的 HTTP 请求将返回 `503` 和 `Retry-After: 1`；核心路由在整个启动过程中保持可用。

对于 `openclaw.channel.cliAddOptions`，请使用 Commander 的长选项语法，例如 `--initial-sync-limit <n>`。设置 `valueType: "int"` 可将输入解析为非负整数；设置 `valueType: "list"` 可在插件设置适配器接收输入前，将以逗号、分号或换行分隔的输入拆分为字符串。省略 `valueType` 时，会将解析后的 Commander 值原样传递。

`openclaw.install.minHostVersion` 会在非捆绑插件来源的安装和清单注册表加载期间强制执行。无效值会被拒绝；对于较旧的主机，较新但有效的版本值会跳过外部插件。捆绑源插件被视为与主机检出版本保持同步。

`openclaw.install.requiredPlatformPackages` 适用于通过可选的、按平台区分的别名暴露所需原生二进制文件的 npm 包。为每个受支持的平台别名列出裸 npm 包名。在 npm install 期间，OpenClaw 只会验证锁文件约束与当前主机匹配的已声明别名。如果 npm 报告成功但省略了该别名，OpenClaw 会用新的缓存重试一次；如果该别名仍然缺失，则回滚安装。

在非捆绑插件源的软件包安装过程中强制执行 `openclaw.compat.pluginApi`。将其用于该包构建的 OpenClaw 插件 SDK/runtime API 底层。当插件包需要更新的 API 但仍为其他流程保留较低的安装提示时，它可能比 `minHostVersion` 更严格。官方 OpenClaw 发布同步将较低的官方插件 API 楼层提高到 OpenClaw 发布版本，并保留插件所需的更高楼层。当软件包有意支持较旧的主机时，仅插件版本可以保持较低的水平。不要单独使用包版本作为兼容性合同。 `peerDependencies.openclaw` 保留 npm 包元数据； OpenClaw 使用 `openclaw.compat.pluginApi` 合同来决定安装兼容性。

当两者发布相同的插件时，官方按需安装元数据应声明 `npmSpec` 为默认源，`clawhubSpec` 为辅助源。默认远程安装首先尝试 npm，然后仅当 npm 目标不可用时才尝试声明的 ClawHub 源。 ClawHub-only 插件保留在 ClawHub 上； OpenClaw 永远不会从 ClawHub slug 派生出 npm 包名称。显式源选择、精确版本和非 `latest` 标签仍然具有权威性。 Doctor 现有的过时运行时修复可以刷新其记录注册表中绑定到当前 OpenClaw 版本组的官方插件，通过记录替换版本来保留准确的 npm 引脚意图。裸机规格和 `@latest` 遵循有效的发布渠道策略，同时在安装记录中保留请求的选择器。完整性、兼容性、信任、安装策略和功能同意失败不会授权切换源。

确切的 npm 版本固定已存在于 `npmSpec` 中，例如 `"npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3"`。官方外部目录条目应将准确的规格与 `expectedIntegrity` 配对，以便如果获取的 npm 工件不再与固定版本匹配，则更新流会拒绝该工件。交互式入门仍然提供可信注册表 npm 规范，包括裸包名称和 dist 标签，以实现兼容性。目录诊断可以区分精确、浮动、完整性固定、完整性缺失、包名称不匹配和无效的默认选择源。当 `expectedIntegrity` 存在但没有可以固定的有效 npm 源时，它们还会发出警告。当 `expectedIntegrity` 存在时，install/update 流强制执行它；如果省略，则记录注册表解析时不使用完整性 pin。

当状态、channel 列表或 SecretRef 扫描需要在加载完整运行时之前识别已配置账户时，channel 插件应提供 `openclaw.setupEntry`。设置入口应暴露 channel 元数据以及设置安全的配置、状态和 secrets 适配器；将网络客户端、网关监听器和传输运行时保留在主扩展入口点中。

在第一次设置条目加载之前，OpenClaw 应用所选插件根的文件边界和硬链接策略，即使发现元数据已缓存。已验证的设置模块仍会被缓存以用于插件缓存生成；此检查不会重新发现每个状态调用的元数据。

运行时入口点字段不会覆盖源入口点字段的包边界检查。例如，`openclaw.runtimeExtensions` 不能让一个会越界的 `openclaw.extensions` 路径变得可加载。

`openclaw.install.allowInvalidConfigRecovery` 是故意缩小的。它不会使任意损坏的配置变得可安装。它允许安装流程仅从可归因于正在安装的捆绑插件的配置问题中恢复：缺少拥有的插件加载路径、该插件的未知或无效的 `channels.<id>` 条目、需要编译运行时输出的 `plugins.entries.<id>` 条目或命名该插件的 `tools.web.search.provider` 值。不相关的配置错误仍然会阻止安装并将操作员发送至 `openclaw doctor --fix`。

`openclaw.channel.persistedAuthState` 是一个小型检查器模块的包元数据：

```json
{
  "openclaw": {
    "channel": {
      "id": "matrix",
      "persistedAuthState": {
        "specifier": "./auth-presence",
        "exportName": "hasAnyMatrixAuth",
        "exportNameAsync": "hasAnyMatrixAuthAsync",
        "backingStore": "plugin-state"
      }
    }
  }
}
```

当设置、医生、状态或只读存在流在加载完整通道插件之前需要进行廉价的 yes/no 身份验证检查时，请使用它。持久身份验证状态不是配置的通道状态：不要使用此元数据自动启用插件、修复运行时依赖项或决定是否应加载通道运行时。目标导出应该是一个仅读取持久状态的小函数；不要将其路由到整个通道运行时桶。

数据库支持的检查器还应该声明 `exportNameAsync`，在同一模块中命名等待的检查器。运行时发现更喜欢导出并等待其布尔结果；使用内部工人拥有的国有商店。在兼容性窗口期间，为较旧的主机保留 `exportName`。当没有声明等待的同伴时，主机可以使用同步导出，但永远不会通过同步导出重试失败的等待检查器。老主机忽略`exportNameAsync`，同步调用`exportName`；不要更改该导出以返回 Promise。

其数据仅来自主机的密钥插件状态存储的 `persistedAuthState` 检查器可以声明 `"backingStore": "plugin-state"`。在加载该检查器之前，OpenClaw 询问现有的状态读取所有者，后备数据库是否确实不存在。活动的保留快照、缓存的打开句柄、现有文件或符号链接或不确定的文件系统结果会保留正常的检查器路径。缺席结果不会被缓存，因此稍后在同一进程中创建的状态仍然会被发现。这一事实并不建立身份验证或授予状态访问权限；检查器仍然验证现有记录。对于可以在其他存储或文件中找到持久身份验证的检查器，请忽略它。较旧的主机会忽略可选事实并正常运行检查器。

`openclaw.channel.configuredState` 支持廉价的已配置状态检查。当环境变量足够时，优先使用声明式环境元数据：

```json
{
  "openclaw": {
    "channel": {
      "id": "telegram",
      "configuredState": {
        "env": {
          "allOf": ["TELEGRAM_BOT_TOKEN"]
        }
      }
    }
  }
}
```

当需要每个列出的变量时使用 `env.allOf`，当任何一个非空变量就足够时使用 `env.anyOf`。如果小型非运行时检查需要的不仅仅是环境元数据，请使用 `specifier` 加上 `exportName`，如 `persistedAuthState` 所示。完整的非空 `specifier` 和 `exportName` 对优先于 `env`。如果任一字段不存在或为空，则检查将使用其 `env` 元数据而不加载模块。

声明的 `configuredState` 元数据拥有正向和负向引导结果。负面结果不会落入运行时挂钩或存储的凭据。没有该声明的通道保留旧版 `config.hasConfiguredState` 后备。需要当前存储凭证的操作检查使用 `config.hasConfiguredStateAsync`；根据配置和环境变量将它们与激活分开。

对于这两种状态检查，OpenClaw 仅针对完整模块对构建重写源说明符，命名确切的发出的 JavaScript 工件，包括其 `.js` 或 `.cjs` 扩展。环境支持的不完整对保持不变。内置结账元数据使用相对于插件根目录的路径；独立包使用插件本地 `dist/` 目录。

## <a id="discovery-precedence-(duplicate-plugin-ids)"></a><a id="discovery-precedence-duplicate-plugin-ids"></a> 发现优先级（重复的插件 id）

OpenClaw 从显式 `plugins.load.paths` 条目、当前工作空间根 （`<workspace>/.openclaw/extensions`）、OpenClaw 附带的捆绑插件以及全局安装位置（`~/.openclaw/extensions` 加上跟踪的安装路径）中发现插件。仅发现顺序并不能确定加载哪个副本。

如果两个不同的插件根共享相同的 `id`，则仅保留 **highest-precedence** 清单；优先级较低的重复项将被删除，而不是在其旁边加载。优先级，从高到低：

1. **Config-selected** — 在 `plugins.load.paths` 中明确选择的路径
2. **Source-checkout bundled** — 正在运行的主机的源签出内编译的捆绑插件，或由 `OPENCLAW_DEV_SOURCE_ROOT` 选择的签出内的捆绑插件
3. **与跟踪的安装记录匹配的全局安装** — 路径与其安装记录匹配的已安装全局候选，由 `openclaw plugins install`/`openclaw plugins update` 管理
4. **Bundled** — OpenClaw 附带的其他插件
5. **Workspace** — 相对于当前工作空间发现的插件
6. **Untracked global** — 在全局根目录中发现的其他插件

影响：

- 自动发现的工作区或未跟踪的全局副本不会隐藏捆绑插件，即使其 ID 已启用或列入白名单。 `plugins.allow`和`plugins.entries.<id>.enabled`控制加载权限，不控制源选择。
- 要有意覆盖捆绑插件，请通过 `plugins.load.paths` 选择其路径。跟踪的全局安装还可以覆盖普通的捆绑副本，但不能覆盖开发源捆绑副本。
- 显式配置选择覆盖会在每次发现生成时为每个插件发出一个信息诊断，而不会发出配置警告。不明确的选择和其他意外的重复仍然会发出警告并识别丢弃的副本和选定的源。有意跟踪安装覆盖普通捆绑副本不会发出重复的警告。
