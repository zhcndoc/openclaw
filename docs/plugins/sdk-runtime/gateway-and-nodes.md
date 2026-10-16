---
summary: "进程内网关请求、配对节点调用和网关服务事件"
read_when:
  - "您正在从受信任的插件调用另一个网关方法"
  - "您正在调用或流式传输到配对节点上的命令"
  - "您正在注册一个长期存在的网关服务"
title: "插件运行时网关和节点"
sidebarTitle: "网关和节点"
---

从插件代码到达网关和配对节点，以及长期网关服务接收的事件。 [Plugin 运行时助手](/plugins/sdk-runtime) 参考的一部分。

## <a id="service-scheduling"></a> 服务调度

向 `apiVersion: 2` 注册服务，以在其启动和停止上下文中要求主机拥有的 `PluginServiceSchedulerV1` 功能：

```typescript
api.registerService({
  id: "catalog-refresh",
  apiVersion: 2,
  start({ scheduler }) {
    scheduler.schedule({
      id: "refresh",
      delayMs: 0,
      everyMs: 60_000,
      run: () => refreshCatalog({ signal: scheduler.signal }),
    });
  },
});
```

命名这些合约时，从 `openclaw/plugin-sdk/plugin-entry` 导入 `OpenClawPluginServiceV2`、`OpenClawPluginServiceContextV2` 和 `PluginServiceSchedulerV1`。现有的 `OpenClawPluginService` 和 `OpenClawPluginServiceContext` 类型保持源兼容；他们的调度程序字段是可选的。网关为两个服务版本提供调度程序。

`schedule` 接受绝对 `atMs` 或相对 `delayMs`。作业 ID 属于一个作用域：调度相同的 ID 会替换其挂起的调度，而其他服务和子作用域可以独立使用相同的 ID。 `mode: "earliest"` 保留较早的待决截止日期。 `everyMs` 在回调结束并合并错过的周期后安排下一次运行；回调必须返回其异步工作，以便退休可以加入其中。错误由主机调度程序报告。返回的句柄的 `cancel()` 会阻止将来的调度，并且 `stop()` 还会等待该作业的运行回调。

使用 `scheduler.scope()` 可以缩短连接或观察者寿命。其`beginClose()`关闭准入，中止其信号，并取消挂起的工作； `await stop()`也加入跑步工作和所有后​​代。关闭孩子并不能阻止其父母或兄弟姐妹。关闭服务会关闭其所有子作用域。保留了`schedule`和`scope`函数在关闭后抛出。不要等待作用域的 `stop()` 来自其自身正在运行的回调之一。

主机首先关闭调度准入并发出取消信号，然后调用服务的停止挂钩。退休等待着那个钩子和预定的工作。插件保留重新连接策略、套接字、观察者、持久冲洗排序和交付托管的所有权。停止传输并按照所有者所需的顺序刷新挂起的交付，然后在关闭该工作使用的资源之前加入其子范围。将生命周期信号传递给支持取消的操作，并在返回之前完成已允许的写入。调度不会创建持久作业，也不会更改存储的配置或状态；更新不需要状态迁移。

通道网关适配器选择使用 `apiVersion: 2`。他们的 `startAccount` 和 `stopAccount` 回调接收 `ChannelGatewayContextV2`，包括所需的帐户调度程序。从 `openclaw/plugin-sdk/channel-contract` 导入该上下文和 `ChannelGatewayAdapterV2`。现有的版本 1 适配器保留可选的调度程序字段并继续保持不变。主机为两个版本提供相同的功能，并在注销帐户之前加入计划的工作。捆绑插件定时器迁移可以独立采用它。

`ChannelPlugin<Account, Probe, Audit>` 和 `createChatChannelPlugin` 默认为版本 1 网关适配器，保留现有声明和手动调用。对于版本 2 适配器，使用 `ChannelPlugin<Account, Probe, Audit, 2>` 或第四个 `createChatChannelPlugin` 类型参数。内联 `api.registerChannel` 注册从适配器的 `apiVersion` 推断回调上下文。

较旧的参数合约不接受调度程序的已发布工厂在其版本 1 适配器中使用 `openclaw/plugin-sdk/runtime` 中的 `resolvePluginServiceScheduler`，然后委托给其版本 2 实现。解析器接受显式句柄或借用当前绑定的服务、帐户或可执行文件 CLI 生命周期。它拒绝丢失或关闭的所有者，并且从不创建根调度程序。新工厂明确需要句柄。

CLI 回调保留其命令注册时捕获的调度所有者。定时回调在同一个插件实例中运行，无需继承发起请求或操作员权限。为运行时提供服务的命令必须保持挂起状态，直到该运行时关闭；从操作返回可以让可执行文件退出并在释放插件之前加入其调度程序。

一次性诊断导出器借用现有的 CLI SDK 主机调度程序。当在没有该主机的情况下启用导出时，启动会报告明显的错误；代理命令报告诊断失败并继续。导出器关闭仅取消其服务范围，使 CLI 调度程序可用于其他工作。

## <a id="gateway-and-node-namespaces"></a> 网关和节点命名空间

### <a id="session-resource-methods"></a> Session 资源方法

插件可以在注册附加网关方法时声明 `sessionAccess`：

```typescript
api.registerGatewayMethod("my-plugin.session.open", handleOpen, {
  scope: "operator.write",
  sessionAccess: { mode: "write", allowOwnSessionScope: true, requiredTool: "my_tool" },
});
```

这需要当前经过身份验证的配置文件、现有的规范化顶级 `sessionKey` 以及（如果提供）其匹配的 `agentId`。广泛的作家保留会话的共享规则。 `allowOwnSessionScope` 另外承认 `operator.sessions.write` 仅用于呼叫者自己的会话。 `requiredTool` 检查共享有效会话工具策略和允许的代理运行的工具限制。代理呼叫者只能进行自己的对话。目前资源工具策略准入不支持锁定模型选择。

处理程序接收 `sessionAccessAuthority`。在等待准备之前和之后以及效果之前立即致电 `assertCurrent()`。当处理程序完成时，路由器关闭此调用句柄；以后不能重复使用它来采用新资源。

在处理程序期间使用 `retain()` 来获取 `signal`、`assertCurrent()` 和 `release()` 的原始人访问借用，例如用于交互式查看器。对于由独立授权的协作者共享的资源，请使用 `retainSession()`。第二次借用仅检查确切的会话化身和存储生成；它不授权操作。每个操作仍然需要自己的 person/run 入场。正常的行进度会保留两个生命周期；重置、删除或物理存储替换会使会话借用无效。释放启动失败、更换和服务清理时的所有借用。

`sandboxRequired` 描述了承认的 session/role 约束。消费者必须提供合规的后端或报告其后端不受支持。此元数据不会将网关托管的进程变成沙箱。

对于工具演示，`openclaw/plugin-sdk/agent-harness-runtime` 中的 `readGatewayToolOperatorScopes()` 在检查该权限后返回当前承认的操作员范围的副本。对于没有操作员捕获的 system/local 调用，它返回 `undefined`。它不授予权限；所选网关方法仍授权该请求。

### <a id="person-access-lifetimes"></a> 人员访问生命周期

`api.registerGatewayAccessPolicy({ authorize })` 在经过身份验证的人员准入中添加了插件拥有的访问要求。回调接收当前配置和主要配置文件的 ID、电子邮件别名、可选的已验证 `githubAccountIds` 以及分配的角色。账户ID来自现有身份所有者；显示登录名和公共电子邮件不会建立该绑定。网关从该人的有效角色和该插件的ID解析出`requiredByRole`；角色绑定策略使用该事实，而不是从默认角色名称推断绑定。当保单不管辖该人时，请返回 `undefined`。否则返回`{ assertCurrent, signal }`；当不存在所需的访问权限时拒绝入场。

命名网关角色可以将 `accessPolicyPlugin` 设置为您的插件 ID。该角色需要您注册策略的当前权限，包括插件无法加载或其清单不可用时。返回 `undefined` 不满足显式角色绑定。没有绑定的角色保留其现有的策略行为，并且网关所有者保持独立。

断言必须在执行操作之前立即检查原始访问源。当该源过期或被撤销（包括插件服务关闭）时中止其信号。如果稍后创建授权，已结束的源必须保持结束状态。更新可以扩展不间断的源。将源保留在其现有生命周期所有者中，并在接受人员访问之前对其进行初始化。

返回本机 `AbortSignal`。注册保留本机取消和清理，同时保留绑定到插件实例的断言和可调用中止原因值。插件退役也会结束捕获的访问。

网关将返回的权限绑定到原始人，并通过 WebSocket 和 HTTP 请求以及通过链接通道发送方允许的命令携带它。链接的管理员必须满足相同的角色绑定人员策略，包括在等待的命令准备之后。撤销已承认的授权将终止该命令的权力；替代补助金仅适用于新入学。显式配置的命令所有者保留其独立权限。普通传输断开与撤销不同。政策必须保留独立的员工访问权；它不能从会话的创建者、显示名称或沙箱状态推断请求者的权限。共享秘密系统权限仍然处于个人策略之外。

### <a id="durable-person-access-grants"></a> 持久人员访问授权

支持延迟共享发布的策略在其访问权限上返回稳定的 UUID 作为 `grantId` 并实现 `resume({ config, profile, requiredByRole, grantId })`。网关记录插件 ID 和原始拨款参考以及接受的请求者和范围上限；它不会保留权限回调、信号、凭据或电子邮件别名。

网关还保留该人的原始电子邮件绑定的不透明生命周期 ID。将原始别名移动到另一个配置文件会终止该发布权限，即使稍后恢复了该别名。显示对准入后添加的别名的编辑和更改会保留原始绑定。插件的授权 UUID 保持独立检查；这些身份事实无法取代它。

`resume` 必须检查确切的原始拨款，即使此人当前的角色本来可以豁免。在其保持活动状态时返回其当前权限，并仅在授权明确结束、不存在或替换时返回 `undefined`。当服务正在启动或其状态不可用时抛出，因此恢复会保留挂起的请求，而不是将不可读的授权视为已撤销。仅当续订在旧授权到期之前提交时，才可以保留 UUID；过期或撤销后重新邀请必须使用新的UUID。

恢复授予后，恢复保留其权限并在效果之前调用 `assertCurrent`，而不是再次恢复。其他策略仍会检查每个断言的新适用性，包括对插件拥有状态的更改。

没有持久拨款支持的政策仍然管辖实时入场。他们的非保密权限无法转换为可重新启动的共享发布请求。共享出版物目前支持一项原始管理拨款；无法从该单个引用推断出多个依赖关系。新适用的政策还需要新的出版物准入。

<AccordionGroup>
  <Accordion title="api.runtime.gateway">
    在进程内调用另一个 Gateway 方法，同时保留当前插件受信任的运行时身份。此接口面向捆绑或受信任的官方插件，用于组合插件拥有的 Gateway 能力，而无需建立回环 WebSocket 连接。

    ```typescript
    if (await api.runtime.gateway.isAvailable()) {
      const result = await api.runtime.gateway.request<{ callId: string }>(
        "voicecall.start",
        { to: "+15550001234", mode: "conversation" },
        { timeoutMs: 60_000 },
      );
    }
    ```

    请求默认为 `operator.write` 范围。可信插件可以通过第三个参数请求特定于方法的范围，例如 `plugin.approval.request` 的 `operator.approvals` ；这不会超出经过身份验证的调用者的范围。来自任意外部插件的调用都会被拒绝。失败的方法会抛出 `GatewayClientRequestError`，保留结构化 `details`、重试元数据以及恢复流的网关错误代码。在从也可以在独立代理进程中运行的工具中选择此路径之前，请使用 `isAvailable()`。

    在请求选项中传递 `signal` 以取消请求和协作处理程序工作，例如提供给代理工具的 `execute` 回调的信号。它与当前的 request/work 生命周期组成；调用者和插件权限检查仍然适用。省略它会保留现有的请求行为。取消不会撤消已经提交的效果。

    `await api.runtime.gateway.openPluginPanel({ panelId, sessionKey, agentId })` 在请求 Control UI 中打开此插件已注册的本机会话面板。与任意 `request` 不同，这种窄功能也可供用户安装的插件使用。主机绑定插件ID，保留调用者现有的`operator.write`权限，并且仅针对请求当前操作或代理轮流的浏览器。它在插件退役、调用者撤销或请求者断开连接后拒绝；会话密钥永远不会选择其他人的浏览器。 `{ ok: true }` 确认命令传递，而不是完成插件的异步文档加载。必须启用本机 UI，并且插件必须注册指定面板。

    `await api.runtime.gateway.readSessionFacts({ sessionKeys })` 最多读取 40 个会话并返回键入的 `{ sessions, warnings? }` 数据。每个会话包括其密钥、身份、代理、有界标题和消息预览（无秘密屏蔽）、运行状态（`active`、`idle` 或 `failed`）、可选观察者摘要（运行状况、标题、评估、修订）、拉取请求编号和状态、存档状态和上次活动时间。消息预览的上限为 400 个字符。 `pullRequestsUnavailable` 将未知的 PR 状态与已确认的空列表区分开来。此生命周期绑定读取重用网关的会话投影和上下文绑定 PR 快照所有者，保留当前调用者权限和会话可见性，并忽略隐身会话。它返回准备好的事实，无需等待 Git 或转录丰富；当丰富待定时，预览可以不存在。缺少 PR 快照在后台刷新。当事实发生变化时，使用`api.runtime.gateway.subscribeSessionChanges`重新读取受影响的`sessionKey`，并在完成后调用返回的取消订阅函数。仅类别更改带有 `factsInvalidated: "category"`；不使用会话类别的投影可以忽略它们。未改变的事实不需要基于年龄的重试。保留的句柄在其所有者关闭后会被拒绝；不需要新的SDK桶出口。

    `api.runtime.gateway.withSessionFacts(select, async (snapshot) => result)` 通过相同的会话列表过滤所有者选择不可变事实，无需分页。选择支持代理、存档、自动化、活动和人员过滤器，包括人员方面。未更改的会话事实在读取过程中保留对象身份； `revision` 随所选内容或其活动或重试截止时间而变化。符合条件的人类读者会收到一个稳定的、不透明的 `scope`，用于其查询和当前查看者、配置文件、访问和配置事实。其他呼叫者收到 `undefined`。范围不是权限：主机在回调结束后重新检查调用者，包括等待的插件工作。仅在此回调内使用重用的结果。

    选定的行包括 `isMain`。失败的采集批次保留授权名册字段，原因为 `unavailable`；插件可以显示相同会话身份的先前事实。遗漏或不再可见的会话被省略； `missingSessionKeys` 识别当前事实被忽略的选定名册条目，以便消费者可以撤销他们的后备事实。选定的 PR 事实会在 60 秒到 15 分钟内重试，保留最后一次通过 `pullRequestsStale: true` 确认的列表，并在生命周期替换或成功读取时重置。会话和 PR 文本未经过秘密屏蔽。 `activityExpiresAt`和`retryAt`描述了下一个相关的截止日期；没有创建轮询计时器。当将事实改编到另一个公共响应合约时，删除这些仅限选择的字段。

    `await api.runtime.gateway.resolveGitHubAccount({ login, signal? })` 使用网关配置的 GitHub API 凭证解析对 `{ accountId, login }` 的公共 GitHub 登录，无需匿名重试。捆绑且受信任的官方插件使用现有的 `users.list` / `operator.read` 权限；调用者、插件和网关必须保持活动状态。查找失败返回 `{ error }` 以及现有的 GitHub `statusCode`（404 未找到、429 速率受限、502 上游或网络故障）、安全 `message`、可选绝对 `retryAtMs` 和 `credentialConfigured`。取消和授权失败拒绝。旧主机上没有可选功能；需要更新而不是实施私有查找。传输拥有超时和身份验证。

    `await api.runtime.gateway.withUserProfileIdentity({ profileId, emails, githubAccountIds }, run)` 在现有 `users.list` / `operator.read` 权限下为最多 500 个选定的电子邮件别名准备主要配置文件的原始绑定生命周期。可选的 `githubAccountIds` 将最多 500 个正安全数字帐户 ID 绑定到同一主要配置文件。回调接收同步 `assertCurrent()` 函数。在存储的最终提交保护中并在调度外部突变之前立即使用操作自己的授权来编写它。它读取配置文件所有者发布的当前事实，而无需在调用线程上查询 SQLite。将别名移开或移回、合并所选配置文件、未解决的配置文件突变或关闭调用程序都会使检查无效。所选帐户 ID 必须保持该配置文件的已验证成员身份。未选择的电子邮件绑定可以独立更改。当回调解决时，准备工作被释放，并且保留的断言然后被拒绝。此功能检查所选身份；它不授予执行操作或回滚外部已接受的突变的权限。

  </Accordion>
  <Accordion title="api.runtime.nodes">
    列出已连接节点，并从 Gateway 加载的插件代码或插件 CLI 命令中调用节点主机命令。当插件拥有配对设备上的本地工作时使用，例如另一台 Mac 上的浏览器或音频桥接。

    ```typescript
    const controller = new AbortController();
    const { nodes } = await api.runtime.nodes.list({ connected: true });

    const result = await api.runtime.nodes.invoke({
      nodeId: "mac-studio",
      command: "my-plugin.command",
      params: { action: "start" },
      timeoutMs: 30000,
      signal: controller.signal,
    });
    ```

    当调用方可以被取消时，将 agent 工具或请求的 `AbortSignal` 作为 `signal` 传入。Gateway 加载的调用会将取消操作转发到配对节点；节点主机命令处理程序会通过 `context.signal` 接收该信号，以便停止正在进行的请求并释放本地资源。省略该信号的现有调用仍保持原有行为。

    网关加载的插件可以使用 `nodes.openDuplex(...)` 打开到已注册节点主机命令的连接范围的二进制通道：

    ```typescript
    const controller = new AbortController();
    const channel = await api.runtime.nodes.openDuplex({
      nodeId: "paired-node",
      command: "my-plugin.image-bridge",
      params: { format: "png" },
      timeoutMs: 30000,
      maxMessageBytes: 4 * 1024 * 1024,
      signal: controller.signal,
    });

    const unsubscribe = channel.onMessage((message: Uint8Array) => {
      console.log("Received one complete binary message:", message.byteLength);
    });

    try {
      await channel.send(Uint8Array.of(1, 2, 3));
      const result = await channel.closed;
    } finally {
      unsubscribe();
      channel.close();
    }
    ```

    `openDuplex` 接受与 `nodes.invoke` 相同的节点、命令、参数、超时、幂等密钥、会话密钥、调用者信号和请求范围，以及可选的 `maxMessageBytes` 和 `maxOutstandingDeliveryBytes` 限制。每条消息的限制默认为 100 MiB，可以减少，但永远不会增加到超过 100 MiB。 `maxOutstandingDeliveryBytes` 限制异步监听回调尚未结算的完整消息的总大小；默认为 `maxMessageBytes`，不能小于该限制，并且不能超过 100 MiB。可以遵循最大大小响应和有界异步通知的协议可以请求更大的未完成传递预算，而不提高其每条消息的上限。 OpenClaw 将每个二进制消息拆分为有序的 8 个 KiB 有效负载片段，适合现有的 16 个 KiB 传输帧限制；呼叫者始终发送和接收完整的 `Uint8Array` 消息。并发发送保留消息边界。

    `openDuplex` 解析后立即注册通道的单个消息侦听器。在注册监听器之前，OpenClaw 最多缓冲 8 个完整消息，总共 1 个 MiB；超过任一限制都会关闭调用。取消订阅回调会删除该侦听器。听众可以返回`Promise<void>`；抛出错误或被拒绝的承诺、调用者中止、`close()`、节点断开连接、配对更改、插件重新加载或停用或网关关闭会关闭通道并取消未完成的节点工作。成功的节点命令完成和 `channel.closed` 等待已在进行中的异步消息侦听器。 `close()` 可以安全地重复，并且保留的通道方法在关闭后会拒绝。 `channel.closed` 解析成功的命令结果，或拒绝节点、授权、传输或取消错误。通道无法重新连接或在节点断开连接后继续存在。

    节点插件声明 `duplex: true` 并通过可选的框架命令 I/O 功能注册消息侦听器。当同一命令也支持一元调用时，使用 `duplex: "optional"`；它仍然在不支持双工的节点上进行通告。从显式请求参数中选择二进制行为，而不是仅从 I/O 的存在中选择：

    ```typescript
    api.registerNodeHostCommand({
      command: "my-plugin.image-bridge",
      duplex: true,
      async handle(_paramsJSON, io) {
        if (!io?.frames) {
          throw new Error("Framed node command I/O is unavailable.");
        }

        const frames = io.frames;
        return await new Promise<string>((resolve, reject) => {
          frames.onMessage((message) => {
            void frames.send(message).then(() => resolve('{"ok":true}'), reject);
          });
          io.signal.addEventListener(
            "abort",
            () => reject(new Error("Node command was canceled.")),
            { once: true },
          );
        });
      },
    });
    ```

    发送前注册 `frames.onMessage(...)`：节点仅在侦听器存在后才宣布帧准备就绪，并且 `openDuplex` 仅在命令调度和帧准备就绪后才解析。这可以防止输入在插件使用之前到达。现有的原始 `emitChunk` 和 `onInput` 帮助程序仍然可用于终端样式命令。

    使用来自 `openclaw/plugin-sdk/node-host` 的 `runNodePtyCommand` 的交互式命令可以传递 `assertCurrent` 回调以准备源权限。 PTY 所有者在异步本机加载之后、立即生成之前重新检查它和调用的中止信号。

    `openDuplex` 仅适用于当前受信任的进程内网关插件运行时。插件 CLI 运行时拒绝它并出现可操作错误；没有远程轮询或本地回退。每次调用都使用与 `nodes.invoke` 相同的配对、声明的命令允许列表、插件策略、批准、授权和连接所有权检查。

    当节点向代理公开插件或 MCP- 支持的工具时，`nodes.list(...)` 包括每个连接节点的通告 `nodePluginTools` 描述符。这些描述符是实时连接状态：当节点断开连接时，网关会丢弃它们，并且在本地 plugin/MCP 库存更改后，节点可以用 `node.pluginTools.update` 替换它们。

    在网关内部，该运行时是进程内的。在插件 CLI 命令中，它通过 RPC 调用配置的网关，因此 `openclaw googlemeet recover-tab` 等命令可以从终端检查配对节点。 Node 命令仍然经过正常的网关节点配对、命令白名单、插件节点调用策略和节点本地命令处理。

    当为已承认的运行启用执行身份审核时，这些网关将显示为强制决策收据。成功的节点结果仅归因。未调用其提供的 `invokeNode` 回调而返回的策略会使操作未知；返回成功的插件结果并不能证明节点操作发生。

    暴露节点托管 agent 工具的插件可以为默认应加入允许列表的非危险命令设置 `agentTool.defaultPlatforms`。当操作员必须通过 `gateway.nodes.commands.allow` 主动启用时，请省略该字段。危险的节点主机命令应使用 `api.registerNodeInvokePolicy(...)` 注册节点调用策略；该策略在 Gateway 中于命令允许列表检查之后、命令转发到节点之前运行，因此直接的 `node.invoke` 调用、节点托管的插件工具和更高层级的插件工具会共享相同的执行路径。

    节点调用策略接收所选节点的通告的 `commands` 和可选的 `caps`。使用这些事实来要求支持的命令行为，然后通过提供的 `invokeNode` 回调进行调度，该回调在转发命令之前重新验证当前连接和配对。

    `allow-always` 仍然是一项策略决策，除非节点调用策略明确声明 `standingApproval: { kind: "placement", scope: "<capability>" }`。该选择允许稍后在相同的当前托管放置、节点配对、环境所有者、工作区和语义功能范围上启动高风险命令，最多 30 天，并且永远不会跨网关重新启动。使用稳定的、与内容无关的功能范围，其批准有意涵盖后来的参数更改。当批准的目标或其他请求参数必须保持准确时，请勿选择加入。

    节点命令可以声明 `prepare(context)` 用于异步本机启动。 Node-host初始化在发布初始清单或连接到网关之前等待它；插件注册本身保持同步。共享准备回调在每个节点注册表初始化时运行一次，而不是每次调用或重新连接时运行一次。可选提供者应在预期准备失败时保留已知的不可用状态，并让 `isAvailable` 保留其命令；抛出异常会中止节点启动。使用 `watchAvailability` 进行以后的可用性更改，使用 `onDisconnect` 进行执行清理。 `watchAvailability` 返回的清理回调可能会返回一个承诺。 Node 关闭等待回调并报告清理失败。

    <Warning>
    可选的 `scopes` 字段请求网关操作员范围进行调用。 OpenClaw 仅适用于捆绑插件和受信任的官方插件安装；来自其他插件的请求不会提升调用。当 `openDuplex` 在经过身份验证的网关请求内运行时，其有效范围永远不会超过经过身份验证的调用者的实际范围，即使受信任的插件请求更强的范围也是如此。如果没有经过身份验证的传入客户端，则应用现有的受信任插件范围行为。仅当受信任的插件必须调用具有更严格网关范围的节点命令（例如 `operator.admin`）时，才使用请求的范围。
    </Warning>

  </Accordion>
</AccordionGroup>

## <a id="gateway-service-events"></a> Gateway 服务事件

网关托管服务可以使用 `ctx.invokeNode?.()` 作为自己注册的节点命令。这使用服务的标识，因此只读文档请求可以获取远程文件，而无需授予其调用者 `operator.write` 的权限。使用该能力前请先授权公开操作。 Node 配对、命令授予和插件路径策略仍然适用。该功能不接受调用者选择的范围，并在服务停止或其网关关闭时停止接受工作。普通`api.runtime.nodes.invoke`保持其调用者的权限。

`ctx.openNodeDuplex?.()` 为使用 `duplex: true` 或 `duplex: "optional"` 注册的服务自己的命令打开相同的帧二进制传输。使用与`invokeNode`相同的节点策略和服务生命周期；调用者无法选择身份或范围。可选的 `assertCurrent` 回调在分派和每帧之前添加当前操作的活动性检查。关闭服务会取消打开的通道。

网关托管服务还接收 `ctx.getCron?.()`，用于网关挂钩已可用的调度程序操作：`list`、`add`、`update`、`remove` 和 `removeStaleJobFamily`。非网关服务主机省略此 getter。

当前的服务句柄还公开 `enqueueRun(id, mode)` 用于服务拥有的工作。它使用具有服务实时权限的正常 cron 准入队列，独立于完整的代理工具调用者。使用 `"if-enabled"` 请求立即运行而不覆盖禁用的作业。当服务停止或调度程序被替换时，保留的句柄仍然会拒绝，包括在等待准入时。较旧的主机上不存在此可选方法；它没有调用者范围的后备。

当前的服务句柄还为插件拥有的自动化事件源公开 `readEventSources()` 和 `runEvent(id, input)`。源命名空间绑定到服务的插件ID；插件无法选择另一个源所有者。快照包含 `jobId`、`sourceIdentity`、`enabled` 和源 `options`，而不是凭据或创建者权限。 `runEvent` 采用不可变的事件信封和现有的入口声明令牌。它返回带有运行收据的 `transferred`，当 busy/paused/stopped 时返回 `pending`，对于已停用的源返回 `invalidated`。主机在准入期间重新检查源生成，并自动将声明传输到运行。不要将待处理事件标记为完成或将忙碌结果转变为执行确认。这些可选功能没有直接代理后备。

对于 MCP- 支持的源，`ctx.mcpEvents?.prepareSource({ jobId, sourceIdentity, serverName })` 解析持久的创建者和配置的 MCP 帐户。该作业必须属于调用插件的事件源命名空间，并在 `options.server` 中引用该服务器。此功能可用于外部插件以及捆绑的适配器；调用者无法提供主体或凭据。每个 Webhook 绑定保留一个准备好的句柄。它公开不透明的 account/principal ID、`revalidate()`、`assertCurrent()`、有界配置文件请求、`unsubscribe(signal)` 和 `dispose()`。在接受回调或分派排队事件之前等待 `revalidate()`，然后将其同步电流源断言传递到授权入口和 `runEvent`。重新验证会读取规范凭证所有者，包括其他进程更改，并刷新良性 policy/session 更改，而无需替换句柄。成功的凭证刷新可保留授权生命周期；注销、终端授权丢失、更换则不会。请求在同一生命周期内获取新的解析器凭据并固定 MCP 端点。即使解析器重用其授予 ID，更改的已解析 URL 也会停用绑定，而不是重定向续订或清理。

第一次订阅尝试捕获一个确切的 Webhook 身份和有限的清理权限，即使其远程结果未知。续订必须使用该身份。 `unsubscribe(signal)` 关闭订阅准入，等待其正在进行的请求，并仅清理捕获的身份。清理可以在良性重新验证和源删除后继续存在，但无法借用替换凭证生命周期或在重新启动后从持久绑定事实中恢复。清理完毕后处理手柄；否则，有限远程租约必须到期。

请求者连接解析器接收这些使用者的 `requireLiveAuthority: true`。返回 `authority` 观测值以及 `url` 和 `headers`，以及非秘密 `authorizationId`、`assertCurrent()`、异步 `revalidate()` 和 `dispose()`。 ID 必须能够承受刷新和重新启动，但在断开连接或更换后会发生变化，即使同一请求者重新连接也是如此。断言必须属于凭证所有者，而不是已解析标头的快照。处置释放的是观察结果，而不是账户。使用错误代码 `MCP_AUTHORIZATION_RETIRED` 表示已知的生命周期损失，使用 `MCP_AUTHORIZATION_UNAVAILABLE` 表示暂时无法建立权限。临时失败会保留未完成的工作而不承认它。已停用的绑定不得重新获得以后的授权。仅凭证解析器仍然支持普通工具，但无法授权持久事件。缺少主机支持是明显的能力差距，而不是使用操作员或共享凭证后备的权限。

使用 [ 版本 2 服务调度 ](/plugins/sdk-runtime/gateway-and-nodes#service-scheduling) 进行订阅续订和退避。保持期限可从拥有的持久状态重建；协议维护不得创建第二个调度程序或调用模型。

当前网关服务句柄还提供`await cron.isEnabled()`来观察是否启用了自动调度，包括`OPENCLAW_SKIP_CRON`覆盖。它仅返回一个布尔值，而不返回存储元数据或改变作业的权限。对于较旧的主机实现，该方法在公共类型中是可选的；它的缺失意味着未知、未启用或禁用。当旧主机不存在时，支持旧主机的消费者可以保留之前的协调行为。禁用调度不会禁用作业 CRUD 或所需的插件清理。

服务清理保留所属插件的清理上下文，因此 `stop()` 可以在普通呼叫准入关闭后释放资源。保留该启动尝试获取的资源和取消订阅函数，并释放这些确切的句柄。清理失败并不意味着本机资源已终止；请参阅 [ 插件生命周期和清理](/plugins/sdk-runtime#plugin-lifecycle-and-cleanup)。

使用服务的 `start()` 和 `stop()` 方法来拥有定期调节。它们运行用于服务或插件替换以及网关启动和关闭；对于受影响的插件，完整插件替换还运行 `gateway_stop` 和 `gateway_start`。仅服务配置重新加载不会重播这些挂钩。每个返回的调度程序句柄都属于一个服务生命周期和一个调度程序实例。一旦服务开始关闭或调度程序被替换，调用（包括排队写入）就会被拒绝。在服务保持活动状态时再次调用 `ctx.getCron()` 以获取替换调度程序。

服务可以声明 `reload: { configPrefixes: ["myConfig.service"] }` 以及 `id`、`start` 和 `stop`。提交匹配的配置更改后，网关将停止该服务并使用新的 `ctx.config` 再次调用 `start(ctx)`。仅替换声明匹配前缀的已加载服务；重叠的所有者全部刷新。现有的同等或更窄的重启或无操作策略仍然优先。每个启动都会收到一个新的功能租赁和运行状况报告者。 Stop必须在解决之前释放资源；失败的替换清理或启动会触发网关恢复。完整的插件替换包含这些服务的重新启动。停止钩子在该尝试的原始开始稳定后运行。更换截止日期可以结束调用者的等待并撤销服务能力，同时保留最终的清理工作。

值得信赖的官方诊断出口商服务也可以收到 `ctx.internalDiagnostics.getRuntimeIdentity?.()`。它返回托管进程的实际 `processInstanceId` 和可选加载的 `buildId`，没有文件系统查找或 RPC。在服务启动时捕获；保留的吸气剂在服务租约被撤销后抛出。不提供此可选功能的主机会使运行时身份不可用。此诊断事实不会授予权限或识别服务重新加载时期。

他们的 `ctx.internalDiagnostics.onEvent(listener, filter?, options?)` 订阅提供事件、信任元数据和冻结的私有数据对象。仅需要事件和元数据的导出器可以传递 `{ includePrivateData: false }` 作为第三个注册参数，以跳过私有负载副本并接收冻结的空对象。这保留了事件过滤器、仅可信交付和服务租赁清理。私有数据默认保持启用状态；较旧的主机忽略可选参数并保留其现有的复制行为。

使用 `api.registerService(...)` 注册的长期运行服务，在进程运行 Gateway 广播器时会收到一个进程本地的 `ctx.gatewayEvents` facade；在没有广播器的运行时中，该字段不存在，因此请进行特性检测并保留回退方案（例如粗粒度轮询）。使用 `onSessionsChanged(...)` 在 Gateway 广播 `sessions.changed` 通知后作出响应：

```typescript
let unsubscribeSessionsChanged: (() => void) | undefined;

api.registerService({
  id: "session-index",
  start(ctx) {
    unsubscribeSessionsChanged = ctx.gatewayEvents?.onSessionsChanged((event) => {
      // event: { sessionKey, agentId?, label?, displayName?, reason?, phase? }
      // refreshSession is your plugin's own handler, not an SDK export.
      refreshSession(event.sessionKey);
    });
  },
  stop() {
    unsubscribeSessionsChanged?.();
    unsubscribeSessionsChanged = undefined;
  },
});
```

该处理程序在网关进程中运行，并且不添加网关协议订阅。保留返回的取消订阅函数并在服务清理期间调用它。有效负载是一个轻量级的变更通知；当插件需要完整的当前会话条目时，等待 `api.runtime.agent.session.getSessionEntryAsync(...)`。在插件的事件处理程序中处理异步刷新失败。同步 `getSessionEntry` 兼容性方法已弃用至 2026 年 12 月 31 日；请参阅 [ 会话读取器迁移 ](/plugins/sdk-migration/sqlite-async#session-reads-and-inbound-envelopes)。

OpenClaw 每次启动尝试最多调用服务的 `stop()` 一次，包括启动失败之前替换超时的情况。启动失败回滚和关闭共享相同的清理结果；记录清理失败，而不是在该尝试中重试。

如果更换失败，网关可以再次调用`start()`来恢复之前的服务。重新创建 `stop()` 释放的资源并重置每次启动标志，以便工具和后台工作在回滚后仍然可用。

由于返回或等待的 Promise 导致的服务启动失败会自动记录。有意在后台启动所需工作的服务必须通过其世代绑定的运行状况报告器报告稍后的故障和恢复：

```typescript
// startIndexWorker and stopIndexWorker are your plugin's own background-work
// helpers, not SDK exports.
api.registerService({
  id: "index-worker",
  start(ctx) {
    void startIndexWorker().then(
      () => ctx.serviceHealth?.clearFailure(),
      (error) => ctx.serviceHealth?.reportFailure(error),
    );
  },
  stop() {
    stopIndexWorker();
  },
});
```

当服务停止或其插件注册表生成被替换时，报告器将被撤销，因此来自旧生成的后期回调无法覆盖当前的运行状况。当服务不可用时，更愿意返回启动承诺，直到承诺解决为止；仅将报告器用于拥有自己的停止路径的故意非阻塞工作。
