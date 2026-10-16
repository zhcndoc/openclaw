---
summary: "Mantis 捕获视觉端到端证据以进行实时传输比较并聚焦候选浏览器证明，然后将工件附加到 PR。"
title: "螳螂"
read_when:
  - "为 OpenClaw 缺陷构建或运行实时视觉 QA"
  - "为拉取请求添加前后验证"
  - "添加 Discord、Slack、WhatsApp 或其他实时传输场景"
  - "运行针对候选引用的聚焦 Control UI 浏览器证明"
  - "调试需要屏幕截图、浏览器自动化或 VNC 访问的 QA 运行"
---

Mantis 发布了 CI 视觉证据和针对 OpenClaw 行为的 PR 评论。实时传输场景将已知的不良基线与候选参考进行比较；相反，聚焦的浏览器通道可能会证明一个候选人反对固定响应模拟传输。 Discord 首先附带真实的机器人身份验证、行会通道、反应、线程和浏览器见证。 Slack 和集中 Control UI 聊天通道也存在； WhatsApp 和 Matrix 未实现。

## <a id="ownership"></a> 所有权

- OpenClaw (`extensions/qa-lab/src/mantis/*`): 场景运行时、`pnpm openclaw qa mantis <command>` CLI、证据 schema。
- QA 实验室 （`extensions/qa-lab/src/live-transports/*`）：实时传输harness、driver/SUT 机器人、report/evidence 编写器。
- Crabbox (`openclaw/crabbox`): 预热的 Linux 机器、租约、VNC、`crabbox media preview`。
- GitHub Actions (`.github/workflows/mantis-*.yml`): 远程入口点、artifact 保留。
- ClawSweeper：独立审查证明并拥有review/readiness保单。 Mantis工作流程调度和证据发布与普通评论发布是分开的； Mantis 结果本身并不授予就绪或合并权限。

## <a id="cli-commands"></a> CLI 命令

所有命令均为 `pnpm openclaw qa mantis <command>`，在 `extensions/qa-lab/src/mantis/cli.ts` 中定义。在 build/run 时间需要 `OPENCLAW_ENABLE_PRIVATE_QA_CLI=1`（捆绑工作流在构建之前设置 `OPENCLAW_BUILD_PRIVATE_QA=1` 和 `OPENCLAW_ENABLE_PRIVATE_QA_CLI=1`）。

| 命令                         | 用途                                                                                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `discord-smoke`                 | 验证 Mantis Discord 机器人能够看到 guild/channel、发消息并添加反应。                                                                                 |
| `run`                           | 针对基线和候选参考运行 before/after 场景（仅限 Discord）。                                                                           |
| `desktop-browser-smoke`         | Lease/reuse 一个Crabbox桌面，打开可见浏览器，捕获截图+视频。                                                                        |
| `slack-desktop-smoke`           | Lease/reuse一个Crabbox桌面，在里面运行Slack QA，打开Slack Web，抓取证据。                                                                  |
| `visual-task` / `visual-driver` | 通用 Crabbox 桌面捕获，支持可选的图像理解断言；`visual-driver` 是在 `crabbox record --while` 下启动的 driver 部分。 |

每个命令接受 `--repo-root <path>` 和 `--output-dir <path>`； Crabbox 命令还接受 `--crabbox-bin`、`--provider`、`--machine-class`/`--class`、`--lease-id`、`--idle-timeout`、`--ttl` 和 `--keep-lease`。 provider/class 的本地 CLI 默认为 `hetzner`/`beast`，但 `desktop-browser-smoke` 默认为类 `tiny`； CI 工作流程通常会覆盖两者。

### `discord-smoke`

```bash
pnpm openclaw qa mantis discord-smoke \
  --output-dir .artifacts/qa-e2e/mantis/discord-smoke
```

调用 Discord REST API（`https://discord.com/api/v10`）获取机器人用户、guild、guild 的 channels 以及目标 channel，断言该 channel 属于该 guild，然后（除非使用 `--skip-post`）发送一条消息并添加 `👀` 反应。写出 `mantis-discord-smoke-summary.json` 和 `mantis-discord-smoke-report.md`。

Token 解析顺序：`--token-file` 的值，然后是 `OPENCLAW_QA_DISCORD_MANTIS_BOT_TOKEN`（可用 `--token-env` 覆盖），然后是由 `OPENCLAW_QA_DISCORD_MANTIS_BOT_TOKEN_FILE` 指定的文件（可用 `--token-file-env` 覆盖）。 Guild/channel id 来自 `OPENCLAW_QA_DISCORD_GUILD_ID` / `OPENCLAW_QA_DISCORD_CHANNEL_ID`（可用 `--guild-id` / `--channel-id` 覆盖），且必须是 17-20 位数字的 Discord snowflake。设置 `OPENCLAW_QA_REDACT_PUBLIC_METADATA=1` 可在发布的 summary 和 report 中将 bot/guild/channel/message ids 以及名称替换为 `<redacted>`。

### `run`

```bash
pnpm openclaw qa mantis run \
  --transport discord \
  --scenario discord-status-reactions-tool-only \
  --baseline origin/main \
  --candidate HEAD \
  --output-dir .artifacts/qa-e2e/mantis/local-discord-status-reactions
```

`--transport` 目前仅接受 `discord`。 `--scenario` 是两个内置 id 之一，每个 id 都有自己的默认基线引用和预期的 before/after 标签 （`extensions/qa-lab/src/mantis/run.runtime.ts`）：

| 场景                                   | 默认基线                           | 基线预期                         | 候选人期望            |
| ------------------------------------------ | ------------------------------------------ | ---------------------------------------- | ---------------------------- |
| `discord-status-reactions-tool-only`       | `0bf06e953fdda290799fc9fb9244a8f67fdae593` | `queued-only`                            | `queued -> thinking -> done` |
| `discord-thread-reply-filepath-attachment` | `81349cdc2a9d5143fd0991ed858b739e7d96e05c` | 线程回复省略 `filePath` 附件 | 线程回复包含它     |

`--candidate` 默认是 `HEAD`。其他参数：`--credential-source` （默认 `convex`）、`--credential-role`（默认 `ci`）、`--provider-mode` （默认 `live-frontier`）、`--fast`（默认开启）、`--skip-install`、`--skip-build`。

运行者将 `--output-dir` 视为稳定的容器。它必须命名存储库内的相对子目录；存储库根 （`.`）、绝对路径和转义存储库的路径将被拒绝。分离的 `git worktree` 结帐在 `<output-dir>.worktrees/` 下进行。每个结帐都有一个唯一的 `<lane>-<run-id>` 名称，因此中断的运行不会与后来的基线或候选者发生冲突。运行程序在每次结帐时运行 `pnpm install`/`pnpm build`（除非跳过），然后针对每个工作树运行 `pnpm openclaw qa discord --scenario <id> --model openai/gpt-5.4 --alt-model openai/gpt-5.4 --allow-failures`。每个通道写入 `discord-qa-reaction-timelines.json` 和一对 `<scenario-id>-timeline.html`/`.png`。在要求 Git 删除签出之前，运行者将通道证据复制到 `<output-dir>` 下的私有暂存目录中。

在两个通道及其清理完成后，运行程序将 `comparison.json`、`mantis-report.md` 和 `mantis-evidence.json` 添加到暂存集，然后替换五个稳定条目，并在发布失败时回滚。失败的尝试保留前面完整的证据集并写入`error.txt`；成功的尝试将删除较旧的 `error.txt`。现有的自动化继续直接读取稳定路径。为每个同时运行的命令使用不同的输出目录；到一个共享输出目录的发布未序列化。现有的不相关的顶级文件将被保留。如果比较未通过（基线 `fail` 和候选 `pass`），则命令以非零值退出。

第二个 Discord 场景 （`discord-thread-reply-filepath-attachment`） 使用驱动程序机器人发布父消息，创建一个真实线程，使用存储库本地 `filePath` 调用 SUT 的 `message.thread-reply` 操作，然后轮询线程以获取回复和附件文件名。它需要一个名为 `mantis-thread-report.md` 的附件。

### `desktop-browser-smoke`

```bash
pnpm openclaw qa mantis desktop-browser-smoke \
  --output-dir .artifacts/qa-e2e/mantis/desktop-browser
```

租用或复用一个 Crabbox 桌面，在指向 `--browser-url`（默认 `https://openclaw.ai`）或渲染后的 `--html-file` 的 VNC 会话中启动浏览器，等待后使用 `scrot` 截图，可选地用 `ffmpeg` 录制 MP4，并将 `desktop-browser-smoke.png` / `.mp4` / `remote-metadata.json` rsync 回 `--output-dir`。

标志：

- `--lease-id <cbx_...>` 复用一个已加热的桌面，而不是创建新的。
- `--browser-profile-dir <remote-path>` 复用远程 Chrome user-data-dir，以便持久化桌面在多次运行之间保持登录状态（用于长期存在的 Discord Web viewer 配置文件）。
- `--browser-profile-archive-env <name>` 在启动前从该环境变量恢复一个 base64 的 `.tgz` Chrome profile 归档（默认 `OPENCLAW_MANTIS_BROWSER_PROFILE_TGZ_B64`）；用于 Discord Web 等已登录的 witness。
- `--video-duration <seconds>` 控制MP4 捕获长度（默认10s）。
- `--keep-lease`（或 `OPENCLAW_MANTIS_KEEP_VM=1`）会保留本次运行创建的 lease 以便进行 VNC 检查；创建 lease 的失败运行也会默认保留它。

对于 Discord Web 证据，Mantis 使用专用的 viewer 账号，而不是 bot token。Discord REST oracle（通过 `qa discord`）仍然是权威来源；当设置 `OPENCLAW_QA_DISCORD_CAPTURE_UI_METADATA=1` 时，该场景还会写出一个 Discord Web URL 证据文件，而 `OPENCLAW_QA_DISCORD_KEEP_THREADS=1` 会让 thread 保持打开足够长的时间，以便浏览器能够打开它。

GitHub 工作流程更喜欢通过 `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_DIR` 持久查看者配置文件（完整配置文件存档可以超出 GitHub 的秘密大小限制）；对于 small/bootstrap 配置文件，它可以从 `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_TGZ_B64` 恢复 base64 `.tgz`。在未配置任何源的情况下，工作流仍会发布生成的 baseline/candidate 屏幕截图并记录已跳过登录的见证人。

### `slack-desktop-smoke`

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --output-dir .artifacts/qa-e2e/mantis/slack-desktop \
  --gateway-setup \
  --scenario slack-canary \
  --keep-lease
```

租赁或重复使用 Crabbox 桌面，将结帐同步到 VM，在其中运行 `pnpm openclaw qa slack`，在 VNC 浏览器中打开 Slack Web，捕获桌面，并复制 Slack QA 工件（`slack-qa/`） 和 VNC screenshot/video 返回本地。这是 SUT 网关和浏览器都在同一 VM 内运行的唯一 Mantis 形状。

使用 `--gateway-setup` 时，命令会在 VM 中创建一个持久但可丢弃的 OpenClaw home：`$HOME/.openclaw-mantis/slack-openclaw`，为目标 channel 打补丁 Slack Socket Mode 配置，启动 `openclaw gateway run --dev --allow-unconfigured --port 38973`，并让 Chrome 在 VNC 会话中继续运行；省略 `--gateway-setup` 则会改为运行常规的 bot-to-bot Slack QA lane。

`--credential-source env` 所需的环境变量（本地默认是 `env`；role 默认是 `maintainer`）：

- `OPENCLAW_QA_SLACK_CHANNEL_ID`
- `OPENCLAW_QA_SLACK_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_APP_TOKEN`
- 远程 model lane 需要 `OPENCLAW_LIVE_OPENAI_KEY`（如果本地只设置了 `OPENAI_API_KEY`，Mantis 会在调用 Crabbox 之前将其复制到 `OPENCLAW_LIVE_OPENAI_KEY`）

使用 `--credential-source convex`，Mantis 在创建 VM 之前从共享池租用 Slack SUT 凭证，并将通道 id、应用程序令牌和机器人令牌转发到 VM 作为 `OPENCLAW_MANTIS_SLACK_*` 环境变量，因此GitHub 工作流程仅需要凸代理秘密，而不是原始 Slack 令牌。

其他标志：`--slack-url <url>` 打开特定的 URL（否则 Mantis 从 `auth.test` 派生 `https://app.slack.com/client/<team>/<channel>`）； `--slack-channel-id <id>` 设置网关白名单通道； `OPENCLAW_MANTIS_SLACK_BROWSER_PROFILE_DIR` 控制 VM 内的持久 Chrome 配置文件（默认 `$HOME/.config/openclaw-mantis/slack-chrome-profile`）； `--approval-checkpoints`运行原生Slack审批场景（`slack-approval-exec-native`、`slack-approval-plugin-native`）并渲染pending/resolved检查点屏幕截图而不是网关设置（与`--gateway-setup`互斥）； `--hydrate-mode source|prehydrated`、`--provider-mode`、`--model`、`--alt-model` 和 `--fast` 穿过至 Slack 实时通道。

approval checkpoint 截图是根据场景观察到的 Slack API 消息渲染出来的，而不是来自实时 Slack UI；只有当 lease 的浏览器 profile 已经登录时，`slack-desktop-smoke.png` 才能作为 Slack Web 本身的证据。

## <a id="evidence-manifest"></a> 证据清单

发布者需要报表旁边的 `mantis-evidence.json` 的架构版本 2。每个包含的泳道必须声明`expectationMet`；当车道未达到预期时，发布者会降低已声明通行证的等级。例如：

```json
{
  "schemaVersion": 2,
  "id": "discord-status-reactions",
  "title": "Mantis Discord Status Reactions QA",
  "summary": "Human-readable top summary for the PR comment.",
  "scenario": "discord-status-reactions-tool-only",
  "comparison": {
    "baseline": {
      "sha": "<baseline-sha>",
      "status": "fail",
      "expected": "queued-only",
      "expectationMet": true
    },
    "candidate": {
      "sha": "<candidate-sha>",
      "status": "pass",
      "expected": "queued -> thinking -> done",
      "expectationMet": true
    },
    "pass": true,
    "outcome": "pass"
  },
  "artifacts": [
    {
      "kind": "timeline",
      "lane": "baseline",
      "label": "Baseline queued-only",
      "path": "baseline/timeline.png",
      "targetPath": "baseline.png",
      "alt": "Baseline Discord timeline",
      "width": 420
    }
  ]
}
```

此清单是一份演示合同，而不是经过验证的证明收据。它不独立建立 repository/PR 所有权、当前头部新鲜度、执行权限或断言的真实性。单独的视频、流程退出代码或声明的期望并不足以证明行为。在依赖结果之前，请检查基本观察结果和执行来源。基础设施故障和缺失的观察结果尚无定论，不能证明基线重现了该错误。

本地 `qa mantis run` 生产者仍然发出模式版本 1，但发布者拒绝。如果没有从观察中得出其车道期望，请勿将该输出重新标记为版本 2；工作流程制作者发布版本 2。

制品 `path` 是相对于清单目录的路径；`targetPath` 是相对于已配置的 R2/S3 制品前缀的路径。`scripts/mantis/publish-pr-evidence.mjs` 会拒绝路径穿越，并在文件缺失时跳过 `"required": false` 的条目。

工件种类：`timeline`（生成 before/after 比较屏幕截图）、`desktopScreenshot`（VNC/browser 屏幕截图）、`motionPreview`（来自录制的内嵌动画 GIF）、`motionClip`（运动修剪） MP4）、`fullVideo`（完整录音）、`metadata`（JSON/log边车）、`report`（Markdown报告）。

对于 `qa mantis run`，稳定输出容器具有以下布局：

```text
.artifacts/qa-e2e/mantis/<run-id>/
  error.txt # failures only
  mantis-report.md
  mantis-evidence.json
  baseline/
  candidate/
  comparison.json
.artifacts/qa-e2e/mantis/<run-id>.worktrees/
  baseline-<pid>-<uuid>/
  candidate-<pid>-<uuid>/
```

完成运行后，工作树根通常为空。通道目录在活动时或当清理故意保留一个用于诊断时出现。中断时，命令结算和工件暂存消耗与 Git 删除相同的清理预算。如果该预算到期，或者无法确认停止命令后代，Mantis 会保留工作树以供检查。默认本地命令运行程序需要 Linux 或 macOS 进程树所有权。它在生成命令之前拒绝 Windows 阶段，因为当前无法在那里验证后代灭绝；保留任何准备好的目录。如果 `git worktree add` 在注册之前失败，Mantis 可以保留其空的、唯一命名的准备目录，而不是通过可以替换的路径名进行删除。

每次失败的尝试都会写入 `<output-dir>/error.txt`。抛出的错误或预期 CLI 中断的简明 stderr 诊断会报告确切的路径。在 Git 不再拥有其注册后，Mantis 不会递归删除工作树：如果清理失败，请检查 `<output-dir>.worktrees/` 下保留的唯一目录以及报告的 `error.txt`，然后在解决故障后通过 Git 将其删除。如果拥有的路径消失而其 Git 注册仍然存在，则清理将停止而不是重新创建路径。启动时，Mantis 还会检查确切的历史 `<output-dir>/worktrees/baseline` 和 `<output-dir>/worktrees/candidate` 路径，并在它们仍然注册和存在时通过 Git 删除它们。该旧目录中的其他已注册或未注册条目保持不变。

屏幕截图是证据，不是秘密，但仍然需要编辑纪律：私人频道名称、用户名或消息内容可能会出现。设置`OPENCLAW_QA_REDACT_PUBLIC_METADATA=1`用于公共工件上传；默认情况下，它在 Discord 和 Slack GitHub 工作流程中启用。

## <a id="github-automation"></a> GitHub 自动化

`scripts/mantis/publish-pr-evidence.mjs` 是可重用的发布者。工作流使用清单、目标 PR、工件目标根、注释标记、工件 URL、运行 URL 和请求源来调用它。它将声明的工件上传到 Mantis R2 存储桶，使用内联 images/previews 和链接视频构建摘要优先的 PR 评论，然后更新现有标记评论或创建新标记评论。所需环境：

- `MANTIS_ARTIFACT_R2_ACCESS_KEY_ID`
- `MANTIS_ARTIFACT_R2_SECRET_ACCESS_KEY`
- `MANTIS_ARTIFACT_R2_BUCKET`（工作流设置为 `openclaw-crabbox-artifacts`）
- `MANTIS_ARTIFACT_R2_ENDPOINT`
- `MANTIS_ARTIFACT_R2_REGION`（工作流设置为 `auto`）
- `MANTIS_ARTIFACT_R2_PUBLIC_BASE_URL`（工作流设置为 `https://artifacts.openclaw.ai`）

评论通过 Mantis GitHub App（`MANTIS_GITHUB_APP_ID` / `MANTIS_GITHUB_APP_PRIVATE_KEY`）发布，而不是 `github-actions[bot]`，并使用一个隐藏的标记评论作为 upsert 键。

| 工作流                          | 扳机         | 它的作用                                                                                                                                                                                                                                                                           |
| --------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Mantis Discord Smoke`            | 手动触发 | 针对选定的 ref 运行 `discord-smoke`。                                                                                                                                                                                                                                             |
| `Mantis Discord Status Reactions` | 手动触发 | 构建独立的 baseline/candidate 工作树，在每个工作树上运行 `discord-status-reactions-tool-only`，在 Crabbox 桌面浏览器中渲染每条 lane 的时间线，使用 `crabbox media preview` 生成经过动作裁剪的 GIF/MP4 预览，上传 artifacts，并发布内联 PR 证据。       |
| `Mantis Scenario`                 | 手动触发 | 通用调度程序：获取`scenario_id`（`discord-status-reactions-tool-only`、`discord-thread-reply-filepath-attachment`、`slack-desktop-smoke`、`web-ui-chat-proof`）、`baseline_ref`、`candidate_ref`、`pr_number`，并转发到匹配场景工作流。                  |
| `Mantis Slack Desktop Smoke`      | 手动触发 | 租用一个 Crabbox Linux 桌面（默认 `aws`，可选 `hetzner`），针对 candidate 运行 `slack-desktop-smoke --gateway-setup`，记录桌面，生成 motion 预览，在提供 PR 编号时上传 artifacts 并发布 PR 证据。                            |
| `Mantis Web UI Chat Proof`        | 手动触发 | 针对候选人运行重点 OpenClaw Control UI 聊天 Playwright 证据，验证浏览器通过模拟网关发送的内容，捕获 screenshot/video 工件，并发布 PR 证据。该通道仅是网络聊天证据，不是 WinUI/native-app 或任意视觉证据。 |

`Mantis Discord Status Reactions` 接受 `baseline_ref`/`candidate_ref` 并在使用秘密承载凭证运行之前验证已解析的 SHA 是 `origin/main` 的祖先、发布标签 （`v*`） 或开放 PR 的头部。

上述旧场景工作流程仍然可以通过手动操作调度来使用。

不要依赖前面的 `@clawsweeper mantis ...` 示例作为专用调度命令。 ClawSweeper 当前的命令解析器将无法识别的提及路由到一般帮助，而不是类型化的 Mantis 调度。

[ClawSweeper #1425](https://github.com/openclaw/clawsweeper/pull/1425) 和 [OpenClaw #138953](https://github.com/openclaw/openclaw/pull/138953) 中单独的请求绑定集成使审阅者可以在完成原始审阅之前选择相关证据。它不会恢复自动审阅后记录或要求对每个 PR 进行每次检查。托管执行需要 `main` 上的可信生产者工作流程以及匹配的 ClawSweeper Worker/runtime 部署；合并文档不会激活它。仍然需要现有的 Convex 凭证服务，但无需更改或部署 Convex 架构即可重用其 API。

部署集成后，维护人员可以请求提供可用证据进行审查，而无需提供 SHA：

```text
@clawsweeper proof
@clawsweeper proof web-ui-chat-proof
@clawsweeper proof telegram-bot-e2e-proof
@clawsweeper proof web-ui-chat-proof,telegram-bot-e2e-proof
```

裸命令让审阅者可以选择有用的检查；显式选择要求每个命名检查。审查解决了当前的 PR 头。 Control UI 支持针对模拟网关的固定聊天烟雾； Telegram 支持有界、纯数据测试服务器计划。传统的 Crabline 配方并不是第三个内联工具。缺失、迟到或不完整的观察仍然没有结论。评审员在同一评审中评估结果；仅成功执行并不能清除证据、其他准备障碍或合并要求。

选定的检查共享 20 分钟的验证上限，进一步受到原始审核的剩余时间减去其最终决策保留时间的限制。使用默认的 20 分钟审核超时和 90 秒保留，如果立即调用，则最多为 18 分 30 秒，分析后会更少。这是一个上限，而不是固定的等待时间或每张支票的新预算。消费者超时本身并不会取消已调度的生产者；生产者清理和 credential/lease 限制仍然分开。

### <a id="telegram-proof-is-a-separate-qa-entrypoint"></a> Telegram 证明是一个单独的 QA 入口点

Telegram 不是 `mantis-scenario.yml` 或 `qa mantis run` 中的选项。 `pnpm openclaw qa telegram` 使用 QA 实验室 Telegram 适配器和 `.agents/skills/telegram-e2e-userbot/SKILL.md` 的存储库技能。该技能还支持通过其自己的运行器进行集中的真实用户录制。

该技能使用 TDLib 来对抗 Telegram 的测试服务器，并具有专门租用的 Convex QA 凭证、新的网关和独立的用户观察者。先决条件包括依赖项就绪的精确引用运行时、固定的 TDLib 设置、经过身份验证的代理访问以及不同的未使用的 Gateway/provider 端口。它的医生获得了租约并联系了 Telegram：这是一次现场手术，而不是离线准备情况检查。未经测试帐户活动授权，请勿运行它。

记录员可以观察消息、编辑、删除、反应和打字。判断来自所选 SUT 的记录刺激后的事件，关联消息 ID 和预期的提供者请求，并验证清理。 QA 适配器的电流驱动器公开了较窄的 message/edit 流；选择其观察结果实际涵盖该声明的入口点。一般的成功回复并不能证明格式、反应、生命周期或线程行为。

在 Telegram 练习之前阅读技能及其功能验证图。凭证租赁不是场景沙箱：自定义命令操作可以使用租赁的测试身份。将凭证处理和执行保持在明确授权的、隔离的工作人员中，而不是普通的只读审查。

### <a id="selected-proof-inside-a-clawsweeper-review"></a> ClawSweeper 评论中选定的证据

请求绑定的证明集成允许 ClawSweeper 在完成当前审查之前选择相关检查。它不会对每个 PR 运行所有检查。确切的 PR 头是通过审查解决的，而不是由维护者输入的。 `@clawsweeper proof` 请求进行一次审查，并提供可作为手动替代的证据；结果将在该评审中进行评估，而不是生成第二次评审。

自动曲面为：

- Telegram 测试服务器：测试人员消息和按钮点击、固定模型回复、streaming/native-command 设置以及审核者需要观察的行为的有界、纯数据计划。这不仅可以涵盖一般问候语，还包括选定的格式或命令行为。
- Control UI：针对模拟网关的现有固定聊天烟雾配方。这不是任意浏览器任务运行程序或所有 UI 行为的证明。

单独的固定 Crabline 配方仍然是生产者的入口点；它不是第三个自动工具或强制性的三检查批次。

受信任的外部控制器拥有 Telegram 用户机器人和真实机器人令牌。候选人收到一次性令牌别名和受限 DM API 代理，而不是 QA 租约、Telegram 会话、GitHub 令牌或部署凭证。候选程序在内部网络上的一次性 Crabbox 本地容器中运行，没有 Docker 套接字。部署需要 Linux/Podman 环境，其中隔离的 Crabbox SSH 生命周期已经过验证；通用 Docker 烟雾运行无法建立这种兼容性。

控制器重用现有的 Convex 获取、心跳、有效负载和释放 API。不需要凸架构更新、隔离端点或代理部署。 ClawSweeper 服务使用可信工作流的 GitHub 操作 OIDC 身份来检查审阅所有权和一次性授权。过期或撤销的权限会停止特权发送和代理转发。如果录音机的控制器退出，录音机的父母死亡警卫就会停止录音机。这些保护措施并不声称本机 TDLib 后台流量为零。

Telegram 工件包含有界的完整时间线、提供者请求、格式化实体以及带有已编辑的已知私有值的按钮标签。过大或不完整的观察结果将被拒绝。其断言结果仍为 `inconclusive`：原始评审员必须评估针对该主张的观察结果。绿色流程退出、预设回复或视频不会自动清除证据或其他就绪障碍。模拟Bot registration/webhook操作；现场制作 Telegram、组、媒体和不受限制的代理命令不在该有界计划之外。传输配置文件显示名称是合成的，而路由 ID 和选定的机器人用户名将在需要时保留。此投影不会重写消息文本。真实配置文件名称或基于用户名的测试仪路由的测试不在该证明表面之内。

## <a id="machines-and-secrets"></a> 机器与密钥

本地 CLI Crabbox 默认值为 `--provider hetzner --class beast`，但 `desktop-browser-smoke` 使用 `--class tiny` 来处理其浏览器捕获工作负载。使用 `--provider`、`--class`/`--machine-class` 或 `OPENCLAW_MANTIS_CRABBOX_PROVIDER` / `OPENCLAW_MANTIS_CRABBOX_CLASS` 覆盖。 GitHub 工作流程通常会覆盖两者（例如 `--class standard` 和 Slack 工作流程的 `aws`/`hetzner` 提供商选择输入）。如果提供程序太慢或不可用，请将其添加到同一 Crabbox 接口后面，而不是硬编码后备。

VM 基准：Linux，具有桌面功能的 Chrome/Chromium、CDP 访问、VNC/ noVNC、Node 24.16+ 或 26.1+ 和pnpm、OpenClaw 签出以及对目标传输、GitHub、模型提供程序和凭证代理的出站访问。

Mantis 命令和工作流中使用的凭据与环境变量名称：

- `OPENCLAW_QA_DISCORD_MANTIS_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- 本地 `qa mantis run --credential-source env` 还需要 `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`、`OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN` 和 `OPENCLAW_QA_DISCORD_SUT_APPLICATION_ID`。GitHub 工作流通常使用 `--credential-source convex` 以及下面的 broker 凭据，而不是原始的 Discord bot token。
- `OPENCLAW_QA_REDACT_PUBLIC_METADATA=1` 用于公开制品上传
- `OPENCLAW_QA_CONVEX_SITE_URL`, `OPENCLAW_QA_CONVEX_SECRET_CI`
- `OPENAI_API_KEY`
- `CRABBOX_COORDINATOR` / `CRABBOX_COORDINATOR_TOKEN`（工作流也接受 `OPENCLAW_QA_MANTIS_CRABBOX_COORDINATOR` / `_TOKEN` 作为后备，并在调用 Crabbox 之前将它们映射为普通名称）
- `CRABBOX_ACCESS_CLIENT_ID`, `CRABBOX_ACCESS_CLIENT_SECRET`
- `MANTIS_GITHUB_APP_ID`, `MANTIS_GITHUB_APP_PRIVATE_KEY`

Mantis 运行程序绝不能打印 Discord 或 Slack 机器人令牌、提供商 API 密钥、浏览器 cookie、身份验证配置文件内容、VNC 密码或原始凭证有效负载。如果令牌泄漏到问题、PR、聊天或日志中，请在存储替换密钥后轮换它。

## <a id="run-outcomes"></a> 运行结果

Before/after 传输场景区分这些结果，因此不稳定的环境不会被视为产品回归：

- **Bug reproduced**：基线以该场景预期的方式失败。
- **Harness failure**：在 oracle 变得有意义之前，环境设置、凭据、传输 API、浏览器或提供方就已失败。

仅候选浏览器证明会报告候选是否通过了模拟的 Gateway 和可见 UI 断言；它不主张基线复现。

## <a id="adding-a-scenario"></a> 添加一个场景

实时传输场景是按传输定义的 TypeScript-（请参阅 `extensions/qa-lab/src/mantis/run.runtime.ts` 中的 Discord before/after 形状的 `MANTIS_SCENARIO_CONFIGS`），而不是独立的声明性文件格式。每个场景需要：id 和标题、传输、所需凭据、基线引用策略、候选引用策略、OpenClaw 配置补丁、setup/stimulus 步骤、预期基线和候选预言、视觉捕获目标、超时预算和清理步骤。

仅针对候选者的浏览器证明可以使用专用的可重复 E2E 测试和工作流程。保持其范围明确，在执行前验证候选引用，隔离秘密支持的发布，并发出相同的证据清单合同。

优先使用小而类型明确的 oracle，而不是视觉检查：Discord 的 reaction 状态或消息引用、Slack 线程 `ts`/reaction API 状态、电子邮件 message id 和 headers。仅在 UI 是唯一可靠可观测项时使用浏览器截图，并在存在平台 API oracle 的情况下，将视觉检查作为补充而不是替代。

在Discord和Slack之后，相同的跑步者形状延伸到WhatsApp（QR登录、重新识别、传递、媒体、反应）和Matrix（加密房间、thread/reply关系、重启恢复）；两者都尚未实施。

## <a id="open-questions"></a> 未决问题

- 当复用现有的 Mantis bot 时，哪个 Discord bot 应该作为驱动方，哪个应该作为被测系统（SUT）？
- GitHub 应为 PR 保留 Mantis 工件多长时间？
- 在上传公共 PR 之前是否应该对屏幕截图进行编辑或裁剪？
