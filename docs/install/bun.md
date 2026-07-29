---
summary: "Bun 用于安装和包脚本的工作流；运行时需要 Node"
read_when:
  - 你想使用 Bun 安装依赖或运行包脚本
  - 你遇到 Bun install/patch/lifecycle 脚本问题
title: "Bun"
---

<Warning>
Bun releases up to 1.3.x cannot run the OpenClaw CLI or Gateway because they do not provide the required `node:sqlite` API. OpenClaw feature-probes the runtime: Bun builds that ship `node:sqlite` (1.4.0 canary and later) can run the CLI and Gateway experimentally, while older Bun versions are rejected at startup. Node remains the supported and recommended runtime for all OpenClaw runtime commands.
</Warning>

Bun remains usable as an optional package-script runner. The default package manager remains `pnpm`, which is fully supported and used by docs tooling. Bun cannot use `pnpm-lock.yaml` and ignores it, and current Bun versions fail to resolve this repo's `pnpm-workspace.yaml` layout during `bun install`, so dependency installs should use `pnpm install`.

## 安装

<Steps>
  <Step title="安装依赖">
    ```sh
    pnpm install
    ```

    Current Bun versions (including 1.4 canary) cannot resolve this repo's pnpm workspace layout, so `bun install` fails during workspace resolution. Use `pnpm install`.

  </Step>
  <Step title="构建和测试">
    ```sh
    bun run build
    bun run vitest run
    ```

    Commands that launch OpenClaw itself should still run through Node; Bun runtimes that provide `node:sqlite` (1.4.0 canary and later) can run them experimentally.

  </Step>
</Steps>

## 生命周期脚本

Bun 会阻止依赖的生命周期脚本，除非显式信任它们。对于这个仓库，常见会被阻止的脚本并不需要：

- `baileys` `preinstall`: checks Node major >= 20 (OpenClaw requires Node 22.22.3+, 24.15+, or 25.9+, with Node 26 recommended)
- `protobufjs` `postinstall`: emits warnings about incompatible version schemes (no build artifacts)

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
