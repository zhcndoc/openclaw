---
summary: "openclaw secrets 的 CLI 参考（reload、audit、configure、apply）"
read_when:
  - 运行时重新解析 secret 引用
  - 审计明文残留和未解析引用
  - 配置 SecretRefs 并应用一次性清理更改
title: "密钥"
---

# `openclaw secrets`

管理 SecretRefs，并保持活动运行时快照的健康状态。

| Command     | Role                                                                                                                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reload`    | Gateway RPC (`secrets.reload`): 仅在完全成功时重新解析引用并切换运行时快照（不写入配置）                                                                      |
| `audit`    | 只读扫描 config/auth/generated-model 存储以及旧残留中的明文、未解析引用和优先级漂移（除非使用 `--allow-exec`，否则会跳过 exec 引用）                      |
| `configure` | 用于提供程序设置、目标映射和预检的交互式规划器（需要 TTY）                                                                                                       |
| `apply`     | 执行已保存的计划（`--dry-run` 仅验证并默认跳过 exec 检查；写入模式会拒绝包含 exec 的计划，除非使用 `--allow-exec`），然后清理目标明文残留 |

推荐的操作循环：

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets audit --check
openclaw secrets reload
```

如果你的计划包含 `exec` SecretRefs/providers，请在 `apply` 命令的 dry-run 和写入模式中都传入 `--allow-exec`。

CI/门禁的退出码：

- `audit --check` 在发现问题时返回 `1`。
- 未解析的引用返回 `2`（无论是否使用 `--check`）。

相关内容：[Secrets Management](/gateway/secrets) · [SecretRef Credential Surface](/reference/secretref-credential-surface) · [Security](/gateway/security)

## 重新加载运行时快照

```bash
openclaw secrets reload
openclaw secrets reload --json
openclaw secrets reload --url ws://127.0.0.1:18789 --token <token>
```

使用网关 RPC 方法 `secrets.reload`。如果解析失败，网关会保留其上一次已知正常的快照并返回错误（不会部分激活）。JSON 响应包含 `warningCount`。

选项：`--url <url>`、`--token <token>`、`--timeout <ms>`、`--json`。

## 审计

扫描 OpenClaw 状态以查找：

- 明文密钥存储
- 未解析引用
- 优先级漂移（`auth-profiles.json` 中的凭据覆盖 `openclaw.json` 中的引用）
- `agents/*/agent/models.json` 生成残留（提供者 `apiKey` 值和敏感提供者头）
- 旧版残留（旧版 auth 存储条目、OAuth 提醒）

敏感提供者头的检测基于名称启发式：会标记其名称匹配常见认证/凭据片段（`authorization`、`x-api-key`、`token`、`secret`、`password`、`credential`）的头。

```bash
openclaw secrets audit
openclaw secrets audit --check
openclaw secrets audit --json
openclaw secrets audit --allow-exec
```

报告结构：

- `status`: `clean | findings | unresolved`
- `resolution`: `refsChecked`, `skippedExecRefs`, `resolvabilityComplete`
- `summary`: `plaintextCount`, `unresolvedRefCount`, `shadowedRefCount`, `legacyResidueCount`
- 发现代码：`PLAINTEXT_FOUND`、`REF_UNRESOLVED`、`REF_SHADOWED`、`LEGACY_RESIDUE`

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
- 针对 `openclaw.json` 中含有密钥的字段，以及所选代理范围内的 `auth-profiles.json`；支持的规范表面为：[SecretRef 凭据表面](/reference/secretref-credential-surface)。
- 支持在选择器流程中直接创建新的 `auth-profiles.json` 映射。
- 在应用之前运行预检解析。
- 生成的计划默认启用清理选项（`scrubEnv`、`scrubAuthProfilesForProviderTargets`、`scrubLegacyAuthJson`）。对已清理的明文值，应用是单向操作。
- 未使用 `--apply` 时，CLI 在预检后仍会提示 `Apply this plan now?`。
- 使用 `--apply`（且未使用 `--yes`）时，CLI 会额外提示一次不可逆迁移确认。
- `--json` 会输出计划 + 预检报告，但仍然需要交互式 TTY。

### Exec 提供者安全性

Homebrew 安装通常会在 `/opt/homebrew/bin/*` 下暴露符号链接的二进制文件。仅在受信任的软件包管理器路径确有需要时，才将 `allowSymlinkCommand: true` 与 `trustedDirs` 配合使用（例如 `["/opt/homebrew"]`）。在 Windows 上，如果某个提供者路径无法进行 ACL 验证，OpenClaw 会默认失败关闭；仅对于受信任路径，可在该提供者上设置 `allowInsecurePath: true` 以绕过路径安全检查。

## 应用已保存的计划

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --json
```

`--dry-run` 在不写入文件的情况下验证预检；在 dry-run 中默认跳过 exec SecretRef 检查。写入模式会拒绝包含 exec SecretRef/provider 的计划，除非使用 `--allow-exec`。使用 `--allow-exec` 可在任一模式下选择启用 exec provider 检查/执行。

`apply` 可能更新的内容：

- `openclaw.json`（SecretRef 目标 + 提供者 upsert/delete）
- `auth-profiles.json`（提供者目标清理）
- 旧版 `auth.json` 残留
- `~/.openclaw/.env` 中已迁移值的已知密钥键

计划契约详情（允许的目标路径、验证规则、失败语义）：[Secrets Apply Plan Contract](/gateway/secrets-plan-contract)。

### 为什么没有回滚备份

`secrets apply` 故意不会写入包含旧明文值的回滚备份。安全性来自严格的预检加上近似原子式应用，并在失败时尽最大努力进行内存恢复。

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
