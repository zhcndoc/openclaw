---
summary: "macOS 权限持久化（TCC）和签名要求"
read_when:
  - 调试缺失或卡住的 macOS 权限提示
  - 决定是否向 node 或 CLI 运行时授予辅助功能权限
  - 打包或签名 macOS 应用
  - 更改 bundle ID 或应用安装路径
title: "macOS 权限"
---

macOS 权限授权是脆弱的。TCC 会将权限授权与应用的代码签名、bundle 标识符以及磁盘上的路径关联起来。如果其中任何一项发生变化，macOS 就会将该应用视为新的应用，并且可能会丢弃或隐藏提示。

## 稳定权限的要求

- 相同路径：从固定位置运行应用（对于 OpenClaw，`dist/OpenClaw.app`）。
- 相同的 bundle 标识符：OpenClaw 的 bundle ID 是 `ai.openclaw.mac`；更改它会创建新的权限身份。
- 已签名应用：未签名或使用 ad-hoc 签名的构建不会保留权限。
- 一致的签名：使用真正的 Apple Development 或 Developer ID 证书，以便签名在多次重新构建之间保持稳定。

ad-hoc 签名每次构建都会生成一个新的身份。macOS 会忘记之前授予的权限，提示可能会完全消失，直到清除过期条目。

## Node 和 CLI 运行时的辅助功能权限授予

优先将辅助功能权限授予 OpenClaw.app、Peekaboo.app，或其他带有自己 bundle 标识符的已签名辅助程序，而不是通用的 `node` 二进制文件。

macOS TCC 会将辅助功能权限授予其所见进程的代码标识。若某个 Homebrew、nvm、pnpm 或 npm 工作流导致共享的 `node` 可执行文件获得了辅助功能权限，那么通过同一可执行文件启动的任何 JavaScript 包都可能继承 GUI 自动化权限。

请将系统设置中的 `node` 项视为授予该 Node 运行时的广泛权限，而不是只授予某个 npm 包的权限。除非你信任通过该特定 Node 安装启动的每个脚本和包，否则不要将辅助功能权限授予 `node`。

如果你不小心将辅助功能权限授予了 `node`，请在 系统设置 -> 隐私与安全性 -> 辅助功能 中移除该项。然后再将权限授予应当拥有 UI 自动化能力的已签名应用或辅助程序。

## 当提示消失时的恢复清单

1. 退出应用。
2. 在 系统设置 -> 隐私与安全性 中移除该应用条目。
3. 从相同路径重新启动应用并重新授予权限。
4. 如果提示仍然没有出现，使用 `tccutil` 重置 TCC 条目并重试。
5. 某些权限只有在完整重启 macOS 后才会重新出现。

示例重置（使用 OpenClaw 的 bundle ID，`ai.openclaw.mac`）：

```bash
sudo tccutil reset Accessibility ai.openclaw.mac
sudo tccutil reset ScreenCapture ai.openclaw.mac
sudo tccutil reset AppleEvents
```

## 文件和文件夹权限（桌面/文稿/下载）

对于终端/后台进程，macOS 也可能对桌面、文稿和下载目录进行限制。如果文件读取或目录列表卡住，请向执行文件操作的同一进程上下文授予访问权限（例如 Terminal/iTerm、LaunchAgent 启动的应用，或 SSH 进程）。

变通方法：如果你想避免逐文件夹授权，请将文件移动到 OpenClaw 工作区（`~/.openclaw/workspace`）。

如果你正在测试权限，请始终使用真实证书进行签名。仅在不涉及权限的快速本地运行中，才可接受 ad-hoc 构建。

## 相关

- [macOS 应用](/platforms/macos)
- [macOS 签名](/platforms/mac/signing)
