---
summary: "秘密管理：SecretRef 约定、运行时快照行为及安全的单向擦除"
read_when:
  - 配置提供者凭证和 `auth-profiles.json` 引用的 SecretRef
  - 在生产环境中安全操作秘密的重载、审计、配置和应用
  - 理解启动快速失败、非活动表面过滤和最后已知良好状态行为
title: "秘密管理"
---

# 秘密管理

OpenClaw 支持可叠加的 SecretRefs，使支持的凭证无需以明文形式存储在配置中。

明文仍然可用。SecretRefs 是针对每个凭证的可选功能。

## 目标和运行时模型

秘密解析为内存中的运行时快照。

- 解析在激活期间进行，是主动的，而非请求路径上的懒加载。
- 当无法解析一个有效激活的 SecretRef 时，启动会快速失败。
- 重载使用原子交换：要么完全成功，要么保留最后已知良好的快照。
- 运行时请求仅从活动的内存快照读取。

这可以将秘密提供者的故障隔离出请求的热路径。

## 活动表面过滤

仅对有效激活的表面验证 SecretRefs。

- 启用表面：未解析的引用会阻止启动/重载。
- 非活动表面：未解析的引用不会阻止启动/重载。
- 非活动引用会发出代码为 `SECRETS_REF_IGNORED_INACTIVE_SURFACE` 的非致命诊断。

非活动表面示例：

- 被禁用的频道/账户条目。
- 顶层频道凭证，且没有任何启用的账户继承它们。
- 被禁用的工具/功能表面。
- 没有被 `tools.web.search.provider` 选中使用的网页搜索提供者特定秘钥。
  在自动模式（提供者未设置）下，提供者特定秘钥也对提供者自动检测是活动的。
- 如果满足以下任一条件且 `gateway.remote.enabled` 不为 `false`，则 `gateway.remote.token` / `gateway.remote.password` SecretRefs 是激活的：
  - `gateway.mode=remote`
  - 配置了 `gateway.remote.url`
  - `gateway.tailscale.mode` 为 `serve` 或 `funnel`
    
  在没有这些远程表面的本地模式下：
  - 当令牌认证有效且未配置环境/认证令牌时，`gateway.remote.token` 是激活的。
  - 当密码认证有效且未配置环境/认证密码时，`gateway.remote.password` 才是激活的。
- 当设置了 `OPENCLAW_GATEWAY_TOKEN`（或 `CLAWDBOT_GATEWAY_TOKEN`）时，`gateway.auth.token` SecretRef 对启动时认证解析而言是非激活的，因为环境变量令牌在该运行时优先。

## 网关认证表面诊断

当在 `gateway.auth.token`、`gateway.auth.password`、`gateway.remote.token` 或 `gateway.remote.password` 上配置 SecretRef 时，网关启动/重载日志会显式记录表面状态：

- `active`：SecretRef 属于有效认证表面，必须解析成功。
- `inactive`：该 SecretRef 在此运行时被忽略，因为另一个认证表面优先，或远程认证被禁用/未激活。

这些条目以 `SECRETS_GATEWAY_AUTH_SURFACE` 标识日志记录，并包含活动表面策略使用的原因，方便查看凭证为何被视为激活或非激活。

## 上线参考预检

当以交互模式运行上线流程并选择 SecretRef 存储时，OpenClaw 会在保存前执行预检验证：

- 环境变量引用：验证环境变量名，并确认上线期间可见非空值。
- 提供者引用（`file` 或 `exec`）：验证提供者选择，解析 `id`，并检查解析后的值类型。
- 快速重用路径：当 `gateway.auth.token` 已是 SecretRef，界面会在探测/仪表盘启动前解析它（针对 `env`、`file` 和 `exec` 引用），使用同样的快速失败机制。

如果验证失败，上线流程会显示错误并允许重试。

## SecretRef 约定

全局统一使用一个对象形态：

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

### `source: "env"`

```json5
{ source: "env", provider: "default", id: "OPENAI_API_KEY" }
```

校验规则：

- `provider` 必须匹配正则 `^[a-z][a-z0-9_-]{0,63}$`
- `id` 必须匹配正则 `^[A-Z][A-Z0-9_]{0,127}$`

### `source: "file"`

```json5
{ source: "file", provider: "filemain", id: "/providers/openai/apiKey" }
```

校验规则：

- `provider` 必须匹配正则 `^[a-z][a-z0-9_-]{0,63}$`
- `id` 必须为绝对 JSON 指针（以 `/` 开头）
- JSON 指针段中使用 RFC6901 转义：字符 `~` 转为 `~0`，字符 `/` 转为 `~1`

### `source: "exec"`

```json5
{ source: "exec", provider: "vault", id: "providers/openai/apiKey" }
```

校验规则：

- `provider` 必须匹配正则 `^[a-z][a-z0-9_-]{0,63}$`
- `id` 必须匹配正则 `^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`

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
- 缺失或空的环境变量值会导致解析失败。

### 文件提供者

- 从 `path` 路径读取本地文件。
- `mode: "json"`：期望文件为 JSON 对象，引用 `id` 作为 JSON 指针解析。
- `mode: "singleValue"`：引用 `id` 必须为 `"value"`，返回整个文件内容。
- 路径必须通过所有权和权限检查。
- Windows 的关闭失败备注：如果路径的 ACL 验证不可用，解析失败。仅对受信任路径，可在提供者上设置 `allowInsecurePath: true`，以绕过路径安全检查。

### 执行提供者

- 运行已配置的绝对二进制路径，不使用 shell。
- 默认情况下，`command` 必须指向常规文件（非符号链接）。
- 设置 `allowSymlinkCommand: true` 以允许符号链接命令路径（比如 Homebrew 的 shim）。OpenClaw 会验证解析后的目标路径。
- 可结合 `allowSymlinkCommand` 和 `trustedDirs` 使用，针对包管理器路径（比如 `["/opt/homebrew"]`）。
- 支持超时、无输出超时、输出字节限制、环境变量允许列表和受信任目录。
- Windows 的关闭失败备注：如果命令路径的 ACL 验证不可用，解析失败。仅对受信任路径，可在提供者上设置 `allowInsecurePath: true`，以绕过路径安全检查。

请求负载（标准输入）：

```json
{ "protocolVersion": 1, "provider": "vault", "ids": ["providers/openai/apiKey"] }
```

响应负载（标准输出）：

```jsonc
{ "protocolVersion": 1, "values": { "providers/openai/apiKey": "<openai-api-key>" } } // pragma: allowlist secret
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
        allowSymlinkCommand: true, // Homebrew 符号链接二进制需要
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
        allowSymlinkCommand: true, // Homebrew 符号链接二进制需要
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
        allowSymlinkCommand: true, // Homebrew 符号链接二进制需要
        trustedDirs: ["/opt/homebrew"],
        args: ["-d", "--extract", '["providers"]["openai"]["apiKey"]', "/path/to/secrets.enc.json"],
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

## 支持的凭证表面

规范支持和不支持的凭证列举见：

- [SecretRef 凭证表面](/reference/secretref-credential-surface)

运行时生成或轮换的凭证及 OAuth 刷新材料有意排除在只读 SecretRef 解析之外。

## 必需行为和优先级

- 不带引用的字段：保持不变。
- 带引用的字段：激活表面激活时是必须的。
- 当同时存在明文和引用时，支持优先路径上以引用优先。

警告和审计信号：

- `SECRETS_REF_OVERRIDES_PLAINTEXT`（运行时警告）
- `REF_SHADOWED`（审计发现，当 `auth-profiles.json` 凭证优先于 `openclaw.json` 引用时）

Google Chat 兼容行为：

- `serviceAccountRef` 优先于明文 `serviceAccount`。
- 当同级引用被设置时，忽略明文值。

## 激活触发

Secret 激活于以下时刻运行：

- 启动时（预检加最终激活）
- 配置重载热应用路径
- 配置重载重启检查路径
- 通过 `secrets.reload` 手动重载

激活约定：

- 成功则原子交换快照。
- 启动失败则中止网关启动。
- 运行时重载失败保持最后已知良好快照。

## 降级与恢复信号

当重载激活失败发生在健康状态后，OpenClaw 进入秘密降级状态。

一次性系统事件和日志代码：

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

行为：

- 降级：运行时保留最后已知良好快照。
- 恢复：在下次成功激活后发出一次。
- 已降级状态下重复失败日志警告，但不会泛滥事件。
- 启动快速失败不会发出降级事件，因为运行时未曾激活。

## 命令路径解析

命令路径可选择使用通过网关快照 RPC 支持的 SecretRef 解析。

主要有两种行为：

- 严格命令路径（如 `openclaw memory` 远程内存路径和 `openclaw qr --remote`）从活动快照读取，且当必需的 SecretRef 不可用时快速失败。
- 只读命令路径（如 `openclaw status`、`openclaw status --all`、`openclaw channels status`、`openclaw channels resolve` 以及只读的 doctor/配置修复流程）也优先使用活动快照，但在命令路径中特定 SecretRef 不可用时降级处理而非中止。

只读行为：

- 当网关正在运行时，这些命令优先从活动快照读取。
- 如果网关解析不完整或网关不可用，则尝试针对该命令表面进行本地回退。
- 如果目标 SecretRef 仍不可用，命令继续并输出降级的只读信息，附带明确的诊断（例如“已配置但在此命令路径中不可用”）。
- 该降级行为仅限于本命令，不影响运行时启动、重载或发送/认证路径。

其他说明：

- 后端密钥轮换后快照刷新由 `openclaw secrets reload` 处理。
- 这类命令路径使用的网关 RPC 方法：`secrets.resolve`。

## 审计与配置工作流

默认运营者流程：

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

### `secrets audit`

发现包括：

- 以明文存储的值（`openclaw.json`、`auth-profiles.json`、`.env` 及生成的 `agents/*/agent/models.json`）
- 在生成的 `models.json` 条目中遗留的以明文敏感提供者头部信息
- 未解析的引用
- 优先级遮蔽（`auth-profiles.json` 优先于 `openclaw.json` 引用）
- 旧遗留（`auth.json`，OAuth 提醒）

头部遗留说明：

- 敏感提供者头部检测基于名称启发式（常见的认证/凭证头部名和片段，如 `authorization`、`x-api-key`、`token`、`secret`、`password` 和 `credential`）。

### `secrets configure`

交互式助手，功能：

- 先配置 `secrets.providers`（`env`/`file`/`exec`，可添加/编辑/删除）
- 让你选择 `openclaw.json` 和 `auth-profiles.json` 中支持的携带秘密的字段，针对单个代理范围
- 可以在目标选择器中直接创建新的 `auth-profiles.json` 映射
- 捕获 SecretRef 详情（`source`、`provider`、`id`）
- 运行预检解析
- 可立即应用

有用模式：

- `openclaw secrets configure --providers-only`
- `openclaw secrets configure --skip-provider-setup`
- `openclaw secrets configure --agent <id>`

`configure` 应用默认行为：

- 擦除针对目标提供者匹配的静态凭证，来自 `auth-profiles.json`
- 擦除发现的旧静态 `api_key` 条目，来自 `auth.json`
- 擦除匹配的已知秘密行，来自 `<config-dir>/.env`

### `secrets apply`

应用已保存计划：

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
```

有关严格目标/路径约定细节及精确拒绝规则，参见：

- [Secrets 应用计划约定](/gateway/secrets-plan-contract)

## 单向安全策略

OpenClaw 有意不写包含历史明文秘密值的回滚备份。

安全模型：

- 写入前必须通过预检
- 提交前进行运行时激活验证
- 应用时使用原子文件替换及失败时的最大努力恢复

## 旧版认证兼容说明

针对静态凭证，运行时不再依赖明文旧版认证存储。

- 运行时凭证来源是解析后的内存快照。
- 发现的旧静态 `api_key` 条目会被擦除。
- OAuth 相关兼容行为仍然独立存在。

## Web UI 说明

某些 SecretInput 联合类型在原始编辑模式下比表单模式更易配置。

## 相关文档

- CLI 命令：[secrets](/cli/secrets)
- 计划约定详情：[Secrets 应用计划约定](/gateway/secrets-plan-contract)
- 凭证表面：[SecretRef 凭证表面](/reference/secretref-credential-surface)
- 认证设置：[认证](/gateway/authentication)
- 安全态势：[安全](/gateway/security)
- 环境优先级：[环境变量](/help/environment)
