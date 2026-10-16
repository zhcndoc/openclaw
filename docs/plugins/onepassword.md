---
summary: "解决 SecretRefs 问题并为代理提供经过策划、审核的 1Password 访问权限"
read_when:
  - "您希望代理请求精选的 1Password 机密"
  - "您希望从 1Password 解析 OpenClaw 配置凭据"
  - "您需要每个秘密的批准策略和审核历史记录"
  - "您正在为 OpenClaw 配置 1Password 服务帐户"
title: "1密码插件"
---

# <a id="1password"></a> 1密码

捆绑的 `onepassword` 插件有两个独立的选择加入界面：

- a 托管执行提供程序，用于在网关启动、重新加载、审核和应用预检期间解析配置的 [SecretRefs](/gateway/secrets)
- a 策略控制代理工具，可读取一组精选的 1Password 字段

两者都使用官方 `op` CLI 和相同的服务帐户令牌文件。单独启用插件不会公开代理工具：该表面还需要配置项注册表。

## <a id="security-model"></a> 安全模型

- 仅服务帐户身份验证。该令牌保留在本地凭证文件中，并且在 `openclaw.json` 中永远不会被接受。
- 仅经过策划的代理注册表。代理可以列出已配置的 slugs，但插件永远不会枚举 1Password 保管库。 SecretRef 读取仅限于显式存储在注册的 OpenClaw 凭证目标上的引用。
- Per-slug `auto`、`approve` 或 `deny` 策略。
- 批准补助到期。缓存的值永远不会绕过当前策略。
- 每个访问尝试都记录在 OpenClaw 的共享 SQLite 状态中。审核行包括提供的原因；保持原因不敏感。代理绝不会将获取的值或服务令牌复制到审核行中。
- A 成功的 `get` 值到达模型并保留在工具结果和持久转录本中，而无需秘密屏蔽。稍后的工具调用和回复也可以包含它。缩小策略范围，保护记录，并在共享之前查看对话文本。
- 该插件每次缓存未命中都会调用 `op` 一次。它不会重试速率限制或其他失败。
- Each `op` 调用在禁用 1Password 桌面应用程序集成（`OP_LOAD_DESKTOP_APP_SETTINGS=false`、`OP_BIOMETRIC_UNLOCK_ENABLED=false`）的最小环境中运行，因此安装在网关主机上的 1Password 应用程序永远不会触发生物识别或 macOS 权限对话框。

仅授予服务帐户对已注册 SecretRefs 和代理工具 slugs 使用的保管库和项目的读取权限。

## <a id="before-you-begin"></a> 开始之前

你需要：

- 在 Gateway 主机上安装 1Password CLI（`op`）
- 一个有权访问所选项目的 1Password 服务账户
- 一个专用的服务账户令牌文件

启用捆绑的插件：

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

当设置了 `OPENCLAW_STATE_DIR` 时，请将 `~/.openclaw` 替换为该目录。 如果令牌文件对组用户或其他用户可读或可写，插件会发出一次警告。

## <a id="configure-secretrefs"></a> 配置SecretRefs

为通用模型提供者密钥创建秘密应用计划：

```bash
openclaw onepassword secretref setup \
  --anthropic-id op://Automation/Anthropic/credential \
  --openrouter-id op://Automation/OpenRouter/credential \
  --plan-out ./openclaw-1password-secrets-plan.json
```

使用 `--provider-key <provider=id>` 作为另一个模型提供者，或使用 `--target <path=id>` 作为任何已注册的 [SecretRef 凭证目标](/reference/secretref-credential-surface)。该命令需要至少一个目标并编写一份计划。检查它，检查本地 `op` 和令牌文件先决条件，然后应用并重新加载：

```bash
openclaw onepassword secretref status
openclaw secrets apply --from ./openclaw-1password-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from ./openclaw-1password-secrets-plan.json --allow-exec
openclaw secrets audit --check --allow-exec
openclaw secrets reload
```

在apply之前，status可以报告provider本身还没有配置； `prerequisites ready: yes` 确认受信任的 `op` 可执行文件和接受的非空令牌文件已准备就绪。申请后，`ready: yes` 确认提供商接线和先决条件。缺少或不安全的先决条件会产生可操作的后续步骤，而不会打印令牌或原始解析器错误。

手动提供程序配置使用现有的插件 ID：

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

参考使用 `op://<vault>/<item>/<field>` 或 `op://<vault>/<item>/<section>/<field>`。保管库、项目、部分和字段名称可能包含空格。 setup 命令以插件本地不透明形式存储不适合 OpenClaw 共享 exec-id 语法的引用，并仅在解析器内对它们进行解码。很长的引用应该使用稳定的 1Password ID；它们更短，并减少了 1Password API 请求的数量。

SecretRef 解析器最多同时运行四个 `op read` 进程，禁用 1Password CLI 缓存，以便重新加载观察旋转值，从不使用桌面应用程序集成，并且不会公开代理工具以进行任意读取。在传递服务帐户令牌之前，两个插件表面都会解析可执行文件并拒绝另一个本地帐户可以替换的路径； Windows ACL 验证也必须成功。检查提供商接线和本地准备情况：

```bash
openclaw onepassword secretref status --json
```

## <a id="configure-registered-secrets"></a> 配置注册机密

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
              "description": "Token for repository automation",
            },
            "model-key": {
              "item": "Model provider key",
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

Slug 使用小写字母、数字和连字符，以字母或数字开头，最多包含 64 个字符。一个注册表最多可以包含 32 个 slugs；描述最多可包含 200 个字符。 `field` 接受一个字段标签或 ID，不得包含逗号，默认为 `credential`。项目级 `vault` 会覆盖默认保管库。 `opBin` 可以设置 `op` 可执行文件的绝对路径；否则插件将从 `PATH` 解析 `op`。项目标题不得以连字符开头。

## <a id="use-the-agent-tool"></a> 使用 agent 工具

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

该工具架构还声明了一个内部 `authorizationNonce` 参数。策略层在评估请求后将其注入，以将授权交给执行工具调用。切勿手动设置：策略挂钩会覆盖任何提供的值，并且未知值会使请求失败。

## <a id="policy-tiers-and-approvals"></a> 政策级别和批准

- `auto`：立即获取并审计请求。
- `deny`：阻止并审计请求。
- `approve`：使用未过期的常设授权，或请人工允许一次、 始终允许，或拒绝。

允许一次只授权当前工具调用。始终允许会为该代理和 slug 写入一个常设授权到 SQLite；其他代理必须获得各自的审批。OpenClaw 仅在调用方具有明确的代理身份时提供始终允许。该授权在 `grantTtlHours` 后过期，默认值为 720 小时。 未解决或超时的审批会拒绝该请求；最长审批等待时间为 600 秒。插件最多保留 1,024 个常设授权；达到该上限时，最旧的授权会被移除，其代理必须批准下一次访问。

每个评估的授权都是单次使用的，并通过共享 SQLite 状态传递给执行工具调用，因此当网关进程中多个插件实例处于活动状态时，切换也会起作用。未使用的授权在 600 秒的批准窗口后过期。

待授权读取和写入在 SQLite 工作线程上运行。工具执行等待批准的挂起写入完成，然后再使用它；失败的写入会导致请求失败，并且不会检索机密。现有的挂起行及其到期时间在更新之间保持兼容。

内存缓存默认为 300 秒，并受配置的 slug 注册表限制。将 `cacheTtlSeconds` 设置为 `0` 以禁用它。在每次缓存查找之前都会评估策略，并审核缓存命中。运行时配置重新加载在每个策略和执行边界生效；禁用插件或删除、拒绝或重定向 slug 会使待处理的授权和缓存的值无效。

## <a id="inspect-status-and-audit-history"></a> 检查状态和审计历史

显示就绪状态和注册数量：

```bash
openclaw onepassword status
```

这会报告令牌文件是否存在、`op` 是否已解析及其路径、 已注册条目数量，以及按策略划分的数量。它绝不会读取或打印令牌或密钥值。

显示最近 50 条审计记录：

```bash
openclaw onepassword audit
openclaw onepassword audit --limit 100
```

行首先是最新的，并显示时间戳、代理、slug、结果、尝试失败时的 `errorCode` 以及被截断的原因。原因按提供方式存储；代理永远不会将获取的值添加到审核日志中。

## <a id="1password-cli-behavior"></a> 1Password CLI 行为

每次缓存未命中都会使用已配置的项目、保险库和精确的字段选择器运行 `op item get`，输出 JSON，设置有界超时，并带上 `--cache=false`。子进程只接收该字段，而不是整个项目。子进程环境中仅包含 `OP_SERVICE_ACCOUNT_TOKEN` 和 `HOME`。

该插件进行了一次尝试。 `RATE_LIMITED` 错误应通过在稍后的代理请求之前等待来处理；该插件不会创建自动重试循环。

## <a id="error-codes"></a> 错误代码

失败的尝试在工具结果和审核行中携带一个关闭的错误代码。

1密码访问错误：

| 代码              | 含义                                                          |
| ----------------- | ---------------------------------------------------------------- |
| `TOKEN_MISSING`   | 令牌文件丢失或为空                                   |
| `OP_NOT_FOUND`    | `op` 二进制文件无法解析                                |
| `ITEM_NOT_FOUND`  | 配置的项目不在保管库中                              |
| `FIELD_NOT_FOUND` | 配置的字段不在该项目上；列出了可用标签 |
| `RATE_LIMITED`    | 1密码服务帐户已达到速率限制                     |
| `AUTH_FAILED`     | 服务帐户身份验证失败                            |
| `TIMEOUT`         | `op` 超过 `opTimeoutMs`                                      |
| `OP_ERROR`        | 任何其他 `op` 故障或无效输出                         |

策略和验证错误：

| 代码                                               | 含义                                                                      |
| -------------------------------------------------- | ---------------------------------------------------------------------------- |
| `INVALID_ACTION`, `INVALID_REASON`, `INVALID_SLUG` | 请求输入验证失败                                              |
| `UNKNOWN_SLUG`                                     | Slug 不在配置的注册表中                                       |
| `TOOL_CALL_ID_MISSING`                             | 呼叫到达时没有工具呼叫 ID                                          |
| `POLICY_NOT_EVALUATED`                             | 此呼叫没有匹配的授权；该请求未获得政策批准 |
| `POLICY_CHANGED`                                   | 配置在批准和执行之间发生了变化                                |
| `GRANT_EXPIRED`                                    | 常设补助金在执行前失效                                       |
| `APPROVAL_CANCELLED`                               | 等待批准期间运行被中止                           |

## <a id="related"></a> 相关内容

- [密钥管理](/gateway/secrets)
- [1Password](/gateway/1password) — 内置 `op://` 秘密源，以及插件、技能和 MCP 选项的比较
- [`openclaw secrets`](/cli/secrets) — 存储、重新加载、审核、配置和应用 CLI 中的 SecretRefs
