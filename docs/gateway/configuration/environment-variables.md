---
summary: "环境变量源和优先级、内联环境配置、shell 环境导入、替换和秘密引用"
title: "环境变量"
sidebarTitle: "环境变量"
read_when:
  - "决定 API 密钥的存放位置"
  - "在配置值中使用 ${VAR} 替换"
  - "将配置字段指向秘密引用"
---

## <a id="environment-variables"></a> 环境变量

OpenClaw 会从父进程以及以下位置读取环境变量：

- 当前工作目录中的 `.env`（如果存在）
- `~/.openclaw/.env`（全局回退）

这两个文件都不会覆盖已有的环境变量。你也可以在配置中设置内联环境变量：

```json5
{
  env: {
    vars: {
      OPENROUTER_API_KEY: "sk-or-...",
      GROQ_API_KEY: "gsk-...",
    },
  },
}
```

<Accordion id="shell-env-import-optional" title="Shell 环境导入（可选）">
  如果启用且预期的键未设置，OpenClaw 会运行你的登录 Shell，并且只导入缺失的键：

```json5
{
  env: {
    shellEnv: { enabled: true, timeoutMs: 15000 },
  },
}
```

环境变量等价形式：`OPENCLAW_LOAD_SHELL_ENV=1`。默认 `timeoutMs`：`15000`。
</Accordion>

<Accordion id="env-var-substitution-in-config-values" title="配置值中的环境变量替换">
  可在任何配置字符串值中使用 `${VAR_NAME}` 引用环境变量：

```json5
{
  gateway: { auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" } },
  models: { providers: { custom: { apiKey: "${CUSTOM_API_KEY}" } } },
}
```

规则：

- 仅匹配大写名称：`[A-Z_][A-Z0-9_]*`
- Missing/empty 变量明显未解决，发出警告，并且无法提供给需要该值的消费者
- Escape 与 `$${VAR}` 一起生成文字 `${VAR}` 值
- 可在 `$include` 文件中使用
- 内联替换：`"${BASE}/v1"` → `"https://api.example.com/v1"`

</Accordion>

<Accordion id="secret-refs-env-file-exec-store" title="秘密引用（env、文件、exec、store）">
  对于支持 SecretRef 对象的字段，你可以使用：

```json5
{
  models: {
    providers: {
      openai: { apiKey: { source: "env", provider: "default", id: "OPENAI_API_KEY" } },
    },
  },
  skills: {
    entries: {
      "image-lab": {
        apiKey: {
          source: "file",
          provider: "filemain",
          id: "/skills/entries/image-lab/apiKey",
        },
      },
    },
  },
  channels: {
    googlechat: {
      serviceAccount: {
        source: "exec",
        provider: "vault",
        id: "channels/googlechat/serviceAccount",
      },
    },
  },
}
```

上面的 `env` 引用使用内置的 `default` 提供程序，并且不需要 `secrets.providers.default` 条目，除非 `secrets.defaults.env` 选择另一个别名。相同的规则适用于 `store` 参考和 `secrets.defaults.store`。有关提供程序优先级和所需的 `file`/`exec` 提供程序配置，请参阅 [Secrets Management](/gateway/secrets#secretref-contract)。 [SecretRef 凭证 Surface](/reference/secretref-credential-surface) 中列出了受支持的凭证路径。
</Accordion>

完整优先级和来源请参见 [环境](/help/environment)。
