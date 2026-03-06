---
summary: "OpenClaw 如何在 macOS 应用中将 Apple 设备型号标识符映射为友好名称。"
read_when:
  - 更新设备型号标识符映射或 NOTICE/许可证文件时
  - 更改 Instances 界面中设备名称显示方式时
title: "设备型号数据库"
---

# 设备型号数据库（友好名称）

macOS 伴随应用通过将 Apple 型号标识符（例如 `iPad16,6`、`Mac16,6`）映射为可读友好的名称，在 **Instances** 界面展示 Apple 设备的友好型号名称。

该映射以 JSON 格式管理于：

- `apps/macos/Sources/OpenClaw/Resources/DeviceModels/`

## 数据来源

我们目前使用 MIT 许可的仓库提供的映射：

- `kyle-seongwoo-jun/apple-device-identifiers`

为了保证构建的确定性，JSON 文件固定引用特定上游提交（记录在 `apps/macos/Sources/OpenClaw/Resources/DeviceModels/NOTICE.md` 中）。

## 更新数据库

1. 选择你要固定的上游提交（一个用于 iOS，一个用于 macOS）。
2. 更新 `apps/macos/Sources/OpenClaw/Resources/DeviceModels/NOTICE.md` 中的提交哈希。
3. 重新下载对应提交的 JSON 文件：

```bash
IOS_COMMIT="<ios-device-identifiers.json 的提交哈希>"
MAC_COMMIT="<mac-device-identifiers.json 的提交哈希>"

curl -fsSL "https://raw.githubusercontent.com/kyle-seongwoo-jun/apple-device-identifiers/${IOS_COMMIT}/ios-device-identifiers.json" \
  -o apps/macos/Sources/OpenClaw/Resources/DeviceModels/ios-device-identifiers.json

curl -fsSL "https://raw.githubusercontent.com/kyle-seongwoo-jun/apple-device-identifiers/${MAC_COMMIT}/mac-device-identifiers.json" \
  -o apps/macos/Sources/OpenClaw/Resources/DeviceModels/mac-device-identifiers.json
```

4. 确认 `apps/macos/Sources/OpenClaw/Resources/DeviceModels/LICENSE.apple-device-identifiers.txt` 与上游许可证一致（若上游许可证变化，请替换该文件）。
5. 验证 macOS 应用能干净地构建（无警告）：

```bash
swift build --package-path apps/macos
```
