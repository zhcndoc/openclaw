---
summary: "来自聊天的日常 /acp 流程、ACP 会话生命周期以及本机 Codex 与 ACP 路由"
title: "ACP 代理操作员操作手册"
read_when:
  - "您正在聊天中操作 /acp 命令"
  - "您需要 ACP 会话生命周期规则"
  - "您需要知道请求何时路由到本机 Codex 而不是 ACP"
---

## <a id="operator-runbook"></a> 操作手册

从聊天中快速进行 `/acp` 流程：

<Steps>
  <Step id="spawn" title="生成">
    `/acp spawn claude --bind here`、 `/acp spawn gemini --mode persistent --thread auto`，或显式 `/acp spawn codex --bind here`。
  </Step>
  <Step id="work" title="工作">
    在已绑定的对话或线程中继续（或者显式指定会话键）。
  </Step>
  <Step id="check-state" title="检查状态">
    `/acp status`
  </Step>
  <Step id="tune" title="调">
    `/acp model <provider/model>`, `/acp permissions <profile>`,
    `/acp timeout <seconds>`.
  </Step>
  <Step id="steer" title="引导">
    不替换上下文：`/acp steer tighten logging and continue`。该指令在当前回合结束后运行。要重定向正在进行的工作，请先 `/acp cancel`。
  </Step>
  <Step id="stop" title="停止">
    `/acp cancel`（当前回合）或 `/acp close`（会话 + 绑定）。取消等待已接受的转弯及其运行时清理完成。
  </Step>
</Steps>

<AccordionGroup>
  <Accordion id="lifecycle-details" title="生命周期详细信息">
    - Spawn 创建或恢复 ACP 运行时会话，并将 ACP 元数据记录在 OpenClaw 会话存储中。父级拥有的运行使用本机子代理生命周期来完成。
    - A 失败的生成会在返回之前等待任何已开始的临时会话删除完成，包括清理请求截止时间到期时。
    - 父拥有的 ACP 会话被视为后台工作，即使运行时会话是持久的；完成和跨表面交付遵循其可接受的本机完成路径，而不是像普通的面向用户的聊天会话一样。
    - ACP 控制平面在回合结束后关闭一次性运行时手柄。持久会话保持其 ACP 会话和绑定生命周期；使用 `/acp close` 明确结束一个。清理不依赖于任务记录。
    - Bound 后续消息直接进入 ACP 会话，直到绑定关闭、分离、重置或过期。
    - Gateway 命令保留在本地。 `/acp ...`、`/status` 和 `/session` 永远不会作为普通提示文本发送到绑定的 ACP harness。
    - 当后端支持取消时，`cancel` 会中止当前活动轮次；它不会删除绑定或会话元数据。
    - Turn 完成等待排队的输出传送。如果传递失败，OpenClaw 将取消活动轮次并等待后端清理，然后在配置的轮次超时内开始下一个排队的轮次。
    - 从 OpenClaw 的角度来看，`close` 结束 ACP 会话并删除绑定。如果harness支持恢复，则它仍然可以保留自己的上游历史记录。
    - acpx 插件会在 `close` 之后清理 OpenClaw- 拥有的包装器和适配器进程树，并在网关启动期间收获过时的 OpenClaw- 拥有的 ACPX 孤儿进程。
    - 空闲运行时工作进程在内置空闲期过后可被清理；存储的会话元数据仍可用于 `/acp sessions`。

  </Accordion>
  <Accordion id="native-codex-routing-rules" title="本机 Codex 路由规则">
    当启用时，应路由到 **原生 Codex 插件** 的自然语言触发语句：

    - “将这个 Discord 渠道绑定到 Codex。”
    - “把这个聊天附加到 Codex 线程 `<id>`。”
    - “显示 Codex 线程，然后把这个绑定上。”

    本机 Codex 对话绑定是默认的聊天控制路径。 OpenClaw 动态工具仍然通过 OpenClaw 执行，而 Codex-native 工具（例如 shell/apply-patch）在 Codex 内部执行。对于 Codex-native 工具事件，OpenClaw 注入每回合本机钩子继电器，因此插件钩子可以阻止 `before_tool_call`、观察 `after_tool_call` 并通过 OpenClaw 批准路由 Codex `PermissionRequest` 事件。 Codex `Stop` 挂钩被中继到 OpenClaw `before_agent_finalize`，其中插件可以在 Codex 最终确定其答案之前请求另一个模型传递。中继故意保持保守：它不会改变 Codex-native 工具参数或重写 Codex 线程记录。仅当您需要 ACP runtime/session 模型时才使用显式 ACP。嵌入式 Codex 支持边界记录在 [Codex harness v1 支持合约 ](/plugins/codex-harness-runtime#v1-support-contract) 中。

  </Accordion>
  <Accordion id="model-provider-runtime-selection-cheat-sheet" title="模型/提供商/运行时选择备忘单">
    - legacy Codex 模型参考 - 传统 Codex OAuth/subscription 模型路线由医生修复。
    - `openai/*` - 用于 OpenAI 代理轮流的本机 Codex 应用程序服务器嵌入式运行时。
    - `/codex ...` - 原生 Codex 对话控制。
    - `/acp ...` 或 `runtime: "acp"` - 显式 ACP/acpx 控制。

  </Accordion>
  <Accordion id="acp-routing-natural-language-triggers" title="ACP-路由自然语言触发器">
    应该路由到 ACP 运行时的触发语句：

    - “把这个作为一次性的 Claude Code ACP 会话运行并总结结果。”
    - “这个任务在一个线程里使用 Gemini CLI，然后让后续跟进留在同一个线程里。”
    - “在后台线程中通过 ACP 运行 Codex。”

    OpenClaw 选择 `runtime: "acp"`，解析harness `agentId`，在支持时绑定到当前对话或线程，并将后续路由路由到该会话，直到 close/expiry. Codex 仅当 ACP/acpx 显式或本机 Codex 插件时遵循此路径无法执行请求的操作。

    对于 `sessions_spawn`，只有在启用 ACP、请求方未处于沙箱中且已加载 ACP 运行时后端时，才会公布 `runtime: "acp"`。`acp.dispatch.enabled=false` 会暂停自动 ACP 线程分派，但不会隐藏或阻止显式的 `sessions_spawn({ runtime: "acp" })` 调用。它针对的是 `codex`、`claude`、`droid`、`gemini` 或 `opencode` 等 ACP harness id。除非 `agents_list` 中的条目已明确配置为 `agents.entries.*.runtime.type="acp"`，否则不要传入普通的 OpenClaw 配置 agent id；请改用默认的子代理运行时。当某个 OpenClaw agent 配置了 `runtime.type="acp"` 时，OpenClaw 会使用 `runtime.acp.agent` 作为底层 harness id。

  </Accordion>
</AccordionGroup>
