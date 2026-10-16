---
summary: "`openclaw path` 的 CLI 参考（通过 `oc://` 寻址方案检查和编辑工作区文件）"
read_when:
  - "你想从终端读取或写入工作区文件中的某个叶子节点"
  - "你正在基于工作区状态编写脚本，并希望使用一种稳定、与类型无关的寻址方案"
  - "你正在调试一个 `oc://` 路径（验证语法，查看它会解析到哪里）"
title: "路径"
---

# `openclaw path`

通过 `oc://` 寻址方案进行 Shell 访问：一种按类型分派的路径语法，用于检查和编辑可寻址的工作区文件（markdown、jsonc、jsonl、yaml/yml/lobster）。自托管用户、插件作者和编辑器扩展会使用它来读取、查找或更新某个局部位置，而无需为每个文件手工编写解析器。

`path` 由捆绑的可选 [`oc-path` 插件 ](/plugins/oc-path) 提供。首次使用前启用它：

```bash
openclaw plugins enable oc-path
```

CLI 动词与寻址模型相对应：

- `resolve` 是具体且单一匹配的。
- `find` 是用于通配符、并集、谓词和位置展开的多匹配动词。
- `set` 只接受具体路径或插入标记；通配符模式会在写入前被拒绝。
- `validate` 在不访问文件系统的情况下解析路径。
- `emit` 通过解析 + 生成对文件进行往返处理（字节级保真诊断）。

## <a id="why-use-it"></a> 为什么使用它

OpenClaw 状态分布在人工编辑的降价、注释的 JSONC 配置、仅附加 JSONL 日志和 YAML workflow/spec 文件中。脚本、挂钩和代理通常需要这些文件中的一个小值：一个 frontmatter 键、一个插件设置、一个日志记录字段、一个 YAML 步骤或命名部分下的项目符号项。

`openclaw path` 为这些调用方提供一个稳定的地址，而不是针对每种文件类型各写一次 grep、正则表达式或解析器。相同的 `oc://` 路径可以被验证、 解析、搜索、试运行，并可从终端写入，这使得窄范围的自动化更便于审查和重放。它会保留文件的其余部分，因此只写入一个叶子节点不会干扰其注释、行尾格式，或附近的排版。

当你想要的内容有一个逻辑地址，但文件形状会变化时，就使用它：

- 一个钩子从带注释的 JSONC 中读取一个设置，并在写回该值时不丢失注释。
- 一个维护脚本在 JSONL 日志中查找每个匹配的事件字段，而无需将整个日志加载到自定义解析器中。
- 一个编辑器通过 slug 跳转到 markdown 的某个章节或项目符号项，然后渲染它解析到的精确行。
- 一个代理在应用之前先对一个小型工作区编辑进行试运行，并在审查中可见更改后的字节。

对于普通的整文件编辑、复杂的配置迁移，或依赖内存的写入，请跳过 `openclaw path`；这些应使用所有者命令或插件。`path` 适用于小型、可寻址的文件操作，在这种场景下，可重复的终端命令比另一个定制解析器更有价值。

## <a id="how-it-is-used"></a> 如何使用

从人工编辑的配置文件中读取一个值：

```bash
openclaw path resolve 'oc://config.jsonc/plugins/github/enabled'
```

在不触碰磁盘的情况下预览写入：

```bash
openclaw path set 'oc://config.jsonc/plugins/github/enabled' 'true' --dry-run
```

在只追加的 JSONL 日志中查找匹配记录：

```bash
openclaw path find 'oc://session.jsonl/[event=tool_call]/name'
```

通过章节和条目而不是行号来定位 markdown 中的一条指令：

```bash
openclaw path resolve 'oc://AGENTS.md/runtime-safety/openclaw-gateway'
```

在脚本读取或写入之前，在 CI 或预检脚本中验证路径：

```bash
openclaw path validate 'oc://AGENTS.md/tools/$last/risk'
```

这些命令旨在可直接复制到 shell 脚本中使用。当调用方需要结构化输出时使用 `--json`，当人工查看结果时使用 `--human`。

## <a id="how-it-works"></a> 工作原理

1. 将 `oc://` 地址解析为槽位：file、section、item、field，以及一个可选的会话查询。
2. 根据目标扩展名（`.md`、`.jsonc`、 `.json`、`.jsonl`、`.ndjson`、`.yaml`、`.yml`、`.lobster`）选择文件类型适配器。
3. 根据该文件类型的结构解析插槽：markdown headings/items、JSONC 对象 keys/array 索引、JSONL 行记录或 YAML map/sequence 节点。
4. 对于 `set`，通过同一个适配器输出已编辑的字节，以便未触及的文件部分在该类型支持的情况下保留其注释、换行符以及附近的格式。

`resolve` 和 `set` 要求一个具体目标。`find` 是探索性动词：它会把通配符、并集、谓词和序数展开为具体匹配，供你在决定写入哪一个之前检查。

## <a id="subcommands"></a> 子命令

| 子命令              | 用途                                                                     |
| ----------------------- | --------------------------------------------------------------------------- |
| `resolve <oc-path>`     | 打印路径上的具体匹配项（或“未找到”）。                      |
| `find <pattern>`        | 枚举通配符 / 并集 / 谓词路径的匹配项。                  |
| `set <oc-path> <value>` | 在具体路径上写入叶子节点或插入目标。支持 `--dry-run`。  |
| `validate <oc-path>`    | 仅解析；打印结构分解（文件 / 部分 / 项 / 字段）。 |
| `emit <file>`           | 通过解析+发出（字节保真度诊断）来往返文件。          |

## <a id="global-flags"></a> 全局标志

| 标志            | 适用于                       | 用途                                                                  |
| --------------- | -------------------------------- | ------------------------------------------------------------------------ |
| `--cwd <dir>`   | `resolve`, `find`, `set`, `emit` | 将文件槽位相对于此目录进行解析（默认：`process.cwd()`）。 |
| `--file <path>` | `resolve`, `find`, `set`, `emit` | 覆盖文件槽位解析后的路径（绝对访问）。                |
| `--json`        | 全部                              | 强制输出 JSON（当 stdout 不是 TTY 时为默认）。                    |
| `--human`       | 全部                              | 强制人类可读输出（当 stdout 是 TTY 时为默认）。                       |
| `--value-json`  | `set`                            | 将 `<value>` 解析为 JSON，用于 JSON/JSONC/JSONL 叶子节点替换。           |
| `--dry-run`     | `set`                            | 在不写入的情况下打印将要写入的字节。                   |
| `--diff`        | `set`（需要 `--dry-run`）     | 打印统一 diff，而不是完整字节内容。                          |

`validate` 仅接受 `--json` / `--human`；它不访问文件系统，因此 `--cwd` 和 `--file` 不适用。

## <a id="oc%3A%2F%2F-syntax"></a><a id="oc//-syntax"></a> `oc://` 语法

```text
oc://FILE/SECTION/ITEM/FIELD?session=SCOPE
```

槽位规则：`field` 需要 `item`，而 `item` 需要 `section`。在这四个槽位中：

- **引用段** — `"a/b.c"` 保留 `/` 和 `.` 分隔符。引用使特殊标记成为文字键，包括 `"$first"`、`"*"`、`"+key"` 和 `"[k=v]"`。在引号内，使用 `\"` 作为文字引号，使用 `\\` 作为文字反斜杠；其他反斜杠转义被拒绝。文件槽也是引号感知的：`oc://"skills/email-drafter"/Tools/$last` 将 `skills/email-drafter` 视为单个文件路径。
- **谓词** — `[k=v]`、`[k!=v]`、`[k<v]`、`[k<=v]`、`[k>v]`、`[k>=v]`。 数值运算符要求两侧都能转换为有限数字。
- **并集** — `{a,b,c}` 可匹配任一候选项。
- **通配符** — `*`（单个子片段）和 `**`（零个或多个，递归）。 `find` 接受这些；`resolve` 和 `set` 会将其视为歧义并拒绝。
- **Positional** — `$first` / `$last` 解析为第一个/最后一个索引或声明的键。引用它们（`"$first"` / `"$last"`）以使用这些名称来寻址文字键。
- **序数** — `#N` 表示按文档顺序匹配到的第 N 个结果。
- **插入标记** — `+`、`+key`、`+nnn` 用于按键 / 按索引插入 （与 `set` 一起使用）。
- **会话作用域** — `?session=cron-daily` 等。与槽位嵌套互不影响。 会话值为原始值，不会进行百分号解码；其中不能包含控制字符或保留的查询分隔符（`?`、`&`、`%`）。

引用、谓词或联合段之外的保留字符（`?`、`&`、`%`）将被拒绝。 Control 字符（U+0000-U+001F、U+007F）在任何地方都会被拒绝，包括 `session` 查询值。

`formatOcPath(parseOcPath(path)) === path` 对于标准化路径有保证。除了第一个非空 `session=` 值之外，其他查询参数都将被忽略。

硬限制：路径上限为 4096 字节，最多 4 个槽（file/section/item/字段），每个槽最多 64 个点分子段，深度 JSON 路径最多 256 个嵌套遍历级别。另外，在解析加载文件的任何动词之前，每个超过 16 MiB 的文件输入都会被拒绝。 JSONC/JSON 保留 `OC_JSONC_INPUT_TOO_LARGE` 诊断；其他文件类型使用 `OC_PATH_INPUT_TOO_LARGE`。

## <a id="addressing-by-file-kind"></a> 按文件类型寻址

| 类型          | 文件扩展名             | 寻址模型                                                                                    |
| ------------- | --------------------------- | --------------------------------------------------------------------------------------------------- |
| Markdown      | `.md`                       | 通过 slug 定位 H2 区段，通过 slug 或 `#N` 定位项目符号项，通过 `[frontmatter]` 访问 frontmatter。                 |
| JSONC/JSON    | `.jsonc`, `.json`           | 对象键和数组索引；除非加引号，否则点号会拆分嵌套子段。                        |
| JSONL         | `.jsonl`, `.ndjson`         | 顶级行地址（`L1`、`L2`、`$first`、`$last`），然后是 JSONC- 样式的线内下降。 |
| YAML/.lobster | `.yaml`, `.yml`, `.lobster` | 映射键和序列索引；注释和流式样式由 YAML 文档 API 处理。        |

`resolve` 返回一个结构化匹配：`root`、`node`、`leaf` 或 `insertion-point`，并带有从 1 开始的行号。叶子值会以文本和 `leafType` 的形式展示，因此插件作者可以在不依赖各类型 AST 结构的情况下渲染预览。

## <a id="mutation-contract"></a> 变更约定

`set` 会写入一个具体目标：

- Markdown frontmatter 值和 `- key: value` 项目字段是字符串叶子。值是文字值，包括 `$1`、`$&` 和 `$$`。 Markdown 插入附加节、frontmatter 键或节项。编辑仅替换选定的源范围：正文编辑保留原始的 frontmatter，而 frontmatter 编辑保留正文，包括注释、引用、空行、CRLF 和缺少的最终换行符。 Frontmatter 使用 `---` 分隔符； `+++` 是普通正文。节体不可通过 `set` 整体写入。
- JSONC 叶将字符串值强制写入现有叶类型（`string`、有限 `number`、`true`/`false` 或 `null`）。当 JSONC/JSON/JSONL 叶子替换应将 `<value>` 解析为 JSON 并可能更改形状（例如用对象替换字符串 Secret-ref 简写）时，请使用 `--value-json`。 JSONC 对象和数组插入将 `<value>` 解析为 JSON 并使用 `jsonc-parser` 编辑路径进行普通叶写入，保留注释和附近的格式。
- JSONL 叶子在一行内写入像 JSONC 一样的强制。全行替换并追加将 `<value>` 解析为 JSON。编辑仅替换所选值的源文本，保留未更改的数字、注释、空格和每个现有行结尾，包括缺少的最后换行符。追加保留所有现有字节和最终换行约定；未终止的文件使用其主导的 LF/CRLF 约定来分隔新记录。
- YAML 叶子将强制写入现有标量类型（`string`、有限 `number`、`true`/`false` 或 `null`）。 YAML 插入使用捆绑的 `yaml` 包的文档 API 进行 map/sequence 更新。带有解析器错误的格式错误的 YAML 文档在使用 `parse-error` 进行突变之前会被拒绝。

当确切的字节很重要时，请在用户可见的写入之前使用 `--dry-run`。 JSONC和YAML编辑修补现有文档（通过`jsonc-parser`或`yaml`文档API）； Markdown 和 JSONL 编辑保留未触及的源范围。当您希望预览作为聚焦的 before/after 修补程序而不是完整渲染的文件时，请添加 `--diff`。该补丁记录了行结束更改和丢失的最终换行符，因此应用它会产生与写入相同的字节。

## <a id="examples"></a> 示例

```bash
# Validate a path (no filesystem access)
openclaw path validate 'oc://AGENTS.md/Tools/$last/risk'

# Read a leaf
openclaw path resolve 'oc://gateway.jsonc/version'

# Wildcard search
openclaw path find 'oc://session.jsonl/*/event' --file ./logs/session.jsonl

# Dry-run a write
openclaw path set 'oc://gateway.jsonc/version' '2.0' --dry-run

# Dry-run a write as a unified diff
openclaw path set 'oc://gateway.jsonc/version' '2.0' --dry-run --diff

# Apply the write
openclaw path set 'oc://gateway.jsonc/version' '2.0'

# Byte-fidelity round-trip (diagnostic)
openclaw path emit ./AGENTS.md
```

更多语法示例：

```bash
# Quote keys containing / or .
openclaw path resolve 'oc://config.jsonc/agents.defaults.models/"anthropic/claude-opus-4-7"/alias'

# Deep JSON/JSONC paths can use slash segments; they normalize to dotted subsegments
openclaw path set 'oc://openclaw.json/agents/list/0/tools/exec/security' 'allowlist' --dry-run

# Replace a JSONC leaf with a parsed object
openclaw path set 'oc://openclaw.json/gateway/auth/token' '{"source":"file","provider":"secrets","id":"/test"}' --value-json --dry-run

# Predicate search over JSONC children
openclaw path find 'oc://config.jsonc/plugins/[enabled=true]/id'

# Insert into a JSONC array
openclaw path set 'oc://config.jsonc/items/+1' '{"id":"new","enabled":true}' --dry-run

# Insert a JSONC object key
openclaw path set 'oc://config.jsonc/plugins/+github' '{"enabled":true}' --dry-run

# Append a JSONL event
openclaw path set 'oc://session.jsonl/+' '{"event":"checkpoint","ok":true}' --file ./logs/session.jsonl

# Resolve the last JSONL value line
openclaw path resolve 'oc://session.jsonl/$last/event' --file ./logs/session.jsonl

# Resolve a YAML workflow step
openclaw path resolve 'oc://workflow.yaml/steps/0/id'

# Update a YAML scalar
openclaw path set 'oc://workflow.yaml/steps/$last/id' 'classify-renamed' --dry-run

# Address markdown frontmatter
openclaw path resolve 'oc://AGENTS.md/[frontmatter]/name'

# Insert markdown frontmatter
openclaw path set 'oc://AGENTS.md/[frontmatter]/+description' 'Agent instructions' --dry-run

# Find markdown item fields
openclaw path find 'oc://SKILL.md/Tools/*/send_email'

# Validate a session-scoped path
openclaw path validate 'oc://AGENTS.md/Tools/$last/risk?session=cron-daily'
```

## <a id="recipes-by-file-kind"></a> 按文件类型分类的配方

相同的五个动词适用于各种类型；寻址方案会根据文件扩展名进行分发。

### Markdown

```text
<!-- frontmatter.md -->
---
name: drafter
description: email drafting agent
tier: core
---
## Tools
- gh: GitHub CLI
- curl: HTTP client
- send_email: enabled
```

```bash
$ openclaw path resolve 'oc://x.md/[frontmatter]/tier' --file frontmatter.md --human
leaf @ L4: "core" (string)

$ openclaw path resolve 'oc://x.md/tools/gh/gh' --file frontmatter.md --human
leaf @ L9: "GitHub CLI" (string)

$ openclaw path find 'oc://x.md/tools/*' --file frontmatter.md --human
3 matches for oc://x.md/tools/*:
  oc://x.md/tools/gh           →  node @ L9 [md-item]
  oc://x.md/tools/curl         →  node @ L10 [md-item]
  oc://x.md/tools/send-email   →  node @ L11 [md-item]
```

`[frontmatter]` 谓词用于定位 YAML frontmatter 块；`tools` 通过 slug 匹配 `## Tools` 标题，而条目叶节点会保留其 slug 形式， 即使源文本使用的是下划线（`send_email` 会变成 `send-email`）。

### JSONC

```text
// config.jsonc
{
  "plugins": {
    "github": {"enabled": true, "role": "vcs"},
    "slack":  {"enabled": false, "role": "chat"}
  }
}
```

```bash
$ openclaw path resolve 'oc://config.jsonc/plugins/github/enabled' --file config.jsonc --human
leaf @ L4: "true" (boolean)

$ openclaw path set 'oc://config.jsonc/plugins/slack/enabled' 'true' --file config.jsonc --dry-run
--dry-run: would write 142 bytes to /…/config.jsonc
{
  "plugins": {
    "github": {"enabled": true, "role": "vcs"},
    "slack":  {"enabled": true, "role": "chat"}
  }
}
```

JSONC 的编辑会通过 `jsonc-parser` 进行，因此注释和空白在执行 `set` 后仍会保留。请先使用 `--dry-run` 运行，以便在提交前检查字节内容。 `.json` 文件使用与 `.jsonc` 相同的适配器和编辑路径。

### JSONL

```text
{"event":"start","userId":"u1","ts":1}
{"event":"action","userId":"u1","ts":2}
{"event":"end","userId":"u1","ts":3}
```

```bash
$ openclaw path find 'oc://session.jsonl/[event=action]/userId' --file session.jsonl --human
1 match for oc://session.jsonl/[event=action]/userId:
  oc://session.jsonl/L2/userId  →  leaf @ L2: "u1" (string)

$ openclaw path resolve 'oc://session.jsonl/L2/ts' --file session.jsonl --human
leaf @ L2: "2" (number)
```

每一行都是一条记录。当您不知道行号时，通过谓词 （`[event=action]`） 寻址；当您知道行号时，通过标准 `LN` 段寻址。 `.ndjson` 文件使用与 `.jsonl` 相同的适配器。

### YAML

```text
# workflow.yaml
name: inbox-triage
steps:
  - id: fetch
    command: gmail.search
  - id: classify
    command: openclaw.invoke
```

```bash
$ openclaw path resolve 'oc://workflow.yaml/steps/0/id' --file workflow.yaml --human
leaf @ L3: "fetch" (string)

$ openclaw path set 'oc://workflow.yaml/steps/$last/id' 'classify-renamed' --file workflow.yaml --dry-run
--dry-run: would write 99 bytes to /…/workflow.yaml
name: inbox-triage
steps:
  - id: fetch
    command: gmail.search
  - id: classify-renamed
    command: openclaw.invoke
```

YAML 使用的是 `yaml` 包的 `Document` API，而不是手写解析器， 因此普通的 parse/emit 往返会保留注释和编写时的结构形状；同时解析后的路径会使用与 JSONC 相同的 map-key / sequence-index 模型。相同的适配器也处理 `.yaml`、`.yml` 和 `.lobster` 文件。

## <a id="subcommand-reference"></a> 子命令参考

### `resolve <oc-path>`

读取单个叶子或节点。不接受通配符——这些请使用 `find`。匹配成功时退出码为 `0`，干净地未命中时为 `1`，解析错误或拒绝的模式为 `2`。

```bash
openclaw path resolve 'oc://AGENTS.md/tools/gh/risk' --human
openclaw path resolve 'oc://gateway.jsonc/server/port' --json
```

### `find <pattern>`

枚举通配符/谓词/联合模式的每个匹配项。至少在一场比赛中退出 `0`，在零场比赛中退出 `1`。文件槽通配符被 `OC_PATH_FILE_WILDCARD_UNSUPPORTED` 拒绝并退出 `2` — 传递具体文件路径。

```bash
openclaw path find 'oc://AGENTS.md/tools/**/risk'
openclaw path find 'oc://session.jsonl/[event=action]/userId'
openclaw path find 'oc://config.jsonc/plugins/{github,slack}/enabled'
```

### `set <oc-path> <value>`

写入一个叶子。可搭配 `--dry-run` 预览将要写入的字节，而不实际触碰文件。添加 `--diff` 可预览统一 diff。写入成功时退出码为 `0`，如果底层拒绝（例如触发了哨兵保护）则为 `1`，解析错误则为 `2`。

```bash
openclaw path set 'oc://gateway.jsonc/version' '2.0' --dry-run
openclaw path set 'oc://gateway.jsonc/version' '2.0' --dry-run --diff
openclaw path set 'oc://gateway.jsonc/version' '2.0'
openclaw path set 'oc://AGENTS.md/Tools/+gh/risk' 'low'
```

`+key` 插入标记会在指定子项不存在时创建该子项；`+nnn` 和单独的 `+` 分别适用于按索引插入和追加插入。

### `validate <oc-path>`

仅解析检查。不访问文件系统。在你想在替换变量之前确认模板路径格式正确，或者想获取结构拆解用于调试时很有用：

```bash
$ openclaw path validate 'oc://AGENTS.md/tools/gh' --human
valid: oc://AGENTS.md/tools/gh
  file:    AGENTS.md
  section: tools
  item:    gh
```

有效时退出 `0`，无效时退出 `1`（具有结构化 `code` 和 `message`）。 Commander 将拒绝缺少必需的参数并退出 `1`。

### `emit <file>`

通过按类型对应的解析器和输出器对文件进行往返处理。对于格式正确的文件，输出应与输入逐字节一致；任何差异都表明解析器存在 bug，或者触发了哨兵。此命令有助于在真实世界输入上调试底层行为。

```bash
openclaw path emit ./AGENTS.md
openclaw path emit ./gateway.jsonc --json
```

## <a id="exit-codes"></a> 退出代码

| 代码 | 含义                                                                                             |
| ---- | --------------------------------------------------------------------------------------------------- |
| `0`  | 成功。（`resolve` / `find`：至少有一个匹配项。`set`：写入成功。）                          |
| `1`  | 不匹配、`validate` 输入无效、缺少所需参数或 `set` 被基材拒绝。 |
| `2`  | 路径或文件解析错误、拒绝模式或无效的突变选项。                             |

## <a id="output-mode"></a> 输出模式

`openclaw path` 是 TTY-aware：终端上的人类可读输出，当标准输出通过管道传输或重定向时为 JSON。 `--json` 和 `--human` 覆盖自动检测。

## <a id="notes"></a> 说明

- 在写入或试运行预览之前，`set` 拒绝包含 `__OPENCLAW_REDACTED__`（逐字或作为子字符串）的字符串叶值。这包括 Markdown 的 frontmatter、item 和标题的插入值。普通编辑保留不相关的预先存在的标记文本。
- JSONC 解析和叶子编辑使用插件本地 `jsonc-parser` 依赖项，因此注释和格式保留在普通叶子写入中，而不是通过手动滚动的 parser/re-render 路径。
- `path` 不知道最后一次已知的良好（LKG）配置跟踪或恢复；该生命周期由其他地方拥有。如果您通过 `path` 编辑的文件也被 LKG- 跟踪，则下一个配置读取将决定是提升还是恢复它；将 `path` 编辑视为对该文件的任何其他直接写入。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [OC 路径插件](/plugins/oc-path)
