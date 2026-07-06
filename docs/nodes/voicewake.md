---
summary: "全局语音唤醒词（由 Gateway 持有）以及它们如何在各节点间同步"
read_when:
  - 更改语音唤醒词的行为或默认值时
  - 添加需要唤醒词同步的新节点平台时
title: "语音唤醒"
---

唤醒词是**由 Gateway 持有的一个全局列表**——不存在每个节点各自的自定义列表。任何节点或应用 UI 都可以编辑该列表；Gateway 会持久化该更改，并将其广播给每个已连接的客户端。

- **macOS**：本地 Voice Wake 启用/禁用开关。需要 macOS 26+；运行时/PTT 详情请参见 [Voice wake (macOS)](/platforms/mac/voicewake)。
- **iOS**：设置中的本地 Voice Wake 启用/禁用开关。
- **Android**：Voice Wake 在运行时被强制禁用。Voice 选项卡使用手动麦克风采集，而不是唤醒词触发。

## 存储

唤醒词和路由规则存储在 Gateway 状态数据库中，默认位于 `~/.openclaw/state/openclaw.sqlite`（可通过 `OPENCLAW_STATE_DIR` 覆盖），表为 `voicewake_triggers`、`voicewake_routing_config`、`voicewake_routing_routes`。旧版 `settings/voicewake.json` 和 `settings/voicewake-routing.json` 仅作为 `openclaw doctor --fix` 的迁移输入——运行时不会读取它们。

## 协议

### 触发词列表

| 方法          | 参数                     | 结果                     |
| --------------- | ------------------------ | ------------------------ |
| `voicewake.get` | none                     | `{ triggers: string[] }` |
| `voicewake.set` | `{ triggers: string[] }` | `{ triggers: string[] }` |

`voicewake.set` 会规范化输入：去除首尾空白、丢弃空条目、最多保留 32 个触发词，并将每个触发词截断为 64 个字符。若结果为空，则回退到内置默认值（`openclaw`、`claude`、`computer`）。

### 路由（触发词到目标）

| 方法                  | 参数                               | 结果                               |
| ----------------------- | ------------------------------------ | ------------------------------------ |
| `voicewake.routing.get` | none                                 | `{ config: VoiceWakeRoutingConfig }` |
| `voicewake.routing.set` | `{ config: VoiceWakeRoutingConfig }` | `{ config: VoiceWakeRoutingConfig }` |

```json
{
  "version": 1,
  "defaultTarget": { "mode": "current" },
  "routes": [{ "trigger": "robot wake", "target": { "sessionKey": "agent:main:main" } }],
  "updatedAtMs": 1730000000000
}
```

每个路由的 `target` 恰好支持以下之一：

- `{ "mode": "current" }`
- `{ "agentId": "main" }`
- `{ "sessionKey": "agent:main:main" }`

限制：最多 32 条路由，触发词文本最多 64 个字符。路由触发词在匹配和重复检测时会进行规范化：将每个单词转换为小写，去除每个单词首尾的标点符号，并折叠空白字符（`"Hey, Bot!!"` 和 `"hey bot"` 会匹配且会被视为重复）——这比上面全局触发词列表仅做简单 trim 的规范化更严格。

### 事件

| 事件                       | 负载                              |
| --------------------------- | ------------------------------------ |
| `voicewake.changed`         | `{ triggers: string[] }`             |
| `voicewake.routing.changed` | `{ config: VoiceWakeRoutingConfig }` |

两者都会广播给每个具有读取权限的 WebSocket 客户端（macOS 应用、WebChat 及类似客户端）以及每个已连接的节点。节点在连接后还会立即收到这两个事件作为初始快照推送。

## 客户端行为

- **macOS**: 调用 `voicewake.set`/`voicewake.get`，并监听 `voicewake.changed` 以与其他客户端保持同步。
- **iOS**: 调用 `voicewake.set`/`voicewake.get`，并监听 `voicewake.changed` 以保持本地唤醒词检测的响应性。
- **Android**: `VoiceWakeMode`（`Off`/`Foreground`/`Always`）和网关同步代码已存在，但应用在启动时会强制将该模式设为 `Off`——目前无法从 Android 设置中访问 Voice Wake。

## 相关内容

- [对话模式](/nodes/talk)
- [音频和语音笔记](/nodes/audio)
- [媒体理解](/nodes/media-understanding)
