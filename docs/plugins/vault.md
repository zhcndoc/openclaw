---
summary: "使用内置的 Vault 插件从 HashiCorp Vault 解析 SecretRefs"
read_when:
  - 你希望 OpenClaw 从 HashiCorp Vault 读取 API 密钥
  - 你正在本地机器或服务器上设置 SecretRefs
  - 你需要配置基于 Vault 的模型提供方凭据
title: "Vault SecretRefs"
---

# Vault SecretRefs

内置的 Vault 插件可让 OpenClaw 在 Gateway 启动和重载时，从
HashiCorp Vault 解析 `exec` SecretRefs。OpenClaw 会将 Vault
引用保存在配置中，将解析后的值保留在内存中的 secrets 快照里，
并且不会把解析后的 API 密钥写回 `openclaw.json`。

当你已经在运行 Vault，或者希望模型提供方密钥存放在 OpenClaw 配置文件
之外时，可以使用此功能。有关 SecretRef 运行时模型，请参阅
[密钥管理](/gateway/secrets)。

## 开始之前

你需要：

- 已启用内置的 `vault` 插件的 OpenClaw
- 一个可访问的 Vault 服务器
- Vault 认证方式，能够生成具有对 OpenClaw 应解析的密钥路径的读取权限的客户端令牌
- 启动 Gateway 的环境必须包含 `VAULT_ADDR`，并且还要包含以下其中之一：
  `VAULT_TOKEN`，`OPENCLAW_VAULT_AUTH_METHOD=token_file` 搭配 `VAULT_TOKEN_FILE`，
  或者已配置的 JWT/Kubernetes 登录

解析器通过 Node 使用 HTTP 与 Vault 通信。Gateway 不需要 Vault CLI 来解析 SecretRefs。

在运行 `openclaw vault` 命令之前，先启用内置插件：

```bash
openclaw plugins enable vault
```

## 在 Vault 中存储提供方密钥

OpenClaw 默认使用挂载在 `secret` 上的 KV v2，这与 Vault 开发服务器示例相匹配。对于生产环境的 Vault，在创建 SecretRef id 之前，请将 `OPENCLAW_VAULT_KV_MOUNT` 设置为你的实际 KV 挂载路径。使用 OpenClaw 默认配置时，这个 SecretRef id：

```text
providers/openrouter/apiKey
```

会读取这个 Vault 字段：

```text
secret/data/providers/openrouter -> apiKey
```

使用 Vault CLI 创建它的一种方式是：

```bash
export OPENROUTER_API_KEY=<openrouter-api-key>
vault kv put secret/providers/openrouter apiKey="$OPENROUTER_API_KEY"
```

请为 OpenClaw 使用具有限定范围的客户端令牌，不要使用根令牌。对于默认的 KV v2 结构，模型提供方密钥的最小策略如下：

```hcl
path "secret/data/providers/*" {
  capabilities = ["read"]
}
```

## 使 Vault 对 Gateway 可见

对于未容器化的本地 Gateway，请在启动 OpenClaw 的同一个 shell 中导出 Vault 设置。默认认证方式会从 `VAULT_TOKEN` 读取 Vault 客户端令牌：

```bash
export VAULT_ADDR=https://vault.example.com
export VAULT_TOKEN=<vault-client-token>
```

如果 Vault Agent 写入了一个 token sink 文件，请使用 token-file 认证：

```bash
export VAULT_ADDR=https://vault.example.com
export OPENCLAW_VAULT_AUTH_METHOD=token_file
export VAULT_TOKEN_FILE=/vault/secrets/token
```

对于由私有 CA 签名的 Vault 服务器，可以将该 CA 安装到主机信任存储中，并启用 Node 系统信任：

```bash
export NODE_USE_SYSTEM_CA=1
```

或者直接提供一个 PEM 捆绑包：

```bash
export NODE_EXTRA_CA_CERTS=/path/to/vault-ca.pem
```

这些变量必须在 OpenClaw 启动时就已存在。Vault 插件会将它们转发给其 resolver 进程。

对于非交互式 JWT 认证，请使用 workload JWT 文件以及类型为 `jwt` 的 Vault 角色：

```bash
export VAULT_ADDR=https://vault.example.com
export OPENCLAW_VAULT_AUTH_METHOD=jwt
export OPENCLAW_VAULT_AUTH_MOUNT=jwt
export OPENCLAW_VAULT_AUTH_ROLE=openclaw
export OPENCLAW_VAULT_JWT_FILE=/var/run/secrets/tokens/vault
```

JWT 文件应为投影的 workload token，例如具有 Vault 角色可接受 audience 的 Kubernetes service account token。
交互式 OIDC 浏览器登录适合人工使用，但 Gateway 运行时需要非交互式 JWT 登录或 token 文件。

对于 Vault 的 Kubernetes 认证方式，请使用 `kubernetes`。这适用于作为 Pod 运行的 Gateway；默认挂载点为 `kubernetes`，默认 JWT 文件为标准 service account token 路径：

```bash
export VAULT_ADDR=https://vault.example.com
export OPENCLAW_VAULT_AUTH_METHOD=kubernetes
export OPENCLAW_VAULT_AUTH_ROLE=openclaw
```

只有当 Vault 将 Kubernetes 认证挂载在 `auth/kubernetes` 之外的位置时，才设置 `OPENCLAW_VAULT_AUTH_MOUNT`。只有当 service account token 投影到自定义路径时，才设置 `OPENCLAW_VAULT_JWT_FILE`。

可选设置：

```bash
export VAULT_NAMESPACE=<namespace-name>
export OPENCLAW_VAULT_KV_MOUNT=secret
export OPENCLAW_VAULT_KV_VERSION=2
```

检查当前 shell 能看到什么：

```bash
openclaw vault status
```

当配置了多个基于 Vault 的 secret provider 时，可通过别名选择其中一个：

```bash
openclaw vault status --provider-alias corp-vault
```

`openclaw vault status` 从不打印 `VAULT_TOKEN`；它只报告 token、token 文件和 JWT 文件是否已设置。

<Warning>
如果 Gateway 作为服务、LaunchAgent、systemd 单元、计划任务或容器运行，则该运行环境必须接收到相同的 Vault 变量。在交互式 shell 中设置变量只能证明该 shell 可见这些变量，而不能证明已经运行的 Gateway 也能看到。
</Warning>

## 生成并应用 SecretRef 方案

创建一个将 OpenRouter 的模型提供方 API 密钥映射到 Vault 的方案：

```bash
openclaw vault setup \
  --plan-out ./vault-secrets-plan.json \
  --openrouter-id providers/openrouter/apiKey
```

应用并验证该方案：

```bash
openclaw secrets apply --from ./vault-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from ./vault-secrets-plan.json --allow-exec
openclaw secrets audit --check --allow-exec
openclaw secrets reload
```

使用 `--allow-exec`，因为 Vault 插件是通过由 OpenClaw 管理的
exec SecretRef provider 进行解析的。

如果 Gateway 还没有运行，请在应用方案后正常启动它，
而不是运行 `openclaw secrets reload`。

## 配置更多提供方密钥

内置快捷方式：

```bash
openclaw vault setup --openai-id providers/openai/apiKey
openclaw vault setup --anthropic-id providers/anthropic/apiKey
openclaw vault setup --openrouter-id providers/openrouter/apiKey
```

在一个计划中配置多个提供方密钥：

```bash
openclaw vault setup \
  --plan-out ./vault-secrets-plan.json \
  --openai-id providers/openai/apiKey \
  --anthropic-id providers/anthropic/apiKey \
  --openrouter-id providers/openrouter/apiKey
```

没有快捷方式的打包提供方，或已经配置好的兼容 OpenAI 的提供方以及自定义模型提供方，请使用 `--provider-key`：

```bash
openclaw vault setup \
  --plan-out ./vault-secrets-plan.json \
  --provider-key local-openai=providers/local-openai/apiKey \
  --provider-key groq=providers/groq/apiKey
```

每个 `--provider-key <provider=id>` 会将一个 SecretRef 写入
`models.providers.<provider>.apiKey`。对于自定义提供方，它不会创建
该提供方的 `baseUrl`、`api` 或 `models` 设置；请先配置这些项。

对任何已知的 SecretRef 目标路径，使用 `--target <path=id>`：

```bash
openclaw vault setup \
  --target channels.telegram.botToken=channels/telegram/botToken \
  --target models.providers.openai.headers.x-api-key=providers/openai/proxyKey \
  --target auth-profiles:main:profiles.openai.key=providers/openai/apiKey
```

裸目标路径会应用到 `openclaw.json`。对现有的 `auth-profiles.json` 目标，请使用
`auth-profiles:<agentId>:<path>`。
目标路径必须是已注册的 OpenClaw SecretRef 目标。setup
命令不会在 OpenClaw 中创建任意命名的密钥；Vault 仍然是
密钥存储，而 OpenClaw 只在受支持的配置字段上存储 SecretRef。

## SecretRef id 格式

Vault SecretRef id 使用以下约定：

```text
<vault-secret-path>/<field>
```

示例：

| SecretRef id                  | 默认 KV v2 Vault 读取           | 返回字段       |
| ----------------------------- | ---------------------------------- | -------------- |
| `providers/openrouter/apiKey` | `secret/data/providers/openrouter` | `apiKey`       |
| `providers/openai/apiKey`     | `secret/data/providers/openai`     | `apiKey`       |
| `teams/agent-prod/openrouter` | `secret/data/teams/agent-prod`     | `openrouter`   |

返回的 Vault 字段必须是字符串。

对于 KV v1，设置：

```bash
export OPENCLAW_VAULT_KV_VERSION=1
```

然后 `providers/openrouter/apiKey` 读取：

```text
secret/providers/openrouter -> apiKey
```

## OpenClaw 存储的内容

应用 Vault 设置方案会存储一个由插件管理的 provider：

```json
{
  "source": "exec",
  "pluginIntegration": {
    "pluginId": "vault",
    "integrationId": "vault"
  }
}
```

凭据字段会指向该 provider：

```json
{ "source": "exec", "provider": "vault", "id": "providers/openrouter/apiKey" }
```

解析后的值只存在于当前活动运行时的 secrets 快照中。

## 容器和托管部署

容器化的 Gateway 仍然使用相同的插件和 SecretRef 配置。容器必须接收：

- `VAULT_ADDR`
- 以下某一种认证来源：
  - `VAULT_TOKEN`
  - `OPENCLAW_VAULT_AUTH_METHOD=token_file` 以及 `VAULT_TOKEN_FILE`
  - `OPENCLAW_VAULT_AUTH_METHOD=jwt` 以及 `OPENCLAW_VAULT_AUTH_MOUNT`、
    `OPENCLAW_VAULT_AUTH_ROLE` 和 `OPENCLAW_VAULT_JWT_FILE`
  - `OPENCLAW_VAULT_AUTH_METHOD=kubernetes` 以及 `OPENCLAW_VAULT_AUTH_ROLE`；也可以选择
    覆盖 `OPENCLAW_VAULT_AUTH_MOUNT` 或 `OPENCLAW_VAULT_JWT_FILE`
- 可选的 `VAULT_NAMESPACE`、`OPENCLAW_VAULT_KV_MOUNT` 和
  `OPENCLAW_VAULT_KV_VERSION`

在使用 Kubernetes 时，如果 Vault 已为该集群配置了 Kubernetes 认证，请优先使用
`OPENCLAW_VAULT_AUTH_METHOD=kubernetes`。仅当 Vault 被配置为将该集群视为通用的 JWT/OIDC 颁发者时，才使用
`OPENCLAW_VAULT_AUTH_METHOD=jwt`。这两种方式都比在 Kubernetes Secret 中使用长期有效的 Vault
token 更好。Vault Agent sidecar 或 injector 部署则可以改用 `token_file`。

对于多租户 Vault 部署，请将租户路由保留在 Vault 策略和部署配置中。OpenClaw 不要求固定的 mount、role 或 path：每个
Gateway 环境都可以设置自己的 `OPENCLAW_VAULT_KV_MOUNT`、
`OPENCLAW_VAULT_AUTH_ROLE` 和 SecretRef ids。如果某个共享 Gateway 必须同时解析
不同的 Vault 用户，请使用手动配置的 exec provider 来封装不同的认证环境，或者将租户按 Gateway
环境拆分，并使用独立的 Vault 环境。

## 相关内容

- [密钥管理](/gateway/secrets)
- [`openclaw secrets`](/cli/secrets)
- [插件清单](/plugins/plugin-inventory)
