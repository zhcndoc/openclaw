---
summary: "安全更新 OpenClaw（全局安装或源码），以及回滚策略"
read_when:
  - 更新 OpenClaw
  - 更新后出现故障
title: "更新"
---

保持 OpenClaw 为最新版本。

## 推荐：`openclaw update`

最快的更新方式。它会检测你的安装类型（npm 或 git），获取最新版本，运行 `openclaw doctor`，并重启网关。

```bash
openclaw update
```

切换渠道或指定特定版本：

```bash
openclaw update --channel beta
openclaw update --tag main
openclaw update --dry-run   # 预览而不应用
```

`--channel beta` 会优先使用 beta，但当 beta 标签缺失或比最新稳定版更旧时，运行时会回退到 stable/latest。若你想进行一次性包更新并直接使用原始的 npm beta dist-tag，请使用 `--tag beta`。

请参阅 [开发渠道](/install/development-channels) 了解渠道语义。

## 备选方案：重新运行安装程序

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

添加 `--no-onboard` 以跳过入门设置。对于源码安装，传递 `--install-method git --no-onboard`。

## 备选方案：手动使用 npm、pnpm 或 bun

```bash
npm i -g openclaw@latest
```

```bash
pnpm add -g openclaw@latest
```

```bash
bun add -g openclaw@latest
```

### 全局 npm 安装与运行时依赖

OpenClaw 将打包的全局安装在运行时视为只读，即使当前用户对全局包目录具有写权限也是如此。捆绑的插件运行时依赖会暂存到可写的运行时目录中，而不是修改包树。这样可以避免 `openclaw update` 与正在运行的网关或本地代理发生竞争，因为后者可能会在同一次安装期间修复插件依赖。

某些 Linux 的 npm 配置会将全局包安装到 root 拥有的目录下，例如 `/usr/lib/node_modules/openclaw`。OpenClaw 通过同样的外部暂存路径支持这种布局。

对于加固后的 systemd 单元，请设置一个可写的暂存目录，并将其包含在
`ReadWritePaths` 中：

```ini
Environment=OPENCLAW_PLUGIN_STAGE_DIR=/var/lib/openclaw/plugin-runtime-deps
ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
```

如果未设置 `OPENCLAW_PLUGIN_STAGE_DIR`，OpenClaw 会在 systemd 提供
`$STATE_DIRECTORY` 时使用它，然后回退到 `~/.openclaw/plugin-runtime-deps`。

### 捆绑插件运行时依赖

打包安装会将捆绑插件的运行时依赖排除在只读的包树之外。在启动时以及执行 `openclaw doctor --fix` 时，OpenClaw 只会修复那些在配置中处于激活状态、通过旧版渠道配置处于激活状态，或被其捆绑清单默认值启用的捆绑插件的运行时依赖。

显式禁用优先。某个已禁用的插件或渠道不会因为它存在于包中就自动修复其运行时依赖。外部插件和自定义加载路径仍然使用 `openclaw plugins install` 或
`openclaw plugins update`。

## 自动更新器

自动更新器默认关闭。在 `~/.openclaw/openclaw.json` 中启用它：

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

| 渠道   | 行为                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| `stable` | 等待 `stableDelayHours`，然后在 `stableJitterHours` 范围内以确定性抖动应用（分散发布）。 |
| `beta`   | 每 `betaCheckIntervalHours` 检查一次（默认：每小时）并立即应用。                              |
| `dev`    | 不自动应用。手动使用 `openclaw update`。                                                           |

网关还会在启动时记录更新提示（使用 `update.checkOnStart: false` 禁用）。

## 更新后

<Steps>

### 运行诊断

```bash
openclaw doctor
```

迁移配置、审计 DM 策略并检查网关健康状况。详情：[诊断](/gateway/doctor)

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

### 固定版本 (npm)

```bash
npm i -g openclaw@<version>
openclaw doctor
openclaw gateway restart
```

提示：`npm view openclaw version` 显示当前发布的版本。

### 固定提交 (源码)

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
pnpm install && pnpm build
openclaw gateway restart
```

返回最新版本：`git checkout main && git pull`。

## 如果遇到问题

- 再次运行 `openclaw doctor` 并仔细阅读输出。
- 对于源码检出的 `openclaw update --channel dev`，更新器会在需要时自动引导安装 `pnpm`。如果你看到 pnpm/corepack 引导错误，请手动安装 `pnpm`（或重新启用 `corepack`），然后重新运行更新。
- 查看：[故障排除](/gateway/troubleshooting)
- 在 Discord 提问：[https://discord.gg/clawd](https://discord.gg/clawd)

## 相关内容

- [安装概览](/install) — 所有安装方法
- [诊断](/gateway/doctor) — 更新后的健康检查
- [迁移](/install/migrating) — 主版本迁移指南
