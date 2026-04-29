---
summary: "节点的位置命令（location.get）、权限模式以及 Android 前台行为"
read_when:
  - 添加位置节点支持或权限 UI
  - 设计 Android 位置权限或前台行为
title: "位置命令"
---

## TL;DR

- `location.get` 是一个节点命令（通过 `node.invoke`）。
- 默认关闭。
- Android 应用设置使用一个选择器：关闭 / 使用期间。
- 单独的开关：精确位置。

## 为什么要用选择器（而不只是一个开关）

操作系统权限是多级的。我们可以在应用内暴露一个选择器，但实际授予的权限仍由操作系统决定。

- iOS/macOS 可能在系统弹窗/设置中提供 **使用期间** 或 **始终**。
- Android 应用当前只支持前台位置。
- 精确位置是单独授予的权限（iOS 14+ 的“精确”，Android 的“精确”与“模糊”）。

UI 中的选择器驱动我们请求的模式；实际授予的权限保留在操作系统设置中。

## 设置模型

每个节点设备：

- `location.enabledMode`: `off | whileUsing`
- `location.preciseEnabled`: bool

UI 行为：

- 选择 `whileUsing` 会请求前台权限。
- 如果操作系统拒绝请求的级别，则回退到已授予的最高级别并显示状态。

## 权限映射（node.permissions）

可选。macOS 节点通过权限映射报告 `location`；iOS/Android 可能省略它。

## 命令：`location.get`

通过 `node.invoke` 调用。

参数（建议）：

```json
{
  "timeoutMs": 10000,
  "maxAgeMs": 15000,
  "desiredAccuracy": "coarse|balanced|precise"
}
```

返回载荷：

```json
{
  "lat": 48.20849,
  "lon": 16.37208,
  "accuracyMeters": 12.5,
  "altitudeMeters": 182.0,
  "speedMps": 0.0,
  "headingDeg": 270.0,
  "timestamp": "2026-01-03T12:34:56.000Z",
  "isPrecise": true,
  "source": "gps|wifi|cell|unknown"
}
```

错误（稳定代码）：

- `LOCATION_DISABLED`: 选择器已关闭。
- `LOCATION_PERMISSION_REQUIRED`: 请求的模式缺少权限。
- `LOCATION_BACKGROUND_UNAVAILABLE`: 应用处于后台，但只允许使用期间。
- `LOCATION_TIMEOUT`: 在规定时间内未获取到定位。
- `LOCATION_UNAVAILABLE`: 系统故障 / 无可用提供者。

## 后台行为

- Android 应用在后台时拒绝 `location.get`。
- 在 Android 上请求位置时请保持 OpenClaw 处于打开状态。
- 其他节点平台可能不同。

## 模型/工具集成

- 工具面：`nodes` 工具添加 `location_get` 动作（需要节点）。
- CLI：`openclaw nodes location get --node <id>`。
- 代理指南：仅在用户已启用位置并理解其范围时调用。

## UX 文案（建议）

- 关闭：“位置共享已禁用。”
- 使用期间：“仅在 OpenClaw 打开时可用。”
- 精确：“使用精确 GPS 位置。关闭后将共享大致位置。”

## 相关

- [频道位置解析](/channels/location)
- [摄像头拍摄](/nodes/camera)
- [对话模式](/nodes/talk)
