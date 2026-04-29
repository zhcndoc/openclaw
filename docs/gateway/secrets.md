---
summary: "机密管理：SecretRef 合约、运行时快照行为，以及安全的单向清理"
read_when:
  - 为提供方凭据和 `auth-profiles.json` 引用配置 SecretRef 时
  - 在生产环境中安全地进行 secrets 重载、审计、配置和应用时
  - 理解启动即失败、非活动表面过滤和最后已知良好行为时
title: "机密管理"
sidebarTitle: "机密管理"
---

OpenClaw 支持增量式 SecretRef，因此受支持的凭据不需要以明文存储在配置中。

<Note>
明文仍然可用。SecretRef 是按凭据可选启用的。
</Note>

## 目标和运行时模型

Secrets 会被解析为内存中的运行时快照。

- 解析在激活期间是主动进行的，而不是在请求路径上惰性进行。
- 当一个实际上处于活动状态的 SecretRef 无法解析时，启动会快速失败。
- 重载使用原子切换：要么完全成功，要么保留最后一个已知良好快照。
- SecretRef 策略违规（例如 OAuth 模式的 auth profiles 与 SecretRef 输入组合）会在运行时切换之前导致激活失败。
- 运行时请求只从活动的内存快照读取。
- 在首次成功的配置激活/加载之后，运行时代码路径会持续读取该活动内存快照，直到一次成功的重载将其切换。
- 出站传递路径也会从该活动快照读取（例如 Discord 回复/线程传递和 Telegram 动作发送）；它们不会在每次发送时重新解析 SecretRef。

这可以让 secret-provider 故障不影响热点请求路径。

## 活动表面过滤

SecretRef 仅在实际上处于活动状态的表面上进行校验。

- 已启用表面：未解析的引用会阻止启动/重载。
- 非活动表面：未解析的引用不会阻止启动/重载。
- 非活动引用会输出非致命诊断，代码为 `SECRETS_REF_IGNORED_INACTIVE_SURFACE`。

<AccordionGroup>
  <Accordion title="非活动表面的示例">
    - 已禁用的 channel/account 条目。
    - 没有任何已启用账户继承的顶层 channel 凭据。
    - 已禁用的工具/功能表面。
    - 未被 `tools.web.search.provider` 选中的 Web 搜索提供方特定密钥。在自动模式（provider 未设置）下，会按优先级查阅这些密钥以进行提供方自动检测，直到有一个解析成功。选择完成后，未被选中的提供方密钥会被视为非活动状态，直到被选中为止。
    - 沙箱 SSH 认证材料（`agents.defaults.sandbox.ssh.identityData`、`certificateData`、`knownHostsData`，以及每个 agent 的覆盖项）只有在默认 agent 或某个已启用 agent 的有效沙箱后端为 `ssh` 时才处于活动状态。
    - `gateway.remote.token` / `gateway.remote.password` SecretRef 在以下任一条件为真时处于活动状态：
      - `gateway.mode=remote`
      - 已配置 `gateway.remote.url`
      - `gateway.tailscale.mode` 为 `serve` 或 `funnel`
      - 在没有这些远程表面的本地模式下：
        - 当 token 认证可以胜出且未配置 env/auth token 时，`gateway.remote.token` 处于活动状态。
        - 仅当 password 认证可以胜出且未配置 env/auth password 时，`gateway.remote.password` 才处于活动状态。
    - 当 `OPENCLAW_GATEWAY_TOKEN` 已设置时，`gateway.auth.token` SecretRef 在启动时的 auth 解析中处于非活动状态，因为该运行时中 env token 输入会胜出。

  </Accordion>
</AccordionGroup>

## Gateway 认证表面诊断

当在 `gateway.auth.token`、`gateway.auth.password`、`gateway.remote.token` 或 `gateway.remote.password` 上配置了 SecretRef 时，gateway 启动/重载会显式记录表面状态：

- `active`：该 SecretRef 是有效认证表面的一部分，必须能够解析。
- `inactive`：由于另一个认证表面胜出，或因为远程认证被禁用/未激活，因此该 SecretRef 会在此运行时被忽略。

这些条目会以 `SECRETS_GATEWAY_AUTH_SURFACE` 记录，并包含活动表面策略使用的原因，因此你可以看到某个凭据为何被视为活动或非活动。

## 入门引用预检

当入门流程以交互模式运行且你选择 SecretRef 存储时，OpenClaw 会在保存前执行预检校验：

- 环境变量引用：校验 env 变量名，并确认在设置期间可见非空值。
- 提供方引用（`file` 或 `exec`）：校验提供方选择，解析 `id`，并检查解析结果的值类型。
- 快速开始复用路径：当 `gateway.auth.token` 已经是 SecretRef 时，入门流程会在探测/仪表盘引导之前先解析它（适用于 `env`、`file` 和 `exec` 引用），并使用相同的快速失败门控。

如果校验失败，入门流程会显示错误并允许你重试。

## SecretRef 合约

在所有地方都使用同一种对象形状：

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

<Tabs>
  <Tab title="env">
    ```json5
    { source: "env", provider: "default", id: "OPENAI_API_KEY" }
    ```

    校验：

    - `provider` 必须匹配 `^[a-z][a-z0-9_-]{0,63}$`
    - `id` 必须匹配 `^[A-Z][A-Z0-9_]{0,127}$`

  </Tab>
  <Tab title="file">
    ```json5
    { source: "file", provider: "filemain", id: "/providers/openai/apiKey" }
    ```

    校验：

    - `provider` 必须匹配 `^[a-z][a-z0-9_-]{0,63}$`
    - `id` 必须是绝对 JSON pointer（`/...`）
    - 分段中的 RFC6901 转义：`~` => `~0`，`/` => `~1`

  </Tab>
  <Tab title="exec">
    ```json5
    { source: "exec", provider: "vault", id: "providers/openai/apiKey" }
    ```

    校验：

    - `provider` 必须匹配 `^[a-z][a-z0-9_-]{0,63}$`
    - `id` 必须匹配 `^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
    - `id` 不能包含作为斜杠分隔路径段的 `.` 或 `..`（例如 `a/../b` 会被拒绝）

  </Tab>
</Tabs>

## 提供方配置

在 `secrets.providers` 下定义提供方：

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

<AccordionGroup>
  <Accordion title="Env 提供方">
    - 可通过 `allowlist` 设置可选白名单。
    - 缺失/为空的 env 值会导致解析失败。

  </Accordion>
  <Accordion title="File 提供方">
    - 从 `path` 读取本地文件。
    - `mode: "json"` 期望 JSON 对象负载，并按 pointer 解析 `id`。
    - `mode: "singleValue"` 期望 ref id 为 `"value"`，并返回文件内容。
    - 路径必须通过所有权/权限检查。
    - Windows fail-closed 说明：如果某个路径无法进行 ACL 验证，则解析失败。仅对受信任路径，可在该提供方上设置 `allowInsecurePath: true` 以绕过路径安全检查。

  </Accordion>
  <Accordion title="Exec 提供方">
    - 运行配置的绝对二进制路径，不通过 shell。
    - 默认情况下，`command` 必须指向普通文件（不能是符号链接）。
    - 设置 `allowSymlinkCommand: true` 以允许符号链接形式的 command 路径（例如 Homebrew shim）。OpenClaw 会校验解析后的目标路径。
    - 对包管理器路径（例如 `["/opt/homebrew"]`）将 `allowSymlinkCommand` 与 `trustedDirs` 配对使用。
    - 支持超时、无输出超时、输出字节限制、env 白名单以及受信任目录。
    - Windows fail-closed 说明：如果 command 路径无法进行 ACL 验证，则解析失败。仅对受信任路径，可在该提供方上设置 `allowInsecurePath: true` 以绕过路径安全检查。

    请求负载（stdin）：

    ```json
    { "protocolVersion": 1, "provider": "vault", "ids": ["providers/openai/apiKey"] }
    ```

    响应负载（stdout）：

    ```jsonc
    { "protocolVersion": 1, "values": { "providers/openai/apiKey": "<openai-api-key>" } } // pragma: allowlist secret
    ```

    可选的按 id 错误：

    ```json
    {
      "protocolVersion": 1,
      "values": {},
      "errors": { "providers/openai/apiKey": { "message": "not found" } }
    }
    ```

  </Accordion>
</AccordionGroup>

## Exec 集成示例

<AccordionGroup>
  <Accordion title="1Password CLI">
    ```json5
    {
      secrets: {
        providers: {
          onepassword_openai: {
            source: "exec",
            command: "/opt/homebrew/bin/op",
            allowSymlinkCommand: true, // Homebrew 符号链接二进制文件所必需
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
  </Accordion>
  <Accordion title="HashiCorp Vault CLI">
    ```json5
    {
      secrets: {
        providers: {
          vault_openai: {
            source: "exec",
            command: "/opt/homebrew/bin/vault",
            allowSymlinkCommand: true, // Homebrew 符号链接二进制文件所必需
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
  </Accordion>
  <Accordion title="sops">
    ```json5
    {
      secrets: {
        providers: {
          sops_openai: {
            source: "exec",
            command: "/opt/homebrew/bin/sops",
            allowSymlinkCommand: true, // Homebrew 符号链接二进制文件所必需
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
  </Accordion>
</AccordionGroup>

## MCP 服务器环境变量

通过 `plugins.entries.acpx.config.mcpServers` 配置的 MCP 服务器环境变量支持 SecretInput。这可以将 API 密钥和令牌排除在明文配置之外：

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

明文字符串值仍然有效。像 `${MCP_SERVER_API_KEY}` 这样的环境模板引用以及 SecretRef 对象，会在 MCP 服务器进程启动之前、网关激活期间被解析。与其他 SecretRef 适用范围一样，只有当 `acpx` 插件实际上处于启用状态时，未解析的引用才会阻止激活。

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

- OpenClaw 会在沙箱激活期间解析这些引用，而不是在每次 SSH 调用时惰性解析。
- 解析后的值会写入权限受限的临时文件，并在生成的 SSH 配置中使用。
- 如果实际生效的沙箱后端不是 `ssh`，这些引用将保持非激活状态，不会阻止启动。

## 支持的凭据范围

规范化支持和不支持的凭据列在：

- [SecretRef 凭据范围](/reference/secretref-credential-surface)

<Note>
运行时生成或轮换的凭据，以及 OAuth 刷新材料，特意不包含在只读 SecretRef 解析中。
</Note>

## 必需行为与优先级

- 没有引用的字段：保持不变。
- 带有引用的字段：在激活时对处于激活状态的范围内为必需。
- 如果同时存在明文和引用，则在受支持的优先级路径中，引用优先。
- 红action 哨兵 `__OPENCLAW_REDACTED__` 保留用于内部配置脱敏/恢复，并且作为提交的字面配置数据会被拒绝。

警告和审计信号：

- `SECRETS_REF_OVERRIDES_PLAINTEXT`（运行时警告）
- `REF_SHADOWED`（当 `auth-profiles.json` 中的凭据优先于 `openclaw.json` 引用时的审计发现）

Google Chat 兼容性行为：

- `serviceAccountRef` 优先于明文 `serviceAccount`。
- 当同级引用已设置时，明文值会被忽略。

## 激活触发器

密钥激活在以下情况下运行：

- 启动（预检加最终激活）
- 配置重新加载热应用路径
- 配置重新加载重启检查路径
- 通过 `secrets.reload` 手动重新加载
- 网关配置写入 RPC 预检（`config.set` / `config.apply` / `config.patch`），用于在持久化编辑之前检查提交的配置负载中 active-surface SecretRef 的可解析性

激活契约：

- 成功会以原子方式交换快照。
- 启动失败会中止网关启动。
- 运行时重新加载失败会保留最近一次已知良好快照。
- 写入 RPC 预检失败会拒绝提交的配置，并保持磁盘配置和当前运行时快照都不变。
- 为某次外发 helper/tool 调用显式提供逐调用通道令牌，不会触发 SecretRef 激活；激活点仍然是启动、重新加载以及显式 `secrets.reload`。

## 降级与恢复信号

当重新加载时的激活在健康状态之后失败时，OpenClaw 会进入降级的密钥状态。

一次性系统事件和日志代码：

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

行为：

- 降级：运行时保留最近一次已知良好快照。
- 恢复：在下一次成功激活后仅发出一次。
- 当已经处于降级状态时重复失败会记录警告，但不会刷屏事件。
- 启动时快速失败不会发出降级事件，因为运行时从未变为活动状态。

## 命令路径解析

命令路径可以通过网关快照 RPC 选择支持的 SecretRef 解析。

有两类主要行为：

<Tabs>
  <Tab title="严格命令路径">
    例如 `openclaw memory` 远程内存路径，以及当 `openclaw qr --remote` 需要远程共享密钥引用时的情况。它们从活动快照读取，在所需 SecretRef 不可用时快速失败。
  </Tab>
  <Tab title="只读命令路径">
    例如 `openclaw status`、`openclaw status --all`、`openclaw channels status`、`openclaw channels resolve`、`openclaw security audit`，以及只读 doctor/config 修复流程。它们也优先使用活动快照，但当该命令路径中的目标 SecretRef 不可用时，会降级而不是中止。

    只读行为：

    - 当网关正在运行时，这些命令会先从活动快照读取。
    - 如果网关解析不完整或网关不可用，它们会尝试针对该特定命令范围进行本地回退。
    - 如果目标 SecretRef 仍然不可用，命令会继续以降级的只读输出运行，并给出明确诊断，例如“已配置但在此命令路径中不可用”。
    - 这种降级行为仅限于命令本地，不会削弱运行时启动、重新加载或发送/认证路径。

  </Tab>
</Tabs>

其他说明：

- 后端密钥轮换后，快照刷新由 `openclaw secrets reload` 处理。
- 这些命令路径使用的网关 RPC 方法：`secrets.resolve`。

## 审计与配置工作流

默认操作流程：

<Steps>
  <Step title="审计当前状态">
    ```bash
    openclaw secrets audit --check
    ```
  </Step>
  <Step title="配置 SecretRef">
    ```bash
    openclaw secrets configure
    ```
  </Step>
  <Step title="重新审计">
    ```bash
    openclaw secrets audit --check
    ```
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="secrets audit">
    发现项包括：

    - 静态存放的明文值（`openclaw.json`、`auth-profiles.json`、`.env` 以及生成的 `agents/*/agent/models.json`）
    - 生成的 `models.json` 条目中的明文敏感提供方头部残留
    - 未解析的引用
    - 优先级遮蔽（`auth-profiles.json` 优先于 `openclaw.json` 引用）
    - 旧版残留（`auth.json`、OAuth 提示）

    执行说明：

    - 默认情况下，审计会跳过 exec SecretRef 可解析性检查，以避免命令副作用。
    - 使用 `openclaw secrets audit --allow-exec` 在审计期间执行 exec 提供方。

    头部残留说明：

    - 敏感提供方头部检测基于名称启发式（常见认证/凭据头名称及片段，例如 `authorization`、`x-api-key`、`token`、`secret`、`password` 和 `credential`）。

  </Accordion>
  <Accordion title="secrets configure">
    交互式助手，功能包括：

    - 先配置 `secrets.providers`（`env`/`file`/`exec`，添加/编辑/移除）
    - 允许你为一个 agent 作用域选择 `openclaw.json` 以及 `auth-profiles.json` 中受支持的含密钥字段
    - 可以直接在目标选择器中创建新的 `auth-profiles.json` 映射
    - 捕获 SecretRef 详细信息（`source`、`provider`、`id`）
    - 运行预检解析
    - 可立即应用

    执行说明：

    - 预检会跳过 exec SecretRef 检查，除非设置了 `--allow-exec`。
    - 如果你通过 `configure --apply` 直接应用，并且计划中包含 exec 引用/提供方，那么在应用步骤中也要保留 `--allow-exec`。

    有用的模式：

    - `openclaw secrets configure --providers-only`
    - `openclaw secrets configure --skip-provider-setup`
    - `openclaw secrets configure --agent <id>`

    `configure` 应用默认行为：

    - 清理目标提供方在 `auth-profiles.json` 中匹配的静态凭据
    - 清理 `auth.json` 中旧的静态 `api_key` 条目
    - 清理 `<config-dir>/.env` 中匹配的已知密钥行

  </Accordion>
  <Accordion title="secrets apply">
    应用已保存的计划：

    ```bash
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
    ```

    执行说明：

    - dry-run 会跳过 exec 检查，除非设置了 `--allow-exec`。
    - 写入模式会拒绝包含 exec SecretRef/提供方的计划，除非设置了 `--allow-exec`。

    有关严格目标/路径契约详情和精确拒绝规则，请参见 [Secrets Apply Plan Contract](/gateway/secrets-plan-contract)。

  </Accordion>
</AccordionGroup>

## 单向安全策略

<Warning>
OpenClaw 故意不会写入包含历史明文密钥值的回滚备份。
</Warning>

安全模型：

- 预检必须先于写入模式成功
- 在提交之前会验证运行时激活
- 应用时使用原子文件替换更新文件，并在失败时尽最大努力恢复

## 旧版认证兼容性说明

对于静态凭据，运行时不再依赖明文旧版认证存储。

- 运行时凭据来源是已解析的内存快照。
- 发现旧的静态 `api_key` 条目时会将其清理。
- 与 OAuth 相关的兼容行为仍然是独立的。

## Web UI 说明

某些 SecretInput 联合类型在原始编辑器模式下比在表单模式下更容易配置。

## 相关内容

- [认证](/gateway/authentication) — 认证设置
- [CLI：secrets](/cli/secrets) — CLI 命令
- [环境变量](/help/environment) — 环境优先级
- [SecretRef 凭据范围](/reference/secretref-credential-surface) — 凭据范围
- [Secrets Apply Plan Contract](/gateway/secrets-plan-contract) — 计划契约详情
- [安全性](/gateway/security) — 安全态势
