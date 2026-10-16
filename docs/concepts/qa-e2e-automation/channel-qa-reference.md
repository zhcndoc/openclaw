---
doc-schema-version: 1
summary: "真实传输通道和 Buzz、Telegram 和 Discord 通道参考的共享 CLI 标志。"
read_when:
  - "您正在运行 Buzz、Telegram 或 Discord QA 通道"
  - "您需要每个真实运输通道都接受的标志"
title: "频道 QA 参考"
---

## <a id="buzz%2C-discord%2C-slack%2C-telegram%2C-and-whatsapp-qa-reference"></a><a id="buzz-discord-slack-telegram-and-whatsapp-qa-reference"></a> Buzz、Discord、Slack、Telegram 和 WhatsApp QA 参考

Matrix 适配器使用 [Matrix 实时通道 ](/concepts/qa-e2e-automation/operator-flow#matrix-live-lane) 中记录的一次性 Docker- 支持通道。 Buzz、Discord、Slack、Telegram 和 WhatsApp 可以针对预先存在的真实传输运行，因此它们的参考位于此处。

### <a id="shared-cli-flags"></a> 共享 CLI 标志

这些 lane 通过共享的 QA runner CLI 契约进行注册。传输插件可以负责注册，而 QA Lab 仍作为套件宿主。它们接受相同的标志：

| 标志                                  | 默认值                                                  | 描述                                                                                                                                                                                                                                                                                           |
| ------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--scenario <id>`                     | -                                                        | 仅运行此场景。可重复指定。                                                                                                                                                                                                                                                                   |
| `--output-dir <path>`                 | `<repo>/.artifacts/qa-e2e/<transport>-<timestamp>`       | 报告、摘要、证据、传输特定工件和输出日志的写入位置。相对路径将基于 `--repo-root` 解析。                                                                                                                                                       |
| `--repo-root <path>`                  | `process.cwd()`                                          | 从中立 cwd 调用时的仓库根目录。                                                                                                                                                                                                                                                     |
| `--sut-account <id>`                  | `sut`                                                    | QA gateway 配置中的临时账户 id。                                                                                                                                                                                                                                                    |
| `--provider-mode <mode>`              | `live-frontier`（嗡嗡声：`mock-openai`）                    | `mock-openai`、`aimock` 或 `live-frontier`。                                                                                                                                                                                                                                                          |
| `--model <ref>` / `--alt-model <ref>` | 提供方默认值                                         | Primary/alternate 模型参考号                                                                                                                                                                                                                                                                         |
| `--fast`                              | 关闭                                                      | 在支持的情况下启用 provider 快速模式。                                                                                                                                                                                                                                                                   |
| `--credential-source <source>`        | 共享环境（Buzz：带有凭证文件的 `file`） | 现有车道使用`env`或`convex`；当设置 `--credential-file` 时，Buzz 使用本地文件，否则它委托给 `OPENCLAW_QA_CREDENTIAL_SOURCE` 和共享环境源。请参见 [Convex 凭证池](/concepts/qa-e2e-automation/whatsapp-and-credentials#convex-credential-pool)。 |
| `--credential-role <maintainer\|ci>`  | CI 中为 `ci`，其他情况下为 `maintainer`                       | 使用 `--credential-source convex` 时采用的角色。                                                                                                                                                                                                                                                          |
| `--credential-file <path>`            | -                                                        | 仅限 Buzz，用于本地运行的 JSON 凭据文件。                                                                                                                                                                                                                                                        |
| `--allow-failures`                    | 关闭                                                      | 当场景失败时写入工件，但不返回失败退出码。                                                                                                                                                                                                                            |

Telegram 将 `--credential-source` 修复为 `convex`。无法通过共享环境凭证模式提供其测试服务器用户机器人凭证。

在任何失败的情况下，每个通道都以非零值退出。 `--allow-failures` 在不设置失败退出代码的情况下写入工件。 Discord、Slack 和 Telegram 也接受 `--list-scenarios` 打印选定的场景 ID 并退出。

### Buzz QA

```bash
pnpm openclaw qa buzz \
  --credential-file /secure/path/buzz-qa-credentials.json
```

针对一个真实的 Buzz 房间和两个专用的 Nostr 身份。驱动程序发布传入的房间事件；SUT 身份配置在子 OpenClaw Gateway 中，其出站事件从中继上进行观测。默认的 `mock-openai` 提供商无需模型提供商凭据即可验证真实的 Buzz 传输。

本地运行使用 `--credential-file <path>`，并配合一个包含 `relayUrl`、`roomId`、`driverPrivateKey` 和 `sutPrivateKey` 的私有 JSON 文件。封闭中继可能还需要 `driverAuthTag` 和 `sutAuthTag`。相对路径基于 `--repo-root` 解析。托管中继必须使用 `wss://`；仅对于回环开发中继才接受明文 `ws://`。

两个身份都必须是专用房间的成员，并且 SUT 公钥必须具有 **Bot** 角色。托管的封闭中继还可能要求将两个公钥登记为中继成员。只能使用专用的 QA 身份；切勿使用人工所有者或管理员的私钥。请勿将任何私钥和授权值写入日志、命令行、构件、屏幕截图或源代码管理中。

默认场景包括：

- `channel-canary`
- `channel-mention-gating`

每次运行都会在所选输出目录下写入 `qa-suite-report.md`、`qa-suite-summary.json` 和 `qa-evidence.json`。报告会标识真实的 Buzz 中继路径，但不会包含凭据值。

### Telegram QA

```bash
pnpm openclaw qa telegram
```

以 Telegram 的测试服务器上的一个共享专用组为目标。一份 Convex 租约包含 SUT 机器人以及针对 QA 用户的一项独立 TDLib 授权。该用户发送测试消息并观察 SUT 消息并通过一个长期存在的 TDLib 进程进行编辑。共享直播群组需要提及租用的机器人或回复该机器人；场景使用 `@openclaw`，适配器将其替换为租用的机器人用户名。本机命令发送给同一个机器人。

必需的环境变量：

- `OPENCLAW_QA_CONVEX_SITE_URL`
- `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 用于默认本地角色，或 `OPENCLAW_QA_CONVEX_SECRET_CI` 与 `--credential-role ci`

`--credential-source` 默认为 `convex`； `env` 被拒绝。该租约拥有测试服务器组、SUT 令牌和恢复的 TDLib 会话。该通道不使用生产 Telegram 凭证或机器人对机器人通信模式。

`release` 配置文件会选择由分类体系管理的 Telegram 场景，这些场景声明了频道、使用流程执行类型，并匹配所请求的提供商和模型通道。显式指定 `--scenario` 的值会收窄同一选择范围，而不是绕过这些约束。使用 `pnpm openclaw qa telegram --list-scenarios --provider-mode mock-openai` 可打印当前选择及回归引用。提供 `--model` 时， 列出和执行都会应用相同的模型约束。

`telegram-startup-getme-live` 是一个目录脚本生成器，而不是实时适配器流程。 请通过 `qa suite --scenario telegram-startup-getme-live` 运行它；专用的 `qa telegram` 命令和 `--list-scenarios` 会有意将其排除。

输出工件：

- `qa-suite-report.md`
- `qa-suite-summary.json`
- `qa-evidence.json` - 实时传输检查的证据条目， 包括配置文件、覆盖范围、提供商、频道、产物、结果和 RTT 字段。

Package Telegram 运行使用相同的 Telegram 凭证契约。重复 RTT 测量是 Package Telegram 实时通道的正常组成部分；当下游选择 RTT 检查时， RTT 分布会折叠到 `qa-evidence.json` 的 `result.timing` 下。

```bash
OPENCLAW_QA_CREDENTIAL_SOURCE=convex \
pnpm test:docker:npm-telegram-live
```

包实时包装器租用 `kind: "telegram-test-userbot"` 凭证，恢复其隔离的 TDLib 用户会话，并通过测试机器人 API 代理路由 SUT 机器人。它对租约进行心跳检测并在关闭时释放它。包包装器默认对 `channel-canary` 进行 20 次 RTT 检查、30 秒 RTT 超时以及 CI 之外的凸角色 `maintainer`。覆盖 `OPENCLAW_NPM_TELEGRAM_RTT_SAMPLES`、`OPENCLAW_NPM_TELEGRAM_RTT_TIMEOUT_MS` 或 `OPENCLAW_NPM_TELEGRAM_RTT_MAX_FAILURES` 来调整 RTT 测量，而无需创建单独的 RTT 命令或 Telegram- 特定摘要格式。

### Discord QA

```bash
pnpm openclaw qa discord
```

目标是一个包含两个机器人的真实私人 Discord 公会通道：一个由harness控制的驱动程序机器人和一个由子 OpenClaw 网关通过捆绑的 Discord 插件启动的 SUT 机器人。验证通道提及处理，SUT 机器人已向 Discord 注册本机 `/help` 命令，并选择加入 Mantis 证据场景。

对于可重用的代理驱动证明，请使用存储库的 `.agents/skills/discord-e2e/SKILL.md`。其选择加入命令通过现有的经过身份验证的 Convex CLI 发现 QA 代理；无需复制机器人令牌或经纪人机密：

```bash
pnpm openclaw qa discord --doctor
pnpm openclaw qa discord \
  --scenario-file qa/scenarios/channels/discord-e2e-lifecycle.yaml
```

这些模式默认为凸、CI 凭证角色和 `mock-openai`。显式标志或凭据环境设置仍然优先。 `--scenario-file` 是可重复的，并接受声明 `execution.channel: discord` 和 `execution.config.agentE2e: true` 的完整 YAML 流。本机写入流程运行一次；正的 `retryCount` 值将被拒绝。它们仍然在策划的默认套件之外。

生命周期将本机夹具操作与相关的 SUT 网关回复区分开来。私人事件收据涵盖修改、反应、打字和删除；渲染和人类交互仍然需要真正的客户端。清理保留租约权限，直到网关停止并仅删除拥有的对象。如果没有现有的线程管理权限，所拥有的线程将被存档，而不是被删除。斜杠命令、组件点击、模态、短暂交互和机器人 DM 需要手动 Discord 客户端；不使用用户帐户自动化。

`--credential-source env` 时所需的环境：

- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_APPLICATION_ID` - 必须与 Discord 返回的 SUT 机器人用户 ID 匹配（否则通道会快速失败）。

语音目标：

- `OPENCLAW_QA_DISCORD_VOICE_CHANNEL_ID`为`discord-voice-autojoin`选择voice/stage通道；如果没有它，该场景会为 SUT 机器人选择第一个可见的 voice/stage 通道。使用 env 凭据时，`discord-transcripts-voice-authorization` 需要它。

Discord YAML 模块场景（`qa/scenarios/channels/discord-*.yaml`）：

- `discord-canary`
- `discord-mention-gating`
- `discord-native-help-command-registration`
- `discord-progress-draft-lifecycle` - 运行固定工具轮换，验证最终答案没有综合活动收据，确认工作草稿在成功最终完成后被删除，并确认错误最终保持其草稿作为诊断上下文可见。
- `discord-voice-autojoin` - 选择加入语音场景。自行运行，启用`channels.discord.voice.autoJoin`，并验证SUT机器人当前的Discord语音状态是目标voice/stage通道。凸面 Discord 凭证可能包括可选的 `voiceChannelId`；否则，运行者适配器会发现行会中第一个可见的 voice/stage 频道。
- `discord-transcripts-voice-authorization` - 选择加入实时模型场景。真正的驱动程序机器人消息首先证明被排除在目标语音通道之外的发送者在没有加入的情况下收到了可见的转录工具拒绝。然后，同一发件人将被列入白名单，并且必须开始、停止和离开实时捕获。该场景会写入经过编辑的 JSON 证据，并在清理期间删除其已知的 Discord 消息。需要在租用凭证中显式显示 `voiceChannelId` 或 `OPENCLAW_QA_DISCORD_VOICE_CHANNEL_ID`；它永远不会自动发现房间。运营商在运行之前必须预留一个专用的空QA语音通道。显式的 ID 并不能证明该先决条件：该工具观察到 SUT 机器人的连接，而不是房间的完整成员资格。
- `discord-status-reactions-tool-only` - 选择加入 Mantis 场景。自行运行，因为它将 SUT 切换为始终开启、仅限工具的公会回复 `messages.statusReactions.enabled=true`，然后捕获 REST 反应时间线以及 HTML/PNG 视觉伪影。 Mantis before/after 报告还将场景提供的 MP4 工件保留为 `baseline.mp4` 和 `candidate.mp4`。
- `discord-thread-reply-filepath-attachment` - 选择加入 Mantis 场景；请参阅 [Discord Mantis 场景](/concepts/qa-e2e-automation/operator-flow#discord-mantis-scenarios)。

显式运行 Discord 语音自动加入场景：

```bash
pnpm openclaw qa discord \
  --scenario discord-voice-autojoin \
  --provider-mode mock-openai
```

在拆除成功启动的子网关期间，Discord 适配器将保留其凭证租约和检测信号，直到该网关停止为止。如果关闭失败，套件将拒绝释放租约。

使用凸租约运行转录授权场景，其有效负载包含保留的 QA 房间的 `voiceChannelId`：

```bash
pnpm openclaw qa discord \
  --scenario discord-transcripts-voice-authorization \
  --provider-mode live-frontier \
  --credential-source convex \
  --credential-role maintainer
```

显式运行 Mantis 状态反应场景：

```bash
pnpm openclaw qa discord \
  --scenario discord-status-reactions-tool-only \
  --provider-mode live-frontier \
  --model openai/gpt-5.6-luna \
  --alt-model openai/gpt-5.6-luna \
  --fast
```

输出工件：

- `qa-suite-report.md`
- `qa-suite-summary.json`
- `qa-evidence.json` - 实时传输检查的证据条目。
- `discord-qa-reaction-timelines.json` 和 `discord-status-reactions-tool-only-timeline.png`，当状态反应场景运行时生成。
