---
summary: "通过网关API写入配置：config.get、config.patch、config.apply和replacePaths"
title: "配置 RPC（编程更新）"
sidebarTitle: "配置 RPC（编程更新）"
read_when:
  - "从工具而不是手动编写配置"
  - "在 config.patch 和 config.apply 之间进行选择"
  - "处理 baseHash、replacePaths 和延迟重新加载响应"
---

## <a id="config-rpc-(programmatic-updates)"></a><a id="config-rpc-programmatic-updates"></a> 配置 RPC（程序化更新）

对于通过 gateway API 写入配置的工具，建议使用以下流程：

- `config.schema.lookup` 用于检查某个子树（浅层 schema 节点 + 子节点摘要）
- `config.get` 用于获取当前快照以及 `hash`
- `config.patch` 用于部分更新（JSON merge patch：对象合并，`null` 删除，数组在通过 `replacePaths` 明确确认且条目会被移除时才替换）
- `config.apply` 仅在你打算替换整个配置时使用
- `update.run` 用于显式自更新并重启；如果重启后的会话应继续执行一次后续轮次，请包含 `continuationMessage`
- `update.status` 用于检查最新的更新重启哨兵，并在重启后验证正在运行的版本

Agents 应将 `config.schema.lookup` 视为获取精确字段级文档和约束的第一站。在需要更广泛的配置映射、默认值或指向专用子系统参考的链接时，请使用 [配置参考](/gateway/configuration-reference)。

内置的 `gateway` 工具直接通过允许代理运行的网关调度配置读取，而无需打开环回 WebSocket。显式 `gatewayUrl` 或 `gatewayToken` 覆盖和独立本地代理仍使用网关客户端。两个路径使用相同的配置处理程序和读取范围。

<Note>
Control-plane 写入（`config.apply`、`config.patch`、`update.run`）的速率限制为每个方法、每个 `deviceId+clientIp` 每 60 秒 30 个请求；参见[速率限制](/gateway/security/rate-limiting)。重新启动请求合并，然后在重新启动周期之间强制执行 30 秒的冷却时间。 `update.status` 是只读的，但具有管理范围，因为重新启动哨兵可以包含更新步骤摘要和命令输出尾部。
</Note>

部分补丁示例：

```bash
openclaw gateway call config.get --params '{}'  # capture payload.hash
openclaw gateway call config.patch --params '{
  "raw": "{ channels: { telegram: { groups: { \"*\": { requireMention: false } } } } }",
  "baseHash": "<hash>"
}'
```

`config.patch` 在配置文件中记录显式提供的值，即使它们等于当前运行时默认值。未更改的运行时默认值将被忽略。其成功响应包括 `changedPaths`（验证和秘密恢复后更改的有效运行时路径）或 `[]`（无操作）。这些路径不包含配置值；即使秘密值被编辑，客户端也可以使用它们来区分通道更改和不相关的写入。

对于仅需要提交确认的调用者，`config.patch` 也接受 `response: "summary"`。它从响应中省略了完整的配置。不需要运行时重新加载工作的更改摘要也省略了重新启动标记。维护可编辑配置草案（包括 Control UI）的客户端保留默认的完整响应，以便他们可以采用已提交的修订版本而不会丢失待处理的编辑。在任一模式下，验证、持久性和运行时应用程序都会在确认之前完成。

`config.apply` 和 `config.patch` 都接受 `raw`、`baseHash`、`sessionKey`、 `note` 和 `restartDelayMs`。一旦配置文件已经存在，两个方法都要求提供 `baseHash`（首次写入且不存在现有配置时会跳过检查）。

对于热应用的更改，这些 RPC 会等待活动网关应用确切的写入。频道或插件重新加载可能会因不相关的活动工作而推迟。插件的动态读取合约涵盖的仅策略写入（例如 Discord 允许列表和 DM/group 策略）无需通道重新启动或耗尽等待即可发布。还包含需要重新启动的设置的写入仍然是一项延迟事务。如果文件观察程序在等待期间接管相同的未应用的写入，则 RPC 通过重播保持挂起状态；单独的持久性并不是应用程序的确认。如果观察者在托管通知到达之前已经应用了确切保存的源，则 RPC 会确认已完成的应用程序，而无需再次解析机密或扫描技能。关闭、被不同内容取代或应用程序失败将返回 `UNAVAILABLE` 以及恢复指导。 `config.set` 仅确认持久性。

当提交的写入无法完成运行时应用程序时，错误的 `details.persistedConfig` 包含已编辑的提交的 `config` 及其公共 `hash`（如果可用）。该收据确认了坚持，而不是申请。客户可以保留不相关的草稿编辑并将该修订版本用于后续写入；通常的 `baseHash` 检查仍然拒绝干预更改。重试未更改的补丁可能会返回无操作，这不会重新应用已保存的配置。按照错误的 `config.apply` 或重新启动指南来恢复应用程序。具有回滚结果的发布失败不包括此收据。

`channels.status` 报告 `statusIssues` 中的活动工作延迟，以及 Control UI 和 `openclaw channels status` 中显示的通道策略诊断。当该通道的重新加载被推迟时，`channels.start` 还会返回诊断信息；手册 stop/start 继续使用已发布的运行时配置。等待活动工作完成并刷新状态。这些诊断描述了延迟的通道重新加载，而不是每个持久但未应用的配置状态。

一旦提交重新加载，它就会在应用更新的配置之前完成其模型和通道工作。如果该工作需要重启恢复，则RPC返回`UNAVAILABLE`；等待网关重新启动，然后使用 `config.get` 验证活动版本。

`config.patch` 还接受 `replacePaths`，这是一个配置路径数组，其数组替换或删除是有意的。如果补丁删除现有阵列条目或删除阵列，网关将拒绝写入，除非确切的阵列路径出现在 `replacePaths` 中。删除包含对象需要其包含的数组路径，包括空数组。删除整个数组只需要其自己的路径，而不需要嵌套在其条目内的数组的路径。使用精确的记录密钥，例如 `agents.entries.main.skills`。对于 ID- 合并条目更新，嵌套数组路径使用 `[]`，例如 `models.providers.custom.models[].input`。父路径和 `*` 通配符不授权后代数组。这可以防止截断的 `config.get` 快照默默地破坏路由或白名单阵列。当您打算替换完整配置时，请使用 `config.apply`。

具有稳定 `id` 字段的对象数组将按 ID 合并，除非它们的路径出现在 `replacePaths` 中。这些更新将创作的字段保留在未触及的条目中；运行时默认值（例如模型目录兼容性和上下文预算）不会保存到同级条目中。显式配置的值仍然具有权威性。
