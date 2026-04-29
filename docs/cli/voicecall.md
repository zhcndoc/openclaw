---
summary: "CLI `openclaw voicecall` 参考（语音呼叫插件命令面）"
read_when:
  - 你使用语音呼叫插件并想查看 CLI 入口
  - 你想快速查看 `voicecall setup|smoke|call|continue|dtmf|status|tail|expose` 的示例
title: "Voicecall"
---

# `openclaw voicecall`

`voicecall` 是一个由插件提供的命令。它仅在语音呼叫插件已安装并启用时出现。

主要文档：

- 语音呼叫插件：[Voice Call](/plugins/voice-call)

## 常用命令

```bash
openclaw voicecall setup
openclaw voicecall smoke
openclaw voicecall status --call-id <id>
openclaw voicecall call --to "+15555550123" --message "你好" --mode notify
openclaw voicecall continue --call-id <id> --message "还有问题吗？"
openclaw voicecall dtmf --call-id <id> --digits "ww123456#"
openclaw voicecall end --call-id <id>
```

`setup` 默认会输出可读的就绪检查信息。脚本请使用 `--json`：

```bash
openclaw voicecall setup --json
```

对于外部提供商（`twilio`、`telnyx`、`plivo`），`setup` 必须从 `publicUrl`、隧道或 Tailscale 暴露中解析出一个公网 webhook URL。回环/私有的 serve 回退会被拒绝，因为运营商无法访问它。

`smoke` 会运行相同的就绪检查。只有在同时提供 `--to` 和 `--yes` 时，它才会发起真实电话呼叫：

```bash
openclaw voicecall smoke --to "+15555550123"        # 干运行
openclaw voicecall smoke --to "+15555550123" --yes  # 实际的通知呼叫
```

## 暴露 webhook（Tailscale）

```bash
openclaw voicecall expose --mode serve
openclaw voicecall expose --mode funnel
openclaw voicecall expose --mode off
```

安全提示：只将 webhook 端点暴露给你信任的网络。在可能的情况下，优先使用 Tailscale Serve 而不是 Funnel。

## 相关

- [CLI 参考](/cli)
- [语音呼叫插件](/plugins/voice-call)
