---
summary: "图标、主题、CLI、MCP、Control UI、仪表板、QA、通道和备份表面的清单字段"
read_when:
  - "您正在添加插件品牌或紧凑的工具活动图稿"
  - "您的插件提供 CLI 命令、MCP 服务器或仪表板小部件"
  - "您正在运送原生 Control UI 或 QA 跑步者"
  - "您的插件向共享外观目录贡献一个主题"
  - "您需要备份或记录才能了解插件拥有的数据"
title: "清单主机表面字段"
sidebarTitle: "宿主表面场"
---

提供具体主机表面的清单字段：图标、命令、服务器、面板、小部件、运行器、通道或备份资源。 [插件清单](/plugins/manifest)参考的一部分； [ 顶级字段引用 ](/plugins/manifest#top-level-field-reference) 列出了每个字段。

## <a id="plugin-icon"></a> 插件图标

将便携式插件图标放置在相对于插件根目录的 `assets/icon.png` 处。不需要清单字段。使用在 16 px 下仍可识别的正方形 PNG；推荐512×512。丢失、不可读或无效的图标将被忽略，并且不会使插件失效。

这是插件的目录、设置、频道设置和安装卡的标识图稿。紧凑工具调用使用单独的 [inline 活动图标](#inline-activity-icons)，因此改进聊天字形不会改变插件在其他地方的品牌。

OpenClaw 采用此固定包路径作为其图标约定，与代理插件规范提案 [agent-plugins-spec#66](https://github.com/agentplugins/agent-plugins-spec/pull/66) 中建议的路径相匹配。 OpenClaw 本身实现代理插件 1.0.0. 除非该提案被采纳，否则其他代理插件消费者可能不会发现它。固定路径使包保持可移植和可检查，避免明显路径间接和优先规则，并让 OpenClaw 无需运行时网络请求即可渲染图标。顶级插件品牌图标 URL 不会加载；提供者身份验证图稿仍然是服务器拥有的目录元数据。

对于静态医生所有权，优先选择顶级 `sessionRouteStateOwners`。外部插件仍然支持旧的 `doctorContract.sessionRouteStateOwners: true` 声明以及从 `doctor-contract-api` 导出的 `sessionRouteStateOwners`，但已弃用。当清单字段存在时，OpenClaw 使用它而不加载医生合同模块。删除计划：在外部插件迁移窗口之后删除 OpenClaw 2027.1 中的模块回退。

当医生合同模块导出非空`legacyConfigRules`、`normalizeCompatibilityConfig`函数或`providerRenames`时，设置`doctorContract.configRepair: true`。一份声明涵盖了完整的配置修复工件。

`providerRenames` 使用 `openclaw/plugin-sdk/runtime-doctor-migrations` 中的 `PluginDoctorProviderRename` 将提供商路由迁移声明为 `{ from, to, baseUrl }` 条目。两个提供程序 ID 都必须属于该插件。主机匹配源提供者的 URL 来源，移动其目录，并通过共享的 Doctor 所有者重写模型引用。 Doctor 在发布配置中的提供程序重命名之前修复 cron 和会话引用，从而使中断的运行可以从仍在编写的源条目中重试。该合同不会重命名身份验证配置文件或迁移凭据。

配置修复模块可以导出 `historicalWebhookListener` 来描述已停用的默认端点。现有的兼容性规范器报告符合条件的帐户；主机拥有一次性引脚和完成写入。请参阅 [webhook 迁移合同](/plugins/sdk-overview/infrastructure#webhook-body-rejection)。

当 Doctor 重命名保存的凭据时，它会更新插件配置和通道配置中的确切 `authProfileId` 和 `defaultAuthProfileId` 引用。这保留了附带的 `authProfileId` 迁移，并且还涵盖了默认值，例如 LLM 任务的 `defaultAuthProfileId`，包括旧安装的插件。引用查找会修剪周围的空白，就像凭证读取器所做的那样。其他地方未映射的值和文字字符串保持不变。插件不需要在其兼容性回调中实现主机的凭据重命名。

捆绑的插件按执行顺序声明每个状态迁移，以便 Doctor 可以计划其所有者和收据，而无需加载插件代码：

```json
{
  "doctorContract": {
    "stateMigrations": [
      { "id": "legacy-cache-to-state" },
      { "id": "session-owner-repair", "doctorOnly": true, "phase": "after-session-repair" }
    ]
  }
}
```

该数组必须与 doctor-contract 模块导出的迁移 ID、顺序、`doctorOnly` 标志和阶段匹配。旧值 `true` 仍然声明动态模块。在进程内包更新期间，Doctor 将替换包的回调加载到其新库存中；早期库存保留其原始回调。允许在包版本之间更改操作列表，但每个版本的清单和模块必须一致。

安装的外部插件清单保留在复制状态和候选内容标识之外，包括当它们使用描述符数组时。候选验证必须单独绑定这些工件。在此之前，Doctor 会记录明确的计划拒绝，而不是将已安装的清单视为写入权限。

状态迁移返回 `changes` 和 `warnings`，以及可选的 `notices`。警告默认拒绝稍后的 Doctor 修复。仅当每个警告都是建议性的并且所需状态对于以后的修复仍然安全时，迁移才可能返回 `warningDisposition: "recoverable"`。 Doctor 将这些警告保留在其收据中并继续。来自另一个迁移的检测错误、引发的故障和未分类的警告仍然拒绝组合步骤。

对于 `definePluginDoctorMigrationFromPlans`，当其停用的源是未使用的可重建工件时，`plugin-state-import` 计划可能会设置 `cleanupWarningDisposition: "recoverable"`。这仅适用于导入成功后清理失败的情况。读取、导入和验证失败仍然拒绝迁移。每个使用共享源的计划都必须在其清理失败成为建议之前选择加入。

Codex 插件在其公共 API 导出健康检查注册时设置 `doctorHealthChecks: true`。 Doctor 在加载此表面之前会检查所选插件的信任度。没有声明的旧安装版本会跳过 Codex 健康注册，而不妨碍其他检查；已声明但丢失或损坏的 API 仍然是错误。这不会授予插件功能或取代升级同意。

OpenClaw 源代码树中维护的通道插件还通过纯 `config-doctor-api.ts` 入口点公开这些配置导出。当插件运行时单独分发时，核心包会保留该入口点及其通道模式。这允许 `doctor --fix` 在插件安装或功能同意之前迁移旧配置。已安装插件的医生合同仍然具有权威性；保留的入口点不会公开状态迁移、安装插件或授予功能。

## <a id="inline-activity-icons"></a> 内联活动图标

在 `assets/activity.svg` 处放置一个单色 SVG，作为插件工具调用和折叠工具结果旁边的紧凑图标。不需要清单字段。将其设计为保持清晰的 16 像素和透明背景。 Control UI 以活动行的文本颜色渲染其形状，包括深色模式；源颜色不会成为行中的品牌颜色。

仅当单个工具需要不同形状时才使用 `assets/activity/<tool-name>.svg`。文件名必须与该工具的 `tools.effective` 中的 `id` 完全匹配，包括大小写。例如，具有 ID `calendar_search` 的工具可以运送：

```text
assets/
  icon.png
  activity.svg
  activity/
    calendar_search.svg
```

工具 ID 最多为 128 个 ASCII 个字符，以字母、数字或下划线开头，并且仅包含字母、数字、下划线、连字符或句点。保持覆盖目录最多 128 个条目；较大的目录将被整体忽略。默认活动图标涵盖其他工具 ID，包括其路由向工具名称添加前缀的集成。这些文件仅提供演示；他们不注册工具或更改工具所有权。

将每个 SVG 文件保留在 32 个 KiB 以内。使用简单的 SVG 几何形状：`path`、`circle`、`ellipse`、`line`、`polygon`、`polyline` 和 `rect`，可选择在 `g` 内部。 SVG 最多可包含包括根在内的 4 个元素、8 个 KiB 组合路径和点数据以及 1,024 个路径命令。为根指定一个具有正宽度和高度的 `viewBox`，或者正数值 `width` 和 `height`，每个最多 4,096。不支持脚本、样式表、事件处理程序、外部引用、嵌入图像和过滤器。例如：

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M5 5h14v14H5zM8 2v6m8-6v6M5 10h14"/>
</svg>
```

OpenClaw 在将其用作活动掩模之前验证 SVG 并对其进行光栅化；它永远不会将包 SVG 标记插入聊天 DOM 中。丢失或无效的图稿会退回到现有的工具字形，而不显示打包的品牌形象。该插件仍然可用。

使用时，将 `assets/activity.svg` 和 `assets/activity/*.svg` 包含在已发布包的 `files` 列表中。 OpenClaw 的捆绑元数据复制器和插件运行时包生成器自动包含这些路径。资产发现使用网关准备好的插件元数据；更改其图稿后重新启动或显式重新加载插件。

## <a id="themes"></a> 主题

在 `openclaw.plugin.json` 中声明可移植主题，使其在“设置”→“外观”和代理的 [ 主题工具](/tools/theme) 中可用。两个表面均使用相同的目录。主题发现读取静态 JSON 并且不执行插件代码或需要自定义插件 UI 实验室设置。

```json
{
  "id": "starship",
  "configSchema": { "type": "object", "additionalProperties": false },
  "themes": [
    {
      "id": "xenovessel",
      "name": "Xenovessel",
      "description": "Near-black indigo, acid lime, and alien cyan with monospace text.",
      "source": "themes/xenovessel.json",
      "icons": { "rocket": "assets/theme-art/rocket.svg" },
      "hats": { "beret": "assets/theme-art/beret.svg" },
      "critters": {
        "ferris": {
          "source": "assets/theme-art/ferris.svg",
          "title": "a crab, allegedly",
          "crossMs": 12000
        }
      },
      "backgrounds": {
        "light": "assets/theme-art/hull-light.webp",
        "dark": "assets/theme-art/hull-dark.webp"
      }
    }
  ]
}
```

目录 ID 为 `starship/xenovessel`。它保留了插件的主 ID，包括大小写、范围 ID（例如 `@scope/starship`）和多条目 ID（例如 `pack/one`）；它们的主题 ID 是 `@scope/starship/xenovessel` 和 `pack/one/xenovessel`。完整目录 ID 限制为 256 个字符。每个插件最多可以声明 32 个主题。本地ID必须以小写字母或数字开头，只能包含小写字母、数字、下划线或连字符，且最多64个字符。 `user/`命名空间属于个人导入的主题。

`source` 是插件根目录内的相对 `.json` 路径；将其包含在已发布包的 `files` 列表中。绝对路径、遍历和转义根的符号链接都会被拒绝。每个源文件最多可以包含 16 个 KiB（包括格式化空白）。其规范化定义必须适合 4096 UTF-8 字节。

每个主题可以声明 `icons` 和 `hats`，即艺术品 ID 到相对 `.svg` 路径的映射，以及 `critters`，即艺术品 ID 到包含 `source` 和可选 `title` 和 `crossMs` 的对象的映射。每张地图最多允许 8 个条目。艺术品 ID 必须匹配 `^[a-z0-9][a-z0-9_-]{0,31}$`；与相应的内置品牌图标（`claw`、`mark`）、帽子或小动物目录重复或冲突是明显错误。 `title` 是最多 60 个可打印字符的未翻译悬停文本。 `crossMs` 是 5000 到 90000 之间的整数，默认为 12000 毫秒。

艺术品路径遵循与 `source` 相同的包含规则。每个SVG必须是独立的，最多32个KiB；脚本、事件处理程序、外部引用和嵌入资源将被拒绝。 Control UI 将图稿光栅化为 256 × 256 像素画布，然后将其渲染为图像。它使用活动图标限制：最多 4 个元素（包括根）、8 KiB 组合路径和点数据、1024 个路径命令以及不大于 4096 的正源尺寸。使用 `path`、`circle`、`ellipse`、`line`、 `polygon`、`polyline` 和 `rect`，可选位于 `g` 内；根为`svg`，在元素限制内还支持`title`和`desc`。不支持样式表、过滤器和嵌入图像。帽子覆盖了头像的整个正方形；将帽子放置在 SVG viewBox 顶部附近，并使下部区域保持透明。

`backgrounds` 将 `light` and/or `dark` 映射到具有相同包含规则的相对 PNG、JPEG 或 WebP 路径。每个文件最多只能是512 KiB； OpenClaw 在捕获主题时检查其图像签名。当选择主题并且 **Appearance → Background** 使用主题图稿时，Control UI 将绘制匹配颜色模式的图像，而不是中性插件图稿。没有声明图像的模式保持中性的艺术作品。隐藏艺术作品的背景放置、演示、可见性和可访问性后备仍处于观看者的控制之下。与自定义上传一样，图像在主题颜色覆盖层下变暗，该覆盖层的大小取决于调色板的文本对比度，因此繁忙或明亮的图像保持可读但微弱；安静、低对比度的艺术品保留了最多的细节。在默认的 **图像可见性** 之上，覆盖层会朝着每个背景图像共享的固定上限变薄，达到 100%，因此深色调色板不再隐藏观看者要求查看的深色图像。内置图像是约 20-35 个 KiB 的无损 WebP 文件。

将定义 JSON 以及每个声明的 SVG 和背景包含在已发布包的 `files` 列表中。 OpenClaw 的捆绑元数据复制器和运行时包生成器自动包含这些声明的路径。不可读或无效的艺术作品文件会通过插件警告诊断从目录中忽略整个主题；其他插件功能仍然可用。

JSON文件包含`name`、`description`以及`light`或`dark`中的至少一项；其名称和描述必须与清单相符。名称限制为 80 个字符，描述限制为 320 个字符。每种呈现模式都提供 [ 主题定义示例 ](/tools/theme#create-and-apply-a-personal-theme) 中的所有语义颜色，以及可选的 `font-sans` 和 `font-mono` 字体系列列表。单个值限制为 120 个字符。支持的颜色为十六进制、`rgb()`、`rgba()`、`hsl()`、`hsla()`、`lab()`、`lch()`、`oklab()`、`oklch()`、`color()`、 `black`、`white` 和 `transparent`。 CSS 声明、URL 以及对其他 CSS 变量的引用不是主题数据。使用插件诊断从目录中省略无效定义；其他插件功能仍然可用。

源 JSON 还接受可选的表示字段。它们与 `name`、`description` 和调色板一起属于 `themes[].source` 引用的定义：

- `mascot`：`"claw"`（默认）或`"none"`； `"none"` 默认为中性品牌，并隐藏常驻龙虾和来访的龙虾陌生人。当启用 Lobster 访问且切换保持不变时，普通生物仍然可以跨越作曲家壁架。
- `brandName`：经过修剪的 1-80 个可打印字符的显示名称；默认为“OpenClaw”
- `brandIcon`：`"claw"`、`"mark"` 或来自此主题声明的 `icons` 地图的 ID。省略如下`mascot`：爪为`"claw"`，标记为`"none"`。仅声明为帽子或小动物的 ID 并不是品牌图标。
- `workingIndicator`：`"claw"`、`"dots"`、`"brand"`（所选品牌图标）或`"none"`。省略使用爪子作为爪子吉祥物，否则使用圆点；它不会改变长期等待的短语。
- `lobsterdex` 和 `communityLinks`：控制各自导航条目的布尔值；每个默认值都是 `true`，与吉祥物无关。这些是呈现选择，而不是删除或授权控制。
- `workingPhrases`：最多 24 个文字、未翻译的长时间等待状态短语。每个短语都经过修剪，必须包含 1-24 个字符，并且不能包含控制字符或与另一个修剪过的短语重复。省略它以保留默认词汇表；使用 `[]` 隐藏长时间等待的短语。
- `critters`：来自内置 `"penguin"` 和 `"fedora"` 目录或该主题声明的 `critters` 地图的最多 8 个唯一 ID，在启用 Lobster 访问时将偶尔的访问者添加到普通作曲家壁架流量中。对于没有主题提供的生物，请忽略它或使用 `[]`。未知 ID 和重复项将被拒绝。
- `avatarHat`：`"fedora"`、`"crown"`、`"santa"`、`"party"`、`"pumpkin"` 或此主题声明的 `hats` 地图中的 ID 添加了偶尔给特工头像戴上装饰帽子；省略不加帽子。

这些字段计入相同的 4096 字节规范化定义限制，并与目录描述符一起返回。 [ 主题定义示例](/tools/theme#create-and-apply-a-personal-theme) 显示了这些表示字段。定义仅包含 ID，而不包含 SVG 标记或 URL。通过代理的 `theme` 工具导入的个人主题仍然仅限于内置艺术品 ID。

只有启用的插件才会贡献主题。 OpenClaw 使用当前插件清单保留经过验证的定义和插图字节。编辑源、图稿文件或清单后，运行 `openclaw plugins reload starship` 或在插件的生命周期设置中选择 **Reload**。重新加载会发布新的调色板并刷新连接的客户端，而无需重新启动网关。艺术品 URL 包含内容哈希，因此更改的图像会绕过页面的艺术品缓存。服务艺术品读取捕获的生成，从未更改磁盘上的文件。不需要文件系统轮询。禁用或删除插件将从目录中删除其主题；然后，所选主题可以按照 [Plugin 主题和热重载](/tools/theme#plugin-themes-and-hot-reload) 中所述进行回退。

## <a id="transcript-sources-reference"></a> 转录来源参考

`transcriptSources` 将提供商 ID 映射到静态设置描述符。每个密钥还必须出现在该插件的 `contracts.transcriptSourceProviders` 中；未声明的 ID 的描述符将被忽略。名称和设置控件可从准备好的清单快照中获得，无需导入提供程序运行时。

```json
{
  "contracts": { "transcriptSourceProviders": ["captions"] },
  "transcriptSources": {
    "captions": {
      "name": "Captions",
      "autoStart": { "accountId": "optional", "meetingUrl": "required" }
    }
  }
}
```

`name` 是可选的显示名称。 `autoStart` 通过 `transcripts.status` 将设置控制通告给网关客户端。它的唯一密钥是 `accountId`、`guildId`、`channelId` 和 `meetingUrl`；每个值必须是 `"required"` 或 `"optional"`。显式空对象支持没有定位器控件的设置。对于仅附加到已处于活动状态的会议机器人的源，请省略 `autoStart`。格式错误的对象、未知的定位键或无效模式不会通告部分设置。标题和自定义会话 ID 保留现有配置字段，而不是定位器描述符键。

安装程序需要启用插件。运行时功能仍然是观察到的事实：不存在的 `canStart` 不会隐藏清单描述符，而观察到的 `canStart: false` 会阻止新的设置。该描述符不会更改对现有 `transcripts.autoStart` 配置或提供程序启动语义的接受。当元数据不可用时，现有源编辑会保留配置的字段。

## <a id="backupresources-reference"></a> backup资源参考

使用 `backupResources` 声明备份必须包含的插件拥有的持久数据，或 OpenClaw 可以安全地忽略并在恢复后重新生成的生成数据。备份规划器读取此元数据，无需加载插件运行时或修改插件文件。只有有效激活、可加载的插件才贡献资源；禁用或可卸载的插件无法排除数据。

`include` 声明还要求 OpenClaw 管理该资源的 SQLite 备份。位于声明路径或低于声明路径的 SQLite 文件接收经过验证的在线快照和离线压缩，并包含其提交的预写日志 （WAL） 内容并省略 sidecar。当所需的 SQLite 功能不可用时，创建会拒绝已声明的数据库。声明这些资源中的每个硬链接别名，以便备份可以识别其日志所有者。

其他插件 SQLite 文件保留不透明的字节副本，包括其 sidecar，除非它们为主 OpenClaw 数据库别名。备份报告`warnings`中的每个不透明SQLite文件和sidecar；验证和恢复保留其字节而不应用 SQLite 验证或压缩。仅将数据库放置在状态或代理目录下并不会选择将其纳入托管快照。超出链接分辨率限制 （`ELOOP`） 的未声明的 SQLite 符号链接（包括循环）将被跳过，并显示文件名警告。如果无法安全捕获已声明的数据库链接，它们仍会拒绝备份。

```json
{
  "backupResources": [
    {
      "disposition": "include",
      "scope": "state",
      "relativePath": "example-plugin/durable-state"
    },
    {
      "disposition": "regenerable",
      "scope": "agent",
      "relativePath": "example-plugin/generated-cache"
    }
  ]
}
```

每个条目都是一个封闭的对象，具有以下字段：

| 字段          | 必需的 | 类型                         | 含义                                                                          |
| -------------- | -------- | ---------------------------- | -------------------------------------------------------------------------------------- |
| `disposition`  | 是      | `"include" \| "regenerable"` | 保护持久数据免遭排除，或识别可以省略和重建的数据。 |
| `scope`        | 是      | `"state" \| "agent"`         | 解析state目录或每个配置的agent目录下的资源。     |
| `relativePath` | 是      | `string`                     | 所选范围的权威根包含的严格相对 POSIX 路径。       |

插件身份及其可信根来自清单发现；资源条目不能声明或覆盖所有者。 `relativePath` 不得为空或绝对，并且不得包含反斜杠、NUL、空路径段、`.`、`..`、Windows 驱动器或 UNC 前缀、URI- 类似值或任何转义其选定锚点的路径。无效条目将被拒绝而不是标准化。

规划器使用固定的规则来删除重复的资源。较窄的 `regenerable` 声明胜过广泛的配置状态或代理根。在插件资源声明中，只有显式嵌套的 `include` 可以保护后代并保持其排除的祖先可遍历。显式配置、凭据、工作区和嵌套代理路径也仍然受到保护。仅省略插件可以重新创建的数据。 `openclaw backup create --only-config` 不检查插件备份元数据。

## <a id="mcp-server-reference"></a> MCP 服务器参考

`mcpServers` 允许原生插件提供 MCP 服务器（包括 MCP App），无需操作员在 `openclaw.json` 中重复定义其静态进程：

```json
{
  "mcpServers": {
    "example": {
      "transport": "stdio",
      "command": "node",
      "args": ["./mcp-server.js"]
    }
  }
}
```

OpenClaw 仅在所属插件启用期间包含这些服务器。相对的 `command`、`args`、`cwd` 和 `workingDirectory` 路径均从插件根目录解析。用户配置仍具有权威性：`mcp.servers.<name>` 可以替换插件默认值，或设置 `enabled: false` 以将其省略。MCP App 渲染和服务器工具调用仍需要正常的 MCP Apps 设置以及生效的工具策略；声明服务器不会绕过这两个边界。

## <a id="ui-capabilities"></a> UI 功能

在 `openclaw.plugin.json` 中声明 `uiCapabilities` 来描述插件向 OpenClaw 接口添加的内容。插件详细信息页面在安装之前以及禁用或启用插件时在其 **Capability** 部分中显示这些类型。显示读取静态清单或目录元数据而不执行插件代码。

```json
{
  "uiCapabilities": ["page", "navigation", "accessory", "widget"]
}
```

| 值         | 贡献                                         |
| ------------- | ---------------------------------------------------- |
| `page`        | 专用插件页面。                             |
| `navigation`  | 打开插件页面的导航条目。         |
| `panel`       | 现有视图中的面板。                     |
| `action`      | 现有视图中面向用户的操作。            |
| `accessory`   | 一个小的添加，例如会话标头附件。 |
| `widget`      | 仪表板小部件。                                  |
| `replacement` | 支持的主机 UI 表面的替代品。       |
| `link-reader` | 支持链接的阅读器或预览。             |

该字段是可选的。省略是指未指定； `[]` 明确声明没有 UI 贡献。 OpenClaw 忽略无效声明（未知值或非数组值）并报告插件警告；该插件仍然加载。较旧的 OpenClaw 版本忽略此字段，因此格式错误的显示元数据不会在更新后破坏现有安装。重复项将被删除，并且值将使用上面的顺序。仅声明类型，而不声明实例计数或实时可用性。有条件注册可能会在特定会话中缺席，但不会导致声明无效。

该字段独立于 `controlUi.entry`：使用主机渲染链接阅读器的插件可以声明 `link-reader`，而无需附带浏览器 JavaScript。它不会激活插件、授予权限或证明功能当前已配置或正常运行。当显式声明中缺少观察到的类型时，浏览器注册和已知后端 UI 注册会发出诊断；省略会跳过该比较。这些诊断不会阻止激活。

对于目录列表，请发布与所选插件版本相同的元数据。如果目录省略它，OpenClaw 会保留未指定的 UI 贡献类型，而不是加载插件来推断它们。对于本机浏览器模块，即使浏览器代码未更改，显式 UI 重新加载也会读取更新的声明并创建新的修订版。

## <a id="controlui-reference"></a> controlUi 参考

`controlUi` 声明了 Control UI 的受信任的本机浏览器条目和可选样式表。路径相对于插件根目录，并且必须命名为编译后的 JavaScript 和 CSS。资产遵循网关的身份验证策略，作为不可变修订进行捕获，并且仅通过显式 UI 重新加载流程进行刷新。 Nix 模式下的捆绑插件和 Nix-store 插件可以在共享插件文件策略下加载硬链接资产并重新加载硬链接清单。可变的外部插件根和 CLI 打包仍然拒绝硬链接。

用户安装的原生UI需要**设置→实验室→自定义插件UI**（`gateway.controlUi.experimental.customPlugins`，默认`false`）。来自启用的捆绑插件的本机 UI 仍然可用。请参阅 [ 启用自定义插件 UI](/plugins/feature-plugins#enable-custom-plugin-ui) 以了解重新启动和浏览器重新加载要求。此门不会禁用插件的后端 API 或下面的沙盒仪表板绑定。

```json
{
  "controlUi": {
    "entry": "dist/control-ui/<content-hash>/index.js",
    "styles": ["dist/control-ui/<content-hash>/index.css"]
  }
}
```

使用 `package.json.openclaw.controlUi` 作为源条目，并让 `openclaw plugins build` 生成此声明。本机UI以浏览器应用程序的信任执行；它与下面的范围仪表板小部件绑定不同。有关创作、替换、重新加载和激活收据，请参阅 [ 功能插件](/plugins/feature-plugins)。

## <a id="dashboard-reference"></a> 仪表盘参考

`dashboard` 允许启用的插件将现有网关 RPC 公开给授予的仪表板小部件，而无需向核心添加插件策略。数据绑定必须命名与 `operator.read` 相同的插件注册的方法；动作动词必须命名它在 `operator.write` 中注册的方法。注册期间不匹配会拒绝插件。

```json
{
  "dashboard": {
    "dataBindings": [
      {
        "id": "items.list",
        "method": "example.items.list",
        "description": "List example items."
      }
    ],
    "actionVerbs": [
      {
        "id": "refresh",
        "method": "example.items.refresh",
        "description": "Refresh example items.",
        "paramShape": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "force": { "type": "boolean" }
          }
        }
      }
    ]
  }
}
```

清单 ID 是插件本地的。 Widget 授权使用 `<plugin-id>.<id>`，例如 `example.items.list` 和 `example.refresh`。为了保持持久授权命名空间明确，OpenClaw 在plugin-id 段中将 `%` 和 `.` 转义为 `%25` 和 `%2E`；普通插件 id 保持自然形式。 `paramShape` 是一个可选的 JSON 模式，在 OpenClaw 调用插件 RPC 之前应用于操作参数对象。

## <a id="catalog-reference"></a> 目录参考

`catalog` 为插件浏览器提供可选的显示提示。主机可以忽略这些提示。它们不会安装或启用插件，也不会改变其运行时行为或信任级别。

```json
{
  "catalog": {
    "featured": true,
    "order": 10
  }
}
```

| 字段      | 类型      | 含义                                                              |
| ---------- | --------- | -------------------------------------------------------------------------- |
| `featured` | `boolean` | 目录展示界面是否应突出显示此插件。                       |
| `order`    | `number`  | 在精选插件中的升序显示提示；数值越小，显示越靠前。 |

## <a id="clicommands-reference"></a> cli命令参考

在 `cliCommands` 中声明每个插件拥有的根命令，以便根帮助和命令所有者路由仅保留元数据：

```json
{
  "cliCommands": [
    {
      "name": "example",
      "description": "Manage the example integration",
      "hasSubcommands": true
    }
  ]
}
```

清单行是帮助文本的来源。运行时用`api.registerCli(..., { descriptors: [...] })`注册相同的命令；运行时描述符还可以提供 `machineOutput`。诸如 `openclaw nodes <feature>` 之类的嵌套命令不是根命令，不属于 `cliCommands`。

## <a id="commandaliases-reference"></a> 命令别名参考

当插件拥有运行时命令名称时，请使用 `commandAliases`，用户可能会错误地将其放入 `plugins.allow` 或尝试作为根 CLI 命令运行。 OpenClaw 使用此元数据进行诊断，而无需导入插件运行时代码。

如果插件加载失败，在聊天中调用其声明的 `runtime-slash` 命令会返回插件名称、简短的失败原因和恢复指南（`openclaw doctor` 和网关日志）。未知命令和属于故意禁用插件的命令保持正常处理；仅凭明显的所有权并不能使命令可执行。

```json
{
  "commandAliases": [
    {
      "name": "dreaming",
      "kind": "runtime-slash",
      "cliCommand": "memory"
    }
  ]
}
```

| 字段        | 必需的 | 类型              | 含义                                                           |
| ------------ | -------- | ----------------- | ----------------------------------------------------------------------- |
| `name`       | 是      | `string`          | 属于此插件的命令名。                               |
| `kind`       | No       | `"runtime-slash"` | 将该别名标记为聊天 slash 命令，而不是根 CLI 命令。 |
| `cliCommand` | No       | `string`          | 如有相关的根 CLI 命令，则建议在 CLI 操作中使用该命令。  |

## <a id="qarunners-reference"></a> qaRunners 参考

当插件在共享 `openclaw qa` 根下提供一个或多个传输运行程序时，请使用 `qaRunners`。保持这些元数据廉价且静态；插件运行时仍然通过导出匹配的 `qaRunnerCliRegistrations` 的轻量级 `qa-runner-api.ts` 表面拥有实际的 CLI 注册。 2026 年 7 月之前的 `runtime-api.ts` 后备版本已停用；将跑步者注册移至 `qa-runner-api.ts`。可选的 `adapterFactory` 将传输公开给共享 QA 场景，而无需更改注册命令的运行程序。

模块支持的流场景是适配器拥有的执行形式。仅当该工厂创建的每个适配器都实现 `prepareFlow` 时，才将 `adapterFactory.supportsModuleFlows` 设置为 `true`； QA 规划排除未声明支持的实现中的模块流。

```json
{
  "qaRunners": [
    {
      "commandName": "matrix",
      "description": "Run the Docker-backed Matrix live QA lane against a disposable homeserver"
    }
  ]
}
```

| 字段         | 必需的 | 类型     | 含义                                                      |
| ------------- | -------- | -------- | ------------------------------------------------------------------ |
| `commandName` | 是      | `string` | 挂载在 `openclaw qa` 下的子命令，例如 `matrix`。    |
| `description` | No       | `string` | 当共享主机需要一个占位命令时使用的回退帮助文本。 |

`adapterFactory` 的 id 必须与 `commandName` 匹配。不要为清单中不存在的命令导出注册项。

## <a id="channelaccountkeypolicies-reference"></a> channelAccountKeyPolicies 参考

`channelAccountKeyPolicies` 声明插件 `channels` 数组中列出的频道的存储帐户密钥选择规则。它是插件元数据；操作员将其帐户配置保存在 `channels.<id>.accounts` 下。

```json
{
  "channels": ["signal"],
  "channelAccountKeyPolicies": {
    "signal": { "canonicalAliasesRequireOwnField": "account" }
  }
}
```

`canonicalAliasesRequireOwnField` 是帐户条目中字符串字段的名称。当该条目具有此字段的非空值时，仅在帐户 ID 规范化后匹配的别名才符合条件。根值不满足它。精确存储的密钥获胜；现有的不区分大小写的匹配保持其行为。读取器和写入器使用相同的选定存储密钥。

为了Signal， `Work Phone`解析为`work-phone`当它有自己的`account`数字。即使通道根也有编号，其设置也会应用。如果没有自己的编号，先前忽略的条目将保持忽略状态，并且路由将保留其继承的设置。医生保留该密钥并报告所需的手动更改。 Doctor 还报告标准化键冲突并保留这两个条目；一个精确的`work-phone`关键在运行时获胜。

未声明通道的规则将被忽略。运行时读取使用选定的插件元数据快照；他们不加载插件代码来查找规则。请参阅 SDK 合约的 [ 账户查找参数 ](/plugins/sdk-channel-plugins/setup-and-config#stored-account-key-selection)。

## <a id="channelconfigs-reference"></a> channelConfigs 参考

当通道插件在运行时加载之前需要廉价的配置元数据时，请使用 `channelConfigs`。当没有可用的设置条目或当 `setup.requiresRuntime: false` 声明不需要设置运行时时，只读通道 setup/status 发现可以直接将此元数据用于已配置的外部通道。

`channelConfigs` 是插件 manifest 元数据，不是新的顶层用户配置章节。用户仍然在 `channels.<channel-id>` 下配置 channel 实例。OpenClaw 会先读取 manifest 元数据，以决定在插件运行时代码执行之前，哪个插件拥有该已配置的 channel。

对于 channel 插件，`configSchema` 和 `channelConfigs` 描述的是不同路径：

- `configSchema` 验证 `plugins.entries.<plugin-id>.config`
- `channelConfigs.<channel-id>.schema` 验证 `channels.<channel-id>`

声明了 `channels[]` 的非 bundled 插件也应声明匹配的 `channelConfigs` 条目。如果没有这些条目，OpenClaw 仍然可以加载插件，但冷路径配置 schema、setup 和 Control UI 界面在插件运行时执行之前，无法了解 channel 所拥有的选项结构或显示专用的 UI 提示。

`channelConfigs.<channel-id>.commands.nativeCommandsAutoEnabled` 和 `nativeSkillsAutoEnabled` 可以为在 channel 运行时加载之前执行的命令配置检查声明静态的 `auto` 默认值。bundled channels 也可以通过 `package.json#openclaw.channel.commands` 与其余归该包所有的 channel catalog 元数据一起发布相同的默认值。

```json
{
  "channelConfigs": {
    "matrix": {
      "schema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "homeserverUrl": { "type": "string" }
        }
      },
      "uiHints": {
        "homeserverUrl": {
          "label": "Homeserver URL",
          "placeholder": "https://matrix.example.com"
        }
      },
      "label": "Matrix",
      "description": "Matrix homeserver connection",
      "commands": {
        "nativeCommandsAutoEnabled": true,
        "nativeSkillsAutoEnabled": true
      },
      "preferOver": ["matrix-legacy"]
    }
  }
}
```

每个 channel 条目可以包含：

| 字段         | 类型                     | 含义                                                                                                    |
| ------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `schema`      | `object`                 | `channels.<id>` 的 JSON Schema。每个声明的 channel 配置条目都必须包含。                                |
| `uiHints`     | `Record<string, object>` | 可选的标签、占位符、敏感性设置，以及该 channel 配置部分仅用于显示的呈现提示。 |
| `label`       | `string`                 | 当运行时元数据尚未就绪时，合并到选择器和检查界面中的 channel 标签。                        |
| `description` | `string`                 | 用于检查和 catalog 界面的简短 channel 描述。                                                      |
| `commands`    | `object`                 | 用于运行时之前配置检查的静态原生命令和原生技能自动默认值。                              |
| `preferOver`  | `string[]`               | 在选择界面中该 channel 应优先于的旧版或低优先级插件 id。                           |

### <a id="replacing-another-channel-plugin"></a> 替换另一个 channel 插件

当你的插件是某个 channel id 的首选拥有者，而另一个插件也可以提供该 channel id 时，请使用 `preferOver`。常见情况包括：插件 id 更名、某个独立插件取代了一个 bundled 插件，或一个维护中的 fork 为了配置兼容性而保留相同的 channel id。

```json
{
  "id": "acme-chat",
  "channels": ["chat"],
  "channelConfigs": {
    "chat": {
      "schema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "webhookUrl": { "type": "string" }
        }
      },
      "preferOver": ["chat"]
    }
  }
}
```

当配置了 `channels.chat` 时，OpenClaw 会同时考虑 channel id 和首选插件 id。如果优先级较低的插件只是因为它是 bundled 或默认启用而被选中，OpenClaw 会在有效运行时配置中禁用它，这样就只有一个插件拥有该 channel 及其工具。显式的用户选择仍然优先：如果用户明确启用了这两个插件（通过 `plugins.allow` 或一个具体的 `plugins.entries` 配置），OpenClaw 会保留该选择，并报告重复的 channel/tool 诊断，而不是静默更改用户请求的插件集合。

请将 `preferOver` 的范围限制在确实能够提供相同 channel 的插件 id 上。它不是通用的优先级字段，也不会重命名用户配置键。
