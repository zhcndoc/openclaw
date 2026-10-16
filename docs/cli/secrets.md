---
summary: "`openclaw secrets` 的 CLI 参考（存储、重新加载、审计、配置、应用）"
read_when:
  - "在运行时重新解析秘密引用"
  - "管理共享密钥存储中的团队范围值"
  - "审计明文残留和未解析的引用"
  - "配置 SecretRefs 并应用单向清理变更"
title: "秘密 CLI"
---

# `openclaw secrets`

管理 SecretRefs，并保持活动运行时快照的健康状态。

| 命令     | 角色                                                                                                                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reload`    | Gateway RPC（`secrets.reload`）：重新解析引用，并以原子方式发布所有者感知的运行时快照（不写入配置）；符合条件的所有者失败可能会以冷启动或过时警告的形式发布 |
| `store`     | 在本地共享状态 SQLite 数据库中管理团队范围的密钥和环境值                                                                                                  |
| `audit`     | 对 config/auth/generated-model 存储和遗留残基进行只读扫描，以查找明文、未解析的引用和优先级漂移（除非 `--allow-exec`，否则将跳过执行引用）                      |
| `configure` | 用于提供商设置、目标映射和预检的交互式规划器（需要 TTY）                                                                                                       |
| `apply`     | 执行已保存的计划（默认情况下，`--dry-run` 仅进行验证并跳过 exec 检查；写入模式会拒绝包含 exec 的计划，除非使用 `--allow-exec`），然后清理目标明文残留 |

推荐的操作循环：

```bash
openclaw secrets audit --check
openclaw secrets configure --plan-out /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets audit --check
openclaw secrets reload
```

如果您的计划包括 `exec` SecretRefs/providers，请在空运行和写入 `apply` 命令上传递 `--allow-exec`。如果结束 `audit --check` 仍然报告纯文本结果，请更新其余报告的目标路径并重新运行审核。

CI/gates 的退出代码：

- `audit --check` 在发现问题时返回 `1`。
- 未解析的引用返回 `2`（与是否使用 `--check` 无关）。
- 存储验证和披露策略失败返回 `2`。
- 当名称缺失时，`store get` 返回 `3`。

相关：[Secrets Management](/gateway/secrets) · [1密码插件](/plugins/onepassword) · [SecretRef 凭证 Surface](/reference/secretref-credential-surface) · [Security](/gateway/security)

## <a id="shared-secret-store"></a> 共享密钥存储

`openclaw secrets store` 通过拥有本地状态目录的网关路由写入。当网关停止时，它会获取独占的离线所有权，直到写入和清理完成。如果正在运行的网关较旧或无法访问，则该命令将拒绝，而不会进行本地回退；在重试之前更新或停止该网关。该商店是网关范围和团队范围的，`--scope team` 是唯一接受的值。 `--scope me` 与 `Identity scope is not supported yet; use --scope team.` 一起退出 `2`

条目还来自 Control UI 中的 **Settings -> Secrets** 以及代理的 [`secrets` 工具 ](/tools/secrets)。该工具要求您在屏蔽提示中输入凭据。它存储凭证，但值不会到达模型。

```bash
openclaw secrets store list
openclaw secrets store set <NAME>
openclaw secrets store get <NAME>
openclaw secrets store rm <NAME>...
openclaw secrets store import [--from <file>]
```

命名和取值规则：

- 名称必须与 `^[A-Z][A-Z0-9_]{0,127}$` 匹配。
- 值限制为 64 KiB（65,536 UTF-8 字节）。过大的值无论是来自 stdin、`--value` 还是 `--value-file`，都会退出 `2`。
- A `secret` 条目可能不为空，因为空凭证以后无法诊断。 `get` 拒绝秘密类型，而列表掩盖了它们。 `env` 条目可能为空。
- 已知的密文占位符（例如 `__OPENCLAW_REDACTED__`）无法存储为值。 CLI `set` 和 `import` 跳过现有可用条目的编辑输入，并带有明确的未更改消息；没有可用现有条目的占位符退出 `2`。
- `--kind secret|env` 显式更改条目的类型。否则，`set` 和 `import` 在保存时保留条目的当前类型，包括在输入或确认待决时进行的保护更改。仅新名称使用自动检测：以通用凭证后缀（例如 `_API_KEY`、`_TOKEN`、`_PASSWORD`、`_PRIVATE_KEY` 或 `_SECRET`）结尾的名称将变为 `secret`，其他名称将变为 `env`。

传递到 `--value-file` 或 `--from` 的文件路径必须标识常规文件。命名管道和设备路径被拒绝；使用 stdin 进行流输入。

### <a id="set-values-safely"></a> 安全地设置值

仅当解析类型为 `env` 时，才接受 `--value`：

```bash
openclaw secrets store set LOG_LEVEL --kind env --value debug
```

对于 `secret` 值，`--value` 会被拒绝，退出代码为 `2`，因为命令行参数可能会通过 shell 历史记录和进程列表泄漏。如果另一个写入者在保存该值之前将条目更改为 `secret`，也会被拒绝。显式 `--kind env` 仍会重新分类该条目。请改用三个安全输入之一：

- 当 stdin 不是 TTY 时，通过管道传入 stdin。
- 通行证`--value-file <path>`。 `--value-file -` 表示标准输入。
- 以交互方式运行，并在无回显提示中输入值。

示例：

```bash
op read 'op://Engineering/OpenAI/apiKey' | \
  openclaw secrets store set OPENAI_API_KEY --kind secret

openclaw secrets store set TLS_PRIVATE_KEY \
  --kind secret \
  --value-file ./client-key.pem
```

`set` 创建或更新没有重复条目的名称。添加`--dry-run`，无需写入即可验证和预览操作。在线写入会刷新网关中受影响的配置引用。如果保存后刷新失败，错误会报告已保存的更改并将您定向到 `openclaw secrets reload`；它不会在本地重播写入内容。

`audit` 将先前存储或解析的占位符报告为 `PLACEHOLDER_VALUE` 并将它们计为未解析的凭据（退出 `2`）。对于损坏的存储支持的网关令牌，请运行 `openclaw doctor --fix`，重新启动网关，然后重新连接或重新配对设备。请参阅 [ 网关令牌恢复](/cli/doctor/recovery#invalid-gateway-tokens)。

秘密出口替换将被阻止，直到每个秘密至少有一个确切允许的主机。使用可重复的 `--allow-host` 标志绑定或替换主机。此仅策略形式不要求或替换现有的秘密值：

```bash
openclaw secrets store set OPENAI_API_KEY --allow-host api.openai.com
openclaw secrets store set SERVICE_TOKEN \
  --allow-host api.example.com \
  --allow-host uploads.example.com
openclaw secrets store set SERVICE_TOKEN --clear-allowed-hosts
```

主机标准化为小写 ASCII/punycode. 方案、路径、端口和通配符被拒绝。 `store list` 显示允许的主机，因为它们是策略元数据，而不是秘密材料。

### <a id="read-values"></a> 读取值

```bash
openclaw secrets store list --json
openclaw secrets store list --plain
openclaw secrets store get LOG_LEVEL
```

秘密值绝不会出现在 human、`--json` 或 `--plain` 输出中。 `store get` 按设计拒绝 `secret` 条目为只写并退出 `2`。当名称不存在时，退出 `3`。环境友好值是可读的。

团队范围的 `env` 条目到达由 OpenClaw 自己的执行工具运行的网关托管命令，包括对 `openclaw:core:exec` 和 Codex `gateway_exec` 的 OpenClaw 代码模式调用。显式的每次调用环境胜过存储值。沙箱、远程 `node`、ACP 和 Codex-native shell 执行不会收到它们。默认情况下，`secret` 条目不存在于子进程中。使用 `secrets.egressProxy.enabled: true`，网关托管的 exec 仅接收经过身份验证的哨兵，并且网关在 HTTPS 出口处替换它们。请参阅 [ 秘密出口代理](/gateway/secrets#secret-egress-proxy)。

<Warning>
存储条目不会到达外部代理harness内运行的命令。 Codex 应用程序服务器及其沙箱执行服务器以及 ACP 子级（例如 Claude Code）构建自己的子环境，并且从不通过 OpenClaw 的执行准备。在符合条件的 Codex 回合中，请改用 `gateway_exec` 进入 OpenClaw- 受管网关环境路径。
</Warning>

### <a id="remove-values"></a> 删除值

```bash
openclaw secrets store rm OLD_TOKEN
openclaw secrets store rm OLD_TOKEN LEGACY_PASSWORD --yes
openclaw secrets store rm OLD_TOKEN --dry-run
```

删除失踪的名字悄然成功。如果没有 `--yes`，则 CLI 要求确认。删除的行将被软删除并在 30 天后清除。

### <a id="import-dotenv-files"></a> 导入 dotenv 文件

从常规文件或 stdin 导入 dotenv 格式的赋值：

```bash
openclaw secrets store import --from .env
openclaw secrets store import --from .env --dry-run
openclaw secrets store import --from .env --yes
op read 'op://Engineering/service-account/dotenv' | openclaw secrets store import --yes
```

导入器支持带引号的值和多行带引号的值，例如 PEM 键。使用 `--yes` 跳过确认，使用 `--dry-run` 检查导入而不写入。与 `store set` 一样，导入保留现有条目的类型，并仅对新名称使用基于名称的规则。通过 `--kind secret|env` 显式重新分类所有导入的条目。

存储 CLI 命令不接受 `--url` 或 `--token`，并且不通过网关进行路由。 Control UI 使用管理范围的 `secrets.store.*` RPC 方法。当活动配置引用更改的名称时，这些方法会自动刷新运行时。

## <a id="reload-runtime-snapshot"></a> 重新加载运行时快照

```bash
openclaw secrets reload
openclaw secrets reload --json
openclaw secrets reload --url ws://127.0.0.1:18789 --token <token>
```

使用网关 RPC 方法 `secrets.reload`。健康的主人可以独立刷新。仅当其引用身份、提供者定义和完整的非秘密所有者合同未更改时，合格的失败所有者才会变得陈旧。新的或改变的失败变得冷淡。此降级激活成功并报告 `warningCount`。严格或未映射的故障会返回错误并保留以前的活动快照。

选项：`--url <url>`、`--token <token>`、`--timeout <ms>`、`--json`。

## <a id="audit"></a> 审计

扫描 OpenClaw 状态以查找：

- 明文存储的机密
- 未解析的引用
- 优先级漂移（身份验证配置文件存储凭据隐藏 `openclaw.json` 引用）
- 存储残留（团队存储值在 `openclaw.json` 中重复以明文保存）
- 生成的 `agents/*/agent/models.json` 残留（提供商 `apiKey` 值和敏感的提供商请求头）
- 旧版残留（旧版认证存储条目、OAuth 提醒）

`.env` 扫描会覆盖有效状态目录以及包含活动配置的目录。当两个路径指向同一个文件时，只扫描一次。

敏感提供商请求头检测基于名称启发式：如果某个请求头名称匹配常见的 auth/credential 片段（`authorization`、`x-api-key`、`token`、`secret`、`password`、`credential`），则会标记该请求头。

医生和秘密审计共享明文分类为`openclaw.json`。已知的非秘密提供商 API-key 标记（例如 `ollama-local`、SecretRefs）和非敏感提供商标头不会生成明文警告。真正的明文密钥仍然有效。

```bash
openclaw secrets audit
openclaw secrets audit --check
openclaw secrets audit --json
openclaw secrets audit --allow-exec
```

报告结构：

- `status`: `clean | findings | unresolved`
- `resolution`: `refsChecked`, `skippedExecRefs`, `resolvabilityComplete`
- `summary`: `plaintextCount`, `unresolvedRefCount`, `shadowedRefCount`, `storeResidueCount`, `legacyResidueCount`
- 查找代码：`PLAINTEXT_FOUND`、`REF_UNRESOLVED`、`REF_SHADOWED`、`STORE_PLAINTEXT_RESIDUE`、`LEGACY_RESIDUE`

## <a id="configure-(interactive-helper)"></a><a id="configure-interactive-helper"></a> 配置（交互式助手）

以交互方式构建提供者和 SecretRef 更改，运行预检，并可选择应用：

```bash
openclaw secrets configure
openclaw secrets configure --plan-out /tmp/openclaw-secrets-plan.json
openclaw secrets configure --apply --yes
openclaw secrets configure --providers-only
openclaw secrets configure --skip-provider-setup
openclaw secrets configure --agent ops
openclaw secrets configure --json
```

流程：首先设置提供商（add/edit/remove `secrets.providers` 别名），然后进行凭证映射（选择字段、分配 `{source, provider, id}` 引用），然后进行预检和可选应用。

对于 `env` 和 `store` 引用，当 `provider` 匹配该源的有效默认值：`secrets.defaults.env` 或 `secrets.defaults.store` 时，不需要提供程序条目，未设置时回退到 `default`。其他别名和所有 `file`/`exec` 引用都需要匹配的 `secrets.providers` 条目。

标志：

- `--providers-only`：仅配置 `secrets.providers`，跳过凭据映射
- `--skip-provider-setup`：跳过提供者设置，将凭据映射到现有提供者
- `--agent <id>`：范围身份验证配置文件目标发现并写入一个代理存储
- `--allow-exec`：允许在 preflight/apply 期间执行 exec SecretRef 检查（可以执行提供者命令）

`--providers-only` 和 `--skip-provider-setup` 不能同时使用。

注意：

- 需要交互式 TTY。
- 定位 `openclaw.json` 中的秘密承载字段以及所选代理的身份验证配置文件存储。 [SecretRef 凭证 Surface](/reference/secretref-credential-surface) 中列出了支持的字段。
- 支持直接在选择器流程中创建新的身份验证配置文件映射。
- 在应用前运行预检解析。
- 生成的计划启用`scrubEnv`和`scrubAuthProfilesForProviderTargets`。 `scrubLegacyAuthJson` 保持禁用状态，因为 Doctor 拥有旧版 `auth.json` 迁移。 Apply 是一种用于清理明文值的单向方法。
- `--plan-out` 会拒绝创建其 UTF-8 序列化结果超过 16 MiB（16,777,216 字节）的计划，这与 `apply --from` 的输入限制一致。
- 没有`--apply`，CLI在预检后仍然提示`Apply this plan now?`。
- 使用 `--apply`（且未使用 `--yes`）时，CLI 会额外提示一次不可逆迁移确认。
- `--json` 会输出计划和预检报告，但仍需要交互式 TTY。

### <a id="exec-provider-safety"></a> Exec 提供者安全性

包管理器经常公开符号链接的命令路径。解析真实的二进制路径（例如使用 `realpath "$(command -v vault)"`）并配置该绝对的非符号链接路径。使用 `trustedDirs` 将可执行文件限制到批准的目录。在网关主机上运行 `openclaw config validate` 以检查手动执行命令路径，而不执行提供程序。在 Windows 上，当 ACL 验证不可用时，提供程序路径将被拒绝，并且没有提供程序级别旁路。

## <a id="apply-a-saved-plan"></a> 应用已保存的计划

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --json
```

`--dry-run` 在不写入文件的情况下验证预检。默认情况下，在空运行中会跳过 Exec SecretRef 检查。写入模式拒绝包含 exec SecretRefs/providers 的计划，除非 `--allow-exec`。使用 `--allow-exec` 选择在任一模式下执行提供程序 checks/execution。

`--from` 必须指向一个常规文件，且大小不超过 16 MiB（16,777,216 字节）。字节上限适用于完整的序列化文件，包括空白字符。

`apply` 可能更新的内容：

- `openclaw.json`（SecretRef 目标 + 提供者 upserts/deletes）
- auth 配置文件存储（提供商-目标清理）
- 旧版 `auth.json` 中的残留内容
- 有效状态和 active-config 目录中的 `.env` 文件，用于更新其值已迁移的已知 secret 键

计划合同详细信息（允许的目标路径、验证规则、失败语义）：[Secrets 应用计划 Contract](/gateway/secrets-plan-contract)。

### <a id="why-no-rollback-backups"></a> 为什么没有回滚备份

`secrets apply` 有意不会写入包含旧明文值的回滚备份。安全性来自严格的预检、近似原子式应用，以及在失败时尽最大努力进行内存恢复。

<a id="example" />

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [密钥管理](/gateway/secrets)
- [Vault SecretRefs](/plugins/vault)
- [1Password 插件](/plugins/onepassword)
