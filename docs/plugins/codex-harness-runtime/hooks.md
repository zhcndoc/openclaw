---
summary: "哪个钩子层拥有每个 Codex 转弯事件，以及本机钩子中继可以做什么"
read_when:
  - "您正在编写一个必须在 Codex 回合上运行的插件挂钩"
  - "您需要本机钩子中继和批准桥规则"
title: "Codex 钩边界"
sidebarTitle: "钩边界"
---

Codex 回合周围的三个钩子层以及每个钩子层拥有的事件。 [Codex harness运行时 ](/plugins/codex-harness-runtime) 指南的一部分； [ 每个部分移动的位置](/plugins/codex-harness-runtime#where-each-section-moved) 列出每个部分。

## <a id="hook-boundaries"></a> 钩子边界

对于普通持久对话，包含 `systemPrompt` 的 `before_prompt_build` 结果将替换完整的 OpenClaw 通用开发人员策略。显式的空字符串会撤销该策略。未更改的、经过配置验证的热线程保持热状态，并在插件策略等待后重新检查保留的订阅和主机权限。关闭或存档的线程不能仅仅因为其连接仍然打开而被重用。冷恢复和更改策略恢复保留本机线程和历史记录，验证 Codex 卸载了先前的配置，然后在承认轮流之前附加完整的取代策略消息。历史政策文本可以保留在记录中；后面的政策明确取代它。

普通对话在本地 stdio、WebSocket、Unix 套接字和 stdio 代理连接上使用相同的取消订阅和恢复流程。本机对话 ID 和历史记录保持不变。 OpenClaw 验证原始应用程序服务器客户端仍然是当前的，线程没有活动轮流，并且 Codex 在安装当前策略之前已卸载以前的配置。

此刷新要求 OpenClaw 成为本机对话的唯一生命周期所有者。当没有独立客户端可以在切换期间重新加载相同的对话时，网关拥有的远程应用程序服务器满足此部署合同。连接和卸载检查不提供独立客户端之间的原子切换：竞争恢复可以重新安装旧的本机配置。与竞争对话所有者共享的应用程序服务器不在此刷新合同之外。

如果订阅者或失败的本机卸载阻止了配置证明，则轮流会在推理之前停止。预写所有权拒绝可以使健康的共享客户端及其其他对话保持可用。策略拒绝和不确定或已确认的策略写入失败会保留对话并停止自动身份验证配置文件、模型回退和整轮重试。

受监督的外部连接保留其现有的共享连接租用语义；现有的本机主页和工具目录限制仍然适用。这些租约检查不会建立外部本机进程的独占所有权；加强这种保证是一项单独的限制，而不是普通政策更新的一部分。手动普通采用仍然需要其代理主页和工具目录检查以及本机进程证明。

普通的隐身对话保留了它们短暂的历史。 Stock Codex 无法更新其通用会话配置或从磁盘恢复它们，因此更改或显式清空的通用策略会在推理之前停止下一轮。恢复之前的策略以继续对话，或为新策略启动新的隐身对话。政策转向不变；此检查不会向隐身历史记录添加空闲到期或持久性。

飞行前拒绝保留正常的外部聊天诊断隐私和群组沉默政策。详细模式可以显示有限的恢复细节； Control UI 保留了通常的诊断渲染。外部关闭的临时线程不能保证可恢复。

| 层                                 | 所有者                    | 用途                                                             |
| ------------------------------------- | ------------------------ | ------------------------------------------------------------------- |
| OpenClaw 插件挂钩                 | OpenClaw                 | Product/plugin 跨 OpenClaw 和 Codex harness的兼容性。   |
| Codex app-server 扩展中间件 | OpenClaw 内置插件 | 围绕 OpenClaw 动态工具的每回合适配器行为。            |
| Codex 原生钩子                    | Codex                    | 来自 Codex 配置的低层级 Codex 生命周期和原生工具策略。 |

OpenClaw 不使用项目级或全局的 Codex `hooks.json` 文件来路由插件行为。对于原生工具和权限桥接，OpenClaw 会为 `PreToolUse`、`PostToolUse`、 `PermissionRequest` 和 `Stop` 注入按线程划分的 Codex 配置。

在启动或恢复线程之前，OpenClaw 准备本机中继存储的 MCP 批准快照和直接发布尝试，然后重新检查当前运行的权限。对于本地应用程序服务器，如果侦听器或 SQLite 定位器不可用，则挂钩命令可以使用现有的网关回退。政策准备仍然必须成功；网关调用等待该快照，而与发布无关。注册返回一个同步句柄，其可选 `deferMcpToolApprovals` 字段在策略准备完成之前保持未定义状态。

冷钩子 CLI 读取定位器而不加载共享状态写入器启动。在Node上，这一一次性进程使用只读连接，没有SQLite锁等待；暂时的锁争用让位于现有的重试和截止日期所有者。在 Bun 上，它使用专用的只读工作线程，并在使用结果之前加入该工作线程，以便释放本机数据库句柄。两条路径都保留模式准入并在查找后关闭数据库。

桥接发布、更新、查找和删除在共享状态工作线程中运行。发布和更新重新检查其写入事务中的当前主机注册，并在关闭侦听器之前清理加入已接受的工作。

没有侦听直接桥的中继仍然可以更新其逻辑到期；监听桥在延长可见期限之前更新其存储的定位器。取消注册会使前台访问立即失效。清理会耗尽已接受的定位器写入，并且一旦中继退出，侦听器就会关闭。成功屈服后保留的晚钩子和直接子代的现有宽限窗口被保留；耗尽待处理的存储工作不会关闭这些子项。

## <a id="remote-native-hook-callbacks"></a> 远程本机钩子回调

专用 Codex 应用程序服务器无法读取网关的 SQLite 定位器或到达其环回侦听器。将 `plugins.entries.codex.config.appServer.nativeHookRelay` 与 `url` 和 `credentialDirectory` 设置为使用受限的 HTTPS 回调。 `url`是`/__openclaw__/native-hook`的外部走线底座；适配器附加继电器 ID。 OCE 为专用 Codex 代理生成此配置。

部署必须提供模型工作区和文件传输根之外的私有目录，以及用于挂钩进程的可信 CA 证书。在开始轮次之前，适配器通过经过身份验证的 Codex 应用程序服务器文件系统 API 写入凭证。挂钩命令仅包含该文件的路径。回调接受当前的中继令牌和确切的生成，然后应用与本地桥相同的事件策略和实时所有者检查。它不授予网关操作员访问权限。无效的显式远程配置或传送失败停止轮转；回调永远不会回退到操作员 RPC 或本地 SQLite。

凭证路径对于中继生成保持稳定，因此温暖线程和隐身线程可以重用其挂钩命令。每次注册都会写入一个新的token；有序写入和所有者检查清理可防止旧任务删除其替换的凭据。保留的本地子级可以使用该凭证，直到其现有的中继生命周期结束；处置会删除该文件。即使无法删除远程文件，替换和网关重新启动也会使旧令牌失效。该目录不是针对以同一 OS 用户身份运行的受损 Harness 代码的安全边界：仍需要回调的受限权限。 TLS 验证保持启用状态，并且重定向被拒绝。

当启用 Codex 应用程序服务器批准（`approvalPolicy` 不是 `"never"`）时，默认注入的本机钩子配置会忽略 `PermissionRequest`，因此 Codex 的应用程序服务器审核者和 OpenClaw 的批准桥在审核后处理真正的升级。将 `permission_request` 添加到 `nativeHookRelay.events` 以强制兼容继电器。其他Codex挂钩如`SessionStart`和`UserPromptSubmit`仍保持Codex-级别控制；它们在 v1 合约中没有作为 OpenClaw 插件挂钩公开。

对于 OpenClaw 动态工具，OpenClaw 在 Codex 请求调用后执行该工具，因此插件和中间件行为在harness适配器中运行。 Codex 代码模式接收文本形式的通用动态结果并序列化嵌套动态调用；调用者必须解析 JSON-looking 结果，并且不能依赖 `Promise.all` 进行并发提交。对于Codex-native工具，Codex拥有本机工具记录； OpenClaw 可以镜像选定的事件，但无法重写本机线程，除非 Codex 通过应用程序服务器或本机钩子回调公开该线程。

Codex app-server 的 report 模式 `PreToolUse` 事件会将插件审批延后到对应的 app-server 审批。如果 OpenClaw 的 `before_tool_call` 钩子返回 `requireApproval`，而原生载荷设置了 `openclaw_approval_mode: "report"`，那么原生钩子中继会记录插件审批需求，并且不返回任何原生决策。 当 Codex 之后针对同一次工具使用发送 app-server 审批请求时，OpenClaw 会打开插件审批提示，并将决策映射回 Codex。Codex 的 `PermissionRequest` 事件是一个独立的审批路径，在为该桥配置时，仍然可以通过 OpenClaw 审批进行路由。

Codex 应用程序服务器项通知还为本机 `PostToolUse` 中继尚未涵盖的本机工具完成情况提供异步 `after_tool_call` 观察。仅 telemetry/compatibility；它们无法阻止、延迟或改变本机工具调用。

压缩和 LLM 生命周期投影来自 Codex app-server 通知和 OpenClaw 适配器状态，而不是原生 Codex 钩子命令。 `before_compaction`、`after_compaction`、`llm_input` 和 `llm_output` 是适配器级别的观察，不是对 Codex 内部请求或压缩载荷的逐字节捕获。

Codex 原生的 `hook/started` 和 `hook/completed` app-server 通知会被投影为 `codex_app_server.hook` 代理事件，用于轨迹记录和调试。它们不会调用 OpenClaw 插件钩子。
