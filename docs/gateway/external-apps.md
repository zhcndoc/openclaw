---
summary: "外部应用、脚本、仪表板、CI 作业和 IDE 扩展的当前集成路径"
title: "面向外部应用的 Gateway 集成"
sidebarTitle: "外部应用"
read_when:
  - You are building an external app, script, dashboard, CI job, or IDE extension that talks to OpenClaw
  - You are choosing between Gateway RPC and the Plugin SDK
  - You are integrating with Gateway agent runs, sessions, events, approvals, models, or tools
  - You are pairing a hosting controller with an external wake scheduler
---

外部应用通过 Gateway 协议与 OpenClaw 通信：WebSocket
传输加上 RPC 方法。当脚本、仪表板、CI 作业、IDE
扩展或其他进程需要启动 agent 运行、流式接收事件、等待
结果、取消工作或检查 Gateway 资源时，请使用它。

<Note>
  For npm packages, device pairing, reconnect recovery, history, subscriptions,
  and approvals, start with
  [Building a Gateway client](https://docs.openclaw.ai/gateway/clients). If your
  app supervises the Gateway as a child process, also read
  [Embedding OpenClaw](https://docs.openclaw.ai/gateway/embedding). During the
  initial package rollout, npm may return `E404` until the first package-bearing
  OpenClaw release is published.
</Note>

<Note>
  本页适用于运行在 OpenClaw 进程之外的代码。运行在 OpenClaw 内部的插件代码应改用文档化的 `openclaw/plugin-sdk/*` 子路径。
</Note>

## 当前可用内容

| Surface                                                          | Status        | Use it for                                                                                    |
| ---------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------- |
| [Gateway client guide](https://docs.openclaw.ai/gateway/clients) | Release train | npm packages, auth, reconnect, history, events, approvals, and version policy.                |
| [Embedding guide](https://docs.openclaw.ai/gateway/embedding)    | Release train | Child-process environment, readiness, lifecycle, recovery, RPC ownership, and packaging.      |
| [Gateway protocol](/gateway/protocol)                            | Ready         | WebSocket transport, connect handshake, auth scopes, protocol versioning, and events.         |
| [Gateway RPC reference](/reference/rpc)                          | Ready         | Current Gateway methods for agents, sessions, tasks, models, tools, artifacts, and approvals. |
| [`openclaw agent`](/cli/agent)                                   | Ready         | One-shot script integration when shelling out to the CLI is enough.                           |
| [`openclaw message`](/cli/message)                               | Ready         | Sending messages or channel actions from scripts.                                             |

## 推荐路径

1. 运行或发现一个 Gateway。
2. 通过 [Gateway protocol](/gateway/protocol) 连接。
3. 调用 [Gateway RPC reference](/reference/rpc) 中记录的 RPC 方法。
4. 固定你所测试的 OpenClaw 版本。
5. 升级 OpenClaw 时重新检查 RPC 参考文档。

对于代理运行，请从 `agent` RPC 开始，并将其与 `agent.wait` 配对，以获取最终结果。对于持久会话状态，请使用 `sessions.*` 方法。对于 UI 集成，请订阅 Gateway 事件，并且只渲染你的应用能够理解的事件族。

## 协作式主机挂起

冻结或快照正在运行进程的宿主控制器可以使用
无主机偏向的挂起握手：

1. 停止接收由宿主控制的外部入口流量。
2. 使用稳定且唯一的 `requestId` 调用 `gateway.suspend.prepare`。
3. 如果响应是 `busy`，则保持进程运行，并稍后重试。
4. 如果是 `ready`，保存返回的 `suspensionId`，然后在 `expiresAtMs` 之前冻结或快照
   该进程。
5. 恢复后，或者如果放弃挂起，则通过现有的 WebSocket 或 Admin HTTP 控制
   路径调用 `gateway.suspend.resume`，并传入该 `suspensionId`。

已准备好的 Gateway 会拒绝新的 WebSocket 握手。WebSocket 控制器
在宿主操作期间必须保持其已认证连接处于打开状态。如果无法保证这一点，
请在准备之前启用并使用
[Admin HTTP RPC 插件](/plugins/admin-http-rpc)。如果
控制路径丢失，请等待两分钟租约过期后再重新连接；过期会自动重新开放接入。

RPC 合约如下：

- `gateway.suspend.prepare` — `operator.admin`; 参数
  `{ "requestId": "stable-host-operation-id" }`
- `gateway.suspend.status` — `operator.read`; 参数
  `{ "suspensionId": "id-from-prepare" }`
- `gateway.suspend.resume` — `operator.admin`; 参数
  `{ "suspensionId": "id-from-prepare" }`

ID 会被去除首尾空白，必须包含至少一个非空白字符，且长度上限为
128 个字符。busy 的 prepare 结果包含 `status: "busy"`、`reason`、
`retryAfterMs`、`activeCount` 和 `blockers`。ready 结果的格式如下：

```json
{
  "status": "ready",
  "suspensionId": "2c3f...",
  "expiresAtMs": 1770000000000,
  "activeCount": 0,
  "blockers": []
}
```

Status 返回 `{"status":"running"}` 或带有 `expiresAtMs` 的 ready 结果。Resume 返回 `{"ok":true,"status":"running","resumed":true}`；在成功恢复后重复调用则返回
`resumed: false`。

竞争的请求 ID 或瞬态的 scheduler-resume 失败会返回可重试的
`UNAVAILABLE`，并带有 `retryAfterMs`。在调度器恢复期间，prepare、status
和 resume 都会返回该错误，Gateway 保持未就绪且
fail-closed，宿主不得冻结或快照它。OpenClaw 会自动重试调度器，
并且仅在恢复成功后重新开放接入。与已有 resume ID 不匹配会返回 `INVALID_REQUEST`。Prepare 共享 Gateway
控制平面的写入预算：每分钟三次尝试；请遵守返回的
重试延迟。WebSocket 客户端按设备和 IP 分桶。Admin HTTP
控制器按解析后的客户端 IP 分桶，因此位于同一代理之后的控制器可以共享预算。

准备阶段只拒绝接入：OpenClaw 会关闭新的 root/session/command 接入，
暂停自动 cron tick，并同步检查工作状态。如果有任何工作处于活动中，它会
在返回 `busy` 之前恢复调度器并重新开放接入；它不会中断或清空那些工作。
ready 租约持续两分钟。使用相同的 `requestId` 重复调用 `prepare` 会续租；过期时会在重新开放接入之前恢复调度器。
在 ready 租约期间到期的重启发射会等待直到租约恢复；进行中的重启会使准备返回 `busy`。

在 ready 状态下，`/healthz` 仍然可用，而 `/readyz` 返回 `503`。本地或经过身份验证的 readiness 响应包含 `gateway-draining`；未认证的远程探测只会收到 `{ "ready": false }`。HTTP 健康探测、现有 WebSocket 连接上的挂起方法，以及已启用的 Admin HTTP RPC 路由仍然可用。其他 RPC 返回可重试的 `UNAVAILABLE`。内置的 HTTP 用户工作路由和普通插件 HTTP 路由，包括 OpenAI 兼容 API、工具/会话操作、节点监视以及已配置的 hooks，都会返回带有 `error.code: "gateway_unavailable"` 的 `503`。新的、由插件拥有的 WebSocket 升级也会返回 `503`；这涵盖的是升级所有权，而不是后续在已建立的插件 socket 上执行的工作。

这个握手不会持久化传入消息、停止第三方通道传输，也不会控制宿主平台。宿主必须在准备之前为其入口流量设置边界，并且仍然负责唤醒、快照/冻结和停止。`activeCount` 是跟踪中的工作总数，而 `blockers`
包含非零的类别计数和受限的任务详情。这不是一个通用的进程静止屏障。`background-exec` 阻塞项只是聚合级别：命令文本、进程 ID、输出，以及会话或作用域标识符都不会跨越协议。通道健康、维护、缓存刷新、已建立的插件 WebSocket 会话，以及未注册的插件拥有的后台工作都可以保持活动。
宿主平台必须以一致的方式冻结或快照整个进程树及其文件系统；对于未注册工作，仅凭此第一个合约无法证明其处于空闲状态。

<Tip>
  对于宿主唤醒调度，请将面向 OpenClaw 的部分保留在进程内
  插件中，并将幂等的完整快照投射到外部宿主适配器。
  宿主控制器不应导入 Plugin SDK，也不应从事件增量重建 cron 状态。
  参见 [安全的外部 cron 投射](/plugins/hooks#safe-external-cron-projection)。
</Tip>

## App code vs plugin code

当代码运行在 OpenClaw 之外时，请使用 Gateway RPC：

- 启动或观察 agent 运行的 Node 脚本
- 调用 Gateway 的 CI 作业
- 仪表板和管理面板
- IDE 扩展
- 不需要成为通道插件的外部桥接
- 使用假或真实 Gateway 传输的集成测试

当代码运行在 OpenClaw 内部时，请使用 Plugin SDK：

- provider 插件
- channel 插件
- 工具或生命周期钩子
- agent harness 插件
- 受信任的运行时辅助工具

外部应用不应导入 `openclaw/plugin-sdk/*`；这些子路径是供 OpenClaw 加载的插件使用的。

## 相关内容

- [Building a Gateway client](https://docs.openclaw.ai/gateway/clients)
- [Embedding OpenClaw](https://docs.openclaw.ai/gateway/embedding)
- [Gateway protocol](/gateway/protocol)
- [Gateway RPC reference](/reference/rpc)
- [CLI agent command](/cli/agent)
- [CLI message command](/cli/message)
- [Agent loop](/concepts/agent-loop)
- [Agent runtimes](/concepts/agent-runtimes)
- [Sessions](/concepts/session)
- [Background tasks](/automation/tasks)
- [ACP agents](/tools/acp-agents)
- [Plugin SDK overview](/plugins/sdk-overview)
