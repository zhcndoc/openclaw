---
summary: "安全地更新 OpenClaw（全局安装或源码安装），以及回滚策略"
read_when:
  - 更新 OpenClaw
  - 更新后出现问题
title: "更新"
---

让 OpenClaw 保持最新版本。

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

`--channel extended-stable` 仅适用于包且仅限前台模式。OpenClaw 会读取
公开的 npm `extended-stable` 选择器，验证所选的精确包，并安装该精确版本。
若注册表数据缺失或不一致，则会失败并停止；它绝不会回退到 `latest`。
如果所选版本比已安装版本更旧，仍然适用正常的降级确认流程。

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

| Channel           | 行为                                                                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `stable`          | 等待 `stableDelayHours`（默认：6），然后在 `stableJitterHours`（默认：12）内以确定性抖动方式应用，以实现分批发布。                              |
| `extended-stable` | 不进行启动检查或自动应用。请手动使用 `openclaw update` 或 `openclaw update status`。                                                            |
| `beta`            | 每 `betaCheckIntervalHours`（默认：1）检查一次，并立即应用。                                                                                   |
| `dev`             | 不自动应用。请手动使用 `openclaw update`。                                                                                                      |

网关还会在启动时记录更新提示（可通过 `update.checkOnStart: false` 禁用）。
已存储的 extended-stable 选择会完全跳过启动和后台解析。
对于降级或事故恢复，可在网关环境中设置 `OPENCLAW_NO_AUTO_UPDATE=1`，即使配置了 `update.auto.enabled` 也会阻止自动应用。除非同时禁用 `update.checkOnStart`，否则启动更新提示仍可能运行。

通过实时 Gateway 控制平面（`update.run`）请求的包管理器更新，不会替换正在运行的 Gateway 进程内的包树。在受管服务安装中，Gateway 会启动一个分离的交接，退出，并让正常的 `openclaw update --yes --json` CLI 路径去停止服务、替换包、刷新服务元数据、重启、验证 Gateway 版本和可达性，并在可能时恢复已安装但未加载的 macOS LaunchAgent。如果 Gateway 无法安全地完成该交接，`update.run` 会返回一个安全的 shell 命令，而不是在进程内运行包管理器。

## Updated

<Steps>

### Run doctor

```bash
openclaw doctor
```

Migrate configuration, audit DM policies, and check gateway health status. Details: [Doctor](/gateway/doctor)

### Restart gateway

```bash
openclaw gateway restart
```

### Verify

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

## If you get stuck

- Run `openclaw doctor` again, and read the output carefully.
- For source checkouts on `openclaw update --channel dev`, the updater will automatically bootstrap `pnpm` when needed. If you see pnpm/corepack bootstrap errors, manually install `pnpm` (or re-enable `corepack`) and then rerun the update.
- See: [Troubleshooting](/gateway/troubleshooting)
- Ask in Discord: [https://discord.gg/clawd](https://discord.gg/clawd)

## 相关内容

- [安装概览](/install)：所有安装方法。
- [Doctor](/gateway/doctor)：更新后的健康检查。
- [迁移](/install/migrating)：主要版本迁移指南。
