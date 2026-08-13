---
summary: "认证配置文件的规范凭据资格与解析语义"
title: "Auth 凭据语义"
read_when:
  - 正在处理 auth 配置文件解析或凭据路由
  - 调试模型认证失败或配置文件顺序问题
---

这些语义使选择时和运行时的 auth 行为保持一致。它们被以下部分共享：

- `resolveAuthProfileOrder`（配置文件排序）
- `resolveApiKeyForProfile`（运行时凭据解析）
- `openclaw models status --probe`
- `openclaw doctor` auth 检查（`doctor-auth`）

## 稳定的探测原因码

探测结果包含一个 `status` 桶（`ok`、`auth`、`rate_limit`、`billing`、`timeout`、`format`、`unknown`、`no_model`），以及在探测未到达模型调用时使用的稳定 `reasonCode`：

| `reasonCode`             | 含义                                                                         |
| ------------------------ | ---------------------------------------------------------------------------- |
| `excluded_by_auth_order` | 该配置文件未包含在其提供者的显式认证顺序中。                                 |
| `missing_credential`     | 未配置内联凭据或 SecretRef。                                                 |
| `expired`                | Token 的 `expires` 时间早于当前时间。                                        |
| `invalid_expires`        | `expires` 不是一个有效的正 Unix 毫秒时间戳。                                 |
| `unresolved_ref`         | 配置的 SecretRef 无法解析。                                                  |
| `ineligible_profile`     | 配置文件与提供者配置不兼容（包括格式错误的密钥输入）。                       |
| `no_model`               | 凭据存在，但未解析出任何可探测的模型候选项。                                 |

资格检查会将可用凭据的原因码报告为 `ok`。

## Token 凭据

Token 凭据（`type: "token"`）支持内联 `token` 和/或 `tokenRef`。

### 资格规则

1. 当 `token` 和 `tokenRef` 都缺失时，Token 配置文件不符合资格（`missing_credential`）。
2. `expires` 是可选项。存在时，它必须是一个有限的 Unix epoch 毫秒数，且大于 `0`，并且不大于 JavaScript `Date` 的最大时间戳（8640000000000000）。
3. 如果 `expires` 无效（类型错误、`NaN`、`0`、负数、非有限值，或超过该最大值），则该配置文件不符合资格，错误为 `invalid_expires`。
4. 如果 `expires` 已经过期，则该配置文件不符合资格，错误为 `expired`。
5. `tokenRef` 不会绕过 `expires` 校验。

### 解析规则

1. 解析器语义与 `expires` 的资格语义一致。
2. 对于符合资格的配置文件，token 材料可以从内联值或 `tokenRef` 中解析。
3. 无法解析的引用会在 `models status --probe` 输出中产生 `unresolved_ref`。

## Agent 复制可移植性

Agent auth 继承采用读透式。当某个 agent 没有本地配置文件时，它会在运行时从默认/主 agent 存储中解析配置文件，而不会将密钥材料复制到自身的凭据存储中（`agents/<agentId>/agent/openclaw-agent.sqlite`）。

显式复制流程（例如 `openclaw agents add`）使用此可移植性策略：

- `api_key` 和 `token` 配置文件是可移植的，除非 `copyToAgents: false`。
- `oauth` 配置文件默认不可移植，因为刷新令牌可能是一次性的或对轮换敏感。
- 仅当已知跨 agent 复制刷新材料是安全的时候，Provider 拥有的 OAuth 流程才可以通过 `copyToAgents: true` 选择启用；该显式启用仅在配置文件携带内联的访问/刷新材料时生效。

不可移植的配置文件仍可通过读透式继承使用，除非目标 agent 单独登录并创建自己的本地配置文件。

## 仅配置的 auth 路由

`auth.profiles` 中 `mode: "aws-sdk"` 的条目是路由元数据，不是存储的凭据。它们在目标提供方使用 `models.providers.<id>.auth: "aws-sdk"` 时有效，这是插件拥有的 Amazon Bedrock 配置所写入的路由。这些 profile id 可能会出现在 `auth.order` 和会话覆盖中，即使凭据存储中没有匹配的条目。

不要在凭据存储中写入 `type: "aws-sdk"`；存储的凭据只能是 `api_key`、`token` 或 `oauth`。如果旧版 `auth-profiles.json` 中有这样的标记，`openclaw doctor --fix` 会将其移到 `auth.profiles`，并从存储中移除该标记。

## 显式 auth 顺序过滤

- 当为某个提供方设置了 `auth.order.<provider>` 或 auth-store 顺序覆盖时，`models status --probe` 只会探测该提供方解析后的 auth 顺序中仍保留的配置文件 id。已存储的覆盖优先于 `auth.order` 配置。
- 该提供方已存储但未包含在显式顺序中的配置文件不会在之后被静默尝试。探测输出会以 `reasonCode: excluded_by_auth_order` 报告该配置文件，详细信息为 `Excluded by auth.order for this provider.`
- 有效的会话用户固定配置是一个明确的每会话例外：即使该配置文件未包含在提供方顺序中，OpenClaw 也会先尝试该配置文件，然后使用按顺序排列的同提供方配置文件作为重试候选项。冷却或禁用窗口只适用于受影响的配置文件；不会抑制其符合资格的同级配置文件。

## 探测目标解析

- 探测目标可以来自认证配置文件、环境凭据或 `models.json`（结果 `source`：`profile`、`env`、`models.json`）。
- 如果某个提供方有凭据，但 OpenClaw 无法为其解析出可探测的模型候选项，则 `models status --probe` 会报告 `status: no_model`，并带有 `reasonCode: no_model`。

## 外部 CLI 凭据发现

- 仅在提供方、运行时或 auth 配置文件处于当前操作的作用域内，或者该外部来源对应的本地已存储配置文件已存在时，才会发现由外部 CLI 持有的仅运行时凭据（`claude-cli` 对应 Claude CLI，`openai` 对应 Codex CLI，`minimax-portal` 对应 MiniMax CLI）。
- Auth-store 调用方会选择明确的外部 CLI 发现模式：`none` 表示仅使用持久化/插件认证，`existing` 表示刷新已存储的外部 CLI 配置文件，或 `scoped` 表示针对具体的提供方/配置文件集合。
- 只读/状态路径传递 `allowKeychainPrompt: false`；它们仅使用基于文件的外部 CLI 凭据，不读取或重用 macOS Keychain 的结果。

## OAuth SecretRef 策略保护

SecretRef 输入仅用于静态凭据。OAuth 凭据是在运行时可变的（刷新流程会持久化轮换后的令牌），因此由 SecretRef 支持的 OAuth 材料会将可变状态分散到不同的存储中。

- 如果某个 profile 凭据的 `type` 为 `"oauth"`，则该 profile 上任何凭据材料字段都将拒绝使用 SecretRef 对象。
- 如果 `auth.profiles.<id>.mode` 为 `"oauth"`，则该 profile 的 SecretRef 支持的 `keyRef`/`tokenRef` 输入将被拒绝。
- 违规将导致硬失败（抛出错误），发生在启动/重新加载密钥准备和 profile 解析路径中。

## 向后兼容消息

为兼容脚本，探测错误保持第一行不变：

`Auth profile credentials are missing or expired.`

人类可读的详细信息和稳定的原因代码会在后续行中以 `↳ Auth reason [code]: ...` 的形式给出。

## 相关内容

- [Secrets 管理](/gateway/secrets)
- [认证存储](/concepts/oauth)
