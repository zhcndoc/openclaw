---
summary: "`openclaw update` 的命令行参考（较安全的源码更新 + 网关自动重启）"
read_when:
  - 您想安全地更新源码检出版本
  - 您需要了解 `--update` 简写行为
title: "更新"
---

# `openclaw update`

安全地更新 OpenClaw 并在 stable/beta/dev 频道之间切换。

如果您是通过 **npm/pnpm/bun** 安装的（全局安装，无 git 元数据），
更新将通过 [更新](/install/updating) 中的包管理器流程进行。

## 用法

```bash
openclaw update
openclaw update status
openclaw update wizard
openclaw update --channel beta
openclaw update --channel dev
openclaw update --tag beta
openclaw update --tag main
openclaw update --dry-run
openclaw update --no-restart
openclaw update --yes
openclaw update --json
openclaw --update
```

## 选项

- `--no-restart`: 成功更新后跳过重启 Gateway 服务。对于会重启 Gateway 的包管理器更新，会在命令成功前验证重启后的服务报告的是预期的更新版本。
- `--channel <stable|beta|dev>`: 设置更新频道（git + npm；持久保存到配置中）。
- `--tag <dist-tag|version|spec>`: 仅为本次更新覆盖包目标。对于包安装，`main` 映射为 `github:openclaw/openclaw#main`。
- `--dry-run`: 预览计划中的更新操作（频道/标签/目标/重启流程），而不写入配置、安装、同步插件或重启。
- `--json`: 输出机器可读的 `UpdateRunResult` JSON，包括在更新后插件同步期间检测到 npm 插件制品漂移时的
  `postUpdate.plugins.integrityDrifts`。
- `--timeout <seconds>`: 每个步骤的超时时间（默认 1800 秒）。
- `--yes`: 跳过确认提示（例如降级确认）。

<Warning>
降级需要确认，因为旧版本可能会破坏配置。
</Warning>

## `update status`

显示当前活动的更新频道 + git 标签/分支/SHA（针对源码检出版本），以及更新可用状态。

```bash
openclaw update status
openclaw update status --json
openclaw update status --timeout 10
```

选项：

- `--json`: 输出机器可读的状态 JSON。
- `--timeout <秒>`: 检查超时（默认 3 秒）。

## `update wizard`

交互式流程，用于选择更新频道并确认更新后是否重启 Gateway（默认重启）。如果选择了 `dev` 频道且无 git 检出版本，会提示创建一个。

选项：

- `--timeout <seconds>`: 每个更新步骤的超时时间（默认 `1200`）

## 它做什么

当你明确切换频道（`--channel ...`）时，OpenClaw 也会保持安装方式一致：

- `dev` → 确保 git 检出（默认：`~/openclaw`，可通过 `OPENCLAW_GIT_DIR` 覆盖），更新它，并从该检出安装全局 CLI。
- `stable` → 使用 `latest` 从 npm 安装。
- `beta` → 首选 npm dist-tag `beta`，但当 beta 缺失或比当前稳定版本旧时，回退到 `latest`。

Gateway 核心的自动更新程序（通过配置启用时）也复用同样的更新流程。

对于包管理器安装，`openclaw update` 会在调用包管理器之前解析目标包版本。npm 全局安装使用分阶段安装：OpenClaw 先将新包安装到临时的 npm 前缀中，验证那里的打包 `dist` 清单，然后把那个干净的包树切换到真实的全局前缀中。如果验证失败，则不会在可疑树上运行更新后的 doctor、插件同步和重启工作。即使安装的版本已经与目标版本匹配，命令仍会刷新全局包安装，然后运行插件同步、核心命令补全刷新和重启工作。这样可以让打包的 sidecar 和频道拥有的插件记录与已安装的 OpenClaw 构建保持一致，同时将完整的插件命令补全重建留给显式的 `openclaw completion --write-state` 运行。

## Git 检出流程

### 频道选择

- `stable`: 检出最新的非 beta 标签，然后构建并运行 doctor。
- `beta`: 优先使用最新的 `-beta` 标签，但当 beta 缺失或比当前稳定版本旧时，回退到最新的稳定标签。
- `dev`: 检出 `main`，然后 fetch 并 rebase。

### 更新步骤

<Steps>
  <Step title="验证干净的工作树">
    需要没有未提交的更改。
  </Step>
  <Step title="切换频道">
    切换到所选频道（标签或分支）。
  </Step>
  <Step title="获取上游">
    仅限 dev。
  </Step>
  <Step title="预检构建（仅 dev）">
    在临时工作树中运行 lint 和 TypeScript 构建。如果最新提交失败，则向前回溯最多 10 个提交以找到最新的干净构建。
  </Step>
  <Step title="Rebase">
    重新基于所选提交（仅 dev）。
  </Step>
  <Step title="安装依赖">
    使用仓库的包管理器。对于 pnpm 检出，更新器会按需引导 `pnpm`（先通过 `corepack`，然后回退到临时的 `npm install pnpm@10`），而不是在 pnpm 工作区内运行 `npm run build`。
  </Step>
  <Step title="构建 Control UI">
    构建 gateway 和 Control UI。
  </Step>
  <Step title="运行 doctor">
    `openclaw doctor` 作为最终的安全更新检查运行。
  </Step>
  <Step title="同步插件">
    将插件同步到活动频道。dev 使用捆绑插件；stable 和 beta 使用 npm。更新通过 npm 安装的插件。
  </Step>
</Steps>

<Warning>
如果某个精确固定的 npm 插件更新解析到一个其完整性与存储的安装记录不同的制品，`openclaw update` 会中止该插件制品更新，而不是安装它。只有在确认您信任这个新制品之后，才显式重新安装或更新该插件。
</Warning>

<Note>
更新后的插件同步失败会使更新结果失败，并停止后续的重启工作。请修复插件安装或更新错误，然后重新运行 `openclaw update`。

当更新后的 Gateway 启动时，已启用的捆绑插件运行时依赖会在插件激活前分阶段准备。由更新触发的重启会在关闭 Gateway 之前排空任何正在进行的运行时依赖分阶段准备，因此服务管理器重启不会中断正在进行的 npm 安装。

如果 pnpm 引导仍然失败，更新器会尽早停止并返回特定于包管理器的错误，而不是尝试在检出版本内运行 `npm run build`。
</Note>

`openclaw --update` 等价于 `openclaw update`（对 shell 脚本和启动器脚本很有用）。

## 相关内容

- `openclaw doctor`（在 git 检出版本上建议先运行更新）
- [开发频道](/install/development-channels)
- [更新](/install/updating)
- [CLI 参考](/cli)
