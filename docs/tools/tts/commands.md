---
summary: "模型发出的 TTS 指令、/tts 斜线命令和每用户首选项"
title: "文本转语音命令和指令"
read_when:
  - "您希望模型改变一次回复的声音或速度"
  - "您需要 /tts 命令界面"
  - "您正在寻找本地 TTS 首选项的存储位置"
---

## <a id="model-driven-directives"></a> 模型驱动的指令

默认情况下，助手**可以**发出 `[[tts:...]]` 指令来为单条回复覆盖声音、模型或语速，并可选地使用 `[[tts:text]]...[[/tts:text]]` 块来加入仅应出现在音频中的表现性提示：

```text
Here you go.

[[tts:speakerVoiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) Read the song once more.[[/tts:text]]
```

当 `tts.auto` 为 `"tagged"` 时，**需要使用指令**才能触发音频。流式块传递会在通道看到可见文本之前移除其中的指令，即使这些指令被拆分在相邻的多个块中。

回复可以完全由非空 `[[tts:text]]...[[/tts:text]]` 块组成。不需要可见的文本前缀，包括当模型也返回推理时。

除非 `modelOverrides.allowProvider: true`，否则 `provider=...` 将被忽略。当回复声明 `provider=...` 时，该指令中的其他键仅由该提供者解析；不支持的键将被删除并报告为 TTS 指令警告。

**可用的指令键：**

- `provider`（注册提供商 ID；需要 `allowProvider: true`）
- `speakerVoice` / `speakerVoiceId`（旧别名：`voice`、`voiceName`、`voice_name`、`google_voice`、`voiceId`）
- `model` / `google_model`
- `stability`, `similarityBoost`, `style`, `speed`, `useSpeakerBoost`
- `vol` / `volume`（MiniMax 音量，`(0, 10]`）
- `pitch`（MiniMax 整数音高，−12 到 12；小数值会被截断）
- `emotion`（Volcengine 情绪标签）
- `applyTextNormalization` (`auto|on|off`)
- `languageCode` (ISO 639-1)
- `seed`

**完全禁用模型覆盖：**

```json5
{ tts: { modelOverrides: { enabled: false } } }
```

**允许切换提供商，同时保持其他参数可配置：**

```json5
{ tts: { modelOverrides: { enabled: true, allowProvider: true, allowSeed: false } } }
```

## <a id="slash-commands"></a> 斜杠命令

单个命令 `/tts`。在 Discord 上，OpenClaw 还会注册 `/voice`，因为 `/tts` 是内置的 Discord 命令——文本 `/tts ...` 仍然可用。

```text
/tts off | on | status
/tts chat on | off | default
/tts latest
/tts provider <id>
/tts persona <id> | off
/tts limit <chars>
/tts summary off
/tts audio <text>
```

<Note>
命令需要授权发送者（适用 allowlist/owner 规则），并且必须启用 `commands.text` 或原生命令注册。
</Note>

行为说明：

- `/tts on` 会将本地 TTS 偏好写为 `always`；`/tts off` 会将其写为 `off`。
- `/tts chat on|off|default` 会为当前聊天写入一个会话作用域的自动 TTS 覆盖设置。
- `/tts persona <id>` 会写入本地 persona 偏好；`/tts persona off` 会清除它。
- `/tts latest` 会从当前会话记录中读取最新的助手回复，并将其作为音频发送一次。它只会在会话条目上存储该回复的哈希值，以抑制重复的语音发送。
- `/tts audio` 会生成一次性的音频回复（**不会**切换 TTS 开关）。
- `/tts limit <chars>` 接受 **100–4096**（4096 是 Telegram caption/message 最大值）；超出该范围的值将被拒绝。
- `limit` 和 `summary` 存储在 **本地偏好** 中，而不是主配置中。
- `/tts status` 会包含最近一次尝试的回退诊断信息——`Fallback: <primary> -> <used>`、`Attempts: ...`，以及每次尝试的详细信息（`provider:outcome(reasonCode) latency`）。
- 当 TTS 启用时，`/status` 会显示当前 TTS 模式，以及已配置的 provider、model、voice 和已清理的自定义端点元数据。

## <a id="per-user-preferences"></a> 每用户偏好

Slash 命令会将本地覆盖写入 TTS 偏好路径。默认值为 `~/.openclaw/settings/tts.json`；可使用 `OPENCLAW_TTS_PREFS` 进行覆盖。Doctor 会将已弃用的全局 `tts.prefsPath` 值迁移到共享机器状态中。 高级多代理设置在代理有意使用独立偏好存储时，仍然可以设置 `agents.entries.<id>.tts.prefsPath`。

| 存储字段 | 作用                                                                           |
| ------------ | -------------------------------------------------------------------------------- |
| `auto`       | 本地 auto-TTS 覆盖（`always`、`off` 等）                                     |
| `provider`   | 本地主提供方覆盖                                                  |
| `persona`    | 本地 persona 覆盖                                                           |
| `maxLength`  | Summary/truncation 阈值（默认 `1500` 字符，`/tts limit` 范围 100–4096） |
| `summarize`  | 摘要开关（默认 `true`）                                                  |

这些设置会覆盖该主机上来自 `tts` 以及当前激活的 `agents.entries.*.tts` 区块的有效配置。
