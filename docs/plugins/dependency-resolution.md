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

- npm 包安装到 `~/.openclaw/npm`
- git 包克隆到 `~/.openclaw/git`
- 本地/路径/归档安装会被复制或引用，不进行依赖修复

npm 安装在 npm 根目录下运行：

```bash
npm install --prefix ~/.openclaw/npm <spec> --omit=dev --omit=peer --legacy-peer-deps --ignore-scripts --no-audit --no-fund
```

`openclaw plugins install npm-pack:<path.tgz>` 使用相同的受管理 npm 根目录来处理本地 npm-pack tarball。OpenClaw 读取 tarball 的 npm 元数据，将其作为复制的 `file:` 依赖添加到受管理根目录中，运行正常的 npm install，然后在信任该插件之前验证已安装的 lockfile 元数据。此流程用于包验收和发布候选验证，以便本地 pack 产物的行为与其模拟的 registry 产物一致。

npm 可能会将传递依赖提升到插件包旁边的 `~/.openclaw/npm/node_modules`。OpenClaw 在信任安装前会扫描受管理的 npm 根目录，并在卸载时使用 npm 删除 npm 管理的包，因此被提升的运行时依赖仍然保留在受管理清理边界内。

导入 `openclaw/plugin-sdk/*` 的插件会将 `openclaw` 声明为 peer 依赖。OpenClaw 不允许 npm 将宿主包的单独 registry 副本安装到受管理根目录中，因为过时的宿主包会影响后续插件安装期间的 npm peer 解析。受管理的 npm 安装会跳过共享根目录的 npm peer 解析/实例化，并且在安装、更新或卸载后，OpenClaw 会为声明了宿主 peer 的已安装包重新建立插件本地的 `node_modules/openclaw` 链接。

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

| 安装形态                    | 捆绑插件位置                    | 依赖所有者                                                     |
| --------------------------- | -------------------------------- | -------------------------------------------------------------- |
| `npm install -g openclaw`   | 包内构建时运行时树               | OpenClaw 包和显式的插件安装/更新/doctor 流程     |
| Git 检出加 `pnpm install`   | `extensions/<id>` workspace 包   | pnpm workspace，包括每个插件包自身的依赖 |
| `openclaw plugins install ...` | 受管理的 npm/git/ClawHub 插件根目录 | 插件安装/更新流程                                       |

## 旧版清理

较旧的 OpenClaw 版本会在启动时或
doctor 修复期间生成捆绑插件的依赖根目录。当前的 doctor 清理会在使用 `--fix` 时
移除这些过期目录和符号链接，包括旧的
`plugin-runtime-deps` 根目录、指向已裁剪 `plugin-runtime-deps` 目标的全局
Node-prefix 包符号链接、`.openclaw-runtime-deps*` 清单、生成的插件
`node_modules`、安装阶段目录，以及包本地 pnpm store。打包时的 postinstall
也会在裁剪旧目标根目录之前移除这些全局符号链接，以避免升级后
留下悬空的 ESM 包导入。

这些路径只是历史遗留垃圾。新的安装不应创建它们。
