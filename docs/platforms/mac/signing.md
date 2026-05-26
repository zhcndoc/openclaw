---
summary: "打包脚本生成的 macOS 调试构建签名步骤"
read_when:
  - 构建或签署 mac 调试构建
title: "macOS 签名"
---

# mac 签名（调试构建）

这个应用通常由 [`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) 构建，该脚本现在会：

- 设置一个稳定的调试 bundle 标识符：`ai.openclaw.mac.debug`
- 使用该 bundle id 写入 Info.plist（可通过 `BUNDLE_ID=...` 覆盖）
- 调用 [`scripts/codesign-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/codesign-mac-app.sh) 对主二进制文件和 app bundle 进行签名，使 macOS 将每次重建视为同一个已签名 bundle，并保留 TCC 权限（通知、辅助功能、屏幕录制、麦克风、语音）。若要获得稳定的权限，请使用真实签名身份；ad-hoc 仅可显式启用且较脆弱（参见 [macOS permissions](/platforms/mac/permissions)）。
- 默认使用 `CODESIGN_TIMESTAMP=auto`；它会为 Developer ID 签名启用受信任时间戳。设置 `CODESIGN_TIMESTAMP=off` 可跳过时间戳（离线调试构建）。
- 向 Info.plist 注入构建元数据：`OpenClawBuildTimestamp`（UTC）和 `OpenClawGitCommit`（短哈希），以便 About 面板显示构建、git 和 debug/release 渠道。
- **打包默认使用 Node 24**：脚本会运行 TS 构建和 Control UI 构建。为了兼容性，仍支持 Node 22 LTS，目前为 `22.19+`。
- 从环境中读取 `SIGN_IDENTITY`。将 `export SIGN_IDENTITY="Apple Development: Your Name (TEAMID)"`（或你的 Developer ID Application 证书）添加到 shell rc 中，即可始终使用你的证书进行签名。ad-hoc 签名需要通过 `ALLOW_ADHOC_SIGNING=1` 或 `SIGN_IDENTITY="-"` 显式启用（不建议用于权限测试）。
- 签名后运行 Team ID 审核，如果 app bundle 内任何 Mach-O 的签名 Team ID 不同，则失败。设置 `SKIP_TEAM_ID_CHECK=1` 可绕过。

## 使用方法

```bash
# 从仓库根目录执行
scripts/package-mac-app.sh               # 自动选择身份；若未找到则报错
SIGN_IDENTITY="Developer ID Application: Your Name" scripts/package-mac-app.sh   # 真实证书
ALLOW_ADHOC_SIGNING=1 scripts/package-mac-app.sh    # ad-hoc（权限不会保留）
SIGN_IDENTITY="-" scripts/package-mac-app.sh        # 显式 ad-hoc（同样的注意事项）
DISABLE_LIBRARY_VALIDATION=1 scripts/package-mac-app.sh   # 仅开发用的 Sparkle Team ID 不匹配解决方案
```

### Ad-hoc 签名说明

当使用 `SIGN_IDENTITY="-"`（ad-hoc）进行签名时，脚本会自动禁用 **Hardened Runtime**（`--options runtime`）。这是为了防止应用尝试加载与其不具有相同 Team ID 的内嵌框架（如 Sparkle）时崩溃。ad-hoc 签名也会破坏 TCC 权限持久化；请参见 [macOS 权限](/platforms/mac/permissions) 获取恢复步骤。

## About 的构建元数据

`package-mac-app.sh` 会在 bundle 中写入：

- `OpenClawBuildTimestamp`：打包时的 ISO8601 UTC 时间
- `OpenClawGitCommit`：短 git 哈希（若不可用则为 `unknown`）

About 选项卡会读取这些键，以显示版本、构建日期、git 提交，以及是否为调试构建（通过 `#if DEBUG`）。在代码更改后运行打包脚本以刷新这些值。

## 原因

TCC 权限与 bundle 标识符 _以及_ 代码签名绑定。UUID 每次变化的未签名调试构建会导致 macOS 在每次重建后忘记授权。对二进制进行签名（默认使用 ad-hoc）并保持固定的 bundle id/path（`dist/OpenClaw.app`）可以在构建之间保留授权，这与 VibeTunnel 的做法一致。

## 相关内容

- [macOS 应用](/platforms/macos)
- [macOS 权限](/platforms/mac/permissions)
