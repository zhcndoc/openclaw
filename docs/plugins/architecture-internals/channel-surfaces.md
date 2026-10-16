---
summary: "对话绑定回调、消息工具模式、目标解析、配置支持的目录和只读检查"
read_when:
  - "实施渠道生命周期表面"
  - "您正在解析通道目标或构建配置支持的目录"
  - "您正在为状态和医生路径添加只读通道检查"
title: "通道表面"
sidebarTitle: "通道表面"
---

通道插件拥有的表面：对话绑定回调、消息工具模式、目标解析、配置支持的目录和只读帐户检查。 [插件架构内部](/plugins/architecture-internals)指南的一部分。

## <a id="conversation-binding-callbacks"></a> 会话绑定回调

绑定会话的插件可以在审批结果确定时进行响应。

使用 `api.onConversationBindingResolved(...)` 可以在绑定请求被批准或拒绝后接收回调：

```ts
export default {
  id: "my-plugin",
  register(api) {
    api.onConversationBindingResolved(async (event) => {
      if (event.status === "approved") {
        // A binding now exists for this plugin + conversation.
        console.log(event.binding?.conversationId);
        return;
      }

      // The request was denied; clear any local pending state.
      console.log(event.request.conversation.conversationId);
    });
  },
};
```

回调载荷字段：

- `status`：`"approved"` 或 `"denied"`
- `decision`: `"allow-once"`, `"allow-always"`, or `"deny"`
- `binding`：已批准请求的已解析绑定
- `request`：原始请求摘要、分离提示、发件人 ID 和对话元数据

此回调仅用于通知。它不会改变谁可以绑定会话，并且会在核心审批处理完成后运行。

## <a id="message-tool-schemas"></a> 消息工具架构

插件应该拥有针对非消息原语（例如反应、读取和轮询）的特定于通道的 `describeMessageTool(...)` 模式贡献。共享发送演示应使用通用 `MessagePresentation` 合约，而不是提供者本机按钮、组件、块或卡字段。请参阅 [Message Presentation](/plugins/message-presentation) 了解合约、后备规则、提供者映射和插件作者清单。

提供者本机模式扩展需要明确的维护者批准、通道拥有的解析、记录的跨通道行为以及 `MessagePresentation` 无法表达的功能。 Discord `components` 是其高级组件 V2 布局的经批准的内置例外。

具备发送能力的插件通过消息能力声明它们可以渲染的内容：

- `presentation` 用于语义展示块（`text`、`context`、 `divider`、`chart`、`table`、`buttons`、`select`）
- `delivery-pin` 用于置顶发送请求

核心决定是本地渲染演示文稿还是将其降级为文本。不要从通用消息工具中公开未经批准的提供商本机 UI 逃逸舱口。已弃用的旧本机模式的 SDK 帮助程序仍会导出到现有的第三方插件，但新插件不应使用它们。

## <a id="channel-target-resolution"></a> 渠道目标解析

渠道插件应拥有渠道特定的目标语义。保持共享的出站主机通用化，并使用消息适配器接口来处理提供商规则：

- `messaging.inferTargetChatType({ to })` 决定在目录查找之前，是否应将规范化目标视为 `direct`、`group` 或 `channel`。 隐式所有者心跳传递要求进行此直接分类；否则，Gateway 状态报告将显示 `waiting for route`。
- `messaging.targetResolver.looksLikeId(raw, normalized)` 告诉核心输入是否应该直接跳到类似于 id 的解析而不是目录搜索。
- `messaging.targetResolver.reservedLiterals` 列出了作为该提供者的 channel/session 引用的裸词。解析在拒绝保留文字之前保留配置的目录条目，然后在目录未命中时拒绝未解析的目标。
- `messaging.targetResolver.resolveTarget(...)` 是核心在规范化之后或目录未命中之后需要提供商负责的最终解析时，由插件提供的回退方案。
- `messaging.resolveOutboundSessionRoute(...)` 在目标解析完成后，负责构建提供商特定的会话路由。

推荐拆分方式：

- 使用 `inferTargetChatType` 进行搜索 peers/groups. 之前应进行的类别决策
- 使用 `looksLikeId` 进行“将其视为 explicit/native 目标 id”检查。
- 将 `resolveTarget` 用于提供商特定的归一化回退，而不是用于广泛目录搜索。
- 将提供商本机 ID（例如聊天 ID、线程 ID、JID、句柄和房间 ID）保留在 `target` 值或提供商特定的参数中，而不是在通用 SDK 字段中。

## <a id="config-backed-directories"></a> 基于配置的目录

从配置派生目录条目的插件，应将该逻辑保留在插件内部，并复用来自 `openclaw/plugin-sdk/directory-runtime` 的共享辅助函数。

当某个渠道需要基于配置的 peers/groups 时使用此方式，例如：

- 基于 allowlist 的 DM peers
- 已配置的 channel/group 映射
- 账户作用域的静态目录回退

`directory-runtime` 中的共享辅助函数只处理通用操作：

- 查询过滤
- limit 应用
- deduping/normalization 帮助者
- 构建 `ChannelDirectoryEntry[]`

渠道特定的账户检查和 id 归一化应保留在插件实现中。

## <a id="read-only-channel-inspection"></a> 只读渠道检查

如果您的插件注册了一个通道，最好同时实现 `plugin.config.inspectAccount(cfg, accountId)` 和 `resolveAccount(...)`。

原因：

- `resolveAccount(...)` 是运行时路径。它可以假设凭据已经完全实例化，并且在所需密钥缺失时快速失败。
- 诸如 `openclaw status`、`openclaw status --all`、`openclaw channels status`、`openclaw channels resolve` 以及 doctor/config 修复流程等只读命令路径，不应仅为了描述配置而去实例化运行时凭据。

推荐的 `inspectAccount(...)` 行为：

- 只返回具描述性的账户状态。
- 保留 `enabled` 和 `configured`。
- 相关时包括凭证 source/status 字段，例如：
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- 仅为了报告只读可用性，不需要返回原始 token 值。返回 `tokenStatus: "available"`（以及匹配的 source 字段）对状态类命令已经足够。
- 当凭据通过 SecretRef 配置，但在当前命令路径中不可用时，使用 `configured_unavailable`。

这使得只读命令可以报告“已配置但在此命令路径中不可用”，而不是崩溃或把账户误报为未配置。
