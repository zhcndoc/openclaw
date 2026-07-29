---
summary: "Resolve SecretRefs and give agents curated, audited access to 1Password"
read_when:
  - You want agents to request curated 1Password secrets
  - You want OpenClaw config credentials to resolve from 1Password
  - You need per-secret approval policy and audit history
  - You are configuring a 1Password service account for OpenClaw
title: "1Password"
---

# 1Password

The bundled `onepassword` plugin has two independent, opt-in surfaces:

- a managed exec provider that resolves configured [SecretRefs](/gateway/secrets)
  during Gateway startup, reload, audit, and apply preflight
- a policy-controlled agent tool that reads a curated set of 1Password fields

Both use the official `op` CLI and the same service-account token file. Enabling
the plugin alone does not expose the agent tool: that surface also requires a
configured item registry.

## 安全模型

- Service-account authentication only. The token stays in a local credentials
  file and is never accepted in `openclaw.json`.
- Curated agent registry only. Agents can list configured slugs, but the plugin
  never enumerates a 1Password vault. SecretRef reads are limited to references
  explicitly stored on registered OpenClaw credential targets.
- Per-slug `auto`, `approve`, or `deny` policy.
- Approval grants expire. A cached value never bypasses current policy.
- Every access attempt is recorded in OpenClaw's shared SQLite state. Audit
  rows include the supplied reason; keep reasons non-sensitive. The broker
  never copies a fetched value or the service token into an audit row.
- After the current tool execution, OpenClaw-owned transcript persistence
  replaces a successful `get` value with redacted metadata.
- The value is model-visible for that execution. If the model copies it into a
  later tool call or reply, that separate record is outside this plugin's
  persistence hook. Keep policies narrow and do not ask the model to echo a
  value.
- The plugin invokes `op` once per cache miss. It does not retry rate limits or
  other failures.
- Each `op` call runs with a minimal environment that disables 1Password
  desktop-app integration (`OP_LOAD_DESKTOP_APP_SETTINGS=false`,
  `OP_BIOMETRIC_UNLOCK_ENABLED=false`), so a 1Password app installed on the
  Gateway host never triggers biometric or macOS permission dialogs.

Give the service account read access only to the vaults and items used by
registered SecretRefs and agent-tool slugs.

## 开始之前

你需要：

- 在 Gateway 主机上安装 1Password CLI（`op`）
- 一个有权访问所选项目的 1Password 服务账户
- 一个专用的服务账户令牌文件

启用内置插件：

```bash
openclaw plugins enable onepassword
```

在 OpenClaw 状态目录下创建令牌目录和文件：

```bash
mkdir -p ~/.openclaw/credentials/onepassword
chmod 700 ~/.openclaw/credentials/onepassword
printf '%s' "$OP_SERVICE_ACCOUNT_TOKEN" > \
  ~/.openclaw/credentials/onepassword/service-account-token
chmod 600 ~/.openclaw/credentials/onepassword/service-account-token
unset OP_SERVICE_ACCOUNT_TOKEN
```

当设置了 `OPENCLAW_STATE_DIR` 时，请将 `~/.openclaw` 替换为该目录。
如果令牌文件对组用户或其他用户可读或可写，插件会发出一次警告。

## Configure SecretRefs

Create a secrets apply plan for common model provider keys:

```bash
openclaw onepassword secretref setup \
  --anthropic-id op://Automation/Anthropic/credential \
  --openrouter-id op://Automation/OpenRouter/credential \
  --plan-out ./openclaw-1password-secrets-plan.json
```

Use `--provider-key <provider=id>` for another model provider, or
`--target <path=id>` for any registered
[SecretRef credential target](/reference/secretref-credential-surface).
The command requires at least one target and writes a plan. Inspect it, check
the local `op` and token-file prerequisites, then apply and reload:

```bash
openclaw onepassword secretref status
openclaw secrets apply --from ./openclaw-1password-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from ./openclaw-1password-secrets-plan.json --allow-exec
openclaw secrets audit --check --allow-exec
openclaw secrets reload
```

Before apply, status can report that the provider itself is not configured yet;
`prerequisites ready: yes` confirms that the trusted `op` executable and an
accepted non-empty token file are ready. After apply, `ready: yes` confirms both the
provider wiring and prerequisites. Missing or unsafe prerequisites produce
actionable next steps without printing the token or raw resolver errors.

Manual provider configuration uses the existing plugin id:

```json5
{
  plugins: {
    entries: {
      onepassword: { enabled: true },
    },
  },
  secrets: {
    providers: {
      onepassword: {
        source: "exec",
        pluginIntegration: {
          pluginId: "onepassword",
          integrationId: "onepassword",
        },
      },
    },
  },
  models: {
    providers: {
      openai: {
        apiKey: {
          source: "exec",
          provider: "onepassword",
          id: "op://Automation/OpenAI/credential",
        },
      },
    },
  },
}
```

References use `op://<vault>/<item>/<field>` or
`op://<vault>/<item>/<section>/<field>`. Vault, item, section, and field names
may contain spaces. The setup command stores references that do not fit
OpenClaw's shared exec-id grammar in a plugin-local opaque form and decodes them
only inside the resolver. Very long references should use stable 1Password IDs;
they are shorter and reduce the number of 1Password API requests.

The SecretRef resolver runs at most four `op read` processes concurrently,
disables the 1Password CLI cache so reloads observe rotated values, never uses
desktop-app integration, and does not expose an agent tool for arbitrary reads.
Before passing the service-account token, both plugin surfaces
resolve the executable and reject paths that another local account can replace;
Windows ACL verification must also succeed. Check provider wiring and local
readiness with:

```bash
openclaw onepassword secretref status --json
```

## Configure registered secrets

将插件配置添加到 `openclaw.json`：

```jsonc
{
  "plugins": {
    "entries": {
      "onepassword": {
        "enabled": true,
        "config": {
          "vault": "Automation",
          "defaultPolicy": "approve",
          "cacheTtlSeconds": 300,
          "grantTtlHours": 720,
          "opTimeoutMs": 15000,
          "items": {
            "repository-token": {
              "item": "Repository automation token",
              "field": "credential",
              "policy": "approve",
              "description": "Repository automation 的令牌",
            },
            "model-key": {
              "item": "模型提供商密钥",
              "vault": "Agent credentials",
              "policy": "auto",
            },
          },
        },
      },
    },
  },
}
```

Slug 使用小写字母、数字和连字符，以字母或数字开头，并且最多包含 64 个字符。一个注册表最多可包含 32 个 slug；描述最多可包含 200 个字符。`field` 接受一个字段标签或 ID，不能包含逗号，默认值为 `credential`。条目级别的 `vault` 会覆盖默认 vault。`opBin` 可以设置 `op` 可执行文件的绝对路径；否则插件会从 `PATH` 中解析 `op`。条目标题不能以连字符开头。

## 使用 agent 工具

工具名称是 `onepassword`。

列出已注册的 slug：

```json
{ "action": "list" }
```

结果只包含 slug、描述、策略，以及是否存在有效的常设授权。它绝不会包含秘密值，也不会查询 1Password。

请求一个密钥：

```json
{
  "action": "get",
  "slug": "repository-token",
  "reason": "Authenticate the requested repository operation"
}
```

`reason` 是必需的，必须非空，并且限制为 300 个字符。成功的 `get` 会返回该值以及配置的 slug、项目标题和字段标签。

The tool schema also declares an internal `authorizationNonce` parameter. The
policy layer injects it after evaluating the request to hand the authorization
to the executing tool call. Never set it manually: the policy hook overwrites
any supplied value, and an unknown value fails the request.

## Policy tiers and approvals

- `auto`：立即获取并审计请求。
- `deny`：阻止并审计请求。
- `approve`：使用未过期的常设授权，或请人工允许一次、
  始终允许，或拒绝。

允许一次只授权当前工具调用。始终允许会为该代理和 slug 写入一个常设
授权到 SQLite；其他代理必须获得各自的
审批。OpenClaw 仅在调用方具有明确的代理
身份时提供始终允许。该授权在 `grantTtlHours`
后过期，默认值为 720 小时。
未解决或超时的审批会拒绝该请求；最长审批
等待时间为 600 秒。插件最多保留 1,024 个常设授权；达到该
上限时，最旧的授权会被移除，其代理必须批准下一次访问。

Each evaluated authorization is single-use and is handed to the executing tool
call through shared SQLite state, so the handoff also works when more than one
plugin instance is active in the gateway process. Unused authorizations expire
after the 600-second approval window.

The in-memory cache defaults to 300 seconds and is bounded by the configured
slug registry. Set `cacheTtlSeconds` to `0` to disable it. Policy is evaluated
before every cache lookup, and cache hits are audited. Runtime config reloads
take effect at each policy and execution boundary; disabling the plugin or
removing, denying, or retargeting a slug invalidates pending authorization and
cached values.

## 检查状态和审计历史

显示就绪状态和注册数量：

```bash
openclaw onepassword status
```

这会报告令牌文件是否存在、`op` 是否已解析及其路径、
已注册条目数量，以及按策略划分的数量。它绝不会读取或打印
令牌或密钥值。

显示最近 50 条审计记录：

```bash
openclaw onepassword audit
openclaw onepassword audit --limit 100
```

Rows are newest first and show timestamp, agent, slug, outcome, an `errorCode`
when the attempt failed, and a truncated reason. The reason is stored as
supplied; the broker never adds the fetched value to the audit log.

## 1Password CLI 行为

每次缓存未命中都会使用已配置的项目、保险库和精确的字段选择器运行 `op item get`，输出 JSON，设置有界超时，并带上 `--cache=false`。子进程只接收该字段，而不是整个项目。子进程环境中仅包含 `OP_SERVICE_ACCOUNT_TOKEN` 和 `HOME`。

The plugin makes one attempt. `RATE_LIMITED` errors should be handled by waiting
before a later agent request; the plugin does not create an automatic retry
loop.

## Error codes

Failed attempts carry one closed error code in the tool result and the audit
row.

1Password access errors:

| Code              | Meaning                                                          |
| ----------------- | ---------------------------------------------------------------- |
| `TOKEN_MISSING`   | Token file is missing or empty                                   |
| `OP_NOT_FOUND`    | `op` binary could not be resolved                                |
| `ITEM_NOT_FOUND`  | Configured item is not in the vault                              |
| `FIELD_NOT_FOUND` | Configured field is not on the item; available labels are listed |
| `RATE_LIMITED`    | 1Password service-account rate limit reached                     |
| `AUTH_FAILED`     | Service-account authentication failed                            |
| `TIMEOUT`         | `op` exceeded `opTimeoutMs`                                      |
| `OP_ERROR`        | Any other `op` failure or invalid output                         |

Policy and validation errors:

| Code                                               | Meaning                                                                      |
| -------------------------------------------------- | ---------------------------------------------------------------------------- |
| `INVALID_ACTION`, `INVALID_REASON`, `INVALID_SLUG` | Request failed input validation                                              |
| `UNKNOWN_SLUG`                                     | Slug is not in the configured registry                                       |
| `TOOL_CALL_ID_MISSING`                             | Call arrived without a tool call id                                          |
| `POLICY_NOT_EVALUATED`                             | No matching authorization for this call; the request was not policy-approved |
| `POLICY_CHANGED`                                   | Config changed between approval and execution                                |
| `GRANT_EXPIRED`                                    | Standing grant lapsed before execution                                       |
| `APPROVAL_CANCELLED`                               | The run was aborted while the approval was pending                           |
