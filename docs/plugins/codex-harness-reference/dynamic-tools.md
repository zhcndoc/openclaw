---
summary: "OpenClaw 动态工具如何暴露于 Codex 应用程序服务器轮流"
read_when:
  - "您需要知道Codex可以调用哪些OpenClaw工具"
  - "您正在更改动态工具加载或排除"
  - "您正在调试 Codex 工具负载"
title: "Codex 动态工具"
sidebarTitle: "动态工具"
---

哪些 OpenClaw 动态工具达到 Codex 转弯，以及如何加载它们。 [Codex harness参考 ](/plugins/codex-harness-reference) 的一部分； [ 每个部分移动的位置](/plugins/codex-harness-reference#where-each-section-moved) 列出每个部分。

## <a id="dynamic-tools"></a> 动态工具

Codex 动态工具默认加载 `searchable`，与 `deferLoading: true` 一起暴露在 `openclaw` 命名空间下。 OpenClaw 通常不会公开重复 Codex-native 工作区操作或 Codex 自己的工具搜索界面的动态工具：

- `read`
- `write`
- `edit`
- `apply_patch`
- `exec`
- `process`
- `dispatch_action`
- `tool_describe`
- `tool_search`

`progress_card` 未使用这些本机工作区工具进行过滤。它仍然可以通过 OpenClaw 动态工具桥作为持久会话状态表面。

当有限的运行时允许列表禁用原生 Code Mode 时，OpenClaw 会发送一个空的执行环境选择。在这种直接、无沙箱的情况下， OpenClaw 会保留经过策略过滤的 `exec` 和 `process` 工具，作为 Shell 后备方案。运行时允许列表和 `codexDynamicToolsExclude` 仍然适用。

大多数剩余的 OpenClaw 集成工具，例如消息传递、媒体、cron、浏览器、节点、网关、`heartbeat_respond` 和 `web_search`，都可以通过该命名空间下的 Codex 工具搜索获得。这使得初始模型上下文更小。无论 `codexDynamicToolsLoading` 为何，一小部分工具仍可直接调用，因为 Codex 工具搜索可能不可用或解析仅限连接器的 Universe：`agents_list`、`sessions_spawn` 和 `sessions_yield`。开发人员指令仍将正常的 Codex 子代理引导至本机 `spawn_agent` 以进行 Codex-native 子代理工作，而 `sessions_spawn` 仍可用于显式 OpenClaw 或 ACP 委派。仅消息工具的源回复也保持直接，因为这是一个回合控制合同。

Codex Code Mode 会将通用的 OpenClaw 动态工具结果投影为文本。在读取字段之前，请先解析 JSON 结果。 嵌套的动态调用由 Codex 运行时串行化，因此 `Promise.all` 不会并发提交这些调用；启动收集器子任务时，请使用有界的顺序启动循环。

标记为 `catalogMode: "direct-only"` 的工具（包括 OpenClaw `computer` 工具和常规代理 `openclaw` 委派）分组在 `openclaw_direct` 下。 OpenClaw 将该名称空间添加到 Codex 的 `features.code_mode.direct_only_tool_namespaces` 列表中，而不替换操作员提供的条目。因此，Codex 在普通线程和仅代码模式线程中将这些工具公开为 `DirectModelOnly`，而不是通过嵌套代码模式 `tools.*` 调用路由它们。这保留了带有图像的结果，否则嵌套的代码模式会展平为文本。它还保留对直接模型调用的委派人工批准：生成的脚本单元不得让模型在批准仍在等待时完成其轮次。

仅当连接到无法搜索延迟动态工具的自定义 Codex 应用程序服务器或调试完整工具有效负载时，才设置 `codexDynamicToolsLoading: "direct"`。
