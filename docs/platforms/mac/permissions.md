---
summary: "macOS 权限持久化（TCC）与签名要求"
read_when:
  - 调试缺失或卡住的 macOS 权限提示时
  - 打包或签名 macOS 应用时
  - 更改 Bundle ID 或应用安装路径时
title: "macOS 权限"
---

# macOS 权限（TCC）

macOS 的权限授权非常脆弱。TCC 会将权限授权与应用的代码签名、Bundle 标识符，以及磁盘上的路径关联起来。如果这些任一项发生变化，macOS 会将应用视为新应用，可能会丢失或隐藏权限提示。

## 稳定权限的要求

- 路径不变：从固定位置运行应用（对于 OpenClaw，是 `dist/OpenClaw.app`）。
- Bundle Identifier 不变：更改 Bundle ID 会创建新的权限身份。
- 应用已签名：未签名或临时签名的构建不会持久保存权限。
- 签名一致：使用真实的 Apple Development 或 Developer ID 证书，确保签名在重建过程中保持稳定。

临时签名每次构建都会生成新的身份。macOS 会忘记之前的授权，提示可能会完全消失，直到过期的条目被清理。

## 当提示消失时的恢复检查清单

1. 退出应用。
2. 在「系统设置 -> 隐私与安全」中移除该应用的条目。
3. 从相同路径重新启动应用并重新授权权限。
4. 如果仍无提示，使用 `tccutil` 重置 TCC 条目后再试。
5. 某些权限只有在完全重启 macOS 后才会重新出现。

重置示例（请根据需要替换 Bundle ID）：

```bash
sudo tccutil reset Accessibility ai.openclaw.mac
sudo tccutil reset ScreenCapture ai.openclaw.mac
sudo tccutil reset AppleEvents
```

## 文件和文件夹权限（桌面/文稿/下载）

macOS 也会针对终端或后台进程限制访问桌面、文稿和下载文件夹。如果文件读取或目录列表卡顿，需授权执行文件操作的进程上下文（例如 Terminal/iTerm、由 LaunchAgent 启动的应用，或 SSH 进程）。

变通方案：如果想避免为每个文件夹单独授权，可以将文件移到 OpenClaw 工作区（`~/.openclaw/workspace`）内。

如果你在测试权限，请务必用真实证书签名。临时构建只适合快速本地运行，不适用于有权限需求的情况。
