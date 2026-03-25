---
title: CI 流水线
summary: "CI 任务图谱、范围门控及本地等效命令"
read_when:
  - 你需要了解某个 CI 任务为何运行或未运行
  - 你正在调试失败的 GitHub Actions 检查
---

# CI 流水线

CI 在每次推送到 `main` 以及每次拉取请求时运行。它使用智能范围判定，在仅更改无关区域时跳过昂贵任务。

## 任务概览

| 任务               | 用途                                           | 运行时机                                         |
| ------------------ | ---------------------------------------------- | ------------------------------------------------ |
| `preflight`        | 文档范围、变更范围、密钥扫描、工作流审计、生产依赖审计 | 始终；基于 Node 的审计仅在非文档变更时运行       |
| `docs-scope`       | 检测仅文档变更                                 | 始终                                             |
| `changed-scope`    | 检测哪些区域发生变更 (node/macos/android/windows) | 非文档变更                                       |
| `check`            | TypeScript 类型检查、代码风格检查、格式化      | 非文档、node 变更                                |
| `check-docs`       | Markdown 格式检查 + 断链检查                   | 文档变更时                                       |
| `secrets`          | 检测泄露的密钥                                 | 始终                                             |
| `build-artifacts`  | 构建 dist 一次，与 `release-check` 共享        | 推送到 `main`、node 变更                         |
| `release-check`    | 验证 npm pack 内容                             | 构建后推送到 `main`                              |
| `checks`           | PR 上的 Node 测试 + 协议检查；推送时的 Bun 兼容测试 | 非文档、node 变更                                |
| `compat-node22`    | 最低支持的 Node 运行时兼容性                   | 推送到 `main`、node 变更                         |
| `checks-windows`   | Windows 专用测试                               | 非文档、windows 相关变更                         |
| `macos`            | Swift 代码风格检查/构建/测试 + TS 测试          | 含 macos 变更的 PR                               |
| `android`          | Gradle 构建 + 测试                             | 非文档、android 变更                             |

## 快速失败顺序

任务按顺序排列，以便在昂贵任务运行前，先进行廉价检查以快速失败：

1. `docs-scope` + `changed-scope` + `check` + `secrets`（并行运行，优先廉价门控）
2. PR 时：`checks`（Linux Node 测试拆分为 2 份），`checks-windows`，`macos`，`android`
3. 推送至 `main`：`build-artifacts` + `release-check` + Bun 兼容测试 + `compat-node22`

范围判定逻辑位于 `scripts/ci-changed-scope.mjs`，并通过 `src/scripts/ci-changed-scope.test.ts` 中的单元测试覆盖。
同一共享范围模块还通过更窄的 `changed-smoke` 门控驱动单独的 `install-smoke` 工作流，因此 Docker/安装冒烟测试仅针对安装、打包和容器相关变更运行。

## 运行器

| 运行器                           | 任务                                      |
| -------------------------------- | ----------------------------------------- |
| `blacksmith-16vcpu-ubuntu-2404`  | 大多数 Linux 任务，包括范围检测           |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                          |
| `macos-latest`                   | `macos`、`ios`                            |

## 本地等价命令

```bash
pnpm check          # 类型检查 + 代码风格检查 + 格式化
pnpm test           # vitest 测试
pnpm check:docs     # Markdown 格式检查 + 代码风格检查 + 断链检查
pnpm release:check  # 验证 npm 包
```
