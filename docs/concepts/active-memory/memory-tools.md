---
summary: "阻止子代理可能调用的具体召回工具，以及内置内存、LanceDB 和无损爪的每个提供商设置。"
read_when:
  - "您正在选择主动记忆可以调用哪些回忆工具"
  - "您正在将活动内存连接到特定的内存提供商"
title: "记忆工具"
---

## <a id="memory-tools"></a> 记忆工具

`config.toolsAllow` 设置阻塞子代理可能调用高级活动内存的具体工具名称。 Active Memory 按以下顺序选择工具：

1. A 有效的、非空的显式 `config.toolsAllow` 列表。
2. 所选内存提供商的 `recallToolNames` 能力。
3. 内置后备如下所示。

| 内存提供商 | 默认`toolsAllow`              |
| --------------- | --------------------------------- |
| 内置内存 | `["memory_search", "memory_get"]` |
| LanceDB         | `["memory_recall"]`               |

内存核心声明为 `["memory_search", "memory_get"]`。自定义内存提供者可以注册自己的具体深度调用工具，并通过 `recallToolNames` 声明相同的名称。

`toolsAllow` 是限制，而不是权限授予。在开始调用之前，Active Memory 会通过父代理的最终工具策略过滤这些名称。插件可以注册父代理所选配置文件排除的工具。使用显式 `tools.alsoAllow` 条目来扩展限制性配置文件，如 [Lossless Claw 示例 ](/concepts/active-memory/memory-tools#lossless-claw) 中所示。这些赠款还使父代理能够访问指定的工具；它们不是仅限回忆的权限。显式拒绝和提供者、代理和沙箱限制仍然适用，并且在父轮的工具权限过期后，召回无法继续。如果仅允许某些已配置的工具，则调用仍然可以使用较小的集合运行。例如，即使排除无损爪工具，`memory_search` 也可能仍然可用。

如果没有任何已配置的工具可用，或者子代理运行失败，active memory 会跳过该轮的召回，主回复会在没有记忆上下文的情况下继续。对于自定义召回工具，只要面向模型可见的工具输出非空，就会被视为召回证据，除非结构化结果字段明确报告结果为空或失败。

`toolsAllow` 只接受具体的记忆工具名称：通配符、`group:*` 条目，以及核心代理工具（`read`、`exec`、`message`、`web_search` 以及类似工具）都会在隐藏子代理启动前被静默过滤掉。

### <a id="built-in-memory"></a> 内置存储器

无需显式设置 `toolsAllow`：

```json5
{
  plugins: {
    entries: {
      "active-memory": {
        enabled: true,
        config: {
          agents: ["main"],
          // Default: ["memory_search", "memory_get"]
        },
      },
    },
  },
}
```

### <a id="lancedb-memory"></a> LanceDB 内存

[安装并配置LanceDB](/plugins/memory-lancedb)后，Active Memory自动使用`memory_recall`；不需要显式的 `toolsAllow`：

```json5
{
  plugins: {
    entries: {
      "active-memory": {
        enabled: true,
        config: {
          agents: ["main"],
          promptAppend: "Use memory_recall for long-term user preferences, past decisions, and previously discussed topics. If recall finds nothing useful, return NONE.",
        },
      },
    },
  },
}
```

这是 LanceDB 自身已存储记忆的高级 Active Memory 路径。 `memory.search.rememberAcrossConversations` 不会通过 `memory_recall` 暴露私有会话转录。当 LanceDB 是活动记忆提供方时，请使用 LanceDB 的自动召回或上面的高级配置。

### <a id="lossless-claw"></a> 无损爪

[Lossless Claw](https://github.com/martian-engineering/lossless-claw) 是一个外部上下文引擎插件 （`openclaw plugins install @martian-engineering/lossless-claw`），具有自己的召回工具。首先将其设置为上下文引擎；请参见 [ 上下文引擎](/concepts/context-engine)。然后将其召回工具授予父代理并将 Active Memory 指向它们。此示例将 `main` 代理保留在限制性 `coding` 配置文件上，并通过 `agents.entries.main.tools.alsoAllow` 仅添加三个命名的 Lossless Claw 工具。将这些条目合并到该代理的现有工具配置中。保留您选择的个人资料以及任何其他所需的授予和拒绝。此示例假设代理作用域未同时定义 `tools.allow`：`allow` 和 `alsoAllow` 不能在同一作用域中组合。较新的白名单无法恢复配置文件排除的工具。在调整现有分层白名单之前，请参阅 [ 工具策略](/gateway/config-tools)：

```json5
{
  agents: {
    entries: {
      main: {
        tools: {
          profile: "coding",
          alsoAllow: ["lcm_grep", "lcm_describe", "lcm_expand_query"],
        },
      },
    },
  },
  plugins: {
    slots: {
      contextEngine: "lossless-claw",
    },
    entries: {
      "lossless-claw": {
        enabled: true,
      },
      "active-memory": {
        enabled: true,
        config: {
          agents: ["main"],
          toolsAllow: ["memory_search", "lcm_grep", "lcm_describe", "lcm_expand_query"],
          promptAppend: "Use lcm_grep first for compacted conversation recall. Use lcm_describe to inspect a specific summary. Use lcm_expand_query only when the latest user message needs exact details that may have been compacted away. Return NONE if the retrieved context is not clearly useful.",
        },
      },
    },
  },
}
```

这里不要将`lcm_expand`添加到`toolsAllow`； Lossless Claw 将其用作委托扩展的较低级别工具，而不是用于顶级活动内存子代理。无损爪改变上下文组件而不替换当前的内存提供者。当同时使用 `rememberAcrossConversations` 时，将 `memory_search` 保留在 `toolsAllow` 中； LCM-only 工具列表对于高级 Active Memory 仍然有效，但会禁用产品转录调用路径。
