---
summary: "RPC 方法系列、发现、会话列表引导和事件系列"
read_when:
  - "查找网关 RPC 方法及其范围"
  - "引导会话列表或订阅事件系列"
  - "实现节点帮助器方法或 exec 生命周期处理"
title: "网关协议 RPC 方法"
sidebarTitle: "RPC方法"
doc-schema-version: 1
---

网关方法表面，分组为系列，加上会话列表引导程序、公共事件系列以及节点帮助程序和执行生命周期契约。

## <a id="rpc-method-families"></a> RPC 方法系列

`hello-ok.features.methods` 是从 `src/gateway/server-methods-list.ts` 加上加载的 plugin/channel 方法导出构建的保守发现列表 - 它不是每个方法的生成转储，并且某些方法（例如 `push.test`、`web.login.start`、`web.login.wait`、`sessions.usage`）有意从发现中排除它们是真实的、可调用的方法。将此视为功能发现，而不是 `src/gateway/server-methods/*.ts` 的完整枚举。

## <a id="what-each-page-covers"></a> 每页涵盖的内容

- [系统和通道方法](/gateway/protocol/rpc-system-and-channels) — 系统和身份、模型和使用、通道和登录帮助程序、插件管理、消息传递和日志以及操作员终端。
- [Talk、配置和代理方法](/gateway/protocol/rpc-talk-config-and-agents) — Talk 和 TTS、机密、配置、更新和向导以及代理和工作区帮助程序。
- [会话控制](/gateway/protocol/rpc-session-control) — 会话控制系列：列出、发送、流式传输、运行生命周期和会话维护。
- [设备、节点和批准](/gateway/protocol/rpc-devices-nodes-and-approvals) — 设备配对和设备令牌、节点配对和调用、批准系列、Control UI 命令以及自动化、技能和工具。
- [会话列表引导程序和事件](/gateway/protocol/rpc-bootstrap-and-events) — 会话列表引导程序、公共事件系列以及节点帮助程序和执行生命周期合约。

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本中的每个部分标题都保留其锚点，因此带有片段的指向此页面的现有链接仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="system-and-identity" />[系统和身份](/gateway/protocol/rpc-system-and-channels#system-and-identity)
- <a id="models-and-usage" />[模型及用途](/gateway/protocol/rpc-system-and-channels#models-and-usage)
- <a id="channels-and-login-helpers" />[频道和登录助手](/gateway/protocol/rpc-system-and-channels#channels-and-login-helpers)
- <a id="plugin-management" />[插件管理](/gateway/protocol/rpc-system-and-channels#plugin-management)
- <a id="messaging-and-logs" />[消息和日志](/gateway/protocol/rpc-system-and-channels#messaging-and-logs)
- <a id="operator-terminal" />[操作员终端](/gateway/protocol/rpc-system-and-channels#operator-terminal)
- <a id="talk-and-tts" />[Talk 和 TTS](/gateway/protocol/rpc-talk-config-and-agents#talk-and-tts)
- <a id="secrets%2C-config%2C-update%2C-and-wizard" />[机密、配置、更新和向导](/gateway/protocol/rpc-talk-config-and-agents#secrets%2C-config%2C-update%2C-and-wizard)
- <a id="secrets-config-update-and-wizard" />[机密、配置、更新和向导](/gateway/protocol/rpc-talk-config-and-agents#secrets-config-update-and-wizard)
- <a id="agent-and-workspace-helpers" />[代理和工作区助手](/gateway/protocol/rpc-talk-config-and-agents#agent-and-workspace-helpers)
- <a id="session-control" />[会话控制](/gateway/protocol/rpc-session-control#session-control)
- <a id="device-pairing-and-device-tokens" />[设备配对和设备令牌](/gateway/protocol/rpc-devices-nodes-and-approvals#device-pairing-and-device-tokens)
- <a id="node-pairing%2C-invoke%2C-and-pending-work" />[节点配对、调用和挂起工作](/gateway/protocol/rpc-devices-nodes-and-approvals#node-pairing%2C-invoke%2C-and-pending-work)
- <a id="node-pairing-invoke-and-pending-work" />[节点配对、调用和挂起工作](/gateway/protocol/rpc-devices-nodes-and-approvals#node-pairing-invoke-and-pending-work)
- <a id="approval-families" />[批准系列](/gateway/protocol/rpc-devices-nodes-and-approvals#approval-families)
- <a id="control-ui-commands" />[控制UI命令](/gateway/protocol/rpc-devices-nodes-and-approvals#control-ui-commands)
- <a id="automation%2C-skills%2C-and-tools" />[自动化、技能和工具](/gateway/protocol/rpc-devices-nodes-and-approvals#automation%2C-skills%2C-and-tools)
- <a id="automation-skills-and-tools" />[自动化、技能和工具](/gateway/protocol/rpc-devices-nodes-and-approvals#automation-skills-and-tools)
- <a id="session-list-bootstrap" />[会话列表引导](/gateway/protocol/rpc-bootstrap-and-events#session-list-bootstrap)
- <a id="common-event-families" />[常见事件系列](/gateway/protocol/rpc-bootstrap-and-events#common-event-families)
- <a id="node-helper-methods" />[节点辅助方法](/gateway/protocol/rpc-bootstrap-and-events#node-helper-methods)
- <a id="node-exec-lifecycle-events" />[节点执行生命周期事件](/gateway/protocol/rpc-bootstrap-and-events#node-exec-lifecycle-events)
