---
summary: "openclaw plugins 的 CLI 参考（list、install、marketplace、uninstall、enable/disable、deps、doctor）"
read_when:
  - 你想安装或管理 Gateway 插件或兼容的捆绑包
  - 你想调试插件加载失败问题
title: "插件"
sidebarTitle: "插件"
---

管理 Gateway 插件、hook 包和兼容捆绑包。

<CardGroup cols={2}>
  <Card title="插件系统" href="/tools/plugin">
    安装、启用和排查插件问题的最终用户指南。
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
openclaw plugins install <path-or-spec>
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
openclaw plugins inspect --all
openclaw plugins info <id>
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins registry
openclaw plugins registry --refresh
openclaw plugins uninstall <id>
openclaw plugins deps
openclaw plugins deps --repair
openclaw plugins deps --prune
openclaw plugins deps --json
openclaw plugins doctor
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins marketplace list <marketplace>
openclaw plugins marketplace list <marketplace> --json
```

对于缓慢的安装、检查、卸载或 registry-refresh 排查，请使用
`OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1` 运行命令。该 trace 会将各阶段耗时写入 stderr，并保持 JSON 输出可解析。参见 [调试](/help/debugging#plugin-lifecycle-trace)。

<Note>
捆绑插件随 OpenClaw 一起发布。其中一些默认启用（例如捆绑的模型提供者、捆绑的语音提供者以及捆绑的浏览器插件）；其他则需要 `plugins enable`。

原生 OpenClaw 插件必须包含带内联 JSON Schema（`configSchema`，即使为空也需要）的 `openclaw.plugin.json`。兼容捆绑包则使用它们自己的 bundle manifest。

`plugins list` 会显示 `Format: openclaw` 或 `Format: bundle`。详细列表/信息输出还会显示 bundle 子类型（`codex`、`claude` 或 `cursor`）以及检测到的 bundle 能力。
</Note>

### 安装

```bash
openclaw plugins install <package>                      # 先查 ClawHub，再查 npm
openclaw plugins install clawhub:<package>              # 仅 ClawHub
openclaw plugins install npm:<package>                  # 仅 npm
openclaw plugins install <package> --force              # 覆盖现有安装
openclaw plugins install <package> --pin                # 锁定版本
openclaw plugins install <package> --dangerously-force-unsafe-install
openclaw plugins install <path>                         # 本地路径
openclaw plugins install <plugin>@<marketplace>         # marketplace
openclaw plugins install <plugin> --marketplace <name>  # marketplace（显式）
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
```

<Warning>
裸包名会先在 ClawHub 中检查，然后再查 npm。请将插件安装视为运行代码。优先使用已锁定版本。
</Warning>

<Note>
ClawHub 是大多数插件的主要分发和发现渠道。npm 仍然是受支持的后备方案和直接安装路径。在迁移到 ClawHub 期间，OpenClaw 仍会在 npm 上发布一些由 OpenClaw 维护的 `@openclaw/*` 插件包；这些包的版本可能会在插件发布周期中落后于捆绑源码。如果 npm 将某个 OpenClaw 维护的插件包标记为 deprecated，那么该已发布版本只是旧的外部产物；请使用当前 OpenClaw 自带的插件或本地检出版本，直到发布更新的 npm 包。
</Note>

<AccordionGroup>
  <Accordion title="配置 include 与无效配置恢复">
    如果你的 `plugins` 区段由单文件 `$include` 提供支持，那么 `plugins install/update/enable/disable/uninstall` 会写回那个被包含的文件，而不会触碰 `openclaw.json`。根 include、include 数组以及带兄弟覆盖项的 include 会直接失败，而不会展平。支持的形状请参见 [配置 include](/gateway/configuration)。

    如果安装期间配置无效，`plugins install` 通常会失败并提示你先运行 `openclaw doctor --fix`。在 Gateway 启动期间，某个插件的无效配置会被隔离到该插件本身，这样其他通道和插件仍可继续运行；`openclaw doctor --fix` 可以将无效插件条目隔离。唯一文档化的安装时例外，是针对明确选择进入 `openclaw.install.allowInvalidConfigRecovery` 的插件所提供的窄范围捆绑插件恢复路径。

  </Accordion>
  <Accordion title="--force 以及 reinstall 与 update 的区别">
    `--force` 会复用现有安装目标，并就地覆盖已经安装的插件或 hook 包。当你有意从新的本地路径、压缩包、ClawHub 包或 npm 产物重新安装相同 id 时，请使用它。对于已跟踪的 npm 插件常规升级，优先使用 `openclaw plugins update <id-or-npm-spec>`。

    如果你对一个已经安装的插件 id 运行 `plugins install`，OpenClaw 会停止并提示你：正常升级请使用 `plugins update <id-or-npm-spec>`；如果你确实想从不同来源覆盖当前安装，则使用 `plugins install <package> --force`。

  </Accordion>
  <Accordion title="--pin 的作用范围">
    `--pin` 仅适用于 npm 安装。它不支持 `--marketplace`，因为 marketplace 安装会持久化 marketplace 源元数据，而不是 npm spec。

  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` 是一个用于内置危险代码扫描器误报的“破窗”选项。即使内置扫描器报告 `critical` 发现，它也会允许安装继续，但它**不会**绕过插件 `before_install` 钩子策略阻断，也**不会**绕过扫描失败。

    这个 CLI 标志适用于插件 install/update 流程。Gateway 支持的 skill 依赖安装使用对应的 `dangerouslyForceUnsafeInstall` 请求覆盖，而 `openclaw skills install` 仍是一个独立的 ClawHub skill 下载/安装流程。

    如果你发布在 ClawHub 上的插件被 registry 扫描阻止，请使用 [ClawHub](/tools/clawhub) 中的发布者步骤。

  </Accordion>
  <Accordion title="Hook 包和 npm spec">
    `plugins install` 也是安装暴露 `package.json` 中 `openclaw.hooks` 的 hook 包的入口。请使用 `openclaw hooks` 进行过滤后的 hook 可见性和单个 hook 启用，而不是用于包安装。

    Npm spec **仅限 registry**（包名 + 可选的**精确版本**或 **dist-tag**）。Git/URL/file spec 和 semver 范围都会被拒绝。出于安全考虑，依赖安装会在项目本地使用 `--ignore-scripts` 运行，即使你的 shell 配置了全局 npm 安装设置也是如此。

    当你想跳过 ClawHub 查找并直接从 npm 安装时，请使用 `npm:<package>`。裸包 spec 仍然优先使用 ClawHub，只有当 ClawHub 没有该包或该版本时才回退到 npm。

    裸 spec 和 `@latest` 会保持在稳定通道。如果 npm 将它们解析为预发布版本，OpenClaw 会停止并要求你显式选择预发布标签，例如 `@beta`/`@rc`，或者精确的预发布版本，例如 `@1.2.3-beta.4`。

    如果裸安装 spec 与某个捆绑插件 id 匹配（例如 `diffs`），OpenClaw 会直接安装该捆绑插件。若要安装同名的 npm 包，请使用显式的作用域 spec（例如 `@scope/diffs`）。

  </Accordion>
  <Accordion title="压缩包">
    支持的压缩包：`.zip`、`.tgz`、`.tar.gz`、`.tar`。原生 OpenClaw 插件压缩包必须在解压后的插件根目录中包含有效的 `openclaw.plugin.json`；仅包含 `package.json` 的压缩包会在 OpenClaw 写入安装记录之前被拒绝。

    也支持 Claude marketplace 安装。

  </Accordion>
</AccordionGroup>

ClawHub 安装使用显式的 `clawhub:<package>` 定位符：

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

对于裸的 npm 安全插件 spec，OpenClaw 现在也会优先使用 ClawHub。只有当 ClawHub 没有该包或该版本时才会回退到 npm：

```bash
openclaw plugins install openclaw-codex-app-server
```

使用 `npm:` 强制仅解析 npm，例如当 ClawHub 不可达，或你明确知道该包只存在于 npm 上时：

```bash
openclaw plugins install npm:openclaw-codex-app-server
openclaw plugins install npm:@scope/plugin-name@1.0.1
```

OpenClaw 会从 ClawHub 下载包压缩档，检查宣称的插件 API / 最低 gateway 兼容性，然后通过正常的压缩包路径安装。已记录的安装会保留其 ClawHub 源元数据，以便后续更新。
未版本化的 ClawHub 安装会保留未版本化的记录 spec，因此 `openclaw plugins update` 可以跟随更新的 ClawHub 发布；明确的版本或标签选择器，例如 `clawhub:pkg@1.2.3` 和 `clawhub:pkg@beta`，则会继续锁定在该选择器上。

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
```

<ParamField path="--enabled" type="boolean">
  仅显示已启用的插件。
</ParamField>
<ParamField path="--verbose" type="boolean">
  从表格视图切换为每个插件的详细行，显示 source/origin/version/activation 元数据。
</ParamField>
<ParamField path="--json" type="boolean">
  机器可读的清单以及 registry 诊断信息。
</ParamField>

<Note>
`plugins list` 会先读取持久化的本地插件 registry；如果 registry 缺失或无效，则回退到仅基于 manifest 的派生结果。它适合检查插件是否已安装、已启用，以及是否对冷启动规划可见，但它不是对已运行 Gateway 进程的实时探测。在更改插件代码、启用状态、hook 策略或 `plugins.load.paths` 之后，请先重启服务该通道的 Gateway，再期待新的 `register(api)` 代码或 hooks 运行。对于远程/容器化部署，请确认你重启的是实际的 `openclaw gateway run` 子进程，而不仅仅是包装进程。
</Note>

对于打包 Docker 镜像中的捆绑插件工作，请将插件源目录 bind-mount 到匹配的打包源码路径上，例如
`/app/extensions/synology-chat`。OpenClaw 会在 `/app/dist/extensions/synology-chat` 之前发现该挂载的源码覆盖层；单纯复制进去的源码目录会保持不生效，因此正常的打包安装仍会使用编译后的 dist。

用于运行时 hook 调试：

- `openclaw plugins inspect <id> --json` 会显示来自模块加载检查过程的已注册 hooks 和诊断信息。
- `openclaw gateway status --deep --require-rpc` 会确认可达的 Gateway、服务/进程提示、配置路径和 RPC 健康状态。
- 非捆绑的会话 hooks（`llm_input`、`llm_output`、`before_agent_finalize`、`agent_end`）需要 `plugins.entries.<id>.hooks.allowConversationAccess=true`。

使用 `--link` 可避免复制本地目录（会添加到 `plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

<Note>
`--force` 不支持与 `--link` 同用，因为链接安装会复用源路径，而不是覆盖到一个受管理的安装目标上。

在 npm 安装上使用 `--pin` 会将解析得到的精确 spec（`name@version`）保存到受管理的插件索引中，同时保留默认的不锁定行为。
</Note>

### 插件索引

插件安装元数据是机器管理的状态，不是用户配置。安装和更新会将其写入活动 OpenClaw 状态目录下的 `plugins/installs.json`。其顶层的 `installRecords` map 是安装元数据的持久来源，包括损坏或缺失插件 manifest 的记录。`plugins` 数组是基于 manifest 派生的冷 registry 缓存。该文件包含“请勿编辑”警告，并被 `openclaw plugins update`、uninstall、diagnostics 以及冷插件 registry 使用。

当 OpenClaw 看到配置中已写入的旧版 `plugins.installs` 记录时，它会把它们迁移到插件索引中并移除该配置键；如果任一写入失败，则会保留配置记录，以免安装元数据丢失。

### Runtime deps

```bash
openclaw plugins deps
openclaw plugins deps --repair
openclaw plugins deps --prune
openclaw plugins deps --json
```

`plugins deps` 会检查 OpenClaw 自带的捆绑插件的打包运行时依赖阶段。它不是第三方 npm 或 ClawHub 插件的安装/更新路径。

当打包安装在 Gateway 启动期间或 `plugins doctor` 中报告缺少捆绑运行时依赖时，请使用 `--repair`。修复只会安装缺失的、已启用的捆绑插件依赖，并禁用生命周期脚本。使用 `--prune` 可移除旧版打包布局遗留的陈旧未知外部运行时依赖根。

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
openclaw plugins update @openclaw/voice-call@beta
openclaw plugins update openclaw-codex-app-server --dangerously-force-unsafe-install
```

更新会应用到受管理插件索引中已跟踪的插件安装，以及 `hooks.internal.installs` 中已跟踪的 hook 包安装。

<AccordionGroup>
  <Accordion title="解析 plugin id 与 npm spec 的区别">
    当你传入插件 id 时，OpenClaw 会复用该插件记录中的安装 spec。这意味着之前存储的 dist-tag（如 `@beta`）和精确锁定版本会继续在后续的 `update <id>` 运行中使用。

    对于 npm 安装，你也可以传入带 dist-tag 或精确版本的显式 npm 包 spec。OpenClaw 会把该包名解析回已跟踪的插件记录，更新该已安装插件，并记录新的 npm spec 以供未来基于 id 的更新使用。

    只传入不带版本或标签的 npm 包名也会解析回已跟踪的插件记录。当某个插件曾被锁定到精确版本，而你想把它切回 registry 的默认发布线时，可以使用这种方式。

  </Accordion>
  <Accordion title="版本检查与完整性漂移">
    在进行实时 npm 更新之前，OpenClaw 会把已安装包版本与 npm registry 元数据进行对比。如果已安装版本与记录的产物身份已经和解析后的目标匹配，那么更新会被跳过，不会下载、重新安装或重写 `openclaw.json`。

    当存储的完整性哈希存在且获取到的产物哈希发生变化时，OpenClaw 会将其视为 npm 产物漂移。交互式的 `openclaw plugins update` 命令会打印预期和实际哈希，并在继续之前要求确认。非交互式更新助手会失败关闭，除非调用方提供明确的继续策略。

  </Accordion>
  <Accordion title="更新时的 --dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` 也可用于 `plugins update`，作为插件更新期间内置危险代码扫描误报的破窗覆盖。它仍然不会绕过插件 `before_install` 策略阻断或扫描失败阻断，并且它只适用于插件更新，不适用于 hook 包更新。
  </Accordion>
</AccordionGroup>

### 检查

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

对单个插件进行深度检查。会显示身份、加载状态、源、已注册能力、hooks、工具、命令、服务、gateway 方法、HTTP 路由、策略标志、诊断、安装元数据、bundle 能力，以及任何检测到的 MCP 或 LSP server 支持。

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

`doctor` 会报告插件加载错误、manifest/发现诊断信息以及兼容性提示。当一切正常时，它会输出 `No plugin issues detected.`

对于诸如缺少 `register`/`activate` 导出之类的模块形态失败，请使用 `OPENCLAW_PLUGIN_LOAD_DEBUG=1` 重新运行，以在诊断输出中包含简要的导出形态摘要。

### Registry

```bash
openclaw plugins registry
openclaw plugins registry --refresh
openclaw plugins registry --json
```

本地插件 registry 是 OpenClaw 为已安装插件的身份、启用状态、源元数据和贡献所有权维护的持久冷读取模型。常规启动、提供者 owner 查找、通道设置分类以及插件清单都可以在不导入插件运行时模块的情况下读取它。

使用 `plugins registry` 来检查持久化 registry 是否存在、是否最新或是否过期。使用 `--refresh` 可根据持久化插件索引、配置策略以及 manifest/package 元数据重建它。这是一条修复路径，不是运行时激活路径。

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
- [社区插件](/plugins/community)
