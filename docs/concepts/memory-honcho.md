---
summary: "通过 Honcho 插件实现 AI 原生的跨会话记忆"
title: "Honcho 记忆"
read_when:
  - 你希望拥有跨会话和渠道的持久化记忆
  - 你希望拥有 AI 驱动的回忆和用户建模
---

[Honcho](https://honcho.dev) 为 OpenClaw 增加了 AI 原生记忆。它会将
对话持久化到专用服务，并随着时间推移构建用户和代理模型，
为你的代理提供超越工作区 Markdown
文件的跨会话上下文。

## 它提供什么

- **跨会话记忆** -- 每次交互后都会持久化对话，因此上下文可以在会话重置、压缩和渠道切换之间携带。
- **用户建模** -- Honcho 为每个用户（偏好、事实、沟通风格）和代理（个性、习得行为）维护档案。
- **语义搜索** -- 搜索过去对话中的观察结果，而不仅仅是当前会话。
- **多代理感知** -- 父代理自动跟踪生成的子代理，父代理作为观察者添加到子会话中。

## 可用工具

Honcho 注册了代理在对话期间可以使用的工具：

**数据检索（快速，无需调用 LLM）：**

| 工具                        | 功能                                                   |
| --------------------------- | ------------------------------------------------------ |
| `honcho_context`            | 跨会话的完整用户表示               |
| `honcho_search_conclusions` | 对存储的结论进行语义搜索                |
| `honcho_search_messages`    | 跨会话查找消息（按发送者、日期过滤） |
| `honcho_session`            | 当前会话历史和摘要                    |

**问答（由 LLM 驱动）：**

| 工具         | 功能                                                              |
| ------------ | ------------------------------------------------------------------------- |
| `honcho_ask` | 询问关于用户的信息。`depth='quick'` 用于事实，`'thorough'` 用于综合 |

## 快速开始

安装插件并运行设置：

```bash
openclaw plugins install @honcho-ai/openclaw-honcho
openclaw honcho setup
openclaw gateway --force
```

设置命令会提示输入你的 API 凭证，写入配置，并可选地迁移现有的工作区记忆文件。

<Info>
Honcho 可以完全本地运行（自托管）或通过 `api.honcho.dev` 的托管 API 运行。自托管选项不需要外部依赖。
</Info>

## 配置

设置位于 `plugins.entries["openclaw-honcho"].config` 下：

```json5
{
  plugins: {
    entries: {
      "openclaw-honcho": {
        config: {
          apiKey: "your-api-key", // 自托管则省略
          workspaceId: "openclaw", // 记忆隔离
          baseUrl: "https://api.honcho.dev",
        },
      },
    },
  },
}
```

对于自托管实例，将 `baseUrl` 指向你的本地服务器（例如 `http://localhost:8000`）并省略 API 密钥。

## 迁移现有记忆

如果你现有的工作区记忆文件（`USER.md`、`MEMORY.md`、`IDENTITY.md`、`memory/`、`canvas/`），`openclaw honcho setup` 会检测并提供迁移选项。

<Info>
迁移是非破坏性的 -- 文件会被上传到 Honcho。原始文件永远不会被删除或移动。
</Info>

## 工作原理

每次 AI 交互后，对话都会持久化到 Honcho。用户和代理消息都会被观察，允许 Honcho 随时间构建和完善其模型。

在对话期间，Honcho 工具在 `before_prompt_build` 阶段查询服务，在模型看到提示之前注入相关上下文。这确保了准确的交互边界和相关回忆。

## Honcho 与内置记忆对比

|                   | 内置 / QMD                | Honcho                              |
| ----------------- | ---------------------------- | ----------------------------------- |
| **存储**       | 工作区 Markdown 文件     | 专用服务（本地或托管） |
| **跨会话** | 通过记忆文件             | 自动，内置                 |
| **用户建模** | 手动（写入 MEMORY.md）  | 自动档案                  |
| **搜索**        | 向量 + 关键字（混合）    | 对观察结果进行语义搜索          |
| **多代理**   | 未跟踪                  | 父/子感知              |
| **依赖**  | 无（内置）或 QMD 二进制 | 插件安装                      |

Honcho 和内置记忆系统可以协同工作。当配置了 QMD 时，额外的工具可用于搜索本地 Markdown 文件以及 Honcho 的跨会话记忆。

## CLI 命令

```bash
openclaw honcho setup                        # 配置 API 密钥并迁移文件
openclaw honcho status                       # 检查连接状态
openclaw honcho ask <question>               # 查询 Honcho 关于用户的信息
openclaw honcho search <query> [-k N] [-d D] # 对记忆进行语义搜索
```

## 进一步阅读

- [Plugin source code](https://github.com/plastic-labs/openclaw-honcho)
- [Honcho documentation](https://docs.honcho.dev)
- [Honcho OpenClaw integration guide](https://docs.honcho.dev/v3/guides/integrations/openclaw)
- [Memory](/concepts/memory) -- OpenClaw 记忆概览
- [Context Engines](/concepts/context-engine) -- 插件上下文引擎如何工作

## Related

- [Memory overview](/concepts/memory)
- [Builtin memory engine](/concepts/memory-builtin)
- [QMD memory engine](/concepts/memory-qmd)
