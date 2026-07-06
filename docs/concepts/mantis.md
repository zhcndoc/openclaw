---
summary: "Mantis 是用于在真实传输环境中复现 OpenClaw 缺陷的可视化端到端验证系统，可捕获前后证据，并将工件附加到 PR。"
title: "Mantis"
read_when:
  - 为 OpenClaw 缺陷构建或运行实时可视化 QA
  - 为拉取请求添加前后验证
  - 添加 Discord、Slack、WhatsApp 或其他实时传输场景
  - 调试需要截图、浏览器自动化或 VNC 访问的 QA 运行
---

Mantis 会在真实传输环境中，针对已知有缺陷的基线 ref 和候选 ref 重新运行一个 bug 场景，然后将前后对比作为 CI 工件和 PR 评论发布。Discord 最先支持：真实机器人认证、真实 guild 频道、表情反应、线程，以及人类可检查的浏览器见证。Slack 和 Telegram 通道也已存在；WhatsApp 和 Matrix 仍未实现。

## 所有权

- OpenClaw (`extensions/qa-lab/src/mantis/*`): 场景运行时、`pnpm openclaw qa mantis <command>` CLI、证据 schema。
- QA Lab (`extensions/qa-lab/src/live-transports/*`): 实时传输测试框架、driver/SUT bots、报告/证据写入器。
- Crabbox (`openclaw/crabbox`): 预热的 Linux 机器、租约、VNC、`crabbox media preview`。
- GitHub Actions (`.github/workflows/mantis-*.yml`): 远程入口点、artifact 保留。
- ClawSweeper: 解析维护者 PR 命令、分发工作流、发布最终 PR 评论。

## CLI 命令

所有命令均为 `pnpm openclaw qa mantis <command>`，定义在
`extensions/qa-lab/src/mantis/cli.ts`。构建/运行时需要 `OPENCLAW_ENABLE_PRIVATE_QA_CLI=1`
（打包后的工作流会在构建前设置 `OPENCLAW_BUILD_PRIVATE_QA=1` 和
`OPENCLAW_ENABLE_PRIVATE_QA_CLI=1`）。

| Command                         | Purpose                                                                                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `discord-smoke`                 | 验证 Mantis Discord 机器人能够看到 guild/channel、发消息并添加反应。                                                                                      |
| `run`                           | 针对 baseline 和 candidate refs 运行一个前后对比场景（仅 Discord）。                                                                                        |
| `desktop-browser-smoke`         | 租用/复用一个 Crabbox 桌面，打开可见浏览器，捕获截图 + 视频。                                                                                              |
| `slack-desktop-smoke`           | 租用/复用一个 Crabbox 桌面，在其中运行 Slack QA，打开 Slack Web，捕获证据。                                                                                |
| `telegram-desktop-builder`      | 租用/复用一个 Crabbox 桌面，安装 Telegram Desktop，并可选择配置 OpenClaw 网关。                                                                            |
| `visual-task` / `visual-driver` | 通用 Crabbox 桌面捕获，支持可选的图像理解断言；`visual-driver` 是在 `crabbox record --while` 下启动的 driver 部分。                                           |

每个命令都接受 `--repo-root <path>` 和 `--output-dir <path>`；Crabbox
命令还接受 `--crabbox-bin`、`--provider`、`--machine-class`/`--class`、
`--lease-id`、`--idle-timeout`、`--ttl` 和 `--keep-lease`。除非另有说明，本地 CLI 的 provider/class 默认值为
`hetzner`/`beast`；CI 工作流通常会同时覆盖这两项。

### `discord-smoke`

```bash
pnpm openclaw qa mantis discord-smoke \
  --output-dir .artifacts/qa-e2e/mantis/discord-smoke
```

调用 Discord REST API（`https://discord.com/api/v10`）获取机器人
用户、guild、guild 的 channels 以及目标 channel，断言该 channel
属于该 guild，然后（除非使用 `--skip-post`）发送一条消息并添加
`👀` 反应。写出 `mantis-discord-smoke-summary.json` 和
`mantis-discord-smoke-report.md`。

Token 解析顺序：`--token-file` 的值，然后是
`OPENCLAW_QA_DISCORD_MANTIS_BOT_TOKEN`（可用 `--token-env` 覆盖），然后是由
`OPENCLAW_QA_DISCORD_MANTIS_BOT_TOKEN_FILE` 指定的文件（可用 `--token-file-env` 覆盖）。
Guild/channel id 来自 `OPENCLAW_QA_DISCORD_GUILD_ID` / `OPENCLAW_QA_DISCORD_CHANNEL_ID`（可用
`--guild-id` / `--channel-id` 覆盖），且必须是 17-20 位数字的 Discord snowflake。设置
`OPENCLAW_QA_REDACT_PUBLIC_METADATA=1` 可在发布的 summary 和 report 中将 bot/guild/channel/message ids
以及名称替换为 `<redacted>`。

### `run`

```bash
pnpm openclaw qa mantis run \
  --transport discord \
  --scenario discord-status-reactions-tool-only \
  --baseline origin/main \
  --candidate HEAD \
  --output-dir .artifacts/qa-e2e/mantis/local-discord-status-reactions
```

`--transport` 目前只接受 `discord`。`--scenario` 是两个内置 id 之一，每个都有自己默认的 baseline ref 和
期望的前后标签（`extensions/qa-lab/src/mantis/run.runtime.ts`）：

| Scenario                                   | Default baseline                           | Baseline expects                         | Candidate expects            |
| ----------------------------------------- | ---------------------------------------- | ---------------------------------------- | ---------------------------- |
| `discord-status-reactions-tool-only`       | `0bf06e953fdda290799fc9fb9244a8f67fdae593` | `queued-only`                            | `queued -> thinking -> done` |
| `discord-thread-reply-filepath-attachment` | `81349cdc2a9d5143fd0991ed858b739e7d96e05c` | thread reply omits `filePath` attachment | thread reply includes it     |

`--candidate` 默认是 `HEAD`。其他参数：`--credential-source`
（默认 `convex`）、`--credential-role`（默认 `ci`）、`--provider-mode`
（默认 `live-frontier`）、`--fast`（默认开启）、`--skip-install`、`--skip-build`。

运行器会在 `<output-dir>/worktrees/` 下为 baseline 和 candidate 创建分离的
`git worktree` 检出，在每个工作区中运行 `pnpm install`/`pnpm build`
（除非被跳过），然后针对每个 worktree 运行
`pnpm openclaw qa discord --scenario <id> --model openai/gpt-5.4 --alt-model openai/gpt-5.4 --allow-failures`。
每个 lane 会写入 `discord-qa-reaction-timelines.json` 以及一对
`<scenario-id>-timeline.html`/`.png`；运行器会将这些证据复制回
`baseline/`/`candidate/` 下，在输出目录中写入 `comparison.json`、
`mantis-report.md` 和 `mantis-evidence.json`，并在比较未通过时以非零退出
（baseline `fail` 且 candidate `pass`）退出。

第二个 Discord 场景（`discord-thread-reply-filepath-attachment`）使用 driver 机器人
发布一个父消息，创建一个真实 thread，带着 repo 本地的 `filePath` 调用 SUT 的
`message.thread-reply` 动作，然后轮询 thread 以获取回复和附件文件名。它期望一个名为
`mantis-thread-report.md` 的附件。

### `desktop-browser-smoke`

```bash
pnpm openclaw qa mantis desktop-browser-smoke \
  --output-dir .artifacts/qa-e2e/mantis/desktop-browser
```

租用或复用一个 Crabbox 桌面，在指向 `--browser-url`（默认 `https://openclaw.ai`）或渲染后的
`--html-file` 的 VNC 会话中启动浏览器，等待后使用 `scrot` 截图，可选地用
`ffmpeg` 录制 MP4，并将 `desktop-browser-smoke.png` / `.mp4` / `remote-metadata.json`
rsync 回 `--output-dir`。

标志：

- `--lease-id <cbx_...>` 复用一个已加热的桌面，而不是创建新的。
- `--browser-profile-dir <remote-path>` 复用远程 Chrome user-data-dir，以便持久化桌面在多次运行之间保持登录状态（用于长期存在的 Discord Web viewer 配置文件）。
- `--browser-profile-archive-env <name>` 在启动前从该环境变量恢复一个 base64 的 `.tgz` Chrome profile 归档（默认 `OPENCLAW_MANTIS_BROWSER_PROFILE_TGZ_B64`）；用于 Discord Web 等已登录的 witness。
- `--video-duration <seconds>` 控制 MP4 录制时长（默认 10 秒）。
- `--keep-lease`（或 `OPENCLAW_MANTIS_KEEP_VM=1`）会保留本次运行创建的 lease 以便进行 VNC 检查；创建 lease 的失败运行也会默认保留它。

对于 Discord Web 证据，Mantis 使用专用的 viewer 账号，而不是 bot
token。Discord REST oracle（通过 `qa discord`）仍然是权威来源；当
设置 `OPENCLAW_QA_DISCORD_CAPTURE_UI_METADATA=1` 时，该场景还会写出一个
Discord Web URL 证据文件，而 `OPENCLAW_QA_DISCORD_KEEP_THREADS=1` 会让 thread 保持打开足够长的时间，以便浏览器能够打开它。

GitHub workflow 优先使用持久化的 viewer profile，通过
`MANTIS_DISCORD_VIEWER_CHROME_PROFILE_DIR`（完整的 profile 归档可能会超过
GitHub secret 大小限制）；对于较小/引导型 profile，它也可以改为恢复
来自 `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_TGZ_B64` 的 base64 `.tgz`。如果这两种来源都未配置，workflow 仍会发布确定性的
baseline/candidate 截图，并记录已跳过登录 witness。

### `slack-desktop-smoke`

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --output-dir .artifacts/qa-e2e/mantis/slack-desktop \
  --gateway-setup \
  --scenario slack-canary \
  --keep-lease
```

租用或复用一个 Crabbox 桌面，将 checkout 同步到 VM 中，在其中运行
`pnpm openclaw qa slack`，在 VNC 浏览器中打开 Slack Web，
捕获桌面，并将 Slack QA 产物（`slack-qa/`）和 VNC 截图/视频一起复制回本地。
这是唯一一种 SUT gateway 和浏览器都在同一个 VM 中运行的 Mantis 形态。

使用 `--gateway-setup` 时，命令会在 VM 中创建一个持久但可丢弃的 OpenClaw
home：`$HOME/.openclaw-mantis/slack-openclaw`，为目标 channel 打补丁 Slack
Socket Mode 配置，启动
`openclaw gateway run --dev --allow-unconfigured --port 38973`，并让 Chrome
在 VNC 会话中继续运行；省略 `--gateway-setup` 则会改为运行常规的 bot-to-bot Slack QA lane。

`--credential-source env` 所需的环境变量（本地默认是 `env`；role 默认是 `maintainer`）：

- `OPENCLAW_QA_SLACK_CHANNEL_ID`
- `OPENCLAW_QA_SLACK_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_APP_TOKEN`
- 远程 model lane 需要 `OPENCLAW_LIVE_OPENAI_KEY`（如果本地只设置了 `OPENAI_API_KEY`，Mantis 会在调用 Crabbox 之前将其复制到 `OPENCLAW_LIVE_OPENAI_KEY`）

使用 `--credential-source convex` 时，Mantis 会在创建 VM 之前从共享池中租用 Slack SUT 凭据，并将 channel id、app token 和 bot token 以 `OPENCLAW_MANTIS_SLACK_*` 环境变量传入 VM，因此 GitHub workflow 只需要 Convex broker secret，而不需要原始 Slack token。

其他标志：`--slack-url <url>` 打开特定 URL（否则 Mantis 会从 `auth.test` 推导出
`https://app.slack.com/client/<team>/<channel>`）；`--slack-channel-id <id>` 设置 gateway 允许列表的 channel；
`OPENCLAW_MANTIS_SLACK_BROWSER_PROFILE_DIR` 控制 VM 内持久化的 Chrome profile（默认 `$HOME/.config/openclaw-mantis/slack-chrome-profile`）；
`--approval-checkpoints` 运行原生 Slack approval 场景
（`slack-approval-exec-native`、`slack-approval-plugin-native`）并渲染
pending/resolved checkpoint 截图，而不是进行 gateway setup（与 `--gateway-setup` 互斥）；`--hydrate-mode source|prehydrated`、
`--provider-mode`、`--model`、`--alt-model` 和 `--fast` 会透传到
Slack live lane。

approval checkpoint 截图是根据场景观察到的 Slack API 消息渲染出来的，而不是来自实时 Slack UI；只有当 lease 的浏览器 profile 已经登录时，`slack-desktop-smoke.png` 才能作为 Slack Web 本身的证据。

### `telegram-desktop-builder`

```bash
pnpm openclaw qa mantis telegram-desktop-builder \
  --credential-source convex \
  --credential-role maintainer \
  --keep-lease
```

租用或复用一个 Crabbox 桌面，安装原生 Linux 版 Telegram Desktop，
可选地恢复一个用户会话归档，使用租用到的 Telegram SUT bot token 配置 OpenClaw，
启动 `openclaw gateway run --dev --allow-unconfigured --port 38974`，向租用的私有群组发送一条 driver-bot 就绪消息，然后捕获截图和 MP4。bot token 只用于配置 OpenClaw；它不会用于登录 Telegram Desktop。桌面 viewer 是一个独立的 Telegram 用户会话，可以通过 `--telegram-profile-archive-env <name>` 恢复，或者通过 VNC 手动登录后再使用 `--keep-lease` 保持在线。

标志：`--lease-id <cbx_...>` 针对一个已经登录到 Telegram Desktop 的 VM 重新运行；`--telegram-profile-archive-env <name>` 在启动前恢复一个 base64 的 `.tgz` profile 归档；`--telegram-profile-dir <remote-path>` 设置远程 profile 目录（默认 `$HOME/.local/share/TelegramDesktop`）；`--no-gateway-setup` 仅安装并打开 Telegram Desktop；`--credential-source`/`--credential-role` 默认分别为 `convex`/`maintainer`。

## 证据清单

每个会发布到 PR 的场景都会在其报告旁边写入 `mantis-evidence.json`：

```json
{
  "schemaVersion": 1,
  "id": "discord-status-reactions",
  "title": "Mantis Discord 状态反应 QA",
  "summary": "用于 PR 评论的人类可读顶部摘要。",
  "scenario": "discord-status-reactions-tool-only",
  "comparison": {
    "baseline": { "sha": "...", "status": "fail", "expected": "queued-only" },
    "candidate": { "sha": "...", "status": "pass", "expected": "queued -> thinking -> done" },
    "pass": true
  },
  "artifacts": [
    {
      "kind": "timeline",
      "lane": "baseline",
      "label": "基线 queued-only",
      "path": "baseline/timeline.png",
      "targetPath": "baseline.png",
      "alt": "基线 Discord 时间线",
      "width": 420
    }
  ]
}
```

制品 `path` 是相对于清单目录的路径；`targetPath` 是相对于已配置的 R2/S3 制品前缀的路径。`scripts/mantis/publish-pr-evidence.mjs` 会拒绝路径穿越，并在文件缺失时跳过 `"required": false` 的条目。

制品类型：`timeline`（确定性的前后对比截图）、`desktopScreenshot`（VNC/浏览器截图）、`motionPreview`（录制中的内联动画 GIF）、`motionClip`（经过运动裁剪的 MP4）、`fullVideo`（完整录制）、`metadata`（JSON/日志伴随文件）、`report`（Markdown 报告）。

一次运行的磁盘制品布局：

```text
.artifacts/qa-e2e/mantis/<run-id>/
  mantis-report.md
  mantis-evidence.json
  baseline/
  candidate/
  comparison.json
```

截图属于证据，不是秘密，但仍然需要遵守脱敏规范：可能会出现私密频道名称、用户名或消息内容。对于公开制品上传，请设置 `OPENCLAW_QA_REDACT_PUBLIC_METADATA=1`；在 Discord/Slack/Telegram 的 GitHub 工作流中默认已启用。

## GitHub 自动化

`scripts/mantis/publish-pr-evidence.mjs` 是可复用的发布器。工作流会传入 manifest、目标 PR、artifact 目标根目录、评论标记、artifact URL、run URL 和请求来源来调用它。它会将声明的 artifacts 上传到 Mantis R2 存储桶，生成一个以摘要优先的 PR 评论，内联图片/预览并链接视频，然后更新现有的标记评论或创建一个新的评论。所需环境变量：

- `MANTIS_ARTIFACT_R2_ACCESS_KEY_ID`
- `MANTIS_ARTIFACT_R2_SECRET_ACCESS_KEY`
- `MANTIS_ARTIFACT_R2_BUCKET`（工作流设置为 `openclaw-crabbox-artifacts`）
- `MANTIS_ARTIFACT_R2_ENDPOINT`
- `MANTIS_ARTIFACT_R2_REGION`（工作流设置为 `auto`）
- `MANTIS_ARTIFACT_R2_PUBLIC_BASE_URL`（工作流设置为 `https://artifacts.openclaw.ai`）

评论通过 Mantis GitHub App（`MANTIS_GITHUB_APP_ID` /
`MANTIS_GITHUB_APP_PRIVATE_KEY`）发布，而不是 `github-actions[bot]`，并使用一个隐藏的标记评论作为 upsert 键。

| 工作流                             | 触发方式                                                                                   | 作用                                                                                                                                                                                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Mantis Discord Smoke`            | 手动触发                                                                                   | 在所选 ref 上运行 `discord-smoke`。                                                                                                                                                                                                                                                     |
| `Mantis Discord Status Reactions` | PR 评论或手动触发                                                                            | 构建独立的 baseline/candidate worktree，在每个 worktree 上运行 `discord-status-reactions-tool-only`，在 Crabbox 桌面浏览器中渲染每个 lane 的时间线，使用 `crabbox media preview` 生成经过 motion-trim 的 GIF/MP4 预览，上传 artifacts，发布内联 PR 证据。            |
| `Mantis Scenario`                 | 手动触发                                                                                   | 通用分发器：接收 `scenario_id`（`discord-status-reactions-tool-only`、`discord-thread-reply-filepath-attachment`、`slack-desktop-smoke`、`telegram-live`、`telegram-desktop-proof`）、`baseline_ref`、`candidate_ref`、`pr_number`，并转发到匹配的场景工作流。 |
| `Mantis Slack Desktop Smoke`      | 手动触发                                                                                   | 租用一个 Crabbox Linux 桌面（默认 `aws`，可选 `hetzner`），在 candidate 上运行 `slack-desktop-smoke --gateway-setup`，录制桌面，生成 motion 预览，上传 artifacts；如果提供了 PR 编号，则发布 PR 证据。                                 |
| `Mantis Telegram Live`            | PR 评论或手动触发                                                                            | 运行 bot-API Telegram live QA lane（`openclaw qa telegram`），根据 QA 摘要写入 `mantis-evidence.json`，通过 Crabbox 桌面浏览器渲染脱敏后的证据 HTML，生成 motion GIF，发布 PR 证据。该 lane 不需要 Telegram Web 登录。          |
| `Mantis Telegram Desktop Proof`   | 维护者 PR 标签（`mantis: telegram-visible-proof`）加上 PR 评论，或手动触发                     | 代理式原生 Telegram Desktop 前后对比证明。将 PR、baseline/candidate refs 以及维护者指令交给 Codex，由其针对两个 refs 运行真实用户的 Crabbox Telegram Desktop proof lane，并发布一个两列的 PR 证据表。                                         |

`Mantis Discord Status Reactions` 和 `Mantis Telegram Live` 都接受
`baseline_ref`/`candidate_ref`（或在 PR 评论中使用 `baseline=`/`candidate=`）
，并在使用包含密钥的凭据运行前验证解析出的 SHA 是否为 `origin/main` 的祖先、发布标签（`v*`），或某个开放 PR 的 head。

来自具有 write/maintain/admin 访问权限的 PR 的评论触发器：

```text
@openclaw-mantis discord status reactions
@openclaw-mantis discord status reactions baseline=origin/main candidate=HEAD
@openclaw-mantis telegram
@openclaw-mantis telegram scenario=telegram-status-command
@openclaw-mantis telegram scenarios=telegram-status-command,telegram-mentioned-message-reply
```

Telegram 评论触发器默认使用 PR head SHA 作为 candidate，并以 `telegram-status-command` 作为 scenario；它们接受 `provider=aws|hetzner` 和
`lease=<cbx_...>`，用于指定特定的 Crabbox provider 或预热好的桌面。`Mantis Telegram Desktop Proof` 仅在 PR 已经带有 `mantis: telegram-visible-proof` 标签时，才会响应 PR 评论。

ClawSweeper 也可以直接分发一个场景：

```text
@clawsweeper mantis discord discord-status-reactions-tool-only
```

## 机器与密钥

本地 CLI Crabbox 的默认值为 `--provider hetzner --class beast`；可通过 `--provider`、`--class`/`--machine-class`，或 `OPENCLAW_MANTIS_CRABBOX_PROVIDER` / `OPENCLAW_MANTIS_CRABBOX_CLASS` 覆盖。GitHub 工作流通常会同时覆盖这两项（例如 `--class standard`，以及 Slack 工作流中的 `aws`/`hetzner` provider 选择输入）。如果某个 provider 过慢或不可用，请在相同的 Crabbox 接口后面添加它，而不是硬编码回退方案。

VM 基线：Linux，带有可用于桌面的 Chrome/Chromium、CDP 访问、VNC/noVNC、Node 22+ 和 pnpm、OpenClaw 检出版本，以及到目标传输层、GitHub、模型提供商和凭据代理的出站访问。

Mantis 工作流中使用的密钥名称：

- `OPENCLAW_QA_DISCORD_MANTIS_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_REDACT_PUBLIC_METADATA=1` 用于公开制品上传
- `OPENCLAW_QA_CONVEX_SITE_URL`、`OPENCLAW_QA_CONVEX_SECRET_CI`
- `CRABBOX_COORDINATOR` / `CRABBOX_COORDINATOR_TOKEN`（工作流也接受 `OPENCLAW_QA_MANTIS_CRABBOX_COORDINATOR` / `_TOKEN` 作为回退，并在调用 Crabbox 之前将它们映射到普通名称）
- `MANTIS_GITHUB_APP_ID`、`MANTIS_GITHUB_APP_PRIVATE_KEY`

Mantis 运行器绝不能打印 Discord/Slack/Telegram bot token、provider API key、浏览器 cookie、认证配置文件内容、VNC 密码或原始凭据载荷。如果 token 泄漏到 issue、PR、聊天或日志中，在替换密钥存储之后必须轮换它。

## 运行结果

一个场景可能以两种可区分的方式失败，报告会将它们分开，以免不稳定的环境被误读为产品回归：

- **Bug reproduced**：基线以该场景预期的方式失败。
- **Harness failure**：在 oracle 变得有意义之前，环境设置、凭据、传输 API、浏览器或提供方就已失败。

## 添加场景

场景是按传输方式用 TypeScript 定义的（参见
`extensions/qa-lab/src/mantis/run.runtime.ts` 中的 `MANTIS_SCENARIO_CONFIGS`，
了解 Discord 的前后结构），而不是一种独立的声明式文件格式。
每个场景都需要：id 和 title、transport、所需凭据、baseline ref policy、candidate ref policy、OpenClaw config patch、setup/stimulus steps、
expected baseline 和 candidate oracle、visual capture targets、timeout
budget，以及 cleanup steps。

优先使用小而类型化的 oracle，而不是视觉检查：例如 Discord 的 reaction 状态或
message references、Slack thread 的 `ts`/reaction API 状态、email message ids
和 headers。仅当 UI 是唯一可靠的可观测对象时才使用浏览器截图，
并且如果平台 API oracle 存在，视觉检查应作为补充。

在 Discord、Slack 和 Telegram 之后，同一 runner 形态会扩展到 WhatsApp
（QR 登录、重新识别、送达、媒体、reactions）和 Matrix
（加密房间、线程/回复关系、重启恢复）；这两者都尚未实现。

## 未决问题

- 当复用现有的 Mantis bot 时，哪个 Discord bot 应该作为驱动方，哪个应该作为被测系统（SUT）？
- GitHub 应该将 PR 的 Mantis 产物保留多长时间？
- 什么时候 ClawSweeper 应该自动推荐一个 Mantis 场景，而不是等待维护者命令？
- 对于公开 PR，截图在上传前是否应该进行遮盖或裁剪？
