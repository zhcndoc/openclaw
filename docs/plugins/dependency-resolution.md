---
summary: "OpenClaw 如何安装插件包并解析插件依赖"
read_when:
  - 你正在调试插件包安装问题
  - 你正在更改插件启动、doctor，或包管理器安装行为
  - 你正在维护已打包的 OpenClaw 安装或捆绑的插件清单
title: "插件依赖解析"
sidebarTitle: "依赖项"
---

# 插件依赖解析

OpenClaw 将插件依赖工作保留在安装/更新阶段。运行时加载
不会运行包管理器、修复依赖树，也不会修改 OpenClaw
包目录。

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
npm install --prefix ~/.openclaw/npm <spec> --omit=dev --ignore-scripts --no-audit --no-fund
```

git 安装会克隆或刷新仓库，然后运行：

```bash
npm install --omit=dev --ignore-scripts --no-audit --no-fund
```

随后已安装的插件会从该包目录加载，因此包级别的
`node_modules` 解析方式与普通 Node 包完全相同。

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

`doctor --fix` 可以清理旧版 OpenClaw 生成的依赖状态，并安装
配置中的、可下载但在本地安装记录中缺失的插件。
它不会为已经安装好的本地插件修复依赖。

## 捆绑插件

轻量级和核心关键的捆绑插件作为 OpenClaw 的一部分进行发布。
它们应当要么不包含沉重的运行时依赖树，要么迁移为
ClawHub/npm 上的可下载包。

捆绑插件清单不得请求依赖分阶段安装。大型或可选的
插件功能应当打包成普通插件，并通过与第三方插件相同的
npm/git/ClawHub 路径进行安装。

## 旧版清理

较旧版本的 OpenClaw 会在启动时或
doctor 修复期间生成捆绑插件依赖根目录。当前的 doctor 清理在使用 `--fix` 时会移除这些遗留目录和符号链接，包括旧的
`plugin-runtime-deps` 根目录、
`.openclaw-runtime-deps*` 清单、生成的插件 `node_modules`、安装
阶段目录，以及包内本地 pnpm 存储。

这些路径只是历史遗留垃圾。新的安装不应创建它们。
