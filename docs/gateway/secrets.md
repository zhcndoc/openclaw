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
当明文凭据存在于代理可以检查的文件中时，它们仍可被代理读取，包括 `openclaw.json`、`.env`、已弃用的 auth-profile JSON 归档文件，或生成的 `agents/*/agent/models.json` 文件。当所有受支持的凭据都完成迁移，并且 `openclaw secrets audit --check` 报告不存在明文残留后，SecretRef 才能降低本地影响范围。
</Warning>

## 运行时模型

- Secrets 在激活期间主动解析为内存中的运行时快照，而不是在请求路径上延迟解析。
- Gateway 冷启动时，如果 SecretRef 发生可重试的失败，并且该所有者支持隔离，则会将其隔离到已知的非 Gateway 所有者。已映射的所有者类别包括模型提供商和技能、媒体/TTS/cron 提供商、符合条件的身份验证配置、每个代理的内存、沙箱 SSH、渠道账户，以及清单声明的插件路由。Gateway 会启动，将该所有者记录为“已配置但不可用”，并发出经过脱敏的降级警告。Gateway 入口身份验证、结构无效的引用或解析值、失败即关闭的所有者，以及运行时所有者未映射的引用，仍会导致启动失败。
- 重新加载时，会分别验证每个已映射的所有者，然后发布一个原子快照。健康的所有者会刷新。符合条件的失败所有者会保留其最后已知的良好值；仅当其引用标识、提供商定义以及完整的非敏感信息所有者契约均未发生变化时，才会变为陈旧状态；发生变化或新增的失败所有者会变为冷状态。严格失败会拒绝重新加载，并保留当前活动快照。
- 策略违规（例如 OAuth 模式的身份验证配置与 SecretRef 输入组合使用）会在运行时交换之前导致激活失败。
- 运行时请求只读取当前活动的内存快照。模型提供商的 SecretRef 凭据会在到达外部传输之前，通过身份验证存储和流选项以进程本地哨兵值的形式传递。出站传送路径（Discord 回复/线程传送、Telegram 操作发送）也会读取该快照，不会在每次发送时重新解析引用。
- 只读渠道能力发现会独立评估各个账户。已配置但不可用的账户不会隐藏健康的同级账户的消息操作，但通过不可用账户直接发送仍会失败即关闭。

这可以让 secret-provider 故障不影响热点请求路径。

Gateway 入口保护、结构无效的配置或解析值、策略违规以及未知所有权仍会失败即关闭。被隔离的所有者绝不会回退到优先级较低的凭据来源。

## 出口时注入（哨兵值）

对于由 SecretRefs 支持的模型提供方凭据，OpenClaw 会在模型认证解析期间生成一个不可解析、仅进程本地可见的哨兵值。因此，认证存储、流选项、SDK 配置、日志、错误对象以及大多数运行时自省看到的值都会类似于 `oc-sent-v1-...`，而不是提供方凭据。受保护的模型获取和受管理的本地提供方健康探测会在每次请求离开进程之前，立即在 URL 和 header 值中替换已知哨兵值。

未知的、形状类似哨兵值的内容会在网络活动开始前被关闭式拒绝。OpenClaw 会拒绝发送请求，而不是将未解析的哨兵值转发给提供方。已解析的密钥值也会以精确值方式注册用于日志脱敏，作为纵深防御措施。

提供方适配器会使用其 SDK 所支持的最新注入点：

- 支持自定义 fetch 选项的 SDK 会接收 OpenClaw 受保护的 fetch，因此 SDK 会保留哨兵值。
- 不支持自定义 fetch 选项的 SDK 会在创建客户端之前立即展开哨兵值。由插件拥有的提供方流和代理运行器会在最终的核心拥有交接点展开哨兵值，因为这些传输不共享 OpenClaw 的受保护 fetch。

哨兵值可减少模型调用链中的明文暴露，但它们并不等同于进程隔离。真实值仍然存在于同一进程内存中，并会出现在最终的适配器边界。未通过 SecretRefs 配置的普通环境变量凭据仍然是明文，并且不在此机制范围内。

设置 `OPENCLAW_SECRET_SENTINELS=off`（也接受 `0` 或 `false`，不区分大小写）可在事故响应或兼容性排查期间禁用哨兵值生成。该关闭开关不会禁用按精确值进行的脱敏注册。

## 代理访问边界

SecretRefs 可防止凭据被持久化到配置和生成的模型文件中，但它们并不是进程隔离边界。如果明文凭据留在磁盘上，且位于代理可读取的路径中，那么仍然可以通过文件或 shell 工具读取，从而绕过 API 级别的脱敏。

对于代理可访问文件纳入范围的生产部署，只有在满足以下所有条件时，才应视为迁移完成：

- 受支持的凭据使用 SecretRefs，而不是明文值。
- 已从 `openclaw.json`、SQLite 身份验证配置文件存储、`.env` 和生成的 `models.json` 文件中清除旧的明文残留。已弃用的身份验证 JSON 是由 doctor 管理的迁移输入，`secrets apply` 永远不会重写它。
- 迁移后，`openclaw secrets audit --check` 检查结果为干净。
- 任何剩余的不受支持或需要轮换的凭据，都受到操作系统隔离、容器隔离或外部凭据代理的保护。

这就是为什么 audit/configure/apply 工作流是一个安全迁移门禁，而不仅仅是一个便捷辅助工具。

<Warning>
SecretRefs 并不能让任意可读文件变得安全。备份、复制的配置、旧的生成模型目录，以及不受支持的凭据类型，在被删除、移出代理信任边界，或单独隔离之前，仍然属于生产密钥。
</Warning>

## 活动表面过滤

SecretRefs 仅在实际上处于活动状态的表面上进行验证：

- **已启用的表面**：映射的、可隔离的所有者所产生的可重试失败会进入冷却或过时降级状态。严格失败关闭、必须使用 Gateway 或未映射的失败会阻止启动/重新加载。
- **非活动表面**：未解析的引用不会阻止启动/重新加载；它们会发出非致命的 `SECRETS_REF_IGNORED_INACTIVE_SURFACE` 诊断信息。

<Accordion title="非活动表面的示例">
- 已禁用的通道/账户条目。
- 未被任何已启用账户继承的顶层通道凭据。
- 已禁用的工具/功能表面。
- 未被 `tools.web.search.provider` 选中的 Web 搜索提供方特定密钥。在自动模式（未设置 provider）下，会按优先级轮询这些密钥进行自动检测，直到某个密钥解析成功；选定后，未被选中的提供方密钥即为非活动状态。
- Sandbox SSH 认证材料（`agents.defaults.sandbox.ssh.identityData`、`certificateData`、`knownHostsData`，以及每个 agent 的覆盖项）仅在有效的 sandbox 后端为 `ssh` 且 sandbox 模式不是 `off` 时才处于活动状态，适用于默认 agent 或已启用的 agent。
- `gateway.remote.token` / `gateway.remote.password` SecretRefs 在满足以下任一条件时处于活动状态：
  - `gateway.mode=remote`
  - 已配置 `gateway.remote.url`
  - `gateway.tailscale.mode` 为 `serve` 或 `funnel`
  - 在不具备上述远程表面的本地模式下：当令牌身份验证可以胜出且未配置环境变量/身份验证令牌时，`gateway.remote.token` 处于活动状态；仅当密码身份验证可以胜出且未配置环境变量/身份验证密码时，`gateway.remote.password` 才处于活动状态。
- 活动的 `gateway.auth.token` / `gateway.auth.password` SecretRefs 的权威性高于 `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`；当相应的本地配置输入缺失时，环境凭据才作为后备。

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
    - `id` 必须匹配 `^[A-Za-z0-9][A-Za-z0-9._:/#-]{0,255}$`（支持诸如 `secret#json_key` 之类的选择器）
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
  },
}
```

<Accordion title="环境 provider">
- 可通过 `allowlist` 提供精确名称白名单。
- 缺失或为空的环境变量值会导致解析失败。

</Accordion>

<Accordion title="文件 provider">
- 读取 `path` 指定的本地文件。
- `mode: "json"`（默认）要求载荷为 JSON 对象，并将 `id` 解析为 JSON 指针。
- `mode: "singleValue"` 要求引用 id 为 `"value"`，并返回文件的原始内容（去除末尾换行符）。
- 路径必须通过所有权/权限检查；`timeoutMs`（默认 5000）和 `maxBytes`（默认 1 MiB）限制读取操作。
- Windows 故障关闭：如果无法验证路径的 ACL，解析将失败。请将密钥移至 OpenClaw 可以验证其 ACL 的路径；provider 级别不提供绕过机制。

</Accordion>

<Accordion title="Exec provider">
- 直接运行配置的绝对二进制路径，不使用 shell。
- `command` 必须是常规文件，不能是符号链接。对于包管理器 shim，请解析真实的二进制路径（例如使用 `realpath "$(command -v vault)"`），并配置该绝对路径。使用 `trustedDirs` 将可执行文件限制在已批准的目录中。
- 支持 `timeoutMs`（默认 5000）、`noOutputTimeoutMs`（默认为 `timeoutMs`）、`maxOutputBytes`（默认 1 MiB）、`env`/`passEnv` 白名单以及 `trustedDirs`。
- `jsonOnly` 默认为 `true`。当设置为 `jsonOnly: false` 且只请求一个 id 时，纯非 JSON 的 stdout 将被接受为该 id 的值。
- Windows 故障关闭：如果无法验证命令路径的 ACL，解析将失败。请使用 OpenClaw 可以验证其 ACL 的命令路径；provider 级别不提供绕过机制。
- 由插件管理的 exec provider 可以使用 `pluginIntegration`，而不是复制 `command`/`args`。OpenClaw 会在启动/重新加载期间从已安装的插件清单中解析当前命令详情；如果插件被禁用、移除、不受信任，或不再声明该集成，该 provider 上的活动 SecretRef 将故障关闭。

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
  "errors": { "providers/openai/apiKey": { "code": "NOT_FOUND" } }
}
```

`code` 是一个可选的机器可读诊断信息。OpenClaw 会将识别出的
`NOT_FOUND` 和 `AMBIGUOUS_DUPLICATE_KEY` 代码与 provider 和 ref id 一起显示。其他
代码以及诸如 `message` 之类的自由格式字段可用于 protocol-v1 兼容性，
但不会显示，因为解析器输出可能包含凭据信息。

</Accordion>

## 基于文件的 API 密钥

不要在配置的 `env` 块中放置 `file:...` 字符串。该块是字面量且不会被覆盖，因此这里的 `file:...` 永远不会被解析。

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

有关服务账户、捆绑代理技能和故障排除的专门 1Password 指南，请参见 [1Password](/gateway/1password)。

<AccordionGroup>
  <Accordion title="1Password">
    ```json5
    {
      plugins: {
        entries: {
          onepassword: {
            enabled: true,
          },
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
            baseUrl: "https://api.openai.com/v1",
            models: [{ id: "gpt-5", name: "gpt-5" }],
            apiKey: {
              source: "exec",
              provider: "onepassword",
              id: "op://Engineering/OpenAI/apiKey",
            },
          },
        },
      },
    }
    ```

    捆绑的 [1Password 插件](/plugins/onepassword)使用官方的
    `op` CLI 和插件的服务账户令牌文件。

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
            command: "/absolute/non-symlink/path/to/vault",
            trustedDirs: ["/absolute/non-symlink/path/to"],
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
            command: "/absolute/non-symlink/path/to/sops",
            trustedDirs: ["/absolute/non-symlink/path/to"],
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

通过 `plugins.entries.acpx.config.mcpServers` 配置的 MCP 服务器环境变量支持 SecretInput，可将 API 密钥和令牌排除在明文配置之外：

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

明文字符串值仍然可用。像 `${MCP_SERVER_API_KEY}` 这样的环境变量模板引用和 SecretRef 对象会在网关激活期间、MCP 服务器进程启动之前解析。与其他 SecretRef 使用位置一样，未解析的引用只有在 `acpx` 插件实际处于激活状态时才会阻止激活。

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
- `REF_SHADOWED`（当 SQLite 身份验证配置文件凭据优先于 `openclaw.json` 中的 ref 时的审计发现）

Google Chat 的 `serviceAccount` 接受内联 JSON 或 SecretRef。当该规范字段未设置时，Doctor 会将已弃用的同级字段 `serviceAccountRef` 移入此规范字段。

## 激活触发器

密钥激活在以下情况下运行：

- 启动（预检加最终激活）
- 配置重新加载热应用路径
- 配置重新加载重启检查路径
- 通过 `secrets.reload` 手动重新加载
- Gateway 配置写入 RPC 预检（`config.set` / `config.apply` / `config.patch`），在持久化编辑前验证所提交配置载荷中的活动面 SecretRef

激活契约：

- 成功后以原子方式交换快照。
- 严格启动失败会中止 Gateway 启动。
- 冷启动期间，对于已映射且可隔离的非 Gateway 所有者，如果发生可重试的解析失败，可以发布快照，并将该确切所有者配置为不可用。针对该所有者的请求会失败并返回 `SECRET_SURFACE_UNAVAILABLE`；模型提供商所有者的显式引用失败后，不会再回退到环境变量或身份验证配置文件中的凭据。
- 重新加载和重启检查会隔离符合条件的已映射所有者。对于引用标识未改变、提供商定义未改变且完整的非密钥所有者契约未改变的所有者，其确切的最近一次已知良好值会作为过期值保留；对于已更改或新配置但无法解析的引用，仅为该所有者发布冷状态。严格重新加载失败会保留之前处于活动状态的快照。
- `config.set`、`config.apply` 和 `config.patch` 接受可隔离所有者的语法有效但尚未解析的引用，并返回经过脱敏的 `degradedSecretOwners` 报告。Gateway 入口认证、结构无效的配置或已解析值、策略违规以及未知所有者仍会在磁盘变更前被拒绝。
- 即使另一个所有者处于冷状态或过期状态，状态正常的同级所有者仍会正常解析并发布。
- 向出站辅助程序/工具调用提供显式的每次调用通道令牌不会触发 SecretRef 激活；激活点仍为启动、重新加载和显式调用 `secrets.reload`。

## 降级与恢复信号

当在健康状态之后进行重新加载时激活失败，OpenClaw 会进入降级的密钥状态，并发出一次性系统事件和日志代码：

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

行为：

- 降级：健康所有者会刷新，陈旧所有者会保留最后已知的良好状态，而冷启动所有者仍不可用。
- 恢复：在下一次成功激活后发出一次。
- 在已经处于降级状态时反复失败会记录警告，但不会再次发出事件。
- 严格启动失败永远不会发出降级事件，因为运行时从未变为活动状态。成功启动但存在冷启动所有者时会记录所有者降级，但不会发出重新加载器事件。
- 作用域为引用的启动和重新加载失败会为每个受影响的所有者发出结构化的 `SECRETS_DEGRADED` 警告。作用域为提供者的中断会发出一条包含提供者和完整受影响所有者列表的 `SECRETS_PROVIDER_DEGRADED` 警告，而不是针对每个所有者重复记录提供者故障。警告包含经过脱敏的原因、`cold` 或 `stale` 所有者状态，以及 `openclaw secrets reload` 重试提示。警告中绝不会包含解析后的值或 SecretRef id。
- `openclaw doctor` 会列出冷启动和陈旧所有者、其受影响的配置路径、经过脱敏的原因以及重试指引。

## 命令路径解析

命令路径可以通过网关快照 RPC 选择性使用受支持的 SecretRef 解析。适用两种广泛行为：

<Tabs>
  <Tab title="严格命令路径">
    例如 `openclaw memory` 远程内存路径，以及当 `openclaw qr --remote` 需要远程共享密钥引用时的情况。它们从活动快照读取，在所需 SecretRef 不可用时快速失败。
  </Tab>
  <Tab title="只读命令路径">
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

    - 静态存储中的明文值（`openclaw.json`、SQLite 身份验证配置文件记录、`.env` 以及生成的 `agents/*/agent/models.json`）。
    - 生成的 `models.json` 条目中的明文敏感提供方请求头残留。
    - 未解析的引用。
    - 优先级遮蔽（SQLite 身份验证配置文件的优先级高于 `openclaw.json` 引用）。

    执行说明：默认情况下，审计会跳过 exec SecretRef 可解析性检查，以避免命令副作用。使用 `openclaw secrets audit --allow-exec` 可在审计期间执行 exec provider。

    头部残留说明：敏感提供方头部检测基于名称启发式规则（常见的认证/凭据头名称及其片段，例如 `authorization`、`x-api-key`、`token`、`secret`、`password` 和 `credential`）。

  </Accordion>
  <Accordion title="secrets 配置">
    交互式助手，功能包括：

    - 首先配置 `secrets.providers`（`env`/`file`/`exec`，添加/编辑/删除）。
    - 允许你在 `openclaw.json` 以及某个代理作用域的 SQLite 身份验证配置文件存储中，选择受支持的包含密钥字段。
    - 可以直接在目标选择器中创建新的身份验证配置文件映射。
    - 记录 SecretRef 详细信息（`source`、`provider`、`id`）。
    - 执行预检解析，并可立即应用。

    执行说明：除非设置了 `--allow-exec`，否则预检会跳过 exec SecretRef 检查。如果你通过 `configure --apply` 直接应用，并且计划中包含 exec refs/providers，那么在应用步骤中也要保持设置 `--allow-exec`。

    有用的模式：

    - `openclaw secrets configure --providers-only`
    - `openclaw secrets configure --skip-provider-setup`
    - `openclaw secrets configure --agent <id>`

    `configure` 的默认应用行为：

    - 从目标提供方的 SQLite 身份验证配置文件记录中清除匹配的静态凭据。
    - 保留已弃用的 `auth.json` 不变；运行 `openclaw doctor --fix` 以迁移并归档它。
    - 从生效状态文件和活动配置 `.env` 文件中清除已知的匹配密钥行（当两个路径匹配时会去重）。

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

    有关严格目标/路径契约详情和精确拒绝规则，请参见 [Secrets 应用计划契约](/gateway/secrets-plan-contract)。

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

- [认证](/gateway/authentication) - 认证设置
- [CLI：密钥](/cli/secrets) - CLI 命令
- [Vault SecretRefs](/plugins/vault) - HashiCorp Vault 提供程序设置
- [环境变量](/help/environment) - 环境优先级
- [SecretRef 凭据面](/reference/secretref-credential-surface) - 凭据面
- [Secrets Apply Plan Contract](/gateway/secrets-plan-contract) - 计划契约详情
- [安全](/gateway/security) - 安全态势
