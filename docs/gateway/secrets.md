---
summary: "秘密管理：SecretRef 约定、运行时快照行为及安全的单向擦除"
read_when:
  - 配置提供者凭证和 `auth-profiles.json` 引用的 SecretRef
  - 在生产环境中安全操作秘密的重载、审计、配置和应用
  - 理解启动快速失败、非活动表面过滤和最后已知良好状态行为
title: "秘密管理"
---

# 秘密管理

OpenClaw 支持加法式 SecretRefs，因此无需以明文形式存储受支持的凭证在配置中。

明文依然有效。SecretRefs 是按凭证选择性启用的。

## 目标与运行时模型

秘密解析为内存中的运行时快照。

- 解析在激活期间采用提前解析（eager），而非请求路径上的延迟解析（lazy）。
- 当事实上活跃的 SecretRef 无法解析时，启动快速失败。
- 重载使用原子交换：完全成功，或者保持最后已知良好快照。
- 运行时请求仅从活跃内存快照读取。
- 出站传递路径也从该活跃快照读取（例如 Discord 回复/线程传递和 Telegram 动作发送）；它们不会在每次发送时重新解析 SecretRefs。

这避免了密钥提供者宕机影响热请求路径。

## 活跃表面过滤

SecretRefs 仅在有效活跃表面验证。

- 启用表面：未解析的引用会阻止启动/重载。
- 非活动表面：未解析的引用不阻止启动/重载。
- 非活动引用会发出非致命诊断，代码为 `SECRETS_REF_IGNORED_INACTIVE_SURFACE`。

非活动表面举例：

- Disabled channel/account entries.
- Top-level channel credentials that no enabled account inherits.
- Disabled tool/feature surfaces.
- Web search provider-specific keys that are not selected by `tools.web.search.provider`.
  In auto mode (provider unset), keys are consulted by precedence for provider auto-detection until one resolves.
  After selection, non-selected provider keys are treated as inactive until selected.
- Sandbox SSH auth material (`agents.defaults.sandbox.ssh.identityData`,
  `certificateData`, `knownHostsData`, plus per-agent overrides) is active only
  when the effective sandbox backend is `ssh` for the default agent or an enabled agent.
- `gateway.remote.token` / `gateway.remote.password` SecretRefs are active if one of these is true:
  - `gateway.mode=remote`
  - `gateway.remote.url` is configured
  - `gateway.tailscale.mode` is `serve` or `funnel`
  - In local mode without those remote surfaces:
    - `gateway.remote.token` is active when token auth can win and no env/auth token is configured.
    - `gateway.remote.password` is active only when password auth can win and no env/auth password is configured.
- `gateway.auth.token` SecretRef is inactive for startup auth resolution when `OPENCLAW_GATEWAY_TOKEN` is set, because env token input wins for that runtime.

## 网关认证表面诊断

当在 `gateway.auth.token`、`gateway.auth.password`、`gateway.remote.token` 或 `gateway.remote.password` 上配置 SecretRef，网关启动/重载日志会明确记录表面状态：

- `active`：SecretRef 属于有效认证表面，必须成功解析。
- `inactive`：该 SecretRef 在此运行时被忽略，因为另一认证表面优先，或远程认证被禁用/未激活。

这些日志项以 `SECRETS_GATEWAY_AUTH_SURFACE` 标识，并包含活动表面策略使用的原因，方便查看凭证为何被视为激活或非激活。

## 上线参考预检

以交互模式运行上线流程并选择 SecretRef 存储时，OpenClaw 在保存前执行预检验证：

- Env refs: validates env var name and confirms a non-empty value is visible during setup.
- Provider refs (`file` or `exec`): validates provider selection, resolves `id`, and checks resolved value type.
- Quickstart reuse path: when `gateway.auth.token` is already a SecretRef, onboarding resolves it before probe/dashboard bootstrap (for `env`, `file`, and `exec` refs) using the same fail-fast gate.

若验证失败，上线流程显示错误并允许重试。

## SecretRef 约定

全局统一使用对象形态：

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
- `id` 不能含有作为路径分段的 `.` 或 `..` （例如 `a/../b` 会被拒绝）

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
- 缺失或空环境变量值导致解析失败。

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

## Sandbox SSH auth material

The core `ssh` sandbox backend also supports SecretRefs for SSH auth material:

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

- OpenClaw 在沙箱激活期间解析这些引用，而非在每次 SSH 调用时懒加载。
- 解析值被写入权限受限的临时文件，并用于生成的 SSH 配置。
- 如果有效的沙箱后端不是 `ssh`，这些引用保持非激活状态且不阻止启动。

## Supported credential surface

规范支持及不支持的凭证列举详见：

- [SecretRef 凭证表面](/reference/secretref-credential-surface)

运行时生成或轮换的凭证及 OAuth 刷新材料有意排除在只读 SecretRef 解析之外。

## 必需行为和优先级

- 无引用字段：保持不变。
- 有引用字段：激活表面必须启用。
- 同时存在明文和引用时，支持以引用优先。

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

激活契约：

- 成功时原子交换快照。
- 启动失败中止网关启动。
- 运行时重载失败保持最后已知良好快照。
- 给出显式单次通道令牌的出站助手/工具调用不触发 SecretRef 激活；激活点限于启动、重载及显式 `secrets.reload`。

## 降级与恢复信号

当重载激活在健康状态后失败，OpenClaw 进入秘钥降级状态。

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

- Strict command paths (for example `openclaw memory` remote-memory paths and `openclaw qr --remote`) read from the active snapshot and fail fast when a required SecretRef is unavailable.
- Read-only command paths (for example `openclaw status`, `openclaw status --all`, `openclaw channels status`, `openclaw channels resolve`, `openclaw security audit`, and read-only doctor/config repair flows) also prefer the active snapshot, but degrade instead of aborting when a targeted SecretRef is unavailable in that command path.

只读行为：

- 网关运行时优先读活跃快照。
- 若网关解析不完整或不可用，尝试本地回退该命令表面。
- 若目标 SecretRef 仍不可用，命令继续输出降级只读信息，并明确诊断（如“已配置但此命令路径不可用”）。
- 此降级仅限此命令，且不影响启动、重载、发送或认证路径。

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

Exec note:

- By default, audit skips exec SecretRef resolvability checks to avoid command side effects.
- Use `openclaw secrets audit --allow-exec` to execute exec providers during audit.

Header residue note:

- 敏感提供者头部检测基于名称启发式，涵盖常见的认证/凭证头，如 `authorization`、`x-api-key`、`token`、`secret`、`password`、`credential`。

### `secrets configure`

交互式助手，具备：

- 配置 `secrets.providers`（`env`/`file`/`exec`，支持添加/编辑/删除）
- 选择 `openclaw.json` 和 `auth-profiles.json` 中支持携带秘密的字段，针对单个代理范围
- 可直接创建新的 `auth-profiles.json` 映射
- 捕获 SecretRef 详情（`source`、`provider`、`id`）
- 运行预检解析
- 可即时应用

Exec note:

- Preflight skips exec SecretRef checks unless `--allow-exec` is set.
- If you apply directly from `configure --apply` and the plan includes exec refs/providers, keep `--allow-exec` set for the apply step too.

Helpful modes:

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

Exec note:

- dry-run skips exec checks unless `--allow-exec` is set.
- write mode rejects plans containing exec SecretRefs/providers unless `--allow-exec` is set.

For strict target/path contract details and exact rejection rules, see:

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
