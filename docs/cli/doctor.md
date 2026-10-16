---
summary: "`openclaw doctor` 的 CLI 参考（健康检查 + 引导式修复）"
read_when:
  - "您遇到 connectivity/auth 问题并需要指导修复"
  - "当你已更新并希望进行一次完整性检查时"
title: "医生CLI"
---

# `openclaw doctor`

针对网关、通道、插件、技能、模型路由、本地状态和配置迁移的健康检查与快速修复。只要某些内容没有按预期运行，并且你希望通过一个命令来说明问题所在，就使用它。

在聊天请求的更新期间，Doctor 会在修复步骤之间重新检查原始请求者的当前所有者权限。删除或替换该所有者可以防止进一步的更改。在突变前备份边界之后，这些检查重用维护会话的实时读取器，而不是重复复制共享数据库。

当为托管网关运行时，Doctor 会将活动的官方插件与已安装服务引用的 OpenClaw 包进行比较。当网关停止或无法访问时，此检查仍然有效。当较旧的网关仍在运行时，Doctor 会与重新启动后的版本分开报告其版本。如果无法识别服务包，Doctor 会将重新启动准备情况报告为未知，而不是将插件集视为兼容。

当 Gateway 状态报告 SecretRef 所有者降级时，doctor 会打印一个 **Secret 运行时降级** 警告，列出每个冷却或过期的所有者、受影响的配置路径、已脱敏的原因，以及 `openclaw secrets reload` 重试命令。

当通道入口事件被投递到 dead-letter 时，doctor 会指出每个受影响的通道账户，并指向 [`openclaw channels dead-letters list`](/cli/channels#inbound-dead-letters) 以便检查和恢复。

当注册表拥有的项目克隆是部分或浅的时，Doctor 会发出警告。它命名了克隆、浅状态和部分克隆配置键，包括 URL-keyed 远程孪生。打印手动修复命令； `--fix` 不会获取或重新打包这些克隆。代理工作区和手动注册的结账不包括在内。

当 Gateway 包含导出器健康状态信息时，doctor 会在 **遥测导出器** 下报告最新的、可信的各信号状态和传输方式。摘要经过脱敏处理，不包含端点值、标头、证书、负载或原始错误。

Doctor 报告使用成本缓存刷新失败的会话，因为它们的总计可能不完整。检查网关日志并再次请求使用情况以重试。有界故障历史记录在重新启动后保留最新的 256 个会话；成功刷新会清除该会话的警告。在会话刷新成功之前，`--fix` 不会清除警告。

相关：

- 故障排查: [疑难解答](/gateway/troubleshooting)
- 安全审计: [安全](/gateway/security)。

## <a id="doctor-pages"></a> 医生页面

此页是一个索引。 `openclaw doctor` 共七页，每个读者作业一页。打开与您的任务匹配的页面。

| 页面                                                                       | 读它的时候                                                                            |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [润医生](/cli/doctor/running)                                          | 选择一个姿势，复制一个工作示例，或者查找一个选项的作用。                 |
| [网关和服务恢复](/cli/doctor/recovery)                       | 网关服务、远程目标、Control UI 资产或网关令牌需要修复。   |
| [Lint 和升级后模式](/cli/doctor/lint)                            | 您需要 CI 门的只读结果，或升级后插件兼容性检查。 |
| [结构化健康检查合约](/cli/doctor/health-contract)            | 您正在编写医生检查或插件支持的健康检查。                         |
| [旧状态迁移](/cli/doctor/state-migrations)                     | 文件到 SQLite 的迁移被阻止，需要手动协调。                  |
| [SQLite维护和会话迁移](/cli/doctor/sqlite-maintenance) | 您正在压缩数据库，或者导入、验证或恢复会话历史记录。 |
| [其他检查和维修](/cli/doctor/checks)                             | 您需要从 Nix 模式到通道的所有剩余检查和维修的清单。  |

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本的每个部分标题都保留其锚点，因此现有链接（例如 `/cli/doctor#session-sqlite-migration`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="postures" />[姿势](/cli/doctor/running#postures)
- <a id="gateway-service-recovery" />[网关服务恢复](/cli/doctor/recovery#gateway-service-recovery)
- <a id="remote-gateway-recovery" />[远程网关恢复](/cli/doctor/recovery#remote-gateway-recovery)
- <a id="control-ui-assets" />[控制UI资产](/cli/doctor/recovery#control-ui-assets)
- <a id="examples" />[示例](/cli/doctor/running#examples)
- <a id="options" />[选项](/cli/doctor/running#options)
- <a id="lint-mode" />[Lint模式](/cli/doctor/lint#lint-mode)
- <a id="structured-health-checks" />[结构化健康检查](/cli/doctor/health-contract#structured-health-checks)
- <a id="check-selection" />[检查选择](/cli/doctor/lint#check-selection)
- <a id="post-upgrade-mode" />[升级后模式](/cli/doctor/lint#post-upgrade-mode)
- <a id="legacy-state-migration" />[旧状态迁移](/cli/doctor/state-migrations#legacy-state-migration)
- <a id="shared-state-sqlite-compaction" />[共享状态 SQLite 压缩](/cli/doctor/sqlite-maintenance#shared-state-sqlite-compaction)
- <a id="session-sqlite-migration" />[会话 SQLite 迁移](/cli/doctor/sqlite-maintenance#session-sqlite-migration)
- <a id="downgrading-after-session-sqlite-migration" />[ 会话后降级 SQLite Migration](/cli/doctor/sqlite-maintenance#downgrading-after-session-sqlite-migration)
- <a id="notes" />[注释](/cli/doctor/checks#notes)
- <a id="invalid-gateway-tokens" />[无效的网关令牌](/cli/doctor/recovery#invalid-gateway-tokens)
- <a id="macos%3A-launchctl-env-overrides" />[macOS：`launchctl` env 覆盖](/cli/doctor/recovery#macos%3A-launchctl-env-overrides)
- <a id="macos-launchctl-env-overrides" />[macOS：`launchctl` env 覆盖](/cli/doctor/recovery#macos-launchctl-env-overrides)

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [Gateway 诊断](/gateway/doctor)
- [`openclaw policy`](/cli/policy) — 策略规则 `doctor --lint` 报告
- [`openclaw status`](/cli/status) — 通道和会话诊断、检查和使用情况快照
