---
title: "OpenProse"
sidebarTitle: "OpenProse"
summary: "OpenProse 是一种面向多代理 AI 会话的 markdown-first 工作流格式。在 OpenClaw 中，它作为插件提供，并附带一个 `/prose` 斜杠命令和一个技能包。"
read_when:
  - 你想运行或编写 .prose 工作流文件
  - 你想启用 OpenProse 插件
  - 你需要了解 OpenProse 如何映射到 OpenClaw 原语
---

OpenProse 是一种可移植的、markdown-first 的工作流格式，用于编排 AI
会话。在 OpenClaw 中，它作为一个插件提供，安装 OpenProse 技能
包和一个 `/prose` 斜杠命令。程序保存在 `.prose` 文件中，并且可以
通过显式控制流启动多个子代理。

<CardGroup cols={3}>
  <Card title="安装" icon="download" href="#install">
    启用 OpenProse 插件并重启 Gateway。
  </Card>
  <Card title="运行程序" icon="play" href="#slash-command">
    使用 `/prose run` 执行一个 `.prose` 文件或远程程序。
  </Card>
  <Card title="编写程序" icon="pencil" href="#example">
    使用并行和顺序步骤编写多代理工作流。
  </Card>
</CardGroup>

## 安装

<Steps>
  <Step title="启用插件">
    捆绑插件默认是禁用的。启用 OpenProse：

    ```bash
    openclaw plugins enable open-prose
    ```

  </Step>
  <Step title="重启 Gateway">
    ```bash
    openclaw gateway restart
    ```
  </Step>
  <Step title="验证">
    ```bash
    openclaw plugins list | grep prose
    ```

    你应该会看到 `open-prose` 处于已启用状态。现在聊天中可以使用
    `/prose` 技能命令了。

  </Step>
</Steps>

对于本地检出：`openclaw plugins install ./path/to/local/open-prose-plugin`

## 斜杠命令

OpenProse 注册 `/prose` 作为用户可调用的技能命令：

```text
/prose help
/prose run <file.prose>
/prose run <handle/slug>
/prose run <https://example.com/file.prose>
/prose compile <file.prose>
/prose examples
/prose update
```

`/prose run <handle/slug>` 会解析为 `https://p.prose.md/<handle>/<slug>`。
直接 URL 会使用 `web_fetch` 工具按原样抓取。

## 它可以做什么

- 通过显式并行执行进行多代理研究和综合。
- 可重复、审批安全的工作流（代码审查、事件分诊、内容流水线）。
- 可复用的 `.prose` 程序，你可以在受支持的代理运行时之间运行它们。

## 示例：并行研究与综合

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

## OpenClaw 运行时映射

OpenProse 程序映射到 OpenClaw 原语：

| OpenProse 概念         | OpenClaw 工具    |
| ---------------------- | ---------------- |
| Spawn session / Task tool | `sessions_spawn` |
| File read / write         | `read` / `write` |
| Web fetch                 | `web_fetch`      |

<Warning>
  如果你的工具允许列表阻止了 `sessions_spawn`、`read`、`write` 或
  `web_fetch`，OpenProse 程序将会失败。请检查你的
  [工具允许列表配置](/gateway/config-tools)。
</Warning>

## 文件位置

OpenProse 将状态保存在工作区中的 `.prose/` 下：

```text
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

```text
~/.prose/agents/
```

## 状态后端

<AccordionGroup>
  <Accordion title="filesystem (default)">
    状态会写入工作区中的 `.prose/runs/...`。无需额外
    依赖。
  </Accordion>
  <Accordion title="in-context">
    保留在上下文窗口中的临时状态。适合小型、短生命周期
    程序。
  </Accordion>
  <Accordion title="sqlite (experimental)">
    需要 `PATH` 上存在 `sqlite3` 二进制文件。
  </Accordion>
  <Accordion title="postgres (experimental)">
    需要 `psql` 和一个连接字符串。

    <Warning>
      Postgres 凭据会流入子代理日志。请使用专用的、
      权限最小化的数据库。
    </Warning>

  </Accordion>
</AccordionGroup>

## 安全性

请将 `.prose` 文件视为代码。在运行前审查它们。使用 OpenClaw 工具
允许列表和审批门控来控制副作用。对于确定性、
带审批门控的工作流，可与 [Lobster](/tools/lobster) 比较。

## 相关

<CardGroup cols={2}>
  <Card title="技能参考" href="/tools/skills" icon="puzzle-piece">
    OpenProse 的技能包如何加载，以及适用哪些门控。
  </Card>
  <Card title="子代理" href="/tools/subagents" icon="users">
    OpenClaw 的原生多代理协调层。
  </Card>
  <Card title="文本转语音" href="/tools/tts" icon="volume-high">
    为你的工作流添加音频输出。
  </Card>
  <Card title="斜杠命令" href="/tools/slash-commands" icon="terminal">
    所有可用的聊天命令，包括 /prose。
  </Card>
</CardGroup>

官方网站：[https://www.prose.md](https://www.prose.md)
