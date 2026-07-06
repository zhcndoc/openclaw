---
summary: "机密管理：SecretRef 合约、运行时快照行为，以及安全的单向清理"
read_when:
  - 为提供方凭据和 `auth-profiles.json` 引用配置 SecretRef 时
  - 在生产环境中安全地进行 secrets 重载、审计、配置和应用时
  - 理解启动即失败、非活动表面过滤和最后已知良好行为时
title: "机密管理"
sidebarTitle: "机密管理"
---

OpenClaw 支持附加式 SecretRef，因此受支持的凭据不需要以明文形式存放在配置中。

<Note>
明文仍然可用。SecretRef 是按凭据可选启用的。
</Note>

<Warning>
如果明文凭据位于代理可检查的文件中，代理仍然可以读取它们，包括 `openclaw.json`、`auth-profiles.json`、`.env`，或生成的 `agents/*/agent/models.json` 文件。只有当所有受支持的凭据都已迁移，并且 `openclaw secrets audit --check` 不再报告任何明文残留时，SecretRef 才能真正缩小本地影响范围。
</Warning>

## 运行时模型

- Secrets 会在激活期间尽早解析为内存中的运行时快照，而不是在请求路径上惰性解析。
- 当一个实际上处于激活状态的 SecretRef 无法解析时，启动会快速失败。
- 重新加载是原子性切换：要么完整成功，要么保留上一次已知良好的快照。
- 策略违规（例如 OAuth 模式的 auth profile 与 SecretRef 输入组合）会在运行时切换之前使激活失败。
- 运行时请求只读取当前激活的内存快照。出站投递路径（Discord 回复/线程投递、Telegram action 发送）也会读取该快照，并且不会在每次发送时重新解析 refs。

这可以让 secret-provider 故障不影响热点请求路径。

## Agent 可访问边界

SecretRefs 可防止凭据被持久化到配置和生成的模型文件中，但它们并不是进程隔离边界。如果明文凭据留在磁盘上，且位于代理可读取的路径中，那么仍然可以通过文件或 shell 工具读取，从而绕过 API 级别的脱敏。

对于代理可访问文件纳入范围的生产部署，只有在满足以下所有条件时，才应视为迁移完成：

- 支持的凭据使用 SecretRefs，而不是明文值。
- 旧的明文残留已从 `openclaw.json`、`auth-profiles.json`、`.env` 和生成的 `models.json` 文件中清除。
- 迁移后 `openclaw secrets audit --check` 结果干净。
- 任何仍然存在的不受支持或会轮换的凭据，都通过操作系统隔离、容器隔离或外部凭据代理进行保护。

这就是为什么 audit/configure/apply 工作流是一个安全迁移门禁，而不仅仅是一个便捷辅助工具。

<Warning>
SecretRefs 并不能让任意可读文件变得安全。备份、复制的配置、旧的生成模型目录，以及不受支持的凭据类型，在被删除、移出代理信任边界，或单独隔离之前，仍然属于生产密钥。
</Warning>

## 活动表面过滤

SecretRefs 仅在实际上处于活动状态的表面上进行验证：

- **已启用的表面**：未解析的引用会阻止启动/重载。
- **非活动表面**：未解析的引用不会阻止启动/重载；它们会发出非致命的 `SECRETS_REF_IGNORED_INACTIVE_SURFACE` 诊断。

<Accordion title="非活动表面的示例">
- 已禁用的通道/账户条目。
- 未被任何已启用账户继承的顶层通道凭据。
- 已禁用的工具/功能表面。
- 未被 `tools.web.search.provider` 选中的 Web 搜索提供方特定密钥。在自动模式（provider 未设置）下，会按优先级轮询这些密钥进行自动检测，直到某个密钥解析成功；选定后，未被选中的提供方密钥即为非活动状态。
- Sandbox SSH 认证材料（`agents.defaults.sandbox.ssh.identityData`、`certificateData`、`knownHostsData`，以及每个 agent 的覆盖项）仅在有效的 sandbox 后端为 `ssh` 且 sandbox 模式不是 `off` 时才处于活动状态，适用于默认 agent 或已启用的 agent。
- `gateway.remote.token` / `gateway.remote.password` SecretRefs 在满足以下任一条件时处于活动状态：
  - `gateway.mode=remote`
  - 已配置 `gateway.remote.url`
  - `gateway.tailscale.mode` 为 `serve` 或 `funnel`
  - 在没有这些远程表面的本地模式下：当 token 认证可以胜出且未配置 env/auth token 时，`gateway.remote.token` 处于活动状态；当 password 认证可以胜出且未配置 env/auth password 时，`gateway.remote.password` 仅在此时处于活动状态。
- 当设置了 `OPENCLAW_GATEWAY_TOKEN` 时，`gateway.auth.token` SecretRef 在启动时的认证解析中处于非活动状态，因为该运行时会优先使用 env token 输入。

</Accordion>

## Gateway 认证表面诊断

当在 `gateway.auth.token`、`gateway.auth.password`、`gateway.remote.token` 或 `gateway.remote.password` 上设置了 `SecretRef` 时，gateway 启动/重载会在代码 `SECRETS_GATEWAY_AUTH_SURFACE` 下记录表面状态：

- `active`：该 SecretRef 是有效认证表面的一部分，且必须能够解析。
- `inactive`：其他认证表面生效，或者远程认证被禁用/未激活。

日志条目包含所使用的 active-surface 策略原因。

## 入门引用预检

在交互式入门过程中，选择 SecretRef 存储会在保存前运行预检验证：

- Env 引用：验证环境变量名，并确认在设置期间可见的值非空。
- Provider 引用（`file` 或 `exec`）：验证提供者选择，解析 `id`，并检查解析后的值类型。
- 快速开始流程：当 `gateway.auth.token` 已经是 SecretRef 时，入门会在探测/仪表盘引导之前先解析它（适用于 `env`、`file` 和 `exec` 引用），并使用相同的快速失败门控。

验证失败时会显示错误，并允许你重试。

## SecretRef 合约

一个对象形状，处处通用：

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

<Tabs>
  <Tab title="env">
    ```json5
    { source: "env", provider: "default", id: "OPENAI_API_KEY" }
    ```

    SecretInput 字段也接受简写字符串：

    ```json5
    "${OPENAI_API_KEY}"
    "$OPENAI_API_KEY"
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
    - `id` 必须是一个绝对 JSON 指针（`/...`），或者对于 `singleValue` 提供程序使用字面量 `value`
    - 分段中的 RFC 6901 转义：`~` 变为 `~0`，`/` 变为 `~1`

  </Tab>
  <Tab title="exec">
    ```json5
    { source: "exec", provider: "vault", id: "providers/openai/apiKey#value" }
    ```

    校验：

    - `provider` 必须匹配 `^[a-z][a-z0-9_-]{0,63}$`
    - `id` 必须匹配 `^[A-Za-z0-9][A-Za-z0-9._:/#-]{0,255}$`（支持诸如 `secret#json_key` 之类的 selector）
    - `id` 不能包含 `.` 或 `..` 作为由斜杠分隔的路径段（例如 `a/../b` 会被拒绝）

  </Tab>
</Tabs>

## Provider 配置

在 `secrets.providers` 下定义 provider：

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
      "team-secrets": {
        source: "exec",
        pluginIntegration: {
          pluginId: "acme-secrets",
          integrationId: "secret-store",
        },
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

<Accordion title="Env provider">
- 可通过 `allowlist` 提供精确名称白名单。
- 缺失或为空的环境变量值会导致解析失败。

</Accordion>

<Accordion title="File provider">
- 读取 `path` 处的本地文件。
- `mode: "json"`（默认）要求载荷为 JSON 对象，并将 `id` 解析为 JSON Pointer。
- `mode: "singleValue"` 要求引用 id 为 `"value"`，并返回原始文件内容（去除末尾换行）。
- 路径必须通过所有权/权限检查；`timeoutMs`（默认 5000）和 `maxBytes`（默认 1 MiB）限制读取。
- Windows 失败关闭：如果该路径无法进行 ACL 验证，解析会失败。仅对受信任路径，可在该 provider 上设置 `allowInsecurePath: true` 以绕过检查。

</Accordion>

<Accordion title="Exec provider">
- 直接运行配置的绝对二进制路径，不经过 shell。
- 默认情况下，`command` 必须是常规文件，而不是符号链接。设置 `allowSymlinkCommand: true` 可允许符号链接命令路径（例如 Homebrew shim），并配合 `trustedDirs`（例如 `["/opt/homebrew"]`），以便只有包管理器路径符合条件。
- 支持 `timeoutMs`（默认 5000）、`noOutputTimeoutMs`（默认等于 `timeoutMs`）、`maxOutputBytes`（默认 1 MiB）、`env`/`passEnv` 白名单，以及 `trustedDirs`。
- `jsonOnly` 默认值为 `true`。当 `jsonOnly: false` 且只请求单个 id 时，允许将非 JSON 的标准输出作为该 id 的值。
- Windows 失败关闭：如果该命令路径无法进行 ACL 验证，解析会失败。仅对受信任路径，可在该 provider 上设置 `allowInsecurePath: true` 以绕过检查。
- 由插件管理的 exec provider 可使用 `pluginIntegration` 替代复制的 `command`/`args`。OpenClaw 会在启动/重载时从已安装的插件清单中解析当前命令详情；如果插件被禁用、移除、不受信任，或不再声明该集成，则该 provider 上处于活动状态的 SecretRef 会失败关闭。

请求载荷（stdin）：

```json
{ "protocolVersion": 1, "provider": "vault", "ids": ["providers/openai/apiKey"] }
```

响应载荷（stdout）：

```jsonc
{ "protocolVersion": 1, "values": { "providers/openai/apiKey": "<openai-api-key>" } } // pragma: allowlist secret
```

可选的每个 id 错误：

```json
{
  "protocolVersion": 1,
  "values": {},
  "errors": { "providers/openai/apiKey": { "message": "未找到" } }
}
```

</Accordion>

## 基于文件的 API 密钥

不要在配置的 `env` 块中放置 `file:...` 字符串。该块是字面量且不会被覆盖，因此在这里 `file:...` 永远不会被解析。

请改为在受支持的凭据字段上使用文件类型的 SecretRef：

```json5
{
  secrets: {
    providers: {
      xai_key_file: {
        source: "file",
        path: "~/.openclaw/secrets/xai-api-key.txt",
        mode: "singleValue",
      },
    },
  },
  models: {
    providers: {
      xai: {
        apiKey: { source: "file", provider: "xai_key_file", id: "value" },
      },
    },
  },
}
```

对于 `mode: "singleValue"`，SecretRef 的 `id` 是 `"value"`。对于 `mode: "json"`，请使用绝对 JSON Pointer，例如 `"/providers/xai/apiKey"`。

有关接受 SecretRef 的字段，请参见 [SecretRef Credential Surface](/reference/secretref-credential-surface)。

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
  <Accordion title="Bitwarden Secrets Manager (`bws`)">
    使用一个解析器包装器将 SecretRef ids 映射到 Bitwarden Secrets Manager item keys。仓库包含 `scripts/secrets/openclaw-bws-resolver.mjs`；请将其安装或复制到运行 Gateway 的主机上一个绝对可信路径。

    要求：

    - Gateway 主机上已安装 Bitwarden Secrets Manager CLI (`bws`)。
    - `BWS_ACCESS_TOKEN` 可供 Gateway 服务使用。
    - 将 `PATH` 传递给解析器，或将 `BWS_BIN` 设置为绝对的 `bws` 二进制路径。
    - 在使用自托管 Bitwarden 实例时，环境中已设置 `BWS_SERVER_URL`。

    ```json5
    {
      secrets: {
        providers: {
          bws: {
            source: "exec",
            command: "/usr/local/bin/openclaw-bws-resolver.mjs",
            passEnv: ["BWS_ACCESS_TOKEN", "BWS_SERVER_URL", "PATH", "BWS_BIN"],
            jsonOnly: true,
          },
        },
      },
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.openai.com/v1",
            models: [{ id: "gpt-5", name: "gpt-5" }],
            apiKey: {
              source: "exec",
              provider: "bws",
              id: "openclaw/providers/openai/apiKey",
            },
          },
        },
      },
    }
    ```

    该解析器会批量处理请求的 ids，运行 `bws secret list`，并返回匹配 secret `key` 字段的值。请使用符合 exec SecretRef id 契约的 key，例如 `openclaw/providers/openai/apiKey`；在解析器运行前，带下划线的 env-var 风格 key 会被拒绝。如果多个可见的 Bitwarden secret 共享请求的 key，解析器会将该 id 判定为歧义并失败，而不是猜测。更新配置后，请验证解析器路径：

    ```bash
    openclaw secrets audit --allow-exec
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
  <Accordion title="password-store (`pass`)">
    使用一个小型解析器包装器将 SecretRef ids 直接映射到 `pass` 条目。将其保存为位于绝对路径下、可通过你的 exec-provider 路径检查的可执行文件，例如 `/usr/local/bin/openclaw-pass-resolver`。`#!/usr/bin/env node` shebang 会从解析器进程的 `PATH` 中解析 `node`，因此请在 `passEnv` 中包含 `PATH`。如果 `pass` 不在该 `PATH` 上，请在父环境中设置 `PASS_BIN`，并同样将其包含在 `passEnv` 中：

    ```js
    #!/usr/bin/env node
    const { spawnSync } = require("node:child_process");

    let stdin = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      stdin += chunk;
    });
    process.stdin.on("error", (err) => {
      process.stderr.write(`${err.message}\n`);
      process.exit(1);
    });
    process.stdin.on("end", () => {
      let request;
      try {
        request = JSON.parse(stdin || "{}");
      } catch (err) {
        process.stderr.write(`解析请求失败：${err.message}\n`);
        process.exit(1);
      }

      const passBin = process.env.PASS_BIN || "pass";
      const values = {};
      const errors = {};

      for (const id of request.ids ?? []) {
        const result = spawnSync(passBin, ["show", id], { encoding: "utf8" });
        if (result.status === 0) {
          values[id] = result.stdout.split(/\r?\n/, 1)[0] ?? "";
        } else {
          errors[id] = { message: (result.stderr || `pass 退出 ${result.status}`).trim() };
        }
      }

      process.stdout.write(JSON.stringify({ protocolVersion: 1, values, errors }));
    });
    ```

    然后配置 exec provider，并将 `apiKey` 指向 `pass` 条目路径：

    ```json5
    {
      secrets: {
        providers: {
          pass_store: {
            source: "exec",
            command: "/usr/local/bin/openclaw-pass-resolver",
            passEnv: ["PATH", "HOME", "GNUPGHOME", "GPG_TTY", "PASSWORD_STORE_DIR", "PASS_BIN"],
            jsonOnly: true,
          },
        },
      },
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.openai.com/v1",
            models: [{ id: "gpt-5", name: "gpt-5" }],
            apiKey: {
              source: "exec",
              provider: "pass_store",
              id: "openclaw/providers/openai/apiKey",
            },
          },
        },
      },
    }
    ```

    将 secret 保留在 `pass` 条目的第一行，或者自定义包装器以返回完整的 `pass show` 输出。更新配置后，请同时验证静态审计和 exec 解析器路径：

    ```bash
    openclaw secrets audit --check
    openclaw secrets audit --allow-exec
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

通过 `plugins.entries.acpx.config.mcpServers` 配置的 MCP server env vars 接受 SecretInput，可将 API keys 和 tokens 排除在明文配置之外：

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

明文字符串值仍然可用。像 `${MCP_SERVER_API_KEY}` 这样的 env-template refs 和 SecretRef 对象会在网关激活期间、MCP server 进程启动之前解析。与其他 SecretRef 表面一样，未解析的 refs 只有在 `acpx` 插件实际上处于激活状态时才会阻止激活。

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
- 解析后的值会写入一个临时目录，文件权限受限（`0o600`），并用于生成的 SSH 配置。
- 如果实际生效的沙箱后端不是 `ssh`（或者沙箱模式为 `off`），这些引用会保持不激活状态，不会阻止启动。

## 支持的凭据范围

Canonical 支持和不支持的凭据列在 [SecretRef Credential Surface](/reference/secretref-credential-surface) 中。

<Note>
运行时生成或轮换的凭据，以及 OAuth 刷新材料，特意不包含在只读 SecretRef 解析中。
</Note>

## 必需行为与优先级

- 没有 ref 的字段：保持不变。
- 带有 ref 的字段：在激活期间，对活动表面是必需的。
- 如果同时存在明文和 ref，则在受支持的优先级路径上，ref 优先。
- 脱敏哨兵 `__OPENCLAW_REDACTED__` 仅保留用于内部配置脱敏/恢复，并且作为字面提交的配置数据会被拒绝。

警告和审计信号：

- `SECRETS_REF_OVERRIDES_PLAINTEXT`（运行时警告）
- `REF_SHADOWED`（当 `auth-profiles.json` 中的凭据优先于 `openclaw.json` 引用时的审计发现）

Google Chat 兼容性：`serviceAccountRef` 优先于明文 `serviceAccount`；一旦设置了同级 ref，明文值将被忽略。

## 激活触发器

密钥激活在以下情况下运行：

- 启动（预检加最终激活）
- 配置重载热应用路径
- 配置重载重启检查路径
- 通过 `secrets.reload` 手动重载
- 网关配置写入 RPC 预检（`config.set` / `config.apply` / `config.patch`），在持久化编辑之前，检查所提交配置载荷中 active-surface 的 `SecretRef` 可解析性

激活契约：

- 成功会以原子方式交换快照。
- 启动失败会中止网关启动。
- 运行时重载失败会保留上一个已知可用快照。
- 写入 RPC 预检失败会拒绝所提交的配置；磁盘配置和活动运行时快照都保持不变。
- 向外部辅助工具/工具调用显式提供逐次调用的 channel token 不会触发 `SecretRef` 激活；激活点仍然是启动、重载以及显式的 `secrets.reload`。

## 降级与恢复信号

当在健康状态之后进行重新加载时激活失败，OpenClaw 会进入降级的密钥状态，并发出一次性系统事件和日志代码：

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

行为：

- 降级：运行时保留最后已知的良好快照。
- 恢复：在下一次成功激活后只发出一次。
- 在已经降级的情况下再次发生失败时会记录警告，但不会重新发出该事件。
- 启动时快速失败永远不会发出降级事件，因为运行时从未变为活动状态。

## 命令路径解析

Command paths can opt into supported SecretRef resolution via a gateway snapshot RPC. Two broad behaviors apply:

<Tabs>
  <Tab title="严格命令路径">
    例如 `openclaw memory` 远程内存路径，以及当 `openclaw qr --remote` 需要远程共享密钥引用时的情况。它们从活动快照读取，在所需 SecretRef 不可用时快速失败。
  </Tab>
  <Tab title="Read-only command paths">
    例如 `openclaw status`、`openclaw status --all`、`openclaw channels status`、`openclaw channels resolve`、`openclaw security audit`，以及只读的 doctor/config repair 流程。它们也会优先使用活动快照，但在目标 SecretRef 不可用时会降级而不是中止。

    只读行为：

    - 当网关正在运行时，这些命令会优先从活动快照读取。
    - 如果网关解析不完整或网关不可用，它们会针对该命令面进行有目标的本地回退尝试。
    - 如果目标 SecretRef 仍然不可用，命令会继续以降级的只读输出运行，并给出明确诊断，说明该引用已配置，但在此命令路径中不可用。
    - 这种降级行为仅限于命令本地；它不会削弱运行时启动、重载或发送/认证路径。

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
  <Step title="配置并应用 SecretRefs">
    ```bash
    openclaw secrets configure --apply
    ```
  </Step>
  <Step title="重新审计">
    ```bash
    openclaw secrets audit --check
    ```
  </Step>
</Steps>

在重新审计结果干净之前，不要将迁移视为完成。如果审计仍然报告静态存储中的明文值，即使运行时 API 返回的是已脱敏值，代理访问风险仍然存在。

如果你在 `configure` 过程中保存了一个计划而不是直接应用，那么在重新审计之前，使用 `openclaw secrets apply --from <plan-path>` 应用该已保存的计划。

<AccordionGroup>
  <Accordion title="secrets 审计">
    发现项包括：

    - 静态存储中的明文值（`openclaw.json`、`auth-profiles.json`、`.env` 以及生成的 `agents/*/agent/models.json`）。
    - 生成的 `models.json` 条目中残留的明文敏感提供方头部。
    - 未解析的引用。
    - 优先级遮蔽（`auth-profiles.json` 优先于 `openclaw.json` 中的 refs）。
    - 遗留残留项（`auth.json`、OAuth 提醒）。

    执行说明：默认情况下，审计会跳过 exec SecretRef 可解析性检查，以避免命令副作用。使用 `openclaw secrets audit --allow-exec` 可在审计期间执行 exec provider。

    头部残留说明：敏感提供方头部检测基于名称启发式规则（常见的认证/凭据头名称及其片段，例如 `authorization`、`x-api-key`、`token`、`secret`、`password` 和 `credential`）。

  </Accordion>
  <Accordion title="secrets 配置">
    交互式助手，功能包括：

    - 首先配置 `secrets.providers`（`env`/`file`/`exec`，添加/编辑/移除）。
    - 让你为一个代理作用域选择 `openclaw.json` 以及 `auth-profiles.json` 中受支持的含密钥字段。
    - 可在目标选择器中直接创建新的 `auth-profiles.json` 映射。
    - 捕获 SecretRef 详情（`source`、`provider`、`id`）。
    - 运行预检解析，并可立即应用。

    执行说明：除非设置了 `--allow-exec`，否则预检会跳过 exec SecretRef 检查。如果你通过 `configure --apply` 直接应用，并且计划中包含 exec refs/providers，那么在应用步骤中也要保持设置 `--allow-exec`。

    有用的模式：

    - `openclaw secrets configure --providers-only`
    - `openclaw secrets configure --skip-provider-setup`
    - `openclaw secrets configure --agent <id>`

    `configure` 的默认应用行为：

    - 清除 `auth-profiles.json` 中与目标提供方匹配的静态凭据。
    - 清除 `auth.json` 中遗留的静态 `api_key` 条目。
    - 清除 `<config-dir>/.env` 中匹配的已知 secret 行。

  </Accordion>
  <Accordion title="secrets 应用">
    应用已保存的计划：

    ```bash
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
    ```

    执行说明：除非设置了 `--allow-exec`，否则 dry-run 会跳过 exec 检查；写入模式会拒绝包含 exec SecretRefs/providers 的计划，除非设置了 `--allow-exec`。

    有关严格目标/路径契约详情和精确拒绝规则，请参见 [Secrets Apply Plan Contract](/gateway/secrets-plan-contract)。

  </Accordion>
</AccordionGroup>

## 单向安全策略

<Warning>
OpenClaw 故意不会写入包含历史明文密钥值的回滚备份。
</Warning>

安全模型：

- 在进入写入模式之前，预检必须成功。
- 在提交之前，会验证运行时激活。
- 应用会使用原子文件替换更新文件，并在失败时尽最大努力进行恢复。

## 旧版认证兼容性说明

对于静态凭据，运行时不再依赖明文旧版认证存储。

- 运行时凭据来源是已解析的内存快照。
- 发现旧的静态 `api_key` 条目时会将其清理。
- 与 OAuth 相关的兼容行为仍然是独立的。

## Web UI 说明

某些 SecretInput 联合类型在原始编辑器模式下比在表单模式下更容易配置。

## 相关内容

- [Authentication](/gateway/authentication) - 认证设置
- [CLI: secrets](/cli/secrets) - CLI 命令
- [Environment Variables](/help/environment) - 环境变量优先级
- [SecretRef Credential Surface](/reference/secretref-credential-surface) - 凭据表面
- [Secrets Apply Plan Contract](/gateway/secrets-plan-contract) - 计划契约详情
- [Security](/gateway/security) - 安全态势
