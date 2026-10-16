---
summary: "本机权限决策、记住的批准和 MCP 激发限制"
read_when:
  - "您正在通过 OpenClaw 路由 Codex 本机权限请求"
  - "您需要 MCP 启发表和 URL 限制"
title: "Codex 本机权限和引发"
sidebarTitle: "权限和诱导"
---

本机权限请求和 MCP 引出如何到达 OpenClaw 批准流程。 [Codex harness运行时 ](/plugins/codex-harness-runtime) 指南的一部分； [ 每个部分移动的位置](/plugins/codex-harness-runtime#where-each-section-moved) 列出每个部分。

## <a id="native-permissions-and-mcp-elicitations"></a> 原生权限和 MCP 询问

对于 `PermissionRequest`，OpenClaw 仅在策略决定时返回明确的允许或拒绝决策。没有决策的结果并不等同于允许：Codex 会将其视为没有挂钩决策，并继续走其自身的守护程序或用户批准路径。

Codex app-server 的批准模式默认省略此原生挂钩。除非 `permission_request` 被显式包含在 `nativeHookRelay.events` 中，或者兼容运行时安装了它，否则都适用。

当操作员为 Codex 本机权限请求选择 `allow-always` 时，OpenClaw 会记住有界会话窗口的确切 provider/session/tool input/cwd 指纹。记住的决定只是故意精确匹配：更改的命令、参数、工具负载或 cwd 创建新的批准。

当 Codex 将 `_meta.codex_approval_kind` 标记为 `"mcp_tool_call"` 时，Codex MCP 工具审批引出将通过 OpenClaw 的插件审批流程。插件、帐户、计算机使用和 MCP 批准分类在普通输入处理之前运行。被拒绝的策略或不可映射的批准模式会返回明确的拒绝，并且永远不会成为通用形式。

对于本机应用程序工具，请参阅 [ 批准决策顺序 ](/plugins/codex-native-plugins#approval-decision-order)，了解 OpenClaw 默认值、本机每个工具覆盖、记住的批准，以及合格的托管应用程序工具如何在禁用的工具保持阻止状态时获得同意。

OpenClaw 支持应用程序服务器 MCP 引出模式 `form`、`openai/form` 和 `url`。标准表单和扩展表单最多可以包含 12 个字段。 OpenClaw 将字段名称标准化为网关安全的问题 ID，保留接受内容中的原始名称，并以最多三个的顺序批次显示字段。每个字段最多可以提供四种选择；超出这些限制的字段和选择会被拒绝而不是被截断。支持的字段包括自由格式字符串、字符串 `enum` 或 `oneOf` 选择、布尔值、数字和整数以及多选字符串数组。自由格式字符串值的长度限制为 4,096 个字符。在返回接受的响应之前，将验证字符串长度、`email`、`uri`、`date` 和 `date-time` 约束以及数字或数组边界。可选字段、必填字段和有效默认值保留其架构含义。

没有字段的表单显示带有 **Allow** 和 **Decline** 选项的原始请求消息。 OpenClaw 仅在显式允许应答后返回空内容对象。拒绝或取消提示永远不会确认请求，并且迟到的答复也无法确认轮次已结束的请求。

`openai/form` 还支持单选 `openai/imagePicker` 字段，最多可包含四个有界项目 ID 和标题。 OpenClaw 仅使用这些 ID 和标题；它不获取或渲染项目图像。未知的扩展字段类型会产生可见的操作员消息和明确的拒绝。这种可见的回退是 `openai/form` 功能合同的一部分。

URL 引出显示为文字文本，具有明确的“继续”和“拒绝”选择。 OpenClaw 不获取或打开 URL。 URL 的长度限制为 2,048 个字符，必须使用 HTTP 或 HTTPS，不能包含凭据，也不能包含控制字符或不可见字符。无效的 URL 会产生可见的解释和明确的拒绝。

Codex `request_user_input` 和普通 MCP 引出共享一个每轮交互队列。 Control UI 呈现每个非秘密网关问题，并且当通道支持时，单个选择使用键入的通道按钮。点击按钮、Control UI 应答以及下一个排队的纯文本回复将解析相同的应用程序服务器请求。 `serverRequest/resolved` 通过其外部字符串或整数 JSON-RPC ID 选择请求；尝试中止、超时和清理会取消当前所有者。迟到的答复无法解决排队的替换问题。

仅显式字段 `isSecret: true` 或 Codex 问题 `isSecret: true` 启用秘密处理。通过警告的临时文本回复路径一次请求一个秘密表单字段，并且永远不会创建持久的网关问题记录。 OpenClaw 不会从字段名称推断保密性。

## <a id="async-questions"></a> 异步问题

当所选的 Codex 模型宣传 `request_user_input_async` 时，Codex 可以在继续工作的同时提出结构化问题。该工具立即返回。 OpenClaw 保留异步助手消息上的问题，Control UI 显示建议的答案和自由文本字段。选择建议并不发送；用户必须明确提交答案。

答案使用正常的聊天传递：它们引导一个活动回合或在同一对话结束后开始一个新回合。该问题与答案一起被引用，以便 Codex 可以识别它所解决的问题。异步问题不会创建等待工具调用或使用上面的阻塞问题队列。它们遵循与其他本机异步消息相同的工具和消息传递限制。沉默和预先选择的答案永远不会获得批准。

从问题上滚动并返回会保留其草稿和任何正在进行的提交。提交完成后，卡片会显示结果。

通道接收 Codex 的可读问题文本和选择并接受正常回复。 Control UI 每条消息最多支持 12 个问题，每个问题有 4 个选项，标题最多 4,096 个字符，选项最多 256 个字符。不受支持的结构化有效负载保留完整的纯文本问题。

关于承载这些提示的一般插件批准流程，请参见 [插件权限请求](/plugins/plugin-permission-requests)。
