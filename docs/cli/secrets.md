---
summary: "openclaw secrets 的 CLI 参考（reload、audit、configure、apply）"
read_when:
  - 运行时重新解析 secret 引用
  - 审计明文残留和未解析引用
  - 配置 SecretRefs 并应用一次性清理更改
title: "密钥"
---

# `openclaw secrets`

使用 `openclaw secrets` 来管理 SecretRefs，并保持活动运行时快照健康。

命令职责：

- `reload`：网关 RPC（`secrets.reload`），会重新解析引用，并且仅在完全成功时切换运行时快照（不写配置）。
- `audit`：只读扫描配置/auth/generated-model 存储以及旧版残留，查找明文、未解析引用和优先级漂移（除非设置 `--allow-exec`，否则会跳过 exec 引用）。
- `configure`：用于提供者设置、目标映射和预检的交互式规划器（需要 TTY）。
- `apply`：执行已保存的计划（仅用 `--dry-run` 进行验证；dry-run 默认跳过 exec 检查，写入模式会拒绝包含 exec 的计划，除非设置 `--allow-exec`），然后清理目标明文残留。

推荐的操作循环：

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets audit --check
openclaw secrets reload
```

如果你的计划包含 `exec` SecretRefs/providers，请在 dry-run 和写入式 apply 命令中都传入 `--allow-exec`。

CI/门禁的退出码说明：

- `audit --check` 在发现问题时返回 `1`。
- 未解析引用返回 `2`。

相关：

- 密钥指南：[Secrets Management](/gateway/secrets)
- 凭据表面：[SecretRef Credential Surface](/reference/secretref-credential-surface)
- 安全指南：[Security](/gateway/security)

## 重新加载运行时快照

重新解析 secret 引用并原子性切换运行时快照。

```bash
openclaw secrets reload
openclaw secrets reload --json
openclaw secrets reload --url ws://127.0.0.1:18789 --token <token>
```

说明：

- 使用网关 RPC 方法 `secrets.reload`。
- 如果解析失败，网关会保留上一次已知良好的快照并返回错误（不会部分激活）。
- JSON 响应包含 `warningCount`。

选项：

- `--url <url>`
- `--token <token>`
- `--timeout <ms>`
- `--json`

## 审计

扫描 OpenClaw 状态中的以下内容：

- 明文密钥存储
- 未解析引用
- 优先级漂移（`auth-profiles.json` 中的凭据覆盖 `openclaw.json` 中的引用）
- `agents/*/agent/models.json` 生成残留（提供者 `apiKey` 值和敏感提供者头）
- 旧版残留（旧版 auth 存储条目、OAuth 提醒）

头部残留说明：

- 敏感提供者头的检测基于名称启发式（常见的 auth/credential 头名称及其片段，例如 `authorization`、`x-api-key`、`token`、`secret`、`password` 和 `credential`）。

```bash
openclaw secrets audit
openclaw secrets audit --check
openclaw secrets audit --json
openclaw secrets audit --allow-exec
```

退出行为：

- `--check` 在发现问题时以非零状态退出。
- 未解析引用会以更高优先级的非零代码退出。

报告结构要点：

- `status`: `clean | findings | unresolved`
- `resolution`: `refsChecked`、`skippedExecRefs`、`resolvabilityComplete`
- `summary`: `plaintextCount`、`unresolvedRefCount`、`shadowedRefCount`、`legacyResidueCount`
- 发现代码：
  - `PLAINTEXT_FOUND`
  - `REF_UNRESOLVED`
  - `REF_SHADOWED`
  - `LEGACY_RESIDUE`

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

流程：

- 先进行提供者设置（对 `secrets.providers` 别名执行 `add/edit/remove`）。
- 再进行凭据映射（选择字段并分配 `{source, provider, id}` 引用）。
- 最后进行预检和可选应用。

标志：

- `--providers-only`：仅配置 `secrets.providers`，跳过凭据映射。
- `--skip-provider-setup`：跳过提供者设置，并将凭据映射到现有提供者。
- `--agent <id>`：将 `auth-profiles.json` 的目标发现和写入范围限定到单个代理存储。
- `--allow-exec`：在预检/应用期间允许 exec SecretRef 检查（可能会执行提供者命令）。

说明：

- 需要交互式 TTY。
- 不能将 `--providers-only` 与 `--skip-provider-setup` 同时使用。
- `configure` 会针对所选代理范围，处理 `openclaw.json` 中的含密钥字段以及 `auth-profiles.json`。
- `configure` 支持在选择器流程中直接创建新的 `auth-profiles.json` 映射。
- 支持的规范化表面：[SecretRef Credential Surface](/reference/secretref-credential-surface)。
- 它会在应用前执行预检解析。
- 如果预检/应用包含 exec 引用，请在两个步骤中都保持 `--allow-exec` 开启。
- 生成的计划默认启用清理选项（`scrubEnv`、`scrubAuthProfilesForProviderTargets`、`scrubLegacyAuthJson` 全部启用）。
- 清理后的明文值的应用路径是单向的。
- 如果不使用 `--apply`，CLI 在预检后仍会提示 `Apply this plan now?`。
- 使用 `--apply`（且未使用 `--yes`）时，CLI 会额外提示一次不可逆确认。
- `--json` 会打印计划和预检报告，但命令仍然需要交互式 TTY。

exec 提供者安全说明：

- Homebrew 安装通常会在 `/opt/homebrew/bin/*` 下暴露符号链接二进制文件。
- 仅在受信任的软件包管理器路径确有必要时才设置 `allowSymlinkCommand: true`，并将其与 `trustedDirs` 配对使用（例如 `["/opt/homebrew"]`）。
- 在 Windows 上，如果某个提供者路径无法进行 ACL 验证，OpenClaw 会以失败关闭（fail closed）。仅对受信任路径，可在该提供者上设置 `allowInsecurePath: true` 以绕过路径安全检查。

## 应用已保存的计划

应用或预检之前生成的计划：

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --json
```

exec 行为：

- `--dry-run` 会在不写入文件的情况下验证预检。
- dry-run 默认跳过 exec SecretRef 检查。
- 写入模式会拒绝包含 exec SecretRefs/providers 的计划，除非设置 `--allow-exec`。
- 在任一模式中，都可使用 `--allow-exec` 来启用 exec 提供者检查/执行。

计划契约细节（允许的目标路径、验证规则和失败语义）：

- [Secrets Apply Plan Contract](/gateway/secrets-plan-contract)

`apply` 可能更新的内容：

- `openclaw.json`（SecretRef 目标 + 提供者 upsert/delete）
- `auth-profiles.json`（提供者目标清理）
- 旧版 `auth.json` 残留
- `~/.openclaw/.env` 中已迁移值的已知密钥键

## 为什么没有回滚备份

`secrets apply` 有意不写入包含旧明文值的回滚备份。

安全性来自严格的预检 + 原子性近似的应用，以及在失败时尽力进行内存恢复。

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
