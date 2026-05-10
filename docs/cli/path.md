---
summary: "openclaw path 的 CLI 参考（通过 `oc://` 寻址方案检查并编辑工作区文件）"
read_when:
  - 你想从终端读取或写入工作区文件中的某个叶子节点
  - 你正在基于工作区状态编写脚本，并希望使用一种稳定、与类型无关的寻址方案
  - 你正在调试一个 `oc://` 路径（验证语法，查看它会解析到哪里）
title: "路径"
---

# `openclaw path`

由插件提供的 shell 访问能力，针对 `oc://` 定位基底：一种按类型分派的路径方案，用于检查和编辑可寻址的工作区文件（markdown、jsonc、jsonl）。自托管者、插件作者和编辑器扩展可用它来读取、查找或更新某个狭窄位置，而无需为每种文件手写解析器。

CLI 与该基底公开的动词保持一致：

- `resolve` 是具体且单一匹配的。
- `find` 是用于通配符、并集、谓词和位置展开的多匹配动词。
- `set` 仅接受具体路径或插入标记；通配符模式会在写入前被拒绝。

`path` 由捆绑的可选 `oc-path` 插件提供。在首次使用前启用它：

```bash
openclaw plugins enable oc-path
```

## 为什么使用它

OpenClaw 状态分散在可人工编辑的 markdown、带注释的 JSONC 配置，以及只追加的 JSONL 日志中。Shell 脚本、钩子和代理经常只需要这些文件中的一个小值：一个 frontmatter 键、一个插件设置、一条日志记录字段，或某个命名部分下的一个项目符号。

`openclaw path` 为这些调用方提供了稳定地址，而不是针对每种文件都临时使用 grep、正则或解析器。同一个 `oc://` 路径可以从终端进行验证、解析、搜索、试运行和写入，这让窄范围自动化更易审查，也更安全可重放。尤其适合在保留其余文件注释、换行符和周边格式的同时，只更新一个叶子节点的场景。

当你要处理的内容有逻辑地址，但物理文件形态会变化时，就应使用它：

- 某个钩子想从带注释的 JSONC 中读取一个设置，同时在写回时不丢失注释。
- 某个维护脚本想在 JSONL 日志中查找每个匹配的事件字段，而无需把整份日志加载到自定义解析器里。
- 某个编辑器扩展想按 slug 跳转到 markdown 的某个章节或项目符号，然后渲染它实际解析到的精确行。
- 某个代理想在应用之前试运行一次小型工作区编辑，并在审查中能看到变更字节。

对于普通的整文件编辑、富配置迁移，或内存特定写入，你大概不需要 `openclaw path`。这些应该使用所属命令或插件。`path` 适用于那些小而可寻址的文件操作，在这类场景下，可复现的终端命令比另一个定制解析器更清晰。

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

在 CI 或预检脚本中于脚本读写之前验证路径：

```bash
openclaw path validate 'oc://AGENTS.md/tools/$last/risk'
```

这些命令都设计成可以直接复制到 shell 脚本中。调用方需要结构化输出时使用 `--json`，当人类在检查结果时使用 `--human`。

## 工作原理

`openclaw path` 做四件事：

1. 将 `oc://` 地址解析为槽位：文件、章节、项目、字段，以及可选会话。
2. 从目标扩展名（`.md`、`.jsonc`、`.jsonl` 及相关别名）中选择对应的文件类型适配器。
3. 将槽位映射到该文件类型的 AST：markdown 标题/项目、JSONC 对象键/数组索引，或 JSONL 行记录。
4. 对于 `set`，通过同一个适配器输出编辑后的字节，因此文件中未触及的部分在该类型支持的情况下可保留其注释、换行符和附近格式。

`resolve` 和 `set` 要求一个具体目标。`find` 是探索性动词：它会把通配符、并集、谓词和序数展开为具体匹配，供你在决定写入哪一个之前检查。

## 子命令

| 子命令                 | 目的                                                                         |
| ----------------------- | ---------------------------------------------------------------------------- |
| `resolve <oc-path>`     | 打印路径处的具体匹配（或“未找到”）。                                         |
| `find <pattern>`        | 枚举通配符 / 并集 / 谓词路径的匹配项。                                       |
| `set <oc-path> <value>` | 在具体路径上写入一个叶子或插入目标。支持 `--dry-run`。                       |
| `validate <oc-path>`    | 仅解析；打印结构分解（文件 / 章节 / 项目 / 字段）。                           |
| `emit <file>`           | 通过 `parseXxx` + `emitXxx` 对文件进行往返（字节保真诊断）。                 |

## 全局标志

| 标志            | 目的                                                                     |
| --------------- | ------------------------------------------------------------------------ |
| `--cwd <dir>`   | 以该目录解析文件槽位（默认：`process.cwd()`）。                           |
| `--file <path>` | 覆盖文件槽位解析后的路径（绝对访问）。                                    |
| `--json`        | 强制 JSON 输出（当 stdout 不是 TTY 时默认启用）。                         |
| `--human`       | 强制人类可读输出（当 stdout 是 TTY 时默认启用）。                         |
| `--dry-run`     | （仅用于 `set`）打印将要写入但不会实际写入的字节。                         |

## `oc://` 语法

```
oc://FILE/SECTION/ITEM/FIELD?session=SCOPE
```

槽位规则：`field` 需要 `item`，而 `item` 需要 `section`。在这四个槽位中：

- **带引号的片段** — `"a/b.c"` 可穿过 `/` 和 `.` 分隔符。
  内容按字节字面量处理；引号内不允许出现 `"` 和 `\`。
  文件槽位也支持引号：`oc://"skills/email-drafter"/Tools/$last`
  会将 `skills/email-drafter` 视为单个文件路径。
- **谓词** — `[k=v]`、`[k!=v]`、`[k<v]`、`[k<=v]`、`[k>v]`、
  `[k>=v]`。数值运算要求两侧都可转换为有限数字。
- **并集** — `{a,b,c}` 匹配任一候选项。
- **通配符** — `*`（单个子段）和 `**`（零个或多个，
  递归）。`find` 接受这些；`resolve` 和 `set` 会因其含糊而拒绝它们。
- **位置** — `$last` 解析为最后一个索引 / 最后声明的键。
- **序数** — `#N` 表示按文档顺序的第 N 个匹配。
- **插入标记** — `+`、`+key`、`+nnn` 用于键 / 索引
  插入（配合 `set` 使用）。
- **会话作用域** — `?session=cron-daily` 等。与槽位
  嵌套正交。会话值是原始值，不进行百分号解码；它们不能包含
  控制字符或保留查询分隔符（`?`、`&`、`%`）。

保留字符（`?`、`&`、`%`）在带引号、谓词或并集
片段之外会被拒绝。控制字符（U+0000-U+001F、U+007F）在任何地方都会被拒绝，
包括 `session` 查询值。

`formatOcPath(parseOcPath(path)) === path` 对规范路径是有保证的。
非规范查询参数会被忽略，除了第一个非空的 `session=` 值。

## 按文件类型寻址

| Kind       | Addressing model                                                                          |
| ---------- | ----------------------------------------------------------------------------------------- |
| Markdown   | 通过 slug 定位 H2 章节，通过 slug 或 `#N` 定位项目符号，frontmatter 通过 `[frontmatter]`。 |
| JSONC/JSON | 对象键和数组索引；除非加引号，否则点号会拆分嵌套子段。                                    |
| JSONL      | 顶层行地址（`L1`、`L2`、`$last`），然后在该行内按 JSONC 风格深入。                        |

`resolve` 返回结构化匹配：`root`、`node`、`leaf` 或
`insertion-point`，并带有从 1 开始的行号。叶子值会以文本形式呈现，并附带
`leafType`，这样插件作者就可以在不依赖各类型 AST 形态的情况下渲染预览。

## 变更约定

`set` 会写入一个具体目标：

- Markdown frontmatter 值和 `- key: value` 项目字段是字符串叶子。
  Markdown 插入会追加章节、frontmatter 键或章节项目，并为变更后的文件呈现规范化 markdown 形态。
- JSONC 叶子写入会将字符串值强制转换为现有叶子类型
  （`string`、有限 `number`、`true`/`false` 或 `null`）。JSONC 对象和数组
  插入会将 `<value>` 解析为 JSON，并对普通叶子写入使用 `jsonc-parser` 的编辑路径，
  从而保留注释和附近格式。
- JSONL 叶子写入在行内的强制转换方式与 JSONC 相同。整行替换和
  追加会将 `<value>` 解析为 JSON。渲染后的 JSONL 会保留文件的主导
  LF/CRLF 行尾约定。

在面向用户的写入前，如精确字节很重要，请先使用 `--dry-run`。该
基底在 parse/emit 往返中保持字节完全一致的输出，但一次变更可能会根据类型对编辑区域或整个文件进行规范化。

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

# 应用写入
openclaw path set 'oc://gateway.jsonc/version' '2.0'

# 字节级一致性往返（诊断）
openclaw path emit ./AGENTS.md
```

更多语法示例：

```bash
# 对包含 / 或 . 的键使用引号
openclaw path resolve 'oc://config.jsonc/agents.defaults.models/"anthropic/claude-opus-4-7"/alias'

# 在 JSONC 子项上进行谓词搜索
openclaw path find 'oc://config.jsonc/plugins/[enabled=true]/id'

# 插入到 JSONC 数组中
openclaw path set 'oc://config.jsonc/items/+1' '{"id":"new","enabled":true}' --dry-run

# 插入一个 JSONC 对象键
openclaw path set 'oc://config.jsonc/plugins/+github' '{"enabled":true}' --dry-run

# 追加一个 JSONL 事件
openclaw path set 'oc://session.jsonl/+' '{"event":"checkpoint","ok":true}' --file ./logs/session.jsonl

# 解析最后一个 JSONL 值行
openclaw path resolve 'oc://session.jsonl/$last/event' --file ./logs/session.jsonl

# 定位 markdown frontmatter
openclaw path resolve 'oc://AGENTS.md/[frontmatter]/name'

# 插入 markdown frontmatter
openclaw path set 'oc://AGENTS.md/[frontmatter]/+description' 'Agent instructions' --dry-run

# 查找 markdown 项目字段
openclaw path find 'oc://SKILL.md/Tools/*/send_email'

# 验证带会话作用域的路径
openclaw path validate 'oc://AGENTS.md/Tools/$last/risk?session=cron-daily'
```

## 按文件类型分类的配方

同样的五个动词适用于所有类型；寻址方案会根据文件扩展名进行分发。下面的示例使用 PR 描述中的固定测试数据。

### Markdown

```text
<!-- frontmatter.md -->
---
name: drafter
description: 邮件撰写代理
tier: core
---
## Tools
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

`[frontmatter]` 谓词用于定位 YAML frontmatter 块；`tools` 通过 slug 匹配 `## Tools` 标题，而条目叶子节点即使源文本使用下划线（`send_email` → `send-email`），也会保持其 slug 形式。

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

JSONC 编辑会通过 `jsonc-parser` 处理，因此注释和空白会在 `set` 之后保留。先使用 `--dry-run` 运行，以便在提交前检查字节内容。

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

每一行都是一条记录。当你不知道行号时，可以通过谓词（`[event=action]`）进行寻址；当你知道行号时，则可以通过规范化的 `LN` 段进行寻址。

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

写入一个叶子。可配合 `--dry-run` 预览将要写入的字节，而不实际触碰文件。成功写入时退出码为 `0`，若底层基础设施拒绝（例如触发了哨兵保护）则为 `1`，解析错误则为 `2`。

```bash
openclaw path set 'oc://gateway.jsonc/version' '2.0' --dry-run
openclaw path set 'oc://gateway.jsonc/version' '2.0'
openclaw path set 'oc://AGENTS.md/Tools/+gh/risk' 'low'
```

`+key` 插入标记会在目标子节点不存在时创建该命名子节点；`+nnn` 和裸 `+` 分别用于索引插入和追加插入。

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

通过各文件类型对应的解析器和发射器对文件进行往返处理。对一个正确的文件，输出应与输入字节级完全一致——任何差异都表明解析器有 bug 或触发了哨兵。对于调试真实世界输入上的底层行为很有用。

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

- `set` 通过底层的 emit 路径写入字节，该路径会自动应用重定向哨兵保护。任何携带 `__OPENCLAW_REDACTED__`（字面量或其子串）的叶子都会在写入时被拒绝。
- JSONC 解析和叶子编辑使用插件本地的 `jsonc-parser` 依赖，因此在普通叶子写入时会保留注释和格式，而不是经过手写的解析/重渲染路径。
- `path` 不了解 LKG。如果文件受 LKG 跟踪，那么下一次 observe 调用才决定是否进行 promote / recover。用于通过 LKG promote/recover 生命周期进行原子多重 set 的 `set --batch` 已与 LKG-recovery 底层机制一并规划中。

## 相关

- [CLI 参考](/cli)
