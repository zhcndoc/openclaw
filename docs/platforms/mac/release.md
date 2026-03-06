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
- 安装 `pnpm` 依赖（`pnpm install --config.node-linker=hoisted`）。
- Sparkle 工具通过 SwiftPM 自动获取，位于 `apps/macos/.build/artifacts/sparkle/Sparkle/bin/`（含 `sign_update`、`generate_appcast` 等）。

## 构建与打包

注意事项：

- `APP_BUILD` 对应 `CFBundleVersion` 和 `sparkle:version`；应保持数值型且单调（无 `-beta`），否则 Sparkle 视作相同版本。
- 若省略 `APP_BUILD`，`scripts/package-mac-app.sh` 会根据 `APP_VERSION` 自动推导出 Sparkle 兼容的默认值（格式形如 `YYYYMMDDNN`：稳定版默认 `90`，预发布版根据后缀派生），并以该值与 git 提交数中的较大者为准。
- 若发布工程需要指定的单调版本号，仍可显式覆盖 `APP_BUILD`。
- 默认为当前架构（`$(uname -m)`）。构建发布/通用包时，设置 `BUILD_ARCHS="arm64 x86_64"`（或 `BUILD_ARCHS=all`）。
- 发行制品请使用 `scripts/package-mac-dist.sh`（包含 zip + DMG + 公证）。本地/开发打包用 `scripts/package-mac-app.sh`。

```bash
# 从仓库根目录执行；设置发布 ID 以启用 Sparkle 源。
# APP_BUILD 必须是数值型且单调，便于 Sparkle 比较。
# 默认省略时从 APP_VERSION 自动推导。
BUNDLE_ID=ai.openclaw.mac \
APP_VERSION=2026.3.2 \
BUILD_CONFIG=release \
SIGN_IDENTITY="Developer ID Application: <开发者名称> (<TEAMID>)" \
scripts/package-mac-app.sh

# 压缩用于发布（包含资源派生分支，支持 Sparkle 差分更新）
ditto -c -k --sequesterRsrc --keepParent dist/OpenClaw.app dist/OpenClaw-2026.3.2.zip

# 可选：生成样式化 DMG 以便用户拖拽安装至 /Applications
scripts/create-dmg.sh dist/OpenClaw.app dist/OpenClaw-2026.3.2.dmg

# 推荐：生成并公证+钉扎 zip 与 DMG
# 首次创建钥匙串配置文件：
#   xcrun notarytool store-credentials "openclaw-notary" \
#     --apple-id "<apple-id>" --team-id "<team-id>" --password "<应用专用密码>"
NOTARIZE=1 NOTARYTOOL_PROFILE=openclaw-notary \
BUNDLE_ID=ai.openclaw.mac \
APP_VERSION=2026.3.2 \
BUILD_CONFIG=release \
SIGN_IDENTITY="Developer ID Application: <开发者名称> (<TEAMID>)" \
scripts/package-mac-dist.sh

# 可选：发布时附带 dSYM
ditto -c -k --keepParent apps/macos/.build/release/OpenClaw.app.dSYM dist/OpenClaw-2026.3.2.dSYM.zip
```

## Appcast 条目

使用发布说明生成器，使 Sparkle 展示格式化 HTML 说明：

```bash
SPARKLE_PRIVATE_KEY_FILE=/path/to/ed25519-private-key scripts/make_appcast.sh dist/OpenClaw-2026.3.2.zip https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml
```

该命令基于 `CHANGELOG.md`（通过 [`scripts/changelog-to-html.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/changelog-to-html.sh)）生成 HTML 发布说明，并内嵌至 appcast 条目中。
发布时，将更新后的 `appcast.xml` 与发行制品（zip + dSYM）一并提交。

## 发布与校验

- 上传 `OpenClaw-2026.3.2.zip`（及 `OpenClaw-2026.3.2.dSYM.zip`）至对应 tag 为 `v2026.3.2` 的 GitHub Release。
- 确认 appcast 原始 URL 与内嵌源匹配：`https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml`。
- 基本校验：
  - `curl -I https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml` 返回 200。
  - `curl -I <enclosure url>` 上传资源后返回 200。
  - 在先前公开版本中，从关于面板执行“检查更新…”，确认 Sparkle 成功安装新版本。

完成定义：已发布签名应用与 appcast，更新流程从旧版本正常，发布制品已附加至 GitHub Release。
