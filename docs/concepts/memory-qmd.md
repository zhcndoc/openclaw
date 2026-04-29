---
summary: "带有 BM25、向量、重排序和查询扩展的本地优先搜索侧车"
title: "QMD memory engine"
read_when:
  - 你想将 QMD 作为你的记忆后端来设置
  - 你希望使用高级记忆功能，例如重排序或额外的索引路径
---

[QMD](https://github.com/tobi/qmd) 是一个本地优先的搜索侧车，与 OpenClaw 一起运行。它将 BM25、向量搜索和重排序组合在一个二进制文件中，并且可以索引超出你工作区记忆文件之外的内容。

## 它相较于内置引擎新增了什么

- **重排序和查询扩展**，以获得更好的召回。
- **索引额外目录** —— 项目文档、团队笔记、磁盘上的任何内容。
- **索引会话转录** —— 回忆更早的对话。
- **完全本地** —— 使用可选的 node-llama-cpp 运行时包运行，并自动下载 GGUF 模型。
- **自动回退** —— 如果 QMD 不可用，OpenClaw 会无缝回退到内置引擎。

## 快速开始

### 先决条件

- 安装 QMD：`npm install -g @tobilu/qmd` 或 `bun install -g @tobilu/qmd`
- 允许扩展的 SQLite 构建版本（在 macOS 上使用 `brew install sqlite`）。
- QMD 必须位于 gateway 的 `PATH` 中。
- macOS 和 Linux 开箱即用。Windows 最好通过 WSL2 支持。

### 启用

```json5
{
  memory: {
    backend: "qmd",
  },
}
```

OpenClaw 会在 `~/.openclaw/agents/<agentId>/qmd/` 下创建一个自包含的 QMD home，并自动管理侧车生命周期——集合、更新和嵌入运行都会为你处理好。它优先使用当前的 QMD 集合和 MCP 查询形状，但在需要时仍会回退到备用的集合模式标志和较旧的 MCP 工具名称。启动时的协调还会在同名的旧 QMD 集合仍然存在时，将过期的受管集合恢复为其规范模式。

## 侧车的工作方式

- OpenClaw 会根据你的工作区记忆文件以及任何已配置的 `memory.qmd.paths` 创建集合，然后在 QMD 管理器打开时以及之后定期运行 `qmd update`（默认每 5 分钟一次）。这些刷新通过 QMD 子进程执行，而不是通过进程内的文件系统遍历。语义模式还会运行 `qmd embed`。
- 默认的工作区集合会跟踪 `MEMORY.md` 以及 `memory/` 目录树。小写的 `memory.md` 不会作为根记忆文件被索引。
- QMD 自带的扫描器会忽略隐藏路径和常见的依赖/构建目录，例如 `.git`、`.cache`、`node_modules`、`vendor`、`dist` 和 `build`。gateway 启动时默认不会初始化 QMD，因此冷启动会避免在首次使用记忆之前导入记忆运行时或创建长生命周期 watcher。
- 如果你仍然希望在 gateway 启动时刷新，请将 `memory.qmd.update.startup` 设置为 `idle` 或 `immediate`。这个可选的启动刷新使用一次性的 QMD 子进程路径，而不会创建完整的长生命周期进程内 watcher。
- 搜索会使用配置的 `searchMode`（默认：`search`；也支持 `vsearch` 和 `query`）。`search` 仅使用 BM25，因此在该模式下 OpenClaw 会跳过语义向量就绪探测和嵌入维护。如果某种模式失败，OpenClaw 会改用 `qmd query` 重试。
- 对于支持多集合过滤器的 QMD 版本，OpenClaw 会把同源集合分组到一次 QMD 搜索调用中。较旧的 QMD 版本则保留兼容的按集合回退方式。
- 如果 QMD 完全失败，OpenClaw 会回退到内置 SQLite 引擎。连续的聊天轮次尝试会在打开失败后短暂退避，这样缺失的二进制文件或损坏的侧车依赖就不会引发重试风暴；`openclaw memory status` 和一次性 CLI 探测仍会直接重新检查 QMD。

<Info>
第一次搜索可能会很慢——QMD 会在首次运行 `qmd query` 时自动下载用于重排序和查询扩展的 GGUF 模型（约 2 GB）。
</Info>

## 搜索性能与兼容性

OpenClaw 会让 QMD 搜索路径同时兼容当前和较旧的 QMD 安装。

在启动时，OpenClaw 会针对每个管理器检查一次已安装的 QMD 帮助文本。如果二进制文件声明支持多个集合过滤器，OpenClaw 会用一条命令搜索所有同源集合：

```bash
qmd search "router notes" --json -n 10 -c memory-root-main -c memory-dir-main
```

这样就避免了为每个持久记忆集合都启动一个 QMD 子进程。会话转录集合保持在其自己的源组中，因此混合 `memory` + `sessions` 的搜索仍然会从两个来源获得结果多样化输入。

较旧的 QMD 构建版本只接受一个集合过滤器。当 OpenClaw 检测到这些版本之一时，它会保留兼容路径，并在合并和去重结果之前分别搜索每个集合。

要手动检查已安装的契约，请运行：

```bash
qmd --help | grep -i collection
```

当前 QMD 帮助说明集合过滤器可以针对一个或多个集合。较旧的帮助通常描述的是单个集合。

## 模型覆盖

QMD 的模型环境变量会原样从 gateway 进程传递过去，因此你可以在不新增 OpenClaw 配置的情况下全局调整 QMD：

```bash
export QMD_EMBED_MODEL="hf:Qwen/Qwen3-Embedding-0.6B-GGUF/Qwen3-Embedding-0.6B-Q8_0.gguf"
export QMD_RERANK_MODEL="/absolute/path/to/reranker.gguf"
export QMD_GENERATE_MODEL="/absolute/path/to/generator.gguf"
```

更改嵌入模型后，请重新运行嵌入，使索引与新的向量空间保持一致。

## 索引额外路径

将 QMD 指向额外目录，使其可搜索：

```json5
{
  memory: {
    backend: "qmd",
    qmd: {
      paths: [{ name: "docs", path: "~/notes", pattern: "**/*.md" }],
    },
  },
}
```

来自额外路径的片段会在搜索结果中显示为 `qmd/<collection>/<relative-path>`。`memory_get` 能理解这个前缀，并从正确的集合根目录读取。

## 索引会话转录

启用会话索引以回忆更早的对话：

```json5
{
  memory: {
    backend: "qmd",
    qmd: {
      sessions: { enabled: true },
    },
  },
}
```

转录会被导出为经过清理的 User/Assistant 回合，并存入 `~/.openclaw/agents/<id>/qmd/sessions/` 下的专用 QMD 集合。

## 搜索范围

默认情况下，QMD 搜索结果会在 direct 和 channel 会话中显示（不包括 group）。配置 `memory.qmd.scope` 可更改这一点：

```json5
{
  memory: {
    qmd: {
      scope: {
        default: "deny",
        rules: [{ action: "allow", match: { chatType: "direct" } }],
      },
    },
  },
}
```

当 scope 拒绝一次搜索时，OpenClaw 会记录一条带有派生 channel 和 chat type 的警告，这样空结果会更容易排查。

## 引用

当 `memory.citations` 为 `auto` 或 `on` 时，搜索片段会包含一个 `Source: <path#line>` 页脚。将 `memory.citations = "off"` 可省略该页脚，同时仍在内部将路径传递给 agent。

## 何时使用

当你需要以下能力时，请选择 QMD：

- 重排序，以获得更高质量的结果。
- 搜索工作区之外的项目文档或笔记。
- 回忆过去的会话对话。
- 完全本地搜索，不需要 API 密钥。

对于更简单的设置，[内置引擎](/concepts/memory-builtin) 就很好用，而且无需额外依赖。

## 故障排查

**找不到 QMD？** 确保二进制文件位于 gateway 的 `PATH` 中。如果 OpenClaw 作为服务运行，请创建一个符号链接：
`sudo ln -s ~/.bun/bin/qmd /usr/local/bin/qmd`。

如果 `qmd --version` 在你的 shell 中可用，但 OpenClaw 仍然报告 `spawn qmd ENOENT`，那么 gateway 进程的 `PATH` 很可能与你的交互式 shell 不同。请显式指定二进制文件：

```json5
{
  memory: {
    backend: "qmd",
    qmd: {
      command: "/absolute/path/to/qmd",
    },
  },
}
```

在安装 QMD 的环境中使用 `command -v qmd`，然后再通过 `openclaw memory status --deep` 重新检查。

**第一次搜索非常慢？** QMD 会在首次使用时下载 GGUF 模型。使用 OpenClaw 所用的相同 XDG 目录，通过 `qmd query "test"` 进行预热。

**搜索期间出现很多 QMD 子进程？** 如果可能，请更新 QMD。只有当已安装的 QMD 声明支持多个 `-c` 过滤器时，OpenClaw 才会针对同源多集合搜索使用一个进程；否则，为了正确性，它会保留较旧的按集合回退方式。

**仅 BM25 的 QMD 仍在尝试构建 llama.cpp？** 将 `memory.qmd.searchMode = "search"`。OpenClaw 会将该模式视为仅词法模式，不会运行 QMD 向量状态探测或嵌入维护，并将语义就绪检查留给 `vsearch` 或 `query` 配置。

**搜索超时？** 增加 `memory.qmd.limits.timeoutMs`（默认：4000ms）。在较慢的硬件上可设置为 `120000`。

**群聊中结果为空？** 检查 `memory.qmd.scope` —— 默认只允许 direct 和 channel 会话。

**根记忆搜索突然变得过于宽泛？** 重启 gateway，或等待下一次启动协调。OpenClaw 在检测到同名冲突时，会将过期的受管集合恢复为规范的 `MEMORY.md` 和 `memory/` 模式。

**工作区可见的临时仓库导致 `ENAMETOOLONG` 或索引损坏？** 目前 QMD 遍历遵循底层 QMD 扫描器的行为，而不是 OpenClaw 内置的符号链接规则。请将临时 monorepo 检出放在隐藏目录（如 `.tmp/`）下，或放在已索引 QMD 根目录之外，直到 QMD 提供无循环安全的遍历或显式排除控制。

## 配置

完整配置范围（`memory.qmd.*`）、搜索模式、更新间隔、范围规则以及所有其他选项，请参阅
[记忆配置参考](/reference/memory-config)。

## 相关内容

- [记忆概览](/concepts/memory)
- [内置记忆引擎](/concepts/memory-builtin)
- [Honcho 记忆](/concepts/memory-honcho)
