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

检测你的安装类型（npm 或 git），获取最新版本，运行 `openclaw doctor`，并重启网关。

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

## 备选方案：重新运行安装器

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

当 `openclaw update` 管理一个全局 npm 安装时，它会先将目标安装到一个临时 npm prefix 中，验证打包后的 `dist` 清单，然后将干净的包树交换到真实的全局 prefix 中——避免 npm 用新包覆盖旧包中的过期文件。如果安装命令失败，OpenClaw 会使用 `--omit=optional` 重试一次，这有助于那些本地可选依赖无法编译的主机。

OpenClaw 托管的 npm 更新和插件更新命令还会为子 npm 进程清除 npm 的 `min-release-age` 供应链隔离（或较旧的 `before` 配置键）。该策略用于一般性保护，但显式的 OpenClaw 更新意味着“现在安装所选版本”。

```bash
pnpm add -g openclaw@latest
```

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
      stableDelayHours: 6,
      stableJitterHours: 12,
      betaCheckIntervalHours: 1,
    },
  },
}
```

| Channel           | 行为                                                                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `stable`          | 等待 `stableDelayHours`（默认：6），然后在 `stableJitterHours`（默认：12）范围内使用确定性抖动分散发布。 |
| `extended-stable` | 在启用 `checkOnStart` 时，启动时以及每 24 小时检查一次只读更新提示。绝不会自动应用。                |
| `beta`            | 每 `betaCheckIntervalHours`（默认：1）检查一次，并立即应用。                                                                  |
| `dev`             | 不自动应用。请手动使用 `openclaw update`。                                                                                          |

网关还会在启动时记录更新提示（可通过
`update.checkOnStart: false` 禁用）。已存储的 extended-stable 选择会使用这种
只读提示路径和现有的 24 小时提示间隔，但绝不会触发
自动安装、交接、重启、stable 延迟/抖动或 beta 轮询。
对于降级或事故恢复，请在网关环境中设置 `OPENCLAW_NO_AUTO_UPDATE=1`，即使配置了
`update.auto.enabled` 也会阻止自动应用。启动时的更新提示仍然可以运行，除非
`update.checkOnStart` 也被禁用。

通过实时 Gateway 控制平面（`update.run`）请求的包管理器更新，不会替换正在运行的 Gateway 进程内的包树。在受管服务安装中，Gateway 会启动一个分离的交接，退出，并让正常的 `openclaw update --yes --json` CLI 路径去停止服务、替换包、刷新服务元数据、重启、验证 Gateway 版本和可达性，并在可能时恢复已安装但未加载的 macOS LaunchAgent。如果 Gateway 无法安全地完成该交接，`update.run` 会返回一个安全的 shell 命令，而不是在进程内运行包管理器。

控制界面侧边栏中的更新卡片会启动相同的 `update.run` 流程。在带签名的 macOS 应用中，卡片或菜单栏的更新操作会先通过 Sparkle 更新应用。重新启动后，会运行一个类似设置向导的进度窗口，为由应用管理的 Gateway 执行 `openclaw update --tag <app-version> --json`，重启它并验证健康状态。失败详情会继续显示，并提供重试、[更新指南](/install/updating) 和 [Discord](https://discord.gg/clawd) 操作。非交互式运行不接受降级。外部管理的安装保持不变。

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

### 锁定版本（npm）

```bash
npm i -g openclaw@<version>
openclaw doctor
openclaw gateway restart
```

<Tip>
`npm view openclaw version` 会显示当前已发布的版本。
</Tip>

### 锁定提交（源码）

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
pnpm install && pnpm build
openclaw gateway restart
```

要返回最新版本：`git checkout main && git pull`。

## 如果你遇到卡住的情况

- 再次运行 `openclaw doctor`，并仔细阅读输出内容。
- 对于使用 `openclaw update --channel dev` 的源码检出版本，更新器会在需要时自动引导安装 `pnpm`。如果你看到 pnpm/corepack 引导错误，请手动安装 `pnpm`（或重新启用 `corepack`），然后再次运行更新。
- 参见：[故障排除](/gateway/troubleshooting)
- 在 Discord 中提问：[https://discord.gg/clawd](https://discord.gg/clawd)

## 相关内容

- [安装概览](/install)：所有安装方法。
- [Doctor](/gateway/doctor)：更新后的健康检查。
- [迁移](/install/migrating)：主要版本迁移指南。
