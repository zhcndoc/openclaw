---
title: CI 流水线
description: OpenClaw CI 流水线如何工作
summary: "CI 任务图、范围门控及本地命令等价物"
read_when:
  - 你需要了解某个 CI 任务为何运行或未运行
  - 你正在调试失败的 GitHub Actions 检查
---

# CI 流水线

CI 会在每次推送到 `main` 以及每个拉取请求时运行。它使用智能范围判定，在仅文档或本地代码有变更时跳过高耗时任务。

## 任务概览

| 任务              | 目的                                                     | 运行时机                                           |
| ----------------- | -------------------------------------------------------- | ------------------------------------------------- |
| `docs-scope`      | 检测仅文档变更                                           | 总是运行                                          |
| `changed-scope`   | 检测哪些部分变更（node/macos/android/windows）          | 非文档类 PR                                       |
| `check`           | TypeScript 类型检查、代码风格检查、格式化               | 推送到 `main` 或节点相关变更的 PR                  |
| `check-docs`      | Markdown 代码风格检查 + 断链检查                         | 文档变更时                                        |
| `code-analysis`   | 行数阈值检查（1000 行）                                  | 仅 PR                                            |
| `secrets`         | 检测泄露的秘钥                                          | 总是运行                                          |
| `build-artifacts` | 构建 dist，一次构建结果可供其他任务共享                  | 非文档类，节点变更时                              |
| `release-check`   | 验证 npm 包内容                                          | 构建之后                                          |
| `checks`          | Node/Bun 测试 + 协议检查                                | 非文档类，节点变更时                              |
| `checks-windows`  | Windows 专属测试                                         | 非文档类，Windows 相关变更                         |
| `macos`           | Swift 代码风格检查/构建/测试 + TS 测试                  | macos 变更的 PR                                   |
| `android`         | Gradle 构建 + 测试                                       | 非文档类，Android 变更                            |

## 快速失败顺序

任务按顺序排列，便于在昂贵任务运行前，先让廉价检查失败：

1. `docs-scope` + `code-analysis` + `check`（并行，约1-2分钟）
2. `build-artifacts`（依赖上述任务完成）
3. `checks`、`checks-windows`、`macos`、`android`（依赖构建完成）

范围判定逻辑位于 `scripts/ci-changed-scope.mjs`，有单元测试覆盖在 `src/scripts/ci-changed-scope.test.ts`。

## 运行器

| 运行器                           | 任务                                      |
| -------------------------------- | ----------------------------------------- |
| `blacksmith-16vcpu-ubuntu-2404`  | 大多数 Linux 任务，包括范围检测           |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                         |
| `macos-latest`                   | `macos`、`ios`                           |

## 本地等价命令

```bash
pnpm check          # 类型检查 + 代码风格 + 格式化
pnpm test           # vitest 测试
pnpm check:docs     # 文档格式 + 代码风格 + 断链检查
pnpm release:check  # 验证 npm 包
```
