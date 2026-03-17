---
summary: "`openclaw update` 的命令行参考（较安全的源码更新 + 网关自动重启）"
read_when:
  - 你想安全地更新源码检出版本
  - 你需要理解 `--update` 简写的行为
title: "update"
---

# `openclaw update`

安全地更新 OpenClaw 并在 stable/beta/dev 频道之间切换。

如果你是通过 **npm/pnpm** 安装的（全局安装，无 git 元数据），更新通过包管理器流程进行，详情请见[更新](/install/updating)。

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
openclaw update --json
openclaw --update
```

## 选项

- `--no-restart`: 更新成功后跳过重启网关服务。
- `--channel <stable|beta|dev>`: 设置更新频道（git + npm；持久化在配置中）。
- `--tag <dist-tag|version|spec>`: 仅本次更新覆盖目标包。对于包安装，`main` 映射到 `github:openclaw/openclaw#main`。
- `--dry-run`: 预览计划的更新操作（频道/标签/目标/重启流程），不写配置、不安装、不同步插件、不重启。
- `--json`: 输出机器可读的 `UpdateRunResult` JSON。
- `--timeout <秒>`: 每个步骤超时时间（默认 1200 秒）。

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

## 功能说明

当你明确切换频道（`--channel ...`）时，OpenClaw 也会保持安装方式一致：

- `dev` → 确保存在一个 git 检出版本（默认路径为 `~/openclaw`，可通过 `OPENCLAW_GIT_DIR` 覆盖），然后更新，它会从该检出版本安装全局 CLI。
- `stable`/`beta` → 从 npm 安装对应的 dist-tag 版本。

Gateway 核心的自动更新程序（通过配置启用时）也复用同样的更新流程。

## Git 检出流程

频道：

- `stable`：检出最新的非 beta 标签，接着构建并运行 doctor。
- `beta`：检出最新的 `-beta` 标签，接着构建并运行 doctor。
- `dev`：检出 `main` 分支，接着执行 fetch 和 rebase。

高层流程：

1. 需要工作区干净（无未提交变更）。
2. 切换到选定的频道（标签或分支）。
3. 拉取上游更新（仅限 dev）。
4. 仅 dev：在一个临时工作区中先执行 lint 和 TypeScript 构建；如果最新提交构建失败，则最多回退 10 个提交寻找最新可用构建。
5. 仅 dev：基于选定提交执行 rebase。
6. 安装依赖（优先 pnpm，若失败则用 npm）。
7. 构建并构建控制 UI。
8. 运行 `openclaw doctor` 作为最终的“安全更新”检查。
9. 同步插件至当前频道（dev 使用内置扩展；stable/beta 使用 npm），并更新 npm 安装的插件。

## `--update` 简写

`openclaw --update` 等价于 `openclaw update`（对 shell 脚本和启动器脚本很有用）。

## 另请参阅

- `openclaw doctor`（在 git 检出版本上建议先运行更新）
- [开发频道](/install/development-channels)
- [更新](/install/updating)
- [CLI 参考](/cli)
