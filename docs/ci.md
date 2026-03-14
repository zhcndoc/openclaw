---
title: CI 流水线
description: OpenClaw CI 流水线如何工作
summary: "CI 任务图、范围门控及本地命令等价物"
read_when:
  - 你需要了解某个 CI 任务为何运行或未运行
  - 你正在调试失败的 GitHub Actions 检查
---

# CI 流水线

CI 在每次推送到 `main` 以及每次拉取请求时运行。它使用智能范围判定，在仅更改无关区域时跳过昂贵任务。

## 任务概览

| Job               | Purpose                                                 | When it runs                       |
| ----------------- | ------------------------------------------------------- | ---------------------------------- |
| `docs-scope`      | 检测仅文档更改                                         | 总是运行                          |
| `changed-scope`   | 检测哪些区域发生更改（node/macos/android/windows）         | 非文档更改                       |
| `check`           | TypeScript 类型检测、代码风格、格式化                  | 非文档、更改涉及 node 时运行         |
| `check-docs`      | Markdown 代码风格检测 + 断链检测                        | 仅文档更改时运行                   |
| `secrets`         | 检测泄露的密钥                                          | 总是运行                          |
| `build-artifacts` | 构建 dist 一次，供 `release-check` 共享                  | 推送到 `main`，且涉及 node 更改时     |
| `release-check`   | 校验 npm 包内容                                         | 推送到 `main` 并完成构建后          |
| `checks`          | PR 上运行 Node 测试 + 协议检查；推送时运行 Bun 兼容性检查  | 非文档，更改涉及 node 时运行         |
| `compat-node22`   | 最低支持 Node 运行时兼容性                               | 推送到 `main`，且涉及 node 更改时     |
| `checks-windows`  | Windows 特定测试                                        | 非文档，涉及 Windows 相关更改时        |
| `macos`           | Swift 代码风格/构建/测试 + TS 测试                       | 包含 macos 更改的 PR 时              |
| `android`         | Gradle 构建 + 测试                                      | 非文档，涉及 android 更改时          |

## 快速失败顺序

任务按顺序排列，以便在昂贵任务运行前，先进行廉价检查以快速失败：

1. `docs-scope` + `changed-scope` + `check` + `secrets`（并行运行，优先廉价门控）
2. PR 时：`checks`（Linux Node 测试拆分为 2 份），`checks-windows`，`macos`，`android`
3. 推送至 `main`：`build-artifacts` + `release-check` + Bun 兼容 + `compat-node22`

范围判定逻辑位于 `scripts/ci-changed-scope.mjs`，单元测试覆盖位于 `src/scripts/ci-changed-scope.test.ts`。

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
