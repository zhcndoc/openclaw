---
summary: "Bun 用于安装和包脚本的工作流；运行时需要 Node"
read_when:
  - 你想使用 Bun 安装依赖或运行包脚本
  - 你遇到 Bun install/patch/lifecycle 脚本问题
title: "Bun"
---

<Warning>
Bun 不能运行 OpenClaw CLI 或 Gateway，因为它不提供所需的 `node:sqlite` API。请安装受支持的 Node 版本以运行所有 OpenClaw 运行时命令。
</Warning>

Bun 仍可作为可选的依赖安装器和包脚本运行器使用。默认包管理器仍然是 `pnpm`，它得到完全支持，并用于文档工具链。Bun 不能使用 `pnpm-lock.yaml`，并且会忽略它。

## 安装

<Steps>
  <Step title="安装依赖">
    ```sh
    bun install
    ```

    `bun.lock` / `bun.lockb` 已被 git 忽略，因此不会造成仓库变更。如果想完全跳过锁文件写入：

    ```sh
    bun install --no-save
    ```

  </Step>
  <Step title="构建和测试">
    ```sh
    bun run build
    bun run vitest run
    ```

    启动 OpenClaw 本身的命令仍然必须通过 Node 运行。

  </Step>
</Steps>

## 生命周期脚本

Bun 会阻止依赖的生命周期脚本，除非显式信任它们。对于这个仓库，常见会被阻止的脚本并不需要：

- `baileys` `preinstall`：检查 Node 主版本是否 >= 20（OpenClaw 需要 Node 22.22.3+、24.15+ 或 25.9+，其中推荐使用 Node 24）
- `protobufjs` `postinstall`：发出关于不兼容版本方案的警告（没有构建产物）

如果你遇到需要这些脚本的运行时问题，请显式信任它们：

```sh
bun pm trust baileys protobufjs
```

## 注意事项

某些包脚本在内部硬编码了 `pnpm`（例如 `check:docs`、`ui:*`、`protocol:check`）。即使通过 `bun run` 运行，它们仍然会调用 `pnpm`，所以请直接使用 `pnpm` 运行这些脚本。

## 相关内容

- [安装概览](/install)
- [Node.js](/install/node)
- [更新](/install/updating)
