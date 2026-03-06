---
summary: "`openclaw voicecall` 的 CLI 参考（语音通话插件命令界面）"
read_when:
  - 您使用语音通话插件并想了解 CLI 入口点
  - 您想快速查看 `voicecall call|continue|status|tail|expose` 的示例
title: "voicecall"
---

# `openclaw voicecall`

`voicecall` 是一个由插件提供的命令。仅当语音通话插件已安装并启用时才会出现。

主要文档：

- 语音通话插件: [语音通话](/plugins/voice-call)

## 常用命令

```bash
openclaw voicecall status --call-id <id>
openclaw voicecall call --to "+15555550123" --message "Hello" --mode notify
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall end --call-id <id>
```

## 暴露 Webhook（Tailscale）

```bash
openclaw voicecall expose --mode serve
openclaw voicecall expose --mode funnel
openclaw voicecall expose --mode off
```

安全提示：仅向您信任的网络暴露 webhook 端点。尽可能优先使用 Tailscale Serve 而非 Funnel。
