---
summary: "配对节点上的摄像头捕获和 macOS 物理 PTZ 控制"
read_when:
  - "在节点平台上添加或修改摄像头捕获功能"
  - "在 macOS 上控制 USB 摄像头的物理平移、倾斜或变焦"
  - "扩展代理可访问的 MEDIA 临时文件工作流"
title: "摄像头捕获"
---

OpenClaw 支持配对 **iOS**、**Android** 上座席工作流程的摄像头捕获， **macOS** 和 **Linux** 节点：通过网关捕获照片 （`jpg`） 或短视频剪辑（`mp4`，带可选音频） `node.invoke`。

当捕获请求包含 `deviceId` 时，所选摄像机必须与 ID 完全匹配。未知的 ID 失败，而不是从不同的相机捕获；运行 `camera.list` 刷新设备 ID，设备 ID 会在相机重新连接时发生变化。

macOS 应用还可以对受支持的 USB UVC 摄像头进行物理平移、倾斜和变焦。PTZ 会移动摄像头硬件；它不会旋转、裁剪或以其他方式变换捕获的图像。

所有摄像头访问都受每个平台上由用户控制的设置限制。

## <a id="ios-node"></a> iOS 节点

### <a id="ios-user-setting"></a> iOS 用户设置

- iOS 设置选项卡 → **相机** → **允许相机** (`camera.enabled`)。
  - 默认值：**开启**（缺失的键会被视为已启用）。
  - 当关闭时：`camera.*` 命令返回 `CAMERA_DISABLED`。

### <a id="ios-commands-(via-gateway-node.invoke)"></a><a id="ios-commands-via-gateway-node-invoke"></a> iOS 命令（通过 Gateway `node.invoke`）

- `camera.list`
  - 响应负载：`devices` — `{ id, name, position, deviceType }` 数组。

- `camera.snap`
  - 参数：
    - `facing`: `front|back`（默认：`front`）
    - `maxWidth`: number（可选；默认 `1600`）
    - `quality`: `0..1`（可选；默认 `0.9`，会被限制在 `[0.05, 1.0]`）
    - `format`：`jpg`（唯一支持的值）
    - `delayMs`: number（可选；默认 `0`，内部上限为 `10000`）
    - `deviceId`: string（可选；来自 `camera.list`）
  - 响应负载：`format: "jpg"`、`base64`、`width`、`height`。
  - 载荷保护：照片会重新压缩，以保持 base64 编码后的载荷小于 5MB。

- `camera.clip`
  - 参数：
    - `facing`: `front|back`（默认：`front`）
    - `durationMs`: number（默认 `3000`，会被限制在 `[250, 60000]`）
    - `includeAudio`: boolean（默认 `true`）
    - `format`：`mp4`（唯一支持的值）
    - `deviceId`: string（可选；来自 `camera.list`）
  - 响应负载：`format: "mp4"`、`base64`、`durationMs`、`hasAudio`。

### <a id="ios-foreground-requirement"></a> iOS 前台要求

iOS 节点仅允许 **foreground** 中的 `camera.*` 命令。后台调用返回 `NODE_BACKGROUND_UNAVAILABLE`。

### <a id="cli-helper"></a> CLI 助手

获取媒体文件的最简单方式是使用 CLI 助手，它会将解码后的媒体写入临时文件并打印保存路径。

```bash
openclaw nodes camera snap --node <id>                 # default: one node-selected photo
openclaw nodes camera snap --node <id> --facing front
openclaw nodes camera snap --node <id> --facing both   # front then back (2 saved paths)
openclaw nodes camera clip --node <id> --duration 10s
openclaw nodes camera clip --node <id> --no-audio
```

`--duration` 接受毫秒数 （`3000`） 或单位后缀 （`10s`、`1m`、`1h30m`）。默认为 `3000`（3 秒）。

如果没有 `--facing`，`nodes camera snap` 将使用节点的默认相机捕获一张照片，并将保存的工件标记为 `unknown`。在非 Linux 节点上，`--facing both` 捕获前后并打印两个保存的路径。 `--device-id` 没有 `--facing` 时有效；在非Linux节点上，不能与`--facing both`组合。无论 `--facing` 为何，Linux 始终发送一个无面请求并将工件标记为 `unknown`。输出文件是临时的（在 OS 临时目录中），除非您构建自己的包装器。

## <a id="android-node"></a> Android 节点

### <a id="android-user-setting"></a> Android 用户设置

- Android 设置页 → **相机** → **允许相机** (`camera.enabled`)。
  - **新安装默认关闭。** 早于此设置的现有安装会迁移为 **开启**，以便升级后不会悄悄丢失此前可用的相机访问权限。
  - 关闭时：`camera.*` 命令返回 `CAMERA_DISABLED: enable Camera in Settings`。

### <a id="permissions"></a> 权限

- `camera.snap` 和 `camera.clip` 都需要 `CAMERA`； missing/denied 权限返回 `CAMERA_PERMISSION_REQUIRED`。
- 当`includeAudio`为`true`时，`camera.clip`需要`RECORD_AUDIO`； missing/denied 权限返回 `MIC_PERMISSION_REQUIRED`。

应用会在可能的情况下提示申请运行时权限。

### <a id="android-foreground-requirement"></a> Android 前台要求

Android 节点仅允许 **foreground** 中的 `camera.*` 命令。后台调用返回 `NODE_BACKGROUND_UNAVAILABLE: command requires foreground`。

### <a id="android-commands-(via-gateway-node.invoke)"></a><a id="android-commands-via-gateway-node-invoke"></a> Android 命令（通过 Gateway `node.invoke`）

- `camera.list`
  - 响应负载：`devices` — `{ id, name, position, deviceType }` 数组。

- `camera.snap`
  - 参数：`facing`（`front|back`，默认 `front`）、`quality`（默认 `0.95`，限制在 `[0.1, 1.0]`）、`maxWidth`（默认 `1600`）、`deviceId`（可选；未知 id 会失败并返回 `INVALID_REQUEST`）。
  - 响应负载：`format: "jpg"`、`base64`、`width`、`height`。
  - 负载保护：会重新压缩，以确保 base64 低于 5MB（与 iOS 相同的预算）。

- `camera.clip`
  - 参数：`facing`（默认 `front`）、`durationMs`（默认 `3000`，限制在 `[200, 60000]`）、`includeAudio`（默认 `true`）、`deviceId`（可选）。
  - 响应负载：`format: "mp4"`、`base64`、`durationMs`、`hasAudio`。
  - 负载保护：原始 MP4 在 base64 编码前上限为 18MB；过大的片段会失败并返回 `PAYLOAD_TOO_LARGE`（减小 `durationMs` 后重试）。

## <a id="macos-app"></a> macOS 应用

### <a id="macos-user-setting"></a> macOS 用户设置

macOS 配套应用提供一个复选框：

- **设置→常规→允许相机** （`openclaw.cameraEnabled`）。
  - 默认：**关闭**。
  - 关闭时：相机请求返回`CAMERA_DISABLED: enable Camera in Settings`。

### <a id="cli-helper-(node-invoke)"></a><a id="cli-helper-node-invoke"></a> CLI 辅助工具（node invoke）

使用主 `openclaw` CLI 在 macOS 节点上调用摄像头命令。

```bash
openclaw nodes camera list --node <id>                     # list camera ids
openclaw nodes camera snap --node <id>                     # prints saved path
openclaw nodes camera snap --node <id> --max-width 1280
openclaw nodes camera snap --node <id> --delay-ms 2000
openclaw nodes camera snap --node <id> --device-id <id>
openclaw nodes camera clip --node <id> --duration 10s       # prints saved path
openclaw nodes camera clip --node <id> --device-id <id>
openclaw nodes camera clip --node <id> --no-audio
```

- `openclaw nodes camera snap` 默认使用 `maxWidth=1600`，除非被覆盖。
- 在热 up/exposure 稳定后，`camera.snap` 在捕获之前等待 `delayMs`（默认 2000ms，钳位到 `[0, 10000]`）。
- 照片负载会重新压缩，以使 base64 保持在 5MB 以下。

如果 macOS 外部摄像头以纵向方式启动照片会话，则 OpenClaw 会选择一种广告的横向格式，该格式具有转置尺寸和相同的编码（如果存在）。横向、内置和连续性相机格式均保持不变。如果没有精确的对应项，或者如果无法重新配置相机，则捕获会保留协商的格式。 `--max-width`仍然只限制返回的JPEG宽度；它不选择相机格式。

### <a id="macos-physical-ptz"></a> macOS 物理 PTZ

物理 PTZ 由 Mac 应用程序针对 USB 相机实现，该相机公开标准 UVC 绝对 pan/tilt 或变焦控件。它使用与捕获相同的 **Allow Camera** 设置。其他节点平台不会公布这些命令。

始终传递由 `camera.list` 返回的显式 `deviceId`。 OpenClaw 从不选择用于物理运动的默认摄像机。

- `camera.ptz.status` 无需移动相机即可读取当前位置。请求：`{ "deviceId": "<camera-id>" }`。
  - 响应仅包含`axes`下的可执行`pan`、`tilt`和`zoom`轴。
  - 平移和倾斜值的单位是度。变焦值的单位是百分比。
  - 每个轴都会报告 `current`、`min`、`max`、`step`、`unit`、`canSet` 和 `canMove`。只有当摄像头成功报告设备默认值时才会出现 `default`。
  - 仅当每个已公开的可执行轴都有设备实际声明的默认值时，`canHome` 才为 true，此时才能尝试完整的归位方案。
- `camera.ptz.control` 会更改摄像头硬件。其限定操作包括：
  - `{ "deviceId": "<camera-id>", "operation": "set", "target": { "panDegrees": 10, "tiltDegrees": -5, "zoomPercent": 40 } }`
  - `{ "deviceId": "<camera-id>", "operation": "move", "delta": { "panDegrees": 2, "zoomPercent": -5 } }`
  - `{ "deviceId": "<camera-id>", "operation": "home" }`

`set` 和 `move` 需要至少一个有限轴值。省略的轴保持不变，缩放的移动增量为百分点。 `home` 恢复设备通告的默认值；当 `canHome` 为 false 时，它​​会返回 `CAMERA_PTZ_UNSUPPORTED` 而不移动相机。 Mac 应用程序将请求的值固定并捕捉到相机的范围和分辨率；响应返回操作后的`state`，并列出`adjusted`中更改的请求字段。请求不受支持的轴将返回 `CAMERA_PTZ_AXIS_UNSUPPORTED`。

两个 PTZ 命令都会短暂打开实时摄像机流，因为支持的摄像机在流式传输时仅服务于 UVC 控制。这会在一段时间内激活摄像头及其隐私指示器，包括 `camera.ptz.status` 仅读取位置时。不会保留帧，也不会生成照片、视频或文件。

Pan/tilt和zoom使用单独的硬件写入并且不能是原子的。 OpenClaw 通过新的控制连接验证结果位置。如果稍后的写入或最终状态读取失败，或者轴未在相机报告的分辨率内到达其请求的位置，`CAMERA_PTZ_PARTIAL` 会命名已确认的控制组，包括可读时的独立观察状态，并告诉调用者在重试之前运行 `camera.ptz.status`。位置失败还报告请求的值和观察到的值；检查视频流是否到达摄像机并禁用可以覆盖 UVC 控件的摄像机 AI 取景或跟踪。

`camera.ptz.control` 具有危险性，在操作员明确将其添加到 `gateway.nodes.commands.allow` 之前仍处于禁用状态：

```json5
{
  gateway: {
    nodes: {
      commands: { allow: ["camera.ptz.control"] },
    },
  },
}
```

仅添加 allow 条目不会扩大现有的节点审批范围。更新后的 Mac 重新连接并声明 PTZ 控制后，运行 `openclaw nodes pending`，然后使用 `openclaw nodes approve <requestId>` 批准扩展后的权限范围。

在代理的 `nodes` 工具中，使用 `action: "camera_ptz"`、选定的 Mac 节点、`deviceId` 以及 `ptzOperation: "status" | "set" | "move" | "home"`。轴输入为 `panDegrees`、`tiltDegrees` 和 `zoomPercent`。

## <a id="linux-node-host"></a> Linux 节点主机

捆绑的 Linux Node 插件为 CLI `openclaw node` 服务添加了摄像头采集功能。它可在无头主机上运行，不需要 Linux 桌面应用程序。

摄像头访问默认关闭。在插件条目下启用它，然后重新启动节点服务，以便重新构建其 Gateway 广播：

```json5
{
  plugins: {
    entries: {
      "linux-node": {
        config: {
          camera: { enabled: true },
        },
      },
    },
  },
}
```

要求：

- 具备 V4L2 输入、`libx264` 和 AAC 支持的 FFmpeg
- `/dev/video*` 设备可被 node-service 用户读取；在常见发行版上，将该用户加入 `video` 组
- 对于默认 `includeAudio: true` 的片段，需要可用的 PulseAudio 服务器，或带有默认源的 PipeWire PulseAudio 兼容层

Linux 从 `camera.list` 返回具有捕获能力、可读的 V4L2 设备路径； FFmpeg 检查每个 `/dev/video*` 候选者并忽略元数据或仅输出节点。设备 `position` 是 `unknown`，因此面对没有 `deviceId` 的请求，请生成一张 `unknown`- 位置照片或剪辑，而不是声明前置或后置摄像头。当主机有多个摄像头时，使用`deviceId`。 `camera.snap` 对 `delayMs` 使用 FFmpeg 输入预热，并在限制宽度的同时保留宽高比。 `camera.clip` 将麦克风音频录制为 MP4 音轨； OpenClaw 故意不公开独立麦克风命令。

该插件使用 `libx264` 处理 MP4 视频，不会悄悄更改编解码器。若 FFmpeg 构建缺少所需输入或编码器，将返回 `CAMERA_UNAVAILABLE`。超过 25MB base64 载荷预算的照片和片段会失败，并返回 `PAYLOAD_TOO_LARGE`。

`camera.snap` 和 `camera.clip` 仍然是危险命令。只有在确实要启用采集功能时，才应将它们添加到 `gateway.nodes.commands.allow`；仅启用插件并不会绕过 Gateway 策略。

## <a id="safety-%2B-practical-limits"></a><a id="safety-+-practical-limits"></a> 安全性 + 实际限制

- 相机和麦克风访问会触发通常的 OS 权限提示（并且需要 `Info.plist` 中的使用字符串）。
- 视频剪辑的上限为 60 秒，以避免节点负载过大（base64 开销加上消息限制）。

## <a id="macos-screen-video-(os-level)"></a><a id="macos-screen-video-os-level"></a> macOS屏幕视频（OS-级别）

对于 _屏幕_ 视频（不是摄像头），请使用 macOS 配套应用：

```bash
openclaw nodes screen record --node <id> --duration 10s --fps 15   # prints saved path
```

需要 macOS **屏幕录制** 权限（TCC）。

## <a id="related"></a> 相关内容

- [图像和媒体支持](/nodes/images)
- [媒体理解](/nodes/media-understanding)
- [位置命令](/nodes/location-command)
- [计算机使用](/nodes/computer-use)
- [节点故障排查](/nodes/troubleshooting)
- [节点概览](/nodes)
