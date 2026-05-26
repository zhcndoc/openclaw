---
summary: "`secrets apply` 计划的契约：目标校验、路径匹配以及 `auth-profiles.json` 目标范围"
read_when:
  - 生成或审查 `openclaw secrets apply` 计划时
  - 调试 `Invalid plan target path` 错误时
  - 理解目标类型和路径校验行为时
title: "Secrets apply 计划契约"
---

本页定义了由 `openclaw secrets apply` 强制执行的严格契约。

如果某个目标不符合这些规则，apply 会在修改配置之前失败。

## Plan 文件形状

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

## Provider upserts and deletes

计划还可以包含另外两个可选的顶层字段，它们会在逐个目标写入的同时修改 `secrets.providers` 映射：

- `providerUpserts` — 一个以 provider 别名为键的对象。每个值都是一个 provider 定义（与 `openclaw.json` 中 `secrets.providers.<alias>` 下接受的形状相同，例如 `exec` 或 `file` provider）。
- `providerDeletes` — 一个要移除的 provider 别名数组。

`providerUpserts` 会先于 `targets` 执行，因此 `target.ref.provider` 可以引用同一计划在 `providerUpserts` 中引入的 provider 别名。没有这一点时，引用了 `openclaw.json` 中尚未配置的别名的计划会失败，并报错 `provider "<alias>" is not configured`。

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

通过 `providerUpserts` 引入的 Exec provider 仍然受 [Exec provider consent behavior](#exec-provider-consent-behavior) 中的 exec 同意规则约束：包含 exec provider 的计划在写入模式下需要 `--allow-exec`。

## Supported target scope

计划目标在以下位置的受支持凭据路径上被接受：

- [SecretRef Credential Surface](/reference/secretref-credential-surface)

## 目标类型行为

通用规则：

- `target.type` 必须可识别，并且必须与规范化后的 `target.path` 形状匹配。

以下兼容别名仍对现有计划被接受：

- `models.providers.apiKey`
- `skills.entries.apiKey`
- `channels.googlechat.serviceAccount`

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

无效计划不会提交任何写入。

## Exec provider 同意行为

- `--dry-run` 默认会跳过 exec SecretRef 检查。
- 在写入模式下，包含 exec SecretRef/provider 的计划会被拒绝，除非设置了 `--allow-exec`。
- 在验证/应用包含 exec 的计划时，在 dry-run 和 write 命令中都要传入 `--allow-exec`。

## 运行时与审计范围说明

- 仅引用的 `auth-profiles.json` 条目（`keyRef`/`tokenRef`）会纳入运行时解析和审计覆盖。
- `secrets apply` 会写入受支持的 `openclaw.json` 目标、受支持的 `auth-profiles.json` 目标，以及可选的清理目标。

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

- [Secrets Management](/gateway/secrets)
- [CLI `secrets`](/cli/secrets)
- [SecretRef Credential Surface](/reference/secretref-credential-surface)
- [Configuration Reference](/gateway/configuration-reference)
