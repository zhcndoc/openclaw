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

如果 `openclaw update` 在 npm 包安装阶段之后失败，请重新运行安装程序。安装程序不会调用旧的更新器；它会直接执行全局包安装，并且可以恢复部分更新的 npm 安装。

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

当 `openclaw update` 管理全局 npm 安装时，它会先将目标安装到一个临时的 npm 前缀中，验证打包的 `dist` 清单，然后把干净的包树切换到真实的全局前缀中。这样可以避免 npm 将新包覆盖到旧包的陈旧文件之上。如果安装命令失败，OpenClaw 会带着 `--omit=optional` 重试一次。该重试有助于原生可选依赖无法编译的主机，同时在回退也失败时保留最初的失败信息。

```bash
pnpm add -g openclaw@latest
```

```bash
bun add -g openclaw@latest
```

### 高级 npm 安装主题

<AccordionGroup>
  <Accordion title="只读包树">
    OpenClaw 将打包的全局安装在运行时视为只读，即使全局包目录对当前用户可写也是如此。捆绑的插件运行时依赖会被暂存到一个可写的运行时目录中，而不是修改包树。这使得 `openclaw update` 不会与正在运行、且在同一次安装期间修复插件依赖的网关或本地代理发生竞争。

    某些 Linux npm 配置会将全局包安装到 root 拥有的目录下，例如 `/usr/lib/node_modules/openclaw`。OpenClaw 通过相同的外部暂存路径支持这种布局。

  </Accordion>
  <Accordion title="加固的 systemd 单元">
    设置一个包含在 `ReadWritePaths` 中的可写暂存目录：

    ```ini
    Environment=OPENCLAW_PLUGIN_STAGE_DIR=/var/lib/openclaw/plugin-runtime-deps
    ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
    ```

    `OPENCLAW_PLUGIN_STAGE_DIR` 也接受路径列表。OpenClaw 会按从左到右的顺序在所列根目录中解析捆绑的插件运行时依赖，将前面的根目录视为只读的预装层，并且只会安装或修复最后一个可写根目录：

    ```ini
    Environment=OPENCLAW_PLUGIN_STAGE_DIR=/opt/openclaw/plugin-runtime-deps:/var/lib/openclaw/plugin-runtime-deps
    ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
    ```

    如果未设置 `OPENCLAW_PLUGIN_STAGE_DIR`，在 systemd 提供 `$STATE_DIRECTORY` 时，OpenClaw 会使用它；否则回退到 `~/.openclaw/plugin-runtime-deps`。修复步骤会将该暂存区视为由 OpenClaw 拥有的本地包根，并忽略用户 npm 前缀和全局设置，因此全局安装的 npm 配置不会将捆绑的插件依赖重定向到 `~/node_modules` 或全局包树中。

  </Accordion>
  <Accordion title="磁盘空间预检">
    在包更新和捆绑运行时依赖修复之前，OpenClaw 会尽力对目标卷执行磁盘空间检查。空间不足会针对检查到的路径发出警告，但不会阻止更新，因为文件系统配额、快照和网络卷可能在检查后发生变化。实际的 npm 安装、复制和安装后验证仍然具有权威性。
  </Accordion>
  <Accordion title="捆绑的插件运行时依赖">
    打包安装会让捆绑的插件运行时依赖留在只读包树之外。在启动时以及执行 `openclaw doctor --fix` 期间，OpenClaw 只会为在配置中处于激活状态、通过旧版渠道配置处于激活状态，或由其捆绑清单默认值启用的捆绑插件修复运行时依赖。仅仅持久化的渠道认证状态不会触发网关启动时的运行时依赖修复。

    显式禁用优先。一个被禁用的插件或渠道不会因为它存在于包中就被修复其运行时依赖。外部插件和自定义加载路径仍然使用 `openclaw plugins install` 或 `openclaw plugins update`。

  </Accordion>
</AccordionGroup>

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

网关在启动时也会记录更新提示（可通过 `update.checkOnStart: false` 禁用）。
对于降级或事故恢复，在网关环境中设置 `OPENCLAW_NO_AUTO_UPDATE=1` 可以阻止自动应用，即使配置了 `update.auto.enabled` 也是如此。除非同时禁用 `update.checkOnStart`，否则启动时的更新提示仍可能运行。

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

<Tip>
`npm view openclaw version` 会显示当前已发布的版本。
</Tip>

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

- [安装概览](/install)：所有安装方法。
- [Doctor](/gateway/doctor)：更新后的健康检查。
- [迁移](/install/migrating)：主要版本迁移指南。
