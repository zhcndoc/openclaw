---
summary: "带有 BM25、向量、重排序和查询扩展的本地优先搜索侧车"
title: "QMD 记忆引擎"
read_when:
  - 你想将 QMD 作为你的记忆后端来设置
  - 你希望使用高级记忆功能，例如重排序或额外的索引路径
---

[QMD](https://github.com/tobi/qmd) 是一个本地优先的搜索侧车，与 OpenClaw 一起运行。它将 BM25、向量搜索和重排序组合在一个二进制文件中，并且可以索引超出你工作区记忆文件之外的内容。

## 它相较于内置引擎新增了什么

- **重排序和查询扩展**，以获得更好的召回率。
- **索引额外目录** - 项目文档、团队笔记，以及磁盘上的任何内容。
- **索引会话转录** - 记住更早的对话。
- **完全本地化** - 使用官方 llama.cpp provider 插件运行，并自动下载 GGUF 模型。
- **自动回退** - 如果 QMD 不可用，OpenClaw 会无缝回退到内置引擎。

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

OpenClaw 会在
`~/.openclaw/agents/<agentId>/qmd/` 下创建一个自包含的 QMD 主目录，并自动管理 sidecar 生命周期——集合、更新和嵌入运行都会由你处理。
它优先使用当前的 QMD 集合和 MCP 查询形状，但在需要时会回退到替代的集合模式标志和较旧的 MCP 工具名称。
启动时的协调还会在同名的旧 QMD 集合仍然存在时，将陈旧的受管集合重新创建为其规范模式。

## 侧车的工作方式

- OpenClaw 会从你的工作区内存文件以及任何已配置的 `memory.qmd.paths` 创建集合，然后在 QMD 管理器打开时以及之后按周期运行 `qmd update`（`memory.qmd.update.interval`，默认 `5m`）。刷新通过 QMD 子进程执行，而不是通过进程内的文件系统遍历。语义搜索模式还会运行 `qmd embed`（`memory.qmd.update.embedInterval`，默认 `60m`）。
- 默认的工作区集合会跟踪 `MEMORY.md` 以及 `memory/` 目录树。小写的 `memory.md` 不会作为根内存文件被索引。
- QMD 自身的扫描器会忽略隐藏路径以及常见的依赖/构建目录，例如 `.git`、`.cache`、`node_modules`、`vendor`、`dist` 和 `build`。网关启动时默认不会初始化 QMD（`memory.qmd.update.startup` 默认是 `off`），因此在首次使用内存之前，冷启动不会导入内存运行时，也不会创建长生命周期的监视器。
- 将 `memory.qmd.update.startup` 设为 `idle` 或 `immediate`，即可在网关启动时初始化 QMD。`memory.qmd.update.onBoot` 默认是 `true`，并会在启动时执行初次刷新；将其设为 `false` 可跳过这次立即刷新（不过当配置了更新或嵌入间隔时，长生命周期的管理器仍会打开，因此 QMD 仍会负责其常规的监视器/定时器）。
- 搜索会使用已配置的 `searchMode`（默认：`search`；也支持 `vsearch` 和 `query`）。`search` 仅使用 BM25，因此 OpenClaw 在该模式下会跳过语义向量就绪探测和嵌入维护。如果某种模式失败，OpenClaw 会改用 `qmd query` 重试。
- 当 `searchMode` 为 `query` 时，将 `memory.qmd.rerank` 设为 `false`，即可在不使用重排器的情况下走 QMD 的混合查询路径（需要 QMD 2.1 或更新版本）。OpenClaw 会向直接的 QMD CLI 路径传递 `--no-rerank`，并向 QMD 的 MCP 查询工具传递 `rerank: false`。
- 对于声明支持多集合过滤的 QMD 版本，OpenClaw 会把同源集合分组到一次 QMD 搜索调用中。较旧的 QMD 版本则保留兼容的按集合回退方案。
- 如果 QMD 完全失败，OpenClaw 会回退到内置的 SQLite 引擎。连续的聊天轮次尝试在打开失败后会短暂退避，因此缺失的二进制文件或损坏的 sidecar 依赖不会引发重试风暴；`openclaw memory status` 和一次性的 CLI 探测仍会直接重新检查 QMD。

<Info>
第一次搜索可能较慢——QMD 会在首次运行 `qmd query` 时自动下载用于重排和查询扩展的 GGUF 模型（约 2 GB）。
</Info>

## 搜索性能与兼容性

OpenClaw 会让 QMD 搜索路径同时兼容当前和较旧的 QMD 安装。

在启动时，OpenClaw 会为每个管理器检查一次已安装的 QMD 帮助文本。如果二进制程序声明支持多个集合过滤器，OpenClaw 会使用一个命令搜索所有同源集合：

```bash
qmd search "router notes" --json -n 10 -c memory-root-main -c memory-dir-main
```

这避免了为每个持久化内存集合启动一个 QMD 子进程。会话转录集合仍然保留在各自的源组中，因此混合的 `memory` + `sessions` 搜索仍然会从两个来源获得结果多样化输入。

较旧的 QMD 构建版本只接受一个集合过滤器。当 OpenClaw 检测到这些版本之一时，它会保留兼容路径，并在合并和去重结果之前分别搜索每个集合。

要手动检查已安装的契约，请运行：

```bash
qmd --help | grep -i collection
```

当前版本的 QMD 帮助信息会提到可定位一个或多个集合。较旧的帮助信息通常只描述单个集合。

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

来自额外路径的片段会在搜索结果中显示为 `qmd/<collection>/<relative-path>`。`memory_get` 能识别这个前缀，并从正确的集合根目录读取。

## 索引会话转录

启用会话索引以回忆更早的对话。QMD 需要同时具备
通用的 `memorySearch` 会话来源和 QMD 转录导出器：

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        experimental: { sessionMemory: true },
        sources: ["memory", "sessions"],
      },
    },
  },
  memory: {
    backend: "qmd",
    qmd: {
      sessions: { enabled: true },
    },
  },
}
```

转录会以经过清理的 User/Assistant 回合导出到
`~/.openclaw/agents/<id>/qmd/sessions/` 下的专用 QMD
集合中。仅设置 `memorySearch.experimental.sessionMemory`
不会将转录导出到 QMD。

会话命中结果仍会受到
[`tools.sessions.visibility`](/gateway/config-tools#toolssessions) 的过滤。
默认的 `tree` 可见性不会暴露无关的同代理会话。若希望某个由 gateway 分发的会话能从
单独的 DM 会话中被回忆起来，请有意将 `tools.sessions.visibility: "agent"` 进行设置。

## 搜索范围

默认情况下，QMD 搜索结果仅在直接会话中显示（不包括群聊或频道聊天）。配置 `memory.qmd.scope` 可以更改此行为：

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

上面的片段就是实际的默认规则。当 scope 拒绝一次搜索时，OpenClaw 会记录一条警告，其中包含派生的频道和聊天类型，这样空结果就更容易调试。

## 引用

当 `memory.citations` 为 `auto` 或 `on` 时，搜索片段会附加一个
`Source: <path>#L<line>`（或 `#L<start>-L<end>`）页脚。在 `auto`
模式下，仅对直接聊天会话添加该页脚。将
`memory.citations = "off"` 设为关闭页脚，同时仍会在内部将路径传递给
代理。

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

如果 `qmd --version` 在你的 shell 中可以正常工作，但 OpenClaw 仍然报告
`spawn qmd ENOENT`，那么 gateway 进程的 `PATH` 很可能与
你的交互式 shell 不同。请显式指定二进制文件：

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

**搜索过程中出现很多 QMD 子进程？** 尽可能更新 QMD。OpenClaw
仅在已安装的 QMD 声明支持多个 `-c` 过滤器时，才会对同源多集合搜索使用一个进程；
否则为了保证正确性，它会保留旧的按集合逐个处理的回退方案。

**仅支持 BM25 的 QMD 仍然尝试构建 llama.cpp？** 设置
`memory.qmd.searchMode = "search"`。OpenClaw 将该模式视为
仅词法搜索，跳过 QMD 向量状态探测和嵌入维护，并
将语义就绪检查留给 `vsearch` 或 `query` 配置。

**搜索超时？** 增加 `memory.qmd.limits.timeoutMs`（默认值：4000ms）。
对于较慢的硬件，可以将其设置得更高，例如 `120000`。此限制适用于
agent 执行 `memory_search` 调用时 QMD 自身的搜索命令；初始化、同步、
内置回退以及补充语料库工作仍使用各自更短的截止时间。

**群聊或频道聊天中结果为空？** 这是默认 `memory.qmd.scope`
下的预期行为，它只允许直接会话。如果你希望在这些场景中使用 QMD 结果，请为 `group` 或 `channel` 聊天类型添加一个 `allow` 规则。

**根内存搜索突然变得过于宽泛？** 重启 gateway，或等待
下一次启动时的协调过程。OpenClaw 在检测到同名冲突时，会将过时的受管集合
恢复为标准的 `MEMORY.md` 和 `memory/` 模式。

**工作区可见的临时仓库导致 `ENAMETOOLONG` 或索引损坏？**
QMD 遍历遵循底层 QMD 扫描器，而不是 OpenClaw 的
内置符号链接规则。请将临时 monorepo 检出保留在隐藏
目录（如 `.tmp/`）下，或放在已索引 QMD 根目录之外，直到 QMD 提供
支持循环安全的遍历或显式排除控制。

## 配置

完整配置范围（`memory.qmd.*`）、搜索模式、更新间隔、范围规则以及所有其他选项，请参阅
[记忆配置参考](/reference/memory-config)。

## 相关内容

- [记忆概览](/concepts/memory)
- [内置记忆引擎](/concepts/memory-builtin)
- [Honcho 记忆](/concepts/memory-honcho)
