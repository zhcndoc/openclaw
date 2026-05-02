---
summary: "CLI 参考：`openclaw update`（相对安全的源码更新 + 网关自动重启）"
read_when:
  - 你想安全地更新一个源码检出
  - 你需要了解 `--update` 简写行为
title: "更新"
---

# `openclaw update`

安全地更新 OpenClaw，并在 stable/beta/dev 渠道之间切换。

如果你是通过 **npm/pnpm/bun** 安装的（全局安装，没有 git 元数据），
更新会通过 [更新](/install/updating) 中的包管理器流程进行。

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

- `--no-restart`：成功更新后跳过重启 Gateway 服务。需要重启 Gateway 的包管理器更新会在命令成功前验证重启后的服务报告的是预期的更新版本。
- `--channel <stable|beta|dev>`：设置更新渠道（git + npm；持久化到配置中）。
- `--tag <dist-tag|version|spec>`：仅为此次更新覆盖包目标。对于包安装，`main` 映射到 `github:openclaw/openclaw#main`。
- `--dry-run`：预览计划中的更新操作（channel/tag/target/restart 流程），不会写入配置、安装、同步插件或重启。
- `--json`：输出机器可读的 `UpdateRunResult` JSON，包括
  在更新后插件同步期间检测到 npm 插件制品漂移时的
  `postUpdate.plugins.integrityDrifts`。
- `--timeout <seconds>`：每一步的超时时间（默认 1800 秒）。
- `--yes`：跳过确认提示（例如降级确认）。

<Warning>
降级需要确认，因为旧版本可能会破坏配置。
</Warning>

## `update status`

显示当前启用的更新渠道 + git tag/branch/SHA（适用于源码检出），以及更新可用性。

```bash
openclaw update status
openclaw update status --json
openclaw update status --timeout 10
```

选项：

- `--json`：输出机器可读的状态 JSON。
- `--timeout <seconds>`：检查超时时间（默认 3 秒）。

## `update wizard`

交互式流程，用于选择更新渠道，并确认在更新后是否重启 Gateway
（默认会重启）。如果你在没有 git 检出的情况下选择 `dev`，
它会提供创建一个检出。

选项：

- `--timeout <seconds>`：每个更新步骤的超时时间（默认 `1800`）

## 它做什么

当你显式切换渠道（`--channel ...`）时，OpenClaw 也会保持
安装方式一致：

- `dev` → 确保有一个 git 检出（默认：`~/openclaw`，可通过 `OPENCLAW_GIT_DIR` 覆盖），
  更新它，并从该检出安装全局 CLI。
- `stable` → 使用 `latest` 从 npm 安装。
- `beta` → 优先使用 npm dist-tag `beta`，但当 beta 缺失或比当前 stable 发布更旧时，
  回退到 `latest`。

当启用配置中的自动更新器时，Gateway 核心自动更新器会在实时 Gateway 请求处理程序之外启动 CLI 更新路径。
控制平面 `update.run` 包管理器更新会在包交换后强制执行非延迟、无冷却的更新重启，
因为旧的 Gateway 进程仍可能在内存中持有指向
新包删除文件的块。

对于包管理器安装，`openclaw update` 会在调用包管理器之前先解析目标包
版本。npm 全局安装使用分阶段安装：OpenClaw 先将新包安装到一个临时的 npm 前缀中，验证
那里的打包 `dist` 清单，然后把那个干净的包树交换到
真实的全局前缀中。如果验证失败，更新后的 doctor、插件同步以及
重启工作都不会从可疑的树中运行。即使已安装版本
已经与目标匹配，命令也会刷新全局包安装，
然后运行插件同步、核心命令补全刷新和重启工作。这使得
打包的 sidecar 和由渠道拥有的插件记录与
已安装的 OpenClaw 构建保持一致，同时将完整的插件命令补全重建留给
显式的 `openclaw completion --write-state` 运行。

当安装了本地受管理的 Gateway 服务并且启用了重启时，
包管理器更新会在替换包
树之前停止正在运行的服务，然后从更新后的安装中刷新服务元数据，重启该
服务，并验证重启后的 Gateway 报告的是预期版本。使用
`--no-restart` 时，包替换仍会运行，但受管理服务不会被
停止或重启，因此运行中的 Gateway 可能会继续使用旧代码，直到你手动重启
它。

## Git 检出流程

### 渠道选择

- `stable`：检出最新的非 beta 标签，然后构建并运行 doctor。
- `beta`：优先使用最新的 `-beta` 标签，但如果 beta 缺失或更旧，则回退到最新的 stable 标签。
- `dev`：检出 `main`，然后 fetch 并 rebase。

### 更新步骤

<Steps>
  <Step title="验证工作区干净">
    需要没有未提交的更改。
  </Step>
  <Step title="切换渠道">
    切换到所选渠道（tag 或 branch）。
  </Step>
  <Step title="获取上游">
    仅 dev。
  </Step>
  <Step title="预检构建（仅 dev）">
    在临时工作区中运行 lint 和 TypeScript 构建。如果最新提交失败，则最多回退 10 个提交以找到最新的可干净构建。
  </Step>
  <Step title="Rebase">
    在所选提交上执行 rebase（仅 dev）。
  </Step>
  <Step title="安装依赖">
    使用仓库的包管理器。对于 pnpm 检出，更新器会按需引导安装 `pnpm`（先通过 `corepack`，然后作为临时回退执行 `npm install pnpm@10`），而不是在 pnpm 工作区内运行 `npm run build`。
  </Step>
  <Step title="构建 Control UI">
    构建 gateway 和 Control UI。
  </Step>
  <Step title="运行 doctor">
    `openclaw doctor` 作为最终的安全更新检查运行。
  </Step>
  <Step title="同步插件">
    将插件同步到当前活跃渠道。dev 使用内置插件；stable 和 beta 使用 npm。更新通过 npm 安装的插件。
  </Step>
</Steps>

<Warning>
如果一个精确固定的 npm 插件更新解析到的制品，其完整性与存储的安装记录不同，`openclaw update` 会中止该插件制品更新，而不是安装它。只有在确认你信任新制品之后，才重新安装或显式更新该插件。
</Warning>

<Note>
更新后的插件同步失败会使更新结果失败，并停止后续的重启工作。请修复插件安装或更新错误，然后重新运行 `openclaw update`。

当更新后的 Gateway 启动时，插件加载仅限于验证：启动不会运行包管理器或修改依赖树。包管理器 `update.run` 重启会在包树交换后绕过正常的空闲延迟和重启冷却时间，因此旧进程无法继续懒加载已移除的块。

如果 pnpm 引导仍然失败，更新器会以包管理器特定错误提前停止，而不会尝试在检出目录内运行 `npm run build`。
</Note>

## `--update` 简写

`openclaw --update` 会重写为 `openclaw update`（对 shell 和启动脚本很有用）。

## 相关内容

- `openclaw doctor`（在 git 检出上会提供先运行更新）
- [开发渠道](/install/development-channels)
- [更新](/install/updating)
- [CLI 参考](/cli)
