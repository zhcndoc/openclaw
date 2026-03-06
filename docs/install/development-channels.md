---
summary: "稳定版、测试版和开发版渠道：语义、切换与标记"
read_when:
  - 你想在稳定版/测试版/开发版之间切换
  - 你正在标记或发布预发行版
title: "开发渠道"
---

# 开发渠道

最后更新：2026-01-21

OpenClaw 提供三个更新渠道：

- **stable（稳定版）**：npm dist-tag 为 `latest`。
- **beta（测试版）**：npm dist-tag 为 `beta`（测试中的构建版本）。
- **dev（开发版）**：`main` 分支的最新提交（git）。发布时的 npm dist-tag 为 `dev`。

我们会先发布构建到 **beta**，进行测试，然后**将经过验证的构建升级为 `latest`**，而不更改版本号 —— dist-tags 是 npm 安装的权威来源。

## 切换渠道

通过 Git checkout：

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

- `stable`/`beta` 会检出最新匹配的标签（通常是相同的标签）。
- `dev` 会切换到 `main` 分支并在上游基础上执行变基。

通过 npm/pnpm 全局安装：

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

这会通过对应的 npm dist-tag（`latest`、`beta`、`dev`）进行更新。

当你 **显式** 使用 `--channel` 参数切换渠道时，OpenClaw 也会同步安装方式：

- `dev` 确保使用 git 检出（默认路径为 `~/openclaw`，通过 `OPENCLAW_GIT_DIR` 环境变量可覆盖），更新代码，并从该检出目录安装全局 CLI。
- `stable`/`beta` 则通过 npm 使用相应的 dist-tag 进行安装。

提示：如果你想同时拥有稳定版和开发版，可以保留两个代码克隆，并让你的网关指向稳定版那一份。

## 插件和渠道

当你使用 `openclaw update` 切换渠道时，OpenClaw 也会同步插件来源：

- `dev` 优先使用 git 检出中捆绑的插件。
- `stable` 和 `beta` 则还原通过 npm 安装的插件包。

## 标记最佳实践

- 给你希望 git 检出所定位的版本打标签（稳定版格式为 `vYYYY.M.D`，测试版格式为 `vYYYY.M.D-beta.N`）。
- 也支持兼容格式 `vYYYY.M.D.beta.N`，但建议使用 `-beta.N`。
- 旧有的 `vYYYY.M.D-<patch>` 标签依然被识别为稳定版（非测试版）。
- 保持标签不可变更：不要移动或重用标签。
- npm dist-tags 保持为 npm 安装的权威来源：
  - `latest` → 稳定版
  - `beta` → 候选构建版
  - `dev` → main 分支快照（可选）

## macOS 应用可用性

测试版和开发版构建可能**不包括 macOS 应用版本发布**，这没问题：

- 仍然可以发布 git 标签和 npm dist-tag。
- 在发行说明或变更日志中注明“该测试版无 macOS 构建”。
