---
summary: "主动内存不运行时的检查表，以及常见的调用失败及其原因。"
read_when:
  - "主动记忆没有出现在你期望的地方"
  - "召回缓慢、空洞、不一致或策略禁用"
title: "活动内存故障排除"
---

## <a id="debugging"></a> 调试

如果 active memory 没有出现在你预期的位置：

1. 确认插件已在 `plugins.entries.active-memory.enabled` 下启用。
2. 对于跨会话记忆，请确认代理的有效 `memory.search.rememberAcrossConversations` 设置已启用，运行 `openclaw doctor` 以验证当前记忆提供程序支持受保护的转录回忆，并在显式配置时确认 `config.toolsAllow` 包含 `memory_search`。 对于高级 Active Memory，请确认代理 ID 已列在 `config.agents` 中。
3. 确认你是在符合条件的交互式持久会话中进行测试。
4. 请记住，群组和频道永远不会使用跨会话转录回忆。
5. 开启 `config.logging: true` 并查看 gateway 日志。
6. 使用 `openclaw status --deep` 验证 memory search 本身是否正常工作。

对话中的触发回忆和记住是不同的路径。运行 `/active-memory status` 以检查会话切换和两个配置设置。请记住，即使座席不在 `plugins.entries.active-memory.config.agents` 中，也可以进行跨对话。会话暂停不会更改这些配置设置；目标和工具政策仍然适用。

当代理不在该允许列表中时，调试日志将包括 `lane-1 skipped reason=agent-not-configured agent=<id>`。对于 `config.logging: true`，相同的诊断信息出现在信息级别。

如果 memory 命中过于嘈杂，请收紧 `maxSummaryChars`。如果 active memory 太慢，请降低 `queryMode`、降低 `timeoutMs`，或者减少最近轮次数量和每轮字符上限。

## <a id="common-issues"></a> 常见问题

Advanced Active Memory 依赖于所配置的内存插件的召回流程，因此大多数召回异常其实是嵌入提供方的问题，而不是 active-memory 的 bug。默认的 `memory-core` 路径使用 `memory_search` 和 `memory_get`；`memory-lancedb` 插槽使用 `memory_recall`。如果你使用了其他内存插件，请确认 `config.toolsAllow` 中列出了该插件实际注册的工具。跨会话记忆的范围更窄：当前内存提供方必须支持 OpenClaw 的受保护同 agent/private-session 召回路径。

<AccordionGroup>
  <Accordion id="registered-recall-tools-return-status-policy-disabled" title="注册召回工具返回`status=policy-disabled`">
    此状态意味着已配置的调用工具均不保留在父代理的授权工具表面中。 Active Memory 会跳过阻塞子代理，并且主回复将继续，而无需调用上下文。

    - 检查所选代理的配置文件和显式 `tools.alsoAllow` 授权。在限制性配置文件下，仅在 `config.toolsAllow` 中列出插件工具并不授权它们。使用范围 [ 无损爪示例 ](/concepts/active-memory/memory-tools#lossless-claw)。
    - 检查显式拒绝以及提供商、代理和沙箱工具策略。 `alsoAllow`延长了外形；它不会超越这些限制。特定于提供商的配置文件有自己的 `alsoAllow` 配置。
    - 确认`config.toolsAllow`包含预期的具体召回名称。 Active Memory 只能使用该列表与父代理的有效工具的交集。在对话中使用“记住”时，请保留 `memory_search`。
    - 使用`openclaw plugins inspect lossless-claw --runtime --json`检查注册。此处列出的工具已注册，但该输出并不能证明父代理或 Active Memory 有权调用它。

  </Accordion>

  <Accordion id="embedding-provider-switched-or-stopped-working" title="嵌入提供商切换或停止工作">
    如果未设置 `memory.search.provider`，则 OpenClaw 使用 OpenAI 嵌入。为 Bedrock、DeepInfra、Gemini、GitHub Copilot、LM Studio、本地、Mistral、Ollama、Voyage 或 OpenAI- 兼容嵌入显式设置 `memory.search.provider`。如果配置的提供程序无法运行，`memory_search` 可能会降级为仅词法检索；已选择提供程序后运行时失败不会自动回退。

    仅当您想要有意的单一回退时才设置可选的 `memory.search.fallback`。有关提供程序和示例的完整列表，请参阅 [Memory Search](/concepts/memory-search)。

  </Accordion>

  <Accordion id="recall-feels-slow-empty-or-inconsistent" title="回忆起来感觉缓慢、空虚或不一致">
    - 打开 `/trace on`，以在会话中显示插件拥有的 Active Memory 调试摘要。
    - 打开 `/verbose on`，以便在每次回复后也能看到 `🧩 Active Memory: ...` 状态行。
    - 关注 gateway 日志中的 `active-memory: ... start|done`、 `memory sync failed (search-bootstrap)` 或 provider embedding 错误。
    - 运行 `openclaw status --deep` 来检查 memory-search 后端和 index 健康状况。
    - 如果你使用 `ollama`，请确认已安装 embedding 模型 （`ollama list`）。
  </Accordion>

  <Accordion id="first-recall-after-gateway-restart-returns-status-timeout" title="网关重启后首次调用返回 `status=timeout`">
    在 v2026.5.2 及更高版本中，如果冷启动设置（model warm-up + embedding index load）在第一次召回触发时尚未完成，运行可能会耗尽配置的 `timeoutMs` 预算，并返回 `status=timeout` 且输出为空。gateway 日志会在重启后第一个符合条件的回复附近显示 `active-memory timeout after Nms`。

    有关建议的 `setupGraceTimeoutMs` 值，请参阅“推荐设置”下的 [ 冷启动宽限](/concepts/active-memory/recommended-setup#cold-start-grace)。

  </Accordion>
</AccordionGroup>
