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

OpenClaw 会在
`~/.openclaw/agents/<agentId>/qmd/` 下创建一个自包含的 QMD 主目录，并自动管理侧车生命周期
-- 集合、更新和嵌入运行都会为你处理好。
它优先使用当前的 QMD 集合和 MCP 查询形状，但在需要时仍会回退到
旧的 `--mask` 集合标志和较旧的 MCP 工具名称。
启动时的协调还会在检测到同名的旧 QMD 集合仍然存在时，将过时的受管集合重新创建为其
规范模式。

## 侧车工作原理

- OpenClaw 会根据你的工作区内存文件和任何
  配置的 `memory.qmd.paths` 创建集合，然后在启动时以及定期运行
  `qmd update` + `qmd embed`（默认每 5 分钟一次）。
- 默认的工作区集合会跟踪 `MEMORY.md` 以及 `memory/`
  目录树。小写的 `memory.md` 不会作为根内存文件被索引。
- 启动刷新的过程在后台运行，因此聊天启动不会被阻塞。
- 搜索使用配置的 `searchMode`（默认：`search`；也支持
  `vsearch` 和 `query`）。如果某种模式失败，OpenClaw 会使用 `qmd query` 重试。
- 如果 QMD 完全失败，OpenClaw 会回退到内置的 SQLite 引擎。

<Info>
首次搜索可能较慢 -- QMD 会在首次运行 `qmd query` 时自动下载用于重排序和查询扩展的 GGUF 模型（约 2 GB）。
</Info>

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

**首次搜索非常慢？** QMD 在首次使用时下载 GGUF 模型。使用 OpenClaw 使用的相同 XDG 目录通过 `qmd query "test"` 进行预热。

**搜索超时？** 增加 `memory.qmd.limits.timeoutMs`（默认：4000ms）。
对于较慢的硬件设置为 `120000`。

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
