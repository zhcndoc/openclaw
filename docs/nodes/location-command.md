---
summary: "节点位置命令、平台权限模式以及 Linux GeoClue 设置"
read_when:
  - "添加位置节点支持或权限 UI"
  - "设计 Android 位置权限或前台行为"
title: "位置命令"
---

## TL;DR

- `location.get` 是一个节点命令，可通过 `node.invoke` 或 `openclaw nodes location get` 调用。
- 默认关闭。
- Android 第三方构建使用一个选择器：关闭 / 使用期间 / 始终。Play 构建保持为关闭 / 使用期间。
- 精确位置是一个单独的开关。

## <a id="why-a-selector-(not-just-a-switch)"></a><a id="why-a-selector-not-just-a-switch"></a> 为什么要用选择器（而不只是一个开关）

OS 位置权限是多级的。精确位置也是单独的 OS 授予（iOS 14+“精确”，Android“精细”与“粗略”）。应用内选择器驱动请求的模式，但 OS 仍然决定实际授予。

## <a id="settings-model"></a> 设置模型

每个节点设备：

- `location.enabledMode`: `off | whileUsing | always`
- `location.preciseEnabled`：布尔值

UI 行为：

- 选择 `whileUsing` 会请求前台权限。
- 在 Android 第三方构建中选择 `always` 时，首先会请求前台权限，解释后台访问，然后打开 Android 应用设置以授予单独的 **始终允许** 权限。
- Android Play 构建不会声明后台位置权限，也不会显示 `always`。
- 如果 OS 拒绝请求的级别，则应用程序将恢复到最高授予的级别并显示状态。
- 在 Android 上，关闭精确位置会限制共享坐标，即使 OS 仍授予精确访问权限。缓存和新修复使用 2 公里网格，并具有缓慢变化的随机偏移量；近似响应忽略高度、速度和方位，并报告至少 2,000 米的不确定性。本来就不太准确的修复仍然存在更大的不确定性。
- Android 在构造响应之前重新检查精度，因此在请求等待时关闭切换也会限制该响应。这不会撤销 OS 权限或撤回已共享的位置。

## <a id="permissions-mapping-(node.permissions)"></a><a id="permissions-mapping-node-permissions"></a> 权限映射（node.permissions）

选修的。 macOS节点通过`node.list`/`node.describe`上的`permissions`地图上报`location`； iOS/Android 可以省略。

## <a id="command%3A-location.get"></a><a id="command-location-get"></a> 命令：`location.get`

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

## <a id="background-behavior"></a> 后台行为

- 仅当用户选择 `Always` 和 Android 授予后台位置时，Android 第三方构建才接受后台 `location.get`。现有的持久节点服务添加了 `location` 服务类型，并在活动时公开 `Location: Always`。
- Android Play 构建和 `While Using` 模式在后台时会拒绝 `location.get`。
- 其他 node 平台可能有所不同。

## <a id="linux-node-host"></a> Linux 节点主机

捆绑的 Linux Node 插件将 `location.get` 添加到 CLI `openclaw node` 服务，包括没有 Linux 桌面应用程序的无头主机。位置默认为关闭。在插件入口下启用它，然后重新启动节点服务：

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

## <a id="model%2Ftooling-integration"></a><a id="model/tooling-integration"></a> Model/tooling 集成

- Agent 工具：`nodes` 工具的 `location_get` 操作（需要节点）。
- `locationTimeoutMs` 控制位置修复预算。设置后，代理工具会为节点调用增加 30 秒，并为网关传输增加 30 秒。显式 `invokeTimeoutMs` 和 `timeoutMs` 覆盖保持独立，包括更短的限制。
- CLI: `openclaw nodes location get --node <id>`.
- Agent 指南：仅在用户启用了位置并理解作用范围时调用。

## <a id="ux-copy-(suggested)"></a><a id="ux-copy-suggested"></a> UX 文案（建议）

- 关闭："位置共享已禁用。"
- 使用期间："仅在 OpenClaw 打开时。"
- 始终："允许在 OpenClaw 处于后台时进行请求的位置检查。"
- 精确："使用精确的 GPS 位置。关闭后将共享大致位置。"

## <a id="related"></a> 相关内容

- [节点概览](/nodes)
- [频道位置解析](/channels/location)
- [相机捕获](/nodes/camera)
- [对话模式](/nodes/talk)
- [节点故障排查](/nodes/troubleshooting)
