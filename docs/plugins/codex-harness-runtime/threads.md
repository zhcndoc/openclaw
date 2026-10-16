---
summary: "OpenClaw 如何绑定本机 Codex 线程、更改模型并继续受监督的会话"
read_when:
  - "您正在连接的 Codex 线程上切换模型"
  - "您正在分支或归档受监督的 Codex 会话"
title: "Codex 螺纹绑定和监督"
sidebarTitle: "线程和监督"
---

普通和受监督 Codex 会话的线程绑定规则，包括从现有本机线程安全延续。 [Codex harness运行时 ](/plugins/codex-harness-runtime) 指南的一部分； [ 每个部分移动的位置](/plugins/codex-harness-runtime#where-each-section-moved) 列出每个部分。

## <a id="thread-bindings-and-model-changes"></a> 线程绑定和模型更改

当 OpenClaw 会话附加到现有的 Codex 线程时，下一轮会将当前选定的模型、审批策略、沙箱、审批审查者和服务层重新发送到 app-server。从 `openai/gpt-5.5` 切换到 `openai/gpt-5.2` 会保留线程绑定，但会要求 Codex 使用新选择的模型继续。

受监督的绑定是例外。 OpenClaw 模型选择器保持锁定状态，并恢复忽略模型和提供程序覆盖，以便 Codex 恢复已保存线程的持久模型和提供程序。单独的本机 Codex 控件可以更改该持久对，并且初始快照可以生成 Codex 的正常模型差异警告；外部 OpenClaw 模型和后备链永远不会替代任何一个。

## <a id="supervision-and-safe-continuation"></a> 监管与安全续接

Codex 监管是同一个 `codex` 插件的一项可选能力。它通过单独的连接发现原生线程，并且只将未归档的会话投影到 Gateway 目录中。在没有明确的 `appServer` 连接设置时，该连接使用受管理的用户主目录 stdio，而普通的 harness 仍然是 agent 作用域。列表和元数据读取都是被动的：它们不会恢复线程、不会让 OpenClaw 订阅其实时事件，也不会处理其审批。

对于网关计算机上的存储或空闲会话，**Continue as Branch** 创建正常的模型锁定聊天，并通过源的最后一个终端持久轮流镜像有限的用户和助理历史记录。第一个正常的聊天轮次安装真正的批准处理程序，并使用临时的本机分叉来固定快照，而无需模型或提供程序覆盖。 Codex App Server 使用其当前的本机配置并返回所选对；如果该模型与源最后记录的模型不同，它会发出正常警告。 OpenClaw 在其 cwd 和运行时策略下启动主 `appServer`-source Codex harness线程之前确认分叉的订阅已发布，并准确返回初始启动的模型和提供程序。然后，它注入有界可见历史记录并在同一监督连接上提交绑定。该检查永远不会被保留或存档。源永远不会恢复。主螺纹具有完整的OpenClawharness工具表面；来自源的推理、工具调用和工具结果不会克隆到其中。私有连接范围在挂起和提交的绑定状态下仍然存在，因此以后的每个回合都保留在具有本机身份验证和提供程序配置的连接上。禁用的监督或 binding/connection 漂移会阻止执行，而不是切换到普通的代理家庭harness。

原始 CLI、VS Code、Atlas 或 ChatGPT 源仍然符合这两个目录的资格。主分支是本机 Codex 线程，但其源类型是 `appServer`；本机客户端可能会过滤该源类型，因此无法保证其在 Codex 桌面中的出现。

活动源无法启动新分支或存档；仍然可以打开现有的受监督聊天。 `notLoaded`表示活动未知，不空闲； OpenClaw 仅在明确的无其他运行程序确认和新的进程本地状态读取之后才允许对本地 `idle` 或 `notLoaded` 行进行存档。 Codex 在一个应用程序服务器进程内序列化线程突变，但不提供独占的跨进程运行程序或批准所有者租用，因此读取无法证明另一个进程未使用该线程。 OpenClaw 会阻止确切目标的已知活动绑定所有者或由 Codex 的分页后代查询返回的任何未存档的衍生后代。枚举错误、循环和安全限制耗尽会阻止操作。本机归档仍然可以在另一个进程中竞争新的轮次，因此确认涵盖了未知的客户端以及状态读取和归档之间的间隙。受监督的模型锁定聊天在保护本机绑定时无法删除。

配对节点目录公开有界的、分页的转录本。当连接的节点通告并允许目录列表、转录读取和 `codex.cli.session.resume` 命令并且操作员具有 `operator.admin` 时，符合条件的存储行或空闲行也可以创建或重新打开模型锁定聊天。随后的消息通过节点的 Codex CLI 恢复确切的本机线程并返回其最终文本；这不是网关本地分支流或流应用程序服务器harness桥。没有这些功能的节点在不继续的情况下保持可读，并且配对节点存档仍然不可用。请参阅 [ 配对节点限制 ](/plugins/codex-supervision#understand-paired-node-limits)。

有关操作员设置和可见的 Control UI 行为，请参阅 [Codex 监督 ](/plugins/codex-supervision)。
