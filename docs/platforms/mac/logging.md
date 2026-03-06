---
summary: "OpenClaw 日志记录：滚动诊断文件日志 + 统一日志隐私标志"
read_when:
  - 捕获 macOS 日志或调查私有数据日志记录时
  - 调试语音唤醒/会话生命周期问题时
title: "macOS 日志记录"
---

# 日志记录（macOS）

## 滚动诊断文件日志（调试面板）

OpenClaw 通过 swift-log 路由 macOS 应用日志（默认采用统一日志），并且在需要持久化捕获时可以将本地滚动文件日志写入磁盘。

- 详细程度：**调试面板 → 日志 → 应用日志 → 详细程度**
- 启用：**调试面板 → 日志 → 应用日志 → “写入滚动诊断日志（JSONL）”**
- 位置：`~/Library/Logs/OpenClaw/diagnostics.jsonl`（自动轮换；旧文件后缀为 `.1`、`.2` 等）
- 清除：**调试面板 → 日志 → 应用日志 → “清除”**

注意：

- 默认**关闭**。仅在主动调试时启用。
- 将该文件视为敏感信息；未经审查请勿共享。

## macOS 统一日志的私有数据

统一日志会对大多数载荷进行脱敏，除非子系统选择开启 `privacy -off`。根据 Peter 关于 macOS [日志隐私问题](https://steipete.me/posts/2025/logging-privacy-shenanigans)（2025 年）的文章，这是通过放置在 `/Library/Preferences/Logging/Subsystems/` 目录下的以子系统名称为键的 plist 文件控制的。只有新日志条目会应用该标志，所以请在复现问题前启用。

## 为 OpenClaw（`ai.openclaw`）启用

- 先将 plist 写入临时文件，再以 root 身份原子方式安装：

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

- 不需要重启；logd 会快速发现该文件，但只有新日志行会包含私有载荷。
- 可用现有辅助脚本查看更丰富的输出，例如 `./scripts/clawlog.sh --category WebChat --last 5m`。

## 调试结束后禁用

- 删除覆盖文件：`sudo rm /Library/Preferences/Logging/Subsystems/ai.openclaw.plist`。
- 可选执行 `sudo log config --reload`，强制 logd 立即丢弃该覆盖。
- 记住该日志可能包含电话号码和消息内容；仅在你确实需要额外细节时保持该 plist 文件存在。
