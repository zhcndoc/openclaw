---
summary: "/codex 命令界面、快速模式控制和本地线程检查"
read_when:
  - "您需要 /codex 命令界面"
  - "您正在将共享快速模式与 Codex 快速模式进行比较"
  - "您正在检查错误的 Codex 运行"
title: "Codex 命令和诊断"
sidebarTitle: "命令和诊断"
---

`/codex` 斜线命令界面及其周围的诊断路径。 [Codex harness](/plugins/codex-harness) 指南的一部分； [ 每个部分移动的位置](/plugins/codex-harness#where-each-section-moved) 列出每个部分。

## <a id="commands-and-diagnostics"></a> 命令与诊断

`codex` 插件会在任何支持 OpenClaw 文本命令的频道中，将 `/codex` 注册为斜杠命令。

本机执行、控制和主机范围检查需要所有者或 `operator.admin` 网关客户端。这包括绑定或恢复线程、发送或停止轮流、更改模型、快速模式或权限状态、压缩或审查、分离绑定以及检查帐户详细信息、主机状态、本机线程、配对节点会话、MCP 服务器或技能。其他授权发件人保留对其当前对话的绑定、模型、权限、快速模式和本机目标的帮助、模型列表和只读检查。主机范围的读取受到限制，因为它们可能会暴露其他对话、私有工作区、帐户身份和连接的服务。

常见形式：

- `/codex status` 检查应用服务器连接、模型、账户、速率限制、MCP 服务器和技能。
- `/codex models` 列出实时的 Codex 应用服务器模型。
- `/codex threads [filter]` 列出最近的 Codex 应用服务器线程。
- `/codex goal` 读取或更新已附加线程的原生 Codex 目标。Codex 的自动目标延续功能仍处于禁用状态；OpenClaw 尚未拥有自主后续轮次的能力。
- `/codex resume <thread-id>` 将当前 OpenClaw 会话附加到现有的 Codex 线程。
- `/codex bind [thread-id] [--cwd <path>] [--model <model>] [--provider <provider>]` 附加当前聊天。
- `/codex detach`（或 `/codex unbind`）解除当前绑定。
- `/codex binding` 描述当前绑定。
- `/codex stop` 停止活动轮次；`/codex steer <text>` 引导该轮次。
- `/codex model <model>`、`/codex fast [on|off|status]` 和 `/codex permissions [default|yolo|status]` 更改每个对话状态。权限参数 `default`（也称为 `guardian`、`guarded` 或 `approve`）选择 `guarded`；它不会清除会话权限模式。 `yolo` 选择完全访问并需要 `operator.admin`，即使对于所有者发件人也是如此。仅当未设置会话权限模式时，状态才会显示`default`。
- `/codex compact` 运行与 `/compact` 相同的完成和会话计费管道，然后报告 Codex 是否压缩会话以及生成的令牌计数。如果压缩被跳过或失败，回复将包含原因。
- `/codex review` 为已附加的线程启动 Codex 原生审查。
- `/codex diagnostics [note]` 在发送已附加线程的 Codex 反馈前请求确认。
- `/codex account` 显示所选连接的帐户和速率限制状态。本机 Codex 帐户与保存的 OpenClaw 配置文件保持独立，即使它们共享电子邮件地址也是如此。如果两次读取都失败，该命令会报告该连接的错误。
- `/codex mcp` 列出 Codex app-server MCP 服务器状态。
- `/codex skills` 列出 Codex app-server 技能。
- `/codex plugins list` 显示已配置的原生插件；`/codex plugins available` 在绑定的工作区中发现 Codex 市场插件。
- `/codex plugins install <plugin>@<marketplace>` 安装并授权一个已发现的插件。`/codex plugins enable <name>` 和 `/codex plugins disable <name>` 更新其持久化策略。修改需要所有者或 `operator.admin` 网关客户端。
- `/codex computer-use [status|install]` 管理 Codex Computer Use。
- `/codex help` 列出完整的命令树。

当 `/codex resume` 在没有现有已验证harness绑定的情况下附加线程时，它的下一回合会检查本机线程的存储工具目录并在继续之前应用当前harness配置。第一个附件需要本地 stdio 应用程序服务器及其每个代理 Codex 主目录。目标本机线程必须处于空闲状态。 OpenClaw 协调该线程的附加、恢复和释放；不相关的聊天和目录读取可以在同一应用程序服务器上继续。如果目标线程处于活动状态，请等待其完成并重试。使用 [Codex 监督 ](/plugins/codex-supervision) 或本机 Codex 来继续共享用户主目录或另一个应用程序服务器上的线程。

由父级控制的本机子线程不能附加 `/codex resume` 或 `/codex bind`。 OpenClaw 报告该限制并保留当前绑定。相反，通过其本机父级继续子级。

Codex 无法在恢复期间替换线程的动态工具目录。如果该目录与当前的harness工具不同，则无法读取其元数据，或者 Codex 无法确认其应用了配置，OpenClaw 会报告问题并保持所选本机线程不变。它不会默默地启动另一个线程。使用 `/new` 从当前harness工具开始，或继续本机 Codex 中保留的线程。

如果删除了普通的 OpenClaw- 托管本机线程，则下一回合将启动一个新的本机线程，同时保留选定的模型和提供程序。此恢复保留挂起的手动附件和本机模型拥有的线程。它不会重播原始结果不确定的回合。

对于 `/codex bind` 对话，应用程序服务器重新启动可以卸载绑定线程而不删除其历史记录。如果 Codex 在接受其输入之前拒绝下一轮，则 OpenClaw 将恢复同一线程并再次提交消息。它不会创建替换线程。已删除的历史记录、身份验证失败和不确定的回合结果仍然可见，而不是触发自动重播。如果恢复报告不可用历史记录，请重新绑定对话并重新发送消息。

### <a id="shared-fast-mode-and-codex-fast-mode"></a> 共享快速模式和 Codex 快速模式

`/fast` 控制共享 OpenClaw 策略。仅指令 `/fast off` 将 `off` 保留在 OpenClaw 会话中，并在受影响的 Codex harness上发送 `null`，以清除 OpenClaw- 拥有的服务层覆盖。 `/fast default` 仅清除该会话层，因此较低优先级的共享默认值仍可能解析为 `on`、`off`、`auto` 或 `ultrafast`。

`/codex fast` 相反会更改绑定的本机 Codex 对话首选项。 `/codex fast off` 存储 `flex` 以供以后对话绑定的本机轮流使用；它不是 `/fast off` 的同义词，并且不会更改共享 OpenClaw 会话策略。当共享快速模式运行控制到达 Codex harness转弯时，它将取代 `plugins.entries.codex.config.appServer.serviceTier` 以及适用于该转弯的任何绑定首选项：快速打开从 `priority` 开始，快速关闭发送 `null`，并自动决定每个模型调用。仅当未提供共享运行控制时，才使用配置或绑定的本机层。

超快需要从会话或运行控制或创作的 `fastModeDefault: "ultrafast"` 中进行有效的共享 `"ultrafast"` 选择，以及针对所选本机模型进行广告的经过身份验证的应用程序服务器目录。未设置的 `appServer.enableUltrafast` 或 `true` 允许该选择； `false` 改为发送普通 Fast （`priority`） 并跳过 Ultrafast 目录检查。快速、主动的自动和未指定的控件永远不会自动升级。本机 `serviceTier: "ultrafast"` 也从 `priority` 开始，直到共享选择请求它为止。标准和非活动自动保持关闭状态。有关目录检查和回退行为，请参阅 [app-server Transport](/plugins/codex-harness-reference/app-server-transport)。

`/codex fast status` 和 `/codex binding` 报告的是原生偏好状态，而不是处理完毕的提供商请求所使用的上游层级。

对于大多数支持报告，请从发生错误的对话中使用 `/diagnostics [note]` 开始。它会创建一份 Gateway 诊断报告；对于 Codex harness 会话，还会请求批准以发送相关的 Codex 反馈包。有关隐私模型和群聊行为，请参阅 [诊断导出](/gateway/diagnostics)。仅当你明确希望在不包含完整 Gateway 诊断包的情况下，为当前附加的线程上传 Codex 反馈时，才使用 `/codex diagnostics [note]`。

### <a id="inspect-codex-threads-locally"></a> 在本地检查 Codex 线程

检查一次失败的 Codex 运行，最快的方法通常是直接打开原生 Codex 线程：

```bash
codex resume <thread-id>
```

从完成的 `/diagnostics` 回复、`/codex binding` 或 `/codex threads [filter]` 中获取线程 id。

有关上传机制和运行时级诊断边界，请参见 [Codex harness 运行时](/plugins/codex-harness-runtime#codex-feedback-upload)。
