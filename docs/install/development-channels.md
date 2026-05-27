---
summary: "stable、beta 和 dev 通道：语义、切换、固定和标签"
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

- **`stable`** (package installs): 通过 npm dist-tag `latest` 更新。
- **`beta`** (package installs): 优先使用 npm dist-tag `beta`，但当
  `beta` 缺失或比当前 stable 标签更旧时，会回退到 `latest`。
- **`stable`** (git installs): 检出最新的 stable git 标签，排除
  诸如 `-alpha.N`、`-beta.N`、`-rc.N`、`-dev.N`、
  `-next.N`、`-preview.N`、`-canary.N`、`-nightly.N` 等 semver 预发布
  标签以及其他预发布后缀。
- **`beta`** (git installs): 优先使用最新的 beta git 标签，但当 beta 缺失或更旧时，
  回退到最新的 stable git 标签。
- **`dev`**: 确保存在一个 git 检出目录（默认 `~/openclaw`，或
  当设置了 `OPENCLAW_HOME` 时为 `$OPENCLAW_HOME/openclaw`；可用
  `OPENCLAW_GIT_DIR` 覆盖），切换到 `main`，在上游基础上 rebase，构建，并
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

# 切换到不断变化的 GitHub main 检出
openclaw update --channel dev

# 安装特定的 npm 包规范
openclaw update --tag openclaw@2026.4.1-beta.1

# 从 GitHub main 安装一次，而不持久化通道
openclaw update --tag main
```

注意：

- `--tag` 仅适用于**包（npm）安装**。git 安装会忽略它。
- 该标签不会被持久化。你的下一次 `openclaw update` 会照常使用你配置的
  通道。
- 对于包安装，OpenClaw 会在分阶段的 npm 安装之前，将 GitHub/git 源规范预打包为一个
  临时 tarball。当你希望将不断变化的 `main`
  检出作为持久安装时，请使用 `--channel dev` 或 `--install-method git --version main`。
- 降级保护：如果目标版本比当前版本更旧，OpenClaw 会提示确认（可用 `--yes` 跳过）。
- `--channel beta` 与 `--tag beta` 不同：通道流程在 beta 缺失或更旧时可以回退到 stable/latest，而 `--tag beta` 只针对那一次运行的原始 `beta` dist-tag。

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

- 将你希望 git 检出落到其上的发布打上标签（稳定版使用 `vYYYY.M.D`，
  beta 使用 `vYYYY.M.D-beta.N`；命名的 semver 预发布后缀，如
  `-alpha.N`、`-rc.N` 和 `-next.N` 不是稳定目标）。
- 为兼容性，仍会识别旧的数字稳定标签，如 `vYYYY.M.D-1` 和 `v1.0.1-1`
  作为稳定的 git 标签。
- `vYYYY.M.D.beta.N` 也会为了兼容性被识别，但建议使用 `-beta.N`。
- 保持标签不可变：永远不要移动或重复使用标签。
- npm dist-tag 仍然是 npm 安装的事实来源：
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
