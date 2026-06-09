---
summary: "OpenClaw 如何安装插件包并解析插件依赖"
read_when:
  - 你正在调试插件包安装问题
  - 你正在更改插件启动、doctor，或包管理器安装行为
  - 你正在维护已打包的 OpenClaw 安装或捆绑的插件清单
title: "插件依赖解析"
sidebarTitle: "依赖项"
---

OpenClaw 在安装/更新时处理插件依赖。运行时加载不会运行包管理器、修复依赖树，或修改 OpenClaw 包目录。

## 责任划分

插件包自行负责它们的依赖图：

- 运行时依赖位于插件包的 `dependencies` 或
  `optionalDependencies` 中
- SDK/核心导入属于 peer 依赖或由 OpenClaw 提供的导入
- 本地开发插件使用它们自己已经安装好的依赖
- npm 和 git 插件安装到由 OpenClaw 管理的包根目录中

OpenClaw 只负责插件生命周期：

- 发现插件来源
- 在明确请求时安装或更新包
- 记录安装元数据
- 加载插件入口点
- 当依赖缺失时以可操作的错误失败

## 安装根目录

OpenClaw 为每种来源使用稳定的根目录：

- npm 包会安装到 `~/.openclaw/npm/projects/<encoded-package>` 下的每个插件项目中
- git 包会克隆到 `~/.openclaw/git`
- 本地/路径/归档安装会被复制或引用，而不会修复依赖

npm 安装会在该每插件项目根目录中运行：

```bash
cd ~/.openclaw/npm/projects/<encoded-package>
npm install --omit=dev --omit=peer --legacy-peer-deps --ignore-scripts --no-audit --no-fund
```

`openclaw plugins install npm-pack:<path.tgz>` 会将该本地 npm-pack tarball 也使用同一个每插件 npm 项目根目录。OpenClaw 会读取该 tarball 的 npm 元数据，将其作为复制的 `file:` 依赖添加到受管理项目中，运行正常的 npm install，然后在信任插件之前验证已安装的 lockfile 元数据。
这用于包验收和发布候选证明，即本地 pack 产物应当像它所模拟的注册表产物一样工作。

npm 可能会将传递依赖提升到每插件项目的 `node_modules` 中，位于插件包旁边。OpenClaw 在信任安装前会扫描受管理项目根目录，并在卸载时删除该项目，因此提升上来的运行时依赖会留在该插件的清理边界内。

已发布的 npm 插件包可以携带 `npm-shrinkwrap.json`。npm 会在安装期间使用这个可发布的 lockfile，而 OpenClaw 的受管理 npm 项目根目录会通过正常的 npm install 路径支持它。OpenClaw 拥有的可发布插件包必须包含一个包本地的 shrinkwrap，它由该插件包已发布的依赖图生成：

```bash
pnpm deps:shrinkwrap:generate
pnpm deps:shrinkwrap:check
```

生成器会移除插件的 `devDependencies`，应用工作区覆盖策略，并为每个 `publishToNpm` 插件写入 `extensions/<id>/npm-shrinkwrap.json`。第三方插件包也可以提供 shrinkwrap；OpenClaw 对社区包不强制要求，但 npm 在存在时会尊重它。

OpenClaw 所拥有的 npm 插件包也可以通过显式的 `bundledDependencies` 发布。npm publish 路径会覆盖运行时依赖名称列表，从已发布的包清单中移除仅开发用的工作区元数据，对包本地运行时依赖执行无脚本的 npm install，然后在打包或发布插件 tarball 时包含这些依赖文件。包括 Codex 和 ACP 运行时在内的原生依赖较重的包会通过 `openclaw.release.bundleRuntimeDependencies: false` 退出该流程；这些包仍然会附带它们的 shrinkwrap，但 npm 会在安装期间解析运行时依赖，而不是将每个平台二进制都嵌入插件 tarball。根 `openclaw` 包不会捆绑其完整依赖树。

导入 `openclaw/plugin-sdk/*` 的插件会将 `openclaw` 声明为 peer 依赖。OpenClaw 不允许 npm 将宿主包的注册表副本单独安装到受管理项目中，因为过时的宿主包会影响该插件内部的 npm peer 解析。受管理的 npm 安装会跳过 npm peer 解析/实体化，并且 OpenClaw 会在安装或更新后，为声明了宿主 peer 的已安装包重新建立插件本地的 `node_modules/openclaw` 链接。

git 安装会克隆或刷新仓库，然后运行：

```bash
npm install --omit=dev --ignore-scripts --no-audit --no-fund
```

随后安装的插件会从该包目录加载，因此包本地
和父级 `node_modules` 的解析方式与普通 Node 包相同。

## 本地插件

本地插件被视为由开发者控制的目录。OpenClaw 不会
为它们运行 `npm install`、`pnpm install` 或依赖修复。如果本地
插件有依赖，请先在该插件内安装它们，再进行加载。

第三方 TypeScript 本地插件可以使用应急的 Jiti 路径。已打包的
JavaScript 插件和捆绑的内部插件会通过原生
import/require 加载，而不是通过 Jiti。

## 启动与重载

网关启动和配置重载绝不会安装插件依赖。它们会读取
插件安装记录，计算入口点，并加载它。

如果运行时缺少依赖，插件将加载失败，并且错误
应当引导运维人员执行明确的修复操作：

```bash
openclaw plugins update <id>
openclaw plugins install <source>
openclaw doctor --fix
```

`doctor --fix` 可以清理旧版 OpenClaw 生成的依赖状态，并在配置引用它们时恢复本地安装记录中缺失的可下载插件。Doctor 不会修复已经安装的本地插件的依赖。

## 捆绑插件

轻量级和核心关键的捆绑插件作为 OpenClaw 的一部分进行发布。
它们应当要么不包含沉重的运行时依赖树，要么迁移为
ClawHub/npm 上的可下载包。

有关当前随核心包发布、外部安装或保持仅源码形式的插件生成清单，请参见 [插件清单](/plugins/plugin-inventory)。

捆绑插件清单不得请求依赖暂存。大型或可选的
插件功能应作为普通插件打包，并通过与第三方插件相同的
npm/git/ClawHub 路径进行安装。

在源码检出中，OpenClaw 将仓库视为 pnpm monorepo。执行
`pnpm install` 后，捆绑插件会从 `extensions/<id>` 加载，因此包本地
workspace 依赖可用，并且编辑会被直接拾取。源码
检出开发仅支持 pnpm；在仓库根目录直接执行 `npm install` 不是
准备捆绑插件依赖的受支持方式。

| Install shape                    | Bundled plugin location               | Dependency owner                                                     |
| -------------------------------- | ------------------------------------- | -------------------------------------------------------------------- |
| `npm install -g openclaw`        | Built runtime tree inside the package | OpenClaw 包和显式的插件安装/更新/doctor 流程     |
| Git checkout plus `pnpm install` | `extensions/<id>` workspace packages  | pnpm 工作区，包括每个插件包自身的依赖 |
| `openclaw plugins install ...`   | Managed npm project/git/ClawHub root  | 插件安装/更新流程                                       |

## 旧版清理

较旧的 OpenClaw 版本会在启动时或
doctor 修复期间生成捆绑插件的依赖根目录。当前的 doctor 清理会在使用 `--fix` 时
移除这些过期目录和符号链接，包括旧的
`plugin-runtime-deps` 根目录、指向已裁剪 `plugin-runtime-deps` 目标的全局
Node-prefix 包符号链接、`.openclaw-runtime-deps*` 清单、生成的插件
`node_modules`、安装阶段目录，以及包本地 pnpm store。打包时的 postinstall
也会在裁剪旧目标根目录之前移除这些全局符号链接，以避免升级后
留下悬空的 ESM 包导入。

旧版 npm 安装也曾使用共享的 `~/.openclaw/npm/node_modules` 根目录。
当前的 install、update、uninstall 和 doctor 流程仍然只将该旧的扁平根目录用于恢复和清理。新的 npm 安装应改为创建每插件项目根目录。
