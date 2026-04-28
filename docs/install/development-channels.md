---
summary: "stable、beta 和 dev 渠道：语义、切换、固定和标记"
read_when:
  - 您想在 stable/beta/dev 之间切换
  - 您想固定到特定版本、标签或 SHA
  - 您正在标记或发布预发布版本
title: "发布渠道"
sidebarTitle: "发布渠道"
---

# 开发渠道

OpenClaw 提供三个更新渠道：

- **stable**: npm dist-tag `latest`。建议大多数用户使用。
- **beta**: 当 `beta` 是当前版本时，使用 npm dist-tag `beta`；如果 `beta` 缺失，或比
  最新的 stable 版本更旧，则更新流程会回退到 `latest`。
- **dev**: `main`（git）的最新头部。npm dist-tag：`dev`（发布时）。
  `main` 分支用于实验和积极开发。它可能包含
  不完整的功能或破坏性更改。不要将其用于生产网关。

我们通常先将 stable 构建发布到 **beta**，在那里进行测试，然后执行一个
显式晋升步骤，在不
更改版本号的情况下，将经过验证的构建移动到 `latest`。维护者也可以在需要时
直接将 stable 版本发布到 `latest`。dist-tag 是 npm
安装的事实来源。

## 切换渠道

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

`--channel` 将您的选择持久化到配置中（`update.channel`）并匹配安装方法：

- **`stable`** (package installs): 通过 npm dist-tag `latest` 更新。
- **`beta`** (package installs): 优先使用 npm dist-tag `beta`，但当 `beta` 缺失或比
  当前 stable tag 更旧时，会回退到
  `latest`。
- **`stable`** (git installs): 检出最新的 stable git tag。
- **`beta`** (git installs): 优先使用最新的 beta git tag，但当 beta 缺失或更旧时，
  回退到最新的 stable git tag。
- **`dev`**: 确保存在一个 git 检出（默认 `~/openclaw`，可用
  `OPENCLAW_GIT_DIR` 覆盖），切换到 `main`，基于上游进行 rebase，构建，并
  从该检出安装全局 CLI。

<Tip>
如果您想同时使用 stable 和 dev，请保留两个克隆，并让您的网关指向 stable 那个。
</Tip>

## 一次性版本或标签定位

使用 `--tag` 针对特定 dist-tag、版本或包规范进行单次更新，**不**更改您持久化的渠道：

```bash
# 安装特定版本
openclaw update --tag 2026.4.1-beta.1

# 从 beta dist-tag 安装（一次性，不持久化）
openclaw update --tag beta

# 从 GitHub main 分支安装（npm tarball）
openclaw update --tag main

# 安装特定的 npm 包规范
openclaw update --tag openclaw@2026.4.1-beta.1
```

注意：

- `--tag` 仅适用于 **package (npm) installs**。Git installs 会忽略它。
- 该标签不会被持久化。您下一次运行 `openclaw update` 时仍会像平常一样使用您配置的
  渠道。
- 降级保护：如果目标版本比您当前版本更旧，
  OpenClaw 会提示确认（可用 `--yes` 跳过）。
- `--channel beta` 与 `--tag beta` 不同：渠道流程在 beta 缺失或更旧时可以回退
  到 stable/latest，而 `--tag beta` 则在那一次运行中直接目标指向原始的
  `beta` dist-tag。

## 模拟运行

预览 `openclaw update` 将在不进行更改的情况下执行的操作：

```bash
openclaw update --dry-run
openclaw update --channel beta --dry-run
openclaw update --tag 2026.4.1-beta.1 --dry-run
openclaw update --dry-run --json
```

模拟运行将显示有效渠道、目标版本、计划的操作以及是否需要降级确认。

## 插件和渠道

当您使用 `openclaw update` 切换渠道时，OpenClaw 也会同步插件源：

- `dev` 优先使用 git 检出中的捆绑插件。
- `stable` 和 `beta` 恢复 npm 安装的插件包。
- npm 安装的插件会在核心更新完成后更新。

## 检查当前状态

```bash
openclaw update status
```

显示活动渠道、安装类型（git 或包）、当前版本和来源（配置、git 标签、git 分支或默认）。

## 标记最佳实践

- 标记您希望 git 检出定位到的发布（stable 使用 `vYYYY.M.D`，beta 使用 `vYYYY.M.D-beta.N`）。
- 为了兼容性，`vYYYY.M.D.beta.N` 也会被识别，但建议使用 `-beta.N`。
- 遗留的 `vYYYY.M.D-<patch>` 标签仍被识别为 stable（非 beta）。
- 保持标签不可变：切勿移动或重用标签。
- npm dist-tags 仍然是 npm 安装的事实来源：
  - `latest` -> stable
  - `beta` -> 候选构建或 beta 优先的 stable 构建
  - `dev` -> main 快照（可选）

## macOS 应用可用性

Beta 和 dev 构建可能**不**包含 macOS 应用发布。这是可以的：

- git tag 和 npm dist-tag 仍然可以发布。
- 在发布说明或更新日志中注明“此 beta 没有 macOS 构建”。

## 相关内容

- [更新](/install/updating)
- [安装器内部机制](/install/installer)
