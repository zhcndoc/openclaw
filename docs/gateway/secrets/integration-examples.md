---
summary: "外部秘密管理器、MCP 服务器环境变量和沙箱 SSH 的 Exec 提供程序配方"
read_when:
  - "通过 exec 提供程序连接外部秘密管理器"
  - "将机密传递到 MCP 服务器或沙箱 SSH 身份验证材料"
title: "Secrets 集成示例"
---

此页面收集工作集成示例：外部秘密管理器的执行提供程序配方、MCP 服务器环境变量和沙箱 SSH 身份验证材料。

## <a id="exec-integration-examples"></a> Exec 集成示例

有关服务账户、捆绑代理技能和故障排除的专门 1Password 指南，请参见 [1Password](/gateway/1password)。

<AccordionGroup>
  <Accordion id="1password" title="1密码">
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

    捆绑的 [1Password 插件](/plugins/onepassword)使用官方的 `op` CLI 和插件的服务账户令牌文件。

  </Accordion>
  <Accordion id="bitwarden-secrets-manager-bws" title="Bitwarden 秘密管理器 （`bws`）">
    使用解析器包装器将 SecretRef id 映射到 Bitwarden Secrets Manager 项目密钥。该存储库包括 [`scripts/secrets/openclaw-bws-resolver.mjs`](https://github.com/openclaw/openclaw/blob/main/scripts/secrets/openclaw-bws-resolver.mjs)；将其安装或复制到运行网关的主机上的绝对可信路径。

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

    解析器批量处理请求的 ID，运行 `bws secret list`，并返回匹配秘密 `key` 字段的值。使用满足 exec SecretRef id 合约的密钥，例如 `openclaw/providers/openai/apiKey`；在解析器运行之前，带有下划线的 env-var-style 键将被拒绝。如果多个可见的 Bitwarden 密钥共享所请求的密钥，则解析器会将该 id 视为不明确而不是猜测而失败。更新配置后，验证解析器路径：

    ```bash
    openclaw secrets audit --allow-exec
    ```

  </Accordion>
  <Accordion id="hashicorp-vault-cli" title="HashiCorp 保险库 CLI">
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
  <Accordion id="password-store-pass" title="密码存储 （`pass`）">
    使用小型解析器包装器将 SecretRef id 直接映射到 `pass` 条目。将其保存为可执行文件，位于通过 exec-provider 路径检查的绝对路径，例如 `/usr/local/bin/openclaw-pass-resolver`。 `#!/usr/bin/env node` shebang 从解析器进程 `PATH` 解析 `node`，因此将 `PATH` 包含在 `passEnv` 中。如果 `pass` 不在该 `PATH` 上，请在父环境中设置 `PASS_BIN` 并将其也包含在 `passEnv` 中：

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
        process.stderr.write(`Failed to parse request: ${err.message}\n`);
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
          errors[id] = { message: (result.stderr || `pass exited ${result.status}`).trim() };
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
  <Accordion id="sops" title="标准操作规程">
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

## <a id="mcp-server-environment-variables"></a> MCP 服务器环境变量

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

## <a id="sandbox-ssh-auth-material"></a> 沙箱 SSH 认证材料

核心 `ssh` 沙箱后端还支持 SecretRefs 用于 SSH 身份验证材料：

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
