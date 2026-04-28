---
summary: "规范的凭证资格与解析语义，用于认证配置文件"
title: "认证凭证语义"
read_when:
  - 处理认证配置文件解析或凭证路由时
  - 调试模型认证失败或配置文件顺序时
---

本文档定义了在以下组件中使用的规范凭证资格与解析语义：

- `resolveAuthProfileOrder`
- `resolveApiKeyForProfile`
- `models status --probe`
- `doctor-auth`

目标是保持选择时和运行时行为的一致性。

## 稳定的探测原因代码

- `ok`
- `excluded_by_auth_order`
- `missing_credential`
- `invalid_expires`
- `expired`
- `unresolved_ref`
- `no_model`

## 令牌凭证

令牌凭证（`type: "token"`）支持内联 `token` 和/或 `tokenRef`。

### 资格规则

1. 当 `token` 和 `tokenRef` 均缺失时，令牌配置不可用。
2. `expires` 是可选的。
3. 如果存在 `expires`，它必须是大于 `0` 的有限数字。
4. 如果 `expires` 无效（`NaN`、`0`、负数、非有限数或类型错误），则配置因 `invalid_expires` 不可用。
5. 如果 `expires` 已经过期，配置因 `expired` 不可用。
6. `tokenRef` 不可跳过 `expires` 验证。

### 解析规则

1. 解析器语义与 `expires` 的资格语义相匹配。
2. 对于合格的配置，可以从内联值或 `tokenRef` 中解析令牌内容。
3. 无法解析的引用在 `models status --probe` 输出中产生 `unresolved_ref`。

## 显式认证顺序过滤

- 当为提供商设置了 `auth.order.<provider>` 或 auth-store 顺序覆盖时，`models status --probe` 仅探测该提供商解析后的认证顺序中保留的配置文件的 id。
- 该提供商存储在显式顺序中省略的配置文件不会在后续被静默尝试。探测输出会报告它，带有 `reasonCode: excluded_by_auth_order` 和详细信息 `由此提供商的 auth.order 排除。`

## 探测目标解析

- 探测目标可以来自认证配置文件、环境凭证或 `models.json`。
- 如果提供商拥有凭证但 OpenClaw 无法为其解析可探测的模型候选，`models status --probe` 将报告 `status: no_model` 且 `reasonCode: no_model`。

## OAuth SecretRef 策略守卫

- SecretRef 输入仅用于静态凭证。
- 如果配置文件凭证是 `type: "oauth"`，则该配置文件凭证材料不支持 SecretRef 对象。
- 如果 `auth.profiles.<id>.mode` 是 `"oauth"`，则该配置文件的 SecretRef 支持的 `keyRef`/`tokenRef` 输入将被拒绝。
- 违规将在启动/重载认证解析路径中导致硬性失败。

## 遗留兼容消息

为兼容脚本，探测错误保持首行不变：

`认证配置文件凭证缺失或已过期。`

后续行可添加更易于理解的详细信息和稳定的原因代码。

## 相关内容

- [Secrets management](/gateway/secrets)
- [Auth storage](/concepts/oauth)
