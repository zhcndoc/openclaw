---
summary: "节点的位置命令（location.get）、权限模式及后台行为"
read_when:
  - 添加位置节点支持或权限界面
  - 设计后台定位 + 推送流程
title: "位置命令"
---

# 位置命令（节点）

## 摘要

- `location.get` 是一个节点命令（通过 `node.invoke` 调用）。
- 默认关闭。
- 设置使用选择器：关闭 / 使用时 / 始终。
- 独立切换：精确位置。

## 为什么使用选择器（而非开关）

操作系统权限是多层次的。我们可以在应用内暴露选择器，但实际授权由操作系统决定。

- iOS/macOS：用户可以在系统提示/设置中选择 **使用时** 或 **始终**。应用可请求升级，但操作系统可能需要用户手动设置。
- Android：后台位置是单独权限；Android 10以上通常需要设置流程。
- 精确位置是独立授权（iOS 14及以后“精确”，Android“精确”与“粗略”之分）。

界面中的选择器用于驱动我们请求的模式；实际授权存在于操作系统设置中。

## 设置模型

针对每个节点设备：

- `location.enabledMode`：`off | whileUsing | always`
- `location.preciseEnabled`：布尔值

界面行为：

- 选择 `whileUsing` 会请求前台权限。
- 选择 `always` 会先确保 `whileUsing` 授权，再请求后台权限（如需设置则引导用户）。
- 若操作系统拒绝请求级别，回退到最高已授权级别并展示状态。

## 权限映射（node.permissions）

可选。macOS 节点通过权限映射报告 `location`；iOS/Android 可能不包含。

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

- `LOCATION_DISABLED`：选择器为关闭。
- `LOCATION_PERMISSION_REQUIRED`：缺少请求模式的权限。
- `LOCATION_BACKGROUND_UNAVAILABLE`：应用在后台运行但仅允许使用时权限。
- `LOCATION_TIMEOUT`：超时无定位。
- `LOCATION_UNAVAILABLE`：系统故障 / 无可用定位提供者。

## 后台行为（未来规划）

目标：模型即使在节点后台时也能请求位置，但需满足：

- 用户选择了 **始终**。
- 操作系统授予后台位置权限。
- 应用被允许后台定位（iOS后台模式 / Android 前台服务或特殊许可）。

基于推送触发的流程（未来）：

1. 网关向节点推送消息（静默推送或FCM数据）。
2. 节点短暂唤醒并请求设备位置。
3. 节点转发定位数据至网关。

注意：

- iOS：需要始终权限 + 后台位置模式。静默推送可能被限流，间歇性失败正常。
- Android：后台定位可能要求前台服务；否则可能被拒绝。

## 模型/工具集成

- 工具接口：`nodes` 工具新增 `location_get` 操作（需指定节点）。
- 命令行：`openclaw nodes location get --node <id>`。
- Agent 规范：仅在用户启用位置且理解范围时调用。

## 用户体验文案（建议）

- 关闭：“位置共享已关闭。”
- 使用时：“仅在 OpenClaw 打开时。”
- 始终：“允许后台定位。需要系统权限。”
- 精确：“使用精确GPS位置。关闭后共享大致位置。”
