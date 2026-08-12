---
summary: "Doctor 命令：健康检查、配置迁移和修复步骤"
read_when:
  - 添加或修改 doctor 迁移
  - 引入破坏性的配置变更
title: "Doctor"
sidebarTitle: "Doctor"
---

`openclaw doctor` 是 OpenClaw 的修复和迁移工具。它会修复过时的配置和状态、检查健康状况，并提供可执行的修复步骤。

## 快速开始

```bash
openclaw doctor
```

### 无头和自动化模式

<Tabs>
  <Tab title="--yes">
    ```bash
    openclaw doctor --yes
    ```

    在不提示的情况下接受默认值（如适用，包括重启／服务／沙箱修复步骤）。

  </Tab>
  <Tab title="--fix">
    ```bash
    openclaw doctor --fix
    ```

    在不提示的情况下应用建议的修复（`--repair` 是别名）。

  </Tab>
  <Tab title="--lint">
    ```bash
    openclaw doctor --lint
    openclaw doctor --lint --json
    ```

    为 CI 或预检自动化运行结构化健康检查。只读：不执行提示、修复、迁移、重启或状态写入。

  </Tab>
  <Tab title="--fix --force">
    ```bash
    openclaw doctor --fix --force
    ```

    也应用激进修复（覆盖自定义的 supervisor 配置）。

  </Tab>
  <Tab title="--non-interactive">
    ```bash
    openclaw doctor --non-interactive
    ```

    在不提示的情况下运行，仅应用安全迁移（配置规范化＋磁盘状态移动）。跳过需要人工确认的重启／服务／沙箱操作。检测到旧版状态迁移时，仍会自动运行。

  </Tab>
  <Tab title="--deep">
    ```bash
    openclaw doctor --deep
    ```

    扫描系统服务以查找额外的 gateway 安装（launchd／systemd／schtasks）。

  </Tab>
</Tabs>

要在写入前查看更改，请先打开配置文件：

```bash
cat ~/.openclaw/openclaw.json
```

## 只读 lint 模式

`openclaw doctor --lint` 是 `openclaw doctor --fix` 面向自动化的对应模式。它们共享同一个 Doctor 规则注册表，但选择或执行规则的方式并不相同：

| 模式                     | 提示      | 写入配置/状态            | 输出                   | 适用场景                        |
| ------------------------ | --------- | ------------------------ | ---------------------- | ------------------------------- |
| `openclaw doctor`        | 是        | 否                       | 友好的健康报告         | 人工检查状态                    |
| `openclaw doctor --fix`  | 有时      | 是，按修复策略写入       | 友好的修复日志         | 应用已批准的修复                |
| `openclaw doctor --lint` | 否        | 否                       | 结构化结果             | CI、预检和审查门禁              |

默认情况下，`doctor --lint` 运行广泛且安全的自动化配置文件：检查静态、本地，并且对 CI 或预检输出有用的项目。它会跳过建议性检查、依赖环境的检查、依赖实时服务的检查、账户／工作区清单检查，以及历史清理检查等选择性检查。如果需要完整的已注册 lint 审计（包括这些选择性检查），请使用 `doctor --lint --all`；如果需要针对特定检查，请使用 `--only <id>`。

`doctor --fix` 不使用 lint 默认配置文件，也不接受 `--all`。它会运行 Doctor 的有序修复流程：现代健康检查可以提供可选的 `repair()` 实现，而较旧的领域仍使用其传统的 Doctor 修复流程。某些 lint 发现仅用于诊断，因此某项检查出现在 `--lint --all` 中，并不意味着 `--fix` 会修改该领域。该契约将 `detect()`（报告发现）与 `repair()`（报告变更／差异／副作用）分离开来，从而为未来的 `doctor --fix --dry-run` 保留了实现空间，而不会将 lint 检查变成变更规划器。

一些内置检查在内部默认禁用，这样它们仍可用于 `--all`、`--only` 和 Doctor 修复流程，同时不会成为默认 `doctor --lint` 自动化配置文件的一部分。发现的严重性仍会按每条发现分别输出（`info`、`warning` 或 `error`）；默认选择并不代表严重性级别。

```bash
openclaw doctor --lint
openclaw doctor --lint --severity-min warning
openclaw doctor --lint --json
openclaw doctor --lint --all
openclaw doctor --lint --only core/doctor/gateway-config --json
```

JSON 输出字段：

- `ok`：是否有任何发现达到所选严重性阈值
- `checksRun`／`checksSkipped`：数量（因配置文件、`--only` 或 `--skip` 而跳过）
- `findings`：结构化诊断信息，包含 `checkId`、`severity`、`message`，以及可选的 `path`、`line`、`column`、`ocPath`、`source`、`target`、`requirement`、`fixHint`

退出码：

| Code | Meaning                                                  |
| ---- | -------------------------------------------------------- |
| `0`  | 没有发现达到或超过所选阈值的问题                           |
| `1`  | 有一个或多个发现达到所选阈值                             |
| `2`  | 在能够输出发现之前发生命令／运行时失败                    |

标志：

- `--severity-min info|warning|error`（默认值为 `warning`）：控制输出内容以及导致非零退出码的内容。
- `--all`：运行所有已注册的 lint 检查，包括默认自动化集合中排除的选择性检查。
- `--only <id>`（可重复）：仅运行指定检查 ID；未知 ID 将作为错误发现报告。
- `--skip <id>`（可重复）：排除某项检查，同时保持其余运行继续进行。
- `--json`、`--severity-min`、`--all`、`--only` 和 `--skip` 要求使用 `--lint`；普通的 `openclaw doctor` 和 `--fix` 运行会拒绝这些选项。

## 它做什么（摘要）

<AccordionGroup>
  <Accordion title="健康检查、UI 和更新">
    - Git 安装的可选预更新（仅限交互模式）。
    - UI 协议新鲜度检查（当协议 schema 更新时重建 Control UI）。
    - 健康检查＋重启提示。
    - 仅报告问题的 skill 和 plugin 提示；正常的清单保留在 `openclaw skills check` 和 `openclaw plugins list` 中。

  </Accordion>
  <Accordion title="配置和迁移">
    - 针对旧版值形状的配置规范化。
    - 将旧版扁平 `talk.*` 字段中的 Talk 配置迁移到 `talk.provider`＋`talk.providers.<provider>`。
    - 浏览器迁移检查：旧版 Chrome 扩展配置、自有 native-bootstrap 注册漂移，以及 Chrome MCP 就绪状态。
    - OpenCode provider 覆盖警告（`models.providers.opencode`／`opencode-zen`／`opencode-go`）。
    - 旧版 OpenAI Codex provider/profile 迁移（`openai-codex` → `openai`），以及针对过时 `models.providers.openai-codex` 的遮蔽警告。
    - OpenAI Codex OAuth profile 的 OAuth TLS 前置条件检查。
    - 当 `plugins.allow` 具有限制性，但工具策略仍要求通配符工具或 plugin 所有的工具时，发出 Plugin／工具 allowlist 警告。
    - 旧版磁盘状态迁移（sessions／agent 目录／WhatsApp auth）。
    - 已弃用的 QMD memory 配置和派生 workspace 清理；请参阅[从 QMD 迁移](/concepts/memory-builtin#migrating-from-qmd)。
    - 旧版 plugin manifest contract key 迁移（`speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders`、`webSearchProviders` → `contracts`）。
    - 旧版 cron store 迁移（`jobId`、`schedule.cron`、顶层 delivery／payload 字段、payload `provider`、`notify: true` webhook 回退任务）。
    - 将旧版 workspace `TOOLS.md` 迁移到 `AGENTS.md` 的 `## Tools` 部分，并在移除原文件前将其归档到 state 目录下。
    - 修复 Codex CLI runtime pin（`agentRuntime.id: "codex-cli"` → `"codex"`），涵盖 `agents.defaults`、`agents.entries.*` 和 `models.providers.*`（包括单模型条目）。
    - 在 plugin 已启用时清理过时的 plugin 配置；当 `plugins.enabled=false` 时，过时的 plugin 引用会作为无效的隔离配置保留。

  </Accordion>
  <Accordion title="状态和完整性">
    - 检查 session lock 文件并清理过时的 lock。
    - 修复受影响的 2026.4.24 构建所创建的重复 prompt-rewrite 分支对应的 session transcript。
    - 检测卡住的主 session 和 subagent 重启恢复 tombstone。Doctor 会报告被阻塞的 session，并且只修复与现有 tombstone 冲突的过时 aborted 标记；不会重新启用自动恢复。
    - 状态完整性和权限检查（sessions、transcripts、state 目录）。
    - 在本地运行时检查配置文件权限（chmod 600）。
    - Model auth 健康检查：检查 OAuth 过期状态，可刷新即将过期的 token，并报告 auth-profile 冷却／禁用状态。

  </Accordion>
  <Accordion title="Gateway、服务和监管程序">
    - 在启用 sandboxing 时修复 sandbox image。
    - 旧版服务迁移和额外 Gateway 检测。
    - Matrix channel 旧版状态迁移（在 `--fix`／`--repair` 模式下）。
    - Gateway runtime 检查（服务已安装但未运行；缓存的 launchd label）。
    - Channel 状态警告（从正在运行的 Gateway 探测）。
    - Channel 专属权限检查位于 `openclaw channels capabilities` 下；例如，Discord voice channel 权限通过 `openclaw channels capabilities --channel discord --target channel:<channel-id>` 进行审计。
    - 检查 WhatsApp 在 Gateway event-loop 健康状况下降且本地 TUI client 仍在运行时的响应能力；`--fix` 只会停止已验证的本地 TUI client。
    - 修复旧版 primary model、fallback、image／video generation model、heartbeat／subagent／compaction override、hook、channel model override 和 session route pin 中的 Codex 路由 `openai-codex/*` model ref；`--fix` 会将其重写为 `openai/*`，把 `openai-codex:*` auth profile／顺序迁移到 `openai:*`，移除过时的 session／whole-agent runtime pin，并让修复后的有效路由决定 Codex 是否兼容。
    - Supervisor 配置审计（launchd／systemd／schtasks），可选择修复。
    - 清理 Gateway 服务中嵌入的 proxy 环境：这些服务在安装或更新期间捕获了 shell 的 `HTTP_PROXY`／`HTTPS_PROXY`／`NO_PROXY` 值。
    - Gateway runtime 检查（不受支持的旧版 Bun 服务、版本管理器路径）。
    - Gateway 端口冲突诊断（默认端口 `18789`）。

  </Accordion>
  <Accordion title="认证、安全和配对">
    - 开放 DM 策略的安全警告。
    - 本地 token 模式的 Gateway 认证检查（当不存在 token 来源时提供生成 token；不会覆盖 token SecretRef 配置）。
    - 设备配对问题检测（待处理的首次配对请求、待处理的角色／范围升级、陈旧的本地 device-token 缓存漂移，以及已配对记录的认证漂移）。

  </Accordion>
  <Accordion title="工作区和 Shell">
    - 在 Linux 上检查 systemd linger。
    - Workspace bootstrap 文件大小检查（针对上下文文件的截断／接近限制警告）。
    - 检查默认 agent 的 Skills 就绪状态；报告缺少 bin、env、配置或 OS 要求的 allowed skills，并且 `--fix` 可以在 `skills.entries` 中禁用不可用的 skill。
    - Shell 补全状态检查以及自动安装／升级。
    - Memory search embedding provider 就绪状态检查（本地 model 或远程 API key）。
    - Source install 检查（pnpm workspace 不匹配、缺少 UI 资源、缺少 tsx binary）。
    - 写入更新后的配置＋wizard metadata。

  </Accordion>
</AccordionGroup>

## Dreams UI 回填和重置

The Control UI Dreams scene includes **Backfill**、**Reset**、and **Clear Grounded** actions for the grounded dreaming workflow。These use gateway doctor-style RPC methods but are **not** part of `openclaw doctor` CLI repair/migration。

| Action         | What it does                                                                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backfill       | 扫描活动工作区中的历史 `memory/YYYY-MM-DD.md` 文件，运行 grounded REM 日记处理，并将可逆的回填条目写入 `DREAMS.md`。 |
| Reset          | 仅移除 `DREAMS.md` 中带有标记的回填日记条目。                                                                                                  |
| Clear Grounded | 仅移除历史回放中暂存的、仅 grounded 的短期条目，这些条目尚未积累实时召回或每日支持。                           |

None of these edit `MEMORY.md`、run full doctor migrations、or stage grounded candidates into the live short-term promotion store on their own。To feed grounded historical replay into the normal deep promotion lane，use the CLI flow instead：

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

That stages grounded durable candidates into the short-term dreaming store while `DREAMS.md` stays the review surface。

## 详细行为和原理

<AccordionGroup>
  <Accordion title="0. 可选更新（git 安装）">
    如果这是一个 git checkout，并且 doctor 以交互方式运行，它会在执行 doctor 前提供更新（fetch/rebase/build）的选项。
  </Accordion>
  <Accordion title="1. Config normalization">
    Doctor 会将旧版值形状规范化为当前 schema。当前 Talk 语音配置为 `talk.provider` + `talk.providers.<provider>`，实时语音配置位于 `talk.realtime.*` 下。Doctor 会将旧的 `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` / `talk.apiKey` 形状重写到 provider 映射中，并将旧版顶层实时选择器（`talk.mode`、`talk.transport`、`talk.brain`、`talk.model`、`talk.voice`）重写到 `talk.realtime` 中。

    当 `plugins.allow` 非空且工具策略使用通配符或由插件拥有的工具条目时，Doctor 还会发出警告。`tools.allow: ["*"]` 只匹配实际加载的插件中的工具；它不会绕过专属插件 allowlist。

  </Accordion>
  <Accordion title="2. Legacy config key migrations">
    当配置包含已弃用且存在有效迁移的键时，其他命令会拒绝运行，并要求你运行 `openclaw doctor`。Doctor 会解释发现了哪些旧键，显示它应用的迁移，并使用更新后的 schema 重写 `~/.openclaw/openclaw.json`。Gateway 启动会拒绝旧版配置格式，并要求你运行 `openclaw doctor --fix`；它不会在启动时重写 `openclaw.json`。Cron 任务存储迁移也由 `openclaw doctor --fix` 处理。

    <Note>
      Doctor 只会在某个键退役后的大约两个月内提供自动迁移。更早的旧键（例如最初的
      `routing.queue`、`routing.bindings`、`routing.agents`/`defaultAgentId`、
      `routing.transcribeAudio`、顶层 `agent.*`，或多 agent 配置形状之前的顶层
      `identity`）不再有迁移路径；现在使用这些键的配置会验证失败，而不是被重写。在 doctor
      可以继续之前，请根据当前配置参考手动修复这些键。
    </Note>

    有效迁移：

    | 旧键                                                                                    | 当前键                                                                 |
    | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
    | `routing.allowFrom`                                                                              | `channels.whatsapp.allowFrom`                                                |
    | `routing.groupChat.requireMention`                                                               | `channels.whatsapp/telegram/imessage.groups."*".requireMention`             |
    | `routing.groupChat.historyLimit`                                                                 | `messages.groupChat.historyLimit`                                            |
    | `routing.groupChat.mentionPatterns`                                                              | `messages.groupChat.mentionPatterns`                                         |
    | `channels.telegram.requireMention`                                                               | `channels.telegram.groups."*".requireMention`                               |
    | `channels.webchat`、`gateway.webchat`                                                            | 已移除（WebChat 已退役）                                                 |
    | `channels.feishu.accounts.<accountId>.botName`                                                   | `channels.feishu.accounts.<accountId>.name`                                 |
    | `session.threadBindings.ttlHours`、`channels.<id>.threadBindings.ttlHours`（以及每个账号）      | `...threadBindings.idleHours`                                               |
    | 旧版 `talk.voiceId`/`talk.voiceAliases`/`talk.modelId`/`talk.outputFormat`/`talk.apiKey`        | `talk.provider` + `talk.providers.<provider>`                               |
    | 旧版顶层实时 Talk 选择器（`talk.mode`/`talk.transport`/`talk.brain`/`talk.model`/`talk.voice`） | `talk.realtime`                                                              |
    | `messages.tts`                                                                                  | 顶层 `tts`                                                              |
    | `messages.tts.<provider>`（`openai`/`elevenlabs`/`microsoft`/`edge`）                             | `tts.providers.<provider>`                                                   |
    | `messages.tts.provider: "edge"` / `messages.tts.providers.edge`                                  | `tts.provider: "microsoft"` / `tts.providers.microsoft`                    |
    | `tools.exec.security` + `tools.exec.ask`                                                         | `tools.exec.mode`                                                            |
    | `session.idleMinutes`                                                                            | `session.reset.idleMinutes`                                                  |
    | `messages.responsePrefix`，以及显式频道块                                           | 复制到已配置的频道/账号 `responsePrefix`；为隐式/自定义频道保留全局回退值 |
    | `web.enabled`                                                                                    | `channels.whatsapp.enabled`                                                  |
    | `meta.lastTouchedAt`、hook 安装、cron 存储、捆绑发现、全局 TTS 偏好路径            | 共享 SQLite 状态                                                       |
    | TTS speaker 字段 `voice`/`voiceName`/`voiceId`                                                 | `speakerVoice`/`speakerVoiceId`                                              |
    | `channels.<id>.tts.<provider>` / `channels.<id>.accounts.<accountId>.tts.<provider>`（除 Discord 外的所有频道）                                          | `...tts.providers.<provider>`                                                |
    | `channels.<id>.voice.tts.<provider>` / `channels.<id>.accounts.<accountId>.voice.tts.<provider>`（所有频道，包括 Discord）                          | `...voice.tts.providers.<provider>`                                          |
    | `plugins.entries.voice-call.config.tts.<provider>`（`openai`/`elevenlabs`/`microsoft`/`edge`）     | `plugins.entries.voice-call.config.tts.providers.<provider>`                |
    | `plugins.entries.voice-call.config.tts.provider: "edge"` / `...tts.providers.edge`                | `provider: "microsoft"` / `...tts.providers.microsoft`                      |
    | `plugins.entries.voice-call.config.provider: "log"`                                              | `"mock"`                                                                      |
    | `plugins.entries.voice-call.config.twilio.from`                                                  | `plugins.entries.voice-call.config.fromNumber`                              |
    | `plugins.entries.voice-call.config.streaming.sttProvider`                                        | `plugins.entries.voice-call.config.streaming.provider`                      |
    | `plugins.entries.voice-call.config.streaming.openaiApiKey`/`sttModel`/`silenceDurationMs`/`vadThreshold` | `plugins.entries.voice-call.config.streaming.providers.openai.*`             |
    | `models.providers.*.api: "openai"`                                                               | `"openai-completions"`（gateway 启动还会跳过 `api` 为未来/未知枚举值的 provider，而不是安全拒绝） |
    | `browser.ssrfPolicy.allowPrivateNetwork`                                                         | `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`                          |
    | `browser.profiles.*.driver: "extension"``，以及过期的 `cdpUrl`                                  | 保留 driver；移除过期的 relay URL                                     |
    | `browser.relayBindHost`                                                                          | 已移除（旧版 Chrome 扩展 relay 设置）                             |
    | `mcp.servers.*.type`（CLI 原生别名）                                                        | `mcp.servers.*.transport`                                                    |
    | `mcp.servers.*.disabled`                                                                         | `mcp.servers.*.enabled` 的反值                                              |
    | MCP 超时别名 `connectTimeout`/`connect_timeout`/`timeout`                                 | `connectionTimeoutMs`/`requestTimeoutMs`                                    |
    | MCP snake-case 服务器字段                                                                     | camelCase MCP 服务器字段                                                   |
    | `tools.media.image/audio/video.models`                                                           | 带 capability 标签的 `tools.media.models`                                        |
    | `tools.media.asyncCompletion`                                                                    | 已移除                                                                       |
    | `tools.message.allowCrossContextSend`                                                            | `tools.message.crossContext`                                                  |
    | media model `deepgram` 选项                                                                   | `providerOptions.deepgram`                                                    |
    | `talk.realtime.voice`、Discord realtime `voice`                                                 | `speakerVoice`                                                                |
    | `agents.defaults.pdfMaxBytesMb`                                                                  | `agents.defaults.pdfMaxMb`                                                   |
    | `tools.exec.timeoutSec`                                                                          | `tools.exec.timeoutSeconds`                                                   |
    | `browser.ssrfPolicy.hostnameAllowlist`                                                           | 支持通配符的 `browser.ssrfPolicy.allowedHostnames`                          |
    | sandbox browser `enableNoVnc`                                                                    | `noVncEnabled`                                                                |
    | 根级 `media`                                                                                     | `attachments`                                                                |
    | 频道/账号 `heartbeat` 可见性块                                                   | `heartbeatVisibility`                                                         |
    | `channels.slack.identity`                                                                        | `channels.slack.postAs`                                                       |
    | 根级 `audit`                                                                                     | `logging.audit`                                                               |
    | `gateway.nodes.skills.enabled`                                                                   | `gateway.nodes.allowSkills`                                                   |
    | `gateway.nodes.allowCommands`/`denyCommands`                                                    | `gateway.nodes.commands.allow`/`deny`                                         |
    | generation model defaults                                                                       | `agents.defaults.mediaModels.{image,video,music}`                              |
    | 已退役的最终布局调优项                                                               | 内置默认行为                                                     |
    | `channels.whatsapp.messagePrefix` 和旧版 `messages.messagePrefix`                            | `channels.whatsapp.responsePrefix`                                            |
    | `channels.whatsapp.ackReaction`                                                                  | 全局 `messages.ackReaction` 和可转换时的 `ackReactionScope`        |
    | `cron.failureDestination`                                                                        | `cron.failureAlert` 上的目标字段                                     |
    | `gateway.controlUi.chatMessageMaxWidth`、仅用于展示的 `ui.prefs` 键                       | 已移除（文本缩放、聊天宽度和实时侧边栏活动均为浏览器本地设置） |
    | `agents.list`                                                                                    | 使用键标识的 `agents.entries`                                                        |
    | 顶层 `defaultModel`                                                                         | `agents.defaults.model`                                                      |
    | `messages.messagePrefix`                                                                         | `channels.whatsapp.responsePrefix`                                            |
    | `session.maintenance.pruneDays`、`session.resetByType.dm`                                        | `session.maintenance.pruneAfter`、`session.resetByType.direct`               |
    | 顶层 `tui`                                                                                  | 已移除（TUI 页脚使用紧凑默认值）                            |
    | `plugins.entries.codex.config.codexDynamicToolsProfile`                                          | 已移除（Codex app-server 始终将 Codex 原生工作区工具保持为原生工具） |
    | `commands.modelsWrite`                                                                           | 已移除（`/models add` 已弃用）                                       |
    | `agents.defaults/list[].silentReplyRewrite`、`surfaces.*.silentReplyRewrite`                     | 已移除（精确的 `NO_REPLY` 不再被重写为可见的回退文本）  |
    | `agents.defaults/list[].systemPromptOverride`                                                    | 已移除（OpenClaw 负责生成 system prompt）                        |
    | `agents.defaults/list[].embeddedPi`                                                              | `embeddedAgent`                                                              |
    | `agents.defaults/list[].sandbox.perSession`                                                      | `sandbox.scope`                                                              |
    | `agents.defaults.llm`                                                                             | 已移除（对于速度较慢的模型/provider 超时，请使用 `models.providers.<id>.timeoutSeconds`，其值需保持在 agent/run 超时上限以下） |
    | 顶层 `memorySearch`、`agents.defaults.memorySearch`                                         | `memory.search`                                                             |
    | `agents.entries.*.memorySearch`                                                                     | `agents.entries.*.memory.search`                                               |
    | `memorySearch.provider: "auto"`                                                                  | `"openai"`                                                                    |
    | `memorySearch.store.path`（任意级别）                                                            | 已移除（memory 索引位于每个 agent 的数据库中）                       |
    | 顶层 `heartbeat`                                                                            | `agents.defaults.heartbeat` / `channels.defaults.heartbeat`                 |
    | `plugins.openai-codex` policy ids                                                                | `plugins.openai`                                                             |
    | `tools.web.x_search.apiKey`                                                                      | `plugins.entries.xai.config.webSearch.apiKey`                               |
    | `session.maintenance.rotateBytes`、`session.parentForkMaxTokens`                                 | 已移除（已弃用）                                                        |
    | 2026.7 退役的运行时和频道调优项                                               | 已移除（应用内置生产默认值）                               |

    <Note>
      上述 `plugins.entries.voice-call.config.*` 行由 Voice Call 插件自身在每次配置加载时规范化，而不是由
      `openclaw doctor` 规范化。该插件还会记录一条指向 `openclaw doctor --fix` 的启动警告，但 doctor
      当前不会针对这些键重写 `openclaw.json`；运行时实际应用更改的是插件自身的规范化逻辑。
    </Note>

    多账号频道的账号默认值指导：

    - 如果配置了两个或更多 `channels.<channel>.accounts` 条目，但没有 `channels.<channel>.defaultAccount` 或 `accounts.default`，doctor 会警告回退路由可能选择到意外的账号。
    - 如果 `channels.<channel>.defaultAccount` 被设置为未知的账号 ID，doctor 会警告并列出已配置的账号 ID。

  </Accordion>
  <Accordion title="2b. OpenCode provider overrides">
    如果你在匹配的官方外部插件已安装并启用时，手动添加了 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`，它会覆盖该插件提供的目录。这可能会强制模型使用错误的 API，或将成本归零。Doctor 会发出警告，以便你移除该覆盖并恢复按模型进行的 API 路由和成本计算。如果没有匹配的插件，该条目仍是有效的独立自定义 provider。
  </Accordion>
  <Accordion title="2c. Browser migration and Chrome MCP readiness">
    如果扩展驱动配置仍携带已退役的 relay `cdpUrl`，doctor 会在保留 `driver: "extension"` 的同时移除该 URL；当前扩展 relay 会自行管理其端点。Doctor 还会移除已退役的 `browser.relayBindHost` 设置。

    当启用 `browser.extensionRelay.allowLegacyAuth` 时，Doctor 会发出警告。请将配对的 Chrome 扩展和外部 CDP 客户端升级到 Browser Relay Authentication v2，然后将该标志设置为 `false`。V2 客户端不会降级到旧版身份验证。

    当稳定版 Chrome 扩展副本和所属的 native-host 注册已存在时，doctor 会报告注册漂移。`openclaw doctor --fix` 可能会修复该所属注册，但它绝不会为每个 OpenClaw 用户安装 host，也绝不会覆盖同名的外部 manifest 或 launcher。首次设置请使用 `openclaw browser extension install`。

    当使用 `defaultProfile: "user"` 或已配置的 `existing-session` profile 时，Doctor 还会审计主机本地的 Chrome MCP 路径：

    - 检查默认自动连接配置下，Google Chrome 是否安装在同一台主机上
    - 检查检测到的 Chrome 版本，并在低于 Chrome 144 时发出警告
    - 提醒你在浏览器 inspect 页面中启用远程调试（例如 `chrome://inspect/#remote-debugging`、`brave://inspect/#remote-debugging` 或 `edge://inspect/#remote-debugging`）

    Doctor 无法代你启用 Chrome 端的设置。主机本地 Chrome MCP 仍要求 gateway/node 主机上存在基于 Chromium 的 144+ 浏览器，在本地运行，并启用远程调试，同时在浏览器中批准首次 attach 的同意提示。

    此处的就绪检查仅涵盖本地 attach 前置条件。Existing-session 保留当前 Chrome MCP 路由限制；`responsebody`、PDF 导出、下载拦截和批量操作等高级路由仍需要托管浏览器或原始 CDP profile。此检查不适用于 Docker、sandbox、remote-browser 或其他无头流程，这些流程继续使用原始 CDP。

  </Accordion>
  <Accordion title="2d. OAuth TLS 前置条件">
    当配置了 OpenAI Codex OAuth 配置文件时，doctor 会探测 OpenAI 授权端点，以验证本地 Node/OpenSSL TLS 栈能否验证证书链。如果探测因证书错误失败（例如 `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`、证书过期或自签名证书），doctor 会打印平台特定的修复指导。在使用 Homebrew Node 的 macOS 上，通常的修复方式是 `brew postinstall ca-certificates`。使用 `--deep` 时，即使 gateway 健康，探测也会运行。
  </Accordion>
  <Accordion title="2e. Codex OAuth provider overrides">
    如果你之前在 `models.providers.openai-codex` 下添加了旧版 OpenAI transport 设置，它们可能会遮蔽内置的 Codex OAuth provider 路径。当 Doctor 发现这些旧 transport 设置与 Codex OAuth 同时存在时，会发出警告，以便你移除或重写过时的 transport 覆盖并恢复当前的路由行为。自定义代理和仅包含 header 的覆盖仍受支持，不会触发此警告，但这些由用户编写的请求路由不符合隐式 Codex 选择条件。
  </Accordion>
  <Accordion title="2f. Codex route repair">
    Doctor 会检查旧版 `openai-codex/*` 模型引用。原生 Codex harness 路由使用规范的 `openai/*` 模型引用，但仅有此前缀绝不会选择 Codex。当运行时策略未设置或为 `auto` 时，只有精确的官方 HTTPS Platform Responses 或 ChatGPT Responses 路由，且没有用户编写的请求覆盖时，才符合条件。请参阅 [OpenAI implicit agent runtime](/providers/openai#implicit-agent-runtime)。

    在 `--fix` / `--repair` 模式下，doctor 会重写受影响的默认 agent 和按 agent 引用，包括主模型、回退、图像/视频生成模型、heartbeat/subagent/compaction 覆盖、hooks、频道模型覆盖以及陈旧的持久化会话路由状态：

    - `openai-codex/gpt-*` 变为 `openai/gpt-*`。
    - Codex 意图会移动到针对 provider/model 的 `agentRuntime.id: "codex"` 条目，用于修复后的 agent 模型引用。
    - 陈旧的整个 agent 运行时配置和持久化会话运行时固定值会被移除，因为运行时选择以 provider/model 为范围。
    - 除非修复后的旧模型引用需要 Codex 路由来保留旧的身份验证路径，否则现有 provider/model 运行时策略会被保留。
    - 现有模型回退列表会被保留，并重写其中的旧版条目；复制的按模型设置会从旧键移动到规范的 `openai/*` 键。
    - 持久化会话的 `modelProvider`/`providerOverride`、`model`/`modelOverride`、回退通知和 auth-profile 固定值会在所有已发现的 agent 会话存储中修复。
    - Doctor 会单独修复过时的 `agentRuntime.id: "codex-cli"` 固定值（这是一个独立的旧版运行时 ID），将其在 `agents.defaults`、`agents.entries.*` 和 `models.providers.*` 模型条目中改为 `"codex"`。
    - `/codex ...` 表示“从聊天中控制或绑定原生 Codex 对话”。
    - `/acp ...` 或 `runtime: "acp"` 表示“使用外部 ACP/acpx 适配器”。

  </Accordion>
  <Accordion title="2g. 会话 route 清理">
    当你把已配置模型或运行时从某个插件拥有的 route（例如 Codex）迁移走后，Doctor 还会扫描已发现的 agent 会话存储中的陈旧自动创建 route 状态。

    `openclaw doctor --fix` 可以清除自动创建的陈旧状态，例如 `modelOverrideSource: "auto"` 模型 pin、运行时模型元数据、固定的 harness id、CLI 会话绑定，以及在其所属 route 不再配置时的自动 auth-profile 覆盖。显式用户选择或旧的会话模型选择会被报告出来供人工审查，并保持不变；如果该 route 不再被需要，可通过 `/model ...`、`/new` 切换，或重置会话。

  </Accordion>
  <Accordion title="3. 旧状态迁移（磁盘布局）">
    Doctor 可以将旧的磁盘布局迁移到当前结构：

    - Sessions store + transcripts：从 `~/.openclaw/sessions/` 到 `~/.openclaw/agents/<agentId>/sessions/`
    - Agent dir：从 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`
    - WhatsApp auth state（Baileys）：从旧版 `~/.openclaw/credentials/*.json`（`oauth.json` 除外）到 `~/.openclaw/credentials/whatsapp/<accountId>/...`（默认账号 ID：`default`）
    - Signed device identity：从 `~/.openclaw/identity/device.json` 进入 `state/openclaw.sqlite` 中的 `primary` `device_identities` 行；单独的 device-auth 文件保持不变

    这些迁移是尽力而为且幂等的；当 doctor 将任何旧文件夹作为备份保留时，会发出警告。Gateway/CLI 也会在启动时自动迁移旧版 sessions + agent dir，使历史记录、身份验证和模型进入按 agent 划分的路径，无需手动运行 doctor。WhatsApp 身份验证仅通过 `openclaw doctor` 迁移，这是有意的。Talk provider/provider-map 规范化会按结构相等性进行比较，因此仅键顺序不同不再触发重复的无操作 `doctor --fix` 更改。

  </Accordion>
  <Accordion title="3a. Legacy plugin manifest migrations">
    Doctor 会扫描所有已安装的插件 manifest，查找已弃用的顶层 capability 键（`speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders`、`webSearchProviders`）。发现后，它会提供将这些键移动到 `contracts` 对象并原地重写 manifest 文件的选项。此迁移是幂等的；如果 `contracts` 已包含相同值，则会移除旧键，而不会重复数据。
  </Accordion>
  <Accordion title="3b. Legacy cron store migrations">
    Doctor 还会在将规范行导入 SQLite 之前，检查旧版 cron 任务存储（`~/.openclaw/cron/jobs.json`）中的旧任务形状。

    当前 cron 清理包括：

    - `jobId` → `id`
    - `schedule.cron` → `schedule.expr`
    - 顶层 payload 字段（`message`、`model`、`thinking`……）→ `payload`
    - 顶层 delivery 字段（`deliver`、`channel`、`to`、`provider`……）→ `delivery`
    - payload 中的 `provider` delivery 别名 → 明确的 `delivery.channel`
    - 旧版 `notify: true` webhook 回退任务 → 当已退役的原始 `cron.webhook` 值有效时，转换为明确的 webhook delivery；announce 任务保留其聊天 delivery，并获得 `delivery.completionDestination`。随后 Doctor 会移除旧配置键。如果没有可用的旧版 webhook，不指向目标的任务会移除无效的顶层 `notify` 标记（现有 delivery，包括 announce，会被保留），因为运行时 delivery 从不读取该标记。

    Gateway 还会在加载时清理格式错误的 cron 行，使有效任务继续运行。格式错误的行会在从活动调度中移除它们的同一事务中，被隔离到共享 SQLite 状态数据库；doctor 会报告这些记录，并导入旧版本留下的 `jobs-quarantine.json` sidecar 文件。

    Gateway 启动会规范化运行时投影并忽略顶层 `notify` 标记，但会将持久化 cron 状态留给 doctor 修复。对于没有迁移目标的任务（`delivery.mode` 为 none/缺失、旧版 webhook 目标不可用，或已有 announce/chat delivery），Doctor 会移除无效标记并保持现有 delivery 不变，因此重复运行 `doctor --fix` 时不会再针对同一任务重复发出警告。

    在 Linux 上，doctor 还会在用户的 crontab 仍调用旧版 `~/.openclaw/bin/ensure-whatsapp.sh` 时发出警告。这个宿主机本地脚本不受当前 OpenClaw 维护，而且当 cron 无法访问 systemd 用户总线时，可能会向 `~/.openclaw/logs/whatsapp-health.log` 写入虚假的 `Gateway inactive` 消息。请使用 `crontab -e` 删除过时的 crontab 条目；当前健康检查请使用 `openclaw channels status --probe`、`openclaw doctor` 和 `openclaw gateway status`。

  </Accordion>
  <Accordion title="3c. Session lock cleanup">
    Doctor 会扫描每个 agent 会话目录，查找会话异常退出后遗留的过时写锁文件。对于找到的每个锁文件，它会报告：路径、PID、PID 是否仍存活、锁的年龄，以及是否被认为已过时（PID 已终止、所有者元数据格式错误、超过 30 分钟，或已证明存活的 PID 属于非 OpenClaw 进程）。在 `--fix` / `--repair` 模式下，它会自动移除所有者已终止、孤立、已复用、旧格式错误或属于非 OpenClaw 进程的锁。仍由存活的 OpenClaw 进程持有的旧锁会被报告但保留，以避免 doctor 截断活动的 transcript writer。
  </Accordion>
  <Accordion title="3d. 会话转写分支修复">
    Doctor 会扫描 agent 会话 JSONL 文件，查找由 2026.4.24 prompt transcript rewrite bug 造成的重复分支结构：一个带有 OpenClaw 内部运行时上下文的已放弃 user turn，以及一个包含相同可见用户提示的活动同级分支。在 `--fix` / `--repair` 模式下，doctor 会在原文件旁边为每个受影响文件创建备份，并将转写重写为活动分支，这样 gateway 历史和 memory 读取器就不再会看到重复 turn。
  </Accordion>
  <Accordion title="4. State integrity checks（session persistence、routing 和 safety）">
    State directory 是运行时的核心。如果它消失，除非你在其他地方有备份，否则会丢失 sessions、凭据、日志和配置。

    Doctor 会检查：

    - **State dir missing**：警告灾难性的状态丢失，提示重新创建目录，并提醒你它无法恢复丢失的数据。
    - **State dir permissions**：验证目录是否可写；提供修复权限的选项（检测到所有者/组不匹配时还会给出 `chown` 提示）。
    - **macOS cloud-synced state dir**：当状态路径位于 iCloud Drive（`~/Library/Mobile Documents/com~apple~CloudDocs/...`）或 `~/Library/CloudStorage/...` 下时发出警告，因为同步路径可能导致 I/O 变慢以及锁/同步竞争。
    - **Linux SD 或 eMMC state dir**：当状态路径解析到 `mmcblk*` 挂载源时发出警告，因为 SD/eMMC 支持的随机 I/O 可能更慢，并且在 session 和凭据写入期间磨损更快。
    - **Linux volatile state dir**：当状态路径解析到 `tmpfs` 或 `ramfs` 时发出警告，因为 sessions、凭据、配置和 SQLite 状态（包括 WAL/journal sidecar）会在重启时消失。Docker `overlay` 挂载不会被标记，因为只要容器仍在运行，其可写层会在主机重启后持久存在。
    - **Session dirs missing**：需要 `sessions/` 和 session store 目录来持久化历史并避免 `ENOENT` 崩溃。
    - **Transcript mismatch**：当最近的 session 条目缺少 transcript 文件时发出警告。
    - **Main session "1-line JSONL"**：当主 transcript 只有一行时进行标记（历史记录没有累积）。
    - **Multiple state dirs**：当不同 home 目录下存在多个 `~/.openclaw` 文件夹，或 `OPENCLAW_STATE_DIR` 指向其他位置时发出警告（历史可能在不同安装之间分裂）。
    - **Remote mode reminder**：如果 `gateway.mode=remote`，doctor 会提醒你在远程主机上运行它（状态位于远程主机）。
    - **Config file permissions**：如果 `~/.openclaw/openclaw.json` 对组或所有用户可读，会发出警告并提供将权限收紧到 `600` 的选项。

  </Accordion>
  <Accordion title="5. 模型认证健康（OAuth 过期）">
    Doctor 会检查认证存储中的 OAuth 配置文件，警告 token 即将过期/已过期的情况，并在安全时刷新它们。如果 Anthropic OAuth/token 配置文件过期，它会建议使用 Anthropic API key 或 Anthropic setup-token 路径。刷新提示只会在交互式运行（TTY）时出现；`--non-interactive` 会跳过刷新尝试。

    当 OAuth 刷新永久失败时（例如 `refresh_token_reused`、`invalid_grant`，或 provider 提示你重新登录），doctor 会报告需要重新认证，并打印要运行的确切 `openclaw models auth login --provider ...` 命令。

    Doctor 还会报告因短暂冷却期（速率限制/超时/认证失败）或较长时间禁用（计费/额度失败）而暂时不可用的 auth profiles。

    旧版 Codex OAuth profiles 的 token 位于 macOS Keychain 中（这是基于文件的 sidecar 布局之前的旧版 onboarding），只能由 doctor 修复。请从交互式终端运行一次 `openclaw doctor --fix`，将基于 Keychain 的旧版 token 内联迁移到 `auth-profiles.json`；之后，embedded turns（Telegram、cron、sub-agent dispatch）会将它们解析为规范的 OpenAI OAuth profiles。

  </Accordion>
  <Accordion title="6. Hooks model validation">
    如果设置了 `hooks.gmail.model`，doctor 会根据目录和 allowlist 验证模型引用，并在该引用无法解析或不被允许时发出警告。
  </Accordion>
  <Accordion title="7. 沙箱镜像修复">
    启用沙箱时，doctor 会检查 Docker 镜像，并在当前镜像缺失时提供构建或切换到旧名称的选项。
  </Accordion>
  <Accordion title="7b. Plugin install cleanup">
    在 `openclaw doctor --fix` / `openclaw doctor --repair` 模式下，Doctor 会移除旧版由 OpenClaw 生成的插件依赖暂存状态：过时的生成依赖根目录、旧安装阶段目录、早期捆绑插件依赖修复代码产生的包本地残留，以及可能遮蔽当前捆绑 manifest 的孤立或恢复的、由 npm 管理的捆绑 `@openclaw/*` 插件副本。Doctor 还会将宿主 `openclaw` 包重新链接到声明 `peerDependencies.openclaw` 的 npm 管理插件中，使 `openclaw/plugin-sdk/*` 等包本地运行时导入在更新或 npm 修复后仍能解析。

    当配置引用了可下载插件，但本地插件注册表找不到它们时，Doctor 还可以重新安装缺失的插件（包括实质性的 `plugins.entries`、已配置的频道/provider/search 设置以及已配置的 agent runtimes）。在包更新期间，doctor 会避免在核心包替换时重新安装插件包；如果配置的插件仍需要恢复，请在更新后再次运行 `openclaw doctor --fix`。除下方容器镜像启动例外外，gateway 启动和配置重新加载不会运行包修复；插件安装仍属于明确的 doctor/install/update 工作。

    容器化 gateway 启动有一个范围有限的升级例外：当 `openclaw gateway run` 在新的 OpenClaw 版本上启动时，它会在就绪前运行安全状态迁移和现有的核心包之后插件收敛，然后记录每个版本的检查点。此启动过程可以清理过时的捆绑插件记录、修复本地插件链接、在收敛路径需要时重新安装已配置的插件包，并检查活动插件 payload。如果启动无法安全修复，请使用同一镜像，并针对相同的挂载状态/配置运行一次 `openclaw doctor --fix`，然后再正常重启容器。

  </Accordion>
  <Accordion title="8. Gateway 服务迁移和清理提示">
    Doctor 会检测旧的 gateway 服务（launchd/systemd/schtasks），并提供移除它们并使用当前 gateway 端口安装 OpenClaw 服务的选项。它还可以扫描额外的、类似 gateway 的服务并打印清理提示。带有 profile 名称的 OpenClaw gateway 服务被视为一等公民，不会被标记为“额外”。

    在 Linux 上，如果用户级 gateway 服务缺失但系统级 OpenClaw gateway 服务存在，doctor 不会自动安装第二个用户级服务。请使用 `openclaw gateway status --deep` 或 `openclaw doctor --deep` 检查，然后移除重复项，或者当系统 supervisor 承担 gateway 生命周期时设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。

  </Accordion>
  <Accordion title="8b. 启动时 Matrix 迁移">
    当 Matrix 频道账号存在待处理或可操作的旧状态迁移时，doctor（在 `--fix` / `--repair` 模式下）会创建迁移前快照，然后运行尽力而为的迁移步骤：旧 Matrix 状态迁移和旧加密状态准备。这两个步骤都不会致命；错误会被记录下来，启动会继续。在只读模式（不带 `--fix` 的 `openclaw doctor`）下，这项检查会被完全跳过。
  </Accordion>
  <Accordion title="8c. Device pairing and auth drift">
    Doctor 会在正常健康检查过程中检查设备配对状态，并报告：

    - 待处理的首次配对请求
    - 已配对设备待处理的角色或 scope 升级
    - 设备 ID 仍匹配但设备身份不再匹配已批准记录时的公钥不匹配修复
    - 已批准角色缺少活动 token 的已配对记录
    - scope 偏离已批准配对基线的已配对 token
    - 当前机器的本地缓存设备 token 条目早于 gateway 端 token 轮换，或携带过时的 scope 元数据

    Doctor 不会自动批准配对请求，也不会自动轮换设备 token。它会打印确切的后续步骤：

    - 使用 `openclaw devices list` 检查待处理请求
    - 使用 `openclaw devices approve <requestId>` 批准具体请求
    - 使用 `openclaw devices rotate --device <deviceId> --role <role>` 轮换新 token
    - 使用 `openclaw devices remove <deviceId>` 移除并重新批准过时记录

    这一区分了首次配对、待处理的角色/scope 升级，以及过时的 token/设备身份漂移，解决了常见的“已配对但仍提示需要配对”问题。

  </Accordion>
  <Accordion title="9. Security warnings">
    Doctor 仅在发现警告时才会发出 Security note，例如某个 provider 对没有 allowlist 的私信开放，或策略配置存在危险。请使用 `openclaw security audit` 获取完整的安全清单。
  </Accordion>
  <Accordion title="10. systemd linger（Linux）">
    如果作为 systemd 用户服务运行，doctor 会确保启用 lingering，以便 gateway 在退出登录后仍保持存活。
  </Accordion>
  <Accordion title="11. Workspace status（skills、plugins 和 TaskFlows）">
    Doctor 会为默认 agent 打印问题和操作，而不是健康状态清单：

    - **Skills**：列出已允许但不可用的 skill 名称；使用 `openclaw skills check` 查看要求详情和完整计数。
    - **Plugins**：仅报告出错的插件 ID；使用 `openclaw plugins list` 查看已加载、已导入、已禁用和捆绑插件清单。
    - **Plugin compatibility warnings**：标记与当前运行时存在兼容性问题的插件。
    - **Plugin diagnostics**：显示插件注册表发出的所有加载时警告或错误。
    - **TaskFlow recovery**：显示需要手动检查或取消的可疑托管 TaskFlows。
    - **Claude CLI**：仅报告二进制文件、身份验证、profile、工作区或项目目录问题；不会显示健康探测详情。

  </Accordion>
  <Accordion title="11b. Bootstrap 文件大小">
    Doctor 会检查工作区 bootstrap 文件（例如 `AGENTS.md`、`CLAUDE.md` 或其他注入的上下文文件）是否接近或超出配置的字符预算。它会按文件报告原始字符数与注入后字符数、截断百分比、截断原因（`max/file` 或 `max/total`），以及注入字符总数占总预算的比例。当文件被截断或接近上限时，doctor 会打印针对 `agents.defaults.bootstrapMaxChars` 和 `agents.defaults.bootstrapTotalMaxChars` 的调优建议。
  </Accordion>
  <Accordion title="11c. Shell completion">
    Doctor 会检查当前 shell（zsh、bash、fish 或 PowerShell）是否已安装 Tab 补全：

    - 如果 shell profile 使用的是较慢的动态补全模式（`source <(openclaw completion ...)`），doctor 会将其升级为更快的缓存文件变体。
    - 如果 profile 中已配置补全但缓存文件缺失，doctor 会自动重新生成缓存。
    - 如果完全没有配置补全，doctor 会提示安装它（仅交互模式；`--non-interactive` 会跳过）。

    运行 `openclaw completion --write-state` 可手动重新生成缓存。

  </Accordion>
  <Accordion title="11d. Stale channel plugin cleanup">
    当 `openclaw doctor --fix` 移除缺失的频道插件时，它还会移除引用该插件的悬空频道范围配置：`channels.<id>` 条目、指定该频道的 heartbeat 目标，以及 `agents.*.models["<channel>/*"]` 覆盖。这可以防止频道运行时已消失但配置仍要求 gateway 绑定该频道而导致的 Gateway 启动循环。
  </Accordion>
  <Accordion title="12. Gateway auth checks（local token）">
    Doctor 会检查本地 gateway token 身份验证是否就绪。

    - 如果 token 模式需要 token 且不存在 token 来源，doctor 会提供生成 token 的选项。
    - 如果 `gateway.auth.token` 由 SecretRef 管理但不可用，doctor 会发出警告且不会用明文覆盖它。
    - `openclaw doctor --generate-gateway-token` 仅在没有配置 token SecretRef 时强制生成。

  </Accordion>
  <Accordion title="12b. 只读、感知 SecretRef 的修复">
    某些修复流程需要在不削弱运行时 fail-fast 行为的前提下检查已配置的凭据。

    - `openclaw doctor --fix` 使用与 status 系列命令相同的只读 SecretRef 摘要模型来执行目标配置修复。
    - 示例：Telegram `allowFrom` / `groupAllowFrom` 的 `@username` 修复会在可用时尝试使用已配置的 bot 凭据。
    - 如果 Telegram bot token 通过 SecretRef 配置但在当前命令路径中不可用，doctor 会报告该凭据已配置但不可用，并跳过自动解析，而不是崩溃或错误地报告 token 缺失。

  </Accordion>
  <Accordion title="13. Gateway 健康检查 + 重启">
    Doctor 会运行健康检查，并在 gateway 看起来不健康时提供重启它的选项。
  </Accordion>
  <Accordion title="13b. Memory search readiness">
    Doctor 会检查已配置的 memory search embedding provider 是否已为默认 agent 就绪。具体行为取决于配置的 provider：

    - **Explicit local provider**：检查本地模型文件或已识别的远程/可下载模型 URL。如果缺失，会建议切换到远程 provider。
    - **Explicit remote provider**（`openai`、`voyage` 等）：验证环境或 auth store 中是否存在 API key。如果缺失，会打印可操作的修复提示。
    - **Legacy auto provider**：将 `memorySearch.provider: "auto"` 视为 OpenAI，检查 OpenAI 是否就绪，并由 `doctor --fix` 将其重写为 `provider: "openai"`。

    当存在缓存的 gateway 探测结果时（即检查时 gateway 是健康的），doctor 会将其结果与 CLI 可见配置交叉引用，并指出任何差异。Doctor 不会在默认路径上发起新的 embedding ping；如需实时 provider 检查，请使用深度 memory 状态命令。

    使用 `openclaw memory status --deep` 可在运行时验证 embedding 就绪性。

  </Accordion>
  <Accordion title="14. 频道状态警告">
    如果 gateway 健康，doctor 会运行频道状态探测并报告带有建议修复的警告。
  </Accordion>
  <Accordion title="15. Supervisor config audit + repair">
    Doctor 会检查已安装的 supervisor 配置（launchd/systemd/schtasks）是否缺少或使用过时的默认值（例如 systemd network-online 依赖和重启延迟）。发现不匹配时，它会建议更新，并可以将服务文件/任务重写为当前默认值。

    说明：

    - `openclaw doctor` 在重写 supervisor 配置前会询问。
    - `openclaw doctor --yes` 接受默认修复提示。
    - `openclaw doctor --fix` 无提示应用建议的修复（`--repair` 是别名）。
    - `openclaw doctor --fix --force` 覆盖自定义 supervisor 配置。
    - `OPENCLAW_SERVICE_REPAIR_POLICY=external` 让 doctor 对 gateway 服务生命周期保持只读。它仍会报告服务健康状态并运行非服务修复，但会跳过服务安装/启动/重启/bootstrap、supervisor 配置重写和旧服务清理，因为外部 supervisor 负责该生命周期。
    - 在 macOS 上，同标签的系统 LaunchDaemon 会阻止用户 LaunchAgent 的安装、启动、重启和 bootstrap 修复。Doctor 会报告系统所有者并停止服务恢复；`--force` 不会绕过此所有权边界。请参阅 [Existing system LaunchDaemons](/gateway#existing-system-launchdaemons)。
    - 在 Linux 上，当匹配的 systemd gateway unit 处于活动状态时，doctor 不会重写 command/entrypoint 元数据。在重复服务扫描期间，它还会忽略处于非活动状态的非旧版额外 gateway 类 unit，以避免伴随服务文件产生清理噪声。
    - 如果 token 身份验证需要 token 且 `gateway.auth.token` 由 SecretRef 管理，doctor 服务安装/修复会验证 SecretRef，但不会将解析出的明文 token 值持久化到 supervisor 服务环境元数据中。
    - Doctor 会检测由托管 `.env`/SecretRef 支持的服务环境值，这些值曾被旧版 LaunchAgent、systemd 或 Windows Scheduled Task 安装内联嵌入，并重写服务元数据，使这些值从运行时来源加载，而不是从 supervisor 定义中加载。
    - Doctor 会检测服务命令是否在 `gateway.port` 更改后仍固定使用旧的 `--port`，并将服务元数据重写为当前端口。
    - 如果 token 身份验证需要 token 且配置的 token SecretRef 未解析，doctor 会阻止安装/修复路径，并提供可操作的指导。
    - 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`，但未设置 `gateway.auth.mode`，doctor 会阻止安装/修复，直到明确设置 mode。
    - 对于 Linux 用户 systemd unit，doctor 的 token 漂移检查会在比较服务身份验证元数据时同时包括 `Environment=` 和 `EnvironmentFile=` 来源。
    - 当配置由较新版本写入时，Doctor 服务修复会拒绝从较旧的 OpenClaw 二进制文件重写、停止或重启 gateway 服务。请参阅 [Gateway troubleshooting](/gateway/troubleshooting#split-brain-installs-and-newer-config-guard)。
    - 你始终可以通过 `openclaw gateway install --force` 强制进行完整重写。

  </Accordion>
  <Accordion title="16. Gateway 运行时 + 端口诊断">
    Doctor 会检查服务运行时（PID、上次退出状态），并在服务已安装但实际上未运行时发出警告。它还会检查 gateway 端口（默认 `18789`）上的端口冲突，并报告可能原因（gateway 已在运行、SSH 隧道）。
  </Accordion>
  <Accordion title="17. Gateway runtime best practices">
    当 gateway 服务运行在 Bun 或版本管理的 Node 路径（`nvm`、`fnm`、`volta`、`asdf` 等）上时，Doctor 会发出警告。Bun 无法打开 OpenClaw 的 `node:sqlite` 状态存储，因此修复会将旧版 Bun 服务迁移到 Node。版本管理器路径可能在升级后失效，因为服务不会加载 shell 初始化配置。Doctor 会在可用时提供迁移到系统 Node 安装的选项（Homebrew/apt/choco）。

    新安装或修复的 macOS LaunchAgents 会使用规范的系统 PATH（`/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`），而不是复制交互式 shell PATH，因此 Homebrew 管理的系统二进制文件仍可用，同时 Volta、asdf、fnm、pnpm 和其他版本管理器目录不会改变 Node 子进程的解析结果。Linux 服务仍会保留明确的环境根目录（`NVM_DIR`、`FNM_DIR`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`BUN_INSTALL`、`PNPM_HOME`）和稳定的用户 bin 目录，但只有在磁盘上存在这些目录时，推测出的版本管理器回退目录才会被写入服务 PATH。

  </Accordion>
  <Accordion title="18. 配置写入 + 向导元数据">
    Doctor 会持久化任何配置更改，并标记向导元数据以记录这次 doctor 运行。
  </Accordion>
  <Accordion title="19. 工作区提示（备份 + 记忆系统）">
    当缺少工作区记忆系统时，doctor 会建议使用它；如果工作区还不在 git 下，则会打印备份提示。

    有关工作区结构和 git 备份的完整指南（推荐使用私有 GitHub 或 GitLab），请参见 [/concepts/agent-workspace](/concepts/agent-workspace)。

  </Accordion>
</AccordionGroup>

## 相关

- [网关运行手册](/gateway)
- [网关故障排查](/gateway/troubleshooting)
