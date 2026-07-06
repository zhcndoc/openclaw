---
summary: "OpenClaw 日志：滚动诊断文件日志 + 统一日志隐私标志"
read_when:
  - 捕获 macOS 日志或调查私有数据日志记录
  - 调试语音唤醒/会话生命周期问题
title: "macOS 日志"
---

# 日志（macOS）

## 滚动诊断文件日志（调试面板）

macOS 应用通过 swift-log（默认使用统一日志）进行日志记录，并且还可以写入轮转的本地文件日志，以便持久保存捕获内容（`DiagnosticsFileLog`）。

- 启用：**调试面板 -> 日志 -> 应用日志 -> “写入滚动诊断日志（JSONL）”**（默认关闭）。
- 详细程度：**调试面板 -> 日志 -> 应用日志 -> 详细程度** 选择器。
- 位置：`~/Library/Logs/OpenClaw/diagnostics.jsonl`。
- 轮转：在 5 MB 时轮转；最多保留 5 个备份，后缀为 `.1`...`.5`（最旧的会被删除）。
- 清除：**调试面板 -> 日志 -> 应用日志 -> “清除”** 会删除当前文件及所有备份。

请将该文件视为敏感信息；未经审查，请勿分享。

## macOS 上的统一日志私有数据

统一日志会对大多数负载内容进行脱敏，除非某个子系统选择启用 `privacy -off`。这由 `/Library/Preferences/Logging/Subsystems/` 中按子系统名称作为键的 plist 控制。只有新的日志条目才会应用该标志，因此请在复现问题之前先启用它。背景：[macOS 日志隐私把戏](https://steipete.me/posts/2025/logging-privacy-shenanigans)。

## 为 OpenClaw（`ai.openclaw`）启用

先将 plist 写入临时文件，然后以 root 身份原子性安装它：

```bash
cat <<'EOF' >/tmp/ai.openclaw.plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>DEFAULT-OPTIONS</key>
    <dict>
        <key>Enable-Private-Data</key>
        <true/>
    </dict>
</dict>
</plist>
EOF
sudo install -m 644 -o root -g wheel /tmp/ai.openclaw.plist /Library/Preferences/Logging/Subsystems/ai.openclaw.plist
```

无需重启；logd 会很快加载该文件，但只有新的日志行才会包含私有负载。使用 `./scripts/clawlog.sh --category WebChat --last 5m` 查看更丰富的输出（`--last`/`-l` 用于设置时间范围，默认 `5m`；`--category`/`-c` 用于按类别筛选）。

## 调试后禁用

- 移除覆盖：`sudo rm /Library/Preferences/Logging/Subsystems/ai.openclaw.plist`。
- 可选地运行 `sudo log config --reload`，以强制 logd 立即放弃该覆盖。
- 此表面可能包含电话号码和消息正文；仅在实际需要时保留该 plist。

## 相关

- [macOS 应用](/platforms/macos)
- [网关日志](/gateway/logging)
