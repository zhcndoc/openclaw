---
summary: "CLI 参考：`openclaw update`（相对安全的源码更新 + 网关自动重启）"
read_when:
  - 你想安全地更新一个源码检出
  - 你正在排查 `openclaw update` 的输出或选项
  - 你需要了解 `--update` 简写行为
title: "更新"
---

# `openclaw update`

更新 OpenClaw，并在 stable/extended-stable/beta/dev 频道之间切换。

如果你是通过 **npm/pnpm/bun** 安装的（全局安装，没有 git 元数据），
更新会走 [更新](/install/updating) 中描述的包管理器流程。

## 用法

```bash
openclaw update
openclaw update status
openclaw update repair
openclaw update wizard
openclaw update --channel extended-stable
openclaw update --channel beta
openclaw update --channel dev
openclaw update --tag beta
openclaw update --tag main
openclaw update --dry-run
openclaw update --no-restart
openclaw update --yes
openclaw update --acknowledge-clawhub-risk
openclaw update --json
openclaw --update
```

`openclaw --update` 会重写为 `openclaw update`（对 shell 和启动器脚本很有用）。

## 选项

| 标志                                             | 说明                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--no-restart`                                   | 在成功更新后跳过重启 Gateway 服务。会重启的包管理器更新会在命令成功前验证重启后的服务报告的是预期版本。                                                                                                                                                |
| `--channel <stable\|extended-stable\|beta\|dev>` | 设置更新渠道，并在核心更新成功后持久保存。extended-stable 仅适用于包。                                                                                                                                                                                                                                            |
| `--tag <dist-tag\|version\|spec>`                | 仅对本次更新覆盖包目标。它不能与有效的 `extended-stable` 渠道一起使用，因为该渠道必须验证精确目标。对于其他包安装，`main` 会映射为 `github:openclaw/openclaw#main`；GitHub/git 源规范会在分阶段的全局 npm 安装之前打包成临时 tarball。 |
| `--dry-run`                                      | 预览计划中的操作（渠道/标签/目标/重启流程），不写入配置、不安装、不同步插件，也不重启。                                                                                                                                                                                                                |
| `--json`                                         | 输出机器可读的 `UpdateRunResult` JSON。当受管插件需要修复时包含 `postUpdate.plugins.warnings`，包含 beta 渠道插件回退详情，并在 post-update 同步期间检测到 npm 插件工件漂移时包含 `postUpdate.plugins.integrityDrifts`。                                                                                                                                                                         |
| `--timeout <seconds>`                            | 每步超时。默认 `1800`。                                                                                                                                                                                                                                                                                                            |
| `--yes`                                          | 跳过确认提示（例如降级确认）。                                                                                                                                                                                                                                                                              |
| `--acknowledge-clawhub-risk`                     | 允许 post-update 插件同步在没有交互式提示的情况下继续越过社区 ClawHub 可信警告。若不使用该选项，当 OpenClaw 无法提示时，存在风险的社区发布将被跳过并保持不变。官方 ClawHub 包和捆绑的插件源会绕过此提示。                                                     |

没有 `--verbose` 标志。使用 `--dry-run` 预览计划中的操作，
使用 `--json` 获取机器可读结果，并使用 `openclaw update status --json`
仅查看渠道/可用性。Gateway 控制台详细程度（`--verbose`）和
文件日志级别（`logging.level: "debug"`/`"trace"`）是彼此独立的开关；请参见
[Gateway 日志](/gateway/logging)。

<Note>
在 Nix 模式（`OPENCLAW_NIX_MODE=1`）下，不允许会修改状态的 `openclaw update` 运行。请改为更新本次安装的 Nix source 或 flake input；对于 nix-openclaw，请使用 agent-first 的 [快速开始](https://github.com/openclaw/nix-openclaw#quick-start)。`openclaw update status` 和 `openclaw update --dry-run` 仍然是只读的。
</Note>

<Warning>
降级需要确认，因为旧版本可能会破坏配置。
如果安装已经将会话迁移到 SQLite，请在启动旧的基于文件版本之前恢复已归档的旧版转录工件。请参见
[Doctor：在会话 SQLite 迁移后降级](/cli/doctor#downgrading-after-session-sqlite-migration)。
</Warning>

## `update status`

显示当前活动的更新通道、git tag/branch/SHA（仅适用于源代码检出），以及更新可用性。

```bash
openclaw update status
openclaw update status --json
openclaw update status --timeout 10
```

| Flag                  | Default | Description                         |
| --------------------- | ------- | ----------------------------------- |
| `--json`              | `false` | 输出机器可读的状态 JSON。 |
| `--timeout <seconds>` | `3`     | 检查超时时间。                 |

对于 extended-stable 软件包安装，status 会执行与前台更新相同的公共选择器和精确软件包验证。当已安装版本较新时，它可以报告 `ahead of extended-stable`。JSON 失败信息包含 `registry.reason`（`selector_missing`、`selector_query_failed`、`exact_package_mismatch` 或 `unsupported_git_channel`）。

## `update repair`

在核心包已经更改，但后续修复工作未能顺利完成后，重新运行更新收尾流程。这是受支持的恢复路径：当 `openclaw update` 已安装新核心包，但核心包后的插件同步、受管 npm 插件元数据、注册表刷新或 doctor 修复未能收敛时，可使用此命令。

```bash
openclaw update repair
openclaw update repair --channel beta
openclaw update repair --acknowledge-clawhub-risk
openclaw update repair --json
```

| Flag                                             | Description                                                                                                                                                                                                                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--channel <stable\|extended-stable\|beta\|dev>` | 在修复前持久化核心更新通道。对于 extended-stable，符合条件且遵循 bare/default 或 `latest` intent 的官方 npm 插件会目标指向当前安装的确切核心版本。在不更改配置的情况下，Git 检出上的 extended-stable 修复会被拒绝。 |
| `--json`                                         | 打印可供机器读取的收尾 JSON。                                                                                                                                                                                                                                       |
| `--timeout <seconds>`                            | 修复步骤的超时时间。默认 `1800`。                                                                                                                                                                                                                                   |
| `--yes`                                          | 跳过确认提示。                                                                                                                                                                                                                                          |
| `--acknowledge-clawhub-risk`                     | 与 `openclaw update` 中的行为相同。                                                                                                                                                                                                                              |
| `--no-restart`                                   | 为保持一致性而接受；修复过程绝不会重启 Gateway。                                                                                                                                                                                                             |

`update repair` 会运行 `openclaw doctor --fix`，重新加载已修复的配置和安装记录，同步当前更新通道的受跟踪插件，更新受管的 npm 插件安装，修复缺失的已配置插件负载，刷新插件注册表，并写入已收敛的安装记录元数据。它不会安装新的核心包，也不会重启 Gateway。

## `update wizard`

交互式流程，用于选择更新通道并确认之后是否重启 Gateway（默认会重启）。在没有 git 检出版本的情况下选择 `dev` 会提供创建一个的选项。

| Flag                  | Default | Description                   |
| --------------------- | ------- | ----------------------------- |
| `--timeout <seconds>` | `1800`  | 每个更新步骤的超时时间。 |

## 它做什么

显式切换通道（`--channel ...`）也会保持安装方式一致：

- `dev` -> 确保是一个 git 检出版本（默认 `~/openclaw`，或者在设置了 `OPENCLAW_HOME` 时使用 `$OPENCLAW_HOME/openclaw`；可通过 `OPENCLAW_GIT_DIR` 覆盖），更新它，并从该检出版本安装全局 CLI。
- `stable` -> 使用 `latest` 从 npm 安装。
- `extended-stable` -> 解析公开的 npm `extended-stable` 选择器，验证所选中的确切包，并安装该精确版本。它不会回退到其他选择器，也不允许用于 Git 检出版本。
- `beta` -> 优先使用 npm dist-tag `beta`，当 beta 缺失或比当前稳定版更旧时回退到 `latest`。

### 重启交接

Gateway 核心自动更新器（在配置中启用时）会在实时 Gateway 请求处理程序之外启动 CLI 更新路径。控制平面 `update.run` 的包管理器更新和受监管的 git 检出更新使用相同的受管服务交接方式，而不是替换包树或在实时 Gateway 进程内重建 `dist/`：Gateway 会启动一个分离的辅助进程并退出，然后该辅助进程从 Gateway 进程树之外运行 `openclaw update --yes --json`。如果交接不可用，`update.run` 会返回一个结构化响应，其中包含可手动执行的安全 shell 命令。

Stored extended-stable selections receive read-only startup and 24-hour update
hints when `update.checkOnStart` is enabled. These checks never apply an update,
start a handoff, restart the Gateway, use stable delay/jitter, or use beta
polling cadence. Explicit foreground updates, bare foreground updates with
stored `update.channel: "extended-stable"`, on-demand status, and their managed
Gateway handoff remain supported.

当本地安装了受管 Gateway 服务并启用了重启时，包管理器和 git 检出更新会先停止正在运行的服务，然后再替换包树或修改检出/构建输出。随后更新器会刷新服务元数据，重启服务，并在报告 `Gateway: restarted and verified.` 之前验证重启后的 Gateway。包管理器更新还会额外验证重启后的 Gateway 报告了预期的包版本；git 检出更新会在重建后验证 gateway 健康状况和服务就绪状态。

在 macOS 上，更新后的检查还会验证当前配置文件对应的 LaunchAgent 已加载/正在运行，并且配置的回环端口是健康的。如果 plist 已安装但 launchd 没有托管它，OpenClaw 会自动重新引导 LaunchAgent，并重新执行健康/版本/通道就绪检查（新的引导会直接加载 `RunAtLoad` 作业，因此恢复过程不会立刻对新启动的 Gateway 执行 `kickstart -k`）。如果 Gateway 仍然没有变得健康，命令会以非零状态退出，并打印重启日志路径以及重启、重新安装和包回滚说明。

如果无法执行重启，命令会打印 `Gateway: restart skipped (...)` 或 `Gateway: restart failed: ...`，并附带手动执行 `openclaw gateway restart` 的提示。使用 `--no-restart` 时，包替换或 git 重建仍会执行，但受管服务不会停止或重启，因此正在运行的 Gateway 会继续使用旧代码，直到你手动重启它。

### 控制平面响应形式

当 `update.run` 通过 Gateway 控制平面在包管理器安装或受监管的 git 检出上运行时，处理程序会单独报告交接启动，而 CLI 更新会在 Gateway 退出后继续执行：

- `ok: true`, `result.status: "skipped"`，
  `result.reason: "managed-service-handoff-started"`，以及
  `handoff.status: "started"`：Gateway 已创建受管服务交接并安排了自己的重启，以便分离的辅助进程可以在实时服务进程之外运行
  `openclaw update --yes --json`。
- `ok: false`, `result.reason: "managed-service-handoff-unavailable"`，以及
  `handoff.status: "unavailable"`：OpenClaw 无法找到用于安全交接的监管服务边界和持久服务身份（例如，systemd 交接需要 `OPENCLAW_SYSTEMD_UNIT` 单元身份，而不仅仅是环境中的 systemd 进程标记）。响应会包含 `handoff.command`，即需要从 Gateway 外部运行的 shell 命令。
- `ok: false`, `result.reason: "managed-service-handoff-failed"`：Gateway 尝试创建交接，但无法启动分离的辅助进程。

`sentinel` 负载会在 Gateway 退出前写入，而 CLI 交接更新会在受管服务重启健康检查完成后更新同一个重启 sentinel。在交接期间，sentinel 可以携带 `stats.reason: "restart-health-pending"`，且不会有成功的后续继续；重启后的 Gateway 会轮询它，并且只会在 CLI 验证了服务健康并将 sentinel 以最终 `ok` 结果重写之后才触发后续继续。`openclaw status` 和 `openclaw status --all` 会在该 sentinel 处于待定或失败状态时显示一行 `Update restart`，而 `update.status` 会刷新并返回最新的 sentinel。

## Git 检出流程

### 渠道选择

- `stable`: 检出最新的非 beta 标签，然后构建并运行 doctor。
- `beta`: 优先选择最新的 `-beta` 标签；如果 beta 缺失或更旧，则回退到最新的稳定标签。
- `dev`: 检出 `main`，然后获取并 rebase。
- `extended-stable`: 不支持 Git 检出；不会发生任何 checkout 变更。

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
    在临时 worktree 中运行 TypeScript 构建。如果 tip 失败，会向后回退最多 10 个提交以找到最新的可构建提交。设置 `OPENCLAW_UPDATE_PREFLIGHT_LINT=1` 也会在此预检阶段运行 lint；由于用户更新主机通常比 CI runner 更小，lint 会在受限的串行模式下运行。
  </Step>
  <Step title="Rebase">
    在所选提交上执行 rebase（仅 dev）。
  </Step>
  <Step title="Install dependencies">
    使用仓库的包管理器。对于 pnpm 检出，更新器会按需引导 `pnpm`（先通过 `corepack`，再回退到临时的 `npm install pnpm@11`），而不是在 pnpm 工作区内运行 `npm run build`。如果 pnpm 引导仍然失败，更新器会尽早停止，并返回特定于包管理器的错误，而不是尝试在该检出中运行 `npm run build`。
  </Step>
  <Step title="构建 Control UI">
    构建 gateway 和 Control UI。
  </Step>
  <Step title="运行 doctor">
    `openclaw doctor` 作为最终的安全更新检查运行。
  </Step>
  <Step title="同步插件">
    将插件同步到当前渠道。dev 使用捆绑插件；stable 和 beta 使用 npm。更新已跟踪的插件安装。
  </Step>
</Steps>

### 插件同步详情

在 beta 渠道上，跟踪的 npm 和 ClawHub 插件安装如果遵循
默认/最新分支，会先尝试插件的 `@beta` 发布版本。如果该插件没有
beta 发布版本，OpenClaw 会回退到记录的默认/最新规格并
报告警告。对于 npm 插件，当 beta 包存在但安装验证失败时，
OpenClaw 也会回退。这些回退警告不会
使核心更新失败。精确版本和显式标签绝不会被重写。

<Warning>
如果某个精确固定的 npm 插件更新解析到一个其完整性与存储的安装记录不同的制品，`openclaw update` 会中止该插件制品更新，而不是安装它。仅在确认你信任新的制品之后，再显式重新安装或更新该插件。
</Warning>

<Note>
更新后，针对受管插件且同步路径可以绕开的同步失败（例如非关键插件无法访问的 npm registry）会在核心更新成功后以警告形式报告。JSON 结果会保留顶层更新 `status: "ok"`，并报告 `postUpdate.plugins.status: "warning"`，同时给出 `openclaw update repair` 和 `openclaw plugins inspect <id> --runtime --json` 的指导。意外的更新器或同步异常仍会使更新结果失败。请修复插件安装或更新错误，然后重新运行 `openclaw update repair`。

在逐插件同步步骤之后，`openclaw update` 会在 gateway 重启之前运行一个强制性的 **post-core convergence**（核心后收敛）流程：它会修复缺失的已配置插件负载，验证磁盘上每个_处于激活状态_的跟踪安装记录，并静态验证其 `package.json` 可被解析（以及任何明确声明的 `main` 是否存在）。来自该流程的失败，以及无效的配置快照，会返回 `postUpdate.plugins.status: "error"` 并将顶层更新 `status` 置为 `"error"`，因此 `openclaw update` 会以非零状态退出，并且 gateway _不会_ 在未验证的插件集下重启。错误信息包含结构化的 `postUpdate.plugins.warnings[].guidance` 行，指向 `openclaw update repair` 和 `openclaw plugins inspect <id> --runtime --json`。已禁用的插件条目，以及不是受信任来源关联的官方同步目标的记录，会在此处被跳过（与缺失负载检查所使用的 `skipDisabledPlugins` 策略一致），因此过期的禁用插件记录不会阻止本来有效的更新。

当更新后的 Gateway 启动时，插件加载仅进行验证：启动过程不会运行包管理器，也不会修改依赖树。包管理器的 `update.run` 重启会交给 CLI 托管服务路径处理，因此包替换发生在旧 Gateway 进程之外，而服务健康检查会决定该更新是否可以被报告为完成。
</Note>

在扩展稳定版核心更新成功后，核心后插件完整性和一致性会将符合条件的官方 npm 插件目标到精确安装的核心版本。对于默认/`latest` 意图，OpenClaw 不会查询插件 `@extended-stable`，也不会回退到 npm `latest`；它会根据已安装的核心推导包版本。显式版本固定、显式非 `latest` 标签、第三方包以及非 npm 来源会保留其现有意图。

对于包管理器安装，`openclaw update` 会在调用包管理器之前解析目标包
版本。npm 全局安装使用分阶段安装：OpenClaw 先将新包安装到一个临时的 npm 前缀中，
在那里验证打包后的 `dist` 清单，然后再把这个干净的包树交换到真实的全局前缀中。
如果验证失败，则不会从可疑的树中运行更新后的 doctor、插件同步和重启工作。即使
已安装版本已经与目标版本一致，该命令仍会刷新
全局包安装，然后运行插件同步、核心命令完成度刷新以及重启工作。
这使得打包的 sidecar 和渠道所属的插件记录与已安装的 OpenClaw 构建保持一致，同时将完整的插件命令完成度重建留给显式的
`openclaw completion --write-state` 运行。

## 相关内容

- `openclaw doctor`（在 git 检出上会提供先运行更新）
- [开发渠道](/install/development-channels)
- [更新](/install/updating)
- [CLI 参考](/cli)
