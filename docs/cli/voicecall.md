---
summary: "CLI `openclaw voicecall` 参考（语音呼叫插件命令面）"
read_when:
  - 你使用语音呼叫插件并想查看 CLI 入口
  - 你想快速查看 `voicecall setup|smoke|call|continue|dtmf|status|tail|expose` 的示例
title: "Voicecall"
---

# `openclaw voicecall`

`voicecall` 是一个由插件提供的命令。它仅在语音呼叫插件已安装并启用时出现。

当 Gateway 运行时，操作命令（`call`、`start`、
`continue`、`speak`、`dtmf`、`end` 和 `status`）会发送到该 Gateway 的
语音呼叫运行时。如果没有可达的 Gateway，它们会回退到独立的
CLI 运行时。

主要文档：

- 语音呼叫插件：[Voice Call](/plugins/voice-call)

## 常用命令

```bash
openclaw voicecall setup
openclaw voicecall smoke
openclaw voicecall status --json
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

`status` 默认会以 JSON 形式打印活动呼叫。传入 `--call-id <id>` 可检查
某个呼叫。

对于外部提供商（`twilio`、`telnyx`、`plivo`），setup 必须从 `publicUrl`、隧道或 Tailscale 暴露中解析出一个公网可访问的 webhook URL。由于运营商无法访问回环/私有地址，因此会拒绝使用本地回环/私有 serve 作为回退方案。

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
