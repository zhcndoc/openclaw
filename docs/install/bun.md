---
summary: "Bun 工作流（实验性）：安装与注意事项对比 pnpm"
read_when:
  - 你想要最快的本地开发循环（bun + watch）
  - 你遇到了 Bun 安装/补丁/生命周期脚本问题
title: "Bun（实验性）"
---

# Bun（实验性）

目标：使用 **Bun** 运行此仓库（可选，不推荐用于 WhatsApp/Telegram）
且不偏离 pnpm 工作流。

⚠️ **不推荐用于 Gateway 运行时**（WhatsApp/Telegram 有缺陷）。生产环境请使用 Node。

## 状态

- Bun 是运行 TypeScript 的可选本地运行时（`bun run …`，`bun --watch …`）。
- `pnpm` 是默认构建工具，依然完全支持（且部分文档工具使用）。
- Bun 无法使用 `pnpm-lock.yaml`，会忽略它。

## 安装

默认：

```sh
bun install
```

注意：`bun.lock`/`bun.lockb` 被 git 忽略，因此不会导致仓库变更。如果你想**不写入锁文件**：

```sh
bun install --no-save
```

## 构建 / 测试（Bun）

```sh
bun run build
bun run vitest run
```

## Bun 生命周期脚本（默认被阻止）

Bun 可能会阻止依赖的生命周期脚本，除非显式信任（`bun pm untrusted` / `bun pm trust`）。
对于此仓库，常被阻止的脚本并非必需：

- `@whiskeysockets/baileys` 的 `preinstall`：检查 Node 主版本是否 >= 20（我们运行 Node 22+）。
- `protobufjs` 的 `postinstall`：会发出关于不兼容版本方案的警告（没有生成产物）。

如果你遇到确实需要这些脚本的运行时问题，请显式信任它们：

```sh
bun pm trust @whiskeysockets/baileys protobufjs
```

## 注意事项

- 一些脚本仍硬编码使用 pnpm（例如 `docs:build`、`ui:*`、`protocol:check`）。目前请通过 pnpm 运行这些脚本。
