---
summary: "Bun 工作流（实验性）：安装与注意事项对比 pnpm"
read_when:
  - 你希望获得最快的本地开发循环（bun + watch）
  - 你遇到了 Bun install/patch/lifecycle 脚本问题
title: "Bun（实验性）"
---

<Warning>
Bun **不推荐用于网关运行时**（WhatsApp 和 Telegram 存在已知问题）。生产环境请使用 Node。
</Warning>

Bun 是一个可选的本地运行时，用于直接运行 TypeScript（`bun run ...`、`bun --watch ...`）。默认的包管理器仍是 `pnpm`，文档工具完全支持并使用它。Bun 无法使用 `pnpm-lock.yaml` 并会忽略它。

## 安装

<Steps>
  <Step title="安装依赖">
    ```sh
    bun install
    ```

    `bun.lock` / `bun.lockb` 已被 git 忽略，因此不会造成仓库变动。若要完全跳过锁文件写入：

    ```sh
    bun install --no-save
    ```

  </Step>
  <Step title="构建与测试">
    ```sh
    bun run build
    bun run vitest run
    ```
  </Step>
</Steps>

## 生命周期脚本

Bun 会阻止依赖的生命周期脚本，除非显式信任。对于本仓库，通常被阻止的脚本并非必需：

- `@whiskeysockets/baileys` `preinstall` -- 检查 Node 主版本是否 >= 20（OpenClaw 默认使用 Node 24，同时仍支持 Node 22 LTS，目前为 `22.14+`）
- `protobufjs` `postinstall` -- 发出关于不兼容版本方案的警告（无构建产物）

如果你遇到运行时问题需要这些脚本，请显式信任它们：

```sh
bun pm trust @whiskeysockets/baileys protobufjs
```

## 注意事项

Some scripts still hardcode pnpm (for example `docs:build`, `ui:*`, `protocol:check`). Run those via pnpm for now.

## 相关内容

- [安装概览](/install)
- [Node.js](/install/node)
- [更新](/install/updating)
