---
summary: "`secrets apply` 计划的合约：目标验证、路径匹配和 SQLite 身份验证配置文件目标范围"
read_when:
  - "生成或审查 `openclaw secrets apply` 计划时"
  - "调试 `Invalid plan target path` 错误时"
  - "理解目标类型和路径校验行为时"
title: "Secrets apply 计划契约"
---

本页定义了 `openclaw secrets apply` 强制执行的严格合同。如果目标与这些规则不匹配，则在更改任何文件之前应用会失败。

## <a id="plan-file-requirements"></a> 计划文件要求

`openclaw secrets apply --from <plan.json>` 接受最多 16 MiB（16,777,216 字节）的常规文件。该限制适用于完整的序列化文件，包括空格。在 JSON 解析或目标验证之前，目录、FIFO、设备文件和大于限制的文件将被拒绝。

在创建文件之前，`openclaw secrets configure --plan-out <plan.json>` 对 UTF-8 序列化输出强制执行相同的限制。手写计划和外部计划生成器也必须将序列化文件保持在此边界内。

## <a id="plan-file-shape"></a> 平面文件形状

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

## <a id="provider-upserts-and-deletes"></a> 提供者上插入与删除

计划还可以包含两个可选的顶层字段，这些字段会在逐目标写入的同时修改 `secrets.providers` 映射：

- `providerUpserts`——由提供者别名键入的对象。每个值都是一个提供程序定义（在 `openclaw.json`、e.g.、`exec` 或 `file` 提供程序中的 `secrets.providers.<alias>` 下接受的形状相同）。
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

## <a id="supported-target-scope"></a> 支持的目标范围

对于 [SecretRef Credential Surface](/reference/secretref-credential-surface) 中支持的凭据路径，计划目标是可接受的。

## <a id="target-type-behavior"></a> 目标类型行为

`target.type` 必须是一个可识别的目标类型，并且规范化后的 `target.path` 必须与该类型注册的路径形状匹配。

除了主要类型名称之外，某些目标类型还接受现有计划的兼容性别名 `target.type`：

| 初级型                         | 接受的别名                                  |
| ------------------------------------ | ----------------------------------------------- |
| `models.providers.apiKey`            | `models.providers.*.apiKey`                     |
| `skills.entries.apiKey`              | `skills.entries.*.apiKey`                       |
| `channels.googlechat.serviceAccount` | `channels.googlechat.accounts.*.serviceAccount` |

## <a id="path-validation-rules"></a> 路径校验规则

每个目标都会经过以下全部校验：

- `type` 必须是可识别的目标类型。
- `path` 必须是非空的点路径。
- `pathSegments` 可以省略。如果提供，则其规范化结果必须与 `path` 完全相同。
- 禁止的段会被拒绝：`__proto__`、`prototype`、`constructor`。
- 规范化后的路径必须与该目标类型已注册的路径形状匹配。
- 如果设置了 `providerId` 或 `accountId`，它必须与路径中编码的 id 匹配。
- SQLite 身份验证配置文件目标需要 `agentId`。
- 创建新的身份验证配置文件映射时，请包含 `authProfileProvider`。

## <a id="failure-behavior"></a> 失败行为

如果某个目标未通过校验，apply 会以如下错误退出：

```text
Invalid plan target path for models.providers.apiKey: models.providers.openai.baseUrl
```

不会为无效计划提交任何写入：在更改任何状态之前运行目标解析和路径验证。对于有效的计划，请在写入之前应用捕获文件快照和 SQLite 身份验证存储快照。如果以后的写入失败，它会尝试恢复文件并有条件地回滚身份验证存储写入，而不覆盖并发凭据更改。

## <a id="exec-provider-consent-behavior"></a> Exec provider 同意行为

- `--dry-run` 默认会跳过 exec SecretRef 检查。
- 包含 exec SecretRefs/providers 的计划在写入模式下将被拒绝，除非设置了 `--allow-exec`。
- 当 validating/applying 执行包含计划时，在空运行和写入命令中传递 `--allow-exec`。

## <a id="runtime-and-audit-scope-notes"></a> 运行时与审计范围说明

- Ref-only SQLite 身份验证配置文件条目 （`keyRef`/`tokenRef`） 包含在运行时凭证解析和审计覆盖范围中。
- `secrets apply` 写入支持的 `openclaw.json` 目标和 SQLite auth-profile 目标。默认情况下，两个可选的擦洗通道处于启用状态：
  - `scrubEnv` 从有效状态和 active-config 目录中的 `.env` 文件中删除迁移的明文值。
  - `scrubAuthProfilesForProviderTargets` 为刚刚迁移的计划的提供商清除授权存储中的 plaintext/unused-ref 残留。

  在计划中将任一选项设置为 `false` 以跳过该过程。

- `scrubLegacyAuthJson` 是已弃用的计划输入，并且始终处于禁用状态。 Doctor 拥有旧版 `auth.json` 迁移。 `secrets apply` 不读取或重写它。

## <a id="operator-checks"></a> 操作检查

```bash
# Validate plan without writes
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run

# Then apply for real
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json

# For exec-containing plans, opt in explicitly in both modes
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
```

如果 apply 因无效目标路径消息而失败，请使用 `openclaw secrets configure` 重新生成计划，或将目标路径修正为上述受支持的形状。

## <a id="related-docs"></a> 相关文档

- [秘密 Management](/gateway/secrets)
- [CLI `secrets`](/cli/secrets)
- [SecretRef 凭证 Surface](/reference/secretref-credential-surface)
- [配置 Reference](/gateway/configuration-reference)
