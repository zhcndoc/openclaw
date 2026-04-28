---
summary: "Doctor 命令：健康检查、配置迁移和修复步骤"
read_when:
  - 添加或修改 doctor 迁移
  - 引入破坏性配置更改
title: "Doctor"
---

`openclaw doctor` 是 OpenClaw 的修复 + 迁移工具。它可修复过期的
配置/状态，检查健康状况，并提供可操作的修复步骤。

## 快速开始

```bash
openclaw doctor
```

### 无头 / 自动化

```bash
openclaw doctor --yes
```

接受默认选项而不提示（包括适用时的重启/服务/沙箱修复步骤）。

```bash
openclaw doctor --repair
```

应用推荐的修复而不提示（安全时执行修复 + 重启）。

```bash
openclaw doctor --repair --force
```

执行激进的修复（覆盖自定义的 supervisor 配置）。

```bash
openclaw doctor --non-interactive
```

无提示运行，仅应用安全的迁移（配置规范化 + 磁盘状态移动）。跳过需要人工确认的重启/服务/沙箱操作。检测到旧版状态迁移时自动运行。

```bash
openclaw doctor --deep
```

扫描系统服务以查找额外的网关安装（launchd/systemd/schtasks）。

如果您想在写入前查看更改，可以先打开配置文件：

```bash
cat ~/.openclaw/openclaw.json
```

## 它的功能（摘要）

<AccordionGroup>
  <Accordion title="健康、UI 和更新">
    - 可选的 git 安装预检更新（仅交互模式）。
    - UI 协议新鲜度检查（当协议 schema 更新时会重建 Control UI）。
    - 健康检查 + 重启提示。
    - Skills 状态摘要（可用/缺失/被阻止）以及插件状态。
  </Accordion>
  <Accordion title="配置和迁移">
    - 旧版值的配置规范化。
    - 将旧版扁平的 `talk.*` 字段迁移到 `talk.provider` + `talk.providers.<provider>`。
    - 浏览器迁移检查：旧版 Chrome 扩展配置以及 Chrome MCP 就绪性。
    - OpenCode provider 覆盖警告（`models.providers.opencode` / `models.providers.opencode-go`）。
    - Codex OAuth 遮蔽警告（`models.providers.openai-codex`）。
    - OpenAI Codex OAuth 配置文件的 OAuth TLS 先决条件检查。
    - 旧版磁盘状态迁移（sessions/agent 目录/WhatsApp 认证）。
    - 旧版插件 manifest 合同键迁移（`speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders`、`webSearchProviders` → `contracts`）。
    - 旧版 cron 存储迁移（`jobId`、`schedule.cron`、顶层 delivery/payload 字段、payload `provider`、简单的 `notify: true` webhook 回退任务）。
    - 旧版 agent 运行时策略迁移到 `agents.defaults.agentRuntime` 和 `agents.list[].agentRuntime`。
  </Accordion>
  <Accordion title="状态和完整性">
    - 会话锁文件检查与过期锁清理。
    - 针对受影响的 2026.4.24 构建所创建的重复 prompt-rewrite 分支进行会话转录修复。
    - 状态完整性与权限检查（sessions、transcripts、state 目录）。
    - 本地运行时的配置文件权限检查（chmod 600）。
    - 模型认证健康：检查 OAuth 过期情况，可刷新即将过期的 token，并报告认证配置文件的冷却/禁用状态。
    - 额外工作区目录检测（`~/openclaw`）。
  </Accordion>
  <Accordion title="网关、服务和 supervisor">
    - 在启用沙箱时修复沙箱镜像。
    - 旧版服务迁移和额外网关检测。
    - Matrix channel 旧版状态迁移（在 `--fix` / `--repair` 模式下）。
    - 网关运行时检查（服务已安装但未运行；缓存的 launchd label）。
    - channel 状态警告（从正在运行的网关探测）。
    - supervisor 配置审计（launchd/systemd/schtasks）以及可选修复。
    - 对安装或更新期间捕获了 shell `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` 值的网关服务进行嵌入式代理环境清理。
    - 网关运行时最佳实践检查（Node vs Bun、版本管理器路径）。
    - 网关端口冲突诊断（默认 `18789`）。
  </Accordion>
  <Accordion title="认证、安全和配对">
    - 开放 DM 策略的安全警告。
    - 本地 token 模式的网关认证检查（当不存在 token 来源时提供 token 生成；不会覆盖 token SecretRef 配置）。
    - 设备配对问题检测（待处理的首次配对请求、待处理的角色/范围升级、过期的本地 device-token 缓存漂移，以及已配对记录的认证漂移）。
  </Accordion>
  <Accordion title="工作区和 shell">
    - Linux 上的 systemd linger 检查。
    - 工作区 bootstrap 文件大小检查（上下文文件的截断/接近上限警告）。
    - shell 补全状态检查以及自动安装/升级。
    - 内存搜索 embedding provider 就绪性检查（本地模型、远程 API key 或 QMD 二进制）。
    - 源码安装检查（pnpm workspace 不匹配、缺失 UI 资源、缺失 tsx 二进制）。
    - 写入更新后的配置 + wizard 元数据。
  </Accordion>
</AccordionGroup>

## Dreams UI 回填和重置

Control UI 的 Dreams 场景包含 **Backfill**、**Reset** 和 **Clear Grounded**
操作，用于 grounded dreaming 工作流。这些操作使用网关 doctor 风格的 RPC 方法，但它们**不**属于 `openclaw doctor` CLI
的修复/迁移功能。

它们的作用：

- **Backfill** 扫描活动工作区中的历史 `memory/YYYY-MM-DD.md` 文件，运行 grounded REM 日记流程，并将可逆的回填条目写入 `DREAMS.md`。
- **Reset** 仅从 `DREAMS.md` 中移除这些标记为回填的日记条目。
- **Clear Grounded** 仅移除那些来自历史回放、且尚未积累实时回忆或日常支持的已暂存 grounded-only 短期条目。

它们本身**不**会做的事：

- 不会编辑 `MEMORY.md`
- 不会运行完整的 doctor 迁移
- 不会自动将 grounded 候选项暂存到实时短期晋升存储中，除非您先显式运行 staged CLI 路径

如果您希望 grounded 历史回放影响正常的深度晋升通道，请改用 CLI 流程：

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

That stages grounded durable candidates into the short-term dreaming store while keeping `DREAMS.md` as the review surface.

## 详细行为与设计理由

<AccordionGroup>
  <Accordion title="0. 可选更新（git 安装）">
    如果这是一个 git checkout，并且 doctor 正在交互式运行，它会在运行 doctor 之前提供更新（fetch/rebase/build）。
  </Accordion>
  <Accordion title="1. 配置规范化">
    如果配置包含旧版值形状（例如 `messages.ackReaction` 没有按频道覆盖），doctor 会将它们规范化为当前 schema。

    这也包括旧版 Talk 扁平字段。当前公开的 Talk 配置是 `talk.provider` + `talk.providers.<provider>`。Doctor 会把旧的 `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` / `talk.apiKey` 形状重写到 provider 映射中。

  </Accordion>
  <Accordion title="2. 旧版配置键迁移">
    当配置包含已弃用键时，其他命令会拒绝运行并要求您执行 `openclaw doctor`。

    Doctor 会：

    - 说明发现了哪些旧版键。
    - 展示它应用的迁移。
    - 使用更新后的 schema 重写 `~/.openclaw/openclaw.json`。

    当网关启动时，如果检测到旧版配置格式，也会自动运行 doctor 迁移，因此过时配置会在无需人工干预的情况下得到修复。Cron 任务存储迁移由 `openclaw doctor --fix` 处理。

    当前迁移包括：

    - `routing.allowFrom` → `channels.whatsapp.allowFrom`
    - `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
    - `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
    - `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
    - `routing.queue` → `messages.queue`
    - `routing.bindings` → 顶层 `bindings`
    - `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
    - legacy `talk.voiceId`/`talk.voiceAliases`/`talk.modelId`/`talk.outputFormat`/`talk.apiKey` → `talk.provider` + `talk.providers.<provider>`
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
    - 对于具有命名 `accounts`、但仍保留单账户顶层 channel 值的 channel，将这些账户范围内的值移动到该 channel 选择的提升后的账户中（大多数 channel 使用 `accounts.default`；Matrix 可以保留现有匹配的命名/default 目标）
    - `identity` → `agents.list[].identity`
    - `agent.*` → `agents.defaults` + `tools.*`（tools/elevated/exec/sandbox/subagents）
    - `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks` → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
    - 移除 `agents.defaults.llm`；对较慢的 provider/model 超时使用 `models.providers.<id>.timeoutSeconds`
    - `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
    - `browser.profiles.*.driver: "extension"` → `"existing-session"`
    - 移除 `browser.relayBindHost`（旧版扩展中继设置）
    - 旧版 `models.providers.*.api: "openai"` → `"openai-completions"`（网关启动时也会跳过那些 `api` 被设置为未来或未知枚举值的 provider，而不是直接失败关闭）

    Doctor 警告还包括针对多账户 channel 的默认账户指导：

    - 如果配置了两个或更多 `channels.<channel>.accounts` 条目，但没有配置 `channels.<channel>.defaultAccount` 或 `accounts.default`，doctor 会警告回退路由可能选到意外的账户。
    - 如果 `channels.<channel>.defaultAccount` 被设置为未知的账户 ID，doctor 会警告并列出已配置的账户 ID。

  </Accordion>
  <Accordion title="2b. OpenCode provider 覆盖">
    如果您手动添加了 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`，它会覆盖来自 `@mariozechner/pi-ai` 的内置 OpenCode 目录。这可能会让模型走错 API 或将成本置零。Doctor 会发出警告，以便您移除该覆盖并恢复按模型的 API 路由 + 成本。
  </Accordion>
  <Accordion title="2c. 浏览器迁移和 Chrome MCP 就绪性">
    如果您的浏览器配置仍指向已移除的 Chrome 扩展路径，doctor 会将其规范化为当前的 host-local Chrome MCP 连接模型：

    - `browser.profiles.*.driver: "extension"` 变为 `"existing-session"`
    - `browser.relayBindHost` 被移除

    当您使用 `defaultProfile: "user"` 或已配置的 `existing-session` 配置文件时，doctor 还会审计 host-local Chrome MCP 路径：

    - 检查 Google Chrome 是否安装在同一主机上，以用于默认自动连接配置文件
    - 检查检测到的 Chrome 版本，并在其低于 Chrome 144 时发出警告
    - 提醒您在浏览器 inspect 页面中启用远程调试（例如 `chrome://inspect/#remote-debugging`、`brave://inspect/#remote-debugging` 或 `edge://inspect/#remote-debugging`）

    Doctor 无法替您开启 Chrome 端设置。host-local Chrome MCP 仍然需要：

    - 网关/node 主机上有一个基于 Chromium 的浏览器 144+
    - 浏览器在本地运行
    - 该浏览器中已启用远程调试
    - 在浏览器中批准首次 attach 同意提示

    这里的就绪性只涉及本地 attach 先决条件。existing-session 仍保留当前的 Chrome MCP 路由限制；像 `responsebody`、PDF 导出、下载拦截和批量操作等高级路由仍然需要受管理的浏览器或原始 CDP 配置文件。

    此检查**不**适用于 Docker、sandbox、remote-browser 或其他无头流程。这些流程仍继续使用原始 CDP。

  </Accordion>
  <Accordion title="2d. OAuth TLS 先决条件">
    当配置了 OpenAI Codex OAuth 配置文件时，doctor 会探测 OpenAI 授权端点，以验证本地 Node/OpenSSL TLS 栈能否验证证书链。如果探测因证书错误失败（例如 `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`、证书过期或自签名证书），doctor 会打印平台特定的修复指导。在 macOS 上使用 Homebrew Node 时，修复通常是 `brew postinstall ca-certificates`。使用 `--deep` 时，即使网关健康，该探测也会运行。
  </Accordion>
  <Accordion title="2e. Codex OAuth provider 覆盖">
    如果您之前在 `models.providers.openai-codex` 下添加了旧版 OpenAI 传输设置，它们可能会遮蔽新版本自动使用的内置 Codex OAuth provider 路径。当 doctor 看到这些旧的传输设置与 Codex OAuth 并存时，会发出警告，以便您移除或重写过时的传输覆盖，并恢复内置的路由/回退行为。自定义代理和仅 header 覆盖仍受支持，不会触发此警告。
  </Accordion>
  <Accordion title="2f. Codex 插件路由警告">
    当启用捆绑的 Codex 插件时，doctor 还会检查 `openai-codex/*` 的主模型引用是否仍通过默认 PI 运行器解析。这个组合在您希望通过 PI 使用 Codex OAuth/订阅认证时是有效的，但很容易与原生 Codex app-server harness 混淆。Doctor 会发出警告，并指出显式的 app-server 形态：`openai/*` 加上 `agentRuntime.id: "codex"` 或 `OPENCLAW_AGENT_RUNTIME=codex`。

    Doctor 不会自动修复这一点，因为两条路都是有效的：

    - `openai-codex/*` + PI 表示“通过正常的 OpenClaw 运行器使用 Codex OAuth/订阅认证。”
    - `openai/*` + `runtime: "codex"` 表示“通过原生 Codex app-server 运行内置轮次。”
    - `/codex ...` 表示“从聊天中控制或绑定一个原生 Codex 对话。”
    - `/acp ...` 或 `runtime: "acp"` 表示“使用外部 ACP/acpx 适配器。”

    如果出现该警告，请选择您想要的路由并手动编辑配置。若 PI Codex OAuth 是有意为之，则保持该警告不变。

  </Accordion>
  <Accordion title="3. 旧版状态迁移（磁盘布局）">
    Doctor 可以把旧的磁盘布局迁移到当前结构：

    - Sessions 存储 + 转录：
      - 从 `~/.openclaw/sessions/` 到 `~/.openclaw/agents/<agentId>/sessions/`
    - Agent 目录：
      - 从 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`
    - WhatsApp 认证状态（Baileys）：
      - 从旧版 `~/.openclaw/credentials/*.json`（除 `oauth.json` 外）
      - 到 `~/.openclaw/credentials/whatsapp/<accountId>/...`（默认账户 id：`default`）

    这些迁移尽力而为且具幂等性；当留下任何旧目录作为备份时，doctor 会发出警告。Gateway/CLI 也会在启动时自动迁移旧版 sessions + agent 目录，因此历史/认证/模型会落到按 agent 划分的路径中，而不需要手动运行 doctor。WhatsApp 认证有意只通过 `openclaw doctor` 迁移。Talk provider/provider-map 规范化现在按结构相等性比较，因此仅键顺序不同的差异不再触发重复的无操作 `doctor --fix` 更改。

  </Accordion>
  <Accordion title="3a. 旧版插件 manifest 迁移">
    Doctor 会扫描所有已安装插件的 manifest，查找已弃用的顶层能力键（`speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders`、`webSearchProviders`）。找到后，它会建议将它们移动到 `contracts` 对象中，并就地重写 manifest 文件。此迁移具幂等性；如果 `contracts` 键已经具有相同值，则旧键会被移除而不会重复数据。
  </Accordion>
  <Accordion title="3b. 旧版 cron 存储迁移">
    Doctor 还会检查 cron 任务存储（默认是 `~/.openclaw/cron/jobs.json`，或在覆盖时使用 `cron.store`），查找调度器为兼容性仍接受的旧任务形状。

    当前 cron 清理包括：

    - `jobId` → `id`
    - `schedule.cron` → `schedule.expr`
    - 顶层 payload 字段（`message`、`model`、`thinking`、...）→ `payload`
    - 顶层 delivery 字段（`deliver`、`channel`、`to`、`provider`、...）→ `delivery`
    - payload `provider` delivery 别名 → 显式 `delivery.channel`
    - 简单的旧版 `notify: true` webhook 回退任务 → 显式 `delivery.mode="webhook"` 且 `delivery.to=cron.webhook`

    Doctor 只会在能够不改变行为的情况下自动迁移 `notify: true` 任务。如果某个任务将旧版 notify 回退与现有的非 webhook delivery 模式结合，doctor 会发出警告并保留该任务供手动审查。

  </Accordion>
  <Accordion title="3c. 会话锁清理">
    Doctor 会扫描每个 agent 的会话目录，查找过期的写锁文件——即会话异常退出后遗留的文件。对于找到的每个锁文件，它会报告：路径、PID、该 PID 是否仍在运行、锁的年龄，以及它是否被视为过期（PID 已死亡或超过 30 分钟）。在 `--fix` / `--repair` 模式下，它会自动移除过期锁文件；否则会打印说明并指示您使用 `--fix` 重新运行。
  </Accordion>
  <Accordion title="3d. 会话转录分支修复">
    Doctor 会扫描 agent 会话的 JSONL 文件，查找 2026.4.24 prompt 转录重写 bug 创建的重复分支形态：一个被放弃的用户轮次，包含 OpenClaw 内部运行时上下文，以及一个仍在活动的兄弟分支，其中包含相同的可见用户提示。在 `--fix` / `--repair` 模式下，doctor 会在原文件旁为每个受影响文件创建备份，并将转录重写为活动分支，以便网关历史和内存读取器不再看到重复轮次。
  </Accordion>
  <Accordion title="4. 状态完整性检查（会话持久化、路由和安全）">
    状态目录是运行时的脑干。如果它消失，您会失去会话、凭据、日志和配置（除非您在其他地方有备份）。

    Doctor 会检查：

    - **状态目录缺失**：警告灾难性的状态丢失，提示重新创建目录，并提醒您它无法恢复缺失数据。
    - **状态目录权限**：验证可写性；提供修复权限的选项（如果检测到 owner/group 不匹配，会发出 `chown` 提示）。
    - **macOS 云同步状态目录**：当状态解析到 iCloud Drive（`~/Library/Mobile Documents/com~apple~CloudDocs/...`）或 `~/Library/CloudStorage/...` 下时会发出警告，因为基于同步的路径可能导致更慢的 I/O 和锁/同步竞态。
    - **Linux SD 或 eMMC 状态目录**：当状态解析到 `mmcblk*` 挂载源时会发出警告，因为基于 SD 或 eMMC 的随机 I/O 在会话和凭据写入时可能更慢且磨损更快。
    - **会话目录缺失**：`sessions/` 和 session 存储目录是持久化历史并避免 `ENOENT` 崩溃所必需的。
    - **转录不匹配**：当最近的会话条目缺少转录文件时会发出警告。
    - **主会话 "1 行 JSONL"**：当主转录只有一行时会标记（历史没有积累）。
    - **多个状态目录**：当多个 `~/.openclaw` 文件夹存在于不同 home 目录中，或 `OPENCLAW_STATE_DIR` 指向其他位置时会发出警告（历史可能会在安装之间分裂）。
    - **远程模式提醒**：如果 `gateway.mode=remote`，doctor 会提醒您在远程主机上运行它（状态存放在那里）。
    - **配置文件权限**：如果 `~/.openclaw/openclaw.json` 对组/所有人可读，会警告并提供将其收紧为 `600` 的选项。

  </Accordion>
  <Accordion title="5. 模型认证健康（OAuth 过期）">
    Doctor 会检查认证存储中的 OAuth 配置文件，在 token 即将过期/已过期时发出警告，并在安全时刷新它们。如果 Anthropic OAuth/token 配置文件已过时，它会建议使用 Anthropic API key 或 Anthropic setup-token 路径。刷新提示只会在交互式运行（TTY）时出现；`--non-interactive` 会跳过刷新尝试。

    当 OAuth 刷新永久失败时（例如 `refresh_token_reused`、`invalid_grant`，或 provider 提示您重新登录），doctor 会报告需要重新认证，并打印要运行的确切 `openclaw models auth login --provider ...` 命令。

    Doctor 还会报告由于以下原因而暂时不可用的认证配置文件：

    - 短冷却期（速率限制/超时/认证失败）
    - 较长的禁用期（计费/信用失败）

  </Accordion>
  <Accordion title="6. Hooks 模型验证">
    如果设置了 `hooks.gmail.model`，doctor 会根据目录和允许列表验证模型引用，并在它无法解析或被禁止时发出警告。
  </Accordion>
  <Accordion title="7. 沙箱镜像修复">
    在启用沙箱时，doctor 会检查 Docker 镜像，并在当前镜像缺失时提供构建或切换到旧名称的选项。
  </Accordion>
  <Accordion title="7b. 内置插件运行时依赖">
    Doctor 只会验证在当前配置中处于激活状态，或由其捆绑 manifest 默认启用的内置插件的运行时依赖，例如 `plugins.entries.discord.enabled: true`、旧版 `channels.discord.enabled: true`，或默认启用的捆绑 provider。如果有缺失，doctor 会报告这些包，并在 `openclaw doctor --fix` / `openclaw doctor --repair` 模式下安装它们。外部插件仍然使用 `openclaw plugins install` / `openclaw plugins update`；doctor 不会为任意插件路径安装依赖。

    在 doctor repair 期间，内置运行时依赖的 npm 安装会在 TTY 会话中显示旋转器进度，在管道/无头输出中显示周期性行进度。Gateway 和本地 CLI 也可以在导入内置插件之前按需修复活动的内置插件运行时依赖。这些安装限定在插件运行时安装根目录下，运行时禁用脚本，不写 package lock，并由安装根锁保护，因此并发的 CLI 或 Gateway 启动不会同时修改同一个 `node_modules` 树。

  </Accordion>
  <Accordion title="8. 网关服务迁移和清理提示">
    Doctor 会检测旧版网关服务（launchd/systemd/schtasks），并提供移除它们并使用当前网关端口安装 OpenClaw 服务的选项。它还可以扫描额外的类网关服务并打印清理提示。按 profile 命名的 OpenClaw 网关服务被视为一等公民，不会被标记为“额外”。

    在 Linux 上，如果用户级网关服务缺失但系统级 OpenClaw 网关服务存在，doctor 不会自动安装第二个用户级服务。请使用 `openclaw gateway status --deep` 或 `openclaw doctor --deep` 检查，然后移除重复项，或者在系统 supervisor 拥有网关生命周期时设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。

  </Accordion>
  <Accordion title="8b. 启动时 Matrix 迁移">
    当 Matrix channel 账户存在待处理或可执行的旧状态迁移时，doctor（在 `--fix` / `--repair` 模式下）会创建迁移前快照，然后执行尽力而为的迁移步骤：旧版 Matrix 状态迁移和旧版加密状态准备。两步都不是致命错误；错误会被记录，启动会继续。在只读模式（不带 `--fix` 的 `openclaw doctor`）下，此检查会完全跳过。
  </Accordion>
  <Accordion title="8c. 设备配对和认证漂移">
    Doctor 现在会在常规健康检查中检查设备配对状态。

    它报告的内容：

    - 待处理的首次配对请求
    - 已配对设备的待处理角色升级
    - 已配对设备的待处理范围升级
    - 公钥不匹配修复：设备 id 仍匹配，但设备身份已不再与已批准记录匹配
    - 已配对记录缺少已批准角色的活动 token
    - 超出已批准配对基线的已配对 token 范围漂移
    - 当前机器的本地缓存 device-token 条目，这些条目早于网关侧 token 轮换，或者携带过时的范围元数据

    Doctor 不会自动批准配对请求或自动轮换 device token。它只会打印精确的下一步：

    - 使用 `openclaw devices list` 检查待处理请求
    - 使用 `openclaw devices approve <requestId>` 批准该请求
    - 使用 `openclaw devices rotate --device <deviceId> --role <role>` 轮换新 token
    - 使用 `openclaw devices remove <deviceId>` 移除并重新批准过期记录

    这解决了常见的“已经配对但仍提示需要配对”的问题：doctor 现在会区分首次配对、待处理的角色/范围升级，以及过时 token/device-identity 漂移。

  </Accordion>
  <Accordion title="9. 安全警告">
    当 provider 可在没有 allowlist 的情况下开放给 DM，或者策略配置方式危险时，doctor 会发出警告。
  </Accordion>
  <Accordion title="10. systemd linger（Linux）">
    如果作为 systemd 用户服务运行，doctor 会确保启用 linger，以便网关在注销后仍保持存活。
  </Accordion>
  <Accordion title="11. 工作区状态（skills、插件和旧目录）">
    Doctor 会打印默认 agent 的工作区状态摘要：

    - **Skills 状态**：统计可用、缺少要求和被 allowlist 阻止的 skills。
    - **旧版工作区目录**：当 `~/openclaw` 或其他旧版工作区目录与当前工作区并存时发出警告。
    - **插件状态**：统计启用/禁用/出错的插件；列出任何错误的插件 ID；报告 bundle 插件能力。
    - **插件兼容性警告**：标记与当前运行时存在兼容性问题的插件。
    - **插件诊断**：展示插件注册表发出的任何加载时警告或错误。

  </Accordion>
  <Accordion title="11b. Bootstrap 文件大小">
    Doctor 会检查工作区 bootstrap 文件（例如 `AGENTS.md`、`CLAUDE.md` 或其他注入的上下文文件）是否接近或超过配置的字符预算。它会报告每个文件的原始字符数与注入字符数、截断百分比、截断原因（`max/file` 或 `max/total`），以及注入总字符数占总预算的比例。当文件被截断或接近上限时，doctor 会打印关于调整 `agents.defaults.bootstrapMaxChars` 和 `agents.defaults.bootstrapTotalMaxChars` 的提示。

  </Accordion>
  <Accordion title="11d. 过期 channel 插件清理">
    当 `openclaw doctor --fix` 移除缺失的 channel 插件时，它也会移除引用该插件的悬空 channel 级配置：`channels.<id>` 条目、命名该 channel 的 heartbeat 目标，以及 `agents.*.models["<channel>/*"]` 覆盖。这可以防止 channel 运行时已消失、但配置仍要求网关绑定到它时出现的网关启动循环。

  </Accordion>
  <Accordion title="11c. shell 补全">
    Doctor 会检查当前 shell（zsh、bash、fish 或 PowerShell）是否已安装 tab 补全：

    - 如果 shell profile 使用较慢的动态补全模式（`source <(openclaw completion ...)`），doctor 会将其升级为更快的缓存文件变体。
    - 如果 profile 中已配置补全但缓存文件缺失，doctor 会自动重新生成缓存。
    - 如果根本没有配置补全，doctor 会提示安装（仅交互模式；`--non-interactive` 会跳过）。

    运行 `openclaw completion --write-state` 可手动重新生成缓存。

  </Accordion>
  <Accordion title="12. 网关认证检查（本地 token）">
    Doctor 会检查本地网关 token 认证就绪性。

    - 如果 token 模式需要 token 且没有 token 来源，doctor 会提供生成一个的选项。
    - 如果 `gateway.auth.token` 由 SecretRef 管理但不可用，doctor 会警告并且不会用明文覆盖它。
    - `openclaw doctor --generate-gateway-token` 仅在未配置 token SecretRef 时强制生成。

  </Accordion>
  <Accordion title="12b. 只读、感知 SecretRef 的修复">
    某些修复流程需要在不削弱运行时 fail-fast 行为的情况下检查已配置的凭据。

    - `openclaw doctor --fix` 现在使用与 status 家族命令相同的只读 SecretRef 摘要模型进行有针对性的配置修复。
    - 例如：Telegram `allowFrom` / `groupAllowFrom` 的 `@username` 修复会在可用时尝试使用已配置的 bot 凭据。
    - 如果 Telegram bot token 通过 SecretRef 配置但在当前命令路径中不可用，doctor 会报告该凭据“已配置但不可用”，并跳过自动解析，而不是崩溃或错误地将 token 报告为缺失。

  </Accordion>
  <Accordion title="13. 网关健康检查 + 重启">
    Doctor 会运行健康检查，并在网关看起来不健康时提供重启它的选项。
  </Accordion>
  <Accordion title="13b. 内存搜索就绪性">
    Doctor 会检查为默认 agent 配置的内存搜索 embedding provider 是否就绪。行为取决于已配置的后端和 provider：

    - **QMD 后端**：探测 `qmd` 二进制是否可用且可启动。如果不可用，会打印修复指导，包括 npm 包和手动二进制路径选项。
    - **显式本地 provider**：检查本地模型文件或可识别的远程/可下载模型 URL。如果缺失，会建议切换到远程 provider。
    - **显式远程 provider**（`openai`、`voyage` 等）：验证环境变量或认证存储中是否存在 API key。如果缺失，会打印可操作的修复提示。
    - **自动 provider**：先检查本地模型可用性，然后按自动选择顺序尝试每个远程 provider。

    当存在缓存的网关探测结果时（即检查时网关是健康的），doctor 会将其结果与 CLI 可见配置交叉引用，并记录任何差异。Doctor 不会在默认路径上启动新的 embedding ping；如果您想要实时 provider 检查，请使用深度内存状态命令。

    使用 `openclaw memory status --deep` 可在运行时验证 embedding 就绪性。

  </Accordion>
  <Accordion title="14. channel 状态警告">
    如果网关健康，doctor 会运行 channel 状态探测并报告带有建议修复的警告。
  </Accordion>
  <Accordion title="15. supervisor 配置审计 + 修复">
    Doctor 会检查已安装的 supervisor 配置（launchd/systemd/schtasks）是否缺少或过时的默认值（例如 systemd 的网络在线依赖和重启延迟）。当发现不匹配时，它会建议更新，并可以将服务文件/任务重写为当前默认值。

    注意：

    - `openclaw doctor` 会在重写 supervisor 配置前提示。
    - `openclaw doctor --yes` 接受默认修复提示。
    - `openclaw doctor --repair` 在不提示的情况下应用推荐修复。
    - `openclaw doctor --repair --force` 会覆盖自定义的 supervisor 配置。
    - `OPENCLAW_SERVICE_REPAIR_POLICY=external` 会让 doctor 对网关服务生命周期保持只读。它仍会报告服务健康并执行非服务修复，但会跳过服务安装/启动/重启/bootstrap、supervisor 配置重写以及旧版服务清理，因为该生命周期由外部 supervisor 管理。
    - 在 Linux 上，当匹配的 systemd 网关单元处于活动状态时，doctor 不会重写命令/入口元数据。它还会在重复服务扫描中忽略非旧版、非活动的额外类网关单元，以免伴随服务文件产生清理噪音。
    - 如果 token 认证需要 token 且 `gateway.auth.token` 由 SecretRef 管理，doctor 的服务安装/修复会验证 SecretRef，但不会将解析后的明文 token 值持久化到 supervisor 服务环境元数据中。
    - Doctor 会检测那些由旧版 LaunchAgent、systemd 或 Windows Scheduled Task 安装嵌入的、受管理的 `.env`/SecretRef-backed 服务环境值，并重写服务元数据，使这些值从运行时来源而不是 supervisor 定义中加载。
    - Doctor 会检测当服务命令在 `gateway.port` 更改后仍固定使用旧的 `--port` 时，并将服务元数据重写为当前端口。
    - 如果 token 认证需要 token 且已配置的 token SecretRef 未解析，doctor 会阻止安装/修复路径，并提供可操作的指导。
    - 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`，且未设置 `gateway.auth.mode`，doctor 会阻止安装/修复，直到显式设置 mode。
    - 对于 Linux user-systemd 单元，doctor 的 token 漂移检查现在在比较服务认证元数据时会同时包含 `Environment=` 和 `EnvironmentFile=` 来源。
    - 当配置最后由新版本写入，而 doctor 试图修复的网关服务来自更旧的 OpenClaw 二进制时，doctor 的服务修复会拒绝重写、停止或重启该服务。请参见 [网关故障排查](/gateway/troubleshooting#split-brain-installs-and-newer-config-guard)。
    - 您始终可以通过 `openclaw gateway install --force` 强制完整重写。

  </Accordion>
  <Accordion title="16. 网关运行时 + 端口诊断">
    Doctor 会检查服务运行时（PID、最后退出状态），并在服务已安装但实际上未运行时发出警告。它还会检查网关端口（默认 `18789`）上的端口冲突，并报告可能原因（网关已在运行、SSH 隧道）。
  </Accordion>
  <Accordion title="17. 网关运行时最佳实践">
    当网关服务运行在 Bun 或版本管理的 Node 路径（`nvm`、`fnm`、`volta`、`asdf` 等）上时，doctor 会发出警告。WhatsApp + Telegram channel 需要 Node，而版本管理器路径在升级后可能失效，因为服务不会加载您的 shell 初始化。Doctor 会在可用时提供迁移到系统 Node 安装的选项（Homebrew/apt/choco）。

    新安装或已修复的服务会保留显式环境根目录（`NVM_DIR`、`FNM_DIR`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`BUN_INSTALL`、`PNPM_HOME`）和稳定的 user-bin 目录，但推测出的版本管理器回退目录只有在这些目录在磁盘上存在时才会写入服务 PATH。这使生成的 supervisor PATH 与 doctor 后续运行的相同最小 PATH 审计保持一致。

  </Accordion>
  <Accordion title="18. 配置写入 + 向导元数据">
    Doctor 会持久化任何配置更改，并写入向导元数据以记录 doctor 运行。
  </Accordion>
  <Accordion title="19. 工作区提示（备份 + 内存系统）">
    当缺少工作区内存系统时，doctor 会建议使用一个，并在工作区尚未纳入 git 时打印备份提示。

    有关工作区结构和 git 备份的完整指南（推荐使用私有 GitHub 或 GitLab），请参见 [/concepts/agent-workspace](/concepts/agent-workspace)。

  </Accordion>
</AccordionGroup>

## 相关内容

- [Gateway 运行手册](/gateway)
- [Gateway 故障排查](/gateway/troubleshooting)
