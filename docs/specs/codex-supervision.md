---
title: "Codex 监督"
summary: "用于监督 OpenClaw 的本机 Codex 会话的架构和产品边界。"
read_when:
  - "设计 Codex 会话发现、续接或归档行为"
  - "更改本机会话目录 UI 或网关 RPC"
  - "将 Codex 监督扩展到配对节点"
---

# <a id="codex-supervision"></a> Codex 监督

## <a id="goal"></a> 目标

Codex 监督允许 OpenClaw 操作员发现本机 Codex 会话、创建网关本地分支或通过正常的 OpenClaw 聊天界面继续合格的配对节点线程。 Codex 应用服务器仍然是线程和模型循环所有者。 OpenClaw 提供车队目录、经过身份验证的运营商 UI、会话绑定和通道交付。

该功能属于官方 `codex` 插件。不存在单独的 Supervisor 插件或第二套 Codex 协议实现。

本规范使用以下阶段名称：

- **网关本地分支**：OpenClaw 从存储或空闲的本地 Codex 源创建的新受监督聊天，而不是恢复该源线程。
- **待定harness分支**：当投影有界历史但尚不存在主要本机Codex线程时，在其第一轮之前的分支。
- **聊天镜像**（可见历史镜像）：投影到聊天中的可见用户和助理消息的有界副本。
- **可见历史分支**：未映射的网关本地源，仅携带镜像历史记录，因此其主要本机harness线程永远不会恢复源。
- **Primary 本机应用程序服务器源分支**：插件在固定源快照后使用 `threadSource: "appServer"` 创建的本机 Codex 线程。
- **Primary 完整原生 Codex harness线程**：与 OpenClaw 的完整harness工具表面一起运行后的主要原生线程；以后的每个模型都在其上运行。
- **受监督模型锁定聊天**：OpenClaw聊天绑定到Codex-only模型和运行时锁定下的受监督线程。

## <a id="product-boundary"></a> 产品边界

只要 Codex 插件处于活动状态，目录就会注册，除非通过以下方式显式禁用原生会话发现：

```text
plugins.entries.codex.config.sessionCatalog.enabled = false
```

通过以下方式启用面向代理的监督工具：

```text
plugins.entries.codex.config.supervision.enabled = true
```

目前产品支持：

- 仅列出未归档的 Codex 线程。
- 按稳定的主机身份分组本地行和已选择加入的 paired-node 行。
- 从已存储或空闲的 Gateway-local 线程创建一个普通的、模型锁定的 Chat 分支，在首次轮次启动其完整的 Codex harness 线程，或者打开为先前分支创建的 Chat。
- 当节点的目录和 CLI-resume 命令被通告和调用并且调用者具有 `operator.admin` 时，通过模型锁定聊天继续存储或空闲的配对节点线程。稍后的消息将恢复其节点上的确切本机线程，而不是创建下面描述的网关本地分支。
- 只有在明确确认没有其他运行器后，才归档已存储或空闲的 Gateway-local 线程。
- 在仍然允许现有的受监督 Chat 打开的同时，显示活动本地源，但不提供新分支或归档控制。
- 在主侧边栏中显示每个主机最新的行，在 sessions 页面保留完整目录，并为本地和 paired-node 行提供有界的、基于游标分页的转录读取。
- 按主机隔离目录故障。

目录是未归档的集合。其中的某一行仍然可以具有空闲、活动、`notLoaded` 或错误的轮次状态。

面向代理的监督功能仍然是可选启用的。引导式上手会在本地 Codex 安装检测成功，并且所选推理后端通过其实时检查后，尝试安装并启用它，而不受用户选择的主要后端影响。只有当这种机会式插件设置成功时，监督才会激活。显式禁用的插件、策略阻止，或 `supervision.enabled: false` 仍然是监督工具的权威设置，但不会禁用操作者会话目录。`sessionCatalog.enabled: false` 会禁用操作者发现和 paired-node 目录命令；Codex 提供方和 harness 仍然保持活动。

## <a id="ownership"></a> 所有权

`codex` 插件拥有所有 Codex App Server 行为：

- 端点发现和连接生命周期
- 协议初始化和版本检查
- 线程列表、读取、恢复、归档以及事件处理
- 审批和用户输入桥接
- 到 OpenClaw 会话的原生线程绑定
- Codex-仅模型和harness在延续后强制执行

Control UI 和 Gateway 使用该插件拥有的服务。它们不会直接读取 Codex rollout 文件，也不会实现另一个 App Server 客户端。

默认的本地拓扑是：

```text
Codex Desktop -> private stdio App Server -> user Codex home
                                             ^
OpenClaw Codex plugin -> supervision App Server connection
  (defaults to managed user-home stdio; explicit appServer settings are honored)
  -> passive source catalog and read
  -> snapshot pin -> primary native appServer-source branch
  -> visible-history injection and every later supervised Chat turn

Ordinary OpenClaw Codex sessions -> managed agent-home stdio by default
  -> ordinary full harness threads -> OpenClaw Chat and channel delivery
```

启用监督不会更改普通的 Codex 工具：默认情况下它仍处于代理范围内。单独的监督连接默认为托管用户主目录 stdio，因此其目录和快照操作会看到本机存储的线程。遵循显式 `appServer` 连接设置。当 `homeScope` 未设置时，监控连接将其解析为 `"user"`（对于 stdio 或 Unix）和 `"agent"`（对于 WebSocket）。仅当普通harness也应共享本机 Codex 主目录时，才显式设置 `appServer.homeScope: "user"`。从 Codex 侧边栏组采用的网关本地聊天是一个例外：其私有监督绑定保留源读取、主要本机分支创建，然后打开监督连接。实时状态和所有权仍然是进程本地的； OpenClaw 的监督进程未知的线程是 `notLoaded`，即使 Codex Desktop 正在主动运行它。

目录读取和固定源租约明确选择本机身份验证。他们不会导入或替换 OpenClaw 的身份验证存储或选定的 Codex 主目录中的凭据。这也适用于配置了代理主目录范围的主目录源：其物理主目录和连接指纹保持不变。普通托管推理会保留其代理身份验证预检。

Codex 有一个实验性本地守护进程，带有单独的安装程序管理的引导合同。此功能不得隐式引导、声明或假设该守护进程。

## <a id="catalog-flow"></a> Catalog 流

通用 Gateway 方法 `sessions.catalog.list` 会分发到 `codex` catalog provider，它始终请求 `archived: false`，并让 App Server 应用其交互源默认值：`cli`、`vscode`、Atlas 和 ChatGPT。它组合：

1. 来自监督 App Server 的 Gateway 本地 `thread/list` 结果， 其默认使用受管的 user-home stdio。
2. 来自每个已连接且已选择加入的节点的 `codex.appServer.threads.list.v1` 结果。

转录本选择在本地使用 `thread/turns/list` 和 `itemsView: "full"` 或在所选节点上使用版本化的 `codex.appServer.thread.turns.list.v1` 命令。每个响应最多包含 20 个持久回合以及不透明的 forward/backward 游标。 Control UI 请求最新的第一页，按时间顺序呈现每个页面，并在前面添加较旧的页面。它永远不会回落到无界 `thread/read`。 OpenClaw 还会拒绝任何高于 20 MiB 的序列化项目页面，然后才能穿过节点或网关传输。

本机 macOS 配对节点实现仅支持 unset/default 或具有 unset/default 监督范围的显式 `appServer.transport: "stdio"` 或显式 `appServer.homeScope: "user"`。它将配置的 `command`、`args` 和规范化的 `clearEnv` 携带到子进程中。对于 `"unix"`、`"websocket"` 或显式 `homeScope: "agent"`，它既不通告目录功能也不通告命令；直接调用也会被拒绝。它绝不能将用户 Codex home 暴露给代理范围的配置，或者用本地 stdio 代替显式端点。

无头节点目录默认为节点的本机 `CODEX_HOME` 或 `~/.codex`，与网关的路由代理和节点的代理名册无关。本机读取器保留配置的命令、参数和清除的环境变量。目录读取和本机终端恢复使用与节点现有 CLI 会话列表和继续命令相同的主目录。

网关仍然为已发布的节点发送其可选代理 ID：v2026.9.4 将其用作相同命令名称下的严格本地源选择器。更新后的本机读者仅将该字段验证为惰性路由上下文。显式代理范围和非 stdio 源配置保留其已提供的本地所有者选择，包括拒绝丢失或删除的所有者。两条路径都默默地替代了不同的来源。仅通过版本化的节点源合同和这些配置的读取器的升级过渡来取消此兼容性。

目录投影标准化标识符、标题、cwd、状态、活动等待标志、时间戳、源、模型提供程序、Codex 版本和 Git 分支。它不返回脚本预览、轮次、推出路径、Codex 主路径、Git 远程、提交 SHA、原始端点或原始应用程序服务器错误。脚本响应仅包含明确请求的应用程序服务器项目页面及其不透明光标。

主机故障保持在各自主机结果内本地化。离线节点或不可用的本地 App Server 不会从页面中抹去健康主机。连通性是主机属性，而不是 thread 状态：失败的主机结果不包含新的 session 行，也不会将 `offline` 投射到原生 threads 上。

空目录不会创建侧边栏部分，即使它有错误或继续光标也是如此。当健康的游标主机在当前所有者筛选器下没有可见行时，现有数据所有者在刷新之间将每个目录前进一页。接受的页面保留其光标和页面深度进度；后面的遍继续搜索，而不是在同一首页重新开始。发现在隐藏时暂停，并因错误或光标循环而停止前进。当另一台主机发生故障时，包含可见会话的目录仍然存在。

Control UI 会请求渐进式 catalog 更新。每个本地或配对主机会在其自身的 App Server 列表稳定后出现；聚合响应仍然是兼容性和恢复快照。可见页面会在连接性变化后、聚焦时， 以及最多每 30 秒重新协调一次，并在变化后更快地进行一次刷新。 因此，在另一个客户端中创建的原生 Codex 会话会最终被发现， 而不会将它们导入 OpenClaw 存储。

Catalog 发现是被动的。列出或读取元数据时，不能调用 `thread/resume`，不能将 OpenClaw 客户端订阅到实时 thread 请求， 也不能返回审批。

搜索仅按标题，且大小写不敏感。对于每个返回的 catalog 页面，Gateway 和配对的 Mac 会扫描有限数量的原生页面，而不会将查询传递给 App Server，因为原生搜索也可能匹配 transcript 预览。返回的原生游标允许调用方继续扫描。

## <a id="operator-cli-boundary"></a> Operator CLI 边界

该插件注册了三个由 Gateway 支持的 shell 命令：

```text
openclaw codex sessions [--agent <id>] [--search <text>] [--host <id>] [--limit <count>] [--cursor <cursor>] [--json] [gateway-options]
openclaw codex continue <thread-id> [--agent <id>] [--host <id>] [--json] [gateway-options]
openclaw codex archive <thread-id> --confirm-no-other-runner [--agent <id>] [--host <id>] [--json] [gateway-options]
```

`[gateway-options]` 是 `--url <url>`、`--token <token>`、`--timeout <ms>` 以及继承的 `--expect-final` 开关。会话列表默认为 75,000 毫秒；继续并存档默认为 30,000 毫秒； `--expect-final` 对于这些一元 RPC 没有额外的影响。会话搜索仅包含标题且不区分大小写；每个响应都会扫描有界的本机页面链，并且 `--cursor` 会继续较旧的结果。该限制默认为每台主机 50 个，并接受 1 到 100 个，游标需要一个稳定的 `--host` 目标。没有命令接受 archived/include-archived 选项。所有三个命令均接受 `--agent <id>` 和 `--host <id>`。 `continue`和`archive`默认为`gateway:local`；列出的不透明本地主机 ID 选择另一个本地存储。 shell 命令仅请求 `operator.write`，因此将节点主机传递给 `continue` 本身并不能满足配对节点提供者的 `operator.admin` 要求。除非网关单独将该范围授予经过身份验证的身份，否则它将被拒绝。推荐的配对节点延续表面是管理员授权的 Control UI 路径，如下所述。存档仍然是网关本地的，并且需要显式确认标志。

shell 命名空间并不是聊天内的 `/codex` 运行时命名空间。特别是，`/codex sessions --host <node>` 会列出某一节点上的 Codex CLI 会话文件，`/codex threads` 会列出当前会话连接对应的 App Server 线程，而 `/codex resume` 或 `/codex bind` 会修改该会话的绑定。这些命令不会替代 `sessions.catalog.continue`，并且不存在 `/codex continue` 或 `/codex archive` 运行时命令。

<a id="canonical-message-forks" />

## <a id="openclaw-message-forks"></a> OpenClaw 消息分叉

消息剪切路由在读取原始源之前对选定的本地用户行进行分类。原始进口出处仍需要该来源的精确切割。本机线程的出处是根据当前私有绑定的本机线程进行检查的，与原始源的可用性无关。重复的文本不能识别轮次：原生 turn/item 身份和保留的镜像证明可以。只有明确的主机记录的阻止的用户输入可以被排除在传送的输入匹配之外。

当网关已经保留当前用户轮次时，本机接受通过主机功能注释该确切的记录器拥有的事件。该插件仅提供现有的本地来源字段；主机在锚定写入事务中再次验证实时操作实例、记录器、session/writer 声明、活动锚点和未更改的内容。相同出处是无操作的；冲突、编辑不匹配、确认的转向和撤销的所有者都被拒绝。注释使用普通的成绩单生成失效并在发布之前刷新相同的记录器准入。它永远不会确定较早的未注释的存储转录本行的出处。这样的前缀需要新的原始源分支，而不是推断的映射或历史修复。

主要本机分支创建使用主机的 `SessionInitialization` 生命周期。其狭窄的本机工具策略检查可修复子身份、源版本、注册表和配置，而无需构建工具、配置请求者 MCP 资源或注册实时挂钩。本机源拥有其不可变声明。有界、身份检查的 `SessionMeta.dynamic_tools` 必须与新子项的实际元数据匹配，仅省略根据本机 serde 标准化的 `deferLoading: false`。源绑定摘要检测其自身元数据的漂移；子指纹是根据已验证的子数据和当前子配置计算的。

恢复的监督轮流保留这些本地声明。当前主机拥有的执行器、批准和挂钩仍然独立隔离，并且不可用的调用报告 `executionStarted: false`。现有的物理客户端拥有一个仅包含数据的有界元数据缓存；关闭或线程退休会丢弃它。没有并行的持久目录或保留的执行器。配置、执行环境、MCP 和本机策略更改仍然通过其现有的生命周期检查，并且 external/manual 采用保持不变。

只读转出适配器观察最新的持久 model/provider 对：匹配会话元数据集提供程序、设置应用的事件设置两者，并转换上下文集模型。回滚不会重置这些标量设置。确切的纯文件优于其 `.zst` 同级文件。 Descriptor/root身份和size/timestamps已验证；符号链接、硬链接、替换、格式错误的记录和预算耗尽会导致快照读取被拒绝。界限为 64 个 KiB 读取、1 个 MiB 记录、256 字节标量、8 个 MiB 向后扫描和 5 秒。压缩输入限制为 8 MiB 和 output/window 至 32 MiB。这是经过验证的快照，而不是实时内存选择或元数据缓存。

孩子直接使用 `thread/fork` 和 `beforeTurnId` 以及观察到的对，然后精确剪辑回读。它从不导入预计的历史记录或重新注入继承的前缀。子配置使用共享的 start/resume 渲染器；新的钩子中继一代具有静态命令，但没有实时注册。第一个实际承认的运行仍然拥有提示挂钩和回调注册。共享的 SDK 附加复制冻结的显示消息及其原始证明和具有新目标事件 ID 和父级的防重复身份。公共链接保留原始来源身份和参考；私有绑定指向新的本机子项。它的活动标记描述了经过验证的保留的本机剪切，包括没有剩余轮次时的空基线，因此第一次轮询不会将继承的轮次误认为是新的人类输入。

确切的主机创建或回滚断言到达每个物理 fork/archive 写入，包括本机配置围栏或过载重试之后的写入。确切的物理分叉订阅通过验证进行认领，并在准备就绪之前发布。如果权限在清理之前关闭，可以归档新的子进程，则捕获的物理客户端将从新的获取中分离出来，并在同级租约耗尽后退出。订阅退役并不授予存档权限；普通的存档通知已经释放了它们的订阅声明。后来的监督简历在接受配置申请之前需要本机 `notLoaded` 证据，保留对任意外部线程采用的单独限制。竞争订阅或失败关闭无法通过取消订阅确认转换为成功配置。

发货Codex App Server支持通过`thread/inject_items`进行切换。验证原生 `forkedFromId` 和精确的私人监督绑定分类谱系；缺少可空来源并不等同于 `null`。不需要自定义初始化功能、二进制补丁或额外的运算符选项。

在本机剪切、目录、模型、应用程序和源验证之后，创建会准确附加一条原始开发人员消息，其中包含有界取代通知和完整的最终通用 `developerInstructions` 正文。在绑定 CAS 和 `turn/start` 之前，具有经过验证的配置所有权的接受的冷恢复对受监督的主本机线程执行相同的操作，包括最初从原始源实现的线程。确切的最终通用主体仍然是用于压缩和本机子继承的本机配置。全钩替换和显式空体保留其现有含义；钩后诊断仍然是该机构的一部分。

该通知仅取代之前的 OpenClaw 通用政策。独立管理、监护、安全、协作和本机项目说明仍然具有权威性。取代是散文，而不是机器强制删除。附加是会话配置历史记录：稍后拒绝的用户轮次不会将其回滚，并且独占用户轮次剪切保留先前的配置更新，包括为排除的请求计算的挂钩输出。刷新没有客户端分配的项目 ID、用户轮转注释、镜像条目或模型轮转。

每次物理刷新写入和过载重试都会重新验证其确切的主机、配置、source/binding、信号和物理客户端所有者；确认后，切换会再次检查它们。接受的恢复失败永远不会将绑定轮换到新线程中。不确定的交付会导致确切的物理客户端退役，并且无法触发启动或整个分叉重放。现有的本土历史得以保留。对于新孩子来说，不确定性会拒绝在提交之前进行本地删除，并阻止在未经证明静止的情况下进行存档；现有的未就绪初始化结果仍然可供检查。

附带问题将其当前问题、非延续、非突变和继承 tool/approval 仅供参考的规则放在通用分叉配置中，并受到相同的受保护的开发人员刷新。他们不再注入合成的用户边界。 Cleanup 仅拥有确切的侧面子级，并且不会中断从未开始的回合。

新的开始和初始导入历史实现不需要额外的刷新。普通的无监督冷、暖和隐身路径保留其现有的行为和排除。手动压缩、本机审查和目标保留其现有的配置所有者；独立的冷操作没有权威的最后运行通用主体来刷新。未来承认的监督运行提供当前配置和策略切换。没有策略存储、收据、历史扫描、保留标记或额外的用户轮流可以填补这一空白。

准备就绪印证了创造的权威。在准备就绪之前，注册的删除所有者仅补偿精确的子状态和经过验证的新鲜本机工件； source/successor 状态被保留。丢失的本机响应不会授权孤儿 ID 猜测，并且准备后发布错误无法删除子项。

## <a id="local-continuation"></a> 本地续接

对于存储的或空闲的网关本地行，UI 使用 `catalogId: "codex"` 加上主机和线程 ID 调用 `sessions.catalog.continue`。插件：

1. 如果源本身已经有一个受监督的 Chat，则复用现有的受监督 Chat。
2. 否则，通过源的最后一个终端已持久化轮次（已完成、已中断或已失败），将受限的用户和助手历史投影到一个新的 OpenClaw Chat 中，并记录一个待处理的 harness 分支。
3. 仅存储待处理的 Codex- 模型锁定策略，而不是具体模型或提供商选择，加上私有监督连接范围，并返回 OpenClaw `sessionKey`。

历史投影会选取可见用户和助手消息中最新的尾部内容，硬性限制为总计最多 200 条消息、512 KiB 的 UTF-8 文本，以及每条消息 64 KiB。它会将图像和本地图像输入替换为 `[Image attachment]`，绝不会复制图像负载或路径，并省略推理、 工具调用和工具结果。

UI 使用该会话密钥导航到正常聊天。尚不存在主要的原生harness线程。在第一个正常的聊天回合中，harness会安装真正的 Codex 批准、诱导、事件和交付处理程序，然后：

1. 使用监督连接通过 `ephemeral: true` 和 `excludeTurns: true` 调用本机 `thread/fork`，无需模型或提供程序覆盖并固定持久源快照。 Codex 的当前 `ConfigManager` 状态选择模型和提供商，分叉响应报告实际对。如果模型与源中记录的最后一个模型不同，Codex 会发出正常的模型差异警告。在创建主本机线程之前，harness会在该精确检查和物理连接上确认 `thread/unsubscribe`。该检查永远不会被保留或存档。
2. 在同一连接上，使用 `threadSource: "appServer"`、OpenClaw 的 cwd、策略、配置、环境、完整的 OpenClaw harness工具表面以及叉为此初始启动返回的模型和提供程序启动主要的完整原生 Codex harness线程。
3. 通过该连接注入有界可见用户和助手历史记录，提交受监督绑定而不放弃其监督范围，然后运行回合。

在第一回合之前，聊天是一个锁定的待处理分支，具有可见的历史镜像；之后，每个模型转弯都通过监控连接上的主要原生 Codex harness线程。该分支不是完整的本机推出克隆：故意省略了源推理、工具调用和工具结果。如果快照固定或主本机线程创建失败，挂起的分支仍可重试。绑定竞赛、禁用的监督或不可用或不匹配的监督连接会在转弯运行之前停止转弯，而不是退回到普通的特工家庭harness。

这保证了 Codex-owned 选择，而不是保留源的历史模型。分叉的返回对用于主本机线程启动，并且 Codex 保留该线程的本机模型和提供程序。稍后恢复忽略 OpenClaw 模型和提供程序覆盖，因此 Codex 恢复持久对。如果单独的本机 Codex 控件更改主本机线程，则 OpenClaw 接受该本机持久选择。外部 OpenClaw 模型和后备链永远不会替代它。

对于受监督的模型锁定聊天，模型更改、会话删除和会话 reset/new 操作被阻止。突变 `/codex model <model>`、`/codex bind`、`/codex resume`（包括节点 `--bind here`）和 `/codex detach` 或 `/codex unbind` 也会被阻止，因为它们替换或清除绑定。 `/codex model` 查询以及 `/codex fast`、`/codex permissions` 和 `/codex threads` 仍然可用。 `codex_threads` 代理工具无法附加新的分叉或存档绑定的本机线程。列表和仅元数据读取仍然可用；转录字段需要 `supervision.allowRawTranscripts`，而重命名、取消归档、分离分叉以及不相关线程的归档则需要 `supervision.allowWriteControls`。这两个选项都不能替换锁定的绑定。否则，删除或重置 OpenClaw 条目将丢弃本机绑定，并在 Codex-looking 会话后面创建或允许通用线程。因此，保留维护会保留模型锁定的条目，即使它们超出了正常的寿命、计数或磁盘预算限制。禁用或卸载所属插件还会保留锁定和插件所有权标记。在重新启用同一插件之前，聊天将保持不可用； cleanup 永远不会将其转换为普通的模型会话。

此操作永远不会恢复或改变源。临时分叉固定快照；它不是持久的延续线程。在第一回合启动不同的主要本机harness线程可防止 OpenClaw 仅仅因为进程本地状态无法看到桌面拥有的回合而成为竞争源编写器。可见历史镜像和固定快照可能会忽略活动源中尚未完成的工作。原始 CLI、VS Code、Atlas 或 ChatGPT 源仍然符合本机和 OpenClaw 目录的资格。主分支仍然是监督存储中的本机 Codex 线程，但本机客户端可能会过滤其 `appServer` 源类型，因此 Codex 桌面可见性不是合同。

## <a id="archive-behavior"></a> 归档行为

对于存储或空闲的网关本地行，带有 `catalogId: "codex"` 的 `sessions.catalog.archive` 需要显式 `confirmNoOtherRunner: true`，新读取当前进程本地状态，仅对 `idle` 或 `notLoaded` 继续，调用本机 `thread/archive`，并且仅在 Codex 接受操作后返回成功。然后该行离开非归档目录。

新读取的活动或错误状态会拒绝存档。来自源的正在初始化或挂起的受监督分支也是如此：第一个聊天回合必须在源可以存档之前实现其主要本机分支。确切目标或任何未存档的衍生后代的已知活动 OpenClaw 绑定所有者也会拒绝存档。 OpenClaw 对 Codex 的实验性 `thread/list ancestorThreadId` 关系进行分页，并根据请求或响应错误、游标或线程周期以及安全限制耗尽拒绝存档。本机存档可以关闭加载的父级和后代工作，因此存档不是中断快捷方式。读取、后代枚举和归档调用不是原子的。独立客户端仍然可以拥有或开始处理本地显示为空闲或 `notLoaded` 的行。无其他跑步者确认涵盖未知客户和比赛，直到 Codex 拥有有条件存档或跨进程租赁。禁止配对节点存档。

Codex 目录中没有已归档视图。通过另一个经所有者授权的 Codex 界面使用 `thread/unarchive` 还原的线程，将再次有资格进入非归档目录。

## <a id="active-thread-safety"></a> 活跃线程安全性

Codex 会为同一 App Server 的客户端串行化某个线程的变更，但它不会暴露跨进程的独占运行器或审批拥有者租约。 独立的 stdio App Server 可以向同一次 rollout 追加内容，而各自只会看到自己在内存中的状态。审批请求也可能到达某一服务器的所有订阅者， 而第一个有效响应会完成该请求。

因此：

- 被动目录客户端不会订阅，也不会自动拒绝审批
- 当前报告为 active 的行既不显示新分支，也不显示 Archive
- an 未映射的网关本地源成为可见历史分支，其主要本机harness线程永远不会恢复源
- `notLoaded` 会显示为活动状态未知，并且只有在得到“没有其他运行器”的已知确认后才能归档
- 本地归档要求该确认以及一次新的 `idle` 或 `notLoaded` 读取，同时需承认读取与归档之间存在协议竞态

中断和多客户端交接是未来的产品决策。它们并不意味着显示一行 active。

## <a id="paired-node-boundary"></a> 配对节点边界

配对节点延续使用现有的 request/response Codex CLI 恢复命令，而不是远程应用程序服务器harness流。节点必须已连接，并且所有三个命令都必须被通告并被网关的节点调用策略允许：

- `codex.appServer.threads.list.v1`
- `codex.appServer.thread.turns.list.v1`
- `codex.cli.session.resume`

resume命令是危险的，除了节点认可的命令面之外，还需要显式的`gateway.nodes.commands.allow`授权； `gateway.nodes.commands.deny` 仍然优先。本机 macOS 目录和终端中继本身不会通告此 CLI-resume 命令，但 Mac 应用程序可以合并来自其嵌入式节点工作程序的其他命令。资格遵循实时命令集，而不是主机平台。

`sessions.catalog.continue` 在加入任何待收养之前需要 `operator.admin`。它会重新检查活动节点的功能并在非存档目录中重新定位源。仅交互式 `idle` 或 `notLoaded` 行符合资格；活动的、错误的、已存档的、不可用的或非交互式源将被拒绝。对于新的聊天，它会读取最多 50 个最新回合的有界页面，并通过该页面中的最后一个终端回合导入可见的用户和助理历史记录，使用与本地延续相同的历史记录大小限制。

该插件创建或重用代理限定的模型锁定聊天，并返回 `codex-cli-node-session` 对话绑定，其中包含确切的线程 id、节点 id、所属代理和 cwd。网关在插件完成或取消隐藏聊天之前安装绑定。在此目录操作期间不会发生本机分叉或恢复。稍后的授权消息针对所属节点上的确切本机线程运行 `codex exec resume`，并在标准输入上提示，并使用节点的本机 CLI 配置返回最终文本。他们不会启动网关本地主要本机分支或转发完整的应用程序服务器批准、工具和增量流或结构化附件。绑定回合保留 owner/admin 检查，并在 OpenClaw 沙箱处于活动状态时被阻止。

节点运行器拒绝其进程内同一线程的重叠 OpenClaw 恢复轮次；它不提供跨本地 Codex 客户端的租用。操作员必须避免在其他地方并发使用该线程。缺少所需功能的节点在不继续聊天的情况下仍然可读。配对节点归档仍然被禁止；终端继电器不会改变任一门。

## <a id="permissions"></a> 权限

每台计算机都在本地选择加入。启用 Gateway 并不会授权另一台节点读取其 Codex 元数据。节点能力必须通过正常的配对和命令策略审批。

队列列表、记录查看、本地延续和存档使用 `operator.write` 网关范围。配对节点延续还需要 `operator.admin`，并且后续绑定轮次保留本机执行 owner/admin 授权检查。这两个作用域都不会绕过节点连接、命令批准、调用策略或源资格检查。

自主代理和独立 MCP 访问是分开的。随附的 `codex_endpoint_probe`、`codex_sessions_list`、`codex_session_read`、 `codex_session_send` 和 `codex_session_interrupt` 工具契约仍归 `codex` 插件所有。启用监督后，原始 `codex_threads` 对话记录读取和基于对话记录派生的列表字段还需要 `supervision.allowRawTranscripts`；每个 `codex_threads` 的分叉、重命名、归档或取消归档都需要 `supervision.allowWriteControls`。这两个策略默认都为禁用。

## <a id="compatibility"></a> 兼容性

`openclaw doctor --fix` 将附带的 `plugins.entries.codex-supervisor` 配置（包括端点和 transcript/write 策略）以及插件 allow/deny 引用迁移到 `plugins.entries.codex.config.supervision` 中。明确的当前目标值会赢得冲突。迁移后，运行时代码仅使用当前的 `codex` 插件形状。

官方插件恰好保留五个 Supervisor 兼容工具： `codex_endpoint_probe`、`codex_sessions_list`、`codex_session_read`、 `codex_session_send` 和 `codex_session_interrupt`。会话列表默认仅加载已加载项；不存在 `loaded_only` 参数。`include_stored: true` 会添加非归档的状态数据库行，并按每个端点由 `max_stored_sessions` （默认 200，接受范围 1 到 1,000）进行限制；已加载行不受该设置约束。基于转录派生的字段和读取仍受 `allowRawTranscripts` 约束；发送和中断仍受 `allowWriteControls` 约束。

兼容性发送永远不会启动或恢复空闲线程。`mode: "start"` 总是被拒绝； `"auto"` 和 `"steer"` 仅会引导一个可读的活动轮次。中断同样要求存在活动的可读轮次。空闲续接会路由到原生 Codex 目录，因此完整的 harness 负责审批、工具和绑定。 独立的旧版 MCP 适配器会从官方插件解析这些相同的工具，并且是唯一遵守保留的旧版策略环境变量的路径。

2026.8.1 目录 UI、网关方法、节点功能和 CLI 注册尚未在旧插件 ID 下发货。他们直接转移到 `codex` 所有权，无需第二个运行时外观。

## <a id="future-work"></a> 未来工作

- 完全远程应用程序服务器利用当前 CLI-resume 路径之外的流
- 为同时进行客户端交接提供显式的运行器和审批所有者租约
- 在存在运行器所有权租约或等效防护机制后进行远程归档
- 中断功能以及更丰富的活动会话观察
- 在 Codex Desktop、CLI 和 OpenClaw 之间进行可审计的交接

归档浏览不属于计划中的监督侧边栏。原生 Codex 界面仍然是归档线程的恢复路径。

## <a id="acceptance-tests"></a> 验收测试

- 启用监督后会列出未归档的本地会话。
- 已归档会话绝不会出现在目录响应或 UI 中。
- 当另一台主机故障时，健康主机仍保持可见；不可用主机返回的是没有新鲜行，而不是捏造离线会话状态。
- A 存储或空闲的本地行创建带有 Codex-only model/runtime 锁的 Chat 镜像；第一轮固定临时快照并启动主要的完整本机harness线程，然后重复继续打开现有的聊天。
- 第一轮忽略 model/provider 覆盖快照叉，并将主线程开始固定到 Codex 返回的精确对，即使 Codex 警告其当前模型与源最后记录的模型不同。
- 待处理和提交的监督绑定使用监督连接进行源访问、主要本机分支创建以及以后的每个回合；普通 Codex 会话仍处于代理范围内。
- Later 恢复忽略 OpenClaw model/provider 覆盖，保留 Codex 的本机持久选择，接受对该线程的单独本机更改，并且永远不会替换外部 OpenClaw 模型或后备链。
- 禁用监督或丢失 binding/connection 生命周期会阻止回合，而不是将聊天移动到普通的座席家庭harness。
- 受监督且模型锁定的 Chat 在保护原生绑定时无法删除。
- Chat 最多镜像 200 条用户和助手消息，总计 512 KiB，每条消息 64 KiB。图片会变成占位符；源推理、工具调用、工具结果、图片负载和本地路径都不会被克隆。
- 分支流程绝不会恢复源线程。
- 原始来源仍然符合两个目录的资格。主要本机分支使用 `appServer` 源类型，并且不保证出现在 Codex 桌面中。
- 活跃的本地源不能创建分支或被归档；已有的受监督 Chat 仍然可以打开。
- 活动状态未知的行可以 बिना确认地分支；归档则需要明确的“没有其他运行者”确认。
- 在第一个聊天轮具体化主要本机分支之前，无法存档具有正在初始化或挂起的受监督分支的 A 源。
- A 确切目标或任何未存档的衍生后代块存档的已知活动绑定所有者；后代枚举失败会阻止存档，并且显式确认仍然对未知客户端和状态存档竞争负责。
- 经确认的已存储或空闲本地归档会在原生成功后移除该行。
- 配对节点延续需要一个连接节点，其中所有三个命令均已通告和调用、交互式 `idle` 或 `notLoaded` 源以及 `operator.admin`；缺失的权限在采用重复数据删除之前被拒绝。
- 配对节点延续创建或重用具有有限历史记录的模型锁定聊天，并在最终确定可见性之前安装其对话绑定。稍后的授权消息恢复其节点上的确切本机线程，而不是会话系列同级或网关本地分支。
- 没有连续功能的配对节点行仍然可读，并且没有配对节点行提供存档。
- 被动列举绝不会订阅或响应线程审批。
- 旧版 Supervisor 配置迁移到当前的 Codex 配置格式。
- 旧版列表默认仅加载，已存储枚举遵循其各自端点的上限，而兼容性发送绝不会启动或恢复一个空闲线程。

## <a id="related"></a> 相关内容

- [Codex 监督](/plugins/codex-supervision) - 此规范的面向用户的指南
