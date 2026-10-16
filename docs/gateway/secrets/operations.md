---
summary: "支持的表面、优先级、激活触发器、降级信号以及审核和配置工作流程"
read_when:
  - "操作机密审核、配置并在生产中安全应用"
  - "了解启动快速失败、激活触发器和最后已知的良好行为"
title: "秘密操作和行为"
---

本页面涵盖日常机密操作：支持的凭证表面、所需的行为和优先级、激活和恢复信号以及审核、配置和应用工作流程。

## <a id="supported-credential-surface"></a> 支持的凭据范围

[SecretRef 凭证 Surface](/reference/secretref-credential-surface) 中列出了支持和不支持的凭证。

<Note>
运行时生成或轮换的凭据，以及 OAuth 刷新材料，特意不包含在只读 SecretRef 解析中。
</Note>

配置秘密目标查找遵循配置所有权。核心拥有 `channels` 和 `plugins` 以外的根；插件清单秘密输入与 `plugins.entries.<plugin-id>.config` 相关。通道秘密合约可以描述 `channels` 下的凭证及其自己的插件配置模式，包括多个通道所有者共享的合约。它们不扩展核心配置模式。

普通核心配置路径的秘密目标查找不会发现插件元数据。显式插件配置路径尝试该插件的清单目标，然后尝试其通道契约。频道查找首先尝试频道合约，然后在失败时使用更广泛的发现，以便外部所有者甚至可以扩展捆绑的频道 ID。审核和配置仍然包括禁用的插件；运行时激活保留其现有的启用规则。

## <a id="required-behavior-and-precedence"></a> 必需行为与优先级

- 没有 ref 的字段：保持不变。
- 带有 ref 的字段：在激活期间，对活动表面是必需的。
- 如果同时存在明文和 ref，则在受支持的优先级路径上，ref 优先。
- 修订标记 `__OPENCLAW_REDACTED__` 保留用于内部配置 redaction/restore，并作为文字提交的配置数据被拒绝。

警告和审计信号：

- `SECRETS_REF_OVERRIDES_PLAINTEXT`（运行时警告）
- `REF_SHADOWED`（当 SQLite 身份验证配置文件凭据优先于 `openclaw.json` 引用时的审计发现）
- `STORE_PLAINTEXT_RESIDUE`（当存储名称仍具有等效明文配置值时的审计发现）
- `PLACEHOLDER_VALUE`（当解析的凭据或存储条目包含已知的密文占位符时出现审核错误；计为未解析）

Google Chat `serviceAccount` 接受内联 JSON 或 SecretRef。当取消设置时，Doctor 将已退休的兄弟 `serviceAccountRef` 移动到此当前字段中。

## <a id="activation-triggers"></a> 激活触发器

密钥激活在以下情况下运行：

- 启动（预检加最终激活）
- 配置重新加载热应用路径
- 配置重新加载重启检查路径
- 通过 `secrets.reload` 手动重新加载
- Gateway 配置写入 RPC 预检（`config.set` / `config.apply` / `config.patch`），在持久编辑之前验证提交的配置有效负载中的活动表面 SecretRefs

激活契约：

- 成功后以原子方式交换快照。
- 严格启动失败会中止 Gateway 启动。
- 冷启动期间，对于已映射且可隔离的非 Gateway 所有者，如果发生可重试的解析失败，可以发布快照，并将该确切所有者配置为不可用。针对该所有者的请求会失败并返回 `SECRET_SURFACE_UNAVAILABLE`；模型提供商所有者的显式引用失败后，不会再回退到环境变量或身份验证配置文件中的凭据。
- 重新加载和重启检查会隔离符合条件的已映射所有者。对于引用标识未改变、提供商定义未改变且完整的非密钥所有者契约未改变的所有者，其确切的最近一次已知良好值会作为过期值保留；对于已更改或新配置但无法解析的引用，仅为该所有者发布冷状态。严格重新加载失败会保留之前处于活动状态的快照。
- `config.set`、`config.apply` 和 `config.patch` 接受可隔离所有者的语法有效但尚未解析的引用，并返回经过脱敏的 `degradedSecretOwners` 报告。Gateway 入口认证、结构无效的配置或已解析值、策略违规以及未知所有者仍会在磁盘变更前被拒绝。
- 即使另一个所有者处于冷状态或过期状态，状态正常的同级所有者仍会正常解析并发布。
- 已知的修订占位符会使其映射的可隔离所有者在不重用其先前凭证的情况下配置为不可用，即使该所有者的另一个引用也失败。网关 token/password 身份验证拒绝使用受影响的参考和修复指南启动。 Doctor 可以在经过验证的备份后修复商店支持的网关令牌；其他秘密需要从源头进行替换。
- 向出站 helper/tool 呼叫提供显式每次呼叫通道令牌不会触发 SecretRef 激活；激活点仍然是启动、重新加载和显式 `secrets.reload`。

## <a id="degraded-and-recovered-signals"></a> 降级与恢复信号

当在健康状态之后进行重新加载时激活失败，OpenClaw 会进入降级的密钥状态，并发出一次性系统事件和日志代码：

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

行为：

- 降级：健康所有者会刷新，陈旧所有者会保留最后已知的良好状态，而冷启动所有者仍不可用。
- Recovered：下次成功激活后发出一次。它确认了恢复，包括以前没有可用凭证的冷所有者。
- 在已经处于降级状态时反复失败会记录警告，但不会再次发出事件。
- 严格启动失败永远不会发出降级事件，因为运行时从未变为活动状态。成功启动但存在冷启动所有者时会记录所有者降级，但不会发出重新加载器事件。
- 作用域为引用的启动和重新加载失败会为每个受影响的所有者发出结构化的 `SECRETS_DEGRADED` 警告。作用域为提供者的中断会发出一条包含提供者和完整受影响所有者列表的 `SECRETS_PROVIDER_DEGRADED` 警告，而不是针对每个所有者重复记录提供者故障。警告包含经过脱敏的原因、`cold` 或 `stale` 所有者状态，以及 `openclaw secrets reload` 重试提示。警告中绝不会包含解析后的值或 SecretRef id。
- `openclaw doctor` 会列出冷启动和陈旧所有者、其受影响的配置路径、经过脱敏的原因以及重试指引。
- 需要迁移的已停用的身份验证配置文件在网关警告和 Doctor 中报告 `auth profile migration required`，并使用 `openclaw doctor --fix` 作为修复命令。 Doctor拥有验证导入和存档；重新加载机密不会迁移这些文件。
- 通道运行状况和状态使冷帐户与健康帐户一样按配置可见但不可用。只读检查无法解决非活动凭据或检查冷帐户。 `/healthz` 仍报告网关活跃度； `/readyz` 可能会将受影响的通道报告为故障，直至其恢复。恢复机密，然后运行 ​​`openclaw secrets reload`。

## <a id="command-path-resolution"></a> 命令路径解析

命令路径可以通过网关快照 RPC 选择性使用受支持的 SecretRef 解析。适用两种广泛行为：

<Tabs>
  <Tab id="strict-command-paths" title="严格的命令路径">
    例如 `openclaw memory` 远程内存路径，以及当 `openclaw qr --remote` 需要远程共享密钥引用时的情况。它们从活动快照读取，在所需 SecretRef 不可用时快速失败。
  </Tab>
  <Tab id="read-only-command-paths" title="只读命令路径">
    例如 `openclaw status`、`openclaw status --all`、`openclaw channels status`、`openclaw channels resolve`、`openclaw security audit`，以及只读的 doctor/config repair 流程。它们也会优先使用活动快照，但在目标 SecretRef 不可用时会降级而不是中止。

    只读行为：

    - 当网关正在运行时，这些命令会优先从活动快照读取。
    - 如果网关解析不完整或网关不可用，它们会针对该命令面进行有目标的本地回退尝试。
    - 如果目标 SecretRef 仍然不可用，命令会继续以降级的只读输出运行，并给出明确诊断，说明该引用已配置，但在此命令路径中不可用。
    - 这种降级行为仅适用于命令本地；它不会削弱运行时启动、重新加载或 send/auth 路径。

  </Tab>
</Tabs>

使用匹配的准备好的网关快照的代理轮次不会在轮次启动时重新解析每个模型和工具凭证。因此，配置为不可用的提供程序不会阻止使用健康提供程序的轮次。在环境或身份验证配置文件回退之前，选择不可用的提供程序仍会停止并出现错误，并且明确定位的 channel/account 凭据仍然严格。

没有 config-ref 准备的独立代理命令和使用不同配置的调用保留严格的命令范围解析。本地非传递代理命令不会解析不相关的通道或网关凭据。

其他说明：

- 后端密钥轮换后，快照刷新由 `openclaw secrets reload` 处理。
- 这些命令路径使用的网关 RPC 方法：`secrets.resolve`。

## <a id="audit-and-configure-workflow"></a> 审计与配置工作流

默认操作流程：

<Steps>
  <Step id="audit-current-state" title="审计当前状态">
    ```bash
    openclaw secrets audit --check
    ```
  </Step>
  <Step id="configure-and-apply-secretrefs" title="配置并应用SecretRefs">
    ```bash
    openclaw secrets configure --apply
    ```
  </Step>
  <Step id="re-audit" title="重新审核">
    ```bash
    openclaw secrets audit --check
    ```
  </Step>
</Steps>

在重新审核干净之前，不要将迁移视为已完成。如果审计仍然报告静态的纯文本值，则即使运行时 API 返回经过编辑的值，代理访问风险仍然存在。

如果你在 `configure` 过程中保存了一个计划而不是直接应用，那么在重新审计之前，使用 `openclaw secrets apply --from <plan-path>` 应用该已保存的计划。

<AccordionGroup>
  <Accordion id="secrets-audit" title="秘密审计">
    发现项包括：

    - 静态存储中的明文值（`openclaw.json`、SQLite auth-profile 行、`.env` 以及生成的 `agents/*/agent/models.json`）。
    - 生成的 `models.json` 条目中敏感提供方头部的明文残留。
    - 未解析的引用。
    - 优先级遮蔽（SQLite auth profiles 优先于 `openclaw.json` 引用）。
    - 存储残留（存储的名称在配置中仍然存在等效的明文值）。

    最初丢失的生成的 `models.json` 文件将被跳过。读取现有文件时，审核会强制实施 5 MiB 限制，并将叶符号链接、非常规文件以及读取或解析失败报告为 `REF_UNRESOLVED`。解析诊断可识别文件而不回显其内容。

    执行说明：默认情况下，审计会跳过 exec SecretRef 可解析性检查，以避免命令副作用。使用 `openclaw secrets audit --allow-exec` 可在审计期间执行 exec provider。

    标头残留注释：敏感提供商标头检测基于名称启发式（常见 auth/credential 标头名称和片段，例如 `authorization`、`x-api-key`、`token`、`secret`、`password` 和 `credential`）。

  </Accordion>
  <Accordion id="secrets-configure" title="秘密配置">
    交互式助手，功能包括：

    - 首先配置 `secrets.providers`（`env`/`file`/`exec`/`store`、add/edit/remove）。
    - 允许你在 `openclaw.json` 中选择受支持的携带密钥字段，以及某个代理作用域的 SQLite auth-profile 存储。
    - 可以直接在目标选择器中创建新的 auth-profile 映射。
    - 采集 SecretRef 详细信息（`source`、`provider`、`id`）。
    - 执行预检解析，并可立即应用。

    执行说明：除非设置了 `--allow-exec`，否则预检会跳过 exec SecretRef 检查。如果你通过 `configure --apply` 直接应用，并且计划中包含 exec refs/providers，那么在应用步骤中也要保持设置 `--allow-exec`。

    有用的模式：

    - `openclaw secrets configure --providers-only`
    - `openclaw secrets configure --skip-provider-setup`
    - `openclaw secrets configure --agent <id>`

    `configure` 的默认应用行为：

    - 从目标提供方的 SQLite 身份验证配置文件记录中清除匹配的静态凭据。
    - 保留已弃用的 `auth.json` 不变；运行 `openclaw doctor --fix` 以迁移并归档它。
    - 从生效状态文件和活动配置 `.env` 文件中清除已知的匹配密钥行（当两个路径匹配时会去重）。

  </Accordion>
  <Accordion id="secrets-apply" title="秘密适用">
    应用已保存的计划：

    ```bash
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
    ```

    执行说明：除非设置了 `--allow-exec`，否则 dry-run 会跳过 exec 检查；写入模式会拒绝包含 exec SecretRefs/providers 的计划，除非设置了 `--allow-exec`。

    有关严格的 target/path 合约详细信息和确切的拒绝规则，请参阅 [Secrets 应用计划 Contract](/gateway/secrets-plan-contract)。

  </Accordion>
</AccordionGroup>

## <a id="one-way-safety-policy"></a> 单向安全策略

<Warning>
OpenClaw 故意不会写入包含历史明文密钥值的回滚备份。
</Warning>

安全模型：

- 在进入写入模式之前，预检必须成功。
- 在提交之前，会验证运行时激活。
- 应用会使用原子文件替换更新文件，并在失败时尽最大努力进行恢复。

## <a id="legacy-auth-compatibility-notes"></a> 旧版认证兼容性说明

对于静态凭据，运行时不再依赖明文旧版认证存储。

- 运行时凭据来源是已解析的内存快照。
- 发现旧的静态 `api_key` 条目时会将其清理。
- OAuth- 相关的兼容性行为仍然是单独的。

## Control UI

打开 **Settings → Secrets** 以列出、添加、编辑、批量导入或软删除团队范围的条目。为 SecretRefs 或目标绑定网关出口使用的只写值选择 **Protected Secret**。仅当网关托管的代理命令必须接收明文并且代理可以打印、传输或保留它时，才选择 **代理可读环境**。批量添加接受 dotenv `NAME=VALUE` 分配，包括带引号的多行值。 **自动保护类似凭证的名称** 默认将凭证形状的名称设置为保护模式。

此存储页面仅管理值。通过其设置表单或原始编辑器，在受支持的字段上配置相应的 `store` SecretRef。身份范围的条目留待后续版本处理，本页面不会显示这些条目。
