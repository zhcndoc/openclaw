---
summary: "跨 OpenClaw 节点浏览非存档本机 Codex 会话和分页转录本"
title: "监督 Codex 会话"
sidebarTitle: "Codex 监督"
read_when:
  - "你希望 Codex Desktop 或 CLI 会话出现在 OpenClaw 中"
  - "您需要继续存储或空闲的 Codex 会话或存档本地会话"
  - "你正在从已配对节点公开 Codex 会话和转录历史"
---

Codex 监督是官方 `codex` 插件的一项选择加入功能。它在正常会话侧边栏和聊天窗格中显示来自网关计算机和选择加入的配对计算机的非存档 Codex CLI、VS Code、Atlas 和 ChatGPT 源会话。

支持的操作取决于源主机及其功能：

- A 存储的或空闲的本地会话可以从其有限的持久用户和助理历史记录创建模型锁定的 OpenClaw 聊天。第一条消息启动本机快照分支，然后使用 Codex 应用服务器为该分支选择的模型和提供程序启动完整的 Codex harness线程。稍后会恢复主本机线程的持久对，同时受监督的绑定会阻止 OpenClaw 替换另一个运行时、模型或回退。单独的本机 Codex 控件仍然可以更改该持久对。已创建的分支将打开其现有的聊天。
- 从另一个 Codex 进程发现的存储本地会话具有未知的实时活动。它可以分支，或者只有在操作员确认没有其他 Codex 客户端正在使用它之后才可以存档。
- 活动中的源会保持可见，但在当前轮次完成之前不能创建分支或归档。如果它已经有一个受监督的 Chat，**Open Chat** 仍然可用。
- 配对节点上的 A 会话通过有界、游标分页的应用程序服务器读取公开其持久记录。当节点允许所需的目录和 CLI-resume 命令并且操作员拥有 `operator.admin` 时，存储的或空闲的交互式会话也可以在 Chat 中继续。稍后的消息恢复该节点上的确切本机线程，而不是网关本地分支。配对节点存档仍然不可用。
- 已归档的会话不会列出。本地存储的或空闲的会话只有在操作员确认没有其他 Codex 客户端正在使用它之后，才能归档。

## <a id="before-you-begin"></a> 开始之前

- 在网关上安装官方 `@openclaw/codex` 插件。当您启用 Codex 功能时，OpenClaw macOS 应用程序可以安装它。 CLI 安装可以运行 `openclaw plugins install @openclaw/codex`。
- 在你想要列出会话的每台计算机上安装并登录 Codex Desktop 或 Codex CLI。
- 将远程计算机配对为 OpenClaw 节点。每台计算机都必须在本地选择加入。仅在网关上启用监管不会授权其他节点。
- 使用由所有者控制的 Gateway。会话标题、工作目录和 Git 分支可能会泄露敏感项目信息。

## <a id="enable-supervision"></a> 启用监督

在检测到本机 Codex 安装并成功激活所选推理后端后，引导式 `openclaw onboard` 尝试安装并启用 Codex 监督。 Codex 不需要是主要后端。当机会性插件激活成功时，监督就可用。当监督首次连接时，将检查应用程序服务器的可用性。显式 Codex 插件禁用或策略阻止可防止机会性激活，而现有的显式 `supervision.enabled: false` 会禁用面向代理的监管工具。只要 Codex 插件处于活动状态，操作员目录就会保持注册状态，除非 `sessionCatalog.enabled: false` 禁用它。这个单独的开关使 Codex 提供程序、工具和面向代理的监管策略保持不变，同时还从此主机中删除了配对节点目录 list/read 命令。自动 macOS 首次运行设置会关闭本机对话发现；当您希望在侧边栏中显示本机会话时，请单独启用它。现有安装可以手动启用相同的功能：

在`openclaw.json`中启用`codex`插件及其监控功能：

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

如果存在 `plugins.allow`，请包括 `codex`。网关插件激活在默认混合重新加载模式下自动应用；请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

如果没有显式的 `appServer` 连接设置，监督将使用托管 stdio 连接来访问可用的本地 Codex 存储。该目录将进程用户的 `CODEX_HOME` 与配置的 OpenClaw 代理目录下的现有 `codex-home` 存储相结合，删除已解析的文件系统路径的重复项，并为每个存储分配一个不透明的本地主机 ID。每个商店都有自己的应用程序服务器连接。它的路径永远不会在目录中公开。列出、读取、继续、存档、采用和终端恢复保留所选源，同时保留显式 OpenClaw 路由代理作为所有者。默认情况下，普通 Codex harness仍处于代理范围内。如果harness也应共享本机 Codex 状态，则显式设置 `appServer.homeScope: "user"`。当自动设置重复使用现有的 Codex ChatGPT 或 API-key 登录时，自动设置会选择此模式。然后，该harness共享 `CODEX_HOME`（或 `~/.codex`），包括本机登录、线程和 `config.toml`。 Codex 拥有认证和令牌刷新； OpenClaw 不会在其身份验证存储中复制或注册 OAuth 令牌。监督遵循显式 `appServer` 连接设置，而不是将其替换为本地用户主目录默认设置。

自动设置提供的新 ChatGPT 登录使用独立的 OpenClaw 代理主页。要将重复使用的本机登录名切换为单独的登录名，请打开 **Model Setup** 并使用 ChatGPT 登录或输入 OpenAI API 密钥。登录完成后自动选择`plugins.entries.codex.config.appServer.homeScope: "agent"`。单独登录不共享本机 Codex 线程或配置。手动选择检测到的 Codex 保留其现有的 API-key 导入行为。

要共享正在运行的本地守护程序及其现有的 `config.toml` 和登录，请使用 [local Codex 配置 setup](/plugins/codex-harness/native-features#use-an-existing-local-configtoml)。

目录读取使用所选存储的本机 Codex 身份验证，包括当该存储位于 OpenClaw 代理目录下时。浏览存储的会话不需要将本机凭证导入 OpenClaw。代理范围内的托管运行保留其自己的凭据导入和身份验证要求。

从 **Codex** 侧边栏组采用的网关本地聊天不是普通的harness会话。其私有监督绑定使用监督连接进行源读取、主分支创建、历史记录注入以及以后的每个回合。使用默认本地连接，可以保留本机用户 Codex 主目录、身份验证和提供程序配置，而不更改其他会话的默认设置。观看通过的Chats也参与[会话状态意识](/concepts/session-state)。

对于默认的本地监督连接，存储与本地 Codex 客户端共享。OpenClaw 不会假定另一个客户端共享相同的实时 App Server 进程，而且本地状态所有权是进程局部的。因此，它会把其监督 App Server 报告为 `notLoaded` 的线程视为 **已存储 / 活动状态未知**，而不是空闲。

在应显示会话的每个无头节点主机上应用相同的选择加入。本机 OpenClaw macOS 应用程序在将其 Codex 目录通告到配对网关时使用本地 `sessionCatalog.enabled` 设置；不需要启用面向代理的 `supervision` 工具。显式 `sessionCatalog.enabled: false` 使目录保持禁用状态，包括选择加入之前的 macOS 首次运行默认值。该配对的本机 Mac 目录仅支持默认或显式 `appServer.transport: "stdio"` 以及未设置或显式 `appServer.homeScope: "user"`。 `command`、`args` 和 `clearEnv` 因该 stdio 进程而受到表彰。如果 Mac 配置选择 `"unix"`、`"websocket"` 或 `homeScope: "agent"`，则应用程序不会通告目录功能或命令，并且过时的直接调用会失败，而不是公开用户 Codex 主目录或生成不同的本地 stdio 应用程序服务器。

无头节点默认为其本机用户主目录 stdio 目录：`CODEX_HOME`，或未设置时为 `~/.codex`。本机列表、转录读取、终端恢复和聊天继续使用相同的节点拥有的存储。网关代理不需要存在于更新的本机节点上，即使该节点具有多个代理并且没有默认所有者也是如此。

网关保留可选的 `agentId` 字段，以便与仍需要它的已发布节点进行互操作。更新后的本机读者仅将该字段视为路由上下文。显式代理范围或非 stdio 目录配置保留其现有的源选择合同：请求的所有者选择配置的节点源，丢失或删除的所有者会失败，而不是回退到本机用户主目录。升级节点和网关以获得独立于代理的本机发现。

新公布的节点命令会更改该节点已批准的命令范围。请在 Gateway 主机上批准该更新：

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
```

非存档的 Codex 会话也会出现在 Control UI 主侧栏中，并按主机分组。选择一个来读取其持久记录。每个请求最多返回 50 个转录项（当调用者省略 `limit` 时为 20 个），当需要 20 个 MiB 传输安全上限时，会返回较小的页面。支持的商店使用 Codex `thread/items/list`。较旧的存储和节点读取器保留 `thread/turns/list`，并在转弯内进行寻呼。向上滚动以加载旧页面。加载的页面按时间顺序呈现。

Control UI 将工具结果显示为 500 个字符的预览并标记缩短的输出。预览不会重写本机转录或删除通用 `raw` 数据。目录文本使用共享的 512 KiB 每项绑定。查看器永远不会加载无限的 `thread/read` 历史记录。传统的转弯响应或高于运输上限的单个项目仍然明显失败。在 Codex 中打开该会话以检查其完整输出。

在正常会话侧栏中打开 **Codex** 组。它列出了按主机分组的相同会话。 **加载更多会话** 附加来自每个具有较旧行的主机的下一页，并且这些附加行在侧边栏的定期刷新中保留下来。每个主机在其驻留目录准备好后就会出现。可见页面在节点连接更改后、重新获得焦点时进行协调，最多每 30 秒进行一次协调。更改的结果可以获得更快的后续传递。在 Codex Desktop、CLI 或其他本机客户端中创建的会话会在主机的后台目录协调后出现。本机事件更新由该网关驱动的线程，而无需等待定期扫描。搜索和分页使用常驻行，而主行适合内存。 20,000 行保留窗口永远不会限制发现：较旧的页面和范围搜索会回退到仅限本机数据库的分页，并为有限的部分结果提供不透明的延续。空的部分搜索页面仍然可以有延续。精确线程访问还可以根据权威来源验证较旧的 ID，而不是将驱逐视为缺席。第一页遵循新近度顺序，保留时间戳关系内的本机顺序并使用稳定的线程键进行分页。新的原生分叉仍然可以被 ID 读取，但在第一个用户轮到之前可能不会出现在这些列表中。请参阅 [ 目录水合作用和边界 ](/plugins/codex-harness)。

主机可用性和线程状态是分开的。 **Offline** 或 **Unavailable** 描述主机刷新。不可用的主机不会返回新的会话行，并且不会将线程的本机状态更改为 `offline`。会话行使用 Codex 状态，例如 `idle`、`active`、`notLoaded` 或错误。故障主机不会隐藏健康主机的结果。

同一本地住宅的所有查询共享一个居民索引。初始原生水合使用现有的源故障退避；已完成的行保留在内存中和可重构的 SQLite 快照中。正常列表请求绝不会在 TTL 之后重新启动发现。渐进式侧边栏列表对同一查询重复使用上次发布的配对节点页面，并在后台刷新它。没有匹配页面的节点最多需要 250 毫秒才能应答；之后，其主机被标记为挂起，保留可见行，直到现有主机更新事件到达。 Node 断开连接、重新连接、配置更改和较新的发布会使保留的页面无效。较旧的刷新无法替代较新的出版物。在现有的八秒响应期限内，一次性列表、特定于主机的查找和分页仍在等待新的节点数据。

当 Codex 组没有可见会话时（包括发现失败时），侧边栏会隐藏该组。正常的发现刷新会继续，因此当会话可用时会显示该组。当另一台主机出现故障时，已填充的组仍然可见。

侧边栏警告包括目录错误代码和安全底层网关错误。打开侧边栏的 **过滤和排序 > 会话源...** 菜单，或 **设置 > 外观 > 会话源**，并关闭 **显示 Codex 会话** 以禁用发现，而无需禁用 Codex。对于 `NODE_LIST_FAILED`，比较 `openclaw nodes list` 和 **设置 > 设备**。详细原因标识需要修复的配对存储、节点注册表、权限或网关生命周期故障。

## <a id="start-a-new-native-codex-cli"></a> 启动新的原生Codex CLI

在 **Codex** 旁边选择 **+**，选择本机主机和文件夹，然后在终端中按 **Start** 或 Enter。这将启动一个新的交互式 Codex CLI，而不是模型锁定的 OpenClaw 聊天或采用的本机线程。 Codex 拥有其本机帐户、模型、配置和会话身份。可选提示作为文本传递，而不是作为 CLI 选项传递。本地目录源保留其选择的 Codex 主目录，包括不透明的辅助本地主机 ID。

终端创建需要 `operator.admin`、`gateway.cliAgents.enabled`、已安装的 CLI 以及活动目录插件。默认情况下启用终端。 `gateway.terminal.enabled: false` 阻止创建。它不需要合格的 OpenClaw 模型。配对的无头节点必须通告并允许 **`codex.terminal.start.v1`**。现有的`codex.terminal.resume.v1`本身不支持重新启动。节点选择自己安装的 Codex 可执行文件和本机 account/configuration. 网关代理保留授权上下文。它不必存在于节点的 OpenClaw 配置中。

本地启动支持网关 folder/worktree 选择器。 Node 启动需要该节点上现有的绝对目录，并且如果节点的主目录消失，则永远不会替换该目录。命令仅接受 cwd、可选提示和终端维度，而不接受调用者提供的可执行文件、argv、环境或凭据。关闭终端会取消其节点调用。断开连接和失效配对或连接生成由与恢复相同的终端继电器处理。在终端中打开现有会话还需要本地 stdio 源或通告终端恢复的配对节点。直接连接到网关的 Unix 和 WebSocket 目录仍然可用于浏览和继续聊天。对于终端访问，打开为该服务器配置的本机客户端。有关 UI 控件和先决条件，请参阅 [native CLI 创建](/web/control-ui/sessions-and-sidebar#start-a-native-coding-cli)。现有的目录查看、恢复和聊天延续保留其单独的所有权合同。

## <a id="use-the-operator-cli"></a> 使用 operator CLI

终端 CLI 提供相同的非归档目录和 Gateway 本地分支以及归档操作：

```bash
openclaw codex sessions [--agent <id>] [--search <text>] [--host <id>] [--limit <count>] [--cursor <cursor>] [--json] [--url <url>] [--token <token>] [--timeout <ms>] [--expect-final]
openclaw codex continue <thread-id> [--agent <id>] [--host <id>] [--json] [--url <url>] [--token <token>] [--timeout <ms>] [--expect-final]
openclaw codex archive <thread-id> --confirm-no-other-runner [--agent <id>] [--host <id>] [--json] [--url <url>] [--token <token>] [--timeout <ms>] [--expect-final]
```

`openclaw codex sessions` 选项：

- `--agent <id>` 在多代理网关中选择 OpenClaw 所有者。
- `--search <text>` 不区分大小写地搜索会话标题。
- `--host <id>` 将响应限制为一台稳定的目录主机，例如 `gateway:local`、不透明的 `gateway:local:<source-id>` 或 `node:<node-id>`。
- `--limit <count>` 设置每个主机 1 到 100 行。默认值为 50。
- `--cursor <cursor>` 继续某一主机页面，因此需要 `--host`。
- `--json` 打印结构化的 Gateway 响应。

所有三个命令都接受 `--agent <id>` 并从网关客户端继承 `--url`、`--token` 和 `--timeout <ms>`。会话列表默认为 75,000 毫秒，以便冷配对节点目录可以完成。继续并存档默认为 30,000 毫秒。他们还公开了共享的 `--expect-final` 开关，该开关不会更改这些一元监督 RPC。每个 shell 命令都请求 `operator.write` 网关范围。每个子命令都提供标准 `-h, --help` 输出。没有存档或包含存档选项。 `sessions` 可以列出配对的主机。 `continue` 和 `archive` 默认为 `gateway:local`。将列出的不透明本地 `--host` id 传递到另一个本地 Codex 存储。 shell `continue` 命令仅请求 `operator.write`。传递节点主机不会请求配对节点延续所需的 `operator.admin` 范围。除非网关单独将该范围授予经过身份验证的身份，否则请求将被拒绝。使用下面描述的管理员授权的 Control UI 流程进行配对节点延续。存档保持网关本地并且始终需要 `--confirm-no-other-runner`。

这些 shell 命令不同于聊天内的 `/codex` 运行时命令。 `/codex threads [filter]` 列出当前会话连接可用的 App Server 线程。`/codex sessions --host <node>` 列出单个节点上可恢复的 Codex CLI 会话文件，而不是监督集群目录。`/codex resume` 和 `/codex bind` 附加到当前会话，而不是创建一个安全的受监督分支，而受模型锁定的监督 Chat 会拒绝这些绑定变更。不存在 `/codex continue` 或 `/codex archive` 运行时命令。

## <a id="branch-from-a-local-session"></a> 从本地会话分支

从 **Codex** 侧栏中的网关计算机打开存储或空闲会话，并从其会话查看器发送消息。 OpenClaw 创建模型锁定的聊天条目，通过源的最后一个终端持续转动（完成、中断或失败）镜像绑定的用户和助理历史记录，记录待处理的harness分支，并将您的消息转发到聊天。通用模型选择器保持锁定状态。分支准备不会恢复源或启动主harness线程；转发的消息开始该工作。继续相同的源会打开其现有的聊天，而不是创建另一个分支。

镜像保留符合所有三个限制的最新可见尾部：最多 200 条用户或助理消息、总共 512 个 UTF-8 文本的 KiB 以及每条消息 64 个 KiB。过大的消息将被标记截断，并且当达到上限时，较旧的消息将被忽略。图像或本地图像输入成为文字 `[Image attachment]` 占位符。不会复制图像数据和本地路径。

第一条转发的消息开始工作。 Codex harness安装真正的批准、诱导、事件和交付处理程序。它在监督连接上使用临时本机分叉来固定源快照，而无需提供模型或提供程序覆盖。 Codex 应用程序服务器从其当前本机配置中选择两者并返回实际选择。 OpenClaw 确认在创建主分支之前检查的订阅已释放。该检查永远不会成为存储的历史记录或存档工件。在同一连接上，OpenClaw 在其 cwd 和运行时策略下使用返回的对启动主 `appServer`-source 全harness线程，注入有界可见历史记录，并提交分支绑定。主螺纹具有完整的 OpenClaw harness工具表面。这是一个可见历史分支，而不是完整的本机部署克隆：源推理、工具调用和工具结果被省略。此轮以及以后的每个轮都停留在受监督的 Codex 连接上，而不是另一个 OpenClaw 模型运行时或普通的代理家庭harness上。

返回的选择并不是源历史模型的证明。如果当前本机配置与源上一回合记录的模型不同，Codex 会发出其正常的模型差异警告。 OpenClaw 使用返回的对来启动主线程。 Codex 保留主线程的本机模型和提供程序，并稍后恢复保留它们，因为 OpenClaw 省略了模型和提供程序覆盖。如果通过单独的本机 Codex 控件更改主线程，则 OpenClaw 接受 Codex 的持久选择。 OpenClaw 永远不会替代其外部模型或后备链。

受监督且模型锁定的 Chat 不能删除、切换模型、使用 `/new` 或 `/reset`、调用 Gateway 会话重置操作，或使用通用的 **Fork session** 操作。变更性的 `/codex model <model>`、`/codex bind`、`/codex resume`（包括带有 `--bind here` 的节点会话），以及 `/codex detach` 或 `/codex unbind` 也会被拒绝，因为它们会替换或清除锁定的原生绑定。`/codex model` 查询以及 `/codex fast`、`/codex permissions` 和 `/codex threads` 仍然可用。 当你需要不同的模型或全新的线程时，请启动另一个普通会话。

**从这里叉**保留源连接和模型锁定harness，而不更改原始源或父聊天。原始导入消息和 OpenClaw 会话消息使用不同的本机流。请参阅 [在受监督的 Chat](/plugins/codex-supervision#fork-a-message-in-a-supervised-chat) 中Fork 消息。

保持对此聊天的监督启用。如果禁用监督或其存储的连接绑定变得不可用或不一致，则轮流将停止，而不是转移到普通的代理主会话。

新的采用将原生标题快照为修剪后的显示名称，上限为 500 个 UTF-16 代码单元，而无需拆分代理项对。本机标题可以重复或空白。他们不主张独特的 OpenClaw 标签。显式本地标签优先于存储的显示名称。重新打开或恢复聊天会保留其现有标签和标题快照，包括旧的自动分配的标签。重命名本机源不会重新同步任一字段。 **从此处分叉** 不会继承本机响应的标题作为显示名称或本地标签。

禁用或卸载 `codex` 插件不会释放该所有权或使聊天符合其他模型的资格。锁定的聊天仍然保留，但不可用。重新安装或重新启用相同的插件，确认运行时应用程序，然后恢复它。保持聊天不可用可以防止保留清理或临时插件中断，从而静默地孤立本机绑定。

`codex_threads` 代理工具遵循相同的边界。它无法附加不同的分叉或存档聊天的绑定本机线程。列表和仅元数据读取仍然可用。原始转录本读取需要 `allowRawTranscripts`。当禁用原始访问时，`codex_threads` 也会拒绝列表搜索，因为本机搜索包括转录预览。 Control UI 和运算符 CLI 仍然提供仅限标题的有限搜索。重命名、取消归档、分离分叉以及归档不相关的无主线程需要 `allowWriteControls`。这两个选项都不会绕过锁定的绑定。

OpenClaw 不订阅或答复批准请求，而仅列出源线程或显示待处理的聊天。在第一回合启动不同的主harness线程可以让另一个 Codex 进程继续拥有源，而无需创建竞争性的 rollout writer。

原始 CLI、VS Code、Atlas 或 ChatGPT 源对本机客户端和 OpenClaw 目录仍然可见。主分支存储为本机 Codex 线程，但其源类型为 `appServer`。 Codex Desktop 或其他本机客户端可能会过滤该源类型，因此不保证分支本身出现在每个本机历史记录视图中。

OpenClaw 的 App Server 报告的活动行不能启动新分支。请等待当前轮次结束并刷新目录。Codex App Server 会在单个进程内串行化变更，但它不提供跨进程的独占运行器或审批拥有者租约。

对于 **Stored / activity unknown** 行，Chat 镜像和首轮快照固定使用 Codex 在最后一个终局已持久化轮次时的状态。 源线程不会被恢复、中断或归档。如果另一个进程中有一个进行中的轮次， 其最新的进行中工作可能不会出现在该分支中。

## <a id="fork-a-message-in-a-supervised-chat"></a> 在受监督的聊天中分叉消息

分叉原始导入的用户消息会保留原始源流：源必须仍然可读，并且子级的第一次轮流具体化其有界导入历史记录。

相反，分叉在 OpenClaw 对话中创建的用户消息会立即创建一个本机子项，并在本机轮次之前剪切。 Codex 保留其原始历史记录，包括最初注入的前缀，无需再次导入历史记录。本地聊天仅复制所选消息之前经过验证的显示前缀，并保留原始源链接。活动监视在保留的本机前缀之后开始，因此继承的消息不会显示为新的人工输入。这种本地历史剪辑不需要原始导入的源保持可用。

在 Codex 接受提示后，新的 OpenClaw 用户将在现有聊天消息上记录本机提示来源。这会保留消息 ID、文本、时间戳、发件人元数据和位置。缺乏此出处的较旧的 OpenClaw 转弯仍然无法验证：匹配的文本或相邻的助理回复无法确定丢失的本机边界。稍后验证的回合不会修复之前无法验证的前缀。从原始源开始新的聊天，或者在该源保持可用时分叉原始导入的消息，然后创建新的 OpenClaw 回合。 OpenClaw 不回填旧行。

OpenClaw 消息分叉使用发货 Codex 应用服务器的开发人员消息 API。 OpenClaw 在本机线程配置中保留完整的当前通用指令，并附加一条开发人员消息来替换早期的 OpenClaw- 提供的通用策略，包括删除的部分或显式的空策略。独立的本地管理、监护、安全、协作和项目指令保留其权威。这是文本替代。它不会删除早期历史记录或更改本机权限实施。

刷新是在下一个本机用户轮流之前记录的会话配置。它可以包含该请求的提示挂钩输出，并保留在本机历史记录中，即使用户轮流被拒绝或从未启动。 **从这里分叉**排除选定的本机用户轮。它不会删除该轮之前记录的配置更新。刷新不会产生用户消息或额外的模型转动。

OpenClaw 消息分叉需要 Codex 0.153.0 或更新的本机模型元数据。它们在加载到选定的应用程序服务器时使用源线程的当前模型选择，或者在卸载时使用其最新的持久选择。如果 Codex 无法报告该选择，请更新 Codex 或分叉原始导入的消息。

在发布子项之前，OpenClaw 会验证本机剪切、选定的模型和提供者、不可变的工具目录、本地显示前缀和确切的创建所有者。它拒绝在初始化期间对源卷展栏或选定模型的更改。它的自动本机订阅是在准备就绪之前发布的。准备工作不运行提示挂钩或提供执行环境或请求者 MCP 资源。源的实际本机声明必须与新子级的声明相匹配。创造并不重建假设的运行工具。无法验证本机策略或元数据的子项将被拒绝并使用原始消息替代方案。显示副本仅限于 200 条消息和 512 KiB 序列化消息数据。

继承声明不授予执行工具的权限。每个被承认的回合都会独立构建当前可用的工具和批准。对于非所有者或关闭运行不可用的工具仍然不可用，而本机后代在轮流和重新启动时保留其目录和历史记录。

创建者所需的沙箱需要主机配置的环境，因此不符合此直接 OpenClaw 分叉的条件。 Codex 工作区写入单独不能满足该隔离要求。

稍后的转弯需要在应用当前harness配置之前提供本机卸载证据。仅取消订阅确认并不能确定线程已卸载。配置经过验证后，OpenClaw 在开始回合之前刷新完整的通用策略。如果无法验证配置应用程序，请停止竞争本机工作并重新连接。绑定的对话将被保留。不确定的刷新还会保留对话并终止其连接，而不是重播操作。未经验证清理的失败新生仍无法接受检查。

新的初始实现已经提供了通用指令，不需要额外的策略更新。普通的非监督会话保留其现有的简历和热重用行为。独立的冷压缩、审查和目标操作不会重建上次运行的钩子派生的通用策略。下一次承认的受监督运行提供当前配置并刷新它。

## <a id="archive-a-local-session"></a> 归档本地会话

在存储或空闲的网关本地行上选择 **Archive**，然后确认没有其他 Codex 客户端或 OpenClaw 运行程序正在使用该线程或其生成的后代。 OpenClaw 新读取进程本地状态，仅继续处理 `idle` 或 `notLoaded`，调用本机 Codex 归档操作，并从非归档列表中删除会话。本机 Codex 还尝试存档线程的生成后代，并停止通过本机协作恢复的存档后代。

当新读取报告会话处于活动状态或处于错误状态时，当它属于配对节点时，或者当新创建的受监督聊天仍具有来自该源的挂起分支时，存档不可用。在归档源之前发送聊天的第一条消息以具体化其主分支。当 OpenClaw 知道活动绑定拥有确切的目标线程或任何生成的后代（包括存档的后代）时，存档也会被阻止。 OpenClaw 检查两个后代集合的活动工作，并遵循实验性 Codex 后代查询遍历一个共享边界内的每个页面。无效的响应、请求失败、重复的游标或线程或安全限制耗尽会拒绝存档。

读取、后代枚举和归档请求不是一个条件操作，因此它们之间仍然可以开始一轮。应用程序服务器状态也不在独立进程之间共享。因此，确认是未知客户端和竞赛的安全边界：在确认之前退出或以其他方式验证所有其他客户端。使用 Codex Desktop、Codex CLI 或所有者授权的本机线程管理流程恢复存档的线程。解压后又会出现。

```bash
codex unarchive <thread-id>
```

## <a id="understand-paired-node-limits"></a> 了解配对节点限制

配对节点公开版本化只读 `codex.appServer.threads.list.v1` 和 `codex.appServer.thread.turns.list.v1` 命令。具有可用 Codex CLI 的本机节点主机还公开列入白名单的 `codex.terminal.resume.v1` 命令。网关接收规范化的元数据和明确请求的有界脚本页面，而不是原始的应用程序服务器端点。在操作员终端中打开一行会在所属主机上运行 `codex resume <thread-id>` 并中继该命令的 PTY。它不公开通用 shell 或网关提供的 argv。

聊天继续是一个独立于终端中继的功能。它需要 `operator.admin` 和一个既通告并允许所有三个命令的连接节点：

- `codex.appServer.threads.list.v1`
- `codex.appServer.thread.turns.list.v1`
- `codex.cli.session.resume`

该节点还必须通告对恢复所选目录源的支持。配对节点聊天继续要求该源使用本地 stdio； Unix 和 WebSocket 源仍然可浏览，但无法通过节点的 CLI 继续。如果 OpenClaw 请求升级，请更新节点并批准其刷新的功能。较旧的节点仍可用于浏览；现有的聊天将被保留。恢复节点本机用户主目录的旧版 CLI 绑定保留其现有行为。

新的配对节点聊天会固定选定的已解析 Codex 主目录以及节点和线程。更改节点的目录源无法重定向现有聊天，即使替换主目录包含具有相同 ID 的复制线程。恢复原始源以继续该聊天，或在目录中选择替换源以将其采用到单独的聊天中。 OpenClaw 捕获当前配置的每个源的物理路径；重定向目录别名在配置重新加载后生效。

旧版本采用的聊天不会记录其来源主页。它们的历史仍然可用，但本地延续需要从目录中重新采用。 OpenClaw 创建一个单独的固定聊天并保留旧的聊天；它不会从节点的当前配置推断旧聊天的主页。

CLI-resume 命令是危险的节点命令：它需要明确的网关命令白名单 （`gateway.nodes.commands.allow`） 以及节点命令表面的批准。拒绝规则仍然会阻止它。尽管Mac应用程序的嵌入式节点工作程序可以通告其他命令，但本机macOS目录和终端中继本身并不提供它。检查实际公布的和允许的命令，而不仅仅是主机平台。仅公开列表、记录和终端命令的节点在不继续聊天的情况下仍然可读。

在 Control UI 聊天窗格中打开符合条件的非存档交互行并发送短信。继续检查源是否为 `idle` 或 `notLoaded`，创建或重新打开模型锁定的聊天，并将其绑定到所属节点上的确切本机线程。新的聊天反映了最新记录页面中的有限用户和助理历史记录。目录操作本身不会分叉或恢复本机线程。然后，UI 将您的草稿转发到绑定的聊天室。该消息随后将使用其本机 CLI 配置在节点上运行 `codex exec resume` 并返回其最终文本。此文本提示路径不会创建网关本地分支或转发完整的应用程序服务器harness事件、批准、工具调用或结构化附件。绑定轮次仍然需要 owner/admin 权限，并且在 OpenClaw 沙箱处于活动状态时会被阻止。

使用此聊天时，避免在另一个 Codex 客户端中运行相同的线程。该节点防止同一线程和其自己的进程内的解析存储重叠 OpenClaw 恢复轮次，但 `notLoaded` 不能证明另一个本机客户端处于空闲状态并且不存在跨进程运行器租用。无论连续性或终端功能如何，配对节点 **Archive** 仍然不可用。

## <a id="metadata-and-permissions"></a> 元数据和权限

Catalog 行可能包括：

- 线程和会话标识符
- 标题和工作目录
- 当前状态和活动等待标志
- 创建、更新和活动时间戳
- 来源、模型提供方、Codex CLI 版本和 Git 分支

目录投影不包括转录预览、轮次、转出路径、Codex 主路径、Git 远程、提交 SHA 和原始应用程序服务器错误。目录访问和 Control UI 转录本读取需要 `operator.write` 网关范围，因为队列聚合使用标准 `node.invoke` 路径，即使两个目录节点命令都是只读的。配对节点延续还需要 `operator.admin`。随后的绑定轮次强制执行本机执行 owner/admin 检查。

`supervision.allowRawTranscripts` 和 `supervision.allowWriteControls` 管理自主代理和独立 MCP 工具。两者均默认为 `false`。启用监督后，`codex_threads` 会删除转录预览并从列表和仅元数据读取结果中转出，除非允许原始转录。回合包含读取被拒绝。每次分叉、重命名、存档和取消存档都需要写入控制。这些选项不会控制经过身份验证的 Control UI 转录本查看，也不会绕过绑定、主机、状态或确认检查。

### <a id="compatibility-tools"></a> 兼容性工具

官方 `codex` 插件为现有代理和独立 MCP 客户端保留了五个已发布的 Supervisor 工具名称：

- `codex_endpoint_probe`
- `codex_sessions_list`
- `codex_session_read`
- `codex_session_send`
- `codex_session_interrupt`

默认情况下，`codex_sessions_list` 仅加载。没有 `loaded_only` 参数。将 `include_stored: true` 设置为还从 Codex 的状态数据库读取非归档存储行。可选的 `max_stored_sessions` 上限默认为 200，每个端点接受 1 到 1,000 行。它不限制加载的行。如果没有原始转录本权限，列表结果将省略转录本派生的名称、预览和详细的端点错误。 `codex_session_read` 需要 `allowRawTranscripts`。 `include_turns: true` 还向 Codex 请求转弯。允许的会话元数据和转录内容保留工具参数和结果，而无需秘密屏蔽。端点配置凭据仍然被屏蔽。

`codex_session_send` 和 `codex_session_interrupt` 需要 `allowWriteControls`。Send 接受 `mode: "auto" | "start" | "steer"`，但 `"start"` 总是会被拒绝，而 `"auto"` 和 `"steer"` 只能引导一个可读的活动轮次。空闲线程会被拒绝，并提示使用 **Codex Sessions**，在那里完整的 harness 会在继续之前安装审批和工具处理器。Interrupt 同样需要一个活动的可读轮次。这些工具不会恢复或启动空闲源线程。

`openclaw doctor --fix` 将已停用的 `codex-supervisor` 条目、其端点和权限字段以及插件 allow/deny 策略引用移动到官方 `codex` 插件中，而不覆盖显式的当前设置。独立兼容性 MCP 适配器继续从该插件加载相同的五个工具。旧策略环境变量仅适用于该受信任的适配器内部。

有关每个 supervision 配置字段，请参见 [Codex harness 参考](/plugins/codex-harness-reference#supervision)。

## <a id="troubleshooting"></a> 故障排查

**未出现会话：** 验证是否安装了 `@openclaw/codex`，插件和 `supervision.enabled` 均为 true，当前插件白名单允许 `codex`，并且会话未存档。网关激活变更热申请；完成后刷新目录。如果节点的本地激活更改未刷新其公布的功能，请重新启动节点。

**Continue 被禁用或拒绝：** 未映射的行处于活动状态或处于不合格状态，其主机处于脱机状态，或者另一个操作正在挂起。对于配对节点行，还要验证 `operator.admin` 以及所有三个延续命令是否已公布并允许。仅靠终端访问是不够的。从网关本地存储或空闲会话查看器发送以创建单独的分支。继续已有受监督聊天的源会打开该聊天。

无法验证 **Session 资格：** 对于文件系统支持的本地源、转录、继续、存档和终端操作直接验证所选线程，检查非存档本机索引成员身份，并验证其在所选 Codex 主目录中的转出元数据。这些检查共享一个请求预算，并且不会扫描整个目录。不接受丢失、不可读、不一致或 OpenClaw- 管理的元数据。刷新目录，验证其本机 Codex 主目录中的会话，然后重试。这个错误并不能证明线程不存在。普通发现保持其现有行为。远程源继续使用新的本机目录验证，包括当请求的 ID 仍然驻留或已被驱逐时。远程验证和配对节点验证都不会停止于固定的目录页数；现有的请求截止日期仍然限制了该行动。

**Archive 已禁用：在没有其他运行程序确认后，** 存档可用于 stored/activity-unknown 和空闲的网关本地行。活动、错误、脱机、配对节点、挂起分支和已知的精确绑定所有者行对于存档保持只读状态。

**已归档的会话消失了：** 这是预期行为。监督页面没有已归档视图。运行 `codex unarchive <thread-id>`，或使用 Codex Desktop 重新显示它。

**旧的 `codex-supervisor` 配置仍然存在：** 运行 `openclaw doctor --fix`。Doctor 会将已弃用的插件条目和相关的插件策略引用移动到 `plugins.entries.codex.config.supervision`，且不会覆盖显式的 Codex 设置。

## <a id="related"></a> 相关内容

- [Codex 运行环境](/plugins/codex-harness)
- [Codex harness 参考](/plugins/codex-harness-reference)
- [Codex harness运行时](/plugins/codex-harness-runtime)
- [Codex 监督架构](/specs/codex-supervision)
- [节点](/nodes)
- [网关安全](/gateway/security)
