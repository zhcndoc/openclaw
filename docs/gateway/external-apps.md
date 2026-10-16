---
summary: "外部应用、脚本、仪表板、CI 作业和 IDE 扩展的当前集成路径"
title: "面向外部应用的 Gateway 集成"
sidebarTitle: "外部应用"
doc-schema-version: 1
read_when:
  - "你正在构建与 OpenClaw 通信的外部应用、脚本、仪表板、CI 作业或 IDE 扩展"
  - "你正在 Gateway RPC 和 Plugin SDK 之间进行选择"
  - "你正在与 Gateway 的 agent 运行、会话、事件、审批、模型或工具集成"
  - "你正在将托管控制器与外部唤醒调度器配对"
---

外部应用通过 Gateway 协议与 OpenClaw 通信：WebSocket 传输加上 RPC 方法。当脚本、仪表板、CI 作业、IDE 扩展或其他进程需要启动 agent 运行、流式接收事件、等待结果、取消工作或检查 Gateway 资源时，请使用它。

<Note>
  对于 npm 包、设备配对、重新连接恢复、历史记录、订阅和批准，请从 [ 构建网关客户端 ](/gateway/clients#install-the-packages) 开始。安装指南固定了经过验证的稳定 `2026.8.1` 软件包，并解释了软件包和线路版本如何影响兼容性。如果您的应用程序将网关作为子进程进行监管，另请阅读 [Embedding OpenClaw](/gateway/embedding)。
</Note>

<Note>
  本页适用于运行在 OpenClaw 进程之外的代码。运行在 OpenClaw 内部的插件代码应改用文档化的 `openclaw/plugin-sdk/*` 子路径。
</Note>

## <a id="what-is-available-today"></a> 当前可用内容

| 表面                                                       | 状态          | 用途                                                                                    |
| ------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------- |
| [网关客户端指南](/gateway/clients#install-the-packages) | 稳定的包 | npm 包、身份验证、重连、历史记录、事件、审批和版本策略。                |
| [嵌入导轨](/gateway/embedding)                         | 发布序列   | 子进程环境、就绪状态、生命周期、恢复、RPC 所有权和打包。      |
| [Gateway 协议](/gateway/protocol)                         | 就绪           | WebSocket 传输、连接握手、身份验证范围、协议版本控制和事件。         |
| [网关协议 RPC 方法](/gateway/protocol/rpc-methods) | 就绪           | 用于代理、会话、任务、模型、工具、工件和审批的当前 Gateway 方法。 |
| [`openclaw agent`](/cli/agent)                                | 就绪           | 当通过 shell 调用 CLI 已足够时，用于一次性脚本集成。                           |
| [`openclaw message`](/cli/message)                            | 就绪           | 从脚本发送消息或执行频道操作。                                             |

## <a id="recommended-path"></a> 推荐路径

1. 运行或发现一个 Gateway。
2. 通过 [Gateway 协议](/gateway/protocol) 连接。
3. 从[网关协议RPC方法](/gateway/protocol/rpc-methods)调用记录的RPC方法。
4. 固定你所测试的 OpenClaw 版本。
5. 升级 OpenClaw 时重新检查 RPC 参考。

对于代理运行，请从 `agent` RPC 开始，并将其与 `agent.wait` 配对，以获取最终结果。对于持久会话状态，请使用 `sessions.*` 方法。对于 UI 集成，请订阅 Gateway 事件，并且只渲染你的应用能够理解的事件族。

当回合排队时，`agent.wait` 可以返回 `status: "pending"`。没有终端元数据的超时响应意味着等待已过期；继续等待或消耗生命周期事件。终端 `status: "error"` 可以表示取消：`stopReason: "superseded"` 表示较新的会话编写器替换了运行。在展示结果时保留这个理由。

## <a id="cooperative-host-suspension"></a> 协作式主机挂起

冻结或快照正在运行进程的宿主控制器可以使用无主机偏向的挂起握手：

1. 停止接收由宿主控制的外部入口流量。
2. 用稳定、独特的`requestId`呼叫`gateway.suspend.prepare`。
3. 如果响应是 `busy`，请保持进程运行并稍后重试。要在已接纳的工作完成时保持接纳关闭，请请求可选的排出模式并轮询 `gateway.suspend.status`。
4. 如果响应是`ready`，则保存返回的`suspensionId`，然后冻结或快照`expiresAtMs`之前的进程。
5. 解冻后，或者如果放弃暂停，则通过现有或新认证的 WebSocket 使用该 `suspensionId` 调用 `gateway.suspend.resume`。 CLI 等效项是 `openclaw gateway suspend` 和 `openclaw gateway resume <suspensionId>`。

耗尽或准备好的网关接受经过身份验证的操作员 WebSocket 连接，允许控制器重新连接并检查、续订或释放其自己的租约。新节点和工作连接仍处于隔离状态。准备好的网关会隔离除 `gateway.suspend.*` 之外的所有方法和一个精确的前驱绑定重新启动。该异常需要一个非安全的 `gateway.restart.request`，其 `target` 与实时网关锁匹配；安全且无针对性的重启请求仍然受到限制。当网关仍在耗尽时，重新启动 RPC 异常不可用。控制器可能会在解冻后重新连接并调用恢复。 [Admin HTTP RPC 插件 ](/plugins/admin-http-rpc) 对于根本无法使用 WebSocket 的主机仍然可用。如果每条控制路径都丢失，两分钟租约到期后会自动重新开放准入。

关闭网关会取消操作员重新连接排队的后台工作，而无需等待暂停到期。关闭仍然等待已在运行的工作完成。

生命周期操作员请求优先于不相关的排队工作。它们的身份验证、实时权限检查和相同连接突变顺序仍然适用。 Hello 不会等待会话成员身份刷新：人们仍然可见，而待观看的会话引用将被忽略，直到后续状态发布为止。

hello 快照包括 `suspension: { phase }`，`gateway.suspension` 事件立即发布准入更改。相位为`accepting`、`preparing`、`draining`或`prepared`；两个表面均不暴露悬架 ID。 Control UI 的左下角连接指示器在准备或排水过程中显示 **Suspending…**，在准备过程中显示 **Suspished**，包括在“设置”中。它会在暂停准入重新开放时清除，而不是在请求成功时清除。离线和重启指示器优先。调度程序恢复会保留暂停指示器，直到准入真正重新开放；没有单独的恢复阶段。

RPC 合约如下：

- `gateway.suspend.prepare` — `operator.admin`；参数 `{ "requestId": "stable-host-operation-id", "terminalPolicy": "preserve", "drain": true }`
- `gateway.suspend.status` — `operator.read`；参数 `{ "suspensionId": "id-from-prepare", "includeLifecycle": true }`
- `gateway.suspend.resume` — `operator.admin`；参数 `{ "suspensionId": "id-from-prepare" }`
- `gateway.suspend.handoff` — `operator.admin`；参数 `{ "suspensionId": "id-from-prepare", "target": { "pid": 123, "processInstanceId": "id-from-system-info" } }`

`terminalPolicy` 和 `drain` 是可选的。 `terminalPolicy` 仅接受 `"preserve"` 或 `"terminate"`，默认为 `"preserve"`； `drain` 默认为 `false`。终端策略适用于立即准备和排出模式：

- `"preserve"`：打开终端会话阻止暂停。将此用于必须保留正在运行的进程的主机 freeze/snapshot 操作。
- `"terminate"`：打开进程本地终端会话不会阻止挂起。使用它来发布将重新启动网关的更新。准备工作不关闭终端；实际的网关重新启动会结束其 PTY 和命令。

待定的最终聊天状态写入 （`terminal-persistence`） 和所有其他跟踪的工作仍然会阻止任一策略下的准备工作。

ID 经过修剪，必须包含非空白字符，并且限制为 128 个字符。繁忙准备结果有 `status: "busy"`、`reason`、`retryAfterMs`、`activeCount` 和 `blockers`。准备好的结果具有以下形状：

```json
{
  "status": "ready",
  "suspensionId": "2c3f...",
  "expiresAtMs": 1770000000000,
  "activeCount": 0,
  "blockers": []
}
```

如果 `drain: true` 发现活动工作，准备工作将获取可更新租约，暂停新的自动 cron 调度，关闭对不相关新工作的准入，并返回：

```json
{
  "status": "draining",
  "suspensionId": "2c3f...",
  "expiresAtMs": 1770000000000,
  "retryAfterMs": 5000,
  "activeCount": 2,
  "blockers": [
    { "kind": "root-request", "count": 1, "message": "1 active request" },
    { "kind": "terminal-session", "count": 1, "message": "1 open terminal session" }
  ]
}
```

已经承认的工作及其拥有的完成品自然会继续；不相关的新运行、会话、计划作业和独立工作将被拒绝。使用 `terminalPolicy: "preserve"`，开放终端可以保持租约耗尽，直到其关闭、控制器恢复网关或租约到期。对于 `terminalPolicy: "terminate"`，同一终端保持打开状态，但不会阻止就绪状态。在准备、轮询、续订、恢复或租约到期期间，任何策略都不会终止或分离终端。

对 `gateway.suspend.status` 进行民意调查，返回 `suspensionId`，纪念 `retryAfterMs`。保留的排水建议进行五秒轮询，这样已完成的工作就不会留下新工作等待更长的繁忙准备重试。当阻止程序仍然存在时，状态将与 `expiresAtMs`、`retryAfterMs`、`activeCount` 和 `blockers` 一起返回 `status: "draining"`。每个状态调用都会立即返回一个新的活动工作快照，包括待处理的受保护生命周期或最终聊天写入。轮询从不等待这些写入、取消工作、释放托管或续订租约。移交所有者在授权停止之前再次检查写入保管权。每个阻塞程序完成后，相同的租约将转换为 `{"status":"ready","expiresAtMs":...}`。默认情况下，状态会为已发布的验证器保留原始响应形状。选择使用 `includeLifecycle: true` 加入生命周期元数据以接收 `ownerId`（原始 `requestId`）；排空状态还包括 `phase: "draining"`。请求此元数据时使用更新的响应验证器。当没有暂停时状态返回`{"status":"running"}`；查询不同的活动租约会返回冲突，但不会暴露其标识符。恢复返回`{"ok":true,"status":"running","resumed":true}`；成功恢复后重复此操作将返回 `resumed: false`。

专用 `openclaw gateway suspend` 命令保留其现有的仅拒绝行为。控制器可以通过任何网关客户端或通用 CLI RPC 命令请求排出模式：

```bash
openclaw gateway call gateway.suspend.prepare \
  --params '{"requestId":"host-operation-1","terminalPolicy":"preserve","drain":true}' \
  --json
openclaw gateway call gateway.suspend.status \
  --params '{"suspensionId":"<suspension-id>"}' \
  --json
openclaw gateway resume '<suspension-id>'
```

对于发布更新，请使用与 `terminalPolicy: "terminate"` 相同的握手，因此开放终端无法无限期地保持漏极：

```bash
openclaw gateway call gateway.suspend.prepare \
  --params '{"requestId":"release-update-1","terminalPolicy":"terminate","drain":true}' \
  --json
```

等待租约变为 `ready`，然后再执行检查的重新启动。重启后终端命令和回滚不恢复；参见[重新启动恢复](/gateway/restart-recovery#what-is-not-resumed)。

明确授权中断剩余工作的外部部署控制器可以在其自己的优雅耗尽预算后调用 `gateway.suspend.handoff`。目标必须与暂停前从 `system.info` 获取的 `pid` 和 `processInstanceId` 匹配。此臂会重新启动该确切租约的清理工作并主机迭代的下一个 `SIGTERM`；它不会发出信号或创建继任者。控制器仍然拥有本机服务重启。成功的响应是 `{ "status": "armed", "suspensionId": "...", "expiresAtMs": ... }`。

手臂随着租约到期。重复准备或移交不会扩大武装权力。恢复、替换、其他接受的生命周期操作或主机停用都会使其失效。挂起的最终聊天持久性拒绝装备，并在 `SIGTERM` 消耗装备时再次检查。如果该检查拒绝，网关会记录拒绝并保留普通的优雅停止行为。接受的切换使用现有的重新启动恢复和中止清理，然后退出外部控制器。没有手臂的普通停止器一直在等待主动工作。控制者必须推迟不支持的方法或拒绝切换；仅凭一份耗尽的租约绝不会授权中断。

一旦关闭提交，包括在暂停期间安装替换的重新启动，同一所有者仍然可以轮询 `status: "draining"`。对于 `includeLifecycle: true`，它还接收 `phase: "interrupting"`。在经过身份验证的操作员重新连接期间，所有权和外来令牌冲突保持稳定；节点和工作连接仍处于隔离状态。旧租约到期后，关闭记录仍然可用；这是关闭进程，而不是可更新租约或冻结进程的许可。提交关闭后，恢复被拒绝。服务器拆卸前所有者记录`phase: "exiting"`； RPC 当拆卸关闭请求准入和传输时访问结束。这些事实保留在内存中，直到进程退出或下一个进程内生命周期重置它们。

正在运行的网关服务于该合约；进行较新的安装不会改变老居民的反应。仅当支持生命周期元数据的网关版本运行时才请求生命周期元数据。司机仍然必须验证其确切的前任并通过其生命周期所有者处理运输关闭。

竞争请求 ID 或瞬时调度程序恢复失败返回可重试的 `UNAVAILABLE` 和 `retryAfterMs`。在调度程序恢复期间，准备、状态和恢复都会返回该错误，网关保持未就绪状态并拒绝新工作，并且主机不得冻结或对其进行快照。 OpenClaw 自动重试调度程序，并仅在恢复成功后重新开放准入。不匹配的简历 ID 返回 `INVALID_REQUEST`。准备受网关控制平面写入限制（每分钟 30 次尝试）的限制；尊重返回的重试延迟。 WebSocket 客户端按设备和 IP 进行存储。管理员 HTTP 控制器由解析的客户端 IP 存储，因此一个代理后面的控制器可以共享预算。

如果没有 `drain: true`，准备工作仍然是拒绝的：OpenClaw 关闭新的 root/session/command 准入，暂停自动 cron 滴答，并同步检查工作。如果有任何活动，它会恢复调度程序并重新开放准入，然后返回 `busy`；它不会中断或耗尽工作。使用 `drain: true`，同一个暂停所有者会保持准入关闭并暂停 cron 调度，直到现有工作解决。已经拥有的 cron 完成和协调继续进行。

耗尽和现成的租赁在工作检查之前共享两分钟的预算。耗尽预算的准备工作会恢复计划并失败，而不是返回过期的租约。时钟回滚不会延长预算。使用相同的 `requestId`、终端策略和耗尽模式在 `expiresAtMs` 之前重复 `prepare`，以更新相同的 `suspensionId`，除非启用了重新启动切换；更改任何这些值都会与现有租约发生冲突。使用 `status` 进行例行轮询，并保留 `prepare` 进行续订，以避免消耗写入预算。在重新开放准入之前显式恢复和租约到期恢复调度。租约保留在内存中，并在网关进程退出时消失。在就绪租约期间到期的重新启动发射会等待租约恢复；飞行中重启使准备返回 `busy`。

在排空或准备就绪时，`/healthz` 保持活动状态，并且 `/readyz` 返回 `503`。本地或经过身份验证的就绪响应包括 `gateway-draining`；未经身份验证的远程检查仅收到 `{ "ready": false }`。 HTTP 运行状况检查、经过身份验证的操作员 WebSocket 连接的暂停方法以及已启用的管理 HTTP RPC 路由仍然可用。其他不相关的 RPC 返回可重试的 `UNAVAILABLE`。内置HTTP用户工作路由和普通插件HTTP路由，包括OpenAI-兼容的API、tool/session操作、节点监视和配置的钩子，返回`503`和`error.code: "gateway_unavailable"`。新插件拥有的WebSocket升级也返回`503`；这涵盖了升级所有权，而不是稍后通过已建立的插件套接字执行的工作。

此握手不会保留传入消息、停止第三方通道传输或控制托管平台。主机在准备之前必须隔离其入口，并负责唤醒、snapshot/freeze 和停止。 `activeCount` 是聚合跟踪工作计数，而 `blockers` 包含非零本机类别计数和有界摘要消息。类别包括 `background-exec`、`cron-run`、`agent-run`、`acp-run` 和 `media-generation`，以及请求、队列、回复、会话和终端工作。类别可以重叠，因此计数不是唯一工作的数量。这不是一般的过程静止屏障。阻止程序不包含命令文本、输出、操作系统进程 ID、会话或范围标识符。通道运行状况、维护、缓存刷新、已建立的插件 WebSocket 会话以及未注册的插件拥有的后台工作可以保持活动状态。托管平台必须一致地冻结或快照完整的进程树及其文件系统；第一份合同不能证明未注册的工作闲置。

<Tip>
  对于主机唤醒调度，请将 OpenClaw-faceing 部分保留在进程内插件中，并将完整快照发送到外部主机适配器。再次应用相同的快照一定不会产生额外的效果。托管控制器不应导入插件 SDK 或从事件增量重建 cron 状态。请参阅 [ 安全外部 cron 投影](/plugins/hooks/lifecycle#safe-external-cron-projection)。
</Tip>

## <a id="app-code-vs-plugin-code"></a> 应用代码与插件代码

当代码位于 OpenClaw 之外时，使用网关 RPC：

- 启动或观察 agent 运行的 Node 脚本
- 调用 Gateway 的 CI 作业
- 仪表板和管理面板
- IDE 扩展
- 不需要成为通道插件的外部桥接
- 使用假或真实 Gateway 传输的集成测试

当代码在 OpenClaw 内运行时，使用插件 SDK：

- provider 插件
- channel 插件
- 工具或生命周期钩子
- agent harness 插件
- 受信任的运行时辅助工具

外部应用不应导入 `openclaw/plugin-sdk/*`；这些子路径是供 OpenClaw 加载的插件使用的。

## <a id="related"></a> 相关内容

- [构建网关客户端](/gateway/clients)
- [嵌入 OpenClaw](/gateway/embedding)
- [网关协议](/gateway/protocol)
- [网关协议 RPC 方法](/gateway/protocol/rpc-methods)
- [CLI agent 命令](/cli/agent)
- [CLI message 命令](/cli/message)
- [代理回路](/concepts/agent-loop)
- [Agent 运行时](/concepts/agent-runtimes)
- [会话](/concepts/session)
- [ACP 代理](/tools/acp-agents)
- [插件 SDK 概览](/plugins/sdk-overview)
