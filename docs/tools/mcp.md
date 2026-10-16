---
summary: "将 MCP 服务器从 Control UI、CLI 或配置连接到 OpenClaw"
title: "连接 MCP 服务器"
read_when:
  - "为 OpenClaw 代理添加 MCP 服务器"
  - "在设置和 `openclaw mcp` 之间进行选择"
  - "排查 MCP 传输、OAuth 或工具发现问题"
---

模型上下文协议（MCP）是一种让智能体借用其他程序工具的方式：MCP 服务器会公开工具、资源和提示，OpenClaw 连接到它后，即可将这些工具提供给你的智能体。服务器定义位于配置中的 `mcp.servers` 下，而它们公开的工具会遵循与其他所有内容相同的工具配置文件和工具策略控制——连接服务器不会绕过你的策略。

<Note>
本指南介绍的是将第三方 MCP 服务器连接**到 OpenClaw**。反过来，如果要将 OpenClaw 频道中的对话公开给另一个 MCP 客户端，请使用 [`openclaw mcp serve`](/cli/mcp#openclaw-as-an-mcp-server)。
</Note>

## <a id="add-a-server-from-settings"></a> 从设置中添加服务器

1. 打开Control UI并进入**设置→MCP**。
2. 在 **已配置的服务器** 下，选择 **添加服务器**。
3. 为其指定一个唯一名称，并选择传输方式：**可流式传输的 HTTP**、**SSE** 或 **Stdio**。
4. 对于 HTTP 传输方式，输入服务器的 `http://` 或 `https://` URL。对于 stdio，输入命令及其参数。
5. 选择 **添加服务器**。

这会通过 Gateway 写入新的 `mcp.servers` 条目。对于超出基本配置的内容——请求头、环境值、OAuth 元数据、TLS 设置、超时、并行工具调用提示、工具过滤器——请使用页面下方的作用域配置编辑器。服务器行还允许你启用、禁用或移除定义。

服务器保存后，请验证它确实能够响应：

```bash
openclaw mcp doctor <name> --probe
```

保存定义并不能证明可达性——检查可以证明这一点。启用网关热重载后，更改或删除的服务器将立即退出，下一回合的发现将使用新定义。未更改的服务器保留其连接和缓存的工具，包括已经正在进行的运行。请求者登录工具在运行时替换后刷新下一条消息。

如果连接的服务器退出或其连接必须更换，OpenClaw 会将其最后成功列出的工具和实用程序保留在会话的面向模型的目录中，同时恢复在后台运行。连接诊断和工具调用错误仍然报告不可用；保留的模式不授予执行访问权限。成功的列表会替换目录，包括服务器删除的工具。显式配置更改、删除和插件重新加载会立即停用更改后的运行时；未更改的服务器保留其目录。

对于旧版 SSE 服务器，重新连接到同一会话端点会保留会话。如果服务器宣布新端点，OpenClaw 会在发送进一步的工具调用之前重新连接并初始化新会话。

当 OpenClaw 的内置 MCP 客户端无法启动服务器时，新的运行时会在指数退避期间跳过它：30 秒，加倍最多 10 分钟。遇到第一次失败的运行时可以按照正常的五秒目录计划重试一次，在退出失败的连接后使用新连接。如果该运行时从未成功列出服务器，则重试到期后的第一回合将等待有限连接和目录列表，因此恢复的工具在该回合可用。如果该恢复尝试也失败，则将应用相同的指数退避。故障状态在普通会话清理后仍然存在，并且范围仅限于服务器配置和请求者。有效的工具清单显示服务器不可用，下一步是该运行时的下一次重试时间和可达性检查。每次失败重试记录一次；跳过的运行不会重复警告。成功的连接、配置发布或显式 MCP 重新加载会清除退避。重新加载拥有该连接的进程； CLI 重新加载不会重置单独的网关。

## <a id="add-a-server-from-the-composer"></a> 从编写器添加服务器

在 Control UI 聊天中，选择 **+** → **连接器** → **添加 MCP 服务器…**。该对话框使用与设置相同的服务器字段，并且需要管理员权限。

选择 **This session** 进行仅会话启用，或选择 **Everywhere** 进行全局启用。任一范围都保存全局服务器定义；会话策略是每个会话层。有关完整范围和工具访问行为，请参阅 [Composer 功能菜单](/web/control-ui/chat#composer-capability-menu)。

在活跃对话中，打开 **+ → 连接器 → 工具访问**，即可查看或拒绝该会话中的单个工具。该视图遵循会话的实际运行时所有者：内置 OpenClaw 会话读取进程内 MCP 目录，而原生代理工具可以提供其线程所有的目录。会话服务器和工具拒绝设置会由任一运行时在下一轮开始前强制执行。

## <a id="add-a-server-from-the-cli"></a> 从 CLI 添加服务器

本地 stdio 服务器：

```bash
openclaw mcp add local-tools \
  --command node \
  --arg ./dist/mcp-server.js \
  --cwd /srv/openclaw-tools
openclaw mcp doctor local-tools --probe
```

远程 Streamable HTTP 服务器，仅公开其中一部分工具：

```bash
openclaw mcp add docs \
  --url https://mcp.example.com/mcp \
  --transport streamable-http \
  --include 'search,read_*'
openclaw mcp doctor docs --probe
```

有用的同伴：`openclaw mcp status --verbose` 用于仅配置摘要，`openclaw mcp probe <name>` 用于实时功能，以及 `openclaw mcp login <name>`（当 HTTP 服务器使用 OAuth 时）。 [MCP CLI 参考](/cli/mcp) 记录每个命令、标志和输出形状，以及单独的`mcp serve` 桥。

## <a id="configure-a-server-directly"></a> 直接配置服务器

同一个 `docs` 服务器，直接写入配置：

```json5
{
  mcp: {
    servers: {
      docs: {
        url: "https://mcp.example.com/mcp",
        transport: "streamable-http",
        enabled: true,
        connectionTimeoutMs: 5000,
        requestTimeoutMs: 20000,
        toolFilter: {
          include: ["search", "read_*"],
        },
      },
    },
  },
}
```

启用的服务器需要命令（stdio）或 URL（SSE 或可流式传输的 HTTP）之一。服务器名称 `__proto__` 已被保留；请选择其他名称。设置 `enabled: false` 会保留该定义，但不会连接服务器。不要将凭据写入配置字面量中——请通过受支持的机密机制存储敏感标头和环境变量值。

## <a id="interactive-apps-and-plugin-extensions"></a> 交互式应用程序和插件扩展

MCP 服务器还可以提供沙盒交互式视图。启用选择加入的 [MCP 应用程序主机](/cli/mcp/apps) 以使用这些视图和支持的 [ 插件扩展](/cli/mcp/apps#plugin-extensions)，包括应用程序入口点、设置、编写器资源和工作区文件查看器。连接服务器不会自动启用其 UI 代码或绕过会话工具权限。

## <a id="approvals"></a> 审批

Codex MCP工具审批遵循会话权限姿势：默认全权限姿势不提示，而更严格模式检查工具没有安全注释（`workspace`可以使用自动审核；`guarded`和`read-only`可以提示操作员）。

当提供持久持久性时，**Allow Always** 会为确切配置的服务器和工具保存每个代理的授权，即使其参数发生变化也是如此。这适用于网关托管的 Codex，当 OpenClaw 可以明确地将批准与网关拥有的实时工具调用相匹配时；缺失或不明确的匹配保留 Codex 的 native/session 行为。 Codex 应用程序、本机插件服务器和计算机使用服务器不包括在内。授予在重新启动后存活并在下一个线程配置和钩子注册时应用，例如新会话或重新启动；当前会话使用 Codex 记住的决策。

覆盖服务器`openclaw mcp configure <server> --approval approve|prompt|auto`；显式模式优先于基于姿势的默认模式。存储的补助金仅适用于`auto`或未指定的服务器模式；明确的`prompt`一直问。通过以下方式检查或撤销补助金[MCP工具补助金](/tools/exec-approvals#mcp-tool-grants)。看[法典工具批准](/cli/mcp#codex-tool-approvals)欲了解详情和[本地批准Slack](/channels/slack/rich-messages#native-approvals-in-slack)为了Slack按钮交付。

## <a id="troubleshooting"></a> 故障排查

### <a id="the-server-appears-in-settings-but-exposes-no-tools"></a> 服务器出现在设置中，但未提供任何工具

运行 `openclaw mcp doctor <name> --probe`。Doctor 会先验证已保存的定义，然后建立实时连接，并报告服务器公布的工具及其他功能。如果连接成功但缺少预期工具，请检查 `toolFilter.include` 和 `toolFilter.exclude`。

### <a id="a-stdio-server-does-not-start"></a> stdio 服务器无法启动

确认 `command` 能够在 Gateway 进程环境中解析，并且 `cwd` 存在。参数应放在 `args` 中，显式指定 `transport: "stdio"` 时必须提供非空的 command。

对于 OpenClaw 的内置 MCP 客户端启动的服务器，调试日志在 stderr 诊断中添加 `bundle-mcp:<name>:` 前缀。 Unicode 字符在拆分写入后仍然存在，并保留关闭诊断信息。没有换行符的输出在被记录为进度片段之前会短暂缓冲最多 250 毫秒；这不会等待服务器停止写入。超过 8 KiB 缓冲区的诊断将保留其带有 `[stderr line truncated]` 标记的 Unicode 安全尾部。

### <a id="an-http-server-needs-authorization"></a> HTTP 服务器需要授权

如果 Streamable HTTP 服务器拒绝使用 HTTP 401 进行初始化，则其启动日志和目录诊断报告 `authentication refused (401)` 以及配置的服务器名称。检查 `mcp.servers` 下该条目的凭据，或者如果使用 OAuth 则重新登录。响应正文和标头值保持编辑状态；诊断不会公开服务器的原始错误消息。

设置 `auth: "oauth"` 以及任何所需的 `oauth` 元数据。在 **设置 → MCP** 中，管理员可以为使用共享本机 OAuth 凭证的已启用 HTTP 服务器选择 **登录**。在浏览器中批准访问，然后返回“设置”。如果浏览器阻止新选项卡，请使用对话框中的登录链接。

**身份验证已保存** 表示凭据已保存在开始登录时选择的网关上。它不能证明服务器可以访问或其工具可以工作；接下来运行检查或使用连接器。更改选定的网关或代理将关闭该对话框。网关重新启动会结束未完成的浏览器登录，但不会删除已保存的凭据。

浏览器登录需要在网关自己的 HTTPS 地址（包括运营商管理的反向代理或 Tailscale 服务路由）、其本地环回地址或其发布的 Tailscale 地址上进行设置。单独托管的 UI 无法接收网关的回调。较旧的网关和不受支持的地址保留终端指令。具有现有身份验证配置文件映射或每个请求者身份的服务器将使用该帐户的登录路径；设置不会为他们创建第二个凭据。

未完成的 CLI 尝试可能会留下 CLI 回调的客户端注册。当未保存凭据时，浏览器登录会自动注册自己的回调。与保存的凭据关联的注册将被保留，因此刷新令牌仍然可用。

如果 **Sign in** 不可用，或者现有凭据需要 CLI 回调，请在拥有连接器的安装上运行以下命令：

```bash
openclaw mcp login <name>
```

请遵循打印的授权书 URL。 OpenClaw 通常捕获环回重定向并自动保存凭据；当浏览器无法到达回调侦听器时，使用打印的 `--code` 命令。

### <a id="changes-do-not-reach-an-active-agent"></a> 更改未传达到活动代理

`openclaw mcp reload` 会刷新当前 CLI 进程拥有的运行时。运行在其他位置的 Gateway 或代理需要单独执行重新加载、发布配置或重启。

## <a id="related"></a> 相关内容

- [控制 UI](/web/control-ui/chat#composer-capability-menu)
- [MCP CLI 参考](/cli/mcp)
- [管理插件](/plugins/manage-plugins)
- [工具策略](/tools)
