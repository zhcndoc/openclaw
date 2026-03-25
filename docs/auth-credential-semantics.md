---
title: "Auth 凭证语义"
summary: "认证配置文件的规范凭证资格和解析语义"
read_when:
  - 处理认证配置文件解析或凭证路由时
  - 调试模型认证失败或配置文件顺序时
---

# Auth 凭证语义

本文档定义了在以下场景中使用的规范凭证资格和解析语义：

- `resolveAuthProfileOrder`
- `resolveApiKeyForProfile`
- `models status --probe`
- `doctor-auth`

目标是保持选择时和运行时行为的一致性。

## 稳定的原因代码

- `ok`
- `missing_credential`
- `invalid_expires`
- `expired`
- `unresolved_ref`

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

## 向后兼容消息

为兼容脚本，探测错误保持首行不变：

`认证配置文件凭证缺失或已过期。`

接下来的行可以添加易读的详细信息和稳定的原因代码。
