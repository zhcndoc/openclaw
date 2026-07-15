---
title: Codex 监督
summary: "来自 OpenClaw 的用于监督原生 Codex 会话的架构和产品边界。"
read_when:
  - 设计 Codex 会话发现、续接或归档行为
  - 更改原生会话目录 UI 或 Gateway RPC
  - 将 Codex 监督扩展到配对节点
---

# Codex 监督

## 目标

Codex supervision 让 OpenClaw 操作员能够发现原生 Codex 会话，并在安全时通过常规的 OpenClaw Chat 界面创建本地分支。Codex App Server 仍然是线程和模型循环的所有者。OpenClaw 提供舰队目录、经过身份验证的操作员 UI、会话绑定以及通道投递。

该功能属于官方 `codex` 插件。不存在单独的 Supervisor 插件或第二套 Codex 协议实现。

## 产品边界

每当 Codex 插件处于激活状态时，目录都会注册。使用以下方式启用面向代理的监督工具：

```text
plugins.entries.codex.config.supervision.enabled = true
```

当前启用的初始产品是有意缩小的，相较于长期的集群规划而言：

- 仅列出未归档的 Codex 线程。
- 按稳定的主机身份分组本地行和已选择加入的 paired-node 行。
- 从已存储或空闲的 Gateway-local 线程创建一个普通的、模型锁定的 Chat 分支，在首次轮次启动其完整的 Codex harness 线程，或者打开为先前分支创建的 Chat。
- 只有在明确确认没有其他运行器后，才归档已存储或空闲的 Gateway-local 线程。
- 在仍然允许现有的受监督 Chat 打开的同时，显示活动本地源，但不提供新分支或归档控制。
- 在主侧边栏中显示每个主机最新的行，在 sessions 页面保留完整目录，并为本地和 paired-node 行提供有界的、基于游标分页的转录读取。
- 按主机隔离目录故障。

目录是未归档的集合。其中的某一行仍然可以具有空闲、活动、`notLoaded` 或错误的轮次状态。

面向代理的监督仍然是可选开启的。在原生 Codex 安装检测成功且所选推理后端通过实时检查之后，引导式入门会尝试安装并启用它，而且这一点独立于用户选择的主要后端。只有当这种机会性的插件设置成功时，监督才会激活。显式禁用的插件、策略阻止，或 `supervision.enabled: false` 对监督工具仍然具有权威性，但不会禁用操作员会话目录。

## 所有权

`codex` 插件拥有所有 Codex App Server 行为：

- 端点发现和连接生命周期
- 协议初始化和版本检查
- 线程列表、读取、恢复、归档以及事件处理
- 审批和用户输入桥接
- 到 OpenClaw 会话的原生线程绑定
- 在继续之后强制执行仅限 Codex 的模型和 harness

Control UI 和 Gateway 使用该插件拥有的服务。它们不会直接读取
Codex rollout 文件，也不会实现另一个 App Server 客户端。

默认的本地拓扑是：

```text
Codex Desktop -> private stdio App Server -> user Codex home
                                             ^
OpenClaw Codex plugin -> supervision App Server connection
  (defaults to managed user-home stdio; explicit appServer settings are honored)
  -> passive source catalog and read
  -> snapshot pin -> canonical appServer-source branch
  -> visible-history injection and every later supervised Chat turn

Ordinary OpenClaw Codex sessions -> managed agent-home stdio by default
  -> ordinary full harness threads -> OpenClaw Chat and channel delivery
```

启用监督不会改变普通的 Codex harness：它默认仍然是
agent 作用域。单独的监督连接默认
使用受管理的 user-home stdio，因此它的目录和快照操作会看到原生
已存储的线程。显式的 `appServer` 连接设置会被遵守。 当
`homeScope` 未设置时，监督连接会将其解析为 stdio 或 Unix 的 `"user"`，
以及 WebSocket 的 `"agent"`。只有当普通 harness 也应该共享原生 Codex
home 时，才显式设置 `appServer.homeScope: "user"`。
从 Codex 侧边栏组中采用的 Chat 是例外：它的私有
监督绑定会将源读取、规范分支创建以及后续
轮次保留在监督连接上。实时状态和所有权仍然是
进程本地的；对于 OpenClaw 的监督进程未知的线程，即使 Codex Desktop 正在主动运行它，也会显示为 `notLoaded`。

Codex 有一个实验性的本地规范守护进程，带有单独的
由安装程序管理的引导契约。此功能不得以隐式方式引导、声明
或假定该守护进程。

## Catalog 流

通用 Gateway 方法 `sessions.catalog.list` 会分发到 `codex`
catalog provider，它始终请求 `archived: false` 以及交互式 `cli` 和 `vscode` 源类型。它会合并：

1. 来自监督 App Server 的 Gateway 本地 `thread/list` 结果，
   其默认使用受管的 user-home stdio。
2. 来自每个已连接且已选择加入的节点的 `codex.appServer.threads.list.v1` 结果。

转录选择在本地使用 `thread/turns/list` 且 `itemsView: "full"`，或者在所选
节点上使用版本化命令 `codex.appServer.thread.turns.list.v1`。每个响应最多包含 20 条持久化 turns，以及不透明的
前向/后向游标。Control UI 请求按最新优先的分页，以时间顺序渲染每一页，并
将更早的页面前置。它从不回退到
无限制的 `thread/read`。OpenClaw 还会在任何序列化 item page 超过
20 MiB 之前拒绝它，以免其跨越节点或 Gateway 传输。

原生 macOS 配对节点实现仅支持未设置/默认或
显式的 `appServer.transport: "stdio"`，并且监督范围为未设置/默认或
显式的 `appServer.homeScope: "user"`。它会将已配置的 `command`、`args`
和规范化后的 `clearEnv` 传递给子进程。在 `"unix"`、`"websocket"`，
或显式 `homeScope: "agent"` 的情况下，它既不会声明 catalog capability
也不会声明 command；直接调用同样会失败并关闭。对于 agent 作用域配置，它绝不允许暴露用户
Codex home，或用本地 stdio 替代显式 endpoint。

catalog 投影会规范化标识符、标题、cwd、状态、active wait
标志、时间戳、source、model provider、Codex 版本以及 Git 分支。它
不会返回 transcript 预览、turns、rollout 路径、Codex home 路径、
Git remotes、commit SHA、原始 endpoints，或原始 App Server 错误。transcript
响应只包含显式请求的 App Server item page 及其
不透明游标。

主机故障保持在各自主机结果内本地化。离线节点或不可用的
本地 App Server 不会从页面中抹去健康主机。连通性是
主机属性，而不是 thread 状态：失败的主机结果不包含新的
session 行，也不会将 `offline` 投射到原生 threads 上。

catalog 发现是被动的。列出或读取元数据时，绝不能调用
`thread/resume`，也不能让 OpenClaw 客户端订阅实时 thread 请求，或
返回审批。

搜索仅按标题，且大小写不敏感。对于每个返回的 catalog 页面，Gateway 和配对的 Mac 会扫描
有限数量的原生页面，而不会将查询传递给 App Server，因为原生搜索也可能匹配 transcript
预览。返回的原生游标允许调用方继续扫描。

## Operator CLI 边界

该插件注册了三个由 Gateway 支持的 shell 命令：

```text
openclaw codex sessions [--search <text>] [--host <id>] [--limit <count>] [--cursor <cursor>] [--json] [gateway-options]
openclaw codex continue <thread-id> [--json] [gateway-options]
openclaw codex archive <thread-id> --confirm-no-other-runner [--json] [gateway-options]
```

`[gateway-options]` 是 `--url <url>`、`--token <token>`、`--timeout <ms>`，以及继承而来的 `--expect-final` 开关。会话列表的默认超时时间为 75,000 ms；
continue 和 archive 的默认超时时间为 30,000 ms；
`--expect-final` 对这些一元 RPC 没有额外影响。会话搜索仅限标题，并且不区分大小写；每个响应都会扫描一个有上限的本地页链，`--cursor` 用于继续更早的结果。limit 默认每个 host 为 50，并接受 1 到 100，而 cursor 需要一个稳定的 `--host` 目标。没有任何命令接受归档/include-archived 选项。只有 `sessions` 可以针对配对的 hosts；`continue` 和 `archive` 始终发送 `hostId: "gateway:local"`，而 archive 需要显式的确认标志。

shell 命名空间并不是聊天内的 `/codex` 运行时命名空间。特别是，`/codex sessions --host <node>` 会列出某一节点上的 Codex CLI 会话文件，`/codex threads` 会列出当前会话连接对应的 App Server 线程，而 `/codex resume` 或 `/codex bind` 会修改该会话的绑定。这些命令不会替代 `sessions.catalog.continue`，并且不存在 `/codex continue` 或 `/codex archive` 运行时命令。

## 本地续接

对于已存储或处于空闲状态的 Gateway 本地行，UI 会调用
`sessions.catalog.continue`，并附带 `catalogId: "codex"` 以及主机和线程
ID。该插件：

1. 如果源本身已经有一个受监督的 Chat，则复用现有的受监督 Chat。
2. 否则，通过源的最后一个终端已持久化轮次（已完成、已中断或已失败），将受限的用户和助手历史投影到一个新的
   OpenClaw Chat 中，并记录一个待处理的 harness 分支。
3. 存储待处理的仅 Codex 模型锁定策略，而不是具体的模型或
   provider 选择，以及私有的监督连接作用域，并返回 OpenClaw 的 `sessionKey`。

历史投影会选取可见用户和助手消息中最新的尾部内容，硬性限制为总计最多 200 条消息、512 KiB 的 UTF-8 文本，以及每条消息 64 KiB。它会将图像和本地图像输入替换为
`[Image attachment]`，绝不会复制图像负载或路径，并省略推理、
工具调用和工具结果。

UI 会使用该 session key 导航到正常 Chat。此时还不存在规范的 harness
线程。在第一次正常 Chat 轮次中，harness 会安装真实的 Codex 审批、
引导、事件和交付处理器，然后：

1. 使用监督连接调用原生 `thread/fork`，不带模型
   或 provider 覆盖，并固定持久化的源快照。Codex 当前的
   `ConfigManager` 状态会选择模型和 provider，fork 响应
   会报告实际的配对。如果模型与源中记录的上一个模型不同，Codex 会发出其正常的模型差异警告。
2. 在同一连接上，以 `threadSource: "appServer"`、OpenClaw 的 cwd、策略、配置、环境、完整的 OpenClaw harness 工具面，以及恰好等于 fork 为这次初始启动返回的模型和 provider，
   启动规范的完整 Codex harness 线程。
3. 通过该连接注入受限的可见用户和助手历史，提交规范绑定而不丢弃其监督作用域，运行该轮次，并归档临时 fork。

在第一次轮次之前，Chat 是一个带可见历史镜像的锁定待处理分支；之后，每个模型轮次都会通过监督连接上的规范 Codex harness 线程运行。该分支并不是完整的原生 rollout 克隆：源推理、工具调用和工具结果都会被有意省略。如果快照固定或规范线程创建失败，待处理分支仍然可以重试。绑定竞争、监督被禁用，或监督连接不可用/不匹配，都会在轮次运行前失败并关闭，而不是回退到普通的 agent-home harness。

这保证了由 Codex 拥有的选择，而不是保留源的历史模型。fork 返回的配对会用于规范线程启动，Codex 会持久化该线程的原生模型和 provider。之后的恢复会省略 OpenClaw 的模型和 provider 覆盖，因此 Codex 会恢复持久化的配对。如果单独的原生 Codex 控制更改了规范线程，OpenClaw 会接受该原生持久化选择。外层 OpenClaw 模型和回退链永远不会取代它。

模型更改、会话删除以及会话重置/新建操作，对受监督的模型锁定 Chat 都会失败并关闭。会修改 `/codex model <model>`、`/codex
bind`、`/codex resume`（包括节点 `--bind here`），以及 `/codex detach` 或
`/codex unbind` 的操作，也都会失败并关闭，因为它们会替换或清除绑定。`/codex model` 查询以及 `/codex fast`、`/codex permissions` 和 `/codex
threads` 仍然可用。`codex_threads` 代理工具不能附加新的 fork 或归档已绑定的原生线程。列表和仅元数据读取仍可用；转录字段需要 `supervision.allowRawTranscripts`，而重命名、取消归档、分离的 fork，以及对无关线程的归档则需要 `supervision.allowWriteControls`。这两个选项都不能替换锁定的绑定。否则，删除或重置 OpenClaw 条目会丢弃原生绑定，并在看起来像 Codex 的会话后面创建或允许一个通用线程。因此，保留维护会保留模型锁定条目，即使它们超过了普通的年龄、数量或磁盘预算限制。禁用或卸载拥有该条目的插件也会保留锁定和插件所有权标记。Chat 会保持不可用并失败关闭，直到同一个插件重新启用；清理绝不会把它转换为普通的模型会话。

该操作绝不会恢复或修改源。临时 fork 会固定一个快照；它不是持久的续接线程。在第一次轮次中启动一个独立的规范 harness 线程，能防止 OpenClaw 因进程本地状态未能看到 Desktop 拥有的轮次，而仅仅因为这一点就变成一个竞争性的源写入者。可见历史镜像和已固定快照可能会遗漏尚未在活动源中完成的工作。原始 CLI 或 VS Code 源仍然可供原生和 OpenClaw 两种目录使用。规范分支仍然是监督存储中的一个原生 Codex 线程，但原生客户端可能会过滤其 `appServer` 源类型，因此 Codex Desktop 的可见性并不是一个契约。

## 归档行为

对于一个已存储或空闲的 Gateway-local 行，带有 `catalogId: "codex"` 的 `sessions.catalog.archive` 需要显式的 `confirmNoOtherRunner: true`，重新读取当前进程本地状态，仅在 `idle` 或 `notLoaded` 时继续，调用本地的 `thread/archive`，并且只有在 Codex 接受该操作后才返回成功。然后该行会离开非归档目录。

如果从最新读取中得到活动或错误状态，则拒绝归档。来源中的初始化中或待处理的受监督分支也会拒绝归档：第一次 Chat 回合必须先具现其规范分支，然后来源才能被归档。对于精确目标已知处于活动状态的 OpenClaw 绑定所有者，或任何非归档的已生成后代，也会拒绝归档。OpenClaw 会对 Codex 的实验性 `thread/list ancestorThreadId` 关系进行分页处理，并在请求或响应错误、游标或线程循环，以及安全限制耗尽时以失败关闭。原生归档可以关闭已加载的父级和后代工作，因此归档不是一种中断快捷方式。读取、后代枚举和归档调用并非原子操作。一个独立客户端仍然可以拥有或开始处理在本地看起来空闲或 `notLoaded` 的行。关于“无其他运行者”的确认涵盖未知客户端，以及在 Codex 提供条件归档或跨进程租约之前的那段竞态窗口。配对节点归档是被禁止的。

Codex 目录中没有已归档视图。通过另一个经所有者授权的 Codex 界面使用 `thread/unarchive` 还原的线程，将再次有资格进入非归档目录。

## 活跃线程安全性

Codex 会为同一 App Server 的客户端串行化某个线程的变更，但它
不会暴露跨进程的独占运行器或审批拥有者租约。
独立的 stdio App Server 可以向同一次 rollout 追加内容，而各自只会看到
自己在内存中的状态。审批请求也可能到达某一服务器的所有订阅者，
而第一个有效响应会完成该请求。

因此：

- 被动目录客户端不会订阅，也不会自动拒绝审批
- 当前报告为 active 的行既不显示新分支，也不显示 Archive
- 未映射的 source 会变成一个可见历史的分支，而其规范的 harness
  线程永远不会恢复该 source
- `notLoaded` 会显示为活动状态未知，并且只有在得到“没有其他运行器”的已知确认后才能归档
- 本地归档要求该确认以及一次新的 `idle` 或 `notLoaded`
  读取，同时需承认读取与归档之间存在协议竞态

中断和多客户端交接是未来的产品决策。它们并不意味着
显示一行 active。

## 配对节点边界

Node invoke 目前仅支持请求/响应。它可以安全地返回有界的目录元数据和 transcript turn pages，但无法承载 Codex harness 运行所需的长连接事件流、审批请求、工具调用、取消以及 assistant deltas。

因此，节点契约支持 list 和 transcript-turn pages。远程行仍然可读，但无论空闲状态如何，**Continue** 和 **Archive** 都不可用。真正的远程续接需要一个节点侧 runner 和 streaming bridge，以保持与本地 harness 相同的审批和绑定不变式。

## 权限

每台计算机都在本地选择加入。启用 Gateway 并不会授权另一台
节点读取其 Codex 元数据。节点能力必须通过正常的配对
和命令策略审批。

舰队列表和对话记录查看使用 `operator.write` Gateway 范围，
因为它们会调用已配对的节点。本地续接和归档是经过认证的操作员动作，
并且仍然受主机和状态检查约束。

自主代理和独立 MCP 访问是分开的。随附的
`codex_endpoint_probe`、`codex_sessions_list`、`codex_session_read`、
`codex_session_send` 和 `codex_session_interrupt` 工具契约仍归
`codex` 插件所有。启用监督后，原始 `codex_threads` 对话记录
读取和基于对话记录派生的列表字段还需要
`supervision.allowRawTranscripts`；每个 `codex_threads` 的分叉、重命名、归档或取消归档都需要
`supervision.allowWriteControls`。这两个策略默认都为
禁用。

## 兼容性

`openclaw doctor --fix` 会迁移已随附的 `plugins.entries.codex-supervisor`
配置，包括端点以及转录/写入策略，还会将插件的允许/拒绝引用
迁移到 `plugins.entries.codex.config.supervision`。显式的规范目标
值会在冲突中获胜。运行时代码在迁移后只会使用规范的 `codex` 插件
形态。

官方插件恰好保留五个 Supervisor 兼容工具：
`codex_endpoint_probe`、`codex_sessions_list`、`codex_session_read`、
`codex_session_send` 和 `codex_session_interrupt`。会话列表默认仅加载
已加载项；不存在 `loaded_only` 参数。`include_stored: true` 会添加
非归档的状态数据库行，并按每个端点由 `max_stored_sessions`
（默认 200，接受范围 1 到 1,000）进行限制；已加载行不受该设置
约束。基于转录派生的字段和读取仍受 `allowRawTranscripts` 约束；发送和中断
仍受 `allowWriteControls` 约束。

兼容性发送永远不会启动或恢复空闲线程。`mode: "start"` 总是被拒绝；
`"auto"` 和 `"steer"` 仅会引导一个可读的活动轮次。中断同样要求存在
活动的可读轮次。空闲续接会路由到原生 Codex 目录，因此完整的 harness
负责审批、工具和绑定。
独立的旧版 MCP 适配器会从官方插件解析这些相同的工具，并且是唯一
遵守保留的旧版策略环境变量的路径。

7 月的目录 UI、Gateway 方法、节点能力和 CLI 注册在旧插件 id 下都尚未
发布。它们会直接归属于 `codex`，而不会再增加第二层运行时外观。

## 未来工作

- 用于远程续接的节点侧流式运行器和事件桥
- 为同时进行客户端交接提供显式的运行器和审批所有者租约
- 在存在运行器所有权租约或等效防护机制后进行远程归档
- 中断功能以及更丰富的活动会话观察
- 在 Codex Desktop、CLI 和 OpenClaw 之间进行可审计的交接

归档浏览不属于计划中的监督侧边栏。原生 Codex
界面仍然是归档线程的恢复路径。

## 验收测试

- 启用监督后会列出未归档的本地会话。
- 已归档会话绝不会出现在目录响应或 UI 中。
- 当另一台主机故障时，健康主机仍保持可见；不可用主机返回的是没有新鲜行，而不是捏造离线会话状态。
- 已存储或空闲的本地行会创建一个 Chat 镜像，带有仅 Codex 的模型/运行时锁；第一次轮次会固定一个临时快照并启动规范的完整 harness 线程，重复执行 Continue 会打开现有 Chat。
- 第一次轮次在快照分支上省略 model/provider 覆盖，并将规范起点固定为 Codex 返回的精确配对，即使 Codex 警告其当前模型与源的上次记录模型不同也是如此。
- 待处理和已提交的受监督绑定使用监督连接来访问源、创建规范分支以及之后的每一轮；普通 Codex 会话仍然是 agent 作用域。
- 后续恢复会省略 OpenClaw 的 model/provider 覆盖，保留 Codex 的规范持久化选择，接受对该线程的单独原生更改，并且绝不替换外层 OpenClaw 模型或回退链。
- 关闭监督或丢失绑定/连接生命周期会以 fail closed 方式失败，而不是把 Chat 切换到普通的 agent-home harness。
- 受监督且模型锁定的 Chat 在保护原生绑定时无法删除。
- Chat 最多镜像 200 条用户和助手消息，总计 512 KiB，每条消息 64 KiB。图片会变成占位符；源推理、工具调用、工具结果、图片负载和本地路径都不会被克隆。
- 分支流程绝不会恢复源线程。
- 原始源对两个目录都仍然符合条件。规范的原生分支使用 `appServer` 源类型，并不保证会出现在 Codex Desktop 中。
- 活跃的本地源不能创建分支或被归档；已有的受监督 Chat 仍然可以打开。
- 活动状态未知的行可以 बिना确认地分支；归档则需要明确的“没有其他运行者”确认。
- 一个处于初始化中或待处理的受监督分支的源，在第一次 Chat 轮次将规范分支具体化之前不能被归档。
- 对于精确目标或任何未归档的派生后代，已知的活跃绑定所有者会阻止归档；后代枚举失败按 fail closed 处理，而明确确认仍然负责处理未知客户端以及状态到归档之间的竞态。
- 经确认的已存储或空闲本地归档会在原生成功后移除该行。
- 成对节点行在没有 Continue 或 Archive 的情况下仍保持可见。
- 被动列举绝不会订阅或响应线程审批。
- 旧版 Supervisor 配置会迁移为规范的 Codex 配置形状。
- 旧版列表默认仅加载，已存储枚举遵循其各自端点的上限，而兼容性发送绝不会启动或恢复一个空闲线程。
