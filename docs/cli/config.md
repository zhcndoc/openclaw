---
summary: "CLI 参考：`openclaw config`（get/set/patch/unset/file/schema/validate）"
read_when:
  - "你想以非交互方式读取或编辑配置"
  - "您在外部管理配置并希望 OpenClaw 保持不变"
title: "配置"
sidebarTitle: "配置"
---

`openclaw.json` 的非交互式帮助程序：get/set/patch/unset 按路径的值、打印架构、验证或打印活动文件路径。运行 `openclaw config`（不带子命令）以打开与 `openclaw configure` 相同的引导向导。

`config set`、`config patch` 和 `config unset` 要求停止本地网关。这些命令在发布文件及其数据库元数据时拥有独占的状态所有权。通过其服务所有者停止网关，等待其退出，然后重新运行该命令。

<Note>
当 `OPENCLAW_CONFIG_READONLY=1` 或 `OPENCLAW_NIX_MODE=1` 时，OpenClaw 将 `openclaw.json` 视为不可变。只读命令（`config get`、`config file`、`config schema`、`config validate`）仍然有效；配置编写者拒绝。
</Note>

## <a id="externally-managed-config"></a> 外部管理配置

当部署系统管理您的配置时，在网关和任何 OpenClaw CLI 进程的环境中设置 `OPENCLAW_CONFIG_READONLY=1`：

```bash
export OPENCLAW_CONFIG_READONLY=1
openclaw config validate
openclaw gateway run
```

对于服务或容器，在其服务环境或容器定义中设置变量。这是主机环境开关，而不是 `openclaw.json` 字段。不要在配置 `env` 或 `env.vars` 中设置 `OPENCLAW_CONFIG_READONLY`。 `env.vars` 中的条目将被忽略，包括大小写不同的拼写；平面 `env` 密钥不是有效配置。配置重新加载无法启用、禁用或更改主机选择的只读模式。仅主机值 `1` 启用此开关。现有的 `OPENCLAW_NIX_MODE` 行为保持不变。

配置写入被阻止，包括设置、载入、Doctor 配置修复、插件 install/update/uninstall/enable/disable 和变异 `openclaw update` 流。启动派生的默认值仅保留运行时。通过外部部署系统更改配置，然后让网关重新加载它或根据需要重新启动网关。运行时状态仍然需要可写的`OPENCLAW_STATE_DIR`。

Doctor的`--fix --non-interactive`通行证，包括官方Docker映像的启动通行证，在此模式下仍然修复可写的SQLite、会话和插件状态。待处理的配置修复将打印为经过编辑的合并补丁，以应用到外部部署源中；已安装的配置及其包含内容保持不变。即使可选修复待决，有效的配置也允许网关启动。如果旧的或无效的配置阻止启动，Doctor 将以非零值退出并命名所需的编辑。状态模式迁移在配置修复之前运行，因此插件和会话迁移可以使用当前模式；恢复到旧映像时保留匹配的升级前状态备份。

`OPENCLAW_CONFIG_READONLY=1` 使用通用的外部管理配置消息，并且不启用 Nix 特定的安装或服务行为。 `OPENCLAW_NIX_MODE=1` 继续暗示不可变的配置，即使 `OPENCLAW_CONFIG_READONLY` 未设置或 `0` 也是如此。对于 Nix 安装，请编辑 Nix 源；参见 [Nix](/install/nix)。

## <a id="root-options"></a> 根选项

<ParamField path="--section <section>" 类型 = "字符串">
  可复用的引导式设置部分筛选器，在不带子命令运行 `openclaw config` 时使用。
</ParamField>

引导式部分：`workspace`、`model`、`web`、`gateway`、`daemon`、`channels`、`plugins`、`skills`、`health`。

## <a id="examples"></a> 示例

```bash
openclaw config file
openclaw config file --json
openclaw config --section model
openclaw config --section gateway --section daemon
openclaw config schema
openclaw config schema --json
openclaw config get browser.executablePath
openclaw config set browser.executablePath "/usr/bin/google-chrome"
openclaw config set browser.profiles.work '{"cdpPort":18801,"executablePath":"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}' --strict-json --merge
openclaw config set agents.defaults.heartbeat.every "2h"
openclaw config set logging.audit.executionIdentity true
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

### <a id="paths"></a> 路径

点号或方括号表示法。在 shell 示例中请将方括号路径加引号，这样 zsh 不会展开 `[0]`：

```bash
openclaw config get agents.defaults.workspace
openclaw config get agents.entries.main
openclaw config get agents.entries
openclaw config set 'agents.entries.work.tools.exec.node' "node-id-or-name"
```

对于丢失的容器，点数字段使用配置模式来区分数组和映射。使用 `[0]` 作为显式数组索引，或使用 `["0"]` 作为数字映射键。所有写入都会在保存之前验证生成的配置。

首选 `agents.entries.<id>` 路径进行代理编辑。旧版 `agents.list[0]` 语法和整个列表输入仍然适用于 `set`、`patch` 和 `unset`；写入保留当前的密钥名册。索引编辑使用当前名册顺序。在批次内，提交的列表在后续的键入编辑中保持其顺序，包括代理 ID 为数字字符串时。现有的名册删除和 `$include` 所有权保护仍然适用。

当旧名册在根配置文件中扩展单代理安装时，写入退役其 `default` 标记并保留现有代理对显式所有者的职责。明确创作的 `ownership: "explicit"` 不能与旧版 `default: true` 标记组合。

对于根文件写入，更改 `session.store` 会清除复制的 `agents.defaults.sessionStore.agentId`，因为该所有者属于先前的存储。要分配目标存储的所有者，请在同一批次中显式设置该所有者路径。不相关的写入保留所有者，包括当 `session.store` 未设置并且每个代理默认存储适用时。清除所有者的已提交写入会打印一条警告，命名密钥和存储更改。

如果旧版本已删除所有者，Doctor 会检查保留的配置备份，并提供使用相同的 `session.store` 值恢复最新的所有者。恢复需要交互式确认，因为删除可能是故意的；无人值守的医生运行显示恢复命令。如果没有剩余可用备份，旧会话结果将命名为 `agents.defaults.sessionStore.agentId`，以便您可以显式分配所有者。

### `config get`

从编辑的配置快照中读取值（秘密永远不会打印）。 `--json` 打印与 JSON 相同的编辑值；否则，strings/numbers/booleans 直接打印，objects/arrays 按格式 JSON 打印。

只传递一个配置路径。额外的参数，包括空的带引号的参数 （`""`），将被拒绝；它们不会抑制后续选项的验证。

架构有效但未设置的可创作路径说明运行时默认值适用并建议 `openclaw config set`。对于自动管理的元数据，例如 `meta.lastTouchedVersion`、`meta.migrations.modelPolicyAllowlist` 和 `meta.migrations.utilityModelSeparation`，该消息会解释 OpenClaw 管理配置写入时的值。读取其未设置的父路径（`meta` 或 `meta.migrations`）给出相同的解释，而不是拒绝设置命令。未知路径表明 `openclaw config schema`。对于 `--json`，未设置和未知路径在 stdout 上使用标准 [CLI JSON 故障包络 ](/cli#json-failures) 并以状态 1 退出。如果没有 `--json`，诊断将保留在 stderr 上。

开放式参数包内的嵌套路径（例如 `agents.defaults.params.custom.nested`）即使在设置之前也是架构有效的。这并不确认提供者支持该参数。

显式 `null`、`false`、`0` 和空字符串在两种模式下都保持可读值； `--json` 保留它们的类型。没有运行时值的可选字段将报告为未设置。

```bash
openclaw config get browser.executablePath
openclaw config get agents.defaults.model --json
```

### `config file`

打印当前激活的配置文件路径，该路径由 `OPENCLAW_CONFIG_PATH` 或默认位置解析得到。该路径指向一个普通文件，而不是符号链接；请参见 [写入安全](#write-safety)。

使用 `--json` 时，stdout 会包含一个对象，其中包含解析后的路径，键名为 `path`。

### `config schema`

将 `openclaw.json` 的生成 JSON schema 打印到 stdout。

<AccordionGroup>
  <Accordion id="what-it-includes" title="它包括什么">
    - 当前根配置 schema，以及一个供编辑器工具使用的根 `$schema` 字符串字段。
    - `title` ／ `description` 文档元数据，由 Control UI 使用。
    - 当匹配到字段文档时，嵌套对象、通配符（`*`）和数组项（`[]`）节点会继承相同的 `title` ／ `description` 元数据。
    - `anyOf` ／ `oneOf` ／ `allOf` 分支也会继承相同的文档元数据。
    - 在运行时清单可加载时，尽力提供实时插件 + 通道 schema 元数据。
    - 即使当前配置无效，也会提供一个干净的回退 schema。

  </Accordion>
  <Accordion id="related-runtime-rpc" title="相关运行时 RPC">
    `config.schema.lookup` 会返回一个规范化的配置路径，以及一个浅层 schema 节点（`title`、`description`、`type`、`enum`、`const`、通用边界），匹配的 UI 提示元数据和直接子项摘要。可将其用于 Control UI 中按路径范围的下钻，或供自定义客户端使用。
  </Accordion>
</AccordionGroup>

```bash
openclaw config schema
openclaw config schema --json
openclaw config schema > openclaw.schema.json
```

两种模式下 schema 均为 JSON。`--json` 作为明确的机器输出写法接受，并确保 stdout 仅用于输出 schema 文档。

### `config validate`

`config set`、`config patch` 和 `config unset` 的架构拒绝解释了受影响的设置并确认没有保存任何设置。更正报告的值或使用 `openclaw config schema` 检查支持的设置，然后重试。这些拒绝仍然以状态 1 退出。需要更正而不更改文件的显式验证报告设置； `config validate --json` 保留脚本的 `valid: false`、`error` 和 `issues` 字段。

配置读取失败会命名正在读取的文件并保留底层错误。解决报告的文件访问或运行时问题，然后重试；仅读取失败并不意味着设置需要修复。

人工验证诊断引用文字记录键，例如 `agents.defaults.models["provider/model.v1"].alias`，而不是将键内的点显示为嵌套遍历。数字数组位置使用括号，例如 `agents.entries.main.skills[0]`。 `config validate --json` 中的 `issues[].path` 字段保留其现有的点连接表示形式。

在不启动网关的情况下根据活动模式验证当前配置。它还检查每个注册表声明的 SecretRef 的 provider/source 兼容性，包括禁用的插件或通道配置。此严格命令可以报告不活动的不匹配，该不匹配不会阻止正常的网关启动，其中 SecretRef 分辨率仍然限于有效的活动表面。

架构验证后，它使用与启动时相同的非执行信任检查来检查每个配置的手动执行提供程序的命令路径：文件存在、符号链接、受信任目录、权限、所有权和 Windows ACL 可用性。 `config set`、`config patch` 和 `config unset` 仅将这些检查应用于操作更改或引用的提供程序（包括在试运行期间）。替换 `secrets` 或 `secrets.providers` 集合会检查每个剩余的提供程序。不相关的非活动提供程序不会阻止对该提供程序进行有针对性的修复或删除。

路径验证不执行提供程序或验证其输出。通过它并不能保证秘密解决成功； exec 空运行需要 `--allow-exec` 单独测试。

```bash
openclaw config validate
openclaw config validate --json
```

<Note>
exec-provider 检查检查 CLI 运行的主机的文件系统。在网关主机本身（或在具有匹配命令路径、所有权和 ACL 的主机上）运行 `config validate`。路径和权限可以在验证后更改；启动在执行之前再次检查它们。
</Note>

<Note>
如果验证已经失败，请先运行 `openclaw configure` 或 `openclaw doctor --fix`。`openclaw chat` 不会绕过无效配置保护。
</Note>

Provider 和 runtime 的 `params` 包有意被类型化为 `Record<string, unknown>`，因为受支持的键和值由其所属方定义。`openclaw config validate` 可以验证容器及整体配置结构，但无法对特定 provider 的参数名称或值进行类型检查。通过验证并不能证明某个参数受支持；请查阅 provider 文档，并在选定的 runtime 和 provider 上验证其行为。

## <a id="values"></a> 值

如果可能，值解析为 JSON5；否则它们将被视为原始字符串。使用 `--strict-json` 要求标准 JSON 且没有字符串回退（JSON5- 仅语法，例如注释、尾随逗号或不带引号的键将被拒绝）。 `--json` 是 `config set` 上 `--strict-json` 的旧别名。

```bash
openclaw config set agents.defaults.heartbeat.every "0m"
openclaw config set gateway.port 19001 --strict-json
openclaw config set channels.whatsapp.groups '{"*":{"requireMention":true}}' --strict-json
```

对于难以在 shell 中引用的结构化值，请将配置形状的 JSON5 对象放入文件中并使用 [`config patch --file <path> --dry-run`](/cli/config#config-patch)。该文件包含配置键及其值，而不是裸数组。

`config get <path> --json` 会将脱敏后的值以 JSON 格式打印，而不是打印为终端格式化文本。

当模型使用字符串简写时，设置其 `fallbacks` 或支持的工具模型 `timeoutMs` 会将该字符串保留为 `primary`。这也适用于聊天 `/config set`。显式设置 `primary` 会替换主值，设置整个模型仍然会替换整个值。

当写入更改 `agents.defaults.model` 或每个代理 `agents.entries.*.model` 时，OpenClaw 在写入之前通过配置的目录和所选提供程序的模型解析器解析每个更改的主要或后备。即使精选的选择器中不存在，也接受提供商支持的精确 `provider/model` 引脚；验证不会替换所选模型。未知模型引用将被拒绝，而不更改活动配置。新创建的每个代理引用的拒绝包括输入的值和解析器原因；继承的价值观和环境扩展的细节仍然经过编辑。运行 `openclaw models list` 浏览选择器，或检查提供商的文档以获取确切的模型 ID。验证成功并不证明您的帐户可以调用该模型。 [`openclaw models set`](/cli/models#common-commands) 故意对相同的设置更加宽松：它保存本地目录无法确认的模型并打印警告而不是拒绝写入。

<Note>
对象赋值默认会用目标路径替换。通常包含用户添加条目的受保护路径会拒绝会删除现有条目的替换，除非你传入 `--replace`：`agents.defaults.models`、`agents.entries`、`models.providers`、`models.providers.<id>`、`models.providers.<id>.models`、`plugins.entries` 和 `auth.profiles`。
</Note>

在向这些 map 添加条目时使用 `--merge`：

```bash
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
openclaw config set models.providers.ollama.models '[{"id":"llama3.2","name":"Llama 3.2"}]' --strict-json --merge
```

仅当所提供的值应有意成为完整的目标值时，才使用 `--replace`。

### <a id="conditional-writes"></a> 条件写入

当自动化必须更新一个创作路径（仅当自调用者上次观察它以来该路径未发生更改时），才使用条件期望：

```bash
openclaw config set gateway.port 19001 --strict-json --expect-current-json 18789
openclaw config set gateway.port 19001 --strict-json --expect-current-absent
```

`--expect-current-json <json>` 使用严格的 JSON 并通过 JSON 类型和结构来比较值。 `null` 是一个创作值，因此不满足 `--expect-current-absent`。该比较使用包含和环境替换之后、应用运行时默认值之前的有效创作配置。

如果期望不匹配，则不会保存任何设置。在重试之前读取当前配置并查看预期值；重复同样不匹配的期望不会成功。

这两个期望标志是互斥的。它们仅适用于单个 `config set` 操作，需要直接的非重定向配置路径，并且不能与批处理模式或 `--dry-run` 结合使用。如果输入或名册解析写入与调用者请求的路径不同的路径（例如同级 `*Ref` 路径），则命令将以状态 1 退出，而不是重新定位期望。不匹配以状态 1 退出，不写入任何内容，并且不打印预期值或当前值。 OpenClaw 的配置快照防护仍然拒绝期望检查和最终文件替换之间的后续竞争。

## <a id="config-set-modes"></a> `config set` 模式

<Tabs>
  <Tab id="value-mode" title="价值模式">
    ```bash
    openclaw config set <path> <value>
    ```
  </Tab>
  <Tab id="secretref-builder-mode" title="SecretRef 建造者模式">
    ```bash
    openclaw config set channels.discord.token \
      --ref-provider default \
      --ref-source env \
      --ref-id DISCORD_BOT_TOKEN
    ```
  </Tab>
  <Tab id="provider-builder-mode" title="提供商建设者模式">
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
  <Tab id="batch-mode" title="批处理模式">
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
在不受支持的运行时可变表面（例如 `hooks.token`、Discord 线程绑定 Webhook 令牌和 WhatsApp 信用 JSON）上，SecretRef 分配被拒绝。请参阅 [SecretRef 凭证 Surface](/reference/secretref-credential-surface)。
</Warning>

批量解析始终使用批量有效负载（`--batch-json`/`--batch-file`）作为事实来源； `--strict-json` / `--json` 不会更改批量解析行为。

提供任一批处理选项都会选择批处理模式。空值或仅包含空格的值将被拒绝；省略这两个选项以使用位置 `<path> <value>` 模式。

`--batch-file` 和 `config patch --file` 使用您提供的确切文件路径，包括前导空格或尾随空格。引用 shell 中包含空格的路径。

批量分配按顺序应用，然后验证检查最终配置。即使使用 `--allow-exec`，被后续分配替换的 SecretRef 也不会解析或计入空运行输出中。保留在已更改的提供程序集合中的提供程序仍会收到命令路径信任检查。

JSON path/value 模式也适用于 SecretRefs 和直接提供者：

```bash
openclaw config set channels.discord.token \
  '{"source":"env","provider":"default","id":"DISCORD_BOT_TOKEN"}' \
  --strict-json

openclaw config set secrets.providers.vaultfile \
  '{"source":"file","path":"/etc/openclaw/secrets.json","mode":"json"}' \
  --strict-json
```

### <a id="provider-builder-flags"></a> Provider 构建器标志

Provider 构建器目标必须使用 `secrets.providers.<alias>` 作为路径。

<AccordionGroup>
  <Accordion id="common-flags" title="常用标志">
    - `--provider-source <env|file|exec|store>`
    - `--provider-timeout-ms <ms>` (`file`, `exec`)

  </Accordion>
  <Accordion id="env-provider-provider-source-env" title="环境提供商（--provider-source 环境）">
    - `--provider-allowlist <ENV_VAR>`（可重复指定）

  </Accordion>
  <Accordion id="file-provider-provider-source-file" title="文件提供者（--provider-source 文件）">
    - `--provider-path <path>`（必需）
    - `--provider-mode <singleValue|json>`
    - `--provider-max-bytes <bytes>`

  </Accordion>
  <Accordion id="exec-provider-provider-source-exec" title="执行提供者（--provider-source 执行）">
    - `--provider-command <path>`（必需）
    - `--provider-arg <arg>`（可重复）；每次出现都保留一个文字参数，包括空字符串或周围的空格。在 shell 中引用这些值。
    - `--provider-no-output-timeout-ms <ms>`
    - `--provider-max-output-bytes <bytes>`
    - `--provider-json-only`
    - `--provider-env <KEY=VALUE>`（可重复指定）
    - `--provider-pass-env <ENV_VAR>`（可重复指定）
    - `--provider-trusted-dir <path>`（可重复指定）

  </Accordion>
</AccordionGroup>

强化版 exec Provider 示例：

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
      model: { primary: "openai/gpt-6-astra" },
      models: {
        "openai/gpt-6-astra": {
          agentRuntime: { id: "openclaw" },
          params: { fastMode: true },
        },
      },
    },
  },
}
```

运行时固定项使其成为一个嵌入式 OpenClaw 配方。有效的 `fastMode` 值是一种可移植的类型化运行时控制项，并不会自行选择 OpenClaw。

当某个对象或数组必须完全变为所提供的值，而不是进行递归补丁时，请使用 `--replace-path <path>`：

```bash
openclaw config patch --file ./discord.patch.json5 --replace-path 'channels.discord.guilds["123"].channels'
```

`--dry-run` 无需写入即可运行架构和 SecretRef 可解析性检查。在空运行期间默认会跳过 Exec 支持的 SecretRefs；当您有意希望试运行执行提供程序命令时，请添加 `--allow-exec`。

## <a id="dry-run"></a> 试运行

`--dry-run` 模拟更改而不写入 `openclaw.json`。适用于 `config set`、`config patch` 和 `config unset`。运行哪些检查取决于输入模式。值模式（`config set <path> <value>`，不含 `--strict-json`）会跳过完整模式传递和普通的 SecretRef 可解析性扫描。策略、提供程序和模型引用检查仍然可以运行。当不进行检查时，即使对于实际写入拒绝的值，值模式也会报告 `Dry run successful`。当您需要架构验证时，请使用 `--strict-json`（或 `config patch --file --dry-run`）。

对于 `config patch` 和 `config unset`，`--json` 需要 `--dry-run`。在没有 `--dry-run` 的情况下使用 `--json` 将在标准输出上返回标准 [CLI JSON 故障信封 ](/cli#json-failures)，在标准错误上保留诊断，并以状态 1 退出。

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
  <Accordion id="dry-run-behavior" title="试运行行为">
    - Value 模式（没有 `--strict-json` 的普通 `<value>`）：跳过完整模式传递和普通 SecretRef 可解析性扫描。策略、提供程序和模型引用检查仍然可以运行。当不应用检查时，CLI 会打印 `Dry run note: value mode does not run schema/resolvability checks`，并且即使实际写入无法通过模式验证，也可以成功。
    - Builder 模式：对更改的 refs/providers. 运行 SecretRef 解析性检查注册配置秘密路径之外的 SecretRef 构建器目标也会运行完整架构验证，因此不受支持的路径会失败，而不是报告成功的预览。
    - JSON 模式（`--strict-json`、`--json` 或批处理模式）：运行 schema 验证以及 SecretRef 可解析性检查。
    - 策略验证会针对变更后的完整配置进行，因此对父对象的写入（例如将 `hooks` 设为对象）无法绕过不支持的作用域验证。
    - Exec 命令路径信任检查在不执行提供程序的情况下运行。默认情况下会跳过 Exec SecretRef 解析性检查，以避免命令副作用；通过 `--allow-exec` 选择加入（这可能会执行提供者命令）。 `--allow-exec` 仅是空运行，没有 `--dry-run` 时会出现错误。

  </Accordion>
  <Accordion id="dry-run-json-fields" title="--dry-run --json 字段">
    - `ok`：试运行是否通过
    - `operations`：评估的赋值次数
    - `checks`：schema/resolvability 检查是否运行
    - `checks.resolvabilityComplete`：可解析性检查是否完整执行（跳过 exec refs 时为 false）
    - `refsChecked`：试运行期间实际解析的 ref 数量
    - `skippedExecRefs`：由于未设置 `--allow-exec` 而跳过的 exec refs 数量
    - `errors`：`ok=false`时出现结构化故障；每个都携带 `missing-path`、`schema`、`resolvability`、`model` 或 `conflict` 的 `kind`（`conflict` 表示写入被拒绝，因为其配置快照、目标或条件期望不再匹配；重试之前请遵循消息）

  </Accordion>
</AccordionGroup>

### <a id="json-output-shape"></a> JSON 输出结构

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
      kind: "missing-path" | "schema" | "resolvability" | "model" | "conflict",
      message: string,
      ref?: string, // present for resolvability errors
    },
  ],
}
```

<Tabs>
  <Tab id="success-example" title="成功范例">
    ```json
    {
      "ok": true,
      "operations": 1,
      "configPath": "/home/user/.openclaw/openclaw.json",
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
  <Tab id="failure-example" title="失败例子">
    ```json
    {
      "ok": false,
      "operations": 1,
      "configPath": "/home/user/.openclaw/openclaw.json",
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
  <Accordion id="if-dry-run-fails" title="如果试运行失败">
    - `config schema validation failed`：您的更改后配置形状无效；修复 path/value 或 provider/ref 对象形状。
    - `Config policy validation failed: unsupported SecretRef usage`：将该凭证移回 plaintext/string 输入；仅将 SecretRefs 保留在受支持的表面上。
    - `SecretRef assignment(s) could not be resolved`：引用的 provider/ref 当前无法解析（缺少 env/store 名称、无效文件指针、执行提供程序失败或 provider/source 不匹配）。
    - `model reference validation failed`：更改后的文本模型主模型或回退模型未知；运行 `openclaw models list` 并选择可用模型。
    - `Dry run note: skipped <n> exec SecretRef resolvability check(s)`：如果需要验证 exec 的可解析性，请使用 `--allow-exec` 重新运行。
    - 对于批处理模式，请修复失败的条目，并在写入前重新运行 `--dry-run`。

  </Accordion>
</AccordionGroup>

## <a id="applying-changes"></a> 应用更改

每次成功执行 `config set` / `config patch` / `config unset` 后，CLI 都会打印以下三种提示之一，以便你知道网关是否需要重启：

| 提示                                                | 含义                                                               |
| --------------------------------------------------- | --------------------------------------------------------------------- |
| `Restart the gateway to apply.`                     | 更改的路径需要完全重新启动，或者禁用被动重新加载。 |
| `Change will apply without restarting the gateway.` | 热重载会自动拾取它。                                 |
| `No gateway restart needed.`                        | 与运行时相关的任何内容都没有改变。                                     |

插件条目更改使用与其他设置相同的重新加载计划程序。在默认的 `hybrid` 模式下，普通的 `plugins.entries.<id>` 编辑会自动替换受影响的插件实例。插件的较窄重启策略或 `gateway.reload.mode: "off"` 仍可能需要网关重启。 CLI 提示描述了预期的应用；它不是来自正在运行的网关的收据。参见[配置热重载](/gateway/configuration/hot-reload)。

成功的 `config set` 或 `config unset` 操作不会产生有效的配置差异打印 `No change` 并保持 JSON5 文件逐字节不变。编写的配置中不存在的 `config unset` 目标将以状态 1 退出，并且文件也保持不变。将不存在的键设置为等于其运行时默认值的值仍然是创作的更改，并且会保留显式值。

在保存突变之前，模型引用会被标准化。核心代理模型引用不需要插件发现；提供程序目录模型 ID 重用兼容的准备好的插件元数据或按需加载其清单规范化策略。不相关的编辑使提供商目录保持不变。目录写入和更改插件发现或激活策略会在保存之前规范提供程序模型 ID。

## <a id="write-safety"></a> 写入安全

`openclaw config set` 和其他 OpenClaw- 拥有的配置编写器在将其提交到磁盘之前验证完整的更改后配置。如果新的有效负载未通过模式验证或看起来像破坏性破坏，则活动配置将保持不变，并且被拒绝的有效负载将在其旁边保存为 `openclaw.json.rejected.*`。

如果暂存配置保存失败，则现有根环或包含备份环将保持不变。 OpenClaw 准备备份内容而不阻止不相关的网关请求。如果副本回退在冲突之前删除了文件，则 OpenClaw 会在仍拥有丢失的目标时恢复原始文件。否则，错误会报告部分发布以及在下次保存之前要检查的备份位置。

如果文件已保存但稍后处理失败，则错误会命名写入的文件并报告写入是否已回滚。当包含的文件拥有编辑的设置时，这可以命名该文件。如果回滚未发生或无法确认，请在重试之前检查指定文件和活动配置。

OpenClaw-owned 写入更改配置，将 JSON5 重新序列化为标准 JSON。当来源包含评论时，作者会在删除它们之前立即发出警告；当保留评论很重要时，使用直接编辑器。

<Warning>
活动配置路径必须是普通文件。通过符号链接的 `openclaw.json` 布局不支持写入；请改用 `OPENCLAW_CONFIG_PATH` 直接指向真实文件。
</Warning>

对于小改动，优先使用 CLI 写入：

```bash
openclaw config set gateway.reload.mode '"hybrid"' --strict-json --dry-run
openclaw config set gateway.reload.mode '"hybrid"' --strict-json
openclaw config validate
```

如果写入被拒绝，请检查已保存的负载并修复整个配置结构：

```bash
CONFIG="$(openclaw config file)"
ls -lt "$CONFIG".rejected.* 2>/dev/null | head
openclaw config validate
```

仍然允许直接编辑器写入，但正在运行的网关将它们视为不可信，直到它们验证为止。启动验证配置而不重写旧密钥。无效的直接编辑停止启动；热重载会跳过无效编辑，而不重写 `openclaw.json`。运行 `openclaw doctor --fix` 进行旧密钥修复、prefixed/clobbered 配置或最后一次已知的良好恢复。请参阅 [ 网关故障排除](/gateway/troubleshooting#gateway-rejected-invalid-config)。

普通恢复可以逐字恢复符合条件的、有效的当前备份。需要旧版转换的备份必须通过 Doctor 进行恢复。插件模式更改或 `minHostVersion` 偏差会保持响亮，而不是回滚不相关的用户设置，例如模型、提供程序、身份验证配置文件、通道、网关暴露、工具、内存、浏览器或 cron 配置。

## <a id="repair-loop"></a> 修复循环

在 `openclaw config validate` 通过后，使用本地 TUI，让嵌入式代理将当前配置与文档进行比较，同时在同一终端中验证每项更改：

```bash
openclaw chat
```

在 TUI 中，开头带有 `!` 的命令会原样运行本地 shell 命令（每个会话中首次使用时，你会先看到确认提示）：

```text
!openclaw config file
!openclaw docs gateway auth token secretref
!openclaw config validate
!openclaw doctor
```

<Steps>
  <Step id="compare-with-docs" title="与文档比较">
    要求代理将当前配置与相关文档页面进行比较，并建议尽可能小的修复方案。
  </Step>
  <Step id="apply-targeted-edits" title="应用有针对性的编辑">
    使用 `openclaw config set` 或 `openclaw configure` 应用有针对性的更改。
  </Step>
  <Step id="re-validate" title="重新验证">
    每次更改后重新运行 `openclaw config validate`。
  </Step>
  <Step id="doctor-for-runtime-issues" title="运行时问题医生">
    如果验证通过但运行时仍不正常，请运行 `openclaw doctor` 或 `openclaw doctor --fix`，以获取迁移和修复帮助。
  </Step>
</Steps>

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [配置](/gateway/configuration)
- [`openclaw configure`](/cli/configure) — 相同设置的引导编辑器
