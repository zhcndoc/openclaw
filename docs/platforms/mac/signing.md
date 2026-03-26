---
summary: "macOS 调试构建的打包脚本签名步骤"
read_when:
  - 构建或签名 mac 调试构建时
title: "macOS 签名"
---

# mac 签名（调试构建）

此应用通常由 [`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) 构建，该脚本现在：

- 设置一个稳定的调试包标识符：`ai.openclaw.mac.debug`
- 使用该包标识符写入 Info.plist（可通过 `BUNDLE_ID=...` 覆盖）
- 调用 [`scripts/codesign-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/codesign-mac-app.sh) 对主二进制文件和应用包进行签名，使 macOS 将每次重建视为同一个已签名包，并保留 TCC 权限（通知、辅助功能、屏幕录制、麦克风、语音）。为了获得稳定的权限，请使用真实的签名身份；临时签名是可选的且较脆弱（参见 [macOS 权限](/platforms/mac/permissions)）。
- 默认使用 `CODESIGN_TIMESTAMP=auto`；它会为 Developer ID 签名启用受信任的时间戳。将 `CODESIGN_TIMESTAMP=off` 可跳过时间戳（离线调试构建）。
- 向 Info.plist 注入构建元数据：`OpenClawBuildTimestamp`（UTC）和 `OpenClawGitCommit`（短哈希），以便“关于”面板可以显示构建、git 和调试/发布通道。
- **打包默认使用 Node 24**：该脚本会运行 TS 构建和 Control UI 构建。为了兼容性，当前仍支持 Node 22 LTS（`22.14+`）。
- 从环境中读取 `SIGN_IDENTITY`。将 `export SIGN_IDENTITY="Apple Development: Your Name (TEAMID)"`（或你的 Developer ID Application 证书）添加到 shell rc 中，即可始终使用你的证书进行签名。临时签名需要通过 `ALLOW_ADHOC_SIGNING=1` 或 `SIGN_IDENTITY="-"` 明确启用（不建议用于权限测试）。
- 签名后执行 Team ID 审核，如果应用包内任何 Mach-O 的签名 Team ID 不同则失败。设置 `SKIP_TEAM_ID_CHECK=1` 可跳过。

## 使用方法

```bash
# 从仓库根目录运行
scripts/package-mac-app.sh               # 自动选择签名身份；无身份则报错
SIGN_IDENTITY="Developer ID Application: 你的名字" scripts/package-mac-app.sh   # 使用真实证书
ALLOW_ADHOC_SIGNING=1 scripts/package-mac-app.sh    # 临时签名（权限不会持久）
SIGN_IDENTITY="-" scripts/package-mac-app.sh        # 显式临时签名（同样限制）
DISABLE_LIBRARY_VALIDATION=1 scripts/package-mac-app.sh   # 仅开发用 Sparkle Team ID 不匹配的变通方案
```

### 临时签名注意事项

使用 `SIGN_IDENTITY="-"` （临时签名）时，脚本会自动禁用 **Hardened Runtime**（`--options runtime`）。这是为了防止应用在加载不共享相同 Team ID 的内嵌框架（如 Sparkle）时崩溃。临时签名也会导致 TCC 权限无法持久保存，详见[macOS 权限](/platforms/mac/permissions)了解恢复步骤。

## “关于”面板的构建元数据

`package-mac-app.sh` 会在包中添加：

- `OpenClawBuildTimestamp`：打包时的 ISO8601 UTC 时间戳
- `OpenClawGitCommit`：git 短哈希（不可用时为 `unknown`）

“关于”标签页读取这些键以显示版本、构建日期、git 提交信息及是否为调试构建（通过 `#if DEBUG`）。代码更改后运行打包脚本以刷新这些值。

## 原因

TCC 权限绑定于包标识符和代码签名。未签名且具有不断变化 UUID 的调试构建会导致 macOS 每次重建后丢失权限。签名二进制（默认临时签名）并保持固定的包 ID/路径（`dist/OpenClaw.app`）可以在构建间保留权限，这与 VibeTunnel 的方法相似。
