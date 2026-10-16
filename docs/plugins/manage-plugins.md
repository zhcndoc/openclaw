---
summary: "从 Control UI 或 CLI 管理 OpenClaw 插件"
read_when:
  - "您想要浏览、配置、启用、禁用或重新加载 Control UI 中的插件"
  - "您想快速查看插件列表、安装、更新、检查或卸载示例"
  - "您想选择插件安装来源"
  - "您想获得发布插件包的正确参考"
title: "管理插件"
sidebarTitle: "管理插件"
doc-schema-version: 1
---

Control UI 涵盖发现、安装、模式支持的配置、有效访问、启用、重新加载和删除。 CLI 添加了更新、高级维护和显式安装源控制。有关其完整的命令契约、标志、源选择规则和边缘情况，请参阅 [`openclaw plugins`](/cli/plugins)。

典型的工作流程：找到一个包，安装它，启用它，然后验证插件的运行时注册。 Control UI 操作适用于正在运行的网关，无需重新启动它。 CLI 安装还使用正在运行的本地网关来执行 npm、Git、本地路径和存档、npm-pack tarball 和市场源。请参阅 [ 应用更改并检查 ](#apply-changes-and-inspect) 中的这些路径。

## <a id="use-the-control-ui"></a> 使用 Control UI

打开Control UI中的**Plugins**，或者使用相对于配置的Control UI基本路径的`/plugins`。例如，基本路径 `/openclaw` 使用 `/openclaw/plugins`。

**已安装的插件** 显示最多 12 个已安装的插件，优先显示启用的插件、需要设置的插件和需要注意的插件。使用搜索过滤完整库存或选择 **显示全部** 浏览每个已安装的插件。每张卡片都会显示插件说明。选择一张卡以打开其设置，管理员可以在其中启用或禁用它，只读操作员可以检查它。

从另一个 ClawHub 注册表安装的软件包在 **Installed plugins** 下保持可管理。它不会将当前目录中的同名包标记为已安装。

选择一张卡来打开`/settings/plugins/<plugin-id>`。该路由页面使用插件声明的架构进行配置，以简单语言解释有效访问，并将原始功能声明和授权保留在 **Advanced** 下。其 **Lifecycle** 部分显示源和版本详细信息，并允许管理员 **Reload** 插件或在确认后卸载可移动插件。打开 `/settings/plugins` 以获取可搜索的已安装清单。其 **Advanced** 选项卡拥有全局插件加载策略、允许和拒绝列表、加载路径和功能槽。

包含的插件不需要软件包安装。例如，工作板包含在 OpenClaw 中，默认情况下处于禁用状态。捆绑的插件可以禁用或重新加载，但不能删除。

库存、配置和访问检查需要 `operator.read`。配置、启用、禁用、重新加载、安装和卸载更改需要 `operator.admin`。以管理员身份启用已安装的插件还会通过将所选插件添加到现有的限制性 `plugins.allow` 列表来记录显式信任。显式的 `plugins.deny` 条目仍然具有权威性，必须在启用插件之前将其删除。

安装、启用、禁用、删除和重新加载操作等待正在运行的网关应用更改。页面和插件提供的选项卡将在现有连接上刷新。如果应用程序失败，该错误会将被拒绝的替换与稍后运行时失败之前发布的更改区分开来。即使运行时无法启动，安装也可以保持保存状态。该页面会刷新已安装的条目并保持故障可见。修复报告的问题，然后在其 **Lifecycle** 设置中选择 **Reload** 或运行 `openclaw plugins reload <plugin-id>`；无需重复安装。

**Reload** 刷新后端插件及其包条目，同时保留启用和当前浏览器连接。通过 `plugins.load.paths` 选择的发现插件和捆绑插件使用相同的操作。更改的已声明功能可能需要在继续之前进行审查。成功消息报告所应用的网关生成；故障使其报告的应用程序状态和阶段保持可见。重新加载不会重建已编译的捆绑代码；有关该边界，请参阅 [CLI reload](/cli/plugins#reload)。单独的 **Reload 插件 UI** 操作仅刷新浏览器 UI 模块。

在替换启用的插件之前，网关会验证其元数据和配置，暂停新的插件调用，并等待最多 60 秒以进行正在进行的工作，同时上一代保持活动状态。如果工作未完成，则重新加载失败一次，恢复呼叫，并使服务和通道保持运行。否则，它会停止服务和通道，清空剩余工作，并在注册替换之前完成关闭和处置。其他插件实例保持活动状态。如果注册或预发布激活失败，网关会自动使用捕获的先前代码和配置尝试重新注册。恢复恢复活动运行时间；它不会重写外部编辑的配置文件。如果清理或恢复也失败，则错误报告恢复无法完成。发布后的失败在已接受的一代中仍然可见。

当不需要记录新的功能同意时，管理员可以使用外部管理或 Nix 配置重新加载。配置和安装更改仍然不可用。如果重新加载需要新功能同意，请在重试之前通过部署所有者管理该接受情况。

Control UI 不会从任意 npm、git 或本地路径源安装，也不会更新插件包。使用下面的 CLI 工作流程进行这些操作。

## <a id="list-and-search-plugins"></a> 列出和搜索插件

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
openclaw plugins search "calendar"
```

`--json` 用于脚本：

```bash
openclaw plugins list --json \
  | jq '.plugins[] | {id, enabled, format, source, dependencyStatus}'
```

`plugins list` 是一次冷态清单检查：OpenClaw 能从配置、清单以及持久化的插件注册表中发现什么。它并不能证明某个已运行的 Gateway 已经导入了插件运行时。JSON 输出包含注册表诊断信息以及每个插件的 `dependencyStatus`（即声明的 `dependencies`/`optionalDependencies` 是否能在磁盘上解析）。

`plugins search` 会查询 ClawHub 中可安装的插件包，并为每个结果打印一个安装提示（`openclaw plugins install clawhub:<package>`）。

## <a id="enable-and-disable-plugins"></a> 启用和禁用插件

```bash
openclaw plugins enable <plugin-id>
openclaw plugins disable <plugin-id>
```

切换插件的配置条目而不触及已安装的文件。一些捆绑插件（捆绑 model/speech 提供程序、捆绑浏览器插件）默认启用；其他人安装后需要 `enable`。重复已应用的启用或禁用选项会使配置文件保持不变。

## <a id="capability-consent"></a> 能力同意

OpenClaw 要求您在安装或启用第三方插件之前查看其声明的功能。同意屏幕标识插件、其版本和来源、工件完整性以及可用的信任信息。它还列出了声明的通道、提供程序、工具、挂钩、MCP 服务器、CLI 命令和后端、技能和危险配置标志，以及适用于挂钩、模型访问和子代理的操作员授权。

OpenClaw 官方目录中的捆绑插件和经过验证的第一方插件在设置、安装、启用、更新或医生修复期间不需要此功能审查。对于单独安装的第一方插件，OpenClaw 根据其目录检查实际包标识，并验证 npm 源记录或来自 `https://clawhub.ai` 的官方渠道记录。仅匹配的插件 ID 或包名称是不够的：本地副本、存档、git 安装、自定义 ClawHub 注册表以及冲突的源记录仍然需要审查。此豁免不授予 OAuth 访问权限、操作系统权限或运行时工具批准，并且不创建操作员接受记录。

审查令牌对确切声明的功能表面进行哈希处理，而不是对插件的可执行文件进行哈希处理。验收单独记录安装者提供的工件完整性（如果可用）。当已安装的插件声明的表面和记录的完整性未更改时，重新启用已安装的插件会重复使用接受。当新工件声明附加功能时，启用的插件的更新需要新的同意；未改变或较窄的表面可以刷新现有的有效验收。更新禁用的插件会保留禁用状态，并推迟任何所需的同意，直到启用为止。通过 `plugins install` 重新安装还会保留创作的 `enabled: false`，但如果无法重复使用有效的接受，则需要在提交安装之前获得同意。之后运行 `openclaw plugins enable <plugin-id>` 将其激活。

已启用的第三方旧版安装无需经过初步审查即可继续使用；禁用和重新启用它们需要征得同意。安装程序在保存最终配置时会重新检查同意，因此登录期间的插件更新无法激活具有不可接受的功能的替换。

拒绝更新的功能审查会使以前的插件启用且保持不变。修复丢失或损坏的文物需要重新审查； OpenClaw 无法从它无法验证的工件中继续接受。

提前接受需要安装记录来固定工件完整性，注册表和 ClawHub 安装提供了这一点。没有记录完整性的源（尤其是本地路径）无法证明新字节是您之前批准的工件，因此它们在每次安装时都会请求同意，而不是继承它。

需要同意时的交互式 CLI 命令、入门以及提供商、搜索或频道设置提示，包括自动安装所需的运行时插件。非交互式或静默设置无法批准新功能。使用 `--accept-capabilities` 检查并预安装或启用插件，然后重试设置。非交互式插件安装、更新和启用命令在需要同意时也需要显式标志：

```bash
openclaw plugins install clawhub:<package> --accept-capabilities
openclaw plugins update <plugin-id> --accept-capabilities
openclaw plugins enable <plugin-id> --accept-capabilities
```

Doctor 在安装或采用替换插件之前使用相同的源检查和审查。 `doctor --fix` 和 `--yes` 不会自动批准功能。对于非交互式修复，请检查并安装带有上面明确标志的插件，然后重新运行 doctor。

聊天安装和启用使用相同的功能同意。当需要同意时，查看回复中的功能，然后使用 `--accept-capabilities` 重新运行相同的命令：

```text
/plugins install clawhub:<package> --accept-capabilities
/plugins install npm:<package> --force --accept-capabilities
/plugins enable <plugin-id> --accept-capabilities
```

直接在工作区中或通过 `plugins.load.paths` 发现的插件，如果没有托管安装记录，则无法持久保留功能接受。 Control UI 中的详细信息仍然显示其声明的功能。

`openclaw plugins install --link <path>` 创建托管安装记录，并需要功能同意，即使它从源目录加载插件也是如此。它与添加裸 `plugins.load.paths` 条目不同。两者都可以使用自己的插件范围的键控和 blob 状态和入口队列。链接不会授予对挂钩代理轮次或网关范围提升的信任。

## <a id="install-plugins"></a> 安装插件

```bash
# Search ClawHub for plugin packages.
openclaw plugins search "calendar"

# Install from ClawHub.
openclaw plugins install clawhub:<package>
openclaw plugins install clawhub:<package>@1.2.3
openclaw plugins install clawhub:<package>@beta

# Install from npm.
openclaw plugins install npm:<package>
openclaw plugins install npm:@scope/openclaw-plugin@1.2.3
openclaw plugins install npm:@openclaw/codex

# Install from a local npm-pack artifact.
openclaw plugins install npm-pack:<path.tgz>

# Install from git or a local development checkout.
openclaw plugins install git:github.com/acme/openclaw-plugin@v1.0.0
openclaw plugins install ./my-plugin
openclaw plugins install --link ./my-plugin
```

从 npm 安装裸包规范，除非名称与捆绑或官方插件 ID 匹配，在这种情况下，OpenClaw 使用 local/official 副本。使用 `clawhub:`、`npm:`、`git:` 或 `npm-pack:` 显式选择源。 OpenClaw 的捆绑包和官方目录包与 ClawHub 包一起受到信任。在您查看并信任源后，新的任意 npm、git、本地 path/archive、`npm-pack:` 或市场源在非交互式安装中需要 `--force`。

`--force` 会在无需提示的情况下确认非 ClawHub 来源，并在需要时覆盖现有安装目标。对于已跟踪的 npm、ClawHub 或 hook-pack 安装的常规升级，请改用 `openclaw plugins update`。使用 `--link` 时，`--force` 只确认来源；链接目录不会被复制或覆盖。

如果新安装的插件需要尚未存在的配置，OpenClaw 会记录安装信息，但会保持插件禁用状态。配置 `plugins.entries.<id>.config`，然后运行 `openclaw plugins enable <id>`。如果已有配置条目但无效，安装将失败，且不会重写该配置。

插件包可以公开多个子条目。安装会跟踪该包一次，启用每个就绪的子条目，并保留您明确禁用的任何子条目。运行时策略仍然可以通过 `plugins.entries.<child-id>`、allow/deny 列表、通道配置、确切的子加载路径以及 `memory` 和 `contextEngine` 插槽进行子寻址。

<a id="restart-and-inspect" />

## <a id="apply-changes-and-inspect"></a> 应用更改并检查

Control UI 操作和网关插件管理 RPC 应用插件更改，而无需重新启动网关。普通 CLI 安装、启用、禁用和卸载命令使用正在运行的本地网关（如果可用）；本地包操作完成后更新会刷新它。如果没有正在运行的网关，这些命令将更新本地安装以供下次启动。

在默认情况下`hybrid`重新加载模式，将插件配置保存在Control UI， 通过`openclaw config`， or in `openclaw.json`也会自动应用。默认情况下，更改如下`plugins.entries.<id>`替换该插件的运行时实例，以便注册、工具、挂钩和服务接收其新配置。未更改的插件保留其实例。插件可以声明一个更窄的策略来保留其实例或需要重新启动；看[配置热重载](/gateway/configuration/hot-reload)。

CLI 安装支持 npm、Git、本地路径和存档、npm-pack tarball、市场源以及来自同一所有者的官方或 ClawHub 软件包。有关源选择和功能同意，请参阅 [Install](/cli/plugins#install)。离线安装后，启动网关以使用已安装的运行时界面。检查他们的注册：

```bash
openclaw plugins inspect <plugin-id> --runtime --json
```

网关重复使用其当前的插件清单，直到启动或明确的所有者更新。源代码或清单编辑后运行 `openclaw plugins reload <plugin-id>`。对于 API 客户端，`plugins.reload` 使用 `plugins: [{ pluginId }]` 重新加载一个已安装的插件或同一请求中的多个目标，并且 `plugins.refresh` 刷新清单。两者都等待运行时应用程序并返回生成收据。重新加载未更改的捆绑代码或替换捕获的外部代码将返回 `restartRequired: false`。如果已编译的捆绑代码在其文件更改后仍处于加载状态，或者无法验证这些文件，则重新加载报告 `restartRequired: true` 并带有警告。编辑源文件后重建编译输出，然后在结果需要时重新启动网关。显式操作也适用于 `gateway.reload.mode: "off"`。请参阅 [ 插件管理 RPC ](/gateway/protocol)。

清理是尽最大努力：禁用会删除插件的注册功能并尝试停止其服务和清理挂钩。成功的更改可以包括有关未完成清理的警告。缓存的模块、本机库或其他进程状态可能会保留到网关退出为止。当这些残留物引起问题时，重新启动是一种恢复选项。

`inspect --runtime` 加载插件模块并证明它注册了运行时表面（工具、挂钩、服务、网关方法、HTTP 路由、插件拥有的 CLI 命令）。普通 `inspect` 和 `list` 仅是冷 manifest/config/registry 检查。

## <a id="manage-plugins-from-an-agent-conversation"></a> 通过代理对话管理插件

所有者专用的 `plugins` 工具可以通过正在运行的网关列出、检查、搜索、安装、启用、禁用、卸载和重新加载插件。代理安装接受官方目录插件 ID 或 ClawHub 包名称。 `version` 选项仅适用于 ClawHub 安装；官方安装使用目录选择。要激活对已安装的本地 TypeScript 插件的编辑，请使用 `reload` 及其插件 ID。安装新的本地、npm、Git 或存档源仍使用上面的 CLI 工作流程。

在嵌入式代理运行时中，所应用的更改会在运行代码程序解决后的下一个模型请求之前刷新工具。暂停的程序可能需要进一步的模型步骤才能等待完成；已完成的操作和接受的指导保留在记录中并且不会重播。在要求程序使用更改的工具之前先完成正在运行的程序。

停止当前本机轮及其后台终端后，托管 Codex 会话继续在同一 OpenClaw 对话中，然后使用更新的工具创建线程。完成的工具结果、接受的后续消息和普通问题答案都作为有界对话上下文进入该线程。如果本机清理或线程释放失败，则尝试报告失败并保留用于恢复的绑定，而不是重播已完成的工作。

导入或受监督的本机会话保留其原始所有权和工具定义。他们报告后端更改，但需要新的托管对话才能使用更改后的工具。其他没有刷新消费者的运行时也会执行相同的操作。

库存和结果输出是有限的。使用 `query` 缩小 `list`，检查特定插件，或使用 Control UI 插件页面来获取省略的详细信息和功能审查。保存的安装可以比失败的运行时激活更长：在重试激活之前检查该结果，而不是重新安装它。

## <a id="update-plugins"></a> 更新插件

```bash
openclaw plugins update <plugin-id>
openclaw plugins update <npm-package-or-spec>
openclaw plugins update --all
openclaw plugins update <plugin-id> --dry-run
```

传递插件 ID 会重用其跟踪的安装规范：存储的 dist 标签 （`@beta`） 和确切的固定版本会延续到以后的 `update <plugin-id>` 运行。对于多条目包，任何子 ID 都会解析为一个跟踪的包安装，因此所有同级包都会一起更新。删除或重命名的子项在新的 package/index 状态提交之前会协调其过时条目、allow/deny 策略、确切的加载路径、通道配置和 memory/context 插槽选择； retained/new 子插件和不相关的插件被保留。

如果 OpenClaw 无法准确证明一个包所有者和完整的子列表，则更新和卸载将被拒绝，而不更改包文件、配置或已安装的索引。运行 `openclaw plugins registry --refresh`，检查 `openclaw plugins doctor`，并使用 `openclaw doctor --fix` 来修复可修复的旧索引状态。如果仍然存在歧义，请在重试之前重新安装该软件包。

`openclaw plugins update --all` 是批量维护路径。它保留了确切的版本引脚和显式标签，包括受信任的官方 OpenClaw 插件记录，因为无法将旧的自动引脚与操作员的有意引脚区分开来。当存在更新的默认行版本时，OpenClaw 会报告它并打印替换引脚的显式命令。浮动官方记录仍然遵循共享通道解析器，它同时使用 `update.channel` 和已安装的核心版本。

对于精确固定的 ClawHub 记录，请使用更新程序打印的命令故意返回到默认发布行：

```bash
openclaw plugins install clawhub:<package> --force
```

对于 npm 安装，请传入明确的包规格以切换已跟踪记录：

```bash
openclaw plugins update @scope/openclaw-plugin@beta
openclaw plugins update @scope/openclaw-plugin
```

第二条命令会在插件先前被锁定到精确版本或标签时，将其移回注册表的默认发布线。

有关确切的回退和锁定规则，请参见 [`openclaw plugins`](/cli/plugins#update)。

## <a id="uninstall-plugins"></a> 卸载插件

```bash
openclaw plugins uninstall <plugin-id> --dry-run
openclaw plugins uninstall <plugin-id>
openclaw plugins uninstall <plugin-id> --keep-files
```

卸载会从插件配置、allow/deny 列表、memory/context 插槽、确切链接的 `plugins.load.paths` 和通道配置条目（如果适用）中删除程序包的持久安装记录和每个拥有的子项的设置。它只为每个删除的子项保留精确的 `enabled: false` 标记，因此剩余的模型、提供商或渠道选择无法在启动修复期间自动重新安装软件包。重新安装不会默默地重新启用它；再次启用插件会替换标记。您可以使用任何儿童 ID 来处理多次入境包裹；预览会命名包所有者以及将被删除的所有同级包。除非您传递 `--keep-files`，否则托管安装目录将被删除一次。对于正在运行的网关，普通卸载会等待程序包的运行时所有者停止，然后再删除文件，并在应用新清单后返回。

Claw Add 将插件安装为共享依赖项。删除由 Add 创建的代理不会卸载其插件。在卸载插件之前，检查哪些代理使用了它；卸载可能会破坏这些代理。

在 Nix 模式（`OPENCLAW_NIX_MODE=1`）下，插件的安装、更新、卸载、 启用和禁用都将被禁用；请改为在 Nix 源中管理这些安装选项。

## <a id="choose-a-source"></a> 选择来源

| 来源      | 适用场景                                                                    | 示例                                                        |
| ----------- | --------------------------------------------------------------------------- | -------------------------------------------------------------- |
| ClawHub     | 您需要 OpenClaw-native 发现、扫描摘要、版本和提示     | `openclaw plugins install clawhub:<package>`                   |
| git         | 你希望从仓库中获取分支、标签或提交                         | `openclaw plugins install git:github.com/<owner>/<repo>@<ref>` |
| 本地路径  | 您正在同一台机器上开发或测试插件                  | `openclaw plugins install --link ./my-plugin`                  |
| 市场 | 您正在安装 Claude- 兼容的市场插件                   | `openclaw plugins install <plugin> --marketplace <source>`     |
| npm 打包    | 你正在通过 npm install 语义验证本地包制品      | `openclaw plugins install npm-pack:<path.tgz>`                 |
| npmjs.com   | 您已发送 JavaScript 软件包或需要 npm dist-tags/private 注册表 | `openclaw plugins install npm:@acme/openclaw-plugin`           |

受管理的本地路径安装必须是插件目录或归档文件。请将独立的插件文件放在 `plugins.load.paths` 中，而不是通过 `plugins install` 安装它们。

## <a id="publish-plugins"></a> 发布插件

ClawHub 是 OpenClaw 插件的主要公开发现入口。发布到这里， 当你希望用户在安装前先看到插件元数据、版本历史、注册表扫描结果和安装提示时使用。

```bash
npm i -g clawhub
clawhub login
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
clawhub package publish your-org/your-plugin@v1.0.0
```

原生 npm 插件在发布前必须同时提供插件清单（`openclaw.plugin.json`）以及 `package.json` 元数据：

```json package.json
{
  "name": "@acme/openclaw-plugin",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./dist/index.js"]
  }
}
```

```bash
npm publish --access public
openclaw plugins install npm:@acme/openclaw-plugin
openclaw plugins install npm:@acme/openclaw-plugin@beta
openclaw plugins install npm:@acme/openclaw-plugin@1.0.0
```

请使用以下页面了解完整的发布契约，而不是将此页面视为发布参考：

- [ClawHub 发布](/clawhub/publishing) 说明所有者、作用域、 发布、审核、包验证和包转移。
- [构建插件](/plugins/building-plugins) 展示完整的插件包结构（包括 `openclaw.plugin.json`）以及首次发布工作流。
- [插件清单](/plugins/manifest) 定义原生插件清单字段。

如果同一个包同时在 ClawHub 和 npm 上可用，请使用明确的 `clawhub:` 或 `npm:` 前缀来强制指定来源。

## <a id="related"></a> 相关内容

- [Plugins](/tools/plugin) - 安装、配置、重新加载和故障排除
- [`openclaw plugins`](/cli/plugins) - 完整的 CLI 参考
- [社区插件](/plugins/community) - 公开发现和 ClawHub 发布
- [ClawHub](/clawhub/cli) - 注册表 CLI 操作
- [构建插件](/plugins/building-plugins) - 创建插件包
- [插件清单](/plugins/manifest) - 清单和包元数据。
