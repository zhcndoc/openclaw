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

检测你的安装类型（npm、pnpm、Bun 或 git），获取最新版本，运行 `openclaw doctor`，并重启网关。

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

## 源码检出服务器（参考脚本）

在服务器上直接从 git 检出目录运行网关的团队，可以在该检出目录中使用
`scripts/update-gateway.sh` 进行更新。它是高效更新源码服务器的参考方案：恢复
`pnpm build` 会重写的已跟踪构建输出，对其他任何本地更改采取失败关闭策略，将
`main` 快进更新（或将本地服务器分支变基到 `origin/main`），安装依赖，执行干净构建，
并重启网关。

诸如 `dist`、`dist-runtime` 以及包本地的
`dist` 目录等生成输出根目录必须是真实目录。构建会在读取或修改其内容之前拒绝符号链接根目录，
因此清理操作不会影响链接目标。在更新或构建源码检出目录之前，请将输出根目录符号链接替换为真实目录。

```bash
ssh you@server 'cd /path/to/openclaw && scripts/update-gateway.sh'
```

对于自定义服务单元，可以覆盖重启命令，或完全跳过重启：

```bash
OPENCLAW_UPDATE_RESTART_CMD='systemctl --user restart openclaw-gateway.service' scripts/update-gateway.sh
OPENCLAW_UPDATE_RESTART_CMD='' scripts/update-gateway.sh
```

对于普通的单用户源码安装，建议改用 `openclaw update --channel dev` —
它会为你管理检出目录、构建和网关重启。

## 替代方案：重新运行安装器

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

当 `openclaw update` 管理全局 npm 安装时，它会先将目标安装到临时 npm 前缀中。候选软件包会在 `preinstall` 阶段验证主机的 Node 版本；只有通过验证后，OpenClaw 才会检查打包的 `dist` 清单，并将干净的软件包树替换到实际的全局前缀中。预期清单中会省略打包完成保护文件，并且只有在 `preinstall` 成功后才会将其移除，因此即使生命周期脚本被跳过，也会在替换前失败。在 npm 12 及更高版本中，更新程序只会批准候选 OpenClaw 的生命周期；传递依赖的软件包脚本仍会被阻止。这样可以避免 npm 将新软件包覆盖到旧软件包的过时文件上。如果安装命令失败，OpenClaw 会使用 `--omit=optional` 重试一次，这有助于处理无法编译原生可选依赖的主机。

OpenClaw 托管的 npm 更新和插件更新命令还会为子 npm 进程清除 npm 的 `min-release-age` 供应链隔离（或较旧的 `before` 配置键）。该策略用于一般性保护，但显式的 OpenClaw 更新意味着“现在安装所选版本”。

```bash
pnpm add -g openclaw@latest
```

如果 pnpm 11 安装了 OpenClaw 2026.7.1，请运行一次该手动命令。该版本早于 pnpm 11 的隔离式全局软件包布局，因此其更新程序可能会将另一个 npm 安装误认为正在运行的 CLI。后续版本会保留 pnpm 所有权，并在更新期间跟随替换软件包根目录。它们还会使用所属管理器报告的全局 bin 目录；当可用的 pnpm 命令报告了另一个全局根目录或主版本，或者调用方软件包已成为孤立软件包，或该位置存在多个处于活动状态的 OpenClaw 安装时，它们会在执行修改前停止。

如果 OpenClaw 与另一个软件包共享 pnpm 11 全局安装组，自动更新程序会在修改该组之前停止。请手动更新原始的逗号分隔组，以保持其同级软件包和构建策略不变。

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

| 通道              | 行为                                                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `stable`          | 在内置延迟后应用更新，并使用确定性抖动进行分批发布。                                                                        |
| `extended-stable` | 启用 `checkOnStart` 后，在启动时以及每 24 小时检查一次只读更新提示。绝不会自动应用更新。 |
| `beta`            | 按内置间隔检查，并立即应用更新。                                                                                                |
| `dev`             | 不自动应用更新。手动使用 `openclaw update`。                                                                                   |

网关还会在启动时记录更新提示（可通过
`update.checkOnStart: false` 禁用）。已存储的 extended-stable 选择会使用这种
只读提示路径和现有的 24 小时提示间隔，但绝不会触发
自动安装、交接、重启、stable 延迟/抖动或 beta 轮询。
对于降级或事故恢复，请在网关环境中设置 `OPENCLAW_NO_AUTO_UPDATE=1`，即使配置了
`update.auto.enabled` 也会阻止自动应用。启动时的更新提示仍然可以运行，除非
`update.checkOnStart` 也被禁用。

通过实时 Gateway 控制平面（`update.run`）请求的包管理器更新，不会替换正在运行的 Gateway 进程内的包树。在受管服务安装中，Gateway 会启动一个分离的交接，退出，并让正常的 `openclaw update --yes --json` CLI 路径去停止服务、替换包、刷新服务元数据、重启、验证 Gateway 版本和可达性，并在可能时恢复已安装但未加载的 macOS LaunchAgent。如果 Gateway 无法安全地完成该交接，`update.run` 会返回一个安全的 shell 命令，而不是在进程内运行包管理器。

Control UI 侧边栏更新卡片会在将直接启动此 `update.run` 流程时显示 **更新 Gateway**。这适用于浏览器托管的 Control UI、远程 Gateway 以及手动管理的本地 Gateway。

在签名的 macOS 应用中，本地由应用拥有的 Gateway 会将该卡片更改为
**更新 Mac 应用 + Gateway**。Sparkle 会先更新应用；重新启动后，
应用运行 `openclaw update --tag <app-version> --json`，重启其 Gateway，
并在类似设置流程的进度窗口中验证运行状况。仅当该受管 Gateway 需要更新、修复或安装时才会显示此窗口；仅应用更新会直接重新启动
进入应用。失败详情会与重试、[更新指南](/install/updating) 和
[Discord](https://discord.gg/clawd) 操作一起保持可见。应用绝不会对远程或外部管理的 Gateway 使用此协调流程，绝不会将较新的 Gateway 降级，也绝不会覆盖 `extended-stable` 通道固定设置。

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

回滚分为两层：

1. 重新安装较旧的 OpenClaw 代码，同时保留当前状态。
2. 仅当较旧代码无法使用已迁移的配置或数据库时，才恢复更新前的状态。

先执行仅针对代码的回滚。恢复状态会丢弃备份之后所做的更改。

### 更新前：创建经过验证的备份

`openclaw update` 会保留更新前的自动配置副本，但不会创建完整的状态恢复点。在进行重大更新之前，请显式创建一个：

```bash
mkdir -p ~/Backups/openclaw
openclaw backup create --output ~/Backups/openclaw --verify
```

归档清单会记录 OpenClaw 版本以及备份中包含的源路径。归档可能包含凭据、身份验证配置和频道状态，因此请使用仅所有者可访问的权限存储它，并采用与实时状态目录相同的保护措施。有关已包含和有意省略的文件，请参阅[备份](/cli/backup)。

如果需要包含便携式归档所省略的易变文件、进行逐字节恢复，请停止 Gateway，并使用平台提供的文件系统、卷或虚拟机快照。

### 回滚软件包安装

列出已发布的版本，然后预览并安装已知可用版本：

```bash
npm view openclaw versions --json
openclaw update --tag <known-good-version> --dry-run
openclaw update --tag <known-good-version>
```

相比直接使用软件包管理器安装，推荐使用 `openclaw update --tag`。它会检测降级操作并请求确认，针对已安装的目标版本运行受管理插件的收敛和兼容性检查，刷新服务元数据，重启 Gateway，并验证运行中的版本。如果存储的频道为 `extended-stable`，请使用 `--channel stable --tag <known-good-version>`，因为精确的一次性标签不能与 `extended-stable` 选择器结合使用。

软件包更新会在激活前暂存并验证候选版本。如果文件系统交换或命令垫片替换失败，OpenClaw 会自动恢复旧软件包。交换成功后，如果 Gateway 健康检查在之后失败，系统会报告先前的版本和手动回滚说明，而不会再次自动替换软件包。

如果 CLI 更新路径不可用，请使用拥有当前 Gateway 的同一个软件包管理器和安装范围：

```bash
openclaw gateway stop
npm i -g openclaw@<known-good-version>
openclaw gateway install --force
openclaw gateway restart
```

如果当前安装由 `pnpm` 或 `bun` 管理，请将 `npm` 替换为相应的管理器。在故障恢复期间，请通过在 Gateway 环境中设置 `OPENCLAW_NO_AUTO_UPDATE=1`，防止已启用的自动更新器立即应用较新的版本。

### 回滚源代码检出

使用干净的检出，并选择已知可用的标签或提交：

```bash
git fetch --all --tags
git checkout --detach <known-good-tag-or-commit>
pnpm install && pnpm build
openclaw gateway restart
```

要返回最新版本：`git checkout main && git pull`。

更新器会在 Git 更新开始后，如果依赖安装、构建、UI 构建或 doctor 失败，自动将 Git 检出恢复到之前的分支和 SHA。若你是有意选择较旧的提交，仍需手动检出。

### 跨越会话 SQLite 迁移进行降级

在启动较旧的基于文件的 OpenClaw 版本之前，请使用当前 CLI 恢复已归档的旧版转录文件：

```bash
openclaw gateway stop
openclaw doctor --session-sqlite restore --session-sqlite-all-agents
```

此操作不会删除 SQLite 数据。在 SQLite 迁移之后创建的会话仅存在于 SQLite 中，较旧的运行时不会显示这些会话。请参阅[会话 SQLite 迁移后的降级](/cli/doctor#downgrading-after-session-sqlite-migration)。

### 仅在必要时恢复状态

如果较旧代码无法读取更新后的配置或数据库架构，请停止 Gateway，并恢复经过验证的更新前文件系统、卷或虚拟机快照。在恢复之前，请单独保留当前状态，因为此操作会删除快照之后所做的更改。

广泛的 `openclaw backup create` 归档支持创建和验证，但不支持就地激活整个归档。请将广泛归档解压到暂存目录，并使用其中的 `manifest.json` 源路径到归档路径映射执行离线恢复。`openclaw backup sqlite restore` 同样会将经过验证的数据库写入新的目标位置；激活该目标仍需由操作人员显式执行离线步骤。

### 验证回滚

```bash
openclaw --version
openclaw health
openclaw plugins list --json
openclaw gateway status --deep --json
openclaw doctor --lint --json
```

## 如果遇到问题

- 再次运行 `openclaw doctor`，并仔细阅读输出内容。
- 对于使用 `openclaw update --channel dev` 的源码检出版本，更新器会在需要时自动引导安装 `pnpm`。如果你看到 pnpm/corepack 引导错误，请手动安装 `pnpm`（或重新启用 `corepack`），然后再次运行更新。
- 参见：[故障排除](/gateway/troubleshooting)
- 在 Discord 中提问：[https://discord.gg/clawd](https://discord.gg/clawd)。

## 相关内容

- [安装概览](/install)：所有安装方法。
- [Doctor](/gateway/doctor)：更新后的健康检查。
- [迁移](/install/migrating)：主要版本迁移指南。
