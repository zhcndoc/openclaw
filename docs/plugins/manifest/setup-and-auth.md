---
summary: "清单设置描述符、身份验证选择、对话发现和配置 UI 提示"
read_when:
  - "您正在将插件连接到入门引导或提供商设置中"
  - "您需要在运行时加载之前读取身份验证选择、CLI 标志或环境变量"
  - "您正在为设置和 Control UI 表面标记配置字段"
title: "清单设置和身份验证字段"
sidebarTitle: "设置和验证字段"
---

设置、载入和配置 UI 表面在插件运行时加载之前读取的清单字段。 [插件清单](/plugins/manifest)参考的一部分； [ 顶级字段引用 ](/plugins/manifest#top-level-field-reference) 列出了每个字段。

## <a id="native-conversation-discovery"></a> Native 对话发现

暴露在 OpenClaw 外部创建的会话的插件使用 `label`、可选的 `description` 和包含其目录 read/list/resume 命令名称的可选 `nodeCommands` 来声明 `setup.nativeSessionCatalog`。该合约使用插件现有的 `config.sessionCatalog.enabled` 首选项。核心在注册目录读取、列表、活动检查和声明的节点命令执行之前检查此首选项。 `enabled` 的架构生成的默认值在插件本地配置中仍然可用，但根运行时配置仅保留创作值，因此默认值无法冒充同意。

声明公开本机目录的命令，而不是独立授权的执行传输。禁用发现必须保留已绑定对话中的轮流；这些回合保留其现有的执行和节点权限。

当未编写首选项时，新声明默认为关闭，包括创建配置后安装的插件。他们的模式也应该默认 `enabled` 为 `false`。新的配置文件将 `false` 保留在主机生成的目录清单中，包括可安装的官方插件。始终保留显式值。这些仅限选择退出的条目不会请求安装或扩大插件白名单；显式的插件选择或其他创作的配置仍然有效。它们也不会产生禁用插件配置警告。现有的选择退出仍然有效，不需要医生重写；删除一个可以恢复旧的发现行为。

主机生成的 `legacyDefaultEnabled: true` 声明仅针对现有可读配置保留附带的 Claude/Codex 隐式开启行为。这是升级例外，而不是已安装的第三方清单可以授予的权限。未来的目录不会仅通过加入生成的清单来继承该异常。现有的未声明目录保留其以前的行为。

当所有声明的目录都关闭时，入门引导提供未经检查的启用选择；选择智能体并不意味着同意。显式选择也保留了已安装声明的选择。检测本身不写入任何偏好。

更改这些声明和 `pnpm native-catalogs:check` 后运行 `pnpm native-catalogs:gen` 以验证官方目录元数据和打包的 macOS 资源。所需的 `pnpm check` 预检运行此验证。如果缺少隐私默认资源，新的本机配置创建将失败。

## <a id="providerauthchoices-reference"></a> providerAuthChoices 参考

每个 `providerAuthChoices` 条目描述一种引导或身份验证选项。OpenClaw 会在加载 Provider 运行时之前读取这些内容。Provider 设置列表会使用这些清单选项、由描述符派生的设置选项，以及安装目录元数据，而不会加载 Provider 运行时。

选择清单选项后，安装程序会解析所属已安装插件中的 `provider` 和 `method`。运行时身份验证方法不需要在其向导元数据中重复 `choiceId`。不同的插件或身份验证方法无法满足声明的选择。显式 `provider-plugin:<provider>:<method>` 选择保留其编码目标。

| 字段                  | 必需的 | 类型                                                                  | 含义                                                                                                                                              |
| ---------------------- | -------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`             | 是      | `string`                                                              | 此选项所属的 Provider id。                                                                                                                        |
| `method`               | 是      | `string`                                                              | 要分派到的身份验证方法 id。                                                                                                                             |
| `choiceId`             | 是      | `string`                                                              | 引导和 CLI 流程使用的稳定身份验证选项 id。                                                                                                    |
| `platforms`            | No       | `string[]`                                                            | 支持的网关主机平台，例如`["darwin"]`。省略允许每个平台；空的或无效的限制不提供任何选择。         |
| `choiceLabel`          | No       | `string`                                                              | 面向用户显示的标签。如果省略，OpenClaw 会回退使用 `choiceId`。                                                                                          |
| `choiceHint`           | No       | `string`                                                              | 选择器中的简短辅助文本。                                                                                                                          |
| `icon`                 | No       | HTTPS URL                                                             | 在受支持的引导客户端中显示在此选项旁的图像。                                                                                          |
| `website`              | No       | HTTPS URL                                                             | 由受支持的引导客户端显示的产品、登录或安装页面。                                                                              |
| `docsUrl`              | No       | HTTPS URL                                                             | 比较提供商连接方法的指南，从提供商连接对话框链接。                                                             |
| `assistantPriority`    | No       | `number`                                                              | 数值越低，在由助手驱动的交互式选择器中排序越靠前。                                                                                         |
| `assistantVisibility`  | No       | `"visible"` \| `"manual-only"` \| `"detected-only"`                   | Control 选取器可见性。 `manual-only` 允许手动选择； `detected-only` 在提供模型之前需要成功的提供商拥有的发现。 |
| `deprecatedChoiceIds`  | No       | `string[]`                                                            | 应将用户重定向到此替代选项的旧版选项 id。                                                                                   |
| `groupId`              | No       | `string`                                                              | 用于对相关选项进行分组的可选组 id。                                                                                                            |
| `groupLabel`           | No       | `string`                                                              | 面向用户显示的组标签。                                                                                                                          |
| `groupHint`            | No       | `string`                                                              | 该组的简短辅助文本。                                                                                                                           |
| `onboardingFeatured`   | No       | `boolean`                                                             | 在“More...”条目之前，在交互式入门选择器的特色层中显示此组。                                                  |
| `optionKey`            | No       | `string`                                                              | 用于简单单标志身份验证流程的内部选项键。                                                                                                        |
| `cliFlag`              | No       | `string`                                                              | CLI 标志名称，例如 `--openrouter-api-key`。                                                                                                             |
| `cliOption`            | No       | `string`                                                              | 完整的 CLI 选项形式，例如 `--openrouter-api-key <key>`。                                                                                               |
| `cliDescription`       | No       | `string`                                                              | CLI 帮助中使用的描述。                                                                                                                              |
| `personalAccount`      | No       | `boolean`                                                             | 在关联帐户中提供此方法；它必须在不导入主机登录或写入共享状态的情况下暂存一个内联凭证。                        |
| `appGuidedSecret`      | No       | `boolean`                                                             | 对于由应用引导的设置，只需粘贴一个 secret 加上 Provider 默认值即可完成设置。                                                                               |
| `appGuidedActionLabel` | No       | `string`                                                              | 开始由 Provider 自有应用引导设置时显示的简短操作标签。                                                                                   |
| `appGuidedDiscovery`   | No       | `boolean`                                                             | 匹配的运行时身份验证方法通过 `appGuidedSetup` 负责只读的本地发现。                                                                  |
| `appGuidedAuth`        | No       | `"oauth"` \| `"device-code"`                                          | 由 Provider 负责的交互式登录，原生设置客户端可以对其进行通用渲染。                                                                         |
| `credentialOnly`       | No       | `boolean`                                                             | 该方法支持保存凭证而无需发现或激活入门模型。省略意味着仅设置。                                            |
| `channelLogin`         | No       | `{ aliases?: string[] }`                                              | 私人聊天可以运行的固定输入 OAuth 或设备代码方法。需要`credentialOnly`；别名启用显式命令，例如 `/login codex`。   |
| `onboardingScopes`     | No       | `Array<"text-inference" \| "image-generation" \| "music-generation">` | 此选项应出现在哪些引导界面中。如果省略，默认为 `["text-inference"]`。                                                   |

`platforms` 使用 Node.js 平台名称；未知的名字被删除。该限制在提供安装、登录、CLI 标志和安装目录选项之前适用。它描述了运行 OpenClaw 的主机，而不是连接的应用程序或浏览器。它不会更改保存的插件启用或提供程序配置。当选定的安装方法运行时，提供程序仍会检查模型和操作系统的可用性。

`assistantVisibility: "detected-only"` 保留了仅元数据设置、登录、启用和安装行的选择，包括手动选择器。应用程序引导设置仅将其作为提供商当前 `appGuidedSetup.detect` 检查返回的候选项提供。经典设置仅在 `detectAvailability` 成功后才包括提供商选择。两项检查都必须应用提供商的实际模型资格规则。仍支持显式 CLI 身份验证选择选择，并且设置方法仍会在激活前重新检查可用性。

对于其设置方法都需要检测的提供者，在当前发现确认匹配模型之前，也将从提供的候选者中保留已保存和配置的模型。配置的模型和设置完成状态保持记录；不可用的模型不会将现有安装转变为全新安装。具有普通受支持设置方法的提供程序保留其现有行为。

可选的 `modelTarget: "utility"` 使用现有的每个代理或默认 `utilityModel` 设置；省略选择主要角色。安装程序会验证实用程序角色，而无需替换工作主节点或其运行时和凭据。如果没有配置常规主系统，系统设置助手可以使用显式实用程序模型。自动实用程序默认从不引导安装。配置后，常规主节点优先，普通代理准备情况与实用程序设置保持独立。显式 `provider-plugin:<provider>:<method>` 选择保留为同一插件、提供程序和方法声明的角色。运行时向导元数据不需要重复清单的角色。裸提供程序选择还保留安装程序选择的方法的作用。确切的清单选择 ID 仍然拥有对无前缀选择的调度。

激活实用程序选项时，客户端必须回显 `modelTarget: "utility"`。在提供程序准备之前，丢失或不匹配的角色确认将被拒绝，因此较旧的客户端不会意外地将实用程序激活视为主要就绪。检测并成功报告activation/verification的作用。检测使 `configuredModel` 和 `setupComplete` 仅作为主要实用程序，公开显式 `utilityModel`，并仅当该实用程序是非主要设置后备时公开 `setupModel`。验证明确接受实用程序目标，包括与主要目标一起。

当 `appGuidedDiscovery` 为 true 时，匹配的提供程序身份验证方法必须公开 `appGuidedSetup.detect` 和 `appGuidedSetup.prepare`。检测必须是​​只读的：不能登录、模型拉取、下载或配置写入。准备工作会重新检查确切选择的模型并返回配置建议。 OpenClaw 保存所有返回的凭证，无需工具即可运行一轮确认，并仅在成功后激活提案。激活失败会保留保存的凭据以供重试；在用户接受激活之前，替代品将保持非活动状态。当本地服务可访问但没有模型符合自动设置条件时，提供商还可以公开 `appGuidedSetup.detectAvailability` 以将其设置选择标记为已检测到。可用性检查也是只读的。

### <a id="login-choices"></a> 登录选择

模型中的 **Connect** 需要 `credentialOnly: true` 加上 `appGuidedAuth` 或 `appGuidedSecret`。标记为 `appGuidedDiscovery`、`manual-only` 或外部文本推理入门的选项不会成为仅凭凭据的操作。仅描述符 `setup.providers[].authMethods` 条目不会创建可执行的登录选项。

裸 `/login` 将可见的浏览器和设备代码选项分组到提供商按钮中，而无需开始登录。具有多种方法的提供者打开了第二个选择。没有命令按钮的通道显示要复制的命令。 Core 从清单构建此菜单；频道不保留单独的提供商列表。

`channelLogin` 选择仅凭证浏览器或设备代码方法进入私人聊天。当不需要别名时，使用 `{}`。该方法必须在不要求聊天提供秘密、端点或其他自由文本输入的情况下完成。需要此类输入的方法将切换到匹配的 Control UI 登录或设置流程。保存凭据后，主机拥有任何模型访问同意；该插件无法通过其配置补丁授予它。

基于浏览器的 `channelLogin` 方法在主机提供 `ctx.oauth.authorize` 时使用它。通过提供商生成的 `state`、`timeoutMs` 截止日期和 `buildAuthorizationUrl(redirectUrl)`。主机拥有 HTTPS 回调，消耗每个响应一次，并返回 `{ code, state }`。该插件保留其 PKCE 验证器并交换代码。转发 `ctx.signal` 并在外部效果之前重新检查 `ctx.assertCurrent`。当不存在此功能时，保持本地和远程 CLI 完成。收到的代码不是持久的凭证；保存后主机才报告成功。

当 `personalAccount` 为 true 时，该方法通过共享向导协议运行，具有无凭据 environment/config、无代理目录或预置机密以及纯文本输入模式。它必须为其提供者返回一个内联凭证并取消荣誉。它不得导入本机 CLI 登录、解析 SecretRef、写入 credentials/config 或要求共享模型激活。网关拥有私人的每人提交； `configPatch`、`defaultModel` 和返回的共享配置文件 ID 不适用。将凭据提示标记为敏感。仅当提供商允许使用此凭据时才使用此功能。

个人帐户呼叫始终提供 `ctx.assertCurrent`。通过提供程序帮助程序保留此闭包绑定检查，并在外部效果之前立即调用它，包括在任何交互式或异步等待之后的发现、轮询和令牌交换。对于 `fetchWithSsrFGuard`，将其作为 `beforeRequest` 传递，以便它在 DNS/proxy 准备后和重定向时运行。继续转发`ctx.signal`取消飞行中工作；单独的信号不会重新检查该人当前的许可。独立 CLI/onboarding 呼叫可能会忽略检查，因为它们不携带网关人员的权限。

可选的 `matchesPersonalAccount(credential, existing)` auth-method hook 可以证明 OAuth 重新连接是同一提供商帐户。匹配完整的身份，而不仅仅是电子邮件或共享工作空间。如果没有该证明，则会创建一个新的 OAuth 帐户槽，并且旧的聊天 pin 会保留其原始凭据。 API 键和静态令牌仅在其字面值匹配时才重用槽。

## <a id="setup-reference"></a> setup 参考

在 setup 和 onboarding 界面需要在运行时加载之前就能获取插件自有的廉价元数据时，请使用 `setup`。

```json
{
  "setup": {
    "providers": [
      {
        "id": "openai",
        "authMethods": ["api-key"],
        "envVars": ["OPENAI_API_KEY"],
        "authEvidence": [
          {
            "type": "local-file-with-env",
            "fileEnvVar": "OPENAI_CREDENTIALS_FILE",
            "requiresAllEnv": ["OPENAI_PROJECT"],
            "credentialMarker": "openai-local-credentials",
            "source": "openai local credentials"
          }
        ]
      }
    ],
    "cliBackends": ["openai-cli"],
    "configMigrations": ["legacy-openai-auth"],
    "requiresRuntime": false
  }
}
```

顶级 `cliBackends` 保持有效并继续描述 CLI 推理后端。 `setup.cliBackends` 是控制 plane/setup 流的特定于设置的描述符表面，应仅保留元数据。

当存在时，`setup.providers` 和 `setup.cliBackends` 是 setup 发现的首选“先描述符”查找表面。如果描述符只缩小了候选插件范围，而 setup 仍需要更丰富的 setup 期运行时钩子，请设置 `requiresRuntime: true` 并保留 `setup-api` 作为回退执行路径。

如果没有显式的 `openclaw.setupEntry`，OpenClaw 将解析包根目录或包本地 `dist/` 中的常规 `setup-api` 文件。独立运行时构建会自动包含该公共表面。

OpenClaw 会将 `setup.providers[].envVars` 纳入通用 provider 认证和环境变量查找。请将 setup 和状态环境元数据放在那里。

当计费或组织级凭证必须激活 `resolveUsageAuth` 而不成为推理凭证时，请使用 `providerUsageAuthEnvVars`。这些名称加入了工作区 dotenv 阻止、ACP 子进程剥离、沙箱秘密过滤和广泛的秘密清理。提供程序运行时仍然读取 `resolveUsageAuth` 内的值并对其进行分类。

当没有可用的设置条目或当 `setup.requiresRuntime: false` 声明不需要设置运行时时，OpenClaw 还可以从 `setup.providers[].authMethods` 导出简单的设置选择。对于自定义标签、CLI 标志、入门范围和助理元数据，显式 `providerAuthChoices` 条目仍然是首选。

只有在这些描述符足以满足 setup 界面的需要时，才设置 `requiresRuntime: false`。OpenClaw 会将显式的 `false` 视为仅描述符契约，并且不会为了 setup 查找而执行 `setup-api` 或 `openclaw.setupEntry`。如果一个仅描述符插件仍然提供了这些 setup 运行时入口之一，OpenClaw 会报告一个附加诊断并继续忽略它。省略 `requiresRuntime` 会保留旧版回退行为，因此不会破坏那些在未设置该标志的情况下添加了描述符的现有插件。

由于安装查找可以执行插件拥有的 `setup-api` 代码，因此规范化的 `setup.providers[].id` 和 `setup.cliBackends[]` 值必须在发现的插件中保持唯一。不明确的所有权会阻止设置查找，而不是从发现顺序中挑选获胜者。

当安装运行时执行时，设置注册表诊断报告提供程序或CLI后端`setup-api`注册时没有匹配清单声明。CLI后端描述符还报告缺少运行时注册，因为安装查找需要注册的后端配置。即使同一设置模块贡献迁移，提供程序描述符也可能保持仅元数据，CLI后端、检查或选定的提供程序运行时。

### <a id="setup-fields"></a> setup 字段

| 字段              | 必需的 | 类型       | 含义                                                                                                                                  |
| ------------------ | -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `providers`        | No       | `object[]` | 在 setup 和 onboarding 期间暴露的 provider setup 描述符。                                                                                |
| `cliBackends`      | No       | `string[]` | 用于基于描述符优先查找 setup 的 setup 期后端 id。请保持规范化 id 全局唯一。                                            |
| `configMigrations` | No       | `string[]` | 该插件的 setup 界面所拥有的配置迁移 id。                                                                                     |
| `requiresRuntime`  | No       | `boolean`  | 描述符查找后设置是否仍需要 `setup-api` 执行。显式 `false` 禁用它；省略保留了遗留后备。 |

### <a id="setup.providers-reference"></a><a id="setup-providers-reference"></a> setup.providers 参考

| 字段          | 必需的 | 类型       | 含义                                                                                    |
| -------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------ |
| `id`           | 是      | `string`   | 在 setup 或 onboarding 期间暴露的 provider id。请保持规范化 id 全局唯一。             |
| `authMethods`  | No       | `string[]` | 该提供程序支持 Setup/auth 方法 id，无需加载完整运行时。                       |
| `envVars`      | No       | `string[]` | 在插件运行时加载前，通用 setup/status 界面可以检查的环境变量。               |
| `authEvidence` | No       | `object[]` | 适用于能通过非机密标记进行认证的 provider 的廉价本地认证证据检查。 |

`authEvidence` 用于提供商拥有的本地凭证标记，无需加载运行时代码即可进行验证。这些检查必须保持廉价和本地化：没有网络调用，没有钥匙串或秘密管理器读取，没有shell命令，并且没有提供者API检查。

支持的证据条目：

| 字段              | 必需的 | 类型       | 含义                                                                                                  |
| ------------------ | -------- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| `type`             | 是      | `string`   | 始终为 `local-file-with-env`。                                                                                  |
| `fileEnvVar`       | No       | `string`   | 包含显式凭据文件路径的环境变量。                                                           |
| `fallbackPaths`    | No       | `string[]` | 当 `fileEnvVar` 缺失或为空时检查的本地凭据文件路径。支持 `${HOME}` 和 `${APPDATA}`。 |
| `requiresAnyEnv`   | No       | `string[]` | 在该证据有效之前，所列环境变量中至少一个必须非空。                                    |
| `requiresAllEnv`   | No       | `string[]` | 在该证据有效之前，所列环境变量都必须非空。                                           |
| `credentialMarker` | 是      | `string`   | 证据存在时返回的非机密标记。                                                       |
| `source`           | No       | `string`   | auth/status 输出的面向用户的源标签。                                                               |

## <a id="configgroups-reference"></a> configGroups 参考

`configGroups` 将插件的设置页面组织为标题部分。 `configSchema` 旁边是演示元数据；它不会添加配置键或更改验证、默认值或运行时行为。

```json
{
  "configGroups": [
    {
      "id": "connection",
      "title": "Connection",
      "order": 10,
      "properties": ["apiKey", "endpoint"]
    },
    { "id": "history", "title": "History", "order": 20, "properties": ["storage"] }
  ]
}
```

每个条目都需要一个非空的 `id`、`title` 和 `properties` 数组。 `configSchema.properties` 中的属性名称精确为立即键；它们不是嵌套路径。嵌套对象及其后代保留在该属性的部分中。组 ID 和属性分配必须是唯一的。可选整数 `order` 将节从最低到最高排序（默认 `0`）；关系保持明显的秩序。属性按每个组中创建的顺序显示。

有一层部分，默认情况下全部可见。设置搜索匹配字段名称、标签、描述和组标题。未分配的属性显示在 **Other** 下。缺少或无效的分组元数据使完整的平面表单可用；它永远不会隐藏字段或阻止插件加载。不支持分组的主机会忽略此可选元数据。

## <a id="uihints-reference"></a> uiHints 参考

`uiHints` 是一个从配置字段名到小型渲染提示的映射。键可以使用点号表示嵌套配置字段，但任何路径段都不能是 `__proto__`、`constructor` 或 `prototype`；setup 会拒绝这些名称。

```json
{
  "uiHints": {
    "apiKey": {
      "label": "API key",
      "help": "Used for OpenRouter requests",
      "placeholder": "sk-or-v1-...",
      "sensitive": true
    }
  }
}
```

每个字段提示可以包含：

| 字段          | 类型             | 含义                                                                                                     |
| -------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| `label`        | `string`         | 面向用户显示的字段标签。                                                                                          |
| `help`         | `string`         | 简短的辅助文本。                                                                                                |
| `tags`         | `string[]`       | 可选的 UI 标签。                                                                                                 |
| `advanced`     | `boolean`        | 将字段标记为高级字段。                                                                                      |
| `sensitive`    | `boolean`        | 将字段标记为机密或敏感字段。                                                                           |
| `placeholder`  | `string`         | 表单输入框的占位文本。                                                                                 |
| `multiline`    | `boolean`        | Render 一个非敏感字符串，作为垂直可调整大小的文本区域。省略或 false 保留单行输入。   |
| `presentation` | `"phone-number"` | 仅用于显示的本地化电话号码格式化，适用于可解析的国际号码（`+...`）；原始值保持不变。 |

通道配置部分继承 `help`，用于通道根处和 `accounts.<id>` 下每个通道共享的叶子（`enabled`、`allowFrom`、`dmPolicy`、`groupPolicy`、`streaming` 等）。为这些密钥之一声明自己的 `help` 的通道总是获胜，因此只要共享措辞对您的提供商来说是错误的，请覆盖它。特定于提供商的密钥（例如凭据、主机和 Webhook）仍然需要自己的提示。

当多个插件声明同一通道时，所选插件拥有其架构和表示提示。密文会保留每个已发现所有者的 `sensitive: true` 和 `tags: ["url-secret"]` 声明，因此在切换插件后，配置中保留的凭据仍会受到保护。 `url-secret` 标签可保护嵌入在 URL 中的凭据，同时使公共 URL 可见。设置 `sensitive: false` 会禁用基于名称的秘密检测，但不会覆盖其他所有者的肯定声明或 URL 凭证保护。
