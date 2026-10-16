---
summary: "将节点命令列入白名单，将 exec 指向节点，直接调用命令"
read_when:
  - "将 exec 工具调用路由到配对节点"
  - "将节点命令列入白名单或将 exec 绑定到一个节点"
  - "通过原始 RPC 调用节点命令"
title: "在节点上运行命令"
sidebarTitle: "Node 执行"
---

## <a id="allowlist-the-commands"></a> 允许列出命令

exec 批准是**按 node 主机**进行的。通过 gateway 添加允许列表条目：

```bash
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/uname"
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/sw_vers"
```

批准信息保存在 node 主机上的 `~/.openclaw/state/openclaw.sqlite#exec_approvals_config` 中。

## <a id="point-exec-at-the-node"></a> Point在节点执行

配置默认值（网关配置）：

```bash
openclaw config set tools.exec.host node
openclaw config set tools.exec.mode allowlist
openclaw config set tools.exec.node "<id-or-name>"
```

或者在每个会话中：

```text
/exec host=node security=allowlist node=<id-or-name>
```

设置后，任何使用 `host=node` 的 `exec` 调用都会在节点主机上运行（受节点 allowlist/approvals 的约束）。

引用包含文字 shell 分隔符的参数，例如 OAuth 回调 URL：`/usr/bin/printf '%s\n' 'http://127.0.0.1:9876/oauth2/callback?state=example&code=example'`。单引号或双引号通过批准准备保留文字分隔符。逃跑的`\&`也通过了准备；引用完整的 URL 以防止 shell 通配符扩展。正常的节点执行策略和人工批准仍然适用。

子命令保留节点的配置文件和状态路径，但不继承其守护程序身份或本机服务选择器。这使得 `openclaw gateway status` 和 `openclaw update` 能够独立于节点服务检查网关。允许环境中的显式服务选择器覆盖仍然适用。

`host=auto` 不会隐式自行选择节点。仅当没有沙箱运行时处于活动状态时，才允许来自 `auto` 的显式每次调用 `host=node` 请求；当沙箱运行时处于活动状态时，`auto` 会拒绝它。要从沙盒会话在节点上运行，或者使节点默认执行会话，请显式设置 `tools.exec.host=node` 或 `/exec host=node ...`。

相关：

- [Node 主机 CLI](/cli/node)
- [Exec 工具](/tools/exec)
- [执行批准](/tools/exec-approvals)

## <a id="channel-and-subagent-context"></a> 通道和子代理上下文

通告 `system.run.execution-context.v1` 的节点在 `system.run.prepare` 和 `system.run` 上接收可选的 `executionContext`。它的唯一字段是 `senderId`、`chatId`（非空字符串）和 `subagent`（`true` 如果存在）。该节点将具有 sender/chat 身份 JSON 和 `OPENCLAW_SUBAGENT_EXEC=1` 的 `OPENCLAW_CHANNEL_CONTEXT` 注入子环境中。这些路由提示不授予会话、轮次或命令批准权限，也不修改批准的 argv。当上下文存在时，它会替换两个路由标记，包括继承的值。省略的字段不保留先前的通道或子代理提示。没有类型化上下文的请求保留其现有的环境行为。

自定义 `env` 覆盖仍然遵循节点的现有限制。支持此上下文不会在拒绝它们的 Windows 伴随节点上启用任意环境覆盖。在公布该功能之前，节点必须通过其准备、批准和启动路径来支持上下文。

更新网关和节点以使用此传输，并在重新连接后请求时批准 **Devices** 中更新的节点功能表面。较旧的网关不断通过 `env` 发送标记；较新的网关对没有该功能的节点执行相同的操作。该兼容性路径保留了现有行为，包括旧版 Windows 同伴上的 `custom-env-not-supported`。网关不会忽略标记来绕过该拒绝。不支持的上下文请求在分派之前被拒绝；重新连接不具备该功能的节点不会默默地降级已准备好的请求。无需更改协议版本或配置。

对于连接到远程网关的 `openclaw agent --local`，CLI 还会检查网关公布的功能。即使节点已更新，较旧的网关也会选择现有的 `env` 传输。发现后网关降级会在分派之前拒绝键入的请求，而不是删除其上下文。

## <a id="invoking-commands"></a> 调用命令

低层级（原始 RPC）：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command device.info --params '{}'
```

`nodes invoke` 区块 `system.run` 和 `system.run.prepare`；这些命令仅通过 `exec` 工具和 `host=node` 运行（见上文）。更高级别的帮助程序适用于常见的“为代理提供 MEDIA 附件”工作流程（摄像机、屏幕、位置：请参阅 [ 节点设备命令](/nodes/device-commands)）。

长时间运行的流节点命令使用附加 `node.invoke.progress` 事件。每个事件都携带调用 ID、一个从零开始的序列号和一个有界 UTF-8 文本块；网关在将块传递给调用者之前对它们进行排序。现有的`node.invoke.result`仍然是单端响应。流式调用者可以设置一个不活动截止时间，该截止时间从第一个进度事件开始，并在后续进度后重置，同时在批准和执行期间保留调用的单独硬超时。结果，硬超时、不活动超时和节点断开所有丢弃挂起流状态。呼叫者取消发出 `node.invoke.cancel` 以及已发布的 `NodeInvokeCancelEvent` 有效负载（`invokeId` 和 `nodeId`）；然后节点主机终止匹配的进程树。现有的 request/response 命令不变。

## <a id="codex-sessions-on-a-node"></a> 节点上的 Codex 会话

使用 Codex 运行时的会话主机还需要在 **节点主机的** OpenClaw 配置中安装并启用 `codex` 插件。 `--session-host` 本身不会安装或启用此插件。在节点上，如果缺少，请安装它，然后启用它：

```bash
openclaw plugins install @openclaw/codex
openclaw plugins enable codex
openclaw node restart
```

如果您在前台运行 `openclaw node run`，请停止并重新启动该进程。重新连接后批准节点更新的命令界面。网关还必须在没有匹配拒绝条目的情况下允许 `gateway.nodes.commands.allow` 中的 `codex.exec-server.stdio.v1`。 Codex执行保留其单独配售批准；启用该插件并不授予该批准。

当节点不通告命令、等待配对批准或被网关策略阻止时，`environments.list` 和 `runtimeId: "codex"` 会报告 `requiredNodeCommand` 状态和可操作的 `message`。缺少节点通告需要在节点上安装并启用插件；仅更改网关白名单无法添加它。有关安装源，请参阅 [Install plugins](/cli/plugins/install)。

请参阅 [Codex 配对设备放置](/plugins/codex-harness/placement#run-codex-on-a-paired-device)。

## <a id="exec-node-binding"></a> Exec 节点绑定

在没有设置节点目标的情况下，`exec host=node` 选择支持 `system.run` 的唯一配对、连接的节点。其他配对设备不会使选择变得模糊。如果连接了多个可执行节点，则每次调用选择一个目标或将 exec 绑定到特定节点；活动 Canvas 目标不会选择执行主机。离线或无法执行命令的绑定或显式目标将被拒绝，而不是重定向到另一个节点。

绑定设置 `exec host=node` 的默认节点，并且可以按代理覆盖。

全局默认值：

```bash
openclaw config set tools.exec.node "node-id-or-name"
```

按 agent 覆盖：

```bash
openclaw config get agents.entries
openclaw config set 'agents.entries.main.tools.exec.node' "node-id-or-name"
```

取消绑定以使用唯一符合条件的节点，或者在连接多个符合条件的节点时为每次调用选择一个目标：

```bash
openclaw config unset tools.exec.node
openclaw config unset 'agents.entries.main.tools.exec.node'
```
