---
summary: "`openclaw secrets` 的 CLI 参考（存储、重新加载、审计、配置、应用）"
read_when:
  - 在运行时重新解析 SecretRefs
  - 管理共享密钥存储中的团队范围值
  - 审计明文残留和未解析的引用
  - 配置 SecretRefs 并应用单向清理变更
title: "密钥"
---

# `openclaw secrets`

管理 SecretRefs，并保持活动运行时快照的健康状态。

| Command     | Role                                                                                                                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reload`    | Gateway RPC（`secrets.reload`）：重新解析引用，并以原子方式发布所有者感知的运行时快照（不写入配置）；符合条件的所有者失败可能会以冷启动或过时警告的形式发布 |
| `store`     | 在本地共享状态 SQLite 数据库中管理团队范围的密钥和环境值                                                                                                  |
| `audit`     | 以只读方式扫描配置、身份验证、生成模型存储和旧版残留，检查明文、未解析的引用和优先级漂移（除非使用 `--allow-exec`，否则会跳过 exec 引用）                      |
| `configure` | 用于提供商设置、目标映射和预检的交互式规划器（需要 TTY）                                                                                                       |
| `apply`     | 执行已保存的计划（默认情况下，`--dry-run` 仅进行验证并跳过 exec 检查；写入模式会拒绝包含 exec 的计划，除非使用 `--allow-exec`），然后清理目标明文残留 |

推荐的操作循环：

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets audit --check
openclaw secrets reload
```

如果你的计划包含 `exec` SecretRefs/providers，请在 `apply` 命令的试运行和写入模式中都传入 `--allow-exec`。

CI／门禁的退出码：

- `audit --check` 在发现问题时返回 `1`。
- 未解析的引用返回 `2`（与是否使用 `--check` 无关）。
- 存储验证和披露策略失败返回 `2`；当名称缺失时，`store get` 返回 `3`。

相关链接：[密钥管理](/gateway/secrets) · [1Password 插件](/plugins/onepassword) · [SecretRef 凭据范围](/reference/secretref-credential-surface) · [安全性](/gateway/security)。

## 共享密钥存储

`openclaw secrets store` 直接写入本地共享状态数据库。该存储是 Gateway 范围且限定团队级别；此版本仅接受 `--scope team`。由于尚不支持身份范围，`--scope me` 会被拒绝。

```bash
openclaw secrets store list
openclaw secrets store set <NAME>
openclaw secrets store get <NAME>
openclaw secrets store rm <NAME>...
openclaw secrets store import [--from <file>]
```

名称必须匹配 `^[A-Z][A-Z0-9_]{0,127}$`。值限制为 64 KiB（65,536 个 UTF-8 字节）；无论超大值来自 stdin、`--value` 还是 `--value-file`，都会被拒绝并返回退出代码 2。`secret` 条目不得为空，因为空凭据之后无法诊断（`get` 会拒绝 `secret` 类型，列表会对其进行掩码）；`env` 条目可以为空。`--kind secret|env` 会覆盖自动类型检测；否则，以常见凭据后缀（例如 `_API_KEY`、`_TOKEN`、`_PASSWORD`、`_PRIVATE_KEY` 或 `_SECRET`）结尾的名称会成为 `secret`，其他名称会成为 `env`。

### 安全地设置值

仅当解析后的类型为 `env` 时，才接受 `--value`：

```bash
openclaw secrets store set LOG_LEVEL --kind env --value debug
```

对于 `secret` 值，由于命令行参数可能通过 shell 历史记录和进程列表泄露，`--value` 会被拒绝并返回退出代码 `2`。请使用以下三种安全输入方式之一：

- 当 stdin 不是 TTY 时，通过管道传入 stdin。
- 传入 `--value-file <path>`；`--value-file -` 表示 stdin。
- 以交互方式运行，并在无回显提示中输入值。

示例：

```bash
op read 'op://Engineering/OpenAI/apiKey' | \
  openclaw secrets store set OPENAI_API_KEY --kind secret

openclaw secrets store set TLS_PRIVATE_KEY \
  --kind secret \
  --value-file ./client-key.pem
```

`set` 具有幂等性，并会更新现有名称。添加 `--dry-run` 可在不写入的情况下验证并预览操作。写入成功后会提醒你运行 `openclaw secrets reload`，之后配置引用的值才能生效。

### 读取值

```bash
openclaw secrets store list --json
openclaw secrets store list --plain
openclaw secrets store get LOG_LEVEL
```

密钥值不会出现在人类可读输出、`--json` 或 `--plain` 输出中。按照设计，`store get` 会将 `secret` 条目视为只写并拒绝访问，退出代码为 `2`；当名称不存在时，退出代码为 `3`。`env` 类型的值可以读取。

团队范围的 `env` 条目也会进入 agent exec 环境。每次调用中显式指定的 env 优先于存储中的值，并且主机／sandbox 安全过滤器可能会拒绝受保护或呈现凭据特征的名称，同时发出警告。`secret` 条目绝不会作为子进程 env 暴露；请改用 `store` SecretRefs 访问它们。

### 删除值

```bash
openclaw secrets store rm OLD_TOKEN
openclaw secrets store rm OLD_TOKEN LEGACY_PASSWORD --yes
openclaw secrets store rm OLD_TOKEN --dry-run
```

删除操作具有幂等性，因此缺少名称时也会静默成功。不使用 `--yes` 时，CLI 会请求确认。删除的行会被软删除，并在 30 天后清除。

### 导入 dotenv 文件

从常规文件或 stdin 导入 dotenv 格式的赋值：

```bash
openclaw secrets store import --from .env
openclaw secrets store import --from .env --dry-run
openclaw secrets store import --from .env --yes
op read 'op://Engineering/service-account/dotenv' | openclaw secrets store import --yes
```

导入器支持带引号的值以及带引号的多行值，例如 PEM 密钥。使用 `--yes` 可跳过确认，使用 `--dry-run` 可在不写入的情况下检查导入内容。类型检测遵循与 `store set` 相同的基于名称的规则。

存储 CLI 命令不接受 `--url` 或 `--token`，也不会通过 Gateway 路由。Control UI 改用管理员范围的 `secrets.store.*` RPC 方法；当发生更改的名称被活动配置引用时，这些方法会自动刷新运行时。

## 重新加载运行时快照

```bash
openclaw secrets reload
openclaw secrets reload --json
openclaw secrets reload --url ws://127.0.0.1:18789 --token <token>
```

使用网关 RPC 方法 `secrets.reload`。健康的所有者会独立刷新。只有当其 ref 标识、provider 定义以及完整的非机密所有者契约都保持不变时，符合条件的失败所有者才会变为 stale；新的或已变更的失败会变为 cold。这种降级激活会成功并报告 `warningCount`。严格或未映射的失败会返回错误，并保留先前处于激活状态的快照。

选项：`--url <url>`、`--token <token>`、`--timeout <ms>`、`--json`。

## 审计

扫描 OpenClaw 状态以查找：

- 明文存储的机密
- 未解析的引用
- 优先级漂移（`auth-profiles.json` 凭据遮蔽 `openclaw.json` 引用）
- 存储残留（团队存储值在 `openclaw.json` 中重复以明文保存）
- 生成的 `agents/*/agent/models.json` 残留（提供商 `apiKey` 值和敏感的提供商请求头）
- 旧版残留（旧版认证存储条目、OAuth 提醒）

`.env` 扫描会覆盖有效状态目录以及包含活动配置的目录。当两个路径指向同一个文件时，只扫描一次。

敏感提供商请求头检测基于名称启发式：如果某个请求头名称匹配常见的 auth/credential 片段（`authorization`、`x-api-key`、`token`、`secret`、`password`、`credential`），则会标记该请求头。

```bash
openclaw secrets audit
openclaw secrets audit --check
openclaw secrets audit --json
openclaw secrets audit --allow-exec
```

报告结构：

- `status`：`clean | findings | unresolved`
- `resolution`：`refsChecked`、`skippedExecRefs`、`resolvabilityComplete`
- `summary`：`plaintextCount`、`unresolvedRefCount`、`shadowedRefCount`、`storeResidueCount`、`legacyResidueCount`
- finding codes：`PLAINTEXT_FOUND`、`REF_UNRESOLVED`、`REF_SHADOWED`、`STORE_PLAINTEXT_RESIDUE`、`LEGACY_RESIDUE`

## 配置（交互式助手）

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

流程：先进行提供者设置（添加/编辑/移除 `secrets.providers` 别名），然后进行凭据映射（选择字段，分配 `{source, provider, id}` 引用），接着进行预检和可选应用。

标志：

- `--providers-only`：仅配置 `secrets.providers`，跳过凭据映射
- `--skip-provider-setup`：跳过提供者设置，将凭据映射到现有提供者
- `--agent <id>`：将 `auth-profiles.json` 的目标发现和写入范围限定到一个代理存储
- `--allow-exec`：在预检/应用期间允许执行 SecretRef 检查（可能执行提供者命令）

`--providers-only` 和 `--skip-provider-setup` 不能同时使用。

说明：

- 需要交互式 TTY。
- 目标是 `openclaw.json` 中含有密钥的字段，以及所选代理范围内的 `auth-profiles.json`；规范支持的表面： [SecretRef 凭据表面](/reference/secretref-credential-surface)。
- 支持在选择器流程中直接创建新的 `auth-profiles.json` 映射。
- 在应用前运行预检解析。
- 生成的计划默认启用清理选项（`scrubEnv`、`scrubAuthProfilesForProviderTargets`、`scrubLegacyAuthJson`）。应用后，已清理的明文值不可逆。
- `--plan-out` 会拒绝创建其 UTF-8 序列化结果超过 16 MiB（16,777,216 字节）的计划，这与 `apply --from` 的输入限制一致。
- 如果不使用 `--apply`，CLI 在预检后仍会提示 `现在应用此计划？`。
- 使用 `--apply`（且未使用 `--yes`）时，CLI 会额外提示一次不可逆迁移确认。
- `--json` 会输出计划和预检报告，但仍需要交互式 TTY。

### Exec 提供者安全性

软件包管理器通常会公开使用符号链接的命令路径。解析实际的二进制文件路径（例如使用 `realpath "$(command -v vault)"`），并配置该绝对路径且不含符号链接的路径；使用 `trustedDirs` 将可执行文件限制在已批准的目录中。在 Windows 上，当无法进行 ACL 验证时，提供者路径会默认拒绝访问，且不提供提供者级别的绕过方式。

## 应用已保存的计划

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --json
```

`--dry-run` 会在不写入文件的情况下验证预检；在 dry-run 模式下，默认跳过 exec SecretRef 检查。写入模式会拒绝包含 exec SecretRef/provider 的计划，除非使用 `--allow-exec`。使用 `--allow-exec` 可在任一模式下选择启用 exec provider 检查或执行。

`--from` 必须指向一个常规文件，且大小不超过 16 MiB（16,777,216 字节）。字节上限适用于完整的序列化文件，包括空白字符。

`apply` 可能更新的内容：

- `openclaw.json`（SecretRef 目标以及 provider 的 upsert/delete）
- `auth-profiles.json`（provider-target 清理）
- 旧版 `auth.json` 中的残留内容
- 有效状态和 active-config 目录中的 `.env` 文件，用于更新其值已迁移的已知 secret 键

计划契约详情（允许的目标路径、验证规则、失败语义）：[Secrets Apply 计划契约](/gateway/secrets-plan-contract)。

### 为什么没有回滚备份

`secrets apply` 有意不会写入包含旧明文值的回滚备份。安全性来自严格的预检、近似原子式应用，以及在失败时尽最大努力进行内存恢复。

## 示例

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

如果 `audit --check` 仍然报告明文发现，请更新剩余报告的目标路径并重新运行 audit。

## 相关

- [CLI 参考](/cli)
- [密钥管理](/gateway/secrets)
- [Vault SecretRefs](/plugins/vault)
- [1Password 插件](/plugins/onepassword)
