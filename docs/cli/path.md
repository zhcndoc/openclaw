---
summary: "openclaw path 的 CLI 参考（通过 `oc://` 寻址方案检查并编辑工作区文件）"
read_when:
  - 你想从终端读取或写入工作区文件中的某个叶子节点
  - 你正在基于工作区状态编写脚本，并希望使用一种稳定、与类型无关的寻址方案
  - 你正在调试一个 `oc://` 路径（验证语法，查看它会解析到哪里）
title: "路径"
---

# `openclaw path`

通过 `oc://` 寻址方案进行 Shell 访问：一种按类型分派的路径语法，用于检查和编辑可寻址的工作区文件（markdown、jsonc、jsonl、yaml/yml/lobster）。自托管用户、插件作者和编辑器扩展会使用它来读取、查找或更新某个局部位置，而无需为每个文件手工编写解析器。

`path` 由捆绑的可选 `oc-path` 插件提供。在首次使用前启用它：

```bash
openclaw plugins enable oc-path
```

CLI 动词与寻址模型相对应：

- `resolve` 是具体且单一匹配的。
- `find` 是用于通配符、并集、谓词和位置展开的多匹配动词。
- `set` 只接受具体路径或插入标记；通配符模式会在写入前被拒绝。
- `validate` 在不访问文件系统的情况下解析路径。
- `emit` 通过解析 + 生成对文件进行往返处理（字节级保真诊断）。

## 为什么使用它

OpenClaw 状态分散在人工编辑的 markdown、带注释的 JSONC
配置、仅追加的 JSONL 日志，以及 YAML 工作流/规范文件中。脚本、钩子，
和代理经常只需要这些文件中的一个小值：一个 frontmatter 键、一个
插件设置、一条日志记录字段、一个 YAML 步骤，或某个命名
节下的一个项目符号项。

`openclaw path` 为这些调用方提供一个稳定的地址，而不是针对每种文件类型各写一次
grep、正则表达式或解析器。相同的 `oc://` 路径可以被验证、
解析、搜索、试运行，并可从终端写入，这使得窄范围的
自动化更便于审查和重放。它会保留文件的其余部分，因此只写入一个叶子节点
不会干扰其注释、行尾格式，或附近的
排版。

当你想要的内容有一个逻辑地址，但文件形状
会变化时，就使用它：

- 一个钩子从带注释的 JSONC 中读取一个设置，并在写回该值时不丢失注释。
- 一个维护脚本在 JSONL 日志中查找每个匹配的事件字段，而无需将整个日志加载到自定义解析器中。
- 一个编辑器通过 slug 跳转到 markdown 的某个章节或项目符号项，然后渲染它解析到的精确行。
- 一个代理在应用之前先对一个小型工作区编辑进行试运行，并在审查中可见更改后的字节。

对于普通的整文件编辑、复杂的配置迁移，或
依赖内存的写入，请跳过 `openclaw path`；这些应使用所有者命令或插件。`path`
适用于小型、可寻址的文件操作，在这种场景下，可重复的终端命令
比另一个定制解析器更有价值。

## 如何使用

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

## 工作原理

1. 将 `oc://` 地址解析为槽位：file、section、item、field，以及一个
   可选的会话查询。
2. 根据目标扩展名（`.md`、`.jsonc`、
   `.json`、`.jsonl`、`.ndjson`、`.yaml`、`.yml`、`.lobster`）选择文件类型适配器。
3. 将这些槽位与该文件类型的结构进行解析：markdown
   标题/条目、JSONC 对象键/数组索引、JSONL 行记录，或
   YAML 映射/序列节点。
4. 对于 `set`，通过同一个适配器输出已编辑的字节，以便未触及的文件部分在该类型支持的情况下保留其注释、换行符以及附近的格式。

`resolve` 和 `set` 要求一个具体目标。`find` 是探索性动词：它会把通配符、并集、谓词和序数展开为具体匹配，供你在决定写入哪一个之前检查。

## 子命令

| 子命令                  | 用途                                                                        |
| ----------------------- | --------------------------------------------------------------------------- |
| `resolve <oc-path>`     | 打印路径上的具体匹配项（或“未找到”）。                                      |
| `find <pattern>`        | 枚举通配符 / 并集 / 谓词路径的匹配项。                                       |
| `set <oc-path> <value>` | 在具体路径上写入叶子节点或插入目标。支持 `--dry-run`。                     |
| `validate <oc-path>`    | 仅解析；打印结构分解（文件 / 部分 / 项 / 字段）。                           |
| `emit <file>`           | 通过解析 + 输出对文件进行往返处理（字节级一致性诊断）。

## 全局标志

| Flag            | Applies to                       | Purpose                                                                  |
| --------------- | -------------------------------- | ------------------------------------------------------------------------ |
| `--cwd <dir>`   | `resolve`, `find`, `set`, `emit` | 将文件槽位相对于此目录进行解析（默认：`process.cwd()`）。 |
| `--file <path>` | `resolve`, `find`, `set`, `emit` | 覆盖文件槽位解析后的路径（绝对访问）。                |
| `--json`        | all                              | 强制输出 JSON（当 stdout 不是 TTY 时为默认）。                    |
| `--human`       | all                              | 强制人类可读输出（当 stdout 是 TTY 时为默认）。                       |
| `--value-json`  | `set`                            | 将 `<value>` 解析为 JSON，用于 JSON/JSONC/JSONL 叶子节点替换。           |
| `--dry-run`     | `set`                            | 在不写入的情况下打印将要写入的字节。                   |
| `--diff`        | `set` (requires `--dry-run`)     | 打印统一 diff，而不是完整字节内容。                          |

`validate` 仅接受 `--json` / `--human`；它不访问文件系统，因此
`--cwd` 和 `--file` 不适用。

## `oc://` 语法

```text
oc://FILE/SECTION/ITEM/FIELD?session=SCOPE
```

槽位规则：`field` 需要 `item`，而 `item` 需要 `section`。在这四个槽位中：

- **带引号的片段** — `"a/b.c"` 可保留 `/` 和 `.` 分隔符。内容为字节字面量；引号内不允许出现 `"` 和 `\`。文件槽也支持引号：`oc://"skills/email-drafter"/Tools/$last` 会将 `skills/email-drafter` 视为单个文件路径。
- **谓词** — `[k=v]`、`[k!=v]`、`[k<v]`、`[k<=v]`、`[k>v]`、`[k>=v]`。
  数值运算符要求两侧都能转换为有限数字。
- **并集** — `{a,b,c}` 可匹配任一候选项。
- **通配符** — `*`（单个子片段）和 `**`（零个或多个，递归）。
  `find` 接受这些；`resolve` 和 `set` 会将其视为歧义并拒绝。
- **位置** — `$first` / `$last` 解析为第一个 / 最后一个索引或
  声明的键。
- **序数** — `#N` 表示按文档顺序匹配到的第 N 个结果。
- **插入标记** — `+`、`+key`、`+nnn` 用于按键 / 按索引插入
  （与 `set` 一起使用）。
- **会话作用域** — `?session=cron-daily` 等。与槽位嵌套互不影响。
  会话值为原始值，不会进行百分号解码；其中不能包含控制
  字符或保留的查询分隔符（`?`、`&`、`%`）。

保留字符（`?`、`&`、`%`）在引号、谓词或并集片段之外会被拒绝。控制字符（U+0000-U+001F、U+007F）在任何位置都会被拒绝，包括 `session` 查询值。

`formatOcPath(parseOcPath(path)) === path` 对规范路径是有保证的。非规范查询参数会被忽略，除了第一个非空的 `session=` 值。

硬性限制：路径最多 4096 字节，最多 4 个槽位（file/section/item/
field），每个槽位最多 64 个带点分隔的子片段，深层 JSON 路径最多 256 层嵌套遍历。除此之外，任何超过 16 MiB 的 JSONC/JSON 文件输入都会在解析前被拒绝，并返回解析诊断，而不是被解析；适用于任何加载该文件的 verb。

## 按文件类型寻址

| 类型          | 文件扩展名                  | 寻址模型                                                                                      |
| ------------- | --------------------------- | --------------------------------------------------------------------------------------------- |
| Markdown      | `.md`                       | 通过 slug 定位 H2 区段，通过 slug 或 `#N` 定位项目符号项，通过 `[frontmatter]` 访问 frontmatter。 |
| JSONC/JSON    | `.jsonc`, `.json`           | 对象键和数组索引；除非加引号，否则点号会拆分嵌套子段。                                           |
| JSONL         | `.jsonl`, `.ndjson`         | 顶层行地址（`L1`、`L2`、`$first`、`$last`），然后在行内按 JSONC 风格继续下钻。                   |
| YAML/.lobster | `.yaml`, `.yml`, `.lobster` | 映射键和序列索引；注释和流式样式由 YAML 文档 API 处理。                                           |

`resolve` 返回一个结构化匹配：`root`、`node`、`leaf` 或
`insertion-point`，并带有从 1 开始的行号。叶子值会以
文本和 `leafType` 的形式展示，因此插件作者可以在不依赖
各类型 AST 结构的情况下渲染预览。

## 变更约定

`set` 会写入一个具体目标：

- Markdown frontmatter 值和 `- key: value` 条目字段都是字符串叶子。Markdown 插入会追加章节、frontmatter 键或章节条目，并为已更改的文件渲染规范化的 markdown 结构。章节正文不能通过 `set` 作为整体写入。
- JSONC 叶子写入会将字符串值强制转换为现有叶子类型（`string`、有限 `number`、`true`/`false` 或 `null`）。当 JSONC/JSON/JSONL 叶子替换需要将 `<value>` 作为 JSON 解析并且可能改变形状时，请使用 `--value-json`，例如用对象替换字符串密钥引用简写。JSONC 对象和数组插入会将 `<value>` 解析为 JSON，并对普通叶子写入使用 `jsonc-parser` 编辑路径，保留注释和附近的格式。
- JSONL 叶子写入会像 JSONC 一样在行内进行强制转换。整行替换和追加会将 `<value>` 解析为 JSON。渲染后的 JSONL 会保留文件占主导的 LF/CRLF 行尾约定（按文件中新行的多数票决定，因此一个大多为 CRLF 的文件即使有少量多余的 LF 也会保持 CRLF）。
- YAML 叶子写入会强制转换为现有标量类型（`string`、有限 `number`、`true`/`false` 或 `null`）。YAML 插入会使用随附的 `yaml` 包文档 API 进行映射/序列更新。带有解析器错误的损坏 YAML 文档会在变更前被拒绝，并返回 `parse-error`。

在用户可见的写入之前，如果精确字节很重要，请先使用 `--dry-run`。JSONC 和 YAML 编辑会通过 `jsonc-parser` 或 `yaml` 文档 API 对现有文档进行补丁，因此未触及的字节通常会保留；Markdown 会在任意编辑时根据其解析后的结构重建文件，这可能会规范化已更改叶子之外的附带格式。当你希望预览为聚焦的修改前/后补丁而不是完整渲染文件时，请添加 `--diff`。

## 示例

```bash
# 验证路径（不访问文件系统）
openclaw path validate 'oc://AGENTS.md/Tools/$last/risk'

# 读取叶子节点
openclaw path resolve 'oc://gateway.jsonc/version'

# 通配符搜索
openclaw path find 'oc://session.jsonl/*/event' --file ./logs/session.jsonl

# 试运行写入
openclaw path set 'oc://gateway.jsonc/version' '2.0' --dry-run

# 将写入以统一 diff 形式进行试运行
openclaw path set 'oc://gateway.jsonc/version' '2.0' --dry-run --diff

# 应用写入
openclaw path set 'oc://gateway.jsonc/version' '2.0'

# 字节级一致性往返（诊断）
openclaw path emit ./AGENTS.md
```

更多语法示例：

```bash
# 对包含 / 或 . 的键使用引号
openclaw path resolve 'oc://config.jsonc/agents.defaults.models/"anthropic/claude-opus-4-7"/alias'

# Deep JSON/JSONC paths can use slash segments; they normalize to dotted subsegments
openclaw path set 'oc://openclaw.json/agents/list/0/tools/exec/security' 'allowlist' --dry-run

# Replace a JSONC leaf with a parsed object
openclaw path set 'oc://openclaw.json/gateway/auth/token' '{"source":"file","provider":"secrets","id":"/test"}' --value-json --dry-run

# Predicate search over JSONC children
openclaw path find 'oc://config.jsonc/plugins/[enabled=true]/id'

# 插入到 JSONC 数组中
openclaw path set 'oc://config.jsonc/items/+1' '{"id":"new","enabled":true}' --dry-run

# 插入一个 JSONC 对象键
openclaw path set 'oc://config.jsonc/plugins/+github' '{"enabled":true}' --dry-run

# 追加一个 JSONL 事件
openclaw path set 'oc://session.jsonl/+' '{"event":"checkpoint","ok":true}' --file ./logs/session.jsonl

# 解析最后一个 JSONL 值行
openclaw path resolve 'oc://session.jsonl/$last/event' --file ./logs/session.jsonl

# 解析一个 YAML 工作流步骤
openclaw path resolve 'oc://workflow.yaml/steps/0/id'

# 更新一个 YAML 标量
openclaw path set 'oc://workflow.yaml/steps/$last/id' 'classify-renamed' --dry-run

# 访问 markdown frontmatter
openclaw path resolve 'oc://AGENTS.md/[frontmatter]/name'

# 插入 markdown frontmatter
openclaw path set 'oc://AGENTS.md/[frontmatter]/+description' 'Agent instructions' --dry-run

# 查找 markdown 项目字段
openclaw path find 'oc://SKILL.md/Tools/*/send_email'

# 验证带会话作用域的路径
openclaw path validate 'oc://AGENTS.md/Tools/$last/risk?session=cron-daily'
```

## 按文件类型分类的配方

相同的五个动词适用于各种类型；寻址方案会根据
文件扩展名进行分发。

### Markdown

```text
<!-- frontmatter.md -->
---
name: drafter
description: 邮件撰写代理
tier: core
---
## 工具
- gh: GitHub CLI
- curl: HTTP 客户端
- send_email: 已启用
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

`[frontmatter]` 谓词用于定位 YAML frontmatter 块；`tools`
通过 slug 匹配 `## Tools` 标题，而条目叶节点会保留其 slug 形式，
即使源文本使用的是下划线（`send_email` 会变成 `send-email`）。

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

JSONC 的编辑会通过 `jsonc-parser` 进行，因此注释和空白在执行
`set` 后仍会保留。请先使用 `--dry-run` 运行，以便在提交前检查字节内容。
`.json` 文件使用与 `.jsonc` 相同的适配器和编辑路径。

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

每一行都是一条记录。当你不知道行号时，可以通过谓词（`[event=action]`）进行寻址；
当你知道行号时，则可以通过规范的 `LN` 段进行寻址。
`.ndjson` 文件使用与 `.jsonl` 相同的适配器。

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

YAML 使用的是 `yaml` 包的 `Document` API，而不是手写解析器，
因此普通的 parse/emit 往返会保留注释和编写时的结构形状；同时解析后的路径
会使用与 JSONC 相同的 map-key / sequence-index 模型。相同的适配器也处理
`.yaml`、`.yml` 和 `.lobster` 文件。

## 子命令参考

### `resolve <oc-path>`

读取单个叶子或节点。不接受通配符——这些请使用 `find`。匹配成功时退出码为 `0`，干净地未命中时为 `1`，解析错误或拒绝的模式为 `2`。

```bash
openclaw path resolve 'oc://AGENTS.md/tools/gh/risk' --human
openclaw path resolve 'oc://gateway.jsonc/server/port' --json
```

### `find <pattern>`

枚举通配符 / 谓词 / 联合模式的每一个匹配项。至少有一个匹配项时退出码为 `0`，零个匹配项时为 `1`。文件槽位的通配符会被拒绝，并返回 `OC_PATH_FILE_WILDCARD_UNSUPPORTED`——请传入一个具体文件（多文件 glob 是后续特性）。

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

当有效时退出码为 `0`，无效时为 `1`（带结构化的 `code` 和 `message`），参数错误时为 `2`。

### `emit <file>`

通过按类型对应的解析器和输出器对文件进行往返处理。对于格式正确的文件，输出应与输入逐字节一致；任何差异都表明解析器存在 bug，或者触发了哨兵。此命令有助于在真实世界输入上调试底层行为。

```bash
openclaw path emit ./AGENTS.md
openclaw path emit ./gateway.jsonc --json
```

## 退出码

| 代码 | 含义                                                                     |
| ---- | ------------------------------------------------------------------------ |
| `0`  | 成功。（`resolve` / `find`：至少有一个匹配项。`set`：写入成功。）        |
| `1`  | 无匹配项，或 `set` 被基础设施拒绝（非系统级错误）。                        |
| `2`  | 参数或解析错误。                                                         |

## 输出模式

`openclaw path` 会感知 TTY：在终端上输出人类可读内容，在 stdout 被管道传递或重定向时输出 JSON。`--json` 和 `--human` 会覆盖自动检测。

## 说明

- `set` 通过 substrate 的 emit 路径写入字节，该路径会自动应用
  redaction-sentinel 守卫。携带
  `__OPENCLAW_REDACTED__`（原样或作为子字符串）的叶子在写入
  时会被拒绝。
- JSONC 解析和叶子编辑使用插件本地的 `jsonc-parser`
  依赖，因此在普通的叶子写入时会保留注释和格式，而不是走
  手写的解析/重渲染路径。
- `path` 不感知最后已知良好（LKG）配置的跟踪或恢复；
  该生命周期由别处负责。如果你通过 `path` 编辑的文件也受到 LKG 跟踪，
  下一次配置读取会决定是提升还是恢复它；将 `path` 编辑视为对该文件的任何其他直接写入。

## 相关

- [CLI 参考](/cli)
