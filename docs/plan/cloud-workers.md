---
summary: 在可通过 SSH 访问的临时机器上运行代理会话，支持通过网关代理的推理和实时侧边栏流式传输。
title: 云工作器方案
read_when:
  - 设计或实现云工作器的 provisioning、worker 模式或会话交接时
  - 更改 environments.*、worker 协议、转录摄取或推理代理 RPC 时
  - 审查远程代理执行的安全态势时
---

## 状态

提案，修订版 3。尚未实现。方向已于 2026-07 达成一致；修订版 2 纳入了对抗性审查发现（专用 worker 协议、placement/environment 状态机、支持 git 感知的入站同步、单向 v1 交接、受控出站安全措辞）。修订版 3 明确了同步所有权模型（worker 编写提交，gateway 采纳并发布），增加了不使用 git 的普通同步模式，修复了在 full-within-box 下的 worker 执行，将 internet 策略调整到 provision 时机，并将 agent dispatch 恢复到里程碑 3。

## 问题

OpenClaw 代理会话在一台机器上的网关进程内运行其循环、工具和推理。算力受限于那台机器，长任务会占用它，并行工作也会与之竞争。托管产品（Cursor 云代理、网页上的 Claude Code、Codex 云）通过为每个任务提供临时的云沙箱来解决这个问题，但它们需要供应商基础设施和对供应商的信任。

那些已经拥有闲置机器（或能低价租用机器）的人，没有办法这样说：把这个会话跑到那边去，像任何其他会话一样把它显示在我的侧边栏里，然后在之后把那台机器丢掉。

## 目标

- 在一个临时远程机器（“云工作节点”）上运行完整的 agent 会话（循环 + 工具），同时该会话在 Control UI 中的显示和流式更新与本地会话完全一致。
- 工作节点上不保留任何长期凭据（无 provider 认证、无 forge 令牌），且没有直接网络外联；该机器只需要一个可达的 sshd。
- 自动完成预配、同步、运行、收集、销毁——完全自动化，且可插拔 provider（首个 provider：Crabbox 风格的 lease CLI）。
- 在一个轮次边界，将正在运行的工作从网关分发到工作节点，且不丢失 transcript、会话身份，或者（当请求字节保持等价时）provider 缓存亲和性；并安全地将结果拉回。
- 人类（UI）和 agent（工具）都可以将工作分发到云工作节点。
- 支持持续数天的会话；生命周期由策略决定，而不是硬编码上限。

## 非目标（v1）

- Worker 上不使用外部编码执行器（Claude Code、Codex CLI）。Worker 会话仅运行 OpenClaw 的嵌入式运行器。执行器支持作为 v2 的可选项，因为执行器会使用它们自己的凭据自行进行推理。
- 不做 best-of-N / 并行尝试分流。
- 不依赖 VPN/tailnet。传输方式仅限 SSH。
- 不引入新的沙箱运行时。Worker 机器本身就是隔离边界；后续可以再叠加盒内 OS 沙箱。
- v1 不支持对称的实时迁移：调度为本地 → Worker；Worker → 本地 需要先停止会话并完成工作区协调。双向实时交接会在后续基于同一套 barrier 机制构建。
- Gateway 上不使用 JSON 侧状态；环境、放置、光标和授权状态都存放在 SQLite 中。

## 先前方案（我们借鉴什么，我们反转什么）

- Cursor 云端代理：代理循环在他们的云端运行；VM 是一个工具执行目标；追加式会话存储流式同步到所有客户端；安装后快照实现热启动；自托管 worker 是仅出站的工作进程。我们借鉴“会话事实来源保留在编排器上”和流式模型；我们反转循环放置位置（见下面的决策）。
- Codex 云端：两阶段运行时——先进行联网设置阶段，然后是离线代理阶段并移除密钥；容器状态缓存用于快速后续执行。我们借鉴阶段拆分作为我们的出站策略，以及缓存思路用于 v2 热镜像。
- Web 版 Claude Code：每个会话一个 VM；用于隔离凭据的 git 代理（真实令牌永远不会进入沙箱；推送仅限会话分支）；设置后进行文件系统快照；teleport 交接 = 已推送分支 + 重放后的历史记录。我们借鉴凭据隔离和交接的表述，但出站同步通过网关上的 rsync 完成，因此脏工作树也能工作，而且 forge 令牌在任何时候都不会接近机器。
- Copilot 编码代理：默认拒绝出站访问，仅允许包仓库白名单。我们的稳态默认策略更强（完全不直接出站），因为推理和网页搜索通过 SSH 隧道到达——但参见“安全性”部分，了解为什么这属于“受控出站”，而不是“零出站”。

## 架构决策：循环放在 worker 上，推理通过 gateway 进行

考虑了三种放置方式：

1. 循环保留在 gateway 上，worker 执行工具（Cursor 模型）。这是最安全的失败域（转录、推理、审批、重启恢复都保留在本地），也是评审更偏好的第一个里程碑。作为产品架构被否决：OpenClaw 的非执行工具是进程内文件系统操作，因此每次文件读取/编辑/grep 都会变成网络往返，或者需要把大的工具面改造为粗粒度的 workspace RPC；运行时行为过于啰嗦且受延迟限制。我们只在已经构建好的地方复用它的思路（将 exec 卸载到节点），但不构建工具远程调用层。
2. 循环和推理都放在 worker 上。失败域最简单，但模型凭据（包括 OAuth 配置）必须随机器一起部署到临时机器上，gateway 失去策略/路由/审计控制，而迁移会切换提供方调用身份，使提供方缓存失效。
3. 循环 + 工具放在 worker 上，模型调用通过 gateway 代理。已选定。每次模型轮次只需一次往返，而不是每次工具调用都往返；工具在代码旁边运行；gateway 仍然是 auth 配置、提供方路由和策略的唯一持有者；worker 不持有任何密钥。

方案 3 的代价是在每次模型轮次期间都依赖同步的 gateway，因此其持久性规则是决策的一部分，而不是事后补充：

- gateway 在轮次中途丢失会使当前提供方调用失败。该轮次会被标记为失败，并在重新连接后作为新的轮次重试；不会对进行中的提供方流进行透明重放（存在双重计费/双重工具调用风险）。
- 每一次 worker↔gateway 操作都携带持久化身份（见 Worker protocol），因此重新连接后要么恢复，要么获取缓存的终态结果，而不是悬挂。
- gateway 是一个受容量管理的组件：并发 worker 限制、流量控制和负载卸载都在 v1 范围内（见 Capacity）。

因为 gateway 同时存储转录并发起所有提供方流量，所以会话与位置无关：在 gateway 和 worker 之间移动循环，对提供方侧和 UI 数据路径都没有影响。这正是使调度和回迁成本低廉的原因。

## 组件

### 1. 环境状态机 + 提供者契约

网关协议中的 `environments.*` 目前只是一个仅包含状态的投影。其持久化核心是一个由 SQLite 管理的环境记录和状态机，设计早于 RPC 形态：

`requested → provisioning → bootstrapping → ready → (attached|idle) → draining → destroying → destroyed | failed | orphaned`

- Provisioning 是崩溃安全的：在调用提供者之前，意图行会先被持久化，并带有确定性的操作 id，因此网关重启时可以接管一个正在进行中的租约，而不是重复 provision 或让一台已付费的机器变成孤儿。
- 重启协调和孤儿清理器（provider `inspect` 对比本地记录）是 v1 需求，不属于硬化项。

提供者契约（由插件实现；核心中不包含任何提供者名称或策略）：

```ts
type WorkerProvider = {
  id: string;
  provision(profile: WorkerProfile, opId: string): Promise<WorkerLease>; // → ssh host/port/user/key material
  inspect(lease: { leaseId: string; profile: WorkerProfile }): Promise<LeaseStatus>; // adopt/health/orphan sweep
  renew?(leaseId: string): Promise<void>; // long-lived sessions vs provider TTLs
  destroy(lease: { leaseId: string; profile: WorkerProfile }): Promise<void>; // 幂等，仅在证明已终止后返回
};
```

RPC：`environments.create`、`environments.destroy`、扩展的 `environments.list/status`（provider、lease id、state、age、idle time、attached sessions）。首批提供者：一个 Crabbox 形态的 lease CLI 封装器（产品路径），以及一个标记为仅开发可用的静态 SSH 主机提供者——共享主机上的 worker 可以读取无关的主机数据，因此静态主机仅用于功能开发，而不是默认配置。

### 2. Worker 引导：在机器上安装 OpenClaw

不使用定制的 worker 构件，也不依赖 npm 可用性：

- 所有模式的规范安装方式：由 gateway 产出的、内容哈希化的 worker bundle（即 gateway 自身的构建输出，打包为 tarball），通过 SSH 推送并安装到机器上。这在设计上同时覆盖了开发构建和未发布的提交。
- `npm i -g openclaw@<exact gateway version>` 仅在 gateway 运行已发布版本时作为优化；绝不使用 `latest`。
- 引导过程是幂等的；对于与 bundle 哈希匹配的热租约，会跳过安装。原始机器可能需要一个联网的工具链阶段（Node 运行时）——这属于 setup 阶段的一部分，并在之后关闭。
- 握手会验证 worker 构建哈希、协议特性集以及运行时兼容性。现有的 gateway 版本/协议检查对此并不充分（经 SSH 隧道连接的节点会被豁免于精确版本拒绝），因此 worker 准入会自行执行精确构建检查。

Worker 模式（`openclaw worker`）是一个入口点，而不是一个分叉：它包含连接处理以及内嵌的 agent runner，并由 gateway RPC 支持会话持久化和模型调用。它不得启动 gateway 的各类面：没有 channels，没有插件自动启动（会话工具集除外），使用一次性状态目录，不使用本地 auth profiles。

### 3. 传输：全部通过 SSH

网关负责连通性；worker 除了 sshd 之外不需要任何东西：

- 网关使用 SSH 连接到 worker（凭据来自 provider lease，主机密钥从 provisioning 输出中固定绑定——不要使用 `StrictHostKeyChecking=no`），并建立一个反向隧道，将 worker 本地 socket 转发到网关的 WS 端点。
- 控制/模型流量和工作区传输使用独立的 SSH 连接，并使用相同的固定信任材料，因此 rsync 不会在头部阻塞 token 流。
- 隧道生命周期（keepalive、带退避的重连）由网关上的环境运行时负责。隧道短暂中断对会话层是不可见的：持久化协议状态（如下）使 worker 能够重新附着并继续。

### 4. Worker 协议（专用；不是 node 协议）

针对当前 node 接缝的对抗性审查否定了直接复用：待处理的 node 调用是进程内本地 Promise，会随着连接断开而消失，node 幂等键虽然被解析但不会去重，而且——决定性的——已连接的 node 可以发出普通的 node 事件（包括 agent-run 请求），因此“node 类型 + 能力上限”并不是入口安全边界。因此，Worker 采用带认证的 `worker` 角色，并配有一个封闭、带版本的 RPC/event 白名单；worker 连接无法访问任何旧的 node 事件处理器。

身份与凭证：预配会签发一个短期 worker 凭证，将其绑定到环境 id、worker key、bundle hash、唯一允许的 session、允许的 RPC 集合以及过期时间。SSH 验证的配对仍然适用（我们已经预配了这台机器并持有密钥），但授权来自签发的凭证，而不是来自所声明的 node 暴露面。

持久化操作语义（形状借鉴自现有的 ACP 运行时及其事件账本——稳定句柄、每个 session 串行化、持久化的 `(session, seq)` 重放）：

- 每个操作都以 `(sessionId, lifecycleRevision, runId, ownerEpoch, streamKind, seq)` 为作用域。
- 所有权 epoch 用于隔离陈旧 worker：替换 worker 会推进 epoch；来自旧 epoch 的迟到结果会被确定性地拒绝。
- 通过持久化 ACK 游标和 SQLite 中缓存的终态结果实现至少一次投递；去重是确定性的。不承诺恰好一次。
- 为 cancel、close、resume 以及终态结果提供显式帧；流上采用基于 credit/window 的流控。
- 协议特性协商独立于通用 node 协议版本。

### 5. 会话后端 RPC

两个不同的契约——当前代码库将持久化的转录变更（由 session-manager 管理的、带有父/叶状态的 JSONL 树）与进程本地的实时事件（流式增量、工具生命周期、审批）分离开来，而 worker 协议必须保留这种分离：

- 持久化转录提交：worker 使用 `runEpoch` + 基于 base-leaf 的 compare-and-swap 提交语义追加批次；gateway 的 session manager 生成 entry id 和 parent id。worker 绝不能提供受信任的转录行、entry id、parent id 或外部 session id。
- 可回放的实时事件：一个带类型的事件联合体，包含 worker 序列号、gateway ACK、有限保留以及迟到事件防护，并接入现有的 agent-event 扇出，因此聊天视图、工具行以及未读/状态逻辑的行为与本地会话完全一致。

推理代理：重用现有运行时代理流客户端（`src/agents/runtime/proxy.ts`）的事件词汇，但要移动信任边界。worker 只发送会话/run 标识、已批准的模型引用、上下文以及受约束的生成选项；gateway 从自己的目录中解析 provider、endpoint、auth、headers、路由和成本策略。worker 提供的模型对象（例如攻击者控制的 `baseUrl`）会被拒绝。请求大小限制、取消、审计和终态结果回放均适用。驻留在 gateway 的工具（websearch）在 gateway 上执行，并通过同一通道返回结果。

### 6. 工作区同步

同步锚点是一个网关本地的工作区，具有独占的放置所有权：对于 git 工作区，它是一个专用的受管 worktree（现有的 managed-worktree 元数据——分支、基线、快照所有权——是其基础）；对于非 git 工作区，它是一个由网关拥有的目标目录。绝不是用户的实时检出副本。会话在远程放置期间的独占所有权，正是使入站同步从设计上天然无冲突的原因。

所有权分离——提交 vs. 发布：

- 工作侧代理在其副本中正常编写提交（`git commit` 是本地、无需凭据的操作；作者身份从网关配置中投射）。在网关接纳这些提交之前，它们只是静止的对象。
- 网关负责所有需要信任的操作：验证入站提交是否建立在记录的基线之上、将本地 worktree 快进、推送、创建 PR，以及可选的签名/重新签名——全部使用网关本地凭据。工作侧从不持有 git 或 forge 凭据，也从不接触任何远程端。

两种同步模式，根据工作区是否为 git 仓库来选择：

- Git 模式。出站：通过隧道的 SSH 身份对 worktree 进行 rsync（包含未提交和符合条件的未跟踪文件；遵循 crabbox 风格的 include/exclude，且尊重 `.worktreeinclude`），并将其记录为不可变的基线清单（内容哈希 + 基线提交）。入站：新提交以 git bundle 或相对于记录基线的临时 ref 的形式返回；未跟踪工件则通过显式清单返回，并进行大小/类型/symlink 容纳性检查。接纳时会验证基线祖先关系，并在发生分叉时停止——不会静默覆盖任一侧。删除、重命名、子模块以及 symlink 逃逸都由清单规则处理，而不是由 rsync 启发式逻辑处理。
- 纯文本模式（无 git——例如在盒子上从头构建项目）。出站与上面相同，都是 rsync + 基线清单。入站则以清单差异方式镜像回网关拥有的目标目录，并传播删除操作。其安全性与 git 模式相同：独占所有权意味着不存在可产生冲突的并发本地编辑；基线清单仍会检测到意外的本地漂移，并停止而不是覆盖。

检查点机制可保护持续数天的会话免受租约丢失影响：定期进行入站检查点（git 模式下为 session-branch 提交，纯文本模式下为清单快照）；频率由配置文件策略决定（默认按轮次）。

### 7. 放置状态机、会话与 UI

运行时放置是一个由 SQLite 拥有、以会话为键的状态机，而不是一对松散的行字段：

`local → requested → provisioning → syncing → starting → active(worker) → draining → reconciling → local | reclaimed | failed`

它会持久化 environment id、transition generation、active owner epoch、workspace base manifest、worker bundle hash 和最后的 ACK 游标。Turn admission 会在任一循环开始一个 turn 之前，原子性地声明放置，因此，针对过期快照被接纳的本地消息绝不会与 worker turn 竞争——任意时刻只有一个循环拥有该会话。

UI：

- Worker 会话就是一条普通会话记录，加上放置元数据。它存在于正常存储中，通过 `sessions.list` 列出，通过现有订阅流式更新——侧边栏和聊天不需要新的数据路径，只需要展示方式：一个 worker 徽标，以及放置/环境状态（`provisioning / syncing / running / idle / reconciling / reclaimed`）。
- 创建体验：会话目标栏（sessions 侧边栏重设计）在 gateway 和 node 之外增加一个云 worker 目标。需要已配置的 provider profile；在配置完成之前该功能不可见。
- Agent 派发：会话工具允许 agent 像人类一样把工作交给云 worker（由 worker 支持的子会话，类似 subagent）。它与 human dispatch 一起在同一个里程碑交付，并由同样的 opt-in provider 配置进行门控。递归在结构上是有界的（v1 中 worker 会话自身不能再派发 worker）；费用控制通过按环境计费/审计实现，而不是配额机制。

## 派发与交接

v1 刻意设计为非对称：

- 本地 → worker（派发）：通过下方的迁移屏障，创建或复用一个 worker，同步，切换放置位置，下一轮在远端执行。
- worker → 本地（拉回）：停止会话（按照相同屏障清空 worker），完成入站协调，切换放置位置到本地。不是实时迁移。
- 对称的实时交接（在不中止的情况下，双向移动一个正在工作的会话）会复用相同的屏障和协调机制，并会在故障注入测试证明该屏障后再推出。

迁移屏障（仅靠“turn 边界”是不够的——审批、后台进程以及已释放锁的 transcript 合并都可能跨越它）：

1. 停止接纳新的 turn（放置声明）。
2. 取消或清空活跃运行。
3. 撤销待处理的执行审批和执行授权。
4. 清空 transcript 侧写入和 live-event ACK。
5. 终止 worker 子进程。
6. 通过推进 owner epoch 来隔离旧所有者。
7. 协调工作区（入站、感知冲突）。
8. 激活新所有者。

缓存亲和性：由于 provider 请求在两种放置位置下都源自 gateway，只要序列化后的 provider 请求保持等价——相同的工具顺序、系统指令、provider 包装器以及缓存元数据（它们都保留在 gateway 侧）——缓存亲和性就会被保留。这是一个可测试的属性，而不是假设：针对每个受支持的 provider 传输，在本地/worker 放置之间进行字节级等价测试，是引入 worker 循环的里程碑的一部分。

## 安全模型

精确定义如下：worker 没有直接的网络出口，也没有长期存在的 provider/forge 凭证。它并不是“零出口”——推理和由 gateway 执行的工具是受控的出口通道（被 prompt 注入的 worker 仍然可以把工作区字节放入模型上下文或 websearch 查询中）。因此：

- 受控出口计量：针对每个环境，在 inference proxy 和 gateway 工具上进行审计与对操作者可见的计量。速率/字节限制作为协议流控（容量）存在，而不是作为支出配额机制。
- worker 到 gateway 的入口是封闭的 worker-protocol allowlist；transcript 写入在结构上受到约束（gateway 生成的 id、单一绑定会话）。
- worker exec 在 box 内拥有全部权限。该 box 是可丢弃且无凭证的，因此对每个命令进行审批只会增加摩擦，并不能保护任何东西；受保护的边界在于入站对账和审计。exec 从不经过 gateway 节点审批路径。
- 互联网策略是一个 provisioning 时的 provider 决策：环境配置文件在 box 创建时决定（防火墙/security group/no-egress network），可选地带有一个网络化的 setup 阶段，provider 会在 agent 阶段之前关闭它。Core 不实现运行时网络切换。
- 在 provisioning 时进行 box 卫生检查：阻止或确认不存在云元数据端点、没有 instance profile、没有继承的 SSH agent、没有 Docker socket、干净的 env/home。SSH host keys 根据 provisioning 输出进行固定。
- 任何 gateway 侧的审批和策略（push、PR、provider 调用）继续在 gateway 上运行。

被入侵的 worker 会话的爆炸半径：同步的工作区副本，以及审计过的 proxy 通道所允许的内容——没有凭证、没有直接网络、没有超出 allowlist 的 gateway 暴露面。

## 容量

网关会为 N 个 worker 转发每一条 prompt 和 token 流，因此 v1 需要先定义容量模型，而不是在生产环境中去发现它：每个网关的并发 worker 限制、每个流的信用窗口（当前的事件流队列是无界的，且 node socket 缓冲区上限会强制关闭慢消费者——这两者都不适合直接沿用）、用于应对突发流量的有界磁盘溢写，以及带有可见背压状态的负载卸载。工作区传输仍保持在其独立的 SSH 通道中。

## 生命周期

- 空闲自动停止和 TTL 是提供商配置文件策略，而不是固定常量。默认值很宽松，并明确支持保持活动；支持长时间运行的工作是一级能力（基于租约的后端存在提供商 `renew`）；只要会话中有正在进行的轮次或最近有活动，就永远不会被回收。
- 在工作进程死亡或被回收时：placement 会变为 `reclaimed`，会话行仍然保留，下一条消息会创建一个新的工作进程，并从最后一个检查点重新同步。对话永远不会丢失（网关侧存储）；自上一个检查点以来的工作区更改会丢失，UI 也会说明这一点。
- 从第一天起支持 warm-lease 复用（如果提供商支持）；启动后进行镜像快照是 v2 快速启动路径。

## 配置面

最小化且按需启用：一个提供者配置块（提供者 id、凭据/CLI 引用、同步规则、生命周期策略、预算、可选的初始化阶段）以及每个会话的放置选择。不新增环境变量。未配置的安装不会看到任何内容。

## 里程碑

实现将以小型、可独立合并的 PR 形式落地；下面的每个里程碑都是一个 PR 系列，而不是一次性改动。

1. 基础：环境状态机 + provider 合约 + crabbox 形态 provider（使用 static-SSH 作为开发支架），worker bundle 引导 + 接纳握手，SSH 隧道 + 主机密钥固定，受管工作树快照 + 出站同步（git + plain 模式）。孤儿清理 + 重启接管。
2. Worker 协议 + worker 循环：经过认证的 worker 角色、持久化 ops/epochs/ACK 游标、transcript 提交 + 实时事件合约、带网关解析模型的推理代理、流量控制。仅一个 provider、仅人工派发新会话，不支持交接。故障注入测试（隧道分区、网关重启、worker 退出）作为退出门槛。
3. 派发 + 回拉 + agent 派发：迁移屏障、连接状态机接入 UI 目标栏、入站对账 + 检查点、按环境审计、容量限制、agent 派发工具（worker 会话不能递归）。提示缓存字节级等价测试。
4. 对称的实时交接，在里程碑 3 的故障注入验证之后。

后续：在 worker 上启用 ACP harness，作为按环境的凭据注入可选项；snapshot/warm-image 快速启动；fan-out（N 个租约，相同 prompt）；内置 OS 沙箱；通过 artifacts schema 获取更丰富的产物捕获。

## 未决问题

- 工作节点上的插件/技能可用性：仓库随附的技能会随工作区免费同步；网关配置的智能体技能/插件则需要明确决定同步或排除（无论哪种方式，工具/插件清单都是接入握手的一部分）。
- 检查点频率默认值：对于非常健谈的会话，采用基于轮次还是基于时间。
- 环境配置文件如何与多智能体路由交互（按智能体的默认配置文件，还是仅按会话级别选择）。
