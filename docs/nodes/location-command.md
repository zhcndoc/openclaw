---
summary: "节点的位置命令（location.get）、权限模式以及 Android 前台行为"
read_when:
  - 添加位置节点支持或权限 UI
  - 设计 Android 位置权限或前台行为
title: "位置命令"
---

## TL;DR

- `location.get` 是一个节点命令，可通过 `node.invoke` 或 `openclaw nodes location get` 调用。
- 默认关闭。
- Android 应用设置使用一个选择项：关闭 / 使用期间。
- 精确位置是一个单独的开关。

## 为什么要用选择器（而不只是一个开关）

操作系统的位置权限是多级的（iOS/macOS 提供“使用期间”和“始终允许”；Android 目前仅支持前台定位）。精确位置也是单独的操作系统授权（iOS 14+ 的“精确”，Android 的“精细”与“粗略”）。应用内的选择器决定请求的模式，但最终实际授予的权限仍由操作系统决定。

## 设置模型

每个节点设备：

- `location.enabledMode`: `off | whileUsing`
- `location.preciseEnabled`: bool

UI 行为：

- 选择 `whileUsing` 会请求前台权限。
- 如果操作系统拒绝所请求的级别，应用会恢复到已授予的最高级别并显示状态。

## 权限映射（node.permissions）

可选。macOS 节点会通过 `node.list`/`node.describe` 上的 `permissions` 映射报告 `location`；iOS/Android 可能会省略它。

## 命令：`location.get`

通过 `node.invoke` 调用，或使用 CLI 辅助命令：

```bash
openclaw nodes location get --node <idOrNameOrIp>
openclaw nodes location get --node <idOrNameOrIp> --accuracy precise --max-age 15000 --location-timeout 10000
```

参数：

```json
{
  "timeoutMs": 10000,
  "maxAgeMs": 15000,
  "desiredAccuracy": "coarse|balanced|precise"
}
```

CLI 标志直接映射：`--location-timeout` -> `timeoutMs`，`--max-age` -> `maxAgeMs`，`--accuracy` -> `desiredAccuracy`。

响应负载：

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
- `LOCATION_BACKGROUND_UNAVAILABLE`: 应用处于后台，但仅授予了“使用期间”权限。
- `LOCATION_TIMEOUT`: 未能在规定时间内获取定位。
- `LOCATION_UNAVAILABLE`: 系统故障或没有可用提供者。

## 后台行为

- Android 应用在后台时会拒绝 `location.get`；在 Android 上请求定位时请保持 OpenClaw 处于打开状态。
- 其他节点平台可能有所不同。

## 模型/工具集成

- Agent 工具：`nodes` 工具的 `location_get` 操作（需要节点）。
- CLI：`openclaw nodes location get --node <id>`。
- Agent 指南：仅在用户启用了位置并理解作用范围时调用。

## UX 文案（建议）

- 关闭：“位置共享已禁用。”
- 使用期间：“仅在 OpenClaw 打开时可用。”
- 精确：“使用精确 GPS 位置。关闭后将共享大致位置。”

## 相关

- [节点概览](/nodes)
- [频道位置解析](/channels/location)
- [摄像头捕获](/nodes/camera)
- [对讲模式](/nodes/talk)
