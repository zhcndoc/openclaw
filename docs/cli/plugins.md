---
summary: "CLI 参考，适用于 `openclaw plugins`（init、build、validate、list、install、marketplace、uninstall、enable/disable、doctor）"
read_when:
  - 你想安装或管理网关插件或兼容捆绑包
  - 你想为简单的工具插件搭建脚手架或验证
  - 你想调试插件加载失败问题
title: "插件"
sidebarTitle: "插件"
---

管理网关插件、钩子包和兼容捆绑包。

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
    清单字段和配置模式。
  </Card>
  <Card title="安全" href="/gateway/security">
    为插件安装提供安全加固。
  </Card>
</CardGroup>

## 命令

```bash
openclaw plugins list [--enabled] [--verbose] [--json]
openclaw plugins search <query> [--limit <n>] [--json]
openclaw plugins install <path-or-spec> [--link] [--force] [--pin] [--marketplace <source>]
openclaw plugins inspect <id> [--runtime] [--json]
openclaw plugins inspect --all [--runtime] [--json]
openclaw plugins info <id>                    # inspect 的别名
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins uninstall <id> [--dry-run] [--keep-files] [--force]
openclaw plugins update <id-or-npm-spec> | --all [--dry-run]
openclaw plugins registry [--refresh] [--json]
openclaw plugins doctor [--json]
openclaw plugins init <id> [--name <name>] [--type tool|provider] [--directory <path>]
openclaw plugins build [--entry <path>] [--check]
openclaw plugins validate [--entry <path>] [--json]
openclaw plugins marketplace entries [--offline] [--feed-profile <name>] [--json]
openclaw plugins marketplace list <source> [--json]
openclaw plugins marketplace refresh [--feed-profile <name>] [--expected-sha256 <sha256>] [--json]
```

对于缓慢的安装、检查、卸载或 registry-refresh 排查，请使用
`OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1` 运行命令。该跟踪会将各阶段耗时写入 stderr，并保持 JSON 输出可解析。参见 [调试](/help/debugging#plugin-lifecycle-trace)。

<Note>
在 Nix 模式（`OPENCLAW_NIX_MODE=1`）下，`openclaw.json` 是不可变的。`install`、`update`、`uninstall`、`enable` 和 `disable` 都会拒绝运行。请改为编辑此安装的 Nix 源（对于 nix-openclaw，则是 `programs.openclaw.config` 或 `instances.<name>.config`），然后重新构建。请参阅 agent-first 的 [快速开始](https://github.com/openclaw/nix-openclaw#quick-start)。
</Note>

<Note>
捆绑插件随 OpenClaw 一起发布。其中一些默认启用（例如捆绑的模型提供者、捆绑的语音提供者以及捆绑的浏览器插件）；其他的则需要 `plugins enable`。

原生 OpenClaw 插件会随 `openclaw.plugin.json` 一起提供，并内嵌 JSON Schema（`configSchema`，即使为空也是如此）。兼容的捆绑包则使用各自的 bundle manifest。

`plugins list` 显示 `Format: openclaw` 或 `Format: bundle`。详细列表/信息输出还会显示捆绑包子类型（`agent (Agent Plugins)`、`codex`、`claude` 或 `cursor`）以及检测到的捆绑包功能。
</Note>

## 作者

```bash
openclaw plugins init stock-quotes --name "股票报价"
cd stock-quotes
npm run plugin:build
npm run plugin:validate
```

`plugins init` 默认会创建一个最小的 TypeScript 工具插件。第一个
参数是插件 id；`--name` 设置显示名称。OpenClaw 使用该
id 作为默认输出目录和包命名。工具脚手架使用
`defineToolPlugin`，并生成 `package.json` 脚本 `plugin:build` 和
`plugin:validate`，前者先构建，然后调用 `openclaw plugins build`/`validate`。

`plugins build` 会导入构建后的入口，读取其静态工具元数据，写入
`openclaw.plugin.json`，并保持 `package.json` 的
`openclaw.extensions` 同步。`plugins validate` 会检查生成的清单、包元数据和
当前入口导出是否仍然一致。传入 `--json` 可获取机器可读的验证结果。完整的编写流程请参阅[工具插件](/plugins/tool-plugins)。

脚手架会写入 TypeScript 源码，但会从构建后的
`./dist/index.js` 入口生成元数据，因此该流程也适用于已发布的 CLI。当前入口不是默认包入口时，请使用
`--entry <path>`。在 CI 中使用 `plugins build --check`，即可在生成元数据过期但未重写文件时使构建失败。

### 提供方脚手架

```bash
openclaw plugins init acme-models --name "Acme Models" --type provider
cd acme-models
npm install
npm run build
npm test
npm run validate
```

提供方脚手架会创建一个通用的、兼容 OpenAI 的模型提供方插件，
包含 API 密钥认证相关配置、一个运行
`clawhub package validate` 的 `npm run validate` 脚本、ClawHub 包元数据，以及一个手动
触发的 GitHub Actions 工作流，用于未来通过 GitHub
OIDC 进行受信任发布。提供方脚手架不会生成技能，也不会使用
`openclaw plugins build`/`validate`；这些命令用于工具
脚手架的生成元数据流程。

发布前，请将占位的 API 基础 URL、模型目录、文档
路由、凭证文本和 README 文案替换为真实的提供方信息。首次 ClawHub 发布和受信任发布者设置时，请使用
生成的 README。

## 安装

```bash
openclaw plugins search "calendar"                      # 搜索 ClawHub 插件
openclaw plugins install @openclaw/<package>            # 受信任的官方目录
openclaw plugins install <package>                       # 任意 npm 包
openclaw plugins install clawhub:<package>               # 仅限 ClawHub
openclaw plugins install npm:<package>                   # 仅限 npm
openclaw plugins install npm-pack:<path.tgz>             # 本地 npm-pack tarball
openclaw plugins install git:github.com/<owner>/<repo>   # git 仓库
openclaw plugins install git:github.com/<owner>/<repo>@<ref>
openclaw plugins install <path>                          # 本地路径或归档
openclaw plugins install -l <path>                       # 使用链接而不是复制
openclaw plugins install <plugin>@<marketplace>          # 市场简写
openclaw plugins install <plugin> --marketplace <name>   # 市场（显式）
openclaw plugins install <package> --force               # 确认来源 / 覆盖现有项
openclaw plugins install <package> --pin                  # 固定解析到的 npm 版本
openclaw plugins install clawhub:<package> --acknowledge-clawhub-risk
openclaw plugins install <package> --dangerously-force-unsafe-install
```

维护者测试设置时的安装可以通过受保护的环境变量覆盖自动插件安装
来源。请参见
[插件安装覆盖](/plugins/install-overrides)。

<Warning>
在发布切换期间，裸包名默认从 npm 安装，除非它们匹配捆绑或官方插件 id；在这种情况下，OpenClaw 会使用本地/官方副本，而不是访问 npm registry。若你明确想要外部 npm 包，请使用 `npm:<package>`。ClawHub 请使用 `clawhub:<package>`。请把插件安装视为运行代码；优先使用固定版本。
</Warning>

<Warning>
ClawHub 包和 OpenClaw 捆绑/官方目录是受信任的安装
来源。新的任意 npm、`npm-pack:`、git、本地路径/归档，或
市场来源会在继续前发出警告并要求确认。非交互式任意
安装必须在你审查并信任来源后传入 `--force`。同样的
标志在需要时会覆盖现有安装目标。对
已跟踪安装的正常更新不需要它。此确认与
`--acknowledge-clawhub-risk` 是分开的，后者只适用于有风险的 ClawHub 发布信任
警告。`--force` 不会绕过 `security.installPolicy` 或其余
安装安全检查。
</Warning>

`plugins search` 会查询 ClawHub 中可安装的 `code-plugin` 和
`bundle-plugin` 包（不包括技能；这些请使用 `openclaw skills search`）。
默认 `--limit` 为 20，上限为 100。它只读取远程目录：不会进行
本地状态检查、配置修改、包安装或插件运行时
加载。结果包含 ClawHub 包名、family、channel、版本、
摘要，以及诸如 `openclaw plugins install clawhub:<package>` 的安装提示。

<Note>
ClawHub 是大多数插件的主要分发和发现入口。Npm
仍然是受支持的后备和直接安装路径。OpenClaw 自有的
`@openclaw/*` 插件包已重新发布到 npm；请参见
[npmjs.com/org/openclaw](https://www.npmjs.com/org/openclaw) 上的当前列表，或
[插件清单](/plugins/plugin-inventory)。稳定版安装使用 `latest`。
Beta 通道安装和更新在可用时优先使用 npm 的 `beta` dist-tag，
否则回退到 `latest`。在 extended-stable 通道上，带裸/默认或 `latest` 意图的官方 npm 插件会解析为精确的已安装核心
版本。精确固定和显式非 `latest` 标签、第三方包，以及
非 npm 来源都不会被重写。
</Note>

<AccordionGroup>
  <Accordion title="配置包含项和无效配置修复">
    如果你的 `plugins` 部分由单文件 `$include` 支持，`plugins install/update/enable/disable/uninstall` 会写回到那个被包含的文件，而保持 `openclaw.json` 不变。根级 includes、include 数组以及带有同级覆盖的 includes 会直接失败，而不是被扁平化。支持的形状请参见 [配置包含项](/gateway/configuration)。

    如果安装前配置无效，`plugins install` 通常会失败并提示你先运行 `openclaw doctor --fix`。在 Gateway 启动和热重载期间，无效的插件配置会像其他无效配置一样失败；`openclaw doctor --fix` 可以隔离无效的插件条目。唯一的既有配置例外是一条狭窄的捆绑插件恢复路径，适用于明确选择加入 `openclaw.install.allowInvalidConfigRecovery` 的插件。

    当现有宿主配置有效，但新安装插件自身的配置缺失时，OpenClaw 会将该安装记录为禁用，而不是写入一个无效的启用条目。请先配置 `plugins.entries.<id>.config`，然后运行 `openclaw plugins enable <id>`。如果已存在的插件配置条目有效但无效，安装会失败且不会重写它。

  </Accordion>
  <Accordion title="--force 确认以及重新安装与更新">
    `--force` 会在不提示的情况下确认非 ClawHub 来源。它不会绕过 `security.installPolicy` 或剩余的安装安全检查。当插件或 hook pack 已经安装时，它还会复用现有目标并就地覆盖。请在审查任意 npm、本地、归档、git 或市场来源后使用它，或者在有意从不同来源重新安装相同 id 时使用它。对于已跟踪的 npm 插件的常规升级，请优先使用 `openclaw plugins update <id-or-npm-spec>`。

    如果你对一个已安装的插件 id 运行 `plugins install`，OpenClaw 会停止并引导你使用 `plugins update <id-or-npm-spec>` 进行正常升级，或者在你确实想要从不同来源覆盖当前安装时使用 `openclaw plugins install <package> --force`。任意来源仍会显示交互式来源警告；非交互式安装必须在审查后传入 `--force`。受信任的 ClawHub 和 OpenClaw 目录来源不需要它。使用 `--link` 时，`--force` 只确认来源，但不会改变链接路径的安装模式。

  </Accordion>
  <Accordion title="--pin 作用范围">
    `--pin` 只适用于 npm 安装，并记录解析后的精确 `<name>@<version>`。它不支持 `git:` 安装（请在 spec 中固定 ref，例如 `git:github.com/acme/plugin@v1.2.3`），也不支持 `--marketplace`（市场安装会保留市场源元数据，而不是 npm spec）。
  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` 已弃用，现在不再起作用。OpenClaw 不再对插件安装运行内置的危险代码拦截。

    当需要主机特定的安装策略时，请使用由操作员拥有的 `security.installPolicy` 入口。插件的 `before_install` hooks 是插件运行时生命周期钩子，而不是 CLI 安装的主要策略边界。

    如果你发布到 ClawHub 的插件被 registry 扫描隐藏或阻止，请使用 [ClawHub 发布](/clawhub/publishing) 中的发布者步骤。`--dangerously-force-unsafe-install` 不会要求 ClawHub 重新扫描插件，也不会将被阻止的发布公开。

  </Accordion>
  <Accordion title="--acknowledge-clawhub-risk">
    社区 ClawHub 安装在下载前会检查所选发布的信任记录。如果 ClawHub 为该发布禁用了下载、报告了恶意扫描结果，或者将该发布置于阻止性的审核状态（quarantined、revoked），无论此标志如何，OpenClaw 都会直接拒绝。对于非阻止性的高风险扫描状态或审核状态，OpenClaw 会显示信任详情，并在继续前要求确认。

    只有在查看 ClawHub 警告并决定在没有交互提示的情况下继续时，才使用 `--acknowledge-clawhub-risk`。待处理或过期的（尚未清理的）扫描结果会发出警告，但不要求确认。官方 ClawHub 包和捆绑的 OpenClaw 插件来源会完全绕过此发布信任检查。

  </Accordion>
  <Accordion title="Hook 包和 npm spec">
    `plugins install` 也是安装暴露 `package.json` 中 `openclaw.hooks` 的 Hook 包的入口。请使用 `openclaw hooks` 进行过滤后的 Hook 可见性和逐个 Hook 启用，而不是进行包安装。

    Npm spec **仅限 registry**（包名加上可选的 **精确版本** 或 **dist-tag**）。Git/URL/file spec 和 semver 范围都会被拒绝。依赖安装会在每个插件的单独受管 npm 项目中运行，并使用 `--ignore-scripts` 以确保安全，即使你的 shell 配置了全局 npm 安装选项也是如此。受管插件 npm 项目会继承 OpenClaw 的包级 npm `overrides`，因此宿主安全固定也会应用于提升后的插件依赖。

    使用 `npm:<package>` 可以明确指定 npm 解析。裸 spec 在发布切换期间也会直接从 npm 安装，除非它们匹配官方插件 id。

    与捆绑插件匹配的原始 `@openclaw/*` spec 会优先解析为镜像拥有的捆绑副本，然后才回退到 npm。例如，`openclaw plugins install @openclaw/discord@2026.5.20 --pin` 会使用当前 OpenClaw 构建中的捆绑 Discord 插件，而不是创建一个受管 npm 覆盖。若要强制使用外部 npm 包，请使用 `openclaw plugins install npm:@openclaw/discord@2026.5.20 --pin`。

    裸 spec 和 `@latest` 会保持在稳定通道。OpenClaw 这样的带日期修正版本如 `2026.5.3-1` 在此检查中也算作稳定版。如果 npm 将任一形式解析为预发布版本，OpenClaw 会停止并要求你通过预发布标签（`@beta`/`@rc`）或精确预发布版本（`@1.2.3-beta.4`）显式选择加入。

    对于没有精确版本的 npm 安装（`npm:<package>` 或 `npm:<package>@latest`），OpenClaw 会在安装前检查解析到的包元数据。如果最新稳定包需要更新的 OpenClaw 插件 API 或最低宿主版本，OpenClaw 会检查更旧的稳定版本，并安装最新的兼容发布。精确版本和显式 dist-tag 仍然严格：不兼容的选择会失败，并要求你升级 OpenClaw 或选择兼容版本。

    如果裸安装 spec 匹配官方插件 id（例如 `diffs`），OpenClaw 会直接安装目录条目。若要安装同名 npm 包，请使用显式的作用域 spec（例如 `@scope/diffs`）。

  </Accordion>
  <Accordion title="Git 仓库">
    使用 `git:<repo>` 可以直接从 git 仓库安装。支持的形式包括：`git:github.com/owner/repo`、`git:owner/repo`、完整的 `https://`、`ssh://`、`git://`、`file://`，以及 `git@host:owner/repo.git` 克隆 URL。在安装前可添加 `@<ref>` 或 `#<ref>` 以检出分支、标签或提交。

    Git 安装会先克隆到临时目录，在存在请求的 ref 时检出它，然后使用常规插件目录安装器，因此 manifest 验证、operator 安装策略、包管理器安装工作以及安装记录的行为都与 npm 安装相同。已记录的 git 安装会包含源 URL/ref 以及解析出的 commit，以便 `openclaw plugins update` 之后再次解析该来源。

    从 git 安装后，可使用 `openclaw plugins inspect <id> --runtime --json` 来验证运行时注册，例如 gateway 方法和 CLI 命令。如果插件通过 `api.registerCli` 注册了 CLI 根命令，请直接通过 OpenClaw 根 CLI 运行该命令，例如 `openclaw demo-plugin ping`。

  </Accordion>
  <Accordion title="归档">
    支持的压缩包：`.zip`、`.tgz`、`.tar.gz`、`.tar`。原生 OpenClaw 插件压缩包必须在解压后的插件根目录中包含有效的 `openclaw.plugin.json`；仅包含 `package.json` 的压缩包会在 OpenClaw 写入安装记录之前被拒绝。

    当文件是 npm-pack tarball，并且你希望使用与 registry 安装相同的、按插件划分的受管 npm 项目路径时，请使用 `npm-pack:<path.tgz>`，这包括 `package-lock.json` 验证、提升后的依赖扫描和 npm 安装记录。普通归档路径仍会作为本地归档安装到插件扩展根目录下。

    也支持 Claude 市场安装。

  </Accordion>
</AccordionGroup>

ClawHub 安装使用显式的 `clawhub:<package>` 定位符：

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

裸的 npm-safe 插件 spec 在启动切换期间默认从 npm 安装，除非它们匹配官方插件 id：

```bash
openclaw plugins install openclaw-codex-app-server
```

使用 `npm:` 可显式指定仅从 npm 解析：

```bash
openclaw plugins install npm:openclaw-codex-app-server
openclaw plugins install npm:@openclaw/discord@2026.5.20
openclaw plugins install npm:@scope/plugin-name@1.0.1
```

OpenClaw 在安装前会检查声明的插件 API / 最低 gateway 兼容性。当所选 ClawHub 版本发布了 ClawPack 产物时，OpenClaw 会下载带版本的 npm-pack `.tgz`，验证 ClawHub digest 头和产物 digest，然后通过常规归档路径安装它。没有 ClawPack 元数据的旧版 ClawHub 版本仍然会通过传统的包归档验证路径安装。已记录的安装会保留其 ClawHub 源元数据、产物类型、npm integrity、npm shasum、tarball 名称和 ClawPack digest 事实，以便后续更新使用。
未版本化的 ClawHub 安装会保留未版本化的已记录 spec，因此 `openclaw plugins update` 可以跟随较新的 ClawHub 发布；显式版本或标签选择器，例如 `clawhub:pkg@1.2.3` 和 `clawhub:pkg@beta`，仍会固定在该选择器上。

### Marketplace 缩写

当 marketplace 名称存在于 Claude 的本地 registry 缓存 `~/.claude/plugins/known_marketplaces.json` 中时，可使用 `plugin@marketplace` 缩写：

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
  <Tab title="Marketplace 来源">
    - 来自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知 marketplace 名称
    - 本地 marketplace 根目录或 `marketplace.json` 路径
    - GitHub 仓库简写，例如 `owner/repo`
    - GitHub 仓库 URL，例如 `https://github.com/owner/repo`
    - git URL

  </Tab>
  <Tab title="远程 marketplace 规则">
    对于从 GitHub 或 git 加载的远程 marketplace，插件条目必须保留在克隆的 marketplace 仓库内部。OpenClaw 接受该仓库中的相对路径来源，并会拒绝来自远程 manifest 的 HTTP(S)、绝对路径、git、GitHub 以及其他非路径插件来源。
  </Tab>
</Tabs>

对于本地路径和压缩包，OpenClaw 会自动检测：

- 原生 OpenClaw 插件（`openclaw.plugin.json`）
- Agent Plugins bundle（根目录中的 `plugin.json` 声明了 [Agent Plugins](https://agent-plugins.org) `$schema`）
- 兼容 Codex 的 bundle（`.codex-plugin/plugin.json`）
- 兼容 Claude 的 bundle（`.claude-plugin/plugin.json`，或者该 manifest 文件缺失时使用默认的 Claude 组件布局）
- 兼容 Cursor 的 bundle（`.cursor-plugin/plugin.json`）

受管本地安装必须是插件目录或归档。独立的 `.js`、  
`.mjs`、`.cjs` 和 `.ts` 插件文件不会被 `plugins install` 复制到受管插件  
根目录中，也不会通过直接放入  
`~/.openclaw/extensions` 或 `<workspace>/.openclaw/extensions` 而加载；这些  
自动发现的根目录会加载插件包或 bundle 目录，并将顶层脚本文件跳过，视为本地辅助文件。请改为在  
`plugins.load.paths` 中显式列出独立文件。

<Note>
兼容的 bundle 会安装到正常的插件根目录中，并参与相同的列表/信息查看/启用/禁用流程。目前支持 bundle skills、bundle MCP 服务器、Agent Plugins skills/MCP（采用 `PLUGIN_ROOT`/`PLUGIN_DATA` 子进程契约）、Claude command-skills、Claude `settings.json` 默认值、Claude `.lsp.json` / manifest 声明的 `lspServers` 默认值、Cursor command-skills，以及兼容的 Codex hook 目录；检测到的其他 bundle 功能会显示在诊断信息/插件信息中，但尚未接入运行时执行。有关各格式的映射，请参见[插件 bundle](/plugins/bundles)。
</Note>

使用 `-l`/`--link` 可指向本地插件目录而不复制它（会添加到  
`plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

`--link` 不支持与 `--marketplace` 或 `git:` 安装一起使用，并且  
它要求一个已存在的本地路径。对于非交互式本地链接，请在查看来源后使用 `--force`；  
它会确认来源，但不会复制或覆盖已链接的目录。

<Note>
从 workspace extensions 根目录发现的 workspace-origin 插件，在显式启用之前不会被导入或执行。对于本地开发，请运行 `openclaw plugins enable <plugin-id>` 或设置  
`plugins.entries.<plugin-id>.enabled: true`；如果你的配置使用  
`plugins.allow`，也请在其中包含同一个插件 id。这个 fail-closed 规则  
也适用于当 channel setup 显式针对 workspace-origin 插件进行仅设置加载时，因此当该 workspace 插件保持禁用或被排除在 allowlist 之外时，本地 channel 插件设置代码不会运行。链接安装和显式 `plugins.load.paths` 条目会遵循其解析后的插件来源的常规策略。请参见  
[配置插件策略](/tools/plugin#configure-plugin-policy)  
和[配置参考](/gateway/configuration-reference#plugins)。

在 npm 安装上使用 `--pin` 可将解析出的精确 spec（`name@version`）保存到受管插件索引中，同时保持默认行为不固定。
</Note>

## 列表

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
```

<ParamField path="--enabled" type="boolean">
  仅显示已启用的插件。
</ParamField>
<ParamField path="--verbose" type="boolean">
  从表格视图切换为按插件逐行显示详细信息，包含 format/source/origin/version/activation 元数据。
</ParamField>
<ParamField path="--json" type="boolean">
  机器可读的清单，并附带 registry 诊断和包依赖安装状态。
</ParamField>

<Note>
`plugins list` 会先读取持久化的本地插件 registry；如果 registry 缺失或无效，则回退为仅基于 manifest 的派生结果。它适用于检查插件是否已安装、是否已启用，以及是否对冷启动规划可见，但它并不是对已经运行中的 Gateway 进程的实时探测。更改插件代码、启用状态、hook 策略或 `plugins.load.paths` 之后，在期望新的 `register(api)` 代码或 hooks 运行之前，请重启提供该通道的 Gateway。对于远程/容器部署，请确认你重启的是实际的 `openclaw gateway run` 子进程，而不只是包装进程。

`plugins list --json` 会包含每个插件从 `package.json`
`dependencies` 和 `optionalDependencies` 读取的 `dependencyStatus`。OpenClaw 会检查这些包名是否存在于插件常规的 Node `node_modules` 查找路径中；它不会导入插件运行时代码、运行包管理器，或修复缺失的依赖。
</Note>

如果启动日志显示 `plugins.allow is empty; discovered non-bundled plugins may auto-load: ...`，
运行 `openclaw plugins list --enabled --verbose` 或
使用已列出的插件 id 运行 `openclaw plugins inspect <id>`，以确认插件
id，并将受信任的 id 复制到 `openclaw.json` 中的 `plugins.allow`。当
警告能够列出所有已发现的插件时，它会输出一个可直接粘贴的
`plugins.allow` 片段，其中已经包含这些 id。如果某个插件在没有安装/加载路径来源信息的情况下加载，
请检查该插件 id，然后将受信任的 id 固定到 `plugins.allow` 中，或者
从受信任来源重新安装该插件，以便 OpenClaw 记录安装来源。

对于打包在 Docker 镜像内的捆绑插件工作，请将插件
源码目录通过 bind-mount 挂载到匹配的打包源码路径上，例如
`/app/extensions/synology-chat`。OpenClaw 会在 `/app/dist/extensions/synology-chat` 之前发现该挂载的源码覆盖层；直接复制的源码目录
仍然不会生效，因此正常的打包安装仍会使用编译后的 dist。

用于运行时 hook 调试：

- `openclaw plugins inspect <id> --runtime --json` 会显示模块加载检查过程中注册的 hook 和诊断信息。运行时检查绝不会安装依赖；请使用 `openclaw doctor --fix` 清理旧的依赖状态，或恢复配置中引用的缺失可下载插件。
- `openclaw gateway status --deep --require-rpc` 可确认可访问的 Gateway URL/profile、服务/进程提示、配置路径和 RPC 健康状态。
- 如果某个仅包含 hook 的插件未出现在运行时检查中，请确认其[hook 启动意图](/tools/plugin#plugin-hooks)：要么清单中的 `activation.onCapabilities: ["hook"]` 配合显式启用插件，要么使用会发出启动信号的 `plugins.entries.<id>.hooks` 策略，例如 `allowConversationAccess: true`。全局禁用、拒绝规则和限制性 allowlist 仍然优先。
- 非捆绑的会话 hook（`before_model_resolve`、`agent_turn_prepare`、`before_prompt_build`、`before_agent_reply`、`llm_input`、`llm_output`、`before_agent_run`、`before_agent_finalize`、`agent_end`）要求 `plugins.entries.<id>.hooks.allowConversationAccess=true`。

### 插件索引

插件安装元数据是由机器管理的状态，不是用户配置。安装和更新会将其写入当前 OpenClaw 状态目录下共享的 SQLite 状态数据库。`installed_plugin_index` 行存储持久化的 `installRecords` 元数据，包括损坏或缺失插件清单的记录，以及由清单派生的冷 registry 缓存，供 `openclaw plugins update`、卸载、诊断和冷插件 registry 使用。

`plugins.installs` 是一个已废弃的作者配置项。运行时和更新命令只读取 SQLite 已安装插件索引。请运行 `openclaw doctor --fix` 将旧配置记录导入索引，并在正常运行前移除该废弃键。

## 卸载

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
openclaw plugins uninstall <id> --force
```

`uninstall` 会从 `plugins.entries`、持久化插件索引、插件允许/拒绝列表条目，以及任何解析后与记录的安装路径完全一致的 `plugins.load.paths` 条目中移除插件记录。对于链接路径安装，还会移除与其记录的源路径完全一致的条目。父目录、子路径、前缀匹配项和无关的加载路径都会保留。除非设置了 `--keep-files`，否则 `uninstall` 还会移除受跟踪的托管安装目录，但仅当该目录解析后位于 OpenClaw 的插件扩展根目录内时才会执行。如果插件当前占用 `memory` 或 `contextEngine` 槽位，则该槽位会重置为其默认值（`memory` 对应 `memory-core`，上下文引擎对应 `legacy`）。

`uninstall` 会先打印将被移除内容的预览，然后在进行更改前提示 `卸载插件 "<id>"？`。传入 `--force` 可跳过确认提示（适用于脚本和非交互式运行）；不使用该选项时，卸载需要交互式 TTY。`--dry-run` 会打印相同的预览并退出，不会提示或更改任何内容。

<Note>
`--keep-config` 作为已弃用的 `--keep-files` 别名仍受支持。
</Note>

## 更新

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call
openclaw plugins update @acme/demo
openclaw plugins update openclaw-codex-app-server --acknowledge-clawhub-risk
openclaw plugins update openclaw-codex-app-server --dangerously-force-unsafe-install
```

更新会应用于托管插件索引中已跟踪的插件安装，以及共享 SQLite 状态中已跟踪的 hook-pack 安装。它们会复用用户在安装插件时已经选择的源，因此不需要第二次来源确认。

<AccordionGroup>
  <Accordion title="解析 plugin id 与 npm spec 的区别">
    当你传入插件 id 时，OpenClaw 会复用该插件记录中的安装 spec。这意味着之前存储的 dist-tag（如 `@beta`）和精确锁定版本会继续在后续的 `update <id>` 运行中使用。

    唯一的狭义例外是：受信任的官方包正在完成目录声明的插件 id 替换。此更新会从目录中的包选择器开始，因此重命名后的清单可以替换旧版 id。

    在执行 `update <id> --dry-run` 期间，精确锁定的 npm 安装仍会保持锁定。如果 OpenClaw 还可以解析该包的 registry 默认发布线，并且该默认发布线比已安装的锁定版本更新，则试运行会报告当前锁定状态，并打印显式的 `@latest` 包更新命令，以便跟随 registry 默认发布线。

    这种定向更新规则不同于批量 `openclaw plugins update --all` 维护路径。批量更新仍会遵守普通的已跟踪安装 spec，但受信任的官方 OpenClaw 插件记录可以同步到当前官方目录目标，而不是停留在过时的精确官方包上。当你有意想保留精确或带标签的官方 spec 不变时，请使用定向的 `update <id>`。

    对于 npm 安装，你也可以传入带 dist-tag 或精确版本的显式 npm 包 spec。OpenClaw 会将该包名解析回已跟踪的插件记录，更新该已安装插件，并记录新的 npm spec，以便将来基于 id 的更新使用。

    只传入不带版本或标签的 npm 包名也会解析回已跟踪的插件记录。当某个插件曾被锁定到精确版本，而你想把它切回 registry 的默认发布线时，可以使用这种方式。

  </Accordion>
  <Accordion title="Beta 频道更新">
    定向的 `openclaw plugins update <id-or-npm-spec>` 会复用已跟踪的插件 spec，除非你传入新的 spec。对于浮动的受信任官方记录，它会使用规范的 registry 频道解析器来选择安装目标，而不会重写存储的选择器。批量的 `openclaw plugins update --all` 在将受信任的官方插件记录同步到官方目录目标时，也会使用相同的解析器。因此，已安装的 beta 核心在 `update.channel` 未设置时，会继续让官方插件处于 beta 发布线，这与核心更新器保持一致，而不会静默地将它们规范化为 stable/latest。显式选择的 `beta`、`dev` 和 `extended-stable` 仍保留现有的优先级。

    `openclaw update` 也了解当前生效的 OpenClaw 更新频道：在 beta 频道上，默认发布线的 npm 和 ClawHub 插件记录会优先尝试 `@beta`。如果没有插件 beta 版本，则回退到记录的默认/latest spec；对于 npm 插件，如果 beta 包存在但未通过安装验证，也会回退。此回退会作为警告报告，不会导致核心更新失败。对于定向更新，精确版本和显式标签会继续锁定到该选择器，只有在完成上述受信任的插件 id 替换时例外。

  </Accordion>
  <Accordion title="版本检查与完整性漂移">
    在进行实时 npm 更新之前，OpenClaw 会将已安装包版本与 npm registry 元数据进行检查。如果已安装版本与记录的产物标识已经匹配解析目标，则会跳过更新，不会下载、重新安装或重写 `openclaw.json`。

    当存储的完整性哈希存在且获取到的产物哈希发生变化时，OpenClaw 会将其视为 npm 产物漂移。交互式的 `openclaw plugins update` 命令会打印预期和实际哈希，并在继续之前要求确认。非交互式更新助手会失败关闭，除非调用方提供明确的继续策略。

  </Accordion>
  <Accordion title="更新时的 --dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` 在 `plugins update` 上也可接受以保持兼容，但它已弃用，并且不再改变插件更新行为。当插件 hooks 已加载的进程中，操作者的 `security.installPolicy` 仍然可以阻止更新；`before_install` hooks 仅在加载了插件 hooks 的进程中生效。
  </Accordion>
  <Accordion title="更新时的 --acknowledge-clawhub-risk">
    社区 ClawHub 支持的插件更新在下载替换包之前会执行与安装时相同的精确发布信任检查。对于经过审查的自动化流程，如果所选 ClawHub 发布版本带有有风险的信任警告，请使用 `--acknowledge-clawhub-risk` 继续。官方 ClawHub 包和内置的 OpenClaw 插件源会绕过此发布信任提示。
  </Accordion>
</AccordionGroup>

## 检查

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --runtime
openclaw plugins inspect <id> --json
openclaw plugins inspect --all
```

检查会显示身份、加载状态、来源、清单能力、策略标志、诊断信息、安装元数据、捆绑包能力，以及任何检测到的 MCP 或 LSP server 支持，默认不会导入插件运行时。JSON 输出包括插件清单契约，例如 `contracts.agentToolResultMiddleware` 和 `contracts.trustedToolPolicies`，因此操作者可以在启用或重启插件之前审计受信任表面的声明。添加 `--runtime` 可加载插件模块，并包含已注册的 hooks、tools、commands、services、gateway methods 和 HTTP routes。运行时检查会直接报告缺失的插件依赖；安装和修复仍在 `openclaw plugins install`、`openclaw plugins update` 和 `openclaw doctor --fix` 中完成。

插件拥有的 CLI 命令通常会作为根级 `openclaw` 命令组安装，但插件也可以在某个核心父命令下注册嵌套命令，例如 `openclaw nodes`。当 `inspect --runtime` 在 `cliCommands` 下显示某个命令时，请按照列出的路径直接运行它；例如，注册了 `demo-git` 的插件可以用 `openclaw demo-git ping` 验证。

每个插件都会根据其在运行时实际注册的内容进行分类：

| 形态               | 含义                                                              |
| ------------------ | ----------------------------------------------------------------- |
| `plain-capability`  | 恰好只有一种能力类型（例如，仅提供者插件）                         |
| `hybrid-capability` | 多于一种能力类型（例如，文本 + 语音 + 图像）                       |
| `hook-only`         | 只有 hooks，没有 capabilities、tools、commands、services 或 routes |
| `non-capability`    | 有 tools/commands/services，但没有 capabilities                   |

更多信息请参见 [插件形态](/plugins/architecture#plugin-shapes) 中的能力模型。

<Note>
`--json` 标志会输出适合脚本处理和审计的机器可读报告。`inspect --all` 会渲染全量表格，包含形态、能力类型、兼容性提示、bundle 能力和 hook 摘要列。`info` 是 `inspect` 的别名。
</Note>

## 医师

```bash
openclaw plugins doctor
openclaw plugins doctor --json
```

`doctor` 会报告插件加载错误、清单/发现诊断、兼容性提示，以及过时的插件配置引用，例如缺少的插件槽位。它会加载插件模块但不会激活插件，也不会查询正在运行的 Gateway。当这些本地检查通过时，它会打印 `插件发现、模块加载、兼容性和配置检查已通过。运行 "openclaw health" 以检查正在运行的 Gateway，包括运行时隔离和回退状态。`。[健康检查命令](/cli/health) 会从 Gateway 读取当前的运行时隔离和回退状态。如果仍存在过时配置，但安装目录树总体正常，摘要会明确说明这一点，而不是暗示插件完全健康。

使用 `--json` 时，相同的发现、兼容性和配置诊断信息会作为一个机器可读对象返回。

如果某个已配置插件存在于磁盘上，但被加载器的路径安全检查阻止，配置验证会保留该插件条目并将其报告为 `present but blocked`。请修复前面的被阻止插件诊断，例如路径所有权或 world-writable 权限，而不是移除 `plugins.entries.<id>` 或 `plugins.allow` 配置。

对于诸如缺少 `register`/`activate` 导出的模块形状故障，请使用 `OPENCLAW_PLUGIN_LOAD_DEBUG=1` 重新运行，以便在诊断输出中包含一个简洁的导出形状摘要。

## 注册表

```bash
openclaw plugins registry
openclaw plugins registry --refresh
openclaw plugins registry --json
```

本地插件注册表是 OpenClaw 为已安装插件的身份、启用状态、源元数据和贡献所有权维护的持久冷读取模型。常规启动、提供者 owner 查找、通道设置分类以及插件清单都可以在不导入插件运行时模块的情况下读取它。

使用 `plugins registry` 来检查持久化注册表是否存在、是否最新或是否过期。使用 `--refresh` 可根据持久化插件索引、配置策略以及 manifest/package 元数据重建它。这是一条修复路径，不是运行时激活路径。

`openclaw doctor --fix` 还会修复与注册表相关的受管 npm 漂移。如果在受管插件 npm 项目下的孤立或已恢复的 `@openclaw/*` 包，或者旧的扁平受管 npm 根目录中的包，遮蔽了一个内置插件，doctor 会移除该过时包并重建注册表，使启动时能够根据内置 manifest 进行验证。当权威安装记录选择了某一个受管代际，但更早的扁平目录或代际目录仍然存在时，doctor 会将这些过时目录标记为待在网关重启后清理。Doctor 还会将宿主 `openclaw` 包重新链接到声明了 `peerDependencies.openclaw` 的受管 npm 插件中，以便像 `openclaw/plugin-sdk/*` 这样的包级运行时导入在更新或 npm 修复后能够正确解析。

## 市场

```bash
openclaw plugins marketplace entries
openclaw plugins marketplace entries --offline
openclaw plugins marketplace entries --json
openclaw plugins marketplace entries --feed-profile <name>
openclaw plugins marketplace entries --feed-url <url>
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json
openclaw plugins marketplace refresh
openclaw plugins marketplace refresh --feed-profile <name>
openclaw plugins marketplace refresh --feed-url <url>
openclaw plugins marketplace refresh --expected-sha256 <sha256> --json
```

`plugins marketplace entries` 列出来自已配置 OpenClaw 市场源的条目。默认情况下，它会尝试托管源，并回退到最新已接受的快照或捆绑数据。使用 `--feed-profile <name>` 读取特定的已配置配置文件，使用 `--feed-url <url>` 读取明确指定的托管源 URL，使用 `--offline` 在不获取源的情况下读取最新已接受的快照。

`plugins marketplace refresh` 会刷新已配置的托管源快照，并报告 OpenClaw 接受的是托管数据、托管快照还是捆绑回退数据。对于调用方需要命令在新鲜的托管负载不匹配固定校验和时失败的场景，请使用 `--expected-sha256`。

市场 `list` 接受本地市场路径、`marketplace.json` 路径、类似 `owner/repo` 的 GitHub 简写、GitHub 仓库 URL，或 git URL。`--json` 会打印解析后的源标签，以及已解析的市场清单和插件条目。

市场刷新会加载一个托管的 OpenClaw 市场源，并将
经过验证的响应持久化为本地托管源快照。默认情况下，它使用
已配置的默认源配置文件。使用 `--feed-profile <name>` 可刷新一个
特定的已配置配置文件，使用 `--feed-url <url>` 可刷新一个明确的托管源
URL，使用 `--expected-sha256 <sha256>` 可要求负载校验和必须匹配
（`sha256:<hex>` 或者裸露的 64 字符十六进制摘要），并使用 `--json`
输出适合机器读取的结果。明确指定的托管源 URL 不能包含
凭据、查询字符串或片段。未固定的刷新可能会报告一个
托管快照或捆绑回退结果，而不会使命令失败。固定的
刷新会在无法接受新的托管负载时失败，而成功的托管
刷新如果 OpenClaw 无法持久化已验证的快照，也会失败。

内置的 `clawhub-public` 配置文件期望负载标识
`clawhub-official`。在 ClawHub 生成并移交该密钥后，OpenClaw 会捆绑 ClawHub 的生产公钥。在此之前，内置配置文件不会授予签名源安装权限。公钥必须来自可信的发布或运维渠道，而不是来自源主机上的密钥端点。

OpenClaw 会验证 DSSE 封装，并且当配置文件声明 `feedId` 时，
要求解码后的负载 ID 与之匹配。内置的 `clawhub-public`
配置文件始终声明其标识，防止通过该配置文件重放另一个
源的有效文档。

在分阶段推出期间，现有的、未声明 `feedId`
的自定义签名配置文件保留签名验证，但不绑定负载标识。新的自定义
配置文件应声明 `feedId`。`feed-profile` 配置面正在单独落地，并提供 Control UI 所需的展示元数据；其 Doctor 诊断必须要求操作员提供缺失的标识，且不得从源 URL 推断标识。这种信任绑定不会恢复已废弃的根 `marketplaces` 密钥。

## 相关

- [构建插件](/plugins/building-plugins)
- [CLI 参考](/cli)
- [ClawHub](/clawhub)
