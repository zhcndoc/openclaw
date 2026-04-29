---
summary: "OpenProse：OpenClaw 中的 .prose 工作流、斜杠命令和状态"
read_when:
  - 你想运行或编写 .prose 工作流
  - 你想启用 OpenProse 插件
  - 你需要了解状态存储
title: "OpenProse"
---

OpenProse 是一种可移植、以 markdown 为先的工作流格式，用于编排 AI 会话。在 OpenClaw 中，它以一个插件的形式提供，安装一个 OpenProse 技能包以及一个 `/prose` 斜杠命令。程序存放在 `.prose` 文件中，并且可以通过显式的控制流生成多个子代理。

官方网站：[https://www.prose.md](https://www.prose.md)

## 它可以做什么

- 具备显式并行性的多代理研究 + 综合。
- 可重复、审批安全的工作流（代码审查、事件分流、内容流水线）。
- 可在受支持的代理运行时之间运行的可复用 `.prose` 程序。

## 安装 + 启用

捆绑插件默认是禁用的。启用 OpenProse：

```bash
openclaw plugins enable open-prose
```

启用插件后重启 Gateway。

开发/本地检出：`openclaw plugins install ./path/to/local/open-prose-plugin`

相关文档：[Plugins](/tools/plugin)、[Plugin manifest](/plugins/manifest)、[Skills](/tools/skills)。

## 斜杠命令

OpenProse 将 `/prose` 注册为一个用户可调用的技能命令。它会路由到 OpenProse VM 指令，并在底层使用 OpenClaw 工具。

常用命令：

```
/prose help
/prose run <file.prose>
/prose run <handle/slug>
/prose run <https://example.com/file.prose>
/prose compile <file.prose>
/prose examples
/prose update
```

## 示例：一个简单的 `.prose` 文件

```prose
# 由两个代理并行运行的研究 + 综合。

input topic: "我们应该研究什么？"

agent researcher:
  model: sonnet
  prompt: "你进行彻底的研究并引用来源。"

agent writer:
  model: opus
  prompt: "你撰写一个简洁的总结。"

parallel:
  findings = session: researcher
    prompt: "研究 {topic}。"
  draft = session: writer
    prompt: "总结 {topic}。"

session "将 findings + draft 合并为最终答案。"
context: { findings, draft }
```

## 文件位置

OpenProse 将状态保存在工作区中的 `.prose/` 下：

```
.prose/
├── .env
├── runs/
│   └── {YYYYMMDD}-{HHMMSS}-{random}/
│       ├── program.prose
│       ├── state.md
│       ├── bindings/
│       └── agents/
└── agents/
```

用户级持久化代理位于：

```
~/.prose/agents/
```

## 状态模式

OpenProse 支持多种状态后端：

- **filesystem**（默认）：`.prose/runs/...`
- **in-context**：临时的，适用于小型程序
- **sqlite**（实验性）：需要 `sqlite3` 二进制文件
- **postgres**（实验性）：需要 `psql` 和连接字符串

注意：

- sqlite/postgres 是可选启用且实验性的。
- postgres 凭据会流入子代理日志；请使用专用的、最小权限的数据库。

## 远程程序

`/prose run <handle/slug>` 会解析为 `https://p.prose.md/<handle>/<slug>`。
直接 URL 会按原样抓取。这使用 `web_fetch` 工具（或用于 POST 的 `exec`）。

## OpenClaw 运行时映射

OpenProse 程序映射到 OpenClaw 原语：

| OpenProse 概念          | OpenClaw 工具     |
| ----------------------- | ---------------- |
| 启动会话 / Task 工具    | `sessions_spawn` |
| 文件读/写               | `read` / `write` |
| Web 抓取                | `web_fetch`      |

如果你的工具允许列表阻止这些工具，OpenProse 程序将失败。参见 [Skills config](/tools/skills-config)。

## 安全 + 审批

将 `.prose` 文件视为代码。在运行前进行审查。使用 OpenClaw 工具允许列表和审批门控来控制副作用。

对于确定性的、带审批门控的工作流，可与 [Lobster](/tools/lobster) 对比。

## 相关

- [文本转语音](/tools/tts)
- [Markdown 格式化](/concepts/markdown-formatting)
