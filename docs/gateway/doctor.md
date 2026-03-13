---
summary: "Doctor 命令：健康检查、配置迁移和修复步骤"
read_when:
  - 添加或修改 doctor 迁移
  - 引入破坏性配置更改
title: "Doctor"
---

# Doctor

`openclaw doctor` 是 OpenClaw 的修复 + 迁移工具。它修复过时的配置/状态，检查健康状况，并提供可操作的修复步骤。

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

- 可选的预更新（仅交互模式）用于 git 安装。
- UI 协议新鲜度检查（当协议模式更新时重建控制 UI）。
- 健康检查 + 重启提示。
- 技能状态总结（符合条件/缺失/阻塞）。
- 配置规范化以处理旧值。
- OpenCode Zen 提供者覆盖警告（`models.providers.opencode` / `models.providers.opencode-go`）。
- 旧版磁盘状态迁移（sessions/agent 目录/WhatsApp 认证）。
- 旧版定时任务存储迁移（`jobId`、`schedule.cron`、顶层 delivery/payload 字段，payload 中的 `provider`，简单 `notify: true` webhook 兼容任务）。
- 状态完整性和权限检查（sessions、转录、状态目录）。
- 本地运行时配置文件权限检查（chmod 600）。
- 模型认证健康检查：检查 OAuth 过期，能刷新即将过期的令牌，并报告认证配置文件的冷却/禁用状态。
- 额外工作区目录检测（`~/openclaw`）。
- 沙箱启用时的镜像修复。
- 旧版服务迁移与额外网关检测。
- 网关运行时检查（服务已安装但未运行；缓存的 launchd 标签）。
- 通道状态警告（从运行中的网关探测）。
- Supervisor 配置审计（launchd/systemd/schtasks）及可选修复。
- 网关运行时最佳实践检查（Node 与 Bun，版本管理路径）。
- 网关端口冲突诊断（默认端口 `18789`）。
- 开放 DM 策略的安全警告。
- 本地令牌模式下的网关认证检查（无令牌源时提供生成令牌；不覆盖 SecretRef 配置）。
- Linux 下 systemd linger 检查。
- 源码安装检测（pnpm 工作区不匹配、缺少 UI 资源、缺少 tsx 二进制）。
- 写入更新后的配置 + 向导元数据。

## 详细行为和原理

### 0) 可选更新（git 安装）

如果是 git 检出并且 doctor 运行在交互模式，doctor 会提供运行前更新（fetch/rebase/build）。

### 1) 配置规范化

如果配置包含旧值格式（例如 `messages.ackReaction` 没有针对频道的覆盖），doctor 会规范化到当前协议结构。

### 2) 旧版配置键迁移

当配置包含已弃用键时，其他命令拒绝运行并提示运行 `openclaw doctor`。

Doctor 会：

- 说明发现了哪些旧版键。
- 展示应用的迁移方案。
- 重写 `~/.openclaw/openclaw.json`，更新为当前协议。

网关在启动时检测到旧版配置格式时也会自动运行 doctor 迁移，因此过时配置可无需手动操作自动修复。

当前迁移包括：

- `routing.allowFrom` → `channels.whatsapp.allowFrom`
- `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
- `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
- `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
- `routing.queue` → `messages.queue`
- `routing.bindings` → 顶层 `bindings`
- `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
- `routing.agentToAgent` → `tools.agentToAgent`
- `routing.transcribeAudio` → `tools.media.audio.models`
- `bindings[].match.accountID` → `bindings[].match.accountId`
- 对于存在命名 `accounts` 但缺失 `accounts.default` 的频道，将顶层单账户频道值迁移至 `channels.<channel>.accounts.default`（如果存在）
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*`（tools/elevated/exec/sandbox/subagents）
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks` →
  `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`

Doctor 还对多账户频道的默认账户设置提供警告：

- 当配置了两个及以上的 `channels.<channel>.accounts` 条目，但未设置 `channels.<channel>.defaultAccount` 或全局 `accounts.default` 时，doctor 会警告后备路由可能选择到意外账户。
- 当 `channels.<channel>.defaultAccount` 配置了未知账户 ID，doctor 会警告并列出所有配置的账户 ID。

### 2b) OpenCode Zen 提供者覆盖

如果您手动添加了 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`，该配置会覆盖来自 `@mariozechner/pi-ai` 的内置 OpenCode 目录，可能导致所有模型统一使用错误的 API 或成本归零。Doctor 会警告您移除该覆盖，从而恢复每模型的 API 路由和费用结算。

### 3) 旧版状态迁移（磁盘结构）

Doctor 支持将旧版磁盘结构迁移至当前结构：

- 会话存储 + 转录：
  - 从 `~/.openclaw/sessions/` 迁移到 `~/.openclaw/agents/<agentId>/sessions/`
- Agent 目录：
  - 从 `~/.openclaw/agent/` 迁移到 `~/.openclaw/agents/<agentId>/agent/`
- WhatsApp 认证状态（Baileys）：
  - 从旧版 `~/.openclaw/credentials/*.json`（不包括 `oauth.json`）
  - 迁移至 `~/.openclaw/credentials/whatsapp/<accountId>/...` （默认账户 ID 为 `default`）

这些迁移为最佳努力且幂等操作；doctor 会在留下旧目录备份时发出警告。网关和 CLI 也会在启动时自动迁移旧版 session 和 agent 目录，使历史、认证和模型落入每代理路径，无需手动 doctor 运行。WhatsApp 认证的迁移仅通过 `openclaw doctor` 触发。

### 3b) 旧版定时任务存储迁移

Doctor 检查定时任务存储（默认文件 `~/.openclaw/cron/jobs.json`，或被覆盖的 `cron.store`）中仍被调度器兼容的旧任务格式。

当前迁移包括：

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- 顶层 payload 字段（`message`、`model`、`thinking` 等）迁移到 `payload`
- 顶层 delivery 字段（`deliver`、`channel`、`to`、`provider` 等）迁移到 `delivery`
- payload 中 `provider` 作为 delivery 频道别名迁移为明确的 `delivery.channel`
- 简单旧版 `notify: true` webhook 兼容任务迁移为明确的 `delivery.mode="webhook"` 和 `delivery.to=cron.webhook`

Doctor 只在不改变行为的情况下自动迁移 `notify: true` 任务。如果任务同时包含旧式通知兼容和现存非 webhook 交付方式，doctor 会警告并保持该任务等待人工复核。

### 4) 状态完整性检查（会话持久化、路由及安全）

状态目录是运行时的核心。如果丢失，会话、凭证、日志和配置都将丢失（除非有外部备份）。

Doctor 检查：

- **状态目录缺失**：警告将会造成灾难性状态丢失，提示创建目录并提醒不能恢复丢失数据。
- **状态目录权限**：验证可写，提供修复权限选项（如果检测到所有者/组不匹配，附带 `chown` 提示）。
- **macOS 云同步状态目录**：警告状态目录位于 iCloud Drive 路径（`~/Library/Mobile Documents/com~apple~CloudDocs/...` 或 `~/Library/CloudStorage/...`），因同步路径可能引起 IO 变慢和锁竞争。
- **Linux SD 卡或 eMMC 状态目录**：警告状态目录位于 `mmcblk*` 设备挂载点，因 SD/eMMC 随机 IO 性能受限且写入加速磨损。
- **会话目录缺失**：`sessions/` 目录及会话存储目录必须存在以持久化历史并避免 `ENOENT` 异常。
- **转录文件不匹配**：提示最近会话记录缺少对应的转录文件。
- **主会话“单行 JSONL”**：提示主转录文件只有一行（历史未正常累积）。
- **多个状态目录**：警告存在多个 `~/.openclaw` 目录于不同家目录，或环境变量 `OPENCLAW_STATE_DIR` 指向其他目录，导致历史数据分裂。
- **远程模式提醒**：当 `gateway.mode=remote`，提醒在远端主机运行 doctor（状态位于远端）。
- **配置文件权限**：警告本地 `~/.openclaw/openclaw.json` 是组或公共可读，建议收紧到 `600`。

### 5) 模型认证健康（OAuth 过期）

Doctor 检查认证存储中的 OAuth 配置文件，警告令牌即将过期或已过期，且在安全条件下尝试刷新它们。如果 Anthropic Claude Code 配置文件已过期，建议运行 `claude setup-token`（或粘贴 setup-token）。该刷新过程仅在交互（TTY）模式提示，`--non-interactive` 参数跳过刷新。

Doctor 还报告导致配置文件暂不可用的状况：

- 短暂冷却（速率限制 / 超时 / 认证失败）
- 长期禁用（计费或额度失败）

### 6) Hooks 模型验证

如果设置了 `hooks.gmail.model`，doctor 验证模型引用是否在目录及白名单中，不合法或不允许时发出警告。

### 7) 沙箱镜像修复

沙箱开启时，doctor 检查 Docker 镜像，缺失或过期时提示构建或切换使用旧镜像名称。

### 8) 网关服务迁移和清理提示

Doctor 检测旧版网关服务（launchd/systemd/schtasks），提供移除建议和按当前端口安装 OpenClaw 服务。还能扫描额外网关类服务并发出清理提示。已命名配置文件的 OpenClaw 网关服务被视为一级服务，不被标记为“额外”。

### 9) 安全警告

当某些提供者开放 DM 权限且无允许列表，或者策略配置危险时，doctor 发出警告。

### 10) systemd linger（Linux）

当网关作为 systemd 用户服务运行时，doctor 确保 `linger` 功能开启，保证登出后网关持续运行。

### 11) 技能状态

Doctor 打印当前工作区的合格、缺失、阻塞中的技能快速摘要。

### 12) 网关认证检查（本地令牌）

Doctor 检查本地网关令牌认证状态：

- 令牌模式下需令牌但无令牌源时，提供生成令牌选项。
- 当 `gateway.auth.token` 使用 SecretRef 管理且当前不可用时，发出警告且不覆盖为明文。
- `openclaw doctor --generate-gateway-token` 仅在无 SecretRef 配置时强制生成令牌。

### 12b) 只读 SecretRef 感知修复

某些修复流程需检查配置内凭据，但不能破坏运行时的快速失败：

- `openclaw doctor --fix` 使用相同的只读 SecretRef 摘要模型与状态命令，实现针对性的配置修复。
- 如 Telegram `allowFrom` / `groupAllowFrom` 中的 `@username` 修复会使用已配置的机器人凭据。
- 若 Telegram 机器人令牌通过 SecretRef 配置但当前命令路径不可用，doctor 报告凭据配置存在但不可用，避免崩溃或误判为令牌缺失。

### 13) 网关健康检查 + 重启

Doctor 执行健康检查，网关不健康时提供重启建议。

### 14) 通道状态警告

网关健康时，doctor 探测通道状态，并报告带有修复建议的警告。

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

Doctor 检查服务运行状态（PID、最后退出码），服务安装但未运行时发出警告。检查默认端口（18789）冲突，报告可能原因（网关已经运行，SSH 隧道占用等）。

### 17) 网关运行时最佳实践

当网关服务运行于 Bun 或版本管理的 Node 路径（如 `nvm`、`fnm`、`volta`、`asdf`）时，doctor 发出警告。WhatsApp 和 Telegram 频道需要 Node，且版本管理路径升级后可能因服务未加载 shell 初始化环境导致失效。doctor 提供迁移至系统 Node 安装（Homebrew/apt/choco）选项。

### 18) 配置写入 + 向导元数据

Doctor 持久保存任何配置修改，并记录向导元数据以标记 doctor 运行版本。

### 19) 工作区提示（备份 + 内存系统）

当缺少工作区内存系统时，doctor 建议添加该特性；若工作区未使用 git 备份，则打印备份提醒。

详见 [/concepts/agent-workspace](/concepts/agent-workspace) 获取完整工作区结构及建议使用私有 GitHub 或 GitLab 备份的指南。
