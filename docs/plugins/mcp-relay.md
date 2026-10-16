---
summary: "通过选择加入 MCP 中继插件将 ChatGPT 和 Claude 连接到您的网关"
read_when:
  - "将远程 MCP 客户端连接到 OpenClaw 网关"
  - "配对或撤销 ChatGPT 或 Claude 连接器"
  - "在 ChatGPT 中显示完整的 Control UI"
title: "MCP 继电器"
---

# <a id="mcp-relay"></a> MCP 继电器

捆绑的 `mcp-relay` 插件通过出站 WebSocket 将您的网关连接到 `https://mcp.openclaw.ai`。远程MCP客户端（例如ChatGPT、Codex、Claude）连接到`https://mcp.openclaw.ai/mcp`；您不需要向互联网公开网关端口。在ChatGPT和Codex中，OpenClaw与网关的完整Control UI一起出现在侧栏中，一个连接可以在多个网关之间切换。

该插件默认为**禁用**。启用它会选择您的网关进入出站中继连接。每个客户还需要您通过 **授权的授权，使用您的 Gateway** 或一次性配对代码登录。登录是可选的；配对码仍然可用。

## <a id="set-up-the-gateway"></a> 设置网关

启用捆绑的插件，然后检查其实时连接：

```bash
openclaw plugins enable mcp-relay
openclaw mcp-relay status
```

如果网关已停止，请在运行 status 命令之前启动它。插件启用通常适用于正在运行的网关；遵循该命令打印的任何重新启动或重新加载指令。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

默认中继不需要插件配置。要选择不同的中继或默认代理，请使用：

```json5
{
  plugins: {
    entries: {
      "mcp-relay": {
        enabled: true,
        config: {
          relayUrl: "https://mcp.openclaw.ai",
          agentId: "main",
        },
      },
    },
  },
}
```

`relayUrl` 必须是没有凭据、路径、查询或片段的 HTTPS 源。本地开发也接受`http://localhost:<port>`和`http://127.0.0.1:<port>`。 `agentId` 是可选的，当客户端未选择代理时，它会为新对话选择默认代理。

<a id="connect-chatgpt-or-claude" />

## <a id="connect-chatgpt%2C-codex%2C-or-claude"></a><a id="connect-chatgpt-codex-or-claude"></a> Connect ChatGPT、Codex 或 Claude

添加 `https://mcp.openclaw.ai/mcp` 作为 ChatGPT 中的插件或 Claude 中的自定义连接器。在中继的连接页面上，选择 **使用网关** 登录，然后输入网关的 Control UI URL。您的浏览器使用正常登录方式打开网关的 **Connected apps** 页面。中继不会获取您的网关 URL 或接收您的网关凭据。

Codex 在 CLI 和桌面应用程序之间共享其 MCP 服务器。添加一次中继，然后登录；登录打开相同的中继连接页面：

```bash
codex mcp add openclaw --url https://mcp.openclaw.ai/mcp
codex mcp login openclaw
```

检查应用程序名称并返回主机，选择其访问权限，然后选择 **Allow** 或 **Deny**。这两种选择都会让您返回中继以完成请求。请求将在十分钟后过期。如果请求已过期，请从应用程序重新启动。从应用程序链接另一个网关使用相同的同意流程。

默认访问权限为 **Read 和 write**，受您当前角色的限制。 **完整角色访问权限** 还包括您的角色允许的任何管理或批准权限。完全访问权限允许嵌入式 Control UI 执行这些操作；仅为应用程序选择它并传递您信任的该权限。应用程序的访问权限永远不能超出您当前的网关权限。

### <a id="pair-with-a-code"></a> 与代码配对

1. 在网关的Control UI中打开**连接的应用程序**，然后选择**与代码**配对。选择访问权限并创建代码。在单用户网关上，您还可以在网关主机上运行 `openclaw mcp-relay pair`。
2. 在中继的连接页面，验证app名称并返回主机，输入`XXXXX-XXXXX`代码，然后连接。

代码在十分钟后过期，并且只能使用一次。空格、连字符和字母大小写并不重要。如果代码过期，请创建一个新代码。配对需要连接继电器插座；如果发码失败请检查`openclaw mcp-relay status`。在使用经过验证的配置文件的网关上，以您自己的身份登录时，在 **Connected apps** 中创建代码； CLI 拒绝创建无人补助金。

## <a id="connected-apps"></a> 连接的应用程序

**连接的应用程序** 选项卡列出了您的授权及其访问限制。您可以撤销自己的资助；管理员可以查看和撤销所有授权。在单用户网关上，具有管理员访问权限的操作员可以创建所有者授权。在具有经过验证的配置文件的网关上，每项授权都属于批准它的人，包括管理员批准的授权。

## <a id="use-several-gateways"></a> 使用多个网关

一个 ChatGPT 或 Codex 连接可以容纳多个网关，例如个人网关和团队网关。每个链接的网关都有自己的授权、主体和访问限制，并显示在该网关的 **Connected apps** 选项卡中。

在嵌入式 Control UI 中，打开身份菜单。其 **Gateway** 部分列出了链接的网关：选择一个来切换页面，选择 **设置为主要**，或选择 **网关设置…** 打开 **网关**。如果没有嵌入的 UI，**Gateways** 按钮会打开相同的对话框。在那里你可以：

- 将网关与 **链接使用 Gateway** 及其 Control UI URL 或使用该网关的配对代码登录。
- **Open** 侧边栏中的网关。
- **设置primary**以选择模型的对话工具使用的网关。
- **Remove** 链接网关，这会撤销其授予。

您首先连接的网关无法从此列表中删除。断开 ChatGPT 或 Codex 中的连接器，或在该网关的 **Connected apps** 选项卡中撤销其授予。

### <a id="team-gateways"></a> 团队网关

使用 [Cloudflare Access](/gateway/cloudflare-access) 受信任代理身份验证并配置角色的团队网关的工作方式相同。 **使用网关登录** 在正常登录后打开网关的 Control UI，并且您以自己的身份批准该请求。该授权是与您经过验证的个人资料绑定的个人授权，因此 **完整角色访问权限** 将您的角色带入应用程序，包括管理员访问权限（如果您的角色拥有该权限）。后来的角色变化也限制了补助金。有关网关设置，请参阅 [团队服务器](/gateway/team-server)。

## <a id="show-the-full-control-ui-in-chatgpt"></a> 在ChatGPT中显示完整的Control UI

配对后，在 ChatGPT 中打开 OpenClaw 以使用网关的完整 Control UI。没有额外的插件配置：HTTP 和 WebSocket 流量通过现有的出站中继连接传输。网关可以保留在专用网络上。中继为 UI 及其沙箱提供每个授权的单独 HTTPS 源，并保留网关配置的 Control UI 基本路径。

该插件需要具有主体绑定入口支持的当前网关。中继还必须支持 UI 隧道。嵌入式浏览器使用授权主体和访问限制；它不接收或存储普通的配对设备令牌。您不要将网关的共享令牌或密码粘贴到 ChatGPT 中。

单用户网关使用所有者授权。使用受信任代理身份验证或配置角色的网关需要与现有已验证配置文件相关联的人员授权。旧所有者对这些网关的授予被拒绝，并被拒绝作为个人再次配对。相同的实时主体和权限适用于 MCP 操作和嵌入式 Control UI。

运行 `openclaw mcp-relay status` 以查看 UI 可用性和任何更新指南。在首次启动之前，可用性仅检查网关和中继是否支持隧道。如果不支持网关身份验证，则首次启动会在框架内显示配置错误。更正配置后，再次打开UI重试。没有隧道支持的网关或中继保留内置对话视图。

通过 **连接的应用程序** 撤销应用程序以关闭其嵌入式浏览器会话、活动请求、套接字和 MCP 访问。嵌入式浏览器不会创建需要单独撤销的普通设备令牌。

**中继看到 UI 传输中的流量和内容。** TLS 保护每个连接，但这不是针对中继的端到端加密。仅当您信任应用程序以及具有您选择的访问权限的中继时，才将其配对。

网关入口和中继强制执行请求、套接字、缓冲区和超时限制。该插件将有效负载分割成最多 512 个 KiB 的块，以适应 1 MiB 中继帧的限制。过大或停滞的工作明显失败。断开中继会关闭其活动请求和套接字。沙箱来源WebSocket打开被拒绝；沙盒仅提供其专用的 HTTP 内容。

## <a id="available-operations"></a> 可用操作

配对的客户端可以检查网关和代理状态，列出带有标题和预览的对话，阅读用户和助理消息页面，以及将消息发送到现有或新对话。会话 ID 是不透明的网关会话密钥。文本结果被截断为每个字段 16,000 个字符，并且每个响应保持在 512 KiB 以下。

发送消息或请求回复最多可以等待 50 秒。如果运行仍处于活动状态，客户端会收到 `running`，并可以使用返回的对话和运行 ID 再次请求回复。消息使用普通操作员输入；转录本不添加明显的 `mcp-relay` 源标签。

回复来自运行的终端回复快照。没有可见回复的成功运行在没有回复文本的情况下完成。如果该快照不再可用，结果是 `completed`，并出现错误，指示客户端使用 `read_conversation` 查看对话历史记录。该插件不会从成绩单页面重建回复。

此版本无法区分等待批准的运行和另一个活动的运行。继续报告`running`；它从不报告 `waiting_for_approval`。如果进度停滞，请在 OpenClaw 中打开对话并检查批准提示。

MCP 会话操作不会公开任意网关方法。他们的请求作为授权主体运行，在其选定的访问限制和主体的当前权限范围内。仅当授权的访问限制和委托人的当前角色都允许时，嵌入式 Control UI 才能使用其他功能，包括管理和审批。发送消息可以使代理根据自己的策略采取实际行动。

## <a id="data-and-authority"></a> 数据及权限

网关在插件拥有的 SQLite 状态中生成并保留自己的 Ed25519 身份。中继接收公钥和签名质询，而不是配置的网关令牌或密码或私钥。配对代码哈希和客户端授权也存在于插件拥有的 SQLite 状态中，并且在网关重新启动和更新后仍然存在。

网关授权每项授权并检查其对每项操作的实时权限。赠款将所有者或个人主体以及操作员范围上限存储在插件自己的状态中。个人资料 ID 保留在网关上；继电器仅接收主要类型和显示标签。有效访问权限是上限与委托人当前权限的交集，因此角色变更也会限制现有的授权。赠款不限于一次对话；正常的主体和角色可见性仍然适用。

通过网关登录批准的人员授予的绝对刷新令牌生命周期为 30 天。之后，再次登录并批准。所有者授予和配对代码授予保留其现有的中继令牌生命周期。撤销、插件禁用或失去主体权限可以更快地结束访问。

**此连接未进行端到端加密。** TLS 保护每个网络连接，但中继会看到传输中的请求和响应内容。中继设计为不存储或记录消息内容；它存储客户端注册以及路由和授权所需的令牌、配对和授权元数据。请参阅 [ 继电器隐私政策 ](https://mcp.openclaw.ai/privacy)。受损的中继可以使用现有的授权来访问允许的操作。

## <a id="inspect%2C-revoke%2C-or-disable"></a><a id="inspect-revoke-or-disable"></a> 检查、撤销或禁用

```bash
openclaw mcp-relay status
openclaw mcp-relay grants
openclaw mcp-relay revoke <grantId>
```

这些命令作用于正在运行的网关。添加 `--json` 以获取机器可读的输出。 CLI 请求管理员访问权限以进行配对、列出和撤销授权；连接状态需要操作员读取访问权限。在 **Connected apps** 中，列出您自己的授权需要读取访问权限，而配对和撤销您自己的授权则需要写入访问权限。创建所有者授权或撤销他人的授权需要管理员访问权限。拨款清单包括主体和范围上限。

在网关通知中继之前，撤销会在本地保留。如果中继离线，网关仍然拒绝使用该授权的进一步请求；该命令报告中继是否收到通知。被撤销的客户端必须再次配对才能重新获得访问权限。

要断开所有客户端的连接，请禁用该插件：

```bash
openclaw plugins disable mcp-relay
```

禁用会停止出站连接。它保留身份和授予状态；如果您希望在重新启用插件后仍保留其访问权限，请先撤销授予。

## <a id="related"></a> 相关内容

- [管理插件](/plugins/manage-plugins)
- [控制 UI](/web/control-ui)
- [设备](/cli/devices)
- [操作员范围](/gateway/operator-scopes)
- [网关安全](/gateway/security)
