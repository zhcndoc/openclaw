---
summary: "通过 Honcho 插件实现 AI 原生的跨会话记忆"
title: "Honcho 记忆"
read_when:
  - 你希望拥有可跨会话和渠道工作的持久记忆
  - 你希望获得 AI 驱动的回忆和用户建模
---

[Honcho](https://honcho.dev) 为 OpenClaw 添加了 AI 原生记忆。它会将
对话持久化到一个专用服务中，并随着时间推移构建用户和代理模型，
为你的代理提供超越工作区 Markdown
文件的跨会话上下文。

## 它提供什么

- **跨会话记忆** -- 每轮对话后都会持久化，因此上下文可跨越会话重置、压缩和频道切换。
- **用户建模** -- Honcho 为每个用户维护一个档案（偏好、事实、沟通风格），并为代理维护一个档案（个性、已学习的行为）。
- **语义搜索** -- 可在过去对话的观察内容上进行搜索，而不仅仅是当前会话。
- **多代理感知** -- 父代理会自动跟踪已生成的子代理，并在子会话中将父代理添加为观察者。

## 可用工具

Honcho 会注册代理可在对话期间使用的工具：

**数据检索（快速，无需 LLM 调用）：**

| 工具                        | 功能说明                                           |
| --------------------------- | ------------------------------------------------------ |
| `honcho_context`            | 跨会话的完整用户表示               |
| `honcho_search_conclusions` | 对已存储结论进行语义搜索                |
| `honcho_search_messages`    | 跨会话查找消息（按发送者、日期筛选） |
| `honcho_session`            | 当前会话历史和摘要                    |

**问答（由 LLM 驱动）：**

| 工具         | 功能说明                                                              |
| ------------ | ------------------------------------------------------------------------- |
| `honcho_ask` | 询问有关用户的问题。`depth='quick'` 用于事实，`'thorough'` 用于综合 |

## 开始使用

安装插件并运行设置：

```bash
openclaw plugins install @honcho-ai/openclaw-honcho
openclaw honcho setup
openclaw gateway --force
```

设置命令会提示你输入 API 凭据，写入配置，并可选择迁移现有的工作区记忆文件。

<Info>
Honcho 可以完全在本地运行（自托管），也可以通过
`api.honcho.dev` 上的托管 API 运行。对于自托管
选项，不需要任何外部依赖。
</Info>

## 配置

设置位于 `plugins.entries["openclaw-honcho"].config` 下：

```json5
{
  plugins: {
    entries: {
      "openclaw-honcho": {
        config: {
          apiKey: "your-api-key", // 自托管时省略
          workspaceId: "openclaw", // 记忆隔离
          baseUrl: "https://api.honcho.dev",
        },
      },
    },
  },
}
```

对于自托管实例，请将 `baseUrl` 指向你的本地服务器（例如
`http://localhost:8000`），并省略 API 密钥。

## 迁移现有记忆

如果你已有工作区记忆文件（`USER.md`、`MEMORY.md`、
`IDENTITY.md`、`memory/`、`canvas/`），`openclaw honcho setup` 会检测到并
提供迁移选项。

<Info>
迁移是非破坏性的 -- 文件会被上传到 Honcho。原始文件
绝不会被删除或移动。
</Info>

## 工作原理

每次 AI 回合后，对话都会持久化到 Honcho。用户和
代理消息都会被观察，从而使 Honcho 能够随着时间推移构建并优化其模型。

在对话期间，Honcho 工具会在 `before_prompt_build`
阶段查询服务，在模型看到提示词之前注入相关上下文。这确保了
准确的轮次边界和相关回忆。

## Honcho 与内置记忆

|                   | 内置 / QMD                | Honcho                              |
| ----------------- | ---------------------------- | ----------------------------------- |
| **存储**       | 工作区 Markdown 文件     | 专用服务（本地或托管） |
| **跨会话** | 通过记忆文件             | 自动内置                 |
| **用户建模** | 手动（写入 MEMORY.md）  | 自动档案                  |
| **搜索**        | 向量 + 关键词（混合）    | 对观察内容进行语义搜索          |
| **多代理**   | 未跟踪                  | 父/子感知              |
| **依赖**  | 无（内置）或 QMD 二进制文件 | 安装插件                      |

Honcho 和内置记忆系统可以协同工作。当配置了 QMD 时，
会提供额外工具，用于在 Honcho 的跨会话记忆旁边搜索本地 Markdown 文件。

## CLI 命令

```bash
openclaw honcho setup                        # 配置 API 密钥并迁移文件
openclaw honcho status                       # 检查连接状态
openclaw honcho ask <question>               # 向 Honcho 询问有关用户的问题
openclaw honcho search <query> [-k N] [-d D] # 对记忆进行语义搜索
```

## 延伸阅读

- [插件源代码](https://github.com/plastic-labs/openclaw-honcho)
- [Honcho 文档](https://docs.honcho.dev)
- [Honcho OpenClaw 集成指南](https://docs.honcho.dev/v3/guides/integrations/openclaw)
- [记忆](/concepts/memory) -- OpenClaw 记忆概览
- [上下文引擎](/concepts/context-engine) -- 插件上下文引擎的工作方式

## 相关内容

- [记忆概览](/concepts/memory)
- [内置记忆引擎](/concepts/memory-builtin)
- [QMD 记忆引擎](/concepts/memory-qmd)
