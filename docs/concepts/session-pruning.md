---
summary: "修剪旧工具结果以保持上下文精简并提高缓存效率"
title: "会话修剪"
read_when:
  - "你希望减少工具输出导致的上下文增长"
  - "你想了解 Anthropic 提示缓存优化"
---

会话修剪从模型上下文中修剪 **old 工具结果**。它减少了积累的工具输出（执行结果、文件读取、搜索结果）中的上下文膨胀，而无需重写正常的对话文本。

<Info>
您的完整历史记录将被保留。客户端修剪在内存中保留稳定的投影视图，并将其记录在隐藏的 `openclaw.cache-ttl` 转录标记中，以便在网关重新启动后可以恢复相同的视图。原始工具结果条目不会被重写。
</Info>

## <a id="why-it-matters"></a> 为什么它很重要

长时间会话会累积工具输出，从而膨胀上下文窗口。这会增加成本，并可能比必要时更早地强制进行[压缩](/concepts/compaction)。

修剪对于 **Anthropic 提示缓存** 特别有价值。它减少了必须缓存的工具内容，并将以后的请求保留在减少的前缀上。直接Anthropic API-key请求使用服务器端清算；缓存TTL过期后，其他符合条件的路由将在本地进行剪枝。

## <a id="how-it-works"></a> 工作原理

将 `agents.defaults.contextPruning.mode` 设置为 `"cache-ttl"` 以启用修剪。请求的提供者、端点和身份验证决定其运行位置。

### <a id="direct-anthropic-api-key-requests"></a> 直接 Anthropic API-密钥请求

对于具有 `anthropic-messages` API、API-key 身份验证和默认端点或 `api.anthropic.com` 的提供商 `anthropic`，OpenClaw 将修剪委托给 Anthropic 的 [ 服务器端工具结果清算](https://platform.claude.com/docs/en/build-with-claude/context-editing)。 OpenClaw 不会打开新的客户端修剪回合，并且服务器会在模型看到旧结果之前清除它们。先前在同一会话中进行的投影（例如在代理路线上，或从转录标记恢复）仍会按原样重播。保留完整的当地历史。 `ttl` 不对该路径进行门控。

OpenClaw 派生请求参数而不添加配置选项：

| 参数           | 值                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| `trigger`           | 输入代币：`max(50000, floor(contextWindow * 0.3))`                                              |
| `keep`              | 最近 3 个工具的使用及其结果                                                       |
| `clear_at_least`    | 输入代币：`max(12500, floor(contextWindow * 0.05))`                                             |
| `exclude_tools`     | 配置时，当前和历史工具名称被 `tools.deny` 排除或在 `tools.allow` 之外 |
| `clear_tool_inputs` | `false`，保留工具调用参数                                                             |

该请求包括 `clear_tool_uses_20250919` 编辑和 `context-management-2025-06-27` beta 标头。如果启用了服务器端压缩，则清除编辑将在压缩编辑之前进行。显式调用者提供的 `context_management` 保持不变。客户端软修剪和 `hardClear` 设置不会更改服务器的清除策略。

清除使提示缓存从第一次清除结果开始失效； `clear_at_least` 可防止清除事件，该事件会删除太少的令牌来证明新的缓存写入的合理性。发生清除时，OpenClaw 记录以下信息行：

```text
[anthropic] server-side context edit: cleared N tool results (M input tokens)
```

### <a id="client-side-pruning"></a> 客户端剪枝

Amazon Bedrock、Google、Microsoft Foundry、OAuth、代理、Vertex 和其他缓存 - TTL-eligible 路由保持客户端修剪。新的修剪轮次通过时间检查和上下文大小检查进行门控：

1. 等待缓存TTL过期。当开启`cache-ttl`模式且未设置`ttl`时，TTL为5分钟。捆绑的 Anthropic 插件种子为 `1h`，请参阅 [Smart defaults](#smart-defaults)。每个成功的模型请求都会将内存时钟刷新到其请求开始时间，包括回合结算之前的工具循环请求。失败的请求不会刷新它。在TTL过去之前，不会发生新的剪枝。现有的预测仍保持不变。
2. TTL 结束后，根据模型的上下文窗口估算总上下文大小。使用率低于约 30% 时，将跳过清理，并让 TTL 时钟继续运行。
3. **软裁剪**过大的工具结果：超过 4,000 个字符的结果将保留开头和结尾各 1,500 个字符，并在中间添加 `...`。
4. 如果上下文使用率仍处于或高于大约 50%，并且保留至少 50,000 个字符的可修剪工具内容，则 **hard-clear** 这些结果。硬清除用占位符替换每个结果的内容。默认占位符是 `[Old tool result content cleared]`，`agents.defaults.contextPruning.hardClear.placeholder` 会更改它。设置 `hardClear.enabled: false` 以跳过此步骤。
5. 将每个更改的结果记录为会话投影并重置修剪 TTL 时钟。后续请求重用相同的预计字节，包括工具循环延续和稍后的轮次。

TTL 控制新一轮的修剪，而不是重播之前的预测。投影在网关重新启动和通过转录标记卸载空闲会话后仍然存在。最后一次活动尝试在清理后释放其提示投影；下一次尝试将从活动转录本中恢复它们。当投影更改时，即使 TTL 修剪关闭，普通工具结果修剪和已发送的边界也会在模型请求之前保存。更改的投影仅记录添加、更新和删除的条目，最多 31 个增量之后或累积增量有效负载达到 64 KiB 之前有一个完整的检查点。未更改的投影不添加新的投影标记。重新启动会恢复活动分支上的最新检查点和后续增量，并在重置时停止。旧的完整快照标记仍然可以作为检查点读取；现有的记录行不需要迁移并且不会被删除。早于增量支持的运行时无法重播上次完整检查点之后的更改，因此在回滚此格式更改时保留备份。有界历史读取获取任何省略的检查点作为投影元数据，而不扩展模型的保留历史。旧结果通过工具循环和重新启动保留其预计字节。原始文本和非文本内容保留在脚本中。压缩会放弃对不再活跃历史记录中的结果的预测； `/new` 和会话重置在没有旧会话投影的情况下启动。 Cache-TTL 标记时间戳仍然支持现有的缓存和心跳簿记。

无论阈值如何，都适用两条安全规则：最后三个助手轮次永远不会被修剪，并且会话的第一条用户消息之前的任何内容都不会被修剪（保护像 `SOUL.md`/`USER.md` 这样的引导读取）。上面的大小阈值和修剪窗口是内置行为，而不是配置键；可配置表面为 `agents.defaults.contextPruning`（`mode`、`ttl`、`tools`、`hardClear`）。

仅 `toolResult` 消息符合资格；正常的对话文本将被保留。使用 `agents.defaults.contextPruning.tools.{allow,deny}` 来确定在任一路径上可修剪的工具名称的范围。

<a id="legacy-image-cleanup" />

## <a id="image-history"></a> 图像历史

当新回合到来时，图像块和附件引用会保留在保留的对话历史记录中。用清理标记替换已发送的图像会更改提示前缀并丢弃提供程序的缓存上下文。压缩和显式历史窗口限制了自己删除旧的图像承载轮次；没有单独的基于年龄的图像清理。原始记录为历史查看者保留原始附件。

## <a id="smart-defaults"></a> 智能默认值

捆绑的 Anthropic 插件在首次解析 Anthropic（或 Claude CLI）认证配置文件时，会自动配置剪枝和心跳频率，但仅针对你尚未明确设置的字段：

| 认证模式                                | `contextPruning.mode` | `contextPruning.ttl` | `heartbeat.every` |
| ---------------------------------------- | --------------------- | -------------------- | ----------------- |
| OAuth/token（包括Claude CLI复用） | `cache-ttl`           | `1h`                 | `1h`              |
| API 密钥                                  | `cache-ttl`           | `1h`                 | `30m`             |

如果您自己设置 `agents.defaults.contextPruning.mode` 或 `agents.defaults.heartbeat.every`，OpenClaw 不会覆盖它们。此自动默认设置仅针对 Anthropic-family 身份验证触发；除非您配置它，否则其他提供商会修剪 `off`。

种子 `ttl` 适用于客户端剪枝。直接 Anthropic API-key 请求使用上述令牌阈值，同时保留相同的心跳默认值。

## <a id="enable-or-disable"></a> 启用或禁用

对于非 Anthropic 提供商，修剪默认关闭。要启用：

```json5
{
  agents: {
    defaults: {
      contextPruning: { mode: "cache-ttl", ttl: "5m" },
    },
  },
}
```

要停止新的修剪，请设置 `mode: "off"`。现有的客户端投影会不断重播，包括在网关重新启动后，直到压缩删除其结果或重置会话。

对于自定义 OpenAI- 兼容提供程序，请将模型的 `compat.supportsPromptCacheKey` 也设置为 `true`。这会选择使用 `openai-responses`、`openai-completions` 或 `openai-chatgpt-responses` 的配置模型进入缓存 TTL 修剪，即使其提供者 ID 不是 `openai` 也是如此。具有自己的缓存 TTL 策略的提供商插件仍然控制资格。

## <a id="pruning-vs-compaction"></a> 修剪 vs 压缩

|            | 修剪                                                              | 压缩                                              |
| ---------- | -------------------------------------------------------------------- | ------------------------------------------------------- |
| **是什么**   | 修剪工具结果                                                   | 总结对话                                 |
| **已保存？** | 客户预测依然存在；服务器清理保留完整的本地历史记录 | 摘要保留在转录或提供者重播状态中 |
| **范围**  | 仅工具结果                                                    | 整个对话                                     |

它们相辅相成——修剪在每次压缩周期之间保持工具输出精简。

## <a id="further-reading"></a> 延伸阅读

- [压缩](/concepts/compaction)：基于摘要的上下文减少
- [`agents.defaults.contextPruning`](/gateway/config-agents/heartbeat-compaction-and-streaming#agents.defaults.contextpruning)：所有修剪配置旋钮 （`contextPruning.*`）

## <a id="related"></a> 相关内容

- [会话管理](/concepts/session)
- [会话工具](/concepts/session-tool)
- [上下文引擎](/concepts/context-engine)
- [转录本卫生](/reference/transcript-hygiene) - 运行前应用的内存中、特定于提供者的转录本清理
