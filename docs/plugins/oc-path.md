---
summary: "捆绑的 `oc-path` 插件：为 `oc://` 工作区文件寻址方案提供 `openclaw path` CLI"
read_when:
  - 你想从终端检查或编辑工作区文件中的单个叶子节点
  - 你正在针对工作区状态编写脚本，并且需要一种稳定、与类型无关的寻址方案
  - 你正在决定是否在自托管 Gateway 上启用可选的 `oc-path` 插件
title: "OC Path 插件"
---

捆绑的 `oc-path` 插件为 [`openclaw path`](/cli/path) CLI 添加了
`oc://` 工作区文件寻址方案。它随 OpenClaw 仓库一起提供，位于
`extensions/oc-path/` 下，但默认是可选启用的——安装/构建后它会保持
未激活状态，直到你启用它为止。

`oc://` 地址指向工作区文件中的单个叶子节点（或一组通配叶子节点）。该插件目前理解四种文件类型：

- **markdown** (`.md`, `.mdx`): frontmatter、sections、items、fields
- **jsonc** (`.jsonc`, `.json5`, `.json`): 保留注释和格式
- **jsonl** (`.jsonl`, `.ndjson`): 按行组织的记录
- **yaml** (`.yaml`, `.yml`, `.lobster`): 通过 YAML 文档 API 处理 map/sequence/scalar 节点

自托管用户和编辑器扩展使用该 CLI 来读取或写入单个叶子节点，而无需直接针对 SDK 编写脚本；代理和 hooks 将其视为确定性的底层基础，因此字节级一致的往返以及重写哨兵保护会一致地应用于各种类型。

## 为什么启用它

当你希望脚本、hooks 或本地代理工具无需为每种文件形状分别发明解析器，就能精确指向工作区状态中的某个片段时，请启用 `oc-path`。一个 `oc://` 地址可以指向 markdown frontmatter 键、section 条目、JSONC 配置叶子、JSONL 事件字段，或 YAML 工作流步骤。

这对维护者工作流很重要，因为变更应该尽量小、可审计、可重复：检查一个值，查找匹配记录，预演一次写入，然后只应用该叶子节点，同时保留注释、行尾和附近格式不变。将其作为可选插件，可以为高级用户提供寻址底层能力，而不会把解析器依赖或 CLI 表面暴露带入那些从不需要它的核心安装中。

启用它的常见原因：

- **本地自动化**：shell 脚本可以使用 `openclaw path … --json` 解析或更新一个工作区值，而无需分别编写 markdown、JSONC、JSONL 和 YAML 的解析代码。
- **代理可见的编辑**：代理可以在写入前为一个被寻址的叶子节点展示 dry-run diff，这比自由格式的文件重写更容易审查。
- **编辑器集成**：编辑器可以将 `oc://AGENTS.md/tools/gh` 映射到精确的 markdown 节点和行号，而无需根据标题文本猜测。
- **诊断**：`emit` 会通过解析器和生成器对文件进行往返，因此你可以在依赖自动化编辑之前检查某种文件类型是否具备字节稳定性。

具体示例：

```bash
# 此配置中 GitHub 插件是否已启用？
openclaw path resolve 'oc://config.jsonc/plugins/github/enabled' --json

# 本次会话日志中出现了哪些 tool-call 名称？
openclaw path find 'oc://session.jsonl/[event=tool_call]/name' --json

# 这次小配置修改会写出哪些字节？
openclaw path set 'oc://config.jsonc/plugins/github/enabled' 'true' --dry-run
```

该插件有意不负责更高层语义。内存插件仍然负责内存写入，配置命令仍然负责完整的配置管理，LKG 逻辑仍然负责恢复/晋升。`oc-path` 只是更窄的寻址层和字节保留文件操作层，上层工具可以在其之上构建。

## 它运行在哪里

该插件在你执行命令的主机上，**以进程内方式运行在 `openclaw` CLI 中**。它不需要正在运行的 Gateway，也不会打开任何网络套接字——每个动词都是对你指定文件的纯转换。

插件元数据位于 `extensions/oc-path/openclaw.plugin.json`：

```json
{
  "id": "oc-path",
  "name": "OC Path",
  "activation": {
    "onStartup": false,
    "onCommands": ["path"]
  },
  "commandAliases": [{ "name": "path", "kind": "cli" }]
}
```

`onStartup: false` 让插件不进入 Gateway 的热路径。`onCommands:
["path"]` 告诉 CLI 在你第一次运行 `openclaw path …` 时再懒加载该插件，因此从不使用该动词的安装不会付出任何成本。

## 启用

```bash
openclaw plugins enable oc-path
```

如果你运行了 Gateway，请重启它，以便清单快照获取新状态。在同一主机上，直接运行 `openclaw path` 会立即生效——CLI 会按需加载该插件。

禁用方式：

```bash
openclaw plugins disable oc-path
```

## 依赖

所有解析器依赖都是插件本地的——启用 `oc-path` 不会向核心运行时引入新包：

| 依赖项         | 用途                                                                   |
| -------------- | ---------------------------------------------------------------------- |
| `commander`    | 为 `resolve`、`find`、`set`、`validate`、`emit` 进行子命令绑定。       |
| `jsonc-parser` | JSONC 解析 + 叶子节点编辑，并保留注释和尾随逗号。                       |
| `markdown-it`  | 用于 section / item / field 模型的 Markdown 标记化。                   |
| `yaml`         | 使用 YAML `Document` 进行 parse / emit / edit，并保留注释和 flow 样式。 |

JSONL 仍然是手写实现——按行解析比任何依赖都更简单，而且逐行的 JSONC 解析本来就会通过 `jsonc-parser`。

## 它提供什么

| 表面                        | 由以下内容提供                                             |
| ------------------------------ | ------------------------------------------------------- |
| `openclaw path` CLI            | `extensions/oc-path/cli-registration.ts`                |
| `oc://` parser / formatter     | `extensions/oc-path/src/oc-path/oc-path.ts`             |
| 按类型的 parse / emit / edit   | `extensions/oc-path/src/oc-path/{md,jsonc,jsonl,yaml}`  |
| 通用 resolve / find / set      | `extensions/oc-path/src/oc-path/{resolve,find,edit}.ts` |
| 重写哨兵保护                   | `extensions/oc-path/src/oc-path/sentinel.ts`            |

目前 CLI 是唯一公开表面。底层基础动词对插件是私有的；消费者使用 CLI（或基于 SDK 自行构建插件）。

## 与其他插件的关系

- **`memory-*`**：内存写入通过 memory 插件进行，而不是 `oc-path`。`oc-path` 是通用文件底层基础；memory 插件在其之上叠加自身语义。
- **LKG**：`path` 不知道 Last-Known-Good 配置恢复。如果文件受 LKG 跟踪，那么下一次 `observe` 调用会决定是晋升还是恢复；通过 `set --batch` 在 LKG 晋升/恢复生命周期中实现原子多重设置，计划与 LKG 恢复底层基础一起推出。

## 安全性

`set` 通过底层基础的 emit 路径写入原始字节，这会自动应用重写哨兵保护。包含
`__OPENCLAW_REDACTED__`（原样或作为子串）的叶子节点会在写入时被拒绝，并返回
`OC_EMIT_SENTINEL`。CLI 还会清理它输出的任何人类可读或 JSON 输出中的字面哨兵，将其替换为 `[REDACTED]`，这样终端捕获和管道就不会泄露该标记。

## 相关内容

- [`openclaw path` CLI 参考](/cli/path)
- [管理插件](/plugins/manage-plugins)
- [构建插件](/plugins/building-plugins)
