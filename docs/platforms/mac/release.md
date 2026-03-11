---
summary: "OpenClaw macOS 发布清单（Sparkle 源、打包、签名）"
read_when:
  - 裁切或验证 OpenClaw macOS 版本发布时
  - 更新 Sparkle appcast 或源资源时
title: "macOS 发布"
---

# OpenClaw macOS 发布（Sparkle）

该应用现已集成 Sparkle 自动更新。发布版本必须经过 Developer ID 签名，压缩，并附带已签名的 appcast 条目进行发布。

## 前提条件

- 已安装 Developer ID 应用证书（示例：`Developer ID Application: <开发者名称> (<TEAMID>)`）。
- Sparkle 私钥路径以环境变量 `SPARKLE_PRIVATE_KEY_FILE` 形式设置（指向你的 Sparkle ed25519 私钥路径；公钥已内嵌于 Info.plist 中）。如果缺失，请检查 `~/.profile`。
- 若希望发行 Gatekeeper 认可的 DMG/zip，需要 Notary 凭据（钥匙串配置或 API key）供 `xcrun notarytool` 使用。
  - 我们采用钥匙串配置文件，名为 `openclaw-notary`，从 App Store Connect API key 环境变量创建，变量包含：
    - `APP_STORE_CONNECT_API_KEY_P8`，`APP_STORE_CONNECT_KEY_ID`，`APP_STORE_CONNECT_ISSUER_ID`
    - `echo "$APP_STORE_CONNECT_API_KEY_P8" | sed 's/\\n/\n/g' > /tmp/openclaw-notary.p8`
    - `xcrun notarytool store-credentials "openclaw-notary" --key /tmp/openclaw-notary.p8 --key-id "$APP_STORE_CONNECT_KEY_ID" --issuer "$APP_STORE_CONNECT_ISSUER_ID"`
- 已安装 `pnpm` 依赖（`pnpm install --config.node-linker=hoisted`）。
- Sparkle 工具通过 SwiftPM 自动下载，位于 `apps/macos/.build/artifacts/sparkle/Sparkle/bin/`（包含 `sign_update`、`generate_appcast` 等工具）。

## 构建与打包

注意事项：

- `APP_BUILD` 映射到 `CFBundleVersion`/`sparkle:version`；必须保持数值型且单调递增（不可包含 `-beta`），否则 Sparkle 视为版本相同。
- 若未指定 `APP_BUILD`，`scripts/package-mac-app.sh` 会基于 `APP_VERSION` 自动派生一个 Sparkle 兼容的默认值（格式为 `YYYYMMDDNN`：稳定版本默认为 `90`，预发布版根据后缀派生流水号），并取其与 Git 提交计数中较大的值。
- 发布过程中仍可显式覆盖 `APP_BUILD`，适用于需要特定单调数值的情况。
- 对于 `BUILD_CONFIG=release`，`scripts/package-mac-app.sh` 默认构建通用架构（`arm64 x86_64`），可通过 `BUILD_ARCHS=arm64` 或 `BUILD_ARCHS=x86_64` 覆盖。调试/开发构建（`BUILD_CONFIG=debug`）默认仅构建当前架构（`$(uname -m)`）。
- 发布版本使用 `scripts/package-mac-dist.sh` 生成发行包（zip + DMG + 公证）。本地/开发版本使用 `scripts/package-mac-app.sh` 打包。

```bash
# 从仓库根目录执行；设置发布 ID 以启用 Sparkle feed。
# 此命令构建无公证的发布制品。
# APP_BUILD 必须是数值型且单调递增，供 Sparkle 比较。
# 略过时默认基于 APP_VERSION 自动派生。
SKIP_NOTARIZE=1 \
BUNDLE_ID=ai.openclaw.mac \
APP_VERSION=2026.3.9 \
BUILD_CONFIG=release \
SIGN_IDENTITY="Developer ID Application: <Developer Name> (<TEAMID>)" \
scripts/package-mac-dist.sh

# `package-mac-dist.sh` 已自动生成 zip 和 DMG。
# 如果直接使用 `package-mac-app.sh`，需手动创建：
# 如果希望在此步骤进行公证/钉扎，请使用下面的 NOTARIZE 命令。
ditto -c -k --sequesterRsrc --keepParent dist/OpenClaw.app dist/OpenClaw-2026.3.9.zip

# 可选：构建一个带样式的 DMG 给用户（拖动到 /Applications）
scripts/create-dmg.sh dist/OpenClaw.app dist/OpenClaw-2026.3.9.dmg

# 推荐：生成并进行公证+钉扎的 zip 与 DMG
# 首次需创建钥匙串配置：
#   xcrun notarytool store-credentials "openclaw-notary" \
#     --apple-id "<apple-id>" --team-id "<team-id>" --password "<应用专用密码>"
NOTARIZE=1 NOTARYTOOL_PROFILE=openclaw-notary \
BUNDLE_ID=ai.openclaw.mac \
APP_VERSION=2026.3.9 \
BUILD_CONFIG=release \
SIGN_IDENTITY="Developer ID Application: <开发者名称> (<TEAMID>)" \
scripts/package-mac-dist.sh

# 可选：发布时附带 dSYM 文件
ditto -c -k --keepParent apps/macos/.build/release/OpenClaw.app.dSYM dist/OpenClaw-2026.3.9.dSYM.zip
```

## Appcast 条目

使用发布说明生成器，让 Sparkle 显示格式化的 HTML 说明：

```bash
SPARKLE_PRIVATE_KEY_FILE=/path/to/ed25519-private-key scripts/make_appcast.sh dist/OpenClaw-2026.3.9.zip https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml
```

该命令基于 `CHANGELOG.md`（通过 [`scripts/changelog-to-html.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/changelog-to-html.sh)）将发布说明转换为 HTML，并嵌入 appcast 条目中。发布时，将更新好的 `appcast.xml` 与发行制品（zip + dSYM）一并上传。

## 发布与校验

- 将 `OpenClaw-2026.3.9.zip`（及 `OpenClaw-2026.3.9.dSYM.zip`）上传至对应标签 `v2026.3.9` 的 GitHub Release。
- 确保 raw appcast URL 与发布的 feed 一致：`https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml`。
- 校验：
  - 执行 `curl -I https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml` 返回 200。
  - 资源上传后，`curl -I <enclosure url>` 返回 200。
  - 在先前的公开版本中，在“关于”标签页使用“检查更新...”功能，确认 Sparkle 能顺利安装新版本。

完成定义：签名的应用与 appcast 已发布，更新流程从以前安装的版本正常工作，发布资产已附加至 GitHub Release。
