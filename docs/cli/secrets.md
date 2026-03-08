---
summary: "`openclaw secrets` 的 CLI 参考（reload、audit、configure、apply）"
read_when:
  - 运行时重新解析 secret 引用
  - 审计明文残留和未解析的引用
  - 配置 SecretRef 并应用单向清理更改
title: "secrets"
---

# `openclaw secrets`

使用 `openclaw secrets` 来管理 SecretRef 并维护活跃的运行时快照健康状态。

命令角色：

- `reload`：gateway RPC (`secrets.reload`)，重新解析引用，且仅在完全成功时切换运行时快照（无配置写入）。
- `audit`：只读扫描配置/认证存储和遗留残留，查找明文、未解析的引用以及优先级漂移。
- `configure`：交互式计划器，用于提供者设置、目标映射和预检（需 TTY）。
- `apply`：执行已保存的计划（`--dry-run` 仅验证），然后清理目标明文残留。

推荐的操作循环：

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets audit --check
openclaw secrets reload
```

CI/门控的退出码说明：

- `audit --check` 发现问题时返回 `1`。
- 未解析的引用返回 `2`。

相关内容：

- Secrets 指南：[Secrets 管理](/gateway/secrets)
- 凭据表面：[SecretRef 凭据表面](/reference/secretref-credential-surface)
- 安全指南：[安全](/gateway/security)

## 重新加载运行时快照

重新解析 secret 引用，原子地替换运行时快照。

```bash
openclaw secrets reload
openclaw secrets reload --json
```

说明：

- 使用 gateway RPC 方法 `secrets.reload`。
- 若解析失败，gateway 保留上一个已知良好快照并返回错误（不进行部分激活）。
- JSON 响应包含 `warningCount`。

## 审计

扫描 OpenClaw 状态，查找：

- 明文秘密存储
- 未解析的引用
- 优先级漂移（`auth-profiles.json` 中凭据覆盖了 `openclaw.json` 中的引用）
- 生成的 `agents/*/agent/models.json` 遗留（提供者 `apiKey` 值和敏感的提供者请求头）
- 遗留残留（遗留认证存储条目、OAuth 提醒）

头部残留说明：

- 敏感提供者请求头检测基于名称启发式（常见认证/凭据请求头名和片段，如 `authorization`、`x-api-key`、`token`、`secret`、`password` 和 `credential`）。

```bash
openclaw secrets audit
openclaw secrets audit --check
openclaw secrets audit --json
```

退出行为：

- `--check` 发现问题时返回非零。
- 未解析的引用返回更高优先级的非零代码。

报告结构重点：

- `status`：`clean | findings | unresolved`
- `summary`：`plaintextCount`、`unresolvedRefCount`、`shadowedRefCount`、`legacyResidueCount`
- 发现代码：
  - `PLAINTEXT_FOUND`
  - `REF_UNRESOLVED`
  - `REF_SHADOWED`
  - `LEGACY_RESIDUE`

## 配置（交互辅助）

交互式构建提供者和 SecretRef 变更，运行预检，并可选择应用：

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

- 首先是提供者设置（对 `secrets.providers` 别名执行 `add/edit/remove`）。
- 其次是凭据映射（选择字段并分配 `{source, provider, id}` 引用）。
- 最后是预检和可选的应用。

参数：

- `--providers-only`：仅配置 `secrets.providers`，跳过凭据映射。
- `--skip-provider-setup`：跳过提供者设置，将凭据映射至已存在的提供者。
- `--agent <id>`：限制 `auth-profiles.json` 目标发现和写入到指定代理存储。

说明：

- 需要交互式 TTY。
- 不可同时使用 `--providers-only` 和 `--skip-provider-setup`。
- `configure` 目标包括 `openclaw.json` 中含秘密的字段及选定代理范围内的 `auth-profiles.json`。
- 支持直接在选择流程中创建新的 `auth-profiles.json` 映射。
- 标准支持表面：[SecretRef 凭据表面](/reference/secretref-credential-surface)。
- 运行时在应用前执行预检解析。
- 生成的计划默认启用清理选项（`scrubEnv`、`scrubAuthProfilesForProviderTargets`、`scrubLegacyAuthJson` 均启用）。
- 应用路径为针对明文值的一次性清理。
- 未使用 `--apply` 时，在预检后仍会提示“是否立即应用此计划？”。
- 使用 `--apply`（但无 `--yes`）时，CLI 会额外提示不可逆确认。

执行提供者安全注意事项：

- Homebrew 安装通常将二进制软链接暴露在 `/opt/homebrew/bin/*` 下。
- 仅在需要受信任的包管理路径时设置 `allowSymlinkCommand: true`，且应配合 `trustedDirs`（例如 `["/opt/homebrew"]`）。
- 在 Windows 上，如果无法对提供者路径进行 ACL 验证，OpenClaw 会严格拒绝。仅对受信任路径，设置 `allowInsecurePath: true` 可绕过路径安全检查。

## 应用已保存的计划

应用或预检已生成的计划：

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --json
```

计划约定详情（允许的目标路径、验证规则和失败语义）：

- [Secrets 应用计划约定](/gateway/secrets-plan-contract)

`apply` 可能更新的内容：

- `openclaw.json`（SecretRef 目标 + 提供者增删）
- `auth-profiles.json`（针对提供者目标的清理）
- 旧版 `auth.json` 残留
- `~/.openclaw/.env` 中已迁移的已知秘密键值

## 为什么不做回滚备份

`secrets apply` 故意不写入包含旧明文值的回滚备份。

安全保障来自严格的预检+原子式应用，并在失败时尽力内存恢复。

## 示例

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

如果 `audit --check` 仍报告明文发现，请更新剩余报告中的目标路径并重试审计。
