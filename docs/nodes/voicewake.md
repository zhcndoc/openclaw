---
summary: "全局语音唤醒词（由 Gateway 持有）以及它们如何在各节点间同步"
read_when:
  - "更改语音唤醒词的行为或默认值时"
  - "添加需要唤醒词同步的新节点平台时"
title: "语音唤醒"
---

唤醒词是**由 Gateway 持有的一个全局列表**——不存在每个节点各自的自定义列表。任何节点或应用 UI 都可以编辑该列表；Gateway 会持久化该更改，并将其广播给每个已连接的客户端。

- **Control UI**：**设置→Talk**下的唤醒词编辑器。
- **macOS**：本地语音唤醒 enable/disable 切换。需要 macOS 26+；有关 runtime/PTT 的详细信息，请参阅 [ 语音唤醒 （macOS）](/platforms/mac/voicewake)。
- **iOS**：本地语音唤醒 enable/disable 在设置中切换。
- **Android**：设置 → 语音中的本地语音唤醒 enable/disable 切换和唤醒词编辑器。需要 Android 设备上语音识别。

## <a id="storage"></a> 存储

唤醒词和路由规则位于网关状态数据库中，默认情况下为 `~/.openclaw/state/openclaw.sqlite`（用 `OPENCLAW_STATE_DIR` 覆盖），位于 `config_machine_state` 键 `voicewake.triggers` 和 `voicewake.routing` 下。下面的状态键和网关方法将唤醒词列表命名为 `triggers`。旧版 `settings/voicewake.json` 和 `settings/voicewake-routing.json` 仅是 `openclaw doctor --fix` 迁移输入 — 运行时永远不会读取它们。

## <a id="protocol"></a> 协议

### <a id="trigger-list"></a> 触发词列表

| 方法          | 参数                   | 结果                   |
| --------------- | ------------------------ | ------------------------ |
| `voicewake.get` | 无                     | `{ triggers: string[] }` |
| `voicewake.set` | `{ triggers: string[] }` | `{ triggers: string[] }` |

`voicewake.set` 会规范化输入：去除首尾空白、丢弃空项、最多保留 32 个触发词，并将每个触发词截断为最多 64 个 UTF-16 代码单元且不拆分代理对。若结果为空，则回退到内置默认值（`openclaw`、`claude`、`computer`）。

### <a id="routing-(trigger-to-target)"></a><a id="routing-trigger-to-target"></a> 路由（触发词到目标）

| 方法                  | 参数 | 结果                               |
| ----------------------- | ------ | ------------------------------------ |
| `voicewake.routing.get` | 无   | `{ config: VoiceWakeRoutingConfig }` |

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

限制：最多 32 个路由，触发文本最多 64 个字符。路由触发器通过小写、从每个单词中剥离 leading/trailing 标点符号以及折叠空格（`"Hey, Bot!!"` 和 `"hey bot"` 匹配并计为重复项）来规范化匹配和重复检测 - 这是比上面用于全局触发器列表的普通修剪更严格的规范化。

### <a id="events"></a> 事件

| 事件                       | 有效载荷                              |
| --------------------------- | ------------------------------------ |
| `voicewake.changed`         | `{ triggers: string[] }`             |
| `voicewake.routing.changed` | `{ config: VoiceWakeRoutingConfig }` |

两者都会广播给每个具有读取权限的 WebSocket 客户端（macOS 应用、WebChat 及类似客户端）以及每个已连接的节点。节点在连接后还会立即收到这两个事件作为初始快照推送。

## <a id="client-behavior"></a> 客户端行为

- **macOS**：调用 `voicewake.set`/`voicewake.get` 并监听 `voicewake.changed`，以与其他客户端保持同步。
- **iOS**：调用 `voicewake.set`/`voicewake.get` 并监听 `voicewake.changed`，以保持本地唤醒词检测的响应性。
- **Android**：调用 `voicewake.set`/`voicewake.get`，监听 `voicewake.changed`，并在启用时公布 `voiceWake`。识别始终在设备上进行且仅在前台有效；当 Talk、手动听写、语音备忘录录制或消息语音占用音频时会暂停。

## <a id="related"></a> 相关内容

- [对话模式](/nodes/talk)
- [音频和语音笔记](/nodes/audio)
- [媒体理解](/nodes/media-understanding)
