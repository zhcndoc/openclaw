---
summary: "tts 代理工具和网关 TTS RPC 方法"
title: "文本转语音代理工具和网关 RPC"
read_when:
  - "您正在从代理工具调用中调用 TTS"
  - "您需要网关 tts.* RPC 方法列表"
---

## <a id="agent-tool"></a> 代理工具

`tts` 工具将文本转换为语音并返回音频附件以进行回复传递。在 Feishu、Matrix、Telegram 和 WhatsApp 上，音频作为语音消息而不是文件附件传送。当 `ffmpeg` 可用时，Feishu 和 WhatsApp 可以转码此路径上的非 Opus TTS 输出。

WhatsApp 通过 Baileys 将音频作为 PTT 语音备注发送（`audio` 且 `ptt: true`），并且会**单独**发送可见文本，而不是与 PTT 音频一起发送，因为客户端对语音备注上的字幕渲染并不稳定。

该工具接受可选的 `channel` 和 `timeoutMs` 字段；`timeoutMs` 是每次调用的提供方请求超时时间，单位为毫秒。每次调用的值会覆盖 `tts.timeoutMs`；已配置的 TTS 超时会覆盖任何插件编写的提供方默认值。

### <a id="tool-profiles"></a> 工具配置档案

`tts` 不是 `minimal`、`coding` 或 `messaging` [ 工具配置文件 ](/gateway/config-tools/tool-policy#tool-profiles) 的一部分。这些配置文件上的代理无法调用它，除非您明确授予它：

```json5
{
  tools: {
    profile: "messaging",
    alsoAllow: ["tts"],
  },
}
```

`full` 配置文件和未设置配置文件包括 `tts`，无需额外配置。其他allow/deny层仍然可以将其删除。

工具配置文件不影响 [ 自动 TTS](/tools/tts/output#auto-tts-behavior)：当代理无法调用 `tts` 工具时，`tts.auto` 仍会进行语音回复。

## <a id="gateway-rpc"></a> 网关 RPC

| 方法            | 用途                                      |
| ----------------- | -------------------------------------------- |
| `tts.status`      | 读取当前 TTS 状态和上次尝试。     |
| `tts.enable`      | 将本地自动偏好设置为 `always`。       |
| `tts.disable`     | 将本地自动偏好设置为 `off`。          |
| `tts.convert`     | 一次性文本 → 音频。                        |
| `tts.setProvider` | 设置本地提供商偏好。               |
| `tts.personas`    | 列出已配置的人设和当前激活的人设。 |
| `tts.setPersona`  | 设置本地人设偏好。                |
| `tts.providers`   | 列出已配置的提供商及其状态。        |
