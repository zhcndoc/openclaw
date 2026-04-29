---
summary: "OpenClaw 如何为 Apple 设备型号标识符提供便于阅读的名称，以供 macOS 应用使用。"
read_when:
  - 更新设备型号标识符映射或 NOTICE/license 文件时
  - 更改 Instances UI 显示设备名称的方式时
title: "设备型号数据库"
---

macOS 配套应用通过将 Apple 型号标识符（例如 `iPad16,6`、`Mac16,6`）映射为可读名称，在 **Instances** UI 中显示友好的 Apple 设备型号名称。

该映射以 JSON 形式放在以下目录中：

- `apps/macos/Sources/OpenClaw/Resources/DeviceModels/`

## 数据源

我们目前从以下 MIT 许可证仓库中引入该映射：

- `kyle-seongwoo-jun/apple-device-identifiers`

为保持构建结果可预测，这些 JSON 文件会固定到特定的上游提交（记录在 `apps/macos/Sources/OpenClaw/Resources/DeviceModels/NOTICE.md` 中）。

## 更新数据库

1. 选择你想固定到的上游提交（iOS 一个，macOS 一个）。
2. 更新 `apps/macos/Sources/OpenClaw/Resources/DeviceModels/NOTICE.md` 中的提交哈希。
3. 重新下载固定到这些提交的 JSON 文件：

```bash
IOS_COMMIT="<ios-device-identifiers.json 的提交 sha>"
MAC_COMMIT="<mac-device-identifiers.json 的提交 sha>"

curl -fsSL "https://raw.githubusercontent.com/kyle-seongwoo-jun/apple-device-identifiers/${IOS_COMMIT}/ios-device-identifiers.json" \
  -o apps/macos/Sources/OpenClaw/Resources/DeviceModels/ios-device-identifiers.json

curl -fsSL "https://raw.githubusercontent.com/kyle-seongwoo-jun/apple-device-identifiers/${MAC_COMMIT}/mac-device-identifiers.json" \
  -o apps/macos/Sources/OpenClaw/Resources/DeviceModels/mac-device-identifiers.json
```

4. 确保 `apps/macos/Sources/OpenClaw/Resources/DeviceModels/LICENSE.apple-device-identifiers.txt` 仍与上游一致（如果上游许可证发生变化，请替换它）。
5. 验证 macOS 应用可以干净构建（无警告）：

```bash
swift build --package-path apps/macos
```

## 相关内容

- [Nodes](/nodes)
- [Node troubleshooting](/nodes/troubleshooting)
