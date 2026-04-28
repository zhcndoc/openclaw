---
summary: "带有 BM25、向量、重排序和查询扩展的本地优先搜索侧车"
title: "QMD 内存引擎"
read_when:
  - 你想将 QMD 设置为内存后端
  - 你需要重排序或额外索引路径等高级内存功能
---

[QMD](https://github.com/tobi/qmd) 是一个本地优先的搜索侧车，运行在
OpenClaw 旁边。它将 BM25、向量搜索和重排序结合在一个
二进制文件中，并且可以索引超出工作区内存文件范围的内容。

## 相比内置引擎的增加内容

- **重排序和查询扩展**以获得更好的召回率。
- **索引额外目录** -- 项目文档、团队笔记、磁盘上的任何内容。
- **索引会话转录** -- 召回早期的对话。
- **完全本地化** -- 通过 Bun + node-llama-cpp 运行，自动下载 GGUF 模型。
- **自动回退** -- 如果 QMD 不可用，OpenClaw 会无缝回退到内置引擎。

## 快速开始

### 前置条件

- 安装 QMD：`npm install -g @tobilu/qmd` 或 `bun install -g @tobilu/qmd`
- 允许扩展的 SQLite 构建（macOS 上使用 `brew install sqlite`）。
- QMD 必须位于网关的 `PATH` 中。
- macOS 和 Linux 开箱即用。Windows 最好通过 WSL2 支持。

### 启用

```json5
{
  memory: {
    backend: "qmd",
  },
}
```

OpenClaw 在 `~/.openclaw/agents/<agentId>/qmd/` 下创建一个自包含的 QMD 主目录，并自动管理侧车生命周期——集合、更新和嵌入运行都会为你处理。
它优先使用当前的 QMD 集合和 MCP 查询形状，但在需要时仍会回退到
其他集合模式标志和较旧的 MCP 工具名称。
启动时协调还会在检测到同名的旧 QMD 集合仍然存在时，
将过时的受管集合重新创建为其规范模式。

## 侧车工作原理

- OpenClaw 会根据你的工作区内存文件和任何已配置的 `memory.qmd.paths`
  创建集合，然后在启动时以及周期性地（默认每 5 分钟）运行 `qmd update`。语义模式还会运行 `qmd embed`。
- 默认的工作区集合会跟踪 `MEMORY.md` 以及 `memory/`
  树。小写的 `memory.md` 不会作为根内存文件被索引。
- 启动刷新在后台运行，因此聊天启动不会被阻塞。
- 搜索使用配置的 `searchMode`（默认：`search`；也支持
  `vsearch` 和 `query`）。`search` 仅为 BM25，因此 OpenClaw 会在该模式下跳过语义向量就绪探测和嵌入维护。如果某种模式失败，OpenClaw 会重试 `qmd query`。
- 对于声明支持多集合过滤器的 QMD 版本，OpenClaw 会将同源集合分组到一次 QMD 搜索调用中。较旧的 QMD 版本则保留兼容的逐集合回退。
- 如果 QMD 完全失败，OpenClaw 会回退到内置 SQLite 引擎。

<Info>
首次搜索可能较慢 -- QMD 会在首次运行 `qmd query` 时自动下载用于重排序和查询扩展的 GGUF 模型（约 2 GB）。
</Info>

## 搜索性能与兼容性

OpenClaw 保持 QMD 搜索路径与当前和较旧的 QMD
安装版本兼容。

启动时，OpenClaw 会针对每个管理器检查一次已安装的 QMD 帮助文本。如果
二进制文件声明支持多个集合过滤器，OpenClaw 会用一条命令搜索所有
同源集合：

```bash
qmd search "router notes" --json -n 10 -c memory-root-main -c memory-dir-main
```

这样就避免了为每个持久内存集合启动一个 QMD 子进程。
会话转录集合保持在其自己的源组中，因此混合的
`memory` + `sessions` 搜索仍然会从两个
来源获得结果多样化器输入。

较旧的 QMD 构建只接受一个集合过滤器。当 OpenClaw 检测到其中一个
构建时，它会保留兼容路径，并在合并和去重结果之前分别搜索每个集合。

要手动检查已安装的契约，请运行：

```bash
qmd --help | grep -i collection
```

当前的 QMD 帮助说明集合过滤器可以针对一个或多个集合。
较旧的帮助通常会描述单个集合。

## 模型覆盖

QMD 模型环境变量会从网关进程原样传递，因此你可以全局调整 QMD 而无需添加新的 OpenClaw 配置：

```bash
export QMD_EMBED_MODEL="hf:Qwen/Qwen3-Embedding-0.6B-GGUF/Qwen3-Embedding-0.6B-Q8_0.gguf"
export QMD_RERANK_MODEL="/absolute/path/to/reranker.gguf"
export QMD_GENERATE_MODEL="/absolute/path/to/generator.gguf"
```

更改嵌入模型后，重新运行嵌入，以便索引与新的向量空间匹配。

## 索引额外路径

将 QMD 指向附加目录以使其可搜索：

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

来自额外路径的片段在搜索结果中显示为 `qmd/<collection>/<relative-path>`。
`memory_get` 理解此前缀并从正确的集合根目录读取。

## 索引会话转录

启用会话索引以召回早期对话：

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

转录内容作为经过清理的 User/Assistant 轮次导出到 `~/.openclaw/agents/<id>/qmd/sessions/` 下的专用 QMD 集合中。

## 搜索范围

默认情况下，QMD 搜索结果显示在直接会话和频道会话中（不包括群组）。配置 `memory.qmd.scope` 以更改此设置：

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

当范围拒绝搜索时，OpenClaw 会记录一条警告，包含派生的频道和聊天类型，以便更容易调试空结果。

## 引用

当 `memory.citations` 为 `auto` 或 `on` 时，搜索片段包含 `Source: <path#line>` 页脚。设置 `memory.citations = "off"` 以省略页脚，同时仍在内部将路径传递给代理。

## 何时使用

当你需要以下内容时选择 QMD：

- 重排序以获得更高质量的结果。
- 搜索工作区外的项目文档或笔记。
- 召回过去的会话对话。
- 完全本地搜索，无需 API 密钥。

对于更简单的设置，[内置引擎](/concepts/memory-builtin) 无需额外依赖即可良好工作。

## 故障排除

**找不到 QMD？** 确保二进制文件位于网关的 `PATH` 中。如果 OpenClaw
作为服务运行，创建符号链接：
`sudo ln -s ~/.bun/bin/qmd /usr/local/bin/qmd`。

如果 `qmd --version` 在你的 shell 中可用，但 OpenClaw 仍然报告
`spawn qmd ENOENT`，则网关进程的 `PATH` 很可能与你的
交互式 shell 不同。请显式固定二进制文件：

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

在安装了 QMD 的环境中使用 `command -v qmd`，然后通过
`openclaw memory status --deep` 重新检查。

**首次搜索非常慢？** QMD 会在首次使用时下载 GGUF 模型。使用 OpenClaw 所使用的相同 XDG 目录，通过 `qmd query "test"` 预热。

**搜索时出现很多 QMD 子进程？** 如果可能，请更新 QMD。只有当已安装的 QMD 声明支持多个 `-c` 过滤器时，OpenClaw 才会针对同源多集合搜索使用一个进程；否则它会保留较旧的逐集合回退以确保正确性。

**仅 BM25 的 QMD 仍在尝试构建 llama.cpp？** 设置
`memory.qmd.searchMode = "search"`。OpenClaw 会将该模式视为仅词法模式，
不会运行 QMD 向量状态探测或嵌入维护，并将
语义就绪检查留给 `vsearch` 或 `query` 配置。

**搜索超时？** 增加 `memory.qmd.limits.timeoutMs`（默认：4000ms）。
在较慢的硬件上设置为 `120000`。

**群组聊天中结果为空？** 检查 `memory.qmd.scope` -- 默认只允许直接会话和频道会话。

**根内存搜索突然变得过于宽泛？** 重启网关或等待
下一次启动协调。当检测到同名冲突时，OpenClaw 会将过时的受管集合重新创建为规范的 `MEMORY.md` 和 `memory/` 模式。

**可见于工作区的临时仓库导致 `ENAMETOOLONG` 或索引损坏？**
QMD 遍历当前遵循底层 QMD 扫描器行为，而不是
OpenClaw 内置的符号链接规则。请将临时 monorepo 检出保留在
隐藏目录（如 `.tmp/`）下，或放在已索引的 QMD 根目录之外，直到 QMD 暴露
循环安全遍历或显式排除控制。

## 配置

有关完整配置项（`memory.qmd.*`）、搜索模式、更新间隔、
范围规则以及其他所有选项，请参阅
[内存配置参考](/reference/memory-config)。

## 相关内容

- [内存概览](/concepts/memory)
- [内置内存引擎](/concepts/memory-builtin)
- [Honcho 内存](/concepts/memory-honcho)
