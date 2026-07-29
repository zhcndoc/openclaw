---
summary: "OpenClaw 如何安装插件包并解析插件依赖"
read_when:
  - 你正在调试插件包安装问题
  - 你正在更改插件启动、doctor，或包管理器安装行为
  - 你正在维护已打包的 OpenClaw 安装或捆绑的插件清单
title: "插件依赖解析"
sidebarTitle: "依赖项"
---

OpenClaw 仅在安装/更新时处理插件依赖。运行时加载从不运行包管理器、修复依赖树，或修改 OpenClaw 包目录。

## 责任划分

插件包自行负责它们的依赖图：

- 运行时依赖位于插件包的 `dependencies` 或
  `optionalDependencies` 中。
- SDK/core 导入属于 peer 或由 OpenClaw 提供的导入。
- 本地开发插件使用它们自己已安装的依赖。
- npm 和 git 插件安装到 OpenClaw 拥有的包根目录中。

OpenClaw 只负责插件生命周期：

- 发现插件源。
- 在明确请求时安装或更新包。
- 记录安装元数据。
- 加载插件入口点。
- 当依赖缺失时，以可操作的错误失败。

## 安装根目录

OpenClaw 为每种来源使用稳定的根目录：

- npm 包安装到每个插件项目中，路径为
  `~/.openclaw/npm/projects/<encoded-package>`。
- git 包克隆到 `~/.openclaw/git`。
- 本地/路径/归档安装会被复制或引用，不进行依赖
  修复。

npm 安装会在该每插件项目根目录中运行：

```bash
cd ~/.openclaw/npm/projects/<encoded-package>
npm install --omit=dev --omit=peer --legacy-peer-deps --ignore-scripts --no-audit --no-fund
```

`openclaw plugins install npm-pack:<path.tgz>` 对本地 npm-pack tarball 使用相同的每插件 npm
项目根目录：OpenClaw 读取 tarball 的 npm
元数据，将其作为被复制的 `file:` 依赖添加到受管项目中，运行
上面的常规 npm install，然后在信任插件之前
验证已安装的 lockfile 元数据。这个路径用于包验收和
发布候选证明，其中本地 pack 产物应表现得像
它所模拟的 registry 产物一样。

在测试官方或外部插件包并准备发布之前，请使用 `npm-pack:`。原始归档或路径安装适合本地调试，但它
不能证明与已安装的 npm 或 ClawHub
包相同的依赖路径。`npm-pack:` 可以证明受管包安装形态；但它本身
不能证明该插件是目录关联的官方内容。

当行为依赖于 bundled-plugin 或受信任的官方插件状态时，
请将本地包证明与基于目录的官方安装配对，或者使用一个
已发布的包路径，其中记录了官方信任。特权助手访问
和受信任官方范围的处理应在该受信任的
安装路径上进行验证，而不应从本地 tarball 安装推断。

如果插件在运行时因缺少导入而失败，请修复包清单，
而不是手动修复受管项目。运行时导入应位于插件包的 `dependencies` 或 `optionalDependencies` 中；`devDependencies`
不会为受管运行时项目安装。可以在
`~/.openclaw/npm/projects/<encoded-package>` 中执行本地 `npm install` 来临时
解除诊断阻塞，但这并不是包验收证明，因为下一次安装或
更新会根据包元数据重新创建该项目。

npm 可能会将传递依赖提升到每插件项目的
`node_modules`，位于插件包旁边。OpenClaw 在信任安装前会扫描受管项目根目录，并在卸载时移除该项目，因此
提升的运行时依赖会留在该插件的清理边界内。

OpenClaw-owned npm plugin packages never ship npm lockfiles. The repository
uses `pnpm-lock.yaml` as its committed product dependency review boundary, then
generates npm package locks only in temporary directories to validate the
publishable dependency graph:

```bash
pnpm deps:npm-lock:check
pnpm deps:npm-lock:check:changed
```

The checker strips plugin `devDependencies`, applies the workspace override
policy, and rejects generated versions absent from `pnpm-lock.yaml`. Nothing
is written into the checkout. Third-party plugin packages may still contain
lockfiles according to their own packaging policy; OpenClaw's installer leaves
that npm behavior to the installed npm version.

在将本地包视为发布候选证明之前，请检查将要安装的
tarball：

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

OpenClaw-owned npm plugin packages can also publish with explicit
`bundledDependencies`. The npm publish path overlays the runtime dependency
name list, strips dev-only workspace metadata from the published manifest,
runs a script-free npm install for the package-local runtime dependencies,
then packs or publishes the plugin tarball with those dependency files
included. Native-heavy packages (Codex, ACPX, Copilot, llama.cpp,
memory-lancedb, Microsoft Teams, Tlon) opt out with
`openclaw.release.bundleRuntimeDependencies: false`; they still ship a
precisely pinned manifest, but npm resolves runtime dependencies during install
instead of embedding every platform binary in the plugin tarball. The root
`openclaw` package also resolves dependencies at install time and does not
bundle its full dependency tree. See
[dependency locking](/gateway/security/dependency-locking).

导入 `openclaw/plugin-sdk/*` 的插件将 `openclaw` 声明为一个 peer 依赖。OpenClaw 不允许 npm 将宿主包的另一个 registry 副本安装到受管项目中，因为过期的宿主包会影响
npm 在该插件内的 peer 解析。受管 npm 安装会跳过 npm peer
解析/实例化，而 OpenClaw 会在安装或更新后，
为声明了宿主 peer 的已安装包重新建立插件本地的
`node_modules/openclaw` 链接。

git 安装会克隆或刷新仓库，然后运行：

```bash
npm install --omit=dev --ignore-scripts --no-audit --no-fund
```

随后，已安装的插件会从该包目录加载，因此
包本地和父级 `node_modules` 的解析方式与普通 Node 包的行为相同。

## 本地插件

本地插件是由开发者控制的目录。OpenClaw 从不为它们运行
`npm install`、`pnpm install` 或依赖修复；如果本地插件有依赖，
请在加载它之前先在该插件中安装。

第三方 TypeScript 本地插件会通过 Jiti 作为应急路径加载。已打包的 JavaScript 插件和捆绑的内部插件则改为通过原生 import/require 加载。

## 启动与重载

Gateway 启动和配置重载从不安装插件依赖。它们会读取插件安装记录，计算入口点，并加载它。

运行时缺少依赖会导致插件加载失败，并给出一个错误，提示操作员采取明确的修复措施：

```bash
openclaw plugins update <id>
openclaw plugins install <source>
openclaw doctor --fix
```

`doctor --fix` 会清理旧版 OpenClaw 生成的依赖状态，并且当配置仍然引用它们时，可以恢复本地安装记录中缺失的可下载插件。Doctor 不会修复已经安装的本地插件的依赖。

## 捆绑插件

轻量且对核心至关重要的捆绑插件会作为 OpenClaw 的一部分发布。它们要么不应包含沉重的运行时依赖树，要么应迁移到 ClawHub/npm 上可下载的包中。

关于当前生成的插件列表——哪些随核心包发布、哪些需要外部安装、哪些保持为仅源码形式——请参见
[插件清单](/plugins/plugin-inventory)。

捆绑插件的清单不得请求依赖暂存。大型或可选的插件功能应打包为普通插件，并通过与第三方插件相同的 npm/git/ClawHub 路径安装。

在源码检出环境中，OpenClaw 将仓库视为 pnpm monorepo。
执行 `pnpm install` 后，捆绑插件从 `extensions/<id>` 加载，因此包内的工作区依赖可用，并且修改会被直接拾取。源码检出开发仅支持 pnpm；在仓库根目录直接执行 `npm install` 不会为捆绑插件准备依赖。

| 安装形态                    | 捆绑插件位置               | 依赖所有者                                                     |
| -------------------------------- | ------------------------------------- | -------------------------------------------------------------------- |
| `npm install -g openclaw`        | 包内构建后的运行时树 | OpenClaw 包和显式的插件安装/更新/doctor 流程     |
| Git 检出加 `pnpm install` | `extensions/<id>` 工作区包  | pnpm 工作区，包括每个插件包自身的依赖 |
| `openclaw plugins install ...`   | 托管的 npm 项目/git/ClawHub 根目录  | 插件安装/更新流程                                       |

## 旧版清理

较早版本的 OpenClaw 会在启动时或在 doctor 修复期间生成捆绑插件依赖根目录。当前的 doctor 清理会使用 `--fix` 删除这些陈旧的目录和符号链接，包括旧的 `plugin-runtime-deps` 根目录、指向已剪枝的 `plugin-runtime-deps` 目标的全局 Node 前缀包符号链接、`.openclaw-runtime-deps*` 清单、生成的插件 `node_modules`、安装阶段目录，以及包级别的 pnpm 存储。打包后的 postinstall 也会在剪枝旧目标根目录之前移除这些全局符号链接，因此升级不会留下悬空的 ESM 包导入。

较早的 npm 安装还使用了共享的 `~/.openclaw/npm/node_modules` 根目录。当前的安装、更新、卸载和 doctor 流程仍然只为恢复和清理目的识别该旧式扁平根目录。新的 npm 安装会改为创建按插件划分的项目根目录。
