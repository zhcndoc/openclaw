---
summary: "浏览 OpenClaw 节点上的未归档本地 Codex 会话和分页转录"
title: "监督 Codex 会话"
sidebarTitle: "Codex 监督"
read_when:
  - 你希望 Codex Desktop 或 CLI 会话出现在 OpenClaw 中
  - 你需要从本地存储的或空闲的 Codex 会话分支或归档
  - 你正在从已配对节点公开 Codex 会话和转录历史
---

Codex 监督是官方 `codex` 插件的一项可选功能。它会在正常的会话侧边栏和 Chat 面板中，显示来自 Gateway 计算机以及已选择加入的已配对计算机的未归档 Codex Desktop 和 CLI 源会话。

初始版本刻意将所有权范围保持得很窄：

- 本地存储的或空闲的会话可以基于其受限持久化的用户和助手历史，创建一个模型锁定的 OpenClaw Chat。第一条消息会启动一个原生快照分支，然后以 Codex App Server 为该分支选择的完全相同的模型和提供方，启动完整的 Codex harness 线程。之后的轮次会恢复规范的原生线程中持久化的配对内容，而受监督绑定会阻止 OpenClaw 替换为其他运行时、模型或回退方案。单独的原生 Codex 控件仍然可以更改该持久化配对。已创建的分支会打开其现有的 Chat。
- 从另一个 Codex 进程发现的存储会话，其实时活动状态未知。它可以分支，或者只能在操作员确认没有其他 Codex 客户端正在使用它之后才能归档。
- 活动中的源会保持可见，但在当前轮次完成之前不能创建分支或归档。如果它已经有一个受监督的 Chat，**Open Chat** 仍然可用。
- 配对节点上的会话会通过受限的、游标分页的 App Server 读取暴露其持久化转录。远程续接需要未来的流式节点桥接；远程归档还需要 runner 所有权租约或等效的围栏机制。
- 已归档的会话不会列出。本地存储的或空闲的会话只有在操作员确认没有其他 Codex 客户端正在使用它之后，才能归档。

## 开始之前

- 在 Gateway 上安装官方 `@openclaw/codex` 插件。启用 Codex 功能时，OpenClaw
  macOS 应用可以自动安装它；CLI 安装可以运行 `openclaw plugins install @openclaw/codex`。
- 在你想要列出会话的每台计算机上安装并登录 Codex Desktop 或 Codex CLI。
- 将远程计算机配对为 OpenClaw 节点。每台计算机都必须在本地明确同意；仅在 Gateway 上启用监督并不会授权另一台节点。
- 使用由所有者控制的 Gateway。会话标题、工作目录和 Git
  分支可能会泄露敏感项目信息。

## 启用监督

Guided `openclaw onboard` 和 macOS 首次运行设置在检测到原生 Codex 安装并成功激活所选推理后端后，会尝试安装并启用 Codex 监督。Codex 不需要是主后端。当这种机会式插件激活成功时，监督即可使用。首次连接监督时会检查 App Server 的可用性。显式禁用 Codex 插件或策略阻止会阻止机会式激活，而现有的显式 `supervision.enabled: false` 会禁用面向代理的监督工具；只要 Codex 插件处于活动状态，且未通过 `sessionCatalog.enabled: false` 禁用它，操作员目录就会保持注册状态。这个单独的开关会保持 Codex provider、harness 和面向代理的监督策略不变，同时还会从此主机移除配对节点目录的列表/读取命令。

现有安装可以手动启用相同能力：

在 `openclaw.json` 中启用 `codex` 插件及其监督能力：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          supervision: {
            enabled: true,
          },
        },
      },
    },
  },
}
```

如果存在 `plugins.allow`，请将 `codex` 包含在内。更改插件激活后重启 Gateway。

在没有显式 `appServer` 连接设置的情况下，监督会使用一个单独的、受管理的 stdio 监督连接，指向本地用户 Codex home。普通 Codex harness 默认仍然是 agent 作用域。这使得本地会话在两个应用中都可见，而不会让普通 OpenClaw 回合共享本地 Codex 状态。如果 harness 也应该共享该状态，请显式设置 `appServer.homeScope: "user"`。监督会遵循显式的 `appServer` 连接设置，而不是用其本地用户 home 默认值替换它们。

A Chat adopted from the **Codex** sidebar group 不是普通的 harness 会话。其私有监督绑定使用监督连接进行源读取、规范分支创建、历史注入以及之后的每个回合。对于默认的本地连接，这会在不改变其他会话默认值的情况下，保留原生用户 Codex home、认证和 provider 配置。被监视的已接管 Chats 也会参与 [session state awareness](/concepts/session-state)。

对于默认的本地监督连接，存储与本地 Codex 客户端共享。OpenClaw 不会假定另一个客户端共享相同的实时 App Server 进程，而且本地状态所有权是进程局部的。因此，它会把其监督 App Server 报告为 `notLoaded` 的线程视为 **已存储 / 活动状态未知**，而不是空闲。

在每台应显示这些会话的无头节点主机上应用相同的按需启用。原生 OpenClaw macOS 应用在向配对的 Gateway 公布其 Codex 目录时，会读取相同的本地设置。该配对的原生 Mac 目录仅支持默认或显式的 `appServer.transport: "stdio"`，并且 `appServer.homeScope` 为空或显式为 `user`。`command`、`args` 和 `clearEnv` 会被该 stdio 进程尊重。如果 Mac 配置选择 `"unix"`、`"websocket"` 或 `homeScope: "agent"`，应用不会公布目录能力或命令，而是会使过期的直接调用失败，从而不会暴露用户 Codex home 或启动另一个本地 stdio App Server。

新公布的节点命令会更改该节点已批准的命令范围。请在 Gateway 主机上批准该更新：

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
```

未归档的 Codex 会话也会出现在主 Control UI 侧边栏中，并按主机分组。选择其中一个即可读取其持久化转录。查看器使用最新的 Codex `thread/turns/list` API，带有 `itemsView: "full"`，并且每次请求最多加载 20 个回合；**加载更早的转录项** 会跟随来自最新页面的透明 App Server 游标。已加载页面按时间顺序渲染。查看器从不加载无限的 `thread/read` 历史。超过 20 MiB 传输安全上限的页面会失败关闭，而不是冒着节点或 Gateway 连接风险。

在正常会话侧边栏中打开 **Codex** 组。它按主机列出相同的会话。**加载更多会话** 会为每个仍有更旧行的主机追加下一页，而这些追加的行会在侧边栏的周期性刷新中保留。每个返回的搜索页都会为每个主机扫描有限数量的本地页面，而不是将查询发送到 App Server，因为本地搜索也可能匹配转录预览。

主机可用性与线程状态是分开的。**Offline** 或 **Unavailable** 描述的是主机刷新；不可用主机不会返回新的会话行，也不会把线程的本地状态更改为 `offline`。会话行使用 Codex 状态，例如 `idle`、`active`、`notLoaded` 或 error。失败的主机不会隐藏健康主机的结果。

侧边栏警告包含目录错误代码和安全的底层 Gateway 错误。打开 **Settings > Automation > Plugins > Codex > Native Session Discovery** 可在不禁用 Codex 的情况下关闭发现功能。对于 `NODE_LIST_FAILED`，请对比 `openclaw nodes list` 和 **Settings > Devices**；详细原因会标识需要修复的配对存储、节点注册表、权限或 Gateway 生命周期故障。

## 使用 operator CLI

终端 CLI 提供相同的非归档目录和 Gateway 本地分支
以及归档操作：

```bash
openclaw codex sessions [--search <text>] [--host <id>] [--limit <count>] [--cursor <cursor>] [--json] [--url <url>] [--token <token>] [--timeout <ms>] [--expect-final]
openclaw codex continue <thread-id> [--json] [--url <url>] [--token <token>] [--timeout <ms>] [--expect-final]
openclaw codex archive <thread-id> --confirm-no-other-runner [--json] [--url <url>] [--token <token>] [--timeout <ms>] [--expect-final]
```

`openclaw codex sessions` 选项：

- `--search <text>` 不区分大小写地搜索会话标题。
- `--host <id>` 将响应限制为一个稳定的目录主机，例如
  `gateway:local` 或 `node:<node-id>`。
- `--limit <count>` 设置每个主机 1 到 100 行；默认值为 50。
- `--cursor <cursor>` 继续某一主机页面，因此需要 `--host`。
- `--json` 打印结构化的 Gateway 响应。

这三个命令都继承来自
Gateway 客户端的 `--url`、`--token` 和 `--timeout <ms>`。会话列表默认值为 75,000 ms，因此冷启动的配对节点目录也可以完成；continue 和 archive 的默认值为 30,000 ms。它们还公开共享的
`--expect-final` 开关，但这不会改变这些单参数监督 RPC。
每个命令都需要 `operator.write` Gateway 范围。
每个子命令都可使用标准的 `-h, --help` 输出。
没有归档或包含归档选项。`sessions` 可以列出配对
主机，但 `continue` 和 `archive` 始终针对 `gateway:local`；配对行
仅用于列表。archive 始终需要 `--confirm-no-other-runner`。

这些 shell 命令不同于聊天内的 `/codex` 运行时命令。
`/codex threads [filter]` 列出当前
会话连接可用的 App Server 线程。`/codex sessions --host <node>` 列出单个节点上可恢复的 Codex
CLI 会话文件，而不是监督集群目录。`/codex
resume` 和 `/codex bind` 附加到当前会话，而不是创建一个
安全的受监督分支，而受模型锁定的监督 Chat 会拒绝这些
绑定变更。不存在 `/codex continue` 或 `/codex archive` 运行时
命令。

## 从本地会话分支

在 Gateway 计算机上的已存储或空闲行中选择 **Continue as branch**。  
OpenClaw 会创建一个普通的 Chat 条目，将有边界的用户和助手历史镜像到  
源的最后一个已持久化的终局轮次（已完成、已中断或  
已失败），记录一个待处理的 harness 分支，并打开 Chat。通用模型  
选择器被锁定，但尚未选择任何具体模型或提供方。  
源不会被恢复，规范的 harness 线程也尚未启动。

重复执行该操作会打开现有的 Chat，而不是创建另一个  
分支。

镜像会保留满足全部三个限制的最新可见尾部：最多 200 条  
用户或助手消息，总 UTF-8 文本不超过 512 KiB，且每条消息不超过 64 KiB。  
过大的消息会带上标记进行截断，而当达到上限时，更早的消息  
会被省略。图像或本地图像输入会变成字面量的  
`[Image attachment]` 占位符；图像数据和本地路径不会被复制。

发送第一条普通 Chat 消息以开始工作。Codex harness 会安装  
真正的审批、引导、事件和传递处理程序。它在监督连接上使用一个临时的  
原生 fork 来固定源快照，而不提供模型或提供方覆盖。Codex App Server  
从其当前原生配置中选择二者并返回实际选择。在同一  
连接上，OpenClaw 以恰好该返回的组合，在其 cwd 和运行时策略下启动规范的  
`appServer`-source 完整 harness 线程，注入有边界的可见历史，  
并归档临时 fork。规范线程拥有完整的 OpenClaw harness 工具集。  
这是一个可见历史分支，不是完整的原生 rollout 克隆：源推理、  
工具调用和工具结果都会被省略。此后以及每一轮后续交互都保持在受监督的 Codex 连接上，  
而不是另一个 OpenClaw 模型运行时或普通的 agent-home harness。

返回的选择并不能证明源的历史模型。如果当前原生配置与  
源最后一轮所记录的模型不同，Codex 会发出其正常的  
模型差异警告。OpenClaw 使用返回的组合来启动规范线程。  
Codex 会持久化该规范线程的原生模型和提供方，并且后续恢复会保留它们，因为  
OpenClaw 省略了模型和提供方覆盖。如果规范线程通过另一个原生 Codex 控制被更改，  
OpenClaw 会接受 Codex 持久化的选择。OpenClaw 绝不会替换其外层模型或回退链。

受监督且模型锁定的 Chat 不能删除、切换模型、使用 `/new`  
或 `/reset`、调用 Gateway 会话重置操作，或使用通用的  
**Fork session** 操作。变更性的 `/codex model <model>`、`/codex  
bind`、`/codex resume`（包括带有 `--bind here` 的节点会话），以及  
`/codex detach` 或 `/codex unbind` 也会被拒绝，因为它们会替换  
或清除锁定的原生绑定。`/codex model` 查询以及 `/codex fast`、`/codex permissions` 和 `/codex threads` 仍然可用。  
当你需要不同的模型或全新的线程时，请启动另一个普通会话。

请为此 Chat 保持监督启用。如果监督被禁用，或者其  
存储的连接绑定变得不可用或不一致，该轮次会以关闭失败的方式结束，  
而不是切换到普通的 agent-home 会话。

禁用或卸载 `codex` 插件不会释放该所有权，也不会  
使该 Chat 具备分配给其他模型的资格。锁定的 Chat 仍会被保留，但  
不可用；请重新安装或重新启用同一插件并重启 Gateway 以恢复它。  
这种刻意的关闭失败行为可防止保留清理或临时插件故障  
在不知不觉中使原生绑定成为孤儿。

`codex_threads` agent 工具遵循相同的边界。它不能附加  
不同的 fork 或归档 Chat 绑定的原生线程。列表和仅元数据读取仍然可用。原始转录读取需要 `allowRawTranscripts`。  
当原始访问被禁用时，`codex_threads` 也会拒绝列表搜索，因为  
原生搜索包含转录预览；Control UI 和操作员 CLI  
仍然提供有边界的仅标题搜索。重命名、取消归档、分离 fork，以及  
对无关且不受拥有的线程进行归档都需要  
`allowWriteControls`。这两个选项都不能绕过锁定的绑定。

OpenClaw 在仅列出源线程或显示待处理的 Chat 时，不会订阅  
或响应审批请求。在第一轮开始一个独立的规范 harness 线程，  
让另一个 Codex 进程继续拥有源，而不会创建竞争性的 rollout 写入者。

原始 CLI 或 VS Code 源对原生客户端和 OpenClaw 目录仍然可见。  
规范分支以原生 Codex 线程的形式存储，但其源类型为 `appServer`；Codex Desktop  
或其他原生客户端可能会过滤该源类型，因此该分支本身  
并不能保证出现在每个原生历史视图中。

OpenClaw 的 App Server 报告的活动行不能启动新分支。请等待  
当前轮次结束并刷新目录。Codex App Server 会  
在单个进程内串行化变更，但它不提供跨进程的独占运行器或审批拥有者租约。

对于 **Stored / activity unknown** 行，Chat 镜像和首轮快照  
固定使用 Codex 在最后一个终局已持久化轮次时的状态。  
源线程不会被恢复、中断或归档。如果另一个进程中有一个进行中的轮次，  
其最新的进行中工作可能不会出现在该分支中。

## 归档本地会话

在已存储或空闲的 Gateway-local 行上选择 **归档**，然后确认没有其他 Codex 客户端或 OpenClaw 运行程序正在使用该线程或其生成的后代。OpenClaw 会重新读取进程本地状态，仅在 `idle` 或 `notLoaded` 时继续，调用原生 Codex 归档操作，并将该会话从未归档列表中移除。原生 Codex 也会尝试归档该线程生成的后代。

当最新读取结果报告会话处于活动状态或错误状态时、当它属于配对节点时，或者当一个新创建的受监督 Chat 仍然有来自该源的待处理分支时，都无法归档。在归档源之前，先发送 Chat 的第一条消息以生成其规范分支。如果 OpenClaw 已知某个活动绑定拥有精确的目标线程或任何未归档的已生成后代，归档也会被阻止。OpenClaw 会逐页跟随实验性的 Codex 后代查询；无效响应、请求失败、重复的游标或线程，或者安全限制耗尽，都会拒绝归档。

读取、后代枚举和归档请求并不是一个条件性操作，因此在这些步骤之间仍可能启动一个回合。App Server 状态在独立进程之间也不共享。因此，确认是未知客户端以及这种竞态的安全边界：在确认之前，请退出或以其他方式验证所有其他客户端。使用 Codex Desktop、Codex CLI，或经所有者授权的原生线程管理流程恢复已归档的线程；取消归档后它会重新出现。

```bash
codex unarchive <thread-id>
```

## 了解配对节点限制

配对节点公开了带版本号的只读
`codex.appServer.threads.list.v1` 和
`codex.appServer.thread.turns.list.v1` 命令。安装了 Codex CLI 的原生节点主机还公开了允许列表中的
`codex.terminal.resume.v1`
命令。Gateway 接收规范化的
元数据以及显式请求的有界转录分页，而不会接收原始的 App Server
端点。在操作员终端中打开某一行会在所属主机上运行 `codex resume <thread-id>`
，并转发该命令的 PTY；它不会暴露通用的
shell，也不会暴露由 gateway 提供的 argv。

终端转发不提供 harness 续接或归档所有权
契约。因此，远程行仍然可见，但不会提供 **继续** 或 **归档**，即使远程线程处于空闲状态也是如此。请通过 **在终端中打开** 在该计算机上使用 Codex，或者在未来使用具有安全 runner 所有权边界的续接流程。

## 元数据和权限

Catalog 行可能包括：

- 线程和会话标识符
- 标题和工作目录
- 当前状态和活动等待标志
- 创建、更新和活动时间戳
- 来源、模型提供方、Codex CLI 版本和 Git 分支

Catalog 投影不包括转录预览、轮次、rollout 路径、
Codex 主目录路径、Git 远程、提交 SHA 和原始 App Server 错误。Catalog
访问和 Control UI 转录读取需要 `operator.write` Gateway
scope，因为 fleet 聚合使用标准的 `node.invoke` 路径，尽管这两个节点命令都是只读的。

`supervision.allowRawTranscripts` 和 `supervision.allowWriteControls` 分别管理
自主代理和独立 MCP 工具。两者默认都为 `false`。启用 supervision 后，
除非允许原始转录，`codex_threads` 会在 list 和仅元数据读取结果中移除转录预览和轮次；包含轮次的读取会关闭失败。每次 fork、重命名、归档和取消归档
都需要写入控制。这些选项不会为经过身份验证的 Control UI 转录查看提供门控，也不会绕过绑定、主机、状态或确认检查。

### 兼容性工具

官方 `codex` 插件为现有代理和独立 MCP 客户端保留了五个已发布的 Supervisor 工具名称：

- `codex_endpoint_probe`
- `codex_sessions_list`
- `codex_session_read`
- `codex_session_send`
- `codex_session_interrupt`

`codex_sessions_list` 默认仅加载；没有 `loaded_only`
参数。设置 `include_stored: true` 还可从
Codex 的状态数据库中读取未归档的已存储行。可选的 `max_stored_sessions` 上限默认值为 200，
每个 endpoint 接受 1 到 1,000 行。它不会限制已加载行。
如果没有原始转录权限，列表结果会省略来自转录的名称、
预览和详细的 endpoint 错误。
`codex_session_read` 需要 `allowRawTranscripts`；`include_turns: true`
会额外请求 Codex 返回轮次。

`codex_session_send` 和 `codex_session_interrupt` 需要
`allowWriteControls`。Send 接受 `mode: "auto" | "start" | "steer"`，但
`"start"` 总是会被拒绝，而 `"auto"` 和 `"steer"` 只能引导一个
可读的活动轮次。空闲线程会被拒绝，并提示使用 **Codex Sessions**，在那里完整的 harness 会在继续之前安装审批和工具处理器。Interrupt 同样需要一个活动的可读轮次。这些工具不会恢复或启动空闲源线程。

`openclaw doctor --fix` 会将已退役的 `codex-supervisor` 条目、其 endpoint
和权限字段，以及插件允许/拒绝策略引用移动到官方的
`codex` 插件中，而不会覆盖明确的规范设置。独立的兼容性 MCP 适配器
仍会从该插件加载相同的五个工具；旧版策略环境变量仅在该受信任的适配器内部生效。

有关每个 supervision 配置字段，请参见
[Codex harness 参考](/plugins/codex-harness-reference#supervision)。

## 故障排除

**没有出现任何会话：** 请确认已安装 `@openclaw/codex`，插件和 `supervision.enabled` 都为 true，当前插件允许列表允许 `codex`，并且这些会话没有被归档。更改激活设置后，请重启 Gateway 或节点。

**Continue 被禁用：** 存在一个未映射的行处于活动状态，或其属于配对节点，或其主机离线，或另一个操作正在等待中。Gateway 本地存储且空闲的行会提供 **Continue as branch**，而不是不安全的精确线程接管。已经有受监督 Chat 的行会提供 **Open Chat**。

**Archive 被禁用：** 在得到“没有其他运行器”的确认后，归档可用于已存储/活动状态未知以及空闲的 Gateway 本地行。活动、错误、离线、配对节点、待分支以及已知精确绑定所有者的行仍然是只读，不能归档。

**已归档的会话消失了：** 这是预期行为。监督页面没有已归档视图。运行 `codex unarchive <thread-id>`，或使用 Codex Desktop 重新显示它。

**旧的 `codex-supervisor` 配置仍然存在：** 运行 `openclaw doctor --fix`。Doctor 会将已弃用的插件条目和相关的插件策略引用移动到 `plugins.entries.codex.config.supervision`，且不会覆盖显式的 Codex 设置。

## 相关内容

- [Codex harness](/plugins/codex-harness)
- [Codex harness 参考](/plugins/codex-harness-reference)
- [Codex harness 运行时](/plugins/codex-harness-runtime)
- [Codex 监督架构](/specs/codex-supervision)
- [节点](/nodes)
- [网关安全](/gateway/security)
