---
summary: Node + tsx "__name 不是函数" 崩溃笔记及解决方案
read_when:
  - 调试仅限 Node 的开发脚本或监视模式失败时
  - 调查 OpenClaw 中 tsx/esbuild loader 崩溃时
title: "Node + tsx 崩溃"
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
- 操作系统: macOS（其他能运行 Node 25 的平台上也可能复现）

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

- 使用 Bun 进行开发脚本（当前临时回退）。
- 使用 Node + tsc watch 编译后运行：

  ```bash
  pnpm exec tsc --watch --preserveWatchOutput
  node --watch openclaw.mjs status
  ```

- 本地验证过，`pnpm exec tsc -p tsconfig.json` + `node openclaw.mjs status` 在 Node 25 下正常。
- 如果可能，禁用 TS loader 中 esbuild 的 keepNames（防止插入 `__name` 辅助）；tsx 目前不支持此选项。
- 在 Node LTS 版本（22/24）上测试 `tsx`，确认是否仅是 Node 25 相关问题。

## 参考资料

- [https://opennext.js.org/cloudflare/howtos/keep_names](https://opennext.js.org/cloudflare/howtos/keep_names)
- [https://esbuild.github.io/api/#keep-names](https://esbuild.github.io/api/#keep-names)
- [https://github.com/evanw/esbuild/issues/1031](https://github.com/evanw/esbuild/issues/1031)

## 后续步骤

- 在 Node 22/24 上复现确认是否为 Node 25 回归。
- 测试 `tsx` nightly 版本，或回退到早期版本，观察是否存在已知回归。
- 若在 Node LTS 上仍复现，向上游提交带有 `__name` 堆栈追踪的最小复现用例。
