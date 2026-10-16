---
summary: "只读模型和 MCP 从其自己的本机运行时编录harness报告"
read_when:
  - "您正在向 OpenClaw 模型选择器报告本机模型"
  - "您在进程内 MCP 运行时之外拥有 MCP 连接"
  - "您正在实施目录准备或清理连接"
title: "代理利用本地库存"
sidebarTitle: "本地库存"
---

只读目录harness向 OpenClaw 控制面公开：本机模型行及其准备情况，以及进程内 MCP 运行时之外拥有的 MCP 工具清单。 [Agent harness插件 ](/plugins/sdk-agent-harness) 参考的一部分。

## <a id="native-model-inventory"></a> 原生模型库存

`loadModelCatalog(params)` 列出了所提供的代理、工作区和配置快照的模型。本机模型选择拥有的行将 `nativeRuntime` 设置为harness ID，并省略主机 `api` 和 `baseUrl` 声明。 Core 不会通过主机路由的传输或功能来丰富这些行。

返回 `{ entries, outcomes }` 以报告行旁边的无秘密发现结果。结果使用提供者目录状态 `ready`、`auth-rejected` 和 `unavailable`；仅目录授权拒绝设置 `rejectionScope: "catalog"`。请勿包含原始本机错误或凭据数据。失败的提供者保留其先前的行，而成功的兄弟更新。空的成功结果（包括禁用或丢失的应用程序）会清除该运行时的早期结果。核心通过本机运行时保留这些事实，独立于 API-provider 身份验证。针对 2026.9.5 SDK 构建的插件仍然支持普通行数组。

意外抛出的发现错误会保留主机的通用部分故障行为。主机不会从运行时名称或任意异常文本推断提供者或身份验证拒绝；harness必须提供其自己已知的提供者结果。

可选的同步 `readModelCatalogReadiness(params)` 仅返回 `{ accountType: string }` 用于覆盖该确切范围和模型的当前本机帐户观察。保留原生账户类型；它并不意味着主机凭据或 OAuth 刷新生命周期。对于缺失、失败、被取代或处置的观察结果，请返回 `undefined`。准备状态必须由实际的本地所有者保留，并在使用时重新验证；永远不要在目录行上序列化它，在此回调中执行 I/O，或者从之前成功的回合中推断它。网关将此元数据用于本机拥有的选择器行；编写的主机路由、凭据和配置文件锁仍使用主机就绪状态。这不是执行授权，所有运行时兼容性和权限检查仍然适用。

### <a id="service-tier-picker-policy"></a> 服务层选择器策略

可选的同步 `filterModelServiceTiers` 挂钩缩小了harness运行时显示的层：

```ts
filterModelServiceTiers(params: {
  config: OpenClawConfig;
  agentId?: string;
  provider: string;
  modelId: string;
  serviceTiers: readonly string[];
}): readonly string[];
```

对于选定的模型行和替代运行时选择，网关在解析帐户和路由服务层证据后调用此挂钩。提供的配置是准备好的目录的快照。解释harness中特定于插件的策略；核心不读取私有插件配置。

返回子集，而不改变输入或执行 I/O 或发现。核心将结果与已解析的层相交，保留它们的顺序并忽略添加的层。如果没有钩子，等级不会改变。未知层可用性仍然未知，并且不会调用挂钩。这仅影响选择器元数据；执行转弯时，harness仍必须执行其策略。

## <a id="native-mcp-inventory"></a> 原生 MCP 库存

在 OpenClaw 的进程内 MCP 运行时之外拥有 MCP 连接的harness可以实现 `loadMcpToolCatalog(params)`。回调由只读控制界面（例如 Composer 工具访问视图）使用。它接收权威会话标识、运行时配置、工作区和稀疏会话 MCP 覆盖。 `mcpServerNames` 是 OpenClaw- 配置的服务器的有界集合，该harness可以代表其会话策略。仅返回该集合的 OpenClaw 的 `McpToolCatalog` 形状。

仅使用已绑定的本机进程和线程。返回`undefined`表示没有可用的实时目录；不要仅仅为了解决库存问题而启动新的harness流程。保留原始 server/tool 名称，使用 `assignMcpCatalogSafeServerNames(...)` 分配防冲突服务器名称，并保留仅因 `sessionDeniedTools` 中的会话拒绝而隐藏的工具。在公开行之前，Core 仍然应用最终的 OpenClaw 工具策略和架构兼容性检查。

物化工具视图使用的 `SessionMcpRuntime` 实现应提供 `joinCleanup()`。它等待该确切运行时已请求的清理，包括未发布或退役的服务器，并且如果任何拥有的清理失败或无法确认，则拒绝。它必须为后来的调用者保留该失败，而不关闭仍由另一次运行租用的传输。仅已完成的尽力而为 `dispose()` 并不是清理证据。

该方法对于现有的 SDK 实现是可选的；自动一次性恢复将丢失的方法视为不确定的清理。当其封闭的运行时单独拥有并验证进程生命周期时，不拥有传输的本机外观可能会立即解析。
