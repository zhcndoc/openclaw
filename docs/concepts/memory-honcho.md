---
summary: "AI-native 通过 Honcho 插件的跨会话内存"
title: "Honcho 记忆"
read_when:
  - "你希望拥有可跨会话和渠道工作的持久记忆"
  - "您想要 AI- 支持的召回和用户建模"
---

[Honcho](https://honcho.dev) 通过外部插件将 AI-native 内存添加到 OpenClaw 中。它保留与专用服务的对话，并随着时间的推移构建用户和代理模型，为您的代理提供超越工作区 Markdown 文件的跨会话上下文。

## <a id="what-it-provides"></a> 它提供什么

- **跨会话记忆** - 对话会在每一轮后持续保留，因此上下文可跨会话重置、压缩和频道切换保持延续。
- **用户建模** - Honcho 为每个用户维护一个档案（偏好、 事实、沟通风格）以及为代理维护一个档案（个性、已学会的行为）。
- **语义搜索** - 对过去对话中的观察内容进行搜索，而不只是当前会话。
- **多代理感知** - 父代理会自动跟踪生成的子代理，并将父代理作为观察者添加到子会话中。

## <a id="available-tools"></a> 可用工具

Honcho 注册了代理在对话期间可以使用的工具：

**数据检索（快速，无需调用 LLM）：**

| 工具                        | 它的作用                                           |
| --------------------------- | ------------------------------------------------------ |
| `honcho_context`            | 跨会话的完整用户画像               |
| `honcho_search_conclusions` | 对存储的结论进行语义搜索                |
| `honcho_search_messages`    | 跨会话搜索消息（可按发送者、日期筛选） |
| `honcho_session`            | 当前会话历史和摘要                    |

**Q&A （LLM-供电）：**

| 工具         | 它的作用                                                              |
| ------------ | ------------------------------------------------------------------------- |
| `honcho_ask` | 向用户提问。对于事实使用 `depth='quick'`，对于综合分析使用 `'thorough'` |

## <a id="getting-started"></a> 入门

安装插件并运行设置：

```bash
openclaw plugins install @honcho-ai/openclaw-honcho
openclaw honcho setup
openclaw gateway --force
```

设置命令会提示您输入 API 凭据、写入配置，并可选择迁移现有工作区内存文件。它请求的 API 密钥是由 [Honcho](https://honcho.dev) 颁发的，而不是由 OpenClaw 颁发的，并且仅在 `api.honcho.dev` 处的托管 API 需要；自托管 Honcho 部署无需输入密钥。

<Info>
Honcho 可以完全在本地运行（自托管），也可以通过 `api.honcho.dev` 上的托管 API 运行。对于自托管选项，不需要任何外部依赖。
</Info>

## <a id="configuration"></a> 配置

设置位于 `plugins.entries["openclaw-honcho"].config` 下：

```json5
{
  plugins: {
    entries: {
      "openclaw-honcho": {
        config: {
          apiKey: "your-api-key", // omit for self-hosted
          workspaceId: "openclaw", // memory isolation
          baseUrl: "https://api.honcho.dev",
        },
      },
    },
  },
}
```

对于自托管实例，请将 `baseUrl` 指向你的本地服务器（例如 `http://localhost:8000`），并省略 API 密钥。

## <a id="migrating-existing-memory"></a> 迁移现有记忆

如果您有现有工作区内存文件（`USER.md`、`MEMORY.md`、`IDENTITY.md`、`memory/`），`openclaw honcho setup` 会检测并提供迁移它们。

<Info>
迁移是非破坏性的——文件会上传到 Honcho。原始文件绝不会被删除或移动。
</Info>

## <a id="how-it-works"></a> 工作原理

在每次 AI 回合后，对话都会持久化到 Honcho。用户和代理消息都会被观察，从而让 Honcho 随着时间推移构建并优化其模型。

在对话过程中，Honcho 工具会在 OpenClaw 的 `before_prompt_build` 插件钩子中查询服务，在模型看到提示之前注入相关上下文。

## <a id="honcho-vs-builtin-memory"></a> Honcho 与内置记忆

|                   | 内置记忆              | 本町                              |
| ----------------- | --------------------------- | ----------------------------------- |
| **存储**       | 工作区 Markdown 文件    | 专用服务（本地或托管） |
| **跨会话** | 通过记忆文件            | 自动内置                 |
| **用户建模** | 手动（写入 MEMORY.md） | 自动生成用户画像                  |
| **搜索**        | 向量 + 关键词（混合）   | 基于观测结果的语义搜索          |
| **多代理**   | 未追踪                 | Parent/child 意识              |
| **依赖项**  | 无                        | 安装插件                      |

Honcho 与内置记忆系统可以协同工作。内置搜索会在 Honcho 的跨会话记忆旁保留本地 Markdown 的可用性。

## <a id="cli-commands"></a> CLI 命令

```bash
openclaw honcho setup                        # Configure API key and migrate files
openclaw honcho status                       # Check connection status
openclaw honcho ask <question>               # Query Honcho about the user
openclaw honcho search <query> [-k N] [-d D] # Semantic search over memory
```

## <a id="further-reading"></a> 延伸阅读

- [插件源代码](https://github.com/plastic-labs/openclaw-honcho)
- [Honcho 文档](https://docs.honcho.dev)
- [Honcho OpenClaw 集成指南](https://docs.honcho.dev/v3/guides/integrations/openclaw)

## <a id="related"></a> 相关内容

- [内存概览](/concepts/memory)
- [内置内存引擎](/concepts/memory-builtin)
- [上下文 Engines](/concepts/context-engine)
