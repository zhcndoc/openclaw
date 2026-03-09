---
summary: "节点的位置命令（location.get）、权限模式及 Android 前台行为"
read_when:
  - 添加位置节点支持或权限 UI 时
  - 设计 Android 位置权限或前台行为时
title: "位置命令"
---

# 位置命令（节点）

## 简要说明

- `location.get` 是一个节点命令（通过 `node.invoke` 调用）。
- 默认关闭。
- Android 应用设置使用选择器：关闭 / 使用时。
- 单独开关：精确位置。

## 为什么用选择器（而不仅是开关）

操作系统权限是多级的。我们可以在应用内暴露选择器，但实际授权由操作系统决定。

- iOS/macOS 可能在系统提示/设置中暴露“使用期间”或“始终”。
- Android 应用当前只支持前台位置权限。
- 精确位置是单独授权项（iOS 14+ 的“精确”，Android 的“精确版”与“粗略版”）。

UI 中的选择器驱动我们请求的模式；实际授权存于系统设置。

## 设置模型

每个节点设备：

- `location.enabledMode`：`off | whileUsing`
- `location.preciseEnabled`：布尔值

UI 行为：

- 选中 `whileUsing` 会请求前台权限。
- 若操作系统拒绝请求级别，则回退到最高已授权级别并显示状态。

## 权限映射（node.permissions）

可选。macOS 节点通过权限映射报告 `location`；iOS/Android 可能省略。

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

- `LOCATION_DISABLED`：选择器关闭。
- `LOCATION_PERMISSION_REQUIRED`：缺少请求模式的权限。
- `LOCATION_BACKGROUND_UNAVAILABLE`：应用处于后台但只允许“使用期间”。
- `LOCATION_TIMEOUT`：超时无定位。
- `LOCATION_UNAVAILABLE`：系统故障/无提供者。

## 后台行为

- Android 应用后台时拒绝 `location.get` 调用。
- Android 请求位置时保持 OpenClaw 处于打开状态。
- 其他节点平台可能不同。

## 模型/工具集成

- 工具界面：`nodes` 工具添加 `location_get` 动作（需指定节点）。
- CLI：`openclaw nodes location get --node <id>`。
- 代理指南：仅当用户启用位置且理解权限范围时调用。

## 用户体验文案（建议）

- 关闭： “位置共享已禁用。”
- 使用时： “仅在 OpenClaw 开启时。”
- 精确： “使用精确 GPS 位置。关闭以共享大致位置。”
