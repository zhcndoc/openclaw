---
summary: "稳定、beta 和 dev 通道：语义、切换、固定和标签"
read_when:
  - 你想在 stable/beta/dev 之间切换
  - 你想固定到特定版本、标签或 SHA
  - 你正在为预发布版本打标签或发布
title: "发布通道"
sidebarTitle: "发布通道"
---

OpenClaw 提供三个更新通道：

- **stable**: npm dist-tag `latest`。推荐大多数用户使用。
- **beta**: 当 beta 为当前版本时使用 npm dist-tag `beta`；如果 beta 缺失，或比
  最新的 stable 发布更旧，更新流程会回退到 `latest`。
- **dev**: `main`（git）的最新头部。npm dist-tag: `dev`（在发布时）。
  `main` 分支用于实验和积极开发。它可能包含
  不完整的功能或破坏性变更。不要将其用于生产网关。

我们通常先将 stable 构建发布到 **beta**，在那里进行测试，然后运行一个
显式晋升步骤，将经过验证的构建移动到 `latest`，而不
更改版本号。维护者也可以在需要时直接将稳定版发布到 `latest`。
Dist-tag 是 npm 安装的事实来源。

## 切换通道

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

`--channel` 会将你的选择持久化到配置中（`update.channel`），并与
安装方式保持一致：

- **`stable`**（包安装）：通过 npm dist-tag `latest` 更新。
- **`beta`**（包安装）：优先使用 npm dist-tag `beta`，但在
  `beta` 缺失或比当前 stable 标签更旧时回退到 `latest`。
- **`stable`**（git 安装）：检出最新的 stable git 标签。
- **`beta`**（git 安装）：优先使用最新的 beta git 标签，但在
  beta 缺失或更旧时回退到最新的 stable git 标签。
- **`dev`**：确保存在一个 git 检出目录（默认 `~/openclaw`，可通过
  `OPENCLAW_GIT_DIR` 覆盖），切换到 `main`，基于上游变基，构建，并
  从该检出目录安装全局 CLI。

<Tip>
如果你想同时保留 stable 和 dev，请保留两个克隆，并将你的网关指向 stable 那个。
</Tip>

## 一次性版本或标签目标

使用 `--tag` 来针对单次更新指定某个 dist-tag、版本或包规范，
**而不**更改你持久化的通道：

```bash
# 安装特定版本
openclaw update --tag 2026.4.1-beta.1

# 从 beta dist-tag 安装（一次性，不会持久化）
openclaw update --tag beta

# 从 GitHub main 分支安装（npm tarball）
openclaw update --tag main

# 安装特定的 npm 包规范
openclaw update --tag openclaw@2026.4.1-beta.1
```

注意：

- `--tag` 仅适用于**包（npm）安装**。git 安装会忽略它。
- 该标签不会被持久化。你下一次运行 `openclaw update` 时会照常使用你配置的
  通道。
- 降级保护：如果目标版本比你当前版本更旧，OpenClaw 会提示确认（可用 `--yes` 跳过）。
- `--channel beta` 与 `--tag beta` 不同：通道流程在 beta 缺失或更旧时可以回退到
  stable/latest，而 `--tag beta` 仅针对那一次运行直接使用
  原始的 `beta` dist-tag。

## 试运行

在不进行更改的情况下预览 `openclaw update` 会做什么：

```bash
openclaw update --dry-run
openclaw update --channel beta --dry-run
openclaw update --tag 2026.4.1-beta.1 --dry-run
openclaw update --dry-run --json
```

试运行会显示有效通道、目标版本、计划执行的操作，以及
是否需要降级确认。

## 插件和通道

当你使用 `openclaw update` 切换通道时，OpenClaw 也会同步插件
来源：

- `dev` 优先使用 git 检出目录中的内置插件。
- `stable` 和 `beta` 会恢复 npm 安装的插件包。
- npm 安装的插件会在核心更新完成后更新。

## 检查当前状态

```bash
openclaw update status
```

显示当前通道、安装类型（git 或 package）、当前版本，以及
来源（配置、git 标签、git 分支或默认值）。

## 标签最佳实践

- 为你希望 git 检出使用的版本打标签（稳定版使用 `vYYYY.M.D`，beta 使用 `vYYYY.M.D-beta.N`）。
- `vYYYY.M.D.beta.N` 也被识别以兼容旧格式，但建议使用 `-beta.N`。
- 旧式 `vYYYY.M.D-<patch>` 标签仍会被识别为 stable（非 beta）。
- 保持标签不可变：绝不要移动或重复使用标签。
- npm dist-tags 仍然是 npm 安装的事实来源：
  - `latest` -> stable
  - `beta` -> 候选构建或先 beta 后 stable 的构建
  - `dev` -> main 快照（可选）

## macOS 应用可用性

Beta 和 dev 构建可能**不**包含 macOS 应用发布。这没问题：

- git 标签和 npm dist-tag 仍然可以发布。
- 在发布说明或变更日志中注明“此 beta 没有 macOS 构建”。

## 相关内容

- [更新](/install/updating)
- [安装器内部](/install/installer)
