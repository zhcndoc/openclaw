---
summary: "全球语音唤醒词（网关拥有）及其如何在各节点同步"
read_when:
  - 更改语音唤醒词行为或默认值
  - 添加需要唤醒词同步的新节点平台
title: "语音唤醒"
---

# 语音唤醒（全球唤醒词）

OpenClaw 将**唤醒词视为一个由**网关**拥有的全局列表**。

- 不存在**每个节点自定义唤醒词**。
- **任何节点或应用界面均可编辑**该列表；更改由网关持久保存并广播给所有节点。
- macOS 和 iOS 保持本地的**语音唤醒启用/禁用**切换（本地用户体验和权限有所不同）。
- Android 当前保持语音唤醒关闭，语音标签页中使用手动麦克风流程。

## 存储（网关主机）

唤醒词存储在网关机器的路径：

- `~/.openclaw/settings/voicewake.json`

格式：

```json
{ "triggers": ["openclaw", "claude", "computer"], "updatedAtMs": 1730000000000 }
```

## 协议

### 方法

- `voicewake.get` → `{ triggers: string[] }`
- `voicewake.set`，参数 `{ triggers: string[] }` → `{ triggers: string[] }`

备注：

- 触发词会被标准化（去除空白，删除空词），空列表将回退到默认值。
- 出于安全考虑，触发词数量和长度均有限制。

### 事件

- `voicewake.changed`，载荷 `{ triggers: string[] }`

接收方：

- 所有 WebSocket 客户端（macOS 应用、WebChat 等）
- 所有连接的节点（iOS/Android），并且在节点连接时发送当前状态的初始推送。

## 客户端行为

### macOS 应用

- 使用全局列表来控制 `VoiceWakeRuntime` 的触发。
- 在语音唤醒设置中编辑“触发词”时，调用 `voicewake.set`，随后依赖广播同步其他客户端。

### iOS 节点

- 使用全局列表进行 `VoiceWakeManager` 触发检测。
- 在设置中编辑唤醒词调用 `voicewake.set`（通过网关 WebSocket），同时保持本地唤醒词检测响应。

### Android 节点

- Android 运行时/设置中当前禁用语音唤醒。
- Android 语音在语音标签页使用手动麦克风捕捉替代唤醒词触发。
