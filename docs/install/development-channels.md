---
summary: "稳定、扩展稳定、测试版和开发通道：语义、切换、固定版本和标记"
read_when:
  - "你想在 stable/extended-stable/beta/dev 之间切换"
  - "你想固定到特定版本、标签或 SHA"
  - "你正在标记或发布预发布版本"
title: "发布通道"
sidebarTitle: "发布通道"
---

OpenClaw 提供四个更新通道：

- **stable**：npm dist-tag `latest`。推荐大多数用户使用。
- **extended-stable**：npm dist-tag `extended-stable`。这是一个全新的、滞后一个受支持月份的软件包通道。它仅适用于软件包，安装仅在前台进行。当启用 `update.checkOnStart` 时，它会接收只读的更新提示，包括直接安装最终的 extended-stable 软件包，但绝不会自动应用更新。
- **beta**：npm `beta` 和 `latest` dist 标签中按语义版本顺序排列的最新版本。较旧的测试版标签永远不会取代较新的稳定版本。
- **dev**：`main` （git） 的移动头，包括从软件包安装切换时。 `main` 用于实验和积极开发；它可能包含不完整的功能或重大更改。不要为生产网关运行它。

稳定版构建通常会先发布到 **beta**，在那里经过验证，然后再在不更改版本号的情况下提升到 **latest**。维护者也可以直接发布到 `latest`。Dist-tag 是 npm 安装的事实来源。

## <a id="switching-channels"></a> 切换通道

```bash
openclaw update --channel stable
openclaw update --channel extended-stable
openclaw update --channel beta
openclaw update --channel dev
```

`--channel` 驱动更新，并在核心更新成功后在配置中保留对 `update.channel` 的选择。拒绝或失败的核心更新会保留之前的频道。所选频道驱动两个安装路径：

| 渠道           | npm/package 安装                                                                                                                                                                                    | git 安装                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `stable`          | 距离标签 `latest`                                                                                                                                                                                       | 切换到 npm 封装 `latest`                                                            |
| `extended-stable` | 解析公共 npm `extended-stable` 选择器，验证确切选定的包，并安装该确切版本。出现验证错误时停止，不会回退到 `latest`、`beta` 或 `dev`。 | 不支持：OpenClaw 会保持检出状态不变，并要求你改用包安装方式     |
| `beta`            | dist-tag `beta`，当 `beta` 丢失或更旧时回退到 `latest`                                                                                                                               | 切换到 `beta` 处的 npm 软件包，当 beta 缺失或较旧时回退到 `latest`      |
| `dev`             | 切换到 Git 签出，构建它，然后重新安装全局 CLI                                                                                                                                    | 拉取、将检出内容 rebase 到上游 `main` 分支、构建，并重新安装全局 CLI |

显式 `--channel stable` 或 `--channel beta` 将 Git 安装切换为包安装。 Git 签出中的裸 `openclaw update` 与先前存储的稳定版或测试版通道相反，会选择相应的 Git 标签。对于这些 Git 标记更新，OpenClaw 刷新分支而不对其配置的引用规范添加强制，然后仅从发布远程强制刷新标记。保留的 `branch.main.remote` 设置优先，其次是 `origin` 或唯一配置的远程设置。如果有多个遥控器且两者都没有选择，请在重试之前将 `branch.main.remote` 设置为发布版本的遥控器。重新创建的发布标签替换了旧副本；保留仅限本地的标签。即使启用了 Git 的 `fetch.pruneTags` 设置，标签修剪也会被禁用。这些保证假设标准分支获取映射；明确包含标签的自定义 `remote.*.fetch` 映射仍然遵循 Git 的配置行为。正常的 CLI 在接受更新之前会检查私有存储库中的这些引用，因此拒绝的更新会使已安装的签出的引用保持不变。

对于托管网关，成功的切换会在检查准备情况之前将服务刷新到已验证的安装。拒绝切换或验证回滚恢复之前的服务；未经证实的恢复使其停止接受检查。

对于 `dev` git 安装，默认签出为 `~/openclaw`（或设置 `OPENCLAW_HOME` 时为 `$OPENCLAW_HOME/openclaw`）；用 `OPENCLAW_GIT_DIR` 覆盖。自动更新活动固定他们宣布的上游提交，因此即使 `main` 在倒计时期间前进，显示的列表也可以预览来自安装的确切目标的最多五个提交。手册`openclaw update --channel dev`仍然针对当前上游`main`。

完整的 Git 跟踪配置优先用于开发源选择。对于没有跟踪的分离安装，当其收据与安装根目录和当前提交匹配时，网关检查还会保留明确保存的自定义上游。缺失、过时、格式错误、排除或无法解析的提示不会否决正常的 `origin/main` 默认值。有效自定义源上的网络故障会报告不可用的比较，而不是默默地切换到源。如果没有本地 `main` 或 `origin`，单独配置的远程设备仍然是 `main` 的受支持源。没有跟踪的多个遥控器是不明确的； OpenClaw不选择第一个。

收据提示不会重写 Git 配置。要使自定义源在网关检查、独立 CLI 状态、预览和手动更新中保持不变，请显式配置 Git 跟踪。对于现有的本地 `main` 分支，请使用 `git branch --set-upstream-to=<remote>/<branch> main`。对于没有本地 `main` 的独立安装，请使用远程名称和完整源引用（例如 `refs/heads/main`）将 `branch.main.remote` 和 `branch.main.merge` 设置为 `git config`。独立的 CLI 状态和试运行不会补充仅收据提示。自动活动将其选择的源和固定的提交付诸执行。保存的安装历史记录还提供与当前结帐匹配的安装时间；未能写入可选历史记录不会导致更新失败。

<Tip>
要让 stable 和 dev 并行使用，请使用两个独立的检出目录，并让各自的网关指向自己的目录。
</Tip>

## <a id="one-off-version-or-tag-targeting"></a> 一次性版本或标签目标

使用 `--tag` 来针对特定的 dist-tag、版本或包规范进行单次更新，**不会**更改持久化的 channel：

```bash
# Install a specific version
openclaw update --tag 2026.4.1-beta.1

# Install from the beta dist-tag (one-off, does not persist)
openclaw update --tag beta

# Switch to the moving GitHub main checkout (persistent)
openclaw update --channel dev

# Install a specific npm package spec
openclaw update --tag openclaw@2026.4.1-beta.1

```

注意：

- `--tag` 仅适用于 **package（npm）安装**；git 安装会忽略它。
- 该标签不会被持久化；下一次 `openclaw update` 会使用已配置的 channel。
- 存储了 `update.channel: "dev"` 的 A 软件包安装仍然支持一次性 `--tag`，而无需切换到 Git。显式 `--channel dev` 优先于 `--tag` 并选择 Git 签出流程。
- `--tag main` 简写在包安装时被拒绝，因为工作区签出不是独立的包工件。使用 `openclaw update --channel dev`（软件包安装切换到 git checkout）或使用安装程序的 git 方法重新安装：`curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --version main`。
- 降级保护：如果目标版本比当前版本更旧，OpenClaw 会提示确认（可用 `--yes` 跳过）。
- extended-stable 始终使用其已验证的精确 package 目标。它不是 `--tag extended-stable` 的一次性别名，并且 `--tag` 不能与有效的 extended-stable channel 组合使用。
- `--channel beta` 与 `--tag beta` 不同：channel 流程在 beta 缺失或更旧时可以回退到 stable/latest，而 `--tag beta` 总是在该次运行中直接针对原始的 `beta` dist-tag。

## <a id="dry-run"></a> 试运行

在不进行更改的情况下预览 `openclaw update` 会做什么：

```bash
openclaw update --dry-run
openclaw update --channel beta --dry-run
openclaw update --tag 2026.4.1-beta.1 --dry-run
openclaw update --dry-run --json
```

试运行会报告生效的通道、目标版本、计划执行的操作，以及是否需要降级确认。

## <a id="plugins-and-channels"></a> 插件和通道

使用 `openclaw update` 切换通道时，也会同步插件来源：

- `dev` 会将已安装且有对应内置版本的插件切回其内置（git checkout）来源。
- `stable` 和 `beta` 恢复 npm- 安装的或 ClawHub- 安装的插件包。
- `extended-stable` 将符合条件的官方 npm 插件与 bare/default 或 `latest` 意图解析为确切安装的核心版本。它不会在运行时查询插件 `@extended-stable` 标签。版本绑定的运行时插件使用基本版本组来进行修正版本（例如，`YYYY.M.P-2` 使用插件 `YYYY.M.P`）。
- npm-安装的插件在核心更新完成后更新。
- `beta` 对托管 npm 插件（包括 `@openclaw/codex` 等官方插件）使用相同的最新 `beta`/`latest` 规则。精确版本和范围引脚保留其选择器。启动修复会保留现有的插件，而不是重新安装它并需要再次重新启动。

## <a id="checking-current-status"></a> 检查当前状态

```bash
openclaw update status
```

显示活动通道（以及决定它的源：配置、git 标签、git 分支、安装版本或默认版本）、安装类型（git 或包）、当前版本和更新可用性。它还显示上次记录的更新运行，包括失败的提取。普通 `openclaw status` 使用缓存的 Git 引用而不进行提取。如果当前状态目录中最新记录的更新获取失败，则会显示 `update check stale: last update fetch failed` 以及失败的时间和简短原因，而不是 `up to date`。 Ahead/behind 计数标记为 `cached`。即使更新的其余部分被跳过、失败或回滚，稍后运行已完成提取的更新也会清除警告。手册`git fetch`不会清除记录的警告。使用 `openclaw update status` 进行新的可用性检查或再次运行 `openclaw update`。 `openclaw status --deep` 也会获取该支票，而不更改分类账。

## <a id="tagging-best-practices"></a> 标签最佳实践

- Tag 发布了您想要 git checkouts 登陆的版本：`vYYYY.M.PATCH`，带有补丁 `1` 到 `32` 用于常规稳定版，`vYYYY.M.PATCH-beta.N` 用于测试版。命名的预发布后缀（例如 `-alpha.N`、`-rc.N` 和 `-next.N`）不是稳定或 beta 目标。
- 旧版数字稳定标签（例如 `vYYYY.M.PATCH-1` 和 `v1.0.1-1`）仍被视为稳定的 git 标签以实现兼容性，每月补丁 `33` 及更高版本除外。这些补丁保留用于扩展稳定版；最终标签和数字修正变体从来都不是常规的稳定目标或测试版的稳定后备。扩展稳定版仍然是仅包含软件包的更新通道。
- `vYYYY.M.PATCH.beta.N`（以点分隔）也会为兼容性而被识别；优先使用 `-beta.N`。
- 保持标签不可变：切勿移动或重用标签。
- npm dist-tags 仍然是 npm 安装的事实来源：
  - `latest` -> 稳定版
  - `extended-stable` -> 受支持月份包的滞后发布
  - `beta` -> 候选构建或 beta 优先的稳定版构建
  - `dev` -> 主分支快照（可选）

## <a id="macos-app-availability"></a> macOS 应用可用性

Beta 和开发版本可能**不**包含 macOS 应用发布。这是可以的：

- git 标签和 npm dist-tag 仍然可以独立发布。
- 在发布说明或更新日志中注明“此 beta 没有 macOS 构建”。

## <a id="related"></a> 相关内容

- [更新](/install/updating)
- [安装器内部](/install/installer)
- [发布政策](/reference/RELEASING) - 如何将版本剪切并发布到这些渠道中
