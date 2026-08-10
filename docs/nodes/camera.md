---
summary: "配对节点上的摄像头捕获和 macOS 物理 PTZ 控制"
read_when:
  - 在节点平台上添加或修改摄像头捕获功能
  - 在 macOS 上控制 USB 摄像头的物理平移、倾斜或变焦
  - 扩展代理可访问的 MEDIA 临时文件工作流
title: "摄像头捕获"
---

OpenClaw 支持在配对的 **iOS**、**Android**、**macOS** 和 **Linux** 节点上为代理工作流进行摄像头捕获：通过 Gateway `node.invoke` 捕获照片（`jpg`）或短视频片段（`mp4`，可选音频）。

macOS 应用还可以对受支持的 USB UVC 摄像头进行物理平移、倾斜和变焦。PTZ 会移动摄像头硬件；它不会旋转、裁剪或以其他方式变换捕获的图像。

所有摄像头访问都受每个平台上由用户控制的设置限制。

## iOS 节点

### iOS 用户设置

- iOS 设置选项卡 → **相机** → **允许相机** (`camera.enabled`)。
  - 默认值：**开启**（缺失的键会被视为已启用）。
  - 当关闭时：`camera.*` 命令返回 `CAMERA_DISABLED`。

### iOS 命令（通过 Gateway `node.invoke`）

- `camera.list`
  - 响应载荷：`devices` — `{ id, name, position, deviceType }` 数组。

- `camera.snap`
  - 参数：
    - `facing`: `front|back`（默认：`front`）
    - `maxWidth`: number（可选；默认 `1600`）
    - `quality`: `0..1`（可选；默认 `0.9`，会被限制在 `[0.05, 1.0]`）
    - `format`: 当前为 `jpg`
    - `delayMs`: number（可选；默认 `0`，内部上限为 `10000`）
    - `deviceId`: string（可选；来自 `camera.list`）
  - 响应载荷：`format: "jpg"`、`base64`、`width`、`height`。
  - 载荷保护：照片会重新压缩，以保持 base64 编码后的载荷小于 5MB。

- `camera.clip`
  - 参数：
    - `facing`: `front|back`（默认：`front`）
    - `durationMs`: number（默认 `3000`，会被限制在 `[250, 60000]`）
    - `includeAudio`: boolean（默认 `true`）
    - `format`: 当前为 `mp4`
    - `deviceId`: string（可选；来自 `camera.list`）
  - 响应载荷：`format: "mp4"`、`base64`、`durationMs`、`hasAudio`。

### iOS 前台要求

与 `canvas.*` 一样，iOS 节点只允许在**前台**执行 `camera.*` 命令。后台调用会返回 `NODE_BACKGROUND_UNAVAILABLE`。

### CLI 助手

获取媒体文件的最简单方式是使用 CLI 助手，它会将解码后的媒体写入临时文件并打印保存路径。

```bash
openclaw nodes camera snap --node <id>                 # 默认：一张由节点选择的照片
openclaw nodes camera snap --node <id> --facing front
openclaw nodes camera snap --node <id> --facing both   # 先前置后后置（保存 2 个路径）
openclaw nodes camera clip --node <id> --duration 3000
openclaw nodes camera clip --node <id> --no-audio
```

不使用 `--facing` 时，`nodes camera snap` 会使用节点的默认相机拍摄一张照片，并将保存的制品标记为 `unknown`。在非 Linux 节点上，`--facing both` 会先拍摄前置摄像头，再拍摄后置摄像头，并打印两个保存路径。`--device-id` 可以在不使用 `--facing` 的情况下使用；在非 Linux 节点上，它不能与 `--facing both` 组合使用。Linux 始终发送一个不带方向的请求，并将制品标记为 `unknown`，无论是否指定了 `--facing`。除非你构建自己的封装程序，否则输出文件都是临时文件（位于操作系统的临时目录中）。

## Android 节点

### Android 用户设置

- Android 设置页 → **相机** → **允许相机** (`camera.enabled`)。
  - **新安装默认关闭。** 早于此设置的现有安装会迁移为 **开启**，以便升级后不会悄悄丢失此前可用的相机访问权限。
  - 关闭时：`camera.*` 命令返回 `CAMERA_DISABLED: enable Camera in Settings`。

### 权限

- `CAMERA` 适用于 `camera.snap` 和 `camera.clip`；缺少/拒绝权限会返回 `CAMERA_PERMISSION_REQUIRED`。
- 当 `includeAudio` 为 `true` 时，`RECORD_AUDIO` 适用于 `camera.clip`；缺少/拒绝权限会返回 `MIC_PERMISSION_REQUIRED`。

应用会在可能的情况下提示申请运行时权限。

### Android 前台要求

与 `canvas.*` 一样，Android 节点仅允许在**前台**调用 `camera.*` 命令。后台调用会返回 `NODE_BACKGROUND_UNAVAILABLE: command requires foreground`。

### Android 命令（通过 Gateway `node.invoke`）

- `camera.list`
  - 响应负载：`devices` — 包含 `{ id, name, position, deviceType }` 的数组。

- `camera.snap`
  - 参数：`facing`（`front|back`，默认 `front`）、`quality`（默认 `0.95`，限制在 `[0.1, 1.0]`）、`maxWidth`（默认 `1600`）、`deviceId`（可选；未知 id 会失败并返回 `INVALID_REQUEST`）。
  - 响应负载：`format: "jpg"`、`base64`、`width`、`height`。
  - 负载保护：会重新压缩，以确保 base64 低于 5MB（与 iOS 相同的预算）。

- `camera.clip`
  - 参数：`facing`（默认 `front`）、`durationMs`（默认 `3000`，限制在 `[200, 60000]`）、`includeAudio`（默认 `true`）、`deviceId`（可选）。
  - 响应负载：`format: "mp4"`、`base64`、`durationMs`、`hasAudio`。
  - 负载保护：原始 MP4 在 base64 编码前上限为 18MB；过大的片段会失败并返回 `PAYLOAD_TOO_LARGE`（减小 `durationMs` 后重试）。

## macOS 应用

### macOS 用户设置

macOS 配套应用提供一个复选框：

- **Settings → General → Allow Camera** (`openclaw.cameraEnabled`).
  - 默认：**关闭**。
  - 关闭时：摄像头请求会返回 `CAMERA_DISABLED: 在 Settings 中启用 Camera`。

### CLI 辅助工具（node invoke）

使用主 `openclaw` CLI 在 macOS 节点上调用摄像头命令。

```bash
openclaw nodes camera list --node <id>                     # 列出摄像头 ID
openclaw nodes camera snap --node <id>                     # 打印已保存路径
openclaw nodes camera snap --node <id> --max-width 1280
openclaw nodes camera snap --node <id> --delay-ms 2000
openclaw nodes camera snap --node <id> --device-id <id>
openclaw nodes camera clip --node <id> --duration 10s       # 打印已保存路径
openclaw nodes camera clip --node <id> --duration-ms 3000   # 打印已保存路径（旧版标志）
openclaw nodes camera clip --node <id> --device-id <id>
openclaw nodes camera clip --node <id> --no-audio
```

- `openclaw nodes camera snap` 默认使用 `maxWidth=1600`，除非被覆盖。
- `camera.snap` 会在预热/曝光稳定后等待 `delayMs`（默认 2000ms，范围限制在 `[0, 10000]`）再进行拍摄。
- 照片负载会重新压缩，以使 base64 保持在 5MB 以下。

### macOS 物理 PTZ

物理 PTZ 由 Mac 应用为配备标准 UVC 绝对平移/倾斜或变焦控制的 USB 摄像头实现。它与拍摄功能使用相同的 **Allow Camera** 设置。其他节点平台不会声明这些命令。

始终传入由 `camera.list` 返回的明确 `deviceId`。OpenClaw 永远不会为物理移动选择默认摄像头。

- `camera.ptz.status` 是一个安全的读取命令。请求：`{ "deviceId": "<camera-id>" }`。
  - 响应中的 `axes` 仅包含可执行的 `pan`、`tilt` 和 `zoom` 轴。
  - 平移和倾斜值的单位是度。变焦值的单位是百分比。
  - 每个轴都会报告 `current`、`min`、`max`、`step`、`unit`、`canSet` 和 `canMove`。只有当摄像头成功报告设备默认值时才会出现 `default`。
  - 仅当每个已公开的可执行轴都有设备实际声明的默认值时，`canHome` 才为 true，此时才能尝试完整的归位方案。
- `camera.ptz.control` 会更改摄像头硬件。其限定操作包括：
  - `{ "deviceId": "<camera-id>", "operation": "set", "target": { "panDegrees": 10, "tiltDegrees": -5, "zoomPercent": 40 } }`
  - `{ "deviceId": "<camera-id>", "operation": "move", "delta": { "panDegrees": 2, "zoomPercent": -5 } }`
  - `{ "deviceId": "<camera-id>", "operation": "home" }`

`set` 和 `move` 至少需要一个有限的轴值。省略的轴保持不变，变焦的移动增量以百分点为单位。`home` 会恢复设备声明的默认值；当 `canHome` 为 false 时，它会返回 `CAMERA_PTZ_UNSUPPORTED`，且不会移动摄像头。Mac 应用会将请求的值限制并吸附到摄像头的范围和分辨率；响应会返回操作后的 `state`，并在 `adjusted` 中列出发生变化的请求字段。请求不受支持的轴会返回 `CAMERA_PTZ_AXIS_UNSUPPORTED`。

平移/倾斜和变焦使用独立的硬件写入，因此无法实现原子操作。如果较早的控制组成功，但后续写入或最终状态读取失败，`CAMERA_PTZ_PARTIAL` 会列出已应用的组，在可读取时包含尽力获取的结果状态，并告知调用方在重试前运行 `camera.ptz.status`。

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

## Linux 节点主机

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

Linux 会从 `camera.list` 返回可捕获、可读取的 V4L2 设备路径；FFmpeg 会探测每个 `/dev/video*` 候选项，并忽略元数据节点或仅输出节点。设备 `position` 为 `unknown`，因此在没有 `deviceId` 的情况下，请求面向摄像头时，会生成一张 `unknown` 位置的照片或一段视频，而不会声称是前置或后置摄像头。当主机有多个摄像头时，请使用 `deviceId`。`camera.snap` 使用 FFmpeg 输入预热来处理 `delayMs`，并在限制宽度的同时保持宽高比。`camera.clip` 将麦克风音频记录为 MP4 音轨；OpenClaw 有意不提供独立的麦克风命令。

该插件使用 `libx264` 处理 MP4 视频，不会悄悄更改编解码器。若 FFmpeg 构建缺少所需输入或编码器，将返回 `CAMERA_UNAVAILABLE`。超过 25MB base64 载荷预算的照片和片段会失败，并返回 `PAYLOAD_TOO_LARGE`。

`camera.snap` 和 `camera.clip` 仍然是危险命令。只有在确实要启用采集功能时，才应将它们添加到 `gateway.nodes.commands.allow`；仅启用插件并不会绕过 Gateway 策略。

## 安全性 + 实际限制

- 摄像头和麦克风访问会触发常见的操作系统权限提示（并且需要在 `Info.plist` 中提供使用说明字符串）。
- 为避免节点负载过大，视频片段最长限制为 60 秒（base64 开销加上消息大小限制）。

## macOS 屏幕视频（系统级）

对于 _屏幕_ 视频（不是摄像头），请使用 macOS 配套应用：

```bash
openclaw nodes screen record --node <id> --duration 10s --fps 15   # 打印保存路径
```

需要 macOS **屏幕录制** 权限（TCC）。

## 相关内容

- [图像和媒体支持](/nodes/images)
- [媒体理解](/nodes/media-understanding)
- [位置命令](/nodes/location-command)
