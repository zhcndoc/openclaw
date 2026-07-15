---
summary: "打包脚本生成的 macOS 调试构建签名步骤"
read_when:
  - 构建或签署 mac 调试构建
title: "macOS 签名"
---

# mac 签名（调试构建）

[`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) 会将应用构建并打包到固定路径（`dist/OpenClaw.app`），然后调用 [`scripts/codesign-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/codesign-mac-app.sh) 对其进行签名。TCC 权限与 bundle ID 和代码签名绑定；在多次重新构建时保持二者稳定（以及应用位于固定路径）可防止 macOS 忘记 TCC 授权（通知、辅助功能、屏幕录制、麦克风、语音）。

- 调试 bundle identifier 默认值为 `ai.openclaw.mac.debug`（可通过 `BUNDLE_ID=...` 覆盖）。
- Node：`>=22.22.3 <23`、`>=24.15.0 <25` 或 `>=25.9.0`（仓库 `package.json` 中的 `engines`）。打包脚本还会构建 Control UI（`pnpm ui:build`）。
- 默认需要真实的签名身份；如果未找到任何身份且未设置 `ALLOW_ADHOC_SIGNING`，codesign 脚本会报错退出。ad-hoc 签名（`SIGN_IDENTITY="-"`）需要显式启用，且不会在重新构建后保留 TCC 权限。参见 [macOS 权限](/platforms/mac/permissions)。
- 从环境中读取 `SIGN_IDENTITY`（例如 `export SIGN_IDENTITY="Apple Development: Your Name (TEAMID)"`，或 Developer ID Application 证书）。如果未设置，`codesign-mac-app.sh` 会按以下顺序自动选择身份：Developer ID Application、Apple Distribution、Apple Development，然后是找到的第一个有效代码签名身份。
- `CODESIGN_TIMESTAMP=auto`（默认）仅为 Developer ID Application 签名启用受信任时间戳。设置为 `on`/`off` 可强制指定。
- 在 Info.plist 中写入 `OpenClawBuildTimestamp`（ISO8601 UTC）和 `OpenClawGitCommit`（短哈希，若不可用则为 `unknown`），以便 About 选项卡显示构建、git 和 debug/release 渠道信息。
- 签名后会执行 Team ID 审核；如果 bundle 内任何 Mach-O 的 Team ID 不同则失败。可设置 `SKIP_TEAM_ID_CHECK=1` 跳过。

## 使用方法

```bash
# 从仓库根目录
scripts/package-mac-app.sh                                                      # 自动选择签名标识；若未找到则报错
SIGN_IDENTITY="Developer ID Application: Your Name" scripts/package-mac-app.sh   # 真实证书
ALLOW_ADHOC_SIGNING=1 scripts/package-mac-app.sh                                 # 临时签名（权限不会保留）
SIGN_IDENTITY="-" scripts/package-mac-app.sh                                     # 显式临时签名（同样的注意事项）
DISABLE_LIBRARY_VALIDATION=1 scripts/package-mac-app.sh                          # 仅开发时使用的 Sparkle Team ID 不匹配绕过方案
```

### 临时签名说明

`SIGN_IDENTITY="-"` 会禁用 Hardened Runtime（`--options runtime`），以防止应用加载未与其共享相同 Team ID 的嵌入式框架（如 Sparkle）时崩溃。临时签名还会破坏 TCC 权限持久化；有关恢复步骤，请参阅 [macOS 权限](/platforms/mac/permissions)。

## 关于的构建元数据

About 选项卡从 Info.plist 中读取 `OpenClawBuildTimestamp` 和 `OpenClawGitCommit`，以显示版本、构建日期、git 提交，以及该构建是否为 DEBUG（通过 `#if DEBUG`）。在代码更改后重新运行打包器以刷新这些值。

## 相关内容

- [macOS 应用](/platforms/macos)
- [macOS 权限](/platforms/mac/permissions)
