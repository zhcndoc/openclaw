---
summary: "密钥管理：SecretRef 契约、共享密钥存储、运行时快照和安全的单向清理"
read_when:
  - "为提供者凭证和 SQLite auth-profile 引用配置 SecretRefs"
  - "在共享 SQLite 存储中保存团队范围的密钥和环境值"
  - "在生产环境中安全地执行密钥重新加载、审计、配置和应用"
  - "了解启动快速失败、非活动表面过滤和最后已知良好状态"
title: "密钥管理"
sidebarTitle: "密钥管理"
---

OpenClaw 支持附加 SecretRefs，因此支持的凭证不需要在配置中以明文形式存在。

<Note>
明文仍然有效。 SecretRefs 是根据凭证选择加入的。
</Note>

<Warning>
当明文凭证位于代理可以检查的文件中时，它们仍然是代理可读的，包括 `openclaw.json`、`.env`、已停用的身份验证配置文件 JSON 存档或生成的 `agents/*/agent/models.json` 文件。一旦迁移了每个支持的凭证并且 `openclaw secrets audit --check` 报告没有明文残留，SecretRefs 就会减少本地凭证暴露。
</Warning>

此页是一个索引。秘密管理记录在五页纸上，每个读者作业一页。打开与您的任务匹配的页面。

## <a id="secrets-pages"></a> 秘密页面

| 页面                                                                             | 读它的时候                                                                                                 |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [Secrets 运行时模型](/gateway/secrets/runtime-model)                          | 所有者隔离、哨兵注入、代理访问边界和活动表面过滤。                |
| [SecretRef 合约和提供商配置](/gateway/secrets/secretref-contract)    | SecretRef 合约、id 语法、验证规则以及 env、file、exec 和 store 提供程序块。   |
| [共享秘密存储和出口代理](/gateway/secrets/secret-store-and-egress) | 共享秘密存储、秘密出口代理及其流量允许列表以及文件支持的 API 密钥。        |
| [Secrets 集成示例](/gateway/secrets/integration-examples)            | 1Password、Bitwarden、Vault、pass 和 sops 的 Exec 提供程序配方，以及 MCP 和沙箱 SSH。             |
| [秘密操作和行为](/gateway/secrets/operations)                   | 支持的表面、优先级、激活触发器、降级信号以及审核和配置工作流程。 |

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本中的每个部分、选项卡、步骤和手风琴标题都保留其锚点，因此现有链接（例如 `/gateway/secrets#shared-secret-store`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="runtime-model" />[运行时模型](/gateway/secrets/runtime-model#runtime-model)
- <a id="egress-time-injection-(sentinels)" />[Egress-time注入（哨兵）](/gateway/secrets/runtime-model#egress-time-injection-sentinels)
- <a id="agent-access-boundary" />[座席访问边界](/gateway/secrets/runtime-model#agent-access-boundary)
- <a id="active-surface-filtering" />[有源表面滤波](/gateway/secrets/runtime-model#active-surface-filtering)
- <a id="gateway-auth-surface-diagnostics" />[网关身份验证表面诊断](/gateway/secrets/runtime-model#gateway-auth-surface-diagnostics)
- <a id="onboarding-reference-preflight" />[登机参考预检](/gateway/secrets/runtime-model#onboarding-reference-preflight)
- <a id="secretref-contract" />[SecretRef合约](/gateway/secrets/secretref-contract#secretref-contract)
- <a id="provider-config" />[提供者配置](/gateway/secrets/secretref-contract#provider-config)
- <a id="shared-secret-store" />[共享秘密存储](/gateway/secrets/secret-store-and-egress#shared-secret-store)
- <a id="secret-egress-proxy" />[秘密出口代理](/gateway/secrets/secret-store-and-egress#secret-egress-proxy)
- <a id="traffic-allowlist" />[流量允许列表](/gateway/secrets/secret-store-and-egress#traffic-allowlist)
- <a id="file-backed-api-keys" />[文件支持的 API 密钥](/gateway/secrets/secret-store-and-egress#file-backed-api-keys)
- <a id="exec-integration-examples" />[执行集成示例](/gateway/secrets/integration-examples#exec-integration-examples)
- <a id="mcp-server-environment-variables" />[MCP 服务器环境变量](/gateway/secrets/integration-examples#mcp-server-environment-variables)
- <a id="sandbox-ssh-auth-material" />[沙盒SSH授权材料](/gateway/secrets/integration-examples#sandbox-ssh-auth-material)
- <a id="supported-credential-surface" />[支持的凭证表面](/gateway/secrets/operations#supported-credential-surface)
- <a id="required-behavior-and-precedence" />[所需的行为和优先级](/gateway/secrets/operations#required-behavior-and-precedence)
- <a id="activation-triggers" />[激活触发器](/gateway/secrets/operations#activation-triggers)
- <a id="degraded-and-recovered-signals" />[降级和恢复信号](/gateway/secrets/operations#degraded-and-recovered-signals)
- <a id="command-path-resolution" />[命令路径分辨率](/gateway/secrets/operations#command-path-resolution)
- <a id="audit-and-configure-workflow" />[审核和配置工作流程](/gateway/secrets/operations#audit-and-configure-workflow)
- <a id="one-way-safety-policy" />[单向安全政策](/gateway/secrets/operations#one-way-safety-policy)
- <a id="legacy-auth-compatibility-notes" />[旧版身份验证兼容性说明](/gateway/secrets/operations#legacy-auth-compatibility-notes)
- <a id="control-ui" />[控制 UI](/gateway/secrets/operations#control-ui)
- <a id="egress-time-injection-sentinels" />[Egress-time注入（哨兵）](/gateway/secrets/runtime-model#egress-time-injection-sentinels)
- <a id="examples-of-inactive-surfaces" />[非活动表面示例](/gateway/secrets/runtime-model#examples-of-inactive-surfaces)
- <a id="env" />[env](/gateway/secrets/secretref-contract#env)
- <a id="file" />[文件](/gateway/secrets/secretref-contract#file)
- <a id="exec" />[exec](/gateway/secrets/secretref-contract#exec)
- <a id="store" />[store](/gateway/secrets/secretref-contract#store)
- <a id="env-provider" />[EEnv 提供商](/gateway/secrets/secretref-contract#env-provider)
- <a id="file-provider" />[文件提供者](/gateway/secrets/secretref-contract#file-provider)
- <a id="exec-provider" />[执行提供商](/gateway/secrets/secretref-contract#exec-provider)
- <a id="store-provider" />[商店提供商](/gateway/secrets/secretref-contract#store-provider)
- <a id="1password" />[1密码](/gateway/secrets/integration-examples#1password)
- <a id="bitwarden-secrets-manager-openclawverbatim568end" />[Bitwarden 秘密管理器 （`bws`）](/gateway/secrets/integration-examples#bitwarden-secrets-manager-bws)
- <a id="hashicorp-vault-cli" />[HashiCorp 金库 CLI](/gateway/secrets/integration-examples#hashicorp-vault-cli)
- <a id="password-store-openclawverbatim579end" />[密码存储 （`pass`）](/gateway/secrets/integration-examples#password-store-pass)
- <a id="sops" />[sops](/gateway/secrets/integration-examples#sops)
- <a id="strict-command-paths" />[严格命令路径](/gateway/secrets/operations#strict-command-paths)
- <a id="read-only-command-paths" />[只读命令路径](/gateway/secrets/operations#read-only-command-paths)
- <a id="audit-current-state" />[审核当前状态](/gateway/secrets/operations#audit-current-state)
- <a id="configure-and-apply-secretrefs" />[配置并应用SecretRefs](/gateway/secrets/operations#configure-and-apply-secretrefs)
- <a id="re-audit" />[重新审核](/gateway/secrets/operations#re-audit)
- <a id="secrets-audit" />[秘密审核](/gateway/secrets/operations#secrets-audit)
- <a id="secrets-configure" />[秘密配置](/gateway/secrets/operations#secrets-configure)
- <a id="secrets-apply" />[秘密适用](/gateway/secrets/operations#secrets-apply)

## <a id="related"></a> 相关内容

- [认证](/gateway/authentication) - 认证设置
- [CLI：密钥](/cli/secrets) - CLI 命令
- [Vault SecretRefs](/plugins/vault) - HashiCorp Vault 提供程序设置
- [Environment Variables](/help/environment) - 环境优先级
- [SecretRef 凭证 Surface](/reference/secretref-credential-surface) - 凭证表面
- [Secrets 应用计划 Contract](/gateway/secrets-plan-contract) - 计划合同详细信息
- [安全](/gateway/security) - 安全态势。
- [配置参考](/gateway/configuration-reference) - 其中记录了每个秘密和环境设置
- [询问用户](/tools/ask-user) - 询问操作员一个非秘密问题；切勿使用凭据回答，请使用屏蔽的 `secrets` 工具
- [Auth 凭证语义](/auth-credential-semantics) - 身份验证配置文件排序和运行时凭证解析的共享规则
