---
summary: "OpenProse：OpenClaw 中的 .prose 工作流、斜线命令和状态"
read_when:
  - 你想运行或编写 .prose 工作流
  - 你想启用 OpenProse 插件
  - 你需要了解状态存储
title: "OpenProse"
---

# OpenProse

OpenProse 是一种便携式、以 markdown 为主的工作流格式，用于编排 AI 会话。在 OpenClaw 中，它作为插件提供，安装一个 OpenProse 技能包以及 `/prose` 斜线命令。程序保存在 `.prose` 文件中，可以生成多个子代理并实现显式的控制流。

官方网站：[https://www.prose.md](https://www.prose.md)

## 功能介绍

- 多代理研究 + 合成，支持显式并行。
- 可重复执行且安全批准的工作流（代码评审、事件分流、内容流水线）。
- 可复用的 `.prose` 程序，可在支持的代理运行环境中运行。

## 安装 + 启用

内置插件默认处于禁用状态。启用 OpenProse：

```bash
openclaw plugins enable open-prose
```

启用插件后请重启网关。

开发/本地检出：`openclaw plugins install ./extensions/open-prose`

相关文档：[插件](/tools/plugin)、[插件清单](/plugins/manifest)、[技能](/tools/skills)。

## 斜线命令

OpenProse 注册了 `/prose` 作为用户可调用的技能命令。该命令路由至 OpenProse 虚拟机指令，底层使用 OpenClaw 工具。

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
# 两个代理并行进行研究 + 合成。

input topic: "我们应该研究什么？"

agent researcher:
  model: sonnet
  prompt: "你要深入研究并引用来源。"

agent writer:
  model: opus
  prompt: "你写一份简洁的摘要。"

parallel:
  findings = session: researcher
    prompt: "研究 {topic}。"
  draft = session: writer
    prompt: "总结 {topic}。"

session "将研究结果和草稿合并成最终答案。"
context: { findings, draft }
```

## 文件位置

OpenProse 会将状态保存在工作区的 `.prose/` 目录下：

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

用户级持久代理位于：

```
~/.prose/agents/
```

## 状态模式

OpenProse 支持多种状态后端：

- **文件系统**（默认）：`.prose/runs/...`
- **上下文内**：短暂状态，适合小程序
- **sqlite**（实验中）：需要 `sqlite3` 二进制文件
- **postgres**（实验中）：需要 `psql` 及连接字符串

注意事项：

- sqlite/postgres 是可选且实验性功能。
- postgres 凭据会流入子代理日志，请使用专用且权限最小的数据库。

## 远程程序

`/prose run <handle/slug>` 会解析为 `https://p.prose.md/<handle>/<slug>`。
直接 URL 会按原样获取。此功能使用 `web_fetch` 工具（或 POST 时使用 `exec`）。

## OpenClaw 运行时映射

OpenProse 程序映射到 OpenClaw 原语：

| OpenProse 概念             | OpenClaw 工具     |
| -------------------------- | ----------------- |
| 生成会话 / 任务工具         | `sessions_spawn`  |
| 文件读写                   | `read` / `write`  |
| 网络抓取                   | `web_fetch`       |

如果你的工具白名单阻止了这些工具，OpenProse 程序将无法运行。详见 [技能配置](/tools/skills-config)。

## 安全与审批

将 `.prose` 文件视为代码，运行前请先审核。使用 OpenClaw 工具白名单和审批关卡控制副作用。

对于确定性且带审批的工作流，可对比参考 [Lobster](/tools/lobster)。
