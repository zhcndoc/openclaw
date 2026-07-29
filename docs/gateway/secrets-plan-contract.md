---
summary: "`secrets apply` 计划的契约：目标校验、路径匹配以及 `auth-profiles.json` 目标范围"
read_when:
  - 生成或审查 `openclaw secrets apply` 计划时
  - 调试 `Invalid plan target path` 错误时
  - 理解目标类型和路径校验行为时
title: "Secrets apply 计划契约"
---

本页定义了 `openclaw secrets apply` 强制执行的严格契约。如果某个目标不符合这些规则，`apply` 会在修改任何文件之前失败。

## Plan file requirements

`openclaw secrets apply --from <plan.json>` accepts regular files up to 16 MiB (16,777,216 bytes). The limit applies to the complete serialized file, including whitespace. Directories, FIFOs, device files, and files larger than the limit are rejected before JSON parsing or target validation.

`openclaw secrets configure --plan-out <plan.json>` enforces the same limit on the UTF-8 serialized output before creating the file. Hand-written plans and external plan generators must also keep the serialized file within this boundary.

## Plan file shape

`openclaw secrets apply --from <plan.json>` 期望一个 `targets` 数组，其中包含计划目标：

```json5
{
  version: 1,
  protocolVersion: 1,
  targets: [
    {
      type: "models.providers.apiKey",
      path: "models.providers.openai.apiKey",
      pathSegments: ["models", "providers", "openai", "apiKey"],
      providerId: "openai",
      ref: { source: "env", provider: "default", id: "OPENAI_API_KEY" },
    },
    {
      type: "auth-profiles.api_key.key",
      path: "profiles.openai:default.key",
      pathSegments: ["profiles", "openai:default", "key"],
      agentId: "main",
      ref: { source: "env", provider: "default", id: "OPENAI_API_KEY" },
    },
  ],
}
```

`openclaw secrets configure` 会生成这种形状的计划。你也可以手动编写或编辑一个。

## 提供者上插入与删除

计划还可以包含两个可选的顶层字段，这些字段会在逐目标写入的同时修改 `secrets.providers` 映射：

- `providerUpserts` —— 一个以提供者别名为键的对象。每个值都是一个提供者定义（与 `openclaw.json` 中 `secrets.providers.<alias>` 下接受的形状相同，例如 `exec` 或 `file` 提供者）。
- `providerDeletes` —— 一个要移除的提供者别名数组。

`providerUpserts` 会在 `targets` 之前运行，因此 `target.ref.provider` 可以引用同一个计划在 `providerUpserts` 中引入的提供者别名。没有这个顺序的话，引用尚未在 `openclaw.json` 中配置的别名的计划会失败，并报错 `provider "<alias>" is not configured`。

```json5
{
  version: 1,
  protocolVersion: 1,
  providerUpserts: {
    onepassword_anthropic: {
      source: "exec",
      command: "/usr/bin/op",
      args: ["read", "op://Vault/Anthropic/credential"],
    },
  },
  providerDeletes: ["legacy_unused_alias"],
  targets: [
    {
      type: "models.providers.apiKey",
      path: "models.providers.anthropic.apiKey",
      pathSegments: ["models", "providers", "anthropic", "apiKey"],
      providerId: "anthropic",
      ref: { source: "exec", provider: "onepassword_anthropic", id: "credential" },
    },
  ],
}
```

通过 `providerUpserts` 引入的 Exec 提供者仍然受 [Exec provider consent behavior](#exec-provider-consent-behavior) 中的 exec 同意规则约束：包含 exec 提供者的计划在写入模式下需要 `--allow-exec`。

## 支持的目标范围

对于 [SecretRef Credential Surface](/reference/secretref-credential-surface) 中支持的凭据路径，计划目标是可接受的。

## 目标类型行为

`target.type` 必须是一个可识别的目标类型，并且规范化后的 `target.path` 必须与该类型注册的路径形状匹配。

某些目标类型除了其规范类型名称外，还会为现有计划接受一个兼容别名作为 `target.type`：

| Canonical type                       | Accepted alias                                  |
| ------------------------------------ | ----------------------------------------------- |
| `models.providers.apiKey`            | `models.providers.*.apiKey`                     |
| `skills.entries.apiKey`              | `skills.entries.*.apiKey`                       |
| `channels.googlechat.serviceAccount` | `channels.googlechat.accounts.*.serviceAccount` |

## 路径校验规则

每个目标都会经过以下全部校验：

- `type` 必须是可识别的目标类型。
- `path` 必须是非空的点路径。
- `pathSegments` 可以省略。如果提供，则其规范化结果必须与 `path` 完全相同。
- 禁止的段会被拒绝：`__proto__`、`prototype`、`constructor`。
- 规范化后的路径必须与该目标类型已注册的路径形状匹配。
- 如果设置了 `providerId` 或 `accountId`，它必须与路径中编码的 id 匹配。
- `auth-profiles.json` 目标需要 `agentId`。
- 在创建新的 `auth-profiles.json` 映射时，请包含 `authProfileProvider`。

## 失败行为

如果某个目标未通过校验，apply 会以如下错误退出：

```text
Invalid plan target path for models.providers.apiKey: models.providers.openai.baseUrl
```

对于无效的 plan，不会提交任何写入：目标解析和路径校验会在任何文件被触碰之前运行。另一方面，一旦有效的 plan 开始写入，apply 会先为每个被触碰的文件创建快照，并在同一次运行中后续某次写入失败时恢复这些快照，因此部分写入绝不会导致 config、auth-profile 或 env 状态不同步。

## Exec provider 同意行为

- `--dry-run` 默认会跳过 exec SecretRef 检查。
- 在写入模式下，包含 exec SecretRef/provider 的计划会被拒绝，除非设置了 `--allow-exec`。
- 在验证/应用包含 exec 的计划时，在 dry-run 和 write 命令中都要传入 `--allow-exec`。

## 运行时与审计范围说明

- Ref-only `auth-profiles.json` entries (`keyRef`/`tokenRef`) are included in runtime credential resolution and audit coverage.
- `secrets apply` writes supported `openclaw.json` targets, supported `auth-profiles.json` targets, and three optional scrub passes, each on by default: `scrubEnv` (removes migrated plaintext values from `.env` files in the effective state and active-config directories), `scrubAuthProfilesForProviderTargets` (clears plaintext/unused-ref residue in `auth-profiles.json` for providers a plan just migrated), and `scrubLegacyAuthJson` (drops migrated `api_key` entries from legacy `auth.json` stores). Set any of `options.scrubEnv`, `options.scrubAuthProfilesForProviderTargets`, `options.scrubLegacyAuthJson` to `false` in the plan to skip that pass.

## 操作检查

```bash
# 验证计划而不写入
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run

# 然后正式应用
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json

# 对于包含 exec 的计划，在两种模式下都显式选择允许
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
```

如果 apply 因无效目标路径消息而失败，请使用 `openclaw secrets configure` 重新生成计划，或将目标路径修正为上述受支持的形状。

## 相关文档

- [秘密管理](/gateway/secrets)
- [CLI `secrets`](/cli/secrets)
- [SecretRef 凭证表面](/reference/secretref-credential-surface)
- [配置参考](/gateway/configuration-reference)
