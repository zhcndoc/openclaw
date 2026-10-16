---
summary: "用于替代底层嵌入式 agent 执行器的插件实验性 SDK 接口"
title: "Agent 执行器插件"
sidebarTitle: "Agent 执行器"
read_when:
  - "你正在更改嵌入式 agent 运行时或执行器注册表"
  - "你正在从捆绑或可信插件中注册 agent 执行器"
  - "你需要了解 Codex 插件与模型提供方之间的关系"
---

**agent 执行器** 是一个已准备好的 OpenClaw agent 回合的底层执行器。它不是模型提供方，不是通道，也不是工具注册表。关于面向用户的心智模型，请参见 [Agent 运行时](/concepts/agent-runtimes)。

仅将此表面用于捆绑或受信任的本机插件。该合约仍处于实验阶段，因为参数类型有意反映当前嵌入式运行器。排除仅核心辅助运行控件：侧聊天的直接工具和选定会话读取限制是内部行为，不支持插件harness输入。

## <a id="when-to-use-a-harness"></a> 何时使用 harness

当某个模型家族拥有自己的原生会话运行时，而常规的 OpenClaw provider 传输不是合适的抽象时，请注册一个 agent harness：

- 一个拥有线程和压缩能力的原生编程代理服务器
- a 本地 CLI 或必须流式传输本机 plan/reasoning/tool 事件的守护程序
- a 模型运行时除了 OpenClaw 会话记录之外还需要自己的简历 ID

**not** 是否注册harness只是为了添加新的 LLM API。对于普通的 HTTP 或 WebSocket 模型 API，构建一个 [provider 插件 ](/plugins/sdk-provider-plugins)。

## <a id="where-each-section-moved"></a> 各部分移动的地方

单页版本的每个部分现在都位于此页面或下面的八个子页面之一上。单页版本中的锚点仍然在这里解析。

### <a id="core-ownership-contract"></a> 核心所有权合约

[Agent harness核心所有权](/plugins/sdk-agent-harness/core-ownership) — 在 `runAttempt` 之前核心准备什么，以及harness可以声明的工具策略、身份验证引导、会话所有权和请求传输合同。

- <a id="what-core-still-owns"></a>[还拥有什么核心](/plugins/sdk-agent-harness/core-ownership#what-core-still-owns)
- <a id="native-tool-policy-enforcement"></a>[本机工具策略执行](/plugins/sdk-agent-harness/core-ownership#native-tool-policy-enforcement)
- <a id="harness-owned-auth-bootstrap"></a>[Harness 拥有的身份验证引导程序](/plugins/sdk-agent-harness/core-ownership#harness-owned-auth-bootstrap)
- <a id="bound-native-session-ownership"></a>[绑定本机会话所有权](/plugins/sdk-agent-harness/core-ownership#bound-native-session-ownership)
- <a id="verified-setup-runtime-artifacts"></a>[已验证的设置运行时工件](/plugins/sdk-agent-harness/core-ownership#verified-setup-runtime-artifacts)
- <a id="request-transport-contract"></a>[请求运输合同](/plugins/sdk-agent-harness/core-ownership#request-transport-contract)
- <a id="per-turn-temporal-context"></a>[每回合时间上下文](/plugins/sdk-agent-harness/core-ownership#per-turn-temporal-context)

### <a id="harness-registration"></a> harness注册

[注册代理工具](/plugins/sdk-agent-harness/registration) — `AgentHarnessV2` 注册示例，以及可选的隔离完成和委托执行功能。

- <a id="register-a-harness"></a>[注册harness](/plugins/sdk-agent-harness/registration#register-a-harness)
- <a id="isolated-completion"></a>[隔离完成](/plugins/sdk-agent-harness/registration#isolated-completion)
- <a id="delegated-execution"></a>[委托执行](/plugins/sdk-agent-harness/registration#delegated-execution)

### <a id="harness-selection-and-provider-pairing"></a> harness选择和提供商配对

[代理harness选择策略](/plugins/sdk-agent-harness/selection-policy) — OpenClaw 在提供程序和模型解析后如何选择harness，以及为什么harness通常附带提供程序插件。

- <a id="selection-policy"></a>[选型政策](/plugins/sdk-agent-harness/selection-policy#selection-policy)
- <a id="provider-plus-harness-pairing"></a>[提供者加harness配对](/plugins/sdk-agent-harness/selection-policy#provider-plus-harness-pairing)

### <a id="attempt-runtime-helpers"></a> 尝试运行时助手

[代理利用尝试运行时](/plugins/sdk-agent-harness/attempt-runtime) — 受保护的输入注入、工具结果中间件、终端结果分类、实时令牌使用和代理端副作用。

- <a id="guarded-active-run-injection"></a>[防护主动运行注入](/plugins/sdk-agent-harness/attempt-runtime#guarded-active-run-injection)
- <a id="tool-result-middleware"></a>[工具结果中间件](/plugins/sdk-agent-harness/attempt-runtime#tool-result-middleware)
- <a id="terminal-outcome-classification"></a>[终端结局分类](/plugins/sdk-agent-harness/attempt-runtime#terminal-outcome-classification)
- <a id="live-output-token-usage"></a>[实时产出-代币使用](/plugins/sdk-agent-harness/attempt-runtime#live-output-token-usage)
- <a id="agent-end-side-effects"></a>[代理端副作用](/plugins/sdk-agent-harness/attempt-runtime#agent-end-side-effects)

### <a id="user-input-and-execution-authority"></a> 用户输入及执行权限

[Agent 利用用户输入和执行权限](/plugins/sdk-agent-harness/user-input-and-execution) — 阻止用户输入界面、主机工具功能、执行审核者结果和配对设备命令权限。

- <a id="user-input-and-tool-surfaces"></a>[用户输入和工具表面](/plugins/sdk-agent-harness/user-input-and-execution#user-input-and-tool-surfaces)
- <a id="exec-reviewer-outcomes"></a>[执行审稿人结果](/plugins/sdk-agent-harness/user-input-and-execution#exec-reviewer-outcomes)
- <a id="paired-device-execution"></a>[配对设备执行](/plugins/sdk-agent-harness/user-input-and-execution#paired-device-execution)

### <a id="native-inventories"></a> 原生库存

[Agent harness本机库存](/plugins/sdk-agent-harness/native-inventories) — 从harness自身的运行时报告的只读本机模型行和 MCP 工具目录。

- <a id="native-model-inventory"></a>[原生模型库存](/plugins/sdk-agent-harness/native-inventories#native-model-inventory)
- <a id="native-mcp-inventory"></a>[原生MCP 库存](/plugins/sdk-agent-harness/native-inventories#native-mcp-inventory)

### <a id="runtime-configuration"></a> 运行时配置

[Agent 利用运行时配置](/plugins/sdk-agent-harness/runtime-config) — 本机 Codex 利用模式和严格的提供程序、模型或每个代理运行时策略。

- <a id="native-codex-harness-mode"></a>[原生Codexharness模式](/plugins/sdk-agent-harness/runtime-config#native-codex-harness-mode)
- <a id="runtime-strictness"></a>[运行时严格性](/plugins/sdk-agent-harness/runtime-config#runtime-strictness)

### <a id="sessions-and-results"></a> 会话和结果

[Agent 利用会话和结果](/plugins/sdk-agent-harness/sessions-and-results) — 本机会话绑定和转录镜像，以及工具、媒体、终端结果和固定回合结果。

- <a id="native-sessions-and-transcript-mirror"></a>[本机会话和转录镜像](/plugins/sdk-agent-harness/sessions-and-results#native-sessions-and-transcript-mirror)
- <a id="tool-and-media-results"></a>[工具和媒体结果](/plugins/sdk-agent-harness/sessions-and-results#tool-and-media-results)
- <a id="terminal-tool-outcomes"></a>[终端工具成果](/plugins/sdk-agent-harness/sessions-and-results#terminal-tool-outcomes)
- <a id="settled-tool-finalization"></a>[固定刀具定型](/plugins/sdk-agent-harness/sessions-and-results#settled-tool-finalization)

## <a id="current-limitations"></a> 当前限制

- 公共导入路径是通用的，但某些 attempt/result 类型别名仍保留旧名称以兼容。
- 第三方 harness 安装处于实验阶段。除非你需要原生会话运行时， 否则优先使用提供方插件。
- 支持在不同轮次之间切换 harness。不要在一轮中途，在原生工具、审批、助手文本或消息发送已经开始后切换 harness。

## <a id="related"></a> 相关内容

- [SDK Overview](/plugins/sdk-overview)
- [运行时 Helpers](/plugins/sdk-runtime)
- [提供商 Plugins](/plugins/sdk-provider-plugins)
- [Codex Harness](/plugins/codex-harness)
- [Codex harness运行时](/plugins/codex-harness-runtime)
- [副驾驶SDKharness](/plugins/copilot)
- [模型 Providers](/concepts/model-providers)
