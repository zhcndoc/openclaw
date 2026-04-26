---
summary: "openclaw config 的 CLI 参考（get/set/unset/file/schema/validate）"
read_when:
  - 你想以非交互方式读取或编辑配置
title: "配置"
---

# `openclaw config`

用于在 `openclaw.json` 中进行非交互式编辑的配置辅助工具：按路径获取/设置/取消设置/文件/模式/验证
值，并打印当前生效的配置文件。直接运行而不带子命令可
打开配置向导（与 `openclaw configure` 相同）。

根选项：

- `--section <section>`：当不带子命令运行 `openclaw config` 时，可重复的引导设置部分过滤器

支持的引导部分：

- `workspace`
- `model`
- `web`
- `gateway`
- `daemon`
- `channels`
- `plugins`
- `skills`
- `health`

## 示例

```bash
openclaw config file
openclaw config --section model
openclaw config --section gateway --section daemon
openclaw config schema
openclaw config get browser.executablePath
openclaw config set browser.executablePath "/usr/bin/google-chrome"
openclaw config set agents.defaults.heartbeat.every "2h"
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN
openclaw config set secrets.providers.vaultfile --provider-source file --provider-path /etc/openclaw/secrets.json --provider-mode json
openclaw config unset plugins.entries.brave.config.webSearch.apiKey
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN --dry-run
openclaw config validate
openclaw config validate --json
```

### `config schema`

将生成的 `openclaw.json` JSON 模式以 JSON 格式打印到 stdout。

包含内容：

- 当前根配置模式，加上用于编辑器工具的根 `$schema` 字符串字段
- Control UI 使用的字段 `title` 和 `description` 文档元数据
- 当存在匹配的字段文档时，嵌套对象、通配符 (`*`) 和数组项 (`[]`) 节点继承相同的 `title` / `description` 元数据
- 当存在匹配的字段文档时，`anyOf` / `oneOf` / `allOf` 分支也继承相同的文档元数据
- 当可以加载运行时清单时，尽最大努力提供实时插件 + 通道模式元数据
- 即使当前配置无效，也提供干净的后备模式

相关运行时 RPC：

- `config.schema.lookup` 返回一个标准化的配置路径，包含浅层模式节点（`title`、`description`、`type`、`enum`、`const`、常见边界）、匹配的 UI 提示元数据和直接子项摘要。用于 Control UI 或自定义客户端中的路径范围钻取。

```bash
openclaw config schema
```

当你想用其他工具检查或验证它时，可以将其通过管道输出到文件：

```bash
openclaw config schema > openclaw.schema.json
```

### 路径

路径使用点号或括号符号表示法：

```bash
openclaw config get agents.defaults.workspace
openclaw config get agents.list[0].id
```

使用代理列表索引定位具体代理：

```bash
openclaw config get agents.list
openclaw config set agents.list[1].tools.exec.node "node-id-or-name"
```

## 值

值尽可能按 JSON5 解析；否则将视为字符串。使用 `--strict-json` 强制 JSON5 解析。`--json` 仍作为旧别名兼容支持。

```bash
openclaw config set agents.defaults.heartbeat.every "0m"
openclaw config set gateway.port 19001 --strict-json
openclaw config set channels.whatsapp.groups '["*"]' --strict-json
```

`config get <path> --json` 将原始值打印为 JSON，而不是终端格式化的文本。

对象赋值默认会用目标路径替换目标值。受保护的 map/list 路径通常用于保存用户添加的条目，例如 `agents.defaults.models`、`models.providers`、`models.providers.<id>.models`、`plugins.entries` 和 `auth.profiles`，如果替换会移除现有条目，则会拒绝，除非你传入 `--replace`。

添加条目到这些 map 时使用 `--merge`：

```bash
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
openclaw config set models.providers.ollama.models '[{"id":"llama3.2","name":"Llama 3.2"}]' --strict-json --merge
```

只有当你明确希望提供的值成为完整目标值时，才使用 `--replace`。

## `config set` 模式

`openclaw config set` 支持四种赋值方式：

1. 值模式：`openclaw config set <path> <value>`
2. SecretRef 构建器模式：

```bash
openclaw config set channels.discord.token \
  --ref-provider default \
  --ref-source env \
  --ref-id DISCORD_BOT_TOKEN
```

3. Provider 构建器模式（仅适用于 `secrets.providers.<alias>` 路径）：

```bash
openclaw config set secrets.providers.vault \
  --provider-source exec \
  --provider-command /usr/local/bin/openclaw-vault \
  --provider-arg read \
  --provider-arg openai/api-key \
  --provider-timeout-ms 5000
```

4. 批量模式（`--batch-json` 或 `--batch-file`）：

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

策略说明：

- 在不支持的运行时可变表面上拒绝 SecretRef 赋值（例如 `hooks.token`、`commands.ownerDisplaySecret`、Discord 线程绑定 webhook 令牌和 WhatsApp 凭据 JSON）。参见 [SecretRef 凭据表面](/reference/secretref-credential-surface)。

批量解析始终使用批量负载（`--batch-json`/`--batch-file`）作为真实来源。
`--strict-json` / `--json` 不会更改批量解析行为。

JSON 路径/值模式仍然支持 SecretRefs 和 providers：

```bash
openclaw config set channels.discord.token \
  '{"source":"env","provider":"default","id":"DISCORD_BOT_TOKEN"}' \
  --strict-json

openclaw config set secrets.providers.vaultfile \
  '{"source":"file","path":"/etc/openclaw/secrets.json","mode":"json"}' \
  --strict-json
```

## Provider 构建器标志

Provider 构建器目标必须使用 `secrets.providers.<alias>` 作为路径。

通用标志：

- `--provider-source <env|file|exec>`
- `--provider-timeout-ms <ms>`（`file`、`exec`）

Env provider（`--provider-source env`）：

- `--provider-allowlist <ENV_VAR>`（可重复）

File provider（`--provider-source file`）：

- `--provider-path <path>`（必需）
- `--provider-mode <singleValue|json>`
- `--provider-max-bytes <bytes>`
- `--provider-allow-insecure-path`

Exec provider（`--provider-source exec`）：

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

## 模拟运行

使用 `--dry-run` 可在不写入 `openclaw.json` 的情况下验证更改。

```bash
openclaw config set channels.discord.token \
  --ref-provider default \
  --ref-source env \
  --ref-id DISCORD_BOT_TOKEN \
  --dry-run

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

模拟运行行为：

- 构建器模式：运行更改后的 refs/providers 的 SecretRef 可解析性检查。
- JSON 模式（`--strict-json`、`--json` 或批量模式）：运行 schema 验证以及 SecretRef 可解析性检查。
- 策略验证也会针对已知不支持的 SecretRef 目标表面运行。
- 策略检查评估完整的变更后配置，因此父对象写入（例如将 `hooks` 设置为对象）无法绕过不支持表面的验证。
- 默认情况下，模拟运行期间会跳过 Exec SecretRef 检查以避免命令副作用。
- 将 `--allow-exec` 与 `--dry-run` 一起使用以选择加入 exec SecretRef 检查（这可能会执行提供者命令）。
- `--allow-exec` 仅用于模拟运行，如果不带 `--dry-run` 使用则会报错。

`--dry-run --json` 打印机器可读的报告：

- `ok`：dry-run 是否通过
- `operations`：评估的赋值操作数量
- `checks`：是否运行了 schema/可解析性检查
- `checks.resolvabilityComplete`：可解析性检查是否运行完成（当 exec refs 被跳过时为 false）
- `refsChecked`：dry-run 期间实际解析的 refs 数量
- `skippedExecRefs`：因未设置 `--allow-exec` 而跳过的 exec refs 数量
- `errors`：当 `ok=false` 时的结构化 schema/可解析性失败信息

### JSON 输出格式

```json5
{
  ok: boolean,
  operations: number,
  configPath: string,
  inputModes: ["value" | "json" | "builder", ...],
  checks: {
    schema: boolean,
    resolvability: boolean,
    resolvabilityComplete: boolean,
  },
  refsChecked: number,
  skippedExecRefs: number,
  errors?: [
    {
      kind: "schema" | "resolvability",
      message: string,
      ref?: string, // 针对可解析性错误时存在
    },
  ],
}
```

成功示例：

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

失败示例：

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

如果模拟运行失败：

- `config schema validation failed`：变更后的配置形状无效；修复路径/值或 provider/ref 对象形状。
- `Config policy validation failed: unsupported SecretRef usage`：将该凭据移回明文/字符串输入，并仅在支持的表面上保留 SecretRefs。
- `SecretRef assignment(s) could not be resolved`：引用的 provider/ref 当前无法解析（缺少环境变量、无效文件指针、exec 提供者失败或提供者/来源不匹配）。
- `Dry run note: skipped <n> exec SecretRef resolvability check(s)`：模拟运行跳过了 exec refs；如果需要 exec 可解析性验证，请使用 `--allow-exec` 重新运行。
- 对于批量模式，在写入之前修复失败的条目并重新运行 `--dry-run`。

## Write safety

`openclaw config set` 和其他 OpenClaw 拥有的配置写入器会在提交到磁盘之前验证完整的变更后配置。
如果新负载未通过 schema 验证或看起来会造成破坏性覆盖，活动配置将保持不变，
而被拒绝的负载会作为 `openclaw.json.rejected.*` 保存到其旁边。
活动配置路径必须是普通文件。符号链接形式的 `openclaw.json`
布局不支持写入；请改用 `OPENCLAW_CONFIG_PATH` 直接指向真实文件。

小幅编辑优先使用 CLI 写入：

```bash
openclaw config set gateway.reload.mode hybrid --dry-run
openclaw config set gateway.reload.mode hybrid
openclaw config validate
```

如果写入被拒绝，请检查已保存的负载并修复完整配置结构：

```bash
CONFIG="$(openclaw config file)"
ls -lt "$CONFIG".rejected.* 2>/dev/null | head
openclaw config validate
```

仍然允许直接编辑器写入，但运行中的 Gateway 会在它们通过验证之前将其视为不受信任。在启动或热重载期间，无效的直接编辑可以从最近一次已知良好的备份中恢复。参见
[Gateway 故障排查](/gateway/troubleshooting#gateway-restored-last-known-good-config)。

## 子命令

- `config file`: 打印活动配置文件路径（从 `OPENCLAW_CONFIG_PATH` 或默认位置解析）。该路径应指向普通文件，而不是符号链接。

修改后请重启网关。

## 验证

在不启动网关的情况下，根据当前活动的 schema 验证当前配置。

```bash
openclaw config validate
openclaw config validate --json
```

在 `openclaw config validate` 通过之后，你可以使用本地 TUI，让一个嵌入式代理在你从同一终端验证每个更改时，将当前配置与文档进行比较：

如果验证已经失败，请先运行 `openclaw configure` 或 `openclaw doctor --fix`。`openclaw chat` 不会绕过无效配置保护。

```bash
openclaw chat
```

然后在 TUI 中：

```text
!openclaw config file
!openclaw docs gateway auth token secretref
!openclaw config validate
!openclaw doctor
```

典型的修复循环：

- 让代理将你当前的配置与相关文档页面进行比较，并建议最小的修复方案。
- 使用 `openclaw config set` 或 `openclaw configure` 进行有针对性的编辑。
- 每次更改后重新运行 `openclaw config validate`。
- 如果验证通过但运行时仍不健康，请运行 `openclaw doctor` 或 `openclaw doctor --fix` 获取迁移和修复帮助。

## 相关

- [CLI 参考](/cli)
- [配置](/gateway/configuration)
