---
summary: "安装源和定位器、信任和安装策略、功能同意和市场安装"
title: "安装插件"
read_when:
  - "您想要从 ClawHub、npm、git、本地路径或市场安装插件"
  - "您需要 `--force`、`--pin` 背后的规则或安装策略警告"
---

此页面涵盖 `openclaw plugins install`：每个受支持的源定位器、控制安装的信任和安装策略规则以及它接受的市场表面。它还解释了如何启用已安装的插件。

## <a id="install"></a> 安装

当本地网关运行时，`plugins install` 通过该网关应用每个支持的插件源并返回其应用的生成。如果没有本地网关，它将保存安装以供下次启动。丢失回复或失败的运行时激活不会触发第二次本地安装；检查报告的状态并在修复激活失败后使用 `plugins reload <id>`。

替换安装会等待旧插件的运行状态，然后再应用新一代插件。对于安装本身未更改的配置的文件观察器通知不会取消该等待；较新的配置更改仍然可以取代它。

当配置已经拥有插件激活时使用 `--no-enable`。它安装并记录插件，而不将其添加到 `plugins.allow`、将其从 `plugins.deny` 中删除、启用其条目或选择其专用插槽。现有启用条目保持启用状态；该标志不会禁用插件。所需的配置检查仍然适用，缺少所需配置的插件仍处于禁用状态。 Hook-pack 安装不支持此标志。

本地路径、存档、npm-pack tarball 和本地 Git 存储库必须位于网关主机上。市场请求还需要本地连接，因为市场名称可以解析为主机本地注册。 CLI 在发送请求之前解析本地路径。 Control UI 继续仅提供官方和 ClawHub 源。

`claws add`安装的插件依赖保留Claw批量租约；该批次的实时激活与此单插件命令是分开的。

```bash
openclaw plugins search "calendar"                      # search ClawHub plugins
openclaw plugins install @openclaw/<package>            # trusted official catalog
openclaw plugins install <package>                       # arbitrary npm package
openclaw plugins install clawhub:<package>                # ClawHub only
openclaw plugins install npm:<package>                    # npm only
openclaw plugins install npm-pack:<path.tgz>               # local npm-pack tarball
openclaw plugins install git:github.com/<owner>/<repo>     # git repo
openclaw plugins install git:github.com/<owner>/<repo>@<ref>
openclaw plugins install <path>                            # local path or archive
openclaw plugins install -l <path>                         # link instead of copy
openclaw plugins install <plugin>@<marketplace>             # marketplace shorthand
openclaw plugins install <plugin> --marketplace <name>      # marketplace (explicit)
openclaw plugins install <package> --force                  # confirm source / overwrite existing
openclaw plugins install <package> --pin                    # pin resolved npm version
openclaw plugins install <package> --no-enable              # preserve activation policy
openclaw plugins install <package> --acknowledge-install-policy-warning
```

维护者测试设置时的安装可以通过受保护的环境变量覆盖自动插件安装来源。请参见 [插件安装覆盖](/plugins/install-overrides)。

打包的 macOS 从没有确切发布标签的提交构建，更喜欢从同一提交构建的分阶段官方插件。自动安装使用这些副本，无需获取注册表包；官方安装记录了捆绑的源码路径。这些副本遵循应用程序更新；医生和插件更新使它们与匹配的主机 SDK 保持一致。使用 `npm:<package>` 显式选择注册表。发布版本保留已发布的插件布局。

<Warning>
默认情况下，裸包名称从 npm 安装。捆绑插件 ID 选择捆绑副本。官方插件 ID 和非限定官方包名称（裸或 `@latest`）遵循其目录声明的源顺序，仅在目标未发布时进行切换。 ClawHub- 只有插件保留在 ClawHub 上。完整性、兼容性、信任、安装策略和功能同意失败会停止安装，而无需切换源。当您故意需要外部 npm 封装时，请使用 `npm:<package>`。使用 `clawhub:<package>` 代替 ClawHub。将插件安装视为运行代码；更喜欢固定版本。
</Warning>

<Warning>
ClawHub 软件包和 OpenClaw 的 bundled/official 目录是受信任的安装源。新的任意 npm、`npm-pack:`、git、本地 path/archive 或市场源会在继续之前发出警告并询问。在您查看并信任源之后，非交互式任意安装必须通过 `--force`。需要时，相同的标志会覆盖现有的安装目标。已跟踪安装的正常更新不需要它。 `--force` 不会绕过 `security.installPolicy` 或剩余的安装安全检查。
</Warning>

捆绑插件和经过验证的第一方目录插件在设置、安装、启用、更新或 Doctor 修复过程中不需要 `--accept-capabilities`。本地副本和未经验证的来源仍然需要能力同意，即使它们的包名称与官方插件匹配。此豁免不授予 OAuth、操作系统或运行时工具权限。参见[能力同意](/plugins/manage-plugins#capability-consent)。

通过 `plugins.load.paths` 选择的本地副本（包括 `--link` 安装）不会继承官方包信任。 `--force` 不会改变该边界。如果通道需要可信插件状态（例如其持久入口队列），则启动会记录拒绝并让通道处于阻塞状态，而不会自动重试。 Doctor和`openclaw update status`显示正在运行的网关记录的故障，包括来源和补救措施。安装官方 npm 软件包或 ClawHub 列表并从 `plugins.load.paths` 中删除本地覆盖，然后重新启动通道。

`plugins search` 查询 ClawHub 中可安装的 `code-plugin` 和 `bundle-plugin` 软件包（不是技能；使用 `openclaw skills search` 来查找这些软件包）。默认 `--limit` 为 20，上限为 100。它仅读取远程目录：无本地状态检查、配置变更、包安装或插件运行时加载。结果包括 ClawHub 软件包名称、系列、频道、版本、摘要以及安装提示（例如 `openclaw plugins install clawhub:<package>`）。人工输出仅将 `v` 添加到数字版本标签，保留现有前缀和构建名称。 JSON 输出保留原始版本值。

<Note>
默认官方安装遵循目录声明的源顺序。 ClawHub 还提供插件发现。 OpenClaw-拥有的`@openclaw/*`插件包再次发布在npm上；请参阅 [npmjs.com/org/openclaw](https://www.npmjs.com/org/openclaw) 或 [ 插件库存](/plugins/plugin-inventory) 上的当前列表。稳定的官方ClawHub安装先尝试运行OpenClaw版本。如果该版本未发布，安装将回退到原始目录候选，并显示可见警告，并保留该候选的完整性 pin。不兼容的后备会将所需的插件命名为 API 或 OpenClaw 版本，并要求您升级或选择显式兼容的插件版本。带有 bare/default 或 `@latest` 意图的新 Beta 通道安装针对符合条件的官方 npm 和受信任的官方 ClawHub 插件安装的核心的确切 Beta 版本。如果核心不是 Beta 版本，则它们的目标是 `@beta`。所选版本必须存在于已声明的来源中；传递一个明确的版本来选择另一个版本。医生、入门和插件更新恢复路径可以回退到记录的或默认的选择器，并带有可见的警告。在扩展稳定通道上，具有 bare/default 或 `@latest` 意图的合格官方插件解析为已安装的核心版本（版本绑定插件的基本版本组）。安装记录保留请求的选择器。精确的引脚和显式的非 `latest` 标签可以保持其目标。不相关的第三方软件包不会固定到核心版本。 Doctor单独刷新了与当前OpenClaw版本队列绑定的过时的官方运行时插件；现有的 npm 引脚将成为同一注册表中的完全相同的替换版本。
</Note>

### <a id="sources-and-locators"></a> 源和定位器

ClawHub 安装使用显式的 `clawhub:<package>` 定位符：

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

裸露的 npm-safe 插件规范默认从 npm 安装，除非它们与官方插件 ID 匹配：

```bash
openclaw plugins install openclaw-codex-app-server
```

使用 `npm:` 使 npm-only 解析显式：

```bash
openclaw plugins install npm:openclaw-codex-app-server
openclaw plugins install npm:@openclaw/discord@2026.5.20
openclaw plugins install npm:@scope/plugin-name@1.0.1
```

OpenClaw 在安装前会检查声明的插件 API / 最低 gateway 兼容性。当所选 ClawHub 版本发布了 ClawPack 产物时，OpenClaw 会下载带版本的 npm-pack `.tgz`，验证 ClawHub digest 头和产物 digest，然后通过常规归档路径安装它。没有 ClawPack 元数据的旧版 ClawHub 版本仍然会通过传统的包归档验证路径安装。已记录的安装会保留其 ClawHub 源元数据、产物类型、npm integrity、npm shasum、tarball 名称和 ClawPack digest 事实，以便后续更新使用。 未版本化的 ClawHub 安装会保留未版本化的已记录 spec，因此 `openclaw plugins update` 可以跟随较新的 ClawHub 发布；显式版本或标签选择器，例如 `clawhub:pkg@1.2.3` 和 `clawhub:pkg@beta`，仍会固定在该选择器上。

当旧元数据提供没有存档摘要的 `files[]` 时，OpenClaw 会在安装之前验证规范化的提取路径和 SHA-256 哈希值。无害的存档拼写（例如反斜杠分隔符）可能会规范化为这些路径；丢失、更改或额外的文件以及指定的不受支持的记录仍然无法通过验证。不创建输出的仅根记录将被忽略。服务器提供的路径和生成的 `_meta.json` 元数据保持严格验证。

ZIP 条目名称仅因大小写或 Unicode 规范化而异的存档在每个平台上都会被拒绝。 ClawHub 回退验证报告存档冲突；包作者必须重命名冲突条目并发布更正的存档，然后才能继续安装。

### <a id="config-includes-and-invalid-config-repair"></a> Config 包括和无效配置修复

如果您的 `plugins` 部分或正在更改的 `plugins.entries.<id>` 条目由单文件 `$include` 支持，则 `plugins install/update/enable/disable/uninstall` 会写入拥有更改的最深包含文件，并保持 `openclaw.json` 不变。根包含（其根对象作者 `$include` 的配置的每个部分）、包含数组、包含同级覆盖、跨越多个包含文件的更改以及其自己的文件仍作者嵌套 `$include` 的包含都会被拒绝，而不是展平。有关支持的形状，请参阅 [Config 包括 ](/gateway/configuration)。

如果安装前配置无效，`plugins install` 通常会拒绝继续并告诉您先运行 `openclaw doctor --fix`。 Doctor 拥有 [ 旧密钥迁移](/gateway/doctor#detailed-behavior-and-rationale)，并且可以隔离无效的插件条目。网关启动和热重载拒绝无效的插件配置而不运行该修复。插件安装的唯一预先存在的配置例外是明确选择 `openclaw.install.allowInvalidConfigRecovery` 的插件的狭窄捆绑插件恢复路径。

当现有宿主配置有效，但新安装插件自身的配置缺失时，OpenClaw 会将该安装记录为禁用，而不是写入一个无效的启用条目。请先配置 `plugins.entries.<id>.config`，然后运行 `openclaw plugins enable <id>`。如果已存在的插件配置条目有效但无效，安装会失败且不会重写它。

### <a id="--force-confirmation-and-reinstall-vs-update"></a><a id="force-confirmation-and-reinstall-vs-update"></a> --force 确认并重新安装与更新

`--force` 确认非 ClawHub 源而不提示。它不会绕过 `security.installPolicy` 或剩余的安装安全检查。当插件或挂钩包已安装时，它还允许替换现有安装。在查看任意 npm、本地、存档、git 或市场源后，或者有意重新安装相同 ID 时，请使用它。对于已跟踪的 npm 插件的常规升级，首选 `openclaw plugins update <id-or-npm-spec>`。

托管 npm 安装在专用暂存目录中准备包及其依赖项。完整性和平台包检查、安装策略和工件同意在替换安装目录之前完成。发布前的拒绝或取消会使之前的项目保持不变。升级保留运行插件可能仍需要稍后导入的生成路径。

当托管的 npm 插件缺少包元数据或所需的依赖项时，状态和管理报告 **install incomplete**。结果和医生给出了 `openclaw plugins install <package-selector> --force`，使用记录的包选择器（如果可用）。完整的插件仍然可能需要您同意您尚未接受的功能。仅在审核该同意请求后添加 `--accept-capabilities`。

如果安装所有权在备份副本期间结束，清理将停止并保留完整的备份和剩余的原始文件。恢复失败报告恢复路径。保留这些文件，直到您检查了当前安装；较旧的事务无法通过较新的安装进行恢复或使用替换的备份。

对于识别出的 npm 项目损坏或不完整的安装元数据，OpenClaw 将受影响的 `node_modules`、锁定文件和收缩包装文件隔离在暂存目录之外，并尝试进行一次重建。报告的隔离路径在失败后仍然可用；失败的恢复使之前的项目保持不变。

重新安装会保留创作的 `plugins.entries.<id>.enabled: false`。 `--force` 不批准功能：当没有有效的事先接受可以重复使用时，请在安装提交之前审查并接受它们。之后使用 `openclaw plugins enable <id>` 激活插件。参见[能力同意](/plugins/manage-plugins#capability-consent)。

如果您针对已安装的插件 ID 运行 `plugins install`，则 OpenClaw 会停止并指向您 `plugins update <id-or-npm-spec>` 进行正常升级，或者在您确实想要从其他来源覆盖当前安装时指向 `plugins install <package> --force`。任意来源仍然显示交互式出处警告；非交互式安装必须在审核后通过 `--force`。受信任的 ClawHub 和 OpenClaw- 目录源不需要它。对于 `--link`，`--force` 确认源但不更改链接路径安装模式。

### <a id="--pin-scope"></a><a id="pin-scope"></a> --pin 适用范围

`--pin` 仅适用于 npm 安装并记录已解析的确切 `<name>@<version>`。 `git:` 安装（将参考固定在规范中，e.g. `git:github.com/acme/plugin@v1.2.3`）或 `--marketplace`（市场安装持久市场源元数据而不是 npm 规范）不支持它。

OpenClaw- 拥有的发布插件的后续更新可以恢复对不更新于核心的记录版本的自动跟踪。这适用于旧的手动和自动销；提供给当前更新命令的显式版本仍然获胜。请参阅 [ 插件更新行为](/cli/plugins/uninstall-and-update)。

### --acknowledge-install-policy-warning

当 `security.installPolicy` 在交互式终端中返回 `warn` 时，OpenClaw 会打印原因和结果，然后使用与可疑 ClawHub 发布相同的确认副本：`type: '<plugin>' to install anyway`。如果完整呈现的评论超过 4,000 个字符，OpenClaw 在提示之前停止；首先减少或合并政策产出。匹配的答案会在继续之前重新评估暂存的源。拒绝或非交互式直接 CLI 安装在提交之前停止；审核后，`--acknowledge-install-policy-warning` 明确批准该命令调用的每个警告。 Control UI 安装报价 **显示警告后无论如何安装**；网关 API 客户端可以使用 `acknowledgeInstallPolicyWarning: true` 确认已审核的请求。自动安装本身并不批准策略警告。对于没有显式确认步骤的受管表面，请重新运行等效的直接 CLI 命令（如果存在），或者更改 `security.installPolicy` 以在重试受管流之前返回已审核请求的 `allow`。每个批准的警告都会在继续之前重新评估。确认和 `--force` 都不会覆盖 `block` 或策略失败。

如果您在 ClawHub 上发布的插件被注册表扫描隐藏或阻止，请使用 [ClawHub 发布](/clawhub/publishing) 中的发布者步骤。该标志不会要求 ClawHub 重新扫描插件或公开阻止的版本。已弃用的 `--dangerously-force-unsafe-install` 标志仍然是无操作。

### <a id="clawhub-security-audit"></a> ClawHub 安全审核

社区 ClawHub 安装在下载之前检查所选版本的信任记录。 OpenClaw 打印结果、准确的审核概述和详细信息链接。审核结果仅供参考，安装将继续。如果 ClawHub 禁用下载或返回阻止审核结果，则 OpenClaw 拒绝发布。直接官方 ClawHub 插件安装和捆绑的 OpenClaw 插件源绕过此发布信任检查。当 Claw 安装插件时，Claw 流程也会检查官方软件包的发布信任，并需要单独确认审核结果。

### <a id="hook-packs-and-npm-specs"></a> Hook 包和 npm 规格

`plugins install` 也是在 `package.json` 中暴露 `openclaw.hooks` 的挂钩包的安装表面。使用 `openclaw hooks` 进行过滤的钩子可见性和每个钩子的启用，而不是包安装。

Npm 规范为 **registry-only**（软件包名称加上可选的 **精确版本** 或 **dist-tag**）。 Git/URL/file 规格和 semver 范围被拒绝。为了安全起见，即使您的 shell 具有全局 npm 安装设置，依赖项安装也会在每个带有 `--ignore-scripts` 的插件的一个托管 npm 项目中运行。托管插件 npm 项目继承了 OpenClaw 依赖项覆盖的 npm- 兼容部分。 pnpm 父子选择器被跳过； npm 别名将保留，除非安装的 npm 版本拒绝它们。

使用 `npm:<package>` 使 npm 分辨率显式化。裸包规范也可以直接从 npm 安装，除非它们与官方插件 ID 匹配。

与捆绑插件匹配的原始 `@openclaw/*` 规范在 npm 回退之前解析为映像拥有的捆绑副本。例如，`openclaw plugins install @openclaw/discord@2026.5.20 --pin` 使用当前 OpenClaw 版本中捆绑的 Discord 插件，而不是创建托管 npm 覆盖。要强制使用外部 npm 封装，请使用 `openclaw plugins install npm:@openclaw/discord@2026.5.20 --pin`。

裸 spec 和 `@latest` 会保持在稳定通道。OpenClaw 这样的带日期修正版本如 `2026.5.3-1` 在此检查中也算作稳定版。如果 npm 将任一形式解析为预发布版本，OpenClaw 会停止并要求你通过预发布标签（`@beta`/`@rc`）或精确预发布版本（`@1.2.3-beta.4`）显式选择加入。

对于没有确切版本的 npm 安装（`npm:<package>` 或 `npm:<package>@latest`），OpenClaw 在安装前检查已解析的包元数据。如果最新的稳定包需要较新的 OpenClaw 插件 API 或最低主机版本，则 OpenClaw 会检查较旧的稳定版本并安装最新的兼容版本。精确版本和显式非 `latest` dist 标记保持严格：不兼容的选择失败，并要求您升级 OpenClaw 或选择兼容版本。

如果裸安装 spec 匹配官方插件 id（例如 `diffs`），OpenClaw 会直接安装目录条目。若要安装同名 npm 包，请使用显式的作用域 spec（例如 `@scope/diffs`）。

### <a id="git-repositories"></a> Git 存储库

使用 `git:<repo>` 直接从 git 存储库安装。支持的形式：`git:github.com/owner/repo`、`git:owner/repo`、完整 `https://`、`ssh://`、`git://`、`file://` 和 `git@host:owner/repo.git` 克隆 URL。添加 `@<ref>` 或 `#<ref>` 以在安装前检查分支、标记或提交。

Git 安装会先克隆到临时目录，在存在请求的 ref 时检出它，然后使用常规插件目录安装器，因此 manifest 验证、operator 安装策略、包管理器安装工作以及安装记录的行为都与 npm 安装相同。已记录的 git 安装会包含源 URL/ref 以及解析出的 commit，以便 `openclaw plugins update` 之后再次解析该来源。

即使存储库现在声明了不同的插件 ID，在没有 `--force` 的情况下重新安装相同的 Git 源和引用也会拒绝现有的托管签出。使用 `openclaw plugins update <id>` 进行跟踪升级，或使用 `openclaw plugins install git:<repo>@<ref> --force` 有意重新安装相同的插件 ID。 `--force` 不会将现有安装记录迁移到不同的插件 ID。

从 git 安装后，可使用 `openclaw plugins inspect <id> --runtime --json` 来验证运行时注册，例如 gateway 方法和 CLI 命令。如果插件通过 `api.registerCli` 注册了 CLI 根命令，请直接通过 OpenClaw 根 CLI 运行该命令，例如 `openclaw demo-plugin ping`。

### <a id="archives"></a> 档案

支持的压缩包：`.zip`、`.tgz`、`.tar.gz`、`.tar`。原生 OpenClaw 插件压缩包必须在解压后的插件根目录中包含有效的 `openclaw.plugin.json`；仅包含 `package.json` 的压缩包会在 OpenClaw 写入安装记录之前被拒绝。

当文件是 npm-pack tarball，并且你希望使用与 registry 安装相同的、按插件划分的受管 npm 项目路径时，请使用 `npm-pack:<path.tgz>`，这包括 `package-lock.json` 验证、提升后的依赖扫描和 npm 安装记录。普通归档路径仍会作为本地归档安装到插件扩展根目录下。

对于扩展根目录中注册的存档插件，`openclaw doctor --fix` 使用已安装的软件包修复陈旧或悬空的 `node_modules/openclaw` 主机链接。此修复不需要原始存档或重新安装插件。

也支持 Claude 市场安装。

### <a id="marketplace-shorthand"></a> Marketplace 缩写

当市场名称存在于 Claude 的本地注册表缓存 `~/.claude/plugins/known_marketplaces.json` 中时，使用 `plugin@marketplace` 简写：

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

使用 `--marketplace` 可显式传入 marketplace 来源：

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

<Tabs>
  <Tab id="marketplace-sources" title="市场来源">
    - 来自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知 marketplace 名称
    - 本地 marketplace 根目录或 `marketplace.json` 路径
    - GitHub 仓库简写，例如 `owner/repo`
    - GitHub 仓库 URL，例如 `https://github.com/owner/repo`
    - a git URL

  </Tab>
  <Tab id="remote-marketplace-rules" title="远程市场规则">
    对于从 GitHub 或 git 加载的远程 marketplace，插件条目必须保留在克隆的 marketplace 仓库内部。OpenClaw 接受该仓库中的相对路径来源，并会拒绝来自远程 manifest 的 HTTP(S)、绝对路径、git、GitHub 以及其他非路径插件来源。
  </Tab>
</Tabs>

### <a id="local-paths-and-bundle-formats"></a> 本地路径和捆绑包格式

对于本地路径和压缩包，OpenClaw 会自动检测：

- 原生 OpenClaw 插件（`openclaw.plugin.json`）
- Agent Plugins bundle（根目录中的 `plugin.json` 声明了 [Agent Plugins](https://agent-plugins.org) `$schema`）
- Codex- 兼容捆绑包 （`.codex-plugin/plugin.json`）
- Claude- 兼容捆绑包（`.claude-plugin/plugin.json`，或当该清单文件不存在时的默认 Claude 组件布局）
- 兼容 Cursor 的 bundle（`.cursor-plugin/plugin.json`）

受管本地安装必须是插件目录或归档。独立的 `.js`、 `.mjs`、`.cjs` 和 `.ts` 插件文件不会被 `plugins install` 复制到受管插件根目录中，也不会通过直接放入 `~/.openclaw/extensions` 或 `<workspace>/.openclaw/extensions` 而加载；这些自动发现的根目录会加载插件包或 bundle 目录，并将顶层脚本文件跳过，视为本地辅助文件。请改为在 `plugins.load.paths` 中显式列出独立文件。

<Note>
兼容的捆绑包安装到正常的插件根目录中并参与相同的 list/info/enable/disable 流程。今天，捆绑技能，捆绑 MCP 服务器、代理插件 skills/MCP（带有 `PLUGIN_ROOT`/`PLUGIN_DATA` 子进程合约）、Claude 命令技能、Claude `settings.json` 默认值、Claude `.lsp.json` /支持清单声明的 `lspServers` 默认值、光标命令技能和兼容的 Codex 挂钩目录；其他检测到的捆绑包功能显示在 diagnostics/info 中，但尚未连接到运行时执行。请参阅 [ 插件包](/plugins/bundles) 了解每种格式的映射。
</Note>

使用 `-l`/`--link` 可指向本地插件目录而不复制它（会添加到 `plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

`--link` 不支持与 `--marketplace` 或 `git:` 安装一起使用，并且它要求一个已存在的本地路径。对于非交互式本地链接，请在查看来源后使用 `--force`； 它会确认来源，但不会复制或覆盖已链接的目录。

<Note>
从工作区扩展根目录发现的工作区源插件在显式启用之前不会导入或执行。对于本地开发，运行`openclaw plugins enable <plugin-id>`或设置`plugins.entries.<plugin-id>.enabled: true`；如果您的配置使用 `plugins.allow`，也请包含相同的插件 ID。当通道设置明确针对仅用于设置加载的工作区源插件时，此规则也适用，因此当该工作区插件保持禁用或从允许列表中排除时，本地通道插件设置代码将不会运行。链接安装和显式 `plugins.load.paths` 条目遵循其解析插件来源的正常策略。参见[配置插件策略](/tools/plugin#configure-plugin-policy)和[配置参考](/gateway/config-extensions#plugins)。

在 npm 安装上使用 `--pin` 可将解析出的精确 spec（`name@version`）保存到受管插件索引中，同时保持默认行为不固定。
</Note>

## <a id="enable-installed-plugins"></a> 启用已安装的插件

按照提供的顺序启用一个或多个已安装的插件：

```bash
openclaw plugins enable codex cua-computer
openclaw plugins enable <ids...> --accept-capabilities
```

每个插件都有自己的策略和功能同意检查。该命令在第一次失败时停止；较早成功的启用保持提交，较晚的 ID 不被处理。当本地网关运行时，它会通过该网关应用每个更改。否则，更改将保存到下次网关启动时。

`openclaw plugins disable <ids...>` 遵循相同的输入顺序，并在第一次失败时停止，保留较早的更改。两个命令都保留重复的 ID；每个操作都会看到前一个操作提交的配置。

无论网关正在运行还是停止，`plugins enable` 都会遵守全局禁用、拒绝列表和限制性白名单。策略拒绝发生在记录能力同意之前； `--accept-capabilities` 不会将该插件添加到允许列表中。现有的 ClickClack 显式选择例外仍然适用。当启用请求被阻止时，首先更新配置的策略。
