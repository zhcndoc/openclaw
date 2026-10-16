---
summary: "医生进行的每次修复、迁移和健康检查的摘要"
title: "医生检查什么"
read_when:
  - "您希望在运行之前了解医生将接触的内容的概述"
  - "您正在决定更改是否属于医生检查"
---

本页总结了 `openclaw doctor` 的功能，并按区域分组。有关每个编号检查的完整行为和基本原理，请点击 [Doctor 页面 ](/gateway/doctor#doctor-pages) 下的链接。

## <a id="what-it-does-(summary)"></a><a id="what-it-does-summary"></a> 它做什么（摘要）

<AccordionGroup>
  <Accordion id="health-ui-and-updates" title="健康、UI 和更新">
    - Git 安装的可选预更新（仅限交互模式）。
    - UI 协议新鲜度检查（当协议 schema 更新时重建 Control UI）。
    - 健康检查＋重启提示。
    - 本机文件系统 （`fs-safe`） 和进程 （`proc-safe`） 帮助程序状态。失踪助手报告图书馆的诊断原因和修复指导；明确禁用本机模式仅供参考。
    - Windows AppContainer 子管道支架。对于早于 1.53.0 的 libuv，子命令会立即失败而不是挂起。在 AppContainer 外部运行 OpenClaw 或使用带有 libuv 1.53.0 或更新版本的 Node 构建。
    - 仅报告问题的 skill 和 plugin 提示；正常的清单保留在 `openclaw skills check` 和 `openclaw plugins list` 中。
    - 运行时工具架构检查报告失败的 MCP 服务器并继续进行其余检查。如果无法确认子进程清理，Doctor 会保留服务器结果并添加清理诊断；在重新运行 Doctor 之前检查或停止受影响的 MCP 进程。
    - 在更新期间，Doctor 推迟 MCP 连接并使用后续命令记录每个启用的服务器。核心工具模式仍在检查中。更新后运行 `openclaw doctor --lint --only core/doctor/runtime-tool-schemas` 以检查 MCP 工具。

  </Accordion>
  <Accordion id="config-and-migrations" title="配置和迁移">
    - 针对旧版值形状的配置规范化。
    - 删除已停用的 `gateway.controlUi.toolTitles` 配置。工具活动描述会自动出现，无需实用新型请求。
    - 检查旧版默认 HTTPS Tailscale 从 LAN- 绑定网关提供服务路由。 Doctor不会改变这些路线，因为状态形状无法证明所有权；确认过时路由后，仅清除其根处理程序并手动配置托管环回入口。已停用的命名服务配置将被删除，并禁用受管入口，直到操作员选择设备路由；自定义外部路线接受手动指导。
    - 将旧版扁平 `talk.*` 字段中的 Talk 配置迁移到 `talk.provider`＋`talk.providers.<provider>`。
    - Browser 迁移检查旧版 Chrome 扩展配置和 Chrome MCP 准备情况，并使用用于本机引导检查和修复的显式命令。
    - OpenCode provider 覆盖警告（`models.providers.opencode`／`opencode-zen`／`opencode-go`）。
    - 旧版 OpenAI Codex provider/profile 迁移（`openai-codex` → `openai`），以及针对过时 `models.providers.openai-codex` 的遮蔽警告。
    - OAuth TLS 先决条件检查 OpenAI Codex OAuth 配置文件。
    - 当 `plugins.allow` 受到限制但工具策略仍然要求通配符或插件拥有的工具时，Plugin/tool 允许列表警告。
    - 旧版磁盘状态迁移（sessions/agent dir/WhatsApp 身份验证）。
    - 旧版 Tailscale 提供商登录从用户配置文件电子邮件别名迁移到提供商身份。
    - 与`openclaw doctor --fix`合并共享所有者配置文件检测和修复；恢复所有者身份，同时保留个人电子邮件、角色和 GitHub 身份。修复后重新连接。
    - 退役QMD内存配置和派生工作空间清理；请参阅 [ 从 QMD](/concepts/memory-builtin#migrating-from-qmd) 迁移。
    - 旧版 plugin manifest contract key 迁移（`speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders`、`webSearchProviders` → `contracts`）。
    - 旧版 cron 存储迁移（`jobId`、`schedule.cron`、顶级 delivery/payload 字段、有效负载 `provider`、`notify: true` Webhook 回退作业）。
    - 旧工作区 `TOOLS.md` 迁移到 `AGENTS.md` 的 `## Tools` 部分，在删除之前存档原始工作区。在 POSIX 上，Doctor 保留现有目标的所有者、组和模式位。如果导入笔记会添加 POSIX 读者或无法保留所有权，则会保留这两个文件并报告警告。这些检查不建立文件系统 ACL 的保存。
    - 修复 Codex CLI runtime pin（`agentRuntime.id: "codex-cli"` → `"codex"`），涵盖 `agents.defaults`、`agents.entries.*` 和 `models.providers.*`（包括单模型条目）。
    - 在 plugin 已启用时清理过时的 plugin 配置；当 `plugins.enabled=false` 时，过时的 plugin 引用会作为无效的隔离配置保留。

  </Accordion>
  <Accordion id="state-and-integrity" title="状态和诚信">
    - 检查 session lock 文件并清理过时的 lock。
    - 修复受影响的 2026.4.24 构建所创建的重复 prompt-rewrite 分支对应的 session transcript。
    - 检测卡住的主 session 和 subagent 重启恢复 tombstone。Doctor 会报告被阻塞的 session，并且只修复与现有 tombstone 冲突的过时 aborted 标记；不会重新启用自动恢复。
    - 状态完整性和权限检查（sessions、transcripts、state 目录）。
    - 在本地运行时检查配置文件权限（chmod 600）。
    - Model 身份验证运行状况：检查 OAuth 过期情况，可以刷新过期令牌，并报告身份验证配置文件 cooldown/disabled 状态。
    - Claude CLI 发现使用 Anthropic 插件的可执行解析器，包括 `~/.local/bin` 中的本机安装。在更新期间，Doctor子级可以继承网关服务的较窄`PATH`；当发现的二进制文件位于该路径之外时，Doctor 会报告其位置。丢失的二进制文件仍然会产生安装指南。

  </Accordion>
  <Accordion id="gateway-services-and-supervisors" title="网关、服务和监管者">
    - 在启用 sandboxing 时修复 sandbox image。
    - 旧版服务迁移和额外 Gateway 检测。
    - Matrix channel 旧版状态迁移（在 `--fix`／`--repair` 模式下）。
    - Gateway runtime 检查（服务已安装但未运行；缓存的 launchd label）。
    - 通道状态警告（从正在运行的网关检查）。
    - Channel 专属权限检查位于 `openclaw channels capabilities` 下；例如，Discord voice channel 权限通过 `openclaw channels capabilities --channel discord --target channel:<channel-id>` 进行审计。
    - WhatsApp 响应能力报告网关压力并检测到本地 TUI 客户端，而不将压力归因于这些客户端。在决定是否关闭客户端之前检查[网关诊断](/gateway/diagnostics)；医生并没有阻止他们。
    - Codex 路由修复主要模型、后备、image/video 生成模型、heartbeat/subagent/compaction 覆盖、挂钩、通道模型覆盖和会话路由引脚中的旧版 `openai-codex/*` 模型参考； `--fix`将它们重写为`openai/*`，将`openai-codex:*` auth profiles/order迁移到`openai:*`，删除过时的会话运行时引脚，并让修复后的有效路由确定Codex是否兼容。
    - Supervisor 配置审核 （launchd/systemd/schtasks） 以及可选修复。
    - 清理 Gateway 服务中嵌入的 proxy 环境：这些服务在安装或更新期间捕获了 shell 的 `HTTP_PROXY`／`HTTPS_PROXY`／`NO_PROXY` 值。
    - Gateway runtime 检查（不受支持的旧版 Bun 服务、版本管理器路径）。
    - Gateway 端口冲突诊断（默认端口 `18789`）。

  </Accordion>
  <Accordion id="auth-security-and-pairing" title="身份验证、安全性和配对">
    - 开放 DM 策略的安全警告。
    - 本地 token 模式的 Gateway 认证检查（当不存在 token 来源时提供生成 token；不会覆盖 token SecretRef 配置）。
    - 设备配对故障检测（待处理的首次配对请求、待处理的 role/scope 升级、过时的本地设备令牌缓存漂移和配对记录身份验证漂移）。

  </Accordion>
  <Accordion id="workspace-and-shell" title="工作区和外壳">
    - 部分或浅层注册表拥有的项目克隆警告，针对每个检测到的部分克隆密钥和浅层历史记录提供手动修复命令。
    - systemd 对 Linux 进行持续检查。
    - Workspace 引导程序文件大小检查（truncation/near-limit 上下文文件警告）。
    - 检查默认 agent 的 Skills 就绪状态；报告缺少 bin、env、配置或 OS 要求的 allowed skills，并且 `--fix` 可以在 `skills.entries` 中禁用不可用的 skill。
    - Shell 完成状态检查和自动 install/upgrade.
    - Memory search embedding provider 就绪状态检查（本地 model 或远程 API key）。
    - Source install 检查（pnpm workspace 不匹配、缺少 UI 资源、缺少 tsx binary）。
    - 写入更新后的配置＋wizard metadata。

  </Accordion>
</AccordionGroup>
