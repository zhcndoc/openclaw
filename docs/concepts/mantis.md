---
summary: "Mantis 是用于在真实传输环境中复现 OpenClaw 缺陷的可视化端到端验证系统，可捕获前后证据，并将工件附加到 PR。"
title: "Mantis"
read_when:
  - 为 OpenClaw 缺陷构建或运行实时可视化 QA
  - 为拉取请求添加前后验证
  - 添加 Discord、Slack、WhatsApp 或其他实时传输场景
  - 调试需要截图、浏览器自动化或 VNC 访问的 QA 运行
---

Mantis 是 OpenClaw 的端到端验证系统，用于处理那些需要真实
运行时、真实传输和可见证据的缺陷。它会针对已知的坏 ref 运行一个场景，
捕获证据，再在候选 ref 上运行同一场景，并将比较结果发布为工件，
维护者可以从 PR 或本地命令中进行检查。

Mantis 从 Discord 开始，因为 Discord 为我们提供了一个高价值的首个通道：
真实的 bot 认证、真实的 guild 频道、reaction、thread、原生命令，以及一个
人类可以直观确认传输结果的浏览器 UI。

## 目标

- 使用用户看到的相同传输形态，从 GitHub issue 或 PR 中复现缺陷。
- 在应用修复之前，针对基线 ref 捕获 **before** 工件。
- 在应用修复之后，针对候选 ref 捕获 **after** 工件。
- 尽可能使用确定性 oracle，例如 Discord REST reaction 读取或频道转录检查。
- 当缺陷具有可见 UI 表现时捕获截图。
- 既可从 agent 控制的 CLI 在本地运行，也可从 GitHub 远程运行。
- 在登录、浏览器自动化或 provider 认证卡住时，保留足够的机器状态以便通过 VNC 救援。
- 当运行被阻塞、需要人工 VNC 帮助或完成时，向运营者 Discord 频道发布简洁状态。

## 非目标

- Mantis 不是单元测试的替代品。Mantis 运行在理解修复之后，通常应转化为更小的回归测试。
- Mantis 不是常规的快速 CI 门禁。它更慢，使用真实凭据，仅用于直播环境很重要的缺陷。
- Mantis 不应在正常操作中依赖人工。手动 VNC 是救援路径，而不是正常路径。
- Mantis 不会在工件、日志、截图、Markdown 报告或 PR 评论中存储原始密钥。

## 所有权

Mantis 位于 OpenClaw QA 栈中。

- OpenClaw 负责场景运行时、传输适配器、证据 schema，以及 `pnpm openclaw qa mantis` 下的本地 CLI。
- QA Lab 负责实时传输 harness 组件、浏览器捕获辅助工具和工件写入器。
- Crabbox 在需要远程 VM 时负责预热 Linux 机器。
- GitHub Actions 负责远程工作流入口和工件保留。
- ClawSweeper 负责 GitHub 评论路由：解析维护者命令、调度工作流，并发布最终 PR 评论。
- 当场景需要 agentic 设置、调试或卡住状态报告时，OpenClaw agents 通过 Codex 驱动 Mantis。

这种边界将传输知识留在 OpenClaw，将机器调度留在
Crabbox，将维护者工作流胶水留在 ClawSweeper。

## 命令形态

第一个本地命令会验证 Discord bot、guild、频道、消息发送、reaction 发送以及工件路径：

```bash
pnpm openclaw qa mantis discord-smoke \
  --output-dir .artifacts/qa-e2e/mantis/discord-smoke
```

本地 before 和 after runner 接受如下形式：

```bash
pnpm openclaw qa mantis run \
  --transport discord \
  --scenario discord-status-reactions-tool-only \
  --baseline origin/main \
  --candidate HEAD \
  --output-dir .artifacts/qa-e2e/mantis/local-discord-status-reactions
```

runner 会在输出目录下创建分离的 baseline 和 candidate worktree，安装依赖，构建每个 ref，使用
`--allow-failures` 运行场景，然后写入 `baseline/`、`candidate/`、`comparison.json` 和 `mantis-report.md`。
对于第一个 Discord 场景，成功验证意味着 baseline 状态为 `fail` 且 candidate 状态为 `pass`。

GitHub smoke workflow 是 `Mantis Discord Smoke`。第一个真实场景的 before and after GitHub
workflow 是 `Mantis Discord Status Reactions`。它接受：

- `baseline_ref`：预期复现仅队列行为的 ref。
- `candidate_ref`：预期展示 `queued -> thinking -> done` 的 ref。

它会检出 workflow harness ref，构建独立的 baseline 和 candidate worktree，针对每个 worktree 运行
`discord-status-reactions-tool-only`，并将 `baseline/`、`candidate/`、`comparison.json` 和 `mantis-report.md`
作为 Actions 工件上传。

你也可以直接从 PR 评论触发 status-reactions 运行：

```text
@Mantis discord status reactions
```

该评论触发器故意保持范围狭窄。它只对具有 write、maintain 或 admin 访问权限的用户所发出的 pull request 评论生效，
且只识别 Discord status-reaction 请求。默认情况下，它使用已知的坏 baseline ref 和当前 PR head SHA 作为候选 ref。
维护者可以覆盖任一 ref：

```text
@Mantis discord status reactions baseline=origin/main candidate=HEAD
```

ClawSweeper 命令示例：

```text
@clawsweeper mantis discord discord-status-reactions-tool-only
@clawsweeper verify e2e discord
```

第一个命令是显式且以场景为中心的。第二个命令之后可以根据标签、变更文件和
ClawSweeper 评审发现，将 PR 或 issue 映射到推荐的 Mantis 场景。

## 运行生命周期

1. 获取凭据。
2. 分配或复用一台 VM。
3. 为 baseline ref 准备一个干净的 checkout。
4. 安装依赖，并且只构建场景需要的内容。
5. 启动一个带隔离状态目录的子 OpenClaw Gateway。
6. 配置实时传输、provider、模型和浏览器配置文件。
7. 运行场景并捕获 baseline 证据。
8. 停止 gateway 并保留日志。
9. 在同一台 VM 上准备 candidate ref。
10. 运行同一场景并捕获 candidate 证据。
11. 比较 oracle 结果和视觉证据。
12. 写入 Markdown、JSON、日志、截图以及可选的 trace 工件。
13. 上传 GitHub Actions 工件。
14. 发布简洁的 PR 或 Discord 状态消息。

场景应当能够以两种不同方式失败：

- **复现了缺陷**：baseline 以预期方式失败。
- **harness 失败**：环境设置、凭据、Discord API、浏览器或 provider 在 bug oracle 有意义之前失败。

最终报告必须区分这些情况，以免维护者将不稳定环境与产品行为混淆。

## Discord MVP

第一个场景应该针对 guild 频道中的 Discord status reactions，其中源回复投递模式为 `message_tool_only`。

为什么它是一个很好的 Mantis 起点：

- 它在 Discord 中以触发消息上的 reaction 形式可见。
- 它通过 Discord 消息 reaction 状态具有很强的 REST oracle。
- 它会涉及真实的 OpenClaw Gateway、Discord bot 认证、消息分发、源回复投递模式、status reaction 状态以及模型轮次生命周期。
- 它足够聚焦，能够确保第一个实现足够严谨。

预期的场景形态：

```yaml
id: discord-status-reactions-tool-only
transport: discord
baseline:
  expect:
    reproduced: true
candidate:
  expect:
    fixed: true
config:
  messages:
    ackReaction: "👀"
    ackReactionScope: "group-mentions"
    groupChat:
      visibleReplies: "message_tool"
    statusReactions:
      enabled: true
      timing:
        debounceMs: 0
discord:
  requireMention: true
  notifyChannel: operator-notify
evidence:
  rest:
    messageReactions: true
  browser:
    screenshotMessageRow: true
```

baseline 证据应显示队列确认 reaction，但在 tool-only 模式下没有生命周期转换。candidate 证据应显示当 `messages.statusReactions.enabled` 明确为 true 时，生命周期 status reactions 正在运行。

可执行的第一步切片是 opt-in 的 Discord live QA 场景：

```bash
pnpm openclaw qa discord \
  --scenario discord-status-reactions-tool-only \
  --provider-mode live-frontier \
  --model openai/gpt-5.4 \
  --alt-model openai/gpt-5.4 \
  --fast \
  --output-dir .artifacts/qa-e2e/mantis/discord-status-reactions-candidate
```

它将 SUT 配置为始终开启 guild 处理、`visibleReplies:
"message_tool"`、`ackReaction: "👀"`，以及显式 status reactions。oracle 会轮询真实的 Discord 触发消息，并期望观察到序列
`👀 -> 🤔 -> 👍`。工件包括 `discord-qa-reaction-timelines.json`、
`discord-status-reactions-tool-only-timeline.html` 和
`discord-status-reactions-tool-only-timeline.png`。

## 现有 QA 组件

Mantis 应当建立在现有的私有 QA 栈之上，而不是从零开始：

- `pnpm openclaw qa discord` 已经运行了一个带 driver 和 SUT bots 的 live Discord 通道。
- live transport runner 已经在 `.artifacts/qa-e2e/` 下写入报告和 observed-message 工件。
- Convex credential lease 已经为共享的 live transport 凭据提供了独占访问。
- 浏览器控制服务已经支持截图、snapshot、headless managed profiles 和远程 CDP profiles。
- QA Lab 已经拥有用于 transport 形态测试的 debugger UI 和 bus。

第一个 Mantis 实现可以是在这些组件之上的一个薄的 before/after runner，再加上一层视觉证据。

## 证据模型

每次运行都会写入一个稳定的工件目录：

```text
.artifacts/qa-e2e/mantis/<run-id>/
  mantis-report.md
  mantis-summary.json
  baseline/
    summary.json
    discord-message.json
    screenshot-message-row.png
    gateway-debug/
  candidate/
    summary.json
    discord-message.json
    screenshot-message-row.png
    gateway-debug/
  comparison.json
  run.log
```

`mantis-summary.json` 应该是机器可读的真实来源。Markdown 报告用于 PR 评论和人工审查。

摘要必须包括：

- 已测试的 refs 和 SHAs
- 传输和场景 id
- 机器 provider 和机器 id 或 lease id
- 不包含密钥值的凭据来源
- baseline 结果
- candidate 结果
- 缺陷是否在 baseline 上复现
- candidate 是否修复了它
- 工件路径
- 已净化的设置或清理问题

截图是证据，不是秘密。它们仍然需要去敏处理：私有频道名称、用户名或消息内容可能会出现。对于公共 PR，
在更强的去敏方案到位之前，优先使用 GitHub Actions 工件链接而不是内联图片。

## 浏览器与 VNC

浏览器通道有两种模式：

- **无头自动化**：CI 的默认模式。Chrome 启用 CDP 运行，并且
  Playwright 或 OpenClaw 浏览器控制会捕获截图。
- **VNC 救援**：当登录、MFA、Discord 反自动化，
  或可视化调试需要人工介入时，在同一台 VM 上启用。

Discord 观察者浏览器配置文件应当足够持久，以避免每次运行都
重新登录，但又要与个人浏览器状态隔离。配置文件属于 Mantis 机器池，
而不是某位开发者的笔记本电脑。

当 Mantis 卡住时，它会发布一条 Discord 状态消息，包含：

- 运行 id
- 场景 id
- 机器提供商
- 产物目录
- 如可用，VNC 或 noVNC 连接说明
- 简短的阻塞文本

第一次私有部署可以先把这些消息发到现有的运维频道，之后再迁移到专门的 Mantis 频道。

## 机器

Mantis 应优先通过 Crabbox 使用 AWS 作为首个远程实现。
Crabbox 为我们提供预热机器、租赁跟踪、hydration、日志、结果和
清理。如果 AWS 容量太慢或不可用，则在相同的机器接口后面添加 Hetzner 提供商。

最低 VM 要求：

- Linux，安装带桌面能力的 Chrome 或 Chromium
- 用于浏览器自动化的 CDP 访问
- 用于救援的 VNC 或 noVNC
- Node 22 和 pnpm
- OpenClaw 检出和依赖缓存
- 使用 Playwright 时的 Playwright Chromium 浏览器缓存
- 足够的 CPU 和内存，用于一个 OpenClaw Gateway、一个浏览器和一次模型运行
- 可出站访问 Discord、GitHub、模型提供商以及凭据代理

VM 不应在预期的凭据或浏览器配置文件存储之外保留长期原始密钥。

## 密钥

远程运行时，密钥存放在 GitHub 组织或仓库 secrets 中；本地运行时，密钥存放在由本地运维人员控制的密钥文件中。

推荐的密钥名称：

- `OPENCLAW_QA_DISCORD_MANTIS_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_NOTIFY_CHANNEL_ID`
- `OPENCLAW_QA_REDACT_PUBLIC_METADATA=1` 用于公开的 GitHub 产物上传
- `OPENCLAW_QA_CONVEX_SITE_URL`
- `OPENCLAW_QA_CONVEX_SECRET_CI`

从长期来看，Convex 凭据池应继续作为实时传输凭据的默认来源。GitHub secrets 用于引导代理和回退通道。

Mantis 运行器绝不能打印：

- Discord bot token
- 提供商 API key
- 浏览器 cookie
- 认证配置文件内容
- VNC 密码
- 原始凭据载荷

公开的产物上传也应当对 Discord 目标元数据进行脱敏，例如 bot、guild、channel 和 message id。GitHub smoke workflow 因此启用
`OPENCLAW_QA_REDACT_PUBLIC_METADATA=1`。

如果 token 不小心被粘贴到 issue、PR、聊天或日志中，应在新密钥存储完成后立即轮换。

## GitHub 产物与 PR 评论

Mantis 工作流应将完整证据包作为短期有效的 Actions artifact 上传。 当工作流是针对 bug 报告或修复 PR 运行时，它还应将脱敏后的 PNG 截图发布到 `qa-artifacts` 分支，并在该 bug 或修复 PR 上 upsert 一条带有前后对比截图的评论。不要只把主要证据发布到一个通用的 QA 自动化 PR 上。原始日志、观察到的消息以及其他体积较大的证据保留在 Actions artifact 中。

生产工作流应使用 Mantis GitHub App 发布这些评论，而不是使用 `github-actions[bot]`。将 app id 和私钥分别存为 `MANTIS_GITHUB_APP_ID` 和 `MANTIS_GITHUB_APP_PRIVATE_KEY` GitHub Actions secrets。工作流使用隐藏标记作为 upsert key，当 token 可以编辑该评论时更新它；当更旧的 bot-owned 标记无法被编辑时，则创建一条新的、归 Mantis 所有的评论。

PR 评论应简短且以视觉呈现为主：

```md
Mantis Discord 状态反应 QA

摘要：Mantis 重新运行了所报告的 Discord 状态反应 bug，分别针对已知的
错误基线和候选修复进行验证。基线复现了该 bug，而候选方案展示了预期的 queued -> thinking -> done 序列。

- 场景：`discord-status-reactions-tool-only`
- 运行：<workflow run link>
- 产物：<artifact link>
- 基线：`<status>` at `<sha>`
- 候选：`<status>` at `<sha>`

| 基线                | 候选                |
| ------------------- | ------------------- |
| <inline screenshot> | <inline screenshot> |
```

当运行失败是因为 harness 失败时，评论必须明确说明这一点，而不是暗示候选方案失败了。

## 私有部署说明

私有部署可能已经有一个 Mantis Discord 应用。若该应用拥有正确的 bot 权限并且可以安全轮换，则重用该应用，而不是再创建一个。

通过 secrets 或部署配置设置初始运维通知频道。它可以先指向现有的维护者或运维频道，然后在专门的 Mantis 频道建立后再迁移过去。

不要在本文档中放置 guild id、channel id、bot token、浏览器 cookie 或 VNC 密码。请将它们存放在 GitHub secrets、凭据代理或运维人员的本地密钥存储中。

## 添加场景

一个 Mantis 场景应声明：

- id 和标题
- 传输方式
- 所需凭据
- 基线 ref 策略
- 候选 ref 策略
- OpenClaw 配置补丁
- 设置步骤
- 刺激
- 期望的基线 oracle
- 期望的候选 oracle
- 视觉捕获目标
- 超时预算
- 清理步骤

场景应优先使用小而类型化的 oracle：

- 对于 reaction 类 bug，使用 Discord reaction 状态
- 对于 threading 类 bug，使用 Discord 消息引用
- 对于 Slack bug，使用 Slack thread ts 和 reaction API 状态
- 对于 email bug，使用 email message id 和 headers
- 当 UI 是唯一可靠可观测项时，使用浏览器截图

视觉检查应当是增量式的。如果平台 API 可以证明 bug 存在，就使用该 API 作为通过/失败的 oracle，并保留截图供人工确认。

## 提供商扩展

在 Discord 之后，同一个运行器还可以新增：

- Slack：reactions、threads、应用提及、modal、文件上传。
- Email：使用 `gog` 进行 Gmail 认证和消息线程化，当 connector 不够用时。
- WhatsApp：QR 登录、重新识别、消息投递、媒体、reactions。
- Telegram：群组提及门控、命令、reactions（如可用）。
- Matrix：加密房间、线程或回复关系、重启恢复。

每种传输都应有一个便宜的 smoke 场景和一个或多个 bug 类场景。昂贵的视觉场景应保持可选启用。

## 未决问题

- 当现有的 Mantis bot 被重用时，哪个 Discord bot 应该作为 driver，哪个应该作为 SUT？
- 首个阶段里，observer 浏览器登录应使用真人 Discord 账号、测试账号，还是仅使用 bot 可读的 REST 证据？
- GitHub 应该将 Mantis 用于 PR 的 artifacts 保留多久？
- ClawSweeper 应该何时自动推荐 Mantis，而不是等待维护者命令？
- 对于公开 PR，上传前是否应先对截图进行脱敏或裁剪？
