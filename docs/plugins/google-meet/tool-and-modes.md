---
summary: "google_meet 工具操作、状态字段以及座席与双向对讲模式"
read_when:
  - "您正在从代理调用 google_meet 工具"
  - "您正在从 google_meet 状态读取 Chrome 会话运行状况"
  - "您正在代理、双向和转录模式之间进行选择"
title: "Google Meet 工具和模式"
sidebarTitle: "工具和模式"
---

用于座席、会话状态字段以及座席和双向对讲模式的工具操作。 [Google Meet 插件](/plugins/google-meet) 指南的一部分。

## <a id="tool"></a> 工具

Agents 使用 `google_meet` 工具：

```json
{
  "action": "join",
  "url": "https://meet.google.com/abc-defg-hij",
  "transport": "chrome-node",
  "mode": "agent"
}
```

| `action`                | 用途                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `join`                  | 加入一个明确的 Meet URL                                                                         |
| `create`                | 创建一个空间（并默认加入）；支持 `accessType`/`entryPointAccess`                    |
| `status`                | 列出活动会话，或通过 `sessionId` 检查一个会话                                               |
| `setup_status`          | 运行与 `googlemeet setup` 相同的检查                                                         |
| `resolve_space`         | 通过 `spaces.get` 解析 URL/code/`spaces/{id}`                                                 |
| `preflight`             | 验证 OAuth + 会议解析前置条件                                                 |
| `latest`                | 查找某个会议的最新会议记录                                                   |
| `calendar_events`       | 预览带有 Meet 链接的日历事件                                                           |
| `artifacts`             | 列出会议记录和 participant/recording/transcript/smart-note 元数据                  |
| `attendance`            | 列出参与者和参与者会话                                                        |
| `export`                | 写出 artifacts/attendance/transcript/manifest 捆绑包；将 `"dryRun": true` 设为仅生成 manifest |
| `recover_current_tab`   | Focus/inspect 现有的 Meet 选项卡，无需打开新选项卡                                      |
| `transcript`            | 读取有边界的字幕转录；`sinceIndex` 从上一次的 `nextIndex` 继续           |
| `participation_context` | 读取会话当前可用的本机操作和新观察到的源参考        |
| `participate`           | 使用稳定的 `requestId` 和 `participationAction` 执行支持的本机操作            |
| `leave`                 | 结束一个会话（Chrome 点击离开；仅关闭它打开的标签页；Twilio 挂断）                  |
| `end_active_conference` | 结束 API- 托管空间的活动 Google Meet 会议                                    |
| `speak`                 | 根据 `sessionId` 和 `message` 让实时代理立即发言                        |
| `test_speech`           | Create/reuse 一个会话，触发已知短语，返回 Chrome 健康状况                              |
| `test_listen`           | Create/reuse 仅观察会话，等待 caption/transcript 移动                        |

`test_speech` 始终强制 `mode: "agent"` 或 `"bidi"`，如果要求在 `mode: "transcribe"` 中运行，则会失败，因为仅观察会话无法发出语音。 `speechOutputVerified` 在输出期间需要新鲜的实时输出字节和本机虚拟麦克风捕获路径上的匹配非静音波形。通过生成的输入命令，参与者的输入与浏览器回放分开捕获；显式输入命令保留其配置的捕获路径。重用会话的较旧输出或环回信号不计入在内，并且仅接收字节增长不会报告已验证的语音。这验证了本地麦克风注入；需要第二个参与者来确认远程可听性。

对于 Chrome 传输方式，`leave` 在点击 Meet 的离开通话按钮后会保留一个复用的用户自有标签页保持打开。由 OpenClaw 打开的标签页会在离开后关闭。

使用`transport: "chrome"`什么时候Chrome在网关主机上运行，`transport: "chrome-node"`当它在配对节点上运行时。在这两种情况下，模型提供者和`openclaw_agent_consult`在网关主机上运行，​​因此模型凭据保留在那里。代理模式日志包括已解析的转录provider/model在桥启动时和TTS provider/model/voice/output format/sample每次合成回复后的评分。生的`mode: "realtime"`仍然被接受作为旧版兼容性别名`mode: "agent"`，但不再在该工具的广告中公布`mode`枚举。

`create` 具有 API- 支持的房间和显式访问策略：

```json
{
  "action": "create",
  "transport": "chrome-node",
  "mode": "agent",
  "accessType": "OPEN"
}
```

结束一个已知房间的活动会议：

```json
{
  "action": "end_active_conference",
  "meeting": "https://meet.google.com/abc-defg-hij"
}
```

在声称加入会议之前先进行先听验证很有用：

```json
{
  "action": "test_listen",
  "url": "https://meet.google.com/abc-defg-hij",
  "transport": "chrome-node",
  "timeoutMs": 30000
}
```

按需发言：

```json
{
  "action": "speak",
  "sessionId": "meet_...",
  "message": "Say exactly: I'm here and listening."
}
```

`status` 在可用时包含 Chrome 健康状态：

| 字段                                                          | 含义                                                                                                                |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `inCall`                                                       | Chrome 似乎在 Meet 通话中                                                                              |
| `micMuted`                                                     | 尽力满足麦克风状态                                                                                      |
| `manualAction.reason` / `manualAction.message`                 | 浏览器配置文件需要手动登录、满足主持人准入、权限或浏览器控制修复，然后语音才能工作 |
| `speechReady` / `speechBlockedReason` / `speechBlockedMessage` | 现在是否允许托管Chrome语音； `speechReady: false` 表示 OpenClaw 未发送 intro/test 短语   |
| `providerConnected` / `realtimeReady`                          | 实时语音桥接状态                                                                                            |
| `lastInputAt` / `lastOutputAt`                                 | 最后看到的音频 from/sent 到桥                                                                                |
| `audioInputRouted` / `audioInputDeviceLabel`                   | Meet 的麦克风是否是经过验证的原生虚拟音频输入                                                   |
| `audioOutputRouted` / `audioOutputDeviceLabel`                 | 参与者播放是否路由至提供商；托管浏览器捕获报告 `Isolated browser playback`    |
| `lastOutputLoopbackAt` / `outputLoopbackSignalBytes`           | 波形指纹与虚拟麦克风捕获路径相关的新鲜输出                          |
| `lastOutputLoopbackCorrelation`                                | 将捕获的信号与当前辅助输出生成联系起来的相关性分数                                 |
| `outputGeneration` / `verifiedOutputGeneration`                | 单调 ID；相等意味着当前输出，而不是旧的话语，通过了环回证明                |
| `lastOutputLoopbackRms` / `lastOutputLoopbackPeak`             | 针对最新验证的环回捕获块的音频能量诊断                                                |
| `lastSuppressedInputAt` / `suppressedInputBytes`               | 传统混合环回回声保护忽略输入；播放期间不会抑制隔离的浏览器输入       |

## <a id="native-participation-requests"></a> 本地参与请求

在使用 `participate` 之前先用 `sessionId` 调用 `participation_context`。它仅列出当前跟踪的浏览器会话可用的功能；空列表意味着没有可用的本机操作。平台必须在运行时公布其功能之前提供本机实现。 Twilio 不支持浏览器参与操作。

在 `participationAction` 中传递通告的操作对象，并在检查不明确的响应时重用相同的 `requestId`。重复使用 ID 永远不会重复效果。 `uncertain` 结果表示该效应可能已经发生；不要生成新的 ID 来重试。存储的结果在离开后仍然可读，不允许在关闭的会话上执行任何新操作。

对于已分派的浏览器操作，取消是最好的努力。如果会议结束或源权限在交付期间发生更改，则影响可能会在运行时检测到该更改之前发生。 `uncertain` 结果并不确认操作已取消；不要使用新请求 ID 重试。

传入的聊天或字幕请求必须保留观察者发出的 `sourceId`。工具调用者不得将其删除以将会议输入转换为不相关的操作员命令。来源在第一次观察后两分钟后过期；临时文本、编辑、自身回显和页面更改会使旧引用无效。编辑保留其原始顺序，不会成为新的邀请。直接操作员命令可能会省略 `sourceId`。

参与上下文最多保留 1,024 个实时源，使用其原始观察顺序进行容量决策。在能力范围内，重读旧历史并不会取代新保留的资源。较新的合格观测仅替换最旧的保留源。未更改的保留来源保留其参考文献和现场守卫；重读它们并不会延长两分钟的寿命。

保留的字幕行还带有独立的观察来源，包括观察到的说话者标签和本地 self/other/unknown 标记。同等文本不会在参与者之间传递这些事实。历史行、临时行、自身回显行和不符合容量条件的行即使没有可操作的 `source`，也会保留其来源。重复的 DOM 行消失不会完成另一个实时副本。最新保留的快照并不是中间编辑的完整日志。

被拒绝的请求可能会返回 `correctionOf`。它允许使用新的 `requestId`（即 `correctionOf`）以及相同的源和操作类型进行更正的请求。它不允许重试不确定的效果或更改授权者。尝试和结果使用现有的 SQLite 插件状态存储。历史是有限的：在达到容量时，最旧的关闭会话行将被回收。主动声明永远不会过期，也不会因承认另一项行动而被驱逐；丢弃的已关闭请求保持不活动状态并且无法再次运行。已知的预插入容量拒绝允许在有界清理之后进行一次新的原子准入尝试，包括当另一个请求回收相同的行时。未知的写入结果永远不会自动重试。

## <a id="agent-and-bidi-modes"></a> Agent 和 bidi 模式

| 模式    | 谁决定答案        | 语音输出路径                     | 适用场景                                              |
| ------- | ----------------------------- | -------------------------------------- | ----------------------------------------------------- |
| `agent` | 配置的 OpenClaw agent | 正常的 OpenClaw TTS 运行时            | 你想要“我的 agent 正在会议中”这种行为        |
| `bidi`  | 实时语音模型      | 实时语音提供方的音频响应 | 你想要最低延迟的对话式语音循环 |

`agent` 模式：实时转录提供者听到会议音频，最终参与者通过配置的 OpenClaw 代理转录路由，并通过常规 OpenClaw TTS 说出答案。附近的最终记录片段在咨询之前被合并，因此一次口头轮流不会产生几个陈旧的部分答案。在 TTS 期间，隔离浏览器输入仍然可用；只有具有混合环回输入的传统传输保留播放和转录回声抑制。

`bidi` 模式：实时语音模型直接回答，并将更深层次的推理、当前信息或正常的 OpenClaw 工具委托给配置的代理。具有功能工具的提供商使用`openclaw_agent_consult`； GPT-Live 通过与 Discord 和 Talk 相同的网关语音运行时使用本机委托。两条路径都保留会议上下文和 `realtime.toolPolicy`。实时语音模型会说出最终的答案。

对于带有 Cove 的 GPT-Live，请使用 [Live 配置 ](/plugins/google-meet/config#gpt-live-with-cove)。 Live 拥有响应定时和中断：传入的参与者音频在播放期间保持打开状态，并且 OpenClaw 不会添加本地插入检测器或等待响应完成事件来播放简短回复。停止会议或替换提供者会话会取消活动委派并忽略最新结果。

默认情况下，consult 会针对 `main` agent 运行；设置 `realtime.agentId` 可以将 Meet 通道指向专用的 agent 工作区、模型默认值、工具策略、记忆和会话历史。agent 模式下的 consult 会使用每个会议独立的 `agent:<id>:subagent:google-meet:<session>` 会话键，因此后续问题会保留会议上下文，同时继承正常的 agent 策略。当一个 agent 在 agent 模式下调用 `google_meet` 时，consultant 会话会在回答参与者发言前分叉出调用者当前的转写；Meet 会话保持独立，因此会议后续内容不会直接修改调用者转写。

`realtime.toolPolicy` 控制 consult 运行：

| 策略           | 行为                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `safe-read-only` | 允许授权；限制正规代理为`read`、`web_search`、`web_fetch`、`x_search`、`memory_search`、`memory_get` |
| `owner`          | 允许使用常规代理的正常工具策略进行委派                                                              |
| `none`           | 请勿暴露咨询工具；拒绝本机 Live 委托                                                             |

consult 会话键按每个 Meet 会话进行作用域隔离，因此在同一会议期间，后续的 consult 调用会复用之前的 consult 上下文。

在 Chrome 完全加入后强制执行一次口头就绪检查：

```bash
openclaw googlemeet speak meet_... "Say exactly: I'm here and listening."
```

完整的加入并播报烟雾测试：

```bash
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij \
  --transport chrome-node \
  --message "Say exactly: I'm here and listening."
```
