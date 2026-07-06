---
summary: "稳定、扩展稳定、测试版和开发通道：语义、切换、固定版本和标记"
read_when:
  - 你想在 stable/extended-stable/beta/dev 之间切换
  - 你想固定到特定版本、标签或 SHA
  - 你正在标记或发布预发布版本
title: "发布通道"
sidebarTitle: "发布通道"
---

OpenClaw 提供四个更新通道：

- **stable**: npm dist-tag `latest`。推荐大多数用户使用。
- **extended-stable**: npm dist-tag `extended-stable`。一个全新的、后置的
  受支持月份包通道。此版本中仅支持包级，且仅支持前台使用。
- **beta**: npm dist-tag `beta`。当 `beta` 缺失
  或比当前稳定版更旧时，回退到 `latest`。
- **dev**: `main`（git）的移动头指针。发布时对应 npm dist-tag `dev`。`main`
  用于实验和积极开发；它可能包含不完整
  的功能或破坏性变更。不要在生产网关上运行它。

稳定版构建通常会先发布到 **beta**，在那里经过验证，然后再在不更改版本号的情况下
提升到 **latest**。维护者也可以直接发布到 `latest`。Dist-tag 是 npm 安装的事实来源。

## 切换通道

```bash
openclaw update --channel stable
openclaw update --channel extended-stable
openclaw update --channel beta
openclaw update --channel dev
```

`--channel` 会将选择持久化到配置中的 `update.channel`，并驱动这两种
安装路径：

| 通道              | npm/package 安装                                                                                                                                                                   | git 安装                                                                                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stable`         | dist-tag `latest`                                                                                                                                                                  | 最新稳定 git 标签（不包括 `-alpha.N`、`-beta.N`、`-rc.N`、`-dev.N`、`-next.N`、`-preview.N`、`-canary.N`、`-nightly.N` 以及其他命名的预发布后缀） |
| `extended-stable` | 解析公开 npm `extended-stable` 选择器，验证所选中的确切包，并安装该精确版本。若无法解析则直接失败，不会回退到 `latest`、`beta` 或 `dev`。 | 不支持：OpenClaw 会保持检出状态不变，并要求你改用包安装方式                                                                     |
| `beta`           | dist-tag `beta`，当 `beta` 缺失或更旧时回退到 `latest`                                                                                                                             | 最新 beta git 标签，当 beta 缺失或更旧时回退到最新稳定 git 标签                                                                       |
| `dev`            | dist-tag `dev`（较少使用；大多数 dev 用户运行 git 安装）                                                                                                                                 | 拉取、将检出内容 rebase 到上游 `main` 分支、构建，并重新安装全局 CLI                                                                 |

对于 `dev` 的 git 安装，默认检出目录是 `~/openclaw`（或者当
设置了 `OPENCLAW_HOME` 时为 `$OPENCLAW_HOME/openclaw`）；可通过
`OPENCLAW_GIT_DIR` 覆盖。

<Tip>
要让 stable 和 dev 并行使用，请使用两个独立的检出目录，并让各自的网关指向自己的目录。
</Tip>

## 一次性版本或标签目标

使用 `--tag` 来针对特定的 dist-tag、版本或包规范进行单次更新，**不会**更改持久化的 channel：

```bash
# 安装特定版本
openclaw update --tag 2026.4.1-beta.1

# 从 beta dist-tag 安装（一次性，不会持久化）
openclaw update --tag beta

# 切换到会持续跟踪的 GitHub main 检出版本（持久化）
openclaw update --channel dev

# 安装特定的 npm 包规范
openclaw update --tag openclaw@2026.4.1-beta.1

# 从 GitHub main 安装一次，而不持久化通道
openclaw update --tag main
```

注意：

- `--tag` 仅适用于 **package（npm）安装**；git 安装会忽略它。
- 该标签不会被持久化；下一次 `openclaw update` 会使用已配置的
  channel。
- `--tag main` 会映射为一次性运行所用的 npm 兼容规范
  `github:openclaw/openclaw#main`。如果要进行持久化的 `main` 跟踪安装，请使用
  `openclaw update --channel dev`（package 安装会切换到 git 检出版本）
  或通过安装器的 git 方法重新安装：
  `curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --version main`。
  npm 安装路径会直接拒绝 GitHub/git 源目标，并会引导你改用
  git 方法。
- 降级保护：如果目标版本比当前
  版本更旧，OpenClaw 会提示确认（可用 `--yes` 跳过）。
- extended-stable 始终使用其已验证的精确 package 目标。它不是
  `--tag extended-stable` 的一次性别名，并且 `--tag` 不能与有效的 extended-stable channel 组合使用。
- `--channel beta` 与 `--tag beta` 不同：channel 流程在 beta 缺失或更旧时
  可以回退到 stable/latest，而 `--tag beta` 总是
  在该次运行中直接针对原始的 `beta` dist-tag。

## 试运行

在不进行更改的情况下预览 `openclaw update` 会做什么：

```bash
openclaw update --dry-run
openclaw update --channel beta --dry-run
openclaw update --tag 2026.4.1-beta.1 --dry-run
openclaw update --dry-run --json
```

试运行会报告生效的通道、目标版本、计划执行的操作，以及是否需要降级确认。

## 插件和通道

使用 `openclaw update` 切换通道时，也会同步插件来源：

- `dev` 会将那些有捆绑对应版本的已安装插件切回到其捆绑的（git checkout）来源。
- `stable` 和 `beta` 会恢复 npm 安装或 ClawHub 安装的插件包。
- `extended-stable` 目前在核心包成功后，仍使用现有的 stable/latest 插件线路。尚未查询官方插件 `@extended-stable` 选择器。
- npm 安装的插件会在核心更新完成后更新。

## 检查当前状态

```bash
openclaw update status
```

显示当前激活的通道（以及决定该通道的来源：config、git tag、git branch、installed version 或 default）、安装类型（git 或 package）、当前版本，以及更新可用性。

## 标签最佳实践

- 将你希望 git 检出落到的发布版本打上标签：稳定版使用 `vYYYY.M.PATCH`，
  beta 版使用 `vYYYY.M.PATCH-beta.N`。诸如
  `-alpha.N`、`-rc.N` 和 `-next.N` 之类的命名预发布后缀不是稳定版或 beta 版目标。
- 为兼容性考虑，旧式的数字稳定标签（如 `vYYYY.M.PATCH-1` 和 `v1.0.1-1`）仍会
  被识别为稳定的 git 标签。
- `vYYYY.M.PATCH.beta.N`（以点分隔）也会为兼容性而被识别；优先使用 `-beta.N`。
- 保持标签不可变：切勿移动或重用标签。
- npm dist-tags 仍然是 npm 安装的事实来源：
  - `latest` -> 稳定版
  - `extended-stable` -> 受支持月份包的滞后发布
  - `beta` -> 候选构建或 beta 优先的稳定版构建
  - `dev` -> 主分支快照（可选）

## macOS 应用可用性

Beta 和开发版本可能**不**包含 macOS 应用发布。这是可以的：

- git 标签和 npm dist-tag 仍然可以独立发布。
- 在发布说明或更新日志中注明“此 beta 没有 macOS 构建”。

## 相关内容

- [更新](/install/updating)
- [安装器内部](/install/installer)
