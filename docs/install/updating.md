---
summary: "安全更新 OpenClaw（全局安装或源码），以及回滚策略"
read_when:
  - 更新 OpenClaw
  - 更新后出现故障
title: "更新"
---

# 更新

OpenClaw 发展迅速（1.0 版本前）。将更新视为发布基础设施：更新 → 运行检测 → 重启（或使用 `openclaw update`，它会重启）→ 验证。

## 推荐：重新运行官网安装器（原地升级）

**首选**的更新路径是重新运行官网安装器。它会检测现有安装，原地升级，并在需要时运行 `openclaw doctor`。

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

注意：

- Add `--no-onboard` 如果你不想再次运行引导流程。
- 对于 **源码安装**，使用：

  ```bash
  curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --no-onboard
  ```

  安装器仅当代码库干净时执行 `git pull --rebase`。

- 对于**全局安装**，脚本底层使用 `npm install -g openclaw@latest`。
- 旧版本提示：`clawdbot` 仍作为兼容适配层提供支持。

## 更新前准备

- 确认安装方式：**全局**（npm/pnpm）还是 **源码**（git clone）。
- 确认 Gateway 的运行方式：**前台终端**还是 **守护服务**（launchd/systemd）。
- 快照你的定制内容：
  - 配置：`~/.openclaw/openclaw.json`
  - 凭证：`~/.openclaw/credentials/`
  - 工作区：`~/.openclaw/workspace`

## 更新指南（全局安装）

全局安装（任选一种）：

```bash
npm i -g openclaw@latest
```

```bash
pnpm add -g openclaw@latest
```

我们**不推荐**为 Gateway 运行时使用 Bun（WhatsApp/Telegram 存在问题）。

切换更新通道（适用于 git + npm 安装）：

```bash
openclaw update --channel beta
openclaw update --channel dev
openclaw update --channel stable
```

Use `--tag <dist-tag|version|spec>` 用于一次性的包目标覆盖。

对于当前 GitHub `main` 主分支，通过包管理器安装：

```bash
openclaw update --tag main
```

手动等效命令：

```bash
npm i -g github:openclaw/openclaw#main
```

```bash
pnpm add -g github:openclaw/openclaw#main
```

你也可以传递明确的包规范给 `--tag` 进行一次性更新（例如 GitHub 引用或 tarball URL）。

请参阅 [开发通道](/install/development-channels) 了解通道语义和发布说明。

备注：npm 安装时，Gateway 启动会输出更新提示（检查当前通道标签）。可通过 `update.checkOnStart: false` 关闭。

### 核心自动更新器（可选）

自动更新器**默认关闭**，是 Gateway 核心功能（非插件）。

```json
{
  "update": {
    "channel": "stable",
    "auto": {
      "enabled": true,
      "stableDelayHours": 6,
      "stableJitterHours": 12,
      "betaCheckIntervalHours": 1
    }
  }
}
```

行为：

- `stable`：检测到新版本后，OpenClaw 会等待 `stableDelayHours`，然后应用确定性的安装抖动（在 `stableJitterHours` 范围内，分散发布）。
- `beta`：每 `betaCheckIntervalHours` 检查更新（默认：每小时），有更新时应用。
- `dev`：不自动应用；需手动执行 `openclaw update`。

启用自动更新前，可用 `openclaw update --dry-run` 预览更新操作。

之后运行：

```bash
openclaw doctor
openclaw gateway restart
openclaw health
```

备注：

- 如果 Gateway 以服务方式运行，优先使用 `openclaw gateway restart`，而非直接杀进程。
- 如果你已锁定特定版本，参考下文“回滚 / 锁定”部分。

## 更新（`openclaw update`）

对于**源码安装**（git 检出）首选：

```bash
openclaw update
```

它运行相对安全的更新流程：

- 需保证工作区干净。
- 切换至指定通道（标签或分支）。
- 拉取 + 变基配置的上游分支（dev 通道）。
- 安装依赖，构建，构建控制 UI，执行 `openclaw doctor`。
- 默认重启 Gateway（使用 `--no-restart` 可跳过）。

如果你通过 **npm/pnpm** 安装（无 git 元数据），`openclaw update` 会尝试用包管理器更新。若检测不到安装，改用“更新（全局安装）”。

## 更新（控制 UI / RPC）

控制 UI 支持**更新并重启**（RPC：`update.run`）。它：

1. 执行与 `openclaw update` 相同的源码更新流程（仅限 git 检出）。
2. 写入带结构化报告（stdout/stderr 尾部）的重启哨兵。
3. 重启 Gateway 并通过报告通知最近活跃会话。

若变基失败，Gateway 终止更新并重启，未应用更新。

## 从源码更新

在仓库检出目录内：

推荐：

```bash
openclaw update
```

手动操作（大致等价）：

```bash
git pull
pnpm install
pnpm build
pnpm ui:build # 首次运行自动安装 UI 依赖
openclaw doctor
openclaw health
```

注意：

- 当你运行打包好的 `openclaw` 二进制文件（[`openclaw.mjs`](https://github.com/openclaw/openclaw/blob/main/openclaw.mjs)）或用 Node 直接执行 `dist/`，`pnpm build` 的步骤很重要。
- 若仅从仓库检出运行且无全局安装，使用 `pnpm openclaw ...` 方式调用 CLI。
- 如直接从 TypeScript 运行（`pnpm openclaw ...`），通常不需重新构建，但配置迁移仍需执行→运行 doctor。
- 在全局安装和 git 安装间切换很简单：安装另一种版本后，运行 `openclaw doctor` 以重写 Gateway 服务入口。

## 必须运行：`openclaw doctor`

Doctor 是“安全更新”核心命令，故意设计简洁：修复 + 迁移 + 警告。

注意：若你是**源码安装**（git 检出），`openclaw doctor` 会建议先运行 `openclaw update`。

功能示例：

- 迁移废弃配置键/旧配置文件位置。
- 审核私聊策略，并警告高风险“开放”设置。
- 检查 Gateway 健康，提供重启建议。
- 检测并迁移旧版 Gateway 服务（launchd/systemd；旧版 schtasks）到当前 OpenClaw 服务。
- Linux 上确保 systemd 用户保持活动（确保 Gateway 登出后存活）。

详情见：[Doctor](/gateway/doctor)

## 启动 / 停止 / 重启 Gateway

CLI 命令（跨平台通用）：

```bash
openclaw gateway status
openclaw gateway stop
openclaw gateway restart
openclaw gateway --port 18789
openclaw logs --follow
```

守护运行时：

- macOS launchd（应用捆绑 LaunchAgent）：

  ```
  launchctl kickstart -k gui/$UID/ai.openclaw.gateway
  ```

  （使用 `ai.openclaw.<profile>`，旧版 `com.openclaw.*` 仍可用）

- Linux systemd 用户服务：

  ```
  systemctl --user restart openclaw-gateway[-<profile>].service
  ```

- Windows（WSL2）：

  ```
  systemctl --user restart openclaw-gateway[-<profile>].service
  ```

  - `launchctl`/`systemctl` 仅在服务已安装时有效，否则执行 `openclaw gateway install`。

运行手册及精确服务标签：[Gateway runbook](/gateway)

## 回滚 / 锁定（出现故障时）

### 锁定版本（全局安装）

安装已知可用版本（将 `<version>` 替换为最后可用的版本）：

```bash
npm i -g openclaw@<version>
```

```bash
pnpm add -g openclaw@<version>
```

提示：查看当前发布版本，运行 `npm view openclaw version`。

然后重启并重新运行 doctor：

```bash
openclaw doctor
openclaw gateway restart
```

### 按日期锁定源码版本

选取某日期的提交（示例：“2026-01-01 时 main 分支状态”）：

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
```

然后重新安装依赖并重启：

```bash
pnpm install
pnpm build
openclaw gateway restart
```

若日后要回到最新版本：

```bash
git checkout main
git pull
```

## 遇到卡住的问题

- 再次运行 `openclaw doctor` 并仔细阅读输出（通常会提示解决方案）。
- 查看：[故障排查](/gateway/troubleshooting)
- 进入 Discord 询问：[https://discord.gg/clawd](https://discord.gg/clawd)
