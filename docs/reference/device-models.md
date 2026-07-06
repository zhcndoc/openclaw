---
summary: "OpenClaw 如何为 Apple 设备型号标识符提供便于阅读的名称，以供 macOS 应用使用。"
read_when:
  - 更新设备型号标识符映射或 NOTICE/license 文件时
  - 更改 Instances UI 显示设备名称的方式时
title: "设备型号数据库"
---

macOS 配套应用的 **Instances** 界面会将 Apple 型号标识符映射为易读名称（`iPad16,6` -> "iPad Pro 13-inch (M4)"，`Mac16,6` -> "MacBook Pro (14-inch, 2024)"）。`DeviceModelCatalog` 还会使用标识符前缀（在回退时使用设备家族）为每个设备选择一个 SF Symbol。

位于 `apps/macos/Sources/OpenClaw/Resources/DeviceModels/` 的文件：

| File                                   | Purpose                               |
| -------------------------------------- | ------------------------------------- |
| `ios-device-identifiers.json`          | iOS/iPadOS 标识符 -> 名称映射         |
| `mac-device-identifiers.json`          | Mac 标识符 -> 名称映射                |
| `NOTICE.md`                            | 固定的上游 commit SHA                |
| `LICENSE.apple-device-identifiers.txt` | 上游 MIT 许可证                      |

## 数据源

来源于 MIT 许可的 `kyle-seongwoo-jun/apple-device-identifiers` GitHub 仓库。JSON 文件固定到 `NOTICE.md` 中记录的提交 SHA，以保持构建的确定性。

## 更新数据库

1. 选择要固定的上游提交 SHA（iOS 一个，macOS 一个）。
2. 使用新的 SHA 更新 `apps/macos/Sources/OpenClaw/Resources/DeviceModels/NOTICE.md`。
3. 重新下载固定到这些提交的 JSON 文件：

```bash
IOS_COMMIT="<ios-device-identifiers.json 的提交 sha>"
MAC_COMMIT="<mac-device-identifiers.json 的提交 sha>"

curl -fsSL "https://raw.githubusercontent.com/kyle-seongwoo-jun/apple-device-identifiers/${IOS_COMMIT}/ios-device-identifiers.json" \
  -o apps/macos/Sources/OpenClaw/Resources/DeviceModels/ios-device-identifiers.json

curl -fsSL "https://raw.githubusercontent.com/kyle-seongwoo-jun/apple-device-identifiers/${MAC_COMMIT}/mac-device-identifiers.json" \
  -o apps/macos/Sources/OpenClaw/Resources/DeviceModels/mac-device-identifiers.json
```

4. 确认 `LICENSE.apple-device-identifiers.txt` 仍与上游一致；如果上游许可证已更改，则替换它。
5. 验证 macOS 应用可以正常构建：

```bash
swift build --package-path apps/macos
```

## 相关内容

- [节点](/nodes)
- [节点故障排除](/nodes/troubleshooting)
