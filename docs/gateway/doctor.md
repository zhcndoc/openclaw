---
summary: "Doctor 命令：健康检查、配置迁移和修复步骤"
read_when:
  - "您需要修复过时的配置、状态或网关服务"
  - "您想要找到涵盖您问题的医生页面"
  - "您正在添加或修改医生迁移或破坏配置更改"
title: "医生"
sidebarTitle: "医生"
---

`openclaw doctor`是OpenClaw的修复和迁移工具。它修复过时的 config/state、检查运行状况并提供可行的修复步骤。

此页是一个索引。医生的记录共七页，每个读者的工作一页。打开与您的任务匹配的页面。

## <a id="doctor-pages"></a> 医生页面

| 页面                                                                          | 读它的时候                                                                                                  |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| [润医生](/gateway/doctor/running)                                         | 运行命令，选择自动化标志，然后读取只读 lint 报告。                                   |
| [医生检查什么](/gateway/doctor/checks)                                  | 按区域分组的每次修复、迁移和运行状况检查的摘要。                                      |
| [配置和迁移修复](/gateway/doctor/config-migrations)             | 检查 0-2：配置规范化、旧版配置密钥表和更新时架构发布。            |
| [提供商和路线维修](/gateway/doctor/provider-repairs)                | 检查 2b-2g：提供商覆盖、浏览器和 Chrome MCP 准备情况、OAuth TLS 以及路由清理。             |
| [状态、会话和插件修复](/gateway/doctor/state-and-sessions)      | 检查 3-7b：磁盘布局、cron 存储、会话完整性、模型身份验证、沙箱和插件安装。            |
| [网关、服务和安全检查](/gateway/doctor/gateway-and-services) | 检查 8-17：服务迁移、配对、安全警告、工作区状态、身份验证、运行状况和主管。 |
| [工作空间技巧和梦想 UI 行动](/gateway/doctor/workspace-and-dreams)  | 检查 18-20，加上 Control UI Dreams 回填、重置和清除操作。                                  |

## <a id="where-each-section-moved"></a> 各部分移动的地方

以前单页版本中的每个部分和检查标题都保留其锚点，因此现有链接（例如 `/gateway/doctor#9-security-warnings`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="quick-start" />[快速入门](/gateway/doctor/running#quick-start)
- <a id="headless-and-automation-modes" />[无头和自动化模式](/gateway/doctor/running#headless-and-automation-modes)
- <a id="schema-publication-during-a-2026.9.2-update" />[2026.9.2 更新期间的架构发布](/gateway/doctor/config-migrations#schema-publication-during-a-2026.9.2-update)
- <a id="read-only-lint-mode" />[只读 lint 模式](/gateway/doctor/running#read-only-lint-mode)
- <a id="what-it-does-(summary)" />[它的作用（摘要）](/gateway/doctor/checks#what-it-does-summary)
- <a id="dreams-ui-backfill-and-reset" />[梦想UI回填并重置](/gateway/doctor/workspace-and-dreams#dreams-ui-backfill-and-reset)
- <a id="detailed-behavior-and-rationale" />[详细的行为和原理](/gateway/doctor#doctor-pages) - 现在有五页，上面列出。
- <a id="schema-publication-during-a-2026-9-2-update" />[2026.9.2 更新期间的架构发布](/gateway/doctor/config-migrations#schema-publication-during-a-2026-9-2-update)
- <a id="what-it-does-summary" />[它的作用（摘要）](/gateway/doctor/checks#what-it-does-summary)
- <a id="yes" />[--是](/gateway/doctor/running#yes)
- <a id="fix" />[--修复](/gateway/doctor/running#fix)
- <a id="lint" />[--lint](/gateway/doctor/running#lint)
- <a id="fix-force" />[--修复--force](/gateway/doctor/running#fix-force)
- <a id="non-interactive" />[--非交互式](/gateway/doctor/running#non-interactive)
- <a id="deep" />[--深](/gateway/doctor/running#deep)
- <a id="health-ui-and-updates" />[健康、UI 和更新](/gateway/doctor/checks#health-ui-and-updates)
- <a id="config-and-migrations" />[配置和迁移](/gateway/doctor/checks#config-and-migrations)
- <a id="state-and-integrity" />[状态与诚信](/gateway/doctor/checks#state-and-integrity)
- <a id="gateway-services-and-supervisors" />[网关、服务和监控器](/gateway/doctor/checks#gateway-services-and-supervisors)
- <a id="auth-security-and-pairing" />[身份验证、安全性和配对](/gateway/doctor/checks#auth-security-and-pairing)
- <a id="workspace-and-shell" />[工作区和外壳](/gateway/doctor/checks#workspace-and-shell)
- <a id="0-optional-update-git-installs" />[0。可选更新（git 安装）](/gateway/doctor/config-migrations#0-optional-update-git-installs)
- <a id="1-config-normalization" />[1。配置标准化](/gateway/doctor/config-migrations#1-config-normalization)
- <a id="2-legacy-config-key-migrations" />[2。旧版配置密钥迁移](/gateway/doctor/config-migrations#2-legacy-config-key-migrations)
- <a id="2b-opencode-provider-overrides" />[2b。 OpenCode 提供商覆盖](/gateway/doctor/provider-repairs#2b-opencode-provider-overrides)
- <a id="2c-browser-migration-and-chrome-mcp-readiness" />[2c。浏览器迁移和 Chrome MCP 准备情况](/gateway/doctor/provider-repairs#2c-browser-migration-and-chrome-mcp-readiness)
- <a id="2d-oauth-tls-prerequisites" />[2d。 OAuth TLS 先决条件](/gateway/doctor/provider-repairs#2d-oauth-tls-prerequisites)
- <a id="2e-codex-oauth-provider-overrides" />[2e。 Codex OAuth 提供商覆盖](/gateway/doctor/provider-repairs#2e-codex-oauth-provider-overrides)
- <a id="2f-codex-route-repair" />[2f。 Codex 航线修复](/gateway/doctor/provider-repairs#2f-codex-route-repair)
- <a id="2g-session-route-cleanup" />[2g。会话路由清理](/gateway/doctor/provider-repairs#2g-session-route-cleanup)
- <a id="3-legacy-state-migrations-disk-layout" />[3。旧状态迁移（磁盘布局）](/gateway/doctor/state-and-sessions#3-legacy-state-migrations-disk-layout)
- <a id="3a-legacy-plugin-manifest-migrations" />[3a。旧版插件清单迁移](/gateway/doctor/state-and-sessions#3a-legacy-plugin-manifest-migrations)
- <a id="3b-legacy-cron-store-migrations" />[3b。旧版 cron 存储迁移](/gateway/doctor/state-and-sessions#3b-legacy-cron-store-migrations)
- <a id="3c-session-lock-cleanup" />[3c。会话锁清理](/gateway/doctor/state-and-sessions#3c-session-lock-cleanup)
- <a id="3d-session-transcript-branch-repair" />[3d。会话记录分支修复](/gateway/doctor/state-and-sessions#3d-session-transcript-branch-repair)
- <a id="4-state-integrity-checks-session-persistence-routing-and-safety" />[4。状态完整性检查（会话持久性、路由和安全）](/gateway/doctor/state-and-sessions#4-state-integrity-checks-session-persistence-routing-and-safety)
- <a id="5-model-auth-health-oauth-expiry" />[5。模型授权健康（OAuth 过期）](/gateway/doctor/state-and-sessions#5-model-auth-health-oauth-expiry)
- <a id="6-hooks-model-validation" />[6。挂钩模型验证](/gateway/doctor/state-and-sessions#6-hooks-model-validation)
- <a id="7-sandbox-image-repair" />[7。沙箱镜像修复](/gateway/doctor/state-and-sessions#7-sandbox-image-repair)
- <a id="7b-plugin-install-cleanup" />[7b。插件安装cleanup](/gateway/doctor/state-and-sessions#7b-plugin-install-cleanup)
- <a id="8-gateway-service-migrations-and-cleanup-hints" />[8。网关服务迁移和清理提示](/gateway/doctor/gateway-and-services#8-gateway-service-migrations-and-cleanup-hints)
- <a id="8b-startup-matrix-migration" />[8b。启动 Matrix 迁移](/gateway/doctor/gateway-and-services#8b-startup-matrix-migration)
- <a id="8c-device-pairing-and-auth-drift" />[8c。设备配对和授权漂移](/gateway/doctor/gateway-and-services#8c-device-pairing-and-auth-drift)
- <a id="9-security-warnings" />[9。安全警告](/gateway/doctor/gateway-and-services#9-security-warnings)
- <a id="10-systemd-linger-linux" />[10。 systemd 徘徊 （Linux）](/gateway/doctor/gateway-and-services#10-systemd-linger-linux)
- <a id="11-workspace-status-skills-plugins-and-taskflows" />[11。工作区状态（技能和插件）](/gateway/doctor/gateway-and-services#11-workspace-status-skills-plugins-and-taskflows)
- <a id="11b-bootstrap-file-size" />[11b。引导文件大小](/gateway/doctor/gateway-and-services#11b-bootstrap-file-size)
- <a id="11c-shell-completion" />[11c。外壳完成](/gateway/doctor/gateway-and-services#11c-shell-completion)
- <a id="11d-stale-channel-plugin-cleanup" />[11d。陈旧通道插件清理](/gateway/doctor/gateway-and-services#11d-stale-channel-plugin-cleanup)
- <a id="11e-project-clone-shape" />[11e。项目克隆形状](/gateway/doctor/gateway-and-services#11e-project-clone-shape)
- <a id="12-gateway-auth-checks-local-token" />[12。网关身份验证检查（本地令牌）](/gateway/doctor/gateway-and-services#12-gateway-auth-checks-local-token)
- <a id="12b-read-only-secretref-aware-repairs" />[12b。只读 SecretRef 感知修复](/gateway/doctor/gateway-and-services#12b-read-only-secretref-aware-repairs)
- <a id="13-gateway-health-check-restart" />[13。网关健康检查+重启](/gateway/doctor/gateway-and-services#13-gateway-health-check-restart)
- <a id="13b-memory-search-readiness" />[13b。内存搜索准备情况](/gateway/doctor/gateway-and-services#13b-memory-search-readiness)
- <a id="14-channel-status-warnings" />[14。通道状态警告](/gateway/doctor/gateway-and-services#14-channel-status-warnings)
- <a id="15-supervisor-config-audit-repair" />[15。 Supervisor 配置审核 + 修复](/gateway/doctor/gateway-and-services#15-supervisor-config-audit-repair)
- <a id="16-gateway-runtime-port-diagnostics" />[16。网关运行时 + 端口诊断](/gateway/doctor/gateway-and-services#16-gateway-runtime-port-diagnostics)
- <a id="17-gateway-runtime-best-practices" />[17。网关运行时最佳实践](/gateway/doctor/gateway-and-services#17-gateway-runtime-best-practices)
- <a id="18-config-write-wizard-metadata" />[18。配置写入+向导元数据](/gateway/doctor/workspace-and-dreams#18-config-write-wizard-metadata)
- <a id="19-workspace-tips-backup-memory-system" />[19。工作区提示（备份+内存系统）](/gateway/doctor/workspace-and-dreams#19-workspace-tips-backup-memory-system)
- <a id="20-repointed-workspace-aliases" />[20。重新指向工作区别名](/gateway/doctor/workspace-and-dreams#20-repointed-workspace-aliases)

## <a id="related"></a> 相关内容

- [Gateway 运行手册](/gateway)
- [网关故障排查](/gateway/troubleshooting)
- [`openclaw status`](/cli/status) — 本地诊断和通道检查
- [配置参考](/gateway/configuration-reference) — 核心配置键、默认值和子系统参考链接
