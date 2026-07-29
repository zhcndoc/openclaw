---
summary: 历史上的 Node + tsx “__name 不是一个函数” 崩溃及其原因
read_when:
  - 调查一个提到缺少 __name 辅助函数的 tsx/esbuild 加载器崩溃
title: "Node + tsx 崩溃"
---

# Node + tsx "\_\_name 不是一个函数" 崩溃

## 状态

已解决。此崩溃在当前 `package.json` 中固定的 `tsx` 版本（`4.22.3`）以及当前 Node 发行版上均无法复现。保留在此处，以防未来 `tsx`/esbuild 升级后重新引入此问题。

## 原始症状

通过 `tsx` 运行 OpenClaw 开发脚本时，在启动阶段失败，并出现：

```text
[openclaw] 启动 CLI 失败：TypeError: __name 不是一个函数
    at createSubsystemLogger (src/logging/subsystem.ts)
    at <caller> (src/agents/auth-profiles/constants.ts)
```

行号已省略；自从最初崩溃以来，这两个文件都已更改，具体行号不再匹配。

这出现在开发脚本从 Bun 切换到 `tsx`（`2871657e`，2026-01-06）之后，目的是让 Bun 成为可选项。等效的基于 Bun 的路径不会崩溃。最初是在 macOS 上的 Node v25.3.0 中观察到的；其他运行 Node 25 的平台也被认为可能受到影响。

## 原因

`tsx` 通过 esbuild 转换 TS/ESM，并在其转换选项中硬编码了 `keepNames: true`。这个设置会使 esbuild 将具名函数/类声明包裹在对 `__name` 辅助函数的调用中，这样 `fn.name` 就能在压缩和打包后仍然保留。此次崩溃意味着在受影响的 `tsx`/Node 组合中，该模块在调用位置缺少这个辅助函数，或该辅助函数被同名覆盖了，因此 `__name(...)` 抛出了异常，而不是返回被包装的值。

## 当前复现检查

```bash
node --version
pnpm install
node --import tsx src/entry.ts status
```

该命令目前会正常退出。如果再次抛出 `__name is not a function`，请在向上游提交问题前，记录确切的 Node 版本、`tsx` 版本（`node_modules/tsx/package.json`）以及完整的堆栈跟踪。

## 变通方案（如果崩溃再次出现）

- 使用 Bun 运行开发脚本，而不是 `node --import tsx`。
- 先运行 `pnpm tsgo` 进行类型检查，然后运行构建后的输出，而不是通过 `tsx` 直接运行源代码：

  ```bash
  pnpm tsgo
  node openclaw.mjs status
  ```

- 尝试不同版本的 `tsx`（`pnpm add -D tsx@<version>` 属于依赖变更，需要按仓库策略审批），以二分法判断其捆绑的 esbuild 版本是否重新引入了该 bug。
- 在不同的 Node 主版本/次版本上测试，看看故障是否与版本有关。

## 参考资料

- [https://esbuild.github.io/api/#keep-names](https://esbuild.github.io/api/#keep-names)
- [https://github.com/evanw/esbuild/issues/1031](https://github.com/evanw/esbuild/issues/1031)

## 相关

- [Node.js 安装](/install/node)
- [网关故障排查](/gateway/troubleshooting)
