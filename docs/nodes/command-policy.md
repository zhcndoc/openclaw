---
summary: "平台默认白名单、危险命令选择和 gateway.nodes 配置"
read_when:
  - "检查平台默认允许哪些命令"
  - "选择危险或涉及隐私的节点命令"
  - "配置 gateway.nodes 和 tools.exec"
title: "Node 命令策略"
sidebarTitle: "指挥方针"
---

## <a id="command-policy"></a> 命令策略

设备配对后，节点命令必须满足三个要求才能调用：

1. 该节点必须在其经过身份验证的连接元数据（`connect.commands`）中声明该命令。
2. 该命令必须位于其配对设备记录上节点批准的命令表面中。
3. 网关的平台和批准派生允许列表必须包含声明的命令。

使用 `openclaw nodes pending` 和 `openclaw nodes approve <nodeRequestId>` 批准待处理的曲面。该请求 ID 与设备请求 ID 不同。初始未经批准的表面没有有效命令。在待扩展期间，只有先前批准的仍然声明和允许的命令才有效。这些检查后，本地执行批准和操作系统权限仍然适用。

按平台划分的默认允许列表（在插件默认值以及 `commands.allow`/`commands.deny` 覆盖之前）：

| 平台 | 默认允许的命令                                                                                                                                                                                                                                                                                                                                 |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS      | `camera.list`, `location.get`, `device.info`, `device.status`, `contacts.search`, `calendar.events`, `reminders.list`, `photos.latest`, `motion.activity`, `motion.pedometer`, `system.notify`                                                                                                                                                              |
| 手表操作系统  | `device.info`, `device.status`, `system.notify`                                                                                                                                                                                                                                                                                                             |
| Android  | `camera.list`, `location.get`, `notifications.list`, `notifications.actions`, `system.notify`, `device.info`, `device.status`, `device.permissions`, `device.health`, `device.apps`, `contacts.search`, `calendar.events`, `callLog.search`, `reminders.list`, `photos.latest`, `motion.activity`, `motion.pedometer`, `mobile.ui.observe`, `mobile.ui.act` |
| macOS    | `camera.list`, `camera.ptz.status`, `location.get`, `device.info`, `device.status`, `device.apps`, `contacts.search`, `calendar.events`, `reminders.list`, `photos.latest`, `motion.activity`, `motion.pedometer`, `system.notify`, `computer.act`                                                                                                          |
| Windows  | `camera.list`, `location.get`, `device.info`, `device.status`, `system.notify`, `computer.act`                                                                                                                                                                                                                                                              |
| Linux    | `system.notify`, `computer.act`（像 `system.run` 这样的节点主机命令需要审批门控，见下文）                                                                                                                                                                                                                                                        |

这些行描述了网关策略上限，而不是每个节点应用程序实现的命令。仅当连接的节点也声明该命令时，该命令才可用。特别是，Android 仅在启用辅助功能 Control 时才通告移动 UI 命令，而桌面节点仅在启用其本地计算机 Control 实现器时通告 `computer.act`。当前的 macOS 应用程序不会声明 macOS 策略行中列出的设备和个人数据系列。

插件拥有的默认值仅针对插件支持的表面扩展平台表：

| 插件 | 平台 | 默认允许的命令                        |
| ------ | -------- | -------------------------------------------------- |
| 画布 | macOS    | `canvas.present`, `canvas.hide`, `canvas.navigate` |

Canvas 命令在 macOS 应用程序的本机面板中显示托管小部件文档。 iOS、Android、Windows、Linux 和未知平台不接收 Canvas 插件默认值。

`talk.ptt.start`、`talk.ptt.stop`、`talk.ptt.cancel` 和 `talk.ptt.once` 对于任何声明了 `talk` 能力或声明了 `talk.*` 命令的节点，都会默认允许，与平台标记无关。

桌面主机命令（`system.run`、`system.run.prepare`、`system.which`、`browser.proxy`、`browser.proxy.upload.v1`、`mcp.tools.call.v1`、`screen.snapshot` 和 macOS/Windows/Linux 上的 `desktop.stream`）不属于上面的静态平台默认表。一旦操作员批准了声明它们的配对请求，它们就变得可用，之后节点批准的命令集在重新连接时将它们向前传送。桌面节点默认开启桌面共享； Mac 应用程序在 **设置→本机→功能→桌面共享** 下公开其本地开关。

危险或隐私性强的命令需要通过 `gateway.nodes.commands.allow` 一次性永久选择加入，即使节点声明它们：`camera.snap`、`camera.clip`、`camera.ptz.control`、`screen.record`、`contacts.add`、`calendar.add`、 `reminders.add`、`health.summary`、`sms.send`、`sms.search`。 `gateway.nodes.commands.deny` 始终胜过默认值和额外的允许列表条目。请参阅 [ 配对节点桌面 ](/gateway/config-browser-ui-desktop#paired-node-desktops)、[HealthKit 摘要 ](/platforms/ios-healthkit) 和 [ 计算机使用 ](/nodes/computer-use) 实现围绕桌面访问的本地启用、配对、功能和工具策略门。

插件拥有的节点命令可以添加网关节点调用策略。该策略会在允许列表检查之后、转发到节点之前执行，因此原始 `node.invoke`、CLI 帮助工具和专用代理工具共享相同的插件权限边界。危险的插件节点命令仍然需要显式的 `gateway.nodes.commands.allow` 同意。

节点扩展其声明的命令、功能或权限后，重新连接它，检查 `openclaw nodes pending`，并使用 `openclaw nodes approve <nodeRequestId>` 批准扩展的表面。删除声明并不授予新的访问权限或需要批准才能进行扩展。

## <a id="config-(openclaw.json)"></a><a id="config-openclaw-json"></a> 配置（`openclaw.json`）

Node-相关设置位于`gateway.nodes`和`tools.exec`下：

```json5
{
  gateway: {
    nodes: {
      // Auto-approve first-time node pairing from trusted networks (CIDR list).
      // Disabled when unset. Only applies to first-time role:node requests
      // with no requested scopes; does not auto-approve upgrades. This
      // approves the device only: the node's command/capability surface still
      // needs `openclaw nodes approve <requestId>` (see `openclaw nodes
      // pending`), because device pairing alone must not grant commands.
      // Silent same-host pairing behaves the same way. SSH-verified pairing
      // and node-profile setup codes approve the initial surface, since both
      // record explicit machine-ownership or admin consent.
      pairing: {
        autoApproveCidrs: ["192.168.1.0/24"],
        // SSH-verified auto-approval (default: enabled). Approves first-time
        // node pairing on an exact device-key match read back over SSH.
        sshVerify: true,
      },
      // Trust agent-visible plugin tools published by paired nodes (default: true).
      pluginTools: {
        enabled: true,
      },
      // Persistently enable dangerous/privacy-heavy node commands.
      commands: {
        allow: ["camera.snap", "screen.record"],
        // Block exact command names even if defaults or commands.allow include them.
        deny: ["camera.clip"],
      },
    },
  },
  tools: {
    exec: {
      // Default exec host: "node" routes all exec calls to a paired node.
      host: "node",
      // Exec policy mode for node exec: allow only approved/allowlisted commands.
      mode: "allowlist",
      // Pin exec to a specific node (id or name). Omit to allow any node.
      node: "build-node",
    },
  },
}
```

使用准确的节点命令名称。即使平台默认值或 `commands.allow` 条目允许，`commands.deny` 也会删除命令。默认情况下，配对节点可以发布代理可见的插件工具描述符，但每个描述符的命令仍必须位于节点批准的命令表面中。设置 `gateway.nodes.pluginTools.enabled: false` 以忽略所有此类描述符。有关网关节点配对和命令策略字段详细信息，请参阅 [ 网关配置参考](/gateway/config-gateway#gateway)。

按代理覆盖 exec 节点：

```json5
{
  agents: {
    entries: {
      main: {
        tools: { exec: { node: "build-node" } },
      },
    },
  },
}
```

## <a id="permissions-map"></a> 权限映射

节点可能包括 `node.list` / `node.describe` 中的 `permissions` 映射，由权限名称（e.g. `screenRecording`、`accessibility`、`location`）和布尔值（`true` = 已授予）作为键控。
