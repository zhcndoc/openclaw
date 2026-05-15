---
summary: "Bun 工作流（实验性）：与 pnpm 相比的安装和注意事项"
read_when:
  - 你想要最快的本地开发循环（bun + watch）
  - 你遇到 Bun 安装/补丁/生命周期脚本问题
title: "Bun（实验性）"
---

<Warning>
Bun **不建议用于 gateway 运行时**（与 WhatsApp 和 Telegram 相关的已知问题）。生产环境请使用 Node。
</Warning>

Bun 是一个可选的本地运行时，可直接运行 TypeScript（`bun run ...`、`bun --watch ...`）。默认包管理器仍然是 `pnpm`，它已得到完全支持，并被 docs 工具链使用。Bun 不能使用 `pnpm-lock.yaml`，并会忽略它。

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
  </Step>
</Steps>

## 生命周期脚本

Bun 会阻止依赖生命周期脚本，除非显式信任它们。对于这个仓库，常见会被阻止的脚本并不需要：

- `baileys` `preinstall` -- 检查 Node 主版本是否 >= 20（OpenClaw 默认使用 Node 24，并且仍然支持 Node 22 LTS，目前为 `22.16+`）
- `protobufjs` `postinstall` -- 发出关于不兼容版本方案的警告（无构建产物）

如果你遇到需要这些脚本的运行时问题，请显式信任它们：

```sh
bun pm trust baileys protobufjs
```

## 注意事项

有些脚本仍然硬编码了 pnpm（例如 `docs:build`、`ui:*`、`protocol:check`）。目前请通过 pnpm 运行这些脚本。

## 相关内容

- [安装概览](/install)
- [Node.js](/install/node)
- [更新](/install/updating)
