---
summary: "通用条目助手、其字段和会话目录提供程序合约"
title: "插件 SDK DefinePluginEntry 帮助程序"
sidebarTitle: "定义插件入口"
read_when:
  - "您正在编写提供程序、挂钩或高级工具插件"
  - "您正在注册外部会话目录提供程序"
  - "您需要definePluginEntry字段表"
---

提供者插件、高级工具插件、挂钩插件以及任何非消息通道的入口助手。 [插件入口点的部分参考](/plugins/sdk-entrypoints)。

## `definePluginEntry`

**导入：** `openclaw/plugin-sdk/plugin-entry`

适用于提供程序插件、高级工具插件、钩子插件，以及任何 **不是** 消息通道的内容。

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "my-plugin",
  name: "My Plugin",
  description: "Short summary",
  register(api) {
    api.registerProvider({/* ... */});
    api.registerTool({/* ... */});
  },
});
```

| 字段                     | 类型                                                             | 必需的 | 默认值             |
| ------------------------- | ---------------------------------------------------------------- | -------- | ------------------- |
| `id`                      | `string`                                                         | 是      | -                   |
| `name`                    | `string`                                                         | 是      | -                   |
| `description`             | `string`                                                         | 是      | -                   |
| `kind`                    | `string`（已弃用，见下文）                                 | No       | -                   |
| `configSchema`            | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | No       | 空对象 schema |
| `reload`                  | `OpenClawPluginReloadRegistration`                               | No       | -                   |
| `nodeHostCommands`        | `OpenClawPluginNodeHostCommand[]`                                | No       | -                   |
| `securityAuditCollectors` | `OpenClawPluginSecurityAuditCollector[]`                         | No       | -                   |
| `register`                | `(api: OpenClawPluginApi) => void`                               | 是      | -                   |

- `id` 必须与 `openclaw.plugin.json` 清单中的值匹配。
- 外部会话目录使用 `openclaw/plugin-sdk/session-catalog` 并使用 `api.registerSessionCatalog(...)` 注册 `SessionCatalogProvider`。必填提供商字段为 `id`、`label`、`list` 和 `read`；可选挂钩为 `createListOperation`、`resolveCreateSession`、`continueSession`、`copyToGatewaySession`、`checkUpstreamActivity`、`archive`、`openTerminal` 和 `startTerminalSession`。核心拥有`sessions.catalog.*`网关方法；提供者无需注册 RPC，即可返回主机、会话、脚本和终端计划投影。当每个主机建立时，列表提供者应该调用可选的 `onHost(host)` 回调；返回的主机阵列仍然需要作为最终的兼容性快照。

  仅当连接的呼叫者在没有主机选择或光标的情况下接收列表上的主机进度时显式选择加入时，可选的 `allowPartialResults` 标志才为 true。如果为 true，则提供程序可以返回保留的主机快照或标记仍在加载的主机 `pending: true`，然后通过 `onHost` 和 `waitUntil` 发布其完成的快照。挂起的主机保留现有的客户端行和游标；省略的主机将被删除。在已完成的主机上清除 `pending`。每个 `onHost` 发布对于该主机必须具有权威性：网关在聚合响应中包含每个保留主机的最新发布，即使另一个提供商或可见性投影延迟交付也是如此。最终的主机集是权威的：遗漏的主机将被撤回，而不是从早期发布中恢复。刷新时保留最后已知的行；不要发布空主机来代表待处理的工作。当该标志不存在或为假时，返回完整的兼容性快照。有针对性的主机查找和分页保留了完整响应合同。

  如果主机可以在 `list` 返回故障软快照后完成，请在 `list` 稳定之前使用可选的 `waitUntil(completion: Promise<void>)` 挂钩注册其有界完成。在该承诺中包括主机映射和 `onHost` 调用。使用同一 SDK 入口点中的 `publishSessionCatalogHost({ onHost, waitUntil }, pendingHost)` 来发布主机并注册完整的回调链。 `list`结算后注册被拒绝。未注册完成工作的提供商将在其 `list` 结算时完成发布。

  可选的 `signal: AbortSignal` 属于目录操作或提供程序生命周期。将其传递给可取消的工作，包括 `api.runtime.nodes.invoke(...)` 的顶级 `signal` 字段。请求客户端断开连接只会删除该客户端的订阅；它不会取消共享发现。当目录所有者退休时，网关会删除排队的列表。已开始的提供者将保留其准入名额，直到其返回的承诺得到解决。保留完成不会延长本机调用或故障软响应期限、授予新权限或允许在所有者退休后开始工作。提供商仍对取消后解决的有界工作负责。

  网关一次最多允许 16 个前台目录列表或填充步骤，每个提供程序 ID 有一个活动步骤和最多 32 个排队步骤。排队工作在每个提供程序内保持 FIFO 顺序；当容量可用时，最旧的合格步骤开始。速度慢的提供商无法占用所有槽位。同一提供商的列表等待轮到，包括来自不同客户的呼叫。

  将 `allowPartialResults`、`onHost`、`waitUntil` 和 `signal` 与经过验证的目录查询对象和节点命令负载分开。当 `list` 稳定时，或者当下面的可选列表操作关闭时，必须释放请求拥有的 `sessionEntries` 快照和 `listNodes` 挂钩。在该边界之前准备后期主机映射所需的事实。

  `sessionEntries.revision`（如果存在）是不可变本地条目事实的不透明令牌，包括配置和选择范围。提供者可以弱地缓存通过该令牌派生的元数据以及他们自己的查询和配置输入。新的代币会使这些事实失效；缺少的令牌需要再次读取条目。列出后不要保留快照或条目对象，或使用此令牌作为当前授权或本机主机数据的修订。

  具有多步填充的提供商可以实现可选的 `SessionCatalogProvider.createListOperation(params)` 挂钩。其同步工厂返回 `{ next, close }` 而不启动源工作。网关在第一个入口内调用工厂并串行调用 `next()`：

  - `{ done: false }` 表示该步骤已解决，仅保留惰性延续状态。相同的请求重新加入等待呼叫者后面的现有提供者 FIFO；不会将部分结果发送给客户端。
  - `{ done: true, hosts }` 提供 `list` 将返回的完整填充结果。没有此挂钩的提供商将继续使用 `list` 一次。

  `sessions.catalog.list` 在每一步之前和结算之后都会检查其原始网关和目录注册所有者。过时的所有者结束步进列表并关闭其操作，而不开始进一步的源工作。

  每个 `next()` 返回一个承诺，并且必须在结算之前加入它启动的所有前台工作。切换不能使源页面、分类或所需的投影保持运行。保留源的现有限制、共享生产者所有权、排序和失败行为。一个逻辑请求在每个步骤中保持相同的 `sessionEntries`、`listNodes`、`onHost`、`waitUntil` 和 `signal` 生命周期。在逻辑列表结算之前注册出版工作，使用 `publishSessionCatalogHost` 如上所述；异步发布回调仍然是单独计算的工作，而不是前台步骤。

  网关在完成、失败或排队取消后调用一次同步 `close()`。主动取消仍在关闭前等待实际的 `next()` 承诺。首先将操作标记为关闭，拒绝任何未完成的逻辑主机结果，并仅释放操作拥有的引用。 Close 不启动源工作或异步清理，并且不得取消共享生产者。后面的 `next()` 调用必须在 I/O 之前失败；重复关闭是惰性的。在工厂建设之前以及每个步骤之前和之后都会检查本地发现同意。初始禁用返回空结果而不构造源；稍后的撤销会拒绝逻辑列表。

  成绩单项目可能包括具有合格 `SessionParticipant` 身份的 `sender` 和可选的显示标签或头像。仅提供来源已知的归属；观看者和会话采用者不是文字记录的作者。核心根据当前配置文件数据解析配置文件身份，包括合并。没有属性的用户项目显示为 **User**。

  当具有 `operator.read` 的每个经过身份验证的操作员都可以查看其行时，网关托管的目录可能会设置 `audience: "gateway-operators"`。这样的提供者可以实现 `copyToGatewaySession(...)` 以返回有界的显示名称和独立网关拥有的延续的可选首选模型。核心拥有操作员和代理授权、会话创建、模型准备和策略检查、回滚以及不受信任的内容包装。提供者通过 `read(...)` 提供转录文本；它不能写入目标会话。

  另一个网关发布的只读会话目录可能会设置 `audience: "session-viewers"`。观众需要`operator.read`；配置的角色还必须允许查看其他人的会话（`sessions.others: "view"`、`"suggest"` 或 `"write"`）。来源发布和接收者角色是独立检查的。 Core在异步读取后重新检查接收者的访问；提供者必须在返回其成绩单之前重新检查源会话是否保持发布状态。提供者归因保留显示元数据，并且不会将源会话采用到接收网关中。

  本机源标题是演示文稿，而不是唯一的会话标签。采用新源时，将其标题为 `displayName` 传递给所有者授权的 [ 会话创建者](/plugins/sdk-runtime)；主机将该快照与新行绑定并存储。保持源身份独立于命名，在重用或恢复时保留现有标签和快照，并且不重新同步本机重命名。

  提供者可以使用 `shareRoute` 声明一个可读的转录路径。这是一个封闭的合约，而不是自由格式的路由提示：

  ```ts
  const shareRoute = {
    kind: "thread-id-prefix",
    routeSegment: "my-sessions",
    hostId: "gateway",
    identifierAlphabet: "lowercase-hex",
    fullLength: 32,
    minPrefixLength: 12,
    lookup: "catalog-list-search-by-thread-id-prefix",
    ambiguity: "multiple-results-or-next-cursor",
  } as const;
  ```

  提供程序必须在声明的主机上返回正好 32 个字符的小写十六进制 `threadId` 值。当 `list(...)` 接收到的 `search` 值是有效的 12-32 个字符前缀时，该主机必须仅返回 `threadId` 以该前缀开头的行。返回每个匹配项，直至达到请求的限制，并在可能存在更多匹配项时设置 `nextCursor`。 Control UI 只能解析一个结果，没有下一页；多行或 `nextCursor` 明确不明确，并且永远不会选择第一行。

  命名共享链接使用 `/<routeSegment>/<title-slug>-<id-prefix>` 以及与常规会话链接相同的有界 slug。返回目录行`name`中的标题； Control UI 用它来刷新装饰性的蛞蝓。只有 id 后缀才能选择转录本。 Bare-id 和 stale-title 链接仍然有效，并且标题永远不会解析不明确的 id。

  `routeSegment` 不得使用内置 Control UI 路由或别名的第一段，并且它在活动会话目录中必须是唯一的。无效、不受支持、保留或多重拥有的描述符将被拒绝；目录会话仍然可以通过通用 `/chat/<agent>?catalog=...&host=...&thread=...` URL 进行访问。共享会话 URL 合约拥有内置的保留决策：其共享路径构建器为保留段返回 `null`，并且网关在发布目录之前省略保留描述符。保持一个插件拥有的描述符不变，并将其重新用于注册、前缀查找和 URL 生成，这样这些义务就不会漂移。

  公开相同本地加配对节点形状的 CLI- 支持的目录可以使用 `createSessionCatalogFamily(...)`。系列作曲家拥有共享光标验证、节点有效负载验证、主机投影、采用会话投影、每个主机发布、读取路由、每个已解析代理和源的单次飞行延续以及终端计划路由。不同的智能体不共享飞行中的采用结果；采用源查找密钥仍为 host/thread 对。提供者必须提供其本地存储读取、标识符和命令、错误文本、能力投影、延续可用性和持久性操作、上游活动检查和终端 executable/arguments. 没有默认的延续、能力突变或终端权限。使用 `createSessionCatalogNodeHostBindings(...)` 从这些显式提供程序输入构建匹配的 list/read/terminal 节点命令和仅终端调用策略。

  同一入口点导出 `sessionCatalogPaging`，它对有界 list/read 参数解析器、规范的 base64url 游标编解码器和有界 UTF-8 转录分页器进行分组。提供者将自己的标识符模式和验证消息传递到 `parseReadParams(...)` 和 `parseListParams(...)` 中。

  在 OpenClaw 通告模型聊天创建之前，`resolveCreateSession({ agentId })` 必须返回配置派生的 model/runtime 目标。本机终端准备情况与此目标无关。使用 [`api.runtime.agent.resolveSessionCatalogCreateTarget(...)`](/plugins/sdk-runtime#api-runtime-agent) 应用主机的运行时和模型允许列表策略，而不是重复它。

  `startTerminalSession` 独立于模型聊天创建来宣传 `capabilities.startTerminal: true`。从普通目录 `list` 回调中返回每个符合条件的主机上的 `canStartTerminal: true`，包括空主机。在渐进`onHost`帧和最终结果中发布相同的标志；当准备状态发生变化时显式返回 `false`。失败的成绩单列表不会撤销其他可用的 CLI。 Node 主机需要其精确连接的、可调用的全新启动命令；仅启动节点不得调用缺失列表命令。保留本地源 ID 和进程主目录隔离。交付的 `createSession.startTerminal` 字段仍然是模型聊天元数据；新的终端调用者使用独立功能和原始目录主机。

  `startTerminalSession({ agentId, cwd, initialMessage?, nodeId?, hostId? })` 创建新的 CLI 终端计划。返回本地计划（`kind: "local"`、`argv` 和确切的 `cwd`，以及可选的 `env`、`pathEnv` 和 `title`）或配对节点计划（`kind: "node"`、`nodeId`、 `command`、`paramsJSON` 以及确切的 `cwd`）。 `sessions.catalog.startTerminal` RPC 需要 `operator.admin` 加上 `gateway.cliAgents.enabled` 和 `gateway.terminal.enabled`。调用方规定`cwd`；网关需要现有的绝对本地目录，拒绝更改的计划 cwd 或主机，并在打开 PTY 之前应用正常的代理沙箱、节点配对、截止日期和连接所有权检查。 `hostId`携带选择的本地源； `nodeId`标识一个节点。初始提示限制为 16,384 个字符，cwd 限制为 4,096 个字符（节点上为 4,096 UTF-8 字节）。新节点命令使用 `node-host` 和 `runNodePtyCommand({ ..., requiredCwd: true }, io)` 中的 `decodeNodePtyStartParams` 来要求现有的绝对节点目录，包括在生成之前立即重新检查。 Resume 保留其现有的 cwd 后备合同。 Node 有效负载不得接受可执行文件、argv、环境、凭据或网关代理作为本机帐户选择。

  当直接运行交互式 CLI 的成对节点计划接受双引号 POSIX 路径和简单双引号 Windows 驱动器或 UNC 路径作为文件引用时，可以声明 `uploadPathStyle: "native"`。本机 Windows 格式保留撇号和反斜杠，并拒绝双引号和控制字符。在`createSessionCatalogFamily(...)`中通过`terminal.uploadPathStyle`声明相同的合约。对于 shell 或其他输入语法，请保留该字段。网关将其包含在 `terminal.upload` 结果中，仅适用于广告 `terminal-upload-path-style` 的客户。如果没有上传样式，客户端将使用终端的 shell 引用规则。

  终端管理器在连接和重新连接时保留本机标题和实际 connection/agent 所有者。客户发布 `terminal-session-metadata` 以获得附件 title/owner 并列出标题；旧的闭合响应形状保持不变。

- `kind` 已弃用：改为在 `openclaw.plugin.json` 清单 `kind` 字段中声明独占插槽（`"memory"` 或 `"context-engine"`）。运行时条目 `kind` 仅保留作为旧插件的兼容性回退。
- `configSchema` 可以是一个函数，以便延迟求值。OpenClaw 会在首次访问时解析并缓存 schema，因此开销较大的 schema 构建器只会运行一次。
- `nodeHostCommands` 描述符可以定义 `isAvailable({ config, env })`。返回 `false` 会从无头节点的网关声明中省略该命令及其能力。OpenClaw 会根据节点本地的启动配置对其进行评估；命令处理程序在调用时仍应验证可用性。
