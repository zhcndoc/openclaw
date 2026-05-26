---
summary: "安全地更新 OpenClaw（全局安装或源码安装），以及回滚策略"
read_when:
  - 更新 OpenClaw
  - 更新后出现问题
title: "更新"
---

让 OpenClaw 保持最新版本。

## 推荐：`openclaw update`

最快的更新方式。它会检测你的安装类型（npm 或 git），获取最新版本，运行 `openclaw doctor`，并重启网关。

```bash
openclaw update
```

要切换渠道或指定特定版本：

```bash
openclaw update --channel beta
openclaw update --channel dev
openclaw update --dry-run   # 不实际应用，仅预览
```

`openclaw update` 不接受 `--verbose`。如需更新诊断，请使用
`--dry-run` 预览计划执行的操作，使用 `--json` 获取结构化结果，或使用
`openclaw update status --json` 检查渠道和可用性状态。安装器有它自己的
`--verbose` 标志，但该标志不属于
`openclaw update`。

`--channel beta` 会优先选择 beta，但当
beta 标签不存在或比最新稳定版本更旧时，运行时会回退到 stable/latest。若你想在一次性包更新中使用原始的 npm beta dist-tag，请使用 `--tag beta`
。

对于持续跟随 GitHub `main` 的检出，请使用 `--channel dev`。对于包
更新，`--tag main` 会在单次运行中映射到 `github:openclaw/openclaw#main`，并且
GitHub/git 源规格会在分阶段的 npm 安装前被打包成临时 tarball。

对于受管理的插件，beta 渠道回退会发出警告：核心更新仍然可能
成功，而某个插件会使用其记录的默认/最新发布版本，因为没有可用的插件 beta。

参见 [开发渠道](/install/development-channels) 了解渠道语义。

## 在 npm 和 git 安装之间切换

当你想更改安装类型时，请使用渠道。更新器会保留你的状态、配置、凭据和工作区在 `~/.openclaw` 中；它只会更改 CLI 和网关所使用的 OpenClaw 代码安装方式。

```bash
# npm 包安装 -> 可编辑的 git 检出
openclaw update --channel dev

# git 检出 -> npm 包安装
openclaw update --channel stable
```

先使用 `--dry-run` 运行，以预览确切的安装模式切换：

```bash
openclaw update --channel dev --dry-run
openclaw update --channel stable --dry-run
```

`dev` 渠道会确保使用 git 检出，构建它，并从该检出中安装全局 CLI。`stable` 和 `beta` 渠道使用包安装。如果网关已经安装，`openclaw update` 会刷新服务元数据并重启它，除非你传入 `--no-restart`。

对于带有受管理 Gateway 服务的包安装，`openclaw update` 会针对该服务使用的包根目录。如果 shell 中的 `openclaw` 命令来自不同的安装，更新器会打印两个根目录以及受管理服务的 Node 路径。包更新会使用拥有该服务根目录的包管理器，并在替换包之前检查受管理服务的 Node 是否与目标发布引擎匹配。

## 备选方案：重新运行安装器

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

添加 `--no-onboard` 可跳过引导流程。要通过安装器强制指定某种安装类型，请传入 `--install-method git --no-onboard` 或
`--install-method npm --no-onboard`。

如果 `openclaw update` 在 npm 包安装阶段失败，请重新运行安装器。安装器不会调用旧的更新器；它会直接运行全局包安装，因此可以恢复部分更新失败的 npm 安装。

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
```

要将恢复固定到特定版本或 dist-tag，请添加 `--version`：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm --version <version-or-dist-tag>
```

## 备选方案：手动使用 npm、pnpm 或 bun

```bash
npm i -g openclaw@latest
```

对于受管理的安装，优先使用 `openclaw update`，因为它可以与正在运行的 Gateway 服务协调包切换。如果你在受管理安装上手动更新，请在包管理器开始之前停止受管理的 Gateway。包管理器会就地替换文件，否则正在运行的 Gateway 可能会在包树处于半替换状态时尝试加载核心或插件文件。包管理器完成后重启 Gateway，以便服务获取新的安装。

对于由 root 拥有的 Linux 系统全局安装，如果 `openclaw update` 因 `EACCES` 失败，并且你通过系统 npm 恢复，请在手动替换包期间保持 Gateway 停止。使用你通常为该 Gateway 使用的相同 `openclaw` 配置文件标志或环境变量。将 `/usr/bin/npm` 替换为在你的主机上拥有 root 全局前缀的系统 npm：

```bash
openclaw gateway stop
sudo /usr/bin/npm i -g openclaw@latest
openclaw gateway install --force
openclaw gateway restart
```

然后验证服务：

```bash
openclaw --version
curl -fsS http://127.0.0.1:18789/readyz
openclaw plugins list --json
openclaw gateway status --deep --json
openclaw doctor --lint --json
```

当 `openclaw update` 管理全局 npm 安装时，它会先将目标安装到一个临时 npm 前缀中，验证打包的 `dist` 清单，然后将干净的包树交换到真实的全局前缀中。这样可以避免 npm 将新包覆盖到旧包的残留文件之上。如果安装命令失败，OpenClaw 会使用 `--omit=optional` 重试一次。该重试有助于原生可选依赖无法编译的主机，同时如果回退也失败，仍会保留原始失败信息可见。

由 OpenClaw 管理的 npm 更新和插件更新命令还会为子 npm 进程清除 npm 的
`min-release-age` 隔离。npm 可能会将该策略报告为一个派生的 `before` 截止时间；这两者都对通用的供应链
隔离策略有用，但显式的 OpenClaw 更新意味着“现在安装所选的
OpenClaw 发布版本”。

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

自动更新器默认关闭。请在 `~/.openclaw/openclaw.json` 中启用它：

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

| 渠道     | 行为                                                                                           |
| -------- | ---------------------------------------------------------------------------------------------- |
| `stable` | 等待 `stableDelayHours`，然后在 `stableJitterHours` 范围内应用确定性的随机抖动（分批滚动发布）。 |
| `beta`    | 每隔 `betaCheckIntervalHours` 检查一次（默认：每小时），并立即应用。                            |
| `dev`    | 不自动应用。请手动使用 `openclaw update`。                                                     |

网关还会在启动时记录一条更新提示（可通过 `update.checkOnStart: false` 禁用）。
对于降级或事故恢复，可在网关环境中设置 `OPENCLAW_NO_AUTO_UPDATE=1`，即使配置了 `update.auto.enabled` 也会阻止自动应用。除非同时禁用 `update.checkOnStart`，否则启动时的更新提示仍可能运行。

通过实时 Gateway 控制平面处理器请求的包管理器更新，不会替换正在运行的 Gateway 进程中的包树。在受管理
的服务安装上，Gateway 会启动一个分离的交接，退出，并让
常规的 `openclaw update --yes --json` CLI 路径停止服务、替换
包、刷新服务元数据、重启、验证 Gateway 版本和
可达性，并在可能时恢复已安装但未加载的 macOS LaunchAgent。如果
Gateway 无法安全地完成该交接，`update.run` 会返回一条
安全的 shell 命令，而不是在进程内运行包管理器。

## 更新后

<Steps>

### 运行 doctor

```bash
openclaw doctor
```

迁移配置、审计 DM 策略，并检查网关健康状态。详情： [Doctor](/gateway/doctor)

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

## 如果你卡住了

- 再运行一次 `openclaw doctor`，并仔细阅读输出。
- 对于源码检出上的 `openclaw update --channel dev`，更新器会在需要时自动引导安装 `pnpm`。如果你看到 pnpm/corepack 引导错误，请手动安装 `pnpm`（或重新启用 `corepack`）后重新运行更新。
- 查看： [故障排除](/gateway/troubleshooting)
- 在 Discord 中提问： [https://discord.gg/clawd](https://discord.gg/clawd)

## 相关内容

- [安装概览](/install)：所有安装方法。
- [Doctor](/gateway/doctor)：更新后的健康检查。
- [迁移](/install/migrating)：主要版本迁移指南。
