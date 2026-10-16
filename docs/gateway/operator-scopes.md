---
summary: "Gateway 客户端的操作员角色、作用域和批准时检查"
read_when:
  - "调试缺失操作员作用域错误"
  - "审查设备或节点配对批准"
  - "添加或分类 Gateway RPC 方法"
title: "操作员作用域"
---

操作员作用域会限制 Gateway 客户端在完成身份验证后可以执行的操作。 它们是单一受信任的 Gateway 操作员域中的一种控制平面防护措施， 而不是用于对抗性多租户隔离。若要在人员、团队或机器之间实现强隔离， 请在不同的 OS 用户或主机下运行彼此独立的 Gateway。

相关内容：[安全](/gateway/security)、[Gateway 协议](/gateway/protocol)、 [Gateway 配对](/gateway/pairing)、[设备 CLI](/cli/devices)。

## <a id="connection-roles"></a> 连接角色

每个 Gateway WebSocket 客户端都以一种角色连接：

- `operator`：控制平面客户端，例如 CLI、Control UI、自动化和可信帮助进程。
- `node`：能力宿主（macOS、iOS、Android、无头），通过 `node.invoke` 暴露命令。

运算符 RPC 方法需要 `operator` 角色。 Node- 发起的方法需要 `node` 角色。

## <a id="scope-levels"></a> 作用域级别

| 范围                     | 含义                                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `operator.read`           | 只读状态、列表、目录、日志、会话读取、保留的审计和执行身份诊断，以及其他非变更调用。                       |
| `operator.sessions.read`  | 无需常规网关读取访问权限即可读取可见会话、历史记录和会话元数据。                                                                     |
| `operator.sessions.write` | 读取可见会话、组织拥有的会话以及开始或继续经过身份验证的人员自己的工作。                                                    |
| `operator.write`          | 改变操作员操作：发送消息、调用工具、更新 talk/voice 设置、节点命令中继。也满足 `operator.read`。                |
| `operator.admin`          | 管理员访问权限。满足所有 `operator.*` 作用域。配置变更、更新、原生钩子、保留命名空间和高风险审批均需要此权限。 |
| `operator.pairing`        | 设备和节点配对管理：列出、批准、拒绝、移除、轮换、撤销。                                                                            |
| `operator.approvals`      | Exec 和插件批准 API。                                                                                                                                |
| `operator.questions`      | 列出、读取、回答和解决交互式问题。                                                                                             |
| `operator.talk`           | 在不具备常规 Gateway 写入权限的情况下创建、控制和关闭 Talk 会话。`operator.write` 同样满足此作用域。                               |
| `operator.talk.secrets`   | 读取包含机密信息的 Talk 配置。                                                                                                             |

个人 GitHub 连接管理是只读行为的狭义自我范围例外：`users.github.*` 需要 `operator.read` 加上精确的经过身份验证的持久配置文件。该人只能连接、轮询、取消、重新连接或断开自己的帐户。这些方法不会暴露团队秘密、改变共享配置或授予 OpenClaw write/admin 范围。系统和每个代理 GitHub 更改仍然是 `operator.admin`。

会话范围的读者可以阅读共享的 GitHub 出版物选项以及他们可以通过 `sessions.github.options` 和 `sessions.github.status` 查看的会话收据。对于这些狭窄的调用者，仅当会话具有当前托管工作树或存储库工作区以及受支持的 GitHub 远程时，共享发布选项才可用。积极的工作树目标发现重用经过验证的 Git 元数据长达 15 秒；每个请求都会检查工作树所有权、注册表更改和会话访问。发布始终会再次解析当前的 Git 远程。不可用的目标不会隐藏现有的共享收据。托管工作区更改后重新打开聊天或重新连接以刷新其选项。个人帐户发现和个人收据仍然需要 `operator.read` 和经过身份验证的所有者。在返回等待的读取之前，会重新检查身份、角色、访问授权、连接和会话可见性。

使用 `operator.sessions.write`，请求者可以通过共享 GitHub 帐户发布他们创建的会话中的普通更改。工作流定义更改需要原始请求者当前的完整 `operator.write` 权限。个人发表还需要`operator.write`。每个出版物仍然需要当前会​​话授权。请参阅 [GitHub 连接](/concepts/user-model#github-connections)。

未知的未来 `operator.*` 作用域除非调用方已经持有 `operator.admin`，否则需要精确匹配。

`operator.sessions.write` 包括 `operator.sessions.read`。广泛的 `operator.read` 还包括会话读取，而 `operator.write` 包括两个会话范围。会话范围不授予一般诊断、配置更改、网关范围的工具调用或上述自己的会话共享帐户路径之外的发布。

会话读者可以浏览可见对话并接收其更新。 Control UI 可以将可见历史记录复制为 Markdown。会话编写者可以重命名、固定、存档或恢复他们自己的现有对话。在这些授权下，其他人的可见会话保持只读状态，包括共享会话。会话授予从不授权删除或更改现有会话的共享和可见性。归档会话并不授予删除它的权限。

会话读取者可以将 `sessions.files.list`、`sessions.files.get` 和 `sessions.files.assets` 用于可见会话工作区中的文件。在该根目录之外的读取还需要会话的文件工具来允许网关主机访问，并且调用者具有在此处开始轮询的当前权限，包括所有权、共享角色、代理和沙箱检查。此类预览是只读的。 `canvas.document.preview` 还接受会话读取访问：它返回调用者的 HTML 和隔离沙箱位置，而不读取会话数据。存储的 Canvas 文档仍然需要通过 `canvas.document.view` 进行更广泛的读取访问。

在 Control UI 中，会话编写者可以使用 **New Session**，在自己的会话中发送消息，并停止自己的活动运行。他们的模型、工作量、快速模式和非完全权限选择使用相同的会话授予和网关允许的模型目录。完全权限模式、沙箱更改以及对现有会话上下文窗口的更改仍然需要管理员访问权限。重新连接会在重新播放停止以进行原始运行之前重新检查当前权限。

自己的工作方法，包括消息发送、普通会话创建、恢复和分叉，接受 `operator.sessions.write`，其参数不需要管理员访问权限。会话所有权、当前权限、代理访问权限以及运行时和沙箱要求仍然适用。 `artifacts.list`、`artifacts.get` 和 `artifacts.download` API 需要更广泛的 `operator.read` 范围。

通过 `sessions_spawn` 启动的隐藏本机子代理使用发起人的会话写入权限来完成确切拥有的子代理及其私有父代理的完成。孩子保留该人当前的权限、模型策略和所需的沙箱。直接 `agent` RPC 调用保留其现有的更广泛范围要求；复制子会话或运行标识符不会授予启动权限。

RPC、事件和后台工具使用相同的范围规则。 `operator.write` 的延续可以读取其 GitHub 身份和会话状态，而无需其他交互消息。会话访问和执行生命周期检查仍然适用。

`question.*` 还接受 `operator.sessions.write` 对于与调用者自己承认的运行和拥有的会话绑定的普通问题。网关记录来自受信任运行权限的绑定，而不是来自调用者提供的会话或运行标识符。相同的所有权检查会过滤问题事件和恢复读取。仅凭会话可见性或成员资格并不能授予此访问权限。 `operator.sessions.read` 无法单独回答问题。无会话问题、秘密提示和其他特权问题工作流程保留其现有的 `operator.questions` 和管理检查。

## <a id="named-operator-roles"></a> 命名操作员角色

团队网关可以将经过身份验证的持久配置文件绑定到指定的操作员角色。每个角色控制对其他人会话的访问、可用于会话创建和代理运行的代理、最大操作员范围集以及新创建的会话是否需要沙箱。它还可能需要插件提供的访问策略。

```json5
{
  gateway: {
    roles: {
      default: "guest",
      assignments: {
        byGithubLogin: { octocat: "maintainer" },
      },
      definitions: {
        maintainer: {
          sessions: { others: "write" },
          agents: ["roboclaw"],
          scopes: ["operator.read", "operator.write", "operator.approvals"],
        },
        guest: {
          sessions: { others: "view" },
          agents: ["roboclaw"],
          scopes: ["operator.sessions.read", "operator.sessions.write"],
          sandbox: "required",
        },
      },
    },
  },
}
```

将管理员范围的 `users.setRole` 网关方法与 `{ profileId, role }` 一起使用来分配已配置的角色。设置 `role: null` 以清除分配。分配更改会立即使该配置文件的活动网关连接失效并关闭。重新连接应用当前角色和范围上限。如果返回结果失败，已提交的更改仍会取消先前的访问。授权的自我降级会在连接关闭之前收到响应。

使用 `gateway.roles.assignments.byGithubLogin` 在人员首次登录之前声明分配或跨网关共享相同的映射。密钥为GitHub登录，修剪后匹配不区分大小写；格式错误的登录和重复的规范化登录将被拒绝。每个映射角色必须存在于 `definitions` 中。有效的显式 `users.setRole` 分配获胜，然后是配置文件的缓存的已验证主 GitHub 身份的映射，然后是 `gateway.roles.default`。没有缓存的 GitHub 身份的配置文件永远不会与此映射匹配。使用 `role: null` 清除显式分配会再次公开配置的映射或默认值。

`users.list` 将 `role` 保留为显式分配，并使用 `roleSource`（`"assigned"`、`"githubLogin"` 或 `"default"`）报告 `effectiveRole`。每当配置角色时都需要 `gateway.roles.default`，并且必须命名现有定义。省略 `gateway.roles` 完全会使单独部署和共享秘密部署保持不变。

当插件必须确认该人员的当前访问权限时，将角色的可选 `accessPolicyPlugin` 设置为确切的插件 ID。例如，访客访问插件需要 `accessPolicyPlugin: "visitor-access"` 作为其受限默认角色。被拒绝的连接会收到 `OPERATOR_ACCESS_DENIED` 连接错误详细信息，Control UI 说明该帐户没有访问权限。该要求属于网关配置，并且在插件或其清单丢失、禁用、损坏或仍在启动时仍然强制执行。加载的插件必须返回该人的当前权限；另一个插件的策略无法满足要求。配置验证允许不可用的插件引用，因此网关仍然可以开始修复。没有这种绑定的独立员工角色和网关所有者保留其现有访问权限。恢复所需的插件以承认绑定的角色。删除或更改绑定可通过下述相同的实时角色策略更新来应用。

启用实时配置重新加载后，无需重新启动网关即可应用对 `gateway.roles`（包括 GitHub 登录分配）和 `gateway.auth.identityScopes` 的编辑。现有网关客户端重新连接以接收当前范围上限，但仅限于如下所述的模型策略的更改以及使操作员 WebSocket 登录的解析授权集保持不变的身份范围编辑除外。编辑另一个登录名或重新排序相同的范围会保留该连接、其接受的运行和排队的输入。更改其自己已解决的拨款将撤销保留和委派的工作；恢复授权并不会恢复原来的权限。没有验证身份、节点连接、HTTP 请求和插件身份验证 cookie 的客户端不会消耗身份范围授权，也不会受到这些编辑的影响。待握手和突变在获取权限之前重新检查策略；已接纳的运行保留其正常完成和取消生命周期，包括在其原始访问策略授权到期或被撤销时取消。

配置角色后，经过身份验证的操作员连接不会接收可重用设备或引导令牌：这些令牌不与人员绑定，并且可以绕过角色上限。对于运营商网关连接和 HTTP 请求，未经验证的用户身份的设备令牌或引导令牌身份验证将被拒绝。通过可信代理或其他支持的经过验证的身份（例如 Tailscale）重新连接。 Node 连接、共享 secret/password 访问和没有角色配置的网关保留其现有行为。

对于其他人创建的会话，`sessions.others` 支持以下值：

- `"none"`：从列表和目标访问中隐藏外部会话，将会话级使用过滤为可见会话，并拒绝网关范围内的 `usage.cost`，因为其聚合可能包括隐藏会话。
- `"view"`：允许读取但不允许更改，即使会话以其他方式共享。
- `"suggest"`：允许查看和现有建议流程。
- `"write"`：允许参加国外会话。草案和隐身限制仍然有效。

一个人总是拥有自己的会话。显式会话成员资格可以提高特定会话的 `"view"` 或 `"suggest"` 访问权限，并且已持有 `operator.admin` 的连接保留其管理会话访问权限。

设置 `agents: "*"` 以允许会话创建和代理在每个代理上运行，列出代理 ID 以仅允许这些代理，或使用空数组禁止两者。当运行针对已存在的会话时，白名单也适用。代理发现和 Control UI 代理选择器仅显示呼叫者角色允许的代理。空的白名单会返回空的代理名册；网关的会话路由所有权保持不变。发现不会授予或撤销对现有会话的访问权限：角色的单独会话读取策略仍然控制调用者可以读取哪些会话。 Control UI 在加载或重新连接后等待实时代理名册，因此较旧的浏览器名册无法恢复当前角色排除的代理。

设置角色的可选 `modelPolicy` 以限制其请求使用的模型：

```json5 validate=false
// Inside gateway.roles.definitions.guest
modelPolicy: {
  sourceAgent: "shared-agent",
  deny: ["provider/restricted-*"],
}
```

如果没有 `allow` 覆盖，策略将按顺序遵循代理配置的主要模型和后备模型。省略 `sourceAgent` 使用配置的系统或默认代理，或唯一代理。没有此类所有者的多代理网关必须指定源代理。这会读取现有的代理配置；它不会复制模型列表或授予对每个已安装模型的访问权限。

使用 `allow` 集中替换允许的集合，并使用 `deny` 从任一来源排除模型。空的 `allow: []` 会拒绝所有模型。这两个列表都接受精确的 `provider/model` 引用、源代理模型设置中的别名以及尾随通配符（例如 `provider/*`、`provider/family/*` 或 `provider/restricted-*`）。其他通配符展示位置将被拒绝。排除与已解析的身份匹配，因此别名无法绕过它们，并且系列前缀也会排除新配置的系列成员。

角色政策是一个额外的上限。现有的代理规则仍然控制手动模型选择。默认可以使用目标代理已手动或通过其配置的主链和后备链允许的第一个允许的源模型。在准备提供者之前自动重试该链接的过滤器；空的允许结果返回错误而不是扩大访问范围。

启用配置重新加载后，当配置事务提交时，编辑仅限于现有角色的 `modelPolicy` 设置，无需重新启动网关或重新连接其客户端。其他角色更改会热应用并重新连接具有当前权限的客户端，包括与模型策略编辑结合使用时。禁用配置重新加载将使当前策略保持活动状态，直到配置应用程序恢复为止。

原始角色上限遵循排队工作和子运行。接受的作品必须满足其原始模型上限和当前政策。删除一个源模型会取消其活动模型请求并阻止以后使用它的调用，而仍然允许的同级模型和不相关的工作保留其权限。新请求使用更新的源选择。直接模型请求、标题预览和用户调用的模型完成或决策工具应用相同的策略。交互式插件运行时尝试必须先验证确切的模型策略执行，然后才能执行受限请求，无论谁提供其凭据。目前内置的 OpenClaw 运行时支持这些尝试；未经认证的插件运行时（包括 Codex）会拒绝它们并出现兼容运行时错误。添加策略还会取消在没有策略的情况下开始的未经认证的工作，包括其前台轮结束后保留​​的工作。外部选择的模型不会确定本机运行时实际使用哪个模型。孤立的仅提示完成保持其单独的精确路线合同，并通过完成和清理绑定选定的模型。

有界的自动元数据、操作员配置的入站媒体预处理和主机拥有的执行批准保留了其现有的服务权限。省略 `modelPolicy` 会保留角色的现有模型访问权限，并且共享秘密系统访问权限保持不变。

当合格的本机挂钩被禁用或不可用时，没有模型策略的本机 Codex 工作人员的归因情况有限：先前接受的与其他工作混合的不受限制的输入可以在其发送者失去授权或受到限制后在接收者的有效权限下继续。直接和其他明确约束的作品仍然会被撤销。请参阅 [native 模型策略边界](/plugins/codex-harness/routing#operator-role-model-permissions)。访客访问需要明确的模型策略；其 Codex 运行需要合格的集成。

可选的 `sandbox` 策略默认为 `"inherit"`，它保留代理配置的沙箱模式。将 `sandbox: "required"` 设置为对由具有该角色的经过身份验证的人员创建的每个新会话进行沙箱处理，即使代理的沙箱模式是 `"off"` 也是如此。该示例允许维护人员在 `roboclaw` 上使用主机执行，而同一代理上的来宾创建的会话仍处于沙箱中。

每个经过身份验证的会话创建者所需的沙箱都是隔离的，而不仅仅是每个代理或每个会话。使用同一代理的不同来宾会收到单独的沙箱环境和工作区。同一来宾创建的多个会话会重复使用该来宾的环境和工作区。无论配置的沙箱范围如何，每个来宾的边界都适用。如果代理配置了 `workspaceAccess: "rw"`，则 OpenClaw 会减少对角色所需会话的 `"ro"` 的访问，并记录 `agent/sandbox` 警告，从而防止共享代理工作区成为来宾之间的可写桥。维护者会话和其他没有角色所需沙箱的会话将保留其配置的范围和工作区访问权限。

网关在新会话首次运行之前记录经过身份验证的创建者及其沙箱要求，包括聊天、OpenAI- 兼容的 HTTP 端点、Talk、恢复、分叉、检查点分支、cron、出站消息和生成的子项。即使在角色更改后，委派的子工作也会继承所需父项的原始创建者和沙箱策略。另一个人请求的恢复和分支使用该人自己的角色而不是源会话的策略。

所需的创作出处是不可变的。角色更改、共享、参与、`sessions.patch`、整个条目替换、遗留导入和标准化密钥修复无法删除或替换现有的所需印章。被阻止的持久覆盖会发出 `session-sqlite` 警告。使用 [`openclaw logs --follow`](/cli/logs) 检查它们。现有的未标记会话和创建者不需要沙箱的新会话将保留其现有行为。

即使明确邀请，角色需要沙箱的人员也无法在现有主机执行会话中启动运行。如果沙箱后端不可用或配置失败，所需的会话将失败。它们永远不会退回到网关或节点。 `/elevated`、`exec` 主机覆盖，配置的主机目标无法绕过此限制。

默认情况下，代理的托管 GitHub 身份不会注入沙盒执行中：`GH_CONFIG_DIR` 不存在，并且 `GH_TOKEN` 和 `GITHUB_TOKEN` 为空。管理员可以设置 `agents.entries.<id>.tools.github.allowInSandbox: true` 以将该代理的托管身份公开给其自己的 Docker 或 Podman 沙箱，包括每个创建者隔离的角色所需的沙箱。该配置文件以只读方式安装在 `/openclaw/github` 处；沙盒命令接收托管令牌和 Git 作者。有效的 `"shared"` 范围拒绝此注入并记录命名代理的警告。 `openclaw security audit` 对每个选择加入的代理发出警告。有关凭证边界和后端要求，请参阅 [GitHub Identity](/gateway/config-tools/github-identity#sandbox-opt-in)。

所需的沙箱包含会话的执行和文件工具。它不包含这些路径，因此在允许您不信任的人使用网关主机之前配置它们：

- 默认 `node` 执行器下的 Code 模式在 Gateway 进程中运行单元。使用[QuickJS执行器](/tools/code-mode/executors#choose-an-executor)。
- [CLI 后端](/gateway/cli-backends)（例如Claude CLI）在网关主机上拥有其本机工具和沙箱。使用角色的 `modelPolicy` 排除它们。
- 无论 `allowInSandbox` 为何，`worker-turn` 云工作人员都会收到代理的共享 GitHub 身份。让受限制的人员远离员工档案。
- `sessions.others: "view"` 公开来自每个代理的完整共享记录，包括工具输出。将敏感工作保留在草稿会话中。
- Gateway 代理的 GitHub 发布使用共享帐户。请参阅 [Workflow 和 CI 更改 ](/gateway/config-tools/github-identity#workflow-and-ci-changes) 了解拉取请求工作流程可以运行的内容。

该角色的 `scopes` 列表限制了通过连接身份验证、身份授予、配对、范围升级和经过身份验证的可信代理 HTTP 请求授予的范围。上限使用正常范围含义：`operator.admin` 允许每个运算符范围，`operator.write` 允许 `operator.read` 和 `operator.talk`。它仅过滤现有的补助金。它无法添加连接尚未接收到的范围。上限与能力相交叉，包括更广泛的拨款所暗示的能力。缩小为只读角色的写入授权保留 `operator.read`；仅管理权限缩小为写入角色，保留 `operator.write`。该角色无法授予原始凭据不允许的功能，并且空的授予或角色仍为空。

会话读取和组织使用上次成功应用的角色配置。被拒绝的配置重新加载会使这些权限保持不变。

这包括插件 HTTP 请求和 WebSocket 升级：没有范围标头，普通网关验证的插件路由仅以 `operator.write` 开头，然后应用角色上限。因此，只读角色在该路径上保留 `operator.read`，而空角色不接收运行时作用域。 Control UI 插件授权在签名的 cookie 中携带经过身份验证的配置文件。启用角色时，插件 HTTP 请求重新应用配置文件的当前角色上限并在没有匹配的持久身份的情况下拒绝授予。仅当该角色应保留管理连接权限时，才显式包含 `operator.admin`。

[ 主体绑定远程入口](/plugins/sdk-gateway-ingress) 使用与绑定人员当前角色相交的单独插件批准的上限。 **读+写**使用`operator.read`和`operator.write`； **Full** 使用 `operator.admin`，其含义仍然受到角色的限制。因此，只读角色的 Full 会产生读取访问权限，而空角色或授权仍为空。相同的确切有效范围适用于远程 UI 和授权绑定网关 RPC：身份授权和管理插件调用者都不会添加权限。角色或个人资料的变化会影响现有的委派工作。 Ingress 永远不会颁发可重用的设备令牌，并且设备范围升级无法扩大其授权上限。

管理员证明的 [ 通道身份链接 ](/concepts/user-model#channel-identity-links) 还允许发送者从其有效角色的 `operator.admin` 范围继承通道所有者权限。这不需要额外的身份范围授权。当角色不存在时，通道所有权将使用匹配的管理身份范围授权。连接范围补助和上限保持不变。

命名角色适用于经过身份验证的持久配置文件及其经过证明的通道身份。它们在一个受信任的网关域内组织协作，并且在需要敌对租户隔离时不会替换单独的网关。诊断审核方法（包括 `audit.run.inspect`）保留共享域 `operator.read` 表面，并且不会按会话角色进行过滤。同样，`operator.write` 仍然授权网关范围的操作，例如工具调用、普通节点命令中继和其他写入范围的控制平面操作。会话限制不会将该范围转变为每个人的隔离边界。当相互不信任的人不得共享诊断或控制平面写入权限时，请使用单独的网关。

## <a id="identity-scope-grants"></a> 身份范围授权

`gateway.auth.identityScopes` 向来自 trusted-proxy auth 或 Tailscale WhoIs 的已验证用户身份授予操作员范围：

```json5
{
  gateway: {
    auth: {
      identityScopes: {
        "admin@example.com": ["operator.admin"],
        "operator@example.com": ["operator.read", "operator.write"],
      },
    },
  },
}
```

密钥是经过验证的代理身份或 Tailscale WhoIs 登录。电子邮件密钥匹配时不区分大小写。非电子邮件身份完全匹配。配置验证拒绝上述封闭集之外的范围名称。

连接权限按以下顺序解析：

1. 对于可信代理 Control UI 连接，`x-openclaw-scopes` 首先限制设备注册或升级请求。然后设备授权建立持久范围。无设备会话不贡献任何自我声明的范围。
2. OpenClaw 将匹配的服务器端身份授权与这些范围合并。
3. OpenClaw 将 `x-openclaw-scopes` 应用于最终联合作为会话上限。缺少标头意味着没有上限。存在但为空的标头不会产生任何范围。
4. 如果经过身份验证的配置文件具有有效的指定操作员角色，则 OpenClaw 会将结果与该角色的配置范围上限相交。

结果用于 `hello.auth.scopes` 和网关方法授权。身份授予仅限于会话：它们不会创建或修改配对记录或请求设备范围升级。令牌、密码和无身份验证连接不携带经过验证的身份，也不会收到任何授权。身份授予仅适用于 `operator`-role 连接。 `node`-role 连接永远不会收到它们。

## <a id="method-scope-is-only-the-first-gate"></a> 方法作用域只是第一道关卡

每个网关 RPC 都有一个最小权限方法范围，用于决定请求是否到达其处理程序。参数感知方法在分派之前派生该范围，因此授权失败有一个标准的结构化响应：

- `agent` 对于普通回合需要 `operator.write`，对于 `/new` 或 `/reset` 会话生命周期命令需要 `operator.admin`。
- `node.invoke` 对于普通中继命令需要 `operator.write`，而在将 `browser.proxy`、`browser.proxy.upload.v1`、`fs.listDir` 或 `terminal.upload` 中继到节点时需要 `operator.admin`。
- 顶级 `fs.listDir` RPC 需要 `operator.write` 用于网关主机请求，而当 `nodeId` 以节点为目标时则需要 `operator.admin`。其处理程序限制非管理网关主机浏览已配置的代理工作区。
- `plugins.sessionAction` 需要在所选操作的 `requiredScopes` 中声明的每个范围。省略或空列表默认​​为 `operator.write`。 `operator.write` 满足 `operator.read` 和 `operator.talk`。其他范围需要完全匹配，或 `operator.admin`。
- `sessions.create` 接受 `operator.sessions.write` 进行普通自己的会话创建，包括 `projectId` 或更广泛的 `operator.write` 范围。现有设备文件夹 （`deviceFolder: { deviceId, path }`） 需要更广泛的 `operator.write` 范围、连接的会话主机广告文件夹支持以及通过 `nodeHost.workerRuns.folders` 的节点本地同意。它们不授予任意节点执行权限，但所选文件夹将成为会话的工作区根目录。如果您依赖 `tools.fs.workspaceOnly` 或 exec 限制来包含 `operator.write` 会话，则还要在设备上设置 `nodeHost.workerRuns.folders`。隐身会话和任何 `execNode` 请求都需要 `operator.admin`。对于非管理员呼叫者，处理程序将 `cwd` 限制为已配置的代理工作区。 `projectId` 不能与 `cwd` 或 `execNode` 组合使用。
- `environments.list` 需要 `operator.read` 进行普通清单，并在 `runtimeId` 请求运行时特定命令资格时需要 `operator.write`。会话放置方法在模式验证之前从请求的目标派生其范围：`sessions.dispatch` 需要 `operator.write` 用于 `deviceId` 和 `operator.admin` 用于 `profileId` 或无目标 `cloudWorkers.projectProfiles` 查找。 `sessions.move` 需要 `operator.write` 作为网关或设备目标，需要 `operator.admin` 作为配置文件目标。 `abandonSource: true` 仍然是 `operator.write`，但仅对网关目标架构有效，仅对精确的离线设备源运行时有效。 `sessions.reclaim` 仍为 `operator.write`。格式错误的调度参数或格式错误的移动目标使用 `operator.write`，以便处理程序可以返回精确的架构错误。所有三种方法都保留会话所有权、参与度和提交时间重新验证范围。 `operator.read` 无法单独启动、停止或移动会话。云配置文件分配和突变、配对和连接机器、原始 `environments.create` 或 `environments.destroy`、隐身会话、直接 `execNode` 执行以及任意主机或节点路径保留为 `operator.admin`。
- `worktrees.branches` 需要 `operator.write`。它的处理程序将非管理调用者限制为工作区包含的路径或注册的项目根。其他主机路径需要 `operator.admin`。
- `talk.config` 需要 `operator.read`。 `includeSecrets: true` 还需要 `operator.talk.secrets`。
- `talk.client.*`、`talk.session.*`、`talk.speak` 和 `talk.mode` 需要 `operator.talk`（或兼容的更宽泛作用域 `operator.write`）。
- `sessions.patch` 和 `sessions.patchMany` 在组织字段上接受 `operator.sessions.write`，在拥有的会话上接受 `model`、`agentRuntime`、思维级别、快速模式和非完全权限模式。元数据补丁需要现有的自有会话；他们不能索取未使用的密钥。 Broad `operator.write` 保留其现有会话访问权限。完全权限模式、沙箱更改、本机运行时同意以及特权或未知字段需要 `operator.admin`。运行时可用性和沙箱检查仍然适用。将选定的模型保留为配置的代理默认值仅适用于管理员。
- 对于具有受支持字段的仅存档请求，`sessions.delete` 需要 `operator.write`，否则需要 `operator.admin`。两个会话范围都不允许删除。
- `session.reactions.list` 接受 `operator.sessions.read` 或更广泛的读取访问权限，并需要当前会​​话可见性。 `session.reactions.set` 需要 `operator.write`、已识别的作者以及在会话中发送或建议的权限。仅查看操作员角色无法做出反应。

项目 RPC 使用以下范围：

| 方法                                 | 所需范围和附加门                                                                                            |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `projects.list`                        | `operator.sessions.read` 或更广泛的读取访问权限；只有满足 `operator.write` 的呼叫者才会收到 `repoRoot` 和 `originUrl`。 |
| `projects.add`                         | `operator.write` 和 `controlPlaneWrite` 方法标志。                                                                     |
| `projects.register`, `projects.remove` | `operator.admin`.                                                                                                             |
| `projects.searchRemote`                | `operator.read`.                                                                                                              |

一些处理程序随后会根据正在批准或修改的具体对象应用更严格的检查：

- `device.pair.approve` 在具备 `operator.pairing` 时可达，但批准一个 operator 设备时，只能铸造或保留调用方已经持有的作用域。
- `node.pair.approve` 在具备 `operator.pairing` 时可达，然后会根据待批准节点声明的命令列表派生额外的批准作用域。
- `chat.send` 是一个写作用域方法，但 `/config set` 和 `/config unset` 聊天命令除了该作用域之外，还要求具备 `operator.admin`，不受调用方 chat-send 作用域的影响。

这样就允许低作用域的操作员执行低风险的配对操作，而不必把所有配对批准都变成仅管理员可用。

会话突变 RPC 由其协商的操作员范围授权，独立于连接客户端的 `client.id` 或 `client.mode`。客户端身份仍然可以影响连接和设备身份验证策略，但它既不授予也不删除会话突变权限。

`audit.run.inspect` intentionally uses `operator.read`.网关操作员域中具有该范围的每个客户端都可以接收保留的执行身份上下文，包括有界的假名引用和秘密编辑的显示标签。 `operator.read` 不是单人或敌对多租户隐私边界。必须单独保存这些数据的运营商需要单独的网关信任域。

## <a id="device-pairing-approvals"></a> 设备配对批准

设备配对记录是已批准角色和作用域的持久来源。 已经配对的设备不会在未被告知的情况下获得更广泛的访问权限：如果某次重新连接请求了更广泛的角色或更广泛的作用域，就会创建一个新的待升级请求。

具有广泛读取访问权限的已连接受限 Control UI 可以通过 **Inbox > 系统 > 有限访问 > 请求 admin** 提交相同的待处理请求，而无需尝试更广泛的重新连接。该请求绑定到实时连接上的签名设备身份。批准仍然来自 `device.pair.approve`，因此需要 `operator.pairing` 加上每个请求范围的权限。批准轮换操作员令牌后，网关仅将新令牌返回给该设备的现场服务员。 The browser stores it before reconnecting.在批准之前取消等待或断开连接会在下一次连接时退回到普通配对修复流程。

仅具有 `operator.admin` 的角色允许 Control UI 的完整操作员范围请求。 Approval is still required.角色上限本身并不授予设备范围。

超出经过身份验证的人员分配的角色上限的请求将被拒绝，不会排队等待设备批准。网关在批准后、返回令牌之前再次检查当前角色，因此等待期间的角色降级仍然会阻止角色外的结果。这Control UI显示拒绝和管理员指导，无需**重试**。管理员必须首先更改角色。

明确的例外是由 `openclaw dashboard` 或图形登录直接在网关主机上发布的具有管理员功能的 Control UI 所有者配置文件。其短暂的一次性引导程序可以批准为新浏览器设置的确切封闭范围，或者仅当它绑定到相同的签名浏览器密钥对时才升级现有的有限凭据。通用 Control UI 和 Telegram 切换、移动设置配置文件、共享凭据、位置和呼叫者选择的范围不会收到此异常。

批准设备请求：

- 不包含 operator 角色的请求不需要批准 operator 作用域。
- 非 operator 设备角色（例如 `node`）的请求需要 `operator.admin`，即使 `device.pair.approve` 本身只需要 `operator.pairing`。
- A 请求 `operator.read`、`operator.write`、`operator.approvals`、`operator.sessions.read`、`operator.sessions.write`、`operator.questions`、`operator.pairing`、`operator.talk` 或`operator.talk.secrets` 要求调用者已经持有该范围，或 `operator.admin`。
- 对 `operator.admin` 的请求需要 `operator.admin`。
- A 没有明确范围的修复请求可以继承现有操作员令牌的范围。如果该令牌属于管理范围，则仍需要 `operator.admin` 进行批准。

非管理员共享秘密和可信代理会话只能批准其自己声明的操作员范围内的操作员设备请求。批准非操作员角色仅限管理员，即使这些会话可以使用 `operator.pairing`。

对于已配对设备的令牌会话，管理操作默认仅限于自身作用域，除非调用者具有 `operator.admin`：非管理员调用者只能看到自己的配对条目，并且只能批准、拒绝、轮换、撤销或移除自己的设备条目。

## <a id="node-pairing-approvals"></a> Node 配对认证

`node.pair.*` 功能批准存储在共享 SQLite 配对存储中的配对设备记录中。网关在启动时会将所有剩余条目从已停用的独立 `nodes/paired.json` 存储迁移到这些记录中。详细信息请参见 [ 网关配对 ](/gateway/pairing) 。

`node.pair.approve` 会根据待处理请求的命令列表推导出额外所需的作用域：

| 声明的命令                                                                                                                               | 所需作用域                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 无                                                                                                                                            | `operator.pairing`                    |
| 普通节点命令                                                                                                                          | `operator.pairing` + `operator.write` |
| `system.run`、`system.run.prepare`、`system.which`、`browser.proxy`、`browser.proxy.upload.v1`、`fs.listDir` 或 `system.execApprovals.get/set` | `operator.pairing` + `operator.admin` |

这里，`fs.listDir`是通过`node.invoke`声明中继的节点命令，而不是上面描述的顶级网关RPC。

批准节点声明会记录其命令面。对于 `computer.act`，节点仅在本地启用计算机 Control 后才通告该表面。配对更新获得批准后，通过 `node.invoke` 调用它需要写入范围，但不需要每个操作的管理范围。除了配对之外，被分类为危险或隐私保护的命令仍然需要持久的 `gateway.nodes.commands.allow` 条目。

Node 配对建立身份和信任。它不会取代节点自己的 `system.run` 执行批准策略。

## <a id="shared-secret-auth"></a> 共享网关令牌/密码认证

共享网关 token/password 身份验证被视为该网关的受信任操作员访问。 OpenAI- 兼容的 HTTP 表面、`/tools/invoke` 和 HTTP 会话历史端点会恢复为共享秘密承载身份验证设置的完整默认操作员范围，即使调用者发送更窄的声明范围也是如此。

带有身份信息的模式，例如受信代理认证或 private-ingress `none`，仍然可以遵循显式声明的作用域。若要实现真正的信任边界隔离，请使用独立的 Gateway。

## <a id="related"></a> 相关内容

- [可信代理身份验证](/gateway/trusted-proxy-auth) — 可信代理如何提供这些作用域附加到的操作员身份
- [网关协议](/gateway/protocol) — 这些范围授权的方法
- [Cloud Workers](/gateway/cloud-workers) — 工作人员调度，其环境和会话调用已针对这些范围进行授权
