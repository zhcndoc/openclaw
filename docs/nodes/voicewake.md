---
summary: "全局语音唤醒词（由 Gateway 持有）以及它们如何在各节点间同步"
read_when:
  - 更改语音唤醒词的行为或默认值时
  - 添加需要唤醒词同步的新节点平台时
title: "语音唤醒"
---

OpenClaw 将 **唤醒词视为由 **Gateway** 拥有的单一全局列表**。

- **不存在按节点分别配置的自定义唤醒词**。
- **任何节点/应用 UI 都可以编辑**该列表；更改会由 Gateway 持久化并广播给所有人。
- macOS 和 iOS 保留本地的 **Voice Wake 启用/禁用** 开关（本地 UX + 权限不同）。
- Android 目前保持 Voice Wake 关闭，并在 Voice 选项卡中使用手动麦克风流程。

## 存储（Gateway 主机）

唤醒词存储在 gateway 机器上的：

- `~/.openclaw/settings/voicewake.json`

结构：

```json
{ "triggers": ["openclaw", "claude", "computer"], "updatedAtMs": 1730000000000 }
```

## 协议

### 方法

- `voicewake.get` → `{ triggers: string[] }`
- `voicewake.set` 携带参数 `{ triggers: string[] }` → `{ triggers: string[] }`

说明：

- 触发词会被规范化（去除首尾空白，丢弃空项）。空列表会回退到默认值。
- 出于安全考虑会强制限制（数量/长度上限）。

### 路由方法（触发词 → 目标）

- `voicewake.routing.get` → `{ config: VoiceWakeRoutingConfig }`
- `voicewake.routing.set` 携带参数 `{ config: VoiceWakeRoutingConfig }` → `{ config: VoiceWakeRoutingConfig }`

`VoiceWakeRoutingConfig` 结构：

```json
{
  "version": 1,
  "defaultTarget": { "mode": "current" },
  "routes": [{ "trigger": "robot wake", "target": { "sessionKey": "agent:main:main" } }],
  "updatedAtMs": 1730000000000
}
```

路由目标仅支持以下三种之一：

- `{ "mode": "current" }`
- `{ "agentId": "main" }`
- `{ "sessionKey": "agent:main:main" }`

### 事件

- `voicewake.changed` 负载 `{ triggers: string[] }`
- `voicewake.routing.changed` 负载 `{ config: VoiceWakeRoutingConfig }`

接收者：

- 所有 WebSocket 客户端（macOS 应用、WebChat 等）
- 所有已连接节点（iOS/Android），并且在节点连接时也会作为初始“当前状态”推送。

## 客户端行为

### macOS 应用

- 使用全局列表来控制 `VoiceWakeRuntime` 触发。
- 在 Voice Wake 设置中编辑“Trigger words”会调用 `voicewake.set`，然后依赖广播让其他客户端保持同步。

### iOS 节点

- 使用全局列表进行 `VoiceWakeManager` 触发检测。
- 在设置中编辑 Wake Words 会调用 `voicewake.set`（通过 Gateway WS），并且也会保持本地唤醒词检测响应及时。

### Android 节点

- Voice Wake 目前在 Android 运行时/设置中被禁用。
- Android 语音使用 Voice 选项卡中的手动麦克风采集，而不是唤醒词触发。

## 相关内容

- [对话模式](/nodes/talk)
- [音频和语音笔记](/nodes/audio)
- [媒体理解](/nodes/media-understanding)
