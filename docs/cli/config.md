---
summary: "CLI 参考：`openclaw config`（get/set/patch/unset/file/schema/validate）"
read_when:
  - 你想以非交互方式读取或编辑配置
title: "配置"
sidebarTitle: "配置"
---

用于 `openclaw.json` 的非交互式辅助命令：可按路径获取/设置/补丁/取消设置某个值，打印 schema，验证，或打印当前活动文件路径。无子命令运行 `openclaw config` 时，会打开与 `openclaw configure` 相同的引导式向导。

<Note>
当 `OPENCLAW_NIX_MODE=1` 时，OpenClaw 会将 `openclaw.json` 视为不可变。只读命令（`config get`、`config file`、`config schema`、`config validate`）仍可工作；配置写入命令会拒绝执行。请改为编辑安装所使用的 Nix 源；对于第一方的 nix-openclaw 发行版，请使用 [nix-openclaw 快速开始](https://github.com/openclaw/nix-openclaw#quick-start)，并在 `programs.openclaw.config` 或 `instances.<name>.config` 下设置值。
</Note>

## 根选项

<ParamField path="--section <section>" type="string">
  Reusable guided setup section filter, used when you run `openclaw config` without a subcommand.
</ParamField>

Guided sections: `workspace`, `model`, `web`, `gateway`, `daemon`, `channels`, `plugins`, `skills`, `health`.

## 示例

```bash
openclaw config file
openclaw config --section model
openclaw config --section gateway --section daemon
openclaw config schema
openclaw config get browser.executablePath
openclaw config set browser.executablePath "/usr/bin/google-chrome"
openclaw config set browser.profiles.work.executablePath "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
openclaw config set agents.defaults.heartbeat.every "2h"
openclaw config set 'agents.entries.main.tools.exec.node' "node-id-or-name"
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN
openclaw config set secrets.providers.vaultfile --provider-source file --provider-path /etc/openclaw/secrets.json --provider-mode json
openclaw config patch --file ./openclaw.patch.json5 --dry-run
openclaw config unset plugins.entries.brave.config.webSearch.apiKey
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN --dry-run
openclaw config validate
openclaw config validate --json
```

### 路径

点号或方括号表示法。在 shell 示例中请将方括号路径加引号，这样 zsh 不会展开 `[0]`：

```bash
openclaw config get agents.defaults.workspace
openclaw config get agents.entries.main
openclaw config get agents.entries
openclaw config set 'agents.entries.work.tools.exec.node' "node-id-or-name"
```

### `config get`

从已脱敏的配置快照中读取一个值（机密信息不会输出）。`--json` 会将原始值以 JSON 形式输出；否则，字符串/数字/布尔值会直接输出，而对象/数组会以格式化 JSON 输出。

当路径缺失时，`--json` 会将 `{ "error": "Config path not found: <path>" }` 写入 stdout，并以状态码 1 退出。不使用 `--json` 时，诊断信息仍会输出到 stderr。

```bash
openclaw config get browser.executablePath
openclaw config get agents.defaults.model --json
```

### `config file`

打印当前激活的配置文件路径，该路径由 `OPENCLAW_CONFIG_PATH` 或默认位置解析得到。该路径指向一个普通文件，而不是符号链接；请参见 [写入安全](#write-safety)。

### `config schema`

将 `openclaw.json` 的生成 JSON schema 打印到 stdout。

<AccordionGroup>
  <Accordion title="包含内容">
    - 当前根配置 schema，以及一个供编辑器工具使用的根 `$schema` 字符串字段。
    - `title` / `description` 文档元数据，由 Control UI 使用。
    - 当匹配到字段文档时，嵌套对象、通配符（`*`）和数组项（`[]`）节点会继承相同的 `title` / `description` 元数据。
    - `anyOf` / `oneOf` / `allOf` 分支也会继承相同的文档元数据。
    - 在运行时清单可加载时，尽力提供实时插件 + 通道 schema 元数据。
    - 即使当前配置无效，也会提供一个干净的回退 schema。

  </Accordion>
  <Accordion title="相关运行时 RPC">
    `config.schema.lookup` 会返回一个规范化的配置路径，以及一个浅层 schema 节点（`title`、`description`、`type`、`enum`、`const`、通用边界），匹配的 UI 提示元数据和直接子项摘要。可将其用于 Control UI 中按路径范围的下钻，或供自定义客户端使用。
  </Accordion>
</AccordionGroup>

```bash
openclaw config schema
openclaw config schema > openclaw.schema.json
```

### `config validate`

在不启动 gateway 的情况下，根据当前激活的 schema 验证当前配置。

```bash
openclaw config validate
openclaw config validate --json
```

<Note>
如果验证已经失败，请先运行 `openclaw configure` 或 `openclaw doctor --fix`。`openclaw chat` 不会绕过无效配置保护。
</Note>

## 值

值在可能时会被解析为 JSON5；否则将被视为原始字符串。使用 `--strict-json` 可要求使用不带字符串回退的标准 JSON（此时会拒绝仅属于 JSON5 的语法，例如注释、尾随逗号或未加引号的键）。`config set` 中的 `--json` 是 `--strict-json` 的旧别名。

```bash
openclaw config set agents.defaults.heartbeat.every "0m"
openclaw config set gateway.port 19001 --strict-json
openclaw config set channels.whatsapp.groups '["*"]' --strict-json
```

`config get <path> --json` 会将原始值以 JSON 形式打印，而不是终端格式化输出。

当写入更改 `agents.defaults.model` 或每个代理的 `agents.entries.*.model` 时，OpenClaw 会在写入前通过已配置的提供方目录解析每个已更改的主模型或回退模型。未知的模型引用会被拒绝，且不会更改当前配置；运行 `openclaw models list` 以查看可用模型。

<Note>
对象赋值默认会用目标路径替换。通常包含用户添加条目的受保护路径会拒绝会删除现有条目的替换，除非你传入 `--replace`：`agents.defaults.models`、`agents.entries`、`models.providers`、`models.providers.<id>`、`models.providers.<id>.models`、`plugins.entries` 和 `auth.profiles`。
</Note>

在向这些 map 添加条目时使用 `--merge`：

```bash
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
openclaw config set models.providers.ollama.models '[{"id":"llama3.2","name":"Llama 3.2"}]' --strict-json --merge
```

仅当所提供的值应有意成为完整的目标值时，才使用 `--replace`。

## `config set` 模式

<Tabs>
  <Tab title="值模式">
    ```bash
    openclaw config set <path> <value>
    ```
  </Tab>
  <Tab title="SecretRef 构建器模式">
    ```bash
    openclaw config set channels.discord.token \
      --ref-provider default \
      --ref-source env \
      --ref-id DISCORD_BOT_TOKEN
    ```
  </Tab>
  <Tab title="Provider 构建器模式">
    仅适用于 `secrets.providers.<alias>` 路径：

    ```bash
    openclaw config set secrets.providers.vault \
      --provider-source exec \
      --provider-command /usr/local/bin/openclaw-vault \
      --provider-arg read \
      --provider-arg openai/api-key \
      --provider-timeout-ms 5000
    ```

  </Tab>
  <Tab title="批量模式">
    ```bash
    openclaw config set --batch-json '[
      {
        "path": "secrets.providers.default",
        "provider": { "source": "env" }
      },
      {
        "path": "channels.discord.token",
        "ref": { "source": "env", "provider": "default", "id": "DISCORD_BOT_TOKEN" }
      }
    ]'
    ```

    ```bash
    openclaw config set --batch-file ./config-set.batch.json --dry-run
    ```

    批量文件大小限制为 8 MiB。

  </Tab>
</Tabs>

<Warning>
在不支持的运行时可变表面上会拒绝 SecretRef 赋值（例如 `hooks.token`、`commands.ownerDisplaySecret`、Discord 线程绑定 webhook token，以及 WhatsApp creds JSON）。参见 [SecretRef 凭据表面](/reference/secretref-credential-surface)。
</Warning>

批量解析始终使用批量负载（`--batch-json`/`--batch-file`）作为真实来源；`--strict-json` / `--json` 不会改变批量解析行为。

JSON 路径/值模式也可直接用于 SecretRef 和 provider：

```bash
openclaw config set channels.discord.token \
  '{"source":"env","provider":"default","id":"DISCORD_BOT_TOKEN"}' \
  --strict-json

openclaw config set secrets.providers.vaultfile \
  '{"source":"file","path":"/etc/openclaw/secrets.json","mode":"json"}' \
  --strict-json
```

### Provider 构建器标志

Provider 构建器目标必须使用 `secrets.providers.<alias>` 作为路径。

<AccordionGroup>
  <Accordion title="通用标志">
    - `--provider-source <env|file|exec>`
    - `--provider-timeout-ms <ms>`（`file`、`exec`）

  </Accordion>
  <Accordion title="环境变量 provider（--provider-source env）">
    - `--provider-allowlist <ENV_VAR>`（可重复）

  </Accordion>
  <Accordion title="文件 provider（--provider-source file）">
    - `--provider-path <path>`（必需）
    - `--provider-mode <singleValue|json>`
    - `--provider-max-bytes <bytes>`
    - `--provider-allow-insecure-path`

  </Accordion>
  <Accordion title="执行 provider（--provider-source exec）">
    - `--provider-command <path>`（必需）
    - `--provider-arg <arg>`（可重复）
    - `--provider-no-output-timeout-ms <ms>`
    - `--provider-max-output-bytes <bytes>`
    - `--provider-json-only`
    - `--provider-env <KEY=VALUE>`（可重复）
    - `--provider-pass-env <ENV_VAR>`（可重复）
    - `--provider-trusted-dir <path>`（可重复）
    - `--provider-allow-insecure-path`
    - `--provider-allow-symlink-command`

  </Accordion>
</AccordionGroup>

强化版 exec provider 示例：

```bash
openclaw config set secrets.providers.vault \
  --provider-source exec \
  --provider-command /usr/local/bin/openclaw-vault \
  --provider-arg read \
  --provider-arg openai/api-key \
  --provider-json-only \
  --provider-pass-env VAULT_TOKEN \
  --provider-trusted-dir /usr/local/bin \
  --provider-timeout-ms 5000
```

## `config patch`

粘贴或通过管道输入一个类似配置的 JSON5 补丁，而不是运行许多基于路径的 `config set` 命令。对象会递归合并；数组和标量值会替换目标；`null` 会删除目标路径。

```bash
openclaw config patch --file ./openclaw.patch.json5 --dry-run
openclaw config patch --file ./openclaw.patch.json5
```

补丁文件大小限制为 8 MiB。通过管道 `--stdin` 输入的补丁限制为 1 MiB。

将补丁通过 stdin 传递用于远程设置脚本：

```bash
ssh user@gateway-host 'openclaw config patch --stdin --dry-run' < ./openclaw.patch.json5
ssh user@gateway-host 'openclaw config patch --stdin' < ./openclaw.patch.json5
```

补丁示例：

```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "socket",
      botToken: { source: "env", provider: "default", id: "SLACK_BOT_TOKEN" },
      appToken: { source: "env", provider: "default", id: "SLACK_APP_TOKEN" },
      groupPolicy: "open",
      requireMention: false,
    },
    discord: {
      enabled: true,
      token: { source: "env", provider: "default", id: "DISCORD_BOT_TOKEN" },
      dmPolicy: "disabled",
      dm: { enabled: false },
      groupPolicy: "allowlist",
    },
  },
  agents: {
    defaults: {
      model: { primary: "openai/gpt-5.6-sol" },
      models: {
        "openai/gpt-5.6-sol": { params: { fastMode: true } },
      },
    },
  },
}
```

当对象或数组必须精确设置为所提供的值，而不是递归补丁时，请使用 `--replace-path <path>`：

```bash
openclaw config patch --file ./discord.patch.json5 --replace-path 'channels.discord.guilds["123"].channels'
```

`--dry-run` 会运行 schema 和 SecretRef 可解析性检查，但不会写入。默认情况下，dry-run 会跳过基于 Exec 的 SecretRef；当你有意希望 dry-run 执行 provider 命令时，请添加 `--allow-exec`。

## 试运行

`--dry-run` 会在不写入 `openclaw.json` 的情况下验证更改。可用于 `config set`、`config patch` 和 `config unset`。

```bash
openclaw config set channels.discord.token \
  --ref-provider default \
  --ref-source env \
  --ref-id DISCORD_BOT_TOKEN \
  --dry-run \
  --json

openclaw config set channels.discord.token \
  --ref-provider vault \
  --ref-source exec \
  --ref-id discord/token \
  --dry-run \
  --allow-exec
```

<AccordionGroup>
  <Accordion title="试运行行为">
    - Builder 模式：对已更改的 refs/providers 运行 SecretRef 可解析性检查。
    - JSON 模式（`--strict-json`、`--json` 或批处理模式）：运行 schema 验证以及 SecretRef 可解析性检查。
    - 策略验证会针对变更后的完整配置进行，因此对父对象的写入（例如将 `hooks` 设为对象）无法绕过不支持的作用域验证。
    - 默认会跳过 Exec SecretRef 检查，以避免命令副作用；传入 `--allow-exec` 可启用（这可能会执行 provider 命令）。`--allow-exec` 仅在试运行时可用，且在没有 `--dry-run` 时会报错。

  </Accordion>
  <Accordion title="--dry-run --json 字段">
    - `ok`：试运行是否通过
    - `operations`：评估的赋值次数
    - `checks`：是否运行了 schema/可解析性检查
    - `checks.resolvabilityComplete`：可解析性检查是否完整执行（跳过 exec refs 时为 false）
    - `refsChecked`：试运行期间实际解析的 ref 数量
    - `skippedExecRefs`：由于未设置 `--allow-exec` 而跳过的 exec refs 数量
    - `errors`：当 `ok=false` 时返回的结构化缺失路径、schema 或可解析性失败信息

  </Accordion>
</AccordionGroup>

### JSON 输出结构

```json5
{
  ok: boolean,
  operations: number,
  configPath: string,
  inputModes: ["value" | "json" | "builder" | "unset", ...],
  checks: {
    schema: boolean,
    resolvability: boolean,
    resolvabilityComplete: boolean,
  },
  refsChecked: number,
  skippedExecRefs: number,
  errors?: [
    {
      kind: "missing-path" | "schema" | "resolvability" | "model",
      message: string,
      ref?: string, // 可解析性错误时存在
    },
  ],
}
```

<Tabs>
  <Tab title="成功示例">
    ```json
    {
      "ok": true,
      "operations": 1,
      "configPath": "~/.openclaw/openclaw.json",
      "inputModes": ["builder"],
      "checks": {
        "schema": false,
        "resolvability": true,
        "resolvabilityComplete": true
      },
      "refsChecked": 1,
      "skippedExecRefs": 0
    }
    ```
  </Tab>
  <Tab title="失败示例">
    ```json
    {
      "ok": false,
      "operations": 1,
      "configPath": "~/.openclaw/openclaw.json",
      "inputModes": ["builder"],
      "checks": {
        "schema": false,
        "resolvability": true,
        "resolvabilityComplete": true
      },
      "refsChecked": 1,
      "skippedExecRefs": 0,
      "errors": [
        {
          "kind": "resolvability",
          "message": "Error: Environment variable \"MISSING_TEST_SECRET\" is not set.",
          "ref": "env:default:MISSING_TEST_SECRET"
        }
      ]
    }
    ```
  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="如果试运行失败">
    - `config schema validation failed`：更改后的配置结构无效；请修复路径/值或 provider/ref 对象结构。
    - `Config policy validation failed: unsupported SecretRef usage`：请将该凭据改回明文/字符串输入；仅在受支持的字段上使用 SecretRef。
    - `SecretRef assignment(s) could not be resolved`：所引用的 provider/ref 当前无法解析（缺少环境变量、文件指针无效、exec provider 失败，或 provider/source 不匹配）。
    - `model reference validation failed`：更改后的文本模型主模型或备用模型未知；运行 `openclaw models list` 并选择一个可用模型。
    - `Dry run note: skipped <n> exec SecretRef resolvability check(s)`：如果你需要 exec 可解析性验证，请使用 `--allow-exec` 重新运行。
    - 对于批处理模式，请修复失败项后再次运行 `--dry-run`，然后再写入。

  </Accordion>
</AccordionGroup>

## 应用更改

每次成功执行 `config set` / `config patch` / `config unset` 后，CLI 都会打印以下三种提示之一，以便你知道网关是否需要重启：

| 提示                                                | 含义                                   |
| --------------------------------------------------- | -------------------------------------- |
| `Restart the gateway to apply.`                     | 已更改的路径需要完全重启。             |
| `Change will apply without restarting the gateway.` | 热重载会自动应用更改。                  |
| `No gateway restart needed.`                        | 没有影响运行时的内容发生变化。          |

对 `plugins.entries`（或其任何子路径）的写入始终需要重启，因为 CLI 无法证明每个插件的重载元数据都已加载。

## 写入安全

`openclaw config set` 和其他 OpenClaw 自有的配置写入器会在提交到磁盘之前验证整个变更后的配置。如果新负载未通过 schema 验证，或者看起来像破坏性的覆盖，活动配置会保持不变，而被拒绝的负载会以 `openclaw.json.rejected.*` 的形式保存在其旁边。

OpenClaw 自有的写入会将 JSON5 重新序列化为标准 JSON。当源内容包含注释时，写入器会在移除它们之前立即发出警告；如果保留注释很重要，请使用直接编辑器。

<Warning>
活动配置路径必须是普通文件。通过符号链接的 `openclaw.json` 布局不支持写入；请改用 `OPENCLAW_CONFIG_PATH` 直接指向真实文件。
</Warning>

对于小改动，优先使用 CLI 写入：

```bash
openclaw config set gateway.reload.mode hybrid --dry-run
openclaw config set gateway.reload.mode hybrid
openclaw config validate
```

如果写入被拒绝，请检查已保存的负载并修复整个配置结构：

```bash
CONFIG="$(openclaw config file)"
ls -lt "$CONFIG".rejected.* 2>/dev/null | head
openclaw config validate
```

仍然允许直接编辑器写入，但运行中的 Gateway 会将其视为不受信任，直到它们通过验证。无效的直接编辑会导致启动失败，或在热重载时被跳过；Gateway 不会重写 `openclaw.json`。运行 `openclaw doctor --fix` 可修复带前缀/被覆盖的配置，或恢复上一个已知可用的副本。参见 [Gateway 故障排查](/gateway/troubleshooting#gateway-rejected-invalid-config)。

整文件恢复仅保留给 doctor 修复使用。插件 schema 变更或 `minHostVersion` 不匹配会继续报错，而不会回滚无关的用户设置，例如模型、提供方、认证配置文件、渠道、gateway 暴露、工具、内存、浏览器或 cron 配置。

## Fix loop

After `openclaw config validate` passes, use the local TUI to let an embedded agent compare the current configuration with the documentation, while validating each change in the same terminal:

```bash
openclaw chat
```

In the TUI, a leading `!` runs a local shell command as-is (the first time you use it in each session, you will first see a confirmation prompt):

```text
!openclaw config file
!openclaw docs gateway auth token secretref
!openclaw config validate
!openclaw doctor
```

<Steps>
  <Step title="Compare with the documentation">
    Ask the agent to compare your current configuration with the relevant documentation pages and suggest the smallest possible fix.
  </Step>
  <Step title="Apply targeted edits">
    Use `openclaw config set` or `openclaw configure` to apply targeted changes.
  </Step>
  <Step title="Re-validate">
    Re-run `openclaw config validate` after each change.
  </Step>
  <Step title="Use doctor for runtime issues">
    If validation passes but the runtime is still unhealthy, run `openclaw doctor` or `openclaw doctor --fix` to get migration and repair help.
  </Step>
</Steps>

## 相关内容

- [CLI 参考](/cli)
- [配置](/gateway/configuration)
