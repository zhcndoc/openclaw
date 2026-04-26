---
summary: "秘密管理：SecretRef 约定、运行时快照行为及安全的单向擦除"
read_when:
  - 配置用于提供者凭证和 `auth-profiles.json` 引用的 SecretRef
  - 在生产环境中安全地执行 secrets 重载、审计、配置和应用
  - 理解启动快速失败、非活动表面过滤和最后已知良好行为
title: "密钥管理"
---

OpenClaw 支持可叠加的 SecretRef，因此受支持的凭证不需要以明文形式存储在配置中。

明文依然有效。SecretRef 会按凭证选择性启用。

## 目标与运行时模型

秘密会解析为内存中的运行时快照。

- 解析在激活期间是急切的，而不是在请求路径上懒加载。
- 当有效且活跃的 SecretRef 无法解析时，启动会快速失败。
- 重载使用原子交换：要么完全成功，要么保留最后已知良好的快照。
- SecretRef 策略违规（例如将 OAuth 模式认证配置文件与 SecretRef 输入结合）会在运行时交换前导致激活失败。
- 运行时请求只读取活跃的内存快照。
- 首次成功配置激活/加载后，运行时代码路径会持续读取该活跃内存快照，直到成功重载将其交换。
- 出站交付路径也会从该活跃快照读取（例如 Discord 回复/线程交付和 Telegram 动作发送）；它们不会在每次发送时重新解析 SecretRef。

这避免了密钥提供者宕机影响热请求路径。

## 活跃表面过滤

SecretRef 仅在有效活跃表面上验证。

- 启用的表面：未解析的引用会阻止启动/重载。
- 非活动表面：未解析的引用不会阻止启动/重载。
- 非活动引用会发出非致命诊断，代码为 `SECRETS_REF_IGNORED_INACTIVE_SURFACE`。

非活动表面举例：

- 已禁用的频道/账户条目。
- 没有已启用账户继承的顶级频道凭证。
- 已禁用的工具/功能表面。
- 未被 `tools.web.search.provider` 选中的 Web 搜索提供者特定密钥。
  在自动模式（提供者未设置）下，密钥会按优先级用于提供者自动检测，直到其中一个解析成功。
  选择后，未选中的提供者密钥会被视为非活跃状态，直到再次被选中。
- 沙箱 SSH 认证材料（`agents.defaults.sandbox.ssh.identityData`、
  `certificateData`、`knownHostsData`，以及每个代理的覆盖）仅在默认代理或已启用代理的有效沙箱后端为 `ssh` 时活跃。
- 如果以下任一条件为真，`gateway.remote.token` / `gateway.remote.password` SecretRef 处于活跃状态：
  - `gateway.mode=remote`
  - 配置了 `gateway.remote.url`
  - `gateway.tailscale.mode` 为 `serve` 或 `funnel`
  - 在不具备这些远程表面的本地模式下：
    - 当令牌认证可以胜出且未配置 env/auth 令牌时，`gateway.remote.token` 处于活跃状态。
    - 仅当密码认证可以胜出且未配置 env/auth 密码时，`gateway.remote.password` 处于活跃状态。
- 当设置了 `OPENCLAW_GATEWAY_TOKEN` 时，`gateway.auth.token` SecretRef 在启动认证解析期间处于非活跃状态，因为 env 令牌输入在该运行时中胜出。

## 网关认证表面诊断

当在 `gateway.auth.token`、`gateway.auth.password`、`gateway.remote.token` 或 `gateway.remote.password` 上配置 SecretRef 时，网关启动/重载日志会明确记录表面状态：

- `active`：SecretRef 属于有效认证表面，必须成功解析。
- `inactive`：该 SecretRef 在此运行时中被忽略，因为另一认证表面优先，或远程认证被禁用/未激活。

这些日志项以 `SECRETS_GATEWAY_AUTH_SURFACE` 标识，并包含活动表面策略使用的原因，方便查看凭证为何被视为激活或非激活。

## 上线参考预检

以交互模式运行上线流程并选择 SecretRef 存储时，OpenClaw 会在保存前执行预检验证：

- Env 引用：验证环境变量名，并确认在设置期间可见非空值。
- 提供者引用（`file` 或 `exec`）：验证提供者选择，解析 `id`，并检查解析值的类型。
- 快速启动复用路径：当 `gateway.auth.token` 已经是 SecretRef 时，上线流程会在探针/仪表板引导之前解析它（对于 `env`、`file` 和 `exec` 引用），使用相同的快速失败网关。

若验证失败，上线流程会显示错误并允许重试。

## SecretRef 约定

全局统一使用对象形式：

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

### `source: "env"`

```json5
{ source: "env", provider: "default", id: "OPENAI_API_KEY" }
```

校验规则：

- `provider` 必须匹配正则表达式 `^[a-z][a-z0-9_-]{0,63}$`
- `id` 必须匹配正则表达式 `^[A-Z][A-Z0-9_]{0,127}$`

### `source: "file"`

```json5
{ source: "file", provider: "filemain", id: "/providers/openai/apiKey" }
```

校验规则：

- `provider` 必须匹配正则 `^[a-z][a-z0-9_-]{0,63}$`
- `id` 必须为绝对 JSON 指针（以 `/` 开头）
- JSON 指针段采用 RFC6901 转义：`~` 转为 `~0`，`/` 转为 `~1`

### `source: "exec"`

```json5
{ source: "exec", provider: "vault", id: "providers/openai/apiKey" }
```

校验规则：

- `provider` 必须匹配 `^[a-z][a-z0-9_-]{0,63}$`
- `id` 必须匹配 `^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
- `id` 不能含有作为路径分段的 `.` 或 `..`（例如 `a/../b` 会被拒绝）

## 提供者配置

在 `secrets.providers` 下定义提供者：

```json5
{
  secrets: {
    providers: {
      default: { source: "env" },
      filemain: {
        source: "file",
        path: "~/.openclaw/secrets.json",
        mode: "json", // 或 "singleValue"
      },
      vault: {
        source: "exec",
        command: "/usr/local/bin/openclaw-vault-resolver",
        args: ["--profile", "prod"],
        passEnv: ["PATH", "VAULT_ADDR"],
        jsonOnly: true,
      },
    },
    defaults: {
      env: "default",
      file: "filemain",
      exec: "vault",
    },
    resolution: {
      maxProviderConcurrency: 4,
      maxRefsPerProvider: 512,
      maxBatchBytes: 262144,
    },
  },
}
```

### 环境变量提供者

- 支持通过 `allowlist` 设定可选允许列表。
- 缺失或空环境变量值会导致解析失败。

### 文件提供者

- 从 `path` 路径读取本地文件。
- `mode: "json"`：期望文件为 JSON 对象，使用 `id` 作为 JSON 指针解析。
- `mode: "singleValue"`：`id` 必须为 `"value"`，返回整个文件内容。
- 路径须通过所有权和权限检查。
- Windows 上关闭失败提醒：若路径的 ACL 验证不可用，解析失败。对于受信任路径，可在提供者上设置 `allowInsecurePath: true` 来绕过路径安全检查。

### 执行提供者

- 运行已配置的绝对二进制路径，不使用 shell。
- 默认 `command` 必须指向常规文件（非符号链接）。
- 可设置 `allowSymlinkCommand: true` 允许符号链接命令路径（例如 Homebrew 的 shim）。OpenClaw 会验证解析后的目标路径。
- 支持与 `allowSymlinkCommand` 结合使用 `trustedDirs`，用于包管理器路径（如 `["/opt/homebrew"]`）。
- 支持超时、无输出超时、输出字节限制、环境变量可选列表和受信任目录。
- Windows 上关闭失败提醒：若命令路径 ACL 验证不可用，解析失败。受信任路径可通过 `allowInsecurePath: true` 绕过路径安全检查。

请求负载（标准输入）：

```json
{
  "protocolVersion": 1,
  "provider": "vault",
  "ids": ["providers/openai/apiKey"]
}
```

响应负载（标准输出）：

```jsonc
{
  "protocolVersion": 1,
  "values": { "providers/openai/apiKey": "<openai-api-key>" },
} // pragma: allowlist secret
```

可选的每个 ID 错误：

```json
{
  "protocolVersion": 1,
  "values": {},
  "errors": { "providers/openai/apiKey": { "message": "not found" } }
}
```

## 执行集成示例

### 1Password CLI

```json5
{
  secrets: {
    providers: {
      onepassword_openai: {
        source: "exec",
        command: "/opt/homebrew/bin/op",
        allowSymlinkCommand: true, // Homebrew 符号链接二进制需开启
        trustedDirs: ["/opt/homebrew"],
        args: ["read", "op://Personal/OpenClaw QA API Key/password"],
        passEnv: ["HOME"],
        jsonOnly: false,
      },
    },
  },
  models: {
    providers: {
      openai: {
        baseUrl: "https://api.openai.com/v1",
        models: [{ id: "gpt-5", name: "gpt-5" }],
        apiKey: { source: "exec", provider: "onepassword_openai", id: "value" },
      },
    },
  },
}
```

### HashiCorp Vault CLI

```json5
{
  secrets: {
    providers: {
      vault_openai: {
        source: "exec",
        command: "/opt/homebrew/bin/vault",
        allowSymlinkCommand: true, // Homebrew 符号链接二进制需开启
        trustedDirs: ["/opt/homebrew"],
        args: ["kv", "get", "-field=OPENAI_API_KEY", "secret/openclaw"],
        passEnv: ["VAULT_ADDR", "VAULT_TOKEN"],
        jsonOnly: false,
      },
    },
  },
  models: {
    providers: {
      openai: {
        baseUrl: "https://api.openai.com/v1",
        models: [{ id: "gpt-5", name: "gpt-5" }],
        apiKey: { source: "exec", provider: "vault_openai", id: "value" },
      },
    },
  },
}
```

### `sops`

```json5
{
  secrets: {
    providers: {
      sops_openai: {
        source: "exec",
        command: "/opt/homebrew/bin/sops",
        allowSymlinkCommand: true, // Homebrew 符号链接二进制需开启
        trustedDirs: ["/opt/homebrew"],
        args: [
          "-d",
          "--extract",
          '["providers"]["openai"]["apiKey"]',
          "/path/to/secrets.enc.json",
        ],
        passEnv: ["SOPS_AGE_KEY_FILE"],
        jsonOnly: false,
      },
    },
  },
  models: {
    providers: {
      openai: {
        baseUrl: "https://api.openai.com/v1",
        models: [{ id: "gpt-5", name: "gpt-5" }],
        apiKey: { source: "exec", provider: "sops_openai", id: "value" },
      },
    },
  },
}
```

## MCP 服务器环境变量

通过 `plugins.entries.acpx.config.mcpServers` 配置的 MCP 服务器环境变量支持 SecretInput。这使得 API 密钥和令牌不会以明文形式存储在配置中：

```json5
{
  plugins: {
    entries: {
      acpx: {
        enabled: true,
        config: {
          mcpServers: {
            github: {
              command: "npx",
              args: ["-y", "@modelcontextprotocol/server-github"],
              env: {
                GITHUB_PERSONAL_ACCESS_TOKEN: {
                  source: "env",
                  provider: "default",
                  id: "MCP_GITHUB_PAT",
                },
              },
            },
          },
        },
      },
    },
  },
}
```

明文字符串值依然有效。像 `${MCP_SERVER_API_KEY}` 这样的 Env 模板引用和 SecretRef 对象会在网关激活期间、MCP 服务器进程生成之前解析。与其他 SecretRef 表面一样，未解析的引用仅在 `acpx` 插件有效且活跃时才会阻止激活。

## 沙箱 SSH 认证材料

核心 `ssh` 沙箱后端也支持用于 SSH 认证材料的 SecretRef：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "ssh",
        ssh: {
          target: "user@gateway-host:22",
          identityData: { source: "env", provider: "default", id: "SSH_IDENTITY" },
          certificateData: { source: "env", provider: "default", id: "SSH_CERTIFICATE" },
          knownHostsData: { source: "env", provider: "default", id: "SSH_KNOWN_HOSTS" },
        },
      },
    },
  },
}
```

运行时行为：

- OpenClaw 会在沙箱激活期间解析这些引用，而不是在每次 SSH 调用时懒加载。
- 解析值会被写入权限受限的临时文件，并用于生成的 SSH 配置。
- 如果有效的沙箱后端不是 `ssh`，这些引用保持非活动状态且不阻止启动。

## 支持的凭证表面

规范支持及不支持的凭证列举详见：

- [SecretRef 凭证表面](/reference/secretref-credential-surface)

运行时生成或轮换的凭证及 OAuth 刷新材料有意排除在只读 SecretRef 解析之外。

## 必需行为和优先级

- 无引用的字段：不变。
- 有引用的字段：在激活期间于活跃表面上为必需。
- 如果明文和引用同时存在，引用在支持的优先路径上优先。
- 擦除哨兵 `__OPENCLAW_REDACTED__` 保留用于内部配置擦除/恢复，并作为字面提交的配置数据被拒绝。

警告和审计信号：

- `SECRETS_REF_OVERRIDES_PLAINTEXT`（运行时警告）
- `REF_SHADOWED`（审计发现，`auth-profiles.json` 凭证优先于 `openclaw.json` 引用）

Google Chat 兼容行为：

- `serviceAccountRef` 优先于明文 `serviceAccount`。
- 设置引用时忽略明文值。

## 激活触发

Secret 激活发生于：

- 启动（预检加最终激活）
- 配置重载热应用路径
- 配置重载重启检查路径
- 通过 `secrets.reload` 手动重载
- 网关配置写入 RPC 预检（`config.set` / `config.apply` / `config.patch`），用于在持久化编辑前检查提交配置负载中活跃表面 SecretRef 的可解析性

激活契约：

- 成功则原子交换快照。
- 启动失败则中止网关启动。
- 运行时重载失败则保留最后已知良好的快照。
- 写入 RPC 预检失败则拒绝提交的配置，并保持磁盘配置和活跃运行时快照不变。
- 向出站助手/工具调用提供明确的每次调用通道令牌不会触发 SecretRef 激活；激活点保持为启动、重载和显式 `secrets.reload`。

## 降级与恢复信号

当重载激活在健康状态后失败，OpenClaw 进入密钥降级状态。

一次性系统事件及日志代码：

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

行为：

- 降级：运行时保留最后已知良好快照。
- 恢复：下次成功激活后发一次事件。
- 降级状态下重复失败日志警告，但不泛滥事件。
- 启动快速失败不发降级事件，因为运行时未首次激活。

## 命令路径解析

命令路径可通过网关快照 RPC 支持 SecretRef 解析。

主要两种行为：

- 严格命令路径（例如 `openclaw memory` 远程内存路径，以及在需要远程共享密钥引用时的 `openclaw qr --remote`）会从活跃快照读取，并在所需 SecretRef 不可用时快速失败。
- 只读命令路径（例如 `openclaw status`、`openclaw status --all`、`openclaw channels status`、`openclaw channels resolve`、`openclaw security audit`，以及只读的 doctor/config repair 流程）也会优先使用活跃快照，但在该命令路径中目标 SecretRef 不可用时会降级而不是中止。

只读行为：

- 网关运行时优先读取活跃快照。
- 若网关解析不完整或不可用，则尝试针对该命令的本地回退表面。
- 若目标 SecretRef 仍不可用，命令会继续输出降级只读信息，并给出明确诊断（如“已配置但此命令路径不可用”）。
- 这种降级仅限于该命令，且不影响启动、重载、发送或认证路径。

其他说明：

- 后端密钥轮换后快照刷新由 `openclaw secrets reload` 处理。
- 这类命令路径使用的网关 RPC 方法为：`secrets.resolve`。

## 审计与配置工作流

默认运维流程：

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

### `secrets audit`

检测包括：

- 以明文存储的值（`openclaw.json`、`auth-profiles.json`、`.env` 及生成的 `agents/*/agent/models.json`）
- 生成的 `models.json` 中遗留的明文敏感提供者头部信息
- 未解析的引用
- 优先级遮蔽（`auth-profiles.json` 优先于 `openclaw.json` 引用）
- 旧遗留（`auth.json`，OAuth 提醒）

执行说明：

- 默认情况下，审计跳过 exec SecretRef 可解析性检查以避免命令副作用。
- 使用 `openclaw secrets audit --allow-exec` 在审计期间执行 exec 提供者。

头部残留说明：

- 敏感提供者头部检测基于名称启发式，涵盖常见的认证/凭证头，如 `authorization`、`x-api-key`、`token`、`secret`、`password`、`credential`。

### `secrets configure`

交互式助手，具备：

- 配置 `secrets.providers`（`env`/`file`/`exec`，支持添加/编辑/删除）
- 选择 `openclaw.json` 和 `auth-profiles.json` 中支持携带秘密的字段，针对单个代理范围
- 可直接创建新的 `auth-profiles.json` 映射
- 捕获 SecretRef 详情（`source`、`provider`、`id`）
- 运行预检解析
- 可即时应用

执行说明：

- 除非设置了 `--allow-exec`，否则预检跳过 exec SecretRef 检查。
- 如果您直接通过 `configure --apply` 应用，且计划包含 exec refs/providers，请在应用步骤也保持设置 `--allow-exec`。

常用模式：

- `openclaw secrets configure --providers-only`
- `openclaw secrets configure --skip-provider-setup`
- `openclaw secrets configure --agent <id>`

`configure` 默认应用行为：

- 擦除匹配目标提供者的静态凭证，来自 `auth-profiles.json`
- 擦除发现的旧静态 `api_key` 条目，来自 `auth.json`
- 擦除匹配的已知密钥行，来自 `<config-dir>/.env`

### `secrets apply`

应用已保存计划：

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
```

执行说明：

- 除非设置了 `--allow-exec`，否则 dry-run 跳过执行检查。
- 除非设置了 `--allow-exec`，否则写入模式会拒绝包含 exec SecretRefs/providers 的计划。

有关严格目标/路径约定详情和确切拒绝规则，请参阅：

- [Secrets 应用计划约定](/gateway/secrets-plan-contract)

## 单向安全策略

OpenClaw 有意不写入包含历史明文秘密值的回滚备份。

安全模型：

- 写入前必须通过预检
- 提交前进行运行时激活验证
- 应用时采用原子文件替换及失败时最大努力恢复

## 旧版认证兼容说明

针对静态凭证，运行时不再依赖明文旧版认证存储。

- 运行时凭证来源为解析后的内存快照。
- 发现旧静态 `api_key` 条目会被擦除。
- OAuth 相关兼容行为仍独立存在。

## Web UI 说明

某些 SecretInput 联合类型在原始编辑模式下配置比表单模式更方便。

## 相关文档

- CLI 命令：[secrets](/cli/secrets)
- 计划约定详情：[Secrets 应用计划约定](/gateway/secrets-plan-contract)
- 凭证表面：[SecretRef 凭证表面](/reference/secretref-credential-surface)
- 认证设置：[认证](/gateway/authentication)
- 安全态势：[安全](/gateway/security)
- 环境优先级：[环境变量](/help/environment)
