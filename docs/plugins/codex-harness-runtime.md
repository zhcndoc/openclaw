---
summary: "Codex harness 的运行时边界、钩子、工具、权限和诊断"
title: "Codex harness 运行时"
read_when:
  - "你需要 Codex harness 运行时支持契约"
  - "你正在调试原生 Codex 工具、钩子、压缩或反馈上传"
  - "你正在更改 OpenClaw 和 Codex harness 回合之间的插件行为"
---

Codex harness 回合的运行时契约。有关设置和路由，请参见 [Codex harness](/plugins/codex-harness)。有关配置字段，请参见 [Codex harness 参考](/plugins/codex-harness-reference)。

## <a id="overview"></a> 概览

Codex 负责原生模型循环、原生线程恢复、原生工具续接以及原生压缩。OpenClaw 负责通道路由、会话文件、可见消息投递、OpenClaw 动态工具、审批、媒体投递，以及围绕该边界的转录镜像。

成功的 `/btw` 附带问题会报告汇总使用情况以回复使用挂钩，并在启用诊断时报告 `model.usage` 事件。总计包括缓存读取、缓存写入以及侧线程本机工具循环中每个已完成的模型调用；重放的响应 ID 只计数一次。可见回复仍然只包含最后一个答案，主会话的使用情况和上下文快照保持不变。

只读会话分叉重用父级准备好的线程和轮次设置。在托管推理路线上，它们重播最后一个模型请求的确切指令、工具架构和输入前缀，然后是完成的父响应和附带问题。进一步的分叉继续保留其工具拒绝结果。如果重建的历史记录不再与记录的前缀匹配，则本机历史记录优先，但不保证提示缓存重用。这些请求快照在父结算后保留在进程内存中，位于共享的 32 MiB 最近最少使用的预算内。被驱逐或过大的快照，或者引用先前服务器端上下文的 WebSocket 延续，会回退到本机线程重建，而无法保证提示缓存重用。当准备好的请求保留在快照预算中时，本机重建会保留父级的确切指令和工具架构，包括代码模式目录。工具选择仍然是 `none`，并且本机托管搜索保持禁用状态。单独保留的 OpenClaw 指令文本仅限于每个线程 256 个 KiB 和每个路由 256 个线程。线程退休或客户端关闭会删除保留的上下文。这些快照都不会扩展父级的权限：每个分叉都使用当前端请求的授权和取消生命周期。本机工具通过所需的 PreToolUse 中继被拒绝。 Codex 中禁用了托管 Web 搜索，并且重播请求使用 `tool_choice: "none"`，因此保留父级的确切工具架构无法启用托管执行。

对于本机连接的应用程序，Codex 还拥有最终的每线程应用程序和工具策略。 OpenClaw 缓存运行时和工作空间范围的 `plugin/installed` 快照，读取准确配置的插件详细信息，暂时仅允许明确允许、经过所有权验证的应用程序，并创建默认拒绝的本机线程。一个 `app/installed` 请求可验证实际线程 ID，而无需强制刷新清单。丢失、禁用或不可调用的应用程序会产生一个警告；对话继续讨论剩下的工具。 Codex 仍然对实际线程强制执行应用程序和工具权限。

此检查在 OpenClaw 注入历史记录、开始回合或提交线程绑定之前完成。如果快照请求失败，持久临时线程将被删除，临时线程将被取消订阅。当无法确认安全清理时，OpenClaw 会停用应用程序-服务器连接。受监督的分支还会清理其临时检查，并在清理失败时保留恢复状态。

全账户范围的应用访问权限无法覆盖明确禁用的已配置工作区插件。OpenClaw 使用其已安装快照，并仅读取该确切插件的详情来识别并拒绝其应用；它绝不会扫描无关的市场，也不会激活该插件。

提示路由遵循选定的运行时，而不仅仅是提供程序字符串。本机 Codex 回合获取 Codex 应用程序服务器开发人员指令；显式的 OpenClaw 兼容性路由即使使用 Codex- 风格的 OpenAI 身份验证或传输，也会保留正常的 OpenClaw 系统提示符。

OpenClaw 使用 Codex 的内置个性禁用 （`personality: "none"`） 启动和恢复本机 Codex 线程，因此工作区个性文件和 OpenClaw 代理身份保持权威。本机 Codex 保留 Codex- 拥有的 base/model 指令和项目文档加载。普通的策略限制轮没有本机文件系统环境，因此 OpenClaw 携带有界工作区 `AGENTS.md` 快照作为线程级开发人员指令。轻量级、零环、仅消息和禁用工具的内部转向抑制了项目文档加载和后备载体。

OpenClaw 开发人员说明涵盖了 OpenClaw 运行时问题：源通道交付、OpenClaw 动态工具、ACP 委派、适配器上下文和活动代理工作区配置文件。通过 OpenClaw- 管理的直接 stdio 应用程序服务器，包括选择用于计算机使用的桌面可执行文件、技能目录、角色文件、内存提供程序指令、插件注入的系统上下文和工具路由的 `MEMORY.md` 指南，通过私有推理中继将其附加到父模型请求指令中。原生库和目录说明保持不变；此新上下文不会写入本机对话历史记录或由本机子代理自动继承。没有该中继的连接在线程开发人员指令中携带合格的技能、角色和内存，从而在模型拥有协作模式指令时保留交付。本地孩子可以继承后备上下文；选定的个人 `users/<profile-id>/USER.md` 覆盖被排除在外，并且需要托管的仅限家长中继。有关回退刷新和继承语义，请参阅 [ 工作空间引导文件](/plugins/codex-harness-reference/workspace-bootstrap-files)。插件`before_prompt_build`系统上下文为每轮准备好；当后台命令运行时，更改调用结果不会重新加载托管线程或阻止后续消息。它遵循稳定的父上下文并共享中继的 256 KiB 上下文限制。插件 `systemPrompt` 替换仍然保持线程策略。活动的 `BOOTSTRAP.md` 以及当内存工具不可用时，有界的 `MEMORY.md` 内容作为普通转向输入参考进行传输。在冷恢复或本机压缩之后，以及当它们的渲染内容发生变化时，它们被引入到新的本机线程上。一旦提交了完整的块，连续的热轮就会忽略未更改的引用。因提示拟合而丢弃或截断的引用将在稍后的回合中再次引入。当网关重新启动时，进程本地跟踪将重置。

内存插件在准备其指令时接收完整的可用工具集，包括延迟的插件工具。该策略不依赖于旧版内存工具名称或工作区文件路由。

自定义命令、桌面代理附件、外部 Unix/WebSocket 应用程序服务器连接、非 OpenAI 本机提供程序、自定义上游端点、不受支持的本机帐户、锁定的上游和本机 `features.respect_system_proxy` 配置文件使用线程开发人员载体。托管中继请求使用网关的 HTTP（S） 代理和 TLS 配置，而不是更改本机网络设置。 OpenClaw 保持本机网络和帐户配置不变。保留现有历史记录，包括任何较旧的嵌入角色或明确共享的任务文本；这不是追溯历史。请参阅 [ 工作区引导文件 ](/plugins/codex-harness-reference#workspace-bootstrap-files)。

交付模式和当前消息目标要求在每个用户轮流之前作为紧凑应用程序上下文到达。它们明确取代了早期的交付指南，同时保留许可和时间背景。使用相同的可用工具，在自动回复和仅消息工具回复之间切换可以保持静态指令和消息工具定义不变。如果消息工具在仅消息工具回合中不可用，则最终文本对调用工作流程保持私有；它不会传递到源对话。

当 `openclaw_direct.sessions_yield` 可用时，这些指令还会告知原生 Codex 父代理：如果子代理的结果应在后续回合到达，则结束当前回合。原生 `wait_agent` 仍用于有意进行的同回合等待，即下一步操作会立即受阻于子代理；完成轮询循环不能作为替代方案。

大多数 OpenClaw 动态工具使用可搜索的 `openclaw` 命名空间。标记为 `catalogMode: "direct-only"` 的工具使用 `openclaw_direct`，Codex 会将其直接保持为模型可见的 `DirectModelOnly`，而不是将其暴露给嵌套的 Code Mode 执行。

后台动态工具启动算作潜在的副作用，包括从通常执行只读工作的工具启动。轮回恢复会保留该证据，因此不会重复已接受的后台任务。

工具架构修复保留文字属性和定义名称，包括 `__proto__`。通告到 Codex 的架构和用于验证 OpenClaw 工具调用的架构保留相同的必需字段和约束。

对于 [ 托管的 GitHub 身份 ](/gateway/config-tools#tools.github)，`gateway_exec` 使用 OpenClaw 的私有本地进程启动凭据绑定。本机 Codex shell 仅接收非秘密 `GH_CONFIG_DIR` 和令牌清除覆盖；丢失或无令牌配置文件仍然可以让 GitHub CLI 回退到 OS 密钥环。 Status 和 Gateway 拥有的发布保证不涵盖该本机 shell 路径。当需要启动绑定的托管 GitHub 凭据时，请使用 `gateway_exec`。

## <a id="media-and-delivery"></a> 媒体和交付

OpenClaw 继续拥有媒体交付和媒体提供商选择。图像、视频、音乐、PDF、TTS 和媒体理解使用匹配的 provider/model 设置，例如 `agents.defaults.mediaModels.image`、`agents.defaults.mediaModels.video`、`pdfModel` 和 `tts`。

文本、图像、视频、音乐、TTS、审批以及消息工具输出继续通过正常的 OpenClaw 交付路径；媒体生成不需要旧版运行时。当 Codex 发出一个带有 `savedPath` 的原生图像生成项时，OpenClaw 会通过正常的回复媒体路径转发该确切文件，即使该 Codex 回合没有助理文本。

发送附件仅抑制同一目标上匹配的生成图像；其他生成的图像仍然可用。内部 UI 源回复保留其传送的附件，而不添加第二个生成的副本。部分送达收据不会抑制未确认送达的图像。

## <a id="where-each-section-moved"></a> 各部分移动的地方

单页版本的每个部分现在都位于此页面或下面的九个子页面之一上。单页版本中的锚点仍然在这里解析。

### <a id="codex-process-recovery"></a> Codex进程恢复

[Codex 进程恢复](/plugins/codex-harness-runtime/recovery) — 网关硬停止后孤立的 Codex 应用程序服务器进程检测和清理。

- <a id="recovery-after-a-hard-gateway-stop"></a>[网关硬停止后恢复](/plugins/codex-harness-runtime/recovery#recovery-after-a-hard-gateway-stop)

### <a id="codex-thread-bindings-and-supervision"></a> Codex 螺纹绑定和监督

[Codex 线程绑定和监督](/plugins/codex-harness-runtime/threads) — OpenClaw 如何绑定本机 Codex 线程、更改模型并继续受监督的会话。

- <a id="thread-bindings-and-model-changes"></a>[线程绑定和模型更改](/plugins/codex-harness-runtime/threads#thread-bindings-and-model-changes)
- <a id="supervision-and-safe-continuation"></a>[监管安全延续](/plugins/codex-harness-runtime/threads#supervision-and-safe-continuation)

### <a id="codex-replies-and-final-answers"></a> Codex 回复和最终答案

[Codex 回复和最终答案](/plugins/codex-harness-runtime/replies) — 可见的回复传递、心跳轮次和有限的最终答案恢复。

- <a id="visible-replies-and-heartbeats"></a>[可见回复和心跳](/plugins/codex-harness-runtime/replies#visible-replies-and-heartbeats)
- <a id="final-answers-after-settled-tool-work"></a>[工具工作确定后的最终答案](/plugins/codex-harness-runtime/replies#final-answers-after-settled-tool-work)

### <a id="codex-hook-boundaries"></a> Codex 钩边界

[Codex 挂钩边界](/plugins/codex-harness-runtime/hooks) — 哪个挂钩层拥有每个 Codex 回合事件，以及本机挂钩中继可以执行哪些操作。

- <a id="hook-boundaries"></a>[H边界](/plugins/codex-harness-runtime/hooks#hook-boundaries)

### <a id="codex-sandbox-process-streaming"></a> Codex 沙箱进程流式传输

[Codex 沙箱进程流 ](/plugins/codex-harness-runtime/sandbox-streaming) — 实验性本机沙箱执行流和节点支持的远程执行。

- <a id="experimental-sandbox-process-streaming"></a>[实验沙箱流程流](/plugins/codex-harness-runtime/sandbox-streaming#experimental-sandbox-process-streaming)

### <a id="codex-runtime-v1-support-contract"></a> Codex 运行时 v1 支持合同

[Codex 运行时 v1 支持合约](/plugins/codex-harness-runtime/v1-support-contract) — Codex 运行时 v1 支持什么和不支持什么，以及每个边界的原因。

- <a id="v1-support-contract"></a>[V1 支持合约](/plugins/codex-harness-runtime/v1-support-contract#v1-support-contract)

### <a id="codex-native-permissions-and-elicitations"></a> Codex 本机权限和引发

[Codex 本机权限和引出](/plugins/codex-harness-runtime/permissions) — 本机权限决策、记住的批准和 MCP 引出限制。

- <a id="native-permissions-and-mcp-elicitations"></a>[本机权限和 MCP 引出](/plugins/codex-harness-runtime/permissions#native-permissions-and-mcp-elicitations)

### <a id="codex-queue-steering-and-feedback-upload"></a> Codex 队列引导和反馈上传

[Codex 队列控制和反馈上传](/plugins/codex-harness-runtime/queue-and-feedback) — Codex 转弯和 Codex 反馈上传路径上的主动运行队列控制。

- <a id="queue-steering"></a>[队列转向](/plugins/codex-harness-runtime/queue-and-feedback#queue-steering)
- <a id="codex-feedback-upload"></a>[Codex反馈上传](/plugins/codex-harness-runtime/queue-and-feedback#codex-feedback-upload)

### <a id="codex-compaction-and-transcript-mirror"></a> Codex 压缩和转录镜像

[Codex 压缩和转录镜像](/plugins/codex-harness-runtime/compaction) — 原生 Codex 压缩、OpenClaw 转录镜像和连续性投影。

- <a id="compaction-and-transcript-mirror"></a>[压缩和转录镜像](/plugins/codex-harness-runtime/compaction#compaction-and-transcript-mirror)

## <a id="related"></a> 相关内容

- [Codex 运行环境](/plugins/codex-harness)
- [Codex harness 参考](/plugins/codex-harness-reference)
- [Codex 监督](/plugins/codex-supervision)
- [原生 Codex 插件](/plugins/codex-native-plugins)
- [插件钩子](/plugins/hooks)
- [Agent harness 插件](/plugins/sdk-agent-harness)
- [Agent 运行时](/concepts/agent-runtimes)
- [诊断导出](/gateway/diagnostics)
- [轨迹导出](/tools/trajectory)
- [ACP 代理](/tools/acp-agents) — 如何配置和绑定 ACP 代理
