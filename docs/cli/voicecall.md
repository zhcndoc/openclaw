---
summary: "`openclaw voicecall` 的 CLI 参考（语音通话插件命令界面）"
read_when:
  - 你正在使用语音通话插件并想查看 CLI 入口
  - 你想快速查看 `voicecall call|continue|dtmf|status|tail|expose` 的示例
title: "Voicecall"
---

# `openclaw voicecall`

`voicecall` 是一个由插件提供的命令。仅当语音通话插件已安装并启用时才会出现。

主要文档：

- 语音通话插件：[语音通话](/plugins/voice-call)

## 常用命令

```bash
openclaw voicecall status --call-id <id>
openclaw voicecall call --to "+15555550123" --message "Hello" --mode notify
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall dtmf --call-id <id> --digits "ww123456#"
openclaw voicecall end --call-id <id>
```

## 暴露 Webhook（Tailscale）

```bash
openclaw voicecall expose --mode serve
openclaw voicecall expose --mode funnel
openclaw voicecall expose --mode off
```

安全提示：仅将 webhook 端点暴露给你信任的网络。尽可能优先使用 Tailscale Serve，而不是 Funnel。

## 相关内容

- [CLI 参考](/cli)
- [语音通话插件](/plugins/voice-call)
