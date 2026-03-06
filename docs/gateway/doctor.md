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

- 可选的飞行前更新（仅交互式，针对 git 安装）。
- UI 协议新鲜度检查（当协议模式更新时重建 Control UI）。
- 健康检查 + 重启提示。
- 技能状态汇总（合格/缺失/阻塞）。
- 旧版值的配置规范化。
- OpenCode Zen 提供者覆盖警告（`models.providers.opencode`）。
- 旧版磁盘状态迁移（会话/agent 目录/WhatsApp 认证）。
- 状态完整性和权限检查（会话、转录、状态目录）。
- 本地运行时配置文件权限检查（chmod 600）。
- 模型认证健康：检查 OAuth 过期，可刷新将过期令牌，报告认证-配置文件冷却/禁用状态。
- 额外工作区目录检测（`~/openclaw`）。
- 启用沙箱时的沙箱镜像修复。
- 旧版服务迁移和额外网关检测。
- 网关运行时检查（服务已安装但未运行；缓存的 launchd 标签）。
- 通道状态警告（从运行中的网关探测）。
- Supervisor 配置审计（launchd/systemd/schtasks）及可选修复。
- 网关运行时最佳实践检查（Node vs Bun，版本管理路径）。
- 网关端口冲突诊断（默认 `18789`）。
- 开放 DM 策略的安全警告。
- 本地令牌模式的网关认证检查（无令牌源时提供令牌生成；不覆盖令牌 SecretRef 配置）。
- Linux 上的 systemd linger 检查。
- 源码安装检查（pnpm 工作区不匹配，缺少 UI 资源，缺少 tsx 二进制）。
- 写入更新配置 + 向导元数据。

## 详细行为和原理

### 0) 可选更新（git 安装）

如果是 git 检出且 doctor 以交互模式运行，会在运行 doctor 前提示更新（fetch/rebase/build）。

### 1) 配置规范化

如果配置包含旧版值格式（例如没有频道特定覆盖的 `messages.ackReaction`），doctor 会将它们规范化为当前架构。

### 2) 旧版配置键迁移

当配置中存在已弃用的键时，其他命令会拒绝运行并要求您执行 `openclaw doctor`。

Doctor 会：

- 说明检测到哪些旧版键。
- 显示应用的迁移。
- 重写 `~/.openclaw/openclaw.json` 为更新后的架构。

网关启动时也会检测旧版配置格式并自动运行 doctor 迁移，因此无需手动干预即可修复过时的配置。

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
- 对于有命名 `accounts` 但缺少 `accounts.default` 的频道，将顶层单账户频道值移动到 `channels.<channel>.accounts.default`（如果存在）
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*`（tools/elevated/exec/sandbox/subagents）
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`

Doctor 警告还包括多账户频道的账户默认设置指导：

- 如果配置了两个及以上的 `channels.<channel>.accounts` 条目但没设置 `channels.<channel>.defaultAccount` 或 `accounts.default`，doctor 会警告后备路由可能选中意外账户。
- 如果 `channels.<channel>.defaultAccount` 设置了未知账户 ID，doctor 会警告并列出配置的账户 ID。

### 2b) OpenCode Zen 提供者覆盖

如果您手动添加了 `models.providers.opencode`（或 `opencode-zen`），它会覆盖来自 `@mariozechner/pi-ai` 的内置 OpenCode Zen 目录。这可能导致所有模型统一使用单一 API 或成本归零。Doctor 会警告以便您移除覆盖，恢复每模型的 API 路由和成本。

### 3) 旧版状态迁移（磁盘布局）

Doctor 可将旧版磁盘结构迁移至当前结构：

- 会话存储 + 转录：
  - 从 `~/.openclaw/sessions/` 到 `~/.openclaw/agents/<agentId>/sessions/`
- Agent 目录：
  - 从 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`
- WhatsApp 认证状态（Baileys）：
  - 从旧版 `~/.openclaw/credentials/*.json`（除 `oauth.json` 外）
  - 到 `~/.openclaw/credentials/whatsapp/<accountId>/...`（默认账户 id：`default`）

这些迁移是尽力而为且幂等的；doctor 遗留任何旧文件夹作为备份时会发出警告。网关/CLI 也会在启动时自动迁移旧会话和 agent 目录，使历史/认证/模型落入每代理路径，无需手动运行 doctor。WhatsApp 认证故意仅通过 `openclaw doctor` 迁移。

### 4) 状态完整性检查（会话持久化、路由和安全）

状态目录是运行中的关键。如果丢失，您将失去会话、凭据、日志和配置（除非有其他备份）。

Doctor 检查：

- **状态目录缺失**：警告灾难性状态丢失，提示重建目录，提醒无法恢复丢失数据。
- **状态目录权限**：验证可写性；提供修复权限建议（检测到所有者/组不匹配时提示 `chown`）。
- **macOS 云同步状态目录**：警告状态目录位于 iCloud Drive 下（`~/Library/Mobile Documents/com~apple~CloudDocs/...`）或 `~/Library/CloudStorage/...`，因同步路径可能导致较慢 I/O 和锁/同步竞争。
- **Linux SD 或 eMMC 状态目录**：警告状态位于 `mmcblk*` 挂载源，因为 SD 或 eMMC 随机 I/O 慢且写入会缩短寿命。
- **会话目录缺失**：`sessions/` 和会话存储目录是持久历史和避免 `ENOENT` 崩溃所必须。
- **转录不匹配**：警告最近会话条目缺失转录文件。
- **主会话“一行 JSONL”**：标记主转录文件仅一行（历史未累积）。
- **多状态目录**：警告存在多个 `~/.openclaw` 文件夹或 `OPENCLAW_STATE_DIR` 指向不同位置（历史可能分裂于多个安装间）。
- **远程模式提醒**：若 `gateway.mode=remote`，提醒您应在远程主机运行 doctor（状态位于远端）。
- **配置文件权限**：警告 `~/.openclaw/openclaw.json` 被组或其他人读取，提供收紧到 `600` 权限。

### 5) 模型认证健康（OAuth 过期）

Doctor 检查认证存储中的 OAuth 配置文件，警告令牌即将过期或已过期，且在安全条件下可刷新它们。如果 Anthropic Claude Code 配置文件已过期，建议运行 `claude setup-token`（或粘贴 setup-token）。仅交互模式（TTY）下提示刷新；`--non-interactive` 跳过刷新尝试。

Doctor 同时报告以下导致配置文件暂时不可用的状态：

- 短暂冷却（速率限制/超时/认证失败）
- 较长禁用（计费/额度失败）

### 6) Hooks 模型验证

如果设置了 `hooks.gmail.model`，doctor 会验证模型引用是否在目录和白名单中，且无效或不允许时警告。

### 7) 沙箱镜像修复

沙箱启用时，doctor 检查 Docker 镜像，缺失时提示构建或切换到旧镜像名称。

### 8) 网关服务迁移和清理提示

Doctor 检测旧版网关服务（launchd/systemd/schtasks），提供移除建议并以当前网关端口安装 OpenClaw 服务。也能扫描额外的网关类服务并显示清理提示。命名配置文件的 OpenClaw 网关服务被视为一流服务，不被标记为“额外”。

### 9) 安全警告

当某提供者开放 DM 且无允许列表，或策略设置危险时，doctor 发出警告。

### 10) systemd linger（Linux）

若以 systemd 用户服务运行，doctor 确保开启 linger，保持网关在登出后继续存活。

### 11) 技能状态

Doctor 打印当前工作区的合格/缺失/阻塞技能快速摘要。

### 12) 网关认证检查（本地令牌）

Doctor 检查本地网关令牌认证准备状态。

- 令牌模式需令牌但无令牌源时，提供生成令牌选项。
- 当 `gateway.auth.token` 为 SecretRef 管理且不可用时，警告且不覆盖为明文。
- `openclaw doctor --generate-gateway-token` 仅当无令牌 SecretRef 配置时强制生成。

### 12b) 只读 SecretRef 感知修复

一些修复流程需检查配置凭据而不牺牲运行时快速失败机制。

- `openclaw doctor --fix` 使用同样的只读 SecretRef 摘要模型与状态系列命令，以实现有针对性的配置修复。
- 例如：Telegram `allowFrom` / `groupAllowFrom` `@username` 修复尝试用已配置的机器人凭据。
- 若 Telegram 机器人令牌通过 SecretRef 配置但当前命令路径不可用，doctor 报告凭据配置但不可用，避免崩溃或误报令牌缺失。

### 13) 网关健康检查 + 重启

Doctor 运行健康检查，网关不健康时提供重启建议。

### 14) 通道状态警告

网关健康时，doctor 运行通道状态探测，并报告带建议修复的警告。

### 15) Supervisor 配置审计 + 修复

Doctor 检查安装的 supervisor 配置（launchd/systemd/schtasks）是否缺少或过时（例如 systemd 网络联通依赖和重启延迟）。发现不匹配时，建议更新，并可重写服务文件/任务为当前默认值。

说明：

- `openclaw doctor` 重写 supervisor 配置前会提示。
- `openclaw doctor --yes` 接受默认修复提示。
- `openclaw doctor --repair` 无需提示直接应用修复。
- `openclaw doctor --repair --force` 覆盖自定义 supervisor 配置。
- 令牌认证需令牌且 `gateway.auth.token` 为 SecretRef 管理时，doctor 服务安装/修复会验证 SecretRef，但不在 supervisor 服务环境元数据中持久化明文令牌。
- 令牌认证需令牌且配置的令牌 SecretRef 未解析时，doctor 阻止安装/修复路径并提供可操作指导。
- 若同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 且 `gateway.auth.mode` 未设置，doctor 阻止安装/修复，要求显式设置模式。
- 可通过 `openclaw gateway install --force` 强制完全重写。

### 16) 网关运行时 + 端口诊断

Doctor 检查服务运行状态（PID、最后退出状态），服务已安装但未运行时发出警告。还检查网关端口（默认 `18789`）冲突，报告可能原因（网关已运行，SSH 隧道等）。

### 17) 网关运行时最佳实践

当网关服务运行于 Bun 或版本管理的 Node 路径（`nvm`、`fnm`、`volta`、`asdf` 等）时，doctor 会警告。WhatsApp 和 Telegram 频道需要 Node，且版本管理路径升级后可能因服务未加载 shell 初始化而失效。doctor 提供迁移至系统 Node 安装（Homebrew/apt/choco）的选项。

### 18) 配置写入 + 向导元数据

Doctor 持久保存任何配置变更，并盖章向导元数据记录 doctor 运行。

### 19) 工作区提示（备份 + 内存系统）

当缺少工作区内存系统时，doctor 建议添加，并在工作区未使用 git 备份时打印备份提示。

详见 [/concepts/agent-workspace](/concepts/agent-workspace) 获取完整的工作区结构和 git 备份（推荐私有 GitHub 或 GitLab）指南。
