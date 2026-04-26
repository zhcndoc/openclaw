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

- git 安装的可选预检查更新（仅交互模式）。
- UI 协议新鲜度检查（当协议架构更新时重建 Control UI）。
- 健康检查 + 重启提示。
- 技能状态摘要（符合/缺失/阻止）和插件状态。
- 旧值的配置规范化。
- 将旧版平面 `talk.*` 字段迁移到 `talk.provider` + `talk.providers.<provider>`。
- 浏览器迁移检查，包括旧版 Chrome 扩展配置和 Chrome MCP 就绪情况。
- OpenCode 提供者覆盖警告（`models.providers.opencode` / `models.providers.opencode-go`）。
- Codex OAuth 遮蔽警告（`models.providers.openai-codex`）。
- OpenAI Codex OAuth 配置文件的 OAuth TLS 先决条件检查。
- 旧版磁盘状态迁移（sessions/agent 目录/WhatsApp 认证）。
- 旧版插件清单契约键迁移（`speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders`、`webSearchProviders` → `contracts`）。
- 旧版 cron 存储迁移（`jobId`、`schedule.cron`、顶层 delivery/payload 字段、payload `provider`、简单的 `notify: true` webhook 回退任务）。
- 会话锁文件检查和过期锁清理。
- 状态完整性和权限检查（会话、转录、状态目录）。
- 本地运行时的配置文件权限检查（chmod 600）。
- 模型认证健康：检查 OAuth 过期状态，可刷新即将过期的令牌，并报告认证配置文件的冷却/禁用状态。
- 额外工作区目录检测（`~/openclaw`）。
- 沙箱启用时的沙箱镜像修复。
- 旧版服务迁移和额外网关检测。
- Matrix 通道旧版状态迁移（在 `--fix` / `--repair` 模式下）。
- 网关运行时检查（服务已安装但未运行；缓存的 launchd 标签）。
- 通道状态警告（从正在运行的网关探测）。
- Supervisor 配置审计（launchd/systemd/schtasks）及可选修复。
- 网关运行最佳实践检查（Node vs Bun、版本管理器路径）。
- 网关端口冲突诊断（默认 `18789`）。
- 对开放 DM 策略的安全警告。
- 本地令牌模式下的网关认证检查（当没有令牌源时提供令牌生成；不会覆盖 token SecretRef 配置）。
- 设备配对问题检测（待处理的首次配对请求、待处理的角色/作用域升级、过时的本地设备令牌缓存漂移，以及已配对记录的认证漂移）。
- Linux 上的 systemd linger 检查。
- 工作区启动文件大小检查（上下文文件的截断/接近上限警告）。
- Shell 补全状态检查和自动安装/升级。
- 内存搜索嵌入提供者就绪检查（本地模型、远程 API 密钥或 QMD 二进制）。
- 源码安装检查（pnpm 工作区不匹配、缺少 UI 资源、缺少 tsx 二进制）。
- 写入更新后的配置和向导元数据。

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

这样会将 grounded 持久候选项暂存到短期 dreaming 存储中，同时保留 `DREAMS.md` 作为审阅界面。

## 详细行为和原理

### 0) 可选更新（git 安装）

如果是 git 检出且 doctor 运行于交互模式，doctor 会提供运行前更新（fetch/rebase/build）。

### 1) 配置规范化

如果配置包含旧值格式（如 `messages.ackReaction` 没有针对频道的覆盖），doctor 会规范化为当前协议结构。

这包括旧版 Talk 平面字段。当前公共 Talk 配置是
`talk.provider` + `talk.providers.<provider>`。Doctor 将旧的
`talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` /
`talk.apiKey` 形状重写为提供者映射。

### 2) 旧版配置键迁移

当配置包含弃用键时，其他命令会拒绝运行并提示执行 `openclaw doctor`。

Doctor 会：

- 说明发现了哪些旧版键。
- 展示应用的迁移方案。
- 重写 `~/.openclaw/openclaw.json`，更新到当前协议。

网关在启动时检测到旧版配置格式也会自动运行 doctor 迁移，因此陈旧配置无需人工干预即可修复。  
Cron 任务存储迁移由 `openclaw doctor --fix` 处理。

当前迁移包括：

- `routing.allowFrom` → `channels.whatsapp.allowFrom`
- `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
- `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
- `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
- `routing.queue` → `messages.queue`
- `routing.bindings` → 顶层 `bindings`
- `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
- 旧版 `talk.voiceId`/`talk.voiceAliases`/`talk.modelId`/`talk.outputFormat`/`talk.apiKey` → `talk.provider` + `talk.providers.<provider>`
- `routing.agentToAgent` → `tools.agentToAgent`
- `routing.transcribeAudio` → `tools.media.audio.models`
- `messages.tts.<provider>`（`openai`/`elevenlabs`/`microsoft`/`edge`）→ `messages.tts.providers.<provider>`
- `channels.discord.voice.tts.<provider>`（`openai`/`elevenlabs`/`microsoft`/`edge`）→ `channels.discord.voice.tts.providers.<provider>`
- `channels.discord.accounts.<id>.voice.tts.<provider>`（`openai`/`elevenlabs`/`microsoft`/`edge`）→ `channels.discord.accounts.<id>.voice.tts.providers.<provider>`
- `plugins.entries.voice-call.config.tts.<provider>`（`openai`/`elevenlabs`/`microsoft`/`edge`）→ `plugins.entries.voice-call.config.tts.providers.<provider>`
- `plugins.entries.voice-call.config.provider: "log"` → `"mock"`
- `plugins.entries.voice-call.config.twilio.from` → `plugins.entries.voice-call.config.fromNumber`
- `plugins.entries.voice-call.config.streaming.sttProvider` → `plugins.entries.voice-call.config.streaming.provider`
- `plugins.entries.voice-call.config.streaming.openaiApiKey|sttModel|silenceDurationMs|vadThreshold`
  → `plugins.entries.voice-call.config.streaming.providers.openai.*`
- `bindings[].match.accountID` → `bindings[].match.accountId`
- 对于具有命名 `accounts` 但遗留单账户顶层通道值的通道，将这些账户范围的值移入为该通道提升的选定账户（大多数通道为 `accounts.default`；Matrix 可以保留现有的匹配命名/默认目标）
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*`（tools/elevated/exec/sandbox/subagents）
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks` →
  `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `browser.profiles.*.driver: "extension"` → `"existing-session"`
- 移除 `browser.relayBindHost`（遗留扩展中继设置）

Doctor 还对多账户频道的默认账户设置提供警告：

- 当配置了两个及以上的 `channels.<channel>.accounts` 条目，但未设置 `channels.<channel>.defaultAccount` 或全局 `accounts.default` 时，doctor 会警告后备路由可能选择到意外账户。
- 当 `channels.<channel>.defaultAccount` 配置了未知账户 ID，doctor 会警告并列出所有配置的账户 ID。

### 2b) OpenCode Zen 提供者覆盖

如果手动添加了 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`，该配置会覆盖来自 `@mariozechner/pi-ai` 的内置 OpenCode 目录，可能导致所有模型统一使用错误的 API 或成本归零。Doctor 会警告移除该覆盖以恢复每模型的 API 路由和费用结算。

### 2c) 浏览器迁移和 Chrome MCP 准备情况

如果浏览器配置仍指向已移除的 Chrome 扩展路径，doctor 会规范化为当前主机本地 Chrome MCP 附加模型：

- `browser.profiles.*.driver: "extension"` 变为 `"existing-session"`
- 移除 `browser.relayBindHost`

当使用 `defaultProfile: "user"` 或已配置的 `existing-session` 配置文件时，doctor 也会审计主机本地 Chrome MCP 路径：

- 检查默认自动连接配置的主机上是否安装了 Google Chrome
- 检查 Chrome 版本，版本低于 Chrome 144 时发出警告
- 提醒启用浏览器调试（例如 `chrome://inspect/#remote-debugging`、`brave://inspect/#remote-debugging` 或 `edge://inspect/#remote-debugging`）

Doctor 无法替您启用 Chrome 端设置。主机本地 Chrome MCP 仍需：

- 网关/节点主机上的 Chromium 144+ 版本浏览器
- 本地运行该浏览器
- 浏览器中启用远程调试
- 浏览器首次附加时批准权限提示

这里的准备情况仅涉及本地附加先决条件。现有会话保持当前 Chrome MCP 路由限制；高级路由如 `responsebody`、PDF 导出、下载拦截和批量操作仍需托管浏览器或原始 CDP 配置文件。

此检查**不**适用于 Docker、沙箱、远程浏览器或其他无头流程。那些继续使用原始 CDP。

### 2d) OAuth TLS 先决条件

当配置了 OpenAI Codex OAuth 配置文件时，doctor 会探测 OpenAI 授权端点以验证本地 Node/OpenSSL TLS 栈能否验证证书链。如果探测因证书错误失败（例如 `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`、证书过期或自签名证书），doctor 会打印特定于平台的修复指导。在 macOS 上使用 Homebrew Node 时，修复通常是 `brew postinstall ca-certificates`。使用 `--deep` 时，即使网关健康也会运行探测。

### 2c) Codex OAuth 提供者覆盖

如果您之前在 `models.providers.openai-codex` 下添加了旧版 OpenAI 传输设置，它们可能会遮蔽新版本自动使用的内置 Codex OAuth 提供者路径。Doctor 在看到这些旧传输设置与 Codex OAuth 并存时会发出警告，以便您移除或重写陈旧的传输覆盖，并恢复内置路由/回退行为。自定义代理和仅标头覆盖仍受支持，不会触发此警告。

### 3) 旧版状态迁移（磁盘布局）

Doctor 支持将旧版磁盘结构迁移到当前结构：

- 会话存储 + 转录：
  - 从 `~/.openclaw/sessions/` 迁移到 `~/.openclaw/agents/<agentId>/sessions/`
- Agent 目录：
  - 从 `~/.openclaw/agent/` 迁移到 `~/.openclaw/agents/<agentId>/agent/`
- WhatsApp 认证状态（Baileys）：
  - 从旧版 `~/.openclaw/credentials/*.json`（不含 `oauth.json`）
  - 迁移到 `~/.openclaw/credentials/whatsapp/<accountId>/...` （默认账户 ID 为 `default`）

这些迁移是尽力而为且幂等的；当 doctor 留下任何旧版文件夹作为备份时，它会发出警告。网关/CLI 也会在启动时自动迁移旧版会话 + 代理目录，因此历史/认证/模型会进入每个代理路径，无需手动运行 doctor。WhatsApp 认证故意仅通过 `openclaw doctor` 迁移。Talk 提供者/提供者映射规范化现在通过结构相等性进行比较，因此仅键顺序不同的差异不再触发重复的无操作 `doctor --fix` 更改。

### 3a) 旧版插件清单迁移

Doctor 扫描所有已安装的插件清单以查找弃用的顶层能力键（`speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders`、`webSearchProviders`）。找到时，它提供将它们移入 `contracts` 对象并就地重写清单文件的选项。此迁移是幂等的；如果 `contracts` 键已具有相同的值，则移除旧版键而不复制数据。

### 3b) 旧版 cron 存储迁移

Doctor 检查定时任务存储（默认文件 `~/.openclaw/cron/jobs.json`，或被覆盖的 `cron.store`）是否含有仍被调度器兼容的旧任务格式。

当前迁移包括：

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- 顶层 payload 字段（`message`、`model`、`thinking` 等）迁移到 `payload`
- 顶层 delivery 字段（`deliver`、`channel`、`to`、`provider` 等）迁移到 `delivery`
- payload 中的 `provider` 作为 delivery 频道别名迁移为明确的 `delivery.channel`
- 简单旧版 `notify: true` webhook 兼容任务迁移为明确的 `delivery.mode="webhook"` 和 `delivery.to=cron.webhook`

Doctor 仅在不改变行为的情况下自动迁移 `notify: true` 任务。如果任务同时包含旧式通知兼容和现存非 webhook 交付方式，doctor 会警告并保持该任务等待人工复核。

### 3c) 会话锁清理

Doctor 扫描每个代理会话目录以查找过期的写锁文件——这些文件是会话异常退出时留下的。对于找到的每个锁文件，它会报告：路径、PID、PID 是否仍然存活、锁的年龄以及是否被视为过期（死 PID 或超过 30 分钟）。在 `--fix` / `--repair` 模式下，它会自动移除过期的锁文件；否则它会打印说明并指示您使用 `--fix` 重新运行。

### 4) 状态完整性检查（会话持久性、路由和安全性）

状态目录是运行时核心，若丢失，会话、凭证、日志和配置都会丢失（除外部备份）。

Doctor 检查：

- **状态目录缺失**：警告造成灾难性状态丢失，提示创建目录并提醒无法恢复丢失数据。
- **状态目录权限**：检查可写，提供修复权限选项（若所有者/组不匹配，附带 `chown` 提示）。
- **macOS 云同步状态目录**：警告状态目录位于 iCloud Drive 路径（`~/Library/Mobile Documents/com~apple~CloudDocs/...` 或 `~/Library/CloudStorage/...`），因同步路径可能导致 IO 慢和锁竞争。
- **Linux SD 卡或 eMMC 状态目录**：警告状态目录在 `mmcblk*` 设备挂载点，因 SD/eMMC 随机 IO 性能受限且写入加速磨损。
- **会话目录缺失**：`sessions/` 目录及会话存储目录必须存在以持久化历史和避免 `ENOENT` 异常。
- **转录文件不匹配**：提示最近会话记录缺少对应转录文件。
- **主会话“单行 JSONL"**：提示主转录文件只有一行（历史未正常累积）。
- **多个状态目录**：警告存在多个 `~/.openclaw` 目录于不同家目录，或环境变量 `OPENCLAW_STATE_DIR` 指向其他目录，导致历史数据分裂。
- **远程模式提醒**：当 `gateway.mode=remote`，提醒在远端主机运行 doctor（状态位于远端）。
- **配置文件权限**：警告本地 `~/.openclaw/openclaw.json` 是组或其它用户可读，建议收紧权限至 `600`。

### 5) 模型认证健康（OAuth 过期）

Doctor 检查认证存储中的 OAuth 配置文件，当令牌即将过期/已过期时发出警告，并在安全时刷新它们。如果 Anthropic OAuth/令牌配置文件已过时，它会建议使用 Anthropic API 密钥或 Anthropic setup-token 路径。刷新提示仅在交互模式（TTY）下运行出现；`--non-interactive` 会跳过刷新尝试。

当 OAuth 刷新永久失败时（例如 `refresh_token_reused`、`invalid_grant`，或提供者提示您重新登录），doctor 会报告需要重新认证，并打印要运行的精确 `openclaw models auth login --provider ...` 命令。

Doctor 还会报告由于以下原因而暂时不可用的认证配置文件：

- 短暂冷却（速率限制 / 超时 / 认证失败）
- 长期禁用（计费或额度失败）

### 6) Hooks 模型验证

如设置了 `hooks.gmail.model`，doctor 验证模型引用是否存在于目录及白名单中，不合法或不允许时发出警告。

### 7) 沙箱镜像修复

沙箱开启时，doctor 检查 Docker 镜像，缺失或过期时提示构建或切换至旧镜像名称。

### 7b) 捆绑插件运行时依赖

Doctor 仅为当前配置中处于活动状态，或由其捆绑清单默认启用的捆绑插件验证运行时依赖，例如 `plugins.entries.discord.enabled: true`、旧版 `channels.discord.enabled: true`，或默认启用的捆绑提供者。如果有缺失，doctor 会报告这些包，并在 `openclaw doctor --fix` / `openclaw doctor --repair` 模式下安装它们。外部插件仍使用 `openclaw plugins install` / `openclaw plugins update`；doctor 不会为任意插件路径安装依赖。

Gateway 和本地 CLI 也可以在导入捆绑插件前按需修复活动捆绑插件的运行时依赖。这些安装限定于插件运行时安装根目录，禁用脚本运行，不写入 package lock，并受安装根目录锁保护，因此并发的 CLI 或 Gateway 启动不会同时修改同一个 `node_modules` 树。

### 8) Gateway 服务迁移和清理提示

Doctor 检测旧版网关服务（launchd/systemd/schtasks），提供移除建议及按当前端口安装 OpenClaw 服务。还能扫描额外网关类服务并发出清理提示。已命名的 OpenClaw 网关服务被视为一级服务，不被标记为“额外”。

### 8b) 启动 Matrix 迁移

当 Matrix 通道账户有待处理或可操作的旧版状态迁移时，doctor（在 `--fix` / `--repair` 模式下）会创建迁移前快照，然后运行最佳努力迁移步骤：旧版 Matrix 状态迁移和旧版加密状态准备。这两个步骤都不是致命的；错误会被记录并且启动继续。在只读模式（`openclaw doctor` 不带 `--fix`）下，此检查会被完全跳过。

### 8c) 设备配对和认证漂移

Doctor 现在将设备配对状态作为常规健康检查的一部分进行检查。

它报告的内容包括：

- 待处理的首次配对请求
- 已配对设备的待处理角色升级
- 已配对设备的待处理作用域升级
- 公钥不匹配修复，其中设备 ID 仍匹配，但设备身份已不再匹配已批准记录
- 已配对记录缺少已批准角色的活动令牌
- 已配对令牌的作用域偏离已批准配对基线
- 当前机器上本地缓存的设备令牌条目，其时间早于网关侧令牌轮换，或携带过时的作用域元数据

Doctor 不会自动批准配对请求，也不会自动轮换设备令牌。它只会打印精确的下一步操作：

- 使用 `openclaw devices list` 检查待处理请求
- 使用 `openclaw devices approve <requestId>` 批准该请求
- 使用 `openclaw devices rotate --device <deviceId> --role <role>` 轮换新令牌
- 使用 `openclaw devices remove <deviceId>` 删除并重新批准过时记录

这解决了常见的“已经配对但仍提示需要配对”问题：doctor 现在会区分首次配对、待处理的角色/作用域升级，以及过时的令牌/设备身份漂移。

### 9) 安全警告

当某些提供者开放 DM 权限且无允许列表，或策略配置危险时，doctor 发出警告。

### 10) systemd linger（Linux）

当网关作为 systemd 用户服务运行时，doctor 确保 `linger` 功能开启，保证登出后网关保持运行。

### 11) 工作区状态（技能、插件和旧版目录）

Doctor 打印默认代理的工作区状态摘要：

- **技能状态**：统计符合、缺失要求和允许列表阻止的技能数量。
- **旧版工作区目录**：当 `~/openclaw` 或其他旧版工作区目录与当前工作区共存时发出警告。
- **插件状态**：统计已加载/禁用/出错的插件数量；列出任何错误的插件 ID；报告捆绑插件能力。
- **插件兼容性警告**：标记与当前运行时有兼容性问题的插件。
- **插件诊断**：显示插件注册表发出的任何加载时警告或错误。

### 11b) 引导文件大小

Doctor 检查工作区引导文件（例如 `AGENTS.md`、`CLAUDE.md` 或其他注入的上下文文件）是否接近或超过配置的字符预算。它报告每个文件的原始与注入字符数、截断百分比、截断原因（`max/file` 或 `max/total`），以及总注入字符占总预算的比例。当文件被截断或接近限制时，doctor 会打印调整 `agents.defaults.bootstrapMaxChars` 和 `agents.defaults.bootstrapTotalMaxChars` 的提示。

### 11c) Shell 补全

Doctor 检查当前 shell（zsh、bash、fish 或 PowerShell）是否安装了制表符补全：

- 如果 shell 配置文件使用慢速动态补全模式（`source <(openclaw completion ...)`），doctor 会将其升级为更快的缓存文件变体。
- 如果配置文件中配置了补全但缓存文件缺失，doctor 会自动重新生成缓存。
- 如果完全没有配置补全，doctor 会提示安装它（仅限交互模式；使用 `--non-interactive` 时跳过）。

运行 `openclaw completion --write-state` 手动重新生成缓存。

### 12) 网关认证检查（本地令牌）

Doctor 检查本地网关令牌认证状态：

- 令牌模式下需令牌却无令牌源时，提供生成令牌选项。
- 当 `gateway.auth.token` 使用 SecretRef 管理且当前不可用时，发出警告且不覆盖为明文。
- `openclaw doctor --generate-gateway-token` 仅在无 SecretRef 配置时强制生成令牌。

### 12b) 只读 SecretRef 感知修复

某些修复需检查配置内凭据，但不能破坏运行时的快速失败：

- `openclaw doctor --fix` 使用相同只读 SecretRef 摘要模型与状态命令，实现针对性的配置修复。
- 如 Telegram `allowFrom` / `groupAllowFrom` 中的 `@username` 修复使用已配置的机器人凭据。
- 若 Telegram 机器人令牌通过 SecretRef 配置但当前命令路径不可用，doctor 报告凭据配置存在但不可用，避免崩溃或误判为缺失令牌。

### 13) 网关健康检查 + 重启

Doctor 执行健康检查，网关不健康时提供重启建议。

### 13b) 内存搜索准备情况

Doctor 检查配置的内存搜索嵌入提供者是否已为默认代理准备好。行为取决于配置的后端和提供者：

- **QMD 后端**：探测 `qmd` 二进制文件是否可用且可启动。如果不可用，打印修复指导，包括 npm 包和手动二进制路径选项。
- **显式本地提供者**：检查本地模型文件或可识别的远程/可下载模型 URL。如果缺失，建议切换到远程提供者。
- **显式远程提供者**（`openai`, `voyage` 等）：验证环境或认证存储中是否存在 API 密钥。如果缺失，打印可操作的修复提示。
- **自动提供者**：首先检查本地模型可用性，然后按自动选择顺序尝试每个远程提供者。

当网关探测结果可用时（检查时网关健康），doctor 将其结果与 CLI 可见配置交叉引用，并注意任何差异。

使用 `openclaw memory status --deep` 在运行时验证嵌入准备情况。

### 14) 通道状态警告

网关健康时，doctor 探测通道状态，并报告带修复建议的警告。

### 15) Supervisor 配置审计 + 修复

Doctor 检查已安装的 supervisor 配置（launchd/systemd/schtasks）是否缺失或过时（如 systemd 网络依赖、重启延迟配置）。发现不匹配时建议更新，并可重写服务文件/任务为当前默认内容。

说明：

- 运行 `openclaw doctor` 重新写入 supervisor 配置前会提示用户。
- 使用 `openclaw doctor --yes` 接受默认修复提示。
- 使用 `openclaw doctor --repair` 不提示直接应用修复。
- 使用 `openclaw doctor --repair --force` 覆盖自定义的 supervisor 配置。
- 当令牌认证启用且 `gateway.auth.token` 使用 SecretRef 管理时，doctor 在服务安装/修复阶段验证 SecretRef，但不会在 supervisor 服务环境元数据中保存明文令牌。
- 当令牌认证启用且令牌 SecretRef 未解析时，doctor 阻止安装/修复流程，并提供操作指导。
- 若同时配置了 `gateway.auth.token` 和 `gateway.auth.password`，且未显式设置 `gateway.auth.mode`，doctor 阻止安装/修复，并要求明确指定模式。
- 已可通过 `openclaw gateway install --force` 强制完全重写。

### 16) 网关运行时 + 端口诊断

Doctor 检查服务运行状态（PID、最后退出码），服务安装但未运行时发出警告。检查默认端口（18789）冲突，报告可能原因（网关已运行，SSH 隧道占用等）。

### 17) 网关运行时最佳实践

当网关服务运行于 Bun 或通过版本管理工具安装的 Node 路径（如 `nvm`、`fnm`、`volta`、`asdf`）时，doctor 发出警告。WhatsApp 和 Telegram 频道需要 Node，版本管理路径升级后可能因服务未加载 shell 初始化环境导致失效。doctor 提供迁移至系统 Node 安装（Homebrew/apt/choco）方案。

### 18) 配置写入 + 向导元数据

Doctor 持久保存任何配置修改，并记录向导元数据以标记 doctor 运行版本。

### 19) 工作区提示（备份 + 内存系统）

当缺少工作区内存系统时，doctor 建议添加该功能；若工作区未使用 git 备份，则打印备份提醒。

请参阅 [/concepts/agent-workspace](/concepts/agent-workspace) 以获取工作区结构和 git 备份（推荐使用私有 GitHub 或 GitLab）的完整指南。

## 相关内容

- [网关故障排查](/gateway/troubleshooting)
- [网关运行手册](/gateway)
