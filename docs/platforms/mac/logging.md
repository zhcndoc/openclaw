---
summary: "OpenClaw 日志：滚动诊断文件日志 + 统一日志隐私标志"
read_when:
  - 捕获 macOS 日志或调查私有数据日志记录
  - 调试语音唤醒/会话生命周期问题
title: "macOS 日志"
---

# 日志（macOS）

## 滚动诊断文件日志（调试面板）

OpenClaw 通过 swift-log 路由 macOS 应用日志（默认使用统一日志），并且在你需要持久化捕获时，可以将本地的滚动文件日志写入磁盘。

- 详细程度：**调试面板 → 日志 → 应用日志 → 详细程度**
- 启用：**调试面板 → 日志 → 应用日志 → “写入滚动诊断日志（JSONL）”**
- 位置：`~/Library/Logs/OpenClaw/diagnostics.jsonl`（会自动轮转；旧文件后缀为 `.1`、`.2`，……）
- 清除：**调试面板 → 日志 → 应用日志 → “清除”**

说明：

- 这项功能默认是**关闭**的。仅在主动调试时启用。
- 请将该文件视为敏感信息；未经检查不要分享。

## macOS 上的统一日志私有数据

统一日志会对大多数负载内容进行脱敏，除非某个子系统选择启用 `privacy -off`。根据 Peter 关于 macOS [日志隐私乱象](https://steipete.me/posts/2025/logging-privacy-shenanigans) 的文章（2025），这由 `/Library/Preferences/Logging/Subsystems/` 中一个以子系统名称为键的 plist 控制。只有新的日志条目才会应用该标志，因此请在复现问题之前启用它。

## 为 OpenClaw（`ai.openclaw`）启用

- 先将 plist 写入临时文件，然后以 root 身份原子性地安装它：

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

- 不需要重启；logd 很快就会注意到该文件，但只有新的日志行才会包含私有负载。
- 使用现有的辅助工具查看更丰富的输出，例如 `./scripts/clawlog.sh --category WebChat --last 5m`。

## 调试后禁用

- 删除覆盖：`sudo rm /Library/Preferences/Logging/Subsystems/ai.openclaw.plist`。
- 也可以运行 `sudo log config --reload`，强制 logd 立即放弃该覆盖。
- 请记住，这一范围可能包含电话号码和消息正文；仅在你确实需要额外细节时才保留该 plist。

## 相关

- [macOS 应用](/platforms/macos)
- [网关日志](/gateway/logging)
