---
summary: "入站消息授权的实验性通道入口 API"
read_when:
  - 构建或迁移消息通道插件
  - 修改 DM 或群组允许名单、路由闸门、命令授权、事件授权或提及激活
  - 审查通道入口脱敏或 SDK 兼容性边界
title: "通道入口 API"
sidebarTitle: "通道入口"
---

Channel ingress 是入站
通道事件的实验性访问控制边界。插件负责平台事实和副作用；核心负责
通用策略：DM/群组允许名单、配对存储 DM 条目、路由闸门、
命令闸门、事件授权、提及激活、脱敏诊断以及
准入。

新接收路径请使用 `openclaw/plugin-sdk/channel-ingress-runtime`。较旧的
`openclaw/plugin-sdk/channel-ingress` 子路径仍作为已弃用的兼容门面导出，供第三方插件使用。

## 运行时解析器

```ts
import {
  defineStableChannelIngressIdentity,
  resolveChannelMessageIngress,
} from "openclaw/plugin-sdk/channel-ingress-runtime";

const identity = defineStableChannelIngressIdentity({
  key: "platform-user-id",
  normalize: normalizePlatformUserId,
  sensitivity: "pii",
});

const result = await resolveChannelMessageIngress({
  channelId: "my-channel",
  accountId,
  identity,
  subject: { stableId: platformUserId },
  conversation: { kind: isGroup ? "group" : "direct", id: conversationId },
  event: { kind: "message", authMode: "inbound", mayPair: !isGroup },
  policy: {
    dmPolicy: config.dmPolicy,
    groupPolicy: config.groupPolicy,
    groupAllowFromFallbackToAllowFrom: true,
  },
  allowFrom: config.allowFrom,
  groupAllowFrom: config.groupAllowFrom,
  accessGroups: cfg.accessGroups,
  route,
  readStoreAllowFrom,
  command: hasControlCommand ? { allowTextCommands: true, hasControlCommand } : undefined,
});
```

不要预先计算有效允许列表、命令所有者或命令组。  
解析器会从原始允许列表、存储回调、路由描述符、访问组、策略和会话类型中推导它们。

## 结果

打包插件应直接消费现代投影：

| Field              | Meaning                                                            |
| ------------------ | ------------------------------------------------------------------ |
| `ingress`          | 排序后的门禁决策和准入                                               |
| `senderAccess`     | 仅发送者/会话授权                                                   |
| `routeAccess`      | 路由和路由-发送者投影                                               |
| `commandAccess`    | 命令授权；当没有运行命令门禁时 `requested: false`                  |
| `activationAccess` | 提及/激活结果                                                     |

事件授权仍可在排序后的 `ingress.graph` 和决定性的 `ingress.reasonCode` 上获取；不会发出单独的事件投影。

已弃用的第三方 SDK 辅助工具可能会在内部重建旧的形状。新的捆绑接收路径不应将现代结果再转换回本地 DTO。

## 访问组

`accessGroup:<name>` 条目会保持脱敏。核心会自行解析静态 `message.senders` 组，并且仅对需要平台查找的动态组调用 `resolveAccessGroupMembership`。缺失、不支持或失败的组将默认拒绝。

## 事件模式

| `authMode`       | 含义                                         |
| ---------------- | -------------------------------------------- |
| `inbound`        | 常规入站发送者闸门                           |
| `command`        | 回调或作用域按钮的命令闸门                   |
| `origin-subject` | 操作主体必须匹配原始消息主体                 |
| `route-only`     | 仅用于路由作用域可信事件的路由闸门           |
| `none`           | 插件拥有的内部事件绕过共享授权               |

对 reactions、按钮、回调和原生命令使用 `mayPair: false`。

## 路由和激活

对房间、主题、公会、线程或嵌套路由策略使用路由描述符：

```ts
route: {
  id: "room",
  allowed: roomAllowed,
  enabled: roomEnabled,
  senderPolicy: "replace",
  senderAllowFrom: roomAllowFrom,
  blockReason: "room_sender_not_allowlisted",
}
```

当插件具有多个可选路由描述符时，使用 `channelIngressRoutes(...)`；它会在保持路由事实通用且按每个描述符的 `precedence` 顺序排列的同时，过滤掉已禁用的分支。

提及闸门是一个激活闸门。未命中提及会返回 `admission: "skip"`，这样转发内核就不会处理仅观察的轮次。大多数通道应在发送者和命令闸门之后再进行激活。若公共聊天界面需要在发送者允许名单噪音之前先静默处理未提及流量，并且已禁用文本命令绕过，则可以选择 `activation.order: "before-sender"`。具有隐式激活的通道（例如机器人线程中的回复）可以传入 `activation.allowedImplicitMentionKinds`；此时投影出的 `activationAccess.shouldBypassMention` 会报告命令或隐式激活何时绕过了显式提及。

## 脱敏

原始发送方值和原始允许列表条目仅作为解析器输入。它们
不得出现在已解析状态、决策、诊断、快照或
兼容性事实中。请使用不透明的主体 ID、条目 ID、路由 ID 和
诊断 ID。

## 验证

```bash
pnpm test src/channels/message-access/message-access.test.ts src/plugin-sdk/channel-ingress-runtime.test.ts
pnpm plugin-sdk:api:check
```
