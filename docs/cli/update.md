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

- `--no-restart`: 在成功更新后跳过重启 Gateway 服务。
- `--channel <stable|beta|dev>`: 设置更新频道（git + npm；持久化保存到配置中）。
- `--tag <dist-tag|version|spec>`: 仅为本次更新覆盖包目标。对于包安装，`main` 会映射到 `github:openclaw/openclaw#main`。
- `--dry-run`: 预览计划中的更新操作（频道/标签/目标/重启流程），而不写入配置、安装、同步插件或重启。
- `--json`: 输出机器可读的 `UpdateRunResult` JSON，包括
  在更新后插件同步期间检测到 npm 插件制品漂移时的
  `postUpdate.plugins.integrityDrifts`。
- `--timeout <seconds>`: 每个步骤的超时时间（默认 1200 秒）。
- `--yes`: 跳过确认提示（例如降级确认）

注意：降级操作需要确认，因为较旧版本可能会破坏配置。

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

对于包管理器安装，`openclaw update` 会在调用包管理器之前先解析目标包版本。如果已安装版本与目标版本完全匹配，并且不需要持久化更新频道变更，则命令会在执行包安装、插件同步、补全刷新或 Gateway 重启之前以“已跳过”状态退出。

## Git 检出流程

频道：

- `stable`: 检出最新的非 beta 标签，然后构建 + doctor。
- `beta`: 首选最新的 `-beta` 标签，但当 beta 缺失或较旧时回退到最新的稳定标签。
- `dev`: 检出 `main`，然后 fetch + rebase。

高层流程：

1. 需要一个干净的工作树（没有未提交的更改）。
2. 切换到所选频道（标签或分支）。
3. 获取上游更新（仅 dev）。
4. 仅 dev：在临时工作树中进行预检 lint + TypeScript 构建；如果最新提交失败，则最多回退 10 个提交以找到最新可通过构建的提交。
5. 仅 dev：rebase 到所选提交。
6. 使用仓库的包管理器安装依赖。对于 pnpm 检出版本，更新器会按需引导 pnpm（先通过 `corepack`，再临时回退到 `npm install pnpm@10`），而不是在 pnpm 工作区内运行 `npm run build`。
7. 构建 + 构建 Control UI。
8. 运行 `openclaw doctor` 作为最终的“安全更新”检查。
9. 将插件同步到当前活动频道（dev 使用内置插件；stable/beta 使用 npm），并更新通过 npm 安装的插件。

如果某个精确固定的 npm 插件更新解析到了一个其完整性与已存储安装记录不同的制品，`openclaw update` 会中止该插件制品更新，而不是安装它。只有在确认你信任新制品之后，才应显式重新安装或更新该插件。

如果 pnpm 引导仍然失败，更新器现在会以包管理器特定错误提前停止，而不会尝试在检出版本内运行 `npm run build`。

## `--update` 简写

`openclaw --update` 等价于 `openclaw update`（对 shell 脚本和启动器脚本很有用）。

## Related

- `openclaw doctor`（在 git 检出版本上建议先运行更新）
- [开发频道](/install/development-channels)
- [更新](/install/updating)
- [CLI 参考](/cli)
