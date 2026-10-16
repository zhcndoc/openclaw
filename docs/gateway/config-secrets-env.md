---
summary: "环境变量、秘密提供程序、身份验证存储和 $include 配置分割"
read_when:
  - "设置内联环境变量或替换"
  - "配置秘密提供者或出口代理"
  - "使用 $include 在文件之间拆分配置"
title: "配置——环境、秘密和包含"
---

处理环境、秘密解析、认证存储和配置组成：`env`、`secrets.*`、`auth.*` 和 `$include`。

完整密钥索引和其他顶级配置域，请参见[配置参考](/gateway/configuration-reference)。

## <a id="environment"></a> 环境

### <a id="env-(inline-env-vars)"></a><a id="env-inline-env-vars"></a> `env`（内联环境变量）

```json5
{
  env: {
    vars: {
      OPENROUTER_API_KEY: "sk-or-...",
      GROQ_API_KEY: "gsk-...",
    },
    shellEnv: {
      enabled: true,
      timeoutMs: 15000,
    },
  },
}
```

- 只有当进程环境中缺少该键时，才会应用内联环境变量。
- `.env` 文件：CWD `.env` + `~/.openclaw/.env`（都不会覆盖已有变量）。
- `shellEnv`：从你的登录 shell 配置文件中导入缺失的预期键。
- 完整优先级请参见 [环境](/help/environment)。

### <a id="env-var-substitution"></a> 环境变量替换

使用 `${VAR_NAME}` 在任意配置字符串中引用环境变量：

```json5
{
  gateway: {
    auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" },
  },
}
```

- 仅匹配大写名称：`[A-Z_][A-Z0-9_]*`。
- Missing/empty 变量明显未解决，发出警告，并且无法提供给需要该值的消费者。
- Escape 与 `$${VAR}` 一起生成文字 `${VAR}` 值。
- 可与 `$include` 一起使用。

#### <a id="default-values"></a> 默认值

使用 `${VAR_NAME:-fallback}` 添加后备。当变量未设置或为空时使用它：

```json5
{
  mcp: {
    servers: {
      nautobot: {
        env: { NAUTOBOT_TIMEOUT: "${NAUTOBOT_TIMEOUT:-60}" },
      },
    },
  },
}
```

- 具有回退的 A 引用始终会解析，因此它永远不会发出缺少 var 警告。
- 允许空后备：`${VAR:-}` 解析为空字符串。
- 后备是文字文本。它不能包含 `$` 或 `{`，因此 `${A:-${B}}` 等嵌套引用不是后备表达式；它保持字面意思，只有内部的 `${B}` 替代。
- 仅支持`:-`。其他 shell 运算符（`:=`、`:?`、`:+`、`-`、`#`、`%`、`/`、`^`）保持原样不变。 Bash的`-`被故意省略：OpenClaw将unset和empty视为相同的状态，因此它与`:-`没有什么不同。
- Escaping 仍然获胜：`$${VAR:-x}` 生成文字 `${VAR:-x}` 并且不会从环境中读取任何内容。
- Authored后备在配置写回后仍然存在； OpenClaw 恢复 `${VAR:-fallback}` 而不是内联其解析的值。
- A 后备是配置文本，而不是秘密存储。将凭证放入 `env.vars` 或 [SecretRef](#secretref) 中并引用它们。

---

## <a id="secrets"></a> 密钥

密钥引用是增量式的：明文值仍然可用。

### `secrets.egressProxy`

默认关闭网关拥有的对代理执行子进程使用的共享存储 `secret` 条目的替换：

```json5
{
  secrets: {
    egressProxy: {
      enabled: false,
      allowedHosts: ["api.example.com"],
      bypassHosts: ["pinned-api.example.com"],
    },
  },
}
```

- `enabled`：在网关启动时启动环回代理和临时CA。默认值：`false`。更改它需要重新启动网关。
- `allowedHosts`：代理请求和 CONNECT 隧道的可选精确主机名流量白名单。如果存在，则只能访问列出的主机、绑定到注册密钥的主机和 `bypassHosts`。空数组仅允许绑定或绕过的主机。更改它需要重新启动网关。
- `bypassHosts`：证书固定客户端使用的经过身份验证的盲 CONNECT 隧道的可选精确主机名列表。哨兵不会在被绕过的主机上被替换，并且在不暴露明文的情况下使供应商身份验证失败。

有关子流程环境接线、身份验证、请求拒绝规则和限制，请参阅 [ 秘密出口代理](/gateway/secrets#secret-egress-proxy)。

### `SecretRef`

使用一种对象形状：

```json5
{ source: "env" | "file" | "exec" | "store", provider: "default", id: "..." }
```

校验：

- `provider` 模式：`^[a-z][a-z0-9_-]{0,63}$`
- `source: "env"` id 模式：`^[A-Z][A-Z0-9_]{0,127}$`
- `source: "file"` id：绝对 JSON Pointer（例如 `"/providers/openai/apiKey"`）
- `source: "exec"` id 模式：`^[A-Za-z0-9][A-Za-z0-9._:/#-]{0,255}$`（支持 AWS-style `secret#json_key` 选择器）
- `source: "exec"` 的 id 不能包含 `.` 或 `..` 这样的斜杠分隔路径段（例如 `a/../b` 会被拒绝）

### <a id="supported-credential-surface"></a> 支持的凭据范围

- 凭证矩阵：[SecretRef 凭证 Surface](/reference/secretref-credential-surface)
- `secrets apply` 目标是受支持的 `openclaw.json` 凭据路径。
- Per-agent auth-profile 引用包含在运行时解析和审计覆盖范围中。

### <a id="secret-providers-config"></a> 密钥提供方配置

```json5
{
  secrets: {
    providers: {
      default: { source: "env" }, // optional explicit env provider
      filemain: {
        source: "file",
        path: "~/.openclaw/secrets.json",
        mode: "json",
        timeoutMs: 5000,
      },
      vault: {
        source: "exec",
        command: "/usr/local/bin/openclaw-vault-resolver",
        passEnv: ["PATH", "VAULT_ADDR"],
      },
    },
    defaults: {
      env: "default",
      file: "filemain",
      exec: "vault",
    },
  },
}
```

注意：

- `file` 提供方支持 `mode: "json"` 和 `mode: "singleValue"`（在 singleValue 模式下，`id` 必须为 `"value"`）。
- 当 Windows ACL 验证不可用时，File 和 exec 提供程序路径被拒绝。使用ACL OpenClaw可以验证的路径；没有提供商级别的旁路。
- `exec` 提供程序需要绝对 `command` 路径并在 stdin/stdout. 上使用协议有效负载
- Symlink 命令路径被拒绝。配置解析的绝对二进制路径；它不能是组或全局可写的，并且在 POSIX 上，必须由当前用户拥有。
- 如果配置了`trustedDirs`，则命令路径（`~`扩展后）必须位于批准的目录内；在此检查之前，符号链接命令会被拒绝，因此配置的路径本身就是 `trustedDirs` 所约束的。
- `exec` 子进程环境默认最小化；请使用 `passEnv` 显式传递所需变量。
- 密钥引用会在激活时解析为内存中的快照，之后请求路径仅读取该快照。
- 激活期间应用活动表面过滤：已启用表面上未解析的参考失败 startup/reload，而诊断会跳过非活动表面。

---

## <a id="auth-storage"></a> 认证存储

```json5
{
  auth: {
    profiles: {
      "anthropic:default": { provider: "anthropic", mode: "api_key" },
      "anthropic:work": { provider: "anthropic", mode: "api_key" },
      "openai:personal": { provider: "openai", mode: "oauth" },
    },
    order: {
      anthropic: ["anthropic:default", "anthropic:work"],
      openai: ["openai:personal"],
    },
  },
}
```

- 每个代理配置文件存储在 `<agentDir>/openclaw-agent.sqlite` （`auth_profile_store`） 中。
- 存储的身份验证配置文件支持静态凭证模式的值级别引用（`api_key` 为 `keyRef`，`token` 为 `tokenRef`）。
- 传统平面 `auth-profiles.json` 地图（例如 `{ "provider": { "apiKey": "..." } }`）不是运行时格式； `openclaw doctor --fix` 将它们重写为带有 `.legacy-flat.*.bak` 备份的标准 `provider:default` API-key 配置文件。
- OAuth-mode 配置文件 （`auth.profiles.<id>.mode = "oauth"`） 不支持 SecretRef 支持的身份验证配置文件凭据。
- 静态运行时凭据来自内存中解析后的快照；发现旧式静态 `auth.json` 条目时会被清理。
- 旧式 OAuth 导入来自 `~/.openclaw/credentials/oauth.json`。
- 参见 [OAuth](/concepts/oauth)。
- Secrets 运行时行为和 `audit/configure/apply` 工具：[Secrets Management](/gateway/secrets)。

---

## <a id="config-includes-(%24include)"></a><a id="config-includes-$include"></a> 配置包含（`$include`）

将配置拆分到多个文件中：

```json5
// ~/.openclaw/openclaw.json
{
  gateway: { port: 18789 },
  agents: { $include: "./agents.json5" },
  broadcast: {
    $include: ["./clients/mueller.json5", "./clients/schmidt.json5"],
  },
}
```

**合并行为：**

- 单个文件：替换包含它的对象。
- 文件数组：按顺序进行深度合并（后者覆盖前者）。
- 同级键：在包含内容之后进行合并（覆盖包含的值）。
- 嵌套包含：最多 10 层。
- Paths：相对于包含文件进行解析，但必须保留在顶级配置目录中（`openclaw.json` 的 `dirname`）。仅当 Absolute/`../` 表单仍在该边界内解析时才允许使用。设置 `OPENCLAW_INCLUDE_ROOTS`（绝对路径）以允许 config 目录之外的其他根目录。
- 限制：路径在解析前后都不得包含空字节，且长度必须严格小于 4096 个字符；每个被包含的文件上限为 2 MB。
- OpenClaw-owned 写入，其更改的键全部由对象键路径中的一个单文件包含拥有，写入到最深的拥有包含。这支持顶级部分和嵌套对象映射条目，包括数字对象键，同时保持 `openclaw.json` 不变。仅直写目标包括顶级配置目录中的文件；包括通过 `OPENCLAW_INCLUDE_ROOTS` 承认，对于 OpenClaw- 写入保持只读。
- Root 包含（其根对象作者 `$include` 的配置的每个部分），实际数组条目包含，包含数组，同级覆盖，多个逻辑路径共享的文件，跨越所有权边界的更改，合并的相同路径或祖先所有者下的嵌套包含，以及包含其自己的文件仍然作者嵌套的 `$include` 指令是只读的OpenClaw-owned 写入；这些写入会被拒绝，而不是扁平化配置。
- `openclaw doctor --fix` 通过相同的边界写入；混合了根拥有的修复和包含拥有的修复的运行将被整体拒绝；拒绝写入会使每个文件保持不变（同一运行中的早期写入保持保存），Doctor 手动命名要修复的边界，加上根文件创作该边界的 `$include` 时包含的一个或多个文件（代理名册边界在没有其文件的情况下命名）。
- 错误：对于文件缺失、解析错误、循环包含、路径格式无效和长度超限，会提供明确的错误消息。

---
