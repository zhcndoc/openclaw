---
summary: "CLI 参考：`openclaw update`（相对安全的源码更新 + 网关自动重启）"
read_when:
  - 你想安全地更新一个源码检出
  - 你正在排查 `openclaw update` 的输出或选项
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

- `--no-restart`: 在成功更新后跳过重启 Gateway 服务。会重启 Gateway 的包管理器更新会在命令成功前验证重启后的服务报告的是预期的更新版本。
- `--channel <stable|beta|dev>`: 设置更新渠道（git + npm；持久化到配置中）。
- `--tag <dist-tag|version|spec>`: 仅为此次更新覆盖包目标。对于包安装，`main` 映射到 `github:openclaw/openclaw#main`；GitHub/git 源规格会在分阶段的全局 npm 安装之前打包成临时 tarball。
- `--dry-run`: 预览计划中的更新操作（channel/tag/target/restart 流程），而不写入配置、安装、同步插件或重启。
- `--json`: 打印机器可读的 `UpdateRunResult` JSON，包括
  当损坏或无法加载的受管插件在核心更新成功后需要修复时的
  `postUpdate.plugins.warnings`，当某个插件没有 beta 版本时的 beta 渠道回退详情，
  以及在后更新插件同步期间检测到 npm 插件制品漂移时的
  `postUpdate.plugins.integrityDrifts`。
- `--timeout <seconds>`: 每一步的超时时间（默认是 1800 秒）。
- `--yes`: 跳过确认提示（例如降级确认）。

`openclaw update` 没有 `--verbose` 标志。使用 `--dry-run` 预览
计划中的 channel/tag/install/restart 操作，使用 `--json` 获取机器可读
结果；当你只需要渠道和可用性详情时，使用 `openclaw update status --json`。如果你正在排查更新期间的 Gateway 日志，
控制台详细程度和文件日志级别是分开的：Gateway 的 `--verbose` 影响
终端/WebSocket 输出，而文件日志需要在配置中设置 `logging.level: "debug"` 或 `"trace"`。
请参见 [Gateway logging](/gateway/logging)。

<Note>
在 Nix 模式（`OPENCLAW_NIX_MODE=1`）下，不允许会修改状态的 `openclaw update` 运行。请改为更新本次安装的 Nix source 或 flake input；对于 nix-openclaw，请使用 agent-first 的 [Quick Start](https://github.com/openclaw/nix-openclaw#quick-start)。`openclaw update status` 和 `openclaw update --dry-run` 仍然是只读的。
</Note>

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

- `dev` → 确保有一个 git 检出（默认：`~/openclaw`，或在设置了 `OPENCLAW_HOME` 时为 `$OPENCLAW_HOME/openclaw`；可通过 `OPENCLAW_GIT_DIR` 覆盖），
  更新它，并从该检出安装全局 CLI。
- `stable` → 使用 `latest` 从 npm 安装。
- `beta` → 优先使用 npm dist-tag `beta`，但如果 beta 缺失或比当前 stable 版本更旧，则回退到 `latest`。

Gateway 核心自动更新器（通过配置启用时）会在实际运行的 Gateway 请求处理程序之外启动 CLI 更新流程。
控制平面中的 `update.run` 包管理器更新也会使用受管服务交接，而不是在实际运行的 Gateway 进程内替换包树。
Gateway 会启动一个分离的辅助进程，退出，然后该辅助进程会从 Gateway 进程树之外运行正常的 `openclaw update --yes --json` CLI 流程。
如果无法进行该交接，`update.run` 会返回一个结构化响应，其中包含需要手动运行的安全 shell 命令。

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

当安装了本地受管的 Gateway 服务且启用了重启时，
包管理器更新会在替换包树之前先停止正在运行的服务，然后从更新后的安装中刷新服务元数据，重启服务，
并在报告 `Gateway: restarted and verified.` 之前验证重启后的 Gateway 报告的是预期版本。
在 macOS 上，更新后的检查还会验证当前配置文件的 LaunchAgent 已加载/运行，
并且配置的回环端口是健康的。如果 plist 已安装但 launchd 未监督它，OpenClaw 会自动重新引导该 LaunchAgent，
然后重新运行健康状态/版本/渠道就绪性检查。新的引导会直接加载 RunAtLoad 作业，
因此更新恢复不会立即对新启动的 Gateway 执行 `kickstart -k`。
如果 Gateway 仍然没有变为健康状态，命令会以非零状态退出，并打印重启日志路径以及明确的重启、重装和包回滚说明。
如果无法执行重启，命令会打印 `Gateway: restart skipped (...)` 或 `Gateway: restart failed: ...`，并给出手动 `openclaw gateway restart` 提示。
使用 `--no-restart` 时，包替换仍会执行，但受管服务不会停止或重启，因此正在运行的 Gateway 可能会继续使用旧代码，直到你手动重启它。

### 控制平面响应形式

当通过 Gateway 控制平面在包管理器安装上调用 `update.run` 时，处理器会将交接启动与在 Gateway 退出后继续进行的 CLI 更新分开报告：

- `ok: true`, `result.status: "skipped"`，
  `result.reason: "managed-service-handoff-started"`，以及
  `handoff.status: "started"` 表示 Gateway 已创建受管服务
  交接并安排了自身重启，以便分离的辅助进程可以在实际服务进程之外运行
  `openclaw update --yes --json`。
- `ok: false`, `result.reason: "managed-service-handoff-unavailable"`，以及
  `handoff.status: "unavailable"` 表示 OpenClaw 未能找到用于安全交接的监督
  服务边界。响应中会包含
  `handoff.command`，也就是需要从 Gateway 外部运行的 shell 命令。
- `ok: false`, `result.reason: "managed-service-handoff-failed"` 表示
  Gateway 尝试创建交接，但无法启动分离的辅助进程。

`sentinel` 负载仍会在 Gateway 退出前写入，而 CLI
交接会在受管服务重启健康检查完成后更新同一个重启 sentinel。在交接期间，sentinel 可以携带
`stats.reason: "restart-health-pending"`，且没有成功后的继续动作；重启后的 Gateway 会持续轮询它，并且只会在 CLI
验证服务健康状态并用最终的 `ok`
结果重写 sentinel 之后才触发继续动作。`openclaw status` 和 `openclaw status --all` 会在该 sentinel 处于待定或失败时显示一条 `Update restart`
行，而 `update.status` 会返回最新缓存的 sentinel。

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
    在临时 worktree 中运行 TypeScript 构建。如果 tip 失败，会向后回退最多 10 个提交以找到最新的可构建提交。设置 `OPENCLAW_UPDATE_PREFLIGHT_LINT=1` 也会在此预检阶段运行 lint；由于用户更新主机通常比 CI runner 更小，lint 会在受限的串行模式下运行。
  </Step>
  <Step title="Rebase">
    在所选提交上执行 rebase（仅 dev）。
  </Step>
  <Step title="安装依赖">
    使用仓库的包管理器。对于 pnpm 检出，更新器会按需引导 `pnpm`（先通过 `corepack`，再回退到临时的 `npm install pnpm@11`），而不是在 pnpm 工作区内运行 `npm run build`。
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

在 beta 更新渠道中，遵循默认/latest 线路的已跟踪 npm 和 ClawHub 插件安装会先尝试插件的 `@beta` 发布。如果插件没有 beta 发布，OpenClaw 会回退到记录的 default/latest spec，并将其报告为警告。对于 npm 插件，如果 beta 包存在但安装验证失败，OpenClaw 也会回退。这些插件回退警告不会导致核心更新失败。精确版本和显式标签不会被重写。

<Warning>
如果一个精确固定的 npm 插件更新解析到的制品，其完整性与存储的安装记录不同，`openclaw update` 会中止该插件制品更新，而不是安装它。只有在确认你信任新制品之后，才重新安装或显式更新该插件。
</Warning>

<Note>
更新后插件同步失败中，若其范围仅限于某个受管插件，并且同步路径可以绕开它们（例如某个非关键插件的 npm registry 不可达），则会在核心更新成功后作为警告报告。JSON 结果会保留顶层更新 `status: "ok"`，并报告 `postUpdate.plugins.status: "warning"`，同时给出 `openclaw doctor --fix` 和 `openclaw plugins inspect <id> --runtime --json` 的指导。意外的更新器或同步异常仍然会使更新结果失败。修复插件安装或更新错误，然后重新运行 `openclaw doctor --fix` 或 `openclaw update`。

在逐个插件同步步骤之后，`openclaw update` 会在 gateway 重启之前运行一个强制的 **post-core convergence** 过程：它会修复缺失的已配置插件载荷，验证磁盘上每个_活动的_已跟踪安装记录，并静态验证其 `package.json` 可解析（且任何显式声明的 `main` 都存在）。该过程的失败——以及无效的 OpenClaw 配置快照——会返回 `postUpdate.plugins.status: "error"`，并将顶层更新 `status` 置为 `"error"`，因此 `openclaw update` 会以非零状态退出，并且 gateway _不会_ 使用未经验证的插件集重启。错误信息会包含结构化的 `postUpdate.plugins.warnings[].guidance` 行，指向后续处理所需的 `openclaw doctor --fix` 和 `openclaw plugins inspect <id> --runtime --json`。此处会跳过已禁用的插件条目以及那些不是受信任来源关联的官方同步目标的记录，这与缺失载荷检查所使用的 `skipDisabledPlugins` 策略一致，因此过时的已禁用插件记录不会阻止一次本来有效的更新。

更新后的 Gateway 启动时，插件加载仅进行验证：启动过程中不会运行包管理器，也不会修改依赖树。包管理器的 `update.run` 重启会交由 CLI 的受管服务路径处理，因此包替换发生在旧 Gateway 进程之外，而服务健康检查将决定该更新是否可以报告为完成。

如果 pnpm 引导仍然失败，更新器会以包管理器特定错误提前停止，而不会尝试在检出目录内运行 `npm run build`。
</Note>

## `--update` 简写

`openclaw --update` 会重写为 `openclaw update`（对 shell 和启动脚本很有用）。

## 相关内容

- `openclaw doctor`（在 git 检出上会提供先运行更新）
- [开发渠道](/install/development-channels)
- [更新](/install/updating)
- [CLI 参考](/cli)
