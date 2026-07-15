---
summary: "节点位置命令、平台权限模式以及 Linux GeoClue 设置"
read_when:
  - 添加位置节点支持或权限 UI
  - 设计 Android 位置权限或前台行为
title: "位置命令"
---

## TL;DR

- `location.get` 是一个节点命令，可通过 `node.invoke` 或 `openclaw nodes location get` 调用。
- 默认关闭。
- Android 第三方构建使用一个选择器：关闭 / 使用期间 / 始终。Play 构建保持为关闭 / 使用期间。
- 精确位置是一个单独的开关。

## 为什么要用选择器（而不只是一个开关）

OS 位置权限是多级的。精确位置也是一个单独的操作系统授权（iOS 14+ 的“精确”，Android 的“fine”和“coarse”）。应用内选择器会驱动所请求的模式，但操作系统仍然决定实际授予的权限。

## 设置模型

每个节点设备：

- `location.enabledMode`: `off | whileUsing | always`
- `location.preciseEnabled`: bool

UI 行为：

- 选择 `whileUsing` 会请求前台权限。
- 在 Android 第三方构建中选择 `always` 时，首先会请求前台权限，解释后台访问，然后打开 Android 应用设置以授予单独的 **始终允许** 权限。
- Android Play 构建不会声明后台位置权限，也不会显示 `always`。
- 如果操作系统拒绝所请求的级别，应用会回退到已授予的最高级别并显示状态。

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

- `LOCATION_DISABLED`: 定位功能已关闭。
- `LOCATION_PERMISSION_REQUIRED`: 请求的模式缺少权限。
- `LOCATION_BACKGROUND_UNAVAILABLE`: 应用处于后台，但仅授予了“使用期间”权限。
- `LOCATION_TIMEOUT`: 未能在规定时间内获取定位。
- `LOCATION_UNAVAILABLE`: 系统故障或没有可用提供者。

## 后台行为

- Android 第三方构建仅在用户选择了 `Always` 且 Android 已授予后台定位权限时，才接受后台 `location.get`。现有的持久节点服务会添加 `location` 服务类型，并在激活时显示 `Location: Always`。
- Android Play 构建和 `While Using` 模式在后台时会拒绝 `location.get`。
- 其他 node 平台可能有所不同。

## Linux 节点主机

捆绑的 Linux Node 插件会向 CLI `openclaw node` 服务添加 `location.get`，包括没有 Linux 桌面应用的无头主机。位置默认关闭。请在插件条目下启用它，然后重启节点服务：

```json5
{
  plugins: {
    entries: {
      "linux-node": {
        config: {
          location: { enabled: true },
        },
      },
    },
  },
}
```

安装 GeoClue2 及其 `where-am-i` 演示程序（Debian 和 Ubuntu 上为 `geoclue-2-demo`）。节点服务用户必须被主机的 GeoClue 策略和授权代理允许。

该插件使用 `where-am-i`，而不是一系列 `busctl` 调用。GeoClue 将客户端创建、属性设置、启动、更新和停止绑定到同一个 D-Bus 客户端连接；该演示程序会将整个生命周期保持在一起，而单独的 `busctl` 子进程则不会。不会新增 npm 依赖。

Linux 将 `coarse`、`balanced` 和 `precise` 映射到 GeoClue 精度级别 `4`、`6` 和 `8`。它会根据返回的时间戳验证 `maxAgeMs`。GeoClue 的演示程序不公开所选提供方，因此 `source` 为 `unknown`；只有在报告的精度为 100 米或更好时，`isPrecise` 才为 true。

Linux 使用相同的稳定错误：`LOCATION_DISABLED`、`LOCATION_TIMEOUT` 和 `LOCATION_UNAVAILABLE`。

## 模型/工具集成

- Agent 工具：`nodes` 工具的 `location_get` 操作（需要节点）。
- CLI：`openclaw nodes location get --node <id>`。
- Agent 指南：仅在用户启用了位置并理解作用范围时调用。

## UX 文案（建议）

- 关闭："位置共享已禁用。"
- 使用期间："仅在 OpenClaw 打开时。"
- 始终："允许在 OpenClaw 处于后台时进行请求的位置检查。"
- 精确："使用精确的 GPS 位置。关闭后将共享大致位置。"

## 相关

- [节点概览](/nodes)
- [频道位置解析](/channels/location)
- [摄像头捕获](/nodes/camera)
- [对讲模式](/nodes/talk)
