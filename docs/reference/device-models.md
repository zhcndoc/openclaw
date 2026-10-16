---
summary: "OpenClaw 如何为 Apple 设备型号标识符提供便于阅读的名称，以供 macOS 应用使用。"
read_when:
  - "更新设备型号标识符映射或 NOTICE/license 文件时"
  - "更改 Instances UI 显示设备名称的方式时"
title: "设备型号数据库"
---

macOS 配套应用程序的 **Instances** UI 将 Apple 模型标识符映射到友好名称（`iPad16,6` ->“iPad Pro 13 英寸 （M4）”、`Mac16,6` ->“MacBook Pro（14 英寸，2024 年）”）。 `DeviceModelCatalog` 还使用标识符前缀（回退到设备系列）来为每个设备选择 SF 符号。

位于 `apps/macos/Sources/OpenClaw/Resources/DeviceModels/` 的文件：

| 文件                                   | 用途                               |
| -------------------------------------- | ------------------------------------- |
| `ios-device-identifiers.json`          | iOS/iPadOS 标识符 -> 名称映射 |
| `mac-device-identifiers.json`          | Mac 标识符 -> 名称映射        |
| `NOTICE.md`                            | 固定的上游提交 SHA           |
| `LICENSE.apple-device-identifiers.txt` | 上游 MIT 许可证                  |

## <a id="data-source"></a> 数据源

从 MIT- 许可的 `kyle-seongwoo-jun/apple-device-identifiers` GitHub 存储库提供。 JSON 文件固定到 `NOTICE.md` 中记录的提交 SHA，以保持构建的可重复性。

## <a id="updating-the-database"></a> 更新数据库

1. 选择要固定的上游提交 SHA（一个用于 iOS，一个用于 macOS）。
2. 使用新的 SHA 更新 `apps/macos/Sources/OpenClaw/Resources/DeviceModels/NOTICE.md`。
3. 重新下载固定到这些提交的 JSON 文件：

```bash
IOS_COMMIT="<commit sha for ios-device-identifiers.json>"
MAC_COMMIT="<commit sha for mac-device-identifiers.json>"

curl -fsSL "https://raw.githubusercontent.com/kyle-seongwoo-jun/apple-device-identifiers/${IOS_COMMIT}/ios-device-identifiers.json" \
  -o apps/macos/Sources/OpenClaw/Resources/DeviceModels/ios-device-identifiers.json

curl -fsSL "https://raw.githubusercontent.com/kyle-seongwoo-jun/apple-device-identifiers/${MAC_COMMIT}/mac-device-identifiers.json" \
  -o apps/macos/Sources/OpenClaw/Resources/DeviceModels/mac-device-identifiers.json
```

4. 确认 `LICENSE.apple-device-identifiers.txt` 仍与上游一致；如果上游许可证已更改，则替换它。
5. 安装工作区依赖项后，从存储库根运行以下命令以准备共享聊天资产并验证 macOS 应用程序版本：

```bash
node scripts/prepare-apple-mermaid.mjs
swift build --package-path apps/macos
```

## <a id="related"></a> 相关内容

- [节点](/nodes)
- [节点故障排查](/nodes/troubleshooting)
