---
summary: "安全地更新 OpenClaw（全局安装或源码安装），以及回滚策略"
read_when:
  - 更新 OpenClaw
  - 更新后出现问题
title: "更新"
---

让 OpenClaw 保持最新版本。

对于 Docker、Podman 和 Kubernetes 镜像替换，请参见
[升级容器镜像](/install/docker#upgrading-container-images)。网关会在就绪之前运行启动安全的升级工作，如果挂载的状态需要手动修复，则会退出。

## 推荐：`openclaw update`

Detects your install type (npm, pnpm, Bun, or git), fetches the latest version, runs `openclaw doctor`, and restarts the gateway.

```bash
openclaw update
```

切换通道或指定某个版本：

```bash
openclaw update --channel beta
openclaw update --channel extended-stable
openclaw update --channel dev
openclaw update --dry-run   # 不实际应用，仅预览
```

`openclaw update` 没有 `--verbose` 标志（安装器有）。如需诊断，请使用
`--dry-run` 预览计划执行的操作，使用 `--json` 获取结构化结果，或使用
`openclaw update status --json` 查看通道和可用性状态。

`--channel beta` 会优先使用 beta 的 npm dist-tag，但如果 beta 标签缺失，
或其版本低于最新稳定版发布，则会回退到 stable/latest。若想进行一次性的
包更新并固定到原始 npm beta dist-tag，请改用 `--tag beta`。

`--channel extended-stable` 仅适用于包，且安装仍然仅在前台进行。OpenClaw 读取公开的 npm `extended-stable` 选择器，
验证所选的精确包，并安装该精确版本。缺失或不一致的注册表数据会直接失败；
它绝不会回退到 `latest`。如果所选版本比已安装版本更旧，正常的降级确认仍然适用。
CLI 会在核心更新成功后持久化该通道；直接执行 `npm install -g openclaw@extended-stable`
不会更新 `update.channel`。
在核心切换后，符合条件的官方 npm 插件如果使用裸/default 或 `latest` 意图，会收敛到该精确的核心版本。
精确锁定和显式非 `latest` 标签、第三方插件以及非 npm 来源保持不变。
当前 OpenClaw 版本创建的目录安装会保留该默认意图。包含仅精确版本的旧记录会保持锁定，
因为 OpenClaw 无法安全地区分旧的自动锁定和用户锁定；请在 extended-stable 通道上运行
`openclaw plugins update @openclaw/name` 一次，以让该插件重新回到精确核心跟踪。

`--channel dev` 提供一个持续更新的 GitHub `main` 检出。对于一次性的
包更新，`--tag main` 会映射到 `github:openclaw/openclaw#main` 包规范，
并通过目标包管理器（npm/pnpm/bun）直接安装。

对于受管理的插件，缺少 beta 发布是警告，而不是失败：核心更新仍然可以成功，
同时插件会回退到其记录的默认/latest 发布版本。

有关通道语义，请参阅 [发布通道](/install/development-channels)。

## 在 npm 和 git 安装之间切换

使用 channel 来更改安装类型。更新器会保留你的状态、配置、
凭据和工作区在 `~/.openclaw` 中；它只会更改 CLI 和 gateway 使用的 OpenClaw
代码安装方式。

```bash
# npm 包安装 -> 可编辑的 git 检出
openclaw update --channel dev

# git 检出 -> npm 包安装
openclaw update --channel stable
```

先预览安装模式切换：

```bash
openclaw update --channel dev --dry-run
openclaw update --channel stable --dry-run
```

`dev` 会确保使用 git 检出，构建它，并从该
检出中安装全局 CLI。`stable`、`extended-stable` 和 `beta` channel 使用包
安装。extended-stable 在 git 检出上会被拒绝，且不会进行修改或
转换。如果 gateway 已经安装，`openclaw update` 会刷新
服务元数据并重启它，除非你传入 `--no-restart`。

对于带有受管理 Gateway 服务的包安装，`openclaw update` 会定位到
该服务所使用的包根目录。如果 shell 中的 `openclaw` 命令来自不同的安装，
更新器会打印这两个根目录以及受管理
服务的 Node 路径，并在替换包之前将该 Node 版本与目标发布的
`engines.node` 要求进行检查。

## Source-checkout servers (reference script)

Teams running a gateway directly from a git checkout on a server can update it
with `scripts/update-gateway.sh` from inside that checkout. It is the reference
for an efficient source-server update: it restores tracked build outputs that
`pnpm build` rewrites, fails closed on any other local changes, fast-forwards
`main` (or rebases a local server branch onto `origin/main`), installs
dependencies, builds clean, and restarts the gateway.

```bash
ssh you@server 'cd /path/to/openclaw && scripts/update-gateway.sh'
```

Override the restart for custom service units, or skip it entirely:

```bash
OPENCLAW_UPDATE_RESTART_CMD='systemctl --user restart openclaw-gateway.service' scripts/update-gateway.sh
OPENCLAW_UPDATE_RESTART_CMD='' scripts/update-gateway.sh
```

For a plain single-user source install, prefer `openclaw update --channel dev`
instead — it manages the checkout, build, and gateway restart for you.

## Alternative: re-run the installer

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

添加 `--no-onboard` 可跳过引导流程。若要强制指定安装类型，请传入
`--install-method git --no-onboard` 或 `--install-method npm --no-onboard`。

如果在 npm 包安装阶段之后 `openclaw update` 失败，请改为重新运行安装器。
它不会调用更新器；它会直接执行全局包安装，并且可以恢复部分更新的 npm 安装。

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
```

可使用 `--version` 将恢复固定到特定版本或 dist-tag：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm --version <version-or-dist-tag>
```

## 备选方案：手动使用 npm、pnpm 或 bun

```bash
npm i -g openclaw@latest
```

对于受监管的安装，优先使用 `openclaw update`：它可以与正在运行的 Gateway 服务协调包替换。如果你在受监管的安装上手动更新，请先停止受管控的 Gateway。包管理器会原地替换文件，而运行中的 Gateway 否则可能会在替换过程中尝试加载核心或插件文件。包管理器完成后重启 Gateway，以便它加载新的安装。

对于 root 拥有的 Linux 系统全局安装，如果 `openclaw update` 因 `EACCES` 失败，请在保持 Gateway 停止的情况下使用 system npm 进行手动替换来恢复。使用你通常为该 Gateway 使用的相同 profile 参数/环境变量。将 `/usr/bin/npm` 替换为你主机上拥有 root-owned global prefix 的 system npm：

```bash
openclaw gateway stop
sudo /usr/bin/npm i -g openclaw@latest
openclaw gateway install --force
openclaw gateway restart
```

然后验证：

```bash
openclaw --version
curl -fsS http://127.0.0.1:18789/readyz
openclaw plugins list --json
openclaw gateway status --deep --json
openclaw doctor --lint --json
```

When `openclaw update` manages a global npm install, it installs the target
into a temporary npm prefix first. The candidate package validates the host
Node version during `preinstall`; only then does OpenClaw verify the packaged
`dist` inventory and swap the clean package tree into the real global prefix. A
packed completion guard is omitted from the expected inventory and removed only
after `preinstall` succeeds, so skipped lifecycle scripts also fail before the
swap. On npm 12 and newer, the updater approves only the candidate OpenClaw
lifecycle; transitive dependency scripts remain blocked. This avoids npm
overlaying a new package onto stale files from the old one. If the install
command fails, OpenClaw retries once with `--omit=optional`, which helps hosts
where native optional dependencies cannot compile.

OpenClaw 托管的 npm 更新和插件更新命令还会为子 npm 进程清除 npm 的 `min-release-age` 供应链隔离（或较旧的 `before` 配置键）。该策略用于一般性保护，但显式的 OpenClaw 更新意味着“现在安装所选版本”。

```bash
pnpm add -g openclaw@latest
```

If pnpm 11 installed OpenClaw 2026.7.1, run that manual command once. That
release predates pnpm 11's isolated global-package layout, so its updater can
mistake another npm installation for the running CLI. Later releases retain
pnpm ownership and follow the replacement package root during updates. They
also use the owning manager's reported global bin directory and stop before
mutation when the available pnpm command reports another global root or major,
or when the invoking package is orphaned or not the only active OpenClaw
install there.

If OpenClaw shares a pnpm 11 global install group with another package, the
automatic updater stops before changing the group. Update the original
comma-separated group manually so its sibling packages and build policy stay
intact.

```bash
bun add -g openclaw@latest
```

### 高级 npm 安装主题

<AccordionGroup>
  <Accordion title="只读包树">
    OpenClaw 在运行时将打包的全局安装视为只读，即使当前用户对全局包目录具有写权限。插件包安装位于用户配置目录下由 OpenClaw 拥有的 npm/git 根目录中，而网关启动不会修改 OpenClaw 的包树。

    某些 Linux npm 配置会将全局包安装到 root 拥有的目录下，例如 `/usr/lib/node_modules/openclaw`。OpenClaw 支持这种布局，因为插件安装/更新命令写入的是该全局包目录之外的位置。

  </Accordion>
  <Accordion title="加固的 systemd 单元">
    授予 OpenClaw 对其配置/状态根目录的写入权限，以便显式插件安装、插件更新和 doctor 清理能够持久保存更改：

    ```ini
    ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
    ```

  </Accordion>
  <Accordion title="磁盘空间预检查">
    在包更新和显式插件安装之前，OpenClaw 会尽力对目标卷执行磁盘空间检查。空间不足会产生一条带有已检查路径的警告，但不会阻止更新，因为文件系统配额、快照和网络卷可能会在检查后发生变化。实际的包管理器安装和安装后验证仍然具有最终决定权。
  </Accordion>
</AccordionGroup>

## 自动更新器

默认关闭。在 `~/.openclaw/openclaw.json` 中启用它：

```json5
{
  update: {
    channel: "stable",
    auto: {
      enabled: true,
    },
  },
}
```

| Channel           | Behavior                                                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `stable`          | Applies after a built-in delay with deterministic jitter for a spread rollout.                                                |
| `extended-stable` | Checks for a read-only update hint on startup and every 24 hours when `checkOnStart` is enabled. Never applies automatically. |
| `beta`            | Checks on a built-in interval and applies immediately.                                                                        |
| `dev`             | No automatic apply. Use `openclaw update` manually.                                                                           |

网关还会在启动时记录更新提示（可通过
`update.checkOnStart: false` 禁用）。已存储的 extended-stable 选择会使用这种
只读提示路径和现有的 24 小时提示间隔，但绝不会触发
自动安装、交接、重启、stable 延迟/抖动或 beta 轮询。
对于降级或事故恢复，请在网关环境中设置 `OPENCLAW_NO_AUTO_UPDATE=1`，即使配置了
`update.auto.enabled` 也会阻止自动应用。启动时的更新提示仍然可以运行，除非
`update.checkOnStart` 也被禁用。

通过实时 Gateway 控制平面（`update.run`）请求的包管理器更新，不会替换正在运行的 Gateway 进程内的包树。在受管服务安装中，Gateway 会启动一个分离的交接，退出，并让正常的 `openclaw update --yes --json` CLI 路径去停止服务、替换包、刷新服务元数据、重启、验证 Gateway 版本和可达性，并在可能时恢复已安装但未加载的 macOS LaunchAgent。如果 Gateway 无法安全地完成该交接，`update.run` 会返回一个安全的 shell 命令，而不是在进程内运行包管理器。

The Control UI sidebar update card shows **Update Gateway** when it will start
this `update.run` flow directly. This covers browser-hosted Control UI, remote
Gateways, and manually managed local Gateways.

In the signed macOS app, a local app-owned Gateway changes that card to
**Update Mac app + Gateway**. Sparkle updates the app first; after relaunch, the
app runs `openclaw update --tag <app-version> --json`, restarts its Gateway,
and verifies health in a setup-style progress window. The window appears only
when that managed Gateway needs update, repair, or installation; app-only updates relaunch
directly into the app. Failure details stay visible with Retry, [Update guide](/install/updating), and
[Discord](https://discord.gg/clawd) actions. The app never uses this coordinated
path for a remote or externally managed Gateway, never downgrades a newer
Gateway, and never overrides an `extended-stable` channel pin.

当更新成功时，应用会为最近一次具有真实用户/频道交互的顶层直接会话排队一个一次性的欢迎事件。Cron 运行、心跳以及仅后台的会话更新都不会改变该选择。在远程模式下，应用只会更新其本地 Mac 节点运行时，并且仅当已连接的远程 Gateway 至少与应用一样新时才发送该事件。

## 更新后

<Steps>

### 运行 doctor

```bash
openclaw doctor
```

迁移配置、审计 DM 策略，并检查网关健康状态。详情：[Doctor](/gateway/doctor)

### 重启网关

```bash
openclaw gateway restart
```

### 验证

```bash
openclaw health
```

</Steps>

## 回滚

Rollback has two layers:

1. Reinstall older OpenClaw code while keeping the current state.
2. Restore pre-update state only when the older code cannot use a migrated
   config or database.

Start with a code-only rollback. Restoring state discards changes made after
the backup.

### Before updating: create a verified backup

`openclaw update` preserves an automatic pre-update config copy, but it does not
create a full state recovery point. Before a significant update, create one
explicitly:

```bash
mkdir -p ~/Backups/openclaw
openclaw backup create --output ~/Backups/openclaw --verify
```

The archive manifest records the OpenClaw version and the source paths included
in the backup. The archive can contain credentials, auth profiles, and channel
state, so store it with owner-only permissions and the same protection as the
live state directory. See [Backup](/cli/backup) for included and intentionally
omitted files.

For a byte-for-byte recovery point that includes volatile artifacts omitted by
the portable archive, stop the Gateway and use a filesystem, volume, or VM
snapshot provided by your platform.

### Roll back a package install

List published versions, then preview and install the known-good version:

```bash
npm view openclaw versions --json
openclaw update --tag <known-good-version> --dry-run
openclaw update --tag <known-good-version>
```

`openclaw update --tag` is preferred over a direct package-manager install. It
detects the downgrade, asks for confirmation, runs managed plugin convergence
and compatibility checks against the installed target, refreshes service
metadata, restarts the Gateway, and verifies the running version. If the stored
channel is `extended-stable`, use
`--channel stable --tag <known-good-version>` because exact one-off tags cannot
be combined with the `extended-stable` selector.

Package updates stage and verify the candidate before activation. If the
filesystem swap or command-shim replacement fails, OpenClaw restores the old
package automatically. After a successful swap, a later Gateway health failure
reports the previous version and manual rollback instructions instead of
automatically replacing the package again.

If the CLI update path is unavailable, use the same package manager and install
scope that own the current Gateway:

```bash
openclaw gateway stop
npm i -g openclaw@<known-good-version>
openclaw gateway install --force
openclaw gateway restart
```

Replace `npm` with `pnpm` or `bun` when that manager owns the install. During
incident recovery, prevent an enabled auto-updater from immediately applying a
newer release by setting `OPENCLAW_NO_AUTO_UPDATE=1` in the Gateway environment.

### Roll back a source checkout

Use a clean checkout and select a known-good tag or commit:

```bash
git fetch --all --tags
git checkout --detach <known-good-tag-or-commit>
pnpm install && pnpm build
openclaw gateway restart
```

要返回最新版本：`git checkout main && git pull`。

The updater automatically returns a git checkout to its previous branch and
SHA when dependency installation, build, UI build, or doctor fails after a git
update starts. Manual checkout is still required when you intentionally choose
an older commit.

### Downgrading across the session SQLite migration

Before starting an older file-backed OpenClaw release, use the current CLI to
restore archived legacy transcript artifacts:

```bash
openclaw gateway stop
openclaw doctor --session-sqlite restore --session-sqlite-all-agents
```

This does not delete SQLite data. Sessions created after the SQLite migration
exist only in SQLite and will not appear to the older runtime. See
[Downgrading after session SQLite migration](/cli/doctor#downgrading-after-session-sqlite-migration).

### Restore state only when necessary

If the older code cannot read a newer config or database schema, stop the
Gateway and restore the verified pre-update filesystem, volume, or VM snapshot.
Preserve the current state separately before restoring because this removes
changes made after the snapshot.

Broad `openclaw backup create` archives support creation and verification, but
not in-place whole-archive activation. Extract a broad archive into a staging
directory and use its `manifest.json` source-to-archive mapping for an offline
restore. `openclaw backup sqlite restore` likewise writes a verified database
to a fresh target; activating that target remains an explicit offline operator
step.

### Verify the rollback

```bash
openclaw --version
openclaw health
openclaw plugins list --json
openclaw gateway status --deep --json
openclaw doctor --lint --json
```

## If you are stuck

- 再次运行 `openclaw doctor`，并仔细阅读输出内容。
- 对于使用 `openclaw update --channel dev` 的源码检出版本，更新器会在需要时自动引导安装 `pnpm`。如果你看到 pnpm/corepack 引导错误，请手动安装 `pnpm`（或重新启用 `corepack`），然后再次运行更新。
- 参见：[故障排除](/gateway/troubleshooting)
- 在 Discord 中提问：[https://discord.gg/clawd](https://discord.gg/clawd)

## 相关内容

- [安装概览](/install)：所有安装方法。
- [Doctor](/gateway/doctor)：更新后的健康检查。
- [迁移](/install/migrating)：主要版本迁移指南。
