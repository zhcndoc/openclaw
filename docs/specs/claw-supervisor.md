---
title: Claw Supervisor
summary: "由 OpenClaw 控制的 Codex app-server 会话舰队监督方案。"
read_when:
  - 设计 Codex 舰队监督
  - 构建读取、引导或生成 Codex 会话的 OpenClaw 工具
  - 在受监督的 Codex 中选择本地、Cloudflare 和 VPS 部署
---

# Claw Supervisor

## 目标

Claw Supervisor 让一个始终在线的 OpenClaw 实例在不改变正常 Codex 用户体验的前提下，监控并驱动一组 Codex 会话。用户可以 SSH 到主机上，启动 Codex，在 TUI 中工作，同时监督器仍然能够读取该会话、引导它、打断它、生成关联会话，并接受交接。Codex 会话也可以通过 MCP 回调到 OpenClaw。

## 产品模型

Codex 仍然是主要工作界面。OpenClaw 监督 Codex，而不是把 Codex 隐藏在一个不透明的 OpenClaw 子代理之中。

OpenClaw 插件名为 `codex-supervisor`。`crabfleet` 仍然是面向 CRAB 机器的部署和主机舰队配置文件，而不是可复用的插件名称。

该模型有三种角色：

- 人类附着的 Codex：通过共享 app-server 启动的普通交互式 Codex TUI。
- 自主 Codex：由监督器生成的 Codex app-server 线程，之后人类可以附着到它上面。
- Supervisor Claw：一个始终在线的 OpenClaw 代理，具备舰队状态、转录读取、引导、打断、生成和交接等工具。

OpenClaw 内部可以使用现有的子代理机制，但对外契约是一个可附着的 Codex 会话，带有 Codex 线程 id。

## 架构

```text
user SSH session
  -> codex --remote unix://... or ws://...
      -> local codex app-server daemon
          <-> host sidecar / supervisor connector
              <-> OpenClaw fleet supervisor
                  <-> supervisor MCP exposed back to Codex
```

每台支持 Codex 的主机都运行：

- Codex app-server 守护进程。
- 一个始终以 `--remote` 启动交互式 Codex 的启动器。
- 一个将 app-server 端点和活动线程注册到监督器的连接器。

监督器运行：

- 端点注册表。
- 会话注册表。
- Codex app-server JSON-RPC 客户端池。
- 供 Codex-to-Claw 调用的 MCP 服务器。
- 供 Claw-to-Codex 控制使用的 OpenClaw 工具。
- 用于自主操作、审批和循环防止的策略引擎。

## Codex App-Server 契约

将 Codex app-server API 作为规范控制平面：

- `initialize`, `initialized`
- `thread/loaded/list`
- `thread/list`
- `thread/read`
- `thread/resume`
- `thread/start`
- `turn/start`
- `turn/steer`
- `turn/interrupt`
- `model/list`

交互式 Codex 必须使用 `codex --remote <endpoint>` 启动，这样 TUI 和监督器就会连接到同一个 app-server。单独的 `codex exec` 目前不是一个共享实时会话；在 Codex 支持 `exec --remote` 之前，自主工作应使用 app-server API。

## 会话注册表

监督器为每个观察到的 Codex 线程存储一条记录：

```json
{
  "sessionId": "codex-thread-id",
  "endpointId": "host-a",
  "host": "host-a.example",
  "workspace": "/workspace/repo",
  "repo": "owner/repo",
  "branch": "feature/example",
  "source": "vscode",
  "status": "idle",
  "humanAttached": true,
  "lastSeenAt": "2026-05-28T10:00:00.000Z",
  "summary": "简短的工作状态摘要"
}
```

本地实现可以从 Codex 线程元数据中推导出大部分字段。舰队部署应使用主机标识、用户附着状态、git 状态和 sidecar 健康状态来丰富记录。

## 面向 Codex 的 MCP

每个受监督的 Codex 都获得一个名为 `openclaw-codex-supervisor` 的 MCP 服务器。

工具：

- `codex_sessions_list`：列出可见的 Codex 会话。
- `codex_session_read`：读取一条转录。
- `codex_session_send`：向空闲线程发送消息，或引导活动线程。
- `codex_session_interrupt`：中断当前 turn。
- `codex_endpoint_probe`：验证端点连通性。
- `claw_report_progress`：向监督器发布当前任务状态。
- `claw_ask`：向监督器请求帮助或委派。
- `codex_spawn`：创建一个新的自主 Codex 会话。
- `codex_handoff`：请求人类或同伴接管。

资源：

- `codex://sessions`
- `codex://sessions/{sessionId}`
- `codex://sessions/{sessionId}/transcript`

## Claw 控制面

始终在线的 Claw 具备与内部工具相同的原语：

- 列出会话和端点
- 读取转录
- 发送/引导文本
- 中断正在进行的工作
- 生成新会话
- 汇总并分配会话
- 向筛选后的组广播指令
- 将会话标记为阻塞、完成或放弃

工具行为：

- 如果目标线程空闲，`codex_session_send` 会映射到 `turn/start`。
- 如果目标线程活动中且可见一个进行中的 turn id，它会映射到 `turn/steer`。
- 如果无法识别活动 turn，则工具会失败关闭，而不是创建一个无关的 turn。
- 除非受信任的仅监督器策略启用，否则面向 Codex 的 MCP 写入控制保持禁用。
- 除非受信任的仅监督器策略启用，否则原始转录读取保持禁用。
- 自主审批默认拒绝工具/文件审批，除非明确策略另有说明。

## 启动流程

交互式主机登录：

1. 用户 SSH 到一台 CRAB 主机。
2. SSH 服务启动或验证 `codex app-server daemon start`。
3. 登录包装器启动 `codex --remote unix:// --cd <workspace>`。
4. 主机连接器注册端点和已加载线程。
5. 监督器发出高优先级舰队事件：新的 Codex 会话、workspace、人类附着状态、当前任务预览。
6. Supervisor Claw 可以立即读取并引导。

自主生成：

1. 监督器选择主机和 workspace。
2. 主机连接器打开或恢复一个 Codex app-server 线程。
3. 监督器以任务文本和 MCP 配置启动第一个 turn。
4. 会话注册表将其标记为自主且可附着。
5. 在 Codex 支持该精确 UX 之后，人类可以稍后使用 `codex --remote <endpoint> resume <threadId>` 附着，或者通过同一 app-server 上的当前 resume 流程附着。

## 部署

首选控制平面：

- 主机连接器保持到监督器的出站 WebSocket 连接。
- 监督器状态存放在 OpenClaw Gateway 存储中。
- Codex app-server 保持在每台主机本地；不要将原始、未经认证的 app-server 暴露到公共互联网。

Cloudflare 可行性：

- 适用于注册表、Durable Objects、WebSocket 汇聚、轻量事件路由以及公共 MCP/gateway 端点。
- 但仅靠它不足以直接控制私有主机，因为 Workers 不能拨号任意私有 Unix socket 或本地回环 app-server。
- 当每个主机连接器通过出站 WebSocket 主动回连时，使用 Cloudflare。

VPS 备用方案：

- 当需要长生命周期进程控制、SSH 隧道、私有网络路由或本地文件系统访问时，使用 Hetzner 服务。
- 保持相同协议：主机连接器出站，监督器注册表集中，Codex app-server 本地。

## 安全

- 默认绑定为本地 Unix socket。
- 远程 app-server 使用 token 或签名 bearer 认证。
- 主机连接器使用作用域化的主机 token 向监督器认证。
- 监督器工具强制按会话策略执行：读取、引导、中断、生成、审批。
- 跨代理消息包含 `originSessionId`；会丢弃自我回显。
- 广播需要显式过滤器和有界目标数量。
- 转录读取会在 OpenClaw 边界进行秘密信息脱敏。
- 除非策略允许，否则来自监督器发起 turn 的审批请求默认拒绝。

## 实施计划

阶段 1：本地监督器 MVP

- 为 stdio 代理和 WebSocket 端点添加 Codex app-server JSON-RPC 客户端。
- 添加监督器端点/会话注册表。
- 添加 MCP 工具：list、read、send、interrupt、probe。
- 为端点添加本地环境配置。
- 添加假的 app-server 测试和一个本地 app-server 直连 smoke 测试。

阶段 2：OpenClaw 集成

- 在 `codex-supervisor` 插件中注册监督器工具。
- 将监督器 MCP 注入 Codex 线程配置。
- 为代理上下文添加会话摘要。
- 在新 Codex 线程出现时添加事件通知。
- 为自主 send/interrupt/spawn 添加策略配置。

阶段 3：舰队连接器

- 主机 sidecar 注册 app-server 端点、主机元数据、git/workspace 元数据和人类附着状态。
- 为 Cloudflare 或 VPS 控制平面添加出站 WebSocket 连接器。
- 添加重连、心跳和陈旧会话清理。
- 添加 CRAB SSH 启动器包装器。

阶段 4：自主运行

- 添加 spawn/resume/takeover 流程。
- 添加广播和委派。
- 添加进度报告和任务状态摘要。
- 添加循环防止和速率限制。
- 添加仪表盘视图。

阶段 5：Multi-Claw

- 按组对会话分片。
- 为每个会话添加领导者/租约。
- 添加审计日志和回放。
- 在 Claw 组之间添加升级处理。

## 验收测试

- 人类通过共享 app-server 启动 Codex TUI。
- 监督器通过 `thread/loaded/list` 列出活动线程。
- 监督器通过 `thread/read` 读取转录。
- 监督器通过 `turn/start` 向空闲线程发送文本。
- 监督器通过 `turn/steer` 引导活动线程。
- 监督器通过 `turn/interrupt` 停止活动 turn。
- Codex 调用监督器 MCP 并列出同伴会话。
- 一个自主 Codex 被生成，之后又被人类附着。
- 丢失主机连接器时将会话标记为陈旧，而不会删除历史记录。

## 未决问题

- 对于没有 TUI 的 app-server 线程，Codex TUI 的确切附着 UX 是什么。
- Codex 是否应增加 `exec --remote` 以支持无头、共享实时运行。
- 持久状态归属：OpenClaw Gateway DB、Cloudflare Durable Object，还是 VPS 数据库。
- 监督器发起 turn 的审批策略粒度。
- 多少转录摘要应注入始终在线的 Claw 上下文，而不是保留为工具/资源。
