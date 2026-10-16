---
summary: "命令传播、Tailscale 设置、多设备节点以及远程应用配置"
title: "远程网关和节点"
read_when:
  - "您在 VPS 或其他计算机上运行网关"
  - "您正在添加节点或接线 Tailscale"
---

## <a id="remote-gateways-and-nodes"></a> 远程 gateway 和节点

<AccordionGroup>
  <Accordion id="how-do-commands-propagate-between-telegram-the-gateway-and-nodes" title="命令如何在 Telegram、网关和节点之间传播？">
    Telegram 消息由 **gateway** 处理，gateway 会运行 agent，只有在需要节点工具时才通过 **Gateway WebSocket** 调用节点：

    Telegram -> 网关 -> 代理 -> `node.*` -> Node -> 网关 -> Telegram

    节点看不到来自提供方的入站流量；它们只接收 node RPC 调用。

  </Accordion>

  <Accordion id="how-can-my-agent-access-my-computer-if-the-gateway-is-hosted-remotely" title="如果网关是远程托管的，我的代理如何访问我的计算机？">
    将你的电脑配对为一个 **node**。Gateway 运行在别处，但可以通过 Gateway WebSocket 在你的本地机器上调用 `node.*` 工具（屏幕、摄像头、系统）。

    1. 在始终在线的主机（VPS/home 服务器）上运行网关。
    2. 将 Gateway 主机和你的电脑放在同一个 tailnet 中。
    3. 检查网关WS是否可达（尾网绑定或SSH隧道）。
    4. 在本地打开 macOS 应用，并以 **通过 SSH 远程** 模式连接（或直接 tailnet 连接），这样它就会注册为 node。
    5. 批准该 node：
       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    不需要单独的 TCP bridge；nodes 通过 Gateway WebSocket 连接。

    安全提示：配对一个 macOS node 会允许在那台机器上执行 `system.run`。只配对你信任的设备；请查看 [安全](/gateway/security)。

    文档：[Nodes](/nodes)、[Gateway 协议](/gateway/protocol)、[macOS 远程模式](/platforms/mac/remote)、[安全](/gateway/security)。

  </Accordion>

  <Accordion id="tailscale-is-connected-but-i-get-no-replies-what-now" title="Tailscale 已连接，但没有收到回复。现在怎么办？">
    检查基础项：

    ```bash
    openclaw gateway status
    openclaw status
    openclaw channels status
    ```

    然后验证身份验证和路由：如果您使用Tailscale Serve，请确认`gateway.auth.allowTailscale`设置正确；如果您通过 SSH 隧道连接，请确认隧道已启动并指向正确的端口；确认您的 DM/group 许可名单包含您的帐户。

    文档：[Tailscale](/gateway/tailscale)、[远程访问](/gateway/remote)、[Channels](/channels)。

  </Accordion>

  <Accordion id="can-two-openclaw-instances-talk-to-each-other-local-vps" title="两个 OpenClaw 实例可以相互通信（本地 + VPS）吗？">
    可以，不过没有内置的 bot-to-bot 桥接。

    **Simplest**：使用两个机器人都可以访问的普通聊天通道（Slack/Telegram/WhatsApp）。让机器人 A 向机器人 B 发送消息，然后让机器人 B 像往常一样回复。

    **CLI 桥（通用）**：运行一个脚本，使用 `openclaw agent --message ... --deliver` 调用另一个网关，目标是另一个机器人监听的聊天。如果一个机器人位于远程 VPS 上，请通过 SSH/Tailscale 将您的 CLI 指向该远程网关（请参阅 [ 远程访问](/gateway/remote)）：

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    加一个保护措施，防止两个 bot 无限制地循环（仅提及、channel allowlist，或“不要回复 bot 消息”的规则）。

    文档：[远程访问](/gateway/remote)、[Agent CLI](/cli/agent)、[Agent send](/tools/agent-send)。

  </Accordion>

  <Accordion id="do-i-need-separate-vpses-for-multiple-agents" title="我是否需要为多个代理提供单独的 VPS？">
    不会。一个网关托管多个代理，每个代理都有自己的工作区、模型默认值和路由 - 这是正常设置，每个代理比一个 VPS 多 cheaper/simpler。仅将单独的 VPS 用于硬隔离（安全边界）或您不想共享的非常不同的配置。
  </Accordion>

  <Accordion id="is-there-a-benefit-to-using-a-node-on-my-personal-laptop-instead-of-ssh-from-a-vps" title="在我的个人笔记本电脑上使用节点而不是 VPS 上的 SSH 有好处吗？">
    是的：节点是从远程网关访问笔记本电脑并解锁更多 shell 访问权限的一流方式。网关在 macOS、Linux 和 Windows（本机或 WSL2）上运行，并且重量轻（小型 VPS 或 Raspberry Pi-class 盒子就可以；4 个 GB RAM大量），因此常见的设置是始终在线的主机加上您的笔记本电脑作为节点。

    - **不需要入站 SSH** - nodes 通过设备配对主动连接到 Gateway WebSocket。
    - **更安全的执行控制** - `system.run` 由该笔记本电脑上的节点 allowlists/approvals 门控。
    - **更多设备工具** - 除了`system.run`之外，节点还公开`camera`和`screen`； Mac 还公开了小部件面板。
    - **本地浏览器自动化** - 将网关保留在VPS上，但通过节点主机在本地运行Chrome，或通过Chrome MCP连接到本地Chrome。

    SSH 适合临时的 shell 访问；nodes 更适合持续性的 agent 工作流和设备自动化。

    文档：[Nodes](/nodes)、[Nodes CLI](/cli/nodes)、[Browser](/tools/browser)。

  </Accordion>

  <Accordion id="do-nodes-run-a-gateway-service" title="节点是否运行网关服务？">
    不可以。每个主机只能运行 **one 网关**，除非您有意运行隔离的配置文件（请参阅 [ 多个网关](/gateway/multiple-gateways)）。节点是连接到网关的外围设备（iOS/Android 节点，或菜单栏应用程序中的 macOS“节点模式”）。对于无头节点主机和 CLI 控制，请参阅 [Node 主机 CLI](/cli/node)。

    网关绑定、端口和其他启动设置需要完全重新启动。托管插件表面可以通过插件热重载进行更新。具体设置规则请参见[配置热重载](/gateway/configuration/hot-reload)。

  </Accordion>

  <Accordion id="is-there-an-api-rpc-way-to-apply-config" title="是否有 API / RPC 方法来应用配置？">
    是的：

    - `config.schema.lookup`：在写入前，查看一个配置子树及其浅层 schema 节点、匹配的 UI 提示和直接子项摘要。
    - `config.get`：获取当前快照及其 hash。
    - `config.patch`：安全的局部更新（对大多数 RPC 编辑推荐使用）；在可能时热重载，必要时重启。
    - `config.apply`：验证并替换完整配置；在可能时热重载，必要时重启。
    - 面向 agent 的 `gateway` 运行时工具仍然拒绝重写 `tools.exec.ask`／`tools.exec.security`；旧的 `tools.bash.*` 别名会归一化到同一受保护路径。

  </Accordion>

  <Accordion id="minimal-sane-config-for-a-first-install" title="首次安装的最小合理配置">
    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
      channels: { whatsapp: { allowFrom: ["+15555550123"] } },
    }
    ```

    这会设置你的 workspace，并限制谁可以触发 bot。

  </Accordion>

  <Accordion id="how-do-i-set-up-tailscale-on-a-vps-and-connect-from-my-mac" title="如何在 VPS 上设置 Tailscale 并从我的 Mac 进行连接？">
    1. **在 VPS 上安装并登录**：
       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```
    2. **在你的 Mac 上安装并登录**，使用 Tailscale 应用，并确保在同一个 tailnet 中。
    3. **在 Tailscale 管理控制台启用 MagicDNS**，这样 VPS 就会有一个稳定名称。
    4. **使用 tailnet 主机名**：SSH `ssh user@your-vps.tailnet-xxxx.ts.net`；Gateway WS `ws://your-vps.tailnet-xxxx.ts.net:18789`。

    对于没有 SSH 的 Control UI，请在 VPS 上使用 Tailscale 服务：

    ```bash
    openclaw gateway --tailscale serve
    ```

    这使网关绑定到环回并通过 Tailscale 公开 HTTPS。请参见 [Tailscale](/gateway/tailscale)。

  </Accordion>

  <Accordion id="how-do-i-connect-a-mac-node-to-a-remote-gateway-tailscale-serve" title="如何将Mac节点连接到远程网关（Tailscale Serve）？">
    Serve 暴露的是 **Gateway Control UI + WS**；nodes 通过同一个 Gateway WS 端点连接。

    1. 确保 VPS 和 Mac 在同一个 tailnet 中。
    2. 在 macOS 应用中使用 Remote 模式（SSH 目标可以是 tailnet 主机名）——它会隧道转发 Gateway 端口并作为 node 连接。
    3. 批准该 node：
       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    文档：[Gateway 协议](/gateway/protocol)、[Discovery](/gateway/discovery)、[macOS 远程模式](/platforms/mac/remote)。

  </Accordion>

  <Accordion id="should-i-install-on-a-second-laptop-or-just-add-a-node" title="我应该安装在第二台笔记本电脑上还是只添加一个节点？">
    仅适用于第二台笔记本电脑上的 **本地工具** （screen/camera/exec），将其添加为 **节点** - 一个网关，无重复配置。节点公开的本地工具取决于其平台。有关每个平台的默认值，请参阅 [Nodes](/nodes)。仅针对 **硬隔离** 或两个完全独立的机器人安装第二个网关。

    文档：[Nodes](/nodes)、[Nodes CLI](/cli/nodes)、[多个 gateways](/gateway/multiple-gateways)。

  </Accordion>
</AccordionGroup>
