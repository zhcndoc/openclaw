---
summary: 一切都是节点——一种统一的放置模型，其中配对机器和云端盒子通过 worker admission path 承载会话；客户端连接到会话，而不是 runner
title: Runners 计划
read_when:
  - 设计或审查会话运行的位置（gateway、device、cloud）
  - 更改 Where 选择器、设备配对、节点接入或 worker dispatch 界面
  - 为会话、设备、节点或放置相关的任何内容命名
---

## 状态

Proposal，第 2 次修订。在原位取代第 1 次修订（2026-08-11，operator
decision）。Implementation 进行中；每个推进里程碑的 PR 都必须更新此表。

| #   | Milestone                                                  | Status      | PRs                                |
| --- | ---------------------------------------------------------- | ----------- | ---------------------------------- |
| 0   | 此计划（第 2 次修订）                                     | 已落地      | #122454                            |
| 1a  | 命名：恢复 session 文案                                    | 已落地      | #120667                            |
| 1b  | 命名：设备整合                                            | 已落地      | #120689                            |
| 1c  | 清理：合并 node-pairing → device-pairing                  | 已落地      | #120726                            |
| 2   | `openclaw resume` + Web Continue in terminal               | 进行中      | #120664                            |
| 3   | `openclaw connect` 单次粘贴接入 + `/j/` 加入路由          | 进行中      | #120768, #122499                   |
| 4   | 选择器：分组、放置、存活状态、信息补充                    | 进行中      | #120804, #122531, #122635, #122774 |
| F   | Real-wire session boundary harness                         | 已落地      | #121212                            |
| 5   | 公共 worker ingress path                                  | 已落地      | #122578, #122643                   |
| 6   | Node worker provider（device runners）                    | 进行中      | #122683, #122829                   |
| 7   | Bundle push consent + runner updates                       | 未开始      | —                                  |
| 8   | Stop-and-continue moves                                    | 未开始      | —                                  |
| 9   | 删除（ssh sandbox、openshell、exec-host 克隆等）           | 未开始      | —                                  |
| 10  | Cloud convergence（provisioners 运行 `openclaw connect`）  | 未开始      | —                                  |

修订历史：第 1 次修订（2026-08-08）在代码证据调查和三次对抗性审查之后，确立了
session/runner 词汇、命名裁定和里程碑骨架。第 2 次修订
（2026-08-11）基于第二轮深度代码阅读（worker admission、
tunnel、sync、node channel、scope model）、行业调研（GitHub/GitLab/
Buildkite/CircleCI runners、Tailscale、VS Code tunnels、Coder、Gitpod Flex、
Amp、Cursor/Claude/Codex cloud）、对 Amp runner transport 的静态拆解，以及对本次修订的新一轮对抗性审查。改变计划的 operator 决策如下：

- **节点承载会话。** 第 1 次修订中“node 角色不运行 turn loop”
  的非目标在结论层面被推翻，但其中的事实仍然成立：node
  _connection_ 仍不是权威边界，因此承载会话的权威位于 dispatch 层
  （worker admission、每次 dispatch 的凭据、turn claims、owner epochs）——是迁移，而非移除。
- **`openclaw worker` 成为由节点监管的子进程。** 只有一种机器概念：
  配对节点可以运行云端 worker 当前运行的一切内容。
- **SSH 不是设备传输方式。** gateway 从不拨号连接设备；设备始终主动向外拨号。
  第 1 次修订中设备 runner“先部署 sshd”的方案已删除——它无法连接位于 NAT
  后的机器，而且调研的产品都没有使用 SSH 作为控制传输。SSH 只保留为传统云租约
  传输方式，直到里程碑 10 将其淘汰。

## 问题

实质上与第 1 次修订不变：OpenClaw 对“工作在哪里运行”给出了彼此割裂的答案。
节点只接收转发的 `exec host=node` 调用；用户长期在线的工作站作为会话主机，
能力反而不如一次性云租约。云端 worker 通过持久化的放置状态机承载完整会话，
但只能使用通过 SSH 配置的临时租约。ssh sandbox backend 是第三条远程执行路径。
放置只从混合不同本体的扁平列表中选择一次，之后便不可见；接入新机器需要 flags、
环境变量和两次人工批准。

产品层面的标准是：管理员在 Web 选择器中点击“Connect a machine…”，在任意机器上粘贴一条命令，
几秒之后该机器就会在整个团队的选择器中可见，并可以承载完整的 agent 会话。

## 模型与词汇

```
Session   gateway-owned: transcript, identity, placement, managed worktree.
          Clients (web, TUI, macOS app, channels) attach to sessions,
          never to runners. One noun, everywhere: session.
Node      a paired machine holding an outbound connection to the gateway
          (Ed25519 device identity). Protocol/internal vocabulary; user-facing
          copy says "device". EVERY remote machine is a node — personal
          workstations, servers, cloud leases. Phones are nodes that never
          advertise session hosting.
Runner    anything that can host a session's turn loop: the gateway itself,
          or a session-capable node. "Runner" is internal/docs vocabulary;
          UI copy says "Runs on …".
Worker    the per-turn child process (`openclaw worker`) that hosts a
          session's loop under worker admission. On cloud leases it is
          launched over SSH today; on nodes it is a supervised child of the
          node host. Same admission, same protocol, either way.
Isolation a property OF the runner (none | docker | podman), not a place.
Project   repo identity: normalized remote.origin.url, with the existing
          16-char repo fingerprint as the no-remote fallback. Derived,
          never registered.
Checkout  project × runner = { runnerId, path }.
Turn      one prompt-to-response work attempt inside a session.
```

命名裁定（由 operator 决定，沿用自第 1 次修订）：**session** 是对话唯一的产品名词；
**devices** 是面向用户的配对硬件称呼；新的 CLI 体验采用**动词**
（`openclaw resume`、`openclaw connect`）；“runner” 永远不会出现在 UI 文案中。
里程碑 1c（nodes → devices 路由/i18n 整合）将在任何新的 placement 文案发布之前落地。

## 架构

### 双连接形态

所有调研过的生产系统（GitHub Actions runners、GitLab、Buildkite、
CircleCI、Tailscale、VS Code tunnels、Coder、Gitpod、Amp）都使用机器到控制平面的仅出站连接，
而其中成熟的系统会将持久化的 presence/control channel 与每个 job 的 work channel 分开。
OpenClaw 已经具备这两部分；本计划将它们连接起来：

1. **Node connection**（已存在）：出站 gateway WebSocket。承载 identity、presence、
   capability manifest，以及有界命令调用（`node.invoke`）。这是控制通道：
   registration、liveness，以及 workspace 操作的传输方式。
2. **Worker connection**（已存在）：每次 dispatch 对应的 WebSocket，使用封闭的 worker protocol
   （heartbeat、transcript CAS commits、可恢复的 live events、gateway-proxied inference、
   gateway-side session tools）。Admission 由 store 支持且与传输无关：每次 dispatch 使用 32 字节凭据
   （10 分钟 TTL，静态存储时哈希）、environment binding、owner epochs、精确 bundle hash，
   以及每次 RPC 的 identity revalidation。在 node runner 上，worker 子进程直接拨号连接 gateway 的
   公共 TLS endpoint——已连接的节点证明出站路径存在。

有意不作为传输方式的是：把 `node.invoke` 当作 worker connection 的字节管道。测得的限制
（16 KiB 字符串块、每个块都需要一次等待中的 RPC 往返、没有幂等去重、重连会终止进行中的 invoke、
每个 nodeId 仅允许一个 session 且会驱逐旧连接、50 MB 缓冲区达到上限后强制关闭）使其不适合数小时的流。
它保持原本的定位：有界命令通道。

### 公共 endpoint 上的 Worker ingress（里程碑 5）

目前 worker ingress 是一个只能通过 loopback 访问、经由 `ssh -R` 到达的专用 listener；
main ingress 会拒绝 worker frames。对于 node runners，相同的 admission 会通过公共 TLS endpoint
上的路径标记 upgrade route 暴露（由 route 强制设置 `connectionKind = "worker"`，而不是由 listener 设置）。
loopback listener 会继续为通过 SSH 配置的云端 worker 保留，直到里程碑 10。

随暴露一起发布的加固措施，而不是事后补上：

- Admission failures 统一折叠为一个不透明原因。目前
  `invalid-credential` 与 `environment-mismatch` 的区别会形成 environment-id 枚举 oracle，
  不得在公共环境中被观察到。
- Worker path 共享 gateway 的 preauth budgets 和 rate limits；
  pre-credential connection 会得到与其他未认证客户端相同的廉价拒绝。
- 凭据强度已经足够（32 个随机字节、constant-time hashed compare、10 分钟 TTL、单一 environment binding）。

### Node worker provider（里程碑 6）

`WorkerLease` 扩展为一个 union：`{ ssh: … } | { node: { deviceId } }`。
Admission/placement machinery（environment store、credential broker、placement state machine、
turn claims、transcript/live-event/inference protocols）原样复用——这是来之不易的部分。
新增内容如下，诚实地说明（第 1 次修订对此有所低估）：

- **Node tunnel handle。** 第二个 `WorkerTunnelHandle` 实现：
  `runWorkspaceCommand` 映射到有界 node command（argv + stdin → SpawnResult；
  远端 sync/manifest/quiesce scripts 已在 bundle 中发布，且与传输方式无关）。
  `remoteSocketPath` 被替换为携带 gateway worker URL 的 descriptor。
- **持久化启动。** 在 SSH 流程中，launch exec stream _就是_ worker 的生命周期，
  它的终止会销毁 environment。在 node 上，launch 是由 node-host command 监管的：
  node host 生成与 invoke 生命周期解耦的 worker 子进程，持久化单行结果，gateway
  以幂等方式重新收集结果。Node WS 短暂中断不得终止 turn。
- **凭据传递。** launch descriptor（包括每次 turn 的凭据）通过经过认证的 node channel
  传递，而不是 SSH stdin。两者属于同一信任域：无论哪种方式，node host 都是机器侧 agent。
- **无需 rsync 的 Workspace sync。** 通过经过认证的 HTTPS，基于 manifest 的 delta blob transfer
  连接 gateway（manifest machinery 已经计算出精确的 changed-blob 列表；rsync 只是传输载体），
  如果 project 有 origin，则使用 git-mode 从 origin 获取基础内容。现有边界
  （inventory entries、manifest bytes、reconcile caps）继续沿用。对于已通告本地 checkout 的节点，
  完全跳过 gateway push（Amp 模型：runner identity = host + workdir + repo）。
- **持久化机器生命周期。** `destroy` = 逻辑上的 lease release。
  Provider `inspect` 根据 pairing + presence 返回三态结果：_present_、
  _dormant_（已配对但离线，且在休眠期限内——不得被 reconcile sweep
  驱动为 `orphaned`）、_gone_（未配对或超过期限 → 正常 orphan/reap 路径）。
  以 unpair/dormancy 为依据、而不是以 provider teardown proof 为依据的 device-environment reaper
  会清理 rows、credentials 和 staged refs。设备端对每个 session 的 workspace dirs 以及过时 bundle
  进行 GC 是里程碑退出门槛，而不是留待决定的问题：否则持久化机器会泄漏用户自己的磁盘空间。
- **Placement `runner-offline`。** Heartbeat/presence 丢失会用记录的、对 operator 可见的原因标记 placement；
  staged results 由现有 fence machinery 保留；session 提供“continue on gateway”（reclaim）
  或“wait for device”。绝不会静默地没有结果。
- **Dispatch target union。** `sessions.dispatch` 接受 `{ profileId } | { deviceId }`；
  device → environment 的映射在服务端解析。设备不会通过合成的
  `cloudWorkers.profiles` 条目偷偷传入。
- **并发槽位。** 节点声明 session-slot 数量（默认较小）；选择器显示忙碌状态；
  如果没有存活的 runner 可以满足 dispatch，则在有界等待后以可见方式失败，而不是无限排队。
- **多 gateway 安全性。** 节点上的 worker install/workspace root 按 gateway identity 命名空间隔离，
  因此两个配对同一机器的 gateway 不会破坏彼此的状态。

Node runners 上的 Isolation：可选的 worker-in-docker/podman，与 gateway-local sessions 使用相同的 sandbox 轴。
云端租约保持 box 内的完整权限（机器本身就是边界）。

### 信任模型（operator 决定，v1）

Cloud workers 使用完整权限，因为其 box 是一次性的且不包含凭据。配对的个人机器则不是。
v1 的解决方案如下：

- **只有管理员可以配对节点**（已经实施：`role: node` device approval 要求 `operator.admin`；
  join-code mint 也受 admin 作用域限制）。配对节点意味着管理员声明它是**共享团队基础设施**
  ——服务器、构建机或专用工作站。这就是“gateway 上的所有人都可以 dispatch 到此设备，
  且会话内容会落到此设备上”的同意边界。
- **个人设备 runner 不在 v1 范围内。** 它们会与每个人的 node ownership
  （基于记录的 owner 设置 visibility + dispatch policy）一同加入，而不是提前加入。
  从第一天起就会在配对时记录 approver identity，作为**来源信息，而非授权信息**
  （新增可为空的列），以便未来的 policy 有数据可依。
- **手机和低信任设备永远不会通告 session hosting。**
  这是 capability gating，而不是 ontology：选择器不会提供这些设备。
- 非交互式批准旁路（trusted-CIDR、SSH-verify、trusted-proxy browser auto-approve）
  仍然限定在当前的 presence-level grants 范围内，并针对 hosted-gateway 类别进行审查；
  任何旁路都不得在没有管理员参与的情况下创建具备 session 能力的节点。
- Inference 仍由 gateway 代理；provider keys 永远不会到达节点。如果节点未来需要直接从 origin
  获取 private repos，gateway 会为每次 dispatch 签发短期、限定作用域的 git credentials；
  节点上不保存长期 PAT。

### 接入（里程碑 3）

复制行业标准的拆分方式（短期 enrollment secret → 长期 device identity；
GitLab 已弃用可复用 registration tokens 以实现这一点，Tailscale 的 key/device revocation split
是有文档记录的模型）：

- 管理员从选择器的“Connect a machine…”入口或 `openclaw devices` CLI
  mint 一个**单次使用、约 10 分钟有效的 join code**（熵 ≥128 位）。
  现有的 `device.pair.setupCode` RPC 和 `node` bootstrap profile 是基础设施；
  该 code 只会预批准 node 角色，不包含任何 operator scopes。
- 粘贴的一行命令是 `npx openclaw connect <url-or-code>`（顶层动词；
  `openclaw node run` 仍作为底层 plumbing command）。它接受完整的 `oc-pair://` payload
  （离线形式，携带 gateway URL + bootstrap token + 可选的自签名 gateway TLS pin），
  或者接受 `https://<gateway-host>/j/<shortcode>` URL，通过 TLS 获取其 payload。
  `--service` 会安装 OS service，而不是以前台方式运行。
  公共网站上的 curl installer wrapper 会安装 CLI 并执行相同的 verb；公共网站永远不会看到 tokens。
- Gateway 提供 `/j/<shortcode>`（Control UI routing 中的保留前缀，单次使用后销毁，严格按 IP 限流）。
- 撤销拆分已有文档说明：撤销 join code 永远不会解除节点配对；
  移除/封禁节点是 devices 页面上的一等操作，同时会对进行中的 placements 设置 fence。
  节点在长时间失联后的自动清理遵循 runner 行业实践。

### Bundle 和更新（里程碑 7）

Exact-hash admission 保持不变。固定且内容哈希化的 bundle 通过已经过认证的 paired channel
推送到节点。Consent 被拆分，使其不会演变成审批疲劳或无声意外：

- **成为 runner 的 consent**：每台设备一次，在配对/启用时完成。
- **运行 build 的 consent**：由 channel 满足——bundle 只会来自此管理员配对的 gateway，
  dispatch 时的更新属于正常的 managed-runner 行为（GitHub runners 也以相同方式自更新）。
  devices 页面显示已安装的 runner version；gateway 会拒绝向过时节点 dispatch，
  并给出 doctor 风格的提示，而不是静默失败。

### Projects read model（里程碑 4 基础）

OpenClaw 已经在没有命名的情况下计算了两次 project identity：
worktree service 派生 `originUrl` + 16 字符 repo fingerprint
（`src/agents/worktrees/service.ts:199-205`），sessions catalog 按 project folder
对 Codex/Claude rows 分组，并将 `.claude/worktrees/<name>` 折叠到其 origin repo 中。
该组件会将其提升为一等 observed read model，与 `projects.list` 已返回的 registered projects
并列，并遵循与 `environments.list` 相同的 computed 模式：

- **`projects.list.observedProjects` read model**（为具备写入能力的调用方计算，
  不新增 store）：按 repo fingerprint 对已知 checkout 分组 → `{ name, originUrl, checkouts:
  [{runnerId, path}], lastUsedAt }`。来源：session rows
  （`execCwd`/`execNode`）和 managed-worktree registry。observed paths 和经过清理的 origins
  只返回给 `operator.write` 调用方；只读调用方继续使用 registered project catalog 和 project-only recents。
  设备通告的 checkout 仍属于里程碑 6 的工作。

### UI（里程碑 4）

第 1 次修订的设计规则仍然成立：正常状态保持安静；只有异常情况才发声。新增内容：

- **使用现有的 environment type discriminant** 进行选择器分组：
  本地 gateway、已连接且具备执行能力的节点、worker environments，以及单独的 cloud profiles 列表。
  `sessionHost` 推迟到里程碑 6，在 device runners 引入所需的 capability fact 时再处理。
- **重新组织 Where 选择器**（`ui/src/pages/new-session/place-picker.ts`）：
  分区为“This gateway”/“Devices”/“Cloud”。设备行将 environment catalog
  与已连接且具备执行能力的节点求交集；cloud profiles 仍保留在其独立列表中。
  Folder 和 destination 保持正交。
- **Session header 上的 placement chip**：显示安静的当前 placement；
  active cloud placements 通过 `sessions.reclaim` 使用“Bring home”进行 reclaim。
  Stop-and-continue moves 将在里程碑 8 到来。
- **里程碑剩余工作**：live presence 和 pairing subscriptions、受 admin 控制的
  “Connect a machine…”入口、忙碌和从未连接状态，以及新增的 `EnvironmentSummary`
  platform、session-host、trust 和 runner version facts。随后，`runner-offline`
  会显示包含记录原因及其恢复动词的 banner。

### Cloud convergence（里程碑 10）

Cloud provider 的工作归结为：启动 box，在 setup 中运行
`openclaw connect <one-shot code> --ephemeral`。Ephemeral enrollment
（行业实践：GitHub `--ephemeral`/JIT、Buildkite `--acquire-job`、Tailscale
ephemeral keys）会在运行结束后自动取消注册，并在节点离线时自动清除 node record。
`destroy` = release lease。经过 soak 后，SSH reverse-tunnel stack、
`PreparedWorkerSsh` 和 rsync transport 将被删除；cloud leases 和 paired machines
会成为具有不同生命周期的同一种 runner。

## 对抗性审查否定或重塑的内容

从第 1 次修订沿用的内容（仍然成立）：没有 Places registry
（`environments.list` 继续作为 read model，并以 additive 方式增强）；不向没有独占所有权的 live checkout
进行 dispatch；`exec host=node` 保持不变（不同产品、不同 policy domain）；没有 sandbox-as-a-place
picker row；没有虚假的 mobility verbs；没有 live migration；没有 multi-gateway federation；
没有将手机作为 runners。

第 2 次修订中修改或新增的内容：

- 第 1 次修订中“device runners 基本上是现有 worker stack，无需实质改变”的说法被**夸大了**：
  admission、placement、claims、stores 和 worker protocols 会复用；transport、credential delivery、
  sync carrier 和 launch durability 是全新的。里程碑 6 的范围据此调整。
- 第 1 次修订中“先部署 sshd”的 transport 已**删除**（目标机器不可达；偏离行业实践）。
- “所有人都能 dispatch”受上述信任模型**限制**——在每个人的 ownership 机制发布之前，
  仅限共享基础设施。
- `node.invoke` 字节管道方案（本次修订第一稿中的方案）被测得的 protocol constraints 否定；
  direct-dial worker connection 取代了它。

## 既有方案（我们复制什么，跳过什么）

- **Amp**（通过静态 CLI 拆解 + 手动验证）：仅通过 actor framework 使用 outbound WSS；
  每用户 control channel 承载 registration、heartbeat、presence 和 heartbeat responses 中的 dispatch intents；
  每 thread 使用 WS 处理 live sessions；agent loop 在 runner 的既有 checkout 中本地运行
  （无 file sync；identity = host + workdir + repo URL）；inference 在服务端集中处理；
  每个 workdir 的 PID claim 防止重复服务。我们复制双通道形态、通过 control channel 进行 dispatch
  以及 checkout advertisement；保留由 gateway 代理的 inference（其集中化是计费选择，而不是架构选择）；
  enrollment 的限制比其单一长期 API key 更严格。
- **GitHub Actions runners**：registration token → device keypair；JIT/
  ephemeral single-job runners；带 staleness ceiling 和 dispatch refusal 的 self-update；
  关于持久化 runners 运行不受信任代码的直白安全文档。以上精神均已复制。
- **Tailscale**：auth-key 与 node-key 的拆分，以及 revocation split 警告。
  已复制并记录。
- **VS Code tunnels**：黄金标准的 enrollment UX（运行一条命令，浏览器确认）；
  device-code 风格的确认方式可以在之后作为粘贴 code 的替代方案。其每个账号 10 个 tunnel
  的上限验证了每个 gateway 的节点数量应受限制。
- **Coder / Gitpod Flex**：控制面/数据面拆分，由客户侧执行、控制面仅负责编排——
  这是“inference 在 gateway、execution 在 node”最接近的类比，验证了它作为一致的 residency story。
  如果 presence 需要更严格，Gitpod 约 30 秒的 registration renewal 可作为 liveness-lease 参考。
- **Cursor / Claude Code / Codex cloud**：仅使用 managed-VM 执行，并通过 git 进行交接；
  Claude Code 的 proxy-minted scoped git credentials 为上述 scoped-git-token 规则提供参考；
  teleport 风格的 continuation 验证了 attach-only sessions（这是 OpenClaw 免费获得的能力）。

## 里程碑

可独立合并的 PR 系列；1c 之后，3–5 可以交错进行。

1. **1c 命名清理**：完成 route ids、i18n keys、labels 中从 nodes → devices 的转换；
   合并 `node-pairing.ts` facade。在任何新的 placement 文案之前完成。
2. **Continuation ergonomics**（进行中）：`openclaw resume`、Web
   “Continue in terminal”。
3. **`openclaw connect`**：verb + `oc-pair://` decoder + payload 中的 TLS pin +
   `/j/<shortcode>` join route（保留前缀、单次使用、限流）+
   shortcode mint + 公共网站上的 curl wrapper。退出条件：一台新机器可以通过一条粘贴的命令和一次管理员点击，
   与远程 gateway 完成配对，不再需要手动批准步骤。
4. **Picker**（进行中）：重新组织分区、安静的 placement + reclaim，以及 observed projects read model
   优先落地；live presence subscription、受 admin 控制的“Connect a machine…”入口、
   新增的 `EnvironmentSummary` 信息，以及从未连接与已丢失状态完成后，该里程碑结束。
5. **Public worker ingress**：主 TLS endpoint 上带路径标记的 worker upgrade；
   不透明的 admission failure；共享 preauth budgets。退出条件：任意互联网主机上的 worker process
   使用有效 dispatch credential 完成 admission；无效尝试成本低且无法枚举。
6. **Node worker provider**：lease union、dispatch target union、node tunnel handle、
   持久化的 supervised launch、HTTPS delta sync + origin fetch、tri-state inspect + reaper + GC、
   concurrency slots、`runner-offline` placement semantics、以 gateway 命名空间隔离的 install root、
   approver-provenance column。故障注入测试作为退出门槛：设备在 turn 中休眠、turn 中 node WS
   短暂中断（turn 存活）、设备离线时 gateway 重启、credential expiry、slot saturation、
   没有存活 runner 时的 dispatch timeout。
7. **Bundle push + updates**：consent split、通过 paired channel 推送、版本展示、拒绝向过时节点 dispatch。
8. **Stop-and-continue moves**：drain + reclaim + 重新 dispatch 到另一个 runner，复用 migration barrier。
9. **删除**：ssh sandbox backend + remote-fs bridge（约 2.35k LOC）、
   openshell overlap（约 3.4k LOC，先确认使用情况）、exec-host structural clones
   （约 5k LOC 中约 3k LOC）、一次性 `agent.cli.claude.run` node path
   （由完整 session hosting 取代）、node/device pairing 合并剩余部分。
   每项都必须以替代方案为前提，每项单独建立 PR 并提供证明。
10. **Cloud convergence**：`--ephemeral` enrollment、provisioners 运行
    `openclaw connect`，随后删除 SSH tunnel/rsync transport stack。

整个计划的生产 LOC 目标是净减少：里程碑 3–5 是少量新增，6–7 主要是针对复用 machinery
增加一个 provider 和一个 transport implementation，而 9–10 删除的内容多于此前所有里程碑新增的内容。

## 待解决问题

- Dormancy ceiling 默认值（休眠设备在其 environments 被清理之前保持 `dormant` 多久）——
  提案：14 天，无需配置，根据使用情况重新评估。
- Node runners 的 slot count 默认值——提案：交互式设备为 2，服务器类设备更高；
  需要 capability signal 或 connect flag。
- Device-code 风格的浏览器确认（VS Code 模型）作为粘贴 code 的替代方案——
  待 `/j/` 存在后再处理。
- Worker profiles 的 repo-owned environment setup（devcontainer.json）——
  与第 1 次修订保持不变：如果该规范落地则采用，另行制定计划。
- Forge integration（repo 列表、任意位置 clone、PR 状态）——明确不在范围内；
  待派生的 project model 被使用后再跟进。
