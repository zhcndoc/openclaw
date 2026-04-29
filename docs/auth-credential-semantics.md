---
summary: "认证配置文件的规范凭据资格与解析语义"
title: "Auth 凭据语义"
read_when:
  - 正在处理 auth 配置文件解析或凭据路由
  - 调试模型认证失败或配置文件顺序问题
---

本文档定义了在以下范围内使用的规范凭据资格与解析语义：

- `resolveAuthProfileOrder`
- `resolveApiKeyForProfile`
- `models status --probe`
- `doctor-auth`

目标是保持选择阶段与运行时行为一致。

## 稳定的探测原因码

- `ok`
- `excluded_by_auth_order`
- `missing_credential`
- `invalid_expires`
- `expired`
- `unresolved_ref`
- `no_model`

## Token 凭据

Token 凭据（`type: "token"`）支持内联 `token` 和/或 `tokenRef`。

### 资格规则

1. 当 `token` 和 `tokenRef` 都不存在时，token 配置文件不具备资格。
2. `expires` 为可选项。
3. 如果存在 `expires`，它必须是一个大于 `0` 的有限数字。
4. 如果 `expires` 无效（`NaN`、`0`、负数、非有限值或类型错误），则该配置文件不具备资格，原因码为 `invalid_expires`。
5. 如果 `expires` 位于过去，则该配置文件不具备资格，原因码为 `expired`。
6. `tokenRef` 不会绕过 `expires` 校验。

### 解析规则

1. 解析器语义与 `expires` 的资格语义一致。
2. 对于具备资格的配置文件，token 材料可以从内联值或 `tokenRef` 中解析。
3. 无法解析的引用会在 `models status --probe` 输出中产生 `unresolved_ref`。

## Agent 复制可移植性

Agent 认证继承采用读穿透方式。当某个 agent 没有本地配置文件时，它可以在运行时从默认/main agent 存储中解析配置文件，而无需将密钥材料复制到自己的 `auth-profiles.json` 中。

显式复制流程（例如 `openclaw agents add`）使用此可移植性策略：

- `api_key` 配置文件默认可移植，除非 `copyToAgents: false`。
- `token` 配置文件默认可移植，除非 `copyToAgents: false`。
- `oauth` 配置文件默认不可移植，因为刷新令牌可能是一次性的或对轮换敏感。
- 由提供方拥有的 OAuth 流程只有在已知跨 agent 复制刷新材料是安全的情况下，才可选择设置 `copyToAgents: true`。

不可移植的配置文件仍可通过读穿透继承访问，除非目标 agent 单独登录并创建自己的本地配置文件。

## 显式 auth 顺序过滤

- 当为某个提供方设置了 `auth.order.<provider>` 或 auth-store 顺序覆盖时，`models status --probe` 只会探测保留在该提供方已解析 auth 顺序中的配置文件 id。
- 该提供方中被显式顺序省略的已存储配置文件不会在之后被静默尝试。探测输出会将其报告为 `reasonCode: excluded_by_auth_order`，并给出细节 `Excluded by auth.order for this provider.`

## 探测目标解析

- 探测目标可以来自 auth 配置文件、环境凭据或 `models.json`。
- 如果某个提供方有凭据，但 OpenClaw 无法为其解析出可探测的模型候选项，`models status --probe` 会以 `status: no_model` 和 `reasonCode: no_model` 报告。

## 外部 CLI 凭据发现

- 仅当提供方、运行时或 auth 配置文件处于当前操作的作用域内，或者该外部来源的本地已存储配置文件已存在时，才会发现由外部 CLI 持有的仅运行时凭据。
- 只读/状态路径会传递 `allowKeychainPrompt: false`；它们仅使用文件支持的外部 CLI 凭据，不会读取或复用 macOS Keychain 结果。

## OAuth SecretRef 策略保护

- SecretRef 输入仅用于静态凭据。
- 如果某个配置文件凭据的 `type` 为 `oauth`，则不支持该配置文件凭据材料使用 SecretRef 对象。
- 如果 `auth.profiles.<id>.mode` 为 `"oauth"`，则该配置文件基于 SecretRef 的 `keyRef`/`tokenRef` 输入会被拒绝。
- 违反上述规则会在启动/重载 auth 解析路径中导致硬失败。

## 向后兼容消息

为兼容脚本，探测错误保持第一行不变：

`Auth profile credentials are missing or expired.`

后续行可添加更友好的说明和稳定的原因码。

## 相关内容

- [Secrets management](/gateway/secrets)
- [Auth storage](/concepts/oauth)
