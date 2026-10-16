---
summary: "OpenClaw 如何安装插件包并解析插件依赖"
read_when:
  - "你正在调试插件包安装问题"
  - "你正在更改插件启动、doctor，或包管理器安装行为"
  - "你正在维护已打包的 OpenClaw 安装或捆绑的插件清单"
title: "插件依赖解析"
sidebarTitle: "依赖项"
---

OpenClaw 仅在 install/update 时间处理插件依赖项。运行时加载永远不会运行包管理器、修复依赖关系树或更改 OpenClaw 包目录。

## <a id="responsibility-split"></a> 责任划分

插件包自行负责它们的依赖图：

- 运行时依赖位于插件包的 `dependencies` 或 `optionalDependencies` 中。
- SDK/core 导入属于 peer 或由 OpenClaw 提供的导入。
- 本地开发插件使用它们自己已安装的依赖。
- npm 和 git 插件安装到 OpenClaw- 拥有的包根中。

OpenClaw 只负责插件生命周期：

- 发现插件源。
- 在明确请求时安装或更新包。
- 记录安装元数据。
- 加载插件入口点。
- 当依赖缺失时，以可操作的错误失败。

## <a id="install-roots"></a> 安装根目录

OpenClaw 为每种来源使用稳定的根目录：

- npm 包安装到每个插件项目中，路径为 `~/.openclaw/npm/projects/<encoded-package>`。
- git 包克隆到 `~/.openclaw/git`。
- 复制或引用 Local/path/archive 安装，无需修复依赖项。

这些根是持久安装状态，而不是缓存。删除 `~/.openclaw/npm` 或 `~/.openclaw/git` 将删除所有已安装的外部插件；部署清理脚本必须将它们保留在原处。被取代的插件一代已由网关本身淘汰。

npm 安装会在该每插件项目根目录中运行：

```bash
cd ~/.openclaw/npm/projects/<encoded-package>
npm install --omit=dev --omit=peer --legacy-peer-deps --ignore-scripts --no-audit --no-fund
```

### <a id="npm-pack-tarball-installs"></a> npm-pack tarball 安装

`openclaw plugins install npm-pack:<path.tgz>` 对本地 npm-pack tarball 使用相同的每个插件 npm 项目根：OpenClaw 读取 tarball 的 npm 元数据，将其作为复制的 `file:` 依赖项添加到托管项目中，运行正常的 npm 安装上面，然后在信任插件之前验证已安装的锁定文件元数据。此路径用于包接受和发布候选证明，其中本地包工件的行为应与其模拟的注册表工件类似。

在测试官方或外部插件包并准备发布之前，请使用 `npm-pack:`。原始归档或路径安装适合本地调试，但它不能证明与已安装的 npm 或 ClawHub 包相同的依赖路径。`npm-pack:` 可以证明受管包安装形态；但它本身不能证明该插件是目录关联的官方内容。

当行为依赖于 bundled-plugin 或受信任的官方插件状态时， 请将本地包证明与基于目录的官方安装配对，或者使用一个已发布的包路径，其中记录了官方信任。特权助手访问和受信任官方范围的处理应在该受信任的安装路径上进行验证，而不应从本地 tarball 安装推断。

### <a id="missing-runtime-imports"></a> 缺少运行时导入

如果插件在运行时因缺少导入而失败，请修复包清单，而不是手动修复托管项目。运行时导入属于插件包`dependencies`或`optionalDependencies`；未为托管运行时项目安装 `devDependencies`。 `~/.openclaw/npm/projects/<encoded-package>` 内的本地 `npm install` 可以解锁临时诊断，但它不是包接受证明，因为下次安装或更新会从包元数据重新创建项目。

### <a id="hoisted-transitive-dependencies"></a> 提升传递依赖

npm 可能会将传递依赖提升到每插件项目的 `node_modules`，位于插件包旁边。OpenClaw 在信任安装前会扫描受管项目根目录，并在卸载时移除该项目，因此提升的运行时依赖会留在该插件的清理边界内。

### <a id="lockfile-policy"></a> Lockfile 策略

OpenClaw- 拥有的 npm 插件包从不发布 npm 锁定文件。存储库使用 `pnpm-lock.yaml` 作为其提交的产品依赖性审查边界，然后仅在临时目录中生成 npm 包锁以验证可发布的依赖关系图：

```bash
pnpm deps:npm-lock:check
pnpm deps:npm-lock:check:changed
```

检查器剥离插件 `devDependencies`，应用工作区覆盖策略，并拒绝 `pnpm-lock.yaml` 中不存在的生成版本。结账时什么也没有写。第三方插件包根据自己的打包政策可能仍然包含锁定文件； OpenClaw 的安装程序将 npm 行为留给已安装的 npm 版本。

### <a id="verify-a-package-tarball"></a> 验证软件包 tarball

在将本地包视为发布候选证明之前，请检查将要安装的 tarball：

```bash
npm pack --pack-destination /tmp
tar -xOf /tmp/<plugin-package>.tgz package/package.json
tar -tf /tmp/<plugin-package>.tgz | grep '^package/dist/'
```

对于依赖变更，还要验证生产安装能够在没有 dev 依赖的情况下解析运行时包：

```bash
tmpdir=$(mktemp -d)
(
  cd "$tmpdir"
  npm init -y >/dev/null
  npm install --package-lock-only --omit=dev --omit=peer --legacy-peer-deps --ignore-scripts /tmp/<plugin-package>.tgz
)
rm -rf "$tmpdir"
```

### <a id="bundled-runtime-dependencies"></a> 捆绑的运行时依赖项

OpenClaw-拥有的npm插件包也可以通过显式`bundledDependencies`发布。 npm 发布路径覆盖运行时依赖项名称列表，从已发布的清单中删除仅限开发的工作区元数据，暂存一个没有源 `node_modules` 的单独包目录，并在那里运行无脚本 npm 安装以获取运行时依赖项。然后，它会打包或发布包含这些依赖项文件的插件 tarball，并删除暂存目录。 pnpm-owned 源依赖关系树保持不变。

当直接运行时依赖项具有其确切版本的已批准工作区补丁时，npm 和 ClawHub 打包将包含来自匹配冻结 pnpm 安装的依赖项。打包会验证已安装的补丁身份并将其字节打包到临时依赖项安装中，然后在已发布的清单中恢复原始公共版本说明符。当禁用捆绑所有运行时依赖项时，这也适用；不相关的依赖项保留其正常安装行为。过时的源安装或显式的 `bundleRuntimeDependencies: false` 选择退出会停止打包，而不是发布未修补的依赖项。

Native-heavy 软件包（Codex、ACPX、Copilot、llama.cpp、内存-lancedb、Microsoft Teams、Tlon）选择使用 `openclaw.release.bundleRuntimeDependencies: false` 退出；他们仍然提供精确固定的清单，但 npm 在安装过程中解决运行时依赖关系，而不是在插件 tarball 中嵌入每个平台二进制文件。根 `openclaw` 包还在安装时解析依赖关系，并且不捆绑其完整依赖关系树。请参阅 [ 依赖锁定](/gateway/security/dependency-locking)。

### <a id="host-peer-dependency"></a> 主机对等依赖性

导入 `openclaw/plugin-sdk/*` 的插件将 `openclaw` 声明为对等依赖项。 OpenClaw 不允许 npm 将主机包的单独注册表副本安装到托管项目中，因为过时的主机包可能会影响 npm 在该插件内的对等解析。托管 npm 安装会跳过 npm 对等体 resolution/materialization，并且 OpenClaw 在安装或更新后重新断言已安装软件包的插件本地 `node_modules/openclaw` 链接，这些软件包声明主机对等体。

### <a id="git-installs"></a> git 安装

git 安装会克隆或刷新仓库，然后运行：

```bash
npm install --omit=dev --ignore-scripts --no-audit --no-fund
```

随后，已安装的插件会从该包目录加载，因此包本地和父级 `node_modules` 的解析方式与普通 Node 包的行为相同。

## <a id="local-plugins"></a> 本地插件

本地插件是由开发者控制的目录。OpenClaw 从不为它们运行 `npm install`、`pnpm install` 或依赖修复；如果本地插件有依赖， 请在加载它之前先在该插件中安装。

第三方 TypeScript 本地插件会通过 Jiti 作为应急路径加载。已打包的 JavaScript 插件和捆绑的内部插件则改为通过原生 import/require 加载。

## <a id="startup-and-reload"></a> 启动与重载

Gateway 启动和配置重载从不安装插件依赖。它们会读取插件安装记录，计算入口点，并加载它。

运行时缺少依赖会导致插件加载失败，并给出一个错误，提示操作员采取明确的修复措施：

```bash
openclaw plugins update <id>
openclaw plugins install <source>
openclaw doctor --fix
```

`doctor --fix` 删除悬空的全局插件运行时符号链接，并可以在配置仍然引用本地安装记录时恢复可下载的插件。 Doctor 不会修复已安装的本地插件的依赖关系。

## <a id="bundled-plugins"></a> 捆绑插件

轻量级和核心关键的捆绑插件作为 OpenClaw 的一部分提供。它们要么不携带繁重的运行时依赖树，要么移至 ClawHub/npm. 上的可下载包

关于当前生成的插件列表——哪些随核心包发布、哪些需要外部安装、哪些保持为仅源码形式——请参见 [插件清单](/plugins/plugin-inventory)。

捆绑插件的清单不得请求依赖暂存。大型或可选的插件功能应打包为普通插件，并通过与第三方插件相同的 npm/git/ClawHub 路径安装。

内部捆绑插件在自己的清单中保留其依赖项声明。未编译到 `dist` 中的运行时依赖项也必须在根 OpenClaw 包的 `dependencies` 或 `optionalDependencies` 中声明，因为根包传送它们的运行时。外部插件将其运行时依赖项保留在插件本地。

包验证使用构建生成的 `dist/runtime-dependency-ownership.json` 来识别仅由插件使用的块。每个条目将一个块文件名和 SHA-256 哈希值绑定到其所属的插件；每个所有者都必须在其捆绑或安装的 `@openclaw/<id>` 包清单中声明依赖关系。根导入（包括对其他插件拥有的块的根引用）仍然需要根依赖项声明。对于使用元数据生成器构建的候选者，丢失元数据或更改块字节不能授予插件豁免。

发布预检对于 `scripts/lib/runtime-dependency-ownership-build-plugin.mts` 之前的源签出存在兼容性异常。当所有权元数据不存在时，它可以将生成的插件区域内的各个导入归因于该插件的打包或可信源清单。这些地区以外的进口仍然需要根声明。对块的根引用会撤销其插件豁免，包括通过传递性相对导入。提升的静态导入遵循块的图所有权；插件区域之外的可执行导入仍保留根引用。公共包入口点始终算作 root 拥有的。当前但无效的元数据永远不会回退到区域所有权。此验证不会更改 Node 的运行时依赖性解析。

在源签出中，使用 `pnpm install`，然后使用 `pnpm build`。 OpenClaw 优先选择 `dist/extensions`，然后是 `dist-runtime/extensions`，并且当两个构建树都不可用时，回退到 `extensions`。 pnpm 拥有源依赖关系树：安装后和构建准备保留插件本地版本和工作区链接。原生Node从各个插件包导入resolve；打包的捆绑运行时仍然使用上面的根运行时声明。使用构建的树时重新构建以获取源编辑。源码校验开发为pnpm-only；存储库根目录中的普通 `npm install` 不会准备 pnpm 工作区。

根构建从 Git 跟踪的文件中发现插件包和其他顶级源条目，并保留文件名中的空格和 Unicode。在构建之前将新包和自动发现的入口文件添加到 Git 索引中。下面的独立版本还支持尚未跟踪的包。

| 安装形态                                   | 捆绑插件位置                              | 依赖所有者                                       |
| ----------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------ |
| 全局 npm 安装                              | 在包内构建运行时树                | 用于内部捆绑运行时的根 OpenClaw 包     |
| Git 签出加上 `pnpm install` + `pnpm build` | `dist/extensions`，然后 `dist-runtime/extensions`    | 根运行时声明和插件清单        |
| 未构建的源签出                         | `extensions/<id>` 不存在构建树时的回退 | 具有显式根运行时依赖性的 pnpm 工作区 |
| `openclaw plugins install ...`                  | 托管 npm project/git/ClawHub 根                 | 插件install/update流程                         |

对于全局 npm 行，请在 npm 12 或 npm 11.16+ 上使用 `npm install -g openclaw --allow-scripts=openclaw`。在 npm 11.15 及更早版本上，省略 `--allow-scripts=openclaw`。插件依赖项收敛仍然有意禁用脚本，并继续使用上面的 `--ignore-scripts` 命令。

### <a id="native-imports-from-a-standalone-source-build"></a> Native 从独立源构建导入

要直接使用 Node 导入已构建的 `extensions/<package>/dist`，请使用 pnpm 安装的主机链接。如果该链接丢失，请从源签出根显式准备它：

```bash
node scripts/lib/plugin-npm-runtime-build.mjs --prepare-native-import extensions/<package>
```

这需要 `dist/plugin-sdk` 中的现有根 SDK 输出以及所选包的独立运行时输出。如果包输出丢失，请首先使用 `node scripts/lib/plugin-npm-runtime-build.mjs extensions/<package>` 构建它。独立构建运行所选包的资产构建命令，并将其声明的 `openclaw.build.staticAssets` 复制到 `dist` 中，包括尚未被 Git 跟踪的新包。缺少声明的源文件会使构建失败。

根和独立构建从插件的已安装依赖项解析 `node_modules/<package>/...` 下的源，包括提升安装。这些是物理包路径；子路径导出映射不限制声明的资产。所选依赖项中缺少的文件不会借用其他已安装的版本。

使用包相对路径（例如 `./src/store.worker.ts`）在 `openclaw.build.workerEntries` 中声明私有工作线程源文件。独立构建在 `dist` 下的匹配路径处发出它们，例如 `dist/src/store.worker.js`（`.cjs` 对于 CommonJS 包）。当为根捆绑构建选择插件时，也会包含这些条目。声明工作线程不会将其注册为插件入口点或添加公共包导出。

准备命令不会重建输出或执行插件代码。它仅将签出链接为 `node_modules/openclaw`，以获取在 `peerDependencies` 或 `dependencies` 中声明 `openclaw` 的真正即时源包。它不安装第三方依赖项；这些必须已可通过 pnpm 工作区使用。

准备工作拒绝符号链接的包路径、不安全的清单和冲突的依赖路径，而不是报告成功。普通的包构建仍然仅包含工件。安装后和根构建准备保留源插件本地 `node_modules`，包括此链接。运行时加载从不执行此设置或运行包管理器。

## <a id="legacy-cleanup"></a> 旧版清理

较旧的 OpenClaw 版本在启动时或医生修复期间生成捆绑插件依赖项根。打包后安装现在仅清理其自己的安装：`dist/extensions` 下过时的捆绑插件 `node_modules` 和 `.openclaw-install-stage*` 目录、打包清单中缺少的 `dist` 文件以及空的 `dist` 目录。

仅当别名本身真正悬空时，`doctor --fix` 才会删除全局 Node-prefix 包符号链接到 `plugin-runtime-deps` 中。保留实时别名。 Doctor 和 postinstall 都不会删除共享的 `plugin-runtime-deps` 根或镜像，这些根或镜像仍可能服务于其他安装或配置文件。由于 2026.9.2，已弃用的 `core/doctor/legacy-plugin-dependencies` 选择器仅供参考；它不再扫描共享根以进行删除。

共享的 `~/.openclaw/npm/node_modules` 根是 2026.5.28. 安装、更新、卸载之前的 npm 安装布局，并且医生流程仍然识别旧的扁平根，仅用于恢复和清理。从 2026.5.28 开始安装，改为创建每个插件项目根。
