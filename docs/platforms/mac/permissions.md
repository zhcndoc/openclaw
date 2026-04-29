---
summary: "macOS 权限持久化（TCC）和签名要求"
read_when:
  - 调试缺失或卡住的 macOS 权限提示
  - 打包或签名 macOS 应用
  - 更改 bundle ID 或应用安装路径
title: "macOS 权限"
---

macOS 的权限授权是脆弱的。TCC 会将权限授权与应用的代码签名、bundle 标识符以及磁盘上的路径关联起来。如果其中任何一项发生变化，macOS 会将该应用视为新应用，并可能丢弃或隐藏提示。

## 稳定权限的要求

- 相同路径：从固定位置运行应用（对于 OpenClaw，使用 `dist/OpenClaw.app`）。
- 相同的 bundle 标识符：更改 bundle ID 会创建新的权限身份。
- 已签名应用：未签名或 ad-hoc 签名的构建不会持久保存权限。
- 一致的签名：使用真实的 Apple Development 或 Developer ID 证书
  以便签名在多次重新构建之间保持稳定。

ad-hoc 签名会在每次构建时生成新的身份。macOS 会忘记之前的
授权，并且提示可能会完全消失，直到清除过期条目。

## 提示消失时的恢复检查清单

1. 退出应用。
2. 在 系统设置 -> 隐私与安全性 中移除该应用条目。
3. 从相同路径重新启动应用并重新授予权限。
4. 如果提示仍然没有出现，使用 `tccutil` 重置 TCC 条目并重试。
5. 某些权限只有在完整重启 macOS 后才会重新出现。

重置示例（按需替换 bundle ID）：

```bash
sudo tccutil reset Accessibility ai.openclaw.mac
sudo tccutil reset ScreenCapture ai.openclaw.mac
sudo tccutil reset AppleEvents
```

## 文件和文件夹权限（桌面/文稿/下载）

对于终端/后台进程，macOS 也可能对桌面、文稿和下载目录进行限制。如果文件读取或目录列表卡住，请向执行文件操作的同一进程上下文授予访问权限（例如 Terminal/iTerm、LaunchAgent 启动的应用，或 SSH 进程）。

变通方法：如果你想避免逐文件夹授权，请将文件移动到 OpenClaw 工作区（`~/.openclaw/workspace`）。

如果你正在测试权限，请始终使用真实证书签名。ad-hoc
构建只适用于权限无关紧要的快速本地运行场景。

## 相关

- [macOS 应用](/platforms/macos)
- [macOS 签名](/platforms/mac/signing)
