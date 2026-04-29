---
summary: "Doctor 命令：健康检查、配置迁移和修复步骤"
read_when:
  - 添加或修改 doctor 迁移
  - 引入破坏性的配置变更
title: "Doctor"
sidebarTitle: "Doctor"
---

`openclaw doctor` 是 OpenClaw 的修复 + 迁移工具。它会修复过时的配置/状态，检查健康状况，并提供可执行的修复步骤。

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

    在不提示的情况下接受默认值（如适用，包括重启/服务/沙箱修复步骤）。

  </Tab>
  <Tab title="--repair">
    ```bash
    openclaw doctor --repair
    ```

    在不提示的情况下应用建议的修复（安全范围内的修复 + 重启）。

  </Tab>
  <Tab title="--repair --force">
    ```bash
    openclaw doctor --repair --force
    ```

    也应用激进修复（覆盖自定义的 supervisor 配置）。

  </Tab>
  <Tab title="--non-interactive">
    ```bash
    openclaw doctor --non-interactive
    ```

    以无提示方式运行，并且只应用安全迁移（配置规范化 + 磁盘状态移动）。跳过需要人工确认的重启/服务/沙箱操作。检测到旧状态迁移时会自动运行。

  </Tab>
  <Tab title="--deep">
    ```bash
    openclaw doctor --deep
    ```

    扫描系统服务以查找额外的 gateway 安装（launchd/systemd/schtasks）。

  </Tab>
</Tabs>

如果你想在写入前先查看变更，请先打开配置文件：

```bash
cat ~/.openclaw/openclaw.json
```

## 它做什么（摘要）

<AccordionGroup>
  <Accordion title="健康、UI 和更新">
    - 可选的 git 安装预检更新（仅交互模式）。
    - UI 协议新鲜度检查（当协议 schema 更新时会重建 Control UI）。
    - 健康检查 + 重启提示。
    - Skills 状态摘要（符合条件/缺失/被阻止）和插件状态。

  </Accordion>
  <Accordion title="配置和迁移">
    - 对旧值进行配置规范化。
    - 将旧的扁平 `talk.*` 字段迁移到 `talk.provider` + `talk.providers.<provider>`。
    - 浏览器迁移检查：旧版 Chrome 扩展配置和 Chrome MCP 就绪状态。
    - OpenCode provider 覆盖警告（`models.providers.opencode` / `models.providers.opencode-go`）。
    - Codex OAuth 覆盖警告（`models.providers.openai-codex`）。
    - OpenAI Codex OAuth 配置的 OAuth TLS 先决条件检查。
    - 旧的磁盘状态迁移（sessions/agent 目录/WhatsApp 认证）。
    - 旧插件 manifest contract 键迁移（`speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders`、`webSearchProviders` → `contracts`）。
    - 旧 cron 存储迁移（`jobId`、`schedule.cron`、顶层 delivery/payload 字段、payload `provider`、简单的 `notify: true` webhook 回退任务）。
    - 旧 agent 运行时策略迁移到 `agents.defaults.agentRuntime` 和 `agents.list[].agentRuntime`。
    - 当插件启用时清理过时的插件配置；当 `plugins.enabled=false` 时，过时的插件引用会被视为无害的隔离配置并保留。

  </Accordion>
  <Accordion title="状态和完整性">
    - 会话锁文件检查和过期锁清理。
    - 修复由受影响的 2026.4.24 构建创建的重复 prompt-rewrite 分支的会话转写。
    - 状态完整性和权限检查（sessions、transcripts、state 目录）。
    - 本地运行时的配置文件权限检查（chmod 600）。
    - 模型认证健康：检查 OAuth 过期情况，可刷新即将过期的 token，并报告认证配置文件的冷却/禁用状态。
    - 额外工作区目录检测（`~/openclaw`）。

  </Accordion>
  <Accordion title="Gateway、服务和 supervisor">
    - 启用沙箱时修复沙箱镜像。
    - 旧服务迁移和额外 gateway 检测。
    - Matrix 频道旧状态迁移（在 `--fix` / `--repair` 模式下）。
    - Gateway 运行时检查（服务已安装但未运行；缓存的 launchd 标签）。
    - 频道状态警告（从运行中的 gateway 探测）。
    - supervisor 配置审计（launchd/systemd/schtasks）并可选择修复。
    - Gateway 服务的内嵌代理环境清理：移除安装或更新时捕获到的 shell `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` 值。
    - Gateway 运行时最佳实践检查（Node vs Bun、版本管理器路径）。
    - Gateway 端口冲突诊断（默认 `18789`）。

  </Accordion>
  <Accordion title="认证、安全和配对">
    - 开放 DM 策略的安全警告。
    - 本地 token 模式的 Gateway 认证检查（当不存在 token 来源时提供生成 token；不会覆盖 token SecretRef 配置）。
    - 设备配对问题检测（待处理的首次配对请求、待处理的角色/范围升级、陈旧的本地 device-token 缓存漂移，以及已配对记录的认证漂移）。

  </Accordion>
  <Accordion title="工作区和 shell">
    - Linux 上的 systemd linger 检查。
    - 工作区 bootstrap 文件大小检查（上下文文件的截断/接近上限警告）。
    - shell 补全状态检查和自动安装/升级。
    - 记忆搜索 embedding provider 就绪检查（本地模型、远程 API key 或 QMD 二进制文件）。
    - 源码安装检查（pnpm workspace 不匹配、缺失 UI assets、缺失 tsx 二进制）。
    - 写入更新后的配置 + 向导元数据。

  </Accordion>
</AccordionGroup>

## Dreams UI 回填和重置

Control UI 的 Dreams 场景包含 **Backfill**、**Reset** 和 **Clear Grounded** 操作，用于 grounded dreaming 工作流。这些操作使用 gateway doctor 风格的 RPC 方法，但它们**不属于** `openclaw doctor` CLI 的修复/迁移范畴。

它们的作用：

- **Backfill** 扫描当前工作区中的历史 `memory/YYYY-MM-DD.md` 文件，运行 grounded REM 日记流程，并将可逆的回填条目写入 `DREAMS.md`。
- **Reset** 只从 `DREAMS.md` 中移除那些标记为回填的日记条目。
- **Clear Grounded** 只移除那些来自历史回放、且尚未积累实时回忆或日常支持的、已暂存的 grounded-only 短期条目。

它们**不会**自行执行的操作：

- 不会编辑 `MEMORY.md`
- 不会运行完整的 doctor 迁移
- 不会自动把 grounded 候选项暂存到实时短期晋升存储中，除非你先显式运行 staged CLI 路径

如果你希望 grounded 历史回放影响正常的深度晋升通道，请改用 CLI 流程：

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

这会把 grounded 持久候选项暂存到短期 dreaming 存储中，同时将 `DREAMS.md` 保持为审阅界面。

## 详细行为和原理

<AccordionGroup>
  <Accordion title="0. 可选更新（git 安装）">
    如果这是一个 git checkout，并且 doctor 以交互方式运行，它会在执行 doctor 前提供更新（fetch/rebase/build）的选项。
  </Accordion>
  <Accordion title="1. 配置规范化">
    如果配置包含旧式值结构（例如没有按频道覆盖的 `messages.ackReaction`），doctor 会将其规范化为当前 schema。

    这也包括旧版 Talk 扁平字段。当前公开的 Talk 配置是 `talk.provider` + `talk.providers.<provider>`。Doctor 会把旧的 `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` / `talk.apiKey` 结构重写到 provider map 中。

  </Accordion>
  <Accordion title="2. 旧配置键迁移">
    当配置包含已弃用键时，其他命令会拒绝运行，并要求你执行 `openclaw doctor`。

    Doctor 将会：

    - 说明找到了哪些旧键。
    - 展示它应用的迁移。
    - 使用更新后的 schema 重写 `~/.openclaw/openclaw.json`。

    当 Gateway 检测到旧配置格式时，也会在启动时自动运行 doctor 迁移，因此过时配置会在没有人工干预的情况下得到修复。Cron 任务存储迁移由 `openclaw doctor --fix` 处理。

    当前迁移：

    - `routing.allowFrom` → `channels.whatsapp.allowFrom`
    - `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
    - `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
    - `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
    - `routing.queue` → `messages.queue`
    - `routing.bindings` → 顶层 `bindings`
    - `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
    - 旧的 `talk.voiceId`/`talk.voiceAliases`/`talk.modelId`/`talk.outputFormat`/`talk.apiKey` → `talk.provider` + `talk.providers.<provider>`
    - `routing.agentToAgent` → `tools.agentToAgent`
    - `routing.transcribeAudio` → `tools.media.audio.models`
    - `messages.tts.<provider>`（`openai`/`elevenlabs`/`microsoft`/`edge`）→ `messages.tts.providers.<provider>`
    - `messages.tts.provider: "edge"` 和 `messages.tts.providers.edge` → `messages.tts.provider: "microsoft"` 和 `messages.tts.providers.microsoft`
    - `channels.discord.voice.tts.<provider>`（`openai`/`elevenlabs`/`microsoft`/`edge`）→ `channels.discord.voice.tts.providers.<provider>`
    - `channels.discord.accounts.<id>.voice.tts.<provider>`（`openai`/`elevenlabs`/`microsoft`/`edge`）→ `channels.discord.accounts.<id>.voice.tts.providers.<provider>`
    - `plugins.entries.voice-call.config.tts.<provider>`（`openai`/`elevenlabs`/`microsoft`/`edge`）→ `plugins.entries.voice-call.config.tts.providers.<provider>`
    - `plugins.entries.voice-call.config.tts.provider: "edge"` 和 `plugins.entries.voice-call.config.tts.providers.edge` → `provider: "microsoft"` 和 `providers.microsoft`
    - `plugins.entries.voice-call.config.provider: "log"` → `"mock"`
    - `plugins.entries.voice-call.config.twilio.from` → `plugins.entries.voice-call.config.fromNumber`
    - `plugins.entries.voice-call.config.streaming.sttProvider` → `plugins.entries.voice-call.config.streaming.provider`
    - `plugins.entries.voice-call.config.streaming.openaiApiKey|sttModel|silenceDurationMs|vadThreshold` → `plugins.entries.voice-call.config.streaming.providers.openai.*`
    - `bindings[].match.accountID` → `bindings[].match.accountId`
    - 对于带命名 `accounts` 但仍保留单账号顶层频道值的频道，将这些账号范围值移动到该频道所选中的晋升账号中（大多数频道为 `accounts.default`；Matrix 可以保留现有匹配的命名/默认目标）
    - `identity` → `agents.list[].identity`
    - `agent.*` → `agents.defaults` + `tools.*`（tools/elevated/exec/sandbox/subagents）
    - `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks` → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
    - 移除 `agents.defaults.llm`；对较慢的 provider/model 超时请使用 `models.providers.<id>.timeoutSeconds`
    - `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
    - `browser.profiles.*.driver: "extension"` → `"existing-session"`
    - 移除 `browser.relayBindHost`（旧的扩展 relay 设置）
    - 旧的 `models.providers.*.api: "openai"` → `"openai-completions"`（Gateway 启动时也会跳过 `api` 被设置为未来或未知枚举值的 provider，而不是直接失败）

    Doctor 警告还包括多账号频道的默认账号指引：

    - 如果配置了两个或更多 `channels.<channel>.accounts` 条目，但没有 `channels.<channel>.defaultAccount` 或 `accounts.default`，doctor 会警告回退路由可能选择到意外的账号。
    - 如果 `channels.<channel>.defaultAccount` 被设置为未知的账号 ID，doctor 会警告并列出已配置的账号 ID。

  </Accordion>
  <Accordion title="2b. OpenCode provider 覆盖">
    如果你手动添加了 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`，它会覆盖来自 `@mariozechner/pi-ai` 的内置 OpenCode 目录。这可能会把模型路由到错误的 API，或把费用置零。Doctor 会发出警告，以便你移除该覆盖并恢复每个模型的 API 路由 + 费用。
  </Accordion>
  <Accordion title="2c. 浏览器迁移和 Chrome MCP 就绪">
    如果你的浏览器配置仍指向已移除的 Chrome 扩展路径，doctor 会将其规范化为当前的主机本地 Chrome MCP attach 模型：

    - `browser.profiles.*.driver: "extension"` 变为 `"existing-session"`
    - `browser.relayBindHost` 被移除

    当你使用 `defaultProfile: "user"` 或配置了 `existing-session` 个人资料时，doctor 还会审计主机本地的 Chrome MCP 路径：

    - 检查默认自动连接配置下，Google Chrome 是否安装在同一台主机上
    - 检查检测到的 Chrome 版本，并在低于 Chrome 144 时发出警告
    - 提醒你在浏览器 inspect 页面中启用远程调试（例如 `chrome://inspect/#remote-debugging`、`brave://inspect/#remote-debugging` 或 `edge://inspect/#remote-debugging`）

    Doctor 无法替你开启 Chrome 端设置。主机本地 Chrome MCP 仍然需要：

    - gateway/node 主机上安装 Chromium 系浏览器 144+
    - 浏览器在本地运行
    - 在该浏览器中启用远程调试
    - 在浏览器中批准首次 attach 的授权提示

    这里的就绪检查只针对本地 attach 先决条件。Existing-session 仍保留当前 Chrome MCP 路由限制；像 `responsebody`、PDF 导出、下载拦截和批处理操作这类高级路由仍然需要受管浏览器或原始 CDP 个人资料。

    此检查**不**适用于 Docker、sandbox、remote-browser 或其他无头流程。这些流程继续使用原始 CDP。

  </Accordion>
  <Accordion title="2d. OAuth TLS 先决条件">
    当配置了 OpenAI Codex OAuth 配置文件时，doctor 会探测 OpenAI 授权端点，以验证本地 Node/OpenSSL TLS 栈能否验证证书链。如果探测因证书错误失败（例如 `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`、证书过期或自签名证书），doctor 会打印平台特定的修复指导。在使用 Homebrew Node 的 macOS 上，通常的修复方式是 `brew postinstall ca-certificates`。使用 `--deep` 时，即使 gateway 健康，探测也会运行。
  </Accordion>
  <Accordion title="2e. Codex OAuth provider 覆盖">
    如果你之前在 `models.providers.openai-codex` 下添加了旧的 OpenAI 传输设置，它们可能会遮蔽新版发布自动使用的内置 Codex OAuth provider 路径。Doctor 在看到这些旧传输设置与 Codex OAuth 同时存在时会发出警告，方便你移除或重写过时的传输覆盖，并恢复内置的路由/回退行为。自定义代理和仅头部覆盖仍受支持，不会触发此警告。
  </Accordion>
  <Accordion title="2f. Codex 插件路由警告">
    当启用捆绑的 Codex 插件时，doctor 还会检查 `openai-codex/*` 的主模型引用是否仍通过默认 PI runner 解析。这个组合在你希望通过 PI 使用 Codex OAuth/订阅认证时是有效的，但很容易与原生 Codex app-server harness 混淆。Doctor 会发出警告并指向明确的 app-server 形式：`openai/*` 加上 `agentRuntime.id: "codex"` 或 `OPENCLAW_AGENT_RUNTIME=codex`。

    Doctor 不会自动修复这一点，因为两种路由都有效：

    - `openai-codex/*` + PI 表示“通过正常的 OpenClaw runner 使用 Codex OAuth/订阅认证。”
    - `openai/*` + `runtime: "codex"` 表示“通过原生 Codex app-server 运行嵌入式 turn。”
    - `/codex ...` 表示“从聊天中控制或绑定一个原生 Codex 对话。”
    - `/acp ...` 或 `runtime: "acp"` 表示“使用外部 ACP/acpx 适配器。”

    如果出现该警告，请选择你原本意图的路由并手动编辑配置。当 PI Codex OAuth 是有意为之时，请保持该警告原样。

  </Accordion>
  <Accordion title="3. 旧状态迁移（磁盘布局）">
    Doctor 可以将旧的磁盘布局迁移到当前结构：

    - Sessions 存储 + 转写：
      - 从 `~/.openclaw/sessions/` 到 `~/.openclaw/agents/<agentId>/sessions/`
    - Agent 目录：
      - 从 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`
    - WhatsApp 认证状态（Baileys）：
      - 从旧的 `~/.openclaw/credentials/*.json`（`oauth.json` 除外）
      - 到 `~/.openclaw/credentials/whatsapp/<accountId>/...`（默认 account id：`default`）

    这些迁移尽力而为且幂等；当留下任何旧文件夹作为备份时，doctor 会输出警告。Gateway/CLI 也会在启动时自动迁移旧的 sessions + agent 目录，因此历史/认证/模型会落到按 agent 划分的路径中，而无需手动运行 doctor。WhatsApp 认证有意只通过 `openclaw doctor` 迁移。Talk provider/provider-map 规范化现在按结构相等比较，因此仅键顺序不同的差异不再触发重复的无操作 `doctor --fix` 变更。

  </Accordion>
  <Accordion title="3a. 旧插件 manifest 迁移">
    Doctor 会扫描所有已安装插件的 manifest，查找已弃用的顶层能力键（`speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders`、`webSearchProviders`）。找到后，它会尝试将它们移动到 `contracts` 对象中，并原地重写 manifest 文件。此迁移是幂等的；如果 `contracts` 键已经包含相同的值，则旧键会被移除而不会重复数据。
  </Accordion>
  <Accordion title="3b. 旧 cron 存储迁移">
    Doctor 还会检查 cron 任务存储（默认 `~/.openclaw/cron/jobs.json`，或在覆盖时使用 `cron.store`）中 scheduler 仍为兼容性接受的旧任务结构。

    当前 cron 清理包括：

    - `jobId` → `id`
    - `schedule.cron` → `schedule.expr`
    - 顶层 payload 字段（`message`、`model`、`thinking`、...）→ `payload`
    - 顶层 delivery 字段（`deliver`、`channel`、`to`、`provider`、...）→ `delivery`
    - payload `provider` delivery 别名 → 显式 `delivery.channel`
    - 简单的旧式 `notify: true` webhook 回退任务 → 显式 `delivery.mode="webhook"` 且 `delivery.to=cron.webhook`

    Doctor 只会在不改变行为的前提下自动迁移 `notify: true` 任务。如果某个任务把旧式 notify 回退与现有的非 webhook delivery 模式结合在一起，doctor 会警告并保留该任务供人工审查。

  </Accordion>
  <Accordion title="3c. 会话锁清理">
    Doctor 会扫描每个 agent 的会话目录，查找过期的写锁文件——即会话异常退出后遗留的文件。对于找到的每个锁文件，它会报告：路径、PID、该 PID 是否仍存活、锁的年龄，以及它是否被视为过期（PID 已死或超过 30 分钟）。在 `--fix` / `--repair` 模式下，它会自动移除过期锁文件；否则会打印提示并要求你使用 `--fix` 重新运行。
  </Accordion>
  <Accordion title="3d. 会话转写分支修复">
    Doctor 会扫描 agent 会话 JSONL 文件，查找由 2026.4.24 prompt transcript rewrite bug 造成的重复分支结构：一个带有 OpenClaw 内部运行时上下文的已放弃 user turn，以及一个包含相同可见用户提示的活动同级分支。在 `--fix` / `--repair` 模式下，doctor 会在原文件旁边为每个受影响文件创建备份，并将转写重写为活动分支，这样 gateway 历史和 memory 读取器就不再会看到重复 turn。
  </Accordion>
  <Accordion title="4. 状态完整性检查（会话持久化、路由和安全）">
    状态目录是运行中的脑干。如果它消失了，你会丢失会话、凭据、日志和配置（除非你在别处有备份）。

    Doctor 会检查：

    - **状态目录缺失**：警告灾难性的状态丢失，提示重新创建目录，并提醒它无法恢复缺失数据。
    - **状态目录权限**：验证可写性；提供修复权限的选项（如果检测到所有者/组不匹配，还会给出 `chown` 提示）。
    - **macOS 云同步状态目录**：当状态解析到 iCloud Drive（`~/Library/Mobile Documents/com~apple~CloudDocs/...`）或 `~/Library/CloudStorage/...` 下时发出警告，因为同步支持的路径可能导致更慢的 I/O 以及锁/同步竞争。
    - **Linux SD 或 eMMC 状态目录**：当状态解析到 `mmcblk*` 挂载源时发出警告，因为基于 SD 或 eMMC 的随机 I/O 在会话和凭据写入场景下可能更慢且磨损更快。
    - **会话目录缺失**：`sessions/` 和 session 存储目录对于持久化历史并避免 `ENOENT` 崩溃是必需的。
    - **转写不匹配**：当最近的会话条目缺少转写文件时发出警告。
    - **主会话“1 行 JSONL”**：当主转写只有一行时标记（历史没有累积）。
    - **多个状态目录**：当 home 目录中存在多个 `~/.openclaw` 文件夹，或者 `OPENCLAW_STATE_DIR` 指向其他位置时发出警告（历史可能在安装之间分裂）。
    - **远程模式提醒**：如果 `gateway.mode=remote`，doctor 会提醒你在远程主机上运行它（状态存放在那里）。
    - **配置文件权限**：如果 `~/.openclaw/openclaw.json` 对组/所有人可读，会发出警告并提供收紧到 `600` 的选项。

  </Accordion>
  <Accordion title="5. 模型认证健康（OAuth 过期）">
    Doctor 会检查认证存储中的 OAuth 配置文件，警告 token 即将过期/已过期的情况，并在安全时刷新它们。如果 Anthropic OAuth/token 配置文件过期，它会建议使用 Anthropic API key 或 Anthropic setup-token 路径。刷新提示只会在交互式运行（TTY）时出现；`--non-interactive` 会跳过刷新尝试。

    当 OAuth 刷新永久失败时（例如 `refresh_token_reused`、`invalid_grant`，或 provider 提示你重新登录），doctor 会报告需要重新认证，并打印要运行的确切 `openclaw models auth login --provider ...` 命令。

    Doctor 还会报告因以下原因而暂时不可用的认证配置文件：

    - 短期冷却（速率限制/超时/认证失败）
    - 长期禁用（计费/信用失败）

  </Accordion>
  <Accordion title="6. Hooks 模型验证">
    如果设置了 `hooks.gmail.model`，doctor 会根据目录和允许列表验证模型引用，并在无法解析或不被允许时发出警告。
  </Accordion>
  <Accordion title="7. 沙箱镜像修复">
    启用沙箱时，doctor 会检查 Docker 镜像，并在当前镜像缺失时提供构建或切换到旧名称的选项。
  </Accordion>
  <Accordion title="7b. 内置插件运行时依赖">
    Doctor 只会为当前配置中处于激活状态，或由其捆绑 manifest 默认启用的内置插件验证运行时依赖，例如 `plugins.entries.discord.enabled: true`、旧的 `channels.discord.enabled: true`，或默认启用的捆绑 provider。如果缺少任何依赖，doctor 会报告这些包，并在 `openclaw doctor --fix` / `openclaw doctor --repair` 模式下安装它们。外部插件仍然使用 `openclaw plugins install` / `openclaw plugins update`；doctor 不会为任意插件路径安装依赖。

    在 doctor 修复期间，捆绑运行时依赖的 npm 安装会在 TTY 会话中报告 spinner 进度，并在管道/无头输出中报告周期性的行进度。Gateway 和本地 CLI 也可以在导入捆绑插件之前按需修复当前激活的捆绑插件运行时依赖。这些安装被限定在插件运行时安装根目录内，禁用脚本执行，不写入 package lock，并由安装根锁保护，以避免并发的 CLI 或 Gateway 启动同时修改同一个 `node_modules` 树。

  </Accordion>
  <Accordion title="8. Gateway 服务迁移和清理提示">
    Doctor 会检测旧的 gateway 服务（launchd/systemd/schtasks），并提供移除它们并使用当前 gateway 端口安装 OpenClaw 服务的选项。它还可以扫描额外的、类似 gateway 的服务并打印清理提示。带有 profile 名称的 OpenClaw gateway 服务被视为一等公民，不会被标记为“额外”。

    在 Linux 上，如果用户级 gateway 服务缺失但系统级 OpenClaw gateway 服务存在，doctor 不会自动安装第二个用户级服务。请使用 `openclaw gateway status --deep` 或 `openclaw doctor --deep` 检查，然后移除重复项，或者当系统 supervisor 承担 gateway 生命周期时设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。

  </Accordion>
  <Accordion title="8b. 启动时 Matrix 迁移">
    当 Matrix 频道账号存在待处理或可操作的旧状态迁移时，doctor（在 `--fix` / `--repair` 模式下）会创建迁移前快照，然后运行尽力而为的迁移步骤：旧 Matrix 状态迁移和旧加密状态准备。这两个步骤都不会致命；错误会被记录下来，启动会继续。在只读模式（不带 `--fix` 的 `openclaw doctor`）下，这项检查会被完全跳过。
  </Accordion>
  <Accordion title="8c. 设备配对和认证漂移">
    Doctor 现在会将设备配对状态作为正常健康检查的一部分。

    它报告的内容：

    - 待处理的首次配对请求
    - 已配对设备的待处理角色升级
    - 已配对设备的待处理范围升级
    - 公钥不匹配修复：设备 id 仍然匹配，但设备身份已不再与已批准记录匹配
    - 已配对记录缺少已批准角色的活动 token
    - 已配对 token 的范围漂移出了已批准的配对基线
    - 当前机器的本地缓存 device-token 条目早于 gateway 端的 token 轮换，或携带过时的范围元数据

    Doctor 不会自动批准配对请求或自动轮换设备 token。它会直接打印下一步操作：

    - 使用 `openclaw devices list` 检查待处理请求
    - 使用 `openclaw devices approve <requestId>` 批准具体请求
    - 使用 `openclaw devices rotate --device <deviceId> --role <role>` 轮换新 token
    - 使用 `openclaw devices remove <deviceId>` 移除并重新批准过时记录

    这解决了常见的“已经配对但仍然提示需要配对”的问题：doctor 现在会区分首次配对、待处理的角色/范围升级，以及过时 token/设备身份漂移。

  </Accordion>
  <Accordion title="9. 安全警告">
    当 provider 可以在没有允许列表的情况下接受 DM，或者策略配置方式存在危险时，doctor 会发出警告。
  </Accordion>
  <Accordion title="10. systemd linger（Linux）">
    如果作为 systemd 用户服务运行，doctor 会确保启用 lingering，以便 gateway 在退出登录后仍保持存活。
  </Accordion>
  <Accordion title="11. 工作区状态（skills、插件和旧目录）">
    Doctor 会打印默认 agent 的工作区状态摘要：

    - **Skills 状态**：统计符合条件、缺少依赖、被 allowlist 阻止的 skills。
    - **旧工作区目录**：当 `~/openclaw` 或其他旧工作区目录与当前工作区并存时发出警告。
    - **插件状态**：统计启用/禁用/出错的插件；列出任何错误的插件 ID；报告 bundle 插件能力。
    - **插件兼容性警告**：标记与当前运行时有兼容性问题的插件。
    - **插件诊断**：显示插件注册表在加载时发出的任何警告或错误。

  </Accordion>
  <Accordion title="11b. Bootstrap 文件大小">
    Doctor 会检查工作区 bootstrap 文件（例如 `AGENTS.md`、`CLAUDE.md` 或其他注入的上下文文件）是否接近或超出配置的字符预算。它会按文件报告原始字符数与注入后字符数、截断百分比、截断原因（`max/file` 或 `max/total`），以及注入字符总数占总预算的比例。当文件被截断或接近上限时，doctor 会打印针对 `agents.defaults.bootstrapMaxChars` 和 `agents.defaults.bootstrapTotalMaxChars` 的调优建议。
  </Accordion>
  <Accordion title="11d. 过时频道插件清理">
    当 `openclaw doctor --fix` 移除一个缺失的频道插件时，它也会移除引用该插件的悬挂频道范围配置：`channels.<id>` 条目、命名该频道的 heartbeat 目标，以及 `agents.*.models["<channel>/*"]` 覆盖。这可以防止 gateway 启动循环：频道运行时已消失，但配置仍要求 gateway 绑定它。
  </Accordion>
  <Accordion title="11c. shell 补全">
    Doctor 会检查当前 shell（zsh、bash、fish 或 PowerShell）是否安装了 tab 补全：

    - 如果 shell profile 使用的是较慢的动态补全模式（`source <(openclaw completion ...)`），doctor 会将其升级为更快的缓存文件变体。
    - 如果 profile 中已配置补全但缓存文件缺失，doctor 会自动重新生成缓存。
    - 如果完全没有配置补全，doctor 会提示安装它（仅交互模式；`--non-interactive` 会跳过）。

    运行 `openclaw completion --write-state` 可手动重新生成缓存。

  </Accordion>
  <Accordion title="12. Gateway 认证检查（本地 token）">
    Doctor 会检查本地 gateway token 认证就绪情况。

    - 如果 token 模式需要 token 且不存在 token 来源，doctor 会提供生成 token 的选项。
    - 如果 `gateway.auth.token` 由 SecretRef 管理但不可用，doctor 会发出警告且不会用明文覆盖它。
    - `openclaw doctor --generate-gateway-token` 仅在没有配置 token SecretRef 时强制生成。

  </Accordion>
  <Accordion title="12b. 只读、感知 SecretRef 的修复">
    某些修复流程需要在不削弱运行时 fail-fast 行为的前提下检查已配置的凭据。

    - `openclaw doctor --fix` 现在会使用与 status 系列命令相同的只读 SecretRef 摘要模型来进行有针对性的配置修复。
    - 例如：Telegram `allowFrom` / `groupAllowFrom` `@username` 修复会在可用时尝试使用已配置的 bot 凭据。
    - 如果 Telegram bot token 通过 SecretRef 配置但在当前命令路径中不可用，doctor 会报告该凭据“已配置但不可用”，并跳过自动解析，而不是崩溃或把 token 误报为缺失。

  </Accordion>
  <Accordion title="13. Gateway 健康检查 + 重启">
    Doctor 会运行健康检查，并在 gateway 看起来不健康时提供重启它的选项。
  </Accordion>
  <Accordion title="13b. 记忆搜索就绪性">
    Doctor 会检查为默认 agent 配置的记忆搜索 embedding provider 是否就绪。具体行为取决于配置的后端和 provider：

    - **QMD 后端**：探测 `qmd` 二进制是否可用且可启动。如果不可用，会打印修复指导，包括 npm 包和手动二进制路径选项。
    - **显式本地 provider**：检查本地模型文件或可识别的远程/可下载模型 URL。如果缺失，会建议切换到远程 provider。
    - **显式远程 provider**（`openai`、`voyage` 等）：验证环境变量或认证存储中是否存在 API key。如果缺失，会打印可执行的修复提示。
    - **自动 provider**：先检查本地模型可用性，然后按自动选择顺序尝试每个远程 provider。

    当存在缓存的 gateway 探测结果时（即检查时 gateway 是健康的），doctor 会将其结果与 CLI 可见配置交叉引用，并指出任何差异。Doctor 不会在默认路径上发起新的 embedding ping；如需实时 provider 检查，请使用深度 memory 状态命令。

    使用 `openclaw memory status --deep` 可在运行时验证 embedding 就绪性。

  </Accordion>
  <Accordion title="14. 频道状态警告">
    如果 gateway 健康，doctor 会运行频道状态探测并报告带有建议修复的警告。
  </Accordion>
  <Accordion title="15. supervisor 配置审计 + 修复">
    Doctor 会检查已安装的 supervisor 配置（launchd/systemd/schtasks）是否存在缺失或过时的默认值（例如 systemd 网络在线依赖和重启延迟）。当发现不匹配时，它会建议更新，并可以将服务文件/任务重写为当前默认值。

    说明：

    - `openclaw doctor` 会在重写 supervisor 配置前提示确认。
    - `openclaw doctor --yes` 会接受默认修复提示。
    - `openclaw doctor --repair` 会在不提示的情况下应用建议的修复。
    - `openclaw doctor --repair --force` 会覆盖自定义的 supervisor 配置。
    - `OPENCLAW_SERVICE_REPAIR_POLICY=external` 会让 doctor 对 gateway 服务生命周期保持只读。它仍会报告服务健康并运行非服务类修复，但会跳过服务安装/启动/重启/bootstrap、supervisor 配置重写以及旧服务清理，因为该生命周期由外部 supervisor 管理。
    - 在 Linux 上，当匹配的 systemd gateway unit 处于活动状态时，doctor 不会重写命令/入口点元数据。它还会在重复服务扫描中忽略非旧式、非活动的额外类似 gateway 单元，以免 companion service 文件造成清理噪音。
    - 如果 token 认证需要 token 且 `gateway.auth.token` 由 SecretRef 管理，doctor 的服务安装/修复会验证 SecretRef，但不会将解析后的明文 token 值持久化到 supervisor 服务环境元数据中。
    - Doctor 会检测由 Managed `.env`/SecretRef 支持的服务环境值，这些值在旧版 LaunchAgent、systemd 或 Windows Scheduled Task 安装中曾被内联嵌入，并会重写服务元数据，使这些值从运行时来源而不是 supervisor 定义中加载。
    - Doctor 会检测当服务命令在 `gateway.port` 变更后仍然固定旧的 `--port`，并将服务元数据重写为当前端口。
    - 如果 token 认证需要 token 且配置的 token SecretRef 未解析，doctor 会阻止安装/修复路径并给出可执行的指导。
    - 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未设置 `gateway.auth.mode`，doctor 会阻止安装/修复，直到显式设置 mode。
    - 对于 Linux user-systemd 单元，doctor 的 token 漂移检查现在在比较服务认证元数据时会同时包含 `Environment=` 和 `EnvironmentFile=` 来源。
    - 当配置文件最后由较新版本写入，而服务仍由较旧的 OpenClaw 二进制运行时，doctor 的服务修复会拒绝重写、停止或重启该 gateway 服务。参见 [Gateway 故障排查](/gateway/troubleshooting#split-brain-installs-and-newer-config-guard)。
    - 你始终可以通过 `openclaw gateway install --force` 强制执行完整重写。

  </Accordion>
  <Accordion title="16. Gateway 运行时 + 端口诊断">
    Doctor 会检查服务运行时（PID、上次退出状态），并在服务已安装但实际上未运行时发出警告。它还会检查 gateway 端口（默认 `18789`）上的端口冲突，并报告可能原因（gateway 已在运行、SSH 隧道）。
  </Accordion>
  <Accordion title="17. Gateway 运行时最佳实践">
    当 gateway 服务运行在 Bun 上或版本管理的 Node 路径（`nvm`、`fnm`、`volta`、`asdf` 等）上时，doctor 会发出警告。WhatsApp + Telegram 频道需要 Node，而版本管理器路径在升级后可能失效，因为服务不会加载你的 shell init。Doctor 会在可用时提供迁移到系统 Node 安装的选项（Homebrew/apt/choco）。

    新安装或修复的服务会保留显式环境根目录（`NVM_DIR`、`FNM_DIR`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`BUN_INSTALL`、`PNPM_HOME`）和稳定的 user-bin 目录，但猜测到的版本管理器回退目录只有在这些目录确实存在于磁盘上时才会写入服务 PATH。这使生成的 supervisor PATH 与 doctor 之后运行的相同最小 PATH 审计保持一致。

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
