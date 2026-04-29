---
summary: Node + tsx “__name 不是一个函数” 崩溃说明与临时解决方案
read_when:
  - 调试仅在 Node 下运行的开发脚本或监视模式失败问题
  - 排查 OpenClaw 中 tsx/esbuild 加载器崩溃
title: "Node + tsx 崩溃"
---

# Node + tsx "\_\_name 不是一个函数" 崩溃

## 摘要

通过 Node 使用 `tsx` 运行 OpenClaw 时，会在启动阶段失败，报错如下：

```
[openclaw] Failed to start CLI: TypeError: __name is not a function
    at createSubsystemLogger (.../src/logging/subsystem.ts:203:25)
    at .../src/agents/auth-profiles/constants.ts:25:20
```

该问题出现在开发脚本从 Bun 切换到 `tsx` 之后（提交 `2871657e`，2026-01-06）。相同的运行路径在 Bun 下是可用的。

## 环境

- Node: v25.x（已在 v25.3.0 上观察到）
- tsx: 4.21.0
- 操作系统: macOS（在其他运行 Node 25 的平台上也大概率可复现）

## 复现（仅 Node）

```bash
# 在仓库根目录
node --version
pnpm install
node --import tsx src/entry.ts status
```

## 仓库中的最小复现

```bash
node --import tsx scripts/repro/tsx-name-repro.ts
```

## Node 版本检查

- Node 25.3.0：失败
- Node 22.22.0（Homebrew `node@22`）：失败
- Node 24：这里尚未安装；需要验证

## 说明 / 假设

- `tsx` 使用 esbuild 来转换 TS/ESM。esbuild 的 `keepNames` 会生成一个 `__name` helper，并用 `__name(...)` 包裹函数定义。
- 崩溃表明 `__name` 确实存在，但在运行时不是函数，这意味着在 Node 25 的加载器路径中，该模块的 helper 丢失或被覆盖了。
- 在其他使用 esbuild 的场景中，也曾报告过类似的 `__name` helper 问题，通常是 helper 丢失或被重写所致。

## 回归历史

- `2871657e`（2026-01-06）：脚本从 Bun 改为 tsx，以便让 Bun 成为可选项。
- 在此之前（Bun 路径），`openclaw status` 和 `gateway:watch` 都可以正常工作。

## 临时解决方案

- 开发脚本继续使用 Bun（当前的临时回退）。
- 使用 `tsgo` 进行仓库类型检查，然后运行构建产物：

  ```bash
  pnpm tsgo
  node openclaw.mjs status
  ```

- 历史说明：在调试这个 Node/tsx 问题时这里曾使用 `tsc`，但仓库的类型检查流程现在使用 `tsgo`。
- 如果可能，在 TS 加载器中禁用 esbuild 的 keepNames（这样可以避免插入 `__name` helper）；但 tsx 目前没有暴露这个选项。
- 测试 Node LTS（22/24）配合 `tsx`，看看问题是否仅限于 Node 25。

## 参考资料

- [https://opennext.js.org/cloudflare/howtos/keep_names](https://opennext.js.org/cloudflare/howtos/keep_names)
- [https://esbuild.github.io/api/#keep-names](https://esbuild.github.io/api/#keep-names)
- [https://github.com/evanw/esbuild/issues/1031](https://github.com/evanw/esbuild/issues/1031)

## 下一步

- 在 Node 22/24 上复现，以确认是否为 Node 25 回归。
- 测试 `tsx` nightly，或在已知存在回归时固定到更早版本。
- 如果在 Node LTS 上也能复现，带上 `__name` 堆栈跟踪向上游提交一个最小复现。

## 相关

- [Node.js 安装](/install/node)
- [网关故障排查](/gateway/troubleshooting)
