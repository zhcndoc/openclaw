---
summary: "受限云工作器运行时的内部操作员参考"
read_when:
  - 操作或调试网关启动的云工作器
  - 验证工作器准入、会话分配或本地工具隔离
title: "Worker"
---

# `openclaw worker`

`openclaw worker` 是云工作器编排器在已准备好的工作器环境中启动时使用的受限运行时入口点。它不是用于手动工作器注册的通用命令。

网关会安装匹配的 OpenClaw bundle，并打开主机密钥固定的反向 SSH 隧道。工作器启动器会使用预先准备好的分配来启动此命令。该命令通过隧道转发的本地 socket 建立连接，并以专用的 `worker` 角色接入。

## 启动合约

该命令会从标准输入中准确读取一个有界 JSON 启动封套。
该封套携带本地套接字位置、已铸造的 worker 凭证、bundle
和协议标识、所有者 epoch，以及唯一分配的会话和轮次。
该凭证绝不会通过命令行参数接收，并且此页面
有意不提供任何凭证或手工编写的封套示例。

如果封套无效、凭证被拒绝、
bundle 或协议特性不匹配，或者会话和所有者 epoch
已不再是当前值，则准入将以关闭方式失败。操作员应通过云 worker
协调器启动 worker，而不是直接调用此入口点。

## 运行边界

该进程运行标准的嵌入式 agent 循环，但后端受限：

- `read`、`write`、`edit`、`apply_patch`、`exec` 和 `process` 编码工具
  在 worker 工作区内本地运行。
- 模型调用使用网关推理代理。不加载本地模型认证配置文件。
- Transcript 写入使用网关 transcript-commit RPC。
- 流式传输和工具生命周期更新使用网关 live-event RPC。
- 仅接受分配的 session 和 turn。

Worker 模式不会启动 channels、Gateway HTTP 表面或插件自动启动，
超出已分配 session 工具集的部分也不会启动。它使用一次性状态目录，并且没有
常驻的 provider 或 forge 凭据。

worker-to-worker session dispatch 在此模式下不暴露。放置和 dispatch 仍由网关负责：
操作员可以通过 Gateway dispatch 一个现有的本地、managed-worktree session，而 worker 进程不能
自行 dispatch 自己或另一个 worker。

准备好的 assignment 携带 transcript 上下文、已接受的 base leaf、
commit sequence 和 live-event cursor。重新通过隧道连接时，进程会使用
相同的凭据和 owner epoch 重新接入，保留已接受的 transcript base，
重放其未确认的 live-event 尾部，并重新附加一个进行中的 inference turn，
且身份保持不变。如果流式增量丢失，则以终端 inference 消息为准。
更高优先级的 owner epoch 会对该进程进行隔离，并导致干净退出。

`stale-base-leaf` transcript 拒绝会使当前运行直接失败。Worker 模式不会
针对不同的 leaf 重试被拒绝的序列，因此不会产生重复提交；该运行中任何尚未提交到内存中的尾部都会丢失。
重新启动属于 milestone-3 placement owner 的职责，该 owner 必须
根据网关权威的 transcript 和 commit ledger 创建新的 assignment。
同样，网关进程重启会以 provider error 终止一个挂起的 inference turn；只有 tunnel 或 worker WebSocket
重新连接才能重新附加到一个活动的同进程 inference 流。

有关封闭 worker RPC 接口，请参见 [Gateway protocol](/gateway/protocol#worker-role-and-closed-protocol)；
有关架构和安全模型，请参见 [Cloud workers plan](/plan/cloud-workers)。
