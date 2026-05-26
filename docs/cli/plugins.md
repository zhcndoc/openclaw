---
summary: "CLI 参考，适用于 `openclaw plugins`（init、build、validate、list、install、marketplace、uninstall、enable/disable、doctor）"
read_when:
  - 你想安装或管理 Gateway 插件或兼容捆绑包
  - 你想为简单的工具插件搭建脚手架或验证
  - 你想调试插件加载失败问题
title: "插件"
sidebarTitle: "插件"
---

管理 Gateway 插件、hook 包和兼容捆绑包。

<CardGroup cols={2}>
  <Card title="插件系统" href="/tools/plugin">
    安装、启用和排查插件问题的最终用户指南。
  </Card>
  <Card title="管理插件" href="/plugins/manage-plugins">
    安装、列出、更新、卸载和发布的快速示例。
  </Card>
  <Card title="插件捆绑包" href="/plugins/bundles">
    捆绑包兼容性模型。
  </Card>
  <Card title="插件清单" href="/plugins/manifest">
    清单字段和配置 schema。
  </Card>
  <Card title="安全" href="/gateway/security">
    为插件安装提供安全加固。
  </Card>
</CardGroup>

## 命令

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
openclaw plugins search <query>
openclaw plugins search <query> --limit 20
openclaw plugins search <query> --json
openclaw plugins install <path-or-spec>
openclaw plugins inspect <id>
openclaw plugins inspect <id> --runtime
openclaw plugins inspect <id> --json
openclaw plugins inspect --all
openclaw plugins info <id>
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins registry
openclaw plugins registry --refresh
openclaw plugins uninstall <id>
openclaw plugins doctor
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins marketplace list <marketplace>
openclaw plugins marketplace list <marketplace> --json
openclaw plugins init <id>
openclaw plugins init <id> --directory ./my-plugin --name "My Plugin"
openclaw plugins build --entry ./dist/index.js
openclaw plugins build --entry ./dist/index.js --check
openclaw plugins validate --entry ./dist/index.js
```

对于缓慢的安装、检查、卸载或 registry-refresh 排查，请使用
`OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1` 运行命令。该 trace 会将各阶段耗时写入 stderr，并保持 JSON 输出可解析。参见 [调试](/help/debugging#plugin-lifecycle-trace)。

<Note>
在 Nix 模式（`OPENCLAW_NIX_MODE=1`）下，插件生命周期变更操作会被禁用。请改用 Nix 源进行安装，而不是使用 `plugins install`、`plugins update`、`plugins uninstall`、`plugins enable` 或 `plugins disable`；对于 nix-openclaw，请使用以 agent 为先的 [快速开始](https://github.com/openclaw/nix-openclaw#quick-start)。
</Note>

<Note>
捆绑插件随 OpenClaw 一起发布。其中一些默认启用（例如捆绑的模型提供者、捆绑的语音提供者以及捆绑的浏览器插件）；其他的则需要 `plugins enable`。

原生 OpenClaw 插件必须包含带内联 JSON Schema（`configSchema`，即使为空也需要）的 `openclaw.plugin.json`。兼容捆绑包则使用它们自己的 bundle manifest。

`plugins list` 会显示 `Format: openclaw` 或 `Format: bundle`。详细列表/信息输出还会显示 bundle 子类型（`codex`、`claude` 或 `cursor`）以及检测到的 bundle 能力。
</Note>

### 作者

```bash
openclaw plugins init stock-quotes --name "Stock Quotes"
cd stock-quotes
npm run plugin:build
npm run plugin:validate
```

`plugins init` 会创建一个最小的 TypeScript 工具插件，使用
`defineToolPlugin`。`plugins build` 会导入该入口，读取其静态工具
元数据，写入 `openclaw.plugin.json`，并保持 `package.json`
中的 `openclaw.extensions` 对齐。`plugins validate` 会检查生成的
manifest、包元数据以及当前入口导出是否仍然一致。详见
[工具插件](/plugins/tool-plugins) 以了解完整的创作流程。

脚手架会写入 TypeScript 源码，但会从构建后的
`./dist/index.js` 入口生成元数据，因此该流程也可与已发布的 CLI 配合使用。若入口不是默认包入口，请使用
`--entry <path>`。在 CI 中使用 `plugins build --check`，当生成的元数据已过期时失败，但不重写文件。

### 安装

```bash
openclaw plugins search "calendar"                   # 搜索 ClawHub 插件
openclaw plugins install <package>                      # 默认使用 npm
openclaw plugins install clawhub:<package>              # 仅 ClawHub
openclaw plugins install npm:<package>                  # 仅 npm
openclaw plugins install npm-pack:<path.tgz>            # 通过 npm install 语义安装本地 npm pack
openclaw plugins install git:github.com/<owner>/<repo>  # git 仓库
openclaw plugins install git:github.com/<owner>/<repo>@<ref>
openclaw plugins install <package> --force              # 覆盖现有安装
openclaw plugins install <package> --pin                # 锁定版本
openclaw plugins install <package> --dangerously-force-unsafe-install
openclaw plugins install <path>                         # 本地路径
openclaw plugins install <plugin>@<marketplace>         # marketplace
openclaw plugins install <plugin> --marketplace <name>  # marketplace（显式）
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
```

维护者测试设置时的安装可以通过受保护的环境变量覆盖自动插件安装
来源。请参见
[插件安装覆盖](/plugins/install-overrides)。

<Warning>
在启动切换期间，裸包名默认从 npm 安装。ClawHub 请使用 `clawhub:<package>`。请将插件安装视为运行代码，优先使用锁定版本。
</Warning>

`plugins search` 会查询 ClawHub 中可安装的插件包，并打印
可直接安装的包名。它搜索的是 code-plugin 和 bundle-plugin 包，
不是 skills。请使用 `openclaw skills search` 查询 ClawHub skills。

<Note>
ClawHub 是大多数插件的主要分发和发现入口。npm
仍然是受支持的后备和直接安装路径。OpenClaw 自有的
`@openclaw/*` 插件包已重新发布到 npm；请查看当前列表
[npmjs.com/org/openclaw](https://www.npmjs.com/org/openclaw) 或
[插件清单](/plugins/plugin-inventory)。稳定安装使用 `latest`。
Beta 通道的安装和更新会优先在可用时使用 npm 的 `beta` dist-tag，
然后再回退到 `latest`。
</Note>

<AccordionGroup>
  <Accordion title="Config includes 和无效配置修复">
    如果你的 `plugins` 部分由单文件 `$include` 支持，`plugins install/update/enable/disable/uninstall` 会写回到那个被包含的文件，而保持 `openclaw.json` 不变。根级 includes、include 数组以及带有同级覆盖的 includes 会直接失败，而不是被扁平化。支持的形状请参见 [Config includes](/gateway/configuration)。

    如果安装期间配置无效，`plugins install` 通常会失败并提示你先运行 `openclaw doctor --fix`。在 Gateway 启动和热重载期间，无效插件配置会像其他无效配置一样直接失败；`openclaw doctor --fix` 可以隔离无效的插件条目。唯一文档化的安装时例外，是一个狭窄的内置插件恢复路径，适用于显式选择加入 `openclaw.install.allowInvalidConfigRecovery` 的插件。

  </Accordion>
  <Accordion title="--force 以及 reinstall 与 update 的区别">
    `--force` 会复用现有安装目标，并就地覆盖已经安装的插件或 hook 包。当你有意从新的本地路径、压缩包、ClawHub 包或 npm 产物重新安装相同 id 时，请使用它。对于已跟踪的 npm 插件常规升级，优先使用 `openclaw plugins update <id-or-npm-spec>`。

    如果你对一个已经安装的插件 id 运行 `plugins install`，OpenClaw 会停止并提示你：正常升级请使用 `plugins update <id-or-npm-spec>`；如果你确实想从不同来源覆盖当前安装，则使用 `plugins install <package> --force`。

  </Accordion>
  <Accordion title="--pin 范围">
    `--pin` 仅适用于 npm 安装。不支持 `git:` 安装；当你想要锁定来源时，请使用显式 git ref，例如 `git:github.com/acme/plugin@v1.2.3`。它也不支持 `--marketplace`，因为 marketplace 安装会持久化 marketplace 源元数据，而不是 npm spec。
  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` 是一个用于内置危险代码扫描器误报的“破窗”选项。即使内置扫描器报告 `critical` 发现，它也会允许安装继续，但它**不会**绕过插件 `before_install` 钩子策略阻断，也**不会**绕过扫描失败。

    安装扫描会忽略常见的测试文件和目录，例如 `tests/`、`__tests__/`、`*.test.*` 和 `*.spec.*`，以避免阻止已打包的测试 mock；即使这些名称命中，声明的插件运行时入口点仍会被扫描。

    这个 CLI 标志适用于插件安装/更新流程。由 Gateway 驱动的 skill 依赖安装会使用匹配的 `dangerouslyForceUnsafeInstall` 请求覆盖，而 `openclaw skills install` 仍然是一个独立的 ClawHub skill 下载/安装流程。

    如果你发布到 ClawHub 的插件被 registry 扫描隐藏或阻止，请使用 [ClawHub 发布](/clawhub/publishing) 中的发布者步骤。`--dangerously-force-unsafe-install` 只影响你自己机器上的安装；它不会要求 ClawHub 重新扫描该插件，也不会让被阻止的发布公开。
  </Accordion>
  <Accordion title="Hook 包和 npm spec">
    `plugins install` 也是安装暴露 `package.json` 中 `openclaw.hooks` 的 hook 包的入口。请使用 `openclaw hooks` 进行过滤后的 hook 可见性和单个 hook 启用，而不是用于包安装。

    Npm spec **仅限 registry**（包名 + 可选的**精确版本**或 **dist-tag**）。`git`/URL/file spec 和 semver 范围都会被拒绝。依赖安装会在项目本地运行，并为安全起见使用 `--ignore-scripts`，即使你的 shell 配置了全局 npm install 设置。受管理的插件 npm 根目录会继承 OpenClaw 包级别的 npm `overrides`，因此宿主安全 pin 也会应用到 hoisted 的插件依赖。

    当你想显式使用 npm 解析时，请使用 `npm:<package>`。在启动切换期间，裸包 spec 也会直接从 npm 安装。

    裸 spec 和 `@latest` 会保持在稳定通道。OpenClaw 带日期标记的修正版本（例如 `2026.5.3-1`）在此检查中被视为稳定发布。如果 npm 将它们解析为预发布版本，OpenClaw 会停止并要求你显式选择预发布标签（如 `@beta`/`@rc`）或精确的预发布版本（如 `@1.2.3-beta.4`）。

    如果一个裸安装 spec 匹配到官方插件 id（例如 `diffs`），OpenClaw 会直接安装目录条目。若要安装同名的 npm 包，请使用显式的作用域 spec（例如 `@scope/diffs`）。

  </Accordion>
  <Accordion title="Git 仓库">
    使用 `git:<repo>` 直接从 git 仓库安装。支持的形式包括 `git:github.com/owner/repo`、`git:owner/repo`、完整的 `https://`、`ssh://`、`git://`、`file://`，以及 `git@host:owner/repo.git` 克隆 URL。安装前可添加 `@<ref>` 或 `#<ref>` 来检出分支、标签或提交。

    Git 安装会先克隆到临时目录，在存在 ref 时检出所请求的 ref，然后使用常规插件目录安装器。这意味着 manifest 验证、危险代码扫描、包管理器安装工作以及安装记录都表现得像 npm 安装。记录的 git 安装会包含源 URL/ref 以及解析后的提交，以便 `openclaw plugins update` 之后可以重新解析来源。

    从 git 安装后，请使用 `openclaw plugins inspect <id> --runtime --json` 验证运行时注册，例如 gateway 方法和 CLI 命令。如果插件使用 `api.registerCli` 注册了 CLI 根命令，请通过 OpenClaw 根 CLI 直接执行该命令，例如 `openclaw demo-plugin ping`。

  </Accordion>
  <Accordion title="压缩包">
    支持的压缩包：`.zip`、`.tgz`、`.tar.gz`、`.tar`。原生 OpenClaw 插件压缩包必须在解压后的插件根目录中包含有效的 `openclaw.plugin.json`；仅包含 `package.json` 的压缩包会在 OpenClaw 写入安装记录之前被拒绝。

    当文件是 npm-pack tarball 且你想测试与 registry 安装使用的同一受管理 npm 根安装路径时，请使用 `npm-pack:<path.tgz>`，包括 `package-lock.json` 验证、hoisted 依赖扫描和 npm install 记录。普通归档路径仍然会作为本地归档安装到插件扩展根目录下。

    也支持 Claude marketplace 安装。

  </Accordion>
</AccordionGroup>

ClawHub 安装使用显式的 `clawhub:<package>` 定位符：

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

裸的 npm 安全插件 spec 会在启动切换期间默认从 npm 安装：

```bash
openclaw plugins install openclaw-codex-app-server
```

使用 `npm:` 可显式指定仅从 npm 解析：

```bash
openclaw plugins install npm:openclaw-codex-app-server
openclaw plugins install npm:@scope/plugin-name@1.0.1
```

OpenClaw 在安装前会检查声明的插件 API / 最低 gateway 兼容性。当所选 ClawHub 版本发布了 ClawPack 产物时，OpenClaw 会下载带版本的 npm-pack `.tgz`，验证 ClawHub digest 头和产物 digest，然后通过常规归档路径安装它。没有 ClawPack 元数据的旧版 ClawHub 版本仍然会通过传统的包归档验证路径安装。已记录的安装会保留其 ClawHub 源元数据、产物类型、npm integrity、npm shasum、tarball 名称和 ClawPack digest 事实，以便后续更新使用。
未版本化的 ClawHub 安装会保留未版本化的已记录 spec，因此 `openclaw plugins update` 可以跟随较新的 ClawHub 发布；显式版本或标签选择器，例如 `clawhub:pkg@1.2.3` 和 `clawhub:pkg@beta`，仍会固定在该选择器上。

#### Marketplace 简写

当 marketplace 名称存在于 Claude 的本地 registry 缓存 `~/.claude/plugins/known_marketplaces.json` 中时，可使用 `plugin@marketplace` 简写：

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

当你想显式传入 marketplace 源时，请使用 `--marketplace`：

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

<Tabs>
  <Tab title="Marketplace 源">
    - 来自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知 marketplace 名称
    - 本地 marketplace 根目录或 `marketplace.json` 路径
    - GitHub 仓库简写，例如 `owner/repo`
    - GitHub 仓库 URL，例如 `https://github.com/owner/repo`
    - git URL

  </Tab>
  <Tab title="远程 marketplace 规则">
    对于从 GitHub 或 git 加载的远程 marketplace，插件条目必须保留在克隆的 marketplace 仓库内部。OpenClaw 接受该仓库中的相对路径源，并会拒绝来自远程 manifest 的 HTTP(S)、绝对路径、git、GitHub 以及其他非路径插件源。
  </Tab>
</Tabs>

对于本地路径和压缩包，OpenClaw 会自动检测：

- 原生 OpenClaw 插件（`openclaw.plugin.json`）
- 兼容 Codex 的捆绑包（`.codex-plugin/plugin.json`）
- 兼容 Claude 的捆绑包（`.claude-plugin/plugin.json` 或默认 Claude component 布局）
- 兼容 Cursor 的捆绑包（`.cursor-plugin/plugin.json`）

<Note>
兼容捆绑包会安装到常规插件根目录，并参与相同的 list/info/enable/disable 流程。当前支持 bundle skills、Claude 命令技能、Claude `settings.json` 默认项、Claude `.lsp.json` / manifest 声明的 `lspServers` 默认项、Cursor 命令技能，以及兼容的 Codex hook 目录；其他已检测到的 bundle 能力会在诊断/info 中显示，但尚未接入运行时执行。
</Note>

### 列表

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
openclaw plugins search <query>
openclaw plugins search <query> --limit 20
openclaw plugins search <query> --json
```

<ParamField path="--enabled" type="boolean">
  仅显示已启用的插件。
</ParamField>
<ParamField path="--verbose" type="boolean">
  从表格视图切换为每个插件的详细行，显示 source/origin/version/activation 元数据。
</ParamField>
<ParamField path="--json" type="boolean">
  机器可读的清单，加上 registry 诊断和包依赖安装状态。
</ParamField>

<Note>
`plugins list` 会先读取持久化的本地插件 registry；如果 registry 缺失或无效，则回退为仅基于 manifest 的派生结果。它适用于检查插件是否已安装、是否已启用，以及是否对冷启动规划可见，但它并不是对已经运行中的 Gateway 进程的实时探测。更改插件代码、启用状态、hook 策略或 `plugins.load.paths` 之后，在期望新的 `register(api)` 代码或 hooks 运行之前，请重启提供该通道的 Gateway。对于远程/容器部署，请确认你重启的是实际的 `openclaw gateway run` 子进程，而不只是包装进程。

`plugins list --json` 会包含每个插件从 `package.json`
`dependencies` 和 `optionalDependencies` 读取的 `dependencyStatus`。OpenClaw 会检查这些包名是否存在于插件常规的 Node `node_modules` 查找路径中；它不会导入插件运行时代码、运行包管理器，或修复缺失的依赖。
</Note>

`plugins search` 是对远程 ClawHub 目录的查询。它不会检查本地
状态、修改配置、安装包或加载插件运行时代码。搜索结果包括
ClawHub 包名、family、channel、version、summary，以及类似 `openclaw plugins install clawhub:<package>` 的安装提示。

对于已打包 Docker 镜像中的捆绑插件工作，请将插件
源码目录 bind-mount 到对应的打包源码路径上，例如
`/app/extensions/synology-chat`。OpenClaw 会在
`/app/dist/extensions/synology-chat` 之前发现该已挂载的源码覆盖层；单纯复制的源码
目录仍然不会生效，因此常规打包安装仍会使用已编译的 dist。

用于运行时 hook 调试：

- `openclaw plugins inspect <id> --runtime --json` 显示来自模块加载检查的已注册 hooks 和诊断信息。运行时检查绝不会安装依赖；请使用 `openclaw doctor --fix` 清理旧的依赖状态，或恢复配置中引用的缺失可下载插件。
- `openclaw gateway status --deep --require-rpc` 确认可达的 Gateway URL/profile、服务/进程提示、配置路径和 RPC 健康状态。
- 非捆绑的 conversation hooks（`llm_input`、`llm_output`、`before_model_resolve`、`before_agent_reply`、`before_agent_run`、`before_agent_finalize`、`agent_end`）需要 `plugins.entries.<id>.hooks.allowConversationAccess=true`。

使用 `--link` 可避免复制本地目录（会添加到 `plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

<Note>
`--force` 不能与 `--link` 同用，因为链接安装会复用源路径，而不是覆盖到一个受管理的安装目标上。

在 npm 安装上使用 `--pin` 会将解析得到的精确 spec（`name@version`）保存到受管理的插件索引中，同时保留默认的不锁定行为。
</Note>

### 插件索引

插件安装元数据是机器管理的状态，不是用户配置。安装和更新会将其写入活动 OpenClaw 状态目录下的 `plugins/installs.json`。其顶层的 `installRecords` map 是安装元数据的持久来源，包括损坏或缺失插件 manifest 的记录。`plugins` 数组是基于 manifest 派生的冷 registry 缓存。该文件包含“请勿编辑”警告，并被 `openclaw plugins update`、uninstall、diagnostics 以及冷插件 registry 使用。

当 OpenClaw 看到配置中附带的旧版 `plugins.installs` 记录时，运行时读取会将其视为兼容性输入，而不会重写 `openclaw.json`。显式的插件写入和 `openclaw doctor --fix` 会在允许配置写入时把这些记录移到插件索引中并移除该配置键；如果任一写入失败，则会保留配置中的记录，以免丢失安装元数据。

### 卸载

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 会从 `plugins.entries`、持久化的插件索引、插件 allow/deny 列表条目，以及相关联的 `plugins.load.paths` 条目中移除插件记录。除非设置了 `--keep-files`，否则如果已跟踪的受管理安装目录位于 OpenClaw 的插件扩展根目录内，卸载还会删除该目录。对于活动的 memory 插件，memory 槽位会重置为 `memory-core`。

<Note>
`--keep-config` 作为已弃用的 `--keep-files` 别名仍受支持。
</Note>

### 更新

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call
openclaw plugins update openclaw-codex-app-server --dangerously-force-unsafe-install
```

更新会应用到受管理插件索引中已跟踪的插件安装，以及 `hooks.internal.installs` 中已跟踪的 hook 包安装。

<AccordionGroup>
  <Accordion title="解析 plugin id 与 npm spec 的区别">
    当你传入插件 id 时，OpenClaw 会复用该插件记录中的安装 spec。这意味着之前存储的 dist-tag（如 `@beta`）和精确锁定版本会继续在后续的 `update <id>` 运行中使用。

    对于 npm 安装，你也可以传入带 dist-tag 或精确版本的显式 npm 包 spec。OpenClaw 会把该包名解析回已跟踪的插件记录，更新该已安装插件，并记录新的 npm spec 以供未来基于 id 的更新使用。

    只传入不带版本或标签的 npm 包名也会解析回已跟踪的插件记录。当某个插件曾被锁定到精确版本，而你想把它切回 registry 的默认发布线时，可以使用这种方式。

  </Accordion>
  <Accordion title="Beta channel updates">
    `openclaw plugins update` 会重用已跟踪的插件 spec，除非你传入新的 spec。`openclaw update` 还知道当前活动的 OpenClaw 更新通道：在 beta 通道上，默认线路的 npm 和 ClawHub 插件记录会先尝试 `@beta`。如果没有插件 beta 发布，它们会回退到记录的默认/latest spec；当 beta 包存在但安装验证失败时，npm 插件也会回退。该回退会以警告形式报告，并不会导致核心更新失败。精确版本和显式标签会继续固定在该选择器上。
  </Accordion>
  <Accordion title="版本检查与完整性漂移">
    在进行实时 npm 更新之前，OpenClaw 会将已安装包版本与 npm registry 元数据进行检查。如果已安装版本与记录的产物标识已经匹配解析目标，则会跳过更新，不会下载、重新安装或重写 `openclaw.json`。

    当存储的完整性哈希存在且获取到的产物哈希发生变化时，OpenClaw 会将其视为 npm 产物漂移。交互式的 `openclaw plugins update` 命令会打印预期和实际哈希，并在继续之前要求确认。非交互式更新助手会失败关闭，除非调用方提供明确的继续策略。

  </Accordion>
  <Accordion title="更新时的 --dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` 也可用于 `plugins update`，作为插件更新期间内置危险代码扫描误报的破窗覆盖。它仍然不会绕过插件 `before_install` 策略阻断或扫描失败阻断，并且它只适用于插件更新，不适用于 hook 包更新。
  </Accordion>
</AccordionGroup>

### 检查

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --runtime
openclaw plugins inspect <id> --json
```

Inspect 会在默认不导入插件运行时的情况下，显示身份、加载状态、来源、清单能力、策略标志、诊断信息、安装元数据、捆绑包能力，以及任何检测到的 MCP 或 LSP 服务器支持。添加 `--runtime` 可加载插件模块并包含已注册的 hooks、工具、命令、服务、gateway 方法和 HTTP 路由。运行时检查会直接报告缺失的插件依赖；安装和修复仍在 `openclaw plugins install`、`openclaw plugins update` 和 `openclaw doctor --fix` 中进行。

插件拥有的 CLI 命令通常会作为根级 `openclaw` 命令组安装，但插件也可以在某个核心父命令下注册嵌套命令，例如 `openclaw nodes`。当 `inspect --runtime` 在 `cliCommands` 下显示某个命令时，请按照列出的路径直接运行它；例如，注册了 `demo-git` 的插件可以用 `openclaw demo-git ping` 验证。

每个插件都会根据其在运行时实际注册的内容进行分类：

- **plain-capability** — 一种能力类型（例如仅提供者插件）
- **hybrid-capability** — 多种能力类型（例如文本 + 语音 + 图像）
- **hook-only** — 只有 hooks，没有能力或 surface
- **non-capability** — 有工具/命令/服务，但没有能力

更多信息请参见 [插件形态](/plugins/architecture#plugin-shapes) 中的能力模型。

<Note>
`--json` 标志会输出适合脚本处理和审计的机器可读报告。`inspect --all` 会渲染全量表格，包含形态、能力类型、兼容性提示、bundle 能力和 hook 摘要列。`info` 是 `inspect` 的别名。
</Note>

### Doctor

```bash
openclaw plugins doctor
```

`doctor` 会报告插件加载错误、清单/发现诊断、兼容性提示，以及过期的插件配置引用，例如缺失的插件槽位。当安装树和插件配置都干净时，它会打印 `No plugin issues detected.`。如果仍存在过期配置，但安装树其他方面是健康的，总结会如实说明，而不是暗示插件完全健康。

如果某个已配置插件存在于磁盘上，但被加载器的路径安全检查阻止，配置验证会保留该插件条目并将其报告为 `present but blocked`。请修复前面的被阻止插件诊断，例如路径所有权或 world-writable 权限，而不是移除 `plugins.entries.<id>` 或 `plugins.allow` 配置。

对于诸如缺少 `register`/`activate` 导出的模块形状故障，请使用 `OPENCLAW_PLUGIN_LOAD_DEBUG=1` 重新运行，以便在诊断输出中包含一个简洁的导出形状摘要。

### Registry

```bash
openclaw plugins registry
openclaw plugins registry --refresh
openclaw plugins registry --json
```

本地插件 registry 是 OpenClaw 为已安装插件的身份、启用状态、源元数据和贡献所有权维护的持久冷读取模型。常规启动、提供者 owner 查找、通道设置分类以及插件清单都可以在不导入插件运行时模块的情况下读取它。

使用 `plugins registry` 来检查持久化 registry 是否存在、是否最新或是否过期。使用 `--refresh` 可根据持久化插件索引、配置策略以及 manifest/package 元数据重建它。这是一条修复路径，不是运行时激活路径。

`openclaw doctor --fix` 还会修复 registry 附近已管理的 npm 漂移：如果受管理插件 npm 根目录下某个孤立或恢复的 `@openclaw/*` 包遮蔽了一个捆绑插件，doctor 会移除那个过期包并重建 registry，从而使启动时针对捆绑 manifest 的验证能够通过。Doctor 还会把宿主 `openclaw` 包重新链接到声明了 `peerDependencies.openclaw` 的受管理 npm 插件中，以便更新或 npm 修复后，诸如 `openclaw/plugin-sdk/*` 之类的包内运行时导入能够正常解析。

<Warning>
`OPENCLAW_DISABLE_PERSISTED_PLUGIN_REGISTRY=1` 是一个已弃用的、用于 registry 读取失败的“破窗”兼容开关。请优先使用 `plugins registry --refresh` 或 `openclaw doctor --fix`；环境变量回退只用于迁移过程中的紧急启动恢复。
</Warning>

### Marketplace

```bash
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json
```

Marketplace list 接受本地 marketplace 路径、`marketplace.json` 路径、类似 `owner/repo` 的 GitHub 简写、GitHub 仓库 URL 或 git URL。`--json` 会输出解析后的源标签以及已解析的 marketplace manifest 和插件条目。

## 相关内容

- [构建插件](/plugins/building-plugins)
- [CLI 参考](/cli)
- [ClawHub](/clawhub)
