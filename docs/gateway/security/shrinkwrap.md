---
summary: "OpenClaw 发布版中 npm shrinkwrap 的通俗与技术说明"
read_when:
  - 你想了解 OpenClaw 发布版里 npm shrinkwrap 的含义
  - 你正在审查 package lockfiles、依赖变更或供应链风险
  - 你在发布前验证 root 或插件 npm 包
title: "npm shrinkwrap"
---

OpenClaw 源码检出使用 `pnpm-lock.yaml`。已发布的 OpenClaw npm 包使用 `npm-shrinkwrap.json`，这是 npm 可发布的依赖锁文件，因此包安装时会使用发布审核期间审查过的依赖图。

## 为什么这很重要

Shrinkwrap 是随 npm 包一起发布的依赖树收据：它告诉 npm 需要安装哪些精确的传递依赖版本。

| 文件                  | 适用位置               | 含义                              |
| --------------------- | ---------------------- | --------------------------------- |
| `pnpm-lock.yaml`      | OpenClaw 源码检出      | 维护者依赖图                      |
| `npm-shrinkwrap.json` | 已发布的 npm 包        | 用户的 npm install 依赖图         |
| `package-lock.json`   | 本地 npm 应用          | 不是 OpenClaw 的发布契约          |

对于 OpenClaw 发布，这意味着：

- 发布后的包不会要求 npm 在安装时临时生成一份新的依赖图；
- 依赖变更可以被审查，因为它们会体现在 lockfile 的 diff 中；
- 发布验证测试的是用户实际会安装的同一份依赖图；
- 包体积或原生依赖带来的意外会在发布前暴露出来。

Shrinkwrap 不是沙箱。它本身不会让依赖变得安全，也不能替代宿主隔离、`openclaw security audit`、包来源证明或安装冒烟测试。

OpenClaw 是一个网关、插件宿主、模型路由器和代理运行时，因此默认安装会影响启动时间、磁盘使用、原生包下载以及供应链暴露。Shrinkwrap 为发布审查提供了一个稳定边界：审查者能看到传递依赖的变动，校验器会拒绝意外的 lockfile 漂移，而插件包会携带它们自己锁定的依赖图，而不是依赖根包。

## 生成和检查

根 `openclaw` npm 包、OpenClaw 维护的 npm 插件包（例如 `@openclaw/discord`），以及可发布的工作区包（如 [`@openclaw/ai`](/reference/openclaw-ai)）在发布时都会包含 `npm-shrinkwrap.json`。由于工作区依赖会与根包并行发布，因此会从根 shrinkwrap 中省略；每个可发布的工作区包则会固定自己的传递依赖树。合适的插件包也可以使用显式的 `bundledDependencies` 发布，将其运行时依赖文件打包进插件 tarball，而不是仅依赖安装时解析。

```bash
# 所有由 shrinkwrap 管理的包（根包 + 可发布插件）
pnpm deps:shrinkwrap:generate
pnpm deps:shrinkwrap:check

# 仅根包
pnpm deps:shrinkwrap:root:generate
pnpm deps:shrinkwrap:root:check

# 仅受当前 changeset 影响的包
pnpm deps:shrinkwrap:changed:generate
pnpm deps:shrinkwrap:changed:check
```

生成器会解析 npm 的可发布锁文件格式，但会拒绝那些生成出的、在 `pnpm-lock.yaml` 中尚不存在的包版本。这样可以保持 pnpm 的依赖时效、覆盖和补丁审查边界不变。

请将以下内容视为安全敏感项进行审查：

- `pnpm-lock.yaml`
- `npm-shrinkwrap.json`
- bundled 的插件依赖载荷
- 任何 `package-lock.json` diff

OpenClaw 的包校验器要求新的根包 tarball 中包含 shrinkwrap，并会拒绝已发布包中的 `package-lock.json`。插件的 npm 发布路径会先检查插件本地的 shrinkwrap，安装包本地的 bundled 依赖，然后再执行打包或发布。

## 检查已发布的包

根包：

```bash
npm pack openclaw@<version> --json --pack-destination /tmp/openclaw-pack
tar -tf /tmp/openclaw-pack/openclaw-<version>.tgz | grep '^package/npm-shrinkwrap.json$'
```

插件包：

```bash
npm pack @openclaw/discord@<version> --json --pack-destination /tmp/openclaw-plugin-pack
tar -tf /tmp/openclaw-plugin-pack/openclaw-discord-<version>.tgz | grep '^package/npm-shrinkwrap.json$'
tar -tf /tmp/openclaw-plugin-pack/openclaw-discord-<version>.tgz | grep '^package/node_modules/'
```

背景：[npm-shrinkwrap.json](https://docs.npmjs.com/cli/v11/configuring-npm/npm-shrinkwrap-json)。
