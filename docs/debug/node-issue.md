---
summary: Node + tsx “__name 不是函数” 崩溃笔记及解决方案
read_when:
  - 调试仅限 Node 的开发脚本或 watch 模式失败
  - 调查 OpenClaw 中 tsx/esbuild loader 的崩溃
title: "Node + tsx crash"
---

# Node + tsx "\_\_name 不是函数" 崩溃

## 摘要

通过 Node 使用 `tsx` 运行 OpenClaw 时启动失败，报错：

```
[openclaw] Failed to start CLI: TypeError: __name is not a function
    at createSubsystemLogger (.../src/logging/subsystem.ts:203:25)
    at .../src/agents/auth-profiles/constants.ts:25:20
```

该问题始于将开发脚本从 Bun 切换到 `tsx`（提交 `2871657e`，2026-01-06）。相同的运行路径在 Bun 下正常。

## 环境

- Node: v25.x（复现于 v25.3.0）
- tsx: 4.21.0
- 操作系统：macOS（其他能运行 Node 25 的平台上也可能复现）

## 复现步骤（仅限 Node）

```bash
# 在仓库根目录
node --version
pnpm install
node --import tsx src/entry.ts status
```

## 仓库内最小复现

```bash
node --import tsx scripts/repro/tsx-name-repro.ts
```

## Node 版本检查

- Node 25.3.0：失败
- Node 22.22.0（Homebrew 安装的 `node@22`）：失败
- Node 24：尚未安装，需验证

## 备注 / 假设

- `tsx` 使用 esbuild 转换 TS/ESM。esbuild 的 `keepNames` 会插入一个 `__name` 辅助函数，并用 `__name(...)` 包裹函数定义。
- 崩溃表明运行时 `__name` 存在但不是函数，意味着该辅助函数在 Node 25 的 loader 路径中缺失或被覆盖。
- 其他 esbuild 用户也报告过类似 `__name` 辅助函数缺失或被重写导致的问题。

## 回归历史

- `2871657e`（2026-01-06）：脚本从 Bun 改为 tsx，使 Bun 变得可选。
- 之前（Bun 路径），`openclaw status` 和 `gateway:watch` 都能正常运行。

## 解决方案

- 使用 Bun 运行开发脚本（当前临时回退）。
- 使用 `tsgo` 进行仓库类型检查，然后运行编译后的输出：

  ```bash
  pnpm tsgo
  node openclaw.mjs status
  ```

- 历史说明：在调试此 Node/tsx 问题时曾使用 `tsc`，但仓库类型检查路径现已改用 `tsgo`。
- 如果可能，在 TS 加载器中禁用 esbuild 的 `keepNames`（可防止插入 `__name` 辅助函数）；tsx 目前未公开此选项。
- 在 Node LTS（22/24）上测试 `tsx`，以确认是否为 Node 25 特有的回归。

## 参考资料

- [https://opennext.js.org/cloudflare/howtos/keep_names](https://opennext.js.org/cloudflare/howtos/keep_names)
- [https://esbuild.github.io/api/#keep-names](https://esbuild.github.io/api/#keep-names)
- [https://github.com/evanw/esbuild/issues/1031](https://github.com/evanw/esbuild/issues/1031)

## 后续步骤

- 在 Node 22/24 上复现，以确认是否为 Node 25 回归。
- 测试 `tsx` nightly 版本，或在存在已知回归时固定到更早版本。
- 如果在 Node LTS 上也可复现，请带上 `__name` 堆栈跟踪向上游提交一个最小复现。

## 相关内容

- [Node.js install](/install/node)
- [Gateway troubleshooting](/gateway/troubleshooting)
