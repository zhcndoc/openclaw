---
summary: "OpenClaw 发布版中 npm shrinkwrap 的通俗与技术说明"
read_when:
  - 你想了解 OpenClaw 发布版里 npm shrinkwrap 的含义
  - 你正在审查 package lockfiles、依赖变更或供应链风险
  - 你在发布前验证 root 或插件 npm 包
title: "npm shrinkwrap"
---

OpenClaw 源码检出使用 `pnpm-lock.yaml`。已发布的 OpenClaw npm
包使用 `npm-shrinkwrap.json`，这是 npm 可发布的依赖锁文件，因此
包安装会使用在发布期间审查过的依赖图。

## 简单版本

Shrinkwrap 是随 npm 包一起发布的依赖树收据。
它告诉 npm 应该安装哪些确切的传递依赖包版本。

对于 OpenClaw 发布，这意味着：

- 已发布的包不会让 npm 在安装时临时生成新的依赖图；
- 由于变更会出现在锁文件中，依赖修改更容易审查；
- 发布验证可以测试用户实际会安装的相同依赖图；
- 在发布前更容易发现包体积或原生依赖带来的意外。

Shrinkwrap 不是沙箱。它本身不会让某个依赖变得安全，也不能替代主机隔离、`openclaw security audit`、包来源证明或安装烟雾测试。

简短的心智模型：

| 文件                  | 适用位置               | 含义                              |
| --------------------- | ---------------------- | --------------------------------- |
| `pnpm-lock.yaml`      | OpenClaw 源码检出      | 维护者依赖图                      |
| `npm-shrinkwrap.json` | 已发布的 npm 包        | 用户的 npm install 依赖图         |
| `package-lock.json`   | 本地 npm 应用          | 不是 OpenClaw 的发布契约          |

## 为什么 OpenClaw 使用它

OpenClaw 是网关、插件宿主、模型路由器和代理运行时。默认安装会影响启动时间、磁盘占用、原生包下载以及供应链暴露面。

Shrinkwrap 为发布审查提供了稳定边界：

- 审查者可以看到传递依赖的变动；
- 包验证器可以拒绝意外的锁文件漂移；
- 包验收可以使用将要发布的依赖图来测试安装；
- 插件包可以携带自己的锁定依赖图，而不是依赖根包来管理仅插件使用的依赖。

目标不是“更多锁文件”。目标是具有明确归属的可复现发布安装。

## 技术细节

根 `openclaw` npm 包和 OpenClaw 拥有的 npm 插件包在发布时会包含 `npm-shrinkwrap.json`。合适的 OpenClaw 拥有的插件包也可以使用显式的 `bundledDependencies` 发布，这样它们的运行时依赖文件会随插件 tarball 一起携带，而不是只依赖安装时解析。

按如下方式维护边界：

```bash
pnpm deps:shrinkwrap:generate
pnpm deps:shrinkwrap:check
```

生成器会解析 npm 的可发布锁文件格式，但会拒绝那些不已经存在于 `pnpm-lock.yaml` 中的生成包版本。这样可以保持 pnpm 依赖年龄、覆盖和补丁审查边界不变。

只有在有意刷新根包而不触及插件包时，才使用仅根包命令：

```bash
pnpm deps:shrinkwrap:root:generate
pnpm deps:shrinkwrap:root:check
```

以下文件应视为安全敏感：

- `pnpm-lock.yaml`
- `npm-shrinkwrap.json`
- 捆绑的插件依赖载荷
- 任何 `package-lock.json` diff

OpenClaw 包验证器要求新的根包 tarball 中包含 shrinkwrap。插件 npm 发布流程会检查插件本地的 shrinkwrap，安装插件本地的 bundled 依赖，然后再打包或发布。包验证器会拒绝已发布的 OpenClaw 包中出现 `package-lock.json`。

检查已发布的根包：

```bash
npm pack openclaw@<version> --json --pack-destination /tmp/openclaw-pack
tar -tf /tmp/openclaw-pack/openclaw-<version>.tgz | grep '^package/npm-shrinkwrap.json$'
```

检查 OpenClaw 拥有的插件包：

```bash
npm pack @openclaw/discord@<version> --json --pack-destination /tmp/openclaw-plugin-pack
tar -tf /tmp/openclaw-plugin-pack/openclaw-discord-<version>.tgz | grep '^package/npm-shrinkwrap.json$'
tar -tf /tmp/openclaw-plugin-pack/openclaw-discord-<version>.tgz | grep '^package/node_modules/'
```

背景：[npm-shrinkwrap.json](https://docs.npmjs.com/cli/v11/configuring-npm/npm-shrinkwrap-json)。
