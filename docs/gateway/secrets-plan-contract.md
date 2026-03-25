---
summary: "`secrets apply` 计划的合约：目标验证、路径匹配和 `auth-profiles.json` 目标范围"
read_when:
  - 生成或审核 `openclaw secrets apply` 计划时
  - 调试 `Invalid plan target path` 错误时
  - 了解目标类型和路径验证行为时
title: "Secrets Apply 计划合约"
---

# Secrets apply 计划合约

本页定义了 `openclaw secrets apply` 强制执行的严格合约。

如果目标不符合这些规则，应用将在修改配置之前失败。

## 计划文件结构

`openclaw secrets apply --from <plan.json>` 期望有一个包含计划目标的 `targets` 数组：

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

## 支持的目标范围

计划目标接受以下支持的凭据路径：

- [SecretRef 凭据表面](/reference/secretref-credential-surface)

## 目标类型行为

一般规则：

- `target.type` 必须被识别，并且必须匹配规范化后的 `target.path` 结构。

兼容别名仍然被接受以支持现有计划：

- `models.providers.apiKey`
- `skills.entries.apiKey`
- `channels.googlechat.serviceAccount`

## 路径验证规则

每个目标均需通过以下所有验证：

- `type` 必须是被识别的目标类型。
- `path` 必须是非空的点分路径。
- `pathSegments` 可以省略。如果提供，必须规范化后与 `path` 完全相同。
- 禁用的路径分段会被拒绝：`__proto__`，`prototype`，`constructor`。
- 规范化路径必须匹配该目标类型的注册路径格式。
- 如果设置了 `providerId` 或 `accountId`，必须与路径中编码的 ID 匹配。
- `auth-profiles.json` 目标必须包含 `agentId`。
- 创建新的 `auth-profiles.json` 映射时，必须包含 `authProfileProvider`。

## 失败行为

如果目标验证失败，应用会以类似如下错误退出：

```text
Invalid plan target path for models.providers.apiKey: models.providers.openai.baseUrl
```

无效计划不会写入任何内容。

## Exec provider 同意行为

- `--dry-run` 默认跳过 exec SecretRef 检查。
- 包含 exec SecretRefs/providers 的计划在写入模式下会被拒绝，除非设置了 `--allow-exec`。
- 验证/应用包含 exec 的计划时，在 dry-run 和写入命令中都要传递 `--allow-exec`。

## 运行时和审计范围说明

- 仅引用的 `auth-profiles.json` 条目（`keyRef`/`tokenRef`）包含在运行时解析和审计范围内。
- `secrets apply` 写入支持的 `openclaw.json` 目标、支持的 `auth-profiles.json` 目标，以及可选的清理目标。

## 操作员检查

```bash
# 验证计划而不写入
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run

# 然后真正应用
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json

# 对于包含 exec 的计划，在两种模式下都显式选择加入
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
```

如果应用失败并显示无效目标路径消息，请使用 `openclaw secrets configure` 重新生成计划或修正目标路径至上述支持的格式。

## 相关文档

- [Secrets 管理](/gateway/secrets)
- [CLI `secrets`](/cli/secrets)
- [SecretRef 凭据表面](/reference/secretref-credential-surface)
- [配置参考](/gateway/configuration-reference)
