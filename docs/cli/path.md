---
summary: "openclaw path 的 CLI 参考（通过 `oc://` 寻址方案检查并编辑工作区文件）"
read_when:
  - 你想从终端读取或写入工作区文件中的某个叶子节点
  - 你正在基于工作区状态编写脚本，并希望使用一种稳定、与类型无关的寻址方案
  - 你正在调试一个 `oc://` 路径（验证语法，查看它会解析到哪里）
title: "路径"
---

# `openclaw path`

对 `oc://` 寻址基础设施的 Shell 级访问 —— 一种通用的、
按类型分派的路径方案，用于检查和有针对性地编辑工作区
文件（markdown、jsonc、jsonl、yaml）。自托管用户和编辑器扩展用
它来读取或写入工作区文件中的单个叶子节点，而无需直接基于 SDK
编写脚本。

## 子命令

| 子命令                 | 目的                                                                         |
| ----------------------- | ---------------------------------------------------------------------------- |
| `resolve <oc-path>`     | 打印该路径上的匹配项（或“未找到”）。                                          |
| `find <pattern>`        | 枚举通配符 / 谓词路径的匹配项。                                               |
| `set <oc-path> <value>` | 在该路径写入一个叶子节点。支持 `--dry-run`。                                 |
| `validate <oc-path>`    | 仅解析——打印结构分解（文件 / 章节 / 项 / 字段）。                             |
| `emit <file>`           | 通过 `parseXxx` + `emitXxx` 对文件进行往返处理（字节级一致性诊断）。          |

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

槽位规则 — `field` 需要 `item`，`item` 需要 `section`。在全部
四个槽位中：

- **带引号的段** — `"a/b.c"` 会保留 `/` 和 `.` 分隔符。
  `"\\"` 和 `"\""` 是引号内部唯一允许的转义。
  文件槽位也支持引号感知：`oc://"skills/email-drafter"/Tools/-1`
  会将 `skills/email-drafter` 视为单个文件路径。
- **谓词** — `[k=v]`、`[k!=v]`、`[k*=v]`、`[k^=v]`、`[k$=v]`、
  `[k<v]`、`[k<=v]`、`[k>v]`、`[k>=v]`。
- **并集** — `{a,b,c}` 匹配任一备选项。
- **通配符** — `*`（单个子段）和 `**`（零个或多个，
  递归）。`find` 接受这些；`resolve` 和 `set` 会将其视为
  歧义并拒绝。
- **位置** — `$first`、`$last`、`-N`（从末尾数第 N 个）。
- **序号** — `#N` 表示第 N 个匹配项。
- **插入标记** — `+`、`+key`、`+nnn`，用于按键 / 按索引
  插入（与 `set` 一起使用）。
- **会话作用域** — `?session=cron:daily` 等。与槽位
  嵌套相互独立。

保留字符（`?`、`&`、`%`）如果出现在带引号、谓词或并集
段之外，会被拒绝。控制字符（U+0000–U+001F、U+007F）在任何位置都会
被拒绝。

## 示例

```bash
# 验证路径（不访问文件系统）
openclaw path validate 'oc://AGENTS.md/Tools/-1/risk'

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

## 退出码

| 代码 | 含义                                                                     |
| ---- | ------------------------------------------------------------------------ |
| `0`  | 成功。（`resolve` / `find`：至少有一个匹配项。`set`：写入成功。）        |
| `1`  | 无匹配项，或 `set` 被基础设施拒绝（非系统级错误）。                        |
| `2`  | 参数或解析错误。                                                         |

## 输出模式

`openclaw path` 会感知 TTY：在终端上输出人类可读内容，在 stdout 被管道
传递或重定向时输出 JSON。`--json` 和 `--human` 会覆盖
自动检测。

## 说明

- `set` 通过基础设施的 emit 路径写入原始字节，该路径会自动应用
  redaction-sentinel 防护。若某个叶子节点携带
  `__OPENCLAW_REDACTED__`（原样或作为子串），在写入时会被拒绝。
- 当前对 JSONC 文件执行 `set` 时，在修改叶子节点后会重新渲染文件
  （丢弃注释和尾随逗号格式）。读取路径的往返结果
  是字节完全一致的。未来计划增加一个通过写入时保留注释的
  字节级拼接编辑器。
- `path` 不了解 LKG。如果文件受 LKG 跟踪，下一次
  observe 调用会决定是否进行 promote / recover。用于通过 LKG 的
  promote/recover 生命周期进行原子多重写入的 `set --batch` 功能
  已与 LKG-recovery 基础设施一并列入计划。

## 相关

- [CLI 参考](/cli)
