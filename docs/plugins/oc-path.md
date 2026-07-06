---
summary: "捆绑的 `oc-path` 插件：为 `oc://` 工作区文件寻址方案提供 `openclaw path` CLI"
read_when:
  - 你想从终端检查或编辑工作区文件中的单个叶子节点
  - 你正在针对工作区状态编写脚本，并且需要一种稳定、与类型无关的寻址方案
  - 你正在决定是否在自托管 Gateway 上启用可选的 `oc-path` 插件
title: "OC Path 插件"
---

捆绑的 `oc-path` 插件为 `oc://` 工作区文件寻址方案添加了 [`openclaw path`](/cli/path) CLI。它随 OpenClaw 仓库中的 `extensions/oc-path/` 一起提供，但默认是可选启用的：安装/构建后它会保持未启用状态，直到你将其打开。

`oc://` 地址指向工作区文件中的单个叶子节点（或一组通配符叶子节点）。该插件支持四种文件类型：

- **markdown** (`.md`)：frontmatter、sections、items、fields
- **jsonc** (`.jsonc`, `.json`): 注释和格式会被保留
- **jsonl** (`.jsonl`, `.ndjson`): 按行组织的记录
- **yaml** (`.yaml`, `.yml`, `.lobster`): 通过
  `yaml` 包的 `Document` API 处理 map/sequence/scalar 节点

自托管用户和编辑器扩展使用该 CLI 来读写单个叶子节点，而无需直接针对 SDK 编写脚本；代理和钩子则将其视为一种确定性的底层基础设施，因此字节级一致的往返转换以及 redaction
sentinel 守卫会在所有类型上统一适用。有关完整语法、逐个动词的标志列表，以及按文件类型分类的示例，请参见
[CLI 参考](/cli/path)；本页说明为什么以及如何启用该插件。

## 为什么启用它

当脚本、钩子或本地代理工具需要指向工作区状态中的某个精确位置，而不想为每种文件形态各写一套专用解析器时，就启用 `oc-path`。一个 `oc://` 地址可以表示 markdown frontmatter 键、某个节项、JSONC 配置叶子节点、JSONL 事件字段，或者 YAML 工作流步骤。

这对于维护者工作流很重要，因为这类变更应该保持小、可审计、可重复：检查一个值，找到匹配记录，先 dry-run 一次写入，然后只应用那个叶子节点，同时保留注释、行尾和附近的格式不变。

启用它的常见原因：

- **本地自动化**：shell 脚本使用 `openclaw path … --json` 解析或更新一个工作区值，而不是分别编写 markdown、JSONC、JSONL 和 YAML 的解析代码。
- **代理可见的编辑**：代理在写入前会为一个已定位的叶子节点展示 dry-run diff，这比自由形式的文件重写更容易审查。
- **编辑器集成**：编辑器将 `oc://AGENTS.md/tools/gh` 映射到确切的 markdown 节点和行号，而不是根据标题文本猜测。
- **诊断**：`emit` 会让文件经过解析器和生成器再回到原样，因此你可以在依赖自动化编辑之前检查某种文件是否按字节稳定。

```bash
# 此配置中 GitHub 插件是否已启用？
openclaw path resolve 'oc://config.jsonc/plugins/github/enabled' --json

# 本次会话日志中出现了哪些 tool-call 名称？
openclaw path find 'oc://session.jsonl/[event=tool_call]/name' --json

# 这次小配置修改会写出哪些字节？
openclaw path set 'oc://config.jsonc/plugins/github/enabled' 'true' --dry-run
```

`oc-path` 有意不负责更高层语义。内存插件仍然负责内存写入，配置命令仍然负责完整的配置管理，而 last-known-good（LKG）配置恢复仍然负责恢复/提升。`oc-path` 只是更高层工具可以围绕其构建的、用于精确定位且保持字节不变的文件操作层。

## 它运行在哪里

该插件**以内嵌进程的方式运行在 `openclaw` CLI 内部**，并在你执行命令的主机上运行。它不需要运行中的 Gateway，也不会打开任何网络套接字；每个动词都是对你指定文件的纯转换。

插件元数据位于 `extensions/oc-path/openclaw.plugin.json`：

```json
{
  "id": "oc-path",
  "name": "OC 路径",
  "activation": {
    "onStartup": false,
    "onCommands": ["path"]
  },
  "commandAliases": [{ "name": "path", "kind": "cli" }]
}
```

`onStartup: false` 可将插件排除在 Gateway 的启动路径之外。  
`commandAliases` 和 `activation.onCommands` 会告诉 CLI 在你第一次运行 `openclaw path …` 时按需加载该插件，因此从不使用该动词的安装不会承担任何成本。

## 启用

```bash
openclaw plugins enable oc-path
```

重启 Gateway（如果你在运行它）以便让清单快照获取到新的
状态。裸的 `openclaw path` 调用会在同一主机上立即生效；
CLI 会按需加载该插件。

禁用方式：

```bash
openclaw plugins disable oc-path
```

## 依赖

所有解析器依赖都仅限于插件本地；启用 `oc-path` 不会将新包引入核心运行时：

| 依赖项         | 用途                                                                   |
| -------------- | ---------------------------------------------------------------------- |
| `commander`    | `resolve`、`find`、`set`、`validate`、`emit` 的子命令连接。    |
| `jsonc-parser` | 带注释和保留尾随逗号的 JSONC 解析和叶子编辑。     |
| `markdown-it`  | 用于 section / item / field 模型的 Markdown 词法分析。            |
| `yaml`         | 带注释和保留 flow style 的 YAML `Document` 解析 / 生成 / 编辑。            |

JSONL 仍然采用手工实现：按行解析比任何依赖都更简单，而且逐行解析本身已经通过 `jsonc-parser` 进行。

## 它提供什么

| 表面                        | 由以下内容提供                                             |
| ------------------------------ | ------------------------------------------------------- |
| `openclaw path` CLI            | `extensions/oc-path/cli-registration.ts`                |
| `oc://` 解析器 / 格式化器      | `extensions/oc-path/src/oc-path/oc-path.ts`             |
| 按类型的 parse / emit / edit   | `extensions/oc-path/src/oc-path/{md,jsonc,jsonl,yaml}`  |
| 通用 resolve / find / set      | `extensions/oc-path/src/oc-path/{resolve,find,edit}.ts` |
| 重写哨兵保护                   | `extensions/oc-path/src/oc-path/sentinel.ts`            |

目前 CLI 是唯一公开的表面。底层动词对插件是私有的；使用者通过 CLI（或基于 SDK 自行构建插件）来使用。

## 与其他插件的关系

- **`memory-*`**：内存写入通过 memory 插件进行，而不是通过
  `oc-path`。`oc-path` 是一个通用的文件底层层；memory 插件在其之上叠加
  自己的语义。
- **LKG**：`path` 不了解 last-known-good 配置恢复。如果你通过 `path` 编辑的
  文件也被 LKG 跟踪，那么下一个配置 observe
  周期会决定是提升还是恢复它；将一次 `path` 编辑视为对该文件的任何其他直接写入。

## 安全性

`set` 通过底层基础的 emit 路径写入原始字节，这会自动应用重写哨兵保护。包含
`__OPENCLAW_REDACTED__`（原样或作为子串）的叶子节点会在写入时被拒绝，并返回
`OC_EMIT_SENTINEL`。CLI 还会清理它输出的任何人类可读或 JSON 输出中的字面哨兵，将其替换为 `[REDACTED]`，这样终端捕获和管道就不会泄露该标记。

## 相关内容

- [`openclaw path` CLI 参考](/cli/path)
- [管理插件](/plugins/manage-plugins)
- [构建插件](/plugins/building-plugins)
